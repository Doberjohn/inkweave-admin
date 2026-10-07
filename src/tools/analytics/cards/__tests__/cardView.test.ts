import {describe, expect, it} from 'vitest';
import {
  CARD_ID,
  CARD_PAIRS,
  CARD_RULES,
  EMPTY_LOG,
  MAUI_LOG,
  NO_RAW_ANALYTICS,
  VIEW_ANALYTICS,
  VIEW_LOG,
  VOTED_CARD,
  lorcanaCard,
  viewCard,
} from '../cardFixtures';
import {pairsForCard} from '../cardStats';
import {votesForCard} from '../cardVotes';
import {
  NO_RAW_SILENT_NOTE,
  calibrationData,
  calibrationOf,
  cardFacts,
  rawFigures,
  rawVotesFor,
  silentNote,
  votesOnCard,
  type RawVotes,
} from '../cardView';

const isListed = (id: string) => viewCard(id) !== undefined;
const MAUI_PAIRS = pairsForCard(CARD_PAIRS, CARD_ID);
const MAUI_VOTES: RawVotes = {kind: 'card', cardVotes: votesForCard(MAUI_LOG, CARD_ID)};

describe('calibrationData', () => {
  it("is null until vote analytics loads, then the card's pairs and every rule", () => {
    expect(calibrationData(null, CARD_ID)).toBeNull();
    const data = calibrationData(VIEW_ANALYTICS, CARD_ID);
    expect(data?.cardPairs.map((p) => p.partnerId)).toEqual(['1012', '1187', '1033', '1102', '2001']);
    expect(data?.rules).toBe(VIEW_ANALYTICS.rules);
  });

  it('gives a card in no pairs[] row no pairs, not null', () => {
    expect(calibrationData(VIEW_ANALYTICS, '9999')?.cardPairs).toEqual([]);
  });
});

describe('calibrationOf', () => {
  it('has no numbers before vote analytics loads, or for a card with no voted pair', () => {
    expect(calibrationOf(null)).toBeNull();
    expect(calibrationOf({cardPairs: [], rules: CARD_RULES})).toBeNull();
  });

  it("is the card's calibration once it has a voted pair", () => {
    expect(calibrationOf({cardPairs: MAUI_PAIRS, rules: CARD_RULES})).toMatchObject({
      pairsVoted: 5,
      scoreVotes: 14,
      meanGap: -1,
      enoughVotes: true,
    });
  });
});

describe('rawVotesFor', () => {
  it.each<[string, RawVotes['kind'], Parameters<typeof rawVotesFor>[0]]>([
    ['vote analytics says the deploy had no raw votes', 'none', {analytics: NO_RAW_ANALYTICS, voteLog: VIEW_LOG, cardId: CARD_ID}],
    ['the log is still loading, or failed', 'waiting', {analytics: VIEW_ANALYTICS, voteLog: null, cardId: CARD_ID}],
    ['the log loaded empty, before vote analytics', 'none', {analytics: null, voteLog: EMPTY_LOG, cardId: CARD_ID}],
    ['the log has votes', 'card', {analytics: null, voteLog: VIEW_LOG, cardId: CARD_ID}],
  ])('%s: %s', (_, kind, input) => {
    expect(rawVotesFor(input).kind).toBe(kind);
  });

  it("keeps the card's own votes, from either side of the row", () => {
    const raw = rawVotesFor({analytics: VIEW_ANALYTICS, voteLog: VIEW_LOG, cardId: CARD_ID});
    expect(votesOnCard(raw)).toHaveLength(18);
    expect(votesOnCard(raw).map((v) => v.side)).toContain('b');
  });

  it('gives a card nobody voted on an empty list, not "none"', () => {
    expect(rawVotesFor({analytics: VIEW_ANALYTICS, voteLog: VIEW_LOG, cardId: '9999'})).toEqual({kind: 'card', cardVotes: []});
  });
});

describe('votesOnCard', () => {
  it('has none until the log is in', () => {
    expect(votesOnCard({kind: 'waiting'})).toEqual([]);
    expect(votesOnCard({kind: 'none'})).toEqual([]);
  });
});

describe('rawFigures', () => {
  it("counts Maui's raw votes, voters and accuracy answers, and the sentiment they give (R-32)", () => {
    expect(rawFigures(votesOnCard(MAUI_VOTES))).toEqual({votes: 18, voters: 10, sentiment: -0.4, answered: 5});
  });

  it("reads card 500's from the shared log", () => {
    expect(rawFigures(votesForCard(VIEW_LOG.votes, VOTED_CARD))).toEqual({votes: 11, voters: 8, sentiment: -0.25, answered: 4});
  });

  it('is null for a card nobody has voted on', () => {
    expect(rawFigures([])).toBeNull();
  });
});

describe('silentNote', () => {
  it('splits the engine-silent pairs by whether the partner is in the card list (R-31)', () => {
    expect(silentNote({raw: MAUI_VOTES, cardPairs: MAUI_PAIRS, isListed})).toBe(
      'Not listed: 3 engine-silent pairs (voted, but the engine gives them no score): ' +
        '2 with a card outside the current card list, 1 with both cards in Core.',
    );
  });

  it('says why it has no count without raw votes', () => {
    expect(silentNote({raw: {kind: 'none'}, cardPairs: MAUI_PAIRS, isListed})).toBe(NO_RAW_SILENT_NOTE);
  });

  it('says nothing while the log is out, or when the engine scores every voted pair', () => {
    expect(silentNote({raw: {kind: 'waiting'}, cardPairs: MAUI_PAIRS, isListed})).toBeNull();
    const onListedPairs = votesForCard(MAUI_LOG.slice(0, 15), CARD_ID);
    expect(silentNote({raw: {kind: 'card', cardVotes: onListedPairs}, cardPairs: MAUI_PAIRS, isListed})).toBeNull();
  });

  it('counts a pair whose every vote is engine-silent: the card then has no pairs[] row at all', () => {
    const silentOnly = votesForCard(MAUI_LOG.slice(15), CARD_ID);
    expect(silentNote({raw: {kind: 'card', cardVotes: silentOnly}, cardPairs: [], isListed})).toMatch(/^Not listed: 3 /);
  });
});

describe('cardFacts', () => {
  it.each([
    [{type: 'Character', cost: 8, inkwell: true} as const, 'Character · cost 8 · inkable'],
    [{type: 'Action', cost: 3, inkwell: false} as const, 'Action · cost 3 · uninkable'],
  ])('%o reads "%s"', (card, text) => {
    expect(cardFacts(lorcanaCard({id: '1', name: 'Any', ...card}))).toBe(text);
  });
});
