import {SPACING} from '../app-bridge';
import {ADMIN_COLORS} from '../theme/adminTheme';
import {TICK_GAP, labelWidth} from './axis';
import {linear} from './scale';
import {chartWidth, type SeriesDef} from './series';

/*
 * The scatter's geometry: the square plot, the per-key jitter, the dots'
 * places, the nearest-dot hit test and the keyboard order. Pure, so it can be
 * tested at any width (jsdom measures none). ScatterChart draws it.
 */

/** One point of a scatter. */
export interface ScatterPoint {
  /** Unique and stable: selection, React keys and the jitter seed use it. */
  key: string;
  x: number;
  y: number;
  /** The SeriesDef id whose colour the dot takes. */
  series: string;
  /** The point in words: the slider's value text when the keyboard is on it. */
  label: string;
}

/** The pointer only has to be the closest to a dot, within this many px of its centre: a 48px target (dataviz: a nearest-point layer). */
export const HIT_RADIUS = 24;

/**
 * Margins round the plot, in px: the y title above it, the x tick labels and
 * the x title below it, and the y tick labels left of it. `left` is a floor:
 * wider tick labels widen it, as they widen the other charts' gutters.
 */
export const SCATTER_MARGIN = {top: SPACING.xxl, right: SPACING.lg, bottom: SPACING.xxxl + SPACING.sm, left: SPACING.xxxl} as const;

/** The widest the chart grows. The plot is square, so past this it would only grow taller than its card. */
export const SCATTER_MAX_WIDTH = 440;

/** The width the scatter lays out at: the measured width (chartWidth's fallback until there is one), at most SCATTER_MAX_WIDTH. */
export function scatterWidth(measured: number): number {
  return Math.min(chartWidth(measured), SCATTER_MAX_WIDTH);
}

/** The y = x line where the two domains overlap, in px, and its angle in degrees (−45 on a square plot with equal domains). */
export interface DiagonalLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  angle: number;
}

export interface ScatterLayout {
  /** The whole chart, margins included, in px. */
  width: number;
  height: number;
  /** The square plot's left and top edges and its side. */
  left: number;
  top: number;
  side: number;
  /** Data value to px. */
  x: (v: number) => number;
  y: (v: number) => number;
  /** Null when the domains don't overlap. */
  diagonal: DiagonalLine | null;
}

/** y = x from where both domains start to where the first one ends, placed by the scales. */
function diagonalLine(
  x: (v: number) => number,
  y: (v: number) => number,
  xDomain: readonly [number, number],
  yDomain: readonly [number, number],
): DiagonalLine | null {
  const low = Math.max(xDomain[0], yDomain[0]);
  const high = Math.min(xDomain[1], yDomain[1]);
  if (low >= high) return null;
  const line = {x1: x(low), y1: y(low), x2: x(high), y2: y(high)};
  return {...line, angle: (Math.atan2(line.y2 - line.y1, line.x2 - line.x1) * 180) / Math.PI};
}

/**
 * A chart `width` px wide round a square plot, so equal domains draw y = x at
 * 45°. The left margin fits the widest of `yLabels` (the y tick labels) and
 * the tick gap, and never drops below SCATTER_MARGIN.left.
 */
export function scatterLayout(
  width: number,
  xDomain: readonly [number, number],
  yDomain: readonly [number, number],
  yLabels: readonly string[] = [],
): ScatterLayout {
  const {top, right, bottom} = SCATTER_MARGIN;
  const left = Math.max(SCATTER_MARGIN.left, Math.ceil(Math.max(0, ...yLabels.map(labelWidth))) + TICK_GAP);
  const side = Math.max(0, width - left - right);
  const x = linear([xDomain[0], xDomain[1]], [left, left + side]);
  const y = linear([yDomain[0], yDomain[1]], [top + side, top]);
  return {width, height: side + top + bottom, left, top, side, x, y, diagonal: diagonalLine(x, y, xDomain, yDomain)};
}

