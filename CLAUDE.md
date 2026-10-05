# inkweave-admin

Private admin tools for Inkweave. The public app is `Doberjohn/inkweave`, served at inkweave.ink. Design, plan and phase status: [docs/PLAN.md](docs/PLAN.md).

## How this repo relates to the app

- `upstream/inkweave` is the app repo as a git submodule, **pinned** to one commit and **read-only here** (a hook blocks edits). App changes go through the app repo; admin then bumps the pin. Never run `pnpm install` inside `upstream/`: a second `node_modules` there would give bridged files a second React.
- `src/app-bridge.ts` is the **only** source file that may import from `upstream/` (lint-enforced; the one exception is `eslint.config.js`, which loads the app's design-token plugin). Add re-exports there; never deep-import app files anywhere else.
- Admin writes into the app repo **only through the GitHub API**: the tools commit to `master`, and reveal ingestion opens PRs. Never write into a local app checkout.
- The engine (`inkweave-synergy-engine`) is a pnpm workspace package built from the submodule (`pnpm build:engine`). `typecheck`, `build` and `test:run` build it themselves; run it once before `pnpm dev` on a fresh clone or after a pin bump.
- Admin declares the app's full runtime dependency set at the app's exact versions. `pnpm check:deps` verifies this, and `pnpm check:deps --fix` aligns it.

## The tools

- `src/tools/{reveal,image,tuning,analytics}` hold the tools, `src/github/` the GitHub read/write layer, `src/theme/` and `src/ui/` admin's theme and UI primitives, `src/charts/` the chart kit, and `src/shell/` the layout every route renders in: a collapsible sidebar, which remembers its state per browser, and `PageLayout`, the header every page renders through. The kit is hand-built SVG on the admin theme, with no chart library, and every new chart builds on it. `Sparkline`, `MeterBar` and `BiasBar` stay `src/ui` primitives. A new chart follows the `dataviz` skill's guidance (its mark specs, one tooltip that the keyboard reaches too, a Chart | Table toggle, one y axis) and the redesign's chart decisions, R-9 and R-12 to R-15. Where they differ, the decisions win: R-14 keeps Tinos on headline numbers and R-15 keeps the brand colours. How the tools were ported: [docs/plans/P2-port-tools.md](docs/plans/P2-port-tools.md). The redesign, phase by phase: [docs/plans/R-redesign.md](docs/plans/R-redesign.md).
- Routes: the Overview at `/`, the insights pages `/calibration`, `/activity` and `/web`, and the write tools `/reveal` and `/image`. `/calibration` writes too: its aside is the tuning editor. `src/shell/nav.ts` lists the sidebar's items and marks the ones that write (`writes`). `src/router.tsx` also redirects retired paths: `/analytics` goes to `/`, and `/tuning` to `/calibration`. The insights pages read `/admin-data/` only through `fetchAdminData`, which keeps each file's promise for the session (`src/test/setup.ts` empties it before every test).
- The reveal, image and tuning tools commit to `Doberjohn/inkweave` on `VITE_ADMIN_TARGET_BRANCH`, which defaults to `master`. Reveal and tuning also read the files they edit (`previewCards.json`, `tuning.json`) from that branch; card lists come from `inkweave.ink` through the forwarded `/data/`. To rehearse writes, create a throwaway branch in the app repo and set the variable in `.env.local` (`.env.example` has the line). Every page that writes names the branch in its header (`BranchNotice`, from `targetBranch()`), and read-only pages don't. A new write page sets `writes: true` in `nav.ts` (the sidebar's token box, through `isWritePath`) and passes `writes` to its `PageLayout` (the branch notice).
- Write pages sit behind `GithubTokenGate`; on `/calibration` only the tuning aside does, so the analytics need no token. `useGithubToken` is one store shared by every component, so the sidebar's token box (on write pages, once a token is saved) and its "Forget token" act on every page at once. A page that holds unsaved edits mounts one `UnsavedChangesGuard` (`src/shell/`), which asks before leaving it. The guard needs the data router, so tests render that page with `createMemoryRouter`, never the `MemoryRouter` wrapper.
- Admin files pass the app's design-token rules in full, with no exception. Admin's palette and scales live in `src/theme/adminTheme.ts` (`ADMIN_COLORS`, `ADMIN_TYPE`, `ADMIN_RADIUS`, `ADMIN_LAYOUT`), composed only from bridged tokens: add a value there, never a literal in a component. Hover, focus and selected states come from one scoped stylesheet, `src/theme/AdminStyles.tsx` (`adm-*` classes), whose rules interpolate the same tokens. Data text is never `COLORS.textDim`, which fails contrast on these surfaces, and mono text is a bare `<code>`. Buttons are the app's kit through the bridge (`CtaButton`, `LinkButton`) or a native `<button className="adm-…">`, never a styled `<button>`.

## Pipelines

