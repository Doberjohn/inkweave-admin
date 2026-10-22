import {isCoreSet, type LorcanaCard} from 'inkweave-synergy-engine';
import type {PromoSet} from '../../../app-bridge';
import {stripDataUrl} from '../../../github/githubCommit';
import {finishesOfChoice, type FinishChoice} from '../finishes/finishValues';
import {printingCode, type BaseCard, type CatalogPrinting, type CodeParts, type FoundPrinting} from './promoCatalog';
import {factsOf, type PrintingChange, type ScanFile} from './publishPrinting';

/*
 * The rules of the promo printing form (#77), apart from the form itself: what it holds, the promo sets
 * it offers, what it still lacks before Publish is on, how Publish reads, what is said once a publish
 * lands, and the change a complete form hands to publishPrinting.ts. Nothing here reads the branch or
 * renders anything: the form's controller passes in what the owner entered, who the branch's catalog
 * says has the code, and the scan as useImageUpload holds it. A code that a line or a label names is the
 * printing's own, its art variant included: an edit of 24A/P2 says 24A/P2, never 24/P2, so the caller
 * hands in the art variant of the printing an edit opened.
 */

/** The scan language that writes nothing: the catalog leaves English out. */
const ENGLISH = 'en';

/** What `changeOf` says of a form that `missingLine` would not have let through: nothing builds a change from half a form. */
const INCOMPLETE = 'The form is incomplete, so it has no printing to publish.';

/** Whether a form adds a printing or edits one. */
type FormKind = 'add' | 'edit';

/** What the owner enters and picks, as the form holds it. */
export interface PrintingFormValues {
  /** The promo set, by the code printed on it: "P5" in 1/P5. Blank until one is chosen. */
  promoGrouping: string;
  /** The number as typed; `parseNumber` reads it. */
  number: string;
  /** The versions an add chooses, null until it does. An edit has none: they stay with the row's choice and the Version changes tray (#68). */
  versions: FinishChoice | null;
  /** The language of the scan, by its code: "en" for English, which the catalog leaves out. */
  scanLanguage: string;
  /** One line for the catalog's notes. */
  note: string;
}

/** A form with nothing entered: what an add opens with. */
export const EMPTY_PRINTING_FORM: PrintingFormValues = {promoGrouping: '', number: '', versions: null, scanLanguage: ENGLISH, note: ''};

/** The scan the form holds, as useImageUpload has it: the chosen file's name, its bytes once they are read and checked, and why they can't be. */
export interface ScanState {
  name: string | null;
  dataUrl: string | null;
  error: string | null;
}

/** What an edit opens with: the printing's own promo set, number and scan language, no versions and no note. */
export function editValuesOf({promoGrouping, number, scanLanguage}: CatalogPrinting): PrintingFormValues {
  return {...EMPTY_PRINTING_FORM, promoGrouping, number: number === undefined ? '' : String(number), scanLanguage: scanLanguage ?? ENGLISH};
}

/** A promo set the form offers: the code printed on its cards, and how the select words it. */
export interface PromoSetOption {
  code: string;
  label: string;
}

/** The options one promo set gives: one for each of its editions, newest first, else one for the set. */
function optionsOf(set: PromoSet): PromoSetOption[] {
  if (!set.editions?.length) return [{code: set.code, label: `${set.code} · ${set.name}`}];
  return [...set.editions].reverse().map(({code, name}) => ({code, label: `${code} · ${set.name}: ${name}`}));
}

/** The promo sets the form offers, newest first (`PROMO_SETS` runs oldest first), an edition by its own code. */
export function promoSetOptions(sets: readonly PromoSet[]): PromoSetOption[] {
  return [...sets].reverse().flatMap(optionsOf);
}

/** A whole number, however it was spaced. */
const WHOLE_NUMBER = /^\s*\d+\s*$/;

/** The number as typed: a whole number from 1 up that JavaScript holds exactly, else null. */
export function parseNumber(typed: string): number | null {
  if (!WHOLE_NUMBER.test(typed)) return null;
  const number = Number(typed);
  return Number.isSafeInteger(number) && number >= 1 ? number : null;
}

/** The part of the form that names a code: its promo set and number as typed. */
type CodeValues = Pick<PrintingFormValues, 'promoGrouping' | 'number'>;

/**
 * The code the form names, as it is printed ("1/P5"; "24A/P2" with an art variant), or null until it has a
 * promo set and a number `parseNumber` reads. The number is read as `parseNumber` reads it, so " 07 " names 7.
 */
export function formCode({promoGrouping, number, artVariant}: CodeValues & Pick<CodeParts, 'artVariant'>): string | null {
  const parsed = parseNumber(number);
  if (promoGrouping === '' || parsed === null) return null;
  return printingCode({promoGrouping, number: parsed, artVariant});
}

