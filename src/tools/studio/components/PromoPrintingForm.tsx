import {useId, type CSSProperties} from 'react';
import {COLORS, CtaButton, SPACING} from '../../../app-bridge';
import {useFileDrop} from '../../../components/useFileDrop';
import {useHiddenFileInput} from '../../../components/useHiddenFileInput';
import {useFocusHandoff} from '../../../shell/focusHandoff';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {SegmentedControl} from '../../../ui/SegmentedControl';
import {IMAGE_ACCEPT, IMAGE_FORMATS, fileDescription, type FrameState, type ImageNoteIds} from '../cardPanel';
import {CHOICE_OPTIONS} from '../finishes/finishValues';
import {
  missingLine,
  numberProblem,
  publishLabel,
  scanNote,
  scanUnusable,
  type MissingLineOptions,
  type PromoSetOption,
  type ScanState,
} from '../promos/printingForm';
import {hasOfficialArt, printingCode, type FoundPrinting} from '../promos/promoCatalog';
import type {OpenPrintingForm, PrintingFormController} from '../promos/usePrintingForm';
import {scanLanguageOptions} from '../scanLanguages';
import {CARD_ASPECT, FIELD_LABEL, FRAME_BORDER, HINT} from '../studioStyles';
import {CommitOutcome} from './CommitOutcome';
import {Field} from './Field';

/*
 * The promo printing form (#77): the box Edit card's Printings panel opens to add a printing of the card or
 * to edit one of its promo printings. It shows what the controller holds (usePrintingForm.ts) and hands
 * every entry back to it. Whether Publish is on and what it says, the lines that say what is missing or
 * wrong (under the buttons, and on Number) and what is said of a scan chosen are printingForm.ts's rules,
 * and the commit is the controller's. On the left is the scan, 130px wide, under a click-or-drop control as
 * the card panel's preview is; on the right are the fields, Publish and Cancel, and what is missing or has
 * failed. Below 360px the fields wrap under the scan.
 *
 * While a publish runs the form is held, since the controller would take an entry it then drops when the
 * publish lands: its fields are read-only, its versions held, its scan control takes no file and Cancel waits.
 */

/** The scan column's width, and the least the fields ask for beside it: with the gap, a box under 360px wraps them under the scan. */
const SCAN_WIDTH = 130;
const FIELDS_BASIS = 180;

/** The one thing a printing with Ravensburger's art says in place of a scan control. */
const RAVENSBURGER_ART = "Its art is Ravensburger's, so it has no scan to replace.";

// The fill is translucent, so it stops at the edge (R1-2).
const BOX: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.lg,
  minWidth: 0,
  padding: SPACING.lg,
  backgroundColor: ADMIN_COLORS.accentTintSoft,
  backgroundClip: 'padding-box',
  border: `1px solid ${ADMIN_COLORS.accentBorder}`,
  borderRadius: ADMIN_RADIUS.panel,
};
const HEADING: CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.body, fontWeight: 700, color: ADMIN_COLORS.text};
const BODY: CSSProperties = {display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: SPACING.lg};
const SCAN: CSSProperties = {flex: `0 0 ${SCAN_WIDTH}px`, maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: SPACING.sm};
const FIELDS: CSSProperties = {flex: `1 1 ${FIELDS_BASIS}px`, minWidth: 0, display: 'flex', flexDirection: 'column', gap: SPACING.md};
// No overflow clip on the frame: the file control's ring sits 2px outside it.
const FRAME: CSSProperties = {position: 'relative', aspectRatio: CARD_ASPECT};
const PICTURE: CSSProperties = {position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: ADMIN_RADIUS.preview};
const ART: CSSProperties = {display: 'block', width: '100%', height: '100%', objectFit: 'cover'};
const CAPTION: CSSProperties = {
  position: 'relative',
  margin: SPACING.sm,
  padding: `${SPACING.xs}px ${SPACING.sm}px`,
  borderRadius: ADMIN_RADIUS.box,
  background: COLORS.scrimHeavy,
  fontSize: ADMIN_TYPE.small,
  color: ADMIN_COLORS.text,
  textAlign: 'center',
};
// A file name has no break opportunity, and a long one would push the column wider than its 130px.
const NOTES: CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.xs, overflowWrap: 'anywhere'};
// An error in this box, the scan's or Number's, is told as Notice tells one, small: light text on the error fill.
// The studio's red error text (ERROR_TEXT) on this box's tint comes to 4.497:1, a hair under AA's 4.5:1.
const TINT_ERROR: CSSProperties = {
  margin: 0,
  padding: SPACING.sm,
  backgroundColor: ADMIN_COLORS.errorBg,
  border: `1px solid ${ADMIN_COLORS.errorBorder}`,
  borderRadius: ADMIN_RADIUS.control,
  fontSize: ADMIN_TYPE.label,
  color: ADMIN_COLORS.text,
};
const GROUP: CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.xs, minWidth: 0};
const BUTTONS: CSSProperties = {display: 'flex', flexWrap: 'wrap', gap: SPACING.md};
const PUBLISH: CSSProperties = {flex: '1 1 auto'};
const MISSING: CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

