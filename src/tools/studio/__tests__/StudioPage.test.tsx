import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, screen, waitFor, waitForElementToBeRemoved, within} from '@testing-library/react';
import {commitNewCard} from '../../reveal/githubClient';
import {lorcanaCard} from '../../analytics/cards/cardFixtures';
import {STUDIO_SUBTITLE} from '../studioCopy';
import {STUDIO_WIDE_MIN} from '../studioLayout';
import {TOKEN_KEY, dropFocusToBody, fillNewCard, renderStudio, setCardList, stubFetch} from './studioHarness';
import {measured} from './studioStores';

// Every GitHub read stays real against the fetch stub; only New reveal's commit is faked.
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
    newReveal: group.getByRole('button', {name: 'New reveal'}),
    editCard: group.getByRole('button', {name: 'Edit card'}),
  };
}
const nameField = () => screen.getByRole('textbox', {name: 'Name'});
const publishButton = () => screen.getByRole('button', {name: /^Publish/});
const leaveDialog = () => screen.findByRole('dialog', {name: 'Leave this page?'});

/** The measured root's regions in DOM order, told apart by what each holds. */
function regionOrder() {
  const aside = screen.getByRole('complementary', {name: 'Publish'});
  const root = aside.parentElement?.parentElement;
  return [...(root?.children ?? [])].map((region) => {
    if (region.contains(aside)) return 'aside';
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

  it('opens New reveal with a token, under one h1 that names the branch, and leaves Forget token to the sidebar', () => {
    renderStudio();
    expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1);
    expect(screen.getByText(STUDIO_SUBTITLE)).toBeInTheDocument();
    expect(screen.getByText('master')).toBeInTheDocument();
    expect(modes().newReveal).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', {name: 'Forget token'})).not.toBeInTheDocument();
    // R-72, through the real controller: a fresh draft's missing scan is the checklist's, not the preview's.
    const preview = within(screen.getByRole('region', {name: 'Card preview'}));
    expect(preview.queryByText('Upload a card image')).not.toBeInTheDocument();
  });

  it('hands focus to the form after Save token: its first field, when wide (R-59)', async () => {
    measured.width = STUDIO_WIDE_MIN;
    const {user} = renderStudio({token: null});
    await user.type(screen.getByLabelText('GitHub token'), 'tok');
    await user.click(screen.getByRole('button', {name: 'Save token'}));
    await waitFor(() => expect(screen.getByRole('textbox', {name: 'Collector number'})).toHaveFocus());
    expect(localStorage.getItem(TOKEN_KEY)).toBe('tok');
  });

  it('names a rehearsal branch on Publish and in the header', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    renderStudio();
    expect(publishButton()).toHaveTextContent('Publish to admin-verify');
    expect(screen.getByText('admin-verify')).toBeInTheDocument();
  });
});

