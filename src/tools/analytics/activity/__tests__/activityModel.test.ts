import {describe, expect, it} from 'vitest';
import {
  NO_FILTERS,
  activityKpis,
  activityWindow,
  carriesLabel,
  chartStacks,
  countOf,
  dailyStacks,
  filterVotes,
  hasActiveFilters,
  logPage,
  scoreBandOf,
  topPairs,
  topVoters,
  votesInBucket,
  votesInRange,
  weeklyStacks,
  type ScoreBand,
} from '../activityModel';
import type {VoteLogRow} from '../../voteLogTypes';

function row(overrides: Partial<VoteLogRow> & Pick<VoteLogRow, 'ts' | 'voter'>): VoteLogRow {
  return {
    a: '1',
    b: '2',
    aName: 'Elsa',
    bName: 'Anna',
    score: 5,
    accuracy: null,
    isReal: null,
    wouldPlay: null,
    difficulty: null,
    whoCarries: null,
    ...overrides,
  };
}

const MAUI = {a: '3', b: '4', aName: 'Maui', bName: 'Moana'};
const SCAR = {a: '5', b: '6', aName: 'Scar', bName: 'Simba'};

describe('scoreBandOf', () => {
  it.each<[number | null, ScoreBand]>([
    [10, 'high'],
    [7, 'high'],
    [6, 'mid'],
    [5, 'mid'],
    [4, 'low'],
    [1, 'low'],
    [null, 'unscored'],
  ])('puts a score of %s in the %s band', (score, band) => {
    expect(scoreBandOf(score)).toBe(band);
  });
});

describe('NO_FILTERS', () => {
  it('opens on the last 30 days with nothing else set (R-9)', () => {
    expect(NO_FILTERS).toEqual({q: '', voter: null, band: 'all', day: null, range: '30d'});
  });
});

describe('filterVotes', () => {
  const votes = [
    row({ts: '2026-09-30T10:00:00Z', voter: 1, aName: 'Elsa - Spirit of Winter', score: 8}),
    row({...MAUI, ts: '2026-09-30T11:00:00Z', voter: 11, score: 3}),
    row({...SCAR, ts: '2026-09-29T12:00:00Z', voter: 1, score: null}),
    row({ts: '2026-09-28T13:00:00Z', voter: 2, score: 6}),
  ];

  it('passes every vote, in order, with no filter set', () => {
    expect(filterVotes(votes, NO_FILTERS)).toEqual(votes);
  });

  it('matches the search against either card name, ignoring case and outer spaces', () => {
    expect(filterVotes(votes, {...NO_FILTERS, q: '  SPIRIT '})).toEqual([votes[0]]);
    expect(filterVotes(votes, {...NO_FILTERS, q: 'moana'})).toEqual([votes[1]]);
    expect(filterVotes(votes, {...NO_FILTERS, q: 'anna'})).toEqual([votes[0], votes[3]]);
  });

  it('matches the voter token exactly', () => {
    expect(filterVotes(votes, {...NO_FILTERS, voter: 1})).toEqual([votes[0], votes[2]]);
  });

  it('keeps unscored votes out of the score bands, in a band of their own', () => {
    expect(filterVotes(votes, {...NO_FILTERS, band: 'high'})).toEqual([votes[0]]);
    expect(filterVotes(votes, {...NO_FILTERS, band: 'mid'})).toEqual([votes[3]]);
    expect(filterVotes(votes, {...NO_FILTERS, band: 'low'})).toEqual([votes[1]]);
    expect(filterVotes(votes, {...NO_FILTERS, band: 'unscored'})).toEqual([votes[2]]);
  });

  it('matches the day against the start of the timestamp', () => {
    expect(filterVotes(votes, {...NO_FILTERS, day: '2026-09-30'})).toEqual([votes[0], votes[1]]);
  });

  it('applies every filter at once', () => {
    expect(filterVotes(votes, {...NO_FILTERS, q: 'simba', voter: 1, band: 'unscored', day: '2026-09-29'})).toEqual([
      votes[2],
    ]);
    expect(filterVotes(votes, {...NO_FILTERS, q: 'simba', voter: 2})).toEqual([]);
  });

  it('leaves the range to votesInRange, which knows the whole log', () => {
    expect(filterVotes(votes, {...NO_FILTERS, range: '7d'})).toEqual(votes);
  });

  it('returns [] for an empty log', () => {
    expect(filterVotes([], {...NO_FILTERS, q: 'elsa'})).toEqual([]);
  });
});

