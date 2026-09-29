import {useEffect, useState} from 'react';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {readTuning} from './githubClient';

export type LiveTuning =
  | {status: 'loading'}
  | {status: 'ready'; config: TuningConfig}
  | {status: 'error'; error: string};

/** Reads tuning.json from the target branch once per token. */
export function useLiveTuning(token: string): LiveTuning {
  const [state, setState] = useState<LiveTuning>({status: 'loading'});

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
  }, [token]);

  return state;
}
