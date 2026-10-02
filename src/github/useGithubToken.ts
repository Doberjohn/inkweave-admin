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
