import type {PairStat, RuleStat} from '../voteAnalyticsTypes';

/*
 * Card analytics fixtures, shared by the /cards tests and stories, as
 * calibration/chartFixtures.ts is for /calibration's. They live in a plain
 * module: Storybook reads every named export of a .stories.tsx file as a
 * story, and a story can't import a test file. Nothing in the app imports this
 * file, so the build leaves it out. Every builder takes one object, so a
 * fixture names what it sets. R3-3 adds the card's raw votes, and R3-4 its
 * synergy file.
 */

/** What a pairs[] fixture sets. Names default to "Card <id>", score votes to 1 and rules to Ramp. */
export interface PairSeed {
  a: string;
  b: string;
  engineScore: number;
  communityScore: number;
  scoreVotes?: number;
  rules?: string[];
  aName?: string;
  bName?: string;
}

/**
 * A pairs[] row, shaped as computePairRecord writes it
 * (scripts/lib/voteAnalytics.mjs:22-44). Its gap is community − engine,
 * unrounded: with a whole engine score the precompute's round2 changes
 * nothing, so communityAvg − engineAvg equals meanGap to float precision.
 * Give `a` the lower id in string order, as the votes table does. Score votes
 * are 1 or more: the precompute drops a pair with none (:23).
 */
export function pairStat(seed: PairSeed): PairStat {
  const {a, b, engineScore, communityScore, scoreVotes = 1, rules = ['ramp']} = seed;
  return {
    a,
    b,
    aName: seed.aName ?? `Card ${a}`,
    bName: seed.bName ?? `Card ${b}`,
    engineScore,
    communityScore,
    gap: communityScore - engineScore,
    scoreVotes,
    rules,
  };
}

/** The card the /cards fixtures look at. */
export const CARD_ID = '1046';
export const CARD_NAME = 'Maui - Hero to All';

/**
 * Maui's five voted pairs, plus one between two other cards. Engine →
 * community (score votes, rules):
 * - Moana 8 → 5.5 (6, Ramp and Singer + Songs), with Maui on the b side;
 * - Pua 5 → 7 (1, Shift Targets) and Tamatoa 6 → 4 (1, Location Boost, Maui
 *   on the b side): the same |gap| and votes, so the name orders them;
 * - Heihei 7 → 7.25 (4, Ramp);
 * - Gramma Tala 9 → 9 (2, Ramp and a rule the analytics no longer have).
 * Maui: 14 score votes, mean gap −1, engine 7.5 → community 6.5.
 */
export const CARD_PAIRS: readonly PairStat[] = [
  pairStat({
    a: '1012',
    b: CARD_ID,
    aName: 'Moana - Of Motunui',
    bName: CARD_NAME,
    engineScore: 8,
    communityScore: 5.5,
    scoreVotes: 6,
    rules: ['ramp', 'singer-songs'],
  }),
  pairStat({
    a: '1033',
    b: CARD_ID,
    aName: 'Tamatoa - So Shiny!',
    bName: CARD_NAME,
    engineScore: 6,
    communityScore: 4,
    rules: ['location-boost'],
  }),
  pairStat({
    a: CARD_ID,
    b: '1102',
    aName: CARD_NAME,
    bName: 'Heihei - Boat Snack',
    engineScore: 7,
    communityScore: 7.25,
    scoreVotes: 4,
  }),
  pairStat({
    a: CARD_ID,
    b: '1187',
    aName: CARD_NAME,
    bName: 'Pua - Potbellied Buddy',
    engineScore: 5,
    communityScore: 7,
    rules: ['shift-targets'],
  }),
  pairStat({
    a: CARD_ID,
    b: '2001',
    aName: CARD_NAME,
    bName: 'Gramma Tala - Storyteller',
    engineScore: 9,
    communityScore: 9,
    scoreVotes: 2,
    rules: ['ramp', 'retired-rule'],
  }),
  pairStat({
    a: '1102',
    b: '1187',
    aName: 'Heihei - Boat Snack',
    bName: 'Pua - Potbellied Buddy',
    engineScore: 4,
    communityScore: 6,
    scoreVotes: 3,
  }),
];

/** What a sample rule sets; the card page reads only its id and name. */
type RuleSeed = Pick<RuleStat, 'ruleId' | 'ruleName' | 'category' | 'scoreVotes' | 'meanGap'>;

/** A RuleStat with its secondary counts filled in, as overview/overviewFixtures.ts builds them. */
export function ruleStat(seed: RuleSeed): RuleStat {
  return {...seed, pairsVoted: Math.round(seed.scoreVotes / 2), accuracySentiment: null, pairsCovered: 0.4};
}

/** The analytics rules behind CARD_PAIRS. 'retired-rule' has none, so the card's table names it by its id. */
export const CARD_RULES: readonly RuleStat[] = [
  ruleStat({ruleId: 'ramp', ruleName: 'Ramp', category: 'playstyle', scoreVotes: 557, meanGap: -0.57}),
  ruleStat({ruleId: 'shift-targets', ruleName: 'Shift Targets', category: 'direct', scoreVotes: 214, meanGap: -0.22}),
  ruleStat({ruleId: 'singer-songs', ruleName: 'Singer + Songs', category: 'direct', scoreVotes: 141, meanGap: 0.14}),
  ruleStat({ruleId: 'location-boost', ruleName: 'Location Boost', category: 'playstyle', scoreVotes: 9, meanGap: 2.44}),
];

/** A card for Cards to review: two pairs with cards of its own, both at `gap`, with `votes` score votes each. */
interface ReviewSeed {
  id: string;
  name: string;
  gap: number;
  votes: readonly [number, number];
}

/** A review card's two pairs. Each partner's id extends the card's, so the card keeps the a side. */
function reviewPairs({id, name, gap, votes}: ReviewSeed): PairStat[] {
  return votes.map((scoreVotes, i) =>
    pairStat({a: id, b: `${id}${i + 1}`, aName: name, engineScore: 6, communityScore: 6 + gap, scoreVotes}),
  );
}

/**
 * Seven cards at quarter-point gaps (exact in floating point), and their
 * partners, none of which reaches 10 score votes. Cards to review lists Elsa
 * (−1.75), Stitch (+1.5), Hades (+1.25, 12 votes), Belle (−1.25, 10 votes) and
 * Tinker Bell (+0.75); Mickey (−0.5) is sixth, and Ursula's −3 rests on 9
 * votes.
 */
const REVIEW_SEEDS: readonly ReviewSeed[] = [
  {id: '3001', name: 'Elsa - Spirit of Winter', gap: -1.75, votes: [5, 5]},
  {id: '3002', name: 'Stitch - Rock Star', gap: 1.5, votes: [5, 5]},
  {id: '3003', name: 'Belle - Strange but Special', gap: -1.25, votes: [5, 5]},
  {id: '3004', name: 'Hades - King of Olympus', gap: 1.25, votes: [6, 6]},
  {id: '3005', name: 'Tinker Bell - Giant Fairy', gap: 0.75, votes: [5, 5]},
  {id: '3006', name: 'Mickey Mouse - Wayward Sorcerer', gap: -0.5, votes: [5, 5]},
  {id: '3007', name: 'Ursula - Power Hungry', gap: -3, votes: [4, 5]},
];
export const REVIEW_PAIRS: readonly PairStat[] = REVIEW_SEEDS.flatMap(reviewPairs);
