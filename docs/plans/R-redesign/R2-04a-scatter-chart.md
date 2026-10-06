> Part of [R: Admin redesign](../R-redesign.md), phase R2 ([R2-calibration-tuning.md](R2-calibration-tuning.md)). Read the main plan's decisions (R-17 to R-26 for R2), corrections, global constraints and shared interfaces, then the R2 header, first.

> **Re-base notes (R2-4a, 2026-10-05).** Re-based from the 2026-10-01 outline onto the kit as merged in R1 (main @ c92e260, pin bc877e1). What changed and why:
> 1. **The kit split.** The LineChart edits now land where the code lives: `lineLayout.ts` gets the two options, the domain change in `yDomain()`, a small `gutters()` helper and the two constants (beside `DOT_RADIUS`, as `BAR_Y_AXIS_WIDTH` sits in `barLayout.ts`). `LineChart.tsx` only takes the two props, passes them on and re-exports the constants, as `BarChart.tsx` re-exports `BAR_Y_AXIS_WIDTH`. `axis.ts` needs no edit; the scatter consumes it (`px`, `LABEL_SIZE`, `TICK_GAP`, `labelWidth`, `labelX`, `yAxis`).
> 2. **`yDomain` is widened, never narrowed.** The outline said the domain "must hold every value", unenforced: a value past a fixed end would draw outside the plot, and a domain without 0 would put the area wash's floor off it. Now it holds every value, zero and the baseline. **R1's deferred minor "LineChart yTicks collide on lopsided signed data (−0.05..1.2)"** is covered here: a test reproduces it (ticks 7.2px apart) and shows a symmetric domain fixing it. The default path is unchanged: no R1 caller draws signed data, and R2's one signed caller (`WeeklyGapTrend`) always passes `gapDomain`.
> 3. **`fixedGutters` widens rather than clips**, as `BAR_Y_AXIS_WIDTH` does. The outline's version clipped a label wider than 48px. So R2-6's real-data check (outline line 2779) should read "the two weekly plots line up week for week: no tick or end label is wider than `LINE_Y_AXIS_WIDTH` or `LINE_END_WIDTH`", not "overflows".
> 4. **ScatterChart builds on the kit's plot.** It renders through `ChartPlot`, so it gets `adm-chart-plot`'s focus ring and touch rule (the outline relied on the app's global `:focus-visible`). `ChartPlot` gains one optional prop, `extend`, through which the scatter swaps the kit's x-only pointer for the nearest dot, adds click and Enter/Space, and passes focus on to the kit only from the keyboard (note 6). The y axis is `AxisGrid` + `yAxis`, the drawing is `ChartSvg`, and an empty scatter shows `EmptyChart` (new `emptyText` prop, kit parity: no dead slider with `tabIndex −1`). `DOT_RADIUS` and `RING` come from `lineLayout.ts`.
> 5. **Width.** `scatterWidth(measured) = min(chartWidth(measured), SCATTER_MAX_WIDTH)`, so before the first measure (and in jsdom) the scatter lays out at 440px, not the outline's own 360px fallback. The test geometry follows: side 392, height 456.
> 6. **Enter/Space read `aria-valuenow`, and only focus from the keyboard moves the cursor.**
>    - The current `useChartCursor` always reports what the slider announces in `aria-valuenow`: the held position (kept through Escape), or the newest one after a leave. So the scatter reads it from the props `ChartPlot` hands `extend`, in place of the outline's `cursor.index ?? aria-valuenow`.
>    - The kit's `onFocus` moves the cursor to that resting position. That suits a chart where every press lands on a position, but a scatter press can find no dot. In the first draft, a press on empty space cleared the cursor, the focus that followed brought up the newest dot's tooltip, and a tap kept it (found at review). So the scatter passes focus on to the kit only when the plot matches `:focus-visible`, the test its focus ring uses. Focus from the keyboard shows the resting dot; focus from a press keeps what the press found. A pointer test pins the press, and the Enter/Space test now tabs in and checks the resting dot's tooltip.
> 7. **Code Health.** The outline's 180-line `ScatterChart` is split the way R1's final fix wave split BarChart and LineChart: pure geometry in `scatter.ts` (`placeDots`, the diagonal inside `scatterLayout`) and small parts in `ScatterChart.tsx` (`XGrid`, `AxisTitles`, `Diagonal`, `Dots`, `LiftedDot`, `LiftedDots`, `DotTooltip`, `dotText`, `activeDot`, `scatterInput`, and `SELECT_KEYS` for Enter and Space). The first draft kept the lifted dots, the tooltip and the value text inline and scored 9.19: `ScatterChart` at cyclomatic complexity 13, and a complex conditional in `onKeyDown`. That would fail the PR gate R1 cleared. As written here, CodeScene scores both new files 10.0.
> 8. **R-23 as decided:** opaque r 4 dots, each on its own r 6 disc in `page`; ±0.35 along y = x and a fifth of that across (`jitterAlong="diagonal"`); one size; drawn in `points` order (R2-4b sorts the widest gaps last); the "pairs on these scores" line is R2-4b's and R2-4c's. One question for the owner: since R1's fix wave, LineChart's markers ring in the true surface (two discs, page then card: `SurfaceRing`, which stays in `LineChart.tsx`). R-23 names the page disc, so the scatter keeps it: its ring reads a hair darker than the card, and a neutral dot composites to exactly the validator's `#63637d`. If the owner picks the two-disc ring, only `Dots` and `LiftedDot` change (a card disc after each page disc), with the two tests that check the disc fill ("draws each r 4 dot on its own opaque r 6 disc…" and "lifts the dot nearest the pointer…"). **Flag this to the owner at review.**
> 9. **The diagonal's label** is placed by the line's computed angle (right for any domains, not only equal ones), and sits `-1em` off the line, not `-0.4em`, so its glyphs clear the r 6 discs of the dots on the line.
> 10. **Legend and stories.** The `'dot'` swatch goes through a small `Swatch` component and keeps a hatched series' pattern. The stories join the kit's one story file, `Charts.stories.tsx` (the main plan's file structure), instead of a new `ScatterChart.stories.tsx`. Their data is deterministic arithmetic, as the existing stories', with no `Math.random` and no R2-4b fixtures, since R2-4b comes later.
> 11. **New names, additions only:** `ScatterPoint` moves to `scatter.ts` and is re-exported from `ScatterChart.tsx`, so R2-4b's `import type {ScatterPoint} from '../../../charts/ScatterChart'` still works. Also new: `SCATTER_MAX_WIDTH`, `scatterWidth`, `DiagonalLine` and `ScatterLayout.diagonal`, `scatterLayout`'s optional `yLabels` (wide y tick labels widen the left margin, as they widen BarChart's gutter), `JitterAlong`, `PlacedDot`, `DotOptions` and `placeDots`. `SCATTER_MARGIN` keeps 24/16/40/32, now from `SPACING`.
> 12. **The pin.** Nothing here reads app or engine data. The tokens it uses are unchanged at bc877e1 (`SPACING` sm 8, lg 16, xxl 24, xxxl 32; `FONT_SIZES` xs 10, sm 11).
> 13. **Dropped:** the outline's note that "If R1-3b absorbs these edits … drop Steps 2 to 4". R1 merged without them, so R2-4a owns them.
> 14. **`tickFormat` defaults to `fmtInt`** (found at review), as LineChart's `yFormat` and BarChart's `valueFormat` do, not the outline's `String`, so a negative tick reads with U+2212. R2-4c passes none, and its ticks are 1 to 10. The left margin formats the y ticks one at a time, `(tick) => tickFormat(tick)`, so a formatter with an optional second parameter (`fmtScore`'s digits) never gets `map`'s index.
>
> **Verified (2026-10-05, again after review)** in a scratch sandbox (copies of `src/` and the configs, with junctions to the repo's `node_modules` and `upstream/`, and the Vite cache kept in the sandbox; the repo's tree and caches stayed untouched):
> - The plan's own Before/After blocks and new files, replayed onto pristine copies, give byte-identical files to the verified ones.
> - Step 1's greps print one line each, and Step 2 gives `5 failed | 32 passed (37)` with the messages quoted below.
> - Step 4 gives 37/37, then 12 files and 150 tests, and Step 5 gives `Failed to resolve import`.
> - Step 7 gives 28/28, and `src/charts` as a whole 14 files and 178 tests. `vitest run` over `src/` gives 82 files and 727 tests.
> - The press test fails on the first draft's `scatterInput` (its tooltip reads "Tip c") and passes with the focus fix. Both halves of the focus rule are pinned: passing focus on for every focus fails the press test, and never passing it on fails the Enter/Space test, which then shows no tooltip after Tab.
> - `tsc -p tsconfig.app.json` is clean, including a probe file with R2-4c's exact `ScatterChart`, `ChartLegend mark="dot"` and `LineChart yDomain/fixedGutters` calls.
> - `pnpm exec eslint --max-warnings 0 --stdin` is clean on all twelve files.
> - CodeScene scores all twelve files 10.0. The first draft's `ScatterChart.tsx` scored 9.19.
> - The three new stories render in jsdom. In `ScatterSelected`, a press on empty space shows no tooltip, and Enter selects the dot the slider announces.

**Contract additions 5 to 7, re-based** (they replace items 5 to 7 of the outline's header; additions only):
5. **`src/charts/scatter.ts` and `src/charts/ScatterChart.tsx`: a scatter chart joins the kit (R2-4a).** It goes into "Chart kit (R1-3b)" when the plan is assembled. It builds only on kit names (`linear`, `chartWidth`, `SeriesDef`, `ChartTooltip`/`TooltipContent`, `useChartCursor`, `ChartPlot`/`ChartSvg`/`AxisGrid`/`EmptyChart`, `axis.ts`, `DOT_RADIUS`/`RING`) and `fmtInt`, the other charts' default number format:
   ```ts
   // src/charts/scatter.ts
   export interface ScatterPoint {key: string; x: number; y: number; series: string; label: string} // label: the slider's value text
   export const HIT_RADIUS = 24;                                    // px: the pointer only has to be closest, within this of a dot's centre
   export const SCATTER_MARGIN: {readonly top: 24; readonly right: 16; readonly bottom: number; readonly left: 32}; // 24/16/40/32 from SPACING; left is a floor
   export const SCATTER_MAX_WIDTH = 440;
   export function scatterWidth(measured: number): number;          // min(chartWidth(measured), SCATTER_MAX_WIDTH): 440 until measured
   export interface DiagonalLine {x1: number; y1: number; x2: number; y2: number; angle: number} // px; angle in degrees
   export interface ScatterLayout {width: number; height: number; left: number; top: number; side: number;
     x: (v: number) => number; y: (v: number) => number; diagonal: DiagonalLine | null}
   export function scatterLayout(width: number, xDomain: readonly [number, number], yDomain: readonly [number, number],
     yLabels?: readonly string[]): ScatterLayout;                   // a square plot; the left margin fits the widest y label
   export function jitterOffset(key: string, amount: number): [number, number];   // fixed per key, each axis within ±amount
   export function diagonalJitter(key: string, along: number, across: number): [number, number]; // fixed per key; y − x moves by at most `across`
   export type JitterAlong = 'both' | 'diagonal';
   export interface PlacedDot {point: ScatterPoint; color: string; px: number; py: number}
   export interface DotOptions {series: readonly SeriesDef[]; jitter: number; jitterAlong: JitterAlong}
   export function placeDots(points: readonly ScatterPoint[], layout: ScatterLayout, opts: DotOptions): PlacedDot[]; // 'diagonal': across = jitter / 5
   export function nearestPoint(points: ReadonlyArray<{px: number; py: number}>, x: number, y: number, radius: number): number | null;
   export function scatterOrder<T extends {key: string; x: number; y: number}>(points: readonly T[]): T[]; // x, then y, then key

   // src/charts/ScatterChart.tsx (re-exports ScatterPoint)
   export interface ScatterChartProps {
     points: readonly ScatterPoint[];          // drawn in this order: the last sit on top
     series: readonly SeriesDef[]; ariaLabel: string;
     xDomain: readonly [number, number]; yDomain: readonly [number, number];
     xTicks: readonly number[]; yTicks: readonly number[]; xLabel: string; yLabel: string;
     tickFormat?: (n: number) => string;      // default fmtInt
     diagonal?: string;                        // draws y = x, labelled with this text
     jitter?: number;                          // data units, default 0
     jitterAlong?: JitterAlong;                // default 'both'; 'diagonal' uses diagonalJitter(key, jitter, jitter / 5)
     tooltip: (point: ScatterPoint) => TooltipContent;
     selectedKey?: string | null; onSelect?: (key: string) => void; // with onSelect, click and Enter/Space select
     emptyText?: string;                       // shown in place of the plot with no points (default "No data to chart.")
   }
   export function ScatterChart(props: ScatterChartProps): JSX.Element;

   // src/charts/ChartSvg.tsx: ChartPlot gains
   extend?: (props: React.HTMLAttributes<HTMLElement>) => React.HTMLAttributes<HTMLElement>; // adjusts the slider's props before they are spread
   ```
6. **`src/charts/lineLayout.ts` and `LineChart.tsx`: what the weekly gap trend (R2-4c) needs.**
   - **Already in the kit (R1), so R2-4a only checks for them:** `LinePoint.y` is `number | null` (`lineLayout.ts`). A null keeps its x on the axis, breaks the line and reads "—" in the tooltip. A non-null point with no neighbours gets its own dot (`circle[data-lone]`), and the series' last point the ringed end dot (`circle[data-end]`).
   - **Added by R2-4a:** `LineLayoutOptions` and `LineChart`'s props gain `yDomain?: readonly [number, number]` and `fixedGutters?: boolean`, and `lineLayout.ts` exports `LINE_Y_AXIS_WIDTH` and `LINE_END_WIDTH` (48px each, `SPACING.xxxl + SPACING.lg`), which `LineChart.tsx` re-exports.
     - **`yDomain`** is the y domain to span, widened only to keep every value, zero and the baseline on the plot. Its ticks follow the computed domain's rule: both ends, and 0 between them when it crosses zero.
     - **`fixedGutters`** lays the plot out between the two fixed gutters, so two LineCharts over the same x put each x at the same px. A label wider than its gutter widens it, as with `BAR_Y_AXIS_WIDTH`.
     - Existing callers pass neither and draw as before.
7. **`src/charts/ChartLegend.tsx`: `mark: 'rect' | 'line' | 'dot'`.** `'dot'` keys each series with a filled circle (its hatch included), so the scatter's legend mirrors its dots. Existing callers draw as before.

### Task R2-4a: The scatter chart in the kit

**Files:**
- Create `src/charts/scatter.ts` and `src/charts/ScatterChart.tsx`.
- Modify:
  - `src/charts/lineLayout.ts`: `yDomain`, `fixedGutters`, `LINE_Y_AXIS_WIDTH` and `LINE_END_WIDTH`;
  - `src/charts/LineChart.tsx`: the two props, passed to `lineLayout`, and the two constants re-exported;
  - `src/charts/ChartLegend.tsx`: `mark="dot"`;
  - `src/charts/ChartSvg.tsx`: `ChartPlot`'s `extend`;
  - `src/charts/Charts.stories.tsx`: three scatter stories.
- Test:
  - create `src/charts/__tests__/scatter.test.ts` and `src/charts/__tests__/ScatterChart.test.tsx`;
  - add to `src/charts/__tests__/LineChart.test.tsx`, `src/charts/__tests__/lineLayout.test.ts` and `src/charts/__tests__/ChartLegend.test.tsx`.

**Interfaces:**
- **Consumes** (as merged in R1):
  - `useChartCursor(n): ChartCursor` (`useChartCursor.ts`):
    - Focus shows the resting position, the newest unless one is held.
    - ←/→ and ↓/↑ step, Home and End jump, and Escape hides the tooltip but keeps the place.
    - A mouse or pen leaving clears it, and a touch leave keeps the tapped position.
    - `plotProps(valueText, xs)` returns `role="slider"`, `tabIndex`, `aria-valuemin`/`-max`/`-now`/`-text`, `onFocus`, `onBlur`, `onKeyDown`, and x-only `onPointerMove`/`onPointerDown`, plus `onPointerLeave`.
  - From `ChartSvg.tsx`: `ChartPlot({ariaLabel, cursor, valueText, xs, height, children})`, `ChartSvg({width, height, children})`, `AxisGrid({ticks, left, right})` and `EmptyChart({text?})`.
  - From `axis.ts`: `LABEL_SIZE`, `TICK_GAP`, `px(n)`, `labelWidth(text)`, `labelX(center, width, chartWidth)` and `yAxis(values, format, y): YAxis`.
  - Elsewhere in the kit:
    - `linear` (`scale.ts`);
    - `SeriesDef` and `chartWidth(measured)` (`series.ts`; 640 until measured);
    - `ChartTooltip` and `TooltipContent`;
    - `DOT_RADIUS` (4) and `RING` (2) from `lineLayout.ts`.
  - `useContainerWidth` and `SPACING` through the bridge, and `ADMIN_COLORS` and `ADMIN_TYPE`.
  - `fmtInt` (`src/ui/format.ts`), the default tick format.
- **Produces:** contract additions 5, 6 (R2-4a's half) and 7, as above.

**How it draws:**
- **The plot** is square, so equal domains draw y = x at 45°.
  - Each tick gets a solid 1px gridline: `AxisGrid` for y, its x twin for x. They are `divider`, and a zero line is `border`.
  - Tick labels are `fmtInt` by default, as on the other charts' axes, so a negative tick reads with U+2212. They are `muted` at `LABEL_SIZE`, with tabular figures, and the x labels are kept inside the chart (`labelX`).
  - The axis titles are `muted` at `ADMIN_TYPE.label`: y's sits above the plot at the left, x's under the tick labels at the right.
  - The left margin grows for y tick labels wider than its 32px floor.
- **The diagonal** is a solid hairline in `dim` across the domains' overlap. Its `muted` label runs along it at the line's own angle, just inside the top end, a line's height above it.
- **Dots (R-23):**
  - Each is r 4, on its own opaque r 6 disc in `page`. The disc is the 2px ring: no dot shows through another. `barNeutral`'s 0.7 alpha composites over the page alone, so the neutral dot is the validator's `#63637d` whatever lies beneath. A stroke would be centred on the edge and leave r 3 of fill, under the r ≥ 4 mark spec.
  - Dots are drawn in `points` order, so the last sit on top.
  - The dot under the cursor lifts to r 6 on an r 8 disc. So does the selected one, which also gets a 2px `accent` ring just outside its disc (r 9).
- **Jitter:** `jitterAlong="diagonal"` slides each dot along y = x by up to ±`jitter`, and across it by up to a fifth of that (`diagonalJitter`). So y − x moves by at most `jitter / 5`. The default `'both'` keeps `jitterOffset`'s square spread. Either way the offset is fixed per key, so a dot never moves between renders.
- **Width:** the container's, up to `SCATTER_MAX_WIDTH` (440px). Until it is measured, and always in jsdom, it is 440px (`chartWidth`'s 640 fallback, capped).
- **Pointer:**
  - The dot nearest the pointer, within `HIT_RADIUS` (24px, a 48px target), gets the cursor and the tooltip.
  - A mouse or pen leaving clears them. A lifted finger keeps the tapped dot: the kit's own leave handler stays.
  - A click selects the nearest dot. With none within 24px it does nothing.
  - A press that focuses the plot keeps what it found, so a click or tap on empty space shows no tooltip (see "Keyboard").
- **Keyboard:**
  - `ChartPlot` and `useChartCursor` give the plot its slider role, tab stop, `aria-value*`, focus ring (`adm-chart-plot`) and ←/→/↑/↓/Home/End/Escape. ← and → walk the dots in `scatterOrder`: left to right, then bottom to top.
  - Through `ChartPlot`'s `extend`, the scatter swaps the kit's x-only pointer, on move and on press, for the nearest dot in two dimensions.
  - Focus from the keyboard shows the resting dot, as the kit's focus does. Focus from a press keeps what the press found: the scatter passes focus on to the kit only when the plot matches `:focus-visible`, the test `adm-chart-plot`'s focus ring uses. The kit's focus alone would move the cursor to the newest dot after a press that found none.
  - The scatter also adds Enter and Space, which select the dot the slider announces: its `aria-valuenow`, the cursor's dot or, after Escape or once the pointer has left, the one it rests on. So a screen-reader user who hears a pair and presses Enter selects that pair.
  - The value text is the point's `label`, plus ", selected" on the selected dot, so the selection reaches assistive tech as the accent ring reaches the eye.
  - Everything arrives as one props object on the plot, as the kit's sliders do. jsx-a11y passes the spread, and fails handlers written beside a literal `role`.
- **Motion:** none of its own. The tooltip's glide is the kit's `adm-chart-tip`, which reduced motion switches off.

- [ ] **Step 1: Check that the kit has what R2 builds on**

```bash
grep -n "y: number | null" src/charts/lineLayout.ts
grep -n "data-lone" src/charts/LineChart.tsx
grep -n "export function ChartPlot" src/charts/ChartSvg.tsx
grep -n "'aria-valuenow': resting" src/charts/useChartCursor.ts
```

Expected: one line each:
- the `LinePoint` field;
- the lone-point circle;
- `ChartPlot`;
- the slider's resting value, which Enter and Space read.

If any prints nothing, the kit is not as R1 merged it. Stop and settle it with the owner before going on.

- [ ] **Step 2: Add the failing kit tests**

Each "Before" block is quoted exactly from the current file.

In `src/charts/__tests__/LineChart.test.tsx`, the import. Before:

```tsx
import {LineChart, type LineSeries} from '../LineChart';
```

After:

```tsx
import {LINE_END_WIDTH, LINE_Y_AXIS_WIDTH, LineChart, type LineSeries} from '../LineChart';
```

The end of `describe('LineChart: axis and baseline', …)`. Before:

```tsx
    expect(texts(container, 'svg > g:not([data-baseline]) > text')).toEqual(['−3', '0']);
    expect(container.querySelector('g[data-baseline] text')).toHaveTextContent('0');
  });
});
```

After:

```tsx
    expect(texts(container, 'svg > g:not([data-baseline]) > text')).toEqual(['−3', '0']);
    expect(container.querySelector('g[data-baseline] text')).toHaveTextContent('0');
  });

  it('spans a fixed y domain, so signed data that leans one way keeps its ticks apart', () => {
    // On its own, −0.05 to 1.2 gets ticks at −0.05 and 0, about 7px apart, and their labels collide.
    const lopsided = seriesOf({id: 'gap', label: 'Mean gap', color: ADMIN_COLORS.accent}, [-0.05, 0.3, 1.2]);
    const {container} = render(
      <LineChart series={[lopsided]} ariaLabel="Weekly gap" yFormat={fmtGap} baseline={0} yDomain={[-1.5, 1.5]} />,
    );
    expect(texts(container, 'svg > g:not([data-baseline]) > text')).toEqual(['−1.50', '0.00', '+1.50']);
  });

  it('puts each x at the same px in two charts with fixed gutters, whatever their labels need', () => {
    // On their own, "−0.50" needs a wider gutter than "120", so the same day would sit at two xs.
    const gaps = seriesOf({id: 'gap', label: 'Mean gap', color: ADMIN_COLORS.accent}, [-0.5, 0.3, 1.2]);
    const votes = seriesOf({id: 'votes', label: 'Score votes', color: ADMIN_COLORS.barNeutral}, [12, 45, 120]);
    const gap = render(<LineChart series={[gaps]} ariaLabel="Gap" yFormat={fmtGap} fixedGutters />).container;
    const vote = render(<LineChart series={[votes]} ariaLabel="Votes" fixedGutters />).container;
    const firstX = (container: HTMLElement, id: string) =>
      container.querySelector(`path[data-series="${id}"]`)?.getAttribute('d')?.split(',')[0];
    const endX = (container: HTMLElement, id: string) => container.querySelector(`circle[data-end="${id}"]`)?.getAttribute('cx');
    expect(firstX(gap, 'gap')).toBe(`M${LINE_Y_AXIS_WIDTH}`);
    expect(firstX(vote, 'votes')).toBe(`M${LINE_Y_AXIS_WIDTH}`);
    // The 640px fallback width, less the right gutter.
    expect(endX(gap, 'gap')).toBe(String(640 - LINE_END_WIDTH));
    expect(endX(vote, 'votes')).toBe(String(640 - LINE_END_WIDTH));
  });
});
```

> **2026-10-06:** R2-4c moved the baseline's label from inside the plot into the y gutter, where a tick within 12px of it prints no label. So the fixed-domain test now finds "0.00" as the baseline's label, not among the ticks.

In `src/charts/__tests__/lineLayout.test.ts`, the import. Before:

```ts
import {lineLayout, lonePoints, tooltipY, type LineLayoutOptions, type LineSeries} from '../lineLayout';
```

After:

```ts
import {
  LINE_END_WIDTH,
  LINE_Y_AXIS_WIDTH,
  lineLayout,
  lonePoints,
  tooltipY,
  type LineLayoutOptions,
  type LineSeries,
} from '../lineLayout';
```

The end of `describe('lineLayout', …)`. Before:

```ts
  it('has nothing to place without points', () => {
    const layout = lineLayout(320, [seriesOf('s', [])], OPTIONS);
    expect(layout.xs).toEqual([]);
    expect(layout.xLabels).toEqual([]);
    expect(layout.endLabels).toEqual([]);
  });
});
```

After:

```ts
  it('has nothing to place without points', () => {
    const layout = lineLayout(320, [seriesOf('s', [])], OPTIONS);
    expect(layout.xs).toEqual([]);
    expect(layout.xLabels).toEqual([]);
    expect(layout.endLabels).toEqual([]);
  });

  it('spans a fixed y domain, widened only to keep every value on the plot', () => {
    // On its own, −0.05 to 1.2 gets ticks at −0.05 and 0 just 7.2px apart: their labels collide.
    const lopsided = seriesOf('gap', [-0.05, 0.3, 1.2]);
    const own = lineLayout(320, [lopsided], {...OPTIONS, yFormat: fmtGap});
    expect(own.ticks.map((t) => t.label)).toEqual(['−0.05', '0.00', '+1.20']);
    expect(own.ticks[0].y - own.ticks[1].y).toBeCloseTo(7.2, 6);
    // A symmetric domain (R2's gapDomain) puts zero mid-plot, 90px from each end.
    const fixed = lineLayout(320, [lopsided], {...OPTIONS, yFormat: fmtGap, yDomain: [-1.5, 1.5]});
    expect(fixed.ticks.map((t) => [t.label, t.y])).toEqual([
      ['−1.50', 188],
      ['0.00', 98],
      ['+1.50', 8],
    ]);
    // A value past a fixed end widens that end; nothing is clipped.
    const narrow = lineLayout(320, [lopsided], {...OPTIONS, yFormat: fmtGap, yDomain: [-1, 1]});
    expect(narrow.ticks.map((t) => t.label)).toEqual(['−1.00', '0.00', '+1.20']);
  });

  it('lays the plot between fixed gutters when asked, whatever its labels need', () => {
    const gaps = lineLayout(320, [seriesOf('gap', [-0.5, 0.3, 1.2])], {...OPTIONS, yFormat: fmtGap, fixedGutters: true});
    const votes = lineLayout(320, [seriesOf('votes', [12, 45, 120])], {...OPTIONS, fixedGutters: true});
    for (const layout of [gaps, votes]) {
      expect(layout.left).toBe(LINE_Y_AXIS_WIDTH);
      expect(layout.plotWidth).toBe(320 - LINE_Y_AXIS_WIDTH - LINE_END_WIDTH);
    }
    expect(gaps.xPx).toEqual(votes.xPx);
    // On their own, "−0.50" (30px) needs a wider gutter than "120" (18px).
    expect(lineLayout(320, [seriesOf('gap', [-0.5, 0.3, 1.2])], {...OPTIONS, yFormat: fmtGap}).left).toBe(38);
    expect(lineLayout(320, [seriesOf('votes', [12, 45, 120])], OPTIONS).left).toBe(26);
  });

  it('widens a fixed gutter rather than clip a label that needs more', () => {
    // "150,000" on the axis and "123,456" at the end are seven characters (42px) each.
    const wide = lineLayout(320, [seriesOf('votes', [1000, 99999, 123456])], {...OPTIONS, fixedGutters: true});
    expect(wide.left).toBe(50);
    expect(wide.width - wide.left - wide.plotWidth).toBe(52);
  });
});
```

In `src/charts/__tests__/ChartLegend.test.tsx`, the end of the file. Before:

```tsx
    expect(keys[0]).toHaveAttribute('stroke-width', '2');
    expect(container.querySelector('rect')).toBeNull();
  });
});
```

After:

```tsx
    expect(keys[0]).toHaveAttribute('stroke-width', '2');
    expect(container.querySelector('rect')).toBeNull();
  });

  it('keys scatter dots with a filled circle, a hatched series with its pattern', () => {
    const {container} = render(<ChartLegend series={BANDS} mark="dot" />);
    const keys = container.querySelectorAll('svg[aria-hidden="true"] > circle');
    expect(keys).toHaveLength(3);
    expect(keys[0]).toHaveAttribute('fill', ADMIN_COLORS.under);
    expect(keys[2]).toHaveAttribute('fill', `url(#${container.querySelector('pattern')!.id})`);
    expect(container.querySelector('svg[aria-hidden="true"] > rect')).toBeNull();
  });
});
```

Run: `pnpm vitest run src/charts/__tests__/LineChart.test.tsx src/charts/__tests__/lineLayout.test.ts src/charts/__tests__/ChartLegend.test.tsx`

Expected: FAIL, `Tests 5 failed | 32 passed (37)`. The fifth new test, "widens a fixed gutter…", passes already: the gutters fit their labels today.
- "keys scatter dots with a filled circle…": `expected  to have a length of 3 but got +0`;
- "spans a fixed y domain, so signed data…": `expected [ '−0.05', '0.00', '+1.20' ] to deeply equal [ '−1.50', '0.00', '+1.50' ]`;
- "puts each x at the same px…": `expected 'M38' to be 'Mundefined'`;
- "spans a fixed y domain, widened only…": `expected [ [ '−0.05', 188 ], …(2) ] to deeply equal [ [ '−1.50', 188 ], …(2) ]`;
- "lays the plot between fixed gutters…": `expected 38 to be undefined`.

- [ ] **Step 3: Make the kit edits**

In `src/charts/lineLayout.ts`, the end of `LineLayoutOptions`. Before:

```ts
  /** A hairline value the y domain must include. */
  baseline?: number;
}
```

After:

```ts
  /** A hairline value the y domain must include. */
  baseline?: number;
  /** The y domain to span in place of a computed one, widened only to keep every value, zero and the baseline on the plot. */
  yDomain?: readonly [number, number];
  /** Lay the plot out between LINE_Y_AXIS_WIDTH and LINE_END_WIDTH, so charts over the same x put each x at the same px. */
  fixedGutters?: boolean;
}
```

The layout constants. Before:

```ts
const X_BAND = SPACING.xl;
const RIGHT_PAD = SPACING.sm;
```

After:

```ts
const X_BAND = SPACING.xl;
const RIGHT_PAD = SPACING.sm;
/**
 * fixedGutters' room left of the plot: a six-character tick label ("−10.00",
 * 36px at the label size) and the gap to the plot. Like BAR_Y_AXIS_WIDTH, a
 * label that needs more widens it rather than clip.
 */
