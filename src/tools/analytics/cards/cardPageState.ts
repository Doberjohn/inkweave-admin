import type {LorcanaCard} from 'inkweave-synergy-engine';

/**
 * What the Card analytics body shows. Each kind carries what its view needs,
 * so the page's switch narrows it with no checks of its own.
 */
export type CardPageState =
  | {kind: 'failed'; error: Error}
  | {kind: 'pick'}
  | {kind: 'loading'}
  | {kind: 'unknown'; cardId: string}
  | {kind: 'card'; card: LorcanaCard};

/** The URL's card id, beside what the page reads from the shell's card list (useCardDataContext). */
export interface CardRoute {
  cardId: string | undefined;
  isLoading: boolean;
  error: Error | null;
  getCardById: (id: string) => LorcanaCard | undefined;
}

/**
 * The body's state, decided in one order:
 * 1. A failed card list, on bare /cards too: the switcher searches that list,
 *    so the prompt would have nothing to offer.
 * 2. No id: the "Pick a card" prompt (R-28). It waits for nothing.
 * 3. A list still loading: "Loading cards…".
 * 4. The card, or the not-found message for an id the list doesn't hold (R-29).
 * The card is looked up here, during render. getCardById is a new function on
 * every CardDataProvider render (CardDataContext.tsx:29), so an effect that
 * called it would re-run on each one.
 */
export function cardPageState({cardId, isLoading, error, getCardById}: CardRoute): CardPageState {
  if (error) return {kind: 'failed', error};
  if (!cardId) return {kind: 'pick'};
  if (isLoading) return {kind: 'loading'};
  const card = getCardById(cardId);
  return card ? {kind: 'card', card} : {kind: 'unknown', cardId};
}
