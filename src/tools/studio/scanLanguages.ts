import {SCAN_LANGUAGES} from '../reveal/constants';

/** One choice in the Scan language select. */
export interface ScanLanguageOption {
  code: string;
  label: string;
}

/**
 * A scan language's English name ("ja" is "Japanese"), as the app's
 * CardTranslationPanel names it: the runtime's name for the code, or the code
 * itself when it has none (R-60). For every SCAN_LANGUAGES code it is the
 * list's own label. The change list (changeRows) and the select both read it.
 */
export function languageName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], {type: 'language'}).of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * The Scan language select's options (R4-5b): SCAN_LANGUAGES, then the current
 * code as an option of its own when the list doesn't hold it, so a card marked
 * by hand keeps its language (R-60).
 */
export function scanLanguageOptions(current: string): readonly ScanLanguageOption[] {
  const listed = SCAN_LANGUAGES.some((language) => language.code === current);
  return listed ? SCAN_LANGUAGES : [...SCAN_LANGUAGES, {code: current, label: languageName(current)}];
}
