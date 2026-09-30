import {describe, it, expect, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {CardPreviewPanel} from '../components/CardPreviewPanel';

const CARD: LorcanaCard = {
  id: '14050',
  name: 'Mei',
  version: 'Red Panda',
  fullName: 'Mei - Red Panda',
  cost: 4,
  ink: 'Ruby',
  inkwell: true,
  type: 'Character',
  strength: 3,
  willpower: 5,
  lore: 2,
  textSections: ['PANDA POWER When you play this character, draw a card.'],
};

describe('CardPreviewPanel', () => {
  it('shows what "See translation" will show when the scan is not English', () => {
    const {rerender} = render(<CardPreviewPanel card={{...CARD, scanLanguage: 'ja'}} onImageChange={vi.fn()} />);
    const translation = screen.getByRole('region', {name: 'English translation of Mei - Red Panda'});
    expect(translation).toHaveTextContent('PANDA POWER');
    expect(translation).toHaveTextContent('Translated from the Japanese card');

    rerender(<CardPreviewPanel card={CARD} onImageChange={vi.fn()} />);
    expect(screen.queryByRole('region', {name: /English translation/})).toBeNull();
  });
});
