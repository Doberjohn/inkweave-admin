import {SPACING} from '../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../theme/adminTheme';
import {MeterBar} from '../../ui/MeterBar';
import {Panel} from '../../ui/Panel';
import {dimensionStats} from './dimensionStats';
import type {DimensionFill} from './voteAnalyticsTypes';

interface DimensionParticipationProps {
  fill: DimensionFill | null;
  totalVotes: number;
  /**
   * What the panel reads, beside its title. On a page whose filter row scopes
   * the panels below it, a panel the filter doesn't reach says so ("All votes,
   * whatever the rule").
   */
  scope?: string;
}

/** Label, bar, share: the bar is decoration (MeterBar with no label), since the share is printed beside it. */
const ROW: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '96px minmax(0, 1fr) 48px',
  alignItems: 'center',
  gap: SPACING.md,
  fontSize: ADMIN_TYPE.body,
};

const NOTE: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted};

/** What share of the votes filled each dimension, as accent bars in a panel. */
export function DimensionParticipation({fill, totalVotes, scope}: DimensionParticipationProps) {
  const rows = dimensionStats(fill, totalVotes);
  return (
    <Panel title="Dimension participation" action={scope}>
      {rows.length === 0 ? (
        <p style={{...NOTE, fontSize: ADMIN_TYPE.body}}>No votes yet.</p>
      ) : (
        <>
          <ul style={{listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: SPACING.sm}}>
            {rows.map((row) => (
              <li key={row.label} style={ROW}>
                <span style={{color: ADMIN_COLORS.muted}}>{row.label}</span>
                <MeterBar fraction={row.pct / 100} color={ADMIN_COLORS.accent} height={8} />
                <span style={{textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>{row.pct}%</span>
              </li>
            ))}
          </ul>
          <p style={NOTE}>Which questions voters actually answer. who_carries excluded (98.8% default).</p>
        </>
      )}
    </Panel>
  );
}
