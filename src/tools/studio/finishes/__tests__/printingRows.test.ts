import type {PrintingFinishes} from 'inkweave-synergy-engine';
import {describe, expect, it, vi} from 'vitest';
import {smallImageUrl, transformPromos} from '../../../../app-bridge';
import type {PrintingRef} from '../printingHomes';
import {printingRowsFor, type PrintingRow, type PrintingSources} from '../printingRows';
import {
  C2_PEGASUS,
  C3_MKB,
  C3_MKB_ENTRIES,
  MICKEY,
  MICKEY_PROMOS,
  MOTHER_KNOWS_BEST,
  PEGASUS,
  SET_4,
  SET_9,
  YEN_SID,
} from './finishFixtures';

/**
 * The rows of a card whose files name no versions, unless the case says otherwise. `valueOf` is its
 * own parameter: as an optional property of the sources it would be checked against the one every
 * object inherits from Object, and a source without it would fail to type.
 */
function rowsOf(
  sources: Pick<PrintingSources, 'card'> & Partial<Pick<PrintingSources, 'chunk' | 'promos'>>,
  valueOf: PrintingSources['valueOf'] = () => null,
): PrintingRow[] {
  return printingRowsFor({chunk: [], promos: [], ...sources, valueOf});
}

const namesOf = (rows: readonly PrintingRow[]) => rows.map((row) => row.name);

/** Yen Sid's Enchanted, #209: the printing the rarity and number cases change. */
const ENCHANTED = SET_4[1];
const [PROMO_1, PROMO_13] = C3_MKB_ENTRIES;

