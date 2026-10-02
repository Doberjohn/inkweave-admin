import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {CalibrationView} from '../CalibrationView';
import type {VoteAnalytics} from '../voteAnalyticsTypes';

const ANALYTICS: VoteAnalytics = {
  generatedAt: '2026-09-29T00:00:00Z',
  hasRawVotes: false,
  global: {
    totalVotes: 3,
    distinctPairs: 2,
    distinctVoters: null,
    meanGap: -0.4,
    accuracySentiment: null,
    engineSilentPairs: 0,
    weekly: [],
    dimensionFill: null,
  },
  rules: [
    {
      ruleId: 'ramp',
      ruleName: 'Ramp',
      category: 'playstyle',
      scoreVotes: 3,
      pairsVoted: 2,
      meanGap: -0.4,
      accuracySentiment: null,
      pairsCovered: 2,
    },
  ],
  pairs: [],
};

describe('CalibrationView', () => {
  it('scopes the pairs to a rule, and back to all pairs when the rule is chosen again', async () => {
    render(<CalibrationView analytics={ANALYTICS} voteLog={{generatedAt: '', votes: [], voterCount: 0}} />);
    const rule = screen.getByRole('button', {name: /Ramp/});
    expect(screen.getByText('All pairs')).toBeInTheDocument();

    await userEvent.click(rule);
    expect(rule).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('All pairs')).not.toBeInTheDocument();

    await userEvent.click(rule);
    expect(rule).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('All pairs')).toBeInTheDocument();
  });

  it('opens with initialRuleId selected', () => {
    render(
      <CalibrationView analytics={ANALYTICS} voteLog={{generatedAt: '', votes: [], voterCount: 0}} initialRuleId="ramp" />,
    );
    expect(screen.getByRole('button', {name: /Ramp/})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/^Ramp · gap/)).toBeInTheDocument();
  });

  it('opens on all pairs when initialRuleId names a rule the analytics lack', () => {
    const pair = {a: 'c1', b: 'c2', aName: 'Maui', bName: 'Fishhook', engineScore: 8, communityScore: 5, gap: -3, scoreVotes: 12, rules: ['ramp']};
    render(
      <CalibrationView
        analytics={{...ANALYTICS, pairs: [pair]}}
        voteLog={{generatedAt: '', votes: [], voterCount: 0}}
        initialRuleId="retired-rule"
      />,
    );
    expect(screen.getByRole('button', {name: /Ramp/})).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('All pairs')).toBeInTheDocument();
    // A stale id must not scope the list to a rule nobody has: every pair still shows.
    expect(screen.getByRole('button', {name: /Maui/})).toBeInTheDocument();
  });

  it('signs every gap with a true minus (U+2212)', async () => {
    const analytics: VoteAnalytics = {
      ...ANALYTICS,
      hasRawVotes: true,
      global: {...ANALYTICS.global, accuracySentiment: -0.12, weekly: [{week: '2026-09-28', votes: 3, meanGap: -0.4}]},
    };
    render(<CalibrationView analytics={analytics} voteLog={{generatedAt: '', votes: [], voterCount: 0}} />);
    // The hero's mean gap and the Ramp row's gap, both −0.4.
    expect(screen.getAllByText('−0.40')).toHaveLength(2);
    expect(screen.getByText('−0.12')).toBeInTheDocument();
    expect(screen.getByTitle('Week of Sep 28: 3 votes, gap −0.40')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', {name: /Ramp/}));
    expect(screen.getByText('Ramp · gap −0.40 · 3 votes')).toBeInTheDocument();
  });
});
