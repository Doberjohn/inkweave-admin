# Printing versions follow-ups (#74): Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close what still applies of Doberjohn/inkweave-admin#74, the follow-ups that #68's review and rehearsal left in Card studio's Printings panel, Version changes tray and Edit card search.

**Architecture:** No new feature. Each task tightens code that #68 shipped:
- the batch store, `src/tools/studio/finishes/versionBatchStore.ts`;
- the branch read, `useBranchPrintings.ts`, and the files, `finishFiles.ts`;
- the Sets 1 to 8 read, `collectionCards.ts`;
- the panel and the tray (`components/PrintingsPanel.tsx`, `components/VersionsTray.tsx`);
- the search (`EditPane.tsx`, `components/EditSearch.tsx`, `searchStatus.ts`, `editSearch.ts`);
- the card lookup (`branchCards.ts`, `editorState.ts`).

Behaviour changes only where a task says so. Every other existing test keeps passing unchanged.

**Tech Stack:** React 19 (React Compiler), TypeScript, Vitest (`app` project under `src/`, jsdom; `scripts` project under `scripts/`, node), Testing Library, Storybook.

**Spec:** Doberjohn/inkweave-admin#74's checklist. It was triaged against main 644f163 on 2026-10-23, and #85 has merged since (8b58180). Each task below carries what its items' triage found; line numbers have moved since, so find code by name.

**Settled, not in this plan:**
- "A stale `unsaved`" was fixed by 637e2fe before #74 was filed.
- "Empty commits" was fixed by #85 (`commitFiles` refuses a commit that changes nothing), and is ticked in #74.
- "Key order" is an app change, for an app session: `fold-variants.mjs` can give a Core card its first `variants` after its `finishes`.

## Before Task 1

- The branch is `fix/74-printing-versions-follow-ups`, cut from main 8b58180. The app pin is 78fc6ea. It has no upstream until it is pushed.
- Commit this plan: `docs: plan for #74's printing versions follow-ups (#74)`.

## Global Constraints

- **`upstream/` is read-only.** App code enters admin only through `src/app-bridge.ts`.
- **Commits:**
  - Stage with `git add <files by name>` in one Bash call, then commit in a second Bash call whose first characters are `USER_APPROVED=1 git commit`.
  - Never pipe a commit.
  - Never use `git add -A` or `git add .`.
  - Messages are semantic and end with ` (#74)`.
  - Don't echo the words "git commit" in any other Bash command: the hook reacts to them.
- **The gates run once.** The pre-commit hook runs lint and the whole Vitest suite. Run only your own tests while you work (`pnpm exec vitest run --project app <files>`). Run `pnpm typecheck` where a task changes types other files read.
- **React Compiler.** No `useMemo`, no `useCallback`, and no `try … finally` in a component or hook.
- **CodeScene stays at 10 for every changed file:**
  - cyclomatic complexity 8 or less per function;
  - at most 4 arguments;
  - under 30% primitive arguments per module.

  `githubCommit.ts`'s String Heavy Function Arguments count is at the PR gate's limit: add no parameter there.
- **Design tokens.** No literal colour, size, radius or spacing in a component. A new value goes into `src/theme/adminTheme.ts`. A hover, focus or held state goes in `src/theme/AdminStyles.tsx`.
- **Focus (R-48).** Focus moves only when an action unmounts the control that had it: the page hands it on through `src/shell/focusHandoff.ts`. Never move it otherwise.
- **Tests.**
  - Restore every stub in `afterEach`.
  - Compare fetched data with `toEqual`.
  - Studio tests stub `fetch` through the harnesses in `src/tools/studio/finishes/__tests__/`, never with `vi.mock` of `githubCommit`.
- **Copy.** UI and error text this plan quotes is verbatim. Existing text a task doesn't name stays as it is.
- **Docs.** A task that changes what CLAUDE.md or `docs/printing-finishes-design.md` describes updates that line in the same commit.

## Review Focus

