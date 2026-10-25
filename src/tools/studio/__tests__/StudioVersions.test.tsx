import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, screen, waitFor, within} from '@testing-library/react';
import type {UserEvent} from '@testing-library/user-event';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {studioHref} from '../../../shell/nav';
import {deferredResponse, type Served} from '../finishes/__tests__/branchHarness';
import {
  DALMATIANS,
  DALMATIAN_ENTRIES,
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
import {COMMIT_URL, moved, notAFastForward} from '../finishes/__tests__/repoHarness';
import {CATALOG_PATH, PROMOS_PATH, setChunkPath} from '../finishes/finishFiles';
import {clashMessage, versionCommitMessage} from '../finishes/publishVersions';
import {VERSION_BATCH_KEY_PREFIX, useVersionBatch} from '../finishes/versionBatchStore';
import {PREVIEW_ENTRY, RELEASED_CARD, VARIANTS_ENTRY, cardOf} from '../studioFixtures';
import {STUDIO_WIDE_MIN} from '../studioLayout';
import {TOKEN_KEY, chooseRevealSet, renderStudio, setCardList, watchAdditions} from './studioHarness';
import {stubStudioRepo} from './studioRepo';
import {measured} from './studioStores';

// The card list and the measured width come from the harness's stores (studioStores.ts); the rest of the bridge is real.
vi.mock('../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import('./studioStores')).STORE_HOOKS,
}));

/*
 * The Version changes tray as the page runs it (#68): over the real batch, with the page's own
 * fetch and the app's repo besides (stubStudioRepo), which the Printings panel reads and a publish
 * commits to. The tray on its own, with its view as a prop, is VersionsTray.test.tsx.
 */

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

const NUMBER_59 = 'Versions of Yen Sid - Powerful Sorcerer #59 · Set 4';
const NUMBER_223 = 'Versions of Yen Sid - Powerful Sorcerer #223 · Set 4';
const LINE_59 = 'Yen Sid - Powerful Sorcerer #59 · Set 4: Both → Foil only';
const LINE_223 = 'Yen Sid - Powerful Sorcerer #223 · Set 4: Foil only → Both';
/** The tray's warning while this browser's storage refuses the batch. */
const UNSAVED = "This browser couldn't save these changes. Publish them before you reload or close the tab.";

const versionsTray = () => screen.queryByRole('region', {name: 'Version changes'});
/**
 * The page's body, PageLayout's flush scroller under its header. The studio's root, the grid that holds
 * the panes, is its child, and the tray stays a child of the root: its foot sticks across the root (#74).
 */
const pageBody = () => screen.getByRole('main').lastElementChild;

