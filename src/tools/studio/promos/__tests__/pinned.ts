import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

/*
 * Node-only: it reads the pinned app from disk, so only test files import it. A story must not, and
 * neither may `promoFixtures.ts`, which stories load. Vite doesn't fail on a Node import in the
 * browser: it swaps in a stub that warns on the console and gives undefined bindings, so the module
 * loads and `readPinned` throws on its first call, at `resolve`, which it runs before `readFileSync`
 * (`resolve is not a function`). `scripts/browser-safety.test.mjs` keeps this module out of anything
 * a story loads.
 */

/** A file of the pinned app, as text: what the tests use as a stand-in for the branch's copy. */
export function readPinned(path: string): string {
  return readFileSync(resolve('upstream/inkweave', path), 'utf8');
}
