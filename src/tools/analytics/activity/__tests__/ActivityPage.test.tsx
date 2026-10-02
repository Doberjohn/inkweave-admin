import {afterEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {ActivityPage} from '../ActivityPage';

const json = (body: unknown) => new Response(JSON.stringify(body), {headers: {'content-type': 'application/json'}});

const LOG = {
  generatedAt: '2026-10-01T04:00:00Z',
  voterCount: 1,
  votes: [
    {
      a: '1',
      b: '2',
      aName: 'Elsa',
      bName: 'Anna',
      score: 8,
      accuracy: null,
      isReal: null,
      wouldPlay: null,
      difficulty: null,
      whoCarries: 'both',
      ts: '2026-09-30T18:05:00Z',
      voter: 1,
    },
  ],
};

// src/test/setup.ts empties the artifact cache before every test, so each test fetches afresh.
afterEach(() => vi.unstubAllGlobals());

function renderPage() {
  render(
    <MemoryRouter>
      <ActivityPage />
    </MemoryRouter>,
  );
}

describe('ActivityPage', () => {
  it('loads the vote log and names the day it was built', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(LOG)));
    renderPage();

    expect(screen.getByRole('heading', {name: 'Vote activity'})).toBeInTheDocument();
    expect(screen.getByText('Raw community votes, from the last 7 days to the whole log.')).toBeInTheDocument();
    expect(screen.getByText('Loading vote log...')).toBeInTheDocument();
    expect(await screen.findByText('2026-10-01')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', {name: 'Search pairs'})).toBeInTheDocument();
  });

  it('names the file when the vote log fails to load', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', {status: 404})));
    renderPage();

    expect(
      await screen.findByText('Could not load the vote log. Has the artifact been generated? (vote-log.json: HTTP 404)'),
    ).toBeInTheDocument();
  });
});
