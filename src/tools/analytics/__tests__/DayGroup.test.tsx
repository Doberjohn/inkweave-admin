import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {DayGroup} from '../DayGroup';
import type {VoteLogRow} from '../voteLogTypes';

const VOTE: VoteLogRow = {
  a: '1',
  b: '2',
  aName: 'Elsa',
  bName: 'Anna',
  score: 8,
  accuracy: null,
  isReal: null,
  wouldPlay: null,
  difficulty: null,
  whoCarries: null,
  ts: '2026-07-01T09:30:00Z',
  voter: 1,
};

describe('DayGroup', () => {
  it('opens a day to show its votes', async () => {
    render(<DayGroup group={{day: '2026-07-01', count: 1, voters: 1, votes: [VOTE]}} maxCount={1} />);
    const header = screen.getByRole('button', {name: /Wed - Jul 1/});
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await userEvent.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('cell', {name: 'Elsa × Anna'})).toBeInTheDocument();
  });
});
