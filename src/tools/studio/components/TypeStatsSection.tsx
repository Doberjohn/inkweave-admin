import type {CardType} from 'inkweave-synergy-engine';
import {SPACING} from '../../../app-bridge';
import {SegmentedControl} from '../../../ui/SegmentedControl';
import {CARD_TYPES, STAT_FIELDS, STAT_LABELS} from '../../reveal/constants';
import {COST_SLIDER_MAX, costSlider, type SectionProps} from '../formSections';
import {Field, TextField} from './Field';
import {InkwellPicker} from './InkwellPicker';

const TYPE_OPTIONS = CARD_TYPES.map((type) => ({value: type, label: type}));

// The keys that move a range input. Any other key, Tab above all, leaves a blank cost blank.
const SLIDER_KEYS: ReadonlySet<string> = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

const COST_BOX_WIDTH = 64;
const COST_ROW: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: SPACING.md};
const COST_BOX: React.CSSProperties = {flex: 'none', width: COST_BOX_WIDTH};
const STATS_ROW: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: SPACING.sm};

/**
 * The cost: a box that holds exactly what was typed, so the validator still
 * refuses "1.5", and beside it a 0-10 slider with its own name. A blank cost's
 * slider has no thumb and reads "Not set"; its first press, or a key that moves
 * it, sets 0 first, so 0 can be picked.
 */
function CostField({form, errors, onChange}: SectionProps) {
  const slider = costSlider(form);
  const startAtZero = () => {
    if (slider.unset) onChange({cost: '0'});
  };
  return (
    <Field label="Cost" name="cost" errors={errors}>
      {(control) => (
        <div style={COST_ROW}>
          <input
            {...control}
            className="adm-input"
            style={COST_BOX}
            inputMode="numeric"
            value={form.cost}
            onChange={(e) => onChange({cost: e.target.value})}
          />
          <input
            type="range"
            className="adm-range"
            min={0}
            max={COST_SLIDER_MAX}
            step={1}
            aria-label="Cost slider"
            aria-valuetext={slider.valueText}
            data-unset={slider.unset || undefined}
            value={slider.value}
            onPointerDown={startAtZero}
            onKeyDown={(e) => {
              if (SLIDER_KEYS.has(e.key)) startAtZero();
            }}
            onChange={(e) => onChange({cost: e.target.value})}
          />
        </div>
      )}
    </Field>
  );
}

/**
 * The card's type, then Inkable or Uninkable, its cost and the stats its type
 * prints (STAT_FIELDS), in the handoff's order (dc.html:224-227). The type
 * control fills its section's width, as the handoff draws it: its four labels
 * need 276px at the default padding, where a wide form column at the R-64
 * switch gives it 266px inside its frame, and a 360px phone 224px.
 */
export function TypeStatsSection(section: SectionProps) {
  const {form, onChange} = section;
  const stats = STAT_FIELDS[form.type] ?? [];
  return (
    <>
      <SegmentedControl<CardType>
        options={TYPE_OPTIONS}
        value={form.type}
        onChange={(type) => onChange({type})}
        ariaLabel="Type"
        fill
      />
      <InkwellPicker form={form} onChange={onChange} />
      <CostField {...section} />
      {stats.length > 0 && (
        <div style={STATS_ROW}>
          {stats.map((stat) => (
            <TextField key={stat} name={stat} label={STAT_LABELS[stat]} section={section} input={{inputMode: 'numeric'}} />
          ))}
        </div>
      )}
    </>
  );
}
