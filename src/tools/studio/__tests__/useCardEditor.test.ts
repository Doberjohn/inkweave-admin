import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from '@testing-library/react';
import {synergyEngine, type LorcanaJSONCard} from 'inkweave-synergy-engine';
import type {useCardDataContext} from '../../../app-bridge';
import {DeferredReader} from '../../../test/DeferredReader';
import {imageDataUrl, pngFile} from '../../../test/images';
import {resetCollectionOnlyCards} from '../finishes/collectionCards';
import {chunksOf, heldChunks, loadCollection, stubChunks} from '../finishes/__tests__/collectionHarness';
import {SET_4_ENTRIES, YEN_SID} from '../finishes/__tests__/finishFixtures';
import {useCardEditor} from '../useCardEditor';
import {
  BRANCH_ENTRIES,
  DUAL_INK_ENTRY,
  OTHER_SET_ENTRY,
  PREVIEW_ENTRY,
  RELEASED_CARD,
  RELEASED_SONG,
  STUDIO_CARDS,
  UNNUMBERED_ENTRY,
  listCard,
} from '../studioFixtures';

/** What the editor reads from the shell's card list. */
type CardList = Pick<ReturnType<typeof useCardDataContext>, 'cards' | 'isLoading' | 'error' | 'getCardById' | 'retryLoad'>;

// The card list as a store a test moves on (loading, loaded, failed), so the
// hook re-renders as it would under the shell's CardDataProvider
// (CardAnalyticsPage.test.tsx's store). The rest of the bridge stays real:
// validateForm.ts and constants.ts read ALL_INKS, inkBlock, REVEAL_SET_CODE
// and REVEAL_ID_BASE from it.
const cardList = vi.hoisted(() => ({
  value: null as CardList | null,
  listeners: new Set<() => void>(),
  retryLoad: vi.fn(),
}));
vi.mock('../../../app-bridge', async (importOriginal) => {
  const {useSyncExternalStore} = await import('react');
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    useCardDataContext: function useCardDataContext() {
      return useSyncExternalStore(
        (onChange) => {
          cardList.listeners.add(onChange);
          return () => cardList.listeners.delete(onChange);
        },
        () => cardList.value,
      );
    },
  };
});
// previewCards.json on the branch, read through R4-4a's usePreviewCardsFile, which stays real.
const readPreviewCards = vi.hoisted(() => vi.fn());
vi.mock('../../reveal/githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../reveal/githubClient')>()),
  readPreviewCards,
}));

/** Sets the card list the hook reads. By default it has loaded, with every studio card. */
function setCardList({cards = STUDIO_CARDS, isLoading = false, error = null}: Partial<CardList> = {}) {
  const getCardById = (id: string) => cards.find((card) => card.id === id);
  cardList.value = {cards, isLoading, error, getCardById, retryLoad: cardList.retryLoad};
  act(() => cardList.listeners.forEach((onChange) => onChange()));
}

/** The next read of previewCards.json, settled when the test says. */
function deferRead() {
  let land: (cards: LorcanaJSONCard[]) => void = () => {};
  let fail: (error: Error) => void = () => {};
  readPreviewCards.mockReturnValueOnce(new Promise<LorcanaJSONCard[]>((resolve, reject) => ((land = resolve), (fail = reject))));
  return {
    land: (cards: LorcanaJSONCard[] = BRANCH_ENTRIES) => act(async () => land(cards)),
    fail: (message: string) => act(async () => fail(new Error(message))),
  };
}

const idOf = (entry: LorcanaJSONCard) => String(entry.id);
/** R4-2a's two editable preview cards: Mei (a Singer 5) and Priya. */
const MEI = PREVIEW_ENTRY;
const PRIYA = DUAL_INK_ENTRY;

/** The editor with `cardId` open, once the first read of previewCards.json has had its chance to land. */
async function renderEditor(initialProps: {cardId: string | null}) {
  const view = renderHook((props: {cardId: string | null}) => useCardEditor({token: 'tok', cardId: props.cardId}), {
    initialProps,
  });
  await act(async () => {});
  return {...view, open: (next: string | null) => view.rerender({cardId: next})};
}

type Editor = Awaited<ReturnType<typeof renderEditor>>['result'];

/** Choose a file, and finish reading its bytes. Reads finish only when a test says so (DeferredReader). */
async function stage(result: Editor, file: File) {
  act(() => void result.current.onImageChange(file));
  await DeferredReader.finish(DeferredReader.reads.length - 1);
}

