import {SPACING} from '../app-bridge';
import {fmtInt} from '../ui/format';
import {LABEL_SIZE, labelWidth, labelX, wholeTicks, yAxis, type AxisTick} from './axis';
import {linear, niceCeiling} from './scale';
import {SURFACE_GAP, type SeriesDef} from './series';

export interface BarDatum {
  key: string;
  /** The x label and the tooltip title: "Sep 30", "Week of Sep 28". */
  label: string;
  /** By series id. A missing or negative value counts as 0. */
  values: Record<string, number>;
}

/** Which bars print their total above them. */
export type CapLabels = 'none' | 'extremes' | 'all';

export interface BarLayoutOptions {
  /** The plot's height in px, without the label bands. */
  height: number;
  /** Axis ticks and cap labels. */
  valueFormat: (n: number) => string;
  capLabels: CapLabels;
  /** Print at least every nth x label, counting back from the newest (more apart when they wouldn't fit). */
  xLabelEvery?: number;
  /** Leave a band under the x labels for sub-labels. */
  subLabels: boolean;
}

/** One series' share of a bar, from `bottom` up to `top` (px, top < bottom). */
export interface BarSegment {
  series: SeriesDef;
  top: number;
  bottom: number;
}

/** A total printed above its bar: the bar's index, the text and where it sits. */
export interface BarCap {
  index: number;
  text: string;
  x: number;
  y: number;
  width: number;
}

/** An x label to print: the bar's index, and the x its label (and sub-label) centres on. */
export interface BarXLabel {
  index: number;
  x: number;
}

/** Where everything in a bar chart goes, at one width. Every x and y is in px from the drawing's top left. */
export interface BarLayout {
  width: number;
  svgHeight: number;
  /** The y axis. Its gutter widens `left` past BAR_Y_AXIS_WIDTH when a tick label needs more. */
  ticks: AxisTick[];
  /** The plot's left edge, after the y-axis gutter. */
  left: number;
  plotWidth: number;
  plotTop: number;
  plotHeight: number;
  /** The zero line: plotTop + plotHeight. */
  baseline: number;
  /** The width each bar's column takes, gap included. */
  slot: number;
  barWidth: number;
  /** Each bar's centre. */
  centers: number[];
  /** Each bar's segments, baseline first; an empty bar has none. */
  stacks: BarSegment[][];
  /** Each bar's top (the baseline for an empty one): where its cap label and its tooltip sit. */
  barTops: number[];
  caps: BarCap[];
  xLabels: BarXLabel[];
  /** The x labels' baseline y, and the sub-labels' under them. */
  xLabelY: number;
  subLabelY: number;
}

/** What BarChart's sizing and label props may leave out; barLayoutOptions fills in the defaults. */
export interface BarSizing {
  /** Default 160. */
  height?: number;
  /** Default fmtInt. */
  valueFormat?: (n: number) => string;
  /** Default 'extremes'. */
  capLabels?: CapLabels;
  xLabelEvery?: number;
  /** Only whether there is one matters here: it adds the sub-label band. */
  subLabel?: unknown;
}

const DEFAULT_HEIGHT = 160;

/** BarChart's props as layout options: a 160px plot, fmtInt values and 'extremes' cap labels unless they say otherwise. */
export function barLayoutOptions(sizing: BarSizing): BarLayoutOptions {
  return {
    height: sizing.height ?? DEFAULT_HEIGHT,
    valueFormat: sizing.valueFormat ?? fmtInt,
    capLabels: sizing.capLabels ?? 'extremes',
    xLabelEvery: sizing.xLabelEvery,
    subLabels: sizing.subLabel !== undefined,
  };
}

