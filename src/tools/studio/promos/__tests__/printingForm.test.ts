import {describe, expect, it} from 'vitest';
import {PROMO_SETS} from '../../../../app-bridge';
import {MOTHER_KNOWS_BEST, URSULA_SET_3, URSULA_SET_9, YEN_SID} from '../../finishes/__tests__/finishFixtures';
import {
  EMPTY_PRINTING_FORM,
  baseCardOf,
  changeOf,
  coreCopyOf,
  editValuesOf,
  formCode,
  missingLine,
  outcomeNote,
  parseNumber,
  promoSetOptions,
  publishLabel,
  type PrintingFormValues,
  type ScanState,
} from '../printingForm';
import {findPrinting, isKnownPromoSet, takenBy, type BaseCard, type CodeParts, type FoundPrinting} from '../promoCatalog';
import {FIXTURE_CATALOG, PRINCE} from './promoFixtures';

const NO_SCAN: ScanState = {name: null, dataUrl: null, error: null};
const SCAN: ScanState = {name: 'mickey-1-p5.webp', dataUrl: 'data:image/webp;base64,UklGRgAAAABXRUJQ', error: null};
/** A file chosen and still being read: named, with no bytes yet and no error. */
const READING: ScanState = {name: 'mickey-1-p5.webp', dataUrl: null, error: null};
/** A file that failed the byte check: its error says why, and no bytes are kept. */
const REFUSED: ScanState = {name: 'scan.gif', dataUrl: null, error: 'scan.gif is not a JPEG, PNG or WebP image.'};

const SNOW_WHITE: BaseCard = {id: 240, fullName: 'Snow White - Unexpected Houseguest', setCode: '2', number: 24, core: false};
const HIRO: BaseCard = {id: 1529, fullName: 'Hiro Hamada - Armor Designer', setCode: '7', number: 96, core: false};

/** The printing of FIXTURE_CATALOG with this id. */
const printing = (id: number) => findPrinting(FIXTURE_CATALOG, id)!.printing;

const add = (values: Partial<PrintingFormValues>, scan = SCAN) =>
  missingLine({kind: 'add', values: {...EMPTY_PRINTING_FORM, ...values}, initial: EMPTY_PRINTING_FORM, scan, taken: null});

/** What an edit of the printing `id` still lacks once the owner has changed `values`, chosen `scan` and the catalog says `taken` has the code. */
function edit({id, values = {}, scan = NO_SCAN, taken = null}: {
  id: number;
  values?: Partial<PrintingFormValues>;
  scan?: ScanState;
  taken?: FoundPrinting | null;
}): string | null {
  const initial = editValuesOf(printing(id));
  return missingLine({kind: 'edit', values: {...initial, ...values}, initial, scan, taken, artVariant: printing(id).artVariant});
}

/** Who else has the code the edit of printing `id` would give it, as the panel works it out. */
const heldBy = ({id, code}: {id: number; code: CodeParts}) => takenBy({catalog: FIXTURE_CATALOG, code, exceptId: id});

describe('promoSetOptions', () => {
  it('offers Promo Set 5, the newest, first', () => {
    expect(promoSetOptions(PROMO_SETS)[0]).toEqual({code: 'P5', label: 'P5 · Promo Set 5'});
    expect(isKnownPromoSet('P5')).toBe(true);
  });
  it('offers each edition by its own code, the newest edition first, and Promo Set 1 last', () => {
    const options = promoSetOptions(PROMO_SETS);
    const newest = options.findIndex(({code}) => code === 'CC2');
    expect(options.slice(newest, newest + 2)).toEqual([{code: 'CC2', label: "CC2 · Curator's Collection: Beauty and the Beast Edition"},
      {code: 'CC1', label: "CC1 · Curator's Collection: Heroines Edition"}]);
    expect(options.at(-1)).toEqual({code: 'P1', label: 'P1 · Promo Set 1'});
  });
  it('offers only codes the app knows, each once', () => {
    const codes = promoSetOptions(PROMO_SETS).map(({code}) => code);
    expect(codes.every((code) => isKnownPromoSet(code))).toBe(true);
    expect(new Set(codes).size).toBe(codes.length);
  });
  it('gives a set with no editions, or an empty list of them, an option of its own', () => {
    const sets = [{code: 'A', name: 'Alpha'}, {code: 'B', name: 'Bravo', editions: []}];
    expect(promoSetOptions(sets)).toEqual([{code: 'B', label: 'B · Bravo'}, {code: 'A', label: 'A · Alpha'}]);
  });
});

