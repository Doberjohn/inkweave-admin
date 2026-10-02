import {afterEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {CalibrationPage} from '../CalibrationPage';
import type {VoteAnalytics} from '../voteAnalyticsTypes';

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

const json = (body: unknown) => new Response(JSON.stringify(body), {headers: {'content-type': 'application/json'}});

/** Answer /admin-data/<file> from `files`. Anything else (another artifact) never settles. */
function serve(files: Record<string, () => Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      const respond = files[url.replace('/admin-data/', '')];
      return respond ? Promise.resolve(respond()) : new Promise<Response>(() => {});
    }),
  );
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <CalibrationPage />
    </MemoryRouter>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('CalibrationPage', () => {
  it('shows a loading notice under the page title until the analytics arrive', () => {
    serve({});
    renderAt('/calibration');
    expect(screen.getByRole('heading', {level: 1, name: 'Calibration & tuning'})).toBeInTheDocument();
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
  });

  it('sums up the calibration and dates the data in the header', async () => {
    serve({'vote-analytics.json': () => json(ANALYTICS)});
    renderAt('/calibration');
    expect(await screen.findByText('Mean gap −0.30 · well-calibrated · 2,054 votes')).toBeInTheDocument();
    expect(screen.getByText('2026-06-30')).toBeInTheDocument();
    expect(screen.queryByText('Loading analytics...')).not.toBeInTheDocument();
    // No raw votes to wait for: the pending vote log goes unmentioned.
    expect(screen.queryByText('Loading the raw votes...')).not.toBeInTheDocument();
  });

  it('names the lean when the gap leaves the calibrated band', async () => {
    serve({'vote-analytics.json': () => json({...ANALYTICS, global: {...ANALYTICS.global, meanGap: -0.8}})});
    renderAt('/calibration');
    expect(await screen.findByText('Mean gap −0.80 · runs generous · 2,054 votes')).toBeInTheDocument();
  });

  it.each([
    ['is missing', () => new Response('', {status: 404}), 'vote-analytics.json: HTTP 404'],
    [
      'was never generated',
      () => new Response('<!doctype html>', {headers: {'content-type': 'text/html'}}),
      'vote-analytics.json has not been generated yet',
    ],
  ])('says so when the artifact %s', async (_, respond, reason) => {
    serve({'vote-analytics.json': respond});
    renderAt('/calibration');
    expect(
      await screen.findByText(`Could not load vote analytics. Has the artifact been generated? (${reason})`),
    ).toBeInTheDocument();
    expect(screen.queryByText('Loading analytics...')).not.toBeInTheDocument();
  });

  it('opens with the rule from ?rule= selected', async () => {
    serve({'vote-analytics.json': () => json(ANALYTICS)});
    renderAt('/calibration?rule=ramp');
    expect(await screen.findByRole('button', {name: /Ramp/})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('All pairs')).not.toBeInTheDocument();
  });

  it('says the raw votes are still loading when the analytics have them', async () => {
    // vote-log.json never settles here, so a selected pair would show no votes yet.
    serve({'vote-analytics.json': () => json({...ANALYTICS, hasRawVotes: true})});
    renderAt('/calibration');
    expect(await screen.findByText('Loading the raw votes...')).toBeInTheDocument();
  });

  it('flags a vote log that failed to load when the analytics have raw votes', async () => {
    serve({
      'vote-analytics.json': () => json({...ANALYTICS, hasRawVotes: true}),
      'vote-log.json': () => new Response('', {status: 500}),
    });
    renderAt('/calibration');
    expect(await screen.findByText(/Could not load the raw votes/)).toHaveTextContent('(vote-log.json: HTTP 500)');
    expect(screen.queryByText('Loading the raw votes...')).not.toBeInTheDocument();
  });
});
