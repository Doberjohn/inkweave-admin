import {useAdminData, type UseAdminDataReturn} from './useAdminData';
import type {VercelAnalytics} from './vercelAnalyticsTypes';

export type UseVercelAnalyticsReturn = UseAdminDataReturn<VercelAnalytics>;

/** Load the build-time Vercel Web Analytics artifact on mount. */
export function useVercelAnalytics(): UseVercelAnalyticsReturn {
  return useAdminData<VercelAnalytics>('vercel-analytics.json');
}
