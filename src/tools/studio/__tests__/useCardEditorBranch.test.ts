import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from '@testing-library/react';
import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {REVEAL_SET_CODE, type useCardDataContext} from '../../../app-bridge';
import {DeferredReader} from '../../../test/DeferredReader';
import {pngFile} from '../../../test/images';
import {StaleCardError} from '../../reveal/githubClient';
import {searchCards} from '../editSearch';
import {BRANCH_ONLY_ENTRY, PREVIEW_ENTRY, RELEASED_CARD, UNNUMBERED_ENTRY, cardOf, previewEntry, studioCard} from '../studioFixtures';
import {useCardEditor} from '../useCardEditor';

/*
 * R4-4d (R-66): Edit card with the cards only the branch file holds. The card
 * list is a fixed value per test; the branch file is read through the mocked
 * readPreviewCards, so a test decides when each read lands. transformRawCards
 * stays real: the branch-only card's art comes from it.
 */

type CardList = Pick<ReturnType<typeof useCardDataContext>, 'cards' | 'isLoading' | 'error' | 'getCardById' | 'retryLoad'>;

const cardList = vi.hoisted(() => ({value: null as CardList | null}));
vi.mock('../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useCardDataContext: () => cardList.value,
}));
const {readPreviewCards, commitCardEdit, commitCardImage} = vi.hoisted(() => ({
  readPreviewCards: vi.fn(),
  commitCardEdit: vi.fn(),
  commitCardImage: vi.fn(),
}));
vi.mock('../../reveal/githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../reveal/githubClient')>()),
  readPreviewCards,
  commitCardEdit,
}));
vi.mock('../../image/githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../image/githubClient')>()),
  commitCardImage,
}));

const LISTED_PREVIEW = cardOf(PREVIEW_ENTRY);
const BRANCH_ONLY_ID = String(BRANCH_ONLY_ENTRY.id);

/** The shell's card list, loaded with `cards`. */
function setCardList(cards: LorcanaCard[]) {
  const getCardById = (id: string) => cards.find((card) => card.id === id);
  cardList.value = {cards, isLoading: false, error: null, getCardById, retryLoad: vi.fn()};
}

/** The next read of previewCards.json, landing or failing when the test says. */
function nextRead() {
  let resolve: (cards: LorcanaJSONCard[]) => void = () => {};
  let reject: (error: Error) => void = () => {};
  readPreviewCards.mockReturnValueOnce(new Promise((onLand, onFail) => ((resolve = onLand), (reject = onFail))));
  return {
    land: (cards: LorcanaJSONCard[]) => act(async () => resolve(cards)),
    fail: (error: Error) => act(async () => reject(error)),
  };
}

function renderEditor(cardId: string | null) {
  return renderHook((props: {token: string; cardId: string | null}) => useCardEditor(props), {
    initialProps: {token: 'tok', cardId},
  });
}

