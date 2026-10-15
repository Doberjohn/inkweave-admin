import {InkwellIcon, SPACING} from '../../../app-bridge';
import type {SectionProps} from '../formSections';
import {PICK_MIN_WIDTH} from '../studioStyles';

/** Each button: the form's inkwell value, the app's icon for it, and its name. */
const OPTIONS = [
  {inkwell: true, icon: 'inkable', label: 'Inkable'},
  {inkwell: false, icon: 'uninkable', label: 'Uninkable'},
] as const;

/**
 * Side by side where both fit at PICK_MIN_WIDTH, as at 360px with the rail
 * (113px each), and stacked where they don't, as at 320px (a 190px section),
 * so Uninkable's label never runs past its button. auto-fit drops the empty
 * tracks, so the two share a wider section between them.
 */
const PAIR: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${PICK_MIN_WIDTH}px), 1fr))`,
  gap: SPACING.xs,
};

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
