import {describe, expect, it} from 'vitest';
import {baseName, extOf} from './fileName';

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

describe('baseName', () => {
  it("is a path's last part, file or folder", () => {
    expect(baseName('apps/web/public/data/previewCards.json')).toBe('previewCards.json');
    expect(baseName('apps/web/public/card-images-raw')).toBe('card-images-raw');
  });

  it('is the whole of a path with no slash', () => {
    expect(baseName('previewCards.json')).toBe('previewCards.json');
  });
});
