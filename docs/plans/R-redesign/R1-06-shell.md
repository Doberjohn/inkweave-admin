> Part of [R: Admin redesign](../R-redesign.md). Read its decisions, corrections to the spec, global constraints and shared interfaces first.

**Contract additions** (R1-6 needs these. Nothing in the contract is renamed.)

1. **`Sidebar` props and one exported constant.** `src/shell/Sidebar.tsx` exports `Sidebar(props: {tokenSaved: boolean; onForgetToken: () => void})` and `SIDEBAR_OPEN_KEY = 'inkweave-admin.sidebar-open'`. The key is a string literal, which `react-refresh` allows next to a component. `AdminShell` calls `useGithubToken()` and passes `Boolean(token)` and `clearToken` down. This keeps the sidebar testable and storyable without mocking the token store.
2. **`BranchNotice(props: {label?: string})`.** `label` defaults to `'Writes to Doberjohn/inkweave'`. `PageLayout` passes its `branchLabel` through.
3. **New interim file `src/shell/WriteToolFrame.tsx`**, exporting `WriteToolFrame(props: {children: React.ReactNode})`. Add it to the plan's "File structure (R1)".
   - `RevealPage`, `ImagePage` and `TuningPage` stay unchanged. Each still renders its own h1, and its own `<main>` once a token is saved. Each also keeps its own "Forget token" button. The frame adds the header strip with the branch notice (R-4) above them, without nesting a second `<main>`.
   - R1-7 moves all three pages into `PageLayout` and deletes `WriteToolFrame`. Until then, `/reveal`, `/image` and `/tuning` stay wrapped in it.
4. **Layout rules.**
   - `PageLayout` renders the page's only `<main>` (`height: 100%`, its header, then a scrolling body). Pages built on it must not render their own `<main>`.
   - `AdminShell`'s main column is a plain block scroll container (`flex: 1; min-width: 0; overflow-y: auto`), not a column flexbox. A page not yet in `PageLayout` (today's `AnalyticsPage`) still scrolls, and still centres with `margin: 0 auto`.
5. **Token store assumption.** `useGithubToken()` must be a module-level shared store that needs no provider in the tree. `src/shell/AdminShell.test.tsx` checks that the sidebar's "Forget token" sends the page back to its gate. It seeds the token in `localStorage` before the first render, as `TuningPage.test.tsx` already does.
6. **The R-4 wording in CLAUDE.md and `.env.example` lands in this task.**

### Task R1-6: Sidebar shell, page layout and routes

**Files:**
- Create: `src/shell/nav.ts`, `src/shell/BranchNotice.tsx`, `src/shell/PageLayout.tsx`, `src/shell/PageLayout.stories.tsx`, `src/shell/Sidebar.tsx`, `src/shell/Sidebar.stories.tsx`, `src/shell/WriteToolFrame.tsx`
- Modify (whole-file rewrites):
  - `src/shell/AdminShell.tsx` (lines 1–61: the top `<header>` with the `Admin tools` nav and the branch line)
  - `src/shell/NotFound.tsx` (lines 1–17)
  - `src/router.tsx` (lines 1–27, or 1–25 after R1-1 removed the banner route)
  - `src/router.test.tsx` (the whole file)
