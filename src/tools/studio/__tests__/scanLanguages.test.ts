import {describe, expect, it} from 'vitest';
import {SCAN_LANGUAGES} from '../../reveal/constants';
import {languageName, scanLanguageOptions} from '../scanLanguages';

describe('languageName (R-60)', () => {
  it('names every listed language as the list labels it', () => {
    expect(SCAN_LANGUAGES.map(({code}) => languageName(code))).toEqual(SCAN_LANGUAGES.map(({label}) => label));
  });

  // Codes a card was marked with by hand: the app's CardTranslationPanel names them the same way.
  it.each([
    ['pt', 'Portuguese'],
    ['zh', 'Chinese'],
    ['not a code', 'not a code'],
  ])('names the unlisted %s as %s', (code, name) => {
    expect(languageName(code)).toBe(name);
  });
});

describe('scanLanguageOptions (R-60)', () => {
  it('offers the listed languages, as they are, for a listed code', () => {
    expect(scanLanguageOptions('ja')).toEqual(SCAN_LANGUAGES);
  });

  it('adds a code the list lacks as an option of its own, named in English', () => {
    expect(scanLanguageOptions('pt')).toEqual([...SCAN_LANGUAGES, {code: 'pt', label: 'Portuguese'}]);
  });
});
