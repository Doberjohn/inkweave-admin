# Promo printings follow-ups (#80): Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close what still applies of Doberjohn/inkweave-admin#80, the follow-ups that #77's reviews and rehearsal left in Card studio's promo printings. They are:
- a guard on Node imports in what the browser loads;
- `inkweave/no-raw-spacing` turned on;
- a sturdier catalog read and publish;
- a check on a new Sets 1 to 8 group;
- form and panel fixes;
- tidying;
- the test gaps.

**Architecture:** No new feature. Each task tightens code that #77 shipped (`src/tools/studio/promos/`, the Printings panel and the form) or a shared layer it leans on (`src/github/githubCommit.ts`, `src/theme/`, `src/app-bridge.ts`, `eslint.config.js`). Behaviour changes only where a task says so. Every other existing test keeps passing unchanged.

**Tech Stack:** React 19 (React Compiler), TypeScript, Vitest (`app` project under `src/`, jsdom; `scripts` project under `scripts/`, node), Testing Library, Storybook, ESLint flat config with the app's `inkweave/*` rules.

**Spec:** Doberjohn/inkweave-admin#80's checklist. It was triaged against main 644f163 on 2026-10-23, item by item with file:line evidence. The triage tables stayed in the build session's notes: each task below carries what its rows found. The feature itself is [`docs/promo-printings-design.md`](../promo-printings-design.md).

**The owner's picks (2026-10-23):**
- Compare `collection/promos.json` without its `imageHash*` keys, as the app's `merge-promos` CLI does.
- Leave `usePrintingForm`'s counter as it is: nothing in admin uses Suspense, Activity or a sync-lane card change.
- Skip the long-lines item.
- Drop three test items already covered one level up: the bridge's `kept`/`finishesById`, a unit assertion of an edit's note, and the byte-level "nothing else" merge test.
- Already fixed by 774daf0, so not in this plan: "…are saved" too early, and Forget token's list.

## Before Task 1

- The branch is `fix/80-promo-printing-follow-ups`, cut from main 644f163. The app pin is 78fc6ea. It has no upstream until it is pushed.
- Commit this plan: `USER_APPROVED=1 git commit -m "docs: plan for #80's promo printing follow-ups (#80)"`.

## Global Constraints

- **`upstream/` is read-only.** A hook blocks edits there. App code enters admin only through `src/app-bridge.ts`.
- **Commits.**
  - Run `USER_APPROVED=1 git commit …` through the Bash tool, those characters first.
  - Never pipe a commit, and never use `git add -A` or `git add .`: add the files by name.
  - Messages are semantic and end with ` (#80)`.
  - Don't quote the bracketed skip-ci marker anywhere in a message.
- **The gates run once.** The pre-commit hook runs lint and the whole Vitest suite: that is the gate. Run only your own tests while you work: `pnpm exec vitest run --project app <files>`, or `--project scripts`. Run `pnpm typecheck` where a task changes types that stories or other files read.
- **React Compiler.** No `useMemo`, no `useCallback`, and no `try … finally` in a component or hook.
- **CodeScene stays at 10 for every changed file:**
  - cyclomatic complexity 8 or less per function;
  - at most 4 arguments;
  - under 30% primitive arguments per module.
- **Design tokens.** No literal colour, size, radius or spacing in a component. A new value goes into `src/theme/adminTheme.ts`.
- **Tests.**
  - Restore every stub in `afterEach`.
  - Compare fetched data with `toEqual`.
  - Studio tests stub `fetch` through the harnesses in `src/tools/studio/finishes/__tests__/`, never with `vi.mock` of `githubCommit`.
  - A test that needs pinned files reads them through `src/tools/studio/promos/__tests__/pinned.ts` (`readPinned`).
- **File formats, byte for byte:**
  - catalog: `JSON.stringify(x, null, 2)`, no trailing newline;
  - `allCards.json`: `JSON.stringify(x, null, 2) + '\n'`;
  - `collection/promos.json`: `JSON.stringify(x) + '\n'`.
- **Copy.** UI and error text this plan quotes is verbatim. Existing text that a task doesn't name stays as it is.
- **Docs.** A task that changes behaviour CLAUDE.md or the design doc describes updates that line in the same commit.

## Review Focus

1. **A `promos.json` that differs from the merge's output only by `imageHash*` keys or formatting** reads as in step and isn't committed. An add over it writes the file without hash keys (Task 5).
2. **A catalog missing a section** (`noBaseCard`, `notes`, …) is named, with the section, by both the panel's read error and a publish. Neither shows a bare `TypeError` (Task 5).
3. **A read that drops the row of an open edit form.** The form stays open under the list. Its heading takes a focus that was in it, and a focus elsewhere doesn't move (Task 8).
4. **An add to a Sets 1 to 8 card that starts a group,** where the set's data lacks the card or names it otherwise. It is refused before anything is written (Task 6).
5. **A typed number that doesn't read** (`abc`, `0`, `1.5`) marks Number invalid and says why. A blank one doesn't, and ` 07 ` reads as 7 (Task 7).

---

### Task 1: Guard what the browser loads against Node imports

Covers:
- "Guard the bridged merge's browser safety";
- "Nothing guards `promoFixtures.ts` against a `node:` import";
- the `pinned.ts` comment.

Today a `node:` import in the app's `scripts/lib/*.mjs` passes lint, typecheck, Vitest and `pnpm build` (one warning), then breaks every page, as the triage measured with an injected import.

