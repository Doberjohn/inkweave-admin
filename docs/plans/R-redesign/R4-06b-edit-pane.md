> Part of [R: Admin redesign](../R-redesign.md), phase R4 ([R4-card-studio.md](R4-card-studio.md)). Read the main plan's decisions (R-57 to R-91 for R4), corrections, global constraints and shared interfaces, then the R4 header, first.

> **Re-base notes (R4-6b, 2026-10-07).** Re-based from the outline's Task R4-6 (`R4-card-studio.md:812-951`, written 2026-10-01 against the planned R1 code): its Edit half, "Edit with no card", "Released cards", the Edit image errors, labels and notes, the unsaved guard's card change, and the test lines for `?mode=edit&card=`, an unknown id, the image note and "Loading another card over unsaved edits asks". Onto `main @ e5e5029` (R1 to R3 as built, plus the pin bump), pin `upstream/inkweave` @ `16283a13`, on `feature/24-redesign-r4` with R4-1a to R4-6a landed. It follows decisions R-57 to R-91 (R-58, R-59, R-61, R-66, R-71 and R-84 bear on it most) and the 2026-10-07 audit (`r4-audit-full.json`'s "R4-6" entry; `r4-audit-synth.md`'s "R4-6" summary and its split (b)). The audit cited pin `bc877e1`; this task reads no pinned app file, so no app fact needed re-checking. Sibling task files were read as they stood at 17:35: R4-4a to R4-4d, R4-5b, R4-5d, R4-5e, R4-5f, R4-5s, R4-6a and R4-6c, and the header as rewritten at 17:33. What changed and why:
> 1. **The split.** R4-6 is three tasks (audit). R4-6a built the page, the workspace, New reveal, the guard and the route. This one, R4-6b, fills Edit mode: the lookup switch, the URL-driven focus handoffs, the view keyed by card id, Edit's labels and notes, the 401 offers and R-66's reload after a New publish. R4-6c retires `/reveal` and `/image`. This task builds no component (R4-5b to R4-5f did) and no controller (R4-4a to R4-4d did): it wires them.
> 2. **What R4-6a left for it** (its hand-offs), each taken as given:
>    - `{mode === 'new' && <NewRevealPane … />}` becomes `mode === 'new' ? <NewRevealPane … /> : <EditPane … />`, and `EditPane` gets the workspace's `forgetToken`.
>    - `studioUnsavedMessage` already words both drafts, a card change ("Your changes to this card aren't saved yet. Leaving the card drops them.") and a save in flight. So the guard needs no code here, only the page tests R4-5s's and R4-6a's hand-offs ask for, which also kill R4-6a's one surviving mutant (`leaves` dropped).
>    - Edit's `saveLabel` and its note go in `studioCopy.ts`, beside `publishLabel`. There is no `editCopy.ts`: R4-6c's draft names one from an earlier draft of this task (see the hand-off to R4-6c).
>    - The tab title already reads `openCard(edit.lookup)`, and `scrollKey` is `studioHref(mode, card)`. Nothing to add.
> 3. **The lookup switch.** It follows the header's addition 11 as rewritten, R4-4b's names: `edit.lookup.kind` is `listFailed`, `none`, `loading`, `missing`, `fileFailed`, `gone` or `ready`; `tag`, `form` and `imageOnly` sit on the controller.
>    - **`ready`** opens the editor, keyed by the card's id (R-46): the Editing banner, then `StudioSlots` with the card panel, the form (or `ReleasedCardFacts` and its `IMAGE_ONLY_NOTES` line for an image-only card, R-61, R-65) and the aside.
>    - **`loading`** says "Loading the card…". A `?mode=edit&card=` link that lands before the card list does reads this, never missing (the header's review focus 3).
>    - **Every other kind is the search**, R4-5f's `EditSearch`, with its `notice` line saying why the URL's card isn't open:
>      - `missing`: R3's not-found sentence (`CardPageBody.tsx:171-174`), widened to the branch file, since R4-4d makes missing wait for it, plus "find it by name below";
>      - `fileFailed`: "Card {id} opens once previewCards.json can be read." The search shows the read's error and its way out beside the rows (R-71);
>      - `gone`: R4-4d's `goneNote(card)`;
>      - `listFailed` and `none`: no line. The failed card list's own error and Retry take the field's place (R4-5f).
>    - **One departure from R4-4d's hand-off.** It suggested showing a gone card's name and tag with `goneNote` and nothing else. Here `goneNote` sits above the search instead: the note itself says to find the card by name once inkweave.ink deploys the release, and the search is where that happens. Its line takes the URL-driven handoff, as a ready card's `h2` would.
> 4. **Focus (R-59, with R-48).** One handoff, `StudioPage`'s (R4-6a). Its takers never compete.
>    - **The URL's card, and the card list's Retry.** `StudioPage` swaps `useFocusHandoff()` for `useStudioHandoff()`: R3's `useCardHandoff` (`CardAnalyticsPage.tsx:16-50`), which asks during render from what it saw last, in the component that owns the handoff's state. Requesting from `EditPane`'s render instead would set `StudioPage`'s state while rendering another component, which React refuses. The URL and the card list (`useCardDataContext`) can both be read in `StudioPage`. Two changes from R3: the hook reads `?card=` (`studioCardOf`), and a move to no card asks too, since "Load a different card" unmounts with the card and the search field takes focus.
>    - **The file's Retry and Load it again.** Their reads resolve once the landing is on screen (R4-4a's `reload`, R4-4c's `retry` and `loadAgain`), so a private `askWhenLanded(read, handoff)` asks then, never on the click, as `TuningAside`'s `readAgainWith` does (`TuningAside.tsx:322-328`). A read that fails again asks for nothing. The search's "Read previewCards.json again" is `edit.retry`, not `previewFile.reload` as R4-5f's hand-off has it, because only `retry` returns the read's promise.
>    - **One controller line changes for it (verifier, 2026-10-07).** R4-4c's `retryReads` read the file only while its status was `error`, that is, while no read had ever landed. A read that fails after one landed (the read after a save, R-66's read after a publish, or a failed Load it again) leaves the status `ready` with R4-4a's `reloadError`. The search shows that error with "Read previewCards.json again", and the button then read nothing. Step 10 makes `retryReads` read whenever the search shows a file error (`previewFileView(file).error`, R4-4b's view), and a page test pins it.
>    - **Save** asks once its commit settles, landed or failed: `void edit.save().then(handoff.request)`, as R4-6a's Publish does.
>    - **The takers.**
>      - A new card: the banner's `h2`.
>      - "Load a different card", or the card list's Retry with no card: the search field.
>      - An unknown, waiting or gone card: the notice's `<p tabIndex={-1}>`, which sits before the field and so wins (R4-5f's note 19).
>      - A Save that settled, or a Load it again that landed: `CommitOutcome`'s first `tabIndex={-1}` element, which it takes only while it shows something (R4-5e). The banner gets the handoff only while the outcome shows nothing (`outcomeShowing`), so the two never both wait. That settles R4-5e's hand-off: after Load it again, focus goes to the line that says what it kept, not to the banner.
>    - **Discard and Revert image** move focus inside their own components (R4-5e, R4-5d). The page holds nothing for them.
> 5. **Keyed by card id (R-46).** `EditPane` keys its `CardEditor` by `lookup.card.id`, so a new card remounts the form (its open accordion section, its Dual-ink hold), the panel and the aside. `EditPane` itself is not keyed, so the search keeps its query across opening a card and coming back (R4-5f).
> 6. **The note is keyed on `result.withImage`** (R4-4c): the image tool's sentence, word for word (`ImagePage.tsx:20`), when an image went with the commit; else New reveal's `newRevealNote()`, since a fields commit deploys as a new card's does. `goLiveNote` words a rehearsal branch either way.
> 7. **The 401 offers (R-26, R-84).** Edit card offers Forget token in two places, and both take the workspace's `forgetToken`, which asks first through `window.confirm(forgetTokenQuestion(drafts))` while either draft is dirty (R4-6a, `TuningAside.tsx:130-136`):
>    - a read of `previewCards.json` GitHub refused, beside the search (`EditSearch`'s `file.onForgetToken`); this covers a `fileFailed` card too, whose view is the same search;
>    - a save GitHub refused (`CommitOutcome`'s `onForgetToken`, offered on `isRejectedToken`).
> 8. **R-66, the reload after a New publish.** `useReloadAfterPublish({published: ctrl.result, reload: edit.reloadFile})`, in the workspace. It is an effect keyed on the commit's link, because `publish()` resolves on a failure too (R4-6a's hand-off) and `ctrl.result` is the only sign a commit landed. `reload` goes through `useEffectEvent` (React 19.2+, the repo has 19.3), so the controller's new `reloadFile` each render starts no read. One read per commit; a publish clears `result` as it starts, so the next commit reads again.
> 9. **The banner's place.** The workspace's root is one element in every state (R4-6a), so the banner can't sit above it, full-bleed, as the handoff draws it (`dc.html:186-190`). It is the root's first row instead (`gridColumn: '1 / -1'` when wide, `flex: '1 1 100%'` when narrow), inside the root's 16px padding. R4-5f padded its strip with `PAGE_GUTTER` for a full-bleed strip, so its text sits 16px further in than the page title. The search screen likewise adds its own padding inside the root's. Both are left to the owner's rehearsal (R-86) and R4-8's visual check.
> 10. **Not in this task.** No component change, and in the controller only `retryReads`' one condition (note 4, Step 10). No story: `EditPane` needs the workspace's controllers, R4-5f's "Edit entry" stories already show its views inside `PageLayout … flush`, and nothing a story renders may call `useBlocker`. No redirect, deletion or nav change (R4-6c). No docs (R4-7). No `pnpm build`, full lint or `test:run` (gates once).
> 11. **Code Health.** Hand count of primitive parameters (named functions, then their inner lambdas):
>     - `EditPane.tsx` (new): 0 of 10 (`outcomeShowing`, `askWhenLanded`, `FocusLine`, `EntryNotice`, `SearchView`, `EditForm`, `EditAside`, `CardEditor`, `EditPane`, each taking objects; `askWhenLanded`'s two are a function and the handoff). With lambdas, 2 of 12 (17%): the `then` callback's `landed` and the `some` callback's `value`.
>     - `useStudioHandoff.ts` (new): 0 of 2 (`asksForFocus(before, now)`, two watch objects; the hook takes none).
>     - `useReloadAfterPublish.ts` (new): 0 of 1.
>     - `studioCopy.ts`: 0 of 4, from R4-6a's 0 of 2 (`saveLabel({saving})` and `editNote(result)` take objects).
>     - `StudioPage.tsx` and `StudioWorkspace.tsx`: unchanged, 0 primitive parameters each. `useCardEditor.ts`: unchanged at 0 of 6, and `retryReads` keeps its complexity of 3.
>     - The tests: `StudioEdit.test.tsx` 1 of 11 named helpers (`renderStudio`'s `path`; `banner` takes a card, `refusal` an object, `fillNewCard` the user), 3 of 13 (23%) with the store's `getCardById(id)` and the fetch stub's `url` (note 13's Discard case adds none: its `discard` getter takes nothing, and its promise executor two functions); `useStudioHandoff.test.ts` 0 of 1, its rows built from constants; `useReloadAfterPublish.test.ts` 0 of 1 (`renderHook`'s callback; its two commits are constants); `studioCopy.test.ts` none.
>     - **Complexity** (ESLint's `complexity` rule): `EntryNotice` 4, `useStudioHandoff` 4, `asksForFocus` 4, `EditAside` 3 (`busy={edit.saving}` adds no branch), `CardEditor` 3, `EditPane` 3, `EditForm` 3, `useReloadAfterPublish` 3, `editNote` 3, `askWhenLanded`'s callback 2, the rest 2 or less. `StudioWorkspace` stays at R4-6a's 4: the ternary replaces `&&`, and the hook call adds no branch. No condition chains `a || b || c`: `outcomeShowing` reads a list with `some`, as R4-5e's `CommitOutcome` does.
> 12. **Verified (2026-10-07)** in `scratchpad/r4-rebase/sandbox-R4-6b`.
>     - **Setup.** A copy of `src/` and the configs from the working tree: main `b490fb7`, plus the uncommitted bump to `16283a13`. `node_modules` and `upstream/` are junctioned in; Vite's cache and the tsbuildinfo stay in the sandbox.
>     - **Siblings laid over it, as their sandboxes held them:** R4-1a and R4-1b (the client); R4-2a and R4-2b (`cardEdit.ts`, `editSearch.ts`, `changeRows.ts`, `studioFixtures.ts`); R4-3a and R4-3b (`readiness.ts`, `livePreview.ts`, `revealForm.ts`); R4-4a's file hook; R4-4c's `editSave.ts` and `useEditSave.ts` and R4-4d's `branchCards.ts`, over R4-4c's stand-in for R4-4b; R4-5a (`nav.ts`, `studioPaths.ts`, `studioLayout.ts`, `studioStyles.ts`, `AdminStyles.tsx`, `InkwellIcon`); R4-5s (the guard, `writeInFlight.ts`); R4-5d's `StudioCardPanel` and `cardPanel.ts`; R4-5e's `CommitOutcome`, `ChangeList` and `SynergyPanel`; R4-5f's `EditSearch`, `EditingBanner`, `ReleasedCardFacts`, `CardMarks`, `searchStatus.ts`, `Tag` and `cardFacts`; R4-6a's `StudioPage`, `StudioWorkspace`, `NewRevealPane`, `studioCopy.ts`, the promise-returning `publish` and `StudioPage.test.tsx`, taken from its task file's code blocks, and its `StudioSlots` and `studioPaths.ts` additions from its sandbox.
>     - **Stand-ins.** Three, each marked "sandbox only": an adapter over R4-4c's stand-in that gives `useCardEditor` the header's final names (`lookup.kind`, `previewFile`, `tag`, `imageOnly`) and `openCard`; R4-5b's `StudioForm` (Collector number, Name, Version, Ink, Cost, Strength, Willpower, Lore and Full card text, with a narrow accordion of four sections and `locked` as `readOnly`); and R4-5e's `loadAgainNote`, which its task file creates.
>     - **Red, then green.** Each "watch it fail" output below was produced with the new code absent. The drafter's run of the five new and changed test files gave 51 tests: this task's 17, 7 and 1, R4-6a's `StudioPage.test.tsx` (14) unchanged beside them, and `studioCopy.test.ts`'s 12 (R4-6a's 7, plus 5). After the stale case's fix (below), five runs of `StudioEdit.test.tsx` and three of that set passed in a row, with no `act(...)` or "Cannot update a component" warning.
>     - **Mutants.** 19 of 19 failed the tests, each caught by 1 to 12 tests, over those five files:
>       - `useFocusHandoff()` back in `StudioPage` (no URL watch);
>       - the banner taking the handoff while the outcome shows;
>       - no `key` on `CardEditor`;
>       - Load it again asking for nothing, and `askWhenLanded` never asking;
>       - Save asking for nothing;
>       - `asksForFocus` ignoring `replaced`, or the card list's recovery;
>       - no reload after a publish;
>       - one note for every save;
>       - no `locked` collector number;
>       - synergies for an image-only card, or a form for one;
>       - no notice above the search;
>       - no Forget token on a refused save, or beside a refused read;
>       - no `dropped` on the outcome;
>       - `deployed` or the tag ignored.
>
>       Two first drafts were fixed on the way. The stale case awaited focus through `document.activeElement`'s text and failed one run in three (Step 8's note). `deployed` survived until the branch-only case joined.
>     - **Types and lint.** `tsc -p tsconfig.app.json` exits 0. `pnpm exec eslint --max-warnings 0 --stdin`, run in the repo, is clean on all ten files, including `useEffectEvent` under `react-hooks` 7.1.1 and `react-compiler`.
>     - **CodeScene.** MCP 1.5.7's `code_health_review`, in a throwaway git folder (`scratchpad/r4-rebase/cs-r46b`), scores all ten files 10.0, with no findings.
>     - **Verifier's pass (2026-10-07)** in `scratchpad/r4-rebase/sandbox-v-R4-6b`, with the drafter's three stand-ins replaced by the drafts themselves:
>       - **What ran.** R4-4b to R4-4d's controller as verified in `sandbox-v-R4-4d` (`editorState.ts`, `useCardEditor.ts`, `editSave.ts`, `useEditSave.ts`, `branchCards.ts`, the file hook, and their tests); R4-5b and R4-5c's `StudioForm` (`sandbox-v-R4-5c`); R4-5e's `loadAgainNote.ts`, `ChangeList`, `CommitOutcome` and `SynergyPanel`, and R4-5f's `EditSearch.tsx`, `EditingBanner.tsx` and `ReleasedCardFacts.tsx`, each as its task file now has it; and R4-6a's `StudioPage.test.tsx` as now drafted.
>       - **Found and fixed.** The dead "Read previewCards.json again" after a later failed read (note 4, Step 10). Three paths no test reached: `gone`'s line, a set-14 card waiting on a failed read, and R-66's reload (deleting the workspace's `useReloadAfterPublish` call passed every test). Four page cases now hold them, and a fifth holds the deep link the drafter left to the rehearsal (a card list that failed, then Retry), which passes on R4-4b's real controller. Two lines R4-7's stale-name sweep would print (a test name, and `editNote`'s doc, each said "image tool") were reworded; `IMAGE_ON_MASTER`'s comment, which R4-7's list keeps as provenance, is the one left. `useReloadAfterPublish.test.ts`'s `commit(sha)` helper became two constants, so that module has no primitive parameter.
>       - **Red, then green.** Step 8 fails 22 of 22. Step 9 leaves exactly 1 of 22 failing, as quoted there. Step 11 passes 8 files and 102 tests (22, 14, 12, 7 and 1, plus the controller's 18, 20 and 8). `StudioEdit.test.tsx` passed five runs in a row, with no `act(...)` or "Cannot update a component" warning.
>       - **Mutants, on the real controller.** 17 were run, and each failed: twelve of the drafter's in `EditPane.tsx` (the banner always taking the handoff, no `key`, Load it again or Save asking for nothing, one note, no lock, synergies always, no Forget token on a save or beside a read, no `dropped`, `deployed` forced, no `missing` line); the three new branches (no `gone` line, no `fileFailed` line, the file's Retry asking for nothing); the workspace's reload call deleted; and `asksForFocus` ignoring the card list's recovery (two cases). Step 10's old condition fails only the later-read case.
>       - **Left open.** Focus after "Leave this page" on a held card change falls to `<body>` in jsdom, where the drafter expected the new view's handoff to stand. The fix is a `src/shell` change, so it is listed for the owner under the hand-offs to R4-8.
>       - **Types, lint and Code Health.** `tsc -p tsconfig.app.json` exits 0. `pnpm exec eslint --max-warnings 0 --stdin`, run in the repo, is clean on all eleven files. CodeScene MCP 1.5.7 (`scratchpad/r4-rebase/cs-v-R4-6b`) scores `EditPane.tsx`, `studioCopy.ts`, `useCardEditor.ts` and the four test files 10.0, with no findings.
> 13. **Discard is held while a save runs (cross-task critic, 2026-10-07).** R4-4c's hand-off asks for it ("Discard while a save runs: hold it, as Save is held"), and R4-5e now gives `ChangeList` a `busy?: boolean` that disables Discard. `EditAside` passes `busy={edit.saving}`, and `StudioEdit.test.tsx` gains one case (Step 8), so the counts above become: Step 8 fails 23 of 23, Step 9 leaves 1 of 23 failing (still the later-read case), and Step 11 passes 103.
>     - **Verified** in `scratchpad/r4-rebase/sandbox-c-R4-6b`, a copy of `sandbox-v-R4-6b` with R4-5e's current `ChangeList.tsx` laid over it. With `busy` unwired, the new case alone fails, on `toBeDisabled()`. Wired, `StudioEdit.test.tsx` passed three runs in a row (23 of 23, no `act(...)` warning), and Step 11's set passed 8 files and 103 tests. With Step 10's condition reverted, the run is Step 9's `1 failed | 22 passed (23)`; with Edit mode rendering nothing, the new case fails as Step 8 says.
>     - **Mutants.** `busy` dropped, `busy={false}`, `busy={true}` and `busy={!edit.canSave}` each fail the case.
>     - **Lint, types and Code Health.** `pnpm exec eslint --max-warnings 0 --stdin`, run in the repo, is clean on `EditPane.tsx` and `StudioEdit.test.tsx`; `tsc -p tsconfig.app.json` exits 0 in the sandbox; CodeScene MCP 1.5.7 (`scratchpad/r4-rebase/cs-c-R4-6b`) scores both 10.0, with no findings.

### Task R4-6b: The Edit pane

**Files:**
- Create in `src/tools/studio/`:
  - `EditPane.tsx`: Edit card's pane, one lookup state at a time, and the open card's editor
  - `useStudioHandoff.ts`: the page's focus handoff, asking when the URL's card changes and when the card list's Retry lands (R-59)
  - `useReloadAfterPublish.ts`: R-66's read of `previewCards.json` once a New reveal publish lands
  - `__tests__/StudioEdit.test.tsx`, `__tests__/useStudioHandoff.test.ts`, `__tests__/useReloadAfterPublish.test.ts`
- Modify in `src/tools/studio/`:
  - `studioCopy.ts`: `saveLabel` and `editNote` appended, and one type import
  - `__tests__/studioCopy.test.ts`: the import, and two `describe`s appended
  - `StudioPage.tsx`: `useStudioHandoff()` in place of `useFocusHandoff()`, its import, and one doc sentence
  - `StudioWorkspace.tsx`: `EditPane` in Edit mode, the R-66 hook, two imports and one doc sentence
  - `useCardEditor.ts` (R4-4c's `retryReads`): one condition and its doc comment, so Retry reads the file after any failed read (re-base note 4)
- Not touched: any component in `components/`, the rest of the controller (`useEditSave.ts`, `editorState.ts`, `editSave.ts`, `branchCards.ts`, `usePreviewCardsFile.ts`) and its tests, `studioPaths.ts`, `src/shell`, the bridge, `src/github/githubCommit.ts` and every reveal-sync contract file. So there is no reveal-sync run. Nothing is deleted.

**Interfaces:**
- **Consumes** (Step 1 checks each; if an earlier task landed a name otherwise, use its name, since this task renames nothing):
  - **R4-6a.** `StudioPage` (holds `useFocusHandoff()` above the gate), `StudioWorkspace({token, handoff})` with its private `useForgetToken({drafts, handoff})` and its `{mode === 'new' && <NewRevealPane … />}`, `StudioSlots({layout, slots})`, `studioCopy.ts`'s `newRevealNote()` and `publishLabel`, `studioPaths.ts`'s `studioUnsavedMessage` and `forgetTokenQuestion`, and `StudioPage.test.tsx`'s harness, which `StudioEdit.test.tsx` copies.
  - **R4-4a to R4-4d** (the header's addition 11): `useCardEditor({token, cardId})` returning `CardEditorController`:
    ```ts
    lookup: EditLookup;   // kind: 'listFailed' | 'none' | 'loading' | 'missing' | 'fileFailed' | 'gone' | 'ready'
                          // ready: {card, entry, imageOnly}; missing: {cardId}; gone: {card}
    retry: () => Promise<boolean>;                           // the file's read, or the card list's, whichever failed (Step 10: any failed file read)
    previewFile: {status; previewIds: ReadonlySet<number> | null; error: string | null; reload: () => void};
    tag: CardTag | null; form: RevealCardForm | null; imageOnly: ImageOnlyReason | null;
    patchForm; validation; changes: ChangeRow[]; dirty: boolean; discard: () => void;
    previewCard: LorcanaCard | null; synergyGroups: SynergyGroup[];
    imageName: string | null; imageError: string | null; onImageChange: (file: File | null) => Promise<void>; revertImage: () => void;
    canSave: boolean; saving: boolean; save: () => Promise<void>;
    result: EditResult | null; saveError: string | null; failure: SaveFailure | null;   // EditResult: {commitUrl, withImage}
    loadAgain: () => Promise<boolean>; dropped: number | null;
    searchCards: LorcanaCard[]; branchOnlyIds: ReadonlySet<number>; deployed: boolean; reloadFile: () => void;
    ```
    Also the types `EditLookup` (`editorState.ts`) and `EditResult` (`editSave.ts`), `openCard(lookup)` (R4-6a reads it), R4-4d's `goneNote(card)` (`branchCards.ts`), R4-2a's `IMAGE_ONLY_NOTES` (`cardEdit.ts`) and R4-2b and R4-4d's `searchCards({cards, query, previewIds, branchOnlyIds})` (`editSearch.ts`).
  - **R4-5b to R4-5f** (the header's addition 12): `StudioForm({form, errors, onChange, layout, locked})`; `StudioCardPanel({card, mode, layout, staged, current, onImageChange, onRevertImage})`; `ChangeList({rows, onDiscard, busy})`, whose `busy?: boolean` holds Discard while a save runs (R4-4c's hand-off); `CommitOutcome({result, error, note, dropped, onLoadAgain, onForgetToken, handoff})`, which takes the handoff only while it shows something; `SynergyPanel({groups})`; `EditSearch({rows, total, query, onQuery, list, file, notice, handoff})`, whose failed file read offers "Read previewCards.json again" or Forget token; `EditingBanner({card, tag, deployed, handoff})`, whose `h2` reads "Editing {name} {version}"; `ReleasedCardFacts({card, note})`; and R4-5e's `loadAgainNote({dropped})` (tests only).
  - **R4-2a's fixtures** (tests only): `PREVIEW_ENTRY`, `VARIANTS_ENTRY`, `RELEASED_CARD`, `cardOf`, `previewFileText`, and R4-4d's `BRANCH_ONLY_ENTRY`.
  - **Unchanged code:** `useFocusHandoff`, `useTakeHandoff` and `type FocusHandoff` (`src/shell/focusHandoff.ts:13-52`); `studioCardOf` (`studioPaths.ts`, R4-5a); `useCardDataContext` (`isLoading`, `error`, `retryLoad`), `CtaButton` and `inkBlock` (the bridge); `commitNewCard` (`reveal/githubClient.ts`, tests only); `pngFile` (`src/test/images.ts`); `Notice`; `goLiveNote` and `targetBranch`; React 19.3's `useEffectEvent`; react-router's `useNavigationType` and `NavigationType`.
- **Produces:**
  ```ts
  // src/tools/studio/EditPane.tsx
  export interface EditPaneProps {
    edit: CardEditorController;
    cardId: string | null;            // the URL's ?card= (studioCardOf), for the line while it waits on a failed read
    layout: StudioLayout;
    handoff: FocusHandoff;            // StudioPage's (R-59)
    onForgetToken: () => void;        // the workspace's, which asks first while a draft is dirty (R-84)
  }
  export function EditPane(props: EditPaneProps);
  // src/tools/studio/useStudioHandoff.ts
  export interface StudioWatch {cardId: string | null; failed: boolean}
  export function asksForFocus(before: StudioWatch, now: StudioWatch & {replaced: boolean}): boolean;
  export function useStudioHandoff(): FocusHandoff;   // StudioPage's one handoff; asks during render (R3's useCardHandoff)
  // src/tools/studio/useReloadAfterPublish.ts
  export interface PublishedReload {published: {commitUrl: string} | null; reload: () => void}
  export function useReloadAfterPublish(source: PublishedReload): void;   // one reload per commit that lands (R-66)
  // src/tools/studio/studioCopy.ts (added)
  export function saveLabel({saving}: {saving: boolean}): string;          // 'Save changes to {branch}' | 'Saving…'
  export function editNote(result: Pick<EditResult, 'withImage'> | null): string;   // image tool's note, or newRevealNote()
  ```

**How it works:**

| `edit.lookup.kind` | Edit card shows | Its focus target |
|---|---|---|
| `listFailed` | the search, its field replaced by the card list's error and Retry (R4-5f) | Retry, if the list fails again; the field once it loads |
| `none` | the search, with the file's error and its way out beside the rows if the read failed (R-71) | the field |
| `loading` | "Loading the card…" | none: the next state takes what's pending |
| `missing` | the search, under "No card has the id {id} in the card list or in previewCards.json. …" | the line |
| `fileFailed` | the search, under "Card {id} opens once previewCards.json can be read.", the read's error beside the rows | the line |
| `gone` | the search, under `goneNote(card)` (R-66) | the line |
| `ready` | keyed by the card's id: the Editing banner, then the card panel, the form or the facts, and the aside | the banner's `h2`; once the outcome shows, the outcome |

| Something happens | Who asks for the handoff, and when |
|---|---|
| The URL's `?card=` changes, by a link, a row, Back or Forward | `useStudioHandoff`, during `StudioPage`'s render; never on a REPLACE |
| The card list's Retry lands (its error clears) | `useStudioHandoff`, the same way |
| "Read previewCards.json again" lands | `askWhenLanded(edit.retry, handoff)`, once the read is on screen |
| Save settles, landed or failed | `edit.save().then(handoff.request)` |
| Load it again lands | `askWhenLanded(edit.loadAgain, handoff)` |
| Save token, or the in-page Forget token | R4-6a's handlers, unchanged |
| A mode switch | nobody: the card rides along, and focus stays on the switch |

- [ ] **Step 1: Check what this task builds on**

R4-1a to R4-6a have landed on `feature/24-redesign-r4`, on the bumped pin. Run each command and compare:

```bash
git log --oneline main..HEAD
```

The newest commit is R4-6a's `feat(studio): open Card studio at /studio with New reveal (#24)`, after its fix round if it had one.

```bash
rg -n "export (function|const|type|interface) (StudioPage|StudioWorkspace|NewRevealPane|StudioSlots|newRevealNote|publishLabel|studioDocumentTitle|studioUnsavedMessage|forgetTokenQuestion|studioCardOf|EditLookup|openCard|useCardEditor|CardEditorController|EditResult|goneNote|searchCards|IMAGE_ONLY_NOTES|loadAgainNote)\b" src/tools/studio
```

Each name prints once, across `StudioPage.tsx`, `StudioWorkspace.tsx`, `NewRevealPane.tsx`, `components/StudioSlots.tsx`, `studioCopy.ts`, `studioPaths.ts`, `editorState.ts`, `useCardEditor.ts`, `editSave.ts`, `branchCards.ts`, `editSearch.ts`, `cardEdit.ts` and `loadAgainNote.ts`.

```bash
rg -n "^export function (StudioForm|StudioCardPanel|ChangeList|CommitOutcome|SynergyPanel|EditSearch|EditingBanner|ReleasedCardFacts)\b" src/tools/studio/components
rg -n "dropped\?|onLoadAgain\?|handoff\?" src/tools/studio/components/CommitOutcome.tsx
rg -n "notice\?|onForgetToken\?" src/tools/studio/components/EditSearch.tsx
rg -n "current\?|onRevertImage\?" src/tools/studio/components/StudioCardPanel.tsx
rg -n "locked\?" src/tools/studio/components/StudioForm.tsx
rg -n "busy\?" src/tools/studio/components/ChangeList.tsx
```

Eight components print, one each. Then `CommitOutcome` takes `dropped?`, `onLoadAgain?` and `handoff?`; `EditSearch` takes `notice?` and its file's `onForgetToken?`; `StudioCardPanel` takes `current?` and `onRevertImage?`; `StudioForm` takes `locked?`; `ChangeList` takes `busy?`.

```bash
rg -n "retry|previewFile|tag:|imageOnly|loadAgain|dropped|failure|searchCards|branchOnlyIds|deployed|reloadFile" src/tools/studio/useCardEditor.ts src/tools/studio/useEditSave.ts
rg -n "mode === 'new' &&|useFocusHandoff\(\)|useForgetToken" src/tools/studio/StudioWorkspace.tsx src/tools/studio/StudioPage.tsx
rg -n "export (const|function) (PREVIEW_ENTRY|VARIANTS_ENTRY|RELEASED_CARD|BRANCH_ONLY_ENTRY|cardOf|previewFileText)\b" src/tools/studio/studioFixtures.ts
```

- The controller's fields are the header's addition 11, as this task's Interfaces list them: `retry` and `loadAgain` return promises, `dropped` is `number | null`, and `lookup.kind` names the states.
- `StudioWorkspace.tsx` still holds `{mode === 'new' && <NewRevealPane … />}` and its private `useForgetToken`, and `StudioPage.tsx` its `useFocusHandoff()`.
- The six fixtures print once each.

```bash
rg -n "if \(file\.status !== 'error'\) return Promise\.resolve\(false\);|previewFileView,|function retryReads" src/tools/studio/useCardEditor.ts
```

Three lines: `previewFileView,` in the `./editorState` import, `function retryReads(`, and its `if (file.status !== 'error') return Promise.resolve(false);`. If the third is missing because R4-4c already reads on `previewFileView(file).error === null`, skip Step 10's edit and keep its run.

Where a sibling landed a name otherwise (the lookup's discriminator, say), use the landed name in this task's code and tests: this task renames nothing.

- [ ] **Step 2: Write the failing tests for Edit's words**

In `src/tools/studio/__tests__/studioCopy.test.ts` (R4-6a's), widen the import:

```ts
import {editNote, newRevealNote, publishLabel, saveLabel, studioDocumentTitle} from '../studioCopy';
```

Append:

```ts
describe('saveLabel (R4-6b)', () => {
  it('names the branch Edit card saves to, and says while it saves', () => {
    expect(saveLabel({saving: false})).toBe('Save changes to master');
    expect(saveLabel({saving: true})).toBe('Saving…');
  });

  it('names a rehearsal branch', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    expect(saveLabel({saving: false})).toBe('Save changes to admin-verify');
  });
});

describe('editNote (R4-6b)', () => {
  it('says when the new image goes live, when an image went with the save', () => {
    expect(editNote({withImage: true})).toBe(
      'The new image goes live after the convert workflow runs and Vercel redeploys (~a few minutes).',
    );
  });

  it("gives a fields-only save New reveal's note, since it deploys as a new card's does", () => {
    expect(editNote({withImage: false})).toBe(newRevealNote());
    expect(editNote(null)).toBe(newRevealNote());
  });

  it('says a rehearsal branch never deploys, image or not', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    expect(editNote({withImage: true})).toBe('It went to admin-verify; only master deploys to production.');
  });
});
```

Run:

```bash
pnpm vitest run --project app src/tools/studio/__tests__/studioCopy.test.ts
```

Expected: `Tests  5 failed | 7 passed (12)`. R4-6a's seven still pass. The new five fail, with `TypeError: saveLabel is not a function` (two) and `TypeError: editNote is not a function` (three).

- [ ] **Step 3: Add `saveLabel` and `editNote`**

In `src/tools/studio/studioCopy.ts`, add a type import after `import type {StudioMode} from '../../shell/nav';`:

```ts
import type {EditResult} from './editSave';
```

Append after `studioDocumentTitle`:

```ts
/** Edit card's button (R4-6b): the branch it commits to, or that it is saving. */
export function saveLabel({saving}: {saving: boolean}): string {
  return saving ? 'Saving…' : `Save changes to ${targetBranch()}`;
}

/** The image tool's go-live sentence, word for word: the convert workflow turns the raw scan into the card's art. */
const IMAGE_ON_MASTER = 'The new image goes live after the convert workflow runs and Vercel redeploys (~a few minutes).';

/**
 * What follows "Committed." after an Edit save (R4-6b): IMAGE_ON_MASTER when
 * an image went with the commit, else New reveal's note, since a fields
 * commit deploys as a new card's does. A rehearsal branch never deploys, and
 * goLiveNote says so.
 */
export function editNote(result: Pick<EditResult, 'withImage'> | null): string {
  return result?.withImage ? goLiveNote(IMAGE_ON_MASTER) : newRevealNote();
}
```

Run the Step 2 command. Expected: `Tests  12 passed (12)`. The tests read master: `vite.config.ts` pins `VITE_ADMIN_TARGET_BRANCH` empty, and the file's `afterEach` undoes each `vi.stubEnv`.

- [ ] **Step 4: Write the failing test for the handoff's rule**

Create `src/tools/studio/__tests__/useStudioHandoff.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {asksForFocus, type StudioWatch} from '../useStudioHandoff';

// What the handoff watches, before and after a move: a card, another card, none, and a failed card list.
const CARD: StudioWatch = {cardId: '14031', failed: false};
const OTHER: StudioWatch = {cardId: '14032', failed: false};
const SEARCH: StudioWatch = {cardId: null, failed: false};
const FAILED: StudioWatch = {cardId: '14031', failed: true};

describe('asksForFocus (R-59)', () => {
  it.each<{move: string; before: StudioWatch; now: StudioWatch; replaced?: boolean; asks: boolean}>([
    {move: 'another card, by a link or Back', before: CARD, now: OTHER, asks: true},
    {move: 'a first card, from the search', before: SEARCH, now: CARD, asks: true},
    {move: 'the search, from Load a different card', before: CARD, now: SEARCH, asks: true},
    {move: 'the card list recovering on Retry', before: FAILED, now: CARD, asks: true},
    {move: 'another card by a redirect', before: SEARCH, now: CARD, replaced: true, asks: false},
    {move: 'the same card, as a mode switch keeps it', before: CARD, now: CARD, asks: false},
    {move: 'the card list failing', before: CARD, now: FAILED, asks: false},
  ])('asks for $move: $asks', ({before, now, replaced = false, asks}) => {
    expect(asksForFocus(before, {...now, replaced})).toBe(asks);
  });
});
```

Run:

```bash
pnpm vitest run --project app src/tools/studio/__tests__/useStudioHandoff.test.ts
```

Expected: `Test Files  1 failed (1)`, `Tests  no tests`, with `Error: Failed to resolve import "../useStudioHandoff" from "src/tools/studio/__tests__/useStudioHandoff.test.ts". Does the file exist?`

- [ ] **Step 5: Add `useStudioHandoff`, and give `StudioPage` it**

Create `src/tools/studio/useStudioHandoff.ts`:

```ts
import {useState} from 'react';
import {NavigationType, useLocation, useNavigationType} from 'react-router-dom';
import {useCardDataContext} from '../../app-bridge';
import {useFocusHandoff, type FocusHandoff} from '../../shell/focusHandoff';
import {studioCardOf} from './studioPaths';

/** What the studio's focus handoff watches: the card the URL names, and whether the card list has failed. */
export interface StudioWatch {
  cardId: string | null;
  failed: boolean;
}

/**
 * Whether the move from `before` to `now` leaves focus for the next view to
 * take (R-59, after R3's asksForFocus). Two moves do: the card list's error
 * clearing, which only Retry does, and the URL naming another card or none,
 * unless a redirect did it (`replaced`), which is no one's action. A mode
 * switch keeps the card, so it asks for nothing: focus stays on the switch.
 */
export function asksForFocus(before: StudioWatch, now: StudioWatch & {replaced: boolean}): boolean {
  if (before.failed && !now.failed) return true;
  return now.cardId !== before.cardId && !now.replaced;
}

/**
 * Card studio's one focus handoff (R-59, R-48). StudioPage holds it, above the
 * gate, so Save token can ask for it before the workspace mounts. It also asks
 * when the URL's card changes and when the card list's Retry lands: during
 * render, from what it saw last, as Card analytics' useCardHandoff does
 * (CardAnalyticsPage.tsx:41-50). Never in a click handler: a router link's
 * navigation renders as a transition, so the old card's view would take a
 * request made on click. The view that replaces the control that went takes
 * it, and moves focus only if focus fell to <body> (useTakeHandoff).
 */
export function useStudioHandoff(): FocusHandoff {
  const handoff = useFocusHandoff();
  const replaced = useNavigationType() === NavigationType.Replace;
  const watched: StudioWatch = {cardId: studioCardOf(useLocation()), failed: useCardDataContext().error !== null};
  const [seen, setSeen] = useState(watched);
  if (seen.cardId !== watched.cardId || seen.failed !== watched.failed) {
    setSeen(watched);
    if (asksForFocus(seen, {...watched, replaced})) handoff.request();
  }
  return handoff;
}
```

Keep it as written:
- **The request happens during `StudioPage`'s render,** guarded by what the hook saw last, as `useCardHandoff` does. That sets the state of the component that is rendering, which React allows. A request from `EditPane`'s render would set `StudioPage`'s state while rendering another component, which React refuses ("Cannot update a component while rendering a different component").
- **`replaced`** keeps a redirect from asking: R4-6c sends `/image` to `studioHref('edit')` by a REPLACE.
- **A move to no card asks,** unlike R3's (`CardAnalyticsPage.tsx:30`): "Load a different card" unmounts with the card, and the search field takes focus.

In `src/tools/studio/StudioPage.tsx` (R4-6a's), make three changes.

The focus import loses `useFocusHandoff`. Before:

```tsx
import {useFocusHandoff, useTakeHandoff, type FocusHandoff} from '../../shell/focusHandoff';
```

After:

```tsx
import {useTakeHandoff, type FocusHandoff} from '../../shell/focusHandoff';
```

Add after `import {STUDIO_SUBTITLE, STUDIO_TITLE} from './studioCopy';`:

```tsx
import {useStudioHandoff} from './useStudioHandoff';
```

In `StudioPage`, change the doc comment's last sentence and the handoff's line. Before:

```tsx
 * (R-59), since Save token swaps the gate for the workspace and takes its own
 * button with it: the workspace's next view takes focus.
 */
export function StudioPage() {
  const {token, setToken} = useGithubToken();
  const handoff = useFocusHandoff();
```

After:

```tsx
 * (R-59), since Save token swaps the gate for the workspace and takes its own
 * button with it: the workspace's next view takes focus. The handoff also
 * asks when the URL's card changes, and when the card list's Retry lands
 * (useStudioHandoff).
 */
export function StudioPage() {
  const {token, setToken} = useGithubToken();
  const handoff = useStudioHandoff();
```

Run:

```bash
pnpm vitest run --project app src/tools/studio/__tests__/useStudioHandoff.test.ts src/tools/studio/__tests__/StudioPage.test.tsx
```

Expected: `Tests  21 passed (21)`: the rule's 7, and R4-6a's 14 unchanged (none of them moves the URL's card, and their card list never fails).

- [ ] **Step 6: Write the failing test for the reload after a publish**

Create `src/tools/studio/__tests__/useReloadAfterPublish.test.ts`:

```ts
import {describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {useReloadAfterPublish, type PublishedReload} from '../useReloadAfterPublish';

// Two publishes that landed, as RevealAdminController's result holds them.
const FIRST = {commitUrl: 'https://github.com/Doberjohn/inkweave/commit/a1'};
const SECOND = {commitUrl: 'https://github.com/Doberjohn/inkweave/commit/b2'};

describe('useReloadAfterPublish (R-66)', () => {
  it('reads the file once per publish that lands, and never before one', () => {
    const reload = vi.fn();
    const {rerender} = renderHook((published: PublishedReload['published']) => useReloadAfterPublish({published, reload}), {
      initialProps: null as PublishedReload['published'],
    });
    expect(reload).not.toHaveBeenCalled();

    rerender(FIRST);
    expect(reload).toHaveBeenCalledOnce();
    // The same commit in a new object on a later render, and the next publish clearing it as it starts, read nothing.
    rerender({...FIRST});
    rerender(null);
    expect(reload).toHaveBeenCalledOnce();

    rerender(SECOND);
    expect(reload).toHaveBeenCalledTimes(2);
  });
});
```

Run:

```bash
pnpm vitest run --project app src/tools/studio/__tests__/useReloadAfterPublish.test.ts
```

Expected: `Test Files  1 failed (1)`, `Tests  no tests`, with `Error: Failed to resolve import "../useReloadAfterPublish" from "src/tools/studio/__tests__/useReloadAfterPublish.test.ts". Does the file exist?`

- [ ] **Step 7: Add `useReloadAfterPublish`**

Create `src/tools/studio/useReloadAfterPublish.ts`:

```ts
import {useEffect, useEffectEvent} from 'react';

/** New reveal's last publish, and Edit card's read of previewCards.json. */
export interface PublishedReload {
  /** The last publish that landed, or null (RevealAdminController's result; a publish clears it as it starts). */
  published: {commitUrl: string} | null;
  /** Reads previewCards.json from the target branch again (CardEditorController's reloadFile). */
  reload: () => void;
}

/**
 * R-66: once a New reveal publish lands, Edit card reads previewCards.json
 * again, so the card just published opens at once, 15 to 20 minutes before
 * inkweave.ink serves it. Each commit reads once: the effect follows the
 * commit's link. The read is an effect event, so the new reload function each
 * render brings starts no read of its own.
 */
export function useReloadAfterPublish({published, reload}: PublishedReload): void {
  const commitUrl = published?.commitUrl ?? null;
  const onPublished = useEffectEvent(reload);
  useEffect(() => {
    if (commitUrl !== null) onPublished();
  }, [commitUrl]);
}
```

Keep `useEffectEvent`. The controller's `reloadFile` is a new function each render (MEMO_BAN rules out `useCallback`), so as a dependency it would read the file on every render, and left out it trips `react-hooks/exhaustive-deps`. `react-hooks` 7.1.1 and `react-compiler` pass the effect event.

Run the Step 6 command. Expected: `Tests  1 passed (1)`.

- [ ] **Step 8: Write the failing page tests**

Create `src/tools/studio/__tests__/StudioEdit.test.tsx`. Its harness is `StudioPage.test.tsx`'s (R4-6a): the card list and the width as stores, the real token store through `localStorage`, and `createMemoryRouter` beside a page to leave to. It reads `previewCards.json` for real against the fetch stub, and fakes only the two commits.

```tsx
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen, waitFor, waitForElementToBeRemoved, within} from '@testing-library/react';
import userEvent, {type UserEvent} from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {inkBlock, type useCardDataContext} from '../../../app-bridge';
import {studioHref} from '../../../shell/nav';
import {pngFile} from '../../../test/images';
import {commitCardImage} from '../../image/githubClient';
import {StaleCardError, commitCardEdit, commitNewCard} from '../../reveal/githubClient';
import {goneNote} from '../branchCards';
import {loadAgainNote} from '../loadAgainNote';
import {StudioPage} from '../StudioPage';
import {newRevealNote} from '../studioCopy';
import {BRANCH_ONLY_ENTRY, PREVIEW_ENTRY, RELEASED_CARD, VARIANTS_ENTRY, cardOf, previewFileText} from '../studioFixtures';
import {STUDIO_WIDE_MIN} from '../studioLayout';

// previewCards.json is read for real, against the fetch stub; only the commits are faked.
vi.mock('../../reveal/githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../reveal/githubClient')>()),
  commitCardEdit: vi.fn(),
  commitNewCard: vi.fn(),
}));
vi.mock('../../image/githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../image/githubClient')>()),
  commitCardImage: vi.fn(),
}));

/** What the studio reads from the shell's card list. */
type CardList = Pick<ReturnType<typeof useCardDataContext>, 'cards' | 'isLoading' | 'error' | 'getCardById' | 'retryLoad'>;

// Two stores a test moves on, as StudioPage.test.tsx has them: the card list (R3's pattern) and the measured width.
const cardList = vi.hoisted(() => ({value: null as CardList | null, listeners: new Set<() => void>()}));
const measured = vi.hoisted(() => ({width: 0, listeners: new Set<() => void>()}));
vi.mock('../../../app-bridge', async (importOriginal) => {
  const {useSyncExternalStore} = await import('react');
  const subscribe = (listeners: Set<() => void>) => (onChange: () => void) => {
    listeners.add(onChange);
    return () => listeners.delete(onChange);
  };
  const onCards = subscribe(cardList.listeners);
  const onWidth = subscribe(measured.listeners);
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    useCardDataContext: function useCardDataContext() {
      return useSyncExternalStore(onCards, () => cardList.value);
    },
    useContainerWidth: function useContainerWidth() {
      return useSyncExternalStore(onWidth, () => measured.width);
    },
  };
});

const TOKEN_KEY = 'inkweave.reveal-admin.gh-token';
const PREVIEW_URL =
  'https://api.github.com/repos/Doberjohn/inkweave/contents/apps/web/public/data/previewCards.json?ref=master';
const COMMIT_URL = 'https://github.com/Doberjohn/inkweave/commit/abc123';
/** What a save says when GitHub rejects the token (R-26). */
const REJECTED_SAVE = 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: {"message":"Bad credentials"}';
const IMAGE_NOTE = 'The new image goes live after the convert workflow runs and Vercel redeploys (~a few minutes).';
// R4-6a's wording (studioPaths.ts): what a held card change, and a held leave, drop.
const LEAVES_CARD = "Your changes to this card aren't saved yet. Leaving the card drops them.";
const LEAVES_REVEAL = "Your New reveal card isn't published yet. Leaving Card studio drops it.";
const LEAVES_EDIT = "Your Edit card changes aren't saved yet. Leaving Card studio drops them.";
const RENAMED = 'Mei Lee';

// The card list as inkweave.ink serves it: a released card, then the deployed preview cards (loader.ts:195-198).
const MEI = cardOf(PREVIEW_ENTRY);
const MING = cardOf(VARIANTS_ENTRY);
const WREN = cardOf(BRANCH_ONLY_ENTRY);
const CARDS: LorcanaCard[] = [RELEASED_CARD, MEI, MING];
const FILE: LorcanaJSONCard[] = [PREVIEW_ENTRY, VARIANTS_ENTRY];

type Answer = () => Response | Promise<Response>;
/** previewCards.json holding `cards`, as GitHub's raw contents answer it. */
const fileOf = (cards: LorcanaJSONCard[]) => new Response(previewFileText(cards));
/** A read GitHub refuses. */
const refusal = ({status, message}: {status: number; message: string}) =>
  new Response(JSON.stringify({message}), {status});
/** A request that never settles, so its read stays loading. */
const never = () => new Promise<Response>(() => {});

/** previewCards.json answers with `preview` (by default the two preview cards); every other request never settles. */
function stubFetch(preview: Answer = () => fileOf(FILE)) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => (url === PREVIEW_URL ? Promise.resolve(preview()) : never())),
  );
}

/** Sets the card list the page reads, and re-renders. By default it has loaded, with CARDS. */
function setCardList({cards = CARDS, isLoading = false, error = null}: Partial<CardList> = {}) {
  const getCardById = (id: string) => cards.find((c) => c.id === id);
  cardList.value = {cards, isLoading, error, getCardById, retryLoad: () => {}};
  act(() => cardList.listeners.forEach((onChange) => onChange()));
}

/** Card studio at `path` in a data router, which the guard needs, beside a page to leave to. */
function renderStudio(path: string) {
  localStorage.setItem(TOKEN_KEY, 'tok');
  const router = createMemoryRouter(
    [
      {path: '/studio', element: <StudioPage />},
      {path: '/', element: <h1>Overview</h1>},
    ],
    {initialEntries: [path]},
  );
  render(<RouterProvider router={router} />);
  return {router, user: userEvent.setup()};
}

/** The Editing banner's h2 for `card`: "Editing {name} {version}" (R4-5f). */
const banner = (card: LorcanaCard) =>
  screen.findByRole('heading', {level: 2, name: `Editing ${card.name} ${card.version}`});
const searchField = () => screen.getByRole('searchbox', {name: 'Search cards'});
const nameField = () => screen.findByRole('textbox', {name: 'Name'});
const saveButton = () => screen.getByRole('button', {name: /^Save/});
const leaveDialog = () => screen.findByRole('dialog', {name: 'Leave this page?'});
const outcomeOf = (link: HTMLElement) => link.closest<HTMLElement>('[role="status"]');

/** Opens Mei from Edit card's search, and waits for her form. */
async function openMei(user: UserEvent) {
  await user.click(await screen.findByRole('link', {name: /^Mei\b/}));
  return nameField();
}

/** Renames the open card RENAMED, and waits for Save to come on. */
async function rename(user: UserEvent) {
  const field = await nameField();
  await user.clear(field);
  await user.type(field, RENAMED);
  await waitFor(() => expect(saveButton()).toBeEnabled());
}

/** Fills a card New reveal can publish, as StudioPage.test.tsx's fillCard does: a Character in Amber's block, with its scan. */
async function fillNewCard(user: UserEvent) {
  await user.type(screen.getByRole('textbox', {name: 'Collector number'}), String(inkBlock('Amber').first));
  await user.type(await nameField(), 'Wren');
  for (const [name, value] of [['Cost', '4'], ['Strength', '3'], ['Willpower', '5'], ['Lore', '2']] as const) {
    await user.type(screen.getByRole('textbox', {name}), value);
  }
  // The card panel's file input: the only one New reveal has.
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (input) await user.upload(input, pngFile('wren.png'));
  await waitFor(() => expect(screen.getByRole('button', {name: /^Publish/})).toBeEnabled());
}

/** A draft in each mode: a name typed in New reveal, and Mei renamed in Edit card (R-57 keeps both). */
async function twoDrafts(user: UserEvent) {
  await openMei(user);
  await user.click(screen.getByRole('button', {name: 'New reveal'}));
  await user.type(await nameField(), 'Wren');
  await user.click(screen.getByRole('button', {name: 'Edit card'}));
  await rename(user);
}

/**
 * Where a browser leaves focus once the focused Save button goes off: on <body> (HTML's focus fixup rule). jsdom
 * keeps it on the disabled button, so focus another control and let that go, as StudioPage.test.tsx does.
 */
function dropFocusToBody() {
  const link = screen.getByRole('link', {name: 'Load a different card'});
  act(() => {
    link.focus();
    link.blur();
  });
}

beforeEach(() => {
  // A block, not an arrow's value: mockReset() returns the mock, and Vitest calls a function a hook returns as its teardown.
  vi.mocked(commitCardEdit).mockReset();
  vi.mocked(commitCardImage).mockReset();
  vi.mocked(commitNewCard).mockReset();
  // Wide, so every field of the form shows at once.
  measured.width = STUDIO_WIDE_MIN;
  setCardList();
  stubFetch();
});

afterEach(() => {
  // The token store reads localStorage on every snapshot, so clearing it is the whole token reset.
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('StudioPage: finding a card in Edit card', () => {
  it('opens on the search, and a row opens its card with focus on the banner and the tab named (R-59, R-51)', async () => {
    const {router, user} = renderStudio('/studio?mode=edit');
    expect(screen.getByRole('heading', {level: 2, name: 'Find a card to edit'})).toBeInTheDocument();
    await openMei(user);
    expect(router.state.location.search).toBe(`?mode=edit&card=${MEI.id}`);
    await waitFor(async () => expect(await banner(MEI)).toHaveFocus());
    expect(document.title).toBe('Mei - Red Panda · Card studio · Inkweave admin');
    // Her data is the branch file's: Preview (R4-5f's chips read lowercase).
    expect(screen.getByText('preview')).toBeInTheDocument();
    // Renumbering changes the id, which goes by PR (R-91).
    expect(screen.getByRole('textbox', {name: 'Collector number'})).toHaveAttribute('readonly');
  });

  it('goes back to the search from Load a different card, with the query kept and focus in the field (R-59)', async () => {
    const {user} = renderStudio('/studio?mode=edit');
    await user.type(searchField(), 'mei');
    await openMei(user);
    await user.click(screen.getByRole('link', {name: 'Load a different card'}));
    await waitFor(() => expect(searchField()).toHaveFocus());
    expect(searchField()).toHaveValue('mei');
  });

  it('reads loading, not missing, for a deep link while the card list loads, and leaves focus alone after', async () => {
    setCardList({cards: [], isLoading: true});
    renderStudio(studioHref('edit', MEI.id));
    expect(screen.getByText('Loading the card…')).toBeInTheDocument();
    expect(screen.queryByText(/^No card has the id/)).not.toBeInTheDocument();

    setCardList();
    expect(await banner(MEI)).toBeInTheDocument();
    // A deep link is no one's action in the page, so nothing asks for the handoff.
    expect(document.body).toHaveFocus();
  });

  it("hands focus to the search once the card list's Retry lands (R-59)", async () => {
    setCardList({cards: [], error: new Error('HTTP 503')});
    const {user} = renderStudio('/studio?mode=edit');
    await user.click(screen.getByRole('button', {name: 'Retry'}));
    // The shell's CardDataProvider reloads the list; here the store does.
    setCardList();
    await waitFor(() => expect(searchField()).toHaveFocus());
  });

  it("opens a deep link's card once the card list's Retry lands, with focus on the banner (R-59)", async () => {
    setCardList({cards: [], error: new Error('HTTP 503')});
    const {user} = renderStudio(studioHref('edit', MEI.id));
    await user.click(screen.getByRole('button', {name: 'Retry'}));
    setCardList();
    await waitFor(async () => expect(await banner(MEI)).toHaveFocus());
  });

  it('says why an unknown id is not open, above the search; reached by a link, its line takes focus (R-29, R-59)', async () => {
    const {router} = renderStudio('/studio?mode=edit');
    act(() => void router.navigate(studioHref('edit', '999999')));
    const line = await screen.findByText(/^No card has the id/);
    expect(line).toHaveTextContent('No card has the id 999999 in the card list or in previewCards.json.');
    await waitFor(() => expect(line).toHaveFocus());
    expect(searchField()).toBeInTheDocument();
  });

  it("says why a preview card the branch file dropped can't be saved, and the line takes focus (R-66, R-59)", async () => {
    // Mei is still on inkweave.ink, but previewCards.json on the branch no longer holds her.
    stubFetch(() => fileOf([VARIANTS_ENTRY]));
    const {router} = renderStudio('/studio?mode=edit');
    act(() => void router.navigate(studioHref('edit', MEI.id)));
    const line = await screen.findByText(/is no longer in previewCards\.json/);
    expect(line).toHaveTextContent(goneNote(MEI));
    await waitFor(() => expect(line).toHaveFocus());
    expect(searchField()).toBeInTheDocument();
  });

  it('waits on a failed read for a preview card, and opens it with focus on the banner once Retry lands (R-71, R-59)', async () => {
    let reads = 0;
    stubFetch(() => (++reads === 1 ? refusal({status: 500, message: 'Server Error'}) : fileOf(FILE)));
    const {user} = renderStudio(studioHref('edit', MEI.id));
    expect(await screen.findByText(/opens once previewCards\.json can be read/)).toHaveTextContent(
      `Card ${MEI.id} opens once previewCards.json can be read.`,
    );
    await user.click(screen.getByRole('button', {name: 'Read previewCards.json again'}));
    await waitFor(async () => expect(await banner(MEI)).toHaveFocus());
  });

  it('opens a released card image-only, straight from the card list, while previewCards.json still reads (R-61, R-71)', async () => {
    stubFetch(never);
    renderStudio(studioHref('edit', RELEASED_CARD.id));
    expect(await banner(RELEASED_CARD)).toBeInTheDocument();
    expect(screen.getByText('released')).toBeInTheDocument();
    expect(screen.getByText('Card data comes from LorcanaJSON; only the image can be replaced here.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', {name: 'Name'})).not.toBeInTheDocument();
    expect(screen.queryByRole('region', {name: 'Synergies'})).not.toBeInTheDocument();
  });

  it('opens a card only the branch file holds, not deployed yet, with no analytics link (R-66, R-33)', async () => {
    stubFetch(() => fileOf([...FILE, BRANCH_ONLY_ENTRY]));
    renderStudio(studioHref('edit', WREN.id));
    expect(await banner(WREN)).toBeInTheDocument();
    expect(screen.getByText('not deployed yet')).toBeInTheDocument();
    expect(screen.queryByRole('link', {name: 'View card analytics'})).not.toBeInTheDocument();
  });

  it('shows a failed read beside the search, and hands focus to the field once Retry lands (R-71, R-59)', async () => {
    let reads = 0;
    stubFetch(() => (++reads === 1 ? refusal({status: 500, message: 'Server Error'}) : fileOf(FILE)));
    const {user} = renderStudio('/studio?mode=edit');
    await user.click(await screen.findByRole('button', {name: 'Read previewCards.json again'}));
    await waitFor(() => expect(searchField()).toHaveFocus());
    expect(screen.queryByText(/^Could not read previewCards\.json/)).not.toBeInTheDocument();
  });

  it('reads previewCards.json again after a later read failed, and hands focus to the field (R-71, R-59)', async () => {
    let reads = 0;
    // The first read lands; the read after the save fails; Retry's lands.
    stubFetch(() => (++reads === 2 ? refusal({status: 500, message: 'Server Error'}) : fileOf(FILE)));
    vi.mocked(commitCardEdit).mockResolvedValue({commitUrl: COMMIT_URL});
    const {user} = renderStudio('/studio?mode=edit');
    await openMei(user);
    await rename(user);
    await user.click(saveButton());
    await screen.findByRole('link', {name: 'View commit'});
    await waitFor(() => expect(reads).toBe(2));

    await user.click(screen.getByRole('link', {name: 'Load a different card'}));
    await user.click(await screen.findByRole('button', {name: 'Read previewCards.json again'}));
    await waitFor(() => expect(searchField()).toHaveFocus());
    expect(reads).toBe(3);
    expect(screen.queryByText(/^Could not read previewCards\.json/)).not.toBeInTheDocument();
  });

  it('offers Forget token for a read GitHub refuses, and forgets at once while nothing is dirty (R-26, R-84)', async () => {
    stubFetch(() => refusal({status: 401, message: 'Bad credentials'}));
    const confirm = vi.spyOn(window, 'confirm');
    const {user} = renderStudio('/studio?mode=edit');
    await user.click(await screen.findByRole('button', {name: 'Forget token'}));
    expect(confirm).not.toHaveBeenCalled();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    await waitFor(() => expect(screen.getByLabelText('GitHub token')).toHaveFocus());
  });
});

describe('StudioPage: saving in Edit card', () => {
  it("saves a field edit with New reveal's note, and keeps the card open on its new baseline (R-70)", async () => {
    vi.mocked(commitCardEdit).mockResolvedValue({commitUrl: COMMIT_URL});
    const {user} = renderStudio('/studio?mode=edit');
    await openMei(user);
    await rename(user);
    await user.click(saveButton());

    const outcome = outcomeOf(await screen.findByRole('link', {name: 'View commit'}));
    expect(outcome).toHaveTextContent(/^Committed\./);
    expect(outcome).toHaveTextContent(newRevealNote());
    expect(commitCardEdit).toHaveBeenCalledWith(expect.objectContaining({loaded: PREVIEW_ENTRY, image: null}));
    expect(await nameField()).toHaveValue(RENAMED);
    expect(saveButton()).toBeDisabled();
  });

  it("replaces a released card's image with the image note, and the outcome takes focus off <body> (R-59)", async () => {
    let land: (result: {commitUrl: string}) => void = () => {};
    vi.mocked(commitCardImage).mockReturnValue(new Promise((resolve) => (land = resolve)));
    const {user} = renderStudio(studioHref('edit', RELEASED_CARD.id));
    await user.upload(await screen.findByLabelText('Click to replace image'), pngFile('lantern.png'));
    await waitFor(() => expect(saveButton()).toBeEnabled());
    const save = saveButton();
    await user.click(save);
    expect(save).toHaveTextContent('Saving…');

    dropFocusToBody();
    await act(async () => land({commitUrl: COMMIT_URL}));
    const outcome = outcomeOf(screen.getByRole('link', {name: 'View commit'}));
    expect(outcome).toHaveTextContent(IMAGE_NOTE);
    await waitFor(() => expect(outcome).toHaveFocus());
  });

  it('holds Discard while a save runs, and offers it again once the save settles (R4-4c, R-70)', async () => {
    let fail: (error: Error) => void = () => {};
    vi.mocked(commitCardEdit).mockReturnValue(new Promise((_, reject) => (fail = reject)));
    const {user} = renderStudio('/studio?mode=edit');
    await openMei(user);
    await rename(user);
    const discard = () => screen.getByRole('button', {name: 'Discard all changes'});
    expect(discard()).toBeEnabled();
    await user.click(saveButton());
    // Discard now would put back the loaded form, which reads as a change undoing the save once it lands (R-70).
    expect(discard()).toBeDisabled();

    // A save that fails keeps the edits, so Discard stays, and comes back on.
    await act(async () => fail(new Error('GitHub 500 on /repos/Doberjohn/inkweave/git/trees: {"message":"Server Error"}')));
    expect(discard()).toBeEnabled();
    expect(await nameField()).toHaveValue(RENAMED);
    // Only a running save holds it: an edit Save refuses (a blank name) leaves Discard on.
    await user.clear(await nameField());
    expect(saveButton()).toBeDisabled();
    expect(discard()).toBeEnabled();
  });

  it('refuses a stale save, and Load it again keeps the edits that apply, with focus on what it did (R-67, R-68)', async () => {
    let reads = 0;
    // Someone retitled the franchise on the branch: the rename doesn't touch it, so it still applies.
    const changed = {...PREVIEW_ENTRY, franchise: 'Turning Red (2022)'};
    stubFetch(() => fileOf(++reads === 1 ? FILE : [changed, VARIANTS_ENTRY]));
    vi.mocked(commitCardEdit).mockRejectedValue(new StaleCardError(`Card ${MEI.id} changed on master since you loaded it. Load it again.`));
    const {user} = renderStudio('/studio?mode=edit');
    await openMei(user);
    await rename(user);
    await user.click(saveButton());

    await user.click(await screen.findByRole('button', {name: 'Load it again'}));
    // The outcome line says what Load it again kept (R4-5e), and takes focus once the re-read lands.
    await waitFor(() => expect(screen.getByText(loadAgainNote({dropped: 0}))).toHaveFocus());
    expect(await nameField()).toHaveValue(RENAMED);
  });

  it('offers Forget token for a save GitHub refuses, and asks first while the draft is dirty (R-26, R-84)', async () => {
    vi.mocked(commitCardEdit).mockRejectedValue(new Error(REJECTED_SAVE));
    const {user} = renderStudio('/studio?mode=edit');
    await openMei(user);
    await rename(user);
    await user.click(saveButton());
    const forget = await screen.findByRole('button', {name: 'Forget token'});

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.click(forget);
    expect(confirm).toHaveBeenCalledWith('Forget the token and drop your Edit card changes?');
    expect(localStorage.getItem(TOKEN_KEY)).toBe('tok');

    confirm.mockReturnValue(true);
    await user.click(forget);
    await waitFor(() => expect(screen.getByLabelText('GitHub token')).toHaveFocus());
  });

  it('reads previewCards.json again once a New reveal publish lands, so the card is in the search at once (R-66)', async () => {
    let reads = 0;
    // The workspace reads the file as it mounts; the read after the publish finds the new card.
    stubFetch(() => fileOf(++reads === 1 ? FILE : [...FILE, BRANCH_ONLY_ENTRY]));
    vi.mocked(commitNewCard).mockResolvedValue({commitUrl: COMMIT_URL});
    const {user} = renderStudio('/studio');
    await fillNewCard(user);
    await user.click(screen.getByRole('button', {name: /^Publish/}));
    await screen.findByRole('link', {name: 'View commit'});

    await user.click(screen.getByRole('button', {name: 'Edit card'}));
    await user.type(searchField(), 'wren');
    expect(await screen.findByRole('link', {name: /^Wren\b/})).toHaveTextContent('not deployed yet');
    expect(reads).toBe(2);
  });
});

describe('StudioPage: the guard and the view in Edit card', () => {
  it('asks before a card change drops the Edit draft, naming only it, and Stay keeps it (R-58)', async () => {
    const {router, user} = renderStudio('/studio?mode=edit');
    await twoDrafts(user);
    await user.click(screen.getByRole('link', {name: 'Load a different card'}));
    const dialog = await leaveDialog();
    expect(dialog).toHaveTextContent(LEAVES_CARD);
    expect(dialog).not.toHaveTextContent('New reveal');

    await user.click(within(dialog).getByRole('button', {name: 'Stay on this page'}));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(router.state.location.search).toBe(`?mode=edit&card=${MEI.id}`);
    expect(await nameField()).toHaveValue(RENAMED);
  });

  it('names both drafts when leaving the studio, and a card left is opened fresh (R-58, R-46)', async () => {
    const {router, user} = renderStudio('/studio?mode=edit');
    await twoDrafts(user);
    act(() => void router.navigate('/'));
    expect(await leaveDialog()).toHaveTextContent(`${LEAVES_REVEAL} ${LEAVES_EDIT}`);
    await user.click(screen.getByRole('button', {name: 'Stay on this page'}));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));

    await user.click(screen.getByRole('link', {name: 'Load a different card'}));
    await user.click(within(await leaveDialog()).getByRole('button', {name: 'Leave this page'}));
    expect(await openMei(user)).toHaveValue('Mei');
  });

  it('says a card change mid-save leaves the save running (R-58)', async () => {
    vi.mocked(commitCardEdit).mockReturnValue(new Promise(() => {}));
    const {user} = renderStudio('/studio?mode=edit');
    await openMei(user);
    await rename(user);
    await user.click(saveButton());
    await user.click(screen.getByRole('link', {name: 'Load a different card'}));
    expect(await leaveDialog()).toHaveTextContent(
      "A save to master is in progress. Leaving won't stop it, and you won't see whether it landed.",
    );
  });

  it("gives each card a fresh view: the open accordion section doesn't carry over (R-46)", async () => {
    measured.width = 0;
    const {router, user} = renderStudio(studioHref('edit', MEI.id));
    await user.click(await screen.findByRole('button', {name: /^Card text/}));
    expect(screen.getByRole('button', {name: /^Card text/})).toHaveAttribute('aria-expanded', 'true');

    act(() => void router.navigate(studioHref('edit', MING.id)));
    expect(await banner(MING)).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /^Card text/})).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', {name: /^Identity/})).toHaveAttribute('aria-expanded', 'true');
  });
});
```

Keep these as written:
- **The queries use the components' own words:** the banner's `h2` "Editing {name} {version}" (R4-5f), the field "Search cards", "Read previewCards.json again", "Click to replace image" (R4-5d's pill), "Load it again" (R4-5e), and the lowercase chips `preview`, `released` and `not deployed yet`. Where a component landed other words, change the query, not the component.
- **`dropFocusToBody`** stands in for HTML's focus fixup rule, which jsdom doesn't apply, as R4-6a's publish test does.
- **Focus is awaited on the element,** never through `document.activeElement`'s text. `<body>` contains every line, so a text match on it passes before focus moves; the first draft of the stale case flaked that way, one run in three.
- **The stale case** retitles the franchise on the branch, which the rename doesn't touch. An edit to `fullText` alone would make the fresh entry fail `roundTrips` (its `fullTextSections` would no longer match), and the card would reopen image-only.
- **Five cases hold paths the first draft left untested** (verifier): a deep link's card opening after the card list's Retry, with focus on its banner; `gone`'s line; a set-14 card waiting on a failed read, then opening with focus on the banner; Retry after a later read failed (it fails until Step 10); and R-66's reload after a publish, through the real New reveal pane. `fillNewCard` is `StudioPage.test.tsx`'s `fillCard`, with Wren's name. The publish case reads the file twice, as the workspace mounts and once the publish lands; it is the only test of the workspace's `useReloadAfterPublish` call.
- **The Discard case** (cross-task critic, re-base note 13) settles its save by failing it: a save that lands empties the diff (R-70), and Discard goes with it. The blank name then turns Save off with the edits still listed, so the case also tells `busy={edit.saving}` from `busy={!edit.canSave}`.

Run:

```bash
pnpm vitest run --project app src/tools/studio/__tests__/StudioEdit.test.tsx
```

Expected: `Test Files  1 failed (1)`, `Tests  23 failed (23)`. Edit mode renders nothing yet. So the first case fails with `Unable to find an accessible element with the role "heading" and name "Find a card to edit"`, and the rest time out waiting for the search, a banner or a field.

- [ ] **Step 9: Add the Edit pane, and wire the workspace**

Create `src/tools/studio/EditPane.tsx`:

```tsx
import {useRef, useState, type CSSProperties, type ReactNode} from 'react';
import {CtaButton, useCardDataContext} from '../../app-bridge';
import {useTakeHandoff, type FocusHandoff} from '../../shell/focusHandoff';
import {Notice} from '../../ui/Notice';
import type {RevealCardForm} from '../reveal/buildPreviewCard';
import {goneNote} from './branchCards';
import {IMAGE_ONLY_NOTES} from './cardEdit';
import {ChangeList} from './components/ChangeList';
import {CommitOutcome} from './components/CommitOutcome';
import {EditingBanner} from './components/EditingBanner';
import {EditSearch} from './components/EditSearch';
import {ReleasedCardFacts} from './components/ReleasedCardFacts';
import {StudioCardPanel} from './components/StudioCardPanel';
import {StudioForm} from './components/StudioForm';
import {StudioSlots} from './components/StudioSlots';
import {SynergyPanel} from './components/SynergyPanel';
import type {EditLookup} from './editorState';
import {searchCards} from './editSearch';
import {editNote, saveLabel} from './studioCopy';
import type {StudioLayout} from './studioLayout';
import {STUDIO_GAP} from './studioStyles';
import type {CardEditorController} from './useCardEditor';

/** Edit locks the collector number: renumbering changes the card's id, which goes by PR (R-91 1). */
const EDIT_LOCKS: ReadonlySet<keyof RevealCardForm> = new Set<keyof RevealCardForm>(['collectorNumber']);

/** A row of its own across the studio's root: the search, the loading line and the Editing banner. */
const WHOLE_ROW: Readonly<Record<StudioLayout, CSSProperties>> = {
  wide: {gridColumn: '1 / -1', minWidth: 0},
  narrow: {flex: '1 1 100%', minWidth: 0},
};
// The handoff draws the aside as one column, Save across its width (README §7).
const ASIDE: CSSProperties = {display: 'flex', flexDirection: 'column', gap: STUDIO_GAP};
const SAVE: CSSProperties = {width: '100%'};
const LINE: CSSProperties = {margin: 0};

export interface EditPaneProps {
  edit: CardEditorController;
  /** The card the URL names (studioCardOf), for the line while it waits on a failed read of previewCards.json. */
  cardId: string | null;
  layout: StudioLayout;
  /** The page's (R-59): StudioPage asks for it when the URL's card changes, and when the card list's Retry lands. */
  handoff: FocusHandoff;
  /** R-26's Forget token; StudioWorkspace asks first while a draft is dirty (R-84). */
  onForgetToken: () => void;
}

type ReadyLookup = Extract<EditLookup, {kind: 'ready'}>;
type EntryLookup = Exclude<EditLookup, {kind: 'ready' | 'loading'}>;
type PartProps = Pick<EditPaneProps, 'edit' | 'handoff' | 'onForgetToken'>;

/**
 * Whether the outcome line shows something: a save's commit or failure, or
 * what a Load it again kept. While it does, the outcome is the open card's
 * focus target (CommitOutcome takes the handoff once it shows), so the banner
 * leaves the handoff alone: one handoff, never two takers (R-59).
 */
function outcomeShowing({result, saveError, dropped}: Pick<CardEditorController, 'result' | 'saveError' | 'dropped'>) {
  return [result, saveError, dropped].some((value) => value !== null);
}

/**
 * A control whose read replaces it: it asks for the handoff once the read
 * lands, never on the click, so the view that replaced it takes focus, and a
 * read that fails again leaves none waiting (TuningAside's readAgainWith). The
 * controller's reads resolve after the landing renders (R4-4a), so that view
 * is there to take it.
 */
function askWhenLanded(read: () => Promise<boolean>, handoff: FocusHandoff): () => void {
  return () => {
    void read().then((landed) => {
      if (landed) handoff.request();
    });
  };
}

/**
 * A line for a state with no control of its own, as R3's FocusNotice is: it
 * takes a pending handoff after a link opened a card the studio can't, so
 * focus lands on what says why.
 */
function FocusLine({handoff, children}: {handoff: FocusHandoff; children: ReactNode}) {
  const ref = useRef<HTMLDivElement>(null);
  useTakeHandoff(handoff, ref, 'p');
  return (
    <div ref={ref}>
      <Notice>
        <p tabIndex={-1} style={LINE}>
          {children}
        </p>
      </Notice>
    </div>
  );
}

/**
 * Why the URL's card isn't open, above the search: an id neither the card list
 * nor previewCards.json holds (R-29), a card that waits on a failed read of the
 * file (R-71; the search shows the read's error and its way out), or a preview
 * id the file no longer holds (R-66). Nothing for the bare search, or for a
 * failed card list, whose own error takes the field's place.
 */
function EntryNotice({lookup, cardId, handoff}: {lookup: EntryLookup; cardId: string | null; handoff: FocusHandoff}) {
  switch (lookup.kind) {
    case 'missing':
      return (
        <FocusLine handoff={handoff}>
          No card has the id <code>{lookup.cardId}</code> in the card list or in previewCards.json. Cards from sets
          before 9 rotated out of Core, and a preview id changes when its card is released: find it by name below.
        </FocusLine>
      );
    case 'fileFailed':
      return (
        <FocusLine handoff={handoff}>
          Card <code>{cardId}</code> opens once previewCards.json can be read.
        </FocusLine>
      );
    case 'gone':
      return <FocusLine handoff={handoff}>{goneNote(lookup.card)}</FocusLine>;
    default:
      return null;
  }
}

/**
 * Edit card's search (R4-5f) over the controller's cards: the card list plus
 * the cards only the branch file holds (R-66), the file's first (R-76). The
 * card list's Retry asks for nothing here: StudioPage asks once its error
 * clears. The file's asks once its read lands.
 */
function SearchView({edit, handoff, onForgetToken, query, onQuery, notice}: PartProps & {
  query: string;
  onQuery: (query: string) => void;
  notice: ReactNode;
}) {
  const cardList = useCardDataContext();
  const {rows, total} = searchCards({
    cards: edit.searchCards,
    query,
    previewIds: edit.previewFile.previewIds,
    branchOnlyIds: edit.branchOnlyIds,
  });
  return (
    <EditSearch
      rows={rows}
      total={total}
      query={query}
      onQuery={onQuery}
      list={{loading: cardList.isLoading, error: cardList.error, onRetry: cardList.retryLoad}}
      file={{error: edit.previewFile.error, onRetry: askWhenLanded(edit.retry, handoff), onForgetToken}}
      notice={notice}
      handoff={handoff}
    />
  );
}

/** A preview card's form, the collector number locked (R-91 1); or, for an image-only card, its facts and why (R-61, R-65). */
function EditForm({edit, ready, layout}: {edit: CardEditorController; ready: ReadyLookup; layout: StudioLayout}) {
  if (ready.imageOnly) return <ReleasedCardFacts card={ready.card} note={IMAGE_ONLY_NOTES[ready.imageOnly]} />;
  if (edit.form === null) return null;
  return (
    <StudioForm form={edit.form} errors={edit.validation.errors} onChange={edit.patchForm} layout={layout} locked={EDIT_LOCKS} />
  );
}

/**
 * The aside: the changes as a diff, the synergies of a card whose fields
 * change (none for an image-only card, R-61), Save, and the outcome, its note
 * picked by whether an image went with the commit. Save asks for the handoff
 * once the commit settles: it went off while it ran, which drops focus to
 * <body> in a browser, so the outcome line takes it. Discard is held while it
 * runs, as Save is (R4-4c). Load it again asks once its re-read lands, and
 * the line then says what it kept (R-68).
 */
function EditAside({edit, handoff, onForgetToken}: PartProps) {
  const save = () => void edit.save().then(handoff.request);
  return (
    <aside aria-label="Changes" style={ASIDE}>
      <ChangeList rows={edit.changes} onDiscard={edit.discard} busy={edit.saving} />
      {edit.form !== null && <SynergyPanel groups={edit.synergyGroups} />}
      <CtaButton type="button" onClick={save} disabled={!edit.canSave} style={SAVE}>
        {saveLabel(edit)}
      </CtaButton>
      <CommitOutcome
        result={edit.result}
        error={edit.saveError}
        note={editNote(edit.result)}
        dropped={edit.dropped}
        onLoadAgain={edit.failure === 'stale' ? askWhenLanded(edit.loadAgain, handoff) : undefined}
        onForgetToken={onForgetToken}
        handoff={handoff}
      />
    </aside>
  );
}

/**
 * One card open in Edit: the Editing banner over the card panel, the form (or
 * the facts) and the aside, in the layout's slot order (R-63). EditPane keys it
 * by the card's id (R-46), so nothing a view holds, such as the open accordion
 * section, carries over to the next card. The banner's h2 takes the page's
 * handoff while the outcome line has nothing to say; after that the line does.
 * A ready card always has its tag; 'Released' only narrows the type.
 */
function CardEditor({edit, ready, layout, handoff, onForgetToken}: PartProps & {ready: ReadyLookup; layout: StudioLayout}) {
  return (
    <>
      <div style={WHOLE_ROW[layout]}>
        <EditingBanner
          card={ready.card}
          tag={edit.tag ?? 'Released'}
          deployed={edit.deployed}
          handoff={outcomeShowing(edit) ? undefined : handoff}
        />
      </div>
      <StudioSlots
        layout={layout}
        slots={{
          card: (
            <StudioCardPanel
              card={edit.previewCard}
              mode="edit"
              layout={layout}
              staged={{name: edit.imageName, error: edit.imageError}}
              current={ready.card}
              onImageChange={edit.onImageChange}
              onRevertImage={edit.revertImage}
            />
          ),
          form: <EditForm edit={edit} ready={ready} layout={layout} />,
          aside: <EditAside edit={edit} handoff={handoff} onForgetToken={onForgetToken} />,
        }}
      />
    </>
  );
}

/**
 * Edit card (R-2): one state at a time, in the lookup's order (R3's
 * cardPageState). A ready card opens in the editor; one that loads says so;
 * every other state is the search, with a line above it saying why the URL's
 * card isn't open. The pane holds the search's query, so it survives opening
 * a card and coming back. The controller lives in StudioWorkspace, so a mode
 * switch keeps the draft (R-57).
 */
export function EditPane({edit, cardId, layout, handoff, onForgetToken}: EditPaneProps) {
  const [query, setQuery] = useState('');
  const {lookup} = edit;
  const parts = {edit, handoff, onForgetToken};
  if (lookup.kind === 'ready') return <CardEditor key={lookup.card.id} {...parts} ready={lookup} layout={layout} />;
  if (lookup.kind === 'loading') {
    return (
      <div style={WHOLE_ROW[layout]}>
        <Notice>Loading the card…</Notice>
      </div>
    );
  }
  return (
    <div style={WHOLE_ROW[layout]}>
      <SearchView
        {...parts}
        query={query}
        onQuery={setQuery}
        notice={<EntryNotice lookup={lookup} cardId={cardId} handoff={handoff} />}
      />
    </div>
  );
}
```

Keep these as written:
- **One handoff, and never two takers at once.** The banner gets `handoff` only while `outcomeShowing(edit)` is false, and `CommitOutcome` takes it only while it shows something (R4-5e). The notices render before `EditSearch`'s field, so a notice wins when both are mounted (R4-5f).
- **`askWhenLanded`** asks only once its read has landed, never on the click. `retry` and `loadAgain` resolve after the landing renders (R4-4a, R4-4c), so the view that replaced the control is there to take it.
- **`key={lookup.card.id}`** sits on `CardEditor` and on nothing above it, so the search's query survives.
- **`EDIT_LOCKS`** is R4-5b's constant: `StudioForm` shows a locked field read-only, with its reason.
- **`edit.tag ?? 'Released'`** only narrows the type: a ready card always has its tag.
- **`busy={edit.saving}`** holds Discard while a save runs, as Save is held (R4-4c's hand-off, R4-5e's prop). Discarding mid-save would put back the loaded form, which reads as a change undoing the save once it lands on the new baseline (R-70). It follows `saving`, not `canSave`: a form Save refuses can still be discarded.
- **The search's file Retry is `edit.retry`,** not `previewFile.reload`, because `retry` returns the promise the handoff waits on. Step 10 makes it read after any failed read of the file.

In `src/tools/studio/StudioWorkspace.tsx` (R4-6a's), make five changes.

Add the pane's import after `import {useRevealAdmin} from '../reveal/useRevealAdmin';`:

```tsx
import {EditPane} from './EditPane';
```

Add the hook's import after `import {useCardEditor} from './useCardEditor';`:

```tsx
import {useReloadAfterPublish} from './useReloadAfterPublish';
```

`StudioWorkspace`'s doc comment gains one sentence. Before:

```tsx
 * narrow (R-64), and the active pane fills its slots in that layout's order
 * (R-63).
 */
```

After:

```tsx
 * narrow (R-64), and the active pane fills its slots in that layout's order
 * (R-63). A New reveal publish that lands reads Edit's file again (R-66).
 */
```

After `const forgetToken = useForgetToken({drafts, handoff});`, add:

```tsx
  useReloadAfterPublish({published: ctrl.result, reload: edit.reloadFile});
```

And the root's pane. Before:

```tsx
        {mode === 'new' && <NewRevealPane ctrl={ctrl} layout={layout} handoff={handoff} onForgetToken={forgetToken} />}
```

After:

```tsx
        {mode === 'new' ? (
          <NewRevealPane ctrl={ctrl} layout={layout} handoff={handoff} onForgetToken={forgetToken} />
        ) : (
          <EditPane edit={edit} cardId={card} layout={layout} handoff={handoff} onForgetToken={forgetToken} />
        )}
```

Run the Step 8 command. Expected: `Tests  1 failed | 22 passed (23)`. The one failure is "reads previewCards.json again after a later read failed": `expect(element).toHaveFocus()`, with focus still on "Read previewCards.json again", whose click read nothing (re-base note 4). Step 10 fixes it.

- [ ] **Step 10: Make Retry read the file after a later read failed**

In `src/tools/studio/useCardEditor.ts`, R4-4c's `retryReads` and its doc comment. Before:

```ts
/**
 * Reads again what failed: the card list (its retryLoad) and previewCards.json.
 * Resolves true once the file's re-read lands, false when it fails or the file
 * hadn't failed. The card list's retry can't be awaited (retryLoad returns
 * nothing), so the page watches its error clear, as R3-7 does (R-59).
 */
function retryReads({list, file}: RetryInput): Promise<boolean> {
  if (list.error) list.retryLoad();
  if (file.status !== 'error') return Promise.resolve(false);
```

After:

```ts
/**
 * Reads again what failed: the card list (its retryLoad) and previewCards.json,
 * whether its first read failed or a later one did (the error the search shows,
 * previewFileView's). Resolves true once the file's re-read lands, false when it
 * fails or no read of the file had failed. The card list's retry can't be awaited
 * (retryLoad returns nothing), so the page watches its error clear, as R3-7 does
 * (R-59).
 */
function retryReads({list, file}: RetryInput): Promise<boolean> {
  if (list.error) list.retryLoad();
  if (previewFileView(file).error === null) return Promise.resolve(false);
```

Keep it as written:
- **`previewFileView(file).error`** is the error the search shows (R4-4b): the first read's, or R4-4a's `reloadError` once a later read failed. Retry now reads in both cases, and still resolves `false` at once when only the card list failed, as R4-4c's Step 11 case pins.
- **`previewFileView`** is already in the `./editorState` import. No branch is added: `retryReads` stays at complexity 3, and the module at 0 of 6 primitive parameters.

Run:

```bash
pnpm vitest run --project app src/tools/studio/__tests__/StudioEdit.test.tsx src/tools/studio/__tests__/useCardEditor.test.ts src/tools/studio/__tests__/useCardEditor.save.test.ts src/tools/studio/__tests__/useCardEditorBranch.test.ts
```

Expected: `Test Files  4 passed (4)`: the page's 23, and the controller's three files unchanged (46 tests in the verifier's sandbox, 18, 20 and 8, from R4-4b to R4-4d's drafts; their own count if they landed more).

- [ ] **Step 11: Run the task's tests together**

```bash
pnpm vitest run --project app src/tools/studio/__tests__/StudioEdit.test.tsx src/tools/studio/__tests__/StudioPage.test.tsx src/tools/studio/__tests__/studioCopy.test.ts src/tools/studio/__tests__/useStudioHandoff.test.ts src/tools/studio/__tests__/useReloadAfterPublish.test.ts src/tools/studio/__tests__/useCardEditor.test.ts src/tools/studio/__tests__/useCardEditor.save.test.ts src/tools/studio/__tests__/useCardEditorBranch.test.ts
```

Expected: `Test Files  8 passed (8)`, `Tests  103 passed (103)`: 23, 14, 12, 7 and 1, plus the controller's 46 (or Step 10's count). R4-6a's `StudioPage.test.tsx` runs unchanged beside the new pane. The run prints no `act(...)` warning, and no "Cannot update a component while rendering a different component".

- [ ] **Step 12: Lint and typecheck**

```bash
pnpm exec eslint --max-warnings 0 src/tools/studio/EditPane.tsx src/tools/studio/useStudioHandoff.ts src/tools/studio/useReloadAfterPublish.ts src/tools/studio/studioCopy.ts src/tools/studio/StudioPage.tsx src/tools/studio/StudioWorkspace.tsx src/tools/studio/useCardEditor.ts src/tools/studio/__tests__/StudioEdit.test.tsx src/tools/studio/__tests__/useStudioHandoff.test.ts src/tools/studio/__tests__/useReloadAfterPublish.test.ts src/tools/studio/__tests__/studioCopy.test.ts
```

Expected: no output.

```bash
pnpm typecheck
```

Expected: it builds the engine, then `tsc -b` reports nothing.

- [ ] **Step 13: Code Health**

Run CodeScene's `code_health_review` on each changed file: `EditPane.tsx`, `useStudioHandoff.ts`, `useReloadAfterPublish.ts`, `studioCopy.ts`, `StudioPage.tsx`, `StudioWorkspace.tsx`, `useCardEditor.ts` and the four test files. Each should score 10.0 with no findings. Re-base note 11 has the hand count. The PR gate is stricter than the local tool, so keep to it:
- cyclomatic complexity 8 or less per function, lambdas included (the highest here is 4);
- 4 arguments at most (the highest here is 2);
- under 30% primitive parameters per module (the highest here is 23%, `StudioEdit.test.tsx` with its lambdas);
- no `a || b || c` chains.

If a finding appears, fix it, review again, and confirm with `code_health_score`.

- [ ] **Step 14: Commit**

Stage the task's paths, in a Bash call of its own:

```bash
git add src/tools/studio/EditPane.tsx src/tools/studio/useStudioHandoff.ts src/tools/studio/useReloadAfterPublish.ts src/tools/studio/studioCopy.ts src/tools/studio/StudioPage.tsx src/tools/studio/StudioWorkspace.tsx src/tools/studio/useCardEditor.ts src/tools/studio/__tests__/StudioEdit.test.tsx src/tools/studio/__tests__/useStudioHandoff.test.ts src/tools/studio/__tests__/useReloadAfterPublish.test.ts src/tools/studio/__tests__/studioCopy.test.ts
```

Run `pre_commit_code_health_safeguard`, and go on only when it passes. Then, only after the owner approves, commit with the Bash tool (never PowerShell), in one unpiped call:

```bash
USER_APPROVED=1 git commit -m "feat(studio): add Edit card to Card studio (#24)"
```

- **The hook.** Husky's pre-commit runs the full lint and `test:run`. Never pass `--no-verify`.
- **Workers.** If Vitest fails to start its workers under load, stop this session's preview servers, wait out other sessions' runs, and retry.
- **Afterwards,** `git status --short -- src` prints nothing.

### Hand-offs from R4-6b

- **R4-4c (the controller, if it hasn't landed).** Step 10's condition belongs in `retryReads` as R4-4c writes it. If R4-4c takes it, this task's Step 1 shows that and Step 10 only runs its tests. A hook case beside R4-4c's Step 11 retry case (a ready file with `reloadError`, `retry` resolving `true` once the read lands) would then pin it where it lives.
- **R4-6c (retiring `/reveal` and `/image`).**
  - **Its Step 9 item for `studioCopy.ts`** (`R4-06c-retire-old-routes.md:855`) finds nothing: no comment there cites `ImagePage.tsx:20` (`IMAGE_ON_MASTER`: "The image tool's go-live sentence, word for word"), and there is no `editCopy.ts`.
  - **The redirect to `studioHref('edit')`** is a REPLACE onto a new route element, so `useStudioHandoff` starts from it and asks for nothing. R4-6c's redirect cases, which assert that focus stays on `<body>` (its re-base note 1), hold.
  - **"Edit in Card studio"** lands on `/studio?mode=edit&card={id}` as a new page. The workspace mounts with that card, so nothing asks, as R4-6c's re-base note 7 has it.
- **R4-7 (docs).**
  - **CLAUDE.md:18.** `StudioPage`'s `useStudioHandoff` asks when the URL's `?card=` changes and when the card list's Retry lands, as `/cards` does (R3-7). The file's Retry and Load it again ask once their read lands, and Save once its commit settles.
  - **The runbook's Edit card section** can quote "Save changes to master", "Saving…", the two notes (`editNote`) and "Load a different card". It can also say R-66's rule: a card New reveal just published is in Edit's search at once, tagged "not deployed yet".
  - **Its Step 9 sweep** prints one line of this task's: `IMAGE_ON_MASTER`'s comment in `studioCopy.ts` ("The image tool's go-live sentence"), which its list already keeps as provenance.
- **R4-8 ("R4 as built").** Record these:
  - **Departures.**
    - The URL-driven handoff lives in `StudioPage`, as `useStudioHandoff`, and a move to no card asks too (R3's doesn't).
    - A `gone` card shows `goneNote` above the search, not R4-4d's suggested name-and-tag view.
    - The Editing banner sits in the measured root's first row, not full-bleed over it (re-base note 9).
    - R-66's reload is an effect keyed on the commit's link, through `useEffectEvent`: admin's first.
    - R4-4c's `retryReads` reads the file after any failed read (`previewFileView(file).error`), not only after a failed first read (re-base note 4, Step 10).
  - **File-structure rows** for `EditPane.tsx`, `useStudioHandoff.ts` and `useReloadAfterPublish.ts`, and this task's Produces block in the shared interfaces. Addition 11's `retry` comment gains "after any failed read of the file".
  - **One open defect, for the owner** (verifier, 2026-10-07): focus after "Leave this page" on a held card change.
    - **What happens.** The app's `useDialogFocus` (inside DialogShell) restores focus to the dialog's opener as the dialog closes, and only if the opener is still connected. The navigation that Leave lets through unmounts that opener, the banner's "Load a different card". The new view's taker then finds focus on the fading "Leave this page" button, so it leaves focus where it is (`focusUnmoved`), and focus falls to `<body>` when the panel unmounts.
    - **Evidence.** A jsdom probe in `sandbox-v-R4-6b` (open Mei, rename her, follow "Load a different card", choose Leave, wait for the dialog to go) ends with focus on `<body>`. R-59 wants the search field.
    - **Why it isn't fixed here.** The fix belongs in `src/shell`, for example the guard asking for a handoff once Leave's navigation lands, or `focusUnmoved` counting focus inside a closing dialog as unmoved; both are shared with /calibration. File it as a follow-up, or take it into R4-8's fix round, on the owner's word. Leaving `/studio` for another page isn't affected: a page change moves no focus (R3).
- **The owner's rehearsal (R-86).** Add two checks to its list:
  - open a card, edit it, follow "Load a different card", choose Leave, and see where focus lands (jsdom ends on `<body>`; R-59 wants the search field; see the open defect above);
  - the banner's and the search's alignment against the page title, at 1366 and 1440px (re-base note 9).
