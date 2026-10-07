> Part of [R: Admin redesign](../R-redesign.md), phase R4 ([R4-card-studio.md](R4-card-studio.md)). Read the main plan's decisions (R-57 to R-91 for R4), corrections, global constraints and shared interfaces, then the R4 header, first.

> **Re-base notes (R4-4c, 2026-10-07).** Re-based from the 2026-10-01 outline's Task R4-4 (`R4-card-studio.md:414-599`), its save half: the controller's `canSave`, `saving`, `result`, `saveError`, `save`, `stale` and `loadAgain` (`:455-457`), the `loadAgain` and `applySaved` sketches (`:500-511`), "Which save runs" (`:519-524`), "After a fields save" (`:526-529`), "The stale refusal" (`:530-533`), "When Save is enabled" (`:534-538`), "Errors" (`:539-541`) and the save tests (`:572-590`). Onto main @ `e5e5029` (R1 to R3 merged, plus the app-pin bump), pin `16283a13`, decisions R-57 to R-91 (R-67 to R-70 bear on this task most), and the R4 audit (`.superpowers/sdd/R-redesign/r4-audit-full.json`, entry "R4-4"; `r4-audit-synth.md`, "R4-4"). The audit cited pin `bc877e1`; this task reads no pinned app file, and the facts it relies on (the engine's `LorcanaJSONCard`, `readRepoFile`'s "GitHub {status} on" wording, `commitFiles`' race message) were re-checked at `16283a13` and main.
> - **The split.** The audit split R4-4 in four: R4-4a is the file hook, R4-4b the loading side, this task the save side, and R4-4d the branch-only cards (R-66). This task changes only the save side and the two seams it needs in R4-4b's code: the re-seed (R-68) and the upload's `clearIf`.
> - **What it builds on.** The sibling drafts as they stood on 2026-10-07: R4-1a's `mergeCardChanges` (`sandbox-r41a`, 15:32), R4-1b's `StaleCardError`, `readPreviewCards`, `commitCardEdit` and `CardEditCommit` (`sandbox-r41b`, 15:36), R4-2a's `cardEdit.ts` and `studioFixtures.ts` (`sandbox-r42a`, 15:53 and 15:46), R4-2b's `changeRows.ts`, R4-3b's `livePreview.ts`, R4-4a's `usePreviewCardsFile` (`R4-04a-preview-file-hook.md`) and R4-4b's `studioFixtures.ts` append, `editorState.ts`, `useCardEditor.ts` and `useCardEditor.test.ts` (`R4-04b-editor-loading.md` as it stood at 18:12: its Steps 2, 3, 5, 7 and 9). The R4-4b names this task relies on are listed under Interfaces › Consumes, and Step 1 checks each one. If R4-4b lands with other names, map them; the semantics are what count.
> - **Two save paths, one rule.** `savePlanOf` (a pure helper) picks the commit. A changed card key, as `hasEdits` reads it, goes through `commitCardEdit`, with the staged image when there is one, and only once the form validates. An image alone, on any card, goes through the unchanged `commitCardImage`, which never touches `previewCards.json`, so an image-only card from the card list (R-71) needs neither the file nor a form. A staged image whose bytes aren't read yet, or that failed `useImageUpload`'s byte check, holds both paths back, as the outline asked (`:538`).
> - **After a save, the card stays open (R-70).** A landed fields save calls R4-4a's `file.commit(mergeCardChanges(loaded, changes))`, which patches the entry in at once and reads the file again, so no separate `reload()` (R4-4a's hand-off). `savedDraft` then makes the committed entry and the saved form the draft's baseline, so the next save diffs from what was committed, and an edit typed while the save ran stays a change. The sent file leaves the upload through `clearIf` and the draft through `imageSent` (R4-4b's hand-off), unless another was chosen meanwhile. This departs from the image tool, which dropped the card after a publish (`useImageAdmin.ts:92-95`). The ported case reads "keeps the card open, clears the image", as the header's "Deleted in R4-6c" list says.
> - **Outcomes belong to their draft (R-69).** The outcome is stored with the seed of the draft its save was made from, and shown only while the draft's seed still matches. So nothing clears it by hand: a new card, a first read or a Load it again re-seeds the draft, and the outcome then shows nothing. A save that lands after the operator left the card shows nothing on the next card, as R2's guard already warns ("you won't see whether it landed", `CalibrationPage.tsx:19-20`). What a landed save does to the file still happens, so reopening the card seeds from the committed entry, even before the re-read lands (the audit's "reopen before the reload lands"). `saving` spans cards, so no second save starts while one runs (the header's "Write states").
> - **`result.withImage`** says whether an image went with the commit, so R4-6b picks Edit's go-live note by it. `commitCardEdit` and `commitCardImage` return only `{commitUrl}`, and the staged image has cleared by the time the page reads the result.
> - **Failures are classified** as `'stale'` (`instanceof StaleCardError`, checked before the error is reduced to its message, as R4-1b's hand-off asks), `'rejected-token'` (`isRejectedToken`, R-26) or `'other'`. `commitFiles`' race message ends "Publish again." (`githubCommit.ts:161`). The header's shared rules give its Edit wording to this task, so `failureOf` rewords exactly that sentence as a save ("master changed while saving, so nothing was saved. Save again."), and R4-6b needs no helper of its own (R4-1b's hand-off had offered R4-6b one). Its test builds the message from a real non-fast-forward, so a change to `githubCommit.ts`'s wording fails it. A failed read is not classified here: its message passes through unchanged (R4-4a), and the page reads it with `isRejectedToken` (R4-6b). A test pins that a 401 read reaches `lookup` as GitHub worded it.
> - **Load it again keeps what still applies (R-68).** `loadAgain` sets the draft to follow the next read (`follow: true`, `read: file.requested`, R4-4a's hand-off), then reads the file again. R4-4b's hand-off says to keep `read`, but after a landed save the file's `read` has run ahead of the draft's (`commit` reads again, and the draft doesn't follow it), so a kept `read` would re-seed at once from a read that may predate the change that refused the save. `file.requested` makes the draft wait for the read Load it again asked for. When that read lands, R4-4b's `needsSeed` re-seeds the draft, and this task routes that re-seed through `reseeded`: another card starts afresh, as before, while the same card's newer read goes through `keepEdits`. A field the draft changed is kept while the fresh entry's form still holds the value that edit started from (R4-2a's hand-off: `formFromPreviewCard(fresh)[field]` against the draft's `before[field]`), the staged image is kept, and `dropped` counts the rest. A card that no longer opens with fields drops every edit and keeps the image for an image-only save. The refusal clears when the re-seed lands, not on the click. The case "Load it again after a landed save waits for its own read, not the save's" pins the `read` rule.
> - **`loadAgain` and `retry` return promises.** Each resolves `true` once its read lands, after R4-4a has put it on screen, and `false` when the read fails. `retry` reads the file whenever the search shows a file error, `previewFileView(file).error` (R4-4b's view): a failed first read's, or R4-4a's `reloadError` once a later read failed (the read after a save, R-66's read after a publish, a failed Load it again). It resolves `false` at once when the search shows none (only the card list had failed). Step 11 pins both. R4-6b's verifier found the first draft's condition, `file.status === 'error'`, true only while no read had ever landed, so after a later failed read the search's "Read previewCards.json again" read nothing. The rule belongs to the controller, so it lives here, and R4-6b's Step 1 sees it and skips its Step 10 edit. The page asks for its focus handoffs from state (R-59), so the promises are for callers that want one answer. The card list's half of `retry` can't be awaited, because `useCardData`'s `retryLoad` returns nothing; the page watches its error clear, as R3-7 does. R4-4b's draft returned `void`, and two of its tests call `retry()` inside an `act`. A reload awaited inside the act that asks for it never settles (R4-4a's note), so Step 11 changes those two calls.
> - **The sibling drafts agree.** R4-4b uses R4-2a's names (`editKindOf`, `'other-set'`/`'unrepresentable'`, `hasEdits({changes, imageName})`, `PREVIEW_ENTRY`/`DUAL_INK_ENTRY`/`RELEASED_CARD`) and imports `PreviewCardsFile` from `previewCardsFile.ts`, so nothing needs mapping.
> - **The header already carries the save side's shape** (contract addition 11, as re-based): `CardEditorController` extends `EditSave` (`canSave`, `saving`, `save`, `result`, `saveError`, `failure`, `loadAgain`, `dropped`), `retry` returns `Promise<boolean>`, and lookups use R4-4b's names (`lookup.kind`, `'fileFailed'`). Against the 2026-10-01 outline these are departures, already taken into the header:
>   - `dropped` is `number | null`: null until a Load it again lands on the card, and again once a save starts, so the page shows its note only after one, as R2's `DroppedNote` does (`TuningAside.tsx:396-405`).
>   - The outline's `stale: boolean` is `failure === 'stale'`.
>   - The outline's `result: CommitResult` is `EditResult`, with `withImage`.
> - **Tests.** The save cases get their own file, `useCardEditor.save.test.ts`, beside R4-4b's `useCardEditor.test.ts`, so neither file grows past one concern and this task doesn't rewrite R4-4b's harness. R4-4b's hand-off asked for the two image-tool ports with its file's `renderEditor`, `stage` and `open`; those are private to its test file, so this one has the same helpers in its own words (`openEditor`, `stage`, `rerender`) and a `deferred(mock)` generalised over both commits and the read, from `publishingCardA` (`useImageAdmin.test.ts:31-43`). No case here moves the card list, so its mock is a plain value; R4-4b's file keeps R3's store for the cases that do. Mocks reset in a block-bodied `beforeEach` (Vitest 5's `clearAllMocks` keeps implementations). Reads and commits settle through `deferred(mock)`, and every promise that waits on a read is awaited after the act that started it, never inside it. The pure helpers have their own test, `editSave.test.ts`.
> - **Code Health** (hand count, explicit annotations):
>   - `editSave.ts`: 0 primitive parameters in 19. `extOf` takes a `File`, `inSaveWords` an `Error`, `failureOf` `unknown`.
>   - `useEditSave.ts`: 0 in 6.
>   - `useCardEditor.ts`: the one new helper, `retryReads({list, file})`, takes an object, so the module goes from R4-4b's 0 of 5 to 0 of 6. `retryReads` has complexity 3 (its two `if`s). The hook body gains no branch: `dropped` comes from `useEditSave`.
>   - `editSave.test.ts`: 0 in 2. `useCardEditor.save.test.ts`: 2 in 9 (`openEditor(cardId: string)` and `stage(editor, name: string)`), 22%. Its `it.each` rows are objects, so each callback takes one.
>   - Cyclomatic complexity is 5 or less in every new function. The only `||` is `uploadOf`'s single one, and no condition chains two.
> - **Gates once.** The steps run the four studio test files, eslint on the seven changed files and one `pnpm typecheck`, then Code Health and the commit. No reveal-sync run: no contract file or bridge line changes.
> - **Verified** in `scratchpad/r4-rebase/sandbox-R4-4c`: a copy of `src/` and the configs from the working tree (main `b490fb7` plus the uncommitted bump to `16283a13`), `node_modules` and `upstream/` junctioned in, and Vite's cache in the sandbox. Over it lay the sibling drafts named above.
>   - Step 3 and Step 7 failed as quoted there. Then the four studio files passed, 107 tests: 25 in `editSave.test.ts`, 20 in `useCardEditor.save.test.ts`, and R4-4b's 44 and 18, which pass as they did before this task (with Step 11's change, which then had no third case), and no `act(...)` warning under `--silent=false`. The reveal, image, `src/components` and `src/github` suites pass beside them; the one failure there is the repo's old `validateForm.test.ts` case that R4-3a rewrites for R-73, since the sandbox carries R4-3a's `validateForm.ts` without its test.
>   - `tsc -p tsconfig.app.json` reported nothing. All seven files pass `pnpm exec eslint --max-warnings 0 --stdin` from the repo.
>   - **Mutation run: 25 of 26 mutants were killed,** each by 1 to 7 tests: no seed scoping of the outcome; `keepEdits` dropping every edit, or keeping every edit; no image carried; `reseeded` never, or always, keeping edits; no race wording; `savedDraft` a no-op, or ignoring the seed; no `file.commit`; `withImage` always false; no `clearIf`; `imageSent` a no-op, or clearing any file; Load it again not following the read, or keeping the draft's `read` (R4-4b's hand-off); `loadAgain` or `retry` resolving at once; `StaleCardError` not told apart; Save not blocked while saving; `dropped` kept when a save starts; an unread image not blocking; validation ignored; the outcome not cleared as a save starts; the image path taken over a field edit. The survivor drops `land`'s `imageSent` call. It is equivalent at the controller: `clearIf` has already emptied the upload, so `stagedImage` shows nothing either way. `imageSent`'s own test keeps the helper honest.
>   - CodeScene (local MCP 1.5.7, in the sandbox, which is its own git repository) gave all six files 10.0 with no findings: the two new modules, `useCardEditor.ts` as changed, the two new tests and R4-4b's test as changed.
>   - **Re-verified** (verifier, 17:50) in `scratchpad/r4-rebase/sandbox-v-R4-4c`, with the sibling drafts as they now stand: R4-4a's `usePreviewCardsFile.ts` with its `PreviewCardsFile` re-export, R4-2a's `studioFixtures.ts` and `cardEdit.ts` (17:40), R4-1a's and R4-1b's modules (unchanged), and R4-4b's `editorState.ts`, `useCardEditor.ts` and two tests taken from its task file's code blocks as they then stood. Step 9's edits and Step 11's were applied as written. Steps 3 and 7 failed as quoted; then the four studio files gave `Tests  107 passed (107)` with no `act(...)` warning under `--silent=false`; `tsc -p tsconfig.app.json` reported nothing; the seven files pass `eslint --max-warnings 0 --stdin` from the repo; and CodeScene MCP 1.5.7 gave 10.0 with no findings on the seven files Step 14 names. Step 11's new assertion kills the mutant that has `retryReads` resolve `true` when the file hadn't failed, which no other case caught.
>   - **Re-verified after the cross-task critic** (19:30) in `scratchpad/r4-rebase/sandbox-R4-4c-crit`: the 17:50 sandbox, with R4-4b's code taken unchanged from its task file as it now stands (Step 2's block appended to R4-2a's `studioFixtures.ts`; Steps 3, 5, 7 and 9), with no mapping and no fixtures of its own. R4-4b's two tests alone gave `Tests  62 passed (62)`. This task's code blocks were laid over it, then Step 9's and Step 11's edits as now written; the diffs in both steps are `diff -u` of that run. The four studio files gave `Tests  108 passed (108)` with no `act(...)` warning under `--silent=false`; `tsc -p tsconfig.app.json --noEmit` reported nothing; `useCardEditor.ts`, `editorState.ts` and `useCardEditor.test.ts` pass `eslint --max-warnings 0 --stdin` from the repo; and CodeScene MCP 1.5.7 gave `useCardEditor.ts` and `useCardEditor.test.ts` 10.0 with no findings. With `retryReads`' first-draft condition (`file.status !== 'error'`) put back, only Step 11's new case fails, with `AssertionError: expected false to be true`.

