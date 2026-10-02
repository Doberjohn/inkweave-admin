import {useId} from 'react';
import {FONTS, SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../theme/adminTheme';

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  /** Sits after the label, outside the card's name: <RawTag /> on raw-vote stats. */
  tag?: React.ReactNode;
  /** The value's colour; defaults to the text colour (the Overview golds "Engine-silent pairs"). */
  valueColor?: string;
}

/**
 * One headline number: the label, the value in Tinos at the KPI size, and a
 * hint. The card is a group named by its label, so a screen reader reads the
 * label with the value. Hints carry data, so they take the muted colour, never
 * dim (R-6).
 */
export function KpiCard({label, value, hint, tag, valueColor = ADMIN_COLORS.text}: KpiCardProps) {
  const labelId = useId();
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.sm,
        minWidth: 0,
        // Clipped to the padding box, as Panel's fill is (R1-2).
        backgroundColor: ADMIN_COLORS.card,
        backgroundClip: 'padding-box',
        border: `1px solid ${ADMIN_COLORS.border}`,
        borderRadius: ADMIN_RADIUS.panel,
        padding: `${SPACING.lg}px ${SPACING.xl}px`,
      }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.sm,
          fontSize: ADMIN_TYPE.small,
          fontWeight: 500,
          color: ADMIN_COLORS.muted,
        }}>
        <span id={labelId}>{label}</span>
        {tag}
      </div>
      <div style={{fontFamily: FONTS.hero, fontSize: ADMIN_TYPE.kpi, fontWeight: 400, lineHeight: 1, color: valueColor}}>
        {value}
      </div>
      {hint != null && <div style={{fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted}}>{hint}</div>}
    </div>
  );
}
