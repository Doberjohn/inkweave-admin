import type {TuningConfig} from 'inkweave-synergy-engine';
import {COLORS, CtaButton, FONT_SIZES, RADIUS, SPACING} from '../../../app-bridge';

interface RuleSelectorProps {
  /** The live tuning.json; its playstyles and direct rules become the picker entries. */
  config: TuningConfig;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const groupLabelStyle = {
  fontSize: FONT_SIZES.xs,
  color: COLORS.gray600,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.5,
  margin: `${SPACING.md}px 0 ${SPACING.xs}px`,
};

// Kit button (#509) laid out as a list row: ghost marks the selection, neutral the rest.
const itemStyle = {
  width: '100%',
  justifyContent: 'flex-start',
  minHeight: 0,
  padding: `${SPACING.sm}px ${SPACING.md}px`,
  marginBottom: SPACING.xs,
  borderRadius: RADIUS.sm,
  fontSize: FONT_SIZES.sm,
  textAlign: 'left' as const,
};

function RuleButton({id, name, selected, onSelect}: {id: string; name: string; selected: boolean; onSelect: (id: string) => void}) {
  return (
    <CtaButton
      type="button"
      variant={selected ? 'ghost' : 'neutral'}
      aria-pressed={selected}
      onClick={() => onSelect(id)}
      style={itemStyle}>
      {name}
    </CtaButton>
  );
}

/** Two-group picker (playstyles + direct synergies) that drives the editor. */
export function RuleSelector({config, selectedId, onSelect}: RuleSelectorProps) {
  return (
    <nav aria-label="Tuning rules">
      <div style={groupLabelStyle}>Playstyles</div>
      {Object.entries(config.playstyles).map(([id, {name}]) => (
        <RuleButton key={id} id={id} name={name} selected={id === selectedId} onSelect={onSelect} />
      ))}
      <div style={groupLabelStyle}>Direct synergies</div>
      {Object.entries(config.directRules).map(([id, {name}]) => (
        <RuleButton key={id} id={id} name={name} selected={id === selectedId} onSelect={onSelect} />
      ))}
    </nav>
  );
}
