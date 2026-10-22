import {afterEach, describe, expect, it, vi} from 'vitest';
import {BASE, COMMIT_URL, notAFastForward, stubRepo} from '../../finishes/__tests__/repoHarness';
import {ALL_CARDS_PATH, CATALOG_PATH, PROMOS_PATH} from '../../finishes/finishFiles';
import type {PrintingEdit} from '../catalogEdits';
import {findPrinting, nextProvisionalId, parseCatalog, type BaseCard, type PromoCatalog, type WaitingGroup} from '../promoCatalog';
import {outOfStep} from '../promoMerge';
import {
  RAW_SCAN_DIR,
  factsOf,
  printingCommitMessage,
  publishPrinting,
  type PrintingChange,
  type PrintingFacts,
  type PrintingRefusal,
  type RefusalKind,
  type ScanFile,
} from '../publishPrinting';
import {readPinned} from './pinned';
import {FIXTURE_CATALOG, FIXTURE_FILES, MKB_BASE, PRINCE, filesFor} from './promoFixtures';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

/** The printing of FIXTURE_CATALOG with this id. */
const printing = (id: number) => findPrinting(FIXTURE_CATALOG, id)!.printing;

const SCAN: ScanFile = {ext: 'webp', base64: 'UklGRgAAAABXRUJQ'};
const ADD_9_P4: PrintingChange = {kind: 'add', card: PRINCE, printing: {promoGrouping: 'P4', number: 9, finishes: ['foil'], scanLanguage: null}, note: null, scan: SCAN};
const EDIT_80024 = (edit: Partial<PrintingEdit>, from = factsOf(printing(80024))): Extract<PrintingChange, {kind: 'edit'}> =>
  ({kind: 'edit', card: MKB_BASE, id: 80024, from, edit: {promoGrouping: 'C3', number: 13, scanLanguage: null, ...edit}, note: null, scan: null});

/** Hades - Dark Usurper, whose card no dataset has yet: it has no base number. */
const HADES: BaseCard = {id: 0, fullName: 'Hades - Dark Usurper', setCode: '15', number: 0, core: false};
/** The Championship Hades, 80032: it has 28/C3 as the Challenge Top 8 Hades, 80031, does, and only its source tells them apart. */
const NOTE_ON_80032: PrintingChange = {kind: 'edit', card: HADES, id: 80032, from: factsOf(printing(80032)),
  edit: {promoGrouping: 'C3', number: 28, scanLanguage: null}, note: 'Championship prize.', scan: null};
/** Snow White's 42/P2, a Chinese scan, made Japanese: a printing of a Sets 1 to 8 card, which only promos.json lists. */
const SNOW_WHITE_TO_JA: PrintingChange = {kind: 'edit', card: {id: 240, fullName: 'Snow White - Unexpected Houseguest', setCode: '2', number: 24, core: false},
  id: 80049, from: factsOf(printing(80049)), edit: {promoGrouping: 'P2', number: 42, scanLanguage: 'ja'}, note: null, scan: null};

/** Hiro Hamada - Armor Designer, whose 24A/P2 and 24B/P2 are two arts under one number. */
const HIRO: BaseCard = {id: 1529, fullName: 'Hiro Hamada - Armor Designer', setCode: '7', number: 96, core: false};
/** FIXTURE_CATALOG with a third art of Hiro's beside the others: 25B/P2, the only printing with that number. */
const WITH_25B: PromoCatalog = {
  ...FIXTURE_CATALOG,
  noBaseCard: FIXTURE_CATALOG.noBaseCard.map((group): WaitingGroup => (group.fullName === HIRO.fullName
    ? {...group, variants: [...group.variants, {id: 1663, rarity: 'Special', number: 25, promoGrouping: 'P2', artVariant: 'B', finishes: ['foil']}]}
    : group)),
};
/** Moves a printing of WITH_25B to number 25 of its promo set, P2, as the form opened it. */
const to25P2 = ({card, id}: {card: BaseCard; id: number}): PrintingChange => ({kind: 'edit', card, id, from: factsOf(findPrinting(WITH_25B, id)!.printing),
  edit: {promoGrouping: 'P2', number: 25, scanLanguage: null}, note: null, scan: null});

