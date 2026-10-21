# Printing versions in Edit card: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the owner correct any printing's versions (`finishes`: Both, Foil only, Normal only) from Card studio's Edit card, collecting changes in a studio-wide batch that publishes as one commit into every app file that holds each printing.

**Architecture:**
- **Pure core.** A small set of pure modules under `src/tools/studio/finishes/`: version values, file formats, where a printing lives, the rows a card shows, and the batch's rules.
- **Two stores.** Session caches of the target branch's files, and a batch store persisted per branch in `localStorage`.
- **Two components.** A Printings panel in Edit card's form slot, and a Version changes tray below the studio's panes.
- **Publishing.** Through the existing `commitFiles`, with every file read at the commit's base.
- **Defaults** come from the app's own `finishesOf`, through the bridge.

**Tech Stack:** React 19 (React Compiler), TypeScript, Vitest + Testing Library (project `app`), Storybook, the GitHub git data API through `src/github/githubCommit.ts`.

**Spec:** [`docs/printing-finishes-design.md`](../printing-finishes-design.md), the admin part. App part shipped as Doberjohn/inkweave#890. Admin pins the app at `a7dcc07` (PR #72).

## Global Constraints

**What gets written**
- Admin writes into the app only through `commitFiles`, to `targetBranch()` (`VITE_ADMIN_TARGET_BRANCH`, default `master`).
- `finishes` is exactly `["normal"]`, `["foil"]` or `["normal", "foil"]`, in that order. It is always the entry's last key. Set it by deleting the key, then assigning it.
- Admin writes the owner's choice as an explicit value, Both included, into every entry that holds the printing. It never deletes a `finishes`.

**File formats**, kept byte for byte, so only edited entries change:

| File | Format |
|---|---|
| `apps/web/public/data/allCards.json` | `JSON.stringify(x, null, 2) + '\n'` |
| `apps/web/public/data/collection/{set}.json` | `JSON.stringify(x) + '\n'` |
| `apps/web/public/data/collection/promos.json` | `JSON.stringify(x) + '\n'` |
| `scripts/data/promo-printings.json` | `JSON.stringify(x, null, 2)`, no trailing newline |

**Defaults and copy**
- A printing's default is the bridged `finishesOf`, never a copy of the rarity rule.
- Choices read "Both", "Foil only" and "Normal only". Use "Normal", never "standard".

**The batch**
- It holds version changes only, and is kept in `localStorage` under `inkweave-admin.version-batch.<branch>`.
- A change leaves it only by Revert, Discard all, Drop or a publish that sent it.

**Publishing**
- A publish never writes over a printing whose value in its primary home has changed since the change was staged. That's a clash: the change stays in the tray until the owner keeps or drops it, and Publish stays off meanwhile.
- No Printings panel for preview cards.
- Sets 1 to 8 cards open printings-only: no image control, no Save.
- Admin never reads or writes players' counts.

**CLAUDE.md rules that bite here**
- Only `src/app-bridge.ts` imports `upstream/`. Import the engine (`isCoreSet`, `PrintingFinishes`) by name.
- No `useMemo` or `useCallback`, and no `try … finally` in components or hooks.
- Buttons come from the bridge (`CtaButton`, `LinkButton`) or `adm-*` classes. Colours and sizes use tokens, and `COLORS.textDim` is never used for text.
- Focus handoff follows R-48.
- Tests restore every stub, and compare fetched JSON with `toEqual`.
- CodeScene: keep each file at 10. Cyclomatic complexity ≤ 8 per function, at most 4 arguments (use an options object), and under 30% primitive arguments per module.

## Review Focus

These are the five inputs the spec implies that are most likely to bite. Each is pinned by a test in the task named.

1. **Storage blocked or full** (private window): the batch keeps working in memory for the page's life. Task 5, `keeps changes in memory when localStorage throws`.
2. **Another target branch**: a batch staged for `rehearse-68` never shows or publishes on `master`. Task 5, `keys the batch by target branch`.
3. **Choosing a printing's original value again**: the change leaves the batch, so no publish rewrites a value the binder already shows. Explicit Both and an absent field on a non-chase printing count as the same. Task 5, `drops a change that shows the value it started from`.
4. **A printing gone from the data** between staging and publishing: it's a clash with `gone`, offered Drop only, and nothing is written. Task 6, `reports a printing missing from its primary home as gone`.
5. **The branch moves during a publish** ("not a fast forward"): the error says to publish again, and the batch is intact. Task 6, `keeps the batch when the branch moved`.

---

### Task 1: Bridge exports and version values

**Files:**
- Modify: `src/app-bridge.ts:15-40` (constants block), `:69` (loader line)
- Create: `src/tools/studio/finishes/finishValues.ts`
- Test: `src/tools/studio/finishes/__tests__/finishValues.test.ts`

**Interfaces:**
- Produces, in `app-bridge.ts`:
  - `finishesOf(printing: FinishFacts): readonly Finish[]` and `type FinishFacts`, from `apps/web/src/features/collection/printingFinishes`;
  - `type Finish`, from `…/collection/collectionParser`;
  - `transformPromos`, `type CollectionPromo` and `type RawCollectionPromo`, from `…/collection/collectionPromos`;
  - `PROMO_RARITY` and `isChaseRarity`, added to the loader line;
  - `promoSetRank`, added to the constants block.
- Produces, in `finishValues.ts`:
  ```ts
  export type FinishChoice = 'both' | 'foil' | 'normal';
  export const CHOICE_OPTIONS: ReadonlyArray<{value: FinishChoice; label: string}>; // Both, Foil only, Normal only
  export function choiceOf(shown: readonly Finish[]): FinishChoice;
  export function finishesOfChoice(choice: FinishChoice): PrintingFinishes;
  export function sameFinishes(a: readonly Finish[] | null, b: readonly Finish[] | null): boolean;
  export function choiceLabel(shown: readonly Finish[]): string;   // 'Both' | 'Foil only' | 'Normal only'
  export function finishTitle(finish: Finish): string;             // 'Normal' | 'Foil'
  ```

- [ ] **Step 1: Write the failing test**

