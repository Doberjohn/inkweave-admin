import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, screen, within} from '@testing-library/react';
import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {studioHref} from '../../../shell/nav';
import {askedOf, contentsAnswer, type Served} from '../finishes/__tests__/branchHarness';
import {chunksOf} from '../finishes/__tests__/collectionHarness';
import {
  EMPTY_CATALOG_TEXT,
  NUMBER_223_TO_BOTH,
  NUMBER_223_TO_BOTH_CLASHED,
  NUMBER_59_TO_FOIL,
  SET_4_ENTRIES,
  SET_4_TEXT,
  YEN_SID,
  collectionText,
  withFinishes,
} from '../finishes/__tests__/finishFixtures';
import {BASE, COMMIT_URL, stubRepo, type RepoStub} from '../finishes/__tests__/repoHarness';
import {CATALOG_PATH, PROMOS_PATH, setChunkPath} from '../finishes/finishFiles';
import {clashMessage, versionCommitMessage} from '../finishes/publishVersions';
import {VERSION_BATCH_KEY_PREFIX, useVersionBatch} from '../finishes/versionBatchStore';
import {BRANCH_ONLY_ENTRY, PREVIEW_ENTRY, RELEASED_CARD, VARIANTS_ENTRY, cardOf, previewFileText} from '../studioFixtures';
import {STUDIO_WIDE_MIN} from '../studioLayout';
import {TOKEN_KEY, renderStudio, setCardList, stubFetch, type Answer} from './studioHarness';
import {measured} from './studioStores';

// The card list and the measured width come from the harness's stores (studioStores.ts); the rest of the bridge is real.
vi.mock('../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import('./studioStores')).STORE_HOOKS,
}));

/*
 * The Version changes tray as the page runs it (#68): over the real batch, with the page's own
 * fetch (stubFetch) and the app's repo besides (stubRepo), which the Printings panel reads and a
 * publish commits to. The tray on its own, with its view as a prop, is VersionsTray.test.tsx.
 */

const REPO_API = 'https://api.github.com/repos/Doberjohn/inkweave';
const CONTENTS = `${REPO_API}/contents/`;
const CHUNK_4 = setChunkPath('4');

/** The files a card of Sets 1 to 8 reads: Set 4's chunk, which holds Yen Sid's three entries, and an empty promos.json and catalog. */
const YEN_SID_FILES: Record<string, Served> = {
  [CHUNK_4]: SET_4_TEXT,
  [PROMOS_PATH]: collectionText([]),
  [CATALOG_PATH]: EMPTY_CATALOG_TEXT,
};

const MEI = cardOf(PREVIEW_ENTRY);
const MING = cardOf(VARIANTS_ENTRY);
const CARDS: LorcanaCard[] = [RELEASED_CARD, MEI, MING];
const FILE: LorcanaJSONCard[] = [PREVIEW_ENTRY, VARIANTS_ENTRY, BRANCH_ONLY_ENTRY];

const NUMBER_59 = 'Versions of Yen Sid - Powerful Sorcerer #59';
const NUMBER_223 = 'Versions of Yen Sid - Powerful Sorcerer #223';
const LINE_59 = 'Yen Sid - Powerful Sorcerer #59: Both → Foil only';
const LINE_223 = 'Yen Sid - Powerful Sorcerer #223: Foil only → Both';

/** previewCards.json, as GitHub's raw contents answer it. */
const previewFile: Answer = () => new Response(previewFileText(FILE));

/** Where a request goes: to the page's own fetch, to the branch's data files as the panel reads them, or to the repo's git data. */
function routeOf(call: Parameters<typeof fetch>): 'page' | 'branch' | 'git' {
  const [url] = call;
  if (typeof url !== 'string' || !url.startsWith(`${REPO_API}/`)) return 'page';
  if (!url.startsWith(CONTENTS)) return 'git';
  const {path, ref} = askedOf(call);
  if (path.endsWith('previewCards.json')) return 'page';
  // A publish reads the files at the commit it builds on; the panel reads them on the branch.
  return ref === BASE ? 'git' : 'branch';
}

/**
 * The page's fetch, and the app's repo besides. The panel reads the data files as `branch` holds
 * them; a publish reads them as `base` holds them, at the commit it builds on, which is how a test
 * has the branch move after the panel read it. The repo answers the publish's git calls.
 */
function stubStudioRepo({branch, base = branch}: {branch: Record<string, Served>; base?: Record<string, Served>}): RepoStub {
  stubFetch(previewFile, chunksOf({'4': SET_4_ENTRIES}));
  const page = globalThis.fetch;
  const repo = stubRepo({files: base});
  const git = globalThis.fetch;
  const onBranch = contentsAnswer(branch);
  const routes = {page, branch: onBranch, git};
  vi.stubGlobal('fetch', vi.fn((...call: Parameters<typeof fetch>) => routes[routeOf(call)](...call)));
  return repo;
}

