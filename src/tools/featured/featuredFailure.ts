import {isRejectedToken} from '../../github/rejectedToken';
import {StaleFeaturedError} from './githubClient';

/** The kinds of failed save the Featured cards page tells apart. */
export type FeaturedFailureKind = 'stale' | 'rejected-token' | 'other';

/**
 * What a failed save asks of the user:
 * - 'stale': the file changed on the branch after the page read it
 *   (StaleFeaturedError). Reload reads it again and keeps the picks, except
 *   one of the card the file now holds in its slot.
 * - 'rejected-token': GitHub answered 401, so the saved token is invalid or
 *   expired. Forgetting it brings the token gate back (R-26).
 * - 'other': anything else, the branch moving mid-save included. The picks
 *   stay, Save stays on, and the message says what to do.
 */
export function featuredFailureKind(error: unknown): FeaturedFailureKind {
  if (error instanceof StaleFeaturedError) return 'stale';
  if (error instanceof Error && isRejectedToken(error.message)) return 'rejected-token';
  return 'other';
}
