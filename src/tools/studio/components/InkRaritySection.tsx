import {useId} from 'react';
import type {Ink} from 'inkweave-synergy-engine';
import {ALL_INKS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {RARITIES} from '../../reveal/constants';
import {SINGLE_INK_HINT, type SectionProps} from '../formSections';
import {HINT} from '../studioStyles';
import {Field} from './Field';

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
 * The ink, Dual-ink and the second ink, and the rarity. The three selects are
 * RevealAdminForm's, ported onto admin's classes until R4-5c's pickers replace
 * them (R-74, R-75, R-83). The Dual-ink switch is the studio's own.
 */
export function InkRaritySection({form, errors, onChange, dual}: SectionProps) {
  return (
    <>
      <Field label="Ink" name="ink" errors={errors}>
        {(control) => (
          <select {...control} className="adm-select" value={form.ink} onChange={(e) => onChange({ink: e.target.value as Ink})}>
            {ALL_INKS.map((ink) => (
              <option key={ink} value={ink}>
                {ink}
              </option>
            ))}
          </select>
        )}
      </Field>
      <DualInkSwitch form={form} dual={dual} />
      {dual.on && (
        <Field label="Second ink" name="ink2" errors={errors}>
          {(control) => (
            <select
              {...control}
              className="adm-select"
              value={form.ink2}
              onChange={(e) => onChange({ink2: e.target.value as '' | Ink})}>
              <option value="">None</option>
              {ALL_INKS.map((ink) => (
                <option key={ink} value={ink}>
                  {ink}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}
      <Field label="Rarity" name="rarity" errors={errors}>
        {(control) => (
          <select {...control} className="adm-select" value={form.rarity} onChange={(e) => onChange({rarity: e.target.value})}>
            <option value="">None</option>
            {RARITIES.map((rarity) => (
              <option key={rarity} value={rarity}>
                {rarity}
              </option>
            ))}
          </select>
        )}
      </Field>
    </>
  );
}
