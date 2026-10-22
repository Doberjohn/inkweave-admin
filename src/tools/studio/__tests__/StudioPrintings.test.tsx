import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, screen, waitFor, within} from '@testing-library/react';
import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {studioHref} from '../../../shell/nav';
import {pngFile} from '../../../test/images';
import {askedOf, contentsAnswer, type Asked, type Served} from '../finishes/__tests__/branchHarness';
import {chunksOf} from '../finishes/__tests__/collectionHarness';
import {
  EMPTY_CATALOG_TEXT,
  SET_4_ENTRIES,
  SET_4_TEXT,
  YEN_SID,
  allCardsText,
  collectionText,
} from '../finishes/__tests__/finishFixtures';
import {COMMIT_URL} from '../finishes/__tests__/repoHarness';
import {ALL_CARDS_PATH, CATALOG_PATH, PROMOS_PATH, setChunkPath} from '../finishes/finishFiles';
import {VERSION_BATCH_KEY_PREFIX, useVersionBatch} from '../finishes/versionBatchStore';
import {PRINTINGS_ONLY_NOTE} from '../studioCopy';
import {BRANCH_ONLY_ENTRY, PREVIEW_ENTRY, RELEASED_CARD, VARIANTS_ENTRY, cardOf, previewFileText} from '../studioFixtures';
import {STUDIO_WIDE_MIN} from '../studioLayout';
import {never, renderStudio, setCardList, stubFetch, watchAdditions, type Answer} from './studioHarness';
import {stubStudioRepo} from './studioRepo';
import {measured} from './studioStores';

// The card list and the measured width come from the harness's stores (studioStores.ts); the rest of the bridge is real.
vi.mock('../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import('./studioStores')).STORE_HOOKS,
}));

/*
 * Edit card's Printings panel as the page runs it (#68): the page's own fetch (stubFetch) with the
 * target branch's data files besides, which the panel reads through the real hook and the real
 * batch. The panel on its own, with its views as props, is PrintingsPanel.test.tsx.
 */

const CONTENTS = 'https://api.github.com/repos/Doberjohn/inkweave/contents/';
const CHUNK_4 = setChunkPath('4');
const CHUNK_9 = setChunkPath('9');
const EMPTY_FILE = collectionText([]);

/** The files a card of Sets 1 to 8 reads: Set 4's chunk, which holds Yen Sid's three entries, and an empty promos.json and catalog. */
const YEN_SID_FILES: Record<string, Served> = {[CHUNK_4]: SET_4_TEXT, [PROMOS_PATH]: EMPTY_FILE, [CATALOG_PATH]: EMPTY_CATALOG_TEXT};
/** The files of Lantern Keeper, a card of Set 9: no printing of its own, and nothing in allCards.json that names its versions. */
const LANTERN_FILES: Record<string, Served> = {
  [CHUNK_9]: EMPTY_FILE,
  [PROMOS_PATH]: EMPTY_FILE,
  [CATALOG_PATH]: EMPTY_CATALOG_TEXT,
  [ALL_CARDS_PATH]: allCardsText([]),
};

const MEI = cardOf(PREVIEW_ENTRY);
const MING = cardOf(VARIANTS_ENTRY);
const CARDS: LorcanaCard[] = [RELEASED_CARD, MEI, MING];
const FILE: LorcanaJSONCard[] = [PREVIEW_ENTRY, VARIANTS_ENTRY, BRANCH_ONLY_ENTRY];

const NUMBER_223 = 'Versions of Yen Sid - Powerful Sorcerer #223 · Set 4';
const LANTERN_12 = 'Versions of Lantern Keeper - Night Watch #12';

/** previewCards.json, as GitHub's raw contents answer it. */
const previewFile: Answer = () => new Response(previewFileText(FILE));

/** Whether a path of the app's repo is one of the data files the panel reads, which previewCards.json is not. */
const isDataFile = (path: string) => path === ALL_CARDS_PATH || path === CATALOG_PATH || path.includes('/data/collection/');

