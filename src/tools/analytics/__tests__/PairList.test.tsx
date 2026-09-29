import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {PairList} from '../PairList';
import type {PairStat} from '../voteAnalyticsTypes';

function pair(a: string, b: string): PairStat {
  return {a, b, aName: `Card ${a}`, bName: `Card ${b}`, engineScore: 7, communityScore: 4, gap: -3, scoreVotes: 1, rules: []};
}

const PAIRS = [pair('1', '2'), pair('3', '4')];

describe('PairList', () => {
  it('selects a pair and marks the selected one pressed', async () => {
    const onSelectPair = vi.fn();
    render(<PairList pairs={PAIRS} selectedPair={{a: '1', b: '2'}} onSelectPair={onSelectPair} />);

    await userEvent.click(screen.getByRole('button', {name: /Card 3/}));
    expect(onSelectPair).toHaveBeenCalledWith({a: '3', b: '4'});
    expect(screen.getByRole('button', {name: /Card 1/})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', {name: /Card 3/})).toHaveAttribute('aria-pressed', 'false');
  });
});