describe('printingRowsFor', () => {
  it("names Yen Sid's printings as the binder holds them", () => {
    const rows = printingRowsFor({card: YEN_SID, chunk: SET_4, promos: [], valueOf: (r) => (r.id === '946' ? ['foil'] : null)});
    expect(rows.map((r) => r.name)).toEqual(['#59', '#209 · Enchanted', '#223 · Alt foil']);
    expect(rows.map((r) => r.shown)).toEqual([['normal', 'foil'], ['foil'], ['foil']]);
    expect(rows[2].label).toBe('Yen Sid - Powerful Sorcerer #223');
    expect(rows[2].ref).toEqual({id: '946', kind: 'printing', setCode: '4', core: false});
  });

  it('lists a Core card’s promos after its printings, by promo set', () => {
    const rows = printingRowsFor({card: MOTHER_KNOWS_BEST, chunk: [], promos: C3_MKB, valueOf: () => null});
    expect(rows.map((r) => r.name)).toEqual(['#99', '1/C3', '13/C3']);
    expect(rows[1].ref).toEqual({id: '80017', kind: 'promo', setCode: '9', core: true});
  });

  it("lists a Core card, its printing and its promos in turn, each filed under the card's set", () => {
    const rows = rowsOf({card: PEGASUS, chunk: SET_9, promos: C2_PEGASUS});
    expect(namesOf(rows)).toEqual(['#84', '#212 · Epic', '1/C2', '5/C2']);
    expect(rows.map((r) => r.ref)).toEqual([
      {id: '2020', kind: 'card', setCode: '9', core: true},
      {id: '2166', kind: 'printing', setCode: '9', core: true},
      {id: '2451', kind: 'promo', setCode: '9', core: true},
      {id: '2455', kind: 'promo', setCode: '9', core: true},
    ]);
  });

  it("labels a row with its card's name and its code, and gives it the rarity and art of its own entry", () => {
    const rows = rowsOf({card: PEGASUS, chunk: SET_9, promos: C2_PEGASUS});
    expect(rows.map((r) => r.label)).toEqual([
      'Pegasus - Gift for Hercules #84',
      'Pegasus - Gift for Hercules #212',
      'Pegasus - Gift for Hercules 1/C2',
      'Pegasus - Gift for Hercules 5/C2',
    ]);
    expect(rows.map((r) => r.rarity)).toEqual(['Common', 'Epic', 'Special', 'Special']);
    const thumbnails = rows.map((r) => r.thumbnail);
    expect(thumbnails).toEqual([PEGASUS, ...SET_9, ...C2_PEGASUS].map(smallImageUrl));
    expect(thumbnails).not.toContain(undefined);
    expect(new Set(thumbnails).size).toBe(4);
  });

  describe('which entries it lists, and in what order', () => {
    it("lists only the card's own printings and promos", () => {
      const rows = rowsOf({
        card: YEN_SID,
        chunk: [...SET_4, ...SET_9],
        promos: [...C3_MKB, ...C2_PEGASUS, ...MICKEY_PROMOS],
      });
      expect(rows.map((r) => r.ref.id)).toEqual(['750', '900', '946']);
    });

    it("reads the promos from its sources, not from the card's own variants", () => {
      expect(MOTHER_KNOWS_BEST.variants?.map((variant) => variant.id)).toEqual(['80017', '80024']);
      expect(namesOf(rowsOf({card: MOTHER_KNOWS_BEST}))).toEqual(['#99']);
    });

    it('orders printings by number, whatever order the chunk holds them in', () => {
      const chunk = [...SET_4].reverse();
      expect(namesOf(rowsOf({card: YEN_SID, chunk}))).toEqual(['#59', '#209 · Enchanted', '#223 · Alt foil']);
      expect(chunk.map((entry) => entry.id)).toEqual(['946', '900', '750']);
    });

    it('orders promos by promo set, then number, whatever order the file holds them in', () => {
      // promos.json goes by id, so Mickey's come out C1, C3, C3, D23, P1: neither release order nor alphabetical.
      expect(MICKEY_PROMOS.map((promo) => promo.promoGrouping)).toEqual(['C1', 'C3', 'C3', 'D23', 'P1']);
      const promos = [...MICKEY_PROMOS];
      expect(namesOf(rowsOf({card: MICKEY, promos}))).toEqual(['#115', '1/P1', '5/C1', '1/D23', '12/C3', '24/C3']);
      expect(promos).toEqual(MICKEY_PROMOS);
    });

    it("files a pre-Core card's promos under the card's set, not their promo set", () => {
      const rows = rowsOf({card: MICKEY, promos: MICKEY_PROMOS});
      expect(rows.map((r) => r.ref)).toEqual([
        {id: '115', kind: 'card', setCode: '1', core: false},
        {id: '659', kind: 'promo', setCode: '1', core: false},
        {id: '80003', kind: 'promo', setCode: '1', core: false},
        {id: '1191', kind: 'promo', setCode: '1', core: false},
        {id: '80023', kind: 'promo', setCode: '1', core: false},
        {id: '80030', kind: 'promo', setCode: '1', core: false},
      ]);
    });

    it("orders a promo's number as a number, not as text", () => {
      const promos = transformPromos([13, 9].map((number, i) => ({...PROMO_1, id: 90000 + i, number})));
      expect(namesOf(rowsOf({card: MOTHER_KNOWS_BEST, promos}))).toEqual(['#99', '9/C3', '13/C3']);
    });
  });

  describe('how it names a printing', () => {
    it.each(['Epic', 'Enchanted', 'Iconic'])('names a %s printing by its rarity', (rarity) => {
      const rows = rowsOf({card: YEN_SID, chunk: [{...ENCHANTED, rarity}]});
      expect(namesOf(rows)).toEqual(['#59', `#209 · ${rarity}`]);
    });

    it.each(['Common', 'Super Rare', 'Legendary'])("names a %s printing an alt foil, which keeps its card's rarity", (rarity) => {
      const rows = rowsOf({card: YEN_SID, chunk: [{...ENCHANTED, rarity}]});
      expect(namesOf(rows)).toEqual(['#59', '#209 · Alt foil']);
    });

    it('names a promo printed in two arts under one number by its art', () => {
      const promos = transformPromos(['A', 'B'].map((artVariant, i) => ({...PROMO_1, id: 90000 + i, artVariant})));
      const rows = rowsOf({card: MOTHER_KNOWS_BEST, promos});
      expect(namesOf(rows)).toEqual(['#99', '1A/C3', '1B/C3']);
      expect(rows[1].label).toBe('Mother Knows Best 1A/C3');
    });
  });

  describe('what the data lacks', () => {
    it('names a number with a question mark, and lists that printing last', () => {
      const unnumbered = {...ENCHANTED, setNumber: undefined};
      expect(namesOf(rowsOf({card: YEN_SID, chunk: [unnumbered, SET_4[2]]}))).toEqual(['#59', '#223 · Alt foil', '#? · Enchanted']);
      const promos = transformPromos([{...PROMO_1, number: null}, PROMO_13]);
      expect(namesOf(rowsOf({card: MOTHER_KNOWS_BEST, promos}))).toEqual(['#99', '13/C3', '?/C3']);
    });

    it('names a promo set with a question mark', () => {
      const promos = transformPromos([{...PROMO_1, promoGrouping: undefined}]);
      expect(namesOf(rowsOf({card: MOTHER_KNOWS_BEST, promos}))).toEqual(['#99', '1/?']);
    });

    it('gives a card with no set or rarity an empty one, and files it as not Core', () => {
      const [row] = rowsOf({card: {...YEN_SID, setCode: undefined, rarity: undefined}});
      expect(row.ref).toEqual({id: '750', kind: 'card', setCode: '', core: false});
      expect(row.rarity).toBe('');
      expect(row.shown).toEqual(['normal', 'foil']);
    });
  });

  describe('which versions a row shows', () => {
    it('asks valueOf once for each row, in row order, and shows what its answer says', () => {
      const values = new Map<string, PrintingFinishes>([
        ['2020', ['foil']],
        ['2166', ['normal', 'foil']],
        ['2451', ['normal']],
      ]);
      const valueOf = vi.fn((ref: PrintingRef) => values.get(ref.id) ?? null);
      const rows = rowsOf({card: PEGASUS, chunk: SET_9, promos: C2_PEGASUS}, valueOf);
      expect(valueOf.mock.calls.map(([ref]) => ref)).toEqual(rows.map((r) => r.ref));
      expect(rows.map((r) => r.value)).toEqual([['foil'], ['normal', 'foil'], ['normal'], null]);
      // A Common made foil only, an Epic made Both, a promo made normal only, and a promo left to its rarity.
      expect(rows.map((r) => r.shown)).toEqual([['foil'], ['normal', 'foil'], ['normal'], ['normal', 'foil']]);
    });

    it("takes the versions from valueOf alone: what an entry names itself is the deployed data's", () => {
      expect(C3_MKB.map((promo) => promo.finishes)).toEqual([['normal'], ['foil']]);
      const rows = rowsOf({card: MOTHER_KNOWS_BEST, promos: C3_MKB});
      expect(rows.map((r) => r.value)).toEqual([null, null, null]);
      expect(rows.map((r) => r.shown)).toEqual([['normal', 'foil'], ['normal', 'foil'], ['normal', 'foil']]);
    });
  });
});
