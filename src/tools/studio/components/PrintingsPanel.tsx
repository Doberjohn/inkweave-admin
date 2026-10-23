import {Fragment, useLayoutEffect, useRef, useState, type ReactNode, type RefObject} from 'react';
import {Link} from 'react-router-dom';
import {CtaButton, DISABLED_STYLE, LinkButton, SPACING} from '../../../app-bridge';
import {useFocusHandoff, useTakeHandoff, type FocusHandoff} from '../../../shell/focusHandoff';
import {studioHref} from '../../../shell/nav';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {Notice} from '../../../ui/Notice';
import {Panel} from '../../../ui/Panel';
import {SegmentedControl} from '../../../ui/SegmentedControl';
import {Tag} from '../../../ui/Tag';
import {CHOICE_OPTIONS, choiceOf, type FinishChoice} from '../finishes/finishValues';
import type {PrintingRow} from '../finishes/printingRows';
import type {BranchPrintings} from '../finishes/useBranchPrintings';
import type {VersionChange} from '../finishes/versionBatch';
import {outcomeShows} from '../outcomeShows';
import {parseNumber, type PromoSetOption} from '../promos/printingForm';
import {
  findPrinting,
  takenBy,
  type BaseCard,
  type CatalogPrinting,
  type FoundPrinting,
  type PromoCatalog,
} from '../promos/promoCatalog';
import type {OpenPrintingForm, PrintingFormController, PrintingOutcome} from '../promos/usePrintingForm';
import {CommitOutcome} from './CommitOutcome';
import {PromoPrintingForm, type PromoPrintingFormProps} from './PromoPrintingForm';

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

// The ready view and the failed one: the rows over what the panel offers under them (Add a printing, its
// form, or the Core copy's note), or the failure over the line the last publish left.
const VIEW: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.md};
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
// A promo row's Edit, after its marker, in the size of the panel's other small actions.
const EDIT: React.CSSProperties = {flexShrink: 0, fontSize: ADMIN_TYPE.small};
// A held Edit looks off as a held Add a printing does: LinkButton dims only a native disabled, which would drop the focus.
const HELD_EDIT: React.CSSProperties = {...EDIT, ...DISABLED_STYLE};
const CONTROL: React.CSSProperties = {flex: `0 1 ${CONTROL_BASIS}px`, minWidth: 0};
// An edit form hangs under its row with no rule between the two: the next row's rule closes it off.
const FORM_ITEM: React.CSSProperties = {padding: `0 0 ${SPACING.sm}px`};
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
// Add a printing over the line that says what the last publish came to.
const OFFER: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.sm};
const ADD: React.CSSProperties = {alignSelf: 'flex-start'};
const NOTE: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, lineHeight: 1.5, color: ADMIN_COLORS.muted};

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

/** What the panel needs to add and edit the card's promo printings (#77). */
export interface PromoPrintingsProps {
  /** The studio's printing form (usePrintingForm): the one form open, for the card the URL names. */
  controller: PrintingFormController;
  /** The card as the catalog files its promos: Add a printing adds one of it. */
  card: BaseCard;
  /** On a Sets 1 to 8 card a Core card reprints: the Core copy, whose panel holds the card's promos. */
  coreCopy: {id: string; name: string} | null;
  /** The promo sets a form offers, newest first. */
  promoSets: readonly PromoSetOption[];
  /** R-26's Forget token, which a form offers when GitHub rejects the token. */
  onForgetToken: () => void;
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
  /**
   * Adding and editing the card's promo printings (#77): Add a printing under the rows and an Edit on
   * each promo row, once the view holds the branch's catalog. Without it, or before the catalog is
   * read, the panel offers neither.
   */
  promos?: PromoPrintingsProps;
}

/*
 * The panel's focus handoff (R-48). It outlives the swaps of what it shows, so it holds one handoff for
 * every control that goes with its own press, and says where the focus lands.
 */

/**
 * Where the panel's handoff lands, on what took the place of the control that went:
 * - `panel`: the heading, or "Read the files again" where the read failed: after that button's press,
 *   and when the rows go with the focus in them;
 * - `form`: the heading of a printing form that just opened, in place of the button that opened it;
 * - `opener`: the button that opened a form just cancelled: Add a printing, or a row's Edit;
 * - `outcome`: the line under the rows, once a publish landed or a refusal closed its form.
 */
