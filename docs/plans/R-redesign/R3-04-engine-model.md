> Part of [R: Admin redesign](../R-redesign.md), phase R3 ([R3-card-analytics.md](R3-card-analytics.md)). Read the main plan's decisions (R-28 to R-56 for R3), corrections, global constraints and shared interfaces, then the R3 header, first.

> **Re-base notes (R3-4, 2026-10-06).** Re-based from the 2026-10-01 outline onto main @ `aea40b4` (R2 as built), the app pin `upstream/inkweave` @ `bc877e1` and decisions R-28 to R-56, using the audit's evidence (`audit-R3-4.json`, re-checked where this task relies on it). What changed and why:
> 1. **The partner order follows R-37: score, then name.** Engine scores are whole numbers, and the audit found the 12th place inside a tie on 85 of 89 sampled cards with more than 12 partners. The outline's tie-break, `a.id.localeCompare(b.id)`, drew an arbitrary slice (`"14207"` sorts before `"2983"`), and `localeCompare` with no locale depends on the viewer's browser.
>    - `byStrength` is a private named comparator: score, highest first, then name through a module-level `Intl.Collator('en')`, then id by code unit, as `scatter.ts:218` and `activityModel.ts:280` break ties. The order is total and the same in every browser.
>    - The engine cuts each group the same way, by score and then `card.name.localeCompare` (`SynergyEngine.ts:124-128`), in its build's locale.
>    - The synergy file carries no names, so `enginePartners` takes a lookup: `enginePartners(data, nameOf)`. `EnginePartner` gains `name`, the name it was sorted by.
>    - The card page passes the card list's full name. R3-6c builds the lookup from the `getCardById` the view takes: `(id) => getCardById(id)?.fullName ?? id`. A full name starts with the card's name, so the order is by name, and then by version for same-named printings, never by id. The table, which prints full names, then reads alphabetically within each score.
> 2. **The tie at the cut is computed here (R-37).** New `tieAtCut(partners, shown)` returns `{score, drawn, tied}` when the cut at `shown` splits a tie, and null otherwise. R3-6c's subtitle reads it, for example "12 of the 30 partners at score 8, by name". `shown` is a parameter because `NETWORK_MAX_NODES` (12) arrives with R3-4b, after this task.
> 3. **`rules` becomes `ruleNames` (R-34), in the file's order.**
>    - The engine keys each pair's connections by rule id and keeps the higher score (`SynergyEngine.ts:226-251`, the lookup at :234). It then sorts them strongest first (:256), and the precompute writes them in that order (`precompute-synergies.mjs:113-116`). So each name appears once, strongest first, and `pair.connections.map((c) => c.ruleName)` is the whole job.
>    - The outline's `Set` and re-sort, and its "Ramp 5, Shift Targets 8 and Ramp 7" fixture, described a pair the engine can't write. The audit's live check found no repeated rule id in any of the 1,041 files.
>    - The new name keeps it apart from `PairStat.rules` and R3-2's `CardPair.rules`, which hold rule ids.
> 4. **`engineSummary(partners, groups)`**, not `engineSummary(data)`. The outline's version called `enginePartners` again, so the card page mapped and sorted every partner (up to 207 live) twice per render.
> 5. **`TIER_COLOR`**, a `Record<StrengthTierLabel, string>` of the `TIER_COLORS` entries, is exported. `TIER_SERIES` maps `TIER_ORDER` over it, as `BAND_SERIES` maps `SCORE_BANDS` over `BAND_FILL` (`activity/activityChart.ts:15-39`).
>    - R3-6c reads `TIER_COLOR[partner.tier]` in place of `TIER_SERIES.find(...)?.color`, and R3-4b's stories read it in place of their own `Map`.
>    - The labels keep the app's thresholds (R-44). A test now pins each label to `getStrengthTier`'s cut-off, so a pin bump that moves a threshold fails here.
> 6. **The hook is written out, and returns `retry` (R-45).**
>    - The outline gave the hook in prose only. Here it keeps the last settled fetch with the card id and the try (`attempt`) it answers, and derives `loading` when they don't match the current ones. The app's own hook works the same way (`stateForCard`, `usePrecomputedSynergies.ts:190-199`).
>    - So the render where the id changes, or where Retry is pressed, never shows the previous card's file or the old error.
>    - The effect never sets state synchronously, which `react-hooks/set-state-in-effect` would fail.
>    - `retry` bumps `attempt`. The effect then fetches again, and `fetchCardSynergies` goes back to the network, because it never caches a rejection (`usePrecomputedSynergies.ts:55`, `:63`).
>    - The cancelled flag stays, as `useVoteAnalytics` has it. A test proves it is needed: A, then B, then A again, with B's late answer arriving last.
> 7. **The synergy fixtures live in `cards/cardFixtures.ts`, the plain module R3-2 creates.** Storybook reads every named export of a `.stories.tsx` file as a story, and a story can't import a test file (`calibration/chartFixtures.ts:5-12`). R3-6c's tests and stories need the same data.
>    - The builder takes one array of objects, `engineFixture(partners)`, not positional arguments.
>    - It returns the file together with its name lookup.
>    - Four named results: `ENGINE_EMPTY`, `ENGINE_ONE_PARTNER`, `ENGINE_FIFTEEN` (the cut at 12 inside a tie) and `ENGINE_CAPPED` (142 partners, a 100-partner group, the 12 drawn all from a 30-way tie).
> 8. **Test hygiene.**
>    - **Mock reset.** The hoisted mock is reset in a block-bodied `beforeEach` (`useLiveTuning.test.ts:17-20`). Without it, "no card fetches nothing" depended on test order: `vite.config.ts` sets no `clearMocks`.
>    - **Deferred promises.** The late-answer and retry cases settle through deferred promises (`useLiveTuning.test.ts:37-38`).
>    - **Bridge mock.** It spreads `importOriginal` (`CalibrationCharts.test.tsx:18-22`), as the header's shared mock does, so every other bridge name stays real and only `fetchCardSynergies` is swapped. The outline cited `useRevealAdmin.test.ts:12-13`.
>    - **Tables.** Repeated cases are `it.each` tables, not repeated `expect` blocks.
> 9. **Prerequisites, now named.**
>    - R3-1 bridges the four names this task consumes: `fetchCardSynergies`, `getStrengthTier`, `type StrengthTierLabel` and `TIER_COLORS`. None of them is in `src/app-bridge.ts` today (:15-64).
>    - R3-2 creates `cardFixtures.ts`.
>    - Step 1 checks both.
> 10. **Facts re-checked at the pin `bc877e1`.**
>     - `fetchCardSynergies` is at `usePrecomputedSynergies.ts:51-66`, and `PrecomputedCardData` is still private (:35-38).
>     - `getStrengthTier`'s cut-offs are ≥9.5, ≥7 and ≥4 (`scoreUtils.ts:18-23`).
>     - `TIER_COLORS` is at `theme.ts:363-368`.
>     - `maxResultsPerGroup` defaults to 100 (`SynergyEngine.ts:37`), and each group is cut at :130.
>     - `aggregateScore` is the strongest connection (:20-24), and vote analytics uses the same number as `engineScore` (`precompute-vote-analytics.mjs:77`).
>     - The cap count is the audit's live figure from 2026-10-06; it was not re-run here.
> 11. **Dropped from the outline.**
>     - The `rules` `Set` and re-sort, and the repeated-rule fixture (note 3).
>     - "A pair with no connections gives `[]`". A pair is written only for a group member, which a rule found, and the case tested `[].map` alone.
>     - The id tie-break (note 1).
> 12. **This changes the header's contract addition 10.** The R3-6c draft already uses this task's names, so the header changes to match, not the plan:
>     - `EnginePartner` gains `name`.
>     - `tieCut`/`TieCut {shown}` becomes `tieAtCut(partners, shown)`/`CutTie {drawn}`. The two words swap meaning: the header's `TieCut.shown` is this task's `CutTie.drawn`, and its `tieCut(…, drawn)` argument is `tieAtCut`'s `shown`.
>     - `TIER_COLOR` is new.
>     - The synergy builder is `engineFixture(partners)`, returning `{data, nameOf}`.
>     - The R3 header's contract addition 10 and its Fixtures bullet already carry these names.
>
> **Verified (2026-10-06)** in `scratchpad/r3-rebase/sandbox-r34`: copies of `src/` and the configs, with junctions to the repo's `node_modules` and `upstream/`, and the Vite and tsc caches kept in the sandbox. Its `app-bridge.ts` carries R3-1's three edits (`TIER_COLORS` between `SPACING` and `TRUNCATE`, and the two exports after `smallImageUrl`), and its `cardFixtures.ts` holds a stand-in header plus Step 2's block. The repo's tree and caches were not touched. Re-run against R3-1's exact Step 4 edits (multi-line exports) in `sandbox-r34-adv`, with the real `cardFixtures.ts` that R3-2, R3-3 and R3-5 build plus Step 2's import and block: same results (Step 5's failure, 35 of 35 after Step 7, `tsc -p tsconfig.app.json` exit 0, lint clean, CodeScene 10.0), and Step 1's grep prints `:32`, `:67`, `:71` and `:72`.
> - **Before the implementation.** Step 5 gives `Test Files  2 failed (2)` and `Tests  no tests`, with the two "Failed to resolve import" messages quoted there.
> - **After it.** Step 8 gives `Test Files  2 passed (2)` and `Tests  35 passed (35)`: 28 in the model test and 7 in the hook test. A probe with `renderHook(..., {reactStrictMode: true})` also settled and retried under StrictMode; it is not part of the plan.
> - **Mutants.** 15 mutants were run against the two test files, and all 15 were killed:
>   - the hook: no cancelled flag, no `attempt` match, no null early return, no effect guard, no `asError`, and `retry` as a no-op;
>   - the order: no name key, and the id before the name;
>   - the rules reversed;
>   - the cap with `>`;
>   - `tieAtCut`: `>` at the end, `drawn` over the whole list, and no `shown < 1`;
>   - a wrong "Strong" label;
>   - `nameOf` ignored.
> - **Typecheck.** `tsc -p tsconfig.app.json` is clean on the whole app project, every bridged app module included. It first caught the null-id test's `initialProps` widening, which Step 4's `null as string | null` fixes.
> - **Lint.** `pnpm exec eslint --max-warnings 0 --stdin --stdin-filename src/tools/analytics/cards/<file>`, run from the repo, is clean on all five files: React Compiler, react-hooks 7 (`set-state-in-effect` included), the `inkweave/*` token rules, and the memo ban.
> - **CodeScene.** The local CodeScene (MCP 1.1.3) scores all five files 10.0 with no findings. That is not proof: the server gate is stricter (R-redesign: it failed R2 on `chartData.ts`'s primitives), so run `analyze_change_set` before the push.
>   - Every named function is cyclomatic complexity 5 or less (`byStrength` is the highest, with its two `||` and the code-unit ternary).
>   - Every function takes 2 arguments or fewer.
>   - The only primitive parameters are `tieAtCut`'s `shown`, the hook's `cardId` and the fixtures' `ruleIdOf(ruleName)`.

### Task R3-4: Engine view model and synergy hook

**Files:**
- Create `src/tools/analytics/cards/engineView.ts`: the model.
- Create `src/tools/analytics/cards/useCardSynergies.ts`: the hook.
- Modify `src/tools/analytics/cards/cardFixtures.ts` (R3-2 creates it): one `import type` line, and the engine fixtures appended. Nothing in the app imports it, so the build leaves it out.
- Test `src/tools/analytics/cards/__tests__/engineView.test.ts`.
- Test `src/tools/analytics/cards/__tests__/useCardSynergies.test.ts`.
- No other file changes. The task has no component and so no story. R3-6c's tests and stories use the fixtures.

**Interfaces:**
- **Consumes:**
  - From the bridge, all added by R3-1:
    - `fetchCardSynergies(cardId: string): Promise<PrecomputedCardData>` (`usePrecomputedSynergies.ts:51-66`). It caches each id for the session (:42). A non-OK or non-JSON response becomes a cached empty result `{groups: [], pairs: {}}` (:57, :61). It rejects on a network failure (:55) or malformed JSON (:63), and never caches a rejection.
    - `getStrengthTier(score: number): StrengthTier` and `type StrengthTierLabel = 'Perfect' | 'Strong' | 'Moderate' | 'Weak'` (`scoreUtils.ts:4`, `:18-23`).
    - `TIER_COLORS` (`theme.ts:363-368`): `{perfect, strong, moderate, weak}`, each `{color, bg}`.
  - `type SeriesDef` (`src/charts/series.ts:39-45`).
  - The engine's pair shape through `CardSynergies`. `pairs[id].connections` is `PairSynergyConnection[]`, each with `ruleId`, `ruleName`, `score`, `explanation` and `category` (`packages/synergy-engine/src/types/synergy.ts:49-66`). `groups[].synergies` is the group's members, by `cardId`.
  - For the tests: `renderHook`, `act` and `waitFor` from `@testing-library/react`.
- **Produces:**
```ts
// src/tools/analytics/cards/engineView.ts
export type CardSynergies = Awaited<ReturnType<typeof fetchCardSynergies>>;   // the app keeps PrecomputedCardData private
export const ENGINE_GROUP_CAP = 100;                                          // SynergyEngine maxResultsPerGroup default (SynergyEngine.ts:37)
export interface EnginePartner {id: string; name: string; score: number; tier: StrengthTierLabel; ruleNames: string[]}
export interface EngineSummary {partners: number; capped: boolean; tiers: Record<StrengthTierLabel, number>}
export interface CutTie {score: number; drawn: number; tied: number}          // `drawn` of the `tied` partners at `score` make the cut
export const TIER_ORDER: readonly StrengthTierLabel[];                        // Perfect, Strong, Moderate, Weak
export const TIER_COLOR: Readonly<Record<StrengthTierLabel, string>>;         // each tier's TIER_COLORS[...].color (R-15)
export const TIER_SERIES: readonly SeriesDef[];                               // id = tier, label "Strong ≥7" (R-44), colour TIER_COLOR
export function enginePartners(data: CardSynergies, nameOf: (id: string) => string): EnginePartner[]; // score desc, then name, then id (R-37)
export function engineSummary(partners: readonly EnginePartner[], groups: CardSynergies['groups']): EngineSummary;
export function tieAtCut(partners: readonly EnginePartner[], shown: number): CutTie | null;      // null: the cut falls between scores, or cuts nothing

// src/tools/analytics/cards/useCardSynergies.ts
export interface UseCardSynergiesReturn {data: CardSynergies | null; loading: boolean; error: Error | null; retry: () => void}
export function useCardSynergies(cardId: string | null): UseCardSynergiesReturn;   // null: no fetch, not loading

// src/tools/analytics/cards/cardFixtures.ts (tests and stories only)
export interface FixturePartner {id: string; name: string; score: number; rules?: readonly string[]}  // rules: strongest first, default ['Ramp']
export interface EngineFixture {data: CardSynergies; nameOf: (id: string) => string}
export function engineFixture(partners: readonly FixturePartner[]): EngineFixture;   // one group per rule; aggregateScore = score
export const ENGINE_EMPTY: EngineFixture;         // {groups: [], pairs: {}}
export const ENGINE_ONE_PARTNER: EngineFixture;   // 401, score 6
export const ENGINE_FIFTEEN: EngineFixture;       // 10, 9, 9, 8, 8, eight at 7, 5, 3: the cut at 12 splits the 7s (7 of 8)
export const ENGINE_CAPPED: EngineFixture;        // 142 partners, Ramp group at 100; 30 at 8, 70 at 6, 42 at 3
```

**How it works:**
- **Partners** are the keys of `pairs`, so a partner that appears in several groups counts once. The precompute builds `pairs` only from group members (`precompute-synergies.mjs:101-117`).
- **Score.** `score` is the pair's `aggregateScore`, its strongest connection (`SynergyEngine.ts:20-24`). `tier` is `getStrengthTier(score).label`.
- **Order (R-37).** Score, highest first; then name, through `Intl.Collator('en')`; then id by code unit.
  - The engine cuts its groups by score and then name too (`SynergyEngine.ts:124-128`). It uses `localeCompare` in its build's locale; the fixed `'en'` gives every viewer the same 12.
  - The id only orders two partners with the same score and the same name.
- **`ruleNames`** is the pair's `connections[].ruleName` in the file's order: one per rule, strongest first (note 3).
- **`capped`** is true when any group lists `ENGINE_GROUP_CAP` (100) partners, because the engine cuts every group to its top 100 (`SynergyEngine.ts:130`).
  - The partner count is then a lower bound.
  - The audit's live check on 2026-10-06: 147 of the 1,041 cards with a synergy file had a group at the cap, and the largest had 207 partners.
- **`tieAtCut(partners, shown)`** looks at the last partner the cut keeps and the first one it drops.
  - If their scores differ, the cut falls between two scores and it returns null.
  - If they match, it returns `{score, drawn, tied}`: `tied` counts every partner at that score, and `drawn` counts those that make the cut.
  - It also returns null when nothing is cut (`shown` ≥ the partner count) or when `shown` < 1.
- **An empty result** can mean "no synergies" or "file unreadable". `fetchCardSynergies` caches a non-OK or non-JSON response as empty (`:57`, `:61`), so the hook can't tell the two apart, and the Empty copy hedges for it.
  - Such a result is cached for the session, so it raises no error and offers no Retry. A full page reload clears it.
- **The hook** keeps `settled = {cardId, attempt, data, error}` and returns, in order:
  - nothing and not loading when `cardId` is null;
  - loading when `settled` answers another card or another try;
  - otherwise the settled file or error.
- **The effect** fetches on every change of `[cardId, attempt]`. A cancelled flag drops the answer of any fetch the next run replaced (`useVoteAnalytics.ts:21-39`).
  - `retry()` bumps `attempt`. The same render reads loading with the error cleared, and the effect fetches again.
  - Two harmless costs, both shared with the app's hook:
    - `fetchCardSynergies` has no synchronous read (unlike `cachedAdminData`), so going back to a cached card shows one loading render.
    - Under StrictMode (`src/main.tsx:10`) the dev build fetches a new card twice, because in-flight requests aren't shared.

- [ ] **Step 1: Check what this task builds on**

R3-1 and R3-2 come first. Run:
```bash
grep -nE "TIER_COLORS,|export \{fetchCardSynergies\}|getStrengthTier,|type StrengthTierLabel," src/app-bridge.ts
ls src/tools/analytics/cards/cardFixtures.ts
```
Expected:
- the grep prints four lines: `TIER_COLORS,` in the constants block, the `fetchCardSynergies` export, and `getStrengthTier,` and `type StrengthTierLabel,` inside the scoreUtils export (R3-1 breaks that export across lines);
- `ls` prints the path.

If any is missing, stop: R3-1 or R3-2 hasn't landed. The tests reach the engine through the bridge, so on a fresh checkout, or after a pin bump, run `pnpm build:engine` once first.

- [ ] **Step 2: Add the engine fixtures**

In `src/tools/analytics/cards/cardFixtures.ts`:
- Add this line as the last import, after R3-3's `import type {VoteLogRow} from '../voteLogTypes';`, so the imports stay sorted by path:
  ```ts
  import type {CardSynergies} from './engineView';
  ```
  It is type-only and erased at runtime, so the module still loads before `engineView.ts` exists (Step 5). Typecheck fails until Step 6 adds it.
- Append this block at the end of the file:
```ts
// ── Engine fixtures (R3-4) ──

/** One partner in a synergy-file fixture. `rules`: the pair's rule names, strongest first (default ['Ramp']). */
export interface FixturePartner {
  id: string;
  name: string;
  score: number;
  rules?: readonly string[];
}

/** A synergy file, and the name lookup the card page would build from the card list. */
export interface EngineFixture {
  data: CardSynergies;
  nameOf: (id: string) => string;
}

type FixtureGroup = CardSynergies['groups'][number];
type FixtureConnection = CardSynergies['pairs'][string]['connections'][number];

const rulesOf = (partner: FixturePartner): readonly string[] => partner.rules ?? ['Ramp'];
/** A rule's id from its name, as the engine's ids read: 'Shift Targets' is 'shift-targets'. */
const ruleIdOf = (ruleName: string): string => ruleName.toLowerCase().replaceAll(' ', '-');

/** The pair's connections, one per rule, strongest first and a point apart, as the engine writes them. */
function connectionsOf(partner: FixturePartner): FixtureConnection[] {
  return rulesOf(partner).map((ruleName, i) => ({
    category: 'direct' as const,
    ruleId: ruleIdOf(ruleName),
    ruleName,
    score: Math.max(1, partner.score - i),
    explanation: `${ruleName} connects the two.`,
  }));
}

/** One group per rule, in order of first use, listing every partner the rule connects. */
function groupsOf(partners: readonly FixturePartner[]): FixtureGroup[] {
  const rules = [...new Set(partners.flatMap(rulesOf))];
  return rules.map((ruleName) => ({
    groupKey: ruleIdOf(ruleName),
    category: 'direct' as const,
    label: ruleName,
    tagline: `${ruleName} pairs.`,
    description: `Cards ${ruleName} connects.`,
    synergies: partners
      .filter((partner) => rulesOf(partner).includes(ruleName))
      .map((partner) => ({
        cardId: partner.id,
        score: partner.score,
        explanation: `${ruleName} connects the two.`,
        ruleId: ruleIdOf(ruleName),
        ruleName,
      })),
  }));
}

/**
 * A synergy file shaped as precompute-synergies.mjs writes it: one group per
 * rule, and one `pairs` entry per partner whose aggregateScore is its score.
 */
export function engineFixture(partners: readonly FixturePartner[]): EngineFixture {
  const names = new Map(partners.map((partner) => [partner.id, partner.name]));
  return {
    data: {
      groups: groupsOf(partners),
      pairs: Object.fromEntries(
        partners.map((partner) => [partner.id, {connections: connectionsOf(partner), aggregateScore: partner.score}]),
      ),
    },
    nameOf: (id) => names.get(id) ?? id,
  };
}

/** No synergies: what fetchCardSynergies caches for a missing or unreadable file. */
export const ENGINE_EMPTY: EngineFixture = engineFixture([]);

/** One partner. */
export const ENGINE_ONE_PARTNER: EngineFixture = engineFixture([
  {id: '401', name: 'Marigold Finch - Lamplighter', score: 6},
]);

/**
 * 15 partners in every tier: 10, 9, 9, 8, 8, eight at 7, then 5 and 3. The
 * cut at 12 falls inside the eight at 7, so 7 of them are drawn, by name: the
 * thirteenth is Yara Stormwick (id 306), though its id is the lowest of the
 * eight. Wren Ashdown sits in two groups.
 */
export const ENGINE_FIFTEEN: EngineFixture = engineFixture([
  {id: '301', name: 'Wren Ashdown - Keeper of Keys', score: 10, rules: ['Shift Targets', 'Ramp']},
  {id: '302', name: 'Tobias Quill - Archivist', score: 9},
  {id: '303', name: 'Ada Brightwater - Tidecaller', score: 9, rules: ['Singer']},
  {id: '304', name: 'Pell - Tinker', score: 8},
  {id: '305', name: 'Moss - Wanderer', score: 8, rules: ['Singer']},
  {id: '306', name: 'Yara Stormwick - Captain', score: 7},
  {id: '307', name: 'Bramble - Hedge Witch', score: 7},
  {id: '308', name: 'Odette Fernsby - Seamstress', score: 7, rules: ['Shift Targets']},
  {id: '309', name: 'Kit Marlow - Pickpocket', score: 7},
  {id: '310', name: 'Ezra Vale - Cartographer', score: 7},
  {id: '311', name: 'Cinder - Ember Sprite', score: 7},
  {id: '312', name: 'Hollis Grey - Lantern Keeper', score: 7},
  {id: '313', name: 'Uma Lark - Songbird', score: 7, rules: ['Singer']},
  {id: '314', name: 'Garnet - Stonecutter', score: 5},
  {id: '315', name: 'Lumen - Glowworm', score: 3},
]);

/**
 * 142 partners, 100 of them in the Ramp group: the engine's cap, so the count
 * is a floor. The 30 strongest share a score of 8, so the 12 drawn all come
 * from that tie (R-37's example). Ramp: 30 at 8, 70 at 6; Shift Targets: 42 at 3.
 */
export const ENGINE_CAPPED: EngineFixture = engineFixture(
  Array.from({length: 142}, (_, i) => ({
    id: String(2001 + i),
    name: `Partner ${String(i + 1).padStart(3, '0')}`,
    score: i < 30 ? 8 : i < 100 ? 6 : 3,
    rules: i < 100 ? ['Ramp'] : ['Shift Targets'],
  })),
);
```

- [ ] **Step 3: Write the failing model test**

Create `src/tools/analytics/cards/__tests__/engineView.test.ts`:
```ts
import {describe, expect, it} from 'vitest';
import {TIER_COLORS, getStrengthTier} from '../../../../app-bridge';
import {
  ENGINE_CAPPED,
  ENGINE_EMPTY,
  ENGINE_FIFTEEN,
  ENGINE_ONE_PARTNER,
  engineFixture,
  type EngineFixture,
} from '../cardFixtures';
import {
  ENGINE_GROUP_CAP,
  TIER_COLOR,
  TIER_ORDER,
  TIER_SERIES,
  enginePartners,
  engineSummary,
  tieAtCut,
} from '../engineView';

const partnersOf = ({data, nameOf}: EngineFixture) => enginePartners(data, nameOf);

describe('enginePartners', () => {
  it('lists every partner once, with its name, score, tier and the rules behind the pair', () => {
    const partners = partnersOf(ENGINE_FIFTEEN);
    expect(partners).toHaveLength(15);
    expect(partners[0]).toEqual({
      id: '301',
      name: 'Wren Ashdown - Keeper of Keys',
      score: 10,
      tier: 'Perfect',
      ruleNames: ['Shift Targets', 'Ramp'],
    });
  });

  it('orders by score, then name, so the cut at 12 inside a tie keeps the names that come first', () => {
    expect(partnersOf(ENGINE_FIFTEEN).map((partner) => partner.id)).toEqual([
      '301',
      '303',
      '302',
      '305',
      '304',
      '307',
      '311',
      '310',
      '312',
      '309',
      '308',
      '313',
      '306',
      '314',
      '315',
    ]);
  });

  it('breaks a tie on score and name by id, in code-unit order', () => {
    const twins = engineFixture([
      {id: '9', name: 'Pell - Tinker', score: 8},
      {id: '10', name: 'Pell - Tinker', score: 8},
      {id: '2', name: 'Ada - Tidecaller', score: 8},
    ]);
    expect(partnersOf(twins).map((partner) => partner.id)).toEqual(['2', '10', '9']);
  });

  it('names a partner by the lookup it is given', () => {
    expect(enginePartners(ENGINE_ONE_PARTNER.data, (id) => `#${id}`)[0].name).toBe('#401');
  });

  it("keeps the file's rule order: the engine keeps one connection per rule, strongest first", () => {
    const rules = ['Singer', 'Ramp', 'Shift Targets'];
    const [partner] = partnersOf(engineFixture([{id: '1', name: 'A', score: 9, rules}]));
    expect(partner.ruleNames).toEqual(rules);
  });

  it.each([
    [10, 'Perfect'],
    [9.5, 'Perfect'],
    [9.49, 'Strong'],
    [7, 'Strong'],
    [6.99, 'Moderate'],
    [4, 'Moderate'],
    [3.99, 'Weak'],
  ])("tiers a pair scoring %s as %s, getStrengthTier's label", (score, tier) => {
    expect(partnersOf(engineFixture([{id: '1', name: 'A', score}]))[0].tier).toBe(tier);
  });

  it('gives no partners for an empty file', () => {
    expect(partnersOf(ENGINE_EMPTY)).toEqual([]);
  });
});

