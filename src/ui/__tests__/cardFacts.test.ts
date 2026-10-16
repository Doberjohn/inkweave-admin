import {describe, expect, it} from 'vitest';
import {cardFacts} from '../cardFacts';

describe('cardFacts', () => {
  it.each([
    [{type: 'Character', cost: 8, inkwell: true} as const, 'Character · cost 8 · inkable'],
    [{type: 'Action', cost: 3, inkwell: false} as const, 'Action · cost 3 · uninkable'],
  ])('%o reads "%s"', (card, text) => {
    expect(cardFacts(card)).toBe(text);
  });
});