/** FIXTURE_FILES with Mother Knows Best's 13/C3 gone from allCards.json and promos.json an empty list: the merge would change both. */
function staleFiles(): Record<string, string> {
  const all = JSON.parse(FIXTURE_FILES[ALL_CARDS_PATH]) as {cards: Array<{id: number; variants?: object[]}>};
  all.cards.find((card) => card.id === 2035)?.variants?.pop();
  return {...FIXTURE_FILES, [ALL_CARDS_PATH]: `${JSON.stringify(all, null, 2)}\n`, [PROMOS_PATH]: '[]\n'};
}

describe('the fixture branch', () => {
  it('is in step with its catalog', () => {
    const files = {allCards: FIXTURE_FILES[ALL_CARDS_PATH], promos: FIXTURE_FILES[PROMOS_PATH]};
    expect(outOfStep({catalog: parseCatalog(FIXTURE_FILES[CATALOG_PATH]), files})).toEqual([]);
  });
});

describe('factsOf', () => {
  it('reads what the form edits of a printing, and whether its art is Ravensburger\'s', () => {
    expect(factsOf(printing(80049))).toEqual({promoGrouping: 'P2', number: 42, scanLanguage: 'zh', officialArt: false});
    expect(factsOf(printing(1191))).toEqual({promoGrouping: 'D23', number: 1, scanLanguage: null, officialArt: true});
  });
  it('reads a printing with no number as null', () => {
    expect(factsOf({id: 1, rarity: 'Special', promoGrouping: 'C1'})).toEqual({promoGrouping: 'C1', number: null, scanLanguage: null, officialArt: false});
  });
});

