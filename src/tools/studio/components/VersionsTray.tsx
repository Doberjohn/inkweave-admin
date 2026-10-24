import {useId, useRef, useState, type CSSProperties, type ReactNode, type RefObject} from 'react';
import {COLORS, CtaButton, LinkButton, SPACING} from '../../../app-bridge';
import {ForgetTokenOffer} from '../../../github/ForgetTokenOffer';
import {targetBranch} from '../../../github/githubCommit';
import {goLiveNote} from '../../../github/goLiveNote';
import {isRejectedToken} from '../../../github/rejectedToken';
import {focusNearRow, rowsWithout} from '../../../shell/rowFocus';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {Notice} from '../../../ui/Notice';
import {choiceLabel} from '../finishes/finishValues';
import {clashMessage} from '../finishes/publishVersions';
import {clashCount, hasClash, removalNote, type VersionChange, type VersionClash} from '../finishes/versionBatch';
import type {PublishResult, VersionBatchView} from '../finishes/versionBatchStore';
import {STUDIO_GAP} from '../studioStyles';

/*
 * The Version changes tray (#68): the studio's batch of version changes as rows, with the way out
 * of each (Revert, or Keep mine and Drop on a clash), Publish, and how the last publish ended. It
 * is props only: StudioWorkspace hands it the batch (useVersionBatch), the saved token and its
 * Forget token. Forgetting the token calls that and nothing else, so it never touches the batch.
 */

/*
 * The tray is two boxes of the studio's root, its panel and its foot, in a region that draws no box of
 * its own (display: contents; Chrome keeps the region, and all in it, in the accessibility tree). A
 * sticky box sticks only inside its parent's box, so a foot inside the panel would stick only while the
 * panel is in view. A box of the root, the foot sticks to the bottom of the view across the whole studio
 * while changes are staged or a publish runs (#74): Publish, which counts them, and what the tray says
 * of it (a failure, a clash, a batch this browser couldn't save) stay in view as the owner scrolls a
 * tall Edit card, while the rows scroll with the page.
 */
const REGION: CSSProperties = {display: 'contents'};

// A row of its own across the studio's root, under whichever pane shows, for the panel and for the foot.
// grid-column spans the wide grid's columns and flex fills a line of the narrow layout's wrapping row:
// each property applies in its own layout only, so the tray needs to know neither.
const OWN_ROW: CSSProperties = {gridColumn: '1 / -1', flex: '1 1 100%', minWidth: 0};
/** The edge of the tray's boxes: a studio panel's (STUDIO_PANEL). */
const EDGE = `1px solid ${ADMIN_COLORS.border}`;
// The heading and the rows: a studio panel, open at the bottom, where its foot closes it.
const PANEL: CSSProperties = {
  ...OWN_ROW,
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.md,
  padding: `${SPACING.xl}px ${SPACING.xl}px ${SPACING.md}px`,
  // A translucent fill under a border: clip it to the padding box (adminTheme.ts).
  backgroundColor: ADMIN_COLORS.card,
  backgroundClip: 'padding-box',
  borderTop: EDGE,
  borderRight: EDGE,
  borderLeft: EDGE,
  borderRadius: `${ADMIN_RADIUS.panel}px ${ADMIN_RADIUS.panel}px 0 0`,
};
/**
 * The foot's fill, which hides what scrolls under it once it sticks: the panel's tint over the page,
 * and the page under its border too, so the border lands where the panel's does (adminTheme.ts).
 */
