import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen, waitFor, waitForElementToBeRemoved, within} from '@testing-library/react';
import userEvent, {type UserEvent} from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {inkBlock, type useCardDataContext} from '../../../app-bridge';
import {studioHref} from '../../../shell/nav';
import {pngFile} from '../../../test/images';
import {commitCardImage} from '../../image/githubClient';
import {StaleCardError, commitCardEdit, commitNewCard} from '../../reveal/githubClient';
import {goneNote} from '../branchCards';
import {IMAGE_ONLY_NOTES} from '../cardEdit';
import {loadAgainNote} from '../loadAgainNote';
import {StudioPage} from '../StudioPage';
import {newRevealNote} from '../studioCopy';
import {BRANCH_ONLY_ENTRY, PREVIEW_ENTRY, RELEASED_CARD, VARIANTS_ENTRY, cardOf, previewFileText} from '../studioFixtures';
import {STUDIO_WIDE_MIN} from '../studioLayout';

// previewCards.json is read for real, against the fetch stub; only the commits are faked.
vi.mock('../../reveal/githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../reveal/githubClient')>()),
  commitCardEdit: vi.fn(),
  commitNewCard: vi.fn(),
}));
vi.mock('../../image/githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../image/githubClient')>()),
  commitCardImage: vi.fn(),
}));

/** What the studio reads from the shell's card list. */
type CardList = Pick<ReturnType<typeof useCardDataContext>, 'cards' | 'isLoading' | 'error' | 'getCardById' | 'retryLoad'>;

// Two stores a test moves on, as StudioPage.test.tsx has them: the card list (R3's pattern) and the measured width.
const cardList = vi.hoisted(() => ({value: null as CardList | null, listeners: new Set<() => void>()}));
const measured = vi.hoisted(() => ({width: 0, listeners: new Set<() => void>()}));
vi.mock('../../../app-bridge', async (importOriginal) => {
  const {useSyncExternalStore} = await import('react');
  const subscribe = (listeners: Set<() => void>) => (onChange: () => void) => {
    listeners.add(onChange);
    return () => listeners.delete(onChange);
  };
  const onCards = subscribe(cardList.listeners);
  const onWidth = subscribe(measured.listeners);
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    useCardDataContext: function useCardDataContext() {
      return useSyncExternalStore(onCards, () => cardList.value);
    },
    useContainerWidth: function useContainerWidth() {
      return useSyncExternalStore(onWidth, () => measured.width);
    },
  };
});

const TOKEN_KEY = 'inkweave.reveal-admin.gh-token';
const PREVIEW_URL =
  'https://api.github.com/repos/Doberjohn/inkweave/contents/apps/web/public/data/previewCards.json?ref=master';
const COMMIT_URL = 'https://github.com/Doberjohn/inkweave/commit/abc123';
/** What a save says when GitHub rejects the token (R-26). */
const REJECTED_SAVE = 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: {"message":"Bad credentials"}';
const IMAGE_NOTE = 'The new image goes live after the convert workflow runs and Vercel redeploys (~a few minutes).';
// R4-6a's wording (studioPaths.ts): what a held card change, and a held leave, drop.
const LEAVES_CARD = "Your changes to this card aren't saved yet. Leaving the card drops them.";
const LEAVES_REVEAL = "Your New reveal card isn't published yet. Leaving Card studio drops it.";
const LEAVES_EDIT = "Your Edit card changes aren't saved yet. Leaving Card studio drops them.";
const RENAMED = 'Mei Lee';

// The card list as inkweave.ink serves it: a released card, then the deployed preview cards (loader.ts:195-198).
const MEI = cardOf(PREVIEW_ENTRY);
const MING = cardOf(VARIANTS_ENTRY);
const WREN = cardOf(BRANCH_ONLY_ENTRY);
const CARDS: LorcanaCard[] = [RELEASED_CARD, MEI, MING];
const FILE: LorcanaJSONCard[] = [PREVIEW_ENTRY, VARIANTS_ENTRY];
/** commitCardEdit's refusal for Mei's entry once it changed on the branch (R-67), naming her as the page does. */
const STALE = `${MEI.fullName} changed on master since you loaded it. Load it again.`;
/** Mei once the branch changed only her version: her full name no longer follows it, so the form can't hold her (R-65). */
const UNHELD_MEI: LorcanaJSONCard = {...PREVIEW_ENTRY, version: 'Panda Rising'};
/** Mei once a later branch commit fixed her full name to match: she round-trips again. */
const FIXED_MEI: LorcanaJSONCard = {...UNHELD_MEI, fullName: 'Mei - Panda Rising'};

