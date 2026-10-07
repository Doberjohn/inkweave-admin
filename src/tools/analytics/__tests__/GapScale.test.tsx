import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {COLORS} from '../../../app-bridge';
import {GapScale} from '../GapScale';

/** The track's marks: the centre tick, then the dot when there is one. */
function marks(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('[aria-hidden="true"] > div'));
}

describe('GapScale', () => {
  it('names its two ends and hides the track from assistive tech', () => {
    const {container} = render(<GapScale meanGap={0.75} color={COLORS.success} />);
    expect(screen.getByText('over-rates')).toBeInTheDocument();
    expect(screen.getByText('under-rates')).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('puts the dot at the gap in the colour it is given, clamped to the ends', () => {
    const {container, rerender} = render(<GapScale meanGap={0.75} color={COLORS.success} />);
    expect(marks(container)[1]).toHaveStyle({left: '75%', backgroundColor: COLORS.success});
    rerender(<GapScale meanGap={-3} color={COLORS.error} />);
    expect(marks(container)[1]).toHaveStyle({left: '0%', backgroundColor: COLORS.error});
  });

  it('draws only the centre tick without a gap', () => {
    const {container} = render(<GapScale meanGap={null} color={COLORS.textMuted} />);
    expect(marks(container)).toHaveLength(1);
    expect(marks(container)[0]).toHaveStyle({left: '50%'});
  });
});
