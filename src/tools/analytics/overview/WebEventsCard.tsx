import type {CSSProperties} from 'react';
import {Panel, SPACING, TABULAR, TRUNCATE} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtDay, fmtInt} from '../../../ui/format';
import {PanelLink} from './PanelLink';
import type {ReportingWindow, VercelAnalytics} from '../vercelAnalyticsTypes';
import {isSeen, sortEventsByTotal, unreadCount} from '../web/webModel';

const MUTED: CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

/** Totals are all-time; only the Web analytics page's trends use the reporting window. */
function windowCaption(range: ReportingWindow | null): string {
  if (!range) return 'Totals all-time';
  return `Trends ${fmtDay(range.since)} – ${fmtDay(range.until)} · totals all-time`;
}

interface WebEventsCardProps {
  vercel: VercelAnalytics | null;
  /** Why vercel-analytics.json could not be fetched, if it could not. */
  error: Error | null;
}

/**
 * How many events the last run couldn't read from Vercel, so a list without them
 * never reads as complete. The Web analytics page names them.
 */
function UnreadNote({count}: {count: number}) {
  if (count === 0) return null;
  return (
    <p style={MUTED}>
      Couldn&apos;t read {fmtInt(count)} {count === 1 ? 'event' : 'events'} on the last run.
    </p>
  );
}

/**
 * The card with no event sent yet: says so when the last run read any event, and
 * how many it couldn't read, so a run that read nothing never says none was sent.
 */
function NoEventsSeen({read, unread}: {read: number; unread: number}) {
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: SPACING.xs}}>
      {(read > 0 || unread === 0) && <p style={MUTED}>No events tracked yet.</p>}
      <UnreadNote count={unread} />
    </div>
  );
}

/**
 * The card body: the Web analytics page's states in short form, or the events
 * the app has sent, busiest first. One never sent gets no row of zeros.
 */
function WebEventsBody({vercel, error}: WebEventsCardProps) {
  if (error) return <p style={MUTED}>Could not load Web Analytics ({error.message}).</p>;
  if (!vercel) return <p style={MUTED}>Loading Web Analytics...</p>;
  if (!vercel.hasVercelData) {
    return (
      <p style={{...MUTED, overflowWrap: 'anywhere'}}>
        Needs <code>VERCEL_ANALYTICS_TOKEN</code> and <code>ANALYTICS_VERCEL_PROJECT_ID</code>.
      </p>
    );
  }
  const events = sortEventsByTotal(vercel.events.filter(isSeen));
  const unread = unreadCount(vercel);
  if (events.length === 0) return <NoEventsSeen read={vercel.events.length} unread={unread} />;

  // Each fill is scaled to the busiest event, so the top row is always full width.
  const top = Math.max(1, events[0].total);
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: SPACING.sm}}>
      <ul
        aria-label="Web events"
        style={{listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: SPACING.xs}}>
        {events.map((e) => (
          <li
            key={e.name}
            style={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'space-between',
              gap: SPACING.sm,
              padding: `${SPACING.xs}px ${SPACING.sm}px`,
              borderRadius: ADMIN_RADIUS.control,
              overflow: 'hidden',
              fontSize: ADMIN_TYPE.small,
            }}>
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: `${(e.total / top) * 100}%`,
                background: ADMIN_COLORS.accentTint,
              }}
            />
            <span style={{position: 'relative', minWidth: 0, ...TRUNCATE}}>{e.label}</span>
            <span style={{...TABULAR, position: 'relative', color: ADMIN_COLORS.muted}}>
              {fmtInt(e.total)}
            </span>
          </li>
        ))}
      </ul>
      <UnreadNote count={unread} />
      <p style={{...MUTED, fontSize: ADMIN_TYPE.label}}>{windowCaption(vercel.reportingWindow)}</p>
    </div>
  );
}

/** Custom-event totals from Vercel Web Analytics, with a link to the Web analytics page. */
export function WebEventsCard({vercel, error}: WebEventsCardProps) {
  return (
    <Panel title="Web events" action={<PanelLink to="/web">Open web analytics →</PanelLink>}>
      <WebEventsBody vercel={vercel} error={error} />
    </Panel>
  );
}
