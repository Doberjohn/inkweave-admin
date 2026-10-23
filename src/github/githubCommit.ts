import {API, FRESH, REPO_PATH, authHeaders, ghJson, readRaw} from './githubApi';

/**
 * The app branch the tools read from and commit to (docs/PLAN.md, D6). Set
 * VITE_ADMIN_TARGET_BRANCH to rehearse writes on a throwaway branch; unset or
 * empty means master. Read on every call, so tests can stub it.
 */
export function targetBranch(): string {
  return import.meta.env.VITE_ADMIN_TARGET_BRANCH || 'master';
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
    const res = await fetch(`${API}${REPO_PATH}`, {...FRESH, headers: authHeaders(token)});
    if (res.status === 401) return {ok: false, canPush: false, error: 'Invalid or expired token'};
    if (!res.ok) return {ok: false, canPush: false, error: `GitHub error ${res.status}`};
    const data = (await res.json()) as {permissions?: {push?: boolean}};
    const canPush = Boolean(data.permissions?.push);
    return {ok: true, canPush, error: canPush ? undefined : 'Token lacks write (push) access'};
  } catch (e) {
    return {ok: false, canPush: false, error: e instanceof Error ? e.message : 'Network error'};
  }
}

/**
 * Read a repo file's UTF-8 text from the target branch, or from `ref` (a commit
 * or branch) when given (readRaw).
 */
export async function readRepoFile(token: string, path: string, ref = targetBranch()): Promise<string> {
  return (await readRaw({token, path, ref})).text();
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
 * Refuses a tree that is the base commit's own. GitHub names a tree by what it
 * holds, so files the branch already holds as they are build it again, and a
 * commit of it would change nothing.
 */
function requireChange({tree, baseCommit, branch}: {tree: {sha: string}; baseCommit: {tree: {sha: string}}; branch: string}): void {
  if (tree.sha !== baseCommit.tree.sha) return;
  throw new Error(`Nothing changed on ${branch}: it already holds these files as they are, so nothing was committed.`);
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
 *
 * Files the branch already holds as they are build the base commit's tree again
 * (GitHub names a tree by what it holds). That would be an empty commit, so it
 * throws instead: no commit is made and the branch stays where it was.
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
    `${REPO_PATH}/git/ref/heads/${branch}`,
  );
  const baseCommitSha = ref.object.sha;
  const files = typeof opts.files === 'function' ? await opts.files(baseCommitSha) : opts.files;
  const baseCommit = await ghJson<{tree: {sha: string}}>(
    token,
    `${REPO_PATH}/git/commits/${baseCommitSha}`,
  );

  const treeEntries: {path: string; mode: '100644'; type: 'blob'; sha: string}[] = [];
  for (const file of files) {
    const blob = await ghJson<{sha: string}>(token, `${REPO_PATH}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({content: file.contentBase64, encoding: 'base64'}),
    });
    treeEntries.push({path: file.path, mode: '100644', type: 'blob', sha: blob.sha});
  }

  const tree = await ghJson<{sha: string}>(token, `${REPO_PATH}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({base_tree: baseCommit.tree.sha, tree: treeEntries}),
  });
  requireChange({tree, baseCommit, branch});

  const commit = await ghJson<{sha: string; html_url: string}>(
    token,
    `${REPO_PATH}/git/commits`,
    {method: 'POST', body: JSON.stringify({message, tree: tree.sha, parents: [baseCommitSha]})},
  );

  try {
    await ghJson(token, `${REPO_PATH}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      body: JSON.stringify({sha: commit.sha}),
    });
  } catch (e) {
    // Someone else committed after this read the branch. The ref did not move,
    // so nothing was published, and a retry builds on their commit.
    if (e instanceof Error && /not a fast forward/i.test(e.message)) {
      throw new Error(`${branch} changed while publishing, so nothing was published. Publish again.`, {cause: e});
    }
    throw e;
  }

  return {commitUrl: commit.html_url};
}
