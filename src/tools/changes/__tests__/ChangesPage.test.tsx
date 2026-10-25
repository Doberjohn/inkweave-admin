import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {act, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import {HISTORY_PAGE, type CommitFiles, type ListedCommit} from '../../../github/githubHistory';
import {CardArtContext} from '../../../shell/knownCards';
import {artLookup, shownArt, type ArtById} from '../../../test/cardLinks';
import {ChangesPage} from '../ChangesPage';
import {commitOf, listed, stubHistory, type FakeRepo} from './historyHarness';

const TOKEN_KEY = 'inkweave.reveal-admin.gh-token';
const PREVIEW = 'apps/web/public/data/previewCards.json';
const RAW = 'apps/web/public/card-images-raw';
const CATALOG = 'scripts/data/promo-printings.json';
const TUNING = 'packages/synergy-engine/src/data/tuning.json';

// The day panels are the viewer's days: Athens is UTC+3 until the clocks change on Oct 25.
const ORIGINAL_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
beforeAll(() => {
  vi.stubEnv('TZ', 'Europe/Athens');
});
afterAll(() => {
  vi.stubEnv('TZ', ORIGINAL_ZONE);
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

const VERSIONS = listed({sha: 'v1', date: '2026-10-22T14:13:00Z', message: 'chore(collection): set the versions of 1 printing from Card studio'});
const TUNE = listed({sha: 't1', date: '2026-10-19T08:35:00Z', message: 'chore(engine): tune scoring copy + scores', login: 'claude'});
const SCAN = listed({sha: 's1', date: '2026-10-08T11:25:00Z', message: 'fix(card-images): update image for Pepita - Watchful Alebrije [14040]'});
const CONVERT = listed({
  sha: 'bot',
  date: '2026-10-08T11:30:00Z',
  message: 'chore(reveals): convert raw scans to AVIF [skip ci]',
  login: 'github-actions[bot]',
});
const REVEAL = listed({sha: 'r1', date: '2026-10-08T09:00:00Z', message: 'feat(reveals): add Chemical Reaction (1499)'});

/** The catalog with one group, Bruno's, holding `promo`. */
const catalog = (promo: object) =>
  JSON.stringify({fold: [{baseId: 1936, fullName: 'Bruno Madrigal - Undetected Uncle', variants: [promo]}]});

const D23 = {id: 1194, number: 4, promoGrouping: 'D23'};

const REPO: FakeRepo = {
  histories: {[CATALOG]: [VERSIONS], [TUNING]: [TUNE], [RAW]: [CONVERT, SCAN, REVEAL], [PREVIEW]: [REVEAL]},
  commits: {v1: commitOf({sha: 'v1', parent: 'p1', files: [{filename: CATALOG, status: 'modified'}]})},
  files: {[`p1:${CATALOG}`]: catalog(D23), [`v1:${CATALOG}`]: catalog({...D23, finishes: ['normal']})},
};

/** The page under the shell's card art (`art`), with `token` saved, or none for null. */
function renderPage({token = 'tok', art = {}}: {token?: string | null; art?: ArtById} = {}) {
  if (token !== null) localStorage.setItem(TOKEN_KEY, token);
  const router = createMemoryRouter([{path: '/changes', element: <ChangesPage />}, {path: '*', element: null}], {
    initialEntries: ['/changes'],
  });
  render(
    <CardArtContext value={artLookup(art)}>
      <RouterProvider router={router} />
    </CardArtContext>,
  );
  return router;
}

/** The changes listed, day by day: each day's heading, and its changes' titles. */
function listedDays() {
  return screen.getAllByRole('region').map((region) => ({
    day: within(region).getByRole('heading', {level: 2}).textContent,
    titles: within(region)
      .getAllByRole('heading', {level: 3})
      .map((heading) => heading.querySelector('span')?.textContent),
  }));
}

describe('ChangesPage', () => {
  it('asks for a token under its own title first, and names no branch it writes to', () => {
    stubHistory(REPO);
    renderPage({token: null});
    expect(screen.getByRole('heading', {level: 1, name: 'Change history'})).toBeInTheDocument();
    expect(screen.getByRole('heading', {level: 2, name: 'GitHub token'})).toBeInTheDocument();
    expect(screen.queryByText(/writes to Doberjohn\/inkweave/i)).not.toBeInTheDocument();
  });

  it("lists the followed paths' changes by the viewer's day, newest first, without the bot's conversions", async () => {
    const stub = stubHistory(REPO);
    renderPage();
    await screen.findByText('Set the versions of 1 printing from Card studio');
    expect(listedDays()).toEqual([
      {day: 'Thu Oct 22', titles: ['Set the versions of 1 printing from Card studio']},
      {day: 'Mon Oct 19', titles: ['Tune scoring copy + scores']},
      {day: 'Thu Oct 8', titles: ['Update image for Pepita - Watchful Alebrije [14040]', 'Add Chemical Reaction (1499)']},
    ]);
    // A commit that changed two paths is one change with both tags.
    const reveal = screen.getByRole('button', {name: /Add Chemical Reaction/});
    expect(within(reveal).getByText('preview cards')).toBeInTheDocument();
    expect(within(reveal).getByText('scans')).toBeInTheDocument();
    expect(screen.getByText('4 changes')).toBeInTheDocument();
    // Each followed path's first page, from the branch admin writes to.
    expect(stub.asked().filter((asked) => asked.startsWith('/commits?'))).toHaveLength(7);
    expect(stub.asked()).toContain(`/commits?sha=master&path=${TUNING}&per_page=${HISTORY_PAGE}&page=1`);
  });

  it('opens a change onto what it changed, read from its commit, with who made it and its commit', async () => {
    const user = userEvent.setup();
    stubHistory(REPO);
    renderPage();
    const versions = await screen.findByRole('button', {name: /Set the versions of 1 printing/});
    expect(versions).toHaveAttribute('aria-expanded', 'false');

    await user.click(versions);
    expect(versions).toHaveAttribute('aria-expanded', 'true');
    const details = document.getElementById(versions.getAttribute('aria-controls') ?? '') as HTMLElement;
    expect(await within(details).findByText(/→ Normal only/)).toHaveTextContent('Versions: Both (by rarity) → Normal only');
    expect(within(details).getByRole('link', {name: 'Bruno Madrigal - Undetected Uncle 4/D23'})).toHaveAttribute(
      'href',
      '/studio?mode=edit&card=1936',
    );
    expect(within(details).getByRole('link', {name: 'v1 on GitHub'})).toHaveAttribute(
      'href',
      'https://github.com/Doberjohn/inkweave/commit/v1',
    );
    expect(within(details).getByText(/^Doberjohn ·/)).toHaveTextContent('Doberjohn · 2026-10-22 17:13 · v1 on GitHub');
  });

  it("shows a printing's own art over its name, not its card's", async () => {
    const user = userEvent.setup();
    stubHistory(REPO);
    renderPage({art: {'1194': '/card-images/1194.avif', '1936': '/card-images/1936.avif'}});
    await user.click(await screen.findByRole('button', {name: /Set the versions of 1 printing/}));
    const name = await screen.findByRole('link', {name: 'Bruno Madrigal - Undetected Uncle 4/D23'});
    act(() => name.focus());
    expect(shownArt('/card-images/1194.avif')).not.toBeNull();
    expect(shownArt('/card-images/1936.avif')).toBeNull();
  });

  it('offers Forget token when GitHub rejects the token reading a change, and Forget token returns to the gate', async () => {
    const user = userEvent.setup();
    const stub = stubHistory(REPO);
    renderPage();
    const versions = await screen.findByRole('button', {name: /Set the versions of 1 printing/});
    stub.fetch.mockImplementation(async () => new Response('{"message":"Bad credentials"}', {status: 401}));
    await user.click(versions);
    expect(await screen.findByRole('alert')).toHaveTextContent(/What this change did could not be read: GitHub 401 on/);

    await user.click(screen.getByRole('button', {name: 'Forget token'}));
    expect(screen.getByRole('heading', {level: 2, name: 'GitHub token'})).toBeInTheDocument();
  });

  it('says an area has no changes at all once the whole history is read', async () => {
    const user = userEvent.setup();
    stubHistory({histories: {[TUNING]: [TUNE]}});
    renderPage();
    await screen.findByText('Tune scoring copy + scores');
    await user.click(screen.getByRole('button', {name: 'Scans'}));
    expect(screen.getByText('No changes to scans.')).toBeInTheDocument();
  });

  it('shows only the changes to the area the filter picks', async () => {
    const user = userEvent.setup();
    stubHistory(REPO);
    renderPage();
    await screen.findByText('Tune scoring copy + scores');
    await user.click(screen.getByRole('button', {name: 'Tuning'}));
    expect(listedDays()).toEqual([{day: 'Mon Oct 19', titles: ['Tune scoring copy + scores']}]);
    // The count beside the filter, and the day's own.
    expect(screen.getAllByText('1 change')).toHaveLength(2);
  });

  it('reads the next pages for Show older changes, until every path is read to its start', async () => {
    const user = userEvent.setup();
    // A full page of scans, all newer than the tuning change, so the tuning change waits for the scans' next page.
    const scans: ListedCommit[] = Array.from({length: HISTORY_PAGE + 1}, (_, i) =>
      listed({sha: `scan${i}`, date: new Date(Date.UTC(2026, 9, 21, 12) - i * 60_000).toISOString(), message: `fix(card-images): scan ${i}`}),
    );
    const old = listed({sha: 'old', date: '2026-09-01T12:00:00Z', message: 'chore(engine): tune scoring copy + scores'});
    stubHistory({histories: {[RAW]: scans, [TUNING]: [old]}});
    renderPage();
    await screen.findByText('Scan 0');
    expect(screen.queryByText('Tune scoring copy + scores')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'Show older changes'}));
    expect(await screen.findByText('Tune scoring copy + scores')).toBeInTheDocument();
    expect(screen.getByText(`Scan ${HISTORY_PAGE}`)).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Show older changes'})).not.toBeInTheDocument();
    // The button went with the last page, so the end of the history takes focus (R-48).
    await waitFor(() => expect(screen.getByText('That’s the whole history.')).toHaveFocus());
  });

  it("hands focus to a change's header when Try again reads its details again", async () => {
    const user = userEvent.setup();
    const commits: Record<string, CommitFiles> = {};
    stubHistory({...REPO, commits});
    renderPage();
    const versions = await screen.findByRole('button', {name: /Set the versions of 1 printing/});
    await user.click(versions);
    const tryAgain = await screen.findByRole('button', {name: 'Try again'});
    expect(screen.getByRole('alert')).toHaveTextContent('What this change did could not be read: GitHub 404 on');

    commits.v1 = REPO.commits?.v1 as CommitFiles;
    await user.click(tryAgain);
    expect(versions).toHaveFocus();
    expect(await screen.findByText(/Both \(by rarity\) → Normal only/)).toBeInTheDocument();
  });

  it('offers Try again and Forget token when GitHub rejects the token, and Forget token returns to the gate', async () => {
    const user = userEvent.setup();
    const stub = stubHistory(REPO);
    stub.fetch.mockImplementation(async () => new Response('{"message":"Bad credentials"}', {status: 401}));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be read: GitHub 401 on/);

    await user.click(screen.getByRole('button', {name: 'Forget token'}));
    expect(screen.getByRole('heading', {level: 2, name: 'GitHub token'})).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('GitHub token')).toHaveFocus());
  });

  it('reads the history again on Try again', async () => {
    const user = userEvent.setup();
    const stub = stubHistory(REPO);
    stub.fetch.mockImplementationOnce(async () => new Response('Server Error', {status: 500}));
    renderPage();
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', {name: 'Try again'}));
    expect(await screen.findByText('Set the versions of 1 printing from Card studio')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // Try again went with the error, so the view the read landed on takes focus: its filter (R-48).
    await waitFor(() => expect(screen.getByRole('button', {name: 'All'})).toHaveFocus());
  });
});
