import {RADIUS} from '../app-bridge';
import {ADMIN_COLORS} from '../theme/adminTheme';
import {px} from './axis';
import type {BarDatum, BarSegment} from './barLayout';
import {seriesPaint, type SeriesDef} from './series';

/** How one chart paints its bars: each series in its colour or hatch, or, in emphasis, one bar in the accent. */
export interface BarPaint {
  /** The series drawn as a hatch, whose patterns the drawing defines. */
  hatched: SeriesDef[];
  segment: (series: SeriesDef, d: BarDatum) => string;
  cap: (d: BarDatum) => string;
}

/** Every segment in its series' paint (colour or hatch), and every cap label muted. */
function seriesPaints(series: readonly SeriesDef[], chartId: string): BarPaint {
  return {
    hatched: series.filter((s) => s.pattern === 'hatch'),
    segment: (s) => seriesPaint(s, chartId),
    cap: () => ADMIN_COLORS.muted,
  };
}

/** The emphasised bar in the accent with its cap label in the text colour; the rest neutral and muted. */
function emphasisPaints(emphasisKey: string): BarPaint {
  const emphasised = (d: BarDatum) => d.key === emphasisKey;
  return {
    hatched: [],
    segment: (_, d) => (emphasised(d) ? ADMIN_COLORS.accent : ADMIN_COLORS.barNeutral),
    cap: (d) => (emphasised(d) ? ADMIN_COLORS.text : ADMIN_COLORS.muted),
  };
}

/** Emphasis needs one series and an emphasisKey; otherwise every series wears its own paint. */
export function barPaint(series: readonly SeriesDef[], chartId: string, emphasisKey: string | undefined): BarPaint {
  return emphasisKey === undefined || series.length !== 1 ? seriesPaints(series, chartId) : emphasisPaints(emphasisKey);
}

/** A bar's data end: a 4px rounded top (RADIUS.sm) on a square base. */
export function roundedTop(x: number, width: number, segment: BarSegment): string {
  const {top, bottom} = segment;
  const r = px(Math.min(RADIUS.sm, width / 2, bottom - top));
  return [
    `M${px(x)},${px(bottom)}`,
    `V${px(top + r)}`,
    `A${r},${r} 0 0 1 ${px(x + r)},${px(top)}`,
    `H${px(x + width - r)}`,
    `A${r},${r} 0 0 1 ${px(x + width)},${px(top + r)}`,
    `V${px(bottom)}Z`,
  ].join('');
}

/** A data attribute that is there only while its state holds: `true`, or left off (undefined). */
export function dataFlag(on: boolean): true | undefined {
  return on || undefined;
}

/** Whether bar `i` dims: another bar is picked. */
export function dimmed(i: number, selectedIndex: number): boolean {
  return selectedIndex >= 0 && i !== selectedIndex;
}
