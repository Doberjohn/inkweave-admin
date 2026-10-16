/*
 * How a studio field ties its parts together for assistive tech (R4-5b): the
 * label names the control, and the control is described by its hint and, while
 * it has one, its error. The ids keep the old reveal form's scheme
 * (field-{name}, field-{name}-error), and R4-5c's ink group labels itself by
 * field-ink-label. They are page-global, so one form mounts at a time.
 */

/** A field's name, the errors to show (visibleErrors', R-72), and whether it prints a hint. */
export interface FieldSpec {
  name: string;
  errors: Readonly<Record<string, string>>;
  hint?: boolean;
}

/** The ids of a field's parts. */
export interface FieldIds {
  control: string;
  label: string;
  hint: string;
  error: string;
}

/** What a field's control spreads: its id, and its error and hint wiring. */
export interface ControlProps {
  id: string;
  'aria-invalid': true | undefined;
  'aria-describedby': string | undefined;
}

/** field-{name} for the control; -label, -hint and -error for the rest. */
export function fieldIds({name}: Pick<FieldSpec, 'name'>): FieldIds {
  const control = `field-${name}`;
  return {control, label: `${control}-label`, hint: `${control}-hint`, error: `${control}-error`};
}

/**
 * The control's id, plus its wiring: aria-invalid while the field has an error
 * to show, and aria-describedby naming its hint, then its error. Each is left
 * off when there is nothing to point at, so a valid field reads as no more than
 * its label and hint.
 */
export function controlProps({name, errors, hint}: FieldSpec): ControlProps {
  const ids = fieldIds({name});
  const invalid = Object.hasOwn(errors, name);
  const describedBy = [hint ? ids.hint : '', invalid ? ids.error : ''].filter(Boolean).join(' ');
  return {id: ids.control, 'aria-invalid': invalid || undefined, 'aria-describedby': describedBy || undefined};
}
