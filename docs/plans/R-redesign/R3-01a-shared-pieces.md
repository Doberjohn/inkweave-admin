> Part of [R: Admin redesign](../R-redesign.md), phase R3 ([R3-card-analytics.md](R3-card-analytics.md)). First read the main plan's decisions (R-28 to R-56 for R3), its corrections, global constraints and shared interfaces, and then the R3 header.

## Re-base notes (R3-1a)

This task is new: the outline has no R3-1a. The audit of 2026-10-06 found six pieces that R2 left private or put inside `calibration/`, which R3's card page needs as well (audit-synth.md, "R3-1a" and "Cross-task themes: Reuse"). R-54, R-43 and R-48 decide three of them. The task moves each piece once and switches every importer, so the R3 tasks that follow import a single shared copy. It is a pure move: nothing renders, reads or sorts differently. It is written against `main` @ `aea40b4` (branch `feature/24-redesign-r3`, R-56) and pin `upstream/inkweave` @ `bc877e1`. Every Before block below is quoted from that tree.

1. **What moves, and where to.**

   | Piece | Today | Moves to | Importers switched |
   |---|---|---|---|
   | `DataAsOf` (R-54) | four copies: private in `activity/ActivityPage.tsx:6-13` and `calibration/CalibrationPage.tsx:24-31`, inline in `overview/OverviewPage.tsx:19-23` and `web/WebAnalyticsPage.tsx:17-23` | `src/ui/DataAsOf.tsx` | the four pages, and `src/shell/PageLayout.stories.tsx:34-38` (a fifth inline copy) |
   | `LowNTag` (R-35) | private in `calibration/RulesTable.tsx:68-86` | `src/ui/LowNTag.tsx` | `RulesTable.tsx:125` |
   | `sharePercent` (R-43) | `calibration/chartData.ts:196-207` | `src/ui/format.ts` | `chartData.ts` (`histogramTable`), `GapHistogram.tsx:16`, `__tests__/chartData.test.ts:24` |
   | `focusHandoff.ts` (R-48) | `calibration/focusHandoff.ts` | `src/shell/focusHandoff.ts` | `CalibrationPage.tsx:12`, `TuningAside.tsx:19`, `CalibrationWorkspace.tsx:17`, `__tests__/TuningAside.test.tsx:11` |
   | `twoUp` (R2-6's grid) | private in `calibration/CalibrationWorkspace.tsx:84-96` | `src/ui/layout.ts` | `CalibrationWorkspace.tsx:104` and `:108` |
   | `VoteSpan` | `calibration/chartData.ts:300-309` | `activity/activityModel.ts`, beside `activityWindow`, which now returns it | `chartData.ts:319` and `:328`, `__tests__/chartData.test.ts:31`, `__tests__/CalibrationCharts.test.tsx:12` |

2. **`DataAsOf`: the four copies render alike, so one copy changes nothing on screen.**
   - `PageLayout` puts `meta` in `<p style={META}>` (`PageLayout.tsx:106`). `META` already sets `fontSize: ADMIN_TYPE.small` and `color: ADMIN_COLORS.muted` (`:42`).
   - `AdminStyles` has no `code` rule, so a bare `<code>` inherits the muted colour.
   - So the other copies only repeat what `META` already sets. That covers Activity's `<span style={{fontSize: small, color: muted}}>`, and the Overview's and Web's `<code style={{color: muted}}>`.
   - The shared copy follows `CalibrationPage`'s copy: a fragment with a bare `<code>`, as R-54 asks.
   - The one DOM change: on `/activity`, the words now sit directly in the `<p>`, with no `<span>` around them. No test reads that span. `ActivityPage.test.tsx:48` finds the date's `<code>`.
   - `PageLayout.tsx:64`'s doc example ("Data as of `<code>2026-09-30</code>`") is still true, and it stays.
3. **`LowNTag` takes its threshold as a prop.**
   - `LOW_N` lives in `calibration/calibrationModel.ts:15` (an alias of `overview/overviewStats.ts`'s `MIN_RULE_VOTES`). No source module in `src/ui`, `src/charts`, `src/theme` or `src/shell` imports from `src/tools` (R-53's rule), so the tag can't read `LOW_N` itself. Stories and tests aside: `src/charts/Charts.stories.tsx:5` imports `gapColor`, and `src/shell/AdminShell.test.tsx:4` imports `ImagePage`.
   - It takes `{minVotes}`, and its title stays "Fewer than {minVotes} score votes".
   - RulesTable passes `LOW_N`. R3-6a passes `MIN_RULE_VOTES` from `overviewStats.ts` (`R3-06a-view-shell.md:1263`), the name the card page already uses for its threshold: R3-2's `cardStats.ts` imports it too.
   - `isLowN` stays private in RulesTable. Only its doc comment changes, to name the moved tag.
   - The tag's chip has the same style as `RawTag` (`src/ui/RawTag.tsx:14-22`), plus `flex: 'none'`. They keep separate styles, as today. `RawTag` sits in `KpiCard`'s tag slot, and giving it `flex: 'none'` would be a change, not a move.
4. **`sharePercent` goes to `src/ui/format.ts`, as R-43 says.**
   - The R3-4c audit had suggested `src/charts/shares.ts`. R-43 decides otherwise.
   - The doc comment now covers every R3 share ("a part", not "a bin").
   - Its unit cases move with it, into `format.test.ts`, as one `it.each` table:
     - the four cases of `chartData.test.ts:170-194` that read `sharePercent` directly;
     - the 33/50/17% mapping.
   - `chartData.test.ts` keeps `gapShares`' two cases, and still prints them through `sharePercent`. Its `histogramTable` cases (`:255-275`, '<1%' and '>99%' among them) stay as they are, since they test the table.
5. **`focusHandoff.ts` goes to `src/shell`, as R-48 says** ("R2's focus handoff moved to `src/shell`").
   - The audit listed three importers. There is a fourth: `TuningAside.test.tsx:11`.
   - The module's doc comment is generalised: it now describes a handoff on any page, with /calibration as the first user. The code doesn't change.
   - It has no test file of its own. `TuningAside.test.tsx` (35 cases) and `CalibrationPage.test.tsx` cover it, and R3-7 adds the card page's Retry case.
6. **`twoUp` goes to `src/ui/layout.ts`.**
   - Its doc comment moves with it: the 346px floor comes from Panel's padding and ChartTooltip, and it holds for any page.
   - `CHARTS_ROW` (376px) and `PAIRS_ROW` (346px) stay in the workspace with their comments. Their reasons are specific to /calibration: the histogram's eleven bin labels.
   - A `.ts` file takes `CSSProperties` from `react` (`import type`), as `overview/CalibrationCard.tsx:1` does, rather than using the `React` global.
7. **`VoteSpan` moves beside `activityWindow`.**
   - `activityWindow` returned an inline `{startDay: Day; endDay: Day} | null` (`activityModel.ts:131`). It now returns `VoteSpan | null`, which has the same structure, so no caller changes.
   - The old doc comment had two parts:
     - "the log's first and last days" becomes the type's own comment;
     - the sentence about `weeklyGaps`' part weeks moves to `WeeklyScope.span` in `chartData.ts`, where it applies.
   - R3-3's `CardVoteSpan {votes, voters, days: VoteSpan}` (audit-R3-3) imports it from `activity/activityModel`.
8. **Not taken.**
   - `scoreText` and `gapColor` stay where they are (R3-6 decides). The task names six pieces, and the audit's note about `scoreText` (audit-R3-6) belongs to R3-6.
   - RawTag and LowNTag don't share a style (note 3).
   - `docs/plans/` stays as written. `R1-09-vote-activity.md:2723` still shows the private `DataAsOf`; the plans are a record.
9. **Order and dependencies.**
   - The task runs second, after R3-1, by the audit's order. It touches none of R3-1's files: `src/app-bridge.ts`, the vote-log types, `ActivityView.stories.tsx` and `activityModel.test.ts`. So the line numbers above still hold after R3-1.
   - It depends on no R3 task.
   - Later tasks depend on it directly (the header's task order, and the task files):
     - **R3-2:** nothing (its `lowN` flag needs no import; R3-6a renders `LowNTag`).
     - **R3-3:** `VoteSpan`.
     - **R3-4c:** `sharePercent` (`R3-04c-split-meter.md:41`). It also anchors on this task's `Tags` story in `Primitives.stories.tsx`.
     - **R3-6a:** `useTakeHandoff` and `FocusHandoff`, `twoUp(420)`, `LowNTag`, and `DataAsOf` in its stories (`R3-06a-view-shell.md:107-110`).
     - **R3-6b:** `sharePercent`, `VoteSpan` and `twoUp(376)` (`R3-06b-vote-panels.md:1355`, `:1377`).
     - **R3-6c:** the focus handoff, `useFocusHandoff` and `useTakeHandoff` (its Consumes).
     - **R3-7:** `useFocusHandoff`, `useTakeHandoff` and `DataAsOf`.
10. **Code Health.** Each new module is one function, at cc 3 or less, with one argument (a props object, or one number).

    Primitive arguments per module, counted the way the R2 fixes counted them: `string`, `number`, `boolean` and `Day` parameters of named functions.

    | Module | Before | After |
    |---|---|---|
    | `chartData.ts` | 8 of 31 | 7 of 30 |
    | `CalibrationWorkspace.tsx` | 2 of 26 | 1 of 25 |
    | `RulesTable.tsx` | 1 of 10 | 1 of 10 |
    | `activityModel.ts` | 14 of 49 (28.6%) | unchanged: `VoteSpan` is a type, not a parameter |
    | `layout.ts` | — | 1 of 1 |

    Two modules need watching:
    - **`activityModel.ts` is already close to the 30% limit.** R3-3 and R3-8 should not add functions with primitive parameters to it.
    - **`format.ts` grows from 9 parameters to 10** (7 primitive becomes 8).
      - R1's server gate passed it at 9.
      - The local CLI (MCP 1.1.3) flags this module's shape only from 14 parameters. It was probed with `format.ts` plus `sharePercent`, plus one-argument number functions: 13 parameters scored 10.0, and 14 scored 9.68 ("Primitive Obsession, 79%").
      - The server's lower limit isn't known.
      - If the PR's CodeScene check flags `format.ts`, the fallback is to give `sharePercent` its own `src/ui/share.ts`. That departs from R-43, so it needs the owner's word.
11. **Verified in a scratch sandbox** (`scratchpad/r3-rebase/sandbox-R3-1a`).
    - **Setup.**
      - `src` and `.storybook` came from `git archive` of `aea40b4`.
      - `node_modules` and `upstream` are junctions to the repo, read-only. The Vite and tsc caches stay in the sandbox.
      - The sandbox's `server.fs.allow` names the repo's `upstream`, because the junction resolves outside the sandbox root.
    - **Baseline:** 92 files and 1,050 tests, all passing. That counts `src` only: the sandbox had no `scripts/`, whose 27 test files `pnpm test:run` also runs.
    - **The red step.** Step 2's four test files against today's code fail exactly as Step 2 states.
    - **After every step:**
      - **Tests:** `vitest run src` passes 95 files and 1,061 tests. A second sandbox (`sandbox-R3-1a-fix`, with `scripts/lib` copied in) also passes `scripts/lib/__tests__/weeklyGapsParity.test.mjs`, which imports `chartData.ts`, with Step 6's other four files: 5 files and 165 tests.
      - **Typecheck:** `tsc -p tsconfig.app.json` exits 0.
      - **Build:** `vite build` succeeds.
      - **Lint:** `pnpm exec eslint --max-warnings 0 --stdin` against the repo's config is clean on all 24 new or edited files. A probe with a hex literal confirmed that the design-token rules fire through `--stdin`.
    - **Mutations.** Five were tried, and the new tests caught all five:
      - a `<span>` around `DataAsOf`;
      - a `style` on its `<code>`;
      - a hard-coded "10" in `LowNTag`'s title;
      - `>` for `>=` at `sharePercent`'s 0.995 boundary;
      - `twoUp` without `min(100%, …)`.
    - **CodeScene (local MCP 1.1.3):** 10.0 for 23 of the 24 paths in Step 12's `git add`, tests and stories included. `PageLayout.stories.tsx` has no function to score: its review returns `{"score":null,"review":[]}`, as it does at `aea40b4`. As the audit warns, a local 10.0 proves little on its own; see note 10.
    - **Step 9's sweep** was run on the sandbox; its expected output is quoted from that run.
12. **The main plan.** The plan commit records these moves (the `src/ui` rows, the `calibration/*` row, the `format.ts` block, the primitives, the shell block and `activityWindow`), and R3-9 checks them against the code.

    The block below, "Contract additions (R3-1a)", has the exact lines. `:644` (R2 as built) is history and stays.

### Contract additions (R3-1a)

The R3 header collects these. They add names and change no behaviour. The names that leave their old modules are listed under "Gone".

```ts
// src/ui/format.ts (R-43): moved from calibration/chartData.ts
export function sharePercent(fraction: number): string; // 1/3 -> "33%"; (0, 0.005) -> "<1%"; [0.995, 1) -> ">99%"; 0 -> "0%"; 1 -> "100%"

// src/ui/DataAsOf.tsx (R-54)
export function DataAsOf(props: {generatedAt: string}): JSX.Element; // "Data as of <code>YYYY-MM-DD</code>" (generatedAt.slice(0, 10)),
// a fragment: PageLayout's meta line sets the size and the muted colour

// src/ui/LowNTag.tsx (R-35): moved from RulesTable
export function LowNTag(props: {minVotes: number}): JSX.Element; // "low n", title "Fewer than {minVotes} score votes", flex: 'none';
// RulesTable passes LOW_N, the card page MIN_RULE_VOTES; the row's accessible name says "low n" too

// src/ui/layout.ts: moved from CalibrationWorkspace
export function twoUp(track: number): React.CSSProperties; // grid, repeat(auto-fit, minmax(min(100%, {track}px), 1fr)), gap SPACING.xl,
// alignItems start; a row of charts takes no track under 346px (376px where the histogram's bin labels must fit, R2-6)

// src/shell/focusHandoff.ts (R-48): moved from calibration/; code unchanged, doc comment generalised
export interface FocusHandoff {pending: boolean; request: () => void; done: () => void}
export function useFocusHandoff(): FocusHandoff;
export function focusUnmoved(from?: Element | null): boolean;
export function useTakeHandoff(handoff: FocusHandoff | undefined, container: RefObject<HTMLElement | null>, selector: string, ready?: boolean): void;

// src/tools/analytics/activity/activityModel.ts: VoteSpan moved from calibration/chartData.ts
export interface VoteSpan {startDay: Day; endDay: Day}
export function activityWindow(votes: readonly VoteLogRow[], range: RangePreset): VoteSpan | null; // was an inline {startDay; endDay} type

// Gone: chartData.ts's sharePercent and VoteSpan exports; src/tools/analytics/calibration/focusHandoff.ts; the private
// DataAsOf in ActivityPage and CalibrationPage; RulesTable's private LowNTag; CalibrationWorkspace's private twoUp
```

### Task R3-1a: Shared pieces

**Files:**
- **Create:**
  - `src/ui/DataAsOf.tsx`
  - `src/ui/LowNTag.tsx`
  - `src/ui/layout.ts`
  - `src/ui/__tests__/DataAsOf.test.tsx`
  - `src/ui/__tests__/LowNTag.test.tsx`
  - `src/ui/__tests__/layout.test.ts`
- **Move:** `src/tools/analytics/calibration/focusHandoff.ts` → `src/shell/focusHandoff.ts` (`git mv`; then its doc comment, `:3-9`).
- **Modify:**
  - `src/ui/format.ts`: the module comment (`:1-6`), and append `sharePercent` after `:63`.
  - `src/ui/__tests__/format.test.ts`: the import (`:2`), and a `describe` before `:84`.
  - `src/ui/Primitives.stories.tsx`: the imports (`:7`), and a `Tags` story before `:171`.
  - `src/shell/PageLayout.stories.tsx`: the imports (`:3`), and `ReadOnly`'s meta (`:34-38`).
  - `src/tools/analytics/activity/ActivityPage.tsx` (`:1-13`)
  - `src/tools/analytics/activity/activityModel.ts` (`:126-131`)
  - `src/tools/analytics/calibration/CalibrationPage.tsx` (`:3-6`, `:12`, `:22-32`)
  - `src/tools/analytics/calibration/CalibrationWorkspace.tsx` (`:3-6`, `:17`, `:84-96`)
  - `src/tools/analytics/calibration/RulesTable.tsx` (`:5-6`, `:60-86`, `:125`)
  - `src/tools/analytics/calibration/TuningAside.tsx` (`:6-7`, `:19`)
  - `src/tools/analytics/calibration/GapHistogram.tsx` (`:6`, `:16`)
  - `src/tools/analytics/calibration/chartData.ts` (`:6-8`, `:196-207`, `:300-319`)
  - `src/tools/analytics/calibration/__tests__/chartData.test.ts` (`:1-3`, `:24`, `:31`, `:170-194`)
  - `src/tools/analytics/calibration/__tests__/CalibrationCharts.test.tsx` (`:7`, `:12`)
  - `src/tools/analytics/calibration/__tests__/TuningAside.test.tsx` (`:6`, `:11`)
  - `src/tools/analytics/overview/OverviewPage.tsx` (`:1-2`, `:19-23`)
  - `src/tools/analytics/web/WebAnalyticsPage.tsx` (`:1-2`, `:17-23`)
- **Checked and kept:**
  - `src/shell/PageLayout.tsx:64` (its doc example is still true);
  - `src/shell/PageLayout.test.tsx` (it tests the `meta` slot with a plain string);
  - `src/ui/RawTag.tsx`;
  - `CalibrationWorkspace.tsx:378` (`:365` after Step 8; "which focusHandoff's take would refuse": the module keeps its name);
  - `docs/plans/**`.

**Interfaces:**
- **Consumes:**
  - `SPACING` (`xs`, `xl`) from `src/app-bridge.ts`; `ADMIN_COLORS`, `ADMIN_RADIUS` and `ADMIN_TYPE` from `src/theme/adminTheme.ts`.
  - `LOW_N` (`calibration/calibrationModel.ts:15`, `= MIN_RULE_VOTES`, 10).
  - `type Day` (`src/charts/scale.ts`).
  - `PageLayout`'s `meta`, rendered as `<p style={META}>` (`PageLayout.tsx:42`, `:106`).
- **Produces:** the "Contract additions (R3-1a)" block above. The existing tests that already pin the moved behaviour:
  - **`DataAsOf`:**
    - `CalibrationPage.test.tsx:214` ("Data as of 2026-09-29" on the element holding both), and `:238` and `:253` (absent while loading and after a failed load);
    - `WebAnalyticsPage.test.tsx:38` and `:41`;
    - the date in `ActivityPage.test.tsx:48` and `OverviewPage.test.tsx:34`.
  - **`LowNTag`:** `RulesTable.test.tsx:108-114` (the tag on each row), and `:153` and `:158` (the row names).
  - **`sharePercent`:** `chartData.test.ts`'s `histogramTable` cases.
  - **The focus handoff:** `TuningAside.test.tsx` (the save, forget, read-again and reload cases) and `CalibrationPage.test.tsx`.
  - **`VoteSpan`:**
    - `chartData.test.ts`'s `weekTitle` and `weeklySubtitle` cases;
    - `CalibrationCharts.test.tsx`'s `WHOLE_WEEKS` and `ENDS_MID_WEEK`;
    - `pnpm typecheck`, since a type import is erased before Vitest runs it.

This task moves code, so its red step is the new module tests in Step 2. Every other step must keep the existing tests green.

- [ ] **Step 1: Check the starting point**

From the repo root:

```bash
git branch --show-current
git status --short -- src
git grep -n -E "function DataAsOf|Data as of <code|function LowNTag|export function sharePercent|export interface VoteSpan|function twoUp" -- src
git grep -n -E "from '(\./|\.\./)focusHandoff'" -- src
```

Expected:
- `feature/24-redesign-r3`, then nothing from `git status` (R3-1 is committed and `src` is clean).
- Exactly these twelve lines from the first `git grep`:
  ```
  src/shell/PageLayout.stories.tsx:36:        Data as of <code>2026-09-30</code>
  src/shell/PageLayout.tsx:64:  /** Right of the title, before any actions; phrasing content only (it renders in a <p>), e.g. "Data as of <code>2026-09-30</code>". */
  src/tools/analytics/activity/ActivityPage.tsx:7:function DataAsOf({generatedAt}: {generatedAt: string}) {
  src/tools/analytics/activity/ActivityPage.tsx:10:      Data as of <code>{generatedAt.slice(0, 10)}</code>
  src/tools/analytics/calibration/CalibrationPage.tsx:25:function DataAsOf({generatedAt}: {generatedAt: string}) {
  src/tools/analytics/calibration/CalibrationPage.tsx:28:      Data as of <code>{generatedAt.slice(0, 10)}</code>
  src/tools/analytics/calibration/CalibrationWorkspace.tsx:89:function twoUp(track: number): React.CSSProperties {
  src/tools/analytics/calibration/RulesTable.tsx:69:function LowNTag() {
  src/tools/analytics/calibration/chartData.ts:203:export function sharePercent(fraction: number): string {
  src/tools/analytics/calibration/chartData.ts:306:export interface VoteSpan {
  src/tools/analytics/overview/OverviewPage.tsx:21:      Data as of <code style={{color: ADMIN_COLORS.muted}}>{analytics.generatedAt.slice(0, 10)}</code>
  src/tools/analytics/web/WebAnalyticsPage.tsx:20:            Data as of <code style={{color: ADMIN_COLORS.muted}}>{data.generatedAt.slice(0, 10)}</code>
  ```
- Exactly these four lines from the second:
  ```
  src/tools/analytics/calibration/CalibrationPage.tsx:12:import {useFocusHandoff} from './focusHandoff';
  src/tools/analytics/calibration/CalibrationWorkspace.tsx:17:import type {FocusHandoff} from './focusHandoff';
  src/tools/analytics/calibration/TuningAside.tsx:19:import {focusUnmoved, useTakeHandoff, type FocusHandoff} from './focusHandoff';
  src/tools/analytics/calibration/__tests__/TuningAside.test.tsx:11:import {useFocusHandoff} from '../focusHandoff';
  ```

What to do if the output differs:
- **A file under `src/ui` or `src/shell` already defines one of the pieces:** an earlier task moved it. Stop and report.
- **The line numbers differ but the lines are the same:** an earlier task edited the file. Apply the Before blocks below to the lines as they are.

- [ ] **Step 2: Write the failing tests for the shared modules**

Create `src/ui/__tests__/DataAsOf.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {DataAsOf} from '../DataAsOf';

describe('DataAsOf', () => {
  it('dates the data by the UTC day of generatedAt, in a bare <code> straight inside its line', () => {
    // PageLayout puts its meta in a <p>.
    render(
      <p>
        <DataAsOf generatedAt="2026-10-05T04:12:09.123Z" />
      </p>,
    );
    const line = screen.getByText(/Data as of/);
    const day = screen.getByText('2026-10-05');
    expect(line.tagName).toBe('P');
    expect(line).toHaveTextContent('Data as of 2026-10-05');
    expect(day.tagName).toBe('CODE');
    // No wrapper of its own: the line holds the words and the <code> alone.
    expect(line.children).toHaveLength(1);
    expect(line.firstElementChild).toBe(day);
    // The meta line sets the size and the muted colour; the day takes them as they are.
    expect(day).not.toHaveAttribute('style');
  });
});
```

Create `src/ui/__tests__/LowNTag.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {LowNTag} from '../LowNTag';

describe('LowNTag', () => {
  it('reads "low n" in the muted colour, and gives the threshold it was passed on hover', () => {
    const {rerender} = render(<LowNTag minVotes={10} />);
    const tag = screen.getByText('low n');
    expect(tag).toHaveAttribute('title', 'Fewer than 10 score votes');
    expect(tag).toHaveStyle({color: ADMIN_COLORS.muted});

    rerender(<LowNTag minVotes={5} />);
    expect(screen.getByText('low n')).toHaveAttribute('title', 'Fewer than 5 score votes');
  });
});
```

Create `src/ui/__tests__/layout.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {SPACING} from '../../app-bridge';
import {twoUp} from '../layout';

describe('twoUp', () => {
  it('fits as many tracks as the row holds, each at least the given width, and stacks them below that', () => {
    expect(twoUp(346)).toEqual({
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 346px), 1fr))',
      gap: SPACING.xl,
      alignItems: 'start',
    });
    expect(twoUp(376).gridTemplateColumns).toBe('repeat(auto-fit, minmax(min(100%, 376px), 1fr))');
  });
});
```

In `src/ui/__tests__/format.test.ts`, change the import (`:2`). Before:
```ts
import {fmtDay, fmtGap, fmtInt, fmtScore, fmtWeekday} from '../format';
```
After:
```ts
import {fmtDay, fmtGap, fmtInt, fmtScore, fmtWeekday, sharePercent} from '../format';
```

Then insert this block just above `describe('fmtDay and fmtWeekday', () => {` (`:84`). The cases are those of `chartData.test.ts:170-194`, which Step 6 deletes, written as one table:

```ts
// Moved with sharePercent from calibration's chartData.test.ts (R3-1a). A part
// with any share never reads 0%, and one short of the whole never 100% (R-43).
describe('sharePercent', () => {
  it.each([
    [1 / 3, '33%'],
    [1 / 2, '50%'],
    [1 / 6, '17%'],
    [0, '0%'],
    [1 / 400, '<1%'],
    [0.0049, '<1%'],
    [0.005, '1%'],
    [0.994, '99%'],
    [0.995, '>99%'],
    [1, '100%'],
  ])('prints %s as %s', (fraction, text) => {
    expect(sharePercent(fraction)).toBe(text);
  });
});

```

Run: `pnpm vitest run src/ui/__tests__/format.test.ts src/ui/__tests__/DataAsOf.test.tsx src/ui/__tests__/LowNTag.test.tsx src/ui/__tests__/layout.test.ts`

Expected: FAIL, `Test Files  4 failed (4)` and `Tests  10 failed | 23 passed (33)`:
- `DataAsOf.test.tsx`: `Error: Failed to resolve import "../DataAsOf" from "src/ui/__tests__/DataAsOf.test.tsx". Does the file exist?`
- `LowNTag.test.tsx` and `layout.test.ts`: the same error for `"../LowNTag"` and `"../layout"`.
- `format.test.ts`: the ten new `sharePercent > prints … as …` cases, each with `TypeError: sharePercent is not a function`. The other 23 pass.

- [ ] **Step 3: Create the shared modules**

Create `src/ui/DataAsOf.tsx`:

```tsx
/**
 * A page header's meta line, "Data as of 2026-10-05": the UTC day admin's
 * Deploy workflow built the artifact the page reads. PageLayout's meta line
 * sets the size and the muted colour, so this sets neither, and the day is a
 * bare <code> (R-7). It renders no element of its own around the words, so it
 * fits wherever phrasing content does (the meta line is a <p>).
 */
export function DataAsOf({generatedAt}: {generatedAt: string}) {
  return (
    <>
      Data as of <code>{generatedAt.slice(0, 10)}</code>
    </>
  );
}
```

Create `src/ui/LowNTag.tsx`. The body is RulesTable's (`:69-86`), with `LOW_N` replaced by the prop:

```tsx
import {SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../theme/adminTheme';

/**
 * The "low n" tag: a number that rests on fewer than `minVotes` score votes is
 * thin evidence. The caller decides when it shows and passes its threshold
 * (calibrationModel's LOW_N, which is MIN_RULE_VOTES), and its row's
 * accessible name should say "low n" too, since the tag is only text beside a
 * name. It is RawTag's chip, kept from shrinking in a flex row. Moved from
 * RulesTable (R3-1a).
 */
export function LowNTag({minVotes}: {minVotes: number}) {
  return (
    <span
      title={`Fewer than ${minVotes} score votes`}
      style={{
        flex: 'none',
        fontSize: ADMIN_TYPE.micro,
        fontWeight: 500,
        lineHeight: 1.4,
        color: ADMIN_COLORS.muted,
        border: `1px solid ${ADMIN_COLORS.strongBorder}`,
        borderRadius: ADMIN_RADIUS.tag,
        padding: `0 ${SPACING.xs}px`,
      }}>
      low n
    </span>
  );
}
```

Create `src/ui/layout.ts`. The body is the workspace's (`:89-96`):

```ts
import type {CSSProperties} from 'react';
import {SPACING} from '../app-bridge';

/**
 * A row of panels: two side by side once the row holds two `track`-wide
 * columns and the gap, stacked below that (`min(100%, …)` keeps one column
 * from overflowing a narrower row). A chart's padded Panel takes 42px of its
 * track, so the plot is the track less 42px, and ChartTooltip needs 304px of
 * it: a row of charts takes no track under 346px. Moved from R2's calibration
 * workspace (R3-1a).
 */
export function twoUp(track: number): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${track}px), 1fr))`,
    gap: SPACING.xl,
    alignItems: 'start',
  };
}
```

In `src/ui/format.ts`, the module comment (`:1-6`) names shares too, rewrapped in the same six lines. Before:
```ts
/**
 * Number and date text shared by every admin page. Negative numbers carry the
 * true minus sign (U+2212) and a missing value reads as an em dash. Days are
 * 'YYYY-MM-DD' strings read as UTC calendar days, so a label never shifts with
 * the viewer's time zone.
 */