- Modify: `CLAUDE.md:16` (its last sentence), `.env.example:6-7` (the comment's last sentence)
- Delete: `src/shell/ToolIndex.tsx`, `src/shell/ToolIndex.test.tsx`, `src/shell/ToolIndex.stories.tsx`, `src/shell/tools.ts`
- Test: `src/shell/nav.test.ts`, `src/shell/PageLayout.test.tsx`, `src/shell/Sidebar.test.tsx`, `src/shell/AdminShell.test.tsx`, `src/router.test.tsx`

**Interfaces:**
- Consumes:
  - From `src/theme/adminTheme.ts`:
    - `ADMIN_COLORS`: `page`, `sidebar`, `border`, `inputBorder`, `text`, `muted`, `accent`, `accentTintSoft`, `accentBorder`
    - `ADMIN_TYPE`: `micro`, `small`, `body`, `emphasis`, `brand`, `pageTitle`
    - `ADMIN_RADIUS`: `control`, `box`, `pill`
    - `ADMIN_LAYOUT`: `sidebarOpen`, `sidebarCollapsed`, `headerMinHeight`
  - `AdminStyles` from `src/theme/AdminStyles.tsx`, with its `adm-nav-item` and `adm-nav-mark` classes. `adm-nav-item` is the 36px flex row (mark plus label) with `:hover`, `:focus-visible` and the `[aria-current="page"]` active state. `adm-nav-mark` is the 24px mark box, with its active colours under `[aria-current="page"]`.
  - `useGithubToken()` (shared state) from `src/github/useGithubToken.ts`.
  - `targetBranch()` from `src/github/githubCommit.ts`.
  - Bridged: `CardDataProvider`, `COLORS`, `CtaButton`, `LinkButton`, `EASING`, `FONTS`, `LETTER_SPACING`, `SPACING`.
  - Unchanged pages: `AnalyticsPage`, `RevealPage`, `ImagePage`, `TuningPage`.
- Produces:
  - From the contract: `NavGroup`, `NavItem`, `NAV_ITEMS`, `navItemFor`, `isWritePath` (`src/shell/nav.ts`) and `PageLayout`.
  - Additions: `Sidebar` (props above), `SIDEBAR_OPEN_KEY`, `BranchNotice`, `WriteToolFrame`.
  - The interim routes: `/` → `/analytics`, `analytics`, `reveal`, `image`, `tuning`, `*`.

Each code block below passed `pnpm exec eslint --stdin --stdin-filename <its path>` during planning with no errors, including the `inkweave/*`, `jsx-a11y` and React Compiler rules.

The engine build from the earlier R1 tasks is enough for the single-file runs below. On a fresh worktree, run `pnpm build:engine` once first.

- [ ] **Step 1: Write the failing nav test**

Create `src/shell/nav.test.ts`:

```ts
import {NAV_ITEMS, isWritePath, navItemFor} from './nav';

describe('navItemFor', () => {
  it.each([
    ['/reveal', 'reveal'],
    ['/reveal/', 'reveal'],
    ['/analytics/anything', 'analytics'],
  ])('gives %s to the %s item', (pathname, id) => {
    expect(navItemFor(pathname)?.id).toBe(id);
  });

  it.each(['/imagery', '/no-such-page'])('gives %s to no item', (pathname) => {
    expect(navItemFor(pathname)).toBeUndefined();
  });
});

describe('isWritePath', () => {
  it.each(['/tuning', '/reveal', '/image/'])('%s writes to the app', (pathname) => {
    expect(isWritePath(pathname)).toBe(true);
  });

  it.each(['/analytics', '/no-such-page'])('%s writes nothing', (pathname) => {
    expect(isWritePath(pathname)).toBe(false);
  });
});

describe('NAV_ITEMS', () => {
  it('gives every item its own id and path, and a two-letter mark', () => {
    expect(new Set(NAV_ITEMS.map((item) => item.id)).size).toBe(NAV_ITEMS.length);
    expect(new Set(NAV_ITEMS.map((item) => item.path)).size).toBe(NAV_ITEMS.length);
    for (const item of NAV_ITEMS) expect(item.mark).toMatch(/^[A-Z][a-z]$/);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/shell/nav.test.ts`
Expected: FAIL with `Error: Failed to resolve import "./nav" from "src/shell/nav.test.ts". Does the file exist?`

- [ ] **Step 3: Write `src/shell/nav.ts`**

```ts
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
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm vitest run src/shell/nav.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Write the failing PageLayout test**

Create `src/shell/PageLayout.test.tsx`:

```tsx
import {render, screen, within} from '@testing-library/react';
import {PageLayout} from './PageLayout';

afterEach(() => vi.unstubAllEnvs());

describe('PageLayout', () => {
  it("puts the page's header and body in the main landmark", () => {
    render(
      <PageLayout
        title="Vote activity"
        subtitle="Who votes, and on what."
        meta="Data as of 2026-09-30"
        actions={<button type="button">Refresh</button>}>
        <p>Body</p>
      </PageLayout>,
    );
    const main = within(screen.getByRole('main'));
    expect(main.getByRole('heading', {level: 1, name: 'Vote activity'})).toBeInTheDocument();
    expect(main.getByText('Who votes, and on what.')).toBeInTheDocument();
    expect(main.getByText('Data as of 2026-09-30')).toBeInTheDocument();
    expect(main.getByRole('button', {name: 'Refresh'})).toBeInTheDocument();
    expect(main.getByText('Body')).toBeInTheDocument();
  });

  it('names no branch on a page that writes nothing', () => {
    render(
      <PageLayout title="Web analytics">
        <p>Body</p>
      </PageLayout>,
    );
    expect(screen.queryByText('Writes to Doberjohn/inkweave')).not.toBeInTheDocument();
  });

  it('names the branch a page that writes commits to', () => {
    render(
      <PageLayout title="Card studio" writes>
        <p>Body</p>
      </PageLayout>,
    );
    expect(screen.getByText('Writes to Doberjohn/inkweave')).toHaveTextContent('Writes to Doberjohn/inkweave master');
  });

  it("takes the page's own label, and names a rehearsal branch", () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    render(
      <PageLayout title="Calibration & tuning" writes branchLabel="Tuning writes to">
        <p>Body</p>
      </PageLayout>,
    );
    expect(screen.getByText('Tuning writes to')).toHaveTextContent('Tuning writes to admin-verify');
  });
});
```

- [ ] **Step 6: Run it and watch it fail**

Run: `pnpm vitest run src/shell/PageLayout.test.tsx`
Expected: FAIL with `Error: Failed to resolve import "./PageLayout" from "src/shell/PageLayout.test.tsx". Does the file exist?`

- [ ] **Step 7: Write `src/shell/BranchNotice.tsx`**

```tsx
import {SPACING} from '../app-bridge';
import {targetBranch} from '../github/githubCommit';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../theme/adminTheme';

const PILL: React.CSSProperties = {
  margin: 0,
  display: 'inline-flex',
  alignItems: 'center',
  gap: SPACING.sm,
  minHeight: 32,
  padding: `0 ${SPACING.md}px`,
  borderRadius: ADMIN_RADIUS.pill,
  // A translucent fill under a border: clip it to the padding box (adminTheme.ts).
  backgroundColor: ADMIN_COLORS.accentTintSoft,
  backgroundClip: 'padding-box',
  border: `1px solid ${ADMIN_COLORS.accentBorder}`,
  color: ADMIN_COLORS.text,
  fontSize: ADMIN_TYPE.small,
  whiteSpace: 'nowrap',
};

