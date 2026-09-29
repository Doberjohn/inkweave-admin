import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {RuleCalibrationTable} from '../RuleCalibrationTable';
import type {RuleStat} from '../voteAnalyticsTypes';

function rule(ruleId: string, meanGap: number, scoreVotes: number): RuleStat {
  return {
    ruleId,
    ruleName: ruleId,
    category: 'direct',
    scoreVotes,
    pairsVoted: 1,
    meanGap,
    accuracySentiment: null,
    pairsCovered: 1,
  };
}

const RULES = [rule('small-gap', 0.5, 40), rule('big-gap', -2, 12)];

/** Rule names in row order. Rows carry aria-pressed; the sort headers don't. */
const rowOrder = () => screen.getAllByRole('button', {pressed: false}).map((row) => row.textContent);

describe('RuleCalibrationTable', () => {
  it('sorts by the size of the gap, then by votes from the Votes header', async () => {
    render(<RuleCalibrationTable rules={RULES} selectedRuleId={null} onSelectRule={() => {}} />);
    expect(rowOrder()[0]).toMatch(/^big-gap/);

    await userEvent.click(screen.getByRole('button', {name: 'Votes'}));
    expect(rowOrder()[0]).toMatch(/^small-gap/);
    expect(screen.getByRole('button', {name: 'Votes ▼'})).toBeInTheDocument();
  });
});
