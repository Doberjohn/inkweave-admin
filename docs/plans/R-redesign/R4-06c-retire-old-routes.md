> Part of [R: Admin redesign](../R-redesign.md), phase R4 ([R4-card-studio.md](R4-card-studio.md)). Read the main plan's decisions (R-57 to R-91 for R4), corrections, global constraints and shared interfaces, then the R4 header, first.

> **Re-base notes (R4-6c, 2026-10-07).** Re-based from the outline's Task R4-6 (`R4-card-studio.md:812-951`, the outline as written on 2026-10-01 against the planned R1 code), its delete and keep lists (`:42-55`) and its open question 4 (`:1026`). The base is `main @ e5e5029` (R1 to R3 as built, plus the pin bump), pin `upstream/inkweave` @ `16283a13`, with R4-1a to R4-6b landed on `feature/24-redesign-r4`. It follows decisions R-10, R-57 to R-91 and the 2026-10-07 audit (`r4-audit-full.json`'s R4-6 entry and its parity check; `r4-audit-synth.md`'s R4-6 summary). What changed and why:
> 1. **R4-6 is three tasks; this is the last.** R4-6a built `StudioPage`, the `/studio` route and the Card studio nav item beside the old ones, and ported `writePages.test.tsx`'s three cases into `StudioPage.test.tsx`. R4-6b added the Edit pane. This task retires `/reveal` and `/image`: the redirects, the two nav items, the test and story sweep, the deletions, the "Edit in Card studio" link (R-82) and the route checks. It builds no studio behaviour.
> 2. **The redirects (R-10).**
>    - `/reveal` lands on `studioHref('new')` (`/studio`) and `/image` on `studioHref('edit')` (`/studio?mode=edit`), both with `replace`, the idiom the `/analytics` and `/tuning` redirects use (`router.tsx:24`, `:28`).
>    - `studioHref` comes from `src/shell/nav.ts` (R-81, R4-5a), not `tools/studio`.
>    - The outline's line references drifted: `Navigate` is already imported (`router.tsx:1`), the page imports are at `:9-10` and the routes at `:25-26` on `main`. R4-6a added the `StudioPage` import and the `studio` route beside them. Step 3 gives the whole file, so the line numbers don't matter.
> 3. **Nav.** The `reveal` and `image` items go, and Card studio is the one Publish item. `navItemFor`'s doc comment used `/reveal/` as its example (`nav.ts:31-35`), so it moves to `/studio/`. R4-6a's comment over the studio item ends "which R4-6c removes"; it is rewritten too.
> 4. **`router.test.tsx` keeps the real token store.** The outline mocked `useGithubToken` there (`:918-927`). Its existing cases save a token through `renderHook(() => useGithubToken())` and click the sidebar's Forget token (`router.test.tsx:117-138`), so a mock with no-op setters would break them (audit, significant).
>    - `WRITE_PAGES` keeps two rows, `/studio` (R4-6a's) and `/calibration`. Its three data-driven cases (the gate under the title, the sidebar's Forget token, one `main`) cover the studio.
>    - `/reveal` moves to `/studio` at `:43`, `:55-56` and `:67`.
>    - `routerAt` moves from inside `describe('calibration routes')` (`:216-220`) to the top of the file, so the new `describe('Card studio routes')` can read where a redirect left it. That block's two cases assert the pathname, the search, a REPLACE, the h1 and that focus stayed on `<body>` (R-48: a redirect is no one's action).
>    - R4-6a's case "opens Card studio on any mode and card, current in the sidebar while the old tools are not" checks the "Reveal publisher" link, which goes. It checks Overview instead.
> 5. **`writePages.test.tsx`'s three cases.** R4-6a ported them into `StudioPage.test.tsx` through `createMemoryRouter` (its `describe('StudioPage: the gate and the header')`), so this task deletes the file. Step 1 checks that the port is there. This task also folds the three invariants into `router.test.tsx`'s `WRITE_PAGES` cases, through the real routes and both write pages, with one helper, `expectWritePage(title)`:
>    - one `main`, one `h1` named for the page, and the branch notice naming `master`, both before and after a token is saved;
>    - the gate's own `h2` "GitHub token" and its labelled field under that `h1`;
>    - no Forget token inside `main` once a token is saved: the page leaves it to the sidebar.
>
>    The outline's "with a token, `/studio` shows the branch notice naming `master`" is the second `expectWritePage` call. The page's subtitle stays `StudioPage.test.tsx`'s.
> 6. **The rest of the sweep.**
>    - **`nav.test.ts`.** `/studio` replaces `/reveal` in `navItemFor` and `isWritePath`, and `/studios` replaces `/imagery` as the prefix that no item owns. `/reveal` and `/image` join `/tuning` in the "writes nothing" list, the precedent R2 set. So Step 8's first `rg` lists `nav.test.ts` too (audit, cosmetic). R4-6a's "the Card studio item" case becomes "is the one Publish item", which pins the whole item with `toEqual`.
>    - **`Sidebar.test.tsx`** (`:33-41`, `:46`, `:53`, `:70-72`, `:81`) and **`Sidebar.stories.tsx:32`** move to `/studio` and "Card studio" with its mark `Cs`.
>    - **`AdminShell.test.tsx`** mounts `StudioPage` at `studio` in place of `ImagePage` (`:5`, `:29`, `:50`). Its bridge mock and its never-settling fetch stay: with the token saved (`:40`), the workspace's `previewCards.json` read waits for good.
>    - **`PageLayout.stories.tsx:42`**: the `Writes` story's title becomes "Card studio".
> 7. **"Edit in Card studio" (R-82).** R3 shipped the slot and no link (`CardAnalyticsView.tsx:27-28`, `:82`; `CardHeader.tsx:75-76`, `:106`), so the outline's "move R3's link" is an addition.
>    - **Where.** `CardPageBody`'s `'card'` case builds it and passes it as `headerActions`. `CardPageBody` already holds the card (`:176-177`), so `CardAnalyticsPage` passes nothing new.
>    - **What.** A react-router `Link`, through the Overview's `PanelLink` (`overview/PanelLink.tsx:13-21`), to `studioHref('edit', state.card.id)`. Reusing `PanelLink` is the most literal way to be "styled like PanelLink", and adds no style. `CardPageBody` already imports from `../overview/` (`MIN_RULE_VOTES`, `:13`). Every card the page shows is in the card list, and Edit card searches that list, so every card gets the link.
>    - **No focus code.** Following the link is a page change, as after R3's other cross-page card links. The studio's handoff (R-59, R4-6b) asks only when the URL's card changes within the studio.
>    - **The story's `CtaButton`** (`CardAnalyticsView.stories.tsx:78-81`) becomes the same link. `CardAnalyticsView`'s doc comment loses "R3 passes none".
>    - **The test.** `CardAnalyticsPage.test.tsx`'s stand-in view renders `props.headerActions`, and one new case asserts the href. `CardAnalyticsView.test.tsx:96-98` keeps testing the slot with a plain button.
> 8. **The deletions: 23 files, one `git rm`.** These are the header's "Deleted in R4-6c" list: the two pages, their components and stories, the old tests, `ImageUploadTile`, `writePages.test.tsx` and both barrels. Nothing else imports a barrel: every R2 to R4 module imports directly, and the only importers were `RevealPage.tsx:12` and `ImagePage.tsx:5`. The 6 deleted test files hold 20 tests, R4-3a's French case in `RevealAdminForm.test.tsx` included, and each case lives on (table below).
> 9. **`publishError` goes (R4-3b's hand-off: "R4-6c's call").**
>    - **Why.** It was RevealPage's one error line (`RevealPage.tsx:44-46`): `commitError ?? upload.error`. Once the page is gone, nothing reads it. R4-6a's New reveal pane reads `commitError` and `imageError`. Its doc comment ("the reveal publisher's one error line") would also be the only live mention of the retired tool in the controller, and R4-7's stale-name sweep would list it.
>    - **What changes.** One field and its return line in `useRevealAdmin.ts`; three expectations in `useRevealAdmin.test.ts` (R4-3b's; no test name mentions the field); one line in R4-6a's `studioFixtures.ts`; one override in R4-6a's `NewRevealPane.test.tsx`. Typecheck finds any site left over. No behaviour changes, and the hook loses one `??`.
> 10. **The bridge loses `EMPTY_BOX` and `GOLD_GLOW`.** `CardPreviewPanel.tsx:6-7` and `ImageUploadTile.tsx:1` were their last importers. R4-5d's card panel drops the legacy `GOLD_GLOW.focusRing` for `adm-file-cover`, and no studio draft imports either name. R1-12's rule (owner-approved 2026-10-02, applied again by R2-7 to `CAP_LABEL_XS`) drops a re-export nothing uses. A task that edits `app-bridge.ts` runs `web.test.mjs` (header, "The checks").
> 11. **Sweeps.**
>    - **Routes.** The outline's two-pattern check stays: one `rg` for quoted route strings, one for `path:` entries (its adjusted note). The expected output now lists `nav.test.ts`.
>    - **Names.** A name sweep over the retired modules runs, on R2-7's rule: past-tense provenance ("ported from …") may stay, and a live reference may not. A `file:line` citation of a deleted file is a dead pointer, so it is reworded.
>    - **Forward references.** A sweep for `R4-6c` catches the notes earlier tasks left for this one: R4-6a's two, and R4-5e's in `SynergyPreviewPanel.tsx`'s doc ("… until R4-6c retires that page").
>    - **Live claims.** Two earlier comments speak of the old tool as live and turn false here: R4-3a's `readiness.ts` ("as the reveal publisher shows it today") and R4-6a's `NewRevealPane.tsx` ("today's reveal publisher"). Each loses the clause, so neither keeps the old name.
>    - **R4-5h's hand-off.** Its suggested check (`enchantedSymbol|epicSymbol|iconicSymbol|PRINTING_SYMBOLS`, no match) joins the name sweep.
>    - **R4-5e's hand-off** left the call on `SynergyPreviewPanel`'s story to this task. Once the other two stories go, `Reveal Admin/SynergyPreviewPanel` would be the retired tool's last Storybook group, so it moves to `Admin/Publish/Card studio/Synergy rows`, beside R4-5e's `…/Aside`. The file stays where it is.
>    - **R4-6b's note.** Edit's note now lives in `studioCopy.ts` (`editNote`), not the `editCopy.ts` an earlier draft named. If its comment cites `ImagePage.tsx:20`, the name sweep prints it and the citation goes.
>    - **No old tool names in new comments.** This task's own comments say "the write tools at /reveal and /image", never "reveal publisher", "Card images" or "image tool". R4-7's stale-name sweep still prints them through its route alternation (`[ (]/(reveal|image)\b`), as it prints R4-5a's `studioHref` doc: redirect history in `router.tsx`, `router.test.tsx`, `nav.ts` and `nav.test.ts`, all correct (hand-offs).
> 12. **Docs stay R4-7's.** `CLAUDE.md:16` to `:18` still name `/reveal` and `/image`, or the reveal and image tools, after this commit. So do `docs/REVEAL_RUNBOOK.md`, `src/vite-env.d.ts:5` and `.env.example`. R4-7 rewrites them after the owner's rehearsal, quoting the built UI (header, Tasks).
> 13. **Not taken from the outline:**
>     - `useUnsavedGuard` and the `window.confirm` guard (R-58: R2's one `UnsavedChangesGuard`, R4-6a);
>     - the `StudioPage` work and its tests (R4-6a, R4-6b);
>     - the live rehearsal, which is owner-held after this task (R-86, header Tasks);
>     - `pnpm test:run`, `pnpm lint` and `pnpm build` inside the task (gates once; R4-8 builds).
> 14. **Code Health (CodeScene MCP 1.5.7, in a scratch git folder holding the changed files).**
>     - **Scores.** 10.0 with no findings for `CardPageBody.tsx`, `CardAnalyticsView.tsx`, `CardAnalyticsView.stories.tsx`, `nav.ts`, `useRevealAdmin.ts`, `studioFixtures.ts`, `router.test.tsx`, `nav.test.ts`, `Sidebar.test.tsx`, `AdminShell.test.tsx`, `CardAnalyticsPage.test.tsx` and `useRevealAdmin.test.ts`. `router.tsx` and `app-bridge.ts` get no score, because they hold no functions.
>     - **Complexity.** No new branch in any source file. `CardPageBody`'s `switch` keeps its five cases.
>     - **Primitive parameters, by hand.**
>       - `router.tsx`, `CardPageBody.tsx`, `CardAnalyticsView.tsx`, `app-bridge.ts`: no new function.
>       - `nav.ts`: 6 of 6, as R4-5a left it.
>       - `useRevealAdmin.ts`: unchanged.
>       - `router.test.tsx`: its named helpers are `renderAt(path)`, `routerAt(path)` (moved, not new) and `expectWritePage(title)`, 3 strings in 3. R3's version, 2 strings in 2, passed the PR gate. String Heavy Arguments fired on `githubCommit.ts` only at 12 or more, so 3 is far below it. If the PR check ever flags this file, make `expectWritePage` take the `WRITE_PAGES` row (`[path, title]`).
> 15. **Verified (2026-10-07)** in two sandboxes under `scratchpad/r4-rebase`, each with `node_modules` and `upstream/` junctioned in and Vite's cache in the sandbox.
>     - **`sandbox-R4-6c`.** `src/` from the working tree (`main @ b490fb7` plus the uncommitted pin bump to `16283a13`), with R4-5a's `nav.ts` and `nav.test.ts`, R4-6a's router, nav item, `router.test.tsx` and Sidebar line as drafted (as of 16:40), and a `StudioPage` stand-in with the header's contract: the gate in `PageLayout writes`, and the workspace in a flush layout behind an `UnsavedChangesGuard`.
>       - **Failing first.** With Step 2's test edits on the pre-task sources, exactly the 7 failures Step 2 quotes appeared.
>       - **Passing.** After Step 3, only the R-82 case failed. After Step 4, the five test files gave `Tests  109 passed (109)`. After the deletions and the bridge edit, `src/router.test.tsx`, `src/shell`, `src/tools/analytics/cards`, `src/tools/reveal`, `src/tools/image` and `src/components` gave 32 files and 520 tests passed.
>       - **Mutants.** Each failed its test: `/reveal` redirecting to Edit; the `/image` redirect without `replace`; the link to `studioHref('new', …)`.
>       - **Stories.** `HeaderActions`, `WritePageWithToken` and `Writes` render through `composeStories`, with the link's href, Card studio current and the "Card studio" `h1`.
>     - **`sandbox-R4-6c-on6a`.** R4-6a's whole draft `src/` (as of 16:36: the real `StudioPage`, `StudioWorkspace`, `NewRevealPane`, R4-3b's controller, `studioFixtures.ts` and the `StudioPage` tests), with every edit in this task applied:
>       - all 23 deletions, `publishError` dropped, the two bridge names dropped, and the `R4-6c` comment reworded;
>       - R4-3b's `useRevealAdmin.test.ts`, with Step 6's edits.
>
>       Results:
>       - **Typecheck.** `tsc -p tsconfig.app.json --noEmit` exits 0.
>       - **Tests.** `src/router.test.tsx`, `src/shell`, `src/tools/studio`, `src/tools/reveal`, `src/tools/image` and `src/tools/analytics/cards` gave 37 files and 594 tests, with one failure. That failure is `validateForm.test.ts`'s old "skips the ink check past the numbered set", which R4-3a replaces and the draft sandbox hadn't. The same set before the task: 43 files, 622 tests, the same one failure. So the task removes 6 files and 28 tests here: the 19 in the deleted files, 10 in `router.test.tsx` (the two old `WRITE_PAGES` rows in three cases, and the two old items in three `NAV_ITEMS`-driven cases, less the two new redirects), plus the one new R-82 case. On the real branch it removes 29, and the deleted files hold 20: this sandbox lacked R4-3a's test edits, so its `RevealAdminForm.test.tsx` had 3 cases, not R4-3a's 4 (Step 10).
>       - **Reveal-sync.** `vitest run --project scripts scripts/reveal-sync/web.test.mjs` gives 2 passed, with the edited bridge.
>     - **Lint.** Every changed file passes `eslint --max-warnings 0` in both sandboxes. The non-studio files also pass `pnpm exec eslint --max-warnings 0 --stdin --stdin-filename <path>` in the repo.
>     - **Checks.** Step 8's two `rg` commands print exactly the lines Step 8 expects in both sandboxes. Step 5's import check, run on today's repo, prints the three lines Step 1 expects.
>     - **Not run.** No browser and no Storybook server. R4-8 looks at the stories (hand-offs).
>     - **Re-run by the verifier** in `sandbox-v-R4-6c` (`sandbox-R4-6c-base`'s pre-task `src`, the task's files laid over it step by step): Step 2 gave `Tests  7 failed | 108 passed (115)` with exactly the seven messages quoted; Step 3 left the R-82 case alone failing (`108 passed (109)`); Step 4 gave `109 passed (109)`; after the deletions and the bridge edit, `tsc -p tsconfig.app.json --noEmit` exited 0, eslint was clean on the 13 non-studio files, and the six folders gave 32 files and 520 tests passed. CodeScene MCP scored `router.test.tsx` and `CardPageBody.tsx` 10.0 with no findings. Step 7's check, hardened to strip `type ` from a re-export, printed the same names on today's repo with the 23 files left out (`EMPTY_BOX`, `GOLD_GLOW`, and R4-5d's `CardTile` and `CardTranslationPanel`). The verifier also re-read the sibling drafts as they stood at 18:00 and re-cut Steps 1, 6 and 9 to them.

### Task R4-6c: Retire `/reveal` and `/image`

**Files:**
- **Modify:**
  - `src/router.tsx`: the old pages' imports (`:9-10` on `main`) go, `studioHref` is imported, and the `reveal` and `image` routes (`:25-26` on `main`) become redirects (Step 3 gives the whole file).
  - `src/shell/nav.ts`: the `reveal` and `image` items (`:27-28` on `main`) and R4-6a's comment over the studio item; `navItemFor`'s doc comment (`:31-35` on `main`).
  - `src/router.test.tsx`: `routerAt` hoisted (`:216-220`), `expectWritePage` added, `:43`, `:55-56`, `:67`, `WRITE_PAGES` and its three cases (`:101-138`), R4-6a's "opens Card studio …" case, and a new `describe('Card studio routes')`.
  - `src/shell/nav.test.ts`: the `navItemFor` and `isWritePath` blocks (`:3-27`) and R4-6a's "the Card studio item" block.
  - `src/shell/Sidebar.test.tsx`: `:33-41`, `:46`, `:53`, `:70-72` and `:81`.
  - `src/shell/AdminShell.test.tsx`: `:5`, `:29` and `:50`.
  - `src/shell/Sidebar.stories.tsx`: `:32`.
  - `src/shell/PageLayout.stories.tsx`: `:42`.
  - `src/tools/analytics/cards/CardPageBody.tsx`: the imports (`:6`, `:13`), the doc comment (`:155-160`) and the `'card'` case (`:176-177`).
  - `src/tools/analytics/cards/CardAnalyticsView.tsx`: the `headerActions` doc comment (`:27`).
  - `src/tools/analytics/cards/CardAnalyticsView.stories.tsx`: the import (`:3`) and the `HeaderActions` story (`:75-84`).
  - `src/tools/analytics/cards/__tests__/CardAnalyticsPage.test.tsx`: the stand-in's comment and body (`:42-44`, `:61-62`), and one case before `:279`.
  - `src/app-bridge.ts`: `EMPTY_BOX` and `GOLD_GLOW` out of the `shared/constants` re-export (`:19`, `:22`).
  - `src/tools/reveal/useRevealAdmin.ts` and `src/tools/reveal/__tests__/useRevealAdmin.test.ts` (R4-3b's): `publishError` goes.
  - `src/tools/studio/studioFixtures.ts` and `src/tools/studio/__tests__/NewRevealPane.test.tsx` (R4-6a's): `publishError` goes.
  - `src/tools/studio/__tests__/StudioPage.test.tsx` (R4-6a's): one comment.
  - `src/tools/reveal/components/SynergyPreviewPanel.stories.tsx`: its `title` (R4-5e's hand-off).
  - Any comment Step 9's sweep finds speaking of a retired file or the old tool as live. The drafts as of 2026-10-07 put four: `src/tools/studio/cardPanel.ts` (R4-5d), `src/tools/studio/NewRevealPane.tsx` (R4-6a), `src/tools/studio/readiness.ts` (R4-3a) and `src/tools/reveal/components/SynergyPreviewPanel.tsx` (R4-5e); plus `src/tools/studio/studioCopy.ts` (R4-6b's `editNote`) if its comment cites `ImagePage.tsx:20`.
- **Delete** (23 files, one `git rm` in Step 5):
  - `src/tools/reveal/`:
    - `RevealPage.tsx` and `index.ts`;
    - `components/RevealAdminForm.tsx` and `components/CardPreviewPanel.tsx`, each with its `.stories.tsx`;
    - `__tests__/RevealAdminForm.test.tsx`, `__tests__/RevealAdminFormCardText.test.tsx` and `__tests__/CardPreviewPanel.test.tsx`.
  - `src/tools/image/`:
    - `ImagePage.tsx`, `useImageAdmin.ts` and `index.ts`;
    - `components/CardImagePicker.tsx`, `components/ImageComparePanel.tsx` and `components/UploadColumn.tsx`, each with its `.stories.tsx`;
    - `__tests__/useImageAdmin.test.ts` and `__tests__/CardImagePicker.test.tsx`.
  - `src/components/ImageUploadTile.tsx` and `ImageUploadTile.stories.tsx`.
  - `src/tools/__tests__/writePages.test.tsx`.
- **Checked and kept:**
  - in `src/tools/reveal`: the reveal-sync contract files (`validateForm.ts`, `buildPreviewCard.ts`, `insertCardIntoPreviewJson.ts`, `constants.ts`), `githubClient.ts`, `useRevealAdmin.ts`, `livePreview.ts` (R4-3b), `replaceCardInPreviewJson.ts` (R4-1a), `emptyForm.ts` (R4-3a), `components/SynergyPreviewPanel` (R4-5e's restyle; its story only retitled) and their tests;
  - in `src/tools/image`: `filterCards.ts` and `githubClient.ts` (`commitCardImage`, `ImageAdminCard`), with their tests;
  - in `src/components`: `useHiddenFileInput` and `useImageUpload`;
  - `src/github/useGithubToken.ts:3-5` ("reveal-admin", "image tool"): history, which R4-7's sweep also keeps.
- **Not touched:** `scripts/reveal-sync` (no contract file changes), `CLAUDE.md`, `docs/` and `src/vite-env.d.ts` (R4-7).

**Where the retired tests' cases live now** (the old file, then the task that holds its cases):

| Retired test | Cases | Now in |
|---|---|---|
| `RevealAdminForm.test.tsx` | 4: ties each error to its control; the stats per type; the scan language; French offered (R4-3a) | R4-5b and R4-5c `StudioForm.test.tsx` ("StudioForm, ported from RevealAdminForm"; French through "lists a language the list lacks…", whose options are `SCAN_LANGUAGES`) |
| `RevealAdminFormCardText.test.tsx` | 2: the house-style rewrite on leave; no rewrite on window blur | R4-5b `StudioFormCardText.test.tsx` |
| `CardPreviewPanel.test.tsx` | 1: what "See translation" shows | R4-5d `StudioCardPanel.test.tsx`, for `ja` and `fr` |
| `useImageAdmin.test.ts` | 5: card change clears the image; bytes never under another file's name; after a commit; a card picked mid-publish; a late read | R4-4b and R4-4c `useCardEditor` tests ("the staged image"). "Clears the published card" becomes "keeps the card, clears the image" (R-70) |
| `CardImagePicker.test.tsx` | 2: picks and marks pressed; narrows the list | "narrows" in R4-5f `EditSearch.test.tsx`. "Marks pressed" isn't ported: the Editing banner replaces the selection |
| `writePages.test.tsx` | 6 (3 per page): header, no Forget token, gate | R4-6a `StudioPage.test.tsx` ("the gate and the header"); this task's `WRITE_PAGES` cases in `router.test.tsx` |

**Interfaces:**
- **Consumes:**
  - **R4-5a.** `type StudioMode = 'new' | 'edit'` and `studioHref(mode: StudioMode, cardId?: string | null): string` (`src/shell/nav.ts`): `'/studio'`, `'/studio?mode=edit'`, `'/studio?mode=edit&card=2983'`.
  - **R4-6a.**
    - `StudioPage()` (`src/tools/studio/StudioPage.tsx`): `PageLayout title="Card studio" writes` round the gate with no token, and the workspace with one.
    - The `{path: 'studio', element: <StudioPage />}` route, and the `studio` nav item (`{id: 'studio', label: 'Card studio', mark: 'Cs', path: '/studio', group: 'publish', writes: true}`).
    - `StudioPage.test.tsx`'s port of `writePages.test.tsx`.
    - `studioFixtures.ts`'s reveal controller builder, and `NewRevealPane.test.tsx`.
  - **R4-6b.** The Edit pane at `/studio?mode=edit`.
  - **R4-3b.** `RevealAdminController.commitError: string | null`, the commit failure alone, which is what New reveal shows once `publishError` goes.
  - **Comments Step 9 rewords** (no code): R4-3a's `readiness.ts`, R4-5d's `cardPanel.ts`, R4-5e's `SynergyPreviewPanel.tsx` and its story, R4-6a's `NewRevealPane.tsx` and `StudioPage.test.tsx`, and R4-6b's `studioCopy.ts` if it cites `ImagePage.tsx:20`.
  - **R3.**
    - `CardAnalyticsViewProps.headerActions?: React.ReactNode` (`CardAnalyticsView.tsx:27-28`, `:82`), shown at the right of `CardHeader` (`:106`).
    - `CardPageBody`'s `'card'` case (`:176-177`).
  - **R1-8.** `PanelLink({to, label?, children})` (`src/tools/analytics/overview/PanelLink.tsx:13-21`): a router `Link` in the accent colour, `ADMIN_TYPE.small`, no underline, `nowrap`.
  - **The ports** in the table above.
- **Produces:**
  ```tsx
  // src/router.tsx (R-10)
  {path: 'reveal', element: <Navigate to={studioHref('new')} replace />},   // -> /studio
  {path: 'image', element: <Navigate to={studioHref('edit')} replace />},   // -> /studio?mode=edit
  // src/shell/nav.ts: the Publish group is one item
  {id: 'studio', label: 'Card studio', mark: 'Cs', path: '/studio', group: 'publish', writes: true},
  // CardPageBody's 'card' case (R-82)
  headerActions={<PanelLink to={studioHref('edit', state.card.id)}>Edit in Card studio</PanelLink>}
  ```
  - **Gone:** `RevealPage`, `ImagePage`, `useImageAdmin`, `ImageAdminController`, `RevealAdminForm`, `CardPreviewPanel`, `CardImagePicker`, `ImageComparePanel`, `UploadColumn`, `ImageUploadTile`, both barrels, `RevealAdminController.publishError`, and the bridge's `EMPTY_BOX` and `GOLD_GLOW`.

This task deletes code. Its red step is the redirect, nav and link tests in Step 2, plus the import check in Step 1, which lists the importers still to move.

- [ ] **Step 1: Check what this task builds on**

From the repo root, on `feature/24-redesign-r4`, in Git Bash:

```bash
git log --oneline main..HEAD | head -3
git submodule status upstream/inkweave
rg -n "export function studioHref|id: '(studio|reveal|image)'" src/shell/nav.ts
rg -n "path: '(studio|reveal|image)'|StudioPage" src/router.tsx
rg -n "R4-6c" src
for p in "shows the stats the card's type prints" "house-style rewrite" "See translation" "narrows the list as you search" "useImageAdmin.test.ts" "writePages.test.tsx"; do echo "== $p"; rg -l --fixed-strings "$p" src/tools/studio/__tests__; done
rg -n "publishError" src/tools/reveal src/tools/studio
```

Expected:
- **`git log`.** The newest commit is R4-6b's `feat(studio): add Edit card to Card studio (#24)`, after a fix round if it had one.
- **The submodule.** ` 16283a13502106205b8ed15c7bb33e89e2fe4e6f upstream/inkweave …`, with no leading `+` or `-`. If it starts with `+`, run `git submodule update` then `pnpm install --frozen-lockfile`.
- **`nav.ts`.** Four lines: the `studio`, `reveal` and `image` items, then `export function studioHref`.
- **`router.tsx`.** The `StudioPage` import, then three routes: `studio` with `<StudioPage />`, `reveal` with `<RevealPage />` and `image` with `<ImagePage />`.
- **`R4-6c`.** The notes earlier tasks left for this one. The drafts leave three:
  - R4-6a's comment over the studio item in `nav.ts` ("… which R4-6c removes");
  - R4-6a's comment over the ported cases in `StudioPage.test.tsx` ("… (R4-6c deletes that file with the old pages)");
  - R4-5e's doc comment in `src/tools/reveal/components/SynergyPreviewPanel.tsx` ("… until R4-6c retires that page").

  Step 3 and Step 9 reword each line printed here.
- **The ports.** Each `==` line is followed by at least one file (the search reads `src/tools/studio/__tests__/` only, so a source file's constant or comment can't stand in for a missing test):
  - `StudioForm.test.tsx` (R4-5b, R4-5c);
  - `StudioFormCardText.test.tsx` (R4-5b);
  - `StudioCardPanel.test.tsx` (R4-5d);
  - `EditSearch.test.tsx` (R4-5f);
  - the `useCardEditor` tests (R4-4b);
  - `StudioPage.test.tsx` (R4-6a).

  A bare `==` line means a port hasn't landed. Stop: its old test is about to be deleted.
- **`publishError`.** Nine lines:
  - `src/tools/reveal/useRevealAdmin.ts`: the interface field and the return line (R4-3b);
  - `src/tools/reveal/__tests__/useRevealAdmin.test.ts`: three, all in `describe('errors')` (R4-3b): `publishError: problem,`, `publishError: 'master changed while publishing',` and `{commitError: null, publishError: null}`;
  - `src/tools/studio/studioFixtures.ts`: `publishError: null,` (R4-6a);
  - `src/tools/studio/__tests__/NewRevealPane.test.tsx`: one override (R4-6a);
  - `src/tools/reveal/RevealPage.tsx`: two (`:44-45`), which go with the page.

  If a studio component (not a test or fixture) reads it, stop and report: Step 6 assumes nothing does.

Then list what still imports a retired module, leaving out the files this task deletes:

```bash
RETIRED=(src/tools/reveal/RevealPage.tsx src/tools/reveal/index.ts src/tools/reveal/components/{RevealAdminForm,CardPreviewPanel}{.tsx,.stories.tsx} src/tools/reveal/__tests__/{RevealAdminForm,RevealAdminFormCardText,CardPreviewPanel}.test.tsx src/tools/image/{ImagePage.tsx,useImageAdmin.ts,index.ts} src/tools/image/components/{CardImagePicker,ImageComparePanel,UploadColumn}{.tsx,.stories.tsx} src/tools/image/__tests__/{useImageAdmin.test.ts,CardImagePicker.test.tsx} src/components/ImageUploadTile{.tsx,.stories.tsx} src/tools/__tests__/writePages.test.tsx)
echo "${#RETIRED[@]} retired files"
git grep -n -E "['\"][^'\"]*/(RevealPage|ImagePage|useImageAdmin|RevealAdminForm|CardPreviewPanel|CardImagePicker|ImageComparePanel|UploadColumn|ImageUploadTile|tools/reveal|tools/image|reveal/index|image/index)['\"]" -- src .storybook "${RETIRED[@]/#/:!}"
git grep -n -E "from '\./index'|from '\.\./(reveal|image)'" -- src .storybook "${RETIRED[@]/#/:!}"
```

Expected: `23 retired files`, then exactly three lines from the first `git grep` and none from the second:
```
src/router.tsx:9:import {ImagePage} from './tools/image/ImagePage';
src/router.tsx:10:import {RevealPage} from './tools/reveal/RevealPage';
src/shell/AdminShell.test.tsx:5:import {ImagePage} from '../tools/image/ImagePage';
```
- The pattern matches a quoted module path in `import`, `vi.mock(…)` and `import(…)` alike, so a mocked or lazy import shows up too.
- **Any other line** means a task still renders an old component. Stop and report it. A studio module that imports a retired one would break at Step 5.

- [ ] **Step 2: Point the tests at Card studio, and watch them fail**

`src/router.test.tsx`. If R4-6a's draft left a block below worded differently, make the same change to what is there.

Below `renderAt` (`:9-11`), add `routerAt`, moved from inside `describe('calibration routes')`:
```tsx

/** Render the routes at `path` and hand back the router, so a test can read where it ended up. */
function routerAt(path: string) {
  const router = createMemoryRouter(routes, {initialEntries: [path]});
  render(<RouterProvider router={router} />);
  return router;
}
```
and delete its old copy inside `describe('calibration routes')` (`:215-220` on `main`):
```tsx
  /** Render the routes at `path` and hand back the router, so a test can read where it ended up. */
  function routerAt(path: string) {
    const router = createMemoryRouter(routes, {initialEntries: [path]});
    render(<RouterProvider router={router} />);
    return router;
  }

```

Below `BRANCH_NOTICE` (`:17`), add:
```tsx

/**
 * A write page's frame (R1-7), whether the gate or the tool fills its body: one
 * main landmark, one h1 named `title`, and the branch notice naming master.
 */
function expectWritePage(title: string) {
  expect(screen.getAllByRole('main')).toHaveLength(1);
  expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1);
  expect(screen.getByRole('heading', {level: 1, name: title})).toBeInTheDocument();
  expect(screen.getByText(BRANCH_NOTICE)).toHaveTextContent(/writes to Doberjohn\/inkweave master/i);
}
```

`:43`, `:55-56` and `:67`: every `renderAt('/reveal')` becomes `renderAt('/studio')`, and in "marks only the current page's link" the first link is Card studio's. After:
```tsx
  it('marks Overview current on / only', () => {
    // NavLink treats to="/" as exact, so the sidebar needs no `end` prop.
    renderAt('/studio');
    expect(sidebarNav().getByRole('link', {name: 'Overview'})).not.toHaveAttribute('aria-current');
  });
```
```tsx
  it("marks only the current page's link", () => {
    renderAt('/studio');
    expect(sidebarNav().getByRole('link', {name: 'Card studio'})).toHaveAttribute('aria-current', 'page');
    expect(sidebarNav().getByRole('link', {name: 'Calibration & tuning'})).not.toHaveAttribute('aria-current');
  });
```
```tsx
  it('names a rehearsal branch when one is set', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    renderAt('/studio');
    expect(screen.getByText('admin-verify')).toBeInTheDocument();
  });
```

`WRITE_PAGES` and its three cases (`:101-138` on `main`, with R4-6a's `/studio` row). After:
```tsx
  const WRITE_PAGES: Array<[path: string, title: string]> = [
    // The token gate fills the whole body (R4).
    ['/studio', 'Card studio'],
    // The gate fills the tuning aside; the analytics beside it need no token.
    ['/calibration', 'Calibration & tuning'],
  ];

  // The gate renders under the page's own title, so its heading is an h2 (R1-7).
  it.each(WRITE_PAGES)('asks for a GitHub token on %s, under the page title', (path, title) => {
    renderAt(path);
    expectWritePage(title);
    expect(screen.getByRole('heading', {level: 2, name: 'GitHub token'})).toBeInTheDocument();
    expect(screen.getByLabelText('GitHub token')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Save token'})).toBeInTheDocument();
  });

  // The sidebar's Forget token works on every write page (README section 1), and the
  // shared token state carries it to the page. /calibration's aside offers its own only
  // when GitHub rejects the token (R-26).
  it.each(WRITE_PAGES)("returns %s to the token gate from the sidebar's Forget token", async (path, title) => {
    const user = userEvent.setup();
    const saved = renderHook(() => useGithubToken());
    act(() => saved.result.current.setToken('tok'));
    renderAt(path);
    expect(screen.queryByRole('button', {name: 'Save token'})).not.toBeInTheDocument();
    // The page itself leaves Forget token to the sidebar.
    expect(within(screen.getByRole('main')).queryByRole('button', {name: 'Forget token'})).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'Forget token'}));
    expect(screen.getByRole('heading', {level: 1, name: title})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Save token'})).toBeInTheDocument();
  });

  // One main landmark and one h1 per page, whether the gate or the tool fills the
  // body. The pages used to bring their own <main>.
  it.each(WRITE_PAGES)('keeps %s in one main landmark under one h1, before and after a token is saved', (path, title) => {
    const saved = renderHook(() => useGithubToken());
    renderAt(path);
    expectWritePage(title);

    act(() => saved.result.current.setToken('tok'));
    expectWritePage(title);
  });
```
The sidebar is an `<aside>` outside `PageLayout`'s `<main>`, so `within(main)` sees only the page.

R4-6a's case on a studio deep link checks the "Reveal publisher" link, which goes. After:
```tsx
  it('opens Card studio on any mode and card, current in the sidebar while Overview is not', () => {
    renderAt('/studio?mode=edit&card=1001');
    expect(screen.getByRole('heading', {level: 1, name: 'Card studio'})).toBeInTheDocument();
    expect(sidebarNav().getByRole('link', {name: 'Card studio'})).toHaveAttribute('aria-current', 'page');
    expect(sidebarNav().getByRole('link', {name: 'Overview'})).not.toHaveAttribute('aria-current');
  });
```
If R4-6a's draft has no such case, add none: Step 2's redirect cases and the Sidebar test cover the link.

Between `describe('admin routes')` and `describe('the Overview nav item')`, add:
```tsx
describe('Card studio routes', () => {
  // Card studio replaced the two write tools at /reveal and /image (R4). Their
  // old paths land in the mode that replaced each (R-10).
  it.each([
    {path: '/reveal', mode: 'New reveal', search: ''},
    {path: '/image', mode: 'Edit card', search: '?mode=edit'},
  ])('redirects the retired $path to Card studio in $mode', async ({path, search}) => {
    const router = routerAt(path);
    await waitFor(() => expect(router.state.location.pathname).toBe('/studio'));
    expect(router.state.location.search).toBe(search);
    // Replaced, not pushed: Back doesn't land on the redirect again.
    expect(router.state.historyAction).toBe('REPLACE');
    expect(screen.getByRole('heading', {level: 1, name: 'Card studio'})).toBeInTheDocument();
    // A redirect is no one's action, so focus stays where it was (R-48).
    expect(document.body).toHaveFocus();
  });
});

```
The file's top-level `beforeEach` keeps every fetch pending, so the studio shows its gate and reads nothing.

`src/shell/nav.test.ts`. Replace the `navItemFor` and `isWritePath` blocks (`:3-27` on `main`, with R4-6a's `/studio` rows) with:
```ts
describe('navItemFor', () => {
  it.each([
    ['/studio', 'studio'],
    ['/studio/', 'studio'],
    ['/calibration/anything', 'calibration'],
    ['/cards/2983', 'cards'],
  ])('gives %s to the %s item', (pathname, id) => {
    expect(navItemFor(pathname)?.id).toBe(id);
  });

  it.each(['/studios', '/no-such-page'])('gives %s to no item', (pathname) => {
    expect(navItemFor(pathname)).toBeUndefined();
  });
});

describe('isWritePath', () => {
  it.each(['/calibration', '/studio', '/studio/'])('%s writes to the app', (pathname) => {
    expect(isWritePath(pathname)).toBe(true);
  });

  // /tuning, /reveal and /image are redirects now, and a redirect writes nothing.
  it.each(['/tuning', '/reveal', '/image', '/cards/2983', '/no-such-page'])('%s writes nothing', (pathname) => {
    expect(isWritePath(pathname)).toBe(false);
  });
});
```
Replace R4-6a's `describe('the Card studio item', …)` block, or add it after `describe('the Calibration & tuning item', …)` if R4-6a has none, with:
```ts
describe('the Card studio item', () => {
  it('is the one Publish item, in place of the two old write tools (R4)', () => {
    expect(NAV_ITEMS.filter((item) => item.group === 'publish')).toEqual([
      {id: 'studio', label: 'Card studio', mark: 'Cs', path: '/studio', group: 'publish', writes: true},
    ]);
  });
});
```

`src/shell/Sidebar.test.tsx`, `:29-42` (`:33` as R4-6a left it). After:
```tsx
  it('lists the pages under their group labels', () => {
    renderSidebar();
    expect(screen.getByText('Insights')).toBeInTheDocument();
    expect(hrefs('Insights')).toEqual(['/calibration', '/activity', '/web', '/cards']);
    expect(hrefs('Publish')).toEqual(['/studio']);
    // The mark is aria-hidden: the exact name proves it stays out of the link's name.
    expect(nav().getByRole('link', {name: 'Card studio'})).toHaveAttribute('href', '/studio');
  });

  it('marks the current page', () => {
    renderSidebar({path: '/studio'});
    expect(nav().getByRole('link', {name: 'Card studio'})).toHaveAttribute('aria-current', 'page');
    expect(nav().getByRole('link', {name: 'Calibration & tuning'})).not.toHaveAttribute('aria-current');
  });
```
Then:
- `:46` and `:81`: `renderSidebar({path: '/image', …})` and `renderSidebar({path: '/reveal', …})` become `renderSidebar({path: '/studio', tokenSaved: true, onForgetToken});`.
- `:53`: `['a page that writes, with no token saved', '/image', false],` becomes `['a page that writes, with no token saved', '/studio', false],`.
- `:70-72`. Before:
  ```tsx
      const link = nav().getByRole('link', {name: 'Reveal publisher'});
      expect(link).toHaveTextContent(/^Re$/);
      expect(link).toHaveAttribute('title', 'Reveal publisher');
  ```
  After:
  ```tsx
      const link = nav().getByRole('link', {name: 'Card studio'});
      expect(link).toHaveTextContent(/^Cs$/);
      expect(link).toHaveAttribute('title', 'Card studio');
  ```

`src/shell/AdminShell.test.tsx`. `:5`, `import {ImagePage} from '../tools/image/ImagePage';`, becomes:
```tsx
import {StudioPage} from '../tools/studio/StudioPage';
```
`:29`, `{path: 'image', element: <ImagePage />},`, becomes:
```tsx
        {path: 'studio', element: <StudioPage />},
```
`:50`, `renderShellAt('/image');`, becomes `renderShellAt('/studio');`. The bridge mock (`:10-13`) and the pending fetch (`:39`) stay. With the token saved (`:40`), the workspace's `previewCards.json` read never settles, which the test doesn't need.
- **The mock's card list** has only `cards` and `getCardById`. The studio's controllers read `isLoading`, `error` and `retryLoad` too, and an absent value reads as loaded with no error, which is what the test wants. The sandbox ran this file against R4-6a's page with a stand-in Edit controller, not R4-4b's real one. If the case fails on a missing field, add `isLoading: false, error: null, retryLoad: () => {}` to the mock's object, and say so at review.

`src/tools/analytics/cards/__tests__/CardAnalyticsPage.test.tsx`. The stand-in renders the header's actions. `:42-44`, before:
```tsx
// R3-6's view has its own tests. This stand-in keeps what the page relies on:
// the card header's h2 takes the page's handoff (R-48), a count that only a
// remount resets (R-46), and a partner link. It records the props it gets.
```
After:
```tsx
// R3-6's view has its own tests. This stand-in keeps what the page relies on:
// the card header's h2 takes the page's handoff (R-48), a count that only a
// remount resets (R-46), a partner link, and the header's actions (R-82). It
// records the props it gets.
```
`:61-62`, before:
```tsx
        <Link to="/cards/2984">Partner</Link>
      </section>
```
After:
```tsx
        <Link to="/cards/2984">Partner</Link>
        {props.headerActions}
      </section>
```
In `describe('CardAnalyticsPage: a card')`, before `it('says no card has an unknown id, and forgets it (R-29)', …)` (`:279`), add:
```tsx
  it('links the card to Edit card in Card studio (R-82)', () => {
    renderPage('/cards/2983');
    expect(screen.getByRole('link', {name: 'Edit in Card studio'})).toHaveAttribute(
      'href',
      '/studio?mode=edit&card=2983',
    );
  });

```

Run:
```bash
pnpm vitest run --project app src/router.test.tsx src/shell/nav.test.ts src/shell/Sidebar.test.tsx src/shell/AdminShell.test.tsx src/tools/analytics/cards/__tests__/CardAnalyticsPage.test.tsx
```

Expected: `Test Files  4 failed | 1 passed (5)` and `Tests  7 failed | 108 passed (115)` with R4-6a's tests as drafted, every other case passing (`AdminShell.test.tsx` passes: R4-6a's page is already at `/studio`). The seven:
- `router.test.tsx` › Card studio routes › "redirects the retired /reveal to Card studio in New reveal": `AssertionError: expected '/reveal' to be '/studio'`, after `waitFor`'s second.
- The same for `/image`: `expected '/image' to be '/studio'`.
- `nav.test.ts` › the Card studio item › "is the one Publish item …": `expected [ { id: 'studio', …(5) }, …(2) ] to deeply equal [ { id: 'studio', …(5) } ]`.
- `nav.test.ts` › isWritePath › "/reveal writes nothing" and "/image writes nothing": `expected true to be false`.
- `Sidebar.test.tsx` › "lists the pages under their group labels": `expected [ '/studio', '/reveal', '/image' ] to deeply equal [ '/studio' ]`.
- `CardAnalyticsPage.test.tsx` › "links the card to Edit card in Card studio (R-82)": `Unable to find an accessible element with the role "link" and name "Edit in Card studio"`.

- [ ] **Step 3: Redirect the old paths, and drop their nav items**

`src/router.tsx`. The whole file, after:
```tsx
import {createBrowserRouter, Navigate, type RouteObject} from 'react-router-dom';
import {AdminShell} from './shell/AdminShell';
import {studioHref} from './shell/nav';
import {NotFound} from './shell/NotFound';
import {ActivityPage} from './tools/analytics/activity/ActivityPage';
import {CalibrationPage} from './tools/analytics/calibration/CalibrationPage';
import {CardAnalyticsPage} from './tools/analytics/cards/CardAnalyticsPage';
import {OverviewPage} from './tools/analytics/overview/OverviewPage';
import {WebAnalyticsPage} from './tools/analytics/web/WebAnalyticsPage';
import {StudioPage} from './tools/studio/StudioPage';

/** Admin's routes. Every one renders inside AdminShell, whose sidebar links them (src/shell/nav.ts). */
export const routes: RouteObject[] = [
  {
    element: <AdminShell />,
    children: [
      {index: true, element: <OverviewPage />},
      {path: 'activity', element: <ActivityPage />},
      {path: 'web', element: <WebAnalyticsPage />},
      {path: 'calibration', element: <CalibrationPage />},
      // One element for every card: bare /cards opens the last card viewed, or the "Pick a card" prompt.
      {path: 'cards/:cardId?', element: <CardAnalyticsPage />},
      // The old analytics page split into the insights pages; a bookmark lands on the Overview (R-10).
      {path: 'analytics', element: <Navigate to="/" replace />},
      // New reveal and Edit card (R4); ?mode= and ?card= pick the mode and the card (studioHref).
      {path: 'studio', element: <StudioPage />},
      // Card studio replaced the two write tools at /reveal and /image (R4). Old links, from
      // bookmarks and the runbooks, land in the mode that replaced each (R-10).
      {path: 'reveal', element: <Navigate to={studioHref('new')} replace />},
      {path: 'image', element: <Navigate to={studioHref('edit')} replace />},
      // The tuning editor moved into /calibration's aside (R-10).
      {path: 'tuning', element: <Navigate to="/calibration" replace />},
      {path: '*', element: <NotFound />},
    ],
  },
];

export const router = createBrowserRouter(routes);
```
The `studio` route and its comment are R4-6a's, kept as they are. If R4-6a worded that comment differently, keep its wording.

`src/shell/nav.ts`. R4-6a's comment and studio item, then the two old items (`:27-30` after R4-6a). Before:
```ts
  // New reveal and Edit card in one page (R4). It replaces the two items below, which R4-6c removes.
  {id: 'studio', label: 'Card studio', mark: 'Cs', path: '/studio', group: 'publish', writes: true},
  {id: 'reveal', label: 'Reveal publisher', mark: 'Re', path: '/reveal', group: 'publish', writes: true},
  {id: 'image', label: 'Card images', mark: 'Im', path: '/image', group: 'publish', writes: true},
];
```
After:
```ts
  // New reveal and Edit card on one page (R4), in place of the write tools at /reveal and /image,
  // which now redirect here (R-10). Both modes commit to the app repo, so the page writes (R-4).
  {id: 'studio', label: 'Card studio', mark: 'Cs', path: '/studio', group: 'publish', writes: true},
];
```
If R4-6a's comment reads differently, replace whatever comment sits above the studio item.

`navItemFor`'s doc comment (`:31-35` on `main`). Before:
```ts
/**
 * The item whose page `pathname` is: its own path or a path under it. So
 * /reveal/ and /reveal/x belong to the reveal item, /revealed to none, and an
 * item at / owns / alone.
 */
```
After:
```ts
/**
 * The item whose page `pathname` is: its own path or a path under it. So
 * /studio/ and /studio/x belong to Card studio, /studios to none, and an
 * item at / owns / alone.
 */
```
R4-5a's `studioHref` doc comment already names "the old /reveal and /image redirects", which is now true.

The two shell stories, which no test covers:
- `src/shell/Sidebar.stories.tsx:32`: `parameters: {route: '/reveal'},` becomes `parameters: {route: '/studio'},`. `WritePageWithToken` then shows the token box on the one Publish item.
- `src/shell/PageLayout.stories.tsx:42`: `args: {title: 'Card images', writes: true},` becomes `args: {title: 'Card studio', writes: true},`.

Run Step 2's command. Expected: `Tests  1 failed | 108 passed (109)`, the R-82 case only, with the same message. Every redirect, nav and Sidebar case passes. The total drops by 6: the two old items leave `router.test.tsx`'s three `NAV_ITEMS`-driven cases.

- [ ] **Step 4: Add "Edit in Card studio" to the card page (R-82)**

`src/tools/analytics/cards/CardPageBody.tsx`. The imports. `:6`, before:
```tsx
import {cardsHref} from '../../../shell/nav';
```
After:
```tsx
import {cardsHref, studioHref} from '../../../shell/nav';
```
After `:13` (`import {MIN_RULE_VOTES} from '../overview/overviewStats';`), add:
```tsx
import {PanelLink} from '../overview/PanelLink';
```

The doc comment (`:155-160`). Before:
```tsx
/**
 * The Card analytics body, one state at a time (cardPageState). The card's
 * view is keyed by its id (R-46): one route element serves every card, so
 * without the key a frame's Table view, the pair list's scroll and the
 * network's hover would carry over to the next card.
 */
```
After:
```tsx
/**
 * The Card analytics body, one state at a time (cardPageState). The card's
 * view is keyed by its id (R-46): one route element serves every card, so
 * without the key a frame's Table view, the pair list's scroll and the
 * network's hover would carry over to the next card. Its header links the card
 * to Card studio's Edit card (R-82).
 */
```

The `'card'` case (`:176-177`). Before:
```tsx
    case 'card':
      return <CardAnalyticsView key={state.card.id} card={state.card} handoff={handoff} {...data} />;
```
After:
```tsx
    case 'card':
      return (
        <CardAnalyticsView
          key={state.card.id}
          card={state.card}
          handoff={handoff}
          headerActions={<PanelLink to={studioHref('edit', state.card.id)}>Edit in Card studio</PanelLink>}
          {...data}
        />
      );
```
- **A router `Link`, never a `CtaButton`:** navigation is always a Link (global constraints).
- **`PanelLink`'s look:** the accent colour, `ADMIN_TYPE.small` and no underline. Its name is its text, and it keeps the app's global focus ring.
- **The header** wraps (`CardHeader.tsx:13`), so the link's `nowrap` never forces a horizontal scroll at phone width.

`src/tools/analytics/cards/CardAnalyticsView.tsx:27`. Before:
```tsx
  /** R4's "Edit in Card studio", at the right of the card header. R3 passes none. */
```
After:
```tsx
  /** At the right of the card header: the page's "Edit in Card studio" link (R-82). */
```

`src/tools/analytics/cards/CardAnalyticsView.stories.tsx`. The imports (`:3`). Before:
```tsx
import {CtaButton} from '../../../app-bridge';
import {PageLayout} from '../../../shell/PageLayout';
import {DataAsOf} from '../../../ui/DataAsOf';
import {CardAnalyticsView} from './CardAnalyticsView';
```
After:
```tsx
import {studioHref} from '../../../shell/nav';
import {PageLayout} from '../../../shell/PageLayout';
import {DataAsOf} from '../../../ui/DataAsOf';
import {PanelLink} from '../overview/PanelLink';
import {CardAnalyticsView} from './CardAnalyticsView';
```
The story (`:75-84`). Before:
```tsx
/** R4's slot: "Edit in Card studio" at the right of the card header. */
export const HeaderActions: Story = {
  args: {
    headerActions: (
      <CtaButton type="button" variant="neutral">
        Edit in Card studio
      </CtaButton>
    ),
  },
};
```
After:
```tsx
/** "Edit in Card studio" at the right of the card header, the router link the page passes (R-82). */
export const HeaderActions: Story = {
  args: {headerActions: <PanelLink to={studioHref('edit', MAUI_CARD.id)}>Edit in Card studio</PanelLink>},
};
```
The meta's decorator already wraps every story in a `MemoryRouter` (`:34-45`), so the link renders. `CtaButton` has no other use in the file.

Run Step 2's command. Expected: `Test Files  5 passed (5)` and `Tests  109 passed (109)`.

- [ ] **Step 5: Delete the retired files**

```bash
git rm src/tools/reveal/RevealPage.tsx src/tools/reveal/index.ts src/tools/reveal/components/{RevealAdminForm,CardPreviewPanel}{.tsx,.stories.tsx} src/tools/reveal/__tests__/{RevealAdminForm,RevealAdminFormCardText,CardPreviewPanel}.test.tsx src/tools/image/{ImagePage.tsx,useImageAdmin.ts,index.ts} src/tools/image/components/{CardImagePicker,ImageComparePanel,UploadColumn}{.tsx,.stories.tsx} src/tools/image/__tests__/{useImageAdmin.test.ts,CardImagePicker.test.tsx} src/components/ImageUploadTile{.tsx,.stories.tsx} src/tools/__tests__/writePages.test.tsx
```

Expected: 23 `rm '…'` lines. `src/tools/image/components/` and `src/tools/__tests__/` are left empty, and git drops them.

Then run Step 1's import check with nothing left out:
```bash
git grep -n -E "['\"][^'\"]*/(RevealPage|ImagePage|useImageAdmin|RevealAdminForm|CardPreviewPanel|CardImagePicker|ImageComparePanel|UploadColumn|ImageUploadTile|tools/reveal|tools/image|reveal/index|image/index)['\"]" -- src .storybook
git grep -n -E "from '\./index'|from '\.\./(reveal|image)'" -- src .storybook
```
Expected: no output from either. Stories live under `src`, so they are covered, and Step 10's typecheck compiles them.

- [ ] **Step 6: Drop the reveal controller's `publishError`**

Its only reader was `RevealPage.tsx:44-46`, and New reveal shows `commitError` (re-base note 9). The blocks are R4-3b's. If one reads differently, make the same change to what is there.

`src/tools/reveal/useRevealAdmin.ts`, in `RevealAdminController`. Before:
```ts
  /** The last publish's failure alone, or null; a publish clears it as it starts. */
  commitError: string | null;
  /** commitError, else uploadError: the reveal publisher's one error line. */
  publishError: string | null;
```
After:
```ts
  /** The last publish's failure alone, or null; a publish clears it as it starts. */
  commitError: string | null;
```
In the hook's return. Before:
```ts
    commitError,
    // A file that can't be read is why Publish stays off; say so where errors show.
    publishError: commitError ?? upload.error,
    onImageChange: upload.choose,
```
After:
```ts
    commitError,
    onImageChange: upload.choose,
```

`src/tools/reveal/__tests__/useRevealAdmin.test.ts`, `describe('errors')` (R4-3b's). No case name mentions the field, so only expectations change:
- **"shows the validator's message for a name it refuses, from the choice on, and carries the failed bytes as uploadError".** Delete the line `        publishError: problem,` from its last `toMatchObject`. The case still checks `uploadError: problem` and `imageError: refused`.
- **"reports a failed commit as commitError alone, keeps the draft, and clears it when the next publish starts".** Delete `        publishError: 'master changed while publishing',` from the first `toMatchObject`. Its last line, before:
  ```ts
      expect(result.current).toMatchObject({commitError: null, publishError: null});
  ```
  After:
  ```ts
      expect(result.current).toMatchObject({commitError: null});
  ```

`src/tools/studio/studioFixtures.ts` (R4-6a's reveal controller builder). Delete the line `    publishError: null,`.

`src/tools/studio/__tests__/NewRevealPane.test.tsx` (R4-6a's "shows a refused scan under the card panel, never as the outcome"). Before:
```tsx
    renderPane({ctrl: {imageName: 'mei.png', uploadError: 'Not a PNG', publishError: 'Not a PNG', validation}});
```
After:
```tsx
    renderPane({ctrl: {imageName: 'mei.png', uploadError: 'Not a PNG', validation}});
```
The case still proves the pane shows the upload error under the card panel and never in the aside, where the commit's outcome sits.

Then:
```bash
rg -n "publishError" src/tools/reveal src/tools/studio
```
Expected: no output. `TuningAside.tsx` has its own, unrelated `publishError` prop, outside these folders. Any other site fails Step 10's typecheck as an unknown or missing property.

- [ ] **Step 7: Drop the bridge names that lost their last importer**

R1-12's rule, which R2-7 applied too:
```bash
node -e "const s=require('fs').readFileSync('src/app-bridge.ts','utf8');for(const m of s.matchAll(/export\s*\{([^}]*)\}/g))for(const p of m[1].split(','))if(p.trim())console.log(p.trim().replace(/^type\s+/,'').split(/\s+as\s+/).pop())" | while read -r name; do git grep -qw "$name" -- src .storybook scripts ':!src/app-bridge.ts' || echo "unused: $name"; done
```
The `replace` strips a `type ` modifier (`type UseAutocompleteReturn`, `type StrengthTierLabel`), so a type is looked up by its bare name: a file that imports it with `import type {…}` still counts.

Expected: exactly two lines:
```
unused: EMPTY_BOX
unused: GOLD_GLOW
```
- **Why:** `CardPreviewPanel.tsx:6-7` and `ImageUploadTile.tsx:1` were their last importers, and Step 5 deleted both. R4-5d's card panel doesn't use them.
- **`CardTile`, `CardTranslationPanel` or `InkwellIcon` printed:** R4-5c or R4-5d hasn't landed (their panels use them). Stop.
- **Any other name printed:** an R4 task dropped its last other user. Remove it from its `export {…}` list too, and say so at review.

`src/app-bridge.ts`, the `shared/constants` re-export (`:17-23`). Before:
```ts
  EASING,
  EMPTY_BOX,
  FONTS,
  FONT_SIZES,
  GOLD_GLOW,
  INK_COLORS,
```
After:
```ts
  EASING,
  FONTS,
  FONT_SIZES,
  INK_COLORS,
```
Re-run the check. Expected: no output.

The bridge is loaded by reveal-sync (`web.mjs:47`), so run:
```bash
pnpm vitest run --project scripts scripts/reveal-sync/web.test.mjs
```
Expected: `Tests  2 passed (2)`. No reveal-sync contract file changed, so the rest of `scripts/reveal-sync` doesn't need a run.

- [ ] **Step 8: Check that no old route is left**

Two checks: `router.tsx` writes its paths with no leading slash, so one pattern can't find both kinds.

```bash
rg -n "['\"\`]/(reveal|image)\b" src
rg -n "path: '(reveal|image)'" src
```

Expected, the first command, exactly three lines:
```
src/router.test.tsx:…:    {path: '/reveal', mode: 'New reveal', search: ''},
src/router.test.tsx:…:    {path: '/image', mode: 'Edit card', search: '?mode=edit'},
src/shell/nav.test.ts:…:  it.each(['/tuning', '/reveal', '/image', '/cards/2983', '/no-such-page'])('%s writes nothing', (pathname) => {
```
The second command, exactly two lines:
```
src/router.tsx:…:      {path: 'reveal', element: <Navigate to={studioHref('new')} replace />},
src/router.tsx:…:      {path: 'image', element: <Navigate to={studioHref('edit')} replace />},
```
- **What doesn't match:** `router.test.tsx`'s `'/admin/reveal'` (a quote then `/admin`), and comments that name `/reveal` and `/image` unquoted (`router.tsx`, `nav.ts`, `router.test.tsx`).
- **Any other line is a leftover.** Point a link at `studioHref(…)` from `src/shell/nav.ts`, a test at `/studio`.
- On Windows `rg` may print `src\…` paths.

- [ ] **Step 9: Sweep the retired names and the notes left for this task**

R2-7's rule applies: a comment may record where code came from, in the past tense ("ported from …", "copied from …"), but it may not speak of a retired file as live. A `file:line` citation of a deleted file is a dead pointer, so it goes.

```bash
git grep -n -w -E "RevealPage|ImagePage|useImageAdmin|ImageAdminController|RevealAdminForm|CardPreviewPanel|CardImagePicker|ImageComparePanel|UploadColumn|ImageUploadTile|writePages|EMPTY_BOX|GOLD_GLOW|enchantedSymbol|epicSymbol|iconicSymbol|PRINTING_SYMBOLS" -- src .storybook
git grep -n "R4-6c" -- src
git grep -n -i -E "today's reveal publisher|reveal publisher (is|shows)|image tool (is|shows)|shows it (today|bare)" -- src
git grep -n "title: '" -- 'src/**/*.stories.tsx' | grep -E "'(Reveal Admin|ImageAdmin)/"
```

**Expected from the first command: only past-tense provenance.** Each of these, from the drafts as of 2026-10-07, may stay:
- `StudioForm.test.tsx`'s `describe('StudioForm, ported from RevealAdminForm', …)` (R4-5b);
- `EditSearch.test.tsx`'s "narrows the list as you search (ported from CardImagePicker)" (R4-5f);
- the `useCardEditor` tests' "(useImageAdmin.test.ts’s cases)" (R4-4b);
- `components/Field.tsx`'s "RevealAdminForm's Field on admin's tokens" (R4-5b), which records the port;
- once reworded below, `StudioPage.test.tsx`'s "writePages.test.tsx's three cases, ported …" (R4-6a).

**Reword these** (the drafts' wording; if a later draft has none of them, skip it). Each is a comment, so no test or type changes:
- **`src/tools/studio/cardPanel.ts` (R4-5d)**, `IMAGE_FORMATS`' doc comment. Before:
  ```ts
  /** The accepted formats, under the controls (R-89), as the image tool named them (UploadColumn.tsx:34). */
  ```
  After:
  ```ts
  /** The accepted formats, under the controls (R-89), as the image tool named them. */
  ```
  The citation is a dead pointer.
- **`src/tools/studio/studioCopy.ts` (R4-6b's `editNote`)**, only if the first command prints it: its comment's `(ImagePage.tsx:20)` citation goes, the rest stays. (An earlier R4-6b draft put Edit's note in an `editCopy.ts`; if that file exists, the same applies there.)
- **`src/tools/studio/NewRevealPane.tsx` (R4-6a)**, the first sentence of `NewRevealPane`'s doc comment. Before:
  ```ts
   * New reveal (R-2): today's reveal publisher in the studio's layout. The card
  ```
  After:
  ```ts
   * New reveal (R-2), in the studio's layout. The card
  ```
  After this task, "today's" is untrue. The rest of the comment already says what the pane does.
- **`src/tools/studio/readiness.ts` (R4-3a)**, the last line of `imageError`'s doc comment. Before:
  ```ts
   * to end in .png"), as the reveal publisher shows it today.
  ```
  After:
  ```ts
   * to end in .png").
  ```
  The clause is untrue once the old page goes, and the reason before it stands alone.
- **`R4-6c` notes** (the second command), each reworded to the past or dropped:
  - `nav.ts`'s is gone with Step 3's comment.
  - `StudioPage.test.tsx`'s (R4-6a). Before:
    ```tsx
    // writePages.test.tsx's three cases, through a data router (R4-6c deletes that file with the old pages).
    ```
    After:
    ```tsx
    // writePages.test.tsx's three cases, ported through a data router when that file went with the old pages (R4-6c).
    ```
  - `src/tools/reveal/components/SynergyPreviewPanel.tsx`'s doc comment (R4-5e). Before:
    ```tsx
    /**
     * The engine's synergy groups for a card being written: each group's name and
     * how many cards it pairs with. Card studio's SynergyPanel frames it (R-90);
     * the reveal publisher shows it bare until R4-6c retires that page.
     */
    ```
    After:
    ```tsx
    /**
     * The engine's synergy groups for a card being written: each group's name and
     * how many cards it pairs with. Card studio's SynergyPanel frames it (R-90).
     */
    ```

**The panel's story (R4-5e's hand-off).** The fourth command prints one line, `src/tools/reveal/components/SynergyPreviewPanel.stories.tsx:11:  title: 'Reveal Admin/SynergyPreviewPanel',`: the other `Reveal Admin/` and `ImageAdmin/` stories went in Step 5. Before:
```tsx
  title: 'Reveal Admin/SynergyPreviewPanel',
```
After:
```tsx
  title: 'Admin/Publish/Card studio/Synergy rows',
```
The rows bare, as R4-5e's `SynergyPanel` frames them in `…/Aside`. Re-run the fourth command: it prints nothing.

**Must print nothing**, after the rewording:
- the third command (live claims about the old tool);
- from the first command, the webp names and `PRINTING_SYMBOLS`: R4-5h removed them (its hand-off asks this sweep to check);
- from the first command, `EMPTY_BOX` and `GOLD_GLOW` (Step 7);
- from the second command, anything but `StudioPage.test.tsx`'s reworded line, which records when the port happened.

"Reveal publisher", "Card images" and "image tool" as history stay R4-7's: its sweep decides them against the built code. This task writes none in its own comments.

- [ ] **Step 10: Run the targeted tests, lint and typecheck**

```bash
pnpm vitest run --project app src/router.test.tsx src/shell src/tools/analytics/cards src/tools/reveal src/tools/image src/tools/studio src/components
```
Expected: every file passes.
- **The folders,** not single files: the deletions touched each of them, and `src/tools/studio` holds the ported tests Step 1 found, plus `NewRevealPane.test.tsx` and `StudioPage.test.tsx`.
- **A `Failed to resolve import`** names a module that still imports a deleted file. Step 1 should have caught it, so point it at its R4 replacement and report it.

Lint the changed files, Step 9's included (add `src/tools/studio/studioCopy.ts` if Step 9 changed it):
```bash
pnpm exec eslint --max-warnings 0 src/router.tsx src/router.test.tsx src/shell/nav.ts src/shell/nav.test.ts src/shell/Sidebar.test.tsx src/shell/Sidebar.stories.tsx src/shell/AdminShell.test.tsx src/shell/PageLayout.stories.tsx src/tools/analytics/cards/CardPageBody.tsx src/tools/analytics/cards/CardAnalyticsView.tsx src/tools/analytics/cards/CardAnalyticsView.stories.tsx src/tools/analytics/cards/__tests__/CardAnalyticsPage.test.tsx src/app-bridge.ts src/tools/reveal/useRevealAdmin.ts src/tools/reveal/__tests__/useRevealAdmin.test.ts src/tools/reveal/components/SynergyPreviewPanel.tsx src/tools/reveal/components/SynergyPreviewPanel.stories.tsx src/tools/studio/studioFixtures.ts src/tools/studio/__tests__/NewRevealPane.test.tsx src/tools/studio/__tests__/StudioPage.test.tsx src/tools/studio/cardPanel.ts src/tools/studio/NewRevealPane.tsx src/tools/studio/readiness.ts
```
Expected: no output.

```bash
pnpm typecheck
```
Expected: exit 0. It compiles the stories and tests too, so a story or test that still names a deleted module, `publishError`, `EMPTY_BOX` or `GOLD_GLOW` fails here.

The pre-commit hook runs the full lint and `test:run`. Against the hook's run on R4-6b's commit, the suite should have 6 fewer test files and 29 fewer tests:
- 20 go with the deleted files: `writePages` 6, `useImageAdmin` 5, `RevealAdminForm` 4 (R4-3a's French case included), `RevealAdminFormCardText` 2, `CardImagePicker` 2, `CardPreviewPanel` 1.
- `router.test.tsx` loses 10. The two old `WRITE_PAGES` rows drop out of its three cases (6), and the two old nav items out of its three `NAV_ITEMS`-driven cases (6). The two redirects add 2.
- `CardAnalyticsPage.test.tsx` gains 1. `nav.test.ts` stays the same.

These counts hold if R4-6a left `router.test.tsx` and `nav.test.ts` as its draft has them.

- [ ] **Step 11: Code Health**

Run CodeScene's `code_health_review` on:
- the source files: `src/shell/nav.ts`, `src/tools/analytics/cards/CardPageBody.tsx`, `CardAnalyticsView.tsx`, `CardAnalyticsView.stories.tsx`, `src/tools/reveal/useRevealAdmin.ts` and `src/tools/studio/studioFixtures.ts`, plus each file Step 9 changed (`cardPanel.ts`, `NewRevealPane.tsx`, `readiness.ts`, `SynergyPreviewPanel.tsx` and its story, and `studioCopy.ts` if touched). Step 9 changed only comments and a story title in those, so each keeps the score its own task recorded;
- the tests: `src/router.test.tsx`, `src/shell/nav.test.ts`, `Sidebar.test.tsx`, `AdminShell.test.tsx`, `CardAnalyticsPage.test.tsx`, `useRevealAdmin.test.ts` and `NewRevealPane.test.tsx`.

`router.tsx` and `app-bridge.ts` hold no functions and get no score.

Expected: 10.0 each, with no findings. MCP 1.5.7 gave that in the sandbox.
- **The hand count** (re-base note 14): no new function in a source file. `nav.ts` stays at 6 of 6. `router.test.tsx`'s named helpers take 3 strings in 3, the shape R3's version passed the PR gate with.
- **The gate is stricter** than the local tool, so R4-8 runs `analyze_change_set` before the push.

- [ ] **Step 12: Commit**

After the owner approves, with the Bash tool. Step 5's `git rm` already staged the 23 deletions. Stage the changed files, Step 9's included, as its own call (add `src/tools/studio/studioCopy.ts` if Step 9 changed it, and drop a Step 9 file a later draft left nothing to reword in):
```bash
git add src/router.tsx src/router.test.tsx src/shell/nav.ts src/shell/nav.test.ts src/shell/Sidebar.test.tsx src/shell/Sidebar.stories.tsx src/shell/AdminShell.test.tsx src/shell/PageLayout.stories.tsx src/tools/analytics/cards/CardPageBody.tsx src/tools/analytics/cards/CardAnalyticsView.tsx src/tools/analytics/cards/CardAnalyticsView.stories.tsx src/tools/analytics/cards/__tests__/CardAnalyticsPage.test.tsx src/app-bridge.ts src/tools/reveal/useRevealAdmin.ts src/tools/reveal/__tests__/useRevealAdmin.test.ts src/tools/reveal/components/SynergyPreviewPanel.tsx src/tools/reveal/components/SynergyPreviewPanel.stories.tsx src/tools/studio/studioFixtures.ts src/tools/studio/__tests__/NewRevealPane.test.tsx src/tools/studio/__tests__/StudioPage.test.tsx src/tools/studio/cardPanel.ts src/tools/studio/NewRevealPane.tsx src/tools/studio/readiness.ts
```
Then `git status --short`: every line for this task's paths starts with `M ` or `D ` in the first column, and none is ` M` or `??`. Run CodeScene's `pre_commit_code_health_safeguard`, and go on only when it passes. Then, as its own unpiped call:
```bash
USER_APPROVED=1 git commit -m "feat(studio): redirect /reveal and /image to Card studio and retire the old tools (#24)"
```
Never pass `--no-verify`. The pre-commit hook runs the full lint and `test:run`. If Vitest fails to start its workers under load, stop this session's preview servers, wait out other sessions' runs, and retry.

### Hand-offs from R4-6c

- **The owner's rehearsal (R-86)** runs after this commit (header, Tasks). `/reveal` and `/image` now land in the studio, so the rehearsal can open either old URL to check the redirect.
- **R4-7 (docs).** This commit leaves these naming `/reveal` and `/image` as live tools, for R4-7 to rewrite from the built UI:
  - `CLAUDE.md:16`: the routes;
  - `CLAUDE.md:17`: "The reveal, image and tuning tools commit";
  - `CLAUDE.md:18`: "`/reveal` and `/image` don't yet (R4's studio adds it)";
  - `src/vite-env.d.ts:5`, `.env.example` and `docs/REVEAL_RUNBOOK.md`.

  Its stale-name sweep (Step 9 in its draft) will print more than its expected list, all of it correct as it stands after this task:
  - **Through its route alternation** (`[ (]/(reveal|image)\b`): the redirect history in `router.tsx` and `router.test.tsx` (which it allows for), and also in `nav.ts` (R4-5a's `studioHref` doc, "the old /reveal and /image redirects", and this task's comment over the studio item) and `nav.test.ts` (this task's "/tuning, /reveal and /image are redirects now").
  - **Through `image tool` and `reveal publisher`:** provenance kept by earlier tasks, such as R4-4c's save-test comments ("The image tool's …"), R4-5d's `cardPanel.ts` ("as the image tool named them"), R4-5e's aside story ("the image tool's note"), R4-5b's #635 fixture comment, and R4-6a's `StudioPage.tsx` doc ("replacing the reveal publisher and Card images").

  This task removes the two live claims (R4-3a's `readiness.ts` and R4-6a's `NewRevealPane.tsx`) and R4-5e's "until R4-6c retires that page", so none of those three is left for R4-7.
- **R4-8 ("R4 as built" and the close).**
  - **Record:**
    - `publishError` dropped (R4-3b's hand-off, re-base note 9);
    - `EMPTY_BOX` and `GOLD_GLOW` out of the bridge, so the main plan's bridge record (`R-redesign.md:671-675`) loses them;
    - the link is the Overview's `PanelLink` (R-82);
    - `writePages`' invariants now live in both `StudioPage.test.tsx` and `router.test.tsx`'s `WRITE_PAGES` cases.
  - **Look in Storybook** at:
    - `Admin/Insights/Card analytics/View` › `HeaderActions`: the gold link at the right of the card header, wrapping under the name at 375px;
    - `Admin/Sidebar` › `WritePageWithToken`: Card studio current, with the token box;
    - `Admin/PageLayout` › `Writes`;
    - `Admin/Publish/Card studio/Synergy rows` (retitled from `Reveal Admin/SynergyPreviewPanel`): `WithGroups` and `Empty`.
  - **Sweep.** Its sweep for deleted modules can reuse Step 9's first command.
- **The R4 header, at the plan commit.** Its "Deleted in R4-6c" list already names `publishError`, `EMPTY_BOX` and `GOLD_GLOW`, and its `WRITE_PAGES` line already keeps `/studio` and `/calibration`. Still to change:
  - **"Updated in R4-6c"** gains:
    - R4-6a's `StudioPage.test.tsx` comment;
    - `CardAnalyticsView.tsx`'s doc comment;
    - Step 9's rewordings: `cardPanel.ts` (R4-5d), `NewRevealPane.tsx` (R4-6a), `readiness.ts` (R4-3a), `SynergyPreviewPanel.tsx`'s doc (R4-5e), and `studioCopy.ts` (R4-6b) if it cited `ImagePage.tsx:20`;
    - `SynergyPreviewPanel.stories.tsx`'s title.
  - **Line references.** `WRITE_PAGES` is `:101-106` on `main` (it says `:100-105`), and `nav.test.ts` changes at `:5-6`, `:13`, `:19`, `:24` and in R4-6a's studio block (it lists `:5-6`, `:13`, `:19`).
- **R4-6a, if its draft still changes.**
  - **Comments.** This task rewrites its nav comment, its `StudioPage.test.tsx` comment and its `NewRevealPane.tsx` doc line. Wording that names no later task and no retired file as live would leave Step 9 nothing to do.
  - **Its router case.** Its "opens Card studio … while the old tools are not" case could check Overview from the start.
  - **`publishError`.** Its fixture line and its pane test's override are the two Step 6 removes. If its draft drops them first, Step 6 skips them.
- **R4-6b, while its draft is written.** Edit's note comment in `studioCopy.ts` can say "the image tool's sentence" without citing `ImagePage.tsx:20`, which this task deletes; then Step 9 has nothing to do there.
- **R4-3a and R4-5e, if their drafts still change.** `readiness.ts`'s "as the reveal publisher shows it today" and `SynergyPreviewPanel.tsx`'s "until R4-6c retires that page" are what Step 9 rewords; wording with no live claim and no forward reference would leave it nothing to do.

<!--
Re-base choices (R4-6c, 2026-10-07), where the brief, the header and the audit leave room:
- writePages' port: the header gives it to R4-6a (and R4-6a's draft as of 16:36 has it, StudioPage.test.tsx:153-183). The brief's "port its three cases through createMemoryRouter first" is honoured twice: Step 1 checks R4-6a's port before anything is deleted, and Step 2 folds the three invariants into router.test.tsx's WRITE_PAGES cases (real routes, real token store, both write pages) through expectWritePage, so they are not lost if R4-6a's port is later trimmed.
- publishError: dropped rather than kept. Keeping it would leave a field with no reader whose doc names the retired tool, which R4-7's stale-name sweep would then list. The ripple is four small edits, and typecheck catches any site missed. Verified on R4-6a's draft src.
- The link reuses PanelLink instead of a new Link with PanelLink's style constants: R-82 says "styled like PanelLink", and reuse adds no style.
- The redirect cases check focus on <body> (R-48) but not the mode switch's pressed state: that would tie router.test.tsx to R4-6a's control labels, which StudioPage.test.tsx already covers.
- Bridge: EMPTY_BOX and GOLD_GLOW, by R1-12's rule as R2-7 applied it to CAP_LABEL_XS. Checked on the repo with the 23 deletions left out (prints EMPTY_BOX, GOLD_GLOW, CardTile, CardTranslationPanel: the last two are R4-5d's) and on R4-6a's draft src (which still has stand-in panels, so it also prints CardTile, CardTranslationPanel and InkwellIcon).
- No comment written here names "reveal publisher", "Card images" or "image tool". The redirect comments do name /reveal and /image after a space, which R4-7's route alternation prints; the hand-off lists them as correct.
- Verifier's pass (2026-10-07, 18:00): the drafts had moved under this file. R4-3b renamed the errors case (no publishError in any name now), R4-6a's pane test is "shows a refused scan…" with 'mei.png'/'Not a PNG', R4-6b moved Edit's note from editCopy.ts into studioCopy.ts, and R4-5e left a forward reference ("until R4-6c retires that page") plus the story-title call. Steps 1, 6 and 9 and the file lists follow the drafts as they now stand; the kept list names R4-3a's emptyForm.ts, not revealForm.ts.
-->
