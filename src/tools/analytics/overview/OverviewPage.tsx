import {PageLayout} from '../../../shell/PageLayout';
import {DataAsOf} from '../../../ui/DataAsOf';
import {useCollectorAnalytics} from '../useCollectorAnalytics';
import {useVercelAnalytics} from '../useVercelAnalytics';
import {useVoteAnalytics} from '../useVoteAnalytics';
import {useVoteLog} from '../useVoteLog';
import {OverviewView} from './OverviewView';

/**
 * Admin's home at /: engine calibration, community activity and traffic at a
 * glance. It reads all four admin-data artifacts (cached for the session in
 * adminData.ts) and hands them to OverviewView with their states. "Data as of"
 * is vote-analytics.json's build date, as on the old analytics page.
 */
export function OverviewPage() {
  const {data: analytics, loading, error} = useVoteAnalytics();
  const {data: voteLog, error: voteLogError} = useVoteLog();
  const {data: vercel, error: vercelError} = useVercelAnalytics();
  const {data: collectors, error: collectorsError} = useCollectorAnalytics();

  const meta = analytics ? <DataAsOf generatedAt={analytics.generatedAt} /> : undefined;

  return (
    <PageLayout title="Overview" subtitle="Engine calibration, community activity and traffic in one place." meta={meta}>
      <OverviewView
        analytics={analytics}
        analyticsState={{loading, error}}
        voteLog={voteLog}
        voteLogError={voteLogError}
        vercel={vercel}
        vercelError={vercelError}
        collectors={collectors}
        collectorsError={collectorsError}
      />
    </PageLayout>
  );
}