### Task R4-4c: The Edit controller, saving side

**Files:**
- Create:
  - `src/tools/studio/editSave.ts`: the pure helpers (the save plan, failure kinds, `savedDraft`, `imageSent`, `keepEdits`, `reseeded`).
  - `src/tools/studio/useEditSave.ts`: the save side's hook.
- Test (create):
  - `src/tools/studio/__tests__/editSave.test.ts`
  - `src/tools/studio/__tests__/useCardEditor.save.test.ts`
- Modify:
  - `src/tools/studio/editorState.ts` (R4-4b): `Draft` gains `dropped?`.
  - `src/tools/studio/useCardEditor.ts` (R4-4b): the re-seed goes through `reseeded`, `useDraftImage` hands out `clearIf`, `retry` returns a promise, and the controller spreads `useEditSave`'s result.
  - `src/tools/studio/__tests__/useCardEditor.test.ts` (R4-4b): its two `retry()` calls, which now return a promise.
- No other file: not `githubCommit.ts`, the reveal-sync contract files, the bridge or any component. No story: the hook draws nothing.

**Interfaces:**
- **Consumes:**
  - **R4-1b** (`src/tools/reveal/githubClient.ts`): `class StaleCardError extends Error` (no constructor of its own), `readPreviewCards(token): Promise<LorcanaJSONCard[]>` (tests only, mocked), `interface CardEditCommit {token; loaded; changes; image: {dataUrl: string; ext: string} | null}` and `commitCardEdit(opts: CardEditCommit): Promise<CommitResult>`. Its refusals: "Card {id} changed on {branch} since you loaded it. Load it again." and "Card {id} is no longer in previewCards.json on {branch}. Load it again.".
  - **R4-1a** (`src/tools/reveal/replaceCardInPreviewJson.ts`): `mergeCardChanges(card, changes): LorcanaJSONCard` and `type PreviewCardChanges` (null removes a key).
  - **R4-2a** (`src/tools/studio/cardEdit.ts`): `hasEdits(edit: {changes; imageName}): boolean`, the one edits rule, and (tests) `formFromPreviewCard`. From `studioFixtures.ts` (tests): `PREVIEW_ENTRY` (Mei, Ruby's first number), `DUAL_INK_ENTRY` (Priya), `JA_SCAN_ENTRY` (Miriam, `scanLanguage: 'ja'`), `RELEASED_CARD` (set 9) and `cardOf(entry)`.
  - **R4-4a** (`src/tools/studio/usePreviewCardsFile.ts`): `UsePreviewCardsFileResult`, whose `requested` is the newest read asked for, `reload(): Promise<LorcanaJSONCard[] | null>` settles once that read is on screen (null when it failed), and `commit(entry)` patches the entry in at once and asks for one more read.
  - **R4-4b** (`src/tools/studio/editorState.ts` and `useCardEditor.ts`), as its draft has them:
    ```ts
    export interface FieldsEdit {kind: 'fields'; loaded: LorcanaJSONCard; before: RevealCardForm; form: RevealCardForm}
    export interface Draft {
      cardId: string | null;
      seed: number;                 // bumped on every seed
      read: number | null;          // the read it was seeded from
      follow: boolean;              // seed again once the card is ready on a newer read
      edit: FieldsEdit | ImageOnlyEdit | null;
      image: File | null;           // the file chosen for this draft (stageImage)
    }
    export interface SeedInput {cardId: string | null; lookup: EditLookup; file: PreviewCardsFile; seed: number}
    export function seedDraft(input: SeedInput): Draft;
    export function needsSeed(input: Omit<SeedInput, 'seed'> & {draft: Draft}): boolean;
    export function fieldsOf(draft: Draft): FieldsEdit | null;
    export interface StagedImage {name: string | null; dataUrl: string | null; error: string | null}
    export function stagedImage(input: {draft: Draft; upload: Pick<ImageUpload, 'file' | 'dataUrl' | 'error'>}): StagedImage;
    export function openCard(lookup: EditLookup): LorcanaCard | null;   // the ready lookup's card
    export function previewFileView(file: PreviewCardsFile): PreviewFileView;   // the search's file state; `error` is the first read's, or a later read's reloadError
    // useCardEditor.ts: useEditDraft(input) holds the draft and seeds it during render (needsSeed);
    // useDraftImage(draft, setDraft) holds useImageUpload; draftChanges(draft) and
    // draftValidation({draft, imageName}) feed the controller; its retry is () => void
    ```
  - **Unchanged:** `commitCardImage({token, card: Pick<LorcanaCard, 'id' | 'fullName'>, imageBase64, imageExt})` and `type ImageAdminCard` (`src/tools/image/githubClient.ts:15-28` and `:7`; R4-6c keeps this file), `isRejectedToken(message)` (`src/github/rejectedToken.ts:6-8`), `targetBranch()` and `CommitResult` (`src/github/githubCommit.ts`), `ImageUpload.clearIf` (`src/components/useImageUpload.ts:92-96`). Tests: `commitFiles`, `DeferredReader`, `pngFile`.
- **Produces:**
```ts
// src/tools/studio/editSave.ts
export type SaveFailure = 'stale' | 'rejected-token' | 'other';
export interface EditResult {commitUrl: string; withImage: boolean}
export interface SaveInput {
  token: string; draft: Draft; card: LorcanaCard | null;   // card: the ready lookup's, else null
  changes: PreviewCardChanges; validation: ValidationResult; staged: StagedImage;
}
export interface CardImageCommit {token: string; card: ImageAdminCard; imageBase64: string; imageExt: string}
export type SavePlan =
  | {path: 'fields'; seed: number; form: RevealCardForm; sent: File | null; commit: CardEditCommit}
  | {path: 'image'; seed: number; sent: File; commit: CardImageCommit};
export function savePlanOf(input: SaveInput): SavePlan | null;   // null: nothing Save can commit now
export function failureOf(error: unknown): {failure: SaveFailure; message: string};
export interface SavedFields {seed: number; loaded: LorcanaJSONCard; form: RevealCardForm}
export function savedDraft(draft: Draft, saved: SavedFields): Draft;   // R-70, only for the draft the save was made from
export function keepEdits(draft: Draft, fresh: Draft): Draft;          // R-68
export function imageSent(draft: Draft, sent: File): Draft;           // a landed save's file leaves the draft
export function reseeded(input: Omit<SeedInput, 'seed'> & {draft: Draft}): Draft;   // R4-4b's seed, keeping edits on the same card

// src/tools/studio/useEditSave.ts
export interface EditSaveInput extends SaveInput {
  setDraft: Dispatch<SetStateAction<Draft>>;
  clearIf: (file: File) => boolean;
  file: Pick<UsePreviewCardsFileResult, 'requested' | 'reload' | 'commit'>;
}
export interface EditSave {
  canSave: boolean; saving: boolean;
  save: () => Promise<void>;              // settles once the commit lands or fails
  result: EditResult | null; saveError: string | null; failure: SaveFailure | null;   // this draft's last save only (R-69)
  loadAgain: () => Promise<boolean>;      // true once the re-read lands and the draft re-seeds (R-68)
  dropped: number | null;                 // the edits the last Load it again dropped; null until one lands
}
export function useEditSave(input: EditSaveInput): EditSave;

// src/tools/studio/editorState.ts: Draft gains
dropped?: number;

// src/tools/studio/useCardEditor.ts
export interface CardEditorController extends EditSave { /* R4-4b's fields */ retry: () => Promise<boolean> }
// retry reads the file whenever previewFile.error is set (a failed first read, or a later read's reloadError)
```

**How a save works.**

| The draft | Save runs | Once it lands |
|---|---|---|
| A changed card key (`hasEdits` with no image), the form valid | `commitCardEdit({token, loaded, changes, image})`, `image` set when a staged image's bytes are read | `file.commit(mergeCardChanges(loaded, changes))`; the draft it came from takes the entry and the saved form as its baseline (R-70); the sent file clears |
| No changed key, a staged image read and checked, on any card | `commitCardImage({token, card: {id, fullName}, imageBase64, imageExt})` | the sent file clears; `previewCards.json` is untouched |
| A staged image still reading, or failed its check | nothing (`canSave` false) | |
| Nothing staged and nothing changed, a changed key with an invalid form, no ready card, or a save in flight | nothing (`canSave` false) | |

| Event | `result` / `saveError` / `failure` | `dropped` |
|---|---|---|
| Save starts | all null | null |
| It lands, the draft's seed unchanged | `{commitUrl, withImage}` | |
| It fails, the draft's seed unchanged | the message (the race in Save's words) and its kind | |
| It lands or fails after a re-seed (another card, a first read, Load it again) | stays null on the draft now on screen (R-69) | |
| Load it again's read lands | null (the re-seed) | the count of dropped edits |
| Load it again's read fails | unchanged: the refusal stays, with R4-4a's `reloadError` | unchanged |

