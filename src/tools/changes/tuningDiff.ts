/*
 * What a commit did to tuning.json: every value it changed, added or removed, named as
 * the tuning editor names its rows ("Ramp · Tagline", "Shift Targets · curve.gap3 ·
 * score"), with what it read before and after.
 */

/** One value of tuning.json a commit changed. */
export interface TuningChange {
  /** Its path in the file, dotted: unique in a commit's list. */
  key: string;
  label: string;
  from: string;
  to: string;
}

type JsonObject = Readonly<Record<string, unknown>>;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** What a missing value reads as. */
const NONE = '—';

/** A value as its row prints it: a text as it is, anything else as JSON. */
function valueText(value: unknown): string {
  if (value === undefined) return NONE;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/** The file's two sections of named entries, and the tuning editor's names for each one's own fields (tuningRows' sectionRows). */
const SECTIONS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  playstyles: {name: 'Title', tagline: 'Tagline'},
  directRules: {name: 'Label', description: 'Description'},
};

/** An entry's name in `section` of the file, as tuningName gives it, or undefined where the section has no such entry. */
function nameIn(config: JsonObject, section: string, key: string): string | undefined {
  const entries = config[section];
  const entry = isObject(entries) && Object.hasOwn(entries, key) ? entries[key] : undefined;
  return isObject(entry) && typeof entry.name === 'string' ? entry.name : undefined;
}

/**
 * A path's label: its entry's name, then the rest of the path, an entry's own field by the
 * editor's name for it. A rule's texts (ruleTexts) take the name of the rule or playstyle
 * of their key. A path outside the entries reads as its keys.
 */
function labelOf(path: readonly string[], config: JsonObject): string {
  const [section, key, field, ...rest] = path;
  if (key === undefined) return path.join(' · ');
  const own = SECTIONS[section];
  if (own === undefined && section !== 'ruleTexts') return path.join(' · ');
  const name = own ? nameIn(config, section, key) : (nameIn(config, 'directRules', key) ?? nameIn(config, 'playstyles', key));
  const fieldLabel = field === undefined ? [] : [own?.[field] ?? field];
  return [name ?? key, ...fieldLabel, ...rest].join(' · ');
}

/** The two sides of one value, at its path. */
interface Sides {
  path: readonly string[];
  before: unknown;
  after: unknown;
}

/** Every leaf under `sides` whose value differs: an object on either side is walked key by key, anything else compared whole. */
function leafChanges({path, before, after}: Sides): Sides[] {
  if (isObject(before) || isObject(after)) {
    const a = isObject(before) ? before : {};
    const b = isObject(after) ? after : {};
    const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])];
    return keys.flatMap((key) => leafChanges({path: [...path, key], before: a[key], after: b[key]}));
  }
  return JSON.stringify(before) === JSON.stringify(after) ? [] : [{path, before, after}];
}

const parsed = (text: string | null): unknown => (text === null ? undefined : JSON.parse(text));

const asConfig = (value: unknown): JsonObject => (isObject(value) ? value : {});

/**
 * Every value a commit changed in tuning.json, given the file's text before and after
 * it (null for a side with no file). A value names its entry as the commit left it, or,
 * for an entry it removed, as it was before. Throws on text that isn't JSON.
 */
export function diffTuning({before, after}: {before: string | null; after: string | null}): TuningChange[] {
  const old = parsed(before);
  const now = parsed(after);
  return leafChanges({path: [], before: old, after: now}).map(({path, before: from, after: to}) => ({
    key: path.join('.'),
    label: labelOf(path, asConfig(to === undefined ? old : now)),
    from: valueText(from),
    to: valueText(to),
  }));
}
