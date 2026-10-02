import {useEffect, useState} from 'react';
import {cachedAdminData, fetchAdminData} from './adminData';
import type {VoteAnalytics} from './voteAnalyticsTypes';

export interface UseVoteAnalyticsReturn {
  data: VoteAnalytics | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Load the build-time vote-analytics artifact on mount. fetchAdminData shares one
 * successful fetch per file for the session, so a mount after it starts with the
 * data instead of a loading render.
 */
export function useVoteAnalytics(): UseVoteAnalyticsReturn {
  const [data, setData] = useState<VoteAnalytics | null>(() => cachedAdminData<VoteAnalytics>('vote-analytics.json') ?? null);
  const [loading, setLoading] = useState(() => cachedAdminData('vote-analytics.json') === undefined);
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