const DOT: React.CSSProperties = {
  width: 6,
  height: 6,
  flex: 'none',
  borderRadius: ADMIN_RADIUS.pill,
  background: ADMIN_COLORS.accent,
};

/**
 * The pill that names the app branch a page commits to. Only pages that write
 * show it (decision R-4). The branch comes from targetBranch(), so a rehearsal
 * (VITE_ADMIN_TARGET_BRANCH) shows its own branch here, not master.
 */
export function BranchNotice({label = 'Writes to Doberjohn/inkweave'}: {label?: string}) {
  return (
    <p style={PILL}>
      <span aria-hidden="true" style={DOT} />
      {/* <code> gives the branch the UA monospace with no font declaration (R-7). */}
      <span>
        {label} <code style={{color: ADMIN_COLORS.accent}}>{targetBranch()}</code>
      </span>
    </p>
  );
}
```

- [ ] **Step 8: Write `src/shell/PageLayout.tsx`**

```tsx
import {FONTS, SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_LAYOUT, ADMIN_TYPE} from '../theme/adminTheme';
import {BranchNotice} from './BranchNotice';

// Side padding: 32px on a desktop, easing to 16px on a phone.
const GUTTER = `clamp(${SPACING.lg}px, 4vw, ${SPACING.xxxl}px)`;

// The page fills the shell's main column, so only the body scrolls and the header stays put.
const MAIN: React.CSSProperties = {height: '100%', display: 'flex', flexDirection: 'column'};

const HEADER: React.CSSProperties = {
  flex: 'none',
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: `${SPACING.md}px ${SPACING.lg}px`,
  minHeight: ADMIN_LAYOUT.headerMinHeight,
  padding: `${SPACING.md}px ${GUTTER}`,
  borderBottom: `1px solid ${ADMIN_COLORS.border}`,
};

const TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: FONTS.hero,
  fontSize: ADMIN_TYPE.pageTitle,
  fontWeight: 400,
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
};

const SUBTITLE: React.CSSProperties = {
  margin: `${SPACING.xxs}px 0 0`,
  fontSize: ADMIN_TYPE.body,
  color: ADMIN_COLORS.muted,
};

const SIDE: React.CSSProperties = {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.md};

const META: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

// A single-column grid, not a column flexbox: flex children with overflow:hidden
// collapse to nothing there (handoff README, section 1).
const BODY: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  alignContent: 'start',
  gap: SPACING.xxl,
  padding: `${SPACING.xxl}px ${GUTTER}`,
};

interface PageLayoutProps {
  title: string;
  subtitle?: React.ReactNode;
  /** Right of the title, before any actions; phrasing content only (it renders in a <p>), e.g. "Data as of <code>2026-09-30</code>". */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  /** The page commits to the app repo: its header shows the BranchNotice. */
  writes?: boolean;
  /** BranchNotice's label when the default doesn't fit, e.g. "Tuning writes to". */
  branchLabel?: string;
  children: React.ReactNode;
}

/**
 * Every admin page's frame: a header with the page's h1, subtitle, meta,
 * actions and (on pages that write) the branch notice, over a scrolling body
 * that stacks the page's sections. It renders the page's only <main>.
 */
export function PageLayout({title, subtitle, meta, actions, writes = false, branchLabel, children}: PageLayoutProps) {
  const hasSide = meta != null || actions != null || writes;
  return (
    <main style={MAIN}>
      <header style={HEADER}>
        <div>
          <h1 style={TITLE}>{title}</h1>
          {subtitle != null && <p style={SUBTITLE}>{subtitle}</p>}
        </div>
        {hasSide && (
          <div style={SIDE}>
            {meta != null && <p style={META}>{meta}</p>}
            {actions}
            {writes && <BranchNotice label={branchLabel} />}
          </div>
        )}
      </header>
      <div style={BODY}>{children}</div>
    </main>
  );
}
```

- [ ] **Step 9: Run it and watch it pass**

Run: `pnpm vitest run src/shell/PageLayout.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 10: Write the failing Sidebar test**

Create `src/shell/Sidebar.test.tsx`:

