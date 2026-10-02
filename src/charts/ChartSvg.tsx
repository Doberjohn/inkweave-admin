import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';
import {LABEL_SIZE, TICK_GAP, px, type AxisTick} from './axis';

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
 * label in muted text at the gutter's right edge (dataviz mark spec).
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
        </g>
      ))}
    </>
  );
}

/** What a chart shows in place of its plot when it has nothing to draw. */
export function EmptyChart({text}: {text: string}) {
  return <p style={{margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>{text}</p>;
}
