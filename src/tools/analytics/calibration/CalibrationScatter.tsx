import {useId} from 'react';
import {ChartFrame} from '../../../charts/ChartFrame';
import {ChartLegend} from '../../../charts/ChartLegend';
import type {TooltipContent, TooltipRow} from '../../../charts/ChartTooltip';
import {ScatterChart} from '../../../charts/ScatterChart';
import {ACROSS_SHARE} from '../../../charts/scatter';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtGap, fmtInt, fmtScore} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {countOf} from '../activity/activityModel';
import type {PairStat} from '../voteAnalyticsTypes';
import {pairId} from './calibrationModel';
import {
  GAP_SERIES,
  SCATTER_JITTER,
  SCORE_DOMAIN,
  SCORE_TICKS,
  gapSide,
  scatterPoints,
  scatterTable,
  scoreText,
  sharedScores,
  sideColor,
} from './chartData';

export interface CalibrationScatterProps {
  /** The scope, uncapped (pairsInScope): every voted pair the selected rule fired on, or every pair. */
  pairs: readonly PairStat[];
  /** "All pairs" or the selected rule's name. */
  scopeLabel: string;
  selectedPair: {a: string; b: string} | null;
  onSelectPair: (pair: {a: string; b: string}) => void;
  /** Voted pairs with no engine score, which the plot can't place. Only the all-pairs scope passes it. */
  engineSilentPairs?: number;
  /** What an empty scope says (default "No voted pairs yet."). The workspace names the rule when one is selected. */
  emptyText?: string;
}

/** The tooltip for one pair: the gap leads, keyed in its side's colour, then both scores and the votes. */
function pairTooltip(pair: PairStat, sharing: number): TooltipContent {
  const rows: TooltipRow[] = [
    {value: fmtGap(pair.gap), label: 'gap', color: sideColor(gapSide(pair.gap))},
    {value: scoreText(pair.engineScore), label: 'engine'},
    {value: scoreText(pair.communityScore), label: 'community'},
    {value: fmtInt(pair.scoreVotes), label: pair.scoreVotes === 1 ? 'vote' : 'votes'},
  ];
  if (sharing > 1) rows.push({value: fmtInt(sharing), label: 'pairs on these scores'});
  return {title: `${pair.aName} × ${pair.bName}`, rows};
}

const NOTE: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.label, lineHeight: 1.5, color: ADMIN_COLORS.muted};

/**
 * Engine score against community score for every voted pair in scope, with
 * the y = x agreement line. A dot above the line is a pair the community
 * rates higher than the engine. Picking a dot selects the pair, as the pair
 * list does, so its votes open below. The untitled Panel is the card
 * (ChartFrame draws no surface). The engine-silent count sits under the frame,
 * so the table view, which lists only plotted pairs, says what it leaves out too.
 * An empty scope draws no legend.
 */
export function CalibrationScatter({
  pairs,
  scopeLabel,
  selectedPair,
  onSelectPair,
  engineSilentPairs = 0,
  emptyText = 'No voted pairs yet.',
}: CalibrationScatterProps) {
  const byId = new Map(pairs.map((p) => [pairId(p.a, p.b), p]));
  const sharing = sharedScores(pairs);
  const noteId = useId();
  // Out of the JSX: inside the ternary's branch the call would be cached with the closures below, so a new selection
  // would hand the chart new points, and it would place every dot again. Kept here, a selection only moves the ring.
  const points = scatterPoints(pairs);
  return (
    <Panel>
      <ChartFrame
        title="Engine vs community"
        subtitle={
          pairs.length === 0
            ? `${scopeLabel} · no pairs`
            : `${scopeLabel} · ${countOf(pairs.length, 'pair')}. Above the line, the community scores a pair higher than the engine does.`
        }
        legend={pairs.length > 0 ? <ChartLegend series={GAP_SERIES} mark="dot" /> : undefined}
        table={scatterTable(pairs, scopeLabel)}>
        {pairs.length === 0 ? (
          <p style={NOTE}>{emptyText}</p>
        ) : (
          <>
            <ScatterChart
              points={points}
              series={GAP_SERIES}
              ariaLabel={`Engine score against community score, ${scopeLabel}`}
              xDomain={SCORE_DOMAIN}
              yDomain={SCORE_DOMAIN}
              xTicks={SCORE_TICKS}
              yTicks={SCORE_TICKS}
              xLabel="Engine score"
              yLabel="Community score"
              diagonal="Engine = community"
              jitter={SCATTER_JITTER}
              jitterAlong="diagonal"
              tooltip={(point) => {
                const pair = byId.get(point.key);
                return pair ? pairTooltip(pair, sharing.get(point.key) ?? 1) : {title: point.label, rows: []};
              }}
              selectedKey={selectedPair ? pairId(selectedPair.a, selectedPair.b) : null}
              onSelect={(key) => {
                const pair = byId.get(key);
                if (pair) onSelectPair({a: pair.a, b: pair.b});
              }}
              describedBy={noteId}
            />
            {/* The slider's description: selecting with Enter is the scatter's own, so a screen reader hears how on focus. */}
            <p id={noteId} style={NOTE}>
              Each dot slides a little along the line, so pairs on the same scores stay visible, and its height above
              or below the line stays within {fmtScore(SCATTER_JITTER * ACROSS_SHARE, 2)} of its gap. The tooltip and the
              table give the exact values. Select a dot, or step through the dots with the arrow keys and press Enter on
              the one the chart reads out, to open its votes.
            </p>
          </>
        )}
      </ChartFrame>
      {engineSilentPairs > 0 && (
        <p style={NOTE}>
          Not plotted: {countOf(engineSilentPairs, 'engine-silent pair')} (voted, but the engine gives them no score).
        </p>
      )}
    </Panel>
  );
}
