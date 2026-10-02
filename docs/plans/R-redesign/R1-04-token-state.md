> Part of [R: Admin redesign](../R-redesign.md). Read its decisions, corrections to the spec, global constraints and shared interfaces first.

### Task R1-4: Shared GitHub token state

Every component that calls `useGithubToken()` today keeps its own copy of the token in `useState`. That breaks the sidebar token box ("Corrections to the spec → Token box (R1)"). A "Forget token" in the sidebar would clear `localStorage`, but the open page would keep its copy and go on committing with it. A token saved through a page's gate would not reach the sidebar until a remount. The `storage` event can't bridge the two, because it never fires in the tab that made the change.

This task turns the hook into a reader of one module-level store. It keeps the same key and the same exported API, and it reads the store through `useSyncExternalStore`. The store tells its subscribers when `setToken` or `clearToken` runs, and when another tab fires a `storage` event. It falls back to memory when `localStorage` throws.

Outside the memory fallback the store keeps no copy of the token: every snapshot reads `localStorage` again. So code that writes the key directly before mounting still sees its value, as `TuningPage.test.tsx` does in its `beforeEach`. Because a snapshot is a string or `null`, two reads of the same token are equal under `Object.is`. React therefore re-renders only when the token really changes, and `getSnapshot` doesn't loop.

**Files:**
- Modify: `src/github/useGithubToken.ts` (whole file, lines 1–41, rewritten. The exports `UseGithubToken` and `useGithubToken` keep the same shape.)
- Test (create): `src/github/useGithubToken.test.ts`. It sits next to the module, like `githubCommit.test.ts` and `goLiveNote.test.ts` in the same folder.
- Checked, no change needed:
  - `src/tools/reveal/useRevealAdmin.ts:93`, `src/tools/image/useImageAdmin.ts:59` and `src/tools/tuning/TuningPage.tsx:25` destructure `{token, setToken, clearToken}`.
  - `src/tools/reveal/index.ts:4` re-exports the hook.
  - `src/tools/reveal/__tests__/useRevealAdmin.test.ts:9-11` and `src/tools/image/__tests__/useImageAdmin.test.ts:9-11` use `vi.mock` factories that replace `useGithubToken`, which is still the module's only runtime export.
  - `src/tools/tuning/__tests__/TuningPage.test.tsx:14-19` writes the key straight into `localStorage` before rendering and clears it afterwards.
  - The `src/router.test.tsx` "asks for a GitHub token before %s" cases run with an empty storage.

**Interfaces:**
- Consumes: React `useSyncExternalStore`. Nothing from other R1 tasks.
- Produces: exactly the contract below.
  ```ts
  export interface UseGithubToken {token: string | null; setToken: (t: string) => void; clearToken: () => void}
  export function useGithubToken(): UseGithubToken;
  ```
  - Every mounted caller now sees the same token. A `setToken` or `clearToken` from any caller, or another tab's write to the key, re-renders all of them.
  - `setToken` and `clearToken` are module-level functions, so they keep the same identity on every render and in every component.
  - The Sidebar token box (R1) and the write pages consume this.

- [ ] **Step 1: Write the failing test**

Create `src/github/useGithubToken.test.ts`:

```ts
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
```

Notes:
- jsdom 30's `Storage-impl.js` sends storage events only to *other* windows of the origin, never to the writer. That's why the test fires the event itself.
- `Storage` and `StorageEvent` are among the jsdom globals Vitest installs, and stubbing `Storage.prototype.getItem` reaches `localStorage.getItem` in jsdom. Both were checked against `jsdom@30.1.1`.
- The event filter has a visible effect only while the store holds a token in memory. Outside that fallback every snapshot reads storage again, so an unfiltered event would still return the stored token. That's why the "different key" test runs with a refused save.

- [ ] **Step 2: Run the test and watch it fail**

Run: `pnpm vitest run src/github/useGithubToken.test.ts`

Expected: FAIL, `Tests  6 failed | 2 passed (8)`.
- These fail because each `useState` copy keeps its own value. The failures read like `expected null to be 'tok'`, `expected 'tok' to be null`, `expected 'mine' to be 'other-tab'` and `expected 'old' to be 'new'`:
  - "shows a token saved in one component to every mounted component"
  - "forgets the token in every component when any one clears it"
  - "follows a token saved or forgotten in another tab"
  - "takes another tab's token over one kept in memory" (`expected 'mine' to be 'other-tab'`)
  - "keeps the token in memory, still shared, when storage throws"
  - "keeps a token that storage refused to save, even while storage still reads"
- "reads a token saved under the historical key" and "keeps a token held in memory when another tab changes a different key" already pass. They guard the key and the event filter through the rewrite.

- [ ] **Step 3: Rewrite the hook over one shared store**

Replace the whole of `src/github/useGithubToken.ts`.

Before (current, lines 1–41):

```ts
import {useState} from 'react';

// Keep the historical key so a token saved from reveal-admin is reused by the
// image tool with no re-entry. Renaming it would silently drop saved tokens.
const KEY = 'inkweave.reveal-admin.gh-token';

export interface UseGithubToken {
  token: string | null;
  setToken: (t: string) => void;
  clearToken: () => void;
}

export function useGithubToken(): UseGithubToken {
  const [token, setTokenState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  });

  const setToken = (t: string) => {
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* storage unavailable — keep in memory only */
    }
    setTokenState(t);
  };

  const clearToken = () => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setTokenState(null);
  };

  return {token, setToken, clearToken};
}
```

After (full file):

