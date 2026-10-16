import type {LorcanaJSONCard} from 'inkweave-synergy-engine';

/** previewCards.json as Edit last read it from the target branch (usePreviewCardsFile). */
export type PreviewCardsFile =
  | {status: 'loading'}
  // read: the number of the read these cards came from (1 for the first).
  // reloadError: the last read failed, and these are the cards an earlier read gave (C1).
  | {status: 'ready'; cards: LorcanaJSONCard[]; ids: ReadonlySet<number>; read: number; reloadError?: string}
  // No read has landed yet.
  | {status: 'error'; error: string};

/** Settles one reload() caller's promise: with the cards on screen, or null when the read failed. */
export type Waiter = (cards: LorcanaJSONCard[] | null) => void;

/** The callers a read that landed answers, and what it put on screen. */
export interface Answer {
  waiters: readonly Waiter[];
  cards: LorcanaJSONCard[] | null;
}

/** usePreviewCardsFile's one state object. The read numbering lives here, not in a ref. */
export interface FileState {
  /** The newest read asked for: 1 for the first, then one more per reload() or commit(). */
  requested: number;
  file: PreviewCardsFile;
  /** reload() callers whose read hasn't landed yet. */
  waiting: readonly Waiter[];
  /** The callers the last read to land answered, for the hook's effect to settle once it is on screen. */
  answered: Answer;
}

/** A read that finished: its number, and the cards it gave or why it failed. */
export type Landing = {read: number; cards: LorcanaJSONCard[]} | {read: number; error: string};

export const FIRST_READ: FileState = {
  requested: 1,
  file: {status: 'loading'},
  waiting: [],
  answered: {waiters: [], cards: null},
};

/** A failed read's reason, as useLiveTuning words one. */
export function readError(e: unknown): string {
  return e instanceof Error ? e.message : 'Read failed';
}

/** reload(): one more read asked for, and its caller waiting for it. */
export function askedAgain(prev: FileState, waiter: Waiter): FileState {
  return {...prev, requested: prev.requested + 1, waiting: [...prev.waiting, waiter]};
}

/** What a landing puts on screen. A failed reload keeps the cards an earlier read gave, beside its reason (C1). */
function fileAfter(prev: PreviewCardsFile, landing: Landing): PreviewCardsFile {
  if ('cards' in landing) {
    const {read, cards} = landing;
    return {status: 'ready', cards, ids: new Set(cards.map((card) => card.id)), read};
  }
  if (prev.status === 'ready') return {...prev, reloadError: landing.error};
  return {status: 'error', error: landing.error};
}

/**
 * A read finished. Only the newest read asked for lands: an older one, which a
 * reload() or commit() made since has replaced, changes nothing. The landing
 * answers every caller waiting, since each asked for a read no newer than it.
 */
export function landed(prev: FileState, landing: Landing): FileState {
  if (landing.read !== prev.requested) return prev;
  const cards = 'cards' in landing ? landing.cards : null;
  return {...prev, file: fileAfter(prev.file, landing), waiting: [], answered: {waiters: prev.waiting, cards}};
}

/**
 * A save committed `entry` (R4-4c): it takes the place of the entry with its
 * id at once, so a card reopened before the next read lands seeds from what was
 * committed. One more read is asked for too, so no read asked for before the
 * commit, which may predate it, can land over the patch. An id the cards lack
 * changes nothing on screen; that read brings it.
 */
export function committed(prev: FileState, entry: LorcanaJSONCard): FileState {
  const next = {...prev, requested: prev.requested + 1};
  if (prev.file.status !== 'ready') return next;
  const cards = prev.file.cards.map((card) => (card.id === entry.id ? entry : card));
  return {...next, file: {...prev.file, cards}};
}