1. **A publish whose re-read fails** shows the read's error, with no leftover published values. A re-read that lands shows the branch's values, so no published value outlives it (Task 3).
2. **A file whose text drifted from its format** (a trailing newline added by hand) is refused before any write, by the version publish and the promo publish alike, naming the file and its format (Task 3).
3. **Deep links while Sets 1 to 8 are slow or failed.** A Core card's deep link opens without waiting for them. A Sets 1 to 8 card's deep link still waits for them. An id that neither the list nor Sets 1 to 8 holds reads missing once they have landed or failed, and never stays loading (Task 1).
4. **Twin labels.** The five Dalmatian Puppy cards and two promos of one card under one code get labels that tell them apart, in the tray, the search and the panel's row names. Every other label stays as it is (Task 4).
5. **Forget token on the panel** is offered for a rejected token only ("GitHub 401 on …"), never for another read failure (Task 2).

---

### Task 1: The search and the deep links while Sets 1 to 8 load

Covers four items from "Loading and errors":
- "Core deep links wait for Sets 1 to 8";
- "'No cards match' too early";
- "The double-failure notice";
- "The cause is dropped".

**Files:**
- Modify: `src/tools/studio/branchCards.ts` (`withCollectionCards`, `branchLookup`, `unlistedLookup`), `src/tools/studio/editorState.ts` (if the lookup needs the flag passed), `src/tools/studio/useCardEditor.ts` (if it hands the flag on)
- Modify: `src/tools/studio/finishes/collectionCards.ts` (`CollectionOnlyCards`, `FAILED`, `fetchCollectionOnlyCards`), `src/tools/studio/EditPane.tsx` (`CollectionNotice`, `SearchView`), `src/tools/studio/searchStatus.ts`
- Test: `src/tools/studio/__tests__/branchCards.test.ts`, `__tests__/StudioEdit.test.tsx`, `__tests__/searchStatus.test.ts`, `finishes/__tests__/collectionCards.test.ts`

**Interfaces:**
- `withCollectionCards` keeps `isLoading` as the card list's own (`list.isLoading`). It adds `setsLoading: boolean` to what it returns: true while Sets 1 to 8 are still being read.
- An id the card list lacks waits (`{kind: 'loading'}`) while `setsLoading` is true, before it is checked against the branch file and read as missing. A Core card the list holds opens at once.
- `CollectionOnlyCards` gains `error: string | null`: the failed read's message, null otherwise.
- `SearchStatusState.list` gains `setsLoading: boolean`. With a typed query, no match, and `setsLoading`, the status reads, verbatim: `` `No cards match "${query}" yet: Sets 1 to 8 are still loading.` ``
- `CollectionNotice` names the cause, verbatim: `` `Sets 1 to 8 didn't load (${error}), so the search holds Sets 9 and up only.` `` It shows nothing while the card list itself has failed, since the list's own failure says the search holds nothing.

- [ ] **Step 1: Write the failing tests.**
  - `branchCards.test.ts`:
    - Change "is loading until the card list and Sets 1 to 8 are both in" to pin the new rule: `isLoading` is the list's alone, and `setsLoading` is true until Sets 1 to 8 are in.
    - Add `it('opens a Core card the list holds while Sets 1 to 8 still load')`.
    - Add `it('reads an id the list lacks as loading while Sets 1 to 8 load, and as missing once they failed')`.
  - `StudioEdit.test.tsx`:
    - Add `it('opens a deep link to a Core card before Sets 1 to 8 have loaded')`.
    - Keep "waits for Sets 1 to 8 before it reads a card id as missing" passing.
  - `searchStatus.test.ts`: the new "yet" line; the plain no-match line once `setsLoading` is false.
  - `collectionCards.test.ts`: a failed read carries its message (`"/data/collection/3.json: HTTP 500"`).
  - `StudioEdit.test.tsx`:
    - The notice names the cause.
    - When both the card list and Sets 1 to 8 fail, only the card list's failure shows.
- [ ] **Step 2: Run them.** `pnpm exec vitest run --project app <those files>`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** `pnpm exec vitest run --project app src/tools/studio` passes, and so does `pnpm typecheck`.
- [ ] **Step 5: Commit.** `fix(studio): open Core deep links without waiting for Sets 1 to 8, and say why the search lacks them (#74)`.

### Task 2: Forget token on the panel, and a raced publish over an empty batch

Covers:
- "No Forget token on the panel";
- "'Publish again' over an empty batch".

**Files:**
- Modify: `src/tools/studio/components/PrintingsPanel.tsx` (`ReadError`, `FailedBody`), `src/tools/studio/finishes/versionBatchStore.ts` (`failed`)
- Test: `__tests__/PrintingsPanel.test.tsx`, `finishes/__tests__/versionBatchStore.test.ts`

