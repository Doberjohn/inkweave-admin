import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, screen, waitFor, waitForElementToBeRemoved, within} from '@testing-library/react';
import type {UserEvent} from '@testing-library/user-event';
import {synergyEngine, type LorcanaCard, type LorcanaJSONCard} from 'inkweave-synergy-engine';
import {REVEAL_ID_BASE, inkBlock} from '../../../app-bridge';
import {studioHref} from '../../../shell/nav';
import {pngFile} from '../../../test/images';
import {commitCardImage} from '../../image/githubClient';
import {StaleCardError, commitCardEdit, commitNewCard, commitPreviewCardImage} from '../../reveal/githubClient';
import {goneNote} from '../branchCards';
import {IMAGE_ONLY_NOTES} from '../cardEdit';
import {loadAgainNote} from '../loadAgainNote';
import {newRevealNote} from '../studioCopy';
import {BRANCH_ONLY_ENTRY, PREVIEW_ENTRY, RELEASED_CARD, VARIANTS_ENTRY, cardOf, previewFileText} from '../studioFixtures';
import {STUDIO_WIDE_MIN} from '../studioLayout';
import {
  TOKEN_KEY,
  dropFocusToBody,
  fillNewCard,
  never,
  renderStudio,
  setCardList,
  stubFetch,
  stubReads,
  type Answer,
} from './studioHarness';
import {measured} from './studioStores';

// previewCards.json is read for real, against the fetch stub; only the commits are faked.
vi.mock('../../reveal/githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../reveal/githubClient')>()),
  commitCardEdit: vi.fn(),
  commitNewCard: vi.fn(),
  commitPreviewCardImage: vi.fn(),
}));
vi.mock('../../image/githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../image/githubClient')>()),
  commitCardImage: vi.fn(),
}));

// The card list and the measured width come from the harness's stores (studioStores.ts); the rest of the bridge is real.
vi.mock('../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import('./studioStores')).STORE_HOOKS,
}));

const COMMIT_URL = 'https://github.com/Doberjohn/inkweave/commit/abc123';
/** What a save says when GitHub rejects the token (R-26). */
const REJECTED_SAVE = 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: {"message":"Bad credentials"}';
const IMAGE_NOTE = 'Vercel is deploying it: allow 15 to 20 minutes before the new image shows on inkweave.ink.';
// R4-6a's wording (studioPaths.ts): what a held card change, and a held leave, drop. Both drafts take one sentence (R4-8c).
const LEAVES_CARD = "Your changes to this card aren't saved yet. Leaving the card drops them.";
const LEAVES_EDIT = "Your Edit card changes aren't saved yet. Leaving Card studio drops them.";
const LEAVES_BOTH =
  "Your New reveal card isn't published yet, and your Edit card changes aren't saved yet. Leaving Card studio drops both.";
/** Edit's in-flight line, on master: R2's (writeInFlight.ts), then what leaving still drops (studioPaths.ts). */
const SAVING =
  "A save to master is in progress. Leaving won't stop it, and you won't see whether it landed. " +
  'Any edits made since the save started are dropped, and if the save fails, its changes are lost too.';
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

/** previewCards.json holding `cards`, as GitHub's raw contents answer it. */
const fileOf =
  (cards: LorcanaJSONCard[]): Answer =>
  () =>
    new Response(previewFileText(cards));
/** A read GitHub refuses. */
const refusal =
  ({status, message}: {status: number; message: string}): Answer =>
  () =>
    new Response(JSON.stringify({message}), {status});

/** The Editing banner's h2 for `card`: "Editing {name} {version}" (R4-5f). */
const banner = (card: LorcanaCard) =>
  screen.findByRole('heading', {level: 2, name: `Editing ${card.name} ${card.version}`});
const searchField = () => screen.getByRole('searchbox', {name: 'Search cards'});
const nameField = () => screen.findByRole('textbox', {name: 'Name'});
const saveButton = () => screen.getByRole('button', {name: /^Save/});
const leaveDialog = () => screen.findByRole('dialog', {name: 'Leave this page?'});
/** A held card change stays on the page, so it asks about the card (R4-8c). */
const cardDialog = () => screen.findByRole('dialog', {name: 'Leave this card?'});
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

/** A draft in each mode: a name typed in New reveal, and Mei renamed in Edit card (R-57 keeps both). */
async function twoDrafts(user: UserEvent) {
  await openMei(user);
  await user.click(screen.getByRole('button', {name: 'New reveal'}));
  await user.type(await nameField(), 'Wren');
  await user.click(screen.getByRole('button', {name: 'Edit card'}));
  await rename(user);
}

