import {useEffect, useState} from 'react';
import {fetchAdminData} from './adminData';
import type {VercelAnalytics} from './vercelAnalyticsTypes';

export interface UseVercelAnalyticsReturn {
  data: VercelAnalytics | null;
  loading: boolean;
  error: Error | null;
}

/** Fetch the build-time Vercel Web Analytics artifact once on mount. */
export function useVercelAnalytics(): UseVercelAnalyticsReturn {
  const [data, setData] = useState<VercelAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminData<VercelAnalytics>('vercel-analytics.json')
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
