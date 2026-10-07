import type {ReactElement} from 'react';
import {render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {KnownCardsContext} from '../shell/knownCards';

/**
 * Renders `ui` the way a page in the shell sees it: in a router, under a card
 * list that holds the `known` ids (KnownCardsContext). Card names with those
 * ids render as links, every other name as text.
 */
export function renderWithCards(ui: ReactElement, known: readonly string[]) {
  return render(
    <MemoryRouter>
      <KnownCardsContext value={(cardId) => known.includes(cardId)}>{ui}</KnownCardsContext>
    </MemoryRouter>,
  );
}
