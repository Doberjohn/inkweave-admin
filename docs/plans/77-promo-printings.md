# Promo printings in Edit card: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the owner add a promo printing to any released card from Edit card's Printings panel, and edit a promo printing's set, number, scan and scan language. Each add or edit is one commit that writes the catalog, runs the app's own promo merge over `allCards.json` and `collection/promos.json`, and commits the scan.

**Architecture:**
- **Pure core.** A new folder, `src/tools/studio/promos/`, holds five modules:
  - `promoCatalog.ts`: the catalog's types and rules;
  - `catalogEdits.ts`: an add or an edit, applied to the catalog;
  - `promoMerge.ts`: the app's merge, run over the branch's files;
  - `publishPrinting.ts`: the commit;
  - `printingForm.ts`: the form's rules.
- **One controller.** `usePrintingForm` sits in `StudioWorkspace` next to Edit card's controller, so a mode switch keeps the form and the unsaved-changes guard counts it.
- **Two views.** `PromoPrintingForm`, and in the Printings panel: Add a printing, Edit on promo rows, and the Core-copy note.
- **The app's own code where it exists:** `mergePromoPrintings`, `collectionPromos`, `byPrintingOrder` and `finishesById` from the app's `scripts/lib/*.mjs`, and `PROMO_SETS`, all through the bridge.

**Tech Stack:** React 19 (React Compiler), TypeScript (`allowJs`, for the bridged `.mjs`), Vitest and Testing Library (project `app`), Storybook, and the GitHub git data API through `src/github/githubCommit.ts`.

**Spec:** [`docs/promo-printings-design.md`](../promo-printings-design.md). Issue Doberjohn/inkweave-admin#77. The app part is Doberjohn/inkweave#904, which adds Promo Set 5.

## Before Task 1

- Commit the design and this plan on `feature/77-promo-printings`: `USER_APPROVED=1 git commit -m "docs: design and plan for promo printings in Edit card (#77)"`. The owner approves every commit and push.
- Only Task 11 needs Doberjohn/inkweave#904 merged. The other tasks run at the current pin, so their tests use codes the pinned `PROMO_SETS` knows, such as 9/P4. Task 11 brings P5.

## Global Constraints

**What gets written**
- Admin writes into the app only through `commitFiles`, to `targetBranch()` (`VITE_ADMIN_TARGET_BRANCH`, default `master`). Tests read `upstream/inkweave` files through `node:fs`, which is not an import. Nothing writes there.
- An add or an edit is exactly one commit. It contains:
  - the catalog;
  - `allCards.json` and `collection/promos.json`, each only when its text changed;
  - the scan, when one was given.
- `allCards.json` and `promos.json` are written only by the bridged merge, never by admin code that edits their entries.

**File formats** (byte for byte; the round-trip tests hold them):

| File | Format |
|---|---|
| `apps/web/public/data/allCards.json` | `JSON.stringify(x, null, 2) + '\n'` |
| `apps/web/public/data/collection/promos.json` | `JSON.stringify(x) + '\n'` |
| `scripts/data/promo-printings.json` | `JSON.stringify(x, null, 2)`, no trailing newline |
| `apps/web/public/card-images-raw/{id}.{ext}` | the scan's bytes, `ext` as `useImageUpload` accepts it (jpg, jpeg, png, webp) |

**The catalog's shapes**, as master holds them (checked 2026-10-22):
- **Entry keys,** in this order, each only when present: `id, rarity, number, promoGrouping, finish, artVariant, printedName, images, scanLanguage, promoSource, finishes`.
  - A new entry is `{id, rarity: 'Special', number, promoGrouping, scanLanguage?, finishes}`.
  - `scanLanguage` is left out for English.
  - `finishes` is always written: `['normal']`, `['foil']` or `['normal', 'foil']`.
- **Groups.** `fold` groups are `{baseId, fullName, setCode, number, variants}`, ordered by `baseId`. `noBaseCard` groups are `{fullName, lorcanaJsonBaseId, baseSetCode, baseNumber, variants}`, ordered by base set and number, with groups whose `baseNumber` is null passed over (Hades - Dark Usurper). A group's `variants` follow the bridged `byPrintingOrder`.
- **`provisionalIds`.** The next id is one above the highest key. A line reads `` `${code} ${fullName}` ``, where `code` is `` `${number}${artVariant ?? ''}/${promoGrouping}` ``. A rename replaces only the leading code, so tails like "(Championship (36 copies))" stay. A removed printing's line ends in " (removed)" and still counts.
- **`notes`.** A note is appended, never sorted: `{printing: code, card: fullName, note}`. A blank note adds nothing.
- **`stats`.** It is recounted from the entries in its stored key order:
  - `promoPrintings`;
  - `withLorcanaJsonId` (id < 80001) and `withProvisionalId` (id ≥ 80001);
  - `withOfficialArtUrl` (has `images`);
  - `foldIntoAllCards {printings, baseCards}` and `noBaseCardInAllCards {printings, cards}`;
  - `byPromoGrouping`, its codes in `localeCompare` order.

**Rules from the design**
- **Promo sets.** Only codes the bridged `PROMO_SETS` knows (`promoSetRank(code) !== -1`) can be chosen or published.
- **Taken codes.** A code is taken when another printing has the same `promoGrouping` and `number`, unless both have an `artVariant` and the two differ.
- **Scans.** Edit replaces a scan only for a printing whose catalog entry has no `images`.
- **The id.** An edit never changes it.
- **No removal.** Nothing removes a printing.
- **Base checks.** A publish refuses, writing nothing:
  - branch files that the merge would change as they are (out of step);
  - a taken code;
  - an unknown promo set;
  - an edited printing whose `promoGrouping`, `number`, `scanLanguage` or `images` presence changed since its form opened, or that is gone.
- **Core reprints.** A Sets 1 to 8 card that a Core card reprints (same `fullName`, Core set) gets no Add a printing. Its panel links to the Core copy.

**Copy** (exact strings live in the tasks): "Normal", never "standard". Versions read Both, Foil only and Normal only (`CHOICE_OPTIONS`).

**CLAUDE.md rules that bite here**
- **Imports.** Only `src/app-bridge.ts` imports `upstream/`. Import the engine (`LorcanaCard`, `PrintingFinishes`, `isCoreSet`) by name.
- **No memo hooks or `try … finally`.** No `useMemo` or `useCallback`, and no `try … finally` in a component or hook. `try … catch` is fine.
- **Buttons and styles.** Buttons are the bridge's `CtaButton` and `LinkButton`, or native `adm-*` buttons. Colours and sizes are tokens, and `COLORS.textDim` is never text.
- **Focus.** Focus moves only through `src/shell/focusHandoff.ts` (R-48).
- **Tests.** Tests restore every stub (`vi.unstubAllGlobals`, `vi.unstubAllEnvs`) and compare fetched JSON with `toEqual`. Studio tests stub `fetch` through `finishes/__tests__/repoHarness.ts` and `branchHarness.ts`, never `vi.mock('githubCommit')`.
- **CodeScene at 10.** Cyclomatic complexity 8 or less per function, at most 4 arguments (use an options object), and under 30% primitive arguments per module.

## Review Focus

These are the five inputs the spec implies that are most likely to bite. Each is pinned by a test in the task named.

1. **Two arts under one number** (24A/P2 and 24B/P2): editing 24A's language isn't refused as taken, and a new 24/P2 is. Task 2, `tells two arts under one number apart, but not a new printing from them`.
2. **A scan language the list doesn't name** ('zh' on 42/P2) survives an edit of its number. Task 3, `edits a printing's code and language in place, keeping its other keys`, and Task 8, `keeps a scan language the list doesn't name`.
3. **A scan that isn't the image its name says**: the form shows `useImageUpload`'s error, and Publish stays off. Task 8, `shows the scan's own error and holds Publish`.
4. **A publish that lands after the owner left the card**: its outcome never shows on the next card. Task 7, `drops a publish's outcome that lands after the card changed`.
5. **A Sets 1 to 8 group filed beside Hades's group** (null number): it goes in by set and number, passing over Hades. Task 3, `files a Sets 1 to 8 card's new group by set and number, passing over Hades`.

---

### Task 1: Bridge the app's promo sets and promo merge

**Files:**
- Modify: `tsconfig.app.json` (add `"allowJs": true` after `"noEmit": true`), `src/app-bridge.ts`
- Test: `src/tools/studio/promos/__tests__/promoBridge.test.ts`

**Interfaces:**
- Produces, in `app-bridge.ts`, each with a one-line comment in the bridge's style:
  ```ts
  // constants block: PROMO_SETS, type PromoSet (shared/constants)
  /** A card of allCards.json as the promo merge reads it. */
  export interface MergeCard { id: number; fullName: string; variants?: object[]; finishes?: readonly string[] }
  /** The catalog as the merge reads it: the groups of both sections. */
  export interface MergeCatalog {
    fold: ReadonlyArray<{baseId: number; fullName: string; variants: readonly object[]}>;
    noBaseCard?: ReadonlyArray<{lorcanaJsonBaseId: number | null; fullName: string; variants: readonly object[]}>;
  }
  /** What a merge changed, card by card. */
  export interface MergeReport {
    changes: ReadonlyArray<{card: MergeCard; added: readonly object[]; updated: readonly object[]; removed: readonly object[]}>;
    skipped: {printings: number; cards: number};
  }
  export const mergePromoPrintings: (cards: MergeCard[], catalog: MergeCatalog) => MergeReport;          // mutates `cards`
  export const collectionPromos: (catalog: MergeCatalog, kept?: ReadonlyMap<string, readonly string[]>) => object[];
  export const finishesById: (entries: readonly object[]) => Map<string, readonly string[]>;
  export const byPrintingOrder: (a: object, b: object) => number;
  ```
  The merge exports import `../upstream/inkweave/scripts/lib/promo-printings.mjs`, `fold-variants.mjs` and `finishes.mjs`, and assign each import to the typed const. `allowJs` lets TypeScript infer the `.mjs` side, and checks nothing in it, since `checkJs` stays off. That was probed on 2026-10-22: without `allowJs`, an `.mjs` import is TS7016.

- [ ] **Step 1: Write the failing test**

```ts
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const read = (path: string) => readFileSync(resolve('upstream/inkweave', path), 'utf8');

