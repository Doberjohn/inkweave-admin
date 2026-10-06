import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen, waitFor, waitForElementToBeRemoved, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {applyTuningEdits, commitTuning} from '../../../tuning/githubClient';
import type {PairStat, RuleStat, VoteAnalytics} from '../../voteAnalyticsTypes';
import type {VoteLog, VoteLogRow} from '../../voteLogTypes';
import {CalibrationPage} from '../CalibrationPage';
import {pairOf} from '../chartFixtures';

// The tuning.json read stays real and runs against the fetch stub; only the commit is faked.
vi.mock('../../../tuning/githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../tuning/githubClient')>()),
  commitTuning: vi.fn(),
}));

const TOKEN_KEY = 'inkweave.reveal-admin.gh-token';
/** The call the gate's "Save token" makes to check a token can push. */
const REPO_URL = 'https://api.github.com/repos/Doberjohn/inkweave';
/** What a publish says when GitHub rejects the token (R-26). */
const REJECTED_PUBLISH = 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: {"message":"Bad credentials"}';
const TUNING_URL =
  'https://api.github.com/repos/Doberjohn/inkweave/contents/packages/synergy-engine/src/data/tuning.json?ref=master';
const COMMIT_URL = 'https://github.com/Doberjohn/inkweave/commit/abc123';

/**
 * A tuning.json unlike the bundled copy, so a pass proves the page edits the
 * live file. No analytics rule reaches Toys: it is a tuning-only row.
 */
const LIVE: TuningConfig = {
  playstyles: {
    ramp: {name: 'Live Ramp', tagline: 'From the branch'},
    'lore-denial': {name: 'Lore Denial', tagline: 'Cards that make your opponent lose lore.'},
    'location-control': {name: 'Locations', tagline: 'Cards that build their value around locations.'},
    toy: {name: 'Toys', tagline: 'Toys that play together.'},
  },
  directRules: {},
  ruleTexts: {'shift-targets': {}, ramp: {scores: {}, templates: {}}},
};

/** A playstyle rule's stat. No playstyleId, so the mapping asks the pinned engine (R-17's fallback). */
function rule(ruleId: string, ruleName: string, meanGap: number | null, scoreVotes: number): RuleStat {
  return {
    ruleId,
    ruleName,
    category: 'playstyle',
    scoreVotes,
    pairsVoted: 2,
    meanGap,
    accuracySentiment: null,
    pairsCovered: 0.1,
  };
}

// Artifact order. Location Search is the first rule under location-control,
// though the table, widest gap first, lists Location Boost above it.
const RULES: RuleStat[] = [
  rule('ramp', 'Ramp', -0.57, 557),
  rule('lore-loss', 'Lore Loss', 0.4, 31),
  rule('location-search', 'Location Search', -1.2, 12),
  rule('location-boost', 'Location Boost', 2.44, 9),
];

// Engine → community: 7 → 4 under Ramp, 3 → 9 under Ramp and Lore Loss, 8 → 7.5 under Lore Loss.
const PAIRS: PairStat[] = [
  pairOf('1', '2', 7, 4, 3, ['ramp']),
  pairOf('3', '4', 3, 9, 1, ['ramp', 'lore-loss']),
  pairOf('5', '6', 8, 7.5, 2, ['lore-loss']),
];

const ANALYTICS: VoteAnalytics = {
  generatedAt: '2026-09-29T04:12:00Z',
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
  rules: RULES,
  pairs: PAIRS,
};

/** The same artifact from a Deploy that had the raw votes. */
const RAW: VoteAnalytics = {
  ...ANALYTICS,
  hasRawVotes: true,
  global: {
    ...ANALYTICS.global,
    distinctVoters: 2,
    dimensionFill: {score: 2054, accuracy: 900, isReal: 300, wouldPlay: 800, difficulty: 120},
  },
};

/** One score vote on a pair (its community score, rounded), at noon UTC on `day`, in Supabase's form. */
function voteOn(pair: PairStat, day: string): VoteLogRow {
  return {
    a: pair.a,
    b: pair.b,
    aName: pair.aName,
    bName: pair.bName,
    score: Math.round(pair.communityScore),
    accuracy: null,
    isReal: null,
    wouldPlay: true,
    difficulty: null,
    whoCarries: null,
    ts: `${day}T12:00:00.000000+00:00`,
    voter: 1,
  };
}

/** Three weeks of votes, newest first as the precompute writes them. The week of Sep 28 has none under Ramp. */
const VOTE_LOG: VoteLog = {
  generatedAt: '2026-09-29T04:12:00Z',
  votes: [
    voteOn(PAIRS[2], '2026-09-29'),
    voteOn(PAIRS[1], '2026-09-23'),
    voteOn(PAIRS[0], '2026-09-22'),
    voteOn(PAIRS[0], '2026-09-15'),
  ],
  voterCount: 2,
};

/** applyTuningEdits' own refusal of a tagline edit to Ramp, once the branch holds `onBranch`. */
function staleRefusal(onBranch: TuningConfig): Error {
  try {
    applyTuningEdits(JSON.stringify(onBranch), [
      {path: ['playstyles', 'ramp', 'tagline'], value: 'From the branch!', expected: 'From the branch'},
    ]);
  } catch (e) {
    return e as Error;
  }
  throw new Error('applyTuningEdits accepted a stale value');
}

const json = (body: unknown) => new Response(JSON.stringify(body), {headers: {'content-type': 'application/json'}});
/** What Vite and vercel.json serve for an artifact that was never generated. */
const spaFallback = () => new Response('<!doctype html>', {headers: {'content-type': 'text/html'}});
/** A request that never settles, so the page stays on its loading state. */
const never = () => new Promise<Response>(() => {});