/**
 * The page's fetch (stubFetch), and the branch holding `files` besides: a data file it doesn't hold is
 * a 404, as on a real branch, and the object is read again on every request, so a test can add one.
 */
function stubStudio(files: Readonly<Record<string, Served>>) {
  stubFetch(previewFile, chunksOf({'4': SET_4_ENTRIES}));
  const studio = globalThis.fetch;
  const branch = contentsAnswer(files);
  const answer = vi.fn((...call: Parameters<typeof fetch>) => {
    const [url] = call;
    const isBranchFile = typeof url === 'string' && url.startsWith(CONTENTS) && isDataFile(askedOf(call).path);
    return isBranchFile ? branch(...call) : studio(...call);
  });
  vi.stubGlobal('fetch', answer);
  return answer;
}

/** What the panel asked of the branch's data files so far, in order. */
function dataRequests(fetched: ReturnType<typeof stubStudio>): Asked[] {
  return fetched.mock.calls
    .filter(([url]) => typeof url === 'string' && url.startsWith(CONTENTS))
    .map(askedOf)
    .filter(({path}) => isDataFile(path));
}

/** The line the panel draws while it reads the files. */
const LOADING = 'Loading the printings…';

const printings = () => screen.findByRole('region', {name: 'Printings'});
const searchField = () => screen.getByRole('searchbox', {name: 'Search cards'});

