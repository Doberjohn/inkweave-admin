import {SPACING} from '../app-bridge';
import {LABEL_SIZE, labelWidth, labelX, wholeTicks, yAxis, type AxisTick} from './axis';
import {dayIndex, isDay, linear, niceCeiling} from './scale';
import {SURFACE_GAP, type SeriesDef} from './series';

export interface LinePoint {
  x: string;
  /** Null keeps the x on the axis with no value there (a quiet week): the line breaks and the tooltip shows "—". */
  y: number | null;
}

export interface LineSeries extends SeriesDef {
  /**
   * Days ('YYYY-MM-DD') in any order; any other x in the order to draw it. A
   * series that skips an x another series has breaks its line there.
   */
  points: readonly LinePoint[];
}

export interface LineLayoutOptions {
  /** The plot's height in px, without the x-label band. */
  height: number;
  /** Axis ticks and end labels. */
  yFormat: (n: number) => string;
  /** X labels. */
  xFormat: (x: string) => string;
  /** The x values to label. Default: the first, the quarter points and the last. */
  xTicks?: readonly string[];
  /** A hairline value the y domain must include. */
  baseline?: number;
  /** The y domain to span in place of a computed one, widened only to keep every value, zero and the baseline on the plot. */
  yDomain?: readonly [number, number];
  /** Lay the plot out between LINE_Y_AXIS_WIDTH and LINE_END_WIDTH, so charts over the same x put each x at the same px. */
  fixedGutters?: boolean;
}

/** A plotted point, in px. */
export interface PlotPoint {
  x: number;
  y: number;
}

/** A series' last value, printed beside its end dot. */
export interface EndLabel {
  id: string;
  text: string;
  y: number;
}

/** An x label: the x it labels, its text and where it centres. */
export interface LineXLabel {
  index: number;
  text: string;
  x: number;
  width: number;
}

/** Where everything in a line chart goes, at one width. Every x and y is in px from the drawing's top left. */
export interface LineLayout {
  width: number;
  svgHeight: number;
  /** The x values in drawing order: days by time, anything else as the series give it. */
  xs: string[];
  /** Each series' value at each x, null where it has none. */
  values: Array<Array<number | null>>;
  ticks: AxisTick[];
  /** The plot's left edge, after the y-axis gutter. */
  left: number;
  plotWidth: number;
  plotTop: number;
  plotBottom: number;
  /** Each x's position. */
  xPx: number[];
  /** Each series' points, null where it has no value. */
  points: Array<Array<PlotPoint | null>>;
  /** The y of zero, where the area washes close. */
  zero: number;
  /** The baseline option's value and its y, or null without one. */
  baseline: {value: number; y: number} | null;
  /** Empty when two would collide; the legend and the tooltip carry the values then. */
  endLabels: EndLabel[];
  /** Where the end labels start: right of the plot, past the end dots. */
  endLabelX: number;
  xLabels: LineXLabel[];
  /** The x labels' baseline y. */
  xLabelY: number;
}

/** Dataviz mark spec: markers of r 4 with a 2px surface ring. */
export const DOT_RADIUS = 4;
export const RING = 2;
/** Room above the plot for the top tick label. */
const TOP_PAD = SPACING.sm;
const X_BAND = SPACING.xl;
const RIGHT_PAD = SPACING.sm;
/**
 * fixedGutters' room left of the plot: a six-character tick label ("−10.00",
 * 36px at the label size) and the gap to the plot. Like BAR_Y_AXIS_WIDTH, a
 * label that needs more widens it rather than clip.
 */
export const LINE_Y_AXIS_WIDTH = SPACING.xxxl + SPACING.lg;
/** fixedGutters' room right of the plot: the ringed end dot and a six-character end label. A wider label widens it too. */
export const LINE_END_WIDTH = SPACING.xxxl + SPACING.lg;

/** The y domain: it always includes zero and the baseline, and whether its ticks should be whole numbers. */
interface YDomain {
  bottom: number;
  top: number;
  integers: boolean;
}