describe('hasActiveFilters', () => {
  it('ignores a blank search and counts any other filter', () => {
    expect(hasActiveFilters(NO_FILTERS)).toBe(false);
    expect(hasActiveFilters({...NO_FILTERS, q: '   '})).toBe(false);
    expect(hasActiveFilters({...NO_FILTERS, q: 'elsa'})).toBe(true);
    expect(hasActiveFilters({...NO_FILTERS, voter: 3})).toBe(true);
    expect(hasActiveFilters({...NO_FILTERS, band: 'unscored'})).toBe(true);
    expect(hasActiveFilters({...NO_FILTERS, day: '2026-09-30'})).toBe(true);
  });

  it('leaves out the range, which Clear filters keeps', () => {
    expect(hasActiveFilters({...NO_FILTERS, range: 'all'})).toBe(false);
    expect(hasActiveFilters({...NO_FILTERS, range: '7d'})).toBe(false);
  });
});

describe('votesInRange', () => {
  it("keeps the votes from the first day to the last, both included, in input order, real timestamps too", () => {
    const votes = [
      row({ts: '2026-09-30T23:59:59.999999+00:00', voter: 1}),
      row({ts: '2026-09-24T00:00:00+00:00', voter: 2}),
      row({ts: '2026-09-23T23:59:59Z', voter: 3}),
      row({ts: '2026-10-01T00:00:00Z', voter: 4}),
      row({ts: '2026-09-27T12:00:00Z', voter: 5}),
    ];
    expect(votesInRange(votes, '2026-09-24', '2026-09-30').map((v) => v.voter)).toEqual([1, 2, 5]);
  });

  it('keeps a one-day window to that day', () => {
    const votes = [row({ts: '2026-09-29T08:00:00Z', voter: 1}), row({ts: '2026-09-30T08:00:00Z', voter: 2})];
    expect(votesInRange(votes, '2026-09-30', '2026-09-30').map((v) => v.voter)).toEqual([2]);
  });

  it('returns [] for an empty log or a window that ends before it starts', () => {
    expect(votesInRange([], '2026-09-01', '2026-09-30')).toEqual([]);
    expect(votesInRange([row({ts: '2026-09-15T08:00:00Z', voter: 1})], '2026-09-30', '2026-09-01')).toEqual([]);
  });
});

describe('activityWindow', () => {
  // Out of order on purpose: the newest and the oldest vote are found, not assumed.
  const votes = [
    row({ts: '2026-09-01T08:00:00Z', voter: 1}),
    row({ts: '2026-09-30T14:20:00.123456+00:00', voter: 2}),
    row({ts: '2026-06-10T08:00:00Z', voter: 3}),
  ];

  it("ends on the newest vote's day and counts back per the range", () => {
    expect(activityWindow(votes, '7d')).toEqual({startDay: '2026-09-24', endDay: '2026-09-30'});
    expect(activityWindow(votes, '30d')).toEqual({startDay: '2026-09-01', endDay: '2026-09-30'});
    expect(activityWindow(votes, '90d')).toEqual({startDay: '2026-07-03', endDay: '2026-09-30'});
    expect(activityWindow(votes, 'all')).toEqual({startDay: '2026-06-10', endDay: '2026-09-30'});
  });

  it('never starts before the oldest vote', () => {
    const young = [row({ts: '2026-09-30T08:00:00Z', voter: 1}), row({ts: '2026-09-28T08:00:00Z', voter: 2})];
    expect(activityWindow(young, '30d')).toEqual({startDay: '2026-09-28', endDay: '2026-09-30'});
  });

  it('is null for an empty log', () => {
    expect(activityWindow([], '30d')).toBeNull();
  });
});