**Files:**
- Create: `scripts/browser-safety.test.mjs`
- Modify: `src/tools/studio/promos/__tests__/pinned.ts` (its comment, lines 4-8)
- Modify: `CLAUDE.md` (the bridge bullet that names the bridged promo merge)

**Interfaces:**
- Produces: nothing other tasks import. Task 4's fixtures and every story stay under this guard.

- [ ] **Step 1: Write `scripts/browser-safety.test.mjs`, the walker and its tests.** The walker lives in the test file:

  ```js
  /** Every Node builtin a walk from `entries` reaches through relative imports, and the files it visited. */
  function walk({entries, read, exists}) // => {visited: string[], nodeImports: Array<{file: string, specifier: string}>}
  ```

  - **Paths** are repo-relative with forward slashes (`path.posix`). `read(path)` returns the text, and `exists(path)` says whether a file is there.
  - **The two inputs.** `onDisk(entries)` wraps `fs`: `readFileSync`, and `existsSync` plus `statSync().isFile()`. `inMemory(files, entries)` reads from a plain object of path to text.
  - **Specifiers it collects:**
    - static `import … from`, `export … from` and side-effect imports;
    - dynamic `import('…')` with a literal;
    - `require('…')` with a literal.
  - **Specifiers it skips:** `import type` and `export type` lines.
  - **Node's specifiers:** a specifier is Node's when it starts with `node:` or is in `module.builtinModules`.
  - **Following imports:**
    - It follows relative specifiers only, after stripping a `?query`.
    - It resolves a specifier as written, then with `.ts`, `.tsx`, `.mjs`, `.js`, then as `/index.ts`, `/index.tsx`, `/index.js`.
    - It reads only `.ts`, `.tsx`, `.mjs`, `.js` and `.jsx` files. CSS, JSON and images are skipped.
    - Bare package specifiers aren't followed.

  The tests:

  ```js
  const ENTRIES = ['src/main.tsx', '.storybook/preview.tsx', ...fs.globSync('src/**/*.stories.{ts,tsx}')];

  it('reaches the bridged promo merge and the promo fixtures', () => {
    const {visited} = walk(onDisk(ENTRIES));
    for (const file of [
      'upstream/inkweave/scripts/lib/promo-printings.mjs',
      'upstream/inkweave/scripts/lib/finishes.mjs',
      'upstream/inkweave/scripts/lib/fold-variants.mjs',
      'src/tools/studio/promos/__tests__/promoFixtures.ts',
    ]) expect(visited).toContain(file);
  });
  it('finds no Node builtin in anything the build or a story loads', () => {
    expect(walk(onDisk(ENTRIES)).nodeImports).toEqual([]);
  });
  it.each([
    ['a node: import two files away', {'a.mjs': "import {b} from './b.mjs';\n", 'b.mjs': "import {readFileSync} from 'node:fs';\n"}, [{file: 'b.mjs', specifier: 'node:fs'}]],
    ['a bare builtin', {'a.mjs': "import fs from 'fs';\n"}, [{file: 'a.mjs', specifier: 'fs'}]],
    ['a dynamic import', {'a.mjs': "export const load = () => import('node:path');\n"}, [{file: 'a.mjs', specifier: 'node:path'}]],
    ['a re-export', {'a.mjs': "export * from 'node:os';\n"}, [{file: 'a.mjs', specifier: 'node:os'}]],
    ['a require', {'a.js': "const m = require('node:module');\n"}, [{file: 'a.js', specifier: 'node:module'}]],
  ])('finds %s', (_, files, expected) => {
    expect(walk(inMemory(files, Object.keys(files).slice(0, 1))).nodeImports).toEqual(expected);
  });
  it('leaves out type-only imports and exports', () => {
    const files = {'a.ts': "import type {Stats} from 'node:fs';\nexport type {Dirent} from 'node:fs';\n"};
    expect(walk(inMemory(files, ['a.ts'])).nodeImports).toEqual([]);
  });
  ```

- [ ] **Step 2: Run it.** `pnpm exec vitest run --project scripts scripts/browser-safety.test.mjs`. Expected: PASS, every case. If the on-disk walk reports an import, stop and report it: don't change the guard to let it through.
- [ ] **Step 3: Fix the comment in `pinned.ts`.** Say what Vite does. A story that loaded the module would get Vite's browser stub: a console warning and undefined bindings, so the first call throws (`readFileSync is not a function`). `scripts/browser-safety.test.mjs` keeps the module out of anything a story loads.
- [ ] **Step 4: Update CLAUDE.md.** In the bullet about the bridged merge, add: "`scripts/browser-safety.test.mjs` fails when anything `src/main.tsx` or a story loads imports a Node builtin: Vite only warns, and the page then fails to load."
- [ ] **Step 5: Commit.**

  ```bash
  git add scripts/browser-safety.test.mjs src/tools/studio/promos/__tests__/pinned.ts CLAUDE.md
  USER_APPROVED=1 git commit -m "test: fail when the build or a story reaches a Node import (#80)"
  ```

### Task 2: Turn on `inkweave/no-raw-spacing`

Covers "Turn on `inkweave/no-raw-spacing`". It flags 13 places in 7 files. Ten are data keys named `gap`, and three are CSS: two `margin: -1` and a 1px `gap`. The rule reads keys named `padding*`, `margin*`, `gap`, `rowGap` and `columnGap`. Number literals other than 0 are raw; an identifier, or minus an identifier, is fine.

