import type {ReactElement} from 'react';
import {render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {CardArtContext, KnownCardsContext, type CardArt} from '../shell/knownCards';

/** Ids to image URLs: the art a test's card list holds. */
export type ArtById = Readonly<Record<string, string>>;

/** The CardArtContext lookup over `art`, as KnownCardsProvider gives it from a card list. */
export function artLookup(art: ArtById): CardArt {
  return (id) => (Object.hasOwn(art, id) ? art[id] : undefined);
}

/**
 * The art preview showing `art`, if one is: its image, which is alt-less
 * decoration with no role to find it by, on document.body.
 */
export function shownArt(art: string): HTMLImageElement | null {
  return document.body.querySelector<HTMLImageElement>(`img[src="${art}"]`);
}

/**
 * Renders `ui` the way a page in the shell sees it: in a router, under a card
 * list that holds the `known` ids (KnownCardsContext) and the `art` of some
 * (CardArtContext). Card names with those ids render as links, every other
 * name as text, and a link with art shows it on hover or keyboard focus.
 */
export function renderWithCards(ui: ReactElement, known: readonly string[], art: ArtById = {}) {
  return render(
    <MemoryRouter>
      <KnownCardsContext value={(cardId) => known.includes(cardId)}>
        <CardArtContext value={artLookup(art)}>{ui}</CardArtContext>
      </KnownCardsContext>
    </MemoryRouter>,
  );
}
