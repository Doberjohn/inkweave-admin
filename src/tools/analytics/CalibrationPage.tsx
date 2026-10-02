import {useSearchParams} from 'react-router-dom';
import {PageLayout} from '../../shell/PageLayout';
import {fmtGap, fmtInt} from '../../ui/format';
import {Notice} from '../../ui/Notice';
import {CalibrationView} from './CalibrationView';
import {useVoteAnalytics} from './useVoteAnalytics';
import {useVoteLog} from './useVoteLog';
import {verdictFor} from './verdict';
import type {VoteAnalytics} from './voteAnalyticsTypes';
import type {VoteLog} from './voteLogTypes';

/** Rendered while the vote log is still loading (or failed), so CalibrationView always receives a VoteLog. */
const EMPTY_VOTE_LOG: VoteLog = {generatedAt: '', votes: [], voterCount: 0};

/** "Data as of 2026-09-30": the day admin's Deploy workflow built the analytics. */
function DataAsOf({generatedAt}: {generatedAt: string}) {
  return (
    <>
      Data as of <code>{generatedAt.slice(0, 10)}</code>
    </>
  );
}

/** The header summary, e.g. "Mean gap −0.30 · well-calibrated · 2,054 votes". */
function summaryLine({global: g}: VoteAnalytics): string {
  return `Mean gap ${fmtGap(g.meanGap)} · ${verdictFor(g.meanGap).word} · ${fmtInt(g.totalVotes)} votes`;
}

/** Loading and error states, in the order the page meets them. */
interface LoadState {
  loading: boolean;
  error: Error | null;
}

/** The analytics' own loading and error notices. */
function AnalyticsNotices({loading, error}: LoadState) {
  if (loading) return <Notice>Loading analytics...</Notice>;
  if (!error) return null;
  return <Notice tone="error">Could not load vote analytics. Has the artifact been generated? ({error.message})</Notice>;
}

/**
 * The raw votes' notices. They matter only when the analytics say there are
 * some: without them every pair's vote table is empty anyway. Until they
 * arrive, or if they fail, a selected pair shows no votes, so say why.
 */
function RawVoteNotices({loading, error}: LoadState) {
  if (loading) return <Notice>Loading the raw votes...</Notice>;
  if (!error) return null;
  return (
    <Notice tone="error">Could not load the raw votes, so a pair&apos;s votes won&apos;t show ({error.message}).</Notice>
  );
}

/**
 * Calibration & tuning (/calibration). In R1 it hosts today's CalibrationView
 * under the shared page header and writes nothing, so it has no token gate and
 * no branch notice; R2 adds the tuning aside and both with it (R-4).
 * `?rule=<ruleId>`, which the Overview's Tune links carry, opens the page with
 * that rule selected.
 */
export function CalibrationPage() {
  const {data: analytics, loading, error} = useVoteAnalytics();
  const voteLog = useVoteLog();
  const [searchParams] = useSearchParams();
  const ruleId = searchParams.get('rule');

  return (
    <PageLayout
      title="Calibration & tuning"
      subtitle={analytics ? summaryLine(analytics) : undefined}
      meta={analytics ? <DataAsOf generatedAt={analytics.generatedAt} /> : undefined}>
      <AnalyticsNotices loading={loading} error={error} />
      {analytics?.hasRawVotes && <RawVoteNotices loading={voteLog.loading} error={voteLog.error} />}
      {analytics && (
        // The key remounts the view when ?rule= changes, so the selection follows
        // the URL: a Tune link sets the rule, the sidebar link clears it.
        <CalibrationView
          key={ruleId ?? ''}
          analytics={analytics}
          voteLog={voteLog.data ?? EMPTY_VOTE_LOG}
          initialRuleId={ruleId}
        />
      )}
    </PageLayout>
  );
}
