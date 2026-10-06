> Part of [R: Admin redesign](../R-redesign.md), phase R2 ([R2-calibration-tuning.md](R2-calibration-tuning.md)). Read the main plan's decisions (R-17 to R-26 for R2), corrections, global constraints and shared interfaces, then the R2 header, first.

> **Re-base notes (R2-2, 2026-10-05).** Checked against `main` @ c92e260 (branch `feature/24-redesign-r2`), pin `upstream/inkweave` @ bc877e1, and decisions R-17 to R-26. The names are the header's: contract addition 9, the "Stale value (R-18)" bullets and the R2-2 row of the task table.
> - **R-18 replaces `reset` with `dropStale`.** The outline's `reset()` dropped every pending edit. Now `dropStale(config: TuningConfig): number` takes `tuning.json` as the reload read it.
>   - It keeps each pending edit that `stillApplies`: the reloaded file still holds the edit's `oldValue` at its path. That is the comparison `applyTuningEdits` makes with `expected`.
>   - It drops the rest (the value changed, or the path is gone), clears `result` and `error`, and returns how many it dropped.
>   - `stillApplies` is exported from `useTuningAdmin.ts`, with a private `valueAt` beside it. There is no separate module: the header keeps the conflict logic in `useTuningAdmin`.
>   - The count is returned, not kept. R2-5's aside holds it, words it and clears it on the next publish (hand-off below). So the wording (`reloadNote` in the previous draft) and the case "the next publish clears the count" move to R2-5 with it.
>   - Tests cover both kinds of edit, kept and dropped, through `stillApplies` and through the hook. They also cover the two races a reload has: an edit typed at another path while the read runs, and the stale field typed again meanwhile.
> - **R-18 needs the reloaded file, so `useLiveTuning.reload` now resolves with it.** Before, `reload` only bumped a version, so nothing could tell when the new file arrived or what it held. Now it is `() => Promise<TuningConfig | null>`. It resolves with the config once that config is on screen. It resolves null when the read failed (the state then says why, as before) or when a newer read replaced it. A ref counter keeps the guarantee the old effect cleanup gave: only the newest read sets the state. A new exported `UseLiveTuningResult` names the return type. The existing test's `act(() => result.current.reload())` changes to a block body. Left as it is, the arrow would hand `act` a promise and make it an un-awaited async act. `TuningPage`'s `onPublished={tuning.reload}` and `TuningEditor`'s `publishThenRefresh` still typecheck: a function returning a promise fits `() => void`, and the promise never rejects.
> - **R-26 adds a third failure kind.** The outline settled on two kinds. A GitHub 401 is now `'rejected-token'`.
>   - `ghJson` and `readRepoFile` (`src/github/githubCommit.ts:72` and `:88`) both start their errors with `GitHub <status> on`.
>   - The 401 check, `isRejectedToken`, goes in a new `src/github/rejectedToken.ts`, so R4's write pages can reuse it. It stays out of `githubCommit.ts`, where one more string argument fails CodeScene's gate.
>   - The outline's `publishFailure.ts` becomes `tuningFailure.ts` (`TuningFailureKind`, `tuningFailureKind`), since it classifies read errors too. `useLiveTuning` keeps a failed read's message as it was thrown ("GitHub 401 on …"), and the aside shows it after "Could not read tuning.json: ". That is the owner's stale-token case from R1-12 (progress.md:163).
>   - The kinds are tested against the real messages from `readRepoFile`, `applyTuningEdits`, `commitTuning` and `readTuning`, not against copied strings.
> - **`tuningName` checks own keys.** The outline's `config.playstyles[key]?.name ?? …` gives `"Object"` for `constructor`, so this version uses `Object.hasOwn`, as R2-1's `tuningKeyFor` does. `rowsForSelection` moves verbatim and keeps its plain index, because its callers pass keys `tuningKeyFor` already checked.
> - **`shiftTierRows` and `rampRows` stay module-private.** Only `rowsForSelection` and `RowSpec` are consumed.
> - **Code and pin facts re-checked; all still hold.**
>   - The `TuningEditor.tsx:17-67` block, `githubClient.ts:42`, `githubClient.test.ts:38`, and `useTuningAdmin.ts` `:1-3` / `:31-34` / `:34-44` / `:71-73` / `:105-115` all quote exactly.
>   - `githubCommit.ts:72`, `:88` and `:161` throw the messages the failure kinds are tested against, and `readRepoFile` is at `:83`.
>   - At bc877e1, `tuning.json` and `data/tuning.ts` are unchanged since 5a54ee9 (`git diff 5a54ee9 bc877e1` is empty for both): 22 playstyles, one direct rule `shift-targets`, and `TierText.score` optional (`activationBonus` has none).
>   - `TUNING` and `TuningConfig` are exported at `packages/synergy-engine/src/index.ts:144`.
> - **Line numbers later tasks cite move.**
>   - `PendingEdit`: `useTuningAdmin.ts:5-13` becomes `:6-14`. R2-1 runs first, so its citation holds when it runs.
>   - `EditableRow`: `TuningEditor.tsx:71-106` becomes `:20-55`.
>   - `publishThenRefresh`: `:115-117` becomes `:64-66`.
> - **Hand-off to R2-5** (what its re-base must change):
>   - `TuningState.live` keeps the header's `ReturnType<typeof useLiveTuning>`. That type is now `UseLiveTuningResult`, whose `reload` resolves with the config.
>   - The aside holds the count in `const [dropped, setDropped] = useState<number | null>(null)`.
>   - The tray's `onReload` becomes `() => { void live.reload().then((config) => { if (config) setDropped(admin.dropStale(config)); }); }`. The `admin` captured at the click is right: `dropStale` settles the paths that render knew of. An edit typed at another path while the read runs stays pending, and the next publish checks it.
>   - Publishing sets the count back to null before it calls `admin.publish()`: a publish starts a new outcome. Staging and reverting leave the count alone, so the note stays up while the user makes the dropped edits again. The case "the next publish clears the note" is R2-5's now.
>   - The wording is R2-5's too. As a pure `reloadNote(dropped: number): string` in a `.ts` module beside the aside (a component file may export only components), its three cases get unit tests:
>     - 0: "Reloaded tuning.json. Every pending edit still applies."
>     - 1: "Reloaded tuning.json. Dropped 1 edit whose value had changed: make it again."
>     - more: "Reloaded tuning.json. Dropped 3 edits whose values had changed: make them again."
>   - Render one `<div role="status">` whenever the tray renders, and put `reloadNote(dropped)` inside it while the count is non-null. A live region mounted together with its text often goes unannounced, and an info `Notice` is not a live region.
>   - R2-5's test "offers Reload tuning.json, which clears pending edits…" becomes "…which drops the stale edit, keeps the other, says 'Dropped 1 edit…', and calls `live.reload` once". Its fake `live.reload` becomes `vi.fn(async () => reloadedConfig)`.
>   - For R-26, offer "Forget token" in the tray when `admin.error !== null && tuningFailureKind(admin.error) === 'rejected-token'`, and in the aside's read error when `live.status === 'error' && tuningFailureKind(live.error) === 'rejected-token'`. `error` exists only on the `'error'` member of `LiveTuning`, so the status check comes first.
>   - Nothing changes for R2-6: `TunedWorkspace` passes `useLiveTuning(token)` through as it is.
> - **Interim.** Until R2-6 redirects `/tuning`, the old page's tray says "Reload tuning.json and make the edit again." and has no such button. This lands in the same phase PR as R2-5 and R2-6, so it never ships alone.
> - **Verified in a scratch sandbox.** The sandbox is a copy of `src/`, with `node_modules` and `upstream/` junctioned in read-only, its own Vite `cacheDir`, and the repo's Vitest setup plus the React Compiler preset.
>   - Every "expected failure" below was observed with the old files in place, and every "Before" block matched its file exactly once.
>   - With the changes: `src/tools/tuning` and `src/github` pass, 14 files and 81 tests (`src/tools/tuning` alone: 10 files, 54 tests). The full suite passes, 83 files and 719 tests, with `--maxWorkers 4`. At the default worker count, seven tests in unrelated chart, analytics and reveal files timed out while other sessions' suites ran; those six files pass alone.
>   - Mutation checks: matching stale edits by object, as the previous draft did, fails "drops a stale edit typed again…" (the edit stays in the tray). A plain path walk in `valueAt` fails the inherited-key case.
>   - `tsc -p` on the app tsconfig is clean. Every code block below passes `pnpm exec eslint --stdin`, and so does each edited file as a whole.
>   - CodeScene (local MCP) scores `useTuningAdmin.ts`, its test, `tuningFailure.ts` and both new tests 10.0.

