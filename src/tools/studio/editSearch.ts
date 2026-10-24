import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {filterCards} from '../image/filterCards';
import {isDeployed, isPrintingsOnly, isRevealPreview} from './branchCards';

/**
 * The most rows Edit card's search lists. The search screen's status line says
 * when a query finds more (R4-5f), so the two agree.
 */
export const SEARCH_LIMIT = 40;

const NO_IDS: ReadonlySet<number> = new Set();
const NO_TWINS: ReadonlySet<string> = new Set();

/**
 * Whether a card's data is still the branch file's (Preview) or LorcanaJSON's (Released). A released
 * card opens for a new image and its printings' versions, and a card of Sets 1 to 8 for its
 * printings' versions alone (#68).
 */
export type CardTag = 'Preview' | 'Released';

/** One row of Edit card's search: the card, and its tag (null for a reveal-set preview card while the branch file is unread). */
export interface SearchRow {
  card: LorcanaCard;
  tag: CardTag | null;
  /** False for a card only the branch file holds: "not deployed yet", with no Card analytics link (R-66, R-33). */
  deployed: boolean;
  /**
   * The card has a twin (twinIdsOf), so the row names its id after its number, "Set 3 · #4 · id 436"
   * (#74). Absent, it has none.
   */
  twin?: boolean;
}

export interface EditSearchInput {
  /**
   * Every card the search can open: the cards only the branch file holds (R-66), then the card
   * list's (Core: Sets 9 and up), then the cards of Sets 1 to 8 (#68).
   */
  cards: readonly LorcanaCard[];
  /** The text in the search field. */
  query: string;
  /** The ids in the target branch's previewCards.json (previewIdsOf); null until it is read, or after a failed read. */
  previewIds: ReadonlySet<number> | null;
  /** The ids only the branch file holds (editSources' branchOnlyIds); with none given, every row is deployed. */
  branchOnlyIds?: ReadonlySet<number>;
  /** The ids of the cards with a twin (twinIdsOf); with none given, no row is a twin's. */
  twinIds?: ReadonlySet<string>;
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
 * A card's tag. The branch file decides for a reveal-set card under a preview
 * id (isRevealPreview): Preview when it holds the id, Released when it doesn't,
 * and null (no tag yet) while it is unread. Any other card is Released straight
 * from the card list, as R-71 rules for its kind: a card of another set, and
 * one of the reveal set under its official id, as graduation leaves them. An
 * entry the file holds reads Preview whatever its set, as during a pin lag
 * (R-65).
 */
export function cardTag(card: LorcanaCard, previewIds: ReadonlySet<number> | null): CardTag | null {
  if (inFile(card, previewIds)) return 'Preview';
  if (previewIds === null && isRevealPreview(card)) return null;
  return 'Released';
}

/**
 * Whether a search row names its card's set: a card of Sets 1 to 8 does, and no other (#68). 178
 * names are in a Core set and in Sets 1 to 8, and for several the two cards share their name,
 * version, inks, rarity and collector number (Ursula - Deceiver is #90 in Set 9 and in Set 3),
 * while their rows open different things: an image control and Save, or printings only. The set
 * is what tells the rows apart. A card whose data names no set has none to name.
 */
export function namesSet(card: Pick<LorcanaCard, 'setCode'>): card is Pick<LorcanaCard, 'setCode'> & {setCode: string} {
  return Boolean(card.setCode) && isPrintingsOnly(card);
}

/**
 * What a search row prints for a card's number: "#59", with the set before it where the row names
 * one (namesSet): "Set 3 · #90". Nothing for a card with no number. A twin's row adds its id after
 * it (SearchRow's `twin`).
 */
export function numberLabel(card: Pick<LorcanaCard, 'setCode' | 'setNumber'>): string {
  if (card.setNumber == null) return '';
  const number = `#${card.setNumber}`;
  return namesSet(card) ? `Set ${card.setCode} · ${number}` : number;
}

/**
 * What twins share: their set, their collector number and their full name. Neither the set nor the
 * number holds a "|", so no two cards' keys run together.
 */
function twinKey({setCode = '', setNumber, fullName}: Pick<LorcanaCard, 'setCode' | 'setNumber' | 'fullName'>): string {
  return `${setCode}|${setNumber ?? ''}|${fullName}`;
}

/**
 * The ids of the cards that have a twin: another card of their set with their full name and number,
 * as Set 3's five Dalmatian Puppy - Tail Wagger cards are all #4, with the same version, ink and
 * rarity too (#74). Only their ids tell apart their search rows, and their printings in the Version
 * changes tray, so both name them. A card listed twice under one id is no twin of itself.
 */
export function twinIdsOf(cards: readonly LorcanaCard[]): ReadonlySet<string> {
  const firstWith = new Map<string, string>();
  const twins = new Set<string>();
  for (const card of cards) {
    const key = twinKey(card);
    const first = firstWith.get(key);
    if (first === undefined) firstWith.set(key, card.id);
    else if (first !== card.id) twins.add(first).add(card.id);
  }
  return twins;
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
 * Edit card's search over every card it can open (`cards`: the branch file's,
 * the card list's and those of Sets 1 to 8), through the kept filterCards
 * (R-30): fullName or id, either apostrophe style, prefix matches first. The
 * branch file's cards lead each rank, so a blank query lists them first (R-76).
 * One filterCards pass gives the rows and the total. Each row says whether
 * inkweave.ink serves it yet (R-66), and whether its card has a twin (#74).
 */
export function searchCards({cards, query, previewIds, branchOnlyIds = NO_IDS, twinIds = NO_TWINS}: EditSearchInput): EditSearchResult {
  const matches = filterCards(previewFirst(cards, previewIds), query, Infinity);
  return {
    rows: matches.slice(0, SEARCH_LIMIT).map((card) => ({
      card,
      tag: cardTag(card, previewIds),
      deployed: isDeployed({card, branchOnlyIds}),
      twin: twinIds.has(card.id),
    })),
    total: matches.length,
  };
}
