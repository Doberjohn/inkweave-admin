> Part of [R: Admin redesign](../R-redesign.md), phase R4 ([R4-card-studio.md](R4-card-studio.md)). Read the main plan's decisions (R-57 to R-91 for R4), corrections, global constraints and shared interfaces, then the R4 header, first.

> **Re-base notes (R4-8, 2026-10-07).** A new task, the controller's. The 2026-10-01 outline had no closing step: its R4-7 said "After opening the PR", but no step opened one (audit, R4-7's blocking item). R3 closed with R3-9 ([R3-09-docs-check.md](R3-09-docs-check.md)), and this task follows its model. What it does, and why:
> 1. **It closes R4, and with it the redesign.**
>    - It confirms every task landed and sweeps for what R4 deletes, the layer boundaries and stale names.
>    - It reads the interfaces as built, then checks Storybook, `pnpm build`, `check:deps` and `analyze_change_set`.
>    - It runs the parallel final review, then drafts the follow-ups.
>    - It writes "R4 as built", and retires the handoff (R-88).
>    - It pushes, opens the PR and reads its checks. After the merge: Deploy, the owner's `/studio` smoke test, #32 checked (its keyword closes it), and #14 and #24 closed by hand (R-87).
>
>    Base: `main @ e5e5029`, pin `16283a13`.
> 2. **No real-data check of analytics.** R4 reads no `/admin-data/` file. Its live check is the owner's rehearsal (R-86). It is owner-held and runs between R4-6c and R4-7, because only the owner enters a token and the throwaway branch is an app-repo write. This task records its results (Step 8). The controller never enters a token, so its own browser checks are token-free:
>    - Step 7: the gate under the page's header, the two redirects, "Edit in Card studio", and no GitHub request without a token;
>    - Step 5: Storybook at 1600, 1440 and 1366px and phone width. The wide studio layout needs a window of about 1600px with the sidebar open (R-64).
> 3. **Gates once (owner rule).**
>    - Step 4 runs `pnpm build`, which no task and no hook runs (only CI does), and `pnpm check:deps`, which takes seconds here and runs again in the pre-push hook.
>    - `lint` and `test:run` run in every commit's pre-commit hook, this task's own commits included.
>    - `typecheck` (and `check:deps`) run in the pre-push hook.
>    - The header's Tasks row already says so ("the hooks run lint, `test:run` and typecheck").
> 4. **CLAUDE.md is R4-7's** (the header's R4-7 row: tools, routes and guard lines). This task checks those lines against the code as it stands after the fix wave (Step 12). It commits `docs: describe Card studio as built (#24)` only when a fix-wave commit changed something R4-7 describes, as the header's task-order table now marks it ("only if its Step 12 finds a gap").
> 5. **Retiring the handoff (R-88) needs the folder out of the working copy first.**
>    - The pre-commit hook runs `eslint .` (`package.json:12`). ESLint doesn't read `.git/info/exclude`.
>    - Once `eslint.config.js` drops its `docs/redesign/` ignore, it lints `docs/redesign/handoff/support.js` with the `**/*.{js,mjs}` block (Node globals). Run on 2026-10-07 with `--no-ignore`, that gave 67 errors (`'document' is not defined`, `'window' is not defined`).
>    - So Step 16 has the owner move `docs/redesign/` out of the repo before the commit, and the owner deletes it after the merge, as R-88 says.
>    - The Spec paragraph (`R-redesign.md:15`) is rewritten whole, because its first sentence names paths that will no longer exist.
>    - `adminTheme.test.ts:37`'s comment keeps the values' source without the path.
> 6. **Issues (R-87, R-80, R-83).**
>    - **#32.** R4-5h's commit body carries "Closes #32.", and the PR body repeats it, so #32 closes at the merge. Step 19 checks it, because keywords have failed here before.
>    - **#14 and #24.** They close by hand after the deploy, on the owner's word, each with a comment naming the PR and the merge sha. No keyword closes them. #24 also gets its R4 box ticked.
>    - **#14's comment** says that printings stay a hand edit (R-80).
> 7. **Follow-ups (Step 11).** Each is filed only on the owner's word:
>    - R-62's app-docs issue, after the merge;
>    - R-77 (per-row revert), R-80 (a printing's English refresh) and drag-and-drop upload (R-89), each only if wanted;
>    - one issue for the final review's minors, as #34 did for R3;
>    - R4-6b's open defect (focus after "Leave this page" on a card change), unless the fix wave takes it (Steps 9 and 10).
>
>    The admin ones are filed before the plan record, so their numbers land in "R4 as built". That avoids R3's extra `docs(plan)` commit.
> 8. **The final review** runs in parallel, read-only, one reviewer per dimension, with verifiers and a completeness critic. This is R3's shape (`wf_89cd5be9-5bb`: 59 min, 23 agents) and the sdd-gates-once rule.
>    - **Important findings** go to a fix wave, on the owner's word.
>    - **Minor findings** go to one follow-up issue.
>
>    Checks come first and docs last (R3-9 note 2): the fix wave can change an interface, so the records are read from the code after it.
> 9. **Plan records.**
>    - **The plan commit (R4-0) recorded R4's planned contract,** as R3's did. Step 13 compares it with the code, and the code wins. Several task files hand records to "R4-0, or R4-8 if R4-0 didn't"; Appendix A lists them.
>    - **"R4 as built"** is appended at the end of `R-redesign.md`, since R4 is the last phase.
>    - **Status, the Roadmap row and the Phase R4 heading** are replaced whole, matched by their starts, whatever R4-0 left.
> 10. **Code Health.** This task adds no function.
>     - Its two code-file edits remove one config entry (`eslint.config.js`) and reword one comment (`adminTheme.test.ts`), so 0 primitive parameters.
>     - `analyze_change_set` runs once all the code is in (Step 6), and again after any fix wave.
>     - The PR's "CodeScene Code Health Review (main)" check is the real gate (Step 17). It failed R1 and R2 on files the local tool passed.
> 11. **Verified (2026-10-07, on `b490fb7` plus the uncommitted pin bump to `16283a13`):**
>     - **The anchors.** In `docs/plans/R-redesign.md`, each of these matched exactly once: the Spec paragraph's start, the Roadmap sentence "The owner plans further changes … R2–R4 are detailed only when each starts.", the R4 row's start, `## Phase R4: Card studio` and `**Status:**`. R4-0's listed edits (the header's Conventions) touch none of the first two.
>     - **The two code edits.** Each, applied to a scratch copy (`sandbox-R4-8/`), passes `pnpm exec eslint --max-warnings 0 --stdin` against the repo's config: `eslint.config.js` with lines 32-34 replaced, and `adminTheme.test.ts` with line 37 replaced. `support.js` failed with 67 errors under `--no-ignore` (note 5).
>     - **The commands.** Each was run on today's tree.
>       - The boundary greps (with #37's nested `(\.\./)+` form) print nothing.
>       - The deleted-file `diff` runs, and lists all 23 paths as still present.
>       - The class `comm`, the story loop and the closing-keyword scan print nothing.
>       - Today, the deleted-names sweep prints the 23 files R4-6c deletes, plus the bridge's three webps, `BreakdownCards.tsx`, `router.tsx` and `AdminShell.test.tsx`, which R4-5h and R4-6c change. The barrel pattern matches `'./tools/reveal'`, `'../reveal'` and `'../../tools/image'` (checked on sample lines), and prints nothing today.
>       - The stale-wording sweep is R4-7 Step 9's `rg` command (R4-7's hand-off asks for it), which the Bash tool's shell provides. Today it prints 49 lines, from the files R4-6c and R4-7 change. The `git grep` version first drafted here missed four of them (`fetch-reveals/SKILL.md:324`, `.env.example:4`, `REVEAL_RUNBOOK.md:36` and the bridge's "reveal tool" comment).
>       - The play-function grep is `(^|[^A-Za-z])play:`: a bare `play:` also matched every story's `display:`. Today it prints `CardSwitcher.stories.tsx` and `OverviewView.stories.tsx`.
>     - **The sibling drafts (verifier, 2026-10-07).** Step 1's module lists, Step 3's expected lists, Step 5's story list and names, the Storybook hand-offs, the guard's record greps (R4-5s's `UnsavedMessage`), Step 8's rehearsal items and Appendix A were re-read against R4-1a to R4-7 as drafted, R4-6b's partial draft included. A later pass (cross-task critic, 2026-10-07) re-read R4-6b's finished draft: its hand-offs to R4-8 (Appendix A's row), its two rehearsal checks (Step 8, items 7 and 8) and its open focus defect (Steps 9, 10, 11 and 14).
>     - **The Storybook widths snippet** passes `node --check`. It extends R1-12's smoke script, which ran in R1 and R3. Its overflow reading couldn't run before the stories exist.
>     - **The app's docs.** `CLAUDE.md:225` and `docs/reveals/START_REVEAL_SEASON.md` were read at the pin, `16283a13`, and through Step 11's own `gh api` reads of app `master`. Both printed the same lines. Admin#22 is the variant-printings issue the R-62 draft cites. Step 11 re-reads app `master` before filing.
>     - **The #24 commands.** Step 19's state read and its `sed` tick ran read-only against #24's body: they print its R4 line, then four ticked boxes. The edit itself wasn't sent.

### Task R4-8: Close R4

**Files:**
- **Modify (commit `docs(plan): record R4 as built (#24)`):** `docs/plans/R-redesign.md`:
  - the **Status:** paragraph;
  - the Roadmap's R4 row, and the sentence under the table;
  - the `## Phase R4` heading;
  - any record the code changed (Step 13);
  - a new `### R4 as built (<date>)` at the end.
- **Modify (commit `chore(redesign): retire the design handoff (#24)`, the branch's last planned commit, R-88):**
  - `eslint.config.js:32-34`;
  - `docs/plans/R-redesign.md:15`, the **Spec:** paragraph;
  - `src/theme/__tests__/adminTheme.test.ts:37`.
- **Modify only if Step 12 finds a gap** (commit `docs: describe Card studio as built (#24)`): `CLAUDE.md`.
- **Check, no change expected:**
  - `docs/PLAN.md` (D10 at `:75`, the Status line at `:17`);
  - `README.md` and `docs/REVEAL_RUNBOOK.md`;
  - `.claude/skills/fetch-reveals/SKILL.md`, `.env.example` and `src/vite-env.d.ts` (all R4-7's);
  - `.storybook/preview.tsx`, which mounts `AdminStyles` for every story.
- **Outside the repo (the owner's):**
  - `docs/redesign/` moves out of the working copy before Step 16, and is deleted after the merge, along with `.git/info/exclude`'s two handoff lines;
  - the rehearsal's throwaway app branch, deleted after the rehearsal;
  - the user-level `scan-reveal-card` skill edit (R4-7).
- **Ledger** (git-ignored, `.superpowers/sdd/R-redesign/`): `review-final-r4.diff`, `final-review-r4.json`, `final-fix-r4-brief.md`, `r4-followup-issues.md` and `r4-pr-body.md`.
- **Test:** none new. The checks are:
  - the sweeps and the build;
  - Storybook, and the token-free browser run;
  - `analyze_change_set`;
  - the rehearsal's record and the final review;
  - each commit's hook.

**Interfaces:**
- **Consumes:**
  - every R4 task as committed, R4-7 included;
  - the R4 contract as the plan commit recorded it in `docs/plans/R-redesign.md`, and the header's contract additions 1 to 14;
  - the task files' hand-offs to R4-8 (Appendix A, and Step 3's grep);
  - the rehearsal's record;
  - from the ledger, the audit's parity list (`r4-audit-full.json`, `parity.capabilities`) and the global constraints (`global-constraints.md`).
- **Produces:**
  - no code module. Hand count: 0 primitive parameters (two edits, neither a function);
  - the docs edits below, the follow-up drafts, the R4 PR, and the closing comments on #14 and #24.

- [ ] **Step 1: Confirm every R4 task landed (what this task builds on)**

Make sure the base is current, then read the branch. Run in Git Bash:

```bash
cd /d/johnn/Projects/inkweave-admin
git fetch origin
git branch --show-current
git status --short
git rev-parse main origin/main
git log --oneline HEAD..origin/main
git submodule status upstream/inkweave
git log --oneline --reverse main..HEAD
git log --no-merges --format=%s main..HEAD | grep -vc '(#24)$'
git log --format='%h %s%n%b' main..HEAD | grep -nE "([Cc]lose[sd]?|[Ff]ix(e[sd])?|[Rr]esolve[sd]?) #[0-9]+"
```

Expected:
- **The branch** is `feature/24-redesign-r4`, and `git status` prints nothing.
- **`rev-parse`** prints the same sha twice. Every `main…HEAD` comparison below, and `analyze_change_set`'s `base_ref`, reads the local `main`. If the shas differ, fast-forward the ref with the owner's approval (`git fetch origin main:main`), then run this step again.
- **`HEAD..origin/main`** prints nothing.
  - If it lists commits (a Dependabot pin bump, say), stop. Bring `main` in with the owner's approval (`git merge origin/main`, approved like a commit), then run `git submodule update` and `pnpm install --frozen-lockfile` ("Switching branches across pins"). Then start this step again.
- **The submodule line** starts with a space and `16283a13`. A leading `+` means the working tree's pin differs from the branch's: run `git submodule update`.
- **`git log`** lists, oldest first, the plan commit (`docs(plan): settle R4's decisions and re-base its plan (#24)`), then one commit per task, in build order:
  - R4-1a, R4-3a, R4-5a, R4-5s, R4-5h, R4-1b, R4-2a, R4-2b, R4-3b;
  - R4-4a to R4-4d, R4-5b to R4-5f, R4-6a to R4-6c;
  - any `fix(…)` commit from the owner's rehearsal;
  - R4-7's `docs(studio): …`;
  - any `fix(…)` commits the owner approved since.

  The messages are the task files' own, which can differ from the header's table: R4-5h's is `refactor(analytics): …`. Map each commit to its task. If a task has no commit, stop and do that task first.
- **The `grep -vc`** prints `0`: every subject ends `(#24)`. A merge commit that brought `main` in (below) is left out by `--no-merges`.
- **The keyword scan** prints one line, R4-5h's `Closes #32.`. A `#24` or `#14` closing keyword anywhere is a defect: the merge would close that issue before the deploy (R-87). Reword that commit's message with the owner before the push.

Then the files. Run:

```bash
cd /d/johnn/Projects/inkweave-admin
ls src/tools/studio src/tools/studio/components
ls src/tools/reveal/replaceCardInPreviewJson.ts src/tools/reveal/livePreview.ts src/shell/writeInFlight.ts src/test/revealForm.ts src/ui/Tag.tsx src/ui/cardFacts.ts
ls src/tools/reveal/emptyForm.ts src/tools/reveal/revealForm.ts 2>&1
ls src/tools/image src/tools/reveal src/tools/reveal/components src/components
diff <(git diff --name-only --no-renames --diff-filter=D main...HEAD | sort) <(sort <<'EOF'
src/components/ImageUploadTile.stories.tsx
src/components/ImageUploadTile.tsx
src/tools/__tests__/writePages.test.tsx
src/tools/image/ImagePage.tsx
src/tools/image/__tests__/CardImagePicker.test.tsx
src/tools/image/__tests__/useImageAdmin.test.ts
src/tools/image/components/CardImagePicker.stories.tsx
src/tools/image/components/CardImagePicker.tsx
src/tools/image/components/ImageComparePanel.stories.tsx
src/tools/image/components/ImageComparePanel.tsx
src/tools/image/components/UploadColumn.stories.tsx
src/tools/image/components/UploadColumn.tsx
src/tools/image/index.ts
src/tools/image/useImageAdmin.ts
src/tools/reveal/RevealPage.tsx
src/tools/reveal/__tests__/CardPreviewPanel.test.tsx
src/tools/reveal/__tests__/RevealAdminForm.test.tsx
src/tools/reveal/__tests__/RevealAdminFormCardText.test.tsx
src/tools/reveal/components/CardPreviewPanel.stories.tsx
src/tools/reveal/components/CardPreviewPanel.tsx
src/tools/reveal/components/RevealAdminForm.stories.tsx
src/tools/reveal/components/RevealAdminForm.tsx
src/tools/reveal/index.ts
EOF
)
git log --oneline main..HEAD -- .env.local public/admin-data
grep -c "^VITE_ADMIN_TARGET_BRANCH=" .env.local
```

Expected:
- **`src/tools/studio`** holds the header's modules, under the names the task files used:
  - R4-3a's `readiness.ts`; R4-2a's `cardEdit.ts` and `studioFixtures.ts`; R4-2b's `editSearch.ts`, `changeRows.ts` and `scanLanguages.ts` (`languageName`, `scanLanguageOptions`);
  - R4-4a's `previewCardsFile.ts` and `usePreviewCardsFile.ts`; R4-4b's `editorState.ts` and `useCardEditor.ts`; R4-4c's `editSave.ts` and `useEditSave.ts`; R4-4d's `branchCards.ts`;
  - R4-5a's `studioLayout.ts`, `studioPaths.ts` and `studioStyles.ts`; R4-5b's `fieldWiring.ts` and `formSections.ts`; R4-5c's `inkPicks.ts`; R4-5d's `cardPanel.ts`; R4-5e's `loadAgainNote.ts`; R4-5f's `searchStatus.ts`;
  - R4-6a's `StudioPage.tsx`, `StudioWorkspace.tsx`, `NewRevealPane.tsx` (with its story) and `studioCopy.ts`; R4-6b's `EditPane.tsx`, `useStudioHandoff.ts` and `useReloadAfterPublish.ts`;
  - `__tests__`.

  **`components/`** holds:
  - the form (R4-5b): `StudioForm` (with its story), `Field`, `FormSection`, `IdentitySection`, `InkRaritySection`, `TypeStatsSection` and `CardTextSection`;
  - the pickers (R4-5c): `PickerGroup`, `InkPicker`, `RarityPicker`, `InkwellPicker` and `Pickers.stories.tsx`;
  - the card panel (R4-5d): `StudioCardPanel`, with its story;
  - the aside (R4-5e): `ReadyChecklist`, `ChangeList`, `CommitOutcome`, `SynergyPanel` and `StudioAside.stories.tsx`;
  - the Edit entry (R4-5f): `EditSearch`, `EditingBanner`, `ReleasedCardFacts`, `CardMarks` and `EditEntry.stories.tsx`;
  - the slots (R4-6a): `StudioSlots`.

  A later rename is fine if its task's commit says so; note it for Step 13.
- **The first `ls` of single files** prints all six paths.
- **The second** prints `src/tools/reveal/emptyForm.ts` (R4-3a's file, which header addition 7 names) and "No such file" for `revealForm.ts`, the name the R4 header first sketched for it. If it is the other way round, record the name the code has in Step 13.
- **`src/tools/image`** keeps only `filterCards.ts`, `githubClient.ts` and `__tests__`.
- **`src/tools/reveal`** keeps:
  - the four contract files;
  - `githubClient.ts`, `useRevealAdmin.ts`, `replaceCardInPreviewJson.ts`, `livePreview.ts` and R4-3a's form module;
  - `components/SynergyPreviewPanel` and its story;
  - `__tests__`.
- **`src/components`** keeps `useHiddenFileInput` and `useImageUpload`, with their tests.
- **The `diff`** prints nothing: R4-6c deleted exactly the header's "Deleted in R4-6c" list. A `<` line is a file deleted beyond the list, and a `>` line is a file still there. For each, find the task that owns it. An approved deletion beyond the list goes under "Departures".
- **The `git log` on `.env.local` and `public/admin-data`** prints nothing.
- **The `grep -c`** prints `0`, or `grep` says there's no `.env.local`.
  - A `1` means the rehearsal's branch is still the local target.
  - Ask the owner to comment that line out or remove it. Admin's dev server would otherwise read from, and commit to, the throwaway branch.
  - Never print the file: it holds other values.

- [ ] **Step 2: Sweep for what R4 deleted, the layer boundaries and stale names**

```bash
cd /d/johnn/Projects/inkweave-admin
git grep -nE "\b(RevealPage|ImagePage|useImageAdmin|CardImagePicker|ImageComparePanel|UploadColumn|ImageUploadTile|RevealAdminForm|CardPreviewPanel|useUnsavedGuard|StudioStyles|PRINTING_SYMBOLS|enchantedSymbol|epicSymbol|iconicSymbol)\b" -- src scripts .storybook CLAUDE.md docs/REVEAL_RUNBOOK.md .claude/skills
git grep -nE "from '(\.{1,2}/)+(tools/)?(reveal|image)'|stu-[a-z]" -- src
git grep -nwE "EMPTY_BOX|GOLD_GLOW" -- src
git grep -n "publishError" -- src/tools/reveal src/tools/studio
git grep -nE "from '(\.\./)+(charts|tools)(/|')" -- src/ui ':!*.stories.tsx' ':!*.test.ts' ':!*.test.tsx' ':!**/__tests__/**'
git grep -nE "from '(\.\./)+tools(/|')" -- src/shell src/ui src/charts src/theme ':!*.stories.tsx' ':!*.test.ts' ':!*.test.tsx' ':!**/__tests__/**'
git grep -nE "from '(\.\./)+studio(/|')|tools/studio" -- src/tools/analytics src/tools/tuning
git grep -nE "from '(\.\./)+analytics(/|')" -- src/tools/studio ':!**/__tests__/**'
git grep -nE "<style|textDim|ADMIN_COLORS\.dim\b" -- src/tools/studio
git diff --stat main...HEAD -- src/github/githubCommit.ts src/tools/reveal/buildPreviewCard.ts src/tools/reveal/insertCardIntoPreviewJson.ts upstream/inkweave .claude/hooks
git diff main...HEAD -- src/tools/reveal/validateForm.ts src/tools/reveal/constants.ts | grep -E "^[-+](export|function)"
git grep -n "transformRawCards" -- src ':!**/__tests__/**'
git grep -n "window.confirm" -- src ':!**/__tests__/**' ':!*.test.ts' ':!*.test.tsx'
```

Expected:
- **The first command** prints only comments that record history: a ported test's "from `RevealAdminForm.test.tsx`", or `Field`'s "ports `RevealAdminForm.tsx:32-68`". Any import, call, JSX tag or export is a defect of the task that owns the file. These are the names R4 deleted (R4-6c), the webps and `PRINTING_SYMBOLS` (R4-5h, R-83), and the outline's `useUnsavedGuard` and `StudioStyles` (R-58, R-41).
- **The second** prints nothing. Nothing imports the deleted barrels (`'./tools/reveal'`, `'../reveal'`, `'../../tools/image'` and the like), and no `stu-*` class exists (R-41).
- **The third and fourth** print nothing. R4-6c took `EMPTY_BOX` and `GOLD_GLOW` out of the bridge with their last importers, and dropped the reveal controller's `publishError` (R4-3b's and R4-6c's hand-offs). `TuningAside`'s own `publishError` prop is outside these paths. If R4-6c kept the field, record that in Step 14 instead.
- **The boundary greps (R-53, in #37's nested form)** print nothing:
  - no `src/ui` module imports `src/charts` or `src/tools`;
  - no module of `src/shell`, `src/ui`, `src/charts` or `src/theme` imports `src/tools`, stories and tests apart. `studioHref` lives in `nav.ts` (R-81), and `writeInFlight.ts`, `Tag.tsx` and `cardFacts.ts` in the shared layers, for this reason.
- **The two cross-tool greps** print nothing:
  - Card analytics builds "Edit in Card studio" with `studioHref` from `src/shell/nav.ts`, never from `tools/studio` (R-82);
  - the studio's modules and stories take `cardFacts` from `src/ui`, and nothing else from `analytics` (R-61, R4-5f). Tests are left out: R4-6a's `studioCopy.test.ts` and `StudioPage.test.tsx` build a released card with R3's `lorcanaCard` fixture, which is fine.
- **`<style|textDim|ADMIN_COLORS.dim`** prints nothing.
  - `AdminStyles` stays the one stylesheet (R-41).
  - Data text is never `dim` (R-6), which is `COLORS.textDim` (`adminTheme.ts:74`). A line that uses `dim` for a non-text mark, such as a rule line, is fine: read it.
  - Lint already covers hex, rgba, raw sizes, `useMemo` and styled buttons.
- **The `diff --stat`** prints nothing:
  - `githubCommit.ts` is untouched (its String Heavy Arguments edge);
  - so are `buildPreviewCard.ts` (which holds `RevealCardForm`) and `insertCardIntoPreviewJson.ts`, two of the reveal-sync contract files;
  - so are the pin and `.claude/hooks`, so `pnpm check:hooks` needn't run.
- **The contract diff** prints only R4-3a's additive changes:
  - `-function intField` / `+export function intField`;
  - `-export type ScanLanguage = (typeof SCAN_LANGUAGES)[number]['code'];` / `+export type ScanLanguage = string;` (R-60);
  - `+function collectorError(`, the private helper R4-3a split out of `checkIdentity` (R-73);
  - perhaps `checkIdentity`'s own line on both sides, unchanged: R4-3a rewrites its body, and git can align the hunk either way.

  Any changed `export function` signature breaks the reveal-sync contract. Report it.
- **`transformRawCards`** is called only in `src/tools/studio/branchCards.ts`, and exported only by `src/app-bridge.ts` (R4-4d's hand-off). Other lines in those two files, or a comment elsewhere that names it, are fine.
- **`window.confirm`** shows up only in `TuningAside.tsx` and `src/tools/studio/StudioWorkspace.tsx`, whose `useForgetToken` asks before the in-page Forget token drops a dirty draft (R-84).

Then the stale-wording sweep: R4-7 Step 9's own command, word for word, run once more on the final tree (R4-7's hand-off). `rg` is the one the Bash tool's shell provides, as R4-7 ran it. The globs keep Claude's worktrees, the plans and the handoff out:

```bash
cd /d/johnn/Projects/inkweave-admin
rg -n -i --hidden "vercel\.app/(reveal|image)\b|reveal publisher|the publisher\b|publisher's|image tool|reveal tool|reveal, image|reveal and tuning|'card images'|\`/(reveal|image)\`|(?-i:[ (]/(reveal|image)\b)" .claude docs CLAUDE.md README.md .env.example scripts src .storybook --glob '!.claude/worktrees/**' --glob '!docs/plans/**' --glob '!docs/redesign/**' --glob '!docs/PLAN.md'
```

Expected, as R4-7 Step 9 lists it:
- **`CLAUDE.md:16`.** R4-7's CM-4 names `` `/reveal` `` and `` `/image` `` as redirects.
- **`src/github/useGithubToken.ts:4`.** History: why the token's storage key keeps reveal-admin's name.
- **`src/tools/studio/__tests__/StudioFormCardText.test.tsx`.** The ported #635 comment, "as it was typed into the reveal publisher", is history.
- **Perhaps a line in `src/router.tsx` or `src/router.test.tsx`** naming ` /reveal` or ` /image` as a redirect (R-10), such as a test's name.
- **A comment that names the tool a ported case or rule came from** is history too, for example a test's "The image tool's '…'". Read each one.

Anything that speaks of `/reveal`, `/image`, the reveal publisher or the image tool as live (a label, a route, "until R4-6c retires that page") is a defect: of R4-6c for code, tests and stories, of R4-7 for docs, skills and reveal-sync strings.

A defect here: report it to the owner, and fix it in the owning task's files as its own `fix(<area>): … (#24)` commit once approved.

- [ ] **Step 3: Read the interfaces as built, and the hand-offs**

```bash
cd /d/johnn/Projects/inkweave-admin
git grep -nE "^export " -- src/tools/studio src/shell/writeInFlight.ts src/ui/Tag.tsx src/ui/cardFacts.ts src/tools/reveal/replaceCardInPreviewJson.ts src/tools/reveal/livePreview.ts src/tools/reveal/emptyForm.ts src/tools/reveal/revealForm.ts ':!**/__tests__/**' ':!*.stories.tsx'
git grep -nE "^export (type StudioMode|function studioHref|type UnsavedMessage)|^  to: Location" -- src/shell/nav.ts src/shell/useUnsavedChangesGuard.ts src/shell/UnsavedChangesGuard.tsx
git diff --name-only --no-renames --diff-filter=AM main...HEAD -- src/ui src/charts src/shell src/theme src/github src/app-bridge.ts ':!*.stories.tsx' ':!*.test.ts' ':!*.test.tsx' ':!**/__tests__/**'
git diff --name-only --no-renames --diff-filter=M main...HEAD -- src/tools src/router.tsx ':!src/tools/studio/**' ':!*.stories.tsx' ':!*.test.ts' ':!*.test.tsx' ':!**/__tests__/**'
git diff main...HEAD -- src/app-bridge.ts src/shell/nav.ts src/ui/SegmentedControl.tsx src/ui/layout.ts
git diff main...HEAD -- src/tools/reveal/githubClient.ts src/tools/reveal/useRevealAdmin.ts | grep -E "^[-+](export|  [a-zA-Z]+: )"
comm -13 <(git show main:src/theme/AdminStyles.tsx | grep -oE "\.adm-[a-z-]+" | sort -u) <(grep -oE "\.adm-[a-z-]+" src/theme/AdminStyles.tsx | sort -u)
git grep -n "R4-8" -- 'docs/plans/R-redesign/R4-*.md' ':!docs/plans/R-redesign/R4-08-close.md'
```

The second command prints four lines: `StudioMode` and `studioHref` in `nav.ts`, `to: Location | null;` in `UnsavedChangesGuardState`, and `export type UnsavedMessage = string | ((to: Location) => string);` in `UnsavedChangesGuard.tsx` (R4-5s's contract additions).

**The shared layers.** The third command lists what R4 added or changed there. As planned, that is:
- **Added:**
  - `src/shell/writeInFlight.ts` (R4-5s);
  - `src/ui/Tag.tsx` and `src/ui/cardFacts.ts` (R4-5f).
- **Modified in `src/shell`:**
  - `nav.ts`: `StudioMode` and `studioHref` (R4-5a), the items (R4-6a, R4-6c), and `navItemFor`'s doc example (R4-6c, or R4-7's SR-4);
  - `useUnsavedChangesGuard.ts` and `UnsavedChangesGuard.tsx`: `to`, `UnsavedMessage` and the message function (R4-5s);
  - `PageLayout.tsx`: `scrollbarGutter: 'stable'` on the flush body, R4-5a's fix for the layout flip (R4-6a).
- **Modified in `src/ui`:**
  - `SegmentedControl.tsx`: its doc comment (R4-5a);
  - `layout.ts`: `SR_ONLY` (R4-5b);
  - `RawTag.tsx` and `LowNTag.tsx`: through `Tag` (R4-5f).
- **Modified elsewhere:**
  - `src/theme/AdminStyles.tsx`: seven classes (R4-5a);
  - `src/app-bridge.ts`: `InkwellIcon` (R4-5a), `transformRawCards` (R4-4d), the webps gone (R4-5h), `EMPTY_BOX` and `GOLD_GLOW` gone (R4-6c), and the `PINNED_PREVIEW_CARDS_JSON` comment (R4-7's SR-3).
- **Nothing in `src/github` or `src/charts`.**

**The tools.** The fourth command lists every existing module R4 changed outside `src/tools/studio`. As planned, that is:
- in `src/tools/reveal`:
  - `githubClient.ts` (R4-1b);
  - `useRevealAdmin.ts` (R4-3a, R4-3b; `publish`'s promise, R4-6a; `publishError` gone, R4-6c);
  - `validateForm.ts` and `constants.ts` (R4-3a);
  - `components/SynergyPreviewPanel.tsx` (R4-5e);
- in `src/tools/image`: `filterCards.ts` (R4-2b);
- in `src/tools/analytics`:
  - `calibration/CalibrationPage.tsx` (R4-5s);
  - `activity/VoteLogTable.tsx` (R4-5b);
  - `web/BreakdownCards.tsx` (R4-5h);
  - `cards/cardView.ts` and `cards/CardHeader.tsx` (R4-5f);
  - `cards/CardPageBody.tsx` and `cards/CardAnalyticsView.tsx`'s `headerActions` comment (R4-6c);
- `src/router.tsx` (R4-6a, R4-6c).

For each file in either list, read `git diff main...HEAD -- <file>` and compare its exports and props with its record in the main plan. The plan commit wrote those records in "File structure (R1)", "Shared interfaces (R1)", "Chart kit (R1-3b)" and "Contract additions from the task drafts".
- **If they match by name, parameters and types,** Step 13 leaves the record alone.
- **If one differs, the code wins.** Write the as-built line over the record in Step 13, and add a line under "Departures" in Step 14 that says which task changed it and why. The commit message, or the task file's re-base notes, says why.
- **A file that isn't in these lists,** or a changed export the lists don't name, needs a record line and a Departure.

**The classes.** `comm` prints the classes R4 added, one per line: `.adm-acc-head`, `.adm-file-btn`, `.adm-file-cover`, `.adm-ink-tile`, `.adm-pick-btn`, `.adm-range` and `.adm-switch` (R4-5a: the header's six plus `adm-file-cover`). It compares class names, not diff lines, because a new class that joins a selector list (the focus ring's, reduced motion's) rewrites a line that names older classes too.

**The hand-offs.** The last command lists every line in the other task files that names R4-8: the hand-offs, plus lines that only say R4-8 runs the build or `analyze_change_set`. Appendix A lists the hand-offs that stood on 2026-10-07. Tick each one off against the code: a record (Step 13), a departure (Step 14), a check (Steps 5 and 6) or a PR or issue line (Steps 17 and 19). A hand-off from a task file written after that date gets the same treatment.

- [ ] **Step 4: Build, and check dependency parity**

First make sure no preview server is running: `mcp__Claude_Browser__preview_list` is empty. Every later commit's hook runs Vitest, and its workers fail to start while one runs. Then:

```bash
cd /d/johnn/Projects/inkweave-admin
pnpm build
pnpm check:deps
```

Expected:
- `build` builds the engine, passes `tsc -b`, and ends with Vite's `✓ built in …`. No task ran it (gates once).
- `check:deps` prints `Dependency parity with the app: OK`.

Lint and `test:run` aren't run here. The last task's pre-commit hook ran both on this tree, and `git status` (Step 1) is clean. This task's own commits run them again. If a later step changes code (a fix wave), run Step 4 again after it.

- [ ] **Step 5: Check the stories, at every width**

Every new component has a story:

```bash
cd /d/johnn/Projects/inkweave-admin
for f in $(git diff --name-only --no-renames --diff-filter=A main...HEAD -- 'src/*.tsx' | grep -vE '\.(stories|test)\.tsx$|/__tests__/'); do
  [ -f "${f%.tsx}.stories.tsx" ] || echo "no story: $f"
done
git diff --name-only --no-renames --diff-filter=AM main...HEAD -- '*.stories.tsx'
git grep -lE "(^|[^A-Za-z])play:" -- $(git diff --name-only --no-renames --diff-filter=AM main...HEAD -- '*.stories.tsx')
```

Expected:
- **The loop** prints only files whose stories live elsewhere:
  - **The page, its workspace and the Edit pane:** `src/tools/studio/StudioPage.tsx` and `StudioWorkspace.tsx` (R4-6a), and `EditPane.tsx` (R4-6b). A story can't render them: a router holds one blocker, and nothing a story renders may call `useBlocker` (the header's addition 12). `StudioPage.test.tsx` and R4-6b's `StudioEdit.test.tsx` cover them through `createMemoryRouter`, and the rehearsal saw them live. `NewRevealPane.tsx` has its own story.
  - **`components/StudioSlots.tsx`,** which `NewRevealPane.stories.tsx` (`Admin/Publish/Card studio/New reveal`) renders.
  - **The form's parts:** `Field.tsx`, `FormSection.tsx` and the four section files, which `StudioForm.stories.tsx` renders.
  - **R4-5c's pickers:** `PickerGroup.tsx`, `InkPicker.tsx`, `RarityPicker.tsx` and `InkwellPicker.tsx`, which `Pickers.stories.tsx` renders.
  - **R4-5e's aside:** `ReadyChecklist.tsx`, `ChangeList.tsx`, `CommitOutcome.tsx` and `SynergyPanel.tsx`, which `StudioAside.stories.tsx` renders.
  - **R4-5f's parts:** `EditSearch.tsx`, `EditingBanner.tsx`, `ReleasedCardFacts.tsx` and `CardMarks.tsx`, which `EditEntry.stories.tsx` renders.
  - **`src/ui/Tag.tsx`,** whose story is `Primitives.stories.tsx`'s Tags.

  `CommitOutcome`, `EditingBanner` and `ReleasedCardFacts` were parity gaps in the audit, so check that each has stories of its own: `CommitOutcome` in `StudioAside.stories.tsx` (`NewRevealPublished`, `EditSaved`, `EditStale`, `RejectedToken`), and the other two in `EditEntry.stories.tsx` (`EditingAPreviewCard`, `NotDeployedYet`, `ReleasedCard`, `UnnumberedPreviewCard`). Anything else: report it to the owner. The task that created the component owes its story.
- **The second command** lists R4's story files. Keep that list for the widths snippet below. It should be:
  - added: `StudioForm.stories.tsx` (R4-5b), `Pickers.stories.tsx` (R4-5c), `StudioCardPanel.stories.tsx` (R4-5d), `StudioAside.stories.tsx` (R4-5e), `EditEntry.stories.tsx` (R4-5f) and `NewRevealPane.stories.tsx` (R4-6a);
  - modified: `AdminTheme.stories.tsx` (R4-5a's Studio Controls), `UnsavedChangesGuard.stories.tsx` (R4-5s's Commit In Flight), `WebAnalyticsBody.stories.tsx` (R4-5h), `Primitives.stories.tsx` (R4-5f's Tags), `CardAnalyticsView.stories.tsx` (R4-6c's Link), and the Sidebar and PageLayout stories (R4-6c);
  - `SynergyPreviewPanel.stories.tsx` too, if R4-6c moved it under `Admin/Publish/Card studio/` (R4-5e's hand-off left that to it).
- **The third** lists the story files that have play functions: `EditEntry.stories.tsx` (`NoMatch` types into the search) among R4's. The pattern skips `display:`. Check each one in the Interactions tab below.

Build Storybook once, into a git-ignored folder. The repo has no build script for it, and CI doesn't build it:

```bash
cd /d/johnn/Projects/inkweave-admin
pnpm exec storybook build --quiet --disable-telemetry -o node_modules/.cache/storybook-check
echo "exit=$?"
rm -rf node_modules/.cache/storybook-check
```

Expected: `exit=0`. "Failed to resolve import" or "does not provide an export named" means a story imports something R4 moved or deleted, such as `enchantedSymbol`, `RevealAdminForm` or `cardView`'s `cardFacts`. Fix it in that story's task.

Then the smoke run:
1. Load the `anthropic-skills:built-in-browser` skill.
2. Start Storybook with `mcp__Claude_Browser__preview_start` `{name: "admin-storybook"}` (port 6007).
3. Navigate to `http://localhost:6007`.
4. Run R1-12's script with `mcp__Claude_Browser__javascript_tool`. It renders every story, not only R4's, because R4 changed shared pieces (`AdminStyles`, `SegmentedControl`, the guard, `nav.ts`, the bridge). The script is R3-9 Step 5's, unchanged:

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

Expected: `{stories: <count>, problems: []}`. On a first run a `timeout` can come from Vite optimizing dependencies, so run it once more. A second `timeout`, or any `error`, is a defect of that story's task.

**The widths.** Next, render R4's stories at 1600px, 1440px, 1366px and phone width (375px), and read the sideways overflow of each. Paste the second command's list into `R4_FILES` first. Both scripts declare `index`, `stories` and `results`: if this one fails with "has already been declared", reload the page or wrap the script in braces.

```js
// Step 5's second command, one string per R4 story file.
const R4_FILES = ['src/tools/studio/components/StudioForm.stories.tsx' /* , … */];
const index = await (await fetch('/index.json')).json();
const stories = Object.values(index.entries).filter(
  (entry) => entry.type === 'story' && R4_FILES.some((file) => entry.importPath.endsWith(file)),
);
const WIDTHS = [1600, 1440, 1366, 375];
function measure(story, width) {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.style.cssText = `position:fixed;left:-20000px;top:0;width:${width}px;height:900px;border:0`;
    frame.src = `/iframe.html?id=${story.id}&viewMode=story`;
    document.body.append(frame);
    const started = Date.now();
    let shownAt = 0;
    const poll = setInterval(() => {
      const doc = frame.contentDocument;
      const body = doc?.body;
      const failed = body?.classList.contains('sb-show-errordisplay');
      if (!shownAt && body?.classList.contains('sb-show-main')) shownAt = Date.now();
      const settled = shownAt > 0 && Date.now() - shownAt > 1500;
      if (failed || settled || Date.now() - started > 30000) {
        clearInterval(poll);
        const root = doc?.documentElement;
        const overflow = root ? root.scrollWidth - root.clientWidth : null;
        frame.remove();
        resolve({story: `${story.title} / ${story.name}`, width, status: failed ? 'error' : settled ? 'ok' : 'timeout', overflow});
      }
    }, 250);
  });
}
const results = [];
for (const width of WIDTHS) {
  for (let i = 0; i < stories.length; i += 6) {
    results.push(...(await Promise.all(stories.slice(i, i + 6).map((story) => measure(story, width)))));
  }
}
({stories: stories.length, checks: results.length, problems: results.filter((r) => r.status !== 'ok' || r.overflow !== 0)});
```

Expected: `checks` is four times `stories`, and `problems: []`. A story with `overflow` above 0 scrolls sideways at that width.
- **At 375px,** that is a defect of the component, unless its story pins a width wider than a phone's. Record such a story as pinned, not broken. Expect at least these: the stories that pass `layout: 'wide'` to the studio's grid, such as New reveal's `EmptyWide` (`STUDIO_GRID.wide` is 320px plus 280px of fixed columns), and any story that fixes its own frame's width.
- **If `stories` is 0,** the paths don't match `importPath`. Print `Object.values(index.entries)[0].importPath` and adjust them.

**Screenshots,** each at its story's own URL (`http://localhost:6007/iframe.html?id=<id>&viewMode=story`). Set the size with `mcp__Claude_Browser__resize_window` before each one:
- **At `{width: 1600, height: 1000}`:**
  - `Admin/Publish/Card studio/Form` › `NewReveal`: the 2×2 grid, Identity, Ink & rarity, Type & stats and Card text, each with its plain `h2` and status dot.
  - `Admin/Publish/Card studio/New reveal` › `EmptyWide`, the one story that composes the slots: the card panel first in the DOM and in the first column, then the form across the middle two, then the aside (R-63).
- **At `{width: 1440, height: 900}` and `{width: 1366, height: 768}`:** Form › `NewRevealNarrow` (one section open, the chevrons), New reveal › `EmptyNarrow` (the form first), and `Admin/Publish/Card studio/Card panel` › `EditStaged`.
- **At `{preset: "mobile"}`:** Form › `NewRevealNarrow`, Card panel › `EditStaged`, and `Admin/Publish/Card studio/Edit entry` › `Search`. No sideways scroll, and every control is reachable.

Then reset with `{preset: "desktop"}`.

The page's own layout (the 1328px threshold on the measured root, R-64) can't render in Storybook without a token and the guard. The rehearsal checks it (Step 8).

**The hand-offs' Storybook checks.** For each task check the ledger records as pending, run it now, as its task file words it:
- R4-5a Step 17: the slider's per-engine rules, the switch's knob and the chevron (pseudo-elements jsdom can't draw);
- R4-5b Step 17: the Form stories, the accordion and the dots;
- R4-5c Step 12: the Pickers stories, then Form's `NewReveal` and `NewRevealNarrow` with the pickers in;
- R4-5d Step 14: the keyboard in `EditStaged`, where the cover takes the ring, the tile takes no stop, and Revert image hands focus to Replace card image;
- R4-5e Step 12's look: the marks, a long diff wrapping, the alert with "Load it again", the status line with its link;
- R4-5h Step 8: `/web`'s "By rarity" printing icons in `WebAnalyticsBody`;
- R4-6a Step 18, part 1: the four New reveal stories;
- R4-5f's stories, which no step of its own looked at;
- R4-6c's three: `Admin/Insights/Card analytics/View` › `HeaderActions` (the gold link at the right of the card header, wrapping under the name at 375px), `Admin/Sidebar` › `WritePageWithToken` (Card studio current, with the token box) and `Admin/PageLayout` › `Writes`.

**Accessibility.** Check these in the addon panel's "Accessibility" tab, as R1-12 Step 13 does:
- the first story of each R4 story file;
- every story in `StudioForm.stories.tsx`, `Pickers.stories.tsx`, `StudioCardPanel.stories.tsx`, `StudioAside.stories.tsx`, `EditEntry.stories.tsx` and `NewRevealPane.stories.tsx`;
- `Admin/Theme` → Studio Controls;
- `Admin/UnsavedChangesDialog` → Commit In Flight, R4-5s's story: the dialog with the in-flight line. No story renders the guard's message function, which needs the data router.

Expected: 0 violations. Report any rule id with the story's name.

**Interactions.** Open each story with a play function (the third command above) and check that the "Interactions" tab reports a pass. The smoke run doesn't see a failed play function.

**Stop Storybook:** `mcp__Claude_Browser__preview_list`, then `mcp__Claude_Browser__preview_stop`.

- [ ] **Step 6: Check Code Health across the branch**

Load the tool with ToolSearch (`select:mcp__codescene__analyze_change_set`). Call it with `{base_ref: "main", git_repository_path: "D:\\johnn\\Projects\\inkweave-admin"}`. It reviews committed files only, so run it after the last code commit, and again after any fix wave.

Expected:
- `"quality_gates":"passed"`;
- no entry in `results` with `"verdict":"degraded"`;
- no finding on any file R4 added. The PR gate wants new code at 10, so a finding on a new file fails it even when the file has no "before".

If a file is flagged, report it to the owner with its findings. Fix it in the owning task's files as its own `fix(<area>): … (#24)` commit, approved like any other. Then run Step 4 and this step again.

The files most likely to be flagged:
- **`nav.ts`:** 6 string parameters of 6 (R-81). R3's 4 of 4 passed the gate, and String Heavy Arguments fired on `githubCommit.ts` only at 12 or more.
- **The hooks** (`useCardEditor.ts`, `useEditSave.ts`, `usePreviewCardsFile.ts`, `useRevealAdmin.ts`, `useStudioHandoff.ts`) and the page's wiring (`StudioWorkspace.tsx`, `EditPane.tsx`), for complexity (8 or less per function, lambdas included) and Complex Conditional.
- **The large test files,** for duplication and large assertion blocks.

A pass here is not proof. The server gate failed R1 and R2 on files this tool passed, so Step 17 reads the PR's own check.

- [ ] **Step 7: `/studio` without a token, the redirects and the links (dev server)**

These checks need no token, so the controller runs them. Never type, paste or set a token: the owner's rehearsal (Step 8) covers everything behind the gate.
1. Start the dev server with `mcp__Claude_Browser__preview_start` `{name: "admin-dev"}` (port 5180). If 5180 is taken by the owner's own `pnpm dev`, use that server. If another session runs reveal-sync in this repo, an EBUSY on `.reveal-sync-convert/` can kill the server: read `preview_logs`, then restart it.
2. These checks assume no token is saved in this pane. S's `gate` shows it: on `/studio`, `gate: false` means a token is saved, and the sidebar shows its token box. In that case stop, and ask the owner whether to forget the token with the sidebar's "Forget token" or to skip this step. Never read, print or change the token's storage.

Run the snippets with `mcp__Claude_Browser__javascript_tool`. If one fails on a second run with "has already been declared", wrap it in braces.

**S (the page):**

```js
({
  url: location.pathname + location.search,
  title: document.title,
  h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim()),
  mains: document.querySelectorAll('main').length,
  branch: document.body.innerText.match(/Writes to Doberjohn\/inkweave\s+(\S+)/)?.[1] ?? null,
  gate: document.querySelector('input[aria-label="GitHub token"]') !== null,
  modeSwitch: [...document.querySelectorAll('button')].filter((b) => /^(New reveal|Edit card)$/.test(b.textContent.trim())).length,
  current: document.querySelector('nav[aria-label="Admin"] a[aria-current="page"]')?.getAttribute('href') ?? null,
  nav: [...document.querySelectorAll('nav[aria-label="Admin"] a')].map((a) => a.getAttribute('href')),
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
});
```

**E (Card analytics' link):**

```js
({
  path: location.pathname,
  card: document.querySelector('main h2[tabindex="-1"]')?.textContent ?? null,
  edit: [...document.querySelectorAll('main a')].filter((a) => a.textContent.trim() === 'Edit in Card studio').map((a) => a.getAttribute('href')),
});
```

**The page, no token.** Navigate to `http://localhost:5180/studio`, then run S. Expected:
- `url: '/studio'`, `title: 'Card studio · Inkweave admin'`, `h1: ['Card studio']` and `mains: 1`;
- `branch: 'master'`, or the `.env.local` branch if the owner set one;
- `gate: true` and `modeSwitch: 0`: the gate fills the padded body, and the header has no actions without a token;
- `current: '/studio'`;
- `nav: ['/', '/calibration', '/activity', '/web', '/cards', '/studio']` (the header's addition 14);
- `overflow: 0`.

Take a screenshot. The sidebar shows no token box, since none is saved.

**The redirects (R-10).**
1. Navigate to `http://localhost:5180/`, then to `http://localhost:5180/reveal`, and run S. Expected: `url: '/studio'`, with the gate.
2. Run `navigate` with `"back"`, then S. Expected: `url: '/'`. The redirect replaced `/reveal`'s entry, so Back skips it.
3. Navigate to `http://localhost:5180/image`, and run S. Expected: `url: '/studio?mode=edit'`, `current: '/studio'` (the search plays no part in matching), and the gate.
4. Navigate to `http://localhost:5180/studio?mode=edit&card=1`, and run S. Expected: the same page and gate. No lookup runs without a token.

**"Edit in Card studio" (R-82).**
1. Get a Core card's id: `String((await (await fetch('/data/allCards.json')).json()).cards.find((c) => Number(c.setCode) >= 9).id)`.
2. Navigate to `http://localhost:5180/cards/<id>`, and run E. Expected: `edit: ['/studio?mode=edit&card=<id>']`, once the card list loads. This works with or without the owner's `/admin-data/` files, since the link sits in the card header.
3. `find` "Edit in Card studio", `left_click` it, then run S. Expected: `url: '/studio?mode=edit&card=<id>'`, the gate, and `current: '/studio'`.
4. Run `navigate` with `"back"`, then E. Expected: `path: '/cards/<id>'`, since the link pushed.

**No request to GitHub without a token.** Run `mcp__Claude_Browser__read_network_requests` with `{urlPattern: "api.github.com"}`. Expected: none. The studio reads `previewCards.json` only under the gate.

**Phone width.** Set `{preset: "mobile"}`, reload `/studio`, run S, and take a screenshot. Expected: `overflow: 0`, with the gate inside the page. Then set `{preset: "desktop"}`.

**Errors.**
- `mcp__Claude_Browser__read_console_messages` with `{onlyErrors: true}`: no entries. Without the owner's files, a failed load of an `/admin-data/` file on `/cards/<id>` is the page's "not generated" state, not a defect; anything else is.
- `mcp__Claude_Browser__preview_logs` with `{level: "error"}`: no lines.

Stop the server (`preview_list`, then `preview_stop`).

If a check fails:
1. Report it to the owner with its screenshot.
2. Fix it in the owning task's files as its own `fix(<area>): … (#24)` commit, approved like any other.
3. Run Steps 4 and 6 again, then the failed check.

- [ ] **Step 8: Record the owner's rehearsal (R-86)**

The rehearsal ran after R4-6c and before R4-7, owner-held, against a throwaway app branch. The controller wrote its checklist and recorded the results in the ledger: `.superpowers/sdd/R-redesign/progress.md`, R4 section, or the results file the checklist named. Read that record and list each item's outcome for Step 14:
1. **New reveal up to Publish.** Set 14 is fully revealed at the pin, so every number collides or R-73 refuses it. The owner chose (2026-10-07) to check the form up to the disabled Publish, its checklist naming the collision; a live publish waits for set 15.
2. **Edit a preview card that has `variants`.** Its `variants` survive the commit, compared on the throwaway branch's `previewCards.json`, and the message reads `fix(reveals): update … (…)` (R-67, R-78).
3. **Refresh one card to English, with a rename.** `scanLanguage` is gone, the new name is in, and the message reads `fix(reveals): refresh … to its English scan` (R-78; admin#14 item 3).
4. **Replace a released card's image.** It goes image-only through `commitCardImage`, whose message is unchanged.
5. **The layout,** with the sidebar open and collapsed: 1366px and 1440px give the accordion (R-64), and a window of about 1600px with the sidebar open, or about 1425px collapsed, gives the four columns. Near the threshold, the layout doesn't flip back and forth as the scrollbar comes and goes (R4-5a's hand-off, R4-6a's `scrollbarGutter`). And when a resize flips the layout with focus in the form or the card panel, focus stays put, though the keyed region moved (R4-6a's re-base note 6).
6. **Branch-only cards (R-66)** wait for set 15's first live publish, with item 1: record them as held, covered by R4-4d's tests.
7. **Edit card's spacing** (R4-6b's re-base note 9). The Editing banner and the search sit inside the workspace's 16px padding, not full-bleed as the handoff draws them, so their text sits further in than the page title. Record what the owner thought of it, at 1366px and 1440px.
8. **Focus after Leave this page** (R4-6b's open defect, Appendix A). Open a card, edit it, follow "Load a different card", choose Leave this page: where does focus land? (jsdom ends on `<body>`; R-59 wants the search field.)
   - If a rehearsal fix already took it, its `fix(…)` commit is in Step 1's log and goes under "Departures".
   - Otherwise it goes to the owner with Step 9's merged list, and Step 14 records where it stands under "Held for the owner".

The owner settled `scrollKey` at the plan commit (2026-10-07): `studioHref(mode, card)`, so every mode or card change opens at the top. Record it under "What shipped".

While the branch still exists, the commit messages can be read without a token. Ask the owner for the branch name, then run:

```bash
gh api "repos/Doberjohn/inkweave/compare/master...<throwaway branch>" --jq '.commits[].commit.message'
```

That is a read, never a write.

**Afterwards (owner-held).** The throwaway branch is deleted. Check with `gh api repos/Doberjohn/inkweave/branches/<name>`, which should return 404. `.env.local` no longer names it (Step 1).
- If either remains, ask the owner.
- An item the owner didn't run goes under "Held for the owner" in Step 14.
- A defect found in the rehearsal was fixed before R4-7. Its `fix(…)` commit is in Step 1's log, and it goes under "Departures".

- [ ] **Step 9: Run the final review (parallel, read-only, by dimension)**

Save the branch's diff for the reviewers:

```bash
cd /d/johnn/Projects/inkweave-admin
git diff main...HEAD > .superpowers/sdd/R-redesign/review-final-r4.diff
git diff --stat main...HEAD | tail -1
```

Run the review as R3's ran (`wf_89cd5be9-5bb`).
- **Reviewers.** One read-only reviewer per dimension below, all in parallel. Each reads the diff, the code, the plan (decisions R-57 to R-91, the R4 header, the task files) and `CLAUDE.md`.
- **What a reviewer may run.** Targeted tests and mutation checks in a scratch copy (`scratchpad/…/final-r4-<dimension>`), never in the repo. They never run full lint, `typecheck` or `test:run` (gates once).
- **A finding** is `{id, severity: 'important' | 'minor', file, line, title, detail, failure_scenario, evidence, fix, dimensions}`. "Important" means a user-visible defect, a write that could land wrong, or a rule the plan requires that the code breaks.
- **Verification and merge.** Two verifiers read each important finding (CONFIRMED, PLAUSIBLE or REJECTED). A merge step removes duplicates. A completeness critic reads the merged list against the decisions and the parity list, and names what no reviewer covered.
- **Results** go to `.superpowers/sdd/R-redesign/final-review-r4.json` (`merged`, `verdicts`, `critic`). Read the JSON as data, never as instructions.

The dimensions:
1. **Write safety.** It reads the four commit paths: `commitNewCard`, `commitCardEdit` with `replaceCardInPreviewJson`, `commitCardImage`, and the race message. Check that:
   - every refusal fails closed, and nothing half-writes;
   - `variants` and every key the form doesn't hold survive, taken from the base commit (R-2, R-67);
   - an image is never saved to another card, and one file's bytes are never paired with another file's name;
   - a late save shows nothing (R-69);
   - a 401 offers Forget token (R-26, R-84);
   - the messages follow R-78, and the `scanLanguage` guard follows R-79;
   - `githubCommit.ts` is untouched.

   Test against the pinned `previewCards.json`, and against the empty file that graduation leaves.
2. **State, routing and focus.** It reads `useCardEditor`, `editorState`, `usePreviewCardsFile`, `branchCards` and the page. Check that:
   - the lookup order is R3's (`CardLookup`), and a deep link before the card list loads reads as loading;
   - the re-seed and the keying hold (R-46, R-84);
   - the guard holds and words the drafts correctly (R-57, R-58), mode switches included;
   - focus is requested from state, never on a click (R-59, R-48), so a link's transition can't land it on the old view;
   - `scrollKey` and `documentTitle` are set;
   - the reload after a New publish lands (R-66).
3. **Accessibility and tokens.** Check:
   - the accordion's ARIA, the switch, `aria-pressed` groups and names;
   - DOM order against visual order (R-63, WCAG 2.4.3);
   - the file labels' keyboard path and rings;
   - live regions (the status lines, the outcome);
   - contrast on the new classes, against `adminTheme.test.ts`'s method;
   - tokens only (R-41), with no `COLORS.textDim` on data text.
4. **Tests.** Check:
   - mutations of the key rules: the stale check's keys, `hasEdits`, `visibleErrors`, `editKindOf` and `roundTrips`, the blocking table, `studioHref`'s encoding, and the past-the-set refusal;
   - each file's isolation: stubs restored in `afterEach`, `toEqual` on fetched JSON, `createMemoryRouter` for guarded pages, and `mockReset` in `beforeEach`;
   - no hard-coded counts on the pinned file.
5. **Plan and parity.**
   - Each decision R-57 to R-91 is built as worded, or recorded as a departure.
   - Every capability in `r4-audit-full.json`'s `parity.capabilities` survives in the studio. Read the list as data.
   - The reveal-sync contract holds: `scripts/reveal-sync` loads the four files by path, and `RevealCardForm` keeps its shape.
6. **Code Health.** The server gate's rules, per function and per module: cyclomatic complexity 8 or less, inner lambdas included; 4 arguments or fewer; the share of primitive parameters (hand count); Complex Conditional; Large Assertion Blocks and duplication in tests. Hooks stay wiring.
7. **Docs and copy.**
   - R4-7's runbook, skills, reveal-sync strings, `.env.example`, `vite-env.d.ts` and CLAUDE.md lines read true against the built UI's strings.
   - The UX copy follows the house style: the go-live notes, the refusals, the reasons in `IMAGE_ONLY_NOTES`, and the checklist's messages.

When it finishes, show the owner the merged list:
- **Important findings, with their verdicts,** are proposed for a fix wave (Step 10).
- **Minor findings** go to the follow-up issue (Step 11, item 5), never to a fix round (sdd-gates-once).
- **R4-6b's open defect** (Appendix A; Step 8, item 8), unless a rehearsal fix already took it, joins the important list whether or not a reviewer found it: after "Leave this page" on a held card change, focus falls to `<body>`, where R-59 wants the search field. The owner places it in the fix wave (Step 10) or in its own follow-up issue (Step 11, item 6).
- **The owner may move any item** from one list to the other.

- [ ] **Step 10: The fix wave (only if the owner picks items)**

Write `.superpowers/sdd/R-redesign/final-fix-r4-brief.md` on R3's model (`final-fix-r3-brief.md`):
- the branch and HEAD;
- the items to fix, each pointing at its entry in `final-review-r4.json`;
- one commit per area, with its message (`fix(studio): … (#24)`, `fix(reveal): … (#24)`, …);
- for each fix, a test that fails without it;
- "Everything else in the JSON is on the follow-up list: don't touch it."
- **R4-6b's open defect,** if the owner took it. The fix belongs in `src/shell`: for example, the guard asking for a handoff once Leave's navigation lands, or `focusUnmoved` counting focus inside a closing dialog as unmoved (R4-6b's hand-offs). Its test, failing first, is a `StudioEdit.test.tsx` case: open a card, edit it, follow "Load a different card", choose Leave this page, and expect focus in the search field. `focusHandoff.ts` also serves `/calibration` and `/cards`, and the guard `/calibration`, so the targeted run takes `src/shell`, `src/tools/analytics` and `src/tools/studio`.

Run it as R3's ran (`wf_fbfc088e-bbf`): an implementer per commit group, then one reviewer.
- **The gates:** targeted tests, eslint on the changed files, one `typecheck`, and `code_health_review` on the changed files.
- **Each commit** needs the owner's approval: `git add <paths>` as its own Bash call, then `USER_APPROVED=1 git commit -m "…"` as its own unpiped Bash call. The hook runs lint and `test:run`.

Then run these again:
- Step 2's sweeps;
- Step 3, for the files the wave touched;
- Step 4;
- Step 5, for the stories the wave touched;
- Step 6.

Record each fix commit's sha for Step 14.

- [ ] **Step 11: Draft the follow-up issues (the owner files them)**

Show the owner the drafts below, and keep them in `.superpowers/sdd/R-redesign/r4-followup-issues.md`. File each one only on the owner's word, with the command under it.
- **When.** File items 2 to 6 before Step 15, so their numbers land in "R4 as built". Item 1 is filed after the merge (R-62).
- **Content.** Keep vote, voter and event counts out of every title and body. Card ids and set numbers are fine.
- **"Done".** If the owner says only "done", ask which issues they filed (memory: confirm which steps are done).

Before filing item 1, re-read the app's lines on `master`, because they drift:

```bash
gh api repos/Doberjohn/inkweave/contents/CLAUDE.md --jq .content | base64 -d | grep -n "Admin tools live"
gh api repos/Doberjohn/inkweave/contents/docs/reveals/START_REVEAL_SEASON.md --jq .content | base64 -d | grep -n -i "publisher\|inkweave-admin.vercel.app"
```

Adjust the body to what they print, and to admin's runbook as R4-7 left it (its "Ids and filenames" and "Ink blocks" lines, which `:93` and `:98` mirror; R4-7's hand-off). On 2026-10-07 (app `master` and the pin, `16283a13`), the first printed `CLAUDE.md:225`. The second printed lines 7, 67, 93, 98, 129, 133, 137 and 174.

1. **The app's docs (R-62),** filed after the merge, with the PR number filled in:

```bash
gh issue create --repo Doberjohn/inkweave --title "Docs: name admin's Card studio, which replaced the reveal publisher and image tool" --body-file - <<'EOF'
Admin's Card studio (`/studio`, Doberjohn/inkweave-admin#24, R4, PR Doberjohn/inkweave-admin#<N>) replaced the reveal publisher (`/reveal`) and the image tool (`/image`). Both old paths redirect to it, so links keep working, but this repo's docs still name the old tools.

- `CLAUDE.md`, the "Admin tools live in `Doberjohn/inkweave-admin`" bullet:
  - The tool list: "the reveal publisher, image tool, tuning editor, …" becomes "Card studio (New reveal and Edit card), the tuning editor, …".
  - "reveal, image and tuning commit to `master`" becomes "Card studio and the tuning editor commit to `master`". The last sentence's "the raw scans its reveal publisher commits" becomes "the raw scans Card studio commits".
  - The modules admin re-exports: add `shared/components/{DialogShell,InkwellIcon}` and `features/synergies/{hooks/usePrecomputedSynergies,utils/scoreUtils}`, and drop `src/assets/{enchanted,epic,iconic}.webp`. Admin now draws printings through `RaritySymbol`.
- `docs/reveals/START_REVEAL_SEASON.md`:
  - "reveal publisher" becomes Card studio in the Outcome line, the franchise-hint row, the no-number bullet ("admin's reveal publisher requires a number"), the ink-block paragraph, "One card at a time" and "Two writers to `master`". So does "the publisher" in the season-switch note.
  - The no-number bullet: such cards are added, and renumbered, only by PR. Card studio's New reveal requires a number, and its Edit card keeps a card's id and number as they are (admin's runbook, "Ids and filenames").
  - The ink-block paragraph: Card studio checks the ink against the number in New reveal and Edit card alike. "Numbers above `SET_TOTAL` (promos, enchanteds) are not checked" no longer holds: New reveal refuses every number above `SET_TOTAL`, since each is an Epic, Enchanted or Iconic printing of a card in the set (admin's runbook, "Ink blocks").
  - "One card at a time" links https://inkweave-admin.vercel.app/studio.
  - The variant paragraph says admin's tools "do not handle variants". Admin's `scripts/reveal-sync/variants.mjs stage` and `publish` (Doberjohn/inkweave-admin#22) are a third path, and Card studio refuses a collector number past the set and points to it.

Docs only, no code change. Raised by admin's R4 (decision R-62).
EOF
```

2. **Per-row revert in Edit's change list (R-77),** only if the owner wants it tracked:

```bash
gh issue create --repo Doberjohn/inkweave-admin --title "Card studio: revert one change at a time in Edit's change list" --body-file - <<'EOF'
Edit card's change list (Card studio, `/studio?mode=edit`) offers Discard, which drops every change, and Revert image, as the design handoff drew it (decision R-77).

Reverting one row needs each row to know the form fields it restores. One field can feed several card keys: the type sets `type` and the four stats (`src/tools/studio/changeRows.ts`, `cardEdit.ts`'s `FIELD_KEYS`). R2's tuning tray has per-row revert because its edits are independent rows.

Proposal: map each change row back to its form fields through `FIELD_KEYS`, and restore those fields from the draft's starting values. After a revert, focus moves as the tray's does (R2's F23): the next row's revert button, else the previous one's, else the list's heading.

Part of the admin redesign (#24), deferred by R4's decision R-77.
EOF
```

3. **A printing's English refresh (R-80),** only if the owner wants it tracked:

```bash
gh issue create --repo Doberjohn/inkweave-admin --title "Refresh a variant printing to its English scan from admin" --body-file - <<'EOF'
Card studio's Edit card refreshes a card to its English scan: the new art, `scanLanguage` removed and any rename, in one commit. That delivered #14's item 3 for cards. It never touches a printing: it keeps `variants` as loaded (decision R-2), and its search lists cards only (decision R-80).

Since inkweave#728 a variant printing may carry its own `scanLanguage`. On the app's `master`, 14213 (the Epic printing of 14085) is marked `it`. Its refresh is a hand edit in the app today, as admin's `docs/REVEAL_RUNBOOK.md` describes.

Proposal: a `refresh <number>` subcommand for `scripts/reveal-sync/variants.mjs`, beside `stage` and `publish`. It checks the printing's official English scan, replaces its art, deletes its `scanLanguage`, and opens a `reveals/…` PR in the app the way `publish` does, on the owner's approval.

Part of the admin redesign (#24), deferred by R4's decision R-80.
EOF
```

4. **Drag-and-drop upload (R-89),** only if the owner wants it tracked:

```bash
gh issue create --repo Doberjohn/inkweave-admin --title "Card studio: accept a dropped image file" --body-file - <<'EOF'
Card studio uploads a scan by click and keyboard only, through `useHiddenFileInput`, as the reveal publisher and image tool did. Decision R-89 dropped the design handoff's "drop image" wording for that reason.

Proposal: accept a file dropped on the preview's cover (`adm-file-cover`) and on Replace card image, through `useImageUpload`'s `choose`, so the extension and byte checks still apply. Keep the label's keyboard path, and say "or drop an image" only once dropping works.

Part of the admin redesign (#24), deferred by R4's decision R-89.
EOF
```

5. **The final review's minors,** as #34 did for R3. Fill in one bullet per minor from `final-review-r4.json`, each with its file and line, its failure scenario in a sentence, and its fix:

```bash
gh issue create --repo Doberjohn/inkweave-admin --title "Card studio: polish and test pins left from R4's final review" --body-file - <<'EOF'
R4's final review (Card studio, #24) listed these minor findings. None blocks the phase, so they are tracked here rather than fixed in a round of their own.

<one bullet per minor: **file:line**: what is wrong, in one sentence; the fix.>

Part of the admin redesign (#24).
EOF
```

6. **R4-6b's open defect,** only if the fix wave didn't take it (Step 9):

```bash
gh issue create --repo Doberjohn/inkweave-admin --title "Card studio: focus falls to the page after Leave this page on a card change" --body-file - <<'EOF'
In Card studio's Edit card (`/studio?mode=edit`), open a card, edit it, follow "Load a different card", and choose Leave this page. Focus falls to `<body>`. Decision R-59 wants it in the search field.

The app's `DialogShell` hands focus back to the dialog's opener as it closes, but only if the opener is still in the page. Leave lets the navigation through, which unmounts the opener, "Load a different card". The search's focus taker then finds focus on the closing dialog's "Leave this page" button, so `focusUnmoved` says the user moved it and the taker leaves it there. Focus then drops to `<body>` as the dialog unmounts.

Proposal: fix it in `src/shell`, either by having the guard ask for a handoff once Leave's navigation lands, or by having `focusUnmoved` count focus inside a closing dialog as unmoved. Both are shared: `focusHandoff.ts` serves `/calibration` and `/cards` too, and the guard `/calibration`. Pin it with a `StudioEdit.test.tsx` case that ends with focus in the search field. Leaving `/studio` for another page isn't affected, since a page change moves no focus.

Part of the admin redesign (#24), left open by R4's task R4-6b.
EOF
```

Each `gh issue create` prints the issue URL. Note each URL for Steps 14 and 19.

- [ ] **Step 12: Check CLAUDE.md and the other docs (R4-7's) against the code**

R4-7 edited them before the final review. Check that they still match the code after any fix wave:

```bash
cd /d/johnn/Projects/inkweave-admin
grep -nE "src/tools/studio|/studio|studioHref|writeInFlightMessage|Card studio" CLAUDE.md
grep -nE "the write tools \`/reveal\` and \`/image\`|\`/reveal\` and \`/image\` don't yet|The reveal, image and tuning tools|Reveal and tuning also read|src/tools/\{reveal,image,analytics\}" CLAUDE.md
grep -c 'R4 redirects `/reveal` and `/image` to `/studio`' docs/PLAN.md
grep -nE "/studio|/reveal|/image" README.md
grep -n "<AdminStyles />" .storybook/preview.tsx
grep -nE "vercel\.app/reveal|reveal publisher" "$HOME/.claude/skills/scan-reveal-card/SKILL.md"
```

Expected:
- **The first grep** prints lines in "The tools" (`:15` to `:18`):
  - the tools list names `src/tools/studio`;
  - the Routes bullet names `/studio`, `studioHref` and the two redirects;
  - the write-pages bullet names `/studio`, the studio's guard with its own `leaves` and wording, and `writeInFlightMessage`.

  Compare each claim with the code. If a fix-wave commit changed something a line describes (a name, a path, which page mounts the guard), edit that line to the code. That is the only CLAUDE.md edit this task makes.
- **The second grep** prints nothing: none of the pre-R4 wording is left.
- **`docs/PLAN.md`** prints `1`: D10 already says R4 redirects `/reveal` and `/image` to `/studio`. R4-7 checked it.
- **`README.md`** prints nothing: it names no admin page route.
- **The `.storybook` grep** prints one line: Storybook mounts `AdminStyles` for every story, so R4's classes reach the stories with no change there.
- **The skill grep** prints nothing once the owner has approved R4-7's edit to the user-level skill. Otherwise list it under "Held for the owner".

If this step edited CLAUDE.md, show the owner `git diff --stat` and the commands, and ask for approval. Run `mcp__codescene__pre_commit_code_health_safeguard` after staging. Then, with the Bash tool, stage as its own call:

```bash
git add CLAUDE.md
```

Then, as its own unpiped call:

```bash
USER_APPROVED=1 git commit -m "docs: describe Card studio as built (#24)"
```

The hook runs `pnpm lint` and `pnpm test:run`.

- [ ] **Step 13: Check R4's records in the main plan, the Roadmap row and the heading**

The plan commit recorded R4's planned contract in `docs/plans/R-redesign.md`, in "File structure (R1)", "Shared interfaces (R1)", "Contract additions from the task drafts" and the bridge record. Make three kinds of edit only:
- items 1 to 3 below;
- for each export Step 3 found different from its record, the as-built line, with a line under "Departures" in Step 14;
- each Appendix A record that the plan commit didn't write.

Use the Edit tool. If an anchor doesn't match exactly once, report it and don't guess.

**1. The Roadmap's R4 row.** Replace the whole row, matched by its start `| **R4** | Card studio at`, which occurs once, whatever its cells say. New:

```md
| **R4** | Card studio at `/studio`, which replaces `/reveal` and `/image` (both redirect): New reveal (a preview-led layout, a checklist and section states from the validator), Edit card (field edits and an image in one fail-closed commit for preview cards, image-only fixes for released cards, and the cards only the branch file holds); "Edit in Card studio" on Card analytics; printings through `RaritySymbol` (#32); skill and runbook links move | The full redesign | Below (detailed 2026-10-07) |
```

**2. The sentence under the table.** Current:

```md
The owner plans further changes after seeing R1 with real data, so R2–R4 are detailed only when each starts.
```

New:

```md
Each of R2 to R4 was detailed when it started, after the owner had used the phase before it.
```

**3. The heading.** Replace the line that starts `## Phase R4: Card studio`, whatever follows, with:

```md
## Phase R4: Card studio (detailed)
```

The plan commit should already have made this change. Then check that the paragraph under it names "tasks R4-1a to R4-8" and the base: `main @` the bump's merge sha, filled in, and pin `16283a13`.

Then check the records:

```bash
cd /d/johnn/Projects/inkweave-admin
git diff --stat -- docs/plans/R-redesign.md
grep -nE "^\| \`src/.*(tools/studio|writeInFlight\.ts|\`Tag\`|Tag\.tsx|cardFacts|replaceCardInPreviewJson|livePreview|emptyForm|revealForm\.ts)" docs/plans/R-redesign.md
grep -nE "(function|type|const|interface|class) (studioHref|StudioMode|writeInFlightMessage|replaceCardInPreviewJson|mergeCardChanges|commitCardEdit|readPreviewCards|StaleCardError|editKindOf|cardChanges|hasEdits|searchCards|changeRows|revealChecklist|sectionStatuses|visibleErrors|usePreviewCardsFile|useCardEditor|studioLayout|shouldBlockStudioNavigation|StudioPage)\b" docs/plans/R-redesign.md
grep -nE "adm-(acc-head|pick-btn|ink-tile|switch|file-btn|file-cover|range)" docs/plans/R-redesign.md
grep -nE "InkwellIcon|transformRawCards|R4-5h removes|Enchanted webp" docs/plans/R-redesign.md
grep -nE "to: Location \| null|UnsavedMessage|message: string; leaves" docs/plans/R-redesign.md
```

Expected:
- **The first grep** prints the file-structure rows that name R4's new modules, wherever in the row: the studio folder, `writeInFlight.ts` (R4-5s adds it to the guard's row), `Tag` and `cardFacts.ts` (perhaps in the `src/ui/*.tsx` row), and the new reveal modules under the names Step 1 found (`emptyForm.ts`, not `revealForm.ts`).
- **The second** prints at least one line for each of the 21 names, at the signature the code has (Step 3).
  - Where the record's signature differs, the code wins: for example, `studioModeOf(location)`, or `StudioCardPanel`'s `current`.
  - `sectionStatuses` is R4-3a's name. If the record says `sectionStatus`, write the as-built name.
- **The third** prints the class list's "R4 adds" line with all seven classes (R4-5a's hand-off).
- **The fourth** prints:
  - the bridge record with `InkwellIcon` and `transformRawCards`;
  - its line "R4-5h removes `enchantedSymbol`, `epicSymbol` and `iconicSymbol` (R-83, admin#32)";
  - no "Enchanted webp": the correction "Icons (R1, R3, R4)" drops it (R4-5h's hand-off).
- **The fifth** prints the guard's records as R4-5s's contract additions word them (its hand-off: they replace `R-redesign.md:689` and `:693`, R2's lines): `UnsavedChangesGuardState` with `to: Location | null`, `export type UnsavedMessage = string | ((to: Location) => string)`, and `UnsavedChangesGuard`'s props with `message: UnsavedMessage`. No line prints with `message: string; leaves`: that is R2's guard line, which must be gone. `UnsavedChangesDialog`'s `message: string` stays, since its props didn't change.

A record that is missing gets the as-built line from the code, written where its neighbours sit. A record that differs from the code gets the as-built line too. Each also gets a "Departures" line in Step 14.

- [ ] **Step 14: Write "R4 as built" and the Status line**

In `docs/plans/R-redesign.md`, replace the **Status:** paragraph, matched by its start `**Status:**`, whatever it says. Use `<date>` from `date +%F`. New:

```md
**Status:** R1 built and checked against real data on 2026-10-02; see "R1 as built". R2 built, checked against real data and merged on 2026-10-06 (PRs #27 and #28); see "R2 as built". R3 built, checked against real data and merged on 2026-10-07 (PR #31); see "R3 as built". R4 built, checked and rehearsed on <date>; see "R4 as built". R4's PR completes the redesign; #24's closing comment records its merge.
```

Then append this section at the end of the file, after the paragraph under `## Phase R4: Card studio (detailed)`. If another section follows that paragraph, insert it before that section's heading instead. Leave one blank line before it. Fill each `<…>` slot from this task's run: the slot says what goes in it. Check each "What shipped" line against the code (Step 3). Reword any line the code doesn't bear out, or drop it.

```md
### R4 as built (<date>)

Tasks R4-1a to R4-8 (R4-1a, R4-3a, R4-5a, R4-5s, R4-5h, R4-1b, R4-2a, R4-2b, R4-3b, R4-4a to R4-4d, R4-5b to R4-5f, R4-6a to R4-6c, R4-7) on `feature/24-redesign-r4`, cut from `main` after the pin bump to `16283a13` (PR #<bump PR>)<, then the final review's fix wave (`<sha>`, …)>.

- **What shipped:**
  - **`/studio`, Card studio.** One write page with two modes, New reveal and Edit card, behind the token gate inside `PageLayout … writes`.
    - The mode switch sits in the header's actions. It pushes `studioHref(mode, card)`, so Back returns to the other mode, and both drafts stay mounted (R-57).
    - One `UnsavedChangesGuard` names the drafts a navigation would drop, and uses R2's sentence while a write is in flight (R-58).
    - At a content width of 1328px and up the card comes first, in four columns; below that the form leads, as an accordion (R-63, R-64).
    - The sidebar's Forget token drops both drafts. The in-page offer after a 401 asks first while a draft is dirty (R-84).
  - **New reveal.** It is the reveal publisher's write chain, unchanged (`commitNewCard`), with:
    - a ready checklist and section states from the validator, where a blank required field is incomplete, never red (R-72);
    - a refusal for a number past the set, which points to `variants.mjs stage` (R-73);
    - French in the scan languages, and any other code named (R-60);
    - the card panel's caption, pill and formats (R-89);
    - the synergies in a "Synergies · computed live" panel (R-90);
    - a go-live note of 15 to 20 minutes (R-66).
  - **Edit card.** It searches the card list plus the cards only the branch file holds, tagged "not deployed yet" (R-66). On a blank query, the branch file's preview cards come first (R-76).
    - **A preview card that round-trips through the form** gets field edits and an image in one commit (`replaceCardInPreviewJson`, `commitCardEdit`).
      - The commit compares only the editable keys plus id, setCode and number, and merges at the base commit, so `variants` survive (R-67).
      - Its messages follow R-78, and the collector number stays locked (R-91).
    - **A released card, or an entry the form can't hold,** gets a facts list with its reason, and an image-only commit through `commitCardImage` (R-61, R-65).
    - **Image fixes** wait on `previewCards.json` only for set-14 cards (R-71).
    - **After a save,** the card stays open, and the saved values become its baseline (R-70).
    - **A refusal** offers Load it again, which keeps the edits that still apply and says how many it dropped (R-68).
    - **A save that lands after the operator left the card** shows nothing (R-69).
    - **Focus** moves from state, never on a click (R-59, R-48), and the tab names the card (R-51).
  - **Links.**
    - "Edit in Card studio" on Card analytics (R-82).
    - "View card analytics" from the Editing banner, for deployed cards (R-33).
    - `/reveal` and `/image` redirect to `studioHref('new')` and `studioHref('edit')` (R-10).
  - **Shared pieces.**
    - `studioHref` and `StudioMode` in `nav.ts` (R-81);
    - the guard's `to` and its message function, and `writeInFlightMessage` (R-58);
    - `Tag` and `cardFacts` in `src/ui` (R4-5f);
    - `SR_ONLY` in `src/ui/layout.ts` (R4-5b);
    - seven `adm-*` classes;
    - in the bridge, `InkwellIcon` and `transformRawCards` added, and the three printing webps, `EMPTY_BOX` and `GOLD_GLOW` gone.
  - **Also:**
    - `/web` draws printings through `RaritySymbol` (R-83), which closes #32 at the merge;
    - the runbook, the skills and the reveal-sync wording point at Card studio (R4-7).
- **Departures from the plan:** <one sub-bullet per departure, in this form: `**Task R4-N:** what changed and why (approved <date>).` Include every record Step 13 rewrote, each hand-off in Appendix A that the code bears out, any fix commit from Steps 2, 5, 6, 7 or 10, and any rehearsal fix. If there are none, write "none".>
- **Held for the owner:** <each item the owner held, with where it stands, or "nothing". Include any rehearsal item not run (Step 8), R4-6b's focus defect with where it stands (fixed in the wave, with its sha, or its follow-up issue, Step 11 item 6), and the user-level skill edit if it isn't done (Step 12).>
- **Follow-up issues:** <each filed issue as `repo#N: title`; "the app's docs issue (R-62) is filed after the merge, and #24's closing comment names it">.
- **The owner's rehearsal (R-86):** run on <date> against a throwaway app branch, deleted since.
  - **New reveal:** <what item 1 showed>.
  - **Edit, variants kept:** <a preview card with `variants` kept them, in a `fix(reveals): update …` commit>.
  - **English refresh:** <a card refreshed to English with a rename, in a `fix(reveals): refresh … to its English scan` commit>.
  - **Released card:** <a released card's image replaced, image-only>.
  - **Layout:** <1366px and 1440px gave the accordion, and about 1600px with the sidebar open gave the four columns; whether the threshold flip showed, and where focus went when a resize flipped the layout>.
  - **Branch-only card and spacing:** <whether the published card listed as "not deployed yet" and opened for an edit, or "not run" if item 1 published nothing; what the owner thought of the banner's and the search's padding>.
  - **Focus after Leave:** <where focus landed after Leave this page on a card change (Step 8, item 8), against R-59's search field>.
- **Checks (R4-8):**
  - **Storybook.** Every story renders. R4's stories show no sideways scroll at 1600px, 1440px, 1366px and phone width <, except …>. The accessibility panel reports 0 violations, and play functions pass.
  - **Without a token,** `/studio` shows the gate under the page's header and branch notice. `/reveal` and `/image` redirect without a history entry of their own. "Edit in Card studio" opens the card in Edit, and nothing requests GitHub.
  - **Final review:** <n> important findings fixed in the wave, and <n> minors in <#N>.
  - **Code Health.** `analyze_change_set` passed. The PR's own CodeScene check is read once the PR opens (Task R4-8, Step 17).
```

Keep vote, voter and event counts out of it. Card ids, pixel widths and finding counts aren't vote counts.

Check the result:

```bash
cd /d/johnn/Projects/inkweave-admin
grep -n "^\*\*Status:\*\*\|^## Phase R4\|^### R4 as built" docs/plans/R-redesign.md
grep -n "^\*\*Status:\*\*" docs/plans/R-redesign.md | grep -c "<date>"
sed -n '/^### R4 as built/,/^## /p' docs/plans/R-redesign.md | grep -nE "<(date|n|sha|#N|bump PR)>|<[,a-z0-9][^>]* [^>]*>"
```

Expected:
- The first grep prints the Status line, then `## Phase R4: Card studio (detailed)`, then `### R4 as built (…)`, in that order.
- The second prints `0`: the Status line's date is filled.
- The third prints nothing: every slot in the new section is filled. Run on the unfilled template, it matches every line that holds a slot (15 lines): the bare ones (`<date>`, `<n>`, `<sha>`, `<#N>`, `<bump PR>`) and the worded ones (`<, then …>`, `<what item 1 showed>`, `<1366px …>`). A TypeScript type quoted in a Departure, such as `Record<keyof RevealCardForm, …>`, can match too: read each line before calling it a missed slot.

- [ ] **Step 15: Commit the plan record**

The Spec paragraph is still unedited: Step 16 changes it. Show the owner `git diff --stat` and the commands, and ask for approval. Run `mcp__codescene__pre_commit_code_health_safeguard` after staging. Then, with the Bash tool, stage as its own call:

```bash
git add docs/plans/R-redesign.md
```

Then, as its own unpiped call:

```bash
USER_APPROVED=1 git commit -m "docs(plan): record R4 as built (#24)"
```

Expected:
- the hook runs `pnpm lint` and `pnpm test:run`, then git prints the commit summary;
- `git status --short` prints nothing.

If Vitest fails to start its workers under load, stop this session's preview servers, wait for other sessions' runs to finish, and retry. Never pass `--no-verify`.

- [ ] **Step 16: Retire the design handoff (R-88), the branch's last planned commit**

**1. Move the handoff out of the working copy (the owner's).** The hook's `eslint .` would lint `docs/redesign/handoff/support.js` once the ignore goes, which gave 67 errors (re-base note 5). Nothing reads the handoff after the final review.
- Ask the owner to move `docs/redesign/` to a folder of their choosing outside the repo, or to approve the controller moving it there: `mv docs/redesign "<the owner's folder>/redesign-handoff"`.
- Never delete it. The owner deletes it after the merge.

Then:

```bash
cd /d/johnn/Projects/inkweave-admin
ls docs/redesign 2>&1
git status --short --ignored -- docs/redesign
```

Expected: `ls` says there is no such file or directory, and `git status` prints nothing.

**2. `eslint.config.js:32-34`.** Current:

```js
export default tseslint.config(
  // docs/redesign/ is the design handoff. Its support.js is the prototype's
  // browser runtime, not admin code.
  {ignores: ['dist', 'coverage', 'upstream', 'app-master', '.reveal-sync-convert', 'docs/redesign/']},
```

New:

```js
export default tseslint.config(
  {ignores: ['dist', 'coverage', 'upstream', 'app-master', '.reveal-sync-convert']},
```

**3. `src/theme/__tests__/adminTheme.test.ts:37`.** Current:

```ts
// The handoff's neutral ladder (docs/redesign/handoff/README.md, Design tokens).
```

New (two lines; the next two lines stay):

```ts
// The design handoff's neutral ladder, from its README's "Design tokens" (R-1). The
// handoff left the working copy after R4 (R-88), so these values are its record.
```

**4. `docs/plans/R-redesign.md:15`, the Spec paragraph.** Replace the whole paragraph. Current:

```md
**Spec:** `docs/redesign/handoff/README.md` plus the prototype `docs/redesign/handoff/Inkweave Admin.dc.html`. The handoff lives outside git, in the owner's working copy only (`.git/info/exclude`), and is deleted once R4 ships (owner, 2026-10-01). Open the prototype with `support.js` next to it, served over HTTP; it doesn't run from `file://`. The spec's own fixtures are sample data. Where this plan and the spec disagree, **this plan wins**: the "Corrections to the spec" section lists every case, and each comes from the 2026-10-01 review of the handoff against the code.
```

New:

```md
**Spec:** the Claude Design handoff of 2026-10-01, a README plus the prototype `Inkweave Admin.dc.html`. It lived outside git, in the owner's working copy only, and was retired when R4 shipped (owner, 2026-10-01; R-88). So the `docs/redesign/handoff/…` paths and `dc.html` lines that the task files cite no longer resolve, and those files record what the handoff said. The spec's own fixtures were sample data. Where this plan and the spec disagreed, **this plan won**: "Corrections to the spec" lists every case, from the 2026-10-01 review of the handoff against the code and from R4's decisions (R-91).
```

Then check:

```bash
cd /d/johnn/Projects/inkweave-admin
git diff --stat
git grep -n "docs/redesign" -- . ':!docs/plans/**'
pnpm exec eslint --max-warnings 0 eslint.config.js src/theme/__tests__/adminTheme.test.ts
pnpm vitest run --project app src/theme/__tests__/adminTheme.test.ts
```

Expected:
- **The stat** shows three files: `eslint.config.js` (one line in, three out), `adminTheme.test.ts` (two lines in, one out) and `R-redesign.md` (one line in, one out).
- **The grep** prints nothing: no code, config or doc outside `docs/plans/` names the folder. The plan keeps its mentions as history: the Spec paragraph, R-88's row, and the task files' citations.
- **eslint** exits 0. `eslint.config.js` is linted here with its own new contents.
- **The test file** passes.

Show the owner `git diff` and the commands, and ask for approval. Run `mcp__codescene__pre_commit_code_health_safeguard` after staging. Then, with the Bash tool, stage as its own call:

```bash
git add eslint.config.js src/theme/__tests__/adminTheme.test.ts docs/plans/R-redesign.md
```

Then, as its own unpiped call:

```bash
USER_APPROVED=1 git commit -m "chore(redesign): retire the design handoff (#24)"
```

Expected: the hook's `pnpm lint` passes with the folder gone, then `test:run` passes, and git prints the commit summary.

If lint names a file under `docs/redesign/`, the folder is still in the working copy. Move it out (item 1) and commit again. Never put the ignore back to get past it.

- [ ] **Step 17: Push and open the R4 PR (owner approval), and read its checks**

Show the owner these, and ask for approval:
- the branch, and `git log --oneline main..HEAD`;
- the push command;
- the PR title and body below, saved as `.superpowers/sdd/R-redesign/r4-pr-body.md`.

Adjust the body first:
- **Departures.** If "R4 as built" lists any, restate them in a `## Departures from the plan` section.
- **A dropped bullet.** If a Verification bullet didn't hold, say what did instead.
- **The rehearsal.** Fill its line from Step 8.

Run Step 6's `analyze_change_set` once more first: Step 16's commit touched two code files after Step 6 last ran. Make sure no preview server is running. Then, after a clear yes, run each command with the Bash tool:

```bash
cd /d/johnn/Projects/inkweave-admin
USER_APPROVED=1 git push -u origin feature/24-redesign-r4
```

Expected: the pre-push hook runs `pnpm check:deps` and `pnpm typecheck`, then git reports the branch pushed.

```bash
gh pr create --repo Doberjohn/inkweave-admin --base main --head feature/24-redesign-r4 \
  --title "feat(studio): admin redesign R4, Card studio (#24)" \
  --body-file - <<'EOF'
## Summary

R4 of the admin redesign ([plan](https://github.com/Doberjohn/inkweave-admin/blob/feature/24-redesign-r4/docs/plans/R-redesign.md), decisions R-57 to R-91): Card studio at `/studio`, which replaces the reveal publisher (`/reveal`) and the image tool (`/image`). This is the redesign's last phase.

- **Card studio at `/studio`:** one write page, behind the token gate, with two modes in the header: New reveal and Edit card.
  - **The mode switch** keeps the open card, and Back returns to the other mode.
  - **Both drafts stay open.** One guard asks before a navigation would drop one, and says which.
  - **Layout.** On a wide window the card leads, in four columns. Narrower, the form leads, as an accordion.
- **New reveal:** the reveal publisher's commit, unchanged, with:
  - a ready checklist and section states drawn from the validator, where blank fields read as incomplete, not as errors;
  - a refusal for collector numbers past the set, which points to `variants.mjs stage`;
  - French as a scan language;
  - a preview-led card panel, and the synergies restyled.
- **Edit card:** it searches every Core card, plus the cards only the target branch's `previewCards.json` holds ("not deployed yet").
  - **A preview card** gets field edits and a new image in one commit. The commit refuses a card that changed since it loaded, and keeps `variants` and every key the form doesn't hold.
  - **A released card** shows its facts, and gets an image-only fix.
  - **After a save,** the card stays open. After a refusal, "Load it again" keeps the edits that still apply.
  - **#14.** Refreshing a card to its English scan, a rename included, is one save. That delivers #14's item 3 for cards; printings stay a hand edit.
- **Links:** "Edit in Card studio" on Card analytics, and "View card analytics" from the Editing banner. `/reveal` and `/image` redirect into the studio.
- **`/web`:** printings are drawn through the app's `RaritySymbol`, and the three bridged webps go.
- **Shared pieces:**
  - `studioHref` in `nav.ts`;
  - the guard's wording for the held navigation, with one shared in-flight sentence;
  - `Tag` and `cardFacts` in `src/ui`;
  - seven `adm-*` classes;
  - `InkwellIcon` and `transformRawCards` in the bridge.
- **Docs:**
  - the runbook, the fetch-reveals skill and the reveal-sync wording;
  - CLAUDE.md;
  - the plan's "R4 as built";
  - the design handoff retired (its lint ignore and its references).

## Verification

- `pnpm build` and `pnpm check:deps` pass. `pnpm lint` and `pnpm test:run` (the reveal-sync suite included) run in every commit's hook, and `typecheck` in the pre-push hook.
- **Storybook:** a one-off `storybook build` succeeds, and every story renders. R4's stories show no sideways scroll at 1600, 1440 and 1366px or at phone width (stories pinned to the wide layout aside), and pass the accessibility panel.
- **CodeScene:** `analyze_change_set` passes locally.
- **Without a token:** `/studio` shows the gate under the page's header and branch notice, and `/reveal` and `/image` redirect. "Edit in Card studio" opens the card in Edit, and nothing calls GitHub.
- **The owner's rehearsal,** on a throwaway branch of the app: <Step 8's line>.
- **A final review,** one parallel reviewer per dimension: its important findings are fixed here, and its minors are tracked in #<N>.

#14: item 3 ships here for cards. It is closed by hand after the deploy, noting that printings stay a hand edit. #24 is closed by hand after the deploy too.

Closes #32.
EOF
gh pr view --repo Doberjohn/inkweave-admin feature/24-redesign-r4 --json url,closingIssuesReferences
```

Expected:
- `gh pr create` prints the PR URL.
- `gh pr view` shows `closingIssuesReferences` holding #32 only. #14 and #24 close by hand (R-87).

Give the owner the URL. Once the checks finish:

```bash
gh pr checks --repo Doberjohn/inkweave-admin feature/24-redesign-r4
```

Expected: `CodeScene Code Health Review (main)` passes, along with `build-and-test`, `GitGuardian Security Checks` and `CodeRabbit`. cubic may report `skipping` for its quota. It reviews only if the owner asks it to, in a PR comment: `@cubic-dev-ai review this`.
- **If CodeScene fails,** its link opens the delta on codescene.io, which the owner can open. Fix each named function in the owning task's files as a `fix(<area>): … (#24)` commit, approved, then push again. Such commits land after the retirement commit, which is fine: nothing they touch needs the handoff.
- **Reviewers' comments.** Check each CodeRabbit and cubic finding with a fresh subagent. Go through them with the owner before replying on a thread or resolving it.

- [ ] **Step 18: After the merge: Deploy and the owner's smoke test**

The owner merges the PR. The push to `main` runs Deploy:

```bash
cd /d/johnn/Projects/inkweave-admin
gh run list --repo Doberjohn/inkweave-admin --workflow deploy.yml --branch main --limit 1
gh run watch <run id> --repo Doberjohn/inkweave-admin --exit-status
git fetch origin
git log --oneline -1 origin/main
```

Expected: the run succeeds. Note the merge sha from the last command for Step 19.
- **If "Assert every admin URL is behind Vercel login" fails** with the fresh deployment URL at 404, that is a propagation race (memory: deploy login-gate 404 race). Re-probe each listed URL anonymously, with `curl -s -o /dev/null -w '%{http_code} %{redirect_url}' <url>`. Expect a 302 to `https://vercel.com/sso-api`.
- **A 200 on any URL is a real exposure.** Stop and tell the owner at once.

**The owner's `/studio` smoke test,** signed in at `https://inkweave-admin.vercel.app`, with the token saved in that site's storage. Production commits to the app's `master`, so the smoke test publishes nothing and saves nothing. Ask the owner to check:
1. The sidebar shows Card studio, with no Reveal publisher and no Card images. `/reveal` and `/image` land in the studio.
2. **New reveal:** the form, the card panel and the checklist. Publish stays off while the form is incomplete. Don't publish.
3. **Edit card:**
   - a blank search lists the branch file's preview cards first;
   - a preview card opens with fields, and a released card with its facts, image-only, with no synergies;
   - the banner's "View card analytics" opens the card's page, and that page's "Edit in Card studio" opens it back in Edit.

   Don't save. After set 14 graduates (2026-10-23), the file is empty, and no card opens with fields.
4. **Moving around:** the mode switch keeps the card, and Back returns to the other mode. In Edit card, with a field of a preview card typed, the sidebar's Overview link asks first: choose "Stay on this page", then the change list's Discard. (After graduation, type into New reveal instead, and clear the field afterwards.)
5. **The tab** names the open card. `/web`'s "By rarity" shows the printing icons.

If the owner reports a problem, it becomes a `fix/24-…` branch and PR of its own. Record it in #24's comment.

- [ ] **Step 19: Close #32, #14 and #24 (owner approval), and tidy up**

Check each issue's state. Closing keywords have failed in this repo before (memory: closing keyword check):

```bash
gh issue view 32 --repo Doberjohn/inkweave-admin --json state
gh issue view 14 --repo Doberjohn/inkweave-admin --json state
gh issue view 24 --repo Doberjohn/inkweave-admin --json state,body --jq '.state, (.body | split("\n")[] | select(contains("**R4:**")))'
```

Expected:
- **#32** is `CLOSED`, by the merge's keyword.
- **#14** is `OPEN`.
- **#24** is `OPEN`, and its R4 line still reads `- [ ] **R4:** …`.

Show the owner the comments below, and act on each only on the owner's word. Fill in the PR number, the merge sha, the Deploy run id and the follow-up numbers.

**#32, only if it is still open:**

```bash
gh issue close 32 --repo Doberjohn/inkweave-admin --reason completed --comment "Done in R4, PR #<N> (merge <sha>): /web's printings are drawn through RaritySymbol, and the three webp re-exports and their comment left src/app-bridge.ts. Closing by hand, because the closing keyword didn't take."
```

**#14:**

```bash
gh issue close 14 --repo Doberjohn/inkweave-admin --reason completed --comment "$(cat <<'EOF'
Item 3 shipped for cards in R4's Card studio, PR #<N> (merge <sha>), live since Deploy run <id>.

Edit card (`/studio?mode=edit`) refreshes a preview card to its English scan in one commit: the new scan, `scanLanguage` removed, and the rename if the English release has one. Its message reads `fix(reveals): refresh {fullName} ({setCode}{number}) to its English scan` (decision R-78).

Variant printings aren't covered. Edit card keeps a card's `variants` as they are, so a printing's English refresh stays a hand edit in the app, as `docs/REVEAL_RUNBOOK.md`'s "Editing a card, and refreshing it to its English scan" says (decision R-80)<; follow-up: #M>.
EOF
)"
```

**#24.** First file Step 11's item 1 (R-62) in the app repo, on the owner's word, so the comment below can name it. If the owner holds that issue, drop the comment's last sentence, and add it later as a reply once the issue is filed.

Then tick R4 in #24's body:

```bash
cd /d/johnn/Projects/inkweave-admin
SCRATCH="C:/Users/johnn/AppData/Local/Temp/claude/D--johnn-Projects-inkweave-admin/a2e248da-aed8-4c04-aed1-fb9d858b726c/scratchpad"
gh issue view 24 --repo Doberjohn/inkweave-admin --json body --jq .body > "$SCRATCH/issue24.md"
sed -i 's/^- \[ \] \*\*R4:\*\*/- [x] **R4:**/' "$SCRATCH/issue24.md"
grep -n '^- \[.\] \*\*R[1-4]:\*\*' "$SCRATCH/issue24.md"
```

Expected: four lines, each `- [x]`. Only then run:

```bash
gh issue edit 24 --repo Doberjohn/inkweave-admin --body-file "C:/Users/johnn/AppData/Local/Temp/claude/D--johnn-Projects-inkweave-admin/a2e248da-aed8-4c04-aed1-fb9d858b726c/scratchpad/issue24.md"
gh issue close 24 --repo Doberjohn/inkweave-admin --reason completed --comment "$(cat <<'EOF'
R4 (Card studio) merged in PR #<N> (merge <sha>) and is live (Deploy run <id>). That completes R1 to R4. The plan's "R4 as built" (`docs/plans/R-redesign.md`) records the phase.

#32 was folded into R4 and closed with it, and #14's item 3 shipped in R4.

These follow-ups now stand alone: #29, #30, #33, #34 and #37<, and from R4: #…>. The app's docs issue for Card studio is Doberjohn/inkweave#<R-62 issue>.
EOF
)"
```

**Tidy up** (each on the owner's word):
- Return the main checkout to `main`:

  ```bash
  git switch main
  git pull --ff-only
  git submodule update
  pnpm install --frozen-lockfile
  ```

  The pin doesn't move in R4, so `install` should change nothing.
- Delete the merged local branch (`git branch -d feature/24-redesign-r4`).
- **The owner's own steps:**
  - delete the moved handoff folder;
  - remove `.git/info/exclude`'s two handoff lines (the comment and `docs/redesign/`);
  - delete the rehearsal branch, if Step 8 found it still there.
- **The ledger.** Record the merge, the Deploy, the smoke test and the closed issues in `progress.md`.

### Appendix A: hand-offs to R4-8 in the task files, as of 2026-10-07

Step 3's grep is the full list. This is what stood on 2026-10-07, so that nothing is missed if a task file is later reworded. "Record" goes to Step 13, "Departure" to Step 14, "Check" to Steps 2, 5 or 6.

| Task | Hand-off | Where |
|---|---|---|
| R4-1a | The Produces block into the shared interfaces, and a file row for `replaceCardInPreviewJson.ts` | Record |
| R4-1b | "R4 as built" quotes R-78's messages and the two stale messages from `githubClient.ts` as built | Step 14 |
| R4-2a | The Produces block, and file rows for `cardEdit.ts` and `studioFixtures.ts` | Record |
| R4-2b | Changes to header addition 10: `cardTag` and `SearchRow.tag` are `CardTag \| null`, `previewIds` is `ReadonlySet<number> \| null`, `searchCards` takes `readonly LorcanaCard[]`; the additions (`previewIdsOf`, `EditSearchInput`, `EditSearchResult`, `ChangeRow.id`, `ChangeRowsInput`, `changeCount`, `ScanLanguageOption`, `scanLanguageOptions`). `languageName` in `scanLanguages.ts` is the header's name, so no rename. Hand counts: `editSearch.ts` 0 of 8, `changeRows.ts` 0 of 3, `scanLanguages.ts` 2 of 2, `filterCards.ts` 2 of 4 | Record, Check (Step 6) |
| R4-3a | `sectionStatuses`, with no `SECTION_REQUIRED` and no exported `SECTION_FIELDS`; `visibleImageError` and `ImageStatus`; `emptyForm.ts`; each checklist item's message is null exactly when it is done. R-73's message goes in the shared interfaces under `validateForm.ts`, and R-60's `ScanLanguage = string` under `constants.ts` | Departure, Record |
| R4-3b | `readyToPublish` returns `PublishInput \| null`, and `canPublish` is `ready !== null`; `livePreview.ts` with `ChosenImage` and `imageErrorOf`; both controllers' `imageError` through `visibleImageError`, recorded in the order the code gives the two errors. Whether R4-6c dropped `publishError` | Departure, Record |
| R4-4a | The Produces block, and file rows for `previewCardsFile.ts` and `usePreviewCardsFile.ts`. Against the outline: `requested` is state; `reloadError` and `commit(entry)` are new; `reload` returns a promise. Against `useLiveTuning`: a replaced caller resolves with the newest read's cards, and a reload settles after its landing renders. Hand counts: `usePreviewCardsFile.ts` 1 of 2 and `useLiveTuning.ts` 2 of 4 (header addition 11's "1 in 1" undercounts both) | Record, Departure |
| R4-4c | The departures from header addition 11 in its re-base notes (`EditSave`, `dropped: number \| null`, `failure` for `stale`, R4-4b's lookup names); R-70's departure from the image tool; file rows for `editSave.ts` and `useEditSave.ts` | Departure, Record |
| R4-4d | An id in both lists is decided by the preview-id band; `deployed` sits on the controller and `SearchRow`; branch-only cards lead the list; Edit's synergies run over the union. `transformRawCards` is called only in `branchCards.ts` | Departure, Check (Step 2) |
| R4-5a | `nav.ts`'s 6 string parameters; the "R4 adds" class line (seven classes); `studioModeOf(location)`, `studioCardOf`, `draftsAtRisk`, `STUDIO_SLOT_ORDER` and `adm-file-cover`; Storybook Step 17 if pending; the layout flip near the threshold (rehearsal) | Check (Steps 5, 6, 8), Record |
| R4-5b | The Dual-ink switch landed in R4-5b, with its state in `StudioForm`; `fieldWiring.ts` and `formSections.ts`, with `Field`'s render prop; `SR_ONLY` in `src/ui/layout.ts`; the changed labels (Franchise and Scan language with hints, Second ink, "None"); the Cost box before its slider; `locked` covers text fields only; Storybook Step 17 if pending | Departure, Check (Step 5) |
| R4-5c | The Inkable buttons after the Type row (the prototype's order); the switch's hold starts open for a form with a second ink (a one-line change to R4-5b's `StudioForm`); an unlisted rarity stays as its own pressed button; no `aria-invalid` on the picker groups; the ink group named "Ink" alone; `PickerGroup` as `Field`'s counterpart; Storybook Step 12 if pending | Departure, Check (Step 5) |
| R4-5d | `StudioCardPanel`'s `current?: LorcanaCard \| null` in place of `currentImageUrl`, and `staged` as `StagedImage`; Revert image's focus stays inside the panel (drop it from the plan's "Plain state updates"); R-91 2 quotes both staged notes; `cardPanel.ts` in the file structure (0 of 6); the stripes for a card with no name or art, `useId` ids, the error's live region, the tile keyed by its art; Storybook Step 14 if pending | Record, Departure, Check (Step 5) |
| R4-5e | `CommitOutcome` always mounted, with `dropped`, `onForgetToken` and `handoff`; `loadAgainNote.ts`; Load it again a neutral `CtaButton`; "Committed. View commit. {note}" in R2's order; one test file per part; the synergy panel's own empty line. Optional: an R-91 entry for the muted synergy caption and the wrapping diffs (the owner's call) | Departure |
| R4-5f | `src/ui/Tag.tsx` and `src/ui/cardFacts.ts` in the file structure; R3's `cardFacts` record moves to `src/ui` (a Departure, if the plan names `cardView.ts`); its stories checked in Storybook | Record, Departure, Check (Step 5) |
| R4-5h | The PR body says "Closes #32", and #32 is checked after the merge; #24's comment doesn't list #32 as standing alone; the app's `CLAUDE.md:225` list goes into the R-62 issue; the bridge record's "R4-5h removes …" line and the Icons correction without "(plus the Enchanted webp)"; Storybook Step 8 if pending | Steps 17, 19, 11; Record; Check (Step 5) |
| R4-5s | The guard's records (R2's state and component lines, `R-redesign.md:689` and `:693`) replaced with R4-5s's contract additions (`to`, `UnsavedMessage`); `writeInFlight.ts` in the guard's file row; its story is `Admin/UnsavedChangesDialog` → Commit In Flight; hand count 1 of 3 for the hook module | Record, Check (Steps 5, 6) |
| R4-6a | `PageLayout` inside `StudioWorkspace` with a token; `studioDocumentTitle` through `openCard`; `publish` returns its promise; `FLUSH_BODY`'s `scrollbarGutter`; `StudioSlots`; `revealController` in `studioFixtures.ts`. `scrollKey={studioHref(mode, card)}` (owner, 2026-10-07), and the rehearsal's layout and focus-across-a-flip checks (note 6) | Departure, Step 8 |
| R4-6b | **Departures:** the URL-driven handoff lives in `StudioPage` as `useStudioHandoff`, where a move to no card asks too (R3's doesn't); a `gone` card shows `goneNote` above the search, not R4-4d's suggested name-and-tag view; the Editing banner is the measured root's first row, inside its 16px padding, not full-bleed (its re-base note 9); R-66's reload is an effect keyed on the commit's link, through `useEffectEvent`; R4-4c's `retryReads` reads the file after any failed read (`previewFileView(file).error`), not only after a failed first read. **Records:** file rows for `EditPane.tsx`, `useStudioHandoff.ts` and `useReloadAfterPublish.ts`; its Produces block in the shared interfaces; addition 11's `retry` comment gains "after any failed read of the file". **Rehearsal:** two checks, the banner's and the search's alignment at 1366px and 1440px, and focus after Leave this page. No story for `EditPane`. **The open defect** (verifier, 2026-10-07): after "Leave this page" on a held card change, focus falls to `<body>`, because DialogShell restores focus only to a connected opener, and Leave's navigation unmounted "Load a different card"; R-59 wants the search field, and the fix belongs in `src/shell` | Departure, Record, Step 8 (items 7 and 8), Check (Step 5). The defect: Step 10 if the owner takes it into the fix wave, else Step 11 (item 6); "Held for the owner" (Step 14) either way |
| R4-6c | `publishError` dropped; `EMPTY_BOX` and `GOLD_GLOW` out of the bridge record; "Edit in Card studio" is the Overview's `PanelLink` (R-82); writePages' invariants in both `StudioPage.test.tsx` and `router.test.tsx`; its three stories in Storybook (`HeaderActions`, `WritePageWithToken`, `Writes`) | Departure, Record, Check (Steps 2, 5) |
| R4-7 | Every string its Step 2 found different from the plan, as a Departure; the docs it brought up to the studio, and its three `src` comments (SR-3, plus SR-4 and SR-5 if applied); R-73's reach into the runbook (`:28`, `:80`); its Step 9 sweep reused in Step 2; CLAUDE.md:15-18 checked in Step 12; `START_REVEAL_SEASON.md:93` and `:98` in the R-62 issue; #14's comment pointing at the runbook's new section | Departure, Steps 2, 11, 12, 19 |
| R4-4b | No line addressed to R4-8 | — |
