import {afterEach, describe, expect, it, vi} from 'vitest';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {commitFiles} from '../../../github/githubCommit';
import {pngFile} from '../../../test/images';
import {StaleCardError} from '../../reveal/githubClient';
import {formFromPreviewCard} from '../cardEdit';
import {failureOf, imageSent, keepEdits, reseeded, savePlanOf, savedDraft, type SaveInput} from '../editSave';
import type {Draft, FieldsEdit, StagedImage} from '../editorState';
import {DUAL_INK_ENTRY, PREVIEW_ENTRY, RELEASED_CARD, RELEASED_REVEAL_CARD, cardOf} from '../studioFixtures';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const MEI = cardOf(PREVIEW_ENTRY);
const FORM = formFromPreviewCard(PREVIEW_ENTRY);
const FIELDS: FieldsEdit = {kind: 'fields', loaded: PREVIEW_ENTRY, before: FORM, form: FORM};
const FILE = pngFile('mei.png');
const DATA_URL = 'data:image/png;base64,iVBORw0KGgo=';
const NOTHING: StagedImage = {name: null, dataUrl: null, error: null};
const READ: StagedImage = {name: 'mei.png', dataUrl: DATA_URL, error: null};
const READING: StagedImage = {name: 'mei.png', dataUrl: null, error: null};

/** Mei's draft, seed 3, as R4-4b seeds it from the file's first read. */
function draft(patch: Partial<Draft> = {}): Draft {
  return {cardId: MEI.id, seed: 3, read: 1, follow: false, edit: FIELDS, image: null, ...patch};
}

/** A save's inputs on that draft: nothing changed, nothing staged, the form valid. */
function input(patch: Partial<SaveInput> = {}): SaveInput {
  return {token: 'tok', draft: draft(), card: MEI, changes: {}, validation: {ok: true, errors: {}}, staged: NOTHING, ...patch};
}

describe('savePlanOf', () => {
  it.each([
    ['no card is open', input({card: null, changes: {cost: 5}})],
    ['nothing changed', input()],
    ["a staged image's bytes aren't read", input({draft: draft({image: FILE}), staged: READING})],
    ["a field changed and a staged image's bytes aren't read", input({draft: draft({image: FILE}), staged: READING, changes: {cost: 5}})],
    ['a field changed but the form fails', input({changes: {cost: 5}, validation: {ok: false, errors: {cost: 'Enter a cost (0 or more)'}}})],
    ['a field changed on an image-only card', input({draft: draft({edit: {kind: 'image', reason: 'released'}}), changes: {cost: 5}})],
  ])('has nothing to save when %s', (_case, from) => {
    expect(savePlanOf(from)).toBeNull();
  });

  it('commits field edits through commitCardEdit, with the staged image when there is one', () => {
    expect(savePlanOf(input({changes: {cost: 5}}))).toEqual({
      path: 'fields',
      seed: 3,
      form: FORM,
      sent: null,
      commit: {token: 'tok', loaded: PREVIEW_ENTRY, changes: {cost: 5}, image: null},
    });
    expect(savePlanOf(input({draft: draft({image: FILE}), staged: READ, changes: {cost: 5}}))).toMatchObject({
      path: 'fields',
      sent: FILE,
      commit: {image: {dataUrl: DATA_URL, ext: 'png'}},
    });
  });

  // A card under a preview id checks previewCards.json still holds it (commitPreviewCardImage); a released one,
  // the reveal set's included, never reads the file (R-71, R4-8a).
  const releasedImage = (card: LorcanaCard) =>
    input({draft: draft({image: FILE, edit: {kind: 'image', reason: 'released'}}), card, staged: READ});
  it.each([
    ['a preview card', input({draft: draft({image: FILE}), staged: READ}), true],
    ['a released card', releasedImage(RELEASED_CARD), false],
    ['a released card of the reveal set', releasedImage(RELEASED_REVEAL_CARD), false],
  ])('commits an image alone on %s, checking the file: %s', (_case, from, checksFile) => {
    expect(savePlanOf(from)).toEqual({
      path: 'image',
      seed: 3,
      sent: FILE,
      checksFile,
      commit: {token: 'tok', card: {id: from.card?.id, fullName: from.card?.fullName}, imageBase64: DATA_URL, imageExt: 'png'},
    });
  });
});

/** commitFiles' own refusal when the branch moves under it: GitHub refuses the ref update as not a fast forward. */
async function raceRefusal(): Promise<unknown> {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) =>
    init?.method === 'PATCH'
      ? new Response(JSON.stringify({message: 'Update is not a fast forward'}), {status: 422})
      : new Response(JSON.stringify({object: {sha: 'base'}, tree: {sha: 'tree'}, sha: 'sha', html_url: 'url'})),
  );
  return commitFiles({token: 'tok', message: 'test commit', files: []}).catch((e: unknown) => e);
}

