import {describe, expect, it} from 'vitest';
import {STUDIO_WIDE_MIN, studioLayout} from '../studioLayout';

describe('studioLayout', () => {
  it('is narrow before the studio is measured, and below the wide minimum', () => {
    expect(studioLayout(0)).toBe('narrow');
    expect(studioLayout(STUDIO_WIDE_MIN - 1)).toBe('narrow');
  });

  it('is wide from the minimum up', () => {
    expect(STUDIO_WIDE_MIN).toBe(1360);
    expect(studioLayout(STUDIO_WIDE_MIN)).toBe('wide');
  });
});
