import {useRef} from 'react';
import {SPACING, LinkButton} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {Panel} from '../../../ui/Panel';
import {changeCount, type ChangeRow} from '../changeRows';

type RowId = ChangeRow['id'];

interface ChangeListProps {
  /** changeRows' result (R4-2b): the changed fields in the form's order, then the staged image. */
  rows: readonly ChangeRow[];
  /** Drops every edit and the staged image (the controller's discard). */
  onDiscard: () => void;
  /**
   * Takes back one row (the controller's revertRow), and answers the ids of
   * the rows the list keeps. A revert can take other rows with it: a stat the
   * new type doesn't print comes back only with the type, which takes back
   * the Type row and every stat only the type changed. So focus moves to a
   * row that stays.
   */
  onRevert: (id: RowId) => readonly RowId[];
  /**
   * A save is running (the controller's `saving`): Discard and every Revert
   * are held, as Save is. Taking an edit back mid-save would put back the
   * pre-save form, which reads as a change undoing the save once it lands on
   * the new baseline (R-70, R4-4c's hand-off).
   */
  busy?: boolean;
  /**
   * The open card is image-only (released, unnumbered, other-set or
   * unrepresentable; R-61, R-65): no field can change here, so the empty list
   * asks only for an image. The Edit pane passes it while it shows no form.
   */
  imageOnly?: boolean;
}

/** What the list says before anything changes (dc.html:262), and on a card whose fields can't change here. */
const EMPTY = 'Edit any field or replace the image. Changes are listed here before you save.';
const IMAGE_ONLY_EMPTY = "Replace the image to make a change. It's listed here before you save.";

const LIST: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.sm,
};
const ROW: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.xxs,
  padding: `${SPACING.sm}px ${SPACING.md}px`,
  // A translucent fill under a border: clip it to the padding box (adminTheme.ts).
  backgroundColor: ADMIN_COLORS.card,
  backgroundClip: 'padding-box',
  border: `1px solid ${ADMIN_COLORS.border}`,
  borderRadius: ADMIN_RADIUS.control,
};
// The label and its Revert share a line, so the diff below keeps the row's whole width.
const HEAD: React.CSSProperties = {display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md};
const LABEL: React.CSSProperties = {fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};
const ACTION: React.CSSProperties = {flexShrink: 0, fontSize: ADMIN_TYPE.small};
// The whole diff, wrapped, as R2's tray prints one: a card text is the edit under review, so it is never cut short.
const DIFF: React.CSSProperties = {
  display: 'block',
  fontSize: ADMIN_TYPE.label,
  color: ADMIN_COLORS.text,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};
const NOTE: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

interface ItemProps {
  row: ChangeRow;
  busy?: boolean;
  onRevert: () => void;
}

function ChangeItem({row, busy, onRevert}: ItemProps) {
  return (
    <li style={ROW}>
      <div style={HEAD}>
        <span style={LABEL}>{row.label}</span>
        {/* Named by its row, so the list's buttons tell apart; the name starts with the word it shows (2.5.3). */}
        <LinkButton type="button" tone="muted" aria-label={`Revert ${row.label}`} disabled={busy} onClick={onRevert} style={ACTION}>
          Revert
        </LinkButton>
      </div>
      {/* <code> gives the diff the UA monospace with no font declaration (R-7). */}
      <code style={DIFF}>{`${row.from} → ${row.to}`}</code>
    </li>
  );
}

interface RowsProps {
  rows: readonly ChangeRow[];
  empty: string;
  busy?: boolean;
  onRevert: (index: number) => void;
}

function ChangeRows({rows, empty, busy, onRevert}: RowsProps) {
  if (rows.length === 0) return <p style={NOTE}>{empty}</p>;
  return (
    <ul style={LIST}>
      {rows.map((row, index) => (
        <ChangeItem key={row.id} row={row} busy={busy} onRevert={() => onRevert(index)} />
      ))}
    </ul>
  );
}

/** A revert as the list saw it: its rows then, the reverted row's place, and the ids onRevert answered. */
interface Reverted {
  rows: readonly ChangeRow[];
  index: number;
  kept: readonly RowId[];
}

/**
 * Where focus goes once a row is reverted, since its button goes with it, as
 * R2's tray does (focusAfterRevert): the next row's Revert, else the previous
 * row's, else the list's heading. Only a row the list keeps counts, so a row
 * the revert takes too never gets it. Every button is still in the document:
 * the revert renders once the click is done.
 */
function focusAfterRevert(root: HTMLElement | null, {rows, index, kept}: Reverted) {
  const keeps = (row: ChangeRow) => kept.includes(row.id);
  const next = rows.slice(index + 1).find(keeps) ?? rows.slice(0, index).reverse().find(keeps);
  const item = next ? root?.querySelectorAll('li')[rows.indexOf(next)] : undefined;
  (item?.querySelector<HTMLElement>('button') ?? root?.querySelector<HTMLElement>('h2'))?.focus();
}

/**
 * Edit card's pending edits as a diff, before Save: "{N} changes" over one
 * row per change, the staged image's last. Each row's Revert takes it back,
 * with every row the fields it restores also feed (revertDraftRow,
 * Doberjohn/inkweave-admin#52), and Discard drops them all (R-77). Both are
 * held while a save runs. Either takes the button pressed with it, so focus
 * moves on as it acts, never to <body> (R-48): a Revert's to a row the list
 * keeps, else to the heading, and Discard's to the heading, as R2's Clear all
 * does.
 */
export function ChangeList({rows, onDiscard, onRevert, busy, imageOnly}: ChangeListProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const discard = () => {
    rootRef.current?.querySelector<HTMLElement>('h2')?.focus();
    onDiscard();
  };
  const revert = (index: number) => {
    const kept = onRevert(rows[index].id);
    focusAfterRevert(rootRef.current, {rows, index, kept});
  };
  const action =
    rows.length > 0 ? (
      // Named for what it drops; the name starts with the word it shows (2.5.3).
      <LinkButton
        type="button"
        tone="muted"
        aria-label="Discard all changes"
        disabled={busy}
        onClick={discard}
        style={{fontSize: ADMIN_TYPE.small}}>
        Discard
      </LinkButton>
    ) : undefined;
  return (
    <div ref={rootRef}>
      <Panel title={changeCount(rows)} titleFocusable action={action}>
        <ChangeRows rows={rows} empty={imageOnly ? IMAGE_ONLY_EMPTY : EMPTY} busy={busy} onRevert={revert} />
      </Panel>
    </div>
  );
}
