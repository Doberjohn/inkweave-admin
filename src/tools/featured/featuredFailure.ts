import {isRejectedToken} from '../../github/rejectedToken';

/** The kinds of failure the Featured cards page tells apart. */
export type FeaturedFailureKind = 'stale' | 'rejected-token' | 'other';

/** commitFeatured's refusal (githubClient.ts' staleFeatured). */
const STALE = 'since this page read it';

/**
 * What a failed read of featuredCardIds.json, or a failed save, asks of the user:
 * - 'stale': the file changed on the branch after the page read it. Reload
 *   reads it again and drops the picks, which were made against the old six.
 * - 'rejected-token': GitHub answered 401, so the saved token is invalid or
 *   expired. Forgetting it brings the token gate back (R-26).
 * - 'other': anything else, the branch moving mid-save included. The picks
 *   stay, Save stays on, and the message says what to do.
 */
export function featuredFailureKind(message: string): FeaturedFailureKind {
  if (message.includes(STALE)) return 'stale';
  if (isRejectedToken(message)) return 'rejected-token';
  return 'other';
}