```tsx
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {Sidebar} from './Sidebar';

// Pinned here, not imported: renaming the key would silently reset everyone's choice.
const KEY = 'inkweave-admin.sidebar-open';

function renderSidebar({path = '/analytics', tokenSaved = false, onForgetToken = () => {}} = {}) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar tokenSaved={tokenSaved} onForgetToken={onForgetToken} />
    </MemoryRouter>,
  );
}

const nav = () => within(screen.getByRole('navigation', {name: 'Admin'}));
const hrefs = (group: string) =>
  within(screen.getByRole('list', {name: group}))
    .getAllByRole('link')
    .map((link) => link.getAttribute('href'));

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('Sidebar', () => {
  it('lists the pages under their group labels', () => {
    renderSidebar();
    expect(screen.getByText('Insights')).toBeInTheDocument();
    expect(hrefs('Insights')).toEqual(['/analytics']);
    expect(hrefs('Publish')).toEqual(['/tuning', '/reveal', '/image']);
    // The mark is aria-hidden: the exact name proves it stays out of the link's name.
    expect(nav().getByRole('link', {name: 'Reveal publisher'})).toHaveAttribute('href', '/reveal');
  });

  it('marks the current page', () => {
    renderSidebar({path: '/reveal'});
    expect(nav().getByRole('link', {name: 'Reveal publisher'})).toHaveAttribute('aria-current', 'page');
    expect(nav().getByRole('link', {name: 'Card images'})).not.toHaveAttribute('aria-current');
  });

  it('shows the token box on a page that writes, and forgets the token from it', async () => {
    const onForgetToken = vi.fn();
    renderSidebar({path: '/image', tokenSaved: true, onForgetToken});
    expect(screen.getByText('GitHub token saved')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Forget token'}));
    expect(onForgetToken).toHaveBeenCalledOnce();
  });

  it.each([
    ['a page that writes, with no token saved', '/image', false],
    ['a read-only page, even with a token saved', '/analytics', true],
  ])('shows no token box on %s', (_case, path, tokenSaved) => {
    renderSidebar({path, tokenSaved});
    expect(screen.queryByText('GitHub token saved')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Forget token'})).not.toBeInTheDocument();
  });

  it('collapses to marks that keep their names, and saves the choice', async () => {
    renderSidebar();
    const toggle = screen.getByRole('button', {name: 'Collapse sidebar'});
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-controls', screen.getByRole('complementary', {name: 'Admin sidebar'}).id);

    await userEvent.click(toggle);

    expect(screen.getByRole('button', {name: 'Expand sidebar'})).toHaveAttribute('aria-expanded', 'false');
    const link = nav().getByRole('link', {name: 'Reveal publisher'});
    expect(link).toHaveTextContent(/^Re$/);
    expect(link).toHaveAttribute('title', 'Reveal publisher');
    expect(screen.queryByText('Insights')).not.toBeInTheDocument();
    expect(screen.getByRole('list', {name: 'Insights'})).toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBe('false');
  });

  it('keeps Forget token reachable when collapsed', async () => {
    localStorage.setItem(KEY, 'false');
    const onForgetToken = vi.fn();
    renderSidebar({path: '/tuning', tokenSaved: true, onForgetToken});
    await userEvent.click(screen.getByRole('button', {name: 'Forget token'}));
    expect(onForgetToken).toHaveBeenCalledOnce();
  });

  it('starts collapsed when that was saved', () => {
    localStorage.setItem(KEY, 'false');
    renderSidebar();
    expect(screen.getByRole('button', {name: 'Expand sidebar'})).toBeInTheDocument();
  });

  it('starts collapsed below 900px, whatever was saved', () => {
    localStorage.setItem(KEY, 'true');
    const matchMedia = vi.fn((query: string) => ({matches: query === '(max-width: 899px)'}));
    vi.stubGlobal('matchMedia', matchMedia);
    renderSidebar();
    expect(matchMedia).toHaveBeenCalledWith('(max-width: 899px)');
    expect(screen.getByRole('button', {name: 'Expand sidebar'})).toBeInTheDocument();
  });

  it('starts open at 900px and wider', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({matches: false})));
    renderSidebar();
    expect(screen.getByRole('button', {name: 'Collapse sidebar'})).toHaveAttribute('aria-expanded', 'true');
  });

  it('starts collapsed at 900px and wider when that was saved: the saved choice beats the open default', () => {
    localStorage.setItem(KEY, 'false');
    vi.stubGlobal('matchMedia', vi.fn(() => ({matches: false})));
    renderSidebar();
    expect(screen.getByRole('button', {name: 'Expand sidebar'})).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens, and still toggles, when storage is unavailable', async () => {
    const denied = () => {
      throw new Error('storage denied');
    };
    vi.stubGlobal('localStorage', {getItem: denied, setItem: denied});
    renderSidebar();
    await userEvent.click(screen.getByRole('button', {name: 'Collapse sidebar'}));
    expect(screen.getByRole('button', {name: 'Expand sidebar'})).toBeInTheDocument();
  });
});
```

- [ ] **Step 11: Run it and watch it fail**

Run: `pnpm vitest run src/shell/Sidebar.test.tsx`
Expected: FAIL with `Error: Failed to resolve import "./Sidebar" from "src/shell/Sidebar.test.tsx". Does the file exist?`

- [ ] **Step 12: Write `src/shell/Sidebar.tsx`**

```tsx
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
 * token gate. The write pages keep their own Forget token buttons until they
 * are rebuilt (tuning in R2, reveal and image in R4), and both stay in step.
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
```

The toggle's visible text "Collapse" is part of its accessible name "Collapse sidebar", so the label-in-name rule holds.

- [ ] **Step 13: Run it and watch it pass**

Run: `pnpm vitest run src/shell/Sidebar.test.tsx`
Expected: PASS, 12 tests.

- [ ] **Step 14: Write the failing shell and route tests**

Create `src/shell/AdminShell.test.tsx`:

