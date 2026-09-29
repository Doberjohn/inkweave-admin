# P2: Port the admin tools (implementation plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the reveal, image, tuning and analytics tools and the banner generator out of the app repo into admin. They then run from the login-gated admin site, and reveal, image and tuning still write to `Doberjohn/inkweave`.

**Architecture:**
- A one-off codemod copies the app's admin files out of the pinned submodule into `src/tools/*`, `src/github/` and `src/components/`, and points their imports at `src/app-bridge.ts`.
- React Router renders every tool inside an `AdminShell` that provides the app's card data.
- Four behaviour changes come with the move:
  - the routes lose `/admin`;
  - writes go to a configurable branch;
  - the tuning tool reads the live `tuning.json`;
  - analytics reads `/admin-data/`.

**Tech stack:** React 19, React Router 7, Vite 8, Vitest 4 with Testing Library, ESLint 10 with the app's design-token plugin, Storybook 10, Playwright and sharp (banner export only), pnpm 9, Node 24.

**Tracking:** Doberjohn/inkweave-admin#2. Spec: `docs/PLAN.md` (decisions D1 to D11, section 4.4, and the "P2: Port the tools" outline). Issue #2's review comment lists the gaps in its step list; this plan closes them.

---

## Decisions

### Settled by the owner (2026-09-29)

1. **Port from the pin (`e70249be`). Don't bump it first.**
   - The app's `master` has 123 changed files since the pin, not only the three `package.json` files. None of them is a file P2 ports.
   - The one bridged module that changed, `features/cards/loader.ts`, only gained apostrophe handling in search.
   - A bump would bring Vitest 5, jsdom 30 and Sentry 11. Those belong in their own PR, the one Dependabot opens.
   - Storybook `^10.6.0`, Playwright `^1.63.0` and sharp `^0.35.4` are the same at the pin and on `master`.
2. **Design tokens: converge every file while porting, with one scoped exception.**
   - Admin has no ledger. The app's ledger matches `apps/web/...` paths, so none of its entries apply under `src/tools/`.
   - Linting the ported files at their admin paths gives exactly the 39 violations predicted in issue #2's review comment, in 10 files, and nothing from any other rule. 30 of them converge (table below).
   - The other 9 are all in `SynergyBanner.tsx`, and no token exists for them. Converging them would change the published banner.
   - `eslint.config.js` turns off `no-raw-rgba`, `no-raw-font-size` and `no-raw-radius` for that one file, with the reason. A test pins the exception's scope. Like the app's ledger, it only shrinks.
3. **The engine is imported by package name.**
   - Ported files keep `from 'inkweave-synergy-engine'`.
   - The engine is admin's own workspace dependency, and its package exports only its root, so deep imports are impossible.
   - The bridge covers app source under `apps/web/src` only. This departs from issue #2 Step 3, which routes the engine through the bridge.

### Made in this plan (approved with it)

4. **Bridge additions beyond issue #2's list.**
   - `LinkButton`, `blackRgba` and `whiteRgba`, for the convergence.
   - `usePrecomputedSynergies` and `SET_TOTAL`, which issue #2 missed.
   - The constants the tools use: `CAP_LABEL_XS`, `EMPTY_BOX`, `EASING`, `INK_COLORS`, `LETTER_SPACING`, `RADIUS`, `TRUNCATE` and `hexRgba`.
   - `PINNED_PREVIEW_CARDS_JSON`, the pinned `previewCards.json` as a `?raw` string. The reveal tool's insert test read that file with `node:fs`. Admin's `tsconfig.app.json` has no Node types, and adding them would also type `process` and `Buffer` in browser code.
   - `smallImageUrl` comes straight from `features/cards/loader`, not through the barrel.
5. **Reads use the raw media type.**
   - `readRepoFile` asks for `application/vnd.github.raw+json`, which returns the file as-is, up to 100 MB. The default JSON form base64-encodes it and stops at 1 MB (spec 4.4).
   - `previewCards.json` is 108 KB today and grows through a reveal season.
6. **The target branch.**
   - `targetBranch()` reads `VITE_ADMIN_TARGET_BRANCH` on every call, so tests can stub it. An unset or empty value means `master`.
   - `vite.config.ts` pins the variable empty for tests, because Vitest also loads `.env.local`.
   - The shell header always names the branch, and the publish buttons say "Publish to <branch>".
7. **Analytics.**
   - The three data hooks fetch `/admin-data/<file>` through one helper.
   - A file that was never generated comes back as the SPA's `index.html` with a 200. Both Vite dev and `vercel.json` do this. So the helper treats any response that isn't JSON as "not generated yet", as the app's `usePrecomputedSynergies` does.
   - Until P3, the page shows its existing error box with that message.
   - `AdminGate` and its two tests stay in the app.
8. **Tuning reads live.**
   - `useLiveTuning(token)` reads `tuning.json` from the target branch.
   - `TuningEditor` and `RuleSelector` take it as a `config` prop instead of importing `TUNING`.
   - After a publish, the page keeps the values it loaded until a reload. The app's tool showed the bundled values until the next deploy.
9. **Kit buttons.**
   - 9 of the 39 violations are `no-adhoc-buttons`, and the kit has no list-row component.
   - Selectable rows and the day disclosure become `CtaButton`: `ghost` when selected or open, `neutral` otherwise.
   - Text actions become `LinkButton`, which the kit documents for "Clear all". These are "revert", "Clear all" and the sort headers.
   - The Web Analytics rail keeps its class-styled button, and its stagger delay moves to a wrapper.
   - The tuning rule picker's rows gain the `aria-pressed` they lacked.
   - These are visible changes, which the owner checks in Storybook and on the site.
10. **Card images.**
    - `VITE_LOCAL_IMAGES` stays unset, so the loader takes its dev branch.
    - Its `/card-images/*` URLs are rewritten to the Ravensburger CDN by `inkweave.ink`, and reveal cards use `/card-images-preview/`. Both paths are forwarded.
11. **Banner assets.**
    - Copy `public/art/banner/` (the card back, the QR code and the pop-out art).
    - Forward `/art/sets/` (the set logo) and `/brand/` (the Inkweave logo) to `inkweave.ink`. Both return 200 there today.
    - Forwarding all of `/art/` would send `/art/banner/` to the app in dev, because the proxy runs before the static files.
12. **Storybook** runs locally on port 6007 (the app's uses 6006), with no CI gate (spec section 7). Verification uses `storybook build --test`, which indexes every story without a browser.
13. **Task order differs from issue #2's steps.**
    - The bridge comes first, because the shell needs `CardDataProvider`.
    - Storybook comes before any story file, because `pnpm typecheck` covers `*.stories.tsx`.
    - Each tool task adds its own route, so every commit passes the pre-commit hook.
14. **Also:**
    - The tuning editor's design record moves to `docs/tuning-editor-design.md`, because P4 deletes the app's copy.
    - The banner runbook becomes `docs/BANNER.md`.

### The 39 violations and their fixes

| File | Count | Fix |
|---|---|---|
| `tools/banner/SynergyBanner.tsx` | 27 | 18 converge with identical output: black and white `rgba` to `blackRgba`/`whiteRgba`; the legacy gold `rgba(212,175,55,a)` to `hexRgba(COLORS.primary500, a)`; `rgba(255,185,0,a)` to `hexRgba(COLORS.primary, a)`; radius `999` to `RADIUS.pill` and `14` to `RADIUS.xl`; size `14` to `FONT_SIZES.lg` and `'12px'` to `FONT_SIZES.md`; `'#ffffff'` to `COLORS.heroTitle`; the Tinos string to `FONTS.hero`. 9 stay under the exception: four `rgba` sites (the blue and purple glows and the `+N` scrim), sizes `15`, `18` and `68`, and two `9px` radii |
| `tools/banner/BannerPage.tsx` | 1 | `'#06060a'` to `COLORS.background`. The page background sits outside the exported `.banner-stage`, so the images don't change |
| `tools/image/components/CardImagePicker.tsx` | 2 | Rows to `CtaButton`; thumbnail radius `3` to `RADIUS.sm`, as in `ImageComparePanel` |
| `tools/tuning/components/PendingTray.tsx` | 2 | "revert" and "Clear all" to `LinkButton tone="muted"` |
| `tools/tuning/components/RuleSelector.tsx` | 2 | Rows to `CtaButton` |
| `tools/analytics/DayGroup.tsx` | 1 | Header to `CtaButton` |
| `tools/analytics/PairList.tsx` | 1 | Rows to `CtaButton`; its own hover state goes, since the kit handles hover |
| `tools/analytics/RuleCalibrationTable.tsx` | 1 | Sort header to `LinkButton` |
| `tools/analytics/WebAnalyticsView.tsx` | 1 | Stagger delay to a wrapper element |
| `tools/analytics/Scorecard.tsx` | 1 | `fontSize: 9` to `FONT_SIZES.xs` (10) |

### What the rehearsal can't show

Task 12 rehearses writes on a throwaway app branch. Two things stay unproven there (issue #2's review comment):
- **Image conversion.** Reveal and image writes commit raw scans to `apps/web/public/card-images-raw/`. The app's `convert-reveal-images.yml` converts them only on pushes to `master`.
- **Vercel preview builds.** A push to any branch other than `master` starts a preview build of the app project, because the app's `vercel.json` turns off Git deployments for `master` only. Expect three.

## Verified before writing (2026-09-29)

The whole port was dry-run in a scratch copy: the codemod, the planned bridge and every change below.
- `tsc` passed, with the stories left out because Storybook wasn't installed.
- 62 ported and 51 new tests passed.
- Lint was clean except the 9 expected `SynergyBanner.tsx` messages. The exception's tests fail without it and pass with it.

Not dry-run: Storybook, the dev server, the banner export and the rehearsal.

Production today serves `/art/sets/attack-of-the-vine.png`, `/brand/logo.svg` and `/data/synergies/2983.json`, and answers `/admin-data/*` with a 404.

## Files

### Created
| Path | Responsibility |
|---|---|
| `docs/plans/P2-port-tools.md` | This plan |
| `src/router.tsx` (+ test) | The routes; each renders in the shell |
| `src/shell/AdminShell.tsx`, `src/shell/NotFound.tsx` | Layout (tool nav, target branch, card data) and the not-found page |
| `src/shell/ToolIndex.stories.tsx`, `.storybook/main.ts`, `.storybook/preview.tsx` | Local Storybook |
| `src/github/{githubCommit.ts,githubCommit.test.ts,useGithubToken.ts,GithubTokenGate.tsx,GithubTokenGate.stories.tsx}` | GitHub read/write layer, with the target branch and raw reads |
| `src/components/{ImageUploadTile.tsx,ImageUploadTile.stories.tsx}` | Upload tile |
| `src/tools/reveal/**` | Reveal publisher (18 files from `features/reveal-admin` and `RevealAdminPage`) |
| `src/tools/image/**` | Card images (14 files, plus a picker test) |
| `src/tools/tuning/**` | Engine tuning (16 files, plus `useLiveTuning.ts` and three tests) |
| `src/tools/analytics/**` | Dashboard (40 files, plus `adminData.ts` and five tests) |
| `src/tools/banner/{BannerPage.tsx,SynergyBanner.tsx}`, `public/art/banner/*`, `scripts/export-banner.mjs` (+ test), `docs/BANNER.md` | Banner generator |
| `src/vite-env.d.ts`, `.env.example` | `VITE_ADMIN_TARGET_BRANCH` typing and documentation |
| `docs/tuning-editor-design.md` | The tuning editor's design record, moved from the app |

### Modified
| Path | Change |
|---|---|
| `src/app-bridge.ts` | Re-exports for the tools, the skeleton stylesheet, the pinned `previewCards.json` |
| `src/main.tsx` | Renders the router |
| `src/shell/{tools.ts,ToolIndex.tsx,ToolIndex.test.tsx}` | Tools open their admin routes |
| `vite.config.ts` | Pins `VITE_ADMIN_TARGET_BRANCH` empty in tests |
| `eslint.config.js` | The SynergyBanner exception |
| `scripts/bridge-boundary.test.mjs` | Warm-up at module level; the exception's scope tests |
| `forwarded-paths.json`, `vercel.json` | `/art/sets/` and `/brand/` |
| `package.json`, `pnpm-lock.yaml` | Storybook, Playwright, sharp; `storybook` and `banner` scripts |
| `.gitignore` | `reports/` |
| `CLAUDE.md`, `docs/PLAN.md` | The tools, the target branch, the exception; a pointer to this plan |

## How to execute

- **Branch:** `feature/2-port-tools`, which already exists. This plan is its first commit.
- **Commits:**
  - One per task, each after the owner approves it.
  - Stage and commit in separate Bash-tool commands. The commit command starts with `USER_APPROVED=1`, and is never piped.
  - The pre-commit hook runs lint and the tests. If Vitest reports "Timeout waiting for worker" under load, run that test file on its own, then retry the commit.
- **Shell:** Git Bash, from the repo root, unless a step says otherwise. Write any multi-line script with the Write tool, because the Bash tool collapses `\\`.
- **`upstream/` is read-only.** The codemod and `cp` only read from it. Never run `pnpm install` inside it.
- **Test totals** are for the whole suite (`pnpm test:run`) after the task, P1's 46 tests included.
- **Browser checks:**
  - `pnpm dev` serves `http://localhost:5180`. In a Claude session, use `preview_start` with a local, uncommitted `.claude/launch.json` entry that runs `pnpm dev` on port 5180.
  - Tools behind the token gate need the owner's GitHub token. Only the owner enters it.
- **Codemod (Appendix A):**
  - Save it outside the repo as `port-from-app.mjs`. In a Claude session, use the session scratchpad.
  - Below, `$CODEMOD` is its path. Run it from the repo root: `node "$CODEMOD" <group>`.
  - It never overwrites a file, and it stops before writing anything if it meets an import it can't map.
- **Storybook check:** `pnpm exec storybook build --test -o node_modules/.cache/storybook-verify`, then list the story titles:

```bash
node -e "const e=require('./node_modules/.cache/storybook-verify/index.json').entries; console.log([...new Set(Object.values(e).map((s)=>s.title))].sort().join('\n'))"
```

---

### Task 1: Commit this plan

**Files:** Create `docs/plans/P2-port-tools.md`

- [ ] **Step 1: The owner approves the plan**

- [ ] **Step 2: Commit**

```bash
git add docs/plans/P2-port-tools.md
```

```bash
USER_APPROVED=1 git commit -m "docs: detailed plan for porting the tools (#2)"
```

---

### Task 2: Extend the bridge

**Files:** Modify `src/app-bridge.ts`

- [ ] **Step 1: Replace `src/app-bridge.ts`**

```ts
// The ONLY module allowed to import from upstream/ (the pinned app submodule).
// Everything admin uses from the app is re-exported here, so a pin bump that
// changes app internals breaks in exactly one place. Enforced by the
// no-restricted-imports rule in eslint.config.js (docs/PLAN.md, D3). The engine
// is admin's own workspace package, so admin imports it by name instead.

// The app's global stylesheet: @font-face on /fonts/* (forwarded to
// inkweave.ink), body colors, the .card-tile rules CardTile depends on, and the
// reduced-motion block.
import '../upstream/inkweave/apps/web/src/index.css';
// CardTile's loading placeholder is a react-loading-skeleton; the app loads
// this stylesheet once, in its main.tsx.
import 'react-loading-skeleton/dist/skeleton.css';

export {
  ALL_INKS,
  CAP_LABEL,
  CAP_LABEL_XS,
  COLORS,
  EASING,
  EMPTY_BOX,
  FONTS,
  FONT_SIZES,
  INK_COLORS,
  LETTER_SPACING,
  RADIUS,
  REVEAL_ID_BASE,
  REVEAL_SET_CODE,
  SET_TOTAL,
  SPACING,
  SURFACE_CARD,
  TRUNCATE,
  blackRgba,
  hexRgba,
  inkBlock,
  whiteRgba,
} from '../upstream/inkweave/apps/web/src/shared/constants';
export {CtaButton} from '../upstream/inkweave/apps/web/src/shared/components/CtaButton';
export {LinkButton} from '../upstream/inkweave/apps/web/src/shared/components/LinkButton';
export {TabList} from '../upstream/inkweave/apps/web/src/shared/components/TabList';
export {useContainerWidth} from '../upstream/inkweave/apps/web/src/shared/hooks';
export {
  CardDataProvider,
  useCardDataContext,
} from '../upstream/inkweave/apps/web/src/shared/contexts/CardDataContext';
export {CardTile} from '../upstream/inkweave/apps/web/src/features/cards/components/CardTile';
export {smallImageUrl} from '../upstream/inkweave/apps/web/src/features/cards/loader';
export {usePrecomputedSynergies} from '../upstream/inkweave/apps/web/src/features/synergies/hooks/usePrecomputedSynergies';
// The pinned app's previewCards.json as text. The reveal tool's insert test
// runs against it, so a pin bump that changes the file's layout fails here.
export {default as PINNED_PREVIEW_CARDS_JSON} from '../upstream/inkweave/apps/web/public/data/previewCards.json?raw';
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: exit 0. A re-export that names a missing symbol fails here, and `vite/client` types the `?raw` import.

- [ ] **Step 3: Lint and test**

Run: `pnpm lint`, then `pnpm test:run`
Expected: lint exits 0, and 46 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app-bridge.ts
```

```bash
USER_APPROVED=1 git commit -m "feat(bridge): re-export what the ported tools use (#2)"
```

---

### Task 3: Router and shell

**Files:**
- Create: `src/router.tsx`, `src/router.test.tsx`, `src/shell/AdminShell.tsx`, `src/shell/NotFound.tsx`
- Modify: `src/main.tsx`, `src/shell/tools.ts`, `src/shell/ToolIndex.tsx`, `src/shell/ToolIndex.test.tsx`

- [ ] **Step 1: Write the failing tests**

Replace `src/shell/ToolIndex.test.tsx`:

```tsx
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider, useLocation} from 'react-router-dom';
import {ToolIndex} from './ToolIndex';
import {ADMIN_TOOLS} from './tools';

function CurrentPath() {
  return <p>at {useLocation().pathname}</p>;
}

function renderIndex() {
  const router = createMemoryRouter([
    {path: '/', element: <ToolIndex />},
    {path: '*', element: <CurrentPath />},
  ]);
  render(<RouterProvider router={router} />);
}

describe('ToolIndex', () => {
  it('lists every admin tool by name', () => {
    renderIndex();
    for (const tool of ADMIN_TOOLS) {
      expect(screen.getByRole('heading', {name: tool.name})).toBeInTheDocument();
    }
  });

  it.each(ADMIN_TOOLS.map((tool) => [tool.name, tool.path]))('opens %s at %s', async (name, path) => {
    renderIndex();
    await userEvent.click(screen.getByRole('button', {name: `Open ${name}`}));
    expect(screen.getByText(`at ${path}`)).toBeInTheDocument();
  });
});
```

Create `src/router.test.tsx`. Later tasks add cases to it.

```tsx
import {render, screen, within} from '@testing-library/react';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import {routes} from './router';
import {ADMIN_TOOLS} from './shell/tools';

function renderAt(path: string) {
  render(<RouterProvider router={createMemoryRouter(routes, {initialEntries: [path]})} />);
}

beforeEach(() => {
  // The shell's CardDataProvider loads the card data on mount. These tests only
  // check routing, so that fetch never settles.
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('admin routes', () => {
  it('shows the tool index at /', () => {
    renderAt('/');
    expect(screen.getByRole('heading', {level: 1, name: 'Tools'})).toBeInTheDocument();
  });

  it('shows a not-found message for any other path', () => {
    renderAt('/admin/reveal');
    expect(screen.getByRole('heading', {level: 1, name: 'Not found'})).toBeInTheDocument();
  });

  it('links every tool from the shell navigation', () => {
    renderAt('/');
    const nav = screen.getByRole('navigation', {name: 'Admin tools'});
    for (const tool of ADMIN_TOOLS) {
      expect(within(nav).getByRole('link', {name: tool.name})).toHaveAttribute('href', tool.path);
    }
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm exec vitest run src/shell src/router.test.tsx`
Expected: FAIL. `./router` does not exist, and the index has no `Open <tool>` buttons that navigate.

- [ ] **Step 3: Tool entries with admin routes**

Replace `src/shell/tools.ts`:

```ts
export interface AdminTool {
  id: 'reveal' | 'image' | 'tuning' | 'analytics' | 'banner';
  name: string;
  purpose: string;
  /** The tool's route in admin (docs/PLAN.md, D10). */
  path: string;
}

export const ADMIN_TOOLS: readonly AdminTool[] = [
  {
    id: 'reveal',
    name: 'Reveal publisher',
    purpose: 'Add a newly revealed card to the preview set.',
    path: '/reveal',
  },
  {
    id: 'image',
    name: 'Card images',
    purpose: "Replace an existing card's image.",
    path: '/image',
  },
  {
    id: 'tuning',
    name: 'Engine tuning',
    purpose: 'Edit playstyle copy and the Shift and Ramp scores.',
    path: '/tuning',
  },
  {
    id: 'analytics',
    name: 'Analytics',
    purpose: 'Vote calibration, activity and web analytics.',
    path: '/analytics',
  },
  {
    id: 'banner',
    name: 'Banner generator',
    purpose: 'Render a Synergy Spotlight banner at /banner/<cardId>; pnpm banner <cardId> exports it.',
    // Pocahontas - Guiding the Tribe, the card the banner was designed around.
    path: '/banner/2983',
  },
];
```

Replace `src/shell/ToolIndex.tsx`:

```tsx
import {useNavigate} from 'react-router-dom';
import {CAP_LABEL, COLORS, CtaButton, FONTS, FONT_SIZES, SPACING, SURFACE_CARD} from '../app-bridge';
import {ADMIN_TOOLS, type AdminTool} from './tools';

function ToolCard({tool}: {tool: AdminTool}) {
  const navigate = useNavigate();
  return (
    <li style={{...SURFACE_CARD, display: 'flex', flexDirection: 'column', gap: SPACING.sm}}>
      <h2 style={{margin: 0, fontFamily: FONTS.hero, fontSize: FONT_SIZES.xxl, color: COLORS.text}}>
        {tool.name}
      </h2>
      <p style={{margin: 0, fontSize: FONT_SIZES.lg, color: COLORS.textMuted}}>{tool.purpose}</p>
      <CtaButton variant="neutral" aria-label={`Open ${tool.name}`} onClick={() => navigate(tool.path)}>
        Open
      </CtaButton>
    </li>
  );
}

/** Admin landing page: every tool, one click away. */
export function ToolIndex() {
  return (
    <main
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: SPACING.xxxl,
        fontFamily: FONTS.body,
        color: COLORS.text,
      }}>
      <p style={CAP_LABEL}>Inkweave admin</p>
      <h1
        style={{
          margin: `${SPACING.sm}px 0 ${SPACING.xxl}px`,
          fontFamily: FONTS.hero,
          fontSize: FONT_SIZES.displaySm,
        }}>
        Tools
      </h1>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'grid',
          gap: SPACING.lg,
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        }}>
        {ADMIN_TOOLS.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 4: Shell, not-found page, router and entry point**

Create `src/shell/AdminShell.tsx`. Task 5 adds the target branch to its header.

```tsx
import {NavLink, Outlet} from 'react-router-dom';
import {SkeletonTheme} from 'react-loading-skeleton';
import {CardDataProvider, COLORS, FONTS, FONT_SIZES, SPACING} from '../app-bridge';
import {ADMIN_TOOLS} from './tools';

function navLinkStyle({isActive}: {isActive: boolean}) {
  return {
    color: isActive ? COLORS.primary : COLORS.textMuted,
    fontSize: FONT_SIZES.lg,
    fontWeight: isActive ? 700 : 500,
    textDecoration: 'none',
  };
}

/**
 * The layout every admin route renders in: tool navigation and the app's card
 * data. Unlike the public app's layout it has no public nav, Vercel Analytics or
 * Speed Insights (docs/PLAN.md, 4.1).
 */
export function AdminShell() {
  return (
    // The app mounts one SkeletonTheme for all of its skeletons (AppLayout.tsx); admin does the same here.
    <SkeletonTheme baseColor={COLORS.surfaceAlt} highlightColor={COLORS.surfaceHover}>
      <CardDataProvider>
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
              {ADMIN_TOOLS.map((tool) => (
                <NavLink key={tool.id} to={tool.path} style={navLinkStyle}>
                  {tool.name}
                </NavLink>
              ))}
            </nav>
          </header>
          <Outlet />
        </div>
      </CardDataProvider>
    </SkeletonTheme>
  );
}
```

Create `src/shell/NotFound.tsx`:

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

Create `src/router.tsx`. Each tool task adds its route before the `*` route.

```tsx
import {createBrowserRouter, type RouteObject} from 'react-router-dom';
import {AdminShell} from './shell/AdminShell';
import {NotFound} from './shell/NotFound';
import {ToolIndex} from './shell/ToolIndex';

/** Admin's routes (docs/PLAN.md, D10). Every one renders inside AdminShell. */
export const routes: RouteObject[] = [
  {
    element: <AdminShell />,
    children: [
      {index: true, element: <ToolIndex />},
      {path: '*', element: <NotFound />},
    ],
  },
];

export const router = createBrowserRouter(routes);
```

Replace `src/main.tsx`:

```tsx
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {RouterProvider} from 'react-router-dom';
import {router} from './router';

const root = document.getElementById('root');
if (!root) throw new Error('index.html is missing the #root element');

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `pnpm exec vitest run src/shell src/router.test.tsx`
Expected: 9 passed (6 ToolIndex, 3 router).

- [ ] **Step 6: Whole suite**

Run: `pnpm typecheck`, `pnpm lint`, `pnpm test:run`
Expected: exit 0, exit 0, and 52 passed.

- [ ] **Step 7: Browser check**

Start `pnpm dev` and open `http://localhost:5180`.
Expected:
- The tool index renders under the shell's nav.
- `/nope` shows "Not found".
- Each "Open" button changes the path. Until its task ports it, a tool shows "Not found".
- No console errors.

- [ ] **Step 8: Commit**

```bash
git add src/router.tsx src/router.test.tsx src/main.tsx src/shell
```

```bash
USER_APPROVED=1 git commit -m "feat(shell): admin routes and the tool shell (#2)"
```

---

### Task 4: Storybook

**Files:**
- Create: `.storybook/main.ts`, `.storybook/preview.tsx`, `src/shell/ToolIndex.stories.tsx`
- Modify: `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Add the dependencies at the app's versions**

In `package.json`, add to `devDependencies`, keeping alphabetical order:

```json
"@storybook/addon-a11y": "^10.6.0",
"@storybook/addon-docs": "^10.6.0",
"@storybook/react-vite": "^10.6.0",
"storybook": "^10.6.0",
```

Add to `scripts`, after `check:hooks`:

```json
"storybook": "storybook dev -p 6007",
```

Run: `pnpm install`, then `pnpm check:deps`
Expected: `Dependency parity with the app: OK`

- [ ] **Step 2: Configure Storybook**

Create `.storybook/main.ts`:

```ts
import type {StorybookConfig} from '@storybook/react-vite';

// Admin's local Storybook (docs/PLAN.md, section 7): the ported stories, with no
// Chromatic and no story-coverage gate. It builds through vite.config.ts, so
// stories compile with the same React Compiler setup as the site.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: '@storybook/react-vite',
};
export default config;
```

Create `.storybook/preview.tsx`:

```tsx
import type {Preview} from '@storybook/react-vite';
import {themes} from 'storybook/theming';
// The bridge also loads the app's global stylesheet (fonts, .card-tile) and the skeleton styles.
import {COLORS} from '../src/app-bridge';

// The same dark canvas as the app's Storybook.
const preview: Preview = {
  decorators: [
    (Story) => (
      <div style={{background: COLORS.background, minHeight: '100vh'}}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      options: {
        dark: {name: 'Inkweave dark', value: COLORS.background},
        surface: {name: 'Surface', value: COLORS.surface},
      },
    },
    docs: {theme: themes.dark},
  },
  initialGlobals: {backgrounds: {value: 'dark'}},
};

export default preview;
```

- [ ] **Step 3: The first story**

Create `src/shell/ToolIndex.stories.tsx`:

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {MemoryRouter} from 'react-router-dom';
import {ToolIndex} from './ToolIndex';

const meta: Meta<typeof ToolIndex> = {
  title: 'Admin/ToolIndex',
  component: ToolIndex,
  // The Open buttons navigate, so the story needs a router.
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};
export default meta;

export const Default: StoryObj<typeof ToolIndex> = {};
```

- [ ] **Step 4: Verify**

Run: `pnpm typecheck`, `pnpm lint`, then the Storybook check from "How to execute".
Expected:
- The typecheck and lint exit 0.
- The build exits 0 and lists `Admin/ToolIndex`.
- `pnpm storybook` serves `http://localhost:6007`.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml .storybook src/shell/ToolIndex.stories.tsx
```

```bash
USER_APPROVED=1 git commit -m "build(storybook): local Storybook for the admin stories (#2)"
```

---

### Task 5: GitHub layer and the target branch

**Files:**
- Create (codemod): `src/github/githubCommit.ts`, `src/github/githubCommit.test.ts`, `src/github/useGithubToken.ts`, `src/github/GithubTokenGate.tsx`, `src/github/GithubTokenGate.stories.tsx`, `src/components/ImageUploadTile.tsx`, `src/components/ImageUploadTile.stories.tsx`
- Create: `src/vite-env.d.ts`, `.env.example`
- Modify: `vite.config.ts`, `src/shell/AdminShell.tsx`, `src/router.test.tsx`

- [ ] **Step 1: Port the files**

Run: `node "$CODEMOD" github`
Expected: `github: 7 files written under .`

Run: `pnpm exec vitest run src/github`
Expected: 4 passed, as in the app.

- [ ] **Step 2: Type the variable and pin it for tests**

Create `src/vite-env.d.ts`:

```ts
// Admin's own build-time settings. The app's variables are declared in
// upstream/inkweave/apps/web/src/vite-env.d.ts, which tsconfig.app.json also
// includes; the two ImportMetaEnv declarations merge.
interface ImportMetaEnv {
  /** App branch the reveal, image and tuning tools read from and commit to. Unset means master (docs/PLAN.md, D6). */
  readonly VITE_ADMIN_TARGET_BRANCH?: string;
}
```

Create `.env.example`:

```bash
# Copy to .env.local (git-ignored) to override for local runs.

# The branch of Doberjohn/inkweave that the reveal, image and tuning tools read
# from and commit to. Unset means master. To rehearse writes, create a throwaway
# branch in the app repo and point the tools at it (docs/plans/P2-port-tools.md).
# VITE_ADMIN_TARGET_BRANCH=admin-verify
```

Edit `vite.config.ts`:

```diff
--- a/vite.config.ts
+++ b/vite.config.ts
@@ -37,5 +37,8 @@ export default defineConfig({
     setupFiles: ['./src/test/setup.ts'],
     // upstream/ holds the app's own test suite; it must never run here.
     exclude: ['**/node_modules/**', 'upstream/**', 'dist/**'],
+    // A rehearsal sets VITE_ADMIN_TARGET_BRANCH in .env.local, which Vitest also
+    // loads. Pin it empty (master) here; tests that need a branch stub it.
+    env: {VITE_ADMIN_TARGET_BRANCH: ''},
   },
 });
