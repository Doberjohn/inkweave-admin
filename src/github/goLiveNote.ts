import {targetBranch} from './githubCommit';

/**
 * What happens after a commit: `onMaster` when the tools target master, where
 * the app's deploy (and its image conversion) runs. A rehearsal branch never
 * reaches production, so its note says that instead.
 */
export function goLiveNote(onMaster: string): string {
  const branch = targetBranch();
  return branch === 'master' ? onMaster : `It went to ${branch}; only master deploys to production.`;
}
