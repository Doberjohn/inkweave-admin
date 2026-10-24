import type {InputHTMLAttributes, ReactNode} from 'react';
import {SPACING} from '../../../app-bridge';
import type {RevealCardForm} from '../../reveal/buildPreviewCard';
import {controlProps, fieldIds, type ControlProps} from '../fieldWiring';
import type {SectionProps, TextKey} from '../formSections';
import {ERROR_TEXT, FIELD_LABEL, HINT} from '../studioStyles';

const FIELD: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.xs, minWidth: 0};
// The full card text's field takes the height its section has left (README §7: "grows to fill").
const GROWING_FIELD: React.CSSProperties = {...FIELD, flex: '1 1 auto'};

interface FieldProps {
  label: string;
  /** The form key: it names the ids, and picks the field's error out of `errors`. */
  name: string;
  /** The errors to show (visibleErrors', R-72). */
  errors: Readonly<Record<string, string>>;
  /** A line under the control that describes it: a format, a rule, why it is locked. */
  hint?: string;
  grow?: boolean;
  /**
   * How the error prints: ERROR_TEXT's red unless the field's surface needs another look. On the
   * printing form's tint that red falls under AA, so the form passes its own.
   */
  errorStyle?: React.CSSProperties;
  /** Renders the control, spreading `control`: its id, aria-invalid and aria-describedby. */
  children: (control: ControlProps) => ReactNode;
}

/**
 * A label over one control, then the control's hint and its error. Ported from
 * RevealAdminForm's Field on admin's tokens. The error shows next to its
 * control, and the control is described by the hint, then the error.
 */
export function Field({label, name, errors, hint, grow, errorStyle = ERROR_TEXT, children}: FieldProps) {
  const ids = fieldIds({name});
  const error = errors[name];
  return (
    <div style={grow ? GROWING_FIELD : FIELD}>
      <label id={ids.label} htmlFor={ids.control} style={FIELD_LABEL}>
        {label}
      </label>
      {children(controlProps({name, errors, hint: hint !== undefined}))}
      {hint !== undefined && (
        <p id={ids.hint} style={HINT}>
          {hint}
        </p>
      )}
      {error && (
        <p id={ids.error} style={errorStyle}>
          {error}
        </p>
      )}
    </div>
  );
}

interface TextFieldProps {
  name: TextKey;
  label: string;
  section: SectionProps;
  hint?: string;
  input?: Pick<InputHTMLAttributes<HTMLInputElement>, 'inputMode' | 'placeholder'>;
}

/** A one-line text field on the form, read-only while `section.locked` holds it. */
export function TextField({name, label, section, hint, input}: TextFieldProps) {
  const {form, errors, onChange, locked} = section;
  return (
    <Field label={label} name={name} errors={errors} hint={hint}>
      {(control) => (
        <input
          {...control}
          {...input}
          className="adm-input"
          value={form[name]}
          readOnly={locked.has(name)}
          onChange={(e) => onChange({[name]: e.target.value} as Partial<RevealCardForm>)}
        />
      )}
    </Field>
  );
}
