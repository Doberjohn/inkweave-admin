import {describe, expect, it} from 'vitest';
import {fmtGap} from '../../../../ui/format';
import {MIN_RULE_VOTES} from '../../overview/overviewStats';
import {verdictFor} from '../../verdict';
import type {PairStat} from '../../voteAnalyticsTypes';
import {CARD_ID, CARD_NAME, CARD_PAIRS, CARD_RULES, pairStat, REVIEW_PAIRS} from '../cardFixtures';
import {
  type CardPair,
  cardCalibration,
  cardReadLine,
  cardsToReview,
  CARDS_TO_REVIEW,
  pairsForCard,
  rulesForCard,
  verdictGap,
} from '../cardStats';

/** A test pair of CARD_ID's: its gap (community − engine), score votes (default MIN_RULE_VOTES) and partner. */
interface GapSeed {
  gap: number;
  scoreVotes?: number;
  partner?: string;
}

/** One of CARD_ID's pairs, at an engine score of 5. */
function gapPair({gap, scoreVotes = MIN_RULE_VOTES, partner = '2001'}: GapSeed): PairStat {
  return pairStat({a: CARD_ID, b: partner, engineScore: 5, communityScore: 5 + gap, scoreVotes});
}

/** CARD_ID's calibration over these pairs. */
function calibrate(pairs: readonly PairStat[]) {
  return cardCalibration(pairsForCard(pairs, CARD_ID));
}

const MAUI = pairsForCard(CARD_PAIRS, CARD_ID);

describe('pairsForCard', () => {
  it('finds the card on either side, and takes each partner from the other', () => {
    expect(MAUI.map((p) => [p.partnerId, p.partnerName])).toEqual([
      ['1012', 'Moana - Of Motunui'],
      ['1187', 'Pua - Potbellied Buddy'],
      ['1033', 'Tamatoa - So Shiny!'],
      ['1102', 'Heihei - Boat Snack'],
      ['2001', 'Gramma Tala - Storyteller'],
    ]);
  });

  it('keeps the pairs[] row whole, so a CardPair is a PairStat (R-52)', () => {
    const moana: PairStat = MAUI[0];
    expect(moana).toEqual({...CARD_PAIRS[0], partnerId: '1012', partnerName: 'Moana - Of Motunui'});
  });

  it("leaves out other cards' pairs, and finds none for a card in no pair", () => {
    expect(MAUI.every((p) => p.a === CARD_ID || p.b === CARD_ID)).toBe(true);
    expect(pairsForCard(CARD_PAIRS, '9999')).toEqual([]);
  });

  it('orders the widest |gap| first, then more score votes, then the partner name', () => {
    const pairs = [
      gapPair({gap: 1, scoreVotes: 2, partner: '2001'}),
      gapPair({gap: -1, scoreVotes: 5, partner: '2002'}),
      gapPair({gap: 3, scoreVotes: 1, partner: '2003'}),
      pairStat({a: CARD_ID, b: '2004', bName: 'Aladdin', engineScore: 5, communityScore: 6, scoreVotes: 2}),
    ];
    expect(pairsForCard(pairs, CARD_ID).map((p) => p.partnerName)).toEqual([
      'Card 2003',
      'Card 2002',
      'Aladdin',
      'Card 2001',
    ]);
  });

  it('leaves its input in its order: sorting a frozen array in place would throw', () => {
    expect(() => pairsForCard(Object.freeze([...CARD_PAIRS]), CARD_ID)).not.toThrow();
  });
});

describe('cardCalibration', () => {
  it("weights every average by score votes: Maui's 14 votes", () => {
    expect(cardCalibration(MAUI)).toEqual({
      pairsVoted: 5,
      scoreVotes: 14,
      meanGap: -1,
      engineAvg: 7.5,
      communityAvg: 6.5,
      enoughVotes: true,
    });
  });

  it('gives −0.5 for gaps of −1 on 3 votes and +1 on 1 vote', () => {
    const cal = calibrate([
      gapPair({gap: -1, scoreVotes: 3, partner: '2001'}),
      gapPair({gap: 1, scoreVotes: 1, partner: '2002'}),
    ]);
    expect(cal.meanGap).toBe(-0.5);
  });

  it('keeps community − engine equal to the mean gap, to float precision', () => {
    const cal = calibrate([
      pairStat({a: CARD_ID, b: '2001', engineScore: 5, communityScore: 6.1, scoreVotes: 3}),
      pairStat({a: CARD_ID, b: '2002', engineScore: 7, communityScore: 5.33, scoreVotes: 2}),
      pairStat({a: CARD_ID, b: '2003', engineScore: 3, communityScore: 4.67, scoreVotes: 1}),
    ]);
    expect(cal.communityAvg! - cal.engineAvg!).toBeCloseTo(cal.meanGap!, 10);
  });

  it('gives no averages for a card with no voted pairs', () => {
    expect(cardCalibration([])).toEqual({
      pairsVoted: 0,
      scoreVotes: 0,
      meanGap: null,
      engineAvg: null,
      communityAvg: null,
      enoughVotes: false,
    });
  });

  it.each([
    [MIN_RULE_VOTES - 1, false],
    [MIN_RULE_VOTES, true],
  ])('judges a card on %i score votes: %s', (scoreVotes, enough) => {
    expect(calibrate([gapPair({gap: -2, scoreVotes})]).enoughVotes).toBe(enough);
  });
});

