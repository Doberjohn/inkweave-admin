import {PageLayout} from '../../../shell/PageLayout';
import {DataAsOf} from '../../../ui/DataAsOf';
import {useCollectorAnalytics} from '../useCollectorAnalytics';
import {CollectorsView} from './CollectorsView';

/**
 * The Collectors route (/collectors): who comes back to their collection, from
 * collector-analytics.json alone, so it loads, fails and dates itself apart from
 * the vote and Vercel artifacts.
 */
export function CollectorsPage() {
  const {data, error} = useCollectorAnalytics();
  return (
    <PageLayout
      title="Collectors"
      subtitle="Who comes back to their collection, from each account's first and latest save."
      meta={data ? <DataAsOf generatedAt={data.generatedAt} /> : undefined}>
      <CollectorsView analytics={data} error={error} />
    </PageLayout>
  );
}