describe('engineSummary', () => {
  const summaryOf = (fixture: EngineFixture) => engineSummary(partnersOf(fixture), fixture.data.groups);

  it('counts a partner in two groups once, and counts every tier', () => {
    expect(ENGINE_FIFTEEN.data.groups.flatMap((group) => group.synergies)).toHaveLength(16);
    expect(summaryOf(ENGINE_FIFTEEN)).toEqual({
      partners: 15,
      capped: false,
      tiers: {Perfect: 1, Strong: 12, Moderate: 1, Weak: 1},
    });
  });

  it('is capped once a group lists ENGINE_GROUP_CAP partners, and not one short of it', () => {
    expect(ENGINE_GROUP_CAP).toBe(100);
    expect(summaryOf(ENGINE_CAPPED)).toMatchObject({partners: 142, capped: true});
    const underCap = engineFixture(
      Array.from({length: ENGINE_GROUP_CAP - 1}, (_, i) => ({id: String(i + 1), name: `Card ${i + 1}`, score: 6})),
    );
    expect(summaryOf(underCap)).toMatchObject({partners: 99, capped: false});
  });

  it('gives 0 partners and no tiers for an empty file', () => {
    expect(summaryOf(ENGINE_EMPTY)).toEqual({
      partners: 0,
      capped: false,
      tiers: {Perfect: 0, Strong: 0, Moderate: 0, Weak: 0},
    });
  });
});