type Answer = () => Response | Promise<Response>;

/**
 * Answers each request with a fresh Response (a body reads only once), picked
 * by URL: the token check, the tuning.json read, then the two admin-data
 * artifacts. By default the token can push, tuning.json is LIVE and neither
 * artifact was generated.
 */
function stubFetch({
  tuning = () => json(LIVE),
  analytics = spaFallback,
  voteLog = spaFallback,
}: {tuning?: Answer; analytics?: Answer; voteLog?: Answer} = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url === REPO_URL) return json({permissions: {push: true}});
    if (url === TUNING_URL) return tuning();
    if (url.endsWith('/admin-data/vote-analytics.json')) return analytics();
    if (url.endsWith('/admin-data/vote-log.json')) return voteLog();
    return new Response('Not Found', {status: 404});
  });
}

/**
 * The page at `path` in a data router, which the unsaved-edits guard needs,
 * beside a page to leave to. With `token`, a GitHub token is saved first.
 */
function renderPage(path: string, token?: string) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  const router = createMemoryRouter(
    [
      {path: '/calibration', element: <CalibrationPage />},
      {path: '/', element: <h1>Overview</h1>},
    ],
    {initialEntries: [path]},
  );
  render(<RouterProvider router={router} />);
  return {router, user: userEvent.setup()};
}

const aside = () => within(screen.getByRole('complementary', {name: 'Tuning editor'}));
const figure = (name: string) => within(screen.getByRole('figure', {name}));
/** A rules table row: a button whose name starts with the rule's name (R2-3). */
const ruleRow = (name: string, pressed?: boolean) =>
  screen.findByRole('button', {name: new RegExp(`^${name}\\b`), pressed});
const pairButtons = () => within(screen.getByRole('region', {name: 'Widest gaps'})).getAllByRole('button');

beforeEach(() => {
  // A block, not an arrow's value: mockReset() returns the mock, and Vitest calls a function a hook returns as its teardown.
  vi.mocked(commitTuning).mockReset();
});

