import {useSyncExternalStore} from 'react';
import type {PrintingFinishes} from 'inkweave-synergy-engine';
import {targetBranch} from '../../../github/githubCommit';
import {forgetBranchFiles} from './branchFiles';
import {CHOICE_OPTIONS, finishesOfChoice, sameFinishes} from './finishValues';
import {clashMessage, publishVersions, VersionClashError} from './publishVersions';
import {
  EMPTY_BATCH,
  afterPublish,
  hasClash,
  keptClash,
  withChange,
  withClashes,
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
 *
 * Another tab on the same branch saves to the same key, and a save writes the whole batch, so a
 * page that never read it back would write over what the other tab staged. A page follows it
 * instead: a storage event makes the batch what is saved, and so does a read when the first
 * component starts to listen, since the events of the time before went unheard (unless a save
 * failed here, and memory is the only place the batch is). The changes it already holds, just as
 * they are saved, stay the same objects: a publish in flight takes what it sent out by identity
 * (`afterPublish`). Storage that can't be read says nothing, so the batch stays.
 *
 * A publish sends the changes staged when it starts (publishVersions.ts), and the owner may stage
 * more meanwhile, here or in another tab. When it lands only the changes it sent leave the batch.
 * When it finds clashes it marks them on their changes, and the batch stays, as it does for any
 * other failure. A landing or a clash writes the batch, so it first takes in what is saved, as the
 * first component to listen does: no component may have listened while the publish ran.
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
  /** The publish that landed last, until the owner stages, reverts or discards a change, or publishes again. */
  result: PublishResult | null;
  /** Why the last publish didn't land, until the owner stages, reverts or discards a change, or publishes again. */
  error: string | null;
  /** Adds a change, in the place of its printing's earlier one. One that restores what the printing showed removes it. */
  stage: (change: VersionChange) => void;
  /** Takes a printing's change out of the batch: Revert, and Drop on a clash. */
  revert: (id: string) => void;
  /** Takes every change out of the batch. */
  discard: () => void;
  /** Keeps a clashed change, on top of the value its printing has on the branch now. */
  keep: (id: string) => void;
  /** Writes the batch in one commit, unless a publish is under way, nothing is staged or a clash is open. */
  publish: (token: string) => Promise<void>;
}

