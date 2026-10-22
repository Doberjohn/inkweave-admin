import {vi} from 'vitest';
import {act} from '@testing-library/react';
import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import {fetchCollectionOnlyCards, resetCollectionOnlyCards} from '../collectionCards';

/*
 * Sets 1 to 8 as the app serves them (#68): one chunk of the collection data per set, under the
 * /data/ forward. The tests of what reads them stub fetch rather than vi.mock collectionCards:
 * src/test/setup.ts loads that module, for its reset, before a test file's vi.mock registers, so a
 * mock would never reach it.
 */

/** What each set's chunk holds, as the app stores it; a set not named holds no card. */
export type Chunks = Readonly<Record<string, readonly LorcanaJSONCard[]>>;

/** One chunk's answer, by its set. */
export type ChunkAnswer = (set: string) => Response | Promise<Response>;

/** The set a chunk's address names, or undefined for any other request. */
export function setOfChunk(url: unknown): string | undefined {
  return typeof url === 'string' ? /^\/data\/collection\/(\d+)\.json$/.exec(url)?.[1] : undefined;
}

/** The app serving `chunks`, each as its set's chunk. */
export function chunksOf(chunks: Chunks = {}): ChunkAnswer {
  return (set) => Response.json(chunks[set] ?? []);
}

/**
 * Stubs fetch as the app answering a chunk's request with `answer`; any other request is a
 * mistake. Unstub in afterEach (`vi.unstubAllGlobals`).
 */
export function stubChunks(answer: ChunkAnswer = chunksOf()) {
  const stubbed = vi.fn(async (url: string) => {
    const set = setOfChunk(url);
    if (set === undefined) throw new Error(`unexpected request: ${url}`);
    return answer(set);
  });
  vi.stubGlobal('fetch', stubbed);
  return stubbed;
}

/** Stubs the chunks as an app that answers when the test says: every request waits for `land`. */
export function heldChunks(chunks: Chunks = {}) {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => (release = resolve));
  const answer = chunksOf(chunks);
  stubChunks(async (set) => {
    await gate;
    return answer(set);
  });
  return {land: () => act(async () => release())};
}

/**
 * Stubs the chunks and reads them afresh, so a hook that mounts next starts with Sets 1 to 8 in:
 * the editor's tests that don't care about them load none, and the ones that do load theirs.
 */
export async function loadCollection(chunks: Chunks = {}): Promise<void> {
  resetCollectionOnlyCards();
  stubChunks(chunksOf(chunks));
  await fetchCollectionOnlyCards();
}
