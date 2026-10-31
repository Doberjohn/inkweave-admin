import {useEffect, useState} from 'react';
import {cachedAdminData, fetchAdminData} from './adminData';

export interface UseAdminDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Load one build-time admin-data artifact on mount. fetchAdminData shares one
 * successful fetch per file for the session, so a mount after it starts with the
 * data instead of a loading render.
 */
export function useAdminData<T>(file: string): UseAdminDataReturn<T> {
  const [data, setData] = useState<T | null>(() => cachedAdminData<T>(file) ?? null);
  const [loading, setLoading] = useState(() => cachedAdminData(file) === undefined);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminData<T>(file)
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
  }, [file]);

  return {data, loading, error};
}
