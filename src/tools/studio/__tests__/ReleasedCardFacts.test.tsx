import {describe, expect, it} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import {IMAGE_ONLY_NOTES} from '../cardEdit';
import {ReleasedCardFacts} from '../components/ReleasedCardFacts';
import {RELEASED_CARD, studioCard} from '../studioFixtures';

/** Each term with its value, as the list reads them. */
function facts() {
  const region = within(screen.getByRole('region', {name: 'Card data'}));
  const terms = region.getAllByRole('term').map((term) => term.textContent);
  const values = region.getAllByRole('definition').map((value) => value.textContent);
  return Object.fromEntries(terms.map((term, index) => [term, values[index]]));
}

describe('ReleasedCardFacts', () => {
  it("lists a released card's facts, worded as Card analytics words them, then why only its image can change (R-61)", () => {
    render(<ReleasedCardFacts card={RELEASED_CARD} note={IMAGE_ONLY_NOTES.released} />);
    expect(facts()).toEqual({
      Name: 'Lantern Keeper',
      Version: 'Night Watch',
      Set: '9',
      'Collector number': '#12',
      Ink: 'Amber',
      Type: 'Character · cost 3 · inkable',
      Rarity: 'Common',
    });
    expect(screen.getByText('Card data comes from LorcanaJSON; only the image can be replaced here.')).toBeInTheDocument();
  });

  it('names both inks of a dual-ink card, and draws the base rarity with its glyph', () => {
    const card = studioCard({id: '1500', name: 'Priya', ink: 'Ruby', ink2: 'Sapphire', rarity: 'Super Rare'});
    render(<ReleasedCardFacts card={card} note={IMAGE_ONLY_NOTES.released} />);
    expect(facts().Ink).toBe('Ruby Sapphire');
    // rarityConfigOf's name for "Super Rare", beside RaritySymbol's glyph (aria-hidden, so no role).
    expect(screen.getByText('Super rare').querySelector('img')).not.toBeNull();
  });

  it('reads — for what a card lacks, and gives the note it is passed (R-65)', () => {
    const card = studioCard({id: '14901', name: 'Tyler', setCode: '14', inkwell: false, type: 'Action'});
    render(<ReleasedCardFacts card={card} note={IMAGE_ONLY_NOTES.unnumbered} />);
    expect(facts()).toMatchObject({Version: '—', 'Collector number': '—', Type: 'Action · cost 3 · uninkable', Rarity: '—'});
    expect(screen.getByText(IMAGE_ONLY_NOTES.unnumbered)).toBeInTheDocument();
  });

  it('is read only: no control in it', () => {
    render(<ReleasedCardFacts card={RELEASED_CARD} note={IMAGE_ONLY_NOTES.released} />);
    const region = within(screen.getByRole('region', {name: 'Card data'}));
    expect(region.queryAllByRole('textbox')).toHaveLength(0);
    expect(region.queryAllByRole('button')).toHaveLength(0);
  });
});
