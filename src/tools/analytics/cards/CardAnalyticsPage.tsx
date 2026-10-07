import {useEffect, useState} from 'react';
import {Navigate, NavigationType, useNavigationType, useParams} from 'react-router-dom';
import {useCardDataContext} from '../../../app-bridge';
import {useFocusHandoff, type FocusHandoff} from '../../../shell/focusHandoff';
import {cardsHref} from '../../../shell/nav';
import {PageLayout} from '../../../shell/PageLayout';
import {DataAsOf} from '../../../ui/DataAsOf';
import {useVoteAnalytics} from '../useVoteAnalytics';
import {useVoteLog} from '../useVoteLog';
import {CardPageBody} from './CardPageBody';
import {CardSwitcher} from './CardSwitcher';
import {cardPageState, type CardPageState} from './cardPageState';
import {forgetLastCard, readLastCard, writeLastCard} from './lastCard';
import {useCardSynergies} from './useCardSynergies';

/** What the focus handoff watches: the card the URL names, and whether the card list has failed. */
interface Watched {
  cardId: string | undefined;
  failed: boolean;
}

/**
 * Whether the move from `before` to `now` leaves focus for the next state to
 * take (R-48). Two moves do: the card list's error clearing, which only Retry
 * does, and the URL naming another card, unless a redirect did it (`replaced`):
 * bare /cards opening the last card is no one's action.
 */
function asksForFocus(before: Watched, now: Watched & {replaced: boolean}): boolean {
  if (before.failed && !now.failed) return true;
  return now.cardId !== before.cardId && now.cardId !== undefined && !now.replaced;
}

/**
 * The page's focus handoff (R-48). The page asks for it when the state moves
 * on, not in a click handler: a link's navigation renders as a transition,
 * after the click's own update, so the old card's h2 would take a request made
 * on click. The state that takes it moves focus only if focus fell to <body>
 * (useTakeHandoff): a partner link or Retry goes with the state it sat in, but
 * after a switcher pick focus is still in the switcher, and it stays there.
 */
function useCardHandoff(watched: Watched): FocusHandoff {
  const handoff = useFocusHandoff();
  const replaced = useNavigationType() === NavigationType.Replace;
  const [seen, setSeen] = useState(watched);
  if (seen.cardId !== watched.cardId || seen.failed !== watched.failed) {
    setSeen(watched);
    if (asksForFocus(seen, {...watched, replaced})) handoff.request();
  }
  return handoff;
}

/**
 * Remembers the card on screen as the last one viewed (R-28), and forgets an
 * id the loaded card list doesn't hold. A list that is loading or has failed
 * is neither, so it never costs a good id.
 */
function useRememberCard(state: CardPageState) {
  useEffect(() => {
    if (state.kind === 'card') writeLastCard(state.card.id);
    if (state.kind === 'unknown') forgetLastCard(state.cardId);
  }, [state]);
}

/**
 * Card analytics (/cards/:cardId?): one card's votes, calibration and engine
 * data. The header's Switch card picks the card, and bare /cards opens the
 * last card viewed, or the "Pick a card" prompt. The header and the engine
 * view never wait for the vote files. Read-only, so no branch notice.
 */
export function CardAnalyticsPage() {
  const {cardId} = useParams();
  const cardData = useCardDataContext();
  const state = cardPageState({...cardData, cardId});
  const analytics = useVoteAnalytics();
  const voteLog = useVoteLog();
  // The URL's id, not the resolved card's: the synergy file loads while the card list does.
  const synergies = useCardSynergies(cardId ?? null);
  const handoff = useCardHandoff({cardId, failed: state.kind === 'failed'});
  useRememberCard(state);

  // Every hook has run: bare /cards may now hand over to the last card viewed.
  const last = cardId ? null : readLastCard();
  if (last) return <Navigate to={cardsHref(last)} replace />;
  return (
    <PageLayout
      title="Card analytics"
      subtitle="Votes, calibration and engine data for one card"
      meta={analytics.data ? <DataAsOf generatedAt={analytics.data.generatedAt} /> : undefined}
      actions={<CardSwitcher cards={cardData.cards} />}
      documentTitle={state.kind === 'card' ? `${state.card.fullName} · Card analytics` : undefined}
      // A new card opens at the top of the body; the header stays put, and so does the switcher's focus.
      scrollKey={cardId}>
      <CardPageBody
        state={state}
        analytics={analytics}
        voteLog={voteLog}
        synergies={synergies}
        getCardById={cardData.getCardById}
        onRetry={cardData.retryLoad}
        handoff={handoff}
      />
    </PageLayout>
  );
}