```tsx
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import {TuningPage} from '../tools/tuning/TuningPage';
import {AdminShell} from './AdminShell';

function renderShellAt(path: string) {
  const routes = [{element: <AdminShell />, children: [{path: 'tuning', element: <TuningPage />}]}];
  render(<RouterProvider router={createMemoryRouter(routes, {initialEntries: [path]})} />);
}

beforeEach(() => {
  // The card data and tuning.json loads never settle; the test is about the token.
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
  localStorage.setItem('inkweave.reveal-admin.gh-token', 'tok');
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('AdminShell', () => {
  it('forgets the token from the sidebar, which sends the page back to its gate', async () => {
    renderShellAt('/tuning');
    const sidebar = within(screen.getByRole('complementary', {name: 'Admin sidebar'}));
    expect(sidebar.getByText('GitHub token saved')).toBeInTheDocument();
    expect(screen.queryByRole('heading', {name: 'Tuning admin'})).not.toBeInTheDocument();

    await userEvent.click(sidebar.getByRole('button', {name: 'Forget token'}));

    expect(screen.getByRole('heading', {level: 1, name: 'Tuning admin'})).toBeInTheDocument();
    expect(sidebar.queryByText('GitHub token saved')).not.toBeInTheDocument();
  });
});
```

Replace the whole of `src/router.test.tsx`. Today it imports `ADMIN_TOOLS` from `./shell/tools` and asserts:
- the `Tools` h1 at `/`
- a `navigation` named `Admin tools` that links every `ADMIN_TOOLS` entry
- `aria-current` on a tool's link across its pages
- the branch name at `/`, plus a rehearsal branch
- the three token gates
- the `Engine Calibration` h1 at `/analytics`

(R1-1 already dropped its banner cases.) The new file:

```tsx
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import {routes} from './router';
import {NAV_ITEMS} from './shell/nav';

function renderAt(path: string) {
  return render(<RouterProvider router={createMemoryRouter(routes, {initialEntries: [path]})} />);
}

const sidebarNav = () => within(screen.getByRole('navigation', {name: 'Admin'}));
const WRITE_PATHS = NAV_ITEMS.filter((item) => item.writes).map((item) => item.path);

beforeEach(() => {
  // The shell's CardDataProvider loads the card data on mount, and the
  // analytics page its artifacts. These tests only check routing, so those
  // fetches never settle.
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe('admin routes', () => {
  it('sends / to analytics until the Overview exists', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', {level: 1, name: 'Engine Calibration'})).toBeInTheDocument();
    expect(sidebarNav().getByRole('link', {name: 'Analytics'})).toHaveAttribute('aria-current', 'page');
  });

  it('links every page from the sidebar', () => {
    renderAt('/analytics');
    for (const item of NAV_ITEMS) {
      expect(sidebarNav().getByRole('link', {name: item.label})).toHaveAttribute('href', item.path);
    }
  });

  it("marks only the current page's link", () => {
    renderAt('/tuning');
    expect(sidebarNav().getByRole('link', {name: 'Engine tuning'})).toHaveAttribute('aria-current', 'page');
    expect(sidebarNav().getByRole('link', {name: 'Analytics'})).not.toHaveAttribute('aria-current');
  });

  it.each(WRITE_PATHS)('names the branch %s writes to', (path) => {
    renderAt(path);
    expect(screen.getByText('Writes to Doberjohn/inkweave')).toHaveTextContent('Writes to Doberjohn/inkweave master');
  });

  it('names a rehearsal branch when one is set', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    renderAt('/reveal');
    expect(screen.getByText('admin-verify')).toBeInTheDocument();
  });

  it.each(['/analytics', '/no-such-page'])('names no branch on %s, which writes nothing', (path) => {
    renderAt(path);
    expect(screen.queryByText('Writes to Doberjohn/inkweave')).not.toBeInTheDocument();
  });

  it('shows a not-found page for any other path', () => {
    renderAt('/admin/reveal');
    expect(screen.getByRole('heading', {level: 1, name: 'Not found'})).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'Back to Overview'})).toHaveAttribute('href', '/');
  });

  it.each([
    ['/reveal', 'Reveal admin'],
    ['/image', 'Card image admin'],
    ['/tuning', 'Tuning admin'],
  ])('asks for a GitHub token before %s', (path, title) => {
    renderAt(path);
    expect(screen.getByRole('heading', {level: 1, name: title})).toBeInTheDocument();
  });

  it('keeps the sidebar collapsed across reloads', async () => {
    const first = renderAt('/analytics');
    await userEvent.click(screen.getByRole('button', {name: 'Collapse sidebar'}));
    first.unmount();

    renderAt('/analytics');
    expect(screen.getByRole('button', {name: 'Expand sidebar'})).toHaveAttribute('aria-expanded', 'false');
    expect(sidebarNav().getByRole('link', {name: 'Analytics'})).toHaveAttribute('title', 'Analytics');
  });
});
```

- [ ] **Step 15: Run them and watch them fail**

Run: `pnpm vitest run src/shell/AdminShell.test.tsx src/router.test.tsx`
Expected: FAIL.
- `AdminShell.test.tsx` fails with `Unable to find an accessible element with the role "complementary" and name "Admin sidebar"`.
- In `router.test.tsx`, the cases that look for the sidebar, the branch notice and `Back to Overview` fail, and so does the case that needs the `Collapse sidebar` button. `/` still shows the Tools index, so `findByRole(... 'Engine Calibration')` times out.
- The three token-gate cases, the rehearsal case and the two no-branch cases already pass.

- [ ] **Step 16: Write `src/shell/WriteToolFrame.tsx`**

