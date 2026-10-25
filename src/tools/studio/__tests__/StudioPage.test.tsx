import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, fireEvent, screen, waitFor, waitForElementToBeRemoved, within} from '@testing-library/react';
import {pngFile} from '../../../test/images';
import {commitNewCard} from '../../reveal/githubClient';
import {lorcanaCard} from '../../analytics/cards/cardFixtures';
import {STUDIO_SUBTITLE} from '../studioCopy';
import {STUDIO_WIDE_MIN} from '../studioLayout';
import {
  TOKEN_KEY,
  chooseRevealSet,
  dropFocusToBody,
  fillNewCard,
  renderStudio,
  revealSetButton,
  setCardList,
  stubFetch,
} from './studioHarness';
import {cardList, measured} from './studioStores';

// Every GitHub read stays real against the fetch stub; only New card's commit is faked.
vi.mock('../../reveal/githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../reveal/githubClient')>()),
  commitNewCard: vi.fn(),
}));

// The card list and the measured width come from the harness's stores (studioStores.ts); the rest of the bridge is real.
vi.mock('../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import('./studioStores')).STORE_HOOKS,
}));

const COMMIT_URL = 'https://github.com/Doberjohn/inkweave/commit/abc123';
/** What a publish says when GitHub rejects the token (R-26). */
const REJECTED_PUBLISH = 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: {"message":"Bad credentials"}';

/** A released card (set 9): Edit card opens it from the card list alone, never waiting on previewCards.json (R-71). */
const ELSA = lorcanaCard({id: '2983', name: 'Elsa', version: 'Snow Queen', setCode: '9', setNumber: 42});

/** The width the root's ResizeObserver reports, as a sidebar toggle or a window resize would change it. */
function resize(width: number) {
  measured.width = width;
  act(() => measured.listeners.forEach((onChange) => onChange()));
}

/** The mode switch's buttons, in the header once a token is saved. The header stays mounted, and so do they. */
function modes() {
  const group = within(screen.getByRole('group', {name: 'Studio mode'}));
  return {
    newCard: group.getByRole('button', {name: 'New card'}),
    editCard: group.getByRole('button', {name: 'Edit card'}),
  };
}
const nameField = () => screen.getByRole('textbox', {name: 'Name'});
const publishButton = () => screen.getByRole('button', {name: /^Publish/});
const leaveDialog = () => screen.findByRole('dialog', {name: 'Leave this page?'});

/** A drag of `files` from the desktop, as fireEvent hands it over: jsdom has no DataTransfer. */
const fileDrag = (...files: File[]) => ({types: ['Files'], files, dropEffect: 'none'});

/** Whether the page keeps a file dragged onto its body, beside every drop target, from opening in the tab. */
function refusesStrayFile(): boolean {
  const data = fileDrag(pngFile('mei.png'));
  // fireEvent answers false once a listener cancels the event.
  return !fireEvent.dragOver(document.body, {dataTransfer: data}) && !fireEvent.drop(document.body, {dataTransfer: data});
}

/** The measured root's regions in DOM order, told apart by what each holds: New card's set bar, then step 2's slots. */
function regionOrder() {
  const aside = screen.getByRole('complementary', {name: 'Publish'});
  const root = aside.parentElement?.parentElement;
  return [...(root?.children ?? [])].map((region) => {
    if (region.contains(aside)) return 'aside';
    if (region.textContent?.includes('Written to')) return 'bar';
    return region.querySelector('input[type="file"]') ? 'card' : 'form';
  });
}

beforeEach(() => {
  // A block, not an arrow's value: mockReset() returns the mock, and Vitest calls a function a hook returns as its teardown.
  vi.mocked(commitNewCard).mockReset();
  measured.width = 0;
  setCardList({cards: [ELSA]});
  stubFetch();
});