describe('tieAtCut', () => {
  it('counts the tie that the cut splits: 7 of the 8 partners at 7 make the 12', () => {
    expect(tieAtCut(partnersOf(ENGINE_FIFTEEN), 12)).toEqual({score: 7, drawn: 7, tied: 8});
  });

  it('counts a tie that holds every drawn partner', () => {
    expect(tieAtCut(partnersOf(ENGINE_CAPPED), 12)).toEqual({score: 8, drawn: 12, tied: 30});
  });

  it.each([
    ['the cut falls between two scores', ENGINE_FIFTEEN, 13],
    ['no partner is past the cut', ENGINE_FIFTEEN, 15],
    ['there are fewer partners than the cut', ENGINE_ONE_PARTNER, 12],
    ['there are no partners', ENGINE_EMPTY, 12],
    ['the cut is 0', ENGINE_FIFTEEN, 0],
  ])('is null when %s', (_, fixture, shown) => {
    expect(tieAtCut(partnersOf(fixture), shown)).toBeNull();
  });
});

describe('TIER_SERIES', () => {
  it('lists the tiers strongest first, each in its TIER_COLORS entry', () => {
    expect(TIER_ORDER).toEqual(['Perfect', 'Strong', 'Moderate', 'Weak']);
    expect(TIER_SERIES.map((series) => series.id)).toEqual(TIER_ORDER);
    expect(TIER_SERIES.map((series) => series.color)).toEqual([
      TIER_COLORS.perfect.color,
      TIER_COLORS.strong.color,
      TIER_COLORS.moderate.color,
      TIER_COLORS.weak.color,
    ]);
    expect(TIER_SERIES.map((series) => series.color)).toEqual(TIER_ORDER.map((tier) => TIER_COLOR[tier]));
  });

  it.each([
    ['Perfect', 'Perfect ≥9.5', 9.5],
    ['Strong', 'Strong ≥7', 7],
    ['Moderate', 'Moderate ≥4', 4],
  ])("labels %s with getStrengthTier's own cut-off", (tier, label, cutOff) => {
    expect(TIER_SERIES.find((series) => series.id === tier)?.label).toBe(label);
    expect(getStrengthTier(cutOff).label).toBe(tier);
    expect(getStrengthTier(cutOff - 0.01).label).not.toBe(tier);
  });

  it('labels Weak as everything under Moderate', () => {
    expect(TIER_SERIES.at(-1)?.label).toBe('Weak <4');
    expect(getStrengthTier(3.99).label).toBe('Weak');
    expect(getStrengthTier(4).label).toBe('Moderate');
  });
});
```

- [ ] **Step 4: Write the failing hook test**

Create `src/tools/analytics/cards/__tests__/useCardSynergies.test.ts`:
```ts
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from '@testing-library/react';
import {ENGINE_EMPTY, ENGINE_FIFTEEN, ENGINE_ONE_PARTNER} from '../cardFixtures';
import type {CardSynergies} from '../engineView';
import {useCardSynergies} from '../useCardSynergies';

