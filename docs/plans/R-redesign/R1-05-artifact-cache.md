> Part of [R: Admin redesign](../R-redesign.md). Read its decisions, corrections to the spec, global constraints and shared interfaces first.

**Contract additions:**
- `src/tools/analytics/adminData.ts` gains `export function cachedAdminData<T>(file: string): T | undefined;`. It returns the parsed artifact once a fetch this session has succeeded, and `undefined` while that fetch is pending or after it failed. The three hooks use it to seed their first render.
- Next to the `adminData.ts` lines of the contract, add this usage rule: *`src/test/setup.ts` resets the artifact cache before every test; tests need no reset of their own.* Change the `resetAdminDataCache` line's comment to `// tests only: src/test/setup.ts calls it before every test`.
- Stories keep rendering props-driven views and never the hook-driven pages. Storybook's iframe keeps module state between stories, so the cache would carry data from one story into the next.

### Task R1-5: Per-session artifact cache

**Files:**
- Modify: `src/tools/analytics/adminData.ts` (whole file, lines 1-20)
- Modify: `src/tools/analytics/useVoteAnalytics.ts:2,11,13-14`, `src/tools/analytics/useVoteLog.ts:2,11,13-14`, `src/tools/analytics/useVercelAnalytics.ts:2,11,13-14` (the import, the doc comment and the two initial states; the effect and the return shape don't change)
- Modify: `src/test/setup.ts` (whole file, line 1)
- Test: `src/tools/analytics/__tests__/adminData.test.ts` (line 2, plus new tests after line 29)
- Test: `src/tools/analytics/__tests__/useVoteAnalytics.test.ts` (lines 5-7 and 8-13, plus new tests after line 26)

**Interfaces:**
- Consumes: the global `fetch` only.
- Produces:
  - `fetchAdminData<T>(file: string): Promise<T>`. The signature doesn't change. It now keeps one promise per file for the session. A rejected promise is evicted when it settles, so a later mount retries. Every caller gets the same parsed object, so callers treat it as read-only.
  - `cachedAdminData<T>(file: string): T | undefined`. It returns the parsed artifact once its fetch has succeeded. It never returns a pending or failed one.
  - `resetAdminDataCache(): void`, for tests only. It empties both the promise cache and the settled artifacts, and `src/test/setup.ts` calls it before every test.
  - `useVoteAnalytics`, `useVoteLog` and `useVercelAnalytics` keep their return shape (`{data, loading, error}`). A mount after a successful fetch this session starts with `data` set and `loading: false`.

**Behaviour notes (no action needed):**
- **No loading flash on remount.** A hook that mounts after its artifact has loaded has the data on its first render, with `loading: false`, so moving between pages shows no "Loading…" flash.
  - Reusing the promise alone wouldn't achieve this. React Router 7.18.4 commits navigations inside `React.startTransition` (`react-router/dist/development/chunk-OB3PAWPO.mjs:6843`, the path taken when `useTransitions` is unset). Passive effects of a transition commit run after paint, so the page would paint its `loading: true` render before the effect reached the cached promise's `then`. That is why the hooks seed their state from `cachedAdminData`.
  - The effect still runs. It gets the settled promise back and makes no request. Its `setData`/`setLoading` calls repeat the values the state already holds, so nothing re-renders.
  - A first visit, or a visit after a failed fetch, still shows the loading copy until the fetch settles.
- **StrictMode.** In dev, `StrictMode` (`src/main.tsx`) runs every effect twice, and both runs now share one fetch instead of making two. It also calls the state initializers twice. `cachedAdminData` only reads, so that is harmless.
- **Shared artifacts are read-only.** The parsed artifact is now shared across mounts. Today's analytics code sorts copies only (`[...rules].sort`, `[...analytics.events].sort`, `[...scoped].sort`, and `activityStats` sorts a freshly mapped array), so nothing mutates an artifact. New page code must do the same.
- **Why the reset goes in the setup file.** Vitest isolates test files (`isolate` defaults to `true`), so the cache leaks only between tests in the same file.
  - `src/test/setup.ts` is already in `vite.config.ts` `setupFiles`, with `globals: true`. It empties the cache before every test in every file.
  - Tasks drafted in parallel (the `src/router.test.tsx` rewrite, and the Overview, Activity and Web page tests) therefore can't miss a reset.
  - `adminData.ts` imports nothing, so loading it from the setup file pulls in no other module.
- **Tests that reach the cache today:**
  - `adminData.test.ts`: without a reset, test 2 would get test 1's cached success instead of its HTML fallback.
  - `useVoteAnalytics.test.ts`: without a reset, the 404 test would get the first test's payload.
  - `src/router.test.tsx`: today only `/analytics` mounts the hooks, with a fetch that never settles. Once `/` becomes the Overview, every test there mounts them and would inherit the first test's pending promises.
  - The global reset covers all three, and `src/router.test.tsx` needs no change in this task.
- **No other test reaches these hooks.** `TuningPage.test.tsx` and the `githubClient`/`githubCommit` tests stub `fetch` for other modules. `BannerPage.test.tsx` goes in R1-1.

- [ ] **Step 1: Empty the cache before every test**

Replace the whole of `src/test/setup.ts`. Current content:

```ts
import '@testing-library/jest-dom/vitest';
```

New content:

```ts
import '@testing-library/jest-dom/vitest';
import {resetAdminDataCache} from '../tools/analytics/adminData';

// fetchAdminData keeps each artifact for the session in module state. Empty it
// before every test, so no test inherits another's fetch or data.
beforeEach(() => resetAdminDataCache());
```

- [ ] **Step 2: Write the failing cache tests**

Edit `src/tools/analytics/__tests__/adminData.test.ts`, line 2.

Before:

```ts
import {fetchAdminData} from '../adminData';
```

After:

```ts
import {cachedAdminData, fetchAdminData, resetAdminDataCache} from '../adminData';
```

Line 1 (`import {afterEach, describe, expect, it, vi} from 'vitest';`) and line 4 (`afterEach(() => vi.unstubAllGlobals());`) stay as they are.

Then add five tests after the last existing one, between it (lines 26-29) and the closing `});` of the `describe`:

```ts
  it('reports an HTTP error with its status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', {status: 404})));
    await expect(fetchAdminData('vote-log.json')).rejects.toThrow('vote-log.json: HTTP 404');
  });
```

Insert after it:

```ts

  it('fetches each file once for the session', async () => {
    // A fresh Response per call: a body can only be read once.
    const fetchMock = vi.fn(async (url: string) => json({url}));
    vi.stubGlobal('fetch', fetchMock);

    const first = fetchAdminData('vote-log.json');
    expect(fetchAdminData('vote-log.json')).toBe(first);
    const log = await first;
    expect(log).toEqual({url: '/admin-data/vote-log.json'});

    // Still cached once settled (the same parsed object), and each file has its own entry.
    expect(await fetchAdminData('vote-log.json')).toBe(log);
    expect(await fetchAdminData('vote-analytics.json')).toEqual({url: '/admin-data/vote-analytics.json'});
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('drops a failed fetch, so the next call tries again', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', {status: 503}))
      .mockResolvedValueOnce(json({votes: []}));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchAdminData('vote-log.json')).rejects.toThrow('vote-log.json: HTTP 503');
    expect(await fetchAdminData('vote-log.json')).toEqual({votes: []});
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('hands back an artifact synchronously once it has loaded, never a failed one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(json({votes: []})).mockResolvedValueOnce(new Response('', {status: 503})),
    );

    const pending = fetchAdminData('vote-log.json');
    expect(cachedAdminData('vote-log.json')).toBeUndefined();
    const log = await pending;
    expect(cachedAdminData('vote-log.json')).toBe(log);

    await expect(fetchAdminData('vote-analytics.json')).rejects.toThrow('vote-analytics.json: HTTP 503');
    expect(cachedAdminData('vote-analytics.json')).toBeUndefined();
  });

  it('fetches again after resetAdminDataCache()', async () => {
    const fetchMock = vi.fn(async () => json({votes: []}));
    vi.stubGlobal('fetch', fetchMock);

    await fetchAdminData('vote-log.json');
    resetAdminDataCache();
    expect(cachedAdminData('vote-log.json')).toBeUndefined();
    await fetchAdminData('vote-log.json');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the newer fetch when one started before a reset fails', async () => {
    let failStale: (err: Error) => void = () => {};
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((_resolve, reject) => {
            failStale = reject;
          }),
      )
      .mockImplementation(async () => json({votes: []}));
    vi.stubGlobal('fetch', fetchMock);

    const stale = fetchAdminData('vote-log.json');
    resetAdminDataCache();
    await fetchAdminData('vote-log.json');
    failStale(new Error('network down'));
    await expect(stale).rejects.toThrow('network down');

    await fetchAdminData('vote-log.json');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
```

- [ ] **Step 3: Write the failing hook tests**

Edit `src/tools/analytics/__tests__/useVoteAnalytics.test.ts`, lines 5-7. The imports on lines 1-3 stay as they are.

Before:

```ts
afterEach(() => vi.unstubAllGlobals());

describe('useVoteAnalytics', () => {
```

After:

```ts
afterEach(() => vi.unstubAllGlobals());

const payload = {generatedAt: 'x', hasRawVotes: false, global: {totalVotes: 5}, rules: [], pairs: []};
/** A fresh response per call: a body can only be read once. */
const ok = () => new Response(JSON.stringify(payload), {headers: {'content-type': 'application/json'}});

describe('useVoteAnalytics', () => {
```

Edit the first test, lines 8-13 of the current file.

Before:

```ts
  it('returns data on a successful fetch', async () => {
    const payload = {generatedAt: 'x', hasRawVotes: false, global: {totalVotes: 5}, rules: [], pairs: []};
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), {headers: {'content-type': 'application/json'}})),
    );
```

After:

```ts
  it('returns data on a successful fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok()));
```

Then add two tests after the existing error test (lines 20-26 of the current file), just before the closing `});`:

```ts
  it('surfaces an error on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', {status: 404})));
    const {result} = renderHook(() => useVoteAnalytics());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
  });
```

Insert after it:

```ts

  it('reuses the first fetch when it mounts again', async () => {
    const fetchMock = vi.fn(async () => ok());
    vi.stubGlobal('fetch', fetchMock);
    const first = renderHook(() => useVoteAnalytics());
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    first.unmount();

    // No waitFor: the second mount's first render already has the data.
    const second = renderHook(() => useVoteAnalytics());
    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.data?.global.totalVotes).toBe(5);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fetches again on the next mount after a failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', {status: 404}))
      .mockResolvedValueOnce(ok());
    vi.stubGlobal('fetch', fetchMock);
    const first = renderHook(() => useVoteAnalytics());
    await waitFor(() => expect(first.result.current.error).toBeInstanceOf(Error));
    first.unmount();

    // A failed fetch is never handed back, so this mount loads again.
    const second = renderHook(() => useVoteAnalytics());
    expect(second.result.current.loading).toBe(true);
    await waitFor(() => expect(second.result.current.loading).toBe(false));
    expect(second.result.current.data?.global.totalVotes).toBe(5);
    expect(second.result.current.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
```

- [ ] **Step 4: Run the tests to see them fail**

Run: `pnpm exec vitest run src/tools/analytics/__tests__/adminData.test.ts src/tools/analytics/__tests__/useVoteAnalytics.test.ts`
Expected: FAIL. All 12 tests fail in `beforeEach` with a TypeError saying `resetAdminDataCache` is not a function. `src/test/setup.ts` calls it before every test, and `adminData.ts` doesn't export it yet.

- [ ] **Step 5: Add the cache**

Replace the whole of `src/tools/analytics/adminData.ts`. Current content:

```ts
/**
 * Admin's own generated files live under /admin-data/, never /data/, which
 * forwards to the public app (docs/PLAN.md, D8). P3's deploy step writes them.
 */
const ADMIN_DATA = '/admin-data/';

/**
 * Fetch one admin-data artifact. A file that was never generated comes back as
 * the SPA's index.html with a 200 (Vite's dev fallback and vercel.json's
 * rewrite both do this), so a response that isn't JSON counts as missing. The
 * app's usePrecomputedSynergies guards /data/synergies/ the same way.
 */
export async function fetchAdminData<T>(file: string): Promise<T> {
  const res = await fetch(`${ADMIN_DATA}${file}`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  if (!res.headers.get('content-type')?.includes('application/json')) {
    throw new Error(`${file} has not been generated yet`);
  }
  return (await res.json()) as T;
}
```

New content:

```ts
/**
 * Admin's own generated files live under /admin-data/, never /data/, which
 * forwards to the public app (docs/PLAN.md, D8). P3's deploy step writes them.
 */
const ADMIN_DATA = '/admin-data/';

/** Each file's fetch, by file name. A rejected one is removed when it settles. */
const cache = new Map<string, Promise<unknown>>();
/** Each file's parsed artifact, once its fetch has succeeded. */
const settled = new Map<string, unknown>();

/**
 * Fetch one admin-data artifact, sharing one successful fetch per file for the
 * session (docs/plans/R-redesign.md, R-8). The files change only when Deploy
 * runs, and each insights page mounts its own hooks, so moving between pages
 * reuses the first fetch instead of downloading the vote log again. Every
 * caller gets the same parsed object: treat it as read-only. A failed fetch
 * leaves the cache, so the next mount tries again.
 */
export function fetchAdminData<T>(file: string): Promise<T> {
  const cached = cache.get(file);
  if (cached) return cached as Promise<T>;

  const pending = loadAdminData<T>(file);
  cache.set(file, pending);
  pending.then(
    (data) => {
      if (cache.get(file) === pending) settled.set(file, data);
    },
    () => {
      // Evict only this attempt: after resetAdminDataCache() a newer one may hold the slot.
      if (cache.get(file) === pending) cache.delete(file);
    },
  );
  return pending;
}

/** The artifact if a fetch this session has already succeeded, so a hook can start from it without a loading render. */
export function cachedAdminData<T>(file: string): T | undefined {
  return settled.get(file) as T | undefined;
}

/** Empty the cache. Tests only: src/test/setup.ts calls it before every test. */
export function resetAdminDataCache(): void {
  cache.clear();
  settled.clear();
}

/**
 * Read one artifact from the network. A file that was never generated comes
 * back as the SPA's index.html with a 200 (Vite's dev fallback and
 * vercel.json's rewrite both do this), so a response that isn't JSON counts as
 * missing. The app's usePrecomputedSynergies guards /data/synergies/ the same way.
 */
async function loadAdminData<T>(file: string): Promise<T> {
  const res = await fetch(`${ADMIN_DATA}${file}`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  if (!res.headers.get('content-type')?.includes('application/json')) {
    throw new Error(`${file} has not been generated yet`);
  }
  return (await res.json()) as T;
}
```

Why this works:
- **Ordering.** Both handlers are registered before any caller's. So by the time a caller sees the result, a success is already in `settled` and a failure has already left `cache`.
- **Rejections still reach callers.** Callers hold `pending` itself, not the promise that `.then` derives.
- **No unhandled rejections.** `pending` has a rejection handler, so a caller that never attaches one can't produce one. The derived promise never rejects either.
- **Resets win.** The `cache.get(file) === pending` guard on both branches stops a fetch that started before `resetAdminDataCache()` from writing into the emptied cache.

- [ ] **Step 6: Start the hooks from a loaded artifact**

The effect stays the same in all three hooks. Each one changes its import, doc comment and two initial states.

`src/tools/analytics/useVoteAnalytics.ts`, line 2.
Before:

```ts
import {fetchAdminData} from './adminData';
```

After:

```ts
import {cachedAdminData, fetchAdminData} from './adminData';
```

`src/tools/analytics/useVoteAnalytics.ts`, lines 11-14.
Before:

```ts
/** Fetch the build-time vote-analytics artifact once on mount. */
export function useVoteAnalytics(): UseVoteAnalyticsReturn {
  const [data, setData] = useState<VoteAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
```

After:

```ts
/**
 * Load the build-time vote-analytics artifact on mount. fetchAdminData shares one
 * successful fetch per file for the session, so a mount after it starts with the
 * data instead of a loading render.
 */
export function useVoteAnalytics(): UseVoteAnalyticsReturn {
  const [data, setData] = useState<VoteAnalytics | null>(() => cachedAdminData<VoteAnalytics>('vote-analytics.json') ?? null);
  const [loading, setLoading] = useState(() => cachedAdminData('vote-analytics.json') === undefined);
```

`src/tools/analytics/useVoteLog.ts`, line 2.
Before:

```ts
import {fetchAdminData} from './adminData';
```

After:

```ts
import {cachedAdminData, fetchAdminData} from './adminData';
```

`src/tools/analytics/useVoteLog.ts`, lines 11-14.
Before:

```ts
/** Fetch the build-time vote-log artifact once on mount. */
export function useVoteLog(): UseVoteLogReturn {
  const [data, setData] = useState<VoteLog | null>(null);
  const [loading, setLoading] = useState(true);
```

After:

```ts
/**
 * Load the build-time vote-log artifact on mount. fetchAdminData shares one
 * successful fetch per file for the session, so a mount after it starts with the
 * data instead of a loading render.
 */
export function useVoteLog(): UseVoteLogReturn {
  const [data, setData] = useState<VoteLog | null>(() => cachedAdminData<VoteLog>('vote-log.json') ?? null);
  const [loading, setLoading] = useState(() => cachedAdminData('vote-log.json') === undefined);
```

`src/tools/analytics/useVercelAnalytics.ts`, line 2.
Before:

```ts
import {fetchAdminData} from './adminData';
```

After:

```ts
import {cachedAdminData, fetchAdminData} from './adminData';
```

`src/tools/analytics/useVercelAnalytics.ts`, lines 11-14.
Before:

```ts
/** Fetch the build-time Vercel Web Analytics artifact once on mount. */
export function useVercelAnalytics(): UseVercelAnalyticsReturn {
  const [data, setData] = useState<VercelAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
```

After:

```ts
/**
 * Load the build-time Vercel Web Analytics artifact on mount. fetchAdminData shares
 * one successful fetch per file for the session, so a mount after it starts with
 * the data instead of a loading render.
 */
export function useVercelAnalytics(): UseVercelAnalyticsReturn {
  const [data, setData] = useState<VercelAnalytics | null>(
    () => cachedAdminData<VercelAnalytics>('vercel-analytics.json') ?? null,
  );
  const [loading, setLoading] = useState(() => cachedAdminData('vercel-analytics.json') === undefined);
```

- [ ] **Step 7: Run the tests to see them pass**

Run: `pnpm exec vitest run src/tools/analytics/__tests__/adminData.test.ts src/tools/analytics/__tests__/useVoteAnalytics.test.ts`
Expected: PASS. 2 test files, 12 tests passed (8 in `adminData.test.ts`, 4 in `useVoteAnalytics.test.ts`).

- [ ] **Step 8: Run the whole suite**

Run: `pnpm test:run`
Expected: PASS. Every test file passes. `src/router.test.tsx` passes unchanged, because `src/test/setup.ts` empties the cache before each of its tests and `/analytics` still renders "Engine Calibration" while its fetches stay pending.

- [ ] **Step 9: Lint and typecheck**

Run: `pnpm lint`
Expected: no problems.

Run: `pnpm typecheck`
Expected: exit 0. `tsconfig.app.json` includes `src/` with the `vitest/globals` types, so the setup file's global `beforeEach` typechecks. `adminData.ts` now exports `cachedAdminData` and `resetAdminDataCache`, which the setup file, the tests and the hooks import.

- [ ] **Step 10: Commit**

Run with the Bash tool, only after the owner approves:

```bash
git add src/tools/analytics/adminData.ts src/tools/analytics/useVoteAnalytics.ts src/tools/analytics/useVoteLog.ts src/tools/analytics/useVercelAnalytics.ts src/tools/analytics/__tests__/adminData.test.ts src/tools/analytics/__tests__/useVoteAnalytics.test.ts src/test/setup.ts
USER_APPROVED=1 git commit -m "feat(analytics): fetch each admin-data artifact once per session (#24)"
```
