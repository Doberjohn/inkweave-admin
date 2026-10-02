import {SPACING} from '../app-bridge';
import type {TooltipContent} from './ChartTooltip';

// Palette validation (R-15). The dataviz skill's validator, run 2026-10-01 in
// dark mode on the card surface (ADMIN_COLORS.card over the page, #12121a):
//   node validate_palette.js "<hexes>" --mode dark --surface "#12121a"
// Its dark lightness band is OKLCH L .48 to .67 and its chroma floor C .10.
//
// Score bands: under, barNeutral (#63637d on the page), over, and muted for the
// No score hatch.
//   PASS  CVD separation, worst adjacent over/barNeutral, ΔE 10.3 (protan)
//   PASS  normal vision, worst adjacent muted/over, ΔE 24.4
//   PASS  contrast, all four 3:1 or more
//   FAIL  lightness band: under L .80, muted .70
//   FAIL  chroma: barNeutral .041, muted .040
// Inks: INK_COLORS[ink].border in ALL_INKS order.
//   PASS  CVD separation, worst adjacent Emerald/Ruby, ΔE 8.1 (deutan)
//   PASS  normal vision, worst adjacent Sapphire/Steel, ΔE 18.0
//   PASS  contrast, all six 3:1 or more
//   FAIL  lightness band: Amber L .77, Emerald .70
//   FAIL  chroma: Steel .023
// Tiers: TIER_COLORS[tier].color, perfect to weak.
//   PASS  CVD separation, worst adjacent perfect/strong, ΔE 11.3 (deutan)
//   PASS  normal vision, same pair, ΔE 18.3
//   PASS  contrast and chroma, all four
//   FAIL  lightness band: all four, L .75 to .84
// Emphasis: accent and barNeutral.
//   PASS  CVD ΔE 34.5, normal vision ΔE 38.2, contrast
//   FAIL  lightness band: accent L .83; chroma: barNeutral, the de-emphasis grey by design
//
// Every failure is an app entity colour R-15 keeps. Each use pairs it with a
// second cue (a label, the legend, an ink icon, the hatch, the table view), and
// no chart text wears a series colour.

/**
 * One series of a chart. Its colour paints marks only: values, labels and the
 * legend stay in text colours (dataviz: text never wears the series colour).
 */
export interface SeriesDef {
  id: string;
  label: string;
  color: string;
  /** 'hatch': 45° stripes of `color` with the surface between them, for "No score", which must never read as a band. */
  pattern?: 'hatch';
}

/** A chart's width before it is measured: the first frame, and always in jsdom, which has no ResizeObserver. */
export const CHART_FALLBACK_WIDTH = 640;

/** The width a chart lays out at: what useContainerWidth measured, or CHART_FALLBACK_WIDTH until it has (0). */
export function chartWidth(measured: number): number {
  return measured > 0 ? measured : CHART_FALLBACK_WIDTH;
}

/** The 2px surface gap between touching fills: stacked segments and adjacent bars (dataviz mark spec). */
export const SURFACE_GAP = SPACING.xxs;

/** The hatch: 2px stripes every 4px, turned 45°. */
export const HATCH = {stripe: SPACING.xxs, period: SPACING.xs, angle: 45} as const;

/** Keeps an id to letters, digits, `_` and `-`, so it is safe inside url(#…). */
function safeId(raw: string): string {
  return raw.replace(/[^A-Za-z0-9_-]/g, '');
}

/** A chart's own DOM id prefix, from its useId(). */
export function chartDomId(reactId: string): string {
  return `chart${safeId(reactId)}`;
}

/** The id of a series' hatch pattern inside one chart. */
export function hatchId(chartId: string, series: SeriesDef): string {
  return `${chartId}-hatch-${safeId(series.id)}`;
}

/** What a mark of this series is painted with: its colour, or its hatch pattern. */
export function seriesPaint(series: SeriesDef, chartId: string): string {
  return series.pattern === 'hatch' ? `url(#${hatchId(chartId, series)})` : series.color;
}

/**
 * A tooltip's content as one line of text, in the order the tooltip shows it:
 * "Sep 30: 12 votes, 4 voters". It is a bar's accessible name and the value
 * text of a chart's slider, so keyboard and screen-reader users get exactly
 * what hover shows.
 */
export function tooltipText(content: TooltipContent): string {
  const rows = content.rows.map((row) => `${row.value} ${row.label}`).join(', ');
  return rows ? `${content.title}: ${rows}` : content.title;
}
