import {addDays, type Day} from '../../../charts/scale';
import type {PairStat} from '../voteAnalyticsTypes';
import type {VoteLogRow} from '../voteLogTypes';

/*
 * Chart fixtures shared by the calibration tests and stories, as
 * overview/overviewFixtures.ts is for the Overview's. They live in a plain
 * module: Storybook reads every named export of a .stories.tsx file as a
 * story, and a story can't import a test file. All of them are seeded, never
 * Math.random, so stories hold still and tests repeat. Nothing in the app
 * imports this file, so the build leaves it out.
 */

/** A pair record: "Card <a>" × "Card <b>", gap = community − engine. */
export function pairOf(
  a: string,
  b: string,
  engineScore: number,
  communityScore: number,
  scoreVotes = 1,
  rules: string[] = ['ramp'],
): PairStat {
  const gap = communityScore - engineScore;
  return {a, b, aName: `Card ${a}`, bName: `Card ${b}`, engineScore, communityScore, gap, scoreVotes, rules};
}

/**
 * Engine → community: 7 → 4, 7 → 7, 7 → 7 (2 votes), 3 → 9, 8 → 7.5 (2 votes)
 * and 9 → 1. Gaps −3, 0, 0, +6, −0.5 and −8, every pair under Ramp.
 */
export const SIX_PAIRS: readonly PairStat[] = [
  pairOf('1', '2', 7, 4),
  pairOf('3', '4', 7, 7),
  pairOf('5', '6', 7, 7, 2),
  pairOf('7', '8', 3, 9),
  pairOf('9', '10', 8, 7.5, 2),
  pairOf('11', '12', 9, 1),
];

/** A seeded 0-to-1 sequence (mulberry32). */
export function seeded(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * `count` pairs at real density: whole-number engine scores from 1 to 10 and a
 * community score within three points of it. Every tenth pair has two to five
 * votes and an averaged community score; the rest have one vote each.
 */
export function seededPairs(count: number, seed = 1, rules: string[] = ['ramp']): PairStat[] {
  const next = seeded(seed);
  return Array.from({length: count}, (_, i) => {
    const engine = 1 + Math.floor(next() * 10);
    const votes = i % 10 === 9 ? 2 + Math.floor(next() * 4) : 1;
    // The mean of `votes` whole-number scores is a multiple of 1 / votes.
    const drift = Math.round((next() * 6 - 3) * votes) / votes;
    const community = Math.min(10, Math.max(1, engine + drift));
    return pairOf(String(2 * i + 1), String(2 * i + 2), engine, community, votes, rules);
  });
}

/** Which weeks seededVotes spreads the votes over, and its seed. */
export interface SeededVotesOptions {
  /** How many weeks, ending with the Monday `lastWeek`. */
  weeks: number;
  lastWeek: Day;
  /** The generator's seed (default 1). */
  seed?: number;
  /** The index of a week that gets no votes (default none). */
  quietWeek?: number | null;
}

/**
 * One score vote per pair vote, spread over the `weeks` weeks that end with the
 * Monday `lastWeek`, on seeded days, at noon UTC in Supabase's microsecond
 * `+00:00` form. Each scores its pair's community score, rounded. The week at
 * index `quietWeek`, if given, gets none.
 */
export function seededVotes(
  pairs: readonly PairStat[],
  {weeks, lastWeek, seed = 1, quietWeek = null}: SeededVotesOptions,
): VoteLogRow[] {
  const next = seeded(seed);
  return pairs.flatMap((p) =>
    Array.from({length: p.scoreVotes}, (): VoteLogRow => {
      let week = Math.floor(next() * weeks);
      if (week === quietWeek) week = (week + 1) % weeks;
      // The week's Monday, counted back from lastWeek, then a seeded day of that week.
      const day = addDays(lastWeek, (week - (weeks - 1)) * 7 + Math.floor(next() * 7));
      return {
        a: p.a,
        b: p.b,
        aName: p.aName,
        bName: p.bName,
        score: Math.round(p.communityScore),
        accuracy: null,
        isReal: null,
        wouldPlay: null,
        difficulty: null,
        whoCarries: null,
        ts: `${day}T12:00:00.000000+00:00`,
        voter: 1 + Math.floor(next() * 40),
      };
    }),
  );
}

/** The all-pairs scope at real density, and its 16 weeks of votes, ending the week of Sep 28. */
export const ALL_PAIRS: readonly PairStat[] = seededPairs(400);
export const ALL_PAIRS_VOTES: readonly VoteLogRow[] = seededVotes(ALL_PAIRS, {weeks: 16, lastWeek: '2026-09-28'});
/** One rule's scope: 60 pairs, and a log with a quiet week (the eleventh of 16). */
export const ONE_RULE: readonly PairStat[] = seededPairs(60, 7);
export const ONE_RULE_VOTES: readonly VoteLogRow[] = seededVotes(ONE_RULE, {
  weeks: 16,
  lastWeek: '2026-09-28',
  seed: 7,
  quietWeek: 10,
});
