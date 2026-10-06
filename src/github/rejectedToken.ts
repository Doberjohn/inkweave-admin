/**
 * Whether GitHub rejected the token itself (401: invalid, expired or revoked).
 * ghJson and readRepoFile (githubCommit.ts) start a failed request's message
 * "GitHub <status> on", so a rejected token's reads "GitHub 401 on …".
 */
export function isRejectedToken(message: string): boolean {
  return /^GitHub 401 on /.test(message);
}
