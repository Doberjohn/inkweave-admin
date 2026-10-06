// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {weeklyGaps} from '../../../src/tools/analytics/calibration/chartData.ts';
import {buildAnalytics, buildVoteLog} from '../voteAnalytics.mjs';

/*
 * Admin's weeklyGaps against the precompute's bucketWeekly and rollUpByRule.
 * Both sides run on the same raw votes, through the transforms the Deploy runs
 * (buildAnalytics, buildVoteLog), so on "All pairs" the Weekly gap chart can't
 * drift from global.weekly's mean gap, the artifact it sits beside.
 *
 * A rule's weeks add up to its mean gap here only because no pair in this
 * fixture reaches 10 score votes, and its averages are exact. A pair's gap
 * comes from pair_scores' avg_score, a 10% trimmed mean from 10 score votes up
 * (internal.trimmed_mean drops floor(n × 0.1) votes from each end), while the
 * weekly means are untrimmed: a 10-vote pair's outlier counts in its week but
 * not in its gap. So on real data a scope's weekly means need not average to
 * its gap, and the precompute rounds gaps and averages to two places besides.
 */

// The engine's pairs as loadEngineArtifacts keys them (pairKey: ids sorted, ':').
const ENGINE_PAIRS = new Map([
  ['1:2', {engineScore: 7, connections: [{ruleId: 'ramp'}]}],
  ['3:4', {engineScore: 5, connections: [{ruleId: 'ramp'}, {ruleId: 'shift-targets'}]}],
  ['5:6', {engineScore: 8, connections: [{ruleId: 'shift-targets'}]}],
]);
const ALL_RULES = [
  {ruleId: 'ramp', ruleName: 'Ramp', category: 'playstyle'},
  {ruleId: 'shift-targets', ruleName: 'Shift Targets', category: 'direct'},
];
const NAMES = new Map(['1', '2', '3', '4', '5', '6', '7', '8'].map((id) => [id, `Card ${id}`]));

/** A raw vote as fetchAllRows reads it: Supabase's microsecond +00:00 timestamp, card ids in either order. */
function raw(createdAt, a, b, score) {
  return {
    created_at: createdAt,
    ip_hash: `voter-${a}-${b}`,
    card_a_id: a,
    card_b_id: b,
    score,
    accuracy: null,
    is_real: null,
    would_play: null,
    difficulty: null,
    who_carries: null,
  };
}

// Sep 14 (gaps −3, +3, +1), Sep 21 (one quick vote), Sep 28 (−2, −2), no vote
// at all in the week of Oct 5, and Oct 12 (a pair the engine is silent on).
const RAW_VOTES = [
  raw('2026-09-14T10:00:00.123456+00:00', '2', '1', 4),
  raw('2026-09-15T10:00:00.123456+00:00', '1', '2', 10),
  raw('2026-09-16T10:00:00.123456+00:00', '3', '4', 6),
  raw('2026-09-22T10:00:00.123456+00:00', '1', '2', null),
  raw('2026-09-28T10:00:00.123456+00:00', '5', '6', 6),
  raw('2026-09-29T10:00:00.123456+00:00', '4', '3', 3),
  raw('2026-10-12T10:00:00.123456+00:00', '7', '8', 9),
];
// pair_scores for those votes, ids in the view's own order. Every pair has
// fewer than 10 score votes, so avg_score is the plain mean, untrimmed.
const SCORE_ROWS = [
  {card_a_id: '2', card_b_id: '1', avg_score: 7, score_votes: 2, total_votes: 3, accuracy_sentiment: null},
  {card_a_id: '3', card_b_id: '4', avg_score: 4.5, score_votes: 2, total_votes: 2, accuracy_sentiment: null},
  {card_a_id: '5', card_b_id: '6', avg_score: 6, score_votes: 1, total_votes: 1, accuracy_sentiment: null},
  {card_a_id: '7', card_b_id: '8', avg_score: 9, score_votes: 1, total_votes: 1, accuracy_sentiment: null},
];

const analytics = buildAnalytics({
  scoreRows: SCORE_ROWS,
  enginePairs: ENGINE_PAIRS,
  allRules: ALL_RULES,
  names: NAMES,
  ruleTotalPairs: {ramp: 2, 'shift-targets': 2},
  rawVotes: RAW_VOTES,
});
const log = buildVoteLog(RAW_VOTES, NAMES);

describe('weeklyGaps against the precompute', () => {
  it("matches global.weekly's mean gap week for week on every pair, and fills the weeks it skips", () => {
    const weeks = weeklyGaps(log.votes, analytics.pairs);
    // global.weekly lists only the weeks that have a vote: Oct 5 has none.
    expect(analytics.global.weekly.map((w) => w.week)).toEqual([
      '2026-09-14',
      '2026-09-21',
      '2026-09-28',
      '2026-10-12',
    ]);
    for (const point of analytics.global.weekly) {
      const week = weeks.find((w) => w.week === point.week);
      if (point.meanGap == null) expect(week?.meanGap, point.week).toBeNull();
      else expect(week?.meanGap, point.week).toBeCloseTo(point.meanGap, 10);
    }
    expect(weeks.map((w) => [w.week, w.scoreVotes])).toEqual([
      ['2026-09-14', 3],
      ['2026-09-21', 0],
      ['2026-09-28', 2],
      ['2026-10-05', 0],
      ['2026-10-12', 0],
    ]);
  });

  it("adds up, over a rule's pairs, to that rule's score votes, and to its mean gap while no pair is trimmed", () => {
    for (const rule of analytics.rules) {
      // The rule's scope, as pairsInScope (R2-1) picks it.
      const scope = analytics.pairs.filter((p) => p.rules.includes(rule.ruleId));
      const weeks = weeklyGaps(log.votes, scope);
      const votes = weeks.reduce((n, w) => n + w.scoreVotes, 0);
      const weighted = weeks.reduce((sum, w) => sum + (w.meanGap ?? 0) * w.scoreVotes, 0) / votes;
      expect(votes, rule.ruleId).toBe(rule.scoreVotes);
      expect(weighted, rule.ruleId).toBeCloseTo(rule.meanGap, 10);
    }
  });
});
