import {describe, expect, it} from 'vitest';
import {ADMIN_COLORS} from '../../../../theme/adminTheme';
import {
  BAND_SERIES,
  barData,
  bucketTitle,
  chartSubtitle,
  chartTable,
  chartTitle,
  labelEvery,
  partialWeeks,
  tooltipFor,
} from '../activityChart';
import type {DayStack} from '../activityModel';

function stack(day: string, over: Partial<DayStack> = {}): DayStack {
  return {day, high: 0, mid: 0, low: 0, unscored: 0, total: 0, voters: 0, ...over};
}

const BUSY = stack('2026-09-30', {high: 5, mid: 4, low: 2, unscored: 1, total: 12, voters: 4});
const QUIET = stack('2026-09-29');

describe('BAND_SERIES', () => {
  it('is one series per band, in filter order, in the theme colours, with No score hatched', () => {
    expect(BAND_SERIES).toEqual([
      {id: 'high', label: '7+', color: ADMIN_COLORS.under},
      {id: 'mid', label: '5–6', color: ADMIN_COLORS.barNeutral},
      {id: 'low', label: '≤4', color: ADMIN_COLORS.over},
      {id: 'unscored', label: 'No score', color: ADMIN_COLORS.muted, pattern: 'hatch'},
    ]);
  });
});

describe('chartTitle and bucketTitle', () => {
  it("name the chart and each bar by day, or by week from the week's Monday", () => {
    expect(chartTitle('day')).toBe('Votes per day');
    expect(chartTitle('week')).toBe('Votes per week');
    expect(bucketTitle('2026-09-30', 'day')).toBe('Wed Sep 30');
    expect(bucketTitle('2026-09-28', 'week')).toBe('Week of Sep 28');
  });

  it('says when the range clips a week, and leaves a whole week and a day plain', () => {
    expect(bucketTitle('2026-06-08', 'week', '2026-06-10', '2026-09-30')).toBe('Week of Jun 8 (from Jun 10)');
    expect(bucketTitle('2026-09-28', 'week', '2026-06-10', '2026-09-30')).toBe('Week of Sep 28 (to Sep 30)');
    expect(bucketTitle('2026-09-28', 'week', '2026-09-29', '2026-09-30')).toBe('Week of Sep 28 (Sep 29 to Sep 30)');
    expect(bucketTitle('2026-09-21', 'week', '2026-06-10', '2026-09-30')).toBe('Week of Sep 21');
    // Sun Oct 4 ends the week of Mon Sep 28, so a range ending then leaves it whole.
    expect(bucketTitle('2026-09-28', 'week', '2026-06-10', '2026-10-04')).toBe('Week of Sep 28');
    expect(bucketTitle('2026-09-30', 'day', '2026-09-01', '2026-09-30')).toBe('Wed Sep 30');
  });

  it('names a one-day range once, wherever in the week it falls, and keeps a two-day one a range', () => {
    expect(bucketTitle('2026-09-28', 'week', '2026-09-30', '2026-09-30')).toBe('Week of Sep 28 (Sep 30 only)');
    expect(bucketTitle('2026-09-28', 'week', '2026-09-28', '2026-09-28')).toBe('Week of Sep 28 (Sep 28 only)');
    expect(bucketTitle('2026-09-28', 'week', '2026-10-04', '2026-10-04')).toBe('Week of Sep 28 (Oct 4 only)');
    expect(bucketTitle('2026-09-28', 'week', '2026-09-29', '2026-09-30')).toBe('Week of Sep 28 (Sep 29 to Sep 30)');
  });
});

