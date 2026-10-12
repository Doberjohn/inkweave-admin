import type {SynergyGroup} from 'inkweave-synergy-engine';
import {SPACING} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtInt} from '../../../ui/format';

interface SynergyPreviewPanelProps {
  groups: SynergyGroup[];
}

const LIST: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.xs,
};
// One group: a card inside its panel, as Card studio's change rows are (R-90).
const ROW: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: SPACING.sm,
  padding: `${SPACING.xs}px ${SPACING.sm}px`,
  // A translucent fill under a border: clip it to the padding box (adminTheme.ts).
  backgroundColor: ADMIN_COLORS.card,
  backgroundClip: 'padding-box',
  border: `1px solid ${ADMIN_COLORS.border}`,
  borderRadius: ADMIN_RADIUS.control,
  color: ADMIN_COLORS.text,
  fontSize: ADMIN_TYPE.small,
};
// Muted, never dim: the count is data (R-6).
const COUNT: React.CSSProperties = {flex: 'none', color: ADMIN_COLORS.muted};
const EMPTY: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

function GroupRow({group}: {group: SynergyGroup}) {
  const partners = group.synergies.length;
  return (
    <li style={ROW}>
      <span>{group.label}</span>
      <span style={COUNT}>{partners === 1 ? '1 card' : `${fmtInt(partners)} cards`}</span>
    </li>
  );
}

/**
 * The engine's synergy groups for a card being written: each group's name and
 * how many cards it pairs with. Card studio's SynergyPanel frames it (R-90);
 * the reveal publisher shows it bare until R4-6c retires that page.
 */
export function SynergyPreviewPanel({groups}: SynergyPreviewPanelProps) {
  if (groups.length === 0) {
    return <p style={EMPTY}>No synergies detected yet. Add card text or keywords to see matches.</p>;
  }
  return (
    <ul style={LIST}>
      {groups.map((group) => (
        <GroupRow key={group.groupKey} group={group} />
      ))}
    </ul>
  );
}