describe('verdictGap', () => {
  it('gives the mean gap to two places, as fmtGap prints it', () => {
    const cal = calibrate([gapPair({gap: -0.4996})]);
    expect(verdictGap(cal)).toBe(-0.5);
    expect(fmtGap(verdictGap(cal))).toBe('−0.50');
  });

  it('so the verdict agrees with the printed gap', () => {
    const cal = calibrate([gapPair({gap: -0.4996})]);
    expect(verdictFor(cal.meanGap).word).toBe('well-calibrated');
    expect(verdictFor(verdictGap(cal)).word).toBe('runs generous');
  });

  it('is null under MIN_RULE_VOTES score votes, and with none', () => {
    expect(verdictGap(calibrate([gapPair({gap: -2, scoreVotes: MIN_RULE_VOTES - 1})]))).toBeNull();
    expect(verdictGap(cardCalibration([]))).toBeNull();
  });
});

describe('cardReadLine', () => {
  it.each<[string, readonly PairStat[], string]>([
    ['no score votes', [], 'No score votes on pairs the engine scores yet.'],
    [
      '1 score vote',
      [gapPair({gap: -2, scoreVotes: 1})],
      'Only 1 score vote on pairs the engine scores. The verdict needs 10.',
    ],
    [
      '4 score votes',
      [gapPair({gap: -2, scoreVotes: 4})],
      'Only 4 score votes on pairs the engine scores. The verdict needs 10.',
    ],
    [
      'a gap of −0.3',
      [gapPair({gap: -0.3})],
      "The engine rates this card's pairs about 0.30 points higher than the community.",
    ],
    [
      'a gap of +0.83',
      [gapPair({gap: 0.83})],
      "The engine rates this card's pairs about 0.83 points lower than the community.",
    ],
    [
      'a gap of −0.25',
      [gapPair({gap: -0.25})],
      "The engine rates this card's pairs about 0.25 points higher than the community.",
    ],
    [
      'a gap of +0.25',
      [gapPair({gap: 0.25})],
      "The engine rates this card's pairs about 0.25 points lower than the community.",
    ],
    [
      'a gap of −0.2496, printed −0.25',
      [gapPair({gap: -0.2496})],
      "The engine rates this card's pairs about 0.25 points higher than the community.",
    ],
    ['a gap of −0.24', [gapPair({gap: -0.24})], 'Its pairs score close to what the community says.'],
    ['a gap of +0.24', [gapPair({gap: 0.24})], 'Its pairs score close to what the community says.'],
  ])('reads %s', (_, pairs, line) => {
    expect(cardReadLine(calibrate(pairs))).toBe(line);
  });
});

