import type {LorcanaCard} from 'inkweave-synergy-engine';
import {fmtInt} from '../../../ui/format';
import {countOf} from '../activity/activityModel';
import type {RuleStat, VoteAnalytics} from '../voteAnalyticsTypes';
import type {VoteLog} from '../voteLogTypes';
import {ANY_VOTES, filtersPairs, type VotesFilter} from '../votesFilter';
import {cardCalibration, pairsForCard, type CardCalibration, type CardPair} from './cardStats';
import {cardAnswers, cardVoteSpan, engineSilentForCard, votesForCard, votesOnPairsWith, type CardVote} from './cardVotes';

/*
 * What the card page's view reads off the two vote files, for one card (R3-6a).
 * Pure functions over cardStats.ts (pairs[]) and cardVotes.ts (the vote log),
 * so the components only draw. R3-6b's raw panels read rawVotesFor too.
 */

/** The card's share of vote analytics: its voted pairs, and the rules to name them by. */
export interface CardCalibrationData {
  cardPairs: CardPair[];
  rules: readonly RuleStat[];
}

/** Null until vote analytics loads (or after it failed). A card in no pairs[] row has no pairs. */
export function calibrationData(analytics: VoteAnalytics | null, cardId: string): CardCalibrationData | null {
  return analytics ? {cardPairs: pairsForCard(analytics.pairs, cardId), rules: analytics.rules} : null;
}

/** The calibration KPIs' numbers; null before vote analytics loads, and for a card with no voted pair. */
export function calibrationOf(data: CardCalibrationData | null): CardCalibration | null {
  return data && data.cardPairs.length > 0 ? cardCalibration(data.cardPairs) : null;
}

/**
 * What the vote log holds for the card:
 * - 'waiting': the log is loading or failed (R3-6b's panels say which);
 * - 'none': no raw votes at all, because Deploy ran without the service-role
 *   key (vote analytics says so, or the log came back empty);
 * - 'card': the card's own votes, possibly none.
 */
export type RawVotes = {kind: 'waiting'} | {kind: 'none'} | {kind: 'card'; cardVotes: CardVote[]};

export interface RawVotesInput {
  analytics: VoteAnalytics | null;
  voteLog: VoteLog | null;
  cardId: string;
}

export function rawVotesFor({analytics, voteLog, cardId}: RawVotesInput): RawVotes {
  if (analytics?.hasRawVotes === false) return {kind: 'none'};
  if (!voteLog) return {kind: 'waiting'};
  if (voteLog.votes.length === 0) return {kind: 'none'};
  return {kind: 'card', cardVotes: votesForCard(voteLog.votes, cardId)};
}

/** The card's votes in the log: none until it loads. */
export function votesOnCard(raw: RawVotes): CardVote[] {
  return raw.kind === 'card' ? raw.cardVotes : [];
}

/** The two raw KPIs' numbers (R-32): distinct voters, and the accuracy sentiment with its answer count. */
export interface RawFigures {
  votes: number;
  voters: number;
  /** (too low − too high) / answered, from −1 to +1; null with no answers. */
  sentiment: number | null;
  answered: number;
}

/** Null for a card nobody has voted on. */
export function rawFigures(cardVotes: readonly CardVote[]): RawFigures | null {
  const span = cardVoteSpan(cardVotes);
  if (!span) return null;
  const {accuracy} = cardAnswers(cardVotes);
  return {votes: span.votes, voters: span.voters, sentiment: accuracy.sentiment, answered: accuracy.answered};
}

/** What Voted pairs says in place of the engine-silent split, without raw votes to count them from. */
export const NO_RAW_SILENT_NOTE = "Engine-silent pairs aren't listed, and counting them needs raw votes.";

/** The same, in the notice for a card with no pairs[] row: it shows no list to leave them out of. */
export const NO_RAW_SILENT_COUNT = "Counting the card's engine-silent pairs needs raw votes.";

export interface SilentNoteInput {
  raw: RawVotes;
  cardPairs: readonly CardPair[];
  /** Whether the current card list holds an id: getCardById(id) !== undefined. */
  isListed: (cardId: string) => boolean;
  /**
   * The votes filter Voted pairs reads (#33), so its caption counts the
   * engine-silent pairs the step keeps, as its rows do. Default Any.
   */
  filter?: VotesFilter;
}

/**
 * "3 engine-silent pairs (voted, but the engine gives them no score)", or for
 * one, "… gives it no score"; past Any, "1 engine-silent pair with 2+ score
 * votes (…)".
 */
function silentPairs(pairs: number, filter: VotesFilter): string {
  const them = pairs === 1 ? 'it' : 'them';
  const kept = filtersPairs(filter) ? ` with ${filter.label} score votes` : '';
  return `${countOf(pairs, 'engine-silent pair')}${kept} (voted, but the engine gives ${them} no score)`;
}

/**
 * Voted pairs' caption (R-31): the card's engine-silent pairs, which pairs[]
 * leaves out, split by whether the partner is still in the current card list.
 * Most aren't: the engine covers Core only. Past Any it counts only the pairs
 * with the votes filter's step of score votes (#33). A card with no pairs[]
 * row gets the notice that replaces the panels instead, which shows no list
 * and no filter, so there it says how many the card has rather than what the
 * list leaves out. Null while the log loads or after it failed, and for a card
 * with none, as R2's scatter leaves its own caption out at zero.
 */
export function silentNote({raw, cardPairs, isListed, filter = ANY_VOTES}: SilentNoteInput): string | null {
  const listed = cardPairs.length > 0;
  if (raw.kind === 'none') return listed ? NO_RAW_SILENT_NOTE : NO_RAW_SILENT_COUNT;
  if (raw.kind === 'waiting') return null;
  const step = listed ? filter : ANY_VOTES;
  const silent = engineSilentForCard(votesOnPairsWith(raw.cardVotes, step), cardPairs, isListed);
  if (silent.pairs === 0) return null;
  return (
    `${listed ? 'Not listed:' : 'The card has'} ${silentPairs(silent.pairs, step)}: ` +
    `${fmtInt(silent.partnerUnlisted.pairs)} with a card outside the current card list, ` +
    `${fmtInt(silent.partnerListed.pairs)} with both cards in Core.`
  );
}

/** The header's facts line: "Character · cost 3 · inkable". */
export function cardFacts({type, cost, inkwell}: Pick<LorcanaCard, 'type' | 'cost' | 'inkwell'>): string {
  return `${type} · cost ${cost} · ${inkwell ? 'inkable' : 'uninkable'}`;
}
