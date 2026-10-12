import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook} from '@testing-library/react';
import {transformCard, type LorcanaCard, type LorcanaJSONCard} from 'inkweave-synergy-engine';
import {DeferredReader} from '../../../test/DeferredReader';
import {imageDataUrl, pngFile} from '../../../test/images';
import {inkBlock} from '../../../app-bridge';
import {buildPreviewCard, type RevealCardForm} from '../../reveal/buildPreviewCard';
import {StaleCardError} from '../../reveal/githubClient';

// The context's card list; the rest of the bridge stays real (validateForm.ts and
// constants.ts read ALL_INKS, inkBlock, REVEAL_SET_CODE and REVEAL_ID_BASE from it).
const cardList = vi.hoisted(() => ({
  cards: [] as LorcanaCard[],
  isLoading: false,
  error: null as Error | null,
  retryLoad: vi.fn(),
}));
vi.mock('../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../app-bridge')>()),
  useCardDataContext: () => cardList,
}));
// Each save test decides when its commit settles, and each read what it returns.
const commitCardImage = vi.hoisted(() => vi.fn());
vi.mock('../../image/githubClient', () => ({commitCardImage}));
const {commitCardEdit, readPreviewCards} = vi.hoisted(() => ({commitCardEdit: vi.fn(), readPreviewCards: vi.fn()}));
vi.mock('../../reveal/githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../reveal/githubClient')>()),
  commitCardEdit,
  readPreviewCards,
}));

import {usePreviewCardsFile} from '../usePreviewCardsFile';
import {useCardEditor} from '../useCardEditor';

// Taken from the season's constants so these fixtures stay valid every season.
const RUBY_NUMBER = inkBlock('Ruby').first;

/** A Japanese-scan preview card, as New reveal writes it (Doberjohn/inkweave-admin#14). */
const MEI: LorcanaJSONCard = buildPreviewCard({
  collectorNumber: String(RUBY_NUMBER),
  name: 'Mei',
  version: 'Red Panda',
  rarity: 'Rare',
  franchise: '',
  cost: '4',
  ink: 'Ruby',
  ink2: '',
  inkwell: true,
  type: 'Character',
  strength: '3',
  willpower: '5',
  lore: '2',
  moveCost: '',
  subtypes: '',
  keywords: '',
  fullText: '',
  scanLanguage: 'ja',
});
const MEI_ID = String(MEI.id);
const LIVE_MEI: LorcanaCard = {...(transformCard(MEI) as LorcanaCard), imageUrl: `/card-images-preview/${MEI_ID}.avif`};
const ELSA: LorcanaCard = {
  id: '2001',
  name: 'Elsa',
  fullName: 'Elsa - Snow Queen',
  cost: 5,
  ink: 'Amethyst',
  inkwell: true,
  type: 'Character',
  imageUrl: '/card-images/2001.avif',
};

const COMMIT = {commitUrl: 'https://github.com/x/y/commit/1'};
const image = pngFile;

beforeEach(() => {
  cardList.cards = [ELSA, LIVE_MEI];
  cardList.isLoading = false;
  cardList.error = null;
  readPreviewCards.mockResolvedValue([MEI]);
  DeferredReader.reset();
  vi.stubGlobal('FileReader', DeferredReader);
});

// No clearMocks in vite.config.ts: call counts would carry over between tests.
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  readPreviewCards.mockReset();
});

/** A promise and the function that settles it, for a commit or a read a test lands by hand. */
function deferred<T>() {
  let settle: (value: T) => void = () => {};
  const promise = new Promise<T>((resolve) => (settle = resolve));
  return {promise, settle: (value: T) => act(async () => settle(value))};
}

/** The editor on a card, as Card studio wires it, once previewCards.json's first read lands. */
async function openEditor(cardId: string | null) {
  const hook = renderHook(
    ({id}: {id: string | null}) => useCardEditor({token: 'tok', cardId: id, file: usePreviewCardsFile('tok')}),
    {initialProps: {id: cardId}},
  );
  await act(async () => {});
  return hook;
}

type Editor = Awaited<ReturnType<typeof openEditor>>;

/** Stage a file and let its bytes be read (the nth read of the test). */
async function stage(editor: Editor, name: string, n: number) {
  act(() => void editor.result.current.onImageChange(image(name)));
  await DeferredReader.finish(n);
}

function edit(editor: Editor, patch: Partial<RevealCardForm>) {
  act(() => editor.result.current.patchForm(patch));
}

async function save(editor: Editor) {
  await act(async () => editor.result.current.save());
}

