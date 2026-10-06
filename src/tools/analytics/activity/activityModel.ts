import {bucketFor, rangeStartDay, type RangePreset} from '../../../charts/range';
import {addDays, eachDay, weekStart, type Day} from '../../../charts/scale';
import {fmtInt} from '../../../ui/format';
import {groupVotesByDay, latestVoteDay} from '../activityStats';
import type {VoteLogRow} from '../voteLogTypes';

/**
 * A vote's score band. Quick votes carry no score (`score: null`), so they
 * form their own band and never count toward an average or another band
 * (docs/plans/R-redesign.md, corrections to the spec).
 */
export type ScoreBand = 'high' | 'mid' | 'low' | 'unscored';
export type BandFilter = 'all' | ScoreBand;

/** What one bar of the chart covers: a UTC day, or a week from its UTC Monday (bucketFor, R-9). */
export type ChartBucket = 'day' | 'week';

/** The page's filters. The filter row sets all of them but `day`, which is picked in the chart. */
export interface ActivityFilters {
  q: string;
  voter: number | null;
  band: BandFilter;
  /** The picked bar's key: a UTC `YYYY-MM-DD` day, or the week's Monday when the chart buckets by week. */
  day: Day | null;
  /** The window the page reads, ending on the log's newest vote (R-9). */
  range: RangePreset;
}

/** One bar in the chart, a day or a week: votes per band, their total, and distinct voters. */
export interface DayStack {
  /** The UTC day, or the week's UTC Monday. */
  day: Day;
  high: number;
  mid: number;
  low: number;
  unscored: number;
  total: number;
  voters: number;
}

/** One day on the vote log's current page: the day's full counts, plus the rows the page shows. */
export interface LogDay {
  day: Day;
  count: number;
  voters: number;
  rows: VoteLogRow[];
}

export const NO_FILTERS: ActivityFilters = {q: '', voter: null, band: 'all', day: null, range: '30d'};

/** The bands in filter and legend order, and their labels. */
export const SCORE_BANDS: readonly ScoreBand[] = ['high', 'mid', 'low', 'unscored'];
export const BAND_LABELS: Record<ScoreBand, string> = {high: '7+', mid: '5–6', low: '≤4', unscored: 'No score'};

/** A vote's UTC day. The log's timestamps are UTC ISO strings; groupVotesByDay reads them the same way. */
function dayOf(vote: VoteLogRow): Day {
  return vote.ts.slice(0, 10);
}

/** "1 vote", "2,054 votes". */
export function countOf(n: number, noun: string): string {
  return `${fmtInt(n)} ${noun}${n === 1 ? '' : 's'}`;
}

/** 7 and up is high, 5–6 mid, 4 and below low; no score is its own band. */
export function scoreBandOf(score: number | null): ScoreBand {
  if (score == null) return 'unscored';
  if (score >= 7) return 'high';
  if (score >= 5) return 'mid';
  return 'low';
}

/**
 * Whether a filter that "Clear filters" resets is set. A blank search doesn't
 * count, and neither does the range: it is the window the page reads, so
 * clearing the filters keeps it.
 */
export function hasActiveFilters(f: ActivityFilters): boolean {
  return f.q.trim() !== '' || f.voter !== null || f.band !== 'all' || f.day !== null;
}

/**
 * The votes that pass the search, voter, band and day filters, in input order.
 * The search matches either card's name, ignoring case; the voter is an exact
 * token; the day is a prefix of the vote's timestamp. `range` is ignored here:
 * it counts back from the whole log's newest vote, which a filtered list can't
 * know, so the view narrows to the range first (activityWindow, votesInRange).
 *
 * `day` matches one UTC day. In week buckets pass `day: null` and narrow with
 * `votesInBucket`, as ActivityView does: a week's Monday passed here would keep
 * only that Monday's votes.
 */
export function filterVotes(votes: VoteLogRow[], f: ActivityFilters): VoteLogRow[] {
  const q = f.q.trim().toLowerCase();
  return votes.filter((v) => matchesVoter(v, f) && matchesBand(v, f) && matchesDay(v, f) && matchesSearch(v, q));
}

/** The filter's voter cast the vote, or no voter is set. */
function matchesVoter(v: VoteLogRow, f: ActivityFilters): boolean {
  return f.voter === null || v.voter === f.voter;
}

/** The vote's score falls in the filter's band, or the band is 'all'. */
function matchesBand(v: VoteLogRow, f: ActivityFilters): boolean {
  return f.band === 'all' || scoreBandOf(v.score) === f.band;
}

/** The vote's timestamp starts with the filter's day, or no day is set. */
function matchesDay(v: VoteLogRow, f: ActivityFilters): boolean {
  return f.day === null || v.ts.startsWith(f.day);
}

