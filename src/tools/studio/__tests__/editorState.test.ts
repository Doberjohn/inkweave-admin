import {describe, expect, it, vi} from 'vitest';
import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {imageDataUrl, pngFile} from '../../../test/images';
import type {RevealCardForm} from '../../reveal/buildPreviewCard';
import {computeSynergies} from '../../reveal/livePreview';
import {formFromPreviewCard, type ImageOnlyReason} from '../cardEdit';
import {changeRows, type ChangeRow} from '../changeRows';
import {
  discardDraft,
  draftChanges,
  draftValidation,
  editLookup,
  editPreview,
  editSynergies,
  draftView,
  imageOnlyOf,
  needsSeed,
  openTag,
  patchDraft,
  previewFileView,
  revertDraftImage,
  revertDraftRow,
  rowsAfterRevert,
  seedDraft,
  stageImage,
  stagedImage,
  type CardListState,
  type Draft,
  type EditLookup,
} from '../editorState';
import type {PreviewCardsFile} from '../previewCardsFile';
import {
  BRANCH_ENTRIES,
  NAMED_ABILITY_ENTRY,
  OTHER_SET_ENTRY,
  PREVIEW_ENTRY,
  RELEASED_CARD,
  RELEASED_REVEAL_CARD,
  STUDIO_CARDS,
  UNNUMBERED_ENTRY,
  listCard,
} from '../studioFixtures';

// The engine stays real; the spy shows which cards the synergies are scored against.
vi.mock('../../reveal/livePreview', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../reveal/livePreview')>();
  return {...actual, computeSynergies: vi.fn(actual.computeSynergies)};
});

const LOADING: PreviewCardsFile = {status: 'loading'};
const FAILED: PreviewCardsFile = {status: 'error', error: 'GitHub 500 on previewCards.json'};
/** The branch file after its `read`th read, holding `cards`, as R4-4a's hook gives it. */
const readFile = ({cards = BRANCH_ENTRIES, read = 1}: {cards?: LorcanaJSONCard[]; read?: number} = {}): Extract<PreviewCardsFile, {status: 'ready'}> => ({
  status: 'ready',
  cards,
  ids: new Set(cards.map((entry) => entry.id)),
  read,
});

/** The card list, loaded with every studio card, and the reveal set's released one, unless told otherwise. */
const LISTED = [...STUDIO_CARDS, RELEASED_REVEAL_CARD];
function cardList({isLoading = false, error = null}: Partial<CardListState> = {}): CardListState {
  return {isLoading, error, getCardById: (id) => LISTED.find((card) => card.id === id)};
}

/** Mei, R4-2a's PREVIEW_ENTRY: an editable preview card, and a Singer 5. */
const MEI = PREVIEW_ENTRY;
const MEI_ID = String(MEI.id);

/** The lookup and a fresh draft for a card, as the editor seeds them. */
function opened({cardId = MEI_ID, file = readFile()}: {cardId?: string; file?: PreviewCardsFile} = {}) {
  const lookup = editLookup({cardId, list: cardList(), file});
  return {lookup, draft: seedDraft({cardId, lookup, file, seed: 1})};
}