describe('publishPrinting', () => {
  it('adds a printing in one commit: the catalog, both card files and the scan', async () => {
    const repo = stubRepo({files: FIXTURE_FILES});
    await expect(publishPrinting({token: 't', change: ADD_9_P4})).resolves.toEqual({commitUrl: COMMIT_URL, id: 80050, code: '9/P4'});
    expect(Object.keys(repo.filesSent()).sort()).toEqual([ALL_CARDS_PATH, PROMOS_PATH, `${RAW_SCAN_DIR}/80050.webp`, CATALOG_PATH].sort());
    expect(repo.base64Sent()[`${RAW_SCAN_DIR}/80050.webp`]).toBe(SCAN.base64);
    expect(repo.commitMessage()).toBe('chore(collection): add 9/P4 Mickey Mouse - Brave Little Prince from Card studio');
    expect(outOfStep({catalog: parseCatalog(repo.filesSent()[CATALOG_PATH]), files: {allCards: repo.filesSent()[ALL_CARDS_PATH], promos: repo.filesSent()[PROMOS_PATH]}})).toEqual([]);
  });
  it('writes the catalog with the new printing in its card\'s group', async () => {
    const repo = stubRepo({files: FIXTURE_FILES});
    await publishPrinting({token: 't', change: ADD_9_P4});
    const sent = parseCatalog(repo.filesSent()[CATALOG_PATH]);
    expect(sent.fold.find((group) => group.baseId === 2047)?.variants).toEqual([{id: 80050, rarity: 'Special', number: 9, promoGrouping: 'P4', finishes: ['foil']}]);
  });
  it('reads the catalog and both card files at the commit it builds on, with the token', async () => {
    const repo = stubRepo({files: FIXTURE_FILES});
    await publishPrinting({token: 't', change: ADD_9_P4});
    expect(repo.reads().map(({path}) => path).sort()).toEqual([ALL_CARDS_PATH, CATALOG_PATH, PROMOS_PATH].sort());
    expect(repo.reads().every(({ref, token}) => ref === BASE && token === 't')).toBe(true);
  });
  it('commits only the catalog for an edit that adds a note', async () => {
    const repo = stubRepo({files: FIXTURE_FILES});
    await publishPrinting({token: 't', change: {...EDIT_80024({}), note: 'Foil twin of 1/C3.'}});
    expect(Object.keys(repo.filesSent())).toEqual([CATALOG_PATH]);
    expect(repo.commitMessage()).toBe('chore(collection): edit 13/C3 Mother Knows Best from Card studio');
  });
  it('names a renumbering in its commit', async () => {
    const repo = stubRepo({files: FIXTURE_FILES});
    await publishPrinting({token: 't', change: EDIT_80024({number: 14})});
    expect(repo.commitMessage()).toBe('chore(collection): edit 13/C3 to 14/C3 Mother Knows Best from Card studio');
  });
  it('reports the edited printing by its own id and its code after the change', async () => {
    stubRepo({files: FIXTURE_FILES});
    await expect(publishPrinting({token: 't', change: EDIT_80024({number: 14})})).resolves.toEqual({commitUrl: COMMIT_URL, id: 80024, code: '14/C3'});
  });
  it('commits the card files an edit changes, and only those', async () => {
    const repo = stubRepo({files: FIXTURE_FILES});
    await publishPrinting({token: 't', change: SNOW_WHITE_TO_JA});
    expect(Object.keys(repo.filesSent())).toEqual([CATALOG_PATH, PROMOS_PATH]);
    const promos = JSON.parse(repo.filesSent()[PROMOS_PATH]) as Array<{id: number; scanLanguage?: string}>;
    expect(promos.find(({id}) => id === 80049)?.scanLanguage).toBe('ja');
  });
  it('replaces a scan at the printing\'s id, with the catalog beside it', async () => {
    const repo = stubRepo({files: FIXTURE_FILES});
    await publishPrinting({token: 't', change: {...EDIT_80024({}), scan: {ext: 'png', base64: 'iVBORw0KGgo='}}});
    expect(Object.keys(repo.filesSent())).toEqual([CATALOG_PATH, `${RAW_SCAN_DIR}/80024.png`]);
    expect(repo.base64Sent()[`${RAW_SCAN_DIR}/80024.png`]).toBe('iVBORw0KGgo=');
  });
  it('lets a note-only edit through for a printing that shares its code with a twin', async () => {
    const repo = stubRepo({files: FIXTURE_FILES});
    await publishPrinting({token: 't', change: NOTE_ON_80032});
    expect(Object.keys(repo.filesSent())).toEqual([CATALOG_PATH]);
    expect(repo.commitMessage()).toBe('chore(collection): edit 28/C3 Hades - Dark Usurper from Card studio');
    expect(parseCatalog(repo.filesSent()[CATALOG_PATH]).notes).toEqual([{printing: '28/C3', card: 'Hades - Dark Usurper', note: 'Championship prize.'}]);
  });
  it('says to publish again when the branch moved', async () => {
    stubRepo({files: FIXTURE_FILES, update: notAFastForward});
    await expect(publishPrinting({token: 't', change: ADD_9_P4})).rejects.toThrow('master changed while publishing, so nothing was published. Publish again.');
  });
});

describe('over the pinned app files', () => {
  it('adds a printing, and every other byte of the card files stays as it was', async () => {
    const pinned = {[CATALOG_PATH]: readPinned(CATALOG_PATH), [ALL_CARDS_PATH]: readPinned(ALL_CARDS_PATH), [PROMOS_PATH]: readPinned(PROMOS_PATH)};
    const repo = stubRepo({files: pinned});
    const id = nextProvisionalId(parseCatalog(pinned[CATALOG_PATH]));
    // 9/P4 is a printing at the pin already, and so is every number from 7 to 16.
    const change: PrintingChange = {...ADD_9_P4, printing: {...ADD_9_P4.printing, number: 99}};
    await expect(publishPrinting({token: 't', change})).resolves.toMatchObject({commitUrl: COMMIT_URL, id, code: '99/P4'});
    const sent = repo.filesSent();
    const all = JSON.parse(sent[ALL_CARDS_PATH]) as {cards: Array<{id: number; variants: Array<{id: number}>}>};
    expect(all.cards.find((card) => card.id === 2047)?.variants.pop()).toMatchObject({id});
    expect(`${JSON.stringify(all, null, 2)}
`).toBe(pinned[ALL_CARDS_PATH]);
    const promos = (JSON.parse(sent[PROMOS_PATH]) as Array<{id: number}>).filter((promo) => promo.id !== id);
    expect(`${JSON.stringify(promos)}
`).toBe(pinned[PROMOS_PATH]);
    expect(outOfStep({catalog: parseCatalog(sent[CATALOG_PATH]), files: {allCards: sent[ALL_CARDS_PATH], promos: sent[PROMOS_PATH]}})).toEqual([]);
  });
});

