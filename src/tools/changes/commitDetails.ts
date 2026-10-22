import {readRepoFile} from '../../github/githubCommit';
import {readCommitFiles, type ChangedFile} from '../../github/githubHistory';
import {TUNING_PATH} from '../tuning/githubClient';
import {areaOf} from './changePaths';
import {readEntries, type EntryMap} from './dataEntries';
import {diffEntries, mergeEntryChanges, type EntryChange} from './entryDiff';
import {diffTuning, type TuningChange} from './tuningDiff';

/*
 * What one commit changed, read from the commit itself when its row opens: the files it
 * changed, and each followed text file before and after it. Scans are listed, and shown
 * from the commit, by the view (ChangeDetails).
 */

/** A raw scan a commit added or replaced: where it is, and the commit that holds it. */
export interface ScanFile {
  path: string;
  /** The card the scan is for: its file's name, which is the card's id. */
  cardId: string;
  sha: string;
}

/** What one commit changed. */
export interface CommitDetails {
  /** The commit's page on GitHub. */
  url: string;
  /** Each card or printing it added, removed or changed, once, however many files hold it. */
  entries: EntryChange[];
  tuning: TuningChange[];
  scans: ScanFile[];
  /** Followed files it changed that aren't itemized: more than MAX_READ of them, or a file this can't read. */
  unread: string[];
  /** How many files it changed outside the followed paths: code, tests, docs. */
  otherFiles: number;
}

/**
 * How many followed text files a commit's details read. An admin commit changes three at
 * most (a promo's versions: the catalog, promos.json and allCards.json); a commit that
 * regenerates the card data changes many more, and the commit's page says it better.
 */
export const MAX_READ = 4;

/** Where a commit's files are read: the token, the commit, and its parent, or null for the first commit. */
interface CommitRef {
  token: string;
  sha: string;
  parent: string | null;
}

/** A followed text file, as it read before the commit and after it: null for a side with no file. */
interface TextSides {
  path: string;
  before: string | null;
  after: string | null;
}

/** The file's text on each side of the commit. A file the commit added has none before, one it removed none after. */
async function readSides({token, sha, parent}: CommitRef, file: ChangedFile): Promise<TextSides> {
  const [before, after] = await Promise.all([
    file.status === 'added' || parent === null ? null : readRepoFile(token, file.previous_filename ?? file.filename, parent),
    file.status === 'removed' ? null : readRepoFile(token, file.filename, sha),
  ]);
  return {path: file.filename, before, after};
}

const NO_ENTRIES: EntryMap = new Map();

/** One card data file's changed entries, or null for a file whose layout readEntries doesn't know. */
function fileEntryChanges({path, before, after}: TextSides): EntryChange[] | null {
  const old = before === null ? NO_ENTRIES : readEntries({path, text: before});
  const now = after === null ? NO_ENTRIES : readEntries({path, text: after});
  return old && now && diffEntries({before: old, after: now});
}

/** The card data files' changes as one list, and the files it couldn't itemize: not JSON, a layout it doesn't know, or a value it can't word. */
function dataChanges(files: readonly TextSides[]): {entries: EntryChange[]; unread: string[]} {
  const perFile: EntryChange[][] = [];
  const unread: string[] = [];
  for (const file of files) {
    let changes: EntryChange[] | null = null;
    try {
      changes = fileEntryChanges(file);
    } catch {
      // Unreadable: the file is listed as unread rather than failing the whole commit.
    }
    if (changes === null) unread.push(file.path);
    else perFile.push(changes);
  }
  return {entries: mergeEntryChanges(perFile), unread};
}

/** tuning.json's changes, or null where its text isn't JSON. */
function tuningChanges(file: TextSides | undefined): TuningChange[] | null {
  if (file === undefined) return [];
  try {
    return diffTuning(file);
  } catch {
    return null;
  }
}

/** The scans a commit added or replaced. The bot's commit that removes them after converting them adds none. */
function scansOf(files: readonly ChangedFile[], sha: string): ScanFile[] {
  return files
    .filter((file) => areaOf(file.filename) === 'scans' && file.status !== 'removed')
    .map(({filename}) => ({path: filename, cardId: filename.replace(/^.*\//, '').replace(/\.[^.]*$/, ''), sha}));
}

/** What the read files say: tuning.json's values and the card data's entries, and the files that couldn't be itemized. */
function itemized(read: readonly TextSides[]): Pick<CommitDetails, 'entries' | 'tuning' | 'unread'> {
  const tuning = tuningChanges(read.find((file) => file.path === TUNING_PATH));
  const {entries, unread} = dataChanges(read.filter((file) => file.path !== TUNING_PATH));
  return {entries, tuning: tuning ?? [], unread: tuning === null ? [...unread, TUNING_PATH] : unread};
}

/** Reads what the commit changed: its files, then each followed text file on both sides of it. */
async function loadCommitDetails({token, sha}: {token: string; sha: string}): Promise<CommitDetails> {
  const commit = await readCommitFiles({token, sha});
  const files = commit.files ?? [];
  const followed = files.filter((file) => areaOf(file.filename) !== null);
  const texts = followed.filter((file) => areaOf(file.filename) !== 'scans');
  const listed = {url: commit.html_url, scans: scansOf(files, sha), otherFiles: files.length - followed.length};
  if (texts.length > MAX_READ) return {...listed, entries: [], tuning: [], unread: texts.map((file) => file.filename)};
  const ref: CommitRef = {token, sha, parent: commit.parents[0]?.sha ?? null};
  return {...listed, ...itemized(await Promise.all(texts.map((file) => readSides(ref, file))))};
}

/** Each commit's details, read once a session: a commit never changes. A failed read leaves, so the next try reads again. */
const cache = new Map<string, Promise<CommitDetails>>();

/** What the commit `sha` changed, read the first time it is asked for and kept for the session. */
export function commitDetails({token, sha}: {token: string; sha: string}): Promise<CommitDetails> {
  const cached = cache.get(sha);
  if (cached) return cached;
  const pending = loadCommitDetails({token, sha});
  cache.set(sha, pending);
  pending.catch(() => {
    if (cache.get(sha) === pending) cache.delete(sha);
  });
  return pending;
}

/** Empty the cache. Tests only: src/test/setup.ts calls it before every test. */
export function resetCommitDetails(): void {
  cache.clear();
}