/** The x values in drawing order. Days go into time order; any other x keeps the order the series give it. */
function xValues(series: readonly LineSeries[]): {xs: string[]; byTime: boolean} {
  const seen = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))];
  const byTime = seen.length > 0 && seen.every(isDay);
  return {xs: byTime ? seen.sort() : seen, byTime};
}

/** Each series' value at each x, null where it has none (or a non-finite one). */
function valueRows(series: readonly LineSeries[], indexOf: ReadonlyMap<string, number>): Array<Array<number | null>> {
  return series.map((s) => {
    const row: Array<number | null> = Array.from({length: indexOf.size}, () => null);
    for (const p of s.points) if (Number.isFinite(p.y)) row[indexOf.get(p.x) ?? 0] = p.y;
    return row;
  });
}

/**
 * The domain around the values, zero and the baseline: the caller's fixed one,
 * widened where one of them falls outside it, or else clean ends (0 to 1 when
 * there is nothing but zeros).
 */
function yDomain(all: readonly number[], opts: Pick<LineLayoutOptions, 'baseline' | 'yDomain'>): YDomain {
  const extra = opts.baseline ?? 0;
  const hi = Math.max(0, ...all, extra);
  const lo = Math.min(0, ...all, extra);
  const integers = all.every(Number.isInteger) && Number.isInteger(extra);
  if (opts.yDomain) return {bottom: Math.min(opts.yDomain[0], lo), top: Math.max(opts.yDomain[1], hi), integers};
  if (lo < 0) return {bottom: -niceCeiling(-lo), top: hi > 0 ? niceCeiling(hi) : 0, integers};
  return {bottom: 0, top: niceCeiling(hi), integers};
}

/** The y ticks: 0 / middle / top for one sign, bottom / 0 / top across zero, whole numbers for whole data. */
function yTicks({bottom, top, integers}: YDomain): number[] {
  if (bottom < 0 && top > 0) return [bottom, 0, top];
  if (top > 0) return wholeTicks(top, integers);
  return wholeTicks(-bottom, integers)
    .map((t) => (t === 0 ? 0 : -t))
    .reverse();
}

/** Each series' last value, placed by the y scale and printed with `format`, unless two of them would collide. */
function endLabelsFor(
  values: LineLayout['values'],
  series: readonly LineSeries[],
  place: {y: (v: number) => number; format: (n: number) => string},
): EndLabel[] {
  const ends = series.flatMap((s, si) => {
    const v = values[si].at(-1);
    return v == null ? [] : [{id: s.id, text: place.format(v), y: place.y(v)}];
  });
  const sorted = [...ends].sort((a, b) => a.y - b.y);
  const collide = sorted.some((e, i) => i > 0 && e.y - sorted[i - 1].y < LABEL_SIZE + SURFACE_GAP);
  return collide ? [] : ends;
}

/** The room right of the plot: the widest end label beside its ringed dot, or the plain right pad. */
function rightRoom(endLabels: readonly EndLabel[]): number {
  if (endLabels.length === 0) return RIGHT_PAD;
  const widest = Math.max(...endLabels.map((e) => labelWidth(e.text)));
  return Math.max(RIGHT_PAD, Math.ceil(widest + DOT_RADIUS + RING + SPACING.xs));
}

/** The room left and right of the plot: what its labels need, and with fixed gutters at least LINE_Y_AXIS_WIDTH and LINE_END_WIDTH. */
function gutters(left: number, right: number, fixed: boolean): {left: number; right: number} {
  if (!fixed) return {left, right};
  return {left: Math.max(LINE_Y_AXIS_WIDTH, left), right: Math.max(LINE_END_WIDTH, right)};
}

/** The default x labels: the first, the quarter points and the last, without repeats. */
function defaultTicks(xs: readonly string[]): string[] {
  const n = xs.length;
  return [...new Set([0, 0.25, 0.5, 0.75, 1].map((f) => xs[Math.round(f * (n - 1))]))];
}

/** Whether two x labels would touch. */
function crowded(label: LineXLabel, before: LineXLabel): boolean {
  return label.x - before.x < (label.width + before.width) / 2 + SPACING.sm;
}

