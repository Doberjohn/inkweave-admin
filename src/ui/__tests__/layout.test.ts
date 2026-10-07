import {describe, expect, it} from 'vitest';
import {SPACING} from '../../app-bridge';
import {twoUp} from '../layout';

describe('twoUp', () => {
  it('fits as many tracks as the row holds, each at least the given width, and stacks them below that', () => {
    expect(twoUp(346)).toEqual({
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 346px), 1fr))',
      gap: SPACING.xl,
      alignItems: 'start',
    });
    expect(twoUp(376).gridTemplateColumns).toBe('repeat(auto-fit, minmax(min(100%, 376px), 1fr))');
  });
});
