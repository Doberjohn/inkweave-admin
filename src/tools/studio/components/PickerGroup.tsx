import {SPACING} from '../../../app-bridge';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {controlProps, fieldIds} from '../fieldWiring';
import {ERROR_TEXT, FIELD_LABEL} from '../studioStyles';

/** How a picker lays out its buttons: ink tiles wrap in a row, and rarities fill a grid. */
export type PickerLayout = 'tiles' | 'grid';

const LAYOUTS: Readonly<Record<PickerLayout, React.CSSProperties>> = {
  tiles: {display: 'flex', flexWrap: 'wrap', gap: SPACING.xs},
  // The handoff's rarity grid (README §7): 112px a button at the least.
  grid: {display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))', gap: SPACING.xs},
};

// The handoff spaces a picker's label 8px above its buttons.
const PICKER: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.sm, minWidth: 0};
/** The picked name after the label, in the text colour (dc.html:214). */
const DETAIL: React.CSSProperties = {color: ADMIN_COLORS.text};

interface PickerGroupProps {
  /** The form key the group sets. Its label and error take Field's ids (fieldIds): field-{name}-label, -error. */
  name: string;
  /** The visible label, which alone names the group: "Ink", "Second ink", "Rarity". */
  label: string;
  /** Printed after the label (" · Amber / Ruby"), outside the group's name, which stays the label. */
  detail?: string;
  layout: PickerLayout;
  /** The errors to show (visibleErrors', R-72). errors[name] prints under the group and describes it. */
  errors: Readonly<Record<string, string>>;
  children: React.ReactNode;
}

/**
 * Field's counterpart for a set of aria-pressed buttons. A group isn't a
 * labelable element, so its visible label names it through aria-labelledby,
 * and its error, printed under it, describes it through aria-describedby
 * (controlProps' rule: every validator message next to its control). The
 * group takes no aria-invalid, which ARIA 1.2 doesn't allow on a group: the
 * described error and the section's red dot carry it.
 */
export function PickerGroup({name, label, detail, layout, errors, children}: PickerGroupProps) {
  const ids = fieldIds({name});
  const error = errors[name];
  return (
    <div style={PICKER}>
      <span style={FIELD_LABEL}>
        <span id={ids.label}>{label}</span>
        {detail && (
          <>
            {' · '}
            <span style={DETAIL}>{detail}</span>
          </>
        )}
      </span>
      <div
        role="group"
        aria-labelledby={ids.label}
        aria-describedby={controlProps({name, errors})['aria-describedby']}
        style={LAYOUTS[layout]}>
        {children}
      </div>
      {error && (
        <p id={ids.error} style={ERROR_TEXT}>
          {error}
        </p>
      )}
    </div>
  );
}
