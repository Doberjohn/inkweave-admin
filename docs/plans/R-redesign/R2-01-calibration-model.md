> Part of [R: Admin redesign](../R-redesign.md), phase R2 ([R2-calibration-tuning.md](R2-calibration-tuning.md)). Read the main plan's decisions (R-17 to R-26 for R2), corrections, global constraints and shared interfaces, then the R2 header, first.

> **Re-base notes (R2-1, 2026-10-05).** Re-based on main @ `c92e260` (branch `feature/24-redesign-r2`) and the app pin `upstream/inkweave` @ `bc877e1`.
> - **R-17 applied.** Steps 1 to 7 put `playstyleId` into the analytics artifact:
>   - `scripts/lib/voteAnalytics.mjs` gains a pure `ruleRosterEntry(rule)`, which `loadRuleRoster` now maps with. It gives a string for a playstyle rule and `null` for a direct one, so every new artifact carries the field and a missing field always means an older artifact.
>   - `rollUpByRule` passes the field through, and `RuleStat` gains `playstyleId?: string | null` (optional).
>   - No log line is added. `writeOut` still logs file names only, never counts.
> - **The mapping prefers the artifact.** `tuningKeyFor` always takes the `tuning.json` section from the artifact's `category`, which Deploy writes from app master (R-17). A playstyle rule's key comes from `RuleStat.playstyleId` when the field is present (`!== undefined`). Only when it is absent (an older artifact, or the owner's local snapshot) does it ask the pinned engine's `getRuleById` for that key, as the outline did. A direct rule is keyed by its own id and never asks the engine.
>   - Its parameter widens to `Pick<RuleStat, 'ruleId' | 'category' | 'playstyleId'>`. The field is optional, so `{ruleId, category}` still compiles.
>   - The outline's "section from the pinned engine" test is inverted, per the header's re-base note 2: `{ruleId: 'lore-loss', category: 'direct'}` now looks in `directRules` and maps to `null`, not `lore-denial`. New tests cover a rule on app master that the pin lacks, and the artifact winning when the two disagree.
>   - The pin-bump contract test runs both shapes, and checks that they map every rule at the pin to the same key.
> - **Pin `bc877e1` re-checked; every fact the outline cites still holds:**
>   - `getAllRules` is at `rules.ts:1456` and `getRuleById` at `:1471`, both exported from `src/index.ts:32,35`.
>   - `TUNING` and `TuningConfig` come from `index.ts:144` (`data/tuning.ts:8-17`). `PlaystyleSynergyRule.playstyleId` is at `types/synergy.ts:23-26`, and the `SynergyRule` union at `:29`.
>   - `createLocationRule` sets `playstyleId: 'location-control'` at `rules.ts:495`, and `lore-loss` sets `'lore-denial'` at `:1011`.
>   - The engine has 37 rules. `tuning.json` has 22 playstyles and one direct rule (`shift-targets`), and `ruleTexts` has `shift-targets` and `ramp`.
>   - Ten rule ids differ from their tuning key (`lore-loss` and the nine `location-*` rules), six direct rules have no entry, and all 23 keys are reached. This was checked by running the built engine.
> - **Code references re-checked in the real files:**
>   - In the precompute, `loadRuleRoster` is at `scripts/precompute-vote-analytics.mjs:84-89` (its doc comment is line 84).
>   - `rollUpByRule` is at `scripts/lib/voteAnalytics.mjs:80-116`, with its doc comment from line 80.
>   - On the client, `RuleStat` is at `voteAnalyticsTypes.ts:27-36` and `PendingEdit` at `useTuningAdmin.ts:5-13`.
>   - Today's copies of the constants are `MAX_PAIRS` at `CalibrationView.tsx:32` and `LOW_N` at `RuleCalibrationTable.tsx:14`. R2-7 deletes both files.
> - **Changes beyond the outline:**
>   - **`LOW_N` reuses `MIN_RULE_VOTES`.** It is `MIN_RULE_VOTES` from R1-8's `overview/overviewStats.ts:11`. That file already calls its threshold "the same threshold as the calibration table's 'low n' chip", so there is now one constant.
>   - **"No score votes yet" for unscored rules.** `pairsHeading` reads "{name} · no score votes yet" for a rule with a stat but zero score votes too, not only for a tuning-only row, because "gap — · 0 votes" said nothing.
>   - **Singular counts.** `pairsHeading` and `calibrationSubtitle` print "1 vote". A local `voteCount` does it, because `activityModel`'s `countOf` would pull the chart kit's `range.ts`, which re-exports `RangeControl.tsx`, into this model.
>   - **The '+' and null-gap cases.** `calibrationSubtitle`'s tests cover a positive gap ("+0.83 · runs harsh") and a null one. That closes R1-11's deferred "missing assertions for the '+' on positive hero gaps and the null-gap subtitle" for the line R2-6 moves here.
> - **What the outline lacked, now written out.** The outline only described the tests. Every test is now written in full, with its run command and the expected output.
> - **What was verified, and how:**
>   - **Test runs in a scratch sandbox.** It held copies of the touched files, plus junctions to the repo's `node_modules` and `upstream`, with the caches redirected into the sandbox.
>     - The precompute tests gave 4 failed | 22 passed (26) before Step 3, and 26 passed after.
>     - The model test failed to resolve `../calibrationModel` before Step 10, and gave 49 passed after.
>     - `tsc -p tsconfig.app.json` is clean over the full `src`, with the real bridge and the edits applied.
>     - `vitest run src scripts/lib`, under the repo's `vite.config.ts`, gave 83 files and 792 tests passed.
>     - After the section fix (the artifact's `category` always picks the section), the model and its test, extracted from this file into `scratchpad/r2-rebase/sandbox-fix-R2-1`, gave 49 passed. `tsc -p tsconfig.app.json` was clean, and `vitest run src/tools/analytics scripts/lib` gave 28 files and 357 tests passed.
>   - **Lint.** Every new or changed file passes `pnpm exec eslint --stdin --stdin-filename <repo path>`.
>   - **The roster check.** Step 4's one-liner, run over the pinned engine, prints `0 lore-denial null`.
> - **Notes for later tasks:**
>   - **R2-6 subtitle.** R2-6 passes `calibrationSubtitle(analytics.data?.global ?? null)`.
>   - **R-22 (Overview "Tune" / "Inspect").** The Overview can test `tuningKeyFor(rule, TUNING) != null` against the pinned `tuning.json`, so it needs no token.
>   - **Fixtures.** Analytics fixtures in later tasks may omit `playstyleId`, and those tests then run the fallback. Both paths map `location-boost` to `location-control`.
>   - **When the field arrives.** The deployed artifact gains the field only once the R2 PR merges and Deploy runs from `main`. Until then the deployment and the owner's local snapshot both lack it, so R2's real-data check runs the fallback. The field path is covered by the unit tests here.

### Task R2-1: Calibration model (rule rows, tuning-key mapping, pairs)

**Files:**
- Modify `scripts/lib/voteAnalytics.mjs`:
  - add `ruleRosterEntry` above `rollUpByRule`'s doc comment, which starts at `:80`;
  - edit that doc comment (`:80-90`) and `rollUpByRule`'s returned object (`:101-105`).
- Modify `scripts/precompute-vote-analytics.mjs`: the import at `:27`, and `loadRuleRoster` at `:84-89`.
- Modify `src/tools/analytics/voteAnalyticsTypes.ts`: `RuleStat` (`:27-36`) gains `playstyleId?`.
- Test `scripts/lib/__tests__/voteAnalytics.test.mjs`:
  - the import at `:12`;
  - a new `describe('ruleRosterEntry')` after `:72`;
  - a case at the end of `rollUpByRule` (after `:110`);
  - a case at the end of `buildAnalytics` (after `:186`).
- Create `src/tools/analytics/calibration/calibrationModel.ts`.
- Test `src/tools/analytics/calibration/__tests__/calibrationModel.test.ts`.

**Interfaces:**
- **Consumes:**
  - `RuleStat` (with its new `playstyleId?`), `PairStat` and `GlobalStats` from `src/tools/analytics/voteAnalyticsTypes.ts`;
  - `VoteLogRow` from `src/tools/analytics/voteLogTypes.ts`;
  - `PendingEdit` (`src/tools/tuning/useTuningAdmin.ts:5-13`), as a type only;
  - `getRuleById` and `TuningConfig` from `inkweave-synergy-engine`; the test also uses `getAllRules` and `TUNING`. This is the workspace engine package, which admin already imports at runtime (`src/tools/reveal/validateForm.ts:1`). It is not app code, so it doesn't go through `src/app-bridge.ts`;
  - `fmtGap` and `fmtInt` (`src/ui/format.ts`);
  - `verdictFor` (`src/tools/analytics/verdict.ts`);
  - `MIN_RULE_VOTES` (`src/tools/analytics/overview/overviewStats.ts:11`);
  - in the precompute, the app-master engine's `getAllRules()` (`SynergyRule`: `{id, name, category: 'direct'}` or `{id, name, category: 'playstyle', playstyleId}`).
- **Produces:**
```js
// scripts/lib/voteAnalytics.mjs
// One engine rule as the roster holds it; playstyleId is null for a direct rule.
export function ruleRosterEntry(rule) /* -> {ruleId, ruleName, category, playstyleId: string | null} */;
// rollUpByRule's per-rule objects gain playstyleId, passed through from the roster.
```
```ts
// src/tools/analytics/voteAnalyticsTypes.ts, inside RuleStat
playstyleId?: string | null; // a playstyle rule's tuning key; null for a direct rule; absent from artifacts written before R2

// src/tools/analytics/calibration/calibrationModel.ts
/** Below this many score votes a rule's number is statistically thin (= MIN_RULE_VOTES, 10). */
export const LOW_N: number;
/** Most gaps are near zero; the widest-gap pairs first surface the outliers worth reviewing. */
export const MAX_PAIRS = 40;
export type RuleSortKey = 'gap' | 'votes';
export interface CalibrationRow {id: string; name: string; category: 'playstyle' | 'direct'; stat: RuleStat | null; tuningKey: string | null}
export function tuningKeyFor(rule: Pick<RuleStat, 'ruleId' | 'category' | 'playstyleId'>, config: TuningConfig): string | null; // section: the artifact's category; a playstyle key: the artifact's playstyleId, else the pinned engine's
export function buildCalibrationRows(rules: RuleStat[] | null, config: TuningConfig | null): CalibrationRow[];
export function sortCalibrationRows(rows: CalibrationRow[], key: RuleSortKey): CalibrationRow[]; // rows with a stat first (|gap| or votes, desc); tuning-only rows last, in tuning.json order
export function findRow(rows: CalibrationRow[], id: string | null): CalibrationRow | null;        // exact id, else the first row whose tuningKey is id
export function rowsSharingKey(rows: CalibrationRow[], key: string): CalibrationRow[];           // rows with a stat whose tuningKey is key
export function editedKeys(pending: PendingEdit[]): Set<string>;
export function pairId(a: string, b: string): string;                                            // one key per pair either way round: '1|2' for (1, 2) and (2, 1)
export function pairsInScope(pairs: PairStat[], row: CalibrationRow | null): PairStat[];         // null: all; no stat: []; else pairs whose rules include row.id; widest |gap| first, uncapped (the charts)
export function pairsFor(pairs: PairStat[], row: CalibrationRow | null): PairStat[];             // pairsInScope(...).slice(0, MAX_PAIRS) (the list)
export function findPair(scope: PairStat[], selected: {a: string; b: string} | null): PairStat | null; // matched by pairId
export function withSelectedPair(listed: PairStat[], scope: PairStat[], selected: {a: string; b: string} | null): PairStat[]; // appends the selected pair when the list lacks it
export function votesForPair(votes: VoteLogRow[], pair: {a: string; b: string} | null): VoteLogRow[]; // matched by pairId
export function pairsHeading(row: CalibrationRow | null): string;         // "All pairs" | "Ramp · gap −0.57 · 557 votes" | "Locations · no score votes yet"
export function calibrationSubtitle(global: GlobalStats | null): string;  // "Mean gap −0.30 · well-calibrated · 2,054 votes" | "No vote analytics yet"
```

**How a rule finds its `tuning.json` entry** (pin `bc877e1`):

| Rule | Artifact `playstyleId` | Without it (pinned engine) | `tuningKeyFor` |
|---|---|---|---|
| `lore-loss` | `'lore-denial'` | `getRuleById` → playstyle `lore-denial` | `lore-denial` |
| the nine `location-*` rules | `'location-control'` | playstyle `location-control` | `location-control` |
| `ramp`, `toy`, … (the 20 other playstyle rules) | their own id | the same | their own id |
| `shift-targets` | `null` | its own id; a direct rule never asks the engine | `shift-targets` |
| `named-companions`, `singer-songs`, `spike-suit`, `merida-archer`, `merida-wisp`, `free-play` | `null` | its own id | `null`: no entry; the aside says "No copy in tuning.json" (R-20) |
| a rule on app master the pin lacks | its playstyleId, or `null` | its own id | the artifact's answer, which the pin can't give (R-17's reason) |
| `lore-loss` with the artifact's `category: 'direct'` (as if master had made it direct) | `null` | not asked: its own id | `null`: `directRules` has no `lore-loss` |

The section is always the artifact's `category` (R-17, header re-base note 2). Only a playstyle rule's key ever comes from the pinned engine.

- [ ] **Step 1: Write the failing precompute tests**

In `scripts/lib/__tests__/voteAnalytics.test.mjs`, add `ruleRosterEntry` to the import at line 12. Current:

```js
import {computePairRecord, buildPairRecords, voteWeightedMean, rollUpByRule, isoWeekStart, bucketWeekly, buildAnalytics, buildVoteLog} from '../voteAnalytics.mjs';
```

New:

```js
import {computePairRecord, buildPairRecords, voteWeightedMean, ruleRosterEntry, rollUpByRule, isoWeekStart, bucketWeekly, buildAnalytics, buildVoteLog} from '../voteAnalytics.mjs';
```

Between the end of `describe('buildPairRecords')` and `describe('rollUpByRule')` (lines 70-74), add the roster's tests. Current:

```js
    expect(engineSilent.map((p) => p.a)).toEqual(['c3']);
  });
});

describe('rollUpByRule', () => {
```

New:

```js
    expect(engineSilent.map((p) => p.a)).toEqual(['c3']);
  });
});

describe('ruleRosterEntry', () => {
  // An engine SynergyRule carries more than the roster keeps (a description, matches, findSynergies).
  const engineRule = (over) => ({id: 'ramp', name: 'Ramp', description: 'd', matches: () => true, ...over});

  it("keeps a playstyle rule's playstyleId: the tuning.json key of its copy", () => {
    const rule = engineRule({id: 'lore-loss', name: 'Lore Loss', category: 'playstyle', playstyleId: 'lore-denial'});
    expect(ruleRosterEntry(rule)).toEqual({
      ruleId: 'lore-loss', ruleName: 'Lore Loss', category: 'playstyle', playstyleId: 'lore-denial',
    });
  });

  it('writes null for a direct rule, so every roster entry carries the field', () => {
    const rule = engineRule({id: 'shift-targets', name: 'Shift Targets', category: 'direct'});
    expect(ruleRosterEntry(rule)).toStrictEqual({
      ruleId: 'shift-targets', ruleName: 'Shift Targets', category: 'direct', playstyleId: null,
    });
  });
});

describe('rollUpByRule', () => {
```

At the end of `describe('rollUpByRule')` (lines 108-111), add a pass-through case. Current:

```js
    expect(toy.pairsVoted).toBe(1);
    expect(toy.pairsCovered).toBe(0);
  });
});
```

New:

```js
    expect(toy.pairsVoted).toBe(1);
    expect(toy.pairsCovered).toBe(0);
  });

  it("passes each rule's playstyleId through from the roster", () => {
    const roster = [
      {ruleId: 'location-boost', ruleName: 'Location Boost', category: 'playstyle', playstyleId: 'location-control'},
      {ruleId: 'ramp', ruleName: 'Ramp', category: 'playstyle', playstyleId: 'ramp'},
      {ruleId: 'shift', ruleName: 'Shift Targets', category: 'direct', playstyleId: null},
    ];
    const rules = rollUpByRule(pairs, roster, ruleTotalPairs);
    expect(rules.map((r) => [r.ruleId, r.playstyleId])).toEqual([
      ['location-boost', 'location-control'],
      ['ramp', 'ramp'],
      ['shift', null],
    ]);
  });
});
```

At the end of `describe('buildAnalytics')` (lines 185-187), add a case for the written JSON. Current:

```js
    expect(out.global.dimensionFill).toEqual({score: 1, accuracy: 0, isReal: 0, wouldPlay: 0, difficulty: 1});
  });
});
```

New:

```js
    expect(out.global.dimensionFill).toEqual({score: 1, accuracy: 0, isReal: 0, wouldPlay: 0, difficulty: 1});
  });

  it("writes each rule's playstyleId into the artifact, null included", () => {
    const roster = [
      {ruleId: 'ramp', ruleName: 'Ramp', category: 'playstyle', playstyleId: 'ramp'},
      {ruleId: 'shift', ruleName: 'Shift Targets', category: 'direct', playstyleId: null},
    ];
    const out = buildAnalytics({scoreRows, enginePairs, allRules: roster, names, ruleTotalPairs, rawVotes: null});
    // What writeOut stores: JSON.stringify keeps a null and would drop an undefined.
    const written = JSON.parse(JSON.stringify(out));
    expect(written.rules.map((r) => [r.ruleId, r.playstyleId])).toEqual([['ramp', 'ramp'], ['shift', null]]);
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

```bash
pnpm vitest run scripts/lib/__tests__/voteAnalytics.test.mjs
```

Expected: `Tests  4 failed | 22 passed (26)`.
- Both `ruleRosterEntry` cases fail with `TypeError: ruleRosterEntry is not a function`.
- `passes each rule's playstyleId through from the roster` fails with `AssertionError: expected [ …(3) ] to deeply equal [ [ 'location-boost', …(1) ], …(2) ]`.
- `writes each rule's playstyleId into the artifact, null included` fails with `AssertionError: expected [ [ 'ramp', undefined ], …(1) ] to deeply equal [ [ 'ramp', 'ramp' ], …(1) ]`.

- [ ] **Step 3: Write `playstyleId` into the roster and the per-rule stats**

In `scripts/lib/voteAnalytics.mjs`, add `ruleRosterEntry` above `rollUpByRule` and extend its doc comment. Current (lines 80-84):

```js
/**
 * Roll pair records up to per-rule calibration stats. A pair is credited to
 * EVERY rule in its `rules` list (a vote is feedback on the whole displayed
 * score, which multiple rules built). meanGap is vote-weighted by scoreVotes.
 * Every rule in `allRules` is emitted, even with zero votes.
```

New:

```js
/**
 * One engine rule as the roster holds it. `playstyleId` is the tuning.json key
 * of a playstyle rule's copy (lore-loss keeps its copy under lore-denial, every
 * location-* rule under location-control). A direct rule has none, so it gets
 * null: every entry carries the field, and an artifact without it is an older
 * one. The calibration page maps rules to tuning entries with it, so the rule
 * list and the keys both come from the app's master (R-17 in
 * docs/plans/R-redesign.md).
 */
export function ruleRosterEntry(rule) {
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    category: rule.category,
    playstyleId: rule.category === 'playstyle' ? rule.playstyleId : null,
  };
}

/**
 * Roll pair records up to per-rule calibration stats. A pair is credited to
 * EVERY rule in its `rules` list (a vote is feedback on the whole displayed
 * score, which multiple rules built). meanGap is vote-weighted by scoreVotes.
 * Every rule in `allRules` is emitted, even with zero votes, with its roster
 * playstyleId (ruleRosterEntry).
```

In `rollUpByRule`'s returned object (lines 101-105), pass the field through. Current:

```js
    return {
      ruleId: rule.ruleId,
      ruleName: rule.ruleName,
      category: rule.category,
      scoreVotes: recs.reduce((s, r) => s + r.scoreVotes, 0),
```

New:

```js
    return {
      ruleId: rule.ruleId,
      ruleName: rule.ruleName,
      category: rule.category,
      playstyleId: rule.playstyleId,
      scoreVotes: recs.reduce((s, r) => s + r.scoreVotes, 0),
```

In `scripts/precompute-vote-analytics.mjs`, line 27. Current:

```js
import {buildAnalytics, buildVoteLog, pairKey} from './lib/voteAnalytics.mjs';
```

New:

```js
import {buildAnalytics, buildVoteLog, pairKey, ruleRosterEntry} from './lib/voteAnalytics.mjs';
```

And `loadRuleRoster` (lines 84-89). Current:

```js
/** Rule roster (labels + zero-vote rules) from the app's built engine. */
async function loadRuleRoster() {
  const engine = path.join(APP_DIR, 'packages/synergy-engine/dist/index.js');
  const {getAllRules} = await import(pathToFileURL(engine).href);
  return getAllRules().map((r) => ({ruleId: r.id, ruleName: r.name, category: r.category}));
}
```

New:

```js
/** Rule roster (labels, zero-vote rules, playstyle ids) from the app's built engine. */
async function loadRuleRoster() {
  const engine = path.join(APP_DIR, 'packages/synergy-engine/dist/index.js');
  const {getAllRules} = await import(pathToFileURL(engine).href);
  return getAllRules().map((rule) => ruleRosterEntry(rule));
}
```

Add no log line. `writeOut` names the files it writes, and nothing logs a count (CLAUDE.md, "Logs").

- [ ] **Step 4: Run them and watch them pass**

```bash
pnpm vitest run scripts/lib/__tests__/voteAnalytics.test.mjs
```

Expected: `Tests  26 passed (26)`.

Then check the roster against a real engine. The Deploy workflow runs it over app master's build; the pinned build stands in here, after `pnpm build:engine` on a fresh checkout. From the repo root:

```bash
node --input-type=module -e "import {getAllRules} from 'inkweave-synergy-engine'; import {ruleRosterEntry} from './scripts/lib/voteAnalytics.mjs'; const roster = JSON.parse(JSON.stringify(getAllRules().map((rule) => ruleRosterEntry(rule)))); console.log(roster.filter((e) => !('playstyleId' in e)).length, roster.find((e) => e.ruleId === 'lore-loss').playstyleId, roster.find((e) => e.ruleId === 'singer-songs').playstyleId);"
```

Expected: `0 lore-denial null`. That means no entry lacks the field once written as JSON, Lore Loss carries its tuning key, and a direct rule carries `null`.

- [ ] **Step 5: Declare the field on `RuleStat`**

In `src/tools/analytics/voteAnalyticsTypes.ts` (lines 27-31). Current:

```ts
export interface RuleStat {
  ruleId: string;
  ruleName: string;
  category: 'direct' | 'playstyle';
  scoreVotes: number;
```

New:

```ts
export interface RuleStat {
  ruleId: string;
  ruleName: string;
  category: 'direct' | 'playstyle';
  /**
   * The tuning.json key of a playstyle rule's copy (its engine playstyleId:
   * lore-denial for lore-loss, location-control for every location-* rule), and
   * null for a direct rule. Absent from artifacts written before R2, and from
   * local snapshots of them; the calibration model then asks the pinned engine.
   */
  playstyleId?: string | null;
  scoreVotes: number;
```

The field is optional, so the existing `RuleStat` fixtures still typecheck without it: `overviewFixtures.ts`, the R1 tests and the stories.

- [ ] **Step 6: Lint and typecheck**

```bash
pnpm lint
pnpm typecheck
```

Expected: both exit 0.

- [ ] **Step 7: Commit the artifact change**

After the owner approves, with the Bash tool:

```bash
git add scripts/lib/voteAnalytics.mjs scripts/lib/__tests__/voteAnalytics.test.mjs scripts/precompute-vote-analytics.mjs src/tools/analytics/voteAnalyticsTypes.ts
USER_APPROVED=1 git commit -m "feat(analytics): write each rule's playstyleId into the vote analytics (#24)"
```

The deployed artifact gains the field only once R2's PR merges and Deploy runs from `main`. Until then, every artifact takes the fallback path.

- [ ] **Step 8: Write the failing model test**

Create `src/tools/analytics/calibration/__tests__/calibrationModel.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {getAllRules, TUNING, type TuningConfig} from 'inkweave-synergy-engine';
import type {PendingEdit} from '../../../tuning/useTuningAdmin';
import type {GlobalStats, PairStat, RuleStat} from '../../voteAnalyticsTypes';
import type {VoteLogRow} from '../../voteLogTypes';
import {
  buildCalibrationRows,
  calibrationSubtitle,
  editedKeys,
  findPair,
  findRow,
  MAX_PAIRS,
  pairId,
  pairsFor,
  pairsHeading,
  pairsInScope,
  rowsSharingKey,
  sortCalibrationRows,
  tuningKeyFor,
  votesForPair,
  withSelectedPair,
} from '../calibrationModel';

/** An analytics rule. No playstyleId unless `over` gives one: the shape of an artifact written before R2. */
function stat(ruleId: string, over: Partial<RuleStat> = {}): RuleStat {
  return {
    ruleId,
    ruleName: ruleId,
    category: 'playstyle',
    scoreVotes: 0,
    pairsVoted: 0,
    meanGap: null,
    accuracySentiment: null,
    pairsCovered: 0,
    ...over,
  };
}

function pair(a: string, b: string, gap: number, rules: string[]): PairStat {
  return {a, b, aName: `Card ${a}`, bName: `Card ${b}`, engineScore: 5, communityScore: 5 + gap, gap, scoreVotes: 1, rules};
}

function vote(a: string, b: string): VoteLogRow {
  return {
    a,
    b,
    aName: `Card ${a}`,
    bName: `Card ${b}`,
    score: 6,
    accuracy: null,
    isReal: null,
    wouldPlay: null,
    difficulty: null,
    whoCarries: null,
    ts: '2026-09-30T14:20:00.123456+00:00',
    voter: 1,
  };
}

function edit(path: (string | number)[]): PendingEdit {
  return {pathKey: JSON.stringify(path), path, value: 'new', oldValue: 'old', label: 'label', valid: true};
}

function global(meanGap: number | null, totalVotes: number): GlobalStats {
  return {
    totalVotes,
    distinctPairs: 0,
    distinctVoters: null,
    meanGap,
    accuracySentiment: null,
    engineSilentPairs: 0,
    weekly: [],
    dimensionFill: null,
  };
}

/** The pinned tuning.json plus one direct entry no engine rule has. */
const WITH_NEW_DIRECT: TuningConfig = {
  ...TUNING,
  directRules: {...TUNING.directRules, 'brand-new': {name: 'Brand New', description: 'Not in the pinned engine yet.'}},
};

/** Every tuning.json key, playstyles then direct rules. */
const TUNING_KEYS = [...Object.keys(TUNING.playstyles), ...Object.keys(TUNING.directRules)];

/**
 * 45 pairs, narrowest gap first, alternating sign: pair i has |gap| i / 10.
 * Every third one (15 in all) fired ramp as well as toy.
 */
const PAIRS: PairStat[] = Array.from({length: 45}, (_, i) =>
  pair(String(i + 1), String(i + 100), (i % 2 ? -1 : 1) * (i / 10), i % 3 === 0 ? ['ramp', 'toy'] : ['toy']),
);

describe('tuningKeyFor', () => {
  describe("with the artifact's playstyleId (R-17)", () => {
    it('maps a playstyle rule to its playstyleId', () => {
      expect(tuningKeyFor({ruleId: 'lore-loss', category: 'playstyle', playstyleId: 'lore-denial'}, TUNING)).toBe(
        'lore-denial',
      );
      expect(
        tuningKeyFor({ruleId: 'location-boost', category: 'playstyle', playstyleId: 'location-control'}, TUNING),
      ).toBe('location-control');
      expect(tuningKeyFor({ruleId: 'ramp', category: 'playstyle', playstyleId: 'ramp'}, TUNING)).toBe('ramp');
    });

    it('maps a direct rule (playstyleId null) to its own id, and to null when tuning.json has no entry', () => {
      expect(tuningKeyFor({ruleId: 'shift-targets', category: 'direct', playstyleId: null}, TUNING)).toBe(
        'shift-targets',
      );
      expect(tuningKeyFor({ruleId: 'singer-songs', category: 'direct', playstyleId: null}, TUNING)).toBeNull();
    });

    it('reaches a rule app master has and the pin does not yet', () => {
      expect(
        tuningKeyFor({ruleId: 'location-new-trigger', category: 'playstyle', playstyleId: 'location-control'}, TUNING),
      ).toBe('location-control');
    });

    it('wins over the pinned engine when the two disagree', () => {
      // As if master had moved lore-loss to another playstyle after the pin.
      expect(tuningKeyFor({ruleId: 'lore-loss', category: 'playstyle', playstyleId: 'discard'}, TUNING)).toBe('discard');
    });

    it('returns null for a playstyleId tuning.json has no entry for', () => {
      expect(tuningKeyFor({ruleId: 'x', category: 'playstyle', playstyleId: 'no-such-playstyle'}, TUNING)).toBeNull();
    });
  });

  describe('without it (an artifact written before R2): the pinned engine', () => {
    it('maps lore-loss to lore-denial and location-boost to location-control', () => {
      expect(tuningKeyFor({ruleId: 'lore-loss', category: 'playstyle'}, TUNING)).toBe('lore-denial');
      expect(tuningKeyFor({ruleId: 'location-boost', category: 'playstyle'}, TUNING)).toBe('location-control');
    });

    it('maps ramp to ramp and the direct rule shift-targets to shift-targets', () => {
      expect(tuningKeyFor({ruleId: 'ramp', category: 'playstyle'}, TUNING)).toBe('ramp');
      expect(tuningKeyFor({ruleId: 'shift-targets', category: 'direct'}, TUNING)).toBe('shift-targets');
    });

    it('returns null for singer-songs, a direct rule with no entry', () => {
      expect(tuningKeyFor({ruleId: 'singer-songs', category: 'direct'}, TUNING)).toBeNull();
    });

    it("takes the section from the artifact's category, not the pinned engine", () => {
      expect(tuningKeyFor({ruleId: 'lore-loss', category: 'direct'}, TUNING)).toBeNull();
    });

    it("falls back to the rule's own id and the artifact's category for a rule the pin doesn't know", () => {
      expect(tuningKeyFor({ruleId: 'brand-new', category: 'direct'}, WITH_NEW_DIRECT)).toBe('brand-new');
      expect(tuningKeyFor({ruleId: 'brand-new', category: 'playstyle'}, WITH_NEW_DIRECT)).toBeNull();
      expect(tuningKeyFor({ruleId: 'brand-new', category: 'direct'}, TUNING)).toBeNull();
    });
  });

  it("doesn't count inherited keys", () => {
    expect(tuningKeyFor({ruleId: 'constructor', category: 'direct'}, TUNING)).toBeNull();
    expect(tuningKeyFor({ruleId: 'x', category: 'playstyle', playstyleId: 'toString'}, TUNING)).toBeNull();
  });
});

describe('the pinned engine and tuning.json (fails on a pin bump that breaks the mapping)', () => {
  const rules = getAllRules();
  // An artifact written before R2, and one written by R2's precompute (ruleRosterEntry in scripts/lib/voteAnalytics.mjs).
  const older = rules.map((rule) => stat(rule.id, {ruleName: rule.name, category: rule.category}));
  const current = rules.map((rule) =>
    stat(rule.id, {
      ruleName: rule.name,
      category: rule.category,
      playstyleId: rule.category === 'playstyle' ? rule.playstyleId : null,
    }),
  );

  it.each([
    ['without playstyleId', older],
    ['with playstyleId', current],
  ])('reaches every tuning.json entry from the rules %s, adding no tuning-only row', (_, stats) => {
    const rows = buildCalibrationRows(stats, TUNING);
    expect(rows.filter((row) => row.stat == null)).toEqual([]);
    expect(new Set(rows.map((row) => row.tuningKey).filter((key) => key != null))).toEqual(new Set(TUNING_KEYS));
  });

  it('maps every rule to the same key either way', () => {
    expect(current.map((s) => tuningKeyFor(s, TUNING))).toEqual(older.map((s) => tuningKeyFor(s, TUNING)));
  });
});

describe('buildCalibrationRows', () => {
  it('lists tuning.json alone without analytics: playstyles, then direct rules, none with a stat', () => {
    const rows = buildCalibrationRows(null, TUNING);
    expect(rows.map((row) => row.id)).toEqual(TUNING_KEYS);
    expect(rows.every((row) => row.stat == null && row.tuningKey === row.id)).toBe(true);
    expect(rows.find((row) => row.id === 'location-control')).toEqual({
      id: 'location-control',
      name: 'Locations',
      category: 'playstyle',
      stat: null,
      tuningKey: 'location-control',
    });
    expect(rows.find((row) => row.id === 'shift-targets')?.category).toBe('direct');
  });

  it('lists the analytics rules with no tuning key without a config', () => {
    const ramp = stat('ramp', {ruleName: 'Ramp'});
    const singer = stat('singer-songs', {ruleName: 'Singer + Songs', category: 'direct'});
    expect(buildCalibrationRows([ramp, singer], null)).toEqual([
      {id: 'ramp', name: 'Ramp', category: 'playstyle', stat: ramp, tuningKey: null},
      {id: 'singer-songs', name: 'Singer + Songs', category: 'direct', stat: singer, tuningKey: null},
    ]);
  });

  it('lists nothing with neither (R-20: no read-only fallback)', () => {
    expect(buildCalibrationRows(null, null)).toEqual([]);
  });

  it('appends each tuning.json entry no analytics rule reaches, in tuning.json order', () => {
    const rows = buildCalibrationRows(
      [stat('lore-loss'), stat('ramp'), stat('singer-songs', {category: 'direct'})],
      TUNING,
    );
    expect(rows.slice(0, 3).map((row) => [row.id, row.tuningKey])).toEqual([
      ['lore-loss', 'lore-denial'],
      ['ramp', 'ramp'],
      ['singer-songs', null],
    ]);
    const tuningOnly = rows.slice(3);
    expect(tuningOnly.map((row) => row.id)).toEqual(TUNING_KEYS.filter((key) => key !== 'lore-denial' && key !== 'ramp'));
    expect(tuningOnly.every((row) => row.stat == null)).toBe(true);
  });
});

describe('sortCalibrationRows', () => {
  const config: TuningConfig = {
    ...TUNING,
    playstyles: {
      a: {name: 'A', tagline: ''},
      b: {name: 'B', tagline: ''},
      c: {name: 'C', tagline: ''},
      d: {name: 'D', tagline: ''},
      x: {name: 'X', tagline: ''},
    },
    directRules: {y: {name: 'Y', description: ''}},
  };
  const rows = buildCalibrationRows(
    [
      stat('a', {meanGap: 0.2, scoreVotes: 50}),
      stat('b', {meanGap: -1.1, scoreVotes: 5}),
      stat('c', {meanGap: null, scoreVotes: 0}),
      stat('d', {meanGap: 0.6, scoreVotes: 120}),
    ],
    config,
  );

  it('orders rows with a stat by |gap|, a null gap as 0, and tuning-only rows last', () => {
    expect(sortCalibrationRows(rows, 'gap').map((row) => row.id)).toEqual(['b', 'd', 'a', 'c', 'x', 'y']);
  });

  it('orders them by score votes', () => {
    expect(sortCalibrationRows(rows, 'votes').map((row) => row.id)).toEqual(['d', 'a', 'b', 'c', 'x', 'y']);
  });

  it('leaves the input in its order', () => {
    sortCalibrationRows(rows, 'gap');
    expect(rows.map((row) => row.id)).toEqual(['a', 'b', 'c', 'd', 'x', 'y']);
  });
});

describe('findRow', () => {
  const rows = buildCalibrationRows([stat('ramp'), stat('location-boost'), stat('location-move')], TUNING);

  it('matches a row id first', () => {
    expect(findRow(rows, 'ramp')?.id).toBe('ramp');
    expect(findRow(rows, 'discard')?.stat).toBeNull();
  });

  it('then a tuning key: location-control finds the first location rule', () => {
    expect(findRow(rows, 'location-control')?.id).toBe('location-boost');
  });

  it('returns null for an unknown id or none', () => {
    expect(findRow(rows, 'retired-rule')).toBeNull();
    expect(findRow(rows, null)).toBeNull();
  });
});

describe('rowsSharingKey', () => {
  const rows = buildCalibrationRows(
    [
      stat('location-boost', {playstyleId: 'location-control'}),
      stat('ramp', {playstyleId: 'ramp'}),
      stat('location-move', {playstyleId: 'location-control'}),
      stat('location-search', {playstyleId: 'location-control'}),
    ],
    TUNING,
  );

  it('returns every analytics rule whose copy is that entry', () => {
    expect(rowsSharingKey(rows, 'location-control').map((row) => row.id)).toEqual([
      'location-boost',
      'location-move',
      'location-search',
    ]);
  });

  it('leaves out tuning-only rows', () => {
    expect(rowsSharingKey(rows, 'discard')).toEqual([]);
  });

  it('gives the nine location rules at the pin', () => {
    const all = buildCalibrationRows(
      getAllRules().map((rule) => stat(rule.id, {category: rule.category})),
      TUNING,
    );
    expect(rowsSharingKey(all, 'location-control')).toHaveLength(9);
  });
});

describe('editedKeys', () => {
  it('reads the tuning key from each pending path', () => {
    expect(
      editedKeys([
        edit(['ruleTexts', 'ramp', 'scores', 'x']),
        edit(['ruleTexts', 'shift-targets', 'curve.gap3', 'score']),
        edit(['playstyles', 'location-control', 'tagline']),
        edit(['playstyles', 'ramp', 'name']),
      ]),
    ).toEqual(new Set(['ramp', 'shift-targets', 'location-control']));
  });

  it('is empty without pending edits', () => {
    expect(editedKeys([]).size).toBe(0);
  });
});

describe('pairId', () => {
  it('gives one key whichever way round the cards come', () => {
    expect(pairId('1', '2')).toBe('1|2');
    expect(pairId('2', '1')).toBe('1|2');
    expect(pairId('9', '10')).toBe(pairId('10', '9'));
  });
});

describe('pairsInScope', () => {
  const ramp = buildCalibrationRows([stat('ramp')], null)[0];
  const tuningOnly = buildCalibrationRows(null, TUNING)[0];

  it('gives every pair for no row, widest gap first and uncapped', () => {
    const scope = pairsInScope(PAIRS, null);
    expect(scope).toHaveLength(45);
    expect(scope[0].gap).toBe(4.4);
    expect(scope[1].gap).toBe(-4.3);
    const widths = scope.map((p) => Math.abs(p.gap));
    expect(widths).toEqual([...widths].sort((x, y) => y - x));
  });

  it('gives no pairs for a tuning-only row', () => {
    expect(pairsInScope(PAIRS, tuningOnly)).toEqual([]);
  });

  it("gives only the pairs a rule fired on", () => {
    const scope = pairsInScope(PAIRS, ramp);
    expect(scope).toHaveLength(15);
    expect(scope.every((p) => p.rules.includes('ramp'))).toBe(true);
    expect(scope[0].gap).toBe(4.2);
  });

  it('leaves the input in its order', () => {
    pairsInScope(PAIRS, null);
    expect(PAIRS[0].a).toBe('1');
  });
});

describe('pairsFor', () => {
  it('gives the widest MAX_PAIRS for no row', () => {
    const listed = pairsFor(PAIRS, null);
    expect(listed).toHaveLength(MAX_PAIRS);
    expect(listed).toEqual(pairsInScope(PAIRS, null).slice(0, 40));
  });

  it('gives no pairs for a tuning-only row', () => {
    expect(pairsFor(PAIRS, buildCalibrationRows(null, TUNING)[0])).toEqual([]);
  });

  it('gives only the pairs a rule fired on', () => {
    const listed = pairsFor(PAIRS, buildCalibrationRows([stat('ramp')], null)[0]);
    expect(listed).toHaveLength(15);
    expect(listed.every((p) => p.rules.includes('ramp'))).toBe(true);
  });
});

describe('findPair', () => {
  const scope = pairsInScope(PAIRS, null);

  it("finds the scope's record for a selection given either way round", () => {
    expect(findPair(scope, {a: '1', b: '100'})).toBe(PAIRS[0]);
    expect(findPair(scope, {a: '100', b: '1'})).toBe(PAIRS[0]);
  });

  it('gives null without a selection, and for a pair outside the scope', () => {
    expect(findPair(scope, null)).toBeNull();
    const rampScope = pairsInScope(PAIRS, buildCalibrationRows([stat('ramp')], null)[0]);
    expect(findPair(rampScope, {a: '2', b: '101'})).toBeNull();
  });
});

describe('withSelectedPair', () => {
  const scope = pairsInScope(PAIRS, null);
  const listed = pairsFor(PAIRS, null);

  it('appends the selected pair when it sits below the widest 40', () => {
    const shown = withSelectedPair(listed, scope, {a: scope[40].b, b: scope[40].a});
    expect(shown).toHaveLength(41);
    expect(shown[40]).toBe(scope[40]);
  });

  it('leaves the list alone when it holds the selection, or nothing is selected', () => {
    expect(withSelectedPair(listed, scope, {a: scope[3].a, b: scope[3].b})).toBe(listed);
    expect(withSelectedPair(listed, scope, null)).toBe(listed);
  });
});

describe('votesForPair', () => {
  const votes = [vote('1', '2'), vote('2', '1'), vote('1', '3')];

  it("returns only the selected pair's votes, either way round", () => {
    expect(votesForPair(votes, {a: '1', b: '2'})).toEqual([votes[0], votes[1]]);
  });

  it('returns none without a pair', () => {
    expect(votesForPair(votes, null)).toEqual([]);
  });
});

describe('pairsHeading', () => {
  it('reads "All pairs" with no row', () => {
    expect(pairsHeading(null)).toBe('All pairs');
  });

  it("gives a rule's gap and votes, with a true minus sign", () => {
    const [ramp] = buildCalibrationRows([stat('ramp', {ruleName: 'Ramp', meanGap: -0.57, scoreVotes: 557})], TUNING);
    expect(pairsHeading(ramp)).toBe('Ramp · gap −0.57 · 557 votes');
    const [toy] = buildCalibrationRows([stat('toy', {ruleName: 'Toy', meanGap: 0.83, scoreVotes: 1})], TUNING);
    expect(pairsHeading(toy)).toBe('Toy · gap +0.83 · 1 vote');
  });

  it('says a tuning-only row, or a rule nobody has scored, has no score votes yet', () => {
    const locations = buildCalibrationRows(null, TUNING).find((row) => row.id === 'location-control') ?? null;
    expect(pairsHeading(locations)).toBe('Locations · no score votes yet');
    const [singer] = buildCalibrationRows([stat('singer-songs', {ruleName: 'Singer + Songs', category: 'direct'})], null);
    expect(pairsHeading(singer)).toBe('Singer + Songs · no score votes yet');
  });
});

describe('calibrationSubtitle', () => {
  it('gives the mean gap, the verdict and the votes', () => {
    expect(calibrationSubtitle(global(-0.3, 2054))).toBe('Mean gap −0.30 · well-calibrated · 2,054 votes');
    expect(calibrationSubtitle(global(0.83, 1))).toBe('Mean gap +0.83 · runs harsh · 1 vote');
  });

  it('says there is not enough data without a gap', () => {
    expect(calibrationSubtitle(global(null, 0))).toBe('Mean gap — · not enough data · 0 votes');
  });

  it('names only the analytics when there are none', () => {
    expect(calibrationSubtitle(null)).toBe('No vote analytics yet');
  });
});
```

- [ ] **Step 9: Run it and watch it fail**

```bash
pnpm vitest run src/tools/analytics/calibration/__tests__/calibrationModel.test.ts
```

Expected: `Error: Failed to resolve import "../calibrationModel" from "src/tools/analytics/calibration/__tests__/calibrationModel.test.ts". Does the file exist?`, with `Test Files  1 failed (1)` and `Tests  no tests`.

- [ ] **Step 10: Write the model**

Create `src/tools/analytics/calibration/calibrationModel.ts`:

```ts
import {getRuleById, type TuningConfig} from 'inkweave-synergy-engine';
import type {PendingEdit} from '../../tuning/useTuningAdmin';
import {fmtGap, fmtInt} from '../../../ui/format';
import {MIN_RULE_VOTES} from '../overview/overviewStats';
import {verdictFor} from '../verdict';
import type {GlobalStats, PairStat, RuleStat} from '../voteAnalyticsTypes';
import type {VoteLogRow} from '../voteLogTypes';

/**
 * Below this many score votes a rule's number is statistically thin: the rules
 * table's "low n" tag. The Overview's Rules to review uses the same threshold.
 */
export const LOW_N = MIN_RULE_VOTES;
/** Most gaps are near zero; the widest-gap pairs first surface the outliers worth reviewing. */
export const MAX_PAIRS = 40;

export type RuleSortKey = 'gap' | 'votes';

/**
 * One selectable rule on /calibration. `id` is the analytics ruleId, or the
 * tuning.json key for an entry no analytics rule reaches (a tuning-only row,
 * `stat: null`). `tuningKey` is the tuning.json entry holding the rule's copy,
 * null when there is none or tuning.json isn't loaded.
 */
export interface CalibrationRow {
  id: string;
  name: string;
  category: 'playstyle' | 'direct';
  stat: RuleStat | null;
  tuningKey: string | null;
}

/** What tuningKeyFor reads from a rule: an artifact rule, or just an id and a category. */
type RuleRef = Pick<RuleStat, 'ruleId' | 'category' | 'playstyleId'>;

/**
 * The tuning.json section and key a rule's copy would live under. The section
 * is always the artifact's category, which Deploy writes from app master (R-17).
 */
function tuningSlot(rule: RuleRef): {section: CalibrationRow['category']; key: string} {
  if (rule.category === 'direct') return {section: 'direct', key: rule.ruleId};
  // R2's precompute writes a playstyle rule's playstyleId from app master's engine.
  if (rule.playstyleId !== undefined) return {section: 'playstyle', key: rule.playstyleId ?? rule.ruleId};
  // An older artifact, or a local snapshot of one: ask the pinned engine. A rule
  // the pin doesn't know (or files as direct) keeps its own id.
  const engineRule = getRuleById(rule.ruleId);
  return {section: 'playstyle', key: engineRule?.category === 'playstyle' ? engineRule.playstyleId : rule.ruleId};
}

/**
 * The tuning.json key that holds a rule's copy, or null when there is none. A
 * playstyle rule's copy lives under its playstyleId (lore-loss under
 * lore-denial, every location-* rule under location-control), a direct rule's
 * under its own id. The section is always the artifact's category, and the
 * key its playstyleId, so both come from the same app master as the rule list;
 * an artifact written before R2 has no playstyleId, and the pinned engine's
 * stands in.
 */
export function tuningKeyFor(rule: RuleRef, config: TuningConfig): string | null {
  const {section, key} = tuningSlot(rule);
  const entries = section === 'playstyle' ? config.playstyles : config.directRules;
  return Object.hasOwn(entries, key) ? key : null;
}

/**
 * The selectable rules: every analytics rule, then every tuning.json entry no
 * analytics rule maps to. Without analytics (local dev, a failed Deploy) that
 * is tuning.json alone; without tuning.json (no token yet), the analytics alone.
 */
export function buildCalibrationRows(rules: RuleStat[] | null, config: TuningConfig | null): CalibrationRow[] {
  const rows: CalibrationRow[] = (rules ?? []).map((stat) => ({
    id: stat.ruleId,
    name: stat.ruleName,
    category: stat.category,
    stat,
    tuningKey: config ? tuningKeyFor(stat, config) : null,
  }));
  if (!config) return rows;
  const reached = new Set(rows.map((row) => row.tuningKey));
  const tuningOnly = (category: CalibrationRow['category'], entries: Record<string, {name: string}>) =>
    Object.entries(entries)
      .filter(([key]) => !reached.has(key))
      .map(([key, {name}]): CalibrationRow => ({id: key, name, category, stat: null, tuningKey: key}));
  return [...rows, ...tuningOnly('playstyle', config.playstyles), ...tuningOnly('direct', config.directRules)];
}

/**
 * Rows with a stat first, by |gap| (a null gap counts as 0) or by score votes,
 * largest first, ties in artifact order; tuning-only rows last, in tuning.json
 * order. The input array is not reordered.
 */
export function sortCalibrationRows(rows: CalibrationRow[], key: RuleSortKey): CalibrationRow[] {
  const rank = (stat: RuleStat) => (key === 'gap' ? Math.abs(stat.meanGap ?? 0) : stat.scoreVotes);
  const withStat = rows.filter((row): row is CalibrationRow & {stat: RuleStat} => row.stat != null);
  return [...withStat.sort((p, q) => rank(q.stat) - rank(p.stat)), ...rows.filter((row) => row.stat == null)];
}

/**
 * The row `?rule=` names: an exact row id first, else the first row whose
 * tuning key it is (the Locations entry, location-control, opens its first
 * location rule). Null for no id or one nothing matches.
 */
export function findRow(rows: CalibrationRow[], id: string | null): CalibrationRow | null {
  if (id == null) return null;
  return rows.find((row) => row.id === id) ?? rows.find((row) => row.tuningKey === id) ?? null;
}

/** The analytics rules whose copy is the tuning entry `key` (all nine location rules share location-control). */
export function rowsSharingKey(rows: CalibrationRow[], key: string): CalibrationRow[] {
  return rows.filter((row) => row.stat != null && row.tuningKey === key);
}

/** Tuning keys with a pending edit. path[1] is the key in all three sections (ruleTexts.ramp belongs to ramp). */
export function editedKeys(pending: PendingEdit[]): Set<string> {
  return new Set(pending.map((edit) => String(edit.path[1])));
}

/** One key per pair, whichever way round its cards come: the vote log sorts a < b, and pair_scores need not. */
export function pairId(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Every voted pair in a row's scope, widest |gap| first, uncapped: what the
 * charts plot. A null row is every pair; a row with no stat (tuning-only) has none.
 */
export function pairsInScope(pairs: PairStat[], row: CalibrationRow | null): PairStat[] {
  if (row && !row.stat) return [];
  const scoped = row ? pairs.filter((p) => p.rules.includes(row.id)) : pairs;
  return [...scoped].sort((p, q) => Math.abs(q.gap) - Math.abs(p.gap));
}

/** The pair list: the widest MAX_PAIRS of the scope. */
export function pairsFor(pairs: PairStat[], row: CalibrationRow | null): PairStat[] {
  return pairsInScope(pairs, row).slice(0, MAX_PAIRS);
}

/** The scope's record for a selected pair, matched either way round, or null. */
export function findPair(scope: PairStat[], selected: {a: string; b: string} | null): PairStat | null {
  if (!selected) return null;
  const id = pairId(selected.a, selected.b);
  return scope.find((p) => pairId(p.a, p.b) === id) ?? null;
}

/**
 * The listed pairs, plus the selected one at the end when the list doesn't
 * hold it: a dot picked on the scatter can sit below the widest MAX_PAIRS, and
 * the list still shows what is selected.
 */
export function withSelectedPair(
  listed: PairStat[],
  scope: PairStat[],
  selected: {a: string; b: string} | null,
): PairStat[] {
  const pick = findPair(scope, selected);
  return pick && !listed.includes(pick) ? [...listed, pick] : listed;
}

/** The raw votes on one pair, matched either way round; none without a pair. */
export function votesForPair(votes: VoteLogRow[], pair: {a: string; b: string} | null): VoteLogRow[] {
  if (!pair) return [];
  const id = pairId(pair.a, pair.b);
  return votes.filter((vote) => pairId(vote.a, vote.b) === id);
}

/** "557 votes", "1 vote". */
function voteCount(n: number): string {
  return `${fmtInt(n)} ${n === 1 ? 'vote' : 'votes'}`;
}

/**
 * What the scope row says is in scope: "All pairs", or the rule with its gap
 * and votes ("Ramp · gap −0.57 · 557 votes"). A rule nobody has scored yet,
 * tuning-only rows included, says so instead of "gap — · 0 votes".
 */
export function pairsHeading(row: CalibrationRow | null): string {
  if (!row) return 'All pairs';
  if (!row.stat?.scoreVotes) return `${row.name} · no score votes yet`;
  return `${row.name} · gap ${fmtGap(row.stat.meanGap)} · ${voteCount(row.stat.scoreVotes)}`;
}

/** The page header's summary: "Mean gap −0.30 · well-calibrated · 2,054 votes". */
export function calibrationSubtitle(global: GlobalStats | null): string {
  // Nothing here says whether tuning.json loaded, so the empty case names only the analytics.
  if (!global) return 'No vote analytics yet';
  return `Mean gap ${fmtGap(global.meanGap)} · ${verdictFor(global.meanGap).word} · ${voteCount(global.totalVotes)}`;
}
```

- [ ] **Step 11: Run it and watch it pass**

```bash
pnpm vitest run src/tools/analytics/calibration/__tests__/calibrationModel.test.ts
```

Expected: `Tests  49 passed (49)`.

- [ ] **Step 12: Lint, typecheck and the full suite**

```bash
pnpm lint
pnpm typecheck
pnpm test:run
```

Expected: all three exit 0. Nothing imports the model yet: R2-3 (`RulesTable`) and R2-6 (the page) are its first consumers.

- [ ] **Step 13: Commit the model**

After the owner approves, with the Bash tool:

```bash
git add src/tools/analytics/calibration/calibrationModel.ts src/tools/analytics/calibration/__tests__/calibrationModel.test.ts
USER_APPROVED=1 git commit -m "feat(calibration): map analytics rules to tuning.json entries (#24)"
```

<!--
Review notes on R2-1 (2026-10-05), as applied to this file:
- Note 1 (section from the artifact's category): applied. Step 10's tuningSlot and tuningKeyFor's doc comment, Step 8's inverted test, the Produces comment, the mapping table and the re-base notes now match header.md's re-base note 2 and its R-17 bullets. Verified in scratchpad/r2-rebase/sandbox-fix-R2-1: 49 passed, tsc clean, both blocks eslint-clean.
- Note 4 (stale "Header text to replace" block): applied. The block is deleted; header.md already reads "checked at pin bc877e17" and carries its own R-17 bullets.
- Notes 2, 3 and 5 are correct but edit header.md, which this pass may not touch. Not rejected; they are left for the header pass:
  - Note 2: header contract addition 8's bullets should become: scripts/lib/voteAnalytics.mjs exports ruleRosterEntry(rule) -> {ruleId, ruleName, category, playstyleId: string | null} (null for a direct rule); loadRuleRoster (scripts/precompute-vote-analytics.mjs:84-89) maps getAllRules() through it; rollUpByRule passes playstyleId: rule.playstyleId through unchanged, so a roster without it stays absent and the client falls back; four new cases in voteAnalytics.test.mjs; nothing logs it. Checked: the repo's loadRuleRoster is at :84-89 and rollUpByRule's returned object at :101-105.
  - Note 3: this file keeps its two commits (Steps 7 and 13). The header's task-table Commit cell for R2-1 should read: `feat(analytics): write each rule's playstyleId into the vote analytics (#24)`, then `feat(calibration): map analytics rules to tuning.json entries (#24)`.
  - Note 5: the header's "Deferred from R1" bullet should cite "Mean gap +0.83 · runs harsh · 1 vote", the case Step 8 tests; +0.12 is inside CALIBRATION_BAND (0.5, verdict.ts:4) and reads "well-calibrated".
-->
