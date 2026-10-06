import type {VoteLogRow} from './voteLogTypes';

export interface DayGroup {
  day: string;
  count: number;
  voters: number;
  votes: VoteLogRow[];
}

/**
 * Group raw votes into calendar days (by `ts.slice(0, 10)`), newest day first.
 * Within a day, votes preserve their input order. `voters` counts distinct
 * voter tokens seen that day.
 */
export function groupVotesByDay(votes: VoteLogRow[]): DayGroup[] {
  const byDay = new Map<string, {votes: VoteLogRow[]; voters: Set<number>}>();

  for (const row of votes) {
    const day = row.ts.slice(0, 10);
    let group = byDay.get(day);
    if (!group) {
      group = {votes: [], voters: new Set()};
      byDay.set(day, group);
    }
    group.votes.push(row);
    group.voters.add(row.voter);
  }

  return [...byDay.entries()]
    .map(([day, {votes: dayVotes, voters}]) => ({
      day,
      count: dayVotes.length,
      voters: voters.size,
      votes: dayVotes,
    }))
    .sort((x, y) => (x.day < y.day ? 1 : x.day > y.day ? -1 : 0));
}

/** The newest vote's day (`YYYY-MM-DD`), whatever order the log is in; undefined for an empty log. */
export function latestVoteDay(votes: readonly VoteLogRow[]): string | undefined {
  let latest: VoteLogRow | undefined;
  for (const row of votes) {
    if (!latest || Date.parse(row.ts) > Date.parse(latest.ts)) latest = row;
  }
  return latest?.ts.slice(0, 10);
}
