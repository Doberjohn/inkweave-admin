import type {CardType} from 'inkweave-synergy-engine';

export const CARD_TYPES: readonly CardType[] = ['Character', 'Action', 'Item', 'Location'];

/** A numeric stat on the reveal form. */
export type StatField = 'strength' | 'willpower' | 'lore' | 'moveCost';

/**
 * The stats each card type prints, and so the fields the form shows for it;
 * actions and items print none. Switching type hides the other fields but keeps
 * what was typed in them, so building and checking a card read this list.
 */
export const STAT_FIELDS: Readonly<Partial<Record<CardType, readonly StatField[]>>> = {
  Character: ['strength', 'willpower', 'lore'],
  Location: ['moveCost', 'willpower', 'lore'],
};

export const STAT_LABELS: Readonly<Record<StatField, string>> = {
  strength: 'Strength',
  willpower: 'Willpower',
  lore: 'Lore',
  moveCost: 'Move cost',
};

export const RARITIES: readonly string[] = [
  'Common',
  'Uncommon',
  'Rare',
  'Super Rare',
  'Legendary',
  'Enchanted',
];

/**
 * The language of the card's only official scan. Any but English marks the card
 * (`scanLanguage`) as shown with that scan and an unofficial English translation;
 * the app then offers "See translation" (Doberjohn/inkweave-admin#14).
 */
export const SCAN_LANGUAGES = [
  {code: 'en', label: 'English'},
  {code: 'ja', label: 'Japanese'},
  {code: 'de', label: 'German'},
  {code: 'it', label: 'Italian'},
] as const;

export type ScanLanguage = (typeof SCAN_LANGUAGES)[number]['code'];

/** Shown as a hint under the franchise field; matching one groups the card under that franchise on /reveals. */
export const FEATURED_FRANCHISE_HINT = 'Coco (exact match groups it; blank = returning)';

export {REVEAL_SET_CODE, REVEAL_ID_BASE} from '../../app-bridge';
