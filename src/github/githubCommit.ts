const OWNER = 'Doberjohn';
const REPO = 'inkweave';
const API = 'https://api.github.com';
// GitHub marks API responses cacheable for 60 s, and fetch() honours that. Every
// request here skips the browser cache: a publish must see the branch as it is
// now, or its ref update fails as "not a fast forward".
const FRESH = {cache: 'no-store'} as const;

/**
 * The app branch the tools read from and commit to (docs/PLAN.md, D6). Set
 * VITE_ADMIN_TARGET_BRANCH to rehearse writes on a throwaway branch; unset or
 * empty means master. Read on every call, so tests can stub it.
 */
export function targetBranch(): string {
  return import.meta.env.VITE_ADMIN_TARGET_BRANCH || 'master';
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

// btoa operates on Latin-1, so card text (e.g. the ⬡ glyph) must go through a
// UTF-8 byte encoder first or it corrupts. Exported for direct testing.
export function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** Strip a `data:...;base64,` prefix, leaving raw base64. */
export function stripDataUrl(b64: string): string {
  const comma = b64.indexOf(',');
  return comma >= 0 ? b64.slice(comma + 1) : b64;
}

export interface TokenInfo {
  ok: boolean;
  canPush: boolean;
  error?: string;
}

export async function validateToken(token: string): Promise<TokenInfo> {
  try {
    const res = await fetch(`${API}/repos/${OWNER}/${REPO}`, {...FRESH, headers: authHeaders(token)});
    if (res.status === 401) return {ok: false, canPush: false, error: 'Invalid or expired token'};
    if (!res.ok) return {ok: false, canPush: false, error: `GitHub error ${res.status}`};
    const data = (await res.json()) as {permissions?: {push?: boolean}};
    const canPush = Boolean(data.permissions?.push);
    return {ok: true, canPush, error: canPush ? undefined : 'Token lacks write (push) access'};
  } catch (e) {
    return {ok: false, canPush: false, error: e instanceof Error ? e.message : 'Network error'};
  }
}

async function ghJson<T = Record<string, unknown>>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    ...FRESH,
    headers: {...authHeaders(token), ...(init?.headers ?? {})},
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub ${res.status} on ${path}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Read a repo file's UTF-8 text from the target branch, or from `ref` (a commit
 * or branch) when given. The raw media type returns the file as-is, up to
 * 100 MB; the default JSON form base64-encodes it and stops at 1 MB
 * (docs/PLAN.md, 4.4).
 */
export async function readRepoFile(token: string, path: string, ref = targetBranch()): Promise<string> {
  const res = await fetch(
    `${API}/repos/${OWNER}/${REPO}/contents/${path}?ref=${encodeURIComponent(ref)}`,
    {...FRESH, headers: {...authHeaders(token), Accept: 'application/vnd.github.raw+json'}},
  );
  if (!res.ok) throw new Error(`GitHub ${res.status} on ${path}: ${(await res.text()).slice(0, 200)}`);
  return res.text();
}

export interface CommitFile {
  /** Repo-relative path. */
  path: string;
  /** Blob content as base64 (data-url prefix already stripped). */
  contentBase64: string;
}

export interface CommitResult {
  commitUrl: string;
}

/**
 * One atomic commit on the target branch writing an arbitrary set of files.
 * Reads the branch tip, creates a blob per file, builds a tree on the base
 * commit's tree, commits, and fast-forwards the ref.
 *
 * For a read-modify-write, pass `files` as a function: it gets the base commit's
 * sha and reads what it edits at that commit (readRepoFile's `ref`). If the
 * branch moves meanwhile, the non-force ref update fails instead of silently
 * undoing the other change.
 */
export async function commitFiles(opts: {
  token: string;
  message: string;
  files: CommitFile[] | ((baseCommitSha: string) => Promise<CommitFile[]>);
}): Promise<CommitResult> {
  const {token, message} = opts;
  const branch = targetBranch();

  const ref = await ghJson<{object: {sha: string}}>(
    token,
    `/repos/${OWNER}/${REPO}/git/ref/heads/${branch}`,
  );
  const baseCommitSha = ref.object.sha;
  const files = typeof opts.files === 'function' ? await opts.files(baseCommitSha) : opts.files;
  const baseCommit = await ghJson<{tree: {sha: string}}>(
    token,
    `/repos/${OWNER}/${REPO}/git/commits/${baseCommitSha}`,
  );

  const treeEntries: {path: string; mode: '100644'; type: 'blob'; sha: string}[] = [];
  for (const file of files) {
    const blob = await ghJson<{sha: string}>(token, `/repos/${OWNER}/${REPO}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({content: file.contentBase64, encoding: 'base64'}),
    });
    treeEntries.push({path: file.path, mode: '100644', type: 'blob', sha: blob.sha});
  }

  const tree = await ghJson<{sha: string}>(token, `/repos/${OWNER}/${REPO}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({base_tree: baseCommit.tree.sha, tree: treeEntries}),
  });

  const commit = await ghJson<{sha: string; html_url: string}>(
    token,
    `/repos/${OWNER}/${REPO}/git/commits`,
    {method: 'POST', body: JSON.stringify({message, tree: tree.sha, parents: [baseCommitSha]})},
  );

  await ghJson(token, `/repos/${OWNER}/${REPO}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    body: JSON.stringify({sha: commit.sha}),
  });

  return {commitUrl: commit.html_url};
}
