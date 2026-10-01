import {useRef} from 'react';
import {SPACING, useContainerWidth} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';
import {fmtDay, fmtInt} from '../ui/format';
import {ChartTooltip, type TooltipContent} from './ChartTooltip';
import {axisTicks, dayIndex, isDay, linear, niceCeiling, textWidth} from './scale';
import {CHART_FALLBACK_WIDTH, SURFACE_GAP, tooltipText, type SeriesDef} from './series';
import {useChartCursor} from './useChartCursor';

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

interface LineChartProps {
  series: readonly LineSeries[];
  /** Names the plot's slider. */
  ariaLabel: string;
  /** The plot's height in px, without the x-label band (default 180). */
  height?: number;
  /** A ~10% wash of each series' colour between its line and zero. */
  area?: boolean;
  /** Axis ticks, end labels and tooltip values (default fmtInt). */
  yFormat?: (n: number) => string;
  /** X labels and tooltip titles (default fmtDay, which leaves a non-day as it is). */
  xFormat?: (x: string) => string;
  /** The x values to label. Default: the first, the quarter points and the last. */
  xTicks?: readonly string[];
  /** A labelled hairline at this value, inside the y domain (R2: zero gap). */
  baseline?: number;
  /** The baseline's label (default: yFormat(baseline)). */
  baselineLabel?: string;
  /** Shown in place of the plot when no series has a point. */
  emptyText?: string;
}

const DEFAULT_HEIGHT = 180;
const LABEL_SIZE = ADMIN_TYPE.micro;
/** Room above the plot for the top tick label. */
const TOP_PAD = SPACING.sm;
const X_BAND = SPACING.xl;
const TICK_GAP = SPACING.sm;
const RIGHT_PAD = SPACING.sm;
/** Dataviz mark spec: 2px lines, markers of r 4 with a 2px surface ring, area washes at about 10%. */
const LINE_WIDTH = 2;
const DOT_RADIUS = 4;
const RING = 2;
const AREA_OPACITY = 0.1;

/**
 * A marker's 2px ring in the chart's surface colour: the card over the page, as
 * a Panel paints it. `card` is translucent, so the ring is two discs, the page
 * and then the card, under the dot. A stroke in either would read darker than
 * the surface, or vanish.
 */
function SurfaceRing({cx, cy}: {cx?: number; cy?: number}) {
  return (
    <>
      <circle cx={cx} cy={cy} r={DOT_RADIUS + RING} fill={ADMIN_COLORS.page} />
      <circle cx={cx} cy={cy} r={DOT_RADIUS + RING} fill={ADMIN_COLORS.card} />
    </>
  );
}

function px(n: number): number {
  return Math.round(n * 100) / 100;
}

/** The y ticks: 0 / middle / top for one sign, bottom / 0 / top across zero, whole numbers for whole data. */
function yTicks(bottom: number, top: number, integers: boolean): number[] {
  if (bottom < 0 && top > 0) return [bottom, 0, top];
  const span = top > 0 ? top : -bottom;
  let ticks = axisTicks(span);
  if (integers && !ticks.every(Number.isInteger)) ticks = axisTicks(span, 2);
  return top > 0 ? ticks : ticks.map((t) => (t === 0 ? 0 : -t)).reverse();
}