export const TRAY_FOOT_FILL = `linear-gradient(${ADMIN_COLORS.card}, ${ADMIN_COLORS.card}) padding-box, ${ADMIN_COLORS.page}`;
// What the tray says of Publish, a line of its own when it says anything, then Publish and what the last
// publish said on a line, the words wrapping under the button where they don't fit. The foot closes the
// panel under a rule, the root's gap between the two taken back.
const FOOT: CSSProperties = {
  ...OWN_ROW,
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: `${SPACING.sm}px ${SPACING.lg}px`,
  marginTop: -STUDIO_GAP,
  padding: `${SPACING.md}px ${SPACING.xl}px`,
  background: TRAY_FOOT_FILL,
  border: EDGE,
  borderRadius: `0 0 ${ADMIN_RADIUS.panel}px ${ADMIN_RADIUS.panel}px`,
};
// While changes are staged, or a publish runs, the foot sticks to the bottom of the view, as the tuning
// aside's tray does. It comes after the panes, so it paints over them; its z-index keeps it over a card
// tile the pointer raises (the app's .card-tile:hover), which would otherwise paint over it where they meet.
const PINNED_FOOT: CSSProperties = {...FOOT, position: 'sticky', bottom: 0, zIndex: 1};
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
// A change and its buttons share a line, the buttons right after its words, so on a row as wide as the studio they
// still sit by what they act on (#74); they wrap under the change where the row is narrow.
const ROW: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: `${SPACING.xs}px ${SPACING.md}px`,
  padding: `${SPACING.sm}px ${SPACING.md}px`,
  // A translucent fill under a border: clip it to the padding box (adminTheme.ts).
  backgroundColor: ADMIN_COLORS.card,
  backgroundClip: 'padding-box',
  border: `1px solid ${ADMIN_COLORS.border}`,
  borderRadius: ADMIN_RADIUS.control,
};
// As wide as its words and no wider, so the buttons follow them; it shrinks to wrap them where they outrun the row.
const TEXT: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.xxs,
  flex: '0 1 auto',
  minWidth: 0,
};
const CHANGE: CSSProperties = {fontSize: ADMIN_TYPE.body, color: ADMIN_COLORS.text, overflowWrap: 'anywhere'};
// A line of small muted text: a change's removal note, and what stands where the rows go when there are none.
const MUTED_LINE: CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};
const CLASH: CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: COLORS.error};
const ACTIONS: CSSProperties = {display: 'flex', alignItems: 'center', gap: SPACING.md, flex: 'none'};
const ACTION: CSSProperties = {fontSize: ADMIN_TYPE.small};
// The notices above Publish, across the foot's whole width.
const NOTICES: CSSProperties = {flex: '1 1 100%', display: 'flex', flexDirection: 'column', gap: SPACING.md};
const FAILURE: CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.sm};
const STATUS: CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: COLORS.success};
const COMMIT_LINK: CSSProperties = {color: ADMIN_COLORS.accent};

/** What a landed publish tells the owner about when the printings show in the binder (on master: the app's deploy). */
const LIVE_NOTE = 'They show in the binder once the app has deployed: on staging only, for now.';

/** What a clash says of a printing the branch no longer holds in its primary home. */
const GONE = 'No longer in the data.';

/** What stands where the rows go when the tray shows with no change. */
const NO_CHANGES = 'No version changes';

/** What the tray says while this browser's storage refuses the batch: only the page holds the changes. */
const UNSAVED = "This browser couldn't save these changes. Publish them before you reload or close the tab.";

