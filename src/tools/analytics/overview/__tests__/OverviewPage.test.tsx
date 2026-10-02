import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {OverviewPage} from '../OverviewPage';
import {ANALYTICS, VERCEL, VOTE_LOG} from '../overviewFixtures';

const ARTIFACTS: Record<string, unknown> = {
  '/admin-data/vote-analytics.json': ANALYTICS,
  '/admin-data/vote-log.json': VOTE_LOG,
  '/admin-data/vercel-analytics.json': VERCEL,
};

// src/test/setup.ts empties the artifact cache before every test, so each test fetches afresh.
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve(new Response(JSON.stringify(ARTIFACTS[url]), {headers: {'content-type': 'application/json'}})),
    ),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe('OverviewPage', () => {
  it('fills the Overview from the three artifacts and dates it by vote analytics', async () => {
    render(
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', {level: 1, name: 'Overview'})).toBeInTheDocument();
    expect(screen.getByText('Engine calibration, community activity and traffic in one place.')).toBeInTheDocument();
    expect(await screen.findByText('2026-09-30')).toBeInTheDocument();
    expect(await screen.findByRole('region', {name: 'Key figures'})).toBeInTheDocument();
    expect(await screen.findByRole('list', {name: 'Latest votes'})).toBeInTheDocument();
    expect(await screen.findByRole('list', {name: 'Web events'})).toBeInTheDocument();
  });
});
