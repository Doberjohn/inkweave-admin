import type {LorcanaJSONCard} from 'inkweave-synergy-engine';

/**
 * The keys Edit card may change. Everything else on an entry (id, number,
 * setCode, variants, images) stays as loaded.
 */
export const EDITABLE_CARD_KEYS = [
  'name',
  'fullName',
  'version',
  'cost',
  'color',
  'inkwell',
  'type',
  'rarity',
  'franchise',
  'subtypes',
  'abilities',
  'fullText',
  'fullTextSections',
  'strength',
  'willpower',
  'lore',
  'moveCost',
  'scanLanguage',
] as const;

export type EditableCardKey = (typeof EDITABLE_CARD_KEYS)[number];

/** A new value per changed key; null removes the key (a cleared rarity, an English scan). */
export type PreviewCardChanges = {[K in EditableCardKey]?: LorcanaJSONCard[K] | null};

/** Keys every card carries, so an edit may change them but never remove them. */
const REQUIRED_KEYS: ReadonlySet<string> = new Set(['name', 'fullName', 'cost', 'color', 'inkwell', 'type']);
const EDITABLE: ReadonlySet<string> = new Set(EDITABLE_CARD_KEYS);

interface PreviewFile {
  cards: LorcanaJSONCard[];
}

/** The changes that say something: an undefined value is no change. */
function changeEntries(changes: PreviewCardChanges): [string, unknown][] {
  return Object.entries(changes).filter(([, value]) => value !== undefined);
}

/**
 * The card with the changes applied. A changed key keeps its place in the
 * entry, a new key goes last, and null removes the key. The id is never a
 * change, so a rename keeps the card's id.
 */
export function mergeCardChanges(card: LorcanaJSONCard, changes: PreviewCardChanges): LorcanaJSONCard {
  const merged: Record<string, unknown> = {...card};
  for (const [key, value] of changeEntries(changes)) {
    if (value === null) delete merged[key];
    else merged[key] = value;
  }
  return merged as unknown as LorcanaJSONCard;
}

/** Why `changes` can't be applied to any card, or null. */
function changesProblem(changes: PreviewCardChanges): string | null {
  const entries = changeEntries(changes);
  if (entries.length === 0) return 'no changes to apply';
  const foreign = entries.find(([key]) => !EDITABLE.has(key));
  if (foreign) return `"${foreign[0]}" is not a key Edit card may change`;
  const removed = entries.find(([key, value]) => value === null && REQUIRED_KEYS.has(key));
  return removed ? `every card needs "${removed[0]}"` : null;
}

function parsePreview(fileText: string): PreviewFile {
  let parsed: {cards?: unknown};
  try {
    parsed = JSON.parse(fileText) as {cards?: unknown};
  } catch {
    throw new Error('previewCards.json: the file is not valid JSON');
  }
  if (!Array.isArray(parsed.cards)) throw new Error('previewCards.json: the file has no cards array');
  return parsed as PreviewFile;
}

/** The cards of a previewCards.json text. Throws for text that is not JSON or has no cards array. */
export function previewCardsIn(fileText: string): LorcanaJSONCard[] {
  return parsePreview(fileText).cards;
}

/** How the app writes previewCards.json: two-space JSON and a closing newline. */
function serialize(data: unknown): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** The index of the one card with this id; a missing or repeated id throws. */
function indexOfCard(cards: readonly LorcanaJSONCard[], id: number): number {
  const index = cards.findIndex((c) => c.id === id);
  if (index < 0) throw new Error(`previewCards.json: no card has the id ${id}`);
  if (cards.findIndex((c, i) => i > index && c.id === id) >= 0) {
    throw new Error(`previewCards.json: the id ${id} appears more than once`);
  }
  return index;
}

/** One card replaced: the cards before, the new file's text, and where and what the card now is. */
interface Replacement {
  before: readonly LorcanaJSONCard[];
  out: string;
  index: number;
  card: LorcanaJSONCard;
}

/** Throws unless the new file holds the cards before with only the one at `index` replaced. */
function checkOnlyCardChanged({before, out, index, card}: Replacement): void {
  const after = parsePreview(out).cards;
  const othersKept = before.every((c, i) => i === index || sameJson(c, after[i]));
  const intact = after.length === before.length && sameJson(after[index], card) && othersKept;
  if (!intact) throw new Error('previewCards.json: the edit changed more than the one card');
}

/**
 * previewCards.json with one card's keys changed. The rest of the file keeps
 * its bytes: the app writes the file as two-space JSON, so a file that
 * re-serializes to itself can be rewritten whole, and one that doesn't is
 * refused rather than reformatted.
 *
 * Card studio commits the result straight to the target branch with no gate in
 * between, so this fails closed. It throws when the input is not JSON or has no
 * cards array, when it does not round-trip, when the id is missing or repeated,
 * when `changes` is empty, names a key Edit may not change, or removes a key
 * every card needs, and when the output holds anything but that one change.
 */
export function replaceCardInPreviewJson(fileText: string, id: number, changes: PreviewCardChanges): string {
  const data = parsePreview(fileText);
  if (serialize(data) !== fileText) {
    throw new Error('previewCards.json: the file is not in the two-space layout the app writes, so it is left alone');
  }
  const problem = changesProblem(changes);
  if (problem) throw new Error(`previewCards.json: ${problem}`);

  const index = indexOfCard(data.cards, id);
  const card = mergeCardChanges(data.cards[index], changes);
  const cards = data.cards.map((c, i) => (i === index ? card : c));
  const out = serialize({...data, cards});
  checkOnlyCardChanged({before: data.cards, out, index, card});
  return out;
}
