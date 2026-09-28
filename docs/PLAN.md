# Admin repo split: design

## Issue map

| Phase | Issue |
|---|---|
| P0 | Doberjohn/inkweave#591 |
| P1 | Doberjohn/inkweave-admin#1 |
| P2 | Doberjohn/inkweave-admin#2 |
| P3 | Doberjohn/inkweave-admin#3 |
| P4 | Doberjohn/inkweave#593 |
| P5 | Doberjohn/inkweave-admin#4 |
| P6 | Doberjohn/inkweave#594 |

- **Date:** 2026-09-25
- **Status:** design approved by the owner (2026-09-25 review)
- **Repos:** app `Doberjohn/inkweave` (private); admin `Doberjohn/inkweave-admin` (private, empty at time of writing, default branch will be `main`, SSH remote `git@github-personal:Doberjohn/inkweave-admin.git`)
- **Next:** implementation plan at `docs/superpowers/plans/2026-09-25-admin-repo-split.md`, then issues, then P0. Each phase gets a detailed plan when it starts; the first plan details P0 and P1 and outlines the rest.

## 1. Goal

Move every admin page and all administration work out of the app repo into the private admin repo, so the app repo holds only the product and the public site serves nothing admin.

### Drivers (owner's answer)

1. **Nothing admin on the public site.** No admin code, admin data or admin credential is served from `inkweave.ink`.
2. **Tidiness.** The app repo contains the product only.

### Not drivers, so out of scope

- The app repo stays private and its git history is not rewritten.
- The tools keep their behavior: the three writing tools still commit straight to the app's `master`.
- Branch protection, deploy-after-CI and the `votes` table lockdown are separate work (section 9).

## 2. Current state (verified 2026-09-25 at `origin/master` `e8bbdeee`)

### 2.1 Inventory

| Area | Contents | Size |
|---|---|---|
| Admin UI | `apps/web/src/features/{admin-analytics,image-admin,reveal-admin,tuning-admin}/`; `apps/web/src/pages/{RevealAdminPage,ImageAdminPage,TuningAdminPage,AdminAnalyticsPage}.tsx` plus the page story; admin-only shared modules `shared/lib/githubCommit.ts` (+ test), `shared/hooks/useGithubToken.ts`, `shared/components/GithubTokenGate.tsx` (+ story), `shared/components/ImageUploadTile.tsx` (+ story) | 97 files, ~5.8k LOC, ~59 unit tests, 25 stories |
| Analytics pipelines | `scripts/precompute-vote-analytics.mjs`, `scripts/precompute-vercel-analytics.mjs`, `scripts/lib/{voteAnalytics,vercelAnalytics}.mjs` + tests; steps 5 and 6 of the public `build:vercel` | 6 files, ~1.2k LOC |
| Reveal ingestion | `scripts/reveal-sync/**` (including `state.json`), `.claude/skills/fetch-reveals/`, `docs/PREVIEW_CARD_PARSER.md`, the ops sections of `docs/reveals/START_REVEAL_SEASON.md` | 26 tracked files, ~5.1k LOC |
| Banner generator | `scripts/export-banner.mjs`, `scripts/BANNER.md`, `apps/web/src/pages/BannerPage.tsx` (DEV-only route), `apps/web/src/features/synergies/components/SynergyBanner.tsx`, `apps/web/public/art/banner/{card-back,poca-pop-out,qr}.png` (~2 MB, shipped to production today) | 7 files |
| E2E | `apps/web/e2e/tests/admin-analytics.spec.ts` (1 test) | 1 file |

### 2.2 Exposures (verified live)