describe('rulesForCard', () => {
  const rows = rulesForCard(MAUI, CARD_RULES);

  it('counts a pair toward every rule that scored it, low n last (R-35)', () => {
    expect(rows).toEqual([
      {ruleId: 'ramp', ruleName: 'Ramp', pairs: 3, scoreVotes: 12, meanGap: -14 / 12, lowN: false},
      {ruleId: 'singer-songs', ruleName: 'Singer + Songs', pairs: 1, scoreVotes: 6, meanGap: -2.5, lowN: true},
      {ruleId: 'location-boost', ruleName: 'Location Boost', pairs: 1, scoreVotes: 1, meanGap: -2, lowN: true},
      {ruleId: 'shift-targets', ruleName: 'Shift Targets', pairs: 1, scoreVotes: 1, meanGap: 2, lowN: true},
      {ruleId: 'retired-rule', ruleName: 'retired-rule', pairs: 1, scoreVotes: 2, meanGap: 0, lowN: true},
    ]);
  });

  it('breaks a tie on |gap| by score votes, then by name', () => {
    const pairs: CardPair[] = pairsForCard(
      [
        pairStat({a: CARD_ID, b: '2001', engineScore: 5, communityScore: 6, scoreVotes: 2, rules: ['zeta']}),
        pairStat({a: CARD_ID, b: '2002', engineScore: 5, communityScore: 4, scoreVotes: 3, rules: ['omega']}),
        pairStat({a: CARD_ID, b: '2003', engineScore: 5, communityScore: 4, scoreVotes: 2, rules: ['alpha']}),
      ],
      CARD_ID,
    );
    expect(rulesForCard(pairs, []).map((row) => row.ruleId)).toEqual(['omega', 'alpha', 'zeta']);
  });

  it.each([
    [MIN_RULE_VOTES - 1, true],
    [MIN_RULE_VOTES, false],
  ])('marks a rule on %i score votes low n: %s', (scoreVotes, lowN) => {
    const [row] = rulesForCard(pairsForCard([gapPair({gap: 1, scoreVotes})], CARD_ID), CARD_RULES);
    expect(row.lowN).toBe(lowN);
  });

  it('gives no rows for a card with no voted pairs', () => {
    expect(rulesForCard([], CARD_RULES)).toEqual([]);
  });

  it('leaves its input in its order', () => {
    expect(() => rulesForCard(Object.freeze([...MAUI]), Object.freeze([...CARD_RULES]))).not.toThrow();
  });
});

describe('cardsToReview (R-28)', () => {
  const listed = cardsToReview(REVIEW_PAIRS);

  it('lists the cards with 10 or more score votes, widest |mean gap| first, then more votes', () => {
    expect(listed.map((card) => card.cardName)).toEqual([
      'Elsa - Spirit of Winter',
      'Stitch - Rock Star',
      'Hades - King of Olympus',
      'Belle - Strange but Special',
      'Tinker Bell - Giant Fairy',
    ]);
  });

  it(`stops at ${CARDS_TO_REVIEW}, and never lists a card under 10 score votes, however wide its gap`, () => {
    expect(listed).toHaveLength(CARDS_TO_REVIEW);
    expect(listed.map((card) => card.cardId)).not.toContain('3007');
    expect(listed.every((card) => card.scoreVotes >= MIN_RULE_VOTES)).toBe(true);
  });

  it("carries each card's id, name and calibration", () => {
    expect(listed[0]).toEqual({
      cardId: '3001',
      cardName: 'Elsa - Spirit of Winter',
      pairsVoted: 2,
      scoreVotes: 10,
      meanGap: -1.75,
      engineAvg: 6,
      communityAvg: 4.25,
      enoughVotes: true,
    });
  });

  it('counts a pair toward both its cards, and breaks a full tie by name', () => {
    const pair = pairStat({a: '1', b: '2', aName: 'Beta', bName: 'Alpha', engineScore: 5, communityScore: 7});
    expect(cardsToReview([{...pair, scoreVotes: MIN_RULE_VOTES}]).map((card) => card.cardId)).toEqual(['2', '1']);
  });

  it("sums a card's pairs in the card page's order, so its numbers match it to the last bit", () => {
    // Gaps as round2 writes them. Summed in pairs[] order instead, the mean differs in its last bit.
    const pairs = [
      {...pairStat({a: '1', b: '4', engineScore: 5, communityScore: 5.16, scoreVotes: 5}), gap: 0.16},
      {...pairStat({a: '1', b: '3', engineScore: 5, communityScore: 5.78, scoreVotes: 5}), gap: 0.78},
      {...pairStat({a: '1', b: '2', engineScore: 5, communityScore: 3.67, scoreVotes: 4}), gap: -1.33},
    ];
    expect(cardsToReview(pairs)[0].meanGap).toBe(cardCalibration(pairsForCard(pairs, '1')).meanGap);
  });

  it("matches the card page's own numbers", () => {
    const maui = cardsToReview(CARD_PAIRS).find((card) => card.cardId === CARD_ID);
    expect(maui).toEqual({cardId: CARD_ID, cardName: CARD_NAME, ...cardCalibration(MAUI)});
  });

  it('lists nothing before any card has 10 score votes, and leaves its input in its order', () => {
    expect(cardsToReview([gapPair({gap: -3, scoreVotes: MIN_RULE_VOTES - 1})])).toEqual([]);
    expect(() => cardsToReview(Object.freeze([...REVIEW_PAIRS]))).not.toThrow();
  });
});