/** FNV-1a over the key, salted, as a number from 0 to 1. */
function unitHash(key: string, salt: number): number {
  let hash = 0x811c9dc5 ^ salt;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 0xffffffff;
}

/**
 * A fixed offset of up to ±amount on each axis, seeded by the key. Points that
 * share exact values spread into a small cloud, and each dot stays where it was
 * across renders and reloads. Keys should be more than a couple of characters
 * long. A one-character key's two hashes nearly agree, and a two-character
 * key's differ by one of a few fixed amounts, so short keys streak along
 * diagonals where a cloud was meant. R2's "id|id" pair keys don't.
 */
export function jitterOffset(key: string, amount: number): [number, number] {
  if (amount <= 0) return [0, 0];
  return [(unitHash(key, 1) * 2 - 1) * amount, (unitHash(key, 2) * 2 - 1) * amount];
}

/**
 * A fixed offset, seeded by the key, that runs mostly along y = x: up to ±along
 * on both axes together, plus up to ±across / 2 on each axis in opposite
 * directions. So y − x moves by at most `across`, and a point's distance from
 * the diagonal stays within `across` of its true value. Each axis moves by at
 * most along + across / 2.
 */
export function diagonalJitter(key: string, along: number, across: number): [number, number] {
  const [t, s] = jitterOffset(key, 1);
  return [t * along - (s * across) / 2, t * along + (s * across) / 2];
}

/** How a scatter spreads points that share exact values: on each axis apart, or mostly along y = x. */
export type JitterAlong = 'both' | 'diagonal';

/**
 * jitterAlong="diagonal": the spread across y = x, as a share of the spread
 * along it. A caller that words the resulting bound (y − x moves by at most
 * jitter × ACROSS_SHARE) reads it from here, so the words follow the code.
 */
export const ACROSS_SHARE = 1 / 5;

/** A point placed on the plot: its colour and its centre in px, jitter included. */
export interface PlacedDot {
  point: ScatterPoint;
  color: string;
  px: number;
  py: number;
}

export interface DotOptions {
  /** Each point takes its series' colour; a point of an unknown series is neutral. */
  series: readonly SeriesDef[];
  /** The jitter's spread in data units (0 for none). */
  jitter: number;
  /** 'both': up to ±jitter on each axis on its own. 'diagonal': ±jitter along y = x and a fifth of that across it (diagonalJitter). */
  jitterAlong: JitterAlong;
}

/** Places each point at its value plus its fixed per-key jitter, in its series' colour, in the order given. */
export function placeDots(points: readonly ScatterPoint[], layout: ScatterLayout, opts: DotOptions): PlacedDot[] {
  const colorOf = new Map(opts.series.map((s) => [s.id, s.color]));
  return points.map((point) => {
    const [dx, dy] =
      opts.jitterAlong === 'diagonal'
        ? diagonalJitter(point.key, opts.jitter, opts.jitter * ACROSS_SHARE)
        : jitterOffset(point.key, opts.jitter);
    return {
      point,
      color: colorOf.get(point.series) ?? ADMIN_COLORS.barNeutral,
      px: layout.x(point.x + dx),
      py: layout.y(point.y + dy),
    };
  });
}

/**
 * The index of the point nearest (x, y) within `radius` px, or null. The first
 * of two equally near points wins. ScatterChart passes its walk (scatterOrder),
 * so of two dots stacked on one spot, the walk's first wins, not the one drawn
 * on top. With jitter on, two dots all but never share a spot.
 */
export function nearestPoint(
  points: ReadonlyArray<{px: number; py: number}>,
  x: number,
  y: number,
  radius: number,
): number | null {
  let best: number | null = null;
  let bestDistance = Infinity;
  points.forEach((point, i) => {
    const distance = Math.hypot(point.px - x, point.py - y);
    if (distance <= radius && distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  });
  return best;
}

/** Keyboard order: left to right, then bottom to top, then by key, so ← and → walk across the plot. */
export function scatterOrder<T extends {key: string; x: number; y: number}>(points: readonly T[]): T[] {
  return [...points].sort((a, b) => a.x - b.x || a.y - b.y || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}