export const LINE_Y_AXIS_WIDTH = SPACING.xxxl + SPACING.lg;
/** fixedGutters' room right of the plot: the ringed end dot and a six-character end label. A wider label widens it too. */
export const LINE_END_WIDTH = SPACING.xxxl + SPACING.lg;
```

The y domain. Before:

```ts
/** A clean domain around the values, zero and the baseline: 0 to 1 when there is nothing but zeros. */
function yDomain(all: readonly number[], baseline: number | undefined): YDomain {
  const extra = baseline ?? 0;
  const hi = Math.max(0, ...all, extra);
  const lo = Math.min(0, ...all, extra);
  const integers = all.every(Number.isInteger) && Number.isInteger(extra);
  if (lo < 0) return {bottom: -niceCeiling(-lo), top: hi > 0 ? niceCeiling(hi) : 0, integers};
```

After:

```ts
/**
 * The domain around the values, zero and the baseline: the caller's fixed one,
 * widened where one of them falls outside it, or else clean ends (0 to 1 when
 * there is nothing but zeros).
 */
function yDomain(all: readonly number[], opts: Pick<LineLayoutOptions, 'baseline' | 'yDomain'>): YDomain {
  const extra = opts.baseline ?? 0;
  const hi = Math.max(0, ...all, extra);
  const lo = Math.min(0, ...all, extra);
  const integers = all.every(Number.isInteger) && Number.isInteger(extra);
  if (opts.yDomain) return {bottom: Math.min(opts.yDomain[0], lo), top: Math.max(opts.yDomain[1], hi), integers};
  if (lo < 0) return {bottom: -niceCeiling(-lo), top: hi > 0 ? niceCeiling(hi) : 0, integers};
```

The end of `rightRoom`, followed by the new `gutters` helper. Before:

```ts
  return Math.max(RIGHT_PAD, Math.ceil(widest + DOT_RADIUS + RING + SPACING.xs));
}
```

After:

```ts
  return Math.max(RIGHT_PAD, Math.ceil(widest + DOT_RADIUS + RING + SPACING.xs));
}

