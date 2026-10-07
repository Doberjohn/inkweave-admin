import {describe, expect, it} from 'vitest';
import {activityWindow} from '../../activity/activityModel';
import type {VoteLogRow} from '../../voteLogTypes';
import {UNLISTED_IDS, VOTED_CARD, VOTED_CARD_LOG, VOTED_CARD_PAIRS, voteRow} from '../cardFixtures';
import {cardCalibration, pairsForCard} from '../cardStats';
import {
  cardAnswers,
  cardVoteSpan,
  engineSilentForCard,
  scoreHistogram,
  votesForCard,
  votesPerWeek,
  type CardVote,
} from '../cardVotes';

const CARD_VOTES = votesForCard(VOTED_CARD_LOG, VOTED_CARD);
const CARD_PAIRS = pairsForCard(VOTED_CARD_PAIRS, VOTED_CARD);
/** The card list's lookup: every fixture id but UNLISTED_IDS. */
const isListed: (cardId: string) => boolean = (cardId) => !UNLISTED_IDS.has(cardId);

/** Card 500's votes from rows on 500 × 640 (the card on side a), one voter each, with these answers. */
function answered(answers: ReadonlyArray<Partial<VoteLogRow>>): CardVote[] {
  const rows = answers.map((answer, i) =>
    voteRow({a: VOTED_CARD, b: '640', ts: '2026-09-14T10:00:00.123456+00:00', voter: i + 1, ...answer}),
  );
  return votesForCard(rows, VOTED_CARD);
}

describe('votesForCard', () => {
  it("binds each of the card's votes to the card's side and its partner, whichever side the card is on", () => {
    expect(CARD_VOTES.map((cv) => [cv.side, cv.partnerId])).toEqual([
      ['b', '120'],
      ['b', '120'],
      ['a', '640'],
      ['a', '640'],
      ['a', '640'],
      ['a', '710'],
      ['a', '710'],
      ['a', '710'],
      ['b', '305'],
      ['a', '880'],
      ['a', '880'],
    ]);
  });

  it('keeps the log rows themselves, in log order, and leaves out votes on other cards', () => {
    expect(CARD_VOTES.map((cv) => cv.vote)).toEqual(VOTED_CARD_LOG.slice(1, -1));
    expect(CARD_VOTES[0].vote).toBe(VOTED_CARD_LOG[1]);
    expect(votesForCard(VOTED_CARD_LOG, '999')).toEqual([]);
  });
});

describe('scoreHistogram', () => {
  it('counts each score from 1 to 10 and leaves quick votes out of the counts and the mean', () => {
    expect(scoreHistogram(CARD_VOTES)).toEqual({
      counts: [0, 0, 1, 1, 1, 1, 1, 1, 1, 0],
      scored: 7,
      unscored: 4,
      // The plain mean of 7, 5, 9, 8, 3, 4 and 6, engine-silent pairs included.
      mean: 6,
    });
  });

  it('has ten empty buckets and no mean when no vote has a score', () => {
    expect(scoreHistogram(answered([{score: null}, {score: null}]))).toEqual({
      counts: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      scored: 0,
      unscored: 2,
      mean: null,
    });
    expect(scoreHistogram([]).mean).toBeNull();
  });

  it('puts 1 in the first bucket and 10 in the last', () => {
    const {counts} = scoreHistogram(answered([{score: 1}, {score: 10}, {score: 10}]));
    expect(counts).toEqual([1, 0, 0, 0, 0, 0, 0, 0, 0, 2]);
  });
});

describe('engineSilentForCard', () => {
  it('counts scored votes on pairs missing from pairs[], split by whether the partner is listed (R-31)', () => {
    expect(engineSilentForCard(CARD_VOTES, CARD_PAIRS, isListed)).toEqual({
      pairs: 2,
      votes: 3,
      partnerUnlisted: {pairs: 1, votes: 1},
      // 710's quick vote has no score, so it isn't one of these.
      partnerListed: {pairs: 1, votes: 2},
    });
  });

  it('leaves out a pair with only quick votes, and a pair the engine scores', () => {
    const quickOnly = CARD_VOTES.filter((cv) => cv.partnerId === '880');
    expect(engineSilentForCard(quickOnly, CARD_PAIRS, isListed).votes).toBe(0);
    const scoredByEngine = CARD_VOTES.filter((cv) => cv.partnerId === '120' || cv.partnerId === '640');
    expect(engineSilentForCard(scoredByEngine, CARD_PAIRS, isListed).pairs).toBe(0);
  });

  it("holds the histogram check: the card's scored votes are its pairs[] votes plus its engine-silent ones", () => {
    const silent = engineSilentForCard(CARD_VOTES, CARD_PAIRS, isListed);
    expect(scoreHistogram(CARD_VOTES).scored).toBe(cardCalibration(CARD_PAIRS).scoreVotes + silent.votes);
  });
});