```ts
describe('finishValues', () => {
  it('maps shown finishes to a choice and back', () => {
    expect(choiceOf(['normal', 'foil'])).toBe('both');
    expect(choiceOf(['foil'])).toBe('foil');
    expect(choiceOf(['normal'])).toBe('normal');
    expect(finishesOfChoice('both')).toEqual(['normal', 'foil']);
    expect(finishesOfChoice('foil')).toEqual(['foil']);
  });
  it('labels choices in the binder words', () => {
    expect(CHOICE_OPTIONS.map((o) => o.label)).toEqual(['Both', 'Foil only', 'Normal only']);
    expect(choiceLabel(['normal'])).toBe('Normal only');
    expect(finishTitle('normal')).toBe('Normal');
  });
  it('compares finishes by value', () => {
    expect(sameFinishes(['normal', 'foil'], ['normal', 'foil'])).toBe(true);
    expect(sameFinishes(null, null)).toBe(true);
    expect(sameFinishes(['foil'], null)).toBe(false);
  });
  it('takes the default from the app', () => {
    expect(finishesOf({rarity: 'Enchanted'})).toEqual(['foil']);
    expect(finishesOf({rarity: 'Legendary'})).toEqual(['normal', 'foil']);
    expect(finishesOf({rarity: 'Legendary', finishes: ['foil']})).toEqual(['foil']);
  });
});
```

- [ ] **Step 2: Run it.** `pnpm vitest run --project app src/tools/studio/finishes/__tests__/finishValues.test.ts`. Expected: FAIL, because the module isn't found.
- [ ] **Step 3: Add the bridge exports, with a one-line comment each in the bridge's style, and implement `finishValues.ts`.** `PrintingFinishes` comes from `inkweave-synergy-engine`.
- [ ] **Step 4: Run it again.** Expected: PASS. Run `pnpm typecheck` too: the bridged collection modules must compile in admin.
- [ ] **Step 5: Commit.** `USER_APPROVED=1 git commit -m "feat(studio): bridge the app's finishes rule and name the version choices (#68)"`

### Task 2: Read and write `finishes` in each file's own format

**Files:**
- Create: `src/tools/studio/finishes/finishFiles.ts`
- Test: `src/tools/studio/finishes/__tests__/finishFiles.test.ts`

**Interfaces:**
- Consumes: `PrintingFinishes` from the engine.
- Produces:
  ```ts
  export const ALL_CARDS_PATH = 'apps/web/public/data/allCards.json';
  export const PROMOS_PATH = 'apps/web/public/data/collection/promos.json';
  export const CATALOG_PATH = 'scripts/data/promo-printings.json';
  export function setChunkPath(setCode: string): string; // `apps/web/public/data/collection/${setCode}.json`
  export type FileValues = ReadonlyMap<string, PrintingFinishes | null>; // every entry id the file holds → its finishes, null when absent
  export class FinishFileError extends Error { name = 'FinishFileError'; }
  export function readFinishes(opts: {path: string; text: string}): FileValues;
  export function writeFinishes(opts: {path: string; text: string; values: ReadonlyMap<string, PrintingFinishes>}): string;
  ```
- **Where entries sit in each file.** Ids are compared as `String(entry.id)`.

  | File | Entries |
  |---|---|
  | `allCards.json` | `cards[]` and `cards[].variants[]` |
  | a set chunk or `promos.json` | the top-level array |
  | the catalog | `fold[].variants[]` and `noBaseCard[].variants[]` |
- `writeFinishes` sets `finishes` on every entry whose id is in `values`, and re-serializes in that file's format. It throws `FinishFileError` (`` `${id} isn't in ${path}` ``) for any id the file doesn't hold.

- [ ] **Step 1: Write the failing tests**

```ts
const chunk = JSON.stringify([{id: 946, rarity: 'Legendary', baseId: 750}, {id: 750, rarity: 'Legendary'}]) + '\n';
const all = JSON.stringify({metadata: {}, sets: {}, cards: [{id: 2035, rarity: 'Uncommon', variants: [{id: 80017, rarity: 'Special', finishes: ['normal']}]}]}, null, 2) + '\n';
const catalog = JSON.stringify({about: '', fold: [{baseId: 2035, variants: [{id: 80017, rarity: 'Special', finishes: ['normal']}]}], noBaseCard: [{variants: [{id: 3237, rarity: 'Special'}]}]}, null, 2);

it('reads every entry, null where finishes is absent', () => {
  expect(readFinishes({path: setChunkPath('4'), text: chunk})).toEqual(new Map([['946', null], ['750', null]]));
  expect(readFinishes({path: ALL_CARDS_PATH, text: all}).get('80017')).toEqual(['normal']);
  expect(readFinishes({path: CATALOG_PATH, text: catalog}).get('3237')).toBeNull();
});
it('writes finishes as the last key and keeps the compact format', () => {
  const out = writeFinishes({path: setChunkPath('4'), text: chunk, values: new Map([['946', ['foil']]])});
  expect(out).toBe(JSON.stringify([{id: 946, rarity: 'Legendary', baseId: 750, finishes: ['foil']}, {id: 750, rarity: 'Legendary'}]) + '\n');
});
it('moves an existing finishes to the end when it changes it', () => {
  const text = JSON.stringify([{id: 1, finishes: ['foil'], rarity: 'Rare'}]) + '\n';
  expect(writeFinishes({path: setChunkPath('5'), text, values: new Map([['1', ['normal', 'foil']]])}))
    .toBe(JSON.stringify([{id: 1, rarity: 'Rare', finishes: ['normal', 'foil']}]) + '\n');
});
it('keeps the catalog without a trailing newline and allCards with one', () => {
  expect(writeFinishes({path: CATALOG_PATH, text: catalog, values: new Map([['80017', ['normal', 'foil']]])}).endsWith('\n')).toBe(false);
  expect(writeFinishes({path: ALL_CARDS_PATH, text: all, values: new Map([['80017', ['foil']]])}).endsWith('}\n')).toBe(true);
});
it('refuses an id the file does not hold', () => {
  expect(() => writeFinishes({path: PROMOS_PATH, text: '[]\n', values: new Map([['80017', ['foil']]])})).toThrow("80017 isn't in apps/web/public/data/collection/promos.json");
});
it('round-trips the pinned app files byte for byte', () => {
  for (const rel of ['allCards.json', 'collection/4.json', 'collection/promos.json']) {
    const path = `apps/web/public/data/${rel}`;
    const text = readFileSync(resolve('upstream/inkweave', path), 'utf8');
    expect(writeFinishes({path, text, values: new Map()})).toBe(text);
  }
  const text = readFileSync(resolve('upstream/inkweave', CATALOG_PATH), 'utf8');
  expect(writeFinishes({path: CATALOG_PATH, text, values: new Map()})).toBe(text);
});
```
The last test reads the files through `node:fs`, which is not an import, so the boundary rule allows it.

- [ ] **Step 2: Run them.** `pnpm vitest run --project app src/tools/studio/finishes/__tests__/finishFiles.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `finishFiles.ts`.**
  - A private `formatOf(path)` picks the serializer and `entriesOf(path, parsed)` yields the entry objects. A path that matches none of the four kinds throws `FinishFileError`.
  - Keep each function's complexity at 8 or less by splitting per file kind.
