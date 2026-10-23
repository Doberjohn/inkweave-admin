import {findGlyphWords, findSpelledGlyphWords, type Ink} from 'inkweave-synergy-engine';
import type {RevealCardForm} from './buildPreviewCard';
import {ALL_INKS, SET_TOTAL, inkBlock} from '../../app-bridge';
import {extOf} from '../../components/fileName';
import {CARD_TYPES, REVEAL_ID_BASE, STAT_FIELDS, STAT_LABELS} from './constants';

const VALID_EXT = new Set(['jpg', 'jpeg', 'png', 'webp']);
/** How card data writes each glyph word, with a released example. Lore is a word when gained. */
const GLYPH_HINTS: Record<string, string> = {
  Ink: 'use ⬡ ("pay 2 ⬡")',
  Strength: 'use ¤ ("their ¤")',
  Willpower: 'use ⛉ ("+1 ⛉")',
  Lore: 'use ◊ for the stat ("+1 ◊"), or lowercase "lore" to gain it ("gain 2 lore")',
};

export interface ValidationResult {
  ok: boolean;
  errors: Record<string, string>;
}

type Errors = Record<string, string>;

/**
 * A released card of the reveal set, under its official id. Graduation moves a
 * set's cards off their preview ids: 14021 became 3286.
 */
export interface ReleasedCard {
  id: number;
  fullName: string;
}

/** Each reveal-set collector number a released card holds, with that card (releasedRevealNumbers). */
export type ReleasedNumbers = ReadonlyMap<number, ReleasedCard>;

/** What a new card's collector number can't take: an existing card's id, or a released card's number. */
interface TakenNumbers {
  ids: ReadonlySet<number>;
  released: ReleasedNumbers;
}

const NONE_RELEASED: ReleasedNumbers = new Map();

/**
 * Parse a trimmed whole number, or null when blank or anything else ("1.5",
 * "3foo", or digits past what a JavaScript number holds exactly). Exported so the
 * Card studio's checklist reads the collector number exactly as this file does.
 */
export function intField(value: string): number | null {
  const t = value.trim();
  const n = Number(t);
  return /^-?\d+$/.test(t) && Number.isSafeInteger(n) ? n : null;
}

/**
 * Why the collector number can't be a new card's, or undefined. Every number past
 * the set is an Epic, Enchanted or Iconic printing of one of its cards, and a
 * printing is never a card: it goes in through scripts/reveal-sync/variants.mjs.
 * A number a released card holds is taken under that card's official id, which
 * the preview id's check can't see.
 */
function collectorError(form: RevealCardForm, {ids, released}: TakenNumbers): string | undefined {
  const collector = intField(form.collectorNumber);
  if (collector === null || collector <= 0) return 'Enter a positive collector number';
  if (collector > SET_TOTAL) {
    return `#${collector} is past the ${SET_TOTAL}-card set: special printings go in through variants.mjs stage`;
  }
  const holder = released.get(collector);
  if (holder) return `#${collector} is already ${holder.fullName} (${holder.id})`;
  if (ids.has(REVEAL_ID_BASE + collector)) return `Card id ${REVEAL_ID_BASE + collector} already exists`;
  return undefined;
}

function checkIdentity(form: RevealCardForm, taken: TakenNumbers, errors: Errors): void {
  const collector = collectorError(form, taken);
  if (collector) errors.collectorNumber = collector;
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
 * last season's wrong-ink publishes. A number past the set belongs to no block, so
 * it isn't checked here: collectorError already refuses it.
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

/**
 * Card text must reach the data in house style (#635): the engine matches glyphs, so a
 * spelled-out "1 Ink" silently costs a card its mechanics. buildPreviewCard rewrites the
 * shapes it knows; a capitalized word still left is one it cannot place, so publish waits.
 * Keyword chips reach the ability text as typed, with no rewrite, so any glyph word there
 * is refused; no real keyword holds one.
 */
function checkCardText(form: RevealCardForm, errors: Errors): void {
  const [word] = findGlyphWords(form.fullText);
  if (word) errors.fullText = `"${word}" is spelled out: ${GLYPH_HINTS[word] ?? 'use its glyph'}`;
  const [chipWord] = findSpelledGlyphWords(form.keywords);
  if (chipWord) {
    errors.keywords = `Keywords take a name and a number only ("Shift 3"): remove "${chipWord}"`;
  }
}

function checkImage(imageName: string | null, errors: Errors): void {
  if (!imageName) {
    errors.image = 'Upload a card image';
    return;
  }
  if (!VALID_EXT.has(extOf(imageName))) errors.image = 'Image must be jpg, jpeg, png, or webp';
}

/**
 * Validate the reveal-card form before publish. Returns a map of field name ->
 * error message; `ok` is true only when there are no errors. Each concern is a
 * focused helper so no single function carries all the branching. `released`
 * is optional: Edit card, whose number is locked, passes none.
 */
export function validateRevealCardForm(
  form: RevealCardForm,
  existingIds: ReadonlySet<number>,
  imageName: string | null,
  released: ReleasedNumbers = NONE_RELEASED,
): ValidationResult {
  const errors: Errors = {};
  checkIdentity(form, {ids: existingIds, released}, errors);
  checkCostAndInk(form, errors);
  checkInkBlock(form, errors);
  checkStats(form, errors);
  checkCardText(form, errors);
  checkImage(imageName, errors);
  return {ok: Object.keys(errors).length === 0, errors};
}