describe('editLookup', () => {
  const ready = (card: LorcanaCard, imageOnly: ImageOnlyReason | null) => ({kind: 'ready' as const, card, imageOnly});
  it.each<[string, {cardId: string | null; list?: Partial<CardListState>; file?: PreviewCardsFile}, Partial<EditLookup>]>([
    ['a failed card list, with no card open too', {cardId: null, list: {error: new Error('offline')}}, {kind: 'listFailed'}],
    ['no card, while the list loads', {cardId: null, list: {isLoading: true}}, {kind: 'none'}],
    ['a card while the list loads', {cardId: MEI_ID, list: {isLoading: true}}, {kind: 'loading'}],
    ['an id the list lacks, before the file is read', {cardId: '14999', file: LOADING}, {kind: 'missing', cardId: '14999'}],
    ['a card of the reveal set while the file loads', {cardId: MEI_ID, file: LOADING}, {kind: 'loading'}],
    ['a card of the reveal set when the file fails', {cardId: MEI_ID, file: FAILED}, {kind: 'fileFailed', error: 'GitHub 500 on previewCards.json'}],
    ['an editable preview card', {cardId: MEI_ID}, {...ready(listCard(MEI), null), entry: MEI}],
    // R4-4d turns this row into its graduated-id state (R-66).
    ['a card of the reveal set the file lacks', {cardId: MEI_ID, file: readFile({cards: []})}, {...ready(listCard(MEI), 'released'), entry: null}],
    ['a released card while the file loads (R-71)', {cardId: RELEASED_CARD.id, file: LOADING}, ready(RELEASED_CARD, 'released')],
    ['a released card when the file fails (R-71)', {cardId: RELEASED_CARD.id, file: FAILED}, ready(RELEASED_CARD, 'released')],
    // Graduation released the reveal set under official ids, which the file can say nothing about (R-71, R4-8a).
    ['a released card of the reveal set while the file loads', {cardId: RELEASED_REVEAL_CARD.id, file: LOADING}, ready(RELEASED_REVEAL_CARD, 'released')],
    ['a released card of the reveal set when the file fails', {cardId: RELEASED_REVEAL_CARD.id, file: FAILED}, ready(RELEASED_REVEAL_CARD, 'released')],
    ['an entry of another set, once the file is read (R-65)', {cardId: String(OTHER_SET_ENTRY.id)}, ready(listCard(OTHER_SET_ENTRY), 'other-set')],
    ['an entry with no number (R-65)', {cardId: String(UNNUMBERED_ENTRY.id)}, ready(listCard(UNNUMBERED_ENTRY), 'unnumbered')],
    ['an entry the form can’t hold (R-65)', {cardId: String(NAMED_ABILITY_ENTRY.id)}, ready(listCard(NAMED_ABILITY_ENTRY), 'unrepresentable')],
  ])('%s', (_, {cardId, list, file = readFile()}, expected) => {
    expect(editLookup({cardId, list: cardList(list), file})).toMatchObject(expected);
  });
});

describe('the open card’s tag and view', () => {
  it.each<[string, string, PreviewCardsFile, Pick<ReturnType<typeof draftView>, 'imageOnly'> & {tag: ReturnType<typeof openTag>; name?: string}]>([
    ['a card that waits', MEI_ID, LOADING, {tag: null, imageOnly: null, name: undefined}],
    ['an editable preview card', MEI_ID, readFile(), {tag: 'Preview', imageOnly: null, name: 'Mei'}],
    ['a preview entry that opens image-only', String(UNNUMBERED_ENTRY.id), readFile(), {tag: 'Preview', imageOnly: 'unnumbered', name: undefined}],
    ['a released card', RELEASED_CARD.id, LOADING, {tag: 'Released', imageOnly: 'released', name: undefined}],
    ['a released card of the reveal set, when the file fails', RELEASED_REVEAL_CARD.id, FAILED, {tag: 'Released', imageOnly: 'released', name: undefined}],
  ])('%s', (_, cardId, file, expected) => {
    const {lookup, draft} = opened({cardId, file});
    const view = draftView(draft);
    expect({tag: openTag(lookup), imageOnly: view.imageOnly, name: view.form?.name}).toEqual(expected);
  });
});

describe('imageOnlyOf: the reason the page shows', () => {
  const OTHER_SET_ID = String(OTHER_SET_ENTRY.id);
  const lookupOf = ({cardId, file}: {cardId: string; file: PreviewCardsFile}) => editLookup({cardId, list: cardList(), file});
  // A draft keeps the kind it was seeded with; these two were seeded before a read that changes their card's reason.
  const seededLoading = opened({cardId: OTHER_SET_ID, file: LOADING}).draft;
  const seededWithoutEntry = opened({file: readFile({cards: []})}).draft;
  it.each<[string, Draft, EditLookup, ImageOnlyReason | null]>([
    ['a field edit', opened().draft, opened().lookup, null],
    // Only editLookup reads this state: the hook's branchLookup reads it as gone, which re-seeds the draft (R-66).
    ['a field edit whose card a newer read lacks, as editLookup reads it: no reason', opened().draft, lookupOf({cardId: MEI_ID, file: readFile({cards: [], read: 2})}), null],
    ['a draft that waits', opened({file: LOADING}).draft, {kind: 'loading'}, null],
    ['a card of another set while the file loads (R-71)', seededLoading, lookupOf({cardId: OTHER_SET_ID, file: LOADING}), 'released'],
    ['the same card once the file holds it: a pin lag (R-65)', seededLoading, lookupOf({cardId: OTHER_SET_ID, file: readFile()}), 'other-set'],
    ['an image draft whose card isn’t ready', seededLoading, {kind: 'loading'}, 'released'],
    ['an image draft whose entry now has fields: it has no form, so its own reason', seededWithoutEntry, lookupOf({cardId: MEI_ID, file: readFile({read: 2})}), 'released'],
  ])('%s', (_, draft, lookup, expected) => {
    expect(imageOnlyOf({draft, lookup})).toBe(expected);
  });
});

