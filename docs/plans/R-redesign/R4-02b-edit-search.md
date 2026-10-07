> Part of [R: Admin redesign](../R-redesign.md), phase R4 ([R4-card-studio.md](R4-card-studio.md)). Read the main plan's decisions (R-57 to R-91 for R4), corrections, global constraints and shared interfaces, then the R4 header, first.

> **Re-base notes (R4-2b, 2026-10-07).** Re-based from the search and change-row half of the outline's "Task R4-2: Edit model (`cardEdit.ts`)" (`R4-card-studio.md:206-323`, written 2026-10-01 against the planned R1 code). R4-2a takes the other half (`cardEdit.ts`). This version is written against `main @ e5e5029` (R1 to R3 as built, `b490fb7`, plus the pin-bump PR) and pin `upstream/inkweave @ 16283a13`, with decisions R-57 to R-91 and the 2026-10-07 audit (`r4-audit-synth.md` "R4-2", `r4-audit-full.json`'s R4-2 entry). The audit cited the old pin `bc877e1`; every app fact below was re-checked at `16283a13`.
> 1. **The split.** The outline's one `cardEdit.ts` becomes four modules (the audit's split, and the header's addition 10):
>    - R4-2a's `cardEdit.ts`: `formFromPreviewCard`, `roundTrips`, `editKindOf`, `cardChanges`, `validateCardEdit` and `hasEdits`.
>    - This task's `src/tools/studio/editSearch.ts`: `SEARCH_LIMIT`, `CardTag`, `SearchRow`, `previewIdsOf`, `cardTag` and `searchCards`. It is not named `cardSearch.ts`, which would read as R3's `analytics/cards/cardSearch.ts`.
>    - This task's `src/tools/studio/changeRows.ts`: `ChangeRow`, `changeRows` and `changeCount`.
>    - This task's `src/tools/studio/scanLanguages.ts` (R-60): `languageName` and `scanLanguageOptions`. The header's addition 10 puts it in R4-2b, and R4-2a's final draft hands it here (its re-base note 7 and "Hand-offs from R4-2a"), so R4-2a creates no `scanLanguages.ts`.
>    - The apostrophe fold goes into the kept `src/tools/image/filterCards.ts` (R-30 keeps it for R4's search).
> 2. **The search.**
>    - **One object argument and one pass.** `searchCards({cards, query, previewIds})` drops the outline's `limit` parameter and exports `SEARCH_LIMIT = 40` instead, as R3 exports `MIN_QUERY` (`analytics/cards/cardSearch.ts:4-8`). The outline ran `filterCards` twice per keystroke, once capped and once with `Infinity`, over about 1,228 cards. Now one pass with `Infinity` gives both: `rows` is the first `SEARCH_LIMIT` matches and `total` counts them all.
>    - **R-76: the branch file's cards first.** The card list appends preview entries after every `allCards.json` card, and nothing sorts it (app `features/cards/loader.ts:212-216` and `:156-158`, and `useCardData.ts:83-85`, at `16283a13`). So a blank query used to open on set 9's oldest cards, while field edits apply only to preview cards. `searchCards` moves the file's cards to the front, each part keeping the card list's order, before `filterCards` runs. A blank query then lists them first. A typed query keeps `filterCards`' ranking (fullName prefix matches first), with the file's cards first within each rank. R-76 speaks only of the blank query; ordering typed queries the same way costs no branch. An empty file (after graduation) or an unread one leaves the card list's order.
>    - **R-71: tags don't wait on the file except for the reveal set.** `previewIds` is `ReadonlySet<number> | null`, where null means the file is still loading or failed to load. `cardTag` returns Preview when the file holds the id, whatever its set (a pin that lags a season switch, R-65). A reveal-set card returns null while the file is unread, so a set-14 card never shows a Released tag it would lose a moment later. Every other card is Released straight from the card list. The outline's `cardTag(card, previewIds: ReadonlySet<number>): CardTag` couldn't say "not yet". `previewIdsOf(entries)` builds the set from the file's entries, or null, so R4-4b and R4-6b build it one way.
>    - **What the tests cover.** `editSearch.test.ts` tests only what `searchCards` adds: order, tags, the cap and the total. Name and id matching and capping are already `filterCards.test.ts:10-31`. The outline's prefix-ranking test moves there too, as the audit asked.
>    - **Wording.** The search covers "every card in the card list (Core sets 9 and up)", not "every card": the loader drops sets below 9 (`loader.ts:216`, `isCoreSet`). A rotated-out card can't be found, so its image can't be replaced here.
> 3. **The apostrophe fold in `filterCards`.** `filterCards` compared `toLowerCase()` only (`filterCards.ts:9`, `:15`, `:20-21`). The app's own name search folds ‘ and ’ to ' in both the query and the name (its private `searchKey`, `loader.ts:246-251` at `16283a13`). Two pinned preview names print ’: 14047 "Peter Pan’s Shadow - Elusive Prankster" and 14178 "Woolter & Jesse - Bellwether’s Henchmen". Typing "peter pan's" in Edit card couldn't find the cards Edit exists to fix.
>    - `filterCards` folds the query inline and each name through a private `nameKey(card)`. A `searchKey(value: string)` like the app's would have added a primitive parameter to a module that already has 2 of 3 (see note 6).
>    - The signature stays `filterCards(cards, query, limit = 40)`. `CardImagePicker.tsx:55` still calls it until R4-6c deletes the picker. Its doc comment stops naming "the image-admin picker".
> 4. **The change rows.**
>    - **`changeRows({loaded, changes, imageName})`, with `loaded` nullable.** R4-4 calls it for every card, and an image-only card (released, R-61, or one of R-65's cases) has `loaded: null` and `changes: {}`. As outlined (`changeRows(loaded: LorcanaJSONCard, …)`), that path didn't typecheck. One object argument also keeps primitives down.
>    - **Labels in a table.** `LABELS: Record<EditableCardKey, string | null>` covers every key, so a key R4-1a adds fails typecheck until it has a label. `fullName` and `fullTextSections` are null, since they follow from name and version and from the card text, and get no row. The stat labels come from `STAT_LABELS` (`constants.ts:18-23`). The words are the prototype's (`Inkweave Admin.dc.html:775`): Name, Version, Franchise, Subtypes, Ink, Rarity, Type, Inkwell, Cost, the stats, Keywords, Card text and Scan language. The table's order is the list's order: the studio form's, section by section, whatever order `changes` comes in.
>    - **Formatters in a table, with `String` as the default.** No switch, and no string-parameter helper per key. A missing or removed value reads "—". An absent `scanLanguage` reads "English", because no key means an English scan. A dual ink reads "Amber / Steel", the inkwell "Inkable" or "Uninkable", subtypes and keywords are joined with ", " (keywords by their `fullText`, "Singer 5"), and a language by its English name.
>    - **The language name is this task's `languageName`** (R-60), from `src/tools/studio/scanLanguages.ts`, where R4-5b's select reads `scanLanguageOptions`. It is the app's own rule, `CardTranslationPanel.tsx:21-28` at `16283a13` (a private `languageName` there): `Intl.DisplayNames(['en'])`'s name for the code ("zh" → "Chinese"), else the code.
>      - **The name** is the header's (addition 10), not R4-2a's earlier draft's `scanLanguageName`, so R4-8 records no rename.
>      - **No label lookup first.** The header sketches "SCAN_LANGUAGES' label, else Intl.DisplayNames". `Intl.DisplayNames(['en'])` already names every listed code as its label, and a test pins that, so the lookup is left out, as R4-2a's hand-off advised (a mutant without it survived there).
>      - **French is R4-3a's** (the header's decisions table: "R-60: French added … R4-3a"). Nothing here depends on it: the tests build what they expect from `SCAN_LANGUAGES`, so they hold with or without French.
>    - **Values are never cut short.** The prototype slices each side at 18 characters (`dc.html:776`). The model returns whole strings, and R4-5e wraps them as R2's tray does (`PendingTray.tsx:50-57`, "never cut short").
>    - **`ChangeRow` gains `id`.** It is the card key, or `'image'`. It keys the list's rows and lets tests pin the order without quoting labels. It carries no form fields, because R-77 leaves per-row revert out of R4.
>    - **One Image-row wording (R4-5).** The outline gave `{label: 'Image', from: 'current', to: imageName}`, while the handoff and the outline's R4-5 drew "Image: replaced" (`dc.html:777`). The row is now `{id: 'image', label: 'Image', from: 'current art', to: imageName}`. "Current art" is the studio's word for the art being replaced: R-89's thumbnail alt ("Current art for {name}") and R-91's staged note ("It replaces the current art when you save") use it too. R4-5e renders the row as it renders every other row and writes no Image wording of its own. The row comes last, and an image-only card's list holds it alone.
>    - **`changeCount(rows)`, new.** It gives the list's heading in the handoff's words: "No changes yet", "1 change", "N changes" (`dc.html:1020`). The staged image counts as a change, as the prototype counts it. It keeps the count logic out of R4-5e's component.
>    - **Display only.** Dirty, Save, the save path and the guard use R4-2a's `hasEdits({changes, imageName})`, never the row count. They agree for every entry that opens with fields: such an entry round-trips (R-65), so `fullName` and `fullTextSections` change only alongside name, version or card text, which have rows.
> 5. **Dependencies and the contract.**
>    - `changeRows.ts` imports `type EditableCardKey` and `type PreviewCardChanges` from R4-1a's `src/tools/reveal/replaceCardInPreviewJson.ts`, and `languageName` from this task's `scanLanguages.ts`.
>    - Nothing comes from R4-2a: the tests write `changes` by hand, in `cardChanges`' shape. The header's dependency row (R4-1a, R4-2a, R4-3a) is build order only. R4-3a's French isn't needed either (note 4).
>    - The search half, the `filterCards` fold and `scanLanguages.ts` need nothing from R4-1a and could run in parallel with it.
>    - Imports go to the modules directly, never through the reveal and image barrels, which R4-6c deletes (`reveal/index.ts`, `image/index.ts:2`).
>    - This task touches no reveal-sync contract file. `constants.ts` is only imported, so there is no reveal-sync run.
>    - **Changes to the header's addition 10**, for R4-8 to record:
>      - `cardTag` returns `CardTag | null`, and `SearchRow.tag` is `CardTag | null`. `previewIds` is `ReadonlySet<number> | null` in `cardTag` and in `searchCards`' input (R-71, note 2). The controller's `file.previewIds` (addition 11) follows: R4-4b's `PreviewFileView` already types it so.
>      - `searchCards` takes `cards: readonly LorcanaCard[]`, which accepts the header's `LorcanaCard[]`.
>    - **Additions:** `previewIdsOf`, `EditSearchInput`, `EditSearchResult`, `ChangeRow.id`, `ChangeRowsInput`, `changeCount`, `ScanLanguageOption` and `scanLanguageOptions` (which R4-5b's select reads).
> 6. **Code Health.** The PR gate is stricter than the local tool, so each module was hand-counted. Primitives are `string`, `number` and `boolean` parameters of named functions, their aliases, and a defaulted `limit = 40`.
>
>    | Module | Before | After |
>    |---|---|---|
>    | `editSearch.ts` (new) | — | 0 of 8: `previewIdsOf(entries)`, `inFile(card, previewIds)`, `cardTag(card, previewIds)`, `previewFirst(cards, previewIds)`, `searchCards(input)` |
>    | `changeRows.ts` (new) | — | 0 of 3: `formatValue({key, value})`, `changeRows(input)`, `changeCount(rows)` |
>    | `scanLanguages.ts` (new) | — | 2 of 2: `languageName(code)`, `scanLanguageOptions(current)` |
>    | `filterCards.ts` | 2 of 3 (`query`, `limit`) | 2 of 4: `nameKey(card)` adds an object parameter, so the share falls from 67% to 50% |
>
>    - **Lambdas, counted conservatively.** Counted with the key union `EditableCardKey` as an alias of `string`, `changeRows.ts`'s lambdas add 3 primitives in 8: `LISTED`'s `key`, and `FORMAT`'s `color` and `inkable`, contextually typed. That makes 3 of 11 (27%), still under 30%. `filterCards.ts`'s lambdas take cards, so it is 2 of 7 with lambdas.
>    - **`filterCards.ts` stays above 30%** on named functions alone, as it was on `main`. It is 4 parameters, far below the 12-argument floor at which String Heavy Function Arguments fired on `githubCommit.ts`. R3-1a's `layout.ts` (1 of 1) passed R3's gate.
>    - **`scanLanguages.ts` is a two-function module of string parameters**, as the header allows ("1 of 1 or 2 of 2, a small module like `lastCard.ts`"). R3's `analytics/cards/lastCard.ts` (2 of 2: `writeLastCard(cardId)`, `forgetLastCard(cardId)`) passed R3's gate. Its one lambda takes an object. `scanLanguageOptions` keeps its string parameter because R4-5b's draft calls `scanLanguageOptions(form.scanLanguage)`.
>    - **Complexity.** Each function's cyclomatic complexity is 5 or less. `formatValue` and `cardTag` are the highest.
>    - **No complex conditional.** The one `||` in new code is `value === null || value === undefined`, two terms.
> 7. **Steps follow gates-once.**
>    - The four targeted test files, `eslint` on the eight changed files, and one `pnpm typecheck`.
>    - A Code Health step: `code_health_review` on each file, then `pre_commit_code_health_safeguard` once they are staged.
>    - The commit, in two Bash calls.
>    - The pre-commit hook runs the full lint and `test:run`. No step runs those, and none runs `pnpm build`.
> 8. **Verified in a scratch sandbox** (`scratchpad/r4-rebase/sandbox-r42b-verify`), with every code block extracted from this file as written.
>    - **Setup.** The working tree's `src` and configs were copied (main `b490fb7` with the pin bump to `16283a13`). `node_modules` and `upstream` are junctions to the repo, read-only. Vite's `cacheDir` and the tsbuildinfo were moved into the sandbox.
>    - **What it builds on.** R4-1a's verified `replaceCardInPreviewJson.ts` (from `sandbox-r41a-verify`). Nothing from R4-2a. `constants.ts` was run both as `main` has it and with R-60's French block (R4-2a's Appendix A).
>    - **Red steps.**
>      - Step 3 fails exactly as stated: `Tests  4 failed | 5 passed (9)`, with `expected [] to deeply equal [ '1' ]` (three cases) and `[ '2', '1' ]`.
>      - Steps 7, 11 and 15 fail with the import errors quoted there, and `Tests  no tests`.
>    - **Green.** Steps 5, 9, 13 and 17 pass 9, 17, 6 and 20 tests. Step 18's run passes 4 files and 52 tests, with either `constants.ts`.
>    - **Typecheck.** `tsc -p tsconfig.app.json` exits 0 with either `constants.ts`. A planted type error in `src/tools/studio/__tests__` was reported, so the check reaches the new files.
>    - **Lint.** `pnpm exec eslint --max-warnings 0 --stdin --stdin-filename <path>`, run in the repo, is clean on all eight files.
>    - **CodeScene** (local MCP 1.5.7, in a throwaway git folder inside the sandbox, since the CLI needs a repository): 10.0 on all eight files, with no findings on the four source files and `scanLanguages.test.ts`.
>    - **Mutations.** Fourteen were tried, and the tests caught every one:
>      - no preview-first partition, no null tag for an unread file, and `total` capped at `SEARCH_LIMIT`;
>      - the fold dropped from the query, and from names;
>      - values cut at 18 characters, an absent scan language read as "—", no language formatter, the Image row first, and no "No changes yet";
>      - `languageName` returning the code, or rethrowing; `scanLanguageOptions` always or never adding the current code.
> 9. **When the plan is assembled.**
>    - **R4-2a** creates no `scanLanguages.ts` (its final draft hands it here). If an assembled R4-2a still carries one, drop it there, or Step 1 here stops.
>    - **R4-3a** owns French in `SCAN_LANGUAGES` and the widened `ScanLanguage` (the header's decisions table). Its draft carries neither yet; R4-2a's Appendix A holds the verified block. This task needs neither.
>    - **R4-5b** imports `scanLanguageOptions` from `src/tools/studio/scanLanguages.ts`, as its draft does, so its fallback ("if R4-2b exports only the name function") doesn't apply. The name function is `languageName`.
>    - **R4-4d** appends two cases to `editSearch.test.ts` and expects `2 failed | 17 passed (19)`. This file keeps 17 cases.
>    - **R4-4b, R4-4d and R4-6b** build `previewIds` with `previewIdsOf(fileEntries)`, passing null while the file is loading or after a failed read. They call `changeRows({loaded, changes, imageName})` with `loaded: null` and `changes: {}` for an image-only card.
>    - **R4-4d (R-66)** passes the union list as `cards`. A branch-only card's id is in `previewIds`, so it leads the list and tags Preview with no change here. Its "not deployed yet" mark and the graduated-id state are R4-4d's. Until then, a reveal-band id the file lacks tags Released.
>    - **R4-5e** keys `ChangeList`'s rows by `row.id`. Each row is its label, then `<code>{from} → {to}</code>` in `PendingTray`'s `DIFF` style. The heading is `changeCount(rows)`.
>    - **R4-5f's `EditSearch`** draws no chip for a null tag. Its status line reads `SEARCH_LIMIT` and `total`.
>    - **R4-6c** leaves `searchCards` as `filterCards`' only caller. The `limit` default can stay.
>    - **Corrections to the spec (optional).** The controller may record a fifth R-91 entry: the change list's Image row reads "current art → {file name}", not the handoff's "Image: replaced", and no value is cut short.

### Task R4-2b: Edit search and change rows

Edit card opens on a search over the card list, and lists its pending edits as a diff before Save. This task builds both as pure modules. `editSearch.ts` tags each card Preview or Released from the branch file, lists the file's cards first (R-76), and caps the list at `SEARCH_LIMIT`. `changeRows.ts` turns R4-2a's `cardChanges` into labelled, whole "from → to" rows, with the staged image last. `scanLanguages.ts` names a scan language in English and lists the Scan language select's options (R-60). The kept `filterCards` learns the app's apostrophe fold, so "peter pan's" finds "Peter Pan’s Shadow". Nothing renders yet: R4-5b, R4-5e and R4-5f draw these.

**Files:**
- **Create:**
  - `src/tools/studio/editSearch.ts`
  - `src/tools/studio/scanLanguages.ts`
  - `src/tools/studio/changeRows.ts`
  - `src/tools/studio/__tests__/editSearch.test.ts`
  - `src/tools/studio/__tests__/scanLanguages.test.ts`
  - `src/tools/studio/__tests__/changeRows.test.ts`
- **Modify:**
  - `src/tools/image/filterCards.ts`: the doc comment (`:3-7`), a new constant and `nameKey` above `filterCards`, and the folds at `:9`, `:15`, `:20-21`.
  - `src/tools/image/__tests__/filterCards.test.ts`: four new tests before the closing `});` (`:32`).
- **Checked and kept:**
  - `src/tools/image/components/CardImagePicker.tsx:55`, which calls `filterCards(cards, query)` with the same signature;
  - `src/tools/reveal/constants.ts` (imported only, a reveal-sync contract file);
  - `src/tools/reveal/index.ts` and `src/tools/image/index.ts`, which this task doesn't import through.

**Interfaces:**
- **Consumes:**
  - **R4-1a**, from `src/tools/reveal/replaceCardInPreviewJson.ts`:
    ```ts
    export type EditableCardKey = (typeof EDITABLE_CARD_KEYS)[number];
    // name, fullName, version, cost, color, inkwell, type, rarity, franchise, subtypes, abilities,
    // fullText, fullTextSections, strength, willpower, lore, moveCost, scanLanguage
    export type PreviewCardChanges = {[K in EditableCardKey]?: LorcanaJSONCard[K] | null}; // null removes the key
    ```
  - **R4-2a's `cardChanges`** produces the `changes` the rows read, and `hasEdits` stays the one edits rule. This task imports neither, and nothing else from R4-2a.
  - **`main`:**
    - From `src/tools/reveal/constants.ts`: `STAT_LABELS` (`:18-23`), `SCAN_LANGUAGES` (`:39-44`, `{code, label}` entries, with French once R4-3a adds it) and `REVEAL_SET_CODE` (`:51`, re-exported from the bridge, `'14'` at the pin).
    - `filterCards` (`src/tools/image/filterCards.ts:8-25`).
    - `REVEAL_ID_BASE` (`constants.ts:51`, 14000), in tests only.
  - **The engine:**
    - `LorcanaCard.id` is a string (`packages/synergy-engine/src/types/card.ts:28`).
    - `LorcanaJSONCard.id` is a number (`utils/cardTransformer.ts:32`).
    - An ability's `fullText` is required (`:41-48`).
- **Produces:**
  ```ts
  // src/tools/studio/editSearch.ts
  export const SEARCH_LIMIT = 40;
  export type CardTag = 'Preview' | 'Released';
  export interface SearchRow {card: LorcanaCard; tag: CardTag | null}   // null: a reveal-set card while the file is unread
  export interface EditSearchInput {
    cards: readonly LorcanaCard[];            // the card list (Core sets 9 and up); R4-4d passes the union
    query: string;
    previewIds: ReadonlySet<number> | null;   // the branch file's ids; null while it loads or after a failed read
  }
  export interface EditSearchResult {rows: SearchRow[]; total: number}  // rows: the first SEARCH_LIMIT; total: every match
  export function previewIdsOf(entries: readonly LorcanaJSONCard[] | null): ReadonlySet<number> | null;
  export function cardTag(card: LorcanaCard, previewIds: ReadonlySet<number> | null): CardTag | null;
  export function searchCards(input: EditSearchInput): EditSearchResult;

  // src/tools/studio/scanLanguages.ts (R-60)
  export interface ScanLanguageOption {code: string; label: string}
  export function languageName(code: string): string;   // Intl.DisplayNames(['en'])'s name, else the code; each listed label
  export function scanLanguageOptions(current: string): readonly ScanLanguageOption[];   // SCAN_LANGUAGES, plus current if unlisted

  // src/tools/studio/changeRows.ts
  export interface ChangeRow {id: EditableCardKey | 'image'; label: string; from: string; to: string}
  export interface ChangeRowsInput {
    loaded: LorcanaJSONCard | null;   // null for an image-only card
    changes: PreviewCardChanges;      // cardChanges' result; {} for an image-only card
    imageName: string | null;         // the staged image's file name
  }
  export function changeRows(input: ChangeRowsInput): ChangeRow[];  // form order, then {id: 'image', label: 'Image', from: 'current art', to: imageName}
  export function changeCount(rows: readonly ChangeRow[]): string;  // 'No changes yet' | '1 change' | 'N changes'

  // src/tools/image/filterCards.ts: signature unchanged; ‘ and ’ now match ' in the query and in names
  export function filterCards(cards: LorcanaCard[], query: string, limit = 40): LorcanaCard[];
  ```

- [ ] **Step 1: Check what this task builds on**

From the repo root, on `feature/24-redesign-r4`:

```bash
git -C upstream/inkweave rev-parse --short=8 HEAD
grep -n "export const EDITABLE_CARD_KEYS\|export type EditableCardKey\|export type PreviewCardChanges" src/tools/reveal/replaceCardInPreviewJson.ts
grep -n "export const SCAN_LANGUAGES\|export const STAT_LABELS" src/tools/reveal/constants.ts
grep -n "toLowerCase\|TYPOGRAPHIC" src/tools/image/filterCards.ts
grep -rnwE "searchCards|changeRows|changeCount|cardTag|previewIdsOf|SEARCH_LIMIT|languageName|scanLanguageName|scanLanguageOptions" src
ls src/tools/studio/editSearch.ts src/tools/studio/scanLanguages.ts src/tools/studio/changeRows.ts
```

Expected:
- The first command prints `16283a13`.
- The second prints three lines: R4-1a's exports. Their line numbers don't matter.
- The third prints two lines, `STAT_LABELS` and `SCAN_LANGUAGES`. Their line numbers don't matter, and neither does whether R4-3a has added French yet.
- The fourth prints exactly these lines, and no `TYPOGRAPHIC`:
  ```
  9:  const q = query.trim().toLowerCase();
  15:    (c) => c.fullName.toLowerCase().includes(q) || c.id.includes(q),
  20:    const aPrefix = a.fullName.toLowerCase().startsWith(q) ? 0 : 1;
  21:    const bPrefix = b.fullName.toLowerCase().startsWith(q) ? 0 : 1;
  ```
- The fifth prints nothing (exit 1). In particular, R4-2a's `cardEdit.ts` and `studioFixtures.ts` define none of these names.
- `ls` prints `No such file or directory` for all three files. If `scanLanguages.ts` exists, an earlier task created it (R4-2a's earlier draft did): stop and report.

If any of these differs, stop and report.

If this checkout has never built the engine, run `pnpm build:engine` once. The tests reach the bridge through `constants.ts`.

- [ ] **Step 2: Write the failing `filterCards` tests**

In `src/tools/image/__tests__/filterCards.test.ts`, insert these tests after "caps results at `limit`" (`:28-31`) and a blank line, before the file's closing `});` (`:32`):

```ts
  it('puts fullName prefix matches first, and keeps list order within each rank', () => {
    const cards = [
      card({id: '1', fullName: 'Hanna - Skater'}),
      card({id: '2', fullName: 'Anna - Heir to Arendelle'}),
      card({id: '3', fullName: 'Joanna - Baker'}),
      card({id: '4', fullName: 'Anna - Soothing Sister'}),
    ];
    expect(filterCards(cards, 'anna').map((c) => c.id)).toEqual(['2', '4', '1', '3']);
  });

  // Set 14's preview names print ’ (Peter Pan’s Shadow, Bellwether’s Henchmen), while
  // released names and most keyboards use '. iOS types ’. The app's search folds both.
  it.each([
    ['a straight query finds a typographic name', "pan's", 'Peter Pan’s Shadow - Elusive Prankster'],
    ['a typographic query finds a straight name', 'pan’s', "Peter Pan's Shadow - Elusive Prankster"],
    ['an opening quote folds too', 'pan‘s', "Peter Pan's Shadow - Elusive Prankster"],
  ])('%s', (_, query, fullName) => {
    const cards = [card({id: '1', fullName}), card({id: '2', fullName: 'Peter Pan - Never Land Hero'})];
    expect(filterCards(cards, query).map((c) => c.id)).toEqual(['1']);
  });

  it('ranks a prefix match by its folded name', () => {
    const cards = [
      card({id: '1', fullName: 'Lost Boys - Peter Pan’s Crew'}),
      card({id: '2', fullName: 'Peter Pan’s Shadow - Elusive Prankster'}),
    ];
    expect(filterCards(cards, "peter pan's").map((c) => c.id)).toEqual(['2', '1']);
  });
```

The quotes are literal U+2019 (’) and U+2018 (‘) characters, as in the pinned names. The first test pins today's ranking: the outline's prefix test belongs here, not in `editSearch.test.ts`.

- [ ] **Step 3: Run them, and see them fail**

```bash
pnpm vitest run --project app src/tools/image/__tests__/filterCards.test.ts
```

Expected: FAIL, `Tests  4 failed | 5 passed (9)`.
- The three apostrophe cases fail with `AssertionError: expected [] to deeply equal [ '1' ]`.
- "ranks a prefix match by its folded name" fails with `expected [] to deeply equal [ '2', '1' ]`.
- The prefix test and the four existing tests pass.

- [ ] **Step 4: Fold the apostrophes in `filterCards`**

Replace `src/tools/image/filterCards.ts` with:

```ts
import type {LorcanaCard} from 'inkweave-synergy-engine';

/**
 * Typographic single quotes (U+2018, U+2019). iOS types ’ for ', and Set 14's
 * preview names print it ("Peter Pan’s Shadow"). The search spells both ' in
 * the query and in every name, as the app's own name search does (the private
 * searchKey in its features/cards/loader.ts), so either style finds the other.
 * Global flag: use with .replace only.
 */
const TYPOGRAPHIC_APOSTROPHE = /[‘’]/g;

/** A card's fullName as the search compares it: lowercase, with ‘ and ’ spelled '. */
function nameKey(card: LorcanaCard): string {
  return card.fullName.toLowerCase().replace(TYPOGRAPHIC_APOSTROPHE, "'");
}

/**
 * Filter a card list by a search query. Matches the query against card fields
 * (case-insensitive, either apostrophe style) and returns at most `limit`
 * cards. A blank query returns the head of the list.
 */
export function filterCards(cards: LorcanaCard[], query: string, limit = 40): LorcanaCard[] {
  const q = query.trim().toLowerCase().replace(TYPOGRAPHIC_APOSTROPHE, "'");
  if (q === '') return cards.slice(0, limit);

  // fullName is "name - version", so matching it covers name and version in one
  // check; id (a numeric string) needs its own.
  const matches = cards.filter(
    (c) => nameKey(c).includes(q) || c.id.includes(q),
  );
  // Surface prefix matches first ("els" -> "Elsa" before "Consuela"); sort is
  // stable, so same-rank cards keep their original order.
  matches.sort((a, b) => {
    const aPrefix = nameKey(a).startsWith(q) ? 0 : 1;
    const bPrefix = nameKey(b).startsWith(q) ? 0 : 1;
    return aPrefix - bPrefix;
  });
  return matches.slice(0, limit);
}
```

The diff against `main` is the doc comment, the constant, `nameKey`, and the four folds. The body's shape and its two comments are unchanged.
- The query folds inline and names fold through `nameKey`, so the module gains no primitive parameter (re-base note 6).
- `TYPOGRAPHIC_APOSTROPHE` is a literal character class, as the app writes it (`loader.ts:246` at `16283a13`). The comment names the app's file, not its line numbers, which a pin bump moves.

- [ ] **Step 5: Run them to PASS**

```bash
pnpm vitest run --project app src/tools/image/__tests__/filterCards.test.ts
```

Expected: PASS, 9 tests.

- [ ] **Step 6: Write `editSearch`'s failing test**

Create `src/tools/studio/__tests__/editSearch.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {REVEAL_ID_BASE, REVEAL_SET_CODE} from '../../reveal/constants';
import {SEARCH_LIMIT, cardTag, previewIdsOf, searchCards} from '../editSearch';

/** A card-list card; ids are strings there, as the card list holds them. */
function card(p: Partial<LorcanaCard>): LorcanaCard {
  return {id: '1', name: 'X', fullName: 'X', cost: 1, ink: 'Amber', inkwell: true, type: 'Character', setCode: '9', ...p};
}

/** A card of the reveal set, with its reveal-band id. */
function revealCard(number: number, p: Partial<LorcanaCard> = {}): LorcanaCard {
  return card({id: String(REVEAL_ID_BASE + number), setCode: REVEAL_SET_CODE, ...p});
}

const ids = (rows: {card: LorcanaCard}[]) => rows.map((row) => row.card.id);

describe('previewIdsOf', () => {
  it('collects the branch file’s ids as numbers', () => {
    const entries = [{id: REVEAL_ID_BASE + 1}, {id: REVEAL_ID_BASE + 2}] as LorcanaJSONCard[];
    expect(previewIdsOf(entries)).toEqual(new Set([REVEAL_ID_BASE + 1, REVEAL_ID_BASE + 2]));
  });

  it('is null while the file is unread, so the tags can say they don’t know yet', () => {
    expect(previewIdsOf(null)).toBeNull();
  });
});

describe('cardTag', () => {
  const inFile = new Set([REVEAL_ID_BASE + 1]);

  it.each([
    ['a reveal-set card the file holds is Preview', revealCard(1), inFile, 'Preview'],
    ['a reveal-set card the file lacks is Released', revealCard(2), inFile, 'Released'],
    ['a reveal-set card after graduation (an empty file) is Released', revealCard(1), new Set<number>(), 'Released'],
    ['a reveal-set card waits for the file (R-71)', revealCard(1), null, null],
    ['another set’s card is Released without the file (R-71)', card({id: '1936', setCode: '9'}), null, 'Released'],
    // A pin that lags a season switch (R-65): the file's own word wins over admin's set code.
    ['an entry the file holds is Preview, whatever its set', card({id: '15001', setCode: '15'}), new Set([15001]), 'Preview'],
  ])('%s', (_, subject, previewIds, expected) => {
    expect(cardTag(subject, previewIds)).toBe(expected);
  });
});

describe('searchCards', () => {
  it('lists the branch file’s cards first for a blank query, each part in card-list order (R-76)', () => {
    // The card list puts preview cards last, after every released card.
    const cards = [card({id: '1936'}), card({id: '1937'}), revealCard(5), revealCard(2), revealCard(9)];
    const previewIds = new Set([REVEAL_ID_BASE + 5, REVEAL_ID_BASE + 2]);
    expect(ids(searchCards({cards, query: '', previewIds}).rows)).toEqual([
      String(REVEAL_ID_BASE + 5),
      String(REVEAL_ID_BASE + 2),
      '1936',
      '1937',
      String(REVEAL_ID_BASE + 9),
    ]);
  });

  it.each([
    ['unread', null],
    ['empty after graduation', new Set<number>()],
  ])('keeps the card list’s order while the file is %s', (_, previewIds) => {
    const cards = [card({id: '1936'}), revealCard(5), card({id: '1937'})];
    expect(ids(searchCards({cards, query: '  ', previewIds}).rows)).toEqual(['1936', String(REVEAL_ID_BASE + 5), '1937']);
  });

  it('keeps filterCards’ prefix ranking for a typed query, with the file’s cards first within a rank', () => {
    const cards = [
      card({id: '1', fullName: 'Hanna - Skater'}),
      card({id: '2', fullName: 'Anna - Heir to Arendelle'}),
      revealCard(7, {fullName: 'Joanna - Baker'}),
      revealCard(8, {fullName: 'Anna - Soothing Sister'}),
    ];
    const previewIds = new Set([REVEAL_ID_BASE + 7, REVEAL_ID_BASE + 8]);
    expect(ids(searchCards({cards, query: 'anna', previewIds}).rows)).toEqual([
      String(REVEAL_ID_BASE + 8),
      '2',
      String(REVEAL_ID_BASE + 7),
      '1',
    ]);
  });

  it.each([
    ['a blank query', '', 50],
    ['a query that matches 45', 'zz', 45],
  ])('caps the rows at SEARCH_LIMIT and counts every match, for %s', (_, query, total) => {
    const cards = [
      ...Array.from({length: 45}, (_, i) => card({id: String(i + 1), fullName: `Zz ${i + 1}`})),
      ...Array.from({length: 5}, (_, i) => card({id: String(i + 100), fullName: `Yy ${i + 1}`})),
    ];
    const result = searchCards({cards, query, previewIds: new Set()});
    expect(SEARCH_LIMIT).toBe(40);
    expect(result.rows).toHaveLength(SEARCH_LIMIT);
    expect(result.total).toBe(total);
  });

  it('tags each row: a numeric id set against the card list’s string ids', () => {
    const cards = [revealCard(1), revealCard(2), card({id: '1936'})];
    const {rows} = searchCards({cards, query: '', previewIds: new Set([REVEAL_ID_BASE + 1])});
    expect(rows.map((row) => row.tag)).toEqual(['Preview', 'Released', 'Released']);
  });

  it('leaves the reveal set’s rows untagged until the file is read (R-71)', () => {
    const {rows} = searchCards({cards: [revealCard(1), card({id: '1936'})], query: '', previewIds: null});
    expect(rows.map((row) => row.tag)).toEqual([null, 'Released']);
  });

  it('finds nothing for a query no card matches', () => {
    expect(searchCards({cards: [card({fullName: 'Elsa - Snow Queen'})], query: 'zzz', previewIds: null})).toEqual({
      rows: [],
      total: 0,
    });
  });
});
```

Notes on the test:
- **Ids come from the season's constants** (`REVEAL_ID_BASE`, `REVEAL_SET_CODE`), so a season rotation in the pin moves the fixtures with it.
- **Out of scope here.** Name and id matching, and the cap's own behaviour, are `filterCards.test.ts`'s, so this file tests only order, tags, the cap and the total.
- **No stubs.** Nothing is stubbed and nothing is fetched, so the app project's shared worker needs no cleanup.

- [ ] **Step 7: Run it, and see it fail**

```bash
pnpm vitest run --project app src/tools/studio/__tests__/editSearch.test.ts
```

Expected: FAIL, with `Error: Failed to resolve import "../editSearch" from "src/tools/studio/__tests__/editSearch.test.ts". Does the file exist?`, and `Tests  no tests`.

- [ ] **Step 8: Write `editSearch.ts`**

Create `src/tools/studio/editSearch.ts`:

```ts
import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {filterCards} from '../image/filterCards';
import {REVEAL_SET_CODE} from '../reveal/constants';

/**
 * The most rows Edit card's search lists. The search screen's status line says
 * when a query finds more (R4-5f), so the two agree.
 */
export const SEARCH_LIMIT = 40;

/** Whether a card's data is still the branch file's (Preview) or LorcanaJSON's (Released, image only). */
export type CardTag = 'Preview' | 'Released';

/** One row of Edit card's search: the card, and its tag (null for a reveal-set card while the branch file is unread). */
export interface SearchRow {
  card: LorcanaCard;
  tag: CardTag | null;
}

export interface EditSearchInput {
  /** Every card the search can open: the card list (Core sets 9 and up). */
  cards: readonly LorcanaCard[];
  /** The text in the search field. */
  query: string;
  /** The ids in the target branch's previewCards.json (previewIdsOf); null until it is read, or after a failed read. */
  previewIds: ReadonlySet<number> | null;
}

export interface EditSearchResult {
  /** The first SEARCH_LIMIT matches, tagged. */
  rows: SearchRow[];
  /** Every match: for a blank query, every card. */
  total: number;
}

/** The branch file's ids, the set the search's tags and order read; null while the file is unread or failed. */
export function previewIdsOf(entries: readonly LorcanaJSONCard[] | null): ReadonlySet<number> | null {
  return entries === null ? null : new Set(entries.map((entry) => entry.id));
}

/** The card list's ids are strings; the file's are numbers. */
function inFile(card: LorcanaCard, previewIds: ReadonlySet<number> | null): boolean {
  return previewIds?.has(Number(card.id)) === true;
}

/**
 * A card's tag. The branch file decides for a card of the reveal set: Preview
 * when it holds the id, Released when it doesn't, and null (no tag yet) while it
 * is unread. A card of any other set is Released straight from the card list,
 * as R-71 rules for its kind. An entry the file holds reads Preview whatever its
 * set, as during a pin lag (R-65).
 */
export function cardTag(card: LorcanaCard, previewIds: ReadonlySet<number> | null): CardTag | null {
  if (inFile(card, previewIds)) return 'Preview';
  if (previewIds === null && card.setCode === REVEAL_SET_CODE) return null;
  return 'Released';
}

/**
 * The cards with the branch file's first, each part in the card list's order
 * (R-76). The card list puts preview cards last, so a blank query would
 * otherwise open on set 9's oldest cards, while field edits apply only to
 * preview cards. An unread or empty file leaves the order as it is.
 */
function previewFirst(cards: readonly LorcanaCard[], previewIds: ReadonlySet<number> | null): LorcanaCard[] {
  const preview = cards.filter((card) => inFile(card, previewIds));
  const rest = cards.filter((card) => !inFile(card, previewIds));
  return [...preview, ...rest];
}

/**
 * Edit card's search over every card in the card list (Core sets 9 and up),
 * through the kept filterCards (R-30): fullName or id, either apostrophe style,
 * prefix matches first. The branch file's cards lead each rank, so a blank query
 * lists them first (R-76). One filterCards pass gives the rows and the total.
 */
export function searchCards({cards, query, previewIds}: EditSearchInput): EditSearchResult {
  const matches = filterCards(previewFirst(cards, previewIds), query, Infinity);
  return {
    rows: matches.slice(0, SEARCH_LIMIT).map((card) => ({card, tag: cardTag(card, previewIds)})),
    total: matches.length,
  };
}
```

Notes:
- **One pass.** `previewFirst` always returns a new array, so `filterCards`' mutable parameter never sees the caller's list. `filterCards` with `Infinity` returns every match, and slicing is cheap. A blank query returns `cards.slice(0, Infinity)`, the whole reordered list.
- **Ids.** `Number(card.id)` bridges the card list's string ids and the file's numeric ones, as the outline asked.
- **`cardTag` doesn't read the card's number.** Whether an entry can be edited with fields is R4-2a's `editKindOf`. The tag only says whose data the card shows.

- [ ] **Step 9: Run it to PASS**

```bash
pnpm vitest run --project app src/tools/studio/__tests__/editSearch.test.ts
```

Expected: PASS, 17 tests.

- [ ] **Step 10: Write `scanLanguages`' failing test**

Create `src/tools/studio/__tests__/scanLanguages.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {SCAN_LANGUAGES} from '../../reveal/constants';
import {languageName, scanLanguageOptions} from '../scanLanguages';

describe('languageName (R-60)', () => {
  it('names every listed language as the list labels it', () => {
    expect(SCAN_LANGUAGES.map(({code}) => languageName(code))).toEqual(SCAN_LANGUAGES.map(({label}) => label));
  });

  // Codes a card was marked with by hand: the app's CardTranslationPanel names them the same way.
  it.each([
    ['pt', 'Portuguese'],
    ['zh', 'Chinese'],
    ['not a code', 'not a code'],
  ])('names the unlisted %s as %s', (code, name) => {
    expect(languageName(code)).toBe(name);
  });
});

describe('scanLanguageOptions (R-60)', () => {
  it('offers the listed languages, as they are, for a listed code', () => {
    expect(scanLanguageOptions('ja')).toEqual(SCAN_LANGUAGES);
  });

  it('adds a code the list lacks as an option of its own, named in English', () => {
    expect(scanLanguageOptions('pt')).toEqual([...SCAN_LANGUAGES, {code: 'pt', label: 'Portuguese'}]);
  });
});
```

Notes on the test:
- **The expectations come from `SCAN_LANGUAGES`,** so they hold before and after R4-3a adds French.
- **`'not a code'`** makes `Intl.DisplayNames` throw a `RangeError`, which the function catches.
- **`Intl` is Node's,** not jsdom's, so the names are ICU's English names in every worker.

- [ ] **Step 11: Run it, and see it fail**

```bash
pnpm vitest run --project app src/tools/studio/__tests__/scanLanguages.test.ts
```

Expected: FAIL, with `Error: Failed to resolve import "../scanLanguages" from "src/tools/studio/__tests__/scanLanguages.test.ts". Does the file exist?`, and `Tests  no tests`.

- [ ] **Step 12: Write `scanLanguages.ts`**

Create `src/tools/studio/scanLanguages.ts`:

```ts
import {SCAN_LANGUAGES} from '../reveal/constants';

/** One choice in the Scan language select. */
export interface ScanLanguageOption {
  code: string;
  label: string;
}

/**
 * A scan language's English name ("ja" is "Japanese"), as the app's
 * CardTranslationPanel names it: the runtime's name for the code, or the code
 * itself when it has none (R-60). For every SCAN_LANGUAGES code it is the
 * list's own label. The change list (changeRows) and the select both read it.
 */
export function languageName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], {type: 'language'}).of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * The Scan language select's options (R4-5b): SCAN_LANGUAGES, then the current
 * code as an option of its own when the list doesn't hold it, so a card marked
 * by hand keeps its language (R-60).
 */
export function scanLanguageOptions(current: string): readonly ScanLanguageOption[] {
  const listed = SCAN_LANGUAGES.some((language) => language.code === current);
  return listed ? SCAN_LANGUAGES : [...SCAN_LANGUAGES, {code: current, label: languageName(current)}];
}
```

Notes:
- **`languageName` is the app's rule,** copied from `CardTranslationPanel.tsx:21-28` (private there, so not bridged). The header's "label first" lookup is left out (re-base note 4).
- **`scanLanguageOptions` returns `SCAN_LANGUAGES` itself** for a listed code, so a select over it re-renders nothing new.
- **Types.** `SCAN_LANGUAGES` is `as const`, and its readonly entries are assignable to `ScanLanguageOption`. `current` is a `string`, so this module typechecks whether or not R4-3a has widened `ScanLanguage`.

- [ ] **Step 13: Run it to PASS**

```bash
pnpm vitest run --project app src/tools/studio/__tests__/scanLanguages.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 14: Write `changeRows`' failing test**

Create `src/tools/studio/__tests__/changeRows.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import type {PreviewCardChanges} from '../../reveal/replaceCardInPreviewJson';
import {changeCount, changeRows, type ChangeRow} from '../changeRows';

/** A preview entry as previewCards.json holds one: no version, franchise or scanLanguage. */
const LOADED: LorcanaJSONCard = {
  id: 14031,
  name: 'Bambi',
  fullName: 'Bambi',
  cost: 3,
  color: 'Amber',
  inkwell: true,
  type: 'Character',
  rarity: 'Rare',
  subtypes: ['Storyborn', 'Hero'],
  abilities: [{type: 'keyword', keyword: 'Singer', keywordValue: '5', fullText: 'Singer 5'}],
  fullText: 'Singer 5',
  fullTextSections: ['Singer 5'],
  strength: 2,
  willpower: 4,
  lore: 1,
  setCode: '14',
  number: 31,
};

const rowsFor = (changes: PreviewCardChanges, imageName: string | null = null) =>
  changeRows({loaded: LOADED, changes, imageName});

describe('changeRows', () => {
  it('labels a rename, prints — for a value the card lacked, and gives fullName no row', () => {
    expect(rowsFor({name: 'Faline', version: 'Playful Fawn', fullName: 'Faline - Playful Fawn'})).toEqual([
      {id: 'name', label: 'Name', from: 'Bambi', to: 'Faline'},
      {id: 'version', label: 'Version', from: '—', to: 'Playful Fawn'},
    ]);
  });

  it('prints — for a removed value (null)', () => {
    expect(rowsFor({rarity: null})).toEqual([{id: 'rarity', label: 'Rarity', from: 'Rare', to: '—'}]);
  });

  it('lists a retype with the stats it clears, under STAT_LABELS’ names', () => {
    expect(rowsFor({type: 'Location', strength: null, moveCost: 2})).toEqual([
      {id: 'type', label: 'Type', from: 'Character', to: 'Location'},
      {id: 'strength', label: 'Strength', from: '2', to: '—'},
      {id: 'moveCost', label: 'Move cost', from: '—', to: '2'},
    ]);
  });

  it.each<[string, PreviewCardChanges, Pick<ChangeRow, 'from' | 'to'>]>([
    ['a dual ink with a slash', {color: 'Amber-Steel'}, {from: 'Amber', to: 'Amber / Steel'}],
    ['the inkwell in words', {inkwell: false}, {from: 'Inkable', to: 'Uninkable'}],
    ['subtypes joined with commas', {subtypes: ['Storyborn', 'Ally']}, {from: 'Storyborn, Hero', to: 'Storyborn, Ally'}],
    [
      'each keyword by its text',
      {abilities: [{type: 'keyword', keyword: 'Singer', keywordValue: '5', fullText: 'Singer 5'}, {type: 'keyword', keyword: 'Ward', fullText: 'Ward'}]},
      {from: 'Singer 5', to: 'Singer 5, Ward'},
    ],
    ['emptied keywords as —', {abilities: null}, {from: 'Singer 5', to: '—'}],
    ['the cost as a number', {cost: 10}, {from: '3', to: '10'}],
    ['a marked scan by its language, and no mark as English', {scanLanguage: 'ja'}, {from: 'English', to: 'Japanese'}],
    ['an unlisted code by its English name (R-60)', {scanLanguage: 'zh'}, {from: 'English', to: 'Chinese'}],
  ])('prints %s', (_, changes, expected) => {
    expect(rowsFor(changes)).toMatchObject([expected]);
  });

  it('prints English for a scan refreshed to English (admin#14’s case)', () => {
    const loaded = {...LOADED, scanLanguage: 'it'};
    expect(changeRows({loaded, changes: {scanLanguage: null}, imageName: null})).toEqual([
      {id: 'scanLanguage', label: 'Scan language', from: 'Italian', to: 'English'},
    ]);
  });

  it('keeps every value whole, however long', () => {
    const fullText = `Whenever this character quests, ${'each opponent loses 1 lore and '.repeat(8)}you gain 1 lore.`;
    const [row] = rowsFor({fullText, fullTextSections: [fullText]});
    expect(row).toEqual({id: 'fullText', label: 'Card text', from: 'Singer 5', to: fullText});
  });

  it('lists the rows in the form’s order, whatever order the changes come in', () => {
    // Every editable key changes, listed backwards: the rows still read section by section.
    const changes: PreviewCardChanges = {
      scanLanguage: 'de',
      fullTextSections: ['Ward'],
      fullText: 'Ward',
      abilities: null,
      moveCost: 1,
      lore: 2,
      willpower: 3,
      strength: 4,
      cost: 5,
      inkwell: false,
      type: 'Location',
      rarity: 'Common',
      color: 'Ruby',
      subtypes: ['Ally'],
      franchise: 'Bambi',
      fullName: 'Faline - Playful Fawn',
      version: 'Playful Fawn',
      name: 'Faline',
    };
    expect(rowsFor(changes, 'faline.png').map((row) => row.id)).toEqual([
      'name',
      'version',
      'franchise',
      'subtypes',
      'color',
      'rarity',
      'type',
      'inkwell',
      'cost',
      'strength',
      'willpower',
      'lore',
      'moveCost',
      'abilities',
      'fullText',
      'scanLanguage',
      'image',
    ]);
  });

  it('puts a staged image last, worded as the card panel words it', () => {
    expect(rowsFor({cost: 4}, 'bambi-new.png')).toEqual([
      {id: 'cost', label: 'Cost', from: '3', to: '4'},
      {id: 'image', label: 'Image', from: 'current art', to: 'bambi-new.png'},
    ]);
  });

  it('gives an image-only card its Image row alone (loaded null, no changes)', () => {
    expect(changeRows({loaded: null, changes: {}, imageName: 'elsa.webp'})).toEqual([
      {id: 'image', label: 'Image', from: 'current art', to: 'elsa.webp'},
    ]);
  });

  it('is empty with no changes and no image', () => {
    expect(changeRows({loaded: null, changes: {}, imageName: null})).toEqual([]);
    expect(rowsFor({})).toEqual([]);
  });
});

describe('changeCount', () => {
  const row: ChangeRow = {id: 'cost', label: 'Cost', from: '3', to: '4'};

  it.each([
    [0, 'No changes yet'],
    [1, '1 change'],
    [3, '3 changes'],
  ])('reads %i rows as "%s"', (count, expected) => {
    expect(changeCount(Array.from({length: count}, () => row))).toBe(expected);
  });
});
```

Notes on the test:
- **The fixture** is hand-built, not read from `PINNED_PREVIEW_CARDS_JSON`. The file empties when a set graduates, and R4-2a's round-trip test already walks every pinned card.
- **`changes` are written by hand** in the shape R4-2a's `cardChanges` returns: name changes carry `fullName`, and card-text changes carry `fullTextSections`. So this file doesn't depend on R4-2a's diffing.
- **`'zh'` stands for an unlisted code.** `'fr'` will be listed once R4-3a adds French. `'it'` covers a hand-marked card refreshed to English, admin#14's case.
- **`toMatchObject([expected])`** also checks that the list has exactly one row.

- [ ] **Step 15: Run it, and see it fail**

```bash
pnpm vitest run --project app src/tools/studio/__tests__/changeRows.test.ts
```

Expected: FAIL, with `Error: Failed to resolve import "../changeRows" from "src/tools/studio/__tests__/changeRows.test.ts". Does the file exist?`, and `Tests  no tests`.

- [ ] **Step 16: Write `changeRows.ts`**

Create `src/tools/studio/changeRows.ts`:

```ts
import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import {STAT_LABELS} from '../reveal/constants';
import type {EditableCardKey, PreviewCardChanges} from '../reveal/replaceCardInPreviewJson';
import {languageName} from './scanLanguages';

/**
 * One line of Edit card's change list (R4-5e): what changed, and its value
 * before and after the edit. Both values are whole, never cut short: the list
 * wraps them, as R2's tray wraps its diffs (PendingTray's DIFF).
 */
export interface ChangeRow {
  /** The changed card key, or 'image' for a staged image. Unique in a list, so it keys the row. */
  id: EditableCardKey | 'image';
  label: string;
  from: string;
  to: string;
}

export interface ChangeRowsInput {
  /** The entry as the editor loaded it; null for a card that opens image-only (R-61, R-65). */
  loaded: LorcanaJSONCard | null;
  /** cardChanges' result (R4-2a): a new value per changed key, null for a removed one; {} for an image-only card. */
  changes: PreviewCardChanges;
  /** The staged image's file name, or null when none is staged. */
  imageName: string | null;
}

/**
 * Each key's label, in the order the list prints them: the studio form's,
 * section by section (Identity, Ink & rarity, Type & stats, Card text).
 * fullName follows from name and version, and fullTextSections from the card
 * text, so neither gets a row of its own (null).
 */
const LABELS: Readonly<Record<EditableCardKey, string | null>> = {
  name: 'Name',
  version: 'Version',
  fullName: null,
  franchise: 'Franchise',
  subtypes: 'Subtypes',
  color: 'Ink',
  rarity: 'Rarity',
  type: 'Type',
  inkwell: 'Inkwell',
  cost: 'Cost',
  ...STAT_LABELS,
  abilities: 'Keywords',
  fullText: 'Card text',
  fullTextSections: null,
  scanLanguage: 'Scan language',
};

/** The keys that get a row, with their labels, in LABELS' order. */
const LISTED = (Object.keys(LABELS) as EditableCardKey[]).flatMap((key) => {
  const label = LABELS[key];
  return label === null ? [] : [{key, label}];
});

/** How a present value reads, where String(value) won't do. */
const FORMAT: {[K in EditableCardKey]?: (value: NonNullable<LorcanaJSONCard[K]>) => string} = {
  color: (color) => color.split('-').join(' / '),
  inkwell: (inkable) => (inkable ? 'Inkable' : 'Uninkable'),
  subtypes: (subtypes) => subtypes.join(', '),
  abilities: (abilities) => abilities.map((ability) => ability.fullText).join(', '),
  scanLanguage: languageName,
};

/** How a missing value reads: a card with no scanLanguage has an English scan; any other key reads —. */
const MISSING: Partial<Record<EditableCardKey, string>> = {scanLanguage: 'English'};

function formatValue<K extends EditableCardKey>({key, value}: {key: K; value: LorcanaJSONCard[K] | null | undefined}): string {
  if (value === null || value === undefined) return MISSING[key] ?? '—';
  const format = FORMAT[key];
  return format ? format(value) : String(value);
}

/**
 * Edit card's change list: a row per changed key that has a label, in the
 * form's order, then the staged image's row. An image-only card has no field
 * changes, so its list holds the Image row alone. The Image row's wording is
 * the studio's one wording for it: the card panel's note and thumbnail say
 * "current art" too (R4-5d).
 */
export function changeRows({loaded, changes, imageName}: ChangeRowsInput): ChangeRow[] {
  const rows: ChangeRow[] = LISTED.filter(({key}) => changes[key] !== undefined).map(({key, label}) => ({
    id: key,
    label,
    from: formatValue({key, value: loaded?.[key]}),
    to: formatValue({key, value: changes[key]}),
  }));
  const image: ChangeRow[] = imageName === null ? [] : [{id: 'image', label: 'Image', from: 'current art', to: imageName}];
  return [...rows, ...image];
}

/** The change list's heading, as the handoff words it: "No changes yet", "1 change", "3 changes". */
export function changeCount(rows: readonly ChangeRow[]): string {
  if (rows.length === 0) return 'No changes yet';
  return rows.length === 1 ? '1 change' : `${rows.length} changes`;
}
```

Notes:
- **`LABELS` holds every key.** It is a full `Record` over `EditableCardKey`, so a key R4-1a adds fails typecheck here until it gets a label, or null. Spreading `STAT_LABELS` keeps the stat words in one place. `LISTED` turns the table into the row order once, at module load.
- **Typing.** `FORMAT` is a mapped type: each formatter receives its own key's present value, a boolean for `inkwell` and an array for `abilities`, so no formatter casts. `formatValue` is generic over the key. After the null check, TypeScript narrows `value` to `NonNullable<LorcanaJSONCard[K]>`, which the formatter takes. `tsc` accepts it with no assertion.
- **A row's presence.** A key is in the list when `changes` carries it (`!== undefined`). A null value is a removal and prints "—", or "English" for `scanLanguage`.
- **The from side.** It reads the loaded entry, so a key the card lacked prints "—", or "English".
- **The Image row** comes last and uses the studio's one wording (re-base note 4).
- **The language** is this task's `languageName` (Step 12), so a listed code reads as the select labels it, and any other by its English name.

- [ ] **Step 17: Run it to PASS**

```bash
pnpm vitest run --project app src/tools/studio/__tests__/changeRows.test.ts
```

Expected: PASS, 20 tests.

- [ ] **Step 18: Run the gates**

```bash
pnpm vitest run --project app src/tools/image/__tests__/filterCards.test.ts src/tools/studio/__tests__/editSearch.test.ts src/tools/studio/__tests__/scanLanguages.test.ts src/tools/studio/__tests__/changeRows.test.ts
pnpm exec eslint --max-warnings 0 src/tools/image/filterCards.ts src/tools/image/__tests__/filterCards.test.ts src/tools/studio/editSearch.ts src/tools/studio/__tests__/editSearch.test.ts src/tools/studio/scanLanguages.ts src/tools/studio/__tests__/scanLanguages.test.ts src/tools/studio/changeRows.ts src/tools/studio/__tests__/changeRows.test.ts
pnpm typecheck
```

Expected:
- **The tests:** 4 files and 52 tests pass (9, 17, 6 and 20).
- **`eslint`:** exits 0 with no warnings.
- **`pnpm typecheck`:** builds the engine and exits 0.

Don't run `pnpm lint`, `pnpm test:run` or `pnpm build`: the pre-commit hook runs the first two, and R4-8 runs the build. This task changes no reveal-sync contract file (`validateForm.ts`, `buildPreviewCard.ts`, `insertCardIntoPreviewJson.ts`, `constants.ts`), so there is no `scripts/reveal-sync` run.

- [ ] **Step 19: Check Code Health**

Run `mcp__codescene__code_health_review` on each of:
- `src/tools/studio/editSearch.ts`
- `src/tools/studio/scanLanguages.ts`
- `src/tools/studio/changeRows.ts`
- `src/tools/image/filterCards.ts`
- `src/tools/studio/__tests__/editSearch.test.ts`
- `src/tools/studio/__tests__/scanLanguages.test.ts`
- `src/tools/studio/__tests__/changeRows.test.ts`
- `src/tools/image/__tests__/filterCards.test.ts`

Expected: 10.0 with no findings for each.

The PR gate is stricter than the local tool, so also check the hand count (re-base note 6):
- `editSearch.ts` 0 of 8 primitive parameters;
- `changeRows.ts` 0 of 3, or 3 of 11 counting its lambdas;
- `scanLanguages.ts` 2 of 2, a two-function module like R3's `lastCard.ts`;
- `filterCards.ts` 2 of 4, down from 2 of 3.

If a review finds anything, fix it, review again, and confirm with `mcp__codescene__code_health_score`.

- [ ] **Step 20: Commit**

Use the Bash tool, never PowerShell, and only after the owner approves. Run each command as its own Bash call, and pipe neither.

1. Stage only these paths:

   ```bash
   git add src/tools/image/filterCards.ts src/tools/image/__tests__/filterCards.test.ts src/tools/studio/editSearch.ts src/tools/studio/__tests__/editSearch.test.ts src/tools/studio/scanLanguages.ts src/tools/studio/__tests__/scanLanguages.test.ts src/tools/studio/changeRows.ts src/tools/studio/__tests__/changeRows.test.ts
   ```

2. Run `mcp__codescene__pre_commit_code_health_safeguard`. Continue only when it passes.

3. Commit:

   ```bash
   USER_APPROVED=1 git commit -m "feat(studio): add the Edit search and change rows (#24)"
   ```

Husky's pre-commit runs the full lint and the tests. Never pass `--no-verify`. If Vitest fails to start its workers under load, stop this session's preview servers, wait for other sessions' runs to finish, and retry.
