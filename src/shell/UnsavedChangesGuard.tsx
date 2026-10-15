import {useRef, useState} from 'react';
import type {Location} from 'react-router-dom';
import {CtaButton, DialogShell, FONTS, SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../theme/adminTheme';
import {useUnsavedChangesGuard, type LeavesPage} from './useUnsavedChangesGuard';

const TITLE = 'Leave this page?';

// DialogShell draws the app's surface. Admin's panel is the card fill layered
// over the page instead: opaque, as adminTheme.ts asks of anything that hides
// what is under it.
const PANEL: React.CSSProperties = {
  padding: SPACING.xl,
  background: `linear-gradient(${ADMIN_COLORS.card}, ${ADMIN_COLORS.card}), ${ADMIN_COLORS.page}`,
  border: `1px solid ${ADMIN_COLORS.strongBorder}`,
  borderRadius: ADMIN_RADIUS.panel,
  color: ADMIN_COLORS.text,
  fontFamily: FONTS.body,
};

const HEADING: React.CSSProperties = {
  margin: 0,
  fontFamily: FONTS.hero,
  fontSize: ADMIN_TYPE.sectionTitle,
  fontWeight: 400,
  lineHeight: 1.2,
};

// The message takes focus when the dialog opens, so a screen reader reads it.
// It is no control, so it draws no focus ring (DialogShell's panel draws none either).
const MESSAGE: React.CSSProperties = {
  margin: `${SPACING.sm}px 0 0`,
  fontSize: ADMIN_TYPE.body,
  lineHeight: 1.5,
  color: ADMIN_COLORS.muted,
  outline: 'none',
};

const ACTIONS: React.CSSProperties = {display: 'flex', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xl};
const ACTION: React.CSSProperties = {flex: '1 1 auto'};

interface UnsavedChangesDialogProps {
  open: boolean;
  /** What leaving loses, e.g. "2 pending tuning edits aren't published yet. Leaving this page drops them." */
  message: string;
  onStay: () => void;
  onLeave: () => void;
}

/**
 * The words the dialog shows. While it is open they follow `message`: a publish
 * that fails mid-question turns the in-flight wording back into the unsaved one.
 * While it fades out they stay as they were: the hold is over by then, so a line
 * worded for the held navigation has nothing left to name, and a page whose
 * edits just cleared would word it differently.
 */
function useWordsShown({open, message}: Pick<UnsavedChangesDialogProps, 'open' | 'message'>): string {
  const [shown, setShown] = useState(message);
  if (open && message !== shown) setShown(message);
  return shown;
}

/**
 * Asks whether to leave a page with unsaved edits, in the app's DialogShell:
 * the overlay contract (focus trap, Escape, focus restore, scroll lock, a scrim
 * that closes). Every way out but "Leave this page" stays: the Stay button,
 * Escape and the scrim. Focus opens on the message, so a screen reader reads
 * what leaving loses and no single key press leaves. The app's trap counts the
 * message as sitting before the first button (Doberjohn/inkweave#769, for
 * #732), so Tab reaches "Stay on this page" first, and Shift+Tab goes to
 * "Leave this page", never out of the dialog.
 */
export function UnsavedChangesDialog({open, message, onStay, onLeave}: UnsavedChangesDialogProps) {
  const words = useWordsShown({open, message});
  const messageRef = useRef<HTMLParagraphElement>(null);
  return (
    <DialogShell
      isOpen={open}
      onClose={onStay}
      ariaLabel={TITLE}
      size="sm"
      initialFocusRef={messageRef}
      panelStyle={PANEL}>
      <h2 style={HEADING}>{TITLE}</h2>
      <p ref={messageRef} tabIndex={-1} style={MESSAGE}>
        {words}
      </p>
      <div style={ACTIONS}>
        <CtaButton type="button" onClick={onStay} style={ACTION}>
          Stay on this page
        </CtaButton>
        <CtaButton type="button" variant="neutral" onClick={onLeave} style={ACTION}>
          Leave this page
        </CtaButton>
      </div>
    </DialogShell>
  );
}

/**
 * What leaving loses: one line (/calibration's), or a line worded for where the
 * held navigation goes (R-58: the studio's card change names only the Edit
 * draft). The guard asks for the line only while a navigation is held, and the
 * open dialog shows what it returns, so a function words every target it gets,
 * even one that no longer drops anything.
 */
export type UnsavedMessage = string | ((to: Location) => string);

/** The line for the navigation held now; none while nothing is held, when the dialog keeps its last. */
function messageFor(message: UnsavedMessage, to: Location | null): string {
  if (typeof message === 'string') return message;
  return to ? message(to) : '';
}

interface UnsavedChangesGuardProps {
  /** The page holds edits that leaving would lose. */
  dirty: boolean;
  message: UnsavedMessage;
  /** Which navigations leave (R4's card change in Edit). Defaults to a new pathname. */
  leaves?: LeavesPage;
}

/**
 * The one line a page with unsaved edits mounts (decision R-19): it asks before
 * a link or the browser's Back leaves them, and has the browser ask before a tab
 * close or reload. One per page, under a data router (useUnsavedChangesGuard).
 */
export function UnsavedChangesGuard({dirty, message, leaves}: UnsavedChangesGuardProps) {
  const guard = useUnsavedChangesGuard(dirty, leaves);
  return (
    <UnsavedChangesDialog
      open={guard.blocked}
      message={messageFor(message, guard.to)}
      onStay={guard.stay}
      onLeave={guard.leave}
    />
  );
}
