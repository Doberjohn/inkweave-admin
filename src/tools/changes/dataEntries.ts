import {isCoreSet} from 'inkweave-synergy-engine';
import {isChaseRarity} from '../../app-bridge';
import {PREVIEW_PATH} from '../reveal/githubClient';
import {withIdName} from '../studio/editSearch';
import {ALL_CARDS_PATH, CATALOG_PATH, COLLECTION_DIR} from '../studio/finishes/finishFiles';

/*
 * The cards and printings of the card data files, by id, so a commit's change to a file
 * reads as changes to its entries (entryDiff.ts). Each file's layout is the one
 * finishFiles.ts writes: previewCards.json and allCards.json hold `cards` (allCards.json's
 * with their other printings under `variants`), the promo catalog holds groups of a card's
 * promos, and the collection files are bare arrays of cards and printings.
 */

/** An entry's keys, as the file holds them. */
export type Fields = Readonly<Record<string, unknown>>;

/** One card or printing in a card data file. */
export interface DataEntry {
  id: string;
  /** The card Edit card opens for it: the card itself, or the card a printing reprints; null for a promo of no card. */
  cardId: string | null;
  /**
   * "Elsa - Snow Queen #42", "Yen Sid - Powerful Sorcerer #223 · Set 4", "Bruno Madrigal - Undetected Uncle 4/D23",
   * or, where another entry of the file has the same, ended by its id: "Dalmatian Puppy - Tail Wagger #4 · Set 3 · id 436".
   */
  label: string;
  /** Its keys. A card of allCards.json leaves out its `variants`, which are entries of their own. */
  fields: Fields;
}

/** A file's entries by id. */
export type EntryMap = ReadonlyMap<string, DataEntry>;

/** What a label shows of a number, a set or a name the data lacks. */
const UNKNOWN = '?';

/** The card a printing reprints, as the file that holds the printing names it. */
interface Base {
  id: unknown;
  fullName: unknown;
}

const text = (value: unknown) => (typeof value === 'string' || typeof value === 'number' ? String(value) : UNKNOWN);

/** A card of Sets 1 to 8 adds its set, as the Printings panel's labels do: its Core reprint has the same name and number. */
function setTail(setCode: unknown): string {
  return typeof setCode !== 'string' || setCode === '' || isCoreSet(setCode) ? '' : ` · Set ${setCode}`;
}

/** What follows a printing's card name: a promo's printed code, else its number and the kind of printing it is. */
function printingCode(entry: Fields): string {
  if (typeof entry.promoGrouping === 'string') {
    const printed = `${text(entry.number)}${typeof entry.artVariant === 'string' ? entry.artVariant : ''}/${entry.promoGrouping}`;
    return typeof entry.printedName === 'string' ? `${printed} · ${entry.printedName}` : printed;
  }
  const kind = typeof entry.rarity === 'string' && isChaseRarity(entry.rarity) ? entry.rarity : 'Alt foil';
  return `#${text(entry.number)} · ${kind}${setTail(entry.setCode)}`;
}

/** A card: its own entry, without the printings allCards.json holds under it. */
function cardEntry(card: Fields): DataEntry {
  const fields = Object.fromEntries(Object.entries(card).filter(([key]) => key !== 'variants'));
  const id = text(card.id);
  return {id, cardId: id, label: `${text(card.fullName)} #${text(card.number)}${setTail(card.setCode)}`, fields};
}

/** A printing, named after the card it reprints: `base` where the file holds it apart, else the entry's own name and baseId. */
function printingEntry(entry: Fields, base: Base | null): DataEntry {
  const cardId = base?.id ?? entry.baseId;
  return {
    id: text(entry.id),
    cardId: cardId === undefined || cardId === null ? null : text(cardId),
    label: `${text(base?.fullName ?? entry.fullName)} ${printingCode(entry)}`,
    fields: entry,
  };
}

const isFields = (value: unknown): value is Fields => typeof value === 'object' && value !== null && !Array.isArray(value);

/** An array's objects, or none for anything else. */
const objects = (value: unknown): Fields[] => (Array.isArray(value) ? value.filter(isFields) : []);

/** previewCards.json and allCards.json: their cards, each with the printings it holds. */
function cardsFile(file: Fields): DataEntry[] {
  return objects(file.cards).flatMap((card) => [
    cardEntry(card),
    ...objects(card.variants).map((variant) => printingEntry(variant, {id: card.id, fullName: card.fullName})),
  ]);
}

/** The promo catalog: each group's promos, named after the group's card. A group with no base card names none. */
function catalogFile(file: Fields): DataEntry[] {
  return [...objects(file.fold), ...objects(file.noBaseCard)].flatMap((group) =>
    objects(group.variants).map((variant) => printingEntry(variant, {id: group.baseId, fullName: group.fullName})),
  );
}

/** A collection file: a printing names the card it reprints (baseId) or its promo set; anything else is a card. */
function collectionEntry(entry: Fields): DataEntry {
  return entry.baseId !== undefined || entry.promoGrouping !== undefined ? printingEntry(entry, null) : cardEntry(entry);
}

/** The entries of one followed file, or null for a file or a layout this doesn't read. */
function entriesOf(path: string, parsed: unknown): DataEntry[] | null {
  if (Array.isArray(parsed)) return path.startsWith(`${COLLECTION_DIR}/`) ? objects(parsed).map(collectionEntry) : null;
  if (!isFields(parsed)) return null;
  if (path === PREVIEW_PATH || path === ALL_CARDS_PATH) return cardsFile(parsed);
  return path === CATALOG_PATH ? catalogFile(parsed) : null;
}

/** The labels that two or more entries of different ids share. */
function sharedLabels(entries: readonly DataEntry[]): ReadonlySet<string> {
  const firstWith = new Map<string, string>();
  const shared = new Set<string>();
  for (const {label, id} of entries) {
    const first = firstWith.get(label);
    if (first === undefined) firstWith.set(label, id);
    else if (first !== id) shared.add(label);
  }
  return shared;
}

/**
 * The entries, each label ending in its id where another entry of the file has it too (withIdName), as
 * the Printings panel ends a twin's (#74): Set 3's Dalmatian Puppy - Tail Wagger cards are all #4, so
 * each reads "Dalmatian Puppy - Tail Wagger #4 · Set 3 · id 436". Every other label stays as it is.
 * The panel tells its rows apart in printingRows.ts's toldApart, by a twin card (twinIdsOf: its set,
 * number and full name) and by the labels one card's pockets share; a file here has only its labels to
 * go by. A change to when either ends a label in its id belongs in both.
 */
function toldApart(entries: readonly DataEntry[]): DataEntry[] {
  const shared = sharedLabels(entries);
  return entries.map((entry) => (shared.has(entry.label) ? {...entry, label: withIdName(entry)} : entry));
}

/** Entries by their id: an id held twice keeps its last entry. */
function byId(entries: readonly DataEntry[]): Map<string, DataEntry> {
  return new Map(entries.map((entry): [string, DataEntry] => [entry.id, entry]));
}

/**
 * A card data file's entries by id, or null for a file this doesn't read. Throws on text
 * that isn't JSON. An id the file holds twice keeps its last entry, and only the entries kept
 * are told apart, so a copy left out ends no other entry's label in its id.
 */
export function readEntries({path, text: fileText}: {path: string; text: string}): EntryMap | null {
  const entries = entriesOf(path, JSON.parse(fileText));
  return entries && byId(toldApart([...byId(entries).values()]));
}