type Answer = () => Response | Promise<Response>;
/** previewCards.json holding `cards`, as GitHub's raw contents answer it. */
const fileOf = (cards: LorcanaJSONCard[]) => new Response(previewFileText(cards));
/** A read GitHub refuses. */
const refusal = ({status, message}: {status: number; message: string}) =>
  new Response(JSON.stringify({message}), {status});
/** A request that never settles, so its read stays loading. */
const never = () => new Promise<Response>(() => {});

/** previewCards.json answers with `preview` (by default the two preview cards); every other request never settles. */
function stubFetch(preview: Answer = () => fileOf(FILE)) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => (url === PREVIEW_URL ? Promise.resolve(preview()) : never())),
  );
}

/** Sets the card list the page reads, and re-renders. By default it has loaded, with CARDS. */
function setCardList({cards = CARDS, isLoading = false, error = null}: Partial<CardList> = {}) {
  const getCardById = (id: string) => cards.find((c) => c.id === id);
  cardList.value = {cards, isLoading, error, getCardById, retryLoad: () => {}};
  act(() => cardList.listeners.forEach((onChange) => onChange()));
}

/** Card studio at `path` in a data router, which the guard needs, beside a page to leave to. */
function renderStudio(path: string) {
  localStorage.setItem(TOKEN_KEY, 'tok');
  const router = createMemoryRouter(
    [
      {path: '/studio', element: <StudioPage />},
      {path: '/', element: <h1>Overview</h1>},
    ],
    {initialEntries: [path]},
  );
  render(<RouterProvider router={router} />);
  return {router, user: userEvent.setup()};
}

/** The Editing banner's h2 for `card`: "Editing {name} {version}" (R4-5f). */
const banner = (card: LorcanaCard) =>
  screen.findByRole('heading', {level: 2, name: `Editing ${card.name} ${card.version}`});
const searchField = () => screen.getByRole('searchbox', {name: 'Search cards'});
const nameField = () => screen.findByRole('textbox', {name: 'Name'});
const saveButton = () => screen.getByRole('button', {name: /^Save/});
const leaveDialog = () => screen.findByRole('dialog', {name: 'Leave this page?'});
const outcomeOf = (link: HTMLElement) => link.closest<HTMLElement>('[role="status"]');

/** Opens Mei from Edit card's search, and waits for her form. */
async function openMei(user: UserEvent) {
  await user.click(await screen.findByRole('link', {name: /^Mei\b/}));
  return nameField();
}

/** Renames the open card RENAMED, and waits for Save to come on. */
async function rename(user: UserEvent) {
  const field = await nameField();
  await user.clear(field);
  await user.type(field, RENAMED);
  await waitFor(() => expect(saveButton()).toBeEnabled());
}

/** Fills a card New reveal can publish, as StudioPage.test.tsx's fillCard does: a Character in Amber's block, with its scan. */
async function fillNewCard(user: UserEvent) {
  await user.type(screen.getByRole('textbox', {name: 'Collector number'}), String(inkBlock('Amber').first));
  await user.type(await nameField(), 'Wren');
  for (const [name, value] of [['Cost', '4'], ['Strength', '3'], ['Willpower', '5'], ['Lore', '2']] as const) {
    await user.type(screen.getByRole('textbox', {name}), value);
  }
  // The card panel's file input: the only one New reveal has.
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (input) await user.upload(input, pngFile('wren.png'));
  await waitFor(() => expect(screen.getByRole('button', {name: /^Publish/})).toBeEnabled());
}

