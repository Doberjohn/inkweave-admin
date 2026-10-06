import {fmtInt} from '../../../ui/format';

/**
 * What "Reload tuning.json" did to the pending edits (R-18): the tuning
 * aside's status line once dropStale has run. A dropped edit was staged
 * against a value tuning.json no longer holds, so it has to be made again.
 */
export function reloadNote(dropped: number): string {
  if (dropped === 0) return 'Reloaded tuning.json. Every pending edit still applies.';
  if (dropped === 1) return 'Reloaded tuning.json. Dropped 1 edit whose value had changed: make it again.';
  return `Reloaded tuning.json. Dropped ${fmtInt(dropped)} edits whose values had changed: make them again.`;
}