describe('numbers and codes', () => {
  it('reads a number as a whole number from 1 up', () => {
    expect([parseNumber('1'), parseNumber(' 07 '), parseNumber('0'), parseNumber('1.5'), parseNumber(''), parseNumber('2a')]).toEqual([1, 7, null, null, null, null]);
  });
  it('refuses a negative number, and one JavaScript cannot hold exactly', () => {
    expect([parseNumber('9007199254740991'), parseNumber('9007199254740993'), parseNumber('9'.repeat(400)), parseNumber('-1')]).toEqual([9007199254740991, null, null, null]);
  });
  it('names the code a form holds, its art variant included', () => {
    expect(formCode({promoGrouping: 'P5', number: '1'})).toBe('1/P5');
    expect(formCode({promoGrouping: 'P2', number: '24', artVariant: 'A'})).toBe('24A/P2');
    expect(formCode({promoGrouping: 'P5', number: ' 07 '})).toBe('7/P5');
  });
  it('has no code until it has a promo set and a number it can read', () => {
    expect([formCode({promoGrouping: '', number: '1'}), formCode({promoGrouping: 'P5', number: ''}), formCode({promoGrouping: 'P5', number: '0'})]).toEqual([null, null, null]);
  });
});

describe('the form a printing opens with', () => {
  it('fills an edit in from the printing, with no versions and no note', () => {
    expect(editValuesOf(printing(80049))).toEqual({promoGrouping: 'P2', number: '42', versions: null, scanLanguage: 'zh', note: ''});
    expect(editValuesOf(printing(80017))).toEqual({promoGrouping: 'C3', number: '1', versions: null, scanLanguage: 'en', note: ''});
  });
  it('leaves the number blank for a printing nobody has numbered', () => {
    expect(editValuesOf({id: 1, rarity: 'Special', promoGrouping: 'C1'}).number).toBe('');
  });
  it('starts an add empty, in English', () => {
    expect(EMPTY_PRINTING_FORM).toEqual({promoGrouping: '', number: '', versions: null, scanLanguage: 'en', note: ''});
  });
});

describe('missingLine of an add', () => {
  it('says what an add still needs, one thing at a time', () => {
    expect(add({})).toBe('Choose a promo set to publish.');
    expect(add({promoGrouping: 'P4'})).toBe('Enter a number from 1 up to publish.');
    expect(add({promoGrouping: 'P4', number: '9'})).toBe('Choose its versions to publish.');
    expect(add({promoGrouping: 'P4', number: '9', versions: 'foil'}, NO_SCAN)).toBe('Add its scan to publish.');
    expect(add({promoGrouping: 'P4', number: '9', versions: 'foil'})).toBeNull();
  });
  it('asks for a number from 1 up, however it was refused', () => {
    expect(add({promoGrouping: 'P4', number: '0'})).toBe('Enter a number from 1 up to publish.');
    expect(add({promoGrouping: 'P4', number: '1.5'})).toBe('Enter a number from 1 up to publish.');
  });
  it('leaves a scan that failed to its own error, and still says what comes before it', () => {
    expect(add({promoGrouping: 'P4', number: '9', versions: 'foil'}, REFUSED)).toBeNull();
    expect(add({promoGrouping: 'P4', number: '9'}, REFUSED)).toBe('Choose its versions to publish.');
  });
  it('counts a scan only once its bytes are read', () => {
    expect(add({promoGrouping: 'P4', number: '9', versions: 'foil'}, READING)).toBe('Add its scan to publish.');
  });
  it('says whose a taken code is, once the form is complete', () => {
    const values = {...EMPTY_PRINTING_FORM, promoGrouping: 'C3', number: '13', versions: 'foil' as const};
    const taken = findPrinting(FIXTURE_CATALOG, 80024);
    expect(missingLine({kind: 'add', values, initial: EMPTY_PRINTING_FORM, scan: SCAN, taken})).toBe('13/C3 is taken: Mother Knows Best has it.');
    expect(missingLine({kind: 'add', values, initial: EMPTY_PRINTING_FORM, scan: NO_SCAN, taken})).toBe('Add its scan to publish.');
  });
});