```
After:
```ts
/**
 * Number, share and date text shared by every admin page. Negative numbers
 * carry the true minus sign (U+2212) and a missing value reads as an em dash.
 * Days are 'YYYY-MM-DD' strings read as UTC calendar days, so a label never
 * shifts with the viewer's time zone.
 */
```

Then append after `fmtWeekday` (after `:63`). The body is `chartData.ts:203-207`'s:

```ts

/**
 * A share, from 0 to 1, as a whole percentage: 1 / 3 -> "33%". Each part
 * rounds on its own (R-43). A share above zero that would round to 0 prints
 * "<1%", so a part with any never reads "0%"; one below 1 that would round to
 * 100 prints ">99%", so a part short of the whole never reads "100%". Moved
 * from calibration/chartData.ts (R3-1a), so R2's gap histogram and R3's card
 * page share one rule.
 */
export function sharePercent(fraction: number): string {
  if (fraction > 0 && fraction < 0.005) return '<1%';
  if (fraction < 1 && fraction >= 0.995) return '>99%';
  return `${Math.round(fraction * 100)}%`;
}
```

Until Step 6, `chartData.ts` still has its own `sharePercent`. Nothing imports both, and Step 6 deletes the old one.

Run: `pnpm vitest run src/ui/__tests__/format.test.ts src/ui/__tests__/DataAsOf.test.tsx src/ui/__tests__/LowNTag.test.tsx src/ui/__tests__/layout.test.ts`

Expected: PASS, `Test Files  4 passed (4)` and `Tests  36 passed (36)`.

- [ ] **Step 4: Switch the four pages, and the header story, to `DataAsOf` (R-54)**

`src/tools/analytics/activity/ActivityPage.tsx` (`:1-13`). Before:
```tsx
import {PageLayout} from '../../../shell/PageLayout';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {useVoteLog} from '../useVoteLog';
import {ActivityView} from './ActivityView';

