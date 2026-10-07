import {PageLayout} from '../../../shell/PageLayout';
import {DataAsOf} from '../../../ui/DataAsOf';
import {useVoteLog} from '../useVoteLog';
import {ActivityView} from './ActivityView';

/**
 * Vote activity (/activity): the raw votes in vote-log.json, filterable by
 * range, pair, voter, score band and day or week. It reads the vote log alone,
 * so its loading and error states name that file; vote-analytics.json isn't
 * needed here.
 */
export function ActivityPage() {
  const {data, error} = useVoteLog();
  return (
    <PageLayout
      title="Vote activity"
      subtitle="Raw community votes, from the last 7 days to the whole log."
      meta={data ? <DataAsOf generatedAt={data.generatedAt} /> : undefined}>
      <ActivityView voteLog={data} error={error} />
    </PageLayout>
  );
}
