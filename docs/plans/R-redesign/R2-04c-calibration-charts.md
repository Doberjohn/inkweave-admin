> Part of [R: Admin redesign](../R-redesign.md), phase R2 ([R2-calibration-tuning.md](R2-calibration-tuning.md)). Read the main plan's decisions (R-17 to R-26 for R2), corrections, global constraints and shared interfaces, then the R2 header, first.

> **Re-base notes (R2-4c, 2026-10-05).** Re-based from the 2026-10-01 outline onto main @ `c92e260` (R1 as built, pin `bc877e1`) and the R2 decisions R-17 to R-26.
> - **Kit APIs, checked against the real files.**
>   - `BarChart` is now `BarChart.tsx` over `barLayout.ts`, `BarDrawing.tsx`, `SelectableBars.tsx`, `useBarFocus.ts` and `barPaint.ts`, but the props this task uses (`data`, `series`, `ariaLabel`, `height`, `valueFormat`, `capLabels`, `xLabelEvery`, `tooltip`) are unchanged, and `BarDatum` is still re-exported from `charts/BarChart`. Without `onSelect` the plot is `ChartSvg.tsx`'s `ChartPlot`, a slider named by `ariaLabel`. A 0 segment draws nothing (`barLayout.ts` `stackOf`: `if (values[i] === 0) return;`), which the histogram's one-series-per-bar stacking relies on. `xLabelEvery` is a floor: `xLabelsFor` thins further, counting back from the last bar, until labels fit.
>   - `LineChart` is now `LineChart.tsx` over `lineLayout.ts`. Null points, lone-point dots (`circle[data-lone]`), the ringed end dot (`circle[data-end]`) and the labelled baseline (`g[data-baseline]`, `baselineLabel`) are all on main. `yDomain`, `fixedGutters`, `LINE_Y_AXIS_WIDTH` and `LINE_END_WIDTH` come from R2-4a (re-based onto `lineLayout.ts`); this task only passes the two props.
>   - `ChartFrame` has `titleLevel`, `defaultView` and the controlled `view` / `onViewChange`. All three charts keep the defaults: an h2 title, because R2-6's scope row is a `<p>` and the charts sit beside the page's other panel h2s under `PageLayout`'s h1; the chart view first; and no control inside a chart opens the table, so no controlled view. `ChartFrame` now wraps its table in an `overflowX: 'auto'` box, so the scatter's five-column table scrolls inside its card on a phone.
>   - `ChartLegend` gets `mark="dot"` from R2-4a. `Panel`, `countOf`, `fmtGap`, `fmtInt`, `fmtScore` and `fmtDay` are unchanged.
> - **Changed from the outline.**
>   - The props take `readonly PairStat[]` and `readonly WeeklyGap[]`, so the stories pass R2-4b's readonly fixtures as they are; R2-6's arrays still fit. `WeeklyGapTrendProps` is exported, like the other two.
>   - The scatter's engine-silent line ("Not plotted: N engine-silent pairs") moves under the `ChartFrame`, inside the `Panel`, so the table view, which lists only plotted pairs, still says what it leaves out. The jitter note stays in the chart view.
>   - The gap plot's baseline reads "No gap" (`baselineLabel`). The real LineChart labels a baseline `yFormat(0)` by default, which would print "0.00" right beside the axis's own "0.00" tick.
>   - The three table views and the share format come from R2-4b, whose re-base moves them into `chartData.ts` with tests: `scatterTable`, `histogramTable`, `weeklyTable` and `sharePercent`. Their captions, columns and rows are the outline's inline tables, unchanged. The trend's empty check is a named helper (`emptyReason`), as R1-8's `WeeklyCard` keeps its pieces out of the component body (the CodeScene gate).
>   - Tests go from 16 to 18. Two are new: the histogram's x labels at two widths (the bridge's `useContainerWidth` stubbed at 350px and 300px, as R1-8's `WeeklyCard.test.tsx` stubs it), and the two weekly plots placing each week at the same x, read from the rendered paths. That test fails without `fixedGutters` (`expected '14' to be '48'`). The histogram test now checks each side's fill rather than only the label text, and the table tests find each table by its caption and compare whole rows.
>   - **The histogram's end labels are `≤−5` and `≥+5`, with no space** (R2-4b's `binLabel`, changed at review). BarChart thins x labels until the widest fits its slot (`xLabelsFor`: 0.6em a character at 10px, plus `SPACING.sm`). Two-up at a 1440px viewport the left column is about 800px, so each frame is (800 − 20) / 2 − 42 = 348px, an 11-slot plot of 300px: 27.3px a slot. `"≤ −5"` needed 32px, so every other label printed, counting back from the last bar, and the centre "0" bin, the agreement band, had none. A 3-character label needs 26px, so all eleven print from a 334px frame (about a 772px column). The test pins both sides of that: all eleven at 350px, every other one at 300px. Step 1 checks that R2-4b's `binLabel` has the new form.
>   - **Both empty states draw no legend.** An empty scope passes `legend={undefined}`, so "No voted pairs yet." doesn't sit under a three-entry key for marks that aren't there.
>   - **The histogram's subtitle builds its band text from `binRange(0)`**, as R2-4b builds the legend's from `CALIBRATION_BAND`, so "within ±0.5" is never typed here. The output is unchanged.
>   - **The gap plot prints no x labels** (`xTicks={[]}`). The two plots share one x, so the dates print once, under the votes plot at the bottom, as stacked plots over one x usually do; the gap plot's tooltip and slider value still name each week. This is polish the review left to the owner: dropping the prop brings the second row of dates back.
>   - The stories file is written out in full (the outline only listed the stories). Its decorator is R2-6's 800px column with R2-6's `TWO_UP`, so `AllPairs` shows the real two-up widths.
> - **Decisions applied.** R-23: the scatter's dots are drawn as R2-4a draws them (opaque, one size, widest gaps on top, jittered mostly along the line so a dot's gap moves by at most 0.07), and the tooltip adds the "pairs on these scores" line. This task wires the chart; R2-4a owns the drawing (its discs included, which the header reconciles) and R2-4b the data. R-24: one-point bins with ±5 folded into the end bins (`GAP_BIN_LIMIT`), and the weekly score votes as an area plot under the gap plot. R-25: the histogram stays hover-only (no `onSelect`), and there is no votes filter.
> - **R1's deferred items, where they touch these charts** (`.superpowers/sdd/R-redesign/progress.md`).
>   - "LineChart yTicks collide on lopsided signed data": the gap plot always passes `gapDomain`, which is symmetric, so its ticks are −e, 0, +e.
>   - "All-null series draws axes instead of emptyText": `WeeklyGapTrend` never hands LineChart an all-null gap series. It says "No score votes in this scope yet." first.
>   - "ChartFrame keys headers by name": every table here has unique column names.
>   - The 140px tooltip floor stays kit-level. A chart's padded `Panel` takes 42px of its cell, and R2-6's two-up cells are at least 346px, so a two-up chart is at least 304px and its tooltip fits. Only a stacked chart on a phone gets narrower; the real-data check (header, "Before the PR") looks at it.
> - **Pin facts re-checked at `bc877e1`**, cited by function because R2-1 inserts `ruleRosterEntry` into `voteAnalytics.mjs` and moves the lines. `packages/synergy-engine/src/engine/SynergyEngine.ts`, `computeAggregateScore`: a pair's engine score is the highest of its connections' scores. `scripts/lib/voteAnalytics.mjs`: `computePairRecord` rounds `communityScore` and `gap` to two places, so the scatter's two-place averages hold; `buildPairRecords` splits out engine-silent pairs, which `computeGlobal` counts as `global.engineSilentPairs`; `buildAnalytics` sorts every pair by |gap| (`sortedPairs`) with no cap.
> - **Verified** in three scratch sandboxes, each with main's `src/charts`, `src/ui`, `src/theme` and the analytics modules these files import, copied unchanged, and a bridge stub that re-exports the pinned app's real `theme.ts` tokens and `useContainerWidth`.
>   - `scratchpad/r2-rebase/sandbox-r24c-x`, the code as first drafted: the sibling re-bases' work as of 13:51 on 2026-10-05, R2-4a's `src/charts` (`ScatterChart`, `scatter.ts`, `lineLayout.ts` and `LineChart.tsx` with `yDomain` / `fixedGutters`, `ChartLegend` with `'dot'`) and R2-4b's `chartData.ts` and `chartFixtures.ts`, plus R2-1's `pairId`. Before the components: `Failed to resolve import "../CalibrationScatter"`. After: `Tests 18 passed (18)`. `tsc` with the repo's strict compiler options is clean, stories included, and all five files pass `pnpm exec eslint --stdin` in the repo.
>   - `scratchpad/r2-rebase/sandbox-r24c`: the same 18 tests against the outline's own R2-4a and R2-4b code, verbatim, with the three tables built inline (the outline's `chartData.ts` has no table helpers). Also 18 of 18, `tsc` clean.
>   - `scratchpad/r2-rebase/sandbox-fix-r24c`, the code below after review: R2-4a's final `src/charts` (`sandbox-R2-4a-final`) and R2-4b's `chartData.ts` with `binLabel`'s end labels unspaced. 18 of 18, with and without the repo's React Compiler preset; `tsc` clean, stories included; all five blocks pass `pnpm exec eslint --max-warnings 0 --stdin` in the repo. Each new assertion fails when its fix is undone: spaced end labels fail the two label tests, a legend on either empty state fails that chart's empty-state test, and dropping `xTicks={[]}` fails the gap plot's props test.
>   - All three sandboxes stub the bridge (the pinned app's real `theme.ts` and `useContainerWidth`, without the real bridge's other imports) and R2-1's `calibrationModel.ts` (`pairId` only, so no engine). The real import chain, the built engine and the real bridge with its CSS, first runs in Step 6, and that first run can take half a minute or more.
> - **Coupling to the sibling re-bases.** This task imports R2-4a's `ScatterChart`, whose props are `ScatterChartProps` (contract addition 5), and LineChart's `yDomain` / `fixedGutters`, and R2-4b's `chartData.ts` and `chartFixtures.ts` names, the four table and share helpers included. Its tests touch only the DOM hooks R2-4a's own tests pin: `circle[data-key]`, `[data-state="selected"]`, and the dot swatch being an SVG `<circle>` (the legend test counts `legend.querySelectorAll('circle')`, which R2-4a's ChartLegend test pins as `svg[aria-hidden="true"] > circle`). If either re-base renames any of these, adjust the imports and those selectors here. The histogram's label tests expect R2-4b's `binLabel` to print `≤−5` and `≥+5` with no space; if R2-4b still prints `≤ −5`, Step 1 stops: change `binLabel`, its tests and its doc in R2-4b first. If the final R2-4b drops the table helpers, Step 1 stops; build the three tables inline from the outline's R2-4c block (same captions, columns and rows).

### Task R2-4c: The three calibration charts

**Files:**
- Create `src/tools/analytics/calibration/CalibrationScatter.tsx`
- Create `src/tools/analytics/calibration/GapHistogram.tsx`
- Create `src/tools/analytics/calibration/WeeklyGapTrend.tsx`
- Create `src/tools/analytics/calibration/CalibrationCharts.stories.tsx`
- Test `src/tools/analytics/calibration/__tests__/CalibrationCharts.test.tsx`

**Interfaces:**
- **Consumes:**
  - R2-4a (contract additions 5 to 7):
    ```ts
    // src/charts/ScatterChart.tsx (ScatterPoint lives in scatter.ts and is re-exported here)
    export type {ScatterPoint} from './scatter'; // {key: string; x: number; y: number; series: string; label: string}
    export interface ScatterChartProps {
      points: readonly ScatterPoint[]; series: readonly SeriesDef[]; ariaLabel: string;
      xDomain: readonly [number, number]; yDomain: readonly [number, number];
      xTicks: readonly number[]; yTicks: readonly number[]; xLabel: string; yLabel: string;
      tickFormat?: (n: number) => string; diagonal?: string; jitter?: number; jitterAlong?: JitterAlong; // 'both' | 'diagonal'
      tooltip: (point: ScatterPoint) => TooltipContent; selectedKey?: string | null; onSelect?: (key: string) => void;
      emptyText?: string; // unused here: CalibrationScatter never mounts the chart for an empty scope
    }
    export function ScatterChart(props: ScatterChartProps): JSX.Element;
    // src/charts/LineChart.tsx gains: yDomain?: readonly [number, number]; fixedGutters?: boolean; (xTicks is on main)
    // src/charts/ChartLegend.tsx: mark: 'rect' | 'line' | 'dot' ('dot' draws an svg[aria-hidden="true"] > circle swatch)
    ```
  - R2-4b (`src/tools/analytics/calibration/chartData.ts`, `chartFixtures.ts`):
    ```ts
    export type GapSide = 'over' | 'agree' | 'under';
    export const GAP_SERIES: readonly SeriesDef[];
    export function sideColor(side: GapSide): string;
    export function gapSide(gap: number): GapSide;
    export function scoreText(n: number): string;
    export const SCORE_DOMAIN: readonly [number, number];
    export const SCORE_TICKS: readonly number[];
    export const SCATTER_JITTER = 0.35;
    export function scatterPoints(pairs: readonly PairStat[]): ScatterPoint[];
    export function sharedScores(pairs: readonly PairStat[]): Map<string, number>;
    export interface GapBin {center: number; side: GapSide; pairs: number; votes: number}
    export function gapBins(pairs: readonly PairStat[]): GapBin[];
    export function binLabel(center: number): string;                                         // "≤−5", "−3", "0", "+3", "≥+5": no space in the end labels
    export function binRange(center: number): string;                                         // "−3.5 to −2.5", "within ±0.5", "−4.5 or lower"
    export function gapShares(bins: readonly GapBin[]): Record<GapSide, number>;
    export function sharePercent(fraction: number): string;                                   // 1 / 3 -> "33%"
    export interface WeeklyGap {week: string; meanGap: number | null; scoreVotes: number}
    export function weeklyGaps(votes: readonly VoteLogRow[], pairs: readonly PairStat[]): WeeklyGap[];
    export function gapDomain(weeks: readonly WeeklyGap[]): [number, number];
    // The three table views (ChartTable from charts/ChartFrame)
    export function scatterTable(pairs: readonly PairStat[], scopeLabel: string): ChartTable;  // "Every plotted pair, <scope>, widest gap first"
    export function histogramTable(bins: readonly GapBin[], scopeLabel: string): ChartTable;   // "Pairs by gap (community − engine), <scope>. …"
    export function weeklyTable(weeks: readonly WeeklyGap[], scopeLabel: string): ChartTable; // "Weekly mean gap and score votes, <scope>. …"
    // chartFixtures.ts (tests and stories only)
    export const SIX_PAIRS: readonly PairStat[];
    export const ALL_PAIRS: readonly PairStat[]; export const ALL_PAIRS_VOTES: readonly VoteLogRow[];
    export const ONE_RULE: readonly PairStat[]; export const ONE_RULE_VOTES: readonly VoteLogRow[];
    ```
  - R2-1: `export function pairId(a: string, b: string): string;` (`calibrationModel.ts`).
  - The kit on main: `ChartFrame` (`charts/ChartFrame`), `ChartLegend`, `BarChart` and `BarDatum` (`charts/BarChart`), `LineChart`, `TooltipContent` and `TooltipRow` (`charts/ChartTooltip`).
  - `Panel` (`ui/Panel`), untitled, as each chart's card; `fmtGap`, `fmtInt`, `fmtScore`, `fmtDay` (`ui/format`); `countOf` (`activity/activityModel`); `PairStat` (`voteAnalyticsTypes`), `VoteLogRow` (`voteLogTypes`); `ADMIN_COLORS`, `ADMIN_TYPE`; `FONTS`, `SPACING` through the bridge (stories only).
- **Produces:**
```ts
// src/tools/analytics/calibration/CalibrationScatter.tsx
export interface CalibrationScatterProps {
  pairs: readonly PairStat[]; scopeLabel: string;              // the uncapped scope, and "All pairs" or the rule's name
  selectedPair: {a: string; b: string} | null; onSelectPair: (pair: {a: string; b: string}) => void;
  engineSilentPairs?: number;                                  // the all-pairs scope only; shown in both views
  emptyText?: string;                                          // default "No voted pairs yet."
}
export function CalibrationScatter(props: CalibrationScatterProps): JSX.Element;
// src/tools/analytics/calibration/GapHistogram.tsx
export interface GapHistogramProps {pairs: readonly PairStat[]; scopeLabel: string; emptyText?: string} // default "No voted pairs yet."
export function GapHistogram(props: GapHistogramProps): JSX.Element;
// src/tools/analytics/calibration/WeeklyGapTrend.tsx
export interface WeeklyGapTrendProps {weeks: readonly WeeklyGap[]; scopeLabel: string}
export function WeeklyGapTrend(props: WeeklyGapTrendProps): JSX.Element;
```

**What the three do** (unchanged from the outline unless the re-base notes say so):
- **The surface.** Each chart returns its `ChartFrame` inside an untitled `Panel`, which is the card. The frame draws no surface, as on R1-8, R1-9 and R1-10.
- **The empty copy.** Both `emptyText`s default to "No voted pairs yet.", which is right on "All pairs". R2-6 passes `selected ? 'No voted pairs for this rule yet.' : 'No voted pairs yet.'`, as it does for `PairList`. An empty scope's subtitle reads `${scopeLabel} · no pairs`, never "0% within ±0.5, 0% …", and the frame draws no legend over the empty copy. The frame stays mounted in every state, so a reader's Chart | Table choice survives a change of rule.
- **The weekly trend's empty states.** "No score votes in this scope yet." when no week has a score vote (a tuning-only row gives `weeklyGaps(votes, [])`: every week of the log, all null). Otherwise "Not enough weeks of votes to draw a trend yet." under two weeks.
- **The histogram's stacking.** Each bar's count goes in its side's series through BarChart's stacked mode, with the other two series at 0, and a 0 segment draws nothing. No bar prints a cap label: the subtitle carries the three shares. The end labels `≤−5` and `≥+5` carry no space, so all eleven labels print two-up on a desktop column (from a 334px frame).
- **The tables.** Each chart's table view is R2-4b's builder (`scatterTable`, `histogramTable`, `weeklyTable`), so a tooltip is never the only place a value appears.
- **The weekly trend: two plots, one y axis each.** The gap plot is a LineChart with a "No gap" baseline at 0, the symmetric `gapDomain` and the accent line. The votes plot under it is a short LineChart area in `barNeutral`. Both set `fixedGutters`, so a week sits at the same x in both, and the dates print once, under the votes plot (the gap plot passes `xTicks={[]}`). One frame, one table (week, mean gap, score votes), and a caption over each plot names what its axis measures.

- [ ] **Step 1: Check that R2-4a and R2-4b have landed**

```bash
grep -n "yDomain" src/charts/LineChart.tsx
grep -n "fixedGutters" src/charts/LineChart.tsx
grep -n "'dot'" src/charts/ChartLegend.tsx
grep -n "export function ScatterChart" src/charts/ScatterChart.tsx
grep -n "export function gapBins\|export function weeklyGaps\|export const GAP_SERIES" src/tools/analytics/calibration/chartData.ts
grep -n "export function scatterTable\|export function histogramTable\|export function weeklyTable\|export function sharePercent" src/tools/analytics/calibration/chartData.ts
grep -nF -e '`≤${signed(-GAP_BIN_LIMIT)}`' -e '`≥${signed(GAP_BIN_LIMIT)}`' src/tools/analytics/calibration/chartData.ts
grep -n "export const SIX_PAIRS" src/tools/analytics/calibration/chartFixtures.ts
grep -n "export function pairId" src/tools/analytics/calibration/calibrationModel.ts
```

Expected: each command prints at least one line (the table-helper grep prints four, the `binLabel` grep two). If one prints nothing, the task that owns it (R2-4a, R2-4b or R2-1) has not landed: stop and land it first. If only the `binLabel` grep prints nothing, R2-4b landed with the spaced end labels (`≤ −5`, `≥ +5`). Stop here too: R2-4b's fix lands first, in its own files. It drops the space in `binLabel`'s two template strings (`` `≤${signed(-GAP_BIN_LIMIT)}` ``, `` `≥${signed(GAP_BIN_LIMIT)}` ``), in its doc, and in its test in `src/tools/analytics/calibration/__tests__/chartData.test.ts` (`['≤−5', '−3', '0', '+3', '≥+5']`).

`calibrationModel.ts` imports the engine (`getRuleById`), so on a fresh checkout, or after a pin bump, run `pnpm build:engine` once first: `pnpm vitest run` doesn't build it (only `pnpm test:run` does).

- [ ] **Step 2: Write the failing test**

Create `src/tools/analytics/calibration/__tests__/CalibrationCharts.test.tsx`. It runs the real kit. Three things in the harness matter:
- `vi.mock` is hoisted and covers the whole file. The `LineChart` mock records its props and still renders the real chart, and the bridge mock passes everything through but `useContainerWidth`, which returns `measured.width` (0, the kit's fallback widths, unless a test sets it), as R1-8's `WeeklyCard.test.tsx` does.
- `ChartTooltip` renders each value and label as separate text, so a tooltip is found by its title and matched as a whole with R1-8's `tooltip(title)` helper: `toHaveTextContent(/\+6\.00\s*gap/)`, never `getByText('+6.00 gap')`.
- The fixtures come from R2-4b's `chartFixtures.ts`. `SIX_PAIRS`, engine → community, is 7 → 4, 7 → 7, 7 → 7 (2 votes), 3 → 9, 8 → 7.5 (2 votes) and 9 → 1, all under Ramp, so its gaps are −3, 0, 0, +6, −0.5 and −8.

```tsx
import type {ComponentProps} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {LineChart as RealLineChart} from '../../../../charts/LineChart';
import {ADMIN_COLORS} from '../../../../theme/adminTheme';
import {CalibrationScatter} from '../CalibrationScatter';
import {GapHistogram} from '../GapHistogram';
import {WeeklyGapTrend} from '../WeeklyGapTrend';
import {SIX_PAIRS} from '../chartFixtures';
import {gapDomain, type WeeklyGap} from '../chartData';

// jsdom has no ResizeObserver, so the real useContainerWidth stays at 0 and the
// charts lay out at their fallback widths. One test gives the histogram a real
// two-up width through this stub; the rest keep 0.
const measured = vi.hoisted(() => ({width: 0}));
vi.mock('../../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useContainerWidth: () => measured.width,
}));

// vi.mock is hoisted and covers the whole file, so the mock records LineChart's
// props and still renders the real chart: every other test keeps the real kit.
const lineProps = vi.hoisted(() => [] as Array<ComponentProps<typeof RealLineChart>>);
vi.mock('../../../../charts/LineChart', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../charts/LineChart')>();
  function RecordingLineChart(props: ComponentProps<typeof actual.LineChart>) {
    lineProps.push(props);
    return <actual.LineChart {...props} />;
  }
  return {...actual, LineChart: RecordingLineChart};
});

beforeEach(() => {
  measured.width = 0;
  lineProps.length = 0;
});

/** The tooltip showing `title`. ChartTooltip's root is aria-hidden (R1-3b), so it is found by its text. */
function tooltip(title: string): HTMLElement {
  const tip = screen.getByText(title).closest<HTMLElement>('[aria-hidden="true"]');
  expect(tip, `no tooltip around "${title}"`).not.toBeNull();
  return tip as HTMLElement;
}

/** A table row's cells as text, header cells included. */
const cells = (row: HTMLElement) => [...row.querySelectorAll('th, td')].map((cell) => cell.textContent);

const PAIRS = [...SIX_PAIRS];
const WEEKS: WeeklyGap[] = [
  {week: '2026-09-14', meanGap: -0.5, scoreVotes: 2},
  {week: '2026-09-21', meanGap: null, scoreVotes: 0},
  {week: '2026-09-28', meanGap: -1, scoreVotes: 3},
];

describe('CalibrationScatter', () => {
  it('reads the leftmost pair, then the shared 7 → 7 spot, and selects it with Enter', async () => {
    const onSelectPair = vi.fn();
    render(<CalibrationScatter pairs={PAIRS} scopeLabel="Ramp" selectedPair={null} onSelectPair={onSelectPair} />);
    const slider = screen.getByRole('slider', {name: 'Engine score against community score, Ramp'});
    act(() => slider.focus());
    await userEvent.keyboard('{Home}');
    expect(tooltip('Card 7 × Card 8')).toHaveTextContent(/\+6\.00\s*gap\s*3\s*engine\s*9\s*community\s*1\s*vote$/);
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(tooltip('Card 3 × Card 4')).toHaveTextContent(/2\s*pairs on these scores$/);
    expect(slider).toHaveAttribute(
      'aria-valuetext',
      'Card 3 × Card 4: engine 7, community 7, gap 0.00, 1 vote, 2 pairs on these scores',
    );
    await userEvent.keyboard('{Enter}');
    expect(onSelectPair).toHaveBeenCalledWith({a: '3', b: '4'});
  });

  it('keys the legend with dots', () => {
    const {container} = render(<CalibrationScatter pairs={PAIRS} scopeLabel="Ramp" selectedPair={null} onSelectPair={vi.fn()} />);
    const legend = screen.getByRole('list', {name: 'Legend'});
    expect(within(legend).getAllByRole('listitem')).toHaveLength(3);
    expect(legend.querySelectorAll('circle')).toHaveLength(3);
    expect(container.querySelectorAll('circle[data-key]')).toHaveLength(6);
  });

  it('says what an empty scope holds, by default and when the workspace names the rule', () => {
    const {rerender} = render(<CalibrationScatter pairs={[]} scopeLabel="All pairs" selectedPair={null} onSelectPair={vi.fn()} />);
    expect(screen.getByText('No voted pairs yet.')).toBeInTheDocument();
    expect(screen.getByText('All pairs · no pairs')).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', {name: 'Legend'})).not.toBeInTheDocument();
    rerender(
      <CalibrationScatter
        pairs={[]}
        scopeLabel="Ramp"
        selectedPair={null}
        onSelectPair={vi.fn()}
        emptyText="No voted pairs for this rule yet."
      />,
    );
    expect(screen.getByText('No voted pairs for this rule yet.')).toBeInTheDocument();
  });
});

describe('CalibrationScatter: scope, selection, table and footnotes', () => {
  it('names the scope and the count', () => {
    render(<CalibrationScatter pairs={PAIRS} scopeLabel="Ramp" selectedPair={null} onSelectPair={vi.fn()} />);
    expect(
      screen.getByText('Ramp · 6 pairs. Above the line, the community scores a pair higher than the engine does.'),
    ).toBeInTheDocument();
  });

  it('rings the selected pair given the other way round, and says it is selected', async () => {
    const {container} = render(
      <CalibrationScatter pairs={PAIRS} scopeLabel="Ramp" selectedPair={{a: '4', b: '3'}} onSelectPair={vi.fn()} />,
    );
    expect(container.querySelector('[data-state="selected"] circle')).toHaveAttribute('stroke');
    const slider = screen.getByRole('slider');
    act(() => slider.focus());
    await userEvent.keyboard('{Home}{ArrowRight}{ArrowRight}');
    expect(slider.getAttribute('aria-valuetext')).toMatch(/, selected$/);
  });

  it('lists every pair in the table, widest gap first, with exact values', async () => {
    render(<CalibrationScatter pairs={PAIRS} scopeLabel="Ramp" selectedPair={null} onSelectPair={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', {name: 'Table'}));
    const table = screen.getByRole('table', {name: 'Every plotted pair, Ramp, widest gap first'});
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(6);
    expect(cells(rows[0])).toEqual(['Card 11 × Card 12', '9', '1', '−8.00', '1']);
    expect(cells(rows[5])).toEqual(['Card 5 × Card 6', '7', '7', '0.00', '2']);
  });

  it('notes the jitter in the chart, and the engine-silent pairs only when given, in both views', async () => {
    const {rerender} = render(<CalibrationScatter pairs={PAIRS} scopeLabel="All pairs" selectedPair={null} onSelectPair={vi.fn()} />);
    expect(screen.getByText(/within 0\.07 of its gap/)).toBeInTheDocument();
    expect(screen.queryByText(/Not plotted/)).not.toBeInTheDocument();
    rerender(
      <CalibrationScatter pairs={PAIRS} scopeLabel="All pairs" selectedPair={null} onSelectPair={vi.fn()} engineSilentPairs={2} />,
    );
    expect(screen.getByText(/Not plotted: 2 engine-silent pairs/)).toBeInTheDocument();
    // The table lists plotted pairs only, so it keeps the count of the ones it leaves out.
    await userEvent.click(screen.getByRole('button', {name: 'Table'}));
    expect(screen.getByText(/Not plotted: 2 engine-silent pairs/)).toBeInTheDocument();
    expect(screen.queryByText(/within 0\.07 of its gap/)).not.toBeInTheDocument();
  });
});

describe('GapHistogram', () => {
  it('reads the −3 bar from the keyboard', async () => {
    render(<GapHistogram pairs={PAIRS} scopeLabel="Ramp" />);
    expect(screen.getByText('Ramp · 33% within ±0.5, 50% engine higher, 17% community higher')).toBeInTheDocument();
    const slider = screen.getByRole('slider', {name: 'Pairs by gap, Ramp'});
    act(() => slider.focus());
    await userEvent.keyboard('{Home}{ArrowRight}{ArrowRight}');
    expect(tooltip('Gap −3.5 to −2.5')).toHaveTextContent(/1\s*pair\s*1\s*vote\s*17%\s*of pairs$/);
    expect(slider).toHaveAttribute('aria-valuetext', 'Gap −3.5 to −2.5: 1 pair, 1 vote, 17% of pairs');
  });

  it('says what an empty scope holds, with a subtitle of no shares', () => {
    render(<GapHistogram pairs={[]} scopeLabel="All pairs" />);
    expect(screen.getByText('No voted pairs yet.')).toBeInTheDocument();
    expect(screen.getByText('All pairs · no pairs')).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', {name: 'Legend'})).not.toBeInTheDocument();
  });
});

describe('GapHistogram: bars, labels, table and rule copy', () => {
  it('draws eleven bars from ≤−5 to ≥+5, each in its side colour, and tables every bin', async () => {
    const {container} = render(<GapHistogram pairs={PAIRS} scopeLabel="Ramp" />);
    const labels = [...container.querySelectorAll('[data-x-label]')].map((t) => t.textContent);
    expect(labels).toEqual(['≤−5', '−4', '−3', '−2', '−1', '0', '+1', '+2', '+3', '+4', '≥+5']);
    // −8 folds into ≤−5 (engine higher), the two 0s sit in the centre bin, +6 folds into ≥+5; an empty bin draws nothing.
    const mark = (key: string) => container.querySelector(`[data-key="${key}"] [data-series]`);
    expect(mark('-5')).toHaveAttribute('fill', ADMIN_COLORS.over);
    expect(mark('0')).toHaveAttribute('fill', ADMIN_COLORS.barNeutral);
    expect(mark('5')).toHaveAttribute('fill', ADMIN_COLORS.under);
    expect(mark('4')).toBeNull();
    await userEvent.click(screen.getByRole('button', {name: 'Table'}));
    const table = screen.getByRole('table');
    expect(table.querySelector('caption')?.textContent).toMatch(/A gap on a half point counts in the bin further from zero\.$/);
    const heads = within(table).getAllByRole('rowheader').map((th) => th.textContent);
    expect(heads).toHaveLength(11);
    expect(heads[0]).toBe('−4.5 or lower');
    expect(heads[5]).toBe('within ±0.5');
    expect(heads[10]).toBe('+4.5 or higher');
  });

  it('prints every bin label two-up in an 800px column, and thins symmetrically below that', () => {
    // Two-up in an 800px column each frame is about 348px: an 11-slot plot of
    // about 300px, so 27px a slot, and "≤−5" needs 26 with its gap. At 300px of
    // frame a slot is 23px, so BarChart keeps every other label, counting back
    // from "≥+5" (R1-3b).
    const labelsAt = (width: number) => {
      measured.width = width;
      const {container, unmount} = render(<GapHistogram pairs={PAIRS} scopeLabel="Ramp" />);
      const labels = [...container.querySelectorAll('[data-x-label]')].map((t) => t.textContent);
      unmount();
      return labels;
    };
    expect(labelsAt(350)).toEqual(['≤−5', '−4', '−3', '−2', '−1', '0', '+1', '+2', '+3', '+4', '≥+5']);
    expect(labelsAt(300)).toEqual(['≤−5', '−3', '−1', '+1', '+3', '≥+5']);
  });

  it('names the rule when the workspace says so', () => {
    render(<GapHistogram pairs={[]} scopeLabel="Ramp" emptyText="No voted pairs for this rule yet." />);
    expect(screen.getByText('No voted pairs for this rule yet.')).toBeInTheDocument();
  });
});

describe('WeeklyGapTrend', () => {
  it('hands the gap plot its labelled baseline, its domain, fixed gutters, no dates and a null for the quiet week', () => {
    const {container} = render(<WeeklyGapTrend weeks={WEEKS} scopeLabel="Ramp" />);
    expect(screen.getByRole('slider', {name: 'Weekly mean gap, Ramp'})).toBeInTheDocument();
    expect(screen.getByRole('slider', {name: 'Score votes per week, Ramp'})).toBeInTheDocument();
    const gap = lineProps.find((p) => p.ariaLabel === 'Weekly mean gap, Ramp');
    expect(gap?.baseline).toBe(0);
    expect(gap?.yDomain).toEqual(gapDomain(WEEKS));
    expect(gap?.fixedGutters).toBe(true);
    expect(gap?.xTicks).toEqual([]);
    expect(gap?.series[0].points[1]).toEqual({x: '2026-09-21', y: null});
    const votes = lineProps.find((p) => p.ariaLabel === 'Score votes per week, Ramp');
    expect(votes?.fixedGutters).toBe(true);
    expect(votes?.xTicks).toBeUndefined();
    expect(container.querySelector('g[data-baseline] text')).toHaveTextContent('No gap');
  });

  it('puts each week at the same x in both plots', () => {
    const {container} = render(<WeeklyGapTrend weeks={WEEKS} scopeLabel="Ramp" />);
    const firstX = (id: string) => container.querySelector(`path[data-series="${id}"]`)?.getAttribute('d')?.match(/^M([\d.]+),/)?.[1];
    const endX = (id: string) => container.querySelector(`circle[data-end="${id}"]`)?.getAttribute('cx');
    expect(firstX('gap')).toBeDefined();
    expect(firstX('votes')).toBe(firstX('gap'));
    expect(endX('gap')).toBeDefined();
    expect(endX('votes')).toBe(endX('gap'));
  });

  it('gives a scored week between two quiet ones a dot of its own', () => {
    const lone: WeeklyGap[] = [
      {week: '2026-09-14', meanGap: null, scoreVotes: 0},
      {week: '2026-09-21', meanGap: 1, scoreVotes: 1},
      {week: '2026-09-28', meanGap: null, scoreVotes: 0},
    ];
    const {container} = render(<WeeklyGapTrend weeks={lone} scopeLabel="Ramp" />);
    expect(container.querySelectorAll('circle[data-lone="gap"]')).toHaveLength(1);
  });

  it('says a scope has no score votes when no week has one', () => {
    const quiet = WEEKS.map((w) => ({...w, meanGap: null, scoreVotes: 0}));
    render(<WeeklyGapTrend weeks={quiet} scopeLabel="Locations" />);
    expect(screen.getByText('No score votes in this scope yet.')).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('says there are not enough weeks for one week of votes', () => {
    render(<WeeklyGapTrend weeks={WEEKS.slice(0, 1)} scopeLabel="Ramp" />);
    expect(screen.getByText('Not enough weeks of votes to draw a trend yet.')).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('captions both plots and tables every week', async () => {
    render(<WeeklyGapTrend weeks={WEEKS} scopeLabel="Ramp" />);
    expect(screen.getByText('Mean gap')).toBeInTheDocument();
    expect(screen.getByText('Score votes')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Table'}));
    const table = screen.getByRole('table', {name: 'Weekly mean gap and score votes, Ramp. Weeks start on Monday (UTC).'});
    const [head, ...rows] = within(table).getAllByRole('row');
    expect(cells(head)).toEqual(['Week of', 'Mean gap', 'Score votes']);
    expect(rows.map(cells)).toEqual([
      ['Sep 14', '−0.50', '2'],
      ['Sep 21', '—', '0'],
      ['Sep 28', '−1.00', '3'],
    ]);
  });
});
```

Run: `pnpm vitest run src/tools/analytics/calibration/__tests__/CalibrationCharts.test.tsx`
Expected: FAIL, `Test Files 1 failed (1)`, with `Error: Failed to resolve import "../CalibrationScatter" from "src/tools/analytics/calibration/__tests__/CalibrationCharts.test.tsx". Does the file exist?`

- [ ] **Step 3: Write `CalibrationScatter.tsx`**

Create `src/tools/analytics/calibration/CalibrationScatter.tsx`:

```tsx
import {ChartFrame} from '../../../charts/ChartFrame';
import {ChartLegend} from '../../../charts/ChartLegend';
import type {TooltipContent, TooltipRow} from '../../../charts/ChartTooltip';
import {ScatterChart} from '../../../charts/ScatterChart';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtGap, fmtInt, fmtScore} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {countOf} from '../activity/activityModel';
import type {PairStat} from '../voteAnalyticsTypes';
import {pairId} from './calibrationModel';
import {
  GAP_SERIES,
  SCATTER_JITTER,
  SCORE_DOMAIN,
  SCORE_TICKS,
  gapSide,
  scatterPoints,
  scatterTable,
  scoreText,
  sharedScores,
  sideColor,
} from './chartData';

export interface CalibrationScatterProps {
  /** The scope, uncapped (pairsInScope): every voted pair the selected rule fired on, or every pair. */
  pairs: readonly PairStat[];
  /** "All pairs" or the selected rule's name. */
  scopeLabel: string;
  selectedPair: {a: string; b: string} | null;
  onSelectPair: (pair: {a: string; b: string}) => void;
  /** Voted pairs with no engine score, which the plot can't place. Only the all-pairs scope passes it. */
  engineSilentPairs?: number;
  /** What an empty scope says (default "No voted pairs yet."). The workspace names the rule when one is selected. */
  emptyText?: string;
}

/** The tooltip for one pair: the gap leads, keyed in its side's colour, then both scores and the votes. */
function pairTooltip(pair: PairStat, sharing: number): TooltipContent {
  const rows: TooltipRow[] = [
    {value: fmtGap(pair.gap), label: 'gap', color: sideColor(gapSide(pair.gap))},
    {value: scoreText(pair.engineScore), label: 'engine'},
    {value: scoreText(pair.communityScore), label: 'community'},
    {value: fmtInt(pair.scoreVotes), label: pair.scoreVotes === 1 ? 'vote' : 'votes'},
  ];
  if (sharing > 1) rows.push({value: fmtInt(sharing), label: 'pairs on these scores'});
  return {title: `${pair.aName} × ${pair.bName}`, rows};
}

const NOTE: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.label, lineHeight: 1.5, color: ADMIN_COLORS.muted};

/**
 * Engine score against community score for every voted pair in scope, with
 * the y = x agreement line. A dot above the line is a pair the community
 * rates higher than the engine. Picking a dot selects the pair, as the pair
 * list does, so its votes open below. The untitled Panel is the card
 * (ChartFrame draws no surface). The engine-silent count sits under the frame,
 * so the table view, which lists only plotted pairs, says what it leaves out too.
 * An empty scope draws no legend.
 */
export function CalibrationScatter({
  pairs,
  scopeLabel,
  selectedPair,
  onSelectPair,
  engineSilentPairs = 0,
  emptyText = 'No voted pairs yet.',
}: CalibrationScatterProps) {
  const byId = new Map(pairs.map((p) => [pairId(p.a, p.b), p]));
  const sharing = sharedScores(pairs);
  return (
    <Panel>
      <ChartFrame
        title="Engine vs community"
        subtitle={
          pairs.length === 0
            ? `${scopeLabel} · no pairs`
            : `${scopeLabel} · ${countOf(pairs.length, 'pair')}. Above the line, the community scores a pair higher than the engine does.`
        }
        legend={pairs.length > 0 ? <ChartLegend series={GAP_SERIES} mark="dot" /> : undefined}
        table={scatterTable(pairs, scopeLabel)}>
        {pairs.length === 0 ? (
          <p style={NOTE}>{emptyText}</p>
        ) : (
          <>
            <ScatterChart
              points={scatterPoints(pairs)}
              series={GAP_SERIES}
              ariaLabel={`Engine score against community score, ${scopeLabel}`}
              xDomain={SCORE_DOMAIN}
              yDomain={SCORE_DOMAIN}
              xTicks={SCORE_TICKS}
              yTicks={SCORE_TICKS}
              xLabel="Engine score"
              yLabel="Community score"
              diagonal="Engine = community"
              jitter={SCATTER_JITTER}
              jitterAlong="diagonal"
              tooltip={(point) => {
                const pair = byId.get(point.key);
                return pair ? pairTooltip(pair, sharing.get(point.key) ?? 1) : {title: point.label, rows: []};
              }}
              selectedKey={selectedPair ? pairId(selectedPair.a, selectedPair.b) : null}
              onSelect={(key) => {
                const pair = byId.get(key);
                if (pair) onSelectPair({a: pair.a, b: pair.b});
              }}
            />
            <p style={NOTE}>
              Each dot slides a little along the line, so pairs on the same scores stay visible, and its height above
              or below the line stays within {fmtScore(SCATTER_JITTER / 5, 2)} of its gap. The tooltip and the table
              give the exact values. Select a dot to open its votes.
            </p>
          </>
        )}
      </ChartFrame>
      {engineSilentPairs > 0 && (
        <p style={NOTE}>
          Not plotted: {countOf(engineSilentPairs, 'engine-silent pair')} (voted, but the engine gives them no score).
        </p>
      )}
    </Panel>
  );
}
```

- [ ] **Step 4: Write `GapHistogram.tsx`**

Create `src/tools/analytics/calibration/GapHistogram.tsx`:

```tsx
import {BarChart, type BarDatum} from '../../../charts/BarChart';
import {ChartFrame} from '../../../charts/ChartFrame';
import {ChartLegend} from '../../../charts/ChartLegend';
import type {TooltipContent} from '../../../charts/ChartTooltip';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtInt} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import type {PairStat} from '../voteAnalyticsTypes';
import {
  GAP_SERIES,
  binLabel,
  binRange,
  gapBins,
  gapShares,
  histogramTable,
  sharePercent,
  sideColor,
  type GapBin,
} from './chartData';

/** The plot's height in px; BarChart adds its cap-label band above it and its x-label band below. */
const PLOT_HEIGHT = 180;

/** The pair count, the votes behind it and its share; the count is keyed in the bin's side colour. */
function binTooltip(bin: GapBin, total: number): TooltipContent {
  return {
    title: `Gap ${binRange(bin.center)}`,
    rows: [
      {value: fmtInt(bin.pairs), label: bin.pairs === 1 ? 'pair' : 'pairs', color: sideColor(bin.side)},
      {value: fmtInt(bin.votes), label: bin.votes === 1 ? 'vote' : 'votes'},
      {value: sharePercent(total === 0 ? 0 : bin.pairs / total), label: 'of pairs'},
    ],
  };
}

export interface GapHistogramProps {
  /** The scope, uncapped (pairsInScope). */
  pairs: readonly PairStat[];
  /** "All pairs" or the selected rule's name. */
  scopeLabel: string;
  /** What an empty scope says (default "No voted pairs yet."). */
  emptyText?: string;
}

/**
 * How the scope's pair gaps spread, one whole-number bin each from ≤−5 to
 * ≥+5. Bins left of centre are pairs the engine scores higher, right of it
 * pairs the community scores higher, and the neutral centre bin is the
 * agreement band. Each bar carries its side in one stacked series, so the
 * kit's BarChart colours it; the other two series are 0 there, and a stack
 * draws nothing for a 0. The subtitle carries the three shares, so no bar
 * prints a cap label. An empty scope draws no legend. The untitled Panel is
 * the card.
 */
export function GapHistogram({pairs, scopeLabel, emptyText = 'No voted pairs yet.'}: GapHistogramProps) {
  const bins = gapBins(pairs);
  const shares = gapShares(bins);
  const byKey = new Map(bins.map((bin) => [String(bin.center), bin]));
  const data: BarDatum[] = bins.map((bin) => ({
    key: String(bin.center),
    label: binLabel(bin.center),
    values: {over: 0, agree: 0, under: 0, [bin.side]: bin.pairs},
  }));
  return (
    <Panel>
      <ChartFrame
        title="Gap distribution"
        subtitle={
          pairs.length === 0
            ? `${scopeLabel} · no pairs`
            : `${scopeLabel} · ${sharePercent(shares.agree)} ${binRange(0)}, ${sharePercent(shares.over)} engine higher, ${sharePercent(shares.under)} community higher`
        }
        legend={pairs.length > 0 ? <ChartLegend series={GAP_SERIES} mark="rect" /> : undefined}
        table={histogramTable(bins, scopeLabel)}>
        {pairs.length === 0 ? (
          <p style={{margin: 0, fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted}}>{emptyText}</p>
        ) : (
          <BarChart
            data={data}
            series={GAP_SERIES}
            ariaLabel={`Pairs by gap, ${scopeLabel}`}
            height={PLOT_HEIGHT}
            valueFormat={fmtInt}
            capLabels="none"
            xLabelEvery={1}
            tooltip={(d) => {
              const bin = byKey.get(d.key);
              return bin ? binTooltip(bin, pairs.length) : {title: d.label, rows: []};
            }}
          />
        )}
      </ChartFrame>
    </Panel>
  );
}
```

- [ ] **Step 5: Write `WeeklyGapTrend.tsx`**

Create `src/tools/analytics/calibration/WeeklyGapTrend.tsx`:

```tsx
import {ChartFrame} from '../../../charts/ChartFrame';
import {LineChart} from '../../../charts/LineChart';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtDay, fmtGap, fmtInt} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {gapDomain, weeklyTable, type WeeklyGap} from './chartData';

/** The two plots' heights in px: the gap is the story, the score votes its context. */
const GAP_HEIGHT = 160;
const VOTES_HEIGHT = 72;

const MUTED: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted};

/** Names one of the figure's two plots: each has its own y axis, so each says what it measures. */
function PlotCaption({children}: {children: React.ReactNode}) {
  return <p style={{...MUTED, fontWeight: 600}}>{children}</p>;
}

/** Why there is no trend to draw, or null when there is one. */
function emptyReason(weeks: readonly WeeklyGap[]): string | null {
  // A tuning-only row scopes no pairs, so its weeks span the log with no score vote in any of them.
  if (!weeks.some((w) => w.scoreVotes > 0)) return 'No score votes in this scope yet.';
  return weeks.length < 2 ? 'Not enough weeks of votes to draw a trend yet.' : null;
}

export interface WeeklyGapTrendProps {
  /** weeklyGaps(votes, scope): every week of the log, oldest first. */
  weeks: readonly WeeklyGap[];
  /** "All pairs" or the selected rule's name. */
  scopeLabel: string;
}

/**
 * The scope's weekly mean gap against a "No gap" baseline, with the score
 * votes behind each week in a short area plot underneath. Two plots, one y
 * axis each: never a second axis on one plot. Both are LineCharts over the
 * same weeks with fixed gutters (R2-4a), so a week sits at the same x in both,
 * and a week without score votes breaks the gap line. The dates print once,
 * under the votes plot at the bottom; the gap plot's tooltip and slider value
 * still name each week. The untitled Panel is the card.
 */
export function WeeklyGapTrend({weeks, scopeLabel}: WeeklyGapTrendProps) {
  const empty = emptyReason(weeks);
  return (
    <Panel>
      <ChartFrame
        title="Weekly gap"
        subtitle={`${scopeLabel} · each week's mean gap (community − engine) and the score votes behind it`}
        table={weeklyTable(weeks, scopeLabel)}>
        {empty ? (
          <p style={MUTED}>{empty}</p>
        ) : (
          <>
            <PlotCaption>Mean gap</PlotCaption>
            <LineChart
              series={[
                {
                  id: 'gap',
                  label: 'Mean gap',
                  color: ADMIN_COLORS.accent,
                  points: weeks.map((w) => ({x: w.week, y: w.meanGap})),
                },
              ]}
              ariaLabel={`Weekly mean gap, ${scopeLabel}`}
              height={GAP_HEIGHT}
              yFormat={fmtGap}
              xFormat={fmtDay}
              xTicks={[]}
              baseline={0}
              baselineLabel="No gap"
              yDomain={gapDomain(weeks)}
              fixedGutters
            />
            <PlotCaption>Score votes</PlotCaption>
            <LineChart
              series={[
                {
                  id: 'votes',
                  label: 'Score votes',
                  color: ADMIN_COLORS.barNeutral,
                  points: weeks.map((w) => ({x: w.week, y: w.scoreVotes})),
                },
              ]}
              ariaLabel={`Score votes per week, ${scopeLabel}`}
              height={VOTES_HEIGHT}
              area
              yFormat={fmtInt}
              xFormat={fmtDay}
              fixedGutters
            />
          </>
        )}
      </ChartFrame>
    </Panel>
  );
}
```

- [ ] **Step 6: Run the test and see it pass**

Run: `pnpm vitest run src/tools/analytics/calibration/__tests__/CalibrationCharts.test.tsx`
Expected: PASS, `Tests 18 passed (18)`.

If "puts each week at the same x in both plots" fails with `expected '14' to be '48'` (or another pair of numbers), one of the two LineCharts is missing `fixedGutters`, or R2-4a's `fixedGutters` doesn't fix both gutters.

- [ ] **Step 7: Write the stories**

Create `src/tools/analytics/calibration/CalibrationCharts.stories.tsx`. The stories draw from R2-4b's seeded fixtures, never `Math.random`, so they hold still. The decorator is R2-6's left column at the usual desktop width (800px), and the local `CalibrationCharts` lays the three charts out as R2-6 does, with the scatter's pick in state:
- `AllPairs`: `ALL_PAIRS` (400 pairs at real density) on "All pairs", with `weeklyGaps(ALL_PAIRS_VOTES, ALL_PAIRS)` (16 weeks) and an engine-silent footnote;
- `OneRule`: `ONE_RULE` (60 pairs) under "Ramp", with its first pair picked, so the scatter shows the accent ring;
- `QuietWeek`: the trend alone over `weeklyGaps(ONE_RULE_VOTES, ONE_RULE)`, whose eleventh week has no score votes, so the gap line breaks there;
- `Empty`: a fresh artifact, no pairs on "All pairs" and no votes.

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {FONTS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import type {PairStat} from '../voteAnalyticsTypes';
import type {VoteLogRow} from '../voteLogTypes';
import {CalibrationScatter} from './CalibrationScatter';
import {GapHistogram} from './GapHistogram';
import {WeeklyGapTrend} from './WeeklyGapTrend';
import {weeklyGaps} from './chartData';
import {ALL_PAIRS, ALL_PAIRS_VOTES, ONE_RULE, ONE_RULE_VOTES} from './chartFixtures';

/** R2-6's TWO_UP row: the scatter and the histogram two-up from 712px of column (two 346px tracks and the gap), stacked below that. */
const CHARTS_ROW: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 346px), 1fr))',
  gap: SPACING.xl,
  alignItems: 'start',
};

interface CalibrationChartsProps {
  pairs: readonly PairStat[];
  /** The vote log the weekly trend joins to the scope (weeklyGaps). */
  votes: readonly VoteLogRow[];
  scopeLabel: string;
  engineSilentPairs?: number;
  emptyText?: string;
  /** The pair picked when the story opens. */
  initialPair?: {a: string; b: string} | null;
}

/** The three charts as R2-6 lays them out, with the scatter's pick held in state as the workspace holds it. */
function CalibrationCharts({pairs, votes, scopeLabel, engineSilentPairs, emptyText, initialPair = null}: CalibrationChartsProps) {
  const [pair, setPair] = useState(initialPair);
  return (
    <>
      <div style={CHARTS_ROW}>
        <CalibrationScatter
          pairs={pairs}
          scopeLabel={scopeLabel}
          selectedPair={pair}
          onSelectPair={setPair}
          engineSilentPairs={engineSilentPairs}
          emptyText={emptyText}
        />
        <GapHistogram pairs={pairs} scopeLabel={scopeLabel} emptyText={emptyText} />
      </div>
      <WeeklyGapTrend weeks={weeklyGaps(votes, pairs)} scopeLabel={scopeLabel} />
    </>
  );
}

const meta: Meta<typeof CalibrationCharts> = {
  title: 'Admin/Insights/Calibration/Charts',
  component: CalibrationCharts,
  // The left column of /calibration at the usual desktop width (about 800px),
  // on the admin page colour. .storybook/preview.tsx mounts AdminStyles.
  decorators: [
    (Story) => (
      <div
        style={{
          minHeight: '100vh',
          padding: `${SPACING.xxl}px ${SPACING.xxxl}px`,
          background: ADMIN_COLORS.page,
          color: ADMIN_COLORS.text,
          fontFamily: FONTS.body,
        }}>
        <div style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: SPACING.xl, maxWidth: 800}}>
          <Story />
        </div>
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

/** 400 pairs at real density on "All pairs", with 16 weeks of votes and an engine-silent footnote. */
export const AllPairs: Story = {
  args: {pairs: ALL_PAIRS, votes: ALL_PAIRS_VOTES, scopeLabel: 'All pairs', engineSilentPairs: 37},
};

/** One rule's 60 pairs, with a pair picked: the scatter rings it in the accent. */
export const OneRule: Story = {
  args: {
    pairs: ONE_RULE,
    votes: ONE_RULE_VOTES,
    scopeLabel: 'Ramp',
    emptyText: 'No voted pairs for this rule yet.',
    initialPair: {a: ONE_RULE[0].a, b: ONE_RULE[0].b},
  },
};

/** The trend alone over a log whose eleventh week has no score votes: the gap line breaks there. */
export const QuietWeek: Story = {
  render: () => <WeeklyGapTrend weeks={weeklyGaps(ONE_RULE_VOTES, ONE_RULE)} scopeLabel="Ramp" />,
};

/** A fresh artifact: no pairs on "All pairs", and no score votes for the trend. */
export const Empty: Story = {
  args: {pairs: [], votes: [], scopeLabel: 'All pairs'},
};
```

