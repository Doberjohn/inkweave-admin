> Part of [R: Admin redesign](../R-redesign.md), phase R4 ([R4-card-studio.md](R4-card-studio.md)). First read the main plan's decisions (R-57 to R-91 for R4), its corrections, global constraints and shared interfaces, and then the R4 header.

> **Re-base notes (R4-7, 2026-10-07).** The outline's Task R4-7 (`R4-card-studio.md:953-1019`, the 2026-10-01 draft) is split in two, as the audit recommends (`r4-audit-full.json`, R4-7's `split`). This file is the docs, skills and reveal-sync wording. R4-8 closes the phase: the sweeps for deleted modules, "R4 as built", the PR, admin#14 and #24 (R-87), and the handoff's retirement (R-88). Both are the controller's.
> 1. **Base and timing.** Written against `main @ e5e5029` (branch `feature/24-redesign-r4`) and pin `upstream/inkweave` @ `16283a13`. It runs after R4-6c and after the owner's rehearsal (R-86), because the rehearsal or a review fix can change a string (R3-9 note 2: checks first, docs last).
>    - **Every UI string the docs quote is read from the built code first** (Step 2), and the code wins.
>    - The planned strings come from the task files: R4-1b (the refusals, R-78's messages), R4-2a (`IMAGE_ONLY_NOTES`), R4-3a (R-73's message), R4-4d (`goneNote`, "not deployed yet"), R4-5b (labels and sections), R4-5d (the image controls), R4-5f (the tags, lowercase) and R4-5s (the guard), plus the header's labels (R4-6a, R4-6b).
> 2. **Line numbers, re-based.** Every edit is anchored by its exact text. Each "Current" below matched exactly once in a copy of the file at `main` plus the bump.
>    - **The runbook.** PR #23's "Variant printings from admin" (3f6aa6e) moved its lines. The edits sit at `:26`, `:28`, `:31`, `:36`, `:38`, `:42`, `:75`, `:80`, `:84`, `:88`, `:102`, `:105`, `:108`, `:112` and `:122`.
>    - **The new section goes before `## Variant printings from admin` (`:40`).** The outline's "after l.36" would split the `:36`/`:38` paragraph pair.
>    - **Elsewhere:** `fetch-reveals/SKILL.md` `:67-68`, `:254-255`, `:259-260`, `:273` and `:317-325`; `CLAUDE.md` `:15-18`; `.env.example` `:3-4`; `vite-env.d.ts:5`.
>    - **No R4 task edits these files before this one.** `web.test.mjs` is unchanged by R4-5a, and R4-5s and R4-6c leave CLAUDE.md to this task. The exceptions are `app-bridge.ts`, `nav.ts` and `useRevealAdmin.ts`, whose lines move. Their edits are found by text (SR-3 to SR-5).
>    - **SR-4 to SR-7 are fallbacks.** R4-6c's draft rewrites `navItemFor`'s comment to `/studio/` and drops `publishError` with its comment (its Steps 3 and 6). Its Step 9 rewords `readiness.ts`'s and `SynergyPreviewPanel.tsx`'s comments in SR-6's and SR-7's own words (its hand-off: "none of those three is left for R4-7"). So each applies only if Step 2 finds the old text.
> 3. **What changed against the outline, and why.**
>    - **`:38`** adds Edit card's field saves, and the staged variants `publish` they also stop (`publish.mjs:88-93`, runbook `:63`). An image-only save never touches `previewCards.json` (`commitCardImage`, `src/tools/image/githubClient.ts:15-27`). This is from the audit.
>    - **R-73 reaches three runbook lines the audit didn't list.** `:28`'s "a promo in the reserved band" and `:80`'s "Numbers above `SET_TOTAL` (promos, enchanteds) are not checked" are false once New reveal refuses every number past the set. `:42`'s "would add one as a separate card" is R4-3a's hand-off. The user skill's rule 4 changes for the same reason.
>    - **R-80.** The new section says Edit card refreshes cards, never printings, and how a printing is refreshed by hand. `:102`, `:105` and `:108` take master's inkweave#728 wording (#681; `START_REVEAL_SEASON.md:151-157` at the pin, `b09fdc94`). The decision names `:102` and `:108`. `:105` carries the `scanLanguage` sentence that makes dropping `:102`'s "English scans only" true, so it changes too.
>    - **R-60.** French joins the fetch-reveals skill and the user skill.
>    - **The rename hint** (fetch-reveals `SKILL.md`, after `:255`): a `number-taken` whose site name is right is now fixed by renaming the card in Edit card.
>      - `existingVerdict` (`scripts/reveal-sync/gates.mjs:151-160`) calls a same-number, other-name card `number-taken`, and a same-name card `known`. So the next run, after the rename, sees the card as known.
>      - `name-taken` and `in-reserved-band` need a renumber, so they stay by hand.
>    - **CLAUDE.md** describes what R4 built, not the outline's `useUnsavedGuard`:
>      - `:15`: the tools list.
>      - `:16`: the write route, `studioHref` and the two redirects.
>      - `:17`: what reads and commits on the branch, and the branch-only cards (R-66).
>      - `:18`: Forget token (R-84); the one guard, with the studio's own `leaves` and the message as a function of the target (R4-5s's hand-off); and the URL-driven handoff (R-59).
>    - **`.env.example:3-4`** joins the edits and the commit. The audit found it: ripgrep skips hidden files.
>    - **Comments in `src` are reworded**, with no behaviour change:
>      - `app-bridge.ts`'s "The reveal tool's insert test". The pinned file now feeds R4-1a's, R4-2a's and R4-4d's tests too, so the comment names them;
>      - as fallbacks, for text R4-6c's draft already removes or rewords: `nav.ts`'s `navItemFor` example (`/reveal/`, SR-4) and R4-3b's `publishError` comment (SR-5), which its Steps 3 and 6 handle; and two comments the earlier drafts write in the present tense about the old page, which its Step 9 rewords: R4-3a's `readiness.ts` ("as the reveal publisher shows it today", SR-6) and R4-5e's `SynergyPreviewPanel.tsx` ("the reveal publisher shows it bare until R4-6c retires that page", SR-7). At R4-7, B23, B22 and B26 should print nothing.
>    - **The sweep.** It runs with `--hidden`, and excludes `.claude/worktrees/**`, `docs/plans/**`, `docs/redesign/**` and `docs/PLAN.md`. It adds `the publisher`, `reveal tool`, the backticked routes and a route after a space or a parenthesis.
>      - Its expected output is what the earlier drafts write on purpose (R4-5a's and R4-6c's redirect comments; R4-4c's, R4-5b's, R4-5d's, R4-5e's and R4-6a's provenance comments), not only today's three lines. The list was taken by running the pattern over every code block of R4-1a to R4-6c's drafts.
>      - The route alternation is case-sensitive (`(?-i:…)`): under `-i` it matched `WebAnalyticsBody.test.tsx`'s `/Reveal card clicks/`.
>      - It drops the audit's bare `/reveal/`, which matches every `src/tools/reveal/` import.
>      - No pattern starts with `/`: Git Bash rewrites an argument that starts with one into a Windows path, and the grep then finds nothing (checked: `git grep -F '/reveal/ and'` missed `nav.ts:33`).
>    - **`docs/PLAN.md` D10 is check-only.** `:75` already says "R4 redirects `/reveal` and `/image` to `/studio`" (R3-9 Step 20 item 4's model).
>    - **The user skill** (`~/.claude/skills/scan-reveal-card/SKILL.md`). Its field table follows the studio's sections in R4-5b's order (`SECTIONS`, and `IdentitySection`'s fields). Its Location row now matches `STAT_FIELDS.Location` (move cost, willpower and lore), and so does rule 9 (SK-12), which said a Location has a move cost "instead". Rarity and Inkable stay in the Confirm line, since they are pickers.
>    - **CLAUDE.md doesn't take R4-6a's scrollbar gutter.** R4-6a's hand-off says `:18` "can" mention `PageLayout`'s steady gutter. It is a layout detail of one page, and R4-6a already lists `FLUSH_BODY`'s `scrollbarGutter` among the departures R4-8 records.
>    - **Gates and commit.** The reveal-sync run names `--project scripts`. `git add` and the commit are two Bash calls. The commit message is the header's.
>    - **Moved to R4-8:** the outline's Step 4 (close admin#14) and Step 5 (retire the handoff; R-88 makes it R4-8's last commit).
> 4. **CLAUDE.md ownership.** The controller's brief and the header's Tasks row give `CLAUDE.md:15-18` to this task. The header's task-order table agrees: R4-8's `docs: describe Card studio as built (#24)` commits CLAUDE.md "only if its Step 12 finds a gap" (R4-8's re-base note 4).
> 5. **Verified (2026-10-07)** in `scratchpad/r4-rebase/sandbox-R4-7`. The sandbox held copies of `src/`, `scripts/`, the configs, the runbook, `PLAN.md`, `CLAUDE.md`, `.env.example`, the fetch-reveals skill and the user skill, from the working tree: `main @ b490fb7` plus the uncommitted pin bump to `16283a13`. `node_modules` and `upstream/` were junctioned in, and Vite's cache was kept in the sandbox.
>    - **The edits.** A script (`r47_edits.py`) applied every Current/New pair below. Of the drafter's 52 edits, 51 matched their Current exactly once. The 52nd, SR-5, is absent today, which is why it is conditional. (The verifier added SR-6, SR-7 and SK-12 later: SK-12 matches today's file once, and SR-6 and SR-7 quote the drafts.) The blocks below are printed from that script, so they are the text that was applied.
>    - **Reveal-sync.** `vitest run --project scripts scripts/reveal-sync` gave `Test Files 18 passed (18)` and `Tests 272 passed (272)`, with "web > loads Card studio's write chain" passing. R4-3a's own sandbox gave the same counts.
>    - **Lint and types.** `eslint --max-warnings 0` passed on the nine changed code files, and `tsc -p tsconfig.app.json --noEmit` exited 0.
>    - **The sweep** (Step 9) printed `CLAUDE.md:16`, `useGithubToken.ts:4` and only lines that R4-6c deletes or rewrites: the nav items, Sidebar, router, writePages and PageLayout story labels, `RevealPage`, and `RevealAdminFormCardText.test.tsx`'s #635 comment, which R4-5b ports.
>    - **The user skill check** (Step 13) printed nothing.
>    - **Re-checked by the verifier** (`scratchpad/r4-rebase/verify-R4-7`). Every Current was matched again against the working tree, and each but SR-5 occurs once; the blocks were applied to copies, and Steps 3, 4 and 7's greps gave what they expect. `web.test.mjs` passed in `sandbox-R4-7` with the renamed case (2 tests). Step 2's planned strings were checked against the sibling drafts' code (R4-1b, R4-2a, R4-3a, R4-4d, R4-5a to R4-5f, R4-5s, R4-6a, R4-6b, R4-6c). Step 9's list comes from running its pattern over every code block of R4-1a to R4-6c's drafts. SR-6 and SR-7 match R4-3a's and R4-5e's drafts once each, before R4-6c's Step 9 rewords them.
>    - **Code Health today** (local MCP 1.5.7): `write.mjs`, `publish.mjs`, `web.mjs`, `text.mjs`, `web.test.mjs`, `write-chain.test.mjs`, `nav.ts` and `useRevealAdmin.ts` score 10. `app-bridge.ts` and `vite-env.d.ts` get no score: they hold no function.

### Task R4-7: Docs, skills and reveal-sync wording

**Files:**
- **Modify:**
  - `docs/REVEAL_RUNBOOK.md`: RB-1 to RB-16, with a new section, "Editing a card, and refreshing it to its English scan".
  - `.claude/skills/fetch-reveals/SKILL.md`: FR-1 to FR-5.
  - `scripts/reveal-sync/write.mjs`, `publish.mjs`, `web.mjs` and `text.mjs`: wording only (RS-1 to RS-4, RS-7).
  - `scripts/reveal-sync/web.test.mjs`: one test name (RS-5). `scripts/reveal-sync/write-chain.test.mjs`: one comment (RS-6).
  - `src/vite-env.d.ts:5`, `.env.example:3-4` and `src/app-bridge.ts`'s `PINNED_PREVIEW_CARDS_JSON` comment (SR-1 to SR-3).
  - `CLAUDE.md:15-18` (CM-1 to CM-8).
- **Modify only if the text is still there** (Step 2's B22, B23 and B26 say). These are fallbacks: R4-6c's draft removes or rewords the old text of all four, so none is expected:
  - `src/shell/nav.ts`'s `navItemFor` comment (SR-4) and `src/tools/reveal/useRevealAdmin.ts`'s `publishError` comment (SR-5): R4-6c's Steps 3 and 6;
  - `src/tools/studio/readiness.ts`'s `imageError` comment (SR-6) and `src/tools/reveal/components/SynergyPreviewPanel.tsx`'s doc comment (SR-7): R4-6c's Step 9;
  - any other comment or doc line Step 9's sweep finds.
- **Check, no change expected:** `docs/PLAN.md`, D10 (`:75`).
- **Outside the repo, never committed:** `~/.claude/skills/scan-reveal-card/SKILL.md` (SK-1 to SK-12), on the owner's own approval (Step 13).
- **Test:** none new. RS-5 renames `web.test.mjs`'s second case.

**Interfaces:**
- **Consumes** the code as built, read in Step 2, never the plan text:
  - **Routes and links:** `studioHref` and `StudioMode` (`src/shell/nav.ts`, R4-5a); the `studio` nav item (R4-6a); the `/reveal` and `/image` redirects (R4-6c).
  - **The guard:** `UnsavedChangesGuard`'s function-valued `message` and `writeInFlightMessage` (R4-5s); `shouldBlockStudioNavigation` (R4-5a); `StudioWorkspace key={token}` (R4-6a).
  - **The write path:** `replaceCardInPreviewJson` (R4-1a); `commitCardEdit`'s R-78 messages and `StaleCardError`'s two refusals (R4-1b); `commitCardImage`'s message (unchanged).
  - **The Edit view:** `IMAGE_ONLY_NOTES.released` (R4-2a); `goneNote` and "not deployed yet" (R4-4d); the search's tags (R4-5f).
  - **The form:** `SCAN_LANGUAGES` with French (R-60) and R-73's message (R4-3a); the section titles and labels (R4-5b, R4-5c); "Replace card image" (R4-5d); "Ready to publish" and "Load it again" (R4-5e); `Publish to ${targetBranch()}` and `Save changes to ${targetBranch()}` (R4-6a, R4-6b).
- **Produces:** no code.
  - Docs, one renamed test, and wording in strings and comments.
  - No function, parameter or branch changes, so every module's primitive count and complexity stay as they are.

- [ ] **Step 1: Check what this task builds on**

Run in Git Bash:

```bash
cd /d/johnn/Projects/inkweave-admin
git branch --show-current
git status --short
git log --oneline main..HEAD
ls src/tools/studio src/shell/writeInFlight.ts
ls src/tools/reveal/RevealPage.tsx src/tools/image/ImagePage.tsx src/tools/__tests__/writePages.test.tsx
```

Expected:
- **The branch** is `feature/24-redesign-r4`.
- **`git status`** prints nothing. The controller's ledger lives in `.superpowers/sdd/`, which is git-ignored.
- **`git log`** lists the plan commit (`docs(plan): settle R4's decisions and re-base its plan (#24)`), then one commit per task, R4-1a to R4-6c (21 tasks), with the task files' messages. Then come any `fix(…)` commits that the rehearsal or a review sent back and the owner approved.
- **The first `ls`** lists the studio's modules and `components/`, and `writeInFlight.ts`.
- **The second `ls`** prints "No such file or directory" three times: R4-6c deleted the old pages and `writePages.test.tsx`.

Then confirm, in the ledger, that the owner's rehearsal (R-86) is recorded, and that every fix it asked for has landed. If a task has no commit, or the rehearsal is still open, stop. This task describes the studio as the owner saw it work.

- [ ] **Step 2: Read the strings the docs quote, from the built code**

Run this as one Bash call. `g` prints one labelled grep over non-test, non-story source.

```bash
cd /d/johnn/Projects/inkweave-admin
g() { label=$1; where=$2; shift 2; echo "== $label"; git grep -n "$@" -- $where ':!**/__tests__/**' ':!*.stories.tsx' ':!*.test.ts' ':!*.test.tsx' | cut -c1-170; }
g B1  src/shell     -F "label: 'Card studio'"
g B2  src/tools/studio -E "'(New reveal|Edit card)'"
g B3  src/tools/studio -F 'Publish to ${targetBranch()}'
g B4  src/tools/studio -F 'Save changes to ${targetBranch()}'
g B5  src/tools/studio -F 'Load it again'
g B6  src/tools/reveal -E 'since you loaded it\. Load it again\.|is no longer in previewCards\.json on \$\{'
g B7  src/tools/studio -F "so it can't be saved here."
g B8  src/tools/studio -E ">not deployed yet<|text: '(preview|released)'"
g B9  src/tools/studio -F 'Card data comes from LorcanaJSON; only the image can be replaced here.'
g B10 src/tools/studio -F 'Replace card image'
g B11 src/tools/studio -F 'Scan language'
g B12 src/tools/reveal -E "code: '[a-z]{2}', label:"
g B13 src/tools/reveal -F 'card set: special printings go in through variants.mjs stage'
g B14 src/tools -E "fix\((reveals|card-images)\): (update|refresh)|' and its image'|to its English scan"
g B15 src/tools/studio -E "title: '(Identity|Ink & rarity|Type & stats|Card text)'"
g B16 src/tools/studio -E "Dual-ink card|Second ink|'(Inkable|Uninkable)'"
g B17 src/shell     -E "params\.set\('(mode|card)'"
g B18 src           -E "path: '(studio|reveal|image)'"
g B19 src           -E "<UnsavedChangesGuard|export function (shouldBlockStudioNavigation|writeInFlightMessage)|\(\(to: Location\) => string\)"
g B20 src           -F 'key={token}'
g B21 src/tools/reveal -F 'export function replaceCardInPreviewJson'
g B22 src/tools/reveal -F "the reveal publisher's one error line"
g B23 src/shell     -F 'reveal/ and /reveal/x'
echo "== B24"; git grep -l PINNED_PREVIEW_CARDS_JSON -- src
g B25 src/tools/studio -F 'title="Ready to publish"'
g B26 src           -E 'as the reveal publisher shows it today|the reveal publisher shows it bare'
```

No pattern starts with `/`. Git Bash rewrites an argument that starts with one into a Windows path, and the grep then finds nothing.

Expected, line by line. "Used in" names the blocks below that quote the string:

| Id | Expected | Used in |
|---|---|---|
| B1 | `nav.ts`: the `studio` item, `label: 'Card studio'` | every block naming Card studio |
| B2 | the mode switch's two options, "New reveal" and "Edit card" (R4-6a) | RB, FR, CM-2, CM-5, SK-4, SK-11 |
| B3 | New reveal's button (R4-6a). `PendingTray.tsx` doesn't print: it lives outside `src/tools/studio` | RB-3 ("**Publish to master**") |
| B4 | Edit card's button (R4-6b) | RB-6 ("**Save changes to master**") |
| B5 | `CommitOutcome`'s button (R4-5e) | RB-6 ("**Load it again**") |
| B6 | `githubClient.ts`: "Card ${…} changed on ${branch} since you loaded it. Load it again." and "Card ${…} is no longer in previewCards.json on ${branch}. Load it again." (R4-1b) | RB-6 |
| B7 | `branchCards.ts`'s `goneNote` (R4-4d): "${fullName} is no longer in previewCards.json on ${…}, so it can't be saved here." | RB-6 |
| B8 | `CardMarks.tsx`'s tags as shown: "preview", "released" and "not deployed yet", lowercase (R4-5f) | RB-6, CM-5 |
| B9 | `cardEdit.ts`: `IMAGE_ONLY_NOTES.released` (R4-2a) | RB-6 |
| B10 | the card panel's Edit control (R4-5d) | RB-6 step 2 |
| B11 | `CardTextSection.tsx`'s label (R4-5b) | RB-6 step 3, FR-5, SK-5, SK-11 |
| B12 | `constants.ts`: five lines, English, Japanese, German, Italian and French (R-60) | FR-5, SK-5, SK-11 |
| B13 | `validateForm.ts`: R-73's message, "#${n} is past the ${SET_TOTAL}-card set: special printings go in through variants.mjs stage" (R4-3a) | RB-9 |
| B14 | `reveal/githubClient.ts`: the update and refresh messages and " and its image" (R4-1b); `image/githubClient.ts:25`'s `fix(card-images): update image for …` | RB-6 |
| B15 | `formSections.ts`'s four `SECTIONS` titles (R4-5b) | SK-5 |
| B16 | the switch's label, "Dual-ink card" (R4-5b), the "Second ink" group, and the Inkable and Uninkable buttons (R4-5c) | SK-5 |
| B17 | `studioHref`'s two `params.set` lines (R4-5a) | RB-6's URL, CM-2 |
| B18 | `router.tsx`: `path: 'studio'`, and `reveal` and `image` as `<Navigate to={studioHref('new')} replace />` and `studioHref('edit')` (R4-6c) | CM-4 |
| B19 | the guards in `StudioWorkspace` and `CalibrationPage`; `studioPaths.ts`; `writeInFlight.ts`; the widened message type in `UnsavedChangesGuard.tsx` (R4-5s) | CM-7 |
| B20 | `StudioWorkspace key={token}` (R4-6a), and `CalibrationPage.tsx:86`'s | CM-6 |
| B21 | `replaceCardInPreviewJson.ts` (R4-1a) | RB-6 |
| B22 | nothing: R4-6c's Step 6 drops `publishError` and its comment. One line only if R4-6c kept the field | SR-5 |
| B23 | nothing: R4-6c rewrites `navItemFor`'s example to `/studio/`. One line only if it didn't | SR-4 |
| B24 | `app-bridge.ts`, plus the tests that read the pinned file: `insertCardIntoPreviewJson.test.ts`, R4-1a's `replaceCardInPreviewJson.test.ts`, R4-2a's `cardEdit.test.ts` and R4-4d's `branchCards.test.ts` | SR-3 |
| B25 | `ReadyChecklist.tsx`'s panel (R4-5e) | RB-3 ("**Ready to publish**") |
| B26 | nothing: R4-6c's Step 9 rewords both `readiness.ts` (R4-3a) and `SynergyPreviewPanel.tsx` (R4-5e). A line only if it didn't | SR-6, SR-7 |

**The code wins.**
- **A string that differs** (a label reworded at review, a tag in another case): use the built string in every block its "Used in" names, and note each change for R4-8's Departures.
- **A behaviour that didn't ship** (no `not deployed yet`, say, if R4-4d was dropped): delete that clause from the block, and tell the owner.
- **B22, B23 or B26 prints nothing** (the expected case): skip SR-5, SR-4, or whichever of SR-6 (`readiness.ts`) and SR-7 (`SynergyPreviewPanel.tsx`) B26 didn't print, and leave its file out of Steps 10 to 12.
- **B24 differs from the table:** reword SR-3's New text to say what the code holds.

- [ ] **Step 3: The runbook**

Use the Edit tool on `docs/REVEAL_RUNBOOK.md`. Each "Current" occurs exactly once. If one doesn't match, something edited the line since `main`: report it, and don't guess. The blocks carry Step 2's planned strings. Swap in any built string that differs.

**RB-1** (`docs/REVEAL_RUNBOOK.md:26`). Current:

```md
## One card at a time: the reveal publisher
```

New:

```md
## One card at a time: Card studio's New reveal
```

**RB-2** (`docs/REVEAL_RUNBOOK.md:28`). R-73 closes the promo path: New reveal now refuses every number past the set. Current:

```md
Use it for a card the pipeline cannot write: a `validation-failed` card, or a promo in the reserved band.
```

New:

```md
Use it for a card the pipeline cannot write: a `validation-failed` card, or one whose only official scan is not in English (the fetch-reveals skill, "Cards shown with a non-English scan"). It takes collector numbers 1 to `SET_TOTAL` only: a promo or a card with no number goes in by PR ([Ids and filenames](#ids-and-filenames)), and a number past the set is a variant printing ([Variant printings from admin](#variant-printings-from-admin)).
```

**RB-3** (`docs/REVEAL_RUNBOOK.md:31`; B1, B2, B3, B25). Current:

```md
2. Publish from https://inkweave-admin.vercel.app/reveal. Its GitHub token lives in that site's `localStorage`, so admin's local dev server (port 5180) has its own.
```

New:

```md
2. Open Card studio at https://inkweave-admin.vercel.app/studio (New reveal is its first mode), and fill the form from the skill's fields. The **Ready to publish** checklist names what is left, and **Publish to master** stays off until nothing is. Its GitHub token lives in that site's `localStorage`, so admin's local dev server (port 5180) has its own.
```

**RB-4** (`docs/REVEAL_RUNBOOK.md:36`). Current:

```md
The publisher commits to `master`, and the convert workflow only fires there.
```

New:

```md
Card studio commits to `master`, and the convert workflow only fires there.
```

**RB-5** (`docs/REVEAL_RUNBOOK.md:38`). An Edit card save that changes a field commits `previewCards.json` too (`write.mjs:43-47`, `publish.mjs:88-93`). Current:

```md
A card published while a `/fetch-reveals` run is open makes that run's `write` refuse, writing nothing: start a new run.
```

New:

```md
A New reveal publish, or an Edit card save that changes a field, while a `/fetch-reveals` run is open makes that run's `write` refuse, writing nothing: start a new run. A staged variants run's `publish` refuses the same way: stage it again. An image-only save leaves `previewCards.json` alone, so it stops neither.
```

**RB-6** (`docs/REVEAL_RUNBOOK.md:40`): the new section, inserted before `## Variant printings from admin`. That heading occurs once: the two links to it carry no `## `. The section uses B2 and B4 to B11, B14, B17 and B21. Current:

```md
## Variant printings from admin
```

New:

```md
## Editing a card, and refreshing it to its English scan

Card studio's Edit card (https://inkweave-admin.vercel.app/studio?mode=edit) fixes a card that is already in. Search by name; an empty search lists the branch's preview cards first. The list holds every card on inkweave.ink (the Core-legal sets), plus the cards only the branch's `previewCards.json` holds so far, tagged "not deployed yet": a card just published, or merged from a `/fetch-reveals` PR, can be fixed before the deploy lands.

- **A preview card** (tagged preview) takes field edits and a new image, in one commit to `master`: its entry in `previewCards.json`, plus the raw scan when there is one. The commit reads `fix(reveals): update <full name> (<set code><number>)`, with " and its image" when a scan goes with it.
- **A released card** (tagged released) takes a new image only: "Card data comes from LorcanaJSON; only the image can be replaced here." A preview entry the form can't hold opens the same way, and says why. Its commit is the raw scan alone: `fix(card-images): update image for <full name> [<id>]`.
- **What a save keeps.** The id and the collector number stay as loaded: a rename keeps the id, and renumbering is still a PR ([Ids and filenames](#ids-and-filenames)). Everything the form doesn't hold, `variants` above all, comes from `previewCards.json` as it stands when the save commits. `replaceCardInPreviewJson` checks the result first: only this card's own fields change, the file still parses, and any `scanLanguage` is a two-letter code other than `en`. Otherwise nothing is written.
- **A new image** goes to `card-images-raw/<id>.<ext>`, and the convert workflow turns it into the card's preview AVIFs. A committed preview AVIF always wins over the official URL ([Variant printings](#variant-printings-epic-enchanted-iconic) below says the same of printings), so a released card keeps the new image from then on.
- **A stale entry.** A save first reads the card's own entry on the branch. If a field Edit card can change, or the card's id, set or number, changed since you loaded the card (another save, a merged `/fetch-reveals` PR, a hand edit), nothing is written: "Card 14050 changed on master since you loaded it. Load it again." If it left the file, the message says "is no longer in previewCards.json on master". **Load it again** reads the file again, keeps the edits that still apply and the staged image, and says how many edits it dropped. A change to any other card, or a printing added to this one, never refuses a save.
- **After graduation** the app empties `previewCards.json`, and each card takes its released id. Until inkweave.ink deploys the release and admin is reloaded, an old preview id reads "… is no longer in previewCards.json on master, so it can't be saved here."

**Refreshing a card to its English scan** (Doberjohn/inkweave-admin#14). A card first shown with a non-English scan carries `scanLanguage` (the fetch-reveals skill, "Cards shown with a non-English scan"), and no later `/fetch-reveals` run refreshes it. Once its English scan is out:

1. Read the English scan with the `scan-reveal-card` skill.
2. Open the card in Edit card, and pick the English scan with **Replace card image**.
3. Set **Scan language** to English, and fix the name, version and text wherever the English printing differs. A rename keeps the card's id.
4. **Save changes to master.** One commit carries the entry and the scan, and drops `scanLanguage`: `fix(reveals): refresh <full name> (<set code><number>) to its English scan`.

Edit card refreshes cards, never printings: it keeps a card's `variants` as they are, and its search lists no printing ids. A printing marked with its own `scanLanguage` is refreshed by hand in Doberjohn/inkweave, as [Variant printings](#variant-printings-epic-enchanted-iconic) below describes: convert the English scan over the printing's id and delete the entry's `scanLanguage`, or, once LorcanaJSON lists the printing, run `pnpm sync-variants` and delete the AVIFs that shadow it.

## Variant printings from admin
```

Notes on RB-6:
- **The commit messages** print `(<set code><number>)`, as `commitNewCard`'s does (`feat(reveals): add {fullName} ({setCode}{number})`). That isn't always the id: set 14's #5 prints `(145)`. So the text never calls it the id.
- **"Card 14050"** is an example id. The branch is `master` because that is where production writes go: `targetBranch()` fills it in.

**RB-7** (`docs/REVEAL_RUNBOOK.md:42`; R4-3a's hand-off, B13). Current:

```md
`/fetch-reveals` skips them, and the reveal publisher would add one as a separate card, so admin publishes them
```

New:

```md
`/fetch-reveals` skips them, and Card studio's New reveal refuses their numbers (every number past the set), so admin publishes them
```

**RB-8** (`docs/REVEAL_RUNBOOK.md:75`). Edit card can't renumber either (R-91 1). Current:

```md
These can only be added by PR in Doberjohn/inkweave: the reveal publisher requires a number.
```

New:

```md
These can only be added, and renumbered, by PR in Doberjohn/inkweave: Card studio's New reveal requires a number, and Edit card keeps a card's id and number as they are.
```

**RB-9** (`docs/REVEAL_RUNBOOK.md:80`; B13). `validateCardEdit` runs the same validator, so the ink check holds in Edit too. Current:

```md
The reveal publisher rejects an ink that does not own the number, because both wrong-ink publishes in Set 13 were the form's default ink (`Amber`) left unchanged. Numbers above `SET_TOTAL` (promos, enchanteds) are not checked.
```

New:

```md
Card studio rejects an ink that does not own the number, in New reveal and Edit card alike, because both wrong-ink publishes in Set 13 were the form's default ink (`Amber`) left unchanged. New reveal refuses every number above `SET_TOTAL` ("#<N> is past the <SET_TOTAL>-card set: special printings go in through variants.mjs stage"): each is an Epic, Enchanted or Iconic printing of a card in the set ([Variant printings from admin](#variant-printings-from-admin)).
```

**RB-10** (`docs/REVEAL_RUNBOOK.md:84`). Edit card builds its changes through `buildPreviewCard` and validates them, so the house-style rewrite and refusal hold there too. Current:

```md
(Doberjohn/inkweave#635; the reveal publisher rewrites what it can and refuses the rest)
```

New:

```md
(Doberjohn/inkweave#635; Card studio rewrites what it can and refuses the rest, in New reveal and Edit card alike)
```

**RB-11** (`docs/REVEAL_RUNBOOK.md:88`). Current:

```md
`/fetch-reveals` and the reveal publisher do not handle variants (the fetch pipeline's rarity gate rejects them).
```

New:

```md
`/fetch-reveals` and Card studio do not handle variants (the fetch pipeline's rarity gate rejects them, New reveal refuses their numbers, and Edit card keeps a card's `variants` as they are).
```

**RB-12** (`docs/REVEAL_RUNBOOK.md:102`). This and RB-13 and RB-14 take master's inkweave#728 wording (R-80). Current:

```md
**Manual scan, before LorcanaJSON lists it** (English scans only; the translation toggle does not apply to variants):
```

New:

```md
**Manual scan, before LorcanaJSON lists it**:
```

**RB-13** (`docs/REVEAL_RUNBOOK.md:105`). Current:

```md
to the base card's `variants` (create the array if needed; keep it in collector-number order).
```

New:

```md
to the base card's `variants` (create the array if needed; keep it in collector-number order). If the scan is not in English (the printing was revealed abroad first), add its two-letter code too, e.g. `"scanLanguage": "it"` (Doberjohn/inkweave#681): the app then offers the card's English text over that printing, and `reveal-set-integrity.test.ts` checks the code.
```

**RB-14** (`docs/REVEAL_RUNBOOK.md:108`). Current:

```md
a committed preview AVIF always wins over the official URL.
```

New:

```md
a committed preview AVIF always wins over the official URL. The official entry has no `scanLanguage`, so until those files go, a foreign scan shows without its translation toggle.
```

**RB-15** (`docs/REVEAL_RUNBOOK.md:112`). Current:

```md
During a reveal window the reveal publisher commits every few minutes, and reveal PRs merge into the same `previewCards.json`. `write` refuses when the file moved since `start`; a PR that falls behind merges cleanly as long as nobody edited the same cards.
```

New:

```md
During a reveal window Card studio commits every few minutes (New reveal publishes, Edit card saves), and reveal PRs merge into the same `previewCards.json`. `write` refuses when the file moved since `start`; a PR that falls behind merges cleanly as long as nobody edited the same cards. Edit card refuses a save only when its own card's fields moved ([Editing a card](#editing-a-card-and-refreshing-it-to-its-english-scan)).
```

**RB-16** (`docs/REVEAL_RUNBOOK.md:122`). Current:

```md
- [ ] Only now: the first reveal publisher publish or `/fetch-reveals` run.
```

New:

```md
- [ ] Only now: the first Card studio publish or `/fetch-reveals` run.
```

Then:

```bash
cd /d/johnn/Projects/inkweave-admin
grep -c "reveal publisher\|The publisher\|vercel.app/reveal" docs/REVEAL_RUNBOOK.md
grep -n "^## \|^### " docs/REVEAL_RUNBOOK.md
```

Expected:
- **The first command** prints `0`.
- **The second** lists the `##` and `###` headings in this order: After the app rotates the season; New reveals in bulk; Closing a reveal PR unmerged; One card at a time: Card studio's New reveal; **Editing a card, and refreshing it to its English scan** (`:40`); Variant printings from admin (`:60`); Adding cards by hand, with its four `###` headings; Gotchas; Checklist, at a season's start.
- **The anchors it links** (`#ids-and-filenames`, `#variant-printings-from-admin`, `#variant-printings-epic-enchanted-iconic` and `#editing-a-card-and-refreshing-it-to-its-english-scan`) are GitHub's slugs of those headings.
- **No file links to the renamed `:26` heading.** `rg -n "one-card-at-a-time"` found nothing in either repo.

- [ ] **Step 4: The fetch-reveals skill**

Use the Edit tool on `.claude/skills/fetch-reveals/SKILL.md`. The file wraps at about 95 columns. The New text keeps it wrapped.

**FR-1** (`.claude/skills/fetch-reveals/SKILL.md:67-68`). An Edit card save of fields moves the blob too. Current:

```md
records both blobs so Step 6 can tell if a card was published through the reveal publisher,
   or another run finished, in the meantime.
```

New:

```md
records both blobs so Step 6 can tell if a card was published or edited in Card studio,
   or another run finished, in the meantime.
```

**FR-2** (`.claude/skills/fetch-reveals/SKILL.md:254-255`): the rename hint. Current:

```md
  added with a reserved-band id (see `docs/PREVIEW_CARD_PARSER.md`), and renumbered once the
  site shows its number.
```

New:

```md
  added with a reserved-band id (see `docs/PREVIEW_CARD_PARSER.md`), and renumbered once the
  site shows its number. One `number-taken` is quicker: when Inkweave holds the card under
  another name (a name translated from a first non-English reveal, say) and the site's name
  is right, rename the card in Card studio's Edit card. Edit card can't renumber, so the
  rest still go by hand.
```

**FR-3** (`.claude/skills/fetch-reveals/SKILL.md:259-260`). Current:

```md
  on every run. Add it by hand in the reveal publisher
  (https://inkweave-admin.vercel.app/reveal), writing the text the way the detail says.
```

New:

```md
  on every run. Add it by hand in Card studio's New reveal
  (https://inkweave-admin.vercel.app/studio), writing the text the way the detail says.
```

**FR-4** (`.claude/skills/fetch-reveals/SKILL.md:273`). Current:

```md
- validates each verified card through the same chain the reveal publisher uses
```

New:

```md
- validates each verified card through the same chain Card studio's New reveal uses
```

**FR-5** (`.claude/skills/fetch-reveals/SKILL.md:317-325`; B2, B11, B12). Current:

```md
The pipeline never writes these, but the owner can add one through admin's reveal publisher: an
official reveal whose only scan is Japanese, German or Italian, shown with that scan as its art
and lorcanaplayer's English name and text. The publisher's "Scan language" field writes
`scanLanguage` on the card in `previewCards.json` (the scan's two-letter code: `"ja"`, `"de"`,
`"it"`), which gives it a "See translation" toggle in the card modal and the lightbox.

A later run counts such a card as `known`, whatever its scan, so it never refreshes one. When
its English scan is out and the card is refreshed to it, delete `scanLanguage` (the publisher
gets a way to do that in Doberjohn/inkweave-admin#14).
```

New:

```md
The pipeline never writes these, but the owner can add one through Card studio's New reveal:
an official reveal whose only scan is Japanese, German, Italian or French, shown with that scan
as its art and lorcanaplayer's English name and text. Its "Scan language" field writes
`scanLanguage` on the card in `previewCards.json` (the scan's two-letter code: `"ja"`, `"de"`,
`"it"`, `"fr"`), which gives it a "See translation" toggle in the card modal and the lightbox.

A later run counts such a card as `known`, whatever its scan, so it never refreshes one. When
its English scan is out, refresh the card in Card studio's Edit card: load it, replace the
image with the English scan, set Scan language to English, and fix the name and text wherever
the English printing differs. One save commits both and drops `scanLanguage`
(`docs/REVEAL_RUNBOOK.md`, "Editing a card, and refreshing it to its English scan"). A
printing marked with its own `scanLanguage` is refreshed by hand in the app: Edit card keeps
`variants` as they are.
```

Then `grep -c "reveal publisher\|The publisher\|publisher's\|vercel.app/reveal" .claude/skills/fetch-reveals/SKILL.md` prints `0`.

- [ ] **Step 5: Reveal-sync's wording and test name, then run reveal-sync**

Use the Edit tool. These are strings and comments only. No test asserts RS-1's or RS-2's text: `write.test.mjs:97-100` matches `/changed on Doberjohn\/inkweave@master/`, and `publish.test.mjs:91` matches only the PR body's first line.

**RS-1** (`scripts/reveal-sync/write.mjs:46`). Current:

```md
probably a card published through the reveal publisher. Nothing was written.
```

New:

```md
probably a card published or edited in Card studio. Nothing was written.
```

**RS-2** (`scripts/reveal-sync/publish.mjs:44`): the reveal PR's body. Current:

```md
and went through the reveal publisher's validation. Its art is that scan.
```

New:

```md
and went through Card studio's validation. Its art is that scan.
```

**RS-3** (`scripts/reveal-sync/web.mjs:3`). Current:

```md
 * the one module that reaches the pinned app), and the write chain the reveal publisher uses
```

New:

```md
 * the one module that reaches the pinned app), and the write chain Card studio's New reveal uses
```

**RS-4** (`scripts/reveal-sync/web.mjs:61`). Current:

```md
insertCardIntoPreviewJson, as the reveal publisher uses them. */
```

New:

```md
insertCardIntoPreviewJson, as Card studio's New reveal uses them. */
```

**RS-5** (`scripts/reveal-sync/web.test.mjs:19`): the test name. Current:

```md
  it("loads the reveal publisher's write chain", async () => {
```

New:

```md
  it("loads Card studio's write chain", async () => {
```

**RS-6** (`scripts/reveal-sync/write-chain.test.mjs:3`). Current:

```md
 * The skill writes through the same chain the reveal publisher uses (src/tools/reveal/).
```

New:

```md
 * The skill writes through the same chain Card studio's New reveal uses (src/tools/reveal/).
```

**RS-7** (`scripts/reveal-sync/text.mjs:12`). Current:

```md
// House style lives in the engine so the reveal publisher (browser) and these scripts share
```

New:

```md
// House style lives in the engine so Card studio (browser) and these scripts share
```

Run, in Git Bash:

```bash
cd /d/johnn/Projects/inkweave-admin
pnpm vitest run --project scripts scripts/reveal-sync --reporter verbose 2>&1 | grep -E "Card studio's write chain|Test Files|Tests  "
```

Expected:

```
 ✓ |scripts| scripts/reveal-sync/web.test.mjs > web > loads Card studio's write chain <ms>
 Test Files  18 passed (18)
      Tests  272 passed (272)
```

The counts are those at `main` and in R4-3a's sandbox. R4 adds no reveal-sync test. If a later task did add one, the counts grow, and every file must still pass. `pnpm build:engine` must have run once since the pin bump; `pnpm typecheck` in Step 10 runs it, and every earlier task ran one.

- [ ] **Step 6: Wording in `src` and `.env.example`**

Use the Edit tool. SR-1 to SR-3 always apply. SR-4 to SR-7 are fallbacks for text R4-6c's draft already removes or rewords: each applies only when Step 2 printed its line (B23 for SR-4, B22 for SR-5, B26's `readiness.ts` line for SR-6 and its `SynergyPreviewPanel.tsx` line for SR-7). When one printed nothing, skip it and leave its file out of Steps 10 to 12.

**SR-1** (`src/vite-env.d.ts:5`). Current:

```md
/** App branch the reveal, image and tuning tools read from and commit to.
```

New:

```md
/** App branch Card studio and the tuning editor read from and commit to.
```

**SR-2** (`.env.example:3-4`). Current:

```md
# The branch of Doberjohn/inkweave that the reveal, image and tuning tools commit
# to; reveal and tuning also read the files they edit from it. Unset or empty
```

New:

```md
# The branch of Doberjohn/inkweave that Card studio and the tuning editor commit
# to; both also read the files they edit from it. Unset or empty
```

**SR-3** (`src/app-bridge.ts`, `:83-84` at `main`; R4-5a, R4-5h, R4-4d and R4-6c each move it a little; find it with `grep -n "reveal tool's insert test" src/app-bridge.ts`; B24). Current:

```md
// The pinned app's previewCards.json as text. The reveal tool's insert test
// runs against it, so a pin bump that changes the file's layout fails here.
```

New:

```md
// The pinned app's previewCards.json as text. The write chain's tests and Card
// studio's Edit tests run against it, so a pin bump that changes the file's
// layout, or what its entries hold, fails here.
```

**SR-4** (`src/shell/nav.ts`, `navItemFor`'s comment, `:33` at `main`; only if B23 printed it). R4-6c's draft makes this very change, in these words. Current:

```md
 * /reveal/ and /reveal/x belong to the reveal item, /revealed to none, and an
```

New:

```md
 * /studio/ and /studio/x belong to Card studio, /studios to none, and an
```

**SR-5** (`src/tools/reveal/useRevealAdmin.ts`, R4-3b's `publishError` comment; only if B22 printed it, because R4-6c kept the field). Current:

```md
/** commitError, else uploadError: the reveal publisher's one error line. */
```

New:

```md
/** commitError, else uploadError: both failures in one line. */
```

**SR-6** (`src/tools/studio/readiness.ts`, R4-3a's comment above `imageError`; only if B26 printed it). R4-6c's Step 9 makes this very change, in these words. The old page is gone, so "today" is false. The reason stands on its own. Current:

```md
 * to end in .png"), as the reveal publisher shows it today.
```

New:

```md
 * to end in .png").
```

**SR-7** (`src/tools/reveal/components/SynergyPreviewPanel.tsx`, R4-5e's doc comment; only if B26 printed it). R4-6c's Step 9 makes this very change, in these words. Current:

```md
 * how many cards it pairs with. Card studio's SynergyPanel frames it (R-90);
 * the reveal publisher shows it bare until R4-6c retires that page.
```

New:

```md
 * how many cards it pairs with. Card studio's SynergyPanel frames it (R-90).
```

- [ ] **Step 7: CLAUDE.md**

Use the Edit tool. Lines 16 and 18 take three edits each. Each Current occurs once. Check every name and route a New block uses against Step 2 (B1, B2, B8, B17 to B20) first. If one differs, write what the code has.

**CM-1** (`CLAUDE.md:15`): the tools list. After R4-6c, `src/tools/image` keeps only `filterCards.ts` and `githubClient.ts`. Current:

```md
- `src/tools/{reveal,image,analytics}` hold the tools, `src/tools/tuning` the tuning editor's hooks
```

New:

```md
- `src/tools/studio` holds Card studio, over `src/tools/reveal`'s write chain and controller (reveal-sync loads the chain by path, so it stays put) and `src/tools/image`'s `filterCards` and `commitCardImage`; `src/tools/analytics` holds the insights pages, `src/tools/tuning` the tuning editor's hooks
```

**CM-2** (`CLAUDE.md:16`; B2, B17). Current:

```md
and the write tools `/reveal` and `/image`.
```

New:

```md
and the write tool `/studio` (Card studio: New reveal, and Edit card at `?mode=edit&card=<id>`; a mode switch keeps `?card=`).
```

**CM-3** (`CLAUDE.md:16`). Current:

```md
builds the links into pages (`calibrationHref`, `cardsHref`).
```

New:

```md
builds the links into pages (`calibrationHref`, `cardsHref`, `studioHref`).
```

**CM-4** (`CLAUDE.md:16`; B18). Current:

```md
`src/router.tsx` also redirects retired paths: `/analytics` goes to `/`, and `/tuning` to `/calibration`.
```

New:

```md
`src/router.tsx` also redirects retired paths: `/analytics` goes to `/`, `/tuning` to `/calibration`, `/reveal` to `/studio`, and `/image` to `/studio?mode=edit`.
```

**CM-5** (`CLAUDE.md:17`; B8). The workspace reads the file when it opens (R-57) and again after each of its commits (R4-4a's `commit`, and R-66's reload after a New reveal publish), and both commits read it again at their base (`commitNewCard`, `commitCardEdit`). Current:

```md
The reveal, image and tuning tools commit to `Doberjohn/inkweave` on `VITE_ADMIN_TARGET_BRANCH`, which defaults to `master`. Reveal and tuning also read the files they edit (`previewCards.json`, `tuning.json`) from that branch; card lists come from `inkweave.ink` through the forwarded `/data/`.
```

New:

```md
Card studio and the tuning editor commit to `Doberjohn/inkweave` on `VITE_ADMIN_TARGET_BRANCH`, which defaults to `master`, and read the files they edit (`previewCards.json`, `tuning.json`) from that branch: Card studio when it opens and after each of its commits, for Edit card, and every commit again at its base. Card lists come from `inkweave.ink` through the forwarded `/data/`, so Edit card's search adds the cards only the branch's `previewCards.json` holds, tagged "not deployed yet" (R-66).
```

**CM-6** (`CLAUDE.md:18`; B20). Current:

```md
and its "Forget token" act on every page at once.
```

New:

```md
and its "Forget token" act on every page at once. On `/studio` that drops both drafts without asking: they live under the gate, in a workspace keyed by the token (R-84).
```

**CM-7** (`CLAUDE.md:18`; B19): the guard as built (R4-5s's hand-off). Current:

```md
A page that holds unsaved edits should mount one `UnsavedChangesGuard` (`src/shell/`), which asks before leaving it: `/calibration` does, and `/reveal` and `/image` don't yet (R4's studio adds it).
```

New:

```md
A page that holds unsaved edits mounts one `UnsavedChangesGuard` (`src/shell/`), which asks before leaving it: `/calibration` and `/studio` do. By default only a new pathname leaves; a page whose search names what it edits passes its own `leaves`: the studio's (`shouldBlockStudioNavigation`) also asks when `?card=` changes, and never on a mode switch, since both drafts stay mounted. `message` may be a function of where the held navigation goes, so the studio names only the drafts that navigation would drop, and both pages word a publish or save still in flight through `writeInFlightMessage` (`src/shell/writeInFlight.ts`).
```

**CM-8** (`CLAUDE.md:18`): the URL-driven handoff, which R4-6b applies to Edit card (R-59). Current:

```md
or when its data's error clears (`/cards`, R3-7).
```

New:

```md
or when its data's error clears (`/cards`, R3-7; the studio's Edit card, R-59).
```

Then:

```bash
cd /d/johnn/Projects/inkweave-admin
grep -nE "studioHref|shouldBlockStudioNavigation|writeInFlightMessage|src/tools/studio|not deployed yet" CLAUDE.md | cut -c1-12
grep -cE "reveal\` and \`/image\` don't|tools/\{reveal,image|The reveal, image" CLAUDE.md
```

Expected:
- **The first command** prints lines 15, 16, 17 and 18, once each.
- **The second** prints `0`. It prints `3` before the edits. Its pattern starts without a `/` on purpose (Step 2).

- [ ] **Step 8: Check docs/PLAN.md, D10 (check only)**

```bash
cd /d/johnn/Projects/inkweave-admin
grep -cF 'R4 redirects `/reveal` and `/image` to `/studio`' docs/PLAN.md
```

Expected: `1`, at `:75`. D10 already says R4's routes, so the file stays as it is. Reword it only on the owner's word, for example: "R4 adds `/studio` (Card studio) and redirects `/reveal` and `/image` to it". Then add `docs/PLAN.md` to Step 12's paths.

- [ ] **Step 9: Sweep for stale names**

```bash
cd /d/johnn/Projects/inkweave-admin
rg -n -i --hidden "vercel\.app/(reveal|image)\b|reveal publisher|the publisher\b|publisher's|image tool|reveal tool|reveal, image|reveal and tuning|'card images'|\`/(reveal|image)\`|(?-i:[ (]/(reveal|image)\b)" .claude docs CLAUDE.md README.md .env.example scripts src .storybook --glob '!.claude/worktrees/**' --glob '!docs/plans/**' --glob '!docs/redesign/**' --glob '!docs/PLAN.md'
```

What the pattern holds:
- **Whole sweep:** `--hidden` reaches `.env.example`, and the worktree glob keeps Claude's session worktrees out. The plans, the handoff and `PLAN.md` are history.
- **The route alternation is case-sensitive.** Under `-i` it matched `WebAnalyticsBody.test.tsx`'s `/Reveal card clicks/`.
- **Routes inside paths are left alone.** A bare `/reveal/` would match every `src/tools/reveal/` import.

Expected: only lines that are true of the built studio, or that record history in the past tense or as provenance (R2-7's rule, as R4-6c's Step 9 applies it). Running the pattern over the drafts' code (2026-10-07) gives these, and they stay:
- **`CLAUDE.md:16`.** CM-4's redirects name `` `/reveal` `` and `` `/image` ``.
- **`src/github/useGithubToken.ts:4`.** Why the token's storage key keeps reveal-admin's name.
- **The redirects, described as such** (R4-6c): `src/router.tsx`'s and `src/router.test.tsx`'s "Card studio replaced the two write tools at /reveal and /image (R4)", and `src/shell/nav.test.ts`'s "/tuning, /reveal and /image are redirects now".
- **`src/shell/nav.ts`:** R4-5a's `studioHref` doc ("the old /reveal and /image redirects navigate to"), and R4-6c's comment over the studio item ("in place of the write tools at /reveal and /image").
- **Provenance in the studio:**
  - `src/tools/studio/NewRevealPane.tsx`: "what /reveal did, in the studio's layout" (R4-6c's rewording of R4-6a's doc);
  - `src/tools/studio/StudioPage.tsx`: "replacing the reveal publisher and Card images" (R4-6a);
  - `src/tools/studio/cardPanel.ts`: "as the image tool named them" (R4-5d, its dead pointer dropped by R4-6c);
  - `src/tools/studio/components/StudioAside.stories.tsx`: "the image tool's note" (R4-5e);
  - `src/tools/studio/__tests__/useCardEditor.save.test.ts`: two "The image tool's …" comments over the ported cases (R4-4c);
  - `src/tools/studio/__tests__/StudioFormCardText.test.tsx`: the #635 fixture's "as it was typed into the reveal publisher" (R4-5b);
  - R4-6b's comment on its image note, if it calls it "the image tool's sentence".

`readiness.ts` and `SynergyPreviewPanel.tsx` are not in the list: R4-6c's Step 9 drops both clauses, so neither prints (and if one had survived, SR-6 or SR-7 removed it in Step 6).

Read each line the command prints. A line from the list above may stay. For anything else:
- **A comment or a doc line still describing the old pages as live** (like SR-6's and SR-7's Currents): reword it here with the Edit tool, and add its path to Steps 10 to 12.
- **A label, a route or a test** (the nav items, Sidebar, router, writePages and PageLayout story labels): this is R4-6c's defect. Report it to the owner, and fix it in R4-6c's files as its own `fix(studio): … (#24)` commit once the owner approves.

On the 2026-10-07 tree, after this task's edits, the command printed `CLAUDE.md:16`, `useGithubToken.ts:4` and only lines R4-6c removes or rewrites.

- [ ] **Step 10: Lint and typecheck**

```bash
cd /d/johnn/Projects/inkweave-admin
pnpm exec eslint --max-warnings 0 scripts/reveal-sync/write.mjs scripts/reveal-sync/publish.mjs scripts/reveal-sync/web.mjs scripts/reveal-sync/web.test.mjs scripts/reveal-sync/write-chain.test.mjs scripts/reveal-sync/text.mjs src/vite-env.d.ts src/app-bridge.ts
pnpm typecheck
```

Add to the eslint line each fallback file Step 6 edited (`src/shell/nav.ts` for SR-4, `src/tools/reveal/useRevealAdmin.ts` for SR-5, `src/tools/studio/readiness.ts` for SR-6, `src/tools/reveal/components/SynergyPreviewPanel.tsx` for SR-7), and any file Step 9 edited. None is expected.

Expected: eslint prints nothing. `pnpm typecheck` exits 0: it builds the engine, then runs `tsc -b`. Run nothing more. The pre-commit hook runs the full lint and `test:run`, and Step 5 already ran reveal-sync. There is no `pnpm build`: R4-8 runs it.

- [ ] **Step 11: Code Health**

Run CodeScene's `code_health_review` on each changed source file:
- `scripts/reveal-sync/write.mjs`, `publish.mjs`, `web.mjs`, `text.mjs`, `web.test.mjs` and `write-chain.test.mjs`;
- `src/app-bridge.ts` and `src/vite-env.d.ts`;
- only if Step 6 applied their fallback, `src/shell/nav.ts`, `src/tools/reveal/useRevealAdmin.ts`, `src/tools/studio/readiness.ts` and `src/tools/reveal/components/SynergyPreviewPanel.tsx`; and any file Step 9 edited.

Expected:
- **The score each file had before this task, with no new findings,** for every file but two: the edits touch only strings and comments. The reveal-sync files, `nav.ts` and `useRevealAdmin.ts` scored 10 on 2026-10-07, and the earlier tasks held new studio modules to 10.
- **`app-bridge.ts` and `vite-env.d.ts`** get "Could not determine Code Health score": they hold re-exports and a declaration, with no function.
- **Hand count:** no function, parameter or branch is added or changed, so every module's share of primitive parameters is as it was.
- **`src/github/githubCommit.ts`** is untouched.

- [ ] **Step 12: Commit, after the owner approves**

Show the owner `git diff --stat` and the commands below, and ask for approval. Then, with the Bash tool, stage the paths as their own call. Add `src/shell/nav.ts`, `src/tools/reveal/useRevealAdmin.ts`, `src/tools/studio/readiness.ts` or `src/tools/reveal/components/SynergyPreviewPanel.tsx` only if Step 6 edited it (SR-4 to SR-7), `docs/PLAN.md` only if Step 8 did, and any file Step 9 fixed:

```bash
git add docs/REVEAL_RUNBOOK.md .claude/skills/fetch-reveals/SKILL.md CLAUDE.md .env.example src/vite-env.d.ts src/app-bridge.ts scripts/reveal-sync/write.mjs scripts/reveal-sync/publish.mjs scripts/reveal-sync/web.mjs scripts/reveal-sync/text.mjs scripts/reveal-sync/web.test.mjs scripts/reveal-sync/write-chain.test.mjs
```

Then:
1. Run `git status --short`. Nothing should be unstaged.
2. Run CodeScene's `pre_commit_code_health_safeguard`, and go on only when it passes.
3. Commit, as a separate, unpiped Bash call (never PowerShell):

```bash
USER_APPROVED=1 git commit -m "docs(studio): point the runbook, skills and reveal-sync wording at Card studio (#24)"
```

Husky's pre-commit runs the full lint and `test:run`; never pass `--no-verify`. If Vitest fails to start its workers under load, stop this session's preview servers, wait out other sessions' runs, and retry.

- [ ] **Step 13: The user-level `scan-reveal-card` skill (owner-approved, never committed)**

The skill lives outside the repo, at `~/.claude/skills/scan-reveal-card/SKILL.md`, so it goes in no commit. Show the owner SK-1 to SK-12 below, and edit only after they approve this edit separately.
- **The blocks** quote the 2026-10-07 file, with B2, B11, B12, B15 and B16 from Step 2.
- **The season block** (`:10-20`) is left alone. If the owner has since rotated it, SK-5's table keeps whatever `/204` and `14000 +` the file then shows. Report any Current that no longer matches.

First keep a copy, so the diff can be shown. The path below is the controller's scratchpad on 2026-10-07. If the running session's scratchpad differs, use that one here and in the diff below:

```bash
cp ~/.claude/skills/scan-reveal-card/SKILL.md "C:/Users/johnn/AppData/Local/Temp/claude/D--johnn-Projects-inkweave-admin/a2e248da-aed8-4c04-aed1-fb9d858b726c/scratchpad/scan-reveal-card.SKILL.md.before"
```

Then use the Edit tool on `C:\Users\johnn\.claude\skills\scan-reveal-card\SKILL.md`.

**SK-1** (`:3`, the description). Current:

```md
output ready-to-paste reveal publisher form field values.
```

New:

```md
output ready-to-paste Card studio form field values.
```

**SK-2** (`:3`). Current:

```md
through admin's reveal publisher (https://inkweave-admin.vercel.app/reveal), or whenever
```

New:

```md
through admin's Card studio (https://inkweave-admin.vercel.app/studio), or when refreshing a card to its English scan there, or whenever
```

**SK-3** (`:6`). Current:

```md
# Scan reveal card → reveal publisher form fields
```

New:

```md
# Scan reveal card → Card studio form fields
```

**SK-4** (`:8`). Current:

```md
output the exact values to paste into admin's reveal publisher (https://inkweave-admin.vercel.app/reveal), one labeled block per card.
```

New:

```md
output the exact values to paste into admin's Card studio (https://inkweave-admin.vercel.app/studio): New reveal for a new card, Edit card for a refresh to the English scan (rule 6). One labeled block per card.
```

**SK-5** (`:24-40`): the table, in the studio's section order.
- **The order:** Identity (number, name, version, franchise, subtypes), Ink & rarity, Type & stats, Card text (R4-5b).
- **The Location row** follows `STAT_FIELDS.Location`: move cost, willpower and lore.
- **French** comes from R-60.

Current:

```md
Produce a small table with these fields, in this order (it mirrors the reveal publisher's form):

| Field | Source on the card |
|---|---|
| Collector number | the number before `/204` (note: id = 14000 + number) |
| Name | card name; keep punctuation (`Cower Before Me!`); keep `&` for Team cards |
| Version | the subtitle under the name; **blank** for Action / Item / Song |
| Cost | top-left gem number |
| Ink | frame colour → Amber / Amethyst / Emerald / Ruby / Sapphire / Steel (dual-ink → two) |
| Type | Character / Action / Item / Location |
| Strength / Willpower / Lore | **Characters only** (sword / shield / count of ◊ pips) |
| Move cost | **Locations only** |
| Subtypes | the classification line, comma-separated (`Storyborn, Hero, Red Panda`) |
| Keywords | keyword abilities the card HAS, one per line, with value (see rules) |
| Full card text | printed rules text, one ability per line (see rules) |
| Franchise | the card's real franchise; a featured one exactly as spelled above (see rules) |
| Scan language | the language the card is printed in: English (the default), Japanese, German or Italian (see rules) |
```

New:

```md
Produce a small table with these fields, in this order (it mirrors Card studio's New reveal form, section by section):

| Section | Field | Source on the card |
|---|---|---|
| Identity | Collector number | the number before `/204` (note: id = 14000 + number) |
| Identity | Name | card name; keep punctuation (`Cower Before Me!`); keep `&` for Team cards |
| Identity | Version | the subtitle under the name; **blank** for Action / Item / Song |
| Identity | Franchise | the card's real franchise; a featured one exactly as spelled above (see rules) |
| Identity | Subtypes | the classification line, comma-separated (`Storyborn, Hero, Red Panda`) |
| Ink & rarity | Ink | frame colour → Amber / Amethyst / Emerald / Ruby / Sapphire / Steel (dual-ink → two: turn on Dual-ink card, then pick the Second ink) |
| Type & stats | Type | Character / Action / Item / Location |
| Type & stats | Cost | top-left gem number |
| Type & stats | Strength / Willpower / Lore | **Characters** (sword / shield / count of ◊ pips); a Location has Willpower and Lore too |
| Type & stats | Move cost | **Locations only** |
| Card text | Keywords | keyword abilities the card HAS, one per line, with value (see rules) |
| Card text | Full card text | printed rules text, one ability per line (see rules) |
| Card text | Scan language | the language the card is printed in: English (the default), Japanese, German, Italian or French (see rules) |

Rarity (in Ink & rarity) and Inkable (in Type & stats) are pickers in the form: give them in the Confirm line.
```

**SK-6** (`:51`, rule 2). Current:

```md
The publisher writes house style (Doberjohn/inkweave#635)
```

New:

```md
Card studio writes house style (Doberjohn/inkweave#635)
```

**SK-7** (`:55`, rule 4). Current:

```md
The form rejects a mismatch,
```

New:

```md
Card studio rejects a mismatch,
```

**SK-8** (`:55`, rule 4; R-73, B13). Current:

```md
Numbers above the set total (promos, enchanteds) have no block.
```

New:

```md
A number above the set total is never a card: it is an Epic, Enchanted or Iconic printing of a card in the set, which Card studio refuses and admin publishes with `variants.mjs` (admin's runbook). Flag it.
```

**SK-9** (`:57`, rule 5). Current:

```md
such a card CANNOT go through the reveal publisher: flag it
```

New:

```md
such a card CANNOT go through Card studio: flag it
```

**SK-10** (`:59`, rule 6). Current:

```md
The publisher then marks the card (`scanLanguage`)
```

New:

```md
Card studio then marks the card (`scanLanguage`)
```

**SK-11** (`:59`, rule 6; R-60, B12; the English refresh points at Edit card). Current:

```md
The publisher offers only Japanese, German and Italian besides English, so a scan in any other language (French, Chinese) can't be marked there: flag it and ask the user.
```

New:

```md
Card studio offers Japanese, German, Italian and French besides English, so a scan in any other language (Chinese, say) can't be marked there: flag it and ask the user. When the English scan is out, the card is refreshed in Card studio's Edit card: read the English scan with this skill, then load the card, replace its image, set Scan language to English, and fix any field the English printing words differently. One save drops the mark.
```

**SK-12** (`:65`, rule 9; `STAT_FIELDS.Location`, as SK-5's table now says). Current:

```md
Actions/Items/Songs have no stats; Locations have a move cost instead.
```

New:

```md
Actions/Items/Songs have no stats; a Location has a move cost, Willpower and Lore, but no Strength.
```

Then:

```bash
git diff --no-index --stat "C:/Users/johnn/AppData/Local/Temp/claude/D--johnn-Projects-inkweave-admin/a2e248da-aed8-4c04-aed1-fb9d858b726c/scratchpad/scan-reveal-card.SKILL.md.before" ~/.claude/skills/scan-reveal-card/SKILL.md
rg -n "publisher|/reveal\b" ~/.claude/skills/scan-reveal-card/SKILL.md
```

Expected:
- **The stat** shows one file changed. Show the owner the full `git diff --no-index` too.
- **`rg`** prints nothing. A new session loads the skill's new description.

### Hand-offs from R4-7

- **R4-8 ("R4 as built").**
  - **Departures:** every string Step 2 found different from the plan, and every block it changed.
  - **Docs:** this task brought the runbook, the fetch-reveals skill, the reveal-sync wording, `.env.example`, `vite-env.d.ts` and CLAUDE.md:15-18 up to the studio. It also reworded comments in `src`: SR-3, and whichever of SR-4 to SR-7 Step 6 applied.
  - **R-73's reach:** the runbook's `:28` and `:80` changed with it, so promos now go in by PR.
- **R4-8 (its sweep).** Reuse Step 9's command, which corrects the outline's and the audit's patterns (or keep R4-8's `git grep`, and widen its expected list the same way). Its expected output is not only `useGithubToken.ts` and the #635 comment: it is `CLAUDE.md:16` plus the redirect and provenance lines Step 9 lists as staying, among them `StudioPage.tsx`'s "replacing the reveal publisher and Card images", which R4-8's `Card images` alternative also matches.
- **R4-8 (CLAUDE.md).** Lines 15-18 are done here. R4-8's Step 12 checks them against the code after the fix wave, and its `docs: describe Card studio as built (#24)` commit carries only what it finds beyond them, as the header's task-order table already says.
- **R4-8 (the app-repo issue, R-62).** The app's docs at the pin still name the old tool:
  - `docs/reveals/START_REVEAL_SEASON.md`: "reveal publisher" at `:7`, `:67`, `:129` (with the `/reveal` URL) and `:174`; "the publisher commits" at `:133`; "Admin's `/fetch-reveals` and reveal publisher do not handle variants" at `:137`.
  - `:93` and `:98` mirror admin's runbook `:75` and `:80`, so they need R-73's and R-91's wording too: no number past the set, and Edit can't renumber.
  - `CLAUDE.md:225`: its tool names, plus the bridged-module list (R-62).
- **R4-8 (admin#14, R-80 and R-87).** The closing comment can point to the runbook's new section. Item 3 shipped for cards, and a printing's English refresh stays a hand edit, documented there.
