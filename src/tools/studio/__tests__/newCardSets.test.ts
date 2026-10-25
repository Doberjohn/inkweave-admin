import {describe, expect, it} from 'vitest';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {REVEAL_ID_BASE, REVEAL_SET_CODE, SET_TOTAL} from '../../../app-bridge';
import {closedReason, closedSets, newCardSet, newCardSets, previewIdText, setLabel} from '../newCardSets';
import {studioCard} from '../studioFixtures';

/** A card of the reveal set: released, under an official id, or a preview under REVEAL_ID_BASE + its number. */
function revealCard(n: number, kind: 'released' | 'preview' = 'released'): LorcanaCard {
  const id = kind === 'released' ? String(3000 + n) : String(REVEAL_ID_BASE + n);
  return studioCard({id, name: `Card ${n}`, setCode: REVEAL_SET_CODE, setNumber: n});
}

/** Every number of the reveal set, 1 to SET_TOTAL. */
const ALL_NUMBERS = Array.from({length: SET_TOTAL}, (_, i) => i + 1);

/** A card of another set, under an official id. */
const otherSet = (setCode: string, id: string) => studioCard({id, name: `Card ${id}`, setCode, setNumber: 1});

describe('newCardSets: the reveal set', () => {
  it('is open while a number is free, counting preview and released cards alike', () => {
    const {reveal} = newCardSets([revealCard(1), revealCard(2, 'preview')]);
    expect(reveal).toMatchObject({code: REVEAL_SET_CODE, taken: 2, total: SET_TOTAL, status: 'open'});
  });

  it('has graduated once released cards hold every number', () => {
    const {reveal} = newCardSets(ALL_NUMBERS.map((n) => revealCard(n)));
    expect(reveal).toMatchObject({taken: SET_TOTAL, status: 'graduated'});
  });

  it('is full when cards hold every number but some are still previews', () => {
    const cards = ALL_NUMBERS.map((n) => revealCard(n, n === 1 ? 'preview' : 'released'));
    expect(newCardSets(cards).reveal.status).toBe('full');
  });

  it('never counts a number past the set, or a card without one', () => {
    const past = revealCard(SET_TOTAL + 1);
    const unnumbered = studioCard({id: String(REVEAL_ID_BASE + 901), name: 'Tyler', setCode: REVEAL_SET_CODE});
    expect(newCardSets([past, unnumbered]).reveal.taken).toBe(0);
  });

  it('counts a number two cards hold once', () => {
    expect(newCardSets([revealCard(5), revealCard(5, 'preview')]).reveal.taken).toBe(1);
  });
});

describe('newCardSets: the released sets', () => {
  it('lists every other Core set once, newest first, leaving out Sets 1 to 8 and the reveal set', () => {
    const cards = [otherSet('9', '1'), otherSet('13', '2'), otherSet('8', '3'), otherSet('9', '4'), revealCard(1)];
    expect(newCardSets(cards).released.map((set) => set.code)).toEqual(['13', '9']);
  });

  it("names a set with the app's name and logo", () => {
    expect(newCardSet('13')).toEqual({code: '13', name: 'Attack of the Vine!', logo: '/art/sets/attack-of-the-vine.webp'});
  });

  it('leaves the name out for a set the pinned app has no name for', () => {
    expect(newCardSet('99')).toEqual({code: '99', name: undefined, logo: undefined});
  });
});

describe('setLabel', () => {
  it("names a set by its number and the app's name", () => {
    expect(setLabel(newCardSet('13'))).toBe('Set 13 · Attack of the Vine!');
  });

  it('names a set the pinned app has no name for by its number alone', () => {
    expect(setLabel(newCardSet('99'))).toBe('Set 99');
  });
});

describe('closedReason and closedSets', () => {
  const released = otherSet('13', '1');
  const graduated = newCardSets([...ALL_NUMBERS.map((n) => revealCard(n)), released]);
  const full = newCardSets([...ALL_NUMBERS.map((n) => revealCard(n, n === 1 ? 'preview' : 'released')), released]);
  const open = newCardSets([revealCard(1), released]);
  const label = setLabel(newCardSet(REVEAL_SET_CODE));

  it('give no reason while the reveal set takes a card, and list only the other sets', () => {
    expect(closedReason(open.reveal)).toBeNull();
    expect(closedSets(open).map((set) => set.code)).toEqual(['13']);
  });

  it('say a graduated set has graduated, and list it first among the closed sets', () => {
    expect(closedReason(graduated.reveal)).toBe(
      `${label} has graduated: released cards hold all ${SET_TOTAL} of its numbers.`,
    );
    expect(closedSets(graduated).map((set) => set.code)).toEqual([REVEAL_SET_CODE, '13']);
  });

  it('say a full set is full, and leave it out of the closed sets: its season is still on', () => {
    expect(closedReason(full.reveal)).toBe(
      `${label} is full: cards hold all ${SET_TOTAL} of its numbers, some of them still previews.`,
    );
    expect(closedSets(full).map((set) => set.code)).toEqual(['13']);
  });
});

describe('previewIdText', () => {
  it('names the preview id of a number the set has', () => {
    expect(previewIdText('23')).toBe(`card ${REVEAL_ID_BASE + 23}`);
    expect(previewIdText(' 7 ')).toBe(`card ${REVEAL_ID_BASE + 7}`);
  });

  it('names the rule while no number of the set is typed', () => {
    for (const typed of ['', 'abc', '1.5', '0', String(SET_TOTAL + 1)]) {
      expect(previewIdText(typed)).toBe(`${REVEAL_ID_BASE} + its collector number`);
    }
  });
});