const versionsTray = () => screen.queryByRole('region', {name: 'Version changes'});

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

describe('StudioPage: the Version changes tray (#68)', () => {
  it('appears once a version is staged, under the panes, and stays as an empty tray with focus on its heading when the last change is reverted', async () => {
    stubStudioRepo({branch: YEN_SID_FILES});
    const {user} = renderStudio({path: studioHref('edit', YEN_SID.id)});
    const group = await screen.findByRole('group', {name: NUMBER_59});
    expect(versionsTray()).not.toBeInTheDocument();

    await user.click(within(group).getByRole('button', {name: 'Foil only'}));
    const tray = await screen.findByRole('region', {name: 'Version changes'});
    expect(within(tray).getByRole('heading', {level: 2, name: 'Version changes · 1'})).toBeInTheDocument();
    expect(within(tray).getByText(LINE_59)).toBeInTheDocument();
    expect(within(tray).getByText('Removes Normal. Copies counted in it will show under Foil.')).toBeInTheDocument();
    // Under the panes: in the root they sit in, and after the printings in the tab order.
    const printings = screen.getByRole('region', {name: 'Printings'});
    expect(printings.compareDocumentPosition(tray) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(tray.parentElement).toContainElement(printings);

    await user.click(within(tray).getByRole('button', {name: 'Revert Yen Sid - Powerful Sorcerer #59'}));
    // The store's revert clears the outcome too, so nothing but the press keeps the tray up: it is the same
    // element, and the heading that took the focus is still in the document.
    expect(screen.getByRole('region', {name: 'Version changes'})).toBe(tray);
    expect(within(tray).getByRole('heading', {level: 2, name: 'Version changes · 0'})).toHaveFocus();
    expect(within(tray).getByText('No version changes')).toBeInTheDocument();
    expect(within(group).getByRole('button', {name: 'Both'})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
  });

  it('stays as an empty tray with focus on its heading after Discard all', async () => {
    stubStudioRepo({branch: YEN_SID_FILES});
    const {user} = renderStudio({path: studioHref('edit', YEN_SID.id)});
    await user.click(within(await screen.findByRole('group', {name: NUMBER_59})).getByRole('button', {name: 'Foil only'}));
    await user.click(within(screen.getByRole('group', {name: NUMBER_223})).getByRole('button', {name: 'Both'}));
    const tray = await screen.findByRole('region', {name: 'Version changes'});
    expect(within(tray).getByRole('heading', {level: 2, name: 'Version changes · 2'})).toBeInTheDocument();

    await user.click(within(tray).getByRole('button', {name: 'Discard all'}));
    expect(screen.getByRole('region', {name: 'Version changes'})).toBe(tray);
    expect(within(tray).getByRole('heading', {level: 2, name: 'Version changes · 0'})).toHaveFocus();
    expect(within(tray).getByText('No version changes')).toBeInTheDocument();
    expect(within(tray).queryByRole('button', {name: 'Discard all'})).not.toBeInTheDocument();
    expect(within(tray).getByRole('button', {name: 'Publish to master'})).toHaveAttribute('aria-disabled', 'true');
  });

  it('goes when another tab empties the batch, as no button of its own was pressed here', async () => {
    stubStudioRepo({branch: YEN_SID_FILES});
    const {user} = renderStudio({path: studioHref('edit', YEN_SID.id)});
    await user.click(within(await screen.findByRole('group', {name: NUMBER_59})).getByRole('button', {name: 'Foil only'}));
    await screen.findByRole('region', {name: 'Version changes'});

    // The other tab discards the batch and saves it empty; the browser tells this tab with a storage event.
    const key = `${VERSION_BATCH_KEY_PREFIX}master`;
    localStorage.setItem(key, JSON.stringify({v: 1, changes: []}));
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {key}));
    });
    expect(versionsTray()).not.toBeInTheDocument();
  });

  it('stays when the owner switches to New reveal, under that pane too: the batch is the studio’s, not the card’s', async () => {
    stubStudioRepo({branch: YEN_SID_FILES});
    const {user} = renderStudio({path: studioHref('edit', YEN_SID.id)});
    await user.click(within(await screen.findByRole('group', {name: NUMBER_223})).getByRole('button', {name: 'Both'}));
    await screen.findByRole('region', {name: 'Version changes'});

    await user.click(within(screen.getByRole('group', {name: 'Studio mode'})).getByRole('button', {name: 'New reveal'}));
    const tray = screen.getByRole('region', {name: 'Version changes'});
    expect(within(tray).getByText(LINE_223)).toBeInTheDocument();
    const publish = screen.getByRole('complementary', {name: 'Publish'});
    expect(publish.compareDocumentPosition(tray) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(tray.parentElement).toContainElement(publish);
  });

  it('asks nothing when the owner leaves the page with changes staged: the batch lives in the browser', async () => {
    stubStudioRepo({branch: YEN_SID_FILES});
    const {user, router} = renderStudio({path: studioHref('edit', YEN_SID.id)});
    const batch = renderHook(() => useVersionBatch());
    await user.click(within(await screen.findByRole('group', {name: NUMBER_59})).getByRole('button', {name: 'Foil only'}));
    expect(batch.result.current.changes).toHaveLength(1);

    await act(() => router.navigate('/'));
    expect(await screen.findByRole('heading', {name: 'Overview'})).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(batch.result.current.changes).toHaveLength(1);
  });

  it('publishes the batch in one commit with the saved token, and says so', async () => {
    const repo = stubStudioRepo({branch: YEN_SID_FILES});
    const {user} = renderStudio({path: studioHref('edit', YEN_SID.id)});
    await user.click(within(await screen.findByRole('group', {name: NUMBER_223})).getByRole('button', {name: 'Both'}));
    const tray = await screen.findByRole('region', {name: 'Version changes'});

    const publish = within(tray).getByRole('button', {name: 'Publish 1 change to master'});
    await user.click(publish);
    const status = within(tray).getByRole('status');
    await within(tray).findByText('Published 1 change.');
    expect(within(status).getByRole('link', {name: 'View commit'})).toHaveAttribute('href', COMMIT_URL);
    expect(status).toHaveTextContent('They show in the binder once the app has deployed: on staging only, for now.');
    expect(repo.writes()).toEqual(['POST git/blobs', 'POST git/trees', 'POST git/commits', 'PATCH git/refs/heads/master']);
    expect(repo.commitMessage()).toBe(versionCommitMessage(1));
    // Every call the publish made carried the token the page holds.
    expect(repo.reads().map(({token}) => token)).toEqual(['tok']);
    expect(repo.fetch.mock.calls.every(([, init]) => (init?.headers as Record<string, string>).Authorization === 'Bearer tok')).toBe(true);

    // The batch is empty, and nothing is left to publish. The button stays mounted, so the focus on it survives the landing.
    expect(within(tray).getByRole('heading', {level: 2, name: 'Version changes · 0'})).toBeInTheDocument();
    expect(within(tray).getByText('No version changes')).toBeInTheDocument();
    expect(within(tray).getByRole('button', {name: 'Publish to master'})).toBe(publish);
    expect(publish).toHaveAttribute('aria-disabled', 'true');
    expect(publish).toHaveFocus();
  });

  it('holds Publish for a clash, counts the changes marked, and says nothing of one once the owner keeps the last', async () => {
    // The branch moved after the panel read it: at the commit the publish builds on, #223 is Normal only.
    const repo = stubStudioRepo({
      branch: YEN_SID_FILES,
      base: {...YEN_SID_FILES, [CHUNK_4]: collectionText(withFinishes(SET_4_ENTRIES, {946: ['normal']}))},
    });
    const {user} = renderStudio({path: studioHref('edit', YEN_SID.id)});
    await user.click(within(await screen.findByRole('group', {name: NUMBER_223})).getByRole('button', {name: 'Both'}));
    const tray = await screen.findByRole('region', {name: 'Version changes'});

    await user.click(within(tray).getByRole('button', {name: 'Publish 1 change to master'}));
    expect(await within(tray).findByRole('alert')).toHaveTextContent(clashMessage(1));
    expect(within(tray).getByText('Changed on master since: now Normal only.')).toBeInTheDocument();
    expect(within(tray).getByRole('button', {name: 'Publish 1 change to master'})).toHaveAttribute('aria-disabled', 'true');
    expect(repo.writes()).toEqual([]);
    // The panel marks the printing too, once it has read the branch again.
    expect(await screen.findByText('Clash')).toBeInTheDocument();

    await user.click(within(tray).getByRole('button', {name: 'Keep mine for Yen Sid - Powerful Sorcerer #223'}));
    // The change stays, built on what the branch has now, and no word of a clash is left on screen.
    expect(within(tray).getByText('Yen Sid - Powerful Sorcerer #223: Normal only → Both')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/clash/i);
    expect(within(tray).getByRole('button', {name: 'Publish 1 change to master'})).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('stays as an empty tray with focus on its heading when the owner drops the last clash, and says nothing of one', async () => {
    stubStudioRepo({
      branch: YEN_SID_FILES,
      base: {...YEN_SID_FILES, [CHUNK_4]: collectionText(withFinishes(SET_4_ENTRIES, {946: ['normal']}))},
    });
    const {user} = renderStudio({path: studioHref('edit', YEN_SID.id)});
    await user.click(within(await screen.findByRole('group', {name: NUMBER_223})).getByRole('button', {name: 'Both'}));
    const tray = await screen.findByRole('region', {name: 'Version changes'});
    await user.click(within(tray).getByRole('button', {name: 'Publish 1 change to master'}));
    await within(tray).findByRole('alert');

    await user.click(within(tray).getByRole('button', {name: 'Drop Yen Sid - Powerful Sorcerer #223'}));
    expect(screen.getByRole('region', {name: 'Version changes'})).toBe(tray);
    expect(within(tray).getByRole('heading', {level: 2, name: 'Version changes · 0'})).toHaveFocus();
    expect(within(tray).getByText('No version changes')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/clash/i);
  });

  it('still says a clash after a reload: the marks are saved with the batch, so the line is not lost with the page', async () => {
    stubStudioRepo({branch: YEN_SID_FILES});
    localStorage.setItem(
      `${VERSION_BATCH_KEY_PREFIX}master`,
      JSON.stringify({v: 1, changes: [NUMBER_223_TO_BOTH_CLASHED, NUMBER_59_TO_FOIL]}),
    );
    renderStudio({path: studioHref('new')});

    const tray = await screen.findByRole('region', {name: 'Version changes'});
    expect(within(tray).getByRole('alert')).toHaveTextContent(clashMessage(1));
    expect(within(tray).getByText('Changed on master since: now Normal only.')).toBeInTheDocument();
    expect(within(tray).getByRole('button', {name: 'Publish 2 changes to master'})).toHaveAttribute('aria-disabled', 'true');
  });

  it('forgets a rejected token without touching the batch, which is there when a new token opens the studio', async () => {
    const repo = stubStudioRepo({branch: YEN_SID_FILES});
    repo.fetch.mockImplementationOnce(async () => new Response('Bad credentials', {status: 401}));
    const {user} = renderStudio({path: studioHref('edit', YEN_SID.id)});
    const batch = renderHook(() => useVersionBatch());
    await user.click(within(await screen.findByRole('group', {name: NUMBER_223})).getByRole('button', {name: 'Both'}));
    const tray = await screen.findByRole('region', {name: 'Version changes'});

    await user.click(within(tray).getByRole('button', {name: 'Publish 1 change to master'}));
    expect(await within(tray).findByRole('alert')).toHaveTextContent(
      'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: Bad credentials',
    );
    await user.click(within(tray).getByRole('button', {name: 'Forget token'}));

    // The gate replaces the studio. The token is gone, the batch is not.
    expect(await screen.findByRole('heading', {level: 2, name: 'GitHub token'})).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(batch.result.current.changes).toEqual([expect.objectContaining({id: NUMBER_223_TO_BOTH.id})]);
    expect(localStorage.getItem(`${VERSION_BATCH_KEY_PREFIX}master`)).not.toBeNull();

    await user.type(screen.getByLabelText('GitHub token'), 'tok-new');
    await user.click(screen.getByRole('button', {name: 'Save token'}));
    const again = await screen.findByRole('region', {name: 'Version changes'});
    expect(within(again).getByRole('heading', {level: 2, name: 'Version changes · 1'})).toBeInTheDocument();
    expect(within(again).getByText(LINE_223)).toBeInTheDocument();
    expect(batch.result.current.changes).toEqual([expect.objectContaining({id: NUMBER_223_TO_BOTH.id})]);
    // The 401 was the old token's: the new one sees no failure, and no offer to forget what it has just saved.
    expect(within(again).queryByRole('alert')).not.toBeInTheDocument();
    expect(within(again).queryByText(/GitHub rejected the saved token/)).not.toBeInTheDocument();
    expect(within(again).queryByRole('button', {name: 'Forget token'})).not.toBeInTheDocument();
    expect(within(again).getByRole('button', {name: 'Publish 1 change to master'})).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('opens over a saved batch that holds a malformed entry, with the good one in the tray', async () => {
    stubStudioRepo({branch: YEN_SID_FILES});
    // #59's entry lacks `shownFrom`, which the tray's line reads: JSON leaves out a key that is undefined.
    const malformed = {...NUMBER_59_TO_FOIL, shownFrom: undefined};
    localStorage.setItem(`${VERSION_BATCH_KEY_PREFIX}master`, JSON.stringify({v: 1, changes: [malformed, NUMBER_223_TO_BOTH]}));
    renderStudio({path: studioHref('new')});

    const tray = await screen.findByRole('region', {name: 'Version changes'});
    expect(within(tray).getByRole('heading', {level: 2, name: 'Version changes · 1'})).toBeInTheDocument();
    expect(within(tray).getByText(LINE_223)).toBeInTheDocument();
    expect(within(tray).queryByText(/#59/)).not.toBeInTheDocument();
  });
});
