/** Card studio's two modes: New reveal adds a preview card, Edit card changes any card. */
export type StudioMode = 'new' | 'edit';

/** Card studio's route. */
export const STUDIO_PATH = '/studio';

/** The parts of a location the studio reads; react-router's Location has both. */
export interface StudioLocation {
  pathname: string;
  search: string;
}

/** Which of the studio's drafts hold edits that leaving would lose. */
export interface StudioDrafts {
  reveal: boolean;
  edit: boolean;
}

/**
 * The studio in a mode, on a card when one is given: '/studio',
 * '/studio?card=14023', '/studio?mode=edit', '/studio?mode=edit&card=14023'.
 * Every link into the studio, and its mode switch, goes through here. New
 * reveal keeps the card too, so switching back to Edit card returns to it.
 */
export function studioHref(mode: StudioMode, cardId?: string | null): string {
  const params = new URLSearchParams();
  if (mode === 'edit') params.set('mode', 'edit');
  if (cardId) params.set('card', cardId);
  const search = params.toString();
  return search ? `${STUDIO_PATH}?${search}` : STUDIO_PATH;
}

/** The mode a studio URL names: Edit card for ?mode=edit, New reveal for anything else. */
export function studioModeOf(params: URLSearchParams): StudioMode {
  return params.get('mode') === 'edit' ? 'edit' : 'new';
}

/** The card a studio URL names, or null. */
export function studioCardOf(params: URLSearchParams): string | null {
  return params.get('card') || null;
}

function cardAt(location: StudioLocation): string | null {
  return studioCardOf(new URLSearchParams(location.search));
}

/**
 * Whether a navigation from the studio would lose a draft, so the unsaved
 * guard asks first. Leaving the studio loses either draft. Within it, another
 * card (or none) loses the Edit card draft, and a mode switch loses nothing:
 * both drafts stay while the studio is open.
 */
export function shouldBlockStudioNavigation(current: StudioLocation, next: StudioLocation, dirty: StudioDrafts): boolean {
  if (next.pathname !== current.pathname) return dirty.reveal || dirty.edit;
  return dirty.edit && cardAt(current) !== cardAt(next);
}
