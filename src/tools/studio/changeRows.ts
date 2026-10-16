import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import {STAT_LABELS} from '../reveal/constants';
import type {EditableCardKey, PreviewCardChanges} from '../reveal/replaceCardInPreviewJson';
import {languageName} from './scanLanguages';

/**
 * One line of Edit card's change list (R4-5e): what changed, and its value
 * before and after the edit. Both values are whole, never cut short: the list
 * wraps them, as R2's tray wraps its diffs (PendingTray's DIFF).
 */
export interface ChangeRow {
  /** The changed card key, or 'image' for a staged image. Unique in a list, so it keys the row. */
  id: EditableCardKey | 'image';
  label: string;
  from: string;
  to: string;
}

export interface ChangeRowsInput {
  /** The entry as the editor loaded it; null for a card that opens image-only (R-61, R-65). */
  loaded: LorcanaJSONCard | null;
  /** cardChanges' result (R4-2a): a new value per changed key, null for a removed one; {} for an image-only card. */
  changes: PreviewCardChanges;
  /** The staged image's file name, or null when none is staged. */
  imageName: string | null;
}

/**
 * Each key's label, in the order the list prints them: the studio form's,
 * section by section (Identity, Ink & rarity, Type & stats, Card text).
 * fullName follows from name and version, and fullTextSections from the card
 * text, so neither gets a row of its own (null).
 */
const LABELS: Readonly<Record<EditableCardKey, string | null>> = {
  name: 'Name',
  version: 'Version',
  fullName: null,
  franchise: 'Franchise',
  subtypes: 'Subtypes',
  color: 'Ink',
  rarity: 'Rarity',
  type: 'Type',
  inkwell: 'Inkwell',
  cost: 'Cost',
  ...STAT_LABELS,
  abilities: 'Keywords',
  fullText: 'Card text',
  fullTextSections: null,
  scanLanguage: 'Scan language',
};

/** The keys that get a row, with their labels, in LABELS' order. */
const LISTED = (Object.keys(LABELS) as EditableCardKey[]).flatMap((key) => {
  const label = LABELS[key];
  return label === null ? [] : [{key, label}];
});

/** How a present value reads, where String(value) won't do. */
const FORMAT: {[K in EditableCardKey]?: (value: NonNullable<LorcanaJSONCard[K]>) => string} = {
  color: (color) => color.split('-').join(' / '),
  inkwell: (inkable) => (inkable ? 'Inkable' : 'Uninkable'),
  subtypes: (subtypes) => subtypes.join(', '),
  abilities: (abilities) => abilities.map((ability) => ability.fullText).join(', '),
  scanLanguage: languageName,
};

/** How a missing value reads: a card with no scanLanguage has an English scan; any other key reads —. */
const MISSING: Partial<Record<EditableCardKey, string>> = {scanLanguage: 'English'};

function formatValue<K extends EditableCardKey>({key, value}: {key: K; value: LorcanaJSONCard[K] | null | undefined}): string {
  if (value === null || value === undefined) return MISSING[key] ?? '—';
  const format = FORMAT[key];
  return format ? format(value) : String(value);
}

/**
 * Edit card's change list: a row per changed key that has a label, in the
 * form's order, then the staged image's row. An image-only card has no field
 * changes, so its list holds the Image row alone. The Image row's wording is
 * the studio's one wording for it: the card panel's note and thumbnail say
 * "current art" too (R4-5d).
 */
export function changeRows({loaded, changes, imageName}: ChangeRowsInput): ChangeRow[] {
  const rows: ChangeRow[] = LISTED.filter(({key}) => changes[key] !== undefined).map(({key, label}) => ({
    id: key,
    label,
    from: formatValue({key, value: loaded?.[key]}),
    to: formatValue({key, value: changes[key]}),
  }));
  const image: ChangeRow[] = imageName === null ? [] : [{id: 'image', label: 'Image', from: 'current art', to: imageName}];
  return [...rows, ...image];
}

/** The change list's heading, as the handoff words it: "No changes yet", "1 change", "3 changes". */
export function changeCount(rows: readonly ChangeRow[]): string {
  if (rows.length === 0) return 'No changes yet';
  return rows.length === 1 ? '1 change' : `${rows.length} changes`;
}
