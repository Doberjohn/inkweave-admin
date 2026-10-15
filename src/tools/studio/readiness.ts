import {SET_TOTAL} from '../../app-bridge';
import type {RevealCardForm} from '../reveal/buildPreviewCard';
import type {StatField} from '../reveal/constants';
import {intField, type ValidationResult} from '../reveal/validateForm';

/** The validator's errors: a message per key (validateRevealCardForm). */
type Errors = Readonly<Record<string, string>>;

/**
 * The stats in the order the form shows them: a Character prints Strength and a
 * Location Move cost, then both print Willpower and Lore (STAT_FIELDS).
 */
const STAT_KEYS: readonly StatField[] = ['strength', 'moveCost', 'willpower', 'lore'];

/** The first of these keys' messages, in the order given, or null. */
function firstError(errors: Errors, keys: readonly string[]): string | null {
  const key = keys.find((k) => Object.hasOwn(errors, k));
  return key === undefined ? null : errors[key];
}

/**
 * The collector number parses as the validator parses it (intField) and falls
 * inside the set, so the validator's ink-block check ran on it. A number that
 * collides with an existing id still counts, and so does one a released card
 * of the reveal set holds (R4-5y's `released`): the check runs on both.
 */
function numberInSet(form: RevealCardForm): boolean {
  const collector = intField(form.collectorNumber) ?? 0;
  return collector >= 1 && collector <= SET_TOTAL;
}

/**
 * The card image as useImageUpload holds it. The checklist reads `ready` and
 * `error`; the file input's error (visibleImageError) reads `name` and `error`.
 */
export interface ImageStatus {
  /** The chosen file's name, or null before one is chosen. */
  name: string | null;
  /** Its bytes are read and pass the byte check: useImageUpload's dataUrl is set. */
  ready: boolean;
  /** The upload's own error: bytes that aren't the image the name claims, or a read that failed. */
  error: string | null;
}

/**
 * The shell's card list as New reveal's number check reads it
 * (useCardDataContext). The validator refuses a number a released card of the
 * reveal set holds (R4-5y), which only the loaded list shows: once a set
 * graduates, previewCards.json holds none of its cards, so nothing else would
 * catch the duplicate.
 */
export interface CardListStatus {
  isLoading: boolean;
  error: Error | null;
}

/** The list as revealChecklist takes it when none is given: loaded. */
const LIST_LOADED: CardListStatus = {isLoading: false, error: null};

const NUMBER_NEEDS_LIST = 'Checking the number needs the card list';

/**
 * Why the collector number can't be checked yet: the card list is still
 * loading, or failed to load. Null once it has loaded without error. The
 * Collector number item shows it, and readyToPublish refuses while it is set,
 * so Publish fails closed rather than miss a released card's number.
 */
export function cardListPending({isLoading, error}: CardListStatus): string | null {
  if (error) return `${NUMBER_NEEDS_LIST}, which failed to load: ${error.message}`;
  if (isLoading) return `${NUMBER_NEEDS_LIST}: it's still loading…`;
  return null;
}

export type ChecklistId = 'collectorNumber' | 'name' | 'ink' | 'cost' | 'typeStats' | 'cardText' | 'image';
/** One line of "Ready to publish N/7". `message` says why it is open, and is null exactly when it is done. */
export interface ChecklistItem {id: ChecklistId; label: string; done: boolean; message: string | null}

interface ItemInput {
  form: RevealCardForm;
  errors: Errors;
  image: Pick<ImageStatus, 'ready' | 'error'>;
  /** The card list the collector number is checked against. */
  list: CardListStatus;
}
interface ItemSpec {
  id: ChecklistId;
  label: string;
  /** The validator's keys the item covers, in the form's order: it takes the first one's message as its own. */
  keys: readonly string[];
  /** Why the item is still open when none of its keys has a message, or null. */
  pending?: (input: ItemInput) => string | null;
}

const INK_NEEDS_NUMBER = 'Checked against the collector number: set it first';
const INK_NEEDS_FIXED_NUMBER = 'Checked against the collector number: fix it first';
const READING_IMAGE = 'Reading the image…';

/**
 * Why the Ink item waits: the number isn't in the set, so the ink-block check
 * hasn't run. A blank number is still to set. A filled one outside the set is
 * one the validator refuses (malformed, 0, or past the set, R-73), so it is to
 * fix.
 */
function inkPending({form}: ItemInput): string | null {
  if (numberInSet(form)) return null;
  return form.collectorNumber.trim() === '' ? INK_NEEDS_NUMBER : INK_NEEDS_FIXED_NUMBER;
}

/**
 * The image's error: the upload's own (bytes that aren't the image the name
 * claims, or a read that failed), else the validator's (no file yet, or a name
 * it refuses). The upload's comes first because it says what to do ("rename it
 * to end in .png").
 */
function imageError(errors: Errors, image: Pick<ImageStatus, 'error'>): string | null {
  return image.error ?? firstError(errors, ['image']);
}

/** Why the Image item is open: imageError, else "Reading the image…" until the bytes are read and pass. */
function imagePending({errors, image}: ItemInput): string | null {
  return imageError(errors, image) ?? (image.ready ? null : READING_IMAGE);
}

/** Why Collector number is open with no error of its own: the card list it is checked against isn't in (cardListPending). */
function numberPending({list}: ItemInput): string | null {
  return cardListPending(list);
}

