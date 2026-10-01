import {useId} from 'react';
import {SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../theme/adminTheme';

interface PanelProps {
  /** The panel's h2, which also names it as a region. */
  title?: string;
  /** The right end of the header row: a link, a control or a caption. */
  action?: React.ReactNode;
  children: React.ReactNode;
  /**
   * Default true. False drops the body padding so a table or list runs edge to
   * edge; the header then keeps its own padding and a divider underneath.
   */
  padded?: boolean;
}

/**
 * The surface the insights pages are built from: a bordered panel with an
 * optional header row (the h2 title on the left, an action on the right). A
 * titled panel is a named region, so screen-reader users can move between
 * panels the way they move between headings.
 */
export function Panel({title, action, children, padded = true}: PanelProps) {
  const titleId = useId();
  const hasHeader = Boolean(title) || action != null;
  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: padded ? SPACING.md : 0,
        minWidth: 0,
        // The translucent fill stops at the border, so the edge stays on the
        // ladder (R1-2). Not the `background` shorthand: it would reset the clip.
        backgroundColor: ADMIN_COLORS.card,
        backgroundClip: 'padding-box',
        border: `1px solid ${ADMIN_COLORS.border}`,
        borderRadius: ADMIN_RADIUS.panel,
        padding: padded ? SPACING.xl : 0,
        // A flush table's corners would poke past the radius.
        overflow: padded ? undefined : 'hidden',
      }}>
      {hasHeader && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: SPACING.md,
            ...(padded
              ? {}
              : {padding: `${SPACING.section}px ${SPACING.lg}px`, borderBottom: `1px solid ${ADMIN_COLORS.border}`}),
          }}>
          {title && (
            <h2 id={titleId} style={{margin: 0, fontSize: ADMIN_TYPE.body, fontWeight: 700, color: ADMIN_COLORS.text}}>
              {title}
            </h2>
          )}
          {action != null && (
            <div style={{marginLeft: 'auto', fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>{action}</div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
