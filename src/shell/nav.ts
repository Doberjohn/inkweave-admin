/** The sidebar's groups. 'main' heads the list, with no label. */
export type NavGroup = 'main' | 'insights' | 'publish';

export interface NavItem {
  id: string;
  label: string;
  /** Two letters for the item's mark box: all the sidebar shows of it when collapsed. */
  mark: string;
  /** The page's route. The item also owns every path under it. */
  path: string;
  group: NavGroup;
  /**
   * The page commits to the app repo (decision R-4): its header names the
   * target branch, and the sidebar shows the token box on it.
   */
  writes: boolean;
}

/** Every page the sidebar links, in sidebar order within each group. */
export const NAV_ITEMS: readonly NavItem[] = [
  {id: 'overview', label: 'Overview', mark: 'Ov', path: '/', group: 'main', writes: false},
  // The calibration analytics beside the tuning editor (R2). The editor commits tuning.json, so the page writes (R-4).
  {id: 'calibration', label: 'Calibration & tuning', mark: 'Ca', path: '/calibration', group: 'insights', writes: true},
  {id: 'activity', label: 'Vote activity', mark: 'Ac', path: '/activity', group: 'insights', writes: false},
  {id: 'web', label: 'Web analytics', mark: 'Wa', path: '/web', group: 'insights', writes: false},
  {id: 'cards', label: 'Card analytics', mark: 'Cd', path: '/cards', group: 'insights', writes: false},
  // New reveal and Edit card on one page (R4), in place of the write tools at /reveal and /image,
  // which now redirect here (R-10). Both modes commit to the app repo, so the page writes (R-4).
  {id: 'studio', label: 'Card studio', mark: 'Cs', path: '/studio', group: 'publish', writes: true},
  // The homepage's six featured cards (#95). Saving commits featuredCardIds.json to the app repo, so the page writes (R-4).
  {id: 'featured', label: 'Featured cards', mark: 'Fc', path: '/featured', group: 'publish', writes: true},
  // What changed in the app's card data and tuning, read from its history. It only reads, so it doesn't write (R-4).
  {id: 'changes', label: 'Change history', mark: 'Ch', path: '/changes', group: 'publish', writes: false},
];

/**
 * The item whose page `pathname` is: its own path or a path under it. So
 * /studio/ and /studio/x belong to Card studio, /studios to none, and an
 * item at / owns / alone.
 */
export function navItemFor(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
}

/** Whether the page at `pathname` commits to the app repo. */
export function isWritePath(pathname: string): boolean {
  return navItemFor(pathname)?.writes ?? false;
}

/**
 * The Calibration & tuning page, opened on a rule when one is given: the URL
 * its ?rule= reads. The rule is a RuleStat.ruleId or a tuning.json key.
 */
export function calibrationHref(ruleId?: string): string {
  return ruleId ? `/calibration?rule=${encodeURIComponent(ruleId)}` : '/calibration';
}

/**
 * The Card analytics page, opened on a card when one is given (R-33): what the
 * switcher, the partner links and other pages' card links navigate to. Bare
 * /cards opens the last card viewed, or the "Pick a card" prompt.
 */
export function cardsHref(cardId?: string): string {
  return cardId ? `/cards/${encodeURIComponent(cardId)}` : '/cards';
}

/** Card studio's two modes (R-57): New reveal, and Edit card. */
export type StudioMode = 'new' | 'edit';

/**
 * Card studio in a mode, opened on a card when one is given (R-81): what the
 * mode switch, the Edit search's rows, Card analytics' "Edit in Card studio"
 * and the old /reveal and /image redirects navigate to. New reveal is the bare
 * path, and the card rides along as ?card=, so a switch keeps it and Back
 * returns to the other mode (R-57). An empty id names no card.
 */
export function studioHref(mode: StudioMode, cardId?: string | null): string {
  const params = new URLSearchParams();
  if (mode === 'edit') params.set('mode', 'edit');
  if (cardId) params.set('card', cardId);
  const search = params.toString();
  return search ? `/studio?${search}` : '/studio';
}
