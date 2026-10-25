import {useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction} from 'react';

/** The featured list inkweave.ink serves, as precompute writes it: the cards, ids as numbers. */
const DEPLOYED_PATH = '/data/featuredCards.json';

export type DeployedFeatured =
  | {status: 'loading'}
  | {status: 'ready'; ids: string[]}
  | {status: 'error'; error: string};

export type UseDeployedFeaturedResult = DeployedFeatured & {
  /** Reads the served file again (Check again). */
  check: () => void;
};

/** The card ids a served featuredCards.json holds, as strings; an error for a file of another shape. */
function servedIds(data: unknown): string[] {
  const cards = (data as {cards?: unknown} | null)?.cards;
  if (!Array.isArray(cards)) throw new Error(`${DEPLOYED_PATH} has no card list`);
  const ids = cards.map((card: {id?: unknown} | null) => card?.id);
  if (ids.some((id) => typeof id !== 'number' && typeof id !== 'string')) throw new Error(`${DEPLOYED_PATH} lists a card with no id`);
  return ids.map(String);
}

/** The served file's ids, or an error for a failed read or a file of another shape. */
async function readServed(): Promise<string[]> {
  const response = await fetch(DEPLOYED_PATH, {cache: 'no-store'});
  if (!response.ok) throw new Error(`inkweave.ink answered ${response.status} for ${DEPLOYED_PATH}`);
  // A path the server lacks answers 200 with the app's HTML page, as adminData.ts finds.
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error(`${DEPLOYED_PATH} isn’t JSON here`);
  return servedIds(await response.json());
}

/** Reads the served file, past every cache. Only the newest read sets the state. */
function startCheck(newest: RefObject<number>, setState: Dispatch<SetStateAction<DeployedFeatured>>): void {
  const read = ++newest.current;
  readServed().then(
    (ids) => {
      if (read === newest.current) setState({status: 'ready', ids});
    },
    (e: unknown) => {
      if (read === newest.current) setState({status: 'error', error: e instanceof Error ? e.message : 'Read failed'});
    },
  );
}

/**
 * The six cards inkweave.ink's homepage shows now: the ids of the forwarded
 * /data/featuredCards.json, which the app's deploy writes from
 * featuredCardIds.json. Read once on mount and again on check(). The page only
 * reports it, so a failed read never blocks editing.
 */
export function useDeployedFeatured(): UseDeployedFeaturedResult {
  const [state, setState] = useState<DeployedFeatured>({status: 'loading'});
  const newest = useRef(0);

  useEffect(() => {
    startCheck(newest, setState);
  }, []);

  return {
    ...state,
    check: () => {
      setState({status: 'loading'});
      startCheck(newest, setState);
    },
  };
}
