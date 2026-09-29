import {useEffect, useState} from 'react';
import {fetchAdminData} from './adminData';
import type {VoteAnalytics} from './voteAnalyticsTypes';

export interface UseVoteAnalyticsReturn {
  data: VoteAnalytics | null;
  loading: boolean;
  error: Error | null;
}

/** Fetch the build-time vote-analytics artifact once on mount. */
export function useVoteAnalytics(): UseVoteAnalyticsReturn {
  const [data, setData] = useState<VoteAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminData<VoteAnalytics>('vote-analytics.json')
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
