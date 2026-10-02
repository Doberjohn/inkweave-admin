import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {MeterBar} from '../MeterBar';

describe('MeterBar', () => {
  it('is a named meter when labelled, filled to its share', () => {
    render(<MeterBar fraction={0.4} color={ADMIN_COLORS.accent} label="Voter 41: 40% of votes" />);
    const meter = screen.getByRole('meter', {name: 'Voter 41: 40% of votes'});
    expect(meter).toHaveAttribute('aria-valuenow', '40');
    expect(meter.firstElementChild).toHaveStyle({width: '40%'});
  });

  it.each([
    [1.7, '100%', '100'],
    [-0.2, '0%', '0'],
    [NaN, '0%', '0'],
  ])('clamps a fraction of %s to %s', (fraction, width, now) => {
    render(<MeterBar fraction={fraction} color={ADMIN_COLORS.accent} label="Share" />);
    const meter = screen.getByRole('meter', {name: 'Share'});
    expect(meter).toHaveAttribute('aria-valuenow', now);
    expect(meter.firstElementChild).toHaveStyle({width});
  });

  it('is hidden from assistive tech without a label', () => {
    const {container} = render(<MeterBar fraction={0.5} color={ADMIN_COLORS.accent} />);
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
