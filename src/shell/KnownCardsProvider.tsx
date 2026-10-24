import type {ReactNode} from 'react';
import {useCardDataContext} from '../app-bridge';
import {CardArtContext, KnownCardsContext, cardArtOf} from './knownCards';

/**
 * Gives the pages under it the card list's id check (KnownCardsContext) and
 * its art (CardArtContext). The list is the app's: Core cards with the
 * preview cards merged in. While it loads, or after it fails, it holds no
 * card, so names stay text, and no link shows art, until it lands.
 * AdminShell mounts it inside CardDataProvider.
 */
export function KnownCardsProvider({children}: {children: ReactNode}) {
  const {cards, getCardById} = useCardDataContext();
  return (
    <KnownCardsContext value={(cardId) => getCardById(cardId) !== undefined}>
      <CardArtContext value={cardArtOf(cards)}>{children}</CardArtContext>
    </KnownCardsContext>
  );
}
