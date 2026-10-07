import type {LorcanaCard} from 'inkweave-synergy-engine';
import {SPACING} from '../../../app-bridge';
import type {FocusHandoff} from '../../../shell/focusHandoff';
import {twoUp} from '../../../ui/layout';
import {Notice} from '../../../ui/Notice';
import type {UseVoteAnalyticsReturn} from '../useVoteAnalytics';
import type {UseVoteLogReturn} from '../useVoteLog';
import {CardCalibrationPanel} from './CardCalibrationPanel';
import {CardHeader} from './CardHeader';
import {CardKpis} from './CardKpis';
import {calibrationData, rawVotesFor, silentNote, type CardCalibrationData, type RawVotes} from './cardView';
import {EnginePanels} from './EnginePanels';
import {RawVotePanels} from './RawVotePanels';
import type {UseCardSynergiesReturn} from './useCardSynergies';
import {VotedPairsPanel} from './VotedPairsPanel';

export interface CardAnalyticsViewProps {
  card: LorcanaCard;
  analytics: UseVoteAnalyticsReturn;
  voteLog: UseVoteLogReturn;
  /** The page's useCardSynergies(card.id), for the engine panels (R3-6c). */
  synergies: UseCardSynergiesReturn;
  /** The card list's lookup: R-31's "is the partner listed?" and R-33's links only to cards it holds. */
  getCardById: (id: string) => LorcanaCard | undefined;
  /** The page's focus handoff (R-48): the header's h2 takes it. A story leaves it out. */
  handoff?: FocusHandoff;
  /** R4's "Edit in Card studio", at the right of the card header. R3 passes none. */
  headerActions?: React.ReactNode;
}

// PageLayout's body grid (OverviewView's): a grid, not a column flexbox, which collapses panels that clip.
const VIEW: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: SPACING.xxl};
// Calibration beside Voted pairs at the handoff's 420px track (dc.html:600), stacked below 860px of column.
const CALIBRATION_ROW = twoUp(420);

/** Why the calibration panels are missing: vote analytics is loading, or could not be read. */
function AnalyticsNotice({analytics}: {analytics: UseVoteAnalyticsReturn}) {
  if (analytics.error) {
    return <Notice tone="error">Could not load vote analytics. Has the artifact been generated? ({analytics.error.message})</Notice>;
  }
  return analytics.loading ? <Notice>Loading analytics...</Notice> : null;
}

interface CalibrationRowProps {
  calibration: CardCalibrationData;
  raw: RawVotes;
  isListed: (cardId: string) => boolean;
}

/**
 * Calibration for this card beside Voted pairs, or one notice for a card in no
 * pairs[] row. The engine-silent caption (R-31) goes with either: a card
 * whose every vote is engine-silent still says how many pairs it has.
 */
function CalibrationRow({calibration, raw, isListed}: CalibrationRowProps) {
  const {cardPairs, rules} = calibration;
  const note = silentNote({raw, cardPairs, isListed});
  if (cardPairs.length === 0) {
    return <Notice>No score votes on pairs the engine scores yet.{note && ` ${note}`}</Notice>;
  }
  return (
    <div style={CALIBRATION_ROW}>
      <CardCalibrationPanel cardPairs={cardPairs} rules={rules} />
      <VotedPairsPanel cardPairs={cardPairs} isListed={isListed} note={note} />
    </div>
  );
}

/**
 * One card's analytics (R3): the card, then its numbers from vote analytics
 * and the vote log, each section in its own state, so the header never waits
 * for a vote file. R3-6b adds the raw-vote panels and R3-6c the engine view
 * below. The page renders it keyed by card id (R-46), so nothing a section
 * holds carries over to the next card. Purely presentational: the page fetches.
 */
export function CardAnalyticsView({card, analytics, voteLog, synergies, getCardById, handoff, headerActions}: CardAnalyticsViewProps) {
  const calibration = calibrationData(analytics.data, card.id);
  const raw = rawVotesFor({analytics: analytics.data, voteLog: voteLog.data, cardId: card.id});
  const isListed = (id: string) => getCardById(id) !== undefined;
  return (
    <div style={VIEW}>
      <CardHeader card={card} actions={headerActions} handoff={handoff} />
      <AnalyticsNotice analytics={analytics} />
      <CardKpis calibration={calibration} raw={raw} />
      {calibration && <CalibrationRow calibration={calibration} raw={raw} isListed={isListed} />}
      <RawVotePanels card={card} analytics={analytics} voteLog={voteLog} />
      <EnginePanels card={card} synergies={synergies} analytics={analytics} getCardById={getCardById} />
    </div>
  );
}
