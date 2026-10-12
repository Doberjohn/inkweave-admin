import type {FocusEvent} from 'react';
import {canonicalizeCardFullText} from 'inkweave-synergy-engine';
import {SCAN_LANGUAGE_HINT, type SectionProps} from '../formSections';
import {scanLanguageOptions} from '../scanLanguages';
import {Field} from './Field';

const FULL_TEXT: React.CSSProperties = {flex: '1 1 auto'};

/** Keywords, the full card text and the scan's language. */
export function CardTextSection({form, errors, onChange}: SectionProps) {
  // Show the house-style rewrite (#635) when the owner moves on within the page. Not when the
  // window or tab loses focus (alt-tab to copy the next ability): the field is still the active
  // element then, and trimming its trailing newline would glue the next paste onto this line.
  const canonicalizeOnLeave = (e: FocusEvent<HTMLTextAreaElement>) => {
    const field = e.currentTarget;
    if (field.ownerDocument.activeElement === field) return;
    onChange({fullText: canonicalizeCardFullText(field.value)});
  };

  return (
    <>
      <Field label="Keywords (one per line, e.g. Singer 5)" name="keywords" errors={errors}>
        {(control) => (
          <textarea
            {...control}
            className="adm-input"
            value={form.keywords}
            onChange={(e) => onChange({keywords: e.target.value})}
          />
        )}
      </Field>
      <Field label="Full card text (one ability per line)" name="fullText" errors={errors} grow>
        {(control) => (
          <textarea
            {...control}
            className="adm-input"
            style={FULL_TEXT}
            value={form.fullText}
            onChange={(e) => onChange({fullText: e.target.value})}
            onBlur={canonicalizeOnLeave}
          />
        )}
      </Field>
      <Field label="Scan language" name="scanLanguage" errors={errors} hint={SCAN_LANGUAGE_HINT}>
        {(control) => (
          <select
            {...control}
            className="adm-select"
            value={form.scanLanguage}
            onChange={(e) => onChange({scanLanguage: e.target.value})}>
            {scanLanguageOptions(form.scanLanguage).map(({code, label}) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        )}
      </Field>
    </>
  );
}
