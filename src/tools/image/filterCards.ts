import type {LorcanaCard} from 'inkweave-synergy-engine';

/**
 * Typographic single quotes (U+2018, U+2019). iOS types ’ for ', and Set 14's
 * preview names print it ("Peter Pan’s Shadow"). The search spells both ' in
 * the query and in every name, as the app's own name search does (the private
 * searchKey in its features/cards/loader.ts), so either style finds the other.
 * Global flag: use with .replace only.
 */
const TYPOGRAPHIC_APOSTROPHE = /[‘’]/g;

/** A card's fullName as the search compares it: lowercase, with ‘ and ’ spelled '. */
function nameKey(card: LorcanaCard): string {
  return card.fullName.toLowerCase().replace(TYPOGRAPHIC_APOSTROPHE, "'");
}

/**
 * Filter a card list by a search query. Matches the query against card fields
 * (case-insensitive, either apostrophe style) and returns at most `limit`
 * cards. A blank query returns the head of the list.
 */
export function filterCards(cards: LorcanaCard[], query: string, limit = 40): LorcanaCard[] {
  const q = query.trim().toLowerCase().replace(TYPOGRAPHIC_APOSTROPHE, "'");
  if (q === '') return cards.slice(0, limit);

  // fullName is "name - version", so matching it covers name and version in one
  // check; id (a numeric string) needs its own.
  const matches = cards.filter(
    (c) => nameKey(c).includes(q) || c.id.includes(q),
  );
  // Surface prefix matches first ("els" -> "Elsa" before "Consuela"); sort is
  // stable, so same-rank cards keep their original order.
  matches.sort((a, b) => {
    const aPrefix = nameKey(a).startsWith(q) ? 0 : 1;
    const bPrefix = nameKey(b).startsWith(q) ? 0 : 1;
    return aPrefix - bPrefix;
  });
  return matches.slice(0, limit);
}
