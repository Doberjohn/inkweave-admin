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
  {id: 'reveal', label: 'Reveal publisher', mark: 'Re', path: '/reveal', group: 'publish', writes: true},
  {id: 'image', label: 'Card images', mark: 'Im', path: '/image', group: 'publish', writes: true},
];

/**
 * The item whose page `pathname` is: its own path or a path under it. So
 * /reveal/ and /reveal/x belong to the reveal item, /revealed to none, and an
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