describe('seedDraft', () => {
  it('seeds an editable card with its form as loaded, and no image', () => {
    const form = formFromPreviewCard(MEI);
    expect(opened().draft).toEqual({
      cardId: MEI_ID,
      seed: 1,
      read: 1,
      follow: false,
      edit: {kind: 'fields', loaded: MEI, before: form, form},
      image: null,
    });
  });

  it('builds no form for an entry that opens image-only (R-65)', () => {
    expect(opened({cardId: String(UNNUMBERED_ENTRY.id)}).draft.edit).toEqual({kind: 'image', reason: 'unnumbered'});
  });

  it('waits, with no read, while the card list loads, though the file is read', () => {
    const lookup = editLookup({cardId: MEI_ID, list: cardList({isLoading: true}), file: readFile()});
    expect(seedDraft({cardId: MEI_ID, lookup, file: readFile(), seed: 1})).toMatchObject({read: null, follow: true, edit: null});
  });

  it.each<[string, string, PreviewCardsFile, Pick<Draft, 'read' | 'follow' | 'edit'>]>([
    ['a card of the reveal set waits for the file', MEI_ID, LOADING, {read: null, follow: true, edit: null}],
    ['a released card opens without it, and never waits (R-71)', RELEASED_CARD.id, LOADING, {read: null, follow: false, edit: {kind: 'image', reason: 'released'}}],
    ['so does a released card of the reveal set (R4-8a)', RELEASED_REVEAL_CARD.id, LOADING, {read: null, follow: false, edit: {kind: 'image', reason: 'released'}}],
  ])('%s', (_, cardId, file, expected) => {
    expect(opened({cardId, file}).draft).toMatchObject(expected);
  });
});

describe('needsSeed', () => {
  const waiting = opened({file: LOADING});
  const settled = opened();
  it.each<[string, {draft: Draft; cardId?: string; file: PreviewCardsFile}, boolean]>([
    ['another card', {draft: settled.draft, cardId: RELEASED_CARD.id, file: readFile()}, true],
    ['a waiting draft whose card is now ready', {draft: waiting.draft, file: readFile()}, true],
    ['a waiting draft whose card still loads', {draft: waiting.draft, file: LOADING}, false],
    ['a settled draft and a newer read: its edits stay', {draft: settled.draft, file: readFile({read: 2})}, false],
    ['a draft that follows reads, before a newer one lands', {draft: {...settled.draft, follow: true}, file: readFile()}, false],
    ['a draft that follows reads, once a newer one lands', {draft: {...settled.draft, follow: true}, file: readFile({read: 2})}, true],
  ])('%s', (_, {draft, cardId = MEI_ID, file}, expected) => {
    const lookup = editLookup({cardId, list: cardList(), file});
    expect(needsSeed({draft, cardId, lookup, file})).toBe(expected);
  });

  // R4-4d (R-66): branchLookup's answers for a card the newer read no longer holds:
  // gone while the card list holds it, missing when only the file did (a branch-only card).
  const GONE: EditLookup = {kind: 'gone', card: listCard(MEI)};
  const MISSING: EditLookup = {kind: 'missing', cardId: MEI_ID};
  it.each<{name: string; draft: Draft; lookup: EditLookup; expected: boolean}>([
    {name: 'a gone card with an edit in its draft, even one that does not follow: once, to drop it', draft: settled.draft, lookup: GONE, expected: true},
    {
      name: 'a gone card with an image-only draft: once, so its reason and its image go too',
      draft: opened({cardId: String(UNNUMBERED_ENTRY.id)}).draft,
      lookup: {kind: 'gone', card: listCard(UNNUMBERED_ENTRY)},
      expected: true,
    },
    {name: 'a missing card with an edit in its draft: once, as gone', draft: settled.draft, lookup: MISSING, expected: true},
    {name: 'a gone card whose draft holds nothing: it settles', draft: waiting.draft, lookup: GONE, expected: false},
    {name: 'a missing card whose draft holds nothing, as an unknown id’s is seeded: it settles', draft: waiting.draft, lookup: MISSING, expected: false},
  ])('$name', ({draft, lookup, expected}) => {
    expect(needsSeed({draft, cardId: draft.cardId, lookup, file: readFile({cards: [], read: 2})})).toBe(expected);
  });
});