/** The room left and right of the plot: what its labels need, and with fixed gutters at least LINE_Y_AXIS_WIDTH and LINE_END_WIDTH. */
function gutters(left: number, right: number, fixed: boolean): {left: number; right: number} {
  if (!fixed) return {left, right};
  return {left: Math.max(LINE_Y_AXIS_WIDTH, left), right: Math.max(LINE_END_WIDTH, right)};
}
```

In `lineLayout()`. Before:

```ts
  const domain = yDomain(values.flat().filter((v): v is number => v != null), opts.baseline);
  const y = linear([domain.bottom, domain.top], [plotBottom, plotTop]);
  const axis = yAxis(yTicks(domain), opts.yFormat, y);
  const endLabels = endLabelsFor(values, series, {y, format: opts.yFormat});
  const left = axis.gutter;
  const plotWidth = Math.max(width - left - rightRoom(endLabels), 1);
```

After:

```ts
  const domain = yDomain(values.flat().filter((v): v is number => v != null), opts);
  const y = linear([domain.bottom, domain.top], [plotBottom, plotTop]);
  const axis = yAxis(yTicks(domain), opts.yFormat, y);
  const endLabels = endLabelsFor(values, series, {y, format: opts.yFormat});
  const {left, right} = gutters(axis.gutter, rightRoom(endLabels), opts.fixedGutters ?? false);
  const plotWidth = Math.max(width - left - right, 1);
