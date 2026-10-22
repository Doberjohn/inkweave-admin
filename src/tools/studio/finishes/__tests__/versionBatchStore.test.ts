import {afterEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook} from '@testing-library/react';
import {isRejectedToken} from '../../../../github/rejectedToken';
import {useBranchFilesGeneration} from '../branchFiles';
import {setChunkPath} from '../finishFiles';
import {versionCommitMessage} from '../publishVersions';
import {afterPublish, changeFor, clashCount, hasClash} from '../versionBatch';
import {VERSION_BATCH_KEY_PREFIX, resetVersionBatch, useVersionBatch, type VersionBatchView} from '../versionBatchStore';
import {deferredResponse} from './branchHarness';
import {SET_4_ENTRIES, SET_4_TEXT, YEN_SID_ROWS, collectionText, withFinishes} from './finishFixtures';
import {COMMIT_URL, moved, notAFastForward, stubRepo, type RepoAnswers} from './repoHarness';

const MASTER_KEY = `${VERSION_BATCH_KEY_PREFIX}master`;
const REHEARSAL_KEY = `${VERSION_BATCH_KEY_PREFIX}rehearse-68`;

/** Yen Sid's #59 (no field, so Both), his Enchanted #209 (no field, so Foil) and his alt foil #223 (`["foil"]`). */
const [CARD_59, ENCHANTED_209, ALT_FOIL_223] = YEN_SID_ROWS;
const ALT_FOIL_TO_BOTH = changeFor({row: ALT_FOIL_223, choice: 'both'});
const CARD_TO_FOIL = changeFor({row: CARD_59, choice: 'foil'});
const ENCHANTED_TO_BOTH = changeFor({row: ENCHANTED_209, choice: 'both'});

// jsdom's storage lasts as long as the test file, and src/test/setup.ts clears only the master
// batch's key before each test, so a test that saves under another branch's key cleans up here.
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  localStorage.clear();
});

/** What a branch's key holds, parsed, or null where it holds nothing. */
function saved(key = MASTER_KEY): unknown {
  const text = localStorage.getItem(key);
  return text === null ? null : JSON.parse(text);
}

/** Puts `stored` in storage as an earlier visit left it, then reloads the store, which reads it back. */
function reloadWith(stored: unknown): void {
  localStorage.setItem(MASTER_KEY, JSON.stringify(stored));
  act(() => resetVersionBatch({keepStorage: true}));
}

/** A storage method that throws, as one does for blocked site data. */
function refuse(): never {
  throw new DOMException('Storage refused', 'SecurityError');
}

/** Fires the event the browser fires here when another tab changes the key, or, with no key, clears storage. */
function storageEvent(key: string | null): void {
  act(() => {
    window.dispatchEvent(new StorageEvent('storage', {key}));
  });
}

/**
 * Plays another tab saving `changes` for master. The browser fires the event in the other tabs
 * only, so the test writes storage and then fires it here.
 */
function otherTabSaves(changes: readonly unknown[]): void {
  localStorage.setItem(MASTER_KEY, JSON.stringify({v: 1, changes}));
  storageEvent(MASTER_KEY);
}

/** How many times a spy on addEventListener or removeEventListener was asked about the storage event. */
function storageCalls(spy: {mock: {calls: readonly unknown[][]}}): number {
  return spy.mock.calls.filter(([type]) => type === 'storage').length;
}

