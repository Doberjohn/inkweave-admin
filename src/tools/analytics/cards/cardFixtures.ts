import type {LorcanaCard} from 'inkweave-synergy-engine';
import type {PairStat, RuleStat} from '../voteAnalyticsTypes';
import type {VoteLogRow} from '../voteLogTypes';
import type {CardSynergies} from './engineView';

/*
 * Card analytics fixtures, shared by the /cards tests and stories, as
 * calibration/chartFixtures.ts is for /calibration's. They live in a plain
 * module: Storybook reads every named export of a .stories.tsx file as a
 * story, and a story can't import a test file. Nothing in the app imports this
 * file, so the build leaves it out. Every builder takes one argument, an
 * object, or for engineFixture a list of objects, so a fixture names what it
 * sets. R3-3 adds the card's raw votes, and R3-4 its synergy file.
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

/*
 * Raw votes (R3-3): one card's votes in a small vote log, and the pairs[]
 * rows the precompute would write for that log. Card 500 has, among its
 * partners:
 * - 120 and 640, pairs the engine scores (500 sits on side b of 120's rows
 *   and side a of 640's);
 * - 710, engine-silent with both cards in the card list;
 * - 305, engine-silent with a partner outside the list (UNLISTED_IDS);
 * - 880, only quick votes, so not engine-silent.
 * The log runs from Monday Aug 31 to Tuesday Oct 6, so its last week is a
 * part week, and its first and last votes aren't on card 500.
 */

/** Card 500: the card whose votes the R3-3 fixtures follow. */
export const VOTED_CARD = '500';

/** Partners outside the current card list: the card list's lookup says no to these. */
export const UNLISTED_IDS: ReadonlySet<string> = new Set(['305']);

/** A vote-log row: "Card <a>" × "Card <b>" by voter 1, score 5, nothing else answered. Override what a case needs. */
export function voteRow({a, b, ...rest}: Partial<VoteLogRow> & Pick<VoteLogRow, 'a' | 'b' | 'ts'>): VoteLogRow {
  return {
    a,
    b,
    aName: `Card ${a}`,
    bName: `Card ${b}`,
    score: 5,
    accuracy: null,
    isReal: null,
    wouldPlay: null,
    difficulty: null,
    whoCarries: null,
    voter: 1,
    ...rest,
  };
}

/**
 * The whole vote log, oldest first (the file itself is newest first; nothing
 * reads the order). Timestamps are Supabase's microsecond +00:00 form, and
 * one vote lands late on a Sunday. Every row is one the votes table accepts:
 * no voter votes the same pair twice (its unique index), and every row
 * answers something (its has_vote check), so each quick vote here answers who
 * carries.
 */
export const VOTED_CARD_LOG: readonly VoteLogRow[] = [
  voteRow({a: '120', b: '640', ts: '2026-08-31T12:00:00.123456+00:00', score: 6, voter: 7}),
  voteRow({
    a: '120',
    b: '500',
    ts: '2026-09-08T09:00:00.123456+00:00',
    score: 7,
    accuracy: 0,
    isReal: true,
    wouldPlay: true,
    difficulty: 1,
    whoCarries: 'b',
  }),
  voteRow({
    a: '120',
    b: '500',
    ts: '2026-09-13T23:30:00.123456+00:00',
    score: 5,
    accuracy: -1,
    isReal: true,
    wouldPlay: false,
    difficulty: 2,
    whoCarries: 'a',
    voter: 2,
  }),
  voteRow({
    a: '500',
    b: '640',
    ts: '2026-09-14T10:00:00.123456+00:00',
    score: 9,
    accuracy: 1,
    isReal: false,
    wouldPlay: true,
    difficulty: 3,
    whoCarries: 'a',
  }),
  voteRow({a: '500', b: '640', ts: '2026-09-16T10:00:00.123456+00:00', score: 8, whoCarries: 'both', voter: 3}),
  voteRow({a: '500', b: '640', ts: '2026-09-17T10:00:00.123456+00:00', score: null, whoCarries: 'both', voter: 4}),
  voteRow({
    a: '500',
    b: '710',
    ts: '2026-09-22T10:00:00.123456+00:00',
    score: 3,
    accuracy: -1,
    difficulty: 1,
    whoCarries: 'neither',
    voter: 2,
  }),
  voteRow({a: '500', b: '710', ts: '2026-09-23T10:00:00.123456+00:00', score: 4, whoCarries: 'b', voter: 5}),
  voteRow({a: '500', b: '710', ts: '2026-09-23T11:00:00.123456+00:00', score: null, whoCarries: 'both', voter: 8}),
  voteRow({a: '305', b: '500', ts: '2026-09-24T10:00:00.123456+00:00', score: 6}),
  voteRow({a: '500', b: '880', ts: '2026-09-25T10:00:00.123456+00:00', score: null, whoCarries: 'both', voter: 6}),
  voteRow({a: '500', b: '880', ts: '2026-09-26T10:00:00.123456+00:00', score: null, whoCarries: 'both', voter: 9}),
  voteRow({a: '120', b: '640', ts: '2026-10-06T08:00:00.123456+00:00', score: 7}),
];

