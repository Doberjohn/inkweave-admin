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
  /** Whether the draft still holds a field edit once the read lands (default false). */
  edits?: boolean;
  /** Whether a staged image stays (default false). */
  staged?: boolean;
}

/** What a read that dropped edits says: every one went with the form, or each whose field changed there. */
function droppedLine({dropped, editable = true}: LoadAgainOutcome): string {
  if (!editable) {
    const edits = dropped === 1 ? '1 edit was' : `${fmtInt(dropped)} edits were`;
    return `It can't be edited here now, so ${edits} dropped.`;
  }
  if (dropped === 1) return 'Dropped 1 edit to a field that changed there: make it again.';
  return `Dropped ${fmtInt(dropped)} edits to fields that changed there: make them again.`;
}

/**
 * What a read that dropped nothing says: that the card still holds data the
 * form can't (R-65), that every edit still applies, that the staged image
 * stays, or nothing more when the draft holds none of them (R4-8c).
 */
function keptLine({editable = true, edits = false, staged = false}: LoadAgainOutcome): string | null {
  if (!editable) return "It still holds data the form can't.";
  if (edits) return 'Every edit still applies.';
  return staged ? 'Your image is still staged.' : null;
}

/**
 * What "Load it again" did to Edit card's draft (R-68), for the outcome's
 * status line once the read lands. The card is read again from the target
 * branch, and an edit stays while its field still holds the value it started
 * from. A dropped edit's field changed on the branch, so the edit has to be
 * made again, as reloadNote says for tuning (R-18). A card that is no longer
 * editable drops every edit, whatever changed. A staged image always stays.
 * The image-only view's "Read previewCards.json again" lands here too, with no
 * field edit to keep, so the line says only what the read found and what
 * stays (R4-8c).
 */
export function loadAgainNote(outcome: LoadAgainOutcome): string {
  const read = `Loaded the card again from ${targetBranch()}.`;
  const what = outcome.dropped > 0 ? droppedLine(outcome) : keptLine(outcome);
  return what === null ? read : `${read} ${what}`;
}
