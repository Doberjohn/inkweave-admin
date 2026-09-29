import {describe, expect, it} from 'vitest';
import {render} from '@testing-library/react';
import {VerdictHero} from '../VerdictHero';

// The scale's dot is its only round element.
const DOT = '[style*="border-radius: 50%"]';

describe('VerdictHero', () => {
  it('marks the gap on the scale, and leaves the mark out when there is no data', () => {
    const {container, rerender} = render(<VerdictHero meanGap={-0.3} accuracySentiment={null} />);
    expect(container.querySelectorAll(DOT)).toHaveLength(1);

    rerender(<VerdictHero meanGap={null} accuracySentiment={null} />);
    expect(container.querySelectorAll(DOT)).toHaveLength(0);
  });
});