describe('dailyStacks', () => {
  it('ends at the newest vote and keeps the days without votes', () => {
    const stacks = dailyStacks(
      [row({ts: '2026-09-28T10:00:00Z', voter: 1}), row({ts: '2026-09-30T23:59:00Z', voter: 2})],
      4,
    );
    expect(stacks.map((s) => s.day)).toEqual(['2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30']);
    expect(stacks.map((s) => s.total)).toEqual([0, 1, 0, 1]);
  });

  it('finds the newest vote whatever order the log is in', () => {
    const stacks = dailyStacks(
      [
        row({ts: '2026-09-29T08:00:00Z', voter: 1}),
        row({ts: '2026-09-30T08:00:00Z', voter: 1}),
        row({ts: '2026-09-28T08:00:00Z', voter: 1}),
      ],
      1,
    );
    expect(stacks.map((s) => s.day)).toEqual(['2026-09-30']);
  });

  it('crosses month, year and leap-day boundaries', () => {
    const days = (ts: string, n: number) => dailyStacks([row({ts, voter: 1})], n).map((s) => s.day);
    expect(days('2026-10-02T09:00:00Z', 4)).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
    expect(days('2027-01-01T09:00:00Z', 2)).toEqual(['2026-12-31', '2027-01-01']);
    expect(days('2028-03-01T09:00:00Z', 2)).toEqual(['2028-02-29', '2028-03-01']);
  });

  it('splits a day by band, unscored votes included, and counts distinct voters', () => {
    const [stack] = dailyStacks(
      [
        row({ts: '2026-09-30T08:00:00Z', voter: 1, score: 9}),
        row({ts: '2026-09-30T09:00:00Z', voter: 1, score: 7}),
        row({ts: '2026-09-30T10:00:00Z', voter: 2, score: 5}),
        row({ts: '2026-09-30T11:00:00Z', voter: 3, score: 2}),
        row({ts: '2026-09-30T12:00:00Z', voter: 3, score: null}),
      ],
      1,
    );
    expect(stack).toEqual({day: '2026-09-30', high: 2, mid: 1, low: 1, unscored: 1, total: 5, voters: 3});
  });

  it("buckets the log's real timestamps (Supabase's created_at: microseconds, +00:00) by UTC day", () => {
    const stacks = dailyStacks(
      [
        row({ts: '2026-09-29T23:59:59.999999+00:00', voter: 1}),
        row({ts: '2026-09-30T14:20:00.123456+00:00', voter: 2}),
        row({ts: '2026-09-30T00:00:00+00:00', voter: 3}),
      ],
      2,
    );
    // The window ends on Sep 30 only if Date.parse reads this form: the oldest vote comes first.
    expect(stacks.map((s) => [s.day, s.total])).toEqual([
      ['2026-09-29', 1],
      ['2026-09-30', 2],
    ]);
  });

  it('leaves out votes older than the window', () => {
    const stacks = dailyStacks(
      [row({ts: '2026-09-30T08:00:00Z', voter: 1}), row({ts: '2026-08-31T08:00:00Z', voter: 2})],
      30,
    );
    expect(stacks).toHaveLength(30);
    expect(stacks[0].day).toBe('2026-09-01');
    expect(stacks.reduce((sum, s) => sum + s.total, 0)).toBe(1);
  });

  it("can end on a given day, so filtered votes keep the whole log's window", () => {
    const stacks = dailyStacks([row({ts: '2026-09-20T08:00:00Z', voter: 1})], 3, '2026-09-30');
    expect(stacks.map((s) => s.day)).toEqual(['2026-09-28', '2026-09-29', '2026-09-30']);
    expect(stacks.every((s) => s.total === 0 && s.voters === 0)).toBe(true);
  });

  it('returns [] for an empty log or an empty window', () => {
    expect(dailyStacks([], 30)).toEqual([]);
    expect(dailyStacks([row({ts: '2026-09-30T08:00:00Z', voter: 1})], 0)).toEqual([]);
  });
});

