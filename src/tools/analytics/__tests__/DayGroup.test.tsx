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

  it('lists a busy day in part, then every vote on request', async () => {
    const votes = Array.from({length: 61}, () => VOTE);
    render(<DayGroup group={{day: '2026-07-01', count: 61, voters: 1, votes}} maxCount={61} defaultOpen />);
    expect(screen.getAllByRole('cell', {name: 'Elsa × Anna'})).toHaveLength(60);

    await userEvent.click(screen.getByRole('button', {name: 'Show 1 more this day'}));
    expect(screen.getAllByRole('cell', {name: 'Elsa × Anna'})).toHaveLength(61);
    expect(screen.queryByRole('button', {name: /more this day/})).not.toBeInTheDocument();
  });
});
