import {useEffect, useState} from 'react';
import {fetchCardSynergies} from '../../../app-bridge';
import type {CardSynergies} from './engineView';

export interface UseCardSynergiesReturn {
  data: CardSynergies | null;
  loading: boolean;
  error: Error | null;
  /**
   * Fetches the card's synergy file again (R-45). fetchCardSynergies caches
   * only what it parsed, never a rejection (usePrecomputedSynergies.ts:55, :63),
   * so after an error this goes back to the network.
   */
  retry: () => void;
}

/** How one fetch settled, with the card and the try it answers. */
interface Settled {
  cardId: string;
  attempt: number;
  data: CardSynergies | null;
  error: Error | null;
}

type Outcome = Pick<Settled, 'data' | 'error'>;

const NO_CARD: Outcome & {loading: false} = {data: null, error: null, loading: false};
const LOADING: Outcome & {loading: true} = {data: null, error: null, loading: true};

function asError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

/**
 * Loads one card's precomputed synergy file. It keeps the last settled fetch
 * with the card and try it answers, and reads as loading until that matches
 * the current ones, as the app's own hook does (stateForCard,
 * usePrecomputedSynergies.ts:190-199). So the render where the id changes, or
 * Retry is pressed, never shows the previous card's file or the old error, and
 * the effect never sets state synchronously (react-hooks/set-state-in-effect).
 * A late answer for a card or try no longer current is dropped.
 */
export function useCardSynergies(cardId: string | null): UseCardSynergiesReturn {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);
  const retry = () => setAttempt((n) => n + 1);

  useEffect(() => {
    if (cardId == null) return;
    let cancelled = false;
    const settle = (outcome: Outcome) => {
      if (!cancelled) setSettled({cardId, attempt, ...outcome});
    };
    fetchCardSynergies(cardId).then(
      (data) => settle({data, error: null}),
      (err: unknown) => settle({data: null, error: asError(err)}),
    );
    return () => {
      cancelled = true;
    };
  }, [cardId, attempt]);

  if (cardId == null) return {...NO_CARD, retry};
  if (settled?.cardId !== cardId || settled.attempt !== attempt) return {...LOADING, retry};
  return {data: settled.data, error: settled.error, loading: false, retry};
}