/** "Data as of 2026-10-01": the day admin's Deploy workflow built the vote log. */
function DataAsOf({generatedAt}: {generatedAt: string}) {
  return (
    <span style={{fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>
      Data as of <code>{generatedAt.slice(0, 10)}</code>
    </span>
  );
}
```
After:
```tsx
import {PageLayout} from '../../../shell/PageLayout';
import {DataAsOf} from '../../../ui/DataAsOf';
import {useVoteLog} from '../useVoteLog';
import {ActivityView} from './ActivityView';
```
The page's use, `meta={data ? <DataAsOf generatedAt={data.generatedAt} /> : undefined}>` (`:27`), stays as it is.

`src/tools/analytics/calibration/CalibrationPage.tsx`, the imports (`:5-6`). Before:
```tsx
import {UnsavedChangesGuard} from '../../../shell/UnsavedChangesGuard';
import {useLiveTuning} from '../../tuning/useLiveTuning';
```
After:
```tsx
import {UnsavedChangesGuard} from '../../../shell/UnsavedChangesGuard';
import {DataAsOf} from '../../../ui/DataAsOf';
import {useLiveTuning} from '../../tuning/useLiveTuning';
```

The private copy (`:22-32`). Before:
```tsx
const BRANCH_LABEL = 'Tuning writes to Doberjohn/inkweave';

/** "Data as of 2026-09-30": the day admin's Deploy workflow built the analytics. */
function DataAsOf({generatedAt}: {generatedAt: string}) {
  return (
    <>
      Data as of <code>{generatedAt.slice(0, 10)}</code>
    </>
  );
}

```
After:
```tsx
const BRANCH_LABEL = 'Tuning writes to Doberjohn/inkweave';

```
The use at `:88` stays.

`src/tools/analytics/overview/OverviewPage.tsx`, the imports (`:1-2`). Before:
```tsx
import {PageLayout} from '../../../shell/PageLayout';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
```
After:
```tsx
import {PageLayout} from '../../../shell/PageLayout';
import {DataAsOf} from '../../../ui/DataAsOf';
```
The meta (`:19-23`). Before:
```tsx
  const meta = analytics ? (
    <>
      Data as of <code style={{color: ADMIN_COLORS.muted}}>{analytics.generatedAt.slice(0, 10)}</code>
    </>
  ) : undefined;
```
After:
```tsx
  const meta = analytics ? <DataAsOf generatedAt={analytics.generatedAt} /> : undefined;
```
`ADMIN_COLORS` had no other use in the file.

`src/tools/analytics/web/WebAnalyticsPage.tsx`, the imports (`:1-2`). Before:
```tsx
import {PageLayout} from '../../../shell/PageLayout';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
```
After:
```tsx
import {PageLayout} from '../../../shell/PageLayout';
import {DataAsOf} from '../../../ui/DataAsOf';
```
The meta (`:17-23`). Before:
```tsx
      meta={
        data ? (
          <>
            Data as of <code style={{color: ADMIN_COLORS.muted}}>{data.generatedAt.slice(0, 10)}</code>
          </>
        ) : undefined
      }>
```
After:
```tsx
      meta={data ? <DataAsOf generatedAt={data.generatedAt} /> : undefined}>
```

`src/shell/PageLayout.stories.tsx`, the imports (`:3-4`). Before:
```tsx
import {ADMIN_COLORS} from '../theme/adminTheme';
import {PAGE_GUTTER, PageLayout} from './PageLayout';
```
After:
```tsx
import {ADMIN_COLORS} from '../theme/adminTheme';
import {DataAsOf} from '../ui/DataAsOf';
import {PAGE_GUTTER, PageLayout} from './PageLayout';
```
`ReadOnly`'s meta (`:34-38`). Before:
```tsx
    meta: (
      <>
        Data as of <code>2026-09-30</code>
      </>
    ),
```
After:
```tsx
    meta: <DataAsOf generatedAt="2026-09-30T04:00:00.000Z" />,
```

Why there is no visual change: `PageLayout` renders `meta` in `<p style={META}>` (`PageLayout.tsx:106`), and `META` sets `fontSize: ADMIN_TYPE.small` and `color: ADMIN_COLORS.muted` (`:42`). `AdminStyles` has no `code` rule. So Activity's `<span>` and the Overview's and Web's `color` on `<code>` only repeated what the line already had.

Run: `pnpm vitest run src/tools/analytics/activity/__tests__/ActivityPage.test.tsx src/tools/analytics/calibration/__tests__/CalibrationPage.test.tsx src/tools/analytics/overview/__tests__/OverviewPage.test.tsx src/tools/analytics/web/__tests__/WebAnalyticsPage.test.tsx src/shell/PageLayout.test.tsx`

Expected: PASS, `Test Files  5 passed (5)` and `Tests  65 passed (65)` (2, 53, 1, 2 and 7). They passed before this step too: the step is a move. `CalibrationPage.test.tsx:214` still finds "Data as of 2026-09-29" on the `<p>` that holds the words and the date.

- [ ] **Step 5: Switch RulesTable to the shared `LowNTag`**

`src/tools/analytics/calibration/RulesTable.tsx`, the imports (`:5-6`). Before:
```tsx
import {fmtGap, fmtInt} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
```
After:
```tsx
import {fmtGap, fmtInt} from '../../../ui/format';
import {LowNTag} from '../../../ui/LowNTag';
import {Panel} from '../../../ui/Panel';
```

`isLowN`'s doc comment and the private tag (`:60-87`). Before:
```tsx
/**
 * Under LOW_N score votes a rule's gap is thin evidence, and a rule nobody has
 * scored has none. A tuning-only row has no stat, so no tag.
 */
function isLowN(stat: RuleStat | null): boolean {
  return stat != null && stat.scoreVotes < LOW_N;
}

/** The "low n" tag (isLowN). The row's name says it too (rowLabel). */
function LowNTag() {
  return (
    <span
      title={`Fewer than ${LOW_N} score votes`}
      style={{
        flex: 'none',
        fontSize: ADMIN_TYPE.micro,
        fontWeight: 500,
        lineHeight: 1.4,
        color: ADMIN_COLORS.muted,
        border: `1px solid ${ADMIN_COLORS.strongBorder}`,
        borderRadius: ADMIN_RADIUS.tag,
        padding: `0 ${SPACING.xs}px`,
      }}>
      low n
    </span>
  );
}

```
After:
```tsx
/**
 * Under LOW_N score votes a rule's gap is thin evidence, and a rule nobody has
 * scored has none: the row wears the "low n" tag (LowNTag), and its name says
 * it too (rowLabel). A tuning-only row has no stat, so no tag.
 */
function isLowN(stat: RuleStat | null): boolean {
  return stat != null && stat.scoreVotes < LOW_N;
}

```

The use (`:125`). Before:
```tsx
      {isLowN(row.stat) && <LowNTag />}
```
After:
```tsx
      {isLowN(row.stat) && <LowNTag minVotes={LOW_N} />}
```

`SPACING`, `ADMIN_RADIUS` and `ADMIN_TYPE` keep other uses in the file: `PendingDot`, the cells and the empty text.

In `src/ui/Primitives.stories.tsx`, add a story for the moved tag next to `RawTag`. The imports (`:7`). Before:
```tsx
import {KpiCard} from './KpiCard';
```
After:
```tsx
import {KpiCard} from './KpiCard';
import {LowNTag} from './LowNTag';
```
Insert this block just above `const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 6.5, null];` (`:171`):
```tsx
const TAG_ROW: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: SPACING.sm};

