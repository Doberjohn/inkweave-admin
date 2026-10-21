import type {LorcanaCard, LorcanaJSONCard, PrintingFinishes, RawCardVariant} from 'inkweave-synergy-engine';
import {
  transformPromos,
  transformRawCards,
  type CollectionPromo,
  type RawCollectionPromo,
} from '../../../../app-bridge';
import {printingRowsFor, type PrintingRow} from '../printingRows';

/*
 * Fixtures for the printing versions' tests and stories (#68): real entries of the pinned app's
 * card data, trimmed to the fields the app's transforms and a Printings row read, then run
 * through those transforms (`transformRawCards`, `transformPromos`), so each is a card or a promo
 * as collection mode holds it. A `*_ENTRIES` list is the entries as their file stores them, in
 * the file's order, which is not always the order a card's rows show.
 */

/** The cards `entries` make. An entry the app's transform refuses is a broken fixture, not a missing card. */
function cardsOf(entries: readonly LorcanaJSONCard[]): LorcanaCard[] {
  const cards = transformRawCards(entries);
  if (cards.length !== entries.length) throw new Error("a fixture entry is one the app's transform refuses");
  return cards;
}

/** The card of `cards` with this id. */
function cardWithId(cards: readonly LorcanaCard[], id: string): LorcanaCard {
  const card = cards.find((candidate) => candidate.id === id);
  if (!card) throw new Error(`fixture card ${id} isn't in its list`);
  return card;
}

/**
 * Set 4's chunk (collection/4.json), trimmed to Yen Sid - Powerful Sorcerer: the card (#59), its
 * Enchanted (#209) and its alt foil (#223), the one of them whose data names its versions.
 */
export const SET_4_ENTRIES: LorcanaJSONCard[] = [
  {
    id: 750,
    name: 'Yen Sid',
    version: 'Powerful Sorcerer',
    fullName: 'Yen Sid - Powerful Sorcerer',
    cost: 2,
    color: 'Amethyst',
    inkwell: true,
    type: 'Character',
    setCode: '4',
    number: 59,
    rarity: 'Legendary',
    images: {thumbnail: 'https://api.lorcana.ravensburger.com/images/en/set4/59_76659fe23e04491738b6dd45a0cea0f9ee249b8b.jpg'},
  },
  {
    id: 900,
    name: 'Yen Sid',
    version: 'Powerful Sorcerer',
    fullName: 'Yen Sid - Powerful Sorcerer',
    cost: 2,
    color: 'Amethyst',
    inkwell: true,
    type: 'Character',
    setCode: '4',
    number: 209,
    rarity: 'Enchanted',
    baseId: 750,
    images: {thumbnail: 'https://api.lorcana.ravensburger.com/images/en/set4/209_c0edd03ff85d0107fb4039901c400266ecd93b7f.jpg'},
  },
  {
    id: 946,
    name: 'Yen Sid',
    version: 'Powerful Sorcerer',
    fullName: 'Yen Sid - Powerful Sorcerer',
    cost: 2,
    color: 'Amethyst',
    inkwell: true,
    type: 'Character',
    setCode: '4',
    number: 223,
    rarity: 'Legendary',
    baseId: 750,
    images: {thumbnail: 'https://api.lorcana.ravensburger.com/images/en/set4/223_f93707ee2fdad5184aac3a8d921e48418cccea4d.jpg'},
    finishes: ['foil'],
  },
];

/** A Sets 1 to 8 card's chunk holds the card and its printings alike. */
export const SET_4: LorcanaCard[] = cardsOf(SET_4_ENTRIES);

/** Yen Sid - Powerful Sorcerer, Set 4 #59: a Legendary of a pre-Core set. */
export const YEN_SID: LorcanaCard = cardWithId(SET_4, '750');

/**
 * Yen Sid's rows in the Printings panel, as a branch whose files name the alt foil's versions and
 * no other's gives them: #59 (no field, so Both), #209 Enchanted (no field, so Foil) and #223 Alt
 * foil (`["foil"]`, Foil).
 */
