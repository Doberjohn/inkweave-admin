/**
 * Decodes base64 back to UTF-8 text, the inverse of utf8ToBase64, so a test can
 * read what a commit would write. The tools read files raw and never decode.
 */
export function base64ToUtf8(b64: string): string {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
