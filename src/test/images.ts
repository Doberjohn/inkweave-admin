// The 8 bytes every PNG file starts with.
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** A file whose bytes start like a PNG, which is all the upload check reads. */
export const pngFile = (name: string) => new File([PNG_SIGNATURE], name, {type: 'image/png'});

/**
 * A data URL whose bytes start like a PNG and that names the file it stands
 * for, so a test can tell whose bytes a hook ended up with.
 */
export const pngDataUrl = (name: string) => `data:image/png;name=${name};base64,iVBORw0KGgo=`;
