> Part of [R: Admin redesign](../R-redesign.md), phase R4 ([R4-card-studio.md](R4-card-studio.md)). Read the main plan's decisions (R-57 to R-91 for R4), corrections, global constraints and shared interfaces, then the R4 header, first.

> **Re-base notes (R4-6a, 2026-10-07).** Re-based from the outline's Task R4-6 (`R4-card-studio.md:812-951`, written 2026-10-01 against the planned R1 code) onto `main @ e5e5029` (R1 to R3 as built, plus the pin bump), pin `upstream/inkweave` @ `16283a13`, on `feature/24-redesign-r4`. It follows decisions R-57 to R-91 and the 2026-10-07 audit (`r4-audit-full.json`'s "R4-6" entry; `r4-audit-synth.md`, "R4-6"). Sibling drafts were read as they stood at 16:40: R4-3a, R4-3b, R4-4a, R4-4b (and R4-4c's sandbox for `saving`), R4-5a, R4-5b, R4-5d and R4-5s. What changed and why:
> 1. **The split.** R4-6 is three tasks. This one builds the page and New reveal. R4-6b adds the Edit pane, and R4-6c retires `/reveal` and `/image`. So nothing is deleted here: `/studio` and its nav item go in beside the old ones, and in Edit mode the measured root stays empty until R4-6b's `EditPane` fills it. The outline's live rehearsal leaves the task: it is the owner's step after R4-6c (R-86).
> 2. **The gate (audit, blocking).** `GithubTokenGate` takes only `onSave` and renders an h2 under the page's own `PageLayout` (`GithubTokenGate.tsx:13`, R1-7). With no token, `StudioPage` renders `PageLayout title="Card studio" writes`, padded, with no `actions`, round the gate.
>    - **One departure from the header's addition 13.** With a token, `PageLayout` renders inside `StudioWorkspace`, not in `StudioPage` round both branches. `documentTitle` names Edit card's open card, and that card lives in `useCardEditor`, which runs under the gate (R-84). Each branch renders exactly one `PageLayout`, so writePages' invariants hold: one `h1`, one `main`, the branch notice and the tab title. `router.test.tsx`'s "one main landmark" case covers the swap. The focus handoff lives in `StudioPage`, above both, so Save token's request survives the swap.
>    - `flush` comes only with a token, so the gate keeps the body's padding (`PageLayout.tsx:57-59`).
> 3. **No `useUnsavedGuard` (audit, blocking; R-58, R2-5a's hand-off).** `StudioWorkspace` mounts the one `UnsavedChangesGuard`: `leaves` is R4-5a's `shouldBlockStudioNavigation`, and `message` is R4-5s's function form.
>    - **`studioUnsavedMessage` and `forgetTokenQuestion`** go in `studioPaths.ts`, as R4-5s's hand-off and the header place them. They build on `draftsAtRisk`, so the dialog names exactly the drafts the hold protects.
>    - **The whole helper lands here,** with both drafts and both in-flight lines, under one table test. R4-6b then needs no change to it, only its page test for a card change (R4-5s's hand-off: "if R4-6a leaves Edit's half to it"). Edit's line says "this card", since the helper gets no card name.
>    - **A hold that outlasts its draft still gets a line** (R4-5s's design note 3 and its hand-off). The guard ends a hold only once neither draft is dirty (`useUnsavedChangesGuard.ts:39-42`). So a card change held while an Edit save is in flight stays open once the save lands if New reveal is dirty, and `draftsAtRisk` then names nothing. The open dialog shows what the message returns, so the helper says "Your changes to this card are saved. Leaving the card drops nothing." rather than an empty question.
>    - Tests click the dialog's buttons, never `window.confirm`, through `createMemoryRouter`.
> 4. **Focus (R-59, R-48; audit, significant).** `StudioPage` holds the page's one `useFocusHandoff`. Two requests reach New reveal, and their takers never compete:
>    - **Save token** requests in its handler (`CalibrationPage.tsx:63-66`). New reveal's form slot takes it while no outcome shows: the form's first control. That is Collector number when wide, and Identity's accordion header when narrow (R4-5b: a wide header is a plain `h2`).
>    - **Publish** requests once its commit lands, failed or not, as the tuning aside reads again (`TuningAside.tsx:480-486`). A browser drops focus to `<body>` from a button that goes off, so R4-5e's `CommitOutcome`, which takes the handoff while it shows an outcome, puts focus on the outcome line. The form slot takes only while no outcome shows.
>    - **`publish` returns its promise.** `RevealAdminController.publish` becomes `() => Promise<void>`. It is one line: the body is already `async` (R4-3b). `RevealPage`'s `onClick={ctrl.publish}` still typechecks until R4-6c deletes it.
>    - **The in-page Forget token** (R-26) requests it too, and the gate's field takes it, as `TuningAside`'s `TokenGate` does (`:330-341`).
>    - **The mode switch** stays mounted in the header, so focus stays on it.
>    - **jsdom.** It keeps focus on a button that goes disabled, where a browser applies HTML's focus fixup rule. So the publish test drops focus to `<body>` by hand.
> 5. **R-84.** `StudioWorkspace` is keyed by the token, so both drafts live under the gate. The sidebar's Forget token drops them without asking. The in-page one, offered on a 401, asks first through `window.confirm(forgetTokenQuestion(drafts))` while a draft is dirty (`TuningAside.tsx:130-136`). New reveal's `CommitOutcome` offers it here. R4-6b passes the same `forgetToken` to Edit's offers.
> 6. **The layout (R-63, R-64).** `StudioWorkspace`'s root is the element `useContainerWidth` measures. It is present in every mode and state, and nothing conditional takes the ref.
>    - **The slots.** `StudioSlots` (new, in `components/`) renders the three regions in `STUDIO_SLOT_ORDER[layout]`, keyed by region. R4-5a's styles place them.
>    - **Panes.** Each pane fills the slots, and only the active pane renders. That keeps R4-5b's page-global `field-*` ids unique, and a mode switch resets view state such as the open accordion section.
>    - **A flip of the layout moves the keyed regions** and keeps their state. A browser may still drop focus from a moved node: narrow to wide moves the form, wide to narrow the card panel. A flip comes from a resize, so this is left to the owner's rehearsal (R-86).
>    - **The scrollbar flip R4-5a flagged.** `PageLayout`'s flush body gets `scrollbarGutter: 'stable'`. Otherwise, between about 1328 and 1345px of content, a scrollbar that came with the taller wide layout would flip it to narrow and back on each measure. This changes only the two flush pages. `/calibration`'s body nearly always scrolls, so there is no visible change there.
> 7. **The mode switch (R-57, R-91 4).** It is `SegmentedControl` in `PageLayout`'s `actions`. A change pushes `studioHref(mode, card)`, so Back returns to the other mode and the card rides along.
>    - It is a pair of pressed buttons, not links. It switches the page's own view, the URL holding that state, as `/calibration`'s rule rows set `?rule=` (`CalibrationPage.tsx:74`). R4-5a already reworded `SegmentedControl`'s comment.
>    - **`scrollKey={studioHref(mode, card)}`** (owner, 2026-10-07, in place of R-59's `card ?? mode`). Every mode or card change opens at the top, a mode switch with a card in the URL too: the two modes lay out differently, so a kept offset would land anywhere. The test "opens the other mode at the top" starts with a card in the URL, so `card ?? mode` fails it.
> 8. **The New reveal pane.**
>    - **Labels.** "Publish to {branch}", then "Publishing…" (`RevealPage.tsx:48`), through `publishLabel` in a new `studioCopy.ts` (R4-6b adds Edit's).
>    - **The note.** R-66 replaces "~2-3 min" with the runbook's 15 to 20 minutes (`REVEAL_RUNBOOK.md:34`): "Vercel is deploying it: allow 15 to 20 minutes before it shows on inkweave.ink."
>    - **The outcome** takes `ctrl.commitError`, with no comparison against the upload error (R4-3b).
>    - **The card panel's error is R4-3a's `visibleImageError`** over the scan the checklist reads (R4-3a's `ImageStatus`). It is null until a file is chosen (R-72), so "Upload a card image" stays the checklist's. It equals R4-3b's `ctrl.imageError`, which `imageErrorOf` derives through the same helper (R4-3b's hand-off: "a pane that calls it directly gets the same message"). A pane test and a page test pin that a fresh form shows no image error under the preview (R4-5d's hand-off).
>    - **The order.** R4-5d says New passes no `current` and no `onRevertImage`, so Revert image clears the file. The aside, an `<aside aria-label="Publish">`, runs checklist, synergies, Publish, outcome (README §7: "Synergies … pinned to the bottom; Publish to master at the very bottom").
> 9. **The tab title (R-51).** It names Edit card's open card, through R4-4b's `openCard(lookup)`, so this task reads no lookup state itself (the header's addition 11 and R4-4b name the discriminator `kind`). New reveal, and Edit before its card resolves, read "Card studio · Inkweave admin".
> 10. **Routes and nav.** `router.tsx` gains `{path: 'studio', element: <StudioPage />}` before `reveal` (`:25`), and its import after `:10`. `nav.ts` gains the Card studio item first in Publish (header addition 14). The tests:
>     - `nav.test.ts`, `Sidebar.test.tsx:33` and `router.test.tsx`'s `WRITE_PAGES` (`:101-106`) learn it, plus one router case for `/studio?mode=edit&card=…` marked current.
>     - `router.test.tsx` keeps the real token store (audit, significant), with no mock.
>     - The `NAV_ITEMS`- and `WRITE_PATHS`-driven cases cover `/studio`'s branch notice and tab title.
> 11. **Not in this task.** The Edit pane, its lookup states, R-66's reload after a publish (the header's task table gives it to R4-6b, which keys it on `ctrl.result`; R4-4b's hand-off names R4-6a), the card-change dialog, the redirects, the deletions, "Edit in Card studio" (R-82), and `pnpm build`, the full lint and `test:run` (gates once).
> 12. **Verified (2026-10-07)** in `scratchpad/r4-rebase/sandbox-R4-6a`.
>     - **Setup.** A copy of `src/` and the configs from the working tree: main `b490fb7`, plus the uncommitted bump to `16283a13`. `node_modules` and `upstream/` are junctioned in, and Vite's cache and the tsbuildinfo stay in the sandbox.
>     - **Siblings.** The sibling drafts' code was laid over it: R4-5a and R4-5s (as built in their sandboxes), R4-3a's `readiness.ts`, `emptyForm.ts`, `validateForm.ts` and `src/test/revealForm.ts`, R4-3b's hook and `livePreview.ts`, R4-2a's `studioFixtures.ts`, and R4-4a's file hook with R4-1a and R4-1b's client.
>     - **Stand-ins.** These were written from the contracts: `useCardEditor` (`lookup` with R4-4b's `kind`, `dirty` and `saving`), `editorState.ts`'s `openCard`, and R4-5b to R4-5e's `StudioForm`, `StudioCardPanel` (R4-5d's props), `ReadyChecklist`, `CommitOutcome` (taking the handoff while it shows an outcome) and `SynergyPanel`.
>     - **Red, then green.** Each "watch it fail" output below was produced with the new code absent. The ten test files of Step 16 gave 196 of 196 (197 with the verifier's row). That count includes R4-3b's `useRevealAdmin.test.ts`, unchanged, against the promise-returning `publish`. The whole `app` project gives 1,615 of 1,616: the one failure is R4-3a's own `validateForm.test.ts` row, whose update the sandbox didn't carry.
>     - **Mutants.** Six failed the tests:
>       - no `key` on the workspace;
>       - the form slot taking the handoff with an outcome showing;
>       - Publish requesting on click;
>       - `busy` ignored by the message;
>       - no `scrollKey`;
>       - no gutter.
>
>       One survived: `leaves` dropped, since with no Edit pane no test can hold a card change. R4-6b's card-change dialog test covers it.
>     - **Types, lint, health.**
>       - `tsc -p tsconfig.app.json` exits 0, tests and story included.
>       - `eslint --max-warnings 0` is clean on every changed file, in the sandbox and through `pnpm exec eslint --stdin` in the repo.
>       - The story renders in jsdom through `composeStories`, and `axe-core` 4.13 (colour contrast off) finds no violations.
>       - CodeScene MCP 1.5.7 scores every changed file 10.0, with no findings.
>     - **Re-checked by the verifier (18:15)** in `scratchpad/r4-rebase/sandbox-v-R4-6a`: a fresh copy of the working tree with the siblings' real code from their verified sandboxes, no stand-ins. That is R4-3a and R4-3b, R4-1a to R4-4d (`sandbox-v-R4-4d`: the real `useCardEditor`, `editorState.ts` and `openCard`), R4-5a, R4-5s, R4-5b with R4-5c's pickers, R4-5d and R4-5e. Every block of this file was applied by script, and each "Current" matched once.
>       - Against the real `ReadyChecklist`, two pane cases written against stand-ins failed, and are fixed here. The checklist prints an open item's message, so the upload's error shows in the aside too: the "refused scan" case now checks the outcome's alert and status line instead. The count is the checklist Panel's action, not its `h2`'s text.
>       - The red outputs of Steps 2, 4, 6, 8, 10, 12 and 14 match as quoted. R4-3a and R4-3b both give the file's own error before the validator's (settled at the plan commit), so Step 16's ten files give 197 of 197. The whole `app` project shows no failure this task causes, and no `act(...)` warning.
>       - `tsc -p tsconfig.app.json` exits 0, stdin eslint is clean on all 21 files, CodeScene gives 10.0 to the files the verifier changed, and the four stories render through `composeStories` with no axe violations (colour contrast off).

### Task R4-6a: The studio page and New reveal

**Files:**
- Create in `src/tools/studio/`:
  - `StudioPage.tsx` (the route element: the gate, or the workspace keyed by token)
  - `StudioWorkspace.tsx` (both controllers, the header, the guard, the measured root)
  - `NewRevealPane.tsx` and `NewRevealPane.stories.tsx`
  - `studioCopy.ts` (the title, subtitle, Publish label, go-live note and tab title)
  - `components/StudioSlots.tsx`
  - `__tests__/StudioPage.test.tsx`, `__tests__/NewRevealPane.test.tsx`, `__tests__/studioCopy.test.ts`, `__tests__/StudioSlots.test.tsx`
- Modify:
  - `src/tools/studio/studioPaths.ts`: an import, then `StudioLeave`, `studioUnsavedMessage` and `forgetTokenQuestion` appended (R-58, R-84).
  - `src/tools/studio/__tests__/studioPaths.test.ts`: the import, and two `describe`s appended.
  - `src/tools/studio/studioFixtures.ts`: three imports, and `revealController` appended.
  - `src/tools/reveal/useRevealAdmin.ts`: `publish`'s type in `RevealAdminController` (`:64` after R4-3b).
  - `src/shell/PageLayout.tsx` (`:57-59`) and `src/shell/PageLayout.test.tsx` (one case before `:100`): the flush body's stable scrollbar gutter.
  - `src/shell/nav.ts` (`NAV_ITEMS`, after `:26`) and `src/shell/nav.test.ts` (`:8`, `:19`, before `:53`).
  - `src/shell/Sidebar.test.tsx` (`:33`).
  - `src/router.tsx` (`:10`, `:25`) and `src/router.test.tsx` (`:101-106`, before the Card analytics case at `:158`).
- Not touched: `src/github/githubCommit.ts`, the reveal-sync contract files (`validateForm.ts`, `buildPreviewCard.ts`, `insertCardIntoPreviewJson.ts`, `constants.ts`) and `app-bridge.ts`, so no reveal-sync run. Nothing is deleted (R4-6c).

**Interfaces:**
- **Consumes** (Step 1 checks each):
  - **The shell.** `PageLayout` (`title`, `subtitle`, `actions`, `writes`, `flush`, `documentTitle`, `scrollKey`); `useFocusHandoff`, `useTakeHandoff` and `type FocusHandoff` (`src/shell/focusHandoff.ts`); `SegmentedControl` (`src/ui`); `studioHref` and `type StudioMode` (`src/shell/nav.ts`, R4-5a).
  - **R4-5s.** `UnsavedChangesGuard({dirty, message, leaves})`, where `message: string | ((to: Location) => string)`; `writeInFlightMessage({action: 'publish' | 'save'})` and `type WriteInFlight` (`src/shell/writeInFlight.ts`).
  - **R4-5a.** `studioModeOf`, `studioCardOf`, `draftsAtRisk`, `shouldBlockStudioNavigation`, `type StudioLocation` and `type StudioDrafts` (`studioPaths.ts`); `studioLayout`, `STUDIO_WIDE_MIN`, `STUDIO_SLOT_ORDER`, `type StudioLayout` and `type StudioSlot` (`studioLayout.ts`); `STUDIO_GRID`, `STUDIO_SLOT` and `STUDIO_GAP` (`studioStyles.ts`).
  - **The token store.** `GithubTokenGate({onSave})` and `useGithubToken()` (`{token, setToken, clearToken}`), one store for every component.
  - **The bridge.** `useContainerWidth(ref)` (ResizeObserver, `contentRect`; 0 until measured, and always in jsdom), `CtaButton`, `useCardDataContext`, `inkBlock`.
  - **R4-3a.** `revealChecklist(form, validation, image: Pick<ImageStatus, 'ready' | 'error'>)`, `visibleImageError(errors, image: ImageStatus)` and `interface ImageStatus {name; ready; error}` (`readiness.ts`); `EMPTY_FORM` (`src/tools/reveal/emptyForm.ts`, the header's addition 7); `revealForm(overrides?)` (`src/test/revealForm.ts`).
  - **R4-3b.** `RevealAdminController`: `form`, `patchForm`, `dirty`, `previewCard`, `synergyGroups`, `validation`, `imageName`, `imageDataUrl`, `uploadError`, `imageError`, `canPublish`, `publishing`, `result`, `commitError`, `onImageChange`, `publish`.
  - **R4-4b and R4-4c.** `useCardEditor({token, cardId})`'s `lookup`, `dirty` and `saving`, and `openCard(lookup): LorcanaCard | null` (`editorState.ts`).
  - **R4-5b to R4-5e** (`src/tools/studio/components/`):
    - `StudioForm({form, errors, onChange, layout})`;
    - `StudioCardPanel({card, mode, layout, staged: {name, error}, onImageChange})`, a `<section aria-label="Card preview">`;
    - `ReadyChecklist({items})`, headed "Ready to publish N/7";
    - `CommitOutcome({result, error, note, onForgetToken?, handoff?})`, which takes `handoff` while it shows an outcome;
    - `SynergyPanel({groups})`.
- **Produces:**
  ```ts
  // src/tools/studio/StudioPage.tsx
  export function StudioPage(); // /studio. No token: PageLayout "Card studio" writes, padded, round GithubTokenGate.
                                // A token: <StudioWorkspace key={token} token={token} handoff={handoff} /> (R-84)
  // src/tools/studio/StudioWorkspace.tsx
  export function StudioWorkspace(props: {token: string; handoff: FocusHandoff});
  // useRevealAdmin() and useCardEditor({token, cardId}); PageLayout "Card studio" writes flush, with the mode switch in
  // actions, documentTitle and scrollKey={studioHref(mode, card)}; the one UnsavedChangesGuard; the measured root, holding
  // NewRevealPane in New mode (R4-6b adds EditPane). A private useForgetToken({drafts, handoff}) asks first (R-84).
  // src/tools/studio/NewRevealPane.tsx
  export interface NewRevealPaneProps {ctrl: RevealAdminController; layout: StudioLayout; handoff: FocusHandoff; onForgetToken: () => void}
  export function NewRevealPane(props: NewRevealPaneProps); // StudioSlots: card panel, form, <aside aria-label="Publish">
  // src/tools/studio/components/StudioSlots.tsx
  export function StudioSlots(props: {layout: StudioLayout; slots: Readonly<Record<StudioSlot, ReactNode>>});
  // src/tools/studio/studioCopy.ts
  export const STUDIO_TITLE = 'Card studio';
  export const STUDIO_SUBTITLE = 'Publish a newly revealed card, or edit a card and its image.';
  export function publishLabel({publishing}: {publishing: boolean}): string;   // 'Publish to {branch}' | 'Publishing…'
  export function newRevealNote(): string;   // goLiveNote('Vercel is deploying it: allow 15 to 20 minutes before it shows on inkweave.ink.')
  export function studioDocumentTitle({mode, card}: {mode: StudioMode; card: LorcanaCard | null}): string | undefined;
  // src/tools/studio/studioPaths.ts (added)
  export interface StudioLeave {from: StudioLocation; to: StudioLocation; drafts: StudioDrafts; busy: StudioDrafts}
  export function studioUnsavedMessage(leave: StudioLeave): string;    // one line per draft draftsAtRisk names; never ''
                                                                       // (a card change held past its save says so)
  export function forgetTokenQuestion(drafts: StudioDrafts): string | null;   // null while both drafts are clean
  // src/tools/studio/studioFixtures.ts (added, tests and stories only)
  export function revealController(overrides?: Partial<RevealAdminController>): RevealAdminController;
  // src/tools/reveal/useRevealAdmin.ts (changed)
  publish: () => Promise<void>;   // was () => void; resolves once the commit lands or fails
  // src/shell/PageLayout.tsx: FLUSH_BODY gains scrollbarGutter: 'stable'
  // src/shell/nav.ts: {id: 'studio', label: 'Card studio', mark: 'Cs', path: '/studio', group: 'publish', writes: true},
  //   first in Publish, beside the two old items until R4-6c
  // src/router.tsx: {path: 'studio', element: <StudioPage />}
  ```
- **Hand count of primitive parameters** (the PR gate's under-30% rule; arrow functions inside a function are counted with it, as `CalibrationPage.tsx`'s `onSaveToken(next: string)` is, which passed R2's gate):
  - **No primitive parameters:**
    - `StudioPage.tsx`: 0 in 1. Its inline `onSave(next: string)` is `CalibrationPage`'s shape.
    - `StudioWorkspace.tsx`: 0 in 2, counting `useForgetToken({drafts, handoff})`. The inline `onChange(next)` takes a `StudioMode`.
    - `NewRevealPane.tsx`: 0 in 4 (`scanOf`, `NewRevealForm`, `NewRevealAside`, `NewRevealPane`).
    - `studioCopy.ts`: 0 in 2, each taking one object.
    - `components/StudioSlots.tsx`: 0 in 1.
    - `studioFixtures.ts`: `revealController(overrides)` adds 0 in 1.
  - **`studioPaths.ts`:** 1 in 13 (8%). The one is `draftLine`'s `draft: keyof StudioDrafts`. R4-5a's 9 parameters were none.
  - **The tests:**
    - `StudioPage.test.tsx`: 1 in 5 (`resize`'s `width`). The mode switch's buttons come from `modes()`, not a `(name)` helper.
    - `NewRevealPane.test.tsx`: 0 in 2.
    - `StudioSlots.test.tsx`: 0 in 1.
- **Complexity** (ESLint's `complexity` rule through the repo config):
  - `StudioWorkspace` 4, and `useForgetToken`'s handler 3;
  - `renderStudio` 5 (its defaults) and `regionOrder` 4;
  - `draftLine` 3 and `studioDocumentTitle` 3;
  - everything else 2 or less.

  `useForgetToken` keeps the workspace's lambdas out of it, so R4-6b has room for the Edit pane's wiring. R4-6b should still add helpers and hooks, not inline branches.

**How it works:**
- **No token.** `StudioPage` renders the gate in the studio's header with the branch notice. Save token sets the shared token and requests the handoff.
- **A token.** `StudioPage` renders `StudioWorkspace`, keyed by the token, which holds:
  - New reveal's controller and Edit card's, so a mode switch keeps both drafts (R-57);
  - the header: the title, the subtitle, the mode switch, the branch notice, and a tab title that names Edit's open card;
  - the one guard over both drafts (R-58);
  - the measured root, whose width picks the layout (R-64) and whose regions the active pane fills in that layout's order (R-63).
- **New reveal.** Its card panel previews the draft and takes the scan. The form holds the fields. The aside lists what's left, previews the synergies, publishes, and shows the outcome. Once the commit lands, the outcome line takes focus if focus fell to `<body>` (R-59).
- **Leaving.**
  - A navigation that would drop a draft asks first, naming each draft it would drop, or saying a publish is still in flight.
  - Switching modes never asks.
  - Forgetting the token from the page asks first while a draft is dirty. From the sidebar it doesn't (R-84, extending R-27's noted limit).

- [ ] **Step 1: Check what this task builds on**

From the repo root, on `feature/24-redesign-r4`:

```bash
git branch --show-current
git submodule status upstream/inkweave
git log --oneline main..HEAD
grep -nE "export (type StudioMode|function studioHref)" src/shell/nav.ts
grep -nE "export (type|interface|function) (StudioLocation|StudioDrafts|studioModeOf|studioCardOf|draftsAtRisk|shouldBlockStudioNavigation)\b" src/tools/studio/studioPaths.ts
grep -nE "export (const|function|type) (STUDIO_WIDE_MIN|studioLayout|STUDIO_SLOT_ORDER|StudioSlot|StudioLayout)\b" src/tools/studio/studioLayout.ts
grep -nE "export const (STUDIO_GRID|STUDIO_SLOT|STUDIO_GAP)\b" src/tools/studio/studioStyles.ts
grep -n "export type UnsavedMessage" src/shell/UnsavedChangesGuard.tsx
grep -n "export function writeInFlightMessage" src/shell/writeInFlight.ts
grep -nE "export (function|interface) (revealChecklist|visibleImageError|ImageStatus)\b" src/tools/studio/readiness.ts
grep -n "export const EMPTY_FORM" src/tools/reveal/emptyForm.ts
grep -n "export function revealForm" src/test/revealForm.ts
grep -nE "^  (publish|commitError|uploadError|imageDataUrl|dirty): " src/tools/reveal/useRevealAdmin.ts
grep -n "export function useCardEditor" src/tools/studio/useCardEditor.ts
grep -n "export function openCard" src/tools/studio/editorState.ts
grep -rnE "^  (saving|dirty): boolean;" src/tools/studio/useCardEditor.ts src/tools/studio/useEditSave.ts
grep -nE "^export function (StudioForm|StudioCardPanel|ReadyChecklist|CommitOutcome|SynergyPanel)\b" src/tools/studio/components/*.tsx
grep -n "useTakeHandoff" src/tools/studio/components/CommitOutcome.tsx
grep -n 'aria-label="Card preview"' src/tools/studio/components/StudioCardPanel.tsx
grep -n "export function revealController" src/tools/studio/studioFixtures.ts
ls src/tools/studio/StudioPage.tsx src/tools/studio/components/StudioSlots.tsx
```

Expected:
- **The branch and pin.** `feature/24-redesign-r4`, and the submodule at ` 16283a13…`, with no leading `+`. `git log` lists R4-1a to R4-5f, R4-5s and R4-5h.
- **R4-5a.** One line each for `StudioMode` and `studioHref` in `nav.ts`. Six lines from `studioPaths.ts`, five from `studioLayout.ts` and three from `studioStyles.ts`.
- **R4-5s.** One line for `UnsavedMessage` and one for `writeInFlightMessage`.
- **R4-3a.** Three lines from `readiness.ts`, one `EMPTY_FORM` in `emptyForm.ts` and one `revealForm` in `src/test/revealForm.ts`.
- **R4-3b.** Five lines from `RevealAdminController` in `useRevealAdmin.ts`, the last `64:  publish: () => void;`.
- **R4-4b and R4-4c.**
  - One `useCardEditor` and one `openCard`.
  - `saving: boolean` and `dirty: boolean` on the controller. `saving` may sit in R4-4c's `useEditSave.ts`, which the controller extends.
  - If `openCard` is missing, the lookup shape changed: give `studioDocumentTitle` the ready card in `StudioWorkspace` some other way, and keep its `{mode, card}` signature.
- **R4-5b to R4-5e.**
  - Five component lines.
  - At least one `useTakeHandoff` in `CommitOutcome.tsx`, with a `ready` that holds while an outcome shows. If `CommitOutcome` takes no handoff, stop and report: the publish test's focus check needs R4-5e's R-59 target.
  - One `aria-label="Card preview"`.
- **Not there yet.** Nothing for `revealController`, and `ls` reports both files missing. If any exists, another task did this work: stop and report.

If `ls src/tools/studio` lacks a module above, its task hasn't landed. Stop: this task wires them all. Run `pnpm build:engine` once if it hasn't run since the pin: these tests reach the bridge.

- [ ] **Step 2: Write the failing tests for the guard's words and the Forget token question**

In `src/tools/studio/__tests__/studioPaths.test.ts`, line 2. Current:

```ts
import {draftsAtRisk, shouldBlockStudioNavigation, studioCardOf, studioModeOf} from '../studioPaths';
```

New:

```ts
import {
  draftsAtRisk,
  forgetTokenQuestion,
  shouldBlockStudioNavigation,
  studioCardOf,
  studioModeOf,
  studioUnsavedMessage,
} from '../studioPaths';
```

At the end of the file, after the `draftsAtRisk` block, add:

```ts
// The guard's lines (R-58). The branch is master: vite.config.ts pins VITE_ADMIN_TARGET_BRANCH empty in tests.
const UNPUBLISHED = "Your New reveal card isn't published yet. Leaving Card studio drops it.";
const UNSAVED = "Your Edit card changes aren't saved yet. Leaving Card studio drops them.";
const UNSAVED_CARD = "Your changes to this card aren't saved yet. Leaving the card drops them.";
const SAVED_CARD = 'Your changes to this card are saved. Leaving the card drops nothing.';
const PUBLISHING = "A publish to master is in progress. Leaving won't stop it, and you won't see whether it landed.";
const SAVING = "A save to master is in progress. Leaving won't stop it, and you won't see whether it landed.";

describe('studioUnsavedMessage', () => {
  it.each([
    {why: 'leaving names the New reveal draft', from: '/studio', to: '/', drafts: REVEAL, busy: CLEAN, says: UNPUBLISHED},
    {why: 'leaving names the Edit draft', from: '/studio?mode=edit&card=1', to: '/cards/1', drafts: EDIT, busy: CLEAN, says: UNSAVED},
    {why: 'leaving names both drafts, New reveal first', from: '/studio?card=1', to: '/', drafts: BOTH, busy: CLEAN, says: `${UNPUBLISHED} ${UNSAVED}`},
    {why: 'another card names only the Edit draft', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', drafts: BOTH, busy: CLEAN, says: UNSAVED_CARD},
    {why: 'the search names only the Edit draft', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit', drafts: BOTH, busy: CLEAN, says: UNSAVED_CARD},
    {why: 'a publish in flight takes the shared line', from: '/studio', to: '/', drafts: REVEAL, busy: REVEAL, says: PUBLISHING},
    {why: 'a save in flight takes it beside an unpublished card', from: '/studio?mode=edit&card=1', to: '/', drafts: BOTH, busy: EDIT, says: `${UNPUBLISHED} ${SAVING}`},
    {why: 'a save in flight takes it on a card change', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', drafts: EDIT, busy: EDIT, says: SAVING},
    // A card change keeps New reveal's draft, so its publish in flight goes unmentioned.
    {why: 'a card change leaves a publish in flight out', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', drafts: BOTH, busy: REVEAL, says: UNSAVED_CARD},
    // The guard ends a hold only once neither draft is dirty: a card change held past Edit's save stays open
    // while New reveal is dirty, and the open dialog shows what this returns (R4-5s).
    {why: 'a card change held past its save says nothing is left to drop', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', drafts: REVEAL, busy: CLEAN, says: SAVED_CARD},
  ])('$why', ({from, to, drafts, busy, says}) => {
    expect(studioUnsavedMessage({from: at(from), to: at(to), drafts, busy})).toBe(says);
  });
});

describe('forgetTokenQuestion', () => {
  it.each([
    [REVEAL, 'Forget the token and drop your New reveal card?'],
    [EDIT, 'Forget the token and drop your Edit card changes?'],
    [BOTH, 'Forget the token and drop your New reveal card and your Edit card changes?'],
  ])('asks before dropping %j (R-84)', (drafts, question) => {
    expect(forgetTokenQuestion(drafts)).toBe(question);
  });

  it('asks nothing while both drafts are clean', () => {
    expect(forgetTokenQuestion(CLEAN)).toBeNull();
  });
});
```

Run:

```bash
pnpm vitest run --project app src/tools/studio/__tests__/studioPaths.test.ts
```

Expected: `Tests  14 failed | 25 passed (39)`. The ten `studioUnsavedMessage` rows fail with `TypeError: studioUnsavedMessage is not a function`, and the four `forgetTokenQuestion` cases with `TypeError: forgetTokenQuestion is not a function`.

- [ ] **Step 3: Add `studioUnsavedMessage` and `forgetTokenQuestion`**

In `src/tools/studio/studioPaths.ts`, the imports (lines 1-2). Current:

```ts
import type {Location} from 'react-router-dom';
import type {StudioMode} from '../../shell/nav';
```

New:

```ts
import type {Location} from 'react-router-dom';
import type {StudioMode} from '../../shell/nav';
import {writeInFlightMessage, type WriteInFlight} from '../../shell/writeInFlight';
```

At the end of the file, after `shouldBlockStudioNavigation`, add:

```ts
/** A navigation the guard holds, as the studio words its question (R-58). */
export interface StudioLeave {
  from: StudioLocation;
  to: StudioLocation;
  /** Each draft's dirty. */
  drafts: StudioDrafts;
  /** Each draft's commit in flight: New reveal's publish, Edit card's save. */
  busy: StudioDrafts;
}

type Draft = keyof StudioDrafts;

/** The drafts in the order the studio names them. */
const DRAFTS: readonly Draft[] = ['reveal', 'edit'];

/** Each draft's commit, in R2's shared in-flight line (writeInFlight.ts). */
const COMMIT: Readonly<Record<Draft, WriteInFlight>> = {reveal: {action: 'publish'}, edit: {action: 'save'}};

/** A dirty draft's line when the navigation leaves Card studio. */
const LEAVES_STUDIO: Readonly<Record<Draft, string>> = {
  reveal: "Your New reveal card isn't published yet. Leaving Card studio drops it.",
  edit: "Your Edit card changes aren't saved yet. Leaving Card studio drops them.",
};

/** The Edit draft's line when the navigation opens another card, or the search, in the studio. */
const LEAVES_CARD = "Your changes to this card aren't saved yet. Leaving the card drops them.";

/**
 * A held card change whose Edit draft went clean meanwhile: its save landed.
 * The guard ends a hold only once neither draft is dirty, so with New reveal
 * dirty the dialog stays open, and it shows what the message returns.
 */
const CARD_SAVED = 'Your changes to this card are saved. Leaving the card drops nothing.';

/** One draft's line: its commit in flight, or what the navigation drops. */
function draftLine(draft: Draft, leave: StudioLeave): string {
  if (leave.busy[draft]) return writeInFlightMessage(COMMIT[draft]);
  return leave.from.pathname === leave.to.pathname ? LEAVES_CARD : LEAVES_STUDIO[draft];
}

/**
 * UnsavedChangesGuard's message for the studio (R-58): a line for each draft
 * the held navigation would drop (draftsAtRisk, the hold's own rule), so a
 * card change names only the Edit draft and leaving names every dirty one. A
 * draft whose commit is in flight gets the shared in-flight line instead. It
 * never returns '': a hold can outlast the draft it protects (R4-5s).
 */
export function studioUnsavedMessage(leave: StudioLeave): string {
  const atRisk = draftsAtRisk(leave.from, leave.to, leave.drafts);
  const lines = DRAFTS.filter((draft) => atRisk[draft]).map((draft) => draftLine(draft, leave));
  return lines.length > 0 ? lines.join(' ') : CARD_SAVED;
}

/** How the confirm before Forget token names each draft. */
const DRAFT_NAMES: Readonly<Record<Draft, string>> = {reveal: 'your New reveal card', edit: 'your Edit card changes'};

/**
 * What the in-page Forget token asks first (R-84), or null when no draft is
 * dirty: the workspace is keyed by the token, so forgetting it drops both
 * drafts, as TuningAside's confirmForget words it for tuning edits.
 */
export function forgetTokenQuestion(drafts: StudioDrafts): string | null {
  const names = DRAFTS.filter((draft) => drafts[draft]).map((draft) => DRAFT_NAMES[draft]);
  return names.length > 0 ? `Forget the token and drop ${names.join(' and ')}?` : null;
}
```

`draftLine` stays private and takes the draft's key, the module's one primitive parameter. Don't fold the in-flight check into `studioUnsavedMessage`'s lambda: the PR gate counts a lambda's branches with its function.

Run `pnpm vitest run --project app src/tools/studio/__tests__/studioPaths.test.ts`. Expected: `Tests  39 passed (39)`.

- [ ] **Step 4: Write the failing tests for the page's words**

Create `src/tools/studio/__tests__/studioCopy.test.ts`:

```ts
import {afterEach, describe, expect, it, vi} from 'vitest';
import {lorcanaCard} from '../../analytics/cards/cardFixtures';
import {newRevealNote, publishLabel, studioDocumentTitle} from '../studioCopy';

afterEach(() => vi.unstubAllEnvs());

describe('publishLabel', () => {
  it('names the branch New reveal commits to, and says while it commits', () => {
    expect(publishLabel({publishing: false})).toBe('Publish to master');
    expect(publishLabel({publishing: true})).toBe('Publishing…');
  });

  it('names a rehearsal branch', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    expect(publishLabel({publishing: false})).toBe('Publish to admin-verify');
  });
});

describe('newRevealNote', () => {
  it("allows the runbook's 15 to 20 minutes for the deploy (R-66)", () => {
    expect(newRevealNote()).toBe('Vercel is deploying it: allow 15 to 20 minutes before it shows on inkweave.ink.');
  });

  it('says a rehearsal branch never deploys', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    expect(newRevealNote()).toBe('It went to admin-verify; only master deploys to production.');
  });
});

describe('studioDocumentTitle', () => {
  const ELSA = lorcanaCard({id: '2983', name: 'Elsa', version: 'Snow Queen', setCode: '9', setNumber: 42});

  it('names the tab after the card Edit card has open (R-51)', () => {
    expect(studioDocumentTitle({mode: 'edit', card: ELSA})).toBe('Elsa - Snow Queen · Card studio');
  });

  it.each([
    ['New reveal, whatever card the URL keeps', 'new', ELSA],
    ['Edit card before its card resolves', 'edit', null],
  ] as const)('leaves the page title on %s', (_case, mode, card) => {
    expect(studioDocumentTitle({mode, card})).toBeUndefined();
  });
});
```

Run:

```bash
pnpm vitest run --project app src/tools/studio/__tests__/studioCopy.test.ts
```

Expected: `Test Files  1 failed (1)`, `Tests  no tests`, with `Error: Failed to resolve import "../studioCopy" from "src/tools/studio/__tests__/studioCopy.test.ts". Does the file exist?`

- [ ] **Step 5: Add `studioCopy.ts`**

Create `src/tools/studio/studioCopy.ts`:

```ts
import {targetBranch} from '../../github/githubCommit';
import {goLiveNote} from '../../github/goLiveNote';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import type {StudioMode} from '../../shell/nav';

/*
 * Card studio's page-level words: its title, its subtitle, New reveal's
 * button, the note after a publish lands, and the tab's name. One module, so
 * the page, its tests and its story say the same thing.
 */

export const STUDIO_TITLE = 'Card studio';

export const STUDIO_SUBTITLE = 'Publish a newly revealed card, or edit a card and its image.';

/** New reveal's button: the branch it commits to, or that it is committing. */
export function publishLabel({publishing}: {publishing: boolean}): string {
  return publishing ? 'Publishing…' : `Publish to ${targetBranch()}`;
}

/**
 * What follows "Committed." after a New reveal publish (R-66): the card's
 * commit starts the app's deploy, and the runbook allows 15 to 20 minutes for
 * it (REVEAL_RUNBOOK.md, "One card at a time"). A rehearsal branch never
 * deploys, and goLiveNote says so instead.
 */
export function newRevealNote(): string {
  return goLiveNote('Vercel is deploying it: allow 15 to 20 minutes before it shows on inkweave.ink.');
}

/** What names the tab: the mode, and the card Edit card has open (null until one resolves). */
interface TitleSource {
  mode: StudioMode;
  card: LorcanaCard | null;
}

/**
 * The tab's name before " · Inkweave admin" (R-51, R-59): Edit card's open
 * card, so a tab says which card it holds. New reveal, and Edit before its
 * card resolves, read as the page's title.
 */
export function studioDocumentTitle({mode, card}: TitleSource): string | undefined {
  return mode === 'edit' && card ? `${card.fullName} · ${STUDIO_TITLE}` : undefined;
}
```

Run `pnpm vitest run --project app src/tools/studio/__tests__/studioCopy.test.ts`. Expected: `Tests  7 passed (7)`. The tests read master: `vite.config.ts` pins `VITE_ADMIN_TARGET_BRANCH` empty, and each `vi.stubEnv` is undone in `afterEach`.

- [ ] **Step 6: Write the failing tests for the slots (R-63)**

Create `src/tools/studio/__tests__/StudioSlots.test.tsx`:

```tsx
import {useState} from 'react';
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {StudioSlots} from '../components/StudioSlots';

/** A region with a count of its own, so a remount would show as a reset. */
function Region({name}: {name: string}) {
  const [presses, setPresses] = useState(0);
  return (
    <button type="button" onClick={() => setPresses(presses + 1)}>
      {name} {presses}
    </button>
  );
}

const SLOTS = {card: <Region name="card" />, form: <Region name="form" />, aside: <Region name="aside" />};

/** The regions in DOM order, which is the Tab order. */
const order = () => screen.getAllByRole('button').map((region) => region.textContent?.split(' ')[0]);

describe('StudioSlots', () => {
  it.each([
    ['wide', ['card', 'form', 'aside']],
    ['narrow', ['form', 'card', 'aside']],
  ] as const)('puts its regions in Tab order when %s: %j (R-63)', (layout, regions) => {
    render(<StudioSlots layout={layout} slots={SLOTS} />);
    expect(order()).toEqual(regions);
  });

  it('moves its regions on a layout switch, each with its state and its element', async () => {
    const user = userEvent.setup();
    const {rerender} = render(<StudioSlots layout="narrow" slots={SLOTS} />);
    await user.click(screen.getByRole('button', {name: 'form 0'}));
    const form = screen.getByRole('button', {name: 'form 1'});

    rerender(<StudioSlots layout="wide" slots={SLOTS} />);
    expect(order()).toEqual(['card', 'form', 'aside']);
    expect(screen.getByRole('button', {name: 'form 1'})).toBe(form);
  });

  it("gives each region its layout's place", () => {
    const {rerender} = render(<StudioSlots layout="narrow" slots={SLOTS} />);
    expect(screen.getByRole('button', {name: 'form 0'}).parentElement).toHaveStyle({flex: '0 1 400px'});
    rerender(<StudioSlots layout="wide" slots={SLOTS} />);
    expect(screen.getByRole('button', {name: 'form 0'}).parentElement?.style.gridColumn).toBe('2 / span 2');
  });
});
```

`gridColumn` is read from the element's own style: jsdom's CSS parser doesn't know grid placement, so `toHaveStyle` can't check it.

Run:

```bash
pnpm vitest run --project app src/tools/studio/__tests__/StudioSlots.test.tsx
```

Expected: `Test Files  1 failed (1)`, `Tests  no tests`, with `Error: Failed to resolve import "../components/StudioSlots" from "src/tools/studio/__tests__/StudioSlots.test.tsx". Does the file exist?`

- [ ] **Step 7: Add `StudioSlots`**

Create `src/tools/studio/components/StudioSlots.tsx`:

```tsx
import type {ReactNode} from 'react';
import {STUDIO_SLOT_ORDER, type StudioLayout, type StudioSlot} from '../studioLayout';
import {STUDIO_SLOT} from '../studioStyles';

interface StudioSlotsProps {
  layout: StudioLayout;
  /** What each region holds: the card panel, the form and the aside. */
  slots: Readonly<Record<StudioSlot, ReactNode>>;
}

/**
 * A pane's three regions, in the DOM order the layout reads in (R-63): the card
 * first when wide, where it is the first column, and the form first when
 * narrow, as the handoff orders them. Each is keyed by its region, so a layout
 * switch moves it, state and all, instead of remounting it. They render
 * straight into StudioWorkspace's measured root, whose grid or flex-wrap
 * places them (STUDIO_GRID, STUDIO_SLOT).
 */
export function StudioSlots({layout, slots}: StudioSlotsProps) {
  return (
    <>
      {STUDIO_SLOT_ORDER[layout].map((slot) => (
        <div key={slot} style={STUDIO_SLOT[layout][slot]}>
          {slots[slot]}
        </div>
      ))}
    </>
  );
}
```

Run `pnpm vitest run --project app src/tools/studio/__tests__/StudioSlots.test.tsx`. Expected: `Tests  4 passed (4)`.

- [ ] **Step 8: Write the failing tests for the New reveal pane**

Create `src/tools/studio/__tests__/NewRevealPane.test.tsx`:

```tsx
import {describe, expect, it, vi} from 'vitest';
import {act, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {revealForm} from '../../../test/revealForm';
import {validateRevealCardForm} from '../../reveal/validateForm';
import type {RevealAdminController} from '../../reveal/useRevealAdmin';
import {NewRevealPane} from '../NewRevealPane';
import {revealChecklist} from '../readiness';
import {revealController} from '../studioFixtures';

const COMMIT_URL = 'https://github.com/Doberjohn/inkweave/commit/abc123';
const REJECTED_PUBLISH = 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: {"message":"Bad credentials"}';

/** The page's handoff as the pane sees it: a request is recorded, and a pending one waits to be taken. */
function handoffOf({pending = false} = {}) {
  return {pending, request: vi.fn(), done: vi.fn()};
}

/** The pane, wide (every form field shows), on a controller that starts from an empty draft. */
function renderPane({ctrl = {}, handoff = handoffOf(), onForgetToken = vi.fn()}: {
  ctrl?: Partial<RevealAdminController>;
  handoff?: ReturnType<typeof handoffOf>;
  onForgetToken?: () => void;
} = {}) {
  render(<NewRevealPane ctrl={revealController(ctrl)} layout="wide" handoff={handoff} onForgetToken={onForgetToken} />);
  return {handoff, user: userEvent.setup()};
}

const aside = () => within(screen.getByRole('complementary', {name: 'Publish'}));
const panel = () => within(screen.getByRole('region', {name: 'Card preview'}));
const checklist = () => within(aside().getByRole('region', {name: 'Ready to publish'}));
const publishButton = () => aside().getByRole('button', {name: /^Publish/});

describe('NewRevealPane', () => {
  it.each([
    {why: 'stays off until the card is ready', ctrl: {}, label: 'Publish to master', on: false},
    {why: 'publishes a ready card', ctrl: {canPublish: true}, label: 'Publish to master', on: true},
    {why: 'goes off while the commit runs', ctrl: {canPublish: true, publishing: true}, label: 'Publishing…', on: false},
  ])('Publish $why', ({ctrl, label, on}) => {
    renderPane({ctrl});
    expect(publishButton()).toHaveTextContent(label);
    expect(publishButton()).toHaveProperty('disabled', !on);
  });

  it('asks for the handoff once the publish lands, and not before (R-59)', async () => {
    let land: () => void = () => {};
    const publish = vi.fn(() => new Promise<void>((resolve) => (land = resolve)));
    const {handoff, user} = renderPane({ctrl: {canPublish: true, publish}});
    await user.click(publishButton());
    expect(publish).toHaveBeenCalledOnce();
    expect(handoff.request).not.toHaveBeenCalled();

    await act(async () => land());
    expect(handoff.request).toHaveBeenCalledOnce();
  });

  it("gives the form Save token's pending handoff while no outcome shows", () => {
    const {handoff} = renderPane({handoff: handoffOf({pending: true})});
    expect(screen.getByRole('textbox', {name: 'Collector number'})).toHaveFocus();
    expect(handoff.done).toHaveBeenCalled();
  });

  it("leaves a pending handoff to the outcome once one shows: it is the publish's", () => {
    renderPane({ctrl: {result: {commitUrl: COMMIT_URL}}, handoff: handoffOf({pending: true})});
    expect(screen.getByRole('textbox', {name: 'Collector number'})).not.toHaveFocus();
  });

  it('shows a refused scan under the card panel, never as the outcome', () => {
    const validation = validateRevealCardForm(revealForm(), new Set(), 'mei.png');
    renderPane({ctrl: {imageName: 'mei.png', uploadError: 'Not a PNG', publishError: 'Not a PNG', validation}});
    expect(panel().getByText('Not a PNG')).toBeInTheDocument();
    // The checklist's Image item words it too (R4-3a); the outcome under Publish stays empty.
    expect(aside().queryByRole('alert')).not.toBeInTheDocument();
    expect(aside().getByRole('status')).toBeEmptyDOMElement();
  });

  it("keeps a fresh draft's missing scan out of the card panel: the checklist names it (R-72)", () => {
    renderPane();
    expect(panel().queryByText('Upload a card image')).not.toBeInTheDocument();
    expect(checklist().getByText('Upload a card image')).toBeInTheDocument();
  });

  it('offers Forget token when GitHub rejects the token (R-26), and leaves asking to the workspace', async () => {
    const onForgetToken = vi.fn();
    const {user} = renderPane({ctrl: {commitError: REJECTED_PUBLISH}, onForgetToken});
    expect(aside().getByRole('alert')).toHaveTextContent('GitHub 401 on');
    await user.click(aside().getByRole('button', {name: 'Forget token'}));
    expect(onForgetToken).toHaveBeenCalledOnce();
  });

  it('reverts a staged scan by clearing the chosen file', async () => {
    const onImageChange = vi.fn();
    const {user} = renderPane({ctrl: {imageName: 'mei.png', onImageChange}});
    await user.click(screen.getByRole('button', {name: 'Revert image'}));
    expect(onImageChange).toHaveBeenCalledWith(null);
  });

  it("counts the scan as ready once the controller has read its bytes, as the checklist's invariant needs", () => {
    const form = revealForm();
    const validation = validateRevealCardForm(form, new Set(), 'mei.png');
    renderPane({ctrl: {form, validation, imageName: 'mei.png', imageDataUrl: 'data:image/png;base64,AAAA'}});
    const items = revealChecklist(form, validation, {ready: true, error: null});
    expect(items.every((item) => item.done)).toBe(true);
    // The count is the checklist Panel's action, beside its h2.
    expect(checklist().getByText(`${items.length}/${items.length}`)).toBeInTheDocument();
  });
});
```

The pane renders wide, so every form field shows. Its tests use a controller from `revealController`, with no GitHub, card list or file reader. The page test (Step 10) drives the real one.

Run:

```bash
pnpm vitest run --project app src/tools/studio/__tests__/NewRevealPane.test.tsx
```

Expected: `Test Files  1 failed (1)`, `Tests  no tests`, with `Error: Failed to resolve import "../NewRevealPane" from "src/tools/studio/__tests__/NewRevealPane.test.tsx". Does the file exist?`

- [ ] **Step 9: Return `publish`'s promise, add the fixture, and add the pane**

**`publish` returns its promise.** In `src/tools/reveal/useRevealAdmin.ts`, `RevealAdminController`'s last field (`:64` after R4-3b). Current:

```ts
  publish: () => void;
```

New:

```ts
  /** Commits the card; resolves once the commit has landed or failed, so a page can move focus to the outcome (R-59). */
  publish: () => Promise<void>;
```

The body is already `async function publish()`, and its `if (!ready) return;` resolves at once, so nothing else changes. `RevealPage.tsx:47`'s `onClick={ctrl.publish}` still typechecks, and R4-3b's tests call it as `act(() => void hook.current.publish())`, which still holds.

**The fixture.** In `src/tools/studio/studioFixtures.ts`, add to the imports, after the bridge's import (`:2`):

```ts
import {EMPTY_FORM} from '../reveal/emptyForm';
import type {RevealAdminController} from '../reveal/useRevealAdmin';
import {validateRevealCardForm} from '../reveal/validateForm';
```

At the end of the file, add:

```ts
/**
 * New reveal's controller as useRevealAdmin returns it for an empty draft,
 * with a token saved; `overrides` set the rest. For NewRevealPane's tests and
 * story, which need no GitHub, card list or file reader (R4-6a).
 */
export function revealController(overrides: Partial<RevealAdminController> = {}): RevealAdminController {
  const validation = validateRevealCardForm(EMPTY_FORM, new Set(), null);
  return {
    token: 'tok',
    setToken: () => {},
    form: EMPTY_FORM,
    patchForm: () => {},
    dirty: false,
    previewCard: null,
    synergyGroups: [],
    validation,
    imageName: null,
    imageDataUrl: null,
    uploadError: null,
    // R-72: no file chosen yet, so no error under the file controls; "Upload a card image" is the checklist's.
    imageError: null,
    canPublish: false,
    publishing: false,
    result: null,
    commitError: null,
    publishError: null,
    onImageChange: () => {},
    publish: () => Promise.resolve(),
    ...overrides,
  };
}
```

**The pane.** Create `src/tools/studio/NewRevealPane.tsx`:

```tsx
import {useRef} from 'react';
import {CtaButton} from '../../app-bridge';
import {useTakeHandoff, type FocusHandoff} from '../../shell/focusHandoff';
import type {RevealAdminController} from '../reveal/useRevealAdmin';
import {CommitOutcome} from './components/CommitOutcome';
import {ReadyChecklist} from './components/ReadyChecklist';
import {StudioCardPanel} from './components/StudioCardPanel';
import {StudioForm} from './components/StudioForm';
import {StudioSlots} from './components/StudioSlots';
import {SynergyPanel} from './components/SynergyPanel';
import {revealChecklist, visibleImageError, type ImageStatus} from './readiness';
import {newRevealNote, publishLabel} from './studioCopy';
import type {StudioLayout} from './studioLayout';
import {STUDIO_GAP} from './studioStyles';

// The handoff draws the aside as one column: the checklist, the synergies, then Publish across its width.
const ASIDE: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: STUDIO_GAP};
const PUBLISH: React.CSSProperties = {width: '100%'};

// The form's first control: Identity's header in the narrow accordion, its first field when wide.
const FIRST_CONTROL = 'input, select, textarea, button';

export interface NewRevealPaneProps {
  ctrl: RevealAdminController;
  layout: StudioLayout;
  /**
   * The page's (R-59). Two requests reach this pane: Save token's, which the
   * form takes (the workspace has just mounted, with no outcome), and a
   * publish's once it lands, which the outcome line takes.
   */
  handoff: FocusHandoff;
  /**
   * R-26's Forget token, offered when GitHub rejects the token. The workspace
   * asks first while a draft is dirty (R-84).
   */
  onForgetToken: () => void;
}

type PartProps = Omit<NewRevealPaneProps, 'onForgetToken'>;

/** The chosen scan as readiness reads it: its name, whether its bytes are read, and the upload's own error. */
function scanOf(ctrl: RevealAdminController): ImageStatus {
  return {name: ctrl.imageName, ready: ctrl.imageDataUrl !== null, error: ctrl.uploadError};
}

/**
 * The form, in its slot. It takes a pending handoff only while no outcome
 * shows: that is Save token's, since a publish's request comes with its
 * outcome, which the outcome line takes.
 */
function NewRevealForm({ctrl, layout, handoff}: PartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const outcome = ctrl.result !== null || ctrl.commitError !== null;
  useTakeHandoff(handoff, ref, FIRST_CONTROL, !outcome);
  return (
    <div ref={ref}>
      <StudioForm form={ctrl.form} errors={ctrl.validation.errors} onChange={ctrl.patchForm} layout={layout} />
    </div>
  );
}

/**
 * The aside: what's left before the card can publish, its synergies, Publish,
 * and the outcome. Publish asks for the handoff once the commit lands, failed
 * or not: the button went off while it ran, which drops focus to <body> in a
 * browser, so the outcome line takes it (R-59).
 */
function NewRevealAside({ctrl, handoff, onForgetToken}: Omit<NewRevealPaneProps, 'layout'>) {
  const publish = () => void ctrl.publish().then(handoff.request);
  return (
    <aside aria-label="Publish" style={ASIDE}>
      <ReadyChecklist items={revealChecklist(ctrl.form, ctrl.validation, scanOf(ctrl))} />
      <SynergyPanel groups={ctrl.synergyGroups} />
      <CtaButton type="button" onClick={publish} disabled={!ctrl.canPublish || ctrl.publishing} style={PUBLISH}>
        {publishLabel({publishing: ctrl.publishing})}
      </CtaButton>
      <CommitOutcome
        result={ctrl.result}
        error={ctrl.commitError}
        note={newRevealNote()}
        onForgetToken={onForgetToken}
        handoff={handoff}
      />
    </aside>
  );
}

/**
 * New reveal (R-2): today's reveal publisher in the studio's layout. The card
 * panel previews the draft and takes its scan, the form holds its fields, and
 * the aside publishes it. The controller lives in StudioWorkspace, so a mode
 * switch keeps the draft (R-57).
 */
export function NewRevealPane({ctrl, layout, handoff, onForgetToken}: NewRevealPaneProps) {
  return (
    <StudioSlots
      layout={layout}
      slots={{
        card: (
          // No current art in New reveal, and no onRevertImage: Revert image clears the file (R4-5d).
          <StudioCardPanel
            card={ctrl.previewCard}
            mode="new"
            layout={layout}
            staged={{name: ctrl.imageName, error: visibleImageError(ctrl.validation.errors, scanOf(ctrl))}}
            onImageChange={ctrl.onImageChange}
          />
        ),
        form: <NewRevealForm ctrl={ctrl} layout={layout} handoff={handoff} />,
        aside: <NewRevealAside ctrl={ctrl} handoff={handoff} onForgetToken={onForgetToken} />,
      }}
    />
  );
}
```

Keep three things as written:
- **The form slot's `ready` (`!outcome`).** It makes Save token's request and a publish's go to different takers. The second mutant in the re-base notes shows a form that takes every request.
- **`.then(handoff.request)`**, not a request in the click handler. On click, the outcome is still empty, and the form slot would take it.
- **`scanOf`, shared by the checklist and the panel.** Under R-72 the panel shows nothing until a file is chosen. The checklist keeps the validator's "Upload a card image".

Run:

```bash
pnpm vitest run --project app src/tools/studio/__tests__/NewRevealPane.test.tsx src/tools/reveal/__tests__/useRevealAdmin.test.ts
```

Expected: `Test Files  2 passed (2)`, with `NewRevealPane.test.tsx` passing 11 tests. `useRevealAdmin.test.ts` is R4-3b's, unchanged, and still passes against the promise-returning `publish`.

- [ ] **Step 10: Write the failing tests for the page**

Create `src/tools/studio/__tests__/StudioPage.test.tsx`:

```tsx
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen, waitFor, waitForElementToBeRemoved, within} from '@testing-library/react';
import userEvent, {type UserEvent} from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {inkBlock, type useCardDataContext} from '../../../app-bridge';
import {pngFile} from '../../../test/images';
import {commitNewCard} from '../../reveal/githubClient';
import {StudioPage} from '../StudioPage';
import {lorcanaCard} from '../../analytics/cards/cardFixtures';
import {STUDIO_SUBTITLE} from '../studioCopy';
import {STUDIO_WIDE_MIN} from '../studioLayout';

// Every GitHub read stays real against the fetch stub; only New reveal's commit is faked.
vi.mock('../../reveal/githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../reveal/githubClient')>()),
  commitNewCard: vi.fn(),
}));

/** What the studio reads from the shell's card list. */
type CardList = Pick<
  ReturnType<typeof useCardDataContext>,
  'cards' | 'isLoading' | 'error' | 'getCardById' | 'retryLoad'
>;

// Two stores a test moves on, so the page re-renders as it would in the app: the card list
// (R3's pattern, CardAnalyticsPage.test.tsx), and the width a ResizeObserver would report.
// jsdom has no ResizeObserver, so the real useContainerWidth stays at 0: narrow.
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
/** The call the gate's "Save token" makes to check a token can push. */
const REPO_URL = 'https://api.github.com/repos/Doberjohn/inkweave';
const COMMIT_URL = 'https://github.com/Doberjohn/inkweave/commit/abc123';
/** What a publish says when GitHub rejects the token (R-26). */
const REJECTED_PUBLISH = 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: {"message":"Bad credentials"}';

/** A released card (set 9): Edit card opens it from the card list alone, never waiting on previewCards.json (R-71). */
const ELSA = lorcanaCard({id: '2983', name: 'Elsa', version: 'Snow Queen', setCode: '9', setNumber: 42});

const json = (body: unknown) => new Response(JSON.stringify(body), {headers: {'content-type': 'application/json'}});
/** A request that never settles: previewCards.json, which New reveal never needs, stays loading. */
const never = () => new Promise<Response>(() => {});

/** The token can push; every other request never settles. */
function stubFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => (url === REPO_URL ? Promise.resolve(json({permissions: {push: true}})) : never())),
  );
}

/** Sets the card list the page reads, and re-renders. By default it has loaded, with one released card. */
function setCardList({cards = [ELSA]}: {cards?: LorcanaCard[]} = {}) {
  const getCardById = (id: string) => cards.find((c) => c.id === id);
  cardList.value = {cards, isLoading: false, error: null, getCardById, retryLoad: () => {}};
  act(() => cardList.listeners.forEach((onChange) => onChange()));
}

/** The width the root's ResizeObserver reports, as a sidebar toggle or a window resize would change it. */
function resize(width: number) {
  measured.width = width;
  act(() => measured.listeners.forEach((onChange) => onChange()));
}

/** Card studio at `path` in a data router, which the guard needs, beside a page to leave to. */
function renderStudio({path = '/studio', token = 'tok' as string | null} = {}) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
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

/** The mode switch's buttons, in the header once a token is saved. The header stays mounted, and so do they. */
function modes() {
  const group = within(screen.getByRole('group', {name: 'Studio mode'}));
  return {
    newReveal: group.getByRole('button', {name: 'New reveal'}),
    editCard: group.getByRole('button', {name: 'Edit card'}),
  };
}
const nameField = () => screen.getByRole('textbox', {name: 'Name'});
const publishButton = () => screen.getByRole('button', {name: /^Publish/});
const leaveDialog = () => screen.findByRole('dialog', {name: 'Leave this page?'});

/** The measured root's regions in DOM order, told apart by what each holds. */
function regionOrder() {
  const aside = screen.getByRole('complementary', {name: 'Publish'});
  const root = aside.parentElement?.parentElement;
  return [...(root?.children ?? [])].map((region) => {
    if (region.contains(aside)) return 'aside';
    return region.querySelector('input[type="file"]') ? 'card' : 'form';
  });
}

/** Fills a card New reveal can publish: a Character numbered in Amber's block, the form's default ink, with its scan. */
async function fillCard(user: UserEvent) {
  await user.type(screen.getByRole('textbox', {name: 'Collector number'}), String(inkBlock('Amber').first));
  await user.type(nameField(), 'Mei');
  for (const [name, value] of [['Cost', '4'], ['Strength', '3'], ['Willpower', '5'], ['Lore', '2']] as const) {
    await user.type(screen.getByRole('textbox', {name}), value);
  }
  // The card panel's file input: the only one New reveal has.
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (input) await user.upload(input, pngFile('mei.png'));
  await waitFor(() => expect(publishButton()).toBeEnabled());
}

/**
 * Where a browser leaves focus once the focused Publish button goes off: on <body> (HTML's focus fixup rule).
 * jsdom keeps it on the disabled button, which can't blur, so focus another control and let that go.
 */
function dropFocusToBody() {
  const field = nameField();
  act(() => {
    field.focus();
    field.blur();
  });
}

beforeEach(() => {
  // A block, not an arrow's value: mockReset() returns the mock, and Vitest calls a function a hook returns as its teardown.
  vi.mocked(commitNewCard).mockReset();
  measured.width = 0;
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

// writePages.test.tsx's three cases, through a data router (R4-6c deletes that file with the old pages).
describe('StudioPage: the gate and the header', () => {
  it('asks for a token under the title and branch notice, with no mode switch yet', () => {
    renderStudio({token: null});
    expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1);
    expect(screen.getByRole('heading', {level: 1, name: 'Card studio'})).toBeInTheDocument();
    expect(screen.getByRole('heading', {level: 2, name: 'GitHub token'})).toBeInTheDocument();
    expect(screen.getByText('master')).toBeInTheDocument();
    expect(screen.queryByRole('group', {name: 'Studio mode'})).not.toBeInTheDocument();
    expect(document.title).toBe('Card studio · Inkweave admin');
  });

  it('opens New reveal with a token, under one h1 that names the branch, and leaves Forget token to the sidebar', () => {
    renderStudio();
    expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1);
    expect(screen.getByText(STUDIO_SUBTITLE)).toBeInTheDocument();
    expect(screen.getByText('master')).toBeInTheDocument();
    expect(modes().newReveal).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', {name: 'Forget token'})).not.toBeInTheDocument();
    // R-72, through the real controller: a fresh draft's missing scan is the checklist's, not the preview's.
    const preview = within(screen.getByRole('region', {name: 'Card preview'}));
    expect(preview.queryByText('Upload a card image')).not.toBeInTheDocument();
  });

  it('hands focus to the form after Save token: its first field, when wide (R-59)', async () => {
    measured.width = STUDIO_WIDE_MIN;
    const {user} = renderStudio({token: null});
    await user.type(screen.getByLabelText('GitHub token'), 'tok');
    await user.click(screen.getByRole('button', {name: 'Save token'}));
    await waitFor(() => expect(screen.getByRole('textbox', {name: 'Collector number'})).toHaveFocus());
    expect(localStorage.getItem(TOKEN_KEY)).toBe('tok');
  });

  it('names a rehearsal branch on Publish and in the header', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    renderStudio();
    expect(publishButton()).toHaveTextContent('Publish to admin-verify');
    expect(screen.getByText('admin-verify')).toBeInTheDocument();
  });
});

describe('StudioPage: the mode switch (R-57)', () => {
  it('keeps the New reveal draft across a switch to Edit card and back, and never asks', async () => {
    measured.width = STUDIO_WIDE_MIN;
    const {router, user} = renderStudio();
    const {newReveal, editCard} = modes();
    await user.type(nameField(), 'Mei');
    await user.click(editCard);
    await waitFor(() => expect(router.state.location.search).toBe('?mode=edit'));
    expect(screen.queryByRole('textbox', {name: 'Name'})).not.toBeInTheDocument();

    await user.click(newReveal);
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(nameField()).toHaveValue('Mei');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('pushes the switch, card and all, so Back returns to the other mode; the current mode does nothing', async () => {
    const {router, user} = renderStudio({path: '/studio?mode=edit&card=2983'});
    const {newReveal, editCard} = modes();
    const {key} = router.state.location;
    await user.click(editCard);
    expect(router.state.location.key).toBe(key);

    await user.click(newReveal);
    await waitFor(() => expect(router.state.location.search).toBe('?card=2983'));
    expect(router.state.historyAction).toBe('PUSH');
    act(() => void router.navigate(-1));
    await waitFor(() => expect(editCard).toHaveAttribute('aria-pressed', 'true'));
  });

  it("names the tab after Edit card's card, and New reveal after the page (R-51)", async () => {
    const {user} = renderStudio({path: '/studio?mode=edit&card=2983'});
    expect(document.title).toBe('Elsa - Snow Queen · Card studio · Inkweave admin');
    await user.click(modes().newReveal);
    await waitFor(() => expect(document.title).toBe('Card studio · Inkweave admin'));
  });

  it('opens the other mode at the top of the body, a card in the URL too, with focus still on the switch', async () => {
    const {user} = renderStudio({path: '/studio?mode=edit&card=2983'});
    const {newReveal} = modes();
    const body = screen.getByRole('main').lastElementChild as HTMLElement;
    body.scrollTop = 500;
    await user.click(newReveal);
    await waitFor(() => expect(body.scrollTop).toBe(0));
    expect(newReveal).toHaveFocus();
  });
});

describe('StudioPage: the layout (R-63, R-64)', () => {
  it('lays out narrow until the root measures STUDIO_WIDE_MIN, card first when wide, moving each region', () => {
    renderStudio();
    const aside = screen.getByRole('complementary', {name: 'Publish'});
    expect(regionOrder()).toEqual(['form', 'card', 'aside']);

    resize(STUDIO_WIDE_MIN);
    expect(regionOrder()).toEqual(['card', 'form', 'aside']);
    expect(aside.parentElement?.parentElement).toHaveStyle({display: 'grid'});
    // Moved, not remounted (R-63).
    expect(screen.getByRole('complementary', {name: 'Publish'})).toBe(aside);

    resize(STUDIO_WIDE_MIN - 1);
    expect(regionOrder()).toEqual(['form', 'card', 'aside']);
  });
});

describe('StudioPage: New reveal', () => {
  beforeEach(() => {
    // Wide, so every field of the form shows at once.
    measured.width = STUDIO_WIDE_MIN;
  });

  it('asks before leaving with a draft, and stays with it (R-58)', async () => {
    const {router, user} = renderStudio();
    await user.type(nameField(), 'Mei');
    act(() => void router.navigate('/'));
    const dialog = await leaveDialog();
    expect(dialog).toHaveTextContent("Your New reveal card isn't published yet. Leaving Card studio drops it.");

    await user.click(within(dialog).getByRole('button', {name: 'Stay on this page'}));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(router.state.location.pathname).toBe('/studio');
    expect(nameField()).toHaveValue('Mei');
  });

  it('starts a new workspace, drafts dropped, when another tab saves another token (R-84)', async () => {
    const {user} = renderStudio();
    await user.type(nameField(), 'Mei');
    // The shared token store hears the storage event: no forget on this page, and no question.
    act(() => {
      localStorage.setItem(TOKEN_KEY, 'other');
      window.dispatchEvent(new StorageEvent('storage', {key: TOKEN_KEY}));
    });
    await waitFor(() => expect(nameField()).toHaveValue(''));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('publishes the card, says when it goes live, and moves focus to the outcome (R-59, R-66)', async () => {
    let land: (result: {commitUrl: string}) => void = () => {};
    vi.mocked(commitNewCard).mockReturnValue(new Promise((resolve) => (land = resolve)));
    const {router, user} = renderStudio();
    await fillCard(user);
    await user.click(publishButton());
    expect(publishButton()).toHaveTextContent('Publishing…');
    expect(commitNewCard).toHaveBeenCalledWith(expect.objectContaining({token: 'tok', imageExt: 'png'}));

    dropFocusToBody();
    await act(async () => land({commitUrl: COMMIT_URL}));
    const outcome = screen.getByText(/^Committed\./).closest<HTMLElement>('[role="status"]');
    expect(outcome).toHaveTextContent('Vercel is deploying it: allow 15 to 20 minutes before it shows on inkweave.ink.');
    expect(within(outcome as HTMLElement).getByRole('link', {name: 'View commit'})).toHaveAttribute('href', COMMIT_URL);
    await waitFor(() => expect(outcome).toContainElement(document.activeElement as HTMLElement));

    // The draft cleared with the publish, so nothing holds the way out.
    act(() => void router.navigate('/'));
    expect(await screen.findByRole('heading', {level: 1, name: 'Overview'})).toBeInTheDocument();
  });

  it("says leaving mid-publish won't stop it (R-58)", async () => {
    vi.mocked(commitNewCard).mockReturnValue(new Promise(() => {}));
    const {router, user} = renderStudio();
    await fillCard(user);
    await user.click(publishButton());
    act(() => void router.navigate('/'));
    const dialog = await leaveDialog();
    expect(dialog).toHaveTextContent(
      "A publish to master is in progress. Leaving won't stop it, and you won't see whether it landed.",
    );
    expect(dialog).not.toHaveTextContent('drops it');
  });

  it('forgets a token GitHub rejects only once asked, then hands focus to the gate (R-26, R-84)', async () => {
    vi.mocked(commitNewCard).mockRejectedValue(new Error(REJECTED_PUBLISH));
    const {user} = renderStudio();
    await fillCard(user);
    await user.click(publishButton());
    const forget = await screen.findByRole('button', {name: 'Forget token'});

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.click(forget);
    expect(confirm).toHaveBeenCalledWith('Forget the token and drop your New reveal card?');
    expect(localStorage.getItem(TOKEN_KEY)).toBe('tok');

    confirm.mockReturnValue(true);
    await user.click(forget);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    await waitFor(() => expect(screen.getByLabelText('GitHub token')).toHaveFocus());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

What the harness does, and why:
- **The commit.** It is the only GitHub call that is faked, as `CalibrationPage.test.tsx:14-17` fakes `commitTuning`. `readPreviewCards` stays real against the fetch stub, which never settles. So Edit's file stays loading, and New reveal never needs it.
- **The card list** is R3's store (`CardAnalyticsPage.test.tsx:10-40`). It holds one released card, which Edit card opens straight from the list (R-71).
- **The width** is a store too, through the bridge's `useContainerWidth`. jsdom has no `ResizeObserver`, and R-64 wants the content box, which a stubbed observer would have to fake (`WeeklyCard.test.tsx:10-16` mocks the hook the same way).
- **The token** is the real store, seeded in `localStorage` (`CalibrationPage.test.tsx:19`), so Save token and Forget token run for real.
- **Routing.** `createMemoryRouter`, since the guard needs a data router. The dialog's buttons answer it, never `window.confirm`.
- **`fillCard`** fills a Character numbered in Amber's block, the form's default ink. It uses the labels R4-5b keeps ("Collector number", "Name", "Cost", "Strength", "Willpower", "Lore"), and uploads through the card panel's file input, the only one New reveal has.
- **`afterEach`** restores every stub, since the `app` project shares a worker across files.

Run:

```bash
pnpm vitest run --project app src/tools/studio/__tests__/StudioPage.test.tsx
```

Expected: `Test Files  1 failed (1)`, `Tests  no tests`, with `Error: Failed to resolve import "../StudioPage" from "src/tools/studio/__tests__/StudioPage.test.tsx". Does the file exist?`

- [ ] **Step 11: Add the workspace and the page**

Create `src/tools/studio/StudioWorkspace.tsx`:

```tsx
import {useRef} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {useContainerWidth} from '../../app-bridge';
import {useGithubToken} from '../../github/useGithubToken';
import type {FocusHandoff} from '../../shell/focusHandoff';
import {studioHref, type StudioMode} from '../../shell/nav';
import {PageLayout} from '../../shell/PageLayout';
import {UnsavedChangesGuard} from '../../shell/UnsavedChangesGuard';
import {SegmentedControl} from '../../ui/SegmentedControl';
import {useRevealAdmin} from '../reveal/useRevealAdmin';
import {openCard} from './editorState';
import {NewRevealPane} from './NewRevealPane';
import {STUDIO_SUBTITLE, STUDIO_TITLE, studioDocumentTitle} from './studioCopy';
import {studioLayout} from './studioLayout';
import {
  forgetTokenQuestion,
  shouldBlockStudioNavigation,
  studioCardOf,
  studioModeOf,
  studioUnsavedMessage,
  type StudioDrafts,
} from './studioPaths';
import {STUDIO_GRID} from './studioStyles';
import {useCardEditor} from './useCardEditor';

const MODES: ReadonlyArray<{value: StudioMode; label: string}> = [
  {value: 'new', label: 'New reveal'},
  {value: 'edit', label: 'Edit card'},
];

interface StudioWorkspaceProps {
  token: string;
  /** The page's (R-59), held above the gate: Save token asks for it before this mounts. */
  handoff: FocusHandoff;
}

/**
 * R-26's in-page Forget token, offered when GitHub rejects the token. The
 * workspace is keyed by the token, so forgetting it drops both drafts: it asks
 * first while one is dirty, as the tuning aside does (R-84). The gate that
 * replaces the workspace takes the handoff.
 */
function useForgetToken({drafts, handoff}: {drafts: StudioDrafts; handoff: FocusHandoff}): () => void {
  const {clearToken} = useGithubToken();
  return () => {
    const question = forgetTokenQuestion(drafts);
    if (question !== null && !window.confirm(question)) return;
    clearToken();
    handoff.request();
  };
}

/**
 * Card studio with a token saved. It holds both drafts, New reveal's and Edit
 * card's, so a mode switch keeps them (R-57), and the page's one guard over
 * them (R-58): a card change asks about the Edit draft only, leaving about
 * every dirty draft. The guard needs the data router, so no story renders this.
 *
 * The root under the header is the element useContainerWidth measures. It is
 * there in every mode and state, so the measure never stops: the hook watches
 * only the element it finds on mount. Its width picks the layout, wide or
 * narrow (R-64), and the active pane fills its slots in that layout's order
 * (R-63).
 */
export function StudioWorkspace({token, handoff}: StudioWorkspaceProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = studioModeOf(location);
  const card = studioCardOf(location);
  const rootRef = useRef<HTMLDivElement>(null);
  const layout = studioLayout(useContainerWidth(rootRef));
  const ctrl = useRevealAdmin();
  const edit = useCardEditor({token, cardId: card});
  const drafts = {reveal: ctrl.dirty, edit: edit.dirty};
  const busy = {reveal: ctrl.publishing, edit: edit.saving};
  const forgetToken = useForgetToken({drafts, handoff});

  return (
    <PageLayout
      title={STUDIO_TITLE}
      subtitle={STUDIO_SUBTITLE}
      // Pushed, so Back returns to the other mode; the card rides along (R-57).
      actions={
        <SegmentedControl
          ariaLabel="Studio mode"
          options={MODES}
          value={mode}
          onChange={(next) => void navigate(studioHref(next, card))}
        />
      }
      writes
      flush
      documentTitle={studioDocumentTitle({mode, card: openCard(edit.lookup)})}
      scrollKey={studioHref(mode, card)}>
      <UnsavedChangesGuard
        dirty={drafts.reveal || drafts.edit}
        leaves={(from, to) => shouldBlockStudioNavigation(from, to, drafts)}
        message={(to) => studioUnsavedMessage({from: location, to, drafts, busy})}
      />
      <div ref={rootRef} style={STUDIO_GRID[layout]}>
        {mode === 'new' && <NewRevealPane ctrl={ctrl} layout={layout} handoff={handoff} onForgetToken={forgetToken} />}
      </div>
    </PageLayout>
  );
}
```

Create `src/tools/studio/StudioPage.tsx`:

```tsx
import {useRef} from 'react';
import {GithubTokenGate} from '../../github/GithubTokenGate';
import {useGithubToken} from '../../github/useGithubToken';
import {useFocusHandoff, useTakeHandoff, type FocusHandoff} from '../../shell/focusHandoff';
import {PageLayout} from '../../shell/PageLayout';
import {StudioWorkspace} from './StudioWorkspace';
import {STUDIO_SUBTITLE, STUDIO_TITLE} from './studioCopy';

interface StudioGateProps {
  onSave: (token: string) => void;
  handoff: FocusHandoff;
}

/**
 * No token: the gate, under the studio's own title and branch notice (R1-7,
 * R-4). Its field takes a pending handoff: after the in-page Forget token
 * (R-84), the button pressed is gone with the workspace.
 */
function StudioGate({onSave, handoff}: StudioGateProps) {
  const gateRef = useRef<HTMLDivElement>(null);
  useTakeHandoff(handoff, gateRef, 'input');
  return (
    <PageLayout title={STUDIO_TITLE} subtitle={STUDIO_SUBTITLE} writes>
      <div ref={gateRef}>
        <GithubTokenGate onSave={onSave} />
      </div>
    </PageLayout>
  );
}

/**
 * Card studio (/studio): New reveal and Edit card on one page (R-2, R-57),
 * replacing the reveal publisher and Card images. Everything in it commits,
 * so all of it sits behind the token gate. The page holds the focus handoff
 * (R-59), since Save token swaps the gate for the workspace and takes its own
 * button with it: the workspace's next view takes focus.
 */
export function StudioPage() {
  const {token, setToken} = useGithubToken();
  const handoff = useFocusHandoff();
  if (!token) {
    const onSave = (next: string) => {
      setToken(next);
      handoff.request();
    };
    return <StudioGate onSave={onSave} handoff={handoff} />;
  }
  // Keyed by the token (R-84): a new token is a new workspace, with empty drafts, as /calibration's tray is.
  return <StudioWorkspace key={token} token={token} handoff={handoff} />;
}
```

Keep these as written:
- **The ref.** Only the root `div` takes `rootRef`, and it renders in every mode. `useContainerWidth` watches the element it finds on mount.
- **No `useCallback` for the guard's two functions** (MEMO_BAN). The guard calls `message` only while a navigation is held (R4-5s).
- **`{mode === 'new' && …}`.** R4-6b turns it into `mode === 'new' ? <NewRevealPane … /> : <EditPane … />` and passes `forgetToken` to the Edit pane too.

Run `pnpm vitest run --project app src/tools/studio/__tests__/StudioPage.test.tsx`. Expected: `Tests  14 passed (14)`.

If the Save token case fails on focus, check R4-5b's wide `FormSection`: its header must be a plain `h2`, so Collector number is the form's first control.

- [ ] **Step 12: Write the failing test for the steady scrollbar gutter (R-64)**

In `src/shell/PageLayout.test.tsx`, before `it('scrolls the body back to the top when scrollKey changes, …` (`:100`), add:

```tsx
  it("reserves a flush body's scrollbar gutter, so a page that measures its own width never sees it jump (R-64)", () => {
    render(
      <PageLayout title="Card studio" flush>
        <p>Body</p>
      </PageLayout>,
    );
    expect(screen.getByText('Body').parentElement?.style.scrollbarGutter).toBe('stable');
  });
```

Run:

```bash
pnpm vitest run --project app src/shell/PageLayout.test.tsx
```

Expected: `Tests  1 failed | 9 passed (10)`, with `AssertionError: expected '' to be 'stable'`. Read the style off the element: jsdom's CSS parser doesn't know `scrollbar-gutter`, so `toHaveStyle` can't check it.

- [ ] **Step 13: Reserve the flush body's gutter**

In `src/shell/PageLayout.tsx`, lines 57-59. Current:

```tsx
// `flush`: the same scroller with no padding and no grid, for a page that lays
// out its own columns edge to edge (R2's tuning aside, R4's studio).
const FLUSH_BODY: React.CSSProperties = {flex: 1, minHeight: 0, overflowY: 'auto'};
```

New:

```tsx
// `flush`: the same scroller with no padding and no grid, for a page that lays
// out its own columns edge to edge (R2's tuning aside, R4's studio). Its
// scrollbar's gutter stays reserved whether or not it scrolls: Card studio
// picks its layout from its own measured width (R-64), and a scrollbar that
// came and went with the layout would flip it back and forth at the threshold.
const FLUSH_BODY: React.CSSProperties = {flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable'};
```

Run `pnpm vitest run --project app src/shell/PageLayout.test.tsx src/tools/analytics/calibration/__tests__/CalibrationPage.test.tsx`. Expected: both files pass, 10 and 53 tests. `/calibration` is the other flush page.

- [ ] **Step 14: Write the failing tests for the route and the nav item**

In `src/shell/nav.test.ts`:
- **`navItemFor`'s table, after `['/cards/2983', 'cards'],` (`:8`).** Add:

  ```ts
      ['/studio', 'studio'],
  ```

- **`isWritePath`'s list (`:19`).** Current:

  ```ts
    it.each(['/calibration', '/reveal', '/image/'])('%s writes to the app', (pathname) => {
  ```

  New:

  ```ts
    it.each(['/calibration', '/reveal', '/image/', '/studio'])('%s writes to the app', (pathname) => {
  ```

- **Before `describe('calibrationHref', …` (`:53`).** Add:

  ```ts
  describe('the Card studio item', () => {
    it('heads Publish, and owns /studio, which writes (R4)', () => {
      const publish = NAV_ITEMS.filter((item) => item.group === 'publish');
      expect(publish[0]).toMatchObject({id: 'studio', label: 'Card studio', mark: 'Cs', path: '/studio', writes: true});
    });
  });

  ```

In `src/shell/Sidebar.test.tsx`, line 33. Current:

```tsx
    expect(hrefs('Publish')).toEqual(['/reveal', '/image']);
```

New:

```tsx
    expect(hrefs('Publish')).toEqual(['/studio', '/reveal', '/image']);
```

In `src/router.test.tsx`:
- **`WRITE_PAGES` (`:101-106`).** Current:

  ```tsx
    const WRITE_PAGES: Array<[path: string, title: string]> = [
      ['/reveal', 'Reveal publisher'],
  ```

  New:

  ```tsx
    const WRITE_PAGES: Array<[path: string, title: string]> = [
      // The token gate fills the whole body (R4).
      ['/studio', 'Card studio'],
      ['/reveal', 'Reveal publisher'],
  ```

  With the real token store, the three `WRITE_PAGES` cases now cover `/studio`: the gate under the title, the sidebar's Forget token sending it back to the gate, and one `main` before and after a token is saved.

- **Before `it('opens Card analytics on a card at /cards/2983, …` (`:158`).** Add:

  ```tsx
    it('opens Card studio on any mode and card, current in the sidebar while the old tools are not', () => {
      renderAt('/studio?mode=edit&card=1001');
      expect(screen.getByRole('heading', {level: 1, name: 'Card studio'})).toBeInTheDocument();
      expect(sidebarNav().getByRole('link', {name: 'Card studio'})).toHaveAttribute('aria-current', 'page');
      expect(sidebarNav().getByRole('link', {name: 'Reveal publisher'})).not.toHaveAttribute('aria-current');
    });

  ```

Run:

```bash
pnpm vitest run --project app src/shell/nav.test.ts src/shell/Sidebar.test.tsx src/router.test.tsx
```

Expected: `Tests  7 failed | 85 passed (92)`. The failures:
- `nav.test.ts`, each an `AssertionError`:
  - `gives /studio to the studio item`: `expected undefined to be 'studio'`;
  - `/studio writes to the app`: `expected false to be true`;
  - `heads Publish, and owns /studio, which writes (R4)`: `expected { id: 'reveal', …(5) } to match object { id: 'studio', …(4) }`.
- `Sidebar.test.tsx`, `lists the pages under their group labels`: `expected [ '/reveal', '/image' ] to deeply equal [ '/studio', '/reveal', '/image' ]`.
- `router.test.tsx`, each a `TestingLibraryElementError`:
  - `asks for a GitHub token on /studio, under the page title`: `Unable to find an accessible element with the role "heading" and name "Card studio"`;
  - `returns /studio to the token gate from the sidebar's Forget token`: the same, for the button "Forget token";
  - `opens Card studio on any mode and card, …`: the same, for the heading.

`keeps /studio in one main landmark` passes already, on the not-found page.

- [ ] **Step 15: Add the route and the nav item**

In `src/shell/nav.ts`, `NAV_ITEMS`, after the Card analytics item (`:26`). Add:

```ts
  // New reveal and Edit card in one page (R4). It replaces the two items below, which R4-6c removes.
  {id: 'studio', label: 'Card studio', mark: 'Cs', path: '/studio', group: 'publish', writes: true},
```

In `src/router.tsx`, after the `RevealPage` import (`:10`). Add:

```tsx
import {StudioPage} from './tools/studio/StudioPage';
```

Before `{path: 'reveal', element: <RevealPage />},` (`:25`), add:

```tsx
      // New reveal and Edit card (R4); ?mode= and ?card= pick the mode and the card (studioHref).
      {path: 'studio', element: <StudioPage />},
```

Run `pnpm vitest run --project app src/shell/nav.test.ts src/shell/Sidebar.test.tsx src/router.test.tsx`. Expected: `Tests  95 passed (95)`: 32, 12 and 51. `/studio` joins `WRITE_PATHS`, so the data-driven cases gain three: its branch notice, its tab title and its notice-when-it-writes row.

- [ ] **Step 16: Add the story, run this task's tests together, lint the changed files and typecheck**

Create `src/tools/studio/NewRevealPane.stories.tsx`:

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import type {FocusHandoff} from '../../shell/focusHandoff';
import type {RevealAdminController} from '../reveal/useRevealAdmin';
import {NewRevealPane} from './NewRevealPane';
import {revealController} from './studioFixtures';
import type {StudioLayout} from './studioLayout';
import {STUDIO_GRID} from './studioStyles';

/** No story takes a handoff: nothing here unmounts the control pressed. */
const NO_HANDOFF: FocusHandoff = {pending: false, request: () => {}, done: () => {}};

interface NewRevealStoryProps {
  layout: StudioLayout;
  ctrl: RevealAdminController;
}

/**
 * New reveal in the studio's root, as StudioWorkspace lays it out under the
 * page header. The workspace has no story of its own: its guard needs the data
 * router, which a story doesn't have.
 */
function NewRevealStory({layout, ctrl}: NewRevealStoryProps) {
  return (
    <div style={STUDIO_GRID[layout]}>
      <NewRevealPane ctrl={ctrl} layout={layout} handoff={NO_HANDOFF} onForgetToken={() => {}} />
    </div>
  );
}

const meta: Meta<typeof NewRevealStory> = {
  title: 'Admin/Publish/Card studio/New reveal',
  component: NewRevealStory,
  args: {layout: 'wide', ctrl: revealController()},
};
export default meta;
type Story = StoryObj<typeof meta>;

/** An empty draft, wide: the card panel, the form's four sections two by two, and the aside. */
export const EmptyWide: Story = {};

/** The same draft narrow: the form first, as an accordion, then the card panel and the aside. */
export const EmptyNarrow: Story = {args: {layout: 'narrow'}};

/** Just published: the outcome, with the deploy note and the commit link, over an empty form again. */
export const Published: Story = {
  args: {ctrl: revealController({result: {commitUrl: 'https://github.com/Doberjohn/inkweave/commit/abc123'}})},
};

/** GitHub rejected the token: the failure, with Forget token (R-26). */
export const RejectedToken: Story = {
  args: {
    ctrl: revealController({
      dirty: true,
      commitError: 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: {"message":"Bad credentials"}',
    }),
  },
};
```

Then run:

```bash
pnpm vitest run --project app src/tools/studio/__tests__/studioPaths.test.ts src/tools/studio/__tests__/studioCopy.test.ts src/tools/studio/__tests__/StudioSlots.test.tsx src/tools/studio/__tests__/NewRevealPane.test.tsx src/tools/studio/__tests__/StudioPage.test.tsx src/tools/reveal/__tests__/useRevealAdmin.test.ts src/shell/nav.test.ts src/shell/Sidebar.test.tsx src/router.test.tsx src/shell/PageLayout.test.tsx
```

Expected: `Test Files  10 passed (10)`. The counts are 39, 7, 4, 11, 14, R4-3b's own for `useRevealAdmin.test.ts` (17 in its draft), 32, 12, 51 and 10: `Tests  197 passed (197)` with R4-3b's 17. `useRevealAdmin.test.ts` runs here only for the promise-returning `publish`: if its a.gif case fails on which of the image's two errors comes first, that is R4-3a's and R4-3b's order, as landed, not this task's. Stop and report it.

```bash
pnpm exec eslint --max-warnings 0 src/tools/studio/StudioPage.tsx src/tools/studio/StudioWorkspace.tsx src/tools/studio/NewRevealPane.tsx src/tools/studio/NewRevealPane.stories.tsx src/tools/studio/studioCopy.ts src/tools/studio/studioPaths.ts src/tools/studio/studioFixtures.ts src/tools/studio/components/StudioSlots.tsx src/tools/studio/__tests__/StudioPage.test.tsx src/tools/studio/__tests__/NewRevealPane.test.tsx src/tools/studio/__tests__/studioCopy.test.ts src/tools/studio/__tests__/StudioSlots.test.tsx src/tools/studio/__tests__/studioPaths.test.ts src/tools/reveal/useRevealAdmin.ts src/shell/PageLayout.tsx src/shell/PageLayout.test.tsx src/shell/nav.ts src/shell/nav.test.ts src/shell/Sidebar.test.tsx src/router.tsx src/router.test.tsx
```

Expected: no output, exit 0. `react-refresh` passes: each component file exports components only, and `NewRevealPaneProps` is a type.

```bash
pnpm typecheck
```

Expected: exit 0. It builds the engine and runs `tsc -b`, over the story and the tests too.

Don't run `pnpm lint`, `pnpm test:run` or `pnpm build`. The pre-commit hook runs the first two (gates once), and R4-8 runs the build.

- [ ] **Step 17: Code Health**

Run CodeScene's `code_health_review` on each source and test file in Step 19's `git add`.

Expected: 10.0 with no findings for each, as MCP 1.5.7 scored them in the sandbox. The hand count and the complexity are in Interfaces.
- **"Complex Method" on `StudioWorkspace`:** a branch went inline. Move it into a helper or a private hook, as `useForgetToken` is.
- **"Code Duplication" in `StudioPage.test.tsx`:** a case repeats `fillCard`'s steps or the stores' setup. Use the helpers.
- **"Primitive Obsession" on a test file:** a helper takes a bare string. Return an object, as `modes()` does.

The PR's server gate is stricter, so R4-8 runs `analyze_change_set` before the push.

- [ ] **Step 18: Look at the studio in Storybook and the dev server**

These checks need a browser. If none is available to the implementer, record each as pending with the owner, as R1-2's Step 11 did.
1. **Storybook.** Start it with the preview tool's `admin-storybook` configuration (`.claude/launch.json`), not `pnpm storybook` in a shell. Open `Admin/Publish/Card studio/New reveal`:
   - **Empty wide:** the card panel's stripes in the first column, the form's four sections two by two across the middle, and the aside with the checklist, the synergies, a disabled "Publish to master" and no outcome line.
   - **Empty narrow:** the form first as an accordion with Identity open, then the card panel, then the aside.
   - **Published:** "Committed.", the 15-to-20-minute note and "View commit".
   - **Rejected token:** the error with "Forget token".
   - **Accessibility panel:** 0 violations.
2. **The page.** Start the preview tool's `admin-dev` configuration (`pnpm dev`, port 5180), not a shell, then open `/studio` with no token. It shows "Card studio", the branch pill and the gate, with "Card studio" in the sidebar's Publish group.
   - The owner saves a token: never type one yourself.
   - Then the mode switch shows, and focus lands in the form.
   - "Edit card" shows an empty body until R4-6b, and Back returns to New reveal.
3. **Stop both servers** with the preview tool. A running preview server makes the pre-commit hook's Vitest fail to start its workers.

- [ ] **Step 19: Commit**, with the Bash tool, only after the owner approves. Use two separate calls, so the commit command starts with `USER_APPROVED=1`:

```bash
git add src/tools/studio/StudioPage.tsx src/tools/studio/StudioWorkspace.tsx src/tools/studio/NewRevealPane.tsx src/tools/studio/NewRevealPane.stories.tsx src/tools/studio/studioCopy.ts src/tools/studio/studioPaths.ts src/tools/studio/studioFixtures.ts src/tools/studio/components/StudioSlots.tsx src/tools/studio/__tests__/StudioPage.test.tsx src/tools/studio/__tests__/NewRevealPane.test.tsx src/tools/studio/__tests__/studioCopy.test.ts src/tools/studio/__tests__/StudioSlots.test.tsx src/tools/studio/__tests__/studioPaths.test.ts src/tools/reveal/useRevealAdmin.ts src/shell/PageLayout.tsx src/shell/PageLayout.test.tsx src/shell/nav.ts src/shell/nav.test.ts src/shell/Sidebar.test.tsx src/router.tsx src/router.test.tsx
```

Then run CodeScene's `pre_commit_code_health_safeguard`, and go on only when it passes.

```bash
USER_APPROVED=1 git commit -m "feat(studio): open Card studio at /studio with New reveal (#24)"
```

- **The hook.** Husky's pre-commit runs the full lint and `test:run`. Never pass `--no-verify`.
- **Workers.** If Vitest fails to start its workers under load, stop this session's preview servers, wait out other sessions' runs, and retry.
- **Afterwards,** `git status --short -- src` prints nothing.

### Hand-offs from R4-6a

- **R4-6b (the Edit pane).**
  - **The pane.** Replace `{mode === 'new' && <NewRevealPane … />}` with `mode === 'new' ? <NewRevealPane … /> : <EditPane … />`. The Edit pane renders `StudioSlots` for an open card, and its own full-width view for the search and the lookup states (`gridColumn: '1 / -1'` when wide). The root stays the same `div`.
  - **Forget token.** Give `EditPane` the workspace's `forgetToken`: `useForgetToken` already asks with both drafts in `forgetTokenQuestion`.
  - **The guard.** `studioUnsavedMessage` already words a card change ("Your changes to this card aren't saved yet. Leaving the card drops them."), a save in flight, and a card change still held once the save lands with New reveal dirty ("Your changes to this card are saved. Leaving the card drops nothing."). R4-6b adds the page test with edits in both drafts: a card change names Edit only, and going to `/` names both (R4-5s's hand-off). That test also covers `leaves`, the one mutant this task's tests couldn't catch.
  - **Focus.** `StudioPage`'s `handoff` is the page's one. Takers must stay mutually exclusive, as New reveal's are: Save token in Edit mode goes to the search field or the banner's `h2`, whichever view shows. Edit's `CommitOutcome` takes only while it shows an outcome.
  - **The tab title** already reads `openCard(edit.lookup)`. If R4-6b wants `gone` cards named too, extend `openCard`, not `studioDocumentTitle`'s `{mode, card}`.
  - **R-66.** After a publish lands, reload Edit's file. Key it on `ctrl.result` turning non-null, since `publish()` also resolves on a failure. `NewRevealAside` chains only the handoff on its promise.
  - **Copy.** Add Edit's `saveLabel({saving})` and its notes to `studioCopy.ts`, beside `publishLabel`.
- **R4-6c (retiring `/reveal` and `/image`).**
  - `nav.ts` loses the two items after `studio`. `Sidebar.test.tsx:33` becomes `['/studio']`, and `router.test.tsx`'s `WRITE_PAGES` loses its two rows. The new router case's "Reveal publisher" line becomes the Calibration & tuning link's, or goes.
  - `writePages.test.tsx` goes with the pages. Its three cases are in `StudioPage.test.tsx`'s first `describe` now.
  - `RevealPage.tsx:47`'s `onClick={ctrl.publish}` goes with the page, and with it the last reader of `publishError` (R4-3b's hand-off).
- **R4-7 (docs).** CLAUDE.md:18 can say the studio mounts the one guard with its own `leaves` and a message worded per navigation, and that `PageLayout`'s flush body keeps a steady scrollbar gutter.
- **R4-8 ("R4 as built").** Record these as departures:
  - `PageLayout` renders inside `StudioWorkspace` with a token (header addition 13);
  - `studioDocumentTitle` takes the open card through `openCard`;
  - `publish` returns its promise;
  - `FLUSH_BODY`'s `scrollbarGutter`;
  - `StudioSlots`;
  - `revealController` in `studioFixtures.ts`.

  List the rehearsal's checks: the layout at 1366 and 1440px with the sidebar open and collapsed, and focus across a layout flip (re-base note 6).
- **The controller (the sibling drafts, as re-checked at 18:15).** The names this task reads now agree: `EMPTY_FORM` in `emptyForm.ts` (R4-3a, R4-3b and the header's addition 7), the lookup's `kind` (R4-4b and the header's addition 11; this task reads it only through `openCard`), and `studioFixtures.ts` created by R4-2a, with R4-4b, R4-4d, R4-5d and R4-5e appending. This task appends `revealController`, and uses R3's `lorcanaCard` for its released card, so it depends on no other task's builders. R4-3a and R4-3b both give the file's own error before the validator's (settled at the plan commit), so Step 16's ten files give 197 of 197.
