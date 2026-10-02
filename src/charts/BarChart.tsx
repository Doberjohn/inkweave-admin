import {useId, useRef, useState} from 'react';
import {RADIUS, useContainerWidth} from '../app-bridge';
import {ADMIN_COLORS} from '../theme/adminTheme';
import {fmtInt} from '../ui/format';
import {LABEL_SIZE, px} from './axis';
import {BAR_Y_AXIS_WIDTH, barLayout, type BarDatum, type BarLayout, type BarSegment, type CapLabels} from './barLayout';
import {AxisGrid, ChartSvg, EmptyChart} from './ChartSvg';
import {ChartTooltip, type TooltipContent} from './ChartTooltip';
import {HatchPattern} from './HatchPattern';
import {CHART_FALLBACK_WIDTH, chartDomId, hatchId, seriesPaint, tooltipText, type SeriesDef} from './series';
import {useChartCursor, type ChartCursor} from './useChartCursor';

export type {BarDatum} from './barLayout';
export {BAR_Y_AXIS_WIDTH};

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
  capLabels?: CapLabels;
  xLabelEvery?: number;
  emphasisKey?: string;
  subLabel?: (d: BarDatum) => {text: string; color?: string} | null;
  selectedKey?: string | null;
  onSelect?: (key: string | null) => void;
  /** Shown in place of the plot when `data` is empty. */
  emptyText?: string;
}

const DEFAULT_HEIGHT = 160;
const WRAP: React.CSSProperties = {minWidth: 0};

/** The keys that move the roving focus between bars, from bar `i` of a chart whose last bar is `last`. */
const BAR_KEYS = new Map<string, (i: number, last: number) => number>([
  ['ArrowRight', (i) => i + 1],
  ['ArrowLeft', (i) => i - 1],
  ['Home', () => 0],
  ['End', (_, last) => last],
]);

/** How one chart paints its bars: each series in its colour or hatch, or, in emphasis, one bar in the accent. */
interface BarPaint {
  /** The series drawn as a hatch, whose patterns the drawing defines. */
  hatched: SeriesDef[];
  segment: (series: SeriesDef, d: BarDatum) => string;
  cap: (d: BarDatum) => string;
}

/**
 * Emphasis (one series and an emphasisKey) draws the emphasised bar in the
 * accent and the rest neutral, with its cap label in the text colour.
 * Otherwise every segment wears its series' paint and caps are muted.
 */
function barPaint(series: readonly SeriesDef[], chartId: string, emphasisKey: string | undefined): BarPaint {
  if (emphasisKey === undefined || series.length !== 1) {
    return {
      hatched: series.filter((s) => s.pattern === 'hatch'),
      segment: (s) => seriesPaint(s, chartId),
      cap: () => ADMIN_COLORS.muted,
    };
  }
  const emphasised = (d: BarDatum) => d.key === emphasisKey;
  return {
    hatched: [],
    segment: (_, d) => (emphasised(d) ? ADMIN_COLORS.accent : ADMIN_COLORS.barNeutral),
    cap: (d) => (emphasised(d) ? ADMIN_COLORS.text : ADMIN_COLORS.muted),
  };
}

/** A bar's data end: a 4px rounded top (RADIUS.sm) on a square base. */
function roundedTop(x: number, width: number, segment: BarSegment): string {
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

/** The roving Tab stop: the bar last focused, else the picked bar, else the newest. */
function tabStopOf(focusIndex: number | null, selectedIndex: number, n: number): number {
  if (focusIndex != null && focusIndex < n) return focusIndex;
  return selectedIndex >= 0 ? selectedIndex : n - 1;
}

interface BarMarksProps {
  data: readonly BarDatum[];
  layout: BarLayout;
  paint: BarPaint;
  /** The bar the cursor is on, which brightens. */
  active: number | null;
  /** The picked bar; the others dim while one is picked. -1 for none. */
  selectedIndex: number;
}

/** The bars: each a group of its segments, the top one with the rounded data end. */
function BarMarks({data, layout, paint, active, selectedIndex}: BarMarksProps) {
  return data.map((d, i) => {
    const x = layout.centers[i] - layout.barWidth / 2;
    const segments = layout.stacks[i];
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
              d={roundedTop(x, layout.barWidth, segment)}
              fill={paint.segment(segment.series, d)}
            />
          ) : (
            <rect
              key={segment.series.id}
              data-series={segment.series.id}
              x={px(x)}
              y={px(segment.top)}
              width={px(layout.barWidth)}
              height={px(segment.bottom - segment.top)}
              fill={paint.segment(segment.series, d)}
            />
          ),
        )}
      </g>
    );
  });
}

