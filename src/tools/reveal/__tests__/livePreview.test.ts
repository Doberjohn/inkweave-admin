import {describe, expect, it} from 'vitest';
import {imageErrorOf} from '../livePreview';

const NO_FILE = 'Upload a card image';
const NAMED = 'Image must be jpg, jpeg, png, or webp';
const BYTES = 'a.gif is not a JPEG, PNG or WebP image.';
const READ_FAILED = 'Could not read the image: read failed';

describe('imageErrorOf', () => {
  it.each([
    {why: "nothing before a file is chosen: the checklist's", name: null, upload: null, validator: NO_FILE, expected: null},
    {why: "the file's own error ahead of the validator's when both refuse it", name: 'a.gif', upload: BYTES, validator: NAMED, expected: BYTES},
    {why: "the validator's error while a refused name's bytes are read", name: 'a.gif', upload: null, validator: NAMED, expected: NAMED},
    {why: "the file's own error when the validator takes its name", name: 'a.png', upload: READ_FAILED, validator: undefined, expected: READ_FAILED},
    {why: 'null for a file with neither', name: 'a.png', upload: null, validator: undefined, expected: null},
  ])('$why', ({name, upload, validator, expected}) => {
    const errors: Record<string, string> = validator ? {image: validator} : {};
    expect(imageErrorOf({name, dataUrl: null, error: upload}, {ok: !validator, errors})).toBe(expected);
  });
});
