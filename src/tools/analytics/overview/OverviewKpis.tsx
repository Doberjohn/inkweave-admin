import type {ReactNode} from 'react';
import {SPACING} from '../../../app-bridge';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {fmtDay, fmtInt} from '../../../ui/format';
import {KpiCard} from '../../../ui/KpiCard';
import {RawTag} from '../../../ui/RawTag';
import {trackedEventsTotal} from './overviewStats';
import type {VoteAnalytics} from '../voteAnalyticsTypes';
import type {VercelAnalytics} from '../vercelAnalyticsTypes';

interface OverviewKpisProps {
  analytics: VoteAnalytics;
  vercel: VercelAnalytics | null;
  vercelError: Error | null;
}

/** Why Tracked events has no total, in a few words: never a misleading 0. */
function trackedEventsHint(vercel: VercelAnalytics | null, vercelError: Error | null): ReactNode {
  if (vercelError) return 'Vercel data could not load';
  if (!vercel) return 'Loading Vercel data...';
  if (!vercel.hasVercelData) {
    // The secret names are long; let them break inside the narrow card.
    return (
      <span style={{overflowWrap: 'anywhere'}}>
        Needs <code>VERCEL_ANALYTICS_TOKEN</code> and <code>ANALYTICS_VERCEL_PROJECT_ID</code>
      </span>
    );
  }
  return 'No events tracked yet';
}

/**
 * The Overview's headline numbers. Distinct voters needs the raw vote log, so
 * it shows only with raw votes. The Total votes hint is the newest weekly
 * point: the votes cast since that week's Monday, which is every vote since
 * then, because no later week has any. It says "since", not "last week",
 * because that week is usually still running. Tracked events comes from the
 * Vercel artifact and reads "—" with the reason whenever there's no total.
 */
export function OverviewKpis({analytics, vercel, vercelError}: OverviewKpisProps) {
  const g = analytics.global;
  const lastWeek = g.weekly.length > 0 ? g.weekly[g.weekly.length - 1] : null;
  const tracked = trackedEventsTotal(vercel);
  return (
    <section
      aria-label="Key figures"
      style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: SPACING.md}}>
      <KpiCard
        label="Total votes"
        value={fmtInt(g.totalVotes)}
        hint={lastWeek ? `+${fmtInt(lastWeek.votes)} since ${fmtDay(lastWeek.week)}` : undefined}
      />
      <KpiCard label="Pairs covered" value={fmtInt(g.distinctPairs)} hint="distinct card pairs" />
      {analytics.hasRawVotes && g.distinctVoters != null && (
        <KpiCard label="Distinct voters" value={fmtInt(g.distinctVoters)} hint="from raw vote log" tag={<RawTag />} />
      )}
      <KpiCard
        label="Engine-silent pairs"
        value={fmtInt(g.engineSilentPairs)}
        hint="voted, no synergy"
        valueColor={ADMIN_COLORS.accent}
      />
      <KpiCard
        label="Tracked events"
        value={tracked ? fmtInt(tracked.total) : '—'}
        hint={tracked ? `${fmtInt(tracked.eventTypes)} event types · Vercel` : trackedEventsHint(vercel, vercelError)}
      />
    </section>
  );
}