describe('useCardEditor: the staged image', () => {
  it('clears the staged image when another card opens', async () => {
    const editor = await openEditor(ELSA.id);
    await stage(editor, 'a.png', 0);
    expect(editor.result.current.canSave).toBe(true);

    editor.rerender({id: MEI_ID});
    expect(editor.result.current.imageDataUrl).toBeNull();
    expect(editor.result.current.canSave).toBe(false);
  });

  it("never offers one file's bytes under another file's name", async () => {
    const editor = await openEditor(ELSA.id);
    await stage(editor, 'a.png', 0);
    act(() => void editor.result.current.onImageChange(image('b.webp')));
    expect(editor.result.current.canSave).toBe(false);
    await DeferredReader.finish(1);
    expect(editor.result.current.imageDataUrl).toBe(imageDataUrl('b.webp'));
  });

  it('drops a read that finishes after another card opens', async () => {
    const editor = await openEditor(ELSA.id);
    act(() => void editor.result.current.onImageChange(image('a.png')));
    editor.rerender({id: MEI_ID});
    await DeferredReader.finish(0);
    expect(editor.result.current.imageDataUrl).toBeNull();
    expect(editor.result.current.canSave).toBe(false);
  });

  it("clears the card's image once its save lands", async () => {
    const commit = deferred<typeof COMMIT>();
    commitCardImage.mockReturnValue(commit.promise);
    const editor = await openEditor(ELSA.id);
    await stage(editor, 'a.png', 0);
    act(() => editor.result.current.save());
    await commit.settle(COMMIT);
    expect(editor.result.current.result).toEqual(COMMIT);
    expect(editor.result.current.imageDataUrl).toBeNull();
  });

  it('keeps a card opened while the save ran, with its edits and image', async () => {
    const commit = deferred<typeof COMMIT>();
    commitCardImage.mockReturnValue(commit.promise);
    const editor = await openEditor(ELSA.id);
    await stage(editor, 'a.png', 0);
    act(() => editor.result.current.save());

    editor.rerender({id: MEI_ID});
    edit(editor, {cost: '5'});
    await stage(editor, 'b.png', 1);
    await commit.settle(COMMIT);
    expect(editor.result.current.card?.id).toBe(MEI_ID);
    expect(editor.result.current.form?.cost).toBe('5');
    expect(editor.result.current.imageName).toBe('b.png');
  });
});

describe('useCardEditor: a save that lands late', () => {
  it('reports nothing once its card was left', async () => {
    const commit = deferred<typeof COMMIT>();
    commitCardImage.mockReturnValue(commit.promise);
    const editor = await openEditor(ELSA.id);
    await stage(editor, 'a.png', 0);
    act(() => editor.result.current.save());

    editor.rerender({id: MEI_ID});
    await commit.settle(COMMIT);
    expect(editor.result.current).toMatchObject({result: null, saveError: null, saving: false});
  });
});

describe('useCardEditor: which save runs', () => {
  it('replaces only the image of a released card', async () => {
    commitCardImage.mockResolvedValue(COMMIT);
    const editor = await openEditor(ELSA.id);
    expect(editor.result.current).toMatchObject({tag: 'Released', kind: 'image', form: null});
    await stage(editor, 'a.png', 0);
    await save(editor);
    expect(commitCardImage).toHaveBeenCalledWith(expect.objectContaining({card: ELSA, imageExt: 'png'}));
    expect(commitCardEdit).not.toHaveBeenCalled();
  });

  it("commits a preview card's new image alone through the image commit", async () => {
    commitCardImage.mockResolvedValue(COMMIT);
    const editor = await openEditor(MEI_ID);
    expect(editor.result.current).toMatchObject({tag: 'Preview', kind: 'fields'});
    await stage(editor, 'a.png', 0);
    await save(editor);
    expect(commitCardImage).toHaveBeenCalledTimes(1);
    expect(commitCardEdit).not.toHaveBeenCalled();
  });

  it('commits field edits and the image together', async () => {
    commitCardEdit.mockResolvedValue(COMMIT);
    const editor = await openEditor(MEI_ID);
    edit(editor, {cost: '5'});
    await stage(editor, 'a.png', 0);
    await save(editor);
    expect(commitCardEdit).toHaveBeenCalledTimes(1);
    expect(commitCardEdit).toHaveBeenCalledWith({
      token: 'tok',
      loaded: MEI,
      changes: {cost: 5},
      image: {base64: imageDataUrl('a.png'), ext: 'png'},
    });
    expect(commitCardImage).not.toHaveBeenCalled();
  });

  // Doberjohn/inkweave-admin#14 item 3: the English scan of a card first shown abroad.
  it('sends an English scan and a rename as one change', async () => {
    commitCardEdit.mockResolvedValue(COMMIT);
    const editor = await openEditor(MEI_ID);
    edit(editor, {name: 'Arthur', version: 'Jousting Knight', scanLanguage: 'en'});
    await save(editor);
    expect(commitCardEdit.mock.calls[0][0].changes).toEqual({
      name: 'Arthur',
      version: 'Jousting Knight',
      fullName: 'Arthur - Jousting Knight',
      scanLanguage: null,
    });
  });

  it('keeps Save off while the form fails its checks', async () => {
    const editor = await openEditor(MEI_ID);
    edit(editor, {lore: ''});
    expect(editor.result.current.dirty).toBe(true);
    expect(editor.result.current.validation.ok).toBe(false);
    expect(editor.result.current.canSave).toBe(false);
  });
});

