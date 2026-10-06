import {describe, expect, it} from 'vitest';
import {render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {CalibrationCard} from '../CalibrationCard';

// The scale's dot is the card's only round element. Ported from VerdictHero.test.tsx,
// which retired with the hero (R2-7): the card now draws the only gap scale.
const DOT = '[style*="border-radius: 50%"]';

describe('CalibrationCard', () => {
  it('marks the gap on the scale, and leaves the mark out when there is no data', () => {
    // The card's "Open calibration" link needs a router.
    const {container, rerender} = render(<CalibrationCard meanGap={-0.3} accuracySentiment={null} />, {
      wrapper: MemoryRouter,
    });
    const dots = container.querySelectorAll(DOT);
    expect(dots).toHaveLength(1);
    // scalePercent(-0.3): 0.3 of the 1.5 clamp left of centre.
    expect(dots[0]).toHaveStyle({left: '40%'});

    rerender(<CalibrationCard meanGap={null} accuracySentiment={null} />);
    expect(container.querySelectorAll(DOT)).toHaveLength(0);
  });
});
