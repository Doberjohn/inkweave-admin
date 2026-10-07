import type {LorcanaCard} from 'inkweave-synergy-engine';
import {BarChart} from '../../../charts/BarChart';
import {ChartFrame} from '../../../charts/ChartFrame';
import {ChartLegend} from '../../../charts/ChartLegend';
import {fmtInt} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {countOf} from '../activity/activityModel';
import {CAPTION} from './cardStyles';
import type {ScoreHistogram} from './cardVotes';
import {SCORE_SERIES, scoreBars, scoreTable, scoreTooltip, scoresSubtitle} from './voteCharts';

export interface CommunityScoresProps {
  histogram: ScoreHistogram;
  /** The card's engine average on the pairs it scores (engineAverage); null until vote analytics loads. */
  engineAvg: number | null;
  card: Pick<LorcanaCard, 'fullName'>;
}

/**
 * The ten columns. No column prints its count (capLabels "none"): 'extremes'
 * labels the last bar, which suits the end of a time series, and here the
 * last bar is score 10, an arbitrary column. The subtitle names the peak, and
 * the y ticks, the tooltip and the table carry the rest.
 */
function ScoreColumns({histogram}: {histogram: ScoreHistogram}) {
  return (
    <BarChart
      data={scoreBars(histogram)}
      series={SCORE_SERIES}
      ariaLabel="Community scores from 1 to 10"
      valueFormat={fmtInt}
      capLabels="none"
      xLabelEvery={1}
      tooltip={(bar) => scoreTooltip(bar, histogram)}
    />
  );
}

/**
 * The card's raw scores, 1 to 10, from every vote that has one, in admin's
 * score-band colours (Vote activity's). Quick votes have no score: a note
 * under the frame counts them, in both views. A card with only quick votes
 * keeps the titled frame, with the reason in place of the chart and no legend,
 * as R2's gap histogram does. ChartFrame draws no surface, so the untitled
 * Panel is the card.
 */
export function CommunityScores({histogram, engineAvg, card}: CommunityScoresProps) {
  const scored = histogram.scored > 0;
  return (
    <Panel>
      <ChartFrame
        title="Community scores"
        subtitle={scoresSubtitle({histogram, engineAvg})}
        legend={scored ? <ChartLegend series={SCORE_SERIES} mark="rect" /> : undefined}
        table={scoreTable(histogram, card)}>
        {scored ? (
          <ScoreColumns histogram={histogram} />
        ) : (
          <p style={CAPTION}>No scored votes on this card yet ({countOf(histogram.unscored, 'quick vote')} without a score).</p>
        )}
      </ChartFrame>
      {scored && histogram.unscored > 0 && (
        <p style={CAPTION}>
          {countOf(histogram.unscored, 'quick vote')} without a score left out. How voters answered counts their answers.
        </p>
      )}
    </Panel>
  );
}