describe('the bridged promo merge', () => {
  it('leaves the pinned allCards.json as it is: the catalog is merged in already', () => {
    const all = JSON.parse(read(ALL_CARDS_PATH)) as {cards: MergeCard[]};
    const report = mergePromoPrintings(all.cards, JSON.parse(read(CATALOG_PATH)) as MergeCatalog);
    expect(report.changes.filter(({added, updated, removed}) => added.length + updated.length + removed.length > 0)).toEqual([]);
    expect(`${JSON.stringify(all, null, 2)}\n`).toBe(read(ALL_CARDS_PATH));
  });
  it('lists the pinned promos.json as it is', () => {
    const stored = JSON.parse(read(PROMOS_PATH)) as object[];
    const listed = collectionPromos(JSON.parse(read(CATALOG_PATH)) as MergeCatalog, finishesById(stored));
    expect(`${JSON.stringify(listed)}\n`).toBe(read(PROMOS_PATH));
  });
  it('orders promos after the other printings, by set and number', () => {
    const order = [{rarity: 'Special', promoGrouping: 'P2', number: 3}, {rarity: 'Iconic', number: 242}, {rarity: 'Special', promoGrouping: 'P1', number: 9}];
    expect([...order].sort(byPrintingOrder)).toEqual([order[1], order[2], order[0]]);
  });
  it('bridges the promo sets, oldest first', () => {
    expect(PROMO_SETS[0]).toEqual({code: 'P1', name: 'Promo Set 1'});
    expect(PROMO_SETS.some((set) => set.code === 'RPH')).toBe(true);
  });
});
```
`ALL_CARDS_PATH`, `PROMOS_PATH` and `CATALOG_PATH` come from `../../finishes/finishFiles`.

- [ ] **Step 2: Run it.** `pnpm vitest run --project app src/tools/studio/promos/__tests__/promoBridge.test.ts`. Expected: FAIL, because the bridge doesn't export them.
- [ ] **Step 3: Add `allowJs` and the bridge exports.**
- [ ] **Step 4: Run it again, then `pnpm typecheck` and `pnpm lint`.** Expected: PASS and clean.
- [ ] **Step 5: Commit.** `USER_APPROVED=1 git commit -m "feat(studio): bridge the app's promo sets and promo merge (#77)"`

### Task 2: The catalog's types and rules

**Files:**
- Create: `src/tools/studio/promos/promoCatalog.ts`, `src/tools/studio/promos/__tests__/promoFixtures.ts`
- Test: `src/tools/studio/promos/__tests__/promoCatalog.test.ts`

**Interfaces:**
- Consumes: `PrintingFinishes` (engine), `promoSetRank` (bridge).
- Produces:
  ```ts
  export interface CatalogPrinting { id: number; rarity: 'Special'; number?: number; promoGrouping: string; finish?: string; artVariant?: string;
    printedName?: string; images?: {full?: string; thumbnail?: string}; scanLanguage?: string; promoSource?: string; finishes?: PrintingFinishes }
  export interface FoldGroup { baseId: number; fullName: string; setCode: string; number: number; variants: CatalogPrinting[] }
  export interface WaitingGroup { fullName: string; lorcanaJsonBaseId: number | null; baseSetCode: string; baseNumber: number | null; variants: CatalogPrinting[] }
  export interface CatalogNote { printing: string; card: string; note: string }
  export interface CatalogStats { promoPrintings: number; withLorcanaJsonId: number; withProvisionalId: number; withOfficialArtUrl: number;
    foldIntoAllCards: {printings: number; baseCards: number}; noBaseCardInAllCards: {printings: number; cards: number}; byPromoGrouping: Record<string, number> }
  export interface PromoCatalog { about: string; stats: CatalogStats; fold: FoldGroup[]; noBaseCard: WaitingGroup[]; provisionalIds: Record<string, string>; notes: CatalogNote[] }
  export type CodeParts = Pick<CatalogPrinting, 'promoGrouping' | 'number' | 'artVariant'>;
  export interface FoundPrinting { printing: CatalogPrinting; group: FoldGroup | WaitingGroup }
  /** The card a promo reprints, as the catalog files its group: a Core card in fold, any other in noBaseCard. */
  export interface BaseCard { id: number; fullName: string; setCode: string; number: number; core: boolean }
  export const PROVISIONAL_ID_BASE = 80001;
  export function parseCatalog(text: string): PromoCatalog;
  export function serializeCatalog(catalog: PromoCatalog): string;
  export function printingCode(parts: CodeParts): string;                          // '1/P5', '24A/P2', '?/C1'
  export function findPrinting(catalog: PromoCatalog, id: number): FoundPrinting | null;
  export function takenBy(opts: {catalog: PromoCatalog; code: CodeParts; exceptId?: number}): FoundPrinting | null;
  export function isKnownPromoSet(code: string): boolean;                           // promoSetRank(code) !== -1
  export function nextProvisionalId(catalog: PromoCatalog): number;
  export function recountStats(catalog: PromoCatalog): CatalogStats;
  ```
- **Fixtures** (`promoFixtures.ts`): `FIXTURE_CATALOG: PromoCatalog`, built from the pinned catalog.
  - **`about`** is `'Fixture.'`.
  - **`fold`** holds Mother Knows Best's group (`baseId` 2035: 80017 1/C3 normal, 80024 13/C3 foil).
  - **`noBaseCard`** holds four groups, copied verbatim and in the pinned order: Mickey Mouse - Brave Little Tailor (115), Hades - Dark Usurper (null), Snow White - Unexpected Houseguest (240: 80043 41/P1 'ja', 80049 42/P2 'zh') and Hiro Hamada - Armor Designer (1529: 1661 24A/P2, 1662 24B/P2).
  - **`provisionalIds`** holds the pinned lines for those groups' provisional ids: 80003, 80017, 80023, 80024, 80030, 80031, 80032, 80033, 80043 and 80049.
  - **`notes`** is `[]`.
  - **`stats`** is written out as a literal that `recountStats` must reproduce: `{promoPrintings: 14, withLorcanaJsonId: 4, withProvisionalId: 10, withOfficialArtUrl: 4, foldIntoAllCards: {printings: 2, baseCards: 1}, noBaseCardInAllCards: {printings: 12, cards: 4}, byPromoGrouping: {C1: 1, C3: 7, D23: 1, P1: 2, P2: 3}}`.

  Also export `PRINCE: BaseCard`, the card of Task 3 written out here: `{id: 2047, fullName: 'Mickey Mouse - Brave Little Prince', setCode: '9', number: 111, core: true}`.

- [ ] **Step 1: Write the failing tests**

```ts
it('round-trips the pinned catalog byte for byte', () => {
  const text = readFileSync(resolve('upstream/inkweave', CATALOG_PATH), 'utf8');
  expect(serializeCatalog(parseCatalog(text))).toBe(text);
});
it('names a printing by the code printed on it', () => {
  expect(printingCode({number: 1, promoGrouping: 'P5'})).toBe('1/P5');
  expect(printingCode({number: 24, artVariant: 'A', promoGrouping: 'P2'})).toBe('24A/P2');
  expect(printingCode({promoGrouping: 'C1'})).toBe('?/C1');
});
it('finds a printing and its group by id', () => {
  expect(findPrinting(FIXTURE_CATALOG, 80024)?.group.fullName).toBe('Mother Knows Best');
  expect(findPrinting(FIXTURE_CATALOG, 1662)?.printing.artVariant).toBe('B');
  expect(findPrinting(FIXTURE_CATALOG, 99999)).toBeNull();
});
it('finds who holds a promo set and number', () => {
  expect(takenBy({catalog: FIXTURE_CATALOG, code: {promoGrouping: 'C3', number: 13}})?.printing.id).toBe(80024);
  expect(takenBy({catalog: FIXTURE_CATALOG, code: {promoGrouping: 'C3', number: 13}, exceptId: 80024})).toBeNull();
  expect(takenBy({catalog: FIXTURE_CATALOG, code: {promoGrouping: 'P4', number: 9}})).toBeNull();
});
it('tells two arts under one number apart, but not a new printing from them', () => {
  expect(takenBy({catalog: FIXTURE_CATALOG, code: {promoGrouping: 'P2', number: 24, artVariant: 'A'}, exceptId: 1661})).toBeNull();
  expect(takenBy({catalog: FIXTURE_CATALOG, code: {promoGrouping: 'P2', number: 24}})?.printing.id).toBe(1661);
});
it('knows the promo sets the app knows', () => {
  expect(isKnownPromoSet('P4')).toBe(true);
  expect(isKnownPromoSet('CC2')).toBe(true);
  expect(isKnownPromoSet('Q9')).toBe(false);
});
it('issues the id above the highest provisional one, a removed one included', () => {
  expect(nextProvisionalId(FIXTURE_CATALOG)).toBe(80050);
  const removed = {...FIXTURE_CATALOG.provisionalIds, '80056': '1/P5 Mickey Mouse - Brave Little Prince (removed)'};
  expect(nextProvisionalId({...FIXTURE_CATALOG, provisionalIds: removed})).toBe(80057);
});
it('recounts the stats as the pinned catalog holds them, key order included', () => {
  const pinned = parseCatalog(readFileSync(resolve('upstream/inkweave', CATALOG_PATH), 'utf8'));
  expect(JSON.stringify(recountStats(pinned))).toBe(JSON.stringify(pinned.stats));
  expect(recountStats(FIXTURE_CATALOG)).toEqual(FIXTURE_CATALOG.stats);
});
```

- [ ] **Step 2: Run them.** `pnpm vitest run --project app src/tools/studio/promos/__tests__/promoCatalog.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `promoCatalog.ts`.** `recountStats` builds the object literal in the stored key order, and sorts the `byPromoGrouping` keys with `localeCompare`.
- [ ] **Step 4: Run them again.** Expected: PASS.
- [ ] **Step 5: Commit.** `USER_APPROVED=1 git commit -m "feat(studio): read the promo catalog and its rules (#77)"`

