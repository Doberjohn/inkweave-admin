import {useId, useRef, useState, type CSSProperties} from 'react';
import {COLORS, CtaButton, LinkButton, SPACING} from '../../../app-bridge';
import {ForgetTokenOffer} from '../../../github/ForgetTokenOffer';
import {targetBranch} from '../../../github/githubCommit';
import {goLiveNote} from '../../../github/goLiveNote';
import {isRejectedToken} from '../../../github/rejectedToken';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {Notice} from '../../../ui/Notice';
import {choiceLabel} from '../finishes/finishValues';
import {clashMessage} from '../finishes/publishVersions';
import {clashCount, hasClash, removalNote, type VersionChange, type VersionClash} from '../finishes/versionBatch';
import type {PublishResult, VersionBatchView} from '../finishes/versionBatchStore';
import {STUDIO_PANEL} from '../studioStyles';

/*
 * The Version changes tray (#68): the studio's batch of version changes as rows, with the way out
 * of each (Revert, or Keep mine and Drop on a clash), Publish, and how the last publish ended. It
 * is props only: StudioWorkspace hands it the batch (useVersionBatch), the saved token and its
 * Forget token. Forgetting the token calls that and nothing else, so it never touches the batch.
 */

// A row of its own across the studio's root, under whichever pane shows. grid-column spans the wide
// grid's columns and flex fills a line of the narrow layout's wrapping row: each property applies
// in its own layout only, so the tray needs to know neither.
const TRAY: CSSProperties = {
  ...STUDIO_PANEL,
  gridColumn: '1 / -1',
  flex: '1 1 100%',
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.md,
  padding: SPACING.xl,
};
const HEAD: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: SPACING.md,
};
const HEADING: CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.body, fontWeight: 700, color: ADMIN_COLORS.text};
const LIST: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.sm,
};
// A change and its buttons share a line; the buttons wrap under the change where the row is narrow.
const ROW: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: `${SPACING.xs}px ${SPACING.md}px`,
  padding: `${SPACING.sm}px ${SPACING.md}px`,
  // A translucent fill under a border: clip it to the padding box (adminTheme.ts).
  backgroundColor: ADMIN_COLORS.card,
  backgroundClip: 'padding-box',
  border: `1px solid ${ADMIN_COLORS.border}`,
  borderRadius: ADMIN_RADIUS.control,
};
const TEXT: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.xxs,
  flex: '1 1 240px',
  minWidth: 0,
};
const CHANGE: CSSProperties = {fontSize: ADMIN_TYPE.body, color: ADMIN_COLORS.text, overflowWrap: 'anywhere'};
// A line of small muted text: a change's removal note, and what stands where the rows go when there are none.
const MUTED_LINE: CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};
const CLASH: CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: COLORS.error};
const ACTIONS: CSSProperties = {display: 'flex', alignItems: 'center', gap: SPACING.md, flex: 'none'};
const ACTION: CSSProperties = {fontSize: ADMIN_TYPE.small};
const FAILURE: CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.sm};
// Publish and what the last publish said sit on a line, the words wrapping under the button where they don't fit.
const FOOT: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: `${SPACING.sm}px ${SPACING.lg}px`,
};
const STATUS: CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: COLORS.success};
const COMMIT_LINK: CSSProperties = {color: ADMIN_COLORS.accent};

/** What a landed publish tells the owner about when the printings show in the binder (on master: the app's deploy). */
const LIVE_NOTE = 'They show in the binder once the app has deployed: on staging only, for now.';

/** What a clash says of a printing the branch no longer holds in its primary home. */
const GONE = 'No longer in the data.';

/** What stands where the rows go when the tray shows with no change. */
const NO_CHANGES = 'No version changes';

export interface VersionsTrayProps {
  /** The studio's batch and how the last publish ended, as `useVersionBatch` hands them over. */
  view: VersionBatchView;
  /** The saved GitHub token, which a publish is made with. */
  token: string;
  /** Forgets the saved token. Offered when GitHub rejects it (a 401) only; the page asks first where it must. */
  onForgetToken: () => void;
}

/** "1 change", "2 changes". */
function numberOfChanges(count: number): string {
  return `${count} change${count === 1 ? '' : 's'}`;
}

/** The Publish button's words: how many changes it writes, where there are some, and where. */
function publishLabel(count: number): string {
  return count === 0 ? `Publish to ${targetBranch()}` : `Publish ${numberOfChanges(count)} to ${targetBranch()}`;
}

/** What a clash says: what the printing shows on the branch now, or that the branch no longer has it. */
function clashLine({gone, shownNow}: VersionClash): string {
  return gone ? GONE : `Changed on ${targetBranch()} since: now ${choiceLabel(shownNow)}.`;
}

