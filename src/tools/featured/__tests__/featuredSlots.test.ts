import {describe, expect, it} from 'vitest';
import {DUAL, FEATURED_CARDS, GOLIATH, MAX, NO_ART, SIX, UN_POCO_LOCO, cardByIdIn, entriesFor} from '../featuredFixtures';
import {candidatesFor, changedSlots, entriesOf, featuredProblem, slotProblem, slotsOf} from '../featuredSlots';

const slotsFor = (cards = SIX, list = FEATURED_CARDS) => slotsOf(entriesFor(cards), cardByIdIn(list));

describe('slotsOf', () => {
  it('puts entry i in FEATURED_INKS[i]’s slot, with its card from the card list', () => {
    const slots = slotsFor();
    expect(slots.map((slot) => slot.ink)).toEqual(['Amber', 'Amethyst', 'Emerald', 'Ruby', 'Sapphire', 'Steel']);
    expect(slots[1]).toEqual({ink: 'Amethyst', id: '3328', label: 'Amethyst: Un Poco Loco', card: UN_POCO_LOCO});
  });

  it('keeps the file’s line for a card the card list lacks', () => {
    const slots = slotsFor(SIX, SIX.filter((card) => card !== MAX));
    expect(slots[2]).toMatchObject({id: '3354', label: 'Emerald: Max Goof - Karaoke Star', card: undefined});
  });
});

describe('featuredProblem', () => {
  it('passes the homepage’s six', () => {
    expect(featuredProblem(slotsFor())).toBeNull();
  });

  it('refuses a card the card list lacks', () => {
    const slots = slotsFor(SIX, SIX.filter((card) => card !== MAX));
    expect(slotProblem(slots[2], slots)).toBe('The card list doesn’t hold this card.');
    expect(featuredProblem(slots)).toBe('Emerald: The card list doesn’t hold this card.');
  });

  it('refuses a card without art, which the homepage would skip', () => {
    const slots = slotsFor([SIX[0], NO_ART, ...SIX.slice(2)]);
    expect(featuredProblem(slots)).toBe('Amethyst: This card has no art, so the homepage would skip it.');
  });

  it('refuses a card another slot holds', () => {
    const slots = slotsFor([SIX[0], SIX[0], ...SIX.slice(2)]);
    expect(slotProblem(slots[1], slots)).toBe('The Amber slot holds this card too.');
  });

  it('refuses six that leave an ink with no card, in the app’s words', () => {
    // Goliath in Amber's place: no card carries Amber any more.
    expect(featuredProblem(slotsFor([GOLIATH, ...SIX.slice(1)]))).toBe(
      'Can’t save: pick cards that carry every ink between them (no card is Amber).',
    );
  });
});

describe('candidatesFor', () => {
  it('offers only cards of the ink with art', () => {
    expect(candidatesFor('Amethyst', FEATURED_CARDS, '').map((card) => card.id)).toEqual([UN_POCO_LOCO.id, GOLIATH.id, DUAL.id]);
  });

  it('offers a dual-ink card under each of its inks', () => {
    expect(candidatesFor('Sapphire', FEATURED_CARDS, 'christopher')).toEqual([DUAL]);
    expect(candidatesFor('Amethyst', FEATURED_CARDS, 'christopher')).toEqual([DUAL]);
  });

  it('searches by name, version or id', () => {
    expect(candidatesFor('Amethyst', FEATURED_CARDS, 'warrior')).toEqual([GOLIATH]);
    expect(candidatesFor('Amethyst', FEATURED_CARDS, '3318')).toEqual([GOLIATH]);
  });
});

describe('entriesOf and changedSlots', () => {
  it('writes each card’s own line, a dual-ink card’s inks joined by "-"', () => {
    const entries = entriesOf(slotsFor([SIX[0], DUAL, ...SIX.slice(2)]));
    expect(entries[1]).toEqual({id: '3032', card: 'Amethyst-Sapphire: Christopher Robin - Hunny Sage'});
  });

  it('keeps the file’s own line for a card the card list lacks', () => {
    const entries = entriesOf(slotsFor(SIX, SIX.filter((card) => card !== MAX)));
    expect(entries[2]).toEqual({id: '3354', card: 'Emerald: Max Goof - Karaoke Star'});
  });

  it('lists only the slots whose card differs', () => {
    const before = entriesFor(SIX);
    const after = entriesFor([SIX[0], GOLIATH, ...SIX.slice(2)]);
    expect(changedSlots(before, after)).toEqual([{ink: 'Amethyst', from: before[1], to: after[1]}]);
  });
});