**Interfaces:**
- **`ReadError`** offers `ForgetTokenOffer` (`src/github/ForgetTokenOffer.tsx`) under "Read the files again" when `isRejectedToken(error)` (`src/github/rejectedToken.ts`: a message starting "GitHub 401 on ") and the panel has `promos.onForgetToken`. Any other failure offers Retry alone, as now.
- **`failed(error)`** first takes in what other tabs saved (`adoptUnheard`). If the batch is then empty, another tab published or reverted its changes first, so the error is `NOTHING_PUBLISHED` (the existing constant), not the publish's own message.

- [ ] **Step 1: Write the failing tests.**
  - `PrintingsPanel.test.tsx`:
    - `it('offers Forget token where GitHub rejected the token on the read')`: the error view of `GitHub 401 on …` shows a Forget token button that calls `onForgetToken`.
    - `it('offers no Forget token for another read failure')`.
  - `versionBatchStore.test.ts`: `it('says nothing was published when another tab emptied the batch while a publish failed')`. Model it on the clash case's storage setup.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** `pnpm exec vitest run --project app src/tools/studio` passes.
- [ ] **Step 5: Commit.** `fix(studio): offer Forget token on a rejected printings read, and word a raced publish over an empty batch (#74)`.

### Task 3: The panel shows what a publish wrote, and a drifted file is refused

Covers:
- "The panel shows the old value after a publish";
- "Format drift", for both whole-file writers: the version publish's `writeFinishes`, and the promo publish's `serializeCatalog`, which #77 added.

**Files:**
- Modify: `src/tools/studio/finishes/versionBatchStore.ts` (`PublishResult`, `landed`), `src/tools/studio/EditPane.tsx` (`PrintingsSection`), `src/tools/studio/components/PrintingsPanel.tsx` (`PrintingItem`, props)
- Modify: `src/tools/studio/finishes/finishFiles.ts` (`OpenFile`, `writeFinishes`, a new `requireItsFormat`), `src/tools/studio/promos/publishPrinting.ts` (the catalog read at the base)
- Test: `__tests__/PrintingsPanel.test.tsx`, `__tests__/StudioVersions.test.tsx`, `finishes/__tests__/finishFiles.test.ts`, `finishes/__tests__/publishVersions.test.ts`, `promos/__tests__/publishPrinting.test.ts`
- Docs: `docs/printing-finishes-design.md` (the publish), and CLAUDE.md's Printings panel sentence if it says the rows hold their old values

**Interfaces:**
- **`PublishResult`** gains `published: readonly VersionChange[]`, the changes the landed publish sent. It has the same lifetime as the result: it lasts until the owner stages, reverts or discards a change, or publishes again.
- **`PrintingsPanel`** takes `published?: readonly VersionChange[]`, default `[]`, which `PrintingsSection` fills from the batch view's `result`. While the view is `refreshing`, a row with a published change shows that change's `to`, and the marker "In the data". Once the read lands, every row shows the branch's values.
- **Each `OpenFile` knows its format, in words:**
  - `allCards.json`: `JSON.stringify(x, null, 2) and a newline`;
  - a collection file: `JSON.stringify(x) and a newline`;
  - the catalog: `JSON.stringify(x, null, 2), with no newline at the end`.
- **`export function requireItsFormat(file: FileText): void`** throws a `FinishFileError` when the file's unedited re-serialization isn't its text. Verbatim: `` `${path} isn't in its format (${format}), so a publish would rewrite all of it. Put it back in that format first.` ``
  - `writeFinishes` calls it before it edits.
  - The promo publish calls it on the catalog's text it read at the base, before it applies the change.

- [ ] **Step 1: Write the failing tests.**
  - `PrintingsPanel.test.tsx`: `it("shows a published change's versions on its row while the branch is read again")`. A refreshing view whose row shows normal-only, and `published` naming it as foil: the row's Foil only is pressed and its marker reads "In the data". Re-rendered not refreshing, with the row's data foil: unchanged.
  - `StudioVersions.test.tsx`: the published row shows its new value between the publish landing and the re-read landing, where the harness can hold the read.
  - `finishFiles.test.ts`: `it.each` over the three formats. A text with a trailing newline, or without one, as the format says: `writeFinishes` throws the message, naming the path and its format.
  - `publishVersions.test.ts`: a drifted file refuses the publish with that message, and nothing is written.
  - `publishPrinting.test.ts`: a catalog with a trailing newline refuses the add with that message, and nothing is written.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** `pnpm exec vitest run --project app src/tools/studio` passes, and so does `pnpm typecheck`.
