import {afterEach, beforeEach, describe, expect, it, vi, type Mock} from 'vitest';
import {act, renderHook, waitFor, type RenderHookResult} from '@testing-library/react';
import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import type {useCardDataContext} from '../../../app-bridge';
import {isRejectedToken} from '../../../github/rejectedToken';
import {DeferredReader} from '../../../test/DeferredReader';
import {pngFile} from '../../../test/images';
import {StaleCardError} from '../../reveal/githubClient';
import {loadCollection} from '../finishes/__tests__/collectionHarness';
import {DUAL_INK_ENTRY, JA_SCAN_ENTRY, PREVIEW_ENTRY, RELEASED_CARD, RELEASED_REVEAL_CARD, cardOf} from '../studioFixtures';
import {useCardEditor, type CardEditorController} from '../useCardEditor';

// The shell's card list, loaded. No case here moves it on; R4-4b's cases do, through R3's store.
type CardList = Pick<ReturnType<typeof useCardDataContext>, 'cards' | 'isLoading' | 'error' | 'getCardById' | 'retryLoad'>;
const list = vi.hoisted(() => ({value: null as CardList | null}));
// The rest of the bridge stays real: validateForm.ts and constants.ts read ALL_INKS,
// inkBlock, REVEAL_SET_CODE and REVEAL_ID_BASE from it.
vi.mock('../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useCardDataContext: () => list.value,
}));
// The reads and every commit settle when each case says. StaleCardError stays the real class.
const {commitCardEdit, commitPreviewCardImage, readPreviewCards} = vi.hoisted(() => ({
  commitCardEdit: vi.fn(),
  commitPreviewCardImage: vi.fn(),
  readPreviewCards: vi.fn(),
}));
vi.mock('../../reveal/githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../reveal/githubClient')>()),
  commitCardEdit,
  commitPreviewCardImage,
  readPreviewCards,
}));
const commitCardImage = vi.hoisted(() => vi.fn());
vi.mock('../../image/githubClient', () => ({commitCardImage}));

const COMMIT = {commitUrl: 'https://github.com/Doberjohn/inkweave/commit/c0ffee'};
const ENTRIES = [PREVIEW_ENTRY, DUAL_INK_ENTRY, JA_SCAN_ENTRY];
const CARDS = [...ENTRIES.map(cardOf), RELEASED_CARD, RELEASED_REVEAL_CARD];
const MEI = String(PREVIEW_ENTRY.id);
const PRIYA = String(DUAL_INK_ENTRY.id);
const UNAUTHORIZED = 'GitHub 401 on apps/web/public/data/previewCards.json: {"message":"Bad credentials"}';
const STALE = `${PREVIEW_ENTRY.fullName} changed on master since you loaded it. Load it again.`;
const RACE = 'master changed while publishing, so nothing was published. Publish again.';

function loadedList(cards: LorcanaCard[]): CardList {
  const byId = new Map(cards.map((card) => [card.id, card]));
  return {cards, isLoading: false, error: null, getCardById: (id) => byId.get(id), retryLoad: vi.fn()};
}