describe('failureOf', () => {
  const stale = `${PREVIEW_ENTRY.fullName} changed on master since you loaded it. Load it again.`;
  const unauthorized = 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: Bad credentials';

  it.each([
    ['a stale entry', new StaleCardError(stale), {failure: 'stale', message: stale}],
    ['a rejected token', new Error(unauthorized), {failure: 'rejected-token', message: unauthorized}],
    ['any other error', new Error('previewCards.json has no cards array'), {failure: 'other', message: 'previewCards.json has no cards array'}],
    ['a throw that is no Error', 'boom', {failure: 'other', message: 'Save failed'}],
  ])('reads %s', (_case, error, read) => {
    expect(failureOf(error)).toEqual(read);
  });

  it("words commitFiles' race as a save, on the target branch", async () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    expect(failureOf(await raceRefusal())).toEqual({
      failure: 'other',
      message: 'admin-verify changed while saving, so nothing was saved. Save again.',
    });
  });
});

describe('savedDraft', () => {
  const saved = {seed: 3, loaded: {...PREVIEW_ENTRY, cost: 5}, form: {...FORM, cost: '5'}};

  it('makes what the save committed the baseline of the draft it was made from, keeping what was typed since (R-70)', () => {
    const typed = {...FORM, cost: '5', lore: '3'};
    expect(savedDraft(draft({edit: {...FIELDS, form: typed}}), saved)).toEqual(
      draft({edit: {kind: 'fields', loaded: saved.loaded, before: saved.form, form: typed}}),
    );
  });

  it.each([
    ['seeded since (R-69)', draft({seed: 4})],
    ['image-only', draft({edit: {kind: 'image', reason: 'released'}})],
  ])('leaves a draft that is %s as it is', (_case, other) => {
    expect(savedDraft(other, saved)).toBe(other);
  });
});

describe('imageSent', () => {
  it('takes the sent file off the draft', () => {
    expect(imageSent(draft({image: FILE}), FILE)).toEqual(draft());
  });

  it('keeps a file chosen since', () => {
    const since = draft({image: pngFile('mei-2.png')});
    expect(imageSent(since, FILE)).toBe(since);
  });
});

describe('keepEdits', () => {
  // Mei with her name and cost edited and a scan staged. Someone changed her cost on the branch.
  const edited = draft({edit: {...FIELDS, form: {...FORM, name: 'Mei Lee', cost: '5'}}, image: FILE});
  const freshForm = {...FORM, cost: '6'};
  const fresh = draft({seed: 4, read: 2, edit: {kind: 'fields', loaded: {...PREVIEW_ENTRY, cost: 6}, before: freshForm, form: freshForm}});

  it('keeps the image and each edit whose value the branch left alone, and counts the one it changed (R-68)', () => {
    expect(keepEdits(edited, fresh)).toEqual({
      ...fresh,
      edit: {kind: 'fields', loaded: {...PREVIEW_ENTRY, cost: 6}, before: freshForm, form: {...freshForm, name: 'Mei Lee'}},
      image: FILE,
      dropped: 1,
    });
  });

  it('counts none dropped when every edit still applies', () => {
    const same = draft({seed: 4, read: 2});
    expect(keepEdits(edited, same)).toMatchObject({edit: {form: {...FORM, name: 'Mei Lee', cost: '5'}}, dropped: 0});
  });

  it('drops every edit when the card no longer opens with fields, and keeps the image for an image-only save', () => {
    const imageOnly = draft({seed: 4, read: 2, edit: {kind: 'image', reason: 'released'}});
    expect(keepEdits(edited, imageOnly)).toEqual({...imageOnly, image: FILE, dropped: 2});
  });

  // An image-only card's "Read previewCards.json again" re-seeds through Load it again, and its line says the read landed.
  it('counts none dropped for an image-only draft read again, keeping its image', () => {
    const unheld = draft({edit: {kind: 'image', reason: 'unrepresentable'}, image: FILE});
    expect(keepEdits(unheld, fresh)).toEqual({...fresh, image: FILE, dropped: 0});
  });

  it('takes a first read as it is, with no count', () => {
    const waiting = draft({read: null, follow: true, edit: null});
    expect(keepEdits(waiting, fresh)).toEqual(fresh);
  });
});

describe('reseeded', () => {
  const lookup = {kind: 'ready' as const, card: MEI, entry: PREVIEW_ENTRY, imageOnly: null};
  const file = {status: 'ready' as const, cards: [PREVIEW_ENTRY], ids: new Set([PREVIEW_ENTRY.id]), read: 2};
  const typed = draft({edit: {...FIELDS, form: {...FORM, name: 'Mei Lee'}}, image: FILE});

  it('starts another card afresh, with the next seed', () => {
    const priya = cardOf(DUAL_INK_ENTRY);
    const next = {kind: 'ready' as const, card: priya, entry: DUAL_INK_ENTRY, imageOnly: null};
    expect(reseeded({draft: typed, cardId: priya.id, lookup: next, file})).toMatchObject({
      cardId: priya.id,
      seed: 4,
      image: null,
      edit: {kind: 'fields', loaded: DUAL_INK_ENTRY},
    });
  });

  it("keeps the same card's edits on its newer read (R-68)", () => {
    expect(reseeded({draft: typed, cardId: MEI.id, lookup, file})).toMatchObject({seed: 4, read: 2, image: FILE, dropped: 0, edit: {form: {name: 'Mei Lee'}}});
  });
});