const imageOf = (result: Editor) => ({name: result.current.imageName, dataUrl: result.current.imageDataUrl});
const NO_IMAGE = {name: null, dataUrl: null};

beforeEach(async () => {
  // A block, not an arrow's value: mockReset() returns the mock, and Vitest calls a function a hook returns as its teardown.
  readPreviewCards.mockReset();
  readPreviewCards.mockResolvedValue(BRANCH_ENTRIES);
  cardList.retryLoad.mockReset();
  setCardList();
  DeferredReader.reset();
  vi.stubGlobal('FileReader', DeferredReader);
  // Sets 1 to 8 are in (and hold no card) before the editor mounts, so a card of the list opens on the first render.
  await loadCollection();
});

afterEach(() => vi.unstubAllGlobals());

describe('useCardEditor: the open card', () => {
  it('waits for previewCards.json before opening a card of the reveal set', async () => {
    const read = deferRead();
    const {result} = await renderEditor({cardId: idOf(MEI)});
    expect({lookup: result.current.lookup, form: result.current.form}).toEqual({lookup: {kind: 'loading'}, form: null});

    await read.land();
    expect(result.current.lookup).toMatchObject({kind: 'ready', imageOnly: null});
    expect(result.current.form?.name).toBe('Mei');
  });

  it.each([
    ['still loading', () => readPreviewCards.mockReturnValue(new Promise(() => {}))],
    ['unreadable', () => readPreviewCards.mockRejectedValue(new Error('GitHub 500 on previewCards.json'))],
  ])('opens a released card at once, image-only, while previewCards.json is %s (R-71)', async (_, branch) => {
    branch();
    const {result} = await renderEditor({cardId: RELEASED_CARD.id});
    expect(result.current.lookup).toEqual({kind: 'ready', card: RELEASED_CARD, entry: null, imageOnly: 'released'});
    expect({form: result.current.form, imageOnly: result.current.imageOnly, tag: result.current.tag}).toEqual({
      form: null,
      imageOnly: 'released',
      tag: 'Released',
    });
  });

  it('builds no form for a preview entry that opens image-only, and says why (R-65)', async () => {
    const {result} = await renderEditor({cardId: idOf(UNNUMBERED_ENTRY)});
    expect({form: result.current.form, imageOnly: result.current.imageOnly, tag: result.current.tag}).toEqual({
      form: null,
      imageOnly: 'unnumbered',
      tag: 'Preview',
    });
  });

  it('says a card of another set is a pin lag once previewCards.json lands, and keeps its staged image (R-65)', async () => {
    const read = deferRead();
    const {result} = await renderEditor({cardId: idOf(OTHER_SET_ENTRY)});
    const shown = () => ({imageOnly: result.current.imageOnly, tag: result.current.tag, imageName: result.current.imageName});
    // R-71: it opens at once, as released, while the file loads.
    await stage(result, pngFile('a.png'));
    expect(shown()).toEqual({imageOnly: 'released', tag: 'Released', imageName: 'a.png'});

    await read.land();
    expect(shown()).toEqual({imageOnly: 'other-set', tag: 'Preview', imageName: 'a.png'});
    expect(result.current.lookup).toMatchObject({kind: 'ready', imageOnly: 'other-set'});
  });

  it('shows an unreadable previewCards.json, and Retry reads it again', async () => {
    const first = deferRead();
    const {result} = await renderEditor({cardId: idOf(MEI)});
    await first.fail('GitHub 500 on previewCards.json');
    expect(result.current.lookup).toEqual({kind: 'fileFailed', error: 'GitHub 500 on previewCards.json'});

    act(() => {
      void result.current.retry();
    });
    await waitFor(() => expect(result.current.form?.name).toBe('Mei'));
    expect({reads: readPreviewCards.mock.calls.length, listRetries: cardList.retryLoad.mock.calls.length}).toEqual({
      reads: 2,
      listRetries: 0,
    });
  });

  it('Retry loads a failed card list again, and leaves the file alone', async () => {
    setCardList({cards: [], error: new Error('offline')});
    const {result} = await renderEditor({cardId: null});
    expect(result.current.lookup).toMatchObject({kind: 'listFailed'});

    let retried: Promise<boolean> = Promise.resolve(true);
    act(() => {
      retried = result.current.retry();
    });
    // The card list's retry can't be awaited, and the file hadn't failed (R-59: the page watches the list's error).
    await expect(retried).resolves.toBe(false);
    expect({reads: readPreviewCards.mock.calls.length, listRetries: cardList.retryLoad.mock.calls.length}).toEqual({
      reads: 1,
      listRetries: 1,
    });
  });

  it('Retry reads previewCards.json again after a later read failed, and resolves once it lands', async () => {
    const {result} = await renderEditor({cardId: idOf(MEI)});
    const second = deferRead();
    act(() => result.current.previewFile.reload());
    await second.fail('GitHub 502 on previewCards.json');
    // The search shows the failed read beside the cards it keeps (R4-4a's reloadError), and the card stays open.
    expect(result.current.previewFile).toMatchObject({status: 'ready', error: 'GitHub 502 on previewCards.json'});
    expect(result.current.form?.name).toBe('Mei');

    const third = deferRead();
    let retried: Promise<boolean> = Promise.resolve(false);
    act(() => {
      retried = result.current.retry();
    });
    await third.land();
    await expect(retried).resolves.toBe(true);
    expect({
      error: result.current.previewFile.error,
      reads: readPreviewCards.mock.calls.length,
      listRetries: cardList.retryLoad.mock.calls.length,
    }).toEqual({error: null, reads: 3, listRetries: 0});
  });

  it('Retry resolves false when previewCards.json fails again, so the page asks for no focus (R4-6b, R-59)', async () => {
    const first = deferRead();
    const {result} = await renderEditor({cardId: idOf(MEI)});
    await first.fail('GitHub 500 on previewCards.json');

    const second = deferRead();
    let retried: Promise<boolean> = Promise.resolve(true);
    act(() => {
      retried = result.current.retry();
    });
    await second.fail('GitHub 502 on previewCards.json');
    await expect(retried).resolves.toBe(false);
    expect(result.current.lookup).toMatchObject({kind: 'fileFailed'});
  });

  it('waits for the card list, then opens the card, or says the id is missing', async () => {
    setCardList({cards: [], isLoading: true});
    const {result, open} = await renderEditor({cardId: null});
    // previewCards.json has landed; the card still waits for the list.
    open(idOf(MEI));
    expect(result.current.lookup).toEqual({kind: 'loading'});

    setCardList();
    expect({lookup: result.current.lookup, name: result.current.form?.name}).toMatchObject({
      lookup: {kind: 'ready', card: listCard(MEI)},
      name: 'Mei',
    });
    open('14999');
    expect(result.current.lookup).toEqual({kind: 'missing', cardId: '14999'});
  });

  it('gives the search previewCards.json’s own state, with no card open', async () => {
    const read = deferRead();
    const {result} = await renderEditor({cardId: null});
    expect(result.current.previewFile).toMatchObject({status: 'loading', previewIds: null});

    await read.land();
    expect(result.current.previewFile.previewIds).toEqual(new Set(BRANCH_ENTRIES.map((entry) => entry.id)));
  });
});

