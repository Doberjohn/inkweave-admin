> Part of [R: Admin redesign](../R-redesign.md), phase R4 ([R4-card-studio.md](R4-card-studio.md)). Read the main plan's decisions (R-57 to R-91 for R4), corrections, global constraints and shared interfaces, then the R4 header, first.

> **Re-base notes** (R4-4d, 2026-10-07, against main @ `e5e5029`, pin `16283a13` and decisions R-57 to R-91)
> - **Where it comes from.** The outline has no such task. R-66 (the outline's open question 8, settled 2026-10-07) adds it, on the audit's recommendation (`r4-audit-full.json`, questions, number 8, and R4-4's new question 5). The R4 header's contract addition 11 gives R4-4d the `gone` lookup state, the union search list, `searchCards`, `branchOnlyIds`, `deployed` and `reloadFile`; this file adds the rest R-66 asks for. The audit cited pin `bc877e1`. Every app fact below was re-checked at `16283a13`.
> - **The app facts at `16283a13`.**
>   - The card list is what inkweave.ink serves, loaded once per session: `allCards.json` plus the deployed `previewCards.json`, merged by `fetchCardsFromLocal` (`apps/web/src/features/cards/loader.ts:192-240`). On an id in both, allCards wins: the preview entry is dropped (`:212-213`).
>   - `transformRawCards(cards: readonly LorcanaJSONCard[]): LorcanaCard[]` is exported (`loader.ts:173-180`). It runs the app's private `transformCard` (`:93-105`): the engine's transform, plus `imageUrl` (`resolveImageUrl`, `:44-66`), the two image hashes, `scanLanguage`, and `variants` as printings with their own `imageUrl` and `scanLanguage` (`toPrinting`, `:108-117`). It drops an entry the engine refuses. The engine's own `transformCard`, which New reveal's `buildPreview` uses (`src/tools/reveal/livePreview.ts`, from R4-3b), sets neither `imageUrl` nor `scanLanguage`.
>   - **Art.** Admin never sets `VITE_LOCAL_IMAGES` (`vite.config.ts`, `.env.example`), so `USE_LOCAL_IMAGES` is false (`loader.ts:37`). A preview entry has no `images.thumbnail` (none of the 204 pinned entries has `images` or an `imageHash`), so its `imageUrl` is `/card-images-preview/{id}.avif` (`:58`), a forwarded path (`forwarded-paths.json`), exactly as the card list's own preview cards get it. Until the convert workflow and the deploy have run, that URL answers 404 and `CardTile` falls back to its ink-tinted cost badge (`CardTile.tsx:60`, `:80`).
>   - **Ids.** A preview id is `setNumber * 1000 + number`, or the `+900..+999` band for an unnumbered card, "clear of allCards.json's sequential ids" (`apps/web/src/shared/constants/revealSet.ts:15-22`). The pinned `allCards.json` holds 1,024 cards, highest id 3178, and none of them falls in its own set's band. Graduation releases the set under canonical ids and empties `previewCards.json` (`scripts/graduate-canonical-set.mjs:10`, `:359-373`).
>   - The pinned file: 204 cards, all set 14 and numbered, 38 with `variants`. One printing has a scan language (14213, the Epic of 14085, `it`).
> - **R4-4b's names.** This task builds on R4-4b's `editorState.ts` and `useCardEditor.ts` as R4-4c leaves them (`R4-04b-editor-loading.md`, `R4-04c-editor-saving.md`), which is the header's addition 11: `EditLookup` keyed by `kind` (`listFailed`, `none`, `loading`, `missing`, `fileFailed`, `ready`), `editLookup({cardId, list, file})`, a ready lookup `{card, entry, imageOnly}`, `openCard`, `openTag`, and the controller's `previewFile`. `gone` joins as `{kind: 'gone'; card}`. An earlier draft of this file was written against a stand-in for R4-4b that used `CardLookup`, `state`, `'file-error'`, `lookupOf` and a ready lookup with `tag` and `kind`; none of those names exists, and nothing below uses them.
> - **The union (R-66).** `editSources({list, file})` gives Edit card's two sources as it reads them. Its `list` is the card list with every branch-file entry the card list lacks, built through the bridged `transformRawCards`, plus `branchOnlyIds`. Its `getCardById` finds both kinds. The hook reads its card list and its file through it in one line, so R4-4b's `editLookup`, the draft (R4-4b's `seedDraft` opens what the lookup opens), the synergies (`list.cards`), `retry` and R4-4c's save side all see the branch-only cards with no change of their own. R4-4b's controller has no search list, so the controller gains `searchCards: list.cards` (the header lists it under R4-4d): without it, the page could only search the shell's card list, which lacks these cards.
>   - **Nothing while either source is unread or failed.** An unread card list would make every file entry look branch-only.
>   - **Branch-only cards lead.** They are the newest, so R4-2b's `previewFirst` lists them first on a blank query (R-76). A card New reveal just published is then at the top, not behind 204 deployed preview cards.
>   - **Everything else passes through.** That covers `retryLoad`, `isLoading` and `error` on the list, and `reload`, `commit`, `requested` and `read` on the file (the spreads keep them). R4-4a's and R4-4c's code doesn't change.
> - **"An id in both reads as Released" (R-66).** Admin can't see `allCards.json` apart from `previewCards.json`, because the shell's card list merges them. The preview-id band tells them apart: a card-list card with a preview id came from `previewCards.json`, and any other from `allCards.json` (`hasPreviewId`, from `revealSet.ts:15-22`). So `editSources` drops from the file any entry whose id the card list holds as allCards' card. `editLookup` then finds no entry for that card and opens it ready with `imageOnly: 'released'`, the draft builds no form, and `previewFile.previewIds` lacks the id, so the search tags it Released too. Each reads Released with no gate of its own. With well-formed files this never fires: no allCards.json id falls in its set's band (above), and the app's integrity test refuses a non-band preview id (`apps/web/src/shared/constants/__tests__/reveal-set-integrity.test.ts:56-58`). The guard is cheap, and R-66 asks for it.
> - **Gone (R-66).** `branchLookup({lookup, file})` refines `editLookup`'s answer with two cases only the branch file can decide:
>   - **Gone.** `editLookup` opens a reveal-set card only once the file is read (R-71, its private `cardLookup`), and with `entry: null` when the file lacks it: image-only, `imageOnly: 'released'`. That is R4-4b's test row "a card of the reveal set the file lacks", which R4-4b hands to this task. When that card has a preview id, it is gone. Graduation is the case: inkweave.ink lists the old 14xxx ids until it deploys, while the branch file is `cards: []`. Left as R4-4b reads it, an image save would commit `card-images-raw/14xxx` for an id the app no longer has. Gone gets no form (R4-4b's `seedDraft` builds none for a lookup that isn't ready, and `needsSeed` waits for a ready one) and no save (R4-4c's save side takes `card: openCard(lookup)`, which is null for gone, and `savePlanOf` returns null without a card). `goneNote(card)` gives the sentence, worded like R4-1b's stale refusal ("… is no longer in previewCards.json on {branch} …").
>   - **Missing waits for the file.** An id the card list lacks may be one only the file holds. So instead of reading `missing` as soon as the card list loads, it reads `loading` until the file lands, and a failed read shows the file's error (`fileFailed`) with R4-4b's Retry. The audit's "missing means neither source has the id".
>   - **In the search,** a gone card keeps R4-2b's tag: Released, since the file lacks its id. That is true of the card, which was released, and opening it shows `goneNote`.
>   - **R4-4c's stale refusal.** "Card {id} is no longer in previewCards.json on {branch}. Load it again." now ends, once Load it again's read lands, on gone rather than on an image-only card.
> - **`deployed` sits on the controller, not inside the ready lookup.** R4-4b builds the ready lookup (`opened` in `editLookup`), and a required field there would mean editing every place 4b builds one. So the controller gains `deployed` (false while the open card is branch-only), and `SearchRow` gains `deployed` per row. One helper, `isDeployed`, decides both. `searchCards`' input gains an optional `branchOnlyIds` (none means every row is deployed), so R4-2b's tests stay as they are.
> - **After a New reveal publish (R-66).** The controller gains `reloadFile()`, the header's name for it. It reads `previewCards.json` again exactly as R4-4b's `previewFile.reload()` does (R4-4a's `reload`). The draft follows only a first read or Load it again (R4-4b's `needsSeed`), so the open draft keeps its edits. R4-6b calls it once a New reveal publish lands (the header gives R4-6b that wiring), so the new card is in the search at once.
> - **The "~2-3 min" note.** R-66 also corrects New reveal's go-live note: `RevealPage.tsx:26` says "~2-3 min", and `REVEAL_RUNBOOK.md:34` says "Allow 15 to 20 minutes". The header gives the new note to R4-6a (contract addition 13, "Labels and notes"), whose New reveal pane writes it. `RevealPage.tsx` is deleted in R4-6c, in the same PR, so the old string never ships. This task leaves `RevealPage.tsx` alone.
> - **Edit's synergies** run over the union, because they read the hook's `list.cards` (R4-4b's `editSynergies`). A branch-only card counts as a partner, as it will once deployed. New reveal's stay on the card list (`useRevealAdmin`'s `cards`, from `useCardDataContext`).
> - **R4-4b's draft doesn't loop.** The earlier draft of this file reported "Too many re-renders" from its stand-in's `seedDraft`. R4-4b's real `needsSeed` re-seeds only once the lookup is ready, so no card, an unknown id, a waiting id and gone all settle; this task's hook tests run against R4-4b's and R4-4c's real hook.
> - **What this file touches of R4-4b's code,** which Step 1 finds:
>   1. `EditLookup` in `editorState.ts` (one variant);
>   2. in `useCardEditor.ts`, the three lines that read `useCardDataContext()`, `usePreviewCardsFile(token)` and `editLookup(…)`;
>   3. the controller's interface and return.
>
>   It renames nothing. If R4-4b landed with other local names, keep them.
> - **Code Health.** Counted by hand over the final code (lambdas included):
>   - `branchCards.ts` has 0 primitive parameters in its 12 named functions, and 1 in 18 with its lambdas (`getCardById`'s `id`), 5.6%. Its highest cyclomatic complexity is 4 (`branchOnlyCards`, `branchLookup`), and no condition chains two operators.
>   - `editSearch.ts` gains a defaulted object field and one object lambda, so it stays at 0 primitives (R4-2b's count).
>   - `useCardEditor.ts` gains no branch and no parameter: the new fields are calls and one parameterless arrow.
>   - `editorState.ts` gains one type variant.
>   - The tests' `it.each` tables use object rows, so their callbacks take one object.
> - **Gates once.** Steps run the three test files, `web.test.mjs` (the bridge changed), eslint on the nine changed files and one `pnpm typecheck`, then Code Health. The pre-commit hook runs the full lint and `test:run`.
> - **Verified** in `scratchpad/r4-rebase/sandbox-v-R4-4d`, a copy of `sandbox-R4-4c` (main `b490fb7` plus the uncommitted bump to `16283a13`). It carries R4-4b's `editorState.ts` and `useCardEditor.ts` as R4-4c leaves them, with R4-4b's two test files (over R4-4b's own fixtures, kept apart there as `studioFixtures4b.ts`), R4-4c's `editSave.ts`, `useEditSave.ts` and their tests, R4-4a's two modules, R4-1a's, R4-1b's and R4-3b's modules, and R4-2a's `studioFixtures.ts` and R4-2b's `editSearch.ts` and `editSearch.test.ts` as their task files have them. `node_modules` and `upstream/` are junctions, and Vite's cache stays in the sandbox.
>   - **Red.** Step 3 fails on `Failed to resolve import "../branchCards"`. Step 6 gives `2 failed | 17 passed (19)`. Step 8 gives `8 failed (8)` against R4-4c's hook, with the messages quoted there.
>   - **Green.** `src/tools/studio`: 7 files, 164 tests. This task's three files give 30, 19 and 8. R4-4b's `editorState.test.ts` (44) and `useCardEditor.test.ts` (18) and R4-4c's `editSave.test.ts` (25) and `useCardEditor.save.test.ts` (20) pass unchanged beside them. `web.test.mjs`: 2 passed.
>   - **Typecheck.** `tsc -p tsconfig.app.json` exits 0, and a planted error is reported.
>   - **Lint.** All nine files pass `pnpm exec eslint --max-warnings 0 --stdin`, run in the repo. That includes the hook calls passed as `editSources`' arguments, under react-hooks and react-compiler.
>   - **CodeScene** (local MCP 1.5.7, in a scratch git directory). `branchCards.ts`, `editSearch.ts`, `editorState.ts`, `studioFixtures.ts`, `useCardEditor.ts` (R4-4b's and R4-4c's hook with this task's lines) and the three test files score 10.0 with no findings.
>   - **Mutants.** 18 of 18 were killed, each by 1 to 4 tests:
>     - branch-only cards appended rather than first;
>     - no card-list loading guard; no card-list error guard;
>     - no allCards filter;
>     - missing not waiting for a loading file; missing not showing a failed read;
>     - no gone; gone without the set check; gone without the band check; gone for a card the file holds;
>     - `deployedOf` inverted;
>     - `getCardById` not finding branch-only cards;
>     - `hasPreviewId` without its upper bound;
>     - rows always deployed;
>     - `reloadFile` doing nothing;
>     - `searchCards` without the branch-only cards;
>     - the hook skipping `branchLookup`;
>     - the controller's `deployed` always true.

### Task R4-4d: Cards only in the branch file (R-66)

**Files:**
- Modify `src/app-bridge.ts`: the loader export (main's `:60-62`, `:62-64` after R4-5a's two lines) gains `transformRawCards`, with its comment.
- Create `src/tools/studio/branchCards.ts`: `editSources`, `hasPreviewId`, `branchLookup`, `isDeployed`, `deployedOf`, `goneNote`.
- Modify `src/tools/studio/editorState.ts` (R4-4b): `EditLookup` gains `{kind: 'gone'; card: LorcanaCard}`, unless R4-4b already declared it.
- Modify `src/tools/studio/editSearch.ts` (R4-2b): `SearchRow` gains `deployed`, and `EditSearchInput` gains an optional `branchOnlyIds`.
- Modify `src/tools/studio/useCardEditor.ts` (R4-4b, R4-4c): it reads through `editSources` and `branchLookup`, and the controller gains `searchCards`, `branchOnlyIds`, `deployed` and `reloadFile`.
- Modify `src/tools/studio/studioFixtures.ts` (R4-2a): `BRANCH_ONLY_ENTRY`.
- Create `src/tools/studio/__tests__/branchCards.test.ts` and `src/tools/studio/__tests__/useCardEditorBranch.test.ts`.
- Modify `src/tools/studio/__tests__/editSearch.test.ts` (R4-2b): two cases.
- Leave these alone:
  - `src/tools/reveal/RevealPage.tsx` (R4-6a writes the new note, and R4-6c deletes the page);
  - `src/github/githubCommit.ts`;
  - every reveal-sync contract file;
  - R4-4b's and R4-4c's test files, which pass unchanged.

**Interfaces:**
- **Consumes:**
  - **The pinned app, through the bridge:** `transformRawCards` as described in the re-base notes, and `PINNED_PREVIEW_CARDS_JSON`, `REVEAL_ID_BASE` and `REVEAL_SET_CODE` (`app-bridge.ts`, unchanged).
  - **`targetBranch()`** (`src/github/githubCommit.ts:14-16`). `vite.config.ts:51` pins `VITE_ADMIN_TARGET_BRANCH` to `''`, so tests read `master`.
  - **`REVEAL_SET_CODE`**, re-exported at `src/tools/reveal/constants.ts:51`.
  - **From the shell's card list** (`useCardDataContext`): `cards`, `isLoading`, `error`, `retryLoad` (`apps/web/src/features/synergies/hooks/useCardData.ts:18-31` at the pin), and `getCardById` (`apps/web/src/shared/contexts/CardDataContext.tsx:29`).
  - **From R4-4a** (`src/tools/studio/previewCardsFile.ts`, `usePreviewCardsFile.ts`):
    ```ts
    export type PreviewCardsFile =
      | {status: 'loading'}
      | {status: 'ready'; cards: LorcanaJSONCard[]; ids: ReadonlySet<number>; read: number; reloadError?: string}
      | {status: 'error'; error: string};
    export type UsePreviewCardsFileResult = PreviewCardsFile & {
      requested: number;
      reload: () => Promise<LorcanaJSONCard[] | null>;
      commit: (entry: LorcanaJSONCard) => void;
    };
    export function usePreviewCardsFile(token: string): UsePreviewCardsFileResult;
    ```
  - **From R4-2a** (`studioFixtures.ts`): `previewEntry(overrides)`, `studioCard(seed)`, `cardOf(entry)` (the engine's transform, as the card list's cards look in tests), `PREVIEW_ENTRY` (Mei, `REVEAL_ID_BASE + inkBlock('Ruby').first`, which is 14103 at the pin), `RELEASED_CARD` (set 9, id `'1001'`), and the private `ruby(offset)`. Offsets 1 to 5 go through `ruby`, and `CURLY_APOSTROPHE_CARD` takes `RUBY_NUMBER + 6` directly.
  - **From R4-2b** (`editSearch.ts`):
    ```ts
    export type CardTag = 'Preview' | 'Released';
    export interface SearchRow {card: LorcanaCard; tag: CardTag | null}
    export interface EditSearchInput {cards: readonly LorcanaCard[]; query: string; previewIds: ReadonlySet<number> | null}
    export function searchCards({cards, query, previewIds}: EditSearchInput): EditSearchResult;   // previewFirst, then filterCards
    ```
    It also brings the test file's `card(p)` and `revealCard(number, p)` helpers.
  - **From R4-4b** (`editorState.ts`, `useCardEditor.ts`):
    ```ts
    export type EditLookup =
      | {kind: 'listFailed'; error: Error}
      | {kind: 'none'}
      | {kind: 'loading'}
      | {kind: 'missing'; cardId: string}
      | {kind: 'fileFailed'; error: string}
      | {kind: 'ready'; card: LorcanaCard; entry: LorcanaJSONCard | null; imageOnly: ImageOnlyReason | null};
    export function editLookup(input: {cardId: string | null; list: CardListState; file: PreviewCardsFile}): EditLookup;
    //   a reveal-set card waits for the file (loading, fileFailed) and opens once it is read, with entry null when the
    //   file lacks it; any other card opens at once (R-71); an id the list lacks is missing
    export function openCard(lookup: EditLookup): LorcanaCard | null;   // the ready lookup's card
    export function openTag(lookup: EditLookup): CardTag | null;        // ready only: Preview with an entry, else Released
    // seedDraft builds no form for a lookup that isn't ready, and needsSeed re-seeds only once the lookup is ready
    export function useCardEditor(input: {token: string; cardId: string | null}): CardEditorController;
    //   lookup, tag, form, previewFile ({status, previewIds, error, reload}), imageName, onImageChange, retry, ...
    ```
  - **From R4-4c:** the controller spreads `useEditSave(…)`, whose `canSave` and `save()` this task's tests read. Its save side takes `card: openCard(lookup)`, and `savePlanOf` returns null without a card.
- **Produces:**
```ts
// src/tools/studio/branchCards.ts
export interface CardListView {
  cards: LorcanaCard[];
  isLoading: boolean;
  error: Error | null;
  getCardById: (id: string) => LorcanaCard | undefined;
}
export interface BranchOnly {branchOnlyIds: ReadonlySet<number>}   // "not deployed yet"
export interface EditSources<L extends CardListView, F extends PreviewCardsFile> {
  list: L & BranchOnly;   // the branch-only cards, then the card list; getCardById finds both
  file: F;                // less any entry whose id the card list holds as allCards' card
}
export function editSources<L extends CardListView, F extends PreviewCardsFile>(sources: {list: L; file: F}): EditSources<L, F>;
export function hasPreviewId(card: Pick<LorcanaCard, 'id' | 'setCode'>): boolean;   // setNumber*1000 + 1..999
export function isDeployed(of: {card: Pick<LorcanaCard, 'id'>; branchOnlyIds: ReadonlySet<number>}): boolean;
export function deployedOf(of: {lookup: EditLookup; branchOnlyIds: ReadonlySet<number>}): boolean;   // true with no card open
export function branchLookup(of: {lookup: EditLookup; file: PreviewCardsFile}): EditLookup;          // gone; missing waits
export function goneNote(card: Pick<LorcanaCard, 'fullName'>): string;

// src/tools/studio/editorState.ts: EditLookup gains (header addition 11), between fileFailed and ready
  | {kind: 'gone'; card: LorcanaCard}

// src/tools/studio/editSearch.ts
export interface SearchRow {card: LorcanaCard; tag: CardTag | null; deployed: boolean}
export interface EditSearchInput {cards; query; previewIds; branchOnlyIds?: ReadonlySet<number>}   // none: all deployed

// src/tools/studio/useCardEditor.ts: CardEditorController gains
  searchCards: LorcanaCard[];           // the branch-only cards, then the card list (editSources' list)
  branchOnlyIds: ReadonlySet<number>;   // for searchCards' rows
  deployed: boolean;                    // false while the open card is branch-only
  reloadFile: () => void;               // as previewFile.reload; R4-6b calls it after a New reveal publish

// src/tools/studio/studioFixtures.ts
export const BRANCH_ONLY_ENTRY: LorcanaJSONCard;   // Wren, ruby(7): what New reveal just published

// src/app-bridge.ts
export {searchCardsByName, smallImageUrl, transformRawCards} from '../upstream/inkweave/apps/web/src/features/cards/loader';
```

**Behaviour.**

| Card list | Branch file | `lookup` | Search row | Save |
|---|---|---|---|---|
| lacks the id | holds it | `loading` until the file lands, then `ready`: `tag` Preview, `imageOnly` from R4-2a's `editKindOf`, `deployed` false | first, Preview, "not deployed yet" | as any preview card (R4-4c) |
| lacks the id | lacks it | `loading` until the file lands, then `missing` | — | none |
| lacks the id | read failed | `fileFailed`, with R4-4b's Retry | — | none |
| holds a reveal-set preview id | holds it | `ready`: Preview (R4-4b), `deployed` true | Preview | as any preview card |
| holds a reveal-set preview id | read, lacks it | **`gone`**, with `goneNote(card)` | Released (R4-2b's tag) | none: no form, no file control, no Save |
| holds a reveal-set card under an allCards id | holds that id | `ready`: Released, `imageOnly: 'released'` (the entry is dropped) | Released | image only (`commitCardImage`) |
| holds another set's card | anything | R4-4b's (R-71) | R4-2b's | R4-4b's and R4-4c's |

Nothing is added to the list while the card list or the file is loading or failed.

- [ ] **Step 1: Check what this task builds on**

R4-4c comes first, and before it the eleven tasks ahead of it in the build order. Run:
```bash
git log --oneline main..HEAD
git -C upstream/inkweave rev-parse --short=8 HEAD
grep -n "transformRawCards" src/app-bridge.ts upstream/inkweave/apps/web/src/features/cards/loader.ts
grep -nE "^export (type PreviewCardsFile|type UsePreviewCardsFileResult|function usePreviewCardsFile)" src/tools/studio/previewCardsFile.ts src/tools/studio/usePreviewCardsFile.ts
grep -nE "^export (type EditLookup|function (editLookup|openCard|openTag))|kind: 'fileFailed'|kind: 'gone'" src/tools/studio/editorState.ts
grep -nA4 "^function cardLookup" src/tools/studio/editorState.ts
grep -nE "^export (interface SearchRow|interface EditSearchInput|function searchCards)|deployed|branchOnlyIds" src/tools/studio/editSearch.ts
grep -nE "const list = useCardDataContext\(\);|const file = usePreviewCardsFile\(token\);|const lookup = editLookup\(|card: openCard\(lookup\),|previewFile: |synergyGroups: editSynergies|searchCards|reloadFile|\.\.\.save," src/tools/studio/useCardEditor.ts
grep -nE "^export (function (previewEntry|studioCard|cardOf)|const (PREVIEW_ENTRY|RELEASED_CARD|BRANCH_ONLY_ENTRY) )|ruby\([0-9]+\)|RUBY_NUMBER \+ [0-9]+" src/tools/studio/studioFixtures.ts
grep -nE "^function (card|revealCard)" src/tools/studio/__tests__/editSearch.test.ts
```
Expected:
- **The log** lists the plan commit and the twelve task commits before this one: R4-1a, R4-3a, R4-5a, R4-5s, R4-5h, R4-1b, R4-2a, R4-2b, R4-3b, R4-4a, R4-4b and R4-4c.
- **The pin** is `16283a13`. If it prints `bc877e1`, the pin bump isn't in this branch's base: stop and tell the controller.
- **`transformRawCards`** shows only in `loader.ts`: its call in `loadCardsFromJSON` (`:157`) and its export (`:173`). If `app-bridge.ts` already has it, skip that part of Step 4.
- **R4-4a's grep** prints `PreviewCardsFile` in `previewCardsFile.ts`, and `UsePreviewCardsFileResult` and `usePreviewCardsFile` in `usePreviewCardsFile.ts`. If R4-4a put the type elsewhere, change the type imports below to match.
- **The `editorState.ts` grep** prints `EditLookup`, `editLookup`, `openCard` and `openTag`, and `kind: 'fileFailed'` twice (the type and `cardLookup`'s return), and no `kind: 'gone'`. If R4-4b declared `gone`, skip the `editorState.ts` edit in Step 4.
- **`cardLookup`** returns `opened(…)` at once for a card outside `REVEAL_SET_CODE`, then `loading` and `fileFailed` while the file isn't read, then `opened(…)`. `branchLookup`'s gone rule relies on it: a ready reveal-set card's `entry: null` means the read file lacks it. If R4-4b opens a reveal-set card before the file is read, stop and tell the controller.
- **The `editSearch.ts` grep** prints the three exports and no `deployed` or `branchOnlyIds`.
- **The hook grep** shows:
  - the two lines that read the card list and the file, and `const lookup = editLookup({cardId, list, file});` right after them;
  - `card: openCard(lookup),` (the save side's card, from the lookup; if it comes from `getCardById`, Step 9 makes it read `openCard(lookup)`);
  - `previewFile:` twice (the interface and the return), `synergyGroups: editSynergies(…)` and `...save,`;
  - no `searchCards` and no `reloadFile`. If R4-4b already gives the controller a search list under another name, point it at `list.cards` in Step 9 instead of adding `searchCards`, and tell the controller.
- **The fixtures** show the three builders, `PREVIEW_ENTRY`, `RELEASED_CARD`, no `BRANCH_ONLY_ENTRY`, `ruby(1)` to `ruby(5)`, and `CURLY_APOSTROPHE_CARD`'s `RUBY_NUMBER + 6` twice. If an earlier task took offset 7, use the next free offset in Step 2.
- **The search test** shows both helpers.

- [ ] **Step 2: Write the failing tests for `branchCards.ts`**

Append to `src/tools/studio/studioFixtures.ts`:
```ts
/** R-66: a card New reveal just published. The branch file holds it, and inkweave.ink doesn't serve it yet. */
export const BRANCH_ONLY_ENTRY = previewEntry({...ruby(7), name: 'Wren', fullName: 'Wren - Night Busker', version: 'Night Busker'});
```

Create `src/tools/studio/__tests__/branchCards.test.ts`:
```ts
import {describe, expect, it, vi} from 'vitest';
import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {PINNED_PREVIEW_CARDS_JSON, REVEAL_ID_BASE, REVEAL_SET_CODE, transformRawCards} from '../../../app-bridge';
import {
  branchLookup,
  deployedOf,
  editSources,
  goneNote,
  hasPreviewId,
  type CardListView,
} from '../branchCards';
import type {EditLookup} from '../editorState';
import type {PreviewCardsFile} from '../previewCardsFile';
import {BRANCH_ONLY_ENTRY, PREVIEW_ENTRY, RELEASED_CARD, cardOf, previewEntry, studioCard} from '../studioFixtures';

/** The card list as the shell holds it, loaded by default. */
function listOf({cards = [], isLoading = false, error = null}: Partial<CardListView> = {}): CardListView {
  return {cards, isLoading, error, getCardById: (id) => cards.find((card) => card.id === id)};
}

/** previewCards.json once a read of it has landed. */
function readFile(cards: LorcanaJSONCard[]): PreviewCardsFile {
  return {status: 'ready', cards, ids: new Set(cards.map((entry) => entry.id)), read: 1};
}

/** A ready lookup, as editLookup gives one: the card, and its entry in the read file (null when the file lacks it). */
function ready({card, entry = null}: {card: LorcanaCard; entry?: LorcanaJSONCard | null}): EditLookup {
  return {kind: 'ready', card, entry, imageOnly: entry === null ? 'released' : null};
}

const ids = (cards: readonly LorcanaCard[]) => cards.map((card) => card.id);

const LISTED_PREVIEW = cardOf(PREVIEW_ENTRY);
const BRANCH_ONLY_ID = String(BRANCH_ONLY_ENTRY.id);
/** Mei after graduation: the reveal set's card under its allCards.json id, outside the reveal band. */
const RELEASED_MEI = studioCard({id: '1936', name: 'Mei', version: 'Red Panda', setCode: REVEAL_SET_CODE});

describe('editSources', () => {
  it('puts each branch-file entry the card list lacks first, and finds it by id', () => {
    const {list} = editSources({
      list: listOf({cards: [LISTED_PREVIEW, RELEASED_CARD]}),
      file: readFile([PREVIEW_ENTRY, BRANCH_ONLY_ENTRY]),
    });
    expect(ids(list.cards)).toEqual([BRANCH_ONLY_ID, LISTED_PREVIEW.id, RELEASED_CARD.id]);
    expect(list.branchOnlyIds).toEqual(new Set([BRANCH_ONLY_ENTRY.id]));
    expect(list.getCardById(BRANCH_ONLY_ID)?.fullName).toBe('Wren - Night Busker');
    expect(list.getCardById(RELEASED_CARD.id)).toBe(RELEASED_CARD);
  });

  it.each<{name: string; listed: CardListView; file: PreviewCardsFile}>([
    {name: 'the card list is loading', listed: listOf({isLoading: true}), file: readFile([BRANCH_ONLY_ENTRY])},
    {
      name: 'the card list failed',
      listed: listOf({error: new Error('Failed to fetch local cards: 500')}),
      file: readFile([BRANCH_ONLY_ENTRY]),
    },
    {name: 'the file is loading', listed: listOf({cards: [RELEASED_CARD]}), file: {status: 'loading'}},
    {name: 'the file failed', listed: listOf({cards: [RELEASED_CARD]}), file: {status: 'error', error: 'GitHub 500 on previewCards.json'}},
  ])('adds nothing while $name', ({listed, file}) => {
    const {list} = editSources({list: listed, file});
    expect(list.cards).toBe(listed.cards);
    expect(list.branchOnlyIds.size).toBe(0);
  });

  it("builds a branch-only card as the app's loader does: its art's URL, its scan language and its printings", () => {
    const printing = {id: REVEAL_ID_BASE + 213, rarity: 'Epic' as const, number: 213, scanLanguage: 'it'};
    const entry = {...BRANCH_ONLY_ENTRY, scanLanguage: 'ja', variants: [printing]};
    const card = editSources({list: listOf(), file: readFile([entry])}).list.getCardById(BRANCH_ONLY_ID);
    expect(card).toMatchObject({imageUrl: `/card-images-preview/${entry.id}.avif`, scanLanguage: 'ja'});
    expect(card?.variants).toEqual([
      {id: String(printing.id), rarity: 'Epic', number: 213, imageUrl: `/card-images-preview/${printing.id}.avif`, scanLanguage: 'it'},
    ]);
  });

  it('passes through what the sources carry besides, such as retryLoad and reload', () => {
    const list = {...listOf(), retryLoad: vi.fn()};
    const file = {...readFile([BRANCH_ONLY_ENTRY]), reload: vi.fn()};
    const sources = editSources({list, file});
    expect(sources.list.retryLoad).toBe(list.retryLoad);
    expect(sources.file.reload).toBe(file.reload);
  });

  it('drops an entry whose id the card list holds as a released card, so it reads Released (allCards wins)', () => {
    const shadow = previewEntry({id: Number(RELEASED_MEI.id)});
    const {list, file} = editSources({
      list: listOf({cards: [RELEASED_MEI, LISTED_PREVIEW]}),
      file: readFile([shadow, PREVIEW_ENTRY]),
    });
    expect(file).toMatchObject({cards: [PREVIEW_ENTRY], ids: new Set([PREVIEW_ENTRY.id])});
    expect(ids(list.cards)).toEqual([RELEASED_MEI.id, LISTED_PREVIEW.id]);
  });

  it('hands the file on as it is when it drops nothing', () => {
    const file = readFile([PREVIEW_ENTRY, BRANCH_ONLY_ENTRY]);
    expect(editSources({list: listOf({cards: [LISTED_PREVIEW]}), file}).file).toBe(file);
  });
});

describe('hasPreviewId', () => {
  it.each<{name: string; card: Pick<LorcanaCard, 'id' | 'setCode'>; expected: boolean}>([
    {name: 'a numbered card of the reveal set', card: {id: String(REVEAL_ID_BASE + 21), setCode: REVEAL_SET_CODE}, expected: true},
    {name: 'an unnumbered one, in the +900 band', card: {id: String(REVEAL_ID_BASE + 901), setCode: REVEAL_SET_CODE}, expected: true},
    {name: "the next set's preview, while the pin lags a season (R-65)", card: {id: '15001', setCode: '15'}, expected: true},
    {name: 'the reveal set released, under its allCards.json id', card: {id: RELEASED_MEI.id, setCode: REVEAL_SET_CODE}, expected: false},
    {name: "another set's released card", card: {id: RELEASED_CARD.id, setCode: '9'}, expected: false},
    {name: 'an id past the band', card: {id: String(REVEAL_ID_BASE + 1000), setCode: REVEAL_SET_CODE}, expected: false},
    {name: 'a card with no set', card: {id: String(REVEAL_ID_BASE + 21)}, expected: false},
  ])('$name: $expected', ({card, expected}) => {
    expect(hasPreviewId(card)).toBe(expected);
  });
});

describe('branchLookup', () => {
  const FILE_ERROR = 'GitHub 500 on apps/web/public/data/previewCards.json: Server error';
  const MISSING: EditLookup = {kind: 'missing', cardId: '14999'};
  /** The next set's preview card, while admin's pin still names this set (R-65). */
  const NEXT_SET_PREVIEW = studioCard({id: '15001', name: 'Stitch', setCode: '15'});

  it.each<{name: string; lookup: EditLookup; file: PreviewCardsFile; expected: EditLookup}>([
    {name: 'an id neither source holds waits for the file', lookup: MISSING, file: {status: 'loading'}, expected: {kind: 'loading'}},
    {
      name: "a failed read is the file's error, not missing",
      lookup: MISSING,
      file: {status: 'error', error: FILE_ERROR},
      expected: {kind: 'fileFailed', error: FILE_ERROR},
    },
    {name: 'an id neither holds is missing once the file is read', lookup: MISSING, file: readFile([]), expected: MISSING},
    {
      name: 'a reveal-set card the file no longer holds is gone',
      lookup: ready({card: LISTED_PREVIEW}),
      file: readFile([]),
      expected: {kind: 'gone', card: LISTED_PREVIEW},
    },
    {
      name: 'a reveal-set card the file holds stays ready',
      lookup: ready({card: LISTED_PREVIEW, entry: PREVIEW_ENTRY}),
      file: readFile([PREVIEW_ENTRY]),
      expected: ready({card: LISTED_PREVIEW, entry: PREVIEW_ENTRY}),
    },
    {
      name: "a released card stays ready, and doesn't wait for the file (R-71)",
      lookup: ready({card: RELEASED_CARD}),
      file: {status: 'loading'},
      expected: ready({card: RELEASED_CARD}),
    },
    {
      name: 'the reveal set released under its allCards.json id is never gone',
      lookup: ready({card: RELEASED_MEI}),
      file: readFile([]),
      expected: ready({card: RELEASED_MEI}),
    },
    {
      name: "another set's preview id is never gone (R-65)",
      lookup: ready({card: NEXT_SET_PREVIEW}),
      file: readFile([]),
      expected: ready({card: NEXT_SET_PREVIEW}),
    },
    {name: 'no card stays no card', lookup: {kind: 'none'}, file: readFile([]), expected: {kind: 'none'}},
  ])('$name', ({lookup, file, expected}) => {
    expect(branchLookup({lookup, file})).toEqual(expected);
  });
});

describe('deployedOf', () => {
  const branchOnlyIds = new Set([BRANCH_ONLY_ENTRY.id]);

  it.each<{name: string; lookup: EditLookup; expected: boolean}>([
    {
      name: 'a card only the branch file holds is not deployed yet',
      lookup: ready({card: cardOf(BRANCH_ONLY_ENTRY), entry: BRANCH_ONLY_ENTRY}),
      expected: false,
    },
    {name: 'a card the card list holds is deployed', lookup: ready({card: LISTED_PREVIEW, entry: PREVIEW_ENTRY}), expected: true},
    {name: 'with no card open, nothing is waiting', lookup: {kind: 'none'}, expected: true},
  ])('$name', ({lookup, expected}) => {
    expect(deployedOf({lookup, branchOnlyIds})).toBe(expected);
  });
});

describe('goneNote', () => {
  it('names the card and the branch, and says nothing can be saved', () => {
    expect(goneNote(LISTED_PREVIEW)).toBe(
      "Mei - Red Panda is no longer in previewCards.json on master, so it can't be saved here. " +
        'A released card takes a new id: once inkweave.ink deploys the release, reload admin and find the card by name.',
    );
  });
});

// What R-66 counts on in the app's transformRawCards at the pin: a pin bump that
// changes how a preview entry's art resolves fails here first.
describe('transformRawCards, through the bridge', () => {
  it('builds every pinned entry, and a local one, with its art under /card-images-preview/', () => {
    // The local entry keeps the case meaningful once graduation empties the file.
    const pinned = (JSON.parse(PINNED_PREVIEW_CARDS_JSON) as {cards: LorcanaJSONCard[]}).cards;
    const entries = [...pinned, BRANCH_ONLY_ENTRY];
    expect(transformRawCards(entries).map((card) => [card.id, card.imageUrl])).toEqual(
      entries.map((entry) => [String(entry.id), `/card-images-preview/${entry.id}.avif`]),
    );
  });
});
```

- [ ] **Step 3: Run it, and see it fail**

Run: `pnpm vitest run --project app src/tools/studio/__tests__/branchCards.test.ts`

Expected: `Test Files  1 failed (1)`, `Tests  no tests`, with:
```
Error: Failed to resolve import "../branchCards" from "src/tools/studio/__tests__/branchCards.test.ts". Does the file exist?
```

- [ ] **Step 4: Bridge `transformRawCards`, add the `gone` state, and write `branchCards.ts`**

In `src/app-bridge.ts`, replace the loader lines (main's `:60-62`; `:62-64` once R4-5a's `InkwellIcon` comment and export sit after `InkIcon`):
```ts
// searchCardsByName is useAutocomplete's own match, run without its debounce
// (R3-5's "No cards match.").
export {searchCardsByName, smallImageUrl} from '../upstream/inkweave/apps/web/src/features/cards/loader';
```
with:
```ts
// searchCardsByName is useAutocomplete's own match, run without its debounce
// (R3-5's "No cards match."). transformRawCards is how the app's loader builds
// the card list: the engine's transform plus imageUrl, the image hashes,
// scanLanguage and the printings. Card studio builds with it the cards that
// only the target branch's previewCards.json holds (R-66), so each points at
// its art, which shows once inkweave.ink serves it.
export {searchCardsByName, smallImageUrl, transformRawCards} from '../upstream/inkweave/apps/web/src/features/cards/loader';
```
No other bridge line moves. R4-5h's rarity lines come after this one.

In `src/tools/studio/editorState.ts`, unless Step 1 found it, add the `gone` variant to `EditLookup`, between `fileFailed` and `ready` (header addition 11's order). Replace:
```ts
  | {kind: 'fileFailed'; error: string}
  | {kind: 'ready'; card: LorcanaCard; entry: LorcanaJSONCard | null; imageOnly: ImageOnlyReason | null};
```
with:
```ts
  | {kind: 'fileFailed'; error: string}
  // R4-4d (R-66): a reveal-set card under a preview id that the read file no longer holds (branchLookup)
  | {kind: 'gone'; card: LorcanaCard}
  | {kind: 'ready'; card: LorcanaCard; entry: LorcanaJSONCard | null; imageOnly: ImageOnlyReason | null};
```
Nothing in R4-4b's or R4-4c's code returns it: `branchLookup` does. Their code tests `lookup.kind !== 'ready'` (`editOf`, `needsSeed`, `openCard`, `openTag`), so `gone` gets what `missing` gets there: no card, no form and no save. If R4-4b switches exhaustively on `lookup.kind` somewhere, typecheck names the place; give `gone` the same.

Create `src/tools/studio/branchCards.ts`:
```ts
import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {transformRawCards} from '../../app-bridge';
import {targetBranch} from '../../github/githubCommit';
import {REVEAL_SET_CODE} from '../reveal/constants';
import type {EditLookup} from './editorState';
import type {PreviewCardsFile} from './previewCardsFile';

/*
 * Cards only the branch file holds (R-66). The card list is what inkweave.ink
 * serves: allCards.json plus the deployed previewCards.json, read once per
 * session. A card that New reveal publishes, or a /fetch-reveals PR merges,
 * reaches it only once the app deploys, 15 to 20 minutes later
 * (REVEAL_RUNBOOK.md:34), and a rehearsal branch's cards never do. Edit card
 * reads previewCards.json from the target branch itself, so it adds the
 * entries the card list lacks, as R2's rule list adds the tuning.json entries
 * the analytics lack (calibrationModel.ts:67-87).
 */

/** What Edit card reads from the shell's card list (useCardDataContext). */
export interface CardListView {
  cards: LorcanaCard[];
  isLoading: boolean;
  error: Error | null;
  getCardById: (id: string) => LorcanaCard | undefined;
}

/** What editSources adds to the card list. */
export interface BranchOnly {
  /** The ids only the branch file holds: "not deployed yet", with no Card analytics link (R-33). */
  branchOnlyIds: ReadonlySet<number>;
}

/** Edit card's two sources, as editSources hands them on. */
export interface EditSources<L extends CardListView, F extends PreviewCardsFile> {
  /** The cards only the branch file holds, then the card list. getCardById finds both. */
  list: L & BranchOnly;
  /** The branch file, less any entry whose id the card list holds as a released card. */
  file: F;
}

const NONE: ReadonlySet<number> = new Set();

/**
 * Whether the card has a preview id: its set's number times 1000 plus its
 * collector number, or the +900..+999 band for a card revealed without one
 * (the app's revealSet.ts:15-22). allCards.json's ids are sequential and stay
 * clear of every Core set's band, so a card-list card with a preview id came
 * from previewCards.json, and any other from allCards.json.
 */
export function hasPreviewId(card: Pick<LorcanaCard, 'id' | 'setCode'>): boolean {
  const offset = Number(card.id) - Number(card.setCode) * 1000;
  return offset > 0 && offset < 1000;
}

/** Whether the card list holds the entry's id as allCards.json's card, which wins (the app's loader.ts:212-213). */
function shadowed({entry, list}: {entry: LorcanaJSONCard; list: CardListView}): boolean {
  const listed = list.getCardById(String(entry.id));
  return listed !== undefined && !hasPreviewId(listed);
}

/** The file less the entries allCards.json wins over, so such a card reads Released, image only, everywhere. */
function withoutShadowed<F extends PreviewCardsFile>({list, file}: {list: CardListView; file: F}): F {
  if (file.status !== 'ready') return file;
  const cards = file.cards.filter((entry) => !shadowed({entry, list}));
  if (cards.length === file.cards.length) return file;
  return {...file, cards, ids: new Set(cards.map((entry) => entry.id))};
}

/**
 * The file's entries a loaded card list lacks, built as the app's loader builds
 * a card (transformRawCards), so each has its art's URL, its scan language and
 * its printings. Nothing while either source is loading or failed: an unread
 * card list would make every entry look branch-only.
 */
function branchOnlyCards({list, file}: {list: CardListView; file: PreviewCardsFile}): LorcanaCard[] {
  if (file.status !== 'ready') return [];
  if (list.isLoading) return [];
  if (list.error) return [];
  return transformRawCards(file.cards.filter((entry) => !list.getCardById(String(entry.id))));
}

/** The card list with the branch-only cards first: they are the newest, so a blank query lists them first (R-76). */
function withBranchCards<L extends CardListView>({list, file}: {list: L; file: PreviewCardsFile}): L & BranchOnly {
  const extra = branchOnlyCards({list, file});
  if (extra.length === 0) return {...list, branchOnlyIds: NONE};
  const byId = new Map(extra.map((card) => [card.id, card]));
  return {
    ...list,
    cards: [...extra, ...list.cards],
    getCardById: (id: string) => list.getCardById(id) ?? byId.get(id),
    branchOnlyIds: new Set(extra.map((card) => Number(card.id))),
  };
}

/**
 * Edit card's sources as it reads them (R-66). The card list gains every
 * branch-file entry it lacks, so the search lists it and the lookup and the
 * draft find it like any other card. The file loses any entry whose id the card
 * list holds as allCards.json's card: the app shows that card, so an id in both
 * reads as Released (loader.ts:212-213). Everything else the two carry, such as
 * retryLoad, reload and commit, passes through.
 */
export function editSources<L extends CardListView, F extends PreviewCardsFile>(sources: {
  list: L;
  file: F;
}): EditSources<L, F> {
  const file = withoutShadowed(sources);
  return {list: withBranchCards({list: sources.list, file}), file};
}

/** Whether inkweave.ink serves the card: false for a card only the branch file holds. */
export function isDeployed({card, branchOnlyIds}: {card: Pick<LorcanaCard, 'id'>; branchOnlyIds: ReadonlySet<number>}): boolean {
  return !branchOnlyIds.has(Number(card.id));
}

/** Whether the open card is deployed; true while no card is open. */
export function deployedOf({lookup, branchOnlyIds}: {lookup: EditLookup; branchOnlyIds: ReadonlySet<number>}): boolean {
  return lookup.kind !== 'ready' || isDeployed({card: lookup.card, branchOnlyIds});
}

/** An id the card list lacks may be one only the file holds: it waits for the file before it is missing. */
function unlistedLookup({lookup, file}: {lookup: EditLookup; file: PreviewCardsFile}): EditLookup {
  if (file.status === 'loading') return {kind: 'loading'};
  if (file.status === 'error') return {kind: 'fileFailed', error: file.error};
  return lookup;
}

/**
 * Whether a ready card is a reveal-set card under a preview id that the file
 * no longer holds. editLookup opens a reveal-set card only once the file is
 * read (R-71), so its null entry means the read file lacks it.
 */
function leftFile({card, entry}: {card: LorcanaCard; entry: LorcanaJSONCard | null}): boolean {
  if (entry !== null) return false;
  if (card.setCode !== REVEAL_SET_CODE) return false;
  return hasPreviewId(card);
}

/**
 * Edit's lookup with what only the branch file can say (R-66), over
 * editLookup's answer from editSources' card list:
 * - an id neither source holds waits for the file before it reads missing, and
 *   a failed read is the file's error, with its Retry;
 * - a reveal-set card under a preview id that the file no longer holds is gone.
 *   Graduation releases a card under a new id (R-29) and empties the file,
 *   while inkweave.ink lists the old id until it deploys. Gone gets no form and
 *   no save: an edit or an image would land on an id the app no longer has.
 */
export function branchLookup({lookup, file}: {lookup: EditLookup; file: PreviewCardsFile}): EditLookup {
  if (lookup.kind === 'missing') return unlistedLookup({lookup, file});
  if (lookup.kind === 'ready' && leftFile(lookup)) return {kind: 'gone', card: lookup.card};
  return lookup;
}

/** What Edit card shows for a gone card, in place of its form and Save. */
export function goneNote(card: Pick<LorcanaCard, 'fullName'>): string {
  return (
    `${card.fullName} is no longer in previewCards.json on ${targetBranch()}, so it can't be saved here. ` +
    'A released card takes a new id: once inkweave.ink deploys the release, reload admin and find the card by name.'
  );
}
```

- [ ] **Step 5: Run the tests to PASS, and the bridge's script check**

Run:
```bash
pnpm vitest run --project app src/tools/studio/__tests__/branchCards.test.ts
pnpm vitest run --project scripts scripts/reveal-sync/web.test.mjs
```
Expected: `Tests  30 passed (30)`, then `Tests  2 passed (2)`. `scripts/reveal-sync/web.mjs:47` loads `src/app-bridge.ts` for the season. The changed export line comes from a module the bridge already loads (`searchCardsByName`), so the runner loads it as before.

- [ ] **Step 6: Write the failing search cases**

Append to `src/tools/studio/__tests__/editSearch.test.ts`, which already has `card`, `revealCard`, `REVEAL_ID_BASE` and `searchCards`, after a blank line:
```ts
// R4-4d (R-66): the cards only the branch file holds.
describe('searchCards: deployed', () => {
  // A card New reveal just published leads the list (editSources puts it first), then the card list.
  const cards = [revealCard(9), revealCard(1), card({id: '1936'})];
  const previewIds = new Set([REVEAL_ID_BASE + 9, REVEAL_ID_BASE + 1]);

  it('marks a row the branch file alone holds as not deployed yet', () => {
    const {rows} = searchCards({cards, query: '', previewIds, branchOnlyIds: new Set([REVEAL_ID_BASE + 9])});
    expect(rows.map(({card: {id}, tag, deployed}) => ({id, tag, deployed}))).toEqual([
      {id: String(REVEAL_ID_BASE + 9), tag: 'Preview', deployed: false},
      {id: String(REVEAL_ID_BASE + 1), tag: 'Preview', deployed: true},
      {id: '1936', tag: 'Released', deployed: true},
    ]);
  });

  it('reads every row as deployed when it is given no branch-only ids', () => {
    expect(searchCards({cards, query: '', previewIds}).rows.map((row) => row.deployed)).toEqual([true, true, true]);
  });
});
```

Run: `pnpm vitest run --project app src/tools/studio/__tests__/editSearch.test.ts`

Expected: `Tests  2 failed | 17 passed (19)` (17 is R4-2b's count as drafted; the 2 new cases fail, every old one passes):
```
AssertionError: expected [ { id: '14009', …(2) }, …(2) ] to deeply equal [ { id: '14009', …(2) }, …(2) ]
AssertionError: expected [ undefined, undefined, undefined ] to deeply equal [ true, true, true ]
```

- [ ] **Step 7: Give each search row `deployed`**

In `src/tools/studio/editSearch.ts`:
- Add the import, after `REVEAL_SET_CODE`'s:
  ```ts
  import {isDeployed} from './branchCards';
  ```
- Add after `SEARCH_LIMIT`:
  ```ts
  const NO_IDS: ReadonlySet<number> = new Set();
  ```
- Replace `SearchRow` with:
  ```ts
  /** One row of Edit card's search: the card, and its tag (null for a reveal-set card while the branch file is unread). */
  export interface SearchRow {
    card: LorcanaCard;
    tag: CardTag | null;
    /** False for a card only the branch file holds: "not deployed yet", with no Card analytics link (R-66, R-33). */
    deployed: boolean;
  }
  ```
- In `EditSearchInput`, reword `cards`' comment and add the last field:
  ```ts
    /** Every card the search can open: the card list (Core sets 9 and up), after the cards only the branch file holds (R-66). */
    cards: readonly LorcanaCard[];
    // query and previewIds as they are
    /** The ids only the branch file holds (editSources' branchOnlyIds); with none given, every row is deployed. */
    branchOnlyIds?: ReadonlySet<number>;
  ```
- In `searchCards`' doc comment, after its last line (" * lists them first (R-76). One filterCards pass gives the rows and the total."), add:
  ```ts
   * Each row says whether inkweave.ink serves it yet (R-66).
  ```
- Replace `searchCards` with:
  ```ts
  export function searchCards({cards, query, previewIds, branchOnlyIds = NO_IDS}: EditSearchInput): EditSearchResult {
    const matches = filterCards(previewFirst(cards, previewIds), query, Infinity);
    return {
      rows: matches.slice(0, SEARCH_LIMIT).map((card) => ({
        card,
        tag: cardTag(card, previewIds),
        deployed: isDeployed({card, branchOnlyIds}),
      })),
      total: matches.length,
    };
  }
  ```

`editSearch.ts` imports `branchCards.ts` at runtime. `branchCards.ts` takes only types from `editorState.ts` (which imports `previewIdsOf` from `editSearch.ts`) and `previewCardsFile.ts`, so no runtime cycle forms.

Run the Step 6 command again. Expected: `Tests  19 passed (19)`.

- [ ] **Step 8: Write the failing hook cases**

Create `src/tools/studio/__tests__/useCardEditorBranch.test.ts`. It is a file of its own, so its mocks don't touch R4-4b's `useCardEditor.test.ts` or R4-4c's `useCardEditor.save.test.ts`:
```ts
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from '@testing-library/react';
import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {REVEAL_SET_CODE, type useCardDataContext} from '../../../app-bridge';
import {DeferredReader} from '../../../test/DeferredReader';
import {pngFile} from '../../../test/images';
import {searchCards} from '../editSearch';
import {BRANCH_ONLY_ENTRY, PREVIEW_ENTRY, RELEASED_CARD, cardOf, previewEntry, studioCard} from '../studioFixtures';
import {useCardEditor} from '../useCardEditor';

/*
 * R4-4d (R-66): Edit card with the cards only the branch file holds. The card
 * list is a fixed value per test; the branch file is read through the mocked
 * readPreviewCards, so a test decides when each read lands. transformRawCards
 * stays real: the branch-only card's art comes from it.
 */

type CardList = Pick<ReturnType<typeof useCardDataContext>, 'cards' | 'isLoading' | 'error' | 'getCardById' | 'retryLoad'>;

const cardList = vi.hoisted(() => ({value: null as CardList | null}));
vi.mock('../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useCardDataContext: () => cardList.value,
}));
const {readPreviewCards, commitCardEdit, commitCardImage} = vi.hoisted(() => ({
  readPreviewCards: vi.fn(),
  commitCardEdit: vi.fn(),
  commitCardImage: vi.fn(),
}));
vi.mock('../../reveal/githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../reveal/githubClient')>()),
  readPreviewCards,
  commitCardEdit,
}));
vi.mock('../../image/githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../image/githubClient')>()),
  commitCardImage,
}));

