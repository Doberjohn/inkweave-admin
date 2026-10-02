import {afterEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {WebAnalyticsPage} from '../WebAnalyticsPage';
import type {VercelAnalytics} from '../../vercelAnalyticsTypes';

// src/test/setup.ts empties the artifact cache before every test (R1-5).
afterEach(() => {
  vi.unstubAllGlobals();
});

const json = (body: unknown) => new Response(JSON.stringify(body), {headers: {'content-type': 'application/json'}});

const ANALYTICS: VercelAnalytics = {
  generatedAt: '2026-09-29T04:00:00Z',
  hasVercelData: true,
  reportingWindow: null,
  events: [{name: 'vote_submitted', label: 'Votes submitted', total: 12, visitors: 3, trend: [], breakdowns: []}],
};

function renderPage() {
  render(
    <MemoryRouter>
      <WebAnalyticsPage />
    </MemoryRouter>,
  );
}

describe('WebAnalyticsPage', () => {
  it('loads vercel-analytics.json and dates the page from it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(ANALYTICS));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    expect(screen.getByRole('heading', {name: 'Web analytics'})).toBeInTheDocument();
    expect(screen.getByText('Vercel custom events from inkweave.ink')).toBeInTheDocument();
    expect(screen.getByText('Loading Web Analytics...')).toBeInTheDocument();
    expect(screen.queryByText(/Data as of/)).not.toBeInTheDocument();

    expect(await screen.findByText('2026-09-29')).toBeInTheDocument();
    expect(screen.getByText(/Data as of/)).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /Votes submitted/})).toHaveAttribute('aria-pressed', 'true');
    expect(fetchMock).toHaveBeenCalledWith('/admin-data/vercel-analytics.json');
  });

  it('fails on its own artifact alone, without fetching the vote artifacts', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', {status: 404}));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load Web Analytics (vercel-analytics.json: HTTP 404).',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