/** The two informative tags: "low n" beside a name with few score votes, "raw" beside a number from the vote log. */
export const Tags: Story = {
  render: () => (
    <Stack>
      <div style={TAG_ROW}>
        <span>Location Boost</span>
        <LowNTag minVotes={10} />
      </div>
      <div style={TAG_ROW}>
        <span>Distinct voters</span>
        <RawTag />
      </div>
    </Stack>
  ),
};

```
The story passes a literal 10 so that `src/ui` imports nothing from `src/tools`.

Run: `pnpm vitest run src/tools/analytics/calibration/__tests__/RulesTable.test.tsx src/ui/__tests__/LowNTag.test.tsx`

Expected: PASS, `Tests  12 passed (12)` (11 and 1). `RulesTable.test.tsx:108-114` still finds "low n" on Location Boost and Seven Dwarfs, and not on Location Lore or Questing.

- [ ] **Step 6: Take `sharePercent` and `VoteSpan` out of `chartData.ts`**

`src/tools/analytics/activity/activityModel.ts`, `activityWindow` (`:126-131`). Before:
```ts
/**
 * The days the page reads for a range. The window ends on the whole log's
 * newest vote and counts back per the range, never past the log's oldest vote
 * (rangeStartDay). Null for an empty log.
 */
export function activityWindow(votes: readonly VoteLogRow[], range: RangePreset): {startDay: Day; endDay: Day} | null {
```
After:
```ts
/**
 * A run of UTC days, both ends included: the window activityWindow gives. At
 * 'all' it is the vote log's first and last vote days, which say whether a
 * weekly chart's end weeks are part weeks (R2's weekly gap). Moved here from
 * calibration/chartData.ts (R3-1a).
 */
export interface VoteSpan {
  startDay: Day;
  endDay: Day;
}

/**
 * The days the page reads for a range. The window ends on the whole log's
 * newest vote and counts back per the range, never past the log's oldest vote
 * (rangeStartDay). Null for an empty log.
 */
export function activityWindow(votes: readonly VoteLogRow[], range: RangePreset): VoteSpan | null {
```
The body is unchanged. The return type has the same structure as before, so `ActivityView.tsx:63`, `CalibrationWorkspace.tsx:229` and `CalibrationCharts.stories.tsx` compile as they are.

`src/tools/analytics/calibration/chartData.ts`, the imports (`:6-8`). Before:
```ts
import {fmtGap, fmtInt, fmtScore} from '../../../ui/format';
import {bucketTitle, partialWeeks} from '../activity/activityChart';
import {countOf} from '../activity/activityModel';
```
After:
```ts
import {fmtGap, fmtInt, fmtScore, sharePercent} from '../../../ui/format';
import {bucketTitle, partialWeeks} from '../activity/activityChart';
import {countOf, type VoteSpan} from '../activity/activityModel';
```

`sharePercent` (`:196-208`). Delete this block, along with the blank line after it:
```ts
/**
 * A share of the pairs as a whole percentage: 1 / 3 -> "33%". A share above
 * zero that would round to 0 prints "<1%", so a bin with pairs never reads
 * "0%"; one below 1 that would round to 100 prints ">99%", so a bin without
 * every pair never reads "100%". The histogram's subtitle, tooltip and table
 * use it.
 */
export function sharePercent(fraction: number): string {
  if (fraction > 0 && fraction < 0.005) return '<1%';
  if (fraction < 1 && fraction >= 0.995) return '>99%';
  return `${Math.round(fraction * 100)}%`;
}

```
`histogramTable` (`:219`) keeps calling `sharePercent`, which now comes from the import.

`VoteSpan` and `WeeklyScope.span`'s comment (`:300-320`). Before:
```ts
/**
 * The vote log's first and last UTC days: activityWindow(votes, 'all'), the
 * range Vote activity reads at "All". weeklyGaps' weeks run from the first's
 * Monday to the last's, so a log that starts after a Monday or ends before a
 * Sunday has a part week at that end.
 */
export interface VoteSpan {
  startDay: Day;
  endDay: Day;
}

/** What the weekly trend's words read: the scope it covers and the log's span. */
export interface WeeklyScope {
  /** "All pairs" or the selected rule's name. */
  scopeLabel: string;
  /**
   * The log's first and last vote days (activityWindow(votes, 'all')), which
   * say whether an end week is a part week; null for an empty log.
   */
  span: VoteSpan | null;
}
```
After:
```ts
/** What the weekly trend's words read: the scope it covers and the log's span. */
export interface WeeklyScope {
  /** "All pairs" or the selected rule's name. */
  scopeLabel: string;
  /**
   * The log's first and last vote days (activityWindow(votes, 'all'), the
   * range Vote activity reads at "All"); null for an empty log. weeklyGaps'
   * weeks run from the first's Monday to the last's, so a log that starts
   * after a Monday or ends before a Sunday has a part week at that end.
   */
  span: VoteSpan | null;
}
```
`Day` still has other uses in the file: `WeeklyGap.week`, `gapSums` and `mondays`.

`src/tools/analytics/calibration/GapHistogram.tsx`, the format import (`:6`). Before:
```tsx
import {fmtInt} from '../../../ui/format';
```
After:
```tsx
import {fmtInt, sharePercent} from '../../../ui/format';
```
In the `./chartData` import list (`:15-17`), before:
```tsx
  histogramTable,
  sharePercent,
  sideColor,
```
After:
```tsx
  histogramTable,
  sideColor,
```

`src/tools/analytics/calibration/__tests__/chartData.test.ts`, the imports (`:2-3`). Before:
```ts
import {ADMIN_COLORS} from '../../../../theme/adminTheme';
import {activityWindow} from '../../activity/activityModel';
```
After:
```ts
import {ADMIN_COLORS} from '../../../../theme/adminTheme';
import {sharePercent} from '../../../../ui/format';
import {activityWindow, type VoteSpan} from '../../activity/activityModel';
```
In the `../chartData` import list, `:23-25`. Before:
```ts
  scoreText,
  sharePercent,
  sharedScores,
```
After:
```ts
  scoreText,
  sharedScores,
```
And `:30-33`. Before:
```ts
  weeklyTable,
  type VoteSpan,
  type WeeklyGap,
} from '../chartData';
```
After:
```ts
  weeklyTable,
  type WeeklyGap,
} from '../chartData';
```
The `gapShares and sharePercent` block (`:170-194`). Before:
```ts
describe('gapShares and sharePercent', () => {
  it('give each side’s share of the pairs', () => {
    const shares = gapShares(gapBins(SIX_PAIRS));
    expect(shares.over).toBeCloseTo(1 / 2);
    expect(shares.agree).toBeCloseTo(1 / 3);
    expect(shares.under).toBeCloseTo(1 / 6);
    expect([shares.agree, shares.over, shares.under].map(sharePercent)).toEqual(['33%', '50%', '17%']);
  });

  it('give 0 for every side with no pairs, and never print 0% for a side with some', () => {
    expect(gapShares(gapBins([]))).toEqual({over: 0, agree: 0, under: 0});
    expect(sharePercent(0)).toBe('0%');
    expect(sharePercent(1 / 400)).toBe('<1%');
  });

  it('switches from <1% to 1% at the rounding boundary', () => {
    expect(sharePercent(0.0049)).toBe('<1%');
    expect(sharePercent(0.005)).toBe('1%');
  });

  it('prints >99% for a share short of whole that would round to 100%, and 100% only for all of them', () => {
    expect(sharePercent(0.994)).toBe('99%');
    expect(sharePercent(0.995)).toBe('>99%');
    expect(sharePercent(1)).toBe('100%');
  });
});
```
After:
```ts
// sharePercent's own cases moved with it to src/ui/__tests__/format.test.ts (R3-1a).
describe('gapShares', () => {
  it('gives each side’s share of the pairs, which the histogram prints through sharePercent', () => {
    const shares = gapShares(gapBins(SIX_PAIRS));
    expect(shares.over).toBeCloseTo(1 / 2);
    expect(shares.agree).toBeCloseTo(1 / 3);
    expect(shares.under).toBeCloseTo(1 / 6);
    expect([shares.agree, shares.over, shares.under].map(sharePercent)).toEqual(['33%', '50%', '17%']);
  });

  it('gives 0 for every side with no pairs', () => {
    expect(gapShares(gapBins([]))).toEqual({over: 0, agree: 0, under: 0});
  });
});
```
Every `sharePercent` value the deleted lines checked is a row in Step 2's table: 0, 1/400, 0.0049, 0.005, 0.994, 0.995 and 1.

`src/tools/analytics/calibration/__tests__/CalibrationCharts.test.tsx`, the imports (`:7` and `:12`). Before:
```tsx
import {ADMIN_COLORS} from '../../../../theme/adminTheme';
```
After:
```tsx
import {ADMIN_COLORS} from '../../../../theme/adminTheme';
import type {VoteSpan} from '../../activity/activityModel';
```
Before:
```tsx
import {SCATTER_JITTER, SCORE_DOMAIN, SCORE_TICKS, gapDomain, type VoteSpan, type WeeklyGap} from '../chartData';
```
After:
```tsx
import {SCATTER_JITTER, SCORE_DOMAIN, SCORE_TICKS, gapDomain, type WeeklyGap} from '../chartData';
```

Run: `pnpm vitest run src/tools/analytics/calibration/__tests__/chartData.test.ts src/tools/analytics/calibration/__tests__/CalibrationCharts.test.tsx src/tools/analytics/activity/__tests__/activityModel.test.ts src/ui/__tests__/format.test.ts scripts/lib/__tests__/weeklyGapsParity.test.mjs`

Expected: PASS, `Test Files  5 passed (5)` and `Tests  165 passed (165)` (40, 27, 63, 33 and 2). `chartData.test.ts` goes from 42 cases to 40. `weeklyGapsParity.test.mjs` (`:3`) imports `weeklyGaps` from `chartData.ts`, which this step edits, so it runs here too.

Then run `pnpm typecheck`. Expected: it exits 0. Vitest drops type-only imports, so only the typecheck catches a `type VoteSpan` still imported from `../chartData`: `Module '"../chartData"' has no exported member 'VoteSpan'`.

- [ ] **Step 7: Move the focus handoff to `src/shell` (R-48)**

```bash
git mv src/tools/analytics/calibration/focusHandoff.ts src/shell/focusHandoff.ts
```

In `src/shell/focusHandoff.ts`, the doc comment above `FocusHandoff` (`:3-9`). Before:
```ts
/**
 * Focus waiting for the tuning aside's next view (F2). Saving or forgetting a
 * token, and reading tuning.json again, unmount the button pressed, so focus
 * would fall to <body>. The page holds the handoff, since a token change
 * remounts the aside, and the view that replaces the button takes it. Reading
 * again asks only once a read lands, so a failed read leaves none waiting.
 */
