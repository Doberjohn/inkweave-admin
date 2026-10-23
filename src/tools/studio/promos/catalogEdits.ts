import type {PrintingFinishes} from 'inkweave-synergy-engine';
import {byPrintingOrder} from '../../../app-bridge';
import {
  PROVISIONAL_ID_BASE,
  findPrinting,
  nextProvisionalId,
  printingCode,
  recountStats,
  type BaseCard,
  type CatalogNote,
  type CatalogPrinting,
  type FoldGroup,
  type PromoCatalog,
  type WaitingGroup,
} from './promoCatalog';

/*
 * An add or an edit of a promo printing, applied to the owner's catalog (#77). Each returns a new
 * catalog and leaves the one it was given as it was. It changes what the printing reaches and nothing
 * else: its entry, its group, its line in `provisionalIds`, the notes and the counts in `stats`. All of
 * them keep the shapes the file has, so the commit's diff shows only that. Whether the change is
 * allowed (a code that is free, a promo set the app knows) is for the caller to settle first.
 */

/** A printing to add: what the owner chose for it. */
export interface NewPrinting {
  promoGrouping: string;
  number: number;
  finishes: PrintingFinishes;
  /** The language of its scan, or null for English, which the catalog leaves out. */
  scanLanguage: string | null;
}

/** What an edit changes of a printing: its promo set, its number and its scan's language. */
export interface PrintingEdit {
  promoGrouping: string;
  number: number;
  /** The language of its scan, or null for English, which the catalog leaves out. */
  scanLanguage: string | null;
}

/** The keys of an entry in the order the catalog writes them. Every entry in the file follows it. */
const ENTRY_KEYS: readonly (keyof CatalogPrinting)[] = [
  'id',
  'rarity',
  'number',
  'promoGrouping',
  'finish',
  'artVariant',
  'printedName',
  'images',
  'scanLanguage',
  'promoSource',
  'finishes',
];

/** Where a key sits in the catalog's order. A key the order doesn't name sits after all that it does. */
function keyRank(key: string): number {
  const at = ENTRY_KEYS.findIndex((known) => known === key);
  return at === -1 ? ENTRY_KEYS.length : at;
}

/**
 * The entry with its keys in the catalog's order. A key with no value is left out. A key the order
 * doesn't name stays after the others, so a field the app adds later is never dropped. An entry that
 * is already in order comes out as it went in.
 */
function inKeyOrder(entry: CatalogPrinting): CatalogPrinting {
  const present = Object.entries(entry).filter(([, value]) => value !== undefined);
  return Object.fromEntries(present.sort(([a], [b]) => keyRank(a) - keyRank(b))) as CatalogPrinting;
}

/** A new printing's entry: its id, rarity and code, then its scan's language where that isn't English, then its versions. */
function newEntry({id, printing}: {id: number; printing: NewPrinting}): CatalogPrinting {
  return inKeyOrder({
    id,
    rarity: 'Special',
    number: printing.number,
    promoGrouping: printing.promoGrouping,
    scanLanguage: printing.scanLanguage ?? undefined,
    finishes: structuredClone(printing.finishes),
  });
}

/** The entry as the edit leaves it: its code and scan language changed, every other key as it was. */
function editedEntry({printing, edit}: {printing: CatalogPrinting; edit: PrintingEdit}): CatalogPrinting {
  return inKeyOrder({
    ...printing,
    number: edit.number,
    promoGrouping: edit.promoGrouping,
    scanLanguage: edit.scanLanguage ?? undefined,
  });
}

/** A group's printings in the order the app shows them. The sort is stable, so printings that tie keep their places. */
function inPrintingOrder(variants: readonly CatalogPrinting[]): CatalogPrinting[] {
  return [...variants].sort(byPrintingOrder);
}

/**
 * The group of `groups` that `isOf` picks out, or where there is none, the one `start` makes, filed
 * before the first group that `follows` it, or last where none does. Only that filing changes `groups`.
 */
function groupIn<G>({groups, isOf, start, follows}: {
  groups: G[];
  isOf: (group: G) => boolean;
  start: () => G;
  follows: (group: G) => boolean;
}): G {
  const held = groups.find(isOf);
  if (held) return held;
  const group = start();
  const at = groups.findIndex(follows);
  groups.splice(at === -1 ? groups.length : at, 0, group);
  return group;
}

/**
 * Whether the group sorts after the card: by base set, in natural order, then by base number. A group
 * with no base number sorts after nothing, so Hades - Dark Usurper's is passed over.
 */
