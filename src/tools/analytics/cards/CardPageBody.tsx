import {useRef} from 'react';
import {Link} from 'react-router-dom';
import {MIN_CORE_SET, type LorcanaCard} from 'inkweave-synergy-engine';
import {SPACING} from '../../../app-bridge';
import {useTakeHandoff, type FocusHandoff} from '../../../shell/focusHandoff';
import {cardsHref} from '../../../shell/nav';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {BiasBar} from '../../../ui/BiasBar';
import {fmtGap} from '../../../ui/format';
import {Notice} from '../../../ui/Notice';
import {Panel} from '../../../ui/Panel';
import {gapColor} from '../gapColor';
import {MIN_RULE_VOTES} from '../overview/overviewStats';
import type {UseVoteAnalyticsReturn} from '../useVoteAnalytics';
import type {UseVoteLogReturn} from '../useVoteLog';
import type {PairStat} from '../voteAnalyticsTypes';
import {CardAnalyticsView} from './CardAnalyticsView';
import type {CardPageState} from './cardPageState';
import {cardsToReview, type CardToReview} from './cardStats';
import {CELL_LINK, NUMBER} from './cardStyles';
import {RetryNotice} from './RetryNotice';
import type {UseCardSynergiesReturn} from './useCardSynergies';

const LINE: React.CSSProperties = {margin: 0};
const LIST: React.CSSProperties = {listStyle: 'none', margin: 0, padding: 0};
const EMPTY: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.body, color: ADMIN_COLORS.muted};

// The Overview's Rules to review row (RulesToReviewCard.tsx:51-61), less its link column:
// here the name is the link. Names keep 80px, and the bias bar's track gives first.
const REVIEW_ROW: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(80px, 1fr) minmax(0, 100px) 48px',
  alignItems: 'center',
  gap: SPACING.md,
  padding: `${SPACING.sm}px 0`,
  borderBottom: `1px solid ${ADMIN_COLORS.divider}`,
  fontSize: ADMIN_TYPE.body,
};

// Cards to review keeps a card's width, not the body's. The tracks are twoUp(420)'s, as in the card
// view's calibration row, but auto-fill keeps the empty ones, so the one panel fills one track: 420px to
// about 640px, and the whole width below 860px. twoUp's auto-fit would collapse the empty tracks and
// stretch the panel across the body.
const REVIEW_TRACK: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 420px), 1fr))',
  gap: SPACING.xl,
};

/**
 * A Notice for a state with no control of its own. Its line takes a pending
 * handoff (R-48): after Retry, or a link to a card the list doesn't hold, the
 * control pressed is gone, so focus lands on what replaced it.
 */
function FocusNotice({handoff, children}: {handoff: FocusHandoff; children: React.ReactNode}) {
  const ref = useRef<HTMLDivElement>(null);
  useTakeHandoff(handoff, ref, 'p');
  return (
    <div ref={ref}>
      <Notice>
        <p tabIndex={-1} style={LINE}>
          {children}
        </p>
      </Notice>
    </div>
  );
}

/** A Cards to review row: the card's name, which opens its page, its bias bar and its mean gap. */
function ReviewRow({card}: {card: CardToReview}) {
  return (
    <li style={REVIEW_ROW}>
      <Link to={cardsHref(card.cardId)} title={card.cardName} className="adm-link" style={CELL_LINK}>
        {card.cardName}
      </Link>
      {/* minWidth 0: the bar shrinks with its track, as on the Overview. */}
      <BiasBar gap={card.meanGap} minWidth={0} />
      <span style={{...NUMBER, color: gapColor(card.meanGap)}}>{fmtGap(card.meanGap)}</span>
    </li>
  );
}

/**
 * The cards most worth a look (R-28): the five with MIN_RULE_VOTES or more
 * score votes on pairs the engine scores, widest mean gap first
 * (cardsToReview). It reads like the Overview's Rules to review.
 */
function CardsToReview({pairs}: {pairs: readonly PairStat[]}) {
  const cards = cardsToReview(pairs);
  return (
    <Panel title="Cards to review" action="widest gap first">
      {cards.length === 0 ? (
        <p style={EMPTY}>No card has {MIN_RULE_VOTES} or more score votes yet.</p>
      ) : (
        <ul aria-label="Cards to review" style={LIST}>
          {cards.map((card) => (
            <ReviewRow key={card.cardId} card={card} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

/**
 * No card in the URL, and none remembered (R-28): the prompt, and Cards to
 * review once vote analytics has loaded. The prompt waits for nothing, so it
 * shows while the card list loads.
 */
function PickACard({analytics, handoff}: {analytics: UseVoteAnalyticsReturn; handoff: FocusHandoff}) {
  return (
    <>
      <FocusNotice handoff={handoff}>Pick a card: search for it by name in Switch card, above.</FocusNotice>
      {analytics.data && (
        <div style={REVIEW_TRACK}>
          <CardsToReview pairs={analytics.data.pairs} />
        </div>
      )}
    </>
  );
}

export interface CardPageBodyProps {
  state: CardPageState;
  analytics: UseVoteAnalyticsReturn;
  voteLog: UseVoteLogReturn;
  synergies: UseCardSynergiesReturn;
  getCardById: (id: string) => LorcanaCard | undefined;
  /** The card list's retryLoad. */
  onRetry: () => void;
  /** The page's (R-48). Whichever state replaces the control that went takes it. */
  handoff: FocusHandoff;
}

/**
 * The Card analytics body, one state at a time (cardPageState). The card's
 * view is keyed by its id (R-46): one route element serves every card, so
 * without the key a frame's Table view, the pair list's scroll and the
 * network's hover would carry over to the next card.
 */
export function CardPageBody({state, onRetry, handoff, ...data}: CardPageBodyProps) {
  switch (state.kind) {
    case 'failed':
      // Every other state needs the card list. Retry shows "Loading cards…", so the page asks for a
      // handoff as the error clears; the next state takes it, or the new Retry if the list fails again.
      return (
        <RetryNotice onRetry={onRetry} handoff={handoff}>
          Could not load the card list ({state.error.message})
        </RetryNotice>
      );
    case 'pick':
      return <PickACard analytics={data.analytics} handoff={handoff} />;
    case 'loading':
      return <Notice>Loading cards…</Notice>;
    case 'unknown':
      return (
        <FocusNotice handoff={handoff}>
          No card has the id <code>{state.cardId}</code> in the current card list. Cards from sets before{' '}
          {MIN_CORE_SET} rotated out of Core, and a preview id changes when its card is released.
        </FocusNotice>
      );
    case 'card':
      return <CardAnalyticsView key={state.card.id} card={state.card} handoff={handoff} {...data} />;
  }
}