/** A draft in each mode: a name typed in New reveal, and Mei renamed in Edit card (R-57 keeps both). */
async function twoDrafts(user: UserEvent) {
  await openMei(user);
  await user.click(screen.getByRole('button', {name: 'New reveal'}));
  await user.type(await nameField(), 'Wren');
  await user.click(screen.getByRole('button', {name: 'Edit card'}));
  await rename(user);
}

/**
 * Where a browser leaves focus once the focused Save button goes off: on <body> (HTML's focus fixup rule). jsdom
 * keeps it on the disabled button, so focus another control and let that go, as StudioPage.test.tsx does.
 */
function dropFocusToBody() {
  const link = screen.getByRole('link', {name: 'Load a different card'});
  act(() => {
    link.focus();
    link.blur();
  });
}

beforeEach(() => {
  // A block, not an arrow's value: mockReset() returns the mock, and Vitest calls a function a hook returns as its teardown.
  vi.mocked(commitCardEdit).mockReset();
  vi.mocked(commitCardImage).mockReset();
  vi.mocked(commitNewCard).mockReset();
  // Wide, so every field of the form shows at once.
  measured.width = STUDIO_WIDE_MIN;
  setCardList();
  stubFetch();
});

afterEach(() => {
  // The token store reads localStorage on every snapshot, so clearing it is the whole token reset.
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('StudioPage: finding a card in Edit card', () => {
  it('opens on the search, and a row opens its card with focus on the banner and the tab named (R-59, R-51)', async () => {
    const {router, user} = renderStudio('/studio?mode=edit');
    expect(screen.getByRole('heading', {level: 2, name: 'Find a card to edit'})).toBeInTheDocument();
    await openMei(user);
    expect(router.state.location.search).toBe(`?mode=edit&card=${MEI.id}`);
    await waitFor(async () => expect(await banner(MEI)).toHaveFocus());
    expect(document.title).toBe('Mei - Red Panda · Card studio · Inkweave admin');
    // Her data is the branch file's: Preview (R4-5f's chips read lowercase).
    expect(screen.getByText('preview')).toBeInTheDocument();
    // Renumbering changes the id, which goes by PR (R-91).
    expect(screen.getByRole('textbox', {name: 'Collector number'})).toHaveAttribute('readonly');
  });

  it('goes back to the search from Load a different card, with the query kept and focus in the field (R-59)', async () => {
    const {user} = renderStudio('/studio?mode=edit');
    await user.type(searchField(), 'mei');
    await openMei(user);
    await user.click(screen.getByRole('link', {name: 'Load a different card'}));
    await waitFor(() => expect(searchField()).toHaveFocus());
    expect(searchField()).toHaveValue('mei');
  });

  it('reads loading, not missing, for a deep link while the card list loads, and leaves focus alone after', async () => {
    setCardList({cards: [], isLoading: true});
    renderStudio(studioHref('edit', MEI.id));
    expect(screen.getByText('Loading the card…')).toBeInTheDocument();
    expect(screen.queryByText(/^No card has the id/)).not.toBeInTheDocument();

    setCardList();
    expect(await banner(MEI)).toBeInTheDocument();
    // A deep link is no one's action in the page, so nothing asks for the handoff.
    expect(document.body).toHaveFocus();
  });

  it("hands focus to the search once the card list's Retry lands (R-59)", async () => {
    setCardList({cards: [], error: new Error('HTTP 503')});
    const {user} = renderStudio('/studio?mode=edit');
    await user.click(screen.getByRole('button', {name: 'Retry'}));
    // The shell's CardDataProvider reloads the list; here the store does.
    setCardList();
    await waitFor(() => expect(searchField()).toHaveFocus());
  });

  it("opens a deep link's card once the card list's Retry lands, with focus on the banner (R-59)", async () => {
    setCardList({cards: [], error: new Error('HTTP 503')});
    const {user} = renderStudio(studioHref('edit', MEI.id));
    await user.click(screen.getByRole('button', {name: 'Retry'}));
    setCardList();
    await waitFor(async () => expect(await banner(MEI)).toHaveFocus());
  });

  it('says why an unknown id is not open, above the search; reached by a link, its line takes focus (R-29, R-59)', async () => {
    const {router} = renderStudio('/studio?mode=edit');
    act(() => void router.navigate(studioHref('edit', '999999')));
    const line = await screen.findByText(/^No card has the id/);
    expect(line).toHaveTextContent('No card has the id 999999 in the card list or in previewCards.json.');
    await waitFor(() => expect(line).toHaveFocus());
    expect(searchField()).toBeInTheDocument();
  });

  it("says why a preview card the branch file dropped can't be saved, and the line takes focus (R-66, R-59)", async () => {
    // Mei is still on inkweave.ink, but previewCards.json on the branch no longer holds her.
    stubFetch(() => fileOf([VARIANTS_ENTRY]));
    const {router} = renderStudio('/studio?mode=edit');
    act(() => void router.navigate(studioHref('edit', MEI.id)));
    const line = await screen.findByText(/is no longer in previewCards\.json/);
    expect(line).toHaveTextContent(goneNote(MEI));
    await waitFor(() => expect(line).toHaveFocus());
    expect(searchField()).toBeInTheDocument();
  });

  it('waits on a failed read for a preview card, and opens it with focus on the banner once Retry lands (R-71, R-59)', async () => {
    let reads = 0;
    stubFetch(() => (++reads === 1 ? refusal({status: 500, message: 'Server Error'}) : fileOf(FILE)));
    const {user} = renderStudio(studioHref('edit', MEI.id));
    expect(await screen.findByText(/opens once previewCards\.json can be read/)).toHaveTextContent(
      `Card ${MEI.id} opens once previewCards.json can be read.`,
    );
    await user.click(screen.getByRole('button', {name: 'Read previewCards.json again'}));
    await waitFor(async () => expect(await banner(MEI)).toHaveFocus());
  });

  it('opens a released card image-only, straight from the card list, while previewCards.json still reads (R-61, R-71)', async () => {
    stubFetch(never);
    renderStudio(studioHref('edit', RELEASED_CARD.id));
    expect(await banner(RELEASED_CARD)).toBeInTheDocument();
    expect(screen.getByText('released')).toBeInTheDocument();
    expect(screen.getByText('Card data comes from LorcanaJSON; only the image can be replaced here.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', {name: 'Name'})).not.toBeInTheDocument();
    expect(screen.queryByRole('region', {name: 'Synergies'})).not.toBeInTheDocument();
    // No field can change, so the change list asks only for an image.
    const aside = screen.getByRole('complementary', {name: 'Changes'});
    expect(within(aside).getByText("Replace the image to make a change. It's listed here before you save.")).toBeInTheDocument();
    // A released card's data can't change on the branch, so it offers no read of the file.
    expect(screen.queryByRole('button', {name: 'Read previewCards.json again'})).not.toBeInTheDocument();
  });

  it('opens a card only the branch file holds, not deployed yet, with no analytics link (R-66, R-33)', async () => {
    stubFetch(() => fileOf([...FILE, BRANCH_ONLY_ENTRY]));
    renderStudio(studioHref('edit', WREN.id));
    expect(await banner(WREN)).toBeInTheDocument();
    expect(screen.getByText('not deployed yet')).toBeInTheDocument();
    expect(screen.queryByRole('link', {name: 'View card analytics'})).not.toBeInTheDocument();
  });

  it('shows a failed read beside the search, and hands focus to the field once Retry lands (R-71, R-59)', async () => {
    let reads = 0;
    stubFetch(() => (++reads === 1 ? refusal({status: 500, message: 'Server Error'}) : fileOf(FILE)));
    const {user} = renderStudio('/studio?mode=edit');
    await user.click(await screen.findByRole('button', {name: 'Read previewCards.json again'}));
    await waitFor(() => expect(searchField()).toHaveFocus());
    expect(screen.queryByText(/^Could not read previewCards\.json/)).not.toBeInTheDocument();
  });

  it('reads previewCards.json again after a later read failed, and hands focus to the field (R-71, R-59)', async () => {
    let reads = 0;
    // The first read lands; the read after the save fails; Retry's lands.
    stubFetch(() => (++reads === 2 ? refusal({status: 500, message: 'Server Error'}) : fileOf(FILE)));
    vi.mocked(commitCardEdit).mockResolvedValue({commitUrl: COMMIT_URL});
    const {user} = renderStudio('/studio?mode=edit');
    await openMei(user);
    await rename(user);
    await user.click(saveButton());
    await screen.findByRole('link', {name: 'View commit'});
    await waitFor(() => expect(reads).toBe(2));

    await user.click(screen.getByRole('link', {name: 'Load a different card'}));
    await user.click(await screen.findByRole('button', {name: 'Read previewCards.json again'}));
    await waitFor(() => expect(searchField()).toHaveFocus());
    expect(reads).toBe(3);
    expect(screen.queryByText(/^Could not read previewCards\.json/)).not.toBeInTheDocument();
  });

  it('offers Forget token for a read GitHub refuses, and forgets at once while nothing is dirty (R-26, R-84)', async () => {
    stubFetch(() => refusal({status: 401, message: 'Bad credentials'}));
    const confirm = vi.spyOn(window, 'confirm');
    const {user} = renderStudio('/studio?mode=edit');
    await user.click(await screen.findByRole('button', {name: 'Forget token'}));
    expect(confirm).not.toHaveBeenCalled();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    await waitFor(() => expect(screen.getByLabelText('GitHub token')).toHaveFocus());
  });
});

describe('StudioPage: saving in Edit card', () => {
  it("saves a field edit with New reveal's note, and keeps the card open on its new baseline (R-70)", async () => {
    vi.mocked(commitCardEdit).mockResolvedValue({commitUrl: COMMIT_URL});
    const {user} = renderStudio('/studio?mode=edit');
    await openMei(user);
    await rename(user);
    await user.click(saveButton());

    const outcome = outcomeOf(await screen.findByRole('link', {name: 'View commit'}));
    expect(outcome).toHaveTextContent(/^Committed\./);
    expect(outcome).toHaveTextContent(newRevealNote());
    expect(commitCardEdit).toHaveBeenCalledWith(expect.objectContaining({loaded: PREVIEW_ENTRY, image: null}));
    expect(await nameField()).toHaveValue(RENAMED);
    expect(saveButton()).toBeDisabled();
  });

  it("replaces a released card's image with the image note, and the outcome takes focus off <body> (R-59)", async () => {
    let land: (result: {commitUrl: string}) => void = () => {};
    vi.mocked(commitCardImage).mockReturnValue(new Promise((resolve) => (land = resolve)));
    const {user} = renderStudio(studioHref('edit', RELEASED_CARD.id));
    await user.upload(await screen.findByLabelText('Click to replace image'), pngFile('lantern.png'));
    await waitFor(() => expect(saveButton()).toBeEnabled());
    const save = saveButton();
    await user.click(save);
    expect(save).toHaveTextContent('Saving…');

    dropFocusToBody();
    await act(async () => land({commitUrl: COMMIT_URL}));
    const outcome = outcomeOf(screen.getByRole('link', {name: 'View commit'}));
    expect(outcome).toHaveTextContent(IMAGE_NOTE);
    await waitFor(() => expect(outcome).toHaveFocus());
  });

  it('holds Discard while a save runs, and offers it again once the save settles (R4-4c, R-70)', async () => {
    let fail: (error: Error) => void = () => {};
    vi.mocked(commitCardEdit).mockReturnValue(new Promise((_, reject) => (fail = reject)));
    const {user} = renderStudio('/studio?mode=edit');
    await openMei(user);
    await rename(user);
    const discard = () => screen.getByRole('button', {name: 'Discard all changes'});
    expect(discard()).toBeEnabled();
    await user.click(saveButton());
    // Discard now would put back the loaded form, which reads as a change undoing the save once it lands (R-70).
    expect(discard()).toBeDisabled();

    // A save that fails keeps the edits, so Discard stays, and comes back on.
    await act(async () => fail(new Error('GitHub 500 on /repos/Doberjohn/inkweave/git/trees: {"message":"Server Error"}')));
    expect(discard()).toBeEnabled();
    expect(await nameField()).toHaveValue(RENAMED);
    // Only a running save holds it: an edit Save refuses (a blank name) leaves Discard on.
    await user.clear(await nameField());
    expect(saveButton()).toBeDisabled();
    expect(discard()).toBeEnabled();
  });

  it('refuses a stale save, and Load it again keeps the edits that apply, with focus on what it did (R-67, R-68)', async () => {
    let reads = 0;
    // Someone retitled the franchise on the branch: the rename doesn't touch it, so it still applies.
    const changed = {...PREVIEW_ENTRY, franchise: 'Turning Red (2022)'};
    stubFetch(() => fileOf(++reads === 1 ? FILE : [changed, VARIANTS_ENTRY]));
    vi.mocked(commitCardEdit).mockRejectedValue(new StaleCardError(STALE));
    const {user} = renderStudio('/studio?mode=edit');
    await openMei(user);
    await rename(user);
    await user.click(saveButton());

    await user.click(await screen.findByRole('button', {name: 'Load it again'}));
    // The outcome line says what Load it again kept (R4-5e), and takes focus once the re-read lands.
    await waitFor(() => expect(screen.getByText(loadAgainNote({dropped: 0}))).toHaveFocus());
    expect(await nameField()).toHaveValue(RENAMED);
  });

  it("opens a card loaded again into an entry the form can't hold read-only, and reads the file again into its form (R-65, R-68)", async () => {
    // The first read opens Mei; Load it again finds her version changed alone; the read after it finds her fixed.
    const reads = [FILE, [UNHELD_MEI, VARIANTS_ENTRY], [FIXED_MEI, VARIANTS_ENTRY]];
    let read = 0;
    stubFetch(() => fileOf(reads[Math.min(read++, reads.length - 1)]));
    vi.mocked(commitCardEdit).mockRejectedValue(new StaleCardError(STALE));
    const {user} = renderStudio(studioHref('edit', MEI.id));
    await rename(user);
    await user.upload(screen.getByLabelText('Click to replace image'), pngFile('mei.png'));
    await waitFor(() => expect(saveButton()).toBeEnabled());
    await user.click(saveButton());
    expect(commitCardEdit).toHaveBeenCalledWith(expect.objectContaining({image: expect.objectContaining({ext: 'png'})}));

    await user.click(await screen.findByRole('button', {name: 'Load it again'}));
    // The card's facts and why, and the line says the rename went with the form, not that its field changed (R-68).
    await waitFor(() => expect(screen.getByText(loadAgainNote({dropped: 1, editable: false}))).toHaveFocus());
    expect(screen.getByText(IMAGE_ONLY_NOTES.unrepresentable)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', {name: 'Name'})).not.toBeInTheDocument();
    // The staged scan stays (R-68).
    expect(screen.getByRole('region', {name: '1 change'})).toHaveTextContent('current art → mei.png');

    // A branch edit can fix an entry the form can't hold, so the card can read the file again: its form opens.
    await user.click(screen.getByRole('button', {name: 'Read previewCards.json again'}));
    await waitFor(() => expect(screen.getByText(loadAgainNote({dropped: 0}))).toHaveFocus());
    expect(await nameField()).toHaveValue('Mei');
    expect(screen.getByRole('textbox', {name: /^Version/})).toHaveValue('Panda Rising');
    expect(screen.getByRole('region', {name: '1 change'})).toHaveTextContent('current art → mei.png');
    expect(read).toBe(3);
  });

  it("keeps an image-only card's facts once a later read gives its entry fields, and its re-read opens the form (R-65)", async () => {
    let reads = 0;
    // The branch holds Mei unrepresentable as the studio opens; the read after a New reveal publish finds her fixed.
    stubFetch(() => fileOf([++reads === 1 ? UNHELD_MEI : FIXED_MEI, VARIANTS_ENTRY]));
    vi.mocked(commitNewCard).mockResolvedValue({commitUrl: COMMIT_URL});
    const {user} = renderStudio(studioHref('edit', MEI.id));
    expect(await screen.findByText(IMAGE_ONLY_NOTES.unrepresentable)).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'New reveal'}));
    await fillNewCard(user);
    await user.click(screen.getByRole('button', {name: /^Publish/}));
    await screen.findByRole('link', {name: 'View commit'});
    await waitFor(() => expect(reads).toBe(2));

    // Her draft was seeded image-only and follows no read, so the facts stay, never a blank column.
    await user.click(screen.getByRole('button', {name: 'Edit card'}));
    expect(await screen.findByText(IMAGE_ONLY_NOTES.unrepresentable)).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: 'Read previewCards.json again'}));
    expect(await nameField()).toHaveValue('Mei');
  });

  it('says so when Load it again cannot read the file, and keeps the refusal and its button (R4-4c)', async () => {
    let reads = 0;
    stubFetch(() => (++reads === 1 ? fileOf(FILE) : refusal({status: 500, message: 'Server Error'})));
    vi.mocked(commitCardEdit).mockRejectedValue(new StaleCardError(STALE));
    const {user} = renderStudio(studioHref('edit', MEI.id));
    await rename(user);
    await user.click(saveButton());
    await user.click(await screen.findByRole('button', {name: 'Load it again'}));

    // The search's words for a failed read, under the outcome, so the press shows what happened.
    const aside = screen.getByRole('complementary', {name: 'Changes'});
    expect(await within(aside).findByText(/^Could not read previewCards\.json: GitHub 500 on /)).toBeInTheDocument();
    expect(within(aside).getByText(STALE)).toBeInTheDocument();
    expect(within(aside).getByRole('button', {name: 'Load it again'})).toBeInTheDocument();
    expect(await nameField()).toHaveValue(RENAMED);
    expect(reads).toBe(2);
  });

  it('offers Forget token for a save GitHub refuses, and asks first while the draft is dirty (R-26, R-84)', async () => {
    vi.mocked(commitCardEdit).mockRejectedValue(new Error(REJECTED_SAVE));
    const {user} = renderStudio('/studio?mode=edit');
    await openMei(user);
    await rename(user);
    await user.click(saveButton());
    const forget = await screen.findByRole('button', {name: 'Forget token'});

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.click(forget);
    expect(confirm).toHaveBeenCalledWith('Forget the token and drop your Edit card changes?');
    expect(localStorage.getItem(TOKEN_KEY)).toBe('tok');

    confirm.mockReturnValue(true);
    await user.click(forget);
    await waitFor(() => expect(screen.getByLabelText('GitHub token')).toHaveFocus());
  });

  it('reads previewCards.json again once a New reveal publish lands, so the card is in the search at once (R-66)', async () => {
    let reads = 0;
    // The workspace reads the file as it mounts; the read after the publish finds the new card.
    stubFetch(() => fileOf(++reads === 1 ? FILE : [...FILE, BRANCH_ONLY_ENTRY]));
    vi.mocked(commitNewCard).mockResolvedValue({commitUrl: COMMIT_URL});
    const {user} = renderStudio('/studio');
    await fillNewCard(user);
    await user.click(screen.getByRole('button', {name: /^Publish/}));
    await screen.findByRole('link', {name: 'View commit'});

    await user.click(screen.getByRole('button', {name: 'Edit card'}));
    await user.type(searchField(), 'wren');
    expect(await screen.findByRole('link', {name: /^Wren\b/})).toHaveTextContent('not deployed yet');
    expect(reads).toBe(2);
  });
});

