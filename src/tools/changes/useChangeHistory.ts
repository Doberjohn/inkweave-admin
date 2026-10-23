import {useEffect, useState} from 'react';
import {listPathCommits} from '../../github/githubHistory';
import {readError} from '../studio/previewCardsFile';
import {TRACKED_PATHS} from './changePaths';
import {emptyStream, withPage, type PathStream} from './historyModel';

/** Reading older pages: not asked for, under way, or failed, with why. */
export type OlderRead = {status: 'idle'} | {status: 'loading'} | {status: 'error'; error: string};

/** The history as the page holds it: its first read under way or failed, or the paths read so far. */
export type HistoryState =
  | {status: 'loading'}
  | {status: 'error'; error: string}
  | {status: 'ready'; streams: readonly PathStream[]; older: OlderRead};

/** What useChangeHistory gives: the state, and the two reads the page can ask for. */
export interface ChangeHistory {
  state: HistoryState;
  /** Reads each path's next page. Does nothing until the first read lands, or while one runs. */
  loadOlder: () => void;
  /** Reads the history again from its newest page: the first read's Retry. */
  retry: () => void;
}

const IDLE: OlderRead = {status: 'idle'};

/** Each path's next page, read together. A path read to its start stays as it is. */
function readNextPages(token: string, streams: readonly PathStream[]): Promise<PathStream[]> {
  return Promise.all(
    streams.map((stream) =>
      stream.done
        ? stream
        : listPathCommits({token, path: stream.path, page: stream.pages + 1}).then((page) => withPage(stream, page)),
    ),
  );
}

/** Whether the list on screen is still the one an older read started from: a retry replaces it. */
function sameList(prev: HistoryState, streams: readonly PathStream[]): boolean {
  return prev.status === 'ready' && prev.streams === streams;
}

/**
 * The change history of the target branch: every followed path's newest page on mount,
 * and its next page on each loadOlder(). The list is read afresh each time the page
 * mounts, so a change made in Card studio a moment ago is in it. The page is keyed by
 * the token, so a new token reads afresh too.
 */
export function useChangeHistory(token: string): ChangeHistory {
  const [state, setState] = useState<HistoryState>({status: 'loading'});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    readNextPages(token, TRACKED_PATHS.map(emptyStream)).then(
      (streams) => {
        if (!cancelled) setState({status: 'ready', streams, older: IDLE});
      },
      (e: unknown) => {
        if (!cancelled) setState({status: 'error', error: readError(e)});
      },
    );
    return () => {
      cancelled = true;
    };
  }, [token, attempt]);

  const loadOlder = () => {
    if (state.status !== 'ready' || state.older.status === 'loading') return;
    const {streams} = state;
    setState({status: 'ready', streams, older: {status: 'loading'}});
    readNextPages(token, streams).then(
      (next) => setState((prev) => (sameList(prev, streams) ? {status: 'ready', streams: next, older: IDLE} : prev)),
      (e: unknown) =>
        setState((prev) =>
          sameList(prev, streams) ? {status: 'ready', streams, older: {status: 'error', error: readError(e)}} : prev,
        ),
    );
  };

  const retry = () => {
    setState({status: 'loading'});
    setAttempt((n) => n + 1);
  };

  return {state, loadOlder, retry};
}