/**
 * The checklist, in the form's order. Between them the keys cover every key
 * validateRevealCardForm reports but `image`, each once; the Image item reads
 * that one through imageError. Rarity is no item: it stays optional.
 */
const CHECKLIST: readonly ItemSpec[] = [
  // The number's own error first; then it waits for the card list it is checked against.
  {id: 'collectorNumber', label: 'Collector number', keys: ['collectorNumber'], pending: numberPending},
  {id: 'name', label: 'Name', keys: ['name']},
  // The tick follows the ink-block check, never the Amber default.
  {id: 'ink', label: 'Ink', keys: ['ink', 'ink2'], pending: inkPending},
  {id: 'cost', label: 'Cost', keys: ['cost']},
  {id: 'typeStats', label: 'Type and stats', keys: ['type', ...STAT_KEYS]},
  {id: 'cardText', label: 'Card text', keys: ['keywords', 'fullText']},
  {id: 'image', label: 'Image', keys: [], pending: imagePending},
];

/**
 * New reveal's checklist, from the validator. Every item is done exactly when
 * the validation passes, the card list has loaded without error and the
 * image's bytes are read: readyToPublish, the token aside. Each open item
 * carries the validator's message for it, a blank field's included, so the
 * list names what is left. With no `list`, the card list counts as loaded.
 */
export function revealChecklist(
  form: RevealCardForm,
  validation: ValidationResult,
  image: Pick<ImageStatus, 'ready' | 'error'>,
  list: CardListStatus = LIST_LOADED,
): ChecklistItem[] {
  const input: ItemInput = {form, errors: validation.errors, image, list};
  return CHECKLIST.map(({id, label, keys, pending}) => {
    const message = firstError(validation.errors, keys) ?? pending?.(input) ?? null;
    return {id, label, done: message === null, message};
  });
}

/**
 * The form's own keys, each with whether its value is still blank: text the
 * operator hasn't filled in, spaces included. Its other values never are.
 */
function blankness(form: RevealCardForm): Map<string, boolean> {
  return new Map(Object.entries(form).map(([key, value]) => [key, typeof value === 'string' && value.trim() === '']));
}

/**
 * The errors to show in red (R-72): only those on a value the operator filled
 * in, such as a malformed number, the ink-block clash, a collision or a glyph
 * word. A blank required field is incomplete, not wrong: it gets no inline
 * error and no aria-invalid, and the checklist names it instead. The image is
 * no form field: the file input takes visibleImageError.
 */
export function visibleErrors(form: RevealCardForm, errors: Errors): Record<string, string> {
  const blank = blankness(form);
  return Object.fromEntries(Object.entries(errors).filter(([key]) => blank.get(key) === false));
}

/**
 * The file input's error (R-72): once a file is chosen, imageError, the
 * upload's own error before the validator's. Before a file is chosen, "Upload a
 * card image" is the checklist's, never the input's.
 */
export function visibleImageError(errors: Errors, image: ImageStatus): string | null {
  return image.name === null ? null : imageError(errors, image);
}

export type SectionId = 'identity' | 'ink' | 'type' | 'text';
/** A section header's dot: red for an error, green when complete, neutral while incomplete. */
export type SectionState = 'error' | 'complete' | 'incomplete';
/** `message` is the section's first shown error, and null unless the state is 'error'. */
export interface SectionStatus {state: SectionState; message: string | null}

interface SectionSpec {
  /** The section's form keys, in the order it shows them. */
  keys: readonly (keyof RevealCardForm)[];
  /** Whether the validator could check the section yet: Ink waits for a number in the set. */
  checked: (form: RevealCardForm) => boolean;
}

const ALWAYS = () => true;

/**
 * The studio form's four sections and the keys each holds. Which values a section
 * requires is the validator's to say: it reports every blank required value.
 */
const SECTIONS: Readonly<Record<SectionId, SectionSpec>> = {
  identity: {keys: ['collectorNumber', 'name', 'version', 'franchise', 'subtypes'], checked: ALWAYS},
  ink: {keys: ['ink', 'ink2', 'rarity'], checked: numberInSet},
  type: {keys: ['type', 'inkwell', 'cost', ...STAT_KEYS], checked: ALWAYS},
  text: {keys: ['keywords', 'fullText', 'scanLanguage'], checked: ALWAYS},
};

interface SectionInput {form: RevealCardForm; errors: Errors; shown: Errors}

/** Red for a shown error; green with no error at all once checked; else neutral, as for a blank required value. */
function statusOf(spec: SectionSpec, {form, errors, shown}: SectionInput): SectionStatus {
  const error = firstError(shown, spec.keys);
  if (error !== null) return {state: 'error', message: error};
  const complete = firstError(errors, spec.keys) === null && spec.checked(form);
  return {state: complete ? 'complete' : 'incomplete', message: null};
}

/**
 * Each section's status, for its header dot and, when closed, its summary.
 * Only an error visibleErrors shows turns a section red (R-72): a fresh form's
 * sections are neutral, never red. The image belongs to no section.
 */
export function sectionStatuses(form: RevealCardForm, errors: Errors): Record<SectionId, SectionStatus> {
  const input: SectionInput = {form, errors, shown: visibleErrors(form, errors)};
  const {identity, ink, type, text} = SECTIONS;
  return {
    identity: statusOf(identity, input),
    ink: statusOf(ink, input),
    type: statusOf(type, input),
    text: statusOf(text, input),
  };
}
