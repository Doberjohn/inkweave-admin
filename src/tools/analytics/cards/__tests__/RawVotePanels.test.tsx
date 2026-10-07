import {describe, expect, it} from 'vitest';
import {act, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ADMIN_COLORS} from '../../../../theme/adminTheme';
import {RawVotePanels, type RawVotePanelsProps} from '../RawVotePanels';
import {
  EMPTY_LOG,
  LOADING,
  NOT_GENERATED,
  NO_RAW_ANALYTICS,
  QUICK_ONLY_CARD,
  RAW_ANALYTICS,
  RAW_CARD,
  RAW_LOG,
  THIN_CARD,
  UNVOTED_CARD,
  loaded,
} from '../cardFixtures';

/** Card 8001 with both files loaded, unless the case says otherwise. */
function renderPanels(props: Partial<RawVotePanelsProps> = {}) {
  return render(<RawVotePanels card={RAW_CARD} analytics={loaded(RAW_ANALYTICS)} voteLog={loaded(RAW_LOG)} {...props} />);
}

/** A table row's cells as text, header cells included. */
const cells = (row: HTMLElement) => [...row.querySelectorAll('th, td')].map((cell) => cell.textContent);

describe('RawVotePanels: states', () => {
  it.each<[string, Partial<RawVotePanelsProps>, string]>([
    // The artifact says there are no raw votes: no need to wait for the log.
    ['no raw votes, said by vote analytics', {analytics: loaded(NO_RAW_ANALYTICS), voteLog: LOADING}, 'need raw votes'],
    ['no raw votes, an empty log', {voteLog: loaded(EMPTY_LOG)}, 'need raw votes'],
    ['the log loading', {voteLog: LOADING}, 'Loading vote log...'],
    ['a card no vote names', {card: UNVOTED_CARD}, 'No raw votes on this card yet.'],
  ])('%s', (_, props, text) => {
    renderPanels(props);
    expect(screen.getByText(text, {exact: false})).toBeInTheDocument();
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
  });

  it('names the secret in the raw-votes notice', () => {
    renderPanels({voteLog: loaded(EMPTY_LOG)});
    expect(screen.getByText('SUPABASE_SERVICE_ROLE_KEY').tagName).toBe('CODE');
  });

  it('says why the log failed, as an alert', () => {
    renderPanels({voteLog: NOT_GENERATED});
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load the vote log. Has the artifact been generated? (HTTP 404)',
    );
  });

  it('puts the histogram beside the answers, and the weekly chart under them at full width', () => {
    renderPanels();
    const row = screen.getByRole('region', {name: 'How voters answered'}).parentElement;
    expect(row).toHaveStyle({display: 'grid'});
    expect(row).toContainElement(screen.getByRole('figure', {name: 'Community scores'}));
    expect(row).not.toContainElement(screen.getByRole('figure', {name: 'Votes per week'}));
  });

  it.each<[string, RawVotePanelsProps['analytics']]>([
    ['still loads', LOADING],
    ['failed', NOT_GENERATED],
  ])('draws every panel while vote analytics %s, and leaves the engine out of the subtitle', (_, analytics) => {
    renderPanels({analytics});
    expect(screen.getByRole('figure', {name: 'Community scores'})).toBeInTheDocument();
    expect(screen.getByText('Average 7.0 from 13 scored votes (plain mean) · most often 7 (4 votes)')).toBeInTheDocument();
  });
});

