import type {Day} from '../../../charts/scale';
import {activityWindow, weeklyStacks, type VoteSpan} from '../activity/activityModel';
import type {VoteLogRow} from '../voteLogTypes';
import type {CardPair} from './cardStats';

/*
 * The card page's raw-vote side (R3-3): what /cards reads from vote-log.json
 * for one card. votesForCard binds the card once, and every other function
 * takes the CardVote[] it returns, so none of them is passed the card again.
 * Pure functions, and none of them reorders its input.
 *
 * Every number here comes from raw votes, with plain means: quick votes (no
 * score) stay out of the histogram and its mean, and count everywhere else.
 * The calibration side (cardStats.ts, R3-2) comes from pairs[] instead.
 */

/** A raw vote on the card: the log's row, the side of it the card is on, and the card on the other side. */
export interface CardVote {
  vote: VoteLogRow;
  /** buildVoteLog puts the lower id in `a`, so the side says nothing about the vote itself. */
  side: 'a' | 'b';
  partnerId: string;
}

/** The votes on `cardId`, from either side of the row, in log order. */
export function votesForCard(votes: readonly VoteLogRow[], cardId: string): CardVote[] {
  return votes.flatMap((vote): CardVote[] => {
    if (vote.a === cardId) return [{vote, side: 'a', partnerId: vote.b}];
    return vote.b === cardId ? [{vote, side: 'b', partnerId: vote.a}] : [];
  });
}

/** part / whole; null when whole is 0. */
function ratio({part, whole}: {part: number; whole: number}): number | null {
  return whole > 0 ? part / whole : null;
}

/** How many of the card's votes pass `test`. */
function count(cardVotes: readonly CardVote[], test: (cardVote: CardVote) => boolean): number {
  return cardVotes.filter(test).length;
}

/** How many of the card's votes give each of `answers`, in the same order. */
function tally<T>(
  cardVotes: readonly CardVote[],
  read: (vote: VoteLogRow) => T | null,
  answers: readonly T[],
): number[] {
  return answers.map((answer) => count(cardVotes, (cardVote) => read(cardVote.vote) === answer));
}

/** Engine-silent pairs, and the scored votes on them. */
export interface SilentCount {
  pairs: number;
  votes: number;
}

/**
 * The card's engine-silent pairs (R-31): partners it has a scored vote with
 * and no pairs[] row, which holds only the pairs the engine scores. `votes`
 * counts their scored votes only, so the histogram's scored votes are
 * cardCalibration's scoreVotes plus these, exactly. The two parts split the
 * pairs by whether the partner is in the current card list; /cards shows only
 * a card the list resolves, so a listed partner means both cards are in Core.
 */
export interface EngineSilent extends SilentCount {
  /** The partner isn't in the card list: rotated out of Core, or a preview id its release replaced (R-29). */
  partnerUnlisted: SilentCount;
  /** The partner is in the card list too, and the engine still scores the pair nothing. */
  partnerListed: SilentCount;
}

function silentCount(silent: readonly CardVote[]): SilentCount {
  return {pairs: new Set(silent.map((cardVote) => cardVote.partnerId)).size, votes: silent.length};
}

/**
 * The scored votes on pairs missing from `cardPairs` (pairsForCard over
 * pairs[], R3-2), split by `isListed`, the card list's lookup:
 * `(id) => getCardById(id) !== undefined`. A pair with only quick votes isn't
 * in pairs[] either, and doesn't count: it has no score to compare.
 */
export function engineSilentForCard(
  cardVotes: readonly CardVote[],
  cardPairs: readonly CardPair[],
  isListed: (cardId: string) => boolean,
): EngineSilent {
  const scoredByEngine = new Set(cardPairs.map((pair) => pair.partnerId));
  const silent = cardVotes.filter((cardVote) => cardVote.vote.score != null && !scoredByEngine.has(cardVote.partnerId));
  return {
    ...silentCount(silent),
    partnerUnlisted: silentCount(silent.filter((cardVote) => !isListed(cardVote.partnerId))),
    partnerListed: silentCount(silent.filter((cardVote) => isListed(cardVote.partnerId))),
  };
}

const SCORES = 10;

export interface ScoreHistogram {
  /** counts[i]: the votes that scored i + 1. Always ten entries, for scores 1 to 10. */
  counts: number[];
  scored: number;
  /** Quick votes: no score, so out of `counts` and the mean. */
  unscored: number;
  /** The plain mean of the scored votes; null with none. */
  mean: number | null;
}

/**
 * The card's scores, 1 to 10, from every raw vote on it: the pairs the engine
 * scores and the engine-silent ones alike. Scores are whole numbers from 1 to
 * 10, as the votes table's check holds them.
 */
export function scoreHistogram(cardVotes: readonly CardVote[]): ScoreHistogram {
  const counts = Array.from({length: SCORES}, () => 0);
  let sum = 0;
  for (const {vote} of cardVotes) {
    if (vote.score == null) continue;
    counts[vote.score - 1] += 1;
    sum += vote.score;
  }
  const scored = counts.reduce((total, n) => total + n, 0);
  return {counts, scored, unscored: cardVotes.length - scored, mean: ratio({part: sum, whole: scored})};
}

