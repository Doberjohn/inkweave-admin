import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {CardId} from '../CardId';

describe('CardId', () => {
  it('reads "ID 3328", the id a code that one click selects whole', () => {
    const {container} = render(<CardId id="3328" />);
    expect(container).toHaveTextContent(/^ID 3328$/);
    const id = screen.getByText('3328');
    expect(id.tagName).toBe('CODE');
    expect(id.style.userSelect).toBe('all');
  });
});
