# inkweave-admin

Private admin tools for Inkweave. The public app is `Doberjohn/inkweave`, served at inkweave.ink. Design, plan and phase status: [docs/PLAN.md](docs/PLAN.md).

## How this repo relates to the app

- `upstream/inkweave` is the app repo as a git submodule, **pinned** to one commit and **read-only here** (a hook blocks edits). App changes go through the app repo; admin then bumps the pin. Never run `pnpm install` inside `upstream/`: a second `node_modules` there would give bridged files a second React.
- `src/app-bridge.ts` is the **only** file that may import from `upstream/` (lint-enforced). Add re-exports there; never deep-import app files anywhere else.
- Admin writes into the app repo **only through the GitHub API**: the tools commit to `master`, and reveal ingestion opens PRs. Never write into a local app checkout.
- The engine (`inkweave-synergy-engine`) is a pnpm workspace package built from the submodule (`pnpm build:engine`). `typecheck`, `build` and `test:run` build it themselves; run it once before `pnpm dev` on a fresh clone or after a pin bump.
- Admin declares the app's full runtime dependency set at the app's exact versions. `pnpm check:deps` verifies this, and `pnpm check:deps --fix` aligns it.

## Commands

```bash
pnpm dev              # http://localhost:5180 (the app uses 5173-5175)
pnpm build            # engine + tsc -b + vite build
pnpm typecheck        # engine + tsc -b (includes every bridged app module)
pnpm lint
pnpm test             # vitest watch; pnpm test:run for one pass (builds the engine first)
pnpm check:deps       # dependency parity with the pinned app
```

## Updating the app pin

1. `git submodule update --remote upstream/inkweave` (it moves the pin, so a hook requires the owner's approval and the `USER_APPROVED=1` prefix)
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
- Commit and push only after the owner explicitly approves, with `USER_APPROVED=1` as the literal first characters of the command. Never pipe a commit or a push. Run them with the Bash tool: the hooks also watch PowerShell, which cannot carry the prefix, so a commit or push there is always blocked.
- Gates: `.husky` runs lint and tests on commit, and dependency parity plus typecheck on push. `.claude/hooks` provides git safety, the branch check and read-only `upstream/` (file edits, and git writes run there from Bash or PowerShell).
