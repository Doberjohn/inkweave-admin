import {useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction} from 'react';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {readTuning} from './githubClient';

export type LiveTuning =
  | {status: 'loading'}
  // reloadError: the last reload failed, and `config` is the last read that landed (C1).
  | {status: 'ready'; config: TuningConfig; reloadError?: string}
  // No read has landed yet.
  | {status: 'error'; error: string};

/** What useLiveTuning gives: the read's state, and a reload that resolves with what it put on screen. */
export type UseLiveTuningResult = LiveTuning & {reload: () => Promise<TuningConfig | null>};

/**
 * Starts a read of tuning.json. `newest` numbers the reads, and only the newest
 * one sets the state, so a slow read never lands over a newer one. Resolves
 * with the config once it is set, or with null when the read failed (the state
 * then says why) or a newer read replaced it. A failed reload keeps the values
 * already read, so what they hold up (a publish's commit link, the pending
 * edits) stays on screen beside the error.
 */
function startRead(
  token: string,
  newest: RefObject<number>,
  setState: Dispatch<SetStateAction<LiveTuning>>,
): Promise<TuningConfig | null> {
  const read = ++newest.current;
  return readTuning(token).then(
    (config) => {
      if (read !== newest.current) return null;
      setState({status: 'ready', config});
      return config;
    },
    (e: unknown) => {
      if (read !== newest.current) return null;
      const error = e instanceof Error ? e.message : 'Read failed';
      setState((prev) =>
        prev.status === 'ready' ? {status: 'ready', config: prev.config, reloadError: error} : {status: 'error', error},
      );
      return null;
    },
  );
}

/**
 * Reads tuning.json from the target branch, once per token and again on each
 * `reload()`: after a publish, so the next edits start from what was
 * published, and after a stale-value refusal, so the pending edits can be
 * checked against the file as it is now (R-18). A reload keeps the current
 * values on screen until the new ones arrive, and after a failed reload too.
 */
export function useLiveTuning(token: string): UseLiveTuningResult {
  const [state, setState] = useState<LiveTuning>({status: 'loading'});
  const newest = useRef(0);

  useEffect(() => {
    void startRead(token, newest, setState);
  }, [token]);

  return {...state, reload: () => startRead(token, newest, setState)};
}
