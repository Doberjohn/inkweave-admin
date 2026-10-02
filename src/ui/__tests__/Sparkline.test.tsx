import {describe, expect, it} from 'vitest';
import {render} from '@testing-library/react';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {Sparkline} from '../Sparkline';

describe('Sparkline', () => {
  it('renders nothing for fewer than two points: a line needs two', () => {
    for (const data of [[], [5]]) {
      const {container, unmount} = render(<Sparkline data={data} />);
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });

  it('draws one vertex per point in the accent colour, hidden from assistive tech', () => {
    const {container} = render(<Sparkline data={[3, 9, 4, 12]} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('height', '56');
    const line = container.querySelector('polyline');
    expect(line?.getAttribute('points')?.split(' ')).toHaveLength(4);
    expect(line).toHaveAttribute('stroke', ADMIN_COLORS.accent);
  });

  it('takes a colour and a height', () => {
    const {container} = render(<Sparkline data={[1, 2]} color={ADMIN_COLORS.barNeutral} height={28} />);
    expect(container.querySelector('svg')).toHaveAttribute('height', '28');
    expect(container.querySelector('polyline')).toHaveAttribute('stroke', ADMIN_COLORS.barNeutral);
    expect(container.querySelector('polygon')).toHaveAttribute('fill', ADMIN_COLORS.barNeutral);
  });

  it('keeps an all-zero series on the floor instead of dividing by zero', () => {
    const {container} = render(<Sparkline data={[0, 0, 0]} height={28} />);
    // The floor is the height less the 4px pad.
    expect(container.querySelector('polyline')).toHaveAttribute('points', '0.00,24.00 50.00,24.00 100.00,24.00');
  });
});
