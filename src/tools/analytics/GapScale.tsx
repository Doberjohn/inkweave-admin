import type {CSSProperties} from 'react';
import {COLORS, SPACING, hexRgba} from '../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../theme/adminTheme';
import {scalePercent} from './verdict';

/**
 * The track tints toward the over-rates colour on the left and the under-rates
 * colour on the right: COLORS.error and COLORS.success, as verdictFor and
 * gapColor use them.
 */
const TRACK = `linear-gradient(90deg, ${hexRgba(COLORS.error, 0.35)}, ${ADMIN_COLORS.barTrack} 30%, ${ADMIN_COLORS.barTrack} 70%, ${hexRgba(COLORS.success, 0.35)})`;

const SCALE_LABEL: CSSProperties = {fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted};

export interface GapScaleProps {
  meanGap: number | null;
  color: string;
}

/**
 * The diverging over/under scale: a centre tick, and a dot at the mean gap
 * (clamped by scalePercent), left out when there is no gap. Every caller
 * prints the gap as text beside the track (the Overview card's hero number,
 * for one), so the track is hidden from assistive tech.
 */
export function GapScale({meanGap, color}: GapScaleProps) {
  const dot = scalePercent(meanGap);
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: SPACING.md}}>
      <span style={SCALE_LABEL}>over-rates</span>
      <div
        aria-hidden="true"
        style={{position: 'relative', flex: 1, height: 6, borderRadius: ADMIN_RADIUS.tag, background: TRACK}}>
        <div style={{position: 'absolute', left: '50%', top: -4, width: 1, height: 14, background: ADMIN_COLORS.muted}} />
        {dot != null && (
          <div
            style={{
              position: 'absolute',
              left: `${dot}%`,
              top: -3,
              width: 12,
              height: 12,
              boxSizing: 'border-box',
              borderRadius: '50%',
              background: color,
              border: `2px solid ${ADMIN_COLORS.page}`,
              transform: 'translateX(-50%)',
            }}
          />
        )}
      </div>
      <span style={SCALE_LABEL}>under-rates</span>
    </div>
  );
}