/** The y-axis gutter left of the plot: a five-character tick ("1,200") at 10px plus the 8px gap. Fixed, so a caller can count columns from its frame (R1-8's weeksThatFit); a wider tick label widens it rather than clip. */
export const BAR_Y_AXIS_WIDTH = SPACING.xxxl + SPACING.sm;
/** Bars are never thicker than this; a wider slot leaves the rest as air (dataviz mark spec). */
const MAX_BAR_WIDTH = SPACING.xxl;
/** The band above the plot that holds cap labels. */
const CAP_BAND = SPACING.lg;
/** The band under the plot that holds the x labels, and the one under it for sub-labels. */
const X_BAND = SPACING.xl;
const SUB_BAND = SPACING.section;
/** The air right of the plot. It comes off the plot too, so n bars share width − BAR_Y_AXIS_WIDTH − RIGHT_PAD. */
const RIGHT_PAD = SPACING.sm;

/** A bar's value for one series: a missing or negative one counts as 0. */
function valueOf(datum: BarDatum, series: SeriesDef): number {
  return Math.max(0, datum.values[series.id] ?? 0);
}

/** Whether every value is a whole number, so the axis gets whole-number ticks. */
function allIntegers(data: readonly BarDatum[], series: readonly SeriesDef[]): boolean {
  return data.every((d) => series.every((s) => Number.isInteger(d.values[s.id] ?? 0)));
}

/**
 * One bar's stack, from the baseline up in series order. Each series takes
 * its share of the bar's `height`, and a 2px surface gap separates touching
 * segments, taken from the upper one. A segment never drops below 1px, so a
 * small share never vanishes.
 */
function stackOf(datum: BarDatum, series: readonly SeriesDef[], bar: {baseline: number; height: number}): BarSegment[] {
  const values = series.map((s) => valueOf(datum, s));
  const total = values.reduce((sum, v) => sum + v, 0);
  const segments: BarSegment[] = [];
  let below = 0;
  let bottom = bar.baseline;
  series.forEach((s, i) => {
    if (values[i] === 0) return;
    below += values[i];
    const top = Math.min(bar.baseline - (below / total) * bar.height, bottom - 1);
    segments.push({series: s, top, bottom});
    bottom = top - SURFACE_GAP;
  });
  return segments;
}

function overlaps(a: BarCap, b: BarCap): boolean {
  return Math.abs(a.x - b.x) < (a.width + b.width) / 2 + SURFACE_GAP && Math.abs(a.y - b.y) < LABEL_SIZE + SURFACE_GAP;
}

/** The cap with the highest total, the earlier one on a tie. */
function highestOf(caps: readonly BarCap[], totals: readonly number[]): BarCap | undefined {
  let best: BarCap | undefined;
  for (const cap of caps) if (!best || totals[cap.index] > totals[best.index]) best = cap;
  return best;
}

/** Whether every label fits its bar's slot, with the surface gap to spare. */
function allFit(caps: readonly BarCap[], slot: number): boolean {
  return caps.every((cap) => cap.width + SURFACE_GAP <= slot);
}

/** Whether the highest bar's label prints beside the last bar's: it is another bar, and the two don't collide. */
function printsBeside(highest: BarCap, last: BarCap): boolean {
  return highest !== last && !overlaps(highest, last);
}

/** The last bar's label and the highest bar's, the highest dropped when it would collide with the last. */
function extremeCaps(caps: readonly BarCap[], totals: readonly number[]): BarCap[] {
  const highest = highestOf(caps, totals);
  if (!highest) return [];
  const last = caps.find((cap) => cap.index === totals.length - 1);
  if (!last) return [highest];
  return printsBeside(highest, last) ? [highest, last] : [last];
}

/**
 * Which bars print their total (dataviz: label selectively). 'extremes' prints
 * the last bar and the highest one, dropping the highest when the two labels
 * would collide. 'all' prints every non-zero total while each label fits its
 * slot, and falls back to 'extremes' when one doesn't.
 */
function capsFor(mode: CapLabels, caps: readonly BarCap[], totals: readonly number[], slot: number): BarCap[] {
  if (mode === 'none') return [];
  const nonZero = caps.filter((cap) => totals[cap.index] > 0);
  return mode === 'all' && allFit(nonZero, slot) ? nonZero : extremeCaps(nonZero, totals);
}

