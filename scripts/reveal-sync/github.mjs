/**
 * Every GitHub call a run makes, through the owner's `gh` login (docs/plans/P3-pipelines.md,
 * P3-5 and P3-6): the app repo a run reads its base from and opens its PR against, and
 * admin's own repo, where state.json lives. `gh` holds the credentials, so no token passes
 * through this code.
 */
import {execFileSync} from 'node:child_process';

export const APP_REPO = 'Doberjohn/inkweave';
export const ADMIN_REPO = 'Doberjohn/inkweave-admin';
/** The app branch a run starts from and opens its PR against. The rehearsal overrides it. */
export const APP_BASE = process.env.REVEAL_SYNC_APP_BASE || 'master';
/** Admin's branch holding state.json. The rehearsal overrides it. */
export const STATE_BRANCH = process.env.REVEAL_SYNC_STATE_BRANCH || 'main';
/** Every reveal PR's branch starts with this. */
export const PR_PREFIX = 'reveals/';

const gh = (args, input) =>
  execFileSync('gh', ['api', ...args], {
    encoding: 'utf8',
    input,
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

let runner = gh;

/** Tests swap in a fake `gh api`; no argument restores the real one. */
export function setGhRunner(next = gh) {
  runner = next;
}

/** One REST call. A body goes to gh as JSON on stdin; the answer comes back parsed. */
export function ghApi(endpoint, {method = 'GET', body} = {}) {
  const args = [endpoint, '--method', method, ...(body === undefined ? [] : ['--input', '-'])];
  let out;
  try {
    out = runner(args, body === undefined ? undefined : JSON.stringify(body));
  } catch (error) {
    const detail = String(error.stderr || error.message).trim();
    throw new Error(`gh api ${method} ${endpoint}: ${detail}`, {cause: error});
  }
  return out.trim() ? JSON.parse(out) : null;
}

const at = (ref) => `?ref=${encodeURIComponent(ref)}`;

/** A file's UTF-8 text and blob sha, at a branch or commit. */
export function readFile(repo, filePath, ref) {
  const file = ghApi(`repos/${repo}/contents/${filePath}${at(ref)}`);
  if (file.encoding !== 'base64') throw new Error(`${filePath} is over the contents API's 1 MB limit`);
  return {text: Buffer.from(file.content, 'base64').toString('utf8'), sha: file.sha};
}

/** The names in a directory at a branch or commit, read as a git tree (no 1,000-entry cap). */
export function listDir(repo, dirPath, ref) {
  const slash = dirPath.lastIndexOf('/');
  const dir = ghApi(`repos/${repo}/contents/${dirPath.slice(0, slash)}${at(ref)}`).find(
    (entry) => entry.type === 'dir' && entry.name === dirPath.slice(slash + 1),
  );
  if (!dir) return new Set();
  return new Set(ghApi(`repos/${repo}/git/trees/${dir.sha}`).tree.map((entry) => entry.path));
}

/** The commit a branch points at. */
export const branchTip = (repo, branch) => ghApi(`repos/${repo}/git/ref/heads/${branch}`).object.sha;

/**
 * A commit on `parent` writing `files` ({path, base64}): a blob each, a tree on the parent's
 * tree, then the commit. No branch moves; returns the commit's sha.
 */
export function createCommit(repo, {parent, message, files}) {
  const baseTree = ghApi(`repos/${repo}/git/commits/${parent}`).tree.sha;
  const tree = files.map((file) => ({
    path: file.path,
    mode: '100644',
    type: 'blob',
    sha: ghApi(`repos/${repo}/git/blobs`, {method: 'POST', body: {content: file.base64, encoding: 'base64'}}).sha,
  }));
  const treeSha = ghApi(`repos/${repo}/git/trees`, {method: 'POST', body: {base_tree: baseTree, tree}}).sha;
  return ghApi(`repos/${repo}/git/commits`, {method: 'POST', body: {message, tree: treeSha, parents: [parent]}}).sha;
}

/** A new branch at `sha`. GitHub refuses a name that exists. */
export function createBranch(repo, branch, sha) {
  ghApi(`repos/${repo}/git/refs`, {method: 'POST', body: {ref: `refs/heads/${branch}`, sha}});
}

/** Move a branch to `sha`. Never forced: GitHub refuses anything but a fast-forward. */
export function advanceBranch(repo, branch, sha) {
  ghApi(`repos/${repo}/git/refs/heads/${branch}`, {method: 'PATCH', body: {sha, force: false}});
}

/** Open a PR; returns its URL. */
export function openPullRequest(repo, {head, base, title, body}) {
  return ghApi(`repos/${repo}/pulls`, {method: 'POST', body: {head, base, title, body}}).html_url;
}

/** The open PRs whose branch starts with `prefix`, as {number, url, branch}. */
export function openPullsFrom(repo, prefix) {
  return ghApi(`repos/${repo}/pulls?state=open&per_page=100`)
    .filter((pr) => pr.head.ref.startsWith(prefix))
    .map((pr) => ({number: pr.number, url: pr.html_url, branch: pr.head.ref}));
}
