import {useId, useRef} from 'react';
import {useContainerWidth} from '../app-bridge';
import {BarDrawing, type SubLabel} from './BarDrawing';
import {BAR_Y_AXIS_WIDTH, barLayout, barLayoutOptions, type BarDatum, type BarSizing, type CapLabels} from './barLayout';
import {barPaint} from './barPaint';
import {ChartPlot, EmptyChart} from './ChartSvg';
import type {TooltipContent} from './ChartTooltip';
import {SelectableBars} from './SelectableBars';
import {chartDomId, chartWidth, tooltipText, type SeriesDef} from './series';
import {useChartCursor} from './useChartCursor';

export type {BarDatum} from './barLayout';
export {BAR_Y_AXIS_WIDTH};

interface BarChartProps extends BarSizing {
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
  subLabel?: SubLabel;
  selectedKey?: string | null;
  onSelect?: (key: string | null) => void;
  /** Shown in place of the plot when `data` is empty (default "No data to chart."). */
  emptyText?: string;
}

const WRAP: React.CSSProperties = {minWidth: 0};

/**
 * Vertical columns, one series or stacked (docs/plans/R-redesign.md, Chart
 * kit). Built to the dataviz mark specs: bars at most 24px thick with a 4px
 * rounded data end and a square base, a 2px surface gap between stacked
 * segments, solid 1px gridlines one step off the surface, and the y ticks in
 * muted text. barLayout places everything, BarDrawing draws it, and this
 * picks the plot that handles input.
 *
 * Without onSelect the plot is a slider (useChartCursor): the pointer and the
 * arrow keys move a cursor across the bars, the column under it washes and its
 * bar brightens, and the tooltip shows. With onSelect each bar is a toggle
 * button (aria-pressed) with a roving Tab stop (SelectableBars): ←/→, Home and
 * End move between bars, Enter or Space toggles one, and the other bars dim to
 * .4 while one is picked. Either way the tooltip's text is also the bar's
 * accessible name.
 *
 * The width follows the container (useContainerWidth). Until it is measured,
 * and always in jsdom, the chart lays out at CHART_FALLBACK_WIDTH and the SVG
 * scales to fit.
 */
export function BarChart({data, series, ariaLabel, tooltip, emphasisKey, selectedKey, onSelect, emptyText, ...sizing}: BarChartProps) {
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

  const layout = barLayout(chartWidth(measured), data, series, barLayoutOptions(sizing));
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
      subLabel={sizing.subLabel}
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
        <ChartPlot ariaLabel={ariaLabel} cursor={cursor} valueText={(i) => names[i]} xs={layout.centers} height={layout.svgHeight}>
          {drawing}
        </ChartPlot>
      )}
    </div>
  );
}