describe('useVersionBatch', () => {
  it('starts empty, with no publish under way', () => {
    const {result} = renderHook(() => useVersionBatch());
    expect(result.current.changes).toEqual([]);
    expect(result.current.publishing).toBe(false);
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('stages a change and saves the batch', () => {
    const {result} = renderHook(() => useVersionBatch());
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    expect(result.current.changes).toEqual([ALT_FOIL_TO_BOTH]);
    expect(saved()).toEqual({v: 1, changes: [ALT_FOIL_TO_BOTH]});
  });

  it('replaces a change by id, reverts one and discards the rest, saving each state', () => {
    const {result} = renderHook(() => useVersionBatch());
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    act(() => result.current.stage(CARD_TO_FOIL));
    const normal = changeFor({row: ALT_FOIL_223, choice: 'normal'});
    act(() => result.current.stage(normal));
    expect(result.current.changes).toEqual([normal, CARD_TO_FOIL]);
    expect(saved()).toEqual({v: 1, changes: [normal, CARD_TO_FOIL]});

    act(() => result.current.revert('946'));
    expect(result.current.changes).toEqual([CARD_TO_FOIL]);
    expect(saved()).toEqual({v: 1, changes: [CARD_TO_FOIL]});

    act(() => result.current.discard());
    expect(result.current.changes).toEqual([]);
    expect(saved()).toEqual({v: 1, changes: []});
  });

  it('leaves the batch when a change is staged back to the value it started from', () => {
    const {result} = renderHook(() => useVersionBatch());
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    act(() => result.current.stage(changeFor({row: ALT_FOIL_223, choice: 'foil'})));
    expect(result.current.changes).toEqual([]);
    expect(saved()).toEqual({v: 1, changes: []});
  });

  it('shows the batch to every component that reads it', () => {
    const page = renderHook(() => useVersionBatch());
    const tray = renderHook(() => useVersionBatch());
    act(() => page.result.current.stage(ALT_FOIL_TO_BOTH));
    expect(tray.result.current.changes).toEqual([ALT_FOIL_TO_BOTH]);
    act(() => tray.result.current.discard());
    expect(page.result.current.changes).toEqual([]);
  });

  it('hands every render the same functions', () => {
    const {result, rerender} = renderHook(() => useVersionBatch());
    const {stage, revert, discard, keep, publish} = result.current;
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    rerender();
    expect(result.current.stage).toBe(stage);
    expect(result.current.revert).toBe(revert);
    expect(result.current.discard).toBe(discard);
    expect(result.current.keep).toBe(keep);
    expect(result.current.publish).toBe(publish);
  });

  it('resolves a publish when nothing is staged', async () => {
    const {result} = renderHook(() => useVersionBatch());
    await expect(result.current.publish('token')).resolves.toBeUndefined();
    expect(result.current.changes).toEqual([]);
    expect(result.current.publishing).toBe(false);
  });
});

describe('the saved batch', () => {
  it('keeps the batch across a reload of the store', () => {
    const {result} = renderHook(() => useVersionBatch());
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    act(() => resetVersionBatch({keepStorage: true}));
    expect(result.current.changes).toEqual([ALT_FOIL_TO_BOTH]);

    // A page opened after the reload reads the same.
    const reopened = renderHook(() => useVersionBatch());
    expect(reopened.result.current.changes).toEqual([ALT_FOIL_TO_BOTH]);
  });

  it('reads what storage holds when memory is dropped', () => {
    const {result} = renderHook(() => useVersionBatch());
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    localStorage.setItem(MASTER_KEY, JSON.stringify({v: 1, changes: [CARD_TO_FOIL]}));
    act(() => resetVersionBatch({keepStorage: true}));
    expect(result.current.changes).toEqual([CARD_TO_FOIL]);
  });

  it('clears the batch and this branch’s saved copy when reset, and no other branch’s', () => {
    localStorage.setItem(REHEARSAL_KEY, JSON.stringify({v: 1, changes: [CARD_TO_FOIL]}));
    const {result} = renderHook(() => useVersionBatch());
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    act(() => resetVersionBatch());
    expect(result.current.changes).toEqual([]);
    expect(localStorage.getItem(MASTER_KEY)).toBeNull();
    expect(saved(REHEARSAL_KEY)).toEqual({v: 1, changes: [CARD_TO_FOIL]});
  });

  it('keys the batch by target branch', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'rehearse-68');
    const rehearsal = renderHook(() => useVersionBatch());
    act(() => rehearsal.result.current.stage(ALT_FOIL_TO_BOTH));
    expect(saved(REHEARSAL_KEY)).toEqual({v: 1, changes: [ALT_FOIL_TO_BOTH]});
    expect(localStorage.getItem(MASTER_KEY)).toBeNull();
    rehearsal.unmount();

    vi.unstubAllEnvs();
    const master = renderHook(() => useVersionBatch());
    expect(master.result.current.changes).toEqual([]);
    act(() => master.result.current.stage(CARD_TO_FOIL));
    expect(saved()).toEqual({v: 1, changes: [CARD_TO_FOIL]});
    master.unmount();

    // The rehearsal's batch stays for the rehearsal, and master's change never joined it.
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'rehearse-68');
    const again = renderHook(() => useVersionBatch());
    expect(again.result.current.changes).toEqual([ALT_FOIL_TO_BOTH]);
  });

  it('keeps only the stored changes whose versions are a finishes value', () => {
    const badVersions = [['both'], ['foil', 'normal'], ['normal', 'foil', 'foil'], ['standard'], [], 'foil', null, 7];
    reloadWith({
      v: 1,
      changes: [
        ...badVersions.map((to, i) => ({...ALT_FOIL_TO_BOTH, id: `bad-${i}`, to})),
        {...ALT_FOIL_TO_BOTH, id: 'no-versions', to: undefined},
        null,
        'foil',
        7,
        [],
        CARD_TO_FOIL,
        ALT_FOIL_TO_BOTH,
      ],
    });
    const {result} = renderHook(() => useVersionBatch());
    expect(result.current.changes).toEqual([CARD_TO_FOIL, ALT_FOIL_TO_BOTH]);
    // They are dropped quietly: the owner is told of nothing.
    expect(result.current.error).toBeNull();
  });

  it('drops a stored entry that lacks a field the tray or a publish reads, and keeps the rest', () => {
    // JSON leaves out a key that is undefined, so these are entries saved without a shownFrom and without a ref.
    const noShownFrom = {...CARD_TO_FOIL, shownFrom: undefined};
    const noRef = {...ENCHANTED_TO_BOTH, ref: undefined};
    const clashWithoutShownNow = {...ALT_FOIL_TO_BOTH, id: 'half-a-clash', clash: {id: 'half-a-clash', now: null}};
    reloadWith({v: 1, changes: [noShownFrom, noRef, clashWithoutShownNow, ALT_FOIL_TO_BOTH]});
    const {result} = renderHook(() => useVersionBatch());
    expect(result.current.changes).toEqual([ALT_FOIL_TO_BOTH]);
    // They are dropped quietly: the owner is told of nothing.
    expect(result.current.error).toBeNull();
  });

  it('keeps the first of two stored entries for a printing', () => {
    reloadWith({v: 1, changes: [ALT_FOIL_TO_BOTH, CARD_TO_FOIL, {...ALT_FOIL_TO_BOTH, to: ['normal']}]});
    const {result} = renderHook(() => useVersionBatch());
    expect(result.current.changes).toEqual([ALT_FOIL_TO_BOTH, CARD_TO_FOIL]);
  });

  it.each([
    ['text that is not JSON', 'not json'],
    ['null', 'null'],
    ['a bare list', JSON.stringify([ALT_FOIL_TO_BOTH])],
    ['a batch of another version', JSON.stringify({v: 2, changes: [ALT_FOIL_TO_BOTH]})],
    ['a batch with no version', JSON.stringify({changes: [ALT_FOIL_TO_BOTH]})],
    ['changes that are no list', JSON.stringify({v: 1, changes: ALT_FOIL_TO_BOTH})],
  ])('starts empty from %s', (_what, text) => {
    localStorage.setItem(MASTER_KEY, text);
    act(() => resetVersionBatch({keepStorage: true}));
    const {result} = renderHook(() => useVersionBatch());
    expect(result.current.changes).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('keeps a clash across a reload, and keeping the change builds it on the branch’s new value', () => {
    const clashed = {...ALT_FOIL_TO_BOTH, clash: {id: '946', now: ['normal'], shownNow: ['normal']}};
    reloadWith({v: 1, changes: [clashed]});
    const {result} = renderHook(() => useVersionBatch());
    expect(result.current.changes).toEqual([clashed]);

    act(() => result.current.keep('946'));
    const kept = {...ALT_FOIL_TO_BOTH, from: ['normal'], shownFrom: ['normal']};
    expect(result.current.changes).toEqual([kept]);
    expect(saved()).toEqual({v: 1, changes: [kept]});
  });

  it('lets a clashed change be dropped, and saves the batch without it', () => {
    const clashed = {...ALT_FOIL_TO_BOTH, clash: {id: '946', now: null, shownNow: [], gone: true}};
    reloadWith({v: 1, changes: [CARD_TO_FOIL, clashed]});
    const {result} = renderHook(() => useVersionBatch());
    act(() => result.current.revert('946'));
    expect(result.current.changes).toEqual([CARD_TO_FOIL]);
    expect(saved()).toEqual({v: 1, changes: [CARD_TO_FOIL]});
  });
});

describe('storage that fails', () => {
  it('keeps changes in memory when localStorage throws', () => {
    vi.stubGlobal('localStorage', {getItem: refuse, setItem: refuse, removeItem: refuse});
    const page = renderHook(() => useVersionBatch());
    const tray = renderHook(() => useVersionBatch());
    expect(page.result.current.changes).toEqual([]);

    act(() => page.result.current.stage(ALT_FOIL_TO_BOTH));
    expect(page.result.current.changes).toHaveLength(1);
    expect(tray.result.current.changes).toEqual([ALT_FOIL_TO_BOTH]);

    act(() => tray.result.current.revert('946'));
    expect(page.result.current.changes).toEqual([]);
  });

  it('keeps a change that storage refused to save, and saves the whole batch with the next save that works', () => {
    const save = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(refuse);
    const {result} = renderHook(() => useVersionBatch());
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    expect(result.current.changes).toEqual([ALT_FOIL_TO_BOTH]);
    expect(localStorage.getItem(MASTER_KEY)).toBeNull();

    save.mockRestore();
    act(() => result.current.stage(CARD_TO_FOIL));
    expect(saved()).toEqual({v: 1, changes: [ALT_FOIL_TO_BOTH, CARD_TO_FOIL]});
  });

  it('resets without throwing when storage does', () => {
    const {result} = renderHook(() => useVersionBatch());
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    vi.stubGlobal('localStorage', {getItem: refuse, setItem: refuse, removeItem: refuse});
    expect(() => act(() => resetVersionBatch())).not.toThrow();
    expect(result.current.changes).toEqual([]);
  });
});

describe('another tab', () => {
  it('keeps what another tab staged when this tab stages after it', () => {
    // Both tabs hold #59's change. The other tab stages #223's, then this tab stages the Enchanted's.
    const {result} = renderHook(() => useVersionBatch());
    act(() => result.current.stage(CARD_TO_FOIL));
    otherTabSaves([CARD_TO_FOIL, ALT_FOIL_TO_BOTH]);
    expect(result.current.changes).toEqual([CARD_TO_FOIL, ALT_FOIL_TO_BOTH]);

    act(() => result.current.stage(ENCHANTED_TO_BOTH));
    expect(result.current.changes).toEqual([CARD_TO_FOIL, ALT_FOIL_TO_BOTH, ENCHANTED_TO_BOTH]);
    expect(saved()).toEqual({v: 1, changes: [CARD_TO_FOIL, ALT_FOIL_TO_BOTH, ENCHANTED_TO_BOTH]});
  });

  it('follows another tab that adds, replaces and drops changes', () => {
    const {result} = renderHook(() => useVersionBatch());
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    otherTabSaves([ALT_FOIL_TO_BOTH, CARD_TO_FOIL]);
    expect(result.current.changes).toEqual([ALT_FOIL_TO_BOTH, CARD_TO_FOIL]);

    const normal = changeFor({row: ALT_FOIL_223, choice: 'normal'});
    otherTabSaves([normal, CARD_TO_FOIL]);
    expect(result.current.changes).toEqual([normal, CARD_TO_FOIL]);

    otherTabSaves([]);
    expect(result.current.changes).toEqual([]);
  });

  it('reads storage again when another tab clears all of it, which arrives with no key', () => {
    const {result} = renderHook(() => useVersionBatch());
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    localStorage.clear();
    storageEvent(null);
    expect(result.current.changes).toEqual([]);

    localStorage.setItem(MASTER_KEY, JSON.stringify({v: 1, changes: [CARD_TO_FOIL]}));
    storageEvent(null);
    expect(result.current.changes).toEqual([CARD_TO_FOIL]);
  });

  it('leaves out a malformed entry another tab saved, as it does one it reads on a reload', () => {
    const {result} = renderHook(() => useVersionBatch());
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    otherTabSaves([{...CARD_TO_FOIL, shownFrom: undefined}, ALT_FOIL_TO_BOTH, ENCHANTED_TO_BOTH]);
    expect(result.current.changes).toEqual([ALT_FOIL_TO_BOTH, ENCHANTED_TO_BOTH]);
  });

  it('ignores a save of another branch, and of any other key', () => {
    const {result} = renderHook(() => useVersionBatch());
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    // Master's saved batch changes under it, so a read of it would show.
    localStorage.setItem(MASTER_KEY, JSON.stringify({v: 1, changes: [CARD_TO_FOIL]}));
    storageEvent(REHEARSAL_KEY);
    storageEvent('inkweave-admin.last-card');
    storageEvent('inkweave.reveal-admin.gh-token');
    expect(result.current.changes).toEqual([ALT_FOIL_TO_BOTH]);

    storageEvent(MASTER_KEY);
    expect(result.current.changes).toEqual([CARD_TO_FOIL]);
  });

  it('keeps the changes it holds as the same objects, so a publish in flight still finds them', () => {
    const {result} = renderHook(() => useVersionBatch());
    act(() => result.current.stage(CARD_TO_FOIL));
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    // What a publish starts with: it takes the changes out by identity once it lands.
    const sent = result.current.changes;

    otherTabSaves([CARD_TO_FOIL, ALT_FOIL_TO_BOTH, ENCHANTED_TO_BOTH]);
    expect(result.current.changes).toHaveLength(3);
    expect(result.current.changes[0]).toBe(sent[0]);
    expect(result.current.changes[1]).toBe(sent[1]);
    expect(afterPublish({changes: result.current.changes}, sent).changes).toEqual([ENCHANTED_TO_BOTH]);
  });

  it('takes another tab’s version of a change it holds, and keeps the others as they are', () => {
    const {result} = renderHook(() => useVersionBatch());
    act(() => result.current.stage(CARD_TO_FOIL));
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    const [kept] = result.current.changes;

    const normal = changeFor({row: ALT_FOIL_223, choice: 'normal'});
    otherTabSaves([CARD_TO_FOIL, normal]);
    expect(result.current.changes[0]).toBe(kept);
    expect(result.current.changes[1]).toEqual(normal);
  });

  it('leaves the batch, and every reader, as they were when nothing differs', () => {
    let renders = 0;
    const {result} = renderHook(() => {
      renders += 1;
      return useVersionBatch();
    });
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    const before = result.current.changes;
    const rendered = renders;

    otherTabSaves([ALT_FOIL_TO_BOTH]);
    expect(result.current.changes).toBe(before);
    expect(renders).toBe(rendered);
  });

  it('does not save what it read back, which could write over a newer save', () => {
    const {result} = renderHook(() => useVersionBatch());
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    localStorage.setItem(MASTER_KEY, JSON.stringify({v: 1, changes: [CARD_TO_FOIL]}));
    const save = vi.spyOn(Storage.prototype, 'setItem');

    storageEvent(MASTER_KEY);
    expect(result.current.changes).toEqual([CARD_TO_FOIL]);
    expect(save).not.toHaveBeenCalled();
  });

  it('listens once, from the first component that reads the batch to the last that stops', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    expect(storageCalls(add)).toBe(0);

    const first = renderHook(() => useVersionBatch());
    const second = renderHook(() => useVersionBatch());
    expect(storageCalls(add)).toBe(1);

    first.unmount();
    expect(storageCalls(remove)).toBe(0);
    second.unmount();
    expect(storageCalls(remove)).toBe(1);
    expect(storageCalls(add)).toBe(1);
  });

  it('reads nothing when another tab saves and no component is reading', () => {
    renderHook(() => useVersionBatch()).unmount();
    const read = vi.spyOn(Storage.prototype, 'getItem');
    window.dispatchEvent(new StorageEvent('storage', {key: MASTER_KEY}));
    expect(read).not.toHaveBeenCalled();
  });

  it('reads what another tab saved while no component was reading', () => {
    const first = renderHook(() => useVersionBatch());
    act(() => first.result.current.stage(ALT_FOIL_TO_BOTH));
    first.unmount();
    // No component listened, so no event reached the store.
    localStorage.setItem(MASTER_KEY, JSON.stringify({v: 1, changes: [ALT_FOIL_TO_BOTH, CARD_TO_FOIL]}));

    const again = renderHook(() => useVersionBatch());
    expect(again.result.current.changes).toEqual([ALT_FOIL_TO_BOTH, CARD_TO_FOIL]);
  });

  it('keeps a change that storage refused to save when a component reads again', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(refuse);
    const first = renderHook(() => useVersionBatch());
    act(() => first.result.current.stage(ALT_FOIL_TO_BOTH));
    first.unmount();

    const again = renderHook(() => useVersionBatch());
    expect(again.result.current.changes).toEqual([ALT_FOIL_TO_BOTH]);
  });

  it('still holds a change that storage refused to save after an action that changes nothing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(refuse);
    const first = renderHook(() => useVersionBatch());
    act(() => first.result.current.stage(ALT_FOIL_TO_BOTH));
    act(() => first.result.current.keep('no-such-printing'));
    first.unmount();

    const again = renderHook(() => useVersionBatch());
    expect(again.result.current.changes).toEqual([ALT_FOIL_TO_BOTH]);
  });

  it('takes what another tab saves over a change that storage refused to save', () => {
    const save = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(refuse);
    const {result} = renderHook(() => useVersionBatch());
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    save.mockRestore();

    otherTabSaves([CARD_TO_FOIL]);
    expect(result.current.changes).toEqual([CARD_TO_FOIL]);
  });

  it('reads what another tab saves while no component is reading, once its save has replaced a change storage refused', () => {
    const save = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(refuse);
    const first = renderHook(() => useVersionBatch());
    act(() => first.result.current.stage(ALT_FOIL_TO_BOTH));
    save.mockRestore();
    otherTabSaves([CARD_TO_FOIL]);
    first.unmount();
    localStorage.setItem(MASTER_KEY, JSON.stringify({v: 1, changes: [CARD_TO_FOIL, ENCHANTED_TO_BOTH]}));

    const again = renderHook(() => useVersionBatch());
    expect(again.result.current.changes).toEqual([CARD_TO_FOIL, ENCHANTED_TO_BOTH]);
  });

  it('keeps the batch when storage can’t be read as another tab saves, or when a component reads again', () => {
    const first = renderHook(() => useVersionBatch());
    act(() => first.result.current.stage(ALT_FOIL_TO_BOTH));
    vi.stubGlobal('localStorage', {getItem: refuse, setItem: refuse, removeItem: refuse});
    storageEvent(MASTER_KEY);
    expect(first.result.current.changes).toEqual([ALT_FOIL_TO_BOTH]);

    first.unmount();
    const again = renderHook(() => useVersionBatch());
    expect(again.result.current.changes).toEqual([ALT_FOIL_TO_BOTH]);
  });
});