describe('missingLine of an edit', () => {
  it('asks an edit for a change', () => {
    const initial = editValuesOf(findPrinting(FIXTURE_CATALOG, 80049)!.printing);
    expect(missingLine({kind: 'edit', values: initial, initial, scan: NO_SCAN, taken: null})).toBe('Change something to save.');
  });
  it('counts a new code, scan, language or note as something to save', () => {
    expect(edit({id: 80049, values: {number: '44'}})).toBeNull();
    expect(edit({id: 80049, values: {promoGrouping: 'P3'}})).toBeNull();
    expect(edit({id: 80049, values: {scanLanguage: 'ja'}})).toBeNull();
    expect(edit({id: 80049, values: {note: 'Chinese.'}})).toBeNull();
    expect(edit({id: 80049, scan: SCAN})).toBeNull();
  });
  it('does not count retyping the number, or a blank note, as something to save', () => {
    expect(edit({id: 80049, values: {number: ' 042 '}})).toBe('Change something to save.');
    expect(edit({id: 80049, values: {note: '  '}})).toBe('Change something to save.');
  });
  it('counts a scan only once its bytes are read', () => {
    expect(edit({id: 80049, scan: READING})).toBe('Change something to save.');
    expect(edit({id: 80049, scan: REFUSED})).toBe('Change something to save.');
  });
  it('asks an edit for a number from 1 up, and for a promo set', () => {
    expect(edit({id: 80049, values: {number: ''}})).toBe('Enter a number from 1 up to save.');
    expect(edit({id: 80049, values: {number: '0'}})).toBe('Enter a number from 1 up to save.');
    expect(edit({id: 80049, values: {promoGrouping: ''}})).toBe('Choose a promo set to save.');
  });
  it('lets an edit keep the code it already shares with a twin', () => {
    const twin = heldBy({id: 80032, code: {promoGrouping: 'C3', number: 28}});
    expect(twin?.printing.id).toBe(80031);
    expect(edit({id: 80032, values: {note: 'Championship prize.'}, taken: twin})).toBeNull();
    expect(edit({id: 80032, values: {note: 'Championship prize.', number: '028'}, taken: twin})).toBeNull();
  });
  it('still says whose a code is when an edit moves to it', () => {
    const mkb = heldBy({id: 80017, code: {promoGrouping: 'C3', number: 13}});
    expect(edit({id: 80017, values: {number: '13'}, taken: mkb})).toBe('13/C3 is taken: Mother Knows Best has it.');
    const hades = heldBy({id: 80032, code: {promoGrouping: 'C3', number: 29}});
    expect(edit({id: 80032, values: {number: '29'}, taken: hades})).toBe('29/C3 is taken: Hades - Dark Usurper has it.');
  });
  it('names the art variant of the printing in the code it says is taken', () => {
    const mickey = heldBy({id: 1662, code: {promoGrouping: 'P1', number: 1, artVariant: 'B'}});
    expect(edit({id: 1662, values: {promoGrouping: 'P1', number: '1'}, taken: mickey})).toBe('1B/P1 is taken: Mickey Mouse - Brave Little Tailor has it.');
  });
});

