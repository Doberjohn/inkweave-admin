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
