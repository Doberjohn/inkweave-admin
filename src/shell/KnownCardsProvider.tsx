import type {ReactNode} from 'react';
import {useCardDataContext} from '../app-bridge';
import {KnownCardsContext} from './knownCards';

/**
 * Gives the pages under it the card list's id check (KnownCardsContext). The
 * list is the app's: Core cards with the preview cards merged in. While it
 * loads, or after it fails, it holds no card, so names stay text until it
 * lands. AdminShell mounts it inside CardDataProvider.
 */
export function KnownCardsProvider({children}: {children: ReactNode}) {
  const {getCardById} = useCardDataContext();
  return <KnownCardsContext value={(cardId) => getCardById(cardId) !== undefined}>{children}</KnownCardsContext>;
}
