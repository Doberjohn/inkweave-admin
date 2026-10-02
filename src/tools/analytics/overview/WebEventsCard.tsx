import type {CSSProperties} from 'react';
import {SPACING, TRUNCATE} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtDay, fmtInt} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {PanelLink} from './PanelLink';
import type {ReportingWindow, VercelAnalytics} from '../vercelAnalyticsTypes';

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

/** The card body: the Web analytics page's states in short form, or the events busiest first. */
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
  if (vercel.events.length === 0) return <p style={MUTED}>No events tracked yet.</p>;

  const events = [...vercel.events].sort((a, b) => b.total - a.total);
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
            <span style={{position: 'relative', color: ADMIN_COLORS.muted, fontVariantNumeric: 'tabular-nums'}}>
              {fmtInt(e.total)}
            </span>
          </li>
        ))}
      </ul>
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
