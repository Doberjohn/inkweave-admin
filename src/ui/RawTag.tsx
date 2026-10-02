import {SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../theme/adminTheme';

/**
 * Marks a number computed from the raw vote log (vote-log.json) rather than
 * the aggregates, as KpiCard's `tag`. Pages hide those numbers when the
 * artifact has no raw votes. The tag is informative, so it takes the muted
 * colour (R-6).
 */
export function RawTag() {
  return (
    <span
      title="From the raw vote log"
      style={{
        fontSize: ADMIN_TYPE.micro,
        fontWeight: 500,
        lineHeight: 1.4,
        color: ADMIN_COLORS.muted,
        border: `1px solid ${ADMIN_COLORS.strongBorder}`,
        borderRadius: ADMIN_RADIUS.tag,
        padding: `0 ${SPACING.xs}px`,
      }}>
      raw
    </span>
  );
}
