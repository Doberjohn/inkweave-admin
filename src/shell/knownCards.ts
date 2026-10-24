import {createContext, useContext} from 'react';
import type {LorcanaCard} from 'inkweave-synergy-engine';

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

/** The art of a card, or of one of its printings, by id: its image URL, or undefined for none. */
export type CardArt = (id: string) => string | undefined;

/** No card list, so no art. */
const NO_ART: CardArt = () => undefined;

/**
 * The art the card list holds, so a card link can show a card's art beside
 * its name (CardLink). AdminShell provides it from the card list, beside
 * KnownCardsContext (KnownCardsProvider). Without a provider, as in a view's
 * own test or story, no id has art and every card link is a plain link. A
 * test or story that wants art provides its own.
 */
export const CardArtContext = createContext<CardArt>(NO_ART);

/** The nearest CardArtContext's lookup. */
export function useCardArt(): CardArt {
  return useContext(CardArtContext);
}

/**
 * The art of `cards` by id: each card's own, and each of its printings' own,
 * so an Enchanted printing shows its Enchanted art. A card or printing
 * without an image URL has none.
 */
export function cardArtOf(cards: readonly LorcanaCard[]): CardArt {
  const art = new Map<string, string>();
  for (const {id, imageUrl} of cards.flatMap((card) => [card, ...(card.variants ?? [])])) {
    if (imageUrl) art.set(id, imageUrl);
  }
  return (id) => art.get(id);
}
