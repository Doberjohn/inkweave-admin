import type {LorcanaCard} from 'inkweave-synergy-engine';
import {SPACING} from '../../../app-bridge';
import {Notice} from '../../../ui/Notice';
import {twoUp} from '../../../ui/layout';
import {activityWindow, type VoteSpan} from '../activity/activityModel';
import type {UseVoteAnalyticsReturn} from '../useVoteAnalytics';
import type {UseVoteLogReturn} from '../useVoteLog';
import type {VoteAnalytics} from '../voteAnalyticsTypes';
import {CommunityScores} from './CommunityScores';
import {VoterAnswers} from './VoterAnswers';
import {VotesPerWeek} from './VotesPerWeek';
import {rawVotesFor} from './cardView';
import {cardAnswers, cardVoteSpan, scoreHistogram, votesPerWeek, type CardVote} from './cardVotes';
import {engineAverage} from './voteCharts';

export interface RawVotePanelsProps {
  card: Pick<LorcanaCard, 'id' | 'fullName'>;
  /** Read for hasRawVotes and the card's engine average only: the panels never wait for it. */
  analytics: UseVoteAnalyticsReturn;
  voteLog: UseVoteLogReturn;
}

/** The section's two rows: the histogram beside the answers, then the weekly chart at full width. */
const SECTION: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: SPACING.xl};
// R2's chart track (CalibrationWorkspace's charts row): a 334px plot keeps all ten score labels and ChartTooltip's 304px floor.
const ANSWERS_ROW = twoUp(376);

/** Deploy ran without the service-role key, so there are no raw votes: R3-6a's word for it is rawVotesFor's 'none'. */
function RawVotesNeeded() {
  return (
    <Notice>
      Votes over time, score spread, answers and voters need raw votes. Set the <code>SUPABASE_SERVICE_ROLE_KEY</code>{' '}
      Actions secret, then re-run admin&apos;s Deploy workflow.
    </Notice>
  );
}

/** The vote log isn't in: still loading, or it failed (Vote activity's copy, ActivityView.tsx:134, :136). */
function LogNotice({error}: {error: Error | null}) {
  if (error) {
    return <Notice tone="error">Could not load the vote log. Has the artifact been generated? ({error.message})</Notice>;
  }
  return <Notice>Loading vote log...</Notice>;
}

interface CardPanelsProps {
  card: RawVotePanelsProps['card'];
  /** The card's votes in the log (votesForCard), possibly none. */
  cardVotes: readonly CardVote[];
  /** The whole log's first and last days: activityWindow(votes, 'all') (R-36). */
  logSpan: VoteSpan;
  /** Vote analytics once loaded, for the engine clause; null until then. */
  analytics: VoteAnalytics | null;
}

/** The three panels for a card the log names, or the line that says it names none. */
function CardPanels({card, cardVotes, logSpan, analytics}: CardPanelsProps) {
  const votes = cardVoteSpan(cardVotes);
  if (!votes) return <Notice>No raw votes on this card yet.</Notice>;
  return (
    <div style={SECTION}>
      <div style={ANSWERS_ROW}>
        <CommunityScores histogram={scoreHistogram(cardVotes)} engineAvg={engineAverage(analytics, card)} card={card} />
        <VoterAnswers answers={cardAnswers(cardVotes)} />
      </div>
      <VotesPerWeek weeks={votesPerWeek(cardVotes, logSpan)} log={logSpan} votes={votes} card={card} />
    </div>
  );
}

/**
 * The card page's raw-vote panels (R3-6b): Community scores and How voters
 * answered two-up, then Votes per week at full width. They read the vote log
 * alone, so they never wait for vote analytics, which adds only the histogram
 * subtitle's engine clause once it loads. In their place: the raw-votes
 * notice when there are none (rawVotesFor, the rule R3-6a's KPIs and caption
 * follow), the log's loading and error notices, and "No raw votes on this
 * card yet." for a card no vote names.
 */
export function RawVotePanels({card, analytics, voteLog}: RawVotePanelsProps) {
  const raw = rawVotesFor({analytics: analytics.data, voteLog: voteLog.data, cardId: card.id});
  if (raw.kind === 'none') return <RawVotesNeeded />;
  // 'card' means the log loaded with votes, so the span is there; the check is for the type.
  const logSpan = voteLog.data ? activityWindow(voteLog.data.votes, 'all') : null;
  if (raw.kind === 'waiting' || !logSpan) return <LogNotice error={voteLog.error} />;
  return <CardPanels card={card} cardVotes={raw.cardVotes} logSpan={logSpan} analytics={analytics.data} />;
}
