> Part of [R: Admin redesign](../R-redesign.md), phase R3 ([R3-card-analytics.md](R3-card-analytics.md)). Read the main plan's decisions (R-28 to R-56 for R3), corrections, global constraints and shared interfaces, then the R3 header, first.

> **Re-base notes (R3-1, 2026-10-06).** Re-based on main @ `aea40b4` (R1 and R2 merged), the app pin `upstream/inkweave` @ `bc877e1`, and decisions R-28 to R-56. The audit checked app master (`cc8e7e1`) as well. `theme.ts`, `constants/index.ts`, `scoreUtils.ts`, `usePrecomputedSynergies.ts` and `useAutocomplete.ts` are unchanged there. `searchCardsByName`'s body is unchanged there (it moves down one line, to `loader.ts:240`, under a line master adds at `:115`). `shared/hooks/index.ts` gains `hasForeignScan` there, below the two lines this task bridges (`:1-2`), which stay put.
> - **R-55: bridge only what R3 uses.**
>   - Dropped `type PrecomputedPairData` and `type StrengthTier`, which no R3 or R4 task uses. R3-4 names the synergy data `Awaited<ReturnType<typeof fetchCardSynergies>>` and uses only `StrengthTierLabel`.
>   - Kept `type UseAutocompleteReturn`, which types R3-5's option row.
>   - Added `searchCardsByName` (R-30). It goes on the loader line beside `smallImageUrl`, which comes from the same module, so the bridge loads no new app module for it.
>   - Every name the bridge gains has a named consumer. See "Who uses each name" below.
> - **R-32: the `PairStat.accuracySentiment` edit is gone.** With it go its four fixture fixes (`PairList.test.tsx:9`, `calibrationModel.test.ts:43`, `chartFixtures.ts:24` and `PairList.stories.tsx:24`), and this task leaves `voteAnalyticsTypes.ts` alone. The card's sentiment comes from its raw accuracy answers instead (R3-3). That model relies on this task's narrowed `accuracy` type.
> - **R-56: branch and order.** The work is on `feature/24-redesign-r3`. This is the phase's first code commit, and it comes after the plan commit (R-28 to R-56 and the per-task files). Step 1 checks both.
> - **Anchors re-cited against the real bridge.**
>   - R1-12 dropped `SURFACE_CARD`, so the outline's anchor "after `SURFACE_CARD`" no longer exists. The constants block is `src/app-bridge.ts:15-37`, kept in ASCII order. `TIER_COLORS` goes between `SPACING` (`:31`) and `TRUNCATE` (`:32`). `Z_INDEX` goes after `TRUNCATE` and before `blackRgba` (`:33`), because uppercase sorts before lowercase.
>   - The hooks line is `:46`. R2-5a's DialogShell block pushed it down from the outline's 45.
>   - The loader line is `:52`. The new synergy and tier lines go after it, before the RaritySymbol comment (`:53`).
>   - The outline's sentence about R1-1 and `BannerPage.tsx` is dropped. Both are history.
> - **Narrowing the types breaks three sites that aren't fixtures.** The outline named none of them. `tsc -b` reports exactly these three:
>   - `ActivityView.stories.tsx:42` and `:45`. They now use the file's own `as const` tuple idiom (`carriesFor`, `:31-33`). Each pick makes the same single `next()` call and gives the same value, so the seeded story data is unchanged; this was checked over 100,000 draws.
>   - `activityModel.test.ts:481`, the `it.each` type of the `carriesLabel` table. The audit cited `:480`, but the line is 481, and tsc reports the error at 488. It now reads `VoteLogRow['whoCarries']`.
> - **The contract test, rewritten in R2's idioms.**
>   - **Fetch stubs.** Each call gets a fresh `Response` with its headers, as `useVoteAnalytics.test.ts:8-9` does. `fetchCardSynergies` reads `response.headers.get('content-type')` (`usePrecomputedSynergies.ts:60`), so a hand-rolled `{ok, json}` stub would throw for the wrong reason.
>   - **Tables.** The cases are `it.each` tables over object rows, which avoids CodeScene's Code Duplication on three near-identical cases.
>   - **New cases:**
>     - a rejection, from a network failure or from malformed JSON, is not kept, so the next call fetches again (R-45's Retry depends on this);
>     - the URL the file is fetched from;
>     - `searchCardsByName` matches names and never ids (R-30).
>   - **Not tested here.** `Z_INDEX` and `useAutocomplete` have no test in this file: R3-5 runs the real hook through the `importOriginal` bridge mock.
> - **Dropped: the outline's `grep -rnE "whoCarries: '[AB]'" src` check.** It passes trivially today. With the narrowed union, typecheck rejects such a fixture in any TypeScript file.
> - **Citations corrected:**
>   - `fetchCardSynergies` is at `usePrecomputedSynergies.ts:51-66`, and its helper `cacheEmptyResult` at `:45-49`.
>   - In that function, the fetch is at `:55`, the non-OK branch at `:57`, the content-type check at `:60-61` and `response.json()` at `:63`.
> - **The bridge's new lines follow its existing style.** Each new export line gets a short comment on why it is there, as DialogShell's (`:40-42`) does; the two constants get none, like the rest of the constants block. A line with more than one name that would run past 120 characters is broken across lines, as the CardDataContext export (`:47-50`) is. No line in the bridge is longer than 120 characters today.
>   - **Contract addition 5 changes with it.** It shows the hooks and `scoreUtils` exports on one line (126 characters each). R3-1 breaks both across lines, so the R3 header's addition 5 and R3-4 Step 1's grep change with it (see "Notes for later tasks").
> - **Verified in a scratch sandbox** (`scratchpad/r3-rebase/sandbox-R3-1`).
>   - **Setup.** The sandbox held a copy of `src` and the configs, with `node_modules` and `upstream` junctioned in read-only. Vite's cache and the tsbuildinfo files were kept in the sandbox. The sandbox's Vite config also needed `server.fs.strict: false`, because the junction resolves outside the sandbox root. The repo needs neither change.
>   - **Results:**
>     - Step 3: run against today's bridge, the contract test fails while collecting, as quoted below. With Step 4's bridge it passes, 13 of 13.
>     - Step 7: with only the types narrowed, `tsc -b` exits 2 with exactly the three errors quoted. With Step 8's fixes it exits 0.
>     - `vitest run src/tools/analytics/activity` gave 6 files and 118 tests passed.
>     - `vitest run src` gave 93 files and 1,063 tests passed.
>     - All five files pass `pnpm exec eslint --stdin --stdin-filename <repo path>` against the repo's config.
>     - CodeScene MCP 1.1.3 scored the new test file 10.0 with no findings, and the two edited activity files 10. The PR gate runs a stricter server version (see the R3 header), so run `analyze_change_set` before the push.
> - **Not taken.**
>   - **Stale rarity comments.** The comments at `app-bridge.ts:53-54` and `:57-58` are out of date: at this pin `RaritySymbol` also draws Epic, Enchanted and Iconic (`RaritySymbol.tsx:18-20`). `BreakdownCards.tsx:27` and `:38-44` repeat the same claim, and their code relies on it (`PRINTING_SYMBOLS`). Fixing the bridge comment alone would contradict that file. Changing R1-10's page is outside R-55, which covers only R3's names. This is a flag for the owner, not a change in R3: a small follow-up could pass the printing keys to `RaritySymbol` and drop the three webp exports. R3-9 drafts it as a follow-up issue (its Step 19, draft 4).
>   - **`carriesLabel`'s `default` branch** (`activityModel.ts:326-327`) can't be reached under the narrowed type. It stays as the runtime guard for an artifact nobody validated.
>   - **The app's own vote types.** `Accuracy` and `InDepthVote` (`shared/lib/supabase.ts:55-75`) could be bridged as types instead of the literal unions. The unions plus the migration citation are enough, and the database constraint is the real source.
> - **The bridge record.** The main plan's bridge record (`R-redesign.md:560-562`) has R3-1's line, added by the plan commit: "R3-1 adds `TIER_COLORS`, `Z_INDEX`, `useAutocomplete`, `UseAutocompleteReturn`, `searchCardsByName`, `fetchCardSynergies`, `getStrengthTier` and `StrengthTierLabel`, and narrows `VoteLogRow`'s `accuracy`, `difficulty` and `whoCarries`." The plan commit already records it in R-redesign.md, so R3-9 only checks it.

### Task R3-1: Bridge additions and vote value types

**Files:**
- Modify `src/app-bridge.ts`:
  - the constants block (`:15-37`): `TIER_COLORS` after `SPACING` (`:31`), and `Z_INDEX` after `TRUNCATE` (`:32`);
  - the hooks line (`:46`);
  - the loader line (`:52`), with two exports after it.
- Modify `src/tools/analytics/voteLogTypes.ts`. The interface is at `:1-14`, and the three answer fields are at `:7`, `:10` and `:11`.
- Modify `src/tools/analytics/activity/ActivityView.stories.tsx:42` and `:45`.
- Test, modify: `src/tools/analytics/activity/__tests__/activityModel.test.ts:481`.
- Test, create: `src/tools/analytics/cards/__tests__/bridgeContract.test.ts`. The `cards/` folder is new, and later R3 tasks add to it.

**Interfaces:**
- **Consumes** (app pin `bc877e1`, `upstream/inkweave/apps/web/src/`):
  - `TIER_COLORS`, at `shared/constants/theme.ts:363-368` and re-exported at `shared/constants/index.ts:30`. It maps `perfect`, `strong`, `moderate` and `weak` to `{color, bg}`, `as const`.
  - `Z_INDEX`, at `theme.ts:261-271` and `index.ts:17`. Its `autocomplete` layer is 900, under `modalBackdrop` (999) and `modal` (1000), which DialogShell uses.
  - `useAutocomplete` (`shared/hooks/useAutocomplete.ts:51-59`, options `:5-13`) and `type UseAutocompleteReturn` (`:15-49`), both exported from `shared/hooks/index.ts:1-2`.
  - `searchCardsByName`, at `features/cards/loader.ts:239-247`. It is the hook's own match (`useAutocomplete.ts:101`).
  - `fetchCardSynergies`, at `features/synergies/hooks/usePrecomputedSynergies.ts:51-66`. The synergies feature's `hooks/index.ts` doesn't export it, so the bridge imports the file itself.
  - `getStrengthTier` and `type StrengthTierLabel`, at `features/synergies/utils/scoreUtils.ts:18-23` and `:4`.
  - The votes table's check constraints, at `supabase/migrations/20260330000001_votes_table.sql:7`, `:11` and `:12`. No later migration on the pin or on master changes them. The form's labels are at `features/voting/components/InDepthVoteForm.tsx:77-92`.
  - None of these app modules brings a new runtime dependency. `usePrecomputedSynergies.ts` imports React, engine types and `CardDataContext`, which is already bridged. `scoreUtils.ts` imports a type and the constants. So `pnpm check:deps` is unaffected.
  - `/data/` is a forwarded path (`forwarded-paths.json`, `vercel.json`), so `/data/synergies/<id>.json` resolves both in dev and in the deployment.
- **Produces:**
```ts
// src/app-bridge.ts gains (R3-1)
export const TIER_COLORS: {readonly perfect: {color, bg}; readonly strong: {…}; readonly moderate: {…}; readonly weak: {…}}; // as const
export const Z_INDEX: {readonly autocomplete: 900; readonly modalBackdrop: 999; readonly modal: 1000; …};
export function useAutocomplete(opts: {
  cards: LorcanaCard[]; query: string; onQueryChange: (query: string) => void; onSelect: (card: LorcanaCard) => void;
  minChars?: number; maxResults?: number; debounceMs?: number; // defaults 2, 10 and 150
}): UseAutocompleteReturn;   // suggestions, isOpen, isFocused, highlightedIndex, inputProps, listboxProps, getOptionProps, close, searchImmediate
export type UseAutocompleteReturn;
export function searchCardsByName(cards: LorcanaCard[], query: string): LorcanaCard[];
  // a case-insensitive substring of name, fullName or version; ’ and ' match each other; never an id
export function fetchCardSynergies(cardId: string): Promise<{groups: …[]; pairs: Record<string, {connections: PairSynergyConnection[]; aggregateScore: number}>}>;
  // kept per id for the session; a non-OK or non-JSON response resolves (and is kept) as {groups: [], pairs: {}};
  // a failed fetch or malformed JSON rejects and is not kept. Its result type stays private to the app:
  // R3-4 names it CardSynergies = Awaited<ReturnType<typeof fetchCardSynergies>>
export type StrengthTierLabel = 'Perfect' | 'Strong' | 'Moderate' | 'Weak';
export function getStrengthTier(score: number): {label: StrengthTierLabel; shortLabel: string; color: string; bg: string};
  // ≥ 9.5 Perfect, ≥ 7 Strong, ≥ 4 Moderate, else Weak; color and bg are the TIER_COLORS entry

// src/tools/analytics/voteLogTypes.ts: VoteLogRow narrows (R3-3 relies on it)
accuracy: -1 | 0 | 1 | null;                        // −1 "Should be lower" (the engine's score too high), 0 fair, +1 "Should be higher"
difficulty: 1 | 2 | 3 | null;                       // Easy, Situational, Hard
whoCarries: 'a' | 'b' | 'both' | 'neither' | null;  // 'a' / 'b': the row's own a / b card; 'both': the one-click default
```

**Who uses each name.** Every new export has a consumer in R3, as R-55 requires.

| Name | Used by |
|---|---|
| `TIER_COLORS` | R3-4's `TIER_SERIES`; the network's stories and the theme's 1.4.11 test (R3-4b); the split meter's tier stories (R3-4c) |
| `Z_INDEX` | R3-5: the switcher's list sits at `Z_INDEX.autocomplete`, as `no-raw-z-index` requires for any z-index of 50 or more |
| `useAutocomplete` | R3-5's switcher, used as it is (R-30), with `maxResults: 6` |
| `UseAutocompleteReturn` | R3-5's option row (R-55) |
| `searchCardsByName` | R3-5's "No cards match." status, run on the live query (R-30) |
| `fetchCardSynergies` | R3-4's `useCardSynergies` hook, and its `CardSynergies` type |
| `getStrengthTier`, `StrengthTierLabel` | R3-4's engine model: each partner's tier, `TIER_ORDER` and the tier counts |
| the narrowed `VoteLogRow` fields | R3-3's card vote model: the −1/0/+1 split and the sentiment (R-32), "named as carry", and difficulty as "x.x / 3" |

- [ ] **Step 1: Check where this task starts**

From the repo root, with the Bash tool:

```bash
git branch --show-current
git status --short -- src docs/plans
grep -c "^| R-5[0-6] |" docs/plans/R-redesign.md
git -C upstream/inkweave rev-parse --short=7 HEAD
ls src/tools/analytics/cards
```

Expected:
- `feature/24-redesign-r3`;
- no output from `git status`, which means the plan commit (R-56) holds the decisions and the task files;
- `7` (R-50 to R-56);
- `bc877e1`;
- `ls: cannot access 'src/tools/analytics/cards': No such file or directory`.

What to do when the output differs:
- **The branch differs, or `git status` lists `docs/plans`.** Stop: the plan commit comes first, after the owner approves (R-56).
- **The pin differs** (a Dependabot bump landed). Re-check the app line numbers cited under Interfaces. The contract test in Step 2 is there to catch a change in behaviour.
- **On a fresh clone or after a pin bump**, run `pnpm build:engine` once before the first test run.

- [ ] **Step 2: Write the failing contract test**

Create `src/tools/analytics/cards/__tests__/bridgeContract.test.ts`:

```ts
import {afterEach, describe, expect, it, vi} from 'vitest';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {
  TIER_COLORS,
  fetchCardSynergies,
  getStrengthTier,
  searchCardsByName,
  type StrengthTierLabel,
} from '../../../../app-bridge';

// What R3's card pages count on in the app code R3-1 bridges. A pin bump that
// changes any of it fails here first.

afterEach(() => vi.unstubAllGlobals());

const JSON_TYPE = {headers: {'content-type': 'application/json'}};
const NO_SYNERGIES = {groups: [], pairs: {}};
const SYNERGIES = {groups: [], pairs: {'2': {connections: [], aggregateScore: 8}}};

/** A fresh response per call: a body can only be read once. */
const json = () => new Response(JSON.stringify(SYNERGIES), JSON_TYPE);

describe('getStrengthTier', () => {
  it.each<{score: number; label: StrengthTierLabel; color: string}>([
    {score: 9.5, label: 'Perfect', color: TIER_COLORS.perfect.color},
    {score: 9.49, label: 'Strong', color: TIER_COLORS.strong.color},
    {score: 7, label: 'Strong', color: TIER_COLORS.strong.color},
    {score: 6.99, label: 'Moderate', color: TIER_COLORS.moderate.color},
    {score: 4, label: 'Moderate', color: TIER_COLORS.moderate.color},
    {score: 3.99, label: 'Weak', color: TIER_COLORS.weak.color},
  ])("reads $score as $label, in that tier's TIER_COLORS colour", ({score, label, color}) => {
    expect(getStrengthTier(score)).toMatchObject({label, color});
  });
});

// The app keeps each id's result in module state for the session, and no test
// can empty it, so every case below asks for an id of its own.
describe('fetchCardSynergies', () => {
  it("passes the card's synergy file through, and reads it once", async () => {
    const fetchMock = vi.fn(async () => json());
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchCardSynergies('read-once')).resolves.toEqual(SYNERGIES);
    await expect(fetchCardSynergies('read-once')).resolves.toEqual(SYNERGIES);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/data/synergies/read-once.json');
  });

  it.each([
    {name: 'a 404', id: 'empty-404', response: () => new Response('', {status: 404})},
    {name: 'a 500', id: 'empty-500', response: () => new Response('', {status: 500})},
    {
      name: "an HTML 200 (the dev server's fallback page)",
      id: 'empty-html',
      response: () => new Response('<!doctype html>', {headers: {'content-type': 'text/html'}}),
    },
  ])('reads $name as no synergies, and keeps that for the session', async ({id, response}) => {
    const fetchMock = vi.fn(async () => response());
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchCardSynergies(id)).resolves.toEqual(NO_SYNERGIES);
    await expect(fetchCardSynergies(id)).resolves.toEqual(NO_SYNERGIES);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      name: 'a network failure',
      id: 'reject-network',
      failure: async (): Promise<Response> => {
        throw new TypeError('Failed to fetch');
      },
    },
    {name: 'malformed JSON', id: 'reject-json', failure: async () => new Response('{', JSON_TYPE)},
  ])('rejects on $name and keeps nothing, so the next call fetches again', async ({id, failure}) => {
    const fetchMock = vi.fn().mockImplementationOnce(failure).mockImplementationOnce(async () => json());
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchCardSynergies(id)).rejects.toThrow();
    await expect(fetchCardSynergies(id)).resolves.toEqual(SYNERGIES);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

// R3-5's switcher says "No cards match." when this finds nothing (R-30).
describe('searchCardsByName', () => {
  const ELSA: LorcanaCard = {
    id: '2983',
    name: 'Elsa',
    version: 'Snow Queen',
    fullName: 'Elsa - Snow Queen',
    cost: 1,
    ink: 'Amber',
    inkwell: true,
    type: 'Character',
  };
  const ANNA: LorcanaCard = {
    ...ELSA,
    id: '17',
    name: 'Anna',
    version: 'Heir to Arendelle',
    fullName: 'Anna - Heir to Arendelle',
  };

  it("matches a card's name or version in any case, never its id", () => {
    expect(searchCardsByName([ELSA, ANNA], 'elsa')).toEqual([ELSA]);
    expect(searchCardsByName([ELSA, ANNA], 'HEIR')).toEqual([ANNA]);
    expect(searchCardsByName([ELSA, ANNA], '2983')).toEqual([]);
  });
});
```

Notes on the test:
- **Fetch stubs.** They follow `useVoteAnalytics.test.ts`: `vi.stubGlobal` with `afterEach(() => vi.unstubAllGlobals())` (`:5`), and a fresh `Response` with its headers for every call (`:8-9`). `fetchCardSynergies` reads the content type, and a hand-rolled `{ok, json}` stub has no `headers`.
- **The 500 row.** A 5xx resolves as no synergies and is kept for the session. R3-4's Retry (R-45) only helps when the fetch rejects, which the last table pins.
- **Tables and fixtures.** The tables take object rows, and the cards are object literals. No helper takes primitive arguments, which keeps the module clear of CodeScene's primitive-argument share.

- [ ] **Step 3: Run it and watch it fail**

```bash
pnpm vitest run src/tools/analytics/cards/__tests__/bridgeContract.test.ts
```

Expected: the file fails while Vitest collects it, before any test runs.

```
 FAIL  src/tools/analytics/cards/__tests__/bridgeContract.test.ts [ src/tools/analytics/cards/__tests__/bridgeContract.test.ts ]
TypeError: Cannot read properties of undefined (reading 'perfect')
 ❯ src/tools/analytics/cards/__tests__/bridgeContract.test.ts:25:55
 Test Files  1 failed (1)
      Tests  no tests
```

Today's bridge exports none of the four names, so they import as `undefined`. The tier table is built first, when the file loads, so it fails there.

- [ ] **Step 4: Bridge the names**

In `src/app-bridge.ts`, the constants block (lines 31-33). Current:

```ts
  SPACING,
  TRUNCATE,
  blackRgba,
```

New:

```ts
  SPACING,
  TIER_COLORS,
  TRUNCATE,
  Z_INDEX,
  blackRgba,
```

The hooks line (line 46). Current:

```ts
export {useContainerWidth} from '../upstream/inkweave/apps/web/src/shared/hooks';
```

New:

```ts
// useAutocomplete is the app's card search combobox (R3-5's switcher): by name,
// never by id, from two letters, newest set first, after a 150 ms debounce.
export {
  useAutocomplete,
  useContainerWidth,
  type UseAutocompleteReturn,
} from '../upstream/inkweave/apps/web/src/shared/hooks';
```

The loader line (line 52). Current:

```ts
export {smallImageUrl} from '../upstream/inkweave/apps/web/src/features/cards/loader';
```

New:

```ts
// searchCardsByName is useAutocomplete's own match, run without its debounce
// (R3-5's "No cards match.").
export {searchCardsByName, smallImageUrl} from '../upstream/inkweave/apps/web/src/features/cards/loader';
// A card's precomputed synergy file, /data/synergies/<id>.json (a forwarded
// path). Each id's result is kept for the session, and a non-OK or non-JSON
// response is kept as an empty result. A failed fetch or malformed JSON rejects
// and isn't kept, so the next call fetches again.
export {fetchCardSynergies} from '../upstream/inkweave/apps/web/src/features/synergies/hooks/usePrecomputedSynergies';
// The app's synergy tiers: 9.5 and up Perfect, 7 Strong, 4 Moderate, below 4
// Weak. A tier's color is its TIER_COLORS entry.
export {
  getStrengthTier,
  type StrengthTierLabel,
} from '../upstream/inkweave/apps/web/src/features/synergies/utils/scoreUtils';
```

The rest of the file doesn't change. Notes on the edit:
- **Order.** The constants block keeps its ASCII order: `TIER_COLORS` comes before `TRUNCATE`, because `I` sorts before `R`, and `Z_INDEX` comes before the lowercase helpers.
- **The `type` keyword.** It marks the two type re-exports, as `verbatimModuleSyntax` requires.
- **Line breaks.** On one line, the hooks and `scoreUtils` exports would each run to 126 characters, past the bridge's 120, so they break across lines, as the CardDataContext export (`:47-50`) does. The loader line (105 characters) and the synergy line (118, one name) stay on one line.
- **Lint.** `src/app-bridge.ts` is the one file `no-restricted-imports` exempts (`eslint.config.js`), and the edited file passes `pnpm exec eslint --stdin --stdin-filename src/app-bridge.ts`.

- [ ] **Step 5: Run it and watch it pass**

```bash
pnpm vitest run src/tools/analytics/cards/__tests__/bridgeContract.test.ts
```

Expected: `Test Files  1 passed (1)` and `Tests  13 passed (13)`. That is six tiers, one read, three empty results, two rejections and one search.

- [ ] **Step 6: Narrow the vote answers to the values the database allows**

Replace `src/tools/analytics/voteLogTypes.ts`'s `VoteLogRow` (lines 1-14). Current:

```ts
export interface VoteLogRow {
  a: string;
  b: string;
  aName: string;
  bName: string;
  score: number | null;
  accuracy: number | null;
  isReal: boolean | null;
  wouldPlay: boolean | null;
  difficulty: number | null;
  whoCarries: string | null;
  ts: string;
  voter: number;
}
```

New:

```ts
/**
 * One raw vote, as buildVoteLog writes it (scripts/lib/voteAnalytics.mjs). The
 * answer fields take only the values the app's votes table allows (its check
 * constraints: supabase/migrations/20260330000001_votes_table.sql:7-12), and
 * null where the voter skipped the question.
 */
export interface VoteLogRow {
  a: string;
  b: string;
  aName: string;
  bName: string;
  score: number | null;
  /** −1 "Should be lower" (the engine's score is too high), 0 "Score is fair", +1 "Should be higher". */
  accuracy: -1 | 0 | 1 | null;
  isReal: boolean | null;
  wouldPlay: boolean | null;
  /** 1 Easy, 2 Situational, 3 Hard. */
  difficulty: 1 | 2 | 3 | null;
  /** Who carries the pair: 'a' and 'b' are this row's a and b cards; 'both' is the one-click default. */
  whoCarries: 'a' | 'b' | 'both' | 'neither' | null;
  ts: string;
  voter: number;
}
```

`VoteLog` (lines 16-20) doesn't change.

Where the values come from:
- **The database.** The constraints are `accuracy in (-1, 0, 1)`, `who_carries in ('a', 'b', 'both', 'neither')` and `difficulty in (1, 2, 3)`. `buildVoteLog` passes each column through unchanged (`voteAnalytics.mjs:223-224`).
- **The labels.** They are the form's own (`InDepthVoteForm.tsx:77-92`).
- **The one-click default.** `'both'` is `useVoteSession.ts:19`'s default.
- **Real data.** The owner's local `vote-log.json` (the 2026-10-05 files) holds only these values: no `'neither'` yet, and nothing outside the unions.

- [ ] **Step 7: Typecheck, and see the three sites the narrowing catches**

```bash
pnpm typecheck
```

Expected: exit 2, with exactly these errors:

```
src/tools/analytics/activity/__tests__/activityModel.test.ts(488,35): error TS2322: Type 'string | null' is not assignable to type '"both" | "a" | "b" | "neither" | null'.
  Type 'string' is not assignable to type '"both" | "a" | "b" | "neither" | null'.
src/tools/analytics/activity/ActivityView.stories.tsx(42,5): error TS2322: Type 'number' is not assignable to type '0 | 1 | -1 | null'.
src/tools/analytics/activity/ActivityView.stories.tsx(45,5): error TS2322: Type 'number | null' is not assignable to type '2 | 1 | 3 | null'.
  Type 'number' is not assignable to type '2 | 1 | 3 | null'.
```

How each site goes wrong:
- **The story.** Its arithmetic widens to `number`.
- **The test.** Its `carriesLabel` table types `whoCarries` as `string` (`it.each<[string | null, string]>`, line 481), and the spread at 488 passes that on.

If any other error appears, it is a site this plan doesn't know about. Fix it the same way: keep the values, and type the expression as the union.

- [ ] **Step 8: Fix the three sites**

In `src/tools/analytics/activity/ActivityView.stories.tsx`, line 42. Current:

```tsx
    accuracy: Math.floor(next() * 3) - 1,
```

New:

```tsx
    accuracy: ([-1, 0, 1] as const)[Math.floor(next() * 3)],
```

Line 45. Current:

```tsx
    difficulty: quick ? null : 1 + Math.floor(next() * 3),
```

New:

```tsx
    difficulty: quick ? null : ([1, 2, 3] as const)[Math.floor(next() * 3)],
```

This is the file's own idiom (`carriesFor`, lines 31-33). Each pick makes the same single `next()` call and gives the same value as the arithmetic it replaces, so the seeded story data doesn't change.

In `src/tools/analytics/activity/__tests__/activityModel.test.ts`, line 481. Current:

```ts
  it.each<[string | null, string]>([
```

New:

```ts
  it.each<[VoteLogRow['whoCarries'], string]>([
```

The file already imports `VoteLogRow` as a type (line 21). Its five rows (`'a'`, `'b'`, `'both'`, `'neither'`, `null`) are exactly the union.

- [ ] **Step 9: Typecheck and run the touched folders**

```bash
pnpm typecheck
pnpm vitest run src/tools/analytics/activity src/tools/analytics/cards
```

Expected: `pnpm typecheck` exits 0. Vitest gives `Test Files  7 passed (7)` and `Tests  131 passed (131)`: the activity folder's 6 files and 118 tests, plus this task's 13.

- [ ] **Step 10: Lint and the full suite**

```bash
pnpm lint
pnpm test:run
```

Expected: both exit 0 with no failures. `test:run` also runs the 27 `scripts/` test files; `src` alone is 93 files and 1,063 tests (main's 92 and 1,050, plus this file's 13).

- [ ] **Step 11: Commit**

After the owner approves, with the Bash tool. Stage first, as its own call:

```bash
git add src/app-bridge.ts src/tools/analytics/voteLogTypes.ts src/tools/analytics/activity/ActivityView.stories.tsx src/tools/analytics/activity/__tests__/activityModel.test.ts src/tools/analytics/cards/__tests__/bridgeContract.test.ts
```

Then commit, as its own call and unpiped:

```bash
USER_APPROVED=1 git commit -m "feat(cards): bridge the synergy, tier and autocomplete names and type the vote values (#24)"
```

Husky's pre-commit runs lint and the tests. If Vitest fails to start its workers under load, stop any preview servers, wait for other sessions' runs to finish, and retry.

### Notes for later tasks

- **Bridge line numbers after this task.** Lines `:1-31` stay put. `TRUNCATE` moves from `:32` to `:33`. The lines from `blackRgba` (`:33`) to `LinkButton` (`:45`) move down 2, so `hexRgba` goes from `:34` to `:36`: R3-5b's Interfaces cite it at `:34`. The CardDataContext export and `CardTile` (`:47-51`) move down 8, to `:55-59`. Everything from the RaritySymbol comment (`:53`) on moves down 21, so `:53-64` become `:74-85`.
- **R3-3 (card vote model):**
  - With the narrowed fields, an answer table can be a `Record<NonNullable<VoteLogRow['accuracy']>, number>`, and a missed case fails typecheck.
  - Reuse what already exists rather than redeclaring the words:
    - `activityModel.ts`'s `carriesLabel` (`:315-329`) already names all four carries;
    - `VoteDetailTable.tsx`'s private `accuracyLabel` (`:19-24`) maps −1, 0 and 1 to "too high", "right" and "too low". R3-3 or R3-6 can export it, with its parameter narrowed to `VoteLogRow['accuracy']`.
- **R3-4 (engine model and hook):**
  - Step 1's check has to match the `scoreUtils` export broken across lines. `grep -nE "TIER_COLORS,|export \{fetchCardSynergies\}|^  getStrengthTier,$" src/app-bridge.ts` prints its three lines, `:32`, `:67` and `:71`. The one-line pattern `export \{getStrengthTier, type StrengthTierLabel\}` finds nothing.
  - Type the data as `CardSynergies = Awaited<ReturnType<typeof fetchCardSynergies>>`. The bridge offers no `PrecomputedPairData` (R-55).
  - R-45's Retry appears only for a rejection. A 5xx resolves as an empty result and is kept for the session, so the hedged Empty copy is what the page shows (the contract test's "a 500" row).