beforeEach(() => {
  // Blocks, not an arrow's value: mockReset() returns the mock, which Vitest would call as a teardown.
  readPreviewCards.mockReset();
  commitCardEdit.mockReset();
  commitCardImage.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useCardEditor: cards only the branch file holds (R-66)', () => {
  it('lists a card New reveal just published first, not deployed, with the art it will have', async () => {
    setCardList([LISTED_PREVIEW, RELEASED_CARD]);
    const read = nextRead();
    const {result} = renderEditor(null);
    await read.land([PREVIEW_ENTRY, BRANCH_ONLY_ENTRY]);

    const {searchCards: cards, previewFile, branchOnlyIds} = result.current;
    expect(cards.map((card) => card.id)).toEqual([BRANCH_ONLY_ID, LISTED_PREVIEW.id, RELEASED_CARD.id]);
    expect(cards[0].imageUrl).toBe(`/card-images-preview/${BRANCH_ONLY_ID}.avif`);
    const {rows} = searchCards({cards, query: 'wren', previewIds: previewFile.previewIds, branchOnlyIds});
    expect(rows).toMatchObject([{card: {id: BRANCH_ONLY_ID}, tag: 'Preview', deployed: false}]);
  });

  it.each([
    {name: 'a card only the branch file holds', listed: [RELEASED_CARD], cardId: BRANCH_ONLY_ID, deployed: false, cardName: 'Wren'},
    {name: 'a preview card the card list holds', listed: [LISTED_PREVIEW], cardId: LISTED_PREVIEW.id, deployed: true, cardName: 'Mei'},
  ])('opens $name once the file lands, loading until then (deployed: $deployed)', async ({listed, cardId, deployed, cardName}) => {
    setCardList(listed);
    const read = nextRead();
    const {result} = renderEditor(cardId);
    expect(result.current.lookup).toEqual({kind: 'loading'});

    await read.land([PREVIEW_ENTRY, BRANCH_ONLY_ENTRY]);
    expect(result.current.lookup).toMatchObject({kind: 'ready', card: {id: cardId}, imageOnly: null});
    expect({tag: result.current.tag, deployed: result.current.deployed}).toEqual({tag: 'Preview', deployed});
    expect(result.current.form?.name).toBe(cardName);
  });

  it.each([
    {name: 'is missing once the file is read', settle: (read: ReturnType<typeof nextRead>) => read.land([PREVIEW_ENTRY]), lookup: {kind: 'missing', cardId: '14999'}},
    {
      name: "shows the file's error when the read fails",
      settle: (read: ReturnType<typeof nextRead>) => read.fail(new Error('GitHub 500 on apps/web/public/data/previewCards.json: Server error')),
      lookup: {kind: 'fileFailed', error: 'GitHub 500 on apps/web/public/data/previewCards.json: Server error'},
    },
  ])('waits for the file on an id neither source holds, then $name', async ({settle, lookup}) => {
    setCardList([RELEASED_CARD]);
    const read = nextRead();
    const {result} = renderEditor('14999');
    expect(result.current.lookup).toEqual({kind: 'loading'});

    await settle(read);
    expect(result.current.lookup).toEqual(lookup);
  });

  it('reads a card the file no longer holds as gone, with no form and no save, even with an image staged', async () => {
    DeferredReader.reset();
    vi.stubGlobal('FileReader', DeferredReader);
    setCardList([LISTED_PREVIEW]);
    const read = nextRead();
    const {result} = renderEditor(LISTED_PREVIEW.id);
    await read.land([]);
    expect(result.current.lookup).toEqual({kind: 'gone', card: LISTED_PREVIEW});
    expect(result.current.form).toBeNull();

    act(() => void result.current.onImageChange(pngFile('mei.png')));
    await DeferredReader.finish(0);
    expect(result.current.imageName).toBe('mei.png');
    expect(result.current.canSave).toBe(false);
    await act(() => result.current.save());
    expect(commitCardEdit).not.toHaveBeenCalled();
    expect(commitCardImage).not.toHaveBeenCalled();
  });

  it('reads the reveal set released under an allCards.json id as Released, whatever the file holds under that id', async () => {
    const released = studioCard({id: '1936', name: 'Mei', version: 'Red Panda', setCode: REVEAL_SET_CODE});
    setCardList([released]);
    const read = nextRead();
    const {result} = renderEditor(released.id);
    await read.land([previewEntry({id: 1936})]);

    expect(result.current.lookup).toMatchObject({kind: 'ready', entry: null, imageOnly: 'released'});
    expect({tag: result.current.tag, form: result.current.form}).toEqual({tag: 'Released', form: null});
    expect(result.current.previewFile.previewIds?.has(1936)).toBe(false);
  });

  it('reads the file again on reloadFile, so a card New reveal just published opens at once', async () => {
    setCardList([LISTED_PREVIEW]);
    const first = nextRead();
    const {result, rerender} = renderEditor(null);
    await first.land([PREVIEW_ENTRY]);
    expect(result.current.branchOnlyIds.size).toBe(0);

    const second = nextRead();
    act(() => result.current.reloadFile());
    await second.land([PREVIEW_ENTRY, BRANCH_ONLY_ENTRY]);
    expect(result.current.branchOnlyIds).toEqual(new Set([BRANCH_ONLY_ENTRY.id]));

    rerender({token: 'tok', cardId: BRANCH_ONLY_ID});
    await waitFor(() => expect(result.current.lookup).toMatchObject({kind: 'ready', card: {id: BRANCH_ONLY_ID}}));
    expect(result.current.deployed).toBe(false);
  });
});

/*
 * An open card the branch file loses drops its draft once (R-66): it reads
 * gone while the card list holds it, and missing when only the file did.
 * Neither has a form, a file control or a save, so the edit, a staged scan and
 * the outcome go, and nothing is left for the unsaved-changes guard to ask
 * about. The draft follows reads until the file holds the card again.
 */
