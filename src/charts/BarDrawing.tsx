import {RADIUS} from '../app-bridge';
import {ADMIN_COLORS} from '../theme/adminTheme';
import {LABEL_SIZE, px} from './axis';
import type {BarCap, BarDatum, BarLayout, BarSegment} from './barLayout';
import {dataFlag, dimmed, roundedTop, type BarPaint} from './barPaint';
import {AxisGrid, ChartSvg} from './ChartSvg';
import {ChartTooltip, type TooltipContent} from './ChartTooltip';
import {HatchPattern} from './HatchPattern';
import {hatchId, type SeriesDef} from './series';

/** A bar's second line, under its x label (the Overview's weekly gap). */
export type SubLabel = (d: BarDatum) => {text: string; color?: string} | null;

const NUMERALS: React.CSSProperties = {fontVariantNumeric: 'tabular-nums'};

/** The hatch patterns the hatched series paint with; nothing when no series is hatched. */
function HatchDefs({series, chartId}: {series: readonly SeriesDef[]; chartId: string}) {
  if (series.length === 0) return null;
  return (
    <defs>
      {series.map((s) => (
        <HatchPattern key={s.id} id={hatchId(chartId, s)} color={s.color} />
      ))}
    </defs>
  );
}

/** The wash behind the column at `index`, the slider's cursor; nothing without one. */
function ColumnWash({layout, index}: {layout: BarLayout; index: number | null}) {
  if (index == null) return null;
  return (
    <rect
      data-wash
      x={px(layout.left + layout.slot * index)}
      y={layout.plotTop}
      width={px(layout.slot)}
      height={layout.plotHeight}
      rx={RADIUS.md}
      fill={ADMIN_COLORS.navHover}
    />
  );
}

/** One segment of a bar: the top one with the rounded data end, the rest square. */
function SegmentMark({segment, x, width, top, fill}: {segment: BarSegment; x: number; width: number; top: boolean; fill: string}) {
  if (top) return <path data-series={segment.series.id} d={roundedTop(x, width, segment)} fill={fill} />;
  return (
    <rect
      data-series={segment.series.id}
      x={px(x)}
      y={px(segment.top)}
      width={px(width)}
      height={px(segment.bottom - segment.top)}
      fill={fill}
    />
  );
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

/** The bars: each a group of its segments, from the baseline up. */
function BarMarks({data, layout, paint, active, selectedIndex}: BarMarksProps) {
  return data.map((d, i) => {
    const segments = layout.stacks[i];
    return (
      <g
        key={d.key}
        className="adm-chart-mark adm-chart-bar"
        data-key={d.key}
        data-active={dataFlag(i === active)}
        data-dim={dataFlag(dimmed(i, selectedIndex))}>
        {segments.map((segment, s) => (
          <SegmentMark
            key={segment.series.id}
            segment={segment}
            x={layout.centers[i] - layout.barWidth / 2}
            width={layout.barWidth}
            top={s === segments.length - 1}
            fill={paint.segment(segment.series, d)}
          />
        ))}
      </g>
    );
  });
}

/** The totals over their bars, as barLayout picked them. */
function CapLabels({caps, data, paint}: {caps: readonly BarCap[]; data: readonly BarDatum[]; paint: BarPaint}) {
  return caps.map((cap) => (
    <text
      key={cap.index}
      className="adm-chart-label"
      data-cap={data[cap.index].key}
      x={px(cap.x)}
      y={px(cap.y)}
      textAnchor="middle"
      fontSize={LABEL_SIZE}
      fill={paint.cap(data[cap.index])}
      style={NUMERALS}>
      {cap.text}
    </text>
  ));
}

/** A bar's sub-label; nothing when it has none. */
function SubLabelText({sub, x, y}: {sub: ReturnType<SubLabel> | undefined; x: number; y: number}) {
  if (!sub) return null;
  return (
    <text data-sub-label x={px(x)} y={y} textAnchor="middle" fontSize={LABEL_SIZE} fill={sub.color ?? ADMIN_COLORS.muted} style={NUMERALS}>
      {sub.text}
    </text>
  );
}

/** The x labels that print under the axis, each with its sub-label when the chart has one. */
function XLabels({data, layout, subLabel}: {data: readonly BarDatum[]; layout: BarLayout; subLabel?: SubLabel}) {
  return layout.xLabels.map(({index, x}) => {
    const d = data[index];
    return (
      <g key={d.key}>
        <text data-x-label x={px(x)} y={layout.xLabelY} textAnchor="middle" fontSize={LABEL_SIZE} fill={ADMIN_COLORS.muted}>
          {d.label}
        </text>
        <SubLabelText sub={subLabel?.(d)} x={x} y={layout.subLabelY} />
      </g>
    );
  });
}

/** The tooltip of the bar at `active`, over its top; nothing without one. */
function BarTooltip({layout, contents, active}: {layout: BarLayout; contents: readonly TooltipContent[]; active: number | null}) {
  if (active == null) return null;
  return (
    <ChartTooltip
      content={contents[active]}
      x={layout.centers[active]}
      y={layout.barTops[active]}
      bounds={{width: layout.width, height: layout.svgHeight}}
    />
  );
}

export interface BarDrawingProps extends BarMarksProps {
  chartId: string;
  /** Wash the cursor's column: the slider plot does; selectable bars draw their own hover. */
  wash: boolean;
  /** The tooltip of each bar. */
  contents: readonly TooltipContent[];
  subLabel?: SubLabel;
}

/** A bar chart's drawing and tooltip: grid, the cursor's column wash, bars, cap labels and x labels, as barLayout placed them. */
export function BarDrawing({data, layout, paint, active, selectedIndex, chartId, wash, contents, subLabel}: BarDrawingProps) {
  return (
    <>
      <ChartSvg width={layout.width} height={layout.svgHeight}>
        <HatchDefs series={paint.hatched} chartId={chartId} />
        <AxisGrid ticks={layout.ticks} left={layout.left} right={layout.left + layout.plotWidth} />
        <ColumnWash layout={layout} index={wash ? active : null} />
        <BarMarks data={data} layout={layout} paint={paint} active={active} selectedIndex={selectedIndex} />
        <CapLabels caps={layout.caps} data={data} paint={paint} />
        <XLabels data={data} layout={layout} subLabel={subLabel} />
      </ChartSvg>
      <BarTooltip layout={layout} contents={contents} active={active} />
    </>
  );
}