type HandoffTarget = {to: 'panel'} | {to: 'form'} | {to: 'opener'; opener: string} | {to: 'outcome'};

/** Asks for the panel's handoff, to land on `target`. */
type HandTo = (target: HandoffTarget) => void;

const TO_PANEL: HandoffTarget = {to: 'panel'};
const TO_FORM: HandoffTarget = {to: 'form'};
const TO_OUTCOME: HandoffTarget = {to: 'outcome'};

/** What Add a printing's `data-opens` names. A row's Edit names its printing's id. */
const ADD_OPENER = 'add';

/** The first element of the line under the rows that takes focus: CommitOutcome's failure, else its status line. */
const OUTCOME_TARGET = '[data-outcome] [tabindex="-1"]';

/** The first element of the panel that `target` names: the handoff focuses it. */
function selectorOf({target, failed}: {target: HandoffTarget; failed: boolean}): string {
  switch (target.to) {
    case 'panel':
      return failed ? 'button' : 'h2';
    case 'form':
      return 'h3';
    case 'opener':
      return `[data-opens="${target.opener}"]`;
    case 'outcome':
      return OUTCOME_TARGET;
  }
}

/** The panel's handoff, where it lands, and how a part of the panel asks for it. */
interface PanelHandoff {
  handoff: FocusHandoff;
  target: HandoffTarget;
  handTo: HandTo;
}

/**
 * The panel's handoff, and where it lands. Each part asks for it as its control goes: Read the files
 * again, Add a printing, a row's Edit, a form's Cancel. A publish that closes its form asks through
 * the line it leaves: the panel asks during render, from the outcome it saw last, once the controller's
 * outcome turns to one that says something, which only a landed publish and a refusal that closed the
 * form do (opening a form clears it). Not on the publish's own promise: the form that made it is gone.
 */
function usePanelHandoff(outcome: PrintingOutcome | null): PanelHandoff {
  const handoff = useFocusHandoff();
  const [target, setTarget] = useState<HandoffTarget>(TO_PANEL);
  const [seen, setSeen] = useState(outcome);
  const handTo: HandTo = (next) => {
    setTarget(next);
    handoff.request();
  };
  if (outcome !== seen) {
    setSeen(outcome);
    if (outcome !== null && outcomeShows(outcome)) handTo(TO_OUTCOME);
  }
  return {handoff, target, handTo};
}

/*
 * The printing form (#77): Add a printing under the rows, an Edit on each promo row, and the one form
 * open, which the controller holds (usePrintingForm) and the panel puts in place of the button that
 * opened it.
 */

/**
 * The printing form as the rows and the line under them run it, once the branch's catalog is in: the
 * panel's props for it, the catalog, whether its openers are held, the form's own props but its art,
 * and the panel's handoff.
 */
interface FormKit {
  promos: PromoPrintingsProps;
  /** The branch's promo catalog: the entry a row's Edit opens, and who has the code a form names. */
  catalog: PromoCatalog;
  /**
   * The files are read again after a publish, so the catalog is the last read's: Add a printing and
   * every Edit are held until the read lands, as the rows' choices are. An Edit opened meanwhile would
   * open its entry as it was before the publish, and its save would be refused as someone else's change.
   */
  held: boolean;
  /** What PromoPrintingForm takes but the art: the controller, whose Cancel hands the focus back to what opened the form. */
  form: Omit<PromoPrintingFormProps, 'currentArt'>;
  handTo: HandTo;
}

/** What opened the form, by its `data-opens`: Add a printing for an add, the row's Edit for an edit of its printing. */
function openerOf(form: OpenPrintingForm | null): string | null {
  if (form === null) return null;
  return form.printing === null ? ADD_OPENER : String(form.printing.id);
}

/**
 * Who has the code the open form names, in the branch's catalog: never the printing an edit opened, and
 * no one until the form names a number. The form says whose it is only where the code would clash
 * (missingLine): an edit that keeps its printing's code never does.
 */