describe('publishLabel', () => {
  const at = (promoGrouping: string, number: string) => ({...EMPTY_PRINTING_FORM, promoGrouping, number});

  it('names the button by the printing', () => {
    expect(publishLabel({kind: 'add', values: at('P5', '1'), initialCode: null, publishing: false})).toBe('Publish 1/P5');
    expect(publishLabel({kind: 'add', values: EMPTY_PRINTING_FORM, initialCode: null, publishing: false})).toBe('Publish');
    expect(publishLabel({kind: 'edit', values: at('P5', '2'), initialCode: '1/P5', publishing: false})).toBe('Save as 2/P5');
    expect(publishLabel({kind: 'edit', values: at('P5', '1'), initialCode: '1/P5', publishing: false})).toBe('Save 1/P5');
    expect(publishLabel({kind: 'add', values: at('P5', '1'), initialCode: null, publishing: true})).toBe('Publishing…');
  });
  it('says Publishing… to an edit too', () => {
    expect(publishLabel({kind: 'edit', values: at('P5', '2'), initialCode: '1/P5', publishing: true})).toBe('Publishing…');
  });
  it('names the art variant of the printing an edit opened', () => {
    const hiro = editValuesOf(printing(1661));
    const label = (values: PrintingFormValues) => publishLabel({kind: 'edit', values, initialCode: '24A/P2', publishing: false, artVariant: 'A'});
    expect(label(hiro)).toBe('Save 24A/P2');
    expect(label({...hiro, number: '30'})).toBe('Save as 30A/P2');
  });
  it('reads Save where an edit has no code to name', () => {
    expect(publishLabel({kind: 'edit', values: at('P5', ''), initialCode: '1/P5', publishing: false})).toBe('Save');
  });
  it('does not count retyping the number as a new code', () => {
    expect(publishLabel({kind: 'edit', values: at('P5', ' 01 '), initialCode: '1/P5', publishing: false})).toBe('Save 1/P5');
  });
});

describe('outcomeNote', () => {
  it('says when the art will show', () => {
    expect(outcomeNote({scanSent: true, branch: 'master'})).toBe('Its art shows on inkweave.ink once the app has converted the scan and deployed.');
    expect(outcomeNote({scanSent: true, branch: 'rehearse-77'})).toBe('The scan converts to art on master only, so on rehearse-77 the printing has no art yet.');
    expect(outcomeNote({scanSent: false, branch: 'master'})).toBe('It shows on inkweave.ink once the app has deployed.');
  });
  it('names the branch a publish without a scan landed on, where that is not master', () => {
    expect(outcomeNote({scanSent: false, branch: 'rehearse-77'})).toBe('On rehearse-77, it shows wherever that branch is deployed.');
  });
});

describe('the card a form belongs to', () => {
  it('files a card for the catalog by its set, and points a reprinted Sets 1 to 8 card to its Core copy', () => {
    expect(baseCardOf(MOTHER_KNOWS_BEST)).toEqual({id: 2035, fullName: 'Mother Knows Best', setCode: '9', number: 99, core: true});
    expect(baseCardOf(YEN_SID)).toEqual({id: 750, fullName: 'Yen Sid - Powerful Sorcerer', setCode: '4', number: 59, core: false});
    expect(coreCopyOf({card: URSULA_SET_3, cards: [MOTHER_KNOWS_BEST, URSULA_SET_9]})).toEqual({id: '2026', name: 'Ursula - Deceiver (Set 9 #90)'});
    expect(coreCopyOf({card: YEN_SID, cards: [URSULA_SET_9]})).toBeNull();
    expect(coreCopyOf({card: URSULA_SET_9, cards: [URSULA_SET_9]})).toBeNull();
  });
  it('files a card whose data names no set as a card of Sets 1 to 8', () => {
    expect(baseCardOf({...YEN_SID, setCode: undefined, setNumber: undefined})).toEqual({id: 750, fullName: 'Yen Sid - Powerful Sorcerer', setCode: '', number: 0, core: false});
  });
  it('names the first Core card that has the name', () => {
    const second = {...URSULA_SET_9, id: '9999', setNumber: 190};
    expect(coreCopyOf({card: URSULA_SET_3, cards: [second, URSULA_SET_9]})).toEqual({id: '9999', name: 'Ursula - Deceiver (Set 9 #190)'});
  });
});