### Task R2-2: Tuning rows, failure kinds, `dropStale`

**Files:**
- Create `src/tools/tuning/tuningRows.ts`. It takes `RowSpec`, `shiftTierRows`, `rampRows` and `rowsForSelection` verbatim from `src/tools/tuning/components/TuningEditor.tsx:17-67`, with `RowSpec` and `rowsForSelection` now exported. It adds `tuningName`, `tuningKind` and `pendingLabel`.
- Create `src/github/rejectedToken.ts`.
- Create `src/tools/tuning/tuningFailure.ts`.
- Modify `src/tools/tuning/components/TuningEditor.tsx`: lines 4-5 (an import) and lines 17-68 (deleted). `TuningEditor` keeps rendering from the moved rows until R2-7 deletes it.
- Modify `src/tools/tuning/useLiveTuning.ts` (the whole file): `reload` resolves with what it read.
- Modify `src/tools/tuning/useTuningAdmin.ts`: `:1-3` (imports), `:31-34` (`valueAt` and `stillApplies`, after `toPendingEdit`), `:34-44` (the result type), `:71-73` (next to `clear`), `:105-115` (the return).
- Modify `src/tools/tuning/githubClient.ts:42`: the stale-value message no longer says to reload the page, since the aside offers "Reload tuning.json". The substring "changed since the editor loaded it" stays, so `tuningFailureKind` still matches it.
- Test:
  - Create `src/github/rejectedToken.test.ts`, beside its module as `goLiveNote.test.ts` sits.
  - Create `src/tools/tuning/__tests__/tuningRows.test.ts` and `tuningFailure.test.ts`.
  - Modify `src/tools/tuning/__tests__/githubClient.test.ts:38`.
  - Modify `src/tools/tuning/__tests__/useLiveTuning.test.ts` (the whole file).
  - Modify `src/tools/tuning/__tests__/useTuningAdmin.test.ts` (an import, helpers, a `stillApplies` block, five cases).

**Interfaces:**
- **Consumes:**
  - `TuningConfig` from `inkweave-synergy-engine`; `TUNING` from it in tests only (the bundled `tuning.json`).
  - `PendingEdit` and `StageArgs` (`src/tools/tuning/useTuningAdmin.ts:5-13`, `:15-21`).
  - `readRepoFile` (`src/github/githubCommit.ts:83`); the `isRejectedToken` tests call the real one.
  - `applyTuningEdits`, `commitTuning` and `readTuning` (`src/tools/tuning/githubClient.ts`); the failure-kind tests call the real ones.
- **Produces:**
```ts
// src/tools/tuning/tuningRows.ts
export interface RowSpec {label: string; textPath?: (string | number)[]; textValue?: string; scorePath?: (string | number)[]; scoreValue?: number}
export function rowsForSelection(config: TuningConfig, selectedId: string): RowSpec[];
export function tuningName(config: TuningConfig, key: string): string;                  // own keys only, playstyles first; else the key
export function tuningKind(config: TuningConfig, key: string): 'playstyle' | 'direct';   // playstyles first
export function pendingLabel(ruleName: string, rowLabel: string, field: 'text' | 'score'): string; // "Shift Targets · curve.gap3 · score"

// src/github/rejectedToken.ts (R4's write pages reuse it)
export function isRejectedToken(message: string): boolean;                               // "GitHub 401 on …", the form ghJson and readRepoFile throw

// src/tools/tuning/tuningFailure.ts (the outline's publishFailure.ts)
export type TuningFailureKind = 'stale-value' | 'rejected-token' | 'other';
export function tuningFailureKind(message: string): TuningFailureKind;                   // a read error or a publish error

// src/tools/tuning/useTuningAdmin.ts
export function stillApplies(edit: Pick<PendingEdit, 'path' | 'oldValue'>, config: TuningConfig): boolean; // config holds oldValue at path: the check applyTuningEdits makes
// UseTuningAdminResult gains:
dropStale: (config: TuningConfig) => number; // keeps the edits that still apply, drops the rest, clears result and error, returns how many it dropped

// src/tools/tuning/useLiveTuning.ts
export type UseLiveTuningResult = LiveTuning & {reload: () => Promise<TuningConfig | null>}; // was {reload: () => void}
export function useLiveTuning(token: string): UseLiveTuningResult;
// reload resolves with the config once it is on screen; null when the read failed or a newer read replaced it
```

Run tests with `pnpm vitest run <path>`. On a fresh checkout, or after a pin bump, run `pnpm build:engine` first: `tuningRows.test.ts` reads the bundled `TUNING` from the engine's `dist`.

- [ ] **Step 1: Write the failing test for the moved rows and the new name helpers**

