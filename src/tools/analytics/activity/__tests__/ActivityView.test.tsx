import {describe, expect, it} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {renderWithCards} from '../../../../test/cardLinks';
import {ActivityView} from '../ActivityView';
import type {VoteLog, VoteLogRow} from '../../voteLogTypes';

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

const MAUI = {a: '3', b: '4', aName: 'Maui', bName: 'Moana'};
const SCAR = {a: '5', b: '6', aName: 'Scar', bName: 'Simba'};

// Newest first, as buildVoteLog writes the log. The ranges, counted back from Wed Sep 30:
// 7 days (from Sep 24) hold the first three votes, 30 days (from Sep 1) four, 90 days
// (from Jul 3) five, and All (from Jun 10, 113 days) all six, charted per week.
const LOG: VoteLog = {
  generatedAt: '2026-10-01T04:00:00Z',
  voterCount: 3,
  votes: [
    vote({ts: '2026-09-30T18:05:00Z', voter: 1, score: 8, whoCarries: 'a'}),
    vote({...MAUI, ts: '2026-09-30T09:15:00Z', voter: 2, score: 3, whoCarries: 'both'}),
    vote({ts: '2026-09-29T12:00:00Z', voter: 1, score: null}),
    vote({...SCAR, ts: '2026-09-01T08:00:00Z', voter: 3, score: 6}),
    vote({...MAUI, ts: '2026-08-15T10:00:00Z', voter: 3, score: 9}),
    vote({...SCAR, ts: '2026-06-10T10:00:00Z', voter: 2, score: 4}),
  ],
};

const logTable = () => screen.getByRole('table', {name: 'Votes matching the filters, newest first'});
const pairsInLog = () => within(logTable()).getAllByRole('cell', {name: /×/}).map((cell) => cell.textContent);
const kpis = () => within(screen.getByRole('region', {name: 'Activity summary'}));
const search = () => screen.getByRole('searchbox', {name: 'Search pairs'});
const voterSelect = () => screen.getByRole('combobox', {name: 'Filter by voter'});
const range = (label: string) => within(screen.getByRole('group', {name: 'Range'})).getByRole('button', {name: label});
const band = (label: string) =>
  within(screen.getByRole('group', {name: 'Filter by score'})).getByRole('button', {name: label});
/** A chart bar, found by the start of its accessible name: its tooltip's title. */
const bar = (title: string) => screen.getByRole('button', {name: new RegExp(`^${title}\\b`)});
/** The vote log's day picker, the bars' 24px-or-larger equivalent (WCAG 2.5.8). */
const daySelect = () => screen.getByRole('combobox', {name: 'Pick a day'});