/** Whether the tray has anything to say: changes to publish, a publish under way, or how the last one ended. */
function showsTray({changes, publishing, result, error}: VersionBatchView): boolean {
  return changes.length > 0 || publishing || result !== null || error !== null;
}

/** Whether Publish is held: a publish is under way, nothing is staged, or a clash is open. */
function holdsPublish(view: VersionBatchView): boolean {
  return view.publishing || view.changes.length === 0 || hasClash(view);
}

/** The tray's heading, which takes focus when no row is left to take it (a press keeps it in the document). */
function focusHeading(tray: HTMLElement | null) {
  tray?.querySelector<HTMLElement>('h2')?.focus();
}

/**
 * Where focus goes once a row's button is pressed, since the button goes with its row (or, for
 * Keep mine, with the place it had in it), as PendingTray's does: the next row's first button,
 * else the previous row's, else the heading. Every row's buttons are still in the document: the
 * action renders once the click is done.
 */
function focusAfterSettled({tray, index}: {tray: HTMLElement | null; index: number}) {
  const rows = tray?.querySelector('ul')?.children;
  const neighbour = rows?.[index + 1] ?? rows?.[index - 1];
  const button = neighbour?.querySelector<HTMLElement>('button');
  if (button) button.focus();
  else focusHeading(tray);
}

interface ItemProps {
  change: VersionChange;
  /** A publish is under way: it has the changes it sent, so none is taken back or settled until it ends. */
  held: boolean;
  onRevert: () => void;
  onKeep: () => void;
}

/**
 * A change's way out. A clash replaces Revert with Keep mine, which keeps the change on top of what
 * the branch has now and is not offered for a printing that is gone, and Drop, which is a revert.
 * Each is named by its change, so a list of buttons tells apart, and each name starts with the
 * words the button shows (2.5.3).
 */
function RowActions({change, held, onRevert, onKeep}: ItemProps) {
  const {label, clash} = change;
  if (!clash) {
    return (
      <LinkButton
        type="button"
        tone="muted"
        aria-label={`Revert ${label}`}
        disabled={held}
        onClick={onRevert}
        style={ACTION}>
        Revert
      </LinkButton>
    );
  }
  return (
    <>
      {!clash.gone && (
        <LinkButton
          type="button"
          aria-label={`Keep mine for ${label}`}
          disabled={held}
          onClick={onKeep}
          style={ACTION}>
          Keep mine
        </LinkButton>
      )}
      <LinkButton
        type="button"
        tone="muted"
        aria-label={`Drop ${label}`}
        disabled={held}
        onClick={onRevert}
        style={ACTION}>
        Drop
      </LinkButton>
    </>
  );
}

/**
 * One change: the printing and the versions it goes from and to, what it takes away, what a clash
 * found, and its buttons.
 */
function ChangeItem(props: ItemProps) {
  const {change} = props;
  const note = removalNote(change);
  return (
    <li style={ROW}>
      <div style={TEXT}>
        <span style={CHANGE}>{`${change.label}: ${choiceLabel(change.shownFrom)} → ${choiceLabel(change.to)}`}</span>
        {note !== null && <p style={MUTED_LINE}>{note}</p>}
        {change.clash && <p style={CLASH}>{clashLine(change.clash)}</p>}
      </div>
      <div style={ACTIONS}>
        <RowActions {...props} />
      </div>
    </li>
  );
}

interface RowsProps {
  view: VersionBatchView;
  /** Runs a row's action, after moving focus on from the button pressed (R-48). */
  onSettle: (index: number, act: () => void) => void;
}

/** The changes in the order they were staged, one item each, or the line that says there are none. */
function ChangeRows({view, onSettle}: RowsProps) {
  if (view.changes.length === 0) return <p style={MUTED_LINE}>{NO_CHANGES}</p>;
  return (
    <ul style={LIST}>
      {view.changes.map((change, index) => (
        <ChangeItem
          key={change.id}
          change={change}
          held={view.publishing}
          onRevert={() => onSettle(index, () => view.revert(change.id))}
          onKeep={() => onSettle(index, () => view.keep(change.id))}
        />
      ))}
    </ul>
  );
}

interface HeaderProps {
  count: number;
  held: boolean;
  onDiscard: () => void;
}

/** "Version changes · 2", and Discard all while there is anything to discard. */
function TrayHeader({count, held, onDiscard}: HeaderProps) {
  return (
    <div style={HEAD}>
      <h2 tabIndex={-1} style={HEADING}>
        Version changes · {count}
      </h2>
      {count > 0 && (
        <LinkButton type="button" tone="muted" disabled={held} onClick={onDiscard} style={ACTION}>
          Discard all
        </LinkButton>
      )}
    </div>
  );
}