describe('cardAnswers', () => {
  it('reads every question from the votes that answered it', () => {
    expect(cardAnswers(CARD_VOTES)).toEqual({
      accuracy: {tooHigh: 2, right: 1, tooLow: 1, answered: 4, sentiment: -0.25},
      isReal: {yes: 2, answered: 3, share: 2 / 3},
      wouldPlay: {yes: 2, answered: 3, share: 2 / 3},
      carry: {named: 2, singled: 4, share: 0.5, both: 5, neither: 1},
      difficulty: {easy: 2, situational: 1, hard: 1, answered: 4, mean: 1.75},
    });
  });

  it.each<[VoteLogRow['accuracy'], 'tooHigh' | 'right' | 'tooLow']>([
    [-1, 'tooHigh'],
    [0, 'right'],
    [1, 'tooLow'],
  ])('counts an accuracy answer of %s as %s, and ignores no answer', (accuracy, key) => {
    const {accuracy: answers} = cardAnswers(answered([{accuracy}, {accuracy: null}]));
    expect(answers[key]).toBe(1);
    expect(answers.tooHigh + answers.right + answers.tooLow).toBe(1);
    expect(answers.answered).toBe(1);
  });

  it.each<[Array<VoteLogRow['accuracy']>, number | null]>([
    [[1, 1, -1], 1 / 3],
    [[-1, null], -1],
    [[0, 0], 0],
    [[null], null],
  ])('reads accuracy answers %j as a sentiment of %s: the mean answer (R-32)', (accuracies, sentiment) => {
    expect(cardAnswers(answered(accuracies.map((accuracy) => ({accuracy})))).accuracy.sentiment).toBe(sentiment);
  });

  it.each<['a' | 'b', VoteLogRow['whoCarries'], {named: number; singled: number; both: number; neither: number}]>([
    ['a', 'a', {named: 1, singled: 1, both: 0, neither: 0}],
    ['a', 'b', {named: 0, singled: 1, both: 0, neither: 0}],
    ['b', 'b', {named: 1, singled: 1, both: 0, neither: 0}],
    ['b', 'a', {named: 0, singled: 1, both: 0, neither: 0}],
    ['a', 'both', {named: 0, singled: 0, both: 1, neither: 0}],
    ['b', 'neither', {named: 0, singled: 0, both: 0, neither: 1}],
    ['a', null, {named: 0, singled: 0, both: 0, neither: 0}],
  ])("with the card on side %s, reads whoCarries %s by the row's own sides", (side, whoCarries, counts) => {
    const pair = side === 'a' ? {a: VOTED_CARD, b: '640'} : {a: '120', b: VOTED_CARD};
    const row = voteRow({...pair, ts: '2026-09-14T10:00:00.123456+00:00', whoCarries});
    const {carry} = cardAnswers(votesForCard([row], VOTED_CARD));
    // One vote, so a share is 1 or 0, and none when it named no single card.
    expect(carry).toEqual({...counts, share: counts.singled > 0 ? counts.named : null});
  });

  it('gives each rate its own denominator, and no share where nobody answered', () => {
    const answers = cardAnswers(answered([{isReal: true}, {isReal: false, wouldPlay: true}, {isReal: true}]));
    expect(answers.isReal).toEqual({yes: 2, answered: 3, share: 2 / 3});
    expect(answers.wouldPlay).toEqual({yes: 1, answered: 1, share: 1});
    expect(cardAnswers(answered([{score: 7}])).isReal).toEqual({yes: 0, answered: 0, share: null});
  });

  it.each<[VoteLogRow['difficulty'], 'easy' | 'situational' | 'hard']>([
    [1, 'easy'],
    [2, 'situational'],
    [3, 'hard'],
  ])('counts a difficulty of %s as %s', (difficulty, key) => {
    const answers = cardAnswers(answered([{difficulty}, {difficulty: null}])).difficulty;
    expect(answers[key]).toBe(1);
    expect(answers.answered).toBe(1);
    expect(answers.mean).toBe(difficulty);
  });

  it('averages the difficulty levels, and has no mean when nobody answered', () => {
    const levels: Array<VoteLogRow['difficulty']> = [1, 2, 3, 3];
    expect(cardAnswers(answered(levels.map((difficulty) => ({difficulty})))).difficulty.mean).toBe(2.25);
    expect(cardAnswers(answered([{difficulty: null}])).difficulty.mean).toBeNull();
  });
});

describe('votesPerWeek', () => {
  // activityWindow(voteLog.votes, 'all'), as R3-6b passes it: the whole log, not the card's votes.
  const LOG_SPAN = {startDay: '2026-08-31', endDay: '2026-10-06'};

  it("covers the whole log's weeks from Monday, quiet ones as 0, and counts quick votes (R-36)", () => {
    expect(activityWindow(VOTED_CARD_LOG, 'all')).toEqual(LOG_SPAN);
    expect(votesPerWeek(CARD_VOTES, LOG_SPAN).map((w) => [w.week, w.votes])).toEqual([
      // The log's first week: its only vote isn't on the card.
      ['2026-08-31', 0],
      // Tuesday Sep 8, and Sunday Sep 13 late in the evening (UTC).
      ['2026-09-07', 2],
      ['2026-09-14', 3],
      ['2026-09-21', 6],
      ['2026-09-28', 0],
      // The log's part week, Oct 5 to 6: the card has no vote in it.
      ['2026-10-05', 0],
    ]);
  });

  it("adds up to the card's votes and doesn't depend on the log's order", () => {
    const weeks = votesPerWeek(CARD_VOTES, LOG_SPAN);
    expect(weeks.reduce((n, w) => n + w.votes, 0)).toBe(CARD_VOTES.length);
    const newestFirst = votesForCard([...VOTED_CARD_LOG].reverse(), VOTED_CARD);
    expect(votesPerWeek(newestFirst, LOG_SPAN)).toEqual(weeks);
  });

  it('leaves out votes outside the span it is given', () => {
    const threeDays = {startDay: '2026-09-21', endDay: '2026-09-23'};
    expect(votesPerWeek(CARD_VOTES, threeDays)).toEqual([{week: '2026-09-21', votes: 3}]);
  });
});

describe('cardVoteSpan', () => {
  it("gives the card's raw votes, distinct voters, and first and last vote days", () => {
    expect(cardVoteSpan(CARD_VOTES)).toEqual({
      votes: 11,
      voters: 8,
      days: {startDay: '2026-09-08', endDay: '2026-09-26'},
    });
  });

  it('is null for a card nobody has voted on', () => {
    expect(cardVoteSpan([])).toBeNull();
  });
});
