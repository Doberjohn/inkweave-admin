/*
 * A stand-in for a GitHub token (#68). The batch store tells how a publish ended only to the token
 * that made it, so it must know that token again, yet never hold it: after Forget token, nothing in
 * the page's memory may still have it. It keeps this mark instead, which tells two tokens apart
 * and gives nothing of either away.
 */

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** A token's mark: the 32-bit FNV-1a hash of its UTF-8 bytes, an unsigned number. */
export function tokenMark(token: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (const byte of new TextEncoder().encode(token)) {
    hash = Math.imul(hash ^ byte, FNV_PRIME);
  }
  return hash >>> 0;
}
