import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Link, RouterProvider, createMemoryRouter} from 'react-router-dom';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {cardList} from '../../studio/__tests__/studioStores';
import {FEATURED_CARDS, GOLIATH, SIX, entriesFor} from '../featuredFixtures';
import {FeaturedPage} from '../FeaturedPage';
import {staleFeatured} from '../githubClient';

const {readFeatured, commitFeatured} = vi.hoisted(() => ({readFeatured: vi.fn(), commitFeatured: vi.fn()}));
vi.mock('../githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../githubClient')>()),
  readFeatured,
  commitFeatured,
}));

// The card list comes from the studio tests' store (studioStores.ts); the rest of the bridge is real.
vi.mock('../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...(await import('../../studio/__tests__/studioStores')).STORE_HOOKS,
}));

const TOKEN_KEY = 'inkweave.reveal-admin.gh-token';
const COMMIT_URL = 'https://github.com/Doberjohn/inkweave/commit/abc1234def';
const LOADED = entriesFor(SIX);
const PICKED = entriesFor([SIX[0], GOLIATH, ...SIX.slice(2)]);

/** The card list the shell would give the page. */
function setCards(cards: readonly LorcanaCard[] = FEATURED_CARDS) {
  cardList.value = {
    cards: [...cards],
    isLoading: false,
    error: null,
    getCardById: (id) => cards.find((card) => card.id === id),
    retryLoad: () => {},
  };
  act(() => cardList.listeners.forEach((onChange) => onChange()));
}

/** inkweave.ink's /data/featuredCards.json, serving `ids`. */
function serve(ids: readonly string[]) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
    new Response(JSON.stringify({cards: ids.map((id) => ({id: Number(id)}))})),
  );
}

/** The page under a data router, as AdminShell's routes render it, with a link out to test the guard. */
function renderPage({token = 'tok'}: {token?: string | null} = {}) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  const router = createMemoryRouter(
    [
      {
        path: '/featured',
        element: (
          <>
            <Link to="/">Overview</Link>
            <FeaturedPage />
          </>
        ),
      },
      {path: '/', element: <h1>Overview</h1>},
    ],
    {initialEntries: ['/featured']},
  );
  render(<RouterProvider router={router} />);
  return router;
}

const slot = (ink: string) => screen.getByRole('region', {name: `${ink} slot`});
const saveButton = () => screen.getByRole('button', {name: /^Save to/});

/** Opens a slot's search and picks the card named `name`. */
async function pick(user: ReturnType<typeof userEvent.setup>, ink: string, name: string) {
  await user.click(within(slot(ink)).getByRole('button', {name: `Change card ${ink}`}));
  const dialog = await screen.findByRole('dialog', {name: `Pick the ${ink} card`});
  await user.click(within(dialog).getByRole('button', {name: new RegExp(name)}));
}

