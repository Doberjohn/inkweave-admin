import type {Location} from 'react-router-dom';
import type {StudioMode} from '../../shell/nav';

/**
 * The parts of a location the studio reads. react-router's Location fits, and
 * so does a URL, which is how the tests build one.
 */
export type StudioLocation = Pick<Location, 'pathname' | 'search'>;

/** Which drafts hold unsaved edits: New reveal's form and Edit card's. */
export interface StudioDrafts {
  reveal: boolean;
  edit: boolean;
}

const NOTHING_AT_RISK: StudioDrafts = {reveal: false, edit: false};

const paramsOf = (location: StudioLocation) => new URLSearchParams(location.search);

/** The mode a studio URL opens: ?mode=edit is Edit card, anything else New reveal (studioHref's reverse). */
export function studioModeOf(location: StudioLocation): StudioMode {
  return paramsOf(location).get('mode') === 'edit' ? 'edit' : 'new';
}

/** The card a studio URL names (?card=), or null. An empty ?card= names none, as studioHref writes none. */
export function studioCardOf(location: StudioLocation): string | null {
  return paramsOf(location).get('card') || null;
}

/**
 * The drafts a navigation from `from` to `to` would drop (R-57, R-58).
 * - Leaving /studio drops every dirty draft.
 * - Inside it, another card, or none, drops the Edit draft: the editor is keyed
 *   by the card (R-59).
 * - A mode switch drops nothing: both drafts stay mounted, and studioHref keeps
 *   the card (R-57).
 */
export function draftsAtRisk(from: StudioLocation, to: StudioLocation, dirty: StudioDrafts): StudioDrafts {
  if (from.pathname !== to.pathname) return dirty;
  if (studioCardOf(from) === studioCardOf(to)) return NOTHING_AT_RISK;
  return {reveal: false, edit: dirty.edit};
}

/**
 * UnsavedChangesGuard's `leaves` for the studio: whether the navigation would
 * drop a draft. The page passes it the two drafts' `dirty` (R2-5a's hand-off).
 */
export function shouldBlockStudioNavigation(from: StudioLocation, to: StudioLocation, dirty: StudioDrafts): boolean {
  const atRisk = draftsAtRisk(from, to, dirty);
  return atRisk.reveal || atRisk.edit;
}