describe('an edit onto the number of another art', () => {
  it('is free for a printing of another art: 24A moves beside 25B', async () => {
    const repo = stubRepo({files: filesFor(WITH_25B)});
    await expect(publishPrinting({token: 't', change: to25P2({card: HIRO, id: 1661})})).resolves.toMatchObject({id: 1661, code: '25/P2'});
    expect(Object.keys(repo.filesSent())).toEqual([CATALOG_PATH, PROMOS_PATH]);
  });
  it('is taken for a printing with no art variant: 13/C3 moves onto 25B', async () => {
    const repo = stubRepo({files: filesFor(WITH_25B)});
    await expect(publishPrinting({token: 't', change: to25P2({card: MKB_BASE, id: 80024})})).rejects.toMatchObject({kind: 'taken',
      message: '25/P2 is taken on master: Hiro Hamada - Armor Designer has it.'});
    expect(repo.writes()).toEqual([]);
  });
});

describe('printingCommitMessage', () => {
  it('names the code a printing had where nobody knew its number', () => {
    const change: PrintingChange = {kind: 'edit', card: MKB_BASE, id: 80024, from: {promoGrouping: 'C1', number: null, scanLanguage: null, officialArt: false},
      edit: {promoGrouping: 'C1', number: 5, scanLanguage: null}, note: null, scan: null};
    expect(printingCommitMessage({change, code: '5/C1'})).toBe('chore(collection): edit ?/C1 to 5/C1 Mother Knows Best from Card studio');
  });
});