**Files:**
- Modify: `src/theme/adminTheme.ts` (`ADMIN_LAYOUT`)
- Modify: `src/components/useHiddenFileInput.ts:11`, `src/ui/layout.ts:59`, `src/tools/analytics/calibration/CalibrationWorkspace.tsx:64`
- Modify: `src/tools/analytics/calibration/RulesTable.tsx:37`, `src/tools/analytics/cards/CardCalibrationPanel.tsx:29`, `src/tools/analytics/cards/VotedPairsPanel.tsx:16`, `src/tools/analytics/cards/cardFixtures.ts` (`ReviewSeed`)
- Modify: `eslint.config.js` (the comment at lines 8-12, and the rule block at 106-123), `CLAUDE.md` (the design-token bullet), `scripts/bridge-boundary.test.mjs` (`OFF_TOKEN`, `TOKEN_RULES`)

**Interfaces:**
- Produces: `ADMIN_LAYOUT.hairline: 1`. Its doc says it is a 1px seam, and the visually-hidden idiom's margin, negated.

- [ ] **Step 1: Write the failing check.** Add `'inkweave/no-raw-spacing': 'error'` to the `inkweave` block in `eslint.config.js`. In `scripts/bridge-boundary.test.mjs`:
  - add `padding: 30` to `OFF_TOKEN`;
  - add `'inkweave/no-raw-spacing'` to `TOKEN_RULES`;
  - update the comment, which counts the rules `OFF_TOKEN` breaks: five now.
- [ ] **Step 2: See it fail.** `pnpm exec eslint src` reports 13 `inkweave/no-raw-spacing` errors in the 7 files.
- [ ] **Step 3: Fix the 13.**
  - Add `hairline: 1` to `ADMIN_LAYOUT` and widen its doc comment.
  - `margin: -1` becomes `margin: -ADMIN_LAYOUT.hairline` in `useHiddenFileInput.ts` and `ui/layout.ts`.
  - `gap: 1` becomes `gap: ADMIN_LAYOUT.hairline` in `CalibrationWorkspace.tsx`.
  - Rename the `COLUMN_WIDTH` key `gap` to `scoreGap` in the three tables, `<col>` uses included.
  - Rename `ReviewSeed.gap` to `scoreGap` in `cardFixtures.ts`: its type, `REVIEW_SEEDS` and `reviewPairs`.
- [ ] **Step 3b: Fix the comment and CLAUDE.md.**
  - The `eslint.config.js` comment now says admin enables every one of the app's design-token rules by name.
  - CLAUDE.md's design-token bullet begins: "Admin enables the app's design-token rules by name in `eslint.config.js`, every one of them." Drop the follow-up clause.
- [ ] **Step 4: Run.**
  - `pnpm exec eslint src` shows 0 errors.
  - `pnpm exec vitest run --project scripts scripts/bridge-boundary.test.mjs` passes. Its warm-up is slow: give it 10 minutes.
  - `pnpm exec vitest run --project app src/tools/analytics` passes.
- [ ] **Step 5: Commit.** `USER_APPROVED=1 git commit -m "style: turn on inkweave/no-raw-spacing in admin (#80)"`, with the files added by name.

### Task 3: One home for shared definitions

Covers these items from "Tidying":
- `FrameState`, `CARD_ASPECT` and `FRAME_BORDER`;
- the official-art rule;
- the file-extension idiom;
- the LorcanaJSON id boundary;
- the bridge's typed assignments. The cast's "arity" claim was false; `Map` still drops the cast.

**Files:**
- Modify: `src/tools/studio/studioStyles.ts` (gains `CARD_ASPECT` and `FRAME_BORDER`), `src/tools/studio/components/PromoPrintingForm.tsx`, `src/tools/studio/components/StudioCardPanel.tsx`
- Modify: `src/tools/studio/promos/promoCatalog.ts`, `publishPrinting.ts` (`factsOf`), `usePrintingForm.ts` (`keepsItsArt`), `catalogEdits.ts` (`withLine`)
- Create: `src/components/fileName.ts`, `src/components/fileName.test.ts`
- Modify: `src/tools/studio/editSave.ts`, `src/components/useImageUpload.ts`, `src/tools/reveal/useRevealAdmin.ts`, `src/tools/reveal/validateForm.ts`, `src/tools/studio/promos/printingForm.ts` (`scanFileOf`), `src/test/images.ts`
- Modify: `src/app-bridge.ts` (`collectionPromos` and its comment)
- Test: `src/tools/studio/promos/__tests__/promoCatalog.test.ts`

**Interfaces:**
- Produces, in `studioStyles.ts`:
  - `CARD_ASPECT = '0.72'`;
  - `FRAME_BORDER: Readonly<Record<FrameState, string>>`, with `FrameState` imported from `cardPanel.ts`. `PromoPrintingForm.tsx` imports `FrameState` from there and drops its own copy.
- Produces, in `promoCatalog.ts`:
  - `export function hasOfficialArt(printing: Pick<CatalogPrinting, 'images'>): boolean`: whether the printing has Ravensburger's art (`images`);
  - `export function isProvisional(printing: Pick<CatalogPrinting, 'id'>): boolean`, now exported.
