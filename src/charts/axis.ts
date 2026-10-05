import {SPACING} from '../app-bridge';
import {ADMIN_TYPE} from '../theme/adminTheme';
import {axisTicks, textWidth} from './scale';

/*
 * The y axis and the label geometry BarChart and LineChart share: tick values
 * and where they sit, the gutter their labels need, label placement inside the
 * chart, and the rounding every SVG attribute goes through. ChartSvg's AxisGrid
 * draws the ticks.
 */

/** Every chart label (ticks, caps, end labels, x labels) is set at the micro size. */
export const LABEL_SIZE = ADMIN_TYPE.micro;
/** The air between a tick label and the plot. */
export const TICK_GAP = SPACING.sm;

/** One y tick: its value, its label and its y in px. An empty label keeps the gridline and prints no text (AxisGrid). */
export interface AxisTick {
  value: number;
  label: string;
  y: number;
}

/** The y axis of one chart: its ticks, and the gutter left of the plot that their labels need. */
export interface YAxis {
  ticks: AxisTick[];
  gutter: number;
}

/** Rounds to 2 places, for tidy SVG attributes. */
export function px(n: number): number {
  return Math.round(n * 100) / 100;
}

/** A label's estimated width at LABEL_SIZE (scale.ts's textWidth, which errs wide). */
export function labelWidth(text: string): number {
  return textWidth(text, LABEL_SIZE);
}

/** The x that centres a label `width` wide on `center`, moved in as far as it takes to stay inside the chart. */
export function labelX(center: number, width: number, chartWidth: number): number {
  return Math.min(Math.max(center, width / 2), chartWidth - width / 2);
}

/** Ticks from 0 to `top` (axisTicks). Whole-number data gets whole-number ticks: a 0 / 2.5 / 5 axis becomes 0 / 5. */
export function wholeTicks(top: number, integers: boolean): number[] {
  const ticks = axisTicks(top);
  return integers && !ticks.every(Number.isInteger) ? axisTicks(top, 2) : ticks;
}

/** The room left of the plot that `labels` need: the widest one, and the gap to the plot. */
export function gutterFor(labels: readonly string[]): number {
  return Math.ceil(Math.max(...labels.map(labelWidth))) + TICK_GAP;
}

/** The ticks at `values`, labelled with `format` and placed by the chart's y scale. */
export function yAxis(values: readonly number[], format: (n: number) => string, y: (v: number) => number): YAxis {
  const ticks = values.map((value) => ({value, label: format(value), y: y(value)}));
  return {ticks, gutter: gutterFor(ticks.map((tick) => tick.label))};
}
