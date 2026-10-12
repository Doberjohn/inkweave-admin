import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from '@testing-library/react';
import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {REVEAL_SET_CODE, type useCardDataContext} from '../../../app-bridge';
import {DeferredReader} from '../../../test/DeferredReader';
import {pngFile} from '../../../test/images';
import {searchCards} from '../editSearch';
import {BRANCH_ONLY_ENTRY, PREVIEW_ENTRY, RELEASED_CARD, cardOf, previewEntry, studioCard} from '../studioFixtures';
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
