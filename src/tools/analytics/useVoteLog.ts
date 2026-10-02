import {useEffect, useState} from 'react';
import {cachedAdminData, fetchAdminData} from './adminData';
import type {VoteLog} from './voteLogTypes';

export interface UseVoteLogReturn {
  data: VoteLog | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Load the build-time vote-log artifact on mount. fetchAdminData shares one
 * successful fetch per file for the session, so a mount after it starts with the
 * data instead of a loading render.
 */
export function useVoteLog(): UseVoteLogReturn {
  const [data, setData] = useState<VoteLog | null>(() => cachedAdminData<VoteLog>('vote-log.json') ?? null);
  const [loading, setLoading] = useState(() => cachedAdminData('vote-log.json') === undefined);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminData<VoteLog>('vote-log.json')
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {data, loading, error};
}