Create `src/tools/tuning/__tests__/tuningRows.test.ts`:
```ts
import {describe, expect, it} from 'vitest';
import {TUNING, type TuningConfig} from 'inkweave-synergy-engine';
import {pendingLabel, rowsForSelection, tuningKind, tuningName} from '../tuningRows';

// `both` sits in both sections, which tuning.json never does: it pins which one wins.
const CONFIG: TuningConfig = {
  playstyles: {ramp: {name: 'Ramp', tagline: 'Ink fast'}, both: {name: 'Both (playstyle)', tagline: 't'}},
  directRules: {
    'shift-targets': {name: 'Shift Targets', description: 'Shifters and their targets'},
    both: {name: 'Both (direct)', description: 'd'},
  },
  ruleTexts: {
    'shift-targets': {'curve.gap3': {score: 5, text: 'Wide gap'}, activationBonus: {text: 'Same target'}},
    ramp: {scores: {density: 5}, templates: {'ramp-ramp': 'Both accelerate'}},
  },
};

const SHIFT = ['ruleTexts', 'shift-targets'];

describe('rowsForSelection', () => {
  it('gives a playstyle its title and tagline', () => {
    expect(rowsForSelection(CONFIG, 'both').slice(0, 2)).toEqual([
      {label: 'Title', textPath: ['playstyles', 'both', 'name'], textValue: 'Both (playstyle)'},
      {label: 'Tagline', textPath: ['playstyles', 'both', 'tagline'], textValue: 't'},
    ]);
  });

  it('gives a direct rule its label and description, and Shift Targets a row per tier', () => {
    expect(rowsForSelection(CONFIG, 'shift-targets')).toEqual([
      {label: 'Label', textPath: ['directRules', 'shift-targets', 'name'], textValue: 'Shift Targets'},
      {
        label: 'Description',
        textPath: ['directRules', 'shift-targets', 'description'],
        textValue: 'Shifters and their targets',
      },
      {
        label: 'curve.gap3',
        textPath: [...SHIFT, 'curve.gap3', 'text'],
        textValue: 'Wide gap',
        scorePath: [...SHIFT, 'curve.gap3', 'score'],
        scoreValue: 5,
      },
      // A computed-score tier (Shift's activation bonus) has text and no score field.
      {label: 'activationBonus', textPath: [...SHIFT, 'activationBonus', 'text'], textValue: 'Same target'},
    ]);
  });

  it('adds the Ramp scores, then the Ramp templates', () => {
    expect(rowsForSelection(CONFIG, 'ramp')).toEqual([
      {label: 'Title', textPath: ['playstyles', 'ramp', 'name'], textValue: 'Ramp'},
      {label: 'Tagline', textPath: ['playstyles', 'ramp', 'tagline'], textValue: 'Ink fast'},
      {label: 'score · density', scorePath: ['ruleTexts', 'ramp', 'scores', 'density'], scoreValue: 5},
      {label: 'template · ramp-ramp', textPath: ['ruleTexts', 'ramp', 'templates', 'ramp-ramp'], textValue: 'Both accelerate'},
    ]);
  });

  it('gives an unknown key no rows', () => {
    expect(rowsForSelection(CONFIG, 'nope')).toEqual([]);
  });

  it('gives every tier of the bundled tuning.json a row, with a score path only where it has a score', () => {
    const tiers = rowsForSelection(TUNING, 'shift-targets').slice(2);
    expect(tiers.map((row) => row.label)).toEqual(Object.keys(TUNING.ruleTexts['shift-targets']));
    for (const row of tiers) {
      expect(row.scorePath !== undefined).toBe(TUNING.ruleTexts['shift-targets'][row.label].score !== undefined);
    }
  });
});

describe('tuningName and tuningKind', () => {
  it('read playstyles before direct rules', () => {
    expect(tuningName(CONFIG, 'both')).toBe('Both (playstyle)');
    expect(tuningKind(CONFIG, 'both')).toBe('playstyle');
  });

  it('name and place the bundled entries', () => {
    expect(tuningName(TUNING, 'location-control')).toBe('Locations');
    expect(tuningKind(TUNING, 'location-control')).toBe('playstyle');
    expect(tuningName(TUNING, 'shift-targets')).toBe('Shift Targets');
    expect(tuningKind(TUNING, 'shift-targets')).toBe('direct');
  });

  it('falls back to the key for an unknown or inherited one', () => {
    expect(tuningName(TUNING, 'nope')).toBe('nope');
    expect(tuningName(TUNING, 'constructor')).toBe('constructor');
  });
});

describe('pendingLabel', () => {
  it('names the entry, the row and the field', () => {
    expect(pendingLabel('Shift Targets', 'curve.gap3', 'score')).toBe('Shift Targets · curve.gap3 · score');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/tools/tuning/__tests__/tuningRows.test.ts`
Expected: FAIL, with `Error: Failed to resolve import "../tuningRows" from "src/tools/tuning/__tests__/tuningRows.test.ts". Does the file exist?` (1 file failed, no tests ran).

- [ ] **Step 3: Create `tuningRows.ts` and point `TuningEditor` at it**

Create `src/tools/tuning/tuningRows.ts`. The first four functions' bodies are `TuningEditor.tsx:17-67` unchanged:
```ts
import type {TuningConfig} from 'inkweave-synergy-engine';

/** One editable row: a text field, a score field or both, with the tuning.json paths they write. */
export interface RowSpec {
  label: string;
  textPath?: (string | number)[];
  textValue?: string;
  scorePath?: (string | number)[];
  scoreValue?: number;
}

/** Rows for the Shift Targets tier list — text plus an optional score per tier. */
function shiftTierRows(config: TuningConfig): RowSpec[] {
  return Object.entries(config.ruleTexts['shift-targets']).map(([tierKey, entry]) => ({
    label: tierKey,
    textPath: ['ruleTexts', 'shift-targets', tierKey, 'text'],
    textValue: entry.text,
    scorePath: entry.score !== undefined ? ['ruleTexts', 'shift-targets', tierKey, 'score'] : undefined,
    scoreValue: entry.score,
  }));
}

/** Rows for the Ramp rule — score-only rows plus template-text rows. */
function rampRows(config: TuningConfig): RowSpec[] {
  const scores = Object.entries(config.ruleTexts.ramp.scores).map(([k, v]) => ({
    label: `score · ${k}`,
    scorePath: ['ruleTexts', 'ramp', 'scores', k],
    scoreValue: v,
  }));
  const templates = Object.entries(config.ruleTexts.ramp.templates).map(([k, t]) => ({
    label: `template · ${k}`,
    textPath: ['ruleTexts', 'ramp', 'templates', k],
    textValue: t,
  }));
  return [...scores, ...templates];
}

/** Build the editable rows for a selected rule id. */
export function rowsForSelection(config: TuningConfig, selectedId: string): RowSpec[] {
  const rows: RowSpec[] = [];
  const playstyle = config.playstyles[selectedId];
  if (playstyle) {
    rows.push({label: 'Title', textPath: ['playstyles', selectedId, 'name'], textValue: playstyle.name});
    rows.push({label: 'Tagline', textPath: ['playstyles', selectedId, 'tagline'], textValue: playstyle.tagline});
  }
  const direct = config.directRules[selectedId];
  if (direct) {
    rows.push({label: 'Label', textPath: ['directRules', selectedId, 'name'], textValue: direct.name});
    rows.push({label: 'Description', textPath: ['directRules', selectedId, 'description'], textValue: direct.description});
  }
  if (selectedId === 'shift-targets') rows.push(...shiftTierRows(config));
  if (selectedId === 'ramp') rows.push(...rampRows(config));
  return rows;
}

/**
 * The display name of a tuning.json entry: its playstyle title or direct-rule
 * label, else the key. Inherited keys (`constructor`) don't count.
 */
export function tuningName(config: TuningConfig, key: string): string {
  if (Object.hasOwn(config.playstyles, key)) return config.playstyles[key].name;
  if (Object.hasOwn(config.directRules, key)) return config.directRules[key].name;
  return key;
}

/** The tuning.json section an entry lives in; a key in both reads as a playstyle, as rowsForSelection lists it first. */
export function tuningKind(config: TuningConfig, key: string): 'playstyle' | 'direct' {
  return Object.hasOwn(config.playstyles, key) ? 'playstyle' : 'direct';
}

/** A pending edit's label in the tray: "Shift Targets · curve.gap3 · score". */
export function pendingLabel(ruleName: string, rowLabel: string, field: 'text' | 'score'): string {
  return `${ruleName} · ${rowLabel} · ${field}`;
}
```

