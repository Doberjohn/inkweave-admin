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