function takenFor({catalog, form}: {catalog: PromoCatalog; form: OpenPrintingForm | null}): FoundPrinting | null {
  if (form === null) return null;
  const number = parseNumber(form.values.number);
  if (number === null) return null;
  const {printing} = form;
  const code = {promoGrouping: form.values.promoGrouping, number, artVariant: printing?.artVariant};
  return takenBy({catalog, code, exceptId: printing?.id});
}

/** What `formKitOf` reads: the panel's promos and the view's catalog, if it has them, whether the openers are held, and the handoff. */
interface FormKitInput {
  promos?: PromoPrintingsProps;
  catalog?: PromoCatalog;
  held: boolean;
  handTo: HandTo;
}

/** The form kit, or null without the panel's promos, or before the view holds the branch's catalog. */
function formKitOf({promos, catalog, held, handTo}: FormKitInput): FormKit | null {
  if (promos === undefined || catalog === undefined) return null;
  const {controller} = promos;
  // Cancel takes the form and its own button away, and the button that opened the form is back.
  const cancel = () => {
    const opener = openerOf(controller.form);
    controller.cancel();
    if (opener !== null) handTo({to: 'opener', opener});
  };
  const form = {
    controller: {...controller, cancel},
    promoSets: promos.promoSets,
    taken: takenFor({catalog, form: controller.form}),
    onForgetToken: promos.onForgetToken,
  };
  return {promos, catalog, held, form, handTo};
}

/**
 * The printing a row's Edit opens: the promo's entry in the branch's catalog, while no form is open.
 * None for the card's own row and its set printings, for a promo the catalog lacks, and while a form
 * is open: one form at a time.
 */
function printingToEdit({kit, row}: {kit: FormKit; row: PrintingRow}): CatalogPrinting | null {
  if (row.ref.kind !== 'promo' || kit.promos.controller.form !== null) return null;
  return findPrinting(kit.catalog, Number(row.ref.id))?.printing ?? null;
}

/**
 * A promo row's Edit. It opens the edit form under the row, filled in from the branch's catalog, and
 * hides while any form is open, so its press hands the focus to the form. While the files are read
 * again after a publish it is held (`kit.held`): aria-disabled, so it keeps a focus it has, and a press
 * opens nothing. It is named by its row, so the panel's Edits tell apart; the name starts with the
 * word it shows (2.5.3).
 */
function EditButton({kit, row}: {kit: FormKit; row: PrintingRow}) {
  const printing = printingToEdit({kit, row});
  if (printing === null) return null;
  const {held} = kit;
  const open = () => {
    if (held) return;
    kit.promos.controller.openEdit({card: kit.promos.card, printing});
    kit.handTo(TO_FORM);
  };
  return (
    <LinkButton
      type="button"
      aria-label={`Edit ${row.label}`}
      aria-disabled={held || undefined}
      data-opens={row.ref.id}
      onClick={open}
      style={held ? HELD_EDIT : EDIT}>
      Edit
    </LinkButton>
  );
}

/** Whether the open form is an edit of the row's printing. */
function editsRow({form, row}: {form: OpenPrintingForm | null; row: PrintingRow}): boolean {
  const printing = form?.printing ?? null;
  return printing !== null && String(printing.id) === row.ref.id;
}

/** The edit form, in an item of its own right under the row whose printing it edits, showing the row's art. */
function EditFormItem({kit, row}: {kit: FormKit; row: PrintingRow}) {
  if (!editsRow({form: kit.promos.controller.form, row})) return null;
  return (
    <li style={FORM_ITEM}>
      <PromoPrintingForm {...kit.form} currentArt={row.thumbnail} />
    </li>
  );
}

/**
 * On a Sets 1 to 8 copy of a card that Core reprints: the catalog files the card's promos under its
 * Core printing, whose panel adds and edits them, so this one offers no Add a printing and links
 * there. The link names another card, so the studio hands the focus on (useStudioHandoff).
 */
function CoreCopyNote({coreCopy}: {coreCopy: NonNullable<PromoPrintingsProps['coreCopy']>}) {
  return (
    <p style={NOTE}>
      {`Its promos are filed under its Core printing, ${coreCopy.name}: add and edit them there.`}{' '}
      <Link to={studioHref('edit', coreCopy.id)} className="adm-link">
        Open the Core printing
      </Link>
    </p>
  );
}