```
After:
```ts
/**
 * Focus waiting for the view that replaces the control pressed (R2's F2;
 * R-48). An action that unmounts its own button would drop focus to <body>, so
 * a component that outlives the swap holds the handoff and asks for it, and
 * the view that replaces the button takes it. On /calibration the page holds
 * it, since a token change remounts the tuning aside: saving or forgetting a
 * token, and reading tuning.json again, hand focus to the aside's next view,
 * and reading again asks only once a read lands, so a failed read leaves none
 * waiting. Moved from calibration/ (R3-1a), so other pages can use it.
 */
```
The code stays as it is (`useFocusHandoff`, `focusUnmoved`, `useTakeHandoff`).

`src/tools/analytics/calibration/CalibrationPage.tsx`. Before (`:3-4`):
```tsx
import {useGithubToken} from '../../../github/useGithubToken';
import {PageLayout} from '../../../shell/PageLayout';
```
After:
```tsx
import {useGithubToken} from '../../../github/useGithubToken';
import {useFocusHandoff} from '../../../shell/focusHandoff';
import {PageLayout} from '../../../shell/PageLayout';
```
Then delete the old import (`:12` before this step, `:13` after Step 4's import):
```tsx
import {useFocusHandoff} from './focusHandoff';
```

`src/tools/analytics/calibration/CalibrationWorkspace.tsx`. Before (`:3-4`):
```tsx
import {LinkButton, SPACING} from '../../../app-bridge';
import {PAGE_GUTTER} from '../../../shell/PageLayout';
```
After:
```tsx
import {LinkButton, SPACING} from '../../../app-bridge';
import type {FocusHandoff} from '../../../shell/focusHandoff';
import {PAGE_GUTTER} from '../../../shell/PageLayout';
```
Then delete (`:17`):
```tsx
import type {FocusHandoff} from './focusHandoff';
```

`src/tools/analytics/calibration/TuningAside.tsx`. Before (`:6-7`):
```tsx
import {targetBranch} from '../../../github/githubCommit';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
```
After:
```tsx
import {targetBranch} from '../../../github/githubCommit';
import {focusUnmoved, useTakeHandoff, type FocusHandoff} from '../../../shell/focusHandoff';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
```
Then delete (`:19`):
```tsx
import {focusUnmoved, useTakeHandoff, type FocusHandoff} from './focusHandoff';
```

`src/tools/analytics/calibration/__tests__/TuningAside.test.tsx`. Before (`:5-6`):
```tsx
import type {TuningConfig} from 'inkweave-synergy-engine';
import {ADMIN_COLORS} from '../../../../theme/adminTheme';
```
After:
```tsx
import type {TuningConfig} from 'inkweave-synergy-engine';
import {useFocusHandoff} from '../../../../shell/focusHandoff';
import {ADMIN_COLORS} from '../../../../theme/adminTheme';
```
Then delete (`:11`):
```tsx
import {useFocusHandoff} from '../focusHandoff';
```

`CalibrationWorkspace.tsx:378`'s comment ("which focusHandoff's take would refuse"; `:365` after Step 8) stays, since the module keeps its name.

Run: `pnpm vitest run src/tools/analytics/calibration/__tests__/TuningAside.test.tsx src/tools/analytics/calibration/__tests__/CalibrationPage.test.tsx`

Expected: PASS, `Tests  88 passed (88)` (35 and 53). Then run `pnpm typecheck`. Expected: it exits 0, which covers the workspace's type-only import.

If `git mv` is refused (a hook, or a dirty path), use `mv` instead, then `git add` both the old and the new path in Step 12.

- [ ] **Step 8: Move `twoUp` to `src/ui/layout.ts`**

`src/tools/analytics/calibration/CalibrationWorkspace.tsx`, the imports. Before (`:6-7` after Step 7's import):
```tsx
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {Notice} from '../../../ui/Notice';
```
After:
```tsx
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {twoUp} from '../../../ui/layout';
import {Notice} from '../../../ui/Notice';
```

Delete the private copy (`:84-97` at `aea40b4`), along with the blank line after it:
```tsx
/**
 * Two panels side by side once the column holds two tracks and the gap, stacked
 * below that. A chart's padded Panel takes 42px of its track, so the plot is the
 * track less 42px, and ChartTooltip needs 304px of it: no track under 346px.
 */
