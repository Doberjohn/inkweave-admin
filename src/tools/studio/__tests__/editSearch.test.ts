import {describe, expect, it} from 'vitest';
import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {REVEAL_ID_BASE, REVEAL_SET_CODE} from '../../reveal/constants';
import {SEARCH_LIMIT, cardTag, previewIdsOf, searchCards} from '../editSearch';

/** A card-list card; ids are strings there, as the card list holds them. */
function card(p: Partial<LorcanaCard>): LorcanaCard {
  return {id: '1', name: 'X', fullName: 'X', cost: 1, ink: 'Amber', inkwell: true, type: 'Character', setCode: '9', ...p};
}

/** A card of the reveal set, with its reveal-band id. */
function revealCard(number: number, p: Partial<LorcanaCard> = {}): LorcanaCard {
  return card({id: String(REVEAL_ID_BASE + number), setCode: REVEAL_SET_CODE, ...p});
}

const ids = (rows: {card: LorcanaCard}[]) => rows.map((row) => row.card.id);

describe('previewIdsOf', () => {
  it('collects the branch file’s ids as numbers', () => {
    const entries = [{id: REVEAL_ID_BASE + 1}, {id: REVEAL_ID_BASE + 2}] as LorcanaJSONCard[];
    expect(previewIdsOf(entries)).toEqual(new Set([REVEAL_ID_BASE + 1, REVEAL_ID_BASE + 2]));
  });

  it('is null while the file is unread, so the tags can say they don’t know yet', () => {
    expect(previewIdsOf(null)).toBeNull();
  });
});

describe('cardTag', () => {
  const inFile = new Set([REVEAL_ID_BASE + 1]);

  it.each([
    ['a reveal-set card the file holds is Preview', revealCard(1), inFile, 'Preview'],
    ['a reveal-set card the file lacks is Released', revealCard(2), inFile, 'Released'],
    ['a reveal-set card after graduation (an empty file) is Released', revealCard(1), new Set<number>(), 'Released'],
    ['a reveal-set card waits for the file (R-71)', revealCard(1), null, null],
    ['another set’s card is Released without the file (R-71)', card({id: '1936', setCode: '9'}), null, 'Released'],
    // Graduation released the set under official ids, which the file can say nothing about (R4-8a).
    ['a reveal-set card under its official id is Released without the file', card({id: '3286', setCode: REVEAL_SET_CODE}), null, 'Released'],
    // A pin that lags a season switch (R-65): the file's own word wins over admin's set code.
    ['an entry the file holds is Preview, whatever its set', card({id: '15001', setCode: '15'}), new Set([15001]), 'Preview'],
  ])('%s', (_, subject, previewIds, expected) => {
    expect(cardTag(subject, previewIds)).toBe(expected);
  });
});

describe('searchCards', () => {
  it('lists the branch file’s cards first for a blank query, each part in card-list order (R-76)', () => {
    // The card list puts preview cards last, after every released card.
    const cards = [card({id: '1936'}), card({id: '1937'}), revealCard(5), revealCard(2), revealCard(9)];
    const previewIds = new Set([REVEAL_ID_BASE + 5, REVEAL_ID_BASE + 2]);
    expect(ids(searchCards({cards, query: '', previewIds}).rows)).toEqual([
      String(REVEAL_ID_BASE + 5),
      String(REVEAL_ID_BASE + 2),
      '1936',
      '1937',
      String(REVEAL_ID_BASE + 9),
    ]);
  });

  it.each([
    ['unread', null],
    ['empty after graduation', new Set<number>()],
  ])('keeps the card list’s order while the file is %s', (_, previewIds) => {
    const cards = [card({id: '1936'}), revealCard(5), card({id: '1937'})];
    expect(ids(searchCards({cards, query: '  ', previewIds}).rows)).toEqual(['1936', String(REVEAL_ID_BASE + 5), '1937']);
  });

  it('keeps filterCards’ prefix ranking for a typed query, with the file’s cards first within a rank', () => {
    const cards = [
      card({id: '1', fullName: 'Hanna - Skater'}),
      card({id: '2', fullName: 'Anna - Heir to Arendelle'}),
      revealCard(7, {fullName: 'Joanna - Baker'}),
      revealCard(8, {fullName: 'Anna - Soothing Sister'}),
    ];
    const previewIds = new Set([REVEAL_ID_BASE + 7, REVEAL_ID_BASE + 8]);
    expect(ids(searchCards({cards, query: 'anna', previewIds}).rows)).toEqual([
      String(REVEAL_ID_BASE + 8),
      '2',
      String(REVEAL_ID_BASE + 7),
      '1',
    ]);
  });

  it.each([
    ['a blank query', '', 50],
    ['a query that matches 45', 'zz', 45],
  ])('caps the rows at SEARCH_LIMIT and counts every match, for %s', (_, query, total) => {
    const cards = [
      ...Array.from({length: 45}, (_, i) => card({id: String(i + 1), fullName: `Zz ${i + 1}`})),
      ...Array.from({length: 5}, (_, i) => card({id: String(i + 100), fullName: `Yy ${i + 1}`})),
    ];
    const result = searchCards({cards, query, previewIds: new Set()});
    expect(SEARCH_LIMIT).toBe(40);
    expect(result.rows).toHaveLength(SEARCH_LIMIT);
    expect(result.total).toBe(total);
  });

  it('tags each row: a numeric id set against the card list’s string ids', () => {
    const cards = [revealCard(1), revealCard(2), card({id: '1936'})];
    const {rows} = searchCards({cards, query: '', previewIds: new Set([REVEAL_ID_BASE + 1])});
    expect(rows.map((row) => row.tag)).toEqual(['Preview', 'Released', 'Released']);
  });

  it('leaves the reveal set’s rows untagged until the file is read (R-71)', () => {
    const {rows} = searchCards({cards: [revealCard(1), card({id: '1936'})], query: '', previewIds: null});
    expect(rows.map((row) => row.tag)).toEqual([null, 'Released']);
  });

  it('finds nothing for a query no card matches', () => {
    expect(searchCards({cards: [card({fullName: 'Elsa - Snow Queen'})], query: 'zzz', previewIds: null})).toEqual({
      rows: [],
      total: 0,
    });
  });
});

// R4-4d (R-66): the cards only the branch file holds.
describe('searchCards: deployed', () => {
  // A card New reveal just published leads the list (editSources puts it first), then the card list.
  const cards = [revealCard(9), revealCard(1), card({id: '1936'})];
  const previewIds = new Set([REVEAL_ID_BASE + 9, REVEAL_ID_BASE + 1]);

  it('marks a row the branch file alone holds as not deployed yet', () => {
    const {rows} = searchCards({cards, query: '', previewIds, branchOnlyIds: new Set([REVEAL_ID_BASE + 9])});
    expect(rows.map(({card: {id}, tag, deployed}) => ({id, tag, deployed}))).toEqual([
      {id: String(REVEAL_ID_BASE + 9), tag: 'Preview', deployed: false},
      {id: String(REVEAL_ID_BASE + 1), tag: 'Preview', deployed: true},
      {id: '1936', tag: 'Released', deployed: true},
    ]);
  });

  it('reads every row as deployed when it is given no branch-only ids', () => {
    expect(searchCards({cards, query: '', previewIds}).rows.map((row) => row.deployed)).toEqual([true, true, true]);
  });
});