/**
 * Why Publish is held, from the changes still marked: the count is theirs, so the line goes with
 * the last mark whichever way the owner settles it, and a reload or another tab shows it too. Its
 * id names it as the description of the held button.
 */
function ClashNotice({count, id}: {count: number; id: string}) {
  return (
    <div id={id}>
      <Notice tone="error">{clashMessage(count)}</Notice>
    </div>
  );
}

/**
 * A failed publish as the store worded it (the branch moved, GitHub refused), with the way out for
 * a rejected token (R-26).
 */
function PublishFailure({error, onForgetToken}: {error: string; onForgetToken: () => void}) {
  return (
    <div style={FAILURE}>
      <Notice tone="error">{error}</Notice>
      {isRejectedToken(error) && <ForgetTokenOffer onForget={onForgetToken} />}
    </div>
  );
}

/**
 * The live region, mounted with the tray so what it says is announced when it arrives: a live
 * region mounted with its text often isn't (PendingTray's). It holds the publish that landed.
 */
function PublishStatus({result}: {result: PublishResult | null}) {
  return (
    <p role="status" style={STATUS}>
      {result && (
        <>
          <span>Published {numberOfChanges(result.count)}.</span>{' '}
          <a href={result.commitUrl} target="_blank" rel="noreferrer" style={COMMIT_LINK}>
            View commit
          </a>
          . {goLiveNote(LIVE_NOTE)}
        </>
      )}
    </p>
  );
}

interface PublishProps {
  view: VersionBatchView;
  token: string;
  /** The id of the line that says why Publish is held, where one does. */
  describedBy: string | undefined;
}

/**
 * Publish, and what the last publish said. It is aria-disabled where it is held, so it keeps the
 * focus a native disabled would drop; a click still arrives then, so it does nothing.
 */
function PublishBar({view, token, describedBy}: PublishProps) {
  const held = holdsPublish(view);
  const publish = () => {
    if (!held) void view.publish(token);
  };
  return (
    <div style={FOOT}>
      <CtaButton
        type="button"
        aria-disabled={held || undefined}
        aria-describedby={describedBy}
        onClick={publish}>
        {view.publishing ? 'Publishing…' : publishLabel(view.changes.length)}
      </CtaButton>
      <PublishStatus result={view.result} />
    </div>
  );
}

/**
 * The Version changes tray (#68), under whichever pane the studio shows: the batch of version
 * changes the Printings panel stages, as rows with their buttons, then why Publish is held, how a
 * failed publish failed, Publish and the publish that landed. It renders nothing while there is
 * nothing to say: no change, no publish under way, nothing about the last one.
 *
 * A button pressed on a row, or Discard all, takes itself out of the document, so focus moves on
 * first and never falls to <body> (R-48): to the next row's first button, else the previous
 * row's, else the heading. The heading takes it from Discard all. Publish stays where it is.
 *
 * With the last change gone the heading would go too, were the tray to follow its rule: the store's
 * revert clears the outcome as well. So once the owner has pressed one of those buttons the tray
 * stays for the rest of its mount, empty or not, as PendingTray's empty state. A batch that
 * another tab empties, with no press here, takes the tray away, as an empty batch keeps it from
 * appearing when the studio opens.
 *
 * A clash is told from the changes still marked, never from the store's `error`, which holds the
 * other failures only.
 */
export function VersionsTray({view, token, onForgetToken}: VersionsTrayProps) {
  const trayRef = useRef<HTMLElement>(null);
  const clashId = useId();
  // Set by the handlers of the buttons above, never by render.
  const [pressed, setPressed] = useState(false);
  if (!pressed && !showsTray(view)) return null;
  const clashes = clashCount(view);
  const settle = (index: number, act: () => void) => {
    setPressed(true);
    focusAfterSettled({tray: trayRef.current, index});
    act();
  };
  const discard = () => {
    setPressed(true);
    focusHeading(trayRef.current);
    view.discard();
  };
  return (
    <section ref={trayRef} aria-label="Version changes" style={TRAY}>
      <TrayHeader count={view.changes.length} held={view.publishing} onDiscard={discard} />
      <ChangeRows view={view} onSettle={settle} />
      {clashes > 0 && <ClashNotice count={clashes} id={clashId} />}
      {view.error !== null && <PublishFailure error={view.error} onForgetToken={onForgetToken} />}
      <PublishBar view={view} token={token} describedBy={clashes > 0 ? clashId : undefined} />
    </section>
  );
}