/**
 * pairs[] for that log, as the precompute writes it: only the pairs the
 * engine scores that have a score vote, community score the plain mean (no
 * pair reaches 10 score votes, so nothing is trimmed), gap = community −
 * engine. 710, 305 and 880 have no row.
 */
export const VOTED_CARD_PAIRS: readonly PairStat[] = [
  pairStat({a: '120', b: VOTED_CARD, engineScore: 6, communityScore: 6, scoreVotes: 2}),
  pairStat({a: VOTED_CARD, b: '640', engineScore: 8, communityScore: 8.5, scoreVotes: 2, rules: ['ramp', 'shift-targets']}),
  pairStat({a: '120', b: '640', engineScore: 7, communityScore: 6.5, scoreVotes: 2, rules: ['shift-targets']}),
];

// ── Engine fixtures (R3-4) ──

/** One partner in a synergy-file fixture. `rules`: the pair's rule names, strongest first (default ['Ramp']). */
export interface FixturePartner {
  id: string;
  name: string;
  score: number;
  rules?: readonly string[];
}

/** A synergy file, and the name lookup the card page would build from the card list. */
export interface EngineFixture {
  data: CardSynergies;
  nameOf: (id: string) => string;
}

type FixtureGroup = CardSynergies['groups'][number];
type FixtureConnection = CardSynergies['pairs'][string]['connections'][number];

const rulesOf = (partner: FixturePartner): readonly string[] => partner.rules ?? ['Ramp'];
/** A rule's id from its name, as the engine's ids read: 'Shift Targets' is 'shift-targets'. */
const ruleIdOf = (ruleName: string): string => ruleName.toLowerCase().replaceAll(' ', '-');

/** The pair's connections, one per rule, strongest first and a point apart, as the engine writes them. */
function connectionsOf(partner: FixturePartner): FixtureConnection[] {
  return rulesOf(partner).map((ruleName, i) => ({
    category: 'direct' as const,
    ruleId: ruleIdOf(ruleName),
    ruleName,
    score: Math.max(1, partner.score - i),
    explanation: `${ruleName} connects the two.`,
  }));
}

/**
 * One group per rule, in order of first use, listing every partner the rule
 * connects. Each entry carries the pair's connection for that rule, score
 * included: the engine scores a group entry in one direction, and the
 * connection keeps the higher of the two, so no entry outscores it.
 */
function groupsOf(partners: readonly FixturePartner[]): FixtureGroup[] {
  const rules = [...new Set(partners.flatMap(rulesOf))];
  return rules.map((ruleName) => ({
    groupKey: ruleIdOf(ruleName),
    category: 'direct' as const,
    label: ruleName,
    tagline: `${ruleName} pairs.`,
    description: `Cards ${ruleName} connects.`,
    synergies: partners.flatMap((partner) =>
      connectionsOf(partner)
        .filter((connection) => connection.ruleName === ruleName)
        .map(({ruleId, score, explanation}) => ({cardId: partner.id, score, explanation, ruleId, ruleName})),
    ),
  }));
}

/**
 * A synergy file shaped as precompute-synergies.mjs writes it: one group per
 * rule, and one `pairs` entry per partner whose aggregateScore is its score.
 */
export function engineFixture(partners: readonly FixturePartner[]): EngineFixture {
  const names = new Map(partners.map((partner) => [partner.id, partner.name]));
  return {
    data: {
      groups: groupsOf(partners),
      pairs: Object.fromEntries(
        partners.map((partner) => [partner.id, {connections: connectionsOf(partner), aggregateScore: partner.score}]),
      ),
    },
    nameOf: (id) => names.get(id) ?? id,
  };
}

/** No synergies: what fetchCardSynergies caches for a missing or unreadable file. */
export const ENGINE_EMPTY: EngineFixture = engineFixture([]);

/** One partner. */
export const ENGINE_ONE_PARTNER: EngineFixture = engineFixture([
  {id: '401', name: 'Marigold Finch - Lamplighter', score: 6},
]);

/**
 * 15 partners in every tier: 10, 9, 9, 8, 8, eight at 7, then 5 and 3. The
 * cut at 12 falls inside the eight at 7, so 7 of them are drawn, by name: the
 * thirteenth is Yara Stormwick (id 306), though its id is the lowest of the
 * eight. Wren Ashdown sits in two groups.
 */