/*
 * Publishing. Yen Sid's three printings are all in Set 4's chunk, below Core, so that file is all a
 * publish of their changes reads and writes.
 */

const CHUNK_4 = setChunkPath('4');

/** Set 4's chunk at the commit a publish builds on, as its rows were read: nothing changed since. */
const SET_4_FILES = {[CHUNK_4]: SET_4_TEXT};

/** Set 4's chunk once someone made #223 Normal only, and the clash a publish of #223's change meets there. */
const SET_4_ALT_FOIL_NORMAL = {[CHUNK_4]: collectionText(withFinishes(SET_4_ENTRIES, {946: ['normal']}))};
const ALT_FOIL_CLASH = {id: '946', now: ['normal'], shownNow: ['normal']};

/** commitFiles' refusal when the branch moved under the publish. */
const RACE = 'master changed while publishing, so nothing was published. Publish again.';

/** What a test reads the batch through: renderHook's result. */
type View = {readonly current: VersionBatchView};

/** Starts a publish, as the tray's button does, and hands back the promise it returns. */
function startPublish(view: View): Promise<void> {
  let publishing = Promise.resolve();
  act(() => {
    publishing = view.current.publish('t');
  });
  return publishing;
}

/** Publishes the batch, and waits for the publish to end. */
async function publishNow(view: View): Promise<void> {
  await act(() => view.current.publish('t'));
}

