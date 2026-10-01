import {describe, expect, it} from 'vitest';
import {latestVotes, recentWeeks, rulesToReview, trackedEventsTotal, weeksThatFit} from '../overviewStats';
import type {RuleStat, WeeklyPoint} from '../../voteAnalyticsTypes';
import type {VoteLogRow} from '../../voteLogTypes';
import type {VercelAnalytics, VercelEvent} from '../../vercelAnalyticsTypes';

function rule(ruleId: string, scoreVotes: number, meanGap: number | null): RuleStat {
  return {
    ruleId,
    ruleName: ruleId,
    category: 'playstyle',
    scoreVotes,
    pairsVoted: 1,
    meanGap,
    accuracySentiment: null,
    pairsCovered: 0,
  };
}

function vote(ts: string, score: number | null = 5): VoteLogRow {
  return {
    a: '1',
    b: '2',
    aName: 'Card A',
    bName: 'Card B',
    score,
    accuracy: null,
    isReal: null,
    wouldPlay: null,
    difficulty: null,
    whoCarries: null,
    ts,
    voter: 1,
  };
}

function event(name: string, total: number): VercelEvent {
  return {name, label: name, total, visitors: 1, trend: [], breakdowns: []};
}

function vercel(overrides: Partial<VercelAnalytics> = {}): VercelAnalytics {
  return {
    generatedAt: '2026-09-30T00:00:00Z',
    hasVercelData: true,
    reportingWindow: null,
    events: [event('search', 5), event('vote_submitted', 9)],
    ...overrides,
  };
}

const ids = (rules: RuleStat[]) => rules.map((r) => r.ruleId);

describe('trackedEventsTotal', () => {
  it('sums every event total and counts the event types', () => {
    expect(trackedEventsTotal(vercel())).toEqual({total: 14, eventTypes: 2});
  });

  it('is null before the artifact loads', () => {
    expect(trackedEventsTotal(null)).toBeNull();
  });

  it('is null for the empty artifact written without the Vercel secrets', () => {
    expect(trackedEventsTotal(vercel({hasVercelData: false, events: []}))).toBeNull();
  });

  it('is null when no events were tracked', () => {
    expect(trackedEventsTotal(vercel({events: []}))).toBeNull();
  });
});

describe('rulesToReview', () => {
  it('ranks rules by the size of their gap, in either direction', () => {
    expect(ids(rulesToReview([rule('small', 50, 0.1), rule('over', 50, -0.9), rule('under', 50, 0.6)]))).toEqual([
      'over',
      'under',
      'small',
    ]);
  });

  it('leaves out rules with fewer than 10 score votes, however wide their gap', () => {
    expect(ids(rulesToReview([rule('thin', 9, 2.44), rule('enough', 10, 0.3)]))).toEqual(['enough']);
  });

  it('leaves out rules with no gap', () => {
    expect(rulesToReview([rule('unvoted', 0, null), rule('no-gap', 40, null)])).toEqual([]);
  });

  it('lists four rules by default', () => {
    const rules = [0.1, 0.2, 0.3, 0.4, 0.5].map((gap, i) => rule(`r${i}`, 20, gap));
    expect(ids(rulesToReview(rules))).toEqual(['r4', 'r3', 'r2', 'r1']);
  });

  it('takes a limit and a vote floor', () => {
    const rules = [rule('a', 3, 1), rule('b', 30, 0.5), rule('c', 30, 0.2)];
    expect(ids(rulesToReview(rules, {limit: 1, minVotes: 1}))).toEqual(['a']);
  });

  it('breaks a tie in favour of the rule with more votes', () => {
    expect(ids(rulesToReview([rule('fewer', 12, -0.4), rule('more', 80, 0.4)]))).toEqual(['more', 'fewer']);
  });

  it('leaves the input order alone', () => {
    const rules = [rule('a', 20, 0.1), rule('b', 20, 0.9)];
    rulesToReview(rules);
    expect(ids(rules)).toEqual(['a', 'b']);
  });
});

