import {COLORS} from '../../app-bridge';

/**
 * The color of a calibration gap (community score minus engine score), as the
 * verdict scale draws it: over-rating (negative) is the error, under-rating
 * (positive) the success, and no gap is neutral.
 */
export function gapColor(gap: number | null): string {
  if (gap == null || gap === 0) return COLORS.textMuted;
  return gap < 0 ? COLORS.error : COLORS.success;
}
