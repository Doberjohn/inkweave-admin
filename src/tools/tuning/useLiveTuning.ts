import {useEffect, useRef, useState, type RefObject} from 'react';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {readTuning} from './githubClient';

export type LiveTuning =
  | {status: 'loading'}
  | {status: 'ready'; config: TuningConfig}
  | {status: 'error'; error: string};

/** What useLiveTuning gives: the read's state, and a reload that resolves with what it put on screen. */
export type UseLiveTuningResult = LiveTuning & {reload: () => Promise<TuningConfig | null>};

/**
 * Starts a read of tuning.json. `newest` numbers the reads, and only the newest
 * one sets the state, so a slow read never lands over a newer one. Resolves
 * with the config once it is on screen, or with null when the read failed (the
 * state then says why) or a newer read replaced it.
 */
function startRead(
  token: string,
  newest: RefObject<number>,
  setState: (state: LiveTuning) => void,
): Promise<TuningConfig | null> {
  const read = ++newest.current;
  return readTuning(token).then(
    (config) => {
      if (read !== newest.current) return null;
      setState({status: 'ready', config});
      return config;
    },
    (e: unknown) => {
      if (read === newest.current) setState({status: 'error', error: e instanceof Error ? e.message : 'Read failed'});
      return null;
    },
  );
}

/**
 * Reads tuning.json from the target branch, once per token and again on each
 * `reload()`: after a publish, so the next edits start from what was
 * published, and after a stale-value refusal, so the pending edits can be
 * checked against the file as it is now (R-18). A reload keeps the current
 * values on screen until the new ones arrive.
 */
export function useLiveTuning(token: string): UseLiveTuningResult {
  const [state, setState] = useState<LiveTuning>({status: 'loading'});
  const newest = useRef(0);

  useEffect(() => {
    void startRead(token, newest, setState);
  }, [token]);

  return {...state, reload: () => startRead(token, newest, setState)};
}
