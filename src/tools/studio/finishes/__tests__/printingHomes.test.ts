import {describe, expect, it} from 'vitest';
import {ALL_CARDS_PATH, CATALOG_PATH, PROMOS_PATH, setChunkPath} from '../finishFiles';
import {homesOf, primaryHome, type PrintingKind} from '../printingHomes';

/** A printing of a card in this set, which is Core from Set 9 up. */
const ref = (kind: PrintingKind, setCode: string) => ({id: '1', kind, setCode, core: Number(setCode) >= 9});

describe('printingHomes', () => {
  it('lists each kind of printing in its homes, primary first', () => {
    expect(homesOf(ref('card', '12'))).toEqual([ALL_CARDS_PATH]);
    expect(homesOf(ref('card', '4'))).toEqual([setChunkPath('4')]);
    expect(homesOf(ref('printing', '11'))).toEqual([setChunkPath('11'), ALL_CARDS_PATH]);
    expect(homesOf(ref('printing', '4'))).toEqual([setChunkPath('4')]);
    expect(homesOf(ref('promo', '9'))).toEqual([CATALOG_PATH, PROMOS_PATH, ALL_CARDS_PATH]);
    expect(homesOf(ref('promo', '1'))).toEqual([CATALOG_PATH, PROMOS_PATH]);
    expect(primaryHome(ref('promo', '9'))).toBe(CATALOG_PATH);
  });

  it("makes allCards.json a Core card's primary home, but a Core printing's or promo's last", () => {
    expect(primaryHome(ref('card', '12'))).toBe(ALL_CARDS_PATH);
    expect(primaryHome(ref('card', '4'))).toBe(setChunkPath('4'));
    expect(primaryHome(ref('printing', '11'))).toBe(setChunkPath('11'));
    expect(primaryHome(ref('printing', '4'))).toBe(setChunkPath('4'));
    expect(primaryHome(ref('promo', '9'))).toBe(CATALOG_PATH);
  });
});