describe('weeklyStacks', () => {
  it("puts each week on its UTC Monday, quiet weeks included", () => {
    const stacks = weeklyStacks(
      // Wed Sep 2 falls in the week of Mon Aug 31, Wed Sep 16 in the week of Mon Sep 14.
      [row({ts: '2026-09-16T08:00:00Z', voter: 1}), row({ts: '2026-09-02T08:00:00Z', voter: 2})],
      '2026-09-01',
      '2026-09-30',
    );
    expect(stacks.map((s) => [s.day, s.total])).toEqual([
      ['2026-08-31', 1],
      ['2026-09-07', 0],
      ['2026-09-14', 1],
      ['2026-09-21', 0],
      ['2026-09-28', 0],
    ]);
  });

  it('counts only the votes inside the window, so the first and last weeks can be part weeks', () => {
    const stacks = weeklyStacks(
      [
        row({ts: '2026-09-01T08:00:00Z', voter: 1}), // the first week's Tuesday, a day before the window
        row({ts: '2026-09-02T08:00:00Z', voter: 2}),
        row({ts: '2026-09-29T08:00:00Z', voter: 3}),
        row({ts: '2026-09-30T08:00:00Z', voter: 4}), // the last week's Wednesday, a day after the window
      ],
      '2026-09-02',
      '2026-09-29',
    );
    expect(stacks.map((s) => s.day)).toEqual(['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28']);
    expect(stacks.map((s) => s.total)).toEqual([1, 0, 0, 0, 1]);
  });

  it('splits a week by band and counts its distinct voters across its days', () => {
    const stacks = weeklyStacks(
      [
        row({ts: '2026-09-28T08:00:00Z', voter: 1, score: 9}),
        row({ts: '2026-09-29T08:00:00+00:00', voter: 1, score: null}),
        row({ts: '2026-09-30T14:20:00.123456+00:00', voter: 2, score: 5}),
        row({ts: '2026-10-04T23:59:59Z', voter: 3, score: 2}),
      ],
      '2026-09-28',
      '2026-10-04',
    );
    expect(stacks).toEqual([{day: '2026-09-28', high: 1, mid: 1, low: 1, unscored: 1, total: 4, voters: 3}]);
  });

  it('crosses a year boundary', () => {
    const stacks = weeklyStacks([row({ts: '2027-01-02T08:00:00Z', voter: 1})], '2026-12-30', '2027-01-05');
    expect(stacks.map((s) => [s.day, s.total])).toEqual([
      ['2026-12-28', 1],
      ['2027-01-04', 0],
    ]);
  });

  it('keeps every week of an empty log, and nothing when the window ends before it starts', () => {
    expect(weeklyStacks([], '2026-09-28', '2026-10-04')).toEqual([
      {day: '2026-09-28', high: 0, mid: 0, low: 0, unscored: 0, total: 0, voters: 0},
    ]);
    expect(weeklyStacks([row({ts: '2026-09-30T08:00:00Z', voter: 1})], '2026-10-04', '2026-09-28')).toEqual([]);
  });
});

describe('chartStacks', () => {
  const votes = [row({ts: '2026-09-30T08:00:00Z', voter: 1}), row({ts: '2026-06-10T08:00:00Z', voter: 2})];

  it('charts a window of up to 90 days per day, every day present', () => {
    const {bucket, stacks} = chartStacks(votes, '2026-07-03', '2026-09-30');
    expect(bucket).toBe('day');
    expect(stacks).toHaveLength(90);
    expect([stacks[0].day, stacks.at(-1)?.day]).toEqual(['2026-07-03', '2026-09-30']);
    expect(stacks.reduce((sum, s) => sum + s.total, 0)).toBe(1);
  });

  it('charts a longer window per week, from the Monday of its first day', () => {
    const {bucket, stacks} = chartStacks(votes, '2026-06-10', '2026-09-30');
    expect(bucket).toBe('week');
    expect(stacks).toHaveLength(17);
    expect([stacks[0].day, stacks.at(-1)?.day]).toEqual(['2026-06-08', '2026-09-28']);
    expect([stacks[0].total, stacks.at(-1)?.total]).toEqual([1, 1]);
  });
});