export const YEN_SID_ROWS: PrintingRow[] = printingRowsFor({
  card: YEN_SID,
  chunk: SET_4,
  promos: [],
  valueOf: (ref) => (ref.id === '946' ? ['foil'] : null),
});

/**
 * Ursula - Deceiver as allCards.json stores her: Set 9 #90. Set 3 holds her too (`URSULA_SET_3_ENTRY`), under the
 * same name, version, ink, rarity and collector number. 178 names are in a Core set and in Sets 1 to 8, and
 * for several of them nothing but the set tells the two cards' rows in Edit card's search apart.
 */
export const URSULA_SET_9_ENTRY: LorcanaJSONCard = {
  id: 2026,
  name: 'Ursula',
  version: 'Deceiver',
  fullName: 'Ursula - Deceiver',
  cost: 2,
  color: 'Emerald',
  inkwell: true,
  type: 'Character',
  setCode: '9',
  number: 90,
  rarity: 'Uncommon',
  images: {thumbnail: 'https://api.lorcana.ravensburger.com/images/en/set9/90_604b7ec455cf896bbbe99163c01ccbff91c40a7e.jpg'},
};

/** Ursula - Deceiver as Set 3's chunk stores her: #90, as in Set 9. */
export const URSULA_SET_3_ENTRY: LorcanaJSONCard = {
  ...URSULA_SET_9_ENTRY,
  id: 526,
  setCode: '3',
  images: {thumbnail: 'https://api.lorcana.ravensburger.com/images/en/set3/90_fba1ba5c2a26d6273dd67f23f35e71bfa79ca8ad.jpg'},
};

/** Ursula - Deceiver of Set 9, a card of the app's card list. */
export const URSULA_SET_9: LorcanaCard = cardWithId(cardsOf([URSULA_SET_9_ENTRY]), '2026');

/** Ursula - Deceiver of Set 3, a card of Sets 1 to 8. */
export const URSULA_SET_3: LorcanaCard = cardWithId(cardsOf([URSULA_SET_3_ENTRY]), '526');

/** Mother Knows Best, as allCards.json stores it: Set 9 #99, with its two C3 promos under `variants`. */
export const MOTHER_KNOWS_BEST_ENTRY: LorcanaJSONCard = {
  id: 2035,
  name: 'Mother Knows Best',
  fullName: 'Mother Knows Best',
  cost: 3,
  color: 'Emerald',
  inkwell: false,
  type: 'Action',
  setCode: '9',
  number: 99,
  rarity: 'Uncommon',
  images: {thumbnail: 'https://api.lorcana.ravensburger.com/images/en/set9/99_e3280e3cef3bceaf7cd08499916ea989ebda9fdf.jpg'},
  variants: [
    {id: 80017, rarity: 'Special', number: 1, promoGrouping: 'C3', finishes: ['normal']},
    {id: 80024, rarity: 'Special', number: 13, promoGrouping: 'C3', finishes: ['foil']},
  ],
};

/** Mother Knows Best: an Uncommon of a Core set, with no printing of its own in a chunk. */
export const MOTHER_KNOWS_BEST: LorcanaCard = cardWithId(cardsOf([MOTHER_KNOWS_BEST_ENTRY]), '2035');

/** Its promos, 1/C3 and 13/C3, as collection/promos.json stores them: normal only and foil only. */
export const C3_MKB_ENTRIES: RawCollectionPromo[] = [
  {
    id: 80017,
    rarity: 'Special',
    number: 1,
    promoGrouping: 'C3',
    fullName: 'Mother Knows Best',
    baseId: 2035,
    finishes: ['normal'],
  },
  {
    id: 80024,
    rarity: 'Special',
    number: 13,
    promoGrouping: 'C3',
    fullName: 'Mother Knows Best',
    baseId: 2035,
    finishes: ['foil'],
  },
];

export const C3_MKB: CollectionPromo[] = transformPromos(C3_MKB_ENTRIES);

