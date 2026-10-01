> Part of [R: Admin redesign](../R-redesign.md). Read its decisions, corrections to the spec, global constraints and shared interfaces first.

Contract additions: none.

### Task R1-12: Docs, stories sweep and the real-data check

This task closes R1. Run it last, once Tasks R1-1 to R1-11 (the chart kit, R1-3b, included) are committed on `feature/24-admin-redesign`. It owns the remaining R1 edits to `CLAUDE.md`, `README.md` and `docs/PLAN.md`. R1-1 already edited `CLAUDE.md` (lines 15 and 17, the `pnpm banner` line), `docs/PLAN.md` (the Banner generator bullet), `eslint.config.js` and `.gitignore`, and R1-6 edited `CLAUDE.md` line 16 and `.env.example`. Quote those versions. `.storybook/preview.tsx` must already mount `AdminStyles` (R1-2 Step 9), and Step 10 checks for that. Steps 6 and 7 settle the bridge re-exports R1 left unused, with the owner.

The task adds no unit test, because it changes only docs, plus at most three unused bridge re-exports (Step 7), which typecheck and the gates cover. Its checks are a Storybook build, a run that renders every story, the real-data run and the gates. **The repo has no Storybook build script (`package.json` has only `storybook`), and CI doesn't build Storybook.** So the Storybook checks here are one-off: a `storybook build` into a git-ignored folder, plus a manual smoke run in the `admin-storybook` preview.

**Files:**
- Modify: `CLAUDE.md`
  - "The tools", lines 13-17
  - the Analytics bullet, line 21
  - the Commands block, lines 28-37 (R1-1 removed the `pnpm banner` line)
