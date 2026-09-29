import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ActivityView} from '../ActivityView';
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

describe('ActivityView', () => {
  it('says so when the chosen voter has no votes in the log', async () => {
    render(<ActivityView voteLog={{generatedAt: '', votes: [VOTE], voterCount: 2}} />);
    await userEvent.selectOptions(screen.getByLabelText('Filter by voter'), '2');
    expect(screen.getByText('No votes from voter 2 in this log.')).toBeInTheDocument();
  });
});