/**
 * A field's errors when it has none to show: every field but Number, and Number while what was typed reads
 * and names a free code. What is missing speaks under the buttons, in printingForm.ts's words; a number the
 * owner typed that is wrong is marked on Number too (numberProblem, R-72).
 */
const NO_ERRORS: Readonly<Record<string, string>> = {};

/** What the promo set's select says under it: it offers only the app's promo sets, at admin's pin. */
const PROMO_SET_HINT = "A promo set not listed here has to be added to the app's PROMO_SETS first.";

export interface PromoPrintingFormProps {
  /** Its form is open: the box draws nothing without one. */
  controller: PrintingFormController;
  promoSets: readonly PromoSetOption[];
  /** Who holds the code the form names, from the branch's catalog; null when it's free. */
  taken: FoundPrinting | null;
  /** The art an edit shows for its printing now (its row's thumbnail); an add shows none. */
  currentArt: string | undefined;
  onForgetToken: () => void;
}

/** The heading: the card an add is for, or the printing an edit opened with its code and id. */
function headingOf({kind, card, printing}: OpenPrintingForm): string {
  if (kind === 'edit' && printing !== null) return `Edit ${printingCode(printing)} · id ${printing.id}`;
  return `New printing of ${card.fullName}`;
}

/** The art variant of the printing an edit opened (the A in 24A/P2), which its code carries. */
function artVariantOf({printing}: OpenPrintingForm): string | undefined {
  return printing?.artVariant;
}

/** Whether the form edits a printing with Ravensburger's art, which an edit doesn't replace: it has no scan control then. */
function keepsItsArt({printing}: OpenPrintingForm): boolean {
  return printing !== null && hasOfficialArt(printing);
}

/** What the scan control says: it adds the scan of a new printing, or replaces the scan of an edited one. */
function captionOf({kind}: OpenPrintingForm): string {
  return kind === 'add' ? 'Click or drop to add the scan' : 'Click or drop to replace the scan';
}

/** The picture's frame: no art to show (dashed), the printing's art now (solid), or the scan the owner chose (gold). */
function frameStateOf({scan, art}: {scan: ScanState; art: string | undefined}): FrameState {
  if (scan.dataUrl !== null) return 'staged';
  return art === undefined ? 'empty' : 'current';
}

/** The art, decoration: the control and the heading name the printing. */
function Picture({art, state}: {art: string | undefined; state: FrameState}) {
  return (
    <div aria-hidden="true" style={{...PICTURE, border: FRAME_BORDER[state]}}>
      {art !== undefined && <img src={art} alt="" style={ART} />}
    </div>
  );
}

/** What the scan control reads: its words, what describes it, whether it takes a file and who gets one. */
interface ScanCoverProps {
  caption: string;
  describedBy: string;
  invalid: boolean;
  /** A publish runs: the control takes no file, and its input is disabled, which the stylesheet holds it by. */
  locked: boolean;
  onFile: (file: File | null) => void;
}