describe('votesInBucket', () => {
  const votes = [
    row({ts: '2026-09-27T23:59:59Z', voter: 1}), // Sunday, the week before
    row({ts: '2026-09-28T00:00:00+00:00', voter: 2}), // Monday
    row({ts: '2026-09-30T14:20:00.123456+00:00', voter: 3}),
    row({ts: '2026-10-04T23:59:59Z', voter: 4}), // Sunday, the week's last day
    row({ts: '2026-10-05T00:00:00Z', voter: 5}), // Monday, the week after
  ];

  it("keeps a day bar's votes to its UTC day", () => {
    expect(votesInBucket(votes, '2026-09-30', 'day').map((v) => v.voter)).toEqual([3]);
  });

  it("keeps a week bar's votes to the seven days from its Monday", () => {
    expect(votesInBucket(votes, '2026-09-28', 'week').map((v) => v.voter)).toEqual([2, 3, 4]);
  });
});

describe('activityKpis', () => {
  it('counts votes and voters, and averages the scored votes only', () => {
    const kpis = activityKpis([
      row({ts: '2026-09-30T08:00:00Z', voter: 1, score: 8}),
      row({ts: '2026-09-30T09:00:00Z', voter: 2, score: 5}),
      row({ts: '2026-09-29T09:00:00Z', voter: 1, score: null}),
    ]);
    expect(kpis).toEqual({votes: 3, activeVoters: 2, avgScore: 6.5, busiestDay: {day: '2026-09-30', count: 2}});
  });

  it('has no average when no vote has a score', () => {
    expect(activityKpis([row({ts: '2026-09-30T08:00:00Z', voter: 1, score: null})]).avgScore).toBeNull();
  });

  it('breaks a busiest-day tie toward the later day, whatever the order', () => {
    const votes = [
      row({ts: '2026-09-28T08:00:00Z', voter: 1}),
      row({ts: '2026-09-30T08:00:00Z', voter: 1}),
      row({ts: '2026-09-28T09:00:00Z', voter: 2}),
      row({ts: '2026-09-30T09:00:00Z', voter: 2}),
    ];
    expect(activityKpis(votes).busiestDay).toEqual({day: '2026-09-30', count: 2});
    expect(activityKpis([...votes].reverse()).busiestDay).toEqual({day: '2026-09-30', count: 2});
  });

  it('is empty for an empty log', () => {
    expect(activityKpis([])).toEqual({votes: 0, activeVoters: 0, avgScore: null, busiestDay: null});
  });
});

describe('topVoters', () => {
  const votes = [
    row({ts: '2026-09-30T08:00:00Z', voter: 7}),
    row({ts: '2026-09-30T09:00:00Z', voter: 3}),
    row({ts: '2026-09-30T10:00:00Z', voter: 7}),
    row({ts: '2026-09-30T11:00:00Z', voter: 5}),
    row({ts: '2026-09-30T12:00:00Z', voter: 3}),
    row({ts: '2026-09-30T13:00:00Z', voter: 9}),
  ];

  it('ranks voters by votes, breaking a tie toward the lower token', () => {
    expect(topVoters(votes, 10)).toEqual([
      {voter: 3, count: 2},
      {voter: 7, count: 2},
      {voter: 5, count: 1},
      {voter: 9, count: 1},
    ]);
  });

  it('keeps the first n', () => {
    expect(topVoters(votes, 2).map((t) => t.voter)).toEqual([3, 7]);
  });

  it('returns [] for an empty log', () => {
    expect(topVoters([], 6)).toEqual([]);
  });
});

