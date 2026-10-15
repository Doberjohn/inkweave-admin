import {useRef} from 'react';
import {SPACING, LinkButton} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {Panel} from '../../../ui/Panel';
import {changeCount, type ChangeRow} from '../changeRows';

interface ChangeListProps {
  /** changeRows' result (R4-2b): the changed fields in the form's order, then the staged image. */
  rows: readonly ChangeRow[];
  /** Drops every edit and the staged image (the controller's discard). There is no per-row revert (R-77). */
  onDiscard: () => void;
  /**
   * A save is running (the controller's `saving`): Discard is held, as Save is.
   * Discarding mid-save would put back the pre-save form, which reads as a change
   * undoing the save once it lands on the new baseline (R-70, R4-4c's hand-off).
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
const LABEL: React.CSSProperties = {fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};
// The whole diff, wrapped, as R2's tray prints one: a card text is the edit under review, so it is never cut short.
const DIFF: React.CSSProperties = {
  display: 'block',
  fontSize: ADMIN_TYPE.label,
  color: ADMIN_COLORS.text,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};
const NOTE: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

function ChangeItem({row}: {row: ChangeRow}) {
  return (
    <li style={ROW}>
      <span style={LABEL}>{row.label}</span>
      {/* <code> gives the diff the UA monospace with no font declaration (R-7). */}
      <code style={DIFF}>{`${row.from} → ${row.to}`}</code>
    </li>
  );
}

function ChangeRows({rows, empty}: {rows: readonly ChangeRow[]; empty: string}) {
  if (rows.length === 0) return <p style={NOTE}>{empty}</p>;
  return (
    <ul style={LIST}>
      {rows.map((row) => (
        <ChangeItem key={row.id} row={row} />
      ))}
    </ul>
  );
}

/**
 * Edit card's pending edits as a diff, before Save: "{N} changes" over one
 * row per change, the staged image's last, and Discard, which drops them all
 * (R-77), held while a save runs. Discard empties the list and takes its own
 * button with it, so focus moves to the heading first, never to <body> (R-48,
 * as R2's Clear all does).
 */
export function ChangeList({rows, onDiscard, busy, imageOnly}: ChangeListProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const discard = () => {
    rootRef.current?.querySelector<HTMLElement>('h2')?.focus();
    onDiscard();
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
        <ChangeRows rows={rows} empty={imageOnly ? IMAGE_ONLY_EMPTY : EMPTY} />
      </Panel>
    </div>
  );
}
