import type {PrintingFinishes} from 'inkweave-synergy-engine';
import type {Finish} from '../../../app-bridge';
import {finishesOfChoice, finishTitle, sameFinishes, type FinishChoice} from './finishValues';
import type {PrintingRef} from './printingHomes';
import type {PrintingRow} from './printingRows';

/*
 * The batch of version changes (#68): what Edit card's Printings panel stages, the Version changes
 * tray lists, and one publish writes. These are its rules, on plain values, so the store that keeps
 * the batch (versionBatchStore.ts) and the publish that writes it share them.
 *
 * A change leaves the batch by the owner's word alone: Revert or Drop, Discard all, a choice that
 * puts the printing back to what it showed, Keep mine on a clash the branch's new value settles, a
 * publish that sent it, or one that wrote what it asks for. Nothing here removes one for any other
 * reason.
 */

/**
 * What a publish found where a change's printing no longer has the value the change was staged
 * from. The change stays in the batch, marked with this, until the owner keeps it (on top of the
 * value the branch has now) or drops it.
 */
export interface VersionClash {
  /** The printing's id: the change it marks. */
  id: string;
  /** The `finishes` the branch's files give the printing now, or null where they give none. */
  now: PrintingFinishes | null;
  /** The versions it shows now. */
  shownNow: readonly Finish[];
  /** The printing is no longer in its primary home, so there is nothing to keep: only Drop settles it. */
  gone?: boolean;
}

/** One printing's versions, set from what the binder shows to what the owner chose. */
export interface VersionChange {
  /** The printing's id. The batch holds one change for each. */
  id: string;
  /** The row's label when the change was first staged: "Yen Sid - Powerful Sorcerer #223". */
  label: string;
  /** What finds the printing among the app's files. */
  ref: PrintingRef;
  /**
   * The `finishes` the printing's primary home held when the change was first staged, or null where
   * it held none: choosing again keeps it, and only Keep mine or a publish that wrote the printing
   * starts it again. A publish checks it.
   */
  from: PrintingFinishes | null;
  /** The versions it showed then. */
  shownFrom: readonly Finish[];
  /** What a publish writes: the owner's choice as an explicit value, Both included. */
  to: PrintingFinishes;
  /** Set once a publish found the printing changed on the branch. */
  clash?: VersionClash;
}

/** The pending changes of the whole studio: one for each printing, in the order they were staged. */
export interface VersionBatch {
  changes: readonly VersionChange[];
}

export const EMPTY_BATCH: VersionBatch = {changes: []};

/** The change that sets a row's printing to `choice`, from the value its row shows now. */
export function changeFor({row, choice}: {row: PrintingRow; choice: FinishChoice}): VersionChange {
  const {ref, label, value, shown} = row;
  return {id: ref.id, label, ref, from: value, shownFrom: shown, to: finishesOfChoice(choice)};
}

/**
 * The batch with `change` in it. A printing the batch already holds a change for keeps that
 * change's base (`from`, `shownFrom`, and a clash mark if it has one), and only what it writes
 * becomes the new choice: a publish checks the printing against what it held when the change was
 * first staged, so a row read again since (after a reload, say) never moves that. A choice that
 * sets the printing back to the versions it showed then takes the change out instead (`placed`).
 */
export function withChange(batch: VersionBatch, change: VersionChange): VersionBatch {
  const held = batch.changes.find((pending) => pending.id === change.id);
  return placed(batch, held ? {...held, to: change.to} : change);
}

/**
 * The batch with `change` in the place of its printing's change, or after the others where there
 * is none. A change that sets the printing to the versions it showed when the change started
 * leaves the batch instead, and takes the printing's earlier change with it, so no publish
 * rewrites what the binder already shows. Compared by what each shows, an explicit Both and a
 * missing field on a printing whose rarity gives Both are the same.
 */
function placed(batch: VersionBatch, change: VersionChange): VersionBatch {
  const held = batch.changes.some((pending) => pending.id === change.id);
  if (sameFinishes(change.to, change.shownFrom)) return held ? withoutChange(batch, change.id) : batch;
  const changes = held
    ? batch.changes.map((pending) => (pending.id === change.id ? change : pending))
    : [...batch.changes, change];
  return {changes};
}

