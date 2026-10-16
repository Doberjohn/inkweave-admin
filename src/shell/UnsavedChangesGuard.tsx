import {useRef, useState} from 'react';
import type {Location} from 'react-router-dom';
import {CtaButton, DialogShell, FONTS, SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../theme/adminTheme';
import {useUnsavedChangesGuard, type LeavesPage} from './useUnsavedChangesGuard';

/** What a dialog asks with: its title, and its two answers. */
export interface UnsavedWords {
  /** The heading, and the dialog's accessible name. */
  title: string;
  /** The first answer, which keeps the edits: Escape and the scrim answer it too. */
  stay: string;
  /** The second answer, which lets the navigation through and drops them. */
  leave: string;
}

/** The words for a navigation that leaves the page: /calibration's, and the studio's when it leaves Card studio. */
const LEAVE_PAGE: UnsavedWords = {title: 'Leave this page?', stay: 'Stay on this page', leave: 'Leave this page'};

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

/** A question in full: its words, and what leaving loses. */
export interface UnsavedQuestion extends UnsavedWords {
  /** What leaving loses, e.g. "2 pending tuning edits aren't published yet. Leaving this page drops them." */
  message: string;
}

interface UnsavedChangesDialogProps {
  open: boolean;
  /** What leaving loses, e.g. "2 pending tuning edits aren't published yet. Leaving this page drops them." */
  message: string;
  /** The title and answers; by default a page leave's ("Leave this page?"). */
  words?: UnsavedWords;
  onStay: () => void;
  onLeave: () => void;
}

const PARTS: readonly (keyof UnsavedQuestion)[] = ['title', 'message', 'stay', 'leave'];

/** Whether two questions say the same thing, part by part. */
function sameQuestion(a: UnsavedQuestion, b: UnsavedQuestion): boolean {
  return PARTS.every((part) => a[part] === b[part]);
}

/**
 * The words the dialog shows. While it is open they follow the question: a
 * publish that fails mid-question turns the in-flight wording back into the
 * unsaved one. While it fades out they stay as they were, title and answers
 * too: the hold is over by then, so a line worded for the held navigation has
 * nothing left to name, and a page whose edits just cleared would word it
 * differently.
 */
function useWordsShown({open, question}: {open: boolean; question: UnsavedQuestion}): UnsavedQuestion {
  const [shown, setShown] = useState(question);
  if (open && !sameQuestion(question, shown)) setShown(question);
  return shown;
}

/**
 * Asks whether to leave a page with unsaved edits, in the app's DialogShell:
 * the overlay contract (focus trap, Escape, focus restore, scroll lock, a scrim
 * that closes). Every way out but the leave answer ("Leave this page") stays:
 * the stay answer ("Stay on this page"), Escape and the scrim. Focus opens on
 * the message, so a screen reader reads what leaving loses and no single key
 * press leaves. The app's trap counts the message as sitting before the first
 * button (for Doberjohn/inkweave#732), so Tab reaches the stay answer first,
 * and Shift+Tab goes to the leave answer, never out of the dialog. A page
 * words the title and answers for what its hold keeps (`words`): the studio's
 * card change stays on the page, so it asks "Leave this card?" (R4-8c).
 */
export function UnsavedChangesDialog({open, message, words = LEAVE_PAGE, onStay, onLeave}: UnsavedChangesDialogProps) {
  const shown = useWordsShown({open, question: {...words, message}});
  const messageRef = useRef<HTMLParagraphElement>(null);
  return (
    <DialogShell
      isOpen={open}
      onClose={onStay}
      ariaLabel={shown.title}
      size="sm"
      initialFocusRef={messageRef}
      panelStyle={PANEL}>
      <h2 style={HEADING}>{shown.title}</h2>
      <p ref={messageRef} tabIndex={-1} style={MESSAGE}>
        {shown.message}
      </p>
      <div style={ACTIONS}>
        <CtaButton type="button" onClick={onStay} style={ACTION}>
          {shown.stay}
        </CtaButton>
        <CtaButton type="button" variant="neutral" onClick={onLeave} style={ACTION}>
          {shown.leave}
        </CtaButton>
      </div>
    </DialogShell>
  );
}

/**
 * What leaving loses: one line (/calibration's), or a line worded for where the
 * held navigation goes (R-58: the studio's card change names only the Edit
 * draft). A line asks in a page leave's words; a function may return a whole
 * question instead, for a hold that keeps the page (R4-8c: the studio's card
 * change asks "Leave this card?"). The guard asks only while a navigation is
 * held, and the open dialog shows what it returns, so a function words every
 * target it gets, even one that no longer drops anything.
 */
export type UnsavedMessage = string | ((to: Location) => string | UnsavedQuestion);

/** What the navigation held now asks; nothing while nothing is held, when the dialog keeps its last. */
function askedFor(message: UnsavedMessage, to: Location | null): string | UnsavedQuestion {
  if (typeof message === 'string') return message;
  return to ? message(to) : '';
}

/** The question in full: a line alone asks in a page leave's words. */
function questionFor(message: UnsavedMessage, to: Location | null): UnsavedQuestion {
  const asked = askedFor(message, to);
  return typeof asked === 'string' ? {...LEAVE_PAGE, message: asked} : asked;
}

/**
 * Lets go of focus before the leave answer lets the held navigation through
 * (R-59). The button stays mounted while the dialog fades out, so focus left
 * on it reads as moved, and the view that takes the page's handoff (the
 * studio's search, or the next card's banner) would leave it there, to fall
 * to <body> once the dialog unmounts. DialogShell still hands focus back to
 * the control that opened the dialog if that control is still mounted, as a
 * sidebar link is.
 */
function releaseFocus(): void {
  (document.activeElement as HTMLElement | null)?.blur();
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
  const {message: line, ...words} = questionFor(message, guard.to);
  const leave = () => {
    releaseFocus();
    guard.leave();
  };
  return <UnsavedChangesDialog open={guard.blocked} message={line} words={words} onStay={guard.stay} onLeave={leave} />;
}
