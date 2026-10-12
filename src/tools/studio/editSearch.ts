import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {filterCards} from '../image/filterCards';
import {REVEAL_SET_CODE} from '../reveal/constants';

/**
 * The most rows Edit card's search lists. The search screen's status line says
 * when a query finds more (R4-5f), so the two agree.
 */
export const SEARCH_LIMIT = 40;

/** Whether a card's data is still the branch file's (Preview) or LorcanaJSON's (Released, image only). */
export type CardTag = 'Preview' | 'Released';

/** One row of Edit card's search: the card, and its tag (null for a reveal-set card while the branch file is unread). */
export interface SearchRow {
  card: LorcanaCard;
  tag: CardTag | null;
}

export interface EditSearchInput {
  /** Every card the search can open: the card list (Core sets 9 and up). */
  cards: readonly LorcanaCard[];
  /** The text in the search field. */
  query: string;
  /** The ids in the target branch's previewCards.json (previewIdsOf); null until it is read, or after a failed read. */
  previewIds: ReadonlySet<number> | null;
}

export interface EditSearchResult {
  /** The first SEARCH_LIMIT matches, tagged. */
  rows: SearchRow[];
  /** Every match: for a blank query, every card. */
  total: number;
}

/** The branch file's ids, the set the search's tags and order read; null while the file is unread or failed. */
export function previewIdsOf(entries: readonly LorcanaJSONCard[] | null): ReadonlySet<number> | null {
  return entries === null ? null : new Set(entries.map((entry) => entry.id));
}

/** The card list's ids are strings; the file's are numbers. */
function inFile(card: LorcanaCard, previewIds: ReadonlySet<number> | null): boolean {
  return previewIds?.has(Number(card.id)) === true;
}

/**
 * A card's tag. The branch file decides for a card of the reveal set: Preview
 * when it holds the id, Released when it doesn't, and null (no tag yet) while it
 * is unread. A card of any other set is Released straight from the card list,
 * as R-71 rules for its kind. An entry the file holds reads Preview whatever its
 * set, as during a pin lag (R-65).
 */
export function cardTag(card: LorcanaCard, previewIds: ReadonlySet<number> | null): CardTag | null {
  if (inFile(card, previewIds)) return 'Preview';
  if (previewIds === null && card.setCode === REVEAL_SET_CODE) return null;
  return 'Released';
}

/**
 * The cards with the branch file's first, each part in the card list's order
 * (R-76). The card list puts preview cards last, so a blank query would
 * otherwise open on set 9's oldest cards, while field edits apply only to
 * preview cards. An unread or empty file leaves the order as it is.
 */
function previewFirst(cards: readonly LorcanaCard[], previewIds: ReadonlySet<number> | null): LorcanaCard[] {
  const preview = cards.filter((card) => inFile(card, previewIds));
  const rest = cards.filter((card) => !inFile(card, previewIds));
  return [...preview, ...rest];
}

/**
 * Edit card's search over every card in the card list (Core sets 9 and up),
 * through the kept filterCards (R-30): fullName or id, either apostrophe style,
 * prefix matches first. The branch file's cards lead each rank, so a blank query
 * lists them first (R-76). One filterCards pass gives the rows and the total.
 */
export function searchCards({cards, query, previewIds}: EditSearchInput): EditSearchResult {
  const matches = filterCards(previewFirst(cards, previewIds), query, Infinity);
  return {
    rows: matches.slice(0, SEARCH_LIMIT).map((card) => ({card, tag: cardTag(card, previewIds)})),
    total: matches.length,
  };
}