beforeEach(() => {
  // A block, not an arrow's value: mockReset() returns the mock, and Vitest calls a function a hook returns as its teardown.
  vi.mocked(commitCardEdit).mockReset();
  vi.mocked(commitCardImage).mockReset();
  vi.mocked(commitNewCard).mockReset();
  vi.mocked(commitPreviewCardImage).mockReset();
  // Wide, so every field of the form shows at once.
  measured.width = STUDIO_WIDE_MIN;
  setCardList({cards: CARDS});
  stubFetch(fileOf(FILE));
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
    const {router, user} = renderStudio({path: '/studio?mode=edit'});
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
    const {user} = renderStudio({path: '/studio?mode=edit'});
    await user.type(searchField(), 'mei');
    await openMei(user);
    await user.click(screen.getByRole('link', {name: 'Load a different card'}));
    await waitFor(() => expect(searchField()).toHaveFocus());
    expect(searchField()).toHaveValue('mei');
    // The old query is selected, so typing starts a new search instead of appending to it.
    const field = searchField() as HTMLInputElement;
    expect([field.selectionStart, field.selectionEnd]).toEqual([0, 'mei'.length]);
  });

  it('reads loading, not missing, for a deep link while the card list loads, and leaves focus alone after', async () => {
    setCardList({cards: [], isLoading: true});
    renderStudio({path: studioHref('edit', MEI.id)});
    expect(screen.getByText('Loading the card…')).toBeInTheDocument();
    expect(screen.queryByText(/^No card has the id/)).not.toBeInTheDocument();

    setCardList({cards: CARDS});
    expect(await banner(MEI)).toBeInTheDocument();
    // A deep link is no one's action in the page, so nothing asks for the handoff.
    expect(document.body).toHaveFocus();
  });

  it("hands focus to the banner when another page's link opens the card: the link went with that page (R-59, #34)", async () => {
    const {router, user} = renderStudio({path: `/cards/${MEI.id}`});
    await user.click(screen.getByRole('link', {name: 'Edit in Card studio'}));
    expect(router.state.location.search).toBe(`?mode=edit&card=${MEI.id}`);
    await waitFor(async () => expect(await banner(MEI)).toHaveFocus());
  });

  it('asks for no handoff when a redirect names the card: a REPLACE is no one’s action (R-59)', async () => {
    const {router} = renderStudio({path: '/studio?mode=edit'});
    act(() => void router.navigate(studioHref('edit', MEI.id), {replace: true}));
    expect(await banner(MEI)).toBeInTheDocument();
    // Settle the effects a request would run, then check nothing took focus.
    await act(async () => {});
    expect(document.body).toHaveFocus();
  });

  it("hands focus to the search once the card list's Retry lands (R-59)", async () => {
    setCardList({cards: [], error: new Error('HTTP 503')});
    const {user} = renderStudio({path: '/studio?mode=edit'});
    await user.click(screen.getByRole('button', {name: 'Retry'}));
    // The shell's CardDataProvider reloads the list; here the store does.
    setCardList({cards: CARDS});
    await waitFor(() => expect(searchField()).toHaveFocus());
  });

  it("opens a deep link's card once the card list's Retry lands, with focus on the banner (R-59)", async () => {
    setCardList({cards: [], error: new Error('HTTP 503')});
    const {user} = renderStudio({path: studioHref('edit', MEI.id)});
    await user.click(screen.getByRole('button', {name: 'Retry'}));
    setCardList({cards: CARDS});
    await waitFor(async () => expect(await banner(MEI)).toHaveFocus());
  });

  it('says why an unknown id is not open, above the search; reached by a link, its line takes focus (R-29, R-59)', async () => {
    const {router} = renderStudio({path: '/studio?mode=edit'});
    act(() => void router.navigate(studioHref('edit', '999999')));
    const line = await screen.findByText(/^No card has the id/);
    expect(line).toHaveTextContent('No card has the id 999999 in the card list or in previewCards.json.');
    await waitFor(() => expect(line).toHaveFocus());
    expect(searchField()).toBeInTheDocument();
  });

  it("says why a preview card the branch file dropped can't be saved, and the line takes focus (R-66, R-59)", async () => {
    // Mei is still on inkweave.ink, but previewCards.json on the branch no longer holds her.
    stubFetch(fileOf([VARIANTS_ENTRY]));
    const {router} = renderStudio({path: '/studio?mode=edit'});
    act(() => void router.navigate(studioHref('edit', MEI.id)));
    const line = await screen.findByText(/is no longer in previewCards\.json/);
    expect(line).toHaveTextContent(goneNote(MEI));
    await waitFor(() => expect(line).toHaveFocus());
    expect(searchField()).toBeInTheDocument();
  });

  it('waits on a failed read for a preview card, and opens it with focus on the banner once Retry lands (R-71, R-59)', async () => {
    stubReads(refusal({status: 500, message: 'Server Error'}), fileOf(FILE));
    const {user} = renderStudio({path: studioHref('edit', MEI.id)});
    expect(await screen.findByText(/opens once previewCards\.json can be read/)).toHaveTextContent(
      `Card ${MEI.id} opens once previewCards.json can be read.`,
    );
    await user.click(screen.getByRole('button', {name: 'Read previewCards.json again'}));
    await waitFor(async () => expect(await banner(MEI)).toHaveFocus());
  });

  it('opens a released card image-only, straight from the card list, while previewCards.json still reads (R-61, R-71)', async () => {
    stubFetch(never);
    renderStudio({path: studioHref('edit', RELEASED_CARD.id)});
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

  it("leaves a failed first read to the search: a released card, which doesn't need the file, shows no read error (R-71)", async () => {
    stubFetch(refusal({status: 500, message: 'Server Error'}));
    const {user} = renderStudio({path: studioHref('edit', RELEASED_CARD.id)});
    expect(await banner(RELEASED_CARD)).toBeInTheDocument();
    // Give the refused read time to land before looking at the aside.
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    const aside = screen.getByRole('complementary', {name: 'Changes'});
    expect(within(aside).queryByText(/^Could not read previewCards\.json/)).not.toBeInTheDocument();

    // The read did fail: the search says so, with its way out.
    await user.click(screen.getByRole('link', {name: 'Load a different card'}));
    expect(await screen.findByText(/^Could not read previewCards\.json/)).toBeInTheDocument();
  });

  it('opens a card only the branch file holds, not deployed yet, with no analytics link (R-66, R-33)', async () => {
    stubFetch(fileOf([...FILE, BRANCH_ONLY_ENTRY]));
    renderStudio({path: studioHref('edit', WREN.id)});
    expect(await banner(WREN)).toBeInTheDocument();
    expect(screen.getByText('not deployed yet')).toBeInTheDocument();
    expect(screen.queryByRole('link', {name: 'View card analytics'})).not.toBeInTheDocument();
  });

  it('shows a failed read beside the search, and hands focus to the field once Retry lands (R-71, R-59)', async () => {
    stubReads(refusal({status: 500, message: 'Server Error'}), fileOf(FILE));
    const {user} = renderStudio({path: '/studio?mode=edit'});
    await user.click(await screen.findByRole('button', {name: 'Read previewCards.json again'}));
    await waitFor(() => expect(searchField()).toHaveFocus());
    expect(screen.queryByText(/^Could not read previewCards\.json/)).not.toBeInTheDocument();
  });

  it('reads previewCards.json again after a later read failed, and hands focus to the field (R-71, R-59)', async () => {
    // The first read lands; the read after the save fails; Retry's lands.
    const reads = stubReads(fileOf(FILE), refusal({status: 500, message: 'Server Error'}), fileOf(FILE));
    vi.mocked(commitCardEdit).mockResolvedValue({commitUrl: COMMIT_URL});
    const {user} = renderStudio({path: '/studio?mode=edit'});
    await openMei(user);
    await rename(user);
    await user.click(saveButton());
    await screen.findByRole('link', {name: 'View commit'});
    await waitFor(() => expect(reads.count).toBe(2));

    await user.click(screen.getByRole('link', {name: 'Load a different card'}));
    await user.click(await screen.findByRole('button', {name: 'Read previewCards.json again'}));
    await waitFor(() => expect(searchField()).toHaveFocus());
    expect(reads.count).toBe(3);
    expect(screen.queryByText(/^Could not read previewCards\.json/)).not.toBeInTheDocument();
  });

  it('offers Forget token for a read GitHub refuses, and forgets at once while nothing is dirty (R-26, R-84)', async () => {
    stubFetch(refusal({status: 401, message: 'Bad credentials'}));
    const confirm = vi.spyOn(window, 'confirm');
    const {user} = renderStudio({path: '/studio?mode=edit'});
    await user.click(await screen.findByRole('button', {name: 'Forget token'}));
    expect(confirm).not.toHaveBeenCalled();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    await waitFor(() => expect(screen.getByLabelText('GitHub token')).toHaveFocus());
  });
});

