import {describe, expect, it} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import {renderWithCards} from '../../../test/cardLinks';
import {VoteDetailTable} from '../VoteDetailTable';
import type {VoteLogRow} from '../voteLogTypes';

const PAIR = {a: '1', b: '2', aName: 'Sisu', bName: 'Raya', engineScore: 8};

function vote(over: Partial<VoteLogRow>): VoteLogRow {
  return {
    a: '1',
    b: '2',
    aName: 'Sisu',
    bName: 'Raya',
    score: 8,
    accuracy: null,
    isReal: null,
    wouldPlay: null,
    difficulty: null,
    whoCarries: null,
    ts: '2026-06-28T14:02:00Z',
    voter: 1,
    ...over,
  };
}

const VOTES: VoteLogRow[] = [
  vote({voter: 1, score: 8, accuracy: -1, wouldPlay: true, ts: '2026-06-28T14:02:00Z'}),
  // The real log's form: Supabase's created_at, with microseconds and a +00:00 offset.
  vote({voter: 2, score: 5, accuracy: 0, wouldPlay: false, ts: '2026-06-29T09:41:00.123456+00:00'}),
  vote({voter: 3, score: null, accuracy: 1, wouldPlay: null, ts: '2026-06-30T22:15:00Z'}),
];

describe('VoteDetailTable', () => {
  it('prompts for a pair when none is selected', () => {
    render(<VoteDetailTable pair={null} votes={[]} />);
    const panel = screen.getByRole('region', {name: 'Votes'});
    expect(within(panel).getByText('Select a pair to see its votes')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('heads the panel with the pair and its engine score, over a table of its votes', () => {
    render(<VoteDetailTable pair={PAIR} votes={VOTES} />);
    const panel = screen.getByRole('region', {name: 'Sisu × Raya'});
    expect(within(panel).getByText('engine 8')).toBeInTheDocument();

    const table = within(panel).getByRole('table', {name: 'Votes on Sisu × Raya'});
    const headers = within(table).getAllByRole('columnheader');
    expect(headers.map((th) => th.textContent)).toEqual(['Score', 'Accuracy', 'Would play', 'When']);
    // A <th> maps to columnheader with or without scope, so the scope is asserted on its own.
    for (const th of headers) expect(th).toHaveAttribute('scope', 'col');
    expect(within(table).getAllByRole('row')).toHaveLength(4);
  });

  it('links each name in its heading that the card list holds (R-33), still named by the pair', () => {
    renderWithCards(<VoteDetailTable pair={PAIR} votes={VOTES} />, ['1']);
    const panel = screen.getByRole('region', {name: 'Sisu × Raya'});
    const heading = within(panel).getByRole('heading', {level: 2, name: 'Sisu × Raya'});
    expect(within(heading).getByRole('link', {name: 'Sisu'})).toHaveAttribute('href', '/cards/1');
    expect(within(heading).queryByRole('link', {name: 'Raya'})).not.toBeInTheDocument();
    expect(within(panel).getByRole('table', {name: 'Votes on Sisu × Raya'})).toBeInTheDocument();
  });

  it('pills each score, labels accuracy as too high / right / too low, would-play as yes / no / —, and dates each vote', () => {
    render(<VoteDetailTable pair={PAIR} votes={VOTES} />);
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('cell').map((td) => td.textContent))).toEqual([
      ['8', 'too high', 'yes', '2026-06-28'],
      ['5', 'right', 'no', '2026-06-29'],
      ['—', 'too low', '—', '2026-06-30'],
    ]);
  });

  it('shows "—" in the score pill for a vote with no score', () => {
    render(<VoteDetailTable pair={PAIR} votes={VOTES} />);
    expect(screen.getByRole('img', {name: 'No score'})).toHaveTextContent('—');
  });

  it('shows the notice in place of the table', () => {
    render(<VoteDetailTable pair={PAIR} votes={VOTES} notice="Loading the vote log…" />);
    const panel = screen.getByRole('region', {name: 'Sisu × Raya'});
    expect(within(panel).getByText('Loading the vote log…')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    // The page's own Notice announces a failure; this line never does.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says so when the vote log holds no votes for the pair', () => {
    render(<VoteDetailTable pair={PAIR} votes={[]} />);
    expect(screen.getByText('No votes for this pair in the vote log.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