/** The same two promos as allCards.json's `variants` and the promo catalog store them. */
export const MKB_VARIANTS: RawCardVariant[] = MOTHER_KNOWS_BEST_ENTRY.variants ?? [];

/**
 * Mother Knows Best's rows, as a branch whose catalog names its promos' versions gives them: #99 (no
 * field, so Both), 1/C3 (`["normal"]`, Normal only) and 13/C3 (`["foil"]`, Foil only).
 */
export const MKB_ROWS: PrintingRow[] = printingRowsFor({
  card: MOTHER_KNOWS_BEST,
  chunk: [],
  promos: C3_MKB,
  valueOf: (ref) => C3_MKB.find((promo) => promo.id === ref.id)?.finishes ?? null,
});

/** Pegasus - Gift for Hercules, as allCards.json stores it: Set 9 #84. */
export const PEGASUS_ENTRY: LorcanaJSONCard = {
  id: 2020,
  name: 'Pegasus',
  version: 'Gift for Hercules',
  fullName: 'Pegasus - Gift for Hercules',
  cost: 1,
  color: 'Emerald',
  inkwell: true,
  type: 'Character',
  setCode: '9',
  number: 84,
  rarity: 'Common',
  images: {thumbnail: 'https://api.lorcana.ravensburger.com/images/en/set9/84_2f2fb54f921f94518627a229467314ef7b310cb6.jpg'},
};

/** Pegasus: a Common of a Core set, whose Epic printing sits in Set 9's chunk and whose promos are in C2. */
export const PEGASUS: LorcanaCard = cardWithId(cardsOf([PEGASUS_ENTRY]), '2020');

/** Set 9's chunk (collection/9.json), trimmed to Pegasus's Epic #212: a Core chunk holds printings only. */
export const SET_9_ENTRIES: LorcanaJSONCard[] = [
  {
    id: 2166,
    name: 'Pegasus',
    version: 'Gift for Hercules',
    fullName: 'Pegasus - Gift for Hercules',
    cost: 1,
    color: 'Emerald',
    inkwell: true,
    type: 'Character',
    setCode: '9',
    number: 212,
    rarity: 'Epic',
    baseId: 2020,
    images: {thumbnail: 'https://api.lorcana.ravensburger.com/images/en/set9/212_c432540b81fbff6691a9d3c4e325df2611217834.jpg'},
  },
];

export const SET_9: LorcanaCard[] = cardsOf(SET_9_ENTRIES);

/** Pegasus's promos, 1/C2 and 5/C2, which carry no `finishes`: a promo comes in both until the data says otherwise. */
export const C2_PEGASUS_ENTRIES: RawCollectionPromo[] = [
  {
    id: 2451,
    rarity: 'Special',
    number: 1,
    promoGrouping: 'C2',
    images: {thumbnail: 'https://api.lorcana.ravensburger.com/images/en/challenge2/1_f92390b9a110e020d83c794ea3f223315ccaff81.jpg'},
    fullName: 'Pegasus - Gift for Hercules',
    baseId: 2020,
  },
  {
    id: 2455,
    rarity: 'Special',
    number: 5,
    promoGrouping: 'C2',
    images: {thumbnail: 'https://api.lorcana.ravensburger.com/images/en/challenge2/5_0fbc7791e740677b182c3b7d14d4ce01a6e65348.jpg'},
    fullName: 'Pegasus - Gift for Hercules',
    baseId: 2020,
  },
];

export const C2_PEGASUS: CollectionPromo[] = transformPromos(C2_PEGASUS_ENTRIES);

/** Mickey Mouse - Brave Little Tailor, Set 1 #115: a Legendary of a pre-Core set with promos in four promo sets. */
export const MICKEY_ENTRY: LorcanaJSONCard = {
  id: 115,
  name: 'Mickey Mouse',
  version: 'Brave Little Tailor',
  fullName: 'Mickey Mouse - Brave Little Tailor',
  cost: 8,
  color: 'Ruby',
  inkwell: true,
  type: 'Character',
  setCode: '1',
  number: 115,
  rarity: 'Legendary',
  images: {thumbnail: 'https://api.lorcana.ravensburger.com/images/en/set1/115_f0c553fb7b2d5e6f6fc01509fe97bd89694d8799.jpg'},
};

