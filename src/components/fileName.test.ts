import {describe, expect, it} from 'vitest';
import {extOf} from './fileName';

describe('extOf', () => {
  it('is the text after the last dot, lowercased', () => {
    expect(extOf('Scan.PNG')).toBe('png');
    expect(extOf('a.b.webp')).toBe('webp');
  });

  it('is nothing for a name with no extension, however the name ends', () => {
    expect(extOf('scan')).toBe('');
    expect(extOf('scan.')).toBe('');
  });
});