- Produces, in `fileName.ts`: `export function extOf(name: string): string`. It returns the text after the last dot, lowercased, or `''` when the name has none (`'scan'` and `'scan.'` both give `''`).
- Produces, in the bridge: `collectionPromos: (catalog: MergeCatalog, kept?: Map<string, readonly string[]>) => object[]`, assigned with no cast.

- [ ] **Step 1: Write the failing tests.**
  - `fileName.test.ts`: `extOf('Scan.PNG')` is `'png'`, `extOf('a.b.webp')` is `'webp'`, `extOf('scan')` is `''`, `extOf('scan.')` is `''`.
  - `promoCatalog.test.ts`:
    - `hasOfficialArt` is true for FIXTURE_CATALOG's printing 659 and false for 80043;
    - `isProvisional` is true for 80001 and false for 80000.
- [ ] **Step 2: Run them.** `pnpm exec vitest run --project app src/components/fileName.test.ts src/tools/studio/promos/__tests__/promoCatalog.test.ts`. Expected: FAIL, nothing exported yet.
- [ ] **Step 3: Implement them, and move every copy onto them.**
  - **The official-art rule:** `countsOf`'s `withOfficialArtUrl`, `factsOf`, and both `keepsItsArt` (form and controller).
  - **The id boundary:** `withLine`'s `printing.id < PROVISIONAL_ID_BASE` becomes `!isProvisional(printing)`.
  - **The extension idiom,** in all six places. `useRevealAdmin` keeps its default as `extOf(file.name) || 'png'`. `editSave.ts` drops its private `extOf`.
  - **The frame:** `CARD_ASPECT` and `FRAME_BORDER` come from `studioStyles.ts` in both panels.
  - **The bridge:** `collectionPromos` is typed as above. Its comment drops the cast's explanation. It says the `.mjs` exports are untyped (`allowJs`, no `checkJs`): these annotations are what admin relies on, and the bridge tests pin their output.
- [ ] **Step 4: Run.**
  - The two test files pass.
  - So does `pnpm exec vitest run --project app src/components src/tools/reveal src/tools/studio`.
  - So does `pnpm typecheck`.
- [ ] **Step 5: Commit.** `refactor(studio): one home for the frame, official-art, id-boundary and extension rules (#80)`.

### Task 4: Share the promo test and story builders

Covers "test and story builders, written twice". There are in fact 4 to 6 copies of each.

**Files:**
- Modify: `src/tools/studio/promos/__tests__/promoFixtures.ts`
- Modify: `PromoPrintingForm.stories.tsx`, `PrintingsPanel.stories.tsx`, `promos/__tests__/{printingForm,publishPrinting,usePrintingForm,catalogEdits}.test.ts`, `__tests__/{PromoPrintingForm,PrintingsPanel}.test.tsx`

**Interfaces:**
- Produces, in `promoFixtures.ts`:
  - `HIRO_BASE: BaseCard = {id: 1529, fullName: 'Hiro Hamada - Armor Designer', setCode: '7', number: 96, core: false}`;
  - `printingOf(id: number): CatalogPrinting`: FIXTURE_CATALOG's printing with that id. It throws for an id the catalog lacks;
  - `NO_SCAN: ScanState = {name: null, dataUrl: null, error: null}`;
  - `addForm`, `editForm` and `controllerOf`, with the signatures their copies share today. Take the most general copy. `controllerOf` takes its callbacks as arguments: stories pass no-ops and tests pass `vi.fn()`.
- Constraints:
  - `promoFixtures.ts` imports no `vitest` and no `node:` module, since stories load it. Task 1's guard holds the second.
  - Every file uses `SNOW_WHITE_BASE` instead of spelling Snow White out again.

- [ ] **Step 1: Add the builders to `promoFixtures.ts`.** Replace each copy in the 8 files with an import.
- [ ] **Step 2: Run.**
  - `pnpm exec vitest run --project app src/tools/studio` passes, with every test unchanged.
  - `pnpm typecheck` passes, stories included.
  - `pnpm exec vitest run --project scripts scripts/browser-safety.test.mjs` passes.
- [ ] **Step 3: Commit.** `test(studio): share the promo test and story builders through promoFixtures (#80)`.

### Task 5: Read the catalog with care, compare promos.json as the app does, and commit nothing for no change

