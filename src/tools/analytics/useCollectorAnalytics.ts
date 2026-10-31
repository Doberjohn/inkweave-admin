import type {CollectorAnalytics} from './collectorAnalyticsTypes';
import {useAdminData, type UseAdminDataReturn} from './useAdminData';

/** Load collector-analytics.json, the Collectors page's and the Overview card's counts. */
export function useCollectorAnalytics(): UseAdminDataReturn<CollectorAnalytics> {
  return useAdminData<CollectorAnalytics>('collector-analytics.json');
}
