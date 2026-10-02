import {eachDay, isDay} from '../../../charts/scale';
import type {BreakdownRow, ReportingWindow, TrendPoint, VercelEvent} from '../vercelAnalyticsTypes';

/** The value Vercel gives the row that folds a breakdown's tail beyond its query limit. */
export const OTHERS_VALUE = 'Others';

/**
 * What a breakdown row with a blank value shows: the events that sent the prop
 * empty or not at all. The precompute writes '' for them (rowValue in
 * scripts/lib/vercelAnalytics.mjs), and the real export has such rows.
 */
export const NOT_SET_LABEL = '(not set)';

/** Events busiest first. Returns a copy, and ties keep the artifact's order (sort is stable). */
export function sortEventsByTotal(events: VercelEvent[]): VercelEvent[] {
  return [...events].sort((a, b) => b.total - a.total);
}

/**
 * The trend with one point for every calendar day of the reporting window,
 * oldest first, and 0 for each day the trend lacks. The precompute keeps only
 * the rows Vercel's by=day query returns (buildEvent in
 * scripts/lib/vercelAnalytics.mjs), so idle days may be missing. Filling them
 * keeps the chart's time axis even, its table complete and the daily average
 * honest. A day outside the window widens the span instead of vanishing. With
 * no window, the span runs from the trend's first day to its last. A point with
 * no usable date (buildEvent writes '' for a row without one) can't be placed,
 * so it's skipped. The days come from the chart kit's eachDay (UTC, inclusive).
 */
export function fillTrendDays(trend: TrendPoint[], reportingWindow: ReportingWindow | null): TrendPoint[] {
  const counts = new Map(trend.map((point) => [point.date, point.count]));
  const bounds = reportingWindow ? [reportingWindow.since, reportingWindow.until] : [];
  const days = [...counts.keys(), ...bounds].filter(isDay).sort();
  if (days.length === 0) return [];
  return eachDay(days[0], days[days.length - 1]).map((date) => ({date, count: counts.get(date) ?? 0}));
}

/**
 * The trend card's three numbers. The daily average divides by the days it is
 * given: the page passes the trend filled to the whole window (fillTrendDays),
 * so idle days count. A tie for the peak goes to the later day, so a flat run
 * reads as its most recent day. An empty trend has no peak and averages 0.
 */
export function trendSummary(trend: TrendPoint[]): {inWindow: number; dailyAverage: number; peak: TrendPoint | null} {
  let inWindow = 0;
  let peak: TrendPoint | null = null;
  for (const point of trend) {
    inWindow += point.count;
    if (!peak || point.count > peak.count || (point.count === peak.count && point.date > peak.date)) peak = point;
  }
  return {inWindow, dailyAverage: trend.length === 0 ? 0 : inWindow / trend.length, peak};
}

/** One breakdown row ready to draw. */
export interface BreakdownShare {
  row: BreakdownRow;
  /** The row's text, title and key: its value, or NOT_SET_LABEL when the value is blank. */
  label: string;
  /** True for a blank value: the row reads NOT_SET_LABEL and has no ink or rarity to look up. */
  notSet: boolean;
  /** The row's share of the breakdown's total, as a whole percent. */
  pct: number;
  /** Bar length (0–1) against the breakdown's biggest row. */
  fraction: number;
  /** True for the "Others" row. */
  others: boolean;
}

/**
 * A breakdown's rows with their shares. Rows keep the artifact's order, which
 * the precompute sets (buildEvent in scripts/lib/vercelAnalytics.mjs): busiest
 * first, or by value for score breakdowns. "Others" goes last here too. Bars
 * scale to the biggest row wherever it sits, "Others" included.
 */
export function breakdownShares(rows: BreakdownRow[]): BreakdownShare[] {
  const sum = rows.reduce((total, row) => total + row.count, 0) || 1;
  const top = Math.max(1, ...rows.map((row) => row.count));
  const shares = rows.map((row) => {
    const notSet = row.value.trim() === '';
    return {
      row,
      label: notSet ? NOT_SET_LABEL : row.value,
      notSet,
      pct: Math.round((row.count / sum) * 100),
      fraction: row.count / top,
      others: row.value === OTHERS_VALUE,
    };
  });
  return [...shares.filter((share) => !share.others), ...shares.filter((share) => share.others)];
}
