import type {LorcanaCard} from 'inkweave-synergy-engine';
import {BarChart} from '../../../charts/BarChart';
import {ChartFrame} from '../../../charts/ChartFrame';
import {fmtInt} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {labelEvery} from '../activity/activityChart';
import type {VoteSpan} from '../activity/activityModel';
import type {CardVoteSpan, WeekCount} from './cardVotes';
import {WEEK_SERIES, weekBars, weekSubtitle, weekTable, weekTooltip} from './voteCharts';

export interface VotesPerWeekProps {
  /** votesPerWeek over `log`: every Monday week of the vote log, oldest first. */
  weeks: readonly WeekCount[];
  /** The whole vote log's first and last days: activityWindow(votes, 'all') (R-36). */
  log: VoteSpan;
  /** The card's own votes (cardVoteSpan), for the subtitle. */
  votes: CardVoteSpan;
  card: Pick<LorcanaCard, 'fullName'>;
}

/**
 * The card's votes per Monday week over the whole vote log (R-36), so every
 * card shares one axis and a card nobody has voted on lately ends in quiet
 * weeks. One series: the latest week in the accent (emphasisKey), the rest
 * neutral, and no legend. The latest and the busiest weeks print their counts
 * ('extremes'), and the x labels thin to at most seven (Vote activity's
 * labelEvery). Part weeks are named as Vote activity names them. The untitled
 * Panel is the card.
 */
export function VotesPerWeek({weeks, log, votes, card}: VotesPerWeekProps) {
  return (
    <Panel>
      <ChartFrame title="Votes per week" subtitle={weekSubtitle({log, votes})} table={weekTable(weeks, {card, log})}>
        <BarChart
          data={weekBars(weeks)}
          series={WEEK_SERIES}
          ariaLabel="Votes per week"
          valueFormat={fmtInt}
          capLabels="extremes"
          xLabelEvery={labelEvery(weeks.length)}
          emphasisKey={weeks.at(-1)?.week}
          tooltip={(bar) => weekTooltip(bar, log)}
        />
      </ChartFrame>
    </Panel>
  );
}
