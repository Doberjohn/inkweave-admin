import {useLayoutEffect, useRef, type RefObject} from 'react';
import {CtaButton, SPACING} from '../../../app-bridge';
import {useFocusHandoff, useTakeHandoff, type FocusHandoff} from '../../../shell/focusHandoff';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {Notice} from '../../../ui/Notice';
import {Panel} from '../../../ui/Panel';
import {SegmentedControl} from '../../../ui/SegmentedControl';
import {Tag} from '../../../ui/Tag';
import {CHOICE_OPTIONS, choiceOf, type FinishChoice} from '../finishes/finishValues';
import type {PrintingRow} from '../finishes/printingRows';
import type {BranchPrintings} from '../finishes/useBranchPrintings';
import type {VersionChange} from '../finishes/versionBatch';

/** A row's art: 28px wide, and as tall as a card's own proportions make it (the search draws 34 × 48). */
const THUMB_WIDTH = 28;
const THUMB_HEIGHT = 40;
/**
 * What a row's two parts ask for. The choices keep 280px: the three buttons share it, and "Normal
 * only" needs about 80px of it. The name and its marker ask for 140px. Where a row is narrower
 * than the two with the gap between, the choices wrap under the name instead of squeezing it, and
 * on a phone they shrink to the line. The 224px phone slot still fits the three on one line (176px
 * inside the panel, 172px needed): only in a slot under 220px do their buttons wrap two and one
 * (SegmentedControl's fill).
 */
const IDENTITY_BASIS = 140;
const CONTROL_BASIS = 280;

const LIST: React.CSSProperties = {listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column'};
const ITEM: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: `${SPACING.sm}px ${SPACING.md}px`,
  padding: `${SPACING.sm}px 0`,
};
// A rule between rows, as the search's list draws them.
const RULED: React.CSSProperties = {borderTop: `1px solid ${ADMIN_COLORS.divider}`};
const IDENTITY: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: SPACING.md,
  flex: `1 1 ${IDENTITY_BASIS}px`,
  minWidth: 0,
};
// The marker wraps under a long name rather than run into the choices.
const NAMES: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: `${SPACING.xs}px ${SPACING.sm}px`,
  minWidth: 0,
};
const NAME: React.CSSProperties = {fontSize: ADMIN_TYPE.body, color: ADMIN_COLORS.text, overflowWrap: 'anywhere'};
const CONTROL: React.CSSProperties = {flex: `0 1 ${CONTROL_BASIS}px`, minWidth: 0};
// The empty box shows until the art loads, and stays for a printing with none.
const THUMB: React.CSSProperties = {
  display: 'block',
  flex: 'none',
  width: THUMB_WIDTH,
  height: THUMB_HEIGHT,
  overflow: 'hidden',
  borderRadius: ADMIN_RADIUS.tag,
  backgroundColor: ADMIN_COLORS.card,
};
const THUMB_IMAGE: React.CSSProperties = {display: 'block', width: '100%', height: '100%', objectFit: 'cover'};
const FAILED: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.sm};
const RETRY: React.CSSProperties = {alignSelf: 'flex-start'};

/** What a row says about where its versions stand: one word, and what it means on hover. */
interface Marker {
  text: string;
  title: string;
}

const MARKERS = {
  clash: {
    text: 'Clash',
    title: "The branch changed this printing's versions after you staged this change: keep it or drop it in Version changes",
  },
  pending: {text: 'Pending', title: 'Staged in Version changes, not published yet'},
  data: {text: 'In the data', title: "The branch's card data names this printing's versions"},
  rarity: {text: 'By rarity', title: "The card data names none, so the printing's rarity gives them"},
} as const satisfies Record<string, Marker>;

/** The row's one marker: a clash, a staged change, or where its versions come from now. */
function markerOf({row, pending}: {row: PrintingRow; pending: VersionChange | undefined}): Marker {
  if (pending?.clash) return MARKERS.clash;
  if (pending) return MARKERS.pending;
  return row.value === null ? MARKERS.rarity : MARKERS.data;
}

/** A printing's art, or its empty box. Decoration: the row's text names the printing. */
function Thumb({src}: {src: string | undefined}) {
  return (
    <span style={THUMB}>
      {src && <img src={src} alt="" width={THUMB_WIDTH} height={THUMB_HEIGHT} loading="lazy" style={THUMB_IMAGE} />}
    </span>
  );
}

export interface PrintingsPanelProps {
  /** The card's printings from the target branch's files: still being read, failed, or the rows. */
  view: BranchPrintings;
  /** The studio's batch of version changes, for every card: the panel reads the ones for its own printings. */
  changes: readonly VersionChange[];
  /**
   * A publish of the batch is under way. It has the changes it sent, so every choice is held until
   * it ends: one made meanwhile could take back a change it is writing. Default false.
   */
  publishing?: boolean;
  /** The owner chose versions for a printing. The panel stages nothing itself: it shows what `changes` holds. */
  onChoose: (opts: {row: PrintingRow; choice: FinishChoice}) => void;
}

interface ItemProps {
  row: PrintingRow;
  /** The row's change in the batch, if it has one. */
  pending: VersionChange | undefined;
  /** Whether a row comes before it, which a rule then separates. */
  ruled: boolean;
  /** Its choices are held: a publish runs, or the files are read again after one. */
  held: boolean;
  onChoose: PrintingsPanelProps['onChoose'];
}

