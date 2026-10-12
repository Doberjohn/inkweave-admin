import {useEffect, useState} from 'react';
import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import {readPreviewCards} from '../reveal/githubClient';
import {
  FIRST_READ,
  askedAgain,
  committed,
  landed,
  readError,
  type FileState,
  type Landing,
  type PreviewCardsFile,
} from './previewCardsFile';

// The file's type lives in previewCardsFile.ts; the hook's consumers may name it from either module.
export type {PreviewCardsFile};

/** What usePreviewCardsFile gives: the file's state, the read numbering, and the two ways to change it. */
export type UsePreviewCardsFileResult = PreviewCardsFile & {
  /** The newest read asked for. A ready file's `read` catches up with it when that read lands. */
  requested: number;
  /**
   * Reads previewCards.json again, and is the file's Retry after a failed
   * first read. Resolves once the newest read asked for lands, this one or a
   * later one: with the cards then on screen, or null when that read failed
   * (the state says why). Never settles if the hook unmounts first. The read
   * starts in an effect, which runs only once the update that asked for it
   * commits. So a test awaits the promise after the act that asked, never
   * inside it, and no caller awaits it inside an async transition or a form
   * action, whose updates React holds until the action ends.
   */
  reload: () => Promise<LorcanaJSONCard[] | null>;
  /** A fields save landed: put the committed entry in place now, and read the file again. */
  commit: (entry: LorcanaJSONCard) => void;
};

/**
 * Reads previewCards.json from the target branch: once on mount, and again on
 * each reload() or commit(). The numbering is state, as useCardSynergies'
 * attempt is: the effect reads number `requested`, a newer request cancels an
 * older read, and only the newest read asked for lands (`landed`). The cards
 * on screen stay until the next read lands, and after a failed reload too
 * (C1, as in useLiveTuning). The studio's workspace is keyed by token (R-84),
 * so a new token remounts the hook and reads afresh.
 */
export function usePreviewCardsFile(token: string): UsePreviewCardsFileResult {
  const [state, setState] = useState<FileState>(FIRST_READ);
  const {requested, answered} = state;

  useEffect(() => {
    let cancelled = false;
    const land = (landing: Landing) => {
      if (!cancelled) setState((prev) => landed(prev, landing));
    };
    readPreviewCards(token).then(
      (cards) => land({read: requested, cards}),
      (e: unknown) => land({read: requested, error: readError(e)}),
    );
    return () => {
      cancelled = true;
    };
  }, [token, requested]);

  // Settled after the landing commits, so a caller's .then() sees the new state on screen.
  useEffect(() => {
    for (const settle of answered.waiters) settle(answered.cards);
  }, [answered]);

  return {
    ...state.file,
    requested,
    reload: () => new Promise((resolve) => setState((prev) => askedAgain(prev, resolve))),
    commit: (entry) => setState((prev) => committed(prev, entry)),
  };
}