describe('chartSubtitle', () => {
  it("gives the range's days and how to pick a bar", () => {
    expect(chartSubtitle('day', '2026-09-01', '2026-09-30')).toBe(
      'Sep 1 – Sep 30. Pick a day to filter the log; pick it again to clear.',
    );
  });

  it('says which end weeks the range clips', () => {
    const pick = '. Pick a week to filter the log; pick it again to clear.';
    expect(chartSubtitle('week', '2026-06-10', '2026-09-30')).toBe(
      `Jun 10 – Sep 30, in weeks from Monday, first and last weeks partial${pick}`,
    );
    expect(chartSubtitle('week', '2026-06-08', '2026-09-30')).toBe(
      `Jun 8 – Sep 30, in weeks from Monday, last week partial${pick}`,
    );
    expect(chartSubtitle('week', '2026-06-10', '2026-10-04')).toBe(
      `Jun 10 – Oct 4, in weeks from Monday, first week partial${pick}`,
    );
    expect(chartSubtitle('week', '2026-06-08', '2026-10-04')).toBe(`Jun 8 – Oct 4, in weeks from Monday${pick}`);
  });

  it('calls a range inside one week that week, partial or whole, never its first and last', () => {
    const pick = '. Pick a week to filter the log; pick it again to clear.';
    expect(chartSubtitle('week', '2026-09-29', '2026-09-30')).toBe(
      `Sep 29 – Sep 30, in weeks from Monday, week partial${pick}`,
    );
    expect(chartSubtitle('week', '2026-09-30', '2026-09-30')).toBe(
      `Sep 30 – Sep 30, in weeks from Monday, week partial${pick}`,
    );
    // Monday to Wednesday clips only the end, Wednesday to Sunday only the start: still the one week.
    expect(partialWeeks('2026-09-28', '2026-09-30')).toBe(', week partial');
    expect(partialWeeks('2026-09-30', '2026-10-04')).toBe(', week partial');
    expect(partialWeeks('2026-09-28', '2026-10-04')).toBe('');
  });
});

describe('barData', () => {
  it('keys each bar by its day, labels it with the month, and splits it by band', () => {
    expect(barData([QUIET, BUSY])).toEqual([
      {key: '2026-09-29', label: 'Sep 29', values: {high: 0, mid: 0, low: 0, unscored: 0}},
      {key: '2026-09-30', label: 'Sep 30', values: {high: 5, mid: 4, low: 2, unscored: 1}},
    ]);
  });
});

describe('tooltipFor', () => {
  it("leads with each value: the bar's votes, every band with its line key, then its voters", () => {
    const [, busy] = barData([QUIET, BUSY]);
    // The band rows read as words, because the kit also reads the tooltip out as the bar's name.
    expect(tooltipFor([QUIET, BUSY], 'day', '2026-09-29', '2026-09-30')(busy)).toEqual({
      title: 'Wed Sep 30',
      rows: [
        {label: 'votes', value: '12'},
        {label: 'scored 7+', value: '5', color: ADMIN_COLORS.under},
        {label: 'scored 5–6', value: '4', color: ADMIN_COLORS.barNeutral},
        {label: 'scored ≤4', value: '2', color: ADMIN_COLORS.over},
        {label: 'with no score', value: '1', color: ADMIN_COLORS.muted},
        {label: 'voters', value: '4'},
      ],
    });
  });

  it('names a week from its Monday, noting a clipped end, in the singular for one vote and one voter', () => {
    const week = stack('2026-09-28', {low: 1, total: 1, voters: 1});
    const content = tooltipFor([week], 'week', '2026-06-10', '2026-09-30')(barData([week])[0]);
    expect(content.title).toBe('Week of Sep 28 (to Sep 30)');
    expect(content.rows.at(0)).toEqual({label: 'vote', value: '1'});
    expect(content.rows.at(-1)).toEqual({label: 'voter', value: '1'});
  });
});

describe('chartTable', () => {
  it('lists every bar, oldest first, with all the numbers the chart and its tooltips carry', () => {
    expect(chartTable([QUIET, BUSY], 'day', '2026-09-29', '2026-09-30')).toEqual({
      caption: 'Votes per day, Sep 29 – Sep 30',
      columns: ['Day', 'Votes', '7+', '5–6', '≤4', 'No score', 'Voters'],
      rows: [
        ['Tue Sep 29', '0', '0', '0', '0', '0', '0'],
        ['Wed Sep 30', '12', '5', '4', '2', '1', '4'],
      ],
    });
  });

  it("names weeks by their Monday, the part weeks at each end as such, and the caption by the range's own days", () => {
    const table = chartTable([stack('2026-06-08'), stack('2026-09-28')], 'week', '2026-06-10', '2026-09-30');
    expect(table.caption).toBe('Votes per week, Jun 10 – Sep 30');
    expect(table.columns[0]).toBe('Week');
    expect(table.rows.map((r) => r[0])).toEqual(['Week of Jun 8 (from Jun 10)', 'Week of Sep 28 (to Sep 30)']);
  });
});

describe('labelEvery', () => {
  it.each([
    [0, 1],
    [1, 1],
    [7, 1],
    [8, 2],
    [14, 2],
    [15, 4],
    [17, 4],
    [28, 4],
    [30, 7],
    [49, 7],
    [50, 14],
    [90, 14],
    [98, 14],
    [400, 58],
  ])('labels %i bars every %i, so at most seven labels print', (bars, every) => {
    expect(labelEvery(bars)).toBe(every);
  });
});
