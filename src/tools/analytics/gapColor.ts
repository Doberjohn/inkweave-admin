import {COLORS} from '../../app-bridge';
import {fmtGap} from '../../ui/format';

/** fmtGap's text for a gap that rounds to zero (|gap| < 0.005): it carries no sign. */
const ZERO_GAP = '0.00';

/**
 * The color of a calibration gap (community score minus engine score), as the
 * verdict scale draws it: over-rating (negative) is the error, under-rating
 * (positive) the success, and no gap is neutral. A gap that prints "0.00"
 * counts as none, so a −0.004 never shows "0.00" in the over-rates red.
 */
export function gapColor(gap: number | null): string {
  if (gap == null || fmtGap(gap) === ZERO_GAP) return COLORS.textMuted;
  return gap < 0 ? COLORS.error : COLORS.success;
}
