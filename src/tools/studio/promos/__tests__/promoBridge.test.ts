import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';
import {
  PROMO_SETS,
  byPrintingOrder,
  collectionPromos,
  finishesById,
  mergePromoPrintings,
  type MergeCard,
  type MergeCatalog,
} from '../../../../app-bridge';
import {ALL_CARDS_PATH, CATALOG_PATH, PROMOS_PATH} from '../../finishes/finishFiles';

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
});
