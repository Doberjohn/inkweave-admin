import {
  transformCards,
  type CardType,
  type Ink,
  type LorcanaCard,
  type LorcanaJSONCard,
} from 'inkweave-synergy-engine';
import {buildPreviewCard, type RevealCardForm} from '../reveal/buildPreviewCard';
import {
  REVEAL_ID_BASE,
  REVEAL_SET_CODE,
  SCAN_LANGUAGES,
  STAT_LABELS,
  type ScanLanguage,
  type StatField,
} from '../reveal/constants';
import {
  EDITABLE_CARD_KEYS,
  type EditableCardKey,
  type PreviewCardChanges,
} from '../reveal/replaceCardInPreviewJson';
import {validateRevealCardForm, type ValidationResult} from '../reveal/validateForm';
import {filterCards} from '../image/filterCards';

/** Preview: the branch's previewCards.json holds the card. Released: it doesn't. */
export type CardTag = 'Preview' | 'Released';
/** What Edit card may change: the card's fields and image, or only its image. */
export type EditKind = 'fields' | 'image';
/** One line of the change list: a field, its value now, and the value a save writes. */
export interface ChangeRow {
  label: string;
  from: string;
  to: string;
}
export interface SearchRow {
  card: LorcanaCard;
  tag: CardTag;
}

/** The rows a search shows at most; its `total` still counts every match. */
export const SEARCH_LIMIT = 40;

const STAT_KEYS: readonly StatField[] = ['strength', 'willpower', 'lore', 'moveCost'];
const NO_VALUE = '—';

type FormField = keyof RevealCardForm;

/**
 * The card keys each form field writes. The collector number writes none: Edit
 * shows it read-only, because the card's id comes from it.
 */
const FIELD_KEYS: Readonly<Record<FormField, readonly EditableCardKey[]>> = {
  collectorNumber: [],
  name: ['name', 'version', 'fullName'],
  version: ['name', 'version', 'fullName'],
  rarity: ['rarity'],
  franchise: ['franchise'],
  cost: ['cost'],
  ink: ['color'],
  ink2: ['color'],
  inkwell: ['inkwell'],
  // A new type prints other stats, so every stat key follows it.
  type: ['type', ...STAT_KEYS],
  strength: ['strength'],
  willpower: ['willpower'],
  lore: ['lore'],
  moveCost: ['moveCost'],
  subtypes: ['subtypes'],
  keywords: ['abilities'],
  fullText: ['fullText', 'fullTextSections'],
  scanLanguage: ['scanLanguage'],
};

/** The change list's label per key. fullName and fullTextSections follow other fields and get no row. */
const ROW_LABELS: Readonly<Partial<Record<EditableCardKey, string>>> = {
  name: 'Name',
  version: 'Version',
  cost: 'Cost',
  color: 'Ink',
  inkwell: 'Inkwell',
  type: 'Type',
  rarity: 'Rarity',
  franchise: 'Franchise',
  subtypes: 'Subtypes',
  abilities: 'Keywords',
  fullText: 'Card text',
  ...STAT_LABELS,
  scanLanguage: 'Scan language',
};

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Preview when the branch's file holds the card. Card ids are strings; the file's are numbers. */
export function cardTag(card: LorcanaCard, previewIds: ReadonlySet<number>): CardTag {
  return previewIds.has(Number(card.id)) ? 'Preview' : 'Released';
}

/** The collector number, name and the optional words, as the form holds them. */
function identityFields(entry: LorcanaJSONCard): Pick<RevealCardForm, 'collectorNumber' | 'name' | 'version' | 'rarity' | 'franchise'> {
  return {
    collectorNumber: entry.number === undefined ? '' : String(entry.number),
    name: entry.name,
    version: entry.version ?? '',
    rarity: entry.rarity ?? '',
    franchise: entry.franchise ?? '',
  };
}

/** "Amber-Steel" splits into the form's two inks; a single ink leaves the second blank. */
function inkFields(entry: LorcanaJSONCard): Pick<RevealCardForm, 'ink' | 'ink2'> {
  const [ink, ink2 = ''] = entry.color.split('-');
  return {ink: ink as Ink, ink2: ink2 as '' | Ink};
}

