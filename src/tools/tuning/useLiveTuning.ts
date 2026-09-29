import {useEffect, useState} from 'react';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {readTuning} from './githubClient';

export type LiveTuning =
  | {status: 'loading'}
  | {status: 'ready'; config: TuningConfig}
  | {status: 'error'; error: string};

/**
 * Reads tuning.json from the target branch, once per token and again on each
 * `reload()` (after a publish, so the next edits start from what was
 * published). A reload keeps the current values on screen until the new ones
 * arrive.
 */
export function useLiveTuning(token: string): LiveTuning & {reload: () => void} {
  const [state, setState] = useState<LiveTuning>({status: 'loading'});
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    readTuning(token).then(
      (config) => {
        if (!cancelled) setState({status: 'ready', config});
      },
      (e: unknown) => {
        if (!cancelled) setState({status: 'error', error: e instanceof Error ? e.message : 'Read failed'});
      },
    );
    return () => {
      cancelled = true;
    };
  }, [token, version]);

  return {...state, reload: () => setVersion((v) => v + 1)};
}
