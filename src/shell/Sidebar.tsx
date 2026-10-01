import {useId, useState} from 'react';
import {NavLink, useLocation} from 'react-router-dom';
import {COLORS, CtaButton, EASING, FONTS, LETTER_SPACING, LinkButton, SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_LAYOUT, ADMIN_RADIUS, ADMIN_TYPE} from '../theme/adminTheme';
import {NAV_ITEMS, isWritePath, type NavGroup, type NavItem} from './nav';

/**
 * Where the open/collapsed choice is saved. Only that is saved: the URL says
 * which page is open, so the sidebar never restores a page.
 */
export const SIDEBAR_OPEN_KEY = 'inkweave-admin.sidebar-open';

// Below 900px the sidebar starts collapsed, whatever was saved: open, it would
// leave a phone about 130px of page.
const SMALL_SCREEN = '(max-width: 899px)';

/** The groups in sidebar order. Main has no label: its items head the list. */
const GROUPS: ReadonlyArray<{id: NavGroup; label?: string}> = [
  {id: 'main'},
  {id: 'insights', label: 'Insights'},
  {id: 'publish', label: 'Publish'},
];

function initiallyOpen(): boolean {
  // jsdom (the tests) has no matchMedia.
  if (typeof window.matchMedia === 'function' && window.matchMedia(SMALL_SCREEN).matches) return false;
  try {
    return localStorage.getItem(SIDEBAR_OPEN_KEY) !== 'false';
  } catch {
    return true;
  }
}

const brandTile: React.CSSProperties = {
  width: 28,
  height: 28,
  flex: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: ADMIN_RADIUS.control,
  background: ADMIN_COLORS.accent,
  color: ADMIN_COLORS.page,
  fontFamily: FONTS.hero,
  fontWeight: 700,
  fontSize: ADMIN_TYPE.brand,
};

const groupLabel: React.CSSProperties = {
  margin: 0,
  padding: `0 ${SPACING.sm}px ${SPACING.xs}px`,
  fontSize: ADMIN_TYPE.micro,
  fontWeight: 700,
  letterSpacing: LETTER_SPACING.eyebrow,
  textTransform: 'uppercase',
  // Muted, not dim: the label tells the groups apart (R-6).
  color: ADMIN_COLORS.muted,
  whiteSpace: 'nowrap',
};

const list: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.xxs,
};

const tokenBox: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  border: `1px solid ${ADMIN_COLORS.inputBorder}`,
  borderRadius: ADMIN_RADIUS.box,
};

const tokenDot: React.CSSProperties = {
  width: 8,
  height: 8,
  flex: 'none',
  borderRadius: ADMIN_RADIUS.pill,
  background: COLORS.success,
};

/**
 * One page link. AdminStyles' adm-nav-item gives it the hover, focus and
 * current styles (NavLink sets aria-current="page"). Collapsed, only the mark
 * shows, so the label becomes the link's name and tooltip.
 */
function NavItemLink({item, open}: {item: NavItem; open: boolean}) {
  return (
    <NavLink
      to={item.path}
      className="adm-nav-item"
      aria-label={open ? undefined : item.label}
      title={open ? undefined : item.label}>
      <span className="adm-nav-mark" aria-hidden="true">
        {item.mark}
      </span>
      {open && <span>{item.label}</span>}
    </NavLink>
  );
}

/**
 * The saved token's status and a Forget token control. Token state is shared
 * (useGithubToken), so forgetting it here sends the open page back to its
 * token gate. It is the only Forget token: the write pages have none of their
 * own.
 */
function TokenBox({open, onForget}: {open: boolean; onForget: () => void}) {
  if (!open) {
    // Collapsed: no room for the status line, but Forget token stays reachable.
    return (
      <div
        title="GitHub token saved"
        style={{...tokenBox, alignItems: 'center', gap: SPACING.xs, padding: `${SPACING.sm}px 0`}}>
        <span aria-hidden="true" style={tokenDot} />
        <LinkButton tone="muted" size="sm" aria-label="Forget token" onClick={onForget}>
          Forget
        </LinkButton>
      </div>
    );
  }
  return (
    <div style={{...tokenBox, gap: SPACING.xs, padding: SPACING.md, fontSize: ADMIN_TYPE.small, whiteSpace: 'nowrap'}}>
      <p style={{margin: 0, display: 'flex', alignItems: 'center', gap: SPACING.sm, color: ADMIN_COLORS.muted}}>
        <span aria-hidden="true" style={tokenDot} />
        GitHub token saved
      </p>
      <LinkButton tone="muted" onClick={onForget} style={{alignSelf: 'flex-start', fontSize: ADMIN_TYPE.small}}>
        Forget token
      </LinkButton>
    </div>
  );
}