afterEach(() => {
  // The token store reads localStorage on every snapshot, so clearing it is the whole reset.
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('CalibrationPage: header', () => {
  it('sums up the calibration, dates the data and names the branch tuning writes to', async () => {
    stubFetch({analytics: () => json(ANALYTICS)});
    renderPage('/calibration');
    expect(screen.getByRole('heading', {level: 1, name: 'Calibration & tuning'})).toBeInTheDocument();
    expect(await screen.findByText('Mean gap −0.30 · well-calibrated · 2,054 votes')).toBeInTheDocument();
    // The date sits in a <code>, so the line is matched on the element that holds both.
    expect(screen.getByText(/Data as of/)).toHaveTextContent('Data as of 2026-09-29');
    expect(screen.getByText('Tuning writes to Doberjohn/inkweave')).toHaveTextContent(
      'Tuning writes to Doberjohn/inkweave master',
    );
    expect(document.title).toBe('Calibration & tuning · Inkweave admin');
  });

  it('names the lean when the gap leaves the calibrated band', async () => {
    stubFetch({analytics: () => json({...ANALYTICS, global: {...ANALYTICS.global, meanGap: -0.8}})});
    renderPage('/calibration');
    expect(await screen.findByText('Mean gap −0.80 · runs generous · 2,054 votes')).toBeInTheDocument();
  });
});

describe('CalibrationPage: the analytics notice', () => {
  it('shows a loading notice under the page title until the analytics arrive', () => {
    stubFetch({analytics: never, voteLog: never});
    renderPage('/calibration');
    expect(screen.getByRole('heading', {level: 1, name: 'Calibration & tuning'})).toBeInTheDocument();
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
    expect(screen.getByText('Loading the rules…')).toBeInTheDocument();
    // calibrationSubtitle(null) is right only once the load has failed, so the header waits.
    expect(screen.queryByText('No vote analytics yet')).not.toBeInTheDocument();
    // So does the date: there is none to give yet.
    expect(screen.queryByText(/Data as of/)).not.toBeInTheDocument();
  });

  it.each([
    ['is missing', () => new Response('', {status: 404}), 'vote-analytics.json: HTTP 404'],
    ['was never generated', spaFallback, 'vote-analytics.json has not been generated yet'],
  ])('says so when the artifact %s, and why the rules table is empty without a token (R-20)', async (_, respond, reason) => {
    stubFetch({analytics: respond});
    renderPage('/calibration');
    // Exact text: without tuning.json there are no rules "from tuning.json alone" to point at.
    expect((await screen.findByRole('alert')).textContent).toBe(
      `Could not load vote analytics. Has the artifact been generated? (${reason})`,
    );
    expect(screen.getByText('No vote analytics yet')).toBeInTheDocument();
    expect(screen.queryByText('Loading analytics...')).not.toBeInTheDocument();
    expect(screen.queryByText(/Data as of/)).not.toBeInTheDocument();
    expect(
      screen.getByText('No rules to show: vote analytics are missing and tuning.json needs a GitHub token.'),
    ).toBeInTheDocument();
  });

  it('lists no tuning.json rows until the analytics settle', async () => {
    stubFetch({analytics: never});
    renderPage('/calibration?rule=location-control', 'tok');
    // The aside has read tuning.json, and no row is selected yet.
    expect(await aside().findByText(/^Pick a playstyle/)).toBeInTheDocument();
    expect(screen.getByText('Loading the rules…')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /^Live Ramp\b/})).not.toBeInTheDocument();
  });

  it('lists the rules from the live tuning.json when the analytics are missing', async () => {
    const fetchMock = stubFetch();
    renderPage('/calibration', 'tok');
    expect(await ruleRow('Live Ramp')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(TUNING_URL, expect.anything());
    expect(screen.getByRole('alert').textContent).toBe(
      'Could not load vote analytics. Has the artifact been generated? (vote-analytics.json has not been generated yet) The rules below come from tuning.json alone.',
    );
  });

  it('says so when nobody has voted yet, and both charts say there are no pairs', async () => {
    const empty: VoteAnalytics = {
      ...ANALYTICS,
      global: {...ANALYTICS.global, totalVotes: 0, distinctPairs: 0, meanGap: null, engineSilentPairs: 0},
      rules: RULES.map((r) => ({...r, scoreVotes: 0, pairsVoted: 0, meanGap: null})),
      pairs: [],
    };
    stubFetch({analytics: () => json(empty)});
    renderPage('/calibration');
    expect(await screen.findByText('Vote analytics are empty: no votes yet.')).toBeInTheDocument();
    expect(figure('Engine vs community').getByText('No voted pairs yet.')).toBeInTheDocument();
    expect(figure('Gap distribution').getByText('No voted pairs yet.')).toBeInTheDocument();
    expect(figure('Gap distribution').getByText('All pairs · no pairs')).toBeInTheDocument();
  });
});

describe('CalibrationPage: selection', () => {
  it('opens with the rule from ?rule= selected', async () => {
    stubFetch({analytics: () => json(ANALYTICS)});
    renderPage('/calibration?rule=ramp');
    expect(await ruleRow('Ramp')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Ramp · gap −0.57 · 557 votes')).toBeInTheDocument();
    expect(screen.queryByText('All pairs')).not.toBeInTheDocument();
  });

  it('opens on all pairs when ?rule= names a rule the analytics lack', async () => {
    stubFetch({analytics: () => json(ANALYTICS)});
    renderPage('/calibration?rule=retired-rule');
    expect(await ruleRow('Ramp')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('All pairs')).toBeInTheDocument();
    // A stale id must not scope the list to a rule nobody has: every pair still shows.
    expect(pairButtons()).toHaveLength(3);
  });

  it('selects Lore Loss from ?rule=lore-loss and opens the Lore Denial copy', async () => {
    stubFetch({analytics: () => json(ANALYTICS)});
    renderPage('/calibration?rule=lore-loss', 'tok');
    expect(await aside().findByRole('heading', {level: 2, name: 'Lore Denial'})).toBeInTheDocument();
    expect(await ruleRow('Lore Loss')).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens a tuning key on its first rule, and a second click on that row clears ?rule=', async () => {
    stubFetch({analytics: () => json(ANALYTICS)});
    const {router, user} = renderPage('/calibration?rule=location-control', 'tok');
    // ?rule= names the Locations entry: the first rule under it in the artifact is the one the table marks.
    const search = await ruleRow('Location Search', true);
    expect(await ruleRow('Location Boost')).toHaveAttribute('aria-pressed', 'false');
    await user.click(search);
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(search).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('All pairs')).toBeInTheDocument();
  });

  it('says whose pairs it shows when ?rule= names a tuning key several rules share', async () => {
    // Location Search is the first rule under location-control, so its pairs scope everything below the table.
    // The scope line, the charts and the aside's gap all name that rule, and the aside says the entry is shared.
    const shared: VoteAnalytics = {
      ...ANALYTICS,
      pairs: [pairOf('1', '2', 7, 4, 3, ['location-search']), pairOf('3', '4', 3, 9, 1, ['location-boost'])],
    };
    stubFetch({analytics: () => json(shared)});
    renderPage('/calibration?rule=location-control', 'tok');
    expect(await screen.findByText('Location Search · gap −1.20 · 12 votes')).toBeInTheDocument();
    expect(figure('Engine vs community').getByText(/^Location Search · 1 pair\./)).toBeInTheDocument();
    expect(figure('Gap distribution').getByText(/^Location Search · /)).toBeInTheDocument();
    expect(pairButtons().map((b) => b.getAttribute('aria-label')?.split(':')[0])).toEqual(['Card 1 × Card 2']);
    expect(await aside().findByText('Shared by 2 rules: Location Search, Location Boost')).toBeInTheDocument();
    expect(aside().getByText('Location Search gap')).toBeInTheDocument();
  });

  it('picks a pair under a tuning key, against the rule it resolves to', async () => {
    const shared: VoteAnalytics = {
      ...ANALYTICS,
      pairs: [pairOf('1', '2', 7, 4, 3, ['location-search']), pairOf('3', '4', 3, 9, 1, ['location-boost'])],
    };
    stubFetch({analytics: () => json(shared)});
    // The key resolves only once tuning.json is read, so this needs the token.
    const {user} = renderPage('/calibration?rule=location-control', 'tok');
    await screen.findByText('Location Search · gap −1.20 · 12 votes');
    await user.click(screen.getByRole('button', {name: /^Card 1 × Card 2:/}));
    expect(screen.getByRole('button', {name: /^Card 1 × Card 2:/})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('region', {name: 'Card 1 × Card 2'})).toBeInTheDocument();
  });

  it('writes ?rule= when a rule is picked, scoping the pairs, and clears it on a second pick', async () => {
    stubFetch({analytics: () => json(ANALYTICS)});
    const {router, user} = renderPage('/calibration');
    const ramp = await ruleRow('Ramp');
    expect(pairButtons()).toHaveLength(3);

    await user.click(ramp);
    await waitFor(() => expect(router.state.location.search).toBe('?rule=ramp'));
    // Replaced, not pushed: a pick is a view of the page, and Back leaves it.
    expect(router.state.historyAction).toBe('REPLACE');
    expect(ramp).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Ramp · gap −0.57 · 557 votes')).toBeInTheDocument();
    expect(pairButtons().map((b) => b.getAttribute('aria-label')?.split(':')[0])).toEqual([
      'Card 3 × Card 4',
      'Card 1 × Card 2',
    ]);

    await user.click(ramp);
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(ramp).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('All pairs')).toBeInTheDocument();
    expect(pairButtons()).toHaveLength(3);
  });

  it('drops a picked pair when the rule changes, from the URL or from the table', async () => {
    stubFetch({analytics: () => json(ANALYTICS)});
    const {router, user} = renderPage('/calibration');
    await ruleRow('Ramp');
    const pair = () => screen.getByRole('button', {name: /^Card 3 × Card 4:/});

    await user.click(pair());
    expect(pair()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('region', {name: 'Card 3 × Card 4'})).toBeInTheDocument();

    // From outside the workspace, as the Overview's link or the sidebar's would.
    await act(() => router.navigate('/calibration?rule=ramp'));
    expect(pair()).toHaveAttribute('aria-pressed', 'false');
    expect(document.querySelector('[data-state="selected"]')).toBeNull();
    expect(screen.getByRole('region', {name: 'Votes'})).toHaveTextContent('Select a pair to see its votes');

    // From the table: picked under Ramp, gone after Lore Loss and back.
    await user.click(pair());
    await user.click(await ruleRow('Lore Loss'));
    await user.click(await ruleRow('Ramp'));
    expect(pair()).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('CalibrationPage: what the rule scopes', () => {
  it('scopes the scatter, the histogram and the weekly gap, but not dimension participation', async () => {
    stubFetch({analytics: () => json(RAW), voteLog: () => json(VOTE_LOG)});
    const {user} = renderPage('/calibration?rule=ramp');
    expect(await screen.findByRole('slider', {name: 'Weekly mean gap, Ramp'})).toBeInTheDocument();
    expect(figure('Engine vs community').getByText(/^Ramp · 2 pairs\./)).toBeInTheDocument();
    expect(figure('Gap distribution').getByText(/^Ramp · /)).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', {name: 'Dimension participation'})).getByText('All votes, whatever the rule'),
    ).toBeInTheDocument();
    // The log runs from Tuesday Sep 15 to Tuesday Sep 29, so both its end weeks are part weeks, as Vote activity says.
    expect(figure('Weekly gap').getByText(/, first and last weeks partial$/)).toBeInTheDocument();
    // The week of Sep 28 holds one vote, on a Lore Loss pair: under Ramp it has none.
    await user.click(figure('Weekly gap').getByRole('button', {name: 'Table'}));
    expect(figure('Weekly gap').getByRole('rowheader', {name: 'Week of Sep 14 (from Sep 15)'})).toBeInTheDocument();
    const lastWeek = within(figure('Weekly gap').getByRole('row', {name: /^Week of Sep 28 \(to Sep 29\) /}));
    expect(lastWeek.getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['—', '0']);
  });

  it('"Show all pairs" clears ?rule=, rescopes the charts and leaves focus on the scope line', async () => {
    stubFetch({analytics: () => json(RAW), voteLog: () => json(VOTE_LOG)});
    const {router, user} = renderPage('/calibration?rule=ramp');
    await screen.findByRole('slider', {name: 'Weekly mean gap, Ramp'});

    await user.click(screen.getByRole('button', {name: 'Show all pairs'}));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(figure('Engine vs community').getByText(/^All pairs · 3 pairs\./)).toBeInTheDocument();
    expect(figure('Gap distribution').getByText(/^All pairs · /)).toBeInTheDocument();
    expect(screen.getByRole('slider', {name: 'Weekly mean gap, All pairs'})).toBeInTheDocument();
    // The button went with the rule; focus stays on the line that says what is in scope.
    expect(screen.queryByRole('button', {name: 'Show all pairs'})).not.toBeInTheDocument();
    expect(screen.getByText('All pairs', {selector: 'p'})).toHaveFocus();
  });

  it('shows an empty scope for a rule with no stat, in both charts and the weekly gap', async () => {
    stubFetch({analytics: () => json(RAW), voteLog: () => json(VOTE_LOG)});
    renderPage('/calibration?rule=toy', 'tok');
    expect(await screen.findByText('Toys · no score votes yet')).toBeInTheDocument();
    expect(figure('Engine vs community').getByText('No voted pairs for this rule yet.')).toBeInTheDocument();
    expect(figure('Gap distribution').getByText('No voted pairs for this rule yet.')).toBeInTheDocument();
    // The pair list's own text: on all pairs it would read its default, "No voted pairs yet."
    expect(
      within(screen.getByRole('region', {name: 'Widest gaps'})).getByText('No voted pairs for this rule yet.'),
    ).toBeInTheDocument();
    expect(await figure('Weekly gap').findByText('No score votes in this scope yet.')).toBeInTheDocument();
    expect(screen.queryByRole('slider', {name: 'Weekly mean gap, Toys'})).not.toBeInTheDocument();
  });

  it('counts the engine-silent pairs on all pairs only', async () => {
    stubFetch({analytics: () => json(ANALYTICS)});
    const {user} = renderPage('/calibration');
    expect(await screen.findByText(/^Not plotted: 196 engine-silent pairs/)).toBeInTheDocument();
    await user.click(await ruleRow('Ramp'));
    expect(screen.queryByText(/Not plotted/)).not.toBeInTheDocument();
  });

  it("opens a dot's votes from the scatter, and lists its pair below the 40 widest", async () => {
    // 40 pairs at engine 5 with distinct gaps, then the narrowest (1 → 1), furthest left of all.
    const many = [
      ...Array.from({length: 40}, (_, i) => pairOf(String(i + 1), String(i + 101), 5, 5 + (i + 1) / 10)),
      pairOf('900', '901', 1, 1),
    ];
    const votes = [voteOn(many[40], '2026-09-29'), voteOn(many[0], '2026-09-22')];
    stubFetch({
      analytics: () => json({...RAW, pairs: many}),
      voteLog: () => json({...VOTE_LOG, votes}),
    });
    const {user} = renderPage('/calibration');
    const slider = await screen.findByRole('slider', {name: 'Engine score against community score, All pairs'});

    act(() => slider.focus());
    await user.keyboard('{Home}{Enter}');

    const panel = within(await screen.findByRole('region', {name: 'Card 900 × Card 901'}));
    expect(await panel.findByRole('table', {name: 'Votes on Card 900 × Card 901'})).toBeInTheDocument();
    const listed = pairButtons();
    expect(listed).toHaveLength(41);
    expect(listed[40]).toHaveAccessibleName(/^Card 900 × Card 901:/);
    expect(listed[40]).toHaveAttribute('aria-pressed', 'true');
  });

  it('puts one notice in place of the weekly gap and dimension participation without raw votes', async () => {
    stubFetch({analytics: () => json(ANALYTICS)});
    const {user} = renderPage('/calibration');
    expect(
      await screen.findByText(/^The weekly gap trend and dimension participation need raw votes\./),
    ).toBeInTheDocument();
    expect(screen.queryByRole('figure', {name: 'Weekly gap'})).not.toBeInTheDocument();
    expect(screen.queryByRole('region', {name: 'Dimension participation'})).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: /^Card 1 × Card 2:/}));
    expect(screen.getByRole('region', {name: 'Card 1 × Card 2'})).toHaveTextContent('No raw votes to show.');
  });

  it.each([
    ['is still loading', never, 'Loading the vote log…'],
    ['failed', () => new Response('', {status: 500}), 'Could not load the vote log: vote-log.json: HTTP 500'],
  ])('says so where the weekly gap goes while the vote log %s', async (_, voteLog, text) => {
    stubFetch({analytics: () => json(RAW), voteLog});
    renderPage('/calibration');
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(screen.queryByRole('figure', {name: 'Weekly gap'})).not.toBeInTheDocument();
  });
});