describe('topPairs', () => {
  it('counts each pair and averages its scored votes only', () => {
    const pairs = topPairs(
      [
        row({ts: '2026-09-30T08:00:00Z', voter: 1, score: 8}),
        row({ts: '2026-09-30T09:00:00Z', voter: 2, score: 5}),
        row({ts: '2026-09-30T10:00:00Z', voter: 3, score: null}),
        row({...MAUI, ts: '2026-09-29T10:00:00Z', voter: 3, score: null}),
      ],
      5,
    );
    expect(pairs).toEqual([
      {a: '1', b: '2', aName: 'Elsa', bName: 'Anna', count: 3, avgScore: 6.5},
      {a: '3', b: '4', aName: 'Maui', bName: 'Moana', count: 1, avgScore: null},
    ]);
  });

  it('counts a pair once whichever card comes first', () => {
    const pairs = topPairs(
      [
        row({ts: '2026-09-30T08:00:00Z', voter: 1}),
        row({ts: '2026-09-29T08:00:00Z', voter: 2, a: '2', b: '1', aName: 'Anna', bName: 'Elsa'}),
      ],
      5,
    );
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({a: '1', b: '2', aName: 'Elsa', count: 2});
  });

  it('breaks a tie toward the pair voted most recently, then by card ids', () => {
    const byRecency = topPairs(
      [
        row({...SCAR, ts: '2026-09-29T08:00:00Z', voter: 1}),
        row({ts: '2026-09-28T08:00:00Z', voter: 1}),
        row({...MAUI, ts: '2026-09-30T08:00:00Z', voter: 1}),
      ],
      5,
    );
    expect(byRecency.map((p) => p.aName)).toEqual(['Maui', 'Scar', 'Elsa']);

    const sameMoment = topPairs(
      [row({...SCAR, ts: '2026-09-30T08:00:00Z', voter: 1}), row({...MAUI, ts: '2026-09-30T08:00:00Z', voter: 2})],
      5,
    );
    expect(sameMoment.map((p) => p.aName)).toEqual(['Maui', 'Scar']);
  });

  it('ranks by votes and keeps the first n', () => {
    const pairs = topPairs(
      [
        row({...MAUI, ts: '2026-09-30T08:00:00Z', voter: 1}),
        row({ts: '2026-09-29T08:00:00Z', voter: 1}),
        row({ts: '2026-09-28T08:00:00Z', voter: 2}),
      ],
      1,
    );
    expect(pairs.map((p) => p.aName)).toEqual(['Elsa']);
  });

  it('returns [] for an empty log', () => {
    expect(topPairs([], 5)).toEqual([]);
  });
});

describe('carriesLabel', () => {
  const vote = row({ts: '2026-09-30T08:00:00Z', voter: 1});

  it.each<[VoteLogRow['whoCarries'], string]>([
    ['a', 'Elsa'],
    ['b', 'Anna'],
    ['both', 'Both'],
    ['neither', 'Neither'],
    [null, '—'],
  ])('reads %s as %s', (whoCarries, label) => {
    expect(carriesLabel({...vote, whoCarries})).toBe(label);
  });
});

describe('logPage', () => {
  const votes = [
    row({ts: '2026-09-29T08:00:00Z', voter: 1, aName: 'Oldest'}),
    row({ts: '2026-09-30T12:00:00Z', voter: 2, aName: 'Newest'}),
    row({ts: '2026-09-30T09:00:00Z', voter: 2, aName: 'Middle'}),
  ];

  it('groups the page by day, newest first', () => {
    const {days, hidden} = logPage(votes, 25);
    expect(days.map((d) => d.day)).toEqual(['2026-09-30', '2026-09-29']);
    expect(days[0].rows.map((v) => v.aName)).toEqual(['Newest', 'Middle']);
    expect(hidden).toBe(0);
  });

  it("keeps a day's full counts when the page cuts it short", () => {
    const {days, hidden} = logPage(votes, 1);
    expect(days).toEqual([{day: '2026-09-30', count: 2, voters: 1, rows: [votes[1]]}]);
    expect(hidden).toBe(2);
  });

  it("orders the log's real timestamps (Supabase's created_at: microseconds, +00:00) newest first", () => {
    // Out of order on purpose: Middle comes before Newest unless Date.parse reads this form.
    const {days} = logPage(
      [
        row({ts: '2026-09-30T09:05:00+00:00', voter: 1, aName: 'Middle'}),
        row({ts: '2026-09-29T23:59:59.999999+00:00', voter: 2, aName: 'Oldest'}),
        row({ts: '2026-09-30T14:20:00.123456+00:00', voter: 3, aName: 'Newest'}),
      ],
      25,
    );
    expect(days.map((d) => d.day)).toEqual(['2026-09-30', '2026-09-29']);
    expect(days[0].rows.map((v) => v.aName)).toEqual(['Newest', 'Middle']);
  });

  it('is empty for an empty log', () => {
    expect(logPage([], 25)).toEqual({days: [], hidden: 0});
  });
});

describe('countOf', () => {
  it('pluralises and groups thousands', () => {
    expect(countOf(1, 'vote')).toBe('1 vote');
    expect(countOf(0, 'voter')).toBe('0 voters');
    expect(countOf(2054, 'vote')).toBe('2,054 votes');
  });
});
