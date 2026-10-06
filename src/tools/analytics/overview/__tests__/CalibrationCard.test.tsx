import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {COLORS} from '../../../../app-bridge';
import {CalibrationCard} from '../CalibrationCard';

// The scale's dot is the card's only round element. GapScale.test.tsx covers the track
// itself; this checks that the card passes its gap through.
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

  // R-50: the headline is a sentence for every gap, never "The engine well-calibrated".
  it.each<[number | null, string, string]>([
    [-0.3, 'is well-calibrated', COLORS.success],
    [-0.93, 'runs generous', COLORS.error],
    [0.7, 'runs harsh', COLORS.success],
    [null, 'has too few score votes to judge', COLORS.textMuted],
  ])('finishes "The engine …" for a gap of %s: %s', (meanGap, phrase, color) => {
    render(<CalibrationCard meanGap={meanGap} accuracySentiment={null} />, {wrapper: MemoryRouter});
    expect(screen.getByText('The engine').textContent).toBe(`The engine ${phrase}`);
    expect(screen.getByText(phrase)).toHaveStyle({color});
  });
});