describe('StudioPage: saving in Edit card', () => {
  it("saves a field edit with New reveal's note, and keeps the card open on its new baseline (R-70)", async () => {
    vi.mocked(commitCardEdit).mockResolvedValue({commitUrl: COMMIT_URL});
    const {user} = renderStudio({path: '/studio?mode=edit'});
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
    const {user} = renderStudio({path: studioHref('edit', RELEASED_CARD.id)});
    await user.upload(await screen.findByLabelText('Click or drop to replace image'), pngFile('lantern.png'));
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
    const {user} = renderStudio({path: '/studio?mode=edit'});
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

  it('takes back one of two changes, keeps the other, and saves that one alone (Doberjohn/inkweave-admin#52)', async () => {
    vi.mocked(commitCardEdit).mockResolvedValue({commitUrl: COMMIT_URL});
    const {user} = renderStudio({path: studioHref('edit', MEI.id)});
    await rename(user);
    const version = screen.getByRole('textbox', {name: /^Version/});
    await user.clear(version);
    await user.type(version, 'Bold Panda');
    expect(screen.getByRole('region', {name: '2 changes'})).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'Revert Name'}));
    expect(await nameField()).toHaveValue('Mei');
    expect(version).toHaveValue('Bold Panda');
    expect(screen.getByRole('region', {name: '1 change'})).toHaveTextContent('Red Panda → Bold Panda');
    // The row's button went with it, so focus moved to the next row's (R-48).
    expect(screen.getByRole('button', {name: 'Revert Version'})).toHaveFocus();

    await user.click(saveButton());
    await screen.findByRole('link', {name: 'View commit'});
    expect(commitCardEdit).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({loaded: PREVIEW_ENTRY, changes: {version: 'Bold Panda', fullName: 'Mei - Bold Panda'}, image: null}),
    );
  });

  it('refuses a stale save, and Load it again keeps the edits that apply, with focus on what it did (R-67, R-68)', async () => {
    // Someone retitled the franchise on the branch: the rename doesn't touch it, so it still applies.
    const changed = {...PREVIEW_ENTRY, franchise: 'Turning Red (2022)'};
    stubReads(fileOf(FILE), fileOf([changed, VARIANTS_ENTRY]));
    vi.mocked(commitCardEdit).mockRejectedValue(new StaleCardError(STALE));
    const {user} = renderStudio({path: '/studio?mode=edit'});
    await openMei(user);
    await rename(user);
    await user.click(saveButton());

    await user.click(await screen.findByRole('button', {name: 'Load it again'}));
    // The outcome line says what Load it again kept (R4-5e), and takes focus once the re-read lands.
    await waitFor(() => expect(screen.getByText('Loaded the card again from master. Every edit still applies.')).toHaveFocus());
    expect(await nameField()).toHaveValue(RENAMED);
  });

  it("opens a card loaded again into an entry the form can't hold read-only, and reads the file again into its form (R-65, R-68)", async () => {
    // The first read opens Mei; Load it again finds her version changed alone; the read after it finds her fixed.
    const reads = stubReads(fileOf(FILE), fileOf([UNHELD_MEI, VARIANTS_ENTRY]), fileOf([FIXED_MEI, VARIANTS_ENTRY]));
    vi.mocked(commitCardEdit).mockRejectedValue(new StaleCardError(STALE));
    const {user} = renderStudio({path: studioHref('edit', MEI.id)});
    await rename(user);
    await user.upload(screen.getByLabelText('Click or drop to replace image'), pngFile('mei.png'));
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
    // It had no field edit to keep, so the line says only what the read did, and that the scan stays (R4-8c).
    await user.click(screen.getByRole('button', {name: 'Read previewCards.json again'}));
    const line = 'Loaded the card again from master. Your image is still staged.';
    await waitFor(() => expect(screen.getByText(line)).toHaveFocus());
    expect(await nameField()).toHaveValue('Mei');
    expect(screen.getByRole('textbox', {name: /^Version/})).toHaveValue('Panda Rising');
    expect(screen.getByRole('region', {name: '1 change'})).toHaveTextContent('current art → mei.png');
    expect(reads.count).toBe(3);

    // The line says what the read left, so an edit made after it doesn't turn it into "Every edit still applies."
    await user.type(await nameField(), ' Lee');
    expect(screen.getByRole('region', {name: '2 changes'})).toBeInTheDocument();
    expect(screen.getByText(line)).toBeInTheDocument();
  });

  // R4-8f: the line says what the read left. Discard and Revert image take back what they drop, a revert or a hand edit that
  // undoes every edit the read kept takes back its claim, and nothing brings either back before the next read.
  it('takes "Every edit still applies." back once Discard drops the edits', async () => {
    const changed = {...PREVIEW_ENTRY, franchise: 'Turning Red (2022)'};
    stubReads(fileOf(FILE), fileOf([changed, VARIANTS_ENTRY]));
    vi.mocked(commitCardEdit).mockRejectedValue(new StaleCardError(STALE));
    const {user} = renderStudio({path: studioHref('edit', MEI.id)});
    await rename(user);
    await user.click(saveButton());
    await user.click(await screen.findByRole('button', {name: 'Load it again'}));
    await screen.findByText('Loaded the card again from master. Every edit still applies.');

    await user.click(screen.getByRole('button', {name: 'Discard all changes'}));
    expect(await nameField()).toHaveValue('Mei');
    expect(screen.getByText('Loaded the card again from master.')).toHaveAttribute('role', 'status');
  });

  it('takes "Every edit still applies." back once the edit the read kept is reverted, though an edit made since stays (R4-8c)', async () => {
    const changed = {...PREVIEW_ENTRY, franchise: 'Turning Red (2022)'};
    stubReads(fileOf(FILE), fileOf([changed, VARIANTS_ENTRY]));
    vi.mocked(commitCardEdit).mockRejectedValue(new StaleCardError(STALE));
    const {user} = renderStudio({path: studioHref('edit', MEI.id)});
    await rename(user);
    await user.click(saveButton());
    await user.click(await screen.findByRole('button', {name: 'Load it again'}));
    await screen.findByText('Loaded the card again from master. Every edit still applies.');

    // An edit made after the read, which the read never kept, then the rename it kept taken back.
    const version = screen.getByRole('textbox', {name: /^Version/});
    await user.clear(version);
    await user.type(version, 'Bold Panda');
    await user.click(screen.getByRole('button', {name: 'Revert Name'}));
    expect(await nameField()).toHaveValue('Mei');
    expect(screen.getByRole('region', {name: '1 change'})).toHaveTextContent('Red Panda → Bold Panda');
    expect(screen.getByText('Loaded the card again from master.')).toHaveAttribute('role', 'status');
  });

  it('takes "Your image is still staged." back once Revert image drops it, and a new image never brings it back', async () => {
    stubReads(fileOf([UNHELD_MEI, VARIANTS_ENTRY]), fileOf([FIXED_MEI, VARIANTS_ENTRY]));
    const {user} = renderStudio({path: studioHref('edit', MEI.id)});
    await user.upload(await screen.findByLabelText('Click or drop to replace image'), pngFile('mei.png'));
    await user.click(await screen.findByRole('button', {name: 'Read previewCards.json again'}));
    await screen.findByText('Loaded the card again from master. Your image is still staged.');

    await user.click(screen.getByRole('button', {name: 'Revert image'}));
    const line = screen.getByText('Loaded the card again from master.');
    expect(line).toHaveAttribute('role', 'status');
    // The line was recorded as the read landed: an image staged after it is no image the read kept.
    await user.upload(screen.getByLabelText('Click or drop to replace image'), pngFile('mei-2.png'));
    expect(screen.getByRole('region', {name: '1 change'})).toHaveTextContent('current art → mei-2.png');
    expect(line).toHaveTextContent(/^Loaded the card again from master\.$/);
  });

  it("says a card Load it again turned read-only can't be edited now, not that it still can't (R-65, R4-8f)", async () => {
    // Mei opens editable; the stale save's edit is discarded, so the read that finds her unheld drops none.
    stubReads(fileOf(FILE), fileOf([UNHELD_MEI, VARIANTS_ENTRY]));
    vi.mocked(commitCardEdit).mockRejectedValue(new StaleCardError(STALE));
    const {user} = renderStudio({path: studioHref('edit', MEI.id)});
    await rename(user);
    await user.click(saveButton());
    const loadAgain = await screen.findByRole('button', {name: 'Load it again'});
    await user.click(screen.getByRole('button', {name: 'Discard all changes'}));
    await user.click(loadAgain);

    const line = "Loaded the card again from master. It can't be edited here now, because it holds data the form can't.";
    await waitFor(() => expect(screen.getByText(line)).toHaveFocus());
    expect(screen.getByText(IMAGE_ONLY_NOTES.unrepresentable)).toBeInTheDocument();
  });

  it("keeps an image-only card's facts once a later read gives its entry fields, and its re-read opens the form (R-65)", async () => {
    // The branch holds Mei unrepresentable as the studio opens; the read after a New reveal publish finds her fixed.
    const reads = stubReads(fileOf([UNHELD_MEI, VARIANTS_ENTRY]), fileOf([FIXED_MEI, VARIANTS_ENTRY]));
    vi.mocked(commitNewCard).mockResolvedValue({commitUrl: COMMIT_URL});
    const {user} = renderStudio({path: studioHref('edit', MEI.id)});
    expect(await screen.findByText(IMAGE_ONLY_NOTES.unrepresentable)).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'New reveal'}));
    await fillNewCard({user, name: 'Wren'});
    await user.click(screen.getByRole('button', {name: /^Publish/}));
    await screen.findByRole('link', {name: 'View commit'});
    await waitFor(() => expect(reads.count).toBe(2));

    // Her draft was seeded image-only and follows no read, so the facts stay, never a blank column.
    await user.click(screen.getByRole('button', {name: 'Edit card'}));
    expect(await screen.findByText(IMAGE_ONLY_NOTES.unrepresentable)).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: 'Read previewCards.json again'}));
    expect(await nameField()).toHaveValue('Mei');
  });

  it('says so when Load it again cannot read the file, and keeps the refusal and its button (R4-4c)', async () => {
    const reads = stubReads(fileOf(FILE), refusal({status: 500, message: 'Server Error'}));
    vi.mocked(commitCardEdit).mockRejectedValue(new StaleCardError(STALE));
    const {user} = renderStudio({path: studioHref('edit', MEI.id)});
    await rename(user);
    await user.click(saveButton());
    await user.click(await screen.findByRole('button', {name: 'Load it again'}));

    // The search's words for a failed read, under the outcome, so the press shows what happened.
    const aside = screen.getByRole('complementary', {name: 'Changes'});
    expect(await within(aside).findByText(/^Could not read previewCards\.json: GitHub 500 on /)).toBeInTheDocument();
    expect(within(aside).getByText(STALE)).toBeInTheDocument();
    expect(within(aside).getByRole('button', {name: 'Load it again'})).toBeInTheDocument();
    expect(await nameField()).toHaveValue(RENAMED);
    expect(reads.count).toBe(2);
  });

  it('offers Forget token when GitHub refuses the token on a re-read, as the search does (R-26, R-84)', async () => {
    stubReads(fileOf(FILE), refusal({status: 401, message: 'Bad credentials'}));
    vi.mocked(commitCardEdit).mockRejectedValue(new StaleCardError(STALE));
    const {user} = renderStudio({path: studioHref('edit', MEI.id)});
    await rename(user);
    await user.click(saveButton());
    await user.click(await screen.findByRole('button', {name: 'Load it again'}));

    const aside = screen.getByRole('complementary', {name: 'Changes'});
    expect(await within(aside).findByText(/^Could not read previewCards\.json: GitHub 401 on /)).toBeInTheDocument();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.click(within(aside).getByRole('button', {name: 'Forget token'}));
    // The workspace asks first, since the rename is still unsaved (R-84).
    expect(confirm).toHaveBeenCalledWith('Forget the token and drop your Edit card changes?');
  });

  it("holds an image-only card's Read previewCards.json again while its save runs (R4-4c)", async () => {
    // The branch holds Mei unrepresentable, so she opens image-only, and her image saves alone, checking the file.
    stubFetch(fileOf([UNHELD_MEI, VARIANTS_ENTRY]));
    vi.mocked(commitPreviewCardImage).mockReturnValue(new Promise(() => {}));
    const {user} = renderStudio({path: studioHref('edit', MEI.id)});
    expect(await screen.findByText(IMAGE_ONLY_NOTES.unrepresentable)).toBeInTheDocument();
    await user.upload(screen.getByLabelText('Click or drop to replace image'), pngFile('mei.png'));
    await waitFor(() => expect(saveButton()).toBeEnabled());
    await user.click(saveButton());

    expect(commitPreviewCardImage).toHaveBeenCalledOnce();
    // A re-read now would re-seed the draft the save was made from, and drop its outcome (R-69).
    expect(screen.getByRole('button', {name: 'Read previewCards.json again'})).toBeDisabled();
  });

  it('offers Forget token for a save GitHub refuses, and asks first while the draft is dirty (R-26, R-84)', async () => {
    vi.mocked(commitCardEdit).mockRejectedValue(new Error(REJECTED_SAVE));
    const {user} = renderStudio({path: '/studio?mode=edit'});
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
    // The workspace reads the file as it mounts; the read after the publish finds the new card.
    const reads = stubReads(fileOf(FILE), fileOf([...FILE, BRANCH_ONLY_ENTRY]));
    vi.mocked(commitNewCard).mockResolvedValue({commitUrl: COMMIT_URL});
    const {user} = renderStudio({path: '/studio'});
    await fillNewCard({user, name: 'Wren'});
    await user.click(screen.getByRole('button', {name: /^Publish/}));
    await screen.findByRole('link', {name: 'View commit'});

    await user.click(screen.getByRole('button', {name: 'Edit card'}));
    await user.type(searchField(), 'wren');
    expect(await screen.findByRole('link', {name: /^Wren\b/})).toHaveTextContent('not deployed yet');
    expect(reads.count).toBe(2);
  });
});

