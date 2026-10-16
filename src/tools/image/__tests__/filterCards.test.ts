import {describe, it, expect} from 'vitest';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {filterCards} from '../filterCards';

function card(p: Partial<LorcanaCard>): LorcanaCard {
  return {id: '1', name: 'X', fullName: 'X', cost: 1, ink: 'Amber', inkwell: true, type: 'Character', ...p};
}

describe('filterCards', () => {
  it('matches by name substring, case-insensitive', () => {
    const cards = [
      card({id: '1', name: 'Elsa', fullName: 'Elsa - Snow Queen'}),
      card({id: '2', name: 'Anna', fullName: 'Anna - Heir to Arendelle'}),
    ];
    expect(filterCards(cards, 'els').map((c) => c.id)).toEqual(['1']);
  });

  it('matches by id', () => {
    const cards = [card({id: '5001'}), card({id: '5002'})];
    expect(filterCards(cards, '5002').map((c) => c.id)).toEqual(['5002']);
  });

  it('returns the first `limit` cards when the query is blank', () => {
    const cards = Array.from({length: 50}, (_, i) => card({id: String(i)}));
    expect(filterCards(cards, '  ', 40).map((c) => c.id)).toEqual(cards.slice(0, 40).map((c) => c.id));
  });

  it('caps results at `limit`', () => {
    const many = Array.from({length: 100}, (_, i) => card({id: String(i), name: 'Zz', fullName: 'Zz Zz'}));
    expect(filterCards(many, 'zz', 40)).toHaveLength(40);
  });

  it('puts fullName prefix matches first, and keeps list order within each rank', () => {
    const cards = [
      card({id: '1', fullName: 'Hanna - Skater'}),
      card({id: '2', fullName: 'Anna - Heir to Arendelle'}),
      card({id: '3', fullName: 'Joanna - Baker'}),
      card({id: '4', fullName: 'Anna - Soothing Sister'}),
    ];
    expect(filterCards(cards, 'anna').map((c) => c.id)).toEqual(['2', '4', '1', '3']);
  });

  // Set 14's preview names print ’ (Peter Pan’s Shadow, Bellwether’s Henchmen), while
  // released names and most keyboards use '. iOS types ’. The app's search folds both.
  it.each([
    ['a straight query finds a typographic name', "pan's", 'Peter Pan’s Shadow - Elusive Prankster'],
    ['a typographic query finds a straight name', 'pan’s', "Peter Pan's Shadow - Elusive Prankster"],
    ['an opening quote folds too', 'pan‘s', "Peter Pan's Shadow - Elusive Prankster"],
  ])('%s', (_, query, fullName) => {
    const cards = [card({id: '1', fullName}), card({id: '2', fullName: 'Peter Pan - Never Land Hero'})];
    expect(filterCards(cards, query).map((c) => c.id)).toEqual(['1']);
  });

  it('ranks a prefix match by its folded name', () => {
    const cards = [
      card({id: '1', fullName: 'Lost Boys - Peter Pan’s Crew'}),
      card({id: '2', fullName: 'Peter Pan’s Shadow - Elusive Prankster'}),
    ];
    expect(filterCards(cards, "peter pan's").map((c) => c.id)).toEqual(['2', '1']);
  });
});