- [ ] **Step 1: Check what this task builds on**

R4-4c needs R4-1a, R4-1b, R4-2a, R4-4a and R4-4b, on main after the pin bump. Run, with the Bash tool:
```bash
git log --oneline main..HEAD
git -C upstream/inkweave rev-parse --short=8 HEAD
grep -nE "^export (class StaleCardError|async function (readPreviewCards|commitCardEdit)|interface CardEditCommit)" src/tools/reveal/githubClient.ts
grep -n "^export function mergeCardChanges" src/tools/reveal/replaceCardInPreviewJson.ts
grep -n "^export function hasEdits(edit: {changes: PreviewCardChanges; imageName: string | null})" src/tools/studio/cardEdit.ts
grep -nE "^export (const (PREVIEW_ENTRY|DUAL_INK_ENTRY|JA_SCAN_ENTRY|RELEASED_CARD) |function cardOf)" src/tools/studio/studioFixtures.ts
grep -nE "reload: \(\) => Promise<LorcanaJSONCard\[\] \| null>;|commit: \(entry: LorcanaJSONCard\) => void;" src/tools/studio/usePreviewCardsFile.ts
grep -nE "^export (interface (Draft|FieldsEdit|SeedInput|StagedImage) \{|function (seedDraft|needsSeed|fieldsOf|stagedImage|openCard|previewFileView)\()" src/tools/studio/editorState.ts
grep -nE "^  image: File \| null;|^  dropped" src/tools/studio/editorState.ts
grep -nE "function (useEditDraft|useDraftImage)\(|setDraft\(seedDraft\(\{\.\.\.input, seed: draft\.seed \+ 1\}\)\)|  retry: \(\) => void;|void file\.reload\(\);" src/tools/studio/useCardEditor.ts
grep -n "result.current.retry()" src/tools/studio/__tests__/useCardEditor.test.ts
ls src/tools/studio/editSave.ts src/tools/studio/useEditSave.ts
```
Expected:
- **The log** lists, among others, the commits of R4-1a, R4-1b, R4-2a, R4-2b, R4-3b, R4-4a and R4-4b.
- **The pin** prints `16283a13`. If it prints `bc877e1`, the bump hasn't merged into this branch's base: stop and tell the controller.
- **R4-1b's grep** prints four lines: the class, `readPreviewCards`, `CardEditCommit` and `commitCardEdit`. **R4-1a's** prints one. **R4-2a's** print one and five.
- **R4-4a's grep** prints two lines. If `reload` resolves a `boolean` instead, drop the two `.then((cards) => cards !== null)` in Steps 8 and 9.
- **R4-4b's greps** print ten lines from `editorState.ts` (four interfaces, six functions: `previewFileView` is the one `retryReads` reads), then `image: File | null;` and no `dropped` line, then five from `useCardEditor.ts` (`retry: () => void;`, `useEditDraft`, the seed line, `useDraftImage` and `retry`'s `void file.reload();`), then two `retry()` calls from its test.
  - **A name that differs** (R4-4b settled on another): map it in the steps below, and keep the semantics in "How a save works". The seams this task needs are the draft's `seed`, `follow`, `read`, its form's `loaded`, `before` and `form`, the draft's own staged `File`, the one render-time seed line, and the upload's `clearIf`.
  - **`retry` already returns `Promise<boolean>`:** keep it if it reads the file whenever `previewFileView(file).error` is set, else replace it with Step 9's `retryReads`. Skip Step 11's two rewrites, still add its new case, and keep Step 6's retry case as a pin on it too.
  - **No `retry()` call in the test:** skip Step 11's two rewrites, and still add its new case.
- **The last `ls`** fails with `No such file or directory` for both paths.

- [ ] **Step 2: Write the pure helpers' failing test**

Create `src/tools/studio/__tests__/editSave.test.ts`:
```ts
import {afterEach, describe, expect, it, vi} from 'vitest';
import {commitFiles} from '../../../github/githubCommit';
import {pngFile} from '../../../test/images';
import {StaleCardError} from '../../reveal/githubClient';
import {formFromPreviewCard} from '../cardEdit';
import {failureOf, imageSent, keepEdits, reseeded, savePlanOf, savedDraft, type SaveInput} from '../editSave';
import type {Draft, FieldsEdit, StagedImage} from '../editorState';
import {DUAL_INK_ENTRY, PREVIEW_ENTRY, RELEASED_CARD, cardOf} from '../studioFixtures';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const MEI = cardOf(PREVIEW_ENTRY);
const FORM = formFromPreviewCard(PREVIEW_ENTRY);
const FIELDS: FieldsEdit = {kind: 'fields', loaded: PREVIEW_ENTRY, before: FORM, form: FORM};
const FILE = pngFile('mei.png');
const DATA_URL = 'data:image/png;base64,iVBORw0KGgo=';
const NOTHING: StagedImage = {name: null, dataUrl: null, error: null};
const READ: StagedImage = {name: 'mei.png', dataUrl: DATA_URL, error: null};
const READING: StagedImage = {name: 'mei.png', dataUrl: null, error: null};

/** Mei's draft, seed 3, as R4-4b seeds it from the file's first read. */
function draft(patch: Partial<Draft> = {}): Draft {
  return {cardId: MEI.id, seed: 3, read: 1, follow: false, edit: FIELDS, image: null, ...patch};
}

/** A save's inputs on that draft: nothing changed, nothing staged, the form valid. */
function input(patch: Partial<SaveInput> = {}): SaveInput {
  return {token: 'tok', draft: draft(), card: MEI, changes: {}, validation: {ok: true, errors: {}}, staged: NOTHING, ...patch};
}

describe('savePlanOf', () => {
  it.each([
    ['no card is open', input({card: null, changes: {cost: 5}})],
    ['nothing changed', input()],
    ["a staged image's bytes aren't read", input({draft: draft({image: FILE}), staged: READING})],
    ["a field changed and a staged image's bytes aren't read", input({draft: draft({image: FILE}), staged: READING, changes: {cost: 5}})],
    ['a field changed but the form fails', input({changes: {cost: 5}, validation: {ok: false, errors: {cost: 'Enter a cost (0 or more)'}}})],
    ['a field changed on an image-only card', input({draft: draft({edit: {kind: 'image', reason: 'released'}}), changes: {cost: 5}})],
  ])('has nothing to save when %s', (_case, from) => {
    expect(savePlanOf(from)).toBeNull();
  });

  it('commits field edits through commitCardEdit, with the staged image when there is one', () => {
    expect(savePlanOf(input({changes: {cost: 5}}))).toEqual({
      path: 'fields',
      seed: 3,
      form: FORM,
      sent: null,
      commit: {token: 'tok', loaded: PREVIEW_ENTRY, changes: {cost: 5}, image: null},
    });
    expect(savePlanOf(input({draft: draft({image: FILE}), staged: READ, changes: {cost: 5}}))).toMatchObject({
      path: 'fields',
      sent: FILE,
      commit: {image: {dataUrl: DATA_URL, ext: 'png'}},
    });
  });

  it.each([
    ['a preview card', input({draft: draft({image: FILE}), staged: READ})],
    ['a released card', input({draft: draft({image: FILE, edit: {kind: 'image', reason: 'released'}}), card: RELEASED_CARD, staged: READ})],
  ])('commits an image alone on %s through commitCardImage', (_case, from) => {
    expect(savePlanOf(from)).toEqual({
      path: 'image',
      seed: 3,
      sent: FILE,
      commit: {token: 'tok', card: {id: from.card?.id, fullName: from.card?.fullName}, imageBase64: DATA_URL, imageExt: 'png'},
    });
  });
});

/** commitFiles' own refusal when the branch moves under it: GitHub refuses the ref update as not a fast forward. */
async function raceRefusal(): Promise<unknown> {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) =>
    init?.method === 'PATCH'
      ? new Response(JSON.stringify({message: 'Update is not a fast forward'}), {status: 422})
      : new Response(JSON.stringify({object: {sha: 'base'}, tree: {sha: 'tree'}, sha: 'sha', html_url: 'url'})),
  );
  return commitFiles({token: 'tok', message: 'test commit', files: []}).catch((e: unknown) => e);
}

describe('failureOf', () => {
  const stale = 'Card 14001 changed on master since you loaded it. Load it again.';
  const unauthorized = 'GitHub 401 on /repos/Doberjohn/inkweave/git/ref/heads/master: Bad credentials';

  it.each([
    ['a stale entry', new StaleCardError(stale), {failure: 'stale', message: stale}],
    ['a rejected token', new Error(unauthorized), {failure: 'rejected-token', message: unauthorized}],
    ['any other error', new Error('previewCards.json has no cards array'), {failure: 'other', message: 'previewCards.json has no cards array'}],
    ['a throw that is no Error', 'boom', {failure: 'other', message: 'Save failed'}],
  ])('reads %s', (_case, error, read) => {
    expect(failureOf(error)).toEqual(read);
  });

  it("words commitFiles' race as a save, on the target branch", async () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    expect(failureOf(await raceRefusal())).toEqual({
      failure: 'other',
      message: 'admin-verify changed while saving, so nothing was saved. Save again.',
    });
  });
});

describe('savedDraft', () => {
  const saved = {seed: 3, loaded: {...PREVIEW_ENTRY, cost: 5}, form: {...FORM, cost: '5'}};

  it('makes what the save committed the baseline of the draft it was made from, keeping what was typed since (R-70)', () => {
    const typed = {...FORM, cost: '5', lore: '3'};
    expect(savedDraft(draft({edit: {...FIELDS, form: typed}}), saved)).toEqual(
      draft({edit: {kind: 'fields', loaded: saved.loaded, before: saved.form, form: typed}}),
    );
  });

  it.each([
    ['seeded since (R-69)', draft({seed: 4})],
    ['image-only', draft({edit: {kind: 'image', reason: 'released'}})],
  ])('leaves a draft that is %s as it is', (_case, other) => {
    expect(savedDraft(other, saved)).toBe(other);
  });
});

describe('imageSent', () => {
  it('takes the sent file off the draft', () => {
    expect(imageSent(draft({image: FILE}), FILE)).toEqual(draft());
  });

  it('keeps a file chosen since', () => {
    const since = draft({image: pngFile('mei-2.png')});
    expect(imageSent(since, FILE)).toBe(since);
  });
});

describe('keepEdits', () => {
  // Mei with her name and cost edited and a scan staged. Someone changed her cost on the branch.
  const edited = draft({edit: {...FIELDS, form: {...FORM, name: 'Mei Lee', cost: '5'}}, image: FILE});
  const freshForm = {...FORM, cost: '6'};
  const fresh = draft({seed: 4, read: 2, edit: {kind: 'fields', loaded: {...PREVIEW_ENTRY, cost: 6}, before: freshForm, form: freshForm}});

  it('keeps the image and each edit whose value the branch left alone, and counts the one it changed (R-68)', () => {
    expect(keepEdits(edited, fresh)).toEqual({
      ...fresh,
      edit: {kind: 'fields', loaded: {...PREVIEW_ENTRY, cost: 6}, before: freshForm, form: {...freshForm, name: 'Mei Lee'}},
      image: FILE,
      dropped: 1,
    });
  });

  it('counts none dropped when every edit still applies', () => {
    const same = draft({seed: 4, read: 2});
    expect(keepEdits(edited, same)).toMatchObject({edit: {form: {...FORM, name: 'Mei Lee', cost: '5'}}, dropped: 0});
  });

  it('drops every edit when the card no longer opens with fields, and keeps the image for an image-only save', () => {
    const imageOnly = draft({seed: 4, read: 2, edit: {kind: 'image', reason: 'released'}});
    expect(keepEdits(edited, imageOnly)).toEqual({...imageOnly, image: FILE, dropped: 2});
  });

  it('takes a first read as it is, with no count', () => {
    const waiting = draft({read: null, follow: true, edit: null});
    expect(keepEdits(waiting, fresh)).toEqual(fresh);
  });
});

describe('reseeded', () => {
  const lookup = {kind: 'ready' as const, card: MEI, entry: PREVIEW_ENTRY, imageOnly: null};
  const file = {status: 'ready' as const, cards: [PREVIEW_ENTRY], ids: new Set([PREVIEW_ENTRY.id]), read: 2};
  const typed = draft({edit: {...FIELDS, form: {...FORM, name: 'Mei Lee'}}, image: FILE});

  it('starts another card afresh, with the next seed', () => {
    const priya = cardOf(DUAL_INK_ENTRY);
    const next = {kind: 'ready' as const, card: priya, entry: DUAL_INK_ENTRY, imageOnly: null};
    expect(reseeded({draft: typed, cardId: priya.id, lookup: next, file})).toMatchObject({
      cardId: priya.id,
      seed: 4,
      image: null,
      edit: {kind: 'fields', loaded: DUAL_INK_ENTRY},
    });
  });

  it("keeps the same card's edits on its newer read (R-68)", () => {
    expect(reseeded({draft: typed, cardId: MEI.id, lookup, file})).toMatchObject({seed: 4, read: 2, image: FILE, dropped: 0, edit: {form: {name: 'Mei Lee'}}});
  });
});
```

