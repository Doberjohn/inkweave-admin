import type {CSSProperties} from 'react';
import {SPACING} from '../app-bridge';
import {ADMIN_LAYOUT} from '../theme/adminTheme';

/**
 * A row of panels: two side by side once the row holds two `track`-wide
 * columns and the gap, stacked below that (`min(100%, …)` keeps one column
 * from overflowing a narrower row). A chart's padded Panel takes 42px of its
 * track, so the plot is the track less 42px, and ChartTooltip needs 304px of
 * it: a row of charts takes no track under 346px. Moved from R2's calibration
 * workspace (R3-1a).
 */
export function twoUp(track: number): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${track}px), 1fr))`,
    gap: SPACING.xl,
    alignItems: 'start',
  };
}

/** A KPI card's narrowest column: the Overview's row (OverviewKpis.tsx) wraps at it. */
export const KPI_TRACK = 170;
const KPI_GAP = SPACING.md;

/** A row of KPI cards: how many it holds, and its width in px (0 until measured). */
export interface KpiRowSize {
  count: number;
  width: number;
}

/**
 * How many columns a row of KPI cards takes: all of them while each still gets
 * KPI_TRACK, else the most that divide the cards evenly and fit, never under
 * two. Six cards go 6, 3 or 2 across and four go 4 or 2, so no card is left
 * alone on a row, as auto-fit's five and one left Accuracy sentiment at 1366px
 * (#34). Unmeasured, every card shares one row.
 */
export function kpiColumns({count, width}: KpiRowSize): number {
  if (width <= 0) return count;
  for (let columns = count; columns > 2; columns -= 1) {
    if (count % columns === 0 && columns * KPI_TRACK + (columns - 1) * KPI_GAP <= width) return columns;
  }
  return Math.min(count, 2);
}

/** The KPI row's grid, in kpiColumns' columns. */
export function kpiRow(row: KpiRowSize): CSSProperties {
  return {display: 'grid', gridTemplateColumns: `repeat(${kpiColumns(row)}, minmax(0, 1fr))`, gap: KPI_GAP};
}

/**
 * Hides an element on screen while screen readers still read it: a table's
 * caption, or a status line that only says what the screen already shows.
 */
export const SR_ONLY: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -ADMIN_LAYOUT.hairline,
  padding: 0,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
};
