import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

/*
 * Node-only: it reads the pinned app from disk, so only test files import it. A story must not, and
 * neither may `promoFixtures.ts`, which stories load: Vite leaves `node:fs` out of the browser bundle,
 * so a module that imports it throws when a story loads.
 */

/** A file of the pinned app, as text: what the tests use as a stand-in for the branch's copy. */
export function readPinned(path: string): string {
  return readFileSync(resolve('upstream/inkweave', path), 'utf8');
}
