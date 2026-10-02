import {PageLayout} from '../../../shell/PageLayout';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {useVoteLog} from '../useVoteLog';
import {ActivityView} from './ActivityView';

/** "Data as of 2026-10-01": the day admin's Deploy workflow built the vote log. */
function DataAsOf({generatedAt}: {generatedAt: string}) {
  return (
    <span style={{fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>
      Data as of <code>{generatedAt.slice(0, 10)}</code>
    </span>
  );
}

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
