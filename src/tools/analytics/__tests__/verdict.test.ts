import {describe, expect, it} from 'vitest';
import {COLORS} from '../../../app-bridge';
import {CALIBRATION_BAND, scalePercent, verdictFor} from '../verdict';

describe('verdictFor', () => {
  it('has no verdict without a gap', () => {
    expect(verdictFor(null)).toEqual({
      word: 'not enough data',
      phrase: 'has too few score votes to judge',
      wordColor: COLORS.textMuted,
      numberColor: COLORS.textMuted,
    });
  });

  it('reads well-calibrated inside the band, with a neutral number', () => {
    for (const gap of [-0.49, -0.3, 0, 0.3, 0.49]) {
      expect(verdictFor(gap)).toEqual({
        word: 'well-calibrated',
        phrase: 'is well-calibrated',
        wordColor: COLORS.success,
        numberColor: COLORS.textMuted,
      });
    }
  });

  it('runs generous from the band edge down, all in the over-rates colour', () => {
    expect(verdictFor(-CALIBRATION_BAND)).toEqual({
      word: 'runs generous',
      phrase: 'runs generous',
      wordColor: COLORS.error,
      numberColor: COLORS.error,
    });
    expect(verdictFor(-0.93).word).toBe('runs generous');
  });

  it('runs harsh from the band edge up, all in the under-rates colour', () => {
    expect(verdictFor(CALIBRATION_BAND)).toEqual({
      word: 'runs harsh',
      phrase: 'runs harsh',
      wordColor: COLORS.success,
      numberColor: COLORS.success,
    });
    expect(verdictFor(0.7).word).toBe('runs harsh');
  });
});

describe('scalePercent', () => {
  it('has no position without a gap', () => {
    expect(scalePercent(null)).toBeNull();
  });

  it('centres no gap and scales linearly out to the clamp', () => {
    expect(scalePercent(0)).toBe(50);
    expect(scalePercent(0.75)).toBe(75);
    expect(scalePercent(-1.5)).toBe(0);
  });

  it('pins gaps beyond the clamp to the ends', () => {
    expect(scalePercent(2.44)).toBe(100);
    expect(scalePercent(-3)).toBe(0);
  });
});
