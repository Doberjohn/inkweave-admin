import {describe, expect, it} from 'vitest';
import {render} from '@testing-library/react';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {BiasBar} from '../BiasBar';

/** The fill is the one element that says which way it leans. */
function fillOf(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[data-direction]');
}

describe('BiasBar', () => {
  it('leans left in the over-rates colour for a negative gap', () => {
    const {container} = render(<BiasBar gap={-1} />);
    const fill = fillOf(container);
    expect(fill).toHaveAttribute('data-direction', 'over');
    // 1 / 2.5 of a half-track = 20% of the whole track.
    expect(fill).toHaveStyle({right: '50%', width: '20%', background: ADMIN_COLORS.over});
  });

  it('leans right in the under-rates colour for a positive gap', () => {
    const {container} = render(<BiasBar gap={0.5} />);
    const fill = fillOf(container);
    expect(fill).toHaveAttribute('data-direction', 'under');
    expect(fill).toHaveStyle({left: '50%', width: '10%', background: ADMIN_COLORS.under});
  });

  it.each([4, -10])('clamps a gap of %s to the end of its half', (gap) => {
    const {container} = render(<BiasBar gap={gap} />);
    expect(fillOf(container)).toHaveStyle({width: '50%'});
  });

  it('takes its full scale from the scale prop', () => {
    const {container} = render(<BiasBar gap={1} scale={1} />);
    expect(fillOf(container)).toHaveStyle({width: '50%'});
  });

  it.each([null, 0])('draws only the track and tick for a gap of %s', (gap) => {
    const {container} = render(<BiasBar gap={gap} />);
    expect(fillOf(container)).toBeNull();
  });

  it('is hidden from assistive tech, since the gap is printed beside it', () => {
    const {container} = render(<BiasBar gap={-1} />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