/** Every stat as text: '' where the card prints none. */
function statFields(entry: LorcanaJSONCard): Pick<RevealCardForm, StatField> {
  const texts = STAT_KEYS.map((key) => [key, entry[key] === undefined ? '' : String(entry[key])]);
  return Object.fromEntries(texts) as Pick<RevealCardForm, StatField>;
}

/** Keyword abilities as the form's lines ("Singer 5", "Evasive"), the only abilities a reveal writes. */
function keywordLines(entry: LorcanaJSONCard): string {
  return (entry.abilities ?? [])
    .filter((ability) => ability.type === 'keyword')
    .map((ability) => [ability.keyword, ability.keywordValue].filter(Boolean).join(' '))
    .join('\n');
}

/** Subtypes, keywords, card text and scan language, as the form holds them. */
function textFields(entry: LorcanaJSONCard): Pick<RevealCardForm, 'subtypes' | 'keywords' | 'fullText' | 'scanLanguage'> {
  return {
    subtypes: (entry.subtypes ?? []).join(', '),
    keywords: keywordLines(entry),
    fullText: entry.fullText ?? '',
    // An unlisted code ('fr') stays as it is, and buildPreviewCard writes it back unchanged.
    scanLanguage: (entry.scanLanguage ?? 'en') as ScanLanguage,
  };
}

/** A previewCards.json entry as form values: the reverse of buildPreviewCard. */
export function formFromPreviewCard(entry: LorcanaJSONCard): RevealCardForm {
  return {
    ...identityFields(entry),
    cost: String(entry.cost),
    ...inkFields(entry),
    inkwell: entry.inkwell,
    type: entry.type as CardType,
    ...statFields(entry),
    ...textFields(entry),
  };
}

/** A numbered card of the reveal set, filed under the id its number gives, as New reveal files it. */
function isRevealEntry(entry: LorcanaJSONCard): boolean {
  const collector = entry.number;
  if (collector === undefined) return false;
  return entry.setCode === REVEAL_SET_CODE && entry.id === REVEAL_ID_BASE + collector;
}

/** Whether the form holds the entry exactly: building it back gives every editable key as it is. */
function formHolds(entry: LorcanaJSONCard): boolean {
  const built = buildPreviewCard(formFromPreviewCard(entry));
  return EDITABLE_CARD_KEYS.every((key) => sameJson(built[key], entry[key]));
}

/**
 * 'fields' for a previewCards.json entry the form can edit: a numbered card of
 * the reveal set that the form holds exactly. Anything else is image-only: a
 * released card (no entry), a preview card of another set, and an entry edited
 * by hand into a shape the form can't write back, so a save never rewrites what
 * the form doesn't show.
 */
export function editKindOf(entry: LorcanaJSONCard | undefined): EditKind {
  if (!entry || !isRevealEntry(entry)) return 'image';
  return formHolds(entry) ? 'fields' : 'image';
}

/** The form fields whose values differ between the two forms. */
function changedFields(before: RevealCardForm, after: RevealCardForm): FormField[] {
  return (Object.keys(after) as FormField[]).filter((field) => before[field] !== after[field]);
}

/**
 * The previewCards.json changes an edit makes: each changed form field's card
 * keys, valued as buildPreviewCard builds them, so house style, keyword chips and
 * text sections come out exactly as New reveal writes them. A key the built card
 * lacks becomes null, and a key that ends up as the loaded card has it is dropped,
 * so an edit typed and then undone changes nothing. Throws when the collector
 * number changed, which Edit never does.
 */
export function cardChanges(
  loaded: LorcanaJSONCard,
  before: RevealCardForm,
  after: RevealCardForm,
): PreviewCardChanges {
  const fields = changedFields(before, after);
  if (fields.includes('collectorNumber')) throw new Error('Edit card never changes the collector number');
  const built = buildPreviewCard(after);
  const changes: Record<string, unknown> = {};
  for (const key of new Set(fields.flatMap((field) => FIELD_KEYS[field]))) {
    const value = built[key] ?? null;
    if (!sameJson(value, loaded[key] ?? null)) changes[key] = value;
  }
  return changes as PreviewCardChanges;
}

