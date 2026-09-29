import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {WebAnalyticsView} from '../WebAnalyticsView';
import type {VercelAnalytics, VercelEvent} from '../vercelAnalyticsTypes';

function event(name: string, label: string, total: number): VercelEvent {
  return {name, label, total, visitors: 1, trend: [], breakdowns: []};
}

const ANALYTICS: VercelAnalytics = {
  generatedAt: '2026-09-29T00:00:00Z',
  hasVercelData: true,
  reportingWindow: null,
  events: [event('search', 'Searches', 5), event('vote_submitted', 'Votes submitted', 9)],
};

describe('WebAnalyticsView', () => {
  it('focuses the busiest event first, then the one you pick', async () => {
    render(<WebAnalyticsView analytics={ANALYTICS} />);
    expect(screen.getByRole('button', {name: /Votes submitted/})).toHaveAttribute('aria-current', 'true');

    await userEvent.click(screen.getByRole('button', {name: /Searches/}));
    expect(screen.getByRole('button', {name: /Searches/})).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', {name: /Votes submitted/})).toHaveAttribute('aria-current', 'false');
  });

  it('says why when the data could not be loaded, instead of loading forever', () => {
    render(<WebAnalyticsView analytics={null} error={new Error('vercel-analytics.json has not been generated yet')} />);
    expect(screen.getByRole('alert')).toHaveTextContent('vercel-analytics.json has not been generated yet');
    expect(screen.queryByText('Loading Web Analytics...')).not.toBeInTheDocument();
  });
});
