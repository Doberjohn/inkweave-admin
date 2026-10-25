import {FONTS, SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../theme/adminTheme';

// DialogShell draws the app's surface. Admin's panel is the card fill layered
// over the page instead: opaque, as adminTheme.ts asks of anything that hides
// what is under it. UnsavedChangesGuard's dialog and a Featured cards slot's
// search both pass it as DialogShell's panelStyle.
export const DIALOG_PANEL: React.CSSProperties = {
  padding: SPACING.xl,
  background: `linear-gradient(${ADMIN_COLORS.card}, ${ADMIN_COLORS.card}), ${ADMIN_COLORS.page}`,
  border: `1px solid ${ADMIN_COLORS.strongBorder}`,
  borderRadius: ADMIN_RADIUS.panel,
  color: ADMIN_COLORS.text,
  fontFamily: FONTS.body,
};

/** An admin dialog's title, in the hero face. */
export const DIALOG_HEADING: React.CSSProperties = {
  margin: 0,
  fontFamily: FONTS.hero,
  fontSize: ADMIN_TYPE.sectionTitle,
  fontWeight: 400,
  lineHeight: 1.2,
};
