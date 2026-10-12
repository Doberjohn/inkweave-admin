import type {RevealCardForm} from './buildPreviewCard';

/**
 * A New reveal form before the operator types: every text field blank, the
 * controls on their defaults (Amber, a Character, inkable, an English scan).
 */
export const EMPTY_FORM: Readonly<RevealCardForm> = {
  collectorNumber: '',
  name: '',
  version: '',
  rarity: '',
  franchise: '',
  cost: '',
  ink: 'Amber',
  ink2: '',
  inkwell: true,
  type: 'Character',
  strength: '',
  willpower: '',
  lore: '',
  moveCost: '',
  subtypes: '',
  keywords: '',
  fullText: '',
  scanLanguage: 'en',
};

// EMPTY_FORM is a whole RevealCardForm, so its keys are every key a form holds.
const FORM_KEYS = Object.keys(EMPTY_FORM) as (keyof RevealCardForm)[];

/**
 * Whether two forms hold the same values, key by key. Unlike comparing two
 * JSON strings, the order the keys were set in doesn't count: a form patched
 * back to its start reads as unchanged.
 */
export function sameForm(a: Readonly<RevealCardForm>, b: Readonly<RevealCardForm>): boolean {
  return FORM_KEYS.every((key) => a[key] === b[key]);
}
