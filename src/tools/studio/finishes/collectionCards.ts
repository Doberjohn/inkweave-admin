import {useEffect, useSyncExternalStore} from 'react';
import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {transformRawCards} from '../../../app-bridge';
import {messageOf} from './branchFiles';

/*
 * The cards of Sets 1 to 8 (#68). The app's card list leaves them out: they rotated out of Core, so
 * allCards.json no longer holds them. Their data lives on in the collection chunks the binder reads,
 * one file per set, which inkweave.ink serves under the /data/ forward. Edit card's search adds
 * their cards, read once for the session, and a card of theirs opens printings-only: the versions
 * of its printings change there, and nothing else about it does.
 */

/** The sets below the Core floor (isCoreSet): the ones whose cards only their chunks hold. */
export const COLLECTION_ONLY_SETS: readonly string[] = ['1', '2', '3', '4', '5', '6', '7', '8'];

/**
 * Where the read of Sets 1 to 8 stands. `error`: a chunk couldn't be read, so Edit card goes on
 * without their cards until `retry` reads them again, and that read alone says why, in its own words
 * ("/data/collection/3.json: HTTP 500"), for the search's notice to name (#74).
 */
type ReadStatus = {status: 'loading' | 'ready'; error: null} | {status: 'error'; error: string};

/** What the hook shows of the session's read: where it stands, and the cards it holds. */
type Read = ReadStatus & {
  /** Their cards, in the order of their sets and each chunk's own; none until `status` reads ready. */
  cards: readonly LorcanaCard[];
};

/** What Edit card has of Sets 1 to 8. */
export type CollectionOnlyCards = Read & {
  /** Reads the chunks again after a failure. It does nothing while a read is under way, or once one has landed. */
  retry: () => void;
};

const NO_CARDS: readonly LorcanaCard[] = [];
const LOADING: Read = {cards: NO_CARDS, status: 'loading', error: null};

/** A read that failed: no cards, and why. */
const failed = (error: unknown): Read => ({cards: NO_CARDS, status: 'error', error: messageOf(error)});

/** The session's read: the promise itself, so a second ask shares a read that is under way. A failed read leaves it. */
let kept: Promise<LorcanaCard[]> | null = null;
let read: Read = LOADING;
const listeners = new Set<() => void>();

/** Shows what the read came to, to everything that mounts the hook. */
function announce(next: Read): void {
  if (next === read) return;
  read = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): Read {
  return read;
}

/** A chunk's entries, as the app serves them at `url`. */
async function chunkEntries(url: string): Promise<LorcanaJSONCard[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as LorcanaJSONCard[];
}

/**
 * One set's chunk as cards. The app's loader builds them (transformRawCards), so each has its art's
 * URL. A read that fails names the chunk before what it met (#74): "/data/collection/3.json: HTTP
 * 500", a fetch that couldn't reach it, the JSON parser's words where the app answered with its page,
 * or the loader's where the JSON isn't a list of cards.
 */
function readChunk(set: string): Promise<LorcanaCard[]> {
  const url = `/data/collection/${set}.json`;
  return chunkEntries(url)
    .then(transformRawCards)
    .catch((error: unknown) => {
      throw new Error(`${url}: ${messageOf(error)}`, {cause: error});
    });
}

/**
 * Every chunk at once, their cards in the order of the sets. A chunk holds its set's printings
 * (Enchanted, Epic and Iconic printings, alt foils) as entries of their own, each naming its base
 * card as `baseId`: they are not cards, and the search lists cards only.
 */
async function readChunks(): Promise<LorcanaCard[]> {
  const chunks = await Promise.all(COLLECTION_ONLY_SETS.map((set) => readChunk(set)));
  return chunks.flat().filter((card) => card.baseId === undefined);
}

/**
 * The cards of Sets 1 to 8, read once for the session: the chunks change only when the app
 * deploys, and every Edit card mounts its own hook. A caller that asks while a read is under way
 * shares it. A failed read leaves the session, so the next ask reads again, and says why it failed:
 * the first chunk to fail, and how (#74).
 */
export function fetchCollectionOnlyCards(): Promise<LorcanaCard[]> {
  if (kept) return kept;
  const attempt = readChunks();
  kept = attempt;
  announce(LOADING);
  attempt.then(
    (cards) => {
      if (kept === attempt) announce({cards, status: 'ready', error: null});
    },
    (error: unknown) => {
      // Evict only this attempt: after resetCollectionOnlyCards() a newer one may hold the slot.
      if (kept !== attempt) return;
      kept = null;
      announce(failed(error));
    },
  );
  return attempt;
}

/** Forgets the read. Tests only: src/test/setup.ts calls it before every test. */
export function resetCollectionOnlyCards(): void {
  kept = null;
  announce(LOADING);
}

/** Reads the chunks again if the last read failed; a read under way or landed is shared. */
function retry(): void {
  void fetchCollectionOnlyCards();
}

/**
 * Sets 1 to 8 for Edit card. The first mount starts the session's read, and what mounts later
 * shares it and starts from where it stands: with the cards in, when a read has landed, so a card
 * of theirs opens on the first render.
 */
export function useCollectionOnlyCards(): CollectionOnlyCards {
  const current = useSyncExternalStore(subscribe, snapshot);
  useEffect(() => {
    void fetchCollectionOnlyCards();
  }, []);
  return {...current, retry};
}
