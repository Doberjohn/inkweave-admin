import type {Ink} from 'inkweave-synergy-engine';
import type {RevealCardForm} from './buildPreviewCard';
import {ALL_INKS, inkBlock} from '../../app-bridge';
import {CARD_TYPES, REVEAL_ID_BASE, STAT_FIELDS, STAT_LABELS} from './constants';

const VALID_EXT = new Set(['jpg', 'jpeg', 'png', 'webp']);

export interface ValidationResult {
  ok: boolean;
  errors: Record<string, string>;
}

type Errors = Record<string, string>;

/**
 * Parse a trimmed whole number, or null when blank or anything else ("1.5",
 * "3foo", or digits past what a JavaScript number holds exactly).
 */
function intField(value: string): number | null {
  const t = value.trim();
  const n = Number(t);
  return /^-?\d+$/.test(t) && Number.isSafeInteger(n) ? n : null;
}

function checkIdentity(form: RevealCardForm, existingIds: ReadonlySet<number>, errors: Errors): void {
  const collector = intField(form.collectorNumber);
  if (collector === null || collector <= 0) {
    errors.collectorNumber = 'Enter a positive collector number';
  } else if (existingIds.has(REVEAL_ID_BASE + collector)) {
    errors.collectorNumber = `Card id ${REVEAL_ID_BASE + collector} already exists`;
  }
  if (form.name.trim() === '') errors.name = 'Name is required';
}

function checkCostAndInk(form: RevealCardForm, errors: Errors): void {
  const cost = intField(form.cost);
  if (cost === null || cost < 0) errors.cost = 'Enter a cost (0 or more)';
  if (!ALL_INKS.includes(form.ink)) errors.ink = 'Choose an ink';
  if (form.ink2 && form.ink2 === form.ink) errors.ink2 = 'Second ink must differ from the first';
  if (!CARD_TYPES.includes(form.type)) errors.type = 'Choose a card type';
}

/** The ink whose block holds this collector number, or undefined past the numbered set. */
function inkOwning(collector: number): Ink | undefined {
  return ALL_INKS.find((ink) => {
    const {first, last} = inkBlock(ink);
    return collector >= first && collector <= last;
  });
}

/**
 * A set is numbered ink by ink, so the collector number implies the card's (first)
 * ink. Catches the form's default ink being left unchanged, which caused both of
 * last season's wrong-ink publishes. Numbers past the numbered set (promos,
 * enchanteds) belong to no block and are not checked.
 */
function checkInkBlock(form: RevealCardForm, errors: Errors): void {
  if (errors.ink) return;
  const collector = intField(form.collectorNumber);
  const owner = collector === null ? undefined : inkOwning(collector);
  if (!owner || owner === form.ink) return;
  const {first, last} = inkBlock(owner);
  errors.ink = `#${collector} is in the ${owner} block (${first}-${last}), not ${form.ink}`;
}

/** The stats the card's type prints (STAT_FIELDS) are required non-negative ints. */
function checkStats(form: RevealCardForm, errors: Errors): void {
  for (const field of STAT_FIELDS[form.type] ?? []) {
    const value = intField(form[field]);
    if (value === null || value < 0) {
      errors[field] = `Enter ${STAT_LABELS[field].toLowerCase()} for a ${form.type.toLowerCase()}`;
    }
  }
}

function checkImage(imageName: string | null, errors: Errors): void {
  if (!imageName) {
    errors.image = 'Upload a card image';
    return;
  }
  const ext = imageName.split('.').pop()?.toLowerCase() ?? '';
  if (!VALID_EXT.has(ext)) errors.image = 'Image must be jpg, jpeg, png, or webp';
}

/**
 * Validate the reveal-card form before publish. Returns a map of field name ->
 * error message; `ok` is true only when there are no errors. Each concern is a
 * focused helper so no single function carries all the branching.
 */
export function validateRevealCardForm(
  form: RevealCardForm,
  existingIds: ReadonlySet<number>,
  imageName: string | null,
): ValidationResult {
  const errors: Errors = {};
  checkIdentity(form, existingIds, errors);
  checkCostAndInk(form, errors);
  checkInkBlock(form, errors);
  checkStats(form, errors);
  checkImage(imageName, errors);
  return {ok: Object.keys(errors).length === 0, errors};
}