/**
 * A yes/no question's answers. `share` is yes / answered, from 0 to 1 (R3-6b
 * prints it with sharePercent); null when no vote answered.
 */
export interface Rate {
  yes: number;
  answered: number;
  share: number | null;
}

/** "Is the engine's score right?": −1 "Should be lower", 0 "Score is fair", +1 "Should be higher". */
export interface AccuracyAnswers {
  tooHigh: number;
  right: number;
  tooLow: number;
  answered: number;
  /**
   * The share of "too low" minus the share of "too high", from −1 to +1, null
   * when none answered (R-32). It is the mean answer, the definition the
   * view's per-pair accuracy_sentiment uses, taken over the card's raw votes.
   */
  sentiment: number | null;
}

/** "Who carries the pair?": 'a' and 'b' name the card on that side of the row. */
export interface CarryShare {
  /** The votes that named this card. */
  named: number;
  /** The votes that named one card, either one: the share's denominator. */
  singled: number;
  /** named / singled, from 0 to 1; null when no vote named one card. */
  share: number | null;
  /** 'both' (the form's default) and 'neither' stay out of the share. */
  both: number;
  neither: number;
}

/** "How hard is it to pull off?": 1 Easy, 2 Situational, 3 Hard. */
export interface DifficultyAnswers {
  easy: number;
  situational: number;
  hard: number;
  answered: number;
  /** The mean level, from 1 to 3; null when none answered. */
  mean: number | null;
}

export interface CardAnswers {
  accuracy: AccuracyAnswers;
  isReal: Rate;
  wouldPlay: Rate;
  carry: CarryShare;
  difficulty: DifficultyAnswers;
}

function accuracyAnswers(cardVotes: readonly CardVote[]): AccuracyAnswers {
  const [tooHigh, right, tooLow] = tally(cardVotes, (vote) => vote.accuracy, [-1, 0, 1]);
  const answered = tooHigh + right + tooLow;
  return {tooHigh, right, tooLow, answered, sentiment: ratio({part: tooLow - tooHigh, whole: answered})};
}

function rateOf(cardVotes: readonly CardVote[], answer: (vote: VoteLogRow) => boolean | null): Rate {
  const yes = count(cardVotes, (cardVote) => answer(cardVote.vote) === true);
  const answered = count(cardVotes, (cardVote) => answer(cardVote.vote) != null);
  return {yes, answered, share: ratio({part: yes, whole: answered})};
}

function carryShare(cardVotes: readonly CardVote[]): CarryShare {
  const named = count(cardVotes, (cardVote) => cardVote.vote.whoCarries === cardVote.side);
  const [a, b, both, neither] = tally(cardVotes, (vote) => vote.whoCarries, ['a', 'b', 'both', 'neither']);
  return {named, singled: a + b, share: ratio({part: named, whole: a + b}), both, neither};
}

function difficultyAnswers(cardVotes: readonly CardVote[]): DifficultyAnswers {
  const [easy, situational, hard] = tally(cardVotes, (vote) => vote.difficulty, [1, 2, 3]);
  const answered = easy + situational + hard;
  const levels = easy + 2 * situational + 3 * hard;
  return {easy, situational, hard, answered, mean: ratio({part: levels, whole: answered})};
}

/** How voters answered the in-depth questions on the card's pairs. Each counts only the votes that answered it. */
export function cardAnswers(cardVotes: readonly CardVote[]): CardAnswers {
  return {
    accuracy: accuracyAnswers(cardVotes),
    isReal: rateOf(cardVotes, (vote) => vote.isReal),
    wouldPlay: rateOf(cardVotes, (vote) => vote.wouldPlay),
    carry: carryShare(cardVotes),
    difficulty: difficultyAnswers(cardVotes),
  };
}

/** One week of the card's votes: its UTC Monday, and every vote that week, quick votes included. */
export interface WeekCount {
  week: Day;
  votes: number;
}

/**
 * The card's votes per Monday week (UTC) across `logSpan`, oldest first, a
 * quiet week as 0 (R-36). Pass the whole log's span,
 * `activityWindow(voteLog.votes, 'all')`, not the card's: every card then
 * shares the log's weeks, as /calibration's weekly gap does, and a card nobody
 * has voted on lately ends in quiet weeks. The span's first and last weeks can
 * be part weeks; R3-6b names them with bucketTitle and partialWeeks.
 */
export function votesPerWeek(cardVotes: readonly CardVote[], logSpan: VoteSpan): WeekCount[] {
  const rows = cardVotes.map((cardVote) => cardVote.vote);
  return weeklyStacks(rows, logSpan.startDay, logSpan.endDay).map((stack) => ({week: stack.day, votes: stack.total}));
}

/** The card's raw votes, its distinct voters, and the days of its first and last vote. */
export interface CardVoteSpan {
  votes: number;
  voters: number;
  /** UTC 'YYYY-MM-DD' days, ready for fmtDay. */
  days: VoteSpan;
}

/** Null when nobody has voted on the card. */
export function cardVoteSpan(cardVotes: readonly CardVote[]): CardVoteSpan | null {
  const rows = cardVotes.map((cardVote) => cardVote.vote);
  const days = activityWindow(rows, 'all');
  if (days == null) return null;
  return {votes: rows.length, voters: new Set(rows.map((vote) => vote.voter)).size, days};
}
