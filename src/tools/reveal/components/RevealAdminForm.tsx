import type {ChangeEvent, FocusEvent} from 'react';
import {canonicalizeCardFullText, type Ink} from 'inkweave-synergy-engine';
import type {RevealCardForm} from '../buildPreviewCard';
import {ALL_INKS, COLORS, SPACING, FONT_SIZES, RADIUS} from '../../../app-bridge';
import {
  CARD_TYPES,
  RARITIES,
  FEATURED_FRANCHISE_HINT,
  SCAN_LANGUAGES,
  STAT_FIELDS,
  STAT_LABELS,
  type ScanLanguage,
} from '../constants';

interface RevealAdminFormProps {
  form: RevealCardForm;
  errors: Record<string, string>;
  onChange: (patch: Partial<RevealCardForm>) => void;
}

const labelStyle = {fontSize: FONT_SIZES.xs, color: COLORS.gray600, display: 'block', marginBottom: 4};
const fieldStyle = {
  width: '100%',
  padding: '8px 10px',
  background: COLORS.surfaceAlt,
  color: COLORS.text,
  border: `1px solid ${COLORS.surfaceHover}`,
  borderRadius: RADIUS.sm,
  fontSize: FONT_SIZES.sm,
};

const errorId = (name: string) => `field-${name}-error`;

/**
 * A field's control id, plus its error wiring: while the field has an error the
 * control is aria-invalid and described by the message, so screen readers tie
 * the two together.
 */
function controlProps(name: string, errors: Record<string, string>) {
  const invalid = Boolean(errors[name]);
  return {id: `field-${name}`, 'aria-invalid': invalid || undefined, 'aria-describedby': invalid ? errorId(name) : undefined};
}

function Field({
  label,
  name,
  errors,
  children,
}: {
  label: string;
  name: string;
  errors: Record<string, string>;
  children: React.ReactNode;
}) {
  return (
    <div style={{marginBottom: SPACING.sm}}>
      <label style={labelStyle} htmlFor={`field-${name}`}>
        {label}
      </label>
      {children}
      {errors[name] && (
        <div id={errorId(name)} style={{color: COLORS.error, fontSize: FONT_SIZES.xs, marginTop: 4}}>
          {errors[name]}
        </div>
      )}
    </div>
  );
}

export function RevealAdminForm({form, errors, onChange}: RevealAdminFormProps) {
  const text = (name: keyof RevealCardForm) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({[name]: e.target.value} as Partial<RevealCardForm>);
  const control = (name: string) => controlProps(name, errors);
  const statFields = STAT_FIELDS[form.type] ?? [];

  // Show the house-style rewrite (#635) when the owner moves on within the page. Not when the
  // window or tab loses focus (alt-tab to copy the next ability): the field is still the active
  // element then, and trimming its trailing newline would glue the next paste onto this line.
  const canonicalizeOnLeave = (e: FocusEvent<HTMLTextAreaElement>) => {
    const field = e.currentTarget;
    if (field.ownerDocument.activeElement === field) return;
    onChange({fullText: canonicalizeCardFullText(field.value)});
  };

  return (
    <div>
      <Field label="Collector number" name="collectorNumber" errors={errors}>
        <input {...control('collectorNumber')} style={fieldStyle} value={form.collectorNumber} onChange={text('collectorNumber')} inputMode="numeric" />
      </Field>
      <Field label="Name" name="name" errors={errors}>
        <input {...control('name')} style={fieldStyle} value={form.name} onChange={text('name')} />
      </Field>
      <Field label="Version (subtitle)" name="version" errors={errors}>
        <input {...control('version')} style={fieldStyle} value={form.version} onChange={text('version')} />
      </Field>
      <Field label="Cost" name="cost" errors={errors}>
        <input {...control('cost')} style={fieldStyle} value={form.cost} onChange={text('cost')} inputMode="numeric" />
      </Field>
      <Field label="Ink" name="ink" errors={errors}>
        <select {...control('ink')} style={fieldStyle} value={form.ink} onChange={(e) => onChange({ink: e.target.value as Ink})}>
          {ALL_INKS.map((ink) => (
            <option key={ink} value={ink}>{ink}</option>
          ))}
        </select>
      </Field>
      <Field label="Second ink (dual-ink only)" name="ink2" errors={errors}>
        <select {...control('ink2')} style={fieldStyle} value={form.ink2} onChange={(e) => onChange({ink2: e.target.value as '' | Ink})}>
          <option value="">— none —</option>
          {ALL_INKS.map((ink) => (
            <option key={ink} value={ink}>{ink}</option>
          ))}
        </select>
      </Field>
      <Field label="Type" name="type" errors={errors}>
        <select {...control('type')} style={fieldStyle} value={form.type} onChange={(e) => onChange({type: e.target.value as RevealCardForm['type']})}>
          {CARD_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </Field>
      <div style={{marginBottom: SPACING.sm}}>
        <label style={{...labelStyle, display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
          <input type="checkbox" checked={form.inkwell} onChange={(e) => onChange({inkwell: e.target.checked})} />
          Inkable (can go in inkwell)
        </label>
      </div>
      {statFields.length > 0 && (
        <div style={{display: 'flex', gap: SPACING.sm}}>
          {statFields.map((field) => (
            <Field key={field} label={STAT_LABELS[field]} name={field} errors={errors}>
              <input {...control(field)} style={fieldStyle} value={form[field]} onChange={text(field)} inputMode="numeric" />
            </Field>
          ))}
        </div>
      )}
      <Field label="Rarity" name="rarity" errors={errors}>
        <select {...control('rarity')} style={fieldStyle} value={form.rarity} onChange={(e) => onChange({rarity: e.target.value})}>
          <option value="">— choose —</option>
          {RARITIES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </Field>
      <Field label={`Franchise (${FEATURED_FRANCHISE_HINT})`} name="franchise" errors={errors}>
        <input {...control('franchise')} style={fieldStyle} value={form.franchise} onChange={text('franchise')} />
      </Field>
      <Field label="Subtypes / classifications (comma separated)" name="subtypes" errors={errors}>
        <input {...control('subtypes')} style={fieldStyle} value={form.subtypes} onChange={text('subtypes')} placeholder="Hero, Red Panda" />
      </Field>
      <Field label="Keywords (one per line, e.g. Singer 5)" name="keywords" errors={errors}>
        <textarea {...control('keywords')} style={{...fieldStyle, minHeight: 60}} value={form.keywords} onChange={text('keywords')} />
      </Field>
      <Field label="Full card text (one ability per line)" name="fullText" errors={errors}>
        <textarea
          {...control('fullText')}
          style={{...fieldStyle, minHeight: 100}}
          value={form.fullText}
          onChange={text('fullText')}
          onBlur={canonicalizeOnLeave}
        />
      </Field>
      <Field label={'Scan language (anything but English adds "See translation")'} name="scanLanguage" errors={errors}>
        <select
          {...control('scanLanguage')}
          style={fieldStyle}
          value={form.scanLanguage}
          onChange={(e) => onChange({scanLanguage: e.target.value as ScanLanguage})}>
          {SCAN_LANGUAGES.map(({code, label}) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
      </Field>
    </div>
  );
}