export const MICKEY: LorcanaCard = cardWithId(cardsOf([MICKEY_ENTRY]), '115');

/** His five promos in promos.json's order, which goes by id, not by promo set: C1, C3, C3, D23, P1. */
export const MICKEY_PROMO_ENTRIES: RawCollectionPromo[] = [
  {
    id: 80003,
    rarity: 'Special',
    number: 5,
    promoGrouping: 'C1',
    fullName: 'Mickey Mouse - Brave Little Tailor',
    baseId: 115,
    finishes: ['foil'],
  },
  {
    id: 80023,
    rarity: 'Special',
    number: 12,
    promoGrouping: 'C3',
    fullName: 'Mickey Mouse - Brave Little Tailor',
    baseId: 115,
    finishes: ['normal'],
  },
  {
    id: 80030,
    rarity: 'Special',
    number: 24,
    promoGrouping: 'C3',
    fullName: 'Mickey Mouse - Brave Little Tailor',
    baseId: 115,
    finishes: ['foil'],
  },
  {
    id: 1191,
    rarity: 'Special',
    number: 1,
    promoGrouping: 'D23',
    images: {thumbnail: 'https://api.lorcana.ravensburger.com/images/en/d23/1_e703beca799cc92c4427ccd50e6edd7b132b1131.jpg'},
    fullName: 'Mickey Mouse - Brave Little Tailor',
    baseId: 115,
  },
  {
    id: 659,
    rarity: 'Special',
    number: 1,
    promoGrouping: 'P1',
    images: {thumbnail: 'https://api.lorcana.ravensburger.com/images/en/promo1/1_71345637b9eddc5d2937523edb2dc2242f992459.jpg'},
    fullName: 'Mickey Mouse - Brave Little Tailor',
    baseId: 115,
  },
];

export const MICKEY_PROMOS: CollectionPromo[] = transformPromos(MICKEY_PROMO_ENTRIES);

/*
 * The same entries as the files that hold them store them: text, as the contents API answers a
 * read (`readRepoFile`), in each file's own format (finishFiles.ts), so a read goes through the
 * real parsers.
 */

/**
 * `entries` with `finishes` set on the ones `values` names. A fixture's `finishes` is its last key
 * when it has one, so the value set is too, as a write puts it.
 */
export function withFinishes<T extends {id: number}>(entries: readonly T[], values: Readonly<Record<number, PrintingFinishes>>): T[] {
  return entries.map((entry) => (values[entry.id] ? {...entry, finishes: values[entry.id]} : entry));
}

/** A set's chunk or promos.json: `JSON.stringify(entries)` and a newline. */
export function collectionText(entries: readonly unknown[]): string {
  return `${JSON.stringify(entries)}\n`;
}

/** allCards.json holding `cards`: `JSON.stringify(x, null, 2)` and a newline. */
export function allCardsText(cards: readonly LorcanaJSONCard[]): string {
  return `${JSON.stringify({metadata: {}, sets: {}, cards}, null, 2)}\n`;
}

/** A group of the promo catalog that folds into a base card: that card's id, and its promos. */
export interface CatalogGroup {
  baseId: number;
  variants: readonly RawCardVariant[];
}

/** The promo catalog holding these groups: `JSON.stringify(x, null, 2)`, no newline. */
export function catalogText(fold: readonly CatalogGroup[] = []): string {
  return JSON.stringify({about: '', fold, noBaseCard: []}, null, 2);
}

/** Set 4's chunk as text: Yen Sid's three entries, the alt foil naming `["foil"]`. */
export const SET_4_TEXT = collectionText(SET_4_ENTRIES);

/** A catalog that holds no promo. */
export const EMPTY_CATALOG_TEXT = catalogText();