/** An SVG path through the points, starting a new subpath after every gap. */
function linePath(points: ReadonlyArray<{x: number; y: number} | null>): string {
  let d = '';
  let pen = false;
  for (const point of points) {
    if (point == null) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${px(point.x)},${px(point.y)}`;
    pen = true;
  }
  return d;
}

/** The wash under each unbroken run, closed along the zero line. */
function areaPath(points: ReadonlyArray<{x: number; y: number} | null>, zero: number): string {
  const runs: Array<Array<{x: number; y: number}>> = [];
  let run: Array<{x: number; y: number}> = [];
  for (const point of points) {
    if (point == null) {
      if (run.length) runs.push(run);
      run = [];
    } else {
      run.push(point);
    }
  }
  if (run.length) runs.push(run);
  return runs
    .filter((r) => r.length > 1)
    .map((r) => `M${px(r[0].x)},${px(zero)}${r.map((p) => `L${px(p.x)},${px(p.y)}`).join('')}L${px(r[r.length - 1].x)},${px(zero)}Z`)
    .join('');
}

/** The default x labels: the first, the quarter points and the last, without repeats. */
function defaultTicks(xs: readonly string[]): string[] {
  const n = xs.length;
  return [...new Set([0, 0.25, 0.5, 0.75, 1].map((f) => xs[Math.round(f * (n - 1))]))];
}

/**
 * One or more series over the same x, usually days, with an optional area
 * wash and a crosshair (docs/plans/R-redesign.md, Chart kit). One y axis
 * only: two measures of different scale are two charts (dataviz).
 *
 * Days ('YYYY-MM-DD') are placed by time, so a missing day shows as a gap
 * rather than squeezing the line; any other x is spaced evenly. The y domain
 * always includes zero (and the baseline). Each series ends in a dot with a
 * 2px surface ring, and its last value is printed beside it unless the end
 * labels would collide, when the legend and the tooltip carry them.
 *
 * The plot is a slider (useChartCursor): the crosshair snaps to the nearest x
 * under the pointer, ←/→, Home and End move it, and the tooltip lists every
 * series at that x, with "—" for one that has no point there.
 */
export function LineChart({
  series,
  ariaLabel,
  height = DEFAULT_HEIGHT,
  area = false,
  yFormat = fmtInt,
  xFormat = fmtDay,
  xTicks,
  baseline,
  baselineLabel,
  emptyText = 'No data to chart.',
}: LineChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measured = useContainerWidth(wrapRef);
  const seen = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))];
  // Days go into time order; any other x keeps the order the series give it.
  const byTime = seen.length > 0 && seen.every(isDay);
  const xs = byTime ? seen.sort() : seen;
  const n = xs.length;
  const cursor = useChartCursor(n);

  const width = measured > 0 ? measured : CHART_FALLBACK_WIDTH;
  const indexOf = new Map(xs.map((x, i) => [x, i]));
  const values = series.map((s) => {
    const row: Array<number | null> = xs.map(() => null);
    for (const p of s.points) if (Number.isFinite(p.y)) row[indexOf.get(p.x) ?? 0] = p.y;
    return row;
  });
  const all = values.flat().filter((v): v is number => v != null);
  const hi = Math.max(0, ...all, baseline ?? 0);
  const lo = Math.min(0, ...all, baseline ?? 0);
  const top = hi > 0 ? niceCeiling(hi) : lo < 0 ? 0 : 1;
  const bottom = lo < 0 ? -niceCeiling(-lo) : 0;
  const integers = all.every(Number.isInteger) && (baseline == null || Number.isInteger(baseline));
  const ticks = yTicks(bottom, top, integers);
  const tickLabels = ticks.map(yFormat);

  // End labels: each series that reaches the last x prints its last value, unless two would collide.
  const plotTop = TOP_PAD;
  const plotBottom = plotTop + height;
  const y = linear([bottom, top], [plotBottom, plotTop]);
  const ends = series.flatMap((s, si) => {
    const v = values[si][n - 1];
    return v == null ? [] : [{id: s.id, text: yFormat(v), y: y(v)}];
  });
  const sortedEnds = [...ends].sort((a, b) => a.y - b.y);
  const endsCollide = sortedEnds.some((e, i) => i > 0 && e.y - sortedEnds[i - 1].y < LABEL_SIZE + SURFACE_GAP);
  const endLabels = endsCollide ? [] : ends;
  const endRoom = endLabels.length
    ? Math.max(...endLabels.map((e) => textWidth(e.text, LABEL_SIZE))) + DOT_RADIUS + RING + SPACING.xs
    : 0;

  const left = Math.ceil(Math.max(...tickLabels.map((t) => textWidth(t, LABEL_SIZE)))) + TICK_GAP;
  const right = Math.max(RIGHT_PAD, Math.ceil(endRoom));
  const plotWidth = Math.max(width - left - right, 1);
  const svgHeight = plotBottom + X_BAND;
  const positions = xs.map((x, i) => (byTime ? (dayIndex(x) ?? i) : i));
  const xScale = linear([positions[0] ?? 0, positions[n - 1] ?? 0], [left, left + plotWidth]);
  const xPx = positions.map(xScale);
  const points = values.map((row) => row.map((v, i) => (v == null ? null : {x: xPx[i], y: y(v)})));
  const zero = y(0);

  const contentAt = (i: number): TooltipContent => ({
    title: xFormat(xs[i]),
    rows: series.map((s, si) => {
      const v = values[si][i];
      return {label: s.label, value: v == null ? '—' : yFormat(v), color: s.color};
    }),
  });

  // X labels: drop any that would overlap the one before; the last always stays.
  const tickIndexes = (xTicks ?? defaultTicks(xs)).map((x) => indexOf.get(x)).filter((i): i is number => i != null);
  const xLabels: Array<{index: number; x: number; text: string; width: number}> = [];
  for (const index of [...new Set(tickIndexes)].sort((a, b) => a - b)) {
    const text = xFormat(xs[index]);
    const labelWidth = textWidth(text, LABEL_SIZE);
    const label = {index, text, width: labelWidth, x: Math.min(Math.max(xPx[index], labelWidth / 2), width - labelWidth / 2)};
    const before = xLabels.at(-1);
    if (before && label.x - before.x < (label.width + before.width) / 2 + SPACING.sm) {
      if (index !== n - 1) continue;
      xLabels.pop();
    }
    xLabels.push(label);
  }

  const active = cursor.index;
  const activePoints = active == null ? [] : points.map((row) => row[active]);
  const tipY = Math.min(...activePoints.filter((p) => p != null).map((p) => p.y), plotBottom);

  if (n === 0) {
    return (
      <div ref={wrapRef} style={{minWidth: 0}}>
        <p style={{margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>{emptyText}</p>
      </div>
    );
  }

  return (
    <div ref={wrapRef} style={{minWidth: 0}}>
      <div
        className="adm-chart-plot"
        aria-label={ariaLabel}
        {...cursor.plotProps((i) => tooltipText(contentAt(i)), xPx)}
        style={{position: 'relative', height: svgHeight}}>
        <svg
          aria-hidden="true"
          width={width}
          height={svgHeight}
          viewBox={`0 0 ${width} ${svgHeight}`}
          style={{position: 'absolute', top: 0, left: 0, display: 'block', maxWidth: '100%', height: 'auto', pointerEvents: 'none'}}>
          {ticks.map((tick, i) => (
            <g key={tick}>
              <line
                x1={left}
                x2={left + plotWidth}
                y1={px(y(tick))}
                y2={px(y(tick))}
                stroke={tick === 0 ? ADMIN_COLORS.border : ADMIN_COLORS.divider}
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
              <text
                x={left - TICK_GAP}
                y={px(y(tick))}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={LABEL_SIZE}
                fill={ADMIN_COLORS.muted}
                style={{fontVariantNumeric: 'tabular-nums'}}>
                {tickLabels[i]}
              </text>
            </g>
          ))}
          {baseline != null && (
            <g data-baseline>
              <line
                x1={left}
                x2={left + plotWidth}
                y1={px(y(baseline))}
                y2={px(y(baseline))}
                stroke={ADMIN_COLORS.strongBorder}
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
              <text x={left + SPACING.xs} y={px(y(baseline) - SPACING.xs)} fontSize={LABEL_SIZE} fill={ADMIN_COLORS.muted}>
                {baselineLabel ?? yFormat(baseline)}
              </text>
            </g>
          )}
          {area &&
            series.map((s, si) => (
              <path
                key={s.id}
                className="adm-chart-area"
                data-area={s.id}
                d={areaPath(points[si], zero)}
                fill={s.color}
                fillOpacity={AREA_OPACITY}
              />
            ))}
          {series.map((s, si) => (
            <path
              key={s.id}
              className="adm-chart-line"
              data-series={s.id}
              d={linePath(points[si])}
              pathLength={1}
              fill="none"
              stroke={s.color}
              strokeWidth={LINE_WIDTH}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {series.map((s, si) => {
            // A point with no neighbour on either side draws no line, so it gets a dot.
            const row = points[si];
            return row.map((p, i) =>
              p != null && row[i - 1] == null && row[i + 1] == null && i !== n - 1 ? (
                <circle key={`${s.id}-${i}`} data-lone={s.id} cx={px(p.x)} cy={px(p.y)} r={DOT_RADIUS} fill={s.color} />
              ) : null,
            );
          })}
          {series.map((s, si) => {
            const p = points[si].filter((point) => point != null).at(-1);
            return p ? (
              <g key={s.id} className="adm-chart-label">
                <SurfaceRing cx={px(p.x)} cy={px(p.y)} />
                <circle data-end={s.id} cx={px(p.x)} cy={px(p.y)} r={DOT_RADIUS} fill={s.color} />
              </g>
            ) : null;
          })}
          {endLabels.map((e) => (
            <text
              key={e.id}
              className="adm-chart-label"
              data-end-label={e.id}
              x={px(left + plotWidth + DOT_RADIUS + RING + SPACING.xs)}
              y={px(e.y)}
              dominantBaseline="middle"
              fontSize={LABEL_SIZE}
              fill={ADMIN_COLORS.text}
              style={{fontVariantNumeric: 'tabular-nums'}}>
              {e.text}
            </text>
          ))}
          {xLabels.map((label) => (
            <text
              key={label.index}
              data-x-label
              x={px(label.x)}
              y={plotBottom + X_BAND - SPACING.xs}
              textAnchor="middle"
              fontSize={LABEL_SIZE}
              fill={ADMIN_COLORS.muted}>
              {label.text}
            </text>
          ))}
          {active != null && (
            <>
              <g className="adm-chart-cursor" data-cursor={active} style={{transform: `translateX(${px(xPx[active])}px)`}}>
                <line x1={0} x2={0} y1={plotTop} y2={plotBottom} stroke={ADMIN_COLORS.strongBorder} strokeWidth={1} />
              </g>
              {activePoints.map((p, si) =>
                p == null ? null : (
                  <g
                    key={series[si].id}
                    className="adm-chart-cursor"
                    style={{transform: `translate(${px(p.x)}px, ${px(p.y)}px)`}}>
                    <SurfaceRing />
                    <circle data-marker={series[si].id} r={DOT_RADIUS} fill={series[si].color} />
                  </g>
                ),
              )}
            </>
          )}
        </svg>
        <ChartTooltip
          content={active == null ? null : contentAt(active)}
          x={active == null ? 0 : xPx[active]}
          y={tipY}
          bounds={{width, height: svgHeight}}
        />
      </div>
    </div>
  );
}
