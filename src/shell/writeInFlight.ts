import {targetBranch} from '../github/githubCommit';

/** A commit a page has in flight, in the page's own word for it. */
export interface WriteInFlight {
  action: 'publish' | 'save';
}

/**
 * What leaving mid-commit means (R2's F13 wording, shared since R-58): nothing
 * recalls the commit, and only the page that made it would show how it went.
 * /calibration's tuning publish and the studio's New card say "publish";
 * Edit card says "save".
 */
export function writeInFlightMessage({action}: WriteInFlight): string {
  return `A ${action} to ${targetBranch()} is in progress. Leaving won't stop it, and you won't see whether it landed.`;
}