describe('CalibrationPage: the votes panel', () => {
  // The weekly gap's Notice says the same while the log loads, so the text is read inside the pair's region.
  it.each([
    ['is still loading', never, 'Loading the vote log…'],
    ['failed', () => new Response('', {status: 500}), 'Could not load the vote log.'],
  ])('says so on the votes panel of a picked pair while the vote log %s', async (_, voteLog, text) => {
    stubFetch({analytics: () => json(RAW), voteLog});
    const {user} = renderPage('/calibration');
    await user.click(await screen.findByRole('button', {name: /^Card 1 × Card 2:/}));
    expect(within(screen.getByRole('region', {name: 'Card 1 × Card 2'})).getByText(text)).toBeInTheDocument();
  });
});

describe('CalibrationPage: layout', () => {
  /** The grid track a panel sits in, as the row's inline style gives it. */
  const trackOf = (panel: HTMLElement) =>
    panel.closest<HTMLElement>('div[style*="grid-template-columns"]')?.style.gridTemplateColumns;

  it('sets the charts two-up from a 376px track, so the histogram prints every bin label, and the pairs from 346px', async () => {
    stubFetch({analytics: () => json(ANALYTICS)});
    renderPage('/calibration');
    await ruleRow('Ramp');
    // 376px less the panel's 42px is a 334px plot, which holds all eleven bin labels; 346px leaves 304px, ChartTooltip's floor.
    expect(trackOf(screen.getByRole('figure', {name: 'Engine vs community'}))).toContain('376px');
    expect(trackOf(screen.getByRole('figure', {name: 'Gap distribution'}))).toContain('376px');
    expect(trackOf(screen.getByRole('region', {name: 'Widest gaps'}))).toContain('346px');
    expect(trackOf(screen.getByRole('region', {name: 'Votes'}))).toContain('346px');
  });
});