- [ ] **Step 3: Run it, and see it fail**

Run: `pnpm vitest run --project app src/tools/studio/__tests__/editSave.test.ts`

Expected: FAIL, as the whole file:
```
Error: Failed to resolve import "../editSave" from "src/tools/studio/__tests__/editSave.test.ts". Does the file exist?
```

- [ ] **Step 4: Write `editSave.ts`**

Create `src/tools/studio/editSave.ts`:
```ts
import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {targetBranch} from '../../github/githubCommit';
import {isRejectedToken} from '../../github/rejectedToken';
import type {ImageAdminCard} from '../image/githubClient';
import type {RevealCardForm} from '../reveal/buildPreviewCard';
import {StaleCardError, type CardEditCommit} from '../reveal/githubClient';
import type {PreviewCardChanges} from '../reveal/replaceCardInPreviewJson';
import type {ValidationResult} from '../reveal/validateForm';
import {hasEdits} from './cardEdit';
import {fieldsOf, seedDraft, type Draft, type FieldsEdit, type SeedInput, type StagedImage} from './editorState';

/*
 * Edit card's save side as pure helpers (R4-4c): the commit a save makes, how
 * a failure reads, and what a landed save or "Load it again" does to the
 * draft. useEditSave wires them; useCardEditor seeds through reseeded.
 */

/** Why a save failed, as the outcome tells the kinds apart (R-26, R-67). */
export type SaveFailure = 'stale' | 'rejected-token' | 'other';

/** A save that landed: its commit, and whether an image went with it (Edit's go-live note, R4-6b). */
export interface EditResult {
  commitUrl: string;
  withImage: boolean;
}

/** What a save reads from the editor. */
export interface SaveInput {
  token: string;
  draft: Draft;
  /** The open card, once the lookup is ready; else null. */
  card: LorcanaCard | null;
  /** draftChanges' result: {} for an image-only card. */
  changes: PreviewCardChanges;
  validation: ValidationResult;
  /** stagedImage's result: the upload, when it holds this draft's file. */
  staged: StagedImage;
}

/** commitCardImage's input (image/githubClient.ts). */
export interface CardImageCommit {
  token: string;
  card: ImageAdminCard;
  imageBase64: string;
  imageExt: string;
}

/**
 * The commit a save makes, and what it was made from: `seed` ties its outcome
 * to the draft (R-69), `form` is the form a fields save commits, the baseline
 * once it lands (R-70), and `sent` is the file it sends, which clears once it
 * lands.
 */
export type SavePlan =
  | {path: 'fields'; seed: number; form: RevealCardForm; sent: File | null; commit: CardEditCommit}
  | {path: 'image'; seed: number; sent: File; commit: CardImageCommit};

/** This draft's staged file, with its bytes once read and checked. */
interface Upload {
  file: File;
  dataUrl: string | null;
}

/** The file staged for this draft, or null with none (stagedImage names it only while the upload holds it). */
function uploadOf({draft, staged}: Pick<SaveInput, 'draft' | 'staged'>): Upload | null {
  if (staged.name === null || draft.image === null) return null;
  return {file: draft.image, dataUrl: staged.dataUrl};
}

/** The extension a commit files the image under; useImageUpload's byte check matched it to the bytes. */
function extOf(file: File): string {
  return (file.name.split('.').pop() ?? '').toLowerCase();
}

/** The staged image as commitCardEdit sends it, or null with none. */
function sentImage(upload: Upload | null): CardEditCommit['image'] {
  return upload?.dataUrl ? {dataUrl: upload.dataUrl, ext: extOf(upload.file)} : null;
}

type PlanInput = SaveInput & {card: LorcanaCard; upload: Upload | null};

/** A fields save: the edit through commitCardEdit, with the staged image when there is one, once the form validates. */
function fieldsPlan({token, draft, changes, validation, upload}: PlanInput): SavePlan | null {
  const fields = fieldsOf(draft);
  if (fields === null) return null;
  if (!validation.ok) return null;
  const commit = {token, loaded: fields.loaded, changes, image: sentImage(upload)};
  return {path: 'fields', seed: draft.seed, form: fields.form, sent: upload?.file ?? null, commit};
}

/** An image-only save: the staged image through commitCardImage, which never touches previewCards.json. */
function imagePlan({token, draft, card, upload}: PlanInput): SavePlan | null {
  if (!upload?.dataUrl) return null;
  const commit = {token, card: {id: card.id, fullName: card.fullName}, imageBase64: upload.dataUrl, imageExt: extOf(upload.file)};
  return {path: 'image', seed: draft.seed, sent: upload.file, commit};
}

/**
 * The commit Save would make now, or null when it can't. A changed card key
 * (hasEdits, the one edits rule) goes through commitCardEdit; an image alone,
 * on any card, goes through commitCardImage. A staged image whose bytes aren't
 * read yet, or failed their check, holds both back.
 */
export function savePlanOf(input: SaveInput): SavePlan | null {
  const {card} = input;
  const upload = uploadOf(input);
  if (card === null) return null;
  if (upload?.dataUrl === null) return null;
  const plan = {...input, card, upload};
  return hasEdits({changes: input.changes, imageName: null}) ? fieldsPlan(plan) : imagePlan(plan);
}

/**
 * commitFiles' race refusal (githubCommit.ts) speaks of publishing, and Edit
 * saves: say it in Save's words. Every other message reads as it is.
 */
function inSaveWords(error: Error): string {
  const branch = targetBranch();
  const race = `${branch} changed while publishing, so nothing was published. Publish again.`;
  return error.message === race ? `${branch} changed while saving, so nothing was saved. Save again.` : error.message;
}

/**
 * What a failed save asks of the operator:
 * - 'stale': the card's entry changed on the branch, or left the file, since
 *   it was loaded (StaleCardError, R-67). Load it again keeps the edits that
 *   still apply (R-68).
 * - 'rejected-token': GitHub answered 401. Forget token brings the gate back (R-26).
 * - 'other': anything else, the race included. The edits stay, and saving again is the retry.
 */
export function failureOf(error: unknown): {failure: SaveFailure; message: string} {
  if (error instanceof StaleCardError) return {failure: 'stale', message: error.message};
  const message = error instanceof Error ? inSaveWords(error) : 'Save failed';
  return {failure: isRejectedToken(message) ? 'rejected-token' : 'other', message};
}

/** A fields save that landed: the entry it committed, and the form it was made from. */
export interface SavedFields {
  seed: number;
  loaded: LorcanaJSONCard;
  form: RevealCardForm;
}

/**
 * The draft once a fields save lands (R-70). If it is still the draft the save
 * was made from, the committed entry and the saved form become its baseline,
 * so edits typed while the save ran stay as changes. Any other draft (the
 * operator left the card) stays as it is (R-69).
 */
export function savedDraft(draft: Draft, saved: SavedFields): Draft {
  const fields = fieldsOf(draft);
  if (draft.seed !== saved.seed) return draft;
  if (fields === null) return draft;
  return {...draft, edit: {...fields, loaded: saved.loaded, before: saved.form}};
}

/** The draft once the save that sent `sent` lands: the file leaves it, unless another was chosen since. */
export function imageSent(draft: Draft, sent: File): Draft {
  return draft.image === sent ? {...draft, image: null} : draft;
}

/** The form fields the edit has changed. */
function editedFields({before, form}: FieldsEdit): (keyof RevealCardForm)[] {
  return (Object.keys(form) as (keyof RevealCardForm)[]).filter((field) => form[field] !== before[field]);
}

/** `form` with `fields` taken from `edits`. */
function withFields(form: RevealCardForm, edits: RevealCardForm, fields: (keyof RevealCardForm)[]): RevealCardForm {
  return fields.reduce<RevealCardForm>((next, field) => ({...next, [field]: edits[field]}), form);
}

/**
 * A same-card re-seed (its first read, or "Load it again"; R-68): `fresh` is
 * the draft seeded from the read that landed. It keeps the staged image. Each
 * field the old draft changed is kept while the fresh form still holds the
 * value that edit started from; the rest take the fresh values, and `dropped`
 * counts them. A card that no longer opens with fields drops every edit. A
 * draft with no form (before its first read) has nothing to count.
 */
export function keepEdits(draft: Draft, fresh: Draft): Draft {
  const was = fieldsOf(draft);
  const kept = {...fresh, image: draft.image};
  if (was === null) return kept;
  const now = fieldsOf(fresh);
  const edited = editedFields(was);
  const stay = edited.filter((field) => now?.before[field] === was.before[field]);
  const edit = now === null ? fresh.edit : {...now, form: withFields(now.form, was.form, stay)};
  return {...kept, edit, dropped: edited.length - stay.length};
}

/**
 * The draft a seed during render gives (R4-4b's needsSeed): another card starts
 * afresh, and the same card's newer read keeps what still applies (keepEdits).
 */
export function reseeded({draft, ...input}: Omit<SeedInput, 'seed'> & {draft: Draft}): Draft {
  const fresh = seedDraft({...input, seed: draft.seed + 1});
  return draft.cardId === input.cardId ? keepEdits(draft, fresh) : fresh;
}
```