describe('changeOf', () => {
  it('builds the change a form publishes', () => {
    const values = {...EMPTY_PRINTING_FORM, promoGrouping: 'P5', number: '1', versions: 'foil' as const, note: ' '};
    expect(changeOf({kind: 'add', card: PRINCE, printing: null, values, scan: SCAN})).toEqual({kind: 'add', card: PRINCE,
      printing: {promoGrouping: 'P5', number: 1, finishes: ['foil'], scanLanguage: null}, note: null, scan: {ext: 'webp', base64: 'UklGRgAAAABXRUJQ'}});
    const snow = findPrinting(FIXTURE_CATALOG, 80049)!.printing;
    expect(changeOf({kind: 'edit', card: PRINCE, printing: snow, values: {...editValuesOf(snow), number: '44'}, scan: NO_SCAN}))
      .toMatchObject({kind: 'edit', id: 80049, from: {promoGrouping: 'P2', number: 42, scanLanguage: 'zh', officialArt: false},
        edit: {promoGrouping: 'P2', number: 44, scanLanguage: 'zh'}, scan: null});
  });
  it('keeps a scan language other than English, trims a note and lowercases the extension', () => {
    const values = {...EMPTY_PRINTING_FORM, promoGrouping: 'P5', number: ' 07 ', versions: 'both' as const, scanLanguage: 'ja', note: '  Foil (owner).  '};
    expect(changeOf({kind: 'add', card: PRINCE, printing: null, values, scan: {...SCAN, name: 'Scan.WEBP'}})).toEqual({kind: 'add', card: PRINCE,
      printing: {promoGrouping: 'P5', number: 7, finishes: ['normal', 'foil'], scanLanguage: 'ja'}, note: 'Foil (owner).', scan: {ext: 'webp', base64: 'UklGRgAAAABXRUJQ'}});
  });
  it('strips the data-URL prefix, whatever it holds', () => {
    const values = {...EMPTY_PRINTING_FORM, promoGrouping: 'P5', number: '1', versions: 'normal' as const};
    const scan = {name: 'a.png', dataUrl: 'data:image/png;name=a.png;base64,iVBORw0KGgo=', error: null};
    expect(changeOf({kind: 'add', card: PRINCE, printing: null, values, scan})).toMatchObject({scan: {ext: 'png', base64: 'iVBORw0KGgo='}});
  });
  it("sends a new scan with an edit of a printing without Ravensburger's art, and its note and language", () => {
    const snow = printing(80049);
    const values = {...editValuesOf(snow), scanLanguage: 'ja', note: 'Re-scanned.'};
    expect(changeOf({kind: 'edit', card: SNOW_WHITE, printing: snow, values, scan: SCAN})).toEqual({kind: 'edit', card: SNOW_WHITE, id: 80049,
      from: {promoGrouping: 'P2', number: 42, scanLanguage: 'zh', officialArt: false},
      edit: {promoGrouping: 'P2', number: 42, scanLanguage: 'ja'}, note: 'Re-scanned.', scan: {ext: 'webp', base64: 'UklGRgAAAABXRUJQ'}});
  });
  it("never sends a scan with an edit of a printing that has Ravensburger's art", () => {
    const hiro = printing(1661);
    const change = changeOf({kind: 'edit', card: HIRO, printing: hiro, values: {...editValuesOf(hiro), note: 'The first of the two arts.'}, scan: SCAN});
    expect(change).toMatchObject({kind: 'edit', id: 1661, from: {promoGrouping: 'P2', number: 24, scanLanguage: null, officialArt: true, artVariant: 'A'},
      edit: {promoGrouping: 'P2', number: 24, scanLanguage: null}, note: 'The first of the two arts.', scan: null});
  });
  it('makes an English edit a change of no language', () => {
    const snow = printing(80049);
    expect(changeOf({kind: 'edit', card: SNOW_WHITE, printing: snow, values: {...editValuesOf(snow), scanLanguage: 'en'}, scan: NO_SCAN}))
      .toMatchObject({edit: {scanLanguage: null}});
  });
  it('refuses a form that is not complete, rather than build a change from it', () => {
    const values = {...EMPTY_PRINTING_FORM, promoGrouping: 'P5', number: '1', versions: 'foil' as const};
    const without = (what: Partial<PrintingFormValues>, scan = SCAN) => () => changeOf({kind: 'add', card: PRINCE, printing: null, values: {...values, ...what}, scan});
    expect(without({number: ''})).toThrow('The form is incomplete');
    expect(without({versions: null})).toThrow('The form is incomplete');
    expect(without({}, NO_SCAN)).toThrow('The form is incomplete');
    expect(() => changeOf({kind: 'edit', card: SNOW_WHITE, printing: printing(80049), values: {...values, number: 'x'}, scan: NO_SCAN})).toThrow('The form is incomplete');
    expect(() => changeOf({kind: 'edit', card: SNOW_WHITE, printing: null, values, scan: NO_SCAN})).toThrow('An edit needs the printing it edits');
  });
});
