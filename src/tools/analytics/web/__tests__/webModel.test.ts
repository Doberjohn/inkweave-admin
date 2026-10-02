import {describe, expect, it} from 'vitest';
import type {BreakdownRow, TrendPoint, VercelEvent} from '../../vercelAnalyticsTypes';
import {NOT_SET_LABEL, breakdownShares, fillTrendDays, sortEventsByTotal, trendSummary} from '../webModel';

function event(name: string, total: number): VercelEvent {
  return {name, label: name, total, visitors: 1, trend: [], breakdowns: []};
}

/** One point per day from 2026-09-01, with the given counts. */
function days(...counts: number[]): TrendPoint[] {
  return counts.map((count, i) => ({date: `2026-09-${String(i + 1).padStart(2, '0')}`, count}));
}

function row(value: string, count: number): BreakdownRow {
  return {value, count, visitors: 1};
}

describe('sortEventsByTotal', () => {
  it('puts the busiest event first and keeps the artifact order on ties', () => {
    const sorted = sortEventsByTotal([event('a', 5), event('b', 9), event('c', 5), event('d', 12)]);
    expect(sorted.map((e) => e.name)).toEqual(['d', 'b', 'a', 'c']);
  });

  it('leaves the input array alone', () => {
    const events = [event('a', 1), event('b', 2)];
    sortEventsByTotal(events);
    expect(events.map((e) => e.name)).toEqual(['a', 'b']);
  });
});

describe('fillTrendDays', () => {
  // Vercel's by=day rows for an event with activity on Sep 1 and Sep 5 only.
  const gap: TrendPoint[] = [
    {date: '2026-09-01', count: 4},
    {date: '2026-09-05', count: 6},
  ];

  it('fills the days Vercel left out with zeros', () => {
    expect(fillTrendDays(gap, null)).toEqual(days(4, 0, 0, 0, 6));
  });

  it('spans the whole reporting window, oldest day first, across a month end', () => {
    const filled = fillTrendDays([gap[1], gap[0]], {since: '2026-08-30', until: '2026-09-06'});
    expect(filled.map((point) => point.count)).toEqual([0, 0, 4, 0, 0, 0, 6, 0]);
    expect(filled[0].date).toBe('2026-08-30');
    expect(filled[1].date).toBe('2026-08-31');
    expect(filled[7].date).toBe('2026-09-06');
  });

  it('widens the span for a day outside the window rather than dropping it', () => {
    expect(fillTrendDays(gap, {since: '2026-09-02', until: '2026-09-05'})).toEqual(days(4, 0, 0, 0, 6));
  });

  it('fills an empty trend with zeros across the window, and leaves it empty with no window', () => {
    expect(fillTrendDays([], {since: '2026-09-01', until: '2026-09-03'})).toEqual(days(0, 0, 0));
    expect(fillTrendDays([], null)).toEqual([]);
  });

  it('skips a point with no date instead of failing', () => {
    // buildEvent writes '' when a row has neither timestamp nor date.
    expect(fillTrendDays([{date: '', count: 2}, ...gap], null)).toEqual(days(4, 0, 0, 0, 6));
  });

  it('lets the average count the missing days', () => {
    const filled = fillTrendDays(gap, null);
    expect(trendSummary(gap).dailyAverage).toBe(5);
    expect(trendSummary(filled).dailyAverage).toBe(2);
  });
});

describe('trendSummary', () => {
  it('sums the days it is given and averages over all of them', () => {
    const summary = trendSummary(days(4, 10, 1));
    expect(summary.inWindow).toBe(15);
    expect(summary.dailyAverage).toBe(5);
    expect(summary.peak).toEqual({date: '2026-09-02', count: 10});
  });

  it('gives a tied peak to the later day, whatever order the trend is in', () => {
    const [first, second, third] = days(7, 3, 7);
    expect(trendSummary([third, first, second]).peak).toEqual({date: '2026-09-03', count: 7});
    expect(trendSummary([first, second, third]).peak).toEqual({date: '2026-09-03', count: 7});
  });

  it('has no peak and a zero average for an empty trend', () => {
    expect(trendSummary([])).toEqual({inWindow: 0, dailyAverage: 0, peak: null});
  });
});

describe('breakdownShares', () => {
  it('gives each row its whole-percent share of the total', () => {
    const shares = breakdownShares([row('quick', 720), row('score', 360), row('in_depth', 160)]);
    expect(shares.map((s) => s.pct)).toEqual([58, 29, 13]);
  });

  it('scales bars to the biggest row, not the first one', () => {
    // Score breakdowns arrive in value order, so the biggest row can sit anywhere.
    const shares = breakdownShares([row('3', 60), row('7', 300), row('9', 150)]);
    expect(shares.map((s) => s.fraction)).toEqual([0.2, 1, 0.5]);
  });

  it('moves "Others" to the bottom and still scales against it when it is the biggest', () => {
    const shares = breakdownShares([row('Others', 400), row('elsa', 200), row('shift', 100)]);
    expect(shares.map((s) => [s.row.value, s.fraction, s.others])).toEqual([
      ['elsa', 0.5, false],
      ['shift', 0.25, false],
      ['Others', 1, true],
    ]);
  });

  it('returns nothing for a breakdown with no rows in the window', () => {
    expect(breakdownShares([])).toEqual([]);
  });

  it('labels each row with its value, and a blank value "(not set)"', () => {
    // The real export has a blank row in Reveal card clicks' franchise and rarity breakdowns.
    const shares = breakdownShares([row('Frozen', 12), row('', 6), row('Moana', 4)]);
    expect(NOT_SET_LABEL).toBe('(not set)');
    expect(shares.map((s) => [s.label, s.notSet, s.row.value])).toEqual([
      ['Frozen', false, 'Frozen'],
      ['(not set)', true, ''],
      ['Moana', false, 'Moana'],
    ]);
    // It is a row like any other: its share counts, and it stays where the artifact put it.
    expect(shares.map((s) => s.pct)).toEqual([55, 27, 18]);
    expect(shares[1].others).toBe(false);
  });

  it('treats a value of spaces alone as blank', () => {
    expect(breakdownShares([row('  ', 3)])[0]).toMatchObject({label: NOT_SET_LABEL, notSet: true});
  });
});