describe('CalibrationPage: the tuning aside', () => {
  it('keeps the analytics without a token, and asks for one in the aside', async () => {
    const fetchMock = stubFetch({analytics: () => json(ANALYTICS)});
    renderPage('/calibration');
    expect(await ruleRow('Ramp')).toBeInTheDocument();
    expect(aside().getByRole('heading', {level: 2, name: 'GitHub token'})).toBeInTheDocument();
    expect(aside().getByRole('button', {name: 'Save token'})).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(TUNING_URL, expect.anything());
  });

  it('says why tuning.json cannot be read, in the aside', async () => {
    stubFetch({tuning: () => new Response('Not Found', {status: 404})});
    renderPage('/calibration', 'tok');
    expect(await aside().findByRole('alert')).toHaveTextContent('Could not read tuning.json: GitHub 404');
    // With a token saved the table must not ask for one (R-20).
    expect(
      screen.getByText("No rules to show: vote analytics are missing and tuning.json hasn't loaded."),
    ).toBeInTheDocument();
  });

  it('forgets a token GitHub rejects from the aside, and keeps the analytics (R-26)', async () => {
    stubFetch({
      analytics: () => json(ANALYTICS),
      tuning: () => new Response('{"message":"Bad credentials"}', {status: 401}),
    });
    const {user} = renderPage('/calibration', 'tok');
    await user.click(await aside().findByRole('button', {name: 'Forget token'}));
    expect(aside().getByRole('button', {name: 'Save token'})).toBeInTheDocument();
    // The button went with the error: the gate's field takes focus, not <body> (F2).
    expect(aside().getByLabelText('GitHub token')).toHaveFocus();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(await ruleRow('Ramp')).toBeInTheDocument();
  });

  it('hands focus to the loaded editor after Save token: the entry heading', async () => {
    stubFetch({analytics: () => json(ANALYTICS)});
    const {user} = renderPage('/calibration?rule=ramp');
    await user.type(aside().getByLabelText('GitHub token'), 'tok');
    await user.click(aside().getByRole('button', {name: 'Save token'}));
    const heading = await aside().findByRole('heading', {level: 2, name: 'Live Ramp'});
    await waitFor(() => expect(heading).toHaveFocus());
  });

  it('leaves focus where the user moved it while the read after Save token runs', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    stubFetch({analytics: () => json(ANALYTICS), tuning: () => gate.then(() => json(LIVE))});
    const {user} = renderPage('/calibration?rule=ramp');
    await user.type(aside().getByLabelText('GitHub token'), 'tok');
    await user.click(aside().getByRole('button', {name: 'Save token'}));
    expect(await aside().findByText('Reading tuning.json from master…')).toBeInTheDocument();

    // A GitHub read takes a moment, and the user moves on to the rules table meanwhile.
    const loreLoss = await ruleRow('Lore Loss');
    act(() => loreLoss.focus());
    await act(async () => release());
    expect(await aside().findByRole('heading', {level: 2, name: 'Live Ramp'})).toBeInTheDocument();
    expect(loreLoss).toHaveFocus();
  });

  it.each([
    ['fails', () => new Response('Bad gateway', {status: 502}), 'Read tuning.json again'],
    ['is refused for the token', () => new Response('{"message":"Bad credentials"}', {status: 401}), 'Forget token'],
  ])("hands focus to the error's way out when the first read after Save token %s", async (_, tuning, control) => {
    stubFetch({analytics: () => json(ANALYTICS), tuning});
    const {user} = renderPage('/calibration?rule=ramp');
    await user.type(aside().getByLabelText('GitHub token'), 'tok');
    await user.click(aside().getByRole('button', {name: 'Save token'}));
    expect(await aside().findByRole('alert')).toHaveTextContent('Could not read tuning.json: GitHub');
    // No editor arrived to take it: the error's own control does, not <body> (F2).
    await waitFor(() => expect(aside().getByRole('button', {name: control})).toHaveFocus());
  });

  it('hands focus to the loaded editor after reading tuning.json again: its first heading, with no rule picked', async () => {
    let reads = 0;
    stubFetch({tuning: () => (++reads === 1 ? new Response('Bad gateway', {status: 502}) : json(LIVE))});
    const {user} = renderPage('/calibration', 'tok');
    expect(await aside().findByRole('alert')).toHaveTextContent('Could not read tuning.json: GitHub 502');

    await user.click(aside().getByRole('button', {name: 'Read tuning.json again'}));
    const heading = await aside().findByRole('heading', {level: 2, name: 'Pending changes · 0'});
    await waitFor(() => expect(heading).toHaveFocus());
  });

  it('keeps the commit link and the tray when the read after a publish fails (C1)', async () => {
    vi.mocked(commitTuning).mockResolvedValue({commitUrl: COMMIT_URL});
    let reads = 0;
    stubFetch({
      analytics: () => json(ANALYTICS),
      tuning: () => (++reads === 2 ? new Response('Bad gateway', {status: 502}) : json(LIVE)),
    });
    const {user} = renderPage('/calibration?rule=ramp', 'tok');
    await user.type(await aside().findByRole('textbox', {name: 'Title text'}), '!');
    await user.click(aside().getByRole('button', {name: 'Publish to master'}));

    // The commit landed, and the read after it failed: both say so, side by side.
    expect(await aside().findByRole('alert')).toHaveTextContent('Could not read tuning.json: GitHub 502');
    expect(aside().getByRole('link', {name: 'View commit'})).toHaveAttribute('href', COMMIT_URL);
    expect(aside().getByRole('region', {name: 'Pending changes'})).toBeInTheDocument();
    expect(aside().getByRole('button', {name: 'Publish to master'})).toHaveFocus();

    await user.click(aside().getByRole('button', {name: 'Read tuning.json again'}));
    await waitFor(() => expect(aside().queryByRole('alert')).not.toBeInTheDocument());
    expect(aside().getByRole('link', {name: 'View commit'})).toBeInTheDocument();
    await waitFor(() => expect(aside().getByRole('heading', {level: 2, name: 'Live Ramp'})).toHaveFocus());
  });
});

