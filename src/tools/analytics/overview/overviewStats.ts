import {SPACING} from '../../../app-bridge';
import type {RuleStat, WeeklyPoint} from '../voteAnalyticsTypes';
import type {VoteLogRow} from '../voteLogTypes';
import type {VercelAnalytics} from '../vercelAnalyticsTypes';

/**
 * Rules backed by fewer score votes than this are left out of Rules to review:
 * a rule with a handful of votes can carry a huge gap that means nothing. The
 * same threshold as the calibration table's "low n" chip.
 */
export const MIN_RULE_VOTES = 10;
/** How many rules the Overview lists. */
const RULES_SHOWN = 4;
/** One week in ms. Weeks are UTC Mondays, so there is no daylight-saving drift. */
const WEEK_MS = 7 * 86_400_000;
/**
 * The Weekly activity window: the last 12 Monday weeks. The whole log (about
 * 26 weeks by Oct 2026) would crush the bars (R-9). The card's table view
 * holds all of them; its chart shows as many as fit (weeksThatFit).
 */
export const WEEKS_SHOWN = 12;
/**
 * A week's column never gets narrower than this. With SPACING.xs of air its slot
 * is 44px: "Sep 28" (36px at the micro size) plus BarChart's 8px label gap, so
 * every week prints its date and its gap. A narrower plot shows fewer weeks.
 */
const COLUMN_MIN = 40;

/**
 * The sum of every tracked event's all-time total, and how many event types it
 * covers. Null when there is nothing to sum: the artifact hasn't loaded, it is
 * the empty file written without the Vercel secrets (or after a failed API
 * call), or no events were tracked.
 */
export function trackedEventsTotal(v: VercelAnalytics | null): {total: number; eventTypes: number} | null {
  // No artifact yet, or the empty one: neither has Vercel data.
  if (!v?.hasVercelData || v.events.length === 0) return null;
  return {total: v.events.reduce((sum, e) => sum + e.total, 0), eventTypes: v.events.length};
}

/**
 * The rules most worth tuning next: widest |meanGap| first, either direction,
 * ties to the rule with more votes. Rules without a gap, or with fewer than
 * `minVotes` score votes, are left out (docs/plans/R-redesign.md, "Corrections
 * to the spec"). The input array is not reordered.
 */
export function rulesToReview(
  rules: RuleStat[],
  {limit = RULES_SHOWN, minVotes = MIN_RULE_VOTES}: {limit?: number; minVotes?: number} = {},
): RuleStat[] {
  return rules
    .filter((r): r is RuleStat & {meanGap: number} => r.meanGap != null && r.scoreVotes >= minVotes)
    .sort((x, y) => Math.abs(y.meanGap) - Math.abs(x.meanGap) || y.scoreVotes - x.scoreVotes)
    .slice(0, limit);
}

/**
 * The `n` newest votes, newest first, whatever order the log is in. Timestamps
 * are compared as instants, not strings. Unscored quick votes stay in.
 */
export function latestVotes(votes: VoteLogRow[], n: number): VoteLogRow[] {
  return [...votes].sort((x, y) => Date.parse(y.ts) - Date.parse(x.ts)).slice(0, n);
}

/**
 * The last `n` calendar weeks up to the newest weekly point, oldest first, so
 * the Overview's chart stays readable however long the log runs (R-9). The
 * precompute writes a point only for a week that has votes, so a quiet week
 * comes back as a zero-vote week with no gap instead of being skipped. The
 * window never starts before the first point.
 */
export function recentWeeks(weekly: WeeklyPoint[], n: number): WeeklyPoint[] {
  if (n <= 0 || weekly.length === 0) return [];
  const byWeek = new Map(weekly.map((w) => [w.week, w]));
  const first = Date.parse(weekly[0].week);
  const last = Date.parse(weekly[weekly.length - 1].week);
  const weeks: WeeklyPoint[] = [];
  for (let t = Math.max(first, last - (n - 1) * WEEK_MS); t <= last; t += WEEK_MS) {
    const week = new Date(t).toISOString().slice(0, 10);
    weeks.push(byWeek.get(week) ?? {week, votes: 0, meanGap: null});
  }
  return weeks;
}

/**
 * How many week slots fit `width` px of the Weekly activity chart's plot: a
 * COLUMN_MIN column plus SPACING.xs of air each (BarChart splits the plot into
 * equal slots), at least 1 and at most WEEKS_SHOWN. WeeklyCard passes its
 * frame's width less BarChart's y-axis gutter and its 8px right pad. A slot
 * holds the week's x label and the gap under it; BarChart (R1-3b) caps the bar
 * inside it at 24px. All WEEKS_SHOWN before the first measure, and in jsdom,
 * where the width stays 0.
 */
export function weeksThatFit(width: number): number {
  if (width <= 0) return WEEKS_SHOWN;
  return Math.max(1, Math.min(WEEKS_SHOWN, Math.floor(width / (COLUMN_MIN + SPACING.xs))));
}
