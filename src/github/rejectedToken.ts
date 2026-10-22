/**
 * Whether GitHub rejected the token itself (401: invalid, expired or revoked).
 * ghJson and the contents reads in githubApi.ts, which readRepoFile and the
 * change history's reads go through, start a failed request's message
 * "GitHub <status> on", so a rejected token's reads "GitHub 401 on …".
 */
export function isRejectedToken(message: string): boolean {
  return /^GitHub 401 on /.test(message);
}