describe('CalibrationPage: the Tune link', () => {
  // jsdom has no scrollIntoView. A spy stands in, so the aside's scroll shows up rather than throwing.
  const original = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
  const scrollIntoView = vi.fn();
  beforeEach(() => {
    scrollIntoView.mockClear();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {configurable: true, writable: true, value: scrollIntoView});
  });
  afterEach(() => {
    if (original) Object.defineProperty(Element.prototype, 'scrollIntoView', original);
    else delete (Element.prototype as Partial<Element>).scrollIntoView;
  });

  /** Any Tune link, whatever it names. */
  const tuneLink = () => screen.queryByRole('button', {name: /^Tune\b/});

  it("names the selected rule's entry, and hands focus to its heading in the aside, scrolled into view", async () => {
    stubFetch({analytics: () => json(ANALYTICS)});
    const {user} = renderPage('/calibration?rule=location-boost', 'tok');
    // Location Boost keeps its copy in the shared Locations entry: the link names what the aside heads.
    const tune = await screen.findByRole('button', {name: 'Tune Locations'});
    expect(tune).toHaveTextContent('Tune Locations');
    // Beside "Show all pairs", in the scope row.
    expect(tune.parentElement).toContainElement(screen.getByRole('button', {name: 'Show all pairs'}));

    await user.click(tune);
    expect(aside().getByRole('heading', {level: 2, name: 'Locations'})).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByRole('complementary', {name: 'Tuning editor'}));
    expect(scrollIntoView).toHaveBeenCalledWith({block: 'start'});
  });

  it("names the rule without a token, and hands focus to the gate's field", async () => {
    stubFetch({analytics: () => json(ANALYTICS)});
    const {user} = renderPage('/calibration?rule=ramp');
    // Only tuning.json knows the entry's name, and reading it takes the token.
    await user.click(await screen.findByRole('button', {name: 'Tune Ramp'}));
    expect(aside().getByLabelText('GitHub token')).toHaveFocus();
    expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByRole('complementary', {name: 'Tuning editor'}));
  });

  it('shows none with no rule selected', async () => {
    stubFetch({analytics: () => json(ANALYTICS)});
    renderPage('/calibration', 'tok');
    expect(await aside().findByText(/^Pick a playstyle/)).toBeInTheDocument();
    expect(screen.getByText('All pairs', {selector: 'p'})).toBeInTheDocument();
    expect(tuneLink()).not.toBeInTheDocument();
  });

  it('shows none for a rule with no copy in tuning.json', async () => {
    const singer: RuleStat = {...rule('singer-songs', 'Singer + Songs', 0.4, 5), category: 'direct'};
    stubFetch({analytics: () => json({...ANALYTICS, rules: [...RULES, singer]})});
    renderPage('/calibration?rule=singer-songs', 'tok');
    expect(
      await aside().findByText('No copy in tuning.json, so Singer + Songs has nothing to tune here.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Singer + Songs · gap +0.40 · 5 votes')).toBeInTheDocument();
    expect(tuneLink()).not.toBeInTheDocument();
  });

  it.each([
    ['while tuning.json loads', never, 'Reading tuning.json from master…'],
    ['after the first read of tuning.json fails', () => new Response('Bad gateway', {status: 502}), /^Could not read tuning\.json: GitHub 502/],
  ])('shows none %s', async (_, tuning, says) => {
    stubFetch({analytics: () => json(ANALYTICS), tuning});
    renderPage('/calibration?rule=ramp', 'tok');
    expect(await aside().findByText(says)).toBeInTheDocument();
    expect(screen.getByText('Ramp · gap −0.57 · 557 votes')).toBeInTheDocument();
    expect(tuneLink()).not.toBeInTheDocument();
  });

  it('shows it once the editor arrives after a failed first read', async () => {
    let reads = 0;
    stubFetch({
      analytics: () => json(ANALYTICS),
      tuning: () => (++reads === 1 ? new Response('Bad gateway', {status: 502}) : json(LIVE)),
    });
    const {user} = renderPage('/calibration?rule=ramp', 'tok');
    await user.click(await aside().findByRole('button', {name: 'Read tuning.json again'}));
    expect(await screen.findByRole('button', {name: 'Tune Live Ramp'})).toBeInTheDocument();
  });
});