Edit `src/tools/tuning/components/TuningEditor.tsx`. Edit 1, the imports (lines 4-5).

Before:
```tsx
import {useTuningAdmin, type PendingEdit, type StageArgs} from '../useTuningAdmin';
import {RuleSelector} from './RuleSelector';
```
After:
```tsx
import {useTuningAdmin, type PendingEdit, type StageArgs} from '../useTuningAdmin';
import {rowsForSelection, type RowSpec} from '../tuningRows';
import {RuleSelector} from './RuleSelector';
```

Edit 2: delete what were lines 17-68, now 18-69. That is the four definitions plus the blank line after them, so the closing `}` of `TuningEditorProps` is followed by one blank line and then `type Path = (string | number)[];`.

Before:
```tsx
interface RowSpec {
  label: string;
  textPath?: (string | number)[];
  textValue?: string;
  scorePath?: (string | number)[];
  scoreValue?: number;
}

/** Rows for the Shift Targets tier list — text plus an optional score per tier. */
function shiftTierRows(config: TuningConfig): RowSpec[] {
  return Object.entries(config.ruleTexts['shift-targets']).map(([tierKey, entry]) => ({
    label: tierKey,
    textPath: ['ruleTexts', 'shift-targets', tierKey, 'text'],
    textValue: entry.text,
    scorePath: entry.score !== undefined ? ['ruleTexts', 'shift-targets', tierKey, 'score'] : undefined,
    scoreValue: entry.score,
  }));
}

/** Rows for the Ramp rule — score-only rows plus template-text rows. */
function rampRows(config: TuningConfig): RowSpec[] {
  const scores = Object.entries(config.ruleTexts.ramp.scores).map(([k, v]) => ({
    label: `score · ${k}`,
    scorePath: ['ruleTexts', 'ramp', 'scores', k],
    scoreValue: v,
  }));
  const templates = Object.entries(config.ruleTexts.ramp.templates).map(([k, t]) => ({
    label: `template · ${k}`,
    textPath: ['ruleTexts', 'ramp', 'templates', k],
    textValue: t,
  }));
  return [...scores, ...templates];
}

/** Build the editable rows for a selected rule id. */
function rowsForSelection(config: TuningConfig, selectedId: string): RowSpec[] {
  const rows: RowSpec[] = [];
  const playstyle = config.playstyles[selectedId];
  if (playstyle) {
    rows.push({label: 'Title', textPath: ['playstyles', selectedId, 'name'], textValue: playstyle.name});
    rows.push({label: 'Tagline', textPath: ['playstyles', selectedId, 'tagline'], textValue: playstyle.tagline});
  }
  const direct = config.directRules[selectedId];
  if (direct) {
    rows.push({label: 'Label', textPath: ['directRules', selectedId, 'name'], textValue: direct.name});
    rows.push({label: 'Description', textPath: ['directRules', selectedId, 'description'], textValue: direct.description});
  }
  if (selectedId === 'shift-targets') rows.push(...shiftTierRows(config));
  if (selectedId === 'ramp') rows.push(...rampRows(config));
  return rows;
}

```
After: nothing. The rest of the file (`type Path` to the end) is unchanged. `TuningConfig` stays imported, since `TuningEditorProps.config` uses it.

- [ ] **Step 4: Run the rows test and the editor's tests**