describe('ActivityView', () => {
  it('says the vote log is loading', () => {
    render(<ActivityView voteLog={null} />);
    expect(screen.getByText('Loading vote log...')).toBeInTheDocument();
  });

  it('names the file when the vote log could not load', () => {
    render(<ActivityView voteLog={null} error={new Error('vote-log.json has not been generated yet')} />);
    expect(
      screen.getByText('Could not load the vote log. Has the artifact been generated? (vote-log.json has not been generated yet)'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Loading vote log...')).not.toBeInTheDocument();
  });

  it('explains an empty log as no raw votes, with nothing to filter', () => {
    render(<ActivityView voteLog={{generatedAt: '2026-10-01T04:00:00Z', votes: [], voterCount: 0}} />);
    expect(screen.getByText(/^No raw votes yet\./)).toBeInTheDocument();
    expect(screen.getByText('SUPABASE_SERVICE_ROLE_KEY')).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('opens on the last 30 days, and the range scopes the KPIs, chart, log and side panels', () => {
    render(<ActivityView voteLog={LOG} />);
    expect(range('30 days')).toHaveAttribute('aria-pressed', 'true');

    expect(kpis().getByText('4')).toBeInTheDocument();
    expect(kpis().getByText('of 3 distinct voters')).toBeInTheDocument();
    // (8 + 3 + 6) / 3: the unscored vote counts as a vote, never toward the average.
    expect(kpis().getByText('5.7')).toBeInTheDocument();
    expect(kpis().getByText('Wed Sep 30')).toBeInTheDocument();
    expect(kpis().getByText('2 votes')).toBeInTheDocument();

    expect(screen.getByRole('heading', {name: 'Votes per day'})).toBeInTheDocument();
    expect(screen.getAllByRole('button', {name: /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Aug|Sep) \d+\b/})).toHaveLength(30);
    expect(bar('Tue Sep 1')).toBeInTheDocument();

    expect(pairsInLog()).toHaveLength(4);
    // Ties on votes go to the pair voted most recently: Maui × Moana's vote is Sep 30, Scar × Simba's Sep 1.
    expect(
      within(screen.getByRole('table', {name: 'Most voted pairs'}))
        .getAllByRole('cell', {name: /×/})
        .map((cell) => cell.textContent),
    ).toEqual(['Elsa × Anna', 'Maui × Moana', 'Scar × Simba']);
    expect(screen.getByRole('button', {name: '#1, 2 votes'})).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Clear filters'})).not.toBeInTheDocument();
  });

  it('links the cards the card list holds, in Most voted pairs and in the log (R-33)', () => {
    // Elsa is card 1 and Moana card 4; Anna, Maui, Scar and Simba are outside the card list.
    renderWithCards(<ActivityView voteLog={LOG} />, ['1', '4']);
    const top = within(screen.getByRole('table', {name: 'Most voted pairs'}));
    expect(top.getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Elsa', '/cards/1'],
      ['Moana', '/cards/4'],
    ]);
    expect(within(logTable()).getAllByRole('link').map((a) => a.textContent)).toEqual(['Elsa', 'Moana', 'Elsa']);
  });

  it('narrows to 7 days and widens to 90, charting each day', async () => {
    render(<ActivityView voteLog={LOG} />);

    await userEvent.click(range('7 days'));
    expect(range('7 days')).toHaveAttribute('aria-pressed', 'true');
    expect(kpis().getByText('3')).toBeInTheDocument();
    expect(kpis().getByText('5.5')).toBeInTheDocument();
    expect(screen.getAllByRole('button', {name: /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) Sep \d+\b/})).toHaveLength(7);
    expect(pairsInLog()).toHaveLength(3);

    await userEvent.click(range('90 days'));
    expect(kpis().getByText('5')).toBeInTheDocument();
    expect(kpis().getByText('6.5')).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: 'Votes per day'})).toBeInTheDocument();
    expect(pairsInLog()).toHaveLength(5);
    // The range is the window, not a filter, so there is nothing to clear.
    expect(screen.queryByRole('button', {name: 'Clear filters'})).not.toBeInTheDocument();
  });

  it('charts the whole log per week once it runs past 90 days', async () => {
    render(<ActivityView voteLog={LOG} />);
    await userEvent.click(range('All'));

    expect(kpis().getByText('6')).toBeInTheDocument();
    expect(kpis().getByText('6.0')).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: 'Votes per week'})).toBeInTheDocument();
    // Mon Jun 8 (the week of the oldest vote) to Mon Sep 28: 17 weeks.
    expect(screen.getAllByRole('button', {name: /^Week of /})).toHaveLength(17);
    expect(bar('Week of Jun 8')).toBeInTheDocument();
    expect(pairsInLog()).toHaveLength(6);
  });

  it('searches either card name, ignoring case', async () => {
    render(<ActivityView voteLog={LOG} />);
    await userEvent.type(search(), 'MOANA');
    // Maui × Moana's Aug 15 vote is older than the 30 days.
    expect(pairsInLog()).toEqual(['Maui × Moana']);
    expect(kpis().getByText('1 vote')).toBeInTheDocument();
  });

  it('narrows the page to the voter picked in the select', async () => {
    render(<ActivityView voteLog={LOG} />);
    await userEvent.selectOptions(voterSelect(), '3');
    expect(pairsInLog()).toEqual(['Scar × Simba']);
    expect(screen.getByRole('button', {name: '#3, 1 vote'})).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps unscored votes in a band of their own', async () => {
    render(<ActivityView voteLog={LOG} />);
    await userEvent.click(band('No score'));
    expect(band('No score')).toHaveAttribute('aria-pressed', 'true');
    expect(pairsInLog()).toEqual(['Elsa × Anna']);
    expect(kpis().getByText('—')).toBeInTheDocument();

    await userEvent.click(band('≤4'));
    expect(pairsInLog()).toEqual(['Maui × Moana']);
  });

  it('filters the log to a day picked in the chart, and clears it on a second pick', async () => {
    render(<ActivityView voteLog={LOG} />);

    await userEvent.click(bar('Tue Sep 29'));
    expect(bar('Tue Sep 29')).toHaveAttribute('aria-pressed', 'true');
    expect(pairsInLog()).toEqual(['Elsa × Anna']);
    expect(screen.getByText('Tue Sep 29 · 1 vote')).toBeInTheDocument();
    // The day narrows the log, not the KPIs.
    expect(kpis().getByText('4')).toBeInTheDocument();

    await userEvent.click(bar('Tue Sep 29'));
    expect(bar('Tue Sep 29')).toHaveAttribute('aria-pressed', 'false');
    expect(pairsInLog()).toHaveLength(4);
  });

  it("picks a day from the log's select as a bar pick does, and the select follows a bar pick", async () => {
    render(<ActivityView voteLog={LOG} />);
    expect(daySelect()).toHaveValue('');

    await userEvent.selectOptions(daySelect(), '2026-09-29');
    expect(bar('Tue Sep 29')).toHaveAttribute('aria-pressed', 'true');
    expect(pairsInLog()).toEqual(['Elsa × Anna']);

    await userEvent.click(bar('Wed Sep 30'));
    expect(daySelect()).toHaveValue('2026-09-30');

    await userEvent.selectOptions(daySelect(), '');
    expect(bar('Wed Sep 30')).toHaveAttribute('aria-pressed', 'false');
    expect(pairsInLog()).toHaveLength(4);
  });

  it('picks a whole week when the chart runs per week, and the log reads that week', async () => {
    render(<ActivityView voteLog={LOG} />);
    await userEvent.click(range('All'));
    await userEvent.click(bar('Week of Sep 28'));

    expect(bar('Week of Sep 28')).toHaveAttribute('aria-pressed', 'true');
    expect(pairsInLog()).toEqual(['Elsa × Anna', 'Maui × Moana', 'Elsa × Anna']);
    // The log's summary and its picker keep the plain week name; the bar's own name says the week is clipped.
    expect(screen.getByText('Week of Sep 28 · 3 votes')).toBeInTheDocument();
    expect(screen.getByRole('combobox', {name: 'Pick a week'})).toHaveValue('2026-09-28');
    expect(kpis().getByText('6')).toBeInTheDocument();
  });

  it('drops the picked bar when the range changes', async () => {
    render(<ActivityView voteLog={LOG} />);
    await userEvent.click(bar('Tue Sep 29'));
    expect(pairsInLog()).toEqual(['Elsa × Anna']);

    await userEvent.click(range('7 days'));
    expect(bar('Tue Sep 29')).toHaveAttribute('aria-pressed', 'false');
    expect(pairsInLog()).toHaveLength(3);
    expect(screen.queryByRole('button', {name: 'Clear filters'})).not.toBeInTheDocument();
  });

  it('filters by a voter picked in the log, keeping focus on the pick, and Most active voters toggles them off', async () => {
    render(<ActivityView voteLog={LOG} />);
    await userEvent.click(screen.getByRole('button', {name: 'Filter by voter #2'}));
    expect(voterSelect()).toHaveValue('2');
    expect(pairsInLog()).toEqual(['Maui × Moana']);
    // The row keeps its key when the filter drops the rows around it, so keyboard focus stays put.
    expect(screen.getByRole('button', {name: 'Filter by voter #2'})).toHaveFocus();

    const topVoter = screen.getByRole('button', {name: '#2, 1 vote'});
    expect(topVoter).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(topVoter);
    expect(voterSelect()).toHaveValue('');
    expect(pairsInLog()).toHaveLength(4);
  });

  it('lists 25 votes, then 25 more on request, and starts over when a filter changes', async () => {
    // Thirty distinct times on one day, half an hour apart, so every row has its own key.
    const votes = Array.from({length: 30}, (_, i) =>
      vote({
        ts: `2026-09-30T${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}:00Z`,
        voter: 1,
        aName: `Card ${i}`,
      }),
    );
    render(<ActivityView voteLog={{generatedAt: '2026-10-01T04:00:00Z', votes, voterCount: 1}} />);
    expect(pairsInLog()).toHaveLength(25);

    await userEvent.click(screen.getByRole('button', {name: 'Show 5 more'}));
    expect(pairsInLog()).toHaveLength(30);
    expect(screen.queryByRole('button', {name: /^Show \d+ more$/})).not.toBeInTheDocument();

    await userEvent.click(band('7+'));
    expect(pairsInLog()).toHaveLength(25);
  });

  it('clears the search, voter, band and picked day at once, and keeps the range', async () => {
    render(<ActivityView voteLog={LOG} />);
    await userEvent.click(range('7 days'));
    await userEvent.type(search(), 'elsa');
    await userEvent.selectOptions(voterSelect(), '1');
    await userEvent.click(band('7+'));
    await userEvent.click(bar('Wed Sep 30'));
    expect(pairsInLog()).toEqual(['Elsa × Anna']);

    await userEvent.click(screen.getByRole('button', {name: 'Clear filters'}));
    expect(search()).toHaveValue('');
    expect(voterSelect()).toHaveValue('');
    expect(band('All')).toHaveAttribute('aria-pressed', 'true');
    expect(bar('Wed Sep 30')).toHaveAttribute('aria-pressed', 'false');
    expect(range('7 days')).toHaveAttribute('aria-pressed', 'true');
    expect(pairsInLog()).toHaveLength(3);
    expect(screen.queryByRole('button', {name: 'Clear filters'})).not.toBeInTheDocument();
  });

  it('says when no vote matches, naming the voter when one is picked', async () => {
    render(<ActivityView voteLog={LOG} />);
    await userEvent.type(search(), 'zzz');
    expect(screen.getByText('No votes match these filters.')).toBeInTheDocument();
    expect(screen.queryByRole('table', {name: /newest first/})).not.toBeInTheDocument();

    await userEvent.clear(search());
    await userEvent.selectOptions(voterSelect(), '3');
    await userEvent.click(band('No score'));
    expect(screen.getByText('No votes from voter 3 match these filters.')).toBeInTheDocument();
  });
});