Notes for the implementer:
- **`savePlanOf` reads `hasEdits` with no image** to pick the path: a changed card key is a fields save whether or not an image is staged. The `upload?.dataUrl === null` guard is true only for a staged file whose bytes aren't read or failed their check; with nothing staged, `upload` is null and the guard passes.
- **`keepEdits` compares forms, not entries.** `fresh.edit.before` is `formFromPreviewCard(freshEntry)`, so a field is kept exactly when the fresh entry still builds the value the draft started from (R4-2a's hand-off).
- **`reseeded` changes nothing for another card.** It seeds as R4-4b did. Only the same card's re-seed (its first read, or Load it again) goes through `keepEdits`, and a draft with no form takes the fresh draft as it is, plus its image.

- [ ] **Step 5: Run it to PASS**

Run: `pnpm vitest run --project app src/tools/studio/__tests__/editSave.test.ts`

Expected: PASS, `Tests  25 passed (25)`.

- [ ] **Step 6: Write the hook's failing save test**

Create `src/tools/studio/__tests__/useCardEditor.save.test.ts`. It ports the image tool's two save cases (`useImageAdmin.test.ts:84-98`): "clears the published card and image once the commit lands" becomes "keeps the card open, clears the image" (R-70), and "leaves a card picked while the publish was running" now also checks that the late outcome shows nothing (R-69). R4-4b ports the other three.
```ts
import {afterEach, beforeEach, describe, expect, it, vi, type Mock} from 'vitest';
import {act, renderHook, waitFor, type RenderHookResult} from '@testing-library/react';
import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import type {useCardDataContext} from '../../../app-bridge';
import {isRejectedToken} from '../../../github/rejectedToken';
import {DeferredReader} from '../../../test/DeferredReader';
import {pngFile} from '../../../test/images';
import {StaleCardError} from '../../reveal/githubClient';
import {DUAL_INK_ENTRY, JA_SCAN_ENTRY, PREVIEW_ENTRY, RELEASED_CARD, cardOf} from '../studioFixtures';
import {useCardEditor, type CardEditorController} from '../useCardEditor';

// The shell's card list, loaded. No case here moves it on; R4-4b's cases do, through R3's store.
type CardList = Pick<ReturnType<typeof useCardDataContext>, 'cards' | 'isLoading' | 'error' | 'getCardById' | 'retryLoad'>;
const list = vi.hoisted(() => ({value: null as CardList | null}));
// The rest of the bridge stays real: validateForm.ts and constants.ts read ALL_INKS,
// inkBlock, REVEAL_SET_CODE and REVEAL_ID_BASE from it.
vi.mock('../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useCardDataContext: () => list.value,
}));
// The reads and both commits settle when each case says. StaleCardError stays the real class.
const {commitCardEdit, readPreviewCards} = vi.hoisted(() => ({commitCardEdit: vi.fn(), readPreviewCards: vi.fn()}));
vi.mock('../../reveal/githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../reveal/githubClient')>()),
  commitCardEdit,
  readPreviewCards,
}));
const commitCardImage = vi.hoisted(() => vi.fn());
vi.mock('../../image/githubClient', () => ({commitCardImage}));

const COMMIT = {commitUrl: 'https://github.com/Doberjohn/inkweave/commit/c0ffee'};
const ENTRIES = [PREVIEW_ENTRY, DUAL_INK_ENTRY, JA_SCAN_ENTRY];
const CARDS = [...ENTRIES.map(cardOf), RELEASED_CARD];
const MEI = String(PREVIEW_ENTRY.id);
const PRIYA = String(DUAL_INK_ENTRY.id);
const UNAUTHORIZED = 'GitHub 401 on apps/web/public/data/previewCards.json: {"message":"Bad credentials"}';
const STALE = `Card ${MEI} changed on master since you loaded it. Load it again.`;
const RACE = 'master changed while publishing, so nothing was published. Publish again.';

function loadedList(cards: LorcanaCard[]): CardList {
  const byId = new Map(cards.map((card) => [card.id, card]));
  return {cards, isLoading: false, error: null, getCardById: (id) => byId.get(id), retryLoad: vi.fn()};
}

beforeEach(() => {
  // A block, not an arrow's value: mockReset() returns the mock, which Vitest would call as a teardown.
  for (const mock of [commitCardEdit, commitCardImage, readPreviewCards]) mock.mockReset();
  readPreviewCards.mockResolvedValue(ENTRIES);
  commitCardEdit.mockResolvedValue(COMMIT);
  commitCardImage.mockResolvedValue(COMMIT);
  list.value = loadedList(CARDS);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

type Editor = RenderHookResult<CardEditorController, {cardId: string}>;

/** The editor on `cardId`, once its lookup is ready. */
async function openEditor(cardId: string): Promise<Editor> {
  const editor = renderHook(({cardId: id}) => useCardEditor({token: 'tok', cardId: id}), {initialProps: {cardId}});
  await waitFor(() => expect(editor.result.current.lookup.kind).toBe('ready'));
  return editor;
}

/** Stages `name` as the card's image and waits for its bytes. */
async function stage({result}: Editor, name: string): Promise<void> {
  await act(async () => {
    await result.current.onImageChange(pngFile(name));
  });
}

/** Saves, and waits for the commit to land or fail. */
async function save({result}: Editor): Promise<void> {
  await act(async () => {
    await result.current.save();
  });
}

/** The next call of `mock` settles only when the test says. */
function deferred<T>(mock: Mock) {
  let finish: (value: T) => void = () => {};
  let fail: (error: Error) => void = () => {};
  mock.mockReturnValueOnce(
    new Promise<T>((resolve, reject) => {
      finish = resolve;
      fail = reject;
    }),
  );
  return {finish: (value: T) => act(async () => finish(value)), fail: (error: Error) => act(async () => fail(error))};
}

type Deferred = ReturnType<typeof deferred>;

/** Whether `promise` has settled, once the microtasks queued so far have run. */
async function settled(promise: Promise<boolean>): Promise<boolean> {
  let done = false;
  void promise.then(() => (done = true));
  await act(async () => {});
  return done;
}

/** The keys the change list names, the image last. */
const changed = ({result}: Editor) => result.current.changes.map((row) => row.id);

describe('useCardEditor: the two save paths', () => {
  it('commits field edits through commitCardEdit and keeps the card open on what it saved (R-70)', async () => {
    const editor = await openEditor(MEI);
    act(() => editor.result.current.patchForm({cost: '5'}));
    await save(editor);

    expect(commitCardEdit).toHaveBeenCalledWith({token: 'tok', loaded: PREVIEW_ENTRY, changes: {cost: 5}, image: null});
    expect(commitCardImage).not.toHaveBeenCalled();
    expect(editor.result.current).toMatchObject({
      lookup: {kind: 'ready', card: {id: MEI}},
      form: {cost: '5'},
      result: {...COMMIT, withImage: false},
      changes: [],
      dirty: false,
    });
    // The commit put the entry in the file and asked for a fresh read (R4-4a's commit).
    await waitFor(() => expect(readPreviewCards).toHaveBeenCalledTimes(2));
  });

  it('diffs the next save from what the last one committed', async () => {
    const editor = await openEditor(MEI);
    act(() => editor.result.current.patchForm({cost: '5'}));
    await save(editor);
    act(() => editor.result.current.patchForm({lore: '3'}));
    await save(editor);

    expect(commitCardEdit).toHaveBeenLastCalledWith({token: 'tok', loaded: {...PREVIEW_ENTRY, cost: 5}, changes: {lore: 3}, image: null});
  });

  it('keeps an edit typed while the save ran as a change', async () => {
    const editor = await openEditor(MEI);
    const commit = deferred(commitCardEdit);
    act(() => editor.result.current.patchForm({cost: '5'}));
    act(() => void editor.result.current.save());
    act(() => editor.result.current.patchForm({lore: '3'}));
    await commit.finish(COMMIT);

    expect(changed(editor)).toEqual(['lore']);
    expect(editor.result.current.dirty).toBe(true);
  });

  it('sends field edits and a staged image in one commitCardEdit, then clears the image', async () => {
    const editor = await openEditor(MEI);
    act(() => editor.result.current.patchForm({name: 'Mei Lee'}));
    await stage(editor, 'mei.png');
    const dataUrl = editor.result.current.imageDataUrl;
    await save(editor);

    expect(commitCardEdit).toHaveBeenCalledWith(expect.objectContaining({image: {dataUrl, ext: 'png'}}));
    expect(commitCardImage).not.toHaveBeenCalled();
    expect(editor.result.current).toMatchObject({result: {withImage: true}, imageName: null, changes: []});
  });

  // The image tool's "clears the published card and image once the commit lands", for
  // the studio: the card is URL state, so it stays open (R-70).
  it.each([
    {name: 'a preview card with no field edits', cardId: MEI, fullName: 'Mei - Red Panda'},
    {name: 'a released card (R-61)', cardId: RELEASED_CARD.id, fullName: RELEASED_CARD.fullName},
  ])('saves an image alone on $name through commitCardImage, and keeps the card open', async ({cardId, fullName}) => {
    const editor = await openEditor(cardId);
    await stage(editor, 'scan.png');
    const imageBase64 = editor.result.current.imageDataUrl;
    await save(editor);

    expect(commitCardImage).toHaveBeenCalledWith({token: 'tok', card: {id: cardId, fullName}, imageBase64, imageExt: 'png'});
    expect(commitCardEdit).not.toHaveBeenCalled();
    expect(editor.result.current).toMatchObject({lookup: {kind: 'ready', card: {id: cardId}}, result: {withImage: true}, imageName: null});
  });

  it('refreshes a card to its English scan, renamed, in one edit (admin#14 item 3)', async () => {
    const editor = await openEditor(String(JA_SCAN_ENTRY.id));
    act(() => editor.result.current.patchForm({scanLanguage: 'en', name: 'Mira', version: 'Lead Singer'}));
    await stage(editor, 'miriam-en.png');
    await save(editor);

    expect(commitCardEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        loaded: JA_SCAN_ENTRY,
        changes: {name: 'Mira', fullName: 'Mira - Lead Singer', version: 'Lead Singer', scanLanguage: null},
        image: expect.objectContaining({ext: 'png'}),
      }),
    );
  });
});

describe('useCardEditor: when Save is on', () => {
  it('holds Save back until a change validates, and while a save runs', async () => {
    const editor = await openEditor(MEI);
    expect(editor.result.current.canSave).toBe(false);
    act(() => editor.result.current.patchForm({cost: ''}));
    expect(editor.result.current.canSave).toBe(false);
    act(() => editor.result.current.patchForm({cost: '5'}));
    expect(editor.result.current.canSave).toBe(true);

    const commit = deferred(commitCardEdit);
    act(() => void editor.result.current.save());
    expect(editor.result.current).toMatchObject({saving: true, canSave: false});
    await commit.finish(COMMIT);
    expect(editor.result.current.saving).toBe(false);
  });

  it("holds a field edit back until its staged image's bytes are read", async () => {
    DeferredReader.reset();
    vi.stubGlobal('FileReader', DeferredReader);
    const editor = await openEditor(MEI);
    act(() => editor.result.current.patchForm({cost: '5'}));
    act(() => void editor.result.current.onImageChange(pngFile('mei.png')));
    expect(editor.result.current.canSave).toBe(false);
    await DeferredReader.finish(0);
    expect(editor.result.current.canSave).toBe(true);
  });
});

describe('useCardEditor: an outcome belongs to its draft (R-69)', () => {
  // The image tool's "leaves a card picked while the publish was running", with R-69:
  // the late outcome no longer shows on the next card.
  it.each([
    {outcome: 'lands', settle: (commit: Deferred) => commit.finish(COMMIT)},
    {outcome: 'is refused', settle: (commit: Deferred) => commit.fail(new StaleCardError(STALE))},
  ])("shows nothing on the next card when the last card's save $outcome, and keeps the next card's draft", async ({settle}) => {
    const editor = await openEditor(MEI);
    const commit = deferred(commitCardEdit);
    act(() => editor.result.current.patchForm({cost: '5'}));
    await stage(editor, 'mei.png');
    act(() => void editor.result.current.save());
    editor.rerender({cardId: PRIYA});
    // Mei's scan is never Priya's.
    expect(editor.result.current.imageName).toBeNull();
    act(() => editor.result.current.patchForm({name: 'Priya Lee'}));
    await stage(editor, 'priya.png');
    await settle(commit);

    expect(editor.result.current).toMatchObject({
      lookup: {card: {id: PRIYA}},
      result: null,
      saveError: null,
      failure: null,
      form: {name: 'Priya Lee'},
      imageName: 'priya.png',
      canSave: true,
    });
  });

  it('reopens a card whose save landed after it was left from what it committed, before the re-read lands, with no outcome', async () => {
    readPreviewCards.mockReset();
    readPreviewCards.mockResolvedValueOnce(ENTRIES).mockReturnValue(new Promise(() => {}));
    const editor = await openEditor(MEI);
    const commit = deferred(commitCardEdit);
    act(() => editor.result.current.patchForm({cost: '5'}));
    act(() => void editor.result.current.save());
    editor.rerender({cardId: PRIYA});
    await commit.finish(COMMIT);
    editor.rerender({cardId: MEI});

    expect(editor.result.current).toMatchObject({form: {cost: '5'}, changes: [], result: null});
    act(() => editor.result.current.patchForm({lore: '3'}));
    await save(editor);
    expect(commitCardEdit).toHaveBeenLastCalledWith(expect.objectContaining({loaded: {...PREVIEW_ENTRY, cost: 5}, changes: {lore: 3}}));
  });
});

describe('useCardEditor: failures and reading again', () => {
  it.each([
    {failure: 'stale', error: new StaleCardError(STALE), saveError: STALE},
    {failure: 'rejected-token', error: new Error(UNAUTHORIZED), saveError: UNAUTHORIZED},
    {failure: 'other', error: new Error(RACE), saveError: 'master changed while saving, so nothing was saved. Save again.'},
  ])('reads the failure as $failure, and keeps the edits to save again', async ({failure, error, saveError}) => {
    commitCardEdit.mockRejectedValueOnce(error);
    const editor = await openEditor(MEI);
    act(() => editor.result.current.patchForm({cost: '5'}));
    await save(editor);

    expect(editor.result.current).toMatchObject({failure, saveError, result: null, form: {cost: '5'}, dirty: true, canSave: true});
  });

  it('clears the last failure as the next save starts', async () => {
    commitCardEdit.mockRejectedValueOnce(new Error(RACE));
    const editor = await openEditor(MEI);
    act(() => editor.result.current.patchForm({cost: '5'}));
    await save(editor);
    const commit = deferred(commitCardEdit);
    act(() => void editor.result.current.save());

    expect(editor.result.current).toMatchObject({saving: true, failure: null, saveError: null});
    await commit.finish(COMMIT);
    expect(editor.result.current.result).toEqual({...COMMIT, withImage: false});
  });

  it('waits on a 401 read with its message, and retry resolves once the re-read lands', async () => {
    readPreviewCards.mockReset();
    readPreviewCards.mockRejectedValueOnce(new Error(UNAUTHORIZED));
    const editor = renderHook(() => useCardEditor({token: 'tok', cardId: MEI}));
    await waitFor(() => expect(editor.result.current.lookup).toEqual({kind: 'fileFailed', error: UNAUTHORIZED}));
    // R4-6b offers Forget token on it (R-26).
    expect(isRejectedToken(UNAUTHORIZED)).toBe(true);
    expect(editor.result.current.canSave).toBe(false);

    const read = deferred<LorcanaJSONCard[]>(readPreviewCards);
    let retried: Promise<boolean> = Promise.resolve(false);
    act(() => {
      retried = editor.result.current.retry();
    });
    expect(await settled(retried)).toBe(false);
    await read.finish(ENTRIES);
    await expect(retried).resolves.toBe(true);
    expect(editor.result.current.lookup).toMatchObject({kind: 'ready', card: {id: MEI}});
  });

  /** Mei with her name and cost edited and a scan staged, and a save refused as stale. */
  async function refused(): Promise<Editor> {
    commitCardEdit.mockRejectedValueOnce(new StaleCardError(STALE));
    const editor = await openEditor(MEI);
    act(() => editor.result.current.patchForm({name: 'Mei Lee', cost: '5'}));
    await stage(editor, 'mei.png');
    await save(editor);
    return editor;
  }

  /** Load it again, with its read settling only when the test says. */
  function loadAgain(editor: Editor) {
    const read = deferred<LorcanaJSONCard[]>(readPreviewCards);
    let loaded: Promise<boolean> = Promise.resolve(false);
    act(() => {
      loaded = editor.result.current.loadAgain();
    });
    return {read, loaded};
  }

  it('Load it again keeps the edits that still apply and the image, counts the dropped, and clears the refusal once its read lands (R-68)', async () => {
    const editor = await refused();
    const {read, loaded} = loadAgain(editor);
    // Nothing moves until the read lands.
    expect(await settled(loaded)).toBe(false);
    expect(editor.result.current).toMatchObject({failure: 'stale', form: {cost: '5'}, dropped: null});

    // Someone changed Mei's cost on the branch; her name is as it was.
    const fresh = {...PREVIEW_ENTRY, cost: 6};
    await read.finish([fresh, DUAL_INK_ENTRY, JA_SCAN_ENTRY]);
    await expect(loaded).resolves.toBe(true);
    expect(editor.result.current).toMatchObject({failure: null, saveError: null, dropped: 1, form: {name: 'Mei Lee', cost: '6'}, imageName: 'mei.png'});
    expect(changed(editor)).toEqual(expect.arrayContaining(['name', 'image']));
    expect(changed(editor)).not.toContain('cost');

    await save(editor);
    expect(commitCardEdit).toHaveBeenLastCalledWith(
      expect.objectContaining({loaded: fresh, changes: {name: 'Mei Lee', fullName: 'Mei Lee - Red Panda'}}),
    );
    expect(editor.result.current.dropped).toBeNull();
  });

  it("Load it again after a landed save waits for its own read, not the save's", async () => {
    const committed = {...PREVIEW_ENTRY, cost: 5};
    readPreviewCards.mockReset();
    readPreviewCards.mockResolvedValueOnce(ENTRIES).mockResolvedValueOnce([committed, DUAL_INK_ENTRY, JA_SCAN_ENTRY]);
    const editor = await openEditor(MEI);
    act(() => editor.result.current.patchForm({cost: '5'}));
    await save(editor);
    // The save's own read of the file lands.
    await waitFor(() => expect(readPreviewCards).toHaveBeenCalledTimes(2));
    await act(async () => {});
    commitCardEdit.mockRejectedValueOnce(new StaleCardError(STALE));
    act(() => editor.result.current.patchForm({lore: '3'}));
    await save(editor);

    const {read, loaded} = loadAgain(editor);
    expect(await settled(loaded)).toBe(false);
    expect(editor.result.current.failure).toBe('stale');
    // Someone renamed Mei on the branch; her lore is as it was.
    await read.finish([{...committed, name: 'Mei Lee', fullName: 'Mei Lee - Red Panda'}, DUAL_INK_ENTRY, JA_SCAN_ENTRY]);
    await expect(loaded).resolves.toBe(true);
    expect(editor.result.current).toMatchObject({failure: null, dropped: 0, form: {name: 'Mei Lee', cost: '5', lore: '3'}});
  });

  it('Load it again resolves false, and keeps the refusal and the edits, when its read fails', async () => {
    const editor = await refused();
    const {read, loaded} = loadAgain(editor);
    await read.fail(new Error('GitHub 502 on apps/web/public/data/previewCards.json: Bad gateway'));

    await expect(loaded).resolves.toBe(false);
    expect(editor.result.current).toMatchObject({failure: 'stale', saveError: STALE, form: {name: 'Mei Lee', cost: '5'}, dropped: null});
  });
});
```

- [ ] **Step 7: Run it, and see it fail**

Run: `pnpm vitest run --project app src/tools/studio/__tests__/useCardEditor.save.test.ts`

Expected: FAIL, `Tests  20 failed (20)`. The file loads, since it imports only R4-4b's hook, so each case fails on the missing save side: `TypeError: result.current.save is not a function` (or `editor.result.current.save`), and `AssertionError: expected undefined to be false // Object.is equality` in the three cases that read `canSave` first (the two "when Save is on" cases and the 401 read).

- [ ] **Step 8: Write `useEditSave.ts`**

Create `src/tools/studio/useEditSave.ts`:
```ts
import {useState, type Dispatch, type SetStateAction} from 'react';
import type {CommitResult} from '../../github/githubCommit';
import {commitCardImage} from '../image/githubClient';
import {commitCardEdit} from '../reveal/githubClient';
import {mergeCardChanges} from '../reveal/replaceCardInPreviewJson';
import type {Draft} from './editorState';
import {
  failureOf,
  imageSent,
  savePlanOf,
  savedDraft,
  type EditResult,
  type SaveFailure,
  type SaveInput,
  type SavePlan,
} from './editSave';
import type {UsePreviewCardsFileResult} from './usePreviewCardsFile';

/** What the outcome shows: the last save's commit, or its failure and its kind. */
interface OutcomeFields {
  result: EditResult | null;
  saveError: string | null;
  failure: SaveFailure | null;
}

/** The last save's outcome, tied to the draft it was made from (R-69). */
interface Outcome extends OutcomeFields {
  seed: number;
}

const NO_OUTCOME: OutcomeFields = {result: null, saveError: null, failure: null};

/** What the save side takes from the editor: a save's inputs, and the handles a landed save moves. */
export interface EditSaveInput extends SaveInput {
  setDraft: Dispatch<SetStateAction<Draft>>;
  /** useImageUpload's clearIf: drops the upload if it still holds the file a save sent. */
  clearIf: (file: File) => boolean;
  file: Pick<UsePreviewCardsFileResult, 'requested' | 'reload' | 'commit'>;
}

/** Edit card's save side, as the controller spreads it. */
export interface EditSave extends OutcomeFields {
  /** Nothing is saving, and savePlanOf has a commit to make. */
  canSave: boolean;
  saving: boolean;
  /** Settles once the commit lands or fails; the outcome says which. */
  save: () => Promise<void>;
  /** After a 'stale' failure: read the file again. Resolves true once that read lands and re-seeds the draft (R-68). */
  loadAgain: () => Promise<boolean>;
  /** How many edits the last Load it again dropped (R-68); null until one lands on this card, and again once a save starts. */
  dropped: number | null;
}

/** The commit the plan makes. */
function commitOf(plan: SavePlan): Promise<CommitResult> {
  return plan.path === 'fields' ? commitCardEdit(plan.commit) : commitCardImage(plan.commit);
}

/**
 * What a landed save does besides its outcome. A fields save puts the entry it
 * committed in the file at once, which also reads the file again (R4-4a's
 * commit), and makes it the baseline of the draft it was made from (R-70). The
 * file it sent leaves the upload and the draft, unless another was chosen
 * since (clearIf, imageSent).
 */
function land(plan: SavePlan, {setDraft, clearIf, file}: Pick<EditSaveInput, 'setDraft' | 'clearIf' | 'file'>): void {
  const {sent} = plan;
  if (plan.path === 'fields') {
    const entry = mergeCardChanges(plan.commit.loaded, plan.commit.changes);
    file.commit(entry);
    setDraft((draft) => savedDraft(draft, {seed: plan.seed, loaded: entry, form: plan.form}));
  }
  if (sent) {
    clearIf(sent);
    setDraft((draft) => imageSent(draft, sent));
  }
}

/** The outcome the draft on screen shows: its own save's, never one made from an earlier draft (R-69). */
function outcomeFor({outcome, draft}: {outcome: Outcome | null; draft: Draft}): OutcomeFields {
  if (outcome?.seed !== draft.seed) return NO_OUTCOME;
  const {result, saveError, failure} = outcome;
  return {result, saveError, failure};
}

/** The draft without its "Load it again" count, once a save starts. */
function withoutDropped(draft: Draft): Draft {
  return {...draft, dropped: undefined};
}

/**
 * Edit card's save side (R4-4c). Save runs the commit savePlanOf picks. Its
 * outcome belongs to the draft it was made from: a new card, or a read the
 * draft follows, re-seeds the draft, and the outcome then shows nothing, so a
 * save that lands after the operator left the card shows nothing (R-69). A
 * landed save keeps the card open on its new baseline (R-70). `saving` spans
 * cards, so no save starts while one runs.
 */
export function useEditSave(input: EditSaveInput): EditSave {
  const {draft, setDraft, file} = input;
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const plan = saving ? null : savePlanOf(input);

  async function save(): Promise<void> {
    if (!plan) return;
    setSaving(true);
    setOutcome(null);
    setDraft(withoutDropped);
    try {
      const {commitUrl} = await commitOf(plan);
      setOutcome({...NO_OUTCOME, seed: plan.seed, result: {commitUrl, withImage: plan.sent !== null}});
      land(plan, input);
    } catch (e) {
      const {failure, message} = failureOf(e);
      setOutcome({...NO_OUTCOME, seed: plan.seed, saveError: message, failure});
    } finally {
      setSaving(false);
    }
  }

  // The draft follows the next read to land (R4-4b's needsSeed), keeping what still applies (keepEdits).
  function loadAgain(): Promise<boolean> {
    setDraft((current) => ({...current, follow: true, read: file.requested}));
    return file.reload().then((cards) => cards !== null);
  }

  return {canSave: plan !== null, saving, save, loadAgain, dropped: draft.dropped ?? null, ...outcomeFor({outcome, draft})};
}
```

Notes for the implementer:
- **No ref.** The outcome's seed does what the image tool's `shownCardId` ref did (`useImageAdmin.ts:63`), as state: nothing writes or reads a ref during render, and nothing clears the outcome on a card change.
- **`land(plan, input)` uses the render's handles.** `setDraft`, `clearIf` and R4-4a's `commit` all act through functional updates or refs of their own, so a save that lands after more renders still acts on the latest state.
- **`file.commit` runs whatever the seed.** Reopening the card before the re-read lands must seed from the committed entry, or the next save is refused as stale. Only the draft's baseline (`savedDraft`) and the outcome are seed-scoped.

- [ ] **Step 9: Wire the save side into R4-4b's draft**

In `src/tools/studio/editorState.ts`, end `Draft` with the count, after its `image` field:
```ts
  image: File | null;
  /** How many edits the last "Load it again" dropped (R-68, R4-4c); unset until one lands on this draft. */
  dropped?: number;
}
```

In `src/tools/studio/useCardEditor.ts` (R4-4b's Step 9 file), make seven edits:

1. **Imports.** After `import type {CardTag} from './editSearch';` add the first line below. Leave `import type {PreviewCardsFile} from './previewCardsFile';` as it is. Change the line after it, `import {usePreviewCardsFile} from './usePreviewCardsFile';`, to the first line of the second block, and add the save hook's import after it:
   ```ts
   import {reseeded} from './editSave';
   ```
   ```ts
   import {usePreviewCardsFile, type UsePreviewCardsFileResult} from './usePreviewCardsFile';
   import {useEditSave, type EditSave} from './useEditSave';
   ```
   Keep `seedDraft` in the `editorState` import: `useEditDraft`'s first draft still uses it. Keep `previewFileView` there too: `retryReads` (edit 3) now reads it as well.
2. **The controller.** It takes the save side, and `retry` returns its read's promise:
   ```ts
   export interface CardEditorController extends EditSave {
   ```
   ```ts
     retry: () => Promise<boolean>;
   ```
3. **`retryReads`**, after the interface's closing brace:
   ```ts
   /** What Retry reads again: the shell's card list, and previewCards.json. */
   interface RetryInput {
     list: Pick<ReturnType<typeof useCardDataContext>, 'error' | 'retryLoad'>;
     file: UsePreviewCardsFileResult;
   }

   /**
    * Reads again what failed: the card list (its retryLoad) and previewCards.json.
    * Resolves true once the file's re-read lands, false when the read fails, or
    * when the search shows no file error (a failed first read, or a later read's
    * reloadError). The card list's retry can't be awaited (retryLoad returns
    * nothing), so the page watches its error clear, as R3-7 does (R-59).
    */
   function retryReads({list, file}: RetryInput): Promise<boolean> {
     if (list.error) list.retryLoad();
     if (previewFileView(file).error === null) return Promise.resolve(false);
     return file.reload().then((cards) => cards !== null);
   }
   ```
   The condition is the search's own: `previewFileView(file).error` (R4-4b) is the first read's error while no read has landed, and R4-4a's `reloadError` once a later read failed (the read after a save, R-66's read after a publish, a failed Load it again). `file.status === 'error'` would hold only in the first case, and the search's "Read previewCards.json again" would then read nothing after a later failure (R4-6b's verifier).
