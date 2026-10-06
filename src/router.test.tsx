import {act, render, renderHook, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import {useGithubToken} from './github/useGithubToken';
import {routes} from './router';
import {NAV_ITEMS, isWritePath, navItemFor} from './shell/nav';
import type {VoteAnalytics} from './tools/analytics/voteAnalyticsTypes';

function renderAt(path: string) {
  return render(<RouterProvider router={createMemoryRouter(routes, {initialEntries: [path]})} />);
}

const sidebarNav = () => within(screen.getByRole('navigation', {name: 'Admin'}));
const WRITE_PATHS = NAV_ITEMS.filter((item) => item.writes).map((item) => item.path);
// Every page that writes names the repo: "Writes to Doberjohn/inkweave", or its
// own label that keeps it ("Tuning writes to Doberjohn/inkweave").
const BRANCH_NOTICE = /writes to Doberjohn\/inkweave/i;

beforeEach(() => {
  // The shell's CardDataProvider loads the card data on mount, and the
  // insights pages their artifacts. These tests only check routing, so those
  // fetches never settle.
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  // The token store reads localStorage on every snapshot, so this one clear
  // resets the saved token and the sidebar's collapsed state alike.
  localStorage.clear();
});

describe('admin routes', () => {
  it('shows the Overview at /, current in the sidebar', () => {
    renderAt('/');
    expect(screen.getByRole('heading', {level: 1, name: 'Overview'})).toBeInTheDocument();
    expect(sidebarNav().getByRole('link', {name: 'Overview'})).toHaveAttribute('aria-current', 'page');
  });

  it('marks Overview current on / only', () => {
    // NavLink treats to="/" as exact, so the sidebar needs no `end` prop.
    renderAt('/reveal');
    expect(sidebarNav().getByRole('link', {name: 'Overview'})).not.toHaveAttribute('aria-current');
  });

  it('links every page from the sidebar', () => {
    renderAt('/calibration');
    for (const item of NAV_ITEMS) {
      expect(sidebarNav().getByRole('link', {name: item.label})).toHaveAttribute('href', item.path);
    }
  });

  it("marks only the current page's link", () => {
    renderAt('/reveal');
    expect(sidebarNav().getByRole('link', {name: 'Reveal publisher'})).toHaveAttribute('aria-current', 'page');
    expect(sidebarNav().getByRole('link', {name: 'Calibration & tuning'})).not.toHaveAttribute('aria-current');
  });

  it.each(WRITE_PATHS)('names the branch %s writes to', (path) => {
    renderAt(path);
    expect(screen.getByText(BRANCH_NOTICE)).toHaveTextContent(/writes to Doberjohn\/inkweave master/i);
  });

  it('names a rehearsal branch when one is set', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    renderAt('/reveal');
    expect(screen.getByText('admin-verify')).toBeInTheDocument();
  });

  it.each(['/no-such-page'])('names no branch on %s, which writes nothing', (path) => {
    renderAt(path);
    expect(screen.queryByText(BRANCH_NOTICE)).not.toBeInTheDocument();
  });

  it('shows a not-found page for any other path', () => {
    renderAt('/admin/reveal');
    expect(screen.getByRole('heading', {level: 1, name: 'Not found'})).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'Back to Overview'})).toHaveAttribute('href', '/');
    expect(document.title).toBe('Not found · Inkweave admin');
  });

  it.each(NAV_ITEMS.map((item) => [item.path, item.label] as const))(
    'names the browser tab on %s "%s · Inkweave admin"',
    (path, label) => {
      renderAt(path);
      expect(document.title).toBe(`${label} · Inkweave admin`);
    },
  );

  // nav.ts marks the pages that write, and each page passes `writes` to its own
  // PageLayout: the branch notice shows exactly where the two agree it should.
  it.each(NAV_ITEMS.map((item) => [item.path, item.writes] as const))(
    'shows the branch notice on %s exactly when its nav item writes (%s)',
    (path, writes) => {
      renderAt(path);
      expect(screen.queryByText(BRANCH_NOTICE) != null).toBe(writes);
    },
  );

  const WRITE_PAGES: Array<[path: string, title: string]> = [
    ['/reveal', 'Reveal publisher'],
    ['/image', 'Card images'],
    // The gate fills the tuning aside; the analytics beside it need no token.
    ['/calibration', 'Calibration & tuning'],
  ];

  it.each(WRITE_PAGES)('asks for a GitHub token on %s, under the page title', (path, title) => {
    renderAt(path);
    expect(screen.getByRole('heading', {level: 1, name: title})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Save token'})).toBeInTheDocument();
  });

  // The sidebar's Forget token works on every write page (README section 1), and the
  // shared token state carries it to the page. /calibration's aside offers its own only
  // when GitHub rejects the token (R-26).
  it.each(WRITE_PAGES)("returns %s to the token gate from the sidebar's Forget token", async (path, title) => {
    const user = userEvent.setup();
    const saved = renderHook(() => useGithubToken());
    act(() => saved.result.current.setToken('tok'));
    renderAt(path);
    expect(screen.queryByRole('button', {name: 'Save token'})).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'Forget token'}));
    expect(screen.getByRole('heading', {level: 1, name: title})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Save token'})).toBeInTheDocument();
  });

  // One main landmark per page, whether the gate or the tool fills the body. The
  // pages used to bring their own <main>.
  it.each(WRITE_PAGES)('keeps %s in one main landmark, before and after a token is saved', (path) => {
    const saved = renderHook(() => useGithubToken());
    renderAt(path);
    expect(screen.getAllByRole('main')).toHaveLength(1);

    act(() => saved.result.current.setToken('tok'));
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('keeps the sidebar collapsed across reloads', async () => {
    const first = renderAt('/calibration');
    await userEvent.click(screen.getByRole('button', {name: 'Collapse sidebar'}));
    first.unmount();

    renderAt('/calibration');
    expect(screen.getByRole('button', {name: 'Expand sidebar'})).toHaveAttribute('aria-expanded', 'false');
    expect(sidebarNav().getByRole('link', {name: 'Calibration & tuning'})).toHaveAttribute('title', 'Calibration & tuning');
  });

  it('opens vote activity at /activity, marked current in the sidebar', () => {
    renderAt('/activity');
    expect(screen.getByRole('heading', {name: 'Vote activity'})).toBeInTheDocument();
    // The file's fetch stub never settles, so the page waits on the vote log.
    expect(screen.getByText('Loading vote log...')).toBeInTheDocument();
    expect(sidebarNav().getByRole('link', {name: /Vote activity/})).toHaveAttribute('aria-current', 'page');
  });

  it('opens web analytics at /web, current in the sidebar and with no branch notice', () => {
    renderAt('/web');
    expect(screen.getByRole('heading', {name: 'Web analytics'})).toBeInTheDocument();
    expect(screen.getByText('Loading Web Analytics...')).toBeInTheDocument();
    const link = screen.getByRole('link', {name: /Web analytics/});
    expect(link).toHaveAttribute('href', '/web');
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByText('master')).not.toBeInTheDocument();
  });
});

