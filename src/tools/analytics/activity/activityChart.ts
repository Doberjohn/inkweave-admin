import type {BarDatum} from '../../../charts/BarChart';
import type {ChartTable} from '../../../charts/ChartFrame';
import type {TooltipContent} from '../../../charts/ChartTooltip';
import {addDays, weekStart, type Day} from '../../../charts/scale';
import type {SeriesDef} from '../../../charts/series';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {fmtDay, fmtInt, fmtWeekday} from '../../../ui/format';
import {BAND_LABELS, SCORE_BANDS, type ChartBucket, type DayStack, type ScoreBand} from './activityModel';

/**
 * Band fills. 5–6 takes barNeutral, which keeps 3:1 against the chart's card
 * (WCAG 1.4.11; src/theme/__tests__/adminTheme.test.ts holds all four). "No
 * score" is the kit's hatch in muted stripes, so it never reads as a score.
 */
const BAND_FILL: Record<ScoreBand, string> = {
  high: ADMIN_COLORS.under,
  mid: ADMIN_COLORS.barNeutral,
  low: ADMIN_COLORS.over,
  unscored: ADMIN_COLORS.muted,
};

/**
 * The tooltip's band rows, which the kit also reads out as each bar's name:
 * "5 scored 7+" is heard as words where "5 7+" isn't. The legend and the table
 * headers keep the short BAND_LABELS.
 */
const BAND_ROW_LABELS: Record<ScoreBand, string> = {
  high: 'scored 7+',
  mid: 'scored 5–6',
  low: 'scored ≤4',
  unscored: 'with no score',
};

/** The chart's four series, one per band, in filter and legend order. Each id is its ScoreBand. */
export const BAND_SERIES: readonly SeriesDef[] = SCORE_BANDS.map((band) =>
  band === 'unscored'
    ? {id: band, label: BAND_LABELS[band], color: BAND_FILL[band], pattern: 'hatch'}
    : {id: band, label: BAND_LABELS[band], color: BAND_FILL[band]},
);

/** Steps that keep a calendar rhythm: every bar, every other, every fourth, then whole weeks. */
const LABEL_STEPS = [1, 2, 4, 7, 14, 28, 56];
/** At most this many x labels, so "Sep 30"-wide labels never touch on a narrow plot. */
const MAX_X_LABELS = 7;

/** The UTC Sunday that closes the week from `monday`. */
function weekEnd(monday: Day): Day {
  return addDays(monday, 6);
}

/**
 * How a range from `startDay` to `endDay` clips the week from `monday`, in
 * words: "from Jun 10", "to Sep 30" or "Jun 10 to Jun 12"; "" when the week
 * runs whole. A missing end doesn't clip.
 */
function weekClip(monday: Day, startDay: Day = monday, endDay: Day = weekEnd(monday)): string {
  const from = startDay > monday ? fmtDay(startDay) : '';
  const to = endDay < weekEnd(monday) ? fmtDay(endDay) : '';
  if (from && to) return `${from} to ${to}`;
  if (from) return `from ${from}`;
  return to ? `to ${to}` : '';
}

/** "Votes per day", or "Votes per week" once the range runs past 90 days. */
export function chartTitle(bucket: ChartBucket): string {
  return bucket === 'day' ? 'Votes per day' : 'Votes per week';
}

/**
 * What a bar covers, in words: "Wed Sep 30", or "Week of Sep 28" from the
 * week's Monday. Given the range's days, a week the range clips says so
 * ("Week of Sep 28 (to Sep 30)", "Week of Jun 8 (from Jun 10)"), so a part
 * week at either end never reads as a whole one. Without them, the plain form.
 */
export function bucketTitle(key: Day, bucket: ChartBucket, startDay?: Day, endDay?: Day): string {
  if (bucket === 'day') return fmtWeekday(key);
  const title = `Week of ${fmtDay(key)}`;
  const clip = weekClip(key, startDay, endDay);
  return clip ? `${title} (${clip})` : title;
}

/** Which end weeks a weekly range clips, as a clause for the subtitle; "" when it runs Monday to Sunday. */
function partialWeeks(startDay: Day, endDay: Day): string {
  const first = weekStart(startDay) !== startDay;
  const last = weekEnd(weekStart(endDay)) !== endDay;
  if (first && last) return ', first and last weeks partial';
  if (first) return ', first week partial';
  if (last) return ', last week partial';
  return '';
}

/** The chart's subtitle: the range's days, how a weekly chart cuts them, and how to pick a bar. */
export function chartSubtitle(bucket: ChartBucket, startDay: Day, endDay: Day): string {
  const days = `${fmtDay(startDay)} – ${fmtDay(endDay)}`;
  const pick = `. Pick a ${bucket} to filter the log; pick it again to clear.`;
  if (bucket === 'day') return `${days}${pick}`;
  return `${days}, in weeks from Monday${partialWeeks(startDay, endDay)}${pick}`;
}

/** One bar per stack, keyed by its day (a week's by its Monday) and labelled "Sep 30" under the axis. */
export function barData(stacks: readonly DayStack[]): BarDatum[] {
  return stacks.map((stack) => ({
    key: stack.day,
    label: fmtDay(stack.day),
    values: {high: stack.high, mid: stack.mid, low: stack.low, unscored: stack.unscored},
  }));
}

/**
 * Each bar's tooltip, which the kit also reads out as the bar's name: what it
 * covers (a clipped end week says so), its votes, one row per band with that
 * band's line key, and its distinct voters. Values lead and labels follow;
 * only the keys wear the band colour. Every band shows, a zero included, so
 * the rows never move.
 */
export function tooltipFor(
  stacks: readonly DayStack[],
  bucket: ChartBucket,
  startDay: Day,
  endDay: Day,
): (d: BarDatum) => TooltipContent {
  const byKey = new Map(stacks.map((stack) => [stack.day, stack]));
  return (d) => {
    const stack = byKey.get(d.key);
    if (!stack) return {title: d.label, rows: []};
    return {
      title: bucketTitle(stack.day, bucket, startDay, endDay),
      rows: [
        {label: stack.total === 1 ? 'vote' : 'votes', value: fmtInt(stack.total)},
        ...SCORE_BANDS.map((band) => ({
          label: BAND_ROW_LABELS[band],
          value: fmtInt(stack[band]),
          color: BAND_FILL[band],
        })),
        {label: stack.voters === 1 ? 'voter' : 'voters', value: fmtInt(stack.voters)},
      ],
    };
  };
}

/** The chart's table view: a row per bar, oldest first, with every number the bars and tooltips carry. */
export function chartTable(stacks: readonly DayStack[], bucket: ChartBucket, startDay: Day, endDay: Day): ChartTable {
  return {
    caption: `${chartTitle(bucket)}, ${fmtDay(startDay)} – ${fmtDay(endDay)}`,
    columns: [bucket === 'day' ? 'Day' : 'Week', 'Votes', ...SCORE_BANDS.map((band) => BAND_LABELS[band]), 'Voters'],
    rows: stacks.map((stack) => [
      bucketTitle(stack.day, bucket, startDay, endDay),
      fmtInt(stack.total),
      ...SCORE_BANDS.map((band) => fmtInt(stack[band])),
      fmtInt(stack.voters),
    ]),
  };
}

/** The smallest step that prints at most MAX_X_LABELS x labels across `bars` bars. */
export function labelEvery(bars: number): number {
  return LABEL_STEPS.find((step) => Math.ceil(bars / step) <= MAX_X_LABELS) ?? Math.ceil(bars / MAX_X_LABELS);
}