/** Each bar's stack: its share of the plot height, never shorter than the surface gap when it has a total. */
function stacksFor(
  data: readonly BarDatum[],
  series: readonly SeriesDef[],
  totals: readonly number[],
  plot: {ceiling: number; baseline: number; height: number},
): BarSegment[][] {
  return data.map((d, i) => {
    const height = totals[i] > 0 ? Math.max(SURFACE_GAP, (totals[i] / plot.ceiling) * plot.height) : 0;
    return stackOf(d, series, {baseline: plot.baseline, height});
  });
}

/** A stack's top: its top segment's, or the baseline for an empty bar. */
function topOf(stack: readonly BarSegment[], baseline: number): number {
  return stack.at(-1)?.top ?? baseline;
}

/** Every bar's total as a cap label, centred over the bar and kept inside the chart. */
function capCandidates(totals: readonly number[], layout: Pick<BarLayout, 'width' | 'centers' | 'barTops'>, format: (n: number) => string): BarCap[] {
  return totals.map((total, index) => {
    const text = format(total);
    const width = labelWidth(text);
    return {index, text, width, x: labelX(layout.centers[index], width, layout.width), y: layout.barTops[index] - SPACING.xs};
  });
}

/** The x labels that print: every nth, counting back from the newest, which always prints, thinned further until they fit their slots. */
function xLabelsFor(data: readonly BarDatum[], layout: Pick<BarLayout, 'width' | 'centers' | 'slot'>, xLabelEvery = 1): BarXLabel[] {
  const fitEvery = Math.max(1, ...data.map((d) => Math.ceil((labelWidth(d.label) + SPACING.sm) / layout.slot)));
  const every = Math.max(Math.floor(xLabelEvery), 1, fitEvery);
  return data.flatMap((d, index) =>
    (data.length - 1 - index) % every === 0 ? [{index, x: labelX(layout.centers[index], labelWidth(d.label), layout.width)}] : [],
  );
}

/**
 * Where a bar chart's marks and labels go at `width` px: the y axis, one slot
 * per bar with the bar centred in it, each bar's stack, the cap labels and the
 * x labels. The axis tops out at a clean ceiling over the highest total, and
 * a non-zero bar is never shorter than the 2px surface gap. Pure, so it can be
 * tested at any width (jsdom measures none).
 */
export function barLayout(width: number, data: readonly BarDatum[], series: readonly SeriesDef[], opts: BarLayoutOptions): BarLayout {
  const totals = data.map((d) => series.reduce((sum, s) => sum + valueOf(d, s), 0));
  const ceiling = niceCeiling(Math.max(0, ...totals));
  const plotTop = CAP_BAND;
  const baseline = plotTop + opts.height;
  const axis = yAxis(wholeTicks(ceiling, allIntegers(data, series)), opts.valueFormat, linear([0, ceiling], [baseline, plotTop]));
  const left = Math.max(BAR_Y_AXIS_WIDTH, axis.gutter);
  const plotWidth = Math.max(width - left - RIGHT_PAD, 1);
  const slot = plotWidth / Math.max(data.length, 1);
  const centers = data.map((_, i) => left + slot * (i + 0.5));
  const stacks = stacksFor(data, series, totals, {ceiling, baseline, height: opts.height});
  const barTops = stacks.map((stack) => topOf(stack, baseline));
  return {
    width,
    svgHeight: baseline + X_BAND + (opts.subLabels ? SUB_BAND : 0),
    ticks: axis.ticks,
    left,
    plotWidth,
    plotTop,
    plotHeight: opts.height,
    baseline,
    slot,
    barWidth: Math.max(1, Math.min(MAX_BAR_WIDTH, slot - SURFACE_GAP)),
    centers,
    stacks,
    barTops,
    caps: capsFor(opts.capLabels, capCandidates(totals, {width, centers, barTops}, opts.valueFormat), totals, slot),
    xLabels: xLabelsFor(data, {width, centers, slot}, opts.xLabelEvery),
    xLabelY: baseline + X_BAND - SPACING.xs,
    subLabelY: baseline + X_BAND + SUB_BAND - SPACING.xs,
  };
}