```tsx
import {SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_LAYOUT} from '../theme/adminTheme';
import {BranchNotice} from './BranchNotice';

/**
 * Frames a write tool that still renders its own page (RevealPage, ImagePage,
 * TuningPage: each renders its own h1, and its own <main> once a token is
 * saved; the token gate has none): a header strip with the branch notice, and
 * the page scrolling under it. Interim: R1-7 moves all three pages into
 * PageLayout and deletes this file.
 */
export function WriteToolFrame({children}: {children: React.ReactNode}) {
  return (
    <div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
      <div
        style={{
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          minHeight: ADMIN_LAYOUT.headerMinHeight,
          // PageLayout's header padding, so the notice sits where it will on the rebuilt pages.
          padding: `${SPACING.md}px clamp(${SPACING.lg}px, 4vw, ${SPACING.xxxl}px)`,
          borderBottom: `1px solid ${ADMIN_COLORS.border}`,
        }}>
        <BranchNotice />
      </div>
      <div style={{flex: 1, minHeight: 0, overflowY: 'auto'}}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 17: Rewrite `src/shell/AdminShell.tsx`**

This replaces the whole file (lines 1–61). These lines go:
- the imports of `Link`, `NavLink`, `useLocation`, `FONT_SIZES`, `SPACING`, `targetBranch` and `{ADMIN_TOOLS, isToolRoute} from './tools'`
- `navLinkStyle`
- the `const {pathname} = useLocation();` line
- the top bar. Lines 27–57 read today:

```tsx
        <div style={{fontFamily: FONTS.body, color: COLORS.text}}>
          <header
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: SPACING.md,
              padding: `${SPACING.md}px ${SPACING.xxl}px`,
              borderBottom: `1px solid ${COLORS.surfaceBorder}`,
            }}>
            <nav aria-label="Admin tools" style={{display: 'flex', flexWrap: 'wrap', gap: SPACING.lg}}>
              <NavLink to="/" end style={navLinkStyle}>
                Tools
              </NavLink>
              {/* A tool's link stays current on all of its pages (isToolRoute), not just its own path. */}
              {ADMIN_TOOLS.map((tool) => {
                const active = isToolRoute(tool, pathname);
                return (
                  <Link key={tool.id} to={tool.path} aria-current={active ? 'page' : undefined} style={navLinkStyle({isActive: active})}>
                    {tool.name}
                  </Link>
                );
              })}
            </nav>
            <p style={{margin: 0, fontSize: FONT_SIZES.sm, color: COLORS.textMuted}}>
              Writes go to Doberjohn/inkweave <code style={{color: COLORS.primary}}>{targetBranch()}</code>
            </p>
          </header>
          <Outlet />
        </div>
```

The new file:

```tsx
import {Outlet} from 'react-router-dom';
import {SkeletonTheme} from 'react-loading-skeleton';
import {CardDataProvider, COLORS, FONTS} from '../app-bridge';
import {useGithubToken} from '../github/useGithubToken';
import {AdminStyles} from '../theme/AdminStyles';
import {ADMIN_COLORS} from '../theme/adminTheme';
import {Sidebar} from './Sidebar';

/**
 * The layout every admin route renders in: the sidebar beside the page, the
 * app's card data and admin's scoped styles. Unlike the public app's layout it
 * has no public nav, Vercel Analytics or Speed Insights (docs/PLAN.md, 4.1).
 */
export function AdminShell() {
  // The token store is shared, so Forget token in the sidebar also sends the
  // page beside it back to its token gate.
  const {token, clearToken} = useGithubToken();
  return (
    // The app mounts one SkeletonTheme for all of its skeletons (AppLayout.tsx); admin does the same here.
    <SkeletonTheme baseColor={COLORS.surfaceAlt} highlightColor={COLORS.surfaceHover}>
      <CardDataProvider>
        <AdminStyles />
        <div
          style={{
            display: 'flex',
            height: '100dvh',
            overflow: 'hidden',
            background: ADMIN_COLORS.page,
            color: ADMIN_COLORS.text,
            fontFamily: FONTS.body,
          }}>
          <Sidebar tokenSaved={Boolean(token)} onForgetToken={clearToken} />
          {/* PageLayout fills this column and scrolls its own body. A page that
              isn't in PageLayout yet (AnalyticsPage) scrolls the column. */}
          <div style={{flex: 1, minWidth: 0, overflowY: 'auto'}}>
            <Outlet />
          </div>
        </div>
      </CardDataProvider>
    </SkeletonTheme>
  );
}
```

- [ ] **Step 18: Rewrite `src/shell/NotFound.tsx`**

Replace the whole file. Today it reads:

```tsx
import {Link} from 'react-router-dom';
import {COLORS, FONTS, FONT_SIZES, SPACING} from '../app-bridge';

/** Any path that isn't a tool. */
export function NotFound() {
  return (
    <main style={{maxWidth: 960, margin: '0 auto', padding: SPACING.xxxl}}>
      <h1 style={{fontFamily: FONTS.hero, fontSize: FONT_SIZES.displaySm, margin: 0}}>Not found</h1>
      <p style={{color: COLORS.textMuted, fontSize: FONT_SIZES.lg}}>
        No admin tool lives at this address.{' '}
        <Link to="/" style={{color: COLORS.primary}}>
          See all tools
        </Link>
      </p>
    </main>
  );
}
```

The new file:

```tsx
import {Link} from 'react-router-dom';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';
import {PageLayout} from './PageLayout';