// fetchCardSynergies caches each id for the session in module state
// (usePrecomputedSynergies.ts:42), so the tests mock it through the bridge and
// keep the rest of the bridge real.
const fetchCardSynergies = vi.hoisted(() => vi.fn());
vi.mock('../../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../app-bridge')>()),
  fetchCardSynergies,
}));

beforeEach(() => {
  // A block, not an arrow's value: mockReset() returns the mock, and Vitest calls a function a hook returns as its teardown.
  fetchCardSynergies.mockReset();
  fetchCardSynergies.mockResolvedValue(ENGINE_EMPTY.data);
});

/** A fetch that settles when the test says. */
function deferred() {
  let resolve: (data: CardSynergies) => void = () => {};
  let reject: (err: unknown) => void = () => {};
  const promise = new Promise<CardSynergies>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {promise, resolve, reject};
}

describe('useCardSynergies', () => {
  it('reads as loading, then gives the card’s synergy file', async () => {
    fetchCardSynergies.mockResolvedValueOnce(ENGINE_FIFTEEN.data);
    const {result} = renderHook(() => useCardSynergies('301'));
    expect(result.current).toMatchObject({data: null, loading: true, error: null});

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({data: ENGINE_FIFTEEN.data, error: null});
    expect(fetchCardSynergies).toHaveBeenCalledExactlyOnceWith('301');
  });

  it('says why the fetch failed, and gives no file', async () => {
    fetchCardSynergies.mockRejectedValueOnce(new SyntaxError('Unexpected end of JSON input'));
    const {result} = renderHook(() => useCardSynergies('301'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(SyntaxError);
    expect(result.current.error?.message).toBe('Unexpected end of JSON input');
  });

  it('wraps a rejection that is not an Error', async () => {
    fetchCardSynergies.mockRejectedValueOnce('offline');
    const {result} = renderHook(() => useCardSynergies('301'));

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.error?.message).toBe('offline');
  });

  it('fetches again on retry: loading with the error cleared, then the file', async () => {
    fetchCardSynergies.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const {result} = renderHook(() => useCardSynergies('301'));
    await waitFor(() => expect(result.current.error?.message).toBe('Failed to fetch'));

    const second = deferred();
    fetchCardSynergies.mockReturnValueOnce(second.promise);
    act(() => result.current.retry());
    expect(result.current).toMatchObject({data: null, loading: true, error: null});

    await act(async () => second.resolve(ENGINE_FIFTEEN.data));
    expect(result.current).toMatchObject({data: ENGINE_FIFTEEN.data, loading: false, error: null});
    expect(fetchCardSynergies.mock.calls).toEqual([['301'], ['301']]);
  });

  it('reads as loading as soon as the id changes, never with the previous card’s file', async () => {
    fetchCardSynergies.mockResolvedValueOnce(ENGINE_FIFTEEN.data);
    const {result, rerender} = renderHook(({id}) => useCardSynergies(id), {initialProps: {id: '301'}});
    await waitFor(() => expect(result.current.data).toBe(ENGINE_FIFTEEN.data));

    const next = deferred();
    fetchCardSynergies.mockReturnValueOnce(next.promise);
    rerender({id: '401'});
    expect(result.current).toMatchObject({data: null, loading: true, error: null});

    await act(async () => next.resolve(ENGINE_ONE_PARTNER.data));
    expect(result.current).toMatchObject({data: ENGINE_ONE_PARTNER.data, loading: false});
  });

  it('drops a late answer for a card it has moved past, after coming back to the first card too', async () => {
    const first = deferred();
    const other = deferred();
    const back = deferred();
    fetchCardSynergies
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(other.promise)
      .mockReturnValueOnce(back.promise);
    const {result, rerender} = renderHook(({id}) => useCardSynergies(id), {initialProps: {id: '301'}});
    rerender({id: '401'});
    rerender({id: '301'});

    await act(async () => back.resolve(ENGINE_FIFTEEN.data));
    expect(result.current).toMatchObject({data: ENGINE_FIFTEEN.data, loading: false});

    await act(async () => other.resolve(ENGINE_ONE_PARTNER.data));
    await act(async () => first.reject(new TypeError('Failed to fetch')));
    expect(result.current).toMatchObject({data: ENGINE_FIFTEEN.data, loading: false, error: null});
  });

  it('fetches nothing for no card, and drops the file when the card goes', async () => {
    const {result, rerender} = renderHook(({id}) => useCardSynergies(id), {
      initialProps: {id: null as string | null},
    });
    expect(result.current).toMatchObject({data: null, loading: false, error: null});
    expect(fetchCardSynergies).not.toHaveBeenCalled();

    fetchCardSynergies.mockResolvedValueOnce(ENGINE_ONE_PARTNER.data);
    rerender({id: '401'});
    await waitFor(() => expect(result.current.data).toBe(ENGINE_ONE_PARTNER.data));
    rerender({id: null});
    expect(result.current).toMatchObject({data: null, loading: false, error: null});
  });
});
```

- [ ] **Step 5: Run the tests and see them fail**

Run: `pnpm vitest run src/tools/analytics/cards/__tests__/engineView.test.ts src/tools/analytics/cards/__tests__/useCardSynergies.test.ts`

Expected: FAIL, with `Test Files  2 failed (2)` and `Tests  no tests`. Each file fails on its missing module:
- `Failed to resolve import "../engineView" from "src/tools/analytics/cards/__tests__/engineView.test.ts". Does the file exist?`
- `Failed to resolve import "../useCardSynergies" from "src/tools/analytics/cards/__tests__/useCardSynergies.test.ts". Does the file exist?`

- [ ] **Step 6: Write `engineView.ts`**

Create `src/tools/analytics/cards/engineView.ts`:
```ts
import {TIER_COLORS, getStrengthTier, type StrengthTierLabel, type fetchCardSynergies} from '../../../app-bridge';
import type {SeriesDef} from '../../../charts/series';

/*
 * The Engine view's model: what the engine says about one card, read from its
 * precomputed synergy file (/data/synergies/<id>.json, through the bridged
 * fetchCardSynergies). Pure functions; useCardSynergies loads the file, and
 * the Engine panels (R3-6c) draw what these return.
 */

/** What fetchCardSynergies resolves to (the app keeps PrecomputedCardData private). */
export type CardSynergies = Awaited<ReturnType<typeof fetchCardSynergies>>;

/** SynergyEngine's maxResultsPerGroup default (SynergyEngine.ts:37): a group at this size was cut (:130). */
export const ENGINE_GROUP_CAP = 100;

export interface EnginePartner {
  id: string;
  /** The name the caller's lookup gave, or the id for a card it doesn't hold. The order's tie-break. */
  name: string;
  /** The pair's aggregateScore: its strongest connection (SynergyEngine.ts:20-24). */
  score: number;
  tier: StrengthTierLabel;
  /**
   * The names of the rules that connect the pair, in the file's order. The
   * engine keeps one connection per rule and sorts them strongest first
   * (SynergyEngine.ts:227-256), so each name appears once.
   */
  ruleNames: string[];
}

export interface EngineSummary {
  /** Every partner, each once. A floor when `capped`. */
  partners: number;
  /** A group hit ENGINE_GROUP_CAP, so the engine left partners out. */
  capped: boolean;
  tiers: Record<StrengthTierLabel, number>;
}

/** A tie that the cut at `shown` partners splits: `drawn` of the `tied` partners at `score` make the cut. */
export interface CutTie {
  score: number;
  drawn: number;
  tied: number;
}

/** Strongest first, as the network diagram's legend and the tier split read. */
export const TIER_ORDER: readonly StrengthTierLabel[] = ['Perfect', 'Strong', 'Moderate', 'Weak'];

/** Each tier's mark colour: its TIER_COLORS entry, an app entity colour R-15 keeps. */
export const TIER_COLOR: Readonly<Record<StrengthTierLabel, string>> = {
  Perfect: TIER_COLORS.perfect.color,
  Strong: TIER_COLORS.strong.color,
  Moderate: TIER_COLORS.moderate.color,
  Weak: TIER_COLORS.weak.color,
};

/** Each tier with getStrengthTier's own cut-off (scoreUtils.ts:18-23; R-44). */
const TIER_LABEL: Record<StrengthTierLabel, string> = {
  Perfect: 'Perfect ≥9.5',
  Strong: 'Strong ≥7',
  Moderate: 'Moderate ≥4',
  Weak: 'Weak <4',
};

/** The tiers as chart series, strongest first. Each id is its tier label. */
export const TIER_SERIES: readonly SeriesDef[] = TIER_ORDER.map((tier) => ({
  id: tier,
  label: TIER_LABEL[tier],
  color: TIER_COLOR[tier],
}));

/**
 * Names in one order in every browser. The engine cuts each group by score,
 * then name, with localeCompare in the build's locale (SynergyEngine.ts:124-128);
 * a fixed 'en' keeps the viewer's locale out of it.
 */
const NAME_ORDER = new Intl.Collator('en');

/** Score, highest first, then name (R-37), then id by code unit, so the order is total. */
function byStrength(a: EnginePartner, b: EnginePartner): number {
  return b.score - a.score || NAME_ORDER.compare(a.name, b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/**
 * Every partner the engine pairs with this card, in byStrength's order, with
 * the rules behind each pair. A partner in several groups is one key of
 * `pairs`, so it counts once. `nameOf` names a partner: the card page passes
 * the card list's full name, so the order within a score reads alphabetically.
 */
export function enginePartners(data: CardSynergies, nameOf: (id: string) => string): EnginePartner[] {
  return Object.entries(data.pairs)
    .map(([id, pair]) => ({
      id,
      name: nameOf(id),
      score: pair.aggregateScore,
      tier: getStrengthTier(pair.aggregateScore).label,
      ruleNames: pair.connections.map((connection) => connection.ruleName),
    }))
    .sort(byStrength);
}

/**
 * The partner count, whether a group hit the engine's cap (the count is then a
 * floor), and the count per tier. Takes enginePartners' list, so the card page
 * builds it once.
 */
export function engineSummary(partners: readonly EnginePartner[], groups: CardSynergies['groups']): EngineSummary {
  const tiers: Record<StrengthTierLabel, number> = {Perfect: 0, Strong: 0, Moderate: 0, Weak: 0};
  for (const partner of partners) tiers[partner.tier] += 1;
  return {
    partners: partners.length,
    capped: groups.some((group) => group.synergies.length >= ENGINE_GROUP_CAP),
    tiers,
  };
}

/**
 * The tie that cutting enginePartners' list at `shown` splits, or null when
 * the cut falls between two scores or nothing is cut. Engine scores are whole
 * numbers, so the cut usually lands inside a tie, and the network's subtitle
 * says which partners it drew (R-37).
 */
export function tieAtCut(partners: readonly EnginePartner[], shown: number): CutTie | null {
  if (shown < 1 || shown >= partners.length) return null;
  const score = partners[shown - 1].score;
  if (partners[shown].score !== score) return null;
  const atScore = (partner: EnginePartner) => partner.score === score;
  return {
    score,
    drawn: partners.slice(0, shown).filter(atScore).length,
    tied: partners.filter(atScore).length,
  };
}
```

- [ ] **Step 7: Write `useCardSynergies.ts`**

Create `src/tools/analytics/cards/useCardSynergies.ts`:
```ts
import {useEffect, useState} from 'react';
import {fetchCardSynergies} from '../../../app-bridge';
import type {CardSynergies} from './engineView';

export interface UseCardSynergiesReturn {
  data: CardSynergies | null;
  loading: boolean;
  error: Error | null;
  /**
   * Fetches the card's synergy file again (R-45). fetchCardSynergies caches
   * only what it parsed, never a rejection (usePrecomputedSynergies.ts:55, :63),
   * so after an error this goes back to the network.
   */
  retry: () => void;
}

/** How one fetch settled, with the card and the try it answers. */
interface Settled {
  cardId: string;
  attempt: number;
  data: CardSynergies | null;
  error: Error | null;
}

type Outcome = Pick<Settled, 'data' | 'error'>;

const NO_CARD: Outcome & {loading: false} = {data: null, error: null, loading: false};
const LOADING: Outcome & {loading: true} = {data: null, error: null, loading: true};

function asError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

/**
 * Loads one card's precomputed synergy file. It keeps the last settled fetch
 * with the card and try it answers, and reads as loading until that matches
 * the current ones, as the app's own hook does (stateForCard,
 * usePrecomputedSynergies.ts:190-199). So the render where the id changes, or
 * Retry is pressed, never shows the previous card's file or the old error, and
 * the effect never sets state synchronously (react-hooks/set-state-in-effect).
 * A late answer for a card or try no longer current is dropped.
 */
export function useCardSynergies(cardId: string | null): UseCardSynergiesReturn {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);
  const retry = () => setAttempt((n) => n + 1);

  useEffect(() => {
    if (cardId == null) return;
    let cancelled = false;
    const settle = (outcome: Outcome) => {
      if (!cancelled) setSettled({cardId, attempt, ...outcome});
    };
    fetchCardSynergies(cardId).then(
      (data) => settle({data, error: null}),
      (err: unknown) => settle({data: null, error: asError(err)}),
    );
    return () => {
      cancelled = true;
    };
  }, [cardId, attempt]);

  if (cardId == null) return {...NO_CARD, retry};
  if (settled?.cardId !== cardId || settled.attempt !== attempt) return {...LOADING, retry};
  return {data: settled.data, error: settled.error, loading: false, retry};
}
```

- [ ] **Step 8: Run the tests and see them pass**

Run: `pnpm vitest run src/tools/analytics/cards/__tests__/engineView.test.ts src/tools/analytics/cards/__tests__/useCardSynergies.test.ts`

Expected: PASS, with `Test Files  2 passed (2)` and `Tests  35 passed (35)`: 28 in `engineView.test.ts` and 7 in `useCardSynergies.test.ts`. The first run is the slow one (about 20 seconds), because both files load the real bridge.

- [ ] **Step 9: Lint and typecheck**

Run:
```bash
pnpm lint
pnpm typecheck
```
Expected: both exit 0.

- [ ] **Step 10: Commit, after the owner approves**

Use the Bash tool with explicit paths, never `git add -A`, and run the two commands as two separate calls. The commit is unpiped.
```bash
git add src/tools/analytics/cards/engineView.ts src/tools/analytics/cards/useCardSynergies.ts src/tools/analytics/cards/cardFixtures.ts src/tools/analytics/cards/__tests__/engineView.test.ts src/tools/analytics/cards/__tests__/useCardSynergies.test.ts
```
```bash
USER_APPROVED=1 git commit -m "feat(cards): add the engine view model and the synergy hook (#24)"
```

<!--
Review of 2026-10-06 (9 notes), applied to this file:
- 1: Step 1's grep now matches R3-1's multi-line scoreUtils export and expects four lines. Checked against sandbox-r34-adv's bridge (R3-1's exact Step 4 edits): it prints :32, :67, :71 and :72.
- 2: re-base note 12 added, and "For the assembler" now gives the exact header edits. Its four other bullets went, because the header already has them: the Retry cell (:417), the block-bodied beforeEach (:551-557; the note's ":526-544" starts at lastCard's afterEach) and "ordered by score, then card name" (:354). TIER_COLOR goes after :235 (TIER_ORDER) and before :236 (TIER_SERIES), not after :236, so the contract lists it before the series built from it, as this task's Produces block does.
- 3: Step 10 uses the header's commit message (:650).
- 4: applied as given. The other stale "R3-6" mentions (re-base notes 2 and 5, the Files list, engineView.ts's header comment) now name R3-6c too. The sub-bullet on ENGINE_CAPPED's version-less names stays. The edited engineView.ts block passes eslint --max-warnings 0 --stdin.
- 5: the Failed-state bullet quotes header :435.
- 7, 8, 9: applied as given. Step 8's "35 passed (35)" re-run in sandbox-r34-adv, whose five files match this plan's code blocks byte for byte (the comment change aside).

Partly rejected:
- 6: the R3-4b part is applied (its import at R3-04b-network-diagram.md:1334, the map at :1376 goes, and :1391's TIER_COLOR.get(tier) becomes TIER_COLOR[tier]). The R3-6c part is wrong: sandbox-R3-6c's engineCharts.ts builds no local map. It imports TIER_COLOR from './engineView' (:11) and reads TIER_COLOR[partner.tier] (:110). Only R3-04b-network-diagram.md:1376 builds one (and the R3-4b sandboxes' Charts.stories.tsx:455). So TIER_COLOR stays exported, and the R3-6c note says the draft already uses it.
-->
