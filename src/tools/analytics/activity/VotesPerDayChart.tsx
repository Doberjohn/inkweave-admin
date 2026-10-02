import {BarChart} from '../../../charts/BarChart';
import {ChartFrame} from '../../../charts/ChartFrame';
import {ChartLegend} from '../../../charts/ChartLegend';
import {fmtInt} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {BAND_SERIES, barData, chartSubtitle, chartTable, chartTitle, labelEvery, tooltipFor} from './activityChart';
import type {ChartBucket, DayStack} from './activityModel';

/** The plot's height. The kit adds the axis band below it, so the frame never scrolls. */
const PLOT_HEIGHT = 160;

interface VotesPerDayChartProps {
  /** Oldest first, from chartStacks. */
  stacks: DayStack[];
  bucket: ChartBucket;
  /** The range's first and last UTC days. */
  startDay: string;
  endDay: string;
  /** The picked bar's key (its day, or its week's Monday), or null. */
  selectedKey: string | null;
  /** Hands each pick back; the view decides whether it clears the pick. */
  onSelect: (key: string | null) => void;
}

/**
 * Votes per day (per week once the range runs past 90 days), stacked by score
 * band, on the chart kit. Only the newest and the busiest bars print their
 * totals. Every bar's band counts and voters are in its tooltip, which is also
 * its accessible name, and in the table view. Each bar is a toggle: picking
 * one filters the vote log to its day or week, and picking it again clears it.
 */
export function VotesPerDayChart({stacks, bucket, startDay, endDay, selectedKey, onSelect}: VotesPerDayChartProps) {
  const title = chartTitle(bucket);
  return (
    // ChartFrame draws no card surface (R1-8, R1-10), so an untitled Panel is the card.
    <Panel>
      <ChartFrame
        title={title}
        subtitle={chartSubtitle(bucket, startDay, endDay)}
        legend={<ChartLegend series={BAND_SERIES} mark="rect" />}
        table={chartTable(stacks, bucket, startDay, endDay)}>
        <BarChart
          data={barData(stacks)}
          series={BAND_SERIES}
          ariaLabel={title}
          height={PLOT_HEIGHT}
          valueFormat={fmtInt}
          tooltip={tooltipFor(stacks, bucket, startDay, endDay)}
          capLabels="extremes"
          xLabelEvery={labelEvery(stacks.length)}
          selectedKey={selectedKey}
          onSelect={onSelect}
        />
      </ChartFrame>
    </Panel>
  );
}