describe('useCardEditor: the draft', () => {
  it('edits the form, lists the change, and discards it', async () => {
    const {result} = await renderEditor({cardId: idOf(MEI)});
    act(() => result.current.patchForm({name: 'Meilin'}));
    expect({
      changes: result.current.changes,
      dirty: result.current.dirty,
      preview: result.current.previewCard?.fullName,
    }).toEqual({
      changes: [{id: 'name', label: 'Name', from: 'Mei', to: 'Meilin'}],
      dirty: true,
      preview: 'Meilin - Red Panda',
    });

    act(() => result.current.discard());
    expect({name: result.current.form?.name, changes: result.current.changes, dirty: result.current.dirty}).toEqual({
      name: 'Mei',
      changes: [],
      dirty: false,
    });
  });

  it('opens the next card with its own form, and drops the last card’s edits', async () => {
    const {result, open} = await renderEditor({cardId: idOf(MEI)});
    act(() => result.current.patchForm({name: 'Meilin'}));

    open(idOf(PRIYA));
    expect({name: result.current.form?.name, dirty: result.current.dirty}).toEqual({name: 'Priya', dirty: false});
    open(idOf(MEI));
    expect(result.current.form?.name).toBe('Mei');
  });

  it('keeps the edits when previewCards.json is read again', async () => {
    const {result} = await renderEditor({cardId: idOf(MEI)});
    act(() => result.current.patchForm({name: 'Meilin'}));

    readPreviewCards.mockResolvedValue([{...MEI, rarity: 'Legendary'}, PRIYA]);
    await act(async () => result.current.previewFile.reload());
    expect(readPreviewCards).toHaveBeenCalledTimes(2);
    expect(result.current.changes.map((row) => row.id)).toEqual(['name']);
  });
});