- Modify: `docs/PLAN.md`
  - the issue map, lines 5-13
  - the status line, line 16
  - D10, line 74 (73 on `main`; R1-1's Banner generator bullet moved it)
- Modify: `docs/plans/R-redesign.md`
  - the **Tracking:** line, line 17
  - a new **Status:** line after it
  - "### R1 as built" at the end of "## Phase R1"
- Modify only if the owner drops them (Steps 6 and 7):
  - `src/app-bridge.ts`, the `CAP_LABEL`, `SURFACE_CARD` and `TabList` re-exports
  - `docs/PLAN.md`, the two lines that name `TabList` (55 and 110 on `main`, 56 and 111 after R1-1's bullet)
- Check, no change expected:
  - `README.md`
  - `.env.example` (R1-6 Step 23 rewrote the comment's last sentence, now lines 7-8)
  - `.storybook/preview.tsx` (R1-2 Step 9 mounts `AdminStyles` there)
- Test: no new tests. The checks are `storybook build`, the story smoke run, the real-data run, and `pnpm lint`, `pnpm typecheck`, `pnpm test:run`, `pnpm build` and `pnpm check:deps`.

**Interfaces:**
- Consumes:
  - `AdminStyles`, through the global decorator that R1-2 Step 9 adds to `.storybook/preview.tsx`
  - the `adm-card-btn` class, plus `aria-pressed` and `aria-current="page"`, which the browser checks query
  - the chart kit (R1-3b): `ChartFrame`'s `<figure>` with its Chart | Table toggle, `BarChart`'s bar buttons (`aria-pressed`, roving ←/→; with `onSelect`) or its `useChartCursor` plot (`role="slider"`, `aria-valuetext`; without), `LineChart`'s crosshair, `ChartTooltip`, and `RangeControl` (`RANGE_OPTIONS`; Vote activity's `NO_FILTERS.range` is `'30d'`, R-9) with `rangeStartDay` and `bucketFor`. Step 1 confirms the kit's files exist and the three insights pages import it. Step 11 accepts `src/charts/Charts.stories.tsx` as the kit's story, and the real-data run checks the rest live.
  - `NAV_ITEMS`, `NavItem.writes` and `isWritePath` (`src/shell/nav.ts`), plus `PageLayout`'s `writes` prop, `BranchNotice`, `useGithubToken`, `fetchAdminData` and the cache reset in `src/test/setup.ts` (R1-5). CLAUDE.md documents them, and the real-data run checks them live.
  - `dailyStacks` and `weeklyStacks` over each range preset's window (`rangeStartDay`, then `bucketFor`), `activityKpis`, `rulesToReview` (at least 10 score votes, ties to more votes), `latestVotes`, `recentWeeks(weekly, WEEKS_SHOWN)` (the table, at most 12 calendar weeks), whose newest `weeksThatFit(width)` weeks are the chart, `trendSummary` (a tied peak goes to the later day), `fillTrendDays` (every day of the reporting window), `trackedEventsTotal` and `sortEventsByTotal`. The real-data run checks their output against the real files.
  - the `/analytics` → `/` redirect
- Produces: no code interface. Docs, plus the removal of the unused `CAP_LABEL`, `SURFACE_CARD` and `TabList` re-exports if the owner agrees (Step 7).

- [ ] **Step 1: Confirm the plan is in git, the earlier R1 tasks finished their removals, and the pages use the chart kit**

Run in Git Bash:

```bash
cd /d/johnn/Projects/inkweave-admin
git branch --show-current
git ls-files --error-unmatch docs/plans/R-redesign.md
ls src/tools/banner scripts/export-banner.mjs scripts/export-banner.test.mjs docs/BANNER.md public/art/banner src/shell/ToolIndex.tsx src/shell/tools.ts src/shell/WriteToolFrame.tsx src/tools/analytics/AnalyticsPage.tsx src/tools/analytics/AdminAnalyticsDashboard.tsx src/tools/analytics/ActivityView.tsx src/tools/analytics/DayGroup.tsx src/tools/analytics/WebAnalyticsView.tsx
git diff --name-only --no-renames --diff-filter=D main...HEAD -- '*.stories.tsx'
```

Expected:
- The first line is `feature/24-admin-redesign`.
- `git ls-files` prints the plan's path.
- `ls` prints `ls: cannot access '<path>': No such file or directory` for all 13 paths and exits 2.
- The diff lists exactly these deleted stories (order may vary):

```
src/shell/ToolIndex.stories.tsx
src/tools/analytics/ActivityView.stories.tsx
src/tools/analytics/AnalyticsPage.stories.tsx
src/tools/analytics/DayGroup.stories.tsx
src/tools/analytics/WebAnalyticsView.stories.tsx
```

`git ls-files` may error with `error: pathspec '…' did not match any file(s) known to git`. If it does, stop and ask the owner which commit should carry the plan. The handoff it cites as the spec stays outside git (R1-1 Step 1). Steps 3, 4 and 8 link to the plan, and Step 26's commit must not be the one that adds it.

If a path still exists, or a story is missing from the list, stop. Tell the owner which task left it:
- R1-1 owns the banner, including `public/art/banner/`.
- The shell task owns `ToolIndex*` and `tools.ts`.
- R1-7 owns `src/shell/WriteToolFrame.tsx`, R1-6's interim frame.
- The insights tasks own the analytics files.

Then confirm that the chart kit exists and that the three insights pages are built on it. Steps 17 to 19 check the kit's charts live, so a page that still draws its own chart would fail them partway through the real-data run:

```bash
cd /d/johnn/Projects/inkweave-admin
ls src/charts/{scale,range,series,useChartCursor}.ts src/charts/{ChartLegend,ChartTooltip,ChartFrame,BarChart,LineChart,RangeControl,HatchPattern}.tsx src/charts/Charts.stories.tsx
git grep -l -e "charts/BarChart" -e "charts/LineChart" -- src/tools/analytics/overview src/tools/analytics/activity src/tools/analytics/web
```

Expected:
- `ls` prints all 12 paths and exits 0.
- `git grep` prints at least one file in each of the three folders, `overview/`, `activity/` and `web/`.

Otherwise stop and tell the owner which task owes it: R1-3b owns `src/charts/` and its story file, R1-8 the Overview, R1-9 Vote activity and R1-10 Web analytics.

- [ ] **Step 2: Find the stale references this task fixes**

```bash
cd /d/johnn/Projects/inkweave-admin
grep -rnIE "SynergyBanner|BannerPage|bannerPaging|export-banner|BANNER\.md|pnpm banner|analytics,banner|ToolIndex|ADMIN_TOOLS|isToolRoute|shell/tools|shell header always names|analytics tool shows|playwright" CLAUDE.md README.md .env.example .gitignore eslint.config.js package.json vite.config.ts vercel.json forwarded-paths.json .storybook .claude .github src scripts
```

Expected: this one line, which Step 4 fixes (shown shortened). R1-1 and R1-6 already fixed the others:

```
CLAUDE.md:21:- **Analytics.** … locally the analytics tool shows its "not generated" state. …
```

The grep may print one more line: a `package.json` line naming `playwright`, only if the owner chose to keep that devDependency in R1-1. If so, it stays.

A comment that only records history, such as "replaces ToolIndex", is fine. Anything else is a defect of the task that owns the file. Examples are an import, route, test or `package.json` script that still names a removed piece. Stop and report it. Don't patch it here, because it may need a test change.

- [ ] **Step 3: Rewrite CLAUDE.md's "The tools" section**

First, confirm what the shell task built:

```bash
cd /d/johnn/Projects/inkweave-admin
grep -n "writes\|isWritePath" src/shell/PageLayout.tsx src/shell/Sidebar.tsx
```

Expected:
- `PageLayout.tsx` declares the `writes` prop and renders `BranchNotice` from it.
- `Sidebar.tsx` calls `isWritePath` to decide whether to show the token box.

If either is missing, stop and ask the owner, because the text below describes the contract in "Shared interfaces".

Replace everything from the `## The tools` heading up to, but not including, `## Pipelines`. Before (lines 13-17, with R1-1's lines 15 and 17 and R1-6's line 16):

```markdown
## The tools

- `src/tools/{reveal,image,tuning,analytics}` hold the tools, `src/github/` the GitHub read/write layer, and `src/shell/` the layout every route renders in. How they were ported: [docs/plans/P2-port-tools.md](docs/plans/P2-port-tools.md).
- The reveal, image and tuning tools commit to `Doberjohn/inkweave` on `VITE_ADMIN_TARGET_BRANCH`, which defaults to `master`. Reveal and tuning also read the files they edit (`previewCards.json`, `tuning.json`) from that branch; card lists come from `inkweave.ink` through the forwarded `/data/`. To rehearse writes, create a throwaway branch in the app repo and set the variable in `.env.local` (`.env.example` has the line). Every page that writes names the branch in its header (`BranchNotice`); the read-only pages don't.
- Admin files pass the app's design-token rules in full, with no exception in `eslint.config.js`: don't add one. Buttons come from the app's kit through the bridge (`CtaButton`, `LinkButton`).
```

After:

```markdown
## The tools

- `src/tools/{reveal,image,tuning,analytics}` hold the tools, `src/github/` the GitHub read/write layer, `src/theme/` and `src/ui/` admin's theme and UI primitives, `src/charts/` the chart kit, and `src/shell/` the layout every route renders in: a collapsible sidebar, which remembers its state per browser, and `PageLayout`, the header every page renders through. The kit is hand-built SVG on the admin theme, with no chart library, and every new chart builds on it. `/calibration`'s `WeeklyActivityChart` predates it and stays until R2 replaces it, and `Sparkline`, `MeterBar` and `BiasBar` stay `src/ui` primitives. A new chart follows the `dataviz` skill's guidance (its mark specs, one tooltip that the keyboard reaches too, a Chart | Table toggle, one y axis) and the redesign's chart decisions, R-9 and R-12 to R-15. Where they differ, the decisions win: R-14 keeps Tinos on headline numbers and R-15 keeps the brand colours. How the tools were ported: [docs/plans/P2-port-tools.md](docs/plans/P2-port-tools.md). The redesign, phase by phase: [docs/plans/R-redesign.md](docs/plans/R-redesign.md).
- Routes: the Overview at `/`, the insights pages `/calibration`, `/activity` and `/web`, and the write tools `/reveal`, `/image` and `/tuning`. `src/shell/nav.ts` lists the sidebar's items and marks the ones that write (`writes`). `src/router.tsx` also redirects retired paths: `/analytics` goes to `/`. The insights pages read `/admin-data/` only through `fetchAdminData`, which keeps each file's promise for the session (`src/test/setup.ts` empties it before every test).
- The reveal, image and tuning tools commit to `Doberjohn/inkweave` on `VITE_ADMIN_TARGET_BRANCH`, which defaults to `master`. Reveal and tuning also read the files they edit (`previewCards.json`, `tuning.json`) from that branch; card lists come from `inkweave.ink` through the forwarded `/data/`. To rehearse writes, create a throwaway branch in the app repo and set the variable in `.env.local` (`.env.example` has the line). Every page that writes names the branch in its header (`BranchNotice`, from `targetBranch()`), and read-only pages don't. A new write page sets `writes: true` in `nav.ts` (the sidebar's token box, through `isWritePath`) and passes `writes` to its `PageLayout` (the branch notice).
- Write pages sit behind `GithubTokenGate`. `useGithubToken` is one store shared by every component, so the sidebar's token box (on write pages, once a token is saved) and its "Forget token" act on every page at once.
- Admin files pass the app's design-token rules in full, with no exception. Admin's palette and scales live in `src/theme/adminTheme.ts` (`ADMIN_COLORS`, `ADMIN_TYPE`, `ADMIN_RADIUS`, `ADMIN_LAYOUT`), composed only from bridged tokens: add a value there, never a literal in a component. Hover, focus and selected states come from one scoped stylesheet, `src/theme/AdminStyles.tsx` (`adm-*` classes), whose rules interpolate the same tokens. Data text is never `COLORS.textDim`, which fails contrast on these surfaces, and mono text is a bare `<code>`. Buttons are the app's kit through the bridge (`CtaButton`, `LinkButton`) or a native `<button className="adm-…">`, never a styled `<button>`.
```

- [ ] **Step 4: Update CLAUDE.md's Analytics bullet**

Before (line 21):

```markdown
- **Analytics.** The Deploy workflow runs nightly (04:00 UTC), on every push to `main`, and on demand (`gh workflow run deploy.yml --repo Doberjohn/inkweave-admin`). It checks out the app's `master` into `app-master/`, builds that engine and its synergy data, and runs `scripts/precompute-{vote,vercel}-analytics.mjs`. Those write `public/admin-data/`, which ships inside the login-gated deployment. `app-master/` and `public/admin-data/` are git-ignored; locally the analytics tool shows its "not generated" state. How it was built: [docs/plans/P3-pipelines.md](docs/plans/P3-pipelines.md).
```

After:

```markdown
- **Analytics.** The Deploy workflow runs nightly (04:00 UTC), on every push to `main`, and on demand (`gh workflow run deploy.yml --repo Doberjohn/inkweave-admin`). It checks out the app's `master` into `app-master/`, builds that engine and its synergy data, and runs `scripts/precompute-{vote,vercel}-analytics.mjs`. Those write `public/admin-data/`, which ships inside the login-gated deployment. `app-master/` and `public/admin-data/` are git-ignored; locally the insights pages show their "not generated" state. To see real data locally, the owner saves the deployment's three `/admin-data/` files into `public/admin-data/` ("Seeing R1 with real data locally" in [docs/plans/R-redesign.md](docs/plans/R-redesign.md)); never commit them. How it was built: [docs/plans/P3-pipelines.md](docs/plans/P3-pipelines.md).
```

- [ ] **Step 5: Replace CLAUDE.md's Commands block**

Replace the whole fenced block under `## Commands`. Before (lines 28-37, as R1-1 left it without the `pnpm banner` line):

````markdown
```bash
pnpm dev              # http://localhost:5180 (the app uses 5173-5175)
pnpm build            # engine + tsc -b + vite build
pnpm typecheck        # engine + tsc -b (includes every bridged app module)
pnpm lint
pnpm test             # vitest watch; pnpm test:run for one pass (builds the engine first)
pnpm check:deps       # dependency parity with the pinned app
pnpm check:hooks      # the .claude/hooks case table (CI runs it; minutes on Windows)
pnpm storybook        # http://localhost:6007, the tools' stories
```
````

After:

````markdown
```bash
pnpm dev              # http://localhost:5180 (the app uses 5173-5175)
pnpm build            # engine + tsc -b + vite build
pnpm typecheck        # engine + tsc -b (includes every bridged app module)
pnpm lint
pnpm test             # vitest watch; pnpm test:run for one pass (builds the engine first)
pnpm check:deps       # dependency parity with the pinned app
pnpm check:hooks      # the .claude/hooks case table (CI runs it; minutes on Windows)
pnpm storybook        # http://localhost:6007: the shell, pages, primitives, charts and tools
```
````

- [ ] **Step 6: Find the bridge re-exports R1 left unused**

After R1-6 nothing uses `CAP_LABEL` or `SURFACE_CARD` (`ToolIndex` was their last user), and after R1-11 nothing uses `TabList` (`AdminAnalyticsDashboard` was). Unused re-exports fail neither typecheck nor lint, so only this check finds them. Run in Git Bash:

```bash
cd /d/johnn/Projects/inkweave-admin
for n in CAP_LABEL SURFACE_CARD TabList whiteRgba blackRgba; do git grep -qw "$n" -- src ':!src/app-bridge.ts' || echo "$n unused"; done
```

Expected:

```
CAP_LABEL unused
SURFACE_CARD unused
TabList unused
blackRgba unused
```

- `whiteRgba` is unused too. It doesn't print only because a comment in `src/theme/adminTheme.ts` (R1-2, "Why gray400 and not whiteRgba") names it.
- R1-1 keeps `whiteRgba` and `blackRgba` on purpose: the `no-raw-rgba` rule's message recommends them for neutrals. They stay whether they print or not.
- If `CAP_LABEL`, `SURFACE_CARD` or `TabList` doesn't print, an R1 task uses it after all. Leave that one out of Step 7.

Ask the owner whether to drop `CAP_LABEL`, `SURFACE_CARD` and `TabList` from the bridge. Admin is `TabList`'s only runtime consumer (`docs/PLAN.md` §4.2), so after the drop the app's copy has none; whether the app keeps it is an app decision, which Step 28's optional app issue can raise. If the owner keeps them, skip Step 7.

- [ ] **Step 7: Drop the unused re-exports (only if the owner agreed in Step 6)**

Edit `src/app-bridge.ts`. In the `export {…} from '../upstream/inkweave/apps/web/src/shared/constants';` list, before:

```ts
  ALL_INKS,
  CAP_LABEL,
  CAP_LABEL_XS,
```

After:

```ts
  ALL_INKS,
  CAP_LABEL_XS,
```

Before:

```ts
  SPACING,
  SURFACE_CARD,
  TRUNCATE,
```

After:

```ts
  SPACING,
  TRUNCATE,
```

Then the `TabList` line. Before (R1-10 inserted `InkIcon` above `LinkButton`; these three lines are as on `main`):

```ts
export {LinkButton} from '../upstream/inkweave/apps/web/src/shared/components/LinkButton';
export {TabList} from '../upstream/inkweave/apps/web/src/shared/components/TabList';
export {useContainerWidth} from '../upstream/inkweave/apps/web/src/shared/hooks';
```

After:

```ts
export {LinkButton} from '../upstream/inkweave/apps/web/src/shared/components/LinkButton';
export {useContainerWidth} from '../upstream/inkweave/apps/web/src/shared/hooks';
```

Edit `docs/PLAN.md`, the two lines that name `TabList`. Each edit keeps its line count, so Step 8's line numbers still hold.

The first is in §2.3, part of the dated "Current state", so note the change instead of rewriting it. Before (line 56; 55 on `main`):

```markdown
- **Admin reads from the app:** design tokens (`shared/constants`), `CtaButton`, `TabList`, `useContainerWidth`, `CardDataContext` and the card loader, `CardTile`, `smallImageUrl`, card types, and the engine (`synergyEngine` and `transformCard` run live in reveal-admin; tuning-admin reads `TUNING`).
```

After:

```markdown
- **Admin reads from the app:** design tokens (`shared/constants`), `CtaButton`, `TabList` (no longer bridged since the redesign's R1), `useContainerWidth`, `CardDataContext` and the card loader, `CardTile`, `smallImageUrl`, card types, and the engine (`synergyEngine` and `transformCard` run live in reveal-admin; tuning-admin reads `TUNING`).
```

The second is in §4.2, "The bridge", which says the bridge re-exports exactly what admin uses. Before (line 111; 110 on `main`):

```markdown
- `TabList` stays in the app's design system even though admin is its only runtime consumer. Admin imports it through the bridge.
```

After:

```markdown
- `TabList` stays in the app's design system, although admin, its only runtime consumer, stopped using it in the redesign (R1) and no longer bridges it. Whether the app keeps it is the app's call.
```

Run in Git Bash:

```bash
cd /d/johnn/Projects/inkweave-admin
git grep -nw -e CAP_LABEL -e SURFACE_CARD -e TabList -- src
pnpm typecheck
pnpm lint
```

Expected:
- The grep prints nothing. `-w` doesn't match `CAP_LABEL_XS`, which stays.
- `pnpm typecheck` exits 0.
- `pnpm lint` exits 0 with no problems.

Show the owner `git diff --stat -- src/app-bridge.ts docs/PLAN.md` and the commands, and ask for approval. Run them with the Bash tool, only after the owner approves:

```bash
git add src/app-bridge.ts docs/PLAN.md
USER_APPROVED=1 git commit -m "chore(bridge): drop re-exports nothing uses (#24)"
```

Expected: the pre-commit hook runs `pnpm lint` and `pnpm test:run`, then git prints the commit summary. The `CLAUDE.md` edits from Steps 3 to 5 stay unstaged; Step 14 commits them.

- [ ] **Step 8: Update `docs/PLAN.md`**

Issue map. Before (line 13, the table's last row):

```markdown
| P6 | Doberjohn/inkweave#594 |
```

After:

```markdown
| P6 | Doberjohn/inkweave#594 |
| R1 to R4 (redesign) | Doberjohn/inkweave-admin#24 |
```

Status line. Before (line 16, or 17 once the issue-map row above is in):

```markdown
- **Status:** design approved by the owner (2026-09-25 review). P0 to P5 are done (2026-09-30), and P6 waits on `deck-builder`. As-built notes: P1 in its phase section, P2 and P3 in their linked plans, and P3 to P5 in "Phases P2 to P6: outline".
```

After:

```markdown
- **Status:** design approved by the owner (2026-09-25 review). P0 to P5 are done (2026-09-30), and P6 waits on `deck-builder`. As-built notes: P1 in its phase section, P2 and P3 in their linked plans, and P3 to P5 in "Phases P2 to P6: outline". The admin redesign followed the split, in four phases (R1 to R4); its plan and phase status are in [docs/plans/R-redesign.md](plans/R-redesign.md). It changes the routes, so sections 4.1, 4.4 and 4.6 describe admin as the split built it, and D10 notes the redesign's route changes.
```

R1-1's **Banner generator** bullet, right below the status line, already records the banner's removal, so this line doesn't repeat it.

D10. Find the row by its content, `| D10 | URLs |`. It is line 74 before this step (R1-1's bullet moved it down from 73), and 75 once the issue-map row above is in. Before:

```markdown
| D10 | URLs | Admin paths `/reveal`, `/image`, `/tuning`, `/analytics`, `/banner/:cardId`, with a tool index at `/`. Old `inkweave.ink/admin/*` and `/reveal-admin` URLs fall through to the app's NotFound page, like any unknown route | The whole site is admin. A redirect would advertise the admin URL on the public site |
```

After:

```markdown
| D10 | URLs | Admin paths `/reveal`, `/image`, `/tuning`, `/analytics`, `/banner/:cardId`, with a tool index at `/`. Old `inkweave.ink/admin/*` and `/reveal-admin` URLs fall through to the app's NotFound page, like any unknown route. **The redesign changes these** ([R-10](plans/R-redesign.md)): R1 puts the Overview at `/`, adds `/calibration`, `/activity` and `/web`, redirects `/analytics` to `/` and drops `/banner/:cardId`; R2 redirects `/tuning` to `/calibration`, and R4 redirects `/reveal` and `/image` to `/studio` | The whole site is admin. A redirect would advertise the admin URL on the public site. Redirects inside admin, which is login-gated, don't, so the redesign uses them |
```

- [ ] **Step 9: Check README, re-run the sweep, and check for copied icons and chart libraries**

```bash
cd /d/johnn/Projects/inkweave-admin
grep -nE "banner|analytics|header|tool index" README.md
grep -rnIE "SynergyBanner|BannerPage|bannerPaging|export-banner|BANNER\.md|pnpm banner|analytics,banner|ToolIndex|ADMIN_TOOLS|isToolRoute|shell/tools|shell header always names|analytics tool shows|playwright" CLAUDE.md README.md .env.example .gitignore eslint.config.js package.json vite.config.ts vercel.json forwarded-paths.json .storybook .claude .github src scripts
git diff --name-only --diff-filter=A main...HEAD -- public src | grep -iE '\.(svg|webp|png)$'
git diff main...HEAD -- package.json | grep -iE '^\+.*"(recharts|chart\.js|d3(-[a-z]+)?|@visx/|@nivo/|victory|echarts)'
```

Expected:
- The first grep prints nothing, because README needs no change: it names no route, tool or header.
- The second grep prints nothing, with two exceptions. A `package.json` line naming `playwright` is fine if the owner kept it in R1-1. So is any history-only comment that Step 2 accepted.
- The third command prints nothing.
- The fourth command prints nothing. R-12 rules out a chart library, and neither admin nor the app has one today, so an added line naming one is a defect of the task that added it.

The third command catches copied icons. The "Icons" correction bridges the app's `InkIcon` and `RaritySymbol` and the Enchanted webp. Any added `.svg`, `.webp` or `.png` under `public/` or `src/` is a copied handoff icon or other stray art. Report it to the owner, and fix it in the task that added it.

- [ ] **Step 10: Confirm stories render on the admin canvas**

```bash
cd /d/johnn/Projects/inkweave-admin
grep -n "AdminStyles" .storybook/preview.tsx
```

Expected: two lines, the `AdminStyles` import and `<AdminStyles />` inside the global decorator, as R1-2 Step 9 wrote them.

If it prints nothing, R1-2 skipped its Step 9 ("Mount AdminStyles in Storybook's preview"). Every story since then was reviewed without the `adm-*` states. Stop and tell the owner. The fix is that step, committed on its own as `chore(storybook): render stories on the admin canvas with AdminStyles (#24)` once the owner approves. Then run Steps 12 and 13 against it.

- [ ] **Step 11: Check that every new view has a story**

```bash
cd /d/johnn/Projects/inkweave-admin
for f in $(git diff --name-only --no-renames --diff-filter=A main...HEAD -- 'src/*.tsx' | grep -vE '\.(stories|test)\.tsx$|/__tests__/'); do
  [ -f "${f%.tsx}.stories.tsx" ] || echo "no story: $f"
done
```

Expected: the only files printed are ones that don't need a story:
- route hosts (`*Page.tsx`), whose views have the stories
- `src/ui/*.tsx` (covered by `src/ui/Primitives.stories.tsx`)
- `src/charts/*.tsx` (covered by `src/charts/Charts.stories.tsx`, R1-3b's one story file for the kit, which Step 1 confirmed exists)
- `src/theme/AdminStyles.tsx`
- `src/shell/AdminShell.tsx`
- parts that their parent view's story renders

If anything else prints, report it to the owner. The task that created the view owes its story; this task doesn't write stories for components it didn't build.

- [ ] **Step 12: Build Storybook once (the repo has no build script)**

```bash
cd /d/johnn/Projects/inkweave-admin
pnpm exec storybook build --quiet --disable-telemetry -o node_modules/.cache/storybook-check
echo "exit=$?"
rm -rf node_modules/.cache/storybook-check
```

Expected: `exit=0`, and the log ends by naming the output directory (`…node_modules\.cache\storybook-check`). The output goes under the git-ignored `node_modules/`, so `git status` stays clean.

An error like "Failed to resolve import" or "does not provide an export named" means a story imports a deleted or renamed module. Fix it in that story's task and repeat.

- [ ] **Step 13: Run the story smoke check and the a11y panels**

1. Load the `anthropic-skills:built-in-browser` skill.
2. Start Storybook with `mcp__Claude_Browser__preview_start` `{name: "admin-storybook"}`, which is the `.claude/launch.json` entry on port 6007.
3. Navigate to `http://localhost:6007`.
4. Run this with `mcp__Claude_Browser__javascript_tool`. It renders every story in a hidden iframe. It reports any story that shows Storybook's error display or never renders:

```js
const index = await (await fetch('/index.json')).json();
const stories = Object.values(index.entries).filter((entry) => entry.type === 'story');
function check(story) {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;left:-20000px;top:0;width:1280px;height:900px';
    frame.src = `/iframe.html?id=${story.id}&viewMode=story`;
    document.body.append(frame);
    const started = Date.now();
    let shownAt = 0;
    const poll = setInterval(() => {
      const body = frame.contentDocument?.body;
      const failed = body?.classList.contains('sb-show-errordisplay');
      if (!shownAt && body?.classList.contains('sb-show-main')) shownAt = Date.now();
      // A render error can land just after the story first shows, so wait 1.5 s more.
      const settled = shownAt > 0 && Date.now() - shownAt > 1500;
      if (failed || settled || Date.now() - started > 30000) {
        clearInterval(poll);
        const message = failed ? frame.contentDocument.querySelector('#error-message')?.textContent : '';
        frame.remove();
        resolve({story: `${story.title} / ${story.name}`, status: failed ? 'error' : settled ? 'ok' : 'timeout', message});
      }
    }, 250);
  });
}
const results = [];
for (let i = 0; i < stories.length; i += 6) results.push(...(await Promise.all(stories.slice(i, i + 6).map(check))));
({stories: stories.length, problems: results.filter((r) => r.status !== 'ok')});
```

Expected: `{stories: <count>, problems: []}`. On the first run, a `timeout` can come from Vite optimizing dependencies and reloading the iframes, so run it once more. A second `timeout`, or any `error`, is a defect: fix it in that story's task.

Then check accessibility for the stories added in R1:
1. List the added story files: `git diff --name-only --no-renames --diff-filter=A main...HEAD -- '*.stories.tsx'`.
2. Map them to story ids with this script:

```js
const index = await (await fetch('/index.json')).json();
const entries = Object.values(index.entries).filter((e) => e.type === 'story');
[...new Set(entries.map((e) => e.importPath))].map((path) => `${path} -> ${entries.find((e) => e.importPath === path).id}`);
```

3. For each added file, navigate to `http://localhost:6007/?path=/story/<id>` for its first story. For `src/charts/Charts.stories.tsx` and `src/ui/Primitives.stories.tsx`, check every story instead: one file covers the whole kit, or every primitive, so its first story would leave out the selectable `BarChart`, the `LineChart` and the slider stories. List their ids with:

```js
const index = await (await fetch('/index.json')).json();
const entries = Object.values(index.entries).filter((e) => e.type === 'story');
entries.filter((e) => /\/(Charts|Primitives)\.stories\.tsx$/.test(e.importPath)).map((e) => e.id);
```

4. On each story, open the addon panel's "Accessibility" tab (`mcp__Claude_Browser__find` "Accessibility", then click it).

Expected: 0 violations. Report any violation's rule id to the owner with the story name.

Then stop Storybook: `mcp__Claude_Browser__preview_list`, then `mcp__Claude_Browser__preview_stop` with its `serverId`. The pre-commit Vitest run times out on its workers while a preview server runs.

- [ ] **Step 14: Commit the docs**

Show the owner `git diff --stat` and the commands, and ask for approval. Run each command with the Bash tool, only after the owner approves:

```bash
git add CLAUDE.md docs/PLAN.md
USER_APPROVED=1 git commit -m "docs: describe the sidebar shell, write-page branch notice and admin theme (#24)"
```

Expected: the pre-commit hook runs `pnpm lint` and `pnpm test:run` (which builds the engine), then git prints the commit summary. If Vitest reports "Timeout waiting for worker", check whether a preview server is running. If one is, stop it and retry the approved commit.

- [ ] **Step 15: Prepare the real data (the owner's files)**

```bash
cd /d/johnn/Projects/inkweave-admin
ls -la public/admin-data/
node -e "for (const f of ['vote-analytics.json', 'vote-log.json', 'vercel-analytics.json']) { const d = JSON.parse(require('fs').readFileSync('public/admin-data/' + f, 'utf8')); console.log(f, 'generated', d.generatedAt); }"
git check-ignore -v public/admin-data/vote-log.json
grep -n "^VITE_ADMIN_TARGET_BRANCH" .env.local 2>/dev/null || echo "not set: the branch is master"
```

Expected:
- `ls` shows the three files.
- `node` prints a `generated` timestamp for each, normally all on the same day.
- `check-ignore` prints a line ending in `public/admin-data/	public/admin-data/vote-log.json`. The `.gitignore` line number depends on R1-1.
- The last command prints `not set: the branch is master`, or the rehearsal branch the write pages will name.

If the folder or a file is missing, ask the owner to follow "Seeing R1 with real data locally": signed in to `https://inkweave-admin.vercel.app`, they save the three `/admin-data/` files. Never sign in to Vercel yourself. If `JSON.parse` throws `Unexpected token '<'`, the saved file is the Vercel login page. Ask the owner to save it again while signed in.

- [ ] **Step 16: Compute the numbers the pages must show**

This prints to the local terminal only. Never paste these numbers into a commit, the PR or an issue.

```bash
cd /d/johnn/Projects/inkweave-admin
node --input-type=module <<'EOF'
import {readFileSync} from 'node:fs';

const readJson = (file) => JSON.parse(readFileSync(`public/admin-data/${file}`, 'utf8'));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDay = (day) => `${MONTHS[Number(day.slice(5, 7)) - 1]} ${Number(day.slice(8, 10))}`;
const int = (n) => n.toLocaleString('en-US');
const signed = (n) => {
  if (n == null) return '—';
  const text = Math.abs(n).toFixed(2);
  return Number(text) === 0 ? text : `${n < 0 ? '\u2212' : '+'}${text}`;
};
const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
const weekStart = (day) => addDays(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7));

const va = readJson('vote-analytics.json');
const log = readJson('vote-log.json');
const web = readJson('vercel-analytics.json');
const g = va.global;

console.log(`Data as of ${va.generatedAt.slice(0, 10)} (raw votes: ${va.hasRawVotes}, Vercel data: ${web.hasVercelData})`);
console.log(`Overview KPIs: Total votes ${int(g.totalVotes)} | Pairs covered ${int(g.distinctPairs)} | Distinct voters ${!va.hasRawVotes || g.distinctVoters == null ? 'hidden' : int(g.distinctVoters)} | Engine-silent pairs ${int(g.engineSilentPairs)}`);
if (web.hasVercelData) console.log(`Tracked events ${int(web.events.reduce((sum, e) => sum + e.total, 0))} | ${web.events.length} event types`);
console.log(`Mean gap ${signed(g.meanGap)} | Accuracy sentiment ${signed(g.accuracySentiment)}`);
const lastWeek = g.weekly.at(-1)?.week;
if (lastWeek) {
  let start = addDays(lastWeek, -77);
  if (start < g.weekly[0].week) start = g.weekly[0].week;
  const n = Math.round((Date.parse(lastWeek) - Date.parse(start)) / 604_800_000) + 1;
  console.log(`Weekly activity: up to ${n} bars (fewer on a narrow card), ending ${fmtDay(lastWeek)}`);
}
const review = va.rules
  .filter((r) => r.meanGap != null && r.scoreVotes >= 10)
  .sort((a, b) => Math.abs(b.meanGap) - Math.abs(a.meanGap) || b.scoreVotes - a.scoreVotes)
  .slice(0, 4);
console.log(`Rules to review: ${review.map((r) => `${r.ruleName} ${signed(r.meanGap)}`).join(' | ')}`);
console.log(`Calibration: ${va.rules.length} rules in the table`);

const votes = [...log.votes].sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
if (votes.length) {
  console.log(`Latest votes: ${votes.slice(0, 4).map((v) => `${v.aName} + ${v.bName} ${v.score ?? '—'}`).join(' | ')}`);
  const newest = votes[0].ts.slice(0, 10);
  const firstDay = votes.at(-1).ts.slice(0, 10);
  for (const [label, days] of [['7 days', 7], ['30 days', 30], ['90 days', 90], ['All', null]]) {
    let start = days == null ? firstDay : addDays(newest, -(days - 1));
    if (start < firstDay) start = firstDay;
    const weekly = daysBetween(start, newest) + 1 > 90;
    const bars = weekly ? daysBetween(weekStart(start), weekStart(newest)) / 7 + 1 : daysBetween(start, newest) + 1;
    const span = weekly ? `weeks of ${fmtDay(weekStart(start))} to ${fmtDay(weekStart(newest))}` : `${fmtDay(start)} to ${fmtDay(newest)}`;
    const rows = votes.filter((v) => v.ts.slice(0, 10) >= start);
    const scores = rows.map((v) => v.score).filter((s) => s != null);
    const perDay = new Map();
    for (const v of rows) perDay.set(v.ts.slice(0, 10), (perDay.get(v.ts.slice(0, 10)) ?? 0) + 1);
    const top = Math.max(...perDay.values());
    const busiest = [...perDay].filter(([, n]) => n === top).map(([day]) => fmtDay(day));
    const avg = scores.length ? (scores.reduce((sum, s) => sum + s, 0) / scores.length).toFixed(2) : '—';
    console.log(`Range ${label}: ${bars} ${weekly ? 'weekly' : 'daily'} bars, ${span} | Votes ${int(rows.length)} | Active voters ${int(new Set(rows.map((v) => v.voter)).size)} | Average score ${avg} (${int(scores.length)} scored, ${int(rows.length - scores.length)} unscored) | Busiest day ${busiest.join(' or ')} (${int(top)})`);
  }
}
if (web.hasVercelData) {
  const byTotal = [...web.events].sort((a, b) => b.total - a.total);
  console.log(`Web events by total: ${byTotal.map((e) => `${e.label} ${int(e.total)}`).join(' | ')}`);
  if (web.reportingWindow) console.log(`Reporting window ${fmtDay(web.reportingWindow.since)} to ${fmtDay(web.reportingWindow.until)}`);
  const first = byTotal[0];
  if (first) {
    const inWindow = first.trend.reduce((sum, p) => sum + p.count, 0);
    const peak = first.trend.reduce((best, p) => (!best || p.count > best.count || (p.count === best.count && p.date > best.date) ? p : best), null);
    const dates = first.trend.map((p) => p.date).filter(Boolean).sort();
    const window = web.reportingWindow ?? (dates.length ? {since: dates[0], until: dates.at(-1)} : null);
    const points = window ? daysBetween(window.since, window.until) + 1 : 0;
    console.log(`Trend for ${first.label}: In window ${int(inWindow)} | Peak day ${peak && inWindow > 0 ? `${fmtDay(peak.date)} (${int(peak.count)})` : '—'} | ${points} days on the chart${window ? `, ${fmtDay(window.since)} to ${fmtDay(window.until)}` : ''}`);
  }
}
EOF
```

Expected: one line per heading above, built from the same fields the views read. The script was dry-run on fixtures. Distinct voters shows `hidden` whenever the page hides it: `CalibrationView.tsx:61` shows that card only when `hasRawVotes && distinctVoters != null`. Keep the output at hand for Steps 17 to 20. The output computes the contract helpers by their definitions:
- `fmtGap` (R1-3): U+2212 for negatives and `+` for positives, but a gap that rounds to zero prints `0.00` with no sign
- `rulesToReview`: at least 10 score votes, widest |gap| first, ties to the rule with more score votes, 4 rows
- `latestVotes`: newest first
- `recentWeeks` with `weeksThatFit` (R1-8): the last 12 calendar weeks up to the newest weekly point, never starting before the first, with quiet weeks filled in at 0 votes. The table view holds all of them, and a plot too narrow for that many 44px slots charts only the newest that fit, so the script's count is the table's row count and the most the chart can show
- `trendSummary` (R1-10): a tied peak goes to the later day, and a trend with no activity shows `—`
- `fillTrendDays` (R1-10): the trend chart has one point per day of the reporting window (with no window, the trend's first day to its last)
- `rangeStartDay` and `bucketFor` (R1-3b), then `dailyStacks` or `weeklyStacks` and `activityKpis` (R1-9): each "Range" line's window ends at the newest vote's UTC day and never starts before the oldest vote's. A span over 90 days, counted inclusively as `eachDay` counts it, charts per week (each week's UTC Monday, quiet weeks included), and a shorter one per day. Its KPIs count only the votes in that window, because the range scopes everything below it (R-9). "30 days" is the page's default.
- `trackedEventsTotal`: the sum of `total`
- `sortEventsByTotal`: by `total`, descending

- [ ] **Step 17: Start the dev server and check the Overview**

Start the server with `mcp__Claude_Browser__preview_start` `{name: "admin-dev"}`, on port 5180. If it fails because 5180 is taken (the owner's own `pnpm dev`), use that server. Navigate to `http://localhost:5180/` and run:

```js
({
  h1: document.querySelector('h1')?.textContent,
  current: document.querySelector('a[aria-current="page"]')?.getAttribute('href'),
  dataAsOf: document.body.innerText.match(/Data as of\s*(\d{4}-\d{2}-\d{2})/)?.[1],
  branchNotice: document.body.innerText.includes('Writes to Doberjohn/inkweave'),
  tokenBox: document.body.innerText.includes('GitHub token saved'),
});
```

Expected:
- `h1: 'Overview'` and `current: '/'`
- `dataAsOf` equal to Step 16's date
- `branchNotice: false` and `tokenBox: false`

Then run the chart census. It lists every chart-kit chart on the page (each is a `ChartFrame` `<figure>`), and Steps 18 and 19 run it again:

```js
const isMark = (el) => !el.closest('.adm-seg') && !['Chart', 'Table'].includes(el.textContent.trim());
[...document.querySelectorAll('figure')].map((figure) => {
  const slider = figure.querySelector('[role="slider"]');
  const bars = [...figure.querySelectorAll('[aria-pressed]')].filter(isMark);
  const names = bars.map((bar) => bar.getAttribute('aria-label') ?? bar.textContent.trim());
  const buttons = [...figure.querySelectorAll('button')].map((button) => button.textContent.trim());
  return {
    title: (figure.querySelector('figcaption') ?? figure).innerText.trim().split('\n')[0],
    toggle: buttons.includes('Chart') && buttons.includes('Table'),
    plot: slider && bars.length ? 'nested' : slider ? 'slider' : bars.length ? 'bars' : 'none',
    positions: slider ? Number(slider.getAttribute('aria-valuemax')) - Number(slider.getAttribute('aria-valuemin')) + 1 : bars.length,
    minHit: bars.length ? Math.round(Math.min(...bars.map((bar) => bar.getBoundingClientRect().width))) : null,
    now: slider?.getAttribute('aria-valuetext') ?? null,
    first: names[0] ?? null,
    last: names.at(-1) ?? null,
    pressed: bars.filter((bar) => bar.getAttribute('aria-pressed') === 'true').length,
    tableRows: figure.querySelectorAll('tbody tr').length,
    lastRow: figure.querySelector('tbody tr:last-child')?.innerText.replaceAll('\t', ' | ') ?? null,
  };
});
```

Each entry gives:
- `title`: the chart's title
- `toggle`: whether it has its Chart and Table buttons
- `plot`: `'slider'` for a chart on `useChartCursor` (a `LineChart`, or a `BarChart` without `onSelect`), or `'bars'` for a `BarChart` with `onSelect`, whose bars are buttons. `'nested'` means bar buttons inside a slider, which nests interactive content: it must never appear, on any page.
- `positions`: its number of bars or points
- `minHit`: the narrowest bar button's width in CSS pixels, its hit target across the axis (`null` without bar buttons)
- `now`: the slider's `aria-valuetext`
- `first` and `last`: the first and last bar's accessible name
- `pressed`: the selected bars
- `tableRows` and `lastRow`: the Table view's rows, and its last row

Expected on the Overview:
- one entry, the weekly chart, with `toggle: true` and `plot: 'slider'`, because its bars select nothing
- `positions` from 1 to Step 16's "up to N bars". A plot narrower than N slots of 44px (the frame less 48px of gutter and pad) shows only the newest weeks that fit. 0 is a bug, unless Step 16 printed no Weekly activity line.
- no legend (one series): a screenshot shows the title naming the chart and no legend keys

Check the chart's interactions. Steps 18 and 19 run the same three checks on their charts, and every entry the census lists gets them:
1. **Hover.** Take a screenshot. Hover over the newest bar (`mcp__Claude_Browser__computer` `{action: "hover", coordinate}`), then `zoom` on the chart. Expected:
   - one tooltip, beside the pointer, whose title names the week with its month: Step 16's "ending" week, such as "Sep 28"
   - each row leads with its value and follows with its label. A series key is a short line in the series colour, and no text wears a series colour; a gap in its gap colour is status text and is fine.
   - the hovered bar lifts (lighter, or outlined). A bar chart draws no crosshair.
   - at the plot's right edge the tooltip turns inward instead of being clipped

   Then hover over the page title. Expected: the tooltip goes away.
2. **Keyboard.** `find` "slider", then `left_click` its ref, which focuses the plot. Press End (`{action: "key", text: "End"}`) and run the focus script:

   ```js
   document.activeElement.getAttribute('aria-valuetext') ?? document.activeElement.getAttribute('aria-label') ?? document.activeElement.textContent.trim();
   ```

   Expected: the newest week with its month and the values the tooltip showed, and a `zoom` shows the tooltip at that bar. Press Home and run it again: the oldest week shown. Press ArrowRight: the next week.
3. **Table.** `find` "Table" (the toggle in the chart's figure), `left_click` it, and re-run the census. Expected: `tableRows` equal to Step 16's "up to N bars", because R1-8's table holds the whole window and can exceed the chart view's `positions` on a narrow card. Its last `positions` rows are the weeks the chart shows, and `lastRow` names the newest week with the values its tooltip showed. (Steps 18 and 19 expect `tableRows` equal to `positions`: their tables hold exactly the bars or days they chart.) Take a screenshot, then `left_click` "Chart": the census matches the chart view again.

Then read the page with `mcp__Claude_Browser__get_page_text` and compare it with Step 16:
- Total votes, Pairs covered, Distinct voters (with its `raw` tag, or hidden where Step 16 printed `hidden`), Engine-silent pairs, and Tracked events with "N event types"
- the calibration card's mean gap and accuracy sentiment, which use U+2212 for negatives
- the weekly chart's last label: Step 16's "ending" week, with its month ("Sep 28"). The first label depends on how many weeks fit.
- the four Rules to review, in order
- the four Latest votes, in order
- the Web events list

Take a screenshot (`mcp__Claude_Browser__computer` `screenshot`).

Compare against the old page if it is still deployed:
1. Run `mcp__Claude_Browser__tabs_create`, then navigate that tab to `https://inkweave-admin.vercel.app/analytics`.
2. If it lands on a Vercel login page, close the tab and rely on Step 16. Never sign in.
3. If the page loads and its "data as of" date equals Step 16's, its scorecards must show the same values as the Overview:
   - Total votes, Pairs covered, Engine-silent pairs and Distinct voters
   - the verdict's mean gap and accuracy sentiment. The old page prints an ASCII hyphen where the new one prints U+2212, but the digits must match.
4. If the dates differ, note it and rely on Step 16.
5. Close the tab.

Note whether this comparison ran, because Steps 26 and 29 word their claim from it.

- [ ] **Step 18: Check Vote activity**

Navigate to `http://localhost:5180/activity` and run:

```js
({
  h1: document.querySelector('h1')?.textContent,
  current: document.querySelector('a[aria-current="page"]')?.getAttribute('href'),
  range: [...document.querySelectorAll('[role="group"][aria-label="Range"] button')].map((b) => `${b.textContent}${b.getAttribute('aria-pressed') === 'true' ? ' (pressed)' : ''}`),
  branchNotice: document.body.innerText.includes('Writes to Doberjohn/inkweave'),
});
```

Then run Step 17's chart census. Expected:
- `current: '/activity'`
- `range: ['7 days', '30 days (pressed)', '90 days', 'All']`, the range control at its default (R-9). In a screenshot it sits in the filter row, and it is the first control in that row, which is the one row above the KPIs, chart, log and side panels it scopes.
- `branchNotice: false`
- the census: one entry, Votes per day, with `toggle: true` and `plot: 'bars'`, because selecting a bar picks its day
- its `positions` equal Step 16's "Range 30 days" bar count: 30, unless the log is younger than 30 days
- its `first` and `last` name that line's first and last days with the month ("Sep 1" … "Sep 30"), and `pressed: 0`
- its `minHit`, recorded as information. Under 24px is expected at 90 days and below a viewport of about 1,100px at 30 days. The page meets 2.5.8 through R1-9's equivalent control. Run `const s = document.querySelector('select[aria-label^="Pick a"]'); ({name: s?.getAttribute('aria-label'), h: Math.round(s?.getBoundingClientRect().height ?? 0), options: s?.options.length})`. Expected: `name` 'Pick a day' ('Pick a week' for weekly bars), `h` 24 or more, and `options` equal to `positions` + 1 ("All days" or "All weeks" plus one per bar). If the select is missing or a count is off, stop and report it as a defect of R1-9.
- a `zoom` on the chart shows its legend listing 7+, 5–6, ≤4 and No score with rectangle keys, No score hatched

If `positions` doesn't match, list the bars (`[...document.querySelectorAll('figure [aria-pressed]')].filter((b) => !b.closest('.adm-seg')).map((b) => b.getAttribute('aria-label') ?? b.textContent)`) before calling it a bug. With the other filters cleared, the KPIs match Step 16's "Range 30 days" line to the precision shown. If several days tie for busiest, the page may show any of them.

Before selecting, run Step 17's Hover check on this chart. It differs in these ways: hover over the newest bar, as Step 17 does. Its tooltip names the day with its month and lists each band's count and the total, values first. Each band row has a line key in its band's colour, and the hovered bar lifts. There is no crosshair. No bar has focus yet, so the tooltip goes away when the pointer leaves for the page title.

Click the newest day's bar (`find` its date, then `left_click` the button). Expected:
- that bar gets `aria-pressed="true"`, and the others dim
- the vote log's day separators all read that day with weekday and month ("Wed Sep 30")

Then run Step 17's Keyboard and Table checks on this chart. They differ in these ways:
- **Keyboard.** The click left focus on the newest bar. Press ArrowLeft and run Step 17's focus script. Expected: the day before, with the values its tooltip shows, because the tooltip follows focus. The census still shows `pressed: 1` on the newest day, because the arrows move focus and only Enter, Space or a click selects. Press ArrowRight to go back.
- **Table.** `tableRows` equals `positions`, and `lastRow` names the newest day with its band counts. Then sum the table's "No score" column:

  ```js
  const t = document.querySelector('figure table');
  const col = [...t.querySelectorAll('thead th')].findIndex((th) => th.textContent.trim() === 'No score');
  [...t.querySelectorAll('tbody tr')].reduce((s, tr) => s + Number(tr.cells[col].textContent.replace(/,/g, '')), 0);
  ```

  Expected: Step 16's "Range 30 days" unscored count. A `TypeError` means the table has no "No score" column, which is a defect of R1-9.

Take a screenshot, then click the bar again. Expected: `pressed` is back to 0, and the log shows all days again.

Then check the range control. For each of "7 days", "90 days" and "All": `find` "Range" for the group, `read_page` `{ref_id: <the group's ref>, filter: "interactive"}` for its buttons, and `left_click` the button by its ref. ("All" alone also matches other controls on the page.) Re-run the census, and read the KPIs with `get_page_text`. Expected, against Step 16's "Range <label>" line:
- `positions` equals its bar count
- `first` and `last` name its first and last day, or for weekly bars its first and last week's Monday, with the month
- `minHit` recorded; the Pick a day / Pick a week check above passes, with `options` equal to `positions` + 1
- the KPIs match its Votes, Active voters, Average score and Busiest day
- that button is the only pressed one in the Range group

If the "All" line says weekly, hover over one of its bars: the tooltip names a week, not a day. If it says daily, the log spans 90 days or less, so only the unit tests cover the weekly buckets (`bucketFor` in R1-3b, `weeklyStacks` in R1-9); note that for Steps 26 and 29. If the page's bucket differs from Step 16's only at a span of exactly 91 days, read `bucketFor`'s tests before calling it a bug.

Take a screenshot on "All". Then click "30 days" the same way. Expected: the census and the KPIs match the first run again.

- [ ] **Step 19: Check Web analytics**

Navigate to `http://localhost:5180/web` and run:

```js
({
  h1: document.querySelector('h1')?.textContent,
  events: [...document.querySelectorAll('.adm-card-btn')].map((card) => card.innerText.split('\n')[0]),
  selected: document.querySelector('.adm-card-btn[aria-pressed="true"]')?.innerText.split('\n')[0],
});
```

Expected:
- `events` equals Step 16's "Web events by total" labels, in that order
- `selected` is the first of them
- the summary line shows the Tracked events total, and the trend card shows Step 16's "In window" and "Peak day" for that event

Run Step 17's chart census. Expected: the trend's entry has `toggle: true`, `plot: 'slider'` and `positions` equal to Step 16's "N days on the chart", and a screenshot shows no legend on it (one series). If the census lists other entries, they get Step 17's three checks too, and one with `plot: 'bars'` needs a `minHit` of 24 or more, or the equivalent control Step 18 checks.

Then run Step 17's three interaction checks on the trend. They differ in these ways:
- **Hover, with the crosshair.** Hover over the plot near Step 16's peak day, off the line itself. Expected:
  - a vertical hairline snaps to the nearest day, with a marker on the line at that day
  - the tooltip names that day with its month and leads with the count
  - moving the pointer sideways steps the crosshair from day to day
  - on the peak day the tooltip shows Step 16's "Peak day" count

  Take a screenshot with the crosshair showing. Then hover over the page title. Expected: the crosshair and the tooltip both go away.
- **Keyboard.** End gives the chart's last day, from Step 16's "days on the chart" range, and Home gives its first.
- **Table.** `tableRows` equals `positions`, one row per day, idle days included at 0. `lastRow` names the last day.

Click the "Reveal card clicks" card (`find` "Reveal card clicks", then `left_click`). Its breakdowns include "By ink" and "By rarity". Run:

```js
await Promise.all(
  [...document.images]
    .filter((img) => /^data:image\/svg\+xml|\.(svg|webp)(\?|$)/.test(img.src))
    .map((img) => {
      const where = img.src.startsWith('data:') ? 'inlined svg' : new URL(img.src).pathname;
      return img.decode().then(() => `${where} loaded`, () => `${where} BROKEN`);
    }),
);
```

Expected:
- one entry per "By ink" row and one per "By rarity" row, each ending in `loaded`
- every entry is either `inlined svg` or a path starting with `/upstream/inkweave/apps/web/src/assets/`
- no icon on non-ink, non-rarity breakdowns such as "By source"
- ink-prop bars use the ink colours

Some icons show as `inlined svg` instead of a path. Vite's dev server inlines SVGs under 4 KB as data URLs, which covers the app's six ink icons and its Common and Uncommon symbols. Rare, Super Rare, Legendary and the Enchanted `.webp` are served from `/upstream/inkweave/apps/web/src/assets/`.

A path anywhere else, such as `/src/assets/amber.svg`, means a copied handoff icon. Every handoff icon is over 4 KB, so a copy is never inlined. Report it with Step 9's check.

Take a screenshot. If "Card details opened" or "Synergy cards followed" has an ink breakdown in the data, select it and confirm the same.

- [ ] **Step 20: Check Calibration**

Navigate to `http://localhost:5180/calibration` and run:

```js
({
  h1: document.querySelector('h1')?.textContent,
  current: document.querySelector('a[aria-current="page"]')?.getAttribute('href'),
  ruleRows: document.querySelectorAll('tr[role="button"]').length,
  branchNotice: document.body.innerText.includes('Writes to Doberjohn/inkweave'),
});
```

Expected:
- `current: '/calibration'`
- `ruleRows` equal to Step 16's rule count
- `branchNotice: false`, because Calibration writes only from R2
- the verdict and scorecards show Step 16's numbers
- no chart-kit checks here: `/calibration` keeps today's view and its charts until R2 rebuilds them on the kit

Click the row of the first rule under "Rules to review" (`find` its name, then `left_click`). Expected:
- the row gets `aria-pressed="true"`
- the pair heading becomes "<rule> · gap … · N votes"

Click a pair, and its votes table appears. Take a screenshot, then click the rule again. Expected: the heading returns to "All pairs".

- [ ] **Step 21: Check the write pages (branch notice, gate, token box)**

Don't click Publish, Save, Upload, Choose file, Commit or any other control that writes. Navigate to each of `/reveal`, `/image` and `/tuning`, and run:

```js
({
  path: location.pathname,
  current: document.querySelector('a[aria-current="page"]')?.getAttribute('href'),
  branchNotice: document.body.innerText.includes('Writes to Doberjohn/inkweave'),
  codes: [...document.querySelectorAll('code')].map((c) => c.textContent),
  gate: Boolean(document.querySelector('input[aria-label="GitHub token"]')),
  tokenBox: document.body.innerText.includes('GitHub token saved'),
});
```

Expected with no token saved in this browser:
- `current` equals `path`
- `branchNotice: true`
- `codes` includes Step 15's branch (`master`)
- `gate: true` and `tokenBox: false`

If the first run shows `gate: false` and `tokenBox: true`, a token is already saved in this browser, because the Browser pane keeps its storage between sessions. Skip the request to the owner and go straight to the token-box checks below.

Take a screenshot of `/reveal`.

The token box needs a saved token, and only the owner enters one. Never type, paste or set a token, and never read `localStorage` (CLAUDE.md: "The owner sets token values; never type a token"). Ask the owner whether they want to save their GitHub token in the Browser pane's gate at `http://localhost:5180/reveal`. "Save token" checks it against GitHub first. If they reply only "done", ask which part they did.

Token-box checks, once a token is saved:
- Re-run the check on `/reveal`, `/image` and `/tuning`. Expected: `gate: false`, `tokenBox: true` and `branchNotice: true`.
- On `/` and `/activity`, `tokenBox` is `false`.
- Take a screenshot of `/tuning` with the token box.

Only if the owner agrees:
1. Click the sidebar's "Forget token" on `/tuning`.
2. Expect the gate to replace the page body and the token box to disappear, while both stay mounted (shared state).
3. Click the sidebar's link to `/reveal`. Expect the gate there too (the cleared token holds on every page).
4. The owner saves the token again if they want it.

If the owner declines to save a token, record that the token box was covered by its unit tests only.

- [ ] **Step 22: Check the sidebar's current item and its persisted collapse**

On `http://localhost:5180/activity`, measure the sidebar with this script. Use it again for each re-check below:

```js
const link = document.querySelector('a[href="/activity"][aria-current="page"]');
let sidebar = link;
while (sidebar?.parentElement && sidebar.parentElement !== document.body && sidebar.parentElement.getBoundingClientRect().width < document.documentElement.clientWidth - 1) {
  sidebar = sidebar.parentElement;
}
Math.round(sidebar?.getBoundingClientRect().width ?? -1);
```

Expected: `240` (`ADMIN_LAYOUT.sidebarOpen`). `-1` means the current item lacks `aria-current="page"`, which is a bug.

If the first measurement is `64`, the sidebar was collapsed in an earlier session, because the Browser pane keeps its storage. Expand the sidebar first and note it: click the toggle as in item 4, wait, and re-measure `240`.

The sidebar animates its width (`transition: width .2s`). After every click or reload below, run `mcp__Claude_Browser__computer` `{action: "wait", duration: 1}` before re-running the measurement.

1. `find` "Collapse" and `left_click` it. Wait, then re-run: expect `64` (`ADMIN_LAYOUT.sidebarCollapsed`).
2. `find` "Vote activity". It still finds the link, so collapsed items keep their accessible names. Take a screenshot.
3. Navigate to `http://localhost:5180/activity` again, which is a full reload. Wait, then re-run: expect `64`.
4. `find` "Expand", which is the toggle's collapsed name, and click it. If the name differs, click the toggle from the screenshot. Wait, then re-run: expect `240`.
5. Reload once more, then wait and re-run: expect `240`.

Leave the sidebar as it was found: if it was collapsed at the start, collapse it again.

- [ ] **Step 23: Check the redirect, the not-found page and the once-per-session fetch**

1. Navigate to `http://localhost:5180/analytics`, then run `({path: location.pathname, h1: document.querySelector('h1')?.textContent})`. Expected: `{path: '/', h1: 'Overview'}`.
2. Navigate to `http://localhost:5180/banner/2983` and run the same check. Expected: `h1: 'Not found'`, inside the shell.
3. Run `mcp__Claude_Browser__tabs_create` and navigate the new tab to `http://localhost:5180/`.
4. In that tab, click the sidebar items in this order: Vote activity, Web analytics, Calibration, Overview. For each, `find` the label with the tab's `tabId`, then `left_click`. These are client-side navigations, so don't use `navigate`, which reloads.
5. Run `mcp__Claude_Browser__read_network_requests` with `{tabId, urlPattern: "/admin-data/"}`. Expected: exactly three requests, one each for `vote-analytics.json`, `vote-log.json` and `vercel-analytics.json`. This holds even under `StrictMode`'s double effects, which shows that `fetchAdminData`'s cache works.
6. Close the tab (`tabs_close`).

- [ ] **Step 24: Check the console and server log, then stop the server**

Run `mcp__Claude_Browser__read_console_messages` with `{onlyErrors: true}`. Expected: no entries. Run `mcp__Claude_Browser__preview_logs` with `{level: "error"}`. Expected: no lines.

Then stop the server (`preview_list`, then `preview_stop`).

The owner now has screenshots of:
- the Overview, plus its weekly chart's tooltip and its Table view
- Vote activity with a day selected, and on the "All" range
- the Web trend's crosshair, and Web analytics with "Reveal card clicks"
- Calibration with a rule selected
- `/reveal` with the branch notice, plus the gate if no token was saved at the start
- `/tuning` with the token box, if a token was saved
- the collapsed sidebar

The screenshots show real counts, so don't save them in the repo or attach them to the PR. If any check in Steps 17 to 24 failed, stop and report it to the owner with its screenshot. Fix it in the owning task's files as its own commit (`fix(<area>): <what> (#24)`, approved like any other), and repeat the failed step before going on.

- [ ] **Step 25: Confirm the analytics files stay out of git**

```bash
cd /d/johnn/Projects/inkweave-admin
git status --short -- public/
git status --short --ignored -- public/admin-data/
git log --oneline main..HEAD -- public/admin-data/
```

Expected:
- the first command prints nothing
- the second prints `!! public/admin-data/`
- the third prints nothing, because no R1 commit ever touched the folder

The files are git-ignored, so leave them in place unless the owner wants them gone. Never `git add -f` them.

- [ ] **Step 26: Record R1 as built**

In `docs/plans/R-redesign.md`, the **Tracking:** line already names Doberjohn/inkweave-admin#24 (set while planning). Insert this paragraph after it, with `<date>` from `date +%F`:

```markdown
**Status:** R1 built and checked against real data on <date>; see "R1 as built". R2 to R4 are outlined below and detailed when each starts.
```

At the end of `## Phase R1`, insert the following after its last task and before the `---` that precedes `## Phase R2`:

```markdown
### R1 as built (<date>)

- **Checked with real data** (Task R1-12): the Overview matches the old `/analytics` numbers, every chart shows its tooltip on hover and from the keyboard and switches to a table of its values, Vote activity draws 30 days with month labels and redraws for 7 and 90 days and All (weekly bars past 90 days), with day selection, Web analytics shows the events by total with ink and rarity icons and a crosshair on the trend, Calibration renders, the write pages show the branch notice and token box, the sidebar's state survives a reload, `/analytics` lands on the Overview, and each analytics file is fetched once per session.
- **Departures from the task text:** none.
```

Adjust the first bullet in three cases:
- If Step 17 couldn't compare with the deployed page (a login page, or a different data date), write "the Overview matches the numbers computed from the data files" instead of "the Overview matches the old `/analytics` numbers".
- If the token box was checked only by unit tests (Step 21), say so in that bullet.
- If Step 18's "All" stayed daily (the log spans 90 days or less), write "and All (weekly bars covered by unit tests only)" instead of "and All (weekly bars past 90 days)".

If the owner approved departures while R1 was built, replace "none." with one sub-bullet each, in this form: `**Task R1-N, Step k:** what changed and why (approved <date>).`

Commit, running it with the Bash tool only after the owner approves:

```bash
git add docs/plans/R-redesign.md
USER_APPROVED=1 git commit -m "docs(plan): record R1 as built (#24)"
```

- [ ] **Step 27: Run the final gate**

Check that no preview server is running (`mcp__Claude_Browser__preview_list` is empty), then run:

```bash
cd /d/johnn/Projects/inkweave-admin
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
pnpm check:deps
```

Expected:
- `lint` exits 0 with no problems
- `typecheck` exits 0
- `test:run` ends with every test file and test passed and none failed
- `build` ends with Vite's `✓ built in …`
- `check:deps` prints `Dependency parity with the app: OK`

CI also runs `pnpm check:hooks`. R1 doesn't touch `.claude/hooks`, so it isn't run here.

- [ ] **Step 28: Check Code Health before the push**

Load `mcp__codescene__analyze_change_set` with ToolSearch (`select:mcp__codescene__analyze_change_set`), and run it for `D:\johnn\Projects\inkweave-admin` against `main`. Expected: no changed file's Code Health declines. A decline fails the PR's CodeScene check, so fix it in the owning task's files or raise it with the owner before asking to push.

Optionally, offer the owner an app-repo issue. The app's `CLAUDE.md` (admin section, line 225) still lists the banner generator among admin's tools, and its list of bridged modules no longer matches `src/app-bridge.ts`. List what admin bridges now with:

```bash
grep -oE "upstream/inkweave/apps/web/[^']+" src/app-bridge.ts | sed 's#upstream/inkweave/apps/web/##' | sort -u
```

Open that issue only if the owner says yes.

- [ ] **Step 29: Push and open the R1 PR (owner approval)**

Show the owner the branch, `git log --oneline main..HEAD`, the push command, and the PR title and body below, and ask for approval. Before showing them, adjust the body:
- If "R1 as built" lists departures, add a `## Departures from the plan` section that restates them.
- If Step 17 couldn't compare with the deployed page, replace the bullet "the Overview's numbers match the old `/analytics` page" with "the Overview's numbers match the numbers computed from the data files".
- If Step 7 dropped the re-exports, add this bullet after **Docs**: "- **Bridge:** drops `CAP_LABEL`, `SURFACE_CARD` and `TabList`, which nothing uses after R1."
- If Step 18's "All" stayed daily, replace "(weekly bars past 90 days)" in the Verification bullet with "(the weekly bars are covered by unit tests only: the log spans 90 days or less)".
- If the token box was checked only by unit tests (Step 21), replace "the write pages show the branch notice and token box" with "the write pages show the branch notice; the token box is covered by unit tests only".

Keep vote, voter and event counts, and the screenshots, out of the body. After a clear yes, run with the Bash tool:

```bash
cd /d/johnn/Projects/inkweave-admin
USER_APPROVED=1 git push -u origin feature/24-admin-redesign
```

Expected: the pre-push hook runs `pnpm check:deps` and `pnpm typecheck`, then git reports the branch pushed. That is `* [new branch]`, or an update line if earlier R1 pushes created the branch.

```bash
gh pr create --repo Doberjohn/inkweave-admin --base main --head feature/24-admin-redesign \
  --title "feat(shell): admin redesign R1, sidebar shell and insights pages (#24)" \
  --body-file - <<'EOF'
## Summary

R1 of the admin redesign ([plan](https://github.com/Doberjohn/inkweave-admin/blob/feature/24-admin-redesign/docs/plans/R-redesign.md)): one dashboard with a collapsible sidebar and a darker, neutral theme. Every existing tool keeps working.

- **Banner generator removed:** its route, `src/tools/banner/`, the exporter and its test, `docs/BANNER.md`, the `pnpm banner` script and admin's only design-token exception. Admin now passes the app's design-token rules with no exception.
- **Theme:** `src/theme/adminTheme.ts` composes the palette from the app's tokens (`COLORS` and `hexRgba`: the neutral ladder is `COLORS.gray400` at small alphas over the page) and maps the handoff's type and radius onto the app's scales. `AdminStyles` is the one scoped stylesheet for hover, focus and selected states, and Storybook mounts it for every story. No app change and no pin bump.
- **Primitives:** `src/ui/` (`Panel`, `KpiCard`, `SegmentedControl`, `MeterBar`, `BiasBar`, `ScorePill`, `RawTag`, `Notice`, `Sparkline`) and shared formatting with true minus signs.
- **Chart kit:** `src/charts/`, hand-built SVG on the admin theme with no chart library, following the `dataviz` guidance: scales, a range control, legends, one styled tooltip that the keyboard reaches too, `ChartFrame` with a Chart | Table toggle on every chart, and bar and line/area charts (a crosshair on lines). Transitions respect reduced motion (R1-3b's tests). The Overview, Vote activity and Web analytics charts are built on it; `/calibration` keeps today's `WeeklyActivityChart` until R2.
- **Shell:** a sidebar (Overview, Insights, Publish), whose collapse is remembered per browser, and `PageLayout`. Only pages that write show the branch notice. The GitHub token is one shared store, so the sidebar's token box and "Forget token" act on every write page.
- **Write tools:** `/reveal`, `/image` and `/tuning` render inside `PageLayout` with the branch notice; their own Forget token buttons are gone (the sidebar's token box replaces them), and `GithubTokenGate` loses its `title` prop.
- **Insights:**
  - **Overview** at `/`: KPIs, engine calibration, up to the last 12 weeks (as many as fit), rules to review (at least 10 score votes), latest votes and web events.
  - **Vote activity** at `/activity`: filters led by a range control (7, 30 or 90 days, or All; 30 by default, weekly bars past 90 days) that scopes the KPIs, chart, log and side panels, a stacked chart with month labels and day selection, the vote log, and top voters and pairs. Quick votes without a score form their own band.
  - **Web analytics** at `/web`: events by total, the trend with a crosshair, and breakdowns with the app's ink and rarity icons.
  - `/calibration` hosts today's calibration view until R2. The analytics files are fetched once per session.
- **Routes:** `/analytics` redirects to `/`. `/reveal`, `/image` and `/tuning` are unchanged; R2 and R4 move them, with redirects.
- **Docs:** CLAUDE.md (routes, sidebar, the branch notice on write pages, the theme file, the chart kit, the shared token), `docs/PLAN.md` (status and D10) and `.env.example`.

## Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm test:run`, `pnpm build` and `pnpm check:deps` pass.
- Storybook: a one-off `storybook build` succeeds, and every story renders without an error. The repo has no Storybook build script, and CI doesn't build Storybook.
- Real data: checked locally against the deployment's analytics files (saved locally, git-ignored, not committed):
  - the Overview's numbers match the old `/analytics` page
  - every chart shows its tooltip on hover and from the keyboard, and its Table view lists its values (the Overview's holds the whole 12-week window)
  - Vote activity draws 30 days with month labels and redraws for 7 and 90 days and All (weekly bars past 90 days), and selecting a day filters the log
  - Web analytics lists the events by total with ink and rarity icons, and the trend's crosshair snaps to the nearest day
  - Calibration renders
  - the write pages show the branch notice and token box
  - the sidebar's collapsed state survives a reload
  - `/analytics` lands on the Overview
  - each analytics file is fetched once per session

Part of #24 (R1 of R4).
EOF
gh pr view --repo Doberjohn/inkweave-admin feature/24-admin-redesign --json url,closingIssuesReferences
```

Expected:
- `gh pr create` prints the PR URL.
- `gh pr view` shows that URL and `"closingIssuesReferences": []`. The issue stays open, because R2 to R4 follow.

Give the owner the URL. cubic reviews the PR. Check each of its findings with a fresh subagent, and go through them with the owner before replying on a thread.

- [ ] **Step 30: After the merge (owner)**

The push to `main` runs Deploy. The owner opens `https://inkweave-admin.vercel.app/` while signed in, and checks:
- the Overview with the nightly data
- `/analytics` landing on `/`
- the write pages naming `master`

Run `gh issue view 24 --repo Doberjohn/inkweave-admin --json state`. Expected: `OPEN`, since the issue tracks R1 to R4. Delete the merged branch only if R2 starts on a new one.

<!-- Note 3 applied with one change: Vite 8.3.1's dev server inlines SVGs under 4096 bytes as data URLs (node_modules/vite/dist/node/chunks/node.js, fileToDevUrl/shouldInline, DEFAULT_ASSETS_INLINE_LIMIT). The app's six ink SVGs and common/uncommon are 577-2569 bytes, so the suggested `.svg` filter would skip them and pass vacuously. The script therefore also lists data:image/svg+xml images. Every handoff icon is 7-60 KB, so a copied one is never inlined and still shows a non-upstream path. Also added public/art/banner/ to Step 1: it is git-tracked, used only by SynergyBanner.tsx:33-39, and listed for removal in handoff README:22. No note rejected. -->

<!-- Review round 2026-10-01 (17 notes): all applied, none rejected. Verified against R1-08 (WeeklyCard passes weekTable(recent) with recent = recentWeeks(weekly, WEEKS_SHOWN) and charts recent.slice(-weeksThatFit(width))), R1-09 (BAND_LABELS puts a "No score" button in the band filter), R1-10 (Sparkline on the event cards), src/tools/analytics/CalibrationView.tsx (imports Scorecard and WeeklyActivityChart), the main plan's Chart kit contract (RangeControl props {value, onChange}; ChartLegend only for 2+ series), the dataviz interaction reference (24px hit target, "Date range first") and package.json in admin and the app (no chart library). Choices: note 14 took the PR-body option ("(R1-3b's tests)"), because the Browser pane cannot emulate prefers-reduced-motion and R1-3b may honour it through matchMedia rather than a CSS rule, which a stylesheet scan would miss. Note 3's Hover check now hovers the newest bar, as Step 17 does, since nothing is selected yet. Step 29's Table bullet says "the whole 12-week window" rather than "all 12 weeks", because recentWeeks never starts before the first week. Step 13's id script is self-contained rather than reusing the previous script's `entries`. -->