describe('a publish the branch can\'t take', () => {
  it.each([
    ['taken', {...ADD_9_P4, printing: {...ADD_9_P4.printing, promoGrouping: 'C3', number: 13}}, '13/C3 is taken on master: Mother Knows Best has it.'],
    ['unknownSet', {...ADD_9_P4, printing: {...ADD_9_P4.printing, promoGrouping: 'Q9'}}, "Q9 isn't one of the app's promo sets. Add it to PROMO_SETS in the app first."],
    ['changed', EDIT_80024({number: 14}, {promoGrouping: 'C3', number: 12, scanLanguage: null, officialArt: false}),
      "Someone changed 12/C3 on master after you opened it. The form now shows the branch's values: make your change again."],
    ['gone', {...EDIT_80024({}), id: 80099}, '13/C3 is no longer on master.'],
  ])('refuses %s at the base and writes nothing', async (kind, change, message) => {
    const repo = stubRepo({files: FIXTURE_FILES});
    await expect(publishPrinting({token: 't', change: change as PrintingChange})).rejects.toMatchObject({name: 'PrintingRefusal', kind, message});
    expect(repo.writes()).toEqual([]);
  });
  it.each<[string, PrintingChange, RefusalKind, string]>([
    ['a new 24/P2, though 24A and 24B hold it', {...ADD_9_P4, printing: {...ADD_9_P4.printing, promoGrouping: 'P2', number: 24}},
      'taken', '24/P2 is taken on master: Hiro Hamada - Armor Designer has it.'],
    ['an edit onto another printing\'s code', EDIT_80024({number: 12}),
      'taken', '12/C3 is taken on master: Mickey Mouse - Brave Little Tailor has it.'],
    ['an edit to a promo set the app doesn\'t know', EDIT_80024({promoGrouping: 'Q9'}),
      'unknownSet', "Q9 isn't one of the app's promo sets. Add it to PROMO_SETS in the app first."],
  ])('refuses %s', async (_what, change, kind, message) => {
    const repo = stubRepo({files: FIXTURE_FILES});
    await expect(publishPrinting({token: 't', change})).rejects.toMatchObject({name: 'PrintingRefusal', kind, message});
    expect(repo.writes()).toEqual([]);
  });
  it.each<[string, Partial<PrintingFacts>]>([
    ['promo set', {promoGrouping: 'P1'}],
    ['number', {number: 12}],
    ['scan language', {scanLanguage: 'ja'}],
    ['art', {officialArt: true}],
  ])('refuses an edit whose printing\'s %s changed since the form opened', async (_what, differs) => {
    const repo = stubRepo({files: FIXTURE_FILES});
    const from = {...factsOf(printing(80024)), ...differs};
    await expect(publishPrinting({token: 't', change: EDIT_80024({}, from)})).rejects.toMatchObject({kind: 'changed'});
    expect(repo.writes()).toEqual([]);
  });
  it("hands a 'changed' refusal the branch's entry", async () => {
    stubRepo({files: FIXTURE_FILES});
    const refusal = await publishPrinting({token: 't', change: EDIT_80024({}, {promoGrouping: 'C3', number: 12, scanLanguage: null, officialArt: false})}).catch((e: unknown) => e);
    expect((refusal as PrintingRefusal).now?.id).toBe(80024);
  });
  it('names the branch it publishes to', async () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'rehearse-77');
    stubRepo({files: FIXTURE_FILES});
    const taken: PrintingChange = {...ADD_9_P4, printing: {...ADD_9_P4.printing, promoGrouping: 'C3', number: 13}};
    await expect(publishPrinting({token: 't', change: taken})).rejects.toThrow('13/C3 is taken on rehearse-77: Mother Knows Best has it.');
  });
  it('refuses out-of-step files, naming what the merge would change', async () => {
    const repo = stubRepo({files: {...FIXTURE_FILES, [PROMOS_PATH]: '[]\n'}});
    await expect(publishPrinting({token: 't', change: ADD_9_P4})).rejects.toMatchObject({kind: 'outOfStep',
      message: 'The catalog and the card files are out of step on master: the merge would change collection/promos.json. Run pnpm merge-promos --write in the app, then publish again.'});
    expect(repo.writes()).toEqual([]);
  });
  it('names every card and file the merge would change', async () => {
    const repo = stubRepo({files: staleFiles()});
    await expect(publishPrinting({token: 't', change: ADD_9_P4})).rejects.toThrow(
      'the merge would change Mother Knows Best, collection/promos.json. Run pnpm merge-promos --write in the app, then publish again.');
    expect(repo.writes()).toEqual([]);
  });
  it.each<[string, PrintingChange, RefusalKind]>([
    ['out of step before an unknown promo set', {...ADD_9_P4, printing: {...ADD_9_P4.printing, promoGrouping: 'Q9'}}, 'outOfStep'],
    ['out of step before a printing that is gone', {...EDIT_80024({}), id: 80099}, 'outOfStep'],
  ])('checks %s', async (_what, change, kind) => {
    stubRepo({files: staleFiles()});
    await expect(publishPrinting({token: 't', change})).rejects.toMatchObject({kind});
  });
  it.each<[string, PrintingChange, RefusalKind]>([
    ['a printing that is gone before an unknown promo set', {...EDIT_80024({promoGrouping: 'Q9'}), id: 80099}, 'gone'],
    ['a changed printing before a taken code', EDIT_80024({number: 12}, {promoGrouping: 'C3', number: 99, scanLanguage: null, officialArt: false}), 'changed'],
    ['a changed printing before an unknown promo set', EDIT_80024({promoGrouping: 'Q9'}, {promoGrouping: 'C3', number: 99, scanLanguage: null, officialArt: false}), 'changed'],
  ])('checks %s', async (_what, change, kind) => {
    stubRepo({files: FIXTURE_FILES});
    await expect(publishPrinting({token: 't', change})).rejects.toMatchObject({kind});
  });
  it("passes on the app's own error for a catalog that can't merge, writing nothing", async () => {
    const repo = stubRepo({files: FIXTURE_FILES});
    const stray: BaseCard = {id: 99999, fullName: 'Nobody - Nowhere', setCode: '9', number: 1, core: true};
    await expect(publishPrinting({token: 't', change: {...ADD_9_P4, card: stray}})).rejects.toThrow('no card 99999 (Nobody - Nowhere) in allCards.json');
    expect(repo.writes()).toEqual([]);
  });
});