/** Any path that isn't an admin page. */
export function NotFound() {
  return (
    <PageLayout title="Not found">
      <p style={{margin: 0, fontSize: ADMIN_TYPE.emphasis, color: ADMIN_COLORS.muted}}>
        No admin page lives at this address.{' '}
        <Link to="/" style={{color: ADMIN_COLORS.accent}}>
          Back to Overview
        </Link>
      </p>
    </PageLayout>
  );
}
```

- [ ] **Step 19: Rewrite `src/router.tsx`**

Replace the whole file. R1-1 has already removed the `BannerPage` import and the `banner/:cardId` route, so it reads:

```tsx
import {createBrowserRouter, type RouteObject} from 'react-router-dom';
import {AdminShell} from './shell/AdminShell';
import {NotFound} from './shell/NotFound';
import {ToolIndex} from './shell/ToolIndex';
import {AnalyticsPage} from './tools/analytics/AnalyticsPage';
import {ImagePage} from './tools/image/ImagePage';
import {RevealPage} from './tools/reveal/RevealPage';
import {TuningPage} from './tools/tuning/TuningPage';

/** Admin's routes (docs/PLAN.md, D10). Every one renders inside AdminShell. */
export const routes: RouteObject[] = [
  {
    element: <AdminShell />,
    children: [
      {index: true, element: <ToolIndex />},
      {path: 'reveal', element: <RevealPage />},
      {path: 'image', element: <ImagePage />},
      {path: 'tuning', element: <TuningPage />},
      {path: 'analytics', element: <AnalyticsPage />},
      {path: '*', element: <NotFound />},
    ],
  },
];

export const router = createBrowserRouter(routes);
```

The new file. These routes are interim: later R1 tasks replace the index redirect with the Overview and add the insights routes.

```tsx
import {createBrowserRouter, Navigate, type RouteObject} from 'react-router-dom';
import {AdminShell} from './shell/AdminShell';
import {NotFound} from './shell/NotFound';
import {WriteToolFrame} from './shell/WriteToolFrame';
import {AnalyticsPage} from './tools/analytics/AnalyticsPage';
import {ImagePage} from './tools/image/ImagePage';
import {RevealPage} from './tools/reveal/RevealPage';
import {TuningPage} from './tools/tuning/TuningPage';

/**
 * Admin's routes. Every one renders inside AdminShell, whose sidebar links them
 * (src/shell/nav.ts). The write tools keep their own pages for now, framed with
 * the branch notice; the redesign rebuilds them in R2 (tuning) and R4 (reveal,
 * image).
 */
export const routes: RouteObject[] = [
  {
    element: <AdminShell />,
    children: [
      // Until the Overview takes / (R1).
      {index: true, element: <Navigate to="/analytics" replace />},
      {path: 'analytics', element: <AnalyticsPage />},
      {
        path: 'reveal',
        element: (
          <WriteToolFrame>
            <RevealPage />
          </WriteToolFrame>
        ),
      },
      {
        path: 'image',
        element: (
          <WriteToolFrame>
            <ImagePage />
          </WriteToolFrame>
        ),
      },
      {
        path: 'tuning',
        element: (
          <WriteToolFrame>
            <TuningPage />
          </WriteToolFrame>
        ),
      },
      {path: '*', element: <NotFound />},
    ],
  },
];

export const router = createBrowserRouter(routes);
```

- [ ] **Step 20: Delete the tool index**

Run (Bash):

```bash
git rm src/shell/ToolIndex.tsx src/shell/ToolIndex.test.tsx src/shell/ToolIndex.stories.tsx src/shell/tools.ts
```

Expected: four `rm '…'` lines.

Then run `git grep -n "shell/tools\|ToolIndex\|ADMIN_TOOLS\|isToolRoute" -- src`.
Expected: no output, exit 1.

`src/app-bridge.ts` keeps `CAP_LABEL` and `SURFACE_CARD`, even though `ToolIndex` was their last user. Unused re-exports fail neither typecheck nor lint. Whether the Overview reuses them is for that task to decide (review: `bridge-exports-orphaned`).

- [ ] **Step 21: Run the shell and route tests and watch them pass**

Run: `pnpm vitest run src/shell src/router.test.tsx`
Expected: PASS, 5 files and 42 tests:

| File | Tests |
|---|---|
| `nav.test.ts` | 11 |
| `PageLayout.test.tsx` | 4 |
| `Sidebar.test.tsx` | 12 |
| `AdminShell.test.tsx` | 1 |
| `router.test.tsx` | 14 |

- [ ] **Step 22: Write the Sidebar and PageLayout stories**

`.storybook/preview.tsx` mounts `<AdminStyles />` for every story (R1-2), so neither story mounts it.

Create `src/shell/Sidebar.stories.tsx`:

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {MemoryRouter} from 'react-router-dom';
import {SIDEBAR_OPEN_KEY, Sidebar} from './Sidebar';

const meta: Meta<typeof Sidebar> = {
  title: 'Admin/Sidebar',
  component: Sidebar,
  args: {tokenSaved: false, onForgetToken: () => {}},
  // Each story opens with the sidebar's default state (open), not whatever an
  // earlier story or a click on the toggle saved.
  beforeEach: () => localStorage.removeItem(SIDEBAR_OPEN_KEY),
  // Full height at the shell's left edge, on the page named by parameters.route.
  decorators: [
    (Story, {parameters}) => (
      <MemoryRouter initialEntries={[parameters.route ?? '/analytics']}>
        <div style={{display: 'flex', height: '100vh'}}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

/** A read-only page: no token box, whatever the token. */
export const Open: Story = {};

/** A page that writes, with a token saved: the token box sits above the toggle. */
export const WritePageWithToken: Story = {
  args: {tokenSaved: true},
  parameters: {route: '/reveal'},
};

/** Collapsed: marks only. Each link keeps its full name as its accessible name and tooltip. */
export const Collapsed: Story = {
  args: {tokenSaved: true},
  parameters: {route: '/tuning'},
  beforeEach: () => localStorage.setItem(SIDEBAR_OPEN_KEY, 'false'),
};
```

