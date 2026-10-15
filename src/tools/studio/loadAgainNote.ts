import {targetBranch} from '../../github/githubCommit';
import {fmtInt} from '../../ui/format';

/** What a "Load it again" that landed did to the draft. */
export interface LoadAgainOutcome {
  /** How many field edits it dropped. */
  dropped: number;
  /**
   * Whether the card still opens with its fields (default true). False when
   * the entry read holds data the form can't (R-65): the card opens image-only,
   * and every field edit went with the form.
   */
  editable?: boolean;
}

/**
 * What "Load it again" did to Edit card's draft (R-68), for the outcome's
 * status line once the read lands. The card is read again from the target
 * branch, and an edit stays while its field still holds the value it started
 * from. A dropped edit's field changed on the branch, so the edit has to be
 * made again, as reloadNote says for tuning (R-18). A card that is no longer
 * editable drops every edit, whatever changed. A staged image always stays.
 */
export function loadAgainNote({dropped, editable = true}: LoadAgainOutcome): string {
  const read = `Loaded the card again from ${targetBranch()}.`;
  if (dropped === 0) return `${read} Every edit still applies.`;
  if (!editable) {
    const edits = dropped === 1 ? '1 edit was' : `${fmtInt(dropped)} edits were`;
    return `${read} It can't be edited here now, so ${edits} dropped.`;
  }
  if (dropped === 1) return `${read} Dropped 1 edit to a field that changed there: make it again.`;
  return `${read} Dropped ${fmtInt(dropped)} edits to fields that changed there: make them again.`;
}
