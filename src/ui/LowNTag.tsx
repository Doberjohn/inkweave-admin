import {SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../theme/adminTheme';

/**
 * The "low n" tag: a number that rests on fewer than `minVotes` score votes is
 * thin evidence. The caller decides when it shows and passes its threshold
 * (calibrationModel's LOW_N, which is MIN_RULE_VOTES), and its row's
 * accessible name should say "low n" too, since the tag is only text beside a
 * name. It is RawTag's chip, kept from shrinking in a flex row. Moved from
 * RulesTable (R3-1a).
 */
export function LowNTag({minVotes}: {minVotes: number}) {
  return (
    <span
      title={`Fewer than ${minVotes} score votes`}
      style={{
        flex: 'none',
        fontSize: ADMIN_TYPE.micro,
        fontWeight: 500,
        lineHeight: 1.4,
        color: ADMIN_COLORS.muted,
        border: `1px solid ${ADMIN_COLORS.strongBorder}`,
        borderRadius: ADMIN_RADIUS.tag,
        padding: `0 ${SPACING.xs}px`,
      }}>
      low n
    </span>
  );
}