function twoUp(track: number): React.CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${track}px), 1fr))`,
    gap: SPACING.xl,
    alignItems: 'start',
  };
}

```
`CHARTS_ROW = twoUp(376)` and `PAIRS_ROW = twoUp(346)`, with their comments, stay where they are. Their 376px reason is the histogram's bin labels, which belong to this page. `SPACING` still has other uses in the file (`LEFT`, `SCOPE_ROW` and `SCOPE_BUTTON`).

Run: `pnpm vitest run src/tools/analytics/calibration/__tests__/CalibrationPage.test.tsx src/ui/__tests__/layout.test.ts`

Expected: PASS, `Tests  54 passed (54)`. jsdom has no layout, so no page test measures the rows; `layout.test.ts` pins the style the rows get.

- [ ] **Step 9: Check that each piece is left in one place**

```bash
git grep --untracked -n -E "function DataAsOf|Data as of <code|function LowNTag|export function sharePercent|export interface VoteSpan|function twoUp" -- src
git grep --untracked -n -E "focusHandoff'" -- src
test ! -e src/tools/analytics/calibration/focusHandoff.ts && echo "calibration/focusHandoff.ts is gone"
```

`--untracked` reaches the new files, which Step 12 adds. Expected from the first command: exactly these seven lines, one home per piece and `PageLayout`'s doc example:
```
src/shell/PageLayout.tsx:64:  /** Right of the title, before any actions; phrasing content only (it renders in a <p>), e.g. "Data as of <code>2026-09-30</code>". */
src/tools/analytics/activity/activityModel.ts:132:export interface VoteSpan {
src/ui/DataAsOf.tsx:8:export function DataAsOf({generatedAt}: {generatedAt: string}) {
src/ui/DataAsOf.tsx:11:      Data as of <code>{generatedAt.slice(0, 10)}</code>
src/ui/LowNTag.tsx:12:export function LowNTag({minVotes}: {minVotes: number}) {
src/ui/format.ts:73:export function sharePercent(fraction: number): string {
src/ui/layout.ts:12:export function twoUp(track: number): CSSProperties {
```