/** Either card's name holds `q` (already trimmed and lower-cased), or the search is blank. */
function matchesSearch(v: VoteLogRow, q: string): boolean {
  return q === '' || v.aName.toLowerCase().includes(q) || v.bName.toLowerCase().includes(q);
}

/** The votes whose UTC day falls from `startDay` to `endDay`, both included, in input order. */
export function votesInRange(votes: VoteLogRow[], startDay: Day, endDay: Day): VoteLogRow[] {
  return votes.filter((v) => {
    const day = dayOf(v);
    return day >= startDay && day <= endDay;
  });
}

/**
 * The days the page reads for a range. The window ends on the whole log's
 * newest vote and counts back per the range, never past the log's oldest vote
 * (rangeStartDay). Null for an empty log.
 */
export function activityWindow(votes: readonly VoteLogRow[], range: RangePreset): {startDay: Day; endDay: Day} | null {
  const endDay = latestVoteDay(votes);
  if (endDay === undefined) return null;
  const firstDay = votes.reduce((first, vote) => (dayOf(vote) < first ? dayOf(vote) : first), endDay);
  return {startDay: rangeStartDay(range, endDay, firstDay), endDay};
}

interface StackSlot {
  stack: DayStack;
  voters: Set<number>;
}

/** An empty stack per key, in key order. */
function emptySlots(keys: readonly Day[]): Map<Day, StackSlot> {
  return new Map(
    keys.map((day) => [day, {stack: {day, high: 0, mid: 0, low: 0, unscored: 0, total: 0, voters: 0}, voters: new Set()}]),
  );
}

/** Counts each vote into its slot by band and voter. A vote whose key has no slot is left out. */
function fillSlots(slots: Map<Day, StackSlot>, votes: VoteLogRow[], keyOf: (vote: VoteLogRow) => Day): DayStack[] {
  for (const vote of votes) {
    const slot = slots.get(keyOf(vote));
    if (!slot) continue;
    slot.stack[scoreBandOf(vote.score)] += 1;
    slot.stack.total += 1;
    slot.voters.add(vote.voter);
  }
  return [...slots.values()].map(({stack, voters}) => ({...stack, voters: voters.size}));
}

/**
 * Votes per day for the last `days` UTC days, oldest first, ending at `endDay`
 * (by default the newest vote's day). Every calendar day is present, a day
 * without votes as zeros, so the time axis stays even.
 */
export function dailyStacks(votes: VoteLogRow[], days: number, endDay = latestVoteDay(votes)): DayStack[] {
  if (endDay === undefined || days < 1) return [];
  const keys = Array.from({length: days}, (_, i) => addDays(endDay, i - (days - 1)));
  return fillSlots(emptySlots(keys), votes, dayOf);
}

/**
 * Votes per week from `startDay` to `endDay`, oldest first. Each stack's `day`
 * is its week's UTC Monday, and every week is present, a quiet one as zeros.
 * Votes outside the window are left out, so the first and last weeks can be
 * part weeks.
 */
export function weeklyStacks(votes: VoteLogRow[], startDay: Day, endDay: Day): DayStack[] {
  if (startDay > endDay) return [];
  const mondays = eachDay(weekStart(startDay), weekStart(endDay)).filter((_, i) => i % 7 === 0);
  return fillSlots(emptySlots(mondays), votesInRange(votes, startDay, endDay), (vote) => weekStart(dayOf(vote)));
}

/** The chart's bars for a window: one per day up to 90 days, one per week past that (bucketFor, R-9). */
export function chartStacks(votes: VoteLogRow[], startDay: Day, endDay: Day): {bucket: ChartBucket; stacks: DayStack[]} {
  const bucket = bucketFor(startDay, endDay);
  if (bucket === 'week') return {bucket, stacks: weeklyStacks(votes, startDay, endDay)};
  return {bucket, stacks: dailyStacks(votes, eachDay(startDay, endDay).length, endDay)};
}

/** The votes under one bar of the chart: its UTC day, or the seven days from its week's Monday. */
export function votesInBucket(votes: VoteLogRow[], key: Day, bucket: ChartBucket): VoteLogRow[] {
  return votesInRange(votes, key, bucket === 'day' ? key : addDays(key, 6));
}

/**
 * The KPI row's numbers. The average covers scored votes only (null when no
 * vote has a score). A tie for the busiest day goes to the later day.
 */
export function activityKpis(votes: VoteLogRow[]): {
  votes: number;
  activeVoters: number;
  avgScore: number | null;
  busiestDay: {day: Day; count: number} | null;
} {
  const voters = new Set<number>();
  const perDay = new Map<Day, number>();
  let scoreSum = 0;
  let scored = 0;
  for (const vote of votes) {
    voters.add(vote.voter);
    perDay.set(dayOf(vote), (perDay.get(dayOf(vote)) ?? 0) + 1);
    if (vote.score != null) {
      scoreSum += vote.score;
      scored += 1;
    }
  }
  let busiestDay: {day: Day; count: number} | null = null;
  for (const [day, count] of perDay) {
    if (!busiestDay || count > busiestDay.count || (count === busiestDay.count && day > busiestDay.day)) {
      busiestDay = {day, count};
    }
  }
  return {votes: votes.length, activeVoters: voters.size, avgScore: scored > 0 ? scoreSum / scored : null, busiestDay};
}