```

- [ ] **Step 3: Write the failing tests**

Replace `src/github/githubCommit.test.ts`:

```ts
import {describe, it, expect, vi, afterEach} from 'vitest';
import {validateToken, utf8ToBase64, base64ToUtf8, commitFiles, readRepoFile, targetBranch} from './githubCommit';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('utf8 base64 round-trip', () => {
  it('survives the ink glyph', () => {
    const s = 'pay 1 ⬡ less to play this character.';
    expect(base64ToUtf8(utf8ToBase64(s))).toBe(s);
  });
});

describe('validateToken', () => {
  it('reports push access on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({permissions: {push: true}}), {status: 200}),
    );
    expect(await validateToken('tok')).toEqual({ok: true, canPush: true, error: undefined});
  });

  it('flags a token without push access', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({permissions: {push: false}}), {status: 200}),
    );
    const r = await validateToken('tok');
    expect(r.canPush).toBe(false);
    expect(r.error).toMatch(/write/i);
  });
});

describe('targetBranch', () => {
  it('defaults to master', () => {
    expect(targetBranch()).toBe('master');
  });

  it('follows VITE_ADMIN_TARGET_BRANCH', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    expect(targetBranch()).toBe('admin-verify');
  });
});

describe('readRepoFile', () => {
  it('reads the raw file from the target branch', async () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"text":"⬡"}'));

    expect(await readRepoFile('tok', 'apps/web/public/data/previewCards.json')).toBe('{"text":"⬡"}');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      'https://api.github.com/repos/Doberjohn/inkweave/contents/apps/web/public/data/previewCards.json?ref=admin-verify',
    );
    expect(new Headers(init?.headers).get('Accept')).toBe('application/vnd.github.raw+json');
  });

  it('throws with the status when the read fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Not Found', {status: 404}));
    await expect(readRepoFile('tok', 'missing.json')).rejects.toThrow(/GitHub 404/);
  });
});

// Table-driven git-data API stub: [url matcher, JSON body, status]. Keeps the
// fetch mock branch-free (avoids the "complex method" gate on the test).
function gitRoutes(branch: string): [(u: string) => boolean, unknown, number][] {
  return [
    [(u) => u.endsWith(`/git/ref/heads/${branch}`), {object: {sha: 'basecommit'}}, 200],
    [(u) => u.includes('/git/commits/basecommit'), {tree: {sha: 'basetree'}}, 200],
    [(u) => u.endsWith('/git/blobs'), {sha: 'blobsha'}, 201],
    [(u) => u.endsWith('/git/trees'), {sha: 'newtree'}, 201],
    [(u) => u.endsWith('/git/commits'), {sha: 'newcommit', html_url: 'https://github.com/x/y/commit/newcommit'}, 201],
    [(u) => u.endsWith(`/git/refs/heads/${branch}`), {}, 200],
  ];
}

function gitStub(url: string, branch = 'master'): Response {
  const route = gitRoutes(branch).find(([match]) => match(url));
  if (!route) throw new Error(`unexpected url ${url}`);
  return new Response(JSON.stringify(route[1]), {status: route[2]});
}

describe('commitFiles', () => {
  it('creates a blob + tree per file and patches the ref', async () => {
    const calls: {url: string; method: string; body?: unknown}[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const u = String(url);
      calls.push({url: u, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(init.body as string) : undefined});
      return gitStub(u);
    });

    const res = await commitFiles({
      token: 'tok',
      message: 'test commit',
      files: [{path: 'a/b.txt', contentBase64: 'Zm9v'}],
    });

    expect(res.commitUrl).toBe('https://github.com/x/y/commit/newcommit');
    const tree = calls.find((c) => c.url.endsWith('/git/trees'))!;
    expect(tree.body).toMatchObject({base_tree: 'basetree', tree: [{path: 'a/b.txt', mode: '100644', type: 'blob', sha: 'blobsha'}]});
    const patch = calls.find((c) => c.url.endsWith('/git/refs/heads/master'))!;
    expect(patch.method).toBe('PATCH');
    expect(patch.body).toMatchObject({sha: 'newcommit'});
  });

  it('commits to the target branch and leaves master alone', async () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    const calls: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      calls.push(`${init?.method ?? 'GET'} ${String(url)}`);
      return gitStub(String(url), 'admin-verify');
    });

    await commitFiles({token: 'tok', message: 'rehearsal', files: [{path: 'a.txt', contentBase64: 'Zm9v'}]});

    expect(calls).toContain('GET https://api.github.com/repos/Doberjohn/inkweave/git/ref/heads/admin-verify');
    expect(calls).toContain('PATCH https://api.github.com/repos/Doberjohn/inkweave/git/refs/heads/admin-verify');
    expect(calls.join('\n')).not.toContain('master');
  });
});
```

In `src/router.test.tsx`, clear stubbed env vars after each test, and add two cases at the end of the `describe`:

```tsx
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
```

```tsx
  it('names the branch the tools write to', () => {
    renderAt('/');
    expect(screen.getByText('master')).toBeInTheDocument();
  });

  it('names a rehearsal branch when one is set', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    renderAt('/');
    expect(screen.getByText('admin-verify')).toBeInTheDocument();
  });
```

- [ ] **Step 4: Run them to see them fail**

Run: `pnpm exec vitest run src/github src/router.test.tsx`
Expected: FAIL:
- `targetBranch` is not exported;
- `readRepoFile` asks for the JSON media type;
- `commitFiles` reads `heads/master`;
- the header names no branch.

- [ ] **Step 5: Implement the target branch and raw reads**

Edit `src/github/githubCommit.ts`:

```diff
--- a/src/github/githubCommit.ts
+++ b/src/github/githubCommit.ts
@@ -1,8 +1,16 @@
 const OWNER = 'Doberjohn';
 const REPO = 'inkweave';
-const BRANCH = 'master';
 const API = 'https://api.github.com';
 