/** The x labels: drop any that would overlap the one before; the last x's always stays. */
function xLabelsFor(
  layout: Pick<LineLayout, 'width' | 'xs' | 'xPx'>,
  indexOf: ReadonlyMap<string, number>,
  opts: Pick<LineLayoutOptions, 'xFormat' | 'xTicks'>,
): LineXLabel[] {
  const last = layout.xs.length - 1;
  const indexes = (opts.xTicks ?? defaultTicks(layout.xs)).map((x) => indexOf.get(x)).filter((i): i is number => i != null);
  const labels: LineXLabel[] = [];
  for (const index of [...new Set(indexes)].sort((a, b) => a - b)) {
    const text = opts.xFormat(layout.xs[index]);
    const width = labelWidth(text);
    const label = {index, text, width, x: labelX(layout.xPx[index], width, layout.width)};
    const before = labels.at(-1);
    if (before && crowded(label, before)) {
      if (index !== last) continue;
      labels.pop();
    }
    labels.push(label);
  }
  return labels;
}

/**
 * Where a line chart's marks and labels go at `width` px. Days are placed by
 * time, so a missing day shows as a gap rather than squeezing the line; any
 * other x is spaced evenly. The y domain always includes zero (and the
 * baseline). The right edge makes room for the end labels when they print.
 * Pure, so it can be tested at any width (jsdom measures none).
 */
export function lineLayout(width: number, series: readonly LineSeries[], opts: LineLayoutOptions): LineLayout {
  const {xs, byTime} = xValues(series);
  const n = xs.length;
  const indexOf = new Map(xs.map((x, i) => [x, i]));
  const values = valueRows(series, indexOf);
  const plotTop = TOP_PAD;
  const plotBottom = plotTop + opts.height;
  const domain = yDomain(values.flat().filter((v): v is number => v != null), opts);
  const y = linear([domain.bottom, domain.top], [plotBottom, plotTop]);
  const axis = yAxis(yTicks(domain), opts.yFormat, y);
  const endLabels = endLabelsFor(values, series, {y, format: opts.yFormat});
  const {left, right} = gutters(axis.gutter, rightRoom(endLabels), opts.fixedGutters ?? false);
  const plotWidth = Math.max(width - left - right, 1);
  const positions = xs.map((x, i) => (byTime ? (dayIndex(x) ?? i) : i));
  const xPx = positions.map(linear([positions[0] ?? 0, positions[n - 1] ?? 0], [left, left + plotWidth]));
  return {
    width,
    svgHeight: plotBottom + X_BAND,
    xs,
    values,
    ticks: axis.ticks,
    left,
    plotWidth,
    plotTop,
    plotBottom,
    xPx,
    points: values.map((row) => row.map((v, i) => (v == null ? null : {x: xPx[i], y: y(v)}))),
    zero: y(0),
    baseline: opts.baseline == null ? null : {value: opts.baseline, y: y(opts.baseline)},
    endLabels,
    endLabelX: left + plotWidth + DOT_RADIUS + RING + SPACING.xs,
    xLabels: xLabelsFor({width, xs, xPx}, indexOf, opts),
    xLabelY: plotBottom + X_BAND - SPACING.xs,
  };
}

/**
 * The x indexes of a row's lone points: a point with no neighbour on either
 * side draws no line, so it gets a dot. The last x has its end dot instead.
 */
export function lonePoints(row: ReadonlyArray<PlotPoint | null>): number[] {
  const lone: number[] = [];
  row.forEach((p, i) => {
    const neighbour = row[i - 1] != null || row[i + 1] != null;
    if (p != null && !neighbour) lone.push(i);
  });
  return lone.filter((i) => i !== row.length - 1);
}

/** Where the tooltip sits for the cursor at x `index`: over the highest point there, else at the plot's floor. */
export function tooltipY(layout: LineLayout, index: number): number {
  const ys = layout.points.flatMap((row) => {
    const point = row[index];
    return point == null ? [] : [point.y];
  });
  return Math.min(...ys, layout.plotBottom);
}
