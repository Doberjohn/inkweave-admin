import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {transformRawCards} from '../../../../app-bridge';
import {setChunkPath} from '../../finishes/finishFiles';

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

/** A set's chunk of the pinned collection data, as the app's loader builds it: the set's cards and its printings. */
export function pinnedChunk(setCode: string): LorcanaCard[] {
  return transformRawCards(JSON.parse(readPinned(setChunkPath(setCode))) as LorcanaJSONCard[]);
}
