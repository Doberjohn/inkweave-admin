// The 8 bytes every PNG file starts with.
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** A file whose bytes start like a PNG, which is all the upload check reads. */
export const pngFile = (name: string) => new File([PNG_SIGNATURE], name, {type: 'image/png'});

// How each accepted format begins, by extension.
const HEADS: Record<string, string> = {
  png: '\x89PNG\r\n\x1A\n',
  jpg: '\xFF\xD8\xFF\xE0',
  jpeg: '\xFF\xD8\xFF\xE0',
  webp: 'RIFF\x00\x00\x00\x00WEBP',
};

/**
 * A data URL whose bytes start like the image its name claims, and that names
 * the file, so a test can tell whose bytes a hook ended up with.
 */
export function imageDataUrl(name: string): string {
  const ext = (name.split('.').pop() ?? '').toLowerCase();
  return `data:image/${ext};name=${name};base64,${btoa(HEADS[ext] ?? '')}`;
}
