import type {LorcanaJSONCard, PrintingFinishes} from 'inkweave-synergy-engine';
import {finishesOf} from '../../app-bridge';
import {EDITABLE_CARD_KEYS, type EditableCardKey, type PreviewCardChanges} from '../reveal/replaceCardInPreviewJson';
import {changeRows} from '../studio/changeRows';
import {choiceLabel} from '../studio/finishes/finishValues';
import type {DataEntry, EntryMap, Fields} from './dataEntries';

/*
 * What a commit did to the cards and printings of the card data files: an entry added,
 * removed, or changed in some of its values. A card's fields read in Edit card's words
 * (changeRows), a printing's versions in the Printings panel's (Both, Foil only, Normal
 * only, the ones its rarity gives where it names none), and any other key by its name.
 */

/** One value a change made to an entry: what it is, and how it read before and after. */
export interface ValueChange {
  /** Unique in its entry's list. */
  key: string;
  label: string;
  /** How it read before and after; null for a value too long to print in a line (an image's links). */
  from: string | null;
  to: string | null;
}

export type EntryChangeKind = 'added' | 'removed' | 'changed';

/** What one commit did to one card or printing, in every file that holds it. */
export interface EntryChange {
  id: string;
  /** The card Edit card opens for it (DataEntry's), or null. */
  cardId: string | null;
  label: string;
  kind: EntryChangeKind;
  /** What changed in a changed entry, Edit card's fields first, then its versions, then the rest; empty otherwise. */
  values: ValueChange[];
}

/** How long a value other than a card field or the versions may print before the line says only that it changed. */
const SHORT = 80;

/** What a missing value reads as. */
const NONE = '—';

const EDITABLE: ReadonlySet<string> = new Set<string>(EDITABLE_CARD_KEYS);

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The versions one side of an entry shows, as the Printings panel names them: its own
 * `finishes`, else its rarity's (`finishesOf`), which says so: "Both (by rarity)". An empty
 * list names none, as a missing one does, so its rarity's show.
 */
function versionsText(side: Fields): string {
  const own = Array.isArray(side.finishes) && side.finishes.length > 0 ? (side.finishes as PrintingFinishes) : undefined;
  const rarity = typeof side.rarity === 'string' ? side.rarity : undefined;
  const label = choiceLabel(finishesOf({rarity, finishes: own}));
  return own === undefined ? `${label} (by rarity)` : label;
}

/** Any other value: a short one as it is, a long one as null. */
function shortText(value: unknown): string | null {
  if (value === undefined) return NONE;
  const printed = typeof value === 'string' ? value : JSON.stringify(value);
  return printed.length <= SHORT ? printed : null;
}

/** The card fields that changed, as Edit card's change list words them. A key with no row there (fullName) adds none. */
function fieldRows(before: Fields, after: Fields, keys: readonly string[]): ValueChange[] {
  const changes: PreviewCardChanges = Object.fromEntries(keys.map((key) => [key, after[key] ?? null]));
  const loaded = before as unknown as LorcanaJSONCard;
  return changeRows({loaded, changes, imageName: null}).map(({id, label, from, to}) => ({key: id, label, from, to}));
}

/** Every value that differs between an entry's two sides. */
function valueChanges(before: Fields, after: Fields): ValueChange[] {
  const keys = [...new Set([...Object.keys(after), ...Object.keys(before)])].filter((key) => !same(before[key], after[key]));
  const fields = keys.filter((key): key is EditableCardKey => EDITABLE.has(key));
  const versions: ValueChange[] = keys.includes('finishes')
    ? [{key: 'finishes', label: 'Versions', from: versionsText(before), to: versionsText(after)}]
    : [];
  const rest = keys
    .filter((key) => key !== 'finishes' && !EDITABLE.has(key))
    .map((key) => ({key, label: key, from: shortText(before[key]), to: shortText(after[key])}));
  return [...fieldRows(before, after, fields), ...versions, ...rest];
}

/** An entry as a change of `kind` with no values listed. */
function changeOf({id, cardId, label}: DataEntry, kind: EntryChangeKind): EntryChange {
  return {id, cardId, label, kind, values: []};
}

/** One file's two sides: what it held before the commit, and after. A file the commit added or removed holds nothing on that side. */
export interface FileSides {
  before: EntryMap;
  after: EntryMap;
}

/** What a commit did to one file's entries: the ones it added or changed, in the file's order, then the ones it removed. */
export function diffEntries({before, after}: FileSides): EntryChange[] {
  const changes: EntryChange[] = [];
  for (const entry of after.values()) {
    const old = before.get(entry.id);
    const values = old === undefined ? [] : valueChanges(old.fields, entry.fields);
    if (old === undefined) changes.push(changeOf(entry, 'added'));
    else if (values.length > 0) changes.push({...changeOf(entry, 'changed'), values});
  }
  for (const entry of before.values()) if (!after.has(entry.id)) changes.push(changeOf(entry, 'removed'));
  return changes;
}

/**
 * Several files' changes as one change per entry: a promo's change to the catalog,
 * promos.json and allCards.json is one line. The first file to list an entry names it and
 * says what happened to it; the others add only values it doesn't list yet.
 */
export function mergeEntryChanges(perFile: readonly (readonly EntryChange[])[]): EntryChange[] {
  const byId = new Map<string, EntryChange>();
  for (const change of perFile.flat()) {
    const seen = byId.get(change.id);
    if (seen === undefined) byId.set(change.id, change);
    else byId.set(change.id, {...seen, values: [...seen.values, ...change.values.filter((v) => !seen.values.some((s) => s.key === v.key))]});
  }
  return [...byId.values()];
}