/** Lets `settle` answer what a publish waits for, and waits for the publish to end. */
async function settled(publishing: Promise<void>, settle: () => void): Promise<void> {
  await act(async () => {
    settle();
    await publishing;
  });
}

/** A ref update that waits until the test lets it move the branch. */
function heldUpdate() {
  const late = deferredResponse();
  return {update: () => late.response, moveBranch: () => late.respond(moved())};
}

/** A page holding #223's change, and a publish of it under way, against a repo that answers so. */
function publishingAltFoil(answers: RepoAnswers) {
  const repo = stubRepo(answers);
  const page = renderHook(() => useVersionBatch());
  act(() => page.result.current.stage(ALT_FOIL_TO_BOTH));
  return {repo, page, view: page.result, publishing: startPublish(page.result)};
}

describe('publishing', () => {
  it('clears the published changes and keeps one staged during the publish', async () => {
    const held = heldUpdate();
    const {repo, view, publishing} = publishingAltFoil({files: SET_4_FILES, update: held.update});
    const generation = renderHook(() => useBranchFilesGeneration());
    expect(view.current.publishing).toBe(true);

    act(() => view.current.stage(CARD_TO_FOIL));
    await settled(publishing, held.moveBranch);
    expect(view.current.changes).toEqual([CARD_TO_FOIL]);
    expect(view.current.publishing).toBe(false);
    expect(view.current.result).toEqual({commitUrl: COMMIT_URL, count: 1});
    expect(view.current.error).toBeNull();
    expect(saved()).toEqual({v: 1, changes: [CARD_TO_FOIL]});
    // It sent what was staged when it started, with the owner's token, and the panel reads the branch again.
    expect(repo.commitMessage()).toBe(versionCommitMessage(1));
    expect(repo.reads().map(({token}) => token)).toEqual(['t']);
    expect(generation.result.current).toBe(1);
  });

  it('keeps a change staged again for a printing it sent, which is another change', async () => {
    const held = heldUpdate();
    const {view, publishing} = publishingAltFoil({files: SET_4_FILES, update: held.update});
    const normal = changeFor({row: ALT_FOIL_223, choice: 'normal'});
    act(() => view.current.stage(normal));

    await settled(publishing, held.moveBranch);
    expect(view.current.changes).toEqual([normal]);
    expect(view.current.result).toEqual({commitUrl: COMMIT_URL, count: 1});
  });

  it('marks clashes and keeps the batch when a printing changed', async () => {
    const repo = stubRepo({files: SET_4_ALT_FOIL_NORMAL});
    const {result} = renderHook(() => useVersionBatch());
    const generation = renderHook(() => useBranchFilesGeneration());
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    act(() => result.current.stage(CARD_TO_FOIL));
    await publishNow(result);

    const marked = [{...ALT_FOIL_TO_BOTH, clash: ALT_FOIL_CLASH}, CARD_TO_FOIL];
    expect(result.current.changes).toEqual(marked);
    // A clash is the marks on the batch, not an error: the tray words it from them, as many as are still marked.
    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
    expect(result.current.publishing).toBe(false);
    expect(saved()).toEqual({v: 1, changes: marked});
    expect(repo.writes()).toEqual([]);
    // The panel reads the branch again, so its rows show what the branch has now.
    expect(generation.result.current).toBe(1);
  });

  it('marks every clash at once', async () => {
    // Someone has made #223 Normal only and #59 Foil only since their changes were staged.
    stubRepo({files: {[CHUNK_4]: collectionText(withFinishes(SET_4_ENTRIES, {946: ['normal'], 750: ['foil']}))}});
    const {result} = renderHook(() => useVersionBatch());
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    act(() => result.current.stage(CARD_TO_FOIL));
    act(() => result.current.stage(ENCHANTED_TO_BOTH));
    await publishNow(result);

    expect(result.current.changes.map(({clash}) => clash?.id)).toEqual(['946', '750', undefined]);
    expect(clashCount(result.current)).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it('keeps the batch when the branch moved', async () => {
    stubRepo({files: SET_4_FILES, update: notAFastForward});
    const {result} = renderHook(() => useVersionBatch());
    const generation = renderHook(() => useBranchFilesGeneration());
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    const before = result.current.changes;
    await publishNow(result);

    expect(result.current.error).toBe(RACE);
    expect(result.current.changes).toBe(before);
    expect(result.current.publishing).toBe(false);
    expect(result.current.result).toBeNull();
    // Only a publish that landed, or that found a clash, has the panel read the branch again.
    expect(generation.result.current).toBe(0);
  });

  it('says why GitHub refused a publish in its own words, which tell a rejected token', async () => {
    const repo = stubRepo({files: SET_4_FILES});
    repo.fetch.mockImplementationOnce(async () => new Response('Bad credentials', {status: 401}));
    const {result} = renderHook(() => useVersionBatch());
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    await publishNow(result);

    expect(result.current.error).toBe('GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: Bad credentials');
    expect(isRejectedToken(result.current.error ?? '')).toBe(true);
    expect(result.current.changes).toEqual([ALT_FOIL_TO_BOTH]);
    expect(result.current.publishing).toBe(false);
  });

  it('words a failure that is no Error as a failed publish', async () => {
    const repo = stubRepo({files: SET_4_FILES});
    repo.fetch.mockImplementationOnce(() => Promise.reject('offline'));
    const {result} = renderHook(() => useVersionBatch());
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    await publishNow(result);
    expect(result.current.error).toBe('Publish failed');
  });

  it('does nothing while a publish is under way', async () => {
    const held = heldUpdate();
    const {repo, view, publishing} = publishingAltFoil({files: SET_4_FILES, update: held.update});
    await publishNow(view);
    expect(view.current.publishing).toBe(true);

    await settled(publishing, held.moveBranch);
    expect(repo.writes()).toEqual(['POST git/blobs', 'POST git/trees', 'POST git/commits', 'PATCH git/refs/heads/master']);
    expect(view.current.result).toEqual({commitUrl: COMMIT_URL, count: 1});
  });

  it('does nothing with nothing staged, nor while a clash is open', async () => {
    const repo = stubRepo({files: SET_4_FILES});
    const {result} = renderHook(() => useVersionBatch());
    await publishNow(result);
    reloadWith({v: 1, changes: [{...ALT_FOIL_TO_BOTH, clash: ALT_FOIL_CLASH}, CARD_TO_FOIL]});
    await publishNow(result);

    expect(repo.fetch).not.toHaveBeenCalled();
    expect(result.current.publishing).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('starts over: under way at once, with why the last publish failed gone', async () => {
    stubRepo({files: SET_4_FILES, update: notAFastForward});
    const {result} = renderHook(() => useVersionBatch());
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    await publishNow(result);
    expect(result.current.error).toBe(RACE);

    const held = heldUpdate();
    stubRepo({files: SET_4_FILES, update: held.update});
    const publishing = startPublish(result);
    expect(result.current.publishing).toBe(true);
    expect(result.current.error).toBeNull();

    await settled(publishing, held.moveBranch);
    expect(result.current.changes).toEqual([]);
    expect(result.current.result).toEqual({commitUrl: COMMIT_URL, count: 1});
  });

  it('forgets the publish that landed once the next one starts', async () => {
    const first = heldUpdate();
    const {view, publishing} = publishingAltFoil({files: SET_4_FILES, update: first.update});
    act(() => view.current.stage(CARD_TO_FOIL));
    await settled(publishing, first.moveBranch);
    expect(view.current.result).not.toBeNull();

    const second = heldUpdate();
    stubRepo({files: SET_4_FILES, update: second.update});
    const again = startPublish(view);
    expect(view.current.result).toBeNull();

    await settled(again, second.moveBranch);
    expect(view.current.changes).toEqual([]);
    expect(view.current.result).toEqual({commitUrl: COMMIT_URL, count: 1});
  });
});

describe('what the last publish said', () => {
  /** A page after a publish of #223 landed, with #59's change staged while it ran: `result` says so. */
  async function afterLanding(): Promise<View> {
    const held = heldUpdate();
    const {view, publishing} = publishingAltFoil({files: SET_4_FILES, update: held.update});
    act(() => view.current.stage(CARD_TO_FOIL));
    await settled(publishing, held.moveBranch);
    return view;
  }

  /** A page after a publish of #223 and #59 that the branch refused, as one that moved: `error` says why. */
  async function afterRace(): Promise<View> {
    stubRepo({files: SET_4_FILES, update: notAFastForward});
    const {result} = renderHook(() => useVersionBatch());
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    act(() => result.current.stage(CARD_TO_FOIL));
    await publishNow(result);
    return result;
  }

  const EDITS: [string, (view: VersionBatchView) => void][] = [
    ['stages a change', (view) => view.stage(ENCHANTED_TO_BOTH)],
    ['reverts one', (view) => view.revert(CARD_TO_FOIL.id)],
    ['discards them all', (view) => view.discard()],
  ];

  it.each(EDITS)('forgets the publish that landed once the owner %s', async (_what, edit) => {
    const view = await afterLanding();
    expect(view.current.result).toEqual({commitUrl: COMMIT_URL, count: 1});
    act(() => edit(view.current));
    expect(view.current.result).toBeNull();
  });

  it.each(EDITS)('forgets why the last publish failed once the owner %s', async (_what, edit) => {
    const view = await afterRace();
    expect(view.current.error).toBe(RACE);
    act(() => edit(view.current));
    expect(view.current.error).toBeNull();
  });

  it('keeps the publish that landed when the owner keeps a change', async () => {
    const view = await afterLanding();
    act(() => view.current.keep(CARD_TO_FOIL.id));
    expect(view.current.result).toEqual({commitUrl: COMMIT_URL, count: 1});
  });

  it('clears the mark and says nothing else when the owner keeps the clashed change', async () => {
    stubRepo({files: SET_4_ALT_FOIL_NORMAL});
    const {result} = renderHook(() => useVersionBatch());
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    await publishNow(result);
    expect(hasClash(result.current)).toBe(true);

    act(() => result.current.keep('946'));
    expect(result.current.changes).toEqual([{...ALT_FOIL_TO_BOTH, from: ['normal'], shownFrom: ['normal']}]);
    expect(hasClash(result.current)).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('leaves why the last publish failed alone when the owner keeps a clashed change', async () => {
    // This tab's publish lost a race. Another tab found a clash and saved the marked batch, which this tab takes in.
    stubRepo({files: SET_4_FILES, update: notAFastForward});
    const {result} = renderHook(() => useVersionBatch());
    act(() => result.current.stage(ALT_FOIL_TO_BOTH));
    await publishNow(result);
    expect(result.current.error).toBe(RACE);
    otherTabSaves([{...ALT_FOIL_TO_BOTH, clash: ALT_FOIL_CLASH}]);

    act(() => result.current.keep('946'));
    expect(result.current.error).toBe(RACE);
  });
});

/*
 * A publish's outcome belongs to the token that made it: a token saved after Forget token must not
 * be shown "GitHub rejected the saved token" about the one it replaced. A reader that names no token
 * (the Printings panel) is shown the outcome as it is.
 */
describe('the outcome of a publish and the token that made it', () => {
  const REJECTED = 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: Bad credentials';

  /** Three readers of the batch: one holding token 'a', one holding 'b', and one that names no token. */
  function readers() {
    return {
      a: renderHook(() => useVersionBatch('a')),
      b: renderHook(() => useVersionBatch('b')),
      anyone: renderHook(() => useVersionBatch()),
    };
  }

  /** Stages #223's change and publishes it with `token`, against a repo that answers `refuse` once if it is given. */
  async function publishWith(token: string, view: View, refuse?: () => Response) {
    const repo = stubRepo({files: SET_4_FILES});
    if (refuse) repo.fetch.mockImplementationOnce(async () => refuse());
    act(() => view.current.stage(ALT_FOIL_TO_BOTH));
    await act(() => view.current.publish(token));
  }

  const rejectToken = () => new Response('Bad credentials', {status: 401});

  it('shows a failure to the token that made the publish and to a reader that names none, but not to another token', async () => {
    const {a, b, anyone} = readers();
    await publishWith('a', a.result, rejectToken);

    expect(a.result.current.error).toBe(REJECTED);
    expect(anyone.result.current.error).toBe(REJECTED);
    expect(b.result.current.error).toBeNull();
    // The batch is the studio's whatever the token: the other reader sees the change that did not publish.
    expect(b.result.current.changes).toEqual([ALT_FOIL_TO_BOTH]);
  });

  it('shows a publish that landed to its token alone, too', async () => {
    const {a, b, anyone} = readers();
    await publishWith('a', a.result);

    expect(a.result.current.result).toEqual({commitUrl: COMMIT_URL, count: 1});
    expect(anyone.result.current.result).toEqual({commitUrl: COMMIT_URL, count: 1});
    expect(b.result.current.result).toBeNull();
  });

  it('hands the outcome to the token of the newer publish, and takes it from the older', async () => {
    const {a, b} = readers();
    await publishWith('a', a.result, rejectToken);
    expect(a.result.current.error).toBe(REJECTED);

    stubRepo({files: SET_4_FILES});
    await act(() => b.result.current.publish('b'));
    expect(b.result.current.result).toEqual({commitUrl: COMMIT_URL, count: 1});
    expect(a.result.current.result).toBeNull();
    expect(a.result.current.error).toBeNull();
  });

  it('still shows the outcome to its token when a reader of that token mounts again', async () => {
    const {a} = readers();
    await publishWith('a', a.result, rejectToken);
    a.unmount();

    expect(renderHook(() => useVersionBatch('a')).result.current.error).toBe(REJECTED);
  });

  it('does not hide a publish under way from another token', async () => {
    const held = heldUpdate();
    stubRepo({files: SET_4_FILES, update: held.update});
    const {a, b} = readers();
    act(() => a.result.current.stage(ALT_FOIL_TO_BOTH));
    let publishing = Promise.resolve();
    act(() => {
      publishing = a.result.current.publish('a');
    });
    expect(b.result.current.publishing).toBe(true);

    await settled(publishing, held.moveBranch);
    expect(b.result.current.publishing).toBe(false);
    // It landed under 'a': the outcome is a's.
    expect(a.result.current.result).toEqual({commitUrl: COMMIT_URL, count: 1});
    expect(b.result.current.result).toBeNull();
  });
});

describe('a publish and other tabs', () => {
  it('stays under way through another tab’s save, and takes out only what it sent once it lands', async () => {
    const held = heldUpdate();
    const {view, publishing} = publishingAltFoil({files: SET_4_FILES, update: held.update});
    otherTabSaves([ALT_FOIL_TO_BOTH, CARD_TO_FOIL]);
    expect(view.current.publishing).toBe(true);
    expect(view.current.changes).toEqual([ALT_FOIL_TO_BOTH, CARD_TO_FOIL]);

    act(() => view.current.stage(ENCHANTED_TO_BOTH));
    await settled(publishing, held.moveBranch);
    expect(view.current.changes).toEqual([CARD_TO_FOIL, ENCHANTED_TO_BOTH]);
    expect(view.current.result).toEqual({commitUrl: COMMIT_URL, count: 1});
    expect(saved()).toEqual({v: 1, changes: [CARD_TO_FOIL, ENCHANTED_TO_BOTH]});
  });

  it('takes in what another tab saved while no component listened, before it saves what the publish left', async () => {
    const held = heldUpdate();
    const {page, publishing} = publishingAltFoil({files: SET_4_FILES, update: held.update});
    page.unmount();
    // Another tab stages #59's change. No component listens here, so no event reaches the store.
    localStorage.setItem(MASTER_KEY, JSON.stringify({v: 1, changes: [ALT_FOIL_TO_BOTH, CARD_TO_FOIL]}));

    await settled(publishing, held.moveBranch);
    expect(saved()).toEqual({v: 1, changes: [CARD_TO_FOIL]});
    expect(renderHook(() => useVersionBatch()).result.current.changes).toEqual([CARD_TO_FOIL]);
  });

  it('takes in what another tab saved while no component listened, before it marks a clash', async () => {
    const late = deferredResponse();
    const {page, publishing} = publishingAltFoil({files: {[CHUNK_4]: () => late.response}});
    page.unmount();
    localStorage.setItem(MASTER_KEY, JSON.stringify({v: 1, changes: [ALT_FOIL_TO_BOTH, CARD_TO_FOIL]}));

    await settled(publishing, () => late.respond(new Response(SET_4_ALT_FOIL_NORMAL[CHUNK_4])));
    expect(saved()).toEqual({v: 1, changes: [{...ALT_FOIL_TO_BOTH, clash: ALT_FOIL_CLASH}, CARD_TO_FOIL]});
  });

  it('keeps a change storage refused to save when the publish lands, rather than read storage back', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(refuse);
    const held = heldUpdate();
    const {view, publishing} = publishingAltFoil({files: SET_4_FILES, update: held.update});
    act(() => view.current.stage(ENCHANTED_TO_BOTH));

    await settled(publishing, held.moveBranch);
    expect(view.current.changes).toEqual([ENCHANTED_TO_BOTH]);
  });
});
