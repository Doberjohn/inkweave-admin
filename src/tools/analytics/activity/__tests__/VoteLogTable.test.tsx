import type {ComponentProps} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {renderWithCards} from '../../../../test/cardLinks';
import {VoteLogTable} from '../VoteLogTable';
import type {VoteLogRow} from '../../voteLogTypes';

function vote(over: Partial<VoteLogRow> & Pick<VoteLogRow, 'ts' | 'voter'>): VoteLogRow {
  return {
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
    ...over,
  };
}

const VOTES: VoteLogRow[] = [
  vote({ts: '2026-09-30T18:05:00Z', voter: 1, whoCarries: 'a'}),
  // The real log's form: Supabase's created_at, with microseconds and a +00:00 offset.
  vote({
    ts: '2026-09-30T09:15:00.123456+00:00',
    voter: 2,
    aName: 'Maui',
    bName: 'Moana',
    score: null,
    whoCarries: 'neither',
  }),
  vote({ts: '2026-09-29T12:00:00Z', voter: 1, score: 3, whoCarries: 'b'}),
];

function renderTable(over: Partial<ComponentProps<typeof VoteLogTable>> = {}) {
  const props: ComponentProps<typeof VoteLogTable> = {
    votes: VOTES,
    limit: 25,
    pickedLabel: null,
    voter: null,
    onShowMore: vi.fn(),
    onPickVoter: vi.fn(),
    ...over,
  };
  render(<VoteLogTable {...props} />);
  return props;
}

describe('VoteLogTable', () => {
  it('is a real table: a caption, column headers and a row header per day', () => {
    renderTable();
    const table = screen.getByRole('table', {name: 'Votes matching the filters, newest first'});

    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Time (UTC)',
      'Pair',
      'Score',
      'Carries',
      'Voter',
    ]);
    expect(within(table).getAllByRole('rowheader').map((th) => th.textContent)).toEqual([
      'Wed Sep 30 · 2 votes · 2 voters',
      'Tue Sep 29 · 1 vote · 1 voter',
    ]);
  });

  it("shows each vote's UTC time and names the card that carries", () => {
    renderTable();
    expect(screen.getByRole('cell', {name: '18:05'})).toBeInTheDocument();
    expect(screen.getByRole('cell', {name: '09:15'})).toBeInTheDocument();
    expect(screen.getByRole('cell', {name: 'Elsa'})).toBeInTheDocument();
    expect(screen.getByRole('cell', {name: 'Anna'})).toBeInTheDocument();
    expect(screen.getByRole('cell', {name: 'Neither'})).toBeInTheDocument();
  });

  it("keeps a day's full counts on a short page, and asks for the rest", async () => {
    const props = renderTable({limit: 1});

    expect(screen.getAllByRole('cell', {name: /×/})).toHaveLength(1);
    expect(screen.getByRole('rowheader', {name: 'Wed Sep 30 · 2 votes · 2 voters'})).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Show 2 more'}));
    expect(props.onShowMore).toHaveBeenCalledOnce();
  });

  it('hands a voter click back', async () => {
    const props = renderTable();
    await userEvent.click(screen.getAllByRole('button', {name: 'Filter by voter #1'})[0]);
    expect(props.onPickVoter).toHaveBeenCalledWith(1);
  });

  it('names the picked bar in its summary', () => {
    renderTable({votes: VOTES.slice(0, 2), pickedLabel: 'Wed Sep 30'});
    expect(screen.getByText('Wed Sep 30 · 2 votes')).toBeInTheDocument();
  });

  it('links each card the card list holds to its card page, and leaves the rest as text (R-33)', () => {
    renderWithCards(
      <VoteLogTable
        votes={VOTES.slice(0, 1)}
        limit={25}
        pickedLabel={null}
        voter={null}
        onShowMore={vi.fn()}
        onPickVoter={vi.fn()}
      />,
      ['1'],
    );
    const pair = screen.getByRole('cell', {name: 'Elsa × Anna'});
    expect(within(pair).getByRole('link', {name: 'Elsa'})).toHaveAttribute('href', '/cards/1');
    expect(within(pair).queryByRole('link', {name: 'Anna'})).not.toBeInTheDocument();
    // The whole pair stays the cell's title, for a line cut short.
    expect(pair).toHaveAttribute('title', 'Elsa × Anna');
  });

  it('says when nothing matches, naming the voter when one is picked', () => {
    renderTable({votes: [], voter: 3});
    expect(screen.getByText('No votes from voter 3 match these filters.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