/**
 * One printing: its art, its name, its marker, and the choice of versions. A staged change shows
 * the versions it writes in place of the ones the row shows, and the marker "Pending", or "Clash"
 * where a publish found the printing changed on the branch. Choosing again changes only what the
 * change writes: it keeps its base, and a clash its mark, which Keep mine or Drop in the tray
 * settles (`withChange`).
 */
function PrintingItem({row, pending, ruled, held, onChoose}: ItemProps) {
  const marker = markerOf({row, pending});
  return (
    <li style={ruled ? {...ITEM, ...RULED} : ITEM}>
      <div style={IDENTITY}>
        <Thumb src={row.thumbnail} />
        <div style={NAMES}>
          <span style={NAME}>{row.name}</span>
          <Tag title={marker.title}>{marker.text}</Tag>
        </div>
      </div>
      {/* The group is named by its printing, so the rows' groups tell apart; fill lets its buttons wrap in a narrow slot. */}
      <div style={CONTROL}>
        <SegmentedControl
          options={CHOICE_OPTIONS}
          value={choiceOf(pending ? pending.to : row.shown)}
          onChange={(choice) => onChoose({row, choice})}
          ariaLabel={`Versions of ${row.label}`}
          fill
          held={held}
        />
      </div>
    </li>
  );
}

/**
 * Asks for the panel's handoff when the list leaves the document with the focus in it: a read of
 * the files that fails after a publish takes the rows away, and the focus on a choice would fall to
 * <body> (R-48). A layout effect's cleanup runs before React takes the nodes out, so the focus is
 * still where it was when it checks.
 */
function useHandoffWhenGone(list: RefObject<HTMLElement | null>, handoff: FocusHandoff) {
  const request = useRef(handoff.request);
  useLayoutEffect(() => {
    request.current = handoff.request;
  });
  useLayoutEffect(() => {
    const element = list.current;
    return () => {
      if (element?.contains(document.activeElement)) request.current();
    };
  }, [list]);
}

interface RowsProps extends Pick<PrintingsPanelProps, 'changes' | 'onChoose'> {
  rows: readonly PrintingRow[];
  /** A publish runs: the rows are held. */
  publishing: boolean;
  /** The rows are the last read's, while the files are read again after a publish: held, and the list busy. */
  refreshing: boolean;
  handoff: FocusHandoff;
}

function PrintingRows({rows, changes, onChoose, publishing, refreshing, handoff}: RowsProps) {
  const listRef = useRef<HTMLUListElement>(null);
  useHandoffWhenGone(listRef, handoff);
  const held = publishing || refreshing;
  return (
    <ul ref={listRef} style={LIST} aria-busy={refreshing || undefined}>
      {rows.map((row, index) => (
        <PrintingItem
          key={row.ref.id}
          row={row}
          pending={changes.find((change) => change.id === row.ref.id)}
          ruled={index > 0}
          held={held}
          onChoose={onChoose}
        />
      ))}
    </ul>
  );
}

/**
 * A read that failed, and its way out. Reading again swaps this for the loading line, taking its
 * own button with it, so the press asks for the handoff, which the panel's next view takes (R-48).
 */
function ReadError({error, onRetry}: {error: string; onRetry: () => void}) {
  return (
    <div style={FAILED}>
      <Notice tone="error">Could not read the printings: {error}.</Notice>
      <CtaButton type="button" variant="neutral" onClick={onRetry} style={RETRY}>
        Read the files again
      </CtaButton>
    </div>
  );
}

/** The panel's body for each state of the read. */
function PrintingsBody({view, changes, publishing = false, onChoose, handoff}: PrintingsPanelProps & {handoff: FocusHandoff}) {
  switch (view.status) {
    case 'loading':
      return <Notice>Loading the printings…</Notice>;
    case 'error': {
      const onRetry = () => {
        handoff.request();
        view.retry();
      };
      return <ReadError error={view.error} onRetry={onRetry} />;
    }
    case 'ready':
      return (
        <PrintingRows
          rows={view.rows}
          changes={changes}
          onChoose={onChoose}
          publishing={publishing}
          refreshing={view.refreshing === true}
          handoff={handoff}
        />
      );
  }
}

/**
 * Edit card's Printings panel for a released card (#68): one row for each pocket the binder holds
 * for it, with the versions it shows and a choice of Both, Foil only or Normal only. A choice is
 * staged, never committed: the studio's batch holds it, the Version changes tray lists it, and one
 * publish writes it. The panel is props only, so it knows neither the files nor the batch.
 *
 * While a publish runs every choice is held, and once it lands or clashes the rows stay, held, with
 * the list busy, until the branch's files are read again; then they show what was read, and are
 * live again. Held choices are aria-disabled, so one with the focus keeps it, and the list never
 * collapses to the loading line between the two.
 *
 * It outlives the swap between its views, so it holds the focus handoff for "Read the files
 * again", whose button goes the moment the read starts: the new button takes it if the files
 * fail again, and the heading once they are in (R-48). It asks for it on that press, and when the
 * rows go with the focus in them, as they do when the read after a publish fails: the button then
 * takes it.
 */
export function PrintingsPanel({view, changes, publishing, onChoose}: PrintingsPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const handoff = useFocusHandoff();
  useTakeHandoff(handoff, ref, view.status === 'error' ? 'button' : 'h2', view.status !== 'loading');
  return (
    <div ref={ref}>
      <Panel title="Printings" titleFocusable>
        <PrintingsBody view={view} changes={changes} publishing={publishing} onChoose={onChoose} handoff={handoff} />
      </Panel>
    </div>
  );
}