Run: `pnpm vitest run src/tools/tuning/__tests__/tuningRows.test.ts src/tools/tuning/__tests__/TuningEditor.test.tsx`
Expected: PASS, 2 files, 13 tests (9 new, the editor's 4 unchanged).

- [ ] **Step 5: Write the failing failure-kind tests and the new message wording**

Create `src/github/rejectedToken.test.ts`. It checks the real message `readRepoFile` fails with:
```ts
import {afterEach, describe, expect, it, vi} from 'vitest';
import {readRepoFile} from './githubCommit';
import {isRejectedToken} from './rejectedToken';

afterEach(() => vi.restoreAllMocks());

/** The message readRepoFile fails with when GitHub answers `status` with `body`. */
async function readFailure(status: number, body: string): Promise<string> {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body, {status}));
  try {
    await readRepoFile('old', 'packages/synergy-engine/src/data/tuning.json');
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  throw new Error('expected the read to fail');
}

describe('isRejectedToken', () => {
  it('is true for the 401 GitHub answers a token it no longer accepts', async () => {
    expect(isRejectedToken(await readFailure(401, '{"message":"Bad credentials"}'))).toBe(true);
  });

  it('is false for any other status, and for a request GitHub never answered', async () => {
    const forbidden = await readFailure(403, '{"message":"Resource not accessible by personal access token"}');
    expect(isRejectedToken(forbidden)).toBe(false);
    expect(isRejectedToken('Failed to fetch')).toBe(false);
  });
});
```

Create `src/tools/tuning/__tests__/tuningFailure.test.ts`. It classifies the real messages `applyTuningEdits`, `commitTuning` and `readTuning` fail with:
```ts
import {afterEach, describe, expect, it, vi} from 'vitest';
import {applyTuningEdits, commitTuning, readTuning} from '../githubClient';
import {tuningFailureKind} from '../tuningFailure';

afterEach(() => vi.restoreAllMocks());

/** The message a call fails with. */
async function failureOf(run: () => unknown): Promise<string> {
  try {
    await run();
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  throw new Error('expected the call to fail');
}

/** Every GitHub request answers 401, as it does for an expired token. */
function rejectToken() {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
    new Response('{"message":"Bad credentials","status":"401"}', {status: 401}),
  );
}

describe('tuningFailureKind', () => {
  it("classifies applyTuningEdits' refusal of a changed value as stale-value", async () => {
    const tuning = JSON.stringify({ruleTexts: {ramp: {scores: {density: 7}}}});
    const message = await failureOf(() =>
      applyTuningEdits(tuning, [{path: ['ruleTexts', 'ramp', 'scores', 'density'], value: 6, expected: 5}]),
    );
    expect(tuningFailureKind(message)).toBe('stale-value');
  });

  it('classifies a publish GitHub refuses with 401 as rejected-token', async () => {
    rejectToken();
    const message = await failureOf(() =>
      commitTuning({token: 'old', edits: [{path: ['playstyles', 'ramp', 'name'], value: 'Ramp!', expected: 'Ramp'}]}),
    );
    expect(tuningFailureKind(message)).toBe('rejected-token');
  });

  it('classifies a read of tuning.json GitHub refuses with 401 as rejected-token', async () => {
    rejectToken();
    expect(tuningFailureKind(await failureOf(() => readTuning('old')))).toBe('rejected-token');
  });

  it('classifies a moved branch and other GitHub errors as other', () => {
    expect(tuningFailureKind('master changed while publishing, so nothing was published. Publish again.')).toBe('other');
    expect(tuningFailureKind('GitHub 403 on /repos/Doberjohn/inkweave/git/refs/heads/master: Forbidden')).toBe('other');
    expect(tuningFailureKind('Failed to fetch')).toBe('other');
  });
});
```
There are three kinds, not two. The branch-moved message (`src/github/githubCommit.ts:161`) already ends "Publish again.", the edits stay pending and Publish stays enabled, so the UI needs nothing extra for it. A 401 needs "Forget token" (R-26). A 403 (a token without push access) stays `other`: GitHub accepted the token, and R-26 covers only a token it rejects.

Edit `src/tools/tuning/__tests__/githubClient.test.ts:38`.

Before:
```ts
    ).toThrow('ruleTexts.ramp.scores.density changed since the editor loaded it (now 7). Reload the page and make the edit again.');
```
After:
```ts
    ).toThrow('ruleTexts.ramp.scores.density changed since the editor loaded it (now 7). Reload tuning.json and make the edit again.');
```

- [ ] **Step 6: Run them to see them fail**

Run: `pnpm vitest run src/github/rejectedToken.test.ts src/tools/tuning/__tests__/tuningFailure.test.ts src/tools/tuning/__tests__/githubClient.test.ts`
Expected: FAIL (3 files failed; tests: 1 failed, 5 passed):
- `rejectedToken.test.ts`: `Error: Failed to resolve import "./rejectedToken" from "src/github/rejectedToken.test.ts". Does the file exist?`
- `tuningFailure.test.ts`: `Error: Failed to resolve import "../tuningFailure" from "src/tools/tuning/__tests__/tuningFailure.test.ts". Does the file exist?`
- `githubClient.test.ts > applyTuningEdits > refuses an edit whose value changed since the editor loaded it`: `AssertionError: expected [Function] to throw error including 'ruleTexts.ramp.scores.density changed…' but got 'ruleTexts.ramp.scores.density changed…'` (the two differ in the last sentence).

- [ ] **Step 7: Create `rejectedToken.ts` and `tuningFailure.ts`, and reword the stale-value message**

Create `src/github/rejectedToken.ts`:
```ts
/**
 * Whether GitHub rejected the token itself (401: invalid, expired or revoked).
 * ghJson and readRepoFile (githubCommit.ts) start a failed request's message
 * "GitHub <status> on", so a rejected token's reads "GitHub 401 on …".
 */
export function isRejectedToken(message: string): boolean {
  return /^GitHub 401 on /.test(message);
}
```

Create `src/tools/tuning/tuningFailure.ts`:
```ts
import {isRejectedToken} from '../../github/rejectedToken';

/** The kinds of failure the tuning editor tells apart. */
export type TuningFailureKind = 'stale-value' | 'rejected-token' | 'other';

/** applyTuningEdits' refusal (githubClient.ts). */
const STALE_VALUE = 'changed since the editor loaded it';

/**
 * What a failed read of tuning.json, or a failed publish, asks of the user:
 * - 'stale-value': applyTuningEdits refused an edit because tuning.json changed
 *   after it was read. Reloading tuning.json keeps the edits that still apply
 *   and drops the stale ones (R-18).
 * - 'rejected-token': GitHub answered 401, so the saved token is invalid or
 *   expired. Forgetting it brings the token gate back (R-26).
 * - 'other': anything else, the branch moving mid-publish included. The edits
 *   stay pending, Publish stays enabled, and the message says what to do.
 */
export function tuningFailureKind(message: string): TuningFailureKind {
  if (message.includes(STALE_VALUE)) return 'stale-value';
  if (isRejectedToken(message)) return 'rejected-token';
  return 'other';
}
```

Edit `src/tools/tuning/githubClient.ts:42`.

Before:
```ts
        `${path.join('.')} changed since the editor loaded it (now ${JSON.stringify(node[key])}). Reload the page and make the edit again.`,
```
After:
```ts
        `${path.join('.')} changed since the editor loaded it (now ${JSON.stringify(node[key])}). Reload tuning.json and make the edit again.`,
```

- [ ] **Step 8: Run them to see them pass**

Run: `pnpm vitest run src/github/rejectedToken.test.ts src/tools/tuning/__tests__/tuningFailure.test.ts src/tools/tuning/__tests__/githubClient.test.ts`
Expected: PASS, 3 files, 12 tests (2 and 4 new, the client's 6).

- [ ] **Step 9: Write the failing test for `stillApplies` (R-18)**

Edit `src/tools/tuning/__tests__/useTuningAdmin.test.ts`. Edit 1, the imports (lines 1-3).

Before:
```ts
import {describe, it, expect, vi} from 'vitest';
import {renderHook, act} from '@testing-library/react';
import {useTuningAdmin} from '../useTuningAdmin';
```
After:
```ts
import {describe, it, expect, vi} from 'vitest';
import {renderHook, act} from '@testing-library/react';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {stillApplies, useTuningAdmin} from '../useTuningAdmin';
```

Edit 2: after `stageScores` (lines 11-20), before `describe('useTuningAdmin', () => {`.

Before:
```ts
  return result;
}

describe('useTuningAdmin', () => {
```
After:
```ts
  return result;
}

const TITLE = ['playstyles', 'ramp', 'name'];

/** tuning.json as a reload reads it: PATH still holds 5, and Ramp's title is `rampTitle`. */
const reloaded = (rampTitle: string): TuningConfig => ({
  playstyles: {ramp: {name: rampTitle, tagline: 't'}},
  directRules: {},
  ruleTexts: {'shift-targets': {'curve.gap3': {score: 5, text: 'Wide'}}, ramp: {scores: {}, templates: {}}},
});

describe('useTuningAdmin', () => {
```

Edit 3: the end of the file (the last case's tail, lines 122-124).

Before:
```ts
    expect(result.current.publishDisabled).toBe(false);
  });
});
```
After:
```ts
    expect(result.current.publishDisabled).toBe(false);
  });
});

// Someone renamed Ramp after this editor read tuning.json.
describe('stillApplies', () => {
  const config = reloaded('Big Ramp');

  it('holds where the reloaded file still has the old value', () => {
    expect(stillApplies({path: PATH, oldValue: 5}, config)).toBe(true);
    expect(stillApplies({path: ['playstyles', 'ramp', 'tagline'], oldValue: 't'}, config)).toBe(true);
  });

  it('fails once the value changed', () => {
    expect(stillApplies({path: TITLE, oldValue: 'Ramp'}, config)).toBe(false);
  });

  it('fails once the path leads nowhere, or only through a string or an inherited key', () => {
    expect(stillApplies({path: ['ruleTexts', 'shift-targets', 'curve.gap9', 'score'], oldValue: 4}, config)).toBe(false);
    // A plain walk would find both: 'Big Ramp'.length is 8, and an object's constructor is named 'Object'.
    expect(stillApplies({path: [...TITLE, 'length'], oldValue: 8}, config)).toBe(false);
    expect(stillApplies({path: ['playstyles', 'constructor', 'name'], oldValue: 'Object'}, config)).toBe(false);
  });
});
```

- [ ] **Step 10: Run it to see it fail**

Run: `pnpm vitest run src/tools/tuning/__tests__/useTuningAdmin.test.ts`
Expected: FAIL (tests: 3 failed, 9 passed). The three `stillApplies` cases fail with `TypeError: stillApplies is not a function`.

- [ ] **Step 11: Add `stillApplies` to `useTuningAdmin.ts`**

Edit `src/tools/tuning/useTuningAdmin.ts`. Edit 1, the imports (lines 1-3).

Before:
```ts
import {useState} from 'react';
import {validateScore, validateText} from './validate';
import {commitTuning} from './githubClient';
```
After:
```ts
import {useState} from 'react';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {validateScore, validateText} from './validate';
import {commitTuning} from './githubClient';
```

Edit 2: after `toPendingEdit` (lines 31-34).

Before:
```ts
  return {pathKey, path, value: validated.value, oldValue, label, valid: true};
}

export interface UseTuningAdminResult {
```
After:
```ts
  return {pathKey, path, value: validated.value, oldValue, label, valid: true};
}

/** The value at `path`, or undefined once the path leads nowhere. Inherited keys don't count. */
function valueAt(config: TuningConfig, path: readonly (string | number)[]): unknown {
  let node: unknown = config;
  for (const key of path) {
    if (typeof node !== 'object' || node === null || !Object.hasOwn(node, key)) return undefined;
    node = (node as Record<string | number, unknown>)[key];
  }
  return node;
}

/**
 * Whether `config` still holds the edit's old value at its path: the check
 * applyTuningEdits makes with `expected` before it writes. A reload keeps the
 * pending edits that pass it and drops the rest (R-18).
 */
export function stillApplies(edit: Pick<PendingEdit, 'path' | 'oldValue'>, config: TuningConfig): boolean {
  return valueAt(config, edit.path) === edit.oldValue;
}

export interface UseTuningAdminResult {
```
The comparison is with `oldValue`, the value the editor showed, not with the trimmed value `publish` sends. That is the same value `publish` passes as `expected`.

- [ ] **Step 12: Run it to see it pass**

Run: `pnpm vitest run src/tools/tuning/__tests__/useTuningAdmin.test.ts`
Expected: PASS, 12 tests (9 existing, 3 new).

- [ ] **Step 13: Write the failing test for a reload that resolves with what it read**

Replace `src/tools/tuning/__tests__/useLiveTuning.test.ts`. Current file:
```ts
import {describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from '@testing-library/react';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {useLiveTuning} from '../useLiveTuning';

const readTuning = vi.hoisted(() => vi.fn());
vi.mock('../githubClient', () => ({readTuning}));

const config = (name: string): TuningConfig => ({
  playstyles: {ramp: {name, tagline: 't'}},
  directRules: {},
  ruleTexts: {'shift-targets': {}, ramp: {scores: {}, templates: {}}},
});

describe('useLiveTuning', () => {
  it('reloads on request, showing the values it has until the new ones arrive', async () => {
    readTuning.mockResolvedValueOnce(config('Before'));
    const {result} = renderHook(() => useLiveTuning('tok'));
    await waitFor(() => expect(result.current).toMatchObject({status: 'ready', config: config('Before')}));

    let finish: (value: TuningConfig) => void = () => {};
    readTuning.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    act(() => result.current.reload());
    expect(result.current).toMatchObject({status: 'ready', config: config('Before')});

    await act(async () => finish(config('After')));
    expect(result.current).toMatchObject({status: 'ready', config: config('After')});
  });
});
```
New file. The first case is unchanged except that its `act` callback gets a block body: once `reload` returns a promise, `act(() => result.current.reload())` would become an un-awaited async act.
```ts
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from '@testing-library/react';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {useLiveTuning} from '../useLiveTuning';

const readTuning = vi.hoisted(() => vi.fn());
vi.mock('../githubClient', () => ({readTuning}));

const config = (name: string): TuningConfig => ({
  playstyles: {ramp: {name, tagline: 't'}},
  directRules: {},
  ruleTexts: {'shift-targets': {}, ramp: {scores: {}, templates: {}}},
});

beforeEach(() => readTuning.mockReset());

/** Renders the hook once its first read has landed with `name`. */
async function loaded(name: string) {
  readTuning.mockResolvedValueOnce(config(name));
  const {result} = renderHook(() => useLiveTuning('tok'));
  await waitFor(() => expect(result.current).toMatchObject({status: 'ready', config: config(name)}));
  return result;
}

describe('useLiveTuning', () => {
  it('reloads on request, showing the values it has until the new ones arrive', async () => {
    readTuning.mockResolvedValueOnce(config('Before'));
    const {result} = renderHook(() => useLiveTuning('tok'));
    await waitFor(() => expect(result.current).toMatchObject({status: 'ready', config: config('Before')}));

    let finish: (value: TuningConfig) => void = () => {};
    readTuning.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    act(() => {
      void result.current.reload();
    });
    expect(result.current).toMatchObject({status: 'ready', config: config('Before')});

    await act(async () => finish(config('After')));
    expect(result.current).toMatchObject({status: 'ready', config: config('After')});
  });

  it('resolves a reload with the tuning.json it read', async () => {
    const result = await loaded('Before');
    readTuning.mockResolvedValueOnce(config('After'));
    let reloaded: TuningConfig | null = null;
    await act(async () => {
      reloaded = await result.current.reload();
    });
    expect(reloaded).toEqual(config('After'));
  });

  it('resolves a failed reload with null, and says why the read failed', async () => {
    const result = await loaded('Before');
    readTuning.mockRejectedValueOnce(new Error('GitHub 502 on packages/synergy-engine/src/data/tuning.json: Bad gateway'));
    let reloaded: TuningConfig | null = config('unset');
    await act(async () => {
      reloaded = await result.current.reload();
    });
    expect(reloaded).toBeNull();
    expect(result.current).toMatchObject({
      status: 'error',
      error: 'GitHub 502 on packages/synergy-engine/src/data/tuning.json: Bad gateway',
    });
  });

  it('keeps the newest read when an older one lands after it, and resolves the older with null', async () => {
    const result = await loaded('Before');
    let finishFirst: (value: TuningConfig) => void = () => {};
    readTuning.mockReturnValueOnce(new Promise((resolve) => (finishFirst = resolve)));
    readTuning.mockResolvedValueOnce(config('Second'));

    let first: Promise<TuningConfig | null> = Promise.resolve(null);
    act(() => {
      first = result.current.reload();
    });
    await act(async () => {
      await result.current.reload();
    });
    let landedLate: TuningConfig | null = config('unset');
    await act(async () => {
      finishFirst(config('First'));
      landedLate = await first;
    });

    expect(result.current).toMatchObject({status: 'ready', config: config('Second')});
    expect(landedLate).toBeNull();
  });
});
```

- [ ] **Step 14: Run it to see it fail**

Run: `pnpm vitest run src/tools/tuning/__tests__/useLiveTuning.test.ts`
Expected: FAIL (tests: 3 failed, 1 passed). Today's `reload` returns nothing:
- "resolves a reload with the tuning.json it read": `AssertionError: expected undefined to deeply equal { Object (playstyles, directRules, ...) }`
- "resolves a failed reload with null, …": `AssertionError: expected undefined to be null`
- "keeps the newest read …, and resolves the older with null": `AssertionError: expected undefined to be null`. Its state half already passes: the version counter's effect cleanup gave the same guarantee, and the new code must keep it.

- [ ] **Step 15: Make `reload` resolve with what it read**

Replace `src/tools/tuning/useLiveTuning.ts`. Current file:
```ts
import {useEffect, useState} from 'react';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {readTuning} from './githubClient';

export type LiveTuning =
  | {status: 'loading'}
  | {status: 'ready'; config: TuningConfig}
  | {status: 'error'; error: string};

/**
 * Reads tuning.json from the target branch, once per token and again on each
 * `reload()` (after a publish, so the next edits start from what was
 * published). A reload keeps the current values on screen until the new ones
 * arrive.
 */
export function useLiveTuning(token: string): LiveTuning & {reload: () => void} {
  const [state, setState] = useState<LiveTuning>({status: 'loading'});
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    readTuning(token).then(
      (config) => {
        if (!cancelled) setState({status: 'ready', config});
      },
      (e: unknown) => {
        if (!cancelled) setState({status: 'error', error: e instanceof Error ? e.message : 'Read failed'});
      },
    );
    return () => {
      cancelled = true;
    };
  }, [token, version]);

  return {...state, reload: () => setVersion((v) => v + 1)};
}
```
New file:
```ts
import {useEffect, useRef, useState, type RefObject} from 'react';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {readTuning} from './githubClient';

export type LiveTuning =
  | {status: 'loading'}
  | {status: 'ready'; config: TuningConfig}
  | {status: 'error'; error: string};

/** What useLiveTuning gives: the read's state, and a reload that resolves with what it put on screen. */
export type UseLiveTuningResult = LiveTuning & {reload: () => Promise<TuningConfig | null>};

/**
 * Starts a read of tuning.json. `newest` numbers the reads, and only the newest
 * one sets the state, so a slow read never lands over a newer one. Resolves
 * with the config once it is on screen, or with null when the read failed (the
 * state then says why) or a newer read replaced it.
 */
function startRead(
  token: string,
  newest: RefObject<number>,
  setState: (state: LiveTuning) => void,
): Promise<TuningConfig | null> {
  const read = ++newest.current;
  return readTuning(token).then(
    (config) => {
      if (read !== newest.current) return null;
      setState({status: 'ready', config});
      return config;
    },
    (e: unknown) => {
      if (read === newest.current) setState({status: 'error', error: e instanceof Error ? e.message : 'Read failed'});
      return null;
    },
  );
}

/**
 * Reads tuning.json from the target branch, once per token and again on each
 * `reload()`: after a publish, so the next edits start from what was
 * published, and after a stale-value refusal, so the pending edits can be
 * checked against the file as it is now (R-18). A reload keeps the current
 * values on screen until the new ones arrive.
 */
export function useLiveTuning(token: string): UseLiveTuningResult {
  const [state, setState] = useState<LiveTuning>({status: 'loading'});
  const newest = useRef(0);

  useEffect(() => {
    void startRead(token, newest, setState);
  }, [token]);

  return {...state, reload: () => startRead(token, newest, setState)};
}
```
Notes:
- A read that lands after unmount finds a newer number or an unmounted component, and React ignores a state update there. A token change starts a newer read, so the old token's read is ignored, as the old `cancelled` flag did it.
- Under StrictMode the effect runs twice, and the second read wins.
- `react-compiler/react-compiler` and `react-hooks` pass: the ref is touched only inside the effect and the returned `reload`, never during render.
- `TuningPage.tsx:22` (`onPublished={tuning.reload}`) and `TuningEditor`'s `publishThenRefresh` typecheck unchanged. A function returning a promise fits `() => void`, and the promise never rejects, so nothing goes unhandled.

- [ ] **Step 16: Run it to see it pass**

Run: `pnpm vitest run src/tools/tuning/__tests__/useLiveTuning.test.ts src/tools/tuning/__tests__/TuningPage.test.tsx`
Expected: PASS, 2 files; `useLiveTuning.test.ts` 4 tests, and `TuningPage.test.tsx` unchanged.

- [ ] **Step 17: Write the failing tests for `dropStale` (R-18): edits kept, edits dropped, and the reload's races**

Edit `src/tools/tuning/__tests__/useTuningAdmin.test.ts` as Step 9 left it. Edit 1: after `reloaded`, before `describe('useTuningAdmin', () => {`.

Before:
```ts
  ruleTexts: {'shift-targets': {'curve.gap3': {score: 5, text: 'Wide'}}, ramp: {scores: {}, templates: {}}},
});

describe('useTuningAdmin', () => {
```
After:
```ts
  ruleTexts: {'shift-targets': {'curve.gap3': {score: 5, text: 'Wide'}}, ramp: {scores: {}, templates: {}}},
});

/** Renders the hook with two edits staged: PATH 5 → 6 (stageScores labels it 'label') and Ramp's title 'Ramp' → 'Ramp!' ('title'). */
function stageTwo() {
  const result = stageScores('6');
  act(() => {
    result.current.stageEdit({path: TITLE, rawValue: 'Ramp!', kind: 'text', oldValue: 'Ramp', label: 'title'});
  });
  return result;
}

const labels = (pending: {label: string}[]) => pending.map((edit) => edit.label);

describe('useTuningAdmin', () => {
```

Edit 2: the end of the `useTuningAdmin` block, before Step 9's `stillApplies` block.

Before:
```ts
    expect(result.current.publishDisabled).toBe(false);
  });
});

// Someone renamed Ramp after this editor read tuning.json.
describe('stillApplies', () => {
```
After:
```ts
    expect(result.current.publishDisabled).toBe(false);
  });

  // Someone renamed Ramp after this editor read tuning.json, so the publish was refused.
  it('drops the edits that no longer apply, keeps the rest, and says how many it dropped', async () => {
    const stale = 'playstyles.ramp.name changed since the editor loaded it (now "Big Ramp"). Reload tuning.json and make the edit again.';
    commitTuning.mockRejectedValue(new Error(stale));
    const result = stageTwo();
    await act(async () => {
      await result.current.publish().catch(() => undefined);
    });
    expect(result.current.error).toBe(stale);

    let dropped = -1;
    act(() => {
      dropped = result.current.dropStale(reloaded('Big Ramp'));
    });
    expect(dropped).toBe(1);
    expect(labels(result.current.pending)).toEqual(['label']);
    expect(result.current.error).toBeNull();
  });

  it('keeps every edit when they all still apply', () => {
    const result = stageTwo();
    let dropped = -1;
    act(() => {
      dropped = result.current.dropStale(reloaded('Ramp'));
    });
    expect(dropped).toBe(0);
    expect(labels(result.current.pending)).toEqual(['label', 'title']);
  });

  it("clears the last publish's outcome", async () => {
    commitTuning.mockResolvedValue({commitUrl: 'https://github.com/x/y/commit/4'});
    const result = stageScores('6');
    await act(async () => {
      await result.current.publish();
    });
    expect(result.current.result).not.toBeNull();

    act(() => {
      result.current.dropStale(reloaded('Ramp'));
    });
    expect(result.current.result).toBeNull();
  });

  it('keeps an edit staged at another path while the reload ran, for the next publish to check', () => {
    const result = stageScores('6');
    const dropStaleAsAsked = result.current.dropStale; // the render the Reload click came from
    act(() => {
      result.current.stageEdit({path: TITLE, rawValue: 'Ramp!', kind: 'text', oldValue: 'Ramp', label: 'title'});
    });

    let dropped = -1;
    act(() => {
      dropped = dropStaleAsAsked(reloaded('Big Ramp'));
    });
    expect(dropped).toBe(0);
    expect(labels(result.current.pending)).toEqual(['label', 'title']);
  });

  it('drops a stale edit typed again while the reload ran, and counts it once', () => {
    const {result} = renderHook(() => useTuningAdmin('tok'));
    act(() => {
      result.current.stageEdit({path: TITLE, rawValue: 'Ramp!', kind: 'text', oldValue: 'Ramp', label: 'title'});
    });
    const dropStaleAsAsked = result.current.dropStale; // the render the Reload click came from
    act(() => {
      result.current.stageEdit({path: TITLE, rawValue: 'Ramp!!', kind: 'text', oldValue: 'Ramp', label: 'title'});
    });

    let dropped = -1;
    act(() => {
      dropped = dropStaleAsAsked(reloaded('Big Ramp'));
    });
    expect(dropped).toBe(1);
    expect(result.current.pending).toEqual([]);
  });
});

// Someone renamed Ramp after this editor read tuning.json.
describe('stillApplies', () => {
```
The last two cases pin the races the aside creates. Its Reload click awaits the read and then calls the `dropStale` it captured, so `dropStale` judges the paths that render knew of:
- An edit typed at another path while the read ran stays pending, and if it is stale, the next publish refuses it by name. This mirrors "keeps edits staged while a publish is in flight".
- The stale field typed again meanwhile is a new edit object with the same stale `oldValue`, which the editor still showed. Matching by object would keep it and still count it as dropped, so the note would say "Dropped 1 edit" with it in the tray. Matching by path drops it.

- [ ] **Step 18: Run it to see it fail**

Run: `pnpm vitest run src/tools/tuning/__tests__/useTuningAdmin.test.ts`
Expected: FAIL (tests: 5 failed, 12 passed). Three fail with `TypeError: result.current.dropStale is not a function`, and the last two with `TypeError: dropStaleAsAsked is not a function`.

- [ ] **Step 19: Add `dropStale` to `useTuningAdmin`**

Edit `src/tools/tuning/useTuningAdmin.ts` as Step 11 left it. Edit 1, the result type (lines 54-64).

Before:
```ts
export interface UseTuningAdminResult {
  pending: PendingEdit[];
  stageEdit: (args: StageArgs) => void;
  revertEdit: (pathKey: string) => void;
  clear: () => void;
  publish: () => Promise<{commitUrl: string}>;
  publishDisabled: boolean;
  publishing: boolean;
  result: {commitUrl: string} | null;
  error: string | null;
}
```
After:
```ts
export interface UseTuningAdminResult {
  pending: PendingEdit[];
  stageEdit: (args: StageArgs) => void;
  revertEdit: (pathKey: string) => void;
  clear: () => void;
  /**
   * Takes tuning.json as a reload read it: keeps the pending edits that still
   * apply, drops the rest, clears the last publish's outcome, and returns how
   * many it dropped (R-18).
   */
  dropStale: (config: TuningConfig) => number;
  publish: () => Promise<{commitUrl: string}>;
  publishDisabled: boolean;
  publishing: boolean;
  result: {commitUrl: string} | null;
  error: string | null;
}
```

Edit 2, after `clear` (lines 91-93).

Before:
```ts
  function clear() {
    setPending([]);
  }
```
After:
```ts
  function clear() {
    setPending([]);
  }

  function dropStale(config: TuningConfig): number {
    // Like publish, this settles the paths this render knew of. A stale path
    // typed again while the reload ran carries the same stale oldValue, so it
    // goes too; an edit at another path stays pending, and the next publish checks it.
    const stale = new Set(pending.filter((edit) => !stillApplies(edit, config)).map((edit) => edit.pathKey));
    setPending((prev) => prev.filter((edit) => !stale.has(edit.pathKey)));
    setResult(null);
    setError(null);
    return stale.size;
  }
```

Edit 3, the return (lines 125-135).

Before:
```ts
  return {
    pending,
    stageEdit,
    revertEdit,
    clear,
    publish,
    publishDisabled,
    publishing,
    result,
    error,
  };
```
After:
```ts
  return {
    pending,
    stageEdit,
    revertEdit,
    clear,
    dropStale,
    publish,
    publishDisabled,
    publishing,
    result,
    error,
  };
```
The count is of the stale paths that render knew of. A stale edit reverted while the read ran still counts, so the note then says it dropped an edit the user had already taken back. That takes a revert within the second or so the read runs, and nothing is lost: the edit was stale either way.

- [ ] **Step 20: Run it to see it pass**

Run: `pnpm vitest run src/tools/tuning/__tests__/useTuningAdmin.test.ts`
Expected: PASS, 17 tests (12 from Steps 9-12, 5 new).

- [ ] **Step 21: Run the tuning and GitHub folders, lint and typecheck**

Run: `pnpm vitest run src/tools/tuning src/github`
Expected: PASS, 14 files, 81 tests.

Run: `pnpm lint`
Expected: exit 0, no warnings in the changed files.

Run: `pnpm typecheck`
Expected: exit 0. `TuningPage.tsx` and `TuningEditor.tsx` compile against the new `reload` type unchanged.

Run: `grep -n "function rowsForSelection\|interface RowSpec" src/tools/tuning/components/TuningEditor.tsx`
Expected: no output (the rows live only in `tuningRows.ts`).

- [ ] **Step 22: Commit (after the owner approves)**

With the Bash tool, and only once the owner has approved this commit:
```bash
git add src/github/rejectedToken.ts src/github/rejectedToken.test.ts src/tools/tuning/tuningRows.ts src/tools/tuning/tuningFailure.ts src/tools/tuning/useLiveTuning.ts src/tools/tuning/useTuningAdmin.ts src/tools/tuning/githubClient.ts src/tools/tuning/components/TuningEditor.tsx src/tools/tuning/__tests__/tuningRows.test.ts src/tools/tuning/__tests__/tuningFailure.test.ts src/tools/tuning/__tests__/useLiveTuning.test.ts src/tools/tuning/__tests__/useTuningAdmin.test.ts src/tools/tuning/__tests__/githubClient.test.ts
USER_APPROVED=1 git commit -m "refactor(tuning): export the editor rows, classify failures and keep edits that still apply (#24)"
```
The pre-commit hook runs lint and the tests. If Vitest fails to start workers under load, stop any preview server and retry (memory: pre-commit worker timeout).

<!--
Review of R2-2 (2026-10-05): notes 1 to 4 applied in full. No note was rejected as wrong.
- Note 1: R2-2 now uses the header's names: tuningFailure.ts (TuningFailureKind, tuningFailureKind), src/github/rejectedToken.ts with its test beside it, stillApplies exported from useTuningAdmin.ts, dropStale(config): number, the header's commit message, and a rewritten R2-5 hand-off. staleEdits.ts was dropped rather than kept: the header lists no such file, and this pass may edit only R2-2.md. So valueAt is a private helper beside stillApplies, and reloadNote's wording moved to the R2-5 hand-off with the count. With that, header.md's re-base notes 3 and 6, contract addition 9, "Logic that stays where it is", "Stale value (R-18)" and the R2-2 task-table row all match this file.
- Note 2: applied inside dropStale (it matches by pathKey and returns stale.size), plus the case "drops a stale edit typed again while the reload ran, and counts it once".
- Note 5: valid, but not applied here. It edits header.md (contract addition 9's tuningRows comment), which this pass may not touch. R2-2 already exports only RowSpec and rowsForSelection and says why. The header comment should read: "RowSpec and rowsForSelection exported; shiftTierRows and rampRows stay private".
-->