- `https://inkweave.ink/data/vote-log.json` (566 KB) serves 2,547 raw votes, each with a timestamp and a stable per-voter id. `vote-analytics.json` (157 KB) and `vercel-analytics.json` (29 KB, 10 events, including users' top search strings per the code) are public too. `VITE_SHOW_ADMIN_ANALYTICS` hides the page, not the files.
- The GitHub PAT used by the three writing tools is stored in `localStorage['inkweave.reveal-admin.gh-token']` on `inkweave.ink`, under a CSP with `script-src 'unsafe-inline'` and `connect-src https://api.github.com` (the latter added only for admin, `vercel.json:103`). `master` is unprotected (branch protection API 404, 0 rulesets) and `deploy.yml` deploys every push without waiting for CI, so the token is effectively a production deploy key.
- The service worker precaches every `*.js` file (`apps/web/vite.config.ts:166`), so every visitor downloads the admin chunks. The engine's rule code probably sits in a chunk preloaded on every page only because reveal-admin imports `synergyEngine` (confirm with `pnpm analyze` during P4).

### 2.3 Coupling

- **Admin reads from the app:** design tokens (`shared/constants`), `CtaButton`, `TabList`, `useContainerWidth`, `CardDataContext` and the card loader, `CardTile`, `smallImageUrl`, card types, and the engine (`synergyEngine` and `transformCard` run live in reveal-admin; tuning-admin reads `TUNING`).
- **The app reads from admin:** only `apps/web/src/router.tsx`, with one exception: `scripts/reveal-sync/web.mjs` loads reveal-admin's `validateForm`, `buildPreviewCard` and `insertCardIntoPreviewJson`, and `scripts/reveal-sync/write-chain.test.mjs` imports them in CI. They move together.
- **Admin writes into the app repo:** reveal (`previewCards.json` plus a raw scan), image (a raw scan) and tuning (`packages/synergy-engine/src/data/tuning.json`) commit to `master` through the Git Data API; reveal-sync writes into a local working tree.
- **Constraints:** the engine (`inkweave-synergy-engine` 0.1.0) was never published (npm 404) and its `dist/` is gitignored. `inkweave.ink` sends no CORS headers. `allCards.json` (1.56 MB) exceeds the GitHub Contents API's JSON limit; the raw media type allows up to 100 MB.

## 3. Decisions

| # | Decision | Choice | Why |
|---|---|---|---|
| D1 | Boundary | Separate private repo | Tidiness driver: the app repo holds only the product, which rules out an `apps/admin` workspace in the app repo |
| D2 | Scope | **Move:** the 4 admin tools, both analytics pipelines, reveal ingestion, the banner generator. **Stay:** rule miner, set graduation, IndexNow ping, `scripts/convert-preview-images.mjs`, `.github/workflows/convert-reveal-images.yml`, the two preview hooks. **Delete:** `scripts/download-preview-images.mjs` (nothing calls it) | Owner's scope answer. What stays is engine development, app-data upkeep or part of the app deploy |
| D3 | Code sharing | The app repo as a git submodule at `upstream/inkweave`, pinned to a commit. Admin imports app code only through `src/app-bridge.ts` | No publishing, one source of truth, and breakage only happens at pin bumps, in admin CI |
| D4 | Hosting | New Vercel project `inkweave-admin`, no custom domain, Deployment Protection set to **All Deployments**. Built in GitHub Actions and shipped with `vercel deploy --prebuilt` | All Deployments sends every URL to Vercel login (302 to `vercel.com/sso-api`), production domains included, so admin needs no auth code. The original choice, Standard Protection, leaves production domains public: after the first deploy, `inkweave-admin.vercel.app` served admin to anonymous visitors (#7). Actions also carries the analytics secrets and schedule |
| D5 | Reading app data | Vercel rewrites (and a Vite dev proxy) forward the app's static paths to `https://inkweave.ink`: `/data/*`, `/card-images/*`, `/card-images-preview/*` and `/fonts/*` to start, with more added as ported tools need them. The single list is `forwarded-paths.json`. Reads that must match `master` go through the GitHub API | The browser sees one origin, so the app's loader, images and `@font-face` rules run unchanged, and the app needs no CORS change |
| D6 | Writing app data | Unchanged Git Data API commits to the app's `master`; the target branch becomes a setting | Keeps tool behavior; allows rehearsals on a throwaway branch |
| D7 | Reveal ingestion output | A PR in the app repo, created through the GitHub API with the owner's `gh` login | App CI and preview deploys still check each batch, and admin sessions never touch the app's working tree |
| D8 | Analytics | A nightly and manual admin workflow step. Engine and synergy data come from a fresh checkout of the app's `master`. JSON is baked into the admin deployment under `/admin-data/` | Calibration compares votes with the scores production serves, and nothing is public |
| D9 | Stopgap | Remove the two analytics steps from the app's `build:vercel` now | Owner chose to stop the exposure before the split lands |
| D10 | URLs | Admin paths `/reveal`, `/image`, `/tuning`, `/analytics`, `/banner/:cardId`, with a tool index at `/`. Old `inkweave.ink/admin/*` and `/reveal-admin` URLs fall through to the app's NotFound page, like any unknown route | The whole site is admin. A redirect would advertise the admin URL on the public site |
| D11 | Tracking | Each issue lives in the repo whose code it changes; app-repo milestone "Admin repo split"; the source of truth becomes `docs/PLAN.md` in the admin repo at P1 | `Closes #N` works per repo |

## 4. Target architecture

### 4.1 Admin repo layout

```
inkweave-admin/
├── upstream/inkweave/        git submodule (relative URL ../inkweave.git), pinned
├── src/
│   ├── app-bridge.ts         the only module that imports from upstream/
│   ├── shell/                admin layout and tool nav (no public nav, no Vercel Analytics)
│   └── tools/                reveal, image, tuning, analytics, banner
├── scripts/                  reveal-sync, analytics precomputes, export-banner, plus repo checks
│                             (check-shared-deps, assert-login-gate, vercel-project-urls, check-hooks)
├── .claude/                  CLAUDE.md, fetch-reveals skill, hooks: git-write-protection,
│                             branch-verification, upstream-readonly
├── .github/
│   ├── workflows/            ci.yml, deploy.yml
│   └── dependabot.yml        weekly gitsubmodule bumps only (npm versions follow the app via parity)
├── docs/PLAN.md              this spec and the implementation plan
├── forwarded-paths.json      the app paths forwarded to inkweave.ink (proxy + rewrites)
└── vercel.json               rewrites to inkweave.ink, site-wide noindex, Git-triggered deploys off
```

The relative submodule URL `../inkweave.git` resolves against the admin remote: to `git@github-personal:Doberjohn/inkweave.git` locally and to `https://github.com/Doberjohn/inkweave.git` in Actions, so neither side hardcodes the other's host.

### 4.2 The bridge

- `src/app-bridge.ts` re-exports exactly what admin uses from `upstream/inkweave/apps/web/src/**` and from the engine. An ESLint `no-restricted-imports` rule rejects `upstream/**` imports everywhere else.
- The engine is a pnpm workspace package in admin (`upstream/inkweave/packages/synergy-engine`), built with its own tsup config before admin builds.
- Bridged app files compile under admin's toolchain. So admin:
  - mirrors the app's Vite 8, `@vitejs/plugin-react` and `@rolldown/plugin-babel` React Compiler setup, and its TypeScript options;
  - declares the app's **full** runtime dependency set, at the app's exact specifiers. The app's index files already reach all of its runtime packages from `CtaButton` alone (197 modules), so a partial list would break on the next import change. `scripts/check-shared-deps.mjs` enforces this in CI and on pre-push, and `--fix` aligns after a pin bump.
- The web app uses plain relative imports with no path aliases. That is what lets the bridge work without replicating alias config.
- Admin lint reuses the app's design-token ESLint rules from `upstream/inkweave/apps/web/eslint-rules/`. The admin files' entries in the app's `known-offenders.js` move into an admin-side ledger.
- `TabList` stays in the app's design system even though admin is its only runtime consumer. Admin imports it through the bridge.

### 4.3 Hosting and access

- **Project:** `inkweave-admin` on the owner's Vercel account, with All Deployments protection and no custom domain. Only a logged-in owner can open any of its URLs. Standard Protection isn't enough, because it leaves production domains public, `inkweave-admin.vercel.app` included.
- **`deploy.yml`:**
  - Runs on push to `main`, nightly (the analytics refresh) and by manual dispatch.
  - Checks out with submodules, using a token that can read the app repo.
  - Builds, then runs `vercel build --prod` and `vercel deploy --prebuilt --prod`.
  - Refuses to deploy unless the project uses All Deployments (`scripts/vercel-project-urls.mjs`).
  - Ends by asserting that the new deployment, the production URL and every domain the Vercel API lists for the project redirect anonymous requests to Vercel login (`scripts/assert-login-gate.mjs`), and fails the run otherwise.
- **The GitHub PAT** is entered only on the admin origin. Browser storage is per-origin, so nothing carries over from `inkweave.ink`.
- **`vercel.json`** sets `X-Robots-Tag: noindex` site-wide.

### 4.4 Data flow

- **Reads of public app data.**
  - The paths in `forwarded-paths.json` are rewritten to `https://inkweave.ink`: `/data/*`, `/card-images/*`, `/card-images-preview/*` and `/fonts/*` to start. Vite's dev server proxies the same list, and a test holds `vercel.json` to it.
  - The bridged loader, `smallImageUrl` and `CardTile` work unchanged.
- **Reads that must match `master`.**
  - `previewCards.json` before a reveal write, and `tuning.json` for the tuning tool.
  - Both go through the GitHub API with the raw media type. The tuning tool shows live values, not the copy bundled at build time.
- **Writes by the tools.**
  - Unchanged commits through the Git Data API (`commitFiles`) to the configured target branch, default `master`.
  - The contract with `convert-reveal-images.yml` is unchanged: raw scans land in `apps/web/public/card-images-raw/`, and the app converts them.
- **Reveal ingestion.**
  - reveal-sync keeps discovery, blind reads and gates.
  - Its write phase converts scans to AVIF using the app's `scripts/convert-preview-images.mjs` from the submodule.
  - It then creates a branch in the app repo, commits `previewCards.json` and the AVIFs through the Git Data API, and opens a PR, all with the owner's `gh` login.
  - `state.json` lives in the admin repo.
  - The app-checkout preconditions in `run.mjs start` (clean checkout, feature branch) are replaced by a check that `previewCards.json` on the app's `master` has not moved since the run started.
- **Analytics.**
  - The admin deploy job's analytics step checks out the app's current `master`, separately from the pinned submodule.
  - It builds the engine, runs `precompute-synergies`, then both analytics precomputes, writing into the admin build's `/admin-data/`.
  - Admin's own artifacts never live under `/data/`, so they cannot collide with the forwarded app data.
- **Banners.** The banner route renders inside admin, and `export-banner.mjs` screenshots it from the admin dev server.

### 4.5 Secrets and config after the split

| Secret or variable | Lives in | Notes |
|---|---|---|
| GitHub PAT (fine-grained, Contents read/write on `Doberjohn/inkweave`, with an expiry date) | Owner's browser, admin origin only | Replaces the current token in P5 |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (the admin project) | Admin repo Actions secrets | For deploying admin |
| App-repo read token (submodule and analytics checkout) | Admin repo Actions secret | Read-only on `Doberjohn/inkweave` |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Admin repo Actions secrets | Vote analytics |
| `VERCEL_ANALYTICS_TOKEN`, `ANALYTICS_VERCEL_PROJECT_ID` (the app project the query targets) | Admin repo Actions secrets | The script's current `VERCEL_PROJECT_ID` is renamed to `ANALYTICS_VERCEL_PROJECT_ID`, because in the admin workflow it would collide with the Vercel CLI's variable for the admin project |
| `VITE_SHOW_ADMIN_ANALYTICS` | Deleted | The admin site needs no flag |

In P5, whichever of these are set get removed from the app's Vercel env: `SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_ANALYTICS_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_ANALYTICS_WINDOW_DAYS`, `VITE_SHOW_ADMIN_ANALYTICS`.

### 4.6 Local development

- **Clone** to `D:\johnn\Projects\inkweave-admin` with `--recurse-submodules`. Claude sessions for admin work launch there, so hooks resolve against the admin repo.
- **Dev server on port 5180,** outside the app's 5173 to 5175 range. That way neither repo's Playwright nor the banner export can attach to the other repo's server.
- **Admin `CLAUDE.md`** carries the environment facts that the app's session memory holds today:
  - Windows with PowerShell 5.1 only;
  - the `github-personal` SSH alias;
  - never install the Vercel CLI locally;
  - commit and push only with explicit approval;
  - never add a custom domain to the admin Vercel project;
  - keep its Deployment Protection on All Deployments.

## 5. Phases

| Phase | Repo | Work | Done when |
|---|---|---|---|
| P0 Stopgap | app | Remove `precompute-vote-analytics` and `precompute-vercel-analytics` from `build:vercel`. The scripts themselves stay until P4 | After the deploy, `/data/vote-log.json`, `/data/vote-analytics.json` and `/data/vercel-analytics.json` return 404 on `inkweave.ink` |
| P1 Scaffold | admin | Vite 8, React 19, TypeScript, pnpm 9, Node 24. ESLint (the app's design-token rules via the submodule, plus the bridge rule), Vitest, Husky. Submodule and bridge; engine workspace package; a tool index that renders a bridged component; CI; Vercel project; deploy workflow; Dependabot; `CLAUDE.md`; `docs/PLAN.md` (this spec and the plan) | CI is green. An unauthenticated request to the production URL gets a 302 to `vercel.com/sso-api`. The owner opens it while logged in |
| P2 Tools | admin | Port the reveal, image, tuning and analytics UIs and the banner generator with their tests and stories. Also: the 4 admin-only shared modules, the admin shell, rewrites and dev proxy, the configurable target branch, and the live tuning read | Tests are green. The owner opens each tool on the deployed admin. Reveal, image and tuning writes land on a throwaway app branch, which is then deleted |
| P3 Pipelines | admin | Analytics step in the deploy workflow (nightly and manual), its secrets, and the variable rename. reveal-sync and `fetch-reveals` with PR output. An admin reveal runbook (the ops half of `START_REVEAL_SEASON.md`) | The analytics tool shows real data behind the login. A rehearsal `fetch-reveals` run opens a correct PR in the app repo |
| P4 Cutover | app | Delete what moved (6.1) and edit what's left (6.2) | The checks in 6.3 pass in production |
| P5 Security | both | New PAT with an expiry date on the admin origin; revoke the old one in GitHub settings; clear the old `inkweave.reveal-admin.gh-token` entry on `inkweave.ink` in each of the owner's browsers (DevTools, Application, Local Storage); remove the admin variables from the app's Vercel env | The old token is revoked, and the app's Vercel env has no admin variables |
| P6 Reconcile | app (`deck-builder`) | When `deck-builder` next merges `master`, keep the deletions in the edit/delete conflicts: 6 admin-analytics components, `AdminAnalyticsPage.tsx`, `admin-analytics.spec.ts`, `router.tsx`. Carry any still-useful edits into admin. Update `docs/deck-builder/PLAN.md`, #453 and #456 so `/admin/deck-lab` and advisor-copy tuning live in the admin repo | `deck-builder` builds with no admin code, and the plan and epics point at the admin repo |

**Order:**
- P0 comes first and stands alone.
- Then P1, P2, P3, P4, P5, in sequence.
- P6 follows P4 on the epic's schedule. While the epic is unmerged, deck-lab work in admin can pin the submodule to a `deck-builder` commit.

## 6. App cutover (P4) detail

### 6.1 Delete

- `apps/web/src/features/{admin-analytics,image-admin,reveal-admin,tuning-admin}/`
- `apps/web/src/pages/{RevealAdminPage,ImageAdminPage,TuningAdminPage,AdminAnalyticsPage,BannerPage}.tsx`, `apps/web/src/pages/AdminAnalyticsPage.stories.tsx`
- `apps/web/src/shared/lib/githubCommit.ts` and its test, `shared/hooks/useGithubToken.ts`, `shared/components/GithubTokenGate.tsx` and its story, `shared/components/ImageUploadTile.tsx` and its story
- `apps/web/src/features/synergies/components/SynergyBanner.tsx`, `apps/web/public/art/banner/`
- `apps/web/e2e/tests/admin-analytics.spec.ts`
- `scripts/precompute-vote-analytics.mjs`, `scripts/precompute-vercel-analytics.mjs`, `scripts/lib/` (only the two analytics libraries and their tests live there on `master`), `scripts/reveal-sync/`, `scripts/export-banner.mjs`, `scripts/BANNER.md`, `scripts/download-preview-images.mjs`
- `.claude/skills/fetch-reveals/`, `docs/PREVIEW_CARD_PARSER.md`

### 6.2 Edit

- **`apps/web/src/router.tsx`:**
  - the `AdminGate` import (l.5);
  - the lazy admin pages (l.54-63);
  - the banner DEV route (l.68-73 and l.304-315);
  - the admin routes and the `/reveal-admin` redirect (l.233-271).
- **`package.json`:**
  - drop the analytics steps (already gone after P0);
  - drop the `precompute-vote-analytics`, `precompute-vercel-analytics` and `banner` scripts;
  - in the size-limit config (l.40-72), remove the four admin chunks from both entries. The second budget keeps only `RevealsPage` and is renamed "Flag-gated JS".
- **`vercel.json`:**
  - the `/reveal-admin` redirect (l.9);
  - the cache rules for the vote files (l.47-64);
  - the `/admin/(.*)` noindex (l.65-73);
  - `https://api.github.com` in CSP `connect-src` (l.103).
- **Env and config:** `apps/web/.env.example` (l.26-43), `apps/web/src/vite-env.d.ts` (l.12), `apps/web/playwright.config.ts` (l.52-55).
- **Gate lists:**
  - `apps/web/scripts/check-story-coverage.mjs`: header l.3-4, exclusions l.28 and l.30, known-missing l.49;
  - `apps/web/eslint-rules/known-offenders.js`: the admin and banner entries (the ledger only shrinks).
- **Ignore files and test docs:** `.gitignore` (l.60-61 and l.64); `apps/web/e2e/E2E_TESTS.md` (l.255-261 and the header count).
- **`scripts/graduate-canonical-set.mjs`:** the two reveal-admin story paths (l.65-66).
- **Docs:**
  - `CLAUDE.md`: the fetch-reveals skill row, and the "admin panes" and admin route mentions;
  - `docs/reveals/START_REVEAL_SEASON.md`: keep the app-side season switch and point to the admin runbook;
  - `docs/CARD_DATA_PIPELINE.md`;
  - `packages/synergy-engine/SHIFT_TARGET_RULE.md` (l.229 and l.331);
  - the mentions of admin internals in `docs/legal-pages/` research.

### 6.3 Verification

- `/data/vote-*.json` and `/data/vercel-analytics.json` return 404.
- The build output and the service worker precache contain no admin chunk.
- `/admin/*` and `/reveal-admin` render the NotFound page. The server redirect for `/reveal-admin` is gone, so the SPA handles it like any unknown route.
- The deployed CSP has no `api.github.com`.
- `size-limit` passes, and the change in user-facing JS is recorded.
- The typecheck, lint, unit, script and E2E suites pass in pre-push and CI.

## 7. Quality gates

- **Admin repo:**
  - Pre-commit runs lint and unit tests. Pre-push runs typecheck.
  - CI runs lint, typecheck, tests and a build on every PR.
  - Stories run in a local Storybook. There is no story-coverage or CodeScene gate at first.
  - Dependabot bumps the pin weekly, and CI on that PR is the bridge's contract test.
- **App repo:** no new gates. `tsc -b`, the orphan check in `check:stories`, and size-limit's missing-file error catch anything left over from P4.

## 8. Risks

| Risk | Mitigation |
|---|---|
| A pin bump breaks admin | Bridge-only imports; the Dependabot PR and its CI run surface the break before merge |
| Third-party versions drift between app and admin | A CI step in admin compares every dependency that admin and `upstream/inkweave/apps/web/package.json` both declare, and fails on a version mismatch. So a pin bump that moves React, the router or Radix fails until admin matches |
| The admin deploy loses its login gate (for example, a custom domain added later, or a protection mode that leaves the production alias public) | The admin project uses All Deployments, and every deploy refuses to ship under any other mode. After shipping, `scripts/assert-login-gate.mjs` checks the new deployment, the production URL and every project domain listed by the Vercel API, and the run fails if any of them answers an anonymous request. Admin `CLAUDE.md` forbids custom domains. The first plan copied the app's Standard Protection, which left `inkweave-admin.vercel.app` public (#7) |
| Analytics goes stale | Nightly run plus manual dispatch |
| The reveal preview uses the pinned engine rather than production's | It is a preview only, so publishes are unaffected; bump the pin after engine changes |
| Two writers to the app's `master` (the tools and the convert bot) | Unchanged from today; `commitFiles` updates the ref without force, so a moved ref fails the publish instead of overwriting |
| `deck-builder` merge conflicts | P6, resolved by keeping the deletions |
| This spec and the plan exist only in this worktree until P1 | The worktree is flagged in session memory until P1 copies them into `docs/PLAN.md` |
| GitHub Actions minutes run out. Both private repos draw on one account budget; on 2026-09-25 it ran out mid-afternoon, and every workflow, including production deploys, was refused before starting ("recent account payments have failed or your spending limit needs to be increased") | Keep admin CI lean (no E2E browser matrix). Size the analytics refresh to the budget: nightly only if minutes allow, otherwise weekly plus manual dispatch. A red job with 0 steps that finished in 2 seconds never started, so check `gh run view` for that billing annotation before debugging code |

## 9. Related work, out of scope

- **Voting data-layer hardening:** done in Doberjohn/inkweave#595 (merged and deployed 2026-09-25). Migration `20260925000000_harden_votes_access.sql` and `docs/DATABASE.md` hold the details.
- **Deploy-after-CI and branch protection:** making `deploy.yml` wait for CI is the bigger lever. Branch protection adds little in a solo repo, because the owner's token can bypass it.


---

# Admin Repo Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every admin page and all administration work from `Doberjohn/inkweave` into the private `Doberjohn/inkweave-admin` repo, so the public site serves nothing admin and the app repo holds only the product.

**Architecture:**
- `inkweave-admin` is a Vite + React SPA that pins the app repo as a git submodule at `upstream/inkweave`. It imports app code only through `src/app-bridge.ts`.
- It is built in GitHub Actions and deployed with `vercel deploy --prebuilt` to a Vercel project that has no custom domain. All Deployments protection puts every URL behind Vercel login.
- The app repo only loses code.

**Tech Stack:** pnpm 9 workspaces, Node 24, Vite 8 (Rolldown) + `@vitejs/plugin-react` 6 + React Compiler via `@rolldown/plugin-babel`, React 19, TypeScript 6, Vitest 4 + Testing Library, ESLint 10 flat config, Husky 9, GitHub Actions, Vercel CLI 60.0.0.

**Spec:** `docs/superpowers/specs/2026-09-25-admin-repo-split-design.md` (read it first; decision ids D1 to D11 below refer to it).

---

## How to execute this plan

This plan covers phases P0 and P1 in full detail. Phases P2 to P6 are outlined at the end, and each gets its own detailed plan when it starts.

**Repos and locations**

- `APP_WT` = `D:\johnn\Projects\inkweave-admin-split`: the app-repo worktree, based on `origin/master`. Phase P0 runs here.
- `ADMIN` = `D:\johnn\Projects\inkweave-admin`: a clone of the admin repo. Phase P1 runs here, in a Claude session **launched from `ADMIN`**, so that the hooks, `CLAUDE.md` and `$CLAUDE_PROJECT_DIR` belong to the admin repo.

**Commits, pushes and approvals**

- Commits and pushes need the owner's explicit approval. The command must start with the literal `USER_APPROVED=1`.
- Never pipe a commit or a push. The app repo's husky pre-push hook runs for several minutes, so run app pushes in the background and read the output file.
- Steps marked **[owner]** handle token values. Claude never types or pastes a token. It gives the owner the exact command, and the owner pastes the value when prompted.
- Steps marked **[confirm]** change an external account (GitHub or Vercel). Ask the owner before running them.

**Issue numbers**

Created on 2026-09-25 in Task T.2. Substitute them wherever a placeholder appears.

| Placeholder | Issue |
|---|---|
| `APP_P0` | Doberjohn/inkweave#591 (PR #592) |
| `ADM_P1` | Doberjohn/inkweave-admin#1 |
| `ADM_P2` | Doberjohn/inkweave-admin#2 |
| `ADM_P3` | Doberjohn/inkweave-admin#3 |
| `APP_P4` | Doberjohn/inkweave#593 |
| `ADM_P5` | Doberjohn/inkweave-admin#4 (not #5) |
| `APP_P6` | Doberjohn/inkweave#594 |

**Shell**

The shell is Git Bash unless a step says PowerShell. PowerShell 5.1 has no `&&` operator.

---

## Tracking setup

### Task T.1: Milestone in the app repo [confirm]

- [ ] **Step 1: Create the milestone**

```bash
gh api repos/Doberjohn/inkweave/milestones -f title="Admin repo split" -f description="Move admin pages and administration work to Doberjohn/inkweave-admin. Plan: inkweave-admin docs/PLAN.md"
```

Expected: JSON with `"title": "Admin repo split"` and a `number`.

### Task T.2: Issues [confirm]

Create each issue with `/draft-issue`, one at a time, passing the scope text below. Put app-repo issues in the "Admin repo split" milestone. For admin-repo issues, publish with `--repo Doberjohn/inkweave-admin`. If a label is missing there, create it first: `gh label create <name> --repo Doberjohn/inkweave-admin`.

| Id | Repo | Title | Scope to pass to /draft-issue |
|---|---|---|---|
| APP_P0 | app | Stop publishing admin analytics data from the public build | **Why:** `build:vercel` steps 5 and 6 write `vote-analytics.json`, `vote-log.json` (2,547 raw votes with timestamps and stable voter ids) and `vercel-analytics.json` into `apps/web/public/data/`, so `inkweave.ink/data/*.json` serves them to anyone. **Change:** remove the two steps from `build:vercel` (the scripts stay until P4). **Accept:** after the deploy, the three URLs return 404, and `/admin/analytics` shows its empty state. **Out of scope:** deleting the scripts (P4) and the votes-table lockdown (separate task). |
| ADM_P1 | admin | Scaffold the admin repo, deploy it behind Vercel login | Spec section 5, P1 row; this plan's Tasks 1.1 to 1.14. |
| ADM_P2 | admin | Port the admin tools | Spec section 5, P2 row; outline P2 below. |
| ADM_P3 | admin | Move the analytics and reveal-ingestion pipelines | Spec section 5, P3 row; outline P3 below. |
| APP_P4 | app | Remove admin from the app (cutover) | Spec section 6. |
| ADM_P5 | admin | Security follow-through after the cutover | Spec section 5, P5 row. |
| APP_P6 | app | Reconcile deck-builder with the admin removal | Spec section 5, P6 row. |

---

## Phase P0: stop publishing admin analytics (app repo, `APP_WT`)

**Why no unit test:** P0 deletes two build steps, and its acceptance check is production behaviour (Task 0.4). P4 deletes the scripts themselves, so a regression test that guards against re-adding them would only live until P4.

### Task 0.1: Prepare the worktree branch

**Files:** none.

- [ ] **Step 1: Rename the worktree branch for the P0 issue**

```bash
git branch -m fix/APP_P0-stop-publishing-admin-analytics
git branch --show-current
```

Expected: `fix/APP_P0-stop-publishing-admin-analytics` (with the real number).

- [ ] **Step 2: Install dependencies, which the husky hooks need**

```bash
pnpm install --frozen-lockfile
pnpm --filter inkweave-web exec playwright install chromium
```

Expected: install completes, and chromium is installed or reported as up to date.

- [ ] **Step 3: Make sure no other checkout's dev server holds the E2E ports**

Pre-push E2E reuses any server already on 5173, which would test the wrong checkout. In PowerShell:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 5173,5174,5175 -ErrorAction SilentlyContinue | Select-Object LocalPort, OwningProcess
```

Expected: no rows. If there are rows, ask the owner before stopping those processes; they may belong to another session, such as the `inkweave-set14` worktree.

### Task 0.2: Remove the two analytics steps from `build:vercel`

**Files:**
- Modify: `package.json:12` (the `build:vercel` script)

- [ ] **Step 1: Edit only the middle of the line**

Use the Edit tool with exactly this pair, so the `\u2014` escape near the end of the line is never inside `new_string`. The Edit tool decodes `\uXXXX` escapes in `new_string` into raw characters.

old_string:
```
node scripts/precompute-synergies.mjs && node scripts/precompute-vote-analytics.mjs && node scripts/precompute-vercel-analytics.mjs && node scripts/generate-sitemap.mjs
```

new_string:
```
node scripts/precompute-synergies.mjs && node scripts/generate-sitemap.mjs
```

- [ ] **Step 2: Verify the chain and the untouched escape**

```bash
node -e "const s=require('./package.json').scripts['build:vercel']; if (/precompute-(vote|vercel)-analytics/.test(s)) { console.error('still present'); process.exit(1) } console.log('ok: analytics steps removed')"
git diff --stat
grep -c 'u2014' package.json
```

Expected:
- `ok: analytics steps removed`
- `1 file changed, 1 insertion(+), 1 deletion(-)`
- `1` (the escape is still in the file as text)

### Task 0.3: Commit, push, PR

- [ ] **Step 1: Show the owner `git diff` and get approval to commit**

- [ ] **Step 2: Commit**

The pre-commit hook runs lint and all tests, so allow up to 10 minutes.

```bash
USER_APPROVED=1 git commit -am "fix(build): stop publishing admin analytics from the public build (#APP_P0)"
```

Expected: the hooks pass and one commit is created.

- [ ] **Step 3: Push and open the PR with `/commit-and-push`**

The PR body must contain `Closes #APP_P0`, a link to this plan, and the Task 0.4 checks. Pre-push runs typecheck, story coverage, the design gate, chromium E2E and CodeScene, so run the push in the background.

- [ ] **Step 4: Bind the PR with the ccd_pr tools and read CI once**

Merge only after the owner approves.

### Task 0.4: Verify production after the deploy

- [ ] **Step 1: Confirm the Deploy run for the merge commit finished**

```bash
gh run list --repo Doberjohn/inkweave --workflow deploy.yml --branch master --limit 1
```

Expected: `completed  success` for the merge commit. Check once. If the run is still going, tell the owner and stop; do not poll.

- [ ] **Step 2: The three files are gone and the site is healthy**

```bash
for p in /data/vote-log.json /data/vote-analytics.json /data/vercel-analytics.json /; do printf '%-30s ' "$p"; curl -s -o /dev/null -w '%{http_code}\n' --max-time 20 "https://inkweave.ink$p"; done
```

Expected:

```
/data/vote-log.json            404
/data/vote-analytics.json      404
/data/vercel-analytics.json    404
/                              200
```

- [ ] **Step 3: Close out**

Comment the output on `#APP_P0`; the merge's `Closes #APP_P0` closes the issue.

Then park the worktree on the updated `master` for P4, and delete the merged branch. This repo merges PRs with merge commits, so the containment check is reliable.

```bash
git fetch origin
git switch --detach origin/master
git merge-base --is-ancestor fix/APP_P0-stop-publishing-admin-analytics origin/master && git branch -D fix/APP_P0-stop-publishing-admin-analytics
```

P4 later starts with `git switch -c feature/APP_P4-remove-admin origin/master` after a fresh `git fetch origin`.

---

## Phase P1: admin repo scaffold (`ADMIN`)

### P1 as built (2026-09-28)

The owner approved these departures while P1 was implemented. The task text below is unchanged; where the two differ, this list and the code win.

- **Task 1.3, `test:run`:** `pnpm build:engine && vitest run`, not `vitest run`. The bridge reaches the engine at runtime (`CtaButton` → `shared/hooks` → `features/cards/loader.ts`), so without it the tests and the pre-commit hook fail on a fresh clone.
- **Task 1.6, boundary test timeout:** the first lint loads typescript-eslint and the React Compiler plugin: 23-45 s cold on Windows, past Vitest's 5 s default. P1 gave the whole describe a 60 s timeout, which a 75 s cold start under load still broke once. Since #9, one ESLint instance is warmed up in `beforeAll` with its own 180 s budget, and the cases keep the default timeout; each takes milliseconds.
- **Task 1.8, shell git guard:** `upstream-readonly.sh` also runs on shell commands, with the matcher `Bash|PowerShell`. `git-write-protection.sh` stays a verbatim copy of the app's, but it matches only the literal `git commit` / `git push`, so `git -C upstream/inkweave ...`, `git -c k=v commit` and every PowerShell call went unguarded. Git writes inside `upstream/` are now blocked outright; `git submodule update --remote` and option-prefixed commits and pushes need `USER_APPROVED=1`. PowerShell cannot carry that prefix, so commits and pushes go through the Bash tool. #9 then made the parser follow single quotes (a `'$(...)'` is text), bash `$'...'` strings, PowerShell comments and expandable `@"..."@` here-strings. The hooks' case table became `scripts/check-hooks.mjs`, which CI runs as `pnpm check:hooks`.
- **Task 1.8, probes:** the branch check was probed on a temporary local `master` branch. `main` has no `.claude/` files until this phase merges, so `git switch main` would have removed the hook scripts first. The hooks took effect without a session restart.
- **Task 1.9, `CLAUDE.md`:** five short additions that document the items above: the engine build before `pnpm dev`, what `test:run` does, the approval prefix for pin bumps, commits through the Bash tool, and the shell guard.
- **Tasks 1.10 and 1.12, workflow hardening:** `pnpm/action-setup` is pinned to `0977fd99725f1db4007ccb2928dbb4e90d06cc86` (v6.0.10, the commit `@v6` pointed at), and `actions/checkout` sets `persist-credentials: false`. A security review flagged the movable third-party tag and the token left in `.git/config` for later steps, dependency install scripts included. The checkout step still fetches the private submodule.
- **Task 1.11, Vercel project:** created with `ssoProtection: all_except_custom_domains` (Standard Protection) in the same call. That mode left the production domain public; see the Task 1.14 entry. `VERCEL_TOKEN` needs team scope (All Projects), because the CLI accepts project-only tokens only for `vercel deploy`: with one, `vercel pull` fails with "Could not retrieve Project Settings". The owner reused the app deploy's All Projects token, so the token is rotated in both repos together. The claude.ai Vercel connector cannot read the new project: get returns 404, and a repeat create returns 409.
- **Task 1.13, Dependabot:** also updates `github-actions` weekly, as the app does, so the pinned SHA and the `actions/*` tags stay current.
- **Task 1.14, first deploy (#7):**
  - Vercel gave the project `inkweave-admin.vercel.app` as its production domain, not the predicted `inkweave-admin-johnfanidis-projects.vercel.app`.
  - Standard Protection leaves production domains public, so that domain served admin to anonymous visitors.
  - The run still passed. Its gate step checked only the deployment URL and the predicted alias, and Standard does gate those generated URLs.
  - The same day, the owner switched the project to All Deployments, and `ADMIN_PRODUCTION_URL` became `https://inkweave-admin.vercel.app`.
  - `deploy.yml` gained two checks through `scripts/vercel-project-urls.mjs`: it refuses to deploy unless the project uses All Deployments, and the gate step also covers every domain the Vercel API lists for the project.
  - The same day, the project also became connected to this repo through Vercel's Git integration. It was first seen on `bb6dd96`.
  - Vercel's own builds of `main` and of PR #8 failed within seconds. Had they worked, they would have skipped both checks.
  - The connection is removed in the dashboard. As a backstop, `vercel.json` sets `git.deploymentEnabled: false`, and `scripts/vercel-config.test.mjs` pins it.
- **Review fixes on PR #5:** `branch-verification.sh` clears inherited repository variables (`unset $(git rev-parse --local-env-vars)`) before reading the branch. `upstream-readonly.sh` also blocks shell redirections whose target is inside `upstream/` (other file-writing commands stay out of scope), and it strips only a heredoc's body, so commands after the terminator are still checked. The command substitutions in an unquoted heredoc's body are kept, because bash runs them; `#` comments are ignored. Delimiters are read as whole words (`END.txt`), and substitutions are found with bash's quoting rules, nested ones included. Both workflows declare `permissions: contents: read`. The bridge boundary covers every source file except `eslint.config.js`, including literal dynamic `import()` through `no-restricted-syntax`; that rule repeats the memo ban, because flat config replaces a rule's options per file instead of merging them. Later reviews (cubic, then CodeRabbit again) prompted more fixes:
  - the login-gate check accepts only the exact `vercel.com/sso-api` endpoint, times out each request after 30 s, and still reports every URL when one can't be fetched;
  - PowerShell `$(...)` subexpressions, nested ones included, go through the same quote-aware scan as bash;
  - both hooks match paths case-insensitively;
  - the upstream guard also follows `GIT_DIR`/`GIT_WORK_TREE` assignments and `bash -lc`;
  - the boundary also catches template-literal `import()`, `require()` and the bare `upstream` root;
  - `check:deps --fix` no longer lists a dependency twice.

  The suite now has 46 tests, including the 17 from #7, not the 15 Task 1.14 expects.

### Files created in P1

| Path | Responsibility |
|---|---|
| `.gitattributes`, `.gitignore`, `.nvmrc`, `README.md` | Repo hygiene: LF everywhere (mirrors the app), Node 24 |
| `docs/PLAN.md` | Spec plus this plan: the source of truth from P1 on (D11) |
| `.gitmodules`, `upstream/inkweave` | The pinned app submodule (D3) |
| `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` | Scripts; the app's full runtime dependency set; the engine as a workspace package |
| `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` | Compiler options identical to the app's, so bridged files compile the same way |
| `vite.config.ts` | Same React Compiler setup as the app; dev port 5180; dev proxy built from `forwarded-paths.json`; Vitest config |
| `forwarded-paths.json` | Single list of app paths forwarded to `https://inkweave.ink` (D5) |
| `vercel.json` | Rewrites for those paths, SPA fallback, site-wide noindex; Git-triggered deploys off (#7) |
| `index.html`, `src/main.tsx` | Entry point |
| `src/app-bridge.ts` | The only module importing from `upstream/` |
| `src/shell/tools.ts`, `src/shell/ToolIndex.tsx` (+ test) | Landing page listing the five tools |
| `src/test/setup.ts` | jest-dom matchers for Vitest |
| `eslint.config.js` | App lint rules, the app's design-token plugin, and the bridge boundary rule |
| `scripts/check-shared-deps.mjs` (+ test) | Version parity with the pinned app, with `--fix` |
| `scripts/assert-login-gate.mjs` (+ test) | Fails a deploy if any admin URL answers an anonymous request |
| `scripts/vercel-project-urls.mjs` (+ test) | Refuses a deploy unless the project uses All Deployments; lists every project domain for the login-gate check (#7) |
| `scripts/check-hooks.mjs` | The `.claude/hooks` case table: runs each hook on a set of tool calls and checks the exit codes. CI only (#9) |
| `scripts/bridge-boundary.test.mjs`, `scripts/forwarded-paths.test.mjs`, `scripts/vercel-config.test.mjs` | Guards on the lint boundary, on vercel.json / proxy sync, and on Git-triggered deploys staying off (#7) |
| `.husky/pre-commit`, `.husky/pre-push` | Lint + tests on commit; parity + typecheck on push |
| `.claude/settings.json`, `.claude/hooks/*.sh` | Git safety, branch check, read-only `upstream/` |
| `CLAUDE.md` | Rules and environment for admin sessions |
| `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.github/dependabot.yml` | CI (with the hook case table), deploy plus protection check and login-gate assertion, weekly pin bumps |

### Task 1.1: Clone and bootstrap commit

**Files:**
- Create: `README.md`, `.gitignore`, `.gitattributes`, `.nvmrc`, `docs/PLAN.md`

- [ ] **Step 1: Clone the empty repo**

Run this from a session that is not isolated in an app worktree, or have the owner run it:

```bash
git clone git@github-personal:Doberjohn/inkweave-admin.git D:/johnn/Projects/inkweave-admin
```

Expected: `warning: You appear to have cloned an empty repository.`

- [ ] **Step 2: Launch a Claude Code session from `D:\johnn\Projects\inkweave-admin` for the rest of P1**

- [ ] **Step 3: Point HEAD at `main` before the first commit**

The branch name must not depend on `init.defaultBranch`.

```bash
git symbolic-ref HEAD refs/heads/main
```

- [ ] **Step 4: Write `docs/PLAN.md` from the spec and this plan**

```bash
mkdir -p docs
cat D:/johnn/Projects/inkweave-admin-split/docs/superpowers/specs/2026-09-25-admin-repo-split-design.md > docs/PLAN.md
printf '\n\n---\n\n' >> docs/PLAN.md
cat D:/johnn/Projects/inkweave-admin-split/docs/superpowers/plans/2026-09-25-admin-repo-split.md >> docs/PLAN.md
```

Then add, right under the first heading of `docs/PLAN.md`, the issue map from Task T.2 with the real numbers:

```markdown
## Issue map

| Phase | Issue |
|---|---|
| P0 | Doberjohn/inkweave#APP_P0 |
| P1 | Doberjohn/inkweave-admin#ADM_P1 |
| P2 | Doberjohn/inkweave-admin#ADM_P2 |
| P3 | Doberjohn/inkweave-admin#ADM_P3 |
| P4 | Doberjohn/inkweave#APP_P4 |
| P5 | Doberjohn/inkweave-admin#ADM_P5 |
| P6 | Doberjohn/inkweave#APP_P6 |
```

- [ ] **Step 5: Write `README.md`**

```markdown
# inkweave-admin

Private admin tools for [Inkweave](https://inkweave.ink). The public app lives in `Doberjohn/inkweave`; this repo pins it as a submodule at `upstream/inkweave` and deploys to a Vercel project behind Vercel login.

Design, plan and phase status: [docs/PLAN.md](docs/PLAN.md). Working rules: [CLAUDE.md](CLAUDE.md).
```

- [ ] **Step 6: Write `.gitignore`**

```
node_modules/
dist/
coverage/
.vercel/
.env
.env.local
*.log
```

- [ ] **Step 7: Copy the app's `.gitattributes` verbatim (LF everywhere; binaries pinned)**

```bash
cp D:/johnn/Projects/inkweave-admin-split/.gitattributes .gitattributes
```

- [ ] **Step 8: Write `.nvmrc`**

```
24
```

- [ ] **Step 9: Commit to `main` and push**

This is a bootstrap commit: the repo has no branch to protect yet. Get owner approval first.

```bash
git add README.md .gitignore .gitattributes .nvmrc docs/PLAN.md
USER_APPROVED=1 git commit -m "docs: bootstrap with the admin split plan (#ADM_P1)"
USER_APPROVED=1 git push -u origin main
```

Expected: `* [new branch] main -> main`. `gh repo view Doberjohn/inkweave-admin --json defaultBranchRef` shows `main`.

- [ ] **Step 10: Branch for the rest of P1**

```bash
git switch -c feature/ADM_P1-scaffold
```

### Task 1.2: Pin the app repo as a submodule

**Files:**
- Create: `.gitmodules`, `upstream/inkweave` (gitlink)

- [ ] **Step 1: Add the submodule with a relative URL**

The relative URL resolves against `origin`: to `git@github-personal:Doberjohn/inkweave.git` locally and to HTTPS in Actions.

```bash
git submodule add ../inkweave.git upstream/inkweave
```

- [ ] **Step 2: Verify the pin and the URL**

```bash
cat .gitmodules
git -C upstream/inkweave log -1 --format='%h %s'
git -C upstream/inkweave remote get-url origin
```

Expected:

```
[submodule "upstream/inkweave"]
	path = upstream/inkweave
	url = ../inkweave.git
<sha> <subject of the app's current master HEAD>
git@github-personal:Doberjohn/inkweave.git
```

- [ ] **Step 3: Commit**

```bash
USER_APPROVED=1 git commit -m "chore: pin the app repo as upstream/inkweave (#ADM_P1)"
```

### Task 1.3: Package, workspace and toolchain

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `forwarded-paths.json`, `vite.config.ts`, `index.html`, `src/test/setup.ts`

- [ ] **Step 1: Write `package.json`**

Admin declares the app's **full** runtime dependency set, not only what the bridge uses today. The app's index files already reach all of them from `CtaButton` (197 modules), so a partial list would break on the next barrel change. Versions are copied from `upstream/inkweave/apps/web/package.json`; Task 1.4's check keeps them aligned.

```json
{
  "name": "inkweave-admin",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build:engine": "pnpm --filter inkweave-synergy-engine build",
    "build": "pnpm build:engine && tsc -b && vite build",
    "typecheck": "pnpm build:engine && tsc -b",
    "preview": "vite preview",
    "lint": "eslint .",
    "test": "vitest",
    "test:run": "vitest run",
    "check:deps": "node scripts/check-shared-deps.mjs",
    "prepare": "husky"
  },
  "dependencies": {
    "@radix-ui/react-dialog": "^1.1.23",
    "@sentry/react": "^10.75.1",
    "@supabase/supabase-js": "^2.116.0",
    "@vercel/analytics": "^2.0.1",
    "@vercel/speed-insights": "^2.0.0",
    "inkweave-synergy-engine": "workspace:*",
    "react": "^19.3.0",
    "react-dom": "^19.3.0",
    "react-loading-skeleton": "^3.5.0",
    "react-router-dom": "^7.18.4",
    "react-virtuoso": "^4.18.14"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@rolldown/plugin-babel": "^0.2.4",
    "@testing-library/jest-dom": "^7.0.1",
    "@testing-library/react": "^16.3.3",
    "@testing-library/user-event": "^14.6.7",
    "@types/node": "^24.13.6",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@vitejs/plugin-react": "^6.1.1",
    "babel-plugin-react-compiler": "^1.0.0",
    "eslint": "^10.11.0",
    "eslint-plugin-jsx-a11y": "^6.10.2",
    "eslint-plugin-react-compiler": "19.1.0-rc.2",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.7",
    "globals": "^17.12.0",
    "husky": "^9.1.7",
    "jsdom": "^29.1.1",
    "typescript": "^6.0.3",
    "typescript-eslint": "^8.70.1",
    "vite": "^8.3.0",
    "vitest": "~4.1.10"
  },
  "packageManager": "pnpm@9.0.0",
  "engines": {
    "node": ">=24 <25"
  }
}
```

- [ ] **Step 2: Write `pnpm-workspace.yaml`**

The admin root is always part of the workspace; the engine comes from the submodule.

```yaml
packages:
  - 'upstream/inkweave/packages/synergy-engine'
```

- [ ] **Step 3: Write `tsconfig.json`, `tsconfig.app.json` and `tsconfig.node.json`**

`tsconfig.json`:

```json
{
  "files": [],
  "references": [{"path": "./tsconfig.app.json"}, {"path": "./tsconfig.node.json"}]
}
```

`tsconfig.app.json`. The compiler options match `upstream/inkweave/apps/web/tsconfig.app.json` exactly. The app's `vite-env.d.ts` is included so that bridged app modules see their `import.meta.env` keys.

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "types": ["vite/client", "vitest/globals"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src", "upstream/inkweave/apps/web/src/vite-env.d.ts"]
}
```

`tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "types": ["node"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Write `forwarded-paths.json`**

This is the single list of public app paths forwarded to production. The dev proxy is built from it, and Task 1.12's test holds `vercel.json` to it.

```json
{
  "origin": "https://inkweave.ink",
  "paths": ["/data/", "/card-images/", "/card-images-preview/", "/fonts/"]
}
```

- [ ] **Step 5: Write `vite.config.ts`**

```ts
/// <reference types="vitest" />
import fs from 'node:fs';
import path from 'node:path';
import react, {reactCompilerPreset} from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import {defineConfig} from 'vitest/config';

// Public app paths the bridged loader, images and fonts request same-origin
// (docs/PLAN.md, D5). Production forwards them with vercel.json rewrites;
// scripts/forwarded-paths.test.mjs keeps the two in sync. Read with fs, not an
// import, so the config also loads under Vite's native (plain ESM) loader.
const forwarded = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, 'forwarded-paths.json'), 'utf8'),
) as {origin: string; paths: string[]};

export default defineConfig({
  // Same compiler setup as the app (upstream/inkweave/apps/web/vite.config.ts),
  // so bridged components compile identically. babel() must follow react().
  plugins: [react(), babel({presets: [reactCompilerPreset()]})],
  resolve: {
    // Bridged files resolve packages from this root; dedupe guards against a
    // stray second copy (e.g. if someone installs inside upstream/).
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  server: {
    // Outside the app's 5173-5175 range, so neither repo's tooling attaches to the other's server.
    port: 5180,
    strictPort: true,
    // Trailing slashes are load-bearing: '/card-images/' must not also match '/card-images-preview/'.
    proxy: Object.fromEntries(
      forwarded.paths.map((prefix) => [prefix, {target: forwarded.origin, changeOrigin: true}]),
    ),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // upstream/ holds the app's own test suite; it must never run here.
    exclude: ['**/node_modules/**', 'upstream/**', 'dist/**'],
  },
});
```

- [ ] **Step 6: Write `index.html` and `src/test/setup.ts`**

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Inkweave admin</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 7: Install, build the engine, typecheck**

```bash
pnpm install
pnpm build:engine
pnpm exec tsc -b
git -C upstream/inkweave status --porcelain
```

Expected:
- `pnpm install` creates `pnpm-lock.yaml` and links `inkweave-synergy-engine` from the workspace.
- `pnpm build:engine` writes `upstream/inkweave/packages/synergy-engine/dist/`. That folder is ignored by the app's own `.gitignore`, so it doesn't dirty the submodule.
- `tsc -b` exits 0.
- The final `git -C upstream/inkweave status --porcelain` prints nothing, confirming the submodule is still clean.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.app.json tsconfig.node.json forwarded-paths.json vite.config.ts index.html src/test/setup.ts
USER_APPROVED=1 git commit -m "chore: toolchain mirroring the app, engine as a workspace package (#ADM_P1)"
```

### Task 1.4: Dependency parity with the pinned app (TDD)

**Files:**
- Create: `scripts/check-shared-deps.mjs`
- Test: `scripts/check-shared-deps.test.mjs`

- [ ] **Step 1: Write the failing test**

`scripts/check-shared-deps.test.mjs`:

```js
// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {alignDeps, compareDeps} from './check-shared-deps.mjs';

const app = {
  dependencies: {react: '^19.3.0', 'react-dom': '^19.3.0'},
  devDependencies: {vite: '^8.3.0', storybook: '^10.6.0'},
};

describe('compareDeps', () => {
  it('passes when admin declares every app runtime dependency at the app version', () => {
    const admin = {
      dependencies: {react: '^19.3.0', 'react-dom': '^19.3.0'},
      devDependencies: {vite: '^8.3.0'},
    };
    expect(compareDeps(admin, app)).toEqual([]);
  });

  it('reports an app runtime dependency admin does not declare', () => {
    const admin = {dependencies: {react: '^19.3.0'}, devDependencies: {}};
    expect(compareDeps(admin, app)).toEqual(['missing runtime dependency react-dom@^19.3.0']);
  });

  it('reports a shared package whose specifier differs', () => {
    const admin = {
      dependencies: {react: '^19.3.0', 'react-dom': '^19.3.0'},
      devDependencies: {vite: '^8.2.0'},
    };
    expect(compareDeps(admin, app)).toEqual(['version mismatch vite: admin ^8.2.0, app ^8.3.0']);
  });

  it('ignores packages only admin declares', () => {
    const admin = {
      dependencies: {react: '^19.3.0', 'react-dom': '^19.3.0'},
      devDependencies: {husky: '^9.1.7'},
    };
    expect(compareDeps(admin, app)).toEqual([]);
  });
});

describe('alignDeps', () => {
  it('adds missing runtime dependencies and copies app specifiers onto shared packages', () => {
    const admin = {dependencies: {react: '^19.2.0'}, devDependencies: {vite: '^8.2.0', husky: '^9.1.7'}};
    expect(alignDeps(admin, app)).toEqual({
      dependencies: {react: '^19.3.0', 'react-dom': '^19.3.0'},
      devDependencies: {vite: '^8.3.0', husky: '^9.1.7'},
    });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm exec vitest run scripts/check-shared-deps.test.mjs`
Expected: FAIL, `Failed to load url ./check-shared-deps.mjs` (the module does not exist).

- [ ] **Step 3: Implement**

`scripts/check-shared-deps.mjs`:

```js
#!/usr/bin/env node
// Dependency parity between admin and the pinned app (docs/PLAN.md, section 8).
// Bridged app modules compile inside admin, so admin must (1) declare every
// runtime dependency the app declares and (2) use the app's exact specifier for
// every package both declare. Run after each submodule bump; --fix aligns.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ADMIN_PKG = path.join(ROOT, 'package.json');
const APP_PKG = path.join(ROOT, 'upstream/inkweave/apps/web/package.json');

const allDeps = (pkg) => ({...pkg.dependencies, ...pkg.devDependencies});

/** Human-readable problems; an empty array means admin and the app agree. */
export function compareDeps(admin, app) {
  const problems = [];
  const adminRuntime = admin.dependencies ?? {};
  for (const [name, range] of Object.entries(app.dependencies ?? {})) {
    if (!(name in adminRuntime)) problems.push(`missing runtime dependency ${name}@${range}`);
  }
  const appAll = allDeps(app);
  for (const [name, range] of Object.entries(allDeps(admin))) {
    if (name in appAll && appAll[name] !== range) {
      problems.push(`version mismatch ${name}: admin ${range}, app ${appAll[name]}`);
    }
  }
  return problems;
}

/** Admin's dependency maps with every problem compareDeps reports fixed. */
export function alignDeps(admin, app) {
  const appAll = allDeps(app);
  const align = (deps = {}) =>
    Object.fromEntries(Object.entries(deps).map(([name, range]) => [name, appAll[name] ?? range]));
  const adminRuntime = admin.dependencies ?? {};
  const missing = Object.entries(app.dependencies ?? {}).filter(([name]) => !(name in adminRuntime));
  return {
    dependencies: {...align(adminRuntime), ...Object.fromEntries(missing)},
    devDependencies: align(admin.devDependencies),
  };
}

function main() {
  const admin = JSON.parse(fs.readFileSync(ADMIN_PKG, 'utf8'));
  const app = JSON.parse(fs.readFileSync(APP_PKG, 'utf8'));

  if (process.argv.includes('--fix')) {
    fs.writeFileSync(ADMIN_PKG, `${JSON.stringify({...admin, ...alignDeps(admin, app)}, null, 2)}\n`);
    console.log('package.json aligned with the app. Run pnpm install next.');
    return;
  }

  const problems = compareDeps(admin, app);
  if (problems.length === 0) {
    console.log('Dependency parity with the app: OK');
    return;
  }
  console.error(`Dependency parity with the app failed (${problems.length}):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('Fix with: pnpm check:deps --fix && pnpm install');
  process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
```

- [ ] **Step 4: Run the tests, then the real check**

Run: `pnpm exec vitest run scripts/check-shared-deps.test.mjs`
Expected: PASS (5 tests).

Run: `pnpm check:deps`
Expected: `Dependency parity with the app: OK`

- [ ] **Step 5: Commit**

```bash
git add scripts/check-shared-deps.mjs scripts/check-shared-deps.test.mjs
USER_APPROVED=1 git commit -m "feat: dependency parity check against the pinned app (#ADM_P1)"
```

### Task 1.5: Tool index through the bridge (TDD)

**Files:**
- Create: `src/app-bridge.ts`, `src/shell/tools.ts`, `src/shell/ToolIndex.tsx`, `src/main.tsx`
- Test: `src/shell/ToolIndex.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/shell/ToolIndex.test.tsx`:

```tsx
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ToolIndex} from './ToolIndex';
import {ADMIN_TOOLS} from './tools';

describe('ToolIndex', () => {
  it('lists every admin tool by name', () => {
    render(<ToolIndex />);
    for (const tool of ADMIN_TOOLS) {
      expect(screen.getByRole('heading', {name: tool.name})).toBeInTheDocument();
    }
  });

  it('opens a tool at its current home on the public app until it moves here', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<ToolIndex />);
    await userEvent.click(screen.getByRole('button', {name: 'Open Reveal publisher'}));
    expect(open).toHaveBeenCalledWith('https://inkweave.ink/admin/reveal', '_blank', 'noopener');
    open.mockRestore();
  });

  it('disables a tool that only runs locally', () => {
    render(<ToolIndex />);
    expect(screen.getByRole('button', {name: 'Open Banner generator'})).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm exec vitest run src/shell/ToolIndex.test.tsx`
Expected: FAIL, `Failed to resolve import "./ToolIndex"`.

- [ ] **Step 3: Write the bridge**

`src/app-bridge.ts`:

```ts
// The ONLY module allowed to import from upstream/ (the pinned app submodule).
// Everything admin uses from the app is re-exported here, so a pin bump that
// changes app internals breaks in exactly one place. Enforced by the
// no-restricted-imports rule in eslint.config.js (docs/PLAN.md, D3).

// The app's global stylesheet: @font-face on /fonts/* (forwarded to
// inkweave.ink), body colors, and the reduced-motion block.
import '../upstream/inkweave/apps/web/src/index.css';

export {
  CAP_LABEL,
  COLORS,
  FONTS,
  FONT_SIZES,
  SPACING,
  SURFACE_CARD,
} from '../upstream/inkweave/apps/web/src/shared/constants';
export {CtaButton} from '../upstream/inkweave/apps/web/src/shared/components/CtaButton';
```

- [ ] **Step 4: Write the tool list and the index page**

`src/shell/tools.ts`:

```ts
export interface AdminTool {
  id: 'reveal' | 'image' | 'tuning' | 'analytics' | 'banner';
  name: string;
  purpose: string;
  /** Where the tool runs until P2 ports it here; null when it only runs locally today. */
  currentUrl: string | null;
}

export const ADMIN_TOOLS: readonly AdminTool[] = [
  {
    id: 'reveal',
    name: 'Reveal publisher',
    purpose: 'Add a newly revealed card to the preview set.',
    currentUrl: 'https://inkweave.ink/admin/reveal',
  },
  {
    id: 'image',
    name: 'Card images',
    purpose: "Replace an existing card's image.",
    currentUrl: 'https://inkweave.ink/admin/image',
  },
  {
    id: 'tuning',
    name: 'Engine tuning',
    purpose: 'Edit playstyle copy and the Shift and Ramp scores.',
    currentUrl: 'https://inkweave.ink/admin/tuning',
  },
  {
    id: 'analytics',
    name: 'Analytics',
    purpose: 'Vote calibration, activity and web analytics.',
    currentUrl: 'https://inkweave.ink/admin/analytics',
  },
  {
    id: 'banner',
    name: 'Banner generator',
    purpose: 'Render Synergy Spotlight banners. Runs locally with pnpm banner in the app repo for now.',
    currentUrl: null,
  },
];
```

`src/shell/ToolIndex.tsx`:

```tsx
import {CAP_LABEL, COLORS, CtaButton, FONTS, FONT_SIZES, SPACING, SURFACE_CARD} from '../app-bridge';
import {ADMIN_TOOLS, type AdminTool} from './tools';

function ToolCard({tool}: {tool: AdminTool}) {
  const {currentUrl} = tool;
  return (
    <li style={{...SURFACE_CARD, display: 'flex', flexDirection: 'column', gap: SPACING.sm}}>
      <h2 style={{margin: 0, fontFamily: FONTS.hero, fontSize: FONT_SIZES.xxl, color: COLORS.text}}>
        {tool.name}
      </h2>
      <p style={{margin: 0, fontSize: FONT_SIZES.lg, color: COLORS.textMuted}}>{tool.purpose}</p>
      <CtaButton
        variant="neutral"
        aria-label={`Open ${tool.name}`}
        disabled={currentUrl === null}
        onClick={() => {
          if (currentUrl) window.open(currentUrl, '_blank', 'noopener');
        }}>
        {currentUrl ? 'Open current page' : 'Runs locally'}
      </CtaButton>
    </li>
  );
}

/** Admin landing page: every tool, and where it runs until P2 moves it here. */
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

`src/main.tsx`:

```tsx
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {ToolIndex} from './shell/ToolIndex';

const root = document.getElementById('root');
if (!root) throw new Error('index.html is missing the #root element');

createRoot(root).render(
  <StrictMode>
    <ToolIndex />
  </StrictMode>,
);
```

- [ ] **Step 5: Run the tests**

Run: `pnpm exec vitest run src/shell/ToolIndex.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Typecheck the whole program, including the bridged app modules**

Run: `pnpm typecheck`
Expected: exit 0. A failure inside `upstream/` means a compiler option or dependency differs from the app's; fix admin, never `upstream/`.

- [ ] **Step 7: Look at it in the browser**

Run `pnpm dev` in the background, open `http://localhost:5180`, and take a screenshot.

Expected:
- five tool cards on the dark background, in Plus Jakarta Sans body text and Tinos headings (the fonts come through the `/fonts/` proxy);
- the Banner button disabled.

Show the screenshot to the owner (Visual Iteration Protocol), then stop the dev server.

- [ ] **Step 8: Commit**

```bash
git add src/app-bridge.ts src/shell src/main.tsx
USER_APPROVED=1 git commit -m "feat: tool index rendered through the app bridge (#ADM_P1)"
```

### Task 1.6: Lint config with the bridge boundary (TDD)

**Files:**
- Create: `eslint.config.js`
- Test: `scripts/bridge-boundary.test.mjs`

- [ ] **Step 1: Write the failing test**

`scripts/bridge-boundary.test.mjs`:

```js
// @vitest-environment node
import {ESLint} from 'eslint';
import {describe, expect, it} from 'vitest';

const LEAK =
  "import {COLORS} from '../../upstream/inkweave/apps/web/src/shared/constants';\nexport const accent = COLORS.primary;\n";

async function ruleIds(filePath) {
  const [result] = await new ESLint().lintText(LEAK, {filePath});
  return result.messages.map((message) => message.ruleId);
}

describe('the app-bridge boundary', () => {
  it('rejects an upstream import outside the bridge', async () => {
    expect(await ruleIds('src/shell/Leak.ts')).toContain('no-restricted-imports');
  });

  it('allows upstream imports in src/app-bridge.ts', async () => {
    expect(await ruleIds('src/app-bridge.ts')).not.toContain('no-restricted-imports');
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm exec vitest run scripts/bridge-boundary.test.mjs`
Expected: FAIL, because ESLint finds no configuration file.

- [ ] **Step 3: Write `eslint.config.js`**

```js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import reactCompiler from 'eslint-plugin-react-compiler';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tseslint from 'typescript-eslint';
// The app's design-token rules, loaded from the pinned submodule so admin UI is
// held to the same design system. Nothing is grandfathered here: the plugin's
// ledger lists app paths only, so every admin file gets the full rules.
import {inkweave} from './upstream/inkweave/apps/web/eslint-rules/index.js';

export default tseslint.config(
  {ignores: ['dist', 'coverage', 'upstream']},
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {ecmaVersion: 2022, globals: globals.browser},
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'react-compiler': reactCompiler,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      'react-refresh/only-export-components': ['warn', {allowConstantExport: true}],
      'react-compiler/react-compiler': 'error',
      // Same ban as the app (#291): the React Compiler memoizes automatically.
      'no-restricted-syntax': [
        'error',
        {selector: "CallExpression[callee.name='useMemo']", message: 'Avoid useMemo: the React Compiler auto-memoizes.'},
        {selector: "CallExpression[callee.name='useCallback']", message: 'Avoid useCallback: the React Compiler auto-memoizes.'},
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {inkweave},
    rules: {
      'inkweave/no-raw-hex-colors': 'error',
      'inkweave/no-raw-rgba': 'error',
      'inkweave/no-literal-font-family': 'error',
      'inkweave/no-raw-font-size': 'error',
      'inkweave/no-raw-radius': 'error',
      'inkweave/no-raw-z-index': 'error',
      'inkweave/no-raw-easing': 'error',
      'inkweave/no-backdrop-filter': 'error',
      'inkweave/no-adhoc-buttons': 'error',
      'inkweave/no-unshelled-dialogs': 'error',
    },
  },
  // D3: app code enters admin only through src/app-bridge.ts.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/app-bridge.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/upstream/**'],
              message: 'Import app code through src/app-bridge.ts (docs/PLAN.md, D3).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: {ecmaVersion: 2022, sourceType: 'module', globals: globals.node},
  },
);
```

- [ ] **Step 4: Run the boundary test and the full lint**

Run: `pnpm exec vitest run scripts/bridge-boundary.test.mjs`
Expected: PASS (2 tests).

Run: `pnpm lint`
Expected: exit 0 with no errors. A design-token error in `src/shell/ToolIndex.tsx` means a raw value slipped in; replace it with the token the message names.

- [ ] **Step 5: Commit**

```bash
git add eslint.config.js scripts/bridge-boundary.test.mjs
USER_APPROVED=1 git commit -m "feat: lint with the app's design-token rules and the bridge boundary (#ADM_P1)"
```

### Task 1.7: Login-gate assertion (TDD)

**Files:**
- Create: `scripts/assert-login-gate.mjs`
- Test: `scripts/assert-login-gate.test.mjs`

- [ ] **Step 1: Write the failing test**

`scripts/assert-login-gate.test.mjs`:

```js
// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {isLoginGate} from './assert-login-gate.mjs';

describe('isLoginGate', () => {
  it('accepts a redirect to Vercel login', () => {
    expect(
      isLoginGate(302, 'https://vercel.com/sso-api?url=https%3A%2F%2Fx.vercel.app%2F&nonce=abc'),
    ).toBe(true);
  });

  it('rejects a page served to an anonymous visitor', () => {
    expect(isLoginGate(200, null)).toBe(false);
  });

  it('rejects a redirect anywhere other than Vercel login', () => {
    expect(isLoginGate(308, 'https://inkweave.ink/')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm exec vitest run scripts/assert-login-gate.test.mjs`
Expected: FAIL, `Failed to load url ./assert-login-gate.mjs`.

- [ ] **Step 3: Implement**

`scripts/assert-login-gate.mjs`:

```js
#!/usr/bin/env node
// Admin's security model is Vercel login in front of every URL (docs/PLAN.md, D4).
// The deploy workflow runs this against the new deployment and the production
// alias: an anonymous request must be redirected to Vercel login, or the run fails.
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const LOGIN_PREFIX = 'https://vercel.com/sso-api';

/** True when an anonymous response is Vercel's login redirect. */
export function isLoginGate(status, location) {
  return (
    (status === 302 || status === 307) &&
    typeof location === 'string' &&
    location.startsWith(LOGIN_PREFIX)
  );
}

async function main(urls) {
  if (urls.length === 0) {
    console.error('usage: node scripts/assert-login-gate.mjs <url> [...url]');
    process.exitCode = 2;
    return;
  }
  let exposed = false;
  for (const url of urls) {
    const response = await fetch(url, {redirect: 'manual'});
    const location = response.headers.get('location');
    const gated = isLoginGate(response.status, location);
    console.log(`${gated ? 'gated  ' : 'EXPOSED'} ${url} -> ${response.status} ${location ?? ''}`);
    if (!gated) exposed = true;
  }
  if (exposed) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2));
}
```

- [ ] **Step 4: Run the tests, then prove it on real responses**

Run: `pnpm exec vitest run scripts/assert-login-gate.test.mjs`
Expected: PASS (3 tests).

Run: `node scripts/assert-login-gate.mjs https://inkweave-johnfanidis-projects.vercel.app/`
Expected: `gated   https://inkweave-johnfanidis-projects.vercel.app/ -> 302 https://vercel.com/sso-api?...`, exit 0. That URL is the app project's protected alias.

Run: `node scripts/assert-login-gate.mjs https://inkweave.ink/`
Expected: `EXPOSED https://inkweave.ink/ -> 200`, exit 1. That's the public custom domain, which is exactly what admin must never have.

- [ ] **Step 5: Commit**

```bash
git add scripts/assert-login-gate.mjs scripts/assert-login-gate.test.mjs
USER_APPROVED=1 git commit -m "feat: assert every admin URL sits behind Vercel login (#ADM_P1)"
```

### Task 1.8: Git hooks and Claude hooks

**Files:**
- Create: `.husky/pre-commit`, `.husky/pre-push`, `.claude/settings.json`, `.claude/hooks/git-write-protection.sh`, `.claude/hooks/branch-verification.sh`, `.claude/hooks/upstream-readonly.sh`

- [ ] **Step 1: Husky hooks**

`.husky/pre-commit`:

```sh
#!/bin/sh
pnpm run lint && pnpm run test:run
```

`.husky/pre-push`:

```sh
#!/bin/sh
pnpm run check:deps && pnpm run typecheck
```

Run: `pnpm install`. The `prepare` script sets `core.hooksPath`. Then `git config core.hooksPath`.
Expected: `.husky/_`

- [ ] **Step 2: Copy the git-safety hook from the app's newest version**

That's the `deck-builder` branch, which adds the hard block on piped commits and pushes.

```bash
mkdir -p .claude/hooks
git -C D:/johnn/Projects/inkweave show deck-builder:.claude/hooks/git-write-protection.sh > .claude/hooks/git-write-protection.sh
grep -c "Piped git commit/push detected" .claude/hooks/git-write-protection.sh
```

Expected: `1`

- [ ] **Step 3: Write `.claude/hooks/branch-verification.sh` (admin version)**

```bash
#!/usr/bin/env bash
# Hook: block source edits on main/master (admin repo version).
# Type: PreToolUse (Edit|Write). Exit 2 = block, exit 0 = allow.
# Adapted from the app's hook: admin source lives in src/ and scripts/, and
# upstream/ is skipped here because upstream-readonly.sh blocks it outright.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | node -e "
  let d = '';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    try { console.log(JSON.parse(d).tool_input?.file_path || ''); } catch { console.log(''); }
  });
")
FILE_PATH=$(echo "$FILE_PATH" | sed 's|\\|/|g')

case "$FILE_PATH" in
  */upstream/*) exit 0 ;;
esac

if ! echo "$FILE_PATH" | grep -qE "/(src|scripts)/.*\.(ts|tsx|js|jsx|mjs|json|css)$"; then
  exit 0
fi

# Resolve the branch from the edited file's directory (worktree-aware), falling
# back to the project root when that directory does not exist yet.
BRANCH=$(git -C "$(dirname "$FILE_PATH")" branch --show-current 2>/dev/null)
if [ -z "$BRANCH" ]; then
  BRANCH=$(git -C "$CLAUDE_PROJECT_DIR" branch --show-current 2>/dev/null)
fi

if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  echo "You are editing source files on '$BRANCH'. Create a feature branch first." >&2
  exit 2
fi
exit 0
```

- [ ] **Step 4: Write `.claude/hooks/upstream-readonly.sh`**

```bash
#!/usr/bin/env bash
# Hook: upstream/inkweave is the pinned app submodule and is read-only here.
# Type: PreToolUse (Edit|Write). App changes belong in Doberjohn/inkweave;
# admin picks them up by bumping the pin (CLAUDE.md, "Updating the app pin").

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | node -e "
  let d = '';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    try { console.log(JSON.parse(d).tool_input?.file_path || ''); } catch { console.log(''); }
  });
")
FILE_PATH=$(echo "$FILE_PATH" | sed 's|\\|/|g')

case "$FILE_PATH" in
  */upstream/inkweave/*|upstream/inkweave/*)
    echo "upstream/inkweave is the pinned app submodule and is read-only here. Change the app in Doberjohn/inkweave, then bump the pin." >&2
    exit 2
    ;;
esac
exit 0
```

- [ ] **Step 5: Wire the hooks in `.claude/settings.json`**

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {"type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/git-write-protection.sh\""}
        ]
      },
      {
        "matcher": "Edit|Write",
        "hooks": [
          {"type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/branch-verification.sh\""},
          {"type": "command", "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/upstream-readonly.sh\""}
        ]
      }
    ]
  }
}
```

- [ ] **Step 6: Commit, restart the session, and prove the hooks fire**

```bash
git add .husky .claude
USER_APPROVED=1 git commit -m "chore: husky gates and Claude safety hooks (#ADM_P1)"
```

Restart the Claude session in `ADMIN` so the hooks load. Then check each of these:

| Try | Expected |
|---|---|
| `git commit --allow-empty -m probe` (no prefix) | Blocked: "Git commit detected..." |
| Edit tool on `upstream/inkweave/README.md` | Blocked: "upstream/inkweave is the pinned app submodule..." |
| On `main` (`git switch main`), Edit tool on `src/main.tsx` | Blocked: "You are editing source files on 'main'..." |

Afterwards run `git switch feature/ADM_P1-scaffold`, and make sure no probe edit or commit was left behind (`git status` is clean).

### Task 1.9: CLAUDE.md

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Write `CLAUDE.md`**

> **Superseded by #7:** the custom-domain bullet below says Standard Protection gates every `*.vercel.app` URL. It doesn't: production domains stay public, `inkweave-admin.vercel.app` included. Take the "Hosting and security" section from the repo's `CLAUDE.md` instead. It covers All Deployments, the pre-deploy protection check, the team-scoped `VERCEL_TOKEN` and the Git backstop.

````markdown
# inkweave-admin

Private admin tools for Inkweave. The public app is `Doberjohn/inkweave`, served at inkweave.ink. Design, plan and phase status: [docs/PLAN.md](docs/PLAN.md).

## How this repo relates to the app

- `upstream/inkweave` is the app repo as a git submodule, **pinned** to one commit and **read-only here** (a hook blocks edits). App changes go through the app repo; admin then bumps the pin. Never run `pnpm install` inside `upstream/`: a second `node_modules` there would give bridged files a second React.
- `src/app-bridge.ts` is the **only** file that may import from `upstream/` (lint-enforced). Add re-exports there; never deep-import app files anywhere else.
- Admin writes into the app repo **only through the GitHub API**: the tools commit to `master`, and reveal ingestion opens PRs. Never write into a local app checkout.
- The engine (`inkweave-synergy-engine`) is a pnpm workspace package built from the submodule (`pnpm build:engine`).
- Admin declares the app's full runtime dependency set at the app's exact versions. `pnpm check:deps` verifies this, and `pnpm check:deps --fix` aligns it.

## Commands

```bash
pnpm dev              # http://localhost:5180 (the app uses 5173-5175)
pnpm build            # engine + tsc -b + vite build
pnpm typecheck        # engine + tsc -b (includes every bridged app module)
pnpm lint
pnpm test             # vitest watch; pnpm test:run for one pass
pnpm check:deps       # dependency parity with the pinned app
```

## Updating the app pin

1. `git submodule update --remote upstream/inkweave`
2. `pnpm check:deps --fix` then `pnpm install`
3. `pnpm typecheck`, `pnpm test:run`, `pnpm build`
4. On a branch, commit `chore: bump upstream/inkweave to <short sha>` and open a PR.

Dependabot opens these PRs weekly. CI on them is the bridge's contract test.

## Hosting and security (non-negotiable)

- The Vercel project `inkweave-admin` is deployed only by `.github/workflows/deploy.yml` (`vercel deploy --prebuilt`). **Never install or run the Vercel CLI locally** (a cold install crashed this machine twice).
- **Never add a custom domain.** Standard Protection gates only `*.vercel.app` URLs, so a custom domain would make admin public. Every deploy runs `scripts/assert-login-gate.mjs` and fails if a URL answers an anonymous request.
- Secrets live in GitHub Actions secrets (plus Dependabot secrets for `APP_REPO_TOKEN`). The owner sets token values; never type a token.
- `forwarded-paths.json` is the single list of app paths forwarded to inkweave.ink. The Vite proxy reads it; `vercel.json` must match, and a test enforces that.
- Admin's own generated data lives under `/admin-data/`, never `/data/`, which is forwarded to the app.

## Environment

- Windows 11, Windows PowerShell 5.1 (no pwsh 7; no `&&`), Git Bash available.
- The origin remote uses the SSH alias `github-personal`. The submodule URL is relative (`../inkweave.git`), so it follows the alias locally and uses HTTPS in Actions.
- Node 24, pnpm 9.

## Git workflow

- Branches are `feature/<issue>-<desc>` or `fix/<issue>-<desc>`. Commit messages are semantic and include the issue reference.
- Commit and push only after the owner explicitly approves, with `USER_APPROVED=1` as the literal first characters of the command. Never pipe a commit or a push.
- Gates: `.husky` runs lint and tests on commit, and dependency parity plus typecheck on push. `.claude/hooks` provides git safety, the branch check and read-only `upstream/`.
````

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
USER_APPROVED=1 git commit -m "docs: admin repo working rules (#ADM_P1)"
```

### Task 1.10: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      # APP_REPO_TOKEN (read-only on both repos) fetches the private submodule.
      # Dependabot-triggered runs read Dependabot secrets, so the same token is
      # stored there too (Task 1.11).
      - uses: actions/checkout@v7
        with:
          submodules: true
          token: ${{ secrets.APP_REPO_TOKEN }}

      - uses: pnpm/action-setup@v6

      - uses: actions/setup-node@v7
        with:
          node-version-file: '.nvmrc'
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm check:deps
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test:run
      - run: pnpm build
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
USER_APPROVED=1 git commit -m "ci: build, lint, test and parity on every PR (#ADM_P1)"
```

### Task 1.11: Vercel project and secrets [confirm] [owner]

**Files:** none (external setup).

- [ ] **Step 1: [confirm] Create the Vercel project with the Vercel MCP**

Use `create_project` with name `inkweave-admin` and framework Vite, and **no Git repository connected** (deploys come only from Actions). Then call `get_project` with `inkweave-admin` and record:
- `id` as `PRJ_ID`;
- the `*.vercel.app` production domain as `ADMIN_URL`;
- whether `ssoProtection` is set.

- [ ] **Step 2: [confirm] Copy the app project's protection mode**

> **Superseded by #7:** set `ssoProtection.deploymentType` to `all` (All Deployments) instead of copying the app's mode, and never use the fallback in item 3. The app's `all_except_custom_domains` and the fallback's `prod_deployment_urls_and_all_previews` both leave production domains public. `deploy.yml` now refuses to deploy under any mode but `all`.

The app project `inkweave` uses `ssoProtection.deploymentType = "all_except_custom_domains"`. On 2026-09-25 that mode was verified to send its production `*.vercel.app` alias to Vercel login (302). The current API also names a `prod_deployment_urls_and_all_previews` mode, which may leave the production alias public, so don't rely on the new project's default.

1. Read the app project's value: `get_project` with `inkweave`.
2. Apply the same value to `inkweave-admin` with `update_project`.
3. If the API rejects the legacy value, use `prod_deployment_urls_and_all_previews` and rely on Task 1.14's assertion to prove it.
4. Call `get_project` again.

Expected: the admin project's `ssoProtection` equals the app project's, and `domains` lists only `*.vercel.app` names.

- [ ] **Step 3: [owner] Create the CI read token**

Create a fine-grained GitHub PAT named `inkweave-admin CI` with:
- repository access to `Doberjohn/inkweave` and `Doberjohn/inkweave-admin`;
- permission Contents read-only (Metadata read-only is automatic);
- an expiry of one year.

Store it in both secret stores. Each command prompts for the value, which the owner pastes:

```bash
gh secret set APP_REPO_TOKEN --repo Doberjohn/inkweave-admin
gh secret set APP_REPO_TOKEN --repo Doberjohn/inkweave-admin --app dependabot
```

- [ ] **Step 4: [owner] Create a Vercel token and store it**

Create the token in Vercel under Account Settings, Tokens, scoped to the owner's account, with an expiry of one year.

```bash
gh secret set VERCEL_TOKEN --repo Doberjohn/inkweave-admin
```

- [ ] **Step 5: [confirm] Store the identifiers**

These are ids, not credentials.

```bash
gh secret set VERCEL_ORG_ID --repo Doberjohn/inkweave-admin --body team_zt0iehfvsWxG6Ioe9k2jnf8G
gh secret set VERCEL_PROJECT_ID --repo Doberjohn/inkweave-admin --body PRJ_ID
gh variable set ADMIN_PRODUCTION_URL --repo Doberjohn/inkweave-admin --body https://ADMIN_URL
```

- [ ] **Step 6: Verify**

```bash
gh secret list --repo Doberjohn/inkweave-admin
gh secret list --repo Doberjohn/inkweave-admin --app dependabot
gh variable list --repo Doberjohn/inkweave-admin
```

Expected:
- Actions secrets: `APP_REPO_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN`.
- Dependabot secrets: `APP_REPO_TOKEN`.
- Variables: `ADMIN_PRODUCTION_URL`.

### Task 1.12: `vercel.json` and the deploy workflow (TDD for the path sync)

**Files:**
- Create: `vercel.json`, `.github/workflows/deploy.yml`
- Test: `scripts/forwarded-paths.test.mjs`

- [ ] **Step 1: Write the failing test**

`scripts/forwarded-paths.test.mjs`:

```js
// @vitest-environment node
import fs from 'node:fs';
import {describe, expect, it} from 'vitest';

const readJson = (file) => JSON.parse(fs.readFileSync(new URL(file, import.meta.url), 'utf8'));
const forwarded = readJson('../forwarded-paths.json');
const vercel = readJson('../vercel.json');

describe('forwarded app paths', () => {
  it('rewrites every forwarded path to the public app', () => {
    for (const prefix of forwarded.paths) {
      expect(vercel.rewrites).toContainEqual({
        source: `${prefix}:path*`,
        destination: `${forwarded.origin}${prefix}:path*`,
      });
    }
  });

  it('forwards nothing else to an external origin', () => {
    const external = vercel.rewrites.filter((rewrite) => rewrite.destination.startsWith('http'));
    expect(external).toHaveLength(forwarded.paths.length);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm exec vitest run scripts/forwarded-paths.test.mjs`
Expected: FAIL with `ENOENT` on `vercel.json`.

- [ ] **Step 3: Write `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "rewrites": [
    {"source": "/data/:path*", "destination": "https://inkweave.ink/data/:path*"},
    {"source": "/card-images/:path*", "destination": "https://inkweave.ink/card-images/:path*"},
    {"source": "/card-images-preview/:path*", "destination": "https://inkweave.ink/card-images-preview/:path*"},
    {"source": "/fonts/:path*", "destination": "https://inkweave.ink/fonts/:path*"},
    {"source": "/(.*)", "destination": "/index.html"}
  ],
  "headers": [
    {"source": "/(.*)", "headers": [{"key": "X-Robots-Tag", "value": "noindex, nofollow"}]}
  ]
}
```

- [ ] **Step 4: Run the test**

Run: `pnpm exec vitest run scripts/forwarded-paths.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Write `.github/workflows/deploy.yml`**

```yaml
# Admin deploy (docs/PLAN.md, D4). Vercel cannot clone the private submodule,
# so the build runs here and ships with `vercel deploy --prebuilt`, mirroring
# the app's own deploy workflow. The last step fails the run if any admin URL
# answers an anonymous request: Vercel login is the whole security model.
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: deploy-admin
  cancel-in-progress: false

# Pinned for the same reason as the app's deploy.yml: unpinned `npx vercel`
# can straddle two CLI versions inside one job.
env:
  VERCEL_CLI_VERSION: '60.0.0'

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
    steps:
      - uses: actions/checkout@v7
        with:
          submodules: true
          token: ${{ secrets.APP_REPO_TOKEN }}

      - uses: pnpm/action-setup@v6

      - uses: actions/setup-node@v7
        with:
          node-version-file: '.nvmrc'
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Pull Vercel production settings
        run: npx "vercel@${VERCEL_CLI_VERSION:?}" pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build
        run: npx "vercel@${VERCEL_CLI_VERSION:?}" build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy prebuilt output to production
        id: deploy
        run: |
          url=$(npx "vercel@${VERCEL_CLI_VERSION:?}" deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }})
          echo "url=$url" >> "$GITHUB_OUTPUT"

      - name: Assert every admin URL is behind Vercel login
        run: node scripts/assert-login-gate.mjs "${{ steps.deploy.outputs.url }}" "${{ vars.ADMIN_PRODUCTION_URL }}"
```

- [ ] **Step 6: Commit**

```bash
git add vercel.json .github/workflows/deploy.yml scripts/forwarded-paths.test.mjs
USER_APPROVED=1 git commit -m "ci: deploy behind Vercel login and assert the gate (#ADM_P1)"
```

### Task 1.13: Dependabot for the pin

**Files:**
- Create: `.github/dependabot.yml`

npm updates are deliberately **not** enabled. Admin's versions follow the app's through the parity check, so an independent npm bump would always fail `check:deps`.

- [ ] **Step 1: Write `.github/dependabot.yml`**

```yaml
version: 2
registries:
  app-repo:
    type: git
    url: https://github.com
    username: x-access-token
    password: ${{secrets.APP_REPO_TOKEN}}
updates:
  - package-ecosystem: gitsubmodule
    directory: /
    registries:
      - app-repo
    schedule:
      interval: weekly
    commit-message:
      prefix: chore
```

- [ ] **Step 2: Commit**

```bash
git add .github/dependabot.yml
USER_APPROVED=1 git commit -m "ci: weekly Dependabot bumps of the app pin (#ADM_P1)"
```

### Task 1.14: PR, deploy, and proof

- [ ] **Step 1: Full local run**

```bash
pnpm check:deps
pnpm typecheck
pnpm lint
pnpm test:run
pnpm build
git -C upstream/inkweave status --porcelain
```

Expected:
- every command exits 0;
- the tests report 15 passing (5 parity, 3 tool index, 2 boundary, 3 login gate, 2 forwarded paths);
- the last command prints nothing.

- [ ] **Step 2: Push the branch and open the PR (owner approval first)**

```bash
USER_APPROVED=1 git push -u origin feature/ADM_P1-scaffold
gh pr create --repo Doberjohn/inkweave-admin --base main --title "Scaffold the admin repo behind Vercel login" --body "Closes #ADM_P1. Plan: docs/PLAN.md (Phase P1)."
```

- [ ] **Step 3: CI is green on the PR**

Read it once with the ccd_pr tools after binding the PR. A checkout failure on the submodule means `APP_REPO_TOKEN` lacks access to one of the two repos.

- [ ] **Step 4: The owner merges, and the Deploy run passes, including its last step**

```bash
gh run list --repo Doberjohn/inkweave-admin --workflow deploy.yml --limit 1
```

Expected: `completed success`. Its log shows two `gated` lines, one for the deployment URL and one for `ADMIN_PRODUCTION_URL`.

> **Superseded by #7:** the protection step, which runs before the install, lists every project domain. The last step prints one `gated` line per distinct URL: the deployment URL, `ADMIN_PRODUCTION_URL` and each listed domain. Any other result fails the run.

- [ ] **Step 5: Independent check from this machine**

```bash
node scripts/assert-login-gate.mjs "$(gh variable get ADMIN_PRODUCTION_URL --repo Doberjohn/inkweave-admin)"
```

Expected: `gated ... -> 302 https://vercel.com/sso-api?...`

**If the production alias is `EXPOSED`, stop.** P1 serves nothing sensitive, which is why the gate is proven now, before P2 ports any tool. In that case:
1. Change `deploy.yml` to deploy without `--prod` (preview deployments are gated under every protection mode).
2. Use the per-deployment URL until the owner picks a fix. Candidates: the `all` protection mode (plan-dependent) or a different host.
3. Record the finding on `#ADM_P1`.

> **Superseded by #7:** this happened on the first deploy. The fix isn't preview-only deploys: set Deployment Protection back to **All Deployments** (Project → Security → Deployment Protection; free on every plan since 2026-09-09), then rerun the command above against `ADMIN_PRODUCTION_URL`. The deploy workflow now refuses to ship under any other mode.

- [ ] **Step 6: Owner's eye**

The owner opens `ADMIN_PRODUCTION_URL` while logged in to Vercel and sees the tool index. It should look as it did at `localhost:5180`, with fonts loading through the rewrite. "Open current page" on Reveal publisher should open `inkweave.ink/admin/reveal`.

- [ ] **Step 7: Dependabot can see the submodule (within a week)**

A PR titled "chore: bump upstream/inkweave from X to Y" appears once the app's `master` moves, and CI on it is green.

If Dependabot reports a registry or access error under Insights, Dependency graph, Dependabot, use the manual routine in `CLAUDE.md` ("Updating the app pin") and note the failure on `#ADM_P1`.

---

## Phases P2 to P6: outline

Each phase gets its own detailed plan (writing-plans) when it starts, built from this outline and the spec.

### P2: Port the tools (admin repo, `#ADM_P2`)

**Routing and shell**
- Add `react-router-dom` routes: `/` (tool index), `/reveal`, `/image`, `/tuning`, `/analytics`, `/banner/:cardId`.
- Build an `AdminShell` layout with tool navigation and no public nav, Vercel Analytics or Speed Insights.
- Mount the bridged `CardDataProvider` in the shell.

**Code to move**
- Port `apps/web/src/features/{reveal-admin,image-admin,tuning-admin,admin-analytics}`, their pages and their tests and stories into `src/tools/*`.
- Port the four admin-only shared modules (`githubCommit`, `useGithubToken`, `GithubTokenGate`, `ImageUploadTile`) into `src/github/` and `src/components/`.
- Port the banner generator: `BannerPage`, `SynergyBanner`, `export-banner.mjs`, `BANNER.md`, and `public/art/banner/`. Point the exporter at port 5180.

**Behaviour changes**
- Extend the bridge re-exports: `CardTile`, `smallImageUrl`, `CardDataProvider`/`useCardDataContext`, `TabList`, `useContainerWidth`, `transformCard`, `synergyEngine`, engine types, and `REVEAL_*`/`ALL_INKS`/`inkBlock` constants. Add the skeleton stylesheet.
- Make the target branch a setting: `VITE_ADMIN_TARGET_BRANCH`, default `master`. `githubCommit` reads it.
- The tuning tool reads `tuning.json` live through the GitHub API (raw media type) instead of the bundled `TUNING`.
- Rename the analytics data fetches from `/data/*.json` to `/admin-data/*.json`.
- Add further forwarded paths only as ported tools need them (for example `/art/`). Update `forwarded-paths.json` and `vercel.json` together; the test enforces it.

**Checks**
- Ported files must pass the design-token rules outright, because admin has no ledger. Decide in the P2 plan whether to converge each file while porting (preferred) or seed an admin-side ledger for specific files.
- Storybook runs locally for the ported stories.
- Verification:
  - `VITE_ADMIN_TARGET_BRANCH=admin-verify` on a preview deployment;
  - one reveal, one image and one tuning write land on a throwaway app branch `admin-verify`, which is then deleted;
  - the owner opens every tool on the deployed admin.

### P3: Pipelines (admin repo, `#ADM_P3`)

**Analytics**
- Add a `schedule` trigger (nightly) to `deploy.yml`.
- Before `vercel build`, check out the app's current `master` into `app-master/` with `APP_REPO_TOKEN`, separately from the pin. Build its engine, run `precompute-synergies`, then the two analytics precomputes (ported from the app repo into `scripts/`), writing into `public/admin-data/`.
- Rename the script's `VERCEL_PROJECT_ID` to `ANALYTICS_VERCEL_PROJECT_ID`.
- Store the Actions secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_ANALYTICS_TOKEN`, `ANALYTICS_VERCEL_PROJECT_ID`.

**Reveal ingestion**
- Port `scripts/reveal-sync/**` (including `state.json`) and the `fetch-reveals` skill into admin's `.claude/skills/`.
- Replace the write phase: convert scans to AVIF with the submodule's `scripts/convert-preview-images.mjs`, then create a branch in the app repo, commit `previewCards.json` and the AVIFs through the Git Data API, and open the PR with `gh`.
- Replace the `run.mjs start` preconditions with a check that `previewCards.json` on the app's `master` has not moved since the run started.
- Run a rehearsal against a throwaway branch.

**Docs**
- Write the admin reveal runbook (the ops half of `docs/reveals/START_REVEAL_SEASON.md`).
- Update the user-level `scan-reveal-card` skill's URL to the admin site.

### P4: Cutover (app repo, `#APP_P4`)

- Delete and edit exactly the lists in spec sections 6.1 and 6.2, on a `feature/APP_P4-...` branch in `APP_WT`.
- Run `pnpm analyze` before and after, and record the change in user-facing JS.
- Verify spec section 6.3 in production.

### P5: Security follow-through (`#ADM_P5`)

- New fine-grained PAT (Contents read/write on `Doberjohn/inkweave`, with an expiry date) entered on the admin origin; the old PAT revoked in GitHub settings.
- The `inkweave.reveal-admin.gh-token` entry cleared on `inkweave.ink` in each of the owner's browsers.
- Whichever of these are set get removed from the app's Vercel env: `SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_ANALYTICS_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_ANALYTICS_WINDOW_DAYS`, `VITE_SHOW_ADMIN_ANALYTICS`.

### P6: Reconcile deck-builder (`#APP_P6`)

When `deck-builder` next merges `master`:
- keep the deletions in the edit/delete conflicts (6 admin-analytics components, `AdminAnalyticsPage.tsx`, `admin-analytics.spec.ts`, `router.tsx`);
- expect a conflict on the `build:vercel` line in `package.json`, which `deck-builder` also changes;
- carry any still-useful admin-analytics edits into admin;
- update `docs/deck-builder/PLAN.md`, #453 and #456 so `/admin/deck-lab` and advisor-copy tuning live in the admin repo.

While that epic is unmerged, deck-lab work in admin can pin the submodule to a `deck-builder` commit.
