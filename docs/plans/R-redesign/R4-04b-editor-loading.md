> Part of [R: Admin redesign](../R-redesign.md), phase R4 ([R4-card-studio.md](R4-card-studio.md)). Read the main plan's decisions (R-57 to R-91 for R4), corrections, global constraints and shared interfaces, then the R4 header, first.

> **Re-base notes (R4-4b, 2026-10-07).** Re-based from the loading half of the 2026-10-01 outline's Task R4-4 (`R4-card-studio.md:414-599`) onto main @ `e5e5029` (R1 to R3 merged, plus the app-pin bump), pin `16283a13`, decisions R-57 to R-91 (R-61, R-65, R-69, R-71 and R-91 bear on this task), and the R4 audit (`r4-audit-full.json`, entry "R4-4"; `r4-audit-synth.md`, "R4-4"). The audit cited pin `bc877e1`; every app fact below was re-checked at `16283a13`. It builds on the sibling drafts as they now stand (R4-1a, R4-1b, R4-2a, R4-2b, R4-3a, R4-3b and R4-4a) and on the R4 header's contract additions 8, 10 and 11.
> - **The split.** The outline's R4-4 is four tasks. R4-4a is `usePreviewCardsFile`. This one, R4-4b, is the editor's loading and editing side: the lookup, the draft, image staging, the preview, synergies, changes, dirty and discard. R4-4c adds both save paths, the outcome and Load it again; R4-4d adds the cards that only the branch file holds (R-66). So this task imports no commit function, and its hook has no `save`, `canSave`, `saving`, `result`, `saveError`, `failure` or `loadAgain` yet.
> - **Rules in a pure module, the hook as wiring.** `src/tools/studio/editorState.ts` holds every rule as a function of plain inputs, tested without React (44 cases). `useCardEditor.ts` wires them, as `useRevealAdmin` does. Its two private hooks, `useEditDraft` and `useDraftImage`, keep each piece of state with its own setter. R4-4c puts the save in a third (`useEditSave`), so `useCardEditor` stays at its complexity of about 3.
> - **The hook takes one object, `useCardEditor({token, cardId})`.** The outline's `(token, cardId)` put two primitive parameters in two. With the private hooks' parameters that would be 2 of 5 (40%), over the gate's 30%. Every function in the two new modules takes objects or domain types: 0 primitive parameters in 24 (`editorState.ts`) and 0 in 5 (`useCardEditor.ts`).
> - **R4-2a's model and R4-4a's file, as they are signed.** The reasons are `'released' | 'unnumbered' | 'other-set' | 'unrepresentable'`. `editKindOf(entry): CardKind` is the one rule for whether an entry opens with fields; R4-2a keeps its `imageOnlyReason` private. `hasEdits({changes, imageName})` takes one object (the header's addition 10). R4-4a defines `PreviewCardsFile` in `previewCardsFile.ts`, and its ready state carries `ids` (addition 11). R4-4a re-exports the type from `usePreviewCardsFile.ts` too; this task imports it from where it is defined, as R4-4c and R4-4d do.
> - **The lookup follows `cardPageState`'s order** (`cardPageState.ts:33-39`), with R-71's split. The outline read it from `previewCards.json` alone, so a direct `?mode=edit&card=` URL read "missing" until the card list landed, and a failed list read as missing with no Retry (audit: significant).
>   - `editLookup({cardId, list, file})` returns a discriminated union, as `cardPageState` does: `listFailed` (with no card open too), `none`, `loading`, `missing`, `fileFailed`, `ready`. Only `ready` carries the card, its entry and `imageOnly` (the reason `editKindOf(entry)` gives, or null). R4-4d adds `gone`.
>   - The card is found during render with the list's `getCardById`. `CardDataProvider` makes a new one every render (`CardDataContext.tsx:29`), as R3-7 noted.
>   - **R-71.** Only a card whose `setCode` is `REVEAL_SET_CODE` (`'14'`, `revealSet.ts:12`) waits for the file, or shows its error. Any other card is ready at once, as released and image-only. Once the file is read and holds such a card (a pin lag, R-65), its reason reads `other-set`.
>   - `retry` reloads the card list (its `retryLoad`) when that failed, and the file when that failed. It never reloads a list that loaded: `retryLoad` restarts the whole list's load (`useCardData.ts:71`).
> - **The file's own state for the search** (audit: significant). `previewFile` gives the status, `previewIds` (R4-4a's `ids`, the set R4-2b's `searchCards` takes), the error and a `reload`, whatever card is open. A failed reload shows R4-4a's `reloadError` beside the last read's ids. The search's Retry calls `previewFile.reload`. R4-6b's reload after a New reveal publish (R-66) goes through R4-4d's `reloadFile`.
> - **The draft.** It keeps the outline's `seed`, `read` and `follow`. The outline's flat `loaded`, `before` and `form` become `edit`, a union: `{kind: 'fields', loaded, before, form}`, `{kind: 'image', reason}`, or `null` while the card waits.
>   - **The form is built only for an editable entry** (R-65, audit: significant). `seedDraft` builds it only when the ready lookup's `imageOnly` is null, that is, when `editKindOf(entry)` is `{kind: 'fields'}`. The outline built a form for any entry it found.
>   - **`seedDraft` takes the lookup, not the file:** `seedDraft({cardId, lookup, file, seed})`. A draft seeded before its card was ready has `read: null` and `follow: true`, so it seeds again once the lookup is ready. That covers a card that waits for the list after the file has landed. A mutant that kept the file's read there left the form empty, and two tests fail on it.
>   - **No re-seed loop.** A draft with no ready card (`none`, `missing`, `loading`, `fileFailed`) also has `follow: true` and `read: null`. `needsSeed` re-seeds a following draft only once its lookup is `ready`, so an unknown id or a bare search never re-seeds on every render. R4-4d's sandbox hit that loop in a stand-in, and its tests check for it.
>   - **A released card never follows the file.** It is seeded with `follow: false` straight from the list. So the file's first read landing later doesn't seed it again. A staged image stays, and in R4-4c so does an image-only save's outcome, which R-69 ties to the seed.
>   - **`needsSeed`** is the render-time reset's one condition: another card, or a draft that follows reads whose card is now ready on a newer read. A later read never touches a draft that doesn't follow, so edits survive `previewFile.reload()`. This is the outline's rule. R4-4c's Load it again sets `follow: true` and `read: file.requested` (R4-4a's hand-off), so only the read it asks for re-seeds.
>   - **The reset idiom.** `useEditDraft` calls `setDraft` during render, guarded, as `CardAnalyticsPage.tsx:41-50` does. There is no effect and no ref. It passes `react-hooks` 7 and `react-compiler` lint.
> - **Image staging belongs to the draft** (audit: significant). The outline called `upload.choose(null)` during render on a card change. That writes `useImageUpload`'s `latest` ref (`useImageUpload.ts:72-75`) in a render that React may abandon, since a URL card change renders as a transition.
>   - Now `Draft.image` names the File chosen for this draft. `onImageChange` records it only if the draft still has the seed it had when the file was chosen (`stageImage`), and calls `upload.choose` in the same event.
>   - `stagedImage({draft, upload})` shows the upload only while it holds that File. So a new card shows no image from the render it opens in. A read that lands after the switch shows nothing. A card reopened later starts with no image, though the upload still holds the old file.
>   - Revert image and Discard clear `draft.image` and call `upload.choose(null)`, each in its own event.
>   - `onImageChange` returns `choose`'s promise, as `useImageAdmin`'s did. The ported tests await it.
> - **`dirty` is R4-2a's one rule,** `hasEdits({changes, imageName})`. A staged file counts from the moment it is chosen, read or not, as New reveal's `dirty` counts it. The outline's "form differs from before" would have counted typing that builds the same card.
> - **Validation, preview and synergies.**
>   - An editable card runs `validateCardEdit(form, imageName)` (R4-2a). An image-only card has nothing to validate (`{ok: true, errors: {}}`). Its image is held to `useImageUpload`'s byte check, which also checks the extension against the bytes (`useImageUpload.ts:30-36`).
>   - `imageError` is R4-3b's `imageErrorOf(staged, validation)`, as New reveal derives it. `StagedImage` has `ChosenImage`'s shape (the header's addition 8), so the call needs no adapter (audit: cosmetic).
>   - `editPreview` builds the form with R4-3b's `buildPreview`, over the staged image or else the card's current art. The engine's `transformCard` sets no `imageUrl` (`cardTransformer.ts:174-177`), and the app's loader adds it (`loader.ts:93-96`). An image-only card previews as itself, with the staged image swapped in.
>   - `editSynergies` scores the preview against every card but its own id. The engine's rules already skip a card with the same id (`rules.ts:427`, `:448`, `:1023`); a probe found no rule that pairs a preview with its own copy. So the filter is a guard, and a spy test pins it.
>   - An image-only card gets no synergies: its page shows no synergy panel (R-61, R-90).
> - **The tag.** The open card's tag is `openTag(lookup)`: Preview while the branch file holds its entry, Released otherwise. For a ready card, that is exactly R4-2b's `cardTag`.
> - **Tests** (audit: significant and cosmetic).
>   - **The card list is a store,** copied from `CardAnalyticsPage.test.tsx:12-40` and read through `useSyncExternalStore`, so a test can move the list from loading to loaded or failed. The rest of the bridge stays real: `validateForm.ts` and `constants.ts` read from it.
>   - **`readPreviewCards` is mocked,** and R4-4a's `usePreviewCardsFile` runs for real. No test awaits a reload's promise inside the act that asked for it (R4-4a's note): `retry` and `previewFile.reload` return nothing here. R4-4c makes `retry` return a promise and changes this file's two `retry()` calls.
>   - **`mockReset()` runs in `beforeEach`,** as `useLiveTuning.test.ts:17-20` does. Vitest 5's `clearAllMocks` would keep one test's resolved file for the next. `DeferredReader` is stubbed in `beforeEach` and restored in `afterEach`, because the `app` project's `vmForks` workers share a worker across files.
>   - **`studioFixtures.ts` is R4-2a's.** The header has R4-2a create it and later tasks only add exports. The tests use its entries:
>     - `PREVIEW_ENTRY` (Mei, a Singer 5) and `DUAL_INK_ENTRY` (Priya) open with fields;
>     - `UNNUMBERED_ENTRY`, `OTHER_SET_ENTRY` and `NAMED_ABILITY_ENTRY` are R-65's three image-only reasons;
>     - `RELEASED_CARD` is released (set 9).
>
>     This task appends four exports: `listCard(entry)` (R4-2a's `cardOf` plus the art URL the app's loader gives a preview card), `RELEASED_SONG` (a cost-5 Song that Mei's Singer 5 can sing), `BRANCH_ENTRIES` and `STUDIO_CARDS`. It calls no `ruby(offset)`, so R4-4d's `ruby(7)` stays free.
> - **Three of the five image-tool cases port here; the other two go to R4-4c** (a departure from the task line). `useImageAdmin.test.ts:54`, `:70` and `:100` stage, switch and read, and they port as written: a card change is a `rerender`, and the assertions read `imageName` and `imageDataUrl`. The other two cases, `:84` ("clears the published card and image once the commit lands") and `:92` ("leaves a card picked while the publish was running"), need a save, which this task doesn't build. R4-4c ports them, adjusted for R-69 and R-70. Two related cases join here: a reopened card doesn't get its old image back, and a failed read shows its error.
> - **Kept out.** No story (no component). No reveal-sync run: no contract file changes. No change to R4-4a's modules, or to any other sibling module but the four appended fixtures. Not `src/github/githubCommit.ts`.
> - **Verified** in `scratchpad/r4-rebase/sandbox-v-R4-4b`, after the sibling drafts' own verification passes.
>   - **Setup.** A copy of `src/` and the configs from the working tree: main `b490fb7`, plus the uncommitted bump to `16283a13`. `node_modules` and `upstream/` are junctioned in, and Vite's cache and the tsbuildinfo stay in the sandbox. Over it lie the sibling drafts' verified files, each identical to its task file's code block:
>     - R4-1a and R4-1b (`sandbox-r41b-verify`);
>     - R4-3a's `constants.ts`, `validateForm.ts`, `emptyForm.ts`, `readiness.ts` and `src/test/revealForm.ts` (`sandbox-R4-3a-verify`);
>     - R4-3b's `livePreview.ts` and `useRevealAdmin.ts` (`sandbox-v-r4-03b`);
>     - R4-2a's `cardEdit.ts` and `studioFixtures.ts` (`sandbox-v-r42a`);
>     - R4-2b's `changeRows.ts`, `editSearch.ts`, `scanLanguages.ts` and `filterCards.ts` (`sandbox-r42b-verify`);
>     - R4-4a's two modules (`sandbox-v-R4-4a`).
>   - **Tests.** Steps 4 and 8 failed on the quoted unresolved imports. Then both files passed, 44 and 18 tests, with no `act(...)` warning under `--silent=false`, and R4-2a's `studioFixtures.test.ts` passed beside them (65 in all).
>   - **Typecheck and lint.** `tsc -p tsconfig.app.json` exits 0 over the whole sandbox. All five files pass `pnpm exec eslint --max-warnings 0 --stdin` run from the repo.
>   - **Mutations.** The first draft's 24 mutants were each killed by 1 to 9 tests: R-71 undone; the list error after "no card"; settled drafts following reads; no newer-read check; no seed on a card change; a waiting draft keeping the file's read; a form for an image-only entry; staging ignoring the seed; the staged view ignoring whose file the upload holds; a patchable collector number; Discard keeping the image, or the form; the synergy pool keeping the card's own copy; synergies for an image-only card; a preview without the current art; an image-only preview ignoring the staged image; a hidden `reloadError`; Retry always reloading the list, or never the file; `dirty` ignoring the image; the staged view bypassed; the tag always Preview; the view dropping the reason; a preview before the card opens. On the code as it now stands, eight were run again, and each was killed: the reason dropped from `editKindOf`'s answer, R-71 undone, empty `previewIds`, `dirty` ignoring the image, the list error after "no card", the pool keeping the card's own copy, an image-only preview ignoring the staged image, and a preview without the current art.
>   - **Code Health.** CodeScene MCP 1.5.7's `code_health_review` scores all five files 10.0 with no findings, in a throwaway git directory (`scratchpad/r4-rebase/cs-v44b`). Primitive parameters, counted by hand: `editorState.ts` 0 of 24, `useCardEditor.ts` 0 of 5, `studioFixtures.ts` 1 of 6 (R4-2a's private `ruby(offset)`; this task's `listCard` takes an entry), `editorState.test.ts` 0 of 6, and `useCardEditor.test.ts` 1 of 8 (`getCardById`'s `id`, as in R3's store).

### Task R4-4b: The Edit controller, loading side (`editorState.ts`, `useCardEditor`)

**Files:**
- Create `src/tools/studio/editorState.ts`: Edit card's rules as pure functions.
- Create `src/tools/studio/useCardEditor.ts`: the controller hook, loading and editing only. R4-4c extends it with the save.
- Modify `src/tools/studio/studioFixtures.ts` (R4-2a's): append `listCard`, `RELEASED_SONG`, `BRANCH_ENTRIES` and `STUDIO_CARDS`.
- Test (create) `src/tools/studio/__tests__/editorState.test.ts` and `src/tools/studio/__tests__/useCardEditor.test.ts`.
- No other file changes. Not R4-4a's `previewCardsFile.ts` or `usePreviewCardsFile.ts`, not any reveal-sync contract file, not `src/github/githubCommit.ts`.

**Interfaces:**
- **Consumes** (each checked in Step 1):
  - R4-1a, `src/tools/reveal/replaceCardInPreviewJson.ts`: `type PreviewCardChanges = {[K in EditableCardKey]?: LorcanaJSONCard[K] | null}`.
  - R4-1b, `src/tools/reveal/githubClient.ts`: `readPreviewCards(token: string): Promise<LorcanaJSONCard[]>`. Only the tests name it, to mock it; a 401 there reads "GitHub 401 on …".
  - R4-2a, `src/tools/studio/cardEdit.ts` (the header's addition 10):
    ```ts
    export type ImageOnlyReason = 'released' | 'unnumbered' | 'other-set' | 'unrepresentable';
    export type CardKind = {kind: 'fields'} | {kind: 'image'; reason: ImageOnlyReason};
    export function formFromPreviewCard(entry: LorcanaJSONCard): RevealCardForm;
    export function editKindOf(entry: LorcanaJSONCard | null): CardKind;   // null: no entry, so released
    export function cardChanges(loaded: LorcanaJSONCard, before: RevealCardForm, after: RevealCardForm): PreviewCardChanges;  // throws if the number changed
    export function validateCardEdit(form: RevealCardForm, imageName: string | null): ValidationResult;
    export function hasEdits(edit: {changes: PreviewCardChanges; imageName: string | null}): boolean;
    ```
  - R4-2a, `src/tools/studio/studioFixtures.ts` (tests only): `cardOf(entry): LorcanaCard` (the engine's `transformCard`, or a throw), `PREVIEW_ENTRY` (Mei, `REVEAL_ID_BASE + inkBlock('Ruby').first`, a Singer 5), `DUAL_INK_ENTRY` (Priya), `UNNUMBERED_ENTRY`, `OTHER_SET_ENTRY`, `NAMED_ABILITY_ENTRY` and `RELEASED_CARD` (set 9, id `'1001'`).
  - R4-2b:
    - `src/tools/studio/changeRows.ts`: `changeRows({loaded, changes, imageName}: ChangeRowsInput): ChangeRow[]` and `interface ChangeRow {id; label; from; to}`. A staged image's row is `{id: 'image', label: 'Image', from: 'current art', to: name}`, and `fullName` gets no row of its own.
    - `src/tools/studio/editSearch.ts`: `type CardTag = 'Preview' | 'Released'`.
  - R4-3b, `src/tools/reveal/livePreview.ts` (the header's addition 8):
    ```ts
    export function buildPreview(form: RevealCardForm, imageDataUrl: string | null): LorcanaCard | null;
    export function computeSynergies(card: LorcanaCard | null, allCards: LorcanaCard[]): SynergyGroup[];
    export interface ChosenImage {name: string | null; dataUrl: string | null; error: string | null}
    export function imageErrorOf(image: ChosenImage, validation: ValidationResult): string | null;
    ```
  - R4-4a (the header's addition 11):
    ```ts
    // src/tools/studio/previewCardsFile.ts
    export type PreviewCardsFile =
      | {status: 'loading'}
      | {status: 'ready'; cards: LorcanaJSONCard[]; ids: ReadonlySet<number>; read: number; reloadError?: string}
      | {status: 'error'; error: string};
    // src/tools/studio/usePreviewCardsFile.ts
    export function usePreviewCardsFile(token: string): UsePreviewCardsFileResult;
    // PreviewCardsFile & {requested: number; reload: () => Promise<LorcanaJSONCard[] | null>; commit: (entry) => void}
    ```
    The first read starts on mount. A reload keeps the last cards until the next read lands, a failed reload keeps them beside `reloadError`, and a Retry from `error` stays `error` until a read lands. This task reads `status`, `cards`, `ids`, `read`, `reloadError`, `error` and `reload`.
  - Unchanged code:
    - `useCardDataContext` (bridge): `cards`, `isLoading`, `error`, `getCardById` and `retryLoad`.
    - `useImageUpload` (`src/components/useImageUpload.ts:68-98`): `file`, `dataUrl`, `error` and `choose`.
    - `REVEAL_SET_CODE` (`src/tools/reveal/constants.ts`).
    - In tests: `DeferredReader` (`src/test/DeferredReader.ts:9-40`), and `pngFile` and `imageDataUrl` (`src/test/images.ts`).
- **Produces:**
```ts
// src/tools/studio/editorState.ts
export type CardListState = Pick<ReturnType<typeof useCardDataContext>, 'isLoading' | 'error' | 'getCardById'>;
export type EditLookup =
  | {kind: 'listFailed'; error: Error}
  | {kind: 'none'}
  | {kind: 'loading'}
  | {kind: 'missing'; cardId: string}
  | {kind: 'fileFailed'; error: string}
  | {kind: 'ready'; card: LorcanaCard; entry: LorcanaJSONCard | null; imageOnly: ImageOnlyReason | null};
export interface LookupInput {cardId: string | null; list: CardListState; file: PreviewCardsFile}
export function editLookup(input: LookupInput): EditLookup;
export interface FieldsEdit {kind: 'fields'; loaded: LorcanaJSONCard; before: RevealCardForm; form: RevealCardForm}
export interface ImageOnlyEdit {kind: 'image'; reason: ImageOnlyReason}
export interface Draft {
  cardId: string | null; seed: number; read: number | null; follow: boolean;
  edit: FieldsEdit | ImageOnlyEdit | null; image: File | null;
}
export interface SeedInput {cardId: string | null; lookup: EditLookup; file: PreviewCardsFile; seed: number}
export function seedDraft(input: SeedInput): Draft;
export function needsSeed(input: Omit<SeedInput, 'seed'> & {draft: Draft}): boolean;
export function fieldsOf(draft: Draft): FieldsEdit | null;
export interface DraftView {form: RevealCardForm | null; loaded: LorcanaJSONCard | null; imageOnly: ImageOnlyReason | null}
export function draftView(draft: Draft): DraftView;
export function openCard(lookup: EditLookup): LorcanaCard | null;
export function openTag(lookup: EditLookup): CardTag | null;
export function patchDraft(draft: Draft, patch: Partial<RevealCardForm>): Draft;        // the collector number stays (R-91)
export function discardDraft(draft: Draft): Draft;
export function stageImage(draft: Draft, choice: {seed: number; image: File | null}): Draft;
export interface StagedImage {name: string | null; dataUrl: string | null; error: string | null}
export function stagedImage(input: {draft: Draft; upload: Pick<ImageUpload, 'file' | 'dataUrl' | 'error'>}): StagedImage;
export function draftChanges(draft: Draft): PreviewCardChanges;
export function draftValidation(input: {draft: Draft; imageName: string | null}): ValidationResult;
export function editPreview(input: {card: LorcanaCard | null; draft: Draft; dataUrl: string | null}): LorcanaCard | null;
export function editSynergies(input: {preview: LorcanaCard | null; draft: Draft; cards: readonly LorcanaCard[]}): SynergyGroup[];
export interface PreviewFileView {status: PreviewCardsFile['status']; previewIds: ReadonlySet<number> | null; error: string | null}
export function previewFileView(file: PreviewCardsFile): PreviewFileView;

// src/tools/studio/useCardEditor.ts
export interface CardEditorInput {token: string; cardId: string | null}
export interface CardEditorController {
  lookup: EditLookup;
  retry: () => void;                                       // R4-4c makes it resolve when its read lands
  previewFile: PreviewFileView & {reload: () => void};
  tag: CardTag | null;
  form: RevealCardForm | null;                             // null for an image-only card, and until ready
  imageOnly: ImageOnlyReason | null;
  patchForm: (patch: Partial<RevealCardForm>) => void;
  validation: ValidationResult;
  changes: ChangeRow[];
  dirty: boolean;
  discard: () => void;
  previewCard: LorcanaCard | null;
  synergyGroups: SynergyGroup[];
  imageName: string | null;
  imageDataUrl: string | null;
  imageError: string | null;
  onImageChange: (file: File | null) => Promise<void>;
  revertImage: () => void;
}
export function useCardEditor(input: CardEditorInput): CardEditorController;

// src/tools/studio/studioFixtures.ts (appended to R4-2a's; tests and stories only)
export function listCard(entry: LorcanaJSONCard): LorcanaCard;   // cardOf(entry) plus imageUrl '/card-images-preview/{id}.avif'
export const RELEASED_SONG: LorcanaCard;         // set 9, id '1002': a cost-5 Song that PREVIEW_ENTRY's Singer 5 sings
export const BRANCH_ENTRIES: LorcanaJSONCard[];  // previewCards.json: PREVIEW_ENTRY, DUAL_INK_ENTRY, then R-65's three
export const STUDIO_CARDS: LorcanaCard[];        // the card list: RELEASED_CARD, RELEASED_SONG, then BRANCH_ENTRIES.map(listCard)
```

**Behaviour:**

| `lookup.kind` | When | The page shows (R4-5f, R4-6b) |
|---|---|---|
| `listFailed` | the card list failed, with or without a card | its error and Retry (R3-7's wording) |
| `none` | no `?card=` | the search, with `previewFile`'s state beside it (R-71) |
| `loading` | the list loads, or a card of the reveal set waits for the file | "Loading the card…" |
| `missing` | the list lacks the id (R4-4d first looks in the file) | R-29's not-found wording |
| `fileFailed` | a card of the reveal set, and the file's read failed | its error and Retry; Forget token when `isRejectedToken(error)` (R-26) |
| `ready` | the card | the editor: the form when `form` is set, else the facts and `IMAGE_ONLY_NOTES[imageOnly]` (R-61, R-65) |

- **The draft** seeds during render (`needsSeed`), when the card changes or when a draft that follows reads sees its card ready on a newer read. A draft seeded before its card is ready waits (`follow: true`, `read: null`). A released card is seeded at once and never follows. A later read leaves a seeded draft alone.
- **Image staging:** `onImageChange` stages the file for the draft it was chosen in. The editor shows the upload only while it holds that file. Revert image and Discard clear it in their own events, and nothing touches the upload during render.
- **What it reads off the draft:**
  - `changes` is `changeRows` over `cardChanges` (none for an image-only card), with the Image row last.
  - `dirty` is `hasEdits`.
  - `validation` is `validateCardEdit`, or ok for an image-only card.
  - `imageError` is `imageErrorOf`.
  - `previewCard` is the built form over the staged image or the current art, or for an image-only card the card itself.
  - `synergyGroups` holds the preview's synergies against every other card, and is empty for an image-only card.

- [ ] **Step 1: Check what this task builds on**

R4-1a, R4-1b, R4-2a, R4-2b, R4-3a, R4-3b and R4-4a come first, on the bumped pin. Run, with the Bash tool:
```bash
git log --oneline main..HEAD
git -C upstream/inkweave rev-parse --short=8 HEAD
grep -n "^export type PreviewCardChanges" src/tools/reveal/replaceCardInPreviewJson.ts
grep -n "^export async function readPreviewCards(token: string)" src/tools/reveal/githubClient.ts
grep -nE "^export (type (ImageOnlyReason|CardKind)|function (formFromPreviewCard|editKindOf|cardChanges|validateCardEdit|hasEdits))" src/tools/studio/cardEdit.ts
grep -nE "^export (function cardOf|const (PREVIEW_ENTRY|DUAL_INK_ENTRY|UNNUMBERED_ENTRY|OTHER_SET_ENTRY|NAMED_ABILITY_ENTRY|RELEASED_CARD) )|listCard|RELEASED_SONG|BRANCH_ENTRIES|STUDIO_CARDS" src/tools/studio/studioFixtures.ts
grep -nE "^export (function changeRows|interface ChangeRow )" src/tools/studio/changeRows.ts
grep -n "^export type CardTag" src/tools/studio/editSearch.ts
grep -nE "^export (function (buildPreview|computeSynergies|imageErrorOf)|interface ChosenImage)" src/tools/reveal/livePreview.ts
grep -nE "^export type PreviewCardsFile|ids: ReadonlySet<number>; read: number; reloadError\?: string" src/tools/studio/previewCardsFile.ts
grep -nE "^export function usePreviewCardsFile|reload: \(\) => Promise" src/tools/studio/usePreviewCardsFile.ts
ls src/tools/studio/editorState.ts src/tools/studio/useCardEditor.ts 2>&1
```
Expected:
- **The log** lists the plan commit and the commits of R4-1a, R4-3a, R4-5a, R4-5s, R4-5h, R4-1b, R4-2a, R4-2b, R4-3b and R4-4a.
- **The pin** prints `16283a13`. If it prints `bc877e1`, the pin bump hasn't merged into this branch's base: stop and tell the controller.
- **The greps print** 1, 1, 7, 7, 2, 1, 4, 2 and 2 lines. If one prints less, stop: that task hasn't landed, or its signature moved, and this task must follow it.
  - **`cardEdit.ts`:** the two types, then five functions. `hasEdits` takes one object, `(edit: {changes: PreviewCardChanges; imageName: string | null})`. If `cardChanges` takes one object instead of three arguments, call it that way in `draftChanges`.
  - **`studioFixtures.ts`:** R4-2a's `cardOf` and six entries, and none of `listCard`, `RELEASED_SONG`, `BRANCH_ENTRIES` or `STUDIO_CARDS`, which Step 2 appends. If one of those names is already taken, stop and ask the controller.
  - **`previewCardsFile.ts`:** the type, and its ready variant with `ids`, `read` and `reloadError?`. If the ready variant gained another required key, add it to `readFile` in Step 3's test.
  - **`usePreviewCardsFile.ts`:** the hook, and a `reload` that returns a promise. `retry` and `previewFile.reload` below drop it with `void`.
- **The `ls`** reports that both files are missing.

On a fresh checkout, or after a pin bump, run `pnpm build:engine` once first: the tests reach the engine through `cardOf` and `buildPreview`.

- [ ] **Step 2: Append the Edit controller's fixtures**

Append to `src/tools/studio/studioFixtures.ts`, below its last export. The module already imports `type LorcanaCard` and `type LorcanaJSONCard` from the engine, and every name used here is R4-2a's:

```ts

/**
 * The card list's card for a preview entry, with its art: cardOf, plus the
 * imageUrl the app's loader gives a preview card (loader.ts's
 * resolveImageUrl). Edit card's live preview shows it until an image is staged.
 */
export function listCard(entry: LorcanaJSONCard): LorcanaCard {
  return {...cardOf(entry), imageUrl: `/card-images-preview/${entry.id}.avif`};
}

/** A released Song that PREVIEW_ENTRY's Singer 5 can sing, so Edit card's synergies have one to find (R4-4b). */
export const RELEASED_SONG = cardOf({
  id: 1002,
  name: 'Let It Go',
  fullName: 'Let It Go',
  cost: 5,
  color: 'Amethyst',
  inkwell: true,
  type: 'Action',
  subtypes: ['Song'],
  fullText: '(A character with cost 5 or more can ⟳ to sing this song for free.)\nDraw 2 cards.',
  setCode: '9',
  number: 81,
  rarity: 'Rare',
});

/** previewCards.json on the branch for the Edit controller's tests (R4-4b): two editable entries, then R-65's three. */
export const BRANCH_ENTRIES: LorcanaJSONCard[] = [PREVIEW_ENTRY, DUAL_INK_ENTRY, UNNUMBERED_ENTRY, NAMED_ABILITY_ENTRY, OTHER_SET_ENTRY];

/** The card list over them: the released cards, then the branch entries with their art, preview cards last as the app's loader orders them. */
export const STUDIO_CARDS: LorcanaCard[] = [RELEASED_CARD, RELEASED_SONG, ...BRANCH_ENTRIES.map(listCard)];
```

Notes:
- **Why `listCard` beside `cardOf`.** `cardOf` is the engine's transform, which sets no `imageUrl`. The live preview shows the card's current art until an image is staged, so the editor's tests need a card list that has art, as the app's does.
- **Mei is already a Singer 5** (`PREVIEW_ENTRY`'s one keyword), so `RELEASED_SONG` is among her synergies from the start, and clearing her Keywords drops it.
- **No `ruby(offset)`.** The entries are R4-2a's, so offsets 1 to 6 stay as R4-2a took them, and R4-4d's `ruby(7)` stays free.

- [ ] **Step 3: Write the state module's failing test**

Create `src/tools/studio/__tests__/editorState.test.ts`:

```ts
import {describe, expect, it, vi} from 'vitest';
import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {imageDataUrl, pngFile} from '../../../test/images';
import {computeSynergies} from '../../reveal/livePreview';
import {formFromPreviewCard, type ImageOnlyReason} from '../cardEdit';
import {
  discardDraft,
  draftChanges,
  draftValidation,
  editLookup,
  editPreview,
  editSynergies,
  draftView,
  needsSeed,
  openTag,
  patchDraft,
  previewFileView,
  seedDraft,
  stageImage,
  stagedImage,
  type CardListState,
  type Draft,
  type EditLookup,
} from '../editorState';
import type {PreviewCardsFile} from '../previewCardsFile';
import {
  BRANCH_ENTRIES,
  NAMED_ABILITY_ENTRY,
  OTHER_SET_ENTRY,
  PREVIEW_ENTRY,
  RELEASED_CARD,
  STUDIO_CARDS,
  UNNUMBERED_ENTRY,
  listCard,
} from '../studioFixtures';

// The engine stays real; the spy shows which cards the synergies are scored against.
vi.mock('../../reveal/livePreview', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../reveal/livePreview')>();
  return {...actual, computeSynergies: vi.fn(actual.computeSynergies)};
});

const LOADING: PreviewCardsFile = {status: 'loading'};
const FAILED: PreviewCardsFile = {status: 'error', error: 'GitHub 500 on previewCards.json'};
/** The branch file after its `read`th read, holding `cards`, as R4-4a's hook gives it. */
const readFile = ({cards = BRANCH_ENTRIES, read = 1}: {cards?: LorcanaJSONCard[]; read?: number} = {}): Extract<PreviewCardsFile, {status: 'ready'}> => ({
  status: 'ready',
  cards,
  ids: new Set(cards.map((entry) => entry.id)),
  read,
});

/** The card list, loaded with every studio card unless told otherwise. */
function cardList({isLoading = false, error = null}: Partial<CardListState> = {}): CardListState {
  return {isLoading, error, getCardById: (id) => STUDIO_CARDS.find((card) => card.id === id)};
}

/** Mei, R4-2a's PREVIEW_ENTRY: an editable preview card, and a Singer 5. */
const MEI = PREVIEW_ENTRY;
const MEI_ID = String(MEI.id);

/** The lookup and a fresh draft for a card, as the editor seeds them. */
function opened({cardId = MEI_ID, file = readFile()}: {cardId?: string; file?: PreviewCardsFile} = {}) {
  const lookup = editLookup({cardId, list: cardList(), file});
  return {lookup, draft: seedDraft({cardId, lookup, file, seed: 1})};
}

describe('editLookup', () => {
  const ready = (card: LorcanaCard, imageOnly: ImageOnlyReason | null) => ({kind: 'ready' as const, card, imageOnly});
  it.each<[string, {cardId: string | null; list?: Partial<CardListState>; file?: PreviewCardsFile}, Partial<EditLookup>]>([
    ['a failed card list, with no card open too', {cardId: null, list: {error: new Error('offline')}}, {kind: 'listFailed'}],
    ['no card, while the list loads', {cardId: null, list: {isLoading: true}}, {kind: 'none'}],
    ['a card while the list loads', {cardId: MEI_ID, list: {isLoading: true}}, {kind: 'loading'}],
    ['an id the list lacks, before the file is read', {cardId: '14999', file: LOADING}, {kind: 'missing', cardId: '14999'}],
    ['a card of the reveal set while the file loads', {cardId: MEI_ID, file: LOADING}, {kind: 'loading'}],
    ['a card of the reveal set when the file fails', {cardId: MEI_ID, file: FAILED}, {kind: 'fileFailed', error: 'GitHub 500 on previewCards.json'}],
    ['an editable preview card', {cardId: MEI_ID}, {...ready(listCard(MEI), null), entry: MEI}],
    // R4-4d turns this row into its graduated-id state (R-66).
    ['a card of the reveal set the file lacks', {cardId: MEI_ID, file: readFile({cards: []})}, {...ready(listCard(MEI), 'released'), entry: null}],
    ['a released card while the file loads (R-71)', {cardId: RELEASED_CARD.id, file: LOADING}, ready(RELEASED_CARD, 'released')],
    ['a released card when the file fails (R-71)', {cardId: RELEASED_CARD.id, file: FAILED}, ready(RELEASED_CARD, 'released')],
    ['an entry of another set, once the file is read (R-65)', {cardId: String(OTHER_SET_ENTRY.id)}, ready(listCard(OTHER_SET_ENTRY), 'other-set')],
    ['an entry with no number (R-65)', {cardId: String(UNNUMBERED_ENTRY.id)}, ready(listCard(UNNUMBERED_ENTRY), 'unnumbered')],
    ['an entry the form can’t hold (R-65)', {cardId: String(NAMED_ABILITY_ENTRY.id)}, ready(listCard(NAMED_ABILITY_ENTRY), 'unrepresentable')],
  ])('%s', (_, {cardId, list, file = readFile()}, expected) => {
    expect(editLookup({cardId, list: cardList(list), file})).toMatchObject(expected);
  });
});

describe('the open card’s tag and view', () => {
  it.each<[string, string, PreviewCardsFile, Pick<ReturnType<typeof draftView>, 'imageOnly'> & {tag: ReturnType<typeof openTag>; name?: string}]>([
    ['a card that waits', MEI_ID, LOADING, {tag: null, imageOnly: null, name: undefined}],
    ['an editable preview card', MEI_ID, readFile(), {tag: 'Preview', imageOnly: null, name: 'Mei'}],
    ['a preview entry that opens image-only', String(UNNUMBERED_ENTRY.id), readFile(), {tag: 'Preview', imageOnly: 'unnumbered', name: undefined}],
    ['a released card', RELEASED_CARD.id, LOADING, {tag: 'Released', imageOnly: 'released', name: undefined}],
  ])('%s', (_, cardId, file, expected) => {
    const {lookup, draft} = opened({cardId, file});
    const view = draftView(draft);
    expect({tag: openTag(lookup), imageOnly: view.imageOnly, name: view.form?.name}).toEqual(expected);
  });
});

describe('seedDraft', () => {
  it('seeds an editable card with its form as loaded, and no image', () => {
    const form = formFromPreviewCard(MEI);
    expect(opened().draft).toEqual({
      cardId: MEI_ID,
      seed: 1,
      read: 1,
      follow: false,
      edit: {kind: 'fields', loaded: MEI, before: form, form},
      image: null,
    });
  });

  it('builds no form for an entry that opens image-only (R-65)', () => {
    expect(opened({cardId: String(UNNUMBERED_ENTRY.id)}).draft.edit).toEqual({kind: 'image', reason: 'unnumbered'});
  });

  it('waits, with no read, while the card list loads, though the file is read', () => {
    const lookup = editLookup({cardId: MEI_ID, list: cardList({isLoading: true}), file: readFile()});
    expect(seedDraft({cardId: MEI_ID, lookup, file: readFile(), seed: 1})).toMatchObject({read: null, follow: true, edit: null});
  });

  it.each<[string, string, PreviewCardsFile, Pick<Draft, 'read' | 'follow' | 'edit'>]>([
    ['a card of the reveal set waits for the file', MEI_ID, LOADING, {read: null, follow: true, edit: null}],
    ['a released card opens without it, and never waits (R-71)', RELEASED_CARD.id, LOADING, {read: null, follow: false, edit: {kind: 'image', reason: 'released'}}],
  ])('%s', (_, cardId, file, expected) => {
    expect(opened({cardId, file}).draft).toMatchObject(expected);
  });
});

describe('needsSeed', () => {
  const waiting = opened({file: LOADING});
  const settled = opened();
  it.each<[string, {draft: Draft; cardId?: string; file: PreviewCardsFile}, boolean]>([
    ['another card', {draft: settled.draft, cardId: RELEASED_CARD.id, file: readFile()}, true],
    ['a waiting draft whose card is now ready', {draft: waiting.draft, file: readFile()}, true],
    ['a waiting draft whose card still loads', {draft: waiting.draft, file: LOADING}, false],
    ['a settled draft and a newer read: its edits stay', {draft: settled.draft, file: readFile({read: 2})}, false],
    ['a draft that follows reads, before a newer one lands', {draft: {...settled.draft, follow: true}, file: readFile()}, false],
    ['a draft that follows reads, once a newer one lands', {draft: {...settled.draft, follow: true}, file: readFile({read: 2})}, true],
  ])('%s', (_, {draft, cardId = MEI_ID, file}, expected) => {
    const lookup = editLookup({cardId, list: cardList(), file});
    expect(needsSeed({draft, cardId, lookup, file})).toBe(expected);
  });
});

describe('the draft’s edits', () => {
  const {draft} = opened();
  const image = opened({cardId: RELEASED_CARD.id}).draft;
  const renamed = patchDraft(draft, {name: 'Meilin', collectorNumber: '99'});

  it('patches the form, but never the collector number (R-91)', () => {
    expect(renamed.edit).toMatchObject({form: {name: 'Meilin', collectorNumber: String(MEI.number)}});
    expect(draftChanges(renamed)).toEqual({name: 'Meilin', fullName: 'Meilin - Red Panda'});
  });

  it('discards back to the form as loaded, and drops the image', () => {
    const staged = stageImage(renamed, {seed: renamed.seed, image: pngFile('a.png')});
    expect(discardDraft(staged)).toEqual({...draft, image: null});
  });

  it('leaves an image-only card without a form or changes, and with nothing to validate', () => {
    expect(patchDraft(image, {name: 'Lantern'})).toBe(image);
    expect({changes: draftChanges(image), validation: draftValidation({draft: image, imageName: null})}).toEqual({
      changes: {},
      validation: {ok: true, errors: {}},
    });
  });

  it('validates the edit, with no image needed', () => {
    expect(draftValidation({draft, imageName: null}).ok).toBe(true);
    expect(draftValidation({draft: patchDraft(draft, {cost: ''}), imageName: null}).errors).toEqual({
      cost: 'Enter a cost (0 or more)',
    });
  });

  it('previews the form over the staged image, else the card’s current art', () => {
    const card = listCard(MEI);
    expect(editPreview({card, draft: renamed, dataUrl: null})).toMatchObject({fullName: 'Meilin - Red Panda', imageUrl: card.imageUrl});
    expect(editPreview({card, draft, dataUrl: imageDataUrl('a.png')})?.imageUrl).toBe(imageDataUrl('a.png'));
    expect(editPreview({card: null, draft, dataUrl: null})).toBeNull();
  });

  it('previews an image-only card as it is, with the staged image swapped in', () => {
    expect(editPreview({card: RELEASED_CARD, draft: image, dataUrl: null})).toBe(RELEASED_CARD);
    expect(editPreview({card: RELEASED_CARD, draft: image, dataUrl: imageDataUrl('a.png')})).toEqual({
      ...RELEASED_CARD,
      imageUrl: imageDataUrl('a.png'),
    });
  });

  it('scores the edit against every card but its own', () => {
    vi.mocked(computeSynergies).mockClear();
    const preview = editPreview({card: listCard(MEI), draft, dataUrl: null});
    editSynergies({preview, draft, cards: STUDIO_CARDS});
    const pool = vi.mocked(computeSynergies).mock.calls[0][1].map((card) => card.id);
    expect({hasOwnCopy: pool.includes(MEI_ID), size: pool.length}).toEqual({hasOwnCopy: false, size: STUDIO_CARDS.length - 1});
  });

  it('scores no synergies for an image-only card', () => {
    // Mei's Singer 5 can sing the released song, so the same preview on an editable draft has a synergy.
    const singer = editPreview({card: listCard(MEI), draft, dataUrl: null});
    const groups = (on: Draft) => editSynergies({preview: singer, draft: on, cards: STUDIO_CARDS}).length;
    expect({editable: groups(draft) > 0, imageOnly: groups(image)}).toEqual({editable: true, imageOnly: 0});
  });
});

describe('the staged image', () => {
  const {draft} = opened();
  const file = pngFile('a.png');
  const staged = stageImage(draft, {seed: draft.seed, image: file});
  const upload = {file, dataUrl: imageDataUrl('a.png'), error: null};

  it('is dropped when chosen in an older draft', () => {
    expect(stageImage(draft, {seed: draft.seed - 1, image: file})).toBe(draft);
  });

  it.each<[string, Draft, typeof upload, ReturnType<typeof stagedImage>]>([
    ['nothing chosen for this draft', draft, upload, {name: null, dataUrl: null, error: null}],
    ['the upload holds another file', staged, {...upload, file: pngFile('b.png')}, {name: null, dataUrl: null, error: null}],
    ['the upload holds this draft’s file', staged, upload, {name: 'a.png', dataUrl: imageDataUrl('a.png'), error: null}],
  ])('shows %s', (_, which, from, expected) => {
    expect(stagedImage({draft: which, upload: from})).toEqual(expected);
  });
});

describe('previewFileView', () => {
  it.each<[string, PreviewCardsFile, ReturnType<typeof previewFileView>]>([
    ['loading', LOADING, {status: 'loading', previewIds: null, error: null}],
    ['failed', FAILED, {status: 'error', previewIds: null, error: 'GitHub 500 on previewCards.json'}],
    ['read', readFile({cards: [MEI]}), {status: 'ready', previewIds: new Set([MEI.id]), error: null}],
    ['read, then a failed reload', {...readFile({cards: [MEI]}), reloadError: 'GitHub 502'}, {status: 'ready', previewIds: new Set([MEI.id]), error: 'GitHub 502'}],
  ])('%s', (_, file, expected) => {
    expect(previewFileView(file)).toEqual(expected);
  });
});
```

- [ ] **Step 4: Run it, and see it fail**

```bash
pnpm vitest run --project app src/tools/studio/__tests__/editorState.test.ts
```
Expected: FAIL, with `Error: Failed to resolve import "../editorState" from "src/tools/studio/__tests__/editorState.test.ts". Does the file exist?`, and no tests run.

- [ ] **Step 5: Write `editorState.ts`**

```ts
import type {LorcanaCard, LorcanaJSONCard, SynergyGroup} from 'inkweave-synergy-engine';
import type {useCardDataContext} from '../../app-bridge';
import type {ImageUpload} from '../../components/useImageUpload';
import type {RevealCardForm} from '../reveal/buildPreviewCard';
import {REVEAL_SET_CODE} from '../reveal/constants';
import {buildPreview, computeSynergies} from '../reveal/livePreview';
import type {PreviewCardChanges} from '../reveal/replaceCardInPreviewJson';
import type {ValidationResult} from '../reveal/validateForm';
import {cardChanges, editKindOf, formFromPreviewCard, validateCardEdit, type ImageOnlyReason} from './cardEdit';
import type {CardTag} from './editSearch';
import type {PreviewCardsFile} from './previewCardsFile';

/*
 * Edit card's state, as pure functions of what the editor reads: the shell's
 * card list, previewCards.json on the target branch, the draft and the upload.
 * useCardEditor only wires them together, as useRevealAdmin does, so each rule
 * is tested here without React.
 */

/** What the editor reads from the shell's card list (useCardDataContext), as cardPageState does. */
export type CardListState = Pick<ReturnType<typeof useCardDataContext>, 'isLoading' | 'error' | 'getCardById'>;

/**
 * The open card. `imageOnly` says why a card opens without its fields (R-61,
 * R-65), null when they are editable; `entry` is its previewCards.json entry,
 * null for a card the file doesn't hold.
 */
export type EditLookup =
  | {kind: 'listFailed'; error: Error}
  | {kind: 'none'}
  | {kind: 'loading'}
  | {kind: 'missing'; cardId: string}
  | {kind: 'fileFailed'; error: string}
  | {kind: 'ready'; card: LorcanaCard; entry: LorcanaJSONCard | null; imageOnly: ImageOnlyReason | null};

export interface LookupInput {
  /** The URL's card id (?card=), or null. */
  cardId: string | null;
  list: CardListState;
  file: PreviewCardsFile;
}

/** The card's entry in the file, once the file is read. The card list's ids are strings; the file's are numbers. */
function entryOf({card, file}: {card: LorcanaCard; file: PreviewCardsFile}): LorcanaJSONCard | null {
  if (file.status !== 'ready') return null;
  return file.cards.find((entry) => String(entry.id) === card.id) ?? null;
}

/** The card, ready: R4-2a's editKindOf decides from its entry whether its fields open (R-65). */
function opened({card, file}: {card: LorcanaCard; file: PreviewCardsFile}): EditLookup {
  const entry = entryOf({card, file});
  const edit = editKindOf(entry);
  return {kind: 'ready', card, entry, imageOnly: edit.kind === 'image' ? edit.reason : null};
}

/**
 * A card the list holds. Only a card of the reveal set waits for the file,
 * which says whether it is still a preview card; a card of any other set is
 * released and image-only straight from the list, so image fixes never wait on
 * the file or its errors (R-71). Its reason becomes 'other-set' if the file,
 * once read, holds it (a pin lag, R-65).
 */
function cardLookup({card, file}: {card: LorcanaCard; file: PreviewCardsFile}): EditLookup {
  if (card.setCode !== REVEAL_SET_CODE) return opened({card, file});
  if (file.status === 'loading') return {kind: 'loading'};
  if (file.status === 'error') return {kind: 'fileFailed', error: file.error};
  return opened({card, file});
}

/**
 * The open card, decided in cardPageState's order (R3):
 * 1. A failed card list, with no card open too: the search has nothing to search.
 * 2. No card: the search.
 * 3. A list still loading.
 * 4. An id the list doesn't hold.
 * 5. For a card of the reveal set, the file loading, then its failed read.
 * 6. The card.
 * The card is looked up here, during render, with the list's getCardById.
 */
export function editLookup({cardId, list, file}: LookupInput): EditLookup {
  if (list.error) return {kind: 'listFailed', error: list.error};
  if (!cardId) return {kind: 'none'};
  if (list.isLoading) return {kind: 'loading'};
  const card = list.getCardById(cardId);
  if (!card) return {kind: 'missing', cardId};
  return cardLookup({card, file});
}

/** A preview card's field edit: its entry and form as loaded, and the form now. */
export interface FieldsEdit {
  kind: 'fields';
  /** The entry the form was built from: what a save diffs against, and what its base check compares (R-67). */
  loaded: LorcanaJSONCard;
  /** The form as loaded: what Discard puts back. */
  before: RevealCardForm;
  form: RevealCardForm;
}

/** A card that opens image-only, and why. */
export interface ImageOnlyEdit {
  kind: 'image';
  reason: ImageOnlyReason;
}

/**
 * One card's edit. There is no ref and no reset effect: the editor seeds a new
 * draft during render when the card changes, or when the read a waiting draft
 * follows lands (needsSeed).
 */
export interface Draft {
  /** The card it belongs to. */
  cardId: string | null;
  /** Bumped on every seed, so whatever was started for an older draft (an image choice; a save, R4-4c) can tell. */
  seed: number;
  /** The read of previewCards.json it was seeded from; null when it was seeded without one. */
  read: number | null;
  /** Seed again once the card is ready on a newer read: while it waits, and after Load it again (R4-4c). */
  follow: boolean;
  /** Null until the card's lookup is ready. A draft keeps the kind it was seeded with. */
  edit: FieldsEdit | ImageOnlyEdit | null;
  /**
   * The file chosen for this draft. The upload hook holds its bytes; the
   * draft only says whose they are, so a new card never shows the last one's
   * image and nothing calls upload.choose(null) during render.
   */
  image: File | null;
}

/** What the draft opens with: the fields of an editable entry, the reason for any other card, null while it waits. */
function editOf(lookup: EditLookup): Draft['edit'] {
  if (lookup.kind !== 'ready') return null;
  if (lookup.imageOnly !== null) return {kind: 'image', reason: lookup.imageOnly};
  // editKindOf(null) is released, so an editable card has an entry; this narrows the type.
  if (lookup.entry === null) return {kind: 'image', reason: 'released'};
  const form = formFromPreviewCard(lookup.entry);
  return {kind: 'fields', loaded: lookup.entry, before: form, form};
}

function readOf(file: PreviewCardsFile): number | null {
  return file.status === 'ready' ? file.read : null;
}

export interface SeedInput {
  cardId: string | null;
  lookup: EditLookup;
  file: PreviewCardsFile;
  seed: number;
}

/**
 * A fresh draft for the card: its form when its fields are editable, built
 * only for an editable entry (editKindOf's rule, R-65), and no image.
 */
export function seedDraft({cardId, lookup, file, seed}: SeedInput): Draft {
  const edit = editOf(lookup);
  return {cardId, seed, read: edit === null ? null : readOf(file), follow: edit === null, edit, image: null};
}

/** A read newer than the one the draft was seeded from has landed. */
function newerRead({draft, file}: {draft: Draft; file: PreviewCardsFile}): boolean {
  if (draft.read === null) return true;
  return file.status === 'ready' && file.read > draft.read;
}

/**
 * Whether this render must seed a new draft: the URL names another card, or
 * the draft follows reads and its card is now ready on a newer one. A later
 * read never touches a draft that doesn't follow, so edits survive a reload.
 */
export function needsSeed({draft, cardId, lookup, file}: Omit<SeedInput, 'seed'> & {draft: Draft}): boolean {
  if (draft.cardId !== cardId) return true;
  if (!draft.follow || lookup.kind !== 'ready') return false;
  return newerRead({draft, file});
}

/** The draft's field edit, or null for an image-only or waiting draft. */
export function fieldsOf(draft: Draft): FieldsEdit | null {
  return draft.edit?.kind === 'fields' ? draft.edit : null;
}

/** What the editor shows of the draft: its form and entry for a field edit, else why the card is image-only. */
export interface DraftView {
  form: RevealCardForm | null;
  loaded: LorcanaJSONCard | null;
  imageOnly: ImageOnlyReason | null;
}

export function draftView({edit}: Draft): DraftView {
  if (edit?.kind === 'fields') return {form: edit.form, loaded: edit.loaded, imageOnly: null};
  return {form: null, loaded: null, imageOnly: edit?.kind === 'image' ? edit.reason : null};
}

/** The open card, once its lookup is ready. */
export function openCard(lookup: EditLookup): LorcanaCard | null {
  return lookup.kind === 'ready' ? lookup.card : null;
}

/**
 * The open card's tag. It is cardTag's answer (editSearch.ts): a ready card
 * holds an entry exactly when the file, read, holds its id.
 */
export function openTag(lookup: EditLookup): CardTag | null {
  if (lookup.kind !== 'ready') return null;
  return lookup.entry === null ? 'Released' : 'Preview';
}

/** The patch applied to the form. The collector number stays as loaded: Edit never renumbers (R-91). */
export function patchDraft(draft: Draft, patch: Partial<RevealCardForm>): Draft {
  const fields = fieldsOf(draft);
  if (fields === null) return draft;
  const form = {...fields.form, ...patch, collectorNumber: fields.before.collectorNumber};
  return {...draft, edit: {...fields, form}};
}

/** The form as loaded, and no image (Discard). */
export function discardDraft(draft: Draft): Draft {
  const fields = fieldsOf(draft);
  const edit = fields === null ? draft.edit : {...fields, form: fields.before};
  return {...draft, edit, image: null};
}

/** The draft with this image staged, if it is still the draft it was chosen in. */
export function stageImage(draft: Draft, choice: {seed: number; image: File | null}): Draft {
  return draft.seed === choice.seed ? {...draft, image: choice.image} : draft;
}

/** The staged image as the editor shows it. */
export interface StagedImage {
  name: string | null;
  /** Its bytes, once read and checked (useImageUpload). */
  dataUrl: string | null;
  /** Why the file can't be used: its byte check, or a failed read. */
  error: string | null;
}

const NOTHING_STAGED: StagedImage = {name: null, dataUrl: null, error: null};

/**
 * The upload, when it holds this draft's file. A file chosen for another
 * card, and a read that lands after the card changed, show nothing.
 */
export function stagedImage({draft, upload}: {draft: Draft; upload: Pick<ImageUpload, 'file' | 'dataUrl' | 'error'>}): StagedImage {
  if (draft.image === null) return NOTHING_STAGED;
  if (upload.file !== draft.image) return NOTHING_STAGED;
  return {name: draft.image.name, dataUrl: upload.dataUrl, error: upload.error};
}

/** What the edit changes on the card (cardChanges); none for an image-only card. */
export function draftChanges(draft: Draft): PreviewCardChanges {
  const fields = fieldsOf(draft);
  return fields === null ? {} : cardChanges(fields.loaded, fields.before, fields.form);
}

/** New reveal's validator, for the edit (validateCardEdit); nothing to check on an image-only card. */
export function draftValidation({draft, imageName}: {draft: Draft; imageName: string | null}): ValidationResult {
  const fields = fieldsOf(draft);
  return fields === null ? {ok: true, errors: {}} : validateCardEdit(fields.form, imageName);
}

/**
 * The live preview: the form built as New reveal builds it (buildPreview),
 * over the staged image or else the card's current art; for an image-only
 * card, the card itself with the staged image swapped in; null until the card
 * is open.
 */
export function editPreview({card, draft, dataUrl}: {card: LorcanaCard | null; draft: Draft; dataUrl: string | null}): LorcanaCard | null {
  if (card === null) return null;
  const fields = fieldsOf(draft);
  if (fields === null) return dataUrl === null ? card : {...card, imageUrl: dataUrl};
  return buildPreview(fields.form, dataUrl ?? card.imageUrl ?? null);
}

/**
 * The preview's synergies against every other card. The list's own copy of
 * the card goes: its old values would be scored against the edit. None for
 * an image-only card, whose page shows no synergy panel (R-61, R-90).
 */
export function editSynergies({preview, draft, cards}: {preview: LorcanaCard | null; draft: Draft; cards: readonly LorcanaCard[]}): SynergyGroup[] {
  if (preview === null || fieldsOf(draft) === null) return [];
  return computeSynergies(preview, cards.filter((other) => other.id !== preview.id));
}

/**
 * previewCards.json as Edit card's search reads it, whatever card is open
 * (R-71): its ids once read, and its own error. A failed reload keeps the last
 * read's ids beside its error (R4-4a's reloadError).
 */
export interface PreviewFileView {
  status: PreviewCardsFile['status'];
  /** The file's ids (R4-4a's `ids`, which R4-2b's searchCards takes as previewIds); null until a read lands. */
  previewIds: ReadonlySet<number> | null;
  error: string | null;
}

export function previewFileView(file: PreviewCardsFile): PreviewFileView {
  if (file.status === 'ready') return {status: 'ready', previewIds: file.ids, error: file.reloadError ?? null};
  if (file.status === 'error') return {status: 'error', previewIds: null, error: file.error};
  return {status: 'loading', previewIds: null, error: null};
}
```

- [ ] **Step 6: Run it to PASS**

```bash
pnpm vitest run --project app src/tools/studio/__tests__/editorState.test.ts
```
Expected: PASS, 44 tests.

- [ ] **Step 7: Write the hook's failing test**

Create `src/tools/studio/__tests__/useCardEditor.test.ts`. It ports `useImageAdmin.test.ts`'s cases at `:54`, `:70` and `:100`, under their own names. Its card-list store copies `CardAnalyticsPage.test.tsx:12-40`. It names R4-2a's two editable entries locally: `MEI` is `PREVIEW_ENTRY` (a Singer 5), and `PRIYA` is `DUAL_INK_ENTRY`.

```ts
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook} from '@testing-library/react';
import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import type {useCardDataContext} from '../../../app-bridge';
import {DeferredReader} from '../../../test/DeferredReader';
import {imageDataUrl, pngFile} from '../../../test/images';
import {useCardEditor} from '../useCardEditor';
import {
  BRANCH_ENTRIES,
  DUAL_INK_ENTRY,
  PREVIEW_ENTRY,
  RELEASED_CARD,
  RELEASED_SONG,
  STUDIO_CARDS,
  UNNUMBERED_ENTRY,
  listCard,
} from '../studioFixtures';

/** What the editor reads from the shell's card list. */
type CardList = Pick<ReturnType<typeof useCardDataContext>, 'cards' | 'isLoading' | 'error' | 'getCardById' | 'retryLoad'>;

// The card list as a store a test moves on (loading, loaded, failed), so the
// hook re-renders as it would under the shell's CardDataProvider
// (CardAnalyticsPage.test.tsx's store). The rest of the bridge stays real:
// validateForm.ts and constants.ts read ALL_INKS, inkBlock, REVEAL_SET_CODE
// and REVEAL_ID_BASE from it.
const cardList = vi.hoisted(() => ({
  value: null as CardList | null,
  listeners: new Set<() => void>(),
  retryLoad: vi.fn(),
}));
vi.mock('../../../app-bridge', async (importOriginal) => {
  const {useSyncExternalStore} = await import('react');
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    useCardDataContext: function useCardDataContext() {
      return useSyncExternalStore(
        (onChange) => {
          cardList.listeners.add(onChange);
          return () => cardList.listeners.delete(onChange);
        },
        () => cardList.value,
      );
    },
  };
});
// previewCards.json on the branch, read through R4-4a's usePreviewCardsFile, which stays real.
const readPreviewCards = vi.hoisted(() => vi.fn());
vi.mock('../../reveal/githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../reveal/githubClient')>()),
  readPreviewCards,
}));

/** Sets the card list the hook reads. By default it has loaded, with every studio card. */
function setCardList({cards = STUDIO_CARDS, isLoading = false, error = null}: Partial<CardList> = {}) {
  const getCardById = (id: string) => cards.find((card) => card.id === id);
  cardList.value = {cards, isLoading, error, getCardById, retryLoad: cardList.retryLoad};
  act(() => cardList.listeners.forEach((onChange) => onChange()));
}

/** The next read of previewCards.json, settled when the test says. */
function deferRead() {
  let land: (cards: LorcanaJSONCard[]) => void = () => {};
  let fail: (error: Error) => void = () => {};
  readPreviewCards.mockReturnValueOnce(new Promise<LorcanaJSONCard[]>((resolve, reject) => ((land = resolve), (fail = reject))));
  return {
    land: (cards: LorcanaJSONCard[] = BRANCH_ENTRIES) => act(async () => land(cards)),
    fail: (message: string) => act(async () => fail(new Error(message))),
  };
}

const idOf = (entry: LorcanaJSONCard) => String(entry.id);
/** R4-2a's two editable preview cards: Mei (a Singer 5) and Priya. */
const MEI = PREVIEW_ENTRY;
const PRIYA = DUAL_INK_ENTRY;

/** The editor with `cardId` open, once the first read of previewCards.json has had its chance to land. */
async function renderEditor(initialProps: {cardId: string | null}) {
  const view = renderHook((props: {cardId: string | null}) => useCardEditor({token: 'tok', cardId: props.cardId}), {
    initialProps,
  });
  await act(async () => {});
  return {...view, open: (next: string | null) => view.rerender({cardId: next})};
}

type Editor = Awaited<ReturnType<typeof renderEditor>>['result'];

/** Choose a file, and finish reading its bytes. Reads finish only when a test says so (DeferredReader). */
async function stage(result: Editor, file: File) {
  act(() => void result.current.onImageChange(file));
  await DeferredReader.finish(DeferredReader.reads.length - 1);
}

const imageOf = (result: Editor) => ({name: result.current.imageName, dataUrl: result.current.imageDataUrl});
const NO_IMAGE = {name: null, dataUrl: null};

beforeEach(() => {
  // A block, not an arrow's value: mockReset() returns the mock, and Vitest calls a function a hook returns as its teardown.
  readPreviewCards.mockReset();
  readPreviewCards.mockResolvedValue(BRANCH_ENTRIES);
  cardList.retryLoad.mockReset();
  setCardList();
  DeferredReader.reset();
  vi.stubGlobal('FileReader', DeferredReader);
});

afterEach(() => vi.unstubAllGlobals());

describe('useCardEditor: the open card', () => {
  it('waits for previewCards.json before opening a card of the reveal set', async () => {
    const read = deferRead();
    const {result} = await renderEditor({cardId: idOf(MEI)});
    expect({lookup: result.current.lookup, form: result.current.form}).toEqual({lookup: {kind: 'loading'}, form: null});

    await read.land();
    expect(result.current.lookup).toMatchObject({kind: 'ready', imageOnly: null});
    expect(result.current.form?.name).toBe('Mei');
  });

  it.each([
    ['still loading', () => readPreviewCards.mockReturnValue(new Promise(() => {}))],
    ['unreadable', () => readPreviewCards.mockRejectedValue(new Error('GitHub 500 on previewCards.json'))],
  ])('opens a released card at once, image-only, while previewCards.json is %s (R-71)', async (_, branch) => {
    branch();
    const {result} = await renderEditor({cardId: RELEASED_CARD.id});
    expect(result.current.lookup).toEqual({kind: 'ready', card: RELEASED_CARD, entry: null, imageOnly: 'released'});
    expect({form: result.current.form, imageOnly: result.current.imageOnly, tag: result.current.tag}).toEqual({
      form: null,
      imageOnly: 'released',
      tag: 'Released',
    });
  });

  it('builds no form for a preview entry that opens image-only, and says why (R-65)', async () => {
    const {result} = await renderEditor({cardId: idOf(UNNUMBERED_ENTRY)});
    expect({form: result.current.form, imageOnly: result.current.imageOnly, tag: result.current.tag}).toEqual({
      form: null,
      imageOnly: 'unnumbered',
      tag: 'Preview',
    });
  });

  it('shows an unreadable previewCards.json, and Retry reads it again', async () => {
    const first = deferRead();
    const {result} = await renderEditor({cardId: idOf(MEI)});
    await first.fail('GitHub 500 on previewCards.json');
    expect(result.current.lookup).toEqual({kind: 'fileFailed', error: 'GitHub 500 on previewCards.json'});

    await act(async () => result.current.retry());
    expect(result.current.form?.name).toBe('Mei');
    expect({reads: readPreviewCards.mock.calls.length, listRetries: cardList.retryLoad.mock.calls.length}).toEqual({
      reads: 2,
      listRetries: 0,
    });
  });

  it('Retry loads a failed card list again, and leaves the file alone', async () => {
    setCardList({cards: [], error: new Error('offline')});
    const {result} = await renderEditor({cardId: null});
    expect(result.current.lookup).toMatchObject({kind: 'listFailed'});

    act(() => result.current.retry());
    expect({reads: readPreviewCards.mock.calls.length, listRetries: cardList.retryLoad.mock.calls.length}).toEqual({
      reads: 1,
      listRetries: 1,
    });
  });

  it('waits for the card list, then opens the card, or says the id is missing', async () => {
    setCardList({cards: [], isLoading: true});
    const {result, open} = await renderEditor({cardId: null});
    // previewCards.json has landed; the card still waits for the list.
    open(idOf(MEI));
    expect(result.current.lookup).toEqual({kind: 'loading'});

    setCardList();
    expect({lookup: result.current.lookup, name: result.current.form?.name}).toMatchObject({
      lookup: {kind: 'ready', card: listCard(MEI)},
      name: 'Mei',
    });
    open('14999');
    expect(result.current.lookup).toEqual({kind: 'missing', cardId: '14999'});
  });

  it('gives the search previewCards.json’s own state, with no card open', async () => {
    const read = deferRead();
    const {result} = await renderEditor({cardId: null});
    expect(result.current.previewFile).toMatchObject({status: 'loading', previewIds: null});

    await read.land();
    expect(result.current.previewFile.previewIds).toEqual(new Set(BRANCH_ENTRIES.map((entry) => entry.id)));
  });
});

describe('useCardEditor: the draft', () => {
  it('edits the form, lists the change, and discards it', async () => {
    const {result} = await renderEditor({cardId: idOf(MEI)});
    act(() => result.current.patchForm({name: 'Meilin'}));
    expect({
      changes: result.current.changes,
      dirty: result.current.dirty,
      preview: result.current.previewCard?.fullName,
    }).toEqual({
      changes: [{id: 'name', label: 'Name', from: 'Mei', to: 'Meilin'}],
      dirty: true,
      preview: 'Meilin - Red Panda',
    });

    act(() => result.current.discard());
    expect({name: result.current.form?.name, changes: result.current.changes, dirty: result.current.dirty}).toEqual({
      name: 'Mei',
      changes: [],
      dirty: false,
    });
  });

  it('opens the next card with its own form, and drops the last card’s edits', async () => {
    const {result, open} = await renderEditor({cardId: idOf(MEI)});
    act(() => result.current.patchForm({name: 'Meilin'}));

    open(idOf(PRIYA));
    expect({name: result.current.form?.name, dirty: result.current.dirty}).toEqual({name: 'Priya', dirty: false});
    open(idOf(MEI));
    expect(result.current.form?.name).toBe('Mei');
  });

  it('keeps the edits when previewCards.json is read again', async () => {
    const {result} = await renderEditor({cardId: idOf(MEI)});
    act(() => result.current.patchForm({name: 'Meilin'}));

    readPreviewCards.mockResolvedValue([{...MEI, rarity: 'Legendary'}, PRIYA]);
    await act(async () => result.current.previewFile.reload());
    expect(readPreviewCards).toHaveBeenCalledTimes(2);
    expect(result.current.changes.map((row) => row.id)).toEqual(['name']);
  });
});

describe('useCardEditor: the staged image (useImageAdmin.test.ts’s cases)', () => {
  it('clears the staged image when a different card is opened', async () => {
    const {result, open} = await renderEditor({cardId: RELEASED_CARD.id});
    await stage(result, pngFile('a.png'));
    expect({...imageOf(result), dirty: result.current.dirty}).toEqual({name: 'a.png', dataUrl: imageDataUrl('a.png'), dirty: true});

    // Card A's upload must never be saved against card B's id.
    open(RELEASED_SONG.id);
    expect({...imageOf(result), dirty: result.current.dirty}).toEqual({...NO_IMAGE, dirty: false});
  });

  it("never offers one file's bytes under another file's name", async () => {
    const {result} = await renderEditor({cardId: RELEASED_CARD.id});
    act(() => void result.current.onImageChange(pngFile('a.png')));
    await DeferredReader.finish(0);
    expect(imageOf(result)).toEqual({name: 'a.png', dataUrl: imageDataUrl('a.png')});

    act(() => void result.current.onImageChange(pngFile('b.webp')));
    expect(imageOf(result)).toEqual({name: 'b.webp', dataUrl: null});
    await DeferredReader.finish(1);
    expect(imageOf(result)).toEqual({name: 'b.webp', dataUrl: imageDataUrl('b.webp')});
  });

  it('drops a read that finishes after switching cards', async () => {
    const {result, open} = await renderEditor({cardId: RELEASED_CARD.id});
    act(() => void result.current.onImageChange(pngFile('a.png')));
    open(RELEASED_SONG.id);

    await DeferredReader.finish(0);
    expect(imageOf(result)).toEqual(NO_IMAGE);
  });

  it('doesn’t bring a card’s image back when the card is opened again', async () => {
    const {result, open} = await renderEditor({cardId: RELEASED_CARD.id});
    await stage(result, pngFile('a.png'));
    open(RELEASED_SONG.id);
    open(RELEASED_CARD.id);
    expect(imageOf(result)).toEqual(NO_IMAGE);
  });

  it('lists a staged image on a preview card, and Revert image drops it', async () => {
    const {result} = await renderEditor({cardId: idOf(MEI)});
    await stage(result, pngFile('mei.png'));
    expect({changes: result.current.changes, preview: result.current.previewCard?.imageUrl}).toEqual({
      changes: [{id: 'image', label: 'Image', from: 'current art', to: 'mei.png'}],
      preview: imageDataUrl('mei.png'),
    });

    act(() => result.current.revertImage());
    expect({...imageOf(result), changes: result.current.changes, preview: result.current.previewCard?.imageUrl}).toEqual({
      ...NO_IMAGE,
      changes: [],
      preview: listCard(MEI).imageUrl,
    });
  });

  it('says why a staged file can’t be used', async () => {
    const {result} = await renderEditor({cardId: RELEASED_CARD.id});
    act(() => void result.current.onImageChange(pngFile('scan.png')));
    await act(async () => DeferredReader.reads[0].fail());
    expect({...imageOf(result), error: result.current.imageError}).toEqual({
      name: 'scan.png',
      dataUrl: null,
      error: 'Could not read the image: read failed',
    });
  });
});

describe('useCardEditor: synergies', () => {
  const groupIds = (result: Editor) => result.current.synergyGroups.flatMap((group) => group.synergies.map((s) => s.card.id));

  it('finds the edit’s synergies live, and none for an image-only card', async () => {
    const {result, open} = await renderEditor({cardId: idOf(MEI)});
    // Mei's Singer 5 sings the released song; without the keyword, she can't.
    expect(groupIds(result)).toContain(RELEASED_SONG.id);

    act(() => result.current.patchForm({keywords: ''}));
    expect(groupIds(result)).not.toContain(RELEASED_SONG.id);
    open(RELEASED_CARD.id);
    expect(result.current.synergyGroups).toEqual([]);
  });
});
```

- [ ] **Step 8: Run it, and see it fail**

```bash
pnpm vitest run --project app src/tools/studio/__tests__/useCardEditor.test.ts
```
Expected: FAIL, with `Error: Failed to resolve import "../useCardEditor" from "src/tools/studio/__tests__/useCardEditor.test.ts". Does the file exist?`, and no tests run.

- [ ] **Step 9: Write `useCardEditor.ts`**

```ts
import {useState, type Dispatch, type SetStateAction} from 'react';
import type {LorcanaCard, SynergyGroup} from 'inkweave-synergy-engine';
import {useCardDataContext} from '../../app-bridge';
import {useImageUpload} from '../../components/useImageUpload';
import type {RevealCardForm} from '../reveal/buildPreviewCard';
import {imageErrorOf} from '../reveal/livePreview';
import type {ValidationResult} from '../reveal/validateForm';
import {hasEdits, type ImageOnlyReason} from './cardEdit';
import {changeRows, type ChangeRow} from './changeRows';
import type {CardTag} from './editSearch';
import {
  discardDraft,
  draftChanges,
  draftValidation,
  draftView,
  editLookup,
  editPreview,
  editSynergies,
  needsSeed,
  openCard,
  openTag,
  patchDraft,
  previewFileView,
  seedDraft,
  stageImage,
  stagedImage,
  type Draft,
  type EditLookup,
  type PreviewFileView,
} from './editorState';
import type {PreviewCardsFile} from './previewCardsFile';
import {usePreviewCardsFile} from './usePreviewCardsFile';

export interface CardEditorInput {
  /** The saved GitHub token: the studio renders the editor only under the token gate. */
  token: string;
  /** The URL's card id (?card=), or null for the search. */
  cardId: string | null;
}

export interface CardEditorController {
  /** The open card, in cardPageState's order (editorState.ts). */
  lookup: EditLookup;
  /** Reads again what failed: the card list (its retryLoad), previewCards.json, or both. */
  retry: () => void;
  /** previewCards.json for the search, whatever card is open (R-71); `reload` reads it again. */
  previewFile: PreviewFileView & {reload: () => void};
  /** The open card's tag, as the search tags it (cardTag); null until it is ready. */
  tag: CardTag | null;
  /** The form now; null for an image-only card, and until the card is ready. */
  form: RevealCardForm | null;
  /** Why the open card is image-only (R-61, R-65), or null. */
  imageOnly: ImageOnlyReason | null;
  patchForm: (patch: Partial<RevealCardForm>) => void;
  validation: ValidationResult;
  /** The change list: a row per changed card key, then the staged image's. */
  changes: ChangeRow[];
  /** A changed card key or a staged image (hasEdits): what the guard and Save read. */
  dirty: boolean;
  /** The form as loaded, and no image. */
  discard: () => void;
  previewCard: LorcanaCard | null;
  synergyGroups: SynergyGroup[];
  imageName: string | null;
  /** The staged image's bytes; null while they are read, and for a file that fails its check. */
  imageDataUrl: string | null;
  /** The staged file's own error, else the validator's image error (imageErrorOf, as New reveal derives it). */
  imageError: string | null;
  /** Stage a file for this card (null clears it). Resolves once its bytes are read. */
  onImageChange: (file: File | null) => Promise<void>;
  revertImage: () => void;
}

/**
 * The draft for the card on screen. Another card, or the first read its card
 * waits for, seeds a new one during render (no effect, no ref), as
 * CardAnalyticsPage resets its own state: no frame pairs one card's form or
 * image with another card.
 */
function useEditDraft(input: {cardId: string | null; lookup: EditLookup; file: PreviewCardsFile}) {
  const [draft, setDraft] = useState<Draft>(() => seedDraft({...input, seed: 0}));
  if (needsSeed({...input, draft})) setDraft(seedDraft({...input, seed: draft.seed + 1}));
  return [draft, setDraft] as const;
}

/** The staged image's controls. Each acts on the upload in its own event, never during render. */
function useDraftImage(draft: Draft, setDraft: Dispatch<SetStateAction<Draft>>) {
  const upload = useImageUpload();
  return {
    staged: stagedImage({draft, upload}),
    onImageChange(image: File | null) {
      const {seed} = draft;
      setDraft((d) => stageImage(d, {seed, image}));
      return upload.choose(image);
    },
    revertImage() {
      setDraft((d) => ({...d, image: null}));
      void upload.choose(null);
    },
    discard() {
      setDraft(discardDraft);
      void upload.choose(null);
    },
  };
}

/**
 * Edit card's controller (R4-4b: loading and editing; R4-4c adds saving).
 * The card comes from the shell's card list, its entry and kind from
 * previewCards.json on the target branch (R-71: only a card of the reveal set
 * waits for it), and the draft from both. Every rule lives in editorState.ts;
 * this hook is wiring.
 */
export function useCardEditor({token, cardId}: CardEditorInput): CardEditorController {
  const list = useCardDataContext();
  const file = usePreviewCardsFile(token);
  const lookup = editLookup({cardId, list, file});
  const [draft, setDraft] = useEditDraft({cardId, lookup, file});
  const image = useDraftImage(draft, setDraft);
  const {staged} = image;
  const view = draftView(draft);
  const changes = draftChanges(draft);
  const validation = draftValidation({draft, imageName: staged.name});
  const previewCard = editPreview({card: openCard(lookup), draft, dataUrl: staged.dataUrl});

  function retry() {
    if (list.error) list.retryLoad();
    if (file.status === 'error') void file.reload();
  }

  return {
    lookup,
    retry,
    previewFile: {...previewFileView(file), reload: () => void file.reload()},
    tag: openTag(lookup),
    form: view.form,
    imageOnly: view.imageOnly,
    patchForm: (patch) => setDraft((d) => patchDraft(d, patch)),
    validation,
    changes: changeRows({loaded: view.loaded, changes, imageName: staged.name}),
    dirty: hasEdits({changes, imageName: staged.name}),
    discard: image.discard,
    previewCard,
    synergyGroups: editSynergies({preview: previewCard, draft, cards: list.cards}),
    imageName: staged.name,
    imageDataUrl: staged.dataUrl,
    imageError: imageErrorOf(staged, validation),
    onImageChange: image.onImageChange,
    revertImage: image.revertImage,
  };
}
```

- [ ] **Step 10: Run both to PASS, beside R4-2a's fixture test**

```bash
pnpm vitest run --project app src/tools/studio/__tests__/editorState.test.ts src/tools/studio/__tests__/useCardEditor.test.ts src/tools/studio/__tests__/studioFixtures.test.ts
```
Expected: PASS, `Test Files  3 passed (3)` and `Tests  65 passed (65)`: 44, 18, and R4-2a's 3, which Step 2's append leaves passing. Run it once more with `--silent=false`: no `act(...)` warning.

- [ ] **Step 11: Lint and typecheck**

```bash
pnpm exec eslint --max-warnings 0 src/tools/studio/editorState.ts src/tools/studio/useCardEditor.ts src/tools/studio/studioFixtures.ts src/tools/studio/__tests__/editorState.test.ts src/tools/studio/__tests__/useCardEditor.test.ts
pnpm typecheck
```
Expected: no output from eslint, and the typecheck exits 0. The render-time `setDraft` in `useEditDraft` passes `react-hooks` and `react-compiler`, like `CardAnalyticsPage`'s.

- [ ] **Step 12: Code Health**

Run CodeScene's `code_health_review` on each of the five files. Expected: 10.0 with no findings for each. If one drops, fix it, review it again, and confirm with `code_health_score`.

The PR gate is stricter than the local tool, so hand-count against its limits:
- **Primitive parameters:** `editorState.ts` 0 of 24, `useCardEditor.ts` 0 of 5, `studioFixtures.ts` 1 of 6 (R4-2a's private `ruby(offset)`; this task's `listCard` takes an entry), `editorState.test.ts` 0 of 6, `useCardEditor.test.ts` 1 of 8 (`getCardById`'s `id`).
- **Complexity:** the largest is `editLookup`, at about 5. `needsSeed`, `editPreview` and `draftView` are about 4.
- **Arguments:** no function takes more than two.
- **Conditions:** no condition joins more than two terms.

- [ ] **Step 13: Commit**, with the Bash tool, only after the owner approves. Use separate calls, so the commit command starts with `USER_APPROVED=1`:
```bash
git add src/tools/studio/editorState.ts src/tools/studio/useCardEditor.ts src/tools/studio/studioFixtures.ts src/tools/studio/__tests__/editorState.test.ts src/tools/studio/__tests__/useCardEditor.test.ts
```
Run `pre_commit_code_health_safeguard` (CLAUDE.md), then:
```bash
USER_APPROVED=1 git commit -m "feat(studio): add the Edit card controller's loading side (#24)"
```
The pre-commit hook runs the full lint and `test:run`. If its Vitest workers fail to start under load, see the "pre-commit worker timeout" memory: stop your own preview servers and retry. Never use `--no-verify`.

### Hand-offs from R4-4b

- **To R4-4c (the save side).**
  - **Port `useImageAdmin.test.ts:84` and `:92` there,** in a test file of its own, with helpers like this file's `renderEditor`, `stage` and `open` (they are private to this file). Use a deferred commit helper generalised over `commitCardImage` and `commitCardEdit`, from `publishingCardA` (`:31-43`). The two cases:
    - "Saving clears the card's image once the commit lands, and keeps the card open" (R-70): `lookup` stays `ready` on the same card, `imageName` is null and `result` is set.
    - "A card picked while the save ran keeps its form and image, and the save's outcome is dropped" (R-69): after `open(B)` and the commit landing, B's staged image and form are unchanged, and `result` and `saveError` are null.
  - **The draft's hooks for the save.**
    - `Draft.seed` scopes an outcome (R-69).
    - `fieldsOf(draft)` gives `loaded`, `before` and `form` for `commitCardEdit` and `applySaved`, which sets `{...fields, loaded: committed, before: savedForm}` only while the seed matches (R-70).
    - On success, `draft.image` is set back to null for the saved File, beside `upload.clearIf(file)`. `useDraftImage` returns only `staged` and its three actions today, so extend it to expose what the save needs: the File and its `dataUrl`, and a `clearIf`.
  - **Load it again (R-68).** It sets `follow: true` and `read: file.requested` (R4-4a's hand-off), then reloads, so `needsSeed` fires on the read it asked for. Keeping `read` would re-seed at once from a read that may predate the change that refused the save, since a landed save's `commit` moves the file's `read` past the draft's. Write a variant of `seedDraft` that keeps the fields whose fresh value still equals `before` and carries `image`. The seed it bumps is what drops a stale outcome, so the refusal clears on that re-seed, not on the click.
  - **`retry`** returns `void` here. Make it resolve when its read lands (the R-59 handoff).
  - **Complexity.** Put the save in its own hook (`useEditSave`), so `useCardEditor` stays wiring.
- **To R4-4d (cards only in the branch file, R-66).**
  - `editLookup` returns `missing` for any id the list lacks. A branch-only entry needs the union of both sources first. Its list card can come from the bridged `transformRawCards` (`loader.ts:173` at `16283a13`), which sets `imageUrl`.
  - `editLookup` reads "a card of the reveal set the file lacks" as released and image-only (this task's test row). R-66 makes that the graduated-id state: no save, and the "no longer in previewCards.json" message. Refine the lookup there, and leave this row as it is.
- **To R4-5f and R4-6b (the views and the page).**
  - Switch on `lookup.kind` (Behaviour table).
  - **Image-only notes.** Read `imageOnly` with R4-2a's `IMAGE_ONLY_NOTES`. Show no synergy panel when `form` is null (R-61, R-90).
  - **Forget token.** `fileFailed.error` and `previewFile.error` start "GitHub 401 on" for a rejected token, so offer Forget token there (R-26, R-71, R-84).
  - **Focus (R-59).** The page asks for the handoff when `lookup.kind` leaves `listFailed` or `fileFailed`, the way R3's `useCardHandoff` watches `failed`.
  - **Keys and titles.** Key the editor view by `lookup.card.id` (R-46). `documentTitle` reads `lookup.card.fullName` while the card is ready (R-51).
- **To R4-6b (R-66).** After a New reveal publish lands, read Edit's file again through R4-4d's `reloadFile` (the header's addition 11; here it would be `previewFile.reload()`), so the new card is tagged Preview and opens at once. Neither re-seeds the open draft.
