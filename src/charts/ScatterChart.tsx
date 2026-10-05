import {useRef} from 'react';
import {SPACING, useContainerWidth} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';
import {fmtInt} from '../ui/format';
import {LABEL_SIZE, labelWidth, labelX, px, yAxis} from './axis';
import {AxisGrid, ChartPlot, ChartSvg, EmptyChart} from './ChartSvg';
import {ChartTooltip, type TooltipContent} from './ChartTooltip';
import {DOT_RADIUS, RING} from './lineLayout';
import {
  HIT_RADIUS,
  nearestPoint,
  placeDots,
  scatterLayout,
  scatterOrder,
  scatterWidth,
  type DiagonalLine,
  type JitterAlong,
  type PlacedDot,
  type ScatterLayout,
  type ScatterPoint,
} from './scatter';
import type {SeriesDef} from './series';
import {useChartCursor, type PlotProps} from './useChartCursor';

export type {ScatterPoint} from './scatter';

export interface ScatterChartProps {
  /** Drawn in this order, so the last points sit on top. */
  points: readonly ScatterPoint[];
  series: readonly SeriesDef[];
  /** Names the plot's slider. */
  ariaLabel: string;
  xDomain: readonly [number, number];
  yDomain: readonly [number, number];
  xTicks: readonly number[];
  yTicks: readonly number[];
  xLabel: string;
  yLabel: string;
  /** Tick labels (default fmtInt, as the other charts' axes). */
  tickFormat?: (n: number) => string;
  /** Draws y = x where the domains overlap, with this label along its top end. */
  diagonal?: string;
  /** The per-key jitter's spread, in data units (default 0). */
  jitter?: number;
  /**
   * 'both' (default): up to ±jitter on each axis on its own. 'diagonal': up to
   * ±jitter along y = x and a fifth of that across it, so y − x moves by at
   * most jitter / 5 (diagonalJitter).
   */
  jitterAlong?: JitterAlong;
  tooltip: (point: ScatterPoint) => TooltipContent;
  selectedKey?: string | null;
  /** With it, a click on the nearest dot, or Enter or Space on the dot the slider announces, selects that dot's key. */
  onSelect?: (key: string) => void;
  /** Shown in place of the plot when there are no points (default "No data to chart."). */
  emptyText?: string;
}

const WRAP: React.CSSProperties = {minWidth: 0};
const NUMERALS: React.CSSProperties = {fontVariantNumeric: 'tabular-nums'};
/** The dot under the cursor and the selected one lift by the ring's width (r 6 on an r 8 disc). */
const LIFT_RADIUS = DOT_RADIUS + RING;
/** The keys that select the dot the slider announces. */
const SELECT_KEYS = new Set(['Enter', ' ']);
/** The y = x label's halo: a stroke 3px wide, so 1.5px of page colour shows outside each glyph. */
const LABEL_HALO = 3;

/** The x axis: a 1px gridline up the plot at each tick (the zero line a step stronger, as AxisGrid draws y), its label below. */
function XGrid({ticks, layout, format}: {ticks: readonly number[]; layout: ScatterLayout; format: (n: number) => string}) {
  const bottom = layout.top + layout.side;
  return ticks.map((tick) => {
    const label = format(tick);
    const x = px(layout.x(tick));
    return (
      <g key={tick}>
        <line
          x1={x}
          x2={x}
          y1={layout.top}
          y2={bottom}
          stroke={tick === 0 ? ADMIN_COLORS.border : ADMIN_COLORS.divider}
          strokeWidth={1}
          shapeRendering="crispEdges"
        />
        <text
          data-x-label
          x={px(labelX(layout.x(tick), labelWidth(label), layout.width))}
          y={bottom + SPACING.lg}
          textAnchor="middle"
          fontSize={LABEL_SIZE}
          fill={ADMIN_COLORS.muted}
          style={NUMERALS}>
          {label}
        </text>
      </g>
    );
  });
}

/** The axis titles in muted text: y's above the plot at the left, x's under the tick labels at the right. */
function AxisTitles({layout, xLabel, yLabel}: {layout: ScatterLayout; xLabel: string; yLabel: string}) {
  return (
    <>
      <text x={0} y={SPACING.md} fontSize={ADMIN_TYPE.label} fill={ADMIN_COLORS.muted}>
        {yLabel}
      </text>
      <text
        x={layout.left + layout.side}
        y={layout.height - SPACING.xs}
        textAnchor="end"
        fontSize={ADMIN_TYPE.label}
        fill={ADMIN_COLORS.muted}>
        {xLabel}
      </text>
    </>
  );
}

/** The y = x line, a solid hairline. It draws under the dots, which sit on it. */
function DiagonalRule({line}: {line: DiagonalLine}) {
  return (
    <g data-diagonal="line">
      <line x1={px(line.x1)} y1={px(line.y1)} x2={px(line.x2)} y2={px(line.y2)} stroke={ADMIN_COLORS.dim} strokeWidth={1} />
    </g>
  );
}

