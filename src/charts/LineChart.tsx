import {useRef} from 'react';
import {SPACING, useContainerWidth} from '../app-bridge';
import {ADMIN_COLORS} from '../theme/adminTheme';
import {fmtDay, fmtInt} from '../ui/format';
import {LABEL_SIZE, px} from './axis';
import {AxisGrid, ChartPlot, ChartSvg, EmptyChart} from './ChartSvg';
import {ChartTooltip, type TooltipContent} from './ChartTooltip';
import {DOT_RADIUS, RING, lineLayout, lonePoints, tooltipY, type LineLayout, type LineSeries, type PlotPoint} from './lineLayout';
import {chartWidth, tooltipText} from './series';
import {useChartCursor} from './useChartCursor';

export type {LinePoint, LineSeries} from './lineLayout';

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
  /** Shown in place of the plot when no series has a point (default "No data to chart."). */
  emptyText?: string;
}

const DEFAULT_HEIGHT = 180;
const WRAP: React.CSSProperties = {minWidth: 0};
/** Dataviz mark spec: 2px lines and area washes at about 10%. */
const LINE_WIDTH = 2;
const AREA_OPACITY = 0.1;

/** The chart's formats: y values (ticks, end labels, tooltip values) and x values (labels, tooltip titles). */
interface LineFormats {
  yFormat: (n: number) => string;
  xFormat: (x: string) => string;
}

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