- [ ] **Step 8: Lint and typecheck**

Run: `pnpm lint` and `pnpm typecheck`.
Expected: both pass. `typecheck` covers the stories file too (`tsconfig.app.json` includes `src`).

The look of the charts at real density (the scatter's dashes along the line; the histogram's end bins, and all eleven of its x labels two-up, "0" included; the tooltips of a stacked chart on a phone; the trend's quiet weeks, and the two plots lining up over one row of dates) is checked with the deployment's data in the phase's real-data check (header, "Before the PR"), where `Admin/Insights/Calibration/Charts` in `pnpm storybook` is also the quickest place to look.

- [ ] **Step 9: Commit**, with the Bash tool and only after the owner approves:

```bash
git add src/tools/analytics/calibration/CalibrationScatter.tsx src/tools/analytics/calibration/GapHistogram.tsx src/tools/analytics/calibration/WeeklyGapTrend.tsx src/tools/analytics/calibration/CalibrationCharts.stories.tsx src/tools/analytics/calibration/__tests__/CalibrationCharts.test.tsx
USER_APPROVED=1 git commit -m "feat(calibration): add the scatter, gap histogram and weekly gap charts (#24)"
```

**Commit:** `feat(calibration): add the scatter, gap histogram and weekly gap charts (#24)`

<!-- Review of 2026-10-05: all nine notes verified against the repo (main @ c92e260, pin bc877e17) and R2-4a's final code, and applied; none rejected. Note 1 took the preferred fix, which also needs R2-4b's `binLabel` to drop the space in its end labels (its two template strings, its doc and its `binLabel` test): that edit belongs in R2-4b, and Step 1 here stops until it lands. Note 8 (no dates on the gap plot) is applied as the review's optional polish; the owner can drop `xTicks={[]}` and its two assertions to undo it. -->
