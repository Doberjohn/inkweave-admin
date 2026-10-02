import {useId, useRef, useState} from 'react';
import {RADIUS, SPACING, useContainerWidth} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';
import {fmtInt} from '../ui/format';
import {ChartTooltip, type TooltipContent} from './ChartTooltip';
import {HatchPattern} from './HatchPattern';
import {axisTicks, linear, niceCeiling, textWidth} from './scale';
import {CHART_FALLBACK_WIDTH, SURFACE_GAP, chartDomId, hatchId, seriesPaint, tooltipText, type SeriesDef} from './series';
import {useChartCursor} from './useChartCursor';

export interface BarDatum {
  key: string;
  /** The x label and the tooltip title: "Sep 30", "Week of Sep 28". */
  label: string;
  /** By series id. A missing or negative value counts as 0. */
  values: Record<string, number>;
}

interface BarChartProps {
  data: readonly BarDatum[];
  /** Stacked from the baseline up in this order; series[0] sits on the baseline. */
  series: readonly SeriesDef[];
  /** Names the plot: the slider, or the group of bar buttons. */
  ariaLabel: string;
  /** The plot's height in px, without the label bands (default 160). */
  height?: number;
  /** Axis ticks and cap labels (default fmtInt). */
  valueFormat?: (n: number) => string;
  tooltip: (d: BarDatum) => TooltipContent;
  capLabels?: 'none' | 'extremes' | 'all';
  xLabelEvery?: number;
  emphasisKey?: string;
  subLabel?: (d: BarDatum) => {text: string; color?: string} | null;
  selectedKey?: string | null;
  onSelect?: (key: string | null) => void;
  /** Shown in place of the plot when `data` is empty. */
  emptyText?: string;
}

const DEFAULT_HEIGHT = 160;
/** The y-axis gutter left of the plot: a five-character tick ("1,200") at 10px plus the 8px gap. Fixed, so a caller can count columns from its frame (R1-8's weeksThatFit); a wider tick label widens it rather than clip. */
export const BAR_Y_AXIS_WIDTH = SPACING.xxxl + SPACING.sm;
/** Bars are never thicker than this; a wider slot leaves the rest as air (dataviz mark spec). */
const MAX_BAR_WIDTH = SPACING.xxl;
const LABEL_SIZE = ADMIN_TYPE.micro;
/** The band above the plot that holds cap labels. */
const CAP_BAND = SPACING.lg;
/** The band under the plot that holds the x labels, and the one under it for sub-labels. */
const X_BAND = SPACING.xl;
const SUB_BAND = SPACING.section;
const TICK_GAP = SPACING.sm;
/** The air right of the plot. It comes off the plot too, so n bars share width − BAR_Y_AXIS_WIDTH − RIGHT_PAD. */
const RIGHT_PAD = SPACING.sm;

/** Rounds to 2 places, for tidy SVG attributes. */
function px(n: number): number {
  return Math.round(n * 100) / 100;
}

interface Segment {
  series: SeriesDef;
  top: number;
  bottom: number;
}

/**
 * One bar's stack, from the baseline up in series order. Each series takes
 * its share of the bar's height, and a 2px surface gap separates touching
 * segments, taken from the upper one. A segment never drops below 1px, so a
 * small share never vanishes.
 */
function stackOf(datum: BarDatum, series: readonly SeriesDef[], baseline: number, height: number): Segment[] {
  const values = series.map((s) => Math.max(0, datum.values[s.id] ?? 0));
  const total = values.reduce((sum, v) => sum + v, 0);
  const segments: Segment[] = [];
  if (total === 0) return segments;
  let below = 0;
  let previousTop: number | null = null;
  series.forEach((s, i) => {
    if (values[i] === 0) return;
    below += values[i];
    const bottom = previousTop == null ? baseline : previousTop - SURFACE_GAP;
    const top = Math.min(baseline - (below / total) * height, bottom - 1);
    segments.push({series: s, top, bottom});
    previousTop = top;
  });
  return segments;
}