```ts
import {useSyncExternalStore} from 'react';

// Keep the historical key so a token saved from reveal-admin is reused by the
// image tool with no re-entry. Renaming it would silently drop saved tokens.
const KEY = 'inkweave.reveal-admin.gh-token';

export interface UseGithubToken {
  token: string | null;
  setToken: (t: string) => void;
  clearToken: () => void;
}

// One store for the whole tab, so a token saved or forgotten anywhere (a page's
// gate, the sidebar's token box) reaches every mounted component at once.
// localStorage stays the source of truth. `memory` takes over only after a
// write to storage fails (blocked, full or throwing), until a later write
// succeeds or another tab writes the key.
const listeners = new Set<() => void>();
let memory: string | null = null;
let memoryOnly = false;

function notify(): void {
  for (const listener of listeners) listener();
}

/**
 * The store's snapshot. It is a string or null, so two reads of the same token
 * are equal under Object.is and React re-renders only when the token changes.
 */
function readToken(): string | null {
  if (memoryOnly) return memory;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return memory;
  }
}

function writeToken(t: string | null): void {
  memory = t;
  try {
    if (t === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
    memoryOnly = false;
  } catch {
    memoryOnly = true; // storage unavailable — keep in memory only
  }
  notify();
}

// Another tab saved or forgot the token (a null key means it cleared all of
// storage). Its write landed in storage, so storage is the truth again. The
// event never fires in the tab that wrote, which notify() already covers.
function onStorage(event: StorageEvent): void {
  if (event.key !== null && event.key !== KEY) return;
  memoryOnly = false;
  notify();
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', onStorage);
  };
}

// Module-level, so every caller gets the same two functions on every render.
function setToken(t: string): void {
  writeToken(t);
}

function clearToken(): void {
  writeToken(null);
}

export function useGithubToken(): UseGithubToken {
  const token = useSyncExternalStore(subscribe, readToken);
  return {token, setToken, clearToken};
}
```

Design notes:
- **Why `memoryOnly` exists.** A full quota throws on `setItem` but still answers `getItem`. Without the flag, a read after a failed save would return the *old* stored token.
- **When the flag clears.** It clears on the next write that reaches storage, or on another tab's write to the key. "takes another tab's token over one kept in memory" covers the second case.
- **No `getServerSnapshot`.** Admin has no server rendering.
- **Comment.** The old code's `/* storage unavailable — keep in memory only */` intent is kept.

- [ ] **Step 4: Run the test again**

Run: `pnpm vitest run src/github/useGithubToken.test.ts`

Expected: PASS, `Tests  8 passed (8)`.

- [ ] **Step 5: Confirm no consumer needs a change**

Run: `git grep -n useGithubToken -- src ':!src/github'`

Expected (line numbers as of `main` d19d2c5; R1-1 doesn't touch these files):

```
src/tools/image/__tests__/useImageAdmin.test.ts:9:vi.mock('../../../github/useGithubToken', () => ({
src/tools/image/__tests__/useImageAdmin.test.ts:10:  useGithubToken: () => ({token: 'tok', setToken: () => {}, clearToken: () => {}}),
src/tools/image/useImageAdmin.ts:5:import {useGithubToken} from '../../github/useGithubToken';
src/tools/image/useImageAdmin.ts:59:  const {token, setToken, clearToken} = useGithubToken();
src/tools/reveal/__tests__/useRevealAdmin.test.ts:9:vi.mock('../../../github/useGithubToken', () => ({
src/tools/reveal/__tests__/useRevealAdmin.test.ts:10:  useGithubToken: () => ({token: 'tok', setToken: () => {}, clearToken: () => {}}),
src/tools/reveal/index.ts:4:export {useGithubToken} from '../../github/useGithubToken';
src/tools/reveal/useRevealAdmin.ts:13:import {useGithubToken} from '../../github/useGithubToken';
src/tools/reveal/useRevealAdmin.ts:93:  const {token, setToken, clearToken} = useGithubToken();
src/tools/tuning/TuningPage.tsx:4:import {useGithubToken} from '../../github/useGithubToken';
src/tools/tuning/TuningPage.tsx:25:  const {token, setToken, clearToken} = useGithubToken();
```

Every caller destructures the same three fields, and both mocks replace the module's only runtime export. Nothing changes.

Then run the suites that touch the hook, whether directly or through a mock. The reveal, image and tuning code imports `inkweave-synergy-engine`, so the engine has to be built first. Skip the build if it already ran in this session.

```bash
pnpm build:engine
pnpm vitest run src/tools/tuning/__tests__/TuningPage.test.tsx src/tools/reveal/__tests__/useRevealAdmin.test.ts src/tools/image/__tests__/useImageAdmin.test.ts src/router.test.tsx
```

Expected: PASS, every test in all four files.
- `TuningPage.test.tsx` still finds its token. Outside the memory fallback, every snapshot reads storage again, so the key written in its `beforeEach` reaches the page.
- The router's "asks for a GitHub token before /reveal, /image, /tuning" cases still see `null`.

- [ ] **Step 6: Lint and typecheck**

Run: `pnpm exec eslint src/github`
Expected: no output, exit 0. Both files were checked against the repo's config through `eslint --stdin` while drafting.

Run: `pnpm typecheck`
Expected: exit 0.

- [ ] **Step 7: Commit**

Run with the Bash tool, only after the owner approves:

```bash
git add src/github/useGithubToken.ts src/github/useGithubToken.test.ts
USER_APPROVED=1 git commit -m "feat(github): share one GitHub token state across the admin (#24)"
```