/** An SVG path through the points, starting a new subpath after every gap. */
function linePath(points: ReadonlyArray<PlotPoint | null>): string {
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
function areaPath(points: ReadonlyArray<PlotPoint | null>, zero: number): string {
  const runs: PlotPoint[][] = [];
  let run: PlotPoint[] = [];
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

/** The tooltip at x `index`: the x, then every series' value there, "—" for one with none. */
function tooltipAt(series: readonly LineSeries[], layout: LineLayout, formats: LineFormats, index: number): TooltipContent {
  return {
    title: formats.xFormat(layout.xs[index]),
    rows: series.map((s, si) => {
      const v = layout.values[si][index];
      return {label: s.label, value: v == null ? '—' : formats.yFormat(v), color: s.color};
    }),
  };
}

/** The labelled hairline at the baseline value. */
function Baseline({layout, y, label}: {layout: LineLayout; y: number; label: string}) {
  return (
    <g data-baseline>
      <line
        x1={layout.left}
        x2={layout.left + layout.plotWidth}
        y1={px(y)}
        y2={px(y)}
        stroke={ADMIN_COLORS.strongBorder}
        strokeWidth={1}
        shapeRendering="crispEdges"
      />
      <text x={layout.left + SPACING.xs} y={px(y - SPACING.xs)} fontSize={LABEL_SIZE} fill={ADMIN_COLORS.muted}>
        {label}
      </text>
    </g>
  );
}

/** Each series' line, its lone points' dots and its ringed end dot, then the end labels. */
function SeriesMarks({series, layout, area}: {series: readonly LineSeries[]; layout: LineLayout; area: boolean}) {
  return (
    <>
      {area &&
        series.map((s, si) => (
          <path
            key={s.id}
            className="adm-chart-area"
            data-area={s.id}
            d={areaPath(layout.points[si], layout.zero)}
            fill={s.color}
            fillOpacity={AREA_OPACITY}
          />
        ))}
      {series.map((s, si) => (
        <path
          key={s.id}
          className="adm-chart-line"
          data-series={s.id}
          d={linePath(layout.points[si])}
          pathLength={1}
          fill="none"
          stroke={s.color}
          strokeWidth={LINE_WIDTH}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {series.map((s, si) =>
        lonePoints(layout.points[si]).map((i) => {
          const p = layout.points[si][i]!;
          return <circle key={`${s.id}-${i}`} data-lone={s.id} cx={px(p.x)} cy={px(p.y)} r={DOT_RADIUS} fill={s.color} />;
        }),
      )}
      {series.map((s, si) => {
        const p = layout.points[si].filter((point) => point != null).at(-1);
        return p ? (
          <g key={s.id} className="adm-chart-label">
            <SurfaceRing cx={px(p.x)} cy={px(p.y)} />
            <circle data-end={s.id} cx={px(p.x)} cy={px(p.y)} r={DOT_RADIUS} fill={s.color} />
          </g>
        ) : null;
      })}
      {layout.endLabels.map((e) => (
        <text
          key={e.id}
          className="adm-chart-label"
          data-end-label={e.id}
          x={px(layout.endLabelX)}
          y={px(e.y)}
          dominantBaseline="middle"
          fontSize={LABEL_SIZE}
          fill={ADMIN_COLORS.text}
          style={{fontVariantNumeric: 'tabular-nums'}}>
          {e.text}
        </text>
      ))}
    </>
  );
}

/** The crosshair at x `active`, with a ringed marker on each series that has a point there. */
function Crosshair({series, layout, active}: {series: readonly LineSeries[]; layout: LineLayout; active: number}) {
  return (
    <>
      <g className="adm-chart-cursor" data-cursor={active} style={{transform: `translateX(${px(layout.xPx[active])}px)`}}>
        <line x1={0} x2={0} y1={layout.plotTop} y2={layout.plotBottom} stroke={ADMIN_COLORS.strongBorder} strokeWidth={1} />
      </g>
      {layout.points.map((row, si) => {
        const p = row[active];
        return p == null ? null : (
          <g key={series[si].id} className="adm-chart-cursor" style={{transform: `translate(${px(p.x)}px, ${px(p.y)}px)`}}>
            <SurfaceRing />
            <circle data-marker={series[si].id} r={DOT_RADIUS} fill={series[si].color} />
          </g>
        );
      })}
    </>
  );
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
 * lineLayout places everything; this draws it and handles input.
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
  emptyText,
}: LineChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measured = useContainerWidth(wrapRef);
  const layout = lineLayout(chartWidth(measured), series, {height, yFormat, xFormat, xTicks, baseline});
  const cursor = useChartCursor(layout.xs.length);

  if (layout.xs.length === 0) {
    return (
      <div ref={wrapRef} style={WRAP}>
        <EmptyChart text={emptyText} />
      </div>
    );
  }

  const contentAt = (i: number) => tooltipAt(series, layout, {xFormat, yFormat}, i);
  const active = cursor.index;
  return (
    <div ref={wrapRef} style={WRAP}>
      <ChartPlot
        ariaLabel={ariaLabel}
        cursor={cursor}
        valueText={(i) => tooltipText(contentAt(i))}
        xs={layout.xPx}
        height={layout.svgHeight}>
        <ChartSvg width={layout.width} height={layout.svgHeight}>
          <AxisGrid ticks={layout.ticks} left={layout.left} right={layout.left + layout.plotWidth} />
          {layout.baseline && (
            <Baseline layout={layout} y={layout.baseline.y} label={baselineLabel ?? yFormat(layout.baseline.value)} />
          )}
          <SeriesMarks series={series} layout={layout} area={area} />
          {layout.xLabels.map((label) => (
            <text
              key={label.index}
              data-x-label
              x={px(label.x)}
              y={layout.xLabelY}
              textAnchor="middle"
              fontSize={LABEL_SIZE}
              fill={ADMIN_COLORS.muted}>
              {label.text}
            </text>
          ))}
          {active != null && <Crosshair series={series} layout={layout} active={active} />}
        </ChartSvg>
        <ChartTooltip
          content={active == null ? null : contentAt(active)}
          x={active == null ? 0 : layout.xPx[active]}
          y={active == null ? layout.plotBottom : tooltipY(layout, active)}
          bounds={{width: layout.width, height: layout.svgHeight}}
        />
      </ChartPlot>
    </div>
  );
}