### Task 3: An add or an edit, applied to the catalog

**Files:**
- Create: `src/tools/studio/promos/catalogEdits.ts`
- Test: `src/tools/studio/promos/__tests__/catalogEdits.test.ts`

**Interfaces:**
- Consumes: Task 2, including `BaseCard`; `byPrintingOrder` (bridge).
- Produces:
  ```ts
  export interface NewPrinting { promoGrouping: string; number: number; finishes: PrintingFinishes; scanLanguage: string | null }
  export interface PrintingEdit { promoGrouping: string; number: number; scanLanguage: string | null }
  export function withNewPrinting(opts: {catalog: PromoCatalog; card: BaseCard; printing: NewPrinting; note: string | null}): {catalog: PromoCatalog; id: number};
  export function withEditedPrinting(opts: {catalog: PromoCatalog; id: number; edit: PrintingEdit; note: string | null}): PromoCatalog;
  ```
- **How each works.** Both start from `structuredClone(catalog)`, so the input stays as it was.
- **Rebuilding an entry.** An edited entry is rebuilt in the global key order. An entry that is already in that order stays byte for byte.
- **The new or edited printing:**
  - the group's `variants` are re-sorted with `byPrintingOrder` (a stable sort);
  - the `provisionalIds` line is added or renamed;
  - a note goes in under the printing's (new) code;
  - `stats` is recounted.
- **Missing id.** `withEditedPrinting` throws `Error(`${id} isn't in the catalog`)` for an id it can't find.

- [ ] **Step 1: Write the failing tests**

```ts
const NEW_9_P4: NewPrinting = {promoGrouping: 'P4', number: 9, finishes: ['foil'], scanLanguage: null};
const snowWhite = (catalog: PromoCatalog) => catalog.noBaseCard.find((g) => g.fullName === 'Snow White - Unexpected Houseguest');

it('adds a printing of a Core card in a new fold group, in baseId order', () => {
  const {catalog, id} = withNewPrinting({catalog: FIXTURE_CATALOG, card: PRINCE, printing: NEW_9_P4, note: null});
  expect(id).toBe(80050);
  expect(catalog.fold.map((g) => g.baseId)).toEqual([2035, 2047]);
  expect(catalog.fold[1]).toEqual({baseId: 2047, fullName: 'Mickey Mouse - Brave Little Prince', setCode: '9', number: 111,
    variants: [{id: 80050, rarity: 'Special', number: 9, promoGrouping: 'P4', finishes: ['foil']}]});
  expect(Object.keys(catalog.fold[1].variants[0])).toEqual(['id', 'rarity', 'number', 'promoGrouping', 'finishes']);
  expect(catalog.provisionalIds['80050']).toBe('9/P4 Mickey Mouse - Brave Little Prince');
  expect(catalog.stats.foldIntoAllCards).toEqual({printings: 3, baseCards: 2});
  expect(FIXTURE_CATALOG.fold).toHaveLength(1);
});
it("adds to the card's own group in printing order, its language before its versions", () => {
  const card: BaseCard = {id: 2035, fullName: 'Mother Knows Best', setCode: '9', number: 99, core: true};
  const {catalog} = withNewPrinting({catalog: FIXTURE_CATALOG, card, printing: {promoGrouping: 'C3', number: 2, finishes: ['normal'], scanLanguage: 'ja'}, note: null});
  expect(catalog.fold[0].variants.map(printingCode)).toEqual(['1/C3', '2/C3', '13/C3']);
  expect(Object.keys(catalog.fold[0].variants[1])).toEqual(['id', 'rarity', 'number', 'promoGrouping', 'scanLanguage', 'finishes']);
});
it("files a Sets 1 to 8 card's new group by set and number, passing over Hades", () => {
  const card: BaseCard = {id: 9001, fullName: 'Test Card', setCode: '2', number: 30, core: false};
  const {catalog} = withNewPrinting({catalog: FIXTURE_CATALOG, card, printing: NEW_9_P4, note: null});
  expect(catalog.noBaseCard.map((g) => g.fullName)).toEqual(['Mickey Mouse - Brave Little Tailor', 'Hades - Dark Usurper',
    'Snow White - Unexpected Houseguest', 'Test Card', 'Hiro Hamada - Armor Designer']);
  expect(Object.keys(catalog.noBaseCard[3])).toEqual(['fullName', 'lorcanaJsonBaseId', 'baseSetCode', 'baseNumber', 'variants']);
  expect(catalog.stats.noBaseCardInAllCards.cards).toBe(FIXTURE_CATALOG.stats.noBaseCardInAllCards.cards + 1);
});
it("appends a trimmed note under the printing's code, and none for a blank one", () => {
  const {catalog} = withNewPrinting({catalog: FIXTURE_CATALOG, card: PRINCE, printing: NEW_9_P4, note: '  Foil (owner, 22 Oct 2026, with a scan).  '});
  expect(catalog.notes).toEqual([{printing: '9/P4', card: 'Mickey Mouse - Brave Little Prince', note: 'Foil (owner, 22 Oct 2026, with a scan).'}]);
  expect(withNewPrinting({catalog: FIXTURE_CATALOG, card: PRINCE, printing: NEW_9_P4, note: '   '}).catalog.notes).toEqual([]);
});
it("edits a printing's code and language in place, keeping its other keys", () => {
  const edited = withEditedPrinting({catalog: FIXTURE_CATALOG, id: 80049, edit: {promoGrouping: 'P2', number: 44, scanLanguage: 'zh'}, note: null});
  expect(snowWhite(edited)?.variants[1]).toEqual({id: 80049, rarity: 'Special', number: 44, promoGrouping: 'P2', scanLanguage: 'zh', finishes: ['foil']});
  expect(edited.provisionalIds['80049']).toBe('44/P2 Snow White - Unexpected Houseguest');
});
it('drops an English scan language and re-sorts a printing moved to another set', () => {
  const edited = withEditedPrinting({catalog: FIXTURE_CATALOG, id: 80043, edit: {promoGrouping: 'P3', number: 41, scanLanguage: null}, note: null});
  expect(snowWhite(edited)?.variants.map(printingCode)).toEqual(['42/P2', '41/P3']);
  expect(snowWhite(edited)?.variants[1]).not.toHaveProperty('scanLanguage');
  expect(edited.stats.byPromoGrouping.P1).toBe(FIXTURE_CATALOG.stats.byPromoGrouping.P1 - 1);
});
it("keeps a provisional line's tail when it renames it, and adds none for a LorcanaJSON id", () => {
  const hades = withEditedPrinting({catalog: FIXTURE_CATALOG, id: 80032, edit: {promoGrouping: 'C3', number: 30, scanLanguage: null}, note: null});
  expect(hades.provisionalIds['80032']).toBe('30/C3 (Championship (36 copies)) Hades - Dark Usurper');
  const hiro = withEditedPrinting({catalog: FIXTURE_CATALOG, id: 1661, edit: {promoGrouping: 'P2', number: 24, scanLanguage: 'ja'}, note: null});
  expect(hiro.provisionalIds).toEqual(FIXTURE_CATALOG.provisionalIds);
});
```

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement `catalogEdits.ts`.** Keep each function at complexity 8 or less: find or insert the group, build the entry, rename the line, append the note.
- [ ] **Step 4: Run them again.** Expected: PASS.
- [ ] **Step 5: Commit.** `USER_APPROVED=1 git commit -m "feat(studio): add or edit a promo printing in the catalog (#77)"`

### Task 4: The app's merge over the branch's files

**Files:**
- Create: `src/tools/studio/promos/promoMerge.ts`
- Test: `src/tools/studio/promos/__tests__/promoMerge.test.ts`

**Interfaces:**
- Consumes: Task 1's merge exports, Task 2's `PromoCatalog`.
- Produces:
  ```ts
  /** The texts of the two files the merge writes. */
  export interface MergedTexts { allCards: string; promos: string }
  /** What `pnpm merge-promos --write` writes from `catalog` over `files`, in each file's format. */
  export function mergeOver(opts: {catalog: PromoCatalog; files: MergedTexts}): MergedTexts;
  /**
   * What the merge over the files as they are would change: the full name of each card whose promo
   * entries change, then 'collection/promos.json' when that file's text changes. [] when they're in step.
   */
  export function outOfStep(opts: {catalog: PromoCatalog; files: MergedTexts}): string[];
  ```
  `mergeOver` parses `allCards`, runs `mergePromoPrintings(all.cards, catalog)`, and writes `` `${JSON.stringify(all, null, 2)}\n` ``. It lists `promos` with `collectionPromos(catalog, finishesById(JSON.parse(files.promos)))` and writes `` `${JSON.stringify(list)}\n` ``.

- [ ] **Step 1: Write the failing tests**

