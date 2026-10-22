import {describe, expect, it} from 'vitest';
import {ALL_CARDS_PATH, CATALOG_PATH, PROMOS_PATH} from '../../finishes/finishFiles';
import {withNewPrinting} from '../catalogEdits';
import {parseCatalog, serializeCatalog, type BaseCard, type FoldGroup, type PromoCatalog} from '../promoCatalog';
import {mergeOver, outOfStep} from '../promoMerge';
import {readPinned} from './pinned';
import {FIXTURE_CATALOG, PRINCE} from './promoFixtures';

/** The pinned app's catalog and its two card files, which the app leaves in step. */
const pinned = () => ({catalog: parseCatalog(readPinned(CATALOG_PATH)), files: {allCards: readPinned(ALL_CARDS_PATH), promos: readPinned(PROMOS_PATH)}});
/** A file of cards as allCards.json writes it. */
const allCardsText = (cards: object[]) => `${JSON.stringify({cards}, null, 2)}\n`;

describe('promoMerge', () => {
  it("finds the pinned app's files in step", () => {
    const base = pinned();
    expect(outOfStep(base)).toEqual([]);
    expect(mergeOver(base)).toEqual(base.files);
  });
  it('adds 1/P5 to Mickey Mouse - Brave Little Prince over the pinned files, and nothing else', () => {
    const base = pinned();
    const {catalog, id} = withNewPrinting({catalog: base.catalog, card: PRINCE, printing: {promoGrouping: 'P5', number: 1, finishes: ['foil'], scanLanguage: null}, note: null});
    const out = mergeOver({catalog, files: base.files});
    const after = JSON.parse(out.allCards) as {cards: Array<{id: number; variants?: object[]}>};
    const prince = after.cards.find((card) => card.id === 2047);
    expect(prince?.variants?.at(-1)).toEqual({id, rarity: 'Special', number: 1, promoGrouping: 'P5', finishes: ['foil']});
    prince?.variants?.pop();
    expect(after).toEqual(JSON.parse(base.files.allCards));
    const promos = JSON.parse(out.promos) as Array<{id: number}>;
    expect(promos.filter((promo) => promo.id === id)).toEqual([{id, rarity: 'Special', number: 1, promoGrouping: 'P5',
      fullName: 'Mickey Mouse - Brave Little Prince', baseId: 2047, finishes: ['foil']}]);
    expect(promos.filter((promo) => promo.id !== id)).toEqual(JSON.parse(base.files.promos));
  });
  it('names what a merge over out-of-step files would change', () => {
    const base = pinned();
    const catalog = structuredClone(base.catalog);
    catalog.fold.find((group) => group.fullName === 'Mother Knows Best')?.variants.pop();
    expect(outOfStep({catalog, files: base.files})).toEqual(['Mother Knows Best', 'collection/promos.json']);
  });
  it('names the promos file alone where allCards.json is in step', () => {
    const base = pinned();
    expect(outOfStep({catalog: base.catalog, files: {...base.files, promos: '[]\n'}})).toEqual(['collection/promos.json']);
  });
  it('names a card alone where promos.json is in step', () => {
    const base = pinned();
    const all = JSON.parse(base.files.allCards) as {cards: Array<{fullName: string; variants?: object[]}>};
    all.cards.find((card) => card.fullName === 'Mother Knows Best')?.variants?.pop();
    expect(outOfStep({catalog: base.catalog, files: {...base.files, allCards: `${JSON.stringify(all, null, 2)}\n`}})).toEqual(['Mother Knows Best']);
  });
  it('lists a name once where two cards share it', () => {
    const twin = ({baseId, id}: {baseId: number; id: number}): FoldGroup => ({
      baseId, fullName: 'Twin', setCode: '9', number: baseId,
      variants: [{id, rarity: 'Special', number: 1, promoGrouping: 'C3', finishes: ['foil']}],
    });
    const catalog: PromoCatalog = {...FIXTURE_CATALOG, fold: [twin({baseId: 1, id: 80001}), twin({baseId: 2, id: 80002})], noBaseCard: []};
    const allCards = allCardsText([{id: 1, fullName: 'Twin'}, {id: 2, fullName: 'Twin'}]);
    expect(outOfStep({catalog, files: {allCards, promos: '[]\n'}})).toEqual(['Twin', 'collection/promos.json']);
  });
  it('keeps the versions promos.json holds where the catalog names none', () => {
    // Hades - Dark Usurper's printings name none and wait in noBaseCard, so allCards.json needs no card for them.
    const catalog: PromoCatalog = {...FIXTURE_CATALOG, fold: []};
    const allCards = allCardsText([]);
    const listed = JSON.parse(mergeOver({catalog, files: {allCards, promos: '[]\n'}}).promos) as Array<{id: number}>;
    const promos = `${JSON.stringify(listed.map((promo) => (promo.id === 80031 ? {...promo, finishes: ['foil']} : promo)))}\n`;
    expect(mergeOver({catalog, files: {allCards, promos}}).promos).toBe(promos);
  });
  it("throws the app's message for a catalog it can't merge", () => {
    const base = pinned();
    const stray: BaseCard = {id: 99999, fullName: 'Nobody - Nowhere', setCode: '9', number: 1, core: true};
    const {catalog} = withNewPrinting({catalog: base.catalog, card: stray, printing: {promoGrouping: 'P4', number: 9, finishes: ['foil'], scanLanguage: null}, note: null});
    const why = 'no card 99999 (Nobody - Nowhere) in allCards.json';
    expect(() => mergeOver({catalog, files: base.files})).toThrow(why);
    expect(() => outOfStep({catalog, files: base.files})).toThrow(why);
  });
  it('leaves the catalog it was given as it was', () => {
    const base = pinned();
    const before = serializeCatalog(base.catalog);
    mergeOver(base);
    outOfStep(base);
    expect(serializeCatalog(base.catalog)).toBe(before);
  });
});