function sortsAfter(group: WaitingGroup, card: BaseCard): boolean {
  if (group.baseNumber === null) return false;
  const bySet = group.baseSetCode.localeCompare(card.setCode, undefined, {numeric: true});
  return (bySet || group.baseNumber - card.number) > 0;
}

/**
 * The group that holds the card's promos. A Core card's is in `fold`, found by `baseId` and filed in that
 * order. Any other card's is in `noBaseCard`, found by its LorcanaJSON id and filed by base set and number.
 * A card the catalog has no group for gets one, started with the section's keys.
 */
function groupFor({catalog, card}: {catalog: PromoCatalog; card: BaseCard}): FoldGroup | WaitingGroup {
  const {id, fullName, setCode, number} = card;
  if (card.core) {
    return groupIn({
      groups: catalog.fold,
      isOf: (group) => group.baseId === id,
      start: () => ({baseId: id, fullName, setCode, number, variants: []}),
      follows: (group) => group.baseId > id,
    });
  }
  return groupIn({
    groups: catalog.noBaseCard,
    isOf: (group) => group.lorcanaJsonBaseId === id,
    start: () => ({fullName, lorcanaJsonBaseId: id, baseSetCode: setCode, baseNumber: number, variants: []}),
    follows: (group) => sortsAfter(group, card),
  });
}

/**
 * A provisional line with its leading code replaced. The rest of it stays, "(Championship (36 copies))"
 * in Hades - Dark Usurper's included.
 */
function relabeled({line, code}: {line: string; code: string}): string {
  return line.replace(/^\S+/, () => code);
}

/**
 * The provisional lines with the printing's line right: renamed to its code where it has one, made
 * from its code and card where a provisional id has none. A LorcanaJSON id has no line and gets none.
 * The ids list themselves in id order, whatever the order they were added in.
 */
function withLine({lines, printing, fullName}: {
  lines: Record<string, string>;
  printing: CatalogPrinting;
  fullName: string;
}): Record<string, string> {
  const held: string | undefined = lines[printing.id];
  if (held === undefined && printing.id < PROVISIONAL_ID_BASE) return lines;
  const code = printingCode(printing);
  return {...lines, [printing.id]: held === undefined ? `${code} ${fullName}` : relabeled({line: held, code})};
}

/** The notes with the owner's note last, filed under the printing's code and its card. A blank note adds none. */
function withNote({notes, printing, fullName, note}: {
  notes: CatalogNote[];
  printing: CatalogPrinting;
  fullName: string;
  note: string | null;
}): CatalogNote[] {
  const text = note?.trim();
  if (!text) return notes;
  return [...notes, {printing: printingCode(printing), card: fullName, note: text}];
}

/** What an add and an edit both end with, once the printing is in its group: its line, its note and the counts. */
function settled({catalog, printing, fullName, note}: {
  catalog: PromoCatalog;
  printing: CatalogPrinting;
  fullName: string;
  note: string | null;
}): PromoCatalog {
  return {
    ...catalog,
    provisionalIds: withLine({lines: catalog.provisionalIds, printing, fullName}),
    notes: withNote({notes: catalog.notes, printing, fullName, note}),
    stats: recountStats(catalog),
  };
}

/**
 * The catalog with a new printing of `card` in its group, and the id it took: the next provisional one.
 * A card with no group gets one, in its section's order. The printing's versions are copied, not shared.
 */
export function withNewPrinting({catalog, card, printing, note}: {
  catalog: PromoCatalog;
  card: BaseCard;
  printing: NewPrinting;
  note: string | null;
}): {catalog: PromoCatalog; id: number} {
  const next = structuredClone(catalog);
  const id = nextProvisionalId(next);
  const entry = newEntry({id, printing});
  const group = groupFor({catalog: next, card});
  group.variants = inPrintingOrder([...group.variants, entry]);
  return {catalog: settled({catalog: next, printing: entry, fullName: group.fullName, note}), id};
}

/**
 * The catalog with the printing `id` changed to `edit`. Its id, its art and its other keys stay as
 * they are, and it keeps its group. Throws where the catalog holds no such printing.
 */
export function withEditedPrinting({catalog, id, edit, note}: {
  catalog: PromoCatalog;
  id: number;
  edit: PrintingEdit;
  note: string | null;
}): PromoCatalog {
  const next = structuredClone(catalog);
  const found = findPrinting(next, id);
  if (!found) throw new Error(`${id} isn't in the catalog`);
  const {printing, group} = found;
  const edited = editedEntry({printing, edit});
  group.variants = inPrintingOrder(group.variants.map((held) => (held === printing ? edited : held)));
  return settled({catalog: next, printing: edited, fullName: group.fullName, note});
}