```

In `src/charts/LineChart.tsx`, the imports and re-exports. Before:

```tsx
import {DOT_RADIUS, RING, lineLayout, lonePoints, tooltipY, type LineLayout, type LineSeries, type PlotPoint} from './lineLayout';
import {chartWidth, tooltipText} from './series';
import {useChartCursor} from './useChartCursor';

export type {LinePoint, LineSeries} from './lineLayout';
```

After:

```tsx
import {
  DOT_RADIUS,
  LINE_END_WIDTH,
  LINE_Y_AXIS_WIDTH,
  RING,
  lineLayout,
  lonePoints,
  tooltipY,
  type LineLayout,
  type LineSeries,
  type PlotPoint,
} from './lineLayout';
import {chartWidth, tooltipText} from './series';
import {useChartCursor} from './useChartCursor';

export type {LinePoint, LineSeries} from './lineLayout';
export {LINE_END_WIDTH, LINE_Y_AXIS_WIDTH};
```

The end of `LineChartProps`. Before:

```tsx
  /** Shown in place of the plot when no series has a point (default "No data to chart."). */
  emptyText?: string;
}
```

After:

```tsx
  /** Shown in place of the plot when no series has a point (default "No data to chart."). */
  emptyText?: string;
  /**
   * The y domain to span in place of 0 to a clean top, widened only to keep
   * every value, zero and the baseline on the plot. On its own, signed data
   * that leans one way (−0.05 to 1.2) gets ticks at −0.05 and 0, close enough
   * to collide; a symmetric domain keeps them apart (R2's gapDomain).
   */
  yDomain?: readonly [number, number];
  /**
   * Lays the plot out between LINE_Y_AXIS_WIDTH and LINE_END_WIDTH instead of
   * the room its own labels need, so two charts over the same x put each x at
   * the same px (R2's weekly gap trend). A wider label still widens its gutter.
   */
  fixedGutters?: boolean;
}
```

The props and the layout call. Before:

```tsx
  baselineLabel,
  emptyText,
}: LineChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measured = useContainerWidth(wrapRef);
  const layout = lineLayout(chartWidth(measured), series, {height, yFormat, xFormat, xTicks, baseline});
```

After:

```tsx
  baselineLabel,
  emptyText,
  yDomain,
  fixedGutters,
}: LineChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measured = useContainerWidth(wrapRef);
  const layout = lineLayout(chartWidth(measured), series, {height, yFormat, xFormat, xTicks, baseline, yDomain, fixedGutters});
```

In `src/charts/ChartLegend.tsx`, the props. Before:

```tsx
interface ChartLegendProps {
  series: readonly SeriesDef[];
  /** 'rect' for bars and areas, 'line' for lines: the swatch mirrors the mark. */
  mark: 'rect' | 'line';
}
```

After:

```tsx
interface ChartLegendProps {
  series: readonly SeriesDef[];
  /** 'rect' for bars and areas, 'line' for lines, 'dot' for scatter dots: the swatch mirrors the mark. */
  mark: 'rect' | 'line' | 'dot';
}

/** A filled swatch in the series' paint: a dot for scatter dots, else a rounded square. */
function Swatch({mark, fill}: {mark: 'rect' | 'dot'; fill: string}) {
  if (mark === 'dot') return <circle cx={SWATCH / 2} cy={SWATCH / 2} r={SWATCH / 2} fill={fill} />;
  return <rect width={SWATCH} height={SWATCH} rx={RADIUS.xs} fill={fill} />;
}
```

The swatch. Before:

```tsx
              <rect width={SWATCH} height={SWATCH} rx={RADIUS.xs} fill={seriesPaint(s, chartId)} />
```

After:

```tsx
              <Swatch mark={mark} fill={seriesPaint(s, chartId)} />
```

In `src/charts/ChartSvg.tsx`, `ChartPlot`. Before:

```tsx
interface ChartPlotProps {
  ariaLabel: string;
  cursor: ChartCursor;
  /** The slider's value text at each position: the tooltip's line. */
  valueText: (i: number) => string;
  /** Each position's x in px, which the pointer snaps to. */
  xs: readonly number[];
  height: number;
  children: React.ReactNode;
}