describe('StudioPage: the mode switch (R-57)', () => {
  it('keeps the New reveal draft across a switch to Edit card and back, and never asks', async () => {
    measured.width = STUDIO_WIDE_MIN;
    const {router, user} = renderStudio();
    const {newReveal, editCard} = modes();
    await user.type(nameField(), 'Mei');
    await user.click(editCard);
    await waitFor(() => expect(router.state.location.search).toBe('?mode=edit'));
    expect(screen.queryByRole('textbox', {name: 'Name'})).not.toBeInTheDocument();

    await user.click(newReveal);
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(nameField()).toHaveValue('Mei');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('pushes the switch, card and all, so Back returns to the other mode; the current mode does nothing', async () => {
    const {router, user} = renderStudio({path: '/studio?mode=edit&card=2983'});
    const {newReveal, editCard} = modes();
    const {key} = router.state.location;
    await user.click(editCard);
    expect(router.state.location.key).toBe(key);

    await user.click(newReveal);
    await waitFor(() => expect(router.state.location.search).toBe('?card=2983'));
    expect(router.state.historyAction).toBe('PUSH');
    act(() => void router.navigate(-1));
    await waitFor(() => expect(editCard).toHaveAttribute('aria-pressed', 'true'));
  });

  it("names the tab after Edit card's card, and New reveal after the page (R-51)", async () => {
    const {user} = renderStudio({path: '/studio?mode=edit&card=2983'});
    expect(document.title).toBe('Elsa - Snow Queen · Card studio · Inkweave admin');
    await user.click(modes().newReveal);
    await waitFor(() => expect(document.title).toBe('Card studio · Inkweave admin'));
  });

  it('opens the other mode at the top of the body, a card in the URL too, with focus still on the switch', async () => {
    const {user} = renderStudio({path: '/studio?mode=edit&card=2983'});
    const {newReveal} = modes();
    const body = screen.getByRole('main').lastElementChild as HTMLElement;
    body.scrollTop = 500;
    await user.click(newReveal);
    await waitFor(() => expect(body.scrollTop).toBe(0));
    expect(newReveal).toHaveFocus();
  });
});

describe('StudioPage: the layout (R-63, R-64)', () => {
  it('lays out narrow until the root measures STUDIO_WIDE_MIN, card first when wide, moving each region', () => {
    renderStudio();
    const aside = screen.getByRole('complementary', {name: 'Publish'});
    expect(regionOrder()).toEqual(['form', 'card', 'aside']);

    resize(STUDIO_WIDE_MIN);
    expect(regionOrder()).toEqual(['card', 'form', 'aside']);
    expect(aside.parentElement?.parentElement).toHaveStyle({display: 'grid'});
    // Moved, not remounted (R-63).
    expect(screen.getByRole('complementary', {name: 'Publish'})).toBe(aside);

    resize(STUDIO_WIDE_MIN - 1);
    expect(regionOrder()).toEqual(['form', 'card', 'aside']);
  });
});

describe('StudioPage: New reveal', () => {
  beforeEach(() => {
    // Wide, so every field of the form shows at once.
    measured.width = STUDIO_WIDE_MIN;
  });

  it('asks before leaving with a draft, and stays with it (R-58)', async () => {
    const {router, user} = renderStudio();
    await user.type(nameField(), 'Mei');
    act(() => void router.navigate('/'));
    const dialog = await leaveDialog();
    expect(dialog).toHaveTextContent("Your New reveal card isn't published yet. Leaving Card studio drops it.");

    await user.click(within(dialog).getByRole('button', {name: 'Stay on this page'}));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(router.state.location.pathname).toBe('/studio');
    expect(nameField()).toHaveValue('Mei');
  });

  it('starts a new workspace, drafts dropped, when another tab saves another token (R-84)', async () => {
    const {user} = renderStudio();
    await user.type(nameField(), 'Mei');
    // The shared token store hears the storage event: no forget on this page, and no question.
    act(() => {
      localStorage.setItem(TOKEN_KEY, 'other');
      window.dispatchEvent(new StorageEvent('storage', {key: TOKEN_KEY}));
    });
    await waitFor(() => expect(nameField()).toHaveValue(''));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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

  it('forgets a token GitHub rejects only once asked, then hands focus to the gate (R-26, R-84)', async () => {
    vi.mocked(commitNewCard).mockRejectedValue(new Error(REJECTED_PUBLISH));
    const {user} = renderStudio();
    await fillNewCard({user, name: 'Mei'});
    await user.click(publishButton());
    const forget = await screen.findByRole('button', {name: 'Forget token'});

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.click(forget);
    expect(confirm).toHaveBeenCalledWith('Forget the token and drop your New reveal card?');
    expect(localStorage.getItem(TOKEN_KEY)).toBe('tok');

    confirm.mockReturnValue(true);
    await user.click(forget);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    await waitFor(() => expect(screen.getByLabelText('GitHub token')).toHaveFocus());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