- [ ] **Step 4: Run them again.** Expected: PASS.
- [ ] **Step 5: Commit.** `USER_APPROVED=1 git commit -m "feat(studio): read and write a printing's finishes in each app file's own format (#68)"`

### Task 3: Where a printing lives, and the rows a card shows

**Files:**
- Create: `src/tools/studio/finishes/printingHomes.ts`, `src/tools/studio/finishes/printingRows.ts`
- Test: `src/tools/studio/finishes/__tests__/printingHomes.test.ts`, `__tests__/printingRows.test.ts`

**Interfaces:**
- Consumes:
  - Task 2's paths;
  - `isCoreSet` (engine), `finishesOf`, `isChaseRarity`, `PROMO_RARITY`, `promoSetRank` and `CollectionPromo` (bridge);
  - `LorcanaCard` (engine).
- Produces:
  ```ts
  export type PrintingKind = 'card' | 'printing' | 'promo';
  export interface PrintingRef { id: string; kind: PrintingKind; setCode: string; core: boolean; } // setCode: the card's set (a promo: its base card's); core = isCoreSet(setCode)
  export function homesOf(ref: PrintingRef): readonly string[];
  export function primaryHome(ref: PrintingRef): string;

  export interface PrintingRow { ref: PrintingRef; name: string; label: string; thumbnail: string | undefined; rarity: string; value: PrintingFinishes | null; shown: readonly Finish[]; }
  export interface PrintingSources { card: LorcanaCard; chunk: readonly LorcanaCard[]; promos: readonly CollectionPromo[]; valueOf: (ref: PrintingRef) => PrintingFinishes | null; }
  export function printingRowsFor(sources: PrintingSources): PrintingRow[];
  ```
- **Homes** (primary first):

  | Kind | Homes |
  |---|---|
  | a card in a Core set | `[ALL_CARDS_PATH]` |
  | a card in Sets 1 to 8 | `[setChunkPath(set)]` |
  | a printing | `[setChunkPath(set)]`, plus `ALL_CARDS_PATH` when the set is Core |
  | a promo | `[CATALOG_PATH, PROMOS_PATH]`, plus `ALL_CARDS_PATH` when its base card is Core |

- **Rows**, in this order:
  1. the card itself;
  2. the `chunk` entries whose `baseId === card.id`, by number;
  3. the `promos` whose `baseId === card.id`, by `promoSetRank`, then number.
- **Names:**
  - the card itself: `` `#${setNumber}` ``;
  - a chase printing: `` `#${n} · ${rarity}` ``;
  - any other printing: `` `#${n} · Alt foil` ``;
  - a promo: `` `${number}${artVariant ?? ''}/${promoGrouping}` ``.
- **Label:** `` `${card.fullName} ${code}` ``, where `code` is `` `#${n}` `` or the promo code.
- **Thumbnail:** `smallImageUrl` of the entry.
- **Values:** `value = valueOf(ref)`, and `shown = finishesOf({rarity, finishes: value ?? undefined})`.

- [ ] **Step 1: Write the failing tests**