beforeEach(() => {
  // Wide, as StudioEdit's cases are, so every field of a form shows at once.
  measured.width = STUDIO_WIDE_MIN;
  setCardList({cards: CARDS});
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('StudioPage: the Printings panel in Edit card (#68)', () => {
  it("lists a released card's printings under its data, from the branch's files, read with the token", async () => {
    const fetched = stubStudio(LANTERN_FILES);
    renderStudio({path: studioHref('edit', RELEASED_CARD.id)});

    const panel = await printings();
    const group = await within(panel).findByRole('group', {name: LANTERN_12});
    // It is a Common with no field, so it comes in both, by its rarity.
    expect(within(group).getByRole('button', {name: 'Both'})).toHaveAttribute('aria-pressed', 'true');
    expect(within(panel).getByText('By rarity')).toBeInTheDocument();
    // Its data first, its printings under it.
    const facts = screen.getByRole('region', {name: 'Card data'});
    expect(facts.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The image control stays: the panel does not replace it.
    expect(screen.getByLabelText('Replace card image')).toBeInTheDocument();

    const asked = dataRequests(fetched);
    expect(asked.map(({path}) => path).sort()).toEqual([ALL_CARDS_PATH, CATALOG_PATH, CHUNK_9, PROMOS_PATH].sort());
    expect(asked.every(({token, ref}) => token === 'tok' && ref === 'master')).toBe(true);
  });

  it('says it is loading the printings while the files are read, with the rest of the card in place', async () => {
    stubStudio({...LANTERN_FILES, [CHUNK_9]: never});
    renderStudio({path: studioHref('edit', RELEASED_CARD.id)});

    expect(within(await printings()).getByText(LOADING)).toBeInTheDocument();
    expect(screen.getByRole('region', {name: 'Card data'})).toBeInTheDocument();
    expect(screen.queryByRole('group', {name: LANTERN_12})).not.toBeInTheDocument();
  });

  it('opens a card of Sets 1 to 8 with its printings under its read-only data, and no image control or Save', async () => {
    stubStudio(YEN_SID_FILES);
    renderStudio({path: studioHref('edit', YEN_SID.id)});

    const panel = await printings();
    expect(await within(panel).findByRole('group', {name: NUMBER_223})).toBeInTheDocument();
    expect(within(panel).getAllByRole('listitem')).toHaveLength(3);
    expect(within(screen.getByRole('region', {name: 'Card data'})).getByText(PRINTINGS_ONLY_NOTE)).toBeInTheDocument();
    expect(screen.queryByLabelText('Replace card image')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /save/i})).not.toBeInTheDocument();
  });

  it('shows no panel for a preview card, and reads none of the data files', async () => {
    const fetched = stubStudio({...YEN_SID_FILES, ...LANTERN_FILES});
    renderStudio({path: studioHref('edit', MEI.id)});

    expect(await screen.findByRole('textbox', {name: 'Name'})).toHaveValue('Mei');
    expect(screen.queryByRole('region', {name: 'Printings'})).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', {name: 'Printings'})).not.toBeInTheDocument();
    await act(async () => {}); // time for a read that should not be made
    expect(dataRequests(fetched)).toEqual([]);
  });

  it('stages a choice in the studio batch, which outlives the card and asks nothing when the owner leaves it', async () => {
    const fetched = stubStudio(YEN_SID_FILES);
    const {user} = renderStudio({path: studioHref('edit', YEN_SID.id)});
    const batch = renderHook(() => useVersionBatch());
    const group = await screen.findByRole('group', {name: NUMBER_223});
    expect(within(group).getByRole('button', {name: 'Foil only'})).toHaveAttribute('aria-pressed', 'true');

    await user.click(within(group).getByRole('button', {name: 'Both'}));
    expect(within(group).getByRole('button', {name: 'Both'})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(batch.result.current.changes).toEqual([
      expect.objectContaining({
        id: '946',
        label: 'Yen Sid - Powerful Sorcerer #223 · Set 4',
        from: ['foil'],
        shownFrom: ['foil'],
        to: ['normal', 'foil'],
      }),
    ]);

    // The batch lives in the browser, so leaving the card drops nothing: the guard asks about the card's own draft.
    await user.click(screen.getByRole('link', {name: 'Load a different card'}));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.type(searchField(), 'Yen Sid');
    await user.click(await screen.findByRole('link', {name: /^Yen Sid /}));

    // The card opens again with the change still pending, and its files are not read a second time.
    const again = await screen.findByRole('group', {name: NUMBER_223});
    expect(within(again).getByRole('button', {name: 'Both'})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(dataRequests(fetched)).toHaveLength(3);
  });

  it('opens a card whose set it has read without a loading line, not even for a frame', async () => {
    stubStudio(YEN_SID_FILES);
    const added = watchAdditions();
    const {user} = renderStudio({path: studioHref('edit', YEN_SID.id)});
    await screen.findByRole('group', {name: NUMBER_223});
    // The first open reads the files, so it draws the line until they land: what the watch can see.
    expect(added.texts()).toContainEqual(expect.stringContaining(LOADING));

    await user.click(screen.getByRole('link', {name: 'Load a different card'}));
    await user.type(searchField(), 'Yen Sid');
    const row = await screen.findByRole('link', {name: /^Yen Sid /});
    added.clear();
    await user.click(row);
    await screen.findByRole('group', {name: NUMBER_223});

    // The card came back with its rows in the first frame it drew, and drew the line in none.
    expect(added.texts()).toContainEqual(expect.stringContaining('#223 · Alt foil'));
    expect(added.texts()).not.toContainEqual(expect.stringContaining(LOADING));
    added.stop();
  });

  it('takes a change back when the owner chooses what the printing showed', async () => {
    stubStudio(YEN_SID_FILES);
    const {user} = renderStudio({path: studioHref('edit', YEN_SID.id)});
    const batch = renderHook(() => useVersionBatch());
    const group = await screen.findByRole('group', {name: NUMBER_223});

    await user.click(within(group).getByRole('button', {name: 'Both'}));
    expect(batch.result.current.changes).toHaveLength(1);
    await user.click(within(group).getByRole('button', {name: 'Foil only'}));
    expect(batch.result.current.changes).toEqual([]);
    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
    expect(screen.getByText('In the data')).toBeInTheDocument();
  });

  it('keeps the panel in place when Discard opens the card’s form afresh, rather than mount it and read again', async () => {
    stubStudio(LANTERN_FILES);
    const {user} = renderStudio({path: studioHref('edit', RELEASED_CARD.id)});
    const group = await screen.findByRole('group', {name: LANTERN_12});
    const facts = screen.getByRole('region', {name: 'Card data'});

    await user.upload(await screen.findByLabelText('Click or drop to replace image'), pngFile('lantern.png'));
    await user.click(await screen.findByRole('button', {name: 'Discard all changes'}));
    // The facts are the form's: Discard keyed them afresh. The panel beside them was not.
    expect(screen.getByRole('region', {name: 'Card data'})).not.toBe(facts);
    expect(screen.getByRole('group', {name: LANTERN_12})).toBe(group);
  });

  // The spec's item 4: Edit card's Save commits the open card's fields or image alone, and never takes the batch with it.
  it('saves the card’s image alone with a version change staged: the commit holds the image, and the batch stays', async () => {
    const repo = stubStudioRepo({branch: LANTERN_FILES});
    const {user} = renderStudio({path: studioHref('edit', RELEASED_CARD.id)});
    const batch = renderHook(() => useVersionBatch());
    await user.click(within(await screen.findByRole('group', {name: LANTERN_12})).getByRole('button', {name: 'Foil only'}));
    const staged = batch.result.current.changes;
    expect(staged).toEqual([expect.objectContaining({id: RELEASED_CARD.id, to: ['foil']})]);

    await user.upload(await screen.findByLabelText('Click or drop to replace image'), pngFile('lantern.png'));
    const save = screen.getByRole('button', {name: 'Save changes to master'});
    await waitFor(() => expect(save).toBeEnabled());
    await user.click(save);
    expect(await screen.findByRole('link', {name: 'View commit'})).toHaveAttribute('href', COMMIT_URL);

    // One commit, of the image's path alone, under the image's message.
    expect(repo.writes()).toEqual(['POST git/blobs', 'POST git/trees', 'POST git/commits', 'PATCH git/refs/heads/master']);
    expect(Object.keys(repo.filesSent())).toEqual([`apps/web/public/card-images-raw/${RELEASED_CARD.id}.png`]);
    expect(repo.commitMessage()).toBe(`fix(card-images): update image for ${RELEASED_CARD.fullName} [${RELEASED_CARD.id}]`);
    // The batch is as it was, saved, and the tray still lists the change.
    expect(batch.result.current.changes).toBe(staged);
    expect(JSON.parse(localStorage.getItem(`${VERSION_BATCH_KEY_PREFIX}master`) ?? 'null')).toEqual({v: 1, changes: staged});
    const tray = screen.getByRole('region', {name: 'Version changes'});
    expect(within(tray).getByRole('heading', {level: 2, name: 'Version changes · 1'})).toBeInTheDocument();
  });

  it('reads the files again from the error, and hands focus to the heading once they land (R-48)', async () => {
    const files = {...LANTERN_FILES};
    delete files[CHUNK_9]; // the branch holds no chunk of Set 9 yet
    stubStudio(files);
    const {user} = renderStudio({path: studioHref('edit', RELEASED_CARD.id)});

    const failure = await screen.findByRole('alert');
    expect(failure).toHaveTextContent(`Could not read the printings: GitHub 404 on ${CHUNK_9}`);
    expect(screen.queryByRole('group', {name: LANTERN_12})).not.toBeInTheDocument();

    files[CHUNK_9] = EMPTY_FILE;
    await user.click(screen.getByRole('button', {name: 'Read the files again'}));
    expect(await screen.findByRole('group', {name: LANTERN_12})).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // The button went with the error: the heading of the panel that replaced it takes the focus.
    await waitFor(() => expect(screen.getByRole('heading', {name: 'Printings'})).toHaveFocus());
  });
});
