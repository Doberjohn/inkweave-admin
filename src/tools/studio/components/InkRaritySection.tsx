import {useId} from 'react';
import {SPACING} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {SINGLE_INK_HINT, type SectionProps} from '../formSections';
import {HINT} from '../studioStyles';
import {InkPicker, SecondInkPicker} from './InkPicker';
import {RarityPicker} from './RarityPicker';

const SWITCH_ROW: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.xs};
const SWITCH_LABEL: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: SPACING.sm,
  alignSelf: 'flex-start',
  fontSize: ADMIN_TYPE.body,
  color: ADMIN_COLORS.text,
  cursor: 'pointer',
};

/**
 * "Dual-ink card" (README §7): a checkbox with the switch role, a view over
 * ink2. Its state is StudioForm's (SectionProps.dual), so closing this section
 * in the narrow accordion can't turn it off. On with no second ink, the hint
 * says the card publishes as single-ink.
 */
function DualInkSwitch({form, dual}: Pick<SectionProps, 'form' | 'dual'>) {
  const hintId = useId();
  const single = dual.on && form.ink2 === '';
  return (
    <div style={SWITCH_ROW}>
      <label style={SWITCH_LABEL}>
        <input
          type="checkbox"
          role="switch"
          className="adm-switch"
          checked={dual.on}
          aria-describedby={single ? hintId : undefined}
          onChange={dual.toggle}
        />
        Dual-ink card
      </label>
      {single && (
        <p id={hintId} style={HINT}>
          {SINGLE_INK_HINT}
        </p>
      )}
    </div>
  );
}

/**
 * The ink, the Dual-ink switch and the second ink, and the rarity: the
 * handoff's pickers (R-74, R-75, R-83). Each is a view over the form (ink,
 * ink2, rarity), and the switch's state is StudioForm's (SectionProps.dual).
 */
export function InkRaritySection({form, errors, onChange, dual}: SectionProps) {
  return (
    <>
      <InkPicker form={form} errors={errors} onChange={onChange} />
      <DualInkSwitch form={form} dual={dual} />
      {dual.on && <SecondInkPicker form={form} errors={errors} onChange={onChange} />}
      <RarityPicker form={form} errors={errors} onChange={onChange} />
    </>
  );
}
