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

/** The header summary, e.g. "Mean gap −0.30 · well-calibrated · 2,054 votes". */
function summaryLine({global: g}: VoteAnalytics): string {
  return `Mean gap ${fmtGap(g.meanGap)} · ${verdictFor(g.meanGap).word} · ${fmtInt(g.totalVotes)} votes`;
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
  const {data: voteLog, loading: voteLogLoading, error: voteLogError} = useVoteLog();
  const [searchParams] = useSearchParams();
  const ruleId = searchParams.get('rule');

  return (
    <PageLayout
      title="Calibration & tuning"
      subtitle={analytics ? summaryLine(analytics) : undefined}
      meta={
        analytics ? (
          <>
            Data as of <code>{analytics.generatedAt.slice(0, 10)}</code>
          </>
        ) : undefined
      }>
      {loading && <Notice>Loading analytics...</Notice>}
      {error && (
        <Notice tone="error">
          Could not load vote analytics. Has the artifact been generated? ({error.message})
        </Notice>
      )}
      {/* The raw votes matter only when the analytics say there are some: without
          them every pair's vote table is empty anyway. Until they arrive, or if
          they fail, a selected pair shows no votes, so say why. */}
      {analytics?.hasRawVotes && voteLogLoading && <Notice>Loading the raw votes...</Notice>}
      {analytics?.hasRawVotes && voteLogError && (
        <Notice tone="error">
          Could not load the raw votes, so a pair&apos;s votes won&apos;t show ({voteLogError.message}).
        </Notice>
      )}
      {analytics && (
        // The key remounts the view when ?rule= changes, so the selection follows
        // the URL: a Tune link sets the rule, the sidebar link clears it.
        <CalibrationView
          key={ruleId ?? ''}
          analytics={analytics}
          voteLog={voteLog ?? EMPTY_VOTE_LOG}
          initialRuleId={ruleId}
        />
      )}
    </PageLayout>
  );
}
