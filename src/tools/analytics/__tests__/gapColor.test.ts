import {describe, expect, it} from 'vitest';
import {COLORS} from '../../../app-bridge';
import {fmtGap} from '../../../ui/format';
import {gapColor} from '../gapColor';

describe('gapColor', () => {
  it('reds an over-rating, greens an under-rating', () => {
    expect(gapColor(-0.3)).toBe(COLORS.error);
    expect(gapColor(0.83)).toBe(COLORS.success);
  });

  it('mutes no gap, an exact zero and any gap that prints "0.00"', () => {
    expect(gapColor(null)).toBe(COLORS.textMuted);
    expect(gapColor(0)).toBe(COLORS.textMuted);
    for (const gap of [-0.004, 0.004]) {
      expect(fmtGap(gap)).toBe('0.00');
      expect(gapColor(gap), String(gap)).toBe(COLORS.textMuted);
    }
  });

  it('colours a gap from ±0.005, the first that prints a sign', () => {
    expect(fmtGap(-0.005)).toBe('−0.01');
    expect(gapColor(-0.005)).toBe(COLORS.error);
    expect(fmtGap(0.005)).toBe('+0.01');
    expect(gapColor(0.005)).toBe(COLORS.success);
  });
});
