import type {PrintingFinishes} from 'inkweave-synergy-engine';
import type {Finish} from '../../../app-bridge';
import {CHOICE_OPTIONS, finishesOfChoice, sameFinishes} from './finishValues';
import type {PrintingKind} from './printingHomes';
import type {VersionChange} from './versionBatch';

/*
 * Reading a saved batch back (#68). What localStorage hands over is text that anyone, or an
 * earlier build, may have written, and the studio reads it at once: the tray prints every field of
 * a change it lists, and a publish reads the rest. So an entry is kept only when each of those
 * fields is what a change holds, the versions it would write included (they go into the app's
 * data files). An entry that fails any check is left out with no word to the owner, since
 * unreadable storage isn't pending work worth a notice (Ruling 4). The batch holds one change for
 * each printing, so the first entry for an id is kept and the later ones are strays.
 *
 * An entry may carry keys the checks don't know: a later build can add one, and nothing here reads it.
 */

/** What a value is once it is known to be an object: its fields, none of them checked yet. */
type Fields = Readonly<Record<string, unknown>>;

/** The values a change may write: what each choice the panel offers writes, and nothing else. */
const FINISHES_VALUES = CHOICE_OPTIONS.map(({value}) => finishesOfChoice(value));

// Each list is every member of its type, which `satisfies` holds to: a type that gains one fails to compile here.
const VERSIONS: readonly unknown[] = Object.keys({normal: true, foil: true} satisfies Record<Finish, true>);
const KINDS: readonly unknown[] = Object.keys(
  {card: true, printing: true, promo: true} satisfies Record<PrintingKind, true>,
);

function isFields(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/** Whether a value is a list of versions, each normal or foil. */
function isVersions(value: unknown): value is readonly Finish[] {
  return Array.isArray(value) && value.every((version) => VERSIONS.includes(version));
}

/** The versions a printing showed: a list of them, with at least one. */
function isShown(value: unknown): boolean {
  return isVersions(value) && value.length > 0;
}

/** The `finishes` a file held: a list of versions, or null where it gave the printing none. */
function isHeld(value: unknown): boolean {
  return value === null || isVersions(value);
}

/** Whether a value is one of the three `finishes` a change may write. */
function isFinishesValue(value: unknown): value is PrintingFinishes {
  return Array.isArray(value) && FINISHES_VALUES.some((valid) => sameFinishes(valid, value));
}

/** What finds a printing among the files, which a publish reads whole. */
function isSavedRef(ref: unknown): boolean {
  const named = isFields(ref) && isString(ref.id) && isString(ref.setCode);
  return named && KINDS.includes(ref.kind) && typeof ref.core === 'boolean';
}

/** What a clash lists of the versions the branch shows: at least one, unless the printing is gone and has none. */
function showsNow({shownNow, gone}: Fields): boolean {
  return isVersions(shownNow) && (gone === true || shownNow.length > 0);
}

/** Whether `gone` says what it is for: absent, or true or false. */
function isGoneFlag(gone: unknown): boolean {
  return gone === undefined || typeof gone === 'boolean';
}

/** Whether a value is what a publish leaves on a change it found changed on the branch. */
function isSavedClash(clash: unknown): boolean {
  return isFields(clash) && isString(clash.id) && isHeld(clash.now) && showsNow(clash) && isGoneFlag(clash.gone);
}

/** Who the change is about: its id (not empty), the label its row prints, and what finds the printing. */
function hasIdentity({id, label, ref}: Fields): boolean {
  return isString(id) && id !== '' && isString(label) && isSavedRef(ref);
}

/** The versions it came from, the ones it showed and the ones it would write. */
function hasVersions({from, shownFrom, to}: Fields): boolean {
  return isHeld(from) && isShown(shownFrom) && isFinishesValue(to);
}

/** A change has no clash, or a clash that is whole: a null one is not none, as the batch's `hasClash` reads it. */
function hasWholeClash({clash}: Fields): boolean {
  return clash === undefined || isSavedClash(clash);
}

/** Whether a saved entry is a change the tray can print and a publish can write. */
function isSavedChange(entry: unknown): entry is VersionChange {
  return isFields(entry) && hasIdentity(entry) && hasVersions(entry) && hasWholeClash(entry);
}

/** The first change for each printing, in the order saved. */
function firstOfEachId(changes: readonly VersionChange[]): VersionChange[] {
  return changes.filter((change, index) => changes.findIndex(({id}) => id === change.id) === index);
}

/**
 * The changes a saved list holds: each entry that passes every check, and of those the first for
 * each printing. Any other entry is left out, with no word to the owner.
 */
export function savedChangesOf(entries: readonly unknown[]): VersionChange[] {
  return firstOfEachId(entries.filter(isSavedChange));
}
