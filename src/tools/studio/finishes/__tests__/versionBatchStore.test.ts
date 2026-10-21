import {afterEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook} from '@testing-library/react';
import {changeFor} from '../versionBatch';
import {VERSION_BATCH_KEY_PREFIX, resetVersionBatch, useVersionBatch} from '../versionBatchStore';
import {YEN_SID_ROWS} from './finishFixtures';

const MASTER_KEY = `${VERSION_BATCH_KEY_PREFIX}master`;
const REHEARSAL_KEY = `${VERSION_BATCH_KEY_PREFIX}rehearse-68`;

/** Yen Sid's #59 (no field, so Both) and his alt foil #223 (`["foil"]`). */
const [CARD_59, , ALT_FOIL_223] = YEN_SID_ROWS;
const ALT_FOIL_TO_BOTH = changeFor({row: ALT_FOIL_223, choice: 'both'});
const CARD_TO_FOIL = changeFor({row: CARD_59, choice: 'foil'});

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