describe('Community scores', () => {
  it('reads the mean, the peak and the engine in its subtitle, and counts the quick votes under it', () => {
    renderPanels();
    expect(
      screen.getByText(
        'Average 7.0 from 13 scored votes (plain mean) · most often 7 (4 votes) · engine 7.2 on the pairs it scores',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('3 quick votes without a score left out. How voters answered counts their answers.')).toBeInTheDocument();
  });

  it('draws ten columns in the score bands, prints no count over them, and keys the bands', () => {
    renderPanels();
    const figure = screen.getByRole('figure', {name: 'Community scores'});
    const labels = [...figure.querySelectorAll('[data-x-label]')].map((t) => t.textContent);
    expect(labels).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    const mark = (key: string) => figure.querySelector(`[data-key="${key}"] [data-series]`);
    expect(mark('3')).toHaveAttribute('fill', ADMIN_COLORS.over);
    expect(mark('6')).toHaveAttribute('fill', ADMIN_COLORS.barNeutral);
    expect(mark('7')).toHaveAttribute('fill', ADMIN_COLORS.under);
    expect(mark('1')).toBeNull();
    expect(figure.querySelectorAll('[data-cap]')).toHaveLength(0);
    const legend = within(figure).getByRole('list', {name: 'Legend'});
    expect(within(legend).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['≤4', '5–6', '7+']);
  });

  it('reads a column from the keyboard', async () => {
    renderPanels();
    const slider = screen.getByRole('slider', {name: 'Community scores from 1 to 10'});
    act(() => slider.focus());
    await userEvent.keyboard('{Home}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}');
    expect(slider).toHaveAttribute('aria-valuetext', 'Score 7: 4 votes, 31% of 13 scored votes');
  });

  it('tables all ten scores, and no quick vote', async () => {
    renderPanels();
    const figure = screen.getByRole('figure', {name: 'Community scores'});
    await userEvent.click(within(figure).getByRole('button', {name: 'Table'}));
    const table = within(figure).getByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(10);
    expect(cells(rows[6])).toEqual(['7', '4', '31%']);
    expect(rows.reduce((sum, row) => sum + Number(cells(row)[1]), 0)).toBe(13);
  });

  it('names no peak when every score has one vote, and keeps the engine', () => {
    renderPanels({card: THIN_CARD});
    expect(screen.getByText('Average 5.5 from 2 scored votes (plain mean) · engine 7.0 on the pairs it scores')).toBeInTheDocument();
  });

  it('keeps its titled frame with only quick votes, with the reason in place of the chart and no legend', () => {
    renderPanels({card: QUICK_ONLY_CARD});
    const figure = screen.getByRole('figure', {name: 'Community scores'});
    expect(within(figure).getByText('No scored votes on this card yet (2 quick votes without a score).')).toBeInTheDocument();
    expect(screen.queryByRole('slider', {name: 'Community scores from 1 to 10'})).not.toBeInTheDocument();
    expect(within(figure).queryByRole('list', {name: 'Legend'})).not.toBeInTheDocument();
  });
});

describe('How voters answered', () => {
  it('splits the accuracy answers, with each share and count in the legend', () => {
    renderPanels();
    const panel = screen.getByRole('region', {name: 'How voters answered'});
    const split = within(panel).getByRole('list', {name: 'Is the engine’s score right?'});
    expect(within(split).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Too high 20% (2)',
      'Right 60% (6)',
      'Too low 20% (2)',
    ]);
    expect(within(panel).getByText('10 votes answered it.')).toBeInTheDocument();
  });

  it('prints each rate beside an unnamed meter, with its counts, and the difficulty out of 3', () => {
    renderPanels();
    const panel = screen.getByRole('region', {name: 'How voters answered'});
    const rows = within(panel)
      .getAllByRole('listitem')
      .filter((item) => !item.closest('[aria-label="Is the engine’s score right?"]'));
    expect(rows.map((row) => [...row.children].map((child) => child.textContent))).toEqual([
      ['Says it’s real', '', '75%', '3 of 4 answers'],
      ['Would play it', '', '33%', '1 of 3 answers'],
      ['Named as carry', '', '67%', '2 of 3 votes that named one card · Both 9 · Neither 1'],
    ]);
    // The share is printed, so the bar is decoration: a named meter would read it twice.
    expect(within(panel).queryAllByRole('meter')).toHaveLength(0);
    expect(within(panel).getByText('Average difficulty 1.8 / 3 (Easy 2 · Situational 1 · Hard 1)')).toBeInTheDocument();
  });

  it('says where nobody answered', () => {
    renderPanels({card: THIN_CARD});
    const panel = screen.getByRole('region', {name: 'How voters answered'});
    expect(within(panel).getByText('No accuracy answers yet.')).toBeInTheDocument();
    expect(within(panel).queryByText(/answered it\.$/)).not.toBeInTheDocument();
    expect(within(panel).getAllByText('No answers yet')).toHaveLength(2);
    expect(within(panel).getAllByText('—')).toHaveLength(3);
    expect(within(panel).getByText('No vote named one card · Both 0 · Neither 0')).toBeInTheDocument();
    expect(within(panel).getByText('No difficulty answers yet.')).toBeInTheDocument();
  });
});

describe('Votes per week', () => {
  it('runs over the whole log in Monday weeks, names its part week, and tables every week', async () => {
    renderPanels();
    const figure = screen.getByRole('figure', {name: 'Votes per week'});
    expect(
      within(figure).getByText(
        'Whole vote log, Aug 17 – Sep 30, in weeks from Monday, last week partial · votes on this card Aug 17 – Sep 29',
      ),
    ).toBeInTheDocument();
    await userEvent.click(within(figure).getByRole('button', {name: 'Table'}));
    const rows = within(within(figure).getByRole('table')).getAllByRole('row').slice(1);
    expect(rows.map(cells)).toEqual([
      ['Week of Aug 17', '2'],
      ['Week of Aug 24', '0'],
      ['Week of Aug 31', '3'],
      ['Week of Sep 7', '1'],
      ['Week of Sep 14', '5'],
      ['Week of Sep 21', '3'],
      ['Week of Sep 28 (to Sep 30)', '2'],
    ]);
  });

  it('draws the latest week in the accent, prints the latest and the busiest counts, and has no legend', () => {
    renderPanels();
    const figure = screen.getByRole('figure', {name: 'Votes per week'});
    const mark = (key: string) => figure.querySelector(`[data-key="${key}"] [data-series="votes"]`);
    expect(mark('2026-09-28')).toHaveAttribute('fill', ADMIN_COLORS.accent);
    expect(mark('2026-09-14')).toHaveAttribute('fill', ADMIN_COLORS.barNeutral);
    expect([...figure.querySelectorAll('[data-cap]')].map((cap) => cap.getAttribute('data-cap'))).toEqual([
      '2026-09-14',
      '2026-09-28',
    ]);
    expect(within(figure).queryByRole('list', {name: 'Legend'})).not.toBeInTheDocument();
  });

  it('reads the part week from the keyboard', async () => {
    renderPanels();
    const slider = screen.getByRole('slider', {name: 'Votes per week'});
    act(() => slider.focus());
    await userEvent.keyboard('{End}');
    expect(slider).toHaveAttribute('aria-valuetext', 'Week of Sep 28 (to Sep 30): 2 votes');
  });

  it('ends at the log’s newest week for a card whose last vote is older', async () => {
    renderPanels({card: THIN_CARD});
    const figure = screen.getByRole('figure', {name: 'Votes per week'});
    await userEvent.click(within(figure).getByRole('button', {name: 'Table'}));
    const rows = within(within(figure).getByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(7);
    expect(cells(rows[6])).toEqual(['Week of Sep 28 (to Sep 30)', '0']);
  });
});
