import {SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../theme/adminTheme';

// Fills go in as backgroundColor: a `background` shorthand would reset the clip.
// Only the info fill is translucent, so only it is clipped to the padding box
// (R1-2); errorBg is opaque.
const TONES = {
  info: {
    backgroundColor: ADMIN_COLORS.panel,
    backgroundClip: 'padding-box',
    border: `1px dashed ${ADMIN_COLORS.strongBorder}`,
    color: ADMIN_COLORS.muted,
  },
  error: {backgroundColor: ADMIN_COLORS.errorBg, border: `1px solid ${ADMIN_COLORS.errorBorder}`, color: ADMIN_COLORS.text},
} as const;

interface NoticeProps {
  /** 'info' (default): loading, empty and setup states. 'error': a failed load, announced as an alert. */
  tone?: 'info' | 'error';
  children: React.ReactNode;
}

/**
 * A full-width message box: the dashed info box for "Loading analytics...",
 * "No events tracked yet." and the setup notices, or the red error box for a
 * failed load. Only the error tone is a live region (role="alert").
 */
export function Notice({tone = 'info', children}: NoticeProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      style={{
        ...TONES[tone],
        borderRadius: ADMIN_RADIUS.panel,
        padding: `${SPACING.section}px ${SPACING.lg}px`,
        fontSize: ADMIN_TYPE.body,
        lineHeight: 1.5,
      }}>
      {children}
    </div>
  );
}