4. **The seed line** in `useEditDraft`. Replace
   ```ts
     if (needsSeed({...input, draft})) setDraft(seedDraft({...input, seed: draft.seed + 1}));
   ```
   with
   ```ts
     if (needsSeed({...input, draft})) setDraft(reseeded({...input, draft}));
   ```
5. **`useDraftImage`'s returned object** gains one entry, after `discard() {…},`:
   ```ts
       clearIf: upload.clearIf,
   ```
6. **In `useCardEditor`,** replace R4-4b's `function retry() {…}` (its two `if`s) with the save side:
   ```ts
     const save = useEditSave({
       token,
       draft,
       setDraft,
       card: openCard(lookup),
       changes,
       validation,
       staged,
       clearIf: image.clearIf,
       file,
     });
   ```
7. **The returned object.** `retry,` becomes `retry: () => retryReads({list, file}),`, and `...save,` goes last, after `revertImage: image.revertImage,`.

The whole change, as `diff -u` against R4-4b's file as its Step 9 writes it:
```diff
--- a/src/tools/studio/useCardEditor.ts
+++ b/src/tools/studio/useCardEditor.ts
@@ -8,6 +8,7 @@
 import {hasEdits, type ImageOnlyReason} from './cardEdit';
 import {changeRows, type ChangeRow} from './changeRows';
 import type {CardTag} from './editSearch';
+import {reseeded} from './editSave';
 import {
   discardDraft,
   draftChanges,
@@ -29,7 +30,8 @@
   type PreviewFileView,
 } from './editorState';
 import type {PreviewCardsFile} from './previewCardsFile';
-import {usePreviewCardsFile} from './usePreviewCardsFile';
+import {usePreviewCardsFile, type UsePreviewCardsFileResult} from './usePreviewCardsFile';
+import {useEditSave, type EditSave} from './useEditSave';
 
 export interface CardEditorInput {
   /** The saved GitHub token: the studio renders the editor only under the token gate. */
@@ -38,11 +40,11 @@
   cardId: string | null;
 }
 
-export interface CardEditorController {
+export interface CardEditorController extends EditSave {
   /** The open card, in cardPageState's order (editorState.ts). */
   lookup: EditLookup;
   /** Reads again what failed: the card list (its retryLoad), previewCards.json, or both. */
-  retry: () => void;
+  retry: () => Promise<boolean>;
   /** previewCards.json for the search, whatever card is open (R-71); `reload` reads it again. */
   previewFile: PreviewFileView & {reload: () => void};
   /** The open card's tag, as the search tags it (cardTag); null until it is ready. */
@@ -71,6 +73,25 @@
   revertImage: () => void;
 }
 
+/** What Retry reads again: the shell's card list, and previewCards.json. */
+interface RetryInput {
+  list: Pick<ReturnType<typeof useCardDataContext>, 'error' | 'retryLoad'>;
+  file: UsePreviewCardsFileResult;
+}
+
+/**
+ * Reads again what failed: the card list (its retryLoad) and previewCards.json.
+ * Resolves true once the file's re-read lands, false when the read fails, or
+ * when the search shows no file error (a failed first read, or a later read's
+ * reloadError). The card list's retry can't be awaited (retryLoad returns
+ * nothing), so the page watches its error clear, as R3-7 does (R-59).
+ */
+function retryReads({list, file}: RetryInput): Promise<boolean> {
+  if (list.error) list.retryLoad();
+  if (previewFileView(file).error === null) return Promise.resolve(false);
+  return file.reload().then((cards) => cards !== null);
+}
+
 /**
  * The draft for the card on screen. Another card, or the first read its card
  * waits for, seeds a new one during render (no effect, no ref), as
@@ -79,7 +100,7 @@
  */
 function useEditDraft(input: {cardId: string | null; lookup: EditLookup; file: PreviewCardsFile}) {
   const [draft, setDraft] = useState<Draft>(() => seedDraft({...input, seed: 0}));
-  if (needsSeed({...input, draft})) setDraft(seedDraft({...input, seed: draft.seed + 1}));
+  if (needsSeed({...input, draft})) setDraft(reseeded({...input, draft}));
   return [draft, setDraft] as const;
 }
 
@@ -101,6 +122,7 @@
       setDraft(discardDraft);
       void upload.choose(null);
     },
+    clearIf: upload.clearIf,
   };
 }
 
@@ -123,14 +145,21 @@
   const validation = draftValidation({draft, imageName: staged.name});
   const previewCard = editPreview({card: openCard(lookup), draft, dataUrl: staged.dataUrl});
 
-  function retry() {
-    if (list.error) list.retryLoad();
-    if (file.status === 'error') void file.reload();
-  }
+  const save = useEditSave({
+    token,
+    draft,
+    setDraft,
+    card: openCard(lookup),
+    changes,
+    validation,
+    staged,
+    clearIf: image.clearIf,
+    file,
+  });
 
   return {
     lookup,
-    retry,
+    retry: () => retryReads({list, file}),
     previewFile: {...previewFileView(file), reload: () => void file.reload()},
     tag: openTag(lookup),
     form: view.form,
@@ -147,5 +176,6 @@
     imageError: imageErrorOf(staged, validation),
     onImageChange: image.onImageChange,
     revertImage: image.revertImage,
+    ...save,
   };
 }
```