describe('the draft’s edits', () => {
  const {draft} = opened();
  const image = opened({cardId: RELEASED_CARD.id}).draft;
  const renamed = patchDraft(draft, {name: 'Meilin', collectorNumber: '99'});

  it('patches the form, but never the collector number (R-91)', () => {
    expect(renamed.edit).toMatchObject({form: {name: 'Meilin', collectorNumber: String(MEI.number)}});
    expect(draftChanges(renamed)).toEqual({name: 'Meilin', fullName: 'Meilin - Red Panda'});
  });

  it('discards back to the form as loaded, and drops the image', () => {
    const staged = stageImage(renamed, {seed: renamed.seed, image: pngFile('a.png')});
    expect(discardDraft(staged)).toEqual({...draft, image: null});
  });

  // R4-8f: Draft.kept is what the last re-read kept, for its line: Discard and Revert image take back what they drop,
  // and the claim that an edit stays goes once no field the read kept differs from the form as loaded (R4-8c).
  describe('after a re-read that kept an edit and an image', () => {
    const reread: Draft = {
      ...stageImage(renamed, {seed: renamed.seed, image: pngFile('a.png')}),
      dropped: 0,
      kept: {edits: true, fields: ['name'], staged: true, wasEditable: true},
    };

    it('discards the claims that an edit and the image stay', () => {
      expect(discardDraft(reread)).toEqual({...draft, image: null, dropped: 0, kept: {...reread.kept, edits: false, staged: false}});
    });

    it('reverts the image and the claim that it stays, keeping the edit', () => {
      expect(revertDraftImage(reread)).toEqual({...reread, image: null, kept: {...reread.kept, staged: false}});
    });

    it('keeps the claim that an edit stays while the field the read kept still differs, typed over or not', () => {
      expect(patchDraft(reread, {name: 'Mei Lee', cost: '5'}).kept).toEqual(reread.kept);
    });

    it('takes the claim back once its edit is typed back by hand, and an edit made since never brings it back', () => {
      const undone = patchDraft(reread, {name: 'Mei'});
      expect(undone.kept).toEqual({...reread.kept, edits: false});
      expect(patchDraft(undone, {name: 'Meilin'}).kept).toEqual({...reread.kept, edits: false});
    });

    it('takes the claim back, as Revert image does, when a change event brings no file', () => {
      expect(stageImage(reread, {seed: reread.seed, image: null})).toEqual(revertDraftImage(reread));
    });

    it('records nothing on a draft no re-read has landed on', () => {
      const staged = stageImage(renamed, {seed: renamed.seed, image: pngFile('a.png')});
      expect(Object.keys(discardDraft(staged))).not.toContain('kept');
      expect(revertDraftImage(staged)).toEqual({...renamed, image: null});
      expect(Object.keys(revertDraftImage(staged))).not.toContain('kept');
      expect(Object.keys(stageImage(staged, {seed: staged.seed, image: null}))).not.toContain('kept');
    });
  });

  it('leaves an image-only card without a form or changes, and with nothing to validate', () => {
    expect(patchDraft(image, {name: 'Lantern'})).toBe(image);
    expect({changes: draftChanges(image), validation: draftValidation({draft: image, imageName: null})}).toEqual({
      changes: {},
      validation: {ok: true, errors: {}},
    });
  });

  it('validates the edit, with no image needed', () => {
    expect(draftValidation({draft, imageName: null}).ok).toBe(true);
    expect(draftValidation({draft: patchDraft(draft, {cost: ''}), imageName: null}).errors).toEqual({
      cost: 'Enter a cost (0 or more)',
    });
  });

  it('previews the form over the staged image, else the card’s current art', () => {
    const card = listCard(MEI);
    expect(editPreview({card, draft: renamed, dataUrl: null})).toMatchObject({fullName: 'Meilin - Red Panda', imageUrl: card.imageUrl});
    expect(editPreview({card, draft, dataUrl: imageDataUrl('a.png')})?.imageUrl).toBe(imageDataUrl('a.png'));
    expect(editPreview({card: null, draft, dataUrl: null})).toBeNull();
  });

  it('previews an image-only card as it is, with the staged image swapped in', () => {
    expect(editPreview({card: RELEASED_CARD, draft: image, dataUrl: null})).toBe(RELEASED_CARD);
    expect(editPreview({card: RELEASED_CARD, draft: image, dataUrl: imageDataUrl('a.png')})).toEqual({
      ...RELEASED_CARD,
      imageUrl: imageDataUrl('a.png'),
    });
  });

  it('scores the edit against every card but its own', () => {
    vi.mocked(computeSynergies).mockClear();
    const preview = editPreview({card: listCard(MEI), draft, dataUrl: null});
    editSynergies({preview, draft, cards: STUDIO_CARDS});
    const pool = vi.mocked(computeSynergies).mock.calls[0][1].map((card) => card.id);
    expect({hasOwnCopy: pool.includes(MEI_ID), size: pool.length}).toEqual({hasOwnCopy: false, size: STUDIO_CARDS.length - 1});
  });

  it('scores no synergies for an image-only card', () => {
    // Mei's Singer 5 can sing the released song, so the same preview on an editable draft has a synergy.
    const singer = editPreview({card: listCard(MEI), draft, dataUrl: null});
    const groups = (on: Draft) => editSynergies({preview: singer, draft: on, cards: STUDIO_CARDS}).length;
    expect({editable: groups(draft) > 0, imageOnly: groups(image)}).toEqual({editable: true, imageOnly: 0});
  });
});