Covers:
- "`parseCatalog` trusts the file's shape";
- "A hashed `promos.json` would be refused" (the owner's pick: tolerate it);
- "An edit that changes nothing";
- "`planned[0]`";
- "Two printings with no number".

The guard in `commitFiles` also closes #74's "Empty commits".

**Files:**
- Modify: `src/tools/studio/promos/promoCatalog.ts` (`parseCatalog`, `hasCode`), `promoMerge.ts`, `publishPrinting.ts` (`readHeld`, `filesToCommit`, `publishPrinting`), `src/github/githubCommit.ts` (`commitFiles`)
- Test: `promos/__tests__/promoCatalog.test.ts`, `promoMerge.test.ts`, `publishPrinting.test.ts`, `src/github/githubCommit.test.ts`, `finishes/__tests__/useBranchPrintings.test.tsx`
- Docs: `CLAUDE.md`. In the Card studio bullet, a commit that would change nothing is refused. In the promo bullet, `promos.json` is compared and sent "hash keys aside, as the app's CLI reads it".

**Interfaces:**
- **`parseCatalog`** throws an `Error` whose message names what is wrong:
  - `its "fold" isn't a list`, and the same for `noBaseCard` and `notes`;
  - `its "provisionalIds" isn't an object`;
  - `a group in "fold" has no "variants" list`, and the same for `noBaseCard`.

  It doesn't check `about` or `stats`: nothing reads them as a shape.
- **`readHeld`** parses the catalog through `namingItsFile` (`finishes/branchFiles.ts`). A publish over a broken catalog then fails with `scripts/data/promo-printings.json can't be read: its "noBaseCard" isn't a list`, as the panel's read already words it.
- **`export function promosDiffer(a: string, b: string): boolean`,** in `promoMerge.ts`. It says whether two `promos.json` texts list different promos once every key starting with `imageHash` is left out. That is the app CLI's `withoutHashes` (`upstream/inkweave/scripts/merge-promo-printings.mjs:68-75`), formatting included. `outOfStep` and `filesToCommit` both use it.
- **`commitFiles`** throws when the tree it builds is the base commit's tree. It then posts no commit and moves no ref. The message is verbatim: `` `Nothing changed on ${branch}: it already holds these files as they are, so nothing was committed.` ``
- **`publishPrinting`** returns the id of the last plan (`planned.at(-1)`), and throws if there is none.
- **`hasCode`:** a code or a printing with no number matches nothing.

- [ ] **Step 1: Write the failing tests.**
  - `promoCatalog.test.ts`:
    - `it.each(['fold', 'noBaseCard', 'notes'])('refuses a catalog whose %s is no list, naming it')`: `parseCatalog(JSON.stringify({...FIXTURE_CATALOG, [key]: undefined}))` throws `its "${key}" isn't a list`;
    - the same for `provisionalIds` and for a group without `variants`;
    - `takenBy({catalog, code: {promoGrouping: 'C1', number: undefined}})` is null over a catalog that also holds a C1 printing with no number.
  - `useBranchPrintings.test.tsx`: a branch catalog with no `noBaseCard`. The view's error reads `scripts/data/promo-printings.json can't be read: its "noBaseCard" isn't a list`.
  - `publishPrinting.test.ts`:
    - The same catalog: the publish rejects with that message and sends no write request.
    - A branch whose `promos.json` adds `imageHash` and `imageHashSmall` to one entry. A note-only edit commits the catalog alone. An add sends `promos.json` with no `imageHash`.
    - An edit that changes nothing (same set, number and language, no note, no scan) rejects with the `commitFiles` message, and no commit or ref request is sent.
  - `promoMerge.test.ts`: `outOfStep` over FIXTURE_FILES, its `promos.json` with hash keys added and printed with 2-space indents, is `[]`.
  - `githubCommit.test.ts`: `it('commits nothing when the files change nothing')`. The created tree's sha is the base commit's tree sha. The call rejects with the message, and nothing is POSTed to `git/commits` or PATCHed to `git/refs`.
- [ ] **Step 2: Run them.** `pnpm exec vitest run --project app <those five files>`. Expected: FAIL as named.
- [ ] **Step 3: Implement.** `withoutHashes` is a private helper of `promoMerge.ts`: `JSON.stringify(JSON.parse(text), (key, value) => (key.startsWith('imageHash') ? undefined : value))`. `commitFiles` compares `tree.sha` with `baseCommit.tree.sha` before it posts the commit, and adds no parameter (the module's argument count is at CodeScene's limit).
- [ ] **Step 4: Run.** The five files pass, and so does `pnpm exec vitest run --project app src/tools/studio src/github src/tools/tuning`.
- [ ] **Step 5: Commit.** `fix(studio): name a malformed catalog, read promos.json as the app does, and commit nothing for no change (#80)`.

### Task 6: Check a new Sets 1 to 8 group's card against the app's data

Covers "A new `noBaseCard` group isn't checked against the app's `promoBaseProblems`". An add to a Sets 1 to 8 card that the catalog has no group for starts a waiting group with `lorcanaJsonBaseId: card.id`. The app's merge checks fold groups only, and its `promoBaseProblems` runs only in manual scripts.

**Files:**
- Modify: `src/app-bridge.ts` (bridge `promoBaseProblems`), `src/tools/studio/promos/publishPrinting.ts`, `promoFixtures.ts` (a set chunk for a new Sets 1 to 8 card)
- Modify: `usePrintingForm.ts` (the `Failure` doc: `refused` now covers the new refusal too)
- Test: `promos/__tests__/publishPrinting.test.ts`, `promoBridge.test.ts`
- Docs: `docs/promo-printings-design.md` ("What a publish checks"), and CLAUDE.md's promo bullet (the refusals)

**Interfaces:**
- The bridge: `promoBaseProblems: (promos: readonly object[], cards: ReadonlyArray<{id: number | string; fullName: string}>) => string[]`, from `promo-printings.mjs`, with a one-line comment as its neighbours have.
- `RefusalKind` gains `'unknownCard'`.
- The publish reads one more file, only for an add of a non-Core card whose catalog at the base has no `noBaseCard` group with `lorcanaJsonBaseId === card.id`. It reads `setChunkPath(card.setCode)` (`finishes/finishFiles.ts`) at the base, after the other checks pass.
- It runs `promoBaseProblems(collectionPromos(catalog).filter(({id}) => id === newId), chunkCards)` over the catalog with the printing added. The first problem refuses, verbatim: `` `The app's set ${card.setCode} data on ${targetBranch()} doesn't match ${card.fullName}: ${problem}.` ``

- [ ] **Step 1: Write the failing tests.** In `publishPrinting.test.ts`, use a Set 3 card that FIXTURE_CATALOG has no group for: `{id: 433, fullName: 'Baloo - von Bruinwald XIII', setCode: '3', number: 1, core: false}`.
  - `it('adds to a Sets 1 to 8 card with no group once its set's data holds it')`: the branch's `collection/3.json` holds `[{id: 433, fullName: 'Baloo - von Bruinwald XIII'}]`. It lands, and that file was read at the base commit.
  - `it('refuses an add whose set's data names the card otherwise, writing nothing')`: the chunk holds `{id: 433, fullName: 'Baloo - Someone Else'}`. A `PrintingRefusal` with kind `'unknownCard'`, whose message ends `reprints card 433, which is Baloo - Someone Else.`, and no blob, tree, commit or ref request.
  - `it("refuses an add whose set's data lacks the card")`: an empty chunk. The message ends `which no dataset holds.`
  - `it('reads no set data for a Core card, or for a card the catalog has a group for')`: adds to PRINCE and to SNOW_WHITE_BASE read no `collection/{n}.json`.
  - `promoBridge.test.ts`: `it('finds no problem in the pinned promos over the pinned data')`. `promoBaseProblems` over the pinned `promos.json` and the cards of the pinned `allCards.json` plus every `collection/*.json` chunk but `promos.json` is `[]`.
- [ ] **Step 2: Run them.** `pnpm exec vitest run --project app src/tools/studio/promos`. Expected: FAIL.
- [ ] **Step 3: Implement.** Keep `planAt` and every new helper under CodeScene's limits: a helper decides whether the add starts a group, and another reads and checks the chunk.
- [ ] **Step 4: Run.** `pnpm exec vitest run --project app src/tools/studio` passes.
- [ ] **Step 5: Commit.** `fix(studio): check a new Sets 1 to 8 group's card against the app's data (#80)`.

### Task 7: The form names a taken code first, marks a bad number, and says its scan in a sentence

Covers these items from "The form" and "Tidying":
- "A taken code shows last";
- "A gap is described only beside a disabled Publish";
- "The scan's live region announces a bare file name";
- "`scanUnusable` lives in the component".

**Files:**
- Modify: `src/tools/studio/promos/printingForm.ts`, `src/tools/studio/components/PromoPrintingForm.tsx`
- Test: `promos/__tests__/printingForm.test.ts`, `__tests__/PromoPrintingForm.test.tsx`
- Docs: `docs/promo-printings-design.md` (the form: the taken code's place in the order, and the Number field's error)

**Interfaces:**
- **`addLine`'s order:** promo set, number, then a taken code (`takenLine`), then versions, then scan.
- **`export function numberProblem(opts: MissingLineOptions): string | null`** marks what the owner typed (R-72: a blank required field stays with the line under Publish). In order:
  - `null` when the number is blank once trimmed;
  - `'Enter a number from 1 up.'` when `parseNumber` can't read it;
  - otherwise `takenLine(opts)`.

  Export `MissingLineOptions`.
- **`export function scanNote({kind, scan}: {kind: 'add' | 'edit'; scan: ScanState}): string | null`.** It returns `null` unless a file is chosen with no error (`isStaged`). Otherwise, verbatim:
  - an add: `` `Scan staged (${name}). It's published with the printing.` ``
  - an edit: `` `New scan staged (${name}). It replaces the printing's scan when you save.` ``
- **`export function scanUnusable(scan: ScanState): boolean`** moves from the component unchanged.
- **The form:** `NumberField` passes `errors={{'printing-number': problem}}` when `numberProblem` names one, else `NO_ERRORS`. `ScanNotes` shows `scanNote(…)` where it showed the bare name.

- [ ] **Step 1: Write the failing tests.**
  - `printingForm.test.ts`:
    - Change the case at :124-129: a taken add with no scan now says the taken line.
    - Add `it('names a taken code as soon as the set and number name it, before the versions and the scan')`.
    - Add `it.each([['', null], ['abc', 'Enter a number from 1 up.'], ['0', 'Enter a number from 1 up.'], ['1.5', 'Enter a number from 1 up.'], [' 07 ', null]])` for `numberProblem` on an add with a free code.
    - Add one case: a taken code gives the taken line.
    - Add one case: an edit that keeps its own code gives `null`.
    - Cover `scanNote` for add, edit, an errored scan and no file.
    - Cover `scanUnusable` for an error, a file still being read, and a usable scan.
  - `PromoPrintingForm.test.tsx`:
    - `it('marks Number invalid and says why when the typed number does not read')`: after typing `abc`, `getByLabelText('Number')` has `aria-invalid="true"` and its description includes `Enter a number from 1 up.`. A blank Number has no `aria-invalid`.
    - Change the live-region case at :373-377 to expect `Scan staged (scan.png). It's published with the printing.`
- [ ] **Step 2: Run them.** `pnpm exec vitest run --project app src/tools/studio/promos/__tests__/printingForm.test.ts src/tools/studio/__tests__/PromoPrintingForm.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.** Keep the form's header comment true: printingForm.ts decides Publish, its lines and the scan's words.
- [ ] **Step 4: Run.** `pnpm exec vitest run --project app src/tools/studio` passes.
- [ ] **Step 5: Commit.** `fix(studio): the promo form names a taken code first and marks a number that doesn't read (#80)`.

### Task 8: The Printings panel keeps its outcome line and an edit form that lost its row; held controls look held

Covers:
- "The held scan control is only partly held", with `LOCKED`;
- "A landed add isn't always announced";
- "An edit form can lose its row";
- the admin side of "A held `LinkButton` still brightens on hover". The app fix needs a new app issue: the owner decides that at the end.

**Files:**
- Modify: `src/theme/AdminStyles.tsx`, `src/theme/__tests__/AdminStyles.test.tsx`
- Modify: `src/tools/studio/components/PromoPrintingForm.tsx` (drop `LOCKED` and the cover's `style`), `src/tools/studio/components/PrintingsPanel.tsx`
- Test: `__tests__/PrintingsPanel.test.tsx`, `__tests__/PromoPrintingForm.test.tsx` (the inline-style case at :445)

**Interfaces:**
- **The stylesheet.** A file cover whose input is disabled is held:
  - `.adm-file-cover:has(input:disabled){opacity:.4;cursor:not-allowed;}` joins the held rules;
  - the hover ring and the `[data-dragging="true"]` ring apply only `:where(:not(:has(input:disabled)))`, as `${ENABLED}` does for buttons.
- **`PromoOffer`.** While an add form is open, it shows the form and, under it, `PublishOutcome`, blank. A landed add's line is then already mounted when it fills.
- **An edit form whose row is gone.** No row of the view may show the open edit form's printing (`row.ref.id !== String(form.printing.id)` for every row). Then `PromoOffer` renders that form under the list, where Add a printing would be, with `currentArt={undefined}`.
- **Focus.** When an edit form mounts while the focus is on `<body>` (a read that dropped its row took the old one, with the focus in it), the panel hands the focus to the form's heading (`TO_FORM`). A mount that finds the focus anywhere else moves nothing (R-48).
- **`HELD_EDIT`** also pins `LinkButton`'s resting look, so a held Edit neither brightens nor underlines on hover:
  - `color: COLORS.primary`, for the gold tone;
  - `textDecoration: 'none'`, if the button underlines on hover.

  `upstream/…/shared/components/LinkButton.tsx` confirms both. Its comment says why: `LinkButton` reads only a native `disabled`.

- [ ] **Step 1: Write the failing tests.**
  - `AdminStyles.test.tsx`: the stylesheet holds the `:has(input:disabled)` rule, and the hover and dragging rings carry the `:not(:has(input:disabled))` guard. Update the exact strings at :318-319.
  - `PromoPrintingForm.test.tsx`: the held cover has no inline `opacity`, and its input is `disabled`.
  - `PrintingsPanel.test.tsx`:
    - `it('keeps the line for the last publish mounted, blank, under an open add form')`.
    - `it('keeps an edit form open under the list when a read drops its row, and its heading takes the focus that was in it')`: focus the form's Number, then rerender with rows that lack the printing. The form's heading (`Edit 13/C3 · id 80024`) is the active element.
    - `it('leaves the focus where it was when a read drops the row of an edit form it was not in')`: focus a row's choice, then rerender likewise. The focus stays.
    - `it('keeps a held Edit its resting colour on hover')`: after `fireEvent.mouseEnter`, it has `toHaveStyle({color: COLORS.primary})`.
- [ ] **Step 2: Run them.** `pnpm exec vitest run --project app src/theme src/tools/studio/__tests__/PrintingsPanel.test.tsx src/tools/studio/__tests__/PromoPrintingForm.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** `pnpm exec vitest run --project app src/theme src/tools/studio` passes.
- [ ] **Step 5: Commit.** `fix(studio): the Printings panel keeps its outcome line and an edit form that lost its row, and held controls look held (#80)`.

### Task 9: Word the studio's drafts from one record, and fix four comments

Covers these items from "Tidying":
- `studioPaths.ts`'s `DROPS`, its noun phrases, and `draftLine`'s ternary;
- the comments on `publishPrinting`'s header, `checkEdit`, `showClose={false}`, and `SegmentedControl.tsx:53`.

**Files:**
- Modify: `src/tools/studio/studioPaths.ts`, `src/tools/studio/promos/publishPrinting.ts` (comments only), `src/shell/UnsavedChangesGuard.tsx` (comment), `src/ui/SegmentedControl.tsx` (comment)
- Test: `src/tools/studio/__tests__/studioPaths.test.ts`, unchanged: it pins every sentence

**Interfaces:**
- **One record of each draft's words.** For each draft:
  - its name ("your New reveal card", "your Edit card changes", "your printing form");
  - what it lacks ("isn't published yet" or "aren't saved yet");
  - its pronoun ("it" or "them").

  `LEAVES_STUDIO`, `LACKS` and `DRAFT_NAMES` are built from it.
- **`DRAFTS`** becomes `['reveal', 'edit', 'printing'] as const satisfies readonly Draft[]`. `DROPS` is typed `Readonly<Record<2 | (typeof DRAFTS)['length'], string>>`, so a fourth draft fails to compile until its count has a word.
- **The card-change line** comes from a record over the card's two drafts, not a ternary on `'printing'`.
- **Every sentence stays as it is.**
- **The comments:**
  - `publishPrinting`'s header ends: "A code that a message or a result names is the printing's code as its form opened it: its art variant is included where the form had one (24A/P2)."
  - `checkEdit`: an edit is checked only for what it moves. An edit that moves neither set nor number is checked for neither, so twins that share a code can still be edited. Drop "a printing in a set the app learned of before admin's pin did".
  - `showClose={false}`: also say that without the shell's ×, Tab from the message reaches the stay answer and Shift+Tab wraps to the leave answer (`UnsavedChangesGuard.test.tsx` pins it).
  - `SegmentedControl.tsx:53`: "keeps both drafts" becomes "keeps its drafts".

- [ ] **Step 1: Refactor `studioPaths.ts`.** `pnpm exec vitest run --project app src/tools/studio/__tests__/studioPaths.test.ts` passes unchanged.
- [ ] **Step 2: Fix the four comments.** Run `pnpm exec eslint src/tools/studio/studioPaths.ts src/tools/studio/promos/publishPrinting.ts src/shell/UnsavedChangesGuard.tsx src/ui/SegmentedControl.tsx`: 0 problems.
- [ ] **Step 3: Commit.** `refactor(studio): word the studio's drafts from one record, and fix four comments (#80)`.

### Task 10: Close the test gaps

Covers what remains of "Tests and stories". The owner dropped three items, listed under the owner's picks above.

**Files:**
- Modify: `src/tools/studio/components/PromoPrintingForm.stories.tsx` (`SCAN`, and its caveat comment at :23)
- Modify tests: `promos/__tests__/promoBridge.test.ts`, `catalogEdits.test.ts`, `promoMerge.test.ts`, `publishPrinting.test.ts`, `printingForm.test.ts`, `usePrintingForm.test.ts`, `__tests__/StudioEdit.test.tsx`

**Interfaces:**
- Consumes: Task 4's builders (`HIRO_BASE`, `printingOf`, `NO_SCAN`, `controllerOf`).

- [ ] **Step 1: The five stories.** `SCAN`'s `dataUrl` becomes a complete small image (a valid PNG data URL), so AddComplete, Publishing, RefusedTakenCode, NarrowSlot and PhoneSlot show a scan in the frame. Drop the "broken image" caveat.
- [ ] **Step 2: The bridge test** (`promoBridge.test.ts`).
  - Test 1 also expects `report.changes.length` to be above 0: the merge visited cards.
  - Test 3 sorts `[{rarity: 'Special', promoGrouping: 'P10', number: 1}, {rarity: 'Special', promoGrouping: 'P2', number: 9}, {rarity: 'Special', promoGrouping: 'P2', number: 3}, {rarity: 'Special', promoGrouping: 'P2'}, {rarity: 'Iconic', number: 242}, {rarity: 'Enchanted', number: 210}]`. Expected: Enchanted 210, Iconic 242, P2/3, P2/9, P2 with no number, P10/1.
  - Add `it("throws for a catalog naming a card the cards lack, and leaves the cards as they were")`: a fold group with `baseId: 99999`. `mergePromoPrintings` throws, and `JSON.stringify(cards)` equals what it was before.
- [ ] **Step 3: The catalog edit tests** (`catalogEdits.test.ts`).
  - Add `it('files a new Core group before the groups whose baseId is higher')`: a new printing of `{id: 2001, fullName: 'Hercules - Divine Hero', setCode: '9', number: 1, core: true}`. The `fold` baseIds read `[2001, 2035]`.
  - Above the pinned canonical-form sweep, add a comment. A pin bump whose catalog adds or reorders an entry key fails here, and `ENTRY_KEYS` in `catalogEdits.ts` has to follow the app's.
- [ ] **Step 4: The merge tests** (`promoMerge.test.ts`).
  - Add `it('adds to a Sets 1 to 8 card over the pinned files')`. Take the first pinned `noBaseCard` group with a `lorcanaJsonBaseId`, and add a printing to it with `withNewPrinting` and its card as a non-Core `BaseCard`. `mergeOver` leaves `allCards.json`'s text as it was, and `promos.json` gains exactly one entry, whose `baseId` is the group's `lorcanaJsonBaseId`.
  - In the "keeps the versions" test, take the id from FIXTURE_CATALOG: the first printing with no `finishes`. Don't hard-code 80031.
- [ ] **Step 5: The publish, form and controller tests.**
  - `publishPrinting.test.ts`: `it('refuses an unknown promo set before a taken code')`. An add of 13/Q9 over `WITH_Q9` is refused `'unknownSet'`.
  - `printingForm.test.ts`: `it('finds the Core copy past the Sets 1 to 8 card itself')`. `cards` holds the Set 3 card first and the Core copy after it, and `coreCopyOf` returns the Core copy.
  - `usePrintingForm.test.ts`: `it('keeps the form open, with its message, when the files are out of step')`. After an `outOfStep` refusal, `form` is not null and `form.error` is the message.
  - `StudioEdit.test.tsx:1036-1043`: the never-settling publish stub goes only to the row that publishes.
  - `StudioEdit.test.tsx`: add `it('asks before Forget token drops the printing form')`. Open the add form and fill it, publish against a 401, then press Forget token. The confirm reads `Forget the token and drop your printing form?`.
- [ ] **Step 6: Run.**
  - `pnpm exec vitest run --project app src/tools/studio` passes.
  - `pnpm typecheck` passes, for the story.
- [ ] **Step 7: Commit.** `test(studio): close the promo printings' test gaps (#80)`.