Notes for the implementer:
- **The seed line** is R4-4b's one render-time `setDraft`. It keeps its guard (`needsSeed`) and changes only what it seeds, so R4-4b's rules (no effect, no ref; a new card never shows the last one's form or image) hold as they were.
- **`seedDraft` stays imported** for the first draft (`useState`'s initializer).
- **`retryReads` is a module function,** so the hook body gains no branch. Its condition reads `previewFileView(file).error`, not `file.status`: Step 11's new case pins that.

- [ ] **Step 10: Run the save test to PASS**

Run: `pnpm vitest run --project app src/tools/studio/__tests__/useCardEditor.save.test.ts`

Expected: PASS, `Tests  20 passed (20)`, with no `act(...)` warning on stderr. A case that hangs for 5 s, after which later cases see `result.current` as `null`, has awaited a read inside the act that asked for it.

- [ ] **Step 11: Point R4-4b's retry cases at the promise, and pin Retry after a later failed read**

In `src/tools/studio/__tests__/useCardEditor.test.ts`, the two Retry cases call `retry()` inside an act. The first awaits it there, which now never settles, because the read starts in an effect that runs only once the act ends (R4-4a's note): the case times out after 5 s, and every later case sees `result.current` as `null`. The second would hand a synchronous act a promise it doesn't await. Both now start the retry in a block-bodied act. The first waits for the card. The second keeps the promise and pins that it resolves `false`: only the card list failed, and its `retryLoad` can't be awaited, so a page that asked for a handoff on `true` would ask before the list is back (no case in the save test covers this).

A third case follows them: a ready file whose later read failed (R4-4a's `reloadError`, which `previewFile.error` shows), where `retry()` reads the file again and resolves `true` once that read lands. It pins Step 9's condition: with `file.status !== 'error'` in `retryReads`, it alone fails, with `AssertionError: expected false to be true`, because Retry read nothing. Its read waits on `deferRead()`, and the promise is awaited after the act that started it, as in the other cases:
```diff
--- a/src/tools/studio/__tests__/useCardEditor.test.ts
+++ b/src/tools/studio/__tests__/useCardEditor.test.ts
@@ -1,5 +1,5 @@
 import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
-import {act, renderHook} from '@testing-library/react';
+import {act, renderHook, waitFor} from '@testing-library/react';
 import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
 import type {useCardDataContext} from '../../../app-bridge';
 import {DeferredReader} from '../../../test/DeferredReader';
@@ -146,8 +146,10 @@
     await first.fail('GitHub 500 on previewCards.json');
     expect(result.current.lookup).toEqual({kind: 'fileFailed', error: 'GitHub 500 on previewCards.json'});
 
-    await act(async () => result.current.retry());
-    expect(result.current.form?.name).toBe('Mei');
+    act(() => {
+      void result.current.retry();
+    });
+    await waitFor(() => expect(result.current.form?.name).toBe('Mei'));
     expect({reads: readPreviewCards.mock.calls.length, listRetries: cardList.retryLoad.mock.calls.length}).toEqual({
       reads: 2,
       listRetries: 0,
@@ -159,13 +161,41 @@
     const {result} = await renderEditor({cardId: null});
     expect(result.current.lookup).toMatchObject({kind: 'listFailed'});
 
-    act(() => result.current.retry());
+    let retried: Promise<boolean> = Promise.resolve(true);
+    act(() => {
+      retried = result.current.retry();
+    });
+    // The card list's retry can't be awaited, and the file hadn't failed (R-59: the page watches the list's error).
+    await expect(retried).resolves.toBe(false);
     expect({reads: readPreviewCards.mock.calls.length, listRetries: cardList.retryLoad.mock.calls.length}).toEqual({
       reads: 1,
       listRetries: 1,
     });
   });
 
+  it('Retry reads previewCards.json again after a later read failed, and resolves once it lands', async () => {
+    const {result} = await renderEditor({cardId: idOf(MEI)});
+    const second = deferRead();
+    act(() => result.current.previewFile.reload());
+    await second.fail('GitHub 502 on previewCards.json');
+    // The search shows the failed read beside the cards it keeps (R4-4a's reloadError), and the card stays open.
+    expect(result.current.previewFile).toMatchObject({status: 'ready', error: 'GitHub 502 on previewCards.json'});
+    expect(result.current.form?.name).toBe('Mei');
+
+    const third = deferRead();
+    let retried: Promise<boolean> = Promise.resolve(false);
+    act(() => {
+      retried = result.current.retry();
+    });
+    await third.land();
+    await expect(retried).resolves.toBe(true);
+    expect({
+      error: result.current.previewFile.error,
+      reads: readPreviewCards.mock.calls.length,
+      listRetries: cardList.retryLoad.mock.calls.length,
+    }).toEqual({error: null, reads: 3, listRetries: 0});
+  });
+
   it('waits for the card list, then opens the card, or says the id is missing', async () => {
     setCardList({cards: [], isLoading: true});
     const {result, open} = await renderEditor({cardId: null});
```

- [ ] **Step 12: Run the studio's controller tests**

Run: `pnpm vitest run --project app src/tools/studio/__tests__/editSave.test.ts src/tools/studio/__tests__/useCardEditor.save.test.ts src/tools/studio/__tests__/useCardEditor.test.ts src/tools/studio/__tests__/editorState.test.ts`

Expected: `Test Files  4 passed (4)` and `Tests  108 passed (108)`: 25, 20, R4-4b's 19 (its 18, which pass as they did before this task, and Step 11's new case) and its 44.

- [ ] **Step 13: Lint and typecheck**

Run: `pnpm exec eslint --max-warnings 0 src/tools/studio/editSave.ts src/tools/studio/useEditSave.ts src/tools/studio/editorState.ts src/tools/studio/useCardEditor.ts src/tools/studio/__tests__/editSave.test.ts src/tools/studio/__tests__/useCardEditor.save.test.ts src/tools/studio/__tests__/useCardEditor.test.ts`
Expected: no output, exit 0. `react-hooks/refs` and `react-hooks/set-state-in-effect` are clean: there is no ref, and the only render-time `setDraft` is R4-4b's guarded seed.

Run: `pnpm typecheck`
Expected: exit 0. It builds the engine, then runs `tsc -b`, which checks the test files too.

Don't run `pnpm lint` or `pnpm test:run` here: the pre-commit hook runs both. No reveal-sync run: no contract file or bridge line changed.

- [ ] **Step 14: Code Health**

Run CodeScene's `code_health_review` on, by absolute path:
- `src/tools/studio/editSave.ts`
- `src/tools/studio/useEditSave.ts`
- `src/tools/studio/editorState.ts` (it gains one optional field, so it keeps R4-4b's score)
- `src/tools/studio/useCardEditor.ts`
- `src/tools/studio/__tests__/editSave.test.ts`
- `src/tools/studio/__tests__/useCardEditor.save.test.ts`
- `src/tools/studio/__tests__/useCardEditor.test.ts`

Expected: 10.0 each, with no findings (MCP 1.5.7 gave that in the sandbox). `useCardEditor.ts` must score what R4-4b left it at: this task adds a module function and no branch to the hook.

The PR gate is stricter than the local tool, so confirm the hand count in the re-base notes against the files as written: 0 primitive parameters in `editSave.ts` (19 parameters), `useEditSave.ts` (6) and `useCardEditor.ts` (6), and 2 in 9 in the hook test (22%). A helper a review adds takes the draft, the plan or another object, never a bare string or number. R4-8 runs `analyze_change_set` before the push.

- [ ] **Step 15: Commit, after the owner approves**

Use the Bash tool. Stage with explicit paths, as its own call:
```bash
git add src/tools/studio/editSave.ts src/tools/studio/useEditSave.ts src/tools/studio/editorState.ts src/tools/studio/useCardEditor.ts src/tools/studio/__tests__/editSave.test.ts src/tools/studio/__tests__/useCardEditor.save.test.ts src/tools/studio/__tests__/useCardEditor.test.ts
```
Then run CodeScene's `pre_commit_code_health_safeguard`, and go on only when it passes. Then commit, as a separate, unpiped call:
```bash
USER_APPROVED=1 git commit -m "feat(studio): save Edit card's fields and image (#24)"
```
Husky's pre-commit runs `pnpm lint` and `pnpm test:run`. If Vitest fails to start its workers under load, stop this session's preview servers, wait out other sessions' runs, and retry. Never use `--no-verify`.

### Hand-offs from R4-4c

- **R4-4d (branch-only cards, R-66).** A branch-only card saves like any preview card: its lookup's `card` comes from `transformRawCards`, and `savePlanOf` needs only its `id` and `fullName`. A `gone` card (a reveal-band id the file no longer holds) gets no save only if `SaveInput.card` is null, which `openCard` gives for any lookup that isn't `ready`. An image-only draft alone isn't enough: with a staged image, `savePlanOf` would still plan a `commitCardImage` to `card-images-raw/{id}` for an id the app no longer has. If a stale refusal reads "Card {id} is no longer in previewCards.json", Load it again's read lands with the card `gone`: `needsSeed` waits for a `ready` lookup, so the draft doesn't re-seed, its outcome stays, and `loadAgain` still resolves `true` (the read landed). The page shows R4-4d's gone note in place of the editor.
- **R4-5e (`CommitOutcome`).** It gets `result` (`EditResult` fits `{commitUrl}`; `withImage` is the page's), `error: saveError`, `dropped`, `onLoadAgain` only when `failure === 'stale'`, and `onForgetToken`, which it offers when `isRejectedToken(error)` (`failure === 'rejected-token'` holds exactly then). The race already reads as a save, so it shows the message as it is. Its `loadAgainNote({dropped})` words what `dropped` counts, which is null until a Load it again lands. `dropped` and the save wording live in `useEditSave.ts` and `editSave.ts`, spread into the controller, so R4-5e's Step 1 grep of `useCardEditor.ts` for `dropped` prints nothing: grep `useEditSave.ts`.
- **R4-6b (the Edit pane).**
  - **Discard while a save runs:** hold it, as Save is held (`saving`). Discard puts back the pre-save form, and once the save lands that form diffs against the new baseline (R-70), so it reads as a change that undoes the save (cost `5 → 4`). Typing during a save is fine: it stays a change, as the tests pin.
  - **The note:** `result.withImage` picks the image tool's go-live note (`ImagePage.tsx:20`) or New reveal's.
  - **The guard (R-58):** `dirty` holds it; `saving` switches its message to `writeInFlightMessage({action: 'save'})`.
  - **Focus (R-59):** `save()` settles once the outcome is set, so `void edit.save().then(() => handoff.request())` lets the outcome line take focus when the Save button's state left it on `<body>`. `loadAgain()` resolves `true` once the re-seeded draft is on screen; ask for the handoff then, or from the refusal clearing, never on the click. The card list's Retry is watched from state (its error clearing), since `retry()` can't wait for it.
  - **Retry reads the file after any failed read:** `retryReads` reads it whenever `previewFile.error` is set, the first read's error or a later read's `reloadError`, so the search's "Read previewCards.json again" can be `edit.retry`, and its promise answers for both. R4-6b's Step 10 edit is already here: its Step 1 grep finds no `file.status !== 'error'` line, so it skips the edit and only runs its tests.
  - **Forget token (R-84):** offered on `failure === 'rejected-token'`, and on `isRejectedToken(lookup.error)` for a `fileFailed` lookup or `previewFile.error`; it asks first while `dirty`.
- **R4-8 ("R4 as built").** Add the Produces block above to the shared interfaces (the header's contract addition 11 already has the controller's shape: `EditSave`, `dropped: number | null`, `failure` for the outline's `stale`, `EditResult`), record R-70's departure from the image tool, update addition 11's hand count for `useCardEditor.ts` to 0 of 6, and add file-structure rows for `editSave.ts` and `useEditSave.ts`.
