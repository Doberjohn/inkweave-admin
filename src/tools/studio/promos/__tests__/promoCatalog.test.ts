import {describe, expect, it} from 'vitest';
import {CATALOG_PATH} from '../../finishes/finishFiles';
import {
  findPrinting,
  isKnownPromoSet,
  nextProvisionalId,
  parseCatalog,
  printingCode,
  recountStats,
  serializeCatalog,
  takenBy,
  type CatalogPrinting,
} from '../promoCatalog';
import {FIXTURE_CATALOG, readPinned} from './promoFixtures';

describe('promoCatalog', () => {
  it('round-trips the pinned catalog byte for byte', () => {
    const text = readPinned(CATALOG_PATH);
    expect(serializeCatalog(parseCatalog(text))).toBe(text);
  });
  it('names a printing by the code printed on it', () => {
    expect(printingCode({number: 1, promoGrouping: 'P5'})).toBe('1/P5');
    expect(printingCode({number: 24, artVariant: 'A', promoGrouping: 'P2'})).toBe('24A/P2');
    expect(printingCode({promoGrouping: 'C1'})).toBe('?/C1');
  });
  it('finds a printing and its group by id', () => {
    expect(findPrinting(FIXTURE_CATALOG, 80024)?.group.fullName).toBe('Mother Knows Best');
    expect(findPrinting(FIXTURE_CATALOG, 1662)?.printing.artVariant).toBe('B');
    expect(findPrinting(FIXTURE_CATALOG, 99999)).toBeNull();
  });
  it('finds who holds a promo set and number', () => {
    expect(takenBy({catalog: FIXTURE_CATALOG, code: {promoGrouping: 'C3', number: 13}})?.printing.id).toBe(80024);
    expect(takenBy({catalog: FIXTURE_CATALOG, code: {promoGrouping: 'C3', number: 13}, exceptId: 80024})).toBeNull();
    expect(takenBy({catalog: FIXTURE_CATALOG, code: {promoGrouping: 'P4', number: 9}})).toBeNull();
  });
  it('tells two arts under one number apart, but not a new printing from them', () => {
    expect(takenBy({catalog: FIXTURE_CATALOG, code: {promoGrouping: 'P2', number: 24, artVariant: 'A'}, exceptId: 1661})).toBeNull();
    expect(takenBy({catalog: FIXTURE_CATALOG, code: {promoGrouping: 'P2', number: 24}})?.printing.id).toBe(1661);
  });
  it('takes the same art under a number, and frees a third', () => {
    const art = (artVariant: string) => ({promoGrouping: 'P2', number: 24, artVariant});
    expect(takenBy({catalog: FIXTURE_CATALOG, code: art('A')})?.printing.id).toBe(1661);
    expect(takenBy({catalog: FIXTURE_CATALOG, code: art('C')})).toBeNull();
  });
  it('knows the promo sets the app knows', () => {
    expect(isKnownPromoSet('P4')).toBe(true);
    expect(isKnownPromoSet('CC2')).toBe(true);
    expect(isKnownPromoSet('Q9')).toBe(false);
  });
  it('issues the id above the highest provisional one, a removed one included', () => {
    expect(nextProvisionalId(FIXTURE_CATALOG)).toBe(80050);
    const removed = {...FIXTURE_CATALOG.provisionalIds, '80056': '1/P5 Mickey Mouse - Brave Little Prince (removed)'};
    expect(nextProvisionalId({...FIXTURE_CATALOG, provisionalIds: removed})).toBe(80057);
  });
  it('starts the provisional ids at 80001 where the catalog names none', () => {
    expect(nextProvisionalId({...FIXTURE_CATALOG, provisionalIds: {}})).toBe(80001);
  });
  it('recounts the stats as the pinned catalog holds them, key order included', () => {
    const pinned = parseCatalog(readPinned(CATALOG_PATH));
    expect(JSON.stringify(recountStats(pinned))).toBe(JSON.stringify(pinned.stats));
    expect(recountStats(FIXTURE_CATALOG)).toEqual(FIXTURE_CATALOG.stats);
  });
  it("counts an id from 80001 up as provisional and a lower one as LorcanaJSON's", () => {
    const printing = (id: number): CatalogPrinting => ({id, rarity: 'Special', number: 1, promoGrouping: 'P4'});
    const group = {...FIXTURE_CATALOG.fold[0], variants: [printing(80000), printing(80001)]};
    const stats = recountStats({...FIXTURE_CATALOG, fold: [group], noBaseCard: []});
    expect([stats.withLorcanaJsonId, stats.withProvisionalId]).toEqual([1, 1]);
  });
});