describe('StudioPage: the guard and the view in Edit card', () => {
  it('asks before a card change drops the Edit draft, naming only it, and Stay keeps it (R-58)', async () => {
    const {router, user} = renderStudio('/studio?mode=edit');
    await twoDrafts(user);
    await user.click(screen.getByRole('link', {name: 'Load a different card'}));
    const dialog = await leaveDialog();
    expect(dialog).toHaveTextContent(LEAVES_CARD);
    expect(dialog).not.toHaveTextContent('New reveal');

    await user.click(within(dialog).getByRole('button', {name: 'Stay on this page'}));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(router.state.location.search).toBe(`?mode=edit&card=${MEI.id}`);
    expect(await nameField()).toHaveValue(RENAMED);
  });

  it('names both drafts when leaving the studio, and a card left is opened fresh (R-58, R-46)', async () => {
    const {router, user} = renderStudio('/studio?mode=edit');
    await twoDrafts(user);
    act(() => void router.navigate('/'));
    expect(await leaveDialog()).toHaveTextContent(`${LEAVES_REVEAL} ${LEAVES_EDIT}`);
    await user.click(screen.getByRole('button', {name: 'Stay on this page'}));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));

    await user.click(screen.getByRole('link', {name: 'Load a different card'}));
    await user.click(within(await leaveDialog()).getByRole('button', {name: 'Leave this page'}));
    expect(await openMei(user)).toHaveValue('Mei');
  });

  it('says a card change mid-save leaves the save running (R-58)', async () => {
    vi.mocked(commitCardEdit).mockReturnValue(new Promise(() => {}));
    const {user} = renderStudio('/studio?mode=edit');
    await openMei(user);
    await rename(user);
    await user.click(saveButton());
    await user.click(screen.getByRole('link', {name: 'Load a different card'}));
    expect(await leaveDialog()).toHaveTextContent(
      "A save to master is in progress. Leaving won't stop it, and you won't see whether it landed.",
    );
  });

  it("gives each card a fresh view: the open accordion section doesn't carry over (R-46)", async () => {
    measured.width = 0;
    const {router, user} = renderStudio(studioHref('edit', MEI.id));
    await user.click(await screen.findByRole('button', {name: /^Card text/}));
    expect(screen.getByRole('button', {name: /^Card text/})).toHaveAttribute('aria-expanded', 'true');
    const meiPanel = screen.getByRole('region', {name: 'Card preview'});

    act(() => void router.navigate(studioHref('edit', MING.id)));
    expect(await banner(MING)).toBeInTheDocument();
    // The whole view is the new card's, not only its form: the card panel is a new one too.
    expect(screen.getByRole('region', {name: 'Card preview'})).not.toBe(meiPanel);
    expect(screen.getByRole('button', {name: /^Card text/})).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', {name: /^Identity/})).toHaveAttribute('aria-expanded', 'true');
  });

  it('turns the Dual-ink switch off with the second ink Discard drops: the form starts fresh (R-46, R-77)', async () => {
    const {user} = renderStudio('/studio?mode=edit');
    await openMei(user);
    await user.click(screen.getByRole('switch', {name: 'Dual-ink card'}));
    await user.click(within(screen.getByRole('group', {name: 'Second ink'})).getByRole('button', {name: 'Sapphire'}));

    await user.click(await screen.findByRole('button', {name: 'Discard all changes'}));
    // Mei is single-ink again, so the switch is off, as it opened, not on over "no second ink".
    expect(screen.getByRole('switch', {name: 'Dual-ink card'})).not.toBeChecked();
    expect(screen.queryByRole('group', {name: 'Second ink'})).not.toBeInTheDocument();
  });

  it('gives a card loaded again a fresh form: the open accordion section goes back to Identity (R-68, R-46)', async () => {
    measured.width = 0;
    let reads = 0;
    // The branch retitled the franchise, which the rename doesn't touch, so Load it again re-seeds and keeps it.
    const changed = {...PREVIEW_ENTRY, franchise: 'Turning Red (2022)'};
    stubFetch(() => fileOf(++reads === 1 ? FILE : [changed, VARIANTS_ENTRY]));
    vi.mocked(commitCardEdit).mockRejectedValue(new StaleCardError(STALE));
    const {user} = renderStudio(studioHref('edit', MEI.id));
    await rename(user);
    await user.click(screen.getByRole('button', {name: /^Card text/}));
    await user.click(saveButton());

    await user.click(await screen.findByRole('button', {name: 'Load it again'}));
    await screen.findByText(loadAgainNote({dropped: 0}));
    expect(screen.getByRole('button', {name: /^Card text/})).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', {name: /^Identity/})).toHaveAttribute('aria-expanded', 'true');
    expect(await nameField()).toHaveValue(RENAMED);
  });
});
