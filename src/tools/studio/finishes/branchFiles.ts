import {useSyncExternalStore} from 'react';
import {readRepoFile, targetBranch} from '../../../github/githubCommit';

/*
 * The app's data files as the target branch holds them (#68). Edit card's Printings panel reads
 * three or four of them for every card it opens, one of them (allCards.json) about 2 MB, so each is
 * read once per branch for the session, and a publish drops them all (`forgetBranchFiles`) for the
 * next read to see what it wrote. What a file parsed to is kept for as long as its text is the
 * same (`lastTextCached`).
 */

/** A file of the target branch: its path in the app's repo, and the text read there. */
export interface BranchFile {
  path: string;
  text: string;
}

/** Each read, by branch and path (a git ref has no ":"): the promise itself, so a second ask shares a read that is under way. */
const reads = new Map<string, Promise<string>>();

/** How many times the reads were dropped. What reads the files follows it, so it starts again when it changes. */
let generation = 0;
const listeners = new Set<() => void>();

/** What `lastTextCached` keeps, for `resetBranchFiles` to empty. */
const parseCaches: Array<{clear: () => void}> = [];

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): number {
  return generation;
}

/**
 * The text of a file of the target branch, read once for the session. A caller that asks while
 * the read is under way shares it. A failed read leaves the cache, so the next ask reads again.
 */
export function readBranchFile({token, path}: {token: string; path: string}): Promise<string> {
  const branch = targetBranch();
  const key = `${branch}:${path}`;
  const kept = reads.get(key);
  if (kept) return kept;

  const read = readRepoFile(token, path, branch);
  reads.set(key, read);
  read.catch(() => {
    // Evict only this attempt: after forgetBranchFiles() a newer read may hold the slot.
    if (reads.get(key) === read) reads.delete(key);
  });
  return read;
}

/**
 * Drops every read, so the next one asks GitHub again, and tells what follows
 * `useBranchFilesGeneration` to read again. A publish calls it: its files are new.
 */
export function forgetBranchFiles(): void {
  reads.clear();
  generation += 1;
  notify();
}

/**
 * How many times the reads were dropped. A hook that reads the files starts again when it
 * changes, so a publish makes it read the branch again.
 */
export function useBranchFilesGeneration(): number {
  return useSyncExternalStore(subscribe, snapshot);
}

/**
 * `parse`, remembering the last text it parsed for each path: asked for a path whose text is the
 * one it last parsed, it hands back that result and parses nothing. A file read again unchanged (a
 * card of another set, a branch read again after a publish that didn't touch it) is never parsed
 * twice, and allCards.json, about 2 MB, is most of what a read parses. A text it couldn't parse
 * leaves nothing behind.
 */
export function lastTextCached<T>(parse: (file: BranchFile) => T): (file: BranchFile) => T {
  const last = new Map<string, {text: string; parsed: T}>();
  parseCaches.push(last);
  return (file) => {
    const kept = last.get(file.path);
    if (kept?.text === file.text) return kept.parsed;
    const parsed = parse(file);
    last.set(file.path, {text: file.text, parsed});
    return parsed;
  };
}

/** Empties every read and what was parsed, and counts from 0 again. Tests only: src/test/setup.ts calls it before every test. */
export function resetBranchFiles(): void {
  reads.clear();
  for (const cache of parseCaches) cache.clear();
  generation = 0;
  notify();
}