/**
 * The control over the picture, as the card panel builds its own (StudioCardPanel): a <label> round a
 * visually hidden file input, which carries the focus and rings the label, and takes a dropped file too
 * (useFileDrop). A pick and a drop hand the file to the same place. While its input is disabled it looks
 * held, with no ring on hover or under a dragged file: AdminStyles' .adm-file-cover:has(input:disabled).
 */
function ScanCover({caption, describedBy, invalid, locked, onFile}: ScanCoverProps) {
  const {focused, inputProps} = useHiddenFileInput(onFile);
  const {dragging, dropProps} = useFileDrop(onFile);
  return (
    <label
      className="adm-file-cover"
      data-focused={focused || undefined}
      data-dragging={dragging || undefined}
      {...dropProps}>
      <span style={CAPTION}>{caption}</span>
      <input
        {...inputProps}
        accept={IMAGE_ACCEPT}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        disabled={locked}
      />
    </label>
  );
}

/**
 * The formats, then what the pick did: the file's error (its bytes are checked after the pick), or the
 * sentence that names the file and says what it does (scanNote). Both speak through one polite live region,
 * mounted before the pick: the file input empties itself, so nothing else announces a file chosen (the card
 * panel's R4-8c).
 */
function ScanNotes({form, ids}: {form: OpenPrintingForm; ids: ImageNoteIds}) {
  const {scan} = form;
  const note = scanNote({kind: form.kind, scan});
  return (
    <>
      <p id={ids.hint} style={HINT}>
        {IMAGE_FORMATS}
      </p>
      <div aria-live="polite" style={NOTES}>
        {scan.error !== null && (
          <p id={ids.error} style={TINT_ERROR}>
            {scan.error}
          </p>
        )}
        {note !== null && <p style={HINT}>{note}</p>}
      </div>
    </>
  );
}

/** What the scan column reads. */
interface ScanColumnProps {
  form: OpenPrintingForm;
  currentArt: string | undefined;
  /** A publish runs: the scan control takes no file. */
  locked: boolean;
  onFile: (file: File | null) => void;
}

/**
 * The scan: the one the owner chose, else the art an edit shows now, else an empty box (an add). Under it
 * is the control that chooses or replaces it, or, for a printing with Ravensburger's art, the line that says
 * it has none.
 */
function ScanColumn({form, currentArt, locked, onFile}: ScanColumnProps) {
  const id = useId();
  const ids: ImageNoteIds = {hint: `${id}-hint`, error: `${id}-error`};
  const {scan} = form;
  const art = scan.dataUrl ?? (form.kind === 'edit' ? currentArt : undefined);
  const control = !keepsItsArt(form);
  return (
    <div style={SCAN}>
      <div style={FRAME}>
        <Picture art={art} state={frameStateOf({scan, art})} />
        {control && (
          <ScanCover
            caption={captionOf(form)}
            describedBy={fileDescription({ids, error: scan.error})}
            invalid={scan.error !== null}
            locked={locked}
            onFile={onFile}
          />
        )}
      </div>
      {control ? <ScanNotes form={form} ids={ids} /> : <p style={HINT}>{RAVENSBURGER_ART}</p>}
    </div>
  );
}

/** What each field reads: the form it edits, how it hands an entry back, and whether a publish holds it. */
interface FieldProps {
  form: OpenPrintingForm;
  patch: PrintingFormController['patch'];
  /** A publish runs: the field is read-only. */
  locked: boolean;
}

/** The promo set of an edit that the app doesn't list, which the select then offers as an option of its own; null otherwise. */
function unlistedSet({initial}: OpenPrintingForm, promoSets: readonly PromoSetOption[]): string | null {
  const {promoGrouping} = initial;
  return promoGrouping === '' || promoSets.some(({code}) => code === promoGrouping) ? null : promoGrouping;
}

/** What the fields read: each one's props, the promo sets the select offers, and what Number says of the number typed. */
type FieldsProps = FieldProps & {
  promoSets: readonly PromoSetOption[];
  /** Why the number typed is wrong (numberProblem), or null. */
  numberError: string | null;
};

