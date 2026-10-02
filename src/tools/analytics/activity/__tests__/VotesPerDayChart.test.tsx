import type {ComponentProps} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {VotesPerDayChart} from '../VotesPerDayChart';
import type {DayStack} from '../activityModel';

function stack(day: string, over: Partial<DayStack> = {}): DayStack {
  return {day, high: 0, mid: 0, low: 0, unscored: 0, total: 0, voters: 0, ...over};
}

/** Sep 1 to Sep 30 2026, quiet but for Sep 30. */
const SEPTEMBER = [
  ...Array.from({length: 29}, (_, i) => stack(`2026-09-${String(i + 1).padStart(2, '0')}`)),
  stack('2026-09-30', {high: 5, mid: 4, low: 2, unscored: 1, total: 12, voters: 4}),
];

/** The 17 weeks from Mon Jun 8 to Mon Sep 28 2026. */
const SUMMER_WEEKS = Array.from({length: 17}, (_, i) =>
  stack(new Date(Date.UTC(2026, 5, 8 + 7 * i)).toISOString().slice(0, 10)),
);

/** A bar, found by the start of its accessible name: its tooltip's title. */
const bar = (title: string) => screen.getByRole('button', {name: new RegExp(`^${title}\\b`)});

function renderChart(over: Partial<ComponentProps<typeof VotesPerDayChart>> = {}) {
  const props: ComponentProps<typeof VotesPerDayChart> = {
    stacks: SEPTEMBER,
    bucket: 'day',
    startDay: '2026-09-01',
    endDay: '2026-09-30',
    selectedKey: null,
    onSelect: vi.fn(),
    ...over,
  };
  render(<VotesPerDayChart {...props} />);
  return props;
}

describe('VotesPerDayChart', () => {
  it("charts a bar per day under the range's own days, each named by its tooltip", () => {
    renderChart();

    expect(screen.getByRole('heading', {name: 'Votes per day'})).toBeInTheDocument();
    expect(screen.getByText('Sep 1 – Sep 30. Pick a day to filter the log; pick it again to clear.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', {name: /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) Sep \d+\b/})).toHaveLength(30);
    expect(bar('Wed Sep 30')).toHaveAccessibleName(/\b12 votes\b.*\b4 voters\b/);
    expect(bar('Tue Sep 29')).toHaveAccessibleName(/\b0 votes\b/);
  });

  it('marks the picked day and hands each pick back', async () => {
    const props = renderChart({selectedKey: '2026-09-12'});

    expect(bar('Sat Sep 12')).toHaveAttribute('aria-pressed', 'true');
    expect(bar('Sun Sep 13')).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(bar('Sun Sep 13'));
    expect(props.onSelect).toHaveBeenCalledWith('2026-09-13');
  });

  it('shows the same numbers as a table', async () => {
    renderChart();
    await userEvent.click(screen.getByRole('button', {name: 'Table'}));

    const table = screen.getByRole('table', {name: 'Votes per day, Sep 1 – Sep 30'});
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Day',
      'Votes',
      '7+',
      '5–6',
      '≤4',
      'No score',
      'Voters',
    ]);
    const cells = [...(within(table).getByText('Wed Sep 30').closest('tr')?.cells ?? [])];
    expect(cells.map((cell) => cell.textContent)).toEqual(['Wed Sep 30', '12', '5', '4', '2', '1', '4']);
  });

  it('charts weeks past 90 days, each bar named for its Monday', () => {
    renderChart({stacks: SUMMER_WEEKS, bucket: 'week', startDay: '2026-06-10', endDay: '2026-09-30'});

    expect(screen.getByRole('heading', {name: 'Votes per week'})).toBeInTheDocument();
    expect(
      screen.getByText(
        'Jun 10 – Sep 30, in weeks from Monday, first and last weeks partial. Pick a week to filter the log; pick it again to clear.',
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', {name: /^Week of /})).toHaveLength(17);
    // The range starts on a Wednesday and ends on one, so both end weeks say they are part weeks.
    expect(bar('Week of Jun 8')).toHaveAccessibleName(/^Week of Jun 8 \(from Jun 10\)/);
    expect(bar('Week of Sep 28')).toHaveAccessibleName(/^Week of Sep 28 \(to Sep 30\)/);
    expect(bar('Week of Sep 21')).not.toHaveAccessibleName(/\(/);
  });
});
