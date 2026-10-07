import {createContext, useContext} from 'react';

/** Whether the card list holds a card with this id: whether /cards/<id> has a card to show. */
export type IsKnownCard = (cardId: string) => boolean;

/** No card list, so no id resolves. */
const NO_CARD_LIST: IsKnownCard = () => false;

/**
 * Which card ids the app's card list holds, so the insights pages link a card
 * name to its Card analytics page only when that page has a card to show
 * (R-33). AdminShell provides it from the card list (KnownCardsProvider).
 * Without a provider, as in a view's own test or story, no id resolves and
 * every name stays text. A test or story that wants links provides its own.
 */
export const KnownCardsContext = createContext<IsKnownCard>(NO_CARD_LIST);

/** The nearest KnownCardsContext's check. */
export function useIsKnownCard(): IsKnownCard {
  return useContext(KnownCardsContext);
}