/**
 * The y = x label, running along the line just inside its top end, a line's
 * height above it, clear of the r 6 discs of the dots on the line (and their
 * jitter across it, under 2px). It draws after the dots, not with the line: at
 * a two-up width a row of dots reaches that end of the line and would cover
 * it. A halo in the page colour, painted under the glyphs, keeps it readable
 * where a dot still lies behind it.
 */
function DiagonalLabel({line, label}: {line: DiagonalLine; label: string}) {
  const radians = (line.angle * Math.PI) / 180;
  const end = {x: px(line.x2 - Math.cos(radians) * SPACING.sm), y: px(line.y2 - Math.sin(radians) * SPACING.sm)};
  return (
    <g data-diagonal="label">
      <text
        x={end.x}
        y={end.y}
        dy="-1em"
        textAnchor="end"
        transform={`rotate(${px(line.angle)} ${end.x} ${end.y})`}
        fontSize={LABEL_SIZE}
        fill={ADMIN_COLORS.muted}
        stroke={ADMIN_COLORS.page}
        strokeWidth={LABEL_HALO}
        strokeLinejoin="round"
        paintOrder="stroke">
        {label}
      </text>
    </g>
  );
}

/**
 * Every dot, r 4, on its own opaque disc in the page colour 2px wider (R-23).
 * The disc is the dot's ring: no dot shows through another, and barNeutral's
 * alpha composites over the page alone, so a neutral dot is the validator's
 * colour whatever lies beneath it.
 */
function Dots({dots}: {dots: readonly PlacedDot[]}) {
  return dots.map((dot) => (
    <g key={dot.point.key}>
      <circle cx={px(dot.px)} cy={px(dot.py)} r={DOT_RADIUS + RING} fill={ADMIN_COLORS.page} />
      <circle data-key={dot.point.key} cx={px(dot.px)} cy={px(dot.py)} r={DOT_RADIUS} fill={dot.color} />
    </g>
  ));
}

/** A dot lifted to r 6 on an r 8 disc: the one under the cursor, or the selected one, which also wears a 2px accent ring just outside its disc. */
function LiftedDot({dot, state}: {dot: PlacedDot; state: 'active' | 'selected'}) {
  const cx = px(dot.px);
  const cy = px(dot.py);
  return (
    <g data-state={state}>
      {state === 'selected' && (
        <circle cx={cx} cy={cy} r={LIFT_RADIUS + RING + RING / 2} fill="none" stroke={ADMIN_COLORS.accent} strokeWidth={RING} />
      )}
      <circle cx={cx} cy={cy} r={LIFT_RADIUS + RING} fill={ADMIN_COLORS.page} />
      <circle cx={cx} cy={cy} r={LIFT_RADIUS} fill={dot.color} />
    </g>
  );
}

/** The selected dot, lifted and ringed, then the dot under the cursor, lifted. */
function LiftedDots({selected, active}: {selected: PlacedDot | null; active: PlacedDot | null}) {
  return (
    <>
      {selected && <LiftedDot dot={selected} state="selected" />}
      {active && <LiftedDot dot={active} state="active" />}
    </>
  );
}

/** The tooltip of the dot under the cursor, beside it; nothing without one. */
function DotTooltip({
  dot,
  tooltip,
  layout,
}: {
  dot: PlacedDot | null;
  tooltip: (point: ScatterPoint) => TooltipContent;
  layout: ScatterLayout;
}) {
  if (!dot) return null;
  return <ChartTooltip content={tooltip(dot.point)} x={dot.px} y={dot.py} bounds={{width: layout.width, height: layout.height}} />;
}

/**
 * The slider's value text: the point's label, and ", selected" on the selected
 * one, so the selection reaches assistive tech as the ring reaches the eye.
 */
function dotText(point: ScatterPoint, selectedKey: string | null): string {
  return point.key === selectedKey ? `${point.label}, selected` : point.label;
}

/** The walk index of the dot nearest the pointer, within HIT_RADIUS of its centre; null when none is. */
function dotUnder(walk: readonly PlacedDot[], event: React.MouseEvent<HTMLElement>): number | null {
  const box = event.currentTarget.getBoundingClientRect();
  return nearestPoint(walk, event.clientX - box.left, event.clientY - box.top, HIT_RADIUS);
}

/** The dot at the cursor's walk index, or null when the cursor is on none. */
function activeDot(walk: readonly PlacedDot[], index: number | null): PlacedDot | null {
  return index == null ? null : (walk[index] ?? null);
}

