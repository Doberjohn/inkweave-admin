import type {CSSProperties} from 'react';
import {LETTER_SPACING, Notice, Panel, SPACING, TABULAR} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtDay, fmtInt} from '../../../ui/format';
import {KpiCard} from '../../../ui/KpiCard';
import type {CollectorAnalytics, CollectorCounts, CollectorWeek} from '../collectorAnalyticsTypes';

const HEAD_CELL: CSSProperties = {
  padding: `${SPACING.sm}px ${SPACING.lg}px`,
  background: ADMIN_COLORS.panel,
  textAlign: 'right',
  fontSize: ADMIN_TYPE.label,
  fontWeight: 700,
  letterSpacing: LETTER_SPACING.cap,
  textTransform: 'uppercase',
  color: ADMIN_COLORS.muted,
  whiteSpace: 'nowrap',
};

const CELL: CSSProperties = {
  ...TABULAR,
  padding: `${SPACING.sm}px ${SPACING.lg}px`,
  borderTop: `1px solid ${ADMIN_COLORS.divider}`,
  textAlign: 'right',
  color: ADMIN_COLORS.text,
};

/** "3 of 5": a count out of the collectors it could have been. */
function outOf(n: number, of: number): string {
  return `${fmtInt(n)} of ${fmtInt(of)}`;
}

/** The week's saves a week in, or "too new" while none of its collectors has had a week. */
function weekInCell(week: CollectorWeek): string {
  return week.weekInOf === 0 ? 'too new' : outOf(week.weekIn, week.weekInOf);
}

/** The headline counts, as of the last deploy. */
function CollectorKpis({counts}: {counts: CollectorCounts}) {
  return (
    <section
      aria-label="Key figures"
      style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: SPACING.md}}>
      <KpiCard label="Collectors" value={fmtInt(counts.collectors)} hint="accounts with a collection" />
      <KpiCard label="New, 7 days" value={fmtInt(counts.new7)} hint="first save in the last 7 days" />
      <KpiCard label="Returning, 7 days" value={fmtInt(counts.returning7)} hint="saved again in the last 7 days" />
      <KpiCard label="Returning, 30 days" value={fmtInt(counts.returning30)} hint="saved again in the last 30 days" />
      <KpiCard
        label="Came back at least once"
        value={outOf(counts.cameBack, counts.collectors)}
        hint="a save a day or more after the first"
      />
    </section>
  );
}

/** Each start week's collectors and how they held up, newest first. */
function StartWeeksTable({weeks}: {weeks: CollectorWeek[]}) {
  return (
    <Panel title="By start week" padded={false}>
      <div style={{overflowX: 'auto'}}>
        <table
          aria-label="Collectors by start week"
          style={{width: '100%', borderCollapse: 'collapse', fontSize: ADMIN_TYPE.body}}>
          <thead>
            <tr>
              <th scope="col" style={{...HEAD_CELL, textAlign: 'left'}}>
                Week of
              </th>
              <th scope="col" style={HEAD_CELL}>
                Started
              </th>
              <th scope="col" style={HEAD_CELL}>
                Came back
              </th>
              <th scope="col" style={HEAD_CELL}>
                Saved a week in
              </th>
              <th scope="col" style={HEAD_CELL}>
                Active, last 7 days
              </th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week.week}>
                <th scope="row" style={{...CELL, textAlign: 'left', fontWeight: 500}}>
                  {fmtDay(week.week)}
                </th>
                <td style={CELL}>{fmtInt(week.started)}</td>
                <td style={CELL}>{fmtInt(week.cameBack)}</td>
                <td style={{...CELL, color: week.weekInOf === 0 ? ADMIN_COLORS.muted : ADMIN_COLORS.text}}>
                  {weekInCell(week)}
                </td>
                <td style={CELL}>{fmtInt(week.active7)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/** Why the last deploy wrote no counts. */
function NoCountsNotice({reason}: {reason: 'no-key' | 'read-failed'}) {
  if (reason === 'read-failed') {
    return <Notice tone="error">Couldn&apos;t read the collections table on the last deploy. The next one tries again.</Notice>;
  }
  return (
    <Notice>
      Collector counts need the <code style={{color: ADMIN_COLORS.accent}}>SUPABASE_SERVICE_ROLE_KEY</code> Actions secret
      when admin&apos;s Deploy workflow generates this data: row-level security lets an account read only its own
      collection.
    </Notice>
  );
}

interface CollectorsViewProps {
  /** collector-analytics.json, or null while it loads or after it failed. */
  analytics: CollectorAnalytics | null;
  /** Why the file could not be fetched (e.g. not generated yet); takes precedence over loading. */
  error?: Error | null;
}

/**
 * The Collectors page body: the headline counts, each start week's collectors,
 * and what the counts can't see. Purely presentational: CollectorsPage fetches,
 * so Storybook renders it from fixtures.
 */
export function CollectorsView({analytics, error}: CollectorsViewProps) {
  if (error) {
    return <Notice tone="error">Could not load collector analytics. Has the artifact been generated? ({error.message})</Notice>;
  }
  if (!analytics) return <Notice>Loading collector analytics...</Notice>;
  if (!analytics.hasData) return <NoCountsNotice reason={analytics.reason} />;
  if (analytics.collectors === 0) return <Notice>No collections yet.</Notice>;
  return (
    <div style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: SPACING.xl}}>
      <CollectorKpis counts={analytics} />
      <StartWeeksTable weeks={analytics.weeks} />
      <p style={{margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>
        A return is a save a day or more after the first. Opening the binder without changing it isn&apos;t recorded,
        and a cleared collection drops out. A card id fix counts as a save for each collection it changes.
      </p>
    </div>
  );
}