```ts
const ref = (kind: PrintingKind, setCode: string) => ({id: '1', kind, setCode, core: Number(setCode) >= 9});
it('lists each kind of printing in its homes, primary first', () => {
  expect(homesOf(ref('card', '12'))).toEqual([ALL_CARDS_PATH]);
  expect(homesOf(ref('card', '4'))).toEqual([setChunkPath('4')]);
  expect(homesOf(ref('printing', '11'))).toEqual([setChunkPath('11'), ALL_CARDS_PATH]);
  expect(homesOf(ref('printing', '4'))).toEqual([setChunkPath('4')]);
  expect(homesOf(ref('promo', '9'))).toEqual([CATALOG_PATH, PROMOS_PATH, ALL_CARDS_PATH]);
  expect(homesOf(ref('promo', '1'))).toEqual([CATALOG_PATH, PROMOS_PATH]);
  expect(primaryHome(ref('promo', '9'))).toBe(CATALOG_PATH);
});
it("names Yen Sid's printings as the binder holds them", () => {
  const rows = printingRowsFor({card: YEN_SID, chunk: SET_4, promos: [], valueOf: (r) => (r.id === '946' ? ['foil'] : null)});
  expect(rows.map((r) => r.name)).toEqual(['#59', '#209 · Enchanted', '#223 · Alt foil']);
  expect(rows.map((r) => r.shown)).toEqual([['normal', 'foil'], ['foil'], ['foil']]);
  expect(rows[2].label).toBe('Yen Sid - Powerful Sorcerer #223');
  expect(rows[2].ref).toEqual({id: '946', kind: 'printing', setCode: '4', core: false});
});
it('lists a Core card’s promos after its printings, by promo set', () => {
  const rows = printingRowsFor({card: MOTHER_KNOWS_BEST, chunk: [], promos: C3_MKB, valueOf: () => null});
  expect(rows.map((r) => r.name)).toEqual(['#99', '1/C3', '13/C3']);
  expect(rows[1].ref).toEqual({id: '80017', kind: 'promo', setCode: '9', core: true});
});
```
`YEN_SID`, `SET_4`, `MOTHER_KNOWS_BEST` and `C3_MKB` are fixtures built with the bridged `transformRawCards` and `transformPromos`, from the real entries quoted in the spec: ids 750, 900 (#209 Enchanted) and 946 in Set 4, and 2035 with promos 80017 and 80024. Put them in `src/tools/studio/finishes/__tests__/finishFixtures.ts`.

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement both modules.**
- [ ] **Step 4: Run them again.** Expected: PASS.
- [ ] **Step 5: Commit.** `USER_APPROVED=1 git commit -m "feat(studio): place each printing in its app files and name its row (#68)"`

### Task 4: Read the branch's files, and a card's printings

**Files:**
- Create: `src/tools/studio/finishes/branchFiles.ts`, `src/tools/studio/finishes/useBranchPrintings.ts`
- Modify: `src/test/setup.ts`, to call `resetBranchFiles()` in `beforeEach`
- Test: `src/tools/studio/finishes/__tests__/branchFiles.test.ts`, `__tests__/useBranchPrintings.test.tsx`

**Interfaces:**
- Consumes:
  - `readRepoFile(token, path, ref?)` and `targetBranch()` from `src/github/githubCommit.ts`;
  - Task 2's `readFinishes` and paths, and Task 3's `printingRowsFor` and `primaryHome`;
  - the bridged `transformRawCards` and `transformPromos`.
- Produces:
  ```ts
  // branchFiles.ts: one read per (branch, path) for the session; a failed read isn't kept
  export function readBranchFile(opts: {token: string; path: string}): Promise<string>;
  export function forgetBranchFiles(): void;            // drops every read and re-renders subscribers
  export function useBranchFilesGeneration(): number;   // useSyncExternalStore over forgetBranchFiles
  export function resetBranchFiles(): void;             // for src/test/setup.ts
  // useBranchPrintings.ts
  export type BranchPrintings =
    | {status: 'loading'}
    | {status: 'error'; error: string; retry: () => void}
    | {status: 'ready'; rows: readonly PrintingRow[]};
  export function useBranchPrintings(opts: {token: string; card: LorcanaCard}): BranchPrintings;
  ```
- **Files it reads:** `setChunkPath(card.setCode)`, `PROMOS_PATH` and `CATALOG_PATH`, plus `ALL_CARDS_PATH` when `isCoreSet(card.setCode)`.
- **How values are found:** `valueOf(ref)` reads `primaryHome(ref)`'s `FileValues`, and treats an id that's absent as `null`.
- **Parse once.** Each file is parsed once per read, so `allCards.json` (about 2 MB) is parsed once per read rather than once per render. A module-level last-text cache per path does it.
- **No race.** Reading a new card discards the previous card's pending result.

- [ ] **Step 1: Write the failing tests**

```ts
it('reads a file once per branch and path', async () => {
  const read = vi.mocked(readRepoFile).mockResolvedValue('[]\n');
  await readBranchFile({token: 't', path: PROMOS_PATH});
  await readBranchFile({token: 't', path: PROMOS_PATH});
  expect(read).toHaveBeenCalledTimes(1);
});
it('reads again after forgetBranchFiles, and after a failed read', async () => { /* reject once, then resolve: 2 calls; forget: 3 */ });
it("gives Yen Sid's rows with the branch's values", async () => {
  mockBranch({[setChunkPath('4')]: SET_4_TEXT, [PROMOS_PATH]: '[]\n', [CATALOG_PATH]: EMPTY_CATALOG_TEXT});
  const {result} = renderHook(() => useBranchPrintings({token: 't', card: YEN_SID}));
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(ready(result.current).rows.map((r) => r.value)).toEqual([null, null, ['foil']]);
  expect(readRepoFile).not.toHaveBeenCalledWith('t', ALL_CARDS_PATH, expect.anything()); // a Sets 1-8 card needs no allCards.json
});
it('reports a failed read with a retry that reads again', async () => { /* reject the chunk; status 'error'; retry() → ready */ });
```
Mock `readRepoFile` with `vi.mock('../../../../github/githubCommit', …)`, keeping `targetBranch` real. Restore everything in `afterEach`.

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement both modules and register `resetBranchFiles` in `src/test/setup.ts`.** Clear any loading or error state on both paths, with no `finally`.
- [ ] **Step 4: Run them again.** Expected: PASS.
- [ ] **Step 5: Commit.** `USER_APPROVED=1 git commit -m "feat(studio): read a card's printings and their versions from the target branch (#68)"`

### Task 5: The batch and its store

**Files:**
- Create: `src/tools/studio/finishes/versionBatch.ts`, `src/tools/studio/finishes/versionBatchStore.ts`
- Modify: `src/test/setup.ts`, to call `resetVersionBatch()`; `.storybook/preview.tsx`, to call it before each story
- Test: `src/tools/studio/finishes/__tests__/versionBatch.test.ts`, `__tests__/versionBatchStore.test.ts`

**Interfaces:**
- Consumes: Task 1's `sameFinishes`, `finishesOfChoice`, `finishTitle` and `FinishChoice`; Task 3's `PrintingRow` and `PrintingRef`; `targetBranch()`.
- Produces:
  ```ts
  // versionBatch.ts (pure)
  export interface VersionClash { id: string; now: PrintingFinishes | null; shownNow: readonly Finish[]; gone?: boolean; }
  export interface VersionChange { id: string; label: string; ref: PrintingRef; from: PrintingFinishes | null; shownFrom: readonly Finish[]; to: PrintingFinishes; clash?: VersionClash; }
  export interface VersionBatch { changes: readonly VersionChange[]; }
  export const EMPTY_BATCH: VersionBatch;
  export function changeFor(opts: {row: PrintingRow; choice: FinishChoice}): VersionChange;
  export function withChange(batch: VersionBatch, change: VersionChange): VersionBatch;     // replaces by id; drops it when sameFinishes(to, shownFrom)
  export function withoutChange(batch: VersionBatch, id: string): VersionBatch;
  export function withClashes(batch: VersionBatch, clashes: readonly VersionClash[]): VersionBatch;
  export function keptClash(batch: VersionBatch, id: string): VersionBatch;                 // from ← now, shownFrom ← shownNow, no clash; drops it when it now matches
  export function hasClash(batch: VersionBatch): boolean;
  export function afterPublish(batch: VersionBatch, sent: readonly VersionChange[]): VersionBatch; // removes the sent ones by identity
  export function removalNote(change: VersionChange): string | null;
  // versionBatchStore.ts (module store, useSyncExternalStore, like useGithubToken)
  export const VERSION_BATCH_KEY_PREFIX = 'inkweave-admin.version-batch.';
  export interface VersionBatchView {
    changes: readonly VersionChange[]; publishing: boolean; result: {commitUrl: string; count: number} | null; error: string | null;
    stage: (change: VersionChange) => void; revert: (id: string) => void; discard: () => void; keep: (id: string) => void;
    publish: (token: string) => Promise<void>; // wired in Task 6
  }
  export function useVersionBatch(): VersionBatchView;
  export function resetVersionBatch(opts?: {keepStorage?: boolean}): void;
  ```
- **Storage.** The store keeps `{v: 1, changes}` under `` `${VERSION_BATCH_KEY_PREFIX}${targetBranch()}` ``.
  - Every read and write is in try/catch. A failed write keeps memory only, as `useGithubToken` does.
  - On load it keeps only entries whose `to` passes the `finishes` value check.
  - `publishing`, `result` and `error` live in memory only. Staging, reverting or discarding clears `result` and `error`.
- **`removalNote`.** When `shownFrom` has a finish that `to` lacks, it returns `` `Removes ${finishTitle(removed)}. Copies counted in it will show under ${finishTitle(to[0])}.` ``. Otherwise it returns `null`.

- [ ] **Step 1: Write the failing tests**

```ts
const row = YEN_SID_ROWS[2]; // #223, value ['foil'], shown ['foil']
it('stages a change and replaces it by id', () => {
  const once = withChange(EMPTY_BATCH, changeFor({row, choice: 'both'}));
  const twice = withChange(once, changeFor({row, choice: 'normal'}));
  expect(twice.changes).toHaveLength(1);
  expect(twice.changes[0].to).toEqual(['normal']);
});
it('drops a change that shows the value it started from', () => {
  const back = withChange(withChange(EMPTY_BATCH, changeFor({row, choice: 'both'})), changeFor({row, choice: 'foil'}));
  expect(back.changes).toEqual([]);
  const own = YEN_SID_ROWS[0]; // #59: no field, shown Both
  expect(withChange(EMPTY_BATCH, changeFor({row: own, choice: 'both'})).changes).toEqual([]);
});
it('marks clashes, keeps one on top of the new value, and blocks publish meanwhile', () => {
  const batch = withChange(EMPTY_BATCH, changeFor({row, choice: 'both'}));
  const clashed = withClashes(batch, [{id: '946', now: ['normal'], shownNow: ['normal']}]);
  expect(hasClash(clashed)).toBe(true);
  const kept = keptClash(clashed, '946');
  expect(kept.changes[0]).toMatchObject({from: ['normal'], shownFrom: ['normal'], to: ['normal', 'foil']});
  expect(hasClash(kept)).toBe(false);
});
it('removes only the changes a publish sent', () => { /* stage A, send [A], stage B: afterPublish keeps B */ });
it('words a removal', () => {
  expect(removalNote(changeFor({row: YEN_SID_ROWS[0], choice: 'foil'}))).toBe('Removes Normal. Copies counted in it will show under Foil.');
  expect(removalNote(changeFor({row, choice: 'both'}))).toBeNull();
});
// versionBatchStore.test.ts
it('keeps the batch across a reload of the store', () => { /* stage; resetVersionBatch({keepStorage: true}) re-reads; changes kept */ });
it('keys the batch by target branch', () => { /* vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'rehearse-68') → stage → master store is empty */ });
it('keeps changes in memory when localStorage throws', () => { /* vi.stubGlobal('localStorage', throwing) → stage → changes.length 1 */ });
```
`resetVersionBatch` takes an optional `{keepStorage?: boolean}`. Plain, it clears memory and this branch's key, which is what test setup uses. With `keepStorage`, it only drops memory, so the store reads storage again.

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement both modules.** `publish` is a stub that resolves; Task 6 wires it.
- [ ] **Step 4: Run them again.** Expected: PASS.
- [ ] **Step 5: Commit.** `USER_APPROVED=1 git commit -m "feat(studio): keep a batch of version changes per target branch (#68)"`

### Task 6: Publish the batch in one commit

**Files:**
- Create: `src/tools/studio/finishes/publishVersions.ts`
- Modify: `src/tools/studio/finishes/versionBatchStore.ts`, to wire `publish`
- Test: `src/tools/studio/finishes/__tests__/publishVersions.test.ts`, extend `__tests__/versionBatchStore.test.ts`

**Interfaces:**
- Consumes:
  - `commitFiles`, `readRepoFile`, `utf8ToBase64` and `targetBranch`;
  - `isRejectedToken`, from `src/github/rejectedToken.ts`;
  - Task 2's `readFinishes` and `writeFinishes`, Task 3's `homesOf` and `primaryHome`, and Task 5's types and `withClashes` / `afterPublish`;
  - `forgetBranchFiles` (Task 4).
- Produces:
  ```ts
  export class VersionClashError extends Error { name = 'VersionClashError'; constructor(readonly clashes: readonly VersionClash[]); }
  export function versionCommitMessage(count: number): string; // 'chore(collection): set the versions of 1 printing from Card studio' / '… of 3 printings …'
  export function clashMessage(count: number): string;         // '1 change clashes: …' / '3 changes clash: …' (text below)
  export async function publishVersions(opts: {token: string; changes: readonly VersionChange[]}): Promise<CommitResult>;
  ```
- **`publishVersions`** calls `commitFiles({token, message, files: async (base) => …})`. The callback:
  1. Reads every path in the union of the changes' homes at `base`, in sorted order.
  2. Checks each change's primary value against `from`:
     - an id missing from its primary file becomes `{id, now: null, shownNow: [], gone: true}`;
     - a different value becomes `{id, now, shownNow: finishesOf({rarity, finishes: now ?? undefined})}`. The rarity comes from the primary entry.
  3. Throws `VersionClashError` with every clash at once, so nothing is written.
  4. Otherwise writes each file's `values` (id → `to`, for the changes homed in it) and returns `CommitFile`s for the files whose text changed.
- **`clashMessage(n)`:** `` `${n} change${n === 1 ? ' clashes' : 's clash'}: someone changed ${n === 1 ? 'this printing' : 'these printings'} on ${targetBranch()} since. Keep or drop each one, then publish again.` ``
- **The store's `publish(token)`** does nothing while publishing, while the batch is empty, or while `hasClash`. Otherwise:
  - **Success:** `afterPublish`, set `result: {commitUrl, count}`, then `forgetBranchFiles()`.
  - **`VersionClashError`:** `withClashes`, set `error: clashMessage(n)`, then `forgetBranchFiles()`.
  - **Any other error:** set `error: e.message`. The race message from `commitFiles` passes through.
  - Set `publishing: false` on every path, without `finally`.
- **The design's Reload happens at once.** The design has a refused publish offer Reload, which refreshes the values and marks the clashes. This plan does both straight away: the refused publish has already read the base, so it marks the clashes itself, and `forgetBranchFiles()` makes the panel read the branch again.
- **No new GitHub code.** `readRepoFile`'s raw media type reads files up to 100 MB, so it already handles `allCards.json`'s 2 MB. `commitFiles` posts blobs.

- [ ] **Step 1: Write the failing tests**

```ts
it('writes one commit with every home of every change', async () => {
  mockAtBase({[setChunkPath('4')]: SET_4_TEXT, [CATALOG_PATH]: CATALOG_TEXT, [PROMOS_PATH]: PROMOS_TEXT, [ALL_CARDS_PATH]: ALL_CARDS_TEXT});
  await publishVersions({token: 't', changes: [YEN_SID_223_TO_BOTH, MKB_1C3_TO_BOTH]});
  const files = filesSent(); // decoded paths → text
  expect(Object.keys(files).sort()).toEqual([ALL_CARDS_PATH, PROMOS_PATH, setChunkPath('4'), CATALOG_PATH].sort());
  expect(readFinishes({path: setChunkPath('4'), text: files[setChunkPath('4')]}).get('946')).toEqual(['normal', 'foil']);
  expect(readFinishes({path: ALL_CARDS_PATH, text: files[ALL_CARDS_PATH]}).get('80017')).toEqual(['normal', 'foil']);
  expect(commitMessage()).toBe('chore(collection): set the versions of 2 printings from Card studio');
});
it('refuses every clash at once and writes nothing', async () => { /* base chunk has 946 ['normal'] while from is ['foil'] → VersionClashError with [{id:'946', now:['normal'], shownNow:['normal']}]; no blobs posted */ });
it('reports a printing missing from its primary home as gone', async () => { /* catalog without 80017 → clash {id:'80017', now:null, shownNow:[], gone:true} */ });
// store
it('clears the published changes and keeps one staged during the publish', async () => { /* … */ });
it('marks clashes and keeps the batch when a printing changed', async () => { /* store.changes[0].clash defined; error === clashMessage(1) */ });
it('keeps the batch when the branch moved', async () => { /* commitFiles rejects with 'master changed while publishing, so nothing was published. Publish again.' → error equals it, changes intact */ });
```
`commitFiles` is mocked to run the callback with base `'base'` and record the files. `mockAtBase` asserts that every read uses `ref === 'base'`.

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement `publishVersions.ts` and wire the store.**
- [ ] **Step 4: Run them again.** Expected: PASS.
- [ ] **Step 5: Commit.** `USER_APPROVED=1 git commit -m "feat(studio): publish a batch of version changes in one commit, refusing clashes (#68)"`

### Task 7: Search reaches Sets 1 to 8, and their cards open printings-only

**Files:**
- Create: `src/tools/studio/finishes/collectionCards.ts`
- Modify:
  - `src/tools/studio/branchCards.ts`, to add `withCollectionCards`;
  - `src/tools/studio/useCardEditor.ts:200`, to merge the source and expose `printingsOnly` and `collection`;
  - `src/tools/studio/components/StudioCardPanel.tsx`, for an `imageControl` prop;
  - `src/tools/studio/EditPane.tsx`, to pass `imageControl`, show the printings-only note, hide Save and ChangeList, and add the search notice;
  - `src/tools/studio/studioCopy.ts`, for `PRINTINGS_ONLY_NOTE`;
  - `src/test/setup.ts`, to call `resetCollectionOnlyCards()`.
- Test: `src/tools/studio/finishes/__tests__/collectionCards.test.ts`, the existing `__tests__` for branchCards and EditPane (extended)

**Interfaces:**
- Consumes: the bridged `transformRawCards`, and `isCoreSet` (engine).
- Produces:
  ```ts
  export const COLLECTION_ONLY_SETS: readonly string[]; // '1' … '8'
  export interface CollectionOnlyCards { cards: readonly LorcanaCard[]; status: 'loading' | 'ready' | 'error'; retry: () => void; }
  export function fetchCollectionOnlyCards(): Promise<LorcanaCard[]>; // fetch('/data/collection/{n}.json') for each set, transformRawCards, keep entries without baseId; one promise per session; a failure isn't kept
  export function useCollectionOnlyCards(): CollectionOnlyCards;
  export function resetCollectionOnlyCards(): void;
  // branchCards.ts
  export function withCollectionCards<L extends CardListView>(opts: {list: L; collection: CollectionOnlyCards}): L;
  // cards: [...list.cards, ...collection.cards]; getCardById checks both; isLoading: list.isLoading || collection.status === 'loading'; error stays list.error
  // studioCopy.ts
  export const PRINTINGS_ONLY_NOTE = 'A Set 1 to 8 card: only its printings’ versions change here.';
  ```
- **The controller** (`CardEditorController`) gains:
  - `printingsOnly: boolean`, true for a ready card whose `!isCoreSet(card.setCode)`;
  - `collection: CollectionOnlyCards`.
- **EditPane, for a `printingsOnly` card:**
  - `StudioCardPanel` gets `imageControl={false}`: no FileCover, no Replace card image, no drop target.
  - `EditForm` renders `ReleasedCardFacts` with `note={PRINTINGS_ONLY_NOTE}`.
  - `EditAside` renders neither ChangeList nor Save.
- **Search notice.** When `collection.status === 'error'`, SearchView's notice reads "Sets 1 to 8 didn't load, so the search holds Sets 9 and up only." with a "Try again" `LinkButton` that calls `collection.retry`.

- [ ] **Step 1: Write the failing tests**

```ts
it('loads Sets 1 to 8 once and keeps their cards only', async () => {
  const fetchMock = vi.fn(async (url: string) => Response.json(url.endsWith('/4.json') ? SET_4_RAW : []));
  vi.stubGlobal('fetch', fetchMock);
  const cards = await fetchCollectionOnlyCards();
  expect(fetchMock.mock.calls.map(([u]) => u)).toEqual(COLLECTION_ONLY_SETS.map((s) => `/data/collection/${s}.json`));
  expect(cards.map((c) => c.id)).toEqual(['750']); // 900 and 946 have a baseId
  await fetchCollectionOnlyCards();
  expect(fetchMock).toHaveBeenCalledTimes(8);
});
it('merges the collection cards after the card list', () => { /* withCollectionCards: getCardById('750') found; isLoading while 'loading' */ });
it('opens a Sets 1 to 8 card printings-only', async () => {
  // EditPane test harness at ?mode=edit&card=750 with the collection mocked ready
  expect(await screen.findByText(PRINTINGS_ONLY_NOTE)).toBeInTheDocument();
  expect(screen.queryByRole('button', {name: /replace card image/i})).not.toBeInTheDocument();
  expect(screen.queryByRole('button', {name: /save/i})).not.toBeInTheDocument();
});
it('finds Yen Sid in the search, tagged Released', async () => { /* type "Yen Sid" → row "Yen Sid - Powerful Sorcerer" with tag Released */ });
it('says when Sets 1 to 8 did not load', async () => { /* collection error → notice text + Try again calls retry */ });
```

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.** Keep `editSources`' rules unchanged, since branch-only preview cards still lead. CodeScene: `withCollectionCards` takes one options object.
- [ ] **Step 4: Run them, then the studio's existing suites:** `pnpm vitest run --project app src/tools/studio`. Expected: PASS.
- [ ] **Step 5: Commit.** `USER_APPROVED=1 git commit -m "feat(studio): find Sets 1 to 8 cards in Edit card and open them printings-only (#68)"`

### Task 8: The Printings panel

**Files:**
- Create: `src/tools/studio/components/PrintingsPanel.tsx`, `src/tools/studio/components/PrintingsPanel.stories.tsx`
- Modify: `src/tools/studio/EditPane.tsx`, to mount the panel in `EditForm` for a released card: `edit.tag === 'Released'`, which covers Sets 1 to 8 and released Core cards, never a preview
- Test: `src/tools/studio/components/__tests__/PrintingsPanel.test.tsx`, or the studio's test folder by its convention

**Interfaces:**
- Consumes:
  - Task 4's `useBranchPrintings` and `BranchPrintings`;
  - Task 5's `useVersionBatch`, `changeFor` and `VersionChange`;
  - Task 1's `CHOICE_OPTIONS`, `choiceOf` and `FinishChoice`;
  - `Panel`, `SegmentedControl` and `Notice` from `src/ui`, and `CtaButton` from the bridge.
- Produces:
  ```ts
  export interface PrintingsPanelProps { view: BranchPrintings; changes: readonly VersionChange[]; onChoose: (opts: {row: PrintingRow; choice: FinishChoice}) => void; }
  export function PrintingsPanel({view, changes, onChoose}: PrintingsPanelProps): JSX.Element;
  ```
- **The panel.** `<Panel title="Printings">` holds one row per `PrintingRow`:
  - a thumbnail (`alt=""`, 28 px wide), then the row's name;
  - a `SegmentedControl` with `options={CHOICE_OPTIONS}`, `ariaLabel={`Versions of ${row.label}`}`, and as its value the pending `to`'s choice, else `choiceOf(row.shown)`;
  - one marker: "Clash" (a pending change with a clash), "Pending" (in the batch), "In the data" (`row.value !== null`) or "By rarity".
- **Loading and errors.** Loading shows `<Notice>Loading the printings…</Notice>`. An error shows an error Notice with the message and a neutral `CtaButton` "Read the files again" that calls `retry`.
- **EditPane** wires `onChoose` to `store.stage(changeFor(...))`, with `useBranchPrintings({token, card: ready.card})`. Thread `token` into `EditPane`'s props from `StudioWorkspace`.

- [ ] **Step 1: Write the failing tests**

```ts
it("shows Yen Sid's printings with their versions and where each comes from", () => {
  render(<PrintingsPanel view={{status: 'ready', rows: YEN_SID_ROWS}} changes={[]} onChoose={vi.fn()} />);
  const group = screen.getByRole('group', {name: 'Versions of Yen Sid - Powerful Sorcerer #223'});
  expect(within(group).getByRole('button', {name: 'Foil only'})).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getAllByText('By rarity')).toHaveLength(2);
  expect(screen.getByText('In the data')).toBeInTheDocument();
});
it('stages a choice and shows it pending', async () => { /* click Both on #223 → onChoose({row: YEN_SID_ROWS[2], choice: 'both'}); rerender with the change → 'Pending', Both pressed */ });
it('marks a clash', () => { /* change with clash → 'Clash' */ });
it('offers a retry when the files did not load', async () => { /* error view → 'Read the files again' calls retry */ });
it('shows no panel for a preview card', async () => { /* EditPane at a previewCards.json card → no 'Printings' heading */ });
```

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement the panel and its stories.**
  - Stories: Yen Sid ready, with one pending change and with a clash; loading; error.
  - Use tokens for every size and colour, and an `adm-*` class only if a hover or focus state is needed.
- [ ] **Step 4: Run the panel's tests and the studio's suites.** Expected: PASS. Check the stories render in Storybook (`pnpm storybook`).
- [ ] **Step 5: Commit.** `USER_APPROVED=1 git commit -m "feat(studio): set each printing's versions from Edit card's Printings panel (#68)"`

### Task 9: The Version changes tray

**Files:**
- Create: `src/tools/studio/components/VersionsTray.tsx`, `src/tools/studio/components/VersionsTray.stories.tsx`
- Modify: `src/tools/studio/StudioWorkspace.tsx`, to render `<VersionsTray>` below the mode panes, full width, in both modes
- Test: `src/tools/studio/components/__tests__/VersionsTray.test.tsx`

**Interfaces:**
- Consumes:
  - Task 5's `VersionBatchView`, `removalNote` and `hasClash`, and Task 1's `choiceLabel`;
  - `targetBranch`, `goLiveNote`, `isRejectedToken` and `ForgetTokenOffer`;
  - `Notice`, plus `CtaButton` and `LinkButton` from the bridge.
- Produces:
  ```ts
  export interface VersionsTrayProps { view: VersionBatchView; token: string; onForgetToken: () => void; }
  export function VersionsTray({view, token, onForgetToken}: VersionsTrayProps): JSX.Element | null;
  ```
- **When it shows.** It renders nothing when there are no changes, no `result`, no `error` and no publish in flight. Otherwise it's a `<section aria-label="Version changes">`:
  - **Heading:** `<h2 tabIndex={-1}>Version changes · {n}</h2>`, with a muted "Discard all" `LinkButton`.
  - **Rows:** a `<ul>`, one `<li>` per change:
    - text `` `${label}: ${choiceLabel(shownFrom)} → ${choiceLabel(to)}` ``;
    - its `removalNote` on the next line, when there is one;
    - a "Revert" `LinkButton` with `aria-label={`Revert ${label}`}`.
  - **A clash row** replaces Revert with:
    - `` `Changed on ${branch} since: now ${choiceLabel(shownNow)}.` ``, or "No longer in the data." when the printing is gone;
    - "Keep mine" (`aria-label={`Keep my change to ${label}`}`), which calls `view.keep(id)` and isn't offered when gone;
    - "Drop" (`aria-label={`Drop ${label}`}`), which calls `view.revert(id)`.
  - **Publish:** a `CtaButton` reading `` `Publish ${n} change${n === 1 ? '' : 's'} to ${targetBranch()}` ``, or "Publishing…". It's `aria-disabled` while publishing, empty or `hasClash`.
  - **Errors:** an error `Notice` showing `error`, plus `ForgetTokenOffer` when `isRejectedToken(error)`.
  - **Status:** an always-mounted `<p role="status">`. After a publish it reads `` `Published ${count} change${s}. ` `` with a "View commit" link to `result.commitUrl`, then `goLiveNote('They show in the binder once the app has deployed: on staging only, for now.')`.
- **Focus after Revert or Drop** goes to the next row's first button, else the previous row's, else the heading, as `PendingTray`'s `focusAfterRevert`. "Discard all" focuses the heading.
- **Two things don't change:**
  - The unsaved-changes guard stays as it is. The batch lives in the browser, so leaving the page loses nothing.
  - Forgetting the token, from the sidebar or the tray, never touches the batch.

- [ ] **Step 1: Write the failing tests**

```ts
it('is absent with nothing to show', () => { expect(render(<VersionsTray view={view([])} … />).container).toBeEmptyDOMElement(); });
it('lists the changes with their removals', () => {
  render(<VersionsTray view={view([NUMBER_59_TO_FOIL, NUMBER_223_TO_BOTH])} … />);
  expect(screen.getByRole('heading', {name: 'Version changes · 2'})).toBeInTheDocument();
  expect(screen.getByText('Yen Sid - Powerful Sorcerer #59: Both → Foil only')).toBeInTheDocument();
  expect(screen.getByText('Removes Normal. Copies counted in it will show under Foil.')).toBeInTheDocument();
  expect(screen.getByRole('button', {name: 'Publish 2 changes to master'})).not.toHaveAttribute('aria-disabled', 'true');
});
it('reverts a change and moves focus to the next row', async () => { /* … */ });
it('holds Publish while a clash is open, and keeps or drops it', async () => { /* aria-disabled; 'Keep my change to …' calls view.keep('946') */ });
it('says the publish landed, with the commit link', () => { /* result {commitUrl, count: 2} → 'Published 2 changes.' + link 'View commit' */ });
it('offers to forget a rejected token', () => { /* error 'GitHub 401 on …' → ForgetTokenOffer */ });
```

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement the tray, its stories and the workspace wiring.**
  - Stories: two changes, one with a removal; a clash; gone; published; error.
  - `StudioWorkspace` passes `useVersionBatch()`, the token and its Forget token handler.
- [ ] **Step 4: Run the tray's tests and the studio's suites.** Expected: PASS. Check the stories in Storybook.
- [ ] **Step 5: Commit.** `USER_APPROVED=1 git commit -m "feat(studio): collect version changes in a tray and publish them in one commit (#68)"`

### Task 10: Docs and the rehearsal

**Files:**
- Modify: `CLAUDE.md`, the Card studio paragraph in "The tools"
- Create: `.superpowers/sdd/issue-68/rehearsal.md`, the results (git-ignored)

- [ ] **Step 1: Update `CLAUDE.md`.** In the Card studio paragraph, say:
  - Edit card's Printings panel sets a released printing's versions (`finishes`), with Sets 1 to 8 from `/data/collection/` opening printings-only.
  - Changes collect in the studio-wide Version changes tray, kept in `localStorage` per target branch.
  - Publish writes one commit into every file that holds each printing: `allCards.json`, `collection/{set}.json`, `collection/promos.json` and the promo catalog, keeping each file's format.
  - A clash keeps the change until the owner keeps or drops it.

  Commit: `USER_APPROVED=1 git commit -m "docs: Card studio's Printings panel and Version changes tray (#68)"`
- [ ] **Step 2: Rehearse on a throwaway app branch.** The owner creates `rehearse-68` from `master`, or approves creating it through the API. Then set `VITE_ADMIN_TARGET_BRANCH=rehearse-68` in `.env.local` and run `pnpm dev`.
  1. **Stage across cards:** open Yen Sid (`?mode=edit&card=750`) and set #223 to Both; then open Mother Knows Best (`card=2035`) and set 1/C3 to Both and 13/C3 to Normal only.
  2. **Reload the page:** the tray still holds 3 changes.
  3. **Publish:** it makes one commit. Its diff changes only `finishes` lines, in `collection/4.json`, `promos.json`, the catalog and `allCards.json`'s 80017 and 80024 variants. Nothing else is touched.
  4. **Clash:** change 80017's `finishes` on the branch through the API, stage a change on 1/C3 in admin, and publish. The tray shows the clash. "Keep mine" re-bases it, and the next publish lands.
  5. **Clean up:** reset `.env.local`. The owner deletes `rehearse-68`.

  Record each step's result in `rehearsal.md`.
- [ ] **Step 3: Final whole-branch review,** then open the PR (`Closes #68`).