/** The note the form holds, trimmed, or null where it is blank. */
function noteOf({note}: PrintingFormValues): string | null {
  return note.trim() || null;
}

/** The scan language the catalog stores: none for English. */
function languageOf({scanLanguage}: PrintingFormValues): string | null {
  return scanLanguage === ENGLISH ? null : scanLanguage;
}

/**
 * The scan as the publish commits it: the extension of the file's name, lowercased and without its dot,
 * and the bytes with no data-URL prefix. Null while the form holds no bytes: a file still being read, or
 * one that failed its check, is no scan yet.
 */
function scanFileOf({name, dataUrl}: ScanState): ScanFile | null {
  if (dataUrl === null) return null;
  return {ext: (name?.split('.').pop() ?? '').toLowerCase(), base64: stripDataUrl(dataUrl)};
}

/** Whether the two forms name the same code: the same promo set, and the same number however each was typed ("42", " 042 "). */
function sameCode(a: CodeValues, b: CodeValues): boolean {
  if (a.promoGrouping !== b.promoGrouping) return false;
  if (a.number === b.number) return true;
  const number = parseNumber(a.number);
  return number !== null && number === parseNumber(b.number);
}

/** Whether the two forms would publish the same thing: one code, versions and language, and notes that read alike once trimmed. */
function sameValues(a: PrintingFormValues, b: PrintingFormValues): boolean {
  return sameCode(a, b) && a.versions === b.versions && a.scanLanguage === b.scanLanguage && noteOf(a) === noteOf(b);
}

/** What `missingLine` reads. */
interface MissingLineOptions {
  kind: FormKind;
  values: PrintingFormValues;
  /** What the form opened with: an add's values are empty, an edit's are its printing's. */
  initial: PrintingFormValues;
  scan: ScanState;
  /** Who has the code the form names, from the branch's catalog; null when it is free. */
  taken: FoundPrinting | null;
  /** The art variant of the printing an edit opened (the A in 24A/P2), which its code carries. */
  artVariant?: string;
}

/**
 * The line that says whose a code is, where another printing has it. An edit that keeps the code its
 * printing opened with gets none: a printing may share its code with a twin it already had (Moana and
 * Vaiana's 26/P2, the two Hades of 28/C3), and a note, a scan or a language doesn't move it. An add, or an
 * edit that moves the promo set or the number, is held to it.
 */
function takenLine({kind, values, initial, taken, artVariant}: MissingLineOptions): string | null {
  const code = formCode({...values, artVariant});
  if (taken === null || code === null) return null;
  if (kind === 'edit' && sameCode(values, initial)) return null;
  return `${code} is taken: ${taken.group.fullName} has it.`;
}

/** An add's first gap, in the order the form asks for things: its promo set, number, versions and scan, then its code. */
function addLine(opts: MissingLineOptions): string | null {
  const {values, scan} = opts;
  if (values.promoGrouping === '') return 'Choose a promo set to publish.';
  if (parseNumber(values.number) === null) return 'Enter a number from 1 up to publish.';
  if (values.versions === null) return 'Choose its versions to publish.';
  // A scan that failed its check says why beside the file control, so the line adds nothing to it.
  if (scan.dataUrl === null) return scan.error === null ? 'Add its scan to publish.' : null;
  return takenLine(opts);
}

/** An edit's first gap: a change to make, then the promo set and number it keeps, then its code. */
function editLine(opts: MissingLineOptions): string | null {
  const {values, initial, scan} = opts;
  if (scan.dataUrl === null && sameValues(values, initial)) return 'Change something to save.';
  if (values.promoGrouping === '') return 'Choose a promo set to save.';
  if (parseNumber(values.number) === null) return 'Enter a number from 1 up to save.';
  return takenLine(opts);
}

/**
 * What the form still needs before Publish can be on, in a line; null when it needs nothing more. It
 * names the first gap, so the owner meets them one at a time. A scan counts once its bytes are read and
 * checked (`dataUrl`). An edit's change is judged by what would be published: retyping the number as
 * " 042 ", or a note of spaces, changes nothing.
 */
export function missingLine(opts: MissingLineOptions): string | null {
  return opts.kind === 'add' ? addLine(opts) : editLine(opts);
}

/** What `publishLabel` reads. */
interface PublishLabelOptions {
  kind: FormKind;
  values: PrintingFormValues;
  /** The code the printing an edit opened had ("1/P5", "24A/P2"); null for an add. */
  initialCode: string | null;
  publishing: boolean;
  /** The art variant of the printing an edit opened (the A in 24A/P2), which its code carries. */
  artVariant?: string;
}

