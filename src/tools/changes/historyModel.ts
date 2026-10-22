import {HISTORY_PAGE, type ListedCommit} from '../../github/githubHistory';
import {AREAS, type ChangeArea, type TrackedPath} from './changePaths';

/*
 * The change history's list (/changes): every commit on the target branch that changed
 * a followed path (changePaths.ts), newest first. Each path's history is read a page at
 * a time, and the pages merge into one list (mergedChanges).
 */

/** One change: a commit that changed at least one followed path. */
export interface Change {
  sha: string;
  /** When it was committed, as GitHub gives it: an ISO time in UTC. */
  date: string;
  /** The message's first line. */
  headline: string;
  /** Who made it: the GitHub account, else the name the commit gives. */
  author: string;
  /** What it touched, in AREAS' order. */
  areas: readonly ChangeArea[];
  /**
   * A bot's commit that only follows another: convert-reveal-images turning a raw scan
   * into AVIFs after every scan admin commits. It fills its path's pages, but is never listed.
   */
  automatic: boolean;
}

/** One followed path's history, as far as it has been read. */
export interface PathStream extends TrackedPath {
  /** Its commits read so far, in GitHub's order, the automatic ones included. */
  changes: readonly Change[];
  /** The pages read so far. */
  pages: number;
  /** Its last page was short: nothing older is left to read. */
  done: boolean;
}

/** convert-reveal-images' commits: "chore(reveals): convert raw scans to AVIF", from the Actions bot. */
function isAutomatic({author, headline}: Pick<Change, 'author' | 'headline'>): boolean {
  return author.endsWith('[bot]') && headline.startsWith('chore(reveals): convert');
}

/** A listed commit as a change to `area`. */
export function toChange(listed: ListedCommit, area: ChangeArea): Change {
  const {message, author, committer} = listed.commit;
  const change = {
    sha: listed.sha,
    date: committer?.date ?? author?.date ?? '',
    headline: message.split('\n', 1)[0],
    author: listed.author?.login ?? author?.name ?? 'unknown',
    areas: [area],
  };
  return {...change, automatic: isAutomatic(change)};
}

/** A path's next page read: its changes after the ones read before, and whether it was the last. */
export function withPage(stream: PathStream, page: readonly ListedCommit[]): PathStream {
  return {
    ...stream,
    changes: [...stream.changes, ...page.map((listed) => toChange(listed, stream.area))],
    pages: stream.pages + 1,
    done: page.length < HISTORY_PAGE,
  };
}

/** A path with nothing read yet: its first page comes through withPage. */
export function emptyStream({path, area}: TrackedPath): PathStream {
  return {path, area, changes: [], pages: 0, done: false};
}

/** The oldest date among `changes`, which GitHub lists newest first but not strictly by date. */
function oldestDate(changes: readonly Change[]): string | undefined {
  return changes.reduce<string | undefined>((oldest, {date}) => (oldest === undefined || date < oldest ? date : oldest), undefined);
}

/**
 * How far back every path has been read: the newest of the oldest dates the paths with
 * more to read have reached. A change older than it may have a neighbour in another
 * path's next page, so it waits for that page. Null once every path is read to its start.
 */
function readFloor(streams: readonly PathStream[]): string | null {
  const reached = streams.flatMap(({changes, done}) => (done ? [] : [oldestDate(changes) ?? '']));
  return reached.length === 0 ? null : reached.reduce((floor, date) => (date > floor ? date : floor));
}

/** Both changes' areas, in AREAS' order. */
function unionAreas(a: readonly ChangeArea[], b: readonly ChangeArea[]): ChangeArea[] {
  return AREAS.filter((area) => a.includes(area) || b.includes(area));
}

/** Newest first; two at the same second keep one order by sha, so the list never reshuffles. */
const newestFirst = (a: Change, b: Change) => b.date.localeCompare(a.date) || a.sha.localeCompare(b.sha);

/** The list the paths read so far make, and whether any path has older commits left to read. */
export interface MergedHistory {
  /** Newest first: each commit once, with every area it touched, the automatic ones left out. */
  changes: Change[];
  hasOlder: boolean;
}

/** Whether a change is listed: not an automatic one, and no older than every path has been read to. */
function isListed(change: Change, floor: string | null): boolean {
  if (change.automatic) return false;
  return floor === null || change.date >= floor;
}

/**
 * The paths' pages as one list. A commit that changed two paths is one change with both
 * areas. Only changes the reads have covered for every path are listed (readFloor), so
 * reading older pages only ever adds changes below the ones already listed.
 */
export function mergedChanges(streams: readonly PathStream[]): MergedHistory {
  const floor = readFloor(streams);
  const bySha = new Map<string, Change>();
  for (const change of streams.flatMap((stream) => stream.changes)) {
    if (!isListed(change, floor)) continue;
    const seen = bySha.get(change.sha);
    bySha.set(change.sha, seen ? {...seen, areas: unionAreas(seen.areas, change.areas)} : change);
  }
  return {changes: [...bySha.values()].sort(newestFirst), hasOlder: streams.some((stream) => !stream.done)};
}

/** What the list shows: every change, or the changes that touched one area. */
export type AreaFilter = 'all' | ChangeArea;

export function filterChanges(changes: readonly Change[], filter: AreaFilter): readonly Change[] {
  return filter === 'all' ? changes : changes.filter((change) => change.areas.includes(filter));
}

/**
 * A change's title: its headline without the conventional-commit type and scope, with a
 * capital. "feat(reveals): add Chemical Reaction (1499)" -> "Add Chemical Reaction (1499)".
 * A headline that has none, a merge's, reads as it is.
 */
export function changeTitle(headline: string): string {
  const rest = headline.replace(/^[a-z]+(\([^)]*\))?!?:\s+/, '');
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** The viewer's own calendar day an ISO time falls on, as 'YYYY-MM-DD' (format.ts reads it as a day). */
export function localDay(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The viewer's own clock time an ISO time falls at: "13:39". */
export function localTime(iso: string): string {
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** One day of the list: the day, and its changes, newest first. */
export interface ChangeDay {
  day: string;
  changes: Change[];
}

/** The list cut into the viewer's days, newest first, as mergedChanges orders it. */
export function byDay(changes: readonly Change[]): ChangeDay[] {
  const days: ChangeDay[] = [];
  for (const change of changes) {
    const day = localDay(change.date);
    const last = days.at(-1);
    if (last?.day === day) last.changes.push(change);
    else days.push({day, changes: [change]});
  }
  return days;
}