/** The line that says what the last publish came to: its commit, or a refusal that closed its form. */
function PublishOutcome({promos}: {promos: PromoPrintingsProps}) {
  const {result, error, note} = promos.controller.outcome;
  return (
    <div data-outcome>
      <CommitOutcome result={result} error={error} note={note} onForgetToken={promos.onForgetToken} />
    </div>
  );
}

/**
 * Add a printing, hidden while an edit form is open and held while the files are read again after a
 * publish (aria-disabled, as Edit is), and under it the line that says what the last publish came to.
 * The press hands the focus to the add form, which takes the button's place; a publish that closes its
 * form hands it to the line.
 */
function AddAndOutcome({kit}: {kit: FormKit}) {
  const {controller, card} = kit.promos;
  const {held} = kit;
  const add = () => {
    if (held) return;
    controller.openAdd(card);
    kit.handTo(TO_FORM);
  };
  return (
    <div style={OFFER}>
      {controller.form === null && (
        <CtaButton type="button" variant="neutral" aria-disabled={held || undefined} data-opens={ADD_OPENER} onClick={add} style={ADD}>
          Add a printing
        </CtaButton>
      )}
      <PublishOutcome promos={kit.promos} />
    </div>
  );
}

/** What the panel offers under the rows: the Core copy's note; else the add form while it is open; else Add a printing and the outcome. */
function PromoOffer({kit}: {kit: FormKit}) {
  const {coreCopy, controller} = kit.promos;
  if (coreCopy !== null) return <CoreCopyNote coreCopy={coreCopy} />;
  if (controller.form?.kind === 'add') return <PromoPrintingForm {...kit.form} currentArt={undefined} />;
  return <AddAndOutcome kit={kit} />;
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
  /** What the row offers after its marker: a promo's Edit (#77), or nothing. */
  action?: ReactNode;
}

/**
 * One printing: its art, its name, its marker, and the choice of versions. A staged change shows
 * the versions it writes in place of the ones the row shows, and the marker "Pending", or "Clash"
 * where the printing changed on the branch since: a publish found it, or a choice made again from
 * a row read since did. Choosing again changes only what the change writes: it keeps its base, and
 * a clash its mark, which Keep mine or Drop in the tray settles. Once the branch has moved, a
 * choice of what it shows now takes the change out, and any other marks it clashed (`withChange`).
 */