describe('useCardEditor: after a fields save', () => {
  it('starts the next edit from what was committed, and reads the file again', async () => {
    commitCardEdit.mockResolvedValue(COMMIT);
    const editor = await openEditor(MEI_ID);
    edit(editor, {cost: '5'});
    await save(editor);
    expect(editor.result.current.changes).toEqual([]);
    expect(editor.result.current.dirty).toBe(false);
    expect(readPreviewCards).toHaveBeenCalledTimes(2);

    edit(editor, {lore: '3'});
    await save(editor);
    expect(commitCardEdit.mock.calls[1][0]).toMatchObject({loaded: {...MEI, cost: 5}, changes: {lore: 3}});
  });

  it('opens the committed entry when the card is left and opened again', async () => {
    const committed = {...MEI, cost: 5};
    readPreviewCards.mockResolvedValueOnce([MEI]).mockResolvedValue([committed]);
    commitCardEdit.mockResolvedValue(COMMIT);
    const editor = await openEditor(MEI_ID);
    edit(editor, {cost: '5'});
    await save(editor);
    await act(async () => {});

    editor.rerender({id: ELSA.id});
    editor.rerender({id: MEI_ID});
    edit(editor, {lore: '3'});
    await save(editor);
    expect(commitCardEdit.mock.calls[1][0].loaded).toEqual(committed);
  });
});

describe('useCardEditor: a stale card', () => {
  it('offers to load the card again, and re-seeds only once that read lands', async () => {
    commitCardEdit.mockRejectedValue(new StaleCardError(`Card ${MEI_ID} changed on master since you loaded it. Load it again.`));
    const editor = await openEditor(MEI_ID);
    edit(editor, {cost: '5'});
    await save(editor);
    expect(editor.result.current.stale).toBe(true);

    const fresh = {...MEI, cost: 6};
    const read = deferred<LorcanaJSONCard[]>();
    readPreviewCards.mockReturnValue(read.promise);
    act(() => editor.result.current.loadAgain());
    expect(editor.result.current.loadingAgain).toBe(true);
    expect(editor.result.current.form?.cost).toBe('5');

    await read.settle([fresh]);
    expect(editor.result.current.form?.cost).toBe('6');
    expect(editor.result.current.stale).toBe(false);
    expect(editor.result.current.dirty).toBe(false);
  });

  it("keeps the edits when Load it again's read fails, and retry reads again", async () => {
    commitCardEdit.mockRejectedValue(new StaleCardError(`Card ${MEI_ID} changed on master since you loaded it. Load it again.`));
    const editor = await openEditor(MEI_ID);
    edit(editor, {cost: '5'});
    await save(editor);

    readPreviewCards.mockRejectedValueOnce(new Error('GitHub 502 on previewCards.json'));
    act(() => editor.result.current.loadAgain());
    await act(async () => {});
    expect(editor.result.current).toMatchObject({stale: true, loadingAgain: false, reloadError: 'GitHub 502 on previewCards.json'});
    expect(editor.result.current.form?.cost).toBe('5');

    readPreviewCards.mockResolvedValue([{...MEI, cost: 6}]);
    act(() => editor.result.current.retry());
    expect(editor.result.current).toMatchObject({loadingAgain: true, reloadError: null});
    await act(async () => {});
    expect(editor.result.current.form?.cost).toBe('6');
  });

  it('leaves stale off for any other failure, so saving again retries', async () => {
    commitCardEdit.mockRejectedValue(new Error('master changed while publishing, so nothing was published. Publish again.'));
    const editor = await openEditor(MEI_ID);
    edit(editor, {cost: '5'});
    await save(editor);
    expect(editor.result.current).toMatchObject({stale: false, saveError: expect.stringMatching(/Publish again/)});
    expect(editor.result.current.canSave).toBe(true);
  });
});

describe('useCardEditor: opening a card', () => {
  it('reports an id no card has as missing', async () => {
    const editor = await openEditor('999999');
    expect(editor.result.current.lookup).toBe('missing');
  });

  it('reports an unreadable previewCards.json, and reads it again on retry', async () => {
    readPreviewCards.mockRejectedValueOnce(new Error('GitHub 502 on previewCards.json'));
    const editor = await openEditor(MEI_ID);
    expect(editor.result.current).toMatchObject({lookup: 'error', lookupError: 'GitHub 502 on previewCards.json'});

    act(() => editor.result.current.retry());
    await act(async () => {});
    expect(editor.result.current.lookup).toBe('ready');
  });

  it("lists the branch's preview cards the live list lacks, and opens them", async () => {
    cardList.cards = [ELSA];
    const editor = await openEditor(MEI_ID);
    expect(editor.result.current.cards.map((c) => c.id)).toEqual([ELSA.id, MEI_ID]);
    expect(editor.result.current).toMatchObject({lookup: 'ready', tag: 'Preview', kind: 'fields'});
  });
});
