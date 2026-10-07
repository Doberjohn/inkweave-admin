/**
 * Where the last card viewed is saved (R-28), so bare /cards opens it again.
 * Admin's own keys start inkweave-admin., as the sidebar's does
 * (SIDEBAR_OPEN_KEY). Only the id is saved: the card list says what it is.
 */
export const LAST_CARD_KEY = 'inkweave-admin.last-card';

// Every access is wrapped, as the sidebar's is (Sidebar.tsx): a private window
// or blocked site data throws, and the page must still work without storage.

/** The last card viewed, or null when none was saved (or storage is unavailable). */
export function readLastCard(): string | null {
  try {
    // An empty value counts as none: /cards would otherwise redirect to itself.
    return localStorage.getItem(LAST_CARD_KEY) || null;
  } catch {
    return null;
  }
}

/** Saves a card as the last viewed. The page calls it once the id resolves to a card. */
export function writeLastCard(cardId: string): void {
  try {
    localStorage.setItem(LAST_CARD_KEY, cardId);
  } catch {
    /* storage unavailable: the next visit to /cards shows the prompt */
  }
}

/**
 * Forgets `cardId` if it is the saved card, and leaves any other alone. The
 * page calls it for an id the loaded card list doesn't have.
 */
export function forgetLastCard(cardId: string): void {
  try {
    if (localStorage.getItem(LAST_CARD_KEY) === cardId) localStorage.removeItem(LAST_CARD_KEY);
  } catch {
    /* storage unavailable: nothing was saved */
  }
}