describe('useCardEditor: an open card that leaves the branch file', () => {
  /** The file as each case opens: Mei, whom the card list holds too, and Wren, whom only the file holds. */
  const OPENED = [PREVIEW_ENTRY, BRANCH_ONLY_ENTRY];
  const LEAVERS = [
    {name: 'a card the card list holds reads gone', listed: [LISTED_PREVIEW], entry: PREVIEW_ENTRY, left: {kind: 'gone', card: LISTED_PREVIEW}},
    {name: 'a card only the file held reads missing', listed: [RELEASED_CARD], entry: BRANCH_ONLY_ENTRY, left: {kind: 'missing', cardId: BRANCH_ONLY_ID}},
  ];
  type Leaver = (typeof LEAVERS)[number];

  /** The file once it has lost the case's card. */
  const without = ({entry}: Leaver) => OPENED.filter((other) => other !== entry);

  /** The case's card open, with its cost edited. */
  async function edited({listed, entry}: Leaver) {
    setCardList(listed);
    const first = nextRead();
    const editor = renderEditor(String(entry.id));
    await first.land(OPENED);
    act(() => editor.result.current.patchForm({cost: '5'}));
    expect(editor.result.current).toMatchObject({form: {name: entry.name, cost: '5'}, dirty: true});
    return editor;
  }

  /** A scan staged on the open card, its bytes read. */
  async function stageScan({result}: Pick<ReturnType<typeof renderEditor>, 'result'>) {
    DeferredReader.reset();
    vi.stubGlobal('FileReader', DeferredReader);
    act(() => void result.current.onImageChange(pngFile('scan.png')));
    await DeferredReader.finish(0);
    expect(result.current).toMatchObject({imageName: 'scan.png', dirty: true});
  }

  it.each(LEAVERS)('ends a save refused as stale once Load it again lands without the card: $name (R-68, R-69)', async (leaver) => {
    const {result} = await edited(leaver);
    const stale = `Card ${leaver.entry.id} is no longer in previewCards.json on master. Load it again.`;
    commitCardEdit.mockRejectedValueOnce(new StaleCardError(stale));
    await act(() => result.current.save());
    expect(result.current).toMatchObject({failure: 'stale', saveError: stale});

    const again = nextRead();
    let loaded: Promise<boolean> = Promise.resolve(false);
    act(() => {
      loaded = result.current.loadAgain();
    });
    await again.land(without(leaver));
    await expect(loaded).resolves.toBe(true);
    expect(result.current).toMatchObject({lookup: leaver.left, form: null, dirty: false, changes: []});
    expect(result.current).toMatchObject({failure: null, saveError: null, dropped: 1, canSave: false});
  });

  it.each(LEAVERS)('drops the edit and a staged scan when reloadFile lands without the card, and seeds its fields again once the file holds it: $name', async (leaver) => {
    const editor = await edited(leaver);
    await stageScan(editor);
    const {result} = editor;
    const second = nextRead();
    act(() => result.current.reloadFile());
    await second.land(without(leaver));
    expect(result.current).toMatchObject({lookup: leaver.left, form: null, imageName: null, changes: [], dirty: false, dropped: 1});

    const third = nextRead();
    act(() => result.current.reloadFile());
    await third.land(OPENED);
    expect(result.current).toMatchObject({lookup: {kind: 'ready', entry: leaver.entry}, form: {name: leaver.entry.name}, imageName: null, changes: []});
    expect(result.current.form?.cost).not.toBe('5');
  });

  it("drops an image-only card's reason and its staged scan once it reads gone (R-65)", async () => {
    const tyler = cardOf(UNNUMBERED_ENTRY);
    setCardList([tyler]);
    const first = nextRead();
    const editor = renderEditor(tyler.id);
    await first.land([UNNUMBERED_ENTRY]);
    expect(editor.result.current.imageOnly).toBe('unnumbered');
    await stageScan(editor);

    const second = nextRead();
    act(() => editor.result.current.reloadFile());
    await second.land([]);
    expect(editor.result.current).toMatchObject({lookup: {kind: 'gone', card: tyler}, imageOnly: null, imageName: null, changes: [], dirty: false});
  });
});