describe('StudioPage: the guard and the view in Edit card', () => {
  it('asks before a card change drops the Edit draft, as a question about the card, and Keep editing keeps it (R-58, R4-8c)', async () => {
    const {router, user} = renderStudio({path: '/studio?mode=edit'});
    await twoDrafts(user);
    await user.click(screen.getByRole('link', {name: 'Load a different card'}));
    // It stays on the page, so it asks about the card, never "Leave this page?".
    const dialog = await cardDialog();
    expect(within(dialog).getByRole('heading', {level: 2, name: 'Leave this card?'})).toBeInTheDocument();
    expect(dialog).toHaveTextContent(LEAVES_CARD);
    expect(dialog).not.toHaveTextContent('New reveal');
    expect(within(dialog).getAllByRole('button').map((button) => button.textContent)).toEqual(['Keep editing', 'Drop changes']);

    await user.click(within(dialog).getByRole('button', {name: 'Keep editing'}));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(router.state.location.search).toBe(`?mode=edit&card=${MEI.id}`);
    expect(await nameField()).toHaveValue(RENAMED);
  });

  it('names both drafts in one sentence when leaving the studio, and a card left is opened fresh (R-58, R-46)', async () => {
    const {router, user} = renderStudio({path: '/studio?mode=edit'});
    await twoDrafts(user);
    act(() => void router.navigate('/'));
    // Leaving Card studio keeps the guard's own words.
    const dialog = await leaveDialog();
    expect(within(dialog).getByText(LEAVES_BOTH)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', {name: 'Stay on this page'}));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));

    await user.click(screen.getByRole('link', {name: 'Load a different card'}));
    await user.click(within(await cardDialog()).getByRole('button', {name: 'Drop changes'}));
    expect(await openMei(user)).toHaveValue('Mei');
  });

  it.each([
    {
      how: 'a click on Drop changes',
      leave: (user: UserEvent, dialog: HTMLElement) =>
        user.click(within(dialog).getByRole('button', {name: 'Drop changes'})),
    },
    {
      how: 'the keyboard: Tab past Keep editing to Drop changes, then Enter',
      leave: async (user: UserEvent) => {
        await user.tab();
        await user.tab();
        expect(screen.getByRole('button', {name: 'Drop changes'})).toHaveFocus();
        await user.keyboard('{Enter}');
      },
    },
  ])('hands focus to the search once a held card change is let through by $how (R-59)', async ({leave}) => {
    const {user} = renderStudio({path: '/studio?mode=edit'});
    await openMei(user);
    await rename(user);
    await user.click(screen.getByRole('link', {name: 'Load a different card'}));
    const dialog = await cardDialog();
    await waitFor(() => expect(within(dialog).getByText(LEAVES_CARD)).toHaveFocus());

    await leave(user, dialog);
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    // The banner's link that opened the dialog went with the card, so no restore can land: the search takes focus.
    expect(document.activeElement).toBe(document.querySelector('input[aria-label="Search cards"]'));
  });

  it("says a card change mid-save leaves the save running, and words the next card's edits as unsaved (R-58, R-69)", async () => {
    vi.mocked(commitCardEdit).mockReturnValue(new Promise(() => {}));
    const {router, user} = renderStudio({path: '/studio?mode=edit'});
    await openMei(user);
    await rename(user);
    await user.click(saveButton());
    await user.click(screen.getByRole('link', {name: 'Load a different card'}));
    const dialog = await cardDialog();
    expect(within(dialog).getByText(SAVING)).toBeInTheDocument();
    // The save takes what it sent, and the line names what leaving still drops, so the leave answer names only where
    // it goes (R4-8f).
    expect(within(dialog).getAllByRole('button').map((button) => button.textContent)).toEqual(['Keep editing', 'Leave the card']);
    await user.click(within(dialog).getByRole('button', {name: 'Leave the card'}));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));

    // Mei's save still runs, but it was made from her draft: Ming's edit is what the next card change drops.
    act(() => void router.navigate(studioHref('edit', MING.id)));
    await user.type(await nameField(), ' Two');
    await user.click(screen.getByRole('link', {name: 'Load a different card'}));
    const next = await cardDialog();
    expect(within(next).getByText(LEAVES_CARD)).toBeInTheDocument();
    expect(next).not.toHaveTextContent('in progress');
  });

  it.each([
    {draft: 'an unsaved Edit draft alone', saving: false, says: LEAVES_EDIT},
    {draft: 'its save in flight', saving: true, says: SAVING},
  ])("words leaving the studio with $draft: Edit's dirty and busy reach the guard (R-58)", async ({saving, says}) => {
    vi.mocked(commitCardEdit).mockReturnValue(new Promise(() => {}));
    const {router, user} = renderStudio({path: '/studio?mode=edit'});
    await openMei(user);
    await rename(user);
    if (saving) await user.click(saveButton());
    act(() => void router.navigate('/'));
    expect(within(await leaveDialog()).getByText(says)).toBeInTheDocument();
  });

  it("gives each card a fresh view: the open accordion section doesn't carry over (R-46)", async () => {
    measured.width = 0;
    const {router, user} = renderStudio({path: studioHref('edit', MEI.id)});
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
    const {user} = renderStudio({path: '/studio?mode=edit'});
    await openMei(user);
    await user.click(screen.getByRole('switch', {name: 'Dual-ink card'}));
    await user.click(within(screen.getByRole('group', {name: 'Second ink'})).getByRole('button', {name: 'Sapphire'}));

    await user.click(await screen.findByRole('button', {name: 'Discard all changes'}));
    // Mei is single-ink again, so the switch is off, as it opened, not on over "no second ink".
    expect(screen.getByRole('switch', {name: 'Dual-ink card'})).not.toBeChecked();
    expect(screen.queryByRole('group', {name: 'Second ink'})).not.toBeInTheDocument();
  });

  it("turns the Dual-ink switch off with the second ink the Ink row's Revert takes back, and keeps its section open (Doberjohn/inkweave-admin#52)", async () => {
    // Narrow: one accordion section open at a time, which a form opened afresh would put back on Identity.
    measured.width = 0;
    const {user} = renderStudio({path: '/studio?mode=edit'});
    await openMei(user);
    await user.click(screen.getByRole('button', {name: /^Ink & rarity/}));
    await user.click(screen.getByRole('switch', {name: 'Dual-ink card'}));
    await user.click(within(screen.getByRole('group', {name: 'Second ink'})).getByRole('button', {name: 'Sapphire'}));

    await user.click(screen.getByRole('button', {name: 'Revert Ink'}));
    // Mei is single-ink again, so the switch is off, as Discard leaves it, not on over "no second ink".
    expect(screen.getByRole('switch', {name: 'Dual-ink card'})).not.toBeChecked();
    expect(screen.queryByRole('group', {name: 'Second ink'})).not.toBeInTheDocument();
    // Only the switch follows the form: the section the operator opened stays open.
    expect(screen.getByRole('button', {name: /^Ink & rarity/})).toHaveAttribute('aria-expanded', 'true');
  });

  it('gives a card loaded again a fresh form: the open accordion section goes back to Identity (R-68, R-46)', async () => {
    measured.width = 0;
    // The branch retitled the franchise, which the rename doesn't touch, so Load it again re-seeds and keeps it.
    const changed = {...PREVIEW_ENTRY, franchise: 'Turning Red (2022)'};
    stubReads(fileOf(FILE), fileOf([changed, VARIANTS_ENTRY]));
    vi.mocked(commitCardEdit).mockRejectedValue(new StaleCardError(STALE));
    const {user} = renderStudio({path: studioHref('edit', MEI.id)});
    await rename(user);
    await user.click(screen.getByRole('button', {name: /^Card text/}));
    await user.click(saveButton());

    await user.click(await screen.findByRole('button', {name: 'Load it again'}));
    await screen.findByText(loadAgainNote({dropped: 0, edits: true}));
    expect(screen.getByRole('button', {name: /^Card text/})).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', {name: /^Identity/})).toHaveAttribute('aria-expanded', 'true');
    expect(await nameField()).toHaveValue(RENAMED);
  });
});

