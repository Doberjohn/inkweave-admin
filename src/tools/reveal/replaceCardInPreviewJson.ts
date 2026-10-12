import type {LorcanaJSONCard} from 'inkweave-synergy-engine';

/*
 * Edit card's write to previewCards.json (R-2): one preview card's changed
 * fields, merged into its entry, with every other byte of the file kept.
 * Pure, so it is tested without the network. commitCardEdit (githubClient.ts,
 * R4-1b) runs it on the file as it is at the commit it builds on.
 *
 * It fails closed. Edit commits straight to the target branch, and the app's
 * master has no ruleset to stop a bad file, so every refusal below throws, and
 * a throw inside commitFiles' files callback commits nothing.
 *
 * reveal-sync never loads this module (scripts/reveal-sync/web.mjs loads the
 * form, build and insert modules by path), so it is not part of that contract.
 */

/** The keys Edit may change. Everything else on an entry (id, setCode, number, variants) stays as the file has it. */
export const EDITABLE_CARD_KEYS = [
  'name', 'fullName', 'version', 'cost', 'color', 'inkwell', 'type', 'rarity', 'franchise', 'subtypes',
  'abilities', 'fullText', 'fullTextSections', 'strength', 'willpower', 'lore', 'moveCost', 'scanLanguage',
] as const;

export type EditableCardKey = (typeof EDITABLE_CARD_KEYS)[number];

/**
 * A new value per changed key. null removes the key (a cleared rarity, an
 * English scan); an undefined value is no change.
 */
export type PreviewCardChanges = {[K in EditableCardKey]?: LorcanaJSONCard[K] | null};

/** One card's edit: its id in the file, which no edit changes, and the keys it changes. */
export interface PreviewCardEdit {
  id: number;
  changes: PreviewCardChanges;
}

/** previewCards.json, parsed: `metadata`, `sets` and `cards`, and any other key, kept as it is. */
interface PreviewFile {
  cards: LorcanaJSONCard[];
  [key: string]: unknown;
}

type ChangeEntry = [key: string, value: unknown];

const EDITABLE: ReadonlySet<string> = new Set(EDITABLE_CARD_KEYS);
/** The keys LorcanaJSONCard requires: an edit may change them, never remove them. */
const REQUIRED: ReadonlySet<string> = new Set(['name', 'fullName', 'cost', 'color', 'inkwell', 'type']);
/** The app's own rule (reveal-set-integrity.test.ts): a two-letter code other than en. */
const SCAN_LANGUAGE_CODE = /^(?!en$)[a-z]{2}$/;

/** The layout every writer of the file uses: the app's scripts, reveal-sync and the insert. */
const serialize = (file: PreviewFile) => `${JSON.stringify(file, null, 2)}\n`;

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** The keys an edit sets or removes: an undefined value is no change. */
function changedEntries(changes: PreviewCardChanges): ChangeEntry[] {
  return Object.entries(changes).filter(([, value]) => value !== undefined);
}

/**
 * The card with `changes` applied, as a new object. A changed key keeps its
 * place, a new key goes last, and null removes the key. Every key the edit
 * doesn't name (variants among them) stays as it is. It checks nothing:
 * replaceCardInPreviewJson does.
 */
export function mergeCardChanges(card: LorcanaJSONCard, changes: PreviewCardChanges): LorcanaJSONCard {
  const merged: Record<string, unknown> = {...card};
  for (const [key, value] of changedEntries(changes)) {
    if (value === null) delete merged[key];
    else merged[key] = value;
  }
  return merged as unknown as LorcanaJSONCard;
}

/** The file's parse, refused when it isn't JSON or holds no `cards` array. */
function parseFile(fileText: string): PreviewFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fileText);
  } catch {
    throw new Error('previewCards.json: the file is not valid JSON');
  }
  if (!Array.isArray((parsed as Partial<PreviewFile> | null)?.cards)) {
    throw new Error('previewCards.json: the file has no cards array');
  }
  return parsed as PreviewFile;
}

/**
 * Refused unless the file is laid out as serialize writes it. Then rewriting
 * it changes only the edited entry's lines; otherwise it would rewrite them all.
 */