describe('useCardEditor: the staged image (useImageAdmin.test.ts’s cases)', () => {
  it('clears the staged image when a different card is opened', async () => {
    const {result, open} = await renderEditor({cardId: RELEASED_CARD.id});
    await stage(result, pngFile('a.png'));
    expect({...imageOf(result), dirty: result.current.dirty}).toEqual({name: 'a.png', dataUrl: imageDataUrl('a.png'), dirty: true});

    // Card A's upload must never be saved against card B's id.
    open(RELEASED_SONG.id);
    expect({...imageOf(result), dirty: result.current.dirty}).toEqual({...NO_IMAGE, dirty: false});
  });

  it("never offers one file's bytes under another file's name", async () => {
    const {result} = await renderEditor({cardId: RELEASED_CARD.id});
    act(() => void result.current.onImageChange(pngFile('a.png')));
    await DeferredReader.finish(0);
    expect(imageOf(result)).toEqual({name: 'a.png', dataUrl: imageDataUrl('a.png')});

    act(() => void result.current.onImageChange(pngFile('b.webp')));
    expect(imageOf(result)).toEqual({name: 'b.webp', dataUrl: null});
    await DeferredReader.finish(1);
    expect(imageOf(result)).toEqual({name: 'b.webp', dataUrl: imageDataUrl('b.webp')});
  });

  it('drops a read that finishes after switching cards', async () => {
    const {result, open} = await renderEditor({cardId: RELEASED_CARD.id});
    act(() => void result.current.onImageChange(pngFile('a.png')));
    open(RELEASED_SONG.id);

    await DeferredReader.finish(0);
    expect(imageOf(result)).toEqual(NO_IMAGE);
  });

  it('doesn’t bring a card’s image back when the card is opened again', async () => {
    const {result, open} = await renderEditor({cardId: RELEASED_CARD.id});
    await stage(result, pngFile('a.png'));
    open(RELEASED_SONG.id);
    open(RELEASED_CARD.id);
    expect(imageOf(result)).toEqual(NO_IMAGE);
  });

  it('lists a staged image on a preview card, and Revert image drops it', async () => {
    const {result} = await renderEditor({cardId: idOf(MEI)});
    await stage(result, pngFile('mei.png'));
    expect({changes: result.current.changes, preview: result.current.previewCard?.imageUrl}).toEqual({
      changes: [{id: 'image', label: 'Image', from: 'current art', to: 'mei.png'}],
      preview: imageDataUrl('mei.png'),
    });

    act(() => result.current.revertImage());
    expect({...imageOf(result), changes: result.current.changes, preview: result.current.previewCard?.imageUrl}).toEqual({
      ...NO_IMAGE,
      changes: [],
      preview: listCard(MEI).imageUrl,
    });
  });

  it('says why a staged file can’t be used', async () => {
    const {result} = await renderEditor({cardId: RELEASED_CARD.id});
    act(() => void result.current.onImageChange(pngFile('scan.png')));
    await act(async () => DeferredReader.reads[0].fail());
    expect({...imageOf(result), error: result.current.imageError}).toEqual({
      name: 'scan.png',
      dataUrl: null,
      error: 'Could not read the image: read failed',
    });
  });

  it('holds a preview card’s staged file to the validator’s image rule while its bytes are read', async () => {
    const {result} = await renderEditor({cardId: idOf(MEI)});
    act(() => void result.current.onImageChange(pngFile('scan.gif')));
    const shown = () => ({error: result.current.imageError, validator: result.current.validation.errors.image});
    expect(shown()).toEqual({error: 'Image must be jpg, jpeg, png, or webp', validator: 'Image must be jpg, jpeg, png, or webp'});

    // Once read, the upload's own check comes first (imageErrorOf).
    await DeferredReader.finish(0);
    expect(shown()).toEqual({error: 'scan.gif is not a JPEG, PNG or WebP image.', validator: 'Image must be jpg, jpeg, png, or webp'});
  });
});