beforeEach(async () => {
  // A block, not an arrow's value: mockReset() returns the mock, which Vitest would call as a teardown.
  for (const mock of [commitCardEdit, commitCardImage, commitPreviewCardImage, readPreviewCards]) mock.mockReset();
  readPreviewCards.mockResolvedValue(ENTRIES);
  commitCardEdit.mockResolvedValue(COMMIT);
  commitCardImage.mockResolvedValue(COMMIT);
  commitPreviewCardImage.mockResolvedValue(COMMIT);
  list.value = loadedList(CARDS);
  // Sets 1 to 8 are in (and hold no card) before the editor mounts.
  await loadCollection();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

type Editor = RenderHookResult<CardEditorController, {cardId: string}>;

/** The editor on `cardId`, once its lookup is ready. */
async function openEditor(cardId: string): Promise<Editor> {
  const editor = renderHook(({cardId: id}) => useCardEditor({token: 'tok', cardId: id}), {initialProps: {cardId}});
  await waitFor(() => expect(editor.result.current.lookup.kind).toBe('ready'));
  return editor;
}

/** Stages `name` as the card's image and waits for its bytes. */
async function stage({result}: Editor, name: string): Promise<void> {
  await act(async () => {
    await result.current.onImageChange(pngFile(name));
  });
}

/** Saves, and waits for the commit to land or fail. */
async function save({result}: Editor): Promise<void> {
  await act(async () => {
    await result.current.save();
  });
}

/** The next call of `mock` settles only when the test says. */
function deferred<T>(mock: Mock) {
  let finish: (value: T) => void = () => {};
  let fail: (error: Error) => void = () => {};
  mock.mockReturnValueOnce(
    new Promise<T>((resolve, reject) => {
      finish = resolve;
      fail = reject;
    }),
  );
  return {finish: (value: T) => act(async () => finish(value)), fail: (error: Error) => act(async () => fail(error))};
}

type Deferred = ReturnType<typeof deferred>;

/** Whether `promise` has settled, once the microtasks queued so far have run. */
async function settled(promise: Promise<boolean>): Promise<boolean> {
  let done = false;
  void promise.then(() => (done = true));
  await act(async () => {});
  return done;
}

/** The keys the change list names, the image last. */
const changed = ({result}: Editor) => result.current.changes.map((row) => row.id);

describe('useCardEditor: the two save paths', () => {
  it('commits field edits through commitCardEdit and keeps the card open on what it saved (R-70)', async () => {
    const editor = await openEditor(MEI);
    act(() => editor.result.current.patchForm({cost: '5'}));
    await save(editor);

    expect(commitCardEdit).toHaveBeenCalledWith({token: 'tok', loaded: PREVIEW_ENTRY, changes: {cost: 5}, image: null});
    expect(commitCardImage).not.toHaveBeenCalled();
    expect(editor.result.current).toMatchObject({
      lookup: {kind: 'ready', card: {id: MEI}},
      form: {cost: '5'},
      result: {...COMMIT, withImage: false},
      changes: [],
      dirty: false,
    });
    // The commit put the entry in the file and asked for a fresh read (R4-4a's commit).
    await waitFor(() => expect(readPreviewCards).toHaveBeenCalledTimes(2));
  });

  it('diffs the next save from what the last one committed', async () => {
    const editor = await openEditor(MEI);
    act(() => editor.result.current.patchForm({cost: '5'}));
    await save(editor);
    act(() => editor.result.current.patchForm({lore: '3'}));
    await save(editor);

    expect(commitCardEdit).toHaveBeenLastCalledWith({token: 'tok', loaded: {...PREVIEW_ENTRY, cost: 5}, changes: {lore: 3}, image: null});
  });

  it('keeps an edit typed while the save ran as a change', async () => {
    const editor = await openEditor(MEI);
    const commit = deferred(commitCardEdit);
    act(() => editor.result.current.patchForm({cost: '5'}));
    act(() => void editor.result.current.save());
    act(() => editor.result.current.patchForm({lore: '3'}));
    await commit.finish(COMMIT);

    expect(changed(editor)).toEqual(['lore']);
    expect(editor.result.current.dirty).toBe(true);
  });

  it('sends field edits and a staged image in one commitCardEdit, then clears the image', async () => {
    const editor = await openEditor(MEI);
    act(() => editor.result.current.patchForm({name: 'Mei Lee'}));
    await stage(editor, 'mei.png');
    const dataUrl = editor.result.current.imageDataUrl;
    await save(editor);

    expect(commitCardEdit).toHaveBeenCalledWith(expect.objectContaining({image: {dataUrl, ext: 'png'}}));
    expect(commitCardImage).not.toHaveBeenCalled();
    expect(editor.result.current).toMatchObject({result: {withImage: true}, imageName: null, changes: []});
  });

  // The image tool's "clears the published card and image once the commit lands", for
  // the studio: the card is URL state, so it stays open (R-70). A card under a preview id
  // goes through commitPreviewCardImage, which checks previewCards.json still holds it at
  // the base commit (R4-8a); a released card reads no file (R-71).
  it.each([
    {name: 'a preview card with no field edits', cardId: MEI, fullName: 'Mei - Red Panda', via: commitPreviewCardImage, not: commitCardImage},
    {name: 'a released card (R-61)', cardId: RELEASED_CARD.id, fullName: RELEASED_CARD.fullName, via: commitCardImage, not: commitPreviewCardImage},
  ])('saves an image alone on $name, and keeps the card open', async ({cardId, fullName, via, not}) => {
    const editor = await openEditor(cardId);
    await stage(editor, 'scan.png');
    const imageBase64 = editor.result.current.imageDataUrl;
    await save(editor);

    expect(via).toHaveBeenCalledWith({token: 'tok', card: {id: cardId, fullName}, imageBase64, imageExt: 'png'});
    expect(not).not.toHaveBeenCalled();
    expect(commitCardEdit).not.toHaveBeenCalled();
    expect(editor.result.current).toMatchObject({lookup: {kind: 'ready', card: {id: cardId}}, result: {withImage: true}, imageName: null});
  });

  it('refuses an image alone on a preview card the base file no longer holds, as stale, and keeps the image (R4-8a)', async () => {
    const gone = `${PREVIEW_ENTRY.fullName} is no longer in previewCards.json on master. Load it again.`;
    commitPreviewCardImage.mockRejectedValueOnce(new StaleCardError(gone));
    const editor = await openEditor(MEI);
    await stage(editor, 'scan.png');
    await save(editor);

    expect(editor.result.current).toMatchObject({result: null, saveError: gone, failure: 'stale', imageName: 'scan.png'});
  });

  it('opens a released card of the reveal set, and saves its image, while previewCards.json fails (R-71)', async () => {
    readPreviewCards.mockReset();
    readPreviewCards.mockRejectedValue(new Error('GitHub 500 on apps/web/public/data/previewCards.json: Server error'));
    const editor = await openEditor(RELEASED_REVEAL_CARD.id);
    await waitFor(() => expect(editor.result.current.previewFile.status).toBe('error'));
    expect(editor.result.current).toMatchObject({lookup: {kind: 'ready'}, imageOnly: 'released', tag: 'Released'});

    await stage(editor, 'miguel.png');
    const imageBase64 = editor.result.current.imageDataUrl;
    await save(editor);
    const card = {id: RELEASED_REVEAL_CARD.id, fullName: 'Miguel Rivera - Street Musician'};
    expect(commitCardImage).toHaveBeenCalledWith({token: 'tok', card, imageBase64, imageExt: 'png'});
    expect(commitPreviewCardImage).not.toHaveBeenCalled();
    expect(editor.result.current).toMatchObject({lookup: {kind: 'ready', card: {id: card.id}}, result: {withImage: true}});
  });

  it('refreshes a card to its English scan, renamed, in one edit (admin#14 item 3)', async () => {
    const editor = await openEditor(String(JA_SCAN_ENTRY.id));
    act(() => editor.result.current.patchForm({scanLanguage: 'en', name: 'Mira', version: 'Lead Singer'}));
    await stage(editor, 'miriam-en.png');
    await save(editor);

    expect(commitCardEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        loaded: JA_SCAN_ENTRY,
        changes: {name: 'Mira', fullName: 'Mira - Lead Singer', version: 'Lead Singer', scanLanguage: null},
        image: expect.objectContaining({ext: 'png'}),
      }),
    );
  });
});

