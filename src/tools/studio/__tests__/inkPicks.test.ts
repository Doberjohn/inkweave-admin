import {describe, expect, it} from 'vitest';
import type {Ink} from 'inkweave-synergy-engine';
import {ALL_INKS} from '../../../app-bridge';
import {RARITIES} from '../../reveal/constants';
import {inkName, primaryInkPatch, rarityChoices, secondInks, STUDIO_RARITIES} from '../inkPicks';

describe('STUDIO_RARITIES (R-74)', () => {
  it('offers the five base rarities in order, and leaves RARITIES as reveal-sync reads it', () => {
    expect(STUDIO_RARITIES).toEqual(['Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary']);
    expect(RARITIES).toContain('Enchanted');
  });
});

describe('rarityChoices', () => {
  it.each([
    {rarity: '', choices: STUDIO_RARITIES},
    {rarity: 'Super Rare', choices: STUDIO_RARITIES},
    // A card that holds another rarity keeps it in view, after the studio's own.
    {rarity: 'Enchanted', choices: [...STUDIO_RARITIES, 'Enchanted']},
  ])('gives $choices.length buttons for rarity "$rarity"', ({rarity, choices}) => {
    expect(rarityChoices({rarity})).toEqual(choices);
  });
});

describe('secondInks (R-75)', () => {
  it.each(ALL_INKS)('leaves out the primary, %s', (ink) => {
    expect(secondInks({ink})).toEqual(ALL_INKS.filter((other) => other !== ink));
  });
});

describe('primaryInkPatch (R-75)', () => {
  it.each<{ink2: '' | Ink; patch: Partial<{ink: Ink; ink2: ''}>}>([
    {ink2: '', patch: {ink: 'Ruby'}},
    {ink2: 'Steel', patch: {ink: 'Ruby'}},
    // The new primary was the second ink: the card would hold Ruby twice.
    {ink2: 'Ruby', patch: {ink: 'Ruby', ink2: ''}},
  ])('picks Ruby over a second ink of "$ink2"', ({ink2, patch}) => {
    expect(primaryInkPatch({form: {ink: 'Amber', ink2}, ink: 'Ruby'})).toEqual(patch);
  });
});

describe('inkName (R-75)', () => {
  it.each<{ink2: '' | Ink; name: string}>([
    {ink2: '', name: 'Amber'},
    {ink2: 'Ruby', name: 'Amber / Ruby'},
  ])('reads "$name"', ({ink2, name}) => {
    expect(inkName({ink: 'Amber', ink2})).toBe(name);
  });
});
