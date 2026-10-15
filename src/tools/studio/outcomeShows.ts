/** What the outcome line under Publish or Save reads from (CommitOutcome). */
export interface ShownOutcome {
  /** The last commit that landed, or null. */
  result: {commitUrl: string} | null;
  /** The last commit's failure, or null. */
  error: string | null;
  /** How many edits the last "Load it again" dropped; null or absent before one lands (R-68). */
  dropped?: number | null;
}

/**
 * Whether the outcome line shows something: a commit, a failure, or what a
 * Load it again kept. While it does, the line is the focus target, so
 * CommitOutcome takes the page's handoff and the Editing banner leaves it
 * alone: one handoff, never two takers (R-59). Both read this one rule.
 */
export function outcomeShows({result, error, dropped = null}: ShownOutcome): boolean {
  return [result, error, dropped].some((value) => value !== null);
}
