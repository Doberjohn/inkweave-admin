import {useRef} from 'react';
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
 * Asks whether to leave a page with unsaved edits, in the app's DialogShell:
 * the overlay contract (focus trap, Escape, focus restore, scroll lock, a scrim
 * that closes). Every way out but "Leave this page" stays: the Stay button,
 * Escape and the scrim. Focus opens on the message, so a screen reader reads
 * what leaving loses and no single key press leaves; Tab reaches "Stay on this
 * page" first, and Shift+Tab goes to "Leave this page", never out of the dialog.
 */
export function UnsavedChangesDialog({open, message, onStay, onLeave}: UnsavedChangesDialogProps) {
  const messageRef = useRef<HTMLParagraphElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  // Focus opens on the message, which the app's trap does not count as its first
  // control, so Shift+Tab would climb out of the dialog. Send it to the last button.
  const wrapBackwards = (event: React.KeyboardEvent) => {
    if (event.key !== 'Tab' || !event.shiftKey) return;
    event.preventDefault();
    (actionsRef.current?.lastElementChild as HTMLElement | null)?.focus();
  };
  return (
    <DialogShell
      isOpen={open}
      onClose={onStay}
      ariaLabel={TITLE}
      size="sm"
      initialFocusRef={messageRef}
      panelStyle={PANEL}>
      <h2 style={HEADING}>{TITLE}</h2>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the message holds focus on open (focus trap) */}
      <p ref={messageRef} tabIndex={-1} onKeyDown={wrapBackwards} style={MESSAGE}>
        {message}
      </p>
      <div ref={actionsRef} style={ACTIONS}>
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

interface UnsavedChangesGuardProps {
  /** The page holds edits that leaving would lose. */
  dirty: boolean;
  message: string;
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
  return <UnsavedChangesDialog open={guard.blocked} message={message} onStay={guard.stay} onLeave={guard.leave} />;
}