/** A chart's plot as one slider (useChartCursor), named by `ariaLabel`, holding the drawing and its tooltip. */
export function ChartPlot({ariaLabel, cursor, valueText, xs, height, children}: ChartPlotProps) {
  return (
    <div className="adm-chart-plot" aria-label={ariaLabel} {...cursor.plotProps(valueText, xs)} style={{position: 'relative', height}}>
```

After:

```tsx
type PlotProps = React.HTMLAttributes<HTMLElement>;

interface ChartPlotProps {
  ariaLabel: string;
  cursor: ChartCursor;
  /** The slider's value text at each position: the tooltip's line. */
  valueText: (i: number) => string;
  /** Each position's x in px, which the pointer snaps to. */
  xs: readonly number[];
  height: number;
  /**
   * Adjusts the slider's props before they are spread, for a plot whose
   * positions x alone doesn't place: ScatterChart swaps the x-only pointer for
   * the nearest dot, adds selection, and passes focus on only from the
   * keyboard, so focus from the keyboard shows the resting position and focus
   * from a press keeps what the press found. Default: the props as they are.
   */
  extend?: (props: PlotProps) => PlotProps;
  children: React.ReactNode;
}

/** A chart's plot as one slider (useChartCursor), named by `ariaLabel`, holding the drawing and its tooltip. */
export function ChartPlot({ariaLabel, cursor, valueText, xs, height, extend = (props) => props, children}: ChartPlotProps) {
  return (
    <div className="adm-chart-plot" aria-label={ariaLabel} {...extend(cursor.plotProps(valueText, xs))} style={{position: 'relative', height}}>
```

- [ ] **Step 4: Run them and see them pass**

Run: `pnpm vitest run src/charts/__tests__/LineChart.test.tsx src/charts/__tests__/lineLayout.test.ts src/charts/__tests__/ChartLegend.test.tsx`
Expected: PASS, `Tests 37 passed (37)` (LineChart 20, lineLayout 12, ChartLegend 5).

Run: `pnpm vitest run src/charts`
Expected: PASS, `Test Files 12 passed (12)`, `Tests 150 passed (150)`. BarChart's slider goes through `ChartPlot` with no `extend`, unchanged.

- [ ] **Step 5: Write the failing scatter tests**

Create `src/charts/__tests__/scatter.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {
  SCATTER_MAX_WIDTH,
  diagonalJitter,
  jitterOffset,
  nearestPoint,
  placeDots,
  scatterLayout,
  scatterOrder,
  scatterWidth,
  type ScatterPoint,
} from '../scatter';

// jsdom measures no width, so ScatterChart's own tests all run at
// SCATTER_MAX_WIDTH. These lay the plot out at the widths a card really has.

const KEYS = Array.from({length: 5000}, (_, i) => `${i}|${i + 1}`);
const SCORES = [0.5, 10.5] as const;

describe('scatterLayout', () => {
  it('lays a square plot inside the margins', () => {
    const layout = scatterLayout(440, SCORES, SCORES);
    expect([layout.left, layout.top, layout.side, layout.height]).toEqual([32, 24, 392, 456]);
    expect([layout.x(0.5), layout.x(10.5)]).toEqual([32, 424]);
    expect([layout.y(10.5), layout.y(0.5)]).toEqual([24, 416]);
  });

  it('widens the left margin for y tick labels that need more room, and shrinks the plot to fit', () => {
    // "10" is 12px, inside the 32px floor; "−1,000" is 36px, plus the 8px tick gap.
    expect(scatterLayout(440, SCORES, SCORES, ['1', '10']).left).toBe(32);
    const wide = scatterLayout(440, SCORES, SCORES, ['−1,000']);
    expect([wide.left, wide.side]).toEqual([44, 380]);
  });

  it('runs y = x across the overlap of the two domains, at −45° on equal domains', () => {
    const square = scatterLayout(440, SCORES, SCORES);
    expect(square.diagonal).toEqual({x1: 32, y1: 416, x2: 424, y2: 24, angle: -45});
    const overlap = scatterLayout(440, [0, 10], [5, 20]);
    expect([overlap.diagonal?.x1, overlap.diagonal?.x2]).toEqual([overlap.x(5), overlap.x(10)]);
    expect(scatterLayout(440, [0, 4], [5, 9]).diagonal).toBeNull();
  });
});

describe('scatterWidth', () => {
  it('follows the measured width up to SCATTER_MAX_WIDTH, and starts there before it is measured', () => {
    expect(scatterWidth(320)).toBe(320);
    expect(scatterWidth(900)).toBe(SCATTER_MAX_WIDTH);
    expect(scatterWidth(0)).toBe(SCATTER_MAX_WIDTH);
  });
});

describe('jitterOffset', () => {
  it('gives each key one fixed offset, within ±amount on each axis', () => {
    expect(jitterOffset('1|2', 0.25)).toEqual(jitterOffset('1|2', 0.25));
    expect(jitterOffset('1|2', 0.25)).not.toEqual(jitterOffset('1|3', 0.25));
    for (const key of KEYS) {
      for (const d of jitterOffset(key, 0.25)) expect(Math.abs(d)).toBeLessThanOrEqual(0.25);
    }
  });

  it('gives no offset for an amount of 0', () => {
    expect(jitterOffset('1|2', 0)).toEqual([0, 0]);
  });
});

describe('diagonalJitter', () => {
  it('moves y − x by at most `across`, and each axis by at most along + across / 2', () => {
    expect(diagonalJitter('1|2', 0.35, 0.07)).toEqual(diagonalJitter('1|2', 0.35, 0.07));
    for (const key of KEYS) {
      const [dx, dy] = diagonalJitter(key, 0.35, 0.07);
      expect(Math.abs(dy - dx)).toBeLessThanOrEqual(0.07 + 1e-12);
      expect(Math.abs(dx)).toBeLessThanOrEqual(0.385 + 1e-12);
      expect(Math.abs(dy)).toBeLessThanOrEqual(0.385 + 1e-12);
    }
  });
});

describe('placeDots', () => {
  const layout = scatterLayout(440, [0, 10], [0, 10]);
  const series = [
    {id: 'low', label: 'Low', color: ADMIN_COLORS.over},
    {id: 'high', label: 'High', color: ADMIN_COLORS.under},
  ];
  const points: ScatterPoint[] = [
    {key: 'a', x: 2, y: 6, series: 'high', label: 'A'},
    {key: 'b', x: 5, y: 5, series: 'gone', label: 'B'},
  ];

  it('places each point at its value in its series colour, in the order given, a stray series in the neutral', () => {
    const dots = placeDots(points, layout, {series, jitter: 0, jitterAlong: 'both'});
    expect(dots.map((d) => [d.point.key, d.color, d.px, d.py])).toEqual([
      ['a', ADMIN_COLORS.under, layout.x(2), layout.y(6)],
      ['b', ADMIN_COLORS.barNeutral, layout.x(5), layout.y(5)],
    ]);
  });

  it('adds each key its fixed jitter: square for both, along y = x for diagonal', () => {
    const [both] = placeDots(points, layout, {series, jitter: 0.25, jitterAlong: 'both'});
    const [dx, dy] = jitterOffset('a', 0.25);
    expect([both.px, both.py]).toEqual([layout.x(2 + dx), layout.y(6 + dy)]);
    const [along] = placeDots(points, layout, {series, jitter: 0.35, jitterAlong: 'diagonal'});
    const [ax, ay] = diagonalJitter('a', 0.35, 0.07);
    expect(along.px).toBeCloseTo(layout.x(2 + ax), 9);
    expect(along.py).toBeCloseTo(layout.y(6 + ay), 9);
  });
});

describe('nearestPoint', () => {
  const points = [
    {px: 100, py: 100},
    {px: 130, py: 100},
    {px: 100, py: 124},
  ];

  it('picks the closest point', () => {
    expect(nearestPoint(points, 126, 101, 24)).toBe(1);
  });

  it('keeps a point exactly at the radius and drops one just past it', () => {
    expect(nearestPoint([{px: 0, py: 0}], 24, 0, 24)).toBe(0);
    expect(nearestPoint([{px: 0, py: 0}], 24.01, 0, 24)).toBeNull();
  });

  it('gives null with nothing in range, and the first of two equally near points', () => {
    expect(nearestPoint(points, 300, 300, 24)).toBeNull();
    expect(nearestPoint(points, 100, 112, 24)).toBe(0);
  });
});

describe('scatterOrder', () => {
  it('sorts by x, then y, then key', () => {
    const order = scatterOrder([
      {key: 'b', x: 2, y: 1},
      {key: 'c', x: 1, y: 5},
      {key: 'a', x: 2, y: 1},
      {key: 'd', x: 1, y: 2},
    ]);
    expect(order.map((p) => p.key)).toEqual(['d', 'c', 'a', 'b']);
  });
});
```

Create `src/charts/__tests__/ScatterChart.test.tsx`. jsdom has no layout, so the chart lays out at `SCATTER_MAX_WIDTH`, and the plot's box starts at 0, 0, so a dot's px is its client position:

```tsx
import {describe, expect, it, vi} from 'vitest';
import {act, fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {ScatterChart, type ScatterPoint} from '../ScatterChart';
import {SCATTER_MAX_WIDTH, scatterLayout} from '../scatter';
import type {SeriesDef} from '../series';

const SERIES: SeriesDef[] = [
  {id: 'low', label: 'Low', color: ADMIN_COLORS.over},
  {id: 'high', label: 'High', color: ADMIN_COLORS.under},
];
const DOMAIN = [0, 10] as const;
const TICKS = [0, 5, 10];
const POINTS: ScatterPoint[] = [
  {key: 'c', x: 8, y: 2, series: 'low', label: 'C at 8, 2'},
  {key: 'a', x: 2, y: 6, series: 'high', label: 'A at 2, 6'},
  {key: 'b', x: 5, y: 5, series: 'high', label: 'B at 5, 5'},
];
// jsdom has no layout: the chart lays out at SCATTER_MAX_WIDTH, and the plot's box starts at 0, 0.
const layout = scatterLayout(SCATTER_MAX_WIDTH, DOMAIN, DOMAIN, TICKS.map(String));
const at = (point: ScatterPoint) => ({clientX: layout.x(point.x), clientY: layout.y(point.y)});

/** The chart with test defaults; any prop can be overridden. */
function Chart(props: Partial<React.ComponentProps<typeof ScatterChart>>) {
  return (
    <ScatterChart
      points={POINTS}
      series={SERIES}
      ariaLabel="Test scatter"
      xDomain={DOMAIN}
      yDomain={DOMAIN}
      xTicks={TICKS}
      yTicks={TICKS}
      xLabel="Across"
      yLabel="Up"
      tooltip={(point) => ({title: `Tip ${point.key}`, rows: []})}
      {...props}
    />
  );
}

const renderChart = (props: Partial<React.ComponentProps<typeof ScatterChart>> = {}) => render(<Chart {...props} />);
const slider = () => screen.getByRole('slider', {name: 'Test scatter'});
const tip = (container: HTMLElement) => container.querySelector('.adm-chart-tip');

describe('ScatterChart: marks', () => {
  it('draws one dot per point in its series colour, in the order given', () => {
    const {container} = renderChart();
    const dots = container.querySelectorAll('circle[data-key]');
    expect(Array.from(dots).map((d) => d.getAttribute('data-key'))).toEqual(['c', 'a', 'b']);
    expect(container.querySelector('circle[data-key="c"]')).toHaveAttribute('fill', ADMIN_COLORS.over);
    expect(container.querySelector('circle[data-key="a"]')).toHaveAttribute('fill', ADMIN_COLORS.under);
  });

  it('draws each r 4 dot on its own opaque r 6 disc in the page colour, with no stroke', () => {
    const {container} = renderChart();
    const dot = container.querySelector('circle[data-key="a"]');
    expect(dot).toHaveAttribute('r', '4');
    expect(dot).not.toHaveAttribute('stroke');
    expect(dot?.previousElementSibling).toHaveAttribute('fill', ADMIN_COLORS.page);
    expect(dot?.previousElementSibling).toHaveAttribute('r', '6');
  });

  it('labels both axes, the ticks and the y = x line, which runs along the diagonal', () => {
    const {container} = renderChart({diagonal: 'Equal'});
    expect(screen.getByText('Across')).toBeInTheDocument();
    expect(screen.getByText('Up')).toBeInTheDocument();
    expect(Array.from(container.querySelectorAll('[data-x-label]')).map((t) => t.textContent)).toEqual(['0', '5', '10']);
    expect(screen.getByText('Equal')).toHaveAttribute('transform', expect.stringMatching(/^rotate\(-45 /));
  });

  it('draws no y = x line without a label for it', () => {
    const {container} = renderChart();
    expect(container.querySelector('[data-diagonal]')).toBeNull();
  });

  it('keeps each dot where it was across renders, jitter included', () => {
    const {container, rerender} = renderChart({jitter: 0.25});
    const cx = container.querySelector('circle[data-key="a"]')?.getAttribute('cx');
    expect(cx).not.toBe(String(layout.x(2)));
    rerender(<Chart points={[...POINTS].reverse()} jitter={0.25} />);
    expect(container.querySelector('circle[data-key="a"]')).toHaveAttribute('cx', cx);
  });

  it('slides a dot along y = x with diagonal jitter, so its distance from the line barely moves', () => {
    const {container} = renderChart({jitter: 0.35, jitterAlong: 'diagonal'});
    const dot = container.querySelector('circle[data-key="b"]');
    const pxPerUnit = layout.side / 10;
    const dx = (Number(dot?.getAttribute('cx')) - layout.x(5)) / pxPerUnit;
    const dy = (layout.y(5) - Number(dot?.getAttribute('cy'))) / pxPerUnit;
    expect(dx).not.toBe(0);
    // px() rounds each coordinate to 0.01px, a few ten-thousandths of a unit here.
    expect(Math.abs(dy - dx)).toBeLessThanOrEqual(0.35 / 5 + 0.001);
  });

  it('shows the empty text in place of the plot when there are no points', () => {
    const {container} = renderChart({points: [], emptyText: 'No pairs yet.'});
    expect(screen.getByText('No pairs yet.')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });
});

describe('ScatterChart: pointer', () => {
  it('lifts the dot nearest the pointer, within 24px, and shows its tooltip', () => {
    const {container} = renderChart();
    const b = at(POINTS[2]);
    fireEvent.pointerMove(slider(), {clientX: b.clientX + 20, clientY: b.clientY});
    expect(screen.getByText('Tip b')).toBeInTheDocument();
    const lifted = container.querySelectorAll('[data-state="active"] circle');
    expect(Array.from(lifted).map((c) => [c.getAttribute('r'), c.getAttribute('fill')])).toEqual([
      ['8', ADMIN_COLORS.page],
      ['6', ADMIN_COLORS.under],
    ]);
    fireEvent.pointerMove(slider(), {clientX: b.clientX + 30, clientY: b.clientY - 30});
    expect(tip(container)).toBeNull();
    expect(container.querySelector('[data-state="active"]')).toBeNull();
  });

  it('lets go when a mouse leaves, and keeps a tapped dot when the finger lifts', () => {
    const {container} = renderChart();
    fireEvent.pointerMove(slider(), at(POINTS[1]));
    fireEvent.pointerLeave(slider());
    expect(tip(container)).toBeNull();
    fireEvent.pointerDown(slider(), {...at(POINTS[1]), pointerType: 'touch'});
    fireEvent.pointerLeave(slider(), {pointerType: 'touch'});
    expect(screen.getByText('Tip a')).toBeInTheDocument();
  });

  it('shows no tooltip when a press on empty space focuses the plot', async () => {
    // Focus from the keyboard shows the resting dot; focus from a press keeps what the press found.
    const {container} = renderChart();
    await userEvent.pointer({keys: '[MouseLeft]', target: slider(), coords: {clientX: 1, clientY: 1}});
    expect(slider()).toHaveFocus();
    expect(tip(container)).toBeNull();
  });

  it('selects the dot under a click, and nothing with no dot within 24px', () => {
    const onSelect = vi.fn();
    renderChart({onSelect});
    fireEvent.click(slider(), at(POINTS[0]));
    expect(onSelect).toHaveBeenLastCalledWith('c');
    fireEvent.click(slider(), {clientX: 1, clientY: 1});
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('rings the selected dot in the accent, just outside its lifted disc', () => {
    const {container} = renderChart({selectedKey: 'b'});
    const ring = container.querySelector('[data-state="selected"] circle');
    expect(ring).toHaveAttribute('stroke', ADMIN_COLORS.accent);
    expect(ring).toHaveAttribute('r', '9');
    expect(ring).toHaveAttribute('cx', String(layout.x(5)));
  });
});

describe('ScatterChart: keyboard', () => {
  it('is the kit plot: one named slider that walks the dots left to right and reads each one out', async () => {
    renderChart();
    expect(slider()).toHaveClass('adm-chart-plot');
    expect(slider()).toHaveAttribute('aria-valuemax', '2');
    act(() => slider().focus());
    await userEvent.keyboard('{Home}');
    expect(slider()).toHaveAttribute('aria-valuetext', 'A at 2, 6');
    await userEvent.keyboard('{ArrowRight}');
    expect(slider()).toHaveAttribute('aria-valuetext', 'B at 5, 5');
    await userEvent.keyboard('{End}');
    expect(slider()).toHaveAttribute('aria-valuetext', 'C at 8, 2');
  });

  it('says which dot is selected', async () => {
    renderChart({selectedKey: 'b'});
    act(() => slider().focus());
    await userEvent.keyboard('{Home}{ArrowRight}');
    expect(slider()).toHaveAttribute('aria-valuetext', 'B at 5, 5, selected');
  });

  it('selects the dot the slider announces with Enter or Space, before any arrow key and after Escape', async () => {
    const onSelect = vi.fn();
    const {container} = renderChart({onSelect});
    // Focus from the keyboard shows the resting dot, the newest: the one the slider announces.
    await userEvent.tab();
    expect(tip(container)).toHaveTextContent('Tip c');
    expect(slider()).toHaveAttribute('aria-valuetext', 'C at 8, 2');
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith('c');
    // Escape hides the tooltip and keeps the place (the kit's cursor): the slider still announces A, and Space takes it.
    await userEvent.keyboard('{Home}{Escape}');
    expect(tip(container)).toBeNull();
    expect(slider()).toHaveAttribute('aria-valuetext', 'A at 2, 6');
    await userEvent.keyboard(' ');
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenLastCalledWith('a');
  });
});
```

Run: `pnpm vitest run src/charts/__tests__/scatter.test.ts src/charts/__tests__/ScatterChart.test.tsx`
Expected: FAIL, `Test Files 2 failed (2)`, each with `Failed to resolve import "../scatter"` (or `"../ScatterChart"`) and `Does the file exist?`

- [ ] **Step 6: Write `src/charts/scatter.ts` and `src/charts/ScatterChart.tsx`**

`src/charts/scatter.ts`:

```ts
import {SPACING} from '../app-bridge';
import {ADMIN_COLORS} from '../theme/adminTheme';
import {TICK_GAP, labelWidth} from './axis';
import {linear} from './scale';
import {chartWidth, type SeriesDef} from './series';

/*
 * The scatter's geometry: the square plot, the per-key jitter, the dots'
 * places, the nearest-dot hit test and the keyboard order. Pure, so it can be
 * tested at any width (jsdom measures none). ScatterChart draws it.
 */

/** One point of a scatter. */
export interface ScatterPoint {
  /** Unique and stable: selection, React keys and the jitter seed use it. */
  key: string;
  x: number;
  y: number;
  /** The SeriesDef id whose colour the dot takes. */
  series: string;
  /** The point in words: the slider's value text when the keyboard is on it. */
  label: string;
}

/** The pointer only has to be the closest to a dot, within this many px of its centre: a 48px target (dataviz: a nearest-point layer). */
export const HIT_RADIUS = 24;

/**
 * Margins round the plot, in px: the y title above it, the x tick labels and
 * the x title below it, and the y tick labels left of it. `left` is a floor:
 * wider tick labels widen it, as they widen the other charts' gutters.
 */
export const SCATTER_MARGIN = {top: SPACING.xxl, right: SPACING.lg, bottom: SPACING.xxxl + SPACING.sm, left: SPACING.xxxl} as const;

/** The widest the chart grows. The plot is square, so past this it would only grow taller than its card. */
export const SCATTER_MAX_WIDTH = 440;

/** The width the scatter lays out at: the measured width (chartWidth's fallback until there is one), at most SCATTER_MAX_WIDTH. */
export function scatterWidth(measured: number): number {
  return Math.min(chartWidth(measured), SCATTER_MAX_WIDTH);
}

/** The y = x line where the two domains overlap, in px, and its angle in degrees (−45 on a square plot with equal domains). */
export interface DiagonalLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  angle: number;
}

export interface ScatterLayout {
  /** The whole chart, margins included, in px. */
  width: number;
  height: number;
  /** The square plot's left and top edges and its side. */
  left: number;
  top: number;
  side: number;
  /** Data value to px. */
  x: (v: number) => number;
  y: (v: number) => number;
  /** Null when the domains don't overlap. */
  diagonal: DiagonalLine | null;
}

/** y = x from where both domains start to where the first one ends, placed by the scales. */
function diagonalLine(
  x: (v: number) => number,
  y: (v: number) => number,
  xDomain: readonly [number, number],
  yDomain: readonly [number, number],
): DiagonalLine | null {
  const low = Math.max(xDomain[0], yDomain[0]);
  const high = Math.min(xDomain[1], yDomain[1]);
  if (low >= high) return null;
  const line = {x1: x(low), y1: y(low), x2: x(high), y2: y(high)};
  return {...line, angle: (Math.atan2(line.y2 - line.y1, line.x2 - line.x1) * 180) / Math.PI};
}

/**
 * A chart `width` px wide round a square plot, so equal domains draw y = x at
 * 45°. The left margin fits the widest of `yLabels` (the y tick labels) and
 * the tick gap, and never drops below SCATTER_MARGIN.left.
 */
export function scatterLayout(
  width: number,
  xDomain: readonly [number, number],
  yDomain: readonly [number, number],
  yLabels: readonly string[] = [],
): ScatterLayout {
  const {top, right, bottom} = SCATTER_MARGIN;
  const left = Math.max(SCATTER_MARGIN.left, Math.ceil(Math.max(0, ...yLabels.map(labelWidth))) + TICK_GAP);
  const side = Math.max(0, width - left - right);
  const x = linear([xDomain[0], xDomain[1]], [left, left + side]);
  const y = linear([yDomain[0], yDomain[1]], [top + side, top]);
  return {width, height: side + top + bottom, left, top, side, x, y, diagonal: diagonalLine(x, y, xDomain, yDomain)};
}

/** FNV-1a over the key, salted, as a number from 0 to 1. */
function unitHash(key: string, salt: number): number {
  let hash = 0x811c9dc5 ^ salt;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 0xffffffff;
}

/**
 * A fixed offset of up to ±amount on each axis, seeded by the key. Points that
 * share exact values spread into a small cloud, and each dot stays where it was
 * across renders and reloads.
 */
export function jitterOffset(key: string, amount: number): [number, number] {
  if (amount <= 0) return [0, 0];
  return [(unitHash(key, 1) * 2 - 1) * amount, (unitHash(key, 2) * 2 - 1) * amount];
}

/**
 * A fixed offset, seeded by the key, that runs mostly along y = x: up to ±along
 * on both axes together, plus up to ±across / 2 on each axis in opposite
 * directions. So y − x moves by at most `across`, and a point's distance from
 * the diagonal stays within `across` of its true value. Each axis moves by at
 * most along + across / 2.
 */
export function diagonalJitter(key: string, along: number, across: number): [number, number] {
  const [t, s] = jitterOffset(key, 1);
  return [t * along - (s * across) / 2, t * along + (s * across) / 2];
}

/** How a scatter spreads points that share exact values: on each axis apart, or mostly along y = x. */
export type JitterAlong = 'both' | 'diagonal';

/** jitterAlong="diagonal": the spread across y = x, as a share of the spread along it. */
const ACROSS_SHARE = 1 / 5;

/** A point placed on the plot: its colour and its centre in px, jitter included. */
export interface PlacedDot {
  point: ScatterPoint;
  color: string;
  px: number;
  py: number;
}

export interface DotOptions {
  /** Each point takes its series' colour; a point of an unknown series is neutral. */
  series: readonly SeriesDef[];
  /** The jitter's spread in data units (0 for none). */
  jitter: number;
  /** 'both': up to ±jitter on each axis on its own. 'diagonal': ±jitter along y = x and a fifth of that across it (diagonalJitter). */
  jitterAlong: JitterAlong;
}

/** Places each point at its value plus its fixed per-key jitter, in its series' colour, in the order given. */
export function placeDots(points: readonly ScatterPoint[], layout: ScatterLayout, opts: DotOptions): PlacedDot[] {
  const colorOf = new Map(opts.series.map((s) => [s.id, s.color]));
  return points.map((point) => {
    const [dx, dy] =
      opts.jitterAlong === 'diagonal'
        ? diagonalJitter(point.key, opts.jitter, opts.jitter * ACROSS_SHARE)
        : jitterOffset(point.key, opts.jitter);
    return {
      point,
      color: colorOf.get(point.series) ?? ADMIN_COLORS.barNeutral,
      px: layout.x(point.x + dx),
      py: layout.y(point.y + dy),
    };
  });
}

/** The index of the point nearest (x, y) within `radius` px, or null. The first of two equally near points wins. */
export function nearestPoint(
  points: ReadonlyArray<{px: number; py: number}>,
  x: number,
  y: number,
  radius: number,
): number | null {
  let best: number | null = null;
  let bestDistance = Infinity;
  points.forEach((point, i) => {
    const distance = Math.hypot(point.px - x, point.py - y);
    if (distance <= radius && distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  });
  return best;
}

/** Keyboard order: left to right, then bottom to top, then by key, so ← and → walk across the plot. */
export function scatterOrder<T extends {key: string; x: number; y: number}>(points: readonly T[]): T[] {
  return [...points].sort((a, b) => a.x - b.x || a.y - b.y || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}
```

`src/charts/ScatterChart.tsx`:

```tsx
import {useRef} from 'react';
import {SPACING, useContainerWidth} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';
import {fmtInt} from '../ui/format';
import {LABEL_SIZE, labelWidth, labelX, px, yAxis} from './axis';
import {AxisGrid, ChartPlot, ChartSvg, EmptyChart} from './ChartSvg';
import {ChartTooltip, type TooltipContent} from './ChartTooltip';
import {DOT_RADIUS, RING} from './lineLayout';
import {
  HIT_RADIUS,
  nearestPoint,
  placeDots,
  scatterLayout,
  scatterOrder,
  scatterWidth,
  type DiagonalLine,
  type JitterAlong,
  type PlacedDot,
  type ScatterLayout,
  type ScatterPoint,
} from './scatter';
import type {SeriesDef} from './series';
import {useChartCursor} from './useChartCursor';

export type {ScatterPoint} from './scatter';

export interface ScatterChartProps {
  /** Drawn in this order, so the last points sit on top. */
  points: readonly ScatterPoint[];
  series: readonly SeriesDef[];
  /** Names the plot's slider. */
  ariaLabel: string;
  xDomain: readonly [number, number];
  yDomain: readonly [number, number];
  xTicks: readonly number[];
  yTicks: readonly number[];
  xLabel: string;
  yLabel: string;
  /** Tick labels (default fmtInt, as the other charts' axes). */
  tickFormat?: (n: number) => string;
  /** Draws y = x where the domains overlap, with this label along its top end. */
  diagonal?: string;
  /** The per-key jitter's spread, in data units (default 0). */
  jitter?: number;
  /**
   * 'both' (default): up to ±jitter on each axis on its own. 'diagonal': up to
   * ±jitter along y = x and a fifth of that across it, so y − x moves by at
   * most jitter / 5 (diagonalJitter).
   */
  jitterAlong?: JitterAlong;
  tooltip: (point: ScatterPoint) => TooltipContent;
  selectedKey?: string | null;
  /** With it, a click on the nearest dot, or Enter or Space on the dot the slider announces, selects that dot's key. */
  onSelect?: (key: string) => void;
  /** Shown in place of the plot when there are no points (default "No data to chart."). */
  emptyText?: string;
}

type PlotProps = React.HTMLAttributes<HTMLElement>;

const WRAP: React.CSSProperties = {minWidth: 0};
const NUMERALS: React.CSSProperties = {fontVariantNumeric: 'tabular-nums'};
/** The dot under the cursor and the selected one lift by the ring's width (r 6 on an r 8 disc). */
const LIFT_RADIUS = DOT_RADIUS + RING;
/** The keys that select the dot the slider announces. */
const SELECT_KEYS = new Set(['Enter', ' ']);

/** The x axis: a 1px gridline up the plot at each tick (the zero line a step stronger, as AxisGrid draws y), its label below. */
function XGrid({ticks, layout, format}: {ticks: readonly number[]; layout: ScatterLayout; format: (n: number) => string}) {
  const bottom = layout.top + layout.side;
  return ticks.map((tick) => {
    const label = format(tick);
    const x = px(layout.x(tick));
    return (
      <g key={tick}>
        <line
          x1={x}
          x2={x}
          y1={layout.top}
          y2={bottom}
          stroke={tick === 0 ? ADMIN_COLORS.border : ADMIN_COLORS.divider}
          strokeWidth={1}
          shapeRendering="crispEdges"
        />
        <text
          data-x-label
          x={px(labelX(layout.x(tick), labelWidth(label), layout.width))}
          y={bottom + SPACING.lg}
          textAnchor="middle"
          fontSize={LABEL_SIZE}
          fill={ADMIN_COLORS.muted}
          style={NUMERALS}>
          {label}
        </text>
      </g>
    );
  });
}

/** The axis titles in muted text: y's above the plot at the left, x's under the tick labels at the right. */
function AxisTitles({layout, xLabel, yLabel}: {layout: ScatterLayout; xLabel: string; yLabel: string}) {
  return (
    <>
      <text x={0} y={SPACING.md} fontSize={ADMIN_TYPE.label} fill={ADMIN_COLORS.muted}>
        {yLabel}
      </text>
      <text
        x={layout.left + layout.side}
        y={layout.height - SPACING.xs}
        textAnchor="end"
        fontSize={ADMIN_TYPE.label}
        fill={ADMIN_COLORS.muted}>
        {xLabel}
      </text>
    </>
  );
}

/**
 * The y = x line, a solid hairline, with its label running along it just
 * inside the top end. The label sits a line's height above it, clear of the r 6
 * discs of the dots on the line (and their jitter across it, under 2px).
 */
function Diagonal({line, label}: {line: DiagonalLine; label: string}) {
  const radians = (line.angle * Math.PI) / 180;
  const end = {x: px(line.x2 - Math.cos(radians) * SPACING.sm), y: px(line.y2 - Math.sin(radians) * SPACING.sm)};
  return (
    <g data-diagonal>
      <line x1={px(line.x1)} y1={px(line.y1)} x2={px(line.x2)} y2={px(line.y2)} stroke={ADMIN_COLORS.dim} strokeWidth={1} />
      <text
        x={end.x}
        y={end.y}
        dy="-1em"
        textAnchor="end"
        transform={`rotate(${px(line.angle)} ${end.x} ${end.y})`}
        fontSize={LABEL_SIZE}
        fill={ADMIN_COLORS.muted}>
        {label}
      </text>
    </g>
  );
}

/**
 * Every dot, r 4, on its own opaque disc in the page colour 2px wider (R-23).
 * The disc is the dot's ring: no dot shows through another, and barNeutral's
 * alpha composites over the page alone, so a neutral dot is the validator's
 * colour whatever lies beneath it.
 */
function Dots({dots}: {dots: readonly PlacedDot[]}) {
  return dots.map((dot) => (
    <g key={dot.point.key}>
      <circle cx={px(dot.px)} cy={px(dot.py)} r={DOT_RADIUS + RING} fill={ADMIN_COLORS.page} />
      <circle data-key={dot.point.key} cx={px(dot.px)} cy={px(dot.py)} r={DOT_RADIUS} fill={dot.color} />
    </g>
  ));
}

/** A dot lifted to r 6 on an r 8 disc: the one under the cursor, or the selected one, which also wears a 2px accent ring just outside its disc. */
function LiftedDot({dot, state}: {dot: PlacedDot; state: 'active' | 'selected'}) {
  const cx = px(dot.px);
  const cy = px(dot.py);
  return (
    <g data-state={state}>
      {state === 'selected' && (
        <circle cx={cx} cy={cy} r={LIFT_RADIUS + RING + RING / 2} fill="none" stroke={ADMIN_COLORS.accent} strokeWidth={RING} />
      )}
      <circle cx={cx} cy={cy} r={LIFT_RADIUS + RING} fill={ADMIN_COLORS.page} />
      <circle cx={cx} cy={cy} r={LIFT_RADIUS} fill={dot.color} />
    </g>
  );
}

/** The selected dot, lifted and ringed, then the dot under the cursor, lifted, unless it is the selected one. */
function LiftedDots({selected, active}: {selected: PlacedDot | null; active: PlacedDot | null}) {
  const hovered = active?.point.key === selected?.point.key ? null : active;
  return (
    <>
      {selected && <LiftedDot dot={selected} state="selected" />}
      {hovered && <LiftedDot dot={hovered} state="active" />}
    </>
  );
}

/** The tooltip of the dot under the cursor, beside it; nothing without one. */
function DotTooltip({
  dot,
  tooltip,
  layout,
}: {
  dot: PlacedDot | null;
  tooltip: (point: ScatterPoint) => TooltipContent;
  layout: ScatterLayout;
}) {
  if (!dot) return null;
  return <ChartTooltip content={tooltip(dot.point)} x={dot.px} y={dot.py} bounds={{width: layout.width, height: layout.height}} />;
}

/**
 * The slider's value text: the point's label, and ", selected" on the selected
 * one, so the selection reaches assistive tech as the ring reaches the eye.
 */
function dotText(point: ScatterPoint, selectedKey: string | null): string {
  return point.key === selectedKey ? `${point.label}, selected` : point.label;
}

/** The walk index of the dot nearest the pointer, within HIT_RADIUS of its centre; null when none is. */
function dotUnder(walk: readonly PlacedDot[], event: React.MouseEvent<HTMLElement>): number | null {
  const box = event.currentTarget.getBoundingClientRect();
  return nearestPoint(walk, event.clientX - box.left, event.clientY - box.top, HIT_RADIUS);
}

/** The dot at the cursor's walk index, or null when the cursor is on none. */
function activeDot(walk: readonly PlacedDot[], index: number | null): PlacedDot | null {
  return index == null ? null : (walk[index] ?? null);
}

/**
 * The scatter's input over useChartCursor's slider (ChartPlot's `extend`). It
 * swaps the kit's x-only pointer, on move and on press, for the dot nearest the
 * pointer in two dimensions, and with onSelect adds a click on that dot and
 * Enter or Space on the dot the slider announces: its aria-valuenow, which is
 * the cursor's dot, or after Escape or once the pointer has left, the one the
 * slider rests on. Focus from the keyboard (:focus-visible, which also draws
 * the focus ring) shows the resting dot, as the kit's focus does; focus from a
 * press keeps what the press found, so a press on empty space shows no
 * tooltip. The kit's leave (a lifted finger keeps its dot), blur and other
 * keys stay as they are.
 */
function scatterInput(walk: readonly PlacedDot[], setIndex: (i: number | null) => void, onSelect?: (key: string) => void) {
  return (props: PlotProps): PlotProps => {
    const follow = (event: React.PointerEvent<HTMLElement>) => setIndex(dotUnder(walk, event));
    const announced = props['aria-valuenow'];
    const selectAnnounced = onSelect && announced != null ? () => onSelect(walk[announced].point.key) : null;
    return {
      ...props,
      onPointerMove: follow,
      onPointerDown: follow,
      onFocus: (event) => {
        if (event.currentTarget.matches(':focus-visible')) props.onFocus?.(event);
      },
      onClick: (event) => {
        const i = dotUnder(walk, event);
        if (onSelect && i != null) onSelect(walk[i].point.key);
      },
      onKeyDown: (event) => {
        if (selectAnnounced && SELECT_KEYS.has(event.key)) {
          event.preventDefault();
          selectAnnounced();
        } else {
          props.onKeyDown?.(event);
        }
      },
    };
  };
}

/**
 * Two measures per item on one square plot (docs/plans/R-redesign.md, Chart
 * kit), built on the kit's slider: the plot is one ChartPlot whose ← and →
 * walk the dots left to right, reading each dot's label, and the dot nearest
 * the pointer (within HIT_RADIUS) lifts and shows the tooltip. Dots are
 * opaque, each on its own page-coloured disc, so the ring keeps every edge
 * visible where dots overlap, and `jitter` spreads dots that share exact
 * values. The selected dot lifts too and wears an accent ring, and its value
 * text says ", selected". scatter.ts places everything; this draws it.
 *
 * The width follows the container (useContainerWidth) up to SCATTER_MAX_WIDTH.
 * Until it is measured, and always in jsdom, it lays out at that maximum.
 */
export function ScatterChart({
  points,
  series,
  ariaLabel,
  xDomain,
  yDomain,
  xTicks,
  yTicks,
  xLabel,
  yLabel,
  tickFormat = fmtInt,
  diagonal,
  jitter = 0,
  jitterAlong = 'both',
  tooltip,
  selectedKey = null,
  onSelect,
  emptyText,
}: ScatterChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measured = useContainerWidth(wrapRef);
  const cursor = useChartCursor(points.length);

  if (points.length === 0) {
    return (
      <div ref={wrapRef} style={WRAP}>
        <EmptyChart text={emptyText} />
      </div>
    );
  }

  // One tick at a time: map() would hand a formatter's optional second parameter (fmtScore's digits) the index.
  const layout = scatterLayout(scatterWidth(measured), xDomain, yDomain, yTicks.map((tick) => tickFormat(tick)));
  const placing = {series, jitter, jitterAlong};
  const drawn = placeDots(points, layout, placing);
  const walk = placeDots(scatterOrder(points), layout, placing);
  const active = activeDot(walk, cursor.index);
  const selected = drawn.find((dot) => dot.point.key === selectedKey) ?? null;
  return (
    <div ref={wrapRef} style={WRAP}>
      <div style={{width: layout.width, maxWidth: '100%', cursor: onSelect && active ? 'pointer' : undefined}}>
        <ChartPlot
          ariaLabel={ariaLabel}
          cursor={cursor}
          valueText={(i) => dotText(walk[i].point, selectedKey)}
          xs={walk.map((dot) => dot.px)}
          height={layout.height}
          extend={scatterInput(walk, cursor.setIndex, onSelect)}>
          <ChartSvg width={layout.width} height={layout.height}>
            <AxisGrid ticks={yAxis(yTicks, tickFormat, layout.y).ticks} left={layout.left} right={layout.left + layout.side} />
            <XGrid ticks={xTicks} layout={layout} format={tickFormat} />
            <AxisTitles layout={layout} xLabel={xLabel} yLabel={yLabel} />
            {diagonal && layout.diagonal ? <Diagonal line={layout.diagonal} label={diagonal} /> : null}
            <Dots dots={drawn} />
            <LiftedDots selected={selected} active={active} />
          </ChartSvg>
          <DotTooltip dot={active} tooltip={tooltip} layout={layout} />
        </ChartPlot>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Run them and see them pass**

Run: `pnpm vitest run src/charts/__tests__/scatter.test.ts src/charts/__tests__/ScatterChart.test.tsx`
Expected: PASS, `Tests 28 passed (28)` (scatter 13, ScatterChart 15).

Run: `pnpm vitest run src/charts`
Expected: PASS, `Test Files 14 passed (14)`, `Tests 178 passed (178)`.

- [ ] **Step 8: Add the stories to the kit's story file**

The stories go into `src/charts/Charts.stories.tsx`, the kit's one story file, under "Admin/Charts", on its admin-page decorator. Their data is deterministic arithmetic, never `Math.random`, so they hold still. The three stories:
- `ScatterDefault`: 30 points in two series, off the lattice, with no jitter.
- `ScatterDenseLattice`: 600 pairs on whole-number spots in the three gap sides, with `jitter={0.35}`, `jitterAlong="diagonal"` and the diagonal.
- `ScatterSelected`: the lattice with a pair selected and a click or Enter picking another.

The format import. Before:

```tsx
import {fmtDay, fmtGap, fmtInt} from '../ui/format';
```

After:

```tsx
import {fmtDay, fmtGap, fmtInt, fmtScore} from '../ui/format';
```

The kit imports. Before:

```tsx
import {addDays, eachDay, weekStart} from './scale';
import type {SeriesDef} from './series';
```

After:

```tsx
import {addDays, eachDay, weekStart} from './scale';
import {ScatterChart, type ScatterPoint} from './ScatterChart';
import type {SeriesDef} from './series';
```

The end of the file. Before:

```tsx
            ariaLabel="Votes per day"
            tooltip={bandTooltip(false)}
          />
        </ChartFrame>
      </Panel>
    </>
  ),
};
```

After:

```tsx
            ariaLabel="Votes per day"
            tooltip={bandTooltip(false)}
          />
        </ChartFrame>
      </Panel>
    </>
  ),
};

const SCORE_DOMAIN = [0.5, 10.5] as const;
const SCORE_TICKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
/** The calibration scatter's three sides of the agreement band (R2's GAP_SERIES). */
const SIDES: SeriesDef[] = [
  {id: 'over', label: 'Engine higher', color: ADMIN_COLORS.over},
  {id: 'agree', label: 'Within ±0.5', color: ADMIN_COLORS.barNeutral},
  {id: 'under', label: 'Community higher', color: ADMIN_COLORS.under},
];
const RULES: SeriesDef[] = [
  {id: 'ramp', label: 'Ramp', color: ADMIN_COLORS.accent},
  {id: 'locations', label: 'Locations', color: ADMIN_COLORS.under},
];

/** 30 points in two series, off the lattice and apart, so no jitter is needed. */
const SPREAD: ScatterPoint[] = Array.from({length: 30}, (_, i) => {
  const x = 1 + ((i * 37) % 90) / 10;
  const y = 1 + ((i * 59) % 90) / 10;
  return {
    key: String(i),
    x,
    y,
    series: i % 2 === 0 ? 'ramp' : 'locations',
    label: `Pair ${i + 1}: engine ${fmtScore(x)}, community ${fmtScore(y)}`,
  };
});

/** A gap's side: |gap| < 0.5 agrees (R2's gapSide). */
function sideOf(gap: number): string {
  if (Math.abs(gap) < 0.5) return 'agree';
  return gap < 0 ? 'over' : 'under';
}

/**
 * `count` pairs on whole-number scores, deterministic: engines 1 to 10, the
 * community within three points, every tenth pair an average half a point off
 * the lattice. So most spots hold a stack of dots. Narrowest gap first, so the
 * widest gaps draw on top (R-23).
 */
function latticePairs(count: number): ScatterPoint[] {
  const pairs = Array.from({length: count}, (_, i) => {
    const engine = 1 + ((i * 7) % 10);
    const average = i % 10 === 9;
    const community = Math.min(10, Math.max(1, engine + ((i * 13) % 7) - 3 + (average ? 0.5 : 0)));
    return {
      key: `${2 * i + 1}|${2 * i + 2}`,
      x: engine,
      y: community,
      series: sideOf(community - engine),
      label: `Pair ${i + 1}: engine ${fmtScore(engine, 0)}, community ${fmtScore(community, average ? 2 : 0)}, gap ${fmtGap(community - engine)}`,
    };
  });
  return pairs.sort((p, q) => Math.abs(p.y - p.x) - Math.abs(q.y - q.x));
}

const LATTICE = latticePairs(600);

interface ScatterCardProps {
  points: readonly ScatterPoint[];
  series: readonly SeriesDef[];
  subtitle: string;
  /** The lattice: the y = x line, and a jitter along it (R-23). */
  dense?: boolean;
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
}

/** A scatter in its frame, as R2's calibration scatter sits: the dot legend, the gap first in the tooltip, and the table view. */
function ScatterCard({points, series, subtitle, dense = false, selectedKey, onSelect}: ScatterCardProps) {
  const colorOf = new Map(series.map((s) => [s.id, s.color]));
  return (
    <Panel>
      <ChartFrame
        title="Engine vs community"
        subtitle={subtitle}
        legend={<ChartLegend series={series} mark="dot" />}
        table={{
          caption: `Every plotted pair (${fmtInt(points.length)})`,
          columns: ['Pair', 'Engine', 'Community', 'Gap'],
          rows: points.map((p) => [p.key, fmtScore(p.x, 2), fmtScore(p.y, 2), fmtGap(p.y - p.x)]),
        }}>
        <ScatterChart
          points={points}
          series={series}
          ariaLabel="Engine score against community score"
          xDomain={SCORE_DOMAIN}
          yDomain={SCORE_DOMAIN}
          xTicks={SCORE_TICKS}
          yTicks={SCORE_TICKS}
          xLabel="Engine score"
          yLabel="Community score"
          diagonal={dense ? 'Engine = community' : undefined}
          jitter={dense ? 0.35 : 0}
          jitterAlong="diagonal"
          tooltip={(p) => ({
            title: p.label.split(':')[0],
            rows: [
              {value: fmtGap(p.y - p.x), label: 'gap', color: colorOf.get(p.series)},
              {value: fmtScore(p.x, 2), label: 'engine'},
              {value: fmtScore(p.y, 2), label: 'community'},
            ],
          })}
          selectedKey={selectedKey}
          onSelect={onSelect}
        />
      </ChartFrame>
    </Panel>
  );
}

/** Two series off the lattice: the nearest-dot hover (within 24px), the keyboard walk and the dot legend. */
export const ScatterDefault: Story = {
  render: () => <ScatterCard points={SPREAD} series={RULES} subtitle="30 pairs in two series, no jitter" />,
};

/** 600 pairs on whole-number scores: each dot on its own page disc, slid along y = x so a stack reads as a short dash (R-23). */
export const ScatterDenseLattice: Story = {
  render: () => (
    <ScatterCard points={LATTICE} series={SIDES} subtitle="600 pairs on whole-number scores, jittered along the line" dense />
  ),
};

function SelectedDemo() {
  const [picked, setPicked] = useState<string | null>(LATTICE[LATTICE.length - 1].key);
  return (
    <ScatterCard
      points={LATTICE}
      series={SIDES}
      subtitle={`Selected: ${picked ?? 'none'}. Click a dot, or press Enter on the one the slider reads, to pick it.`}
      dense
      selectedKey={picked}
      onSelect={setPicked}
    />
  );
}

/** The dense lattice with a pair selected: lifted, with an accent ring outside its disc, and ", selected" in its value text. */
export const ScatterSelected: Story = {render: () => <SelectedDemo />};
```

Then `pnpm storybook` and open Admin/Charts. Check each of the three:
- the dots and their page discs;
- the diagonal's label running along the line, clear of the dots on it;
- the nearest-dot tooltip;
- the keyboard walk with the focus ring;
- the accent ring on the selected pair.

In `ScatterDenseLattice`, each stack should read as a short dash parallel to y = x.

- [ ] **Step 9: Lint and typecheck**

Run: `pnpm lint` and `pnpm typecheck`. Expected: both pass.

- [ ] **Step 10: Commit**, with the Bash tool and only after the owner approves:

```bash
git add src/charts/scatter.ts src/charts/ScatterChart.tsx src/charts/lineLayout.ts src/charts/LineChart.tsx src/charts/ChartLegend.tsx src/charts/ChartSvg.tsx src/charts/Charts.stories.tsx src/charts/__tests__/scatter.test.ts src/charts/__tests__/ScatterChart.test.tsx src/charts/__tests__/LineChart.test.tsx src/charts/__tests__/lineLayout.test.ts src/charts/__tests__/ChartLegend.test.tsx
USER_APPROVED=1 git commit -m "feat(charts): add the scatter chart (#24)"
```

**Commit:** `feat(charts): add the scatter chart (#24)`

<!--
Review of 2026-10-05, notes 1 to 5: all five checked against the repo and applied here. None rejected.

Note 1 is applied on this side only: R2-4a keeps its design, and note 8 now carries the disc question as the owner flag, naming the two tests a two-disc ring would touch. Its header half is outside this file. The re-based header.md still has the outline-era design and must follow this file before the plan is assembled:
- Contract additions 5 to 7: replace them with this file's block.
- Note 7: "ScatterChart renders through `ChartPlot`, which gains `extend` (2-D pointer, click, Enter/Space); `SurfaceRing` stays in `LineChart.tsx`."
- Note 8: keep R-23 as written: a page disc, with the neutral composited to `#63637d` (the colour series.ts's validator run used, adminTheme.ts's table too). Carry the page-or-page-plus-card question to the owner as the one open flag.
- The R-23 overlap bullets and the validator block: `#63637d` over the page, not `#65657f` over the card.
- The dataviz checklist bullet: "`ChartPlot`'s `adm-chart-plot` focus ring", not the app's global `:focus-visible`.
- The task-table row: "`ChartPlot`'s `extend`", not "`SurfaceRing` into `ChartSvg.tsx`".
The review cited header lines that have since moved, so these are named by content. In the current header.md they are lines 15 (note 7), 16 (note 8), 73 to 156 (contract additions 5 to 7), 361 to 362 (overlap), 387 to 393 (validator), 414 (checklist) and 480 (table).

Beyond the notes:
- The Enter/Space test now tabs in and checks the resting dot's tooltip. Without that, nothing pins the keyboard half of the focus rule. The test count is unchanged.
- The left margin formats the y ticks one at a time, so a formatter with an optional second parameter (fmtScore) never receives map's index.
-->
