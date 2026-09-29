import {useEffect, useState} from 'react';
import {fetchAdminData} from './adminData';
import type {VoteLog} from './voteLogTypes';

export interface UseVoteLogReturn {
  data: VoteLog | null;
  loading: boolean;
  error: Error | null;
}

/** Fetch the build-time vote-log artifact once on mount. */
export function useVoteLog(): UseVoteLogReturn {
  const [data, setData] = useState<VoteLog | null>(null);
  const [loading, setLoading] = useState(true);
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