function assertRoundTrips({fileText, file}: {fileText: string; file: PreviewFile}): void {
  if (serialize(file) === fileText) return;
  throw new Error(
    'previewCards.json is not laid out the way JSON.stringify(_, null, 2) writes it, so an edit would rewrite the whole file. Fix its layout in the app repo first.',
  );
}

function assertSomeChange(entries: readonly ChangeEntry[]): void {
  if (entries.length === 0) throw new Error('previewCards.json: the edit changes nothing');
}

/** Refused: a key outside EDITABLE_CARD_KEYS, or a required key set to null. */
function assertEditableKeys(entries: readonly ChangeEntry[]): void {
  const outside = entries.find(([key]) => !EDITABLE.has(key));
  if (outside) throw new Error(`previewCards.json: an edit can't change ${outside[0]}`);
  const removed = entries.filter(([, value]) => value === null).find(([key]) => REQUIRED.has(key));
  if (removed) throw new Error(`previewCards.json: every card needs ${removed[0]}, so an edit can't remove it`);
}

/** R-79: refused unless the scanLanguage it writes passes the app's integrity test. null (an English scan) removes it. */
function assertScanLanguage({scanLanguage}: PreviewCardChanges): void {
  if (scanLanguage == null || SCAN_LANGUAGE_CODE.test(scanLanguage)) return;
  throw new Error(
    `previewCards.json: scanLanguage takes a two-letter code other than en, not "${scanLanguage}"; an English scan has none`,
  );
}

/** Where card `id` sits in the file, refused unless exactly one entry has that id. */
function indexOfOnly({cards, id}: {cards: readonly LorcanaJSONCard[]; id: number}): number {
  const index = cards.findIndex((card) => card.id === id);
  if (index < 0) throw new Error(`previewCards.json has no card ${id}`);
  const count = cards.filter((card) => card.id === id).length;
  if (count > 1) throw new Error(`previewCards.json holds card ${id} ${count} times`);
  return index;
}

/** The file before the edit, the rewrite read back, and the edited entry's place. */
interface Rewrite {
  before: PreviewFile;
  after: PreviewFile;
  index: number;
}

/** What a rewrite keeps, each named for its refusal. */
const KEPT: [string, (rewrite: Rewrite) => boolean][] = [
  ['the number of cards', ({before, after}) => after.cards.length === before.cards.length],
  ["the card's place", ({before, after, index}) => after.cards[index].id === before.cards[index].id],
  ['another card', ({before, after, index}) => after.cards.every((card, i) => i === index || sameJson(card, before.cards[i]))],
  ['the file outside its cards', ({before, after}) => sameJson({...after, cards: []}, {...before, cards: []})],
];

/**
 * The rewrite, parsed back, against the file it came from. It can't fail
 * while the rewrite is built from the parsed file as below; it keeps the
 * outcome fail-closed if that ever changes (a textual splice, say).
 */
function assertOnlyThisCardChanged(rewrite: Rewrite): void {
  const broken = KEPT.find(([, kept]) => !kept(rewrite));
  if (broken) throw new Error(`previewCards.json: the edit would change ${broken[0]}`);
}

/**
 * previewCards.json's text with card `edit.id`'s entry merged with
 * `edit.changes` (mergeCardChanges), and every other byte as it was. The id
 * never changes, so a rename keeps the card's id and its place.
 *
 * It throws, and so commits nothing, when the file isn't JSON, has no cards
 * array, or isn't laid out as JSON.stringify(_, null, 2) writes it; when the
 * edit changes nothing, names a key outside EDITABLE_CARD_KEYS, removes a key
 * every card needs, or writes a scanLanguage the app refuses (R-79); and when
 * no entry, or more than one, has the id.
 */
export function replaceCardInPreviewJson(fileText: string, edit: PreviewCardEdit): string {
  const before = parseFile(fileText);
  assertRoundTrips({fileText, file: before});
  const entries = changedEntries(edit.changes);
  assertSomeChange(entries);
  assertEditableKeys(entries);
  assertScanLanguage(edit.changes);
  const index = indexOfOnly({cards: before.cards, id: edit.id});
  const cards = [...before.cards];
  cards[index] = mergeCardChanges(cards[index], edit.changes);
  const text = serialize({...before, cards});
  assertOnlyThisCardChanged({before, after: JSON.parse(text) as PreviewFile, index});
  return text;
}
