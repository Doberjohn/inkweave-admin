/*
 * The app repo's REST API, as admin reaches it: the write layer (githubCommit.ts)
 * and the change history's reads (githubHistory.ts) share these.
 */

const OWNER = 'Doberjohn';
const REPO = 'inkweave';

export const API = 'https://api.github.com';

/** The app repo's API root, which every request path starts from: `${REPO_PATH}/commits`. */
export const REPO_PATH = `/repos/${OWNER}/${REPO}`;

/** The app repo's page on github.com, which a commit's link starts from: `${REPO_URL}/commit/<sha>`. */
export const REPO_URL = `https://github.com/${OWNER}/${REPO}`;

// GitHub marks API responses cacheable for 60 s, and fetch() honours that. Every
// request here skips the browser cache: a publish must see the branch as it is
// now, or its ref update fails as "not a fast forward".
export const FRESH = {cache: 'no-store'} as const;

export function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

/** One request to the API, and its JSON. A failure throws GitHub's status, the path and the start of its body. */
export async function ghJson<T = Record<string, unknown>>(
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

/** Where a repo file is read: its path, and the commit or branch to read it at. */
export interface FileAt {
  token: string;
  path: string;
  ref: string;
}

/**
 * A repo file as it is at `ref`, for its text or its bytes. The raw media type
 * returns the file as-is, up to 100 MB; the default JSON form base64-encodes
 * it and stops at 1 MB (docs/PLAN.md, 4.4).
 */
export async function readRaw({token, path, ref}: FileAt): Promise<Response> {
  const res = await fetch(`${API}${REPO_PATH}/contents/${path}?ref=${encodeURIComponent(ref)}`, {
    ...FRESH,
    headers: {...authHeaders(token), Accept: 'application/vnd.github.raw+json'},
  });
  if (!res.ok) throw new Error(`GitHub ${res.status} on ${path}: ${(await res.text()).slice(0, 200)}`);
  return res;
}