beforeEach(() => {
  // Blocks, not an arrow's value: mockReset() returns the mock, and Vitest calls a function a hook returns as its teardown.
  readFeatured.mockReset();
  commitFeatured.mockReset();
  readFeatured.mockResolvedValue(LOADED);
  setCards();
  serve(SIX.map((card) => card.id));
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('FeaturedPage', () => {
  it('asks for a token under its own title and names the branch it writes to', () => {
    renderPage({token: null});
    expect(screen.getByRole('heading', {level: 1, name: 'Featured cards'})).toBeInTheDocument();
    expect(screen.getByRole('heading', {level: 2, name: 'GitHub token'})).toBeInTheDocument();
    expect(screen.getByText(/writes to Doberjohn\/inkweave/i)).toBeInTheDocument();
  });

  it('shows the branch file’s six, Amber to Steel, each with its name and id', async () => {
    renderPage();
    await screen.findByRole('region', {name: 'Amber slot'});
    const inks = screen.getAllByRole('region', {name: / slot$/}).map((region) => region.getAttribute('aria-label'));
    expect(inks).toEqual(['Amber slot', 'Amethyst slot', 'Emerald slot', 'Ruby slot', 'Sapphire slot', 'Steel slot']);
    expect(within(slot('Amethyst')).getByText('Un Poco Loco')).toBeInTheDocument();
    expect(within(slot('Amethyst')).getByText('3328')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    expect(await screen.findByText(/inkweave.ink shows these six/)).toBeInTheDocument();
  });

  it('offers only the slot’s ink with art in its search, and stages and undoes a pick', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('region', {name: 'Amethyst slot'});
    await user.click(within(slot('Amethyst')).getByRole('button', {name: 'Change card Amethyst'}));
    const dialog = await screen.findByRole('dialog', {name: 'Pick the Amethyst card'});
    // Amethyst's cards with art, a dual-ink one included; Madam Mim has no art, the rest other inks.
    const rows = within(within(dialog).getByRole('list', {name: 'Amethyst cards'})).getAllByRole('button');
    expect(rows.map((row) => row.querySelector('span span')?.textContent)).toEqual([
      'Un Poco Loco',
      'Goliath - Transformed Warrior',
      'Christopher Robin - Hunny Sage',
    ]);
    await user.click(within(dialog).getByRole('button', {name: /Goliath/}));

    expect(within(slot('Amethyst')).getByText('Goliath - Transformed Warrior')).toBeInTheDocument();
    expect(within(slot('Amethyst')).getByText(/Was Un Poco Loco/)).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: '1 change'})).toBeInTheDocument();
    expect(saveButton()).toBeEnabled();

    await user.click(within(slot('Amethyst')).getByRole('button', {name: 'Undo Amethyst'}));
    expect(within(slot('Amethyst')).getByText('Un Poco Loco')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('keeps Save off, saying why, when two slots hold one card', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('region', {name: 'Amethyst slot'});
    // Christopher Robin carries Amethyst and Sapphire, so both slots offer it.
    await pick(user, 'Amethyst', 'Christopher Robin');
    await pick(user, 'Sapphire', 'Christopher Robin');
    expect(within(slot('Sapphire')).getByText('The Amethyst slot holds this card too.')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('keeps Save off when the branch file leaves an ink with no card', async () => {
    const user = userEvent.setup();
    // Edited by hand: Goliath in Amber's place, so no card carries Amber.
    readFeatured.mockResolvedValue(entriesFor([GOLIATH, ...SIX.slice(1)]));
    renderPage();
    await screen.findByRole('region', {name: 'Ruby slot'});
    await pick(user, 'Amethyst', 'Christopher Robin');
    expect(saveButton()).toBeDisabled();
    expect(screen.getByText(/no card is Amber/)).toBeInTheDocument();
  });

  it('saves one commit and says when inkweave.ink shows it', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('region', {name: 'Amethyst slot'});
    await pick(user, 'Amethyst', 'Goliath');
    commitFeatured.mockResolvedValueOnce({commitUrl: COMMIT_URL});
    readFeatured.mockResolvedValue(PICKED);
    await user.click(saveButton());

    expect(commitFeatured).toHaveBeenCalledTimes(1);
    expect(commitFeatured.mock.calls[0][0]).toMatchObject({entries: PICKED, loaded: LOADED});
    const status = await screen.findByText(/Saved in/);
    expect(within(status).getByRole('link', {name: 'abc1234'})).toHaveAttribute('href', COMMIT_URL);
    expect(status).toHaveTextContent('about 7 to 12 minutes');
    // inkweave.ink still serves the old six until the deploy finishes.
    await waitFor(() => expect(screen.getByText(/still shows the previous six/)).toBeInTheDocument());
  });

  it('offers Reload after a stale refusal, which reads the file again and drops the pick', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('region', {name: 'Amethyst slot'});
    await pick(user, 'Amethyst', 'Goliath');
    commitFeatured.mockRejectedValueOnce(staleFeatured('master'));
    await user.click(saveButton());
    readFeatured.mockResolvedValue(PICKED);
    await user.click(await screen.findByRole('button', {name: 'Reload featuredCardIds.json'}));

    await waitFor(() => expect(within(slot('Amethyst')).getByText('Goliath - Transformed Warrior')).toBeInTheDocument());
    expect(within(slot('Amethyst')).queryByText(/Was/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', {name: 'No changes'})).toBeInTheDocument();
  });

  it('says a branch other than master never reaches inkweave.ink', async () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'rehearsal');
    renderPage();
    expect(await screen.findByText(/inkweave.ink builds from master, not rehearsal/)).toBeInTheDocument();
  });

  it('asks before leaving with a staged pick', async () => {
    const user = userEvent.setup();
    const router = renderPage();
    await screen.findByRole('region', {name: 'Amethyst slot'});
    await pick(user, 'Amethyst', 'Goliath');
    await user.click(screen.getByRole('link', {name: 'Overview'}));

    const dialog = await screen.findByRole('dialog', {name: 'Leave Featured cards?'});
    expect(dialog).toHaveTextContent('1 featured card pick isn’t saved yet. Leaving this page drops it.');
    await user.click(within(dialog).getByRole('button', {name: 'Stay on this page'}));
    expect(router.state.location.pathname).toBe('/featured');
  });
});
