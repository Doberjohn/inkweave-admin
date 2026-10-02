import {afterEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook} from '@testing-library/react';
import {useGithubToken} from './useGithubToken';

const KEY = 'inkweave.reveal-admin.gh-token';

/** Two separate components reading the token, like a page's gate and the sidebar's token box. */
function renderTwo() {
  return [renderHook(() => useGithubToken()), renderHook(() => useGithubToken())] as const;
}

/** Stands in for a storage method that throws (blocked site data, a full quota). */
function refuse(name: string) {
  return () => {
    throw new DOMException(`Storage refused (${name})`, name);
  };
}

// The store is module state that every test in this file shares. Reset it
// through its own API: a write that reaches storage also ends any in-memory
// fallback a test left on.
afterEach(() => {
  vi.restoreAllMocks();
  const {result, unmount} = renderHook(() => useGithubToken());
  act(() => result.current.clearToken());
  unmount();
});

describe('useGithubToken', () => {
  it('reads a token saved under the historical key', () => {
    localStorage.setItem(KEY, 'saved');
    const {result} = renderHook(() => useGithubToken());
    expect(result.current.token).toBe('saved');
  });

  it('shows a token saved in one component to every mounted component', () => {
    const [gate, sidebar] = renderTwo();
    act(() => gate.result.current.setToken('tok'));
    expect(gate.result.current.token).toBe('tok');
    expect(sidebar.result.current.token).toBe('tok');
    expect(localStorage.getItem(KEY)).toBe('tok');
  });

  it('forgets the token in every component when any one clears it', () => {
    localStorage.setItem(KEY, 'tok');
    const [page, sidebar] = renderTwo();
    act(() => sidebar.result.current.clearToken());
    expect(page.result.current.token).toBeNull();
    expect(sidebar.result.current.token).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('follows a token saved or forgotten in another tab', () => {
    const [a, b] = renderTwo();
    // Browsers and jsdom fire storage events only in the other windows, so the
    // test plays the other tab: it writes storage, then fires the event here.
    act(() => {
      localStorage.setItem(KEY, 'other-tab');
      window.dispatchEvent(new StorageEvent('storage', {key: KEY, newValue: 'other-tab'}));
    });
    expect(a.result.current.token).toBe('other-tab');
    expect(b.result.current.token).toBe('other-tab');

    // localStorage.clear() in the other tab arrives with a null key.
    act(() => {
      localStorage.clear();
      window.dispatchEvent(new StorageEvent('storage', {key: null}));
    });
    expect(a.result.current.token).toBeNull();
    expect(b.result.current.token).toBeNull();
  });

  it("takes another tab's token over one kept in memory", () => {
    const save = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(refuse('QuotaExceededError'));
    const {result} = renderHook(() => useGithubToken());
    act(() => result.current.setToken('mine'));
    save.mockRestore();
    act(() => {
      localStorage.setItem(KEY, 'other-tab');
      window.dispatchEvent(new StorageEvent('storage', {key: KEY, newValue: 'other-tab'}));
    });
    expect(result.current.token).toBe('other-tab');
  });

  it('keeps a token held in memory when another tab changes a different key', () => {
    // A refused save leaves 'old' in storage, so a store that re-read storage on
    // this event would hand back the old token.
    localStorage.setItem(KEY, 'old');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(refuse('QuotaExceededError'));
    const {result} = renderHook(() => useGithubToken());
    act(() => result.current.setToken('new'));
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {key: 'some-other-key', newValue: 'x'}));
    });
    expect(result.current.token).toBe('new');
  });

  it('keeps the token in memory, still shared, when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(refuse('SecurityError'));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(refuse('SecurityError'));
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(refuse('SecurityError'));
    const [a, b] = renderTwo();
    expect(a.result.current.token).toBeNull();

    act(() => a.result.current.setToken('tok'));
    expect(a.result.current.token).toBe('tok');
    expect(b.result.current.token).toBe('tok');

    act(() => b.result.current.clearToken());
    expect(a.result.current.token).toBeNull();
    expect(b.result.current.token).toBeNull();
  });

  it('keeps a token that storage refused to save, even while storage still reads', () => {
    // A full quota throws on setItem but still answers getItem, which would
    // otherwise hand back the token saved before.
    localStorage.setItem(KEY, 'old');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(refuse('QuotaExceededError'));
    const [a, b] = renderTwo();
    act(() => a.result.current.setToken('new'));
    expect(a.result.current.token).toBe('new');
    expect(b.result.current.token).toBe('new');
  });
});
