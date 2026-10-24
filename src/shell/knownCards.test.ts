import {describe, expect, it} from 'vitest';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {cardArtOf} from './knownCards';

/** A card list entry with only what cardArtOf reads. */
const card = (fields: Pick<LorcanaCard, 'id' | 'imageUrl' | 'variants'>) => fields as LorcanaCard;

// Un Poco Loco with an Enchanted printing that has art of its own, and a promo whose scan isn't in yet.
const UN_POCO_LOCO = card({
  id: '3328',
  imageUrl: '/card-images/3328.avif',
  variants: [
    {id: '3410', rarity: 'Enchanted', imageUrl: '/card-images/3410.avif'},
    {id: '3411', rarity: 'Special'},
  ],
});

describe('cardArtOf', () => {
  it("gives a card's art by its id", () => {
    expect(cardArtOf([UN_POCO_LOCO])('3328')).toBe('/card-images/3328.avif');
  });

  it("gives a printing its own art, not its card's", () => {
    expect(cardArtOf([UN_POCO_LOCO])('3410')).toBe('/card-images/3410.avif');
  });

  it('gives none for an id the list lacks, or for a card or printing without an image', () => {
    const artOf = cardArtOf([UN_POCO_LOCO, card({id: '17'})]);
    expect(artOf('999')).toBeUndefined();
    expect(artOf('17')).toBeUndefined();
    expect(artOf('3411')).toBeUndefined();
  });
});