describe('latestVotes', () => {
  it('returns the newest votes first, whatever order the log is in', () => {
    const votes = [vote('2026-09-28T10:00:00Z'), vote('2026-09-30T08:00:00Z'), vote('2026-09-29T23:59:00Z')];
    expect(latestVotes(votes, 2).map((v) => v.ts)).toEqual(['2026-09-30T08:00:00Z', '2026-09-29T23:59:00Z']);
  });

  it('compares instants, not strings', () => {
    // 09:30 at +02:00 is 07:30Z, so the 08:00Z vote is the newer one.
    const votes = [vote('2026-09-30T09:30:00+02:00'), vote('2026-09-30T08:00:00Z')];
    expect(latestVotes(votes, 1)[0].ts).toBe('2026-09-30T08:00:00Z');
  });

  it("orders Supabase's created_at shape by instant, microseconds and offset included", () => {
    // vote-log.json carries ts as Supabase returns created_at. As strings, the Z vote would sort first.
    const votes = [
      vote('2026-09-30T14:20:00Z'),
      vote('2026-09-30T14:20:00.123456+00:00'),
      vote('2026-09-29T23:59:59.999999+00:00'),
    ];
    expect(latestVotes(votes, 3).map((v) => v.ts)).toEqual([
      '2026-09-30T14:20:00.123456+00:00',
      '2026-09-30T14:20:00Z',
      '2026-09-29T23:59:59.999999+00:00',
    ]);
  });

  it('keeps unscored quick votes', () => {
    expect(latestVotes([vote('2026-09-30T08:00:00Z', null)], 4)[0].score).toBeNull();
  });

  it('returns the whole log when it is shorter than n, and nothing for an empty log', () => {
    expect(latestVotes([vote('2026-09-30T08:00:00Z')], 4)).toHaveLength(1);
    expect(latestVotes([], 4)).toEqual([]);
  });

  it('leaves the log order alone', () => {
    const votes = [vote('2026-09-28T10:00:00Z'), vote('2026-09-30T08:00:00Z')];
    latestVotes(votes, 2);
    expect(votes.map((v) => v.ts)).toEqual(['2026-09-28T10:00:00Z', '2026-09-30T08:00:00Z']);
  });
});

describe('recentWeeks', () => {
  const weekly: WeeklyPoint[] = ['2026-07-06', '2026-07-13', '2026-07-20', '2026-07-27'].map((week) => ({
    week,
    votes: 10,
    meanGap: null,
  }));

  it('keeps the last n weeks, oldest first', () => {
    expect(recentWeeks(weekly, 2).map((w) => w.week)).toEqual(['2026-07-20', '2026-07-27']);
  });

  it('keeps every week when there are fewer than n', () => {
    expect(recentWeeks(weekly, 12)).toEqual(weekly);
  });

  it('keeps none for n of 0', () => {
    expect(recentWeeks(weekly, 0)).toEqual([]);
  });

  it('fills a week without votes instead of skipping it', () => {
    const sparse: WeeklyPoint[] = [
      {week: '2026-07-06', votes: 3, meanGap: null},
      {week: '2026-07-27', votes: 4, meanGap: -0.1},
    ];
    expect(recentWeeks(sparse, 3)).toEqual([
      {week: '2026-07-13', votes: 0, meanGap: null},
      {week: '2026-07-20', votes: 0, meanGap: null},
      {week: '2026-07-27', votes: 4, meanGap: -0.1},
    ]);
  });
});

describe('weeksThatFit', () => {
  it('shows all 12 weeks before the chart is measured, as in jsdom', () => {
    expect(weeksThatFit(0)).toBe(12);
  });

  it('fits as many 44px slots (a 40px column and SPACING.xs of air) as the plot holds', () => {
    // Narrower than one slot still shows the newest week.
    expect(weeksThatFit(43)).toBe(1);
    // 11 slots take 11 × 44 = 484px; 12 take 528px.
    expect(weeksThatFit(527)).toBe(11);
    expect(weeksThatFit(528)).toBe(12);
  });

  it('never shows more than 12 weeks', () => {
    expect(weeksThatFit(10000)).toBe(12);
  });
});