- **Analytics.** The Deploy workflow runs nightly (04:00 UTC), on every push to `main`, and on demand (`gh workflow run deploy.yml --repo Doberjohn/inkweave-admin`). It checks out the app's `master` into `app-master/`, builds that engine and its synergy data, and runs `scripts/precompute-{vote,vercel}-analytics.mjs`. Those write `public/admin-data/`, which ships inside the login-gated deployment. `app-master/` and `public/admin-data/` are git-ignored; locally the insights pages show their "not generated" state. To see real data locally, the owner saves the deployment's three `/admin-data/` files into `public/admin-data/` ("Seeing R1 with real data locally" in [docs/plans/R-redesign.md](docs/plans/R-redesign.md)); never commit them. How it was built: [docs/plans/P3-pipelines.md](docs/plans/P3-pipelines.md).
- **Reveal ingestion.** `/fetch-reveals` runs from an admin session (`.claude/skills/fetch-reveals/`, `scripts/reveal-sync/`). Its `write` opens a PR in the app from a `reveals/…` branch and commits `scripts/reveal-sync/state.json` straight to `main`; CI and Deploy skip a push that changes only that file. It reads the season through `src/app-bridge.ts`, so bump the pin when the app rotates the season. Runbook: [docs/REVEAL_RUNBOOK.md](docs/REVEAL_RUNBOOK.md).
- **Variant printings.** Epic, Enchanted and Iconic printings are never cards. `node scripts/reveal-sync/variants.mjs stage <numbers>` checks and stages them, and `publish <run>`, run only once the owner approves, opens a `reveals/set<N>-variants-…` PR in the app. It never writes `state.json`. Runbook: "Variant printings from admin".
- **Secrets.** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_ANALYTICS_TOKEN` and `ANALYTICS_VERCEL_PROJECT_ID` (the app's Vercel project: in the workflow, `VERCEL_PROJECT_ID` names admin's own). The owner sets them.
- **Logs.** The precomputes log the files they write, never vote, voter or event counts: a public repo's workflow logs are public.

## Commands

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

## Updating the app pin

1. `git submodule update --remote upstream/inkweave` (it moves the pin, so a hook requires the owner's approval and the `USER_APPROVED=1` prefix)
2. `pnpm check:deps --fix` then `pnpm install`
3. `pnpm typecheck`, `pnpm test:run`, `pnpm build`
4. On a branch, commit `chore: bump upstream/inkweave to <short sha>` and open a PR.

Dependabot opens these PRs weekly. CI on them is the bridge's contract test.

## Hosting and security (non-negotiable)

- The Vercel project `inkweave-admin` is deployed only by `.github/workflows/deploy.yml` (`vercel deploy --prebuilt`). It has no Git connection. If one is added again, `vercel.json` still keeps Git-triggered deployments off (`git.deploymentEnabled: false`). **Never install or run the Vercel CLI locally** (a cold install crashed this machine twice).
- **Deployment Protection stays on All Deployments.** Standard Protection leaves production domains public, `inkweave-admin.vercel.app` included (#7). Every deploy refuses to ship unless the project uses All Deployments (`scripts/vercel-project-urls.mjs`). It then fails if the new deployment, `ADMIN_PRODUCTION_URL` or any of the project's domains answers an anonymous request (`scripts/assert-login-gate.mjs`).
- **Never add a custom domain.** Admin doesn't need one, and every production domain would become public if protection ever dropped back to Standard.
- Secrets live in GitHub Actions secrets (plus Dependabot secrets for `APP_REPO_TOKEN`). The owner sets token values; never type a token.
- `VERCEL_TOKEN` has team scope (All Projects) and is shared with the app repo's deploy, because `vercel pull` rejects project-only tokens. Rotate it in both repos together.
- `forwarded-paths.json` is the single list of app paths forwarded to inkweave.ink. The Vite proxy reads it; `vercel.json` must match, and a test enforces that.
- Admin's own generated data lives under `/admin-data/`, never `/data/`, which is forwarded to the app.

## Environment

- Windows 11, Windows PowerShell 5.1 (no pwsh 7; no `&&`), Git Bash available.
- The origin remote uses the SSH alias `github-personal`. The submodule URL is relative (`../inkweave.git`), so it follows the alias locally and uses HTTPS in Actions.
- Node 24, pnpm 9.

## Git workflow

- Branches are `feature/<issue>-<desc>` or `fix/<issue>-<desc>`. Commit messages are semantic and include the issue reference.
- Commit and push only after the owner explicitly approves, with `USER_APPROVED=1` as the literal first characters of the command. Never pipe a commit or a push. Run them with the Bash tool: the hooks also watch PowerShell, which cannot carry the prefix, so a commit or push there is always blocked.
- Gates: `.husky` runs lint and tests on commit, and dependency parity plus typecheck on push. `.claude/hooks` provides git safety, the branch check and read-only `upstream/` (file edits, and git writes run there from Bash or PowerShell). When you change a hook, add cases to `scripts/check-hooks.mjs` and run `pnpm check:hooks`.