+/**
+ * The app branch the tools read from and commit to (docs/PLAN.md, D6). Set
+ * VITE_ADMIN_TARGET_BRANCH to rehearse writes on a throwaway branch; unset or
+ * empty means master. Read on every call, so tests can stub it.
+ */
+export function targetBranch(): string {
+  return import.meta.env.VITE_ADMIN_TARGET_BRANCH || 'master';
+}
+
 function authHeaders(token: string): HeadersInit {
   return {
     Authorization: `Bearer ${token}`,
@@ -51,11 +59,7 @@ export async function validateToken(token: string): Promise<TokenInfo> {
   }
 }
 
-async function ghJson<T = Record<string, unknown>>(
-  token: string,
-  path: string,
-  init?: RequestInit,
-): Promise<T> {
+async function ghFetch(token: string, path: string, init?: RequestInit): Promise<Response> {
   const res = await fetch(`${API}${path}`, {
     ...init,
     headers: {...authHeaders(token), ...(init?.headers ?? {})},
@@ -64,16 +68,30 @@ async function ghJson<T = Record<string, unknown>>(
     const body = await res.text();
     throw new Error(`GitHub ${res.status} on ${path}: ${body.slice(0, 200)}`);
   }
+  return res;
+}
+
+async function ghJson<T = Record<string, unknown>>(
+  token: string,
+  path: string,
+  init?: RequestInit,
+): Promise<T> {
+  const res = await ghFetch(token, path, init);
   return res.json() as Promise<T>;
 }
 
-/** Read a repo file's decoded UTF-8 text from the master branch. */
+/**
+ * Read a repo file's UTF-8 text from the target branch. The raw media type
+ * returns the file as-is, up to 100 MB; the default JSON form base64-encodes it
+ * and stops at 1 MB (docs/PLAN.md, 4.4).
+ */
 export async function readRepoFile(token: string, path: string): Promise<string> {
-  const meta = await ghJson<{content: string}>(
+  const res = await ghFetch(
     token,
-    `/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,
+    `/repos/${OWNER}/${REPO}/contents/${path}?ref=${encodeURIComponent(targetBranch())}`,
+    {headers: {Accept: 'application/vnd.github.raw+json'}},
   );
-  return base64ToUtf8(meta.content);
+  return res.text();
 }
 
 export interface CommitFile {
@@ -88,8 +106,8 @@ export interface CommitResult {
 }
 
 /**
- * One atomic commit on master writing an arbitrary set of files. Reads the
- * current master tip, creates a blob per file, builds a tree on the base
+ * One atomic commit on the target branch writing an arbitrary set of files.
+ * Reads the branch tip, creates a blob per file, builds a tree on the base
  * commit's tree, commits, and fast-forwards the ref. Callers prepare the file
  * list (including any read-modify-write of existing files) beforehand.
  */
@@ -99,10 +117,11 @@ export async function commitFiles(opts: {
   files: CommitFile[];
 }): Promise<CommitResult> {
   const {token, message, files} = opts;
+  const branch = targetBranch();
 
   const ref = await ghJson<{object: {sha: string}}>(
     token,
-    `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`,
+    `/repos/${OWNER}/${REPO}/git/ref/heads/${branch}`,
   );
   const baseCommitSha = ref.object.sha;
   const baseCommit = await ghJson<{tree: {sha: string}}>(
@@ -130,7 +149,7 @@ export async function commitFiles(opts: {
     {method: 'POST', body: JSON.stringify({message, tree: tree.sha, parents: [baseCommitSha]})},
   );
 
-  await ghJson(token, `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
+  await ghJson(token, `/repos/${OWNER}/${REPO}/git/refs/heads/${branch}`, {
     method: 'PATCH',
     body: JSON.stringify({sha: commit.sha}),
   });
```

Edit `src/shell/AdminShell.tsx`:

```diff
--- a/src/shell/AdminShell.tsx
+++ b/src/shell/AdminShell.tsx
@@ -1,6 +1,7 @@
 import {NavLink, Outlet} from 'react-router-dom';
 import {SkeletonTheme} from 'react-loading-skeleton';
 import {CardDataProvider, COLORS, FONTS, FONT_SIZES, SPACING} from '../app-bridge';
+import {targetBranch} from '../github/githubCommit';
 import {ADMIN_TOOLS} from './tools';
 
 function navLinkStyle({isActive}: {isActive: boolean}) {
@@ -13,9 +14,9 @@ function navLinkStyle({isActive}: {isActive: boolean}) {
 }
 
 /**
- * The layout every admin route renders in: tool navigation and the app's card
- * data. Unlike the public app's layout it has no public nav, Vercel Analytics or
- * Speed Insights (docs/PLAN.md, 4.1).
+ * The layout every admin route renders in: tool navigation, the app branch the
+ * tools write to, and the app's card data. Unlike the public app's layout it has
+ * no public nav, Vercel Analytics or Speed Insights (docs/PLAN.md, 4.1).
  */
 export function AdminShell() {
   return (
@@ -43,6 +44,9 @@ export function AdminShell() {
                 </NavLink>
               ))}
             </nav>
+            <p style={{margin: 0, fontSize: FONT_SIZES.sm, color: COLORS.textMuted}}>
+              Writes go to Doberjohn/inkweave <code style={{color: COLORS.primary}}>{targetBranch()}</code>
+            </p>
           </header>
           <Outlet />
         </div>
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `pnpm exec vitest run src/github src/router.test.tsx`
Expected: 14 passed (9 GitHub, 5 router).

- [ ] **Step 7: Whole suite and Storybook**

Run: `pnpm typecheck`, `pnpm lint`, `pnpm test:run`, then the Storybook check.
Expected:
- exit 0, exit 0, and 63 passed;
- Storybook adds `Admin/GithubTokenGate` and `Admin/ImageUploadTile`.

- [ ] **Step 8: Commit**

```bash
git add src/github src/components src/vite-env.d.ts .env.example vite.config.ts src/shell/AdminShell.tsx src/router.test.tsx
```

```bash
USER_APPROVED=1 git commit -m "feat(github): port the GitHub layer with a configurable target branch (#2)"
```

---

### Task 6: Reveal publisher

**Files:**
- Create (codemod): `src/tools/reveal/**` (18 files)
- Modify: `src/router.tsx`, `src/router.test.tsx`

- [ ] **Step 1: Port the files**

Run: `node "$CODEMOD" reveal`
Expected: `reveal: 18 files written under .`

- [ ] **Step 2: Rename the page, name the branch on the button, point the test at the pinned file**

Edit `src/tools/reveal/RevealPage.tsx`:

```diff
--- a/src/tools/reveal/RevealPage.tsx
+++ b/src/tools/reveal/RevealPage.tsx
@@ -1,5 +1,6 @@
 import {COLORS, SPACING, FONT_SIZES, RADIUS, CtaButton} from '../../app-bridge';
 import {GithubTokenGate} from '../../github/GithubTokenGate';
+import {targetBranch} from '../../github/githubCommit';
 import {
   useRevealAdmin,
   RevealAdminForm,
@@ -7,7 +8,7 @@ import {
   SynergyPreviewPanel,
 } from './index';
 
-export function RevealAdminPage() {
+export function RevealPage() {
   const ctrl = useRevealAdmin();
 
   if (!ctrl.token) {
@@ -57,7 +58,7 @@ export function RevealAdminPage() {
             <div style={{color: COLORS.error, fontSize: FONT_SIZES.sm}}>{ctrl.publishError}</div>
           )}
           <CtaButton onClick={ctrl.publish} disabled={!ctrl.canPublish || ctrl.publishing} style={{marginTop: SPACING.md}}>
-            {ctrl.publishing ? 'Publishing…' : 'Publish to master'}
+            {ctrl.publishing ? 'Publishing…' : `Publish to ${targetBranch()}`}
           </CtaButton>
         </section>
 
```

Edit `src/tools/reveal/index.ts` (the header names the app path):

```diff
--- a/src/tools/reveal/index.ts
+++ b/src/tools/reveal/index.ts
@@ -1,4 +1,3 @@
-// apps/web/src/features/reveal-admin/index.ts
 export {buildPreviewCard, type RevealCardForm} from './buildPreviewCard';
 export {validateRevealCardForm, type ValidationResult} from './validateForm';
 export {commitNewCard, validateToken, type CommitResult, type TokenInfo} from './githubClient';
```

Edit `src/tools/reveal/__tests__/insertCardIntoPreviewJson.test.ts`:

```diff
--- a/src/tools/reveal/__tests__/insertCardIntoPreviewJson.test.ts
+++ b/src/tools/reveal/__tests__/insertCardIntoPreviewJson.test.ts
@@ -1,8 +1,7 @@
 import {describe, it, expect} from 'vitest';
-import fs from 'node:fs';
-import path from 'node:path';
 import {insertCardIntoPreviewJson} from '../insertCardIntoPreviewJson';
 import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
+import {PINNED_PREVIEW_CARDS_JSON} from '../../../app-bridge';
 
 // The shape previewCards.json is left in after a set graduates: no cards yet.
 const EMPTY = `{
@@ -63,8 +62,8 @@ describe('insertCardIntoPreviewJson', () => {
     expect((JSON.parse(twice) as {cards: unknown[]}).cards).toHaveLength(2);
   });
 
-  it('inserts into the real previewCards.json, whatever state it is in', () => {
-    const real = fs.readFileSync(path.resolve(process.cwd(), 'public/data/previewCards.json'), 'utf8');
+  it('inserts into the pinned app copy of previewCards.json, whatever state it is in', () => {
+    const real = PINNED_PREVIEW_CARDS_JSON;
     const countBefore = (JSON.parse(real) as {cards: unknown[]}).cards.length;
     const out = insertCardIntoPreviewJson(real, NEW_CARD);
     expect((JSON.parse(out) as {cards: unknown[]}).cards).toHaveLength(countBefore + 1);
```

- [ ] **Step 3: Write the failing route test**

In `src/router.test.tsx`, add at the end of the `describe`. Tasks 7 and 8 add rows to this table.

```tsx
  it.each([['/reveal', 'Reveal admin']])('asks for a GitHub token before %s', (path, title) => {
    renderAt(path);
    expect(screen.getByRole('heading', {level: 1, name: title})).toBeInTheDocument();
  });
```

Run: `pnpm exec vitest run src/router.test.tsx`
Expected: FAIL. `/reveal` shows "Not found".

- [ ] **Step 4: Add the route**

In `src/router.tsx`, import the page after the shell imports, and add its route before the `*` route:

```tsx
import {RevealPage} from './tools/reveal/RevealPage';
```

```tsx
      {path: 'reveal', element: <RevealPage />},
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `pnpm exec vitest run src/tools/reveal src/router.test.tsx`
Expected: 35 passed (29 reveal, 6 router).

- [ ] **Step 6: Whole suite, Storybook, browser**

Run: `pnpm typecheck`, `pnpm lint`, `pnpm test:run`, then the Storybook check.
Expected:
- exit 0, exit 0, and 93 passed;
- Storybook adds the three `Reveal Admin/*` stories;
- in the browser, `/reveal` shows the "Reveal admin" token gate.

- [ ] **Step 7: Commit**

```bash
git add src/tools/reveal src/router.tsx src/router.test.tsx
```

```bash
USER_APPROVED=1 git commit -m "feat(reveal): port the reveal publisher (#2)"
```

---

### Task 7: Card images

**Files:**
- Create (codemod): `src/tools/image/**` (14 files)
- Create: `src/tools/image/__tests__/CardImagePicker.test.tsx`
- Modify: `src/tools/image/components/CardImagePicker.tsx`, `src/router.tsx`, `src/router.test.tsx`

- [ ] **Step 1: Port the files**

Run: `node "$CODEMOD" image`
Expected: `image: 14 files written under .`

- [ ] **Step 2: Rename the page and name the branch on the button**

Edit `src/tools/image/ImagePage.tsx`:

```diff
--- a/src/tools/image/ImagePage.tsx
+++ b/src/tools/image/ImagePage.tsx
@@ -2,7 +2,7 @@ import {COLORS, SPACING, FONT_SIZES, RADIUS, CtaButton} from '../../app-bridge';
 import {GithubTokenGate} from '../../github/GithubTokenGate';
 import {useImageAdmin, CardImagePicker, UploadColumn} from './index';
 
-export function ImageAdminPage() {
+export function ImagePage() {
   const ctrl = useImageAdmin();
 
   if (!ctrl.token) {
```

Edit `src/tools/image/components/UploadColumn.tsx`:

```diff
--- a/src/tools/image/components/UploadColumn.tsx
+++ b/src/tools/image/components/UploadColumn.tsx
@@ -1,5 +1,6 @@
 import type {LorcanaCard} from 'inkweave-synergy-engine';
 import {COLORS, SPACING, FONT_SIZES, CtaButton} from '../../../app-bridge';
+import {targetBranch} from '../../../github/githubCommit';
 import {ImageComparePanel} from './ImageComparePanel';
 
 interface UploadColumnProps {
@@ -50,7 +51,7 @@ export function UploadColumn({
       )}
 
       <CtaButton onClick={onPublish} disabled={!canPublish || publishing} style={{marginTop: SPACING.md}}>
-        {publishing ? 'Publishing…' : 'Publish to master'}
+        {publishing ? 'Publishing…' : `Publish to ${targetBranch()}`}
       </CtaButton>
     </aside>
   );
```

- [ ] **Step 3: Pin the picker's behaviour before changing it**

Create `src/tools/image/__tests__/CardImagePicker.test.tsx`:

```tsx
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {CardImagePicker} from '../components/CardImagePicker';

function card(id: string, fullName: string): LorcanaCard {
  return {id, name: fullName, fullName, cost: 1, ink: 'Amber', inkwell: true, type: 'Character'};
}

const CARDS = [card('5001', 'Elsa - Snow Queen'), card('5002', 'Anna - Heir to Arendelle')];

describe('CardImagePicker', () => {
  it('picks a card and marks the selected one pressed', async () => {
    const onSelect = vi.fn();
    render(<CardImagePicker cards={CARDS} selectedId="5002" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button', {name: 'Elsa - Snow Queen'}));
    expect(onSelect).toHaveBeenCalledWith(CARDS[0]);
    expect(screen.getByRole('button', {name: 'Anna - Heir to Arendelle'})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', {name: 'Elsa - Snow Queen'})).toHaveAttribute('aria-pressed', 'false');
  });

  it('narrows the list as you search', async () => {
    render(<CardImagePicker cards={CARDS} selectedId={null} onSelect={() => {}} />);
    await userEvent.type(screen.getByRole('searchbox', {name: 'Search cards'}), 'anna');
    expect(screen.queryByRole('button', {name: 'Elsa - Snow Queen'})).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Anna - Heir to Arendelle'})).toBeInTheDocument();
  });
});
```

Run: `pnpm exec vitest run src/tools/image`
Expected: 8 passed. The ported picker already behaves this way.

- [ ] **Step 4: See the design-token rules fail**

Run: `pnpm lint`
Expected: 2 errors in `CardImagePicker.tsx`, `inkweave/no-adhoc-buttons` and `inkweave/no-raw-radius`.

- [ ] **Step 5: Rows from the kit**

Replace `src/tools/image/components/CardImagePicker.tsx`:

```tsx
import {useState} from 'react';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {smallImageUrl, COLORS, CtaButton, SPACING, FONT_SIZES, RADIUS} from '../../../app-bridge';
import {filterCards} from '../filterCards';

interface CardImagePickerProps {
  cards: LorcanaCard[];
  selectedId: string | null;
  onSelect: (card: LorcanaCard) => void;
}

const searchStyle = {
  width: '100%',
  padding: '8px 10px',
  background: COLORS.surfaceAlt,
  color: COLORS.text,
  border: `1px solid ${COLORS.surfaceHover}`,
  borderRadius: RADIUS.sm,
  fontSize: FONT_SIZES.md,
};

// Kit button (#509) laid out as a list row: ghost marks the selection, neutral the rest.
const rowStyle = {
  justifyContent: 'flex-start',
  gap: SPACING.sm,
  width: '100%',
  minHeight: 0,
  padding: SPACING.xs,
  borderRadius: RADIUS.sm,
  textAlign: 'left' as const,
};

function CardPickerRow({card, selected, onSelect}: {card: LorcanaCard; selected: boolean; onSelect: (card: LorcanaCard) => void}) {
  return (
    <CtaButton
      type="button"
      variant={selected ? 'ghost' : 'neutral'}
      aria-pressed={selected}
      onClick={() => onSelect(card)}
      style={rowStyle}>
      <img
        src={smallImageUrl(card)}
        alt=""
        width={32}
        height={45}
        style={{borderRadius: RADIUS.sm, flexShrink: 0, objectFit: 'cover'}}
      />
      <span style={{fontSize: FONT_SIZES.sm, color: COLORS.text}}>{card.fullName}</span>
    </CtaButton>
  );
}

export function CardImagePicker({cards, selectedId, onSelect}: CardImagePickerProps) {
  const [query, setQuery] = useState('');
  const results = filterCards(cards, query);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search cards..."
        aria-label="Search cards"
        style={searchStyle}
      />
      <ul
        style={{
          listStyle: 'none',
          margin: `${SPACING.sm}px 0 0`,
          padding: 0,
          maxHeight: 340,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: SPACING.xs,
        }}>
        {results.map((card) => (
          <li key={card.id}>
            <CardPickerRow card={card} selected={card.id === selectedId} onSelect={onSelect} />
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Run: `pnpm lint`, then `pnpm exec vitest run src/tools/image`
Expected: exit 0, then 8 passed.

- [ ] **Step 6: Route, test first**

In `src/router.test.tsx`, add the row `['/image', 'Card image admin']` to the token-gate table.

Run: `pnpm exec vitest run src/router.test.tsx`
Expected: FAIL. `/image` shows "Not found".

In `src/router.tsx`:

```tsx
import {ImagePage} from './tools/image/ImagePage';
```

```tsx
      {path: 'image', element: <ImagePage />},
```

Run: `pnpm exec vitest run src/router.test.tsx`
Expected: 7 passed.

- [ ] **Step 7: Whole suite, Storybook, browser**

Run: `pnpm typecheck`, `pnpm lint`, `pnpm test:run`, then the Storybook check.
Expected:
- exit 0, exit 0, and 102 passed;
- Storybook adds the three `ImageAdmin/*` stories;
- in the browser, `/image` shows the "Card image admin" token gate.

The owner checks the picker's new rows in the `ImageAdmin/CardImagePicker` story.

- [ ] **Step 8: Commit**

```bash
git add src/tools/image src/router.tsx src/router.test.tsx
```

```bash
USER_APPROVED=1 git commit -m "feat(image): port the card image tool (#2)"
```

---

### Task 8: Engine tuning

**Files:**
- Create (codemod): `src/tools/tuning/**` (16 files)
- Create: `src/tools/tuning/useLiveTuning.ts`, `src/tools/tuning/__tests__/{TuningPage,RuleSelector,PendingTray}.test.tsx`, `docs/tuning-editor-design.md`
- Modify: `src/tools/tuning/{githubClient.ts,TuningPage.tsx,useTuningAdmin.ts}`, `src/tools/tuning/components/{TuningEditor,RuleSelector,PendingTray}.tsx` and two stories, `src/router.tsx`, `src/router.test.tsx`

- [ ] **Step 1: Port the files**

Run: `node "$CODEMOD" tuning`
Expected: `tuning: 16 files written under .`

- [ ] **Step 2: Write the tests**

Create `src/tools/tuning/__tests__/TuningPage.test.tsx`, the acceptance test for the live read:

```tsx
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {TuningPage} from '../TuningPage';

// A tuning.json that differs from the copy bundled into the build, so a pass
// proves the editor shows the live file.
const LIVE: TuningConfig = {
  playstyles: {ramp: {name: 'Live Ramp', tagline: 'From the branch'}},
  directRules: {},
  ruleTexts: {'shift-targets': {}, ramp: {scores: {}, templates: {}}},
};

beforeEach(() => localStorage.setItem('inkweave.reveal-admin.gh-token', 'tok'));

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('TuningPage', () => {
  it('edits the live tuning.json from the target branch, not the bundled copy', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(LIVE)));
    render(<TuningPage />);

    expect(await screen.findByRole('button', {name: 'Live Ramp'})).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'https://api.github.com/repos/Doberjohn/inkweave/contents/packages/synergy-engine/src/data/tuning.json?ref=master',
    );
  });

  it('says why when tuning.json cannot be read', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Not Found', {status: 404}));
    render(<TuningPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not read tuning.json: GitHub 404');
  });
});
```

Create `src/tools/tuning/__tests__/RuleSelector.test.tsx`:

```tsx
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {RuleSelector} from '../components/RuleSelector';

const CONFIG: TuningConfig = {
  playstyles: {ramp: {name: 'Ramp', tagline: 't'}},
  directRules: {'singer-songs': {name: 'Singer + Songs', description: 'd'}},
  ruleTexts: {'shift-targets': {}, ramp: {scores: {}, templates: {}}},
};

describe('RuleSelector', () => {
  it('lists the playstyles and direct rules of the config it is given', () => {
    render(<RuleSelector config={CONFIG} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByRole('button', {name: 'Ramp'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Singer + Songs'})).toBeInTheDocument();
  });

  it('selects a rule by id and marks the selected one pressed', async () => {
    const onSelect = vi.fn();
    render(<RuleSelector config={CONFIG} selectedId="ramp" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button', {name: 'Singer + Songs'}));
    expect(onSelect).toHaveBeenCalledWith('singer-songs');
    expect(screen.getByRole('button', {name: 'Ramp'})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', {name: 'Singer + Songs'})).toHaveAttribute('aria-pressed', 'false');
  });
});
```

Create `src/tools/tuning/__tests__/PendingTray.test.tsx`. It pins today's behaviour before Step 5 changes the buttons.

```tsx
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {PendingTray} from '../components/PendingTray';
import type {PendingEdit} from '../useTuningAdmin';

const EDIT: PendingEdit = {
  pathKey: '["playstyles","ramp","name"]',
  path: ['playstyles', 'ramp', 'name'],
  value: 'Ramp!',
  oldValue: 'Ramp',
  label: 'Title · text',
  valid: true,
};

function renderTray(pending: PendingEdit[], handlers: {onRevert?: () => void; onClear?: () => void} = {}) {
  render(
    <PendingTray
      pending={pending}
      publishDisabled={false}
      publishing={false}
      result={null}
      error={null}
      onRevert={handlers.onRevert ?? (() => {})}
      onClear={handlers.onClear ?? (() => {})}
      onPublish={() => {}}
    />,
  );
}

describe('PendingTray', () => {
  it('reverts one edit by its path key', async () => {
    const onRevert = vi.fn();
    renderTray([EDIT], {onRevert});
    await userEvent.click(screen.getByRole('button', {name: 'revert'}));
    expect(onRevert).toHaveBeenCalledWith(EDIT.pathKey);
  });

  it('clears every edit, and offers Clear all only when there are edits', async () => {
    const onClear = vi.fn();
    renderTray([EDIT], {onClear});
    await userEvent.click(screen.getByRole('button', {name: 'Clear all'}));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('hides Clear all with nothing pending', () => {
    renderTray([]);
    expect(screen.queryByRole('button', {name: 'Clear all'})).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run them to see which fail**

Run: `pnpm exec vitest run src/tools/tuning`
Expected:
- FAIL for `TuningPage.test.tsx`: `TuningPage` isn't exported, because the page is still `TuningAdminPage`.
- FAIL for `RuleSelector.test.tsx`: the selector lists the bundled `TUNING`, not the `config` it's given.
- `PendingTray.test.tsx` passes.

- [ ] **Step 4: Read tuning.json live**

Edit `src/tools/tuning/githubClient.ts`:

```diff
--- a/src/tools/tuning/githubClient.ts
+++ b/src/tools/tuning/githubClient.ts
@@ -1,3 +1,4 @@
+import type {TuningConfig} from 'inkweave-synergy-engine';
 import {
   commitFiles,
   readRepoFile,
@@ -31,8 +32,16 @@ export function applyTuningEdits(text: string, edits: TuningEdit[]): string {
 }
 
 /**
- * Reads the live tuning.json from master, applies the edits, and commits the
- * result back to master in one atomic commit.
+ * The live tuning.json on the target branch. The tool edits what the engine
+ * reads now, not the copy bundled into admin's build (docs/PLAN.md, 4.4).
+ */
+export async function readTuning(token: string): Promise<TuningConfig> {
+  return JSON.parse(await readRepoFile(token, TUNING_PATH)) as TuningConfig;
+}
+
+/**
+ * Reads the live tuning.json from the target branch, applies the edits, and
+ * commits the result back to it in one atomic commit.
  */
 export async function commitTuning(opts: {
   token: string;
```

Create `src/tools/tuning/useLiveTuning.ts`:

```ts
import {useEffect, useState} from 'react';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {readTuning} from './githubClient';

export type LiveTuning =
  | {status: 'loading'}
  | {status: 'ready'; config: TuningConfig}
  | {status: 'error'; error: string};

/** Reads tuning.json from the target branch once per token. */
export function useLiveTuning(token: string): LiveTuning {
  const [state, setState] = useState<LiveTuning>({status: 'loading'});

  useEffect(() => {
    let cancelled = false;
    readTuning(token).then(
      (config) => {
        if (!cancelled) setState({status: 'ready', config});
      },
      (e: unknown) => {
        if (!cancelled) setState({status: 'error', error: e instanceof Error ? e.message : 'Read failed'});
      },
    );
    return () => {
      cancelled = true;
    };
  }, [token]);

  return state;
}
```

Replace `src/tools/tuning/TuningPage.tsx`:

```tsx
import {COLORS, SPACING, FONT_SIZES, CtaButton} from '../../app-bridge';
import {GithubTokenGate} from '../../github/GithubTokenGate';
import {targetBranch} from '../../github/githubCommit';
import {useGithubToken} from '../../github/useGithubToken';
import {TuningEditor} from './index';
import {useLiveTuning} from './useLiveTuning';

/** Loads the live tuning.json, then hands it to the editor. */
function LiveTuningEditor({token}: {token: string}) {
  const tuning = useLiveTuning(token);
  if (tuning.status === 'loading') {
    return <p style={{color: COLORS.textMuted}}>Reading tuning.json from {targetBranch()}…</p>;
  }
  if (tuning.status === 'error') {
    return (
      <div role="alert" style={{color: COLORS.error, fontSize: FONT_SIZES.sm}}>
        Could not read tuning.json: {tuning.error}
      </div>
    );
  }
  return <TuningEditor token={token} config={tuning.config} />;
}

export function TuningPage() {
  const {token, setToken, clearToken} = useGithubToken();

  if (!token) {
    return <GithubTokenGate title="Tuning admin" onSave={setToken} />;
  }

  return (
    <main style={{maxWidth: 1000, margin: '0 auto', padding: SPACING.lg, color: COLORS.text}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h1 style={{fontSize: FONT_SIZES.xxl}}>Tuning editor</h1>
        <CtaButton
          variant="neutral"
          onClick={clearToken}
          style={{minHeight: 0, padding: '6px 10px', fontSize: FONT_SIZES.sm}}>
          Forget token
        </CtaButton>
      </div>

      <LiveTuningEditor token={token} />
    </main>
  );
}
```

Edit `src/tools/tuning/components/TuningEditor.tsx`:

```diff
--- a/src/tools/tuning/components/TuningEditor.tsx
+++ b/src/tools/tuning/components/TuningEditor.tsx
@@ -1,5 +1,5 @@
 import {useState} from 'react';
-import {TUNING} from 'inkweave-synergy-engine';
+import type {TuningConfig} from 'inkweave-synergy-engine';
 import {COLORS, SPACING, FONT_SIZES} from '../../../app-bridge';
 import {useTuningAdmin} from '../useTuningAdmin';
 import {RuleSelector} from './RuleSelector';
@@ -8,6 +8,8 @@ import {TierRow} from './TierRow';
 
 interface TuningEditorProps {
   token: string;
+  /** The live tuning.json the edits apply to. */
+  config: TuningConfig;
 }
 
 interface RowSpec {
@@ -19,8 +21,8 @@ interface RowSpec {
 }
 
 /** Rows for the Shift Targets tier list — text plus an optional score per tier. */
-function shiftTierRows(): RowSpec[] {
-  return Object.entries(TUNING.ruleTexts['shift-targets']).map(([tierKey, entry]) => ({
+function shiftTierRows(config: TuningConfig): RowSpec[] {
+  return Object.entries(config.ruleTexts['shift-targets']).map(([tierKey, entry]) => ({
     label: tierKey,
     textPath: ['ruleTexts', 'shift-targets', tierKey, 'text'],
     textValue: entry.text,
@@ -30,13 +32,13 @@ function shiftTierRows(): RowSpec[] {
 }
 
 /** Rows for the Ramp rule — score-only rows plus template-text rows. */
-function rampRows(): RowSpec[] {
-  const scores = Object.entries(TUNING.ruleTexts.ramp.scores).map(([k, v]) => ({
+function rampRows(config: TuningConfig): RowSpec[] {
+  const scores = Object.entries(config.ruleTexts.ramp.scores).map(([k, v]) => ({
     label: `score · ${k}`,
     scorePath: ['ruleTexts', 'ramp', 'scores', k],
     scoreValue: v,
   }));
-  const templates = Object.entries(TUNING.ruleTexts.ramp.templates).map(([k, t]) => ({
+  const templates = Object.entries(config.ruleTexts.ramp.templates).map(([k, t]) => ({
     label: `template · ${k}`,
     textPath: ['ruleTexts', 'ramp', 'templates', k],
     textValue: t,
@@ -45,24 +47,24 @@ function rampRows(): RowSpec[] {
 }
 
 /** Build the editable rows for a selected rule id. */
-function rowsForSelection(selectedId: string): RowSpec[] {
+function rowsForSelection(config: TuningConfig, selectedId: string): RowSpec[] {
   const rows: RowSpec[] = [];
-  const playstyle = TUNING.playstyles[selectedId];
+  const playstyle = config.playstyles[selectedId];
   if (playstyle) {
     rows.push({label: 'Title', textPath: ['playstyles', selectedId, 'name'], textValue: playstyle.name});
     rows.push({label: 'Tagline', textPath: ['playstyles', selectedId, 'tagline'], textValue: playstyle.tagline});
   }
-  const direct = TUNING.directRules[selectedId];
+  const direct = config.directRules[selectedId];
   if (direct) {
     rows.push({label: 'Label', textPath: ['directRules', selectedId, 'name'], textValue: direct.name});
     rows.push({label: 'Description', textPath: ['directRules', selectedId, 'description'], textValue: direct.description});
   }
-  if (selectedId === 'shift-targets') rows.push(...shiftTierRows());
-  if (selectedId === 'ramp') rows.push(...rampRows());
+  if (selectedId === 'shift-targets') rows.push(...shiftTierRows(config));
+  if (selectedId === 'ramp') rows.push(...rampRows(config));
   return rows;
 }
 
-export function TuningEditor({token}: TuningEditorProps) {
+export function TuningEditor({token, config}: TuningEditorProps) {
   const {pending, stageEdit, revertEdit, clear, publish, publishDisabled, publishing, result, error} =
     useTuningAdmin(token);
   const [selectedId, setSelectedId] = useState<string | null>(null);
@@ -70,13 +72,13 @@ export function TuningEditor({token}: TuningEditorProps) {
   const errorFor = (path: (string | number)[] | undefined) =>
     path ? pending.find((p) => p.pathKey === JSON.stringify(path))?.error : undefined;
 
-  const rows = selectedId ? rowsForSelection(selectedId) : [];
+  const rows = selectedId ? rowsForSelection(config, selectedId) : [];
 
   return (
     <div>
       <div style={{display: 'flex', gap: SPACING.xl, alignItems: 'flex-start', marginTop: SPACING.md}}>
         <aside style={{flex: '0 0 220px'}}>
-          <RuleSelector selectedId={selectedId} onSelect={setSelectedId} />
+          <RuleSelector config={config} selectedId={selectedId} onSelect={setSelectedId} />
         </aside>
         <div style={{flex: '1 1 auto', minWidth: 0}}>
           {selectedId ? (
```

Edit `src/tools/tuning/useTuningAdmin.ts` (the editor gets the config from the page now):

```diff
--- a/src/tools/tuning/useTuningAdmin.ts
+++ b/src/tools/tuning/useTuningAdmin.ts
@@ -1,5 +1,4 @@
 import {useState} from 'react';
-import {TUNING} from 'inkweave-synergy-engine';
 import {validateScore, validateText} from './validate';
 import {commitTuning} from './githubClient';
 
@@ -33,7 +32,6 @@ function toPendingEdit(args: StageArgs): PendingEdit {
 }
 
 export interface UseTuningAdminResult {
-  config: typeof TUNING;
   pending: PendingEdit[];
   stageEdit: (args: StageArgs) => void;
   revertEdit: (pathKey: string) => void;
@@ -94,7 +92,6 @@ export function useTuningAdmin(token: string): UseTuningAdminResult {
   }
 
   return {
-    config: TUNING,
     pending,
     stageEdit,
     revertEdit,
```

Replace `src/tools/tuning/components/RuleSelector.tsx`. It takes the config, and its rows come from the kit:

```tsx
import type {TuningConfig} from 'inkweave-synergy-engine';
import {COLORS, CtaButton, FONT_SIZES, RADIUS, SPACING} from '../../../app-bridge';

interface RuleSelectorProps {
  /** The live tuning.json; its playstyles and direct rules become the picker entries. */
  config: TuningConfig;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const groupLabelStyle = {
  fontSize: FONT_SIZES.xs,
  color: COLORS.gray600,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.5,
  margin: `${SPACING.md}px 0 ${SPACING.xs}px`,
};

// Kit button (#509) laid out as a list row: ghost marks the selection, neutral the rest.
const itemStyle = {
  width: '100%',
  justifyContent: 'flex-start',
  minHeight: 0,
  padding: `${SPACING.sm}px ${SPACING.md}px`,
  marginBottom: SPACING.xs,
  borderRadius: RADIUS.sm,
  fontSize: FONT_SIZES.sm,
  textAlign: 'left' as const,
};

function RuleButton({id, name, selected, onSelect}: {id: string; name: string; selected: boolean; onSelect: (id: string) => void}) {
  return (
    <CtaButton
      type="button"
      variant={selected ? 'ghost' : 'neutral'}
      aria-pressed={selected}
      onClick={() => onSelect(id)}
      style={itemStyle}>
      {name}
    </CtaButton>
  );
}

/** Two-group picker (playstyles + direct synergies) that drives the editor. */
export function RuleSelector({config, selectedId, onSelect}: RuleSelectorProps) {
  return (
    <nav aria-label="Tuning rules">
      <div style={groupLabelStyle}>Playstyles</div>
      {Object.entries(config.playstyles).map(([id, {name}]) => (
        <RuleButton key={id} id={id} name={name} selected={id === selectedId} onSelect={onSelect} />
      ))}
      <div style={groupLabelStyle}>Direct synergies</div>
      {Object.entries(config.directRules).map(([id, {name}]) => (
        <RuleButton key={id} id={id} name={name} selected={id === selectedId} onSelect={onSelect} />
      ))}
    </nav>
  );
}
```

The stories render with the bundled copy. Edit `src/tools/tuning/components/TuningEditor.stories.tsx`:

```diff
--- a/src/tools/tuning/components/TuningEditor.stories.tsx
+++ b/src/tools/tuning/components/TuningEditor.stories.tsx
@@ -1,10 +1,12 @@
 import type {Meta, StoryObj} from '@storybook/react-vite';
+import {TUNING} from 'inkweave-synergy-engine';
 import {TuningEditor} from './TuningEditor';
 
 const meta: Meta<typeof TuningEditor> = {
   title: 'TuningAdmin/TuningEditor',
   component: TuningEditor,
-  args: {token: 'ghp_example'},
+  // The bundled copy stands in for the live tuning.json the page reads.
+  args: {token: 'ghp_example', config: TUNING},
   decorators: [
     (Story) => (
       <div style={{maxWidth: 1000, padding: 16}}>
```

Edit `src/tools/tuning/components/RuleSelector.stories.tsx`:

```diff
--- a/src/tools/tuning/components/RuleSelector.stories.tsx
+++ b/src/tools/tuning/components/RuleSelector.stories.tsx
@@ -1,5 +1,6 @@
 import type {Meta, StoryObj} from '@storybook/react-vite';
 import {useState} from 'react';
+import {TUNING} from 'inkweave-synergy-engine';
 import {RuleSelector} from './RuleSelector';
 
 const meta: Meta<typeof RuleSelector> = {
@@ -13,7 +14,7 @@ function Harness({initial}: {initial: string | null}) {
   const [selectedId, setSelectedId] = useState<string | null>(initial);
   return (
     <div style={{maxWidth: 240}}>
-      <RuleSelector selectedId={selectedId} onSelect={setSelectedId} />
+      <RuleSelector config={TUNING} selectedId={selectedId} onSelect={setSelectedId} />
     </div>
   );
 }
```

Run: `pnpm exec vitest run src/tools/tuning`
Expected: 18 passed.

- [ ] **Step 5: The tray's buttons from the kit**

Run: `pnpm lint`
Expected: 2 `inkweave/no-adhoc-buttons` errors in `PendingTray.tsx`.

Edit `src/tools/tuning/components/PendingTray.tsx`:

```diff
--- a/src/tools/tuning/components/PendingTray.tsx
+++ b/src/tools/tuning/components/PendingTray.tsx
@@ -1,5 +1,5 @@
 import type {PendingEdit} from '../useTuningAdmin';
-import {COLORS, SPACING, FONT_SIZES, RADIUS, CtaButton} from '../../../app-bridge';
+import {COLORS, SPACING, FONT_SIZES, RADIUS, CtaButton, LinkButton} from '../../../app-bridge';
 
 interface PendingTrayProps {
   pending: PendingEdit[];
@@ -25,17 +25,6 @@ const rowStyle = {
   fontSize: FONT_SIZES.sm,
 };
 
-const revertBtnStyle = {
-  flexShrink: 0,
-  background: 'none',
-  border: `1px solid ${COLORS.surfaceHover}`,
-  color: COLORS.gray600,
-  borderRadius: RADIUS.sm,
-  padding: '4px 8px',
-  cursor: 'pointer',
-  fontSize: FONT_SIZES.xs,
-};
-
 function PendingEditRow({edit, onRevert}: {edit: PendingEdit; onRevert: (pathKey: string) => void}) {
   return (
     <div style={rowStyle}>
@@ -45,9 +34,9 @@ function PendingEditRow({edit, onRevert}: {edit: PendingEdit; onRevert: (pathKey
           {edit.valid ? `${String(edit.oldValue)} → ${String(edit.value)}` : edit.error}
         </div>
       </div>
-      <button style={revertBtnStyle} onClick={() => onRevert(edit.pathKey)}>
+      <LinkButton type="button" tone="muted" size="sm" onClick={() => onRevert(edit.pathKey)} style={{flexShrink: 0}}>
         revert
-      </button>
+      </LinkButton>
     </div>
   );
 }
@@ -82,9 +71,9 @@ export function PendingTray({
       <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm}}>
         <h2 style={{fontSize: FONT_SIZES.xl, margin: 0}}>Pending changes</h2>
         {pending.length > 0 && (
-          <button onClick={onClear} style={revertBtnStyle}>
+          <LinkButton type="button" tone="muted" size="sm" onClick={onClear}>
             Clear all
-          </button>
+          </LinkButton>
         )}
       </div>
 
```

Run: `pnpm lint`, then `pnpm exec vitest run src/tools/tuning`
Expected: exit 0, then 18 passed.

- [ ] **Step 6: Route, test first**

In `src/router.test.tsx`, add the row `['/tuning', 'Tuning admin']` to the token-gate table.

Run: `pnpm exec vitest run src/router.test.tsx`
Expected: FAIL. `/tuning` shows "Not found".

In `src/router.tsx`:

```tsx
import {TuningPage} from './tools/tuning/TuningPage';
```

```tsx
      {path: 'tuning', element: <TuningPage />},
```

Run: `pnpm exec vitest run src/router.test.tsx`
Expected: 8 passed.

- [ ] **Step 7: Keep the design record**

```bash
cp upstream/inkweave/docs/superpowers/specs/2026-07-07-admin-tuning-editor-design.md docs/tuning-editor-design.md
```

Insert this paragraph under the first heading of `docs/tuning-editor-design.md`:

```markdown
> Moved from the app repo (`docs/superpowers/specs/2026-07-07-admin-tuning-editor-design.md` at `e70249be`) when P2 ported the tool; P4 deletes the original. Paths below are the app's, from before the move. The tool now reads `tuning.json` live from the target branch instead of the bundled copy.
```

- [ ] **Step 8: Whole suite, Storybook, browser**

Run: `pnpm typecheck`, `pnpm lint`, `pnpm test:run`, then the Storybook check.
Expected:
- exit 0, exit 0, and 121 passed;
- Storybook adds the four `TuningAdmin/*` stories;
- in the browser, `/tuning` shows the "Tuning admin" token gate.

- [ ] **Step 9: Commit**

```bash
git add src/tools/tuning src/router.tsx src/router.test.tsx docs/tuning-editor-design.md
```

```bash
USER_APPROVED=1 git commit -m "feat(tuning): port the tuning editor, reading the live tuning.json (#2)"
```

---

### Task 9: Analytics

**Files:**
- Create (codemod): `src/tools/analytics/**` (40 files; `AdminGate` and its test stay in the app)
- Create: `src/tools/analytics/adminData.ts`, `src/tools/analytics/__tests__/{adminData.test.ts,DayGroup.test.tsx,PairList.test.tsx,RuleCalibrationTable.test.tsx,WebAnalyticsView.test.tsx}`
- Modify: the three data hooks, `vercelAnalyticsTypes.ts`, `__tests__/useVoteAnalytics.test.ts`, `AnalyticsPage.tsx`, `DayGroup.tsx`, `PairList.tsx`, `RuleCalibrationTable.tsx`, `WebAnalyticsView.tsx`, `Scorecard.tsx`, `src/router.tsx`, `src/router.test.tsx`

- [ ] **Step 1: Port the files**

Run: `node "$CODEMOD" analytics`
Expected: `analytics: 40 files written under .`

- [ ] **Step 2: Write the failing test for /admin-data/**

Create `src/tools/analytics/__tests__/adminData.test.ts`:

```ts
import {afterEach, describe, expect, it, vi} from 'vitest';
import {fetchAdminData} from '../adminData';

afterEach(() => vi.unstubAllGlobals());

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {headers: {'content-type': 'application/json; charset=utf-8'}});

describe('fetchAdminData', () => {
  it('reads the file from /admin-data/, never the forwarded /data/', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({votes: []}));
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchAdminData('vote-log.json')).toEqual({votes: []});
    expect(fetchMock).toHaveBeenCalledWith('/admin-data/vote-log.json');
  });

  it("treats the SPA fallback's index.html as not generated yet", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<!doctype html>', {headers: {'content-type': 'text/html'}})),
    );
    await expect(fetchAdminData('vote-log.json')).rejects.toThrow('vote-log.json has not been generated yet');
  });

  it('reports an HTTP error with its status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', {status: 404})));
    await expect(fetchAdminData('vote-log.json')).rejects.toThrow('vote-log.json: HTTP 404');
  });
});
```

Run: `pnpm exec vitest run src/tools/analytics/__tests__/adminData.test.ts`
Expected: FAIL. `../adminData` does not exist.

- [ ] **Step 3: The helper**

Create `src/tools/analytics/adminData.ts`:

```ts
/**
 * Admin's own generated files live under /admin-data/, never /data/, which
 * forwards to the public app (docs/PLAN.md, D8). P3's deploy step writes them.
 */
const ADMIN_DATA = '/admin-data/';

/**
 * Fetch one admin-data artifact. A file that was never generated comes back as
 * the SPA's index.html with a 200 (Vite's dev fallback and vercel.json's
 * rewrite both do this), so a response that isn't JSON counts as missing. The
 * app's usePrecomputedSynergies guards /data/synergies/ the same way.
 */
export async function fetchAdminData<T>(file: string): Promise<T> {
  const res = await fetch(`${ADMIN_DATA}${file}`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  if (!res.headers.get('content-type')?.includes('application/json')) {
    throw new Error(`${file} has not been generated yet`);
  }
  return (await res.json()) as T;
}
```

Run: `pnpm exec vitest run src/tools/analytics/__tests__/adminData.test.ts`
Expected: 3 passed.

- [ ] **Step 4: The hooks read /admin-data/**

Edit `src/tools/analytics/useVoteAnalytics.ts`:

```diff
--- a/src/tools/analytics/useVoteAnalytics.ts
+++ b/src/tools/analytics/useVoteAnalytics.ts
@@ -1,8 +1,7 @@
 import {useEffect, useState} from 'react';
+import {fetchAdminData} from './adminData';
 import type {VoteAnalytics} from './voteAnalyticsTypes';
 
-const ANALYTICS_PATH = '/data/vote-analytics.json';
-
 export interface UseVoteAnalyticsReturn {
   data: VoteAnalytics | null;
   loading: boolean;
@@ -17,12 +16,8 @@ export function useVoteAnalytics(): UseVoteAnalyticsReturn {
 
   useEffect(() => {
     let cancelled = false;
-    fetch(ANALYTICS_PATH)
-      .then((res) => {
-        if (!res.ok) throw new Error(`vote-analytics fetch failed: ${res.status}`);
-        return res.json();
-      })
-      .then((json: VoteAnalytics) => {
+    fetchAdminData<VoteAnalytics>('vote-analytics.json')
+      .then((json) => {
         if (!cancelled) {
           setData(json);
           setLoading(false);
```

Edit `src/tools/analytics/useVoteLog.ts`:

```diff
--- a/src/tools/analytics/useVoteLog.ts
+++ b/src/tools/analytics/useVoteLog.ts
@@ -1,8 +1,7 @@
 import {useEffect, useState} from 'react';
+import {fetchAdminData} from './adminData';
 import type {VoteLog} from './voteLogTypes';
 
-const VOTE_LOG_PATH = '/data/vote-log.json';
-
 export interface UseVoteLogReturn {
   data: VoteLog | null;
   loading: boolean;
@@ -17,12 +16,8 @@ export function useVoteLog(): UseVoteLogReturn {
 
   useEffect(() => {
     let cancelled = false;
-    fetch(VOTE_LOG_PATH)
-      .then((res) => {
-        if (!res.ok) throw new Error(`vote-log fetch failed: ${res.status}`);
-        return res.json();
-      })
-      .then((json: VoteLog) => {
+    fetchAdminData<VoteLog>('vote-log.json')
+      .then((json) => {
         if (!cancelled) {
           setData(json);
           setLoading(false);
```

Edit `src/tools/analytics/useVercelAnalytics.ts`:

```diff
--- a/src/tools/analytics/useVercelAnalytics.ts
+++ b/src/tools/analytics/useVercelAnalytics.ts
@@ -1,8 +1,7 @@
 import {useEffect, useState} from 'react';
+import {fetchAdminData} from './adminData';
 import type {VercelAnalytics} from './vercelAnalyticsTypes';
 
-const VERCEL_ANALYTICS_PATH = '/data/vercel-analytics.json';
-
 export interface UseVercelAnalyticsReturn {
   data: VercelAnalytics | null;
   loading: boolean;
@@ -17,12 +16,8 @@ export function useVercelAnalytics(): UseVercelAnalyticsReturn {
 
   useEffect(() => {
     let cancelled = false;
-    fetch(VERCEL_ANALYTICS_PATH)
-      .then((res) => {
-        if (!res.ok) throw new Error(`vercel-analytics fetch failed: ${res.status}`);
-        return res.json();
-      })
-      .then((json: VercelAnalytics) => {
+    fetchAdminData<VercelAnalytics>('vercel-analytics.json')
+      .then((json) => {
         if (!cancelled) {
           setData(json);
           setLoading(false);
```

Edit `src/tools/analytics/vercelAnalyticsTypes.ts`:

```diff
--- a/src/tools/analytics/vercelAnalyticsTypes.ts
+++ b/src/tools/analytics/vercelAnalyticsTypes.ts
@@ -1,4 +1,4 @@
-/** Shape of /data/vercel-analytics.json, produced by scripts/precompute-vercel-analytics.mjs. */
+/** Shape of /admin-data/vercel-analytics.json, produced by scripts/precompute-vercel-analytics.mjs. */
 
 export interface TrendPoint {
   /** YYYY-MM-DD (one day inside the reporting window). */
```

The hook test mocked a bare `{ok, json}` object, which has no headers. Edit `src/tools/analytics/__tests__/useVoteAnalytics.test.ts`:

```diff
--- a/src/tools/analytics/__tests__/useVoteAnalytics.test.ts
+++ b/src/tools/analytics/__tests__/useVoteAnalytics.test.ts
@@ -7,7 +7,10 @@ afterEach(() => vi.unstubAllGlobals());
 describe('useVoteAnalytics', () => {
   it('returns data on a successful fetch', async () => {
     const payload = {generatedAt: 'x', hasRawVotes: false, global: {totalVotes: 5}, rules: [], pairs: []};
-    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: true, json: () => Promise.resolve(payload)}));
+    vi.stubGlobal(
+      'fetch',
+      vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), {headers: {'content-type': 'application/json'}})),
+    );
     const {result} = renderHook(() => useVoteAnalytics());
     await waitFor(() => expect(result.current.loading).toBe(false));
     expect(result.current.data?.global.totalVotes).toBe(5);
@@ -15,7 +18,7 @@ describe('useVoteAnalytics', () => {
   });
 
   it('surfaces an error on a non-ok response', async () => {
-    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: false, status: 404}));
+    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', {status: 404})));
     const {result} = renderHook(() => useVoteAnalytics());
     await waitFor(() => expect(result.current.loading).toBe(false));
     expect(result.current.data).toBeNull();
```

Run: `pnpm exec vitest run src/tools/analytics`
Expected: 15 passed.

- [ ] **Step 5: Pin the buttons' behaviour before changing them**

Create `src/tools/analytics/__tests__/DayGroup.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {DayGroup} from '../DayGroup';
import type {VoteLogRow} from '../voteLogTypes';

const VOTE: VoteLogRow = {
  a: '1',
  b: '2',
  aName: 'Elsa',
  bName: 'Anna',
  score: 8,
  accuracy: null,
  isReal: null,
  wouldPlay: null,
  difficulty: null,
  whoCarries: null,
  ts: '2026-07-01T09:30:00Z',
  voter: 1,
};

describe('DayGroup', () => {
  it('opens a day to show its votes', async () => {
    render(<DayGroup group={{day: '2026-07-01', count: 1, voters: 1, votes: [VOTE]}} maxCount={1} />);
    const header = screen.getByRole('button', {name: /Wed - Jul 1/});
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await userEvent.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('cell', {name: 'Elsa × Anna'})).toBeInTheDocument();
  });
});
```

Create `src/tools/analytics/__tests__/PairList.test.tsx`:

```tsx
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {PairList} from '../PairList';
import type {PairStat} from '../voteAnalyticsTypes';

function pair(a: string, b: string): PairStat {
  return {a, b, aName: `Card ${a}`, bName: `Card ${b}`, engineScore: 7, communityScore: 4, gap: -3, scoreVotes: 1, rules: []};
}

const PAIRS = [pair('1', '2'), pair('3', '4')];

describe('PairList', () => {
  it('selects a pair and marks the selected one pressed', async () => {
    const onSelectPair = vi.fn();
    render(<PairList pairs={PAIRS} selectedPair={{a: '1', b: '2'}} onSelectPair={onSelectPair} />);

    await userEvent.click(screen.getByRole('button', {name: /Card 3/}));
    expect(onSelectPair).toHaveBeenCalledWith({a: '3', b: '4'});
    expect(screen.getByRole('button', {name: /Card 1/})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', {name: /Card 3/})).toHaveAttribute('aria-pressed', 'false');
  });
});
```

Create `src/tools/analytics/__tests__/RuleCalibrationTable.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {RuleCalibrationTable} from '../RuleCalibrationTable';
import type {RuleStat} from '../voteAnalyticsTypes';

function rule(ruleId: string, meanGap: number, scoreVotes: number): RuleStat {
  return {
    ruleId,
    ruleName: ruleId,
    category: 'direct',
    scoreVotes,
    pairsVoted: 1,
    meanGap,
    accuracySentiment: null,
    pairsCovered: 1,
  };
}

const RULES = [rule('small-gap', 0.5, 40), rule('big-gap', -2, 12)];

/** Rule names in row order. Rows carry aria-pressed; the sort headers don't. */
const rowOrder = () => screen.getAllByRole('button', {pressed: false}).map((row) => row.textContent);

describe('RuleCalibrationTable', () => {
  it('sorts by the size of the gap, then by votes from the Votes header', async () => {
    render(<RuleCalibrationTable rules={RULES} selectedRuleId={null} onSelectRule={() => {}} />);
    expect(rowOrder()[0]).toMatch(/^big-gap/);

    await userEvent.click(screen.getByRole('button', {name: 'Votes'}));
    expect(rowOrder()[0]).toMatch(/^small-gap/);
    expect(screen.getByRole('button', {name: 'Votes ▼'})).toBeInTheDocument();
  });
});
```

Create `src/tools/analytics/__tests__/WebAnalyticsView.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {WebAnalyticsView} from '../WebAnalyticsView';
import type {VercelAnalytics, VercelEvent} from '../vercelAnalyticsTypes';

function event(name: string, label: string, total: number): VercelEvent {
  return {name, label, total, visitors: 1, trend: [], breakdowns: []};
}

const ANALYTICS: VercelAnalytics = {
  generatedAt: '2026-09-29T00:00:00Z',
  hasVercelData: true,
  reportingWindow: null,
  events: [event('search', 'Searches', 5), event('vote_submitted', 'Votes submitted', 9)],
};

describe('WebAnalyticsView', () => {
  it('focuses the busiest event first, then the one you pick', async () => {
    render(<WebAnalyticsView analytics={ANALYTICS} />);
    expect(screen.getByRole('button', {name: /Votes submitted/})).toHaveAttribute('aria-current', 'true');

    await userEvent.click(screen.getByRole('button', {name: /Searches/}));
    expect(screen.getByRole('button', {name: /Searches/})).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', {name: /Votes submitted/})).toHaveAttribute('aria-current', 'false');
  });
});
```

Run: `pnpm exec vitest run src/tools/analytics`
Expected: 19 passed. The ported components already behave this way.

- [ ] **Step 6: See the design-token rules fail**

Run: `pnpm lint`
Expected: 5 errors:
- `inkweave/no-adhoc-buttons` in `DayGroup.tsx`, `PairList.tsx`, `RuleCalibrationTable.tsx` and `WebAnalyticsView.tsx`;
- `inkweave/no-raw-font-size` in `Scorecard.tsx`.

- [ ] **Step 7: Converge**

Edit `src/tools/analytics/DayGroup.tsx`:

```diff
--- a/src/tools/analytics/DayGroup.tsx
+++ b/src/tools/analytics/DayGroup.tsx
@@ -1,5 +1,5 @@
 import {useState} from 'react';
-import {COLORS, FONTS, FONT_SIZES, RADIUS, SPACING, TRUNCATE} from '../../app-bridge';
+import {COLORS, CtaButton, FONTS, FONT_SIZES, RADIUS, SPACING, TRUNCATE} from '../../app-bridge';
 import type {DayGroup as DayGroupData} from './activityStats';
 
 interface DayGroupProps {
@@ -39,22 +39,19 @@ export function DayGroup({group, maxCount, defaultOpen = false}: DayGroupProps)
 
   return (
     <div style={{marginBottom: SPACING.sm}}>
-      <button
+      {/* Kit button (#509) as a disclosure header: ghost while open, neutral while closed. */}
+      <CtaButton
         type="button"
+        variant={open ? 'ghost' : 'neutral'}
         aria-expanded={open}
         onClick={() => setOpen((v) => !v)}
         style={{
-          appearance: 'none',
           width: '100%',
-          display: 'flex',
-          alignItems: 'center',
+          justifyContent: 'flex-start',
           gap: SPACING.md,
-          background: open ? COLORS.surfaceHover : COLORS.surface,
-          border: `1px solid ${COLORS.surfaceBorder}`,
-          borderRadius: RADIUS.md,
+          minHeight: 0,
           padding: `${SPACING.sm}px ${SPACING.md}px`,
-          cursor: 'pointer',
-          fontFamily: FONTS.body,
+          borderRadius: RADIUS.md,
           textAlign: 'left',
         }}>
         <span
@@ -89,7 +86,7 @@ export function DayGroup({group, maxCount, defaultOpen = false}: DayGroupProps)
         <span style={{fontSize: FONT_SIZES.xs, color: COLORS.textDim, minWidth: 70, textAlign: 'right'}}>
           {group.voters} voter{group.voters === 1 ? '' : 's'}
         </span>
-      </button>
+      </CtaButton>
 
       {open && (
         <div style={{overflowX: 'auto', marginTop: SPACING.xs}}>
```

Replace `src/tools/analytics/PairList.tsx`:

```tsx
import {COLORS, CtaButton, FONTS, FONT_SIZES, RADIUS, SPACING, TRUNCATE} from '../../app-bridge';
import type {PairStat} from './voteAnalyticsTypes';

interface PairListProps {
  pairs: PairStat[];
  selectedPair: {a: string; b: string} | null;
  onSelectPair: (p: {a: string; b: string}) => void;
}

/**
 * A clickable list of voted pairs (already filtered + sorted by the parent).
 * Each row shows the two card names, the engine→community score jump, and the
 * vote count; the selected row is the kit's ghost button, the rest neutral (#509). A caption reminds the reader
 * that most pairs carry a single vote, so the rule-level trend is what to trust.
 */
export function PairList({pairs, selectedPair, onSelectPair}: PairListProps) {
  return (
    <div style={{fontFamily: FONTS.body}}>
      <div style={{display: 'flex', flexDirection: 'column', gap: SPACING.xs}}>
        {pairs.map((pair) => {
          const selected = selectedPair?.a === pair.a && selectedPair?.b === pair.b;
          return (
            <CtaButton
              key={`${pair.a}|${pair.b}`}
              type="button"
              variant={selected ? 'ghost' : 'neutral'}
              aria-pressed={selected}
              onClick={() => onSelectPair({a: pair.a, b: pair.b})}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: SPACING.md,
                width: '100%',
                minHeight: 0,
                padding: `${SPACING.sm}px ${SPACING.md}px`,
                borderRadius: RADIUS.md,
                textAlign: 'left',
              }}>
              <span style={{...TRUNCATE, fontSize: FONT_SIZES.base, color: COLORS.text}}>
                {pair.aName}
                <span style={{color: COLORS.textDim}}> × </span>
                {pair.bName}
              </span>
              <span style={{fontSize: FONT_SIZES.md, color: COLORS.error, fontVariantNumeric: 'tabular-nums'}}>
                {pair.engineScore} → {pair.communityScore}
              </span>
              <span style={{fontSize: FONT_SIZES.xs, color: COLORS.textDim, fontVariantNumeric: 'tabular-nums'}}>
                {pair.scoreVotes}
              </span>
            </CtaButton>
          );
        })}
      </div>
      <div style={{fontSize: FONT_SIZES.xs, color: COLORS.textDim, marginTop: SPACING.sm}}>
        Most pairs have a single vote — trust the rule-level trend over any one row.
      </div>
    </div>
  );
}
```

Edit `src/tools/analytics/RuleCalibrationTable.tsx`:

```diff
--- a/src/tools/analytics/RuleCalibrationTable.tsx
+++ b/src/tools/analytics/RuleCalibrationTable.tsx
@@ -1,5 +1,5 @@
 import {useState} from 'react';
-import {CAP_LABEL_XS, COLORS, FONTS, FONT_SIZES, LETTER_SPACING, RADIUS, SPACING} from '../../app-bridge';
+import {CAP_LABEL_XS, COLORS, FONTS, FONT_SIZES, LETTER_SPACING, LinkButton, RADIUS, SPACING} from '../../app-bridge';
 import type {RuleStat} from './voteAnalyticsTypes';
 
 interface RuleCalibrationTableProps {
@@ -58,7 +58,7 @@ const HEADER_CELL: React.CSSProperties = {
   padding: `${SPACING.sm}px ${SPACING.md}px`,
 };
 
-/** Header button for a sortable column; shows the active-sort caret. */
+/** Header button for a sortable column (the kit's LinkButton, #509); shows the active-sort caret. */
 function SortHeader({
   label,
   active,
@@ -72,22 +72,20 @@ function SortHeader({
 }) {
   return (
     <th style={{...HEADER_CELL, textAlign: align}}>
-      <button
+      <LinkButton
         type="button"
+        tone={active ? 'gold' : 'muted'}
         onClick={onClick}
         style={{
-          background: 'none',
-          border: 'none',
           padding: 0,
-          cursor: 'pointer',
-          font: 'inherit',
+          fontSize: FONT_SIZES.xs,
+          fontWeight: 700,
           textTransform: 'uppercase',
           letterSpacing: LETTER_SPACING.cap,
-          color: active ? COLORS.primary : COLORS.textMuted,
         }}>
         {label}
         {active ? ' ▼' : ''}
-      </button>
+      </LinkButton>
     </th>
   );
 }
```

Edit `src/tools/analytics/WebAnalyticsView.tsx`:

```diff
--- a/src/tools/analytics/WebAnalyticsView.tsx
+++ b/src/tools/analytics/WebAnalyticsView.tsx
@@ -204,16 +204,17 @@ export function WebAnalyticsView({analytics}: WebAnalyticsViewProps) {
         <div className="wa-rail" aria-label="Tracked events">
           <div className="wa-rail-h">Event</div>
           {events.map((e, i) => (
-            <button
-              key={e.name}
-              type="button"
-              aria-current={e.name === selected.name}
-              onClick={() => setSelectedName(e.name)}
-              className="wa-row wa-in"
-              style={{animationDelay: `${i * 24}ms`}}>
-              <span className="wa-row-label">{e.label}</span>
-              <span className="wa-row-total">{fmt(e.total)}</span>
-            </button>
+            // The staggered entrance runs on a wrapper, so the button carries no inline style (#509).
+            <div key={e.name} className="wa-in" style={{animationDelay: `${i * 24}ms`}}>
+              <button
+                type="button"
+                aria-current={e.name === selected.name}
+                onClick={() => setSelectedName(e.name)}
+                className="wa-row">
+                <span className="wa-row-label">{e.label}</span>
+                <span className="wa-row-total">{fmt(e.total)}</span>
+              </button>
+            </div>
           ))}
         </div>
 
```

Edit `src/tools/analytics/Scorecard.tsx`:

```diff
--- a/src/tools/analytics/Scorecard.tsx
+++ b/src/tools/analytics/Scorecard.tsx
@@ -26,7 +26,7 @@ export function Scorecard({value, label, hint, emphasis, rawTag}: ScorecardProps
         {rawTag && (
           <span
             style={{
-              fontSize: 9,
+              fontSize: FONT_SIZES.xs,
               color: COLORS.textDim,
               border: `1px solid ${COLORS.surfaceBorder}`,
               borderRadius: RADIUS.xs,
```

Run: `pnpm lint`, then `pnpm exec vitest run src/tools/analytics`
Expected: exit 0, then 19 passed.

- [ ] **Step 8: Rename the page, and add the route test first**

Edit `src/tools/analytics/AnalyticsPage.tsx`:

```diff
--- a/src/tools/analytics/AnalyticsPage.tsx
+++ b/src/tools/analytics/AnalyticsPage.tsx
@@ -14,7 +14,7 @@ const EMPTY_VOTE_LOG: VoteLog = {generatedAt: '', votes: [], voterCount: 0};
  * The vote-log may still be loading after analytics resolves; the views receive
  * an empty VoteLog fallback so they render regardless.
  */
-export function AdminAnalyticsPage() {
+export function AnalyticsPage() {
   const {data: analytics, loading, error} = useVoteAnalytics();
   const {data: voteLog} = useVoteLog();
   const {data: vercelAnalytics} = useVercelAnalytics();
```

In `src/router.test.tsx`, add at the end of the `describe`:

```tsx
  it('opens analytics at /analytics', () => {
    renderAt('/analytics');
    expect(screen.getByRole('heading', {level: 1, name: 'Engine Calibration'})).toBeInTheDocument();
  });
```

Run: `pnpm exec vitest run src/router.test.tsx`
Expected: FAIL. `/analytics` shows "Not found".

In `src/router.tsx`:

```tsx
import {AnalyticsPage} from './tools/analytics/AnalyticsPage';
```

```tsx
      {path: 'analytics', element: <AnalyticsPage />},
```

Run: `pnpm exec vitest run src/router.test.tsx`
Expected: 9 passed.

- [ ] **Step 9: Whole suite, Storybook, browser**

Run: `pnpm typecheck`, `pnpm lint`, `pnpm test:run`, then the Storybook check.
Expected:
- exit 0, exit 0, and 141 passed;
- Storybook adds the twelve `Features/AdminAnalytics/*` stories and `Pages/AdminAnalyticsPage`.

In the browser, `/analytics` shows "Engine Calibration" and this box: "Could not load vote analytics. Has the artifact been generated? (vote-analytics.json has not been generated yet)". The network panel shows requests to `/admin-data/`, and none to `/data/vote-*`.

- [ ] **Step 10: Commit**

```bash
git add src/tools/analytics src/router.tsx src/router.test.tsx
```

```bash
USER_APPROVED=1 git commit -m "feat(analytics): port the analytics dashboard, reading /admin-data/ (#2)"
```

---

### Task 10: Banner generator

**Files:**
- Create (codemod): `src/tools/banner/BannerPage.tsx`, `src/tools/banner/SynergyBanner.tsx`
- Create: `public/art/banner/*`, `scripts/export-banner.mjs`, `scripts/export-banner.test.mjs`, `docs/BANNER.md`
- Modify: `package.json`, `pnpm-lock.yaml`, `forwarded-paths.json`, `vercel.json`, `eslint.config.js`, `scripts/bridge-boundary.test.mjs`, `.gitignore`, `src/router.tsx`, `src/router.test.tsx`

- [ ] **Step 1: Dependencies and script**

In `package.json`, add to `devDependencies`, keeping alphabetical order:

```json
"playwright": "^1.63.0",
"sharp": "^0.35.4",
```

Add to `scripts`, after `storybook`:

```json
"banner": "node scripts/export-banner.mjs",
```

Run: `pnpm install`, then `pnpm check:deps`
Expected: `Dependency parity with the app: OK`

The app declares `sharp` in its root `package.json`, which the parity check doesn't read, so its version is matched by hand.

- [ ] **Step 2: Forward the banner's app assets, test first**

Edit `forwarded-paths.json`:

```diff
--- a/forwarded-paths.json
+++ b/forwarded-paths.json
@@ -1,4 +1,4 @@
 {
   "origin": "https://inkweave.ink",
-  "paths": ["/data/", "/card-images/", "/card-images-preview/", "/fonts/"]
+  "paths": ["/data/", "/card-images/", "/card-images-preview/", "/fonts/", "/art/sets/", "/brand/"]
 }
```

Run: `pnpm exec vitest run scripts/forwarded-paths.test.mjs`
Expected: FAIL. `vercel.json` has no rewrite for `/art/sets/` or `/brand/`.

Edit `vercel.json`:

```diff
--- a/vercel.json
+++ b/vercel.json
@@ -9,6 +9,8 @@
     {"source": "/card-images/:path*", "destination": "https://inkweave.ink/card-images/:path*"},
     {"source": "/card-images-preview/:path*", "destination": "https://inkweave.ink/card-images-preview/:path*"},
     {"source": "/fonts/:path*", "destination": "https://inkweave.ink/fonts/:path*"},
+    {"source": "/art/sets/:path*", "destination": "https://inkweave.ink/art/sets/:path*"},
+    {"source": "/brand/:path*", "destination": "https://inkweave.ink/brand/:path*"},
     {"source": "/(.*)", "destination": "/index.html"}
   ],
   "headers": [
```

Run: `pnpm exec vitest run scripts/forwarded-paths.test.mjs`
Expected: 2 passed.

- [ ] **Step 3: Port the files and the art**

Run: `node "$CODEMOD" banner`
Expected: `banner: 2 files written under .`

```bash
mkdir -p public/art && cp -r upstream/inkweave/apps/web/public/art/banner public/art/banner
```

Run: `pnpm lint`
Expected: 28 errors: 27 in `SynergyBanner.tsx`, 1 in `BannerPage.tsx`.

- [ ] **Step 4: Converge what has a token**

Edit `src/tools/banner/SynergyBanner.tsx`:

```diff
--- a/src/tools/banner/SynergyBanner.tsx
+++ b/src/tools/banner/SynergyBanner.tsx
@@ -1,5 +1,5 @@
 import type {LorcanaCard, SynergyGroup} from 'inkweave-synergy-engine';
-import {COLORS, FONTS, RADIUS} from '../../app-bridge';
+import {COLORS, FONTS, FONT_SIZES, RADIUS, blackRgba, hexRgba, whiteRgba} from '../../app-bridge';
 
 /**
  * Marketing banner (1200x1240 per page): bigger Set 13 logo up top, big hero + an "Explore
@@ -32,8 +32,7 @@ const SET_LOGO = '/art/sets/attack-of-the-vine.png';
 const INKWEAVE_LOGO = '/brand/logo.svg';
 const CARD_BACK = '/art/banner/card-back.png';
 const QR_IMAGE = '/art/banner/qr.png';
-const ABILITY_BOX_SHADOW =
-  '0 3px 10px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.22), inset 0 -1px 0 rgba(0, 0, 0, 0.18)';
+const ABILITY_BOX_SHADOW = `0 3px 10px ${blackRgba(0.5)}, inset 0 1px 0 ${whiteRgba(0.22)}, inset 0 -1px 0 ${blackRgba(0.18)}`;
 
 /** Banner-only hero art overrides (transparent "pop-out" renders), keyed by card id. */
 const HERO_OVERRIDES: Record<string, string> = {
@@ -131,16 +130,16 @@ export function SynergyBanner({card, groups, fullImage}: SynergyBannerProps) {
         position: 'relative', width: STAGE_W, height: STAGE_H, overflow: 'hidden',
         background: `radial-gradient(ellipse at top left, rgba(43,127,255,0.16), transparent 52%),
           radial-gradient(ellipse at bottom left, rgba(173,70,255,0.20), transparent 50%),
-          radial-gradient(circle at 26% 46%, rgba(212,175,55,0.06), transparent 44%),
+          radial-gradient(circle at 26% 46%, ${hexRgba(COLORS.primary500, 0.06)}, transparent 44%),
           ${COLORS.background}`,
       }}>
-      <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 240px rgba(0,0,0,0.55)'}} />
+      <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: `inset 0 0 240px ${blackRgba(0.55)}`}} />
       <Orb color="rgba(43,127,255,0.22)" size={540} pos={{left: -190, top: -170}} />
       <Orb color="rgba(173,70,255,0.20)" size={560} pos={{left: -120, bottom: -210}} />
 
-      <img src={SET_LOGO} alt="Attack of the Vine!" style={{position: 'absolute', top: 36, left: '50%', transform: 'translateX(-50%)', height: 132, filter: 'drop-shadow(0 5px 16px rgba(0,0,0,0.55))'}} />
+      <img src={SET_LOGO} alt="Attack of the Vine!" style={{position: 'absolute', top: 36, left: '50%', transform: 'translateX(-50%)', height: 132, filter: `drop-shadow(0 5px 16px ${blackRgba(0.55)})`}} />
       {/* Landing-page CtaButton (filled variant) colors — orange gradient + dark text — in a pill shape. */}
-      <div style={{position: 'absolute', top: 60, right: 46, display: 'inline-flex', alignItems: 'center', gap: 8, background: COLORS.filterGradient, color: COLORS.filterText, fontFamily: FONTS.body, fontSize: 18, fontWeight: 700, letterSpacing: '0.01em', padding: '13px 34px', borderRadius: 999, boxShadow: `${COLORS.filterShadow}, 0 0 32px rgba(255,185,0,0.55), 0 0 66px rgba(255,185,0,0.3)`}}>
+      <div style={{position: 'absolute', top: 60, right: 46, display: 'inline-flex', alignItems: 'center', gap: 8, background: COLORS.filterGradient, color: COLORS.filterText, fontFamily: FONTS.body, fontSize: 18, fontWeight: 700, letterSpacing: '0.01em', padding: '13px 34px', borderRadius: RADIUS.pill, boxShadow: `${COLORS.filterShadow}, 0 0 32px ${hexRgba(COLORS.primary, 0.55)}, 0 0 66px ${hexRgba(COLORS.primary, 0.3)}`}}>
         Synergy Spotlight
       </div>
 
@@ -154,18 +153,18 @@ export function SynergyBanner({card, groups, fullImage}: SynergyBannerProps) {
             transform: 'rotateY(20deg) rotateX(6deg) rotateZ(-1deg)',
             borderRadius: isPopOut ? 0 : 16,
             filter: isPopOut
-              ? 'drop-shadow(-16px 26px 36px rgba(0,0,0,0.6)) drop-shadow(0 0 26px rgba(212,175,55,0.18))'
-              : 'drop-shadow(-22px 32px 48px rgba(0,0,0,0.6)) drop-shadow(0 0 28px rgba(212,175,55,0.16))',
+              ? `drop-shadow(-16px 26px 36px ${blackRgba(0.6)}) drop-shadow(0 0 26px ${hexRgba(COLORS.primary500, 0.18)})`
+              : `drop-shadow(-22px 32px 48px ${blackRgba(0.6)}) drop-shadow(0 0 28px ${hexRgba(COLORS.primary500, 0.16)})`,
           }}
         />
         <div style={{width: '100%', textAlign: 'center', marginTop: 96}}>
-          <div style={{height: 1, background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.55), transparent)', marginBottom: 20}} />
-          <div style={{fontSize: 14, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#ffffff', marginBottom: 16}}>
+          <div style={{height: 1, background: `linear-gradient(90deg, transparent, ${hexRgba(COLORS.primary500, 0.55)}, transparent)`, marginBottom: 20}} />
+          <div style={{fontSize: FONT_SIZES.lg, letterSpacing: '0.2em', textTransform: 'uppercase', color: COLORS.heroTitle, marginBottom: 16}}>
             Explore every Set 13 synergy at
           </div>
-          <img src={INKWEAVE_LOGO} alt="Inkweave" style={{height: 58, filter: 'drop-shadow(0 0 20px rgba(212,175,55,0.42))'}} />
+          <img src={INKWEAVE_LOGO} alt="Inkweave" style={{height: 58, filter: `drop-shadow(0 0 20px ${hexRgba(COLORS.primary500, 0.42)})`}} />
           <div style={{marginTop: 42, display: 'flex', justifyContent: 'center'}}>
-            <img src={QR_IMAGE} alt="Scan for Inkweave" style={{width: 184, height: 184, display: 'block', borderRadius: 14}} />
+            <img src={QR_IMAGE} alt="Scan for Inkweave" style={{width: 184, height: 184, display: 'block', borderRadius: RADIUS.xl}} />
           </div>
         </div>
       </div>
@@ -196,7 +195,7 @@ function BannerRow({group, cardId, fullImage}: {group: SynergyGroup; cardId: str
             key={id}
             src={fullImage(id)}
             alt=""
-            style={{width: CARD_W, height: CARD_H, objectFit: 'cover', objectPosition: 'top', borderRadius: 9, flexShrink: 0, boxShadow: '0 8px 22px rgba(0,0,0,0.55), 0 0 12px rgba(212,175,55,0.1), 0 0 0 1px rgba(0,0,0,0.35)'}}
+            style={{width: CARD_W, height: CARD_H, objectFit: 'cover', objectPosition: 'top', borderRadius: 9, flexShrink: 0, boxShadow: `0 8px 22px ${blackRgba(0.55)}, 0 0 12px ${hexRgba(COLORS.primary500, 0.1)}, 0 0 0 1px ${blackRgba(0.35)}`}}
           />
         ))}
         {remaining > 0 && <MoreTile count={remaining} />}
@@ -209,7 +208,7 @@ function BannerRow({group, cardId, fullImage}: {group: SynergyGroup; cardId: str
 function SynergyHeader({label, blurb, highlight}: {label: string; blurb: string; highlight?: string[]}) {
   return (
     <div style={{display: 'flex', alignItems: 'stretch', marginBottom: 10, background: COLORS.lorcanaCream, borderRadius: `${RADIUS.sm}px`, overflow: 'hidden', boxShadow: ABILITY_BOX_SHADOW}}>
-      <div style={{background: COLORS.lorcanaTagBg, color: COLORS.lorcanaTagText, display: 'flex', alignItems: 'center', padding: '0 15px', flexShrink: 0, fontFamily: FONTS.body, fontWeight: 700, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap'}}>
+      <div style={{background: COLORS.lorcanaTagBg, color: COLORS.lorcanaTagText, display: 'flex', alignItems: 'center', padding: '0 15px', flexShrink: 0, fontFamily: FONTS.body, fontWeight: 700, fontSize: `${FONT_SIZES.md}px`, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap'}}>
         {label}
       </div>
       <div style={{color: COLORS.lorcanaTextDark, padding: '9px 15px', flex: 1, fontFamily: FONTS.body, fontWeight: 600, fontSize: '15px', lineHeight: 1.35}}>
@@ -244,11 +243,11 @@ function MoreTile({count}: {count: number}) {
       style={{
         width: CARD_W, height: CARD_H, flexShrink: 0, borderRadius: 9, position: 'relative', overflow: 'hidden',
         backgroundImage: `url('${CARD_BACK}')`, backgroundSize: 'cover', backgroundPosition: 'center',
-        border: '1px solid rgba(212,175,55,0.35)', boxShadow: '0 8px 22px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.35)',
+        border: `1px solid ${hexRgba(COLORS.primary500, 0.35)}`, boxShadow: `0 8px 22px ${blackRgba(0.55)}, 0 0 0 1px ${blackRgba(0.35)}`,
         display: 'flex', alignItems: 'center', justifyContent: 'center',
       }}>
       <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 42%, rgba(8,8,13,0.82) 0%, rgba(8,8,13,0.95) 92%)'}} />
-      <span style={{position: 'relative', fontFamily: 'Tinos, Georgia, serif', fontSize: 68, fontWeight: 700, color: COLORS.primary, textShadow: '0 2px 12px rgba(0,0,0,0.9)'}}>
+      <span style={{position: 'relative', fontFamily: FONTS.hero, fontSize: 68, fontWeight: 700, color: COLORS.primary, textShadow: `0 2px 12px ${blackRgba(0.9)}`}}>
         +{count}
       </span>
     </div>
```

Edit `src/tools/banner/BannerPage.tsx`:

```diff
--- a/src/tools/banner/BannerPage.tsx
+++ b/src/tools/banner/BannerPage.tsx
@@ -10,7 +10,7 @@ const ROWS_PER_PAGE = 3;
  * Dev/generator route: /banner/:cardId?page=N renders one page of a card's synergy-breakdown
  * banner from the live app components + precomputed synergy JSON. A card with >3 synergies
  * splits into pages of 3 (hero locked on each) so a Reddit post can be a 2-image carousel.
- * scripts/export-synergy-banner.mjs screenshots the .banner-stage element per page.
+ * scripts/export-banner.mjs screenshots the .banner-stage element per page.
  *
  * Banner needs full-res art (card.imageUrl is only a ~367px thumbnail), so we load a one-off
  * id -> images.full map from allCards.json and gate rendering until it is ready.
@@ -31,7 +31,7 @@ export function BannerPage() {
   const pageGroups = sorted.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);
 
   return (
-    <div style={{minHeight: '100vh', background: '#06060a', display: 'grid', placeItems: 'center', padding: 32}}>
+    <div style={{minHeight: '100vh', background: COLORS.background, display: 'grid', placeItems: 'center', padding: 32}}>
       {ready ? (
         <SynergyBanner card={card} groups={pageGroups} fullImage={fullImage} />
       ) : (
```

Run: `pnpm lint`
Expected: 9 errors, all in `SynergyBanner.tsx`, all of them `no-raw-rgba` (4), `no-raw-font-size` (3) or `no-raw-radius` (2).

- [ ] **Step 5: The exception, test first**

Edit `scripts/bridge-boundary.test.mjs`. The warm-up moves to module level so that both `describe` blocks share one warmed ESLint.

```diff
--- a/scripts/bridge-boundary.test.mjs
+++ b/scripts/bridge-boundary.test.mjs
@@ -33,15 +33,15 @@ async function expectAllowed(filePath, code, ruleId) {
   expect(messages.map((message) => message.ruleId)).not.toContain(ruleId);
 }
 
-describe('the app-bridge boundary', () => {
-  // The first lint loads typescript-eslint and the React Compiler plugin (Babel):
-  // 23s here, 45s cold on Windows, 75s under load. The warm-up pays for it once,
-  // with its own budget; the cases then take milliseconds.
-  beforeAll(async () => {
-    eslint = new ESLint();
-    await lint('src/shell/Warmup.ts', 'export const warm = 1;\n');
-  }, 180_000);
+// The first lint loads typescript-eslint and the React Compiler plugin (Babel):
+// 23s here, 45s cold on Windows, 75s under load. The warm-up pays for it once,
+// with its own budget; the cases then take milliseconds.
+beforeAll(async () => {
+  eslint = new ESLint();
+  await lint('src/shell/Warmup.ts', 'export const warm = 1;\n');
+}, 180_000);
 
+describe('the app-bridge boundary', () => {
   it('rejects an upstream import outside the bridge', async () => {
     expect(await ruleIds('src/shell/Leak.ts')).toContain('no-restricted-imports');
   });
@@ -86,3 +86,23 @@ describe('the app-bridge boundary', () => {
     expect(await ruleIds('src/shell/Memo.ts', MEMO)).toContain('no-restricted-syntax');
   });
 });
+
+// The literals SynergyBanner keeps (eslint.config.js): an off-token color, a 15px
+// size and a 9px radius. RAW_HEX is a rule the exception does not cover.
+const BANNER_ART = "export const art = {color: 'rgba(43, 127, 255, 0.22)', fontSize: 15, borderRadius: 9};\n";
+const RAW_HEX = "export const ink = '#123456';\n";
+const BANNER_RULES = ['inkweave/no-raw-rgba', 'inkweave/no-raw-font-size', 'inkweave/no-raw-radius'];
+
+describe('the design-token exception', () => {
+  it.each(BANNER_RULES)('lets SynergyBanner.tsx through %s', async (rule) => {
+    await expectAllowed('src/tools/banner/SynergyBanner.tsx', BANNER_ART, rule);
+  });
+
+  it.each(BANNER_RULES)('holds every other file to %s', async (rule) => {
+    expect(await ruleIds('src/tools/banner/BannerPage.tsx', BANNER_ART)).toContain(rule);
+  });
+
+  it('holds SynergyBanner.tsx to the rest of the design-token rules', async () => {
+    expect(await ruleIds('src/tools/banner/SynergyBanner.tsx', RAW_HEX)).toContain('inkweave/no-raw-hex-colors');
+  });
+});
```

Run: `pnpm exec vitest run scripts/bridge-boundary.test.mjs`
Expected: 3 failed and 15 passed. The three failures are the "lets SynergyBanner.tsx through" cases.

Edit `eslint.config.js`:

```diff
--- a/eslint.config.js
+++ b/eslint.config.js
@@ -6,8 +6,8 @@ import reactCompiler from 'eslint-plugin-react-compiler';
 import jsxA11y from 'eslint-plugin-jsx-a11y';
 import tseslint from 'typescript-eslint';
 // The app's design-token rules, loaded from the pinned submodule so admin UI is
-// held to the same design system. Nothing is grandfathered here: the plugin's
-// ledger lists app paths only, so every admin file gets the full rules.
+// held to the same design system. The plugin's ledger lists app paths only, so
+// admin files get the full rules; admin's one exception is SynergyBanner, below.
 import {inkweave} from './upstream/inkweave/apps/web/eslint-rules/index.js';
 
 // Same ban as the app (#291): the React Compiler memoizes automatically.
@@ -64,6 +64,20 @@ export default tseslint.config(
       'inkweave/no-unshelled-dialogs': 'error',
     },
   },
+  // Admin's only design-token exception, and like the app's ledger it only
+  // shrinks. SynergyBanner renders a fixed-pixel marketing image, and its last
+  // literals have no token: the ethereal blue and purple at their own alphas,
+  // the +N tile's near-black scrim, 15/18/68px type and the 9px card radius.
+  // Converging them would change the published banner (the app's theme.ts
+  // already rules the 68 exempt). Drop a rule here once the file passes it.
+  {
+    files: ['src/tools/banner/SynergyBanner.tsx'],
+    rules: {
+      'inkweave/no-raw-rgba': 'off',
+      'inkweave/no-raw-font-size': 'off',
+      'inkweave/no-raw-radius': 'off',
+    },
+  },
   // D3: app code enters admin only through src/app-bridge.ts, from any source
   // file. The one tooling exception is this config, which loads the app's
   // design-token plugin from the submodule.
```

Run: `pnpm exec vitest run scripts/bridge-boundary.test.mjs`, then `pnpm lint`
Expected: 18 passed, then exit 0.

- [ ] **Step 6: Route, test first**

In `src/router.test.tsx`, add at the end of the `describe`:

```tsx
  it('opens a card banner at /banner/:cardId', () => {
    renderAt('/banner/2983');
    expect(screen.getByText('Loading banner…')).toBeInTheDocument();
  });
```

Run: `pnpm exec vitest run src/router.test.tsx`
Expected: FAIL. `/banner/2983` shows "Not found".

In `src/router.tsx`:

```tsx
import {BannerPage} from './tools/banner/BannerPage';
```

```tsx
      {path: 'banner/:cardId', element: <BannerPage />},
```

Run: `pnpm exec vitest run src/router.test.tsx`
Expected: 10 passed. The finished `src/router.tsx`:

```tsx
import {createBrowserRouter, type RouteObject} from 'react-router-dom';
import {AdminShell} from './shell/AdminShell';
import {NotFound} from './shell/NotFound';
import {ToolIndex} from './shell/ToolIndex';
import {AnalyticsPage} from './tools/analytics/AnalyticsPage';
import {BannerPage} from './tools/banner/BannerPage';
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
      {path: 'banner/:cardId', element: <BannerPage />},
      {path: '*', element: <NotFound />},
    ],
  },
];

export const router = createBrowserRouter(routes);
```

- [ ] **Step 7: The exporter, test first**

Create `scripts/export-banner.test.mjs`:

```js
// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {pageCountForGroups, slugFor} from './export-banner.mjs';

describe('pageCountForGroups', () => {
  it.each([
    [0, 1],
    [3, 1],
    [4, 2],
    [6, 2],
    [9, 2],
  ])('renders %i synergy groups on %i page(s), as BannerPage slices them', (groups, pages) => {
    expect(pageCountForGroups(groups)).toBe(pages);
  });
});

describe('slugFor', () => {
  it("turns a card's full name into a file name", () => {
    expect(slugFor('Pocahontas - Guiding the Tribe')).toBe('pocahontas-guiding-the-tribe');
  });

  it('drops leading and trailing separators', () => {
    expect(slugFor("  Will o' the Wisp!")).toBe('will-o-the-wisp');
  });
});
```

Run: `pnpm exec vitest run scripts/export-banner.test.mjs`
Expected: FAIL. `./export-banner.mjs` does not exist.

Create `scripts/export-banner.mjs`:

```js
#!/usr/bin/env node
// Synergy Spotlight banner exporter (docs/BANNER.md). Given a card id, renders
// every carousel page of its synergy breakdown through admin's /banner/:cardId
// route and writes shareable images to reports/banners/<id>/:
//   - <slug>-page-N.png         full-res 3600x3720 lossless  (Reddit)
//   - <slug>-page-N-fb2048.jpg  2048px wide, 4:4:4 JPEG      (Facebook)
//
// Reuses an admin dev server already on :5180, otherwise starts a throwaway one
// and stops it afterwards. Card data and synergies come through that server's
// /data/ forward, so the images match what inkweave.ink serves.
// Usage: pnpm banner <cardId>        e.g. pnpm banner 2983
import {execFileSync, spawn} from 'node:child_process';
import {mkdirSync, statSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Mirror BannerPage.tsx: at most MAX_GROUPS synergies shown, ROWS_PER_PAGE rows per page.
const MAX_GROUPS = 6;
const ROWS_PER_PAGE = 3;
const PORT = 5180;
const ORIGIN = `http://localhost:${PORT}`;
const DSF = 3; // deviceScaleFactor -> 1200x1240 stage renders at 3600x3720
const FB_WIDTH = 2048;

/**
 * How many carousel pages to render for a card with `groupCount` synergy groups.
 * Must match BannerPage's slicing (MAX_GROUPS shown, ROWS_PER_PAGE per page) so the
 * export renders exactly the pages the route produces, never a blank or repeated one.
 */
export function pageCountForGroups(groupCount) {
  const shown = Math.min(groupCount, MAX_GROUPS);
  return Math.max(1, Math.ceil(shown / ROWS_PER_PAGE));
}

/** File-name slug from a card's full name. */
export function slugFor(fullName) {
  return fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** JSON from the dev server, or null when the file is missing (the SPA fallback answers with HTML). */
async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok || !(res.headers.get('content-type') ?? '').includes('application/json')) return null;
  return res.json();
}

async function serverUp() {
  try {
    return (await fetch(`${ORIGIN}/`)).ok;
  } catch {
    return false;
  }
}

let server = null;

/** True when this run started the server (and so must stop it). */
async function ensureServer() {
  if (await serverUp()) return false;
  console.log(`Starting a throwaway admin dev server on :${PORT} …`);
  server = spawn('pnpm', ['exec', 'vite'], {cwd: ROOT, shell: true, stdio: 'ignore'});
  for (let i = 0; i < 60; i++) {
    if (await serverUp()) return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`The dev server did not come up on :${PORT} within 60s. Has pnpm build:engine run?`);
}

function stopServer() {
  if (!server) return;
  try {
    if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], {stdio: 'ignore'});
    else server.kill('SIGTERM');
  } catch {
    /* best effort */
  }
}

/* global document, getComputedStyle -- the page.evaluate callback below runs in the browser */

/** Screenshot each page's .banner-stage; returns the files written. */
async function capturePages({cardId, pages, slug, outDir}) {
  const {chromium} = await import('playwright');
  const {default: sharp} = await import('sharp');
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 1320, height: 1320}, deviceScaleFactor: DSF});
  const written = [];
  try {
    for (let p = 1; p <= pages; p++) {
      await page.goto(`${ORIGIN}/banner/${cardId}?page=${p}`, {waitUntil: 'domcontentloaded', timeout: 45000});
      await page.waitForSelector('.banner-stage', {timeout: 45000});
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          [...document.images].map((img) => (img.complete ? null : new Promise((res) => (img.onload = img.onerror = res)))),
        );
        for (const el of document.querySelectorAll('body *')) {
          const s = getComputedStyle(el);
          if (s.position === 'fixed' && !el.closest('.banner-stage')) el.style.setProperty('display', 'none', 'important');
        }
      });
      await page.waitForTimeout(500);
      const png = await page.locator('.banner-stage').screenshot({type: 'png'});
      const pngPath = path.join(outDir, `${slug}-page-${p}.png`);
      writeFileSync(pngPath, png);
      const fbPath = path.join(outDir, `${slug}-page-${p}-fb2048.jpg`);
      await sharp(png).resize({width: FB_WIDTH}).jpeg({quality: 90, chromaSubsampling: '4:4:4'}).toFile(fbPath);
      written.push(pngPath, fbPath);
      console.log(`page ${p}/${pages} done`);
    }
  } finally {
    await browser.close();
  }
  return written;
}

async function run(cardId) {
  const ownServer = await ensureServer();
  try {
    const synergies = await getJson(`${ORIGIN}/data/synergies/${cardId}.json`);
    if (!synergies) throw new Error(`inkweave.ink has no precomputed synergies for card ${cardId}. Check the card id.`);
    const pages = pageCountForGroups(synergies.groups.length);

    const allCards = await getJson(`${ORIGIN}/data/allCards.json`);
    const cards = Array.isArray(allCards) ? allCards : (allCards?.cards ?? []);
    const fullName = cards.find((c) => String(c.id) === String(cardId))?.fullName ?? `card-${cardId}`;

    const outDir = path.join(ROOT, 'reports/banners', String(cardId));
    mkdirSync(outDir, {recursive: true});
    const written = await capturePages({cardId, pages, slug: slugFor(fullName), outDir});

    console.log(`\n${fullName}: ${pages} page(s), ${synergies.groups.length} synergy groups`);
    for (const f of written) console.log(`  ${Math.round(statSync(f).size / 1024)} KB\t${f}`);
    console.log('\nReddit: the .png files   |   Facebook: the -fb2048.jpg files');
  } finally {
    if (ownServer) stopServer();
  }
}

function main() {
  const cardId = process.argv[2];
  if (!cardId) {
    console.error('Usage: pnpm banner <cardId>   (e.g. pnpm banner 2983)');
    process.exit(1);
  }
  run(cardId).catch((e) => {
    stopServer();
    console.error(e.message);
    process.exit(1);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
```

Run: `pnpm exec vitest run scripts/export-banner.test.mjs`
Expected: 7 passed.

- [ ] **Step 8: Runbook and ignore file**

Create `docs/BANNER.md`:

````markdown
# Synergy Spotlight banner exporter

Generates the shareable "Synergy Spotlight" images for one card, the ones posted to Reddit and Facebook. It screenshots admin's `/banner/:cardId` route, which draws with the app's card data and precomputed synergies (forwarded from `inkweave.ink`), so the images match what production serves.

```bash
pnpm banner <cardId>        # e.g. pnpm banner 2983
```

Once per machine: `pnpm build:engine` (the dev server needs the engine) and `pnpm exec playwright install chromium`.

## What you get

Files land in `reports/banners/<cardId>/` (git-ignored), two per carousel page:

| File | Size | Use |
|------|------|-----|
| `<slug>-page-N.png` | 3600×3720, lossless | **Reddit** |
| `<slug>-page-N-fb2048.jpg` | 2048px wide, 4:4:4 JPEG | **Facebook** |

Facebook caps photos at 2048px on the longest side and re-compresses on upload, so the `-fb2048` variant is pre-sized to that width, with `4:4:4` chroma so colored text and gradients stay crisp. Reddit keeps the full-res PNG.

## How it works

`scripts/export-banner.mjs` is a thin camera pointed at the real UI:

1. Uses an admin dev server on `:5180`, or starts a throwaway one and stops it afterwards.
2. Reads `/data/synergies/<id>.json` through that server, counts the synergy groups, and derives the page count (`pageCountForGroups`) with the same `MAX_GROUPS = 6` / `ROWS_PER_PAGE = 3` rules as `BannerPage.tsx`. It stops if `inkweave.ink` has no precomputed synergies for the card.
3. Drives headless Chromium (Playwright) at `deviceScaleFactor: 3` through `/banner/<id>?page=<n>`, waits for the `.banner-stage` element plus fonts and images, and screenshots just that element: the PNG.
4. Derives the Facebook JPEG from that PNG with sharp.

The rendering is two files in `src/tools/banner/`:

- `BannerPage.tsx` loads the card and its precomputed synergies, and slices the groups into pages.
- `SynergyBanner.tsx` is the 1200×1240 stage: hero plus CTA and QR on the left, one synergy per row on the right, badge and set logo.

## Making a new card look as polished as Pocahontas

The layout works for any card. The bespoke touches are opt-in, through four maps in `SynergyBanner.tsx`, each keyed by card id:

| Map | Controls | Fallback when absent |
|-----|----------|----------------------|
| `HERO_OVERRIDES` | transparent "pop-out" hero art | the card's normal full-res art |
| `CARD_BLURBS` | the per-synergy sentence copy | generic `BANNER_BLURBS` line |
| `CARD_PICKS` | the exact 3 partner cards per row (by id) | top 3 by synergy score |
| `CARD_BLURB_HIGHLIGHTS` | which phrases are bolded in a blurb | nothing bolded |

For the next spotlight card:

1. `pnpm banner <newId>` to see the generic version.
2. Add the card's entries to the four maps. Pick partner card ids from `https://inkweave.ink/data/synergies/<newId>.json`, so they really are in the group and the "+N more" counts stay honest.
3. Run `pnpm banner <newId>` again.

The card back, the QR code and per-card pop-out art live in `public/art/banner/`. The set logo and the Inkweave logo come from the app through the `/art/sets/` and `/brand/` forwards (`forwarded-paths.json`).

## Notes

- `MAX_GROUPS` and `ROWS_PER_PAGE` are duplicated between the script and `BannerPage.tsx`, because a `.mjs` script can't import the `.tsx` constants. If you retune the page size in the route, update both.
- Synergies come from production, so a rule change shows up in banners once the app has deployed it.
- `SynergyBanner.tsx` is admin's one exception to the design-token lint: `no-raw-rgba`, `no-raw-font-size` and `no-raw-radius` are off for it in `eslint.config.js`, because its remaining literals have no token. When you touch the file, converge what you can and drop the rules it passes.
````

Edit `.gitignore`:

```diff
--- a/.gitignore
+++ b/.gitignore
@@ -5,3 +5,5 @@ coverage/
 .env
 .env.local
 *.log
+# pnpm banner output (docs/BANNER.md)
+reports/
```

- [ ] **Step 9: Whole suite**

Run: `pnpm typecheck`, `pnpm lint`, `pnpm test:run`
Expected: exit 0, exit 0, and 156 passed.

- [ ] **Step 10: Export a banner [confirm]**

This step downloads Playwright's Chromium build, a few hundred MB, from Playwright's CDN. Ask the owner first.

Run: `pnpm exec playwright install chromium`, then `pnpm banner 2983`
Expected: two files per carousel page in `reports/banners/2983/`, a `.png` and a `-fb2048.jpg`, and a size listing. The owner compares them with the last banner exported from the app.

In the browser, `/banner/2983` renders the stage.

- [ ] **Step 11: Commit**

```bash
git add package.json pnpm-lock.yaml forwarded-paths.json vercel.json eslint.config.js .gitignore scripts/bridge-boundary.test.mjs scripts/export-banner.mjs scripts/export-banner.test.mjs docs/BANNER.md public/art/banner src/tools/banner src/router.tsx src/router.test.tsx
```

```bash
USER_APPROVED=1 git commit -m "feat(banner): port the Synergy Spotlight banner generator (#2)"
```

---

### Task 11: Whole-branch check

No commit unless a check finds something to fix.

- [ ] **Step 1: Every gate**

```bash
pnpm check:deps && pnpm typecheck && pnpm lint && pnpm test:run && pnpm build
```

Expected: every command exits 0, and 156 tests pass.

- [ ] **Step 2: The test fixture stays out of the bundle**

```bash
NAME=$(node -p "require('./upstream/inkweave/apps/web/public/data/previewCards.json').cards[0].fullName")
grep -lF "$NAME" dist/assets/*.js || echo "pinned previewCards.json is not bundled"
```

Expected: `pinned previewCards.json is not bundled`

- [ ] **Step 3: Storybook**

Run the Storybook check.
Expected: 26 titles:
- `Admin/*` (3)
- `Reveal Admin/*` (3)
- `ImageAdmin/*` (3)
- `TuningAdmin/*` (4)
- `Features/AdminAnalytics/*` (12)
- `Pages/AdminAnalyticsPage`

- [ ] **Step 4: Browser pass**

With `pnpm dev`, open every route and screenshot it: `/`, `/reveal`, `/image`, `/tuning`, `/analytics`, `/banner/2983`, `/nope`.
Expected:
- The header shows `master` on every route.
- There are no console errors.
- `/analytics` shows its "not generated yet" box.

- [ ] **Step 5: Code health**

Run the CodeScene MCP over the branch: `analyze_change_set` against `main`, or `code_health_review` on each changed file.
- Fix what it flags in new code: the shell, the router, `adminData.ts`, `useLiveTuning.ts`, the exporter and the tests.
- For ported code, fix a finding only if the quality gate would fail on it, and record the fix in "P2 as built".

---

### Task 12: Rehearse writes on a throwaway branch [confirm]

This writes to the app repo. Before Step 1, confirm with the owner that it:
- creates `admin-verify` in `Doberjohn/inkweave`;
- commits three times to it, which starts three Vercel preview builds of the app;
- deletes the branch afterwards.

No commit in this task.

- [ ] **Step 1: Record master and create the branch**

```bash
MASTER_BEFORE=$(gh api repos/Doberjohn/inkweave/git/ref/heads/master --jq .object.sha); echo "$MASTER_BEFORE"
gh api repos/Doberjohn/inkweave/git/refs -f ref=refs/heads/admin-verify -f sha="$MASTER_BEFORE"
```

- [ ] **Step 2: Point the tools at it**

Put `VITE_ADMIN_TARGET_BRANCH=admin-verify` in `.env.local` (git-ignored), then restart `pnpm dev`.
Expected: the header names `admin-verify`, and the publish buttons say "Publish to admin-verify".

- [ ] **Step 3: The owner publishes once with each tool**

The owner enters the GitHub token at the gate on `localhost:5180`, then:
1. **Reveal:** a clearly fake card, for example "Admin Verify", with any small PNG.
2. **Image:** any card, with any image.
3. **Tuning:** `/tuning` loads the values from `admin-verify`. The owner changes one tagline and publishes.

- [ ] **Step 4: Verify**

```bash
gh api "repos/Doberjohn/inkweave/commits?sha=admin-verify&per_page=3" --jq '.[].commit.message'
[ "$(gh api repos/Doberjohn/inkweave/git/ref/heads/master --jq .object.sha)" = "$MASTER_BEFORE" ] && echo "master unchanged"
gh run list --repo Doberjohn/inkweave --branch admin-verify --limit 10
```

Expected:
- the three messages: `chore(engine): tune scoring copy + scores`, `fix(card-images): update image for …` and `feat(reveals): add …`;
- `master unchanged`;
- no CI, Deploy or convert-reveal-images runs.

- [ ] **Step 5: Clean up**

```bash
gh api -X DELETE repos/Doberjohn/inkweave/git/refs/heads/admin-verify
gh api repos/Doberjohn/inkweave/git/ref/heads/admin-verify --silent || echo "admin-verify is gone"
```

Remove the line from `.env.local` and restart `pnpm dev`.
Expected: `admin-verify is gone`, and the header names `master` again.

---

### Task 13: Docs, push and PR [confirm push]

**Files:** Modify `CLAUDE.md`, `docs/PLAN.md`, `docs/plans/P2-port-tools.md`

- [ ] **Step 1: CLAUDE.md**

````diff
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -10,6 +10,12 @@ Private admin tools for Inkweave. The public app is `Doberjohn/inkweave`, served
 - The engine (`inkweave-synergy-engine`) is a pnpm workspace package built from the submodule (`pnpm build:engine`). `typecheck`, `build` and `test:run` build it themselves; run it once before `pnpm dev` on a fresh clone or after a pin bump.
 - Admin declares the app's full runtime dependency set at the app's exact versions. `pnpm check:deps` verifies this, and `pnpm check:deps --fix` aligns it.
 
+## The tools
+
+- `src/tools/{reveal,image,tuning,analytics,banner}` hold the tools, `src/github/` the GitHub read/write layer, and `src/shell/` the layout every route renders in. How they were ported: [docs/plans/P2-port-tools.md](docs/plans/P2-port-tools.md).
+- The reveal, image and tuning tools read from and commit to `Doberjohn/inkweave` on `VITE_ADMIN_TARGET_BRANCH`, which defaults to `master`. To rehearse writes, create a throwaway branch in the app repo and set the variable in `.env.local`. The shell header always names the branch.
+- Admin files pass the app's design-token rules in full. The one exception is `src/tools/banner/SynergyBanner.tsx` (three rules, in `eslint.config.js`), and like the app's ledger it only shrinks. Buttons come from the app's kit through the bridge (`CtaButton`, `LinkButton`).
+
 ## Commands
 
 ```bash
@@ -20,6 +26,8 @@ pnpm lint
 pnpm test             # vitest watch; pnpm test:run for one pass (builds the engine first)
 pnpm check:deps       # dependency parity with the pinned app
 pnpm check:hooks      # the .claude/hooks case table (CI runs it; minutes on Windows)
+pnpm storybook        # http://localhost:6007, the tools' stories
+pnpm banner <cardId>  # export a Synergy Spotlight banner (docs/BANNER.md)
 ```
 
 ## Updating the app pin
````

- [ ] **Step 2: PLAN.md and "P2 as built"**

In `docs/PLAN.md`, under `### P2: Port the tools`, add: `Detailed plan and as-built notes: [docs/plans/P2-port-tools.md](plans/P2-port-tools.md).`

At the end of this plan, add a "P2 as built" section. It lists every departure from the tasks as written, with the owner's approval, in the style of "P1 as built".

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md docs/PLAN.md docs/plans/P2-port-tools.md
```

```bash
USER_APPROVED=1 git commit -m "docs: record the ported tools (#2)"
```

- [ ] **Step 4: Push and open the PR**

The owner approves the push. The pre-push hook runs the parity check and the typecheck.

```bash
USER_APPROVED=1 git push -u origin feature/2-port-tools
```

Write the PR body with the Write tool to `pr-body.md` outside the repo (in a Claude session, the session scratchpad). It should include a summary, the three owner decisions, the design-token table and "Closes #2". Then, with `$BODY` as that path:

```bash
gh pr create --repo Doberjohn/inkweave-admin --base main --head feature/2-port-tools --title "Port the admin tools (#2)" --body-file "$BODY"
```

- [ ] **Step 5: Review**

Bind the PR with the ccd_pr tools. CodeRabbit, cubic and the CodeScene gate review it.
- Check each finding against the code before acting on it.
- Ask the owner before each commit.
- Reply to each thread you act on through `gh api repos/Doberjohn/inkweave-admin/pulls/<pr>/comments/<id>/replies`. End the reply with `_🤖 Addressed by [Claude Code](https://claude.com/claude-code)_`.
- Resolve it with `resolveReviewThread` unless it's already resolved.

---

### Task 14: Merge, deploy, owner check

- [ ] **Step 1: The owner merges the PR**

- [ ] **Step 2: The deploy kept the login gate**

```bash
gh run list --repo Doberjohn/inkweave-admin --workflow deploy.yml --limit 1
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://inkweave-admin.vercel.app/reveal
```

Expected:
- the run succeeded, and its log prints the `gated` lines;
- the curl prints `302 https://vercel.com/sso-api?...`.

- [ ] **Step 3: The owner opens every tool on the admin site**

Logged in to `https://inkweave-admin.vercel.app`:
- `/` lists the tools.
- `/reveal`, `/image` and `/tuning` ask for the token. This is a new origin, so it's entered once more.
- `/tuning` shows the live `master` values.
- `/analytics` shows the "not generated yet" box until P3.
- `/banner/2983` renders.

- [ ] **Step 4: Close out**

Tick issue #2's checklists, and note anything left for P3.

---

## Rollback

As in issue #2:
- revert the merge on `main` through a PR;
- delete `admin-verify` if Task 12 left it behind;
- to withdraw the token from the admin origin, remove `inkweave.reveal-admin.gh-token` in DevTools and revoke the token in GitHub.

---

## Appendix A: the codemod

A one-off script, kept outside the repo; it is recorded here as it ran. Run it from the repo root.
- `node "$CODEMOD" <github|reveal|image|tuning|analytics|banner>` ports one group.
- `--out <dir>` writes elsewhere for a dry run.

```js
#!/usr/bin/env node
// One-off P2 codemod (docs/plans/P2-port-tools.md). Copies one group of the
// app's admin files out of the pinned submodule into admin, and rewrites every
// relative import so it points at admin's layout: app code through
// src/app-bridge.ts, the GitHub layer through src/github/, and card types
// through the engine package. Value imports from the same module are merged.
// An import it cannot map stops the run before anything is written.
//
// Usage (from the admin repo root):
//   node <path>/port-from-app.mjs <github|reveal|image|tuning|analytics|banner> [--out <dir>]
import fs from 'node:fs';
import path from 'node:path';

const ADMIN = process.cwd();
const WEB = 'upstream/inkweave/apps/web/src';

// Whole app folders that move as a unit: [app folder, admin folder].
const FOLDERS = [
  ['features/reveal-admin', 'src/tools/reveal'],
  ['features/image-admin', 'src/tools/image'],
  ['features/tuning-admin', 'src/tools/tuning'],
  ['features/admin-analytics', 'src/tools/analytics'],
];

// App module (extensionless, relative to apps/web/src) -> admin module
// (relative to the admin root) or a bare package name.
const MODULES = {
  'shared/constants': 'src/app-bridge',
  'shared/components': 'src/app-bridge',
  'shared/components/CtaButton': 'src/app-bridge',
  'shared/components/TabList': 'src/app-bridge',
  'shared/hooks': 'src/app-bridge',
  'shared/contexts/CardDataContext': 'src/app-bridge',
  'features/cards': 'src/app-bridge',
  'features/cards/components/CardTile': 'src/app-bridge',
  'features/synergies/hooks/usePrecomputedSynergies': 'src/app-bridge',
  'features/cards/types': 'inkweave-synergy-engine',
  'shared/lib/githubCommit': 'src/github/githubCommit',
  'shared/hooks/useGithubToken': 'src/github/useGithubToken',
  'shared/components/GithubTokenGate': 'src/github/GithubTokenGate',
  'shared/components/ImageUploadTile': 'src/components/ImageUploadTile',
  'features/synergies/components/SynergyBanner': 'src/tools/banner/SynergyBanner',
};

const folder = (from, to, skip = []) => ({from, to, skip});
const GROUPS = {
  github: [
    ['shared/lib/githubCommit.ts', 'src/github/githubCommit.ts'],
    ['shared/lib/__tests__/githubCommit.test.ts', 'src/github/githubCommit.test.ts'],
    ['shared/hooks/useGithubToken.ts', 'src/github/useGithubToken.ts'],
    ['shared/components/GithubTokenGate.tsx', 'src/github/GithubTokenGate.tsx'],
    ['shared/components/GithubTokenGate.stories.tsx', 'src/github/GithubTokenGate.stories.tsx'],
    ['shared/components/ImageUploadTile.tsx', 'src/components/ImageUploadTile.tsx'],
    ['shared/components/ImageUploadTile.stories.tsx', 'src/components/ImageUploadTile.stories.tsx'],
  ],
  reveal: [folder(...FOLDERS[0]), ['pages/RevealAdminPage.tsx', 'src/tools/reveal/RevealPage.tsx']],
  image: [folder(...FOLDERS[1]), ['pages/ImageAdminPage.tsx', 'src/tools/image/ImagePage.tsx']],
  tuning: [folder(...FOLDERS[2]), ['pages/TuningAdminPage.tsx', 'src/tools/tuning/TuningPage.tsx']],
  analytics: [
    // The Vercel login is the gate now, so AdminGate and its test stay behind.
    folder(...FOLDERS[3], ['AdminGate.tsx', '__tests__/AdminGate.test.tsx']),
    ['pages/AdminAnalyticsPage.tsx', 'src/tools/analytics/AnalyticsPage.tsx'],
    ['pages/AdminAnalyticsPage.stories.tsx', 'src/tools/analytics/AnalyticsPage.stories.tsx'],
  ],
  banner: [
    ['pages/BannerPage.tsx', 'src/tools/banner/BannerPage.tsx'],
    ['features/synergies/components/SynergyBanner.tsx', 'src/tools/banner/SynergyBanner.tsx'],
  ],
};

const posix = (p) => p.split(path.sep).join('/');
const stripExt = (p) => p.replace(/\.(tsx?|mjs|js)$/, '');

function walk(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
  );
}

/** [app file relative to WEB, admin file relative to ADMIN] pairs for a group. */
function pairsFor(group) {
  return group.flatMap((entry) => {
    if (Array.isArray(entry)) return [entry];
    const base = path.join(ADMIN, WEB, entry.from);
    return walk(base)
      .map((abs) => posix(path.relative(base, abs)))
      .filter((rel) => !entry.skip.includes(rel))
      .map((rel) => [`${entry.from}/${rel}`, `${entry.to}/${rel}`]);
  });
}

/** Admin module for an app module, or null when the port has no mapping for it. */
function mapModule(appModule) {
  if (appModule in MODULES) return MODULES[appModule];
  for (const [from, to] of FOLDERS) {
    if (appModule === from) return `${to}/index`;
    if (appModule.startsWith(`${from}/`)) return to + appModule.slice(from.length);
  }
  return null;
}

/** The specifier an admin file uses to reach an admin module. */
function specifierFor(adminFile, adminModule) {
  if (!adminModule.startsWith('src/')) return adminModule;
  const rel = posix(path.relative(path.dirname(adminFile), adminModule));
  return rel.startsWith('.') ? rel : `./${rel}`;
}

// import ... from '...', export ... from '...', side-effect imports, vi.mock('...'), import('...').
const SPECIFIER = /(\bfrom\s+|\bimport\s+|\bvi\.mock\(\s*|\bimport\(\s*)'(\.{1,2}\/[^']*)'/g;

function rewrite(appFile, adminFile, source, unmapped) {
  return source.replace(SPECIFIER, (match, lead, spec) => {
    const appModule = posix(path.normalize(path.join(path.dirname(appFile), spec)));
    const adminModule = mapModule(stripExt(appModule));
    if (!adminModule) {
      unmapped.push(`${appFile}: '${spec}' (${appModule})`);
      return match;
    }
    return `${lead}'${specifierFor(adminFile, adminModule)}'`;
  });
}

// Named value imports (not `import type`), possibly spanning lines.
const NAMED_IMPORT = /^import \{([^}]*)\} from '([^']+)';\n/gm;

/** Merge value imports that now name the same module (e.g. two app modules that both became the bridge). */
function mergeImports(source) {
  const bySpec = new Map();
  for (const m of source.matchAll(NAMED_IMPORT)) {
    bySpec.set(m[2], [...(bySpec.get(m[2]) ?? []), m]);
  }
  let out = source;
  for (const [spec, matches] of bySpec) {
    if (matches.length < 2) continue;
    const names = [...new Set(matches.flatMap((m) => m[1].split(',').map((n) => n.trim()).filter(Boolean)))];
    const merged = `import {${names.join(', ')}} from '${spec}';\n`;
    out = out.replace(matches[0][0], merged);
    for (const m of matches.slice(1)) out = out.replace(m[0], '');
  }
  return out;
}

function main() {
  const [name, ...rest] = process.argv.slice(2);
  const group = GROUPS[name];
  if (!group) {
    console.error(`Usage: port-from-app.mjs <${Object.keys(GROUPS).join('|')}> [--out <dir>]`);
    process.exit(2);
  }
  const outIndex = rest.indexOf('--out');
  const outRoot = outIndex >= 0 ? path.resolve(rest[outIndex + 1]) : ADMIN;

  const unmapped = [];
  const files = pairsFor(group).map(([appFile, adminFile]) => {
    const source = fs.readFileSync(path.join(ADMIN, WEB, appFile), 'utf8');
    return [adminFile, mergeImports(rewrite(appFile, adminFile, source, unmapped))];
  });
  if (unmapped.length) {
    console.error(`Unmapped imports, nothing written:\n  ${unmapped.join('\n  ')}`);
    process.exit(1);
  }
  for (const [adminFile] of files) {
    if (fs.existsSync(path.join(outRoot, adminFile))) {
      console.error(`Refusing to overwrite ${adminFile}; nothing written.`);
      process.exit(1);
    }
  }
  for (const [adminFile, text] of files) {
    fs.mkdirSync(path.dirname(path.join(outRoot, adminFile)), {recursive: true});
    fs.writeFileSync(path.join(outRoot, adminFile), text);
  }
  console.log(`${name}: ${files.length} files written under ${posix(path.relative(ADMIN, outRoot)) || '.'}`);
}

main();
```