afterEach(() => {
  // The token store reads localStorage on every snapshot, so clearing it is the whole token reset.
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// writePages.test.tsx's three cases, ported through a data router when that file went with the old pages (R4-6c).
describe('StudioPage: the gate and the header', () => {
  it('asks for a token under the title and branch notice, with no mode switch yet', () => {
    renderStudio({token: null});
    expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1);
    expect(screen.getByRole('heading', {level: 1, name: 'Card studio'})).toBeInTheDocument();
    expect(screen.getByRole('heading', {level: 2, name: 'GitHub token'})).toBeInTheDocument();
    expect(screen.getByText('master')).toBeInTheDocument();
    expect(screen.queryByRole('group', {name: 'Studio mode'})).not.toBeInTheDocument();
    expect(document.title).toBe('Card studio · Inkweave admin');
  });

  it("opens New card's set step with a token, under one h1 that names the branch, and leaves Forget token to the sidebar", async () => {
    const {user} = renderStudio();
    expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1);
    expect(screen.getByText(STUDIO_SUBTITLE)).toBeInTheDocument();
    expect(screen.getByText('master')).toBeInTheDocument();
    expect(modes().newCard).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', {level: 2, name: 'Which set is the card in?'})).toBeInTheDocument();
    expect(screen.queryByRole('region', {name: 'Card preview'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Forget token'})).not.toBeInTheDocument();
    // R-72, through the real controller: a fresh draft's missing scan is the checklist's, not the preview's.
    await chooseRevealSet(user);
    const preview = within(screen.getByRole('region', {name: 'Card preview'}));
    expect(preview.queryByText('Upload a card image')).not.toBeInTheDocument();
  });

  it("hands focus to the set step after Save token, then to the form's first field once the set is chosen (R-59, R-48)", async () => {
    measured.width = STUDIO_WIDE_MIN;
    const {user} = renderStudio({token: null});
    await user.type(screen.getByLabelText('GitHub token'), 'tok');
    await user.click(screen.getByRole('button', {name: 'Save token'}));
    await waitFor(() => expect(revealSetButton()).toHaveFocus());
    expect(localStorage.getItem(TOKEN_KEY)).toBe('tok');

    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByRole('textbox', {name: 'Collector number'})).toHaveFocus());
  });

  it('names a rehearsal branch on Publish, on the set bar and in the header', async () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    const {user} = renderStudio();
    await chooseRevealSet(user);
    expect(publishButton()).toHaveTextContent('Publish to admin-verify');
    expect(screen.getByText(/^One commit to admin-verify\./)).toBeInTheDocument();
    expect(screen.getByText('admin-verify')).toBeInTheDocument();
  });
});