/** The x labels under the axis, each with its sub-label under it when the chart has one for that bar. */
function XLabels({data, layout, subLabel}: {data: readonly BarDatum[]; layout: BarLayout; subLabel?: BarChartProps['subLabel']}) {
  return layout.xLabels.map(({index, x}) => {
    const d = data[index];
    const sub = subLabel?.(d) ?? null;
    return (
      <g key={d.key}>
        <text data-x-label x={px(x)} y={layout.xLabelY} textAnchor="middle" fontSize={LABEL_SIZE} fill={ADMIN_COLORS.muted}>
          {d.label}
        </text>
        {sub && (
          <text
            data-sub-label
            x={px(x)}
            y={layout.subLabelY}
            textAnchor="middle"
            fontSize={LABEL_SIZE}
            fill={sub.color ?? ADMIN_COLORS.muted}
            style={{fontVariantNumeric: 'tabular-nums'}}>
            {sub.text}
          </text>
        )}
      </g>
    );
  });
}

interface BarDrawingProps extends BarMarksProps {
  chartId: string;
  /** Wash the cursor's column: the slider plot does, the selectable bars draw their own hover. */
  wash: boolean;
  /** The tooltip of each bar. */
  contents: readonly TooltipContent[];
  subLabel?: BarChartProps['subLabel'];
}

/** The drawing and the tooltip: grid, the cursor's column wash, bars, cap labels and x labels. */
function BarDrawing({data, layout, paint, active, selectedIndex, chartId, wash, contents, subLabel}: BarDrawingProps) {
  return (
    <>
      <ChartSvg width={layout.width} height={layout.svgHeight}>
        {paint.hatched.length > 0 && (
          <defs>
            {paint.hatched.map((s) => (
              <HatchPattern key={s.id} id={hatchId(chartId, s)} color={s.color} />
            ))}
          </defs>
        )}
        <AxisGrid ticks={layout.ticks} left={layout.left} right={layout.left + layout.plotWidth} />
        {wash && active != null && (
          <rect
            data-wash
            x={px(layout.left + layout.slot * active)}
            y={layout.plotTop}
            width={px(layout.slot)}
            height={layout.plotHeight}
            rx={RADIUS.md}
            fill={ADMIN_COLORS.navHover}
          />
        )}
        <BarMarks data={data} layout={layout} paint={paint} active={active} selectedIndex={selectedIndex} />
        {layout.caps.map((cap) => (
          <text
            key={cap.index}
            className="adm-chart-label"
            data-cap={data[cap.index].key}
            x={px(cap.x)}
            y={px(cap.y)}
            textAnchor="middle"
            fontSize={LABEL_SIZE}
            fill={paint.cap(data[cap.index])}
            style={{fontVariantNumeric: 'tabular-nums'}}>
            {cap.text}
          </text>
        ))}
        <XLabels data={data} layout={layout} subLabel={subLabel} />
      </ChartSvg>
      <ChartTooltip
        content={active == null ? null : contents[active]}
        x={active == null ? 0 : layout.centers[active]}
        y={active == null ? 0 : layout.barTops[active]}
        bounds={{width: layout.width, height: layout.svgHeight}}
      />
    </>
  );
}