const LISTED_PREVIEW = cardOf(PREVIEW_ENTRY);
const BRANCH_ONLY_ID = String(BRANCH_ONLY_ENTRY.id);

/** The shell's card list, loaded with `cards`. */
function setCardList(cards: LorcanaCard[]) {
  const getCardById = (id: string) => cards.find((card) => card.id === id);
  cardList.value = {cards, isLoading: false, error: null, getCardById, retryLoad: vi.fn()};
}

/** The next read of previewCards.json, landing or failing when the test says. */
function nextRead() {
  let resolve: (cards: LorcanaJSONCard[]) => void = () => {};
  let reject: (error: Error) => void = () => {};
  readPreviewCards.mockReturnValueOnce(new Promise((onLand, onFail) => ((resolve = onLand), (reject = onFail))));
  return {
    land: (cards: LorcanaJSONCard[]) => act(async () => resolve(cards)),
    fail: (error: Error) => act(async () => reject(error)),
  };
}

function renderEditor(cardId: string | null) {
  return renderHook((props: {token: string; cardId: string | null}) => useCardEditor(props), {
    initialProps: {token: 'tok', cardId},
  });
}

beforeEach(() => {
  // Blocks, not an arrow's value: mockReset() returns the mock, which Vitest would call as a teardown.
  readPreviewCards.mockReset();
  commitCardEdit.mockReset();
  commitCardImage.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useCardEditor: cards only the branch file holds (R-66)', () => {
  it('lists a card New reveal just published first, not deployed, with the art it will have', async () => {
    setCardList([LISTED_PREVIEW, RELEASED_CARD]);
    const read = nextRead();
    const {result} = renderEditor(null);
    await read.land([PREVIEW_ENTRY, BRANCH_ONLY_ENTRY]);

    const {searchCards: cards, previewFile, branchOnlyIds} = result.current;
    expect(cards.map((card) => card.id)).toEqual([BRANCH_ONLY_ID, LISTED_PREVIEW.id, RELEASED_CARD.id]);
    expect(cards[0].imageUrl).toBe(`/card-images-preview/${BRANCH_ONLY_ID}.avif`);
    const {rows} = searchCards({cards, query: 'wren', previewIds: previewFile.previewIds, branchOnlyIds});
    expect(rows).toMatchObject([{card: {id: BRANCH_ONLY_ID}, tag: 'Preview', deployed: false}]);
  });

  it.each([
    {name: 'a card only the branch file holds', listed: [RELEASED_CARD], cardId: BRANCH_ONLY_ID, deployed: false, cardName: 'Wren'},
    {name: 'a preview card the card list holds', listed: [LISTED_PREVIEW], cardId: LISTED_PREVIEW.id, deployed: true, cardName: 'Mei'},
  ])('opens $name once the file lands, loading until then (deployed: $deployed)', async ({listed, cardId, deployed, cardName}) => {
    setCardList(listed);
    const read = nextRead();
    const {result} = renderEditor(cardId);
    expect(result.current.lookup).toEqual({kind: 'loading'});

    await read.land([PREVIEW_ENTRY, BRANCH_ONLY_ENTRY]);
    expect(result.current.lookup).toMatchObject({kind: 'ready', card: {id: cardId}, imageOnly: null});
    expect({tag: result.current.tag, deployed: result.current.deployed}).toEqual({tag: 'Preview', deployed});
    expect(result.current.form?.name).toBe(cardName);
  });

  it.each([
    {name: 'is missing once the file is read', settle: (read: ReturnType<typeof nextRead>) => read.land([PREVIEW_ENTRY]), lookup: {kind: 'missing', cardId: '14999'}},
    {
      name: "shows the file's error when the read fails",
      settle: (read: ReturnType<typeof nextRead>) => read.fail(new Error('GitHub 500 on apps/web/public/data/previewCards.json: Server error')),
      lookup: {kind: 'fileFailed', error: 'GitHub 500 on apps/web/public/data/previewCards.json: Server error'},
    },
  ])('waits for the file on an id neither source holds, then $name', async ({settle, lookup}) => {
    setCardList([RELEASED_CARD]);
    const read = nextRead();
    const {result} = renderEditor('14999');
    expect(result.current.lookup).toEqual({kind: 'loading'});

    await settle(read);
    expect(result.current.lookup).toEqual(lookup);
  });

  it('reads a card the file no longer holds as gone, with no form and no save, even with an image staged', async () => {
    DeferredReader.reset();
    vi.stubGlobal('FileReader', DeferredReader);
    setCardList([LISTED_PREVIEW]);
    const read = nextRead();
    const {result} = renderEditor(LISTED_PREVIEW.id);
    await read.land([]);
    expect(result.current.lookup).toEqual({kind: 'gone', card: LISTED_PREVIEW});
    expect(result.current.form).toBeNull();

    act(() => void result.current.onImageChange(pngFile('mei.png')));
    await DeferredReader.finish(0);
    expect(result.current.imageName).toBe('mei.png');
    expect(result.current.canSave).toBe(false);
    await act(() => result.current.save());
    expect(commitCardEdit).not.toHaveBeenCalled();
    expect(commitCardImage).not.toHaveBeenCalled();
  });

  it('reads the reveal set released under an allCards.json id as Released, whatever the file holds under that id', async () => {
    const released = studioCard({id: '1936', name: 'Mei', version: 'Red Panda', setCode: REVEAL_SET_CODE});
    setCardList([released]);
    const read = nextRead();
    const {result} = renderEditor(released.id);
    await read.land([previewEntry({id: 1936})]);

    expect(result.current.lookup).toMatchObject({kind: 'ready', entry: null, imageOnly: 'released'});
    expect({tag: result.current.tag, form: result.current.form}).toEqual({tag: 'Released', form: null});
    expect(result.current.previewFile.previewIds?.has(1936)).toBe(false);
  });

  it('reads the file again on reloadFile, so a card New reveal just published opens at once', async () => {
    setCardList([LISTED_PREVIEW]);
    const first = nextRead();
    const {result, rerender} = renderEditor(null);
    await first.land([PREVIEW_ENTRY]);
    expect(result.current.branchOnlyIds.size).toBe(0);

    const second = nextRead();
    act(() => result.current.reloadFile());
    await second.land([PREVIEW_ENTRY, BRANCH_ONLY_ENTRY]);
    expect(result.current.branchOnlyIds).toEqual(new Set([BRANCH_ONLY_ENTRY.id]));

    rerender({token: 'tok', cardId: BRANCH_ONLY_ID});
    await waitFor(() => expect(result.current.lookup).toMatchObject({kind: 'ready', card: {id: BRANCH_ONLY_ID}}));
    expect(result.current.deployed).toBe(false);
  });
});
```

Run: `pnpm vitest run --project app src/tools/studio/__tests__/useCardEditorBranch.test.ts`

Expected: `Tests  8 failed (8)`. Against R4-4c's hook, the messages were (Vitest prints the two "waits for the file" cases' identical error once):
```
TypeError: Cannot read properties of undefined (reading 'map')
AssertionError: expected { kind: 'missing', cardId: '14110' } to deeply equal { kind: 'loading' }
AssertionError: expected { tag: 'Preview', deployed: undefined } to deeply equal { tag: 'Preview', deployed: true }
AssertionError: expected { kind: 'missing', cardId: '14999' } to deeply equal { kind: 'loading' }
AssertionError: expected { kind: 'ready', …(3) } to deeply equal { kind: 'gone', …(1) }
AssertionError: expected { kind: 'ready', card: { …(9) }, …(2) } to match object { kind: 'ready', entry: null, …(1) }
TypeError: Cannot read properties of undefined (reading 'size')
```

- [ ] **Step 9: Wire the hook**

In `src/tools/studio/useCardEditor.ts`:

1. Import the helpers, before `import {hasEdits, type ImageOnlyReason} from './cardEdit';`:
   ```ts
   import {branchLookup, deployedOf, editSources} from './branchCards';
   ```
2. Read both sources through `editSources`, and refine the lookup before anything reads it. Replace:
   ```ts
     const list = useCardDataContext();
     const file = usePreviewCardsFile(token);
     const lookup = editLookup({cardId, list, file});
   ```
   with:
   ```ts
     // R4-4d (R-66): the card list with the cards only the branch file holds, and the file less allCards' ids.
     const {list, file} = editSources({list: useCardDataContext(), file: usePreviewCardsFile(token)});
     const lookup = branchLookup({lookup: editLookup({cardId, list, file}), file});
   ```
   Keep the hook order: the card list first, then the file. Every later use reads the two views and the refined lookup with nothing more to change: `useEditDraft`, `openCard(lookup)` for the preview and the save side, `editSynergies`' `list.cards`, `retryReads({list, file})`, `previewFileView(file)`, `useEditSave`'s `file` and `openTag(lookup)`. If Step 1 showed the save side taking its card from `getCardById`, make it `card: openCard(lookup),`: only a ready card is saved.
3. Add four fields to `CardEditorController`, after `revertImage: () => void;`:
   ```ts
     /** R4-4d (R-66): every card the search can open: the cards only the branch file holds, then the card list. */
     searchCards: LorcanaCard[];
     /** R4-4d (R-66): the ids only the branch file holds, for searchCards' rows. */
     branchOnlyIds: ReadonlySet<number>;
     /** R4-4d (R-66): false while the open card is one only the branch file holds; true with none open. */
     deployed: boolean;
     /** R4-4d (R-66): reads previewCards.json again, as previewFile.reload does; R4-6b calls it once a New reveal publish lands. */
     reloadFile: () => void;
   ```
4. Add them to the returned object, after `revertImage: image.revertImage,` and before `...save,`:
   ```ts
       searchCards: list.cards,
       branchOnlyIds: list.branchOnlyIds,
       deployed: deployedOf({lookup, branchOnlyIds: list.branchOnlyIds}),
       reloadFile: () => void file.reload(),
   ```

Run:
```bash
pnpm vitest run --project app src/tools/studio
```
Expected: every file passes. This task's three files give 30, 19 and 8. R4-4b's and R4-4c's suites (`editorState.test.ts`, `useCardEditor.test.ts`, `editSave.test.ts`, `useCardEditor.save.test.ts`) and every other studio file that has landed pass unchanged: with no branch-only card, no shadowed entry and no reveal-set card the file lacks, `editSources` hands both sources on as they were and `branchLookup` changes nothing.

- [ ] **Step 10: Lint and typecheck**

```bash
pnpm exec eslint --max-warnings 0 src/app-bridge.ts src/tools/studio/branchCards.ts src/tools/studio/editorState.ts src/tools/studio/editSearch.ts src/tools/studio/useCardEditor.ts src/tools/studio/studioFixtures.ts src/tools/studio/__tests__/branchCards.test.ts src/tools/studio/__tests__/editSearch.test.ts src/tools/studio/__tests__/useCardEditorBranch.test.ts
pnpm typecheck
```
Expected: eslint prints nothing, and `pnpm typecheck` exits 0. It builds the engine, then runs `tsc -b`, which covers the tests. Passing the two hooks as `editSources`' arguments passes react-hooks and react-compiler. Run nothing more: the pre-commit hook runs the full lint and `test:run`.

- [ ] **Step 11: Code Health**

Run CodeScene's `code_health_review` on `src/tools/studio/branchCards.ts`, `editSearch.ts`, `editorState.ts`, `useCardEditor.ts`, `studioFixtures.ts` and the three test files.

Expected: **10.0 with no findings** on each, as the sandbox gave, `useCardEditor.ts` included (R4-4b's and R4-4c's hook with this task's lines). This task adds no branch and no parameter to the hook, so if it drops, compare it with `HEAD`'s version before blaming these lines.

The PR gate is stricter than the local tool, so check the count by hand too:
- **`branchCards.ts`.** It has no primitive parameter in its 12 named functions: `hasPreviewId(card)`, `shadowed({entry, list})`, `withoutShadowed({list, file})`, `branchOnlyCards({list, file})`, `withBranchCards({list, file})`, `editSources(sources)`, `isDeployed({…})`, `deployedOf({…})`, `unlistedLookup({…})`, `leftFile({card, entry})`, `branchLookup({…})` and `goneNote(card)`. With its six lambdas it has 1 in 18 (`getCardById`'s `id: string`), 5.6%.
- **Complexity.** The most is 4, in `branchOnlyCards` and `branchLookup`, and no condition chains two operators.
- **`editSearch.ts`** stays at R4-2b's 0 primitives. **`editorState.ts`** gains a type variant only.
- **The tests.** `branchCards.test.ts` has 1 primitive in 14 (`listOf`'s `getCardById` lambda). `useCardEditorBranch.test.ts` has 2 in 15 (`setCardList`'s `getCardById` lambda and `renderEditor(cardId)`). Each `it.each` callback takes one object.

If a finding appears, fix it before committing. R4-8 runs `analyze_change_set` before the push.

- [ ] **Step 12: Commit, after the owner approves**

Use the Bash tool. Stage with explicit paths, as its own call:
```bash
git add src/app-bridge.ts src/tools/studio/branchCards.ts src/tools/studio/editorState.ts src/tools/studio/editSearch.ts src/tools/studio/useCardEditor.ts src/tools/studio/studioFixtures.ts src/tools/studio/__tests__/branchCards.test.ts src/tools/studio/__tests__/editSearch.test.ts src/tools/studio/__tests__/useCardEditorBranch.test.ts
```
Leave `editorState.ts` out if Step 4 didn't change it. Run CodeScene's `pre_commit_code_health_safeguard` on the staged change, and go on only when it passes. Then commit, as a separate, unpiped call:
```bash
USER_APPROVED=1 git commit -m "feat(studio): find and open cards only the branch file holds (#24)"
```
Husky's pre-commit runs the full lint and `test:run`. If Vitest fails to start its workers under load, stop this session's preview servers, wait out other sessions' runs, and retry. Never pass `--no-verify`.

### Hand-offs from R4-4d

- **R4-5f (the Edit entry).**
  - **`EditSearch`.** Each row has `deployed`. Show "not deployed yet" beside the tag for `!row.deployed`, with no Card analytics link.
  - **`EditingBanner`.** It takes the controller's `deployed`, and shows "View card analytics" (`cardsHref`) only when it is true (R-33). `deployed` is on the controller, not on the ready lookup.
  - **Stories.** Build the branch-only row from `BRANCH_ONLY_ENTRY` through `cardOf`, and set `deployed: false`. A story can't run `transformRawCards` against inkweave.ink's images, and needs no art.
- **R4-6b (the Edit pane).**
  - **The search rows:** `searchCards({cards: edit.searchCards, query, previewIds: edit.previewFile.previewIds, branchOnlyIds: edit.branchOnlyIds})`. Search `edit.searchCards`, never the shell's card list, which lacks the branch-only cards.
  - **The banner:** `deployed={edit.deployed}`.
  - **`lookup.kind === 'gone'`.** Render the card's name with `goneNote(lookup.card)`, and nothing else: no form, no file control, no change list, no Save. The controller's `tag` is null there (`openTag` reads only a ready lookup); its search row reads Released. The page's URL-driven handoff (R-59) should land on that view's heading, as it does on a ready card's.
  - **`missing`** now comes only after the file is read, and `fileFailed` can now answer an id the card list lacks. R4-4b's `retry` re-reads the file in that case.
  - **After New reveal's publish lands,** call `edit.reloadFile()` (the same read as `edit.previewFile.reload()`), so the new card is in the search at once (R-66). Request it from state, when New's `result` changes to a new commit, as the page requests its focus handoffs. A failed reload keeps the cards it had, beside `reloadError` (R4-4a's C1).
  - **Lookup names.** The lookup is R4-4b's `EditLookup`, keyed by `kind` (`fileFailed`, not `file-error`). R4-6b's sandbox was built on this file's earlier stand-in (`lookup.state`, `edit.file.previewIds`, a ready lookup with `tag` and `kind`): map those to `lookup.kind`, `edit.previewFile.previewIds`, `edit.tag` and `imageOnly`.
- **R4-6a (New reveal's note).** The go-live note says the card reaches inkweave.ink in 15 to 20 minutes (`REVEAL_RUNBOOK.md:34`), as the header has it. `RevealPage.tsx:26`'s "~2-3 min" goes with the page in R4-6c.
- **The owner's rehearsal (R-86).** On a throwaway branch, a card published there is branch-only: Edit lists it as "not deployed yet" and can edit it, though inkweave.ink never serves it. That is what lets the rehearsal edit a card it just made. Its art stays the cost badge, because the branch never deploys. A preview card published to `master` after the branch was cut reads gone there, since the branch's file lacks it.
- **R4-7 (docs).** The runbook's Edit card section says that a card just published, or merged from a `/fetch-reveals` PR, can be fixed at once, tagged "not deployed yet". It also says that after graduation, the old preview ids read "no longer in previewCards.json" until inkweave.ink deploys and admin is reloaded.
- **R4-8 (as built).** "R4 as built" records these departures:
  - "an id in both" is decided by the preview-id band;
  - `deployed` sits on the controller and on `SearchRow`, not inside the lookup;
  - the controller has both `previewFile.reload` (R4-4b) and `reloadFile` (R4-4d, the header's name), the same read;
  - branch-only cards lead the list;
  - Edit's synergies run over the union.

  Its sweep confirms that `app-bridge.ts` exports `transformRawCards` and that nothing but `branchCards.ts` calls it.
