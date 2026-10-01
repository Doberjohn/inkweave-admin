import {SPACING, hexRgba} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../theme/adminTheme';
import {fmtScore} from './format';

/**
 * The band tint. The 2026-10-01 review measured the over-rates red at 4.4:1 on
 * the handoff's .12 tint and 4.6:1 at .08; 12px bold text needs 4.5:1.
 */
const TINT = 0.08;

const PILL: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  minWidth: 28,
  height: 24,
  padding: `0 ${SPACING.sm}px`,
  borderRadius: ADMIN_RADIUS.control,
  fontSize: ADMIN_TYPE.small,
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
};

/** 7 and up reads high (the under-rates colour), 4 and below low (over-rates), 5 and 6 neutral. */
function bandColors(score: number): React.CSSProperties {
  if (score >= 7) return {color: ADMIN_COLORS.under, background: hexRgba(ADMIN_COLORS.under, TINT)};
  if (score <= 4) return {color: ADMIN_COLORS.over, background: hexRgba(ADMIN_COLORS.over, TINT)};
  return {color: ADMIN_COLORS.text, background: ADMIN_COLORS.barTrack};
}

/**
 * A community score (1 to 10) as a coloured pill; an average shows one
 * decimal. A quick vote has no score (null): its pill is a neutral dash,
 * named "No score" for screen readers, and never takes a band colour.
 */
export function ScorePill({score}: {score: number | null}) {
  if (score == null) {
    return (
      <span role="img" aria-label="No score" style={{...PILL, color: ADMIN_COLORS.muted, background: ADMIN_COLORS.barTrack}}>
        {fmtScore(null)}
      </span>
    );
  }
  // Band the value the pill shows, so an average that rounds to "7.0" reads high and one that rounds to "4.0" low.
  const digits = Number.isInteger(score) ? 0 : 1;
  const shown = Number(score.toFixed(digits));
  return <span style={{...PILL, ...bandColors(shown)}}>{fmtScore(shown, digits)}</span>;
}