interface SelectableBarsProps {
  data: readonly BarDatum[];
  layout: BarLayout;
  ariaLabel: string;
  /** Each bar's accessible name: its tooltip text. */
  names: readonly string[];
  selectedIndex: number;
  cursor: ChartCursor;
  onSelect: (key: string | null) => void;
  /** The drawing, which sits over the hit columns. */
  children: React.ReactNode;
}

/**
 * The bars as toggle buttons (aria-pressed) with a roving Tab stop: ←/→, Home
 * and End move between bars, Enter or Space toggles one, and Escape hides the
 * tooltip. Hover and focus move the chart's cursor, so the tooltip follows.
 */
function SelectableBars({data, layout, ariaLabel, names, selectedIndex, cursor, onSelect, children}: SelectableBarsProps) {
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const last = data.length - 1;
  const tabStop = tabStopOf(focusIndex, selectedIndex, data.length);

  const onBarKey = (event: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    const move = BAR_KEYS.get(event.key);
    if (move) {
      buttons.current[Math.min(Math.max(move(i, last), 0), last)]?.focus();
    } else if (event.key === 'Escape') {
      cursor.setIndex(null);
    } else {
      return;
    }
    event.preventDefault();
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      // A lifted finger fires pointerleave too, so a touch keeps its bar's tooltip (as useChartCursor does).
      onPointerLeave={(event) => {
        if (event.pointerType !== 'touch') cursor.setIndex(null);
      }}
      style={{position: 'relative', height: layout.svgHeight}}>
      {/* The hit columns sit under the drawing, each spanning its whole slot and the
          full height, so the target is never just the painted bar. AdminStyles'
          adm-chart-hit draws their hover, pressed and focus states; the drawing
          dims the other bars itself, so a focused column keeps its full ring. */}
      <div style={{position: 'absolute', top: 0, left: layout.left, width: layout.plotWidth, height: layout.svgHeight, display: 'flex'}}>
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
      {children}
    </div>
  );
}

/**
 * Vertical columns, one series or stacked (docs/plans/R-redesign.md, Chart
 * kit). Built to the dataviz mark specs: bars at most 24px thick with a 4px
 * rounded data end and a square base, a 2px surface gap between stacked
 * segments, solid 1px gridlines one step off the surface, and the y ticks in
 * muted text. barLayout places everything; this draws it and handles input.
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
  const cursor = useChartCursor(data.length);

  if (data.length === 0) {
    return (
      <div ref={wrapRef} style={WRAP}>
        <EmptyChart text={emptyText} />
      </div>
    );
  }

  const layout = barLayout(measured > 0 ? measured : CHART_FALLBACK_WIDTH, data, series, {
    height,
    valueFormat,
    capLabels,
    xLabelEvery,
    subLabels: subLabel !== undefined,
  });
  const contents = data.map(tooltip);
  const names = contents.map(tooltipText);
  const selectedIndex = data.findIndex((d) => d.key === selectedKey);
  const drawing = (
    <BarDrawing
      data={data}
      layout={layout}
      paint={barPaint(series, chartId, emphasisKey)}
      active={cursor.index}
      selectedIndex={selectedIndex}
      chartId={chartId}
      wash={!onSelect}
      contents={contents}
      subLabel={subLabel}
    />
  );

  return (
    <div ref={wrapRef} style={WRAP}>
      {onSelect ? (
        <SelectableBars
          data={data}
          layout={layout}
          ariaLabel={ariaLabel}
          names={names}
          selectedIndex={selectedIndex}
          cursor={cursor}
          onSelect={onSelect}>
          {drawing}
        </SelectableBars>
      ) : (
        <div
          className="adm-chart-plot"
          aria-label={ariaLabel}
          {...cursor.plotProps((i) => names[i], layout.centers)}
          style={{position: 'relative', height: layout.svgHeight}}>
          {drawing}
        </div>
      )}
    </div>
  );
}