/** The `n` voters with the most votes. A tie goes to the lower token (the voter seen first). */
export function topVoters(votes: VoteLogRow[], n: number): Array<{voter: number; count: number}> {
  const counts = new Map<number, number>();
  for (const vote of votes) counts.set(vote.voter, (counts.get(vote.voter) ?? 0) + 1);
  return [...counts.entries()]
    .map(([voter, count]) => ({voter, count}))
    .sort((x, y) => y.count - x.count || x.voter - y.voter)
    .slice(0, n);
}

interface PairTally {
  key: string;
  a: string;
  b: string;
  aName: string;
  bName: string;
  count: number;
  scoreSum: number;
  scored: number;
  latest: number;
}

/** A pair's key: its two ids in sorted order, so a pair is one pair whichever way round it comes. */
function pairKey(vote: VoteLogRow): string {
  return vote.a < vote.b ? `${vote.a}:${vote.b}` : `${vote.b}:${vote.a}`;
}

/** Counts a vote into its pair's tally. A pair's first vote starts the tally, with that vote's names. */
function tallyVote(tallies: Map<string, PairTally>, vote: VoteLogRow): void {
  const key = pairKey(vote);
  const tally = tallies.get(key) ?? {
    key,
    a: vote.a,
    b: vote.b,
    aName: vote.aName,
    bName: vote.bName,
    count: 0,
    scoreSum: 0,
    scored: 0,
    latest: -Infinity,
  };
  tally.count += 1;
  if (vote.score != null) {
    tally.scoreSum += vote.score;
    tally.scored += 1;
  }
  tally.latest = Math.max(tally.latest, Date.parse(vote.ts));
  tallies.set(key, tally);
}

/** Most votes first, then the pair voted most recently, then the lower key. */
function byPairRank(x: PairTally, y: PairTally): number {
  return y.count - x.count || y.latest - x.latest || (x.key < y.key ? -1 : x.key > y.key ? 1 : 0);
}

/**
 * The `n` pairs with the most votes, each with its average over scored votes
 * (null when none has a score). The log already orders every pair's ids
 * (buildVoteLog puts the lower id in `a`, and the votes table enforces
 * card_a_id < card_b_id), but the key sorts them anyway, like
 * scripts/lib/voteAnalytics.mjs's pairKey, so a pair is one pair whichever way
 * round it comes; names come from the pair's first row. A tie goes to the pair
 * voted most recently, then to the lower key.
 */
export function topPairs(
  votes: VoteLogRow[],
  n: number,
): Array<{a: string; b: string; aName: string; bName: string; count: number; avgScore: number | null}> {
  const tallies = new Map<string, PairTally>();
  for (const vote of votes) tallyVote(tallies, vote);
  return [...tallies.values()]
    .sort(byPairRank)
    .slice(0, n)
    .map(({a, b, aName, bName, count, scoreSum, scored}) => ({
      a,
      b,
      aName,
      bName,
      count,
      avgScore: scored > 0 ? scoreSum / scored : null,
    }));
}

/**
 * The Carries cell. 'a' and 'b' name the card in that position of the row,
 * 'both' and 'neither' read as words, and no answer shows as '—'.
 */
export function carriesLabel(vote: VoteLogRow): string {
  if (vote.whoCarries == null) return '—';
  switch (vote.whoCarries) {
    case 'a':
      return vote.aName;
    case 'b':
      return vote.bName;
    case 'both':
      return 'Both';
    case 'neither':
      return 'Neither';
    default:
      return vote.whoCarries;
  }
}

/**
 * The vote log's current page: the first `limit` votes, newest first, grouped
 * by UTC day. A day the page cuts short keeps its full vote and voter counts;
 * `hidden` is how many votes the page leaves out.
 */
export function logPage(votes: VoteLogRow[], limit: number): {days: LogDay[]; hidden: number} {
  const newestFirst = [...votes].sort((x, y) => Date.parse(y.ts) - Date.parse(x.ts));
  const days: LogDay[] = [];
  let room = limit;
  for (const group of groupVotesByDay(newestFirst)) {
    if (room <= 0) break;
    const rows = group.votes.slice(0, room);
    room -= rows.length;
    days.push({day: group.day, count: group.count, voters: group.voters, rows});
  }
  return {days, hidden: Math.max(0, votes.length - Math.max(0, limit))};
}