/*
 * StudioWorkspace runs both controllers on every render, in either mode. The
 * React Compiler, which vitest runs too (vite.config.ts), leaves
 * useCardEditor's chain unmemoized, and skipped useRevealAdmin until
 * Doberjohn/inkweave-admin#59. So each controller hands its synergies over as
 * a call (findSynergies) that only its own pane makes. The spy counts the
 * engine's runs for one mode's card while the other mode's form is typed in;
 * afterEach restores it (Doberjohn/inkweave-admin#55).
 */
describe("StudioPage: a keystroke in one mode and the other mode's synergies", () => {
  it("never runs the engine again for the card open in Edit card while New reveal's form is typed in", async () => {
    const findSynergies = vi.spyOn(synergyEngine, 'findSynergies');
    const meiRuns = () => findSynergies.mock.calls.filter(([card]) => card.id === MEI.id).length;
    const {user} = renderStudio({path: studioHref('edit', MEI.id)});
    expect(await nameField()).toHaveValue('Mei');
    // Edit scored her as she opened, so the spy sees Edit's runs.
    expect(meiRuns()).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', {name: 'New reveal'}));
    const opened = meiRuns();
    await user.type(await nameField(), 'Wren');
    expect(await nameField()).toHaveValue('Wren');
    // While the controller ran them, each of the four keystrokes scored her again.
    expect(meiRuns()).toBe(opened);
  });

  it("never runs the engine again for New reveal's preview while Edit card's form is typed in", async () => {
    const findSynergies = vi.spyOn(synergyEngine, 'findSynergies');
    const number = inkBlock('Amber').first;
    // New reveal's preview takes its id from its collector number (buildPreviewCard).
    const wrenRuns = () => findSynergies.mock.calls.filter(([card]) => card.id === String(REVEAL_ID_BASE + number)).length;
    const {user} = renderStudio({path: studioHref('new', MEI.id)});
    await user.type(screen.getByRole('textbox', {name: 'Collector number'}), String(number));
    await user.type(await nameField(), 'Wren');
    // New reveal scored its preview as it was typed, so the spy sees its runs.
    expect(wrenRuns()).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', {name: 'Edit card'}));
    expect(await nameField()).toHaveValue('Mei');
    const switched = wrenRuns();
    await user.type(await nameField(), ' Lee');
    expect(await nameField()).toHaveValue('Mei Lee');
    // While the controller ran them, each of the four keystrokes scored Wren again.
    expect(wrenRuns()).toBe(switched);
  });
});
