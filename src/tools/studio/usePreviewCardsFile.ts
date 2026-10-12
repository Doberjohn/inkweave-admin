import {useEffect, useState} from 'react';
import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import {readPreviewCards} from '../reveal/githubClient';

export type PreviewCardsFile =
  | {status: 'loading'}
  // read: the request this read answers. reloadError: the newest request failed, and the
  // cards are the last read that landed, as useLiveTuning keeps its config. A new request clears it.
  | {status: 'ready'; cards: LorcanaJSONCard[]; ids: ReadonlySet<number>; read: number; reloadError?: string}
  // No read has landed yet.
  | {status: 'error'; error: string};

/** The file's state, the newest request made for it, and a way to make another. */
export type UsePreviewCardsFile = PreviewCardsFile & {requested: number; reload: () => void};

function failedRead(prev: PreviewCardsFile, e: unknown): PreviewCardsFile {
  const error = e instanceof Error ? e.message : 'Read failed';
  return prev.status === 'ready' ? {...prev, reloadError: error} : {status: 'error', error};
}

/** The file as a new request leaves it: one that never loaded shows as loading, a read one stays without its last error. */
function requestedAgain(prev: PreviewCardsFile): PreviewCardsFile {
  if (prev.status === 'error') return {status: 'loading'};
  if (prev.status === 'ready') return {status: 'ready', cards: prev.cards, ids: prev.ids, read: prev.read};
  return prev;
}

/**
 * previewCards.json from the target branch, read once per token and again on
 * each reload(): after a save, so the next edit starts from what was committed,
 * and after a stale refusal, to load the card as it is now. Only the newest
 * request lands, and the last read stays until it does. `requested` counts the
 * requests and `read` names the one a ready file answers, so a caller can wait
 * for a read made after a given moment.
 */
export function usePreviewCardsFile(token: string): UsePreviewCardsFile {
  const [file, setFile] = useState<PreviewCardsFile>({status: 'loading'});
  const [requested, setRequested] = useState(0);

  useEffect(() => {
    let newest = true;
    readPreviewCards(token).then(
      (cards) => {
        if (newest) setFile({status: 'ready', cards, ids: new Set(cards.map((c) => c.id)), read: requested});
      },
      (e: unknown) => {
        if (newest) setFile((prev) => failedRead(prev, e));
      },
    );
    return () => {
      newest = false;
    };
  }, [token, requested]);

  function reload() {
    setRequested((n) => n + 1);
    setFile(requestedAgain);
  }

  return {...file, requested, reload};
}