interface SidebarProps {
  /** A GitHub token is saved, so pages that write show the token box. */
  tokenSaved: boolean;
  onForgetToken: () => void;
}

/**
 * Admin's navigation, beside every page: the brand, the pages in their groups,
 * the token box on pages that write, and the collapse toggle (240px open, 64px
 * collapsed). The open state is saved. Below 900px the sidebar starts
 * collapsed, whatever was saved; at 900px and wider the saved choice wins.
 * Both are read once, at mount: resizing or rotating across 900px later leaves
 * the sidebar as it is, until the toggle or a reload.
 */
export function Sidebar({tokenSaved, onForgetToken}: SidebarProps) {
  const {pathname} = useLocation();
  const [open, setOpen] = useState(initiallyOpen);
  const sidebarId = useId();

  function toggle() {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(SIDEBAR_OPEN_KEY, String(next));
    } catch {
      /* storage unavailable: the choice lasts until the page reloads */
    }
  }

  return (
    <aside
      id={sidebarId}
      aria-label="Admin sidebar"
      style={{
        width: open ? ADMIN_LAYOUT.sidebarOpen : ADMIN_LAYOUT.sidebarCollapsed,
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.xxl,
        padding: `${SPACING.lg}px ${SPACING.md}px`,
        // A translucent fill under a border: clip it to the padding box (adminTheme.ts).
        backgroundColor: ADMIN_COLORS.sidebar,
        backgroundClip: 'padding-box',
        borderRight: `1px solid ${ADMIN_COLORS.inputBorder}`,
        overflowX: 'hidden',
        overflowY: 'auto',
        transition: `width 0.2s ${EASING.smooth}`,
      }}>
      <div style={{display: 'flex', alignItems: 'center', gap: SPACING.md, height: 36, padding: `0 ${SPACING.xs}px`, flex: 'none'}}>
        <span aria-hidden="true" style={brandTile}>
          I
        </span>
        {open && (
          <p style={{margin: 0, display: 'flex', alignItems: 'baseline', gap: SPACING.xs, whiteSpace: 'nowrap'}}>
            <span style={{fontFamily: FONTS.hero, fontWeight: 700, fontSize: ADMIN_TYPE.brand}}>Inkweave</span>
            <span style={{fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>admin</span>
          </p>
        )}
      </div>

      <nav aria-label="Admin" style={{flex: 1, display: 'flex', flexDirection: 'column', gap: SPACING.xl}}>
        {GROUPS.map((group) => {
          const items = NAV_ITEMS.filter((item) => item.group === group.id);
          if (items.length === 0) return null;
          return (
            <div key={group.id}>
              {/* The list carries the group's name, so the visible label is hidden from assistive tech (no double read). */}
              {open && group.label && (
                <p aria-hidden="true" style={groupLabel}>
                  {group.label}
                </p>
              )}
              <ul aria-label={group.label} style={list}>
                {items.map((item) => (
                  <li key={item.id}>
                    <NavItemLink item={item} open={open} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      {tokenSaved && isWritePath(pathname) && <TokenBox open={open} onForget={onForgetToken} />}

      {/* The kit's neutral button: its hover warms to gold rather than the handoff's grey. */}
      <CtaButton
        variant="neutral"
        aria-expanded={open}
        aria-controls={sidebarId}
        aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
        title={open ? undefined : 'Expand sidebar'}
        onClick={toggle}
        style={{
          flex: 'none',
          minHeight: 36,
          justifyContent: open ? 'flex-start' : 'center',
          gap: SPACING.md,
          padding: `0 ${SPACING.xs}px`,
          borderRadius: ADMIN_RADIUS.control,
          fontSize: ADMIN_TYPE.small,
          whiteSpace: 'nowrap',
        }}>
        <span aria-hidden="true" style={{width: 24, textAlign: 'center', fontSize: ADMIN_TYPE.body}}>
          {open ? '«' : '»'}
        </span>
        {open && <span>Collapse</span>}
      </CtaButton>
    </aside>
  );
}
