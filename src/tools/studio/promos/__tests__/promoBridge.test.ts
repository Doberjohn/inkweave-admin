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

const read = (path: string) => readFileSync(resolve('upstream/inkweave', path), 'utf8');

describe('the bridged promo merge', () => {
  it('leaves the pinned allCards.json as it is: the catalog is merged in already', () => {
    const all = JSON.parse(read(ALL_CARDS_PATH)) as {cards: MergeCard[]};
    const report = mergePromoPrintings(all.cards, JSON.parse(read(CATALOG_PATH)) as MergeCatalog);
    expect(report.changes.filter(({added, updated, removed}) => added.length + updated.length + removed.length > 0)).toEqual([]);
    expect(`${JSON.stringify(all, null, 2)}\n`).toBe(read(ALL_CARDS_PATH));
  });
  it('lists the pinned promos.json as it is', () => {
    const stored = JSON.parse(read(PROMOS_PATH)) as object[];
    const listed = collectionPromos(JSON.parse(read(CATALOG_PATH)) as MergeCatalog, finishesById(stored));
    expect(`${JSON.stringify(listed)}\n`).toBe(read(PROMOS_PATH));
  });
  it('orders promos after the other printings, by set and number', () => {
    const order = [{rarity: 'Special', promoGrouping: 'P2', number: 3}, {rarity: 'Iconic', number: 242}, {rarity: 'Special', promoGrouping: 'P1', number: 9}];
    expect([...order].sort(byPrintingOrder)).toEqual([order[1], order[2], order[0]]);
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
