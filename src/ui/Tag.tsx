import {SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../theme/adminTheme';

const TAG: React.CSSProperties = {
  flex: 'none',
  fontSize: ADMIN_TYPE.micro,
  fontWeight: 500,
  lineHeight: 1.4,
  whiteSpace: 'nowrap',
  color: ADMIN_COLORS.muted,
  border: `1px solid ${ADMIN_COLORS.strongBorder}`,
  borderRadius: ADMIN_RADIUS.tag,
  padding: `0 ${SPACING.xs}px`,
};

interface TagProps {
  /** A word or two, lowercase ("raw", "low n", "preview"), that says enough without the title. */
  children: React.ReactNode;
  /** What the tag means, on hover. */
  title?: string;
}

/**
 * A small informative chip beside a name or a number, never a control: muted
 * text in a thin box (R-6). It keeps its size in a flex row and never wraps.
 * RawTag, LowNTag and Card studio's tags are this chip (R4-5f).
 */
export function Tag({children, title}: TagProps) {
  return (
    <span title={title} style={TAG}>
      {children}
    </span>
  );
}
