import {describe, expect, it} from 'vitest';
import {CATALOG_PATH} from '../../finishes/finishFiles';
import {withEditedPrinting, withNewPrinting, type NewPrinting} from '../catalogEdits';
import {parseCatalog, printingCode, serializeCatalog, type BaseCard, type CatalogPrinting, type PromoCatalog} from '../promoCatalog';
import {readPinned} from './pinned';
import {FIXTURE_CATALOG, MKB_BASE, PRINCE, SNOW_WHITE_BASE} from './promoFixtures';

const NEW_9_P4: NewPrinting = {promoGrouping: 'P4', number: 9, finishes: ['foil'], scanLanguage: null};
const snowWhite = (catalog: PromoCatalog) => catalog.noBaseCard.find((g) => g.fullName === SNOW_WHITE_BASE.fullName);

describe('catalogEdits', () => {
  it('adds a printing of a Core card in a new fold group, in baseId order', () => {
    const {catalog, id} = withNewPrinting({catalog: FIXTURE_CATALOG, card: PRINCE, printing: NEW_9_P4, note: null});
    expect(id).toBe(80050);
    expect(catalog.fold.map((g) => g.baseId)).toEqual([2035, 2047]);
    expect(catalog.fold[1]).toEqual({baseId: 2047, fullName: 'Mickey Mouse - Brave Little Prince', setCode: '9', number: 111,
      variants: [{id: 80050, rarity: 'Special', number: 9, promoGrouping: 'P4', finishes: ['foil']}]});
    expect(Object.keys(catalog.fold[1].variants[0])).toEqual(['id', 'rarity', 'number', 'promoGrouping', 'finishes']);
    expect(catalog.provisionalIds['80050']).toBe('9/P4 Mickey Mouse - Brave Little Prince');
    expect(catalog.stats.foldIntoAllCards).toEqual({printings: 3, baseCards: 2});
    expect(FIXTURE_CATALOG.fold).toHaveLength(1);
  });
  it('files a new Core group before the groups whose baseId is higher', () => {
    const card: BaseCard = {id: 2001, fullName: 'Hercules - Divine Hero', setCode: '9', number: 1, core: true};
    const {catalog} = withNewPrinting({catalog: FIXTURE_CATALOG, card, printing: NEW_9_P4, note: null});
    expect(catalog.fold.map((g) => g.baseId)).toEqual([2001, 2035]);
  });
  it("adds to the card's own group in printing order, its language before its versions", () => {
    const {catalog} = withNewPrinting({catalog: FIXTURE_CATALOG, card: MKB_BASE, printing: {promoGrouping: 'C3', number: 2, finishes: ['normal'], scanLanguage: 'ja'}, note: null});
    expect(catalog.fold[0].variants.map(printingCode)).toEqual(['1/C3', '2/C3', '13/C3']);
    expect(Object.keys(catalog.fold[0].variants[1])).toEqual(['id', 'rarity', 'number', 'promoGrouping', 'scanLanguage', 'finishes']);
  });
  it("files a Sets 1 to 8 card's new group by set and number, passing over Hades", () => {
    const card: BaseCard = {id: 9001, fullName: 'Test Card', setCode: '2', number: 30, core: false};
    const {catalog} = withNewPrinting({catalog: FIXTURE_CATALOG, card, printing: NEW_9_P4, note: null});
    expect(catalog.noBaseCard.map((g) => g.fullName)).toEqual(['Mickey Mouse - Brave Little Tailor', 'Hades - Dark Usurper',
      'Snow White - Unexpected Houseguest', 'Test Card', 'Hiro Hamada - Armor Designer']);
    expect(Object.keys(catalog.noBaseCard[3])).toEqual(['fullName', 'lorcanaJsonBaseId', 'baseSetCode', 'baseNumber', 'variants']);
    expect(catalog.stats.noBaseCardInAllCards.cards).toBe(FIXTURE_CATALOG.stats.noBaseCardInAllCards.cards + 1);
  });
  it("appends a trimmed note under the printing's code, and none for a blank one", () => {
    const {catalog} = withNewPrinting({catalog: FIXTURE_CATALOG, card: PRINCE, printing: NEW_9_P4, note: '  Foil (owner, 22 Oct 2026, with a scan).  '});
    expect(catalog.notes).toEqual([{printing: '9/P4', card: 'Mickey Mouse - Brave Little Prince', note: 'Foil (owner, 22 Oct 2026, with a scan).'}]);
    expect(withNewPrinting({catalog: FIXTURE_CATALOG, card: PRINCE, printing: NEW_9_P4, note: '   '}).catalog.notes).toEqual([]);
  });
  it("edits a printing's code and language in place, keeping its other keys", () => {
    const edited = withEditedPrinting({catalog: FIXTURE_CATALOG, id: 80049, edit: {promoGrouping: 'P2', number: 44, scanLanguage: 'zh'}, note: null});
    expect(snowWhite(edited)?.variants[1]).toEqual({id: 80049, rarity: 'Special', number: 44, promoGrouping: 'P2', scanLanguage: 'zh', finishes: ['foil']});
    expect(edited.provisionalIds['80049']).toBe('44/P2 Snow White - Unexpected Houseguest');
  });
  it('drops an English scan language and re-sorts a printing moved to another set', () => {
    const edited = withEditedPrinting({catalog: FIXTURE_CATALOG, id: 80043, edit: {promoGrouping: 'P3', number: 41, scanLanguage: null}, note: null});
    expect(snowWhite(edited)?.variants.map(printingCode)).toEqual(['42/P2', '41/P3']);
    expect(snowWhite(edited)?.variants[1]).not.toHaveProperty('scanLanguage');
    expect(edited.stats.byPromoGrouping.P1).toBe(FIXTURE_CATALOG.stats.byPromoGrouping.P1 - 1);
  });
  it("keeps a provisional line's tail when it renames it, and adds none for a LorcanaJSON id", () => {
    const hades = withEditedPrinting({catalog: FIXTURE_CATALOG, id: 80032, edit: {promoGrouping: 'C3', number: 30, scanLanguage: null}, note: null});
    expect(hades.provisionalIds['80032']).toBe('30/C3 (Championship (36 copies)) Hades - Dark Usurper');
    const hiro = withEditedPrinting({catalog: FIXTURE_CATALOG, id: 1661, edit: {promoGrouping: 'P2', number: 24, scanLanguage: 'ja'}, note: null});
    expect(hiro.provisionalIds).toEqual(FIXTURE_CATALOG.provisionalIds);
  });

  it("adds to a Sets 1 to 8 card's own group, found by its LorcanaJSON id, and starts none", () => {
    const {catalog} = withNewPrinting({catalog: FIXTURE_CATALOG, card: SNOW_WHITE_BASE, printing: NEW_9_P4, note: null});
    expect(snowWhite(catalog)?.variants.map(printingCode)).toEqual(['41/P1', '42/P2', '9/P4']);
    expect(catalog.stats.noBaseCardInAllCards).toEqual({printings: 13, cards: 4});
  });
  it("refuses to edit an id the catalog doesn't hold", () => {
    const edit = {promoGrouping: 'P2', number: 1, scanLanguage: null};
    expect(() => withEditedPrinting({catalog: FIXTURE_CATALOG, id: 99999, edit, note: null})).toThrow(new Error("99999 isn't in the catalog"));
  });
  it('leaves the catalog it was given as it was', () => {
    const before = serializeCatalog(FIXTURE_CATALOG);
    withNewPrinting({catalog: FIXTURE_CATALOG, card: PRINCE, printing: NEW_9_P4, note: 'A note.'});
    withEditedPrinting({catalog: FIXTURE_CATALOG, id: 80032, edit: {promoGrouping: 'P2', number: 30, scanLanguage: 'ja'}, note: 'A note.'});
    expect(serializeCatalog(FIXTURE_CATALOG)).toBe(before);
  });
  it('keeps the new entry apart from the versions the form holds', () => {
    const form: NewPrinting = {...NEW_9_P4, finishes: ['normal']};
    const {catalog} = withNewPrinting({catalog: FIXTURE_CATALOG, card: PRINCE, printing: form, note: null});
    (form.finishes as string[]).push('foil');
    expect(catalog.fold[1].variants[0].finishes).toEqual(['normal']);
  });
  it('rebuilds an edited entry in the catalog key order, a language between its art and its versions', () => {
    const edited = withEditedPrinting({catalog: FIXTURE_CATALOG, id: 1661, edit: {promoGrouping: 'P2', number: 24, scanLanguage: 'ja'}, note: null});
    const hiro = edited.noBaseCard.find((g) => g.fullName === 'Hiro Hamada - Armor Designer')?.variants[0];
    expect(Object.keys(hiro ?? {})).toEqual(['id', 'rarity', 'number', 'promoGrouping', 'artVariant', 'images', 'scanLanguage', 'finishes']);
  });
  it("keeps a key the catalog order doesn't name, after the ones it does", () => {
    const [group] = FIXTURE_CATALOG.fold;
    const odd = {...group.variants[0], extra: 'kept'} as CatalogPrinting;
    const catalog = {...FIXTURE_CATALOG, fold: [{...group, variants: [odd, group.variants[1]]}]};
    const edited = withEditedPrinting({catalog, id: 80017, edit: {promoGrouping: 'C3', number: 1, scanLanguage: 'ja'}, note: null});
    expect(Object.keys(edited.fold[0].variants[0])).toEqual(['id', 'rarity', 'number', 'promoGrouping', 'scanLanguage', 'finishes', 'extra']);
  });
  it('makes the line a provisional printing lacks when an edit reaches it', () => {
    const lines = Object.entries(FIXTURE_CATALOG.provisionalIds).filter(([id]) => id !== '80024');
    const catalog = {...FIXTURE_CATALOG, provisionalIds: Object.fromEntries(lines)};
    const edited = withEditedPrinting({catalog, id: 80024, edit: {promoGrouping: 'C3', number: 14, scanLanguage: null}, note: null});
    expect(edited.provisionalIds['80024']).toBe('14/C3 Mother Knows Best');
  });
  // A pin bump whose catalog orders an entry's keys otherwise, or adds a key anywhere but last, fails here:
  // ENTRY_KEYS in catalogEdits.ts has to follow the app's order.
  it('leaves every printing of the pinned catalog byte for byte under an edit that changes nothing', () => {
    const text = readPinned(CATALOG_PATH);
    const pinned = parseCatalog(text);
    const changed = [...pinned.fold, ...pinned.noBaseCard]
      .flatMap((group) => group.variants)
      .filter(({id, promoGrouping, number, scanLanguage}) => {
        // An edit always names a number, as the form won't save one without it, so a printing with none has no edit that changes nothing.
        if (number === undefined) return false;
        const edit = {promoGrouping, number, scanLanguage: scanLanguage ?? null};
        return serializeCatalog(withEditedPrinting({catalog: pinned, id, edit, note: null})) !== text;
      })
      .map(({id}) => id);
    expect(changed).toEqual([]);
  });
});
