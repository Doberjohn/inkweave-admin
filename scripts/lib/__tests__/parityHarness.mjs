import {buildAnalytics, buildVoteLog} from '../voteAnalytics.mjs';

/*
 * What the parity tests share: raw votes as the precompute reads them, and the
 * two transforms the Deploy runs over them (buildAnalytics, buildVoteLog).
 * Each test brings its own votes, pair_scores rows and engine pairs.
 */

/** The rules the tests' engine pairs connect through. */
export const ALL_RULES = [
  {ruleId: 'ramp', ruleName: 'Ramp', category: 'playstyle'},
  {ruleId: 'shift-targets', ruleName: 'Shift Targets', category: 'direct'},
];

/** A raw vote as fetchAllRows reads it: Supabase's microsecond +00:00 timestamp, card ids in either order. */
export function raw(createdAt, a, b, score) {
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

/**
 * Vote analytics and the vote log, as the Deploy writes them from those votes,
 * over ALL_RULES. Every other input (pair_scores rows, engine pairs, the
 * rules' pair totals) goes to buildAnalytics as the test gives it.
 */
export function precompute({rawVotes, names, ...inputs}) {
  return {
    analytics: buildAnalytics({...inputs, allRules: ALL_RULES, names, rawVotes}),
    log: buildVoteLog(rawVotes, names),
  };
}
