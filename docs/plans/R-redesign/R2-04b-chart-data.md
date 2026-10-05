> Part of [R: Admin redesign](../R-redesign.md), phase R2 ([R2-calibration-tuning.md](R2-calibration-tuning.md)). Read the main plan's decisions (R-17 to R-26 for R2), corrections, global constraints and shared interfaces, then the R2 header, first.

### Task R2-4b: Calibration chart data

> **Re-base notes** (2026-10-05, against main `c92e260`, pin `bc877e1` and decisions R-17 to R-26)
> - **Kept.** The outline's data model stays as it was:
>   - `GAP_SERIES`, `gapSide` and `sideColor`;
>   - `scoreText`, `SCORE_DOMAIN`, `SCORE_TICKS` and `SCATTER_JITTER`;
>   - `scatterPoints` and `sharedScores`;
>   - `GAP_BIN_LIMIT`, `gapBinCenter`, `gapBins`, `binLabel`, `binRange` and `gapShares`;
>   - `WeeklyGap`, `weeklyGaps` and `gapDomain`;
>   - the fixtures module, with the same exports and the same seeded data.
> - **R-24 applied.** Bins stay one point wide and centred on whole numbers, and gaps beyond ±5 fold into the end bins (`GAP_BIN_LIMIT = 5`). The constant's doc names the phase's real-data check (header, "Before the PR") as what confirms ±5. The doc on `WeeklyGap.scoreVotes` says it is what the area under the gap line draws.
> - **End labels carry no space** (`≤−5`, `≥+5`). BarChart thins x labels until the widest fits its slot. Two-up, a 4-character end label made it drop every other label, the centre "0" bin included (R2-4c's measurement).
> - **Facts re-checked at the pin and on main.**
>   - A pair's engine score is still the highest of its connections' scores (`computeAggregateScore`, `SynergyEngine.ts:21-24`).
>   - Rule scores are whole numbers capped at 10 (`rules.ts:160`, `:707` and `:836`), and `tuning.json` holds no fractional score. So "most pairs sit on a whole-number spot" still holds.
>   - `scripts/lib/voteAnalytics.mjs` hasn't changed since the outline. This task cites `bucketWeekly`, `buildVoteLog`, `buildAnalytics` and `PairStat` (`voteAnalyticsTypes.ts`) by name, not line: R2-1 (R-17) lands first and edits both files, which moves them.
> - **The kit as built.** R1's final fix wave added `type Day` to `scale.ts`, and `activityModel.weeklyStacks` walks Mondays with `eachDay(...).filter((_, i) => i % 7 === 0)`. `weeklyGaps` does the same and types `week` as `Day`, in place of the outline's `WEEK_MS` / `Date.parse` loop. `seededVotes` uses `addDays` in place of `DAY_MS` arithmetic and calls the generator in the same order, so the seeded data is identical (16 weeks, the eleventh quiet).
> - **The tables now live here.** New: `scatterTable`, `histogramTable`, `weeklyTable` and `sharePercent`. R1-9 as built keeps a chart's table next to its data as pure functions (`activity/activityChart.ts`, `chartTable`) and tests them without rendering. The builders give the outline's R2-4c captions, columns and rows, so R2-4c's 18 component tests pass. R2-4c's re-base already imports the four helpers; its Step 1 greps for them.
> - **`sharePercent` never prints "0%" for a bin that has pairs.** A share above zero that would round to 0 prints "<1%". With a few thousand real pairs, a one-pair end bin would otherwise read "1 pair … 0%" in the table, the tooltip and the subtitle.
> - **The claim that `weeklyGaps` reproduces `global.weekly` now has a test.** The outline only tested a mean computed by hand. `scripts/lib/__tests__/weeklyGapsParity.test.mjs` runs the same raw votes through the precompute's own `buildAnalytics` and `buildVoteLog`. It checks `weeklyGaps` against `global.weekly` week by week, a week with no vote at all included (`global.weekly` skips it, `weeklyGaps` fills it), and each rule's weeks against that rule's `meanGap` and `scoreVotes`, which covers the scope join that `pairsInScope` feeds. Like its neighbours it runs in node: `scripts/reveal-sync/write-chain.test.mjs` already imports `src/**/*.ts` under node (`forwarded-paths.test.mjs` only reads JSON). It lives under `scripts/` because a `.ts` test can't import the untyped `.mjs` without a `@ts-expect-error`, and `src` has none today.
> - **What `pairsInScope` hands over:** widest gap first and uncapped, and `[]` for a tuning-only row. Every function here takes `readonly PairStat[]` in any order (the tests feed scopes reversed). `weeklyGaps(votes, [])` gives every week of the log with no mean, which R2-4c's "No score votes in this scope yet." reads. R2-4c's own empty check is still needed: R1-3b's deferred note says LineChart draws axes, not `emptyText`, for a series with no values.
> - **R1-3b's deferred note on lopsided signed ticks** is answered for the gap plot by `gapDomain`: the domain is symmetric, so the ticks are −edge, 0 and +edge.
> - **Small changes.** `binRange(0)` builds "within ±0.5" from `CALIBRATION_BAND`, as the legend does, and `GAP_SERIES` builds its side labels through `signed`, so no minus sign is typed by hand. New tests cover `GAP_SERIES`, the three tables, `sharePercent`'s "<1%" and a log read newest first. Nothing in the outline was dropped.
> - **For the assembler.** In header.md's task table (its line 421), R2-4b's row adds "and the three chart tables (`scatterTable`, `histogramTable`, `weeklyTable`, `sharePercent`)". The block after this task's Step 8 belongs in the phase's real-data check (header, "Before the PR"): move it there, then delete it here.
> - **Verified** in `sandbox-r24b-fix` (R2-1's real `calibrationModel.ts`, `voteAnalyticsTypes.ts` and precompute; R2-4a's `ScatterPoint` stubbed from its contract): fails before `chartData.ts` exists, 36 pass after, `tsc` and eslint clean. The unspaced end labels were re-checked in `sandbox-r24b-labels`: 36 pass, and both files are clean under `eslint --max-warnings 0 --stdin`.

**Files:**
- Create `src/tools/analytics/calibration/chartFixtures.ts`: the six-pair fixture and the seeded generators. Both test files use it (`chartData.test.ts`, and R2-4c's `CalibrationCharts.test.tsx`), and so do both stories files (R2-4c's `CalibrationCharts.stories.tsx` and R2-6's `CalibrationWorkspace.stories.tsx`).
  - It is a plain module, as `overview/overviewFixtures.ts` is. Storybook (`.storybook/main.ts`, CSF) reads every named export of a `.stories.tsx` file as a story, and a story can't import from a test file.
  - Nothing in the app imports it, so the build leaves it out.
- Create `src/tools/analytics/calibration/chartData.ts`.
- Test `src/tools/analytics/calibration/__tests__/chartData.test.ts`.
- Test `scripts/lib/__tests__/weeklyGapsParity.test.mjs`.
- No existing file changes.

**Interfaces:**
- **Consumes:**
  - `PairStat` (`src/tools/analytics/voteAnalyticsTypes.ts`, by name: R2-1 edits that file and moves it) and `VoteLogRow` (`src/tools/analytics/voteLogTypes.ts:1-14`).
  - `pairId(a: string, b: string): string` from `./calibrationModel` (R2-1).
  - `ScatterPoint` (`{key: string; x: number; y: number; series: string; label: string}`) from `src/charts/ScatterChart.tsx` (R2-4a, contract addition 5). R2-4a defines it in `scatter.ts` and re-exports it from `ScatterChart.tsx`, as `BarChart` re-exports `BarDatum` from `barLayout.ts`, so it imports from `ScatterChart`.
  - `CALIBRATION_BAND` (`src/tools/analytics/verdict.ts:4`, 0.5).
  - From `src/charts/scale.ts`: `type Day` (:14), `addDays` (:95), `eachDay` (:109) and `weekStart` (:116).
  - `type ChartTable` (`src/charts/ChartFrame.tsx:7-11`) and `type SeriesDef` (`src/charts/series.ts:39-45`).
  - `fmtDay`, `fmtGap`, `fmtInt` and `fmtScore` from `src/ui/format.ts`.
  - `countOf` (`src/tools/analytics/activity/activityModel.ts:61-63`).
  - `ADMIN_COLORS.barNeutral`, `.over` and `.under` (`src/theme/adminTheme.ts:70`, `:83` and `:84`). They are the score-band trio that `adminTheme.test.ts` already holds to 3:1, so the theme test gains nothing.
  - The parity test also uses `buildAnalytics` and `buildVoteLog` from `scripts/lib/voteAnalytics.mjs`, by name: R2-1 adds to that file and moves both.
- **Produces:**
```ts
// chartData.ts
export type GapSide = 'over' | 'agree' | 'under';
export const GAP_SERIES: readonly SeriesDef[];                  // over, agree, under: the scatter's and the histogram's one split
export function sideColor(side: GapSide): string;
export function gapSide(gap: number): GapSide;                  // |gap| < CALIBRATION_BAND agrees
export function scoreText(n: number): string;                   // 7 -> "7", 7.5 -> "7.50"
export const SCORE_DOMAIN: readonly [number, number];           // [0.5, 10.5]
export const SCORE_TICKS: readonly number[];                    // 1 to 10
export const SCATTER_JITTER = 0.35;                             // along y = x (jitterAlong="diagonal"); y − x moves by at most a fifth of it
export function scatterPoints(pairs: readonly PairStat[]): ScatterPoint[];     // narrowest gap first; the label adds "N pairs on these scores" when N > 1
export function sharedScores(pairs: readonly PairStat[]): Map<string, number>; // pairId -> pairs on the same two scores
export function scatterTable(pairs: readonly PairStat[], scopeLabel: string): ChartTable;  // widest gap first
export const GAP_BIN_LIMIT = 5;                                 // R-24
export interface GapBin {center: number; side: GapSide; pairs: number; votes: number}
export function gapBinCenter(gap: number): number;
export function gapBins(pairs: readonly PairStat[]): GapBin[];  // always 11, from −5 to +5
export function binLabel(center: number): string;               // "≤−5", "−3", "0", "+3", "≥+5"
export function binRange(center: number): string;               // "−3.5 to −2.5", "within ±0.5", "−4.5 or lower"
export function gapShares(bins: readonly GapBin[]): Record<GapSide, number>;
export function sharePercent(fraction: number): string;         // 1 / 3 -> "33%", 1 / 400 -> "<1%", 0 -> "0%"
export function histogramTable(bins: readonly GapBin[], scopeLabel: string): ChartTable;  // every bin, empty ones included
export interface WeeklyGap {week: Day; meanGap: number | null; scoreVotes: number}
export function weeklyGaps(votes: readonly VoteLogRow[], pairs: readonly PairStat[]): WeeklyGap[]; // every Monday from the log's first vote to its last
export function gapDomain(weeks: readonly WeeklyGap[]): [number, number];                // symmetric, at least ±1, half-point steps
export function weeklyTable(weeks: readonly WeeklyGap[], scopeLabel: string): ChartTable; // every week, quiet ones included

// chartFixtures.ts (tests and stories only)
export function pairOf(a: string, b: string, engineScore: number, communityScore: number, scoreVotes?: number, rules?: string[]): PairStat; // "Card <a>" × "Card <b>"
export const SIX_PAIRS: readonly PairStat[];
export function seeded(seed: number): () => number;                                     // mulberry32, 0 to 1
export function seededPairs(count: number, seed?: number, rules?: string[]): PairStat[];
export function seededVotes(pairs: readonly PairStat[], weeks: number, lastWeek: Day, seed?: number, quietWeek?: number | null): VoteLogRow[];
export const ALL_PAIRS: readonly PairStat[];            // 400 pairs
export const ALL_PAIRS_VOTES: readonly VoteLogRow[];    // their 16 weeks of votes
export const ONE_RULE: readonly PairStat[];             // 60 pairs
export const ONE_RULE_VOTES: readonly VoteLogRow[];     // 16 weeks, the eleventh quiet
```

- [ ] **Step 1: Check what this task builds on**

R2-1 and R2-4a come first. Run:
```bash
grep -n "export function pairId" src/tools/analytics/calibration/calibrationModel.ts
grep -nE "export (interface ScatterPoint|type \{[^}]*ScatterPoint[^}]*\})" src/charts/ScatterChart.tsx
```
Expected:
- the first prints one line;
- the second prints exactly one line: the `export type {ScatterPoint} from './scatter';` re-export (R2-4a as re-based), or an `export interface ScatterPoint` line.

If either prints nothing, stop: R2-1 or R2-4a hasn't landed.

`calibrationModel.ts` imports the engine (`getRuleById`), so on a fresh checkout, or after a pin bump, run `pnpm build:engine` once first.

- [ ] **Step 2: Write the fixtures**

Create `src/tools/analytics/calibration/chartFixtures.ts`:
```ts
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

/**
 * One score vote per pair vote, spread over the `weeks` weeks that end with the
 * Monday `lastWeek`, on seeded days, at noon UTC in Supabase's microsecond
 * `+00:00` form. Each scores its pair's community score, rounded. The week at
 * index `quietWeek`, if given, gets none.
 */
export function seededVotes(
  pairs: readonly PairStat[],
  weeks: number,
  lastWeek: Day,
  seed = 1,
  quietWeek: number | null = null,
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
export const ALL_PAIRS_VOTES: readonly VoteLogRow[] = seededVotes(ALL_PAIRS, 16, '2026-09-28');
/** One rule's scope: 60 pairs, and a log with a quiet week (the eleventh of 16). */
export const ONE_RULE: readonly PairStat[] = seededPairs(60, 7);
export const ONE_RULE_VOTES: readonly VoteLogRow[] = seededVotes(ONE_RULE, 16, '2026-09-28', 7, 10);
```

- [ ] **Step 3: Write the failing tests**

Create `src/tools/analytics/calibration/__tests__/chartData.test.ts`:
```ts
import {describe, expect, it} from 'vitest';
import {ADMIN_COLORS} from '../../../../theme/adminTheme';
import type {PairStat} from '../../voteAnalyticsTypes';
import type {VoteLogRow} from '../../voteLogTypes';
import {
  GAP_BIN_LIMIT,
  GAP_SERIES,
  SCATTER_JITTER,
  SCORE_DOMAIN,
  SCORE_TICKS,
  binLabel,
  binRange,
  gapBinCenter,
  gapBins,
  gapDomain,
  gapShares,
  gapSide,
  histogramTable,
  scatterPoints,
  scatterTable,
  scoreText,
  sharePercent,
  sharedScores,
  sideColor,
  weeklyGaps,
  weeklyTable,
  type WeeklyGap,
} from '../chartData';
import {ALL_PAIRS, ONE_RULE, ONE_RULE_VOTES, SIX_PAIRS, pairOf, seededPairs} from '../chartFixtures';

/** A vote-log row on (a, b) at `ts`. weeklyGaps reads only a, b, score and ts. */
function vote(a: string, b: string, ts: string, score: number | null): VoteLogRow {
  return {
    a,
    b,
    aName: `Card ${a}`,
    bName: `Card ${b}`,
    score,
    accuracy: null,
    isReal: null,
    wouldPlay: null,
    difficulty: null,
    whoCarries: null,
    ts,
    voter: 1,
  };
}

/** A pair with exactly this gap, no float detour through community − engine. */
function withGap(gap: number): PairStat {
  return {...pairOf('1', '2', 5, 5), gap};
}

/** Noon UTC on `day`, in Supabase's microsecond +00:00 form. */
const at = (day: string) => `${day}T12:00:00.000000+00:00`;

describe('GAP_SERIES, sideColor and gapSide', () => {
  it('splits by side in axis order, in the score-band colours, with true minus signs', () => {
    expect(GAP_SERIES).toEqual([
      {id: 'over', label: 'Engine higher (gap ≤ −0.5)', color: ADMIN_COLORS.over},
      {id: 'agree', label: 'Within ±0.5', color: ADMIN_COLORS.barNeutral},
      {id: 'under', label: 'Community higher (gap ≥ +0.5)', color: ADMIN_COLORS.under},
    ]);
    expect(sideColor('agree')).toBe(ADMIN_COLORS.barNeutral);
    expect(sideColor('over')).toBe(ADMIN_COLORS.over);
  });

  it('agrees inside the calibration band, and leans from ±0.5', () => {
    expect([-0.49, 0, 0.49].map(gapSide)).toEqual(['agree', 'agree', 'agree']);
    expect(gapSide(-0.5)).toBe('over');
    expect(gapSide(0.5)).toBe('under');
  });
});

describe('gapBinCenter', () => {
  it('rounds halves away from zero, and keeps just-short-of-half in', () => {
    expect([0.5, -0.5, 2.5, -2.49].map(gapBinCenter)).toEqual([1, -1, 3, -2]);
  });

  it('folds everything beyond ±GAP_BIN_LIMIT into the end bins', () => {
    expect(GAP_BIN_LIMIT).toBe(5);
    expect(gapBinCenter(-8)).toBe(-5);
    expect(gapBinCenter(7.2)).toBe(5);
  });

  it('never returns −0', () => {
    expect(Object.is(gapBinCenter(-0.2), 0)).toBe(true);
  });

  it('makes the centre bin exactly the agreement band, and gives every bin its gap’s side', () => {
    for (let i = -600; i <= 600; i++) {
      const gap = i / 100;
      expect(gapBinCenter(gap) === 0, `gap ${gap}`).toBe(gapSide(gap) === 'agree');
      const [bin] = gapBins([withGap(gap)]).filter((b) => b.pairs === 1);
      expect(bin.side, `gap ${gap}`).toBe(gapSide(gap));
    }
  });
});

describe('gapBins', () => {
  it('always gives the eleven bins from −5 to +5, empty ones included', () => {
    const bins = gapBins([]);
    expect(bins.map((b) => b.center)).toEqual([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]);
    expect(bins.every((b) => b.pairs === 0 && b.votes === 0)).toBe(true);
    expect(bins.map((b) => b.side)).toEqual([...Array(5).fill('over'), 'agree', ...Array(5).fill('under')]);
  });

  it('counts pairs and sums their votes per bin, in any order', () => {
    // SIX_PAIRS' gaps: −3, 0, 0 (2 votes), +6, −0.5 (2 votes) and −8.
    const filled = (pairs: readonly PairStat[]) =>
      gapBins(pairs)
        .filter((b) => b.pairs > 0)
        .map((b) => [b.center, b.pairs, b.votes]);
    expect(filled(SIX_PAIRS)).toEqual([
      [-5, 1, 1],
      [-3, 1, 1],
      [-1, 1, 2],
      [0, 2, 3],
      [5, 1, 1],
    ]);
    expect(filled([...SIX_PAIRS].reverse())).toEqual(filled(SIX_PAIRS));
  });
});

describe('binLabel and binRange', () => {
  it('label the end bins as open and the rest by their centre', () => {
    expect([-5, -3, 0, 3, 5].map(binLabel)).toEqual(['≤−5', '−3', '0', '+3', '≥+5']);
  });

  it('say which gaps each bin holds', () => {
    expect([-5, -3, 0, 3, 5].map(binRange)).toEqual([
      '−4.5 or lower',
      '−3.5 to −2.5',
      'within ±0.5',
      '+2.5 to +3.5',
      '+4.5 or higher',
    ]);
  });

  it('print every minus as U+2212', () => {
    const text = gapBins([])
      .flatMap((b) => [binLabel(b.center), binRange(b.center)])
      .join(' ');
    expect(text).toContain('−');
    expect(text).not.toContain('-');
  });
});

describe('gapShares and sharePercent', () => {
  it('give each side’s share of the pairs', () => {
    const shares = gapShares(gapBins(SIX_PAIRS));
    expect(shares.over).toBeCloseTo(1 / 2);
    expect(shares.agree).toBeCloseTo(1 / 3);
    expect(shares.under).toBeCloseTo(1 / 6);
    expect([shares.agree, shares.over, shares.under].map(sharePercent)).toEqual(['33%', '50%', '17%']);
  });

  it('give 0 for every side with no pairs, and never print 0% for a side with some', () => {
    expect(gapShares(gapBins([]))).toEqual({over: 0, agree: 0, under: 0});
    expect(sharePercent(0)).toBe('0%');
    expect(sharePercent(1 / 400)).toBe('<1%');
  });
});

describe('scatterPoints, sharedScores and scoreText', () => {
  it('gives one point per pair: engine across, community up, coloured by side, narrowest gap first', () => {
    const points = scatterPoints(SIX_PAIRS);
    // pairId sorts as strings, so the 9 × 10 pair keys as '10|9'.
    expect(points.map((p) => p.key)).toEqual(['3|4', '5|6', '10|9', '1|2', '7|8', '11|12']);
    expect(points.find((p) => p.key === '1|2')).toMatchObject({x: 7, y: 4, series: 'over'});
    expect(points.find((p) => p.key === '7|8')).toMatchObject({x: 3, y: 9, series: 'under'});
    expect(points.find((p) => p.key === '3|4')).toMatchObject({x: 7, y: 7, series: 'agree'});
  });

  it('labels each point as the slider reads it, averages to two places', () => {
    const label = (key: string) => scatterPoints(SIX_PAIRS).find((p) => p.key === key)?.label;
    expect(label('1|2')).toBe('Card 1 × Card 2: engine 7, community 4, gap −3.00, 1 vote');
    expect(label('10|9')).toBe('Card 9 × Card 10: engine 8, community 7.50, gap −0.50, 2 votes');
  });

  it('says how many pairs share a dot’s exact scores, as the tooltip does', () => {
    expect(scatterPoints(SIX_PAIRS).find((p) => p.key === '3|4')?.label).toBe(
      'Card 3 × Card 4: engine 7, community 7, gap 0.00, 1 vote, 2 pairs on these scores',
    );
    const sharing = sharedScores(SIX_PAIRS);
    expect([sharing.get('3|4'), sharing.get('5|6'), sharing.get('1|2')]).toEqual([2, 2, 1]);
  });

  it('prints whole scores bare and averages to two places', () => {
    expect([7, 7.5, 4.33].map(scoreText)).toEqual(['7', '7.50', '4.33']);
  });
});

describe('the chart tables', () => {
  it('scatterTable lists every pair widest gap first with exact values, whatever order the scope comes in', () => {
    const table = scatterTable([...SIX_PAIRS].reverse(), 'Ramp');
    expect(table.caption).toBe('Every plotted pair, Ramp, widest gap first');
    expect(table.columns).toEqual(['Pair', 'Engine', 'Community', 'Gap', 'Votes']);
    expect(table.rows).toHaveLength(6);
    expect(table.rows[0]).toEqual(['Card 11 × Card 12', '9', '1', '−8.00', '1']);
    expect(table.rows[3]).toEqual(['Card 9 × Card 10', '8', '7.50', '−0.50', '2']);
  });

  it('histogramTable has a row for every bin, the rule on half points in its caption', () => {
    const table = histogramTable(gapBins(SIX_PAIRS), 'Ramp');
    expect(table.caption).toBe(
      'Pairs by gap (community − engine), Ramp. A gap on a half point counts in the bin further from zero.',
    );
    expect(table.columns).toEqual(['Gap', 'Pairs', 'Votes', 'Share of pairs']);
    expect(table.rows.map((row) => row[0])).toEqual([
      '−4.5 or lower',
      '−4.5 to −3.5',
      '−3.5 to −2.5',
      '−2.5 to −1.5',
      '−1.5 to −0.5',
      'within ±0.5',
      '+0.5 to +1.5',
      '+1.5 to +2.5',
      '+2.5 to +3.5',
      '+3.5 to +4.5',
      '+4.5 or higher',
    ]);
    expect(table.rows[2]).toEqual(['−3.5 to −2.5', '1', '1', '17%']);
    expect(table.rows[5]).toEqual(['within ±0.5', '2', '3', '33%']);
    expect(histogramTable(gapBins([]), 'All pairs').rows.every((row) => row[3] === '0%')).toBe(true);
  });

  it('weeklyTable has a row per week, a quiet one with "—"', () => {
    const weeks: WeeklyGap[] = [
      {week: '2026-09-14', meanGap: -0.5, scoreVotes: 2},
      {week: '2026-09-21', meanGap: null, scoreVotes: 0},
      {week: '2026-09-28', meanGap: -1, scoreVotes: 3},
    ];
    const table = weeklyTable(weeks, 'Ramp');
    expect(table.caption).toBe('Weekly mean gap and score votes, Ramp. Weeks start on Monday (UTC).');
    expect(table.columns).toEqual(['Week of', 'Mean gap', 'Score votes']);
    expect(table.rows).toEqual([
      ['Sep 14', '−0.50', '2'],
      ['Sep 21', '—', '0'],
      ['Sep 28', '−1.00', '3'],
    ]);
  });
});

describe('weeklyGaps', () => {
  const PAIR = pairOf('1', '2', 7, 6);

  it("takes a week's plain mean of its score votes' gaps, as bucketWeekly does", () => {
    const votes = [
      vote('1', '2', at('2026-09-14'), 4),
      vote('1', '2', at('2026-09-15'), 8),
      vote('1', '2', at('2026-09-16'), 6),
    ];
    // Gaps −3, +1 and −1.
    expect(weeklyGaps(votes, [PAIR])).toEqual([{week: '2026-09-14', meanGap: -1, scoreVotes: 3}]);
  });

  it('leaves unscored votes and votes outside the scope out of the mean, but lets them set the span', () => {
    const votes = [
      vote('1', '2', at('2026-09-07'), null),
      vote('1', '2', at('2026-09-14'), 9),
      vote('3', '4', at('2026-09-21'), 2),
    ];
    expect(weeklyGaps(votes, [PAIR])).toEqual([
      {week: '2026-09-07', meanGap: null, scoreVotes: 0},
      {week: '2026-09-14', meanGap: 2, scoreVotes: 1},
      {week: '2026-09-21', meanGap: null, scoreVotes: 0},
    ]);
  });

  it('joins a vote stored the other way round to its pair', () => {
    expect(weeklyGaps([vote('2', '1', at('2026-09-14'), 9)], [PAIR])).toEqual([
      {week: '2026-09-14', meanGap: 2, scoreVotes: 1},
    ]);
  });

  it("buckets Supabase's microsecond +00:00 timestamps by their UTC day", () => {
    const votes = [
      vote('1', '2', '2026-09-27T23:59:59.999999+00:00', 7), // a Sunday: the week of Monday Sep 21
      vote('1', '2', '2026-09-28T00:00:00.000001+00:00', 9), // the next Monday
    ];
    expect(weeklyGaps(votes, [PAIR]).map((w) => [w.week, w.meanGap])).toEqual([
      ['2026-09-21', 0],
      ['2026-09-28', 2],
    ]);
  });

  it('keeps a quiet week inside the span, and the same weeks for every scope', () => {
    const other = pairOf('3', '4', 5, 5);
    const votes = [
      vote('1', '2', at('2026-09-14'), 7),
      vote('3', '4', at('2026-09-14'), 5),
      vote('3', '4', at('2026-09-28'), 6),
    ];
    const all = weeklyGaps(votes, [PAIR, other]);
    expect(all[1]).toEqual({week: '2026-09-21', meanGap: null, scoreVotes: 0});
    expect(weeklyGaps(votes, [PAIR]).map((w) => w.week)).toEqual(all.map((w) => w.week));
  });

  it('gives every week of the log with no mean for an empty scope (a tuning-only row)', () => {
    const votes = [vote('1', '2', at('2026-09-14'), 7), vote('1', '2', at('2026-09-28'), 8)];
    expect(weeklyGaps(votes, [])).toEqual([
      {week: '2026-09-14', meanGap: null, scoreVotes: 0},
      {week: '2026-09-21', meanGap: null, scoreVotes: 0},
      {week: '2026-09-28', meanGap: null, scoreVotes: 0},
    ]);
  });

  it('reads the log in any order: buildVoteLog writes it newest first', () => {
    const oldestFirst = [
      vote('1', '2', at('2026-09-14'), 4),
      vote('1', '2', at('2026-09-21'), 9),
      vote('1', '2', at('2026-09-22'), 8),
    ];
    expect(weeklyGaps([...oldestFirst].reverse(), [PAIR])).toEqual(weeklyGaps(oldestFirst, [PAIR]));
  });

  it('gives no weeks for an empty log', () => {
    expect(weeklyGaps([], [PAIR])).toEqual([]);
  });
});

describe('gapDomain', () => {
  const weeks = (...gaps: Array<number | null>): WeeklyGap[] =>
    gaps.map((meanGap, i) => ({week: `2026-09-0${i + 1}`, meanGap, scoreVotes: meanGap == null ? 0 : 1}));

  it('is centred on zero and never narrower than ±1', () => {
    expect(gapDomain([])).toEqual([-1, 1]);
    expect(gapDomain(weeks(0.2, -0.4))).toEqual([-1, 1]);
  });

  it('widens in half-point steps to hold the widest weekly mean, either side', () => {
    expect(gapDomain(weeks(1.3))).toEqual([-1.5, 1.5]);
    expect(gapDomain(weeks(0.5, -2.2))).toEqual([-2.5, 2.5]);
  });

  it('ignores quiet weeks', () => {
    expect(gapDomain(weeks(null, -0.7, null))).toEqual([-1, 1]);
  });
});

describe('SCORE_DOMAIN and SCORE_TICKS', () => {
  it('hold every jittered dot: an axis moves by at most 1.1 × SCATTER_JITTER', () => {
    expect(SCORE_TICKS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(1 - 1.1 * SCATTER_JITTER).toBeGreaterThanOrEqual(SCORE_DOMAIN[0]);
    expect(10 + 1.1 * SCATTER_JITTER).toBeLessThanOrEqual(SCORE_DOMAIN[1]);
  });
});

describe('the fixtures', () => {
  it('hold still, at real density, inside the score range', () => {
    expect(seededPairs(400)).toEqual(seededPairs(400));
    expect(ALL_PAIRS).toHaveLength(400);
    expect(ALL_PAIRS.filter((p) => p.scoreVotes > 1)).toHaveLength(40);
    expect(ALL_PAIRS.some((p) => !Number.isInteger(p.communityScore))).toBe(true);
    expect(ALL_PAIRS.every((p) => p.engineScore >= 1 && p.engineScore <= 10)).toBe(true);
    expect(ALL_PAIRS.every((p) => p.communityScore >= 1 && p.communityScore <= 10)).toBe(true);
  });

  it('give one rule 16 weeks of votes with exactly one quiet week, the eleventh', () => {
    const weeks = weeklyGaps(ONE_RULE_VOTES, ONE_RULE);
    expect(ONE_RULE).toHaveLength(60);
    expect(weeks).toHaveLength(16);
    expect(weeks.filter((w) => w.scoreVotes === 0).map((w) => weeks.indexOf(w))).toEqual([10]);
    expect(weeks.at(-1)?.week).toBe('2026-09-28');
  });
});
```

Create `scripts/lib/__tests__/weeklyGapsParity.test.mjs`. Like its neighbours, it runs in node.
```js
// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {weeklyGaps} from '../../../src/tools/analytics/calibration/chartData.ts';
import {buildAnalytics, buildVoteLog} from '../voteAnalytics.mjs';

/*
 * Admin's weeklyGaps against the precompute's bucketWeekly and rollUpByRule.
 * Both sides run on the same raw votes, through the transforms the Deploy runs
 * (buildAnalytics, buildVoteLog), so the Weekly gap chart can't drift from the
 * artifact it sits beside: on "All pairs" it shows global.weekly's mean gap,
 * and a rule's weeks add up to that rule's mean gap.
 */

// The engine's pairs as loadEngineArtifacts keys them (pairKey: ids sorted, ':').
const ENGINE_PAIRS = new Map([
  ['1:2', {engineScore: 7, connections: [{ruleId: 'ramp'}]}],
  ['3:4', {engineScore: 5, connections: [{ruleId: 'ramp'}, {ruleId: 'shift-targets'}]}],
  ['5:6', {engineScore: 8, connections: [{ruleId: 'shift-targets'}]}],
]);
const ALL_RULES = [
  {ruleId: 'ramp', ruleName: 'Ramp', category: 'playstyle'},
  {ruleId: 'shift-targets', ruleName: 'Shift Targets', category: 'direct'},
];
const NAMES = new Map(['1', '2', '3', '4', '5', '6', '7', '8'].map((id) => [id, `Card ${id}`]));

/** A raw vote as fetchAllRows reads it: Supabase's microsecond +00:00 timestamp, card ids in either order. */
function raw(createdAt, a, b, score) {
  return {
    created_at: createdAt,
    ip_hash: `voter-${a}-${b}`,
    card_a_id: a,
    card_b_id: b,
    score,
    accuracy: null,
    is_real: null,
    would_play: null,
    difficulty: null,
    who_carries: null,
  };
}

// Sep 14 (gaps −3, +3, +1), Sep 21 (one quick vote), Sep 28 (−2, −2), no vote
// at all in the week of Oct 5, and Oct 12 (a pair the engine is silent on).
const RAW_VOTES = [
  raw('2026-09-14T10:00:00.123456+00:00', '2', '1', 4),
  raw('2026-09-15T10:00:00.123456+00:00', '1', '2', 10),
  raw('2026-09-16T10:00:00.123456+00:00', '3', '4', 6),
  raw('2026-09-22T10:00:00.123456+00:00', '1', '2', null),
  raw('2026-09-28T10:00:00.123456+00:00', '5', '6', 6),
  raw('2026-09-29T10:00:00.123456+00:00', '4', '3', 3),
  raw('2026-10-12T10:00:00.123456+00:00', '7', '8', 9),
];
// pair_scores for those votes: the scored votes' mean and count, ids in the view's own order.
const SCORE_ROWS = [
  {card_a_id: '2', card_b_id: '1', avg_score: 7, score_votes: 2, total_votes: 3, accuracy_sentiment: null},
  {card_a_id: '3', card_b_id: '4', avg_score: 4.5, score_votes: 2, total_votes: 2, accuracy_sentiment: null},
  {card_a_id: '5', card_b_id: '6', avg_score: 6, score_votes: 1, total_votes: 1, accuracy_sentiment: null},
  {card_a_id: '7', card_b_id: '8', avg_score: 9, score_votes: 1, total_votes: 1, accuracy_sentiment: null},
];

const analytics = buildAnalytics({
  scoreRows: SCORE_ROWS,
  enginePairs: ENGINE_PAIRS,
  allRules: ALL_RULES,
  names: NAMES,
  ruleTotalPairs: {ramp: 2, 'shift-targets': 2},
  rawVotes: RAW_VOTES,
});
const log = buildVoteLog(RAW_VOTES, NAMES);

describe('weeklyGaps against the precompute', () => {
  it("matches global.weekly's mean gap week for week on every pair, and fills the weeks it skips", () => {
    const weeks = weeklyGaps(log.votes, analytics.pairs);
    // global.weekly lists only the weeks that have a vote: Oct 5 has none.
    expect(analytics.global.weekly.map((w) => w.week)).toEqual([
      '2026-09-14',
      '2026-09-21',
      '2026-09-28',
      '2026-10-12',
    ]);
    for (const point of analytics.global.weekly) {
      const week = weeks.find((w) => w.week === point.week);
      if (point.meanGap == null) expect(week?.meanGap, point.week).toBeNull();
      else expect(week?.meanGap, point.week).toBeCloseTo(point.meanGap, 10);
    }
    expect(weeks.map((w) => [w.week, w.scoreVotes])).toEqual([
      ['2026-09-14', 3],
      ['2026-09-21', 0],
      ['2026-09-28', 2],
      ['2026-10-05', 0],
      ['2026-10-12', 0],
    ]);
  });

  it("adds up, over a rule's pairs, to that rule's vote-weighted mean gap and score votes", () => {
    for (const rule of analytics.rules) {
      // The rule's scope, as pairsInScope (R2-1) picks it.
      const scope = analytics.pairs.filter((p) => p.rules.includes(rule.ruleId));
      const weeks = weeklyGaps(log.votes, scope);
      const votes = weeks.reduce((n, w) => n + w.scoreVotes, 0);
      const weighted = weeks.reduce((sum, w) => sum + (w.meanGap ?? 0) * w.scoreVotes, 0) / votes;
      expect(votes, rule.ruleId).toBe(rule.scoreVotes);
      expect(weighted, rule.ruleId).toBeCloseTo(rule.meanGap, 10);
    }
  });
});
```

- [ ] **Step 4: Run the tests and see them fail**

Run: `pnpm vitest run src/tools/analytics/calibration/__tests__/chartData.test.ts scripts/lib/__tests__/weeklyGapsParity.test.mjs`

Expected: FAIL, with `Test Files  2 failed (2)` and `Tests  no tests`. Both files fail on the missing module, each in its environment's words:
- `Failed to resolve import "../chartData" from "src/tools/analytics/calibration/__tests__/chartData.test.ts". Does the file exist?`
- `Cannot find module '../../../src/tools/analytics/calibration/chartData.ts' imported from <repo>/scripts/lib/__tests__/weeklyGapsParity.test.mjs` (the node environment's message).

- [ ] **Step 5: Write `chartData.ts`**

Create `src/tools/analytics/calibration/chartData.ts`:
```ts
import type {ChartTable} from '../../../charts/ChartFrame';
import {eachDay, weekStart, type Day} from '../../../charts/scale';
import type {ScatterPoint} from '../../../charts/ScatterChart';
import type {SeriesDef} from '../../../charts/series';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {fmtDay, fmtGap, fmtInt, fmtScore} from '../../../ui/format';
import {countOf} from '../activity/activityModel';
import {CALIBRATION_BAND} from '../verdict';
import type {PairStat} from '../voteAnalyticsTypes';
import type {VoteLogRow} from '../voteLogTypes';
import {pairId} from './calibrationModel';

/*
 * The data behind /calibration's three charts: the scatter, the gap histogram
 * and the weekly gap trend (R-13, R-23, R-24). Pure functions over the scope
 * the selected rule gives (pairsInScope, R2-1) and the vote log; the components
 * (R2-4c) only draw what these return. Every function takes the scope in any
 * order: pairsInScope sorts widest gap first, and nothing here relies on it.
 */

/** Where a gap sits against the agreement band: the engine scores higher, they agree, or the community scores higher. */
export type GapSide = 'over' | 'agree' | 'under';

const BAND = String(CALIBRATION_BAND);

/** A signed half-point number: "−3.5", "+2.5", "0". The minus comes from fmtScore (U+2212). */
function signed(n: number): string {
  return (n > 0 ? '+' : '') + fmtScore(n, Number.isInteger(n) ? 0 : 1);
}

/**
 * The three sides as chart series, in axis order. The scatter and the
 * histogram share them, so a side keeps one colour. They are the score-band
 * trio adminTheme.test.ts already holds to 3:1 on a card (WCAG 1.4.11).
 */
export const GAP_SERIES: readonly SeriesDef[] = [
  {id: 'over', label: `Engine higher (gap ≤ ${signed(-CALIBRATION_BAND)})`, color: ADMIN_COLORS.over},
  {id: 'agree', label: `Within ±${BAND}`, color: ADMIN_COLORS.barNeutral},
  {id: 'under', label: `Community higher (gap ≥ ${signed(CALIBRATION_BAND)})`, color: ADMIN_COLORS.under},
];

/** A side's mark colour, for the line key in a tooltip row. */
export function sideColor(side: GapSide): string {
  return GAP_SERIES.find((s) => s.id === side)?.color ?? ADMIN_COLORS.barNeutral;
}

/** The band verdictFor reads a mean gap by, applied to one pair: |gap| < CALIBRATION_BAND agrees. */
export function gapSide(gap: number): GapSide {
  if (Math.abs(gap) < CALIBRATION_BAND) return 'agree';
  return gap < 0 ? 'over' : 'under';
}

/** A score as the charts print it: whole numbers bare ("7"), averages to two places ("4.33"). */
export function scoreText(n: number): string {
  return fmtScore(n, Number.isInteger(n) ? 0 : 2);
}

/** Both axes run 1 to 10, with half a point of room so an edge dot's jitter stays inside. */
export const SCORE_DOMAIN: readonly [number, number] = [0.5, 10.5];
export const SCORE_TICKS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
/**
 * Engine scores are whole numbers and most pairs have one vote, so most pairs
 * sit on a whole-number spot. The scatter slides each dot along y = x by up to
 * this much (jitterAlong="diagonal", R-23), and across it by a fifth of that,
 * so a stack spreads into a short dash and y − x, the gap the chart is read
 * for, moves by at most SCATTER_JITTER / 5 (0.07). Each axis moves by at most
 * 1.1 × SCATTER_JITTER (0.385), inside SCORE_DOMAIN's half point of room.
 */
export const SCATTER_JITTER = 0.35;

/**
 * One point per pair: engine score across, community score up. Narrowest gap
 * first, so the widest draw on top (R-23). The label is the slider's value
 * text, so it carries what the tooltip adds: how many pairs share the dot's
 * exact scores.
 */
export function scatterPoints(pairs: readonly PairStat[]): ScatterPoint[] {
  const sharing = sharedScores(pairs);
  return [...pairs]
    .sort((p, q) => Math.abs(p.gap) - Math.abs(q.gap))
    .map((p) => {
      const key = pairId(p.a, p.b);
      const shared = sharing.get(key) ?? 1;
      return {
        key,
        x: p.engineScore,
        y: p.communityScore,
        series: gapSide(p.gap),
        label:
          `${p.aName} × ${p.bName}: engine ${scoreText(p.engineScore)}, ` +
          `community ${scoreText(p.communityScore)}, gap ${fmtGap(p.gap)}, ${countOf(p.scoreVotes, 'vote')}` +
          (shared > 1 ? `, ${countOf(shared, 'pair')} on these scores` : ''),
      };
    });
}

/** For each pair (by pairId), how many pairs in the list share its exact engine and community scores, itself included. */
export function sharedScores(pairs: readonly PairStat[]): Map<string, number> {
  const spot = (p: PairStat) => `${p.engineScore}|${p.communityScore}`;
  const perSpot = new Map<string, number>();
  for (const p of pairs) perSpot.set(spot(p), (perSpot.get(spot(p)) ?? 0) + 1);
  return new Map(pairs.map((p) => [pairId(p.a, p.b), perSpot.get(spot(p)) ?? 1]));
}

/** The scatter's table view: every plotted pair, widest gap first, with its exact scores. */
export function scatterTable(pairs: readonly PairStat[], scopeLabel: string): ChartTable {
  return {
    caption: `Every plotted pair, ${scopeLabel}, widest gap first`,
    columns: ['Pair', 'Engine', 'Community', 'Gap', 'Votes'],
    rows: [...pairs]
      .sort((p, q) => Math.abs(q.gap) - Math.abs(p.gap))
      .map((p) => [
        `${p.aName} × ${p.bName}`,
        scoreText(p.engineScore),
        scoreText(p.communityScore),
        fmtGap(p.gap),
        fmtInt(p.scoreVotes),
      ]),
  };
}

/**
 * The histogram's outer bins hold every gap beyond ±GAP_BIN_LIMIT (R-24). A
 * 1–10 scale allows gaps up to ±9; the owner chose ±5, and R2's real-data
 * check confirms it. Change it here only: the bins, labels and ranges follow.
 */
export const GAP_BIN_LIMIT = 5;

export interface GapBin {
  /** The whole-number gap at the bin's centre, −GAP_BIN_LIMIT to +GAP_BIN_LIMIT. */
  center: number;
  side: GapSide;
  pairs: number;
  votes: number;
}

/**
 * The bin a gap counts in: one point wide, centred on the nearest whole number
 * (R-24), halves away from zero, so the centre bin holds exactly the gaps
 * gapSide reads as agreeing (|gap| < 0.5).
 */
export function gapBinCenter(gap: number): number {
  const nearest = Math.sign(gap) * Math.floor(Math.abs(gap) + 0.5);
  // `+ 0` turns −0 into 0.
  return Math.max(-GAP_BIN_LIMIT, Math.min(GAP_BIN_LIMIT, nearest)) + 0;
}

/** Every bin from −GAP_BIN_LIMIT to +GAP_BIN_LIMIT, empty ones included, so the axis holds still between rules. */
export function gapBins(pairs: readonly PairStat[]): GapBin[] {
  const bins = Array.from({length: GAP_BIN_LIMIT * 2 + 1}, (_, i): GapBin => {
    const center = i - GAP_BIN_LIMIT;
    return {center, side: center === 0 ? 'agree' : center < 0 ? 'over' : 'under', pairs: 0, votes: 0};
  });
  for (const p of pairs) {
    const bin = bins[gapBinCenter(p.gap) + GAP_BIN_LIMIT];
    bin.pairs += 1;
    bin.votes += p.scoreVotes;
  }
  return bins;
}

/** A bin's axis label: "≤−5", "−3", "0", "+3", "≥+5". */
export function binLabel(center: number): string {
  if (center <= -GAP_BIN_LIMIT) return `≤${signed(-GAP_BIN_LIMIT)}`;
  if (center >= GAP_BIN_LIMIT) return `≥${signed(GAP_BIN_LIMIT)}`;
  return signed(center);
}

/** The gaps a bin holds, in words: "−3.5 to −2.5", "within ±0.5", "−4.5 or lower". */
export function binRange(center: number): string {
  if (center === 0) return `within ±${BAND}`;
  if (center <= -GAP_BIN_LIMIT) return `${signed(center + 0.5)} or lower`;
  if (center >= GAP_BIN_LIMIT) return `${signed(center - 0.5)} or higher`;
  return `${signed(center - 0.5)} to ${signed(center + 0.5)}`;
}

/** Each side's share of the pairs, from 0 to 1; all 0 when there are none. */
export function gapShares(bins: readonly GapBin[]): Record<GapSide, number> {
  const total = bins.reduce((n, bin) => n + bin.pairs, 0);
  const share = (side: GapSide) =>
    total === 0 ? 0 : bins.filter((bin) => bin.side === side).reduce((n, bin) => n + bin.pairs, 0) / total;
  return {over: share('over'), agree: share('agree'), under: share('under')};
}

/**
 * A share of the pairs as a whole percentage: 1 / 3 -> "33%". A share above
 * zero that would round to 0 prints "<1%", so a bin with pairs never reads
 * "0%". The histogram's subtitle, tooltip and table use it.
 */
export function sharePercent(fraction: number): string {
  if (fraction > 0 && fraction < 0.005) return '<1%';
  return `${Math.round(fraction * 100)}%`;
}

/** The histogram's table view: every bin, empty ones included, with its pairs, their votes and its share. */
export function histogramTable(bins: readonly GapBin[], scopeLabel: string): ChartTable {
  const total = bins.reduce((n, bin) => n + bin.pairs, 0);
  return {
    caption: `Pairs by gap (community − engine), ${scopeLabel}. A gap on a half point counts in the bin further from zero.`,
    columns: ['Gap', 'Pairs', 'Votes', 'Share of pairs'],
    rows: bins.map((bin) => [
      binRange(bin.center),
      fmtInt(bin.pairs),
      fmtInt(bin.votes),
      sharePercent(total === 0 ? 0 : bin.pairs / total),
    ]),
  };
}

export interface WeeklyGap {
  /** The week's UTC Monday, 'YYYY-MM-DD'. */
  week: Day;
  /** The mean gap of the week's score votes in scope; null for a week without one. */
  meanGap: number | null;
  /** The score votes behind that mean: what the area under the gap line draws (R-24). */
  scoreVotes: number;
}

/**
 * The weekly mean gap of the scope's score votes. A vote's gap is its score
 * minus its pair's engine score, and a week's mean weighs every vote equally:
 * the definition bucketWeekly (scripts/lib/voteAnalytics.mjs) uses for
 * global.weekly, so with every pair in scope this matches global.weekly's
 * meanGap week for week (weeklyGapsParity.test.mjs holds the two together).
 * Unlike global.weekly it can be scoped to a rule, it counts only the votes
 * behind each mean, and it keeps quiet weeks. The weeks run from the log's
 * first vote to its last whatever the scope, so every scope shares one axis
 * and a quiet week shows as a break in the line. An empty scope (a tuning-only
 * row) gives every week of the log, each with no mean.
 */
export function weeklyGaps(votes: readonly VoteLogRow[], pairs: readonly PairStat[]): WeeklyGap[] {
  const engineOf = new Map(pairs.map((p) => [pairId(p.a, p.b), p.engineScore]));
  const sums = new Map<Day, {total: number; n: number}>();
  let first: Day | null = null;
  let last: Day | null = null;
  for (const vote of votes) {
    // Supabase writes UTC (+00:00), so the first ten characters are the vote's UTC day, as activityModel reads it.
    const week = weekStart(vote.ts.slice(0, 10));
    if (first === null || week < first) first = week;
    if (last === null || week > last) last = week;
    const engine = engineOf.get(pairId(vote.a, vote.b));
    if (vote.score == null || engine === undefined) continue;
    const sum = sums.get(week) ?? {total: 0, n: 0};
    sums.set(week, {total: sum.total + (vote.score - engine), n: sum.n + 1});
  }
  if (first === null || last === null) return [];
  // Every Monday from the first week to the last, as activityModel's weeklyStacks walks them.
  return eachDay(first, last)
    .filter((_, i) => i % 7 === 0)
    .map((week) => {
      const sum = sums.get(week);
      return {week, meanGap: sum ? sum.total / sum.n : null, scoreVotes: sum?.n ?? 0};
    });
}

/**
 * The gap plot's y domain: centred on zero, holding every weekly mean, at
 * least ±1, in half-point steps. Symmetric, so its ticks are −edge, 0 and
 * +edge and never crowd on one side (R1-3b's deferred note on lopsided ticks).
 */
export function gapDomain(weeks: readonly WeeklyGap[]): [number, number] {
  const widest = weeks.reduce((max, w) => Math.max(max, Math.abs(w.meanGap ?? 0)), 0);
  const edge = Math.max(1, Math.ceil(widest * 2) / 2);
  return [-edge, edge];
}

/** The weekly trend's table view: every week of the span, quiet ones included, oldest first. */
export function weeklyTable(weeks: readonly WeeklyGap[], scopeLabel: string): ChartTable {
  return {
    caption: `Weekly mean gap and score votes, ${scopeLabel}. Weeks start on Monday (UTC).`,
    columns: ['Week of', 'Mean gap', 'Score votes'],
    rows: weeks.map((w) => [fmtDay(w.week), fmtGap(w.meanGap), fmtInt(w.scoreVotes)]),
  };
}
```

- [ ] **Step 6: Run the tests and see them pass**

Run: `pnpm vitest run src/tools/analytics/calibration/__tests__/chartData.test.ts scripts/lib/__tests__/weeklyGapsParity.test.mjs`

Expected: PASS, with `Test Files  2 passed (2)` and `Tests  36 passed (36)`: 34 in `chartData.test.ts` and 2 in the parity test. The first run is the slow one, because `chartData.test.ts` reaches the bridge through the theme.

- [ ] **Step 7: Lint and typecheck**

Run:
```bash
pnpm lint
pnpm typecheck
```
Expected: both exit 0.

- [ ] **Step 8: Commit, after the owner approves**

Use the Bash tool, with explicit paths. Never `git add -A`.
```bash
git add src/tools/analytics/calibration/chartData.ts src/tools/analytics/calibration/chartFixtures.ts src/tools/analytics/calibration/__tests__/chartData.test.ts scripts/lib/__tests__/weeklyGapsParity.test.mjs
USER_APPROVED=1 git commit -m "feat(calibration): derive the scatter, histogram and weekly gap data (#24)"
```

The phase's real-data check (header, "Before the PR") confirms ±5; it has the command.

---

#### For the assembler: move this block into the phase's real-data check (header, "Before the PR"), then delete it here (it is not part of R2-4b)

**The histogram's ±5 (R-24: "R2's real-data check confirms ±5").**
- With the deployment's artifacts in `public/admin-data/`, run this from the repo root. It prints two shares and never a count:
  ```bash
  node --input-type=module -e "import fs from 'node:fs'; const {pairs} = JSON.parse(fs.readFileSync('public/admin-data/vote-analytics.json', 'utf8')); const share = (keep) => ((100 * pairs.filter(keep).length) / pairs.length).toFixed(1) + '%'; console.log('in the end bins:', share((p) => Math.abs(p.gap) >= 4.5), '| folded in from ±5.5 out:', share((p) => Math.abs(p.gap) >= 5.5));"
  ```
- R-24 sets no threshold. Propose one to the owner: ±5 holds while the folded-in share is small, about 5% of pairs or less, because then the end bins mostly hold what their labels say. The owner decides; never change `GAP_BIN_LIMIT` without their word.
- A change is one constant: the bins, labels and ranges follow it. Then update every test that names ±5 or eleven bins:
  - `chartData.test.ts`: `expect(GAP_BIN_LIMIT).toBe(5)` and `gapBinCenter`'s other fold cases; `gapBins`' eleven centres and its `SIX_PAIRS` case's end bins (`[-5, 1, 1]` and `[5, 1, 1]`); the `binLabel` / `binRange` cases; `histogramTable`'s row heads.
  - R2-4c's `CalibrationCharts.test.tsx`: the 11-bar histogram assertions (the eleven x labels from "≤−5" to "≥+5", the end bins' marks `'-5'` and `'5'`, the 11 table row heads, and the labels kept at the two-up width).

<!-- Review notes 1-11 (2026-10-05): all verified and applied, none rejected. One knock-on of note 2: under `// @vitest-environment node` the parity file's Step 4 failure reads "Cannot find module '../../../src/tools/analytics/calibration/chartData.ts' imported from …", not "Failed to resolve import …", so Step 4's expected text now quotes each environment's message (checked in sandbox-r24b-fix). -->
