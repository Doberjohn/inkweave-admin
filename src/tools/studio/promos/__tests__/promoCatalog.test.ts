import {describe, expect, it} from 'vitest';
import {CATALOG_PATH} from '../../finishes/finishFiles';
import {
  findPrinting,
  hasOfficialArt,
  isKnownPromoSet,
  isProvisional,
  nextProvisionalId,
  parseCatalog,
  printingCode,
  recountStats,
  serializeCatalog,
  takenBy,
  type CatalogPrinting,
  type CatalogStats,
} from '../promoCatalog';
import {readPinned} from './pinned';
import {FIXTURE_CATALOG} from './promoFixtures';

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
    // Hiro's 24A/P2 and 24B/P2 have LorcanaJSON's ids, which count for nothing here.
    const hiro = FIXTURE_CATALOG.noBaseCard.filter((group) => group.fullName === 'Hiro Hamada - Armor Designer');
    expect(nextProvisionalId({...FIXTURE_CATALOG, fold: [], noBaseCard: hiro, provisionalIds: {}})).toBe(80001);
  });
  it('issues the id above a provisional printing that has no line, in either section', () => {
    const lineless: CatalogPrinting = {id: 80056, rarity: 'Special', number: 1, promoGrouping: 'P5', finishes: ['foil']};
    const [mkb] = FIXTURE_CATALOG.fold;
    expect(nextProvisionalId({...FIXTURE_CATALOG, fold: [{...mkb, variants: [...mkb.variants, lineless]}]})).toBe(80057);
    const [tailor, ...others] = FIXTURE_CATALOG.noBaseCard;
    const waiting = [{...tailor, variants: [...tailor.variants, {...lineless, id: 80060}]}, ...others];
    expect(nextProvisionalId({...FIXTURE_CATALOG, noBaseCard: waiting})).toBe(80061);
  });
  it('recounts the stats as the pinned catalog holds them, key order included', () => {
    const pinned = parseCatalog(readPinned(CATALOG_PATH));
    expect(JSON.stringify(recountStats(pinned))).toBe(JSON.stringify(pinned.stats));
    expect(recountStats(FIXTURE_CATALOG)).toEqual(FIXTURE_CATALOG.stats);
  });
  it("keeps a count it doesn't know as it was, where the file keeps it", () => {
    // A count the app adds before admin's next pin bump, filed ahead of the others, beside a count gone stale.
    const stats = {byScanLanguage: {ja: 1, zh: 1}, ...FIXTURE_CATALOG.stats, promoPrintings: 99} as CatalogStats;
    const recounted = recountStats({...FIXTURE_CATALOG, stats});
    expect(JSON.stringify(recounted)).toBe(JSON.stringify({byScanLanguage: {ja: 1, zh: 1}, ...FIXTURE_CATALOG.stats}));
  });
  it('adds a count it knows that the file lacks, after the others', () => {
    const {withOfficialArtUrl, ...rest} = FIXTURE_CATALOG.stats;
    const recounted = recountStats({...FIXTURE_CATALOG, stats: rest as CatalogStats});
    expect(JSON.stringify(recounted)).toBe(JSON.stringify({...rest, withOfficialArtUrl}));
  });
  it("counts an id from 80001 up as provisional and a lower one as LorcanaJSON's", () => {
    const printing = (id: number): CatalogPrinting => ({id, rarity: 'Special', number: 1, promoGrouping: 'P4'});
    const group = {...FIXTURE_CATALOG.fold[0], variants: [printing(80000), printing(80001)]};
    const stats = recountStats({...FIXTURE_CATALOG, fold: [group], noBaseCard: []});
    expect([stats.withLorcanaJsonId, stats.withProvisionalId]).toEqual([1, 1]);
  });
  it("tells a printing with Ravensburger's art by the images its entry holds", () => {
    const hasArt = (id: number) => hasOfficialArt(findPrinting(FIXTURE_CATALOG, id)!.printing);
    expect(hasArt(659)).toBe(true);
    expect(hasArt(80043)).toBe(false);
  });
  it("tells a provisional id from LorcanaJSON's at 80001", () => {
    expect(isProvisional({id: 80001})).toBe(true);
    expect(isProvisional({id: 80000})).toBe(false);
  });
});
