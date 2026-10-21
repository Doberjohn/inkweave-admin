import {useSyncExternalStore} from 'react';
import type {PrintingFinishes} from 'inkweave-synergy-engine';
import {targetBranch} from '../../../github/githubCommit';
import {CHOICE_OPTIONS, finishesOfChoice, sameFinishes} from './finishValues';
import {
  EMPTY_BATCH,
  keptClash,
  withChange,
  withoutChange,
  type VersionBatch,
  type VersionChange,
} from './versionBatch';

/*
 * The batch of version changes, for the whole studio (#68): Edit card's Printings panel stages into
 * it and the Version changes tray shows it, wherever the owner has moved in between. It is one
 * store for the tab, as useGithubToken is, so a change staged anywhere reaches every mounted
 * component at once.
 *
 * Each target branch has a batch of its own, saved in localStorage under the branch's name: a
 * reload keeps it, and a rehearsal's batch never shows, or publishes, on master. What a page reads
 * is its memory, which a save writes through to storage, so a save that fails (blocked site data, a
 * full quota) leaves the batch in memory for the page's life, and the next save that works writes
 * all of it. Whether a publish is under way, and how the last one ended, belong to the page alone
 * and are never saved.
 */

/** Where a branch's batch is saved: this prefix, then the branch's name. Admin's own keys start `inkweave-admin.`. */
export const VERSION_BATCH_KEY_PREFIX = 'inkweave-admin.version-batch.';

/** What a saved batch says its shape is, so a later shape can be told from this one. */
const SAVED_VERSION = 1;

/** How a publish that landed ended. */
export interface PublishResult {
  /** The commit it made. */
  commitUrl: string;
  /** How many changes it sent. */
  count: number;
}

/** What the Printings panel and the tray read, and what they do to it. */
export interface VersionBatchView {
  changes: readonly VersionChange[];
  /** A publish is under way. */
  publishing: boolean;
  /** The publish that landed last, until the batch changes again. */
  result: PublishResult | null;
  /** Why the last publish didn't land, until the batch changes again. */
  error: string | null;
  /** Adds a change, in the place of its printing's earlier one. One that restores what the printing showed removes it. */
  stage: (change: VersionChange) => void;
  /** Takes a printing's change out of the batch: Revert, and Drop on a clash. */
  revert: (id: string) => void;
  /** Takes every change out of the batch. */
  discard: () => void;
  /** Keeps a clashed change, on top of the value its printing has on the branch now. */
  keep: (id: string) => void;
  /** Writes the batch in one commit. */
  publish: (token: string) => Promise<void>;
}

/** What the store holds for one target branch. */
interface BranchState {
  batch: VersionBatch;
  publishing: boolean;
  result: PublishResult | null;
  error: string | null;
}

/** The shape saved text is read as, before any of it is trusted. */
interface SavedBatch {
  v?: unknown;
  changes?: unknown;
}

/** The key of the target branch's saved batch. */
const storageKey = () => `${VERSION_BATCH_KEY_PREFIX}${targetBranch()}`;

/** The values a change may write: what each choice the panel offers writes, and nothing else. */
const FINISHES_VALUES = CHOICE_OPTIONS.map(({value}) => finishesOfChoice(value));

/** Whether a value is one of the three `finishes` a change may write. */
function isFinishesValue(value: unknown): value is PrintingFinishes {
  return Array.isArray(value) && FINISHES_VALUES.some((valid) => sameFinishes(valid, value));
}

/**
 * Whether a saved entry is worth keeping. Only the versions it would write are checked: they go
 * into the app's data files, so a value that is not one of the three never reaches a publish.
 */
function isSavedChange(entry: unknown): entry is VersionChange {
  return typeof entry === 'object' && entry !== null && isFinishesValue((entry as {to?: unknown}).to);
}

/**
 * The changes saved for the target branch. Anything that isn't a saved batch of this version (no
 * key, text that isn't JSON, storage that throws) reads as an empty one, and an entry that isn't a
 * change is left out, with no word to the owner.
 */
function readSaved(): VersionChange[] {
  try {
    const text = localStorage.getItem(storageKey());
    const saved = text === null ? null : (JSON.parse(text) as SavedBatch | null);
    return saved?.v === SAVED_VERSION && Array.isArray(saved.changes) ? saved.changes.filter(isSavedChange) : [];
  } catch {
    return [];
  }
}

function writeSaved(batch: VersionBatch): void {
  try {
    localStorage.setItem(storageKey(), JSON.stringify({v: SAVED_VERSION, changes: batch.changes}));
  } catch {
    // Storage is blocked or full: the batch stays in memory, and the next save that works writes it all.
  }
}

function removeSaved(): void {
  try {
    localStorage.removeItem(storageKey());
  } catch {
    // Storage is blocked: nothing was saved.
  }
}

const listeners = new Set<() => void>();
/** Each branch's state, read from storage the first time the branch is asked for. */
const states = new Map<string, BranchState>();

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The store's snapshot: the target branch's state, the same object until something changes it, so
 * React re-renders only then.
 */
function snapshot(): BranchState {
  const branch = targetBranch();
  const kept = states.get(branch);
  if (kept) return kept;
  const loaded: BranchState = {batch: {changes: readSaved()}, publishing: false, result: null, error: null};
  states.set(branch, loaded);
  return loaded;
}

/** Makes `patch` part of the target branch's state, saves the batch if it changed, and tells every reader. */
function put(patch: Partial<BranchState>): void {
  const before = snapshot();
  const after = {...before, ...patch};
  states.set(targetBranch(), after);
  if (after.batch !== before.batch) writeSaved(after.batch);
  notify();
}

/**
 * Replaces the batch with what `update` makes of it. What the last publish said, how it landed or
 * why it didn't, is about a batch that has changed since, so it goes.
 */
function editBatch(update: (batch: VersionBatch) => VersionBatch): void {
  put({batch: update(snapshot().batch), result: null, error: null});
}

// The actions are module-level, so every render of every caller gets the same functions.

function stage(change: VersionChange): void {
  editBatch((batch) => withChange(batch, change));
}

function revert(id: string): void {
  editBatch((batch) => withoutChange(batch, id));
}

function discard(): void {
  editBatch(() => EMPTY_BATCH);
}

function keep(id: string): void {
  put({batch: keptClash(snapshot().batch, id)});
}

/** A publish does nothing yet: it arrives with the module that writes the batch. */
function publish(): Promise<void> {
  return Promise.resolve();
}

/** The shared batch of the target branch, and what the panel and the tray do to it. */
export function useVersionBatch(): VersionBatchView {
  const {batch, publishing, result, error} = useSyncExternalStore(subscribe, snapshot);
  return {changes: batch.changes, publishing, result, error, stage, revert, discard, keep, publish};
}

/**
 * Tests and stories only: src/test/setup.ts calls it before every test and .storybook/preview.tsx
 * before every story. Plain, it forgets what the store holds and deletes the target branch's saved
 * batch, so the next read is an empty batch. With `keepStorage` it forgets the memory alone, so the
 * next read is of what is saved, as after a reload.
 */
export function resetVersionBatch({keepStorage = false}: {keepStorage?: boolean} = {}): void {
  states.clear();
  if (!keepStorage) removeSaved();
  notify();
}
