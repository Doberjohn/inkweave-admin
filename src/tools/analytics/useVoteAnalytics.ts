import {useAdminData, type UseAdminDataReturn} from './useAdminData';
import type {VoteAnalytics} from './voteAnalyticsTypes';

export type UseVoteAnalyticsReturn = UseAdminDataReturn<VoteAnalytics>;

/** Load the build-time vote-analytics artifact on mount. */
export function useVoteAnalytics(): UseVoteAnalyticsReturn {
  return useAdminData<VoteAnalytics>('vote-analytics.json');
}