Expected from the second: the four imports, and the workspace comment that names the module (it matches `focusHandoff'`):
```
src/tools/analytics/calibration/CalibrationPage.tsx:4:import {useFocusHandoff} from '../../../shell/focusHandoff';
src/tools/analytics/calibration/CalibrationWorkspace.tsx:4:import type {FocusHandoff} from '../../../shell/focusHandoff';
src/tools/analytics/calibration/CalibrationWorkspace.tsx:365: * which focusHandoff's take would refuse.
src/tools/analytics/calibration/TuningAside.tsx:7:import {focusUnmoved, useTakeHandoff, type FocusHandoff} from '../../../shell/focusHandoff';
src/tools/analytics/calibration/__tests__/TuningAside.test.tsx:6:import {useFocusHandoff} from '../../../../shell/focusHandoff';
```
The third prints `calibration/focusHandoff.ts is gone`.

- A second home for a piece means a step left its old copy. Delete that copy.
- A line number may differ by one or two if a Before block was applied around a moved line. The paths and the text must match.

- [ ] **Step 10: Run the gates**

Run `pnpm lint`, `pnpm typecheck`, `pnpm test:run` and `pnpm build`.

Expected:
- All four finish with no errors, and Vitest reports no failed test.
- Compared with a `pnpm test:run` just before Step 2, the suite has 3 more test files and 11 more tests:
  - `format.test.ts`: +10;
  - `chartData.test.ts`: −2;
  - `DataAsOf`, `LowNTag` and `layout`: +1 each.
