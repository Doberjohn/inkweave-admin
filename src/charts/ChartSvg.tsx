import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';
import {LABEL_SIZE, TICK_GAP, px, type AxisTick} from './axis';
import type {ChartCursor, PlotProps} from './useChartCursor';

const SVG_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  display: 'block',
  maxWidth: '100%',
  height: 'auto',
  pointerEvents: 'none',
};

/**
 * A chart's drawing. It is decoration (aria-hidden): the plot element around
 * it carries the chart's name and values. It scales down to fit a narrower
 * box, and never takes the pointer, which the plot element handles.
 */
export function ChartSvg({width, height, children}: {width: number; height: number; children: React.ReactNode}) {
  return (
    <svg aria-hidden="true" width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={SVG_STYLE}>
      {children}
    </svg>
  );
}

/**
 * The y axis: a solid 1px gridline per tick across the plot, from `left` to
 * `right`, one step off the surface (the zero line a step stronger), and its
 * label in muted text at the gutter's right edge (dataviz mark spec). A tick
 * with an empty label keeps its gridline and prints no text.
 */
export function AxisGrid({ticks, left, right}: {ticks: readonly AxisTick[]; left: number; right: number}) {
  return (
    <>
      {ticks.map((tick) => (
        <g key={tick.value}>
          <line
            x1={left}
            x2={right}
            y1={px(tick.y)}
            y2={px(tick.y)}
            stroke={tick.value === 0 ? ADMIN_COLORS.border : ADMIN_COLORS.divider}
            strokeWidth={1}
            shapeRendering="crispEdges"
          />
          {tick.label !== '' && (
            <text
              x={left - TICK_GAP}
              y={px(tick.y)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={LABEL_SIZE}
              fill={ADMIN_COLORS.muted}
              style={{fontVariantNumeric: 'tabular-nums'}}>
              {tick.label}
            </text>
          )}
        </g>
      ))}
    </>
  );
}

/** What a chart shows in place of its plot when it has nothing to draw (default "No data to chart."). */
export function EmptyChart({text = 'No data to chart.'}: {text?: string}) {
  return <p style={{margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>{text}</p>;
}

interface ChartPlotProps {
  ariaLabel: string;
  cursor: ChartCursor;
  /** The slider's value text at each position: the tooltip's line. */
  valueText: (i: number) => string;
  /** Each position's x in px, which the pointer snaps to. */
  xs: readonly number[];
  height: number;
  /**
   * Adjusts the slider's props before they are spread, for a plot whose
   * positions x alone doesn't place: ScatterChart swaps the x-only pointer for
   * the nearest dot, adds selection, and passes focus on only from the
   * keyboard, so focus from the keyboard shows the resting position and focus
   * from a press keeps what the press found. Default: the props as they are.
   */
  extend?: (props: PlotProps) => PlotProps;
  /** The id of what describes the slider (aria-describedby): how to use it, where the plot works unlike the kit's others. */
  describedBy?: string;
  children: React.ReactNode;
}

/**
 * ChartPlot's default `extend`. At module scope, not inline in the parameters:
 * an inline arrow default makes React Compiler skip ChartPlot, and nothing
 * (lint included) says so.
 */
const asIs = (props: PlotProps): PlotProps => props;

/** A chart's plot as one slider (useChartCursor), named by `ariaLabel`, holding the drawing and its tooltip. */
export function ChartPlot({ariaLabel, cursor, valueText, xs, height, extend = asIs, describedBy, children}: ChartPlotProps) {
  return (
    <div
      className="adm-chart-plot"
      aria-label={ariaLabel}
      aria-describedby={describedBy}
      {...extend(cursor.plotProps(valueText, xs))}
      style={{position: 'relative', height}}>
      {children}
    </div>
  );
}