describe('useCardEditor: synergies', () => {
  const groupIds = (result: Editor) => result.current.findSynergies().flatMap((group) => group.synergies.map((s) => s.card.id));

  it('finds the edit’s synergies live, and none for an image-only card', async () => {
    const {result, open} = await renderEditor({cardId: idOf(MEI)});
    // Mei's Singer 5 sings the released song; without the keyword, she can't.
    expect(groupIds(result)).toContain(RELEASED_SONG.id);

    act(() => result.current.patchForm({keywords: ''}));
    expect(groupIds(result)).not.toContain(RELEASED_SONG.id);
    open(RELEASED_CARD.id);
    expect(result.current.findSynergies()).toEqual([]);
  });
});

/*
 * Sets 1 to 8 (#68): the app's card list leaves them out, so the controller adds
 * their cards from the collection chunks (collectionCards.ts). They come last in
 * the search, their cards open printings-only, and nothing but the search and the
 * lookup sees them: the synergy engine scores against the card list alone.
 */
describe('useCardEditor: Sets 1 to 8', () => {
  const ids = (cards: readonly {id: string}[]) => cards.map((card) => card.id);

  beforeEach(async () => {
    await loadCollection({'4': SET_4_ENTRIES});
  });

  afterEach(() => vi.restoreAllMocks());

  it('adds their cards to the search, after the card list’s', async () => {
    const {result} = await renderEditor({cardId: null});
    expect(ids(result.current.searchCards)).toEqual([...ids(STUDIO_CARDS), YEN_SID.id]);
    expect(result.current.collection.status).toBe('ready');
  });

  it('opens one of their cards printings-only: released, with no form to edit', async () => {
    const {result} = await renderEditor({cardId: YEN_SID.id});
    expect(result.current.lookup).toMatchObject({kind: 'ready', card: {id: YEN_SID.id}, entry: null, imageOnly: 'released'});
    expect({printingsOnly: result.current.printingsOnly, tag: result.current.tag, form: result.current.form}).toEqual({
      printingsOnly: true,
      tag: 'Released',
      form: null,
    });
    expect({deployed: result.current.deployed, canSave: result.current.canSave}).toEqual({deployed: true, canSave: false});
  });

  it('is printings-only for no other card: not a released card of Sets 9 and up, a preview card, or none open', async () => {
    const {result, open} = await renderEditor({cardId: null});
    const printingsOnly = () => result.current.printingsOnly;
    expect(printingsOnly()).toBe(false);
    open(RELEASED_CARD.id);
    expect(printingsOnly()).toBe(false);
    open(idOf(MEI));
    expect(printingsOnly()).toBe(false);
    open(YEN_SID.id);
    expect(printingsOnly()).toBe(true);
  });

  it('waits for them before it reads an id as missing', async () => {
    resetCollectionOnlyCards();
    const held = heldChunks({'4': SET_4_ENTRIES});
    const {result, open} = await renderEditor({cardId: null});
    open(YEN_SID.id);
    expect(result.current.lookup).toEqual({kind: 'loading'});

    await held.land();
    expect(result.current.lookup).toMatchObject({kind: 'ready', card: {id: YEN_SID.id}});
    open('999999');
    expect(result.current.lookup).toEqual({kind: 'missing', cardId: '999999'});
  });

  it('keeps searching the card list when they fail to load, says so, and reads them again on retry', async () => {
    resetCollectionOnlyCards();
    let failing = true;
    const served = chunksOf({'4': SET_4_ENTRIES});
    stubChunks((set) => (failing ? new Response('Unavailable', {status: 503}) : served(set)));
    const {result} = await renderEditor({cardId: null});
    expect(result.current.collection.status).toBe('error');
    expect(ids(result.current.searchCards)).toEqual(ids(STUDIO_CARDS));
    // The card list's own error is its alone: a failure of Sets 1 to 8 doesn't turn the search into the list's.
    expect(result.current.lookup).toEqual({kind: 'none'});

    failing = false;
    await act(async () => result.current.collection.retry());
    await waitFor(() => expect(result.current.collection.status).toBe('ready'));
    expect(ids(result.current.searchCards)).toContain(YEN_SID.id);
  });

  it('scores a preview card against the card list alone, never against their cards', async () => {
    const findSynergies = vi.spyOn(synergyEngine, 'findSynergies');
    const {result} = await renderEditor({cardId: idOf(MEI)});
    expect(ids(result.current.searchCards)).toContain(YEN_SID.id);

    result.current.findSynergies();
    const scoredAgainst = findSynergies.mock.calls.flatMap(([, cards]) => ids(cards));
    expect(scoredAgainst).toContain(RELEASED_SONG.id);
    expect(scoredAgainst).not.toContain(YEN_SID.id);
  });
});
