import {ALL_INKS} from '../../app-bridge';
import type {RevealCardForm} from '../reveal/buildPreviewCard';
import {STAT_FIELDS, type StatField} from '../reveal/constants';
import {intField, type ValidationResult} from '../reveal/validateForm';

export type ChecklistId = 'collectorNumber' | 'name' | 'ink' | 'cost' | 'typeStats' | 'cardText' | 'image';
export interface ChecklistItem {
  id: ChecklistId;
  label: string;
  done: boolean;
  /** Why the item is open: the validator's message, or the ink check's wait on the number. */
  message: string | null;
}

type Errors = ValidationResult['errors'];

const STAT_KEYS: readonly StatField[] = ['strength', 'willpower', 'lore', 'moveCost'];

/** Each item and the validator keys whose errors keep it open; together they cover every key. */
const ITEMS: readonly {id: ChecklistId; label: string; keys: readonly string[]}[] = [
  {id: 'collectorNumber', label: 'Collector number', keys: ['collectorNumber']},
  {id: 'name', label: 'Name', keys: ['name']},
  {id: 'ink', label: 'Ink', keys: ['ink', 'ink2']},
  {id: 'cost', label: 'Cost', keys: ['cost']},
  {id: 'typeStats', label: 'Type and stats', keys: ['type', ...STAT_KEYS]},
  {id: 'cardText', label: 'Card text', keys: ['fullText', 'keywords']},
  {id: 'image', label: 'Image', keys: ['image']},
];

const SET_NUMBER_FIRST = 'Checked against the collector number: set it first';

/** The first error among these keys, or null. */
function firstError(errors: Errors, keys: readonly string[]): string | null {
  const key = keys.find((k) => errors[k]);
  return key ? errors[key] : null;
}

/**
 * Whether the collector number is a positive whole number, as the validator
 * parses it. A number that collides with a card id still counts: the ink block
 * check reads only the number.
 */
function numberValid(form: RevealCardForm): boolean {
  const collector = intField(form.collectorNumber);
  return collector !== null && collector > 0;
}

/**
 * The publish checklist ("Ready to publish N/7"). Every item is done exactly
 * when the validation passes and the image's bytes are read, which is when
 * Publish turns on, the token aside. Ink waits on a valid number, because the
 * block check needs one, so the form's default ink never ticks it alone.
 */
export function revealChecklist(
  form: RevealCardForm,
  validation: ValidationResult,
  imageReady: boolean,
): ChecklistItem[] {
  const numberSet = numberValid(form);
  return ITEMS.map(({id, label, keys}) => {
    const error = firstError(validation.errors, keys);
    if (error) return {id, label, done: false, message: error};
    if (id === 'ink' && !numberSet) return {id, label, done: false, message: SET_NUMBER_FIRST};
    return {id, label, done: id !== 'image' || imageReady, message: null};
  });
}

export type SectionId = 'identity' | 'ink' | 'type' | 'text';

/** The form's fields by the studio section that shows them. */
export const SECTION_FIELDS: Readonly<Record<SectionId, readonly (keyof RevealCardForm)[]>> = {
  identity: ['collectorNumber', 'name', 'version', 'franchise', 'subtypes'],
  ink: ['ink', 'ink2', 'rarity'],
  type: ['type', 'inkwell', 'cost', ...STAT_KEYS],
  text: ['keywords', 'fullText', 'scanLanguage'],
};

/** Whether a field holds a value: text that isn't blank, or a choice (ink, type, inkwell), which always does. */
function hasValue(form: RevealCardForm, field: keyof RevealCardForm): boolean {
  const value = form[field];
  return typeof value !== 'string' || value.trim() !== '';
}

/** Whether a section's required values are in, errors aside. */
export const SECTION_REQUIRED: Readonly<Record<SectionId, (form: RevealCardForm) => boolean>> = {
  identity: (form) => hasValue(form, 'collectorNumber') && hasValue(form, 'name'),
  ink: (form) => ALL_INKS.includes(form.ink) && numberValid(form),
  type: (form) => hasValue(form, 'cost') && (STAT_FIELDS[form.type] ?? []).every((field) => hasValue(form, field)),
  text: () => true,
};

export type SectionState = 'error' | 'complete' | 'incomplete';

/**
 * A section's header state: the first error on a field that holds a value, else
 * complete once its required values are in, else incomplete. A blank field's
 * error only says the value is missing ("Name is required"), so a section still
 * being filled in reads incomplete, not in error.
 */
export function sectionStatus(
  section: SectionId,
  form: RevealCardForm,
  errors: Errors,
): {state: SectionState; message: string | null} {
  const filledFields = SECTION_FIELDS[section].filter((field) => hasValue(form, field));
  const message = firstError(errors, filledFields);
  if (message) return {state: 'error', message};
  return {state: SECTION_REQUIRED[section](form) ? 'complete' : 'incomplete', message: null};
}