export const ENGINE_FIFTEEN: EngineFixture = engineFixture([
  {id: '301', name: 'Wren Ashdown - Keeper of Keys', score: 10, rules: ['Shift Targets', 'Ramp']},
  {id: '302', name: 'Tobias Quill - Archivist', score: 9},
  {id: '303', name: 'Ada Brightwater - Tidecaller', score: 9, rules: ['Singer']},
  {id: '304', name: 'Pell - Tinker', score: 8},
  {id: '305', name: 'Moss - Wanderer', score: 8, rules: ['Singer']},
  {id: '306', name: 'Yara Stormwick - Captain', score: 7},
  {id: '307', name: 'Bramble - Hedge Witch', score: 7},
  {id: '308', name: 'Odette Fernsby - Seamstress', score: 7, rules: ['Shift Targets']},
  {id: '309', name: 'Kit Marlow - Pickpocket', score: 7},
  {id: '310', name: 'Ezra Vale - Cartographer', score: 7},
  {id: '311', name: 'Cinder - Ember Sprite', score: 7},
  {id: '312', name: 'Hollis Grey - Lantern Keeper', score: 7},
  {id: '313', name: 'Uma Lark - Songbird', score: 7, rules: ['Singer']},
  {id: '314', name: 'Garnet - Stonecutter', score: 5},
  {id: '315', name: 'Lumen - Glowworm', score: 3},
]);

/**
 * 142 partners, 100 of them in the Ramp group: the engine's cap, so the count
 * is a floor. The 30 strongest share a score of 8, so the 12 drawn all come
 * from that tie (R-37's example). Ramp: 30 at 8, 70 at 6; Shift Targets: 42 at 3.
 */
export const ENGINE_CAPPED: EngineFixture = engineFixture(
  Array.from({length: 142}, (_, i) => ({
    id: String(2001 + i),
    name: `Partner ${String(i + 1).padStart(3, '0')}`,
    score: i < 30 ? 8 : i < 100 ? 6 : 3,
    rules: i < 100 ? ['Ramp'] : ['Shift Targets'],
  })),
);

// ── Switcher fixtures (R3-5) ──

/**
 * A card in the shape the loader gives the app: `fullName` is "name - version"
 * (or the bare name), and the rest of what LorcanaCard requires has a plain
 * default. `seed` names the fields a test or story cares about.
 */
export function lorcanaCard(seed: Pick<LorcanaCard, 'id' | 'name'> & Partial<LorcanaCard>): LorcanaCard {
  const {name, version} = seed;
  return {
    fullName: version ? `${name} - ${version}` : name,
    cost: 3,
    ink: 'Amber',
    inkwell: true,
    type: 'Character',
    ...seed,
  };
}

/**
 * The switcher's card list. Eight cards match "mi": five from set 10 listed
 * first, then three from set 11, so newest-set-first moves set 11 to the top
 * and the sixth result cuts Madam Mim and Magic Mirror. Magic Mirror (an item)
 * has no version, Miss Bianca (a preview) no collector number, and Minnie Mouse
 * - Musketeer Champion two inks. Elsa matches nothing in "mi".
 */
export const SWITCHER_CARDS: LorcanaCard[] = [
  lorcanaCard({id: '3001', name: 'Mickey Mouse', version: 'Brave Little Tailor', setCode: '10', setNumber: 115}),
  lorcanaCard({id: '3002', name: 'Minnie Mouse', version: 'Beloved Princess', setCode: '10', setNumber: 12}),
  lorcanaCard({id: '3003', name: 'Mirabel Madrigal', version: 'Gift of the Family', setCode: '10', setNumber: 18}),
  lorcanaCard({id: '3004', name: 'Madam Mim', version: 'Fox', ink: 'Amethyst', setCode: '10', setNumber: 50}),
  lorcanaCard({id: '3005', name: 'Magic Mirror', type: 'Item', ink: 'Amethyst', setCode: '10', setNumber: 66}),
  lorcanaCard({id: '3006', name: 'Miss Bianca', version: 'Unwavering Agent', ink: 'Sapphire', setCode: '11'}),
  lorcanaCard({id: '3007', name: 'Mickey Mouse', version: 'Wayward Sorcerer', ink: 'Amethyst', setCode: '11', setNumber: 40}),
  lorcanaCard({
    id: '3008',
    name: 'Minnie Mouse',
    version: 'Musketeer Champion',
    ink2: 'Steel',
    setCode: '11',
    setNumber: 120,
  }),
  lorcanaCard({id: '3009', name: 'Elsa', version: 'Snow Queen', ink: 'Sapphire', setCode: '10', setNumber: 42}),
];