```ts
const read = (path: string) => readFileSync(resolve('upstream/inkweave', path), 'utf8');
const pinned = () => ({catalog: parseCatalog(read(CATALOG_PATH)), files: {allCards: read(ALL_CARDS_PATH), promos: read(PROMOS_PATH)}});

it("finds the pinned app's files in step", () => {
  const base = pinned();
  expect(outOfStep(base)).toEqual([]);
  expect(mergeOver(base)).toEqual(base.files);
});
it('adds 1/P5 to Mickey Mouse - Brave Little Prince over the pinned files, and nothing else', () => {
  const base = pinned();
  const {catalog, id} = withNewPrinting({catalog: base.catalog, card: PRINCE, printing: {promoGrouping: 'P5', number: 1, finishes: ['foil'], scanLanguage: null}, note: null});
  const out = mergeOver({catalog, files: base.files});
  const after = JSON.parse(out.allCards) as {cards: Array<{id: number; variants?: object[]}>};
  const prince = after.cards.find((card) => card.id === 2047);
  expect(prince?.variants?.at(-1)).toEqual({id, rarity: 'Special', number: 1, promoGrouping: 'P5', finishes: ['foil']});
  prince?.variants?.pop();
  expect(after).toEqual(JSON.parse(base.files.allCards));
  const promos = JSON.parse(out.promos) as Array<{id: number}>;
  expect(promos.filter((promo) => promo.id === id)).toEqual([{id, rarity: 'Special', number: 1, promoGrouping: 'P5',
    fullName: 'Mickey Mouse - Brave Little Prince', baseId: 2047, finishes: ['foil']}]);
  expect(promos.filter((promo) => promo.id !== id)).toEqual(JSON.parse(base.files.promos));
});
it('names what a merge over out-of-step files would change', () => {
  const base = pinned();
  const catalog = structuredClone(base.catalog);
  catalog.fold.find((group) => group.fullName === 'Mother Knows Best')?.variants.pop();
  expect(outOfStep({catalog, files: base.files})).toEqual(['Mother Knows Best', 'collection/promos.json']);
});
```

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement `promoMerge.ts`.**
- [ ] **Step 4: Run them again.** Expected: PASS. Together, these tests take a few seconds: each one parses the pinned 2 MB `allCards.json`.
- [ ] **Step 5: Commit.** `USER_APPROVED=1 git commit -m "feat(studio): run the app's promo merge over the branch's files (#77)"`

### Task 5: Publishing an add or an edit

**Files:**
- Create: `src/tools/studio/promos/publishPrinting.ts`
- Modify: `src/tools/studio/finishes/__tests__/repoHarness.ts`: add `base64Sent: () => Record<string, string>` to `RepoStub`, each path's blob content as sent.
- Test: `src/tools/studio/promos/__tests__/publishPrinting.test.ts`. Add `FIXTURE_FILES` to `promoFixtures.ts`.

**Interfaces:**
- Consumes: Tasks 2 to 4, and `commitFiles`, `readRepoFile`, `targetBranch` and `utf8ToBase64` from `githubCommit`, plus `CATALOG_PATH`, `ALL_CARDS_PATH` and `PROMOS_PATH`.
- Produces:
  ```ts
  export interface ScanFile { ext: string; base64: string }
  /** What an edit checks the branch's entry against: the fields its form edits, and whether its art is Ravensburger's. */
  export interface PrintingFacts { promoGrouping: string; number: number | null; scanLanguage: string | null; officialArt: boolean }
  export function factsOf(printing: CatalogPrinting): PrintingFacts;
  export type PrintingChange =
    | {kind: 'add'; card: BaseCard; printing: NewPrinting; note: string | null; scan: ScanFile}
    | {kind: 'edit'; card: BaseCard; id: number; from: PrintingFacts; edit: PrintingEdit; note: string | null; scan: ScanFile | null};
  export type RefusalKind = 'outOfStep' | 'taken' | 'unknownSet' | 'changed' | 'gone';
  export class PrintingRefusal extends Error {
    name = 'PrintingRefusal';
    readonly kind: RefusalKind;
    /** For 'changed': the printing as the branch holds it now, for the form to show. */
    readonly now: CatalogPrinting | null;
  }
  export interface PrintingPublished { commitUrl: string; id: number; code: string }
  export const RAW_SCAN_DIR = 'apps/web/public/card-images-raw';
  export function printingCommitMessage(opts: {change: PrintingChange; code: string}): string;
  export function publishPrinting(opts: {token: string; change: PrintingChange}): Promise<PrintingPublished>;
  ```