/** A bar's data end: a 4px rounded top (RADIUS.sm) on a square base. */
function roundedTop(x: number, width: number, top: number, bottom: number): string {
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

interface Cap {
  index: number;
  text: string;
  x: number;
  y: number;
  width: number;
}

function overlaps(a: Cap, b: Cap): boolean {
  return Math.abs(a.x - b.x) < (a.width + b.width) / 2 + SURFACE_GAP && Math.abs(a.y - b.y) < LABEL_SIZE + SURFACE_GAP;
}

/**
 * Which bars print their total (dataviz: label selectively). 'extremes' prints
 * the last bar and the highest one, dropping the highest when the two labels
 * would collide. 'all' prints every non-zero total while each label fits its
 * slot, and falls back to 'extremes' when one doesn't.
 */
function capsFor(mode: 'none' | 'extremes' | 'all', caps: Cap[], totals: number[], slot: number): Cap[] {
  if (mode === 'none') return [];
  const nonZero = caps.filter((cap) => totals[cap.index] > 0);
  if (mode === 'all' && nonZero.every((cap) => cap.width + SURFACE_GAP <= slot)) return nonZero;
  const last = nonZero.find((cap) => cap.index === totals.length - 1);
  const highest = nonZero.reduce<Cap | undefined>(
    (best, cap) => (best == null || totals[cap.index] > totals[best.index] ? cap : best),
    undefined,
  );
  if (!last) return highest ? [highest] : [];
  return highest && highest !== last && !overlaps(highest, last) ? [highest, last] : [last];
}

/**
 * Vertical columns, one series or stacked (docs/plans/R-redesign.md, Chart
 * kit). Built to the dataviz mark specs: bars at most 24px thick with a 4px
 * rounded data end and a square base, a 2px surface gap between stacked
 * segments, solid 1px gridlines one step off the surface, and the y ticks in
 * muted text.
 *
 * Without onSelect the plot is a slider (useChartCursor): the pointer and the
 * arrow keys move a cursor across the bars, the column under it washes and its
 * bar brightens, and the tooltip shows. With onSelect each bar is a toggle
 * button (aria-pressed) with a roving Tab stop: ←/→, Home and End move between
 * bars, Enter or Space toggles one, and the other bars dim to .4 while one is
 * picked. Either way the tooltip's text is also the bar's accessible name.
 *
 * The width follows the container (useContainerWidth). Until it is measured,
 * and always in jsdom, the chart lays out at CHART_FALLBACK_WIDTH and the SVG
 * scales to fit.
 */
export function BarChart({
  data,
  series,
  ariaLabel,
  height = DEFAULT_HEIGHT,
  valueFormat = fmtInt,
  tooltip,
  capLabels = 'extremes',
  xLabelEvery,
  emphasisKey,
  subLabel,
  selectedKey = null,
  onSelect,
  emptyText = 'No data to chart.',
}: BarChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measured = useContainerWidth(wrapRef);
  const chartId = chartDomId(useId());
  const n = data.length;
  const cursor = useChartCursor(n);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  const width = measured > 0 ? measured : CHART_FALLBACK_WIDTH;
  const totals = data.map((d) => series.reduce((sum, s) => sum + Math.max(0, d.values[s.id] ?? 0), 0));
  const integers = data.every((d) => series.every((s) => Number.isInteger(d.values[s.id] ?? 0)));
  const ceiling = niceCeiling(Math.max(0, ...totals));
  let ticks = axisTicks(ceiling);
  // Counts get whole-number ticks: a 0 / 2.5 / 5 axis becomes 0 / 5.
  if (integers && !ticks.every(Number.isInteger)) ticks = axisTicks(ceiling, 2);
  const tickLabels = ticks.map(valueFormat);

  const left = Math.max(BAR_Y_AXIS_WIDTH, Math.ceil(Math.max(...tickLabels.map((t) => textWidth(t, LABEL_SIZE)))) + TICK_GAP);
  const plotWidth = Math.max(width - left - RIGHT_PAD, 1);
  const slot = plotWidth / Math.max(n, 1);
  const barWidth = Math.max(1, Math.min(MAX_BAR_WIDTH, slot - SURFACE_GAP));
  const plotTop = CAP_BAND;
  const baseline = plotTop + height;
  const svgHeight = baseline + X_BAND + (subLabel ? SUB_BAND : 0);
  const y = linear([0, ceiling], [baseline, plotTop]);
  const centers = data.map((_, i) => left + slot * (i + 0.5));

  const stacks = data.map((d, i) => {
    const barHeight = totals[i] > 0 ? Math.max(SURFACE_GAP, (totals[i] / ceiling) * height) : 0;
    return stackOf(d, series, baseline, barHeight);
  });
  const barTop = (i: number) => stacks[i].at(-1)?.top ?? baseline;
  const emphasis = emphasisKey !== undefined && series.length === 1;
  const fillOf = (s: SeriesDef, d: BarDatum) => {
    if (!emphasis) return seriesPaint(s, chartId);
    return d.key === emphasisKey ? ADMIN_COLORS.accent : ADMIN_COLORS.barNeutral;
  };

  const caps = capsFor(
    capLabels,
    totals.map((total, i) => {
      const text = valueFormat(total);
      const labelWidth = textWidth(text, LABEL_SIZE);
      return {
        index: i,
        text,
        width: labelWidth,
        x: Math.min(Math.max(centers[i], labelWidth / 2), width - labelWidth / 2),
        y: barTop(i) - SPACING.xs,
      };
    }),
    totals,
    slot,
  );
  // Thin the x labels until they fit, counting back from the newest, which always prints.
  const fitEvery = Math.max(1, ...data.map((d) => Math.ceil((textWidth(d.label, LABEL_SIZE) + SPACING.sm) / slot)));
  const every = Math.max(Math.floor(xLabelEvery ?? 1), 1, fitEvery);
  const labelled = (i: number) => (n - 1 - i) % every === 0;

  const contents = data.map(tooltip);
  const names = contents.map(tooltipText);
  const selectedIndex = data.findIndex((d) => d.key === selectedKey);
  const hatched = series.filter((s) => s.pattern === 'hatch' && !emphasis);
  const active = cursor.index;

  const svg = (
    <svg
      aria-hidden="true"
      width={width}
      height={svgHeight}
      viewBox={`0 0 ${width} ${svgHeight}`}
      style={{position: 'absolute', top: 0, left: 0, display: 'block', maxWidth: '100%', height: 'auto', pointerEvents: 'none'}}>
      {hatched.length > 0 && (
        <defs>
          {hatched.map((s) => (
            <HatchPattern key={s.id} id={hatchId(chartId, s)} color={s.color} />
          ))}
        </defs>
      )}
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
      {!onSelect && active != null && (
        <rect
          data-wash
          x={px(left + slot * active)}
          y={plotTop}
          width={px(slot)}
          height={height}
          rx={RADIUS.md}
          fill={ADMIN_COLORS.navHover}
        />
      )}
      {data.map((d, i) => {
        const x = centers[i] - barWidth / 2;
        const segments = stacks[i];
        return (
          <g
            key={d.key}
            className="adm-chart-mark adm-chart-bar"
            data-key={d.key}
            data-active={i === active || undefined}
            data-dim={(selectedIndex >= 0 && i !== selectedIndex) || undefined}>
            {segments.map((segment, s) =>
              s === segments.length - 1 ? (
                <path
                  key={segment.series.id}
                  data-series={segment.series.id}
                  d={roundedTop(x, barWidth, segment.top, segment.bottom)}
                  fill={fillOf(segment.series, d)}
                />
              ) : (
                <rect
                  key={segment.series.id}
                  data-series={segment.series.id}
                  x={px(x)}
                  y={px(segment.top)}
                  width={px(barWidth)}
                  height={px(segment.bottom - segment.top)}
                  fill={fillOf(segment.series, d)}
                />
              ),
            )}
          </g>
        );
      })}
      {caps.map((cap) => (
        <text
          key={cap.index}
          className="adm-chart-label"
          data-cap={data[cap.index].key}
          x={px(cap.x)}
          y={px(cap.y)}
          textAnchor="middle"
          fontSize={LABEL_SIZE}
          fill={emphasis && data[cap.index].key === emphasisKey ? ADMIN_COLORS.text : ADMIN_COLORS.muted}
          style={{fontVariantNumeric: 'tabular-nums'}}>
          {cap.text}
        </text>
      ))}
      {data.map((d, i) => {
        if (!labelled(i)) return null;
        const labelWidth = textWidth(d.label, LABEL_SIZE);
        const x = px(Math.min(Math.max(centers[i], labelWidth / 2), width - labelWidth / 2));
        const sub = subLabel?.(d) ?? null;
        return (
          <g key={d.key}>
            <text data-x-label x={x} y={baseline + X_BAND - SPACING.xs} textAnchor="middle" fontSize={LABEL_SIZE} fill={ADMIN_COLORS.muted}>
              {d.label}
            </text>
            {sub && (
              <text
                data-sub-label
                x={x}
                y={baseline + X_BAND + SUB_BAND - SPACING.xs}
                textAnchor="middle"
                fontSize={LABEL_SIZE}
                fill={sub.color ?? ADMIN_COLORS.muted}
                style={{fontVariantNumeric: 'tabular-nums'}}>
                {sub.text}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );

  const tip = (
    <ChartTooltip
      content={active == null ? null : contents[active]}
      x={active == null ? 0 : centers[active]}
      y={active == null ? 0 : barTop(active)}
      bounds={{width, height: svgHeight}}
    />
  );

  if (n === 0) {
    return (
      <div ref={wrapRef} style={{minWidth: 0}}>
        <p style={{margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>{emptyText}</p>
      </div>
    );
  }

  if (!onSelect) {
    return (
      <div ref={wrapRef} style={{minWidth: 0}}>
        <div
          className="adm-chart-plot"
          aria-label={ariaLabel}
          {...cursor.plotProps((i) => names[i], centers)}
          style={{position: 'relative', height: svgHeight}}>
          {svg}
          {tip}
        </div>
      </div>
    );
  }

  const tabStop = focusIndex != null && focusIndex < n ? focusIndex : selectedIndex >= 0 ? selectedIndex : n - 1;
  const focusBar = (i: number) => buttons.current[Math.min(Math.max(i, 0), n - 1)]?.focus();
  const onBarKey = (event: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    switch (event.key) {
      case 'ArrowRight':
        focusBar(i + 1);
        break;
      case 'ArrowLeft':
        focusBar(i - 1);
        break;
      case 'Home':
        focusBar(0);
        break;
      case 'End':
        focusBar(n - 1);
        break;
      case 'Escape':
        cursor.setIndex(null);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <div ref={wrapRef} style={{minWidth: 0}}>
      <div
        role="group"
        aria-label={ariaLabel}
        // A lifted finger fires pointerleave too, so a touch keeps its bar's tooltip (as useChartCursor does).
        onPointerLeave={(event) => {
          if (event.pointerType !== 'touch') cursor.setIndex(null);
        }}
        style={{position: 'relative', height: svgHeight}}>
        {/* The hit columns sit under the drawing, each spanning its whole slot and the
            full height, so the target is never just the painted bar. AdminStyles'
            adm-chart-hit draws their hover, pressed and focus states; the drawing
            dims the other bars itself, so a focused column keeps its full ring. */}
        <div style={{position: 'absolute', top: 0, left, width: plotWidth, height: svgHeight, display: 'flex'}}>
          {data.map((d, i) => (
            <button
              key={d.key}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              type="button"
              className="adm-chart-hit"
              aria-label={names[i]}
              aria-pressed={i === selectedIndex}
              tabIndex={i === tabStop ? 0 : -1}
              onClick={() => onSelect(i === selectedIndex ? null : d.key)}
              onKeyDown={(event) => onBarKey(event, i)}
              onFocus={() => {
                setFocusIndex(i);
                cursor.setIndex(i);
              }}
              onBlur={() => cursor.setIndex(null)}
              onPointerEnter={() => cursor.setIndex(i)}
            />
          ))}
        </div>
        {svg}
        {tip}
      </div>
    </div>
  );
}
