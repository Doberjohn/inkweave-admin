import {useEffect, useState} from 'react';
import {readRepoBlob} from '../../github/githubHistory';
import {readError} from '../studio/previewCardsFile';
import {commitDetails, type CommitDetails, type ScanFile} from './commitDetails';

/**
 * Where an open change's details come from: the app repo through the token on the page,
 * and canned answers in a story or a test.
 */
export interface ChangeSource {
  /** What the commit changed (commitDetails). */
  details: (sha: string) => Promise<CommitDetails>;
  /** A scan's bytes, as the commit that added it holds them. */
  scan: (scan: ScanFile) => Promise<Blob>;
}

/** The app repo, read with `token`. */
export function githubSource(token: string): ChangeSource {
  return {
    details: (sha) => commitDetails({token, sha}),
    scan: ({path, sha}) => readRepoBlob({token, path, ref: sha}),
  };
}

/** An open change's details: being read, read, or failed, with why. */
export type DetailsState = {status: 'loading'} | {status: 'ready'; details: CommitDetails} | {status: 'error'; error: string};

/** Reads an open change's details, again on each retry (a failed read leaves commitDetails' cache). */
export function useDetails(source: ChangeSource, sha: string): {state: DetailsState; retry: () => void} {
  const [state, setState] = useState<DetailsState>({status: 'loading'});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    source.details(sha).then(
      (details) => {
        if (!cancelled) setState({status: 'ready', details});
      },
      (e: unknown) => {
        if (!cancelled) setState({status: 'error', error: readError(e)});
      },
    );
    return () => {
      cancelled = true;
    };
  }, [source, sha, attempt]);

  const retry = () => {
    setState({status: 'loading'});
    setAttempt((n) => n + 1);
  };
  return {state, retry};
}

/** A scan as an image's source: an object URL while it is shown, revoked when it goes. */
export type ScanState = {status: 'loading'} | {status: 'ready'; url: string} | {status: 'error'};

/** Reads a scan's bytes once, for as long as it is shown. */
export function useScanUrl(source: ChangeSource, {path, cardId, sha}: ScanFile): ScanState {
  const [state, setState] = useState<ScanState>({status: 'loading'});

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    source.scan({path, cardId, sha}).then(
      (blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setState({status: 'ready', url});
      },
      () => {
        if (!cancelled) setState({status: 'error'});
      },
    );
    return () => {
      cancelled = true;
      if (url !== null) URL.revokeObjectURL(url);
    };
  }, [source, path, cardId, sha]);

  return state;
}