describe('revertDraftRow: one change taken back (Doberjohn/inkweave-admin#52)', () => {
  const {draft} = opened();
  const LOADED = formFromPreviewCard(MEI);
  /** The change list's row ids for a draft of Mei's, the image's when `imageName` names one. */
  const rowsOf = (next: Draft, imageName: string | null = null) =>
    changeRows({loaded: MEI, changes: draftChanges(next), imageName}).map(({id}) => id);
  /** `fields`' values in `form`. */
  const pick = (form: RevealCardForm, fields: (keyof RevealCardForm)[]) =>
    Object.fromEntries(fields.map((field) => [field, form[field]]));

  it.each<{name: string; patch: Partial<RevealCardForm>; row: ChangeRow['id']; restored: (keyof RevealCardForm)[]; rows: [ChangeRow['id'][], ChangeRow['id'][]]}>([
    {name: 'a plain field: that field alone', patch: {rarity: 'Epic', cost: '5'}, row: 'cost', restored: ['cost'], rows: [['rarity', 'cost'], ['rarity']]},
    {
      name: 'the Ink row: both inks, the pair that builds it',
      patch: {ink: 'Amber', ink2: 'Sapphire', cost: '5'},
      row: 'color',
      restored: ['ink', 'ink2'],
      rows: [['color', 'cost'], ['cost']],
    },
    {
      name: 'the Name row: the name alone, so the version and its full name stay (fullName has no row)',
      patch: {name: 'Meilin', version: 'Bold Panda'},
      row: 'name',
      restored: ['name'],
      rows: [['name', 'version'], ['version']],
    },
    {
      name: 'the Version row: the version alone',
      patch: {name: 'Meilin', version: 'Bold Panda'},
      row: 'version',
      restored: ['version'],
      rows: [['name', 'version'], ['name']],
    },
    {name: 'a stat changed directly: that stat alone', patch: {strength: '4', lore: '3'}, row: 'strength', restored: ['strength'], rows: [['strength', 'lore'], ['lore']]},
    {
      name: 'a stat both types print, whose own edit changed it: that stat alone, so the type and its rows stay',
      patch: {type: 'Location', willpower: '6'},
      row: 'willpower',
      restored: ['willpower'],
      rows: [['type', 'strength', 'willpower'], ['type', 'strength']],
    },
    {
      name: 'the Type row: the type alone, so a stat its own edit changed stays',
      patch: {type: 'Location', willpower: '6', moveCost: '2'},
      row: 'type',
      restored: ['type'],
      rows: [['type', 'strength', 'willpower', 'moveCost'], ['willpower']],
    },
    {
      name: 'a stat only the type changed: the type, so the Type row and every stat only it changed go with it',
      patch: {type: 'Action', cost: '5'},
      row: 'lore',
      restored: ['type'],
      rows: [['type', 'cost', 'strength', 'willpower', 'lore'], ['cost']],
    },
    {
      name: 'the same beside a stat its own edit changed: the type, and that stat row stays',
      patch: {type: 'Location', willpower: '6', moveCost: '2'},
      row: 'strength',
      restored: ['type'],
      rows: [['type', 'strength', 'willpower', 'moveCost'], ['willpower']],
    },
    {
      name: 'a stat its own edit changed, which its own field brings back though the type changed too: that field alone',
      patch: {type: 'Location', willpower: '6', moveCost: '2'},
      row: 'moveCost',
      restored: ['moveCost'],
      rows: [['type', 'strength', 'willpower', 'moveCost'], ['type', 'strength', 'willpower']],
    },
    {
      name: "a stat its own field can't bring back, since the new type doesn't print it: that field, then the type",
      patch: {type: 'Action', strength: '4', cost: '5'},
      row: 'strength',
      restored: ['strength', 'type'],
      rows: [['type', 'cost', 'strength', 'willpower', 'lore'], ['cost']],
    },
    {name: 'the card text', patch: {fullText: 'Singer 5', cost: '5'}, row: 'fullText', restored: ['fullText'], rows: [['cost', 'fullText'], ['cost']]},
    {name: 'the keywords', patch: {keywords: 'Singer 5\nEvasive', cost: '5'}, row: 'abilities', restored: ['keywords'], rows: [['cost', 'abilities'], ['cost']]},
    {name: 'the scan language', patch: {scanLanguage: 'ja', cost: '5'}, row: 'scanLanguage', restored: ['scanLanguage'], rows: [['cost', 'scanLanguage'], ['cost']]},
  ])('takes back $name', ({patch, row, restored, rows: [before, after]}) => {
    const edited = patchDraft(draft, patch);
    expect(rowsOf(edited)).toEqual(before);
    const reverted = revertDraftRow(edited, row);
    // The fields it restores are as loaded, and every other edit stays.
    expect(draftView(reverted).form).toEqual({...draftView(edited).form, ...pick(LOADED, restored)});
    expect(rowsOf(reverted)).toEqual(after);
  });

  it('takes back the Image row as Revert image does, and only the image', () => {
    const staged = stageImage(patchDraft(draft, {cost: '5'}), {seed: draft.seed, image: pngFile('a.png')});
    expect(revertDraftRow(staged, 'image')).toEqual(revertDraftImage(staged));
    expect(revertDraftRow(staged, 'image').edit).toBe(staged.edit);
  });

  it('keeps the staged image when a field row is taken back', () => {
    const staged = stageImage(patchDraft(draft, {cost: '5'}), {seed: draft.seed, image: pngFile('a.png')});
    expect(revertDraftRow(staged, 'cost')).toEqual({...staged, edit: draft.edit});
  });

  it('never touches the collector number, which feeds no row', () => {
    // patchDraft pins it (R-91), so only a draft built by hand holds another; a revert still leaves it.
    const fields = draftView(draft).form ?? LOADED;
    const renumbered: Draft = {...draft, edit: {kind: 'fields', loaded: MEI, before: LOADED, form: {...fields, collectorNumber: '99', name: 'Meilin'}}};
    expect(draftView(revertDraftRow(renumbered, 'name')).form).toEqual({...LOADED, collectorNumber: '99'});
  });

  it('leaves an image-only draft as it is, but for its image', () => {
    const image = stageImage(opened({cardId: RELEASED_CARD.id}).draft, {seed: 1, image: pngFile('a.png')});
    expect(revertDraftRow(image, 'name')).toBe(image);
    expect(revertDraftRow(image, 'image')).toEqual({...image, image: null});
  });

  // R4-8c, R4-8f, as Discard does: the last re-read's line never names an edit that has gone since, nor one made after it.
  describe('after a re-read that kept two edits and an image', () => {
    const reread: Draft = {
      ...stageImage(patchDraft(draft, {name: 'Meilin', cost: '5'}), {seed: draft.seed, image: pngFile('a.png')}),
      dropped: 0,
      kept: {edits: true, fields: ['name', 'cost'], staged: true, wasEditable: true},
    };

    it('keeps the claim that an edit stays while one of them does', () => {
      expect(revertDraftRow(reread, 'cost').kept).toEqual(reread.kept);
    });

    it('takes the claim back with the last of them', () => {
      expect(revertDraftRow(revertDraftRow(reread, 'cost'), 'name').kept).toEqual({...reread.kept, edits: false});
    });

    it('takes the claim back with the last of them though an edit made since stays: the read never kept that one', () => {
      const keptRename: Draft = {...reread, kept: {edits: true, fields: ['name'], staged: true, wasEditable: true}};
      const later = patchDraft(revertDraftRow(keptRename, 'cost'), {version: 'Bold Panda'});
      expect(revertDraftRow(later, 'name').kept).toEqual({...keptRename.kept, edits: false});
    });

    it("takes back the image's claim with the Image row, as Revert image does", () => {
      expect(revertDraftRow(reread, 'image')).toEqual(revertDraftImage(reread));
    });
  });

  it("answers the rows the list keeps, in its order, the image's while the draft keeps the file", () => {
    const staged = stageImage(patchDraft(draft, {type: 'Action', cost: '5'}), {seed: draft.seed, image: pngFile('a.png')});
    expect(rowsOf(staged, 'a.png')).toEqual(['type', 'cost', 'strength', 'willpower', 'lore', 'image']);
    expect(rowsAfterRevert({draft: staged, row: 'lore', imageName: 'a.png'})).toEqual(['cost', 'image']);
    expect(rowsAfterRevert({draft: staged, row: 'image', imageName: 'a.png'})).toEqual(['type', 'cost', 'strength', 'willpower', 'lore']);
    expect(rowsAfterRevert({draft: staged, row: 'cost', imageName: null})).toEqual(['type', 'strength', 'willpower', 'lore']);
  });
});