Create `src/shell/PageLayout.stories.tsx`. It also covers `BranchNotice`, which renders only inside `PageLayout`:

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {CtaButton} from '../app-bridge';
import {PageLayout} from './PageLayout';

const meta: Meta<typeof PageLayout> = {
  title: 'Admin/PageLayout',
  component: PageLayout,
  args: {
    children: (
      <>
        <p style={{margin: 0}}>A section of the page.</p>
        <p style={{margin: 0}}>The next section, one grid gap below.</p>
      </>
    ),
  },
  // As in the shell's main column: the layout fills the height, and only its body scrolls.
  decorators: [
    (Story) => (
      <div style={{height: '100vh'}}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

/** A read-only page: meta and actions beside the title, and no branch notice (decision R-4). */
export const ReadOnly: Story = {
  args: {
    title: 'Vote activity',
    subtitle: 'Who votes, and on what.',
    meta: (
      <>
        Data as of <code>2026-09-30</code>
      </>
    ),
    actions: <CtaButton variant="neutral">Refresh</CtaButton>,
  },
};

/** A page that writes: the branch notice names the app branch it commits to. */
export const Writes: Story = {
  args: {title: 'Card images', writes: true},
};

/** A page that writes, with its own notice label. */
export const WritesWithLabel: Story = {
  args: {title: 'Calibration & tuning', writes: true, branchLabel: 'Tuning writes to'},
};
```

- [ ] **Step 23: Update the branch rule in CLAUDE.md and `.env.example` (decision R-4)**

In `CLAUDE.md` line 16 (the "The reveal, image and tuning tools commit to …" bullet), replace the last sentence.

Before:

```
The shell header always names the branch.
```

After:

```
Every page that writes names the branch in its header (`BranchNotice`); the read-only pages don't.
```

In `.env.example`, replace lines 6-7.

Before:

```
# create it in the app repo first (docs/plans/P2-port-tools.md), and delete the
# line to work against master. The shell header always names the branch.
```

After:

```
# create it in the app repo first (docs/plans/P2-port-tools.md), and delete the
# line to work against master. Every page that writes names the branch in its
# header.
```

Then run `git grep -n "shell header always names" -- CLAUDE.md .env.example`.
Expected: no output, exit 1.

- [ ] **Step 24: Verify everything**

Run, in order:
1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test:run`
4. The Storybook check from P2:

```bash
pnpm exec storybook build --test -o node_modules/.cache/storybook-verify
node -e "const e=require('./node_modules/.cache/storybook-verify/index.json').entries; console.log([...new Set(Object.values(e).map((s)=>s.title))].sort().join('\n'))"
```

Expected:
- Lint, typecheck and the test run exit 0. If lint reports an `inkweave/*` error, a raw value slipped in. Replace it with the `ADMIN_*` or bridged token that the message names.
- The Storybook build exits 0. Its titles include `Admin/PageLayout` and `Admin/Sidebar`, and no longer include `Admin/ToolIndex`.

- [ ] **Step 25: Look at it**

Run `pnpm dev` and open `http://localhost:5180`. Expected:
- `/` lands on `/analytics` with the sidebar open, and Analytics is current.
- The toggle collapses the sidebar to the marks An, Tu, Re and Im, each with a tooltip. A reload keeps it collapsed.
- `/reveal`, `/image` and `/tuning` show "Writes to Doberjohn/inkweave `master`" above the token gate. `/analytics` doesn't.
- With a token saved, a write page shows two "Forget token" controls: the sidebar's and the page's own. Either one sends the page back to its token gate, and the sidebar's token box goes with it.
- Narrow the window below 900px and reload: the sidebar starts collapsed. Narrowing it without a reload leaves the sidebar as it is (the Sidebar JSDoc's mount-only rule).

Stop the dev server before you commit, because the pre-commit Vitest run can't start its workers under load.

- [ ] **Step 26: Commit**

Run with the Bash tool, only after the owner approves:

```bash
git add src/shell/nav.ts src/shell/nav.test.ts src/shell/BranchNotice.tsx src/shell/PageLayout.tsx src/shell/PageLayout.test.tsx src/shell/PageLayout.stories.tsx src/shell/Sidebar.tsx src/shell/Sidebar.test.tsx src/shell/Sidebar.stories.tsx src/shell/WriteToolFrame.tsx src/shell/AdminShell.tsx src/shell/AdminShell.test.tsx src/shell/NotFound.tsx src/router.tsx src/router.test.tsx CLAUDE.md .env.example
USER_APPROVED=1 git commit -m "feat(shell): replace the top nav with the sidebar shell and page layout (#24)"
```

The `git rm` in Step 20 already staged the four deletions.
