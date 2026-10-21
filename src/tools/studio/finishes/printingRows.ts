import {isCoreSet, type LorcanaCard, type PrintingFinishes} from 'inkweave-synergy-engine';
import {
  finishesOf,
  isChaseRarity,
  promoSetRank,
  smallImageUrl,
  type CollectionPromo,
  type Finish,
} from '../../../app-bridge';
import type {PrintingKind, PrintingRef} from './printingHomes';

/*
 * The rows of Edit card's Printings panel (#68): one for each pocket the binder holds for a card,
 * which is the card itself, each of its other printings and each of its promos, named as the
 * binder names them. The versions a row shows come from the target branch's files, through
 * `valueOf`, and never from the entries listed here, which are the deployed data's.
 */

/** One pocket of the binder, and the versions it comes in. */
export interface PrintingRow {
  ref: PrintingRef;
  /** What the pocket is called: "#59", "#209 · Enchanted", "#223 · Alt foil" or "1/C3". */
  name: string;
  /** The card's name and the pocket's code: "Yen Sid - Powerful Sorcerer #223". */
  label: string;
  /** The pocket's own art, at the small size the binder uses. */
  thumbnail: string | undefined;
  /** The rarity printed on it ("Special" on a promo), or "" where the data names none. */
  rarity: string;
  /** The `finishes` the branch's files give it, or null where they give none. */
  value: PrintingFinishes | null;
  /** The versions it comes in: its value, else the rule its rarity gives (`finishesOf`). */
  shown: readonly Finish[];
}

/**
 * What a card's rows are made from. `valueOf` stays required in any type derived from this one, a
 * `Partial` of it included: TypeScript checks an optional `valueOf` against the one every object
 * inherits from Object, so a source that lacks it fails to type.
 */
export interface PrintingSources {
  card: LorcanaCard;
  /** The card's set's chunk of the collection data: the printings are its entries that name the card as their base. */
  chunk: readonly LorcanaCard[];
  /** Every promo of collection/promos.json: the card's are the ones that name it as their base. */
  promos: readonly CollectionPromo[];
  /** The `finishes` the branch's files give a printing in its primary home, or null where they give none. */
  valueOf: (ref: PrintingRef) => PrintingFinishes | null;
}

/** What a name shows of a number or a promo set the data lacks: the app's own tools write an unknown number so. */
const UNKNOWN = '?';

/** What a printing that keeps its card's rarity is called (Violet Parr's #247). */
const ALT_FOIL = 'Alt foil';

/** Where a printing whose number isn't known sorts: last, as in the binder. */
const UNNUMBERED = Number.MAX_SAFE_INTEGER;

/** What a printing's number orders by. */
const numberKey = (number: number | undefined) => number ?? UNNUMBERED;

/** Printings in collector order. */
const byNumber = (a: LorcanaCard, b: LorcanaCard) => numberKey(a.setNumber) - numberKey(b.setNumber);

/**
 * Promos by their promo set's place in release order, then by number. Two that tie, such as 24A/P2
 * and 24B/P2, keep the file's order.
 */
const byPromoSet = (a: CollectionPromo, b: CollectionPromo) =>
  promoSetRank(a.promoGrouping ?? '') - promoSetRank(b.promoGrouping ?? '') ||
  numberKey(a.number) - numberKey(b.number);

/** A row before its versions are looked up. */
type Pocket = Omit<PrintingRow, 'value' | 'shown'>;

/** What a pocket is made of: its printing's own entry and kind, the code its label ends with, and its name. */
interface PocketParts {
  card: LorcanaCard;
  entry: Pick<LorcanaCard, 'id' | 'rarity' | 'imageUrl' | 'imageHashSm'>;
  kind: PrintingKind;
  code: string;
  name: string;
}

/** A pocket filed under its card's set, with its own id, art and rarity. */
function pocketOf({card, entry, kind, code, name}: PocketParts): Pocket {
  const {setCode = ''} = card;
  return {
    ref: {id: entry.id, kind, setCode, core: isCoreSet(setCode)},
    name,
    label: `${card.fullName} ${code}`,
    thumbnail: smallImageUrl(entry),
    rarity: entry.rarity ?? '',
  };
}

/** A collector number as the binder prints it: "#223". */
const numberCode = (number: number | undefined) => `#${number ?? UNKNOWN}`;

/** The card itself is named by its collector number. */
function cardPocket(card: LorcanaCard): Pocket {
  const code = numberCode(card.setNumber);
  return pocketOf({card, entry: card, kind: 'card', code, name: code});
}

/** An Epic, Enchanted or Iconic printing is named by its rarity; any other printing is an alt foil. */
function printingPocket({card, entry}: {card: LorcanaCard; entry: LorcanaCard}): Pocket {
  const code = numberCode(entry.setNumber);
  const title = isChaseRarity(entry.rarity) ? entry.rarity : ALT_FOIL;
  return pocketOf({card, entry, kind: 'printing', code, name: `${code} · ${title}`});
}

/** A promo is named by the code printed on it: its number, its art if it has two, and its promo set. */
function promoPocket({card, promo}: {card: LorcanaCard; promo: CollectionPromo}): Pocket {
  const {number, artVariant = '', promoGrouping = UNKNOWN} = promo;
  const code = `${number ?? UNKNOWN}${artVariant}/${promoGrouping}`;
  return pocketOf({card, entry: promo, kind: 'promo', code, name: code});
}

/** The pocket as a row: the versions the branch's files give it, and the ones it then shows. */
function withVersions(pocket: Pocket, valueOf: PrintingSources['valueOf']): PrintingRow {
  const value = valueOf(pocket.ref);
  return {...pocket, value, shown: finishesOf({rarity: pocket.rarity, finishes: value ?? undefined})};
}

/** The entries that name `card` as the card they reprint. */
function printingsOf<T extends {baseId?: string}>(card: LorcanaCard, entries: readonly T[]): T[] {
  return entries.filter((entry) => entry.baseId === card.id);
}

/**
 * The card's rows, in the order the panel lists them: the card itself, its printings by number,
 * then its promos by promo set and number. Each row asks `valueOf` once, in that order.
 */
export function printingRowsFor({card, chunk, promos, valueOf}: PrintingSources): PrintingRow[] {
  const pockets = [
    cardPocket(card),
    ...printingsOf(card, chunk).sort(byNumber).map((entry) => printingPocket({card, entry})),
    ...printingsOf(card, promos).sort(byPromoSet).map((promo) => promoPocket({card, promo})),
  ];
  return pockets.map((pocket) => withVersions(pocket, valueOf));
}
