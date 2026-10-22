import {describe, expect, it} from 'vitest';
import {finishesOf} from '../../../../app-bridge';
import {CHOICE_OPTIONS, choiceLabel, choiceOf, finishesOfChoice, finishTitle, sameFinishes} from '../finishValues';

describe('finishValues', () => {
  it('maps shown finishes to a choice and back', () => {
    expect(choiceOf(['normal', 'foil'])).toBe('both');
    expect(choiceOf(['foil'])).toBe('foil');
    expect(choiceOf(['normal'])).toBe('normal');
    expect(finishesOfChoice('both')).toEqual(['normal', 'foil']);
    expect(finishesOfChoice('foil')).toEqual(['foil']);
  });
  it('labels choices in the binder words', () => {
    expect(CHOICE_OPTIONS.map((o) => o.label)).toEqual(['Both', 'Foil only', 'Normal only']);
    expect(choiceLabel(['normal'])).toBe('Normal only');
    expect(finishTitle('normal')).toBe('Normal');
  });
  it('compares finishes by value', () => {
    expect(sameFinishes(['normal', 'foil'], ['normal', 'foil'])).toBe(true);
    expect(sameFinishes(null, null)).toBe(true);
    expect(sameFinishes(['foil'], null)).toBe(false);
  });
  it('takes the default from the app', () => {
    expect(finishesOf({rarity: 'Enchanted'})).toEqual(['foil']);
    expect(finishesOf({rarity: 'Legendary'})).toEqual(['normal', 'foil']);
    expect(finishesOf({rarity: 'Legendary', finishes: ['foil']})).toEqual(['foil']);
  });

  it.each(['both', 'foil', 'normal'] as const)('gives back the %s choice from the finishes it writes', (choice) => {
    expect(choiceOf(finishesOfChoice(choice))).toBe(choice);
  });
  it('writes Normal only as the one normal finish', () => {
    expect(finishesOfChoice('normal')).toEqual(['normal']);
  });
  it('hands each caller its own array, so one edit cannot change the next choice', () => {
    expect(finishesOfChoice('both')).not.toBe(finishesOfChoice('both'));
  });
  it('keys the three choices both, foil and normal, each once, in the panel’s order', () => {
    expect(CHOICE_OPTIONS.map((o) => o.value)).toEqual(['both', 'foil', 'normal']);
  });
  it('labels every choice and names each version', () => {
    expect(choiceLabel(['normal', 'foil'])).toBe('Both');
    expect(choiceLabel(['foil'])).toBe('Foil only');
    expect(finishTitle('foil')).toBe('Foil');
  });
  it('tells finishes apart by length and by each version', () => {
    expect(sameFinishes(['foil'], ['normal'])).toBe(false);
    expect(sameFinishes(['normal'], ['normal', 'foil'])).toBe(false);
    expect(sameFinishes(['normal', 'foil'], ['normal'])).toBe(false);
    expect(sameFinishes(null, ['foil'])).toBe(false);
  });
  it('tells finishes apart by order too: the data writes normal before foil, so the other order is another value', () => {
    expect(sameFinishes(['foil', 'normal'], ['normal', 'foil'])).toBe(false);
    expect(sameFinishes(['normal', 'foil'], ['foil', 'normal'])).toBe(false);
  });
});