describe('StudioPage: the mode switch (R-57)', () => {
  it('keeps the New card draft and its set across a switch to Edit card and back, and never asks', async () => {
    measured.width = STUDIO_WIDE_MIN;
    const {router, user} = renderStudio();
    const {newCard, editCard} = modes();
    await chooseRevealSet(user);
    await user.type(nameField(), 'Mei');
    await user.click(editCard);
    await waitFor(() => expect(router.state.location.search).toBe('?mode=edit'));
    expect(screen.queryByRole('textbox', {name: 'Name'})).not.toBeInTheDocument();

    await user.click(newCard);
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(nameField()).toHaveValue('Mei');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('pushes the switch, card and all, so Back returns to the other mode; the current mode does nothing', async () => {
    const {router, user} = renderStudio({path: '/studio?mode=edit&card=2983'});
    const {newCard, editCard} = modes();
    const {key} = router.state.location;
    await user.click(editCard);
    expect(router.state.location.key).toBe(key);

    await user.click(newCard);
    await waitFor(() => expect(router.state.location.search).toBe('?card=2983'));
    expect(router.state.historyAction).toBe('PUSH');
    act(() => void router.navigate(-1));
    await waitFor(() => expect(editCard).toHaveAttribute('aria-pressed', 'true'));
  });

  it("names the tab after Edit card's card, and New card after the page (R-51)", async () => {
    const {user} = renderStudio({path: '/studio?mode=edit&card=2983'});
    // The card opens once Sets 1 to 8 are in too (#68), a moment after the first render.
    await waitFor(() => expect(document.title).toBe('Elsa - Snow Queen · Card studio · Inkweave admin'));
    await user.click(modes().newCard);
    await waitFor(() => expect(document.title).toBe('Card studio · Inkweave admin'));
  });

  it('moves no focus on a switch that leaves it on <body>, as a click in Safari does (R-48)', async () => {
    const {router} = renderStudio({path: '/studio?mode=edit'});
    const {newCard, editCard} = modes();
    // Safari, and Firefox on macOS, focus no button a click presses, and fireEvent.click doesn't either.
    expect(document.body).toHaveFocus();
    fireEvent.click(newCard);
    await waitFor(() => expect(revealSetButton()).toBeInTheDocument());
    expect(document.body).toHaveFocus();

    fireEvent.click(editCard);
    await waitFor(() => expect(router.state.location.search).toBe('?mode=edit'));
    expect(await screen.findByRole('searchbox', {name: 'Search cards'})).toBeInTheDocument();
    expect(document.body).toHaveFocus();
  });

  it('opens the other mode at the top of the body, a card in the URL too, with focus still on the switch', async () => {
    const {user} = renderStudio({path: '/studio?mode=edit&card=2983'});
    const {newCard} = modes();
    const body = screen.getByRole('main').lastElementChild as HTMLElement;
    body.scrollTop = 500;
    await user.click(newCard);
    await waitFor(() => expect(body.scrollTop).toBe(0));
    expect(newCard).toHaveFocus();
  });
});

describe('StudioPage: the layout (R-63, R-64)', () => {
  it('lays out narrow until the root measures STUDIO_WIDE_MIN, card first when wide, moving each region under the set bar', async () => {
    const {user} = renderStudio();
    await chooseRevealSet(user);
    const aside = screen.getByRole('complementary', {name: 'Publish'});
    expect(regionOrder()).toEqual(['bar', 'form', 'card', 'aside']);

    resize(STUDIO_WIDE_MIN);
    expect(regionOrder()).toEqual(['bar', 'card', 'form', 'aside']);
    expect(aside.parentElement?.parentElement).toHaveStyle({display: 'grid'});
    // Moved, not remounted (R-63).
    expect(screen.getByRole('complementary', {name: 'Publish'})).toBe(aside);

    resize(STUDIO_WIDE_MIN - 1);
    expect(regionOrder()).toEqual(['bar', 'form', 'card', 'aside']);
  });
});

describe('StudioPage: New card', () => {
  beforeEach(() => {
    // Wide, so every field of the form shows at once.
    measured.width = STUDIO_WIDE_MIN;
  });

  it('asks before leaving with a draft, and stays with it (R-58)', async () => {
    const {router, user} = renderStudio();
    await chooseRevealSet(user);
    await user.type(nameField(), 'Mei');
    act(() => void router.navigate('/'));
    const dialog = await leaveDialog();
    expect(dialog).toHaveTextContent("Your new card isn't published yet. Leaving Card studio drops it.");

    await user.click(within(dialog).getByRole('button', {name: 'Stay on this page'}));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(router.state.location.pathname).toBe('/studio');
    expect(nameField()).toHaveValue('Mei');
  });

  it('starts a new workspace, drafts and set dropped, when another tab saves another token (R-84)', async () => {
    const {user} = renderStudio();
    await chooseRevealSet(user);
    await user.type(nameField(), 'Mei');
    // The shared token store hears the storage event: no forget on this page, and no question.
    act(() => {
      localStorage.setItem(TOKEN_KEY, 'other');
      window.dispatchEvent(new StorageEvent('storage', {key: TOKEN_KEY}));
    });
    await waitFor(() => expect(revealSetButton()).toBeInTheDocument());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await chooseRevealSet(user);
    expect(nameField()).toHaveValue('');
  });

  it('publishes the card, says when it goes live, and moves focus to the outcome (R-59, R-66)', async () => {
    let land: (result: {commitUrl: string}) => void = () => {};
    vi.mocked(commitNewCard).mockReturnValue(new Promise((resolve) => (land = resolve)));
    const {router, user} = renderStudio();
    await fillNewCard({user, name: 'Mei'});
    await user.click(publishButton());
    expect(publishButton()).toHaveTextContent('Publishing…');
    expect(commitNewCard).toHaveBeenCalledWith(expect.objectContaining({token: 'tok', imageExt: 'png'}));

    dropFocusToBody();
    await act(async () => land({commitUrl: COMMIT_URL}));
    const outcome = screen.getByText(/^Committed\./).closest<HTMLElement>('[role="status"]');
    expect(outcome).toHaveTextContent('Vercel is deploying it: allow 15 to 20 minutes before it shows on inkweave.ink.');
    expect(within(outcome as HTMLElement).getByRole('link', {name: 'View commit'})).toHaveAttribute('href', COMMIT_URL);
    await waitFor(() => expect(outcome).toContainElement(document.activeElement as HTMLElement));

    // The draft cleared with the publish, so nothing holds the way out.
    act(() => void router.navigate('/'));
    expect(await screen.findByRole('heading', {level: 1, name: 'Overview'})).toBeInTheDocument();
  });

  // Doberjohn/inkweave-admin#54: a drop hands the file over as a pick does, so useImageUpload's checks run on it.
  it('stages a scan dropped on the preview through the same checks as a pick', async () => {
    const {user} = renderStudio();
    await chooseRevealSet(user);
    const cover = screen.getByLabelText('Click or drop to upload scan').closest('label') as HTMLElement;
    fireEvent.drop(cover, {dataTransfer: fileDrag(new File(['GIF89a'], 'mei.gif', {type: 'image/gif'}))});
    const preview = within(screen.getByRole('region', {name: 'Card preview'}));
    expect(await preview.findByText('mei.gif is not a JPEG, PNG or WebP image.')).toBeInTheDocument();
  });

  it('keeps a file dropped beside the drop targets from opening in the tab, while the studio is open', async () => {
    const {router} = renderStudio();
    expect(refusesStrayFile()).toBe(true);
    act(() => void router.navigate('/'));
    expect(await screen.findByRole('heading', {level: 1, name: 'Overview'})).toBeInTheDocument();
    // The listeners went with the page.
    expect(refusesStrayFile()).toBe(false);
  });

  it("says leaving mid-publish won't stop it (R-58)", async () => {
    vi.mocked(commitNewCard).mockReturnValue(new Promise(() => {}));
    const {router, user} = renderStudio();
    await fillNewCard({user, name: 'Mei'});
    await user.click(publishButton());
    act(() => void router.navigate('/'));
    const dialog = await leaveDialog();
    expect(dialog).toHaveTextContent(
      "A publish to master is in progress. Leaving won't stop it, and you won't see whether it landed.",
    );
    expect(dialog).not.toHaveTextContent('drops it');
  });

  it('loads a failed card list again from the checklist, keeping the draft, and hands focus to the form (R4-8f, R-48)', async () => {
    const retryLoad = vi.fn();
    const {user} = renderStudio();
    await chooseRevealSet(user);
    // Step 2 shows only once the list has loaded, so here it fails under a chosen set.
    setCardList({cards: [], error: new Error('Failed to fetch local cards: 500')});
    Object.assign(cardList.value ?? {}, {retryLoad});
    await user.type(nameField(), 'Mei');
    const checklist = within(screen.getByRole('region', {name: 'Ready to publish'}));
    await user.click(checklist.getByRole('button', {name: 'Load the card list again'}));
    expect(retryLoad).toHaveBeenCalledOnce();

    // The list's retry clears its error as its read starts (the app's useCardData), and the control goes with it.
    setCardList({cards: [ELSA], isLoading: true});
    await waitFor(() => expect(screen.getByRole('textbox', {name: 'Collector number'})).toHaveFocus());
    expect(checklist.queryByRole('button', {name: 'Load the card list again'})).not.toBeInTheDocument();
    expect(nameField()).toHaveValue('Mei');
  });

  it('forgets a token GitHub rejects only once asked, then hands focus to the gate (R-26, R-84)', async () => {
    vi.mocked(commitNewCard).mockRejectedValue(new Error(REJECTED_PUBLISH));
    const {user} = renderStudio();
    await fillNewCard({user, name: 'Mei'});
    await user.click(publishButton());
    const forget = await screen.findByRole('button', {name: 'Forget token'});

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.click(forget);
    expect(confirm).toHaveBeenCalledWith('Forget the token and drop your new card?');
    expect(localStorage.getItem(TOKEN_KEY)).toBe('tok');

    confirm.mockReturnValue(true);
    await user.click(forget);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    await waitFor(() => expect(screen.getByLabelText('GitHub token')).toHaveFocus());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
