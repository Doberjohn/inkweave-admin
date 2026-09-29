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
});