- `pnpm vitest run src` goes from 92 files and 1,050 tests to 95 and 1,061. `pnpm test:run` also runs `scripts/`' 27 test files, whose counts don't change. R3-1's own tests come on top.

If Vitest fails to start its workers under load, stop this session's preview servers, wait for other sessions' runs to finish, and retry.

- [ ] **Step 11: Check Code Health locally**

Run the CodeScene MCP's `code_health_review` on every path in Step 12's `git add` (24 paths).

Expected: 10.0 for each, except `src/shell/PageLayout.stories.tsx`, which has no function to score: its review returns `{"score":null,"review":[]}`, as it does at `aea40b4`. A local 10.0 is not proof, because the server is stricter (Step 12 runs the branch-level check). Re-base note 10 lists two watch items:
- **`activityModel.ts`** sits at 14 of 49 primitive parameters. This task adds none.
- **`format.ts`** grows to 10 parameters. The fallback, if the PR's server check flags it, is a `src/ui/share.ts`, on the owner's word.

- [ ] **Step 12: Commit**

The owner approved per-task commits. Each command is its own Bash call. Step 7's `git mv` already staged the rename.

```bash
git add src/ui/DataAsOf.tsx src/ui/LowNTag.tsx src/ui/layout.ts src/ui/format.ts src/ui/Primitives.stories.tsx src/ui/__tests__/DataAsOf.test.tsx src/ui/__tests__/LowNTag.test.tsx src/ui/__tests__/layout.test.ts src/ui/__tests__/format.test.ts src/shell/focusHandoff.ts src/shell/PageLayout.stories.tsx src/tools/analytics/activity/ActivityPage.tsx src/tools/analytics/activity/activityModel.ts src/tools/analytics/calibration/CalibrationPage.tsx src/tools/analytics/calibration/CalibrationWorkspace.tsx src/tools/analytics/calibration/RulesTable.tsx src/tools/analytics/calibration/TuningAside.tsx src/tools/analytics/calibration/GapHistogram.tsx src/tools/analytics/calibration/chartData.ts src/tools/analytics/calibration/__tests__/chartData.test.ts src/tools/analytics/calibration/__tests__/CalibrationCharts.test.tsx src/tools/analytics/calibration/__tests__/TuningAside.test.tsx src/tools/analytics/overview/OverviewPage.tsx src/tools/analytics/web/WebAnalyticsPage.tsx
```

```bash
USER_APPROVED=1 git commit -m "refactor(ui): move the pieces R3 shares into src/ui and src/shell (#24)"
```

Never pipe the commit. The pre-commit hook runs lint and the tests. `git status --short` should then print nothing under `src/`.

Run `analyze_change_set` against `main` before any push. Load it with ToolSearch (`select:mcp__codescene__analyze_change_set`), then call it with `{base_ref: "main", git_repository_path: "D:\\johnn\\Projects\\inkweave-admin"}`. It reviews committed files only, so it runs after the commit. If it flags `format.ts`'s primitive arguments, stop and ask the owner about `src/ui/share.ts` (re-base note 10).

<!--
Review fixes applied 2026-10-06 (sandbox-R3-1a-fix: the reviewer's applied tree plus scripts/lib, with node_modules and upstream junctioned).
- Note 1: applied, with one correction. weeklyGapsParity.test.mjs has two cases (`it` at :80 and :103), not three. The Step 6 run in the sandbox gives 5 files and 165 tests, so Step 6 says 165 (40, 27, 63, 33 and 2), not 166. `vitest run src` re-run: 95 files, 1,061 tests. git ls-files shows 27 scripts/**/*.test.mjs files, all importing vitest.
- Note 2: no change needed. R3-card-analytics.md's task-order row for R3-1a (now :717) already reads Step 12's message, `refactor(ui): move the pieces R3 shares into src/ui and src/shell (#24)`.
- Note 3: valid, but it is a R3-card-analytics.md edit, outside this file. For the header owner: in addition 3, replace "moved verbatim" (R3-card-analytics.md:95 and :99) with "moved; code unchanged, doc comment generalised (R3-1a)", and use CalibrationPage.tsx:24-31 (:92) and chartData.ts:196-207 (:95). R3-6c.template.md:119 also says "moved verbatim". In this file, the contract block's focusHandoff line now says "code unchanged, doc comment generalised".
- Note 4: applied. Local scores in the sandbox for all 24 git-add paths: 23 at 10.0, and PageLayout.stories.tsx returns null with no findings, the same as at aea40b4. Step 11 and note 11 now say so, instead of "10.0 for each".
- Note 5: applied. git grep finds CalibrationWorkspace.tsx:378 at aea40b4, and ReadOnly's meta is PageLayout.stories.tsx:34-38.
- Note 6: applied, with three dependents the note's list missed: R3-6b also uses twoUp(376) (R3-06b-vote-panels.md:1355, :1377); R3-6c consumes the handoff (R3-6c.template.md:119); and R3-7 also imports useTakeHandoff (R3-07-route-page.md:737).
- Note 7: applied. The module comment is rewrapped in the same six lines, so Step 9's format.ts:73 still holds. Checks on the edited format.ts: eslint --max-warnings 0 --stdin with the repo config is clean; format.test.ts passes 33 tests; tsc -p tsconfig.app.json exits 0; local CodeScene scores 10.0.
- Note 8: applied, taking the note's first option. MIN_RULE_VOTES is the card page's name for its threshold: R3-02-card-calibration.md:630 and R3-06a-view-shell.md:1204 import it, and R3-06a-view-shell.md:1263 passes it to LowNTag.
-->