/**
 * The promo sets the app lists, newest first, after a blank choice, and under them the line that says a
 * set they lack needs the app first. An edit of a printing in a set the app lacks keeps that code.
 */
function PromoSetField({form, patch, locked, promoSets}: FieldsProps) {
  const unlisted = unlistedSet(form, promoSets);
  return (
    <Field label="Promo set" name="printing-promoSet" errors={NO_ERRORS} hint={PROMO_SET_HINT}>
      {(control) => (
        <select
          {...control}
          className="adm-select"
          value={form.values.promoGrouping}
          disabled={locked}
          onChange={(e) => patch({promoGrouping: e.target.value})}>
          <option value="">Choose a promo set</option>
          {promoSets.map(({code, label}) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
          {unlisted !== null && <option value={unlisted}>{unlisted}</option>}
        </select>
      )}
    </Field>
  );
}

/**
 * The number as printed: 1 for 1/P5. Whether it reads, and whose code it names, are printingForm.ts's
 * (numberProblem): a number typed that is wrong marks the field invalid and says why under it.
 */
function NumberField({form, patch, locked, numberError}: FieldProps & Pick<FieldsProps, 'numberError'>) {
  const errors = numberError === null ? NO_ERRORS : {'printing-number': numberError};
  return (
    <Field label="Number" name="printing-number" errors={errors} errorStyle={TINT_ERROR}>
      {(control) => (
        <input
          {...control}
          className="adm-input"
          inputMode="numeric"
          autoComplete="off"
          value={form.values.number}
          readOnly={locked}
          onChange={(e) => patch({number: e.target.value})}
        />
      )}
    </Field>
  );
}

/**
 * The versions a new printing comes in, none chosen to begin with. An edit has no such field: they stay
 * with the printing's row and the Version changes tray. A group isn't labelable, so its visible label is
 * text beside the group's own name, which contains it.
 */
function VersionsField({form, patch, locked}: FieldProps) {
  return (
    <div style={GROUP}>
      <span style={FIELD_LABEL}>Versions</span>
      <SegmentedControl
        options={CHOICE_OPTIONS}
        value={form.values.versions}
        onChange={(versions) => patch({versions})}
        ariaLabel="Versions of the new printing"
        fill
        held={locked}
      />
    </div>
  );
}

/** The language of the scan: the list's, and the one an edit opened with when the list doesn't name it. */
function ScanLanguageField({form, patch, locked}: FieldProps) {
  return (
    <Field label="Scan language" name="printing-scanLanguage" errors={NO_ERRORS}>
      {(control) => (
        <select
          {...control}
          className="adm-select"
          value={form.values.scanLanguage}
          disabled={locked}
          onChange={(e) => patch({scanLanguage: e.target.value})}>
          {scanLanguageOptions(form.initial.scanLanguage).map(({code, label}) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

/** One line for the catalog's notes. An edit adds a note: the notes it has stay as they were written. */
function NoteField({form, patch, locked}: FieldProps) {
  return (
    <Field label={form.kind === 'edit' ? 'Add a note' : 'Note'} name="printing-note" errors={NO_ERRORS}>
      {(control) => (
        <input
          {...control}
          className="adm-input"
          autoComplete="off"
          placeholder="Optional, for the catalog's notes"
          value={form.values.note}
          readOnly={locked}
          onChange={(e) => patch({note: e.target.value})}
        />
      )}
    </Field>
  );
}

/** The fields, in the order the form asks for them: an add chooses its versions, which an edit leaves to its row. */
function Fields(props: FieldsProps) {
  return (
    <>
      <PromoSetField {...props} />
      <NumberField {...props} />
      {props.form.kind === 'add' && <VersionsField {...props} />}
      <ScanLanguageField {...props} />
      <NoteField {...props} />
    </>
  );
}

/** What the buttons read. */
interface ActionsProps {
  form: OpenPrintingForm;
  /** What the form still lacks before Publish is on (missingLine), or null. */
  line: string | null;
  /** Publish is off: the form lacks something, its scan can't be published yet, or a publish runs. */
  held: boolean;
  publishing: boolean;
  onPublish: () => void;
  onCancel: () => void;
}

/** The code the printing an edit opened had, which Save names a move from; null for an add. */
function initialCodeOf({printing}: OpenPrintingForm): string | null {
  return printing === null ? null : printingCode(printing);
}

/**
 * Publish, named by the printing, and Cancel; under them, the first thing the form lacks, which describes
 * the button. Cancel waits for a publish that runs: the commit can't be called back, and a form closed
 * meanwhile would never say what came of it.
 */
function Actions({form, line, held, publishing, onPublish, onCancel}: ActionsProps) {
  const lineId = useId();
  const label = publishLabel({
    kind: form.kind,
    values: form.values,
    initialCode: initialCodeOf(form),
    publishing,
    artVariant: artVariantOf(form),
  });
  return (
    <>
      <div style={BUTTONS}>
        <CtaButton
          type="button"
          onClick={onPublish}
          disabled={held}
          aria-describedby={line === null ? undefined : lineId}
          style={PUBLISH}>
          {label}
        </CtaButton>
        <CtaButton type="button" variant="neutral" onClick={onCancel} disabled={publishing}>
          Cancel
        </CtaButton>
      </div>
      {line !== null && (
        <p id={lineId} style={MISSING}>
          {line}
        </p>
      )}
    </>
  );
}

/** What the open form reads: the form's props, and the form the controller holds. */
interface OpenFormProps extends PromoPrintingFormProps {
  form: OpenPrintingForm;
}

/** What printingForm.ts's rules read of the open form: what it holds and opened with, its scan, who has its code, and its art variant. */
function rulesOf({form, taken}: Pick<OpenFormProps, 'form' | 'taken'>): MissingLineOptions {
  return {kind: form.kind, values: form.values, initial: form.initial, scan: form.scan, taken, artVariant: artVariantOf(form)};
}

/**
 * The open form. Publish is held while the form lacks something (missingLine), while a publish runs, and
 * while a scan the owner chose can't be used yet (scanUnusable): it is still being read, or failed its
 * check, which the line leaves to the scan's own error. A publish that did not land leaves the form open with
 * its failure, and Publish went off while it ran, which drops the focus to <body>, so the failure takes it
 * (R-59). A landed one closes the form; the panel hands focus on from there. The heading takes focus from
 * script (tabIndex -1), as the panel's title does, for a handoff that opens the form.
 */
function OpenForm({controller, form, promoSets, taken, currentArt, onForgetToken}: OpenFormProps) {
  const headingId = useId();
  const handoff = useFocusHandoff();
  const {publishing} = controller;
  const rules = rulesOf({form, taken});
  const line = missingLine(rules);
  const publish = () =>
    void controller.publish().then((landed) => {
      if (!landed) handoff.request();
    });
  const chooseScan = (file: File | null) => {
    if (!publishing) void controller.chooseScan(file);
  };
  return (
    <section aria-labelledby={headingId} style={BOX}>
      <h3 id={headingId} tabIndex={-1} style={HEADING}>
        {headingOf(form)}
      </h3>
      <div style={BODY}>
        <ScanColumn form={form} currentArt={currentArt} locked={publishing} onFile={chooseScan} />
        <div style={FIELDS}>
          <Fields form={form} patch={controller.patch} locked={publishing} promoSets={promoSets} numberError={numberProblem(rules)} />
          <Actions
            form={form}
            line={line}
            held={line !== null || publishing || scanUnusable(form.scan)}
            publishing={publishing}
            onPublish={publish}
            onCancel={controller.cancel}
          />
          <CommitOutcome result={null} error={form.error} note="" onForgetToken={onForgetToken} handoff={handoff} />
        </div>
      </div>
    </section>
  );
}

/**
 * Card studio's form for adding a promo printing of a card, or editing one of its promo printings (#77).
 * It draws what `controller.form` holds and hands every entry back through the controller; the panel
 * decides when a form is open and where it sits.
 */
export function PromoPrintingForm({controller, ...rest}: PromoPrintingFormProps) {
  const {form} = controller;
  if (form === null) return null;
  return <OpenForm controller={controller} form={form} {...rest} />;
}
