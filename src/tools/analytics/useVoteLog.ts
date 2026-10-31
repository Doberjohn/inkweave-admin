import {useAdminData, type UseAdminDataReturn} from './useAdminData';
import type {VoteLog} from './voteLogTypes';

export type UseVoteLogReturn = UseAdminDataReturn<VoteLog>;

/** Load the build-time vote-log artifact on mount. */
export function useVoteLog(): UseVoteLogReturn {
  return useAdminData<VoteLog>('vote-log.json');
}
