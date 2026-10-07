import {countOf} from '../activity/activityModel';
import {biasCopy} from '../biasCopy';
import {MIN_RULE_VOTES} from '../overview/overviewStats';
import type {PairStat, RuleStat} from '../voteAnalyticsTypes';

/*
 * The calibration side of /cards (R3): one card's share of vote-analytics.json's
 * pairs[], which holds the pairs the engine scores that have at least one score
 * vote (scripts/lib/voteAnalytics.mjs:23, :62-72). Every average is weighted by
 * scoreVotes, as the precompute weights the global and per-rule ones
 * (voteWeightedMean, :46-56), so a card's numbers compare with the Overview's
 * and /calibration's. The raw-vote side is cardVotes.ts (R3-3). Nothing here
 * reorders its input.
 */

/** How many cards the "Pick a card" prompt lists under Cards to review (R-28). */
export const CARDS_TO_REVIEW = 5;

/**
 * One of a card's voted pairs, seen from the card: the pairs[] row itself, so
 * PairList and R2's PairStat helpers (pairWords, scatterPoints, gapBins) take
 * it as it is (R-52), plus the other card's id and name.
 */
export interface CardPair extends PairStat {
  partnerId: string;
  partnerName: string;
}

/** A card's calibration over its voted pairs. The averages are null when it has no score votes. */
export interface CardCalibration {
  /** How many partners the engine scores have a score vote with the card. */
  pairsVoted: number;
  scoreVotes: number;
  /** Community − engine, vote-weighted, unrounded. verdictGap gives the two-place value to judge and draw. */
  meanGap: number | null;
  engineAvg: number | null;
  communityAvg: number | null;
  /** At least MIN_RULE_VOTES score votes: enough to judge (the corrections to the spec). */
  enoughVotes: boolean;
}

/** A row of the card's rules table: a rule that scored at least one of the card's voted pairs. */
export interface CardRuleRow {
  ruleId: string;
  /** The analytics rule's name, or its id when the artifact has no such rule. */
  ruleName: string;
  /** How many of the card's voted pairs the rule scored. */
  pairs: number;
  scoreVotes: number;
  /** Vote-weighted over those pairs. Null only for pairs with no score vote, which pairs[] never holds. */
  meanGap: number | null;
  /** Under MIN_RULE_VOTES score votes: R2's "low n" chip, and the row sorts after the others (R-35). */
  lowN: boolean;
}

/** A row of Cards to review: a card with enough score votes to judge, and its calibration. */
export interface CardToReview extends CardCalibration {
  cardId: string;
  /** The card's name as pairs[] has it (aName or bName). */
  cardName: string;
}

/** A pair from one of its cards' sides. */
interface CardSide {
  cardId: string;
  cardName: string;
  pair: CardPair;
}

/** A rule and the card's voted pairs it scored. */
interface RuleGroup {
  ruleId: string;
  pairs: CardPair[];
}

/** A card in pairs[], with its name and its voted pairs. */
interface CardGroup {
  cardId: string;
  cardName: string;
  pairs: CardPair[];
}

/** A pair seen from each of its two cards. */
function sidesOf(p: PairStat): CardSide[] {
  return [
    {cardId: p.a, cardName: p.aName, pair: {...p, partnerId: p.b, partnerName: p.bName}},
    {cardId: p.b, cardName: p.bName, pair: {...p, partnerId: p.a, partnerName: p.aName}},
  ];
}

/** The score votes behind some pairs. */
function scoreVotesOf(pairs: readonly PairStat[]): number {
  return pairs.reduce((n, p) => n + p.scoreVotes, 0);
}

/** The mean of `value` over `pairs`, weighted by score votes, as voteWeightedMean is; null at zero weight. */
function voteWeighted(pairs: readonly PairStat[], value: (p: PairStat) => number): number | null {
  let sum = 0;
  let weight = 0;
  for (const p of pairs) {
    sum += value(p) * p.scoreVotes;
    weight += p.scoreVotes;
  }
  return weight === 0 ? null : sum / weight;
}

/** Widest |gap| first, then more score votes, then the partner's name. */
function byPairRank(x: CardPair, y: CardPair): number {
  return (
    Math.abs(y.gap) - Math.abs(x.gap) ||
    y.scoreVotes - x.scoreVotes ||
    x.partnerName.localeCompare(y.partnerName)
  );
}

/**
 * The card's voted pairs, each with its partner: widest |gap| first, then more
 * score votes, then the partner's name. The card may sit on either side of a
 * pair. Empty for a card in no pairs[] row.
 */
export function pairsForCard(pairs: readonly PairStat[], cardId: string): CardPair[] {
  return pairs
    .flatMap(sidesOf)
    .filter((side) => side.cardId === cardId)
    .map((side) => side.pair)
    .sort(byPairRank);
}

/**
 * A card's calibration over its voted pairs (pairsForCard). The averages are
 * vote-weighted and unrounded, so communityAvg − engineAvg equals meanGap to
 * float precision while engine scores are whole numbers.
 */
export function cardCalibration(cardPairs: readonly CardPair[]): CardCalibration {
  const scoreVotes = scoreVotesOf(cardPairs);
  return {
    pairsVoted: cardPairs.length,
    scoreVotes,
    meanGap: voteWeighted(cardPairs, (p) => p.gap),
    engineAvg: voteWeighted(cardPairs, (p) => p.engineScore),
    communityAvg: voteWeighted(cardPairs, (p) => p.communityScore),
    enoughVotes: scoreVotes >= MIN_RULE_VOTES,
  };
}