describe('the staged image', () => {
  const {draft} = opened();
  const file = pngFile('a.png');
  const staged = stageImage(draft, {seed: draft.seed, image: file});
  const upload = {file, dataUrl: imageDataUrl('a.png'), error: null};

  it('is dropped when chosen in an older draft, and so is a change event with no file', () => {
    expect(stageImage(draft, {seed: draft.seed - 1, image: file})).toBe(draft);
    // The seed check comes first: an older draft's empty pick takes back nothing on this one.
    expect(stageImage(staged, {seed: staged.seed - 1, image: null})).toBe(staged);
  });

  it.each<[string, Draft, typeof upload, ReturnType<typeof stagedImage>]>([
    ['nothing chosen for this draft', draft, upload, {name: null, dataUrl: null, error: null}],
    ['the upload holds another file', staged, {...upload, file: pngFile('b.png')}, {name: null, dataUrl: null, error: null}],
    ['the upload holds this draft’s file', staged, upload, {name: 'a.png', dataUrl: imageDataUrl('a.png'), error: null}],
  ])('shows %s', (_, which, from, expected) => {
    expect(stagedImage({draft: which, upload: from})).toEqual(expected);
  });
});

describe('previewFileView', () => {
  it.each<[string, PreviewCardsFile, ReturnType<typeof previewFileView>]>([
    ['loading', LOADING, {status: 'loading', previewIds: null, error: null}],
    ['failed', FAILED, {status: 'error', previewIds: null, error: 'GitHub 500 on previewCards.json'}],
    ['read', readFile({cards: [MEI]}), {status: 'ready', previewIds: new Set([MEI.id]), error: null}],
    ['read, then a failed reload', {...readFile({cards: [MEI]}), reloadError: 'GitHub 502'}, {status: 'ready', previewIds: new Set([MEI.id]), error: 'GitHub 502'}],
  ])('%s', (_, file, expected) => {
    expect(previewFileView(file)).toEqual(expected);
  });
});
