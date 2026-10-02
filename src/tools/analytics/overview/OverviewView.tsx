import {SPACING} from '../../../app-bridge';
import {Notice} from '../../../ui/Notice';
import {latestVoteDay} from '../activityStats';
import {CalibrationCard} from './CalibrationCard';
import {LatestVotesCard} from './LatestVotesCard';
import {OverviewKpis} from './OverviewKpis';
import {RulesToReviewCard} from './RulesToReviewCard';
import {WebEventsCard} from './WebEventsCard';
import {WeeklyCard} from './WeeklyCard';
import type {VoteAnalytics} from '../voteAnalyticsTypes';
import type {VoteLog} from '../voteLogTypes';
import type {VercelAnalytics} from '../vercelAnalyticsTypes';

export interface OverviewViewProps {
  /** vote-analytics.json, or null while it loads or after it failed. */
  analytics: VoteAnalytics | null;
  analyticsState: {loading: boolean; error: Error | null};
  /** vote-log.json, or null while it loads or after it failed. */
  voteLog: VoteLog | null;
  voteLogError?: Error | null;
  /** vercel-analytics.json, or null while it loads or after it failed. */
  vercel: VercelAnalytics | null;
  vercelError: Error | null;
}

/** Two cards side by side from 780px of content width, stacked below. */
const TWO_UP = 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))';
/** Three cards side by side from 880px of content width. */
const THREE_UP = 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))';

/** Why the vote-analytics cards are missing: the artifact is loading, or it could not be read. */
function AnalyticsNotice({loading, error}: OverviewViewProps['analyticsState']) {
  if (error) {
    return <Notice tone="error">Could not load vote analytics. Has the artifact been generated? ({error.message})</Notice>;
  }
  return loading ? <Notice>Loading analytics...</Notice> : null;
}

/**
 * The Overview's body. Each card reads its own artifact and shows that
 * artifact's states, so a missing vote-analytics.json hides only the cards
 * built from it (KPIs, calibration, weekly, rules), not Latest votes or Web
 * events. Purely presentational: OverviewPage fetches.
 */
export function OverviewView({analytics, analyticsState, voteLog, voteLogError = null, vercel, vercelError}: OverviewViewProps) {
  return (
    // A grid, not a column flexbox: panels with overflow:hidden collapse in one.
    <div style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: SPACING.xxl}}>
      {analytics ? (
        <>
          <OverviewKpis analytics={analytics} vercel={vercel} vercelError={vercelError} />
          <div style={{display: 'grid', gridTemplateColumns: TWO_UP, gap: SPACING.xl}}>
            <CalibrationCard meanGap={analytics.global.meanGap} accuracySentiment={analytics.global.accuracySentiment} />
            <WeeklyCard
              weekly={analytics.global.weekly}
              hasRawVotes={analytics.hasRawVotes}
              latestDay={voteLog ? latestVoteDay(voteLog.votes) : undefined}
            />
          </div>
        </>
      ) : (
        <AnalyticsNotice loading={analyticsState.loading} error={analyticsState.error} />
      )}
      <div style={{display: 'grid', gridTemplateColumns: THREE_UP, gap: SPACING.xl}}>
        {analytics && <RulesToReviewCard rules={analytics.rules} />}
        <LatestVotesCard voteLog={voteLog} error={voteLogError} />
        <WebEventsCard vercel={vercel} error={vercelError} />
      </div>
    </div>
  );
}
