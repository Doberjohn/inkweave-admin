import type {CardType, Ink, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {buildPreviewCard, type RevealCardForm} from '../reveal/buildPreviewCard';
import {REVEAL_SET_CODE, type StatField} from '../reveal/constants';
import {
  EDITABLE_CARD_KEYS,
  type EditableCardKey,
  type PreviewCardChanges,
} from '../reveal/replaceCardInPreviewJson';
import {validateRevealCardForm, type ValidationResult} from '../reveal/validateForm';

/** Why a card opens image-only (R-61, R-65). */
export type ImageOnlyReason = 'released' | 'unnumbered' | 'other-set' | 'unrepresentable';

/** What Edit card may change: the card's fields and image, or its image only, and why. */
export type CardKind = {kind: 'fields'} | {kind: 'image'; reason: ImageOnlyReason};

/** The line the studio shows for each reason (R-61, R-65). */
export const IMAGE_ONLY_NOTES: Readonly<Record<ImageOnlyReason, string>> = {
  released: "Card data comes from LorcanaJSON: only the image and the printings' versions can be changed here.",
  unnumbered: 'No collector number yet: numbering it changes its id, which goes by PR.',
  'other-set': `Admin's pin names set ${REVEAL_SET_CODE}; bump the pin to edit this card's fields.`,
  unrepresentable: "This entry holds data the form can't.",
};

/**
 * The card keys each form field builds, so a changed field is diffed on exactly
 * these. A type change rebuilds all four stats, because the type decides which
 * ones the card prints (STAT_FIELDS). The collector number builds none: Edit
 * never renumbers a card (R-91).
 */
export const FIELD_KEYS: Readonly<Record<keyof RevealCardForm, readonly EditableCardKey[]>> = {
  collectorNumber: [],
  name: ['name', 'fullName'],
  version: ['version', 'fullName'],
  rarity: ['rarity'],
  franchise: ['franchise'],
  cost: ['cost'],
  ink: ['color'],
  ink2: ['color'],
  inkwell: ['inkwell'],
  type: ['type', 'strength', 'willpower', 'lore', 'moveCost'],
  strength: ['strength'],
  willpower: ['willpower'],
  lore: ['lore'],
  moveCost: ['moveCost'],
  subtypes: ['subtypes'],
  keywords: ['abilities'],
  fullText: ['fullText', 'fullTextSections'],
  scanLanguage: ['scanLanguage'],
};

const FORM_FIELDS = Object.keys(FIELD_KEYS) as (keyof RevealCardForm)[];
const FIELDS: CardKind = {kind: 'fields'};
const NO_IDS: ReadonlySet<number> = new Set();

type Ability = NonNullable<LorcanaJSONCard['abilities']>[number];

/** JSON equality: arrays and abilities compare by value, in the file's own key order. */
function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** The entry's color as the form's two inks: "Ruby", or "Ruby-Sapphire". */
function inksOf(entry: LorcanaJSONCard): Pick<RevealCardForm, 'ink' | 'ink2'> {
  const [ink, ink2 = ''] = entry.color.split('-');
  return {ink: ink as Ink, ink2: ink2 as RevealCardForm['ink2']};
}

/** The optional words, '' where the entry has none, as toRevealForm fills them (adjudicate.mjs:471-494). */
function wordsOf(entry: LorcanaJSONCard): Pick<RevealCardForm, 'version' | 'rarity' | 'franchise' | 'subtypes' | 'fullText'> {
  return {
    version: entry.version ?? '',
    rarity: entry.rarity ?? '',
    franchise: entry.franchise ?? '',
    subtypes: (entry.subtypes ?? []).join(', '),
    fullText: entry.fullText ?? '',
  };
}

/** The stats as text, '' for one the entry lacks. */
function statsOf(entry: LorcanaJSONCard): Pick<RevealCardForm, StatField> {
  return {
    strength: String(entry.strength ?? ''),
    willpower: String(entry.willpower ?? ''),
    lore: String(entry.lore ?? ''),
    moveCost: String(entry.moveCost ?? ''),
  };
}

/** A keyword ability as its Keywords line, "Singer 5" or "Evasive": parseKeyword's reverse. */
function keywordLine({keyword, keywordValue}: Ability): string {
  return [keyword, keywordValue].filter(Boolean).join(' ');
}

/**
 * A previewCards.json entry as form values, the reverse of buildPreviewCard: the
 * color splits into the two inks, each keyword ability becomes a line, subtypes
 * join with ", ", numbers become text, and a missing optional field is ''. Any
 * other ability gets no line, so roundTrips refuses its entry. A scan language
 * SCAN_LANGUAGES doesn't list stays as it is (R-60).
 */
export function formFromPreviewCard(entry: LorcanaJSONCard): RevealCardForm {
  return {
    collectorNumber: String(entry.number ?? ''),
    name: entry.name,
    cost: String(entry.cost),
    inkwell: entry.inkwell,
    type: entry.type as CardType,
    keywords: (entry.abilities ?? []).filter((ability) => ability.type === 'keyword').map(keywordLine).join('\n'),
    scanLanguage: entry.scanLanguage ?? 'en',
    ...inksOf(entry),
    ...wordsOf(entry),
    ...statsOf(entry),
  };
}

/**
 * Whether the form holds the entry whole: building its form gives back the value
 * of every key Edit can write (R-65). One that doesn't (a named ability, a keyword
 * value that isn't a number, sections that aren't the text's lines, a stat its
 * type doesn't print) opens image-only, so a field edit can never rewrite data
 * the form dropped. So does a hand edit that breaks the entry's own type (no
 * color or name, subtypes that aren't a list): the form can't read it, so it
 * doesn't round-trip, rather than throw.
 */
export function roundTrips(entry: LorcanaJSONCard): boolean {
  try {
    const built = buildPreviewCard(formFromPreviewCard(entry));
    return EDITABLE_CARD_KEYS.every((key) => sameValue(built[key], entry[key]));
  } catch {
    return false;
  }
}

/** Why the entry opens image-only, or null when its fields are editable. Fails closed. */
function imageOnlyReason(entry: LorcanaJSONCard | null): ImageOnlyReason | null {
  if (entry === null) return 'released';
  if (entry.setCode !== REVEAL_SET_CODE) return 'other-set';
  if (!Number.isInteger(entry.number)) return 'unnumbered';
  return roundTrips(entry) ? null : 'unrepresentable';
}

/**
 * What Edit card may change on a card, from its previewCards.json entry on the
 * branch (null: none, a released card). Only a numbered entry of the reveal set
 * that round-trips opens with fields; any other opens image-only, with the
 * reason the studio shows (IMAGE_ONLY_NOTES).
 */
export function editKindOf(entry: LorcanaJSONCard | null): CardKind {
  const reason = imageOnlyReason(entry);
  return reason === null ? FIELDS : {kind: 'image', reason};
}

/** The form fields whose values differ. Edit locks the collector number, so a change there is a bug. */
function changedFields(before: RevealCardForm, after: RevealCardForm): (keyof RevealCardForm)[] {
  const fields = FORM_FIELDS.filter((field) => after[field] !== before[field]);
  if (fields.includes('collectorNumber')) {
    throw new Error("Edit card can't renumber a card: its id would change, which goes by PR");
  }
  return fields;
}

/**
 * What the edit changes on the card, for replaceCardInPreviewJson. Each changed
 * field's keys (FIELD_KEYS) take their values from buildPreviewCard(after), so
 * house style, keyword chips and sections come out as New card builds them.
 * A key the built card lacks is null (remove it). A value JSON-equal to the
 * loaded one is dropped, and so is a null for a key the loaded card lacks, so
 * typing that builds the same card ("Singer  5", spaces round the name) changes
 * nothing. Throws if the collector number changed.
 */
export function cardChanges(
  loaded: LorcanaJSONCard,
  before: RevealCardForm,
  after: RevealCardForm,
): PreviewCardChanges {
  const built = buildPreviewCard(after);
  const keys = new Set(changedFields(before, after).flatMap((field) => FIELD_KEYS[field]));
  const changed = [...keys]
    .map((key) => [key, built[key] ?? null] as const)
    .filter(([key, value]) => !sameValue(value, loaded[key] ?? null));
  return Object.fromEntries(changed) as PreviewCardChanges;
}

/**
 * New card's validator, for an edit. The number is locked, so the card's id is
 * its own and the id check runs against no ids. The image is optional: with none
 * staged, its error goes. Every other rule still runs.
 */
export function validateCardEdit(form: RevealCardForm, imageName: string | null): ValidationResult {
  const {errors} = validateRevealCardForm(form, NO_IDS, imageName);
  if (imageName === null) delete errors.image;
  return {ok: Object.keys(errors).length === 0, errors};
}

/**
 * The one edits rule, for Edit's dirty, its Save button, its save path and the
 * guard: a changed card key, or a staged image. Typing that builds the same card
 * changes no key, so it is no edit, and an undefined value is no change, as
 * replaceCardInPreviewJson reads it.
 */
export function hasEdits(edit: {changes: PreviewCardChanges; imageName: string | null}): boolean {
  return Object.values(edit.changes).some((value) => value !== undefined) || edit.imageName !== null;
}