describe('the Overview nav item', () => {
  it('owns / and nothing under it, and writes nothing', () => {
    expect(navItemFor('/')?.id).toBe('overview');
    expect(navItemFor('/no-such-page')).toBeUndefined();
    expect(isWritePath('/')).toBe(false);
  });
});

describe('calibration routes', () => {
  const ANALYTICS: VoteAnalytics = {
    generatedAt: '2026-06-30T04:12:00Z',
    hasRawVotes: false,
    global: {
      totalVotes: 2054,
      distinctPairs: 1928,
      distinctVoters: null,
      meanGap: -0.3,
      accuracySentiment: null,
      engineSilentPairs: 196,
      weekly: [],
      dimensionFill: null,
    },
    rules: [
      {
        ruleId: 'ramp',
        ruleName: 'Ramp',
        category: 'playstyle',
        scoreVotes: 557,
        pairsVoted: 279,
        meanGap: -0.57,
        accuracySentiment: null,
        pairsCovered: 1671,
      },
    ],
    pairs: [],
  };

  /** Render the routes at `path` and hand back the router, so a test can read where it ended up. */
  function routerAt(path: string) {
    const router = createMemoryRouter(routes, {initialEntries: [path]});
    render(<RouterProvider router={router} />);
    return router;
  }

  beforeEach(() => {
    // src/test/setup.ts has already emptied the artifact cache, and the
    // file's beforeEach stubbed a fetch that never settles. This one answers
    // vote-analytics.json and leaves everything else (the card data, the vote
    // log) pending.
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url === '/admin-data/vote-analytics.json'
          ? Promise.resolve(new Response(JSON.stringify(ANALYTICS), {headers: {'content-type': 'application/json'}}))
          : new Promise<Response>(() => {}),
      ),
    );
  });

  it('redirects the retired /analytics to the Overview', async () => {
    const router = routerAt('/analytics');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    // Replaced, not pushed: Back doesn't land on the redirect again.
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('redirects the retired /tuning to Calibration & tuning', async () => {
    const router = routerAt('/tuning');
    await waitFor(() => expect(router.state.location.pathname).toBe('/calibration'));
    expect(router.state.historyAction).toBe('REPLACE');
    expect(screen.getByRole('heading', {level: 1, name: 'Calibration & tuning'})).toBeInTheDocument();
  });

  it('opens Calibration & tuning at /calibration, with a branch notice', async () => {
    routerAt('/calibration');
    expect(screen.getByRole('heading', {level: 1, name: 'Calibration & tuning'})).toBeInTheDocument();
    expect(await screen.findByText('All pairs')).toBeInTheDocument();
    expect(screen.getByText(/^Tuning writes to Doberjohn\/inkweave/)).toHaveTextContent(
      'Tuning writes to Doberjohn/inkweave master',
    );
  });

  it('opens with the rule from ?rule= selected', async () => {
    routerAt('/calibration?rule=ramp');
    // The row's name starts with the rule's; "Tune Ramp" in the scope row names it too.
    expect(await screen.findByRole('button', {name: /^Ramp\b/})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('All pairs')).not.toBeInTheDocument();
  });

  it('clears that selection when the sidebar link drops ?rule=', async () => {
    const router = routerAt('/calibration?rule=ramp');
    await screen.findByRole('button', {name: /Ramp/, pressed: true});

    await userEvent.click(screen.getByRole('link', {name: 'Calibration & tuning'}));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(await screen.findByRole('button', {name: /Ramp/, pressed: false})).toBeInTheDocument();
    expect(screen.getByText('All pairs')).toBeInTheDocument();
  });
});
