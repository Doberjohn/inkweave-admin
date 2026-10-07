import {PageLayout} from '../../../shell/PageLayout';
import {DataAsOf} from '../../../ui/DataAsOf';
import {useVercelAnalytics} from '../useVercelAnalytics';
import {WebAnalyticsBody} from './WebAnalyticsBody';

/**
 * The Web analytics route (/web): Vercel custom events from inkweave.ink. It
 * reads only vercel-analytics.json (cached for the session by fetchAdminData),
 * so it loads, fails and dates itself independently of the vote artifacts.
 */
export function WebAnalyticsPage() {
  const {data, error} = useVercelAnalytics();
  return (
    <PageLayout
      title="Web analytics"
      subtitle="Vercel custom events from inkweave.ink"
      meta={data ? <DataAsOf generatedAt={data.generatedAt} /> : undefined}>
      <WebAnalyticsBody analytics={data} error={error} />
    </PageLayout>
  );
}