/**
 * The button's words. An add reads "Publish 1/P5", or "Publish" until its code is known. An edit reads
 * "Save 1/P5", or "Save as 2/P5" when it moves the printing to another code, or "Save" with none to name.
 * While the publish runs it reads "Publishing…".
 */
export function publishLabel({kind, values, initialCode, publishing, artVariant}: PublishLabelOptions): string {
  if (publishing) return 'Publishing…';
  const verb = kind === 'add' ? 'Publish' : 'Save';
  const code = formCode({...values, artVariant});
  if (code === null) return verb;
  return kind === 'edit' && code !== initialCode ? `${verb} as ${code}` : `${verb} ${code}`;
}

/**
 * What the line under a landed publish says of when the printing shows. Its art needs the app's convert
 * workflow, which runs on master only: on another branch the data lands and the art doesn't.
 */
export function outcomeNote({scanSent, branch}: {scanSent: boolean; branch: string}): string {
  if (!scanSent) return 'It shows on inkweave.ink once the app has deployed.';
  if (branch !== 'master') return `The scan converts to art on master only, so on ${branch} the printing has no art yet.`;
  return 'Its art shows on inkweave.ink once the app has converted the scan and deployed.';
}

/**
 * The card as the catalog files its promos: by id, name, set and number, and whether the set is Core, which
 * puts them in `fold` (a card with no set in its data counts as one of Sets 1 to 8, as the engine counts it).
 */
export function baseCardOf({id, fullName, setCode = '', setNumber = 0}: LorcanaCard): BaseCard {
  return {id: Number(id), fullName, setCode, number: setNumber, core: isCoreSet(setCode)};
}

/**
 * The Core card that reprints a card of Sets 1 to 8: the first card of the list that is in a Core set and
 * has the card's full name, with its set and number after the name ("Ursula - Deceiver (Set 9 #90)"). The
 * catalog files such a card's promos under that Core card, so the Sets 1 to 8 copy offers no Add a printing
 * and points to it. Null for a Core card, and for a card of Sets 1 to 8 that no Core card reprints.
 */
export function coreCopyOf({card, cards}: {card: LorcanaCard; cards: readonly LorcanaCard[]}): {id: string; name: string} | null {
  if (isCoreSet(card.setCode)) return null;
  const copy = cards.find((other) => isCoreSet(other.setCode) && other.fullName === card.fullName);
  if (!copy) return null;
  return {id: copy.id, name: `${copy.fullName} (Set ${copy.setCode} #${copy.setNumber})`};
}

/** What `changeOf` reads. */
interface ChangeOptions {
  kind: FormKind;
  card: BaseCard;
  /** The printing an edit opened, as the branch held it then; null for an add. */
  printing: CatalogPrinting | null;
  values: PrintingFormValues;
  scan: ScanState;
}

/** The part of a form's change that both kinds read. */
type FormParts = Pick<ChangeOptions, 'card' | 'values' | 'scan'>;

/** What a complete form always has: the value, or a throw where the form is not complete. */
function required<T>(value: T | null): T {
  if (value === null) throw new Error(INCOMPLETE);
  return value;
}

/** An add's change: its code, versions and language, its note, and the scan it needs. */
function addChange({card, values, scan}: FormParts): PrintingChange {
  const printing = {
    promoGrouping: values.promoGrouping,
    number: required(parseNumber(values.number)),
    finishes: finishesOfChoice(required(values.versions)),
    scanLanguage: languageOf(values),
  };
  return {kind: 'add', card, printing, note: noteOf(values), scan: required(scanFileOf(scan))};
}

/**
 * An edit's change, from the facts of the printing as it opened. Its scan goes only for a printing without
 * Ravensburger's art, whatever the form holds: the art a printing has from Ravensburger isn't replaced.
 */
function editChange({card, printing, values, scan}: FormParts & {printing: CatalogPrinting}): PrintingChange {
  const from = factsOf(printing);
  const edit = {promoGrouping: values.promoGrouping, number: required(parseNumber(values.number)), scanLanguage: languageOf(values)};
  return {kind: 'edit', card, id: printing.id, from, edit, note: noteOf(values), scan: from.officialArt ? null : scanFileOf(scan)};
}

/**
 * The change a complete form publishes: an add of a printing of `card`, or an edit of `printing`, the
 * printing as the branch held it when the form opened. A blank note becomes none and English no language.
 * It throws for a form `missingLine` still names a gap in (a number it can't read, an add without versions
 * or a scan) and for an edit without its printing: Publish stays off until the form is complete.
 */
export function changeOf({kind, printing, ...rest}: ChangeOptions): PrintingChange {
  if (kind === 'add') return addChange(rest);
  if (printing === null) throw new Error('An edit needs the printing it edits.');
  return editChange({...rest, printing});
}
