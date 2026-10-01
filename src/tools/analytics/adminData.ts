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
