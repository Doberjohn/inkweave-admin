import {useState} from 'react';
import {Notice, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtDay, fmtInt} from '../../../ui/format';
import type {ReportingWindow, VercelAnalytics, VercelEvent} from '../vercelAnalyticsTypes';
import {BreakdownCards} from './BreakdownCards';
import {EventCards} from './EventCards';
import {TrendCard} from './TrendCard';
import {fillTrendDays, groupEvents, sortEventsByTotal, type EventGroupSection} from './webModel';

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

/**
 * The events the last run couldn't read from Vercel, by name: the file has no
 * labels for them, as their requests failed before any came back.
 */
function UnavailableNotice({names}: {names: string[]}) {
  return (
    <Notice tone="error">
      Couldn&apos;t read these from Vercel on the last run:{' '}
      {names.map((name, i) => (
        <span key={name}>
          {i > 0 && ', '}
          <code>{name}</code>
        </span>
      ))}
      . The next Deploy asks again.
    </Notice>
  );
}

/** The all-time sum over the events the app has sent, and the window the trends and breakdowns cover. */
function EventsSummary({events, reportingWindow}: {events: VercelEvent[]; reportingWindow: ReportingWindow | null}) {
  const total = events.reduce((sum, event) => sum + event.total, 0);
  const eventTypes = `${events.length} event ${events.length === 1 ? 'type' : 'types'}`;
  return (
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
  );
}

interface GroupSectionProps {
  section: EventGroupSection;
  selectedName: string;
  onSelect: (name: string) => void;
}

/**
 * One group under its heading: a card for each event the app has sent, busiest
 * first, and a line naming the ones it hasn't sent yet (the launch's events
 * while their flags are off), which get no card of zeros.
 */
function GroupSection({section, selectedName, onSelect}: GroupSectionProps) {
  const headingId = `web-group-${section.id}`;
  return (
    <section aria-labelledby={headingId} style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: SPACING.md}}>
      <h2 id={headingId} style={{margin: 0, fontSize: ADMIN_TYPE.emphasis, fontWeight: 700, color: ADMIN_COLORS.text}}>
        {section.heading}
      </h2>
      {section.events.length > 0 && (
        <EventCards events={section.events} label={section.heading} selectedName={selectedName} onSelect={onSelect} />
      )}
      {section.notSeen.length > 0 && (
        <p style={{margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>
          Not seen yet: {section.notSeen.join(', ')}
        </p>
      )}
    </section>
  );
}

interface WebAnalyticsBodyProps {
  analytics: VercelAnalytics | null;
  /** Why the artifact could not be fetched (e.g. not generated yet); takes precedence over loading. */
  error?: Error | null;
}

/**
 * The Web analytics page body: the all-time summary, each group's cards under
 * its heading, then the selected event's trend and breakdowns, with the busiest
 * event overall selected first. Events the last run couldn't read are named in
 * a notice above. Data arrives through props, so Storybook renders it from
 * fixtures; `null` with no `error` means the artifact is still loading. Every
 * state comes from vercel-analytics.json alone, never from the vote artifacts.
 */
export function WebAnalyticsBody({analytics, error}: WebAnalyticsBodyProps) {
  const [selectedName, setSelectedName] = useState<string | null>(null);

  if (error) return <Notice tone="error">Could not load Web Analytics ({error.message}).</Notice>;
  if (!analytics) return <Notice>Loading Web Analytics...</Notice>;
  if (!analytics.hasVercelData) return <NoVercelDataNotice />;

  const {reportingWindow} = analytics;
  // Every day of the window, idle ones as 0, before the sparklines, the chart,
  // its table and the daily average read a trend.
  const sections = groupEvents(
    analytics.events.map((event) => ({...event, trend: fillTrendDays(event.trend, reportingWindow)})),
  );
  const seen = sortEventsByTotal(sections.flatMap((section) => section.events));
  const selected = seen.find((event) => event.name === selectedName) ?? seen[0];
  const unavailable = analytics.unavailable ?? [];

  return (
    <div style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: SPACING.xl}}>
      {unavailable.length > 0 && <UnavailableNotice names={unavailable} />}
      {selected ? (
        <EventsSummary events={seen} reportingWindow={reportingWindow} />
      ) : (
        <Notice>No events tracked yet.</Notice>
      )}
      {sections.map((section) => (
        <GroupSection key={section.id} section={section} selectedName={selected?.name ?? ''} onSelect={setSelectedName} />
      ))}
      {selected && (
        <>
          <TrendCard event={selected} />
          <BreakdownCards breakdowns={selected.breakdowns} />
        </>
      )}
    </div>
  );
}
