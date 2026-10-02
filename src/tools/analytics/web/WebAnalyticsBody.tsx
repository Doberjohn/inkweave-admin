import {useState} from 'react';
import {SPACING} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtDay, fmtInt} from '../../../ui/format';
import {Notice} from '../../../ui/Notice';
import type {VercelAnalytics} from '../vercelAnalyticsTypes';
import {BreakdownCards} from './BreakdownCards';
import {EventCards} from './EventCards';
import {TrendCard} from './TrendCard';
import {fillTrendDays, sortEventsByTotal} from './webModel';

/** Shown when the artifact reports hasVercelData: false (no token or project at build time). */
function NoVercelDataNotice() {
  return (
    <Notice>
      Web Analytics needs a Vercel access token when admin&apos;s Deploy workflow generates this data. Set the{' '}
      <code style={{color: ADMIN_COLORS.accent}}>VERCEL_ANALYTICS_TOKEN</code> and{' '}
      <code style={{color: ADMIN_COLORS.accent}}>ANALYTICS_VERCEL_PROJECT_ID</code> (the app&apos;s project) Actions
      secrets, then re-run the Deploy workflow to populate this page.
    </Notice>
  );
}

interface WebAnalyticsBodyProps {
  analytics: VercelAnalytics | null;
  /** Why the artifact could not be fetched (e.g. not generated yet); takes precedence over loading. */
  error?: Error | null;
}

/**
 * The Web analytics page body: the all-time summary, one card per event, then
 * the selected event's trend and breakdowns, with the busiest event selected
 * first. Data arrives through props, so Storybook renders it from fixtures;
 * `null` with no `error` means the artifact is still loading. Every state
 * comes from vercel-analytics.json alone, never from the vote artifacts.
 */
export function WebAnalyticsBody({analytics, error}: WebAnalyticsBodyProps) {
  const [selectedName, setSelectedName] = useState<string | null>(null);

  if (error) return <Notice tone="error">Could not load Web Analytics ({error.message}).</Notice>;
  if (!analytics) return <Notice>Loading Web Analytics...</Notice>;
  if (!analytics.hasVercelData) return <NoVercelDataNotice />;

  const {reportingWindow} = analytics;
  // Every day of the window, idle ones as 0, before the sparklines, the chart,
  // its table and the daily average read a trend.
  const events = sortEventsByTotal(analytics.events).map((event) => ({
    ...event,
    trend: fillTrendDays(event.trend, reportingWindow),
  }));
  if (events.length === 0) return <Notice>No events tracked yet.</Notice>;

  const selected = events.find((event) => event.name === selectedName) ?? events[0];
  const total = events.reduce((sum, event) => sum + event.total, 0);
  const eventTypes = `${events.length} event ${events.length === 1 ? 'type' : 'types'}`;

  return (
    <div style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: SPACING.xl}}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: SPACING.md,
        }}>
        <p style={{margin: 0, fontSize: ADMIN_TYPE.body, color: ADMIN_COLORS.muted}}>
          <b style={{color: ADMIN_COLORS.text}}>{fmtInt(total)}</b> events tracked across {eventTypes} · all-time
        </p>
        {reportingWindow && (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: SPACING.sm,
              minHeight: 30,
              padding: `0 ${SPACING.md}px`,
              border: `1px solid ${ADMIN_COLORS.inputBorder}`,
              borderRadius: ADMIN_RADIUS.pill,
              fontSize: ADMIN_TYPE.small,
              color: ADMIN_COLORS.muted,
            }}>
            Trends &amp; breakdowns{' '}
            <b style={{color: ADMIN_COLORS.text, fontWeight: 600}}>
              {fmtDay(reportingWindow.since)} – {fmtDay(reportingWindow.until)}
            </b>
          </span>
        )}
      </div>
      <EventCards events={events} selectedName={selected.name} onSelect={setSelectedName} />
      <TrendCard event={selected} />
      <BreakdownCards breakdowns={selected.breakdowns} />
    </div>
  );
}
