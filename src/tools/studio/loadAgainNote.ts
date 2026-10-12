import {targetBranch} from '../../github/githubCommit';
import {fmtInt} from '../../ui/format';

/**
 * What "Load it again" did to Edit card's draft (R-68), for the outcome's
 * status line once the read lands. The card is read again from the target
 * branch, and an edit stays while its field still holds the value it started
 * from. A dropped edit's field changed on the branch, so the edit has to be
 * made again, as reloadNote says for tuning (R-18). A staged image always stays.
 */
export function loadAgainNote({dropped}: {dropped: number}): string {
  const read = `Loaded the card again from ${targetBranch()}.`;
  if (dropped === 0) return `${read} Every edit still applies.`;
  if (dropped === 1) return `${read} Dropped 1 edit to a field that changed there: make it again.`;
  return `${read} Dropped ${fmtInt(dropped)} edits to fields that changed there: make them again.`;
}
