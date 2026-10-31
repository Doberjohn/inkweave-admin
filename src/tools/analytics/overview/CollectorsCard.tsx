import type {CSSProperties} from 'react';
import {FONTS, Panel, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtInt} from '../../../ui/format';
import type {CollectorAnalytics} from '../collectorAnalyticsTypes';
import {PanelLink} from './PanelLink';

const MUTED: CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

interface CollectorsCardProps {
  collectors: CollectorAnalytics | null;
  /** Why collector-analytics.json could not be fetched, if it could not. */
  error: Error | null;
}

/** The card body: the Collectors page's states in short form, or the last 7 days' returning collectors. */
function CollectorsBody({collectors, error}: CollectorsCardProps) {
  if (error) return <p style={MUTED}>Could not load collector analytics ({error.message}).</p>;
  if (!collectors) return <p style={MUTED}>Loading collector analytics...</p>;
  if (!collectors.hasData) {
    if (collectors.reason === 'read-failed') return <p style={MUTED}>Couldn&apos;t read the collections table on the last deploy.</p>;
    return (
      <p style={{...MUTED, overflowWrap: 'anywhere'}}>
        Needs <code>SUPABASE_SERVICE_ROLE_KEY</code>.
      </p>
    );
  }
  if (collectors.collectors === 0) return <p style={MUTED}>No collections yet.</p>;
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: SPACING.sm}}>
      <div style={{fontFamily: FONTS.hero, fontSize: ADMIN_TYPE.hero, lineHeight: 1, color: ADMIN_COLORS.text}}>
        {fmtInt(collectors.returning7)}
      </div>
      <p style={MUTED}>
        of {fmtInt(collectors.collectors)} {collectors.collectors === 1 ? 'collector' : 'collectors'} ·{' '}
        {fmtInt(collectors.new7)} new
      </p>
    </div>
  );
}

/**
 * The Overview's collectors card: the collectors who saved again in the last
 * 7 days after starting before them, out of every collector, with a link to the
 * Collectors page.
 */
export function CollectorsCard({collectors, error}: CollectorsCardProps) {
  return (
    <Panel title="Returning, 7 days" action={<PanelLink to="/collectors">Open collectors →</PanelLink>}>
      <CollectorsBody collectors={collectors} error={error} />
    </Panel>
  );
}