/** A gap to two places, as fmtGap prints it: −0.4996 is −0.5. */
function asPrinted(gap: number): number {
  return Math.sign(gap) * Number(Math.abs(gap).toFixed(2));
}

/**
 * The gap the card's verdict reads: its mean gap to two places once it has
 * MIN_RULE_VOTES score votes, else null ("not enough data"). R3-6 passes it to
 * verdictFor and GapScale, so the verdict, the scale's dot and the printed gap
 * agree: unrounded, a −0.4996 would read "well-calibrated" (|gap| < 0.5)
 * beside a printed −0.50.
 */
export function verdictGap(cal: CardCalibration): number | null {
  return cal.enoughVotes && cal.meanGap != null ? asPrinted(cal.meanGap) : null;
}

/** The read line of a judged card: which way the engine leans from ±0.25 (biasCopy's band), or close. */
function leanLine(gap: number): string {
  const {direction} = biasCopy(gap);
  if (direction === 'neutral') return 'Its pairs score close to what the community says.';
  const way = direction === 'over' ? 'higher' : 'lower';
  return `The engine rates this card's pairs about ${Math.abs(gap).toFixed(2)} points ${way} than the community.`;
}

/**
 * The plain-English line under the card's verdict. The two lean lines are the
 * prototype's (dc.html:949), read off verdictGap, so they match the printed
 * gap. The two count lines are the plan's own.
 */
export function cardReadLine(cal: CardCalibration): string {
  const gap = verdictGap(cal);
  if (gap != null) return leanLine(gap);
  if (cal.scoreVotes === 0) return 'No score votes on pairs the engine scores yet.';
  const votes = countOf(cal.scoreVotes, 'score vote');
  return `Only ${votes} on pairs the engine scores. The verdict needs ${MIN_RULE_VOTES}.`;
}

/**
 * The card's voted pairs under each rule that scored them. A pair counts toward
 * every rule in its `rules`, as rollUpByRule credits it, so a card's rows add up
 * the way the global ones do.
 */
function groupByRule(cardPairs: readonly CardPair[]): RuleGroup[] {
  const groups = new Map<string, CardPair[]>();
  for (const p of cardPairs) {
    for (const ruleId of p.rules) groups.set(ruleId, [...(groups.get(ruleId) ?? []), p]);
  }
  return Array.from(groups, ([ruleId, pairs]) => ({ruleId, pairs}));
}

/** One rules-table row. `names` maps a rule id to the analytics rule's name. */
function ruleRow(group: RuleGroup, names: ReadonlyMap<string, string>): CardRuleRow {
  const scoreVotes = scoreVotesOf(group.pairs);
  return {
    ruleId: group.ruleId,
    ruleName: names.get(group.ruleId) ?? group.ruleId,
    pairs: group.pairs.length,
    scoreVotes,
    meanGap: voteWeighted(group.pairs, (p) => p.gap),
    lowN: scoreVotes < MIN_RULE_VOTES,
  };
}

/** Rows with enough votes first; within each group the widest |gap|, then more score votes, then the name (R-35). */
function byRuleRank(x: CardRuleRow, y: CardRuleRow): number {
  return (
    Number(x.lowN) - Number(y.lowN) ||
    Math.abs(y.meanGap ?? 0) - Math.abs(x.meanGap ?? 0) ||
    y.scoreVotes - x.scoreVotes ||
    x.ruleName.localeCompare(y.ruleName)
  );
}

/**
 * The card's rules table: one row per rule that scored any of its voted pairs
 * (pairsForCard), named from the analytics rules, "low n" rows last (R-35).
 */
export function rulesForCard(cardPairs: readonly CardPair[], rules: readonly RuleStat[]): CardRuleRow[] {
  const names = new Map(rules.map((r) => [r.ruleId, r.ruleName]));
  return groupByRule(cardPairs)
    .map((group) => ruleRow(group, names))
    .sort(byRuleRank);
}

/** Every card in pairs[], with its voted pairs. A pair counts toward both its cards. */
function groupByCard(pairs: readonly PairStat[]): CardGroup[] {
  const groups = new Map<string, CardGroup>();
  for (const side of pairs.flatMap(sidesOf)) {
    const group = groups.get(side.cardId) ?? {cardId: side.cardId, cardName: side.cardName, pairs: []};
    group.pairs.push(side.pair);
    groups.set(side.cardId, group);
  }
  // Each card's pairs in pairsForCard's order, so its sums run in the same order and match the card page to the last bit.
  return [...groups.values()].map((group) => ({...group, pairs: group.pairs.sort(byPairRank)}));
}

/** Widest |mean gap| first, then more score votes, then the card's name. */
function byCardRank(x: CardToReview, y: CardToReview): number {
  return (
    Math.abs(y.meanGap ?? 0) - Math.abs(x.meanGap ?? 0) ||
    y.scoreVotes - x.scoreVotes ||
    x.cardName.localeCompare(y.cardName)
  );
}

/**
 * Cards to review, under the "Pick a card" prompt (R-28): the CARDS_TO_REVIEW
 * cards with at least MIN_RULE_VOTES score votes, widest |mean gap| first, then
 * more score votes, then name. It reads like the Overview's Rules to review
 * (rulesToReview). A card under the threshold never makes the list, however
 * wide its gap.
 */
export function cardsToReview(pairs: readonly PairStat[]): CardToReview[] {
  return groupByCard(pairs)
    .map(({cardId, cardName, pairs: cardPairs}) => ({cardId, cardName, ...cardCalibration(cardPairs)}))
    .filter((card) => card.enoughVotes)
    .sort(byCardRank)
    .slice(0, CARDS_TO_REVIEW);
}