- **Messages** (`branch` is `targetBranch()`, and `code` the printing's code after the change):

  | Case | Text |
  |---|---|
  | add commit | `chore(collection): add ${code} ${fullName} from Card studio` |
  | edit commit | `chore(collection): edit ${oldCode} ${fullName} from Card studio`, or `edit ${oldCode} to ${code} …` when the code changed |
  | outOfStep | `The catalog and the card files are out of step on ${branch}: the merge would change ${names.join(', ')}. Run pnpm merge-promos --write in the app, then publish again.` |
  | taken | `${code} is taken on ${branch}: ${holder.group.fullName} has it.` |
  | unknownSet | `${promoGrouping} isn't one of the app's promo sets. Add it to PROMO_SETS in the app first.` |
  | changed | `Someone changed ${oldCode} on ${branch} after you opened it. The form now shows the branch's values: make your change again.` |
  | gone | `${oldCode} is no longer on ${branch}.` |

- **The flow, inside `commitFiles`' base callback:**
  1. Read the three files at the base.
  2. Run `outOfStep`.
  3. For an edit, find the printing: a missing one is `gone`, and one whose facts differ from `from` is `changed`.
  4. Check the promo set (`unknownSet`), then the code (`taken`; an edit passes its own id as `exceptId`).
  5. Apply `withNewPrinting` or `withEditedPrinting`, and run `mergeOver`.
  6. Send the catalog, each merged file whose text changed, and the scan at `${RAW_SCAN_DIR}/${id}.${ext}`.

  A failure of `commitFiles` passes through as it is. Its race message already ends "Publish again.".

- [ ] **Step 1: Write the failing tests** with `stubRepo({files: FIXTURE_FILES})`. Add these to `promoFixtures.ts`:
  - **`filesFor(catalog)`** gives a branch whose files are in step with `catalog`. It returns `{[CATALOG_PATH]: serializeCatalog(catalog), [ALL_CARDS_PATH]: …, [PROMOS_PATH]: …}`, where the last two come from `mergeOver({catalog, files: {allCards: allCardsText([MOTHER_KNOWS_BEST_ENTRY, PRINCE_ENTRY]), promos: '[]\n'}})`.
  - **`FIXTURE_FILES`** is `filesFor(FIXTURE_CATALOG)`.
  - **`PRINCE_ENTRY`** is trimmed from the pinned `allCards.json`: id, name, version, fullName, cost, color, inkwell, type, setCode, number, rarity, and `variants: [{id: 2178, rarity: 'Iconic', number: 242}]`.

  A test whose branch has moved since the form opened builds its files with `filesFor`, so they stay in step. Otherwise the out-of-step check would refuse first.

```ts
const SCAN: ScanFile = {ext: 'webp', base64: 'UklGRgAAAABXRUJQ'};
const ADD_9_P4: PrintingChange = {kind: 'add', card: PRINCE, printing: {promoGrouping: 'P4', number: 9, finishes: ['foil'], scanLanguage: null}, note: null, scan: SCAN};
const EDIT_80024 = (edit: Partial<PrintingEdit>, from = factsOf(findPrinting(FIXTURE_CATALOG, 80024)!.printing)): PrintingChange =>
  ({kind: 'edit', card: MKB_BASE, id: 80024, from, edit: {promoGrouping: 'C3', number: 13, scanLanguage: null, ...edit}, note: null, scan: null});

it('adds a printing in one commit: the catalog, both card files and the scan', async () => {
  const repo = stubRepo({files: FIXTURE_FILES});
  await expect(publishPrinting({token: 't', change: ADD_9_P4})).resolves.toEqual({commitUrl: COMMIT_URL, id: 80050, code: '9/P4'});
  expect(Object.keys(repo.filesSent()).sort()).toEqual([ALL_CARDS_PATH, PROMOS_PATH, `${RAW_SCAN_DIR}/80050.webp`, CATALOG_PATH].sort());
  expect(repo.base64Sent()[`${RAW_SCAN_DIR}/80050.webp`]).toBe(SCAN.base64);
  expect(repo.commitMessage()).toBe('chore(collection): add 9/P4 Mickey Mouse - Brave Little Prince from Card studio');
  expect(outOfStep({catalog: parseCatalog(repo.filesSent()[CATALOG_PATH]), files: {allCards: repo.filesSent()[ALL_CARDS_PATH], promos: repo.filesSent()[PROMOS_PATH]}})).toEqual([]);
});
it('commits only the catalog for an edit that adds a note', async () => {
  const repo = stubRepo({files: FIXTURE_FILES});
  await publishPrinting({token: 't', change: {...EDIT_80024({}), note: 'Foil twin of 1/C3.'}});
  expect(Object.keys(repo.filesSent())).toEqual([CATALOG_PATH]);
  expect(repo.commitMessage()).toBe('chore(collection): edit 13/C3 Mother Knows Best from Card studio');
});
it('names a renumbering in its commit', async () => {
  const repo = stubRepo({files: FIXTURE_FILES});
  await publishPrinting({token: 't', change: EDIT_80024({number: 14})});
  expect(repo.commitMessage()).toBe('chore(collection): edit 13/C3 to 14/C3 Mother Knows Best from Card studio');
});
it.each([
  ['taken', {...ADD_9_P4, printing: {...ADD_9_P4.printing, promoGrouping: 'C3', number: 13}}, '13/C3 is taken on master: Mother Knows Best has it.'],
  ['unknownSet', {...ADD_9_P4, printing: {...ADD_9_P4.printing, promoGrouping: 'Q9'}}, "Q9 isn't one of the app's promo sets. Add it to PROMO_SETS in the app first."],
  ['changed', EDIT_80024({number: 14}, {promoGrouping: 'C3', number: 12, scanLanguage: null, officialArt: false}),
    "Someone changed 12/C3 on master after you opened it. The form now shows the branch's values: make your change again."],
  ['gone', {...EDIT_80024({}), id: 80099}, '13/C3 is no longer on master.'],
])('refuses %s at the base and writes nothing', async (kind, change, message) => {
  const repo = stubRepo({files: FIXTURE_FILES});
  await expect(publishPrinting({token: 't', change: change as PrintingChange})).rejects.toMatchObject({name: 'PrintingRefusal', kind, message});
  expect(repo.writes()).toEqual([]);
});
it("hands a 'changed' refusal the branch's entry", async () => {
  stubRepo({files: FIXTURE_FILES});
  const refusal = await publishPrinting({token: 't', change: EDIT_80024({}, {promoGrouping: 'C3', number: 12, scanLanguage: null, officialArt: false})}).catch((e: unknown) => e);
  expect((refusal as PrintingRefusal).now?.id).toBe(80024);
});
it('refuses out-of-step files, naming what the merge would change', async () => {
  const repo = stubRepo({files: {...FIXTURE_FILES, [PROMOS_PATH]: '[]\n'}});
  await expect(publishPrinting({token: 't', change: ADD_9_P4})).rejects.toMatchObject({kind: 'outOfStep',
    message: 'The catalog and the card files are out of step on master: the merge would change collection/promos.json. Run pnpm merge-promos --write in the app, then publish again.'});
  expect(repo.writes()).toEqual([]);
});
it('says to publish again when the branch moved', async () => {
  stubRepo({files: FIXTURE_FILES, update: notAFastForward});
  await expect(publishPrinting({token: 't', change: ADD_9_P4})).rejects.toThrow('master changed while publishing, so nothing was published. Publish again.');
});
```
`MKB_BASE` is `{id: 2035, fullName: 'Mother Knows Best', setCode: '9', number: 99, core: true}`. The "gone" row edits id 80099 with `from` taken from 80024, so its `oldCode` reads 13/C3.

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement `publishPrinting.ts` and `base64Sent`.**
- [ ] **Step 4: Run them again.** Expected: PASS.
- [ ] **Step 5: Commit.** `USER_APPROVED=1 git commit -m "feat(studio): publish an added or edited promo printing in one commit (#77)"`

### Task 6: The form's rules

**Files:**
- Create: `src/tools/studio/promos/printingForm.ts`
- Test: `src/tools/studio/promos/__tests__/printingForm.test.ts`

**Interfaces:**
- Consumes: Tasks 2, 3 and 5, `FinishChoice` and `finishesOfChoice` (`finishes/finishValues`), `PROMO_SETS` and `PromoSet` (bridge), `isCoreSet` and `LorcanaCard` (engine), and `stripDataUrl` (`githubCommit`).
- Produces:
  ```ts
  export interface PrintingFormValues { promoGrouping: string; number: string; versions: FinishChoice | null; scanLanguage: string; note: string }
  export const EMPTY_PRINTING_FORM: PrintingFormValues; // {promoGrouping: '', number: '', versions: null, scanLanguage: 'en', note: ''}
  /** The scan the form holds, as useImageUpload has it. */
  export interface ScanState { name: string | null; dataUrl: string | null; error: string | null }
  export function editValuesOf(printing: CatalogPrinting): PrintingFormValues; // versions null, scanLanguage ?? 'en', note ''
  export interface PromoSetOption { code: string; label: string }
  export function promoSetOptions(sets: readonly PromoSet[]): PromoSetOption[];
  export function parseNumber(typed: string): number | null;
  export function formCode(values: Pick<PrintingFormValues, 'promoGrouping' | 'number'>): string | null;
  export function missingLine(opts: {kind: 'add' | 'edit'; values: PrintingFormValues; initial: PrintingFormValues; scan: ScanState; taken: FoundPrinting | null}): string | null;
  export function publishLabel(opts: {kind: 'add' | 'edit'; values: PrintingFormValues; initialCode: string | null; publishing: boolean}): string;
  export function outcomeNote(opts: {scanSent: boolean; branch: string}): string;
  export function baseCardOf(card: LorcanaCard): BaseCard;
  export function coreCopyOf(opts: {card: LorcanaCard; cards: readonly LorcanaCard[]}): {id: string; name: string} | null;
  export function changeOf(opts: {kind: 'add' | 'edit'; card: BaseCard; printing: CatalogPrinting | null; values: PrintingFormValues; scan: ScanState}): PrintingChange;
  ```
- **Promo set options.** They run newest first: `PROMO_SETS` reversed. A set with editions gives one option per edition, newest first, with label `` `${edition.code} · ${set.name}: ${edition.name}` ``. Any other set's label is `` `${code} · ${name}` ``.
- **Numbers.** `parseNumber` accepts `/^\s*\d+\s*$/` with a value of at least 1.
- **The missing line.** It reports the first gap, in this order:

  | Form | Gap | Line |
  |---|---|---|
  | add | no promo set | 'Choose a promo set to publish.' |
  | add | no number, or one `parseNumber` refuses | 'Enter a number from 1 up to publish.' |
  | add | no versions | 'Choose its versions to publish.' |
  | add | no scan (`dataUrl` null) | 'Add its scan to publish.' (a scan error shows itself instead, and this returns null) |
  | edit | nothing changed (values equal `initial`, no scan chosen) | 'Change something to save.' |
  | edit | a number `parseNumber` refuses | 'Enter a number from 1 up to save.' |
  | either | a taken code | `` `${code} is taken: ${taken.group.fullName} has it.` `` |

- **The publish button.** `publishLabel` reads 'Publishing…' while publishing. Otherwise an add reads 'Publish 1/P5', or 'Publish' until there is a code. An edit reads 'Save 1/P5', or 'Save as 2/P5' when the code changed.
- **The outcome note.**
  - A scan on master: 'Its art shows on inkweave.ink once the app has converted the scan and deployed.'
  - A scan elsewhere: `` `The scan converts to art on master only, so on ${branch} the printing has no art yet.` ``
  - No scan: 'It shows on inkweave.ink once the app has deployed.'
- **The Core copy.** `coreCopyOf` returns null unless the card's set isn't Core and some card of a Core set has its `fullName`. It then names the first such card: `` `${fullName} (Set ${setCode} #${setNumber})` ``.
- **The change.**
  - The scan's `ext` is the file name's extension, lowercased.
  - Its `base64` is `stripDataUrl(dataUrl)`.
  - A note that is blank after trimming becomes null.
  - An English `scanLanguage` (`'en'`) becomes null.

- [ ] **Step 1: Write the failing tests**

```ts
const NO_SCAN: ScanState = {name: null, dataUrl: null, error: null};
const SCAN: ScanState = {name: 'mickey-1-p5.webp', dataUrl: 'data:image/webp;base64,UklGRgAAAABXRUJQ', error: null};
const add = (values: Partial<PrintingFormValues>, scan = SCAN) =>
  missingLine({kind: 'add', values: {...EMPTY_PRINTING_FORM, ...values}, initial: EMPTY_PRINTING_FORM, scan, taken: null});

it('offers the promo sets newest first, an edition by its own code', () => {
  const options = promoSetOptions(PROMO_SETS);
  expect(options.slice(0, 3)).toEqual([{code: 'RPH', label: 'RPH · RPH Promo'},
    {code: 'CC2', label: "CC2 · Curator's Collection: Beauty and the Beast Edition"}, {code: 'CC1', label: "CC1 · Curator's Collection: Heroines Edition"}]);
  expect(options.at(-1)).toEqual({code: 'P1', label: 'P1 · Promo Set 1'});
});
it('reads a number as a whole number from 1 up', () => {
  expect([parseNumber('1'), parseNumber(' 07 '), parseNumber('0'), parseNumber('1.5'), parseNumber(''), parseNumber('2a')]).toEqual([1, 7, null, null, null, null]);
});
it('says what an add still needs, one thing at a time', () => {
  expect(add({})).toBe('Choose a promo set to publish.');
  expect(add({promoGrouping: 'P4'})).toBe('Enter a number from 1 up to publish.');
  expect(add({promoGrouping: 'P4', number: '9'})).toBe('Choose its versions to publish.');
  expect(add({promoGrouping: 'P4', number: '9', versions: 'foil'}, NO_SCAN)).toBe('Add its scan to publish.');
  expect(add({promoGrouping: 'P4', number: '9', versions: 'foil'})).toBeNull();
});
it('says whose a taken code is, and asks an edit for a change', () => {
  const values = {...EMPTY_PRINTING_FORM, promoGrouping: 'C3', number: '13', versions: 'foil' as const};
  expect(missingLine({kind: 'add', values, initial: EMPTY_PRINTING_FORM, scan: SCAN, taken: findPrinting(FIXTURE_CATALOG, 80024)})).toBe('13/C3 is taken: Mother Knows Best has it.');
  const initial = editValuesOf(findPrinting(FIXTURE_CATALOG, 80049)!.printing);
  expect(missingLine({kind: 'edit', values: initial, initial, scan: NO_SCAN, taken: null})).toBe('Change something to save.');
});
it('names the button by the printing', () => {
  const at = (promoGrouping: string, number: string) => ({...EMPTY_PRINTING_FORM, promoGrouping, number});
  expect(publishLabel({kind: 'add', values: at('P5', '1'), initialCode: null, publishing: false})).toBe('Publish 1/P5');
  expect(publishLabel({kind: 'add', values: EMPTY_PRINTING_FORM, initialCode: null, publishing: false})).toBe('Publish');
  expect(publishLabel({kind: 'edit', values: at('P5', '2'), initialCode: '1/P5', publishing: false})).toBe('Save as 2/P5');
  expect(publishLabel({kind: 'edit', values: at('P5', '1'), initialCode: '1/P5', publishing: false})).toBe('Save 1/P5');
  expect(publishLabel({kind: 'add', values: at('P5', '1'), initialCode: null, publishing: true})).toBe('Publishing…');
});
it('says when the art will show', () => {
  expect(outcomeNote({scanSent: true, branch: 'master'})).toBe('Its art shows on inkweave.ink once the app has converted the scan and deployed.');
  expect(outcomeNote({scanSent: true, branch: 'rehearse-77'})).toBe('The scan converts to art on master only, so on rehearse-77 the printing has no art yet.');
  expect(outcomeNote({scanSent: false, branch: 'master'})).toBe('It shows on inkweave.ink once the app has deployed.');
});
it('files a card for the catalog by its set, and points a reprinted Sets 1 to 8 card to its Core copy', () => {
  expect(baseCardOf(MOTHER_KNOWS_BEST)).toEqual({id: 2035, fullName: 'Mother Knows Best', setCode: '9', number: 99, core: true});
  expect(baseCardOf(YEN_SID)).toEqual({id: 750, fullName: 'Yen Sid - Powerful Sorcerer', setCode: '4', number: 59, core: false});
  expect(coreCopyOf({card: URSULA_SET_3, cards: [MOTHER_KNOWS_BEST, URSULA_SET_9]})).toEqual({id: '2026', name: 'Ursula - Deceiver (Set 9 #90)'});
  expect(coreCopyOf({card: YEN_SID, cards: [URSULA_SET_9]})).toBeNull();
  expect(coreCopyOf({card: URSULA_SET_9, cards: [URSULA_SET_9]})).toBeNull();
});
it('builds the change a form publishes', () => {
  const values = {...EMPTY_PRINTING_FORM, promoGrouping: 'P5', number: '1', versions: 'foil' as const, note: ' '};
  expect(changeOf({kind: 'add', card: PRINCE, printing: null, values, scan: SCAN})).toEqual({kind: 'add', card: PRINCE,
    printing: {promoGrouping: 'P5', number: 1, finishes: ['foil'], scanLanguage: null}, note: null, scan: {ext: 'webp', base64: 'UklGRgAAAABXRUJQ'}});
  const snow = findPrinting(FIXTURE_CATALOG, 80049)!.printing;
  expect(changeOf({kind: 'edit', card: PRINCE, printing: snow, values: {...editValuesOf(snow), number: '44'}, scan: NO_SCAN}))
    .toMatchObject({kind: 'edit', id: 80049, from: {promoGrouping: 'P2', number: 42, scanLanguage: 'zh', officialArt: false},
      edit: {promoGrouping: 'P2', number: 44, scanLanguage: 'zh'}, scan: null});
});
```
`MOTHER_KNOWS_BEST`, `YEN_SID`, `URSULA_SET_3` and `URSULA_SET_9` come from `finishes/__tests__/finishFixtures`.

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement `printingForm.ts`.**
- [ ] **Step 4: Run them again.** Expected: PASS.
- [ ] **Step 5: Commit.** `USER_APPROVED=1 git commit -m "feat(studio): the rules of the promo printing form (#77)"`

### Task 7: The form's controller

**Files:**
- Create: `src/tools/studio/promos/usePrintingForm.ts`
- Test: `src/tools/studio/promos/__tests__/usePrintingForm.test.ts`

**Interfaces:**
- Consumes: Tasks 5 and 6, `useImageUpload` (`src/components/useImageUpload`), `forgetBranchFiles` (`finishes/branchFiles`), and `targetBranch`.
- Produces:
  ```ts
  export interface OpenPrintingForm {
    kind: 'add' | 'edit';
    card: BaseCard;
    /** The printing an edit opened, as the branch held it then; null for an add. */
    printing: CatalogPrinting | null;
    values: PrintingFormValues;
    initial: PrintingFormValues;
    scan: ScanState;
    /** The last publish's failure while the form stays open, or null. */
    error: string | null;
  }
  export interface PrintingFormController {
    form: OpenPrintingForm | null;
    /** Anything entered or chosen that the open form doesn't start with: what the guard counts. */
    dirty: boolean;
    publishing: boolean;
    /** What the line under the rows shows once no form is open: the last landed commit, or a refusal that closed the form ('gone'). */
    outcome: {result: CommitResult | null; error: string | null; note: string};
    openAdd: (card: BaseCard) => void;
    openEdit: (opts: {card: BaseCard; printing: CatalogPrinting}) => void;
    patch: (patch: Partial<PrintingFormValues>) => void;
    chooseScan: (file: File | null) => Promise<void>;
    cancel: () => void;
    /** Publishes the open form; resolves true when it landed. */
    publish: () => Promise<boolean>;
  }
  export function usePrintingForm(opts: {token: string; cardId: string | null}): PrintingFormController;
  ```
- **Behaviour:**
  - **The card.** A form belongs to the card the URL names. When `cardId` changes, the form, its scan and the outcome reset. Use React's adjust-state-during-render pattern (keep the previous `cardId` in state), not an effect.
  - **Opening a form** clears the outcome. Only one form is open at a time, so opening another replaces it.
  - **A landed publish** closes the form, sets `outcome.result` and `outcome.note` (`outcomeNote`), and calls `forgetBranchFiles()` so the panel reads the branch again.
  - **A `changed` refusal** re-seeds the form from `refusal.now`: `printing`, `values` and `initial` all come from `editValuesOf(now)`. `form.error` gets the message.
  - **A `gone` refusal** closes the form, sets `outcome.error` and calls `forgetBranchFiles()`.
  - **Any other failure** keeps the form and sets `form.error` to its message.
  - **Stale outcomes.** A publish that settles after the form it came from was cancelled, or after the card changed, changes nothing. Track a counter in a ref, bumped on every open, cancel and card change. Use `try … catch`, never `finally`.

- [ ] **Step 1: Write the failing tests** with `renderHook`, `stubRepo` and `pngFile` (`src/test/images`).

```ts
it('opens an empty add form that is clean until something is entered', () => {
  const {result} = renderHook(() => usePrintingForm({token: 't', cardId: '2047'}));
  act(() => result.current.openAdd(PRINCE));
  expect(result.current.form).toMatchObject({kind: 'add', values: EMPTY_PRINTING_FORM});
  expect(result.current.dirty).toBe(false);
  act(() => result.current.patch({note: 'x'}));
  expect(result.current.dirty).toBe(true);
});
it('opens an edit form filled in from the printing', () => {
  const snow = findPrinting(FIXTURE_CATALOG, 80049)!.printing;
  const {result} = renderHook(() => usePrintingForm({token: 't', cardId: '240'}));
  act(() => result.current.openEdit({card: SNOW_WHITE_BASE, printing: snow}));
  expect(result.current.form?.values).toEqual({promoGrouping: 'P2', number: '42', versions: null, scanLanguage: 'zh', note: ''});
  expect(result.current.dirty).toBe(false);
});
it('publishes an add, closes the form, says where it landed and reads the branch again', async () => {
  stubRepo({files: FIXTURE_FILES});
  const generations: number[] = [];
  const {result} = renderHook(() => { generations.push(useBranchFilesGeneration()); return usePrintingForm({token: 't', cardId: '2047'}); });
  act(() => result.current.openAdd(PRINCE));
  act(() => result.current.patch({promoGrouping: 'P4', number: '9', versions: 'foil'}));
  await act(() => result.current.chooseScan(pngFile('scan.png')));
  await act(async () => { expect(await result.current.publish()).toBe(true); });
  expect(result.current.form).toBeNull();
  expect(result.current.outcome).toEqual({result: {commitUrl: COMMIT_URL}, error: null, note: 'Its art shows on inkweave.ink once the app has converted the scan and deployed.'});
  expect(generations.at(-1)).toBe(1);
});
it('re-seeds an edit form from the branch when its printing changed meanwhile', async () => {
  const moved = withEditedPrinting({catalog: FIXTURE_CATALOG, id: 80049, edit: {promoGrouping: 'P2', number: 43, scanLanguage: 'zh'}, note: null});
  stubRepo({files: filesFor(moved)});
  const {result} = renderHook(() => usePrintingForm({token: 't', cardId: '240'}));
  act(() => result.current.openEdit({card: SNOW_WHITE_BASE, printing: findPrinting(FIXTURE_CATALOG, 80049)!.printing}));
  act(() => result.current.patch({number: '44'}));
  await act(async () => { expect(await result.current.publish()).toBe(false); });
  expect(result.current.form?.values.number).toBe('43');
  expect(result.current.form?.error).toBe("Someone changed 42/P2 on master after you opened it. The form now shows the branch's values: make your change again.");
});
it('keeps the form and its error when a publish fails', async () => {
  stubRepo({files: FIXTURE_FILES, update: notAFastForward});
  const {result} = renderHook(() => usePrintingForm({token: 't', cardId: '2035'}));
  act(() => result.current.openEdit({card: MKB_BASE, printing: findPrinting(FIXTURE_CATALOG, 80024)!.printing}));
  act(() => result.current.patch({note: 'Foil twin of 1/C3.'}));
  await act(async () => { expect(await result.current.publish()).toBe(false); });
  expect(result.current.form?.error).toBe('master changed while publishing, so nothing was published. Publish again.');
  expect(result.current.form?.values.note).toBe('Foil twin of 1/C3.');
});
it('drops the form when the card changes', () => {
  const {result, rerender} = renderHook(({cardId}) => usePrintingForm({token: 't', cardId}), {initialProps: {cardId: '2047'}});
  act(() => result.current.openAdd(PRINCE));
  act(() => result.current.patch({note: 'x'}));
  rerender({cardId: '2035'});
  expect(result.current.form).toBeNull();
  expect(result.current.dirty).toBe(false);
});
it("drops a publish's outcome that lands after the card changed", async () => {
  const repo = stubRepo({files: FIXTURE_FILES});
  const held = deferredResponse();
  const answer = repo.fetch.getMockImplementation()!;
  repo.fetch.mockImplementation((...call) => (call[1]?.method === 'PATCH' ? held.promise : answer(...call)));
  const {result, rerender} = renderHook(({cardId}) => usePrintingForm({token: 't', cardId}), {initialProps: {cardId: '2035'}});
  act(() => result.current.openEdit({card: MKB_BASE, printing: findPrinting(FIXTURE_CATALOG, 80024)!.printing}));
  act(() => result.current.patch({note: 'x'}));
  let landed: Promise<boolean> = Promise.resolve(false);
  act(() => { landed = result.current.publish(); });
  rerender({cardId: '2047'});
  await act(async () => { held.resolve(new Response('{}')); await landed; });
  expect(result.current.outcome.result).toBeNull();
  expect(result.current.form).toBeNull();
});
```
`SNOW_WHITE_BASE` is `{id: 240, fullName: 'Snow White - Unexpected Houseguest', setCode: '2', number: 24, core: false}`, added to `promoFixtures.ts` along with `MKB_BASE` (Task 5). `deferredResponse()` comes from `branchHarness`. Its exact shape is whatever that module exports: adapt `held.promise` and `held.resolve` to it.

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement `usePrintingForm.ts`.**
- [ ] **Step 4: Run them again,** then run `pnpm lint` on the file. Expected: PASS, and no React Compiler bailout.
- [ ] **Step 5: Commit.** `USER_APPROVED=1 git commit -m "feat(studio): hold the promo printing form across modes (#77)"`

### Task 8: The form

**Files:**
- Modify: `src/ui/SegmentedControl.tsx` (`value: T | null`, where null presses nothing), `src/ui/__tests__/SegmentedControl.test.tsx`
- Create: `src/tools/studio/components/PromoPrintingForm.tsx`, `PromoPrintingForm.stories.tsx`
- Test: `src/tools/studio/__tests__/PromoPrintingForm.test.tsx`

**Interfaces:**
- Consumes: Task 7's controller, Task 6's rules, `Field` (`components/Field`), `CHOICE_OPTIONS`, `scanLanguageOptions` (`scanLanguages`), `IMAGE_ACCEPT` and `IMAGE_FORMATS` (`cardPanel`), `useFileDrop`, `CommitOutcome`, `CtaButton`, `targetBranch`, `ADMIN_*` tokens.
- Produces:
  ```ts
  export interface PromoPrintingFormProps {
    controller: PrintingFormController;   // its form is open
    promoSets: readonly PromoSetOption[];
    /** Who holds the code the form names, from the branch's catalog; null when it's free. */
    taken: FoundPrinting | null;
    /** The art an edit shows for a printing with Ravensburger's: no scan control then. */
    currentArt: string | undefined;
    onForgetToken: () => void;
  }
  export function PromoPrintingForm(props: PromoPrintingFormProps): JSX.Element;
  ```
- **Layout,** following the brainstorm's mockup: a box in `ADMIN_COLORS.accentTintSoft` with an `accentBorder` edge and an `ADMIN_RADIUS.panel` corner. The scan column is 130 px wide; the fields sit beside it and wrap under it below 360 px.
- **Copy:**
  - **Heading:** 'New printing of {fullName}', or 'Edit {code} · id {id}' for an edit.
  - **Field labels:** 'Promo set', 'Number', 'Versions', 'Scan language', and 'Note' (or 'Add a note' for an edit).
  - **Promo set select:** its first option is '' with the text 'Choose a promo set'. An edit whose code `PROMO_SETS` lacks gets that code as an extra option.
  - **Note placeholder:** "Optional, for the catalog's notes".
  - **Scan control:** 'Click or drop to add the scan', or 'Click or drop to replace the scan'. The hint is `IMAGE_FORMATS`. A Ravensburger printing shows its art with "Its art is Ravensburger's, so it has no scan to replace."
  - **Buttons:** the Publish button is `CtaButton`, labelled by `publishLabel` and disabled while `missingLine` returns a line or a publish runs. The missing line shows under the buttons. Cancel is `CtaButton variant="neutral"`.
  - **Failure:** `form.error` shows through `CommitOutcome`, with `result={null}`, `note=''` and `onForgetToken`.
- **Field names** are prefixed `printing-` (`printing-promoSet`, `printing-number`, `printing-scanLanguage`, `printing-note`), so their ids never meet the Edit form's. The versions group's `ariaLabel` is 'Versions of the new printing'.
- **While a publish runs,** every field is read-only and the versions group is `held`.

- [ ] **Step 1: Write the failing tests**

```ts
it('presses nothing when the value is null', () => {          // SegmentedControl.test.tsx
  render(<SegmentedControl options={[{value: 'a', label: 'A'}, {value: 'b', label: 'B'}]} value={null} onChange={() => {}} ariaLabel="Pick" />);
  expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'false']);
});
it('labels every field and holds Publish until the form is complete', () => {
  renderForm({form: addForm()});
  for (const label of ['Promo set', 'Number', 'Scan language', 'Note']) expect(screen.getByLabelText(label)).toBeInTheDocument();
  expect(screen.getByRole('group', {name: 'Versions of the new printing'})).toBeInTheDocument();
  expect(screen.getByRole('button', {name: 'Publish'})).toBeDisabled();
  expect(screen.getByText('Choose a promo set to publish.')).toBeInTheDocument();
});
it('names Publish by the printing once it is complete', () => { /* values P4/9/foil + scan → button 'Publish 9/P4' enabled */ });
it("shows the scan's own error and holds Publish", () => { /* scan.error "x.png is not a JPEG, PNG or WebP image." visible; Publish disabled */ });
it('takes a dropped scan', () => { /* fireEvent.drop on the scan control with a File → controller.chooseScan called with it */ });
it("keeps a scan language the list doesn't name", () => { /* edit form of 80049: select value 'zh', option 'Chinese' present */ });
it("offers no scan to replace on a printing with Ravensburger art", () => { /* edit of 1661: no file input; the line about Ravensburger's art */ });
it('holds every field while it publishes', () => { /* publishing: inputs readOnly, select disabled, versions aria-disabled */ });
it('offers Forget token when GitHub rejects the token', () => { /* form.error 'GitHub 401 …' → Forget token button calls onForgetToken */ });
```
`renderForm` and `addForm` are local helpers that build a `PrintingFormController` with `vi.fn()` actions.

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement it, and the stories:**
  - Add, empty;
  - Add, complete: 9/P4 with a PNG data URL from `imageDataUrl` (`src/test/images`);
  - Edit of 42/P2, whose scan is in Chinese ('zh');
  - Edit of 24A/P2, which has Ravensburger's art;
  - Publishing;
  - Refused: a taken code.
- [ ] **Step 4: Run them again,** and `pnpm lint` (design tokens). Expected: PASS and clean.
- [ ] **Step 5: Commit.** `USER_APPROVED=1 git commit -m "feat(studio): the promo printing form (#77)"`

### Task 9: Add a printing and Edit in the Printings panel

**Files:**
- Modify: `src/tools/studio/finishes/useBranchPrintings.ts`, `src/tools/studio/components/PrintingsPanel.tsx`, `PrintingsPanel.stories.tsx`, `src/tools/studio/EditPane.tsx`
- Test: `src/tools/studio/__tests__/PrintingsPanel.test.tsx`, `StudioPrintings.test.tsx`, `src/tools/studio/finishes/__tests__/useBranchPrintings.test.tsx`

**Interfaces:**
- Consumes: Tasks 2, 6, 7 and 8, `studioHref` (`shell/nav`), `useCardDataContext` and `PROMO_SETS` (bridge).
- Produces:
  - In `useBranchPrintings`, the `'ready'` view gains `catalog?: PromoCatalog`, the branch's catalog parsed through `lastTextCached(namingItsFile(({text}) => parseCatalog(text)))`. The hook always sets it. It is optional only so that the panel's existing view fixtures still type.
  - In `PrintingsPanel`:
    ```ts
    export interface PromoPrintingsProps {
      controller: PrintingFormController;
      card: BaseCard;
      /** On a Sets 1 to 8 card a Core card reprints: the Core copy, whose panel holds the card's promos. */
      coreCopy: {id: string; name: string} | null;
      promoSets: readonly PromoSetOption[];
      onForgetToken: () => void;
    }
    // PrintingsPanelProps gains: promos?: PromoPrintingsProps
    ```
  - `EditPane`'s `CardEditor`, `FormSlot` and `PrintingsSection` thread a new `printing: PrintingFormController` prop. `PrintingsSection` builds `promos` with `baseCardOf(card)`, `coreCopy` (from `coreCopyOf`, only while `edit.printingsOnly`) and `promoSetOptions(PROMO_SETS)`.
- **What the panel shows,** once ready, with `promos` given and `catalog` present:
  - **Edit on promo rows.** Every row whose `ref.kind === 'promo'` gets a `LinkButton` 'Edit', labelled `` `Edit ${row.label}` ``, after its marker. No other row gets one.
  - **The edit form** renders in its own `<li>`, right after its row.
  - **Under the list:**
    - a Core copy: "Its promos are filed under its Core printing, {name}: add and edit them there." with a router `Link` 'Open the Core printing' to `studioHref('edit', coreCopy.id)`;
    - else the add form while it's open;
    - else `CtaButton variant="neutral"` 'Add a printing', with `CommitOutcome` under it showing `controller.outcome`.
  - **One form at a time.** While any form is open, Add and every Edit are hidden.
  - **Focus.** Cancel hands focus back to the button that opened the form, and a landed publish hands it to the outcome line, both through the panel's own `useFocusHandoff`.
- **Opening an edit.** Edit opens the form with `findPrinting(catalog, Number(row.ref.id))`. `taken` is `takenBy({catalog, code, exceptId})`, worked out as the panel renders.

- [ ] **Step 1: Write the failing tests**

```ts
// PrintingsPanel.test.tsx
it('offers Add a printing under the rows, and Edit on promo rows only', () => {
  renderPanel({view: {status: 'ready', rows: MKB_ROWS, catalog: FIXTURE_CATALOG}, promos: promosProps()});
  expect(screen.getByRole('button', {name: 'Add a printing'})).toBeInTheDocument();
  expect(screen.getAllByRole('button', {name: /^Edit /}).map((b) => b.getAttribute('aria-label')))
    .toEqual(['Edit Mother Knows Best 1/C3', 'Edit Mother Knows Best 13/C3']);
});
it('opens the edit form under its row, and hides Add and Edit meanwhile', () => { /* controller.form = edit of 80024 → form after the 13/C3 row; no Add, no Edit */ });
it("points a Core reprint's Sets 1 to 8 copy to its Core copy", () => {
  renderPanel({view: {status: 'ready', rows: [], catalog: FIXTURE_CATALOG}, promos: promosProps({coreCopy: {id: '2026', name: 'Ursula - Deceiver (Set 9 #90)'}})});
  expect(screen.getByText(/Its promos are filed under its Core printing, Ursula - Deceiver \(Set 9 #90\)/)).toBeInTheDocument();
  expect(screen.getByRole('link', {name: 'Open the Core printing'})).toHaveAttribute('href', '/studio?mode=edit&card=2026');
  expect(screen.queryByRole('button', {name: 'Add a printing'})).toBeNull();
});
it("shows a landed publish's outcome under the rows", () => { /* outcome.result → 'Committed.' + 'View commit' link + note */ });
// useBranchPrintings.test.tsx
it("hands the panel the branch's catalog", async () => { /* stubBranch with catalogText → ready view's catalog equals parseCatalog of it */ });
// StudioPrintings.test.tsx (the page)
it('adds 9/P4 to Mother Knows Best in one commit and lists it', async () => {
  const repo = stubStudioRepo({branch: {...FIXTURE_FILES, [CHUNK_9]: EMPTY_FILE}});
  setCardList({cards: [MOTHER_KNOWS_BEST]});
  const {user} = renderStudio({path: studioHref('edit', '2035')});
  await user.click(await screen.findByRole('button', {name: 'Add a printing'}));
  await user.selectOptions(screen.getByLabelText('Promo set'), 'P4');
  await user.type(screen.getByLabelText('Number'), '9');
  await user.click(within(screen.getByRole('group', {name: 'Versions of the new printing'})).getByRole('button', {name: 'Foil only'}));
  await user.upload(screen.getByLabelText('Click or drop to add the scan'), pngFile('scan.png'));
  await user.click(await screen.findByRole('button', {name: 'Publish 9/P4'}));
  await screen.findByText('Committed.', {exact: false});
  expect(Object.keys(repo.filesSent()).sort()).toEqual([ALL_CARDS_PATH, PROMOS_PATH, 'apps/web/public/card-images-raw/80050.png', CATALOG_PATH].sort());
});
```

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement it, and the stories:** Mother Knows Best with Add a printing; Edit open on 13/C3; Ursula's Set 3 copy pointing to Set 9; Landed.
- [ ] **Step 4: Run them again.** Expected: PASS.
- [ ] **Step 5: Commit.** `USER_APPROVED=1 git commit -m "feat(studio): add and edit promo printings from the Printings panel (#77)"`

### Task 10: The guard and the workspace

**Files:**
- Modify: `src/tools/studio/studioPaths.ts`, `src/tools/studio/StudioWorkspace.tsx`
- Test: `src/tools/studio/__tests__/studioPaths.test.ts` (existing cases gain `printing: false`), `StudioEdit.test.tsx`

**Interfaces:**
- Produces:
  - `StudioDrafts` becomes `{reveal: boolean; edit: boolean; printing: boolean}`.
  - `draftsAtRisk`:
    - leaving the page puts every dirty draft at risk;
    - a card change puts `{reveal: false, edit, printing}` at risk;
    - a mode switch puts none at risk.
  - `StudioWorkspace` holds `usePrintingForm({token, cardId: card})` and passes it to `EditPane` as `printing`. It sets `drafts.printing = printing.dirty` and `busy.printing = printing.publishing`. The guard is dirty while any draft is.
- **Copy** (the existing strings stay byte for byte):

  | When | Line |
  |---|---|
  | leaving the studio, printing alone | "Your printing form isn't published yet. Leaving Card studio drops it." |
  | leaving the card, printing alone | "Your printing form for this card isn't published yet. Leaving the card drops it." |
  | leaving the card, edit and printing | "Your changes to this card aren't saved yet, and your printing form for it isn't published yet. Leaving the card drops both." |
  | leaving the studio, two or three drafts, none in flight | the existing two-draft sentence for New reveal and Edit card, and for any set that includes the printing form, one sentence: the parts in DRAFTS order (reveal, edit, printing), joined with ", " and a final ", and ", ending "Leaving Card studio drops both." or "… drops all three." |
  | printing publish in flight | `writeInFlightMessage({action: 'publish'})` |
  | Forget token's name | 'your printing form' |

  `CARD_CHANGE` ("Drop changes") applies while the card change drops Edit's edits or the printing form outright, with neither commit in flight.

- [ ] **Step 1: Write the failing tests**

```ts
const none = {reveal: false, edit: false, printing: false};
it('asks before a card change drops the printing form, and not before a mode switch', () => {
  expect(shouldBlockStudioNavigation(url('/studio?mode=edit&card=1'), url('/studio?mode=edit&card=2'), {...none, printing: true})).toBe(true);
  expect(shouldBlockStudioNavigation(url('/studio?mode=edit&card=1'), url('/studio?card=1'), {...none, printing: true})).toBe(false);
});
it('names the printing form when leaving the card or Card studio', () => {
  expect(studioUnsavedMessage(leave('/studio?mode=edit&card=1', '/studio?mode=edit&card=2', {...none, printing: true})))
    .toBe("Your printing form for this card isn't published yet. Leaving the card drops it.");
  expect(studioUnsavedMessage(leave('/studio?mode=edit&card=1', '/calibration', {reveal: true, edit: true, printing: true})))
    .toBe("Your New reveal card isn't published yet, your Edit card changes aren't saved yet, and your printing form isn't published yet. Leaving Card studio drops all three.");
});
it('asks before Forget token drops the printing form', () => {
  expect(forgetTokenQuestion({...none, printing: true})).toBe('Forget the token and drop your printing form?');
});
// StudioEdit.test.tsx
it('keeps a started printing form across a mode switch, and asks before leaving the card', async () => { /* type into Note, switch to New reveal and back: the note is there; navigate to another card: the dialog says the printing line */ });
```

- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement it.** Keep `studioUnsavedMessage` at complexity 8 or less by building the leaving-studio sentence in a helper.
- [ ] **Step 4: Run them again.** Expected: PASS.
- [ ] **Step 5: Commit.** `USER_APPROVED=1 git commit -m "feat(studio): guard a started promo printing form (#77)"`

### Task 11: Move the app pin past #904

**Files:** `upstream/inkweave` (the pin), plus whatever `pnpm check:deps --fix` and the bump break.

- [ ] **Step 1: Write the failing test** in `printingForm.test.ts`, replacing the newest-first case:

```ts
it('offers Promo Set 5, the newest, first', () => {
  expect(promoSetOptions(PROMO_SETS)[0]).toEqual({code: 'P5', label: 'P5 · Promo Set 5'});
  expect(isKnownPromoSet('P5')).toBe(true);
});
```
- [ ] **Step 2: Run it.** Expected: FAIL at the current pin.
- [ ] **Step 3: Bump the pin,** once the owner approves and #904 has merged:
  1. `USER_APPROVED=1 git submodule update --remote upstream/inkweave`
  2. `pnpm check:deps --fix`, then `pnpm install`
  3. `pnpm build:engine`
  4. Fix what `pnpm typecheck`, `pnpm lint` and `pnpm test:run` report. The pinned-data tests of Tasks 1, 2 and 4 must still pass against the new files: master is the merge's fixed point.
- [ ] **Step 4: Run** `pnpm typecheck`, `pnpm lint`, `pnpm test:run` and `pnpm build`. Expected: all pass.
- [ ] **Step 5: Commit.** `USER_APPROVED=1 git commit -m "chore: bump upstream/inkweave to <short sha> (#77)"`

### Task 12: Docs, gates and the rehearsal

**Files:** `CLAUDE.md` (the Card studio paragraph and the bridge bullet), `docs/promo-printings-design.md` (its status line).

- [ ] **Step 1: CLAUDE.md.**
  - **The bridge bullet** notes that the bridge also re-exports the app's promo merge from `scripts/lib/*.mjs`, typed there, which `tsconfig.app.json`'s `allowJs` allows.
  - **The Card studio paragraph** gains a sentence on adding and editing promo printings:
    - the one commit, its files, and the merge;
    - the refusals: out of step, a taken code, a printing changed since its form opened;
    - the promo sets from the pin;
    - the Core-copy pointer;
    - and that the guard counts the printing form.
- [ ] **Step 2: The gates.** `pnpm lint`, `pnpm test:run`, `pnpm typecheck` and `pnpm build` must all pass. Then CodeScene:
  - `code_health_review` on every changed file;
  - `pre_commit_code_health_safeguard` before the commit;
  - `analyze_change_set` against `main` before the PR.

  New code stays at 10.
- [ ] **Step 3: Commit.** `USER_APPROVED=1 git commit -m "docs: Card studio adds and edits promo printings (#77)"`
- [ ] **Step 4: The rehearsal.** It runs on a throwaway app branch, `rehearse-77`, created from master through the API with the owner's OK, and named in `.env.local`. On it:
  1. Add 1/P5 to Mickey Mouse - Brave Little Prince with the owner's scan. The owner picks the file, since the browser pane can't. Check the commit:
     - it touches the catalog, `allCards.json`, `collection/promos.json` and `card-images-raw/80056.webp`;
     - in the card files, only 1/P5's entries changed;
     - the merge over the branch's files changes nothing.
  2. Edit it to 2/P5 and add a note. The id stays 80056.
  3. Edit it back to 1/P5.
  4. Try a taken code. The publish is refused and nothing is written.

  Then delete `rehearse-77`, with the owner's OK.
- [ ] **Step 5: The PR.** Open it to `main`, with "Closes #77", after the owner's go-ahead to push.
