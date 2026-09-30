/** Small helpers shared by the reveal-sync command line. */

/** A problem the owner can act on: printed as a message rather than a stack trace. */
export class UsageError extends Error {}

export const say = (...lines) => console.log(lines.join('\n'));

/** The run's cards with this status, as [slug, card] pairs. */
export const entries = (run, status) =>
  Object.entries(run.cards).filter(([, card]) => card.status === status);

export const byNumber = ([, a], [, b]) => (a.number ?? 0) - (b.number ?? 0);
