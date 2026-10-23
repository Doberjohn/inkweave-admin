import {readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';
import {
  PROMO_SETS,
  byPrintingOrder,
  collectionPromos,
  finishesById,
  mergePromoPrintings,
  promoBaseProblems,
  type MergeCard,
  type MergeCatalog,
} from '../../../../app-bridge';
import {ALL_CARDS_PATH, CATALOG_PATH, COLLECTION_DIR, PROMOS_PATH} from '../../finishes/finishFiles';
import {readPinned} from './pinned';
import {PRINCE} from './promoFixtures';

const read = (path: string) => readFileSync(resolve('upstream/inkweave', path), 'utf8');

describe('the bridged promo merge', () => {
  it('leaves the pinned allCards.json as it is: the catalog is merged in already', () => {
    const all = JSON.parse(read(ALL_CARDS_PATH)) as {cards: MergeCard[]};
    const report = mergePromoPrintings(all.cards, JSON.parse(read(CATALOG_PATH)) as MergeCatalog);
    // The merge visited cards: each card with promos reports its entries, none of them changed.
    expect(report.changes.length).toBeGreaterThan(0);
    expect(report.changes.filter(({added, updated, removed}) => added.length + updated.length + removed.length > 0)).toEqual([]);
    expect(`${JSON.stringify(all, null, 2)}\n`).toBe(read(ALL_CARDS_PATH));
  });
  it('throws for a catalog naming a card the cards lack, and leaves the cards as they were', () => {
    const cards: MergeCard[] = [{id: PRINCE.id, fullName: PRINCE.fullName}];
    const before = JSON.stringify(cards);
    const prince = {baseId: PRINCE.id, fullName: PRINCE.fullName, variants: [{id: 80100, rarity: 'Special', number: 1, promoGrouping: 'P5'}]};
    const stray = {baseId: 99999, fullName: 'Nobody - Nowhere', variants: [{id: 80101, rarity: 'Special', number: 2, promoGrouping: 'P5'}]};
    // The Prince's group alone gives him a promo: the merge checks every group before it writes to any card.
    const alone = structuredClone(cards);
    mergePromoPrintings(alone, {fold: [prince]});
    expect(JSON.stringify(alone)).not.toBe(before);
    expect(() => mergePromoPrintings(cards, {fold: [prince, stray]})).toThrow('no card 99999 (Nobody - Nowhere) in allCards.json');
    expect(JSON.stringify(cards)).toBe(before);
  });
  it('lists the pinned promos.json as it is', () => {
    const stored = JSON.parse(read(PROMOS_PATH)) as object[];
    const listed = collectionPromos(JSON.parse(read(CATALOG_PATH)) as MergeCatalog, finishesById(stored));
    expect(`${JSON.stringify(listed)}\n`).toBe(read(PROMOS_PATH));
  });
  it('orders promos after the other printings, by set and number', () => {
    const order = [
      {rarity: 'Special', promoGrouping: 'P10', number: 1},
      {rarity: 'Special', promoGrouping: 'P2', number: 9},
      {rarity: 'Special', promoGrouping: 'P2', number: 3},
      {rarity: 'Special', promoGrouping: 'P2'},
      {rarity: 'Iconic', number: 242},
      {rarity: 'Enchanted', number: 210},
    ];
    // The others by number, then the promos by set in natural order (P2 before P10) and number, an unknown number last.
    expect([...order].sort(byPrintingOrder)).toEqual([order[5], order[4], order[2], order[1], order[3], order[0]]);
  });
  it('bridges the promo sets, oldest first', () => {
    expect(PROMO_SETS[0]).toEqual({code: 'P1', name: 'Promo Set 1'});
    expect(PROMO_SETS.some((set) => set.code === 'RPH')).toBe(true);
  });
  it('finds no problem in the pinned promos over the pinned data', () => {
    // The cards a promo can reprint, as the app's merge CLI gathers them (chunkCards): allCards.json's, and
    // each set chunk's. The index and promos.json hold no set's cards of their own.
    const chunks = readdirSync(resolve('upstream/inkweave', COLLECTION_DIR))
      .filter((file) => file.endsWith('.json') && file !== 'index.json' && file !== 'promos.json')
      .map((file) => `${COLLECTION_DIR}/${file}`);
    const cards = [
      ...(JSON.parse(readPinned(ALL_CARDS_PATH)) as {cards: MergeCard[]}).cards,
      ...chunks.flatMap((path) => JSON.parse(readPinned(path)) as MergeCard[]),
    ];
    expect(promoBaseProblems(JSON.parse(readPinned(PROMOS_PATH)) as object[], cards)).toEqual([]);
  });
});
