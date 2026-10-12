import {InkwellIcon, SPACING} from '../../../app-bridge';
import type {SectionProps} from '../formSections';

/** Each button: the form's inkwell value, the app's icon for it, and its name. */
const OPTIONS = [
  {inkwell: true, icon: 'inkable', label: 'Inkable'},
  {inkwell: false, icon: 'uninkable', label: 'Uninkable'},
] as const;

const PAIR: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: SPACING.xs};

/**
 * Inkable or Uninkable: two aria-pressed buttons with the app's InkwellIcon,
 * a view over the form's inkwell (no new form state: the reveal-sync
 * contract). The buttons name themselves, so the group has no visible label,
 * and "Inkwell" names it for assistive tech, as SegmentedControl's ariaLabel
 * names the Type row above it.
 */
export function InkwellPicker({form, onChange}: Pick<SectionProps, 'form' | 'onChange'>) {
  return (
    <div role="group" aria-label="Inkwell" style={PAIR}>
      {OPTIONS.map((option) => (
        <button
          key={option.icon}
          type="button"
          className="adm-pick-btn"
          aria-pressed={form.inkwell === option.inkwell}
          onClick={() => onChange({inkwell: option.inkwell})}>
          <InkwellIcon value={option.icon} />
          {option.label}
        </button>
      ))}
    </div>
  );
}
