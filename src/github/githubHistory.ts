import {REPO_PATH, ghJson, readRaw, type FileAt} from './githubApi';
import {targetBranch} from './githubCommit';

/*
 * The app repo's history, as the change history (/changes) reads it: the commits on
 * the target branch that changed a path, one commit's files, and a file's bytes at
 * a commit. All of it only reads.
 */

/** One commit of a path's history, as GitHub lists it: the fields the history reads. */
export interface ListedCommit {
  sha: string;
  commit: {
    message: string;
    author: {name: string; date: string} | null;
    committer: {name: string; date: string} | null;
  };
  /** The GitHub account the author's email belongs to, or null for one GitHub doesn't know. */
  author: {login: string} | null;
}

/** How many commits a page of a path's history holds. A shorter page is its last. */
export const HISTORY_PAGE = 50;

/** A page of a path's history: the path, a file or a folder, and the page (1 for the newest). */
export interface HistoryPage {
  token: string;
  path: string;
  page: number;
}

/** One page of the commits on the target branch that changed `path`, newest first. */
export function listPathCommits({token, path, page}: HistoryPage): Promise<ListedCommit[]> {
  const query = new URLSearchParams({sha: targetBranch(), path, per_page: String(HISTORY_PAGE), page: String(page)});
  return ghJson<ListedCommit[]>(token, `${REPO_PATH}/commits?${query}`);
}

/** A file a commit changed, as GitHub lists it. A renamed file names the path it had too. */
export interface ChangedFile {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  previous_filename?: string;
}

/** One commit as GitHub gives it alone: its page, its parents and the files it changed. */
export interface CommitFiles {
  sha: string;
  html_url: string;
  parents: {sha: string}[];
  /** Up to the first 300; GitHub pages the rest, which the history never reads. */
  files?: ChangedFile[];
}

/** The commit `sha`, with the files it changed. */
export function readCommitFiles({token, sha}: {token: string; sha: string}): Promise<CommitFiles> {
  return ghJson<CommitFiles>(token, `${REPO_PATH}/commits/${sha}`);
}

/** A file's bytes at a commit, as a Blob: a scan, for an image to show. */
export async function readRepoBlob(file: FileAt): Promise<Blob> {
  return (await readRaw(file)).blob();
}