function PrintingItem({row, pending, ruled, held, onChoose, action}: ItemProps) {
  const marker = markerOf({row, pending});
  return (
    <li style={ruled ? {...ITEM, ...RULED} : ITEM}>
      <div style={IDENTITY}>
        <Thumb src={row.thumbnail} />
        <div style={NAMES}>
          <span style={NAME}>{row.name}</span>
          <Tag title={marker.title}>{marker.text}</Tag>
          {action}
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
 * Asks for the panel's handoff when the rows, or what the panel offers under them, leave the document
 * with the focus in them: a read of the files that fails after a publish takes them away, and the
 * focus on a choice, an Edit or a form would fall to <body> (R-48). A layout effect's cleanup runs
 * before React takes the nodes out, so the focus is still where it was when it checks.
 */
function useHandoffWhenGone(body: RefObject<HTMLElement | null>, onGone: () => void) {
  const request = useRef(onGone);
  useLayoutEffect(() => {
    request.current = onGone;
  });
  useLayoutEffect(() => {
    const element = body.current;
    return () => {
      if (element?.contains(document.activeElement)) request.current();
    };
  }, [body]);
}

interface RowsProps extends Pick<PrintingsPanelProps, 'changes' | 'onChoose'> {
  rows: readonly PrintingRow[];
  /** A publish runs, or the files are read again after one: the rows' choices are held. */
  held: boolean;
  /** The rows are the last read's, while the files are read again after a publish: the list is busy. */
  busy: boolean;
  /** The printing form, where the panel runs one: an Edit on each promo row, and the edit form under its row. */
  kit: FormKit | null;
}

function PrintingRows({rows, changes, onChoose, held, busy, kit}: RowsProps) {
  return (
    <ul style={LIST} aria-busy={busy || undefined}>
      {rows.map((row, index) => (
        <Fragment key={row.ref.id}>
          <PrintingItem
            row={row}
            pending={changes.find((change) => change.id === row.ref.id)}
            ruled={index > 0}
            held={held}
            onChoose={onChoose}
            action={kit && <EditButton kit={kit} row={row} />}
          />
          {kit && <EditFormItem kit={kit} row={row} />}
        </Fragment>
      ))}
    </ul>
  );
}

/** The ready view, and the panel's way of asking for its handoff. */
interface ReadyProps extends Omit<PrintingsPanelProps, 'view'> {
  view: Extract<BranchPrintings, {status: 'ready'}>;
  handTo: HandTo;
}

/**
 * The rows, and under them what the panel offers for the card's promos (#77). While the files are
 * read again after a publish, the rows are the last read's: held, and the list busy. So is the
 * catalog, so Add a printing and every Edit are held too.
 */
function ReadyBody({view, changes, publishing = false, onChoose, promos, handTo}: ReadyProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  useHandoffWhenGone(bodyRef, () => handTo(TO_PANEL));
  const refreshing = view.refreshing === true;
  const kit = formKitOf({promos, catalog: view.catalog, held: refreshing, handTo});
  return (
    <div ref={bodyRef} style={VIEW}>
      <PrintingRows
        rows={view.rows}
        changes={changes}
        onChoose={onChoose}
        held={publishing || refreshing}
        busy={refreshing}
        kit={kit}
      />
      {kit && <PromoOffer kit={kit} />}
    </div>
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

/** What the failed view reads: the read's failure, the panel's promos, if any, and the panel's way of asking for its handoff. */
interface FailedProps {
  view: Extract<BranchPrintings, {status: 'error'}>;
  promos?: PromoPrintingsProps;
  handTo: HandTo;
}

/**
 * A read that failed and its way out, and under them, where the panel runs the printing form, the line
 * that says what the last publish came to (#77): a publish lands and the read after it fails, so the
 * commit stays in view until the files read again.
 */
function FailedBody({view, promos, handTo}: FailedProps) {
  const onRetry = () => {
    handTo(TO_PANEL);
    view.retry();
  };
  return (
    <div style={VIEW}>
      <ReadError error={view.error} onRetry={onRetry} />
      {promos && <PublishOutcome promos={promos} />}
    </div>
  );
}

/** The panel's body for each state of the read. */
function PrintingsBody({view, handTo, ...rest}: PrintingsPanelProps & {handTo: HandTo}) {
  switch (view.status) {
    case 'loading':
      return <Notice>Loading the printings…</Notice>;
    case 'error':
      return <FailedBody view={view} promos={rest.promos} handTo={handTo} />;
    case 'ready':
      return <ReadyBody view={view} handTo={handTo} {...rest} />;
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
 * Given `promos`, it adds and edits the card's promo printings too (#77): Add a printing under the
 * rows opens the add form there, a promo row's Edit opens the edit form under that row, filled in from
 * the branch's catalog, and one form is open at a time, so Add and every Edit hide while one is. While
 * the files are read again after a publish, Add and every Edit are held, as the choices are: until the
 * read lands, an Edit would open its entry as it was. A Sets 1 to 8 copy of a card that Core reprints
 * points to the Core copy instead. Each form publishes alone, through the studio's controller; the line
 * under the rows says what the last publish came to.
 *
 * It outlives the swaps between its views, so it holds the focus handoff for each control whose
 * press takes it away (R-48), and says where the focus lands (usePanelHandoff): "Read the files
 * again" goes the moment the read starts, so the new button takes it if the files fail again, and
 * the heading once they are in; a form takes it from the button that opened it, and gives it back to
 * that button on Cancel; a publish that closes its form gives it to the line under the rows. It asks
 * for it, too, when the rows or what is under them go with the focus in them, as they do when the
 * read after a publish fails: the button then takes it.
 */
export function PrintingsPanel(props: PrintingsPanelProps) {
  const {view, promos} = props;
  const ref = useRef<HTMLDivElement>(null);
  const {handoff, target, handTo} = usePanelHandoff(promos?.controller.outcome ?? null);
  useTakeHandoff(handoff, ref, selectorOf({target, failed: view.status === 'error'}), view.status !== 'loading');
  return (
    <div ref={ref}>
      <Panel title="Printings" titleFocusable>
        <PrintingsBody {...props} handTo={handTo} />
      </Panel>
    </div>
  );
}