/**
 * The scatter's input over useChartCursor's slider (ChartPlot's `extend`). It
 * swaps the kit's x-only pointer, on move and on press, for the dot nearest the
 * pointer in two dimensions, and with onSelect adds a click on that dot and
 * Enter or Space on the dot the slider announces: its aria-valuenow, which is
 * the cursor's dot, or after Escape or once the pointer has left, the one the
 * slider rests on. Focus from the keyboard (:focus-visible, which also draws
 * the focus ring) shows the resting dot, as the kit's focus does; focus from a
 * press keeps what the press found, so a press on empty space shows no
 * tooltip. The kit's leave (a lifted finger keeps its dot), blur and other
 * keys stay as they are.
 */
function scatterInput(walk: readonly PlacedDot[], setIndex: (i: number | null) => void, onSelect?: (key: string) => void) {
  return (props: PlotProps): PlotProps => {
    const follow = (event: React.PointerEvent<HTMLElement>) => setIndex(dotUnder(walk, event));
    const announced = props['aria-valuenow'];
    const selectAnnounced = onSelect && announced != null ? () => onSelect(walk[announced].point.key) : null;
    return {
      ...props,
      onPointerMove: follow,
      onPointerDown: follow,
      onFocus: (event) => {
        if (event.currentTarget.matches(':focus-visible')) props.onFocus?.(event);
      },
      onClick: (event) => {
        const i = dotUnder(walk, event);
        if (onSelect && i != null) onSelect(walk[i].point.key);
      },
      onKeyDown: (event) => {
        if (selectAnnounced && SELECT_KEYS.has(event.key)) {
          event.preventDefault();
          selectAnnounced();
        } else {
          props.onKeyDown?.(event);
        }
      },
    };
  };
}

/**
 * Two measures per item on one square plot (docs/plans/R-redesign.md, Chart
 * kit), built on the kit's slider: the plot is one ChartPlot whose ← and →
 * walk the dots left to right, reading each dot's label, and the dot nearest
 * the pointer (within HIT_RADIUS) lifts and shows the tooltip. Dots are
 * opaque, each on its own page-coloured disc, so the ring keeps every edge
 * visible where dots overlap, and `jitter` spreads dots that share exact
 * values. The selected dot lifts too and wears an accent ring, and its value
 * text says ", selected". scatter.ts places everything; this draws it.
 *
 * The width follows the container (useContainerWidth) up to SCATTER_MAX_WIDTH.
 * Until it is measured, and always in jsdom, it lays out at that maximum.
 */
export function ScatterChart({
  points,
  series,
  ariaLabel,
  xDomain,
  yDomain,
  xTicks,
  yTicks,
  xLabel,
  yLabel,
  tickFormat = fmtInt,
  diagonal,
  jitter = 0,
  jitterAlong = 'both',
  tooltip,
  selectedKey = null,
  onSelect,
  emptyText,
}: ScatterChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measured = useContainerWidth(wrapRef);
  const cursor = useChartCursor(points.length);

  if (points.length === 0) {
    return (
      <div ref={wrapRef} style={WRAP}>
        <EmptyChart text={emptyText} />
      </div>
    );
  }

  // One tick at a time: map() would hand a formatter's optional second parameter (fmtScore's digits) the index.
  const layout = scatterLayout(scatterWidth(measured), xDomain, yDomain, yTicks.map((tick) => tickFormat(tick)));
  const placing = {series, jitter, jitterAlong};
  const drawn = placeDots(points, layout, placing);
  const walk = placeDots(scatterOrder(points), layout, placing);
  const active = activeDot(walk, cursor.index);
  const selected = drawn.find((dot) => dot.point.key === selectedKey) ?? null;
  return (
    <div ref={wrapRef} style={WRAP}>
      <div style={{width: layout.width, maxWidth: '100%', cursor: onSelect && active ? 'pointer' : undefined}}>
        <ChartPlot
          ariaLabel={ariaLabel}
          cursor={cursor}
          valueText={(i) => dotText(walk[i].point, selectedKey)}
          // Required by ChartPlot, but only the kit's x-only pointer reads it, and `extend` swaps that for the nearest dot.
          xs={walk.map((dot) => dot.px)}
          height={layout.height}
          extend={scatterInput(walk, cursor.setIndex, onSelect)}>
          <ChartSvg width={layout.width} height={layout.height}>
            <AxisGrid ticks={yAxis(yTicks, tickFormat, layout.y).ticks} left={layout.left} right={layout.left + layout.side} />
            <XGrid ticks={xTicks} layout={layout} format={tickFormat} />
            <AxisTitles layout={layout} xLabel={xLabel} yLabel={yLabel} />
            {diagonal && layout.diagonal ? <DiagonalRule line={layout.diagonal} /> : null}
            <Dots dots={drawn} />
            {diagonal && layout.diagonal ? <DiagonalLabel line={layout.diagonal} label={diagonal} /> : null}
            <LiftedDots selected={selected} active={active} />
          </ChartSvg>
          <DotTooltip dot={active} tooltip={tooltip} layout={layout} />
        </ChartPlot>
      </div>
    </div>
  );
}
