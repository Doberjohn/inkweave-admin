import {describe, expect, it} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {VotesFilterControl} from '../VotesFilterControl';

const group = () => within(screen.getByRole('group', {name: 'Filter pairs by score votes'}));

describe('VotesFilterControl', () => {
  it('offers Any, 2+ and 5+ in a named group, with Any pressed', () => {
    render(<VotesFilterControl />);
    expect(group().getAllByRole('button').map((button) => button.textContent)).toEqual(['Any', '2+', '5+']);
    expect(group().getByRole('button', {name: 'Any'})).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows "Votes" as its visual label, inside the name screen readers hear (WCAG 2.5.3)', () => {
    render(<VotesFilterControl />);
    expect(screen.getByText('Votes')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('group', {name: /votes/i})).toBeInTheDocument();
  });

  it('presses the step picked, in every control on screen', async () => {
    render(
      <>
        <VotesFilterControl />
        <VotesFilterControl />
      </>,
    );
    await userEvent.click(screen.getAllByRole('button', {name: '2+'})[0]);
    for (const button of screen.getAllByRole('button', {name: '2+'})) {
      expect(button).toHaveAttribute('aria-pressed', 'true');
    }
    for (const button of screen.getAllByRole('button', {name: 'Any'})) {
      expect(button).toHaveAttribute('aria-pressed', 'false');
    }
  });
});
