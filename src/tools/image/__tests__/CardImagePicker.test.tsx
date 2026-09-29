import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {CardImagePicker} from '../components/CardImagePicker';

function card(id: string, fullName: string): LorcanaCard {
  return {id, name: fullName, fullName, cost: 1, ink: 'Amber', inkwell: true, type: 'Character'};
}

const CARDS = [card('5001', 'Elsa - Snow Queen'), card('5002', 'Anna - Heir to Arendelle')];

describe('CardImagePicker', () => {
  it('picks a card and marks the selected one pressed', async () => {
    const onSelect = vi.fn();
    render(<CardImagePicker cards={CARDS} selectedId="5002" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button', {name: 'Elsa - Snow Queen'}));
    expect(onSelect).toHaveBeenCalledWith(CARDS[0]);
    expect(screen.getByRole('button', {name: 'Anna - Heir to Arendelle'})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', {name: 'Elsa - Snow Queen'})).toHaveAttribute('aria-pressed', 'false');
  });

  it('narrows the list as you search', async () => {
    render(<CardImagePicker cards={CARDS} selectedId={null} onSelect={() => {}} />);
    await userEvent.type(screen.getByRole('searchbox', {name: 'Search cards'}), 'anna');
    expect(screen.queryByRole('button', {name: 'Elsa - Snow Queen'})).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Anna - Heir to Arendelle'})).toBeInTheDocument();
  });
});