describe('useCardEditor: when Save is on', () => {
  it('holds Save back until a change validates, and while a save runs', async () => {
    const editor = await openEditor(MEI);
    expect(editor.result.current.canSave).toBe(false);
    act(() => editor.result.current.patchForm({cost: ''}));
    expect(editor.result.current.canSave).toBe(false);
    act(() => editor.result.current.patchForm({cost: '5'}));
    expect(editor.result.current.canSave).toBe(true);

    const commit = deferred(commitCardEdit);
    act(() => void editor.result.current.save());
    expect(editor.result.current).toMatchObject({saving: true, savingThisDraft: true, canSave: false});
    await commit.finish(COMMIT);
    expect(editor.result.current).toMatchObject({saving: false, savingThisDraft: false});
  });

  // R4-8c: `saving` spans cards, so no save starts while one runs; the guard's in-flight line is the draft's own.
  it("holds Save back on the next card while the last card's save runs, which isn't that draft's", async () => {
    const editor = await openEditor(MEI);
    const commit = deferred(commitCardEdit);
    act(() => editor.result.current.patchForm({cost: '5'}));
    act(() => void editor.result.current.save());
    editor.rerender({cardId: PRIYA});
    act(() => editor.result.current.patchForm({name: 'Priya Lee'}));

    expect(editor.result.current).toMatchObject({saving: true, savingThisDraft: false, canSave: false, dirty: true});
    await commit.finish(COMMIT);
    expect(editor.result.current).toMatchObject({saving: false, canSave: true});
  });

  it("holds a field edit back until its staged image's bytes are read", async () => {
    DeferredReader.reset();
    vi.stubGlobal('FileReader', DeferredReader);
    const editor = await openEditor(MEI);
    act(() => editor.result.current.patchForm({cost: '5'}));
    act(() => void editor.result.current.onImageChange(pngFile('mei.png')));
    expect(editor.result.current.canSave).toBe(false);
    await DeferredReader.finish(0);
    expect(editor.result.current.canSave).toBe(true);
  });
});

