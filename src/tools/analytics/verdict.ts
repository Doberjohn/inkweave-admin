import {COLORS} from '../../app-bridge';

/** Within this magnitude the engine reads as well-calibrated; a small lean is noted in the read line, not the headline. */
export const CALIBRATION_BAND = 0.5;
/** meanGap is clamped to +/- this before positioning the scale dot. */
export const SCALE_CLAMP = 1.5;

export interface Verdict {
  word: string;
  wordColor: string;
  numberColor: string;
}

/**
 * One band drives the verb, number, and dot, so they never contradict each
 * other. Within +/-CALIBRATION_BAND the engine is "well-calibrated" (green verb,
 * neutral-toned number/dot); beyond it the verb, number, and dot all take the
 * over-rates (error) or under-rates (success) color together. The read line
 * (biasCopy) is finer on purpose: it names a lean from +/-0.25, so a -0.3 gap
 * reads "well-calibrated" with the lean noted underneath. The Overview's
 * calibration card and the calibration page's subtitle (calibrationSubtitle)
 * both read it.
 */
export function verdictFor(meanGap: number | null): Verdict {
  if (meanGap == null) return {word: 'not enough data', wordColor: COLORS.textMuted, numberColor: COLORS.textMuted};
  if (Math.abs(meanGap) < CALIBRATION_BAND) {
    return {word: 'well-calibrated', wordColor: COLORS.success, numberColor: COLORS.textMuted};
  }
  const dirColor = meanGap < 0 ? COLORS.error : COLORS.success;
  return {word: meanGap < 0 ? 'runs generous' : 'runs harsh', wordColor: dirColor, numberColor: dirColor};
}

/**
 * Where the scale's dot sits, as a percentage of the track from its
 * over-rates end: 50 at no gap, the ends at +/-SCALE_CLAMP and beyond. Null
 * when there is no gap to mark.
 */
export function scalePercent(meanGap: number | null): number | null {
  if (meanGap == null) return null;
  const clamped = Math.max(-SCALE_CLAMP, Math.min(SCALE_CLAMP, meanGap));
  return 50 + (clamped / SCALE_CLAMP) * 50;
}
