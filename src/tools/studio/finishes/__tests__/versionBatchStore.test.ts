import {afterEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook} from '@testing-library/react';
import {afterPublish, changeFor} from '../versionBatch';
import {VERSION_BATCH_KEY_PREFIX, resetVersionBatch, useVersionBatch} from '../versionBatchStore';
import {YEN_SID_ROWS} from './finishFixtures';

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