describe('useCardEditor: an outcome belongs to its draft (R-69)', () => {
  // The image tool's "leaves a card picked while the publish was running", with R-69:
  // the late outcome no longer shows on the next card.
  it.each([
    {outcome: 'lands', settle: (commit: Deferred) => commit.finish(COMMIT)},
    {outcome: 'is refused', settle: (commit: Deferred) => commit.fail(new StaleCardError(STALE))},
  ])("shows nothing on the next card when the last card's save $outcome, and keeps the next card's draft", async ({settle}) => {
    const editor = await openEditor(MEI);
    const commit = deferred(commitCardEdit);
    act(() => editor.result.current.patchForm({cost: '5'}));
    await stage(editor, 'mei.png');
    act(() => void editor.result.current.save());
    editor.rerender({cardId: PRIYA});
    // Mei's scan is never Priya's.
    expect(editor.result.current.imageName).toBeNull();
    act(() => editor.result.current.patchForm({name: 'Priya Lee'}));
    await stage(editor, 'priya.png');
    await settle(commit);

    expect(editor.result.current).toMatchObject({
      lookup: {card: {id: PRIYA}},
      result: null,
      saveError: null,
      failure: null,
      form: {name: 'Priya Lee'},
      imageName: 'priya.png',
      canSave: true,
    });
  });

  it('reopens a card whose save landed after it was left from what it committed, before the re-read lands, with no outcome', async () => {
    readPreviewCards.mockReset();
    readPreviewCards.mockResolvedValueOnce(ENTRIES).mockReturnValue(new Promise(() => {}));
    const editor = await openEditor(MEI);
    const commit = deferred(commitCardEdit);
    act(() => editor.result.current.patchForm({cost: '5'}));
    act(() => void editor.result.current.save());
    editor.rerender({cardId: PRIYA});
    await commit.finish(COMMIT);
    editor.rerender({cardId: MEI});

    expect(editor.result.current).toMatchObject({form: {cost: '5'}, changes: [], result: null});
    act(() => editor.result.current.patchForm({lore: '3'}));
    await save(editor);
    expect(commitCardEdit).toHaveBeenLastCalledWith(expect.objectContaining({loaded: {...PREVIEW_ENTRY, cost: 5}, changes: {lore: 3}}));
  });
});

