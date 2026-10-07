// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {activityWindow} from '../../../src/tools/analytics/activity/activityModel.ts';
import {cardCalibration, pairsForCard} from '../../../src/tools/analytics/cards/cardStats.ts';
import {
  engineSilentForCard,
  scoreHistogram,
  votesForCard,
  votesPerWeek,
} from '../../../src/tools/analytics/cards/cardVotes.ts';
import {buildAnalytics, buildVoteLog} from '../voteAnalytics.mjs';

/*
 * The card page's raw-vote model against the precompute, on the same raw
 * votes, through the transforms the Deploy runs (buildAnalytics,
 * buildVoteLog), as weeklyGapsParity.test.mjs does for /calibration. It holds
 * the card page's two files together: a card's scored votes in the log are its
 * pairs[] score votes plus its engine-silent votes, and its weeks are
 * global.weekly's weeks.
 *
 * On real data the first check can be off by a vote: the precompute reads
 * pair_scores before the votes, so a vote cast in between is in one file and
 * not the other. The page never relies on it; only this test does.
 */

// The engine's pairs as loadEngineArtifacts keys them (pairKey: ids sorted, ':').
const ENGINE_PAIRS = new Map([
  ['1:2', {engineScore: 7, connections: [{ruleId: 'ramp'}]}],
  ['1:3', {engineScore: 6, connections: [{ruleId: 'ramp'}]}],
  ['3:4', {engineScore: 5, connections: [{ruleId: 'shift-targets'}]}],
]);
const ALL_RULES = [
  {ruleId: 'ramp', ruleName: 'Ramp', category: 'playstyle'},
  {ruleId: 'shift-targets', ruleName: 'Shift Targets', category: 'direct'},
];
// Card 9 has rotated out of Core: the card list doesn't have it, and the
// precompute has no name for it (its rows carry the bare id).
const NAMES = new Map(['1', '2', '3', '4', '5'].map((id) => [id, `Card ${id}`]));
const isListed = (id) => NAMES.has(id);
/** Every card in the log, card 9 included. */
const CARD_IDS = ['1', '2', '3', '4', '5', '9'];

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

// Card 1 has a pair the engine scores with 2 and with 3, a quick vote on
// 1 × 2, only a quick vote with 4, and engine-silent pairs with 5 (in the
// card list) and 9 (rotated out). 3 × 4 is a pair without card 1. The week of
// Oct 5 has no vote at all.
const RAW_VOTES = [
  raw('2026-09-14T10:00:00.123456+00:00', '2', '1', 4),
  raw('2026-09-15T10:00:00.123456+00:00', '1', '2', 10),
  raw('2026-09-20T23:59:59.999999+00:00', '3', '1', 6),
  raw('2026-09-22T10:00:00.123456+00:00', '1', '2', null),
  raw('2026-09-22T11:00:00.123456+00:00', '4', '1', null),
  raw('2026-09-28T10:00:00.123456+00:00', '1', '5', 6),
  raw('2026-09-29T10:00:00.123456+00:00', '5', '1', 3),
  raw('2026-09-30T10:00:00.123456+00:00', '9', '1', 8),
  raw('2026-10-12T10:00:00.123456+00:00', '3', '4', 5),
];
// pair_scores for those votes, ids in the view's own order: the scored votes'
// mean and count, and every vote. No pair reaches 10 score votes, so nothing
// is trimmed. 1 × 4 has no score vote, so it has no avg_score.
const SCORE_ROWS = [
  {card_a_id: '1', card_b_id: '2', avg_score: 7, score_votes: 2, total_votes: 3, accuracy_sentiment: null},
  {card_a_id: '1', card_b_id: '3', avg_score: 6, score_votes: 1, total_votes: 1, accuracy_sentiment: null},
  {card_a_id: '1', card_b_id: '4', avg_score: null, score_votes: 0, total_votes: 1, accuracy_sentiment: null},
  {card_a_id: '1', card_b_id: '5', avg_score: 4.5, score_votes: 2, total_votes: 2, accuracy_sentiment: null},
  {card_a_id: '1', card_b_id: '9', avg_score: 8, score_votes: 1, total_votes: 1, accuracy_sentiment: null},
  {card_a_id: '3', card_b_id: '4', avg_score: 5, score_votes: 1, total_votes: 1, accuracy_sentiment: null},
];

const analytics = buildAnalytics({
  scoreRows: SCORE_ROWS,
  enginePairs: ENGINE_PAIRS,
  allRules: ALL_RULES,
  names: NAMES,
  ruleTotalPairs: {ramp: 2, 'shift-targets': 1},
  rawVotes: RAW_VOTES,
});
const log = buildVoteLog(RAW_VOTES, NAMES);

/** One card's raw-vote model, as the card page builds it. */
function cardModel(cardId) {
  const cardVotes = votesForCard(log.votes, cardId);
  const cardPairs = pairsForCard(analytics.pairs, cardId);
  return {cardVotes, cardPairs, silent: engineSilentForCard(cardVotes, cardPairs, isListed)};
}

describe('the card vote model against the precompute', () => {
  it("adds every card's pairs[] score votes and engine-silent votes up to its scored votes in the log", () => {
    for (const id of CARD_IDS) {
      const {cardVotes, cardPairs, silent} = cardModel(id);
      expect(scoreHistogram(cardVotes).scored, id).toBe(cardCalibration(cardPairs).scoreVotes + silent.votes);
      expect(silent.partnerUnlisted.votes + silent.partnerListed.votes, id).toBe(silent.votes);
    }
    expect(cardModel('1').silent).toEqual({
      pairs: 2,
      votes: 3,
      partnerUnlisted: {pairs: 1, votes: 1},
      partnerListed: {pairs: 1, votes: 2},
    });
  });

  it('counts each engine-silent pair once from each of its cards: twice global.engineSilentPairs', () => {
    const pairs = CARD_IDS.reduce((n, id) => n + cardModel(id).silent.pairs, 0);
    expect(analytics.global.engineSilentPairs).toBe(2);
    expect(pairs).toBe(2 * analytics.global.engineSilentPairs);
  });

  it("buckets votes into global.weekly's Monday weeks, and fills the weeks it skips", () => {
    const logSpan = activityWindow(log.votes, 'all');
    const perWeek = new Map();
    for (const id of CARD_IDS) {
      for (const {week, votes} of votesPerWeek(cardModel(id).cardVotes, logSpan)) {
        perWeek.set(week, (perWeek.get(week) ?? 0) + votes);
      }
    }
    // global.weekly lists only the weeks that have a vote: Oct 5 has none.
    expect(analytics.global.weekly.map((w) => [w.week, w.votes])).toEqual([
      ['2026-09-14', 3],
      ['2026-09-21', 2],
      ['2026-09-28', 3],
      ['2026-10-12', 1],
    ]);
    // Every vote has two cards, so the cards' weeks add up to twice the log's,
    // and the weeks global.weekly skips are there, with no votes.
    for (const point of analytics.global.weekly) expect(perWeek.get(point.week), point.week).toBe(2 * point.votes);
    expect([...perWeek.keys()]).toEqual(['2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12']);
    expect(perWeek.get('2026-10-05')).toBe(0);
  });
});
