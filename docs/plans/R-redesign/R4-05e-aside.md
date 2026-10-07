> Part of [R: Admin redesign](../R-redesign.md), phase R4 ([R4-card-studio.md](R4-card-studio.md)). Read the main plan's decisions (R-57 to R-91 for R4), corrections, global constraints and shared interfaces, then the R4 header, first.

> **Re-base notes (R4-5e, 2026-10-07).** Re-based from the aside half of the outline's "Task R4-5: Studio components, paths and layout" (`R4-card-studio.md:601-810`, written 2026-10-01 against the planned R1 code: the "Aside" bullets at `:722-734` and the `StudioAside` tests at `:771-775`). Written against `main @ e5e5029` (R1 to R3 as built, `b490fb7`, plus the pin-bump PR) and pin `upstream/inkweave @ 16283a13`, with decisions R-57 to R-91, the R4 header's contract addition 12, and the 2026-10-07 audit (`r4-audit-synth.md` "R4-5", `r4-audit-full.json`'s R4-5 entry). The audit cited the old pin `bc877e1`. This task reads no app file except through bridged kit pieces (`CtaButton`, `LinkButton`) that it already used at that pin, and those are unchanged at `16283a13`.
> 1. **The split.** The outline's R4-5 is split into R4-5a to R4-5f, with R4-5s and R4-5h added. This one, R4-5e, builds the aside's four parts. The page composes them in R4-6a and R4-6b:
>    - `ReadyChecklist`, New reveal's "Ready to publish N/7";
>    - `ChangeList`, Edit card's diff with Discard;
>    - `CommitOutcome`, under Publish or Save;
>    - `SynergyPanel`, the restyled synergies (R-90).
>
>    The outline's test file `StudioAside.test.tsx` named a component that doesn't exist (audit). The tests are now one file per part, plus one for the new `loadAgainNote`. The stories are one file, `StudioAside.stories.tsx`, under the leaf title `Admin/Publish/Card studio/Aside`. It shows the parts in the order the page stacks them.
> 2. **What it builds on.**
>    - **R4-2b's `changeRows.ts`:** `ChangeRow` (with its `id`) and `changeCount`. The Image row's wording is R4-2b's ("current art → {file}"), so this task writes no Image wording of its own. That settles the audit's "one Image-row wording".
>    - **R4-3a:** `readiness.ts` (`ChecklistItem`, `revealChecklist`), `emptyForm.ts` (`EMPTY_FORM`) and `src/test/revealForm.ts`.
>    - **R4-2a's `studioFixtures.ts`:** `JA_SCAN_ENTRY` and `RELEASED_CARD`.
>    - **Nothing from R4-5a,** as the header's task table has it (R4-5e needs R4-2a, R4-2b and R4-3a). Each part is an `src/ui` `Panel`, the surface R4-5a's `STUDIO_PANEL` copies. No new `adm-*` class is needed: Discard and Load it again are kit buttons, and the links and marks need no state styles.
> 3. **`ReadyChecklist` (R4-3a's hand-off).**
>    - It is a `Panel` titled "Ready to publish", with `{done}/{items.length}` as its action and a 4px gold `MeterBar`. The prototype draws it so (`dc.html:255-257`).
>    - **Seven items, not the handoff's five** (`README.md:122`). The spec correction "Card studio validation (R4)" derives the list from the validator, and R4-3a builds it: Collector number, Name, Ink, Cost, Type and stats, Card text and Image. Rarity stays optional, so it is no item.
>    - The bar has no `label`. The count prints beside it, so the bar is decoration (`MeterBar.tsx:11-12`, the audit's "still valid").
>    - Each item is a 16px round mark, its label, and its `message` while it is open.
>    - **Not by colour alone.** Each mark is `role="img"`, named "Done" or "To do". A done mark is a ✓ on the success green. An open one is a ring in `barNeutral`, which keeps 3:1 on the panel (1.4.11, `adminTheme.ts:45-48`).
>    - **Never red (R-72).** An open item's message is muted. A fresh form reads 1/7, since Card text starts ticked.
>    - The tests build their items with `revealChecklist` over the real validator, never by hand (R4-3a's rule).
> 4. **`ChangeList` (R-77).**
>    - It is a `Panel` headed `changeCount(rows)`: "No changes yet", "1 change" or "N changes" (R4-2b, `dc.html:260`). Its rows are keyed by `row.id`.
>    - Each row is its label (muted, small) over `<code>{from} → {to}</code>`. The diff wraps as `PendingTray`'s `DIFF` does (`src/tools/tuning/components/PendingTray.tsx:50-57`: `pre-wrap`, `overflowWrap: 'anywhere'`), so a long card text wraps whole, never cut short. Its colour is the prototype's text colour (`dc.html:261`), where the tray's diff is muted. The prototype's ellipsis is the one thing not taken.
>    - **Discard (all).** One `LinkButton`, shown only while there are changes, with visible text "Discard" and the name "Discard all changes" (2.5.3: the name starts with the visible word).
>    - **Held while a save runs (`busy`, new).** R4-4c's hand-off to R4-6b (`R4-04c-editor-saving.md:1416`) holds Discard during a save, as Save is held. A Discard mid-save would put back the pre-save form, and once the save lands, that form diffs against the new baseline (R-70), so it reads as a change that undoes the save. The page can't hold a button inside the list, so the list takes `busy?: boolean` and renders Discard `disabled={busy}`. `LinkButton` takes the button's props and dims itself when disabled (opacity 0.4, a not-allowed cursor). The button stays in place, so the header doesn't shift mid-save. Save starts only from its own button, so Discard never holds focus when it disables.
>    - **No per-row revert (R-77).** "Revert image" belongs to the card panel (R4-5d, `dc.html:247`), not to this list.
>    - **The empty line** is the prototype's: "Edit any field or replace the image. Changes are listed here before you save." (`dc.html:262`).
>    - **Focus (R-48, R-59).** Discard empties the list and takes its own button with it. So it focuses the heading first, as R2's Clear all does (`PendingTray.tsx:139-147`). `Panel`'s `titleFocusable` gives the `h2` its `tabIndex={-1}` (`Panel.tsx:50`). `Panel` takes no ref, so a wrapping `<div>` holds one, and the handler finds the `h2` in it.
> 5. **`CommitOutcome` (significant in the audit).**
>    - **The status line is always mounted.** It returns a `<p role="status">` from the first render, empty until there is something to say, as R2's tray does (`PendingTray.tsx:180-192`). The outline's `JSX.Element | null` mounted the live region with its text, which often goes unannounced.
>    - **Success.** "Committed.", then the "View commit" link (accent colour, `target="_blank"`, `rel="noreferrer"`, as `PendingTray.tsx:186`), then the `note` the page picks (`goLiveNote`), in the success green. The order follows R2's tray, not the outline's "note, then link".
>    - **Failure.** A `Notice tone="error"`, which is the alert, so nothing wraps it in another (`Notice.tsx:31`; the audit's "still valid"). Under it:
>      - **"Load it again"**, a `CtaButton variant="neutral"`, as R2's "Reload tuning.json" and R3's Retry are (`PendingTray.tsx:115-117`). It shows only when the page passes `onLoadAgain`, and the page passes it only for a stale refusal (R4-4c's `failure === 'stale'`).
>      - **`ForgetTokenOffer`** when `isRejectedToken(error)` and the page passes `onForgetToken` (R-26). For New reveal, the message is the only sign of a 401.
>    - **Forget token and the drafts (R-84).** `CommitOutcome` offers the button and nothing more. The page passes a forget that asks first while a draft is dirty, with `window.confirm`, as `TuningAside.tsx:124-136` does (R4-6a).
>    - **The race message.** R4-1b's hand-off (`R4-01b-edit-client.md:511-515`), the R4 header's shared rule ("The stale check") and R4-4c's hand-off (`R4-04c-editor-saving.md:1414`) agree: R4-4c's `failureOf` (`editSave.ts`) rewords `commitFiles`' race once, as a save, since its failure classifier reads the error anyway.
>      - So `CommitOutcome` shows every message as it is given. New reveal keeps "… Publish again." (`githubCommit.ts:161`). Edit's controller hands over "… changed while saving, so nothing was saved. Save again."
>      - The tests pin both verbatim, each with no way out but trying again.
>      - Step 1 checks that R4-4c's wording is in place. This task doesn't import it.
>    - **What "Load it again" kept (R-68), new.** R-68 says Load it again tells the operator how many edits it dropped, and R4-4c's controller exposes `dropped: number | null`. No task drew it. The status line is the live region already mounted when the read lands, so the note goes there. That follows R2's `DroppedNote` (`TuningAside.tsx:391-406`) and `reloadNote.ts`.
>      - The prop is `dropped?: number | null`. The words come from a new pure `loadAgainNote({dropped})` in `src/tools/studio/loadAgainNote.ts`, which names the target branch.
>      - A landed commit takes the line over a note. R4-4c's draft clears `dropped` when a save starts, so the two meet only in a test.
>    - **The go-live note** is a string the page picks: New reveal's, or for Edit by `result.withImage`, the image tool's note with an image and New's without (the header's "Labels and notes", R4-6a and R4-6b). `CommitOutcome` prints the note it is given, so it needs no mode, and R4-4c's `EditResult` (`{commitUrl, withImage}`) fits its `result` as it is.
>    - **Focus (R-59).** The outline gave the outcome no handoff. `CommitOutcome` takes `handoff?: FocusHandoff`, through `useTakeHandoff` (`focusHandoff.ts:40-52`), once it shows something:
>      - the failure (a `tabIndex={-1}` wrapper round the alert and its buttons), when there is one;
>      - else the status line (`tabIndex={-1}` too).
>
>      That is R-59's target "the outcome line when Publish or Save leaves focus on `<body>`". After Load it again, the status line holding the note is the target too: R2's Reload focuses its note the same way (F19). The page decides when to ask (once the commit or the read lands, never on the click), and keeps its takers apart by state: `CommitOutcome` takes only while it shows something, so the page's other taker in the same pane takes only while it shows nothing (hand-offs below). `useTakeHandoff` moves focus only if it fell to `<body>`.
> 6. **The synergy panel (R-90).**
>    - **The kept panel, restyled in place.** `src/tools/reveal/components/SynergyPreviewPanel.tsx` (the header's "Kept" list) leaves the app's legacy tokens: `COLORS.gray600` (`:11`, `:32`), `COLORS.surfaceAlt` (`:26`), `RADIUS.sm` (`:27`) and `FONT_SIZES.sm` (`:11`, `:29`). Its rows become admin cards, like the change rows: the card fill clipped to its border, `ADMIN_RADIUS.control`, text in `ADMIN_COLORS.text`, the count in `muted`. "N card(s)" becomes "1 card" or "N cards".
>      - **The empty line stays.** "No synergies detected yet. Add card text or keywords to see matches." The prototype's "Synergies appear once ink, type and card text are set." (`dc.html:266`) would be wrong here: ink and type always hold a value (Amber and Character by default), and Edit opens on a filled card.
>      - **Who uses it.** `RevealPage` keeps using it bare (`RevealPage.tsx:66`) until R4-6c deletes that page. Its story (`Reveal Admin/SynergyPreviewPanel`) is left as is.
>    - **The studio's frame.** A new `SynergyPanel` wraps it in a `Panel` titled "Synergies", with "computed live" as its action, in muted (`dc.html:265` draws it dim, which fails R-6).
>    - **Placement.** The page puts it at the foot of the aside's panels, above Publish or Save, and leaves it out for an image-only card (R-61).
> 7. **Fixtures.** `studioFixtures.ts` (R4-2a) gains `SYNERGY_GROUPS`: a direct rule with three partners and a playstyle with one. The tests and the stories share it. The checklist and the change rows are built in each file from the real model (`revealChecklist`, `changeRows`), never by hand. The one exception is `ChangeList.test.tsx`, which passes literal `ChangeRow`s, since it tests rendering, not formatting.
> 8. **Code Health, counted by hand.** Primitives are `string`, `number` and `boolean` parameters (and their aliases) of named functions and annotated lambdas.
>
>    | Module | Primitive parameters | Highest complexity |
>    |---|---|---|
>    | `loadAgainNote.ts` (new) | 0 of 1 (`{dropped}` is an object) | 3 |
>    | `ReadyChecklist.tsx` (new) | 0 of 4 | `ChecklistRow` 3 (a ternary and one `&&`) |
>    | `ChangeList.tsx` (new) | 0 of 5 (`busy` is a props field, not a parameter) | `ChangeList` 2, `ChangeRows` 2 (`disabled={busy}` adds no branch) |
>    | `CommitOutcome.tsx` (new) | 0 of 5; 1 of 5 counting `.some`'s unannotated `value` (20%) | `CommitFailure` 4 (two `&&` and one `&&` chain of two terms) |
>    | `SynergyPanel.tsx` (new) | 0 of 1 | 1 |
>    | `SynergyPreviewPanel.tsx` | 0 of 3 (was 0 of 2) | 2 |
>    | `studioFixtures.ts` | no new function | — |
>
>    - **The test and story modules** declare no primitive parameter: every helper takes an object, a list or nothing (`CommitOutcome.test.tsx`'s `pendingHandoff()` takes none, where a `pending: boolean` would have been 1 of 2, and was only ever `true`). The `it.each` callbacks are unannotated.
>    - Every component takes one props object, and no function takes more than one argument.
>    - **No complex conditional.** "Is there anything to show?" is `[result, error, dropped].some((value) => value !== null)`, not an `a || b || c` chain.
>    - `githubCommit.ts` is imported (`targetBranch`), never edited.
> 9. **Gates once.**
>    - The five test files, `eslint` on the thirteen changed files, and one `pnpm typecheck`. Then a Code Health step, and the commit in two Bash calls.
>    - The pre-commit hook runs the full lint and `test:run`.
>    - No reveal-sync run: neither the bridge nor a contract file changes.
> 10. **Verified (2026-10-07)** in `scratchpad/r4-rebase/sandbox-R4-5e`.
>     - **Setup.**
>       - The repo's `src` at `b490fb7` with the uncommitted pin bump, laid over with the drafts this task builds on: R4-3a's `readiness.ts`, `emptyForm.ts`, `validateForm.ts` and `src/test/revealForm.ts`, byte-identical to `sandbox-R4-3a`'s; R4-2b's `changeRows.ts` with R4-1a's `replaceCardInPreviewJson.ts` and R4-2a's `scanLanguages.ts`, `constants.ts` and `studioFixtures.ts` (from `sandbox-R4-4c`); and R4-5a's `studioStyles.ts` (unused here).
>       - `node_modules` and `upstream` are junctions to the repo, read-only. Vite's cache is in the sandbox, with `server.fs.strict` off so Vite follows the junctions. The repo wasn't touched.
>     - **Failing first.** Steps 2, 4, 6 and 8 fail to resolve the module they test, with the messages quoted there. Step 10 fails 2 of 3 against today's `SynergyPreviewPanel`, on "3 card(s)" and on the empty line's `gray600`.
>     - **Passing.** The five files pass 35 tests: `loadAgainNote` 4, `ReadyChecklist` 4, `ChangeList` 8, `CommitOutcome` 16 and `SynergyPanel` 3. With `busy` (below), `ChangeList` has 9 and the five files 36.
>     - **Typecheck.** `tsc -p tsconfig.app.json --noEmit` over the whole sandbox exits 0, stories included.
>     - **Lint.** `pnpm exec eslint --max-warnings 0 --stdin --stdin-filename <path>`, run in the repo, exits 0 on all thirteen files. A probe with a raw font size, a hex colour and a styled `<button>` failed, so the rules were live.
>     - **Mutations.** 22 were tried, and the five test files killed every one:
>       - **`ChangeList`:** no focus before Discard; Discard with no rows; the diff on one line; the heading not focusable.
>       - **`CommitOutcome`:** the status line mounted with its text; Forget token on any failure; Load it again unasked; no handoff for a `dropped` note; the note before a landed commit; the link in the same tab; the failure not focusable; the handoff taken with nothing to show.
>       - **`ReadyChecklist`:** red messages; the marks swapped; every item counted done; an empty bar; a message on a done item.
>       - **The synergies:** "card(s)"; a dim count; no "computed live".
>       - **`loadAgainNote`:** the singular lost; the branch fixed to master.
>     - **Stories.** All eleven render in jsdom through `composeStories`, and `axe-core` 4.13 finds no violations in any of them (colour contrast can't be computed in jsdom). Their text was read back: `EditRefresh` lists Version "Bandmate → Band Leader", Scan language "Japanese → English" and Image "current art → miriam-en.png", and `NewRevealHalfDone` reads 3/7, naming R-73's refusal and the spelled-out "Strength". This probe stays out of the plan.
>     - **CodeScene.** Local CodeScene (MCP 1.5.7), in a throwaway `git init` folder with no commit (the CLI needs a repository), scores all thirteen files 10.0 with no findings. The PR gate is stricter, so R4-8 runs `analyze_change_set` before the push.
>     - **Re-verified (verifier, 18:30)** in `scratchpad/r4-rebase/sandbox-v-R4-5e`, a copy of `sandbox-R4-5e` with this file's code blocks extracted afresh after the verifier's edits (`pendingHandoff`, the header's New reveal note, `SET_TOTAL + 1`): the five files pass 35 of 35; `tsc -p tsconfig.app.json --noEmit` exits 0; the two changed blocks pass `eslint --max-warnings 0 --stdin` in the repo; all eleven stories render through `composeStories` with no axe-core 4.13 violations (contrast and `region` off); and local CodeScene scores the two changed files 10.0. Step 1's new greps were run against R4-4c's verified sandbox (`sandbox-v-R4-4c`): the race wording prints once from `editSave.ts`, and `useEditSave.ts` prints the four lines Step 1 lists, where the old grep of `useCardEditor.ts` printed nothing. A probe also showed that R4-6a's `getByText(/^Ready to publish/)` finds the `h2` without the count, while the region holds "7/7" (hand-offs).
>     - **Re-verified with `busy` (cross-task critic, 19:27)** in `scratchpad/r4-rebase/sandbox-R4-5e-busy`, a copy of `sandbox-v-R4-5e`'s `src` and configs (`node_modules` and `upstream` junctioned read-only), with Steps 6 and 7's blocks extracted afresh:
>       - the five files pass 36 of 36 (`ChangeList` 9);
>       - `tsc -p tsconfig.app.json --noEmit` exits 0, stories included (they pass no `busy`);
>       - both blocks pass `eslint --max-warnings 0 --stdin` in the repo;
>       - local CodeScene scores both files 10.0 with no findings (throwaway `git init` folder `cs-R4-5e-busy`);
>       - two mutants were killed: with no `disabled`, the new test fails; with `disabled` always on, it fails along with the Discard and focus tests.

### Task R4-5e: The aside (ready checklist, change list, commit outcome, synergies)

**Files:**
- Create in `src/tools/studio/`:
  - `loadAgainNote.ts`: what "Load it again" kept (R-68);
  - `components/ReadyChecklist.tsx`, `components/ChangeList.tsx`, `components/CommitOutcome.tsx` and `components/SynergyPanel.tsx`;
  - `components/StudioAside.stories.tsx`.
- Modify:
  - `src/tools/reveal/components/SynergyPreviewPanel.tsx`: restyled to admin tokens (R-90). Its export and props don't change.
  - `src/tools/studio/studioFixtures.ts`: `SYNERGY_GROUPS` appended, and the engine import gains `type SynergyGroup`.
- Test (create), in `src/tools/studio/__tests__/`: `loadAgainNote.test.ts`, `ReadyChecklist.test.tsx`, `ChangeList.test.tsx`, `CommitOutcome.test.tsx` and `SynergyPanel.test.tsx`.

**Interfaces:**
- **Consumes:**
  - **R4-2b** (`src/tools/studio/changeRows.ts`): `interface ChangeRow {id: EditableCardKey | 'image'; label: string; from: string; to: string}`, `changeRows(input: {loaded; changes; imageName}): ChangeRow[]` (the stories only) and `changeCount(rows: readonly ChangeRow[]): string`.
  - **R4-3a:**
    - `src/tools/studio/readiness.ts`: `interface ChecklistItem {id: ChecklistId; label: string; done: boolean; message: string | null}` (message null exactly when done), and `revealChecklist(form, validation, image: {ready; error}): ChecklistItem[]` (the tests and stories);
    - `src/tools/reveal/emptyForm.ts`: `EMPTY_FORM`;
    - `src/test/revealForm.ts`: `revealForm(overrides?)` (the tests and stories).
  - **R4-2a** (`src/tools/studio/studioFixtures.ts`): `JA_SCAN_ENTRY` (a `ja` scan, Miriam, version "Bandmate") and `RELEASED_CARD`.
  - **R4-4c**, checked but not imported: `editSave.ts`'s `failureOf` words `commitFiles`' race as a save ("… changed while saving, so nothing was saved. Save again."), and `useEditSave.ts`'s `EditSave`, which the controller spreads, holds `failure`, `loadAgain` and `dropped: number | null`, and `saving`, which the page passes to `ChangeList` as `busy`.
  - **R1 to R3:**
    - `Panel` with `title`, `action` and `titleFocusable` (`src/ui/Panel.tsx:5-25`), `MeterBar` (`src/ui/MeterBar.tsx:18`) and `Notice` (`src/ui/Notice.tsx:28`);
    - `ForgetTokenOffer({onForget})` (`src/github/ForgetTokenOffer.tsx:11`), `isRejectedToken(message)` (`src/github/rejectedToken.ts:6`), `goLiveNote(onMaster)` (the stories) and `targetBranch()` (`githubCommit.ts:14`);
    - `FocusHandoff` and `useTakeHandoff(handoff, container, selector, ready?)` (`src/shell/focusHandoff.ts:13-52`);
    - `fmtInt` (`src/ui/format.ts`), and `ADMIN_COLORS`, `ADMIN_TYPE` and `ADMIN_RADIUS`.
  - **The bridge:** `COLORS`, `SPACING`, `FONTS`, `CtaButton` and `LinkButton`. Nothing is added to it.
  - `validateRevealCardForm` (`src/tools/reveal/validateForm.ts`), in the tests and stories.
- **Produces:**
```ts
// src/tools/studio/components/ReadyChecklist.tsx
export function ReadyChecklist(props: {items: readonly ChecklistItem[]});
// a Panel "Ready to publish", action "{done}/{total}", a decorative 4px bar, then each item: a mark named "Done" or
// "To do", its label, and its message while open (muted: never red, R-72)

// src/tools/studio/components/ChangeList.tsx
export function ChangeList(props: {rows: readonly ChangeRow[]; onDiscard: () => void; busy?: boolean});
// a Panel headed changeCount(rows) (titleFocusable); rows keyed by id, each its label over <code>{from} → {to}</code>;
// "Discard" (named "Discard all changes") while rows exist, which focuses the heading, then calls onDiscard (R-77);
// disabled while busy (a save runs: R4-4c's hand-off; the page passes busy={edit.saving})

// src/tools/studio/components/CommitOutcome.tsx
export function CommitOutcome(props: {
  result: {commitUrl: string} | null;   // R4-4c's EditResult ({commitUrl, withImage}) fits
  error: string | null;                 // shown as given
  note: string;                         // the go-live note the page picks
  dropped?: number | null;              // R4-4c's controller field (R-68)
  onLoadAgain?: () => void;             // passed for a stale refusal only
  onForgetToken?: () => void;           // offered when isRejectedToken(error) (R-26)
  handoff?: FocusHandoff;               // taken once something shows: the failure, else the status line (R-59)
});
// always renders <p role="status" tabIndex={-1}>: empty, "Committed. View commit. {note}", or loadAgainNote({dropped});
// a failure is a tabIndex -1 wrapper round Notice tone="error", "Load it again" and ForgetTokenOffer

// src/tools/studio/components/SynergyPanel.tsx
export function SynergyPanel(props: {groups: SynergyGroup[]});   // a Panel "Synergies", action "computed live" (R-90)

// src/tools/studio/loadAgainNote.ts
export function loadAgainNote(input: {dropped: number}): string;
// "Loaded the card again from {branch}. Every edit still applies." | "… Dropped 1 edit to a field that changed there:
// make it again." | "… Dropped N edits to fields that changed there: make them again."

// src/tools/reveal/components/SynergyPreviewPanel.tsx: unchanged signature, restyled
export function SynergyPreviewPanel(props: {groups: SynergyGroup[]});

// src/tools/studio/studioFixtures.ts (appended; tests and stories only)
export const SYNERGY_GROUPS: SynergyGroup[];   // Singer + Songs (direct, 3 partners), Ramp (playstyle, 1)
```

- [ ] **Step 1: Check what this task builds on**

From the repo root, on `feature/24-redesign-r4`:
```bash
git log --oneline main..HEAD
grep -nE "export (interface ChangeRow|function (changeRows|changeCount))" src/tools/studio/changeRows.ts
grep -nE "export (interface ChecklistItem|function revealChecklist)" src/tools/studio/readiness.ts
grep -n "export const EMPTY_FORM" src/tools/reveal/emptyForm.ts
grep -n "export function revealForm" src/test/revealForm.ts
grep -nE "export (const (JA_SCAN_ENTRY|RELEASED_CARD)|function studioCard)" src/tools/studio/studioFixtures.ts
grep -n "changed while saving, so nothing was saved. Save again." src/tools/studio/editSave.ts
grep -nE "^\s+(failure|loadAgain|dropped)\b|export interface EditSave\b" src/tools/studio/useEditSave.ts
grep -n "titleFocusable" src/ui/Panel.tsx
grep -nE "export function (useTakeHandoff|focusUnmoved)" src/shell/focusHandoff.ts
grep -rnwE "ReadyChecklist|ChangeList|CommitOutcome|SynergyPanel|loadAgainNote|SYNERGY_GROUPS" src
```

Expected:
- **The log** lists R4-1a to R4-4d (with R4-5a, R4-5s, R4-5h, R4-5b to R4-5d) in the order of the header's task table.
- **One line each** for `ChangeRow`, `changeRows` and `changeCount`; for `ChecklistItem` and `revealChecklist`; for `EMPTY_FORM`; for `revealForm`; and for `JA_SCAN_ENTRY`, `RELEASED_CARD` and `studioCard`.
- **The race wording** prints once, from `inSaveWords` beside R4-4c's `failureOf` in `editSave.ts`. If nothing prints, R4-4c as assembled left the save wording out. Stop and tell the controller: the wording belongs beside R4-4c's failure classifier, so this task doesn't add it.
- **`useEditSave.ts`** prints four lines, in this order: `failure: SaveFailure | null;` (in `OutcomeFields`, which `EditSave` extends), `export interface EditSave extends OutcomeFields {`, `loadAgain: () => Promise<boolean>;` and `dropped: number | null;`. The controller spreads `EditSave` (R4-4c's hand-off), so `useCardEditor.ts` itself names none of them: don't grep it for them. If R4-4c landed other names, the page maps them in R4-6b; this task's props keep theirs.
- **`titleFocusable`** and both handoff exports print.
- **The last `grep`** prints nothing, or only doc comments of earlier tasks that name these parts: none of them exists yet.

If a name or path differs, use the assembled one in the imports below and say so in the commit's review notes.

- [ ] **Step 2: Write the failing test for the Load it again note**

Create `src/tools/studio/__tests__/loadAgainNote.test.ts`:

```ts
import {afterEach, describe, expect, it, vi} from 'vitest';
import {loadAgainNote} from '../loadAgainNote';

// vite.config.ts doesn't set unstubEnvs, and the app project shares a worker across files.
afterEach(() => vi.unstubAllEnvs());

describe('loadAgainNote', () => {
  it.each([
    [0, 'Loaded the card again from master. Every edit still applies.'],
    [1, 'Loaded the card again from master. Dropped 1 edit to a field that changed there: make it again.'],
    [3, 'Loaded the card again from master. Dropped 3 edits to fields that changed there: make them again.'],
  ])('with %i dropped, reads "%s" (R-68)', (dropped, note) => {
    expect(loadAgainNote({dropped})).toBe(note);
  });

  it('names a rehearsal branch', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    expect(loadAgainNote({dropped: 0})).toBe('Loaded the card again from admin-verify. Every edit still applies.');
  });
});
```

Run:
```bash
pnpm vitest run --project app src/tools/studio/__tests__/loadAgainNote.test.ts
```

Expected: FAIL, with `Error: Failed to resolve import "../loadAgainNote" from "src/tools/studio/__tests__/loadAgainNote.test.ts". Does the file exist?` and `Tests  no tests`.

- [ ] **Step 3: Write `loadAgainNote.ts`**

Create `src/tools/studio/loadAgainNote.ts`:

```ts
import {targetBranch} from '../../github/githubCommit';
import {fmtInt} from '../../ui/format';

/**
 * What "Load it again" did to Edit card's draft (R-68), for the outcome's
 * status line once the read lands. The card is read again from the target
 * branch, and an edit stays while its field still holds the value it started
 * from. A dropped edit's field changed on the branch, so the edit has to be
 * made again, as reloadNote says for tuning (R-18). A staged image always stays.
 */
export function loadAgainNote({dropped}: {dropped: number}): string {
  const read = `Loaded the card again from ${targetBranch()}.`;
  if (dropped === 0) return `${read} Every edit still applies.`;
  if (dropped === 1) return `${read} Dropped 1 edit to a field that changed there: make it again.`;
  return `${read} Dropped ${fmtInt(dropped)} edits to fields that changed there: make them again.`;
}
```

Notes:
- **One object argument.** `{dropped}` keeps the module at 0 primitive parameters, where R2's `reloadNote(dropped)` has 1 of 1.
- **The words** follow `reloadNote.ts` (R-18): the read, then what stayed or what to redo. "There" is the target branch the sentence names. A staged image always stays (R-68), so the note speaks only of edits.

Run the Step 2 command. Expected: PASS, 4 tests.

- [ ] **Step 4: Write the failing test for `ReadyChecklist`**

Create `src/tools/studio/__tests__/ReadyChecklist.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import {revealForm} from '../../../test/revealForm';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {EMPTY_FORM} from '../../reveal/emptyForm';
import {validateRevealCardForm} from '../../reveal/validateForm';
import type {RevealCardForm} from '../../reveal/buildPreviewCard';
import {ReadyChecklist} from '../components/ReadyChecklist';
import {revealChecklist, type ChecklistItem} from '../readiness';

/** The checklist New reveal shows for `form`, with `imageName` chosen and its bytes read when `ready`. */
function checklistFor({form, imageName, ready}: {form: RevealCardForm; imageName: string | null; ready: boolean}) {
  const validation = validateRevealCardForm(form, new Set(), imageName);
  return revealChecklist(form, validation, {ready, error: null});
}

const FRESH = checklistFor({form: EMPTY_FORM, imageName: null, ready: false});
const READY = checklistFor({form: revealForm(), imageName: 'mei.png', ready: true});

function renderChecklist(items: ChecklistItem[]) {
  render(<ReadyChecklist items={items} />);
  return screen.getByRole('region', {name: 'Ready to publish'});
}

describe('ReadyChecklist', () => {
  it('reads a fresh form 1/7, with the message of every open item (R4-3a)', () => {
    const panel = renderChecklist(FRESH);
    expect(within(panel).getByRole('heading', {level: 2, name: 'Ready to publish'})).toBeInTheDocument();
    expect(within(panel).getByText('1/7')).toBeInTheDocument();
    for (const item of FRESH.filter((open) => !open.done)) {
      expect(within(panel).getByText(item.message ?? '')).toBeInTheDocument();
    }
    // Card text is optional, so it starts ticked; the Ink tick waits for the collector number.
    expect(within(panel).getByText('Checked against the collector number: set it first')).toBeInTheDocument();
  });

  it('says in words which items are done, not by colour alone', () => {
    const panel = renderChecklist(FRESH);
    const rows = within(panel).getAllByRole('listitem');
    expect(rows.map((row) => within(row).getByRole('img').getAttribute('aria-label'))).toEqual([
      'To do',
      'To do',
      'To do',
      'To do',
      'To do',
      'Done',
      'To do',
    ]);
    expect(rows[5]).toHaveTextContent('Card text');
  });

  it('reads a card ready to publish 7/7, with no messages and the bar full', () => {
    const panel = renderChecklist(READY);
    expect(within(panel).getByText('7/7')).toBeInTheDocument();
    expect(within(panel).getAllByRole('img', {name: 'Done'})).toHaveLength(7);
    // Each row is its mark and label alone: a done item has no message.
    expect(within(panel).getAllByRole('listitem').map((row) => row.textContent)).toEqual(
      READY.map((item) => `✓${item.label}`),
    );
    // The bar is decoration beside the printed count (MeterBar with no label).
    const bar = panel.querySelector<HTMLElement>('div[aria-hidden="true"] > div');
    expect(bar?.style.width).toBe('100%');
  });

  it('never turns red: an open item is work left, so its message is muted (R-72)', () => {
    const panel = renderChecklist(FRESH);
    expect(within(panel).getByText('Name is required')).toHaveStyle({color: ADMIN_COLORS.muted});
  });
});
```

Run:
```bash
pnpm vitest run --project app src/tools/studio/__tests__/ReadyChecklist.test.tsx
```

Expected: FAIL, with `Error: Failed to resolve import "../components/ReadyChecklist" from "src/tools/studio/__tests__/ReadyChecklist.test.tsx". Does the file exist?` and `Tests  no tests`.

- [ ] **Step 5: Write `ReadyChecklist`**

Create `src/tools/studio/components/ReadyChecklist.tsx`:

```tsx
import {COLORS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {MeterBar} from '../../../ui/MeterBar';
import {Panel} from '../../../ui/Panel';
import type {ChecklistItem} from '../readiness';

interface ReadyChecklistProps {
  /** revealChecklist's items (R4-3a), in the form's order. An open item carries its message. */
  items: readonly ChecklistItem[];
}

// The handoff's 16px round mark and 4px bar (dc.html:256-257).
const MARK_SIZE = 16;
const BAR_HEIGHT = 4;

const LIST: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.sm,
};
const ROW: React.CSSProperties = {display: 'flex', alignItems: 'flex-start', gap: SPACING.sm, fontSize: ADMIN_TYPE.body};
const MARK: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 'none',
  width: MARK_SIZE,
  height: MARK_SIZE,
  // Centred on the label's first line.
  marginTop: SPACING.xxs,
  borderRadius: ADMIN_RADIUS.pill,
  fontSize: ADMIN_TYPE.micro,
  lineHeight: 1,
};
const TEXT: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.xxs, minWidth: 0};
// Muted, never red (R-72): an open item is work left to do, not a mistake.
const MESSAGE: React.CSSProperties = {fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted, overflowWrap: 'anywhere'};

/**
 * How a done and an open item look. The mark says it in words too (its
 * accessible name), so the state never rests on colour alone. The open
 * mark's ring is barNeutral, which keeps 3:1 on the panel (1.4.11).
 */
const LOOK = {
  done: {
    name: 'Done',
    glyph: '✓',
    mark: {...MARK, backgroundColor: COLORS.success, border: `1px solid ${COLORS.success}`, color: ADMIN_COLORS.page},
    label: ADMIN_COLORS.muted,
  },
  open: {
    name: 'To do',
    glyph: '',
    mark: {...MARK, border: `1px solid ${ADMIN_COLORS.barNeutral}`},
    label: ADMIN_COLORS.text,
  },
} as const;

function ChecklistRow({item}: {item: ChecklistItem}) {
  const look = item.done ? LOOK.done : LOOK.open;
  return (
    <li style={ROW}>
      <span role="img" aria-label={look.name} style={look.mark}>
        {look.glyph}
      </span>
      <span style={TEXT}>
        <span style={{color: look.label}}>{item.label}</span>
        {item.message && <span style={MESSAGE}>{item.message}</span>}
      </span>
    </li>
  );
}

/**
 * New reveal's "Ready to publish N/7" (R4-3a's checklist): the count, a bar,
 * then each item with its message while it is open, so the list names what
 * is left. Every item is done exactly when Publish can run. The count prints
 * beside the bar, so the bar is decoration (MeterBar with no label).
 */
export function ReadyChecklist({items}: ReadyChecklistProps) {
  const done = items.filter((item) => item.done).length;
  return (
    <Panel title="Ready to publish" action={`${done}/${items.length}`}>
      <MeterBar fraction={done / items.length} color={ADMIN_COLORS.accent} height={BAR_HEIGHT} />
      <ul style={LIST}>
        {items.map((item) => (
          <ChecklistRow key={item.id} item={item} />
        ))}
      </ul>
    </Panel>
  );
}
```

Notes:
- **The count** is `Panel`'s action, which `Panel` prints small and muted at the header's right (`Panel.tsx:55-57`), as the prototype prints "N/M".
- **`done / items.length`** needs no guard: `MeterBar` draws a non-finite fraction as empty (`MeterBar.tsx:19`).
- **The mark's glyph** is text in a `role="img"` span with a name, so the ✓ isn't read as "check mark" beside the name.
- **`LOOK`** is a table, so `ChecklistRow` has one ternary and no style branches.

Run the Step 4 command. Expected: PASS, 4 tests.

- [ ] **Step 6: Write the failing test for `ChangeList`**

Create `src/tools/studio/__tests__/ChangeList.test.tsx`:

```tsx
import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {ChangeRow} from '../changeRows';
import {ChangeList} from '../components/ChangeList';

/** Edit card's rows for a card refreshed to its English scan, with a staged image last (R4-2b's order). */
const ROWS: ChangeRow[] = [
  {id: 'version', label: 'Version', from: 'Bandmate', to: 'Band Leader'},
  {id: 'scanLanguage', label: 'Scan language', from: 'Japanese', to: 'English'},
  {id: 'image', label: 'Image', from: 'current art', to: 'miriam-en.png'},
];

/** The list over its own rows, as the controller keeps them: Discard empties it. */
function LiveList({initial, onDiscard}: {initial: ChangeRow[]; onDiscard?: () => void}) {
  const [rows, setRows] = useState(initial);
  return (
    <ChangeList
      rows={rows}
      onDiscard={() => {
        onDiscard?.();
        setRows([]);
      }}
    />
  );
}

describe('ChangeList', () => {
  it('lists each change as its label over a "from → to" diff, in the order given, the image last', () => {
    render(<ChangeList rows={ROWS} onDiscard={() => {}} />);
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'VersionBandmate → Band Leader',
      'Scan languageJapanese → English',
      'Imagecurrent art → miriam-en.png',
    ]);
  });

  it('prints a long diff whole, in a <code> that wraps, as R2\'s tray does', () => {
    const text = 'PANDA POWER When you play this character, each opponent chooses and discards a card, then you draw a card.';
    render(<ChangeList rows={[{id: 'fullText', label: 'Card text', from: '—', to: text}]} onDiscard={() => {}} />);
    const diff = screen.getByText(`— → ${text}`);
    expect(diff.tagName).toBe('CODE');
    expect(diff).toHaveStyle({whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'});
  });

  it.each<[number, string]>([
    [0, 'No changes yet'],
    [1, '1 change'],
    [3, '3 changes'],
  ])('with %i rows, is a region headed "%s"', (count, heading) => {
    render(<ChangeList rows={ROWS.slice(0, count)} onDiscard={() => {}} />);
    const panel = screen.getByRole('region', {name: heading});
    expect(within(panel).getByRole('heading', {level: 2, name: heading})).toBeInTheDocument();
  });

  it('says where changes will show, and offers no Discard, before anything changes', () => {
    render(<ChangeList rows={[]} onDiscard={() => {}} />);
    expect(
      screen.getByText('Edit any field or replace the image. Changes are listed here before you save.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /^Discard/})).not.toBeInTheDocument();
  });

  it('offers one Discard for every change, named for what it drops (R-77)', async () => {
    const onDiscard = vi.fn();
    render(<ChangeList rows={ROWS} onDiscard={onDiscard} />);
    const discard = screen.getByRole('button', {name: 'Discard all changes'});
    // The name starts with the word the button shows (2.5.3).
    expect(discard).toHaveTextContent(/^Discard$/);
    expect(screen.getAllByRole('button')).toEqual([discard]);
    await userEvent.click(discard);
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it('holds Discard while a save runs, and offers it again once the save settles (R4-4c\'s hand-off)', async () => {
    const onDiscard = vi.fn();
    const {rerender} = render(<ChangeList rows={ROWS} onDiscard={onDiscard} busy />);
    const discard = screen.getByRole('button', {name: 'Discard all changes'});
    expect(discard).toBeDisabled();
    await userEvent.click(discard);
    expect(onDiscard).not.toHaveBeenCalled();
    rerender(<ChangeList rows={ROWS} onDiscard={onDiscard} busy={false} />);
    expect(discard).toBeEnabled();
  });

  it('moves focus to the heading before Discard empties the list, never to <body> (R-48)', async () => {
    let focusedAtDiscard: Element | null = null;
    render(<LiveList initial={ROWS} onDiscard={() => (focusedAtDiscard = document.activeElement)} />);
    await userEvent.click(screen.getByRole('button', {name: 'Discard all changes'}));
    const heading = screen.getByRole('heading', {level: 2, name: 'No changes yet'});
    expect(focusedAtDiscard).toBe(heading);
    expect(heading).toHaveFocus();
  });
});
```

Run:
```bash
pnpm vitest run --project app src/tools/studio/__tests__/ChangeList.test.tsx
```

Expected: FAIL, with `Error: Failed to resolve import "../components/ChangeList" from "src/tools/studio/__tests__/ChangeList.test.tsx". Does the file exist?` and `Tests  no tests`.

- [ ] **Step 7: Write `ChangeList`**

Create `src/tools/studio/components/ChangeList.tsx`:

```tsx
import {useRef} from 'react';
import {SPACING, LinkButton} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {Panel} from '../../../ui/Panel';
import {changeCount, type ChangeRow} from '../changeRows';

interface ChangeListProps {
  /** changeRows' result (R4-2b): the changed fields in the form's order, then the staged image. */
  rows: readonly ChangeRow[];
  /** Drops every edit and the staged image (the controller's discard). There is no per-row revert (R-77). */
  onDiscard: () => void;
  /**
   * A save is running (the controller's `saving`): Discard is held, as Save is.
   * Discarding mid-save would put back the pre-save form, which reads as a change
   * undoing the save once it lands on the new baseline (R-70, R4-4c's hand-off).
   */
  busy?: boolean;
}

/** What the list says before anything changes (dc.html:262). */
const EMPTY = 'Edit any field or replace the image. Changes are listed here before you save.';

const LIST: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.sm,
};
const ROW: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.xxs,
  padding: `${SPACING.sm}px ${SPACING.md}px`,
  // A translucent fill under a border: clip it to the padding box (adminTheme.ts).
  backgroundColor: ADMIN_COLORS.card,
  backgroundClip: 'padding-box',
  border: `1px solid ${ADMIN_COLORS.border}`,
  borderRadius: ADMIN_RADIUS.control,
};
const LABEL: React.CSSProperties = {fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};
// The whole diff, wrapped, as R2's tray prints one: a card text is the edit under review, so it is never cut short.
const DIFF: React.CSSProperties = {
  display: 'block',
  fontSize: ADMIN_TYPE.label,
  color: ADMIN_COLORS.text,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};
const NOTE: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

function ChangeItem({row}: {row: ChangeRow}) {
  return (
    <li style={ROW}>
      <span style={LABEL}>{row.label}</span>
      {/* <code> gives the diff the UA monospace with no font declaration (R-7). */}
      <code style={DIFF}>{`${row.from} → ${row.to}`}</code>
    </li>
  );
}

function ChangeRows({rows}: {rows: readonly ChangeRow[]}) {
  if (rows.length === 0) return <p style={NOTE}>{EMPTY}</p>;
  return (
    <ul style={LIST}>
      {rows.map((row) => (
        <ChangeItem key={row.id} row={row} />
      ))}
    </ul>
  );
}

/**
 * Edit card's pending edits as a diff, before Save: "{N} changes" over one
 * row per change, the staged image's last, and Discard, which drops them all
 * (R-77), held while a save runs. Discard empties the list and takes its own
 * button with it, so focus moves to the heading first, never to <body> (R-48,
 * as R2's Clear all does).
 */
export function ChangeList({rows, onDiscard, busy}: ChangeListProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const discard = () => {
    rootRef.current?.querySelector<HTMLElement>('h2')?.focus();
    onDiscard();
  };
  const action =
    rows.length > 0 ? (
      // Named for what it drops; the name starts with the word it shows (2.5.3).
      <LinkButton
        type="button"
        tone="muted"
        aria-label="Discard all changes"
        disabled={busy}
        onClick={discard}
        style={{fontSize: ADMIN_TYPE.small}}>
        Discard
      </LinkButton>
    ) : undefined;
  return (
    <div ref={rootRef}>
      <Panel title={changeCount(rows)} titleFocusable action={action}>
        <ChangeRows rows={rows} />
      </Panel>
    </div>
  );
}
```

Notes:
- **`action` is `undefined` with no rows**, never `false`. `Panel` draws its action box for anything but `null` or `undefined` (`Panel.tsx:55`).
- **The heading stays the same element** when the count changes ("3 changes" to "No changes yet"), so the focus Discard gives it stays put. The test pins that the heading had focus when `onDiscard` ran.
- **The wrapper `<div>`** only holds the ref. It adds no box of its own to the aside's column.
- **`busy` holds Discard, never hides it** (R4-4c's hand-off). `disabled={busy}` passes `undefined` when the prop is left out, so the stories and the tests that don't pass it get a live button. `LinkButton` dims itself when disabled, and a disabled button fires no click, which the test pins. It adds no branch, so `ChangeList` stays at complexity 2.

Run the Step 6 command. Expected: PASS, 9 tests.

- [ ] **Step 8: Write the failing test for `CommitOutcome`**

Create `src/tools/studio/__tests__/CommitOutcome.test.tsx`:

```tsx
import type {ComponentProps} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {FocusHandoff} from '../../../shell/focusHandoff';
import {CommitOutcome} from '../components/CommitOutcome';
import {loadAgainNote} from '../loadAgainNote';

const COMMIT_URL = 'https://github.com/Doberjohn/inkweave/commit/abc123';
/** New reveal's go-live note on master (the R4 header's "Labels and notes"); the page picks it, the outcome prints it. */
const NOTE = 'Vercel is deploying it: allow 15 to 20 minutes before it shows on inkweave.ink.';
/** R4-1b's StaleCardError message for a card whose entry changed at the base (R-67). */
const STALE = 'Card 14023 changed on master since you loaded it. Load it again.';
const REJECTED = 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: {"message":"Bad credentials"}';
/** commitFiles' race, as New reveal gets it (githubCommit.ts) and as Edit's controller words it for a save (R4-4c). */
const NEW_RACE = 'master changed while publishing, so nothing was published. Publish again.';
const EDIT_RACE = 'master changed while saving, so nothing was saved. Save again.';

type Props = ComponentProps<typeof CommitOutcome>;

function outcomeElement(props: Partial<Props> = {}) {
  return <CommitOutcome result={null} error={null} note={NOTE} {...props} />;
}

/** A handoff the page has asked for and no view has taken yet. */
function pendingHandoff(): FocusHandoff {
  return {pending: true, request: vi.fn(), done: vi.fn()};
}

describe('CommitOutcome', () => {
  it('mounts an empty status line before any commit, so "Committed." is announced when it arrives', () => {
    const {rerender} = render(outcomeElement());
    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();

    rerender(outcomeElement({result: {commitUrl: COMMIT_URL}}));
    // The same element, now filled: a live region mounted with its text often goes unannounced.
    expect(screen.getByRole('status')).toBe(status);
    expect(status).toHaveTextContent(`Committed. View commit. ${NOTE}`);
  });

  it('links the commit in a new tab, as R2\'s tray does', () => {
    render(outcomeElement({result: {commitUrl: COMMIT_URL}}));
    const link = within(screen.getByRole('status')).getByRole('link', {name: 'View commit'});
    expect(link).toHaveAttribute('href', COMMIT_URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('shows a failure as an alert, beside the empty status line', () => {
    render(outcomeElement({error: 'Publish failed: 403 Forbidden'}));
    expect(screen.getByRole('alert')).toHaveTextContent('Publish failed: 403 Forbidden');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers Load it again after a stale refusal, as a neutral button (R-68)', async () => {
    const onLoadAgain = vi.fn();
    render(outcomeElement({error: STALE, onLoadAgain, onForgetToken: vi.fn()}));
    expect(screen.getByRole('alert')).toHaveTextContent(STALE);
    expect(screen.queryByRole('button', {name: 'Forget token'})).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Load it again'}));
    expect(onLoadAgain).toHaveBeenCalledOnce();
  });

  it('offers Forget token when GitHub rejected the token (R-26)', async () => {
    const onForgetToken = vi.fn();
    render(outcomeElement({error: REJECTED, onForgetToken}));
    expect(screen.getByText(/GitHub rejected the saved token/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Forget token'}));
    expect(onForgetToken).toHaveBeenCalledOnce();
  });

  it.each([
    ['without onForgetToken', REJECTED, undefined],
    ['for a failure the token didn\'t cause', NEW_RACE, () => {}],
  ])('offers no Forget token %s', (_case, error, onForgetToken) => {
    render(outcomeElement({error, onForgetToken}));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Forget token'})).not.toBeInTheDocument();
  });

  it.each([
    ['New reveal', NEW_RACE],
    ['Edit card', EDIT_RACE],
  ])("shows %s's race refusal word for word, and no way out but trying again", (_mode, error) => {
    render(outcomeElement({error, onForgetToken: () => {}}));
    expect(screen.getByRole('alert').textContent).toBe(error);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('says in the status line what Load it again kept, once it lands (R-68)', () => {
    const {rerender} = render(outcomeElement({error: STALE, onLoadAgain: () => {}}));
    const status = screen.getByRole('status');
    rerender(outcomeElement({dropped: 2}));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBe(status);
    expect(status).toHaveTextContent(loadAgainNote({dropped: 2}));
  });

  it('puts a landed commit before an older Load it again note', () => {
    render(outcomeElement({result: {commitUrl: COMMIT_URL}, dropped: 1}));
    expect(screen.getByRole('status')).toHaveTextContent(`Committed. View commit. ${NOTE}`);
  });

  describe('the focus handoff (R-59)', () => {
    it.each<[string, Partial<Props>, () => HTMLElement]>([
      ['the status line after a commit', {result: {commitUrl: COMMIT_URL}}, () => screen.getByRole('status')],
      [
        'the failure after a refusal',
        {error: STALE, onLoadAgain: () => {}},
        () => screen.getByRole('alert').parentElement as HTMLElement,
      ],
      ['the status line after Load it again', {dropped: 0}, () => screen.getByRole('status')],
    ])('gives a pending handoff to %s', (_case, props, target) => {
      const handoff = pendingHandoff();
      render(outcomeElement({...props, handoff}));
      expect(target()).toHaveFocus();
      expect(handoff.done).toHaveBeenCalled();
    });

    it('keeps a pending handoff while there is nothing to show', () => {
      const handoff = pendingHandoff();
      render(outcomeElement({handoff}));
      expect(document.body).toHaveFocus();
      expect(handoff.done).not.toHaveBeenCalled();
    });

    it('leaves focus where the user moved it while the commit ran', () => {
      const handoff = pendingHandoff();
      const {rerender} = render(
        <>
          <button type="button">Elsewhere</button>
          {outcomeElement({handoff})}
        </>,
      );
      screen.getByRole('button', {name: 'Elsewhere'}).focus();
      rerender(
        <>
          <button type="button">Elsewhere</button>
          {outcomeElement({handoff, result: {commitUrl: COMMIT_URL}})}
        </>,
      );
      expect(screen.getByRole('button', {name: 'Elsewhere'})).toHaveFocus();
      expect(handoff.done).toHaveBeenCalled();
    });
  });
});
```

Run:
```bash
pnpm vitest run --project app src/tools/studio/__tests__/CommitOutcome.test.tsx
```

Expected: FAIL, with `Error: Failed to resolve import "../components/CommitOutcome" from "src/tools/studio/__tests__/CommitOutcome.test.tsx". Does the file exist?` and `Tests  no tests`.

- [ ] **Step 9: Write `CommitOutcome`**

Create `src/tools/studio/components/CommitOutcome.tsx`:

```tsx
import {useRef} from 'react';
import {COLORS, SPACING, CtaButton} from '../../../app-bridge';
import {ForgetTokenOffer} from '../../../github/ForgetTokenOffer';
import {isRejectedToken} from '../../../github/rejectedToken';
import {useTakeHandoff, type FocusHandoff} from '../../../shell/focusHandoff';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {Notice} from '../../../ui/Notice';
import {loadAgainNote} from '../loadAgainNote';

interface CommitOutcomeProps {
  /** The last commit that landed, or null. */
  result: {commitUrl: string} | null;
  /**
   * The last commit's failure, or null. It shows as given: New reveal's race
   * refusal says "Publish again.", and Edit's controller words its own as a
   * save before it gets here (R4-4c).
   */
  error: string | null;
  /** What happens after the commit, under "Committed.": the go-live note the page picks (goLiveNote). */
  note: string;
  /** How many edits the last "Load it again" dropped (R-68); null or absent before one lands. */
  dropped?: number | null;
  /** Reads the card again after a stale refusal (R-68). The page passes it for that failure only. */
  onLoadAgain?: () => void;
  /** Forgets the saved token: offered when GitHub rejected it (a 401) only, and only when given (R-26). */
  onForgetToken?: () => void;
  /**
   * The page's focus handoff, when the outcome is its target: a Publish or a
   * Save that settled, or a "Load it again" that landed (R-59). Taken once
   * there is something to show: the failure, else the status line.
   */
  handoff?: FocusHandoff;
}

const COLUMN: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.sm};
const LINE: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, lineHeight: 1.5};
const SUCCESS: React.CSSProperties = {...LINE, color: COLORS.success};
const NOTE: React.CSSProperties = {...LINE, color: ADMIN_COLORS.muted};

/**
 * The first element that can take the handoff, in DOM order: the failure
 * when there is one, else the status line. Both have tabIndex -1, and nothing
 * else here does.
 */
const FOCUS_TARGET = '[tabindex="-1"]';

/** "Committed.", the commit (in a new tab, as R2's tray opens it) and the go-live note. */
function Committed({commitUrl, note}: {commitUrl: string; note: string}) {
  return (
    <>
      Committed.{' '}
      <a href={commitUrl} target="_blank" rel="noreferrer" style={{color: ADMIN_COLORS.accent}}>
        View commit
      </a>
      . {note}
    </>
  );
}

/**
 * The live region, mounted with the outcome so its text is announced when it
 * arrives: a live region mounted with its text often isn't (R2's tray). It
 * holds a landed commit, else what the last "Load it again" kept.
 */
function StatusLine({result, note, dropped}: {result: {commitUrl: string} | null; note: string; dropped: number | null}) {
  const kept = dropped === null ? null : loadAgainNote({dropped});
  return (
    <p role="status" tabIndex={-1} style={result ? SUCCESS : NOTE}>
      {result ? <Committed commitUrl={result.commitUrl} note={note} /> : kept}
    </p>
  );
}

/**
 * A failed commit, and the way out its kind needs: Load it again after a
 * stale refusal (R-68), Forget token after GitHub rejected the token (R-26).
 * Notice's error tone is the alert (R1-3), so nothing here wraps it in another.
 */
function CommitFailure({
  error,
  onLoadAgain,
  onForgetToken,
}: {
  error: string;
  onLoadAgain?: () => void;
  onForgetToken?: () => void;
}) {
  return (
    <div tabIndex={-1} style={COLUMN}>
      <Notice tone="error">{error}</Notice>
      {onLoadAgain && (
        <CtaButton type="button" variant="neutral" onClick={onLoadAgain} style={{alignSelf: 'flex-start'}}>
          Load it again
        </CtaButton>
      )}
      {onForgetToken && isRejectedToken(error) && <ForgetTokenOffer onForget={onForgetToken} />}
    </div>
  );
}

/**
 * Under Publish or Save: a failure as an alert with its way out, and the
 * status line, which says "Committed." with the commit's link and the note,
 * or what "Load it again" kept. The status line is always mounted, empty
 * until there is something to say.
 */
export function CommitOutcome({result, error, note, dropped = null, onLoadAgain, onForgetToken, handoff}: CommitOutcomeProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const showing = [result, error, dropped].some((value) => value !== null);
  useTakeHandoff(handoff, rootRef, FOCUS_TARGET, showing);
  return (
    <div ref={rootRef} style={COLUMN}>
      {error !== null && <CommitFailure error={error} onLoadAgain={onLoadAgain} onForgetToken={onForgetToken} />}
      <StatusLine result={result} note={note} dropped={dropped} />
    </div>
  );
}
```

Notes:
- **One `<p role="status">` in every state.** `StatusLine` returns the same element type whatever it holds, so React keeps the DOM node, and the first test pins that it is the same element before and after. Only its text and colour change: green for a commit, muted for a note.
- **`FOCUS_TARGET`** relies on DOM order: the failure renders before the status line, and both carry `tabIndex={-1}`. Nothing else inside does: `Notice`, `CtaButton`, `ForgetTokenOffer` and the link set none.
- **`showing`** counts `dropped: 0`, since "Every edit still applies." is something to say. That is why it compares with `null` rather than testing truthiness.
- **No message is rewritten.** Edit's race wording is R4-4c's (re-base note 5). If a later change wants `CommitOutcome` to classify, it takes R4-4c's `failure`, never a second string match.

Run the Step 8 command. Expected: PASS, 16 tests.

- [ ] **Step 10: Add the synergy fixture and `SynergyPanel`, with its failing test**

In `src/tools/studio/studioFixtures.ts`, widen the engine import (line 1):

```ts
import {transformCard, type LorcanaCard, type LorcanaJSONCard, type SynergyGroup} from 'inkweave-synergy-engine';
```

and append at the end of the file:

```ts
/** A partner in a synergy group. The aside draws only how many partners a group holds (R4-5e). */
const PARTNER = {card: RELEASED_CARD, score: 7, explanation: 'Shares a playstyle'};

/**
 * The engine's groups for a card being written (R4-5e's synergy panel): a
 * direct rule with three partners, and a playstyle with one.
 */
export const SYNERGY_GROUPS: SynergyGroup[] = [
  {
    groupKey: 'singer-songs',
    category: 'direct',
    label: 'Singer + Songs',
    tagline: '',
    description: '',
    synergies: [PARTNER, PARTNER, PARTNER],
  },
  {groupKey: 'ramp', category: 'playstyle', label: 'Ramp', tagline: '', description: '', synergies: [PARTNER]},
];
```

Create `src/tools/studio/components/SynergyPanel.tsx`:

```tsx
import type {SynergyGroup} from 'inkweave-synergy-engine';
import {Panel} from '../../../ui/Panel';
import {SynergyPreviewPanel} from '../../reveal/components/SynergyPreviewPanel';

/**
 * The aside's last panel (R-90): the engine's synergy groups for the card on
 * screen, computed live from the form as it changes, not read from the
 * deployed synergy files. The page leaves it out for an image-only card (R-61).
 */
export function SynergyPanel({groups}: {groups: SynergyGroup[]}) {
  return (
    <Panel title="Synergies" action="computed live">
      <SynergyPreviewPanel groups={groups} />
    </Panel>
  );
}
```

Create `src/tools/studio/__tests__/SynergyPanel.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {SynergyPanel} from '../components/SynergyPanel';
import {SYNERGY_GROUPS} from '../studioFixtures';

describe('SynergyPanel', () => {
  it('is a region named Synergies, marked computed live (R-90)', () => {
    render(<SynergyPanel groups={SYNERGY_GROUPS} />);
    const panel = screen.getByRole('region', {name: 'Synergies'});
    expect(within(panel).getByRole('heading', {level: 2, name: 'Synergies'})).toBeInTheDocument();
    expect(within(panel).getByText('computed live')).toBeInTheDocument();
  });

  it('lists each group with how many cards it pairs with, in admin colours', () => {
    render(<SynergyPanel groups={SYNERGY_GROUPS} />);
    const rows = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual(['Singer + Songs3 cards', 'Ramp1 card']);
    // R-90: the rows leave the app's legacy surfaceAlt and gray600 for admin's tokens; the count is muted, never dim (R-6).
    expect(rows[0]).toHaveStyle({color: ADMIN_COLORS.text});
    expect(within(rows[0]).getByText('3 cards')).toHaveStyle({color: ADMIN_COLORS.muted});
  });

  it('says none are found yet when the engine finds none', () => {
    render(<SynergyPanel groups={[]} />);
    const panel = screen.getByRole('region', {name: 'Synergies'});
    expect(within(panel).getByText('No synergies detected yet. Add card text or keywords to see matches.')).toHaveStyle({
      color: ADMIN_COLORS.muted,
    });
    expect(within(panel).queryByRole('list')).not.toBeInTheDocument();
  });
});
```

Run:
```bash
pnpm vitest run --project app src/tools/studio/__tests__/SynergyPanel.test.tsx
```

Expected: FAIL, 2 of 3, against today's `SynergyPreviewPanel`:
- "lists each group…" with `AssertionError: expected [ 'Singer + Songs3 card(s)', …(1) ] to deeply equal [ 'Singer + Songs3 cards', …(1) ]`;
- "says none are found yet…" on the empty line's colour (`COLORS.gray600`, not `ADMIN_COLORS.muted`).

"is a region named Synergies…" passes already.

- [ ] **Step 11: Restyle `SynergyPreviewPanel` (R-90)**

Replace `src/tools/reveal/components/SynergyPreviewPanel.tsx` with:

```tsx
import type {SynergyGroup} from 'inkweave-synergy-engine';
import {SPACING} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtInt} from '../../../ui/format';

interface SynergyPreviewPanelProps {
  groups: SynergyGroup[];
}

const LIST: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.xs,
};
// One group: a card inside its panel, as Card studio's change rows are (R-90).
const ROW: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: SPACING.sm,
  padding: `${SPACING.xs}px ${SPACING.sm}px`,
  // A translucent fill under a border: clip it to the padding box (adminTheme.ts).
  backgroundColor: ADMIN_COLORS.card,
  backgroundClip: 'padding-box',
  border: `1px solid ${ADMIN_COLORS.border}`,
  borderRadius: ADMIN_RADIUS.control,
  color: ADMIN_COLORS.text,
  fontSize: ADMIN_TYPE.small,
};
// Muted, never dim: the count is data (R-6).
const COUNT: React.CSSProperties = {flex: 'none', color: ADMIN_COLORS.muted};
const EMPTY: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

function GroupRow({group}: {group: SynergyGroup}) {
  const partners = group.synergies.length;
  return (
    <li style={ROW}>
      <span>{group.label}</span>
      <span style={COUNT}>{partners === 1 ? '1 card' : `${fmtInt(partners)} cards`}</span>
    </li>
  );
}

/**
 * The engine's synergy groups for a card being written: each group's name and
 * how many cards it pairs with. Card studio's SynergyPanel frames it (R-90);
 * the reveal publisher shows it bare until R4-6c retires that page.
 */
export function SynergyPreviewPanel({groups}: SynergyPreviewPanelProps) {
  if (groups.length === 0) {
    return <p style={EMPTY}>No synergies detected yet. Add card text or keywords to see matches.</p>;
  }
  return (
    <ul style={LIST}>
      {groups.map((group) => (
        <GroupRow key={group.groupKey} group={group} />
      ))}
    </ul>
  );
}
```

Notes:
- **Same export, same props.** `RevealPage.tsx:66` and `reveal/index.ts:8` keep working until R4-6c deletes them.
- **`GroupRow`** holds the count's one ternary, so the list's map stays plain.

Run the Step 10 command. Expected: PASS, 3 tests.

- [ ] **Step 12: Write the stories**

Create `src/tools/studio/components/StudioAside.stories.tsx`:

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {CtaButton, FONTS, SET_TOTAL, SPACING} from '../../../app-bridge';
import {targetBranch} from '../../../github/githubCommit';
import {goLiveNote} from '../../../github/goLiveNote';
import {revealForm} from '../../../test/revealForm';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import type {RevealCardForm} from '../../reveal/buildPreviewCard';
import {EMPTY_FORM} from '../../reveal/emptyForm';
import {validateRevealCardForm} from '../../reveal/validateForm';
import {changeRows} from '../changeRows';
import {revealChecklist} from '../readiness';
import {JA_SCAN_ENTRY, SYNERGY_GROUPS} from '../studioFixtures';
import {ChangeList} from './ChangeList';
import {CommitOutcome} from './CommitOutcome';
import {ReadyChecklist} from './ReadyChecklist';
import {SynergyPanel} from './SynergyPanel';

const meta: Meta = {
  title: 'Admin/Publish/Card studio/Aside',
  parameters: {layout: 'fullscreen'},
  // The studio's fourth column (280px at wide widths) on the admin page. The
  // page composes the parts in this order (R4-6a, R4-6b): the checklist or the
  // change list, the synergies, Publish or Save, then the outcome.
  decorators: [
    (Story) => (
      <div
        style={{
          minHeight: '100vh',
          padding: SPACING.lg,
          background: ADMIN_COLORS.page,
          color: ADMIN_COLORS.text,
          fontFamily: FONTS.body,
        }}>
        <div style={{display: 'flex', flexDirection: 'column', gap: SPACING.md, width: 280}}>
          <Story />
        </div>
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj;

/** A story's buttons do nothing. */
const noop = () => {};

/** New reveal's checklist for `form`, with an image chosen and read when `image` names one. */
function checklistFor({form, image}: {form: RevealCardForm; image: string | null}) {
  const validation = validateRevealCardForm(form, new Set(), image);
  return revealChecklist(form, validation, {ready: image !== null, error: null});
}

const FRESH = checklistFor({form: EMPTY_FORM, image: null});
// A number past the set (R-73) and a spelled-out glyph: two filled values that fail.
const HALF_DONE = checklistFor({
  form: revealForm({collectorNumber: String(SET_TOTAL + 1), fullText: 'Your other characters use this Strength.'}),
  image: null,
});
const READY = checklistFor({form: revealForm(), image: 'mei.png'});

/** admin#14's case: Miriam's Japanese scan replaced by the English one, with its new version. */
const REFRESH = changeRows({
  loaded: JA_SCAN_ENTRY,
  changes: {version: 'Band Leader', fullName: 'Miriam - Band Leader', scanLanguage: null},
  imageName: 'miriam-en.png',
});
const IMAGE_ONLY = changeRows({loaded: null, changes: {}, imageName: 'lantern-keeper.webp'});

const COMMIT = {commitUrl: 'https://github.com/Doberjohn/inkweave/commit/abc123'};
// The notes the page picks (the R4 header's "Labels and notes"; R4-6a's newRevealNote, R4-6b's editNote):
// New reveal's, and Edit's when an image went with the save (ImagePage.tsx:20).
const NEW_NOTE = goLiveNote('Vercel is deploying it: allow 15 to 20 minutes before it shows on inkweave.ink.');
const IMAGE_NOTE = goLiveNote('The new image goes live after the convert workflow runs and Vercel redeploys (~a few minutes).');

/** Stands in for the page's button, which R4-6 owns. */
function Commit({label, disabled = false}: {label: 'Publish' | 'Save changes'; disabled?: boolean}) {
  return (
    <CtaButton type="button" disabled={disabled} style={{width: '100%'}}>
      {`${label} to ${targetBranch()}`}
    </CtaButton>
  );
}

/** A fresh New reveal form: 1/7, every open item saying why, no synergies yet, Publish off. */
export const NewRevealFresh: Story = {
  render: () => (
    <>
      <ReadyChecklist items={FRESH} />
      <SynergyPanel groups={[]} />
      <Commit label="Publish" disabled />
      <CommitOutcome result={null} error={null} note={NEW_NOTE} />
    </>
  ),
};

/** Half done: two filled values fail (R-73's number, a spelled-out glyph), and the image is still to come. */
export const NewRevealHalfDone: Story = {
  render: () => (
    <>
      <ReadyChecklist items={HALF_DONE} />
      <SynergyPanel groups={SYNERGY_GROUPS} />
      <Commit label="Publish" disabled />
      <CommitOutcome result={null} error={null} note={NEW_NOTE} />
    </>
  ),
};

/** Published: the form is empty again, and the status line holds the commit and New reveal's note. */
export const NewRevealPublished: Story = {
  render: () => (
    <>
      <ReadyChecklist items={FRESH} />
      <SynergyPanel groups={[]} />
      <Commit label="Publish" disabled />
      <CommitOutcome result={COMMIT} error={null} note={NEW_NOTE} />
    </>
  ),
};

/** Ready, and the publish was refused: master moved meanwhile, so publishing again is the way out. */
export const NewRevealRace: Story = {
  render: () => (
    <>
      <ReadyChecklist items={READY} />
      <SynergyPanel groups={SYNERGY_GROUPS} />
      <Commit label="Publish" />
      <CommitOutcome
        result={null}
        error={`${targetBranch()} changed while publishing, so nothing was published. Publish again.`}
        note={NEW_NOTE}
        onForgetToken={noop}
      />
    </>
  ),
};

/** Edit card with nothing changed yet: the empty line, no Discard, Save off. */
export const EditNoChanges: Story = {
  render: () => (
    <>
      <ChangeList rows={[]} onDiscard={noop} />
      <SynergyPanel groups={SYNERGY_GROUPS} />
      <Commit label="Save changes" disabled />
      <CommitOutcome result={null} error={null} note={IMAGE_NOTE} />
    </>
  ),
};

/** admin#14's refresh to English: the version, the scan language and the image, with Discard. */
export const EditRefresh: Story = {
  render: () => (
    <>
      <ChangeList rows={REFRESH} onDiscard={noop} />
      <SynergyPanel groups={SYNERGY_GROUPS} />
      <Commit label="Save changes" />
      <CommitOutcome result={null} error={null} note={IMAGE_NOTE} />
    </>
  ),
};

/** A released card: the image is its only change, and the page shows no synergies (R-61). */
export const EditImageOnly: Story = {
  render: () => (
    <>
      <ChangeList rows={IMAGE_ONLY} onDiscard={noop} />
      <Commit label="Save changes" />
      <CommitOutcome result={null} error={null} note={IMAGE_NOTE} />
    </>
  ),
};

/** Saved with an image: the card stays open with no changes left (R-70), and the image tool's note. */
export const EditSaved: Story = {
  render: () => (
    <>
      <ChangeList rows={[]} onDiscard={noop} />
      <SynergyPanel groups={SYNERGY_GROUPS} />
      <Commit label="Save changes" disabled />
      <CommitOutcome result={COMMIT} error={null} note={IMAGE_NOTE} />
    </>
  ),
};

/** The card changed on the branch since it was loaded (R-67): Load it again keeps what still applies (R-68). */
export const EditStale: Story = {
  render: () => (
    <>
      <ChangeList rows={REFRESH} onDiscard={noop} />
      <SynergyPanel groups={SYNERGY_GROUPS} />
      <Commit label="Save changes" />
      <CommitOutcome
        result={null}
        error={`Card ${JA_SCAN_ENTRY.id} changed on ${targetBranch()} since you loaded it. Load it again.`}
        note={IMAGE_NOTE}
        onLoadAgain={noop}
        onForgetToken={noop}
      />
    </>
  ),
};

/** Load it again landed and dropped one edit, whose field had changed there (R-68). */
export const EditLoadedAgain: Story = {
  render: () => (
    <>
      <ChangeList rows={REFRESH.slice(1)} onDiscard={noop} />
      <SynergyPanel groups={SYNERGY_GROUPS} />
      <Commit label="Save changes" />
      <CommitOutcome result={null} error={null} note={IMAGE_NOTE} dropped={1} />
    </>
  ),
};

/** GitHub rejected the saved token (a 401): Forget token brings the gate back (R-26, R-84). */
export const RejectedToken: Story = {
  render: () => (
    <>
      <ChangeList rows={REFRESH} onDiscard={noop} />
      <SynergyPanel groups={SYNERGY_GROUPS} />
      <Commit label="Save changes" />
      <CommitOutcome
        result={null}
        error={`GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/${targetBranch()}: {"message":"Bad credentials"}`}
        note={IMAGE_NOTE}
        onForgetToken={noop}
      />
    </>
  ),
};
```

Notes:
- **The title is a leaf**, `Admin/Publish/Card studio/Aside`, as the R4 header asks of every studio story, so no title is both a component and a group.
- **The stories stand in for the page.** The button is a stand-in for R4-6's, and the order is the one the page stacks (re-base note 1). Nothing here calls `useBlocker` or needs a router: "View commit" is a plain `<a>`.
- **Fixtures.** The checklists come from `revealChecklist` over the real validator. `NewRevealHalfDone`'s number, one past `SET_TOTAL` (205 at the pin), shows R-73's refusal, and its spelled-out "Strength" a glyph error. The number comes from the bridge, so the story stays valid when the season's set size changes.
- **The notes** are the page's words: New reveal's note is the R4 header's (R4-6a's `newRevealNote()`, which doesn't exist yet), and Edit's with an image is the image tool's (`ImagePage.tsx:20`, R4-6b's `editNote`). The change rows come from `changeRows` over R4-2a's `JA_SCAN_ENTRY` (admin#14's refresh to English).
- **If Storybook can run in this session** (`pnpm storybook`, http://localhost:6007), open each story and check:
  - the marks, the bar and the muted messages;
  - a long diff wrapping;
  - the alert's red box with "Load it again" under it;
  - the green status line with its gold link.

  Stop Storybook before the commit: the pre-commit hook's workers fail to start under load.

- [ ] **Step 13: Run the gates**

```bash
pnpm vitest run --project app src/tools/studio/__tests__/loadAgainNote.test.ts src/tools/studio/__tests__/ReadyChecklist.test.tsx src/tools/studio/__tests__/ChangeList.test.tsx src/tools/studio/__tests__/CommitOutcome.test.tsx src/tools/studio/__tests__/SynergyPanel.test.tsx
pnpm exec eslint --max-warnings 0 src/tools/studio/loadAgainNote.ts src/tools/studio/components/ReadyChecklist.tsx src/tools/studio/components/ChangeList.tsx src/tools/studio/components/CommitOutcome.tsx src/tools/studio/components/SynergyPanel.tsx src/tools/studio/components/StudioAside.stories.tsx src/tools/reveal/components/SynergyPreviewPanel.tsx src/tools/studio/studioFixtures.ts src/tools/studio/__tests__/loadAgainNote.test.ts src/tools/studio/__tests__/ReadyChecklist.test.tsx src/tools/studio/__tests__/ChangeList.test.tsx src/tools/studio/__tests__/CommitOutcome.test.tsx src/tools/studio/__tests__/SynergyPanel.test.tsx
pnpm typecheck
```

Expected:
- **The tests:** 5 files and 36 tests pass (4, 4, 9, 16 and 3).
- **`eslint`:** exits 0 with no warnings.
- **`pnpm typecheck`:** builds the engine and exits 0. It covers the stories.

Don't run `pnpm lint`, `pnpm test:run` or `pnpm build`: the pre-commit hook runs the first two, and R4-8 runs the build. This task changes neither the bridge nor a reveal-sync contract file (`validateForm.ts`, `buildPreviewCard.ts`, `insertCardIntoPreviewJson.ts`, `constants.ts`), so there is no `scripts/reveal-sync` run.

- [ ] **Step 14: Check Code Health**

Run `mcp__codescene__code_health_review` on each of:
- `src/tools/studio/loadAgainNote.ts`
- `src/tools/studio/components/ReadyChecklist.tsx`
- `src/tools/studio/components/ChangeList.tsx`
- `src/tools/studio/components/CommitOutcome.tsx`
- `src/tools/studio/components/SynergyPanel.tsx`
- `src/tools/reveal/components/SynergyPreviewPanel.tsx`
- `src/tools/studio/studioFixtures.ts`
- `src/tools/studio/components/StudioAside.stories.tsx`
- the five test files

Expected: 10.0 with no findings for each that gets a score. The PR gate is stricter than the local tool, so also check the hand count in re-base note 8:
- 0 primitive parameters in every new module, or 1 of 5 in `CommitOutcome.tsx` counting `.some`'s lambda;
- complexity 4 or less per function;
- no `a || b || c` chain.

If a review finds anything, fix it, review again, and confirm with `mcp__codescene__code_health_score`.

- [ ] **Step 15: Commit**

Use the Bash tool, never PowerShell, and only after the owner approves. Run each command as its own Bash call, and pipe neither.

1. Stage only these paths:

   ```bash
   git add src/tools/studio/loadAgainNote.ts src/tools/studio/components/ReadyChecklist.tsx src/tools/studio/components/ChangeList.tsx src/tools/studio/components/CommitOutcome.tsx src/tools/studio/components/SynergyPanel.tsx src/tools/studio/components/StudioAside.stories.tsx src/tools/reveal/components/SynergyPreviewPanel.tsx src/tools/studio/studioFixtures.ts src/tools/studio/__tests__/loadAgainNote.test.ts src/tools/studio/__tests__/ReadyChecklist.test.tsx src/tools/studio/__tests__/ChangeList.test.tsx src/tools/studio/__tests__/CommitOutcome.test.tsx src/tools/studio/__tests__/SynergyPanel.test.tsx
   ```

2. Run `mcp__codescene__pre_commit_code_health_safeguard`. Continue only when it passes.

3. Commit:

   ```bash
   USER_APPROVED=1 git commit -m "feat(studio): add the studio aside (#24)"
   ```

Husky's pre-commit runs the full lint and `test:run`. Never pass `--no-verify`. If Vitest fails to start its workers under load, stop this session's preview servers (Storybook included), wait for other sessions' runs to finish, and retry.

### Hand-offs from R4-5e

- **R4-6a (New reveal's pane).** It stacks the aside as `ReadyChecklist`, `SynergyPanel`, the Publish button, then `CommitOutcome`.
  - **The checklist.** `items={revealChecklist(ctrl.form, ctrl.validation, {ready: ctrl.imageDataUrl !== null, error: ctrl.uploadError})}`, exactly as R4-3b's invariant test builds it (`R4-03b-reveal-controller.md`, hand-offs). R4-6a's whole `ImageStatus` (`scanOf(ctrl)`) works too: `revealChecklist` takes a `Pick` of it.
  - **The count is `Panel`'s action, beside the `h2`, not in it.** The heading (and the region's name) reads "Ready to publish" alone, so a query for the count goes through the region: `aside().getByRole('region', {name: 'Ready to publish'})` has text content `7/7`. A `getByText(/^Ready to publish/)` finds the `h2`, whose text holds no count (checked against this task's component: that assertion fails, the region's passes).
  - **The outcome.** `result={ctrl.result}`, `error={ctrl.commitError}` (never the folded `publishError`) and `note={newRevealNote()}` (R4-6a's `studioCopy.ts`, R-66). There is no `onLoadAgain`: a new card has no stale check. `onForgetToken` is R-84's forget, which asks with `window.confirm` while either draft is dirty, as `TuningAside.tsx:124-136` does.
  - **Focus (R-59).** Request the page's handoff when a publish settles, success or failure, never on the click (`ctrl.publish().then(handoff.request)`). `CommitOutcome` can always be passed `handoff`: it takes it only while it shows something. Any other taker in the pane must then take only while the outcome shows nothing (R4-6a's form slot, `ready = !outcome`), since one handoff with two ready takers goes to whichever effect runs first. `useTakeHandoff` moves focus only if it fell to `<body>`, which happens when the button disables and the form resets.
- **R4-6b (the Edit pane).** It stacks `ChangeList`, `SynergyPanel` (omitted for an image-only card, R-61), the Save button, then `CommitOutcome`.
  - **The change list.** `rows={edit.changes}`, `onDiscard={edit.discard}` and `busy={edit.saving}`, which holds Discard while a save runs, as R4-4c's hand-off asks (a mid-save Discard would read as a change undoing the save once it lands, R-70). R4-6b's Consumes line (`ChangeList({rows, onDiscard})`) gains `busy`, and its page test can pin that Discard is disabled while Save shows "Saving…".
  - **The outcome.**
    - `result={edit.result}` and `error={edit.saveError}`.
    - `note` is chosen by `edit.result?.withImage`: the image tool's note with an image, New reveal's without one.
    - `dropped={edit.dropped}`.
    - `onLoadAgain` only when `edit.failure === 'stale'`, asking for the handoff once the read lands and never on the click: `() => void edit.loadAgain().then((landed) => landed && handoff.request())`, or R4-6b's `askWhenLanded(edit.loadAgain, handoff)`, which does the same.
    - `onForgetToken`: R-84's confirming forget.
  - **Focus.** After Load it again lands, the outcome takes the handoff: its status line then holds `loadAgainNote`, as R2's Reload focuses its note (F19). This settles the audit's "hand off to the banner": the banner stays mounted, so focus there would skip the news. A new card's handoff goes to the banner's `h2`. The two takers stay apart by state: `CommitOutcome` takes only while it shows something, so the banner gets the handoff only while the outcome shows nothing (R4-6b's `outcomeShowing`, the same `[result, saveError, dropped].some(…)` test). A re-seed clears the outcome (R-69), so a new card's request reaches the banner.
- **R4-6c (retiring `/reveal`).** `SynergyPreviewPanel` stays, used only by `SynergyPanel`. Its story file can stay, or move under `Admin/Publish/Card studio/`. That is R4-6c's call.
- **R4-8 ("R4 as built").** Record these departures from the outline:
  - `CommitOutcome` is always mounted and gains `dropped`, `onForgetToken` and `handoff`;
  - `ChangeList` gains `busy`, which holds Discard during a save (R4-4c's hand-off), so the header's line for it (`R4-card-studio.md:427`, contract addition 12) reads `{rows; onDiscard; busy?}`;
  - `loadAgainNote.ts` is new;
  - Load it again is a neutral `CtaButton`, not a `LinkButton`;
  - "Committed. View commit. {note}" follows R2's order;
  - one test file per part, in place of `StudioAside.test.tsx`;
  - the synergy panel keeps its own empty line, not the handoff's.

  Add R4-5e's `SYNERGY_GROUPS` to the header's "Shared fixtures" list of `studioFixtures.ts` exports (it names R4-4d's, R4-5d's and R4-6a's additions only).

  Optionally, add another R-91 entry: the synergy caption is muted, not the handoff's dim, and the change list's diffs wrap where the handoff cut them short.
