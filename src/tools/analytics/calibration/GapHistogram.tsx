import {BarChart, type BarDatum} from '../../../charts/BarChart';
import {ChartFrame} from '../../../charts/ChartFrame';
import {ChartLegend} from '../../../charts/ChartLegend';
import type {TooltipContent} from '../../../charts/ChartTooltip';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtInt} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import type {PairStat} from '../voteAnalyticsTypes';
import {
  GAP_SERIES,
  binLabel,
  binRange,
  gapBins,
  gapShares,
  histogramTable,
  sharePercent,
  sideColor,
  type GapBin,
} from './chartData';

/** The plot's height in px; BarChart adds its cap-label band above it and its x-label band below. */
const PLOT_HEIGHT = 180;

/** The pair count, the votes behind it and its share; the count is keyed in the bin's side colour. */
function binTooltip(bin: GapBin, total: number): TooltipContent {
  return {
    title: `Gap ${binRange(bin)}`,
    rows: [
      {value: fmtInt(bin.pairs), label: bin.pairs === 1 ? 'pair' : 'pairs', color: sideColor(bin.side)},
      {value: fmtInt(bin.votes), label: bin.votes === 1 ? 'vote' : 'votes'},
      {value: sharePercent(total === 0 ? 0 : bin.pairs / total), label: 'of pairs'},
    ],
  };
}

export interface GapHistogramProps {
  /** The scope, uncapped (pairsInScope). */
  pairs: readonly PairStat[];
  /** "All pairs" or the selected rule's name. */
  scopeLabel: string;
  /** What an empty scope says (default "No voted pairs yet."). */
  emptyText?: string;
}

/**
 * How the scope's pair gaps spread, one whole-number bin each from ≤−5 to
 * ≥+5. Bins left of centre are pairs the engine scores higher, right of it
 * pairs the community scores higher, and the neutral centre bin is the
 * agreement band. Each bar carries its side in one stacked series, so the
 * kit's BarChart colours it; the other two series are 0 there, and a stack
 * draws nothing for a 0. The subtitle carries the three shares, so no bar
 * prints a cap label. An empty scope draws no legend. The untitled Panel is
 * the card.
 */
export function GapHistogram({pairs, scopeLabel, emptyText = 'No voted pairs yet.'}: GapHistogramProps) {
  const bins = gapBins(pairs);
  const shares = gapShares(bins);
  const byKey = new Map(bins.map((bin) => [String(bin.center), bin]));
  const data: BarDatum[] = bins.map((bin) => ({
    key: String(bin.center),
    label: binLabel(bin),
    values: {over: 0, agree: 0, under: 0, [bin.side]: bin.pairs},
  }));
  return (
    <Panel>
      <ChartFrame
        title="Gap distribution"
        subtitle={
          pairs.length === 0
            ? `${scopeLabel} · no pairs`
            : `${scopeLabel} · ${sharePercent(shares.agree)} ${binRange({center: 0})}, ${sharePercent(shares.over)} engine higher, ${sharePercent(shares.under)} community higher`
        }
        legend={pairs.length > 0 ? <ChartLegend series={GAP_SERIES} mark="rect" /> : undefined}
        table={histogramTable(bins, scopeLabel)}>
        {pairs.length === 0 ? (
          <p style={{margin: 0, fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted}}>{emptyText}</p>
        ) : (
          <BarChart
            data={data}
            series={GAP_SERIES}
            ariaLabel={`Pairs by gap, ${scopeLabel}`}
            height={PLOT_HEIGHT}
            valueFormat={fmtInt}
            capLabels="none"
            xLabelEvery={1}
            tooltip={(d) => {
              const bin = byKey.get(d.key);
              return bin ? binTooltip(bin, pairs.length) : {title: d.label, rows: []};
            }}
          />
        )}
      </ChartFrame>
    </Panel>
  );
}
