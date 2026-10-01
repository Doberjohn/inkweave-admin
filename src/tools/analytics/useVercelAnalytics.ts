import {useEffect, useState} from 'react';
import {cachedAdminData, fetchAdminData} from './adminData';
import type {VercelAnalytics} from './vercelAnalyticsTypes';

export interface UseVercelAnalyticsReturn {
  data: VercelAnalytics | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Load the build-time Vercel Web Analytics artifact on mount. fetchAdminData shares
 * one successful fetch per file for the session, so a mount after it starts with
 * the data instead of a loading render.
 */
export function useVercelAnalytics(): UseVercelAnalyticsReturn {
  const [data, setData] = useState<VercelAnalytics | null>(
    () => cachedAdminData<VercelAnalytics>('vercel-analytics.json') ?? null,
  );
  const [loading, setLoading] = useState(() => cachedAdminData('vercel-analytics.json') === undefined);
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