/** What the store holds for one target branch. */
interface BranchState {
  batch: VersionBatch;
  /** The last save of the batch failed: storage holds an older one, which a read of it must not put back. */
  unsaved: boolean;
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
 * The changes a saved text holds. Anything that isn't a saved batch of this version (no text, text
 * that isn't JSON) holds none, and an entry that isn't a change is left out, with no word to the owner.
 */
function changesIn(text: string | null): VersionChange[] {
  try {
    const saved = text === null ? null : (JSON.parse(text) as SavedBatch | null);
    return saved?.v === SAVED_VERSION && Array.isArray(saved.changes) ? saved.changes.filter(isSavedChange) : [];
  } catch {
    return [];
  }
}

/**
 * The changes saved for the target branch, or null where storage can't be read, which says nothing
 * about the batch: the empty one that no key gives is a batch, and this is not.
 */
function readSaved(): VersionChange[] | null {
  try {
    return changesIn(localStorage.getItem(storageKey()));
  } catch {
    return null;
  }
}

/** Saves the batch, and says whether it was saved. */
function writeSaved(batch: VersionBatch): boolean {
  try {
    localStorage.setItem(storageKey(), JSON.stringify({v: SAVED_VERSION, changes: batch.changes}));
    return true;
  } catch {
    return false; // storage is blocked or full: the batch stays in memory, and the next save that works writes it all
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

/**
 * The store's snapshot: the target branch's state, the same object until something changes it, so
 * React re-renders only then.
 */
function snapshot(): BranchState {
  const branch = targetBranch();
  const kept = states.get(branch);
  if (kept) return kept;
  const loaded: BranchState = {
    batch: {changes: readSaved() ?? []},
    unsaved: false,
    publishing: false,
    result: null,
    error: null,
  };
  states.set(branch, loaded);
  return loaded;
}

/** What `put` takes: the state but `unsaved`, which it works out from whether the batch could be saved. */
type StatePatch = Partial<Omit<BranchState, 'unsaved'>>;

/** Makes `patch` part of the target branch's state, saves the batch if it changed, and tells every reader. */
function put(patch: StatePatch): void {
  const before = snapshot();
  const after = {...before, ...patch};
  const saved = after.batch === before.batch ? !before.unsaved : writeSaved(after.batch);
  states.set(targetBranch(), {...after, unsaved: !saved});
  notify();
}

/** Whether two changes are the same. They are plain data, so each is what its text says. */
const sameChange = (a: VersionChange, b: VersionChange) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The batch of the saved changes, where each one the batch already holds, just as it is saved, stays
 * the same object: a publish in flight takes the changes it sent out by identity, and a read that
 * handed it copies would leave them in the batch after they landed. Where nothing differs it is the
 * batch itself.
 */
function reconciled(batch: VersionBatch, saved: readonly VersionChange[]): VersionBatch {
  const changes = saved.map((change) => batch.changes.find((held) => sameChange(held, change)) ?? change);
  const same = changes.length === batch.changes.length && changes.every((change, i) => change === batch.changes[i]);
  return same ? batch : {changes};
}

/**
 * Makes the target branch's batch what is saved for it, which another tab may have changed since.
 * What a publish has to say (`publishing`, `result`, `error`) is left as it is, and so is the batch
 * when nothing differs, with no word to the readers. Storage that can't be read says nothing.
 */
function adoptSaved(): void {
  const before = snapshot();
  const saved = readSaved();
  if (saved === null) return;
  const batch = reconciled(before.batch, saved);
  if (batch === before.batch) return;
  states.set(targetBranch(), {...before, batch, unsaved: false});
  notify();
}

/**
 * Another tab changed storage: it saved a key, or cleared all of it, which arrives with no key.
 * The browser never fires it in the tab that wrote.
 */
function onStorage(event: StorageEvent): void {
  if (event.key === null || event.key === storageKey()) adoptSaved();
}

/**
 * The store listens to other tabs while a component listens to it. The first one also reads what is
 * saved, since the events of the time before went unheard, unless a save failed here and memory is
 * the only place the batch is.
 */
function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    window.addEventListener('storage', onStorage);
    if (!snapshot().unsaved) adoptSaved();
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', onStorage);
  };
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

/**
 * Before a publish that ended writes the batch, makes it what is saved: while no component
 * listened, the saves of other tabs went unheard, and the batch written next would go over them.
 * After a failed save here it reads nothing, since memory is then the only place the batch is.
 */
function adoptUnheard(): void {
  if (!snapshot().unsaved) adoptSaved();
}

/** The publish landed: the changes it sent leave the batch, and the Printings panel reads the branch again. */
function landed({sent, commitUrl}: {sent: readonly VersionChange[]; commitUrl: string}): void {
  adoptUnheard();
  put({batch: afterPublish(snapshot().batch, sent), publishing: false, result: {commitUrl, count: sent.length}});
  forgetBranchFiles();
}

/** The publish found clashes: each marks its change, and the panel reads the branch again to show what it has now. */
function clashed({clashes}: VersionClashError): void {
  adoptUnheard();
  put({batch: withClashes(snapshot().batch, clashes), publishing: false, error: clashMessage(clashes.length)});
  forgetBranchFiles();
}

/** The publish failed for another reason (the branch moved, the token was rejected): the batch stays as it is. */
function failed(error: unknown): void {
  put({publishing: false, error: error instanceof Error ? error.message : 'Publish failed'});
}

/** The publish didn't land: it found clashes, or failed for another reason. */
function refused(error: unknown): void {
  if (error instanceof VersionClashError) clashed(error);
  else failed(error);
}

/** Whether a publish may start: none is under way, something is staged, and no clash is open. */
function canPublish({batch, publishing}: BranchState): boolean {
  return !publishing && batch.changes.length > 0 && !hasClash(batch);
}

/**
 * Writes the batch in one commit, unless a publish is under way, nothing is staged or a clash is
 * open. It sends the changes staged when it starts, and while it runs what the last publish said
 * (`result`, `error`) is gone. Each way it ends sets `publishing` back itself, with no `finally`.
 */
function publish(token: string): Promise<void> {
  const state = snapshot();
  if (!canPublish(state)) return Promise.resolve();
  const sent = state.batch.changes;
  put({publishing: true, result: null, error: null});
  return publishVersions({token, changes: sent}).then(({commitUrl}) => landed({sent, commitUrl}), refused);
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