export interface VersionsTrayProps {
  /** The studio's batch and how the last publish ended, as `useVersionBatch` hands them over. */
  view: VersionBatchView;
  /** The saved GitHub token, which a publish is made with. */
  token: string;
  /** Forgets the saved token. Offered when GitHub rejects it (a 401) only; the page asks first where it must. */
  onForgetToken: () => void;
  /**
   * Holds the foot while it is pinned to the bottom of the view, and null otherwise (#74): the page
   * keeps a control that takes keyboard focus clear of it (keepClearOfFoot, StudioWorkspace).
   */
  pinnedFootRef?: RefObject<HTMLDivElement | null>;
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
function headingOf(tray: HTMLElement | null): HTMLElement | null {
  return tray?.querySelector<HTMLElement>('h2') ?? null;
}

/**
 * Where focus goes once a row's button is pressed, since the button goes with its row (or, for
 * Keep mine, with the place it had in it), as PendingTray's does (focusNearRow): the next row's
 * first button, else the previous row's, else the heading. The pressed row is never one of the
 * rows left, even where it stays: Keep mine's new Revert is not in the document yet. Every other
 * row's buttons are, since the action renders once the click is done.
 */
function focusAfterSettled({tray, index}: {tray: HTMLElement | null; index: number}) {
  focusNearRow({rows: rowsWithout(tray?.querySelector('ul'), index), index, fallback: headingOf(tray)});
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

interface NoticesProps {
  view: VersionBatchView;
  /** How many changes are clashed, and the id of the line that says so, which describes Publish. */
  clashes: number;
  clashId: string;
  onForgetToken: () => void;
}

/** What the tray has to say of Publish: each notice it shows, and whether it shows any. */
function noticesOf({view, clashes}: Pick<NoticesProps, 'view' | 'clashes'>) {
  const unsaved = view.unsaved && view.changes.length > 0;
  const clash = clashes > 0;
  const failure = view.error;
  return {unsaved, clash, failure, any: unsaved || clash || failure !== null};
}

/**
 * What the tray says above Publish, in its foot, so a pinned Publish keeps it in view (#74): that this
 * browser couldn't save the changes it lists, why Publish is held, and how the last publish failed.
 * The first is an alert: a reload would lose those changes, which the owner must know before it.
 * Nothing at all where there is nothing to say, so the foot is no taller then.
 */
function TrayNotices({view, clashes, clashId, onForgetToken}: NoticesProps) {
  const {unsaved, clash, failure, any} = noticesOf({view, clashes});
  if (!any) return null;
  return (
    <div style={NOTICES}>
      {unsaved && <Notice tone="error">{UNSAVED}</Notice>}
      {clash && <ClashNotice count={clashes} id={clashId} />}
      {failure !== null && <PublishFailure error={failure} onForgetToken={onForgetToken} />}
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

interface PublishProps extends Pick<VersionsTrayProps, 'pinnedFootRef'> {
  view: VersionBatchView;
  /** What the tray says of Publish (TrayNotices), above it. */
  notices: ReactNode;
  /** The id of the line that says why Publish is held, where one does. */
  describedBy: string | undefined;
  /** Publish was pressed: the tray publishes, unless Publish is held (`holdsPublish`). */
  onPublish: () => void;
}

/**
 * The tray's foot: what the tray says of Publish, Publish, and what the last publish said. Publish is
 * aria-disabled where it is held, so it keeps the focus a native disabled would drop; a click still
 * arrives then, and the tray does nothing with it. The notices come and go above it, in a place of
 * their own, so Publish stays the same button, with its focus. While changes are staged, or a publish
 * runs (another tab can empty the batch under it), the foot is pinned: it sticks to the bottom of the
 * view, and `pinnedFootRef` holds it for the page, which keeps a control that takes keyboard focus
 * elsewhere clear of it.
 */
function PublishBar({view, notices, describedBy, onPublish, pinnedFootRef}: PublishProps) {
  const pinned = view.changes.length > 0 || view.publishing;
  return (
    <div ref={pinned ? pinnedFootRef : undefined} style={pinned ? PINNED_FOOT : FOOT}>
      {notices}
      <CtaButton
        type="button"
        aria-disabled={holdsPublish(view) || undefined}
        aria-describedby={describedBy}
        onClick={onPublish}>
        {view.publishing ? 'Publishing…' : publishLabel(view.changes.length)}
      </CtaButton>
      <PublishStatus result={view.result} />
    </div>
  );
}

/**
 * The Version changes tray (#68), under whichever pane the studio shows: the batch of version
 * changes the Printings panel stages, as rows with their buttons, then a warning when this browser
 * couldn't save them, why Publish is held, how a failed publish failed, Publish and the publish
 * that landed. It renders nothing while there is nothing to say: no change, no publish under way,
 * nothing about the last one.
 *
 * Everything after the rows is its foot, under the panel. While changes are staged, or a publish runs,
 * the foot sticks to the bottom of the view, so Publish, which counts them, is in reach however far up
 * the page the owner is (#74), and what a press of it came to shows beside it; the rows scroll with the
 * page.
 * Once a publish lands, the batch is empty and the foot goes back under the panel.
 *
 * A button pressed on a row, or Discard all, takes itself out of the document, so focus moves on
 * first and never falls to <body> (R-48): to the next row's first button, else the previous
 * row's, else the heading. The heading takes it from Discard all. Publish stays where it is.
 *
 * With the last change gone the heading would go too, were the tray to follow its rule: the store's
 * revert clears the outcome as well. So once the owner has pressed one of those buttons, or
 * Publish, the tray stays for the rest of its mount, empty or not, as PendingTray's empty state: a
 * publish that ends with nothing to show keeps it, and the focus on Publish. A batch that another
 * tab empties, with no press here, takes the tray away, as an empty batch keeps it from appearing
 * when the studio opens.
 *
 * A clash is told from the changes still marked, never from the store's `error`, which holds the
 * other failures only.
 */
export function VersionsTray({view, token, onForgetToken, pinnedFootRef}: VersionsTrayProps) {
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
    headingOf(trayRef.current)?.focus();
    view.discard();
  };
  const publish = () => {
    setPressed(true);
    if (!holdsPublish(view)) void view.publish(token);
  };
  return (
    <section ref={trayRef} aria-label="Version changes" style={REGION}>
      <div style={PANEL}>
        <TrayHeader count={view.changes.length} held={view.publishing} onDiscard={discard} />
        <ChangeRows view={view} onSettle={settle} />
      </div>
      <PublishBar
        view={view}
        notices={<TrayNotices view={view} clashes={clashes} clashId={clashId} onForgetToken={onForgetToken} />}
        describedBy={clashes > 0 ? clashId : undefined}
        onPublish={publish}
        pinnedFootRef={pinnedFootRef}
      />
    </section>
  );
}
