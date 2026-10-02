import type {RuleStat, VoteAnalytics, WeeklyPoint} from '../voteAnalyticsTypes';
import type {VoteLog, VoteLogRow} from '../voteLogTypes';
import type {VercelAnalytics, VercelEvent} from '../vercelAnalyticsTypes';

/*
 * Overview fixtures, shared by the Overview's tests and stories: sample rules,
 * votes and events in the shape of the three admin-data artifacts. The weekly
 * series runs 14 Mondays, so the 12-week window has two weeks to cut, and its
 * totals add up to totalVotes.
 */

type RuleSeed = Pick<RuleStat, 'ruleId' | 'ruleName' | 'category' | 'scoreVotes' | 'meanGap'>;
/** A RuleStat with its secondary counts filled in; the Overview reads only the seed fields. */
const rule = (r: RuleSeed): RuleStat => ({...r, pairsVoted: Math.round(r.scoreVotes / 2), accuracySentiment: null, pairsCovered: 0.4});

const RULES: RuleStat[] = [
  rule({ruleId: 'ramp', ruleName: 'Ramp', category: 'playstyle', scoreVotes: 557, meanGap: -0.57}),
  rule({ruleId: 'shift-targets', ruleName: 'Shift Targets', category: 'direct', scoreVotes: 214, meanGap: -0.22}),
  rule({ruleId: 'singer-songs', ruleName: 'Singer + Songs', category: 'direct', scoreVotes: 141, meanGap: 0.14}),
  rule({ruleId: 'discard', ruleName: 'Discard', category: 'playstyle', scoreVotes: 103, meanGap: 0.83}),
  // The widest gap of all, on 9 votes: Rules to review leaves it out.
  rule({ruleId: 'location-boost', ruleName: 'Location Boost', category: 'playstyle', scoreVotes: 9, meanGap: 2.44}),
  // No score votes, so no gap.
  rule({ruleId: 'bodyguard', ruleName: 'Bodyguard', category: 'direct', scoreVotes: 0, meanGap: null}),
];

/** [Monday, votes, mean gap]. The week of Aug 10 holds only quick votes, so it has no gap. */
const WEEKS: Array<[string, number, number | null]> = [
  ['2026-06-29', 62, -0.52],
  ['2026-07-06', 75, -0.47],
  ['2026-07-13', 88, -0.44],
  ['2026-07-20', 101, -0.41],
  ['2026-07-27', 96, -0.39],
  ['2026-08-03', 118, -0.35],
  ['2026-08-10', 134, null],
  ['2026-08-17', 150, -0.31],
  ['2026-08-24', 172, -0.28],
  ['2026-08-31', 160, -0.31],
  ['2026-09-07', 188, -0.22],
  ['2026-09-14', 214, -0.27],
  ['2026-09-21', 236, -0.33],
  ['2026-09-28', 260, -0.3],
];
const WEEKLY: WeeklyPoint[] = WEEKS.map(([week, votes, meanGap]) => ({week, votes, meanGap}));

export const ANALYTICS: VoteAnalytics = {
  generatedAt: '2026-09-30T04:12:00Z',
  hasRawVotes: true,
  global: {
    totalVotes: 2054,
    distinctPairs: 1928,
    distinctVoters: 114,
    meanGap: -0.3,
    accuracySentiment: 0.03,
    engineSilentPairs: 196,
    weekly: WEEKLY,
    dimensionFill: {score: 1610, accuracy: 1902, isReal: 1204, wouldPlay: 980, difficulty: 742},
  },
  rules: RULES,
  pairs: [],
};

/**
 * A log a few weeks old: three weekly points with a quiet week (Sep 14)
 * between them, so the chart has four bars, and no rule with 10 score votes
 * yet. The busiest week (Sep 21) isn't the newest, so the 'extremes' cap
 * labels print two totals. The weeks add up to totalVotes.
 */
export const EARLY_ANALYTICS: VoteAnalytics = {
  ...ANALYTICS,
  global: {
    ...ANALYTICS.global,
    totalVotes: 92,
    distinctPairs: 85,
    distinctVoters: 14,
    meanGap: -0.31,
    accuracySentiment: 0.05,
    engineSilentPairs: 9,
    weekly: [
      {week: '2026-09-07', votes: 18, meanGap: -0.61},
      {week: '2026-09-21', votes: 41, meanGap: -0.35},
      {week: '2026-09-28', votes: 33, meanGap: -0.18},
    ],
    dimensionFill: {score: 70, accuracy: 88, isReal: 50, wouldPlay: 41, difficulty: 30},
  },
  rules: [],
};

/** The artifact built without SUPABASE_SERVICE_ROLE_KEY: no voters, weeks or dimension fill. */
export const NO_RAW_ANALYTICS: VoteAnalytics = {
  ...ANALYTICS,
  hasRawVotes: false,
  global: {...ANALYTICS.global, distinctVoters: null, weekly: [], dimensionFill: null},
};

function vote(aName: string, bName: string, score: number | null, ts: string, voter: number): VoteLogRow {
  return {
    a: `crd-${aName}`,
    b: `crd-${bName}`,
    aName,
    bName,
    score,
    accuracy: score == null ? 1 : 0,
    isReal: null,
    wouldPlay: null,
    difficulty: null,
    whoCarries: null,
    ts,
    voter,
  };
}

/**
 * Newest first, as the precompute writes it. Voter 12's vote is a quick vote:
 * no score. The newest ts has the shape vote-log.json really carries,
 * Supabase's created_at (microseconds and +00:00); the others use the short Z
 * form.
 */
export const VOTE_LOG: VoteLog = {
  generatedAt: '2026-09-30T04:12:00Z',
  voterCount: 114,
  votes: [
    vote('Maui', 'Fishhook', 5, '2026-09-30T14:20:00.123456+00:00', 41),
    vote('Maui', 'Fishhook', null, '2026-09-30T09:05:00Z', 12),
    vote('Elsa - Spirit', 'Elsa - Snow Queen', 7, '2026-09-29T18:44:00Z', 5),
    vote('Cogsworth', 'Beast’s Castle', 3, '2026-09-28T11:02:00Z', 6),
    vote('Mad Hatter', 'The Queen of Hearts', 8, '2026-09-27T20:15:00Z', 88),
  ],
};

/** The vote log written without raw votes. */
export const EMPTY_VOTE_LOG: VoteLog = {generatedAt: '2026-09-30T04:12:00Z', votes: [], voterCount: 0};

function event(name: string, label: string, total: number, visitors: number): VercelEvent {
  return {name, label, total, visitors, trend: [], breakdowns: []};
}

/** 8,540 events over five types, out of order on purpose: the card sorts them. */
export const VERCEL: VercelAnalytics = {
  generatedAt: '2026-09-30T04:15:00Z',
  hasVercelData: true,
  reportingWindow: {since: '2026-07-31', until: '2026-09-29'},
  events: [
    event('vote_submitted', 'Votes submitted', 1240, 410),
    event('reveal_card_click', 'Reveal card clicks', 4820, 1310),
    event('search_submitted', 'Searches', 2010, 640),
    event('vote_skipped', 'Votes skipped', 330, 120),
    event('share_clicked', 'Share clicks', 140, 88),
  ],
};

/** The empty-but-valid artifact written without the Vercel secrets. */
export const NO_VERCEL: VercelAnalytics = {
  generatedAt: '2026-09-30T04:15:00Z',
  hasVercelData: false,
  reportingWindow: null,
  events: [],
};

/** Vercel answered, but no custom events have been tracked. */
export const NO_EVENTS: VercelAnalytics = {...VERCEL, events: []};