/**
 * New reveal's checks for an edited card. The card's own id is no collision, and
 * the image is optional: with none staged there is no image error, though a staged
 * file still needs an image extension.
 */
export function validateCardEdit(
  form: RevealCardForm,
  existingIds: ReadonlySet<number>,
  loadedId: number,
  imageName: string | null,
): ValidationResult {
  const otherIds = new Set(existingIds);
  otherIds.delete(loadedId);
  const {errors} = validateRevealCardForm(form, otherIds, imageName);
  if (imageName === null) delete errors.image;
  return {ok: Object.keys(errors).length === 0, errors};
}

/** A scan language's name: English for none, the code itself for one the form doesn't list. */
function languageName(code: unknown): string {
  const listed = SCAN_LANGUAGES.find((language) => language.code === (code ?? 'en'));
  return listed ? listed.label : String(code);
}

/** One item of a list value: a subtype as it is, a keyword ability by its text. */
function listItem(item: unknown): string {
  return typeof item === 'string' ? item : String((item as {fullText?: unknown}).fullText);
}

/** A card value as the change list reads it. */
function shown(key: EditableCardKey, value: unknown): string {
  if (key === 'scanLanguage') return languageName(value);
  if (value === undefined || value === null) return NO_VALUE;
  if (key === 'inkwell') return value ? 'Inkable' : 'Uninkable';
  if (Array.isArray(value)) return value.map(listItem).join(', ');
  return String(value);
}

/**
 * The change list a save asks about: a row per changed field, in the form's
 * order, and the staged image last. A released card has no entry (null) and
 * only ever an image row.
 */
export function changeRows(
  loaded: LorcanaJSONCard | null,
  changes: PreviewCardChanges,
  imageName: string | null,
): ChangeRow[] {
  const rows = EDITABLE_CARD_KEYS.flatMap((key) => {
    const label = ROW_LABELS[key];
    if (!label || changes[key] === undefined) return [];
    return [{label, from: shown(key, loaded?.[key]), to: shown(key, changes[key])}];
  });
  if (imageName !== null) rows.push({label: 'Image', from: 'current', to: imageName});
  return rows;
}

/** A staged image: none, chosen but not usable yet (still being read, or refused), or read and checked. */
export type StagedImageState = 'none' | 'pending' | 'ready';

/** What decides whether Save is on. */
export interface SaveGate {
  saving: boolean;
  /** The form changes previewCards.json (cardChanges is not empty). */
  fieldChanges: boolean;
  /** The form passes validateCardEdit. */
  valid: boolean;
  image: StagedImageState;
}

/**
 * Whether Save is on: nothing is saving, no staged image is still pending, and
 * there is something to save that passes the checks. Field changes need the
 * form to validate. An image alone needs nothing more: the upload's byte check
 * already holds it to a jpg, jpeg, png or webp that matches its name, and the
 * image commit leaves the card's data as it is.
 */
export function canSaveEdit(gate: SaveGate): boolean {
  if (gate.saving || gate.image === 'pending') return false;
  return gate.fieldChanges ? gate.valid : gate.image === 'ready';
}

/**
 * The cards Edit card searches: the live card list, then the branch's preview
 * cards the live site doesn't list yet (published since its last deploy, or only
 * on a rehearsal branch). Those have no image until a deploy converts their scan.
 */
export function withBranchPreviews(cards: LorcanaCard[], entries: readonly LorcanaJSONCard[]): LorcanaCard[] {
  const live = new Set(cards.map((card) => card.id));
  const fresh = entries.filter((entry) => !live.has(String(entry.id)));
  return [...cards, ...transformCards(fresh)];
}

/**
 * The search's first SEARCH_LIMIT matches, each tagged Preview or Released, and
 * how many cards match in all. It matches as the image tool's picker does: the
 * full name or the id, full-name prefixes first.
 */
export function searchCards(
  cards: LorcanaCard[],
  query: string,
  previewIds: ReadonlySet<number>,
): {rows: SearchRow[]; total: number} {
  const matches = filterCards(cards, query, Infinity);
  const rows = matches.slice(0, SEARCH_LIMIT).map((card) => ({card, tag: cardTag(card, previewIds)}));
  return {rows, total: matches.length};
}