/** The tray as the studio lays it out: a row of its own after `pane`, in the studio's root, the page body's child. */
function expectTrayAfter(pane: HTMLElement, tray: HTMLElement) {
  expect(pane.compareDocumentPosition(tray) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(tray.parentElement).toContainElement(pane);
  expect(tray.parentElement?.parentElement).toBe(pageBody());
}

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
    // Under the panes: a child of the studio's root, which holds them, and after the printings in the tab order.
    const printings = screen.getByRole('region', {name: 'Printings'});
    expect(printings.compareDocumentPosition(tray) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(tray.parentElement).toContainElement(printings);
    expect(tray.parentElement?.parentElement).toBe(pageBody());

    await user.click(within(tray).getByRole('button', {name: 'Revert Yen Sid - Powerful Sorcerer #59 · Set 4'}));
    // The store's revert clears the outcome too, so nothing but the press keeps the tray up: it is the same
    // element, and the heading that took the focus is still in the document.
    expect(screen.getByRole('region', {name: 'Version changes'})).toBe(tray);
    expect(within(tray).getByRole('heading', {level: 2, name: 'Version changes · 0'})).toHaveFocus();
    expect(within(tray).getByText('No version changes')).toBeInTheDocument();
    expect(within(group).getByRole('button', {name: 'Both'})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('pending')).not.toBeInTheDocument();
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

  it('stays when the owner switches to New card, under both its steps too: the batch is the studio’s, not the card’s', async () => {
    stubStudioRepo({branch: YEN_SID_FILES});
    const {user} = renderStudio({path: studioHref('edit', YEN_SID.id)});
    await user.click(within(await screen.findByRole('group', {name: NUMBER_223})).getByRole('button', {name: 'Both'}));
    await screen.findByRole('region', {name: 'Version changes'});

    await user.click(within(screen.getByRole('group', {name: 'Studio mode'})).getByRole('button', {name: 'New card'}));
    const tray = screen.getByRole('region', {name: 'Version changes'});
    expect(within(tray).getByText(LINE_223)).toBeInTheDocument();
    expectTrayAfter(screen.getByRole('region', {name: 'Which set is the card in?'}), tray);

    await chooseRevealSet(user);
    expect(within(tray).getByText(LINE_223)).toBeInTheDocument();
    expectTrayAfter(screen.getByRole('complementary', {name: 'Publish'}), tray);
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
    // The foot stays pinned while the focus is in it, so the line that says it landed stays in view (#86).
    expect(publish.parentElement).toHaveStyle({position: 'sticky'});
    await user.tab();
    await user.tab();
    expect(publish.parentElement?.style.position).toBe('');
  });

  it('leaves the focus on Publish when the branch moves under the publish: the failure comes in above the same button', async () => {
    stubStudioRepo({branch: YEN_SID_FILES, update: notAFastForward});
    const {user} = renderStudio({path: studioHref('edit', YEN_SID.id)});
    await user.click(within(await screen.findByRole('group', {name: NUMBER_223})).getByRole('button', {name: 'Both'}));
    const tray = await screen.findByRole('region', {name: 'Version changes'});

    const publish = within(tray).getByRole('button', {name: 'Publish 1 change to master'});
    await user.click(publish);
    expect(await within(tray).findByRole('alert')).toHaveTextContent(
      'master changed while publishing, so nothing was published. Publish again.',
    );
    // The change stays for another try, and the button pressed is still the one in the tray, with the focus.
    expect(within(tray).getByRole('button', {name: 'Publish 1 change to master'})).toBe(publish);
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

    const publish = within(tray).getByRole('button', {name: 'Publish 1 change to master'});
    await user.click(publish);
    expect(await within(tray).findByRole('alert')).toHaveTextContent(clashMessage(1));
    // The clash comes in above the button pressed, which keeps the focus while it holds.
    expect(publish).toHaveFocus();
    expect(within(tray).getByText('Changed on master since: now Normal only.')).toBeInTheDocument();
    expect(within(tray).getByRole('button', {name: 'Publish 1 change to master'})).toHaveAttribute('aria-disabled', 'true');
    expect(repo.writes()).toEqual([]);
    // The panel marks the printing too, once it has read the branch again.
    expect(await screen.findByText('clash')).toBeInTheDocument();

    await user.click(within(tray).getByRole('button', {name: 'Keep mine for Yen Sid - Powerful Sorcerer #223 · Set 4'}));
    // The change stays, built on what the branch has now, and no word of a clash is left on screen.
    expect(within(tray).getByText('Yen Sid - Powerful Sorcerer #223 · Set 4: Normal only → Both')).toBeInTheDocument();
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

    await user.click(within(tray).getByRole('button', {name: 'Drop Yen Sid - Powerful Sorcerer #223 · Set 4'}));
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

  it('warns that this browser could not save the batch, and stops once a save works', async () => {
    stubStudioRepo({branch: YEN_SID_FILES});
    const save = vi.spyOn(Storage.prototype, 'setItem');
    const refuse = () => {
      throw new DOMException('Storage refused', 'QuotaExceededError');
    };
    const {user} = renderStudio({path: studioHref('edit', YEN_SID.id)});
    const group = await screen.findByRole('group', {name: NUMBER_223});
    // Only the batch's own key fails: the token is saved already.
    save.mockImplementation(refuse);

    await user.click(within(group).getByRole('button', {name: 'Both'}));
    const tray = await screen.findByRole('region', {name: 'Version changes'});
    expect(within(tray).getByRole('alert')).toHaveTextContent(UNSAVED);

    save.mockRestore();
    await user.click(within(screen.getByRole('group', {name: NUMBER_59})).getByRole('button', {name: 'Foil only'}));
    expect(within(tray).queryByText(UNSAVED)).not.toBeInTheDocument();
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

/*
 * Set 3's five Dalmatian Puppy - Tail Wagger cards are all #4, and share their name, version, ink and
 * rarity (#74). The tray can hold a change for each, so their labels end in their ids: in the panel's
 * groups, in the tray's lines, and in the names of the buttons that act on them.
 */
describe('StudioPage: twin cards in the panel and the tray (#74)', () => {
  const [PUPPY_436, PUPPY_437] = DALMATIANS;
  const CHUNK_3 = setChunkPath('3');
  const LABEL_436 = 'Dalmatian Puppy - Tail Wagger #4 · Set 3 · id 436';
  const LABEL_437 = 'Dalmatian Puppy - Tail Wagger #4 · Set 3 · id 437';

  /** The files the twins read: Set 3's chunk, which holds both, and an empty promos.json and catalog. */
  const PUPPY_FILES: Record<string, Served> = {
    [CHUNK_3]: collectionText(DALMATIAN_ENTRIES),
    [PROMOS_PATH]: collectionText([]),
    [CATALOG_PATH]: EMPTY_CATALOG_TEXT,
  };

  /** Stages `choice` for the printing `label` names, from its group in the open card's panel. */
  async function stage({user, label, choice}: {user: UserEvent; label: string; choice: string}) {
    await user.click(within(await screen.findByRole('group', {name: `Versions of ${label}`})).getByRole('button', {name: choice}));
  }

  it('names each twin by its id: its versions, its line in the tray and its Revert', async () => {
    stubStudioRepo({branch: PUPPY_FILES, chunks: {'3': DALMATIAN_ENTRIES}});
    const {user, router} = renderStudio({path: studioHref('edit', PUPPY_436.id)});
    await stage({user, label: LABEL_436, choice: 'Foil only'});
    await act(() => router.navigate(studioHref('edit', PUPPY_437.id)));
    await stage({user, label: LABEL_437, choice: 'Normal only'});

    const tray = screen.getByRole('region', {name: 'Version changes'});
    expect(within(tray).getByText(`${LABEL_436}: Both → Foil only`)).toBeInTheDocument();
    expect(within(tray).getByText(`${LABEL_437}: Both → Normal only`)).toBeInTheDocument();
    await user.click(within(tray).getByRole('button', {name: `Revert ${LABEL_436}`}));
    expect(within(tray).queryByText(`${LABEL_436}: Both → Foil only`)).not.toBeInTheDocument();
    expect(within(tray).getByRole('button', {name: `Revert ${LABEL_437}`})).toHaveFocus();
  });

  it("shows the open twin's id after its number on its banner, as its search row does", async () => {
    stubStudioRepo({branch: PUPPY_FILES, chunks: {'3': DALMATIAN_ENTRIES}});
    renderStudio({path: studioHref('edit', PUPPY_437.id)});
    const heading = await screen.findByRole('heading', {level: 2, name: /^Editing Dalmatian Puppy/});
    const banner = within(heading.parentElement as HTMLElement);
    expect(banner.getByText('Set 3 · #4')).toBeInTheDocument();
    expect(banner.getByText(PUPPY_437.id).parentElement).toHaveTextContent(`ID ${PUPPY_437.id}`);
  });

  it("names a clashed twin's Keep mine and Drop by its id", async () => {
    stubStudioRepo({
      branch: PUPPY_FILES,
      base: {...PUPPY_FILES, [CHUNK_3]: collectionText(withFinishes(DALMATIAN_ENTRIES, {436: ['normal']}))},
      chunks: {'3': DALMATIAN_ENTRIES},
    });
    const {user} = renderStudio({path: studioHref('edit', PUPPY_436.id)});
    await stage({user, label: LABEL_436, choice: 'Foil only'});
    const tray = await screen.findByRole('region', {name: 'Version changes'});
    await user.click(within(tray).getByRole('button', {name: 'Publish 1 change to master'}));
    await within(tray).findByRole('alert');

    expect(within(tray).getByRole('button', {name: `Keep mine for ${LABEL_436}`})).toBeInTheDocument();
    expect(within(tray).getByRole('button', {name: `Drop ${LABEL_436}`})).toBeInTheDocument();
  });
});

/*
 * The Printings panel while a publish runs, and after it (#68): over the real batch, so the panel
 * holds its choices from the store's own `publishing`, and keeps its rows from the hook's own read
 * of the branch after the store drops the files.
 */
describe('StudioPage: the Printings panel during a publish and after it (#68)', () => {
  /** Yen Sid's #223 once the publish made it Both. */
  const PUBLISHED_CHUNK = collectionText(withFinishes(SET_4_ENTRIES, {946: ['normal', 'foil']}));

  /**
   * Yen Sid's files, where the branch answers Set 4's chunk at once the first time and, from the
   * second (the read after a publish), when the test says so. The publish reads them at its base,
   * which the test gives as YEN_SID_FILES, so that read counts for nothing here.
   */
  function rereadHeld() {
    const reread = deferredResponse();
    let asked = 0;
    const files: Record<string, Served> = {
      ...YEN_SID_FILES,
      [CHUNK_4]: () => (asked++ === 0 ? new Response(SET_4_TEXT) : reread.response),
    };
    return {files, respond: reread.respond};
  }

  /** A ref update that waits until the test moves the branch. */
  function heldUpdate() {
    const late = deferredResponse();
    return {update: () => late.response, moveBranch: () => late.respond(moved())};
  }

  const panel = () => screen.getByRole('region', {name: 'Printings'});
  const choicesIn = (region: HTMLElement) => within(within(region).getByRole('list')).getAllByRole('button');

  /** Stages #223's change from the panel and starts its publish from the tray. */
  async function publish223(user: UserEvent) {
    await user.click(within(await screen.findByRole('group', {name: NUMBER_223})).getByRole('button', {name: 'Both'}));
    const tray = await screen.findByRole('region', {name: 'Version changes'});
    await user.click(within(tray).getByRole('button', {name: 'Publish 1 change to master'}));
    return tray;
  }

  it('holds every choice while a publish runs: a click stages nothing, and the choice keeps the focus', async () => {
    const held = heldUpdate();
    stubStudioRepo({branch: YEN_SID_FILES, update: held.update});
    const {user} = renderStudio({path: studioHref('edit', YEN_SID.id)});
    const batch = renderHook(() => useVersionBatch());
    const tray = await publish223(user);
    expect(within(tray).getByRole('button', {name: 'Publishing 1 change…'})).toBeInTheDocument();

    for (const choice of choicesIn(panel())) expect(choice).toHaveAttribute('aria-disabled', 'true');
    const foil59 = within(screen.getByRole('group', {name: NUMBER_59})).getByRole('button', {name: 'Foil only'});
    await user.click(foil59);
    expect(batch.result.current.changes).toEqual([NUMBER_223_TO_BOTH]);
    expect(within(tray).getByRole('heading', {level: 2, name: 'Version changes · 1'})).toBeInTheDocument();
    expect(foil59).toHaveAttribute('aria-pressed', 'false');
    expect(foil59).toHaveFocus();

    await act(async () => held.moveBranch());
    await within(tray).findByText('Published 1 change.');
    // Once the files are read again, the choices are live.
    await waitFor(() => expect(foil59).not.toHaveAttribute('aria-disabled'));
  });

  it('keeps its rows, and the focus on a choice, through the landing and the read after it: no loading frame', async () => {
    const held = heldUpdate();
    const reread = rereadHeld();
    stubStudioRepo({branch: reread.files, base: YEN_SID_FILES, update: held.update});
    const added = watchAdditions();
    const {user} = renderStudio({path: studioHref('edit', YEN_SID.id)});
    const tray = await publish223(user);
    const list = within(panel()).getByRole('list');
    const both59 = within(screen.getByRole('group', {name: NUMBER_59})).getByRole('button', {name: 'Both'});
    act(() => both59.focus());
    added.clear();

    await act(async () => held.moveBranch());
    await within(tray).findByText('Published 1 change.');
    // Landed: the files are read again, and the rows the panel had stay, held, the list busy.
    expect(within(panel()).getByRole('list')).toBe(list);
    expect(list).toHaveAttribute('aria-busy', 'true');
    for (const choice of choicesIn(panel())) expect(choice).toHaveAttribute('aria-disabled', 'true');
    expect(both59).toHaveFocus();

    await act(async () => reread.respond(new Response(PUBLISHED_CHUNK)));
    // Read: the rows show what the branch holds now, live, in the same list, with the same focus.
    await waitFor(() => expect(list).not.toHaveAttribute('aria-busy'));
    expect(within(panel()).getByRole('list')).toBe(list);
    for (const choice of choicesIn(panel())) expect(choice).not.toHaveAttribute('aria-disabled');
    const both223 = within(screen.getByRole('group', {name: NUMBER_223})).getByRole('button', {name: 'Both'});
    expect(both223).toHaveAttribute('aria-pressed', 'true');
    expect(both59).toHaveFocus();
    expect(added.texts()).not.toContainEqual(expect.stringContaining('Loading the printings…'));
    added.stop();
  });

  it('shows on its row what the publish wrote, from the landing until the read after it lands (#74)', async () => {
    const reread = rereadHeld();
    stubStudioRepo({branch: reread.files, base: YEN_SID_FILES});
    const {user} = renderStudio({path: studioHref('edit', YEN_SID.id)});
    const tray = await publish223(user);
    await within(tray).findByText('Published 1 change.');
    // Landed: the batch no longer holds the change, and the rows are the last read's, which name #223 Foil only.
    const row223 = within(panel()).getByText('#223 · Alt foil').closest('li') as HTMLElement;
    const both223 = within(screen.getByRole('group', {name: NUMBER_223})).getByRole('button', {name: 'Both'});
    expect(within(panel()).getByRole('list')).toHaveAttribute('aria-busy', 'true');
    expect(both223).toHaveAttribute('aria-pressed', 'true');
    expect(within(row223).getByText('in the data')).toBeInTheDocument();
    expect(within(panel()).queryByText('pending')).not.toBeInTheDocument();

    await act(async () => reread.respond(new Response(PUBLISHED_CHUNK)));
    // Read: the branch names Both for #223, so the row is unchanged.
    await waitFor(() => expect(within(panel()).getByRole('list')).not.toHaveAttribute('aria-busy'));
    expect(both223).toHaveAttribute('aria-pressed', 'true');
    expect(within(row223).getByText('in the data')).toBeInTheDocument();
  });

  it('hands the focus on a choice to "Read the files again" when the read after a publish fails (R-48)', async () => {
    const reread = rereadHeld();
    stubStudioRepo({branch: reread.files, base: YEN_SID_FILES});
    const {user} = renderStudio({path: studioHref('edit', YEN_SID.id)});
    const tray = await publish223(user);
    await within(tray).findByText('Published 1 change.');
    expect(within(panel()).getByRole('list')).toHaveAttribute('aria-busy', 'true');
    act(() => within(screen.getByRole('group', {name: NUMBER_59})).getByRole('button', {name: 'Both'}).focus());

    await act(async () => reread.respond(new Response('Bad Gateway', {status: 502})));
    const failure = `Could not read the printings: GitHub 502 on ${CHUNK_4}: Bad Gateway.`;
    expect(within(panel()).getByRole('alert')).toHaveTextContent(failure);
    await waitFor(() => expect(within(panel()).getByRole('button', {name: 'Read the files again'})).toHaveFocus());
  });

  it('keeps what the publish came to, and its commit, in the tray when the read after it fails: the commit landed', async () => {
    const reread = rereadHeld();
    stubStudioRepo({branch: reread.files, base: YEN_SID_FILES});
    const {user} = renderStudio({path: studioHref('edit', YEN_SID.id)});
    const tray = await publish223(user);
    await within(tray).findByText('Published 1 change.');

    await act(async () => reread.respond(new Response('Bad Gateway', {status: 502})));
    expect(within(panel()).getByRole('button', {name: 'Read the files again'})).toBeInTheDocument();
    expect(within(tray).getByText('Published 1 change.')).toBeInTheDocument();
    expect(within(tray).getByRole('link', {name: 'View commit'})).toHaveAttribute('href', COMMIT_URL);
  });
});

/** A box from `top` to `bottom` in the view, all that getBoundingClientRect's callers here read. */
const box = (top: number, bottom: number) => ({top, bottom}) as DOMRect;

/**
 * The page's scroller, PageLayout's flush body, as TuningAside.test.tsx's renderInScroller stubs the
 * aside's: jsdom lays nothing out, so `pin` fixes a box in the view, and `place` puts a control there,
 * which the scroller's scrollBy moves as a real scroll would (scrolling down by 100 lifts it by 100).
 */
function pageScroller() {
  const scroller = pageBody() as HTMLElement;
  let scrolled = 0;
  const scrollBy = vi.fn((options: ScrollToOptions) => {
    scrolled += options.top ?? 0;
  });
  Object.defineProperty(scroller, 'scrollBy', {value: scrollBy});
  return {
    scroller,
    scrollBy,
    pin: (el: Element, top: number, bottom: number) => vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(box(top, bottom)),
    place: (el: Element, top: number, bottom: number) =>
      vi.spyOn(el, 'getBoundingClientRect').mockImplementation(() => box(top - scrolled, bottom - scrolled)),
  };
}

/**
 * Has the browser show `control`'s focus (`:focus-visible`), as Chrome does for a focus that came by
 * keyboard. jsdom answers by a heuristic of dom-selector's that shows a Tab's focus from the body or a
 * text field but, once a focus has shown, hides a Tab's from one button to the next, as it hides a
 * press of the mouse's. So a case whose control takes keyboard focus says so with this, and a press
 * of the mouse keeps jsdom's own answer, which is Chrome's.
 */
function showsItsFocus(control: Element) {
  const matches = control.matches.bind(control);
  vi.spyOn(control, 'matches').mockImplementation((selectors: string) => selectors === ':focus-visible' || matches(selectors));
}

/*
 * While changes are staged the tray's foot is pinned to the bottom of the view (#74), and the browser
 * scrolls a control that takes focus only as far as the view's edge, under it. So the studio's root
 * keeps a control that takes keyboard focus clear of the pinned foot (WCAG 2.4.11), as the tuning aside
 * keeps its fields clear of its pinned tray. One that a press of the mouse focuses stays where it is,
 * under the pointer, so the press ends on it and clicks it. Here the scroller's view runs from 64 to
 * 900, and the foot from 830 to 900.
 */
describe('StudioPage: what takes focus, and the tray’s pinned foot (#74)', () => {
  /** Yen Sid open, with #59 staged Foil only: the tray's foot is pinned. */
  async function staged59() {
    stubStudioRepo({branch: YEN_SID_FILES});
    const {user} = renderStudio({path: studioHref('edit', YEN_SID.id)});
    await user.click(within(await screen.findByRole('group', {name: NUMBER_59})).getByRole('button', {name: 'Foil only'}));
    await screen.findByRole('button', {name: 'Publish 1 change to master'});
    return user;
  }

  /** The page's boxes, laid out from here on: its scroller's view, and the tray's foot at the bottom of it. */
  function laidOut() {
    const publish = screen.getByRole('button', {name: /^Publish/});
    const page = pageScroller();
    page.pin(page.scroller, 64, 900);
    page.pin(publish.parentElement as HTMLElement, 830, 900);
    return {...page, publish};
  }

  /** #223's Both, a control of the Printings panel, which scrolls with the page. */
  const choice223 = () => within(screen.getByRole('group', {name: NUMBER_223})).getByRole('button', {name: 'Both'});

  it('scrolls a control that takes keyboard focus under the pinned foot up into the band above it', async () => {
    await staged59();
    const {scrollBy, place} = laidOut();
    place(choice223(), 850, 882);
    showsItsFocus(choice223());

    act(() => choice223().focus());
    expect(scrollBy).toHaveBeenCalledOnce();
    // Centred between the scroller's top and the foot's.
    expect(choice223().getBoundingClientRect()).toMatchObject({top: 431, bottom: 463});
  });

  it('leaves a control that a press of the mouse focuses half under the foot where it is, under the pointer', async () => {
    const user = await staged59();
    const {scrollBy, place} = laidOut();
    place(choice223(), 810, 842);

    await user.click(choice223());
    expect(choice223()).toHaveFocus();
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it('leaves Publish where it is: the foot is pinned, so scrolling for it would move the page and never it', async () => {
    await staged59();
    const {scrollBy, pin, publish} = laidOut();
    pin(publish, 842, 886);
    showsItsFocus(publish);

    act(() => publish.focus());
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it('scrolls nothing once no change is staged: the foot then sits under the panel, pinned no more', async () => {
    const user = await staged59();
    await user.click(screen.getByRole('button', {name: 'Revert Yen Sid - Powerful Sorcerer #59 · Set 4'}));
    expect(screen.getByRole('button', {name: 'Publish to master'})).toBeInTheDocument();
    const {scrollBy, place} = laidOut();
    place(choice223(), 850, 882);
    showsItsFocus(choice223());

    act(() => choice223().focus());
    expect(scrollBy).not.toHaveBeenCalled();
  });
});
