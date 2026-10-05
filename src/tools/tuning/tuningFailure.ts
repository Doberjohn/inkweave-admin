import {isRejectedToken} from '../../github/rejectedToken';

/** The kinds of failure the tuning editor tells apart. */
export type TuningFailureKind = 'stale-value' | 'rejected-token' | 'other';

/** applyTuningEdits' refusal (githubClient.ts). */
const STALE_VALUE = 'changed since the editor loaded it';

/**
 * What a failed read of tuning.json, or a failed publish, asks of the user:
 * - 'stale-value': applyTuningEdits refused an edit because tuning.json changed
 *   after it was read. Reloading tuning.json keeps the edits that still apply
 *   and drops the stale ones (R-18).
 * - 'rejected-token': GitHub answered 401, so the saved token is invalid or
 *   expired. Forgetting it brings the token gate back (R-26).
 * - 'other': anything else, the branch moving mid-publish included. The edits
 *   stay pending, Publish stays enabled, and the message says what to do.
 */
export function tuningFailureKind(message: string): TuningFailureKind {
  if (message.includes(STALE_VALUE)) return 'stale-value';
  if (isRejectedToken(message)) return 'rejected-token';
  return 'other';
}