describe('useCardEditor: failures and reading again', () => {
  it.each([
    {failure: 'stale', error: new StaleCardError(STALE), saveError: STALE},
    {failure: 'rejected-token', error: new Error(UNAUTHORIZED), saveError: UNAUTHORIZED},
    {failure: 'other', error: new Error(RACE), saveError: 'master changed while saving, so nothing was saved. Save again.'},
  ])('reads the failure as $failure, and keeps the edits to save again', async ({failure, error, saveError}) => {
    commitCardEdit.mockRejectedValueOnce(error);
    const editor = await openEditor(MEI);
    act(() => editor.result.current.patchForm({cost: '5'}));
    await save(editor);

    expect(editor.result.current).toMatchObject({failure, saveError, result: null, form: {cost: '5'}, dirty: true, canSave: true});
  });

  it('clears the last failure as the next save starts', async () => {
    commitCardEdit.mockRejectedValueOnce(new Error(RACE));
    const editor = await openEditor(MEI);
    act(() => editor.result.current.patchForm({cost: '5'}));
    await save(editor);
    const commit = deferred(commitCardEdit);
    act(() => void editor.result.current.save());

    expect(editor.result.current).toMatchObject({saving: true, failure: null, saveError: null});
    await commit.finish(COMMIT);
    expect(editor.result.current.result).toEqual({...COMMIT, withImage: false});
  });

  it('waits on a 401 read with its message, and retry resolves once the re-read lands', async () => {
    readPreviewCards.mockReset();
    readPreviewCards.mockRejectedValueOnce(new Error(UNAUTHORIZED));
    const editor = renderHook(() => useCardEditor({token: 'tok', cardId: MEI}));
    await waitFor(() => expect(editor.result.current.lookup).toEqual({kind: 'fileFailed', error: UNAUTHORIZED}));
    // R4-6b offers Forget token on it (R-26).
    expect(isRejectedToken(UNAUTHORIZED)).toBe(true);
    expect(editor.result.current.canSave).toBe(false);

    const read = deferred<LorcanaJSONCard[]>(readPreviewCards);
    let retried: Promise<boolean> = Promise.resolve(false);
    act(() => {
      retried = editor.result.current.retry();
    });
    expect(await settled(retried)).toBe(false);
    await read.finish(ENTRIES);
    await expect(retried).resolves.toBe(true);
    expect(editor.result.current.lookup).toMatchObject({kind: 'ready', card: {id: MEI}});
  });

  /** Mei with her name and cost edited and a scan staged, and a save refused as stale. */
  async function refused(): Promise<Editor> {
    commitCardEdit.mockRejectedValueOnce(new StaleCardError(STALE));
    const editor = await openEditor(MEI);
    act(() => editor.result.current.patchForm({name: 'Mei Lee', cost: '5'}));
    await stage(editor, 'mei.png');
    await save(editor);
    return editor;
  }

  /** Load it again, with its read settling only when the test says. */
  function loadAgain(editor: Editor) {
    const read = deferred<LorcanaJSONCard[]>(readPreviewCards);
    let loaded: Promise<boolean> = Promise.resolve(false);
    act(() => {
      loaded = editor.result.current.loadAgain();
    });
    return {read, loaded};
  }

  it('Load it again keeps the edits that still apply and the image, counts the dropped, and clears the refusal once its read lands (R-68)', async () => {
    const editor = await refused();
    const {read, loaded} = loadAgain(editor);
    // Nothing moves until the read lands.
    expect(await settled(loaded)).toBe(false);
    expect(editor.result.current).toMatchObject({failure: 'stale', form: {cost: '5'}, dropped: null, kept: null});

    // Someone changed Mei's cost on the branch; her name is as it was.
    const fresh = {...PREVIEW_ENTRY, cost: 6};
    await read.finish([fresh, DUAL_INK_ENTRY, JA_SCAN_ENTRY]);
    await expect(loaded).resolves.toBe(true);
    expect(editor.result.current).toMatchObject({
      failure: null,
      saveError: null,
      dropped: 1,
      kept: {edits: true, staged: true},
      form: {name: 'Mei Lee', cost: '6'},
      imageName: 'mei.png',
    });
    expect(changed(editor)).toEqual(expect.arrayContaining(['name', 'image']));
    expect(changed(editor)).not.toContain('cost');

    await save(editor);
    expect(commitCardEdit).toHaveBeenLastCalledWith(
      expect.objectContaining({loaded: fresh, changes: {name: 'Mei Lee', fullName: 'Mei Lee - Red Panda'}}),
    );
    expect(editor.result.current).toMatchObject({dropped: null, kept: null});
  });

  it("Load it again after a landed save waits for its own read, not the save's", async () => {
    const committed = {...PREVIEW_ENTRY, cost: 5};
    readPreviewCards.mockReset();
    readPreviewCards.mockResolvedValueOnce(ENTRIES).mockResolvedValueOnce([committed, DUAL_INK_ENTRY, JA_SCAN_ENTRY]);
    const editor = await openEditor(MEI);
    act(() => editor.result.current.patchForm({cost: '5'}));
    await save(editor);
    // The save's own read of the file lands.
    await waitFor(() => expect(readPreviewCards).toHaveBeenCalledTimes(2));
    await act(async () => {});
    commitCardEdit.mockRejectedValueOnce(new StaleCardError(STALE));
    act(() => editor.result.current.patchForm({lore: '3'}));
    await save(editor);

    const {read, loaded} = loadAgain(editor);
    expect(await settled(loaded)).toBe(false);
    expect(editor.result.current.failure).toBe('stale');
    // Someone renamed Mei on the branch; her lore is as it was.
    await read.finish([{...committed, name: 'Mei Lee', fullName: 'Mei Lee - Red Panda'}, DUAL_INK_ENTRY, JA_SCAN_ENTRY]);
    await expect(loaded).resolves.toBe(true);
    expect(editor.result.current).toMatchObject({failure: null, dropped: 0, form: {name: 'Mei Lee', cost: '5', lore: '3'}});
  });

  it('Load it again resolves false, and keeps the refusal and the edits, when its read fails', async () => {
    const editor = await refused();
    const {read, loaded} = loadAgain(editor);
    await read.fail(new Error('GitHub 502 on apps/web/public/data/previewCards.json: Bad gateway'));

    await expect(loaded).resolves.toBe(false);
    expect(editor.result.current).toMatchObject({failure: 'stale', saveError: STALE, form: {name: 'Mei Lee', cost: '5'}, dropped: null});
  });
});