describe('CalibrationPage: unpublished edits (R-19)', () => {
  /** Opens Ramp's copy and stages one edit to its title. */
  async function stageTitleEdit() {
    stubFetch({analytics: () => json(ANALYTICS)});
    const harness = renderPage('/calibration?rule=ramp', 'tok');
    await harness.user.type(await aside().findByRole('textbox', {name: 'Title text'}), '!');
    expect(aside().getByText('Live Ramp · Title · text')).toBeInTheDocument();
    return harness;
  }

  it('asks before leaving the page, and stays with the edit', async () => {
    const {router, user} = await stageTitleEdit();
    act(() => void router.navigate('/'));
    const dialog = await screen.findByRole('dialog', {name: 'Leave this page?'});
    expect(dialog).toHaveTextContent("Your pending tuning edits aren't published yet. Leaving this page drops them.");

    await user.click(within(dialog).getByRole('button', {name: 'Stay on this page'}));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(router.state.location.pathname).toBe('/calibration');
    expect(aside().getByText('Live Ramp · Title · text')).toBeInTheDocument();
  });

  it('picks another rule without asking, and keeps the edit and its mark', async () => {
    const {router, user} = await stageTitleEdit();
    await user.click(await ruleRow('Lore Loss'));
    await waitFor(() => expect(router.state.location.search).toBe('?rule=lore-loss'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(aside().getByText('Live Ramp · Title · text')).toBeInTheDocument();
    expect(await ruleRow('Ramp')).toHaveAccessibleName(/pending tuning edit/i);
  });

  it('drops the edits when the token is forgotten, so the same token saved again starts clean (R-26)', async () => {
    vi.mocked(commitTuning).mockRejectedValue(new Error(REJECTED_PUBLISH));
    const {router, user} = await stageTitleEdit();
    await user.click(aside().getByRole('button', {name: 'Publish to master'}));
    const forget = await aside().findByRole('button', {name: 'Forget token'});

    // Declined: the token and the edit both stay.
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.click(forget);
    expect(confirm).toHaveBeenCalledWith('Forget the token and drop 1 unpublished edit?');
    expect(localStorage.getItem(TOKEN_KEY)).toBe('tok');
    expect(aside().getByText('Live Ramp · Title · text')).toBeInTheDocument();

    // Confirmed: the token goes with the workspace that held the edit, with no leave prompt on the way.
    confirm.mockReturnValue(true);
    await user.click(forget);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(aside().getByRole('button', {name: 'Save token'})).toBeInTheDocument();
    expect(aside().getByLabelText('GitHub token')).toHaveFocus();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // The same token saved again is a new workspace: the edit does not come back, and nothing is left to guard.
    await user.type(aside().getByLabelText('GitHub token'), 'tok');
    await user.click(aside().getByRole('button', {name: 'Save token'}));
    expect(await aside().findByText('No pending changes')).toBeInTheDocument();
    expect(aside().queryByText('Live Ramp · Title · text')).not.toBeInTheDocument();
    expect(await aside().findByRole('textbox', {name: 'Title text'})).toHaveValue('Live Ramp');
    act(() => void router.navigate('/'));
    expect(await screen.findByRole('heading', {level: 1, name: 'Overview'})).toBeInTheDocument();
  });

  it('starts a new workspace when the token changes in another tab, dropping the edits', async () => {
    await stageTitleEdit();
    // Another tab saved a different token: the shared store hears the storage event, with no forget on this page.
    act(() => {
      localStorage.setItem(TOKEN_KEY, 'other');
      window.dispatchEvent(new StorageEvent('storage', {key: TOKEN_KEY}));
    });
    expect(await aside().findByText('No pending changes')).toBeInTheDocument();
    expect(aside().queryByText('Live Ramp · Title · text')).not.toBeInTheDocument();
  });

  it("says leaving mid-publish won't stop it, since the commit can't be recalled", async () => {
    vi.mocked(commitTuning).mockReturnValue(new Promise(() => {}));
    const {router, user} = await stageTitleEdit();
    await user.click(aside().getByRole('button', {name: 'Publish to master'}));
    expect(aside().getByRole('button', {name: 'Publishing…'})).toBeDisabled();

    act(() => void router.navigate('/'));
    const dialog = await screen.findByRole('dialog', {name: 'Leave this page?'});
    expect(dialog).toHaveTextContent(
      "A publish to master is in progress. Leaving won't stop it, and you won't see whether it landed.",
    );
    expect(dialog).not.toHaveTextContent('drops them');
  });

  it('keeps every pending edit, and the tray, when the reload after a stale publish fails, with Reload its one way on', async () => {
    // The branch changed Ramp's tagline after the page read it: the publish is refused as stale.
    const onBranch: TuningConfig = {...LIVE, playstyles: {...LIVE.playstyles, ramp: {name: 'Live Ramp', tagline: 'Changed'}}};
    vi.mocked(commitTuning).mockRejectedValue(staleRefusal(onBranch));
    let reads = 0;
    stubFetch({
      analytics: () => json(ANALYTICS),
      // The page's read, then the Reload's, which fails, then the Reload's again.
      tuning: () => [json(LIVE), new Response('Bad gateway', {status: 502}), json(onBranch)][reads++],
    });
    const {router, user} = renderPage('/calibration?rule=ramp', 'tok');
    await user.type(await aside().findByRole('textbox', {name: 'Title text'}), '!');
    await user.type(aside().getByRole('textbox', {name: 'Tagline text'}), '!');
    await user.click(aside().getByRole('button', {name: 'Publish to master'}));
    await user.click(await aside().findByRole('button', {name: 'Reload tuning.json'}));

    expect(await aside().findByText(/^Could not read tuning\.json: GitHub 502/)).toBeInTheDocument();
    // The edits stay pending, in the tray and under the guard (C1).
    expect(aside().getByRole('heading', {level: 2, name: 'Pending changes · 2'})).toBeInTheDocument();
    expect(aside().getByRole('textbox', {name: 'Title text'})).toHaveValue('Live Ramp!');
    act(() => void router.navigate('/'));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', {name: 'Stay on this page'}));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));

    // Both alerts stay, but one button answers them: the read error offers no second one that does the same.
    expect(aside().getAllByRole('alert')).toHaveLength(2);
    expect(aside().queryByRole('button', {name: 'Read tuning.json again'})).not.toBeInTheDocument();

    // Reloading again settles them: the stale tagline goes, the title stays.
    await user.click(aside().getByRole('button', {name: 'Reload tuning.json'}));
    expect(
      await aside().findByText('Reloaded tuning.json. Dropped 1 edit whose value had changed: make it again.'),
    ).toBeInTheDocument();
    expect(aside().queryByRole('alert')).not.toBeInTheDocument();
    expect(aside().getByRole('heading', {level: 2, name: 'Pending changes · 1'})).toBeInTheDocument();
    expect(aside().getByText('Live Ramp · Title · text')).toBeInTheDocument();
  });

  it('lets the page go once the edit is published', async () => {
    vi.mocked(commitTuning).mockResolvedValue({commitUrl: 'https://github.com/Doberjohn/inkweave/commit/abc123'});
    const {router, user} = await stageTitleEdit();
    await user.click(aside().getByRole('button', {name: 'Publish to master'}));
    await waitFor(() => expect(aside().queryByText('Live Ramp · Title · text')).not.toBeInTheDocument());

    act(() => void router.navigate('/'));
    expect(await screen.findByRole('heading', {level: 1, name: 'Overview'})).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
