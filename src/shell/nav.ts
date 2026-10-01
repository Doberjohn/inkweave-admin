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
  {id: 'analytics', label: 'Analytics', mark: 'An', path: '/analytics', group: 'insights', writes: false},
  {id: 'tuning', label: 'Engine tuning', mark: 'Tu', path: '/tuning', group: 'publish', writes: true},
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