- [ ] **Step 5: Commit.** `fix(studio): show what a publish wrote until the branch is read again, and refuse a drifted file (#74)`.

### Task 4: Labels that tell twins apart

Covers:
- "Five identical labels": Set 3's five "Dalmatian Puppy - Tail Wagger #4" cards, ids 436 to 440;
- "Promos that share a code": latent; the Hades - Dark Usurper pair, 28/C3, reaches no panel until its card exists.

**Files:**
- Modify: `src/tools/studio/finishes/printingRows.ts` (labels), `src/tools/studio/editSearch.ts` (search rows), and whatever hands them the card list
- Test: `finishes/__tests__/printingRows.test.ts`, `__tests__/EditSearch.test.tsx` or `editSearch` tests, `__tests__/StudioVersions.test.tsx` (the tray's line and button names)

**Interfaces:**
- **Cards.** Where another card of the same set shares a card's full name and number, that card's printing labels end in `` ` · id ${id}` ``. So does its search row's set and number: "Set 3 · #4 · id 436". The labels show in the tray's line, its Revert, Keep mine and Drop names, the panel's group names, and the search.
- **Promos.** Where two promo rows of one card share a label, each ends in `` ` · id ${id}` `` as well.
- **Everything else.** Every other label is unchanged, and the existing tests that pin labels pass as they are.

- [ ] **Step 1: Write the failing tests.**
  - The five Dalmatian Puppies get five different labels and search rows. Use the pinned `collection/3.json` through `readPinned`, or a fixture of two cards that share name, set and number.
  - Two promos of one card under one code get labels that differ.
  - A card with no twin keeps its label.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.** Find twins once from the card list the search and the panel already have.
- [ ] **Step 4: Run.** `pnpm exec vitest run --project app src/tools/studio` passes.
- [ ] **Step 5: Commit.** `fix(studio): tell twin cards and twin promos apart in their labels (#74)`.

### Task 5: The search at phone width, and wide tray rows

Covers:
- "Edit card's search list is cramped at phone width";
- "Wide tray rows".

**Files:**
- Modify: `src/tools/studio/components/EditSearch.tsx` (its own horizontal gutter inside the studio root), `src/tools/studio/components/VersionsTray.tsx` (`ROW`, `TEXT`)
- Test: `__tests__/EditSearch.test.tsx` (the names column at 375px), stories: `components/EditEntry.stories.tsx` (a phone-width search), `components/VersionsTray.stories.tsx` (a wide tray)

**Interfaces:**
- **The search's gutter.** The search drops its own horizontal gutter inside the studio root, which already pads it, so the list gains 32px. The names column at 375px goes from 31px to 63px, so the "preview", "not deployed yet" and "released" chips no longer sit under a dual ink's first icon. Update the comment that computes it.
- **The tray's rows.** A row's buttons follow its text: the row is not `space-between`, and the text doesn't grow, so Revert, Keep mine and Drop sit next to the words they act on at any width. Rows still wrap on a phone.

- [ ] **Step 1: Write the failing test.** `EditSearch.test.tsx`'s 375px computation expects 63px. Run it: expected FAIL.
- [ ] **Step 2: Implement both.** Add the two stories.
- [ ] **Step 3: Run.** `pnpm exec vitest run --project app src/tools/studio` passes, and so does `pnpm typecheck`.
- [ ] **Step 4: Commit.** `fix(studio): give the search room at phone width, and keep the tray's buttons by their text (#74)`.

### Task 6: One focus helper, and the two focus tests

Covers:
- "One focus helper": the rule "the next row's first button, else the previous row's, else the heading" has three copies;
- the two missing tests: Keep mine on a lone clash row that survives, where focus moves to the heading; and focus staying on Publish after a failed publish.

**Files:**
- Create: `src/shell/rowFocus.ts`, `src/shell/rowFocus.test.ts`
- Modify: `src/tools/tuning/components/PendingTray.tsx` (`focusAfterRevert`), `src/tools/studio/components/ChangeList.tsx` (`focusAfterRevert`, which counts only the rows the revert keeps), `src/tools/studio/components/VersionsTray.tsx` (`focusAfterSettled`)
- Test: `__tests__/VersionsTray.test.tsx` and/or `__tests__/StudioVersions.test.tsx`

**Interfaces:**
- `export function focusNearRow({rows, index, fallback}: {rows: readonly HTMLElement[]; index: number; fallback: HTMLElement | null}): void`.
  - `rows` are the row elements left after the change.
  - It focuses the first button of `rows[index]`, else of `rows[index - 1]`, else `fallback`.
- Each of the three callers builds its own `rows` (ChangeList from the rows its revert keeps) and calls it. `src/shell` imports nothing from `src/tools` (R-53).

- [ ] **Step 1: Write the tests.**
  - `rowFocus.test.ts`: the next row, then the previous, then the fallback.
  - The tray: Keep mine on a lone surviving clash row hands the focus to the tray's heading.
  - The tray: a failed publish leaves the focus on Publish.
- [ ] **Step 2: Implement the helper, and move the three callers onto it.** Their existing focus tests pass unchanged.
- [ ] **Step 3: Run.** `pnpm exec vitest run --project app src/shell src/tools/studio src/tools/tuning` passes.
- [ ] **Step 4: Commit.** `refactor: one focus rule for a list whose row goes (#74)`.

### Task 7: The missing stories

Covers the five story items:
- `StudioCardPanel` with `imageControl={false}`;
- the banner for a Sets 1 to 8 card;
- the printings-only facts with the panel under them;
- the search's "Sets 1 to 8 didn't load" notice;
- a `ReleasedCard` story that shows a Core card with its panel.

**Files:**
- Modify: `components/StudioCardPanel.stories.tsx`, `components/EditEntry.stories.tsx`, `components/PrintingsPanel.stories.tsx` (if the facts and panel story sits better there), `src/tools/studio/EditPane.tsx` (export `CollectionNotice`, or the story builds its own `Notice`)

**Interfaces:** stories only. Each renders with no network request: use the existing fixtures (`finishFixtures`, `promoFixtures`). `scripts/browser-safety.test.mjs` walks every story, so no fixture a story loads may import a Node builtin.

- [ ] **Step 1: Add the stories.**
- [ ] **Step 2: Run.**
  - `pnpm typecheck` passes.
  - `pnpm exec vitest run --project scripts scripts/browser-safety.test.mjs` passes.
  - A Storybook smoke check (`pnpm storybook`, open each new story) shows no console error.
- [ ] **Step 3: Commit.** `docs(storybook): the Sets 1 to 8 and printings-only states (#74)`.

### Task 8: The marker words' case, and a sticky tray (the owner's calls)

Covers "Marker case" and "A sticky tray?". It waits for the owner's answers. Without them, it uses the defaults below, which are the controller's picks.

**Defaults:**
- **Marker case: lowercase,** as `src/ui/Tag.tsx` documents for tags ("raw", "low n", "preview").
  - The Printings panel's markers become "clash", "pending", "in the data", "by rarity".
  - /changes' area tags (`src/tools/changes/changePaths.ts`) become "preview cards", "scans", "card data", "tuning".
  - Tests and stories that find them by text follow.
- **A sticky tray: yes,** as the tuning aside's foot is (`TuningAside.tsx`, `position: sticky; bottom: 0` with a fill of its own). While changes are staged, the tray's count and Publish stay in view at the bottom of the page as the owner scrolls a tall Edit card. The rows still scroll with the page. The fill is opaque, since the panel fill is translucent. On a phone it must not cover the content it sits over (check the 375px story).

**Files:** `components/PrintingsPanel.tsx` (`MARKERS`), `src/tools/changes/changePaths.ts`, `components/VersionsTray.tsx`, `src/theme/AdminStyles.tsx` (if the sticky foot needs a rule), and their tests and stories.

- [ ] **Step 1: Apply the owner's answers,** or the defaults, with the tests that look markers up by text updated.
- [ ] **Step 2: Run.** `pnpm exec vitest run --project app src/tools/studio src/tools/changes src/ui` passes.
- [ ] **Step 3: Commit.** `fix(studio): <what the owner chose> (#74)`.
