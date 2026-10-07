import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {LowNTag} from '../LowNTag';

describe('LowNTag', () => {
  it('reads "low n" in the muted colour, and gives the threshold it was passed on hover', () => {
    const {rerender} = render(<LowNTag minVotes={10} />);
    const tag = screen.getByText('low n');
    expect(tag).toHaveAttribute('title', 'Fewer than 10 score votes');
    expect(tag).toHaveStyle({color: ADMIN_COLORS.muted});

    rerender(<LowNTag minVotes={5} />);
    expect(screen.getByText('low n')).toHaveAttribute('title', 'Fewer than 5 score votes');
  });
});