/**
 * The change started again from what its printing's primary home holds (`from`) and shows
 * (`shownFrom`) now, with no clash mark: Keep mine on a clash, and a publish that wrote the
 * printing while the change waited.
 */
function restarted(change: VersionChange, base: Pick<VersionChange, 'from' | 'shownFrom'>): VersionChange {
  const {id, label, ref, to} = change;
  return {id, label, ref, to, ...base};
}

/** The batch without the printing's change. */
export function withoutChange(batch: VersionBatch, id: string): VersionBatch {
  return {changes: batch.changes.filter((change) => change.id !== id)};
}

/**
 * Whether a clash names a change the batch holds, which `withClashes` would mark. None does where
 * another tab published or reverted the changes a publish sent before its clashes came back.
 */
export function marksAny(batch: VersionBatch, clashes: readonly VersionClash[]): boolean {
  return clashes.some(({id}) => batch.changes.some((change) => change.id === id));
}

/** The batch with each change a clash names marked with it. The other changes are as they were. */
export function withClashes(batch: VersionBatch, clashes: readonly VersionClash[]): VersionBatch {
  return {
    changes: batch.changes.map((change) => {
      const clash = clashes.find((candidate) => candidate.id === change.id);
      return clash ? {...change, clash} : change;
    }),
  };
}

/**
 * Keeps a clashed change on top of the value the branch has now: the change starts from that
 * value, with no clash. If the branch now has what the change asked for, there is nothing left to
 * write and it leaves the batch. A printing that is gone has nothing to keep, nor has one that
 * isn't clashed: the batch comes back as it was.
 */
export function keptClash(batch: VersionBatch, id: string): VersionBatch {
  const change = batch.changes.find((pending) => pending.id === id);
  if (!change) return batch;
  const {clash} = change;
  if (!clash || clash.gone) return batch;
  return placed(batch, restarted(change, {from: clash.now, shownFrom: clash.shownNow}));
}

/** Whether a change is clashed, which keeps Publish off until the owner has kept or dropped it. */
export function hasClash(batch: VersionBatch): boolean {
  return batch.changes.some((change) => change.clash !== undefined);
}

/**
 * How many changes are clashed now: the marks a publish left that the owner has not yet kept or
 * dropped. It is the batch's own count, and not the number of clashes the publish found, which
 * only falls as the owner settles them.
 */
export function clashCount(batch: VersionBatch): number {
  return batch.changes.filter((change) => change.clash !== undefined).length;
}

/**
 * The batch once a publish landed: without the changes it sent, which it finds by identity. A
 * change staged again for a printing meanwhile (by another tab, say) is another object, so it
 * stays, started again from what the publish wrote (`leftAfter`).
 */
export function afterPublish(batch: VersionBatch, sent: readonly VersionChange[]): VersionBatch {
  return {changes: batch.changes.flatMap((change) => leftAfter(change, sent))};
}

/**
 * What a publish that sent `sent` leaves of a change: nothing of one it sent. One for a printing it
 * wrote all the same starts from what the publish wrote there, which the branch holds now, with no
 * clash mark, and leaves too if it asks for that very value. Any other is as it was.
 */
function leftAfter(change: VersionChange, sent: readonly VersionChange[]): VersionChange[] {
  if (sent.includes(change)) return [];
  const wrote = sent.find(({id}) => id === change.id);
  if (!wrote) return [change];
  const next = restarted(change, {from: wrote.to, shownFrom: wrote.to});
  return sameFinishes(next.to, next.shownFrom) ? [] : [next];
}

/**
 * What a change that takes a version away tells the owner before they publish it, or null where it
 * takes none. A player's copies counted in the version that goes are shown under the one that stays.
 */
export function removalNote({shownFrom, to}: VersionChange): string | null {
  const kept: readonly Finish[] = to;
  const removed = shownFrom.find((finish) => !kept.includes(finish));
  if (removed === undefined) return null;
  return `Removes ${finishTitle(removed)}. Copies counted in it will show under ${finishTitle(to[0])}.`;
}