- **R3-5 (switcher):**
  - `Z_INDEX.autocomplete` (900) sits under DialogShell's layers (999 and 1000).
  - "No cards match." is computed as `searchCardsByName(cards, query).length === 0` on the live query, shown only while the list is closed (R-30).
  - The hook's `maxResults` defaults to 10, and R-30 passes 6.

<!--
Review of 2026-10-06 (12 notes), applied to this file:
- 1: kept the multi-line exports; added the "Contract addition 5 changes with it" re-base note and an R3-4 bullet under "Notes for later tasks" with the new Step 1 grep (checked against the bridge with Step 4 applied: it prints :32, :67 and :71). The re-base note says "the R3 header's addition 5" instead of "R3-card-analytics.md:121/:126", because R3-card-analytics.md is a scratch name and its line numbers move when the plan is assembled.
- 2: Step 11 now uses the header's commit message.
- 3: R3-1 kept as written; the "Not taken" bullet now says R3-9 drafts the follow-up issue (R3-9 Step 19, draft 4, already does).
- 4, 5, 6, 7, 8, 10: applied as given (each checked against the repo, the pin and the local app clone's bc877e1..cc8e7e1 diff).
- 9: the "When the plan is assembled" bullet is now "The bridge record", pointing to R3-9 (Step 21, item 20 already holds the line); the stale header sentence is gone.
- 11: nothing to change in R3-1.

Partly rejected:
- 12: the note's shift figures ("after :31 by 2, after :46 by 6, after :52 by 18") are wrong. Diffing HEAD's bridge against the bridge with Step 4 applied gives :32 +1, :33-45 +2, :47-51 +8 and :53-64 +21. "Notes for later tasks" uses those.
-->
