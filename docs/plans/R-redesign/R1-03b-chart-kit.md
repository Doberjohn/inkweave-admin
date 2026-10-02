> Part of [R: Admin redesign](../R-redesign.md). Read its decisions, corrections to the spec, global constraints and shared interfaces first.

**Contract additions (R1-3b):** these add names and widen one type. Nothing in the contract is renamed.
- **Files.**
  - `RangeControl` lives in `src/charts/RangeControl.tsx`. A `.ts` file can't hold JSX, and `react-refresh/only-export-components` wants components in a file of their own.
  - `range.ts` keeps the type, the options and the math, and re-exports `RangeControl`, so `charts/range` serves the contract's whole block. R1-9 imports `RangeControl` from `'../../../charts/range'`. The two files import each other, which is harmless: the control reads `RANGE_OPTIONS` only when it renders.
  - The hatch is a small shared component, `src/charts/HatchPattern.tsx`, so the legend swatch and the bars draw the same stripes.
- **`src/charts/scale.ts`** also exports:
  - `isDay(day)`: whether a string is a real `YYYY-MM-DD` day
  - `dayIndex(day)`: whole UTC days since 1970, or null
  - `addDays(day, n)`
  - `daySpan(start, end)`: the day count with both ends included, 0 when reversed
  - `textWidth(text, fontSize)`: a 0.6em-a-character estimate, so labels are laid out before they are placed (jsdom has no layout)
- **`src/charts/range.ts`** also exports `DAILY_BUCKET_LIMIT = 90`.
- **`src/charts/series.ts`** also exports `CHART_FALLBACK_WIDTH` (640), `SURFACE_GAP` (`SPACING.xxs`), `HATCH`, `chartDomId(reactId)`, `hatchId(chartId, series)`, `seriesPaint(series, chartId)` and `tooltipText(content)`. It also holds the validator's record (R-15).
- **`src/charts/BarChart.tsx`** also exports `BAR_Y_AXIS_WIDTH`, which R1-8 asked for: the y-axis gutter left of the plot, 40px (`SPACING.xxxl + SPACING.sm`).
  - It is fixed, so a caller can count columns from its frame. A tick label over five characters widens it rather than clip.
  - The 8px right pad (`SPACING.sm`) comes off the plot too. So `n` bars share `width − BAR_Y_AXIS_WIDTH − 8` px, `(width − 48) / n` each.
- **`useChartCursor`** returns the exported interface `ChartCursor`, which is the contract's shape.
- **`ChartLegend`** returns `null` for fewer than two series (the contract's "rendered only for 2+ series").
- **`ChartFrame`:**
  - It also takes `titleLevel?: 2 | 3` (default 2, an `h3` inside a titled section) and `defaultView?: ChartView` (default `'chart'`).
  - It exports `type ChartView = 'chart' | 'table'` and takes `view?: ChartView` and `onViewChange?: (view: ChartView) => void`. This is the controlled view R3 asked this task to own, for its network's "and K more in the table". Without `view` the frame keeps its own state. When `view` switches from the chart to the table and focus has fallen to `<body>`, the frame focuses its `<table>`, which takes `tabIndex={-1}`. The code and its two tests are R3-6's "ChartFrame's controlled view", word for word, so R3-6 skips that block.
  - **It draws no surface.** It is the figure inside a card, so a page puts it in an untitled `Panel` (R1-3), as R1-8, R1-9, R1-10 and R2 do.
  - Its header row is the `<figcaption>`, the figure's first child. It holds the heading and the subtitle, then the actions and the toggle.
- **`BarChart` and `LineChart`** also take `emptyText?: string` (default "No data to chart."). `LineChart` also takes `baselineLabel?: string` (default `yFormat(baseline)`).
- **`LinePoint.y` is `number | null`.** A null keeps its x on the axis and breaks the line there, for a quiet week in R2's gap trend. A number is still the usual case, so no caller changes.
- **AdminStyles (R1-2) gains the chart classes:** `adm-chart-plot`, `adm-chart-hit`, `adm-chart-mark` (with `[data-active="true"]` and `[data-dim="true"]`), `adm-chart-bar`, `adm-chart-line`, `adm-chart-area`, `adm-chart-label`, `adm-chart-cursor` and `adm-chart-tip`, plus the keyframes `adm-chart-rise`, `adm-chart-draw` and `adm-chart-fade`. Step 19 has the table.
  - `adm-chart-hit` is deliberately not `adm-bar-btn`. That class's `:has()` rule dims the buttons beside a pressed one to .4, and that would fade a focused bar's ring while another bar is picked. The chart dims its SVG bars itself.
- **R1-2's theme test gains the emphasis bar.** `emphasisKey` paints a bar in `accent`, a fill the kit adds, so R1-2's 1.4.11 `chartMarks` check gains `'Emphasis bar (accent)'` (R1-8's request). Step 17 has the edit.
- **Behaviour later tasks may rely on:**
  - `tooltipText` reads each row value first: "Sep 30: 12 votes, 4 voters". Write row labels that read after a number. The same text is a bar's accessible name and the slider's value text.
  - useChartCursor:
    - Focus shows the newest position, or the tapped one when a tap brings the focus.
    - Escape hides the tooltip and keeps the place: `aria-valuenow` and `aria-valuetext` stay where they were, and the next arrow steps on from there.
    - Blur, and a mouse or pen leaving the plot, clear the cursor, and the slider rests on the newest position again.
    - A touch tap shows the tapped position and keeps it when the finger lifts: touch's `pointerleave` doesn't clear it.
  - BarChart:
    - `series[0]` sits on the baseline, and a missing or negative value counts as 0.
    - Count data gets whole-number ticks.
    - X labels count back from the newest bar and thin until they fit, so `xLabelEvery` is a floor, not a promise.
    - A printed x label needs `textWidth(label, ADMIN_TYPE.micro) + SPACING.sm` px of slot (44 for "Sep 28"), and sub-labels print only under printed x labels. So a sub-label under every column needs slots of 44px or more.
    - `capLabels="extremes"` drops the highest total when its label would collide with the last one.
    - `emphasisKey` applies only to a single series: that bar in `accent`, the rest in `barNeutral`.
  - LineChart:
    - Days are placed by time, so a missing day leaves a gap. Any other x keeps the order the series give it.
    - The y domain always includes 0 and the baseline.
    - End labels print unless two of them would collide.
    - The end dot is `circle[data-end]`: r 4 in the series colour, with no stroke, on two r 6 discs (the page, then the card) in one `<g>`. A crosshair marker is `circle[data-marker]`, drawn the same way, its `<g>` placed by `transform`.
    - The gutters are sized to the chart's own tick and end labels. So two LineCharts over the same x line up only when both pass R2-4a's `fixedGutters` (For R2, below).
  - Default plot heights: BarChart 160 (R1-9's), LineChart 180 (the handoff's trend card). The label bands come on top.
  - Both charts measure their own wrapper with the bridged `useContainerWidth` and lay out at 640px until it reports a width (always, in jsdom). The wrapper renders in every state, the empty one included, because the hook observes only the element that is there at mount.
  - The chart never builds its table. The page passes `ChartFrame` a `table` made from the same rows it charts.
- **For R1-8 (not a contract change).** R1-8's `COLUMN_MIN` of 32, with `SPACING.xs` of air, gives slots of about 36px, under the 44px a week label like "Sep 28" needs. So at the two-up card (a 338px frame: 8 weeks at 36.25px) every other week prints neither its date nor its gap. A date and a gap under every column need 44px slots:
  - `COLUMN_MIN` 40, so a slot with its air is 44px;
  - `weeksThatFit` handed the plot, which is the frame less `BAR_Y_AXIS_WIDTH` and the 8px right pad, not the frame less the gutter alone;
  - and a count of `Math.floor(plot / (COLUMN_MIN + SPACING.xs))`, since the `(width + SPACING.xs)` numerator can leave a slot up to 4px short.
  - The two-up card then shows 6 weeks at 48.3px.
- **For R2 (not a contract change).**
  - R2-4a adds `yDomain`, `fixedGutters`, `LINE_Y_AXIS_WIDTH` and `LINE_END_WIDTH` to `LineChart.tsx` (R2's contract addition 6), and `mark="dot"` to `ChartLegend` (addition 7), as quoted edits to this task's files. They land in R2-4a, not here, so the blocks it quotes stay exactly as this task writes them:
    - in `LineChart.tsx` (Step 27): the end of `LineChartProps` through `const DEFAULT_HEIGHT = 180;`, the last two prop defaults, the `top` and `bottom` lines, and the `left` and `right` lines;
    - in `LineChart.test.tsx` (Step 25): the `LineChart` import, and the end of `describe('LineChart: axis and baseline', …)`;
    - in `ChartLegend.tsx` (Step 10): the `mark` prop and the swatch `<rect>`; in `ChartLegend.test.tsx` (Step 7): the end of its last test.
  - `LineChart.test.tsx` holds 18 tests, not 16. R2-4a's Step 2 then reads `Tests 3 failed | 22 passed (25)`, and its Step 4 `Tests 25 passed (25)` (20 + 5).
  - Escape no longer moves the slider. R2-4a's reading "Escape and leaving the plot empty it. An empty cursor still reports its resting position (the newest)" now holds for leaving the plot and for blur. After Escape the slider keeps announcing the position it was on. So in R2-4a's ScatterChart test "selects the dot the slider announces, before any arrow key and after Escape", `{Home}{Escape}` leaves "A at 2, 6", and Space selects `'a'`.
- **For R3 (not a contract change).** R3-6's Community scores and Votes per week frames stand alone, because R3 read this frame as drawing its own card. It draws none, so each needs an untitled `Panel` round it, as R1-8, R1-9, R1-10 and R2 have. The network's frame sits inside the Engine view panel and needs nothing more.
- **Who uses it.**
  - R1-8: `ChartFrame` and a single-series `BarChart` with `emphasisKey`, `subLabel` and `BAR_Y_AXIS_WIDTH`.
  - R1-9: `ChartFrame`, a stacked selectable `BarChart`, `ChartLegend`, and `RangeControl` from `charts/range`.
  - R1-10: `ChartFrame` and a `LineChart` with `area`.
  - R2: the gap histogram (a BarChart) and the weekly gap trend (a LineChart with `baseline={0}`, plus R2-4a's `yDomain` and `fixedGutters`). The calibration scatter builds on `scale.ts`, `ChartTooltip`, `useChartCursor`, `ChartLegend` and `ChartFrame`.
  - R3: the synergy network diagram, on the same pieces, and the frame's controlled view.

### Task R1-3b: Chart kit

The hand-built chart kit every chart in R1 to R4 draws with (R-12): SVG on the admin theme, with no chart library. It runs after R1-3 and before R1-4. It needs R1-2's `ADMIN_*` tokens and `AdminStyles`, and R1-3's `SegmentedControl`, `format.ts` and (for the stories) `Panel`.

How the kit applies the `dataviz` skill:
- **Marks.**
  - Bars are at most 24px thick, with a 4px rounded data end (`RADIUS.sm`) on a square base.
  - Lines are 2px with round joins. End dots are r 4 with a 2px ring in the surface colour: two r 6 discs under the dot, the page and then the translucent card, so the ring matches the Panel behind it. Area washes sit at 10%.
  - A 2px surface gap separates stacked segments. Gridlines are solid 1px hairlines one step off the surface (`divider`, with the zero line in `border`).
  - No mark gets a border.
- **Labels.**
  - Labels are selective: a bar chart prints its newest and highest totals by default, a line chart its last values.
  - Axis ticks are clean numbers (`niceCeiling`, `axisTicks`) in tabular figures.
  - Every label is measured before it is placed (`textWidth`). X labels thin out rather than collide, and colliding end labels are dropped.
  - Text never wears a series colour: ticks, labels and the legend are `muted`, and values are `text`. The one exception is a semantic gap colour on a sub-label (`gapColor`), which is status text.
- **Legend.** `ChartLegend` shows for two or more series and never for one, since the title names it. Swatches mirror the mark: a rounded square for bars and areas, a short stroke for lines.
- **Hover layer, on by default.**
  - Line charts get a crosshair that snaps to the nearest x. Bar charts wash the column under the pointer and brighten its bar.
  - One styled tooltip lists every series at that x, value first.
  - Tooltips enhance and never gate. Every value is also in the slider's value text or the bar's name, and in the table view.
  - A touch tap shows the tapped point and keeps it when the finger lifts.
- **Keyboard.**
  - A chart without selection is one slider (`useChartCursor`): focus shows the newest point, ←/→ step, Home and End jump, and Escape hides the tooltip (WCAG 1.4.13) without moving the slider's value.
  - A chart with selection makes each bar a toggle button with a roving Tab stop.
- **Hit targets.** Over the whole plot the pointer snaps to the nearest position. A selectable bar's button is its whole slot at full height, never only the painted bar. Columns narrower than 24px miss WCAG 2.5.8, so a page with selectable bars also offers an equivalent control (R1-9's Pick a day select).
- **One y axis, always.** Two measures of different scale are two charts.
- **Motion.**
  - Bars rise from the baseline, lines draw in, and washes and labels fade in. The crosshair and the tooltip glide.
  - All of it runs on `EASING.smooth`, through transform and opacity only, so SVG animates the same in every browser.
  - `prefers-reduced-motion` switches all of it off.
- **Table view.** Every `ChartFrame` has a Chart | Table toggle. Table swaps the plot for a real `<table>` with a caption and scoped headers. The frame draws no surface of its own: a page puts it in an untitled `Panel`.
- **Filters.** `RangeControl` (R-9) goes first in a page's filter row, the one row above everything it scopes, never inside a chart card.
- **Type.** Chart text is the body face. R-14 keeps Tinos on the pages' headline numbers, which the kit doesn't draw.
- **Colour (R-15).** The kit takes its colours from its callers (`SeriesDef.color`). Step 9 records the validator's run on the score bands, the inks and the tiers, in `series.ts`.

**Files:**
- Create: `src/charts/scale.ts`, `src/charts/range.ts`, `src/charts/RangeControl.tsx`, `src/charts/series.ts`, `src/charts/HatchPattern.tsx`, `src/charts/ChartTooltip.tsx`, `src/charts/ChartLegend.tsx`, `src/charts/useChartCursor.ts`, `src/charts/ChartFrame.tsx`, `src/charts/BarChart.tsx`, `src/charts/LineChart.tsx`, `src/charts/Charts.stories.tsx`. Step 4 writes `range.ts`, and Step 11 adds its `RangeControl` re-export once the control exists.
- Modify: `src/theme/AdminStyles.tsx` (R1-2 Step 7). Two places: the `FAST` constant, and the end of the `CSS` template, from the disabled rule to the closing backtick.
- Modify: `src/theme/__tests__/AdminStyles.test.tsx` (R1-2 Step 5). Three places: the bridge import, the class lists, and new tests after the last one.
- Modify: `src/theme/__tests__/adminTheme.test.ts` (R1-2 Step 1). One place: the start of the `chartMarks` record.
- Test: `src/charts/__tests__/scale.test.ts`, `src/charts/__tests__/range.test.ts`, `src/charts/__tests__/ChartTooltip.test.tsx`, `src/charts/__tests__/ChartLegend.test.tsx`, `src/charts/__tests__/RangeControl.test.tsx`, `src/charts/__tests__/useChartCursor.test.tsx`, `src/charts/__tests__/ChartFrame.test.tsx`, `src/charts/__tests__/BarChart.test.tsx`, `src/charts/__tests__/LineChart.test.tsx`

**Interfaces:**
- **Consumes:**
  - From R1-2's `src/theme/adminTheme.ts`:
    - `ADMIN_COLORS`: `page`, `card`, `border`, `divider`, `strongBorder`, `navHover`, `rowHover`, `barNeutral`, `text`, `muted`, `accent`, `accentTintSoft`; the stories and tests also use `under` and `over`
    - `ADMIN_TYPE`: `micro`, `label`, `small`, `body`
    - `ADMIN_RADIUS`: `box` (the tooltip) and `control` (AdminStyles' chart rules)
  - From R1-2's `src/theme/__tests__/adminTheme.test.ts`: its `chartMarks` record, which Step 17 extends.
  - From R1-2's `src/theme/AdminStyles.tsx`: the file itself (this task adds the chart classes) and `adm-hover-row` (the table rows). Nothing here mounts `AdminStyles`. `AdminShell` does on the site, and `.storybook/preview.tsx` does for every story.
  - From R1-3: `SegmentedControl` (`src/ui/SegmentedControl.tsx`), `fmtInt`, `fmtDay` and `fmtGap` (`src/ui/format.ts`), and `Panel` (`src/ui/Panel.tsx`), the untitled card each story puts its frame in.
  - From `src/app-bridge.ts`, all already exported: `RADIUS`, `SPACING`, `LETTER_SPACING`, `EASING`, `FONTS` (stories), `blackRgba` and `useContainerWidth`. The pinned app's signature is `useContainerWidth(ref: RefObject<HTMLElement | null>): number`. It returns 0 until a `ResizeObserver` reports a width, and it observes only the element present at mount.
  - Existing: `src/tools/analytics/gapColor.ts` (stories only).
- **Produces:** everything in the plan's "Chart kit (R1-3b)" contract, plus the additions above.

If the engine hasn't been built in this checkout yet, run `pnpm build:engine` once first. The tests load `src/app-bridge.ts`, which imports app modules that need the built engine.

- [ ] **Step 1: Write the failing scale and range tests**

Create `src/charts/__tests__/scale.test.ts`:

```ts
import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  addDays,
  axisTicks,
  dayIndex,
  daySpan,
  eachDay,
  isDay,
  linear,
  nearestIndex,
  niceCeiling,
  textWidth,
  weekStart,
} from '../scale';

// The zone this run started in. Deleting TZ doesn't reset Node's zone cache, so
// the cleanup names this zone again before Vitest drops the stub (as format.test.ts does).
const HOST_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

describe('niceCeiling', () => {
  it.each([
    [37, 40],
    [402, 500],
    [1, 1],
    [7, 8],
    [9, 10],
    [10, 10],
    [11, 12],
    [13, 15],
    [1000, 1000],
    [1001, 1200],
    [0.37, 0.4],
    [0.3, 0.3],
  ])('tops %s at %s', (max, top) => {
    expect(niceCeiling(max)).toBe(top);
  });

  it.each([0, -5, NaN, Infinity])('gives 1 for %s, so an empty or all-zero chart still has an axis', (max) => {
    expect(niceCeiling(max)).toBe(1);
  });
});

describe('axisTicks', () => {
  it('spaces three ticks from 0 to the top by default', () => {
    expect(axisTicks(40)).toEqual([0, 20, 40]);
    expect(axisTicks(1)).toEqual([0, 0.5, 1]);
  });

  it('takes a count, and treats one below 2 as 2', () => {
    expect(axisTicks(500, 5)).toEqual([0, 125, 250, 375, 500]);
    expect(axisTicks(10, 2)).toEqual([0, 10]);
    expect(axisTicks(10, 1)).toEqual([0, 10]);
  });

  it('leaves no float noise in fractional ticks', () => {
    expect(axisTicks(0.3)).toEqual([0, 0.15, 0.3]);
  });

  it.each([0, -1, NaN])('gives a lone 0 for a top of %s', (ceiling) => {
    expect(axisTicks(ceiling)).toEqual([0]);
  });
});

describe('linear', () => {
  it('maps the domain onto the range, flipped for a y axis, and extrapolates', () => {
    const y = linear([0, 40], [216, 16]);
    expect(y(0)).toBe(216);
    expect(y(40)).toBe(16);
    expect(y(10)).toBe(166);
    expect(y(80)).toBe(-184);
  });

  it('puts every value in the middle of a zero-width domain (one point)', () => {
    const x = linear([3, 3], [0, 100]);
    expect(x(3)).toBe(50);
    expect(x(99)).toBe(50);
  });
});

describe('nearestIndex', () => {
  it('snaps to the nearest position, the earlier one on a tie', () => {
    const xs = [0, 10, 20];
    expect(nearestIndex(xs, 4)).toBe(0);
    expect(nearestIndex(xs, 6)).toBe(1);
    expect(nearestIndex(xs, 5)).toBe(0);
    expect(nearestIndex(xs, -50)).toBe(0);
    expect(nearestIndex(xs, 999)).toBe(2);
  });

  it('handles one position and none', () => {
    expect(nearestIndex([42], -1)).toBe(0);
    expect(nearestIndex([], 10)).toBe(-1);
  });
});

describe('calendar days', () => {
  it('lists every day across a month and a year boundary, both ends included', () => {
    expect(eachDay('2026-09-28', '2026-10-02')).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
    expect(eachDay('2026-12-30', '2027-01-02')).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
  });

  it('includes a leap day', () => {
    expect(eachDay('2024-02-28', '2024-03-01')).toEqual(['2024-02-28', '2024-02-29', '2024-03-01']);
    expect(eachDay('2026-02-28', '2026-03-01')).toEqual(['2026-02-28', '2026-03-01']);
  });

  it('gives one day for a one-day span and none for a reversed or broken one', () => {
    expect(eachDay('2026-09-30', '2026-09-30')).toEqual(['2026-09-30']);
    expect(eachDay('2026-10-01', '2026-09-30')).toEqual([]);
    expect(eachDay('2026-02-30', '2026-03-02')).toEqual([]);
    expect(eachDay('not a day', '2026-09-30')).toEqual([]);
  });

  it('counts days inclusively', () => {
    expect(daySpan('2026-09-30', '2026-09-30')).toBe(1);
    expect(daySpan('2026-09-01', '2026-09-30')).toBe(30);
    expect(daySpan('2025-10-01', '2026-09-30')).toBe(365);
    expect(daySpan('2026-10-01', '2026-09-30')).toBe(0);
    expect(daySpan('2026-9-1', '2026-09-30')).toBe(0);
  });

  it('moves a day by whole days across months, years and a leap day', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-09-30', -89)).toBe('2026-07-03');
    expect(addDays('garbage', 3)).toBe('garbage');
  });

  it('finds the UTC Monday of a week', () => {
    expect(weekStart('2026-09-28')).toBe('2026-09-28'); // a Monday
    expect(weekStart('2026-10-01')).toBe('2026-09-28'); // Thursday
    expect(weekStart('2026-10-04')).toBe('2026-09-28'); // Sunday closes the week
    expect(weekStart('2026-03-01')).toBe('2026-02-23'); // Sunday, back across a month
    expect(weekStart('2027-01-01')).toBe('2026-12-28'); // Friday, back across a year
    expect(weekStart('2026-02-31')).toBe('2026-02-31'); // not a day: unchanged
  });

  it('tells real days from look-alikes, and numbers them', () => {
    expect(isDay('2024-02-29')).toBe(true);
    expect(isDay('2026-02-29')).toBe(false);
    expect(isDay('2026-09-30T00:00:00Z')).toBe(false);
    expect(dayIndex('1970-01-02')).toBe(1);
    expect(dayIndex('2026-10-01')! - dayIndex('2026-09-30')!).toBe(1);
    expect(dayIndex('Sep 30')).toBeNull();
  });

  describe('in any time zone, across daylight-saving changes', () => {
    afterEach(() => {
      vi.stubEnv('TZ', HOST_ZONE);
      vi.unstubAllEnvs();
    });

    // Athens and New York change their clocks on these days in 2026 (Mar 29 and
    // Oct 25, Mar 8 and Nov 1). Kiritimati (UTC+14) has no DST, but local and UTC
    // dates differ there all afternoon. UTC day math must not notice any of it.
    it.each(['Europe/Athens', 'America/New_York', 'Pacific/Kiritimati'])('keeps whole days in %s', (zone) => {
      vi.stubEnv('TZ', zone);
      expect(eachDay('2026-03-28', '2026-03-30')).toEqual(['2026-03-28', '2026-03-29', '2026-03-30']);
      expect(eachDay('2026-03-07', '2026-03-09')).toEqual(['2026-03-07', '2026-03-08', '2026-03-09']);
      expect(daySpan('2026-10-24', '2026-11-02')).toBe(10);
      expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
      expect(addDays('2026-11-02', -2)).toBe('2026-10-31');
      expect(weekStart('2026-03-29')).toBe('2026-03-23');
      expect(weekStart('2026-11-01')).toBe('2026-10-26');
    });
  });
});

describe('textWidth', () => {
  it('estimates 0.6em a character', () => {
    expect(textWidth('Sep 30', 10)).toBe(36);
    expect(textWidth('', 10)).toBe(0);
  });
});
```

The time-zone block follows `format.test.ts` (R1-3): Vitest's default forks pool runs each file in its own process, where a `TZ` change takes effect.

Create `src/charts/__tests__/range.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {DAILY_BUCKET_LIMIT, RANGE_OPTIONS, bucketFor, rangeStartDay} from '../range';

describe('RANGE_OPTIONS', () => {
  it('offers the R-9 presets in order', () => {
    expect(RANGE_OPTIONS).toEqual([
      {value: '7d', label: '7 days'},
      {value: '30d', label: '30 days'},
      {value: '90d', label: '90 days'},
      {value: 'all', label: 'All'},
    ]);
  });
});

describe('rangeStartDay', () => {
  it('counts the window back from its end day, both days included', () => {
    expect(rangeStartDay('7d', '2026-09-30', '2026-01-01')).toBe('2026-09-24');
    expect(rangeStartDay('30d', '2026-09-30', '2026-01-01')).toBe('2026-09-01');
    expect(rangeStartDay('90d', '2026-09-30', '2026-01-01')).toBe('2026-07-03');
  });

  it('crosses month and year boundaries', () => {
    expect(rangeStartDay('7d', '2026-01-03', '2025-01-01')).toBe('2025-12-28');
    expect(rangeStartDay('30d', '2024-03-15', '2023-01-01')).toBe('2024-02-15');
  });

  it('never starts before the first day of data, and All starts there', () => {
    expect(rangeStartDay('30d', '2026-09-30', '2026-09-20')).toBe('2026-09-20');
    expect(rangeStartDay('all', '2026-09-30', '2026-03-02')).toBe('2026-03-02');
  });

  it('gives the one day of a one-day log', () => {
    expect(rangeStartDay('90d', '2026-09-30', '2026-09-30')).toBe('2026-09-30');
    expect(rangeStartDay('all', '2026-09-30', '2026-09-30')).toBe('2026-09-30');
  });

  it('falls back to the end day when the first day comes after it (no data yet)', () => {
    expect(rangeStartDay('all', '2026-09-30', '2026-10-05')).toBe('2026-09-30');
    expect(rangeStartDay('7d', '2026-09-30', '2026-10-05')).toBe('2026-09-30');
  });
});

describe('bucketFor', () => {
  it('charts up to 90 days per day and longer spans per week (R-9)', () => {
    expect(DAILY_BUCKET_LIMIT).toBe(90);
    expect(bucketFor('2026-09-30', '2026-09-30')).toBe('day');
    expect(bucketFor('2026-07-03', '2026-09-30')).toBe('day'); // 90 days
    expect(bucketFor('2026-07-02', '2026-09-30')).toBe('week'); // 91 days
    expect(bucketFor('2025-10-01', '2026-09-30')).toBe('week');
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm vitest run src/charts/__tests__/scale.test.ts src/charts/__tests__/range.test.ts`
Expected: FAIL. Both files fail to load, with `Failed to resolve import "../scale" from "src/charts/__tests__/scale.test.ts". Does the file exist?` and the same for `"../range"`, and `Test Files 2 failed (2)`.

- [ ] **Step 3: Write `src/charts/scale.ts`**

```ts
/**
 * Scale, layout and calendar math for the chart kit (docs/plans/R-redesign.md,
 * "Chart kit (R1-3b)"). Pure functions, with no React and no DOM.
 *
 * Days are 'YYYY-MM-DD' strings read as UTC calendar days, as src/ui/format.ts
 * reads them. Every step is a whole UTC day of 86,400,000 ms, so no result
 * moves with the viewer's time zone or a daylight-saving change.
 */

const DAY_MS = 86_400_000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The mantissas a clean axis top may use. From 10 up, half of each one is a
 * whole number too, so a 0 / middle / top axis reads cleanly.
 */
const NICE_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

/** Drops float noise: 3 * 0.1 is 0.30000000000000004. */
function clean(n: number): number {
  return Number(n.toPrecision(12));
}

/** A clean axis top at or above `max`: 37 -> 40, 402 -> 500, 11 -> 12. Zero, a negative or a non-number gives 1. */
export function niceCeiling(max: number): number {
  if (!Number.isFinite(max) || max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  for (const step of NICE_STEPS) {
    const top = clean(step * magnitude);
    if (top >= max) return top;
  }
  return clean(10 * magnitude);
}

/** `count` evenly spaced ticks from 0 to `ceiling`, both ends included: (40) -> [0, 20, 40]. A count below 2 counts as 2. */
export function axisTicks(ceiling: number, count = 3): number[] {
  if (!Number.isFinite(ceiling) || ceiling <= 0) return [0];
  const steps = Math.max(Math.floor(count), 2) - 1;
  return Array.from({length: steps + 1}, (_, i) => clean((ceiling * i) / steps));
}

/** A linear map from `domain` onto `range`, extrapolating past the ends. A zero-width domain maps every value to the middle of the range. */
export function linear(domain: [number, number], range: [number, number]): (v: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (d1 === d0) return () => (r0 + r1) / 2;
  const k = (r1 - r0) / (d1 - d0);
  return (v) => r0 + (v - d0) * k;
}

/** The index of the value in `xs` nearest to `x`, the earlier one on a tie. -1 for an empty list. `xs` needn't be sorted. */
export function nearestIndex(xs: readonly number[], x: number): number {
  let best = -1;
  let bestDistance = Infinity;
  xs.forEach((value, i) => {
    const distance = Math.abs(value - x);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  });
  return best;
}

function dayOf(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

/** The UTC midnight of a 'YYYY-MM-DD' day in ms, or null when it is not a real calendar day. */
function dayTime(day: string): number | null {
  if (!DAY_RE.test(day)) return null;
  const time = Date.parse(`${day}T00:00:00Z`);
  // Date.parse rolls 2026-02-30 over into March; the round trip rejects it.
  return Number.isNaN(time) || dayOf(time) !== day ? null : time;
}

/** Whether `day` is a real 'YYYY-MM-DD' calendar day. */
export function isDay(day: string): boolean {
  return dayTime(day) != null;
}

/** Whole UTC days since 1970-01-01, so a chart can place dates by time. Null when `day` isn't a day. */
export function dayIndex(day: string): number | null {
  const time = dayTime(day);
  return time == null ? null : Math.round(time / DAY_MS);
}

/** `day` moved by `n` whole days: ('2026-09-30', 1) -> '2026-10-01'. Anything that isn't a day comes back unchanged. */
export function addDays(day: string, n: number): string {
  const time = dayTime(day);
  return time == null ? day : dayOf(time + Math.round(n) * DAY_MS);
}

/** How many days run from `start` to `end`, both included: one day -> 1. 0 when end is before start or either isn't a day. */
export function daySpan(start: string, end: string): number {
  const a = dayTime(start);
  const b = dayTime(end);
  if (a == null || b == null || b < a) return 0;
  return Math.round((b - a) / DAY_MS) + 1;
}

/** Every day from `start` to `end`, both included. Empty when end is before start or either isn't a day. */
export function eachDay(start: string, end: string): string[] {
  const a = dayTime(start);
  if (a == null) return [];
  return Array.from({length: daySpan(start, end)}, (_, i) => dayOf(a + i * DAY_MS));
}

/** The UTC Monday of the week `day` falls in: the day itself on a Monday. Anything that isn't a day comes back unchanged. */
export function weekStart(day: string): string {
  const time = dayTime(day);
  if (time == null) return day;
  const sinceMonday = (new Date(time).getUTCDay() + 6) % 7;
  return dayOf(time - sinceMonday * DAY_MS);
}

/**
 * An estimate of `text`'s rendered width at `fontSize` px, for laying out chart
 * labels without measuring the DOM (jsdom has no layout). It errs wide, at
 * 0.6em a character, so a label it says fits does fit.
 */
export function textWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.6;
}
```

- [ ] **Step 4: Write `src/charts/range.ts`**

```ts
import {addDays, daySpan} from './scale';

/** The time windows a page offers (R-9). The range control leads the page's filter row. */
export type RangePreset = '7d' | '30d' | '90d' | 'all';

export const RANGE_OPTIONS: ReadonlyArray<{value: RangePreset; label: string}> = [
  {value: '7d', label: '7 days'},
  {value: '30d', label: '30 days'},
  {value: '90d', label: '90 days'},
  {value: 'all', label: 'All'},
];

/** The longest window charted per day. A longer one is charted per week (R-9). */
export const DAILY_BUCKET_LIMIT = 90;

const PRESET_DAYS: Record<Exclude<RangePreset, 'all'>, number> = {'7d': 7, '30d': 30, '90d': 90};

/**
 * The first day of the window that ends on `endDay`, both days included: '7d'
 * ending on Sep 30 starts on Sep 24. It is never before `firstDay`, the data's
 * first day, and 'all' starts there. A `firstDay` after `endDay` (no data yet)
 * gives `endDay`.
 */
export function rangeStartDay(preset: RangePreset, endDay: string, firstDay: string): string {
  const floor = firstDay < endDay ? firstDay : endDay;
  if (preset === 'all') return floor;
  const start = addDays(endDay, 1 - PRESET_DAYS[preset]);
  return start > floor ? start : floor;
}

/** 'week' when the window runs over 90 days (both ends included), else 'day' (R-9). */
export function bucketFor(startDay: string, endDay: string): 'day' | 'week' {
  return daySpan(startDay, endDay) > DAILY_BUCKET_LIMIT ? 'week' : 'day';
}
```

- [ ] **Step 5: Run the tests and see them pass**

Run: `pnpm vitest run src/charts/__tests__/scale.test.ts src/charts/__tests__/range.test.ts`
Expected: PASS, `Test Files 2 passed (2)` and `Tests 44 passed (44)` (37 + 7).

- [ ] **Step 6: Lint, then commit the chart math**

Run: `pnpm lint`
Expected: no problems.

Run with the Bash tool, and only after the owner approves:

```bash
git add src/charts/scale.ts src/charts/range.ts src/charts/__tests__/scale.test.ts src/charts/__tests__/range.test.ts
USER_APPROVED=1 git commit -m "feat(charts): add the chart kit's scale and range math (#24)"
```

- [ ] **Step 7: Write the failing tests for the shared pieces**

Create `src/charts/__tests__/ChartTooltip.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render} from '@testing-library/react';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {ChartTooltip, type TooltipContent} from '../ChartTooltip';
import {tooltipText} from '../series';

const CONTENT: TooltipContent = {
  title: 'Sep 30',
  rows: [
    {label: 'votes', value: '12', color: ADMIN_COLORS.under},
    {label: 'voters', value: '4'},
  ],
};
const BOUNDS = {width: 400, height: 200};

function tipOf(container: HTMLElement): HTMLElement {
  const tip = container.querySelector<HTMLElement>('.adm-chart-tip');
  expect(tip).not.toBeNull();
  return tip!;
}

describe('ChartTooltip', () => {
  it('renders nothing without content', () => {
    const {container} = render(<ChartTooltip content={null} x={10} y={10} bounds={BOUNDS} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('is visual only: hidden from assistive tech and from the pointer', () => {
    const {container} = render(<ChartTooltip content={CONTENT} x={10} y={10} bounds={BOUNDS} />);
    const tip = tipOf(container);
    expect(tip).toHaveAttribute('aria-hidden', 'true');
    expect(tip).toHaveStyle({pointerEvents: 'none'});
  });

  it('shows the title, then each value before its label, values in the strong text colour', () => {
    const {container, getByText} = render(<ChartTooltip content={CONTENT} x={10} y={10} bounds={BOUNDS} />);
    expect(tipOf(container)).toHaveTextContent(/^Sep 3012votes4voters$/);
    expect(getByText('12')).toHaveStyle({fontWeight: '700'});
    expect(getByText('votes')).toHaveStyle({color: ADMIN_COLORS.muted});
  });

  it('keys a coloured row with a short line in the series colour, never the text', () => {
    const {getByText} = render(<ChartTooltip content={CONTENT} x={10} y={10} bounds={BOUNDS} />);
    const value = getByText('12');
    expect(value.previousElementSibling).toHaveStyle({background: ADMIN_COLORS.under, height: '2px'});
    expect(value).not.toHaveStyle({color: ADMIN_COLORS.under});
  });

  it.each([
    [20, 20, 'below-right'],
    [380, 20, 'below-left'],
    [20, 180, 'above-right'],
    [380, 180, 'above-left'],
  ])('at (%s, %s) opens %s, towards the roomier side', (x, y, placement) => {
    const {container} = render(<ChartTooltip content={CONTENT} x={x} y={y} bounds={BOUNDS} />);
    expect(tipOf(container)).toHaveAttribute('data-placement', placement);
  });

  it('keeps its anchor inside the plot', () => {
    const {container} = render(<ChartTooltip content={CONTENT} x={999} y={-40} bounds={BOUNDS} />);
    const tip = tipOf(container);
    expect(tip.style.transform).toBe('translate(400px, 0px) translate(calc(-100% - 12px), 12px)');
    expect(tip).toHaveAttribute('data-placement', 'below-left');
  });

  it('reads as one line for accessible names, in the order it shows', () => {
    expect(tooltipText(CONTENT)).toBe('Sep 30: 12 votes, 4 voters');
    expect(tooltipText({title: 'Sep 29', rows: []})).toBe('Sep 29');
  });
});
```

Create `src/charts/__tests__/ChartLegend.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {ChartLegend} from '../ChartLegend';
import type {SeriesDef} from '../series';

const BANDS: SeriesDef[] = [
  {id: 'high', label: '7+', color: ADMIN_COLORS.under},
  {id: 'mid', label: '5–6', color: ADMIN_COLORS.barNeutral},
  {id: 'unscored', label: 'No score', color: ADMIN_COLORS.muted, pattern: 'hatch'},
];

describe('ChartLegend', () => {
  it('renders nothing for a single series: the title names it', () => {
    const {container} = render(<ChartLegend series={BANDS.slice(0, 1)} mark="rect" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists every series in order, labelled in the muted text colour', () => {
    render(<ChartLegend series={BANDS} mark="rect" />);
    const legend = screen.getByRole('list', {name: 'Legend'});
    expect(within(legend).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['7+', '5–6', 'No score']);
    expect(legend).toHaveStyle({color: ADMIN_COLORS.muted});
  });

  it('keys bars with a filled swatch and a hatched series with its pattern', () => {
    const {container} = render(<ChartLegend series={BANDS} mark="rect" />);
    const swatches = container.querySelectorAll('svg[aria-hidden="true"] > rect');
    expect(swatches[0]).toHaveAttribute('fill', ADMIN_COLORS.under);
    const pattern = container.querySelector('pattern');
    expect(pattern).not.toBeNull();
    expect(pattern!.querySelector('rect')).toHaveAttribute('fill', ADMIN_COLORS.muted);
    expect(swatches[2]).toHaveAttribute('fill', `url(#${pattern!.id})`);
  });

  it('keys lines with a short stroke', () => {
    const {container} = render(
      <ChartLegend
        series={[
          {id: 'searches', label: 'Searches', color: ADMIN_COLORS.accent},
          {id: 'views', label: 'Card views', color: ADMIN_COLORS.under},
        ]}
        mark="line"
      />,
    );
    const keys = container.querySelectorAll('line');
    expect(keys).toHaveLength(2);
    expect(keys[0]).toHaveAttribute('stroke', ADMIN_COLORS.accent);
    expect(keys[0]).toHaveAttribute('stroke-width', '2');
    expect(container.querySelector('rect')).toBeNull();
  });
});
```

Create `src/charts/__tests__/RangeControl.test.tsx`:

```tsx
import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {RangeControl as RangeControlFromRange, type RangePreset} from '../range';
import {RangeControl} from '../RangeControl';

function Harness({onChange}: {onChange: (v: RangePreset) => void}) {
  const [range, setRange] = useState<RangePreset>('30d');
  return (
    <RangeControl
      value={range}
      onChange={(v) => {
        setRange(v);
        onChange(v);
      }}
    />
  );
}

describe('RangeControl', () => {
  it('is a group named "Range" with the four presets, the current one pressed', () => {
    // charts/range serves it too, as the contract places it (R1-9 imports it there).
    expect(RangeControlFromRange).toBe(RangeControl);
    render(<Harness onChange={() => {}} />);
    const group = screen.getByRole('group', {name: 'Range'});
    expect(Array.from(group.querySelectorAll('button')).map((b) => b.textContent)).toEqual([
      '7 days',
      '30 days',
      '90 days',
      'All',
    ]);
    expect(screen.getByRole('button', {name: '30 days'})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', {name: '7 days'})).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports a new preset, and ignores the current one', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', {name: '30 days'}));
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', {name: '90 days'}));
    expect(onChange).toHaveBeenCalledExactlyOnceWith('90d');
    expect(screen.getByRole('button', {name: '90 days'})).toHaveAttribute('aria-pressed', 'true');
  });
});
```

Create `src/charts/__tests__/useChartCursor.test.tsx`. The harness spreads `plotProps` onto a div, the way the charts do, and prints the cursor in an `<output>` (role `status`):

```tsx
import {describe, expect, it, vi} from 'vitest';
import {act, fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useChartCursor} from '../useChartCursor';

const DAYS = ['Sep 27', 'Sep 28', 'Sep 29', 'Sep 30'];
/** Each position's x, in px from the plot's left edge. */
const XS = [10, 30, 50, 70];

function Harness({days = DAYS}: {days?: string[]}) {
  const cursor = useChartCursor(days.length);
  return (
    <>
      <div aria-label="Votes per day" {...cursor.plotProps((i) => `${days[i]}: ${i + 1} votes`, XS)} />
      <output>{cursor.index == null ? 'none' : days[cursor.index]}</output>
    </>
  );
}

/** jsdom has no layout: put the plot 100px from the viewport's left edge. */
function placePlot(plot: HTMLElement) {
  vi.spyOn(plot, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 0, 80, 40));
}

describe('useChartCursor', () => {
  it('makes the plot one named slider, resting on the newest position', () => {
    render(<Harness />);
    const slider = screen.getByRole('slider', {name: 'Votes per day'});
    expect(slider).toHaveAttribute('tabindex', '0');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '3');
    expect(slider).toHaveAttribute('aria-valuenow', '3');
    expect(slider).toHaveAttribute('aria-valuetext', 'Sep 30: 4 votes');
    expect(screen.getByRole('status')).toHaveTextContent('none');
  });

  it('shows the newest position on focus and walks it with the keyboard', async () => {
    render(<Harness />);
    await userEvent.tab();
    const slider = screen.getByRole('slider');
    expect(slider).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('Sep 30');

    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('status')).toHaveTextContent('Sep 28');
    expect(slider).toHaveAttribute('aria-valuetext', 'Sep 28: 2 votes');

    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('status')).toHaveTextContent('Sep 27');
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('status')).toHaveTextContent('Sep 27');

    await userEvent.keyboard('{End}{ArrowRight}');
    expect(screen.getByRole('status')).toHaveTextContent('Sep 30');
    await userEvent.keyboard('{ArrowDown}{ArrowUp}{ArrowDown}');
    expect(screen.getByRole('status')).toHaveTextContent('Sep 29');
  });

  it('hides the tooltip on Escape without moving focus, and on blur', async () => {
    render(<Harness />);
    await userEvent.tab();
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('status')).toHaveTextContent('none');
    expect(screen.getByRole('slider')).toHaveFocus();

    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('status')).toHaveTextContent('Sep 29');
    await userEvent.tab();
    expect(screen.getByRole('status')).toHaveTextContent('none');
  });

  it('keeps its place through Escape, so the value does not jump and the next step goes on from it', async () => {
    render(<Harness />);
    await userEvent.tab();
    await userEvent.keyboard('{Home}{ArrowRight}{Escape}');
    const slider = screen.getByRole('slider');
    expect(screen.getByRole('status')).toHaveTextContent('none');
    expect(slider).toHaveAttribute('aria-valuenow', '1');
    expect(slider).toHaveAttribute('aria-valuetext', 'Sep 28: 2 votes');
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('status')).toHaveTextContent('Sep 29');
  });

  it('snaps the pointer to the nearest position and lets go when it leaves', () => {
    render(<Harness />);
    const slider = screen.getByRole('slider');
    placePlot(slider);

    fireEvent.pointerMove(slider, {clientX: 100 + 38});
    expect(screen.getByRole('status')).toHaveTextContent('Sep 28');
    fireEvent.pointerMove(slider, {clientX: 100 + 61});
    expect(screen.getByRole('status')).toHaveTextContent('Sep 30');
    fireEvent.pointerMove(slider, {clientX: 0});
    expect(screen.getByRole('status')).toHaveTextContent('Sep 27');
    fireEvent.pointerLeave(slider);
    expect(screen.getByRole('status')).toHaveTextContent('none');
  });

  it('shows the touched position on a tap', () => {
    render(<Harness />);
    const slider = screen.getByRole('slider');
    placePlot(slider);
    fireEvent.pointerDown(slider, {clientX: 100 + 49});
    expect(screen.getByRole('status')).toHaveTextContent('Sep 29');
  });

  it('keeps a tapped position when the finger lifts and focus follows', () => {
    render(<Harness />);
    const slider = screen.getByRole('slider');
    placePlot(slider);
    // A tap fires down, up and then leave, and only then focus.
    fireEvent.pointerDown(slider, {clientX: 100 + 31, pointerType: 'touch'});
    fireEvent.pointerUp(slider, {clientX: 100 + 31, pointerType: 'touch'});
    fireEvent.pointerLeave(slider, {pointerType: 'touch'});
    expect(screen.getByRole('status')).toHaveTextContent('Sep 28');
    act(() => slider.focus());
    expect(screen.getByRole('status')).toHaveTextContent('Sep 28');
  });

  it('pulls a held cursor back into range when the data shrinks', async () => {
    const {rerender} = render(<Harness />);
    await userEvent.tab();
    expect(screen.getByRole('status')).toHaveTextContent('Sep 30');
    act(() => rerender(<Harness days={['Sep 29', 'Sep 30']} />));
    expect(screen.getByRole('status')).toHaveTextContent('Sep 30');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemax', '1');
  });
});
```

jsdom 30 has `PointerEvent` and `DOMRect`, so `fireEvent.pointerMove(el, {clientX})` reaches React's `onPointerMove` with its `clientX`. It has no layout, so the tests stub the plot's `getBoundingClientRect`.

- [ ] **Step 8: Run them and see them fail**

Run: `pnpm vitest run src/charts/__tests__/ChartTooltip.test.tsx src/charts/__tests__/ChartLegend.test.tsx src/charts/__tests__/RangeControl.test.tsx src/charts/__tests__/useChartCursor.test.tsx`
Expected: FAIL, `Test Files 4 failed (4)`. Each file fails to load on its first missing module: `"../ChartTooltip"`, `"../ChartLegend"`, `"../RangeControl"` and `"../useChartCursor"`.

- [ ] **Step 9: Write `src/charts/series.ts`**

The validator's record (R-15) goes at the top of this file. The run, from the `dataviz` skill's directory:

```bash
node scripts/validate_palette.js "#4ade80,#63637d,#ef4444,#90a1b9" --mode dark --surface "#12121a"   # bands
node scripts/validate_palette.js "#f59e0b,#8b5cf6,#10b981,#ef4444,#3b82f6,#6b7280" --mode dark --surface "#12121a"   # inks
node scripts/validate_palette.js "#fbbf24,#6ee7a0,#60b5f5,#f59090" --mode dark --surface "#12121a"   # tiers
node scripts/validate_palette.js "#ffb900,#63637d" --mode dark --surface "#12121a"   # emphasis
```

Each run exits 1, and only on the lightness band or chroma check. Every run passes CVD separation, the normal-vision floor and contrast. `#12121a` is `ADMIN_COLORS.card` over the page, the surface every chart sits on, and `#63637d` is `barNeutral` over the page. The hexes appear only in this command and in a comment, never in source strings, so the token rules hold.

```ts
import {SPACING} from '../app-bridge';
import type {TooltipContent} from './ChartTooltip';

// Palette validation (R-15). The dataviz skill's validator, run 2026-10-01 in
// dark mode on the card surface (ADMIN_COLORS.card over the page, #12121a):
//   node validate_palette.js "<hexes>" --mode dark --surface "#12121a"
// Its dark lightness band is OKLCH L .48 to .67 and its chroma floor C .10.
//
// Score bands: under, barNeutral (#63637d on the page), over, and muted for the
// No score hatch.
//   PASS  CVD separation, worst adjacent over/barNeutral, ΔE 10.3 (protan)
//   PASS  normal vision, worst adjacent muted/over, ΔE 24.4
//   PASS  contrast, all four 3:1 or more
//   FAIL  lightness band: under L .80, muted .70
//   FAIL  chroma: barNeutral .041, muted .040
// Inks: INK_COLORS[ink].border in ALL_INKS order.
//   PASS  CVD separation, worst adjacent Emerald/Ruby, ΔE 8.1 (deutan)
//   PASS  normal vision, worst adjacent Sapphire/Steel, ΔE 18.0
//   PASS  contrast, all six 3:1 or more
//   FAIL  lightness band: Amber L .77, Emerald .70
//   FAIL  chroma: Steel .023
// Tiers: TIER_COLORS[tier].color, perfect to weak.
//   PASS  CVD separation, worst adjacent perfect/strong, ΔE 11.3 (deutan)
//   PASS  normal vision, same pair, ΔE 18.3
//   PASS  contrast and chroma, all four
//   FAIL  lightness band: all four, L .75 to .84
// Emphasis: accent and barNeutral.
//   PASS  CVD ΔE 34.5, normal vision ΔE 38.2, contrast
//   FAIL  lightness band: accent L .83; chroma: barNeutral, the de-emphasis grey by design
//
// Every failure is an app entity colour R-15 keeps. Each use pairs it with a
// second cue (a label, the legend, an ink icon, the hatch, the table view), and
// no chart text wears a series colour.

/**
 * One series of a chart. Its colour paints marks only: values, labels and the
 * legend stay in text colours (dataviz: text never wears the series colour).
 */
export interface SeriesDef {
  id: string;
  label: string;
  color: string;
  /** 'hatch': 45° stripes of `color` with the surface between them, for "No score", which must never read as a band. */
  pattern?: 'hatch';
}

/** A chart's width before it is measured: the first frame, and always in jsdom, which has no ResizeObserver. */
export const CHART_FALLBACK_WIDTH = 640;

/** The 2px surface gap between touching fills: stacked segments and adjacent bars (dataviz mark spec). */
export const SURFACE_GAP = SPACING.xxs;

/** The hatch: 2px stripes every 4px, turned 45°. */
export const HATCH = {stripe: SPACING.xxs, period: SPACING.xs, angle: 45} as const;

/** Keeps an id to letters, digits, `_` and `-`, so it is safe inside url(#…). */
function safeId(raw: string): string {
  return raw.replace(/[^A-Za-z0-9_-]/g, '');
}

/** A chart's own DOM id prefix, from its useId(). */
export function chartDomId(reactId: string): string {
  return `chart${safeId(reactId)}`;
}

/** The id of a series' hatch pattern inside one chart. */
export function hatchId(chartId: string, series: SeriesDef): string {
  return `${chartId}-hatch-${safeId(series.id)}`;
}

/** What a mark of this series is painted with: its colour, or its hatch pattern. */
export function seriesPaint(series: SeriesDef, chartId: string): string {
  return series.pattern === 'hatch' ? `url(#${hatchId(chartId, series)})` : series.color;
}

/**
 * A tooltip's content as one line of text, in the order the tooltip shows it:
 * "Sep 30: 12 votes, 4 voters". It is a bar's accessible name and the value
 * text of a chart's slider, so keyboard and screen-reader users get exactly
 * what hover shows.
 */
export function tooltipText(content: TooltipContent): string {
  const rows = content.rows.map((row) => `${row.value} ${row.label}`).join(', ');
  return rows ? `${content.title}: ${rows}` : content.title;
}
```

`series.ts` imports only a type from `ChartTooltip.tsx`, and `ChartTooltip.tsx` imports nothing from it, so there is no runtime cycle.

- [ ] **Step 10: Write the hatch, the tooltip and the legend**

`src/charts/HatchPattern.tsx`:

```tsx
import {HATCH} from './series';

/**
 * The 45° hatch as an SVG <pattern>, for a <defs> block: stripes of `color`
 * with the surface showing between them. The legend swatch and the bars draw
 * the same one, so they match.
 */
export function HatchPattern({id, color}: {id: string; color: string}) {
  return (
    <pattern
      id={id}
      width={HATCH.period}
      height={HATCH.period}
      patternUnits="userSpaceOnUse"
      patternTransform={`rotate(${HATCH.angle})`}>
      <rect width={HATCH.stripe} height={HATCH.period} fill={color} />
    </pattern>
  );
}
```

`src/charts/ChartTooltip.tsx`. Its fill is laid over the page colour, R1-2's recipe for a surface that must hide what is under it:

```tsx
import {Fragment} from 'react';
import {RADIUS, SPACING, blackRgba} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../theme/adminTheme';

/** One line of a tooltip. The value leads and the label follows it, so write labels that read after a number ("votes"). */
export interface TooltipRow {
  label: string;
  value: string;
  /** The series colour, drawn as a short line key before the value. Text never takes it. */
  color?: string;
}

export interface TooltipContent {
  title: string;
  rows: TooltipRow[];
}

/** Gap between the point and the tooltip, in px. */
const OFFSET = SPACING.md;
/** The narrowest the tooltip gets before it wraps, in px. */
const MIN_WIDTH = 140;
const KEY_WIDTH = SPACING.md;
const KEY_HEIGHT = SPACING.xxs;
/** The tooltip floats over marks, so its fill is laid over the page colour and hides what is under it (R1-2). */
const FILL = `linear-gradient(${ADMIN_COLORS.navHover}, ${ADMIN_COLORS.navHover}), ${ADMIN_COLORS.page}`;

interface ChartTooltipProps {
  content: TooltipContent | null;
  /** The point it describes, in px from the plot's top left corner. */
  x: number;
  y: number;
  /** The plot's size. The tooltip opens towards the roomier side, so it stays inside. */
  bounds: {width: number; height: number};
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

/**
 * The one styled tooltip every chart shares. It sits beside its point, to the
 * right in the plot's left half and to the left in the right half, below the
 * point in the top half and above it in the bottom half, so it never leaves
 * the plot. It is visual only (aria-hidden) and ignores the pointer: every
 * mark or cursor position carries the same text as its accessible name
 * (tooltipText in series.ts). Values lead in the strong text colour and labels
 * follow in muted, each keyed by a short line in the series colour (dataviz).
 */
export function ChartTooltip({content, x, y, bounds}: ChartTooltipProps) {
  if (!content) return null;
  const px = clamp(x, 0, bounds.width);
  const py = clamp(y, 0, bounds.height);
  const toRight = px <= bounds.width / 2;
  const below = py < bounds.height / 2;
  const dx = toRight ? `${OFFSET}px` : `calc(-100% - ${OFFSET}px)`;
  const dy = below ? `${OFFSET}px` : `calc(-100% - ${OFFSET}px)`;
  const keyed = content.rows.some((row) => row.color);
  return (
    <div
      aria-hidden="true"
      className="adm-chart-tip"
      data-placement={`${below ? 'below' : 'above'}-${toRight ? 'right' : 'left'}`}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        zIndex: 1,
        transform: `translate(${px}px, ${py}px) translate(${dx}, ${dy})`,
        width: 'max-content',
        maxWidth: Math.max(bounds.width / 2 - OFFSET, MIN_WIDTH),
        boxSizing: 'border-box',
        padding: `${SPACING.sm}px ${SPACING.md}px`,
        background: FILL,
        border: `1px solid ${ADMIN_COLORS.strongBorder}`,
        borderRadius: ADMIN_RADIUS.box,
        boxShadow: `0 6px 18px ${blackRgba(0.4)}`,
        pointerEvents: 'none',
        fontSize: ADMIN_TYPE.small,
        lineHeight: 1.4,
        color: ADMIN_COLORS.text,
      }}>
      <div style={{fontWeight: 600}}>{content.title}</div>
      {content.rows.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: keyed ? 'auto auto minmax(0, 1fr)' : 'auto minmax(0, 1fr)',
            alignItems: 'center',
            columnGap: SPACING.sm,
            rowGap: SPACING.xxs,
            marginTop: SPACING.xs,
          }}>
          {content.rows.map((row, i) => (
            <Fragment key={`${row.label}-${i}`}>
              {keyed && (
                <span
                  style={{
                    width: KEY_WIDTH,
                    height: KEY_HEIGHT,
                    borderRadius: RADIUS.xs,
                    background: row.color ?? 'transparent',
                  }}
                />
              )}
              <span style={{fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>{row.value}</span>
              <span style={{color: ADMIN_COLORS.muted}}>{row.label}</span>
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
```

`src/charts/ChartLegend.tsx`:

```tsx
import {useId} from 'react';
import {RADIUS, SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';
import {HatchPattern} from './HatchPattern';
import {chartDomId, hatchId, seriesPaint, type SeriesDef} from './series';

/** A bar or area swatch, in px. */
const SWATCH = SPACING.md - SPACING.xxs;
/** A line key's length, in px. */
const LINE_KEY = SPACING.lg;

interface ChartLegendProps {
  series: readonly SeriesDef[];
  /** 'rect' for bars and areas, 'line' for lines: the swatch mirrors the mark. */
  mark: 'rect' | 'line';
}

/**
 * The legend of a chart with two or more series: a swatch and a label per
 * series, in series order. The swatch carries the colour (or the hatch); the
 * label stays in the muted text colour, never the series colour. A chart of
 * one series needs no legend, since its title names it, so this renders
 * nothing then (dataviz, "Labels & legend").
 */
export function ChartLegend({series, mark}: ChartLegendProps) {
  const chartId = chartDomId(useId());
  if (series.length < 2) return null;
  return (
    <ul
      aria-label="Legend"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: `${SPACING.xs}px ${SPACING.lg}px`,
        margin: 0,
        padding: 0,
        listStyle: 'none',
        fontSize: ADMIN_TYPE.label,
        color: ADMIN_COLORS.muted,
      }}>
      {series.map((s) => (
        <li key={s.id} style={{display: 'inline-flex', alignItems: 'center', gap: SPACING.xs}}>
          {mark === 'line' ? (
            <svg aria-hidden="true" width={LINE_KEY} height={SWATCH} style={{display: 'block', flex: 'none'}}>
              <line
                x1={1}
                x2={LINE_KEY - 1}
                y1={SWATCH / 2}
                y2={SWATCH / 2}
                stroke={s.color}
                strokeWidth={2}
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg aria-hidden="true" width={SWATCH} height={SWATCH} style={{display: 'block', flex: 'none'}}>
              {s.pattern === 'hatch' && (
                <defs>
                  <HatchPattern id={hatchId(chartId, s)} color={s.color} />
                </defs>
              )}
              <rect width={SWATCH} height={SWATCH} rx={RADIUS.xs} fill={seriesPaint(s, chartId)} />
            </svg>
          )}
          {s.label}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 11: Write the range control and the cursor hook**

`src/charts/RangeControl.tsx`:

```tsx
import {SegmentedControl} from '../ui/SegmentedControl';
import {RANGE_OPTIONS, type RangePreset} from './range';

interface RangeControlProps {
  value: RangePreset;
  onChange: (v: RangePreset) => void;
}

/**
 * The time-range presets (7 days, 30 days, 90 days, All) as a segmented
 * control named "Range". It goes first in a page's filter row, the one row
 * above everything it scopes (R-9; dataviz: the date range comes before every
 * other filter). Pressing the current preset does nothing (SegmentedControl).
 */
export function RangeControl({value, onChange}: RangeControlProps) {
  return <SegmentedControl ariaLabel="Range" options={RANGE_OPTIONS} value={value} onChange={onChange} />;
}
```

Then `src/charts/range.ts` (Step 4) re-exports the control, so `charts/range` serves the contract's whole block, and R1-9 imports `RangeControl` from there. The end of the file. Before:

```ts
/** 'week' when the window runs over 90 days (both ends included), else 'day' (R-9). */
export function bucketFor(startDay: string, endDay: string): 'day' | 'week' {
  return daySpan(startDay, endDay) > DAILY_BUCKET_LIMIT ? 'week' : 'day';
}
```

After:

```ts
/** 'week' when the window runs over 90 days (both ends included), else 'day' (R-9). */
export function bucketFor(startDay: string, endDay: string): 'day' | 'week' {
  return daySpan(startDay, endDay) > DAILY_BUCKET_LIMIT ? 'week' : 'day';
}

// The control is a component, so it lives in RangeControl.tsx; re-exported so `charts/range` serves the contract's whole block (R1-9 imports it from here).
export {RangeControl} from './RangeControl';
```

The two modules now import each other. That is harmless: `RangeControl` reads `RANGE_OPTIONS` only when it renders, after both have loaded. The re-export waits for this step because Step 5's tests load `range.ts`, and `./RangeControl` can't resolve before it exists.

`src/charts/useChartCursor.ts`. `role` comes inside the spread, so jsx-a11y doesn't see a slider without its value attributes, and the hook always supplies them. Two details:
- **Escape keeps the place.** It only hides the tooltip (`hidden`), so `aria-valuenow` and `aria-valuetext` don't jump, nothing new is announced, and the next arrow steps on from the same position.
- **A tap keeps its position.** A touch fires pointerdown, pointerup and then pointerleave as the finger lifts, and only then focus. Clearing on that leave would let focus swap the tapped position for the newest, so a touch leave is ignored.

```ts
import {useState} from 'react';
import {nearestIndex} from './scale';

export interface ChartCursor {
  /** The position the tooltip and crosshair show, or null for none (also after Escape, which keeps the slider's value). */
  index: number | null;
  setIndex: (i: number | null) => void;
  /** Props to spread onto the plot element. Name the plot with its own aria-label. */
  plotProps: (valueText: (i: number) => string, xs: readonly number[]) => React.HTMLAttributes<HTMLElement>;
}

/**
 * The cursor over a chart's `n` positions (days, weeks, bars): which one the
 * tooltip and crosshair show, from the pointer or the keyboard.
 *
 * plotProps makes the plot one slider (the WAI-ARIA slider pattern). Its value
 * is the position and its value text is the line the tooltip shows, so
 * keyboard and screen-reader users get what hover gives (dataviz: tooltips
 * enhance, never gate). Focus shows the newest position; ←/→ (and ↓/↑) step,
 * Home and End jump, and Escape hides the tooltip without moving focus or the
 * slider's value (WCAG 1.4.13), so nothing is announced and the next step goes
 * on from there. The pointer snaps to the nearest of `xs`, each position's x in
 * px from the plot's left edge, so nobody has to land on a 2px line. A touch
 * drag scrubs (AdminStyles' adm-chart-plot only lets the page pan vertically),
 * and a tap keeps its position when the finger lifts.
 */
export function useChartCursor(n: number): ChartCursor {
  const [held, setHeld] = useState<number | null>(null);
  // Escape hides the tooltip but keeps the place, so the slider's value doesn't jump.
  const [hidden, setHidden] = useState(false);
  const last = n - 1;
  const clampIndex = (i: number) => Math.min(Math.max(i, 0), last);
  // New data can shrink n under a held cursor; it snaps back into range.
  const position = held == null || n === 0 ? null : clampIndex(held);
  const index = hidden ? null : position;
  const setIndex = (i: number | null) => {
    setHidden(false);
    setHeld(i == null || n === 0 ? null : clampIndex(i));
  };

  function plotProps(valueText: (i: number) => string, xs: readonly number[]): React.HTMLAttributes<HTMLElement> {
    const resting = position ?? Math.max(last, 0);
    const follow = (event: React.PointerEvent<HTMLElement>) =>
      setIndex(nearestIndex(xs, event.clientX - event.currentTarget.getBoundingClientRect().left));
    return {
      role: 'slider',
      tabIndex: n > 0 ? 0 : -1,
      'aria-valuemin': 0,
      'aria-valuemax': Math.max(last, 0),
      'aria-valuenow': resting,
      'aria-valuetext': n > 0 ? valueText(resting) : undefined,
      onFocus: () => setIndex(resting),
      onBlur: () => setIndex(null),
      onKeyDown: (event) => {
        switch (event.key) {
          case 'ArrowRight':
          case 'ArrowUp':
            setIndex(resting + 1);
            break;
          case 'ArrowLeft':
          case 'ArrowDown':
            setIndex(resting - 1);
            break;
          case 'Home':
            setIndex(0);
            break;
          case 'End':
            setIndex(last);
            break;
          case 'Escape':
            setHidden(true);
            break;
          default:
            return;
        }
        event.preventDefault();
      },
      onPointerMove: follow,
      onPointerDown: follow,
      // A lifted finger fires pointerleave too (touch has no hover), and then focus
      // lands: clearing here would swap the tapped position for the newest.
      onPointerLeave: (event) => {
        if (event.pointerType !== 'touch') setIndex(null);
      },
    };
  }

  return {index, setIndex, plotProps};
}
```

- [ ] **Step 12: Run the tests and see them pass**

Run: `pnpm vitest run src/charts/__tests__/ChartTooltip.test.tsx src/charts/__tests__/ChartLegend.test.tsx src/charts/__tests__/RangeControl.test.tsx src/charts/__tests__/useChartCursor.test.tsx`
Expected: PASS, `Test Files 4 passed (4)` and `Tests 24 passed (24)` (10 + 4 + 2 + 8).

- [ ] **Step 13: Write the failing ChartFrame test**

Create `src/charts/__tests__/ChartFrame.test.tsx`:

```tsx
import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ChartFrame, type ChartTable, type ChartView} from '../ChartFrame';

const TABLE: ChartTable = {
  caption: 'Votes per day, Sep 29 – Sep 30',
  columns: ['Day', 'Votes', 'Voters'],
  rows: [
    ['Sep 29', '0', '0'],
    ['Sep 30', '12', '4'],
  ],
};

function renderFrame(extra: Partial<React.ComponentProps<typeof ChartFrame>> = {}) {
  render(
    <ChartFrame
      title="Votes per day"
      subtitle="Last 30 days"
      legend={<ul aria-label="Legend" />}
      actions={<a href="/activity">Open activity</a>}
      table={TABLE}
      {...extra}>
      <div data-testid="plot" />
    </ChartFrame>,
  );
}

describe('ChartFrame', () => {
  it('is a figure named by its h2 title, with the subtitle, actions, legend and chart', () => {
    renderFrame();
    const figure = screen.getByRole('figure', {name: 'Votes per day'});
    // The header row is the figcaption, the figure's first child, and it holds the heading.
    expect(figure.firstElementChild?.tagName).toBe('FIGCAPTION');
    expect(figure.firstElementChild).toContainElement(within(figure).getByRole('heading', {level: 2, name: 'Votes per day'}));
    // No surface of its own: the page's untitled Panel is the card.
    expect(figure.style.backgroundColor).toBe('');
    expect(figure.style.borderStyle).toBe('');
    expect(within(figure).getByText('Last 30 days')).toBeInTheDocument();
    expect(within(figure).getByRole('link', {name: 'Open activity'})).toBeInTheDocument();
    expect(within(figure).getByRole('list', {name: 'Legend'})).toBeInTheDocument();
    expect(within(figure).getByTestId('plot')).toBeInTheDocument();
  });

  it('takes an h3 inside a titled section', () => {
    renderFrame({titleLevel: 3});
    expect(screen.getByRole('heading', {level: 3, name: 'Votes per day'})).toBeInTheDocument();
  });

  it('opens on the chart, with a Chart | Table toggle named for the chart', () => {
    renderFrame();
    const toggle = screen.getByRole('group', {name: 'Show Votes per day as'});
    expect(within(toggle).getByRole('button', {name: 'Chart'})).toHaveAttribute('aria-pressed', 'true');
    expect(within(toggle).getByRole('button', {name: 'Table'})).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('swaps the chart and legend for a real table, and back', async () => {
    renderFrame();
    await userEvent.click(screen.getByRole('button', {name: 'Table'}));

    const table = screen.getByRole('table', {name: 'Votes per day, Sep 29 – Sep 30'});
    const headers = within(table).getAllByRole('columnheader');
    expect(headers.map((th) => th.textContent)).toEqual(['Day', 'Votes', 'Voters']);
    for (const th of headers) expect(th).toHaveAttribute('scope', 'col');
    const rowHeaders = within(table).getAllByRole('rowheader');
    expect(rowHeaders.map((th) => th.textContent)).toEqual(['Sep 29', 'Sep 30']);
    for (const th of rowHeaders) expect(th).toHaveAttribute('scope', 'row');
    expect(within(table).getAllByRole('cell').map((td) => td.textContent)).toEqual(['0', '0', '12', '4']);
    expect(screen.queryByTestId('plot')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', {name: 'Legend'})).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', {name: 'Chart'}));
    expect(screen.getByTestId('plot')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('can open on the table', () => {
    renderFrame({defaultView: 'table'});
    expect(screen.getByRole('table', {name: 'Votes per day, Sep 29 – Sep 30'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Table'})).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the view its parent passes, and reports the toggle', async () => {
    const onViewChange = vi.fn();
    renderFrame({view: 'table', onViewChange});
    // Opening on the table takes no focus: only a switch from the chart does.
    expect(screen.getByRole('table', {name: 'Votes per day, Sep 29 – Sep 30'})).not.toHaveFocus();
    await userEvent.click(screen.getByRole('button', {name: 'Chart'}));
    expect(onViewChange).toHaveBeenCalledWith('chart');
  });

  it('hands focus to the table when a control inside the chart opens it', async () => {
    function Controlled() {
      const [view, setView] = useState<ChartView>('chart');
      return (
        <ChartFrame title="Votes per day" table={TABLE} view={view} onViewChange={setView}>
          <button type="button" onClick={() => setView('table')}>
            Show all
          </button>
        </ChartFrame>
      );
    }
    render(<Controlled />);
    await userEvent.click(screen.getByRole('button', {name: 'Show all'}));
    expect(screen.getByRole('table', {name: 'Votes per day, Sep 29 – Sep 30'})).toHaveFocus();
  });
});
```

- [ ] **Step 14: Run it and see it fail**

Run: `pnpm vitest run src/charts/__tests__/ChartFrame.test.tsx`
Expected: FAIL, with `Failed to resolve import "../ChartFrame" from "src/charts/__tests__/ChartFrame.test.tsx". Does the file exist?`

- [ ] **Step 15: Write `src/charts/ChartFrame.tsx`**

How the frame is built:
- **Name.** The figure is named by its heading through `aria-labelledby`, so the subtitle doesn't join the name.
- **No surface.** The frame is the figure inside a card. A page puts it in an untitled `Panel` (R1-3), which brings the fill, border, radius and padding, so there is never a card inside a card.
- **Header.** The header row is the `<figcaption>` itself, the figure's first child, since a figcaption must be a figure's first or last child. It holds the heading and the subtitle, then the actions and the toggle. R1-8 relies on the heading sitting inside it, and R1-12's census reads its first line as the title.
- **Toggle.** It is R1-3's `SegmentedControl`, named "Show {title} as" so two charts on a page don't share a group name.
- **Controlled view.** A parent may pass `view` and `onViewChange`: R3's network opens its table from a control inside the chart. Without `view` the frame keeps its own. That control unmounts with the chart, so focus falls to `<body>`, and on that switch the frame focuses its `<table>` (`tabIndex={-1}`). It takes no focus on mount, and its own toggle keeps focus. This is R3-6's code, word for word.
- **Table.** The cells can wrap rather than scroll: a focusable scroll region would need a `tabIndex` of 0, which jsx-a11y rejects on a non-interactive element, and chart tables are a few narrow columns.

```tsx
import {useEffect, useId, useRef, useState} from 'react';
import {LETTER_SPACING, SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';
import {SegmentedControl} from '../ui/SegmentedControl';

/** The chart's data as a table: the WCAG-clean twin of every chart. The first column heads each row. */
export interface ChartTable {
  caption: string;
  columns: readonly string[];
  rows: ReadonlyArray<readonly string[]>;
}

/** The frame's two views. A parent that controls the view passes one as `view`. */
export type ChartView = 'chart' | 'table';

const VIEWS: ReadonlyArray<{value: ChartView; label: string}> = [
  {value: 'chart', label: 'Chart'},
  {value: 'table', label: 'Table'},
];

const CELL: React.CSSProperties = {
  padding: `${SPACING.sm}px ${SPACING.md}px`,
  borderTop: `1px solid ${ADMIN_COLORS.divider}`,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
};

const HEAD_CELL: React.CSSProperties = {
  padding: `${SPACING.sm}px ${SPACING.md}px`,
  textAlign: 'right',
  fontSize: ADMIN_TYPE.label,
  fontWeight: 700,
  letterSpacing: LETTER_SPACING.cap,
  textTransform: 'uppercase',
  color: ADMIN_COLORS.muted,
};

/** The table view: a caption, column headers and a row header per row. It takes focus when a control in the chart opens it. */
function DataTable({table, tableRef}: {table: ChartTable; tableRef: React.Ref<HTMLTableElement>}) {
  return (
    <table
      ref={tableRef}
      tabIndex={-1}
      style={{width: '100%', borderCollapse: 'collapse', fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.text}}>
      <caption
        style={{
          captionSide: 'top',
          textAlign: 'left',
          paddingBottom: SPACING.sm,
          fontSize: ADMIN_TYPE.label,
          color: ADMIN_COLORS.muted,
        }}>
        {table.caption}
      </caption>
      <thead>
        <tr>
          {table.columns.map((column, i) => (
            <th key={column} scope="col" style={{...HEAD_CELL, textAlign: i === 0 ? 'left' : 'right'}}>
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row, r) => (
          <tr key={`${row[0]}-${r}`} className="adm-hover-row">
            {row.map((cell, i) =>
              i === 0 ? (
                <th key={i} scope="row" style={{...CELL, textAlign: 'left', fontWeight: 500}}>
                  {cell}
                </th>
              ) : (
                <td key={i} style={CELL}>
                  {cell}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface ChartFrameProps {
  /** The figure's heading, which also names it. */
  title: string;
  subtitle?: React.ReactNode;
  /** A <ChartLegend />, shown above the plot in the chart view. */
  legend?: React.ReactNode;
  /** Controls for this chart alone, before the Chart | Table toggle. Page-wide filters belong in the filter row. */
  actions?: React.ReactNode;
  table: ChartTable;
  children: React.ReactNode;
  /** The heading level: 2 (default) on a page body, 3 inside a titled section. */
  titleLevel?: 2 | 3;
  /** Which view it opens in (default the chart). */
  defaultView?: ChartView;
  /** The view, when the parent controls it (the network's "and K more in the table"). Without it the frame keeps its own. */
  view?: ChartView;
  /** Called with the view the toggle picks. A controlled frame shows it once the parent passes it back as `view`. */
  onViewChange?: (view: ChartView) => void;
}

/**
 * The figure every chart sits in: a <figure> named by its title, with an
 * optional subtitle, legend and actions, and a Chart | Table toggle. The table
 * view is the chart's accessible twin (dataviz: every chart has one), so a
 * value the tooltip shows is always reachable without hovering. It draws no
 * surface; put it in an untitled Panel (R1-3), which is the card.
 */
export function ChartFrame({
  title,
  subtitle,
  legend,
  actions,
  table,
  children,
  titleLevel = 2,
  defaultView = 'chart',
  view: controlledView,
  onViewChange,
}: ChartFrameProps) {
  const [ownView, setOwnView] = useState<ChartView>(defaultView);
  const view = controlledView ?? ownView;
  const setView = (next: ChartView) => {
    setOwnView(next);
    onViewChange?.(next);
  };
  const tableRef = useRef<HTMLTableElement>(null);
  const lastView = useRef(view);
  // A control inside the chart that opens the table unmounts with the chart, so
  // focus falls to <body>: hand it to the table. Only on a switch, never on
  // mount, and the toggle keeps its own focus.
  useEffect(() => {
    const opened = lastView.current === 'chart' && view === 'table';
    lastView.current = view;
    if (opened && document.activeElement === document.body) tableRef.current?.focus();
  }, [view]);
  const titleId = useId();
  const Heading = titleLevel === 3 ? 'h3' : 'h2';
  return (
    <figure aria-labelledby={titleId} style={{display: 'flex', flexDirection: 'column', gap: SPACING.md, minWidth: 0, margin: 0}}>
      {/* The header row is the figcaption: a figcaption must be the figure's first or last child. */}
      <figcaption style={{display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: SPACING.md}}>
        <div style={{display: 'grid', gap: SPACING.xs, minWidth: 0, flex: '1 1 200px'}}>
          <Heading id={titleId} style={{margin: 0, fontSize: ADMIN_TYPE.body, fontWeight: 700, color: ADMIN_COLORS.text}}>
            {title}
          </Heading>
          {subtitle != null && <div style={{fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>{subtitle}</div>}
        </div>
        <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.sm, marginLeft: 'auto'}}>
          {actions}
          <SegmentedControl ariaLabel={`Show ${title} as`} options={VIEWS} value={view} onChange={setView} />
        </div>
      </figcaption>
      {view === 'chart' ? (
        <>
          {legend}
          {children}
        </>
      ) : (
        <DataTable table={table} tableRef={tableRef} />
      )}
    </figure>
  );
}
```

- [ ] **Step 16: Run the test and see it pass**

Run: `pnpm vitest run src/charts/__tests__/ChartFrame.test.tsx`
Expected: PASS, `Tests 7 passed (7)`.

- [ ] **Step 17: Extend R1-2's stylesheet and theme tests**

These are edits to `src/theme/__tests__/AdminStyles.test.tsx`, which R1-2 Step 5 creates. Each "before" block is quoted exactly from that file.

The bridge import. Before:

```tsx
import {COLORS, FONT_SIZES, RADIUS} from '../../app-bridge';
```

After:

```tsx
import {COLORS, EASING, FONT_SIZES, RADIUS} from '../../app-bridge';
```

The class lists, at the end of `CLASSES` through `PRESSABLE`. Before:

```tsx
  'adm-select',
  'adm-hover-row',
];
const FOCUSABLE = ['adm-nav-item', 'adm-seg-btn', 'adm-row-btn', 'adm-card-btn', 'adm-bar-btn', 'adm-input', 'adm-select'];
const PRESSABLE = ['adm-seg-btn', 'adm-row-btn', 'adm-card-btn', 'adm-bar-btn'];
```

After. `adm-chart-hit` joins `FOCUSABLE` and `PRESSABLE`, so the existing tests check its hover, focus ring and pressed state:

```tsx
  'adm-select',
  'adm-hover-row',
  // The chart kit's (R1-3b).
  'adm-chart-plot',
  'adm-chart-hit',
  'adm-chart-mark',
  'adm-chart-bar',
  'adm-chart-line',
  'adm-chart-area',
  'adm-chart-label',
  'adm-chart-cursor',
  'adm-chart-tip',
];
const FOCUSABLE = [
  'adm-nav-item',
  'adm-seg-btn',
  'adm-row-btn',
  'adm-card-btn',
  'adm-bar-btn',
  'adm-input',
  'adm-select',
  'adm-chart-hit',
];
const PRESSABLE = ['adm-seg-btn', 'adm-row-btn', 'adm-card-btn', 'adm-bar-btn', 'adm-chart-hit'];
```

The end of the file: the last lines of the background-clip test, its close and the `describe`'s close. Before:

```tsx
    const filled = [screen.getByRole('group'), screen.getByRole('button'), screen.getByRole('textbox')];
    for (const el of filled) expect(getComputedStyle(el).backgroundClip, el.className).toBe('padding-box');
  });
});
```

After. The five new tests follow it:

```tsx
    const filled = [screen.getByRole('group'), screen.getByRole('button'), screen.getByRole('textbox')];
    for (const el of filled) expect(getComputedStyle(el).backgroundClip, el.className).toBe('padding-box');
  });

  it('rings a focused chart plot outside it and a focused bar column inside it', () => {
    const css = stylesheet();
    expect(css).toContain(`.adm-chart-plot:focus-visible{outline:2px solid ${ADMIN_COLORS.accent};outline-offset:2px;}`);
    // Bar columns sit flush against each other, so their ring stays inside the column.
    expect(css).toContain(`.adm-chart-hit:focus-visible{outline:2px solid ${ADMIN_COLORS.accent};outline-offset:-2px;}`);
  });

  it('never dims a bar column, so a focused one keeps its full ring while another is picked', () => {
    render(
      <>
        <AdminStyles />
        <div>
          <button type="button" className="adm-chart-hit" aria-pressed="true" aria-label="Sep 29" />
          <button type="button" className="adm-chart-hit" aria-pressed="false" aria-label="Sep 30" />
        </div>
      </>,
    );
    expect(getComputedStyle(screen.getByRole('button', {name: 'Sep 30'})).opacity).toBe('1');
  });

  it('moves chart marks on the smooth curve, through transform and opacity only', () => {
    const css = stylesheet();
    expect(css).toContain(`.adm-chart-cursor{transition:transform .2s ${EASING.smooth};}`);
    expect(css).toContain(`.adm-chart-tip{transition:transform .2s ${EASING.smooth};`);
    expect(css).toContain('@keyframes adm-chart-rise{from{transform:scaleY(0);}to{transform:scaleY(1);}}');
    expect(css).toContain('@keyframes adm-chart-draw{from{stroke-dashoffset:1;}to{stroke-dashoffset:0;}}');
    // No keyframe touches layout, so SVG and HTML marks animate alike.
    const keyframes = [...css.matchAll(/@keyframes [a-z-]+\{(.*?)\}\}/g)];
    expect(keyframes).toHaveLength(3);
    for (const [, body] of keyframes) {
      for (const [, property] of body.matchAll(/([a-z-]+):/g)) {
        expect(['transform', 'opacity', 'stroke-dashoffset']).toContain(property);
      }
    }
  });

  it('switches every chart transition and animation off for reduced motion', () => {
    const reduced = /@media \(prefers-reduced-motion: reduce\)\{([\s\S]*?)\n\}/.exec(stylesheet())?.[1] ?? '';
    for (const name of ['adm-chart-hit', 'adm-chart-mark', 'adm-chart-cursor', 'adm-chart-tip']) {
      expect(reduced, name).toMatch(new RegExp(`[.]${name}(?![a-z-])[^{]*[{]transition:none;[}]`));
    }
    for (const name of ['adm-chart-bar', 'adm-chart-line', 'adm-chart-area', 'adm-chart-label', 'adm-chart-tip']) {
      expect(reduced, name).toMatch(new RegExp(`[.]${name}(?![a-z-])[^{]*[{]animation:none;[}]`));
    }
  });

  it('dims chart marks beside a picked one and brightens the active one', () => {
    render(
      <>
        <AdminStyles />
        <svg>
          <g data-testid="dimmed" className="adm-chart-mark" data-dim="true" />
          <g data-testid="active" className="adm-chart-mark" data-active="true" />
          <g data-testid="plain" className="adm-chart-mark" />
        </svg>
      </>,
    );
    expect(getComputedStyle(screen.getByTestId('dimmed')).opacity).toBe('0.4');
    expect(getComputedStyle(screen.getByTestId('active')).filter).toBe('brightness(1.2)');
    expect(getComputedStyle(screen.getByTestId('plain')).opacity).toBe('1');
  });
});
```

jsdom 30 computes the opacity and `filter` of an SVG `<g>` from attribute selectors. That is why the last test can check what the rules do, not just their text, as R1-2's dim and clip tests do.

One edit to `src/theme/__tests__/adminTheme.test.ts`, which R1-2 Step 1 creates. `emphasisKey` paints a bar in `accent`, a fill the kit adds, and R1-2's rule is "A chart that adds a fill adds a line to `chartMarks`". The start of `chartMarks`. It goes first, not last, because R3 Step 9 quotes the record's last line and its close as the "before" of its own edit. Before:

```ts
    const chartMarks: Record<string, string> = {
      '7+ (under)': ADMIN_COLORS.under,
```

After:

```ts
    const chartMarks: Record<string, string> = {
      // The emphasis bar: BarChart's emphasisKey in the accent (R1-3b), the Overview's newest week.
      'Emphasis bar (accent)': ADMIN_COLORS.accent,
      '7+ (under)': ADMIN_COLORS.under,
```

The line goes inside an existing test, so the count doesn't change. It passes as soon as it is written (`accent` is 10.8:1 on the card), and it keeps a later change to either colour from dropping the emphasis bar under 3:1.

- [ ] **Step 18: Run it and see it fail**

Run: `pnpm vitest run src/theme/__tests__/AdminStyles.test.tsx`
Expected: FAIL, `Tests 7 failed | 5 passed (12)`. These seven fail:
- "defines every adm-* class in the contract"
- "gives every interactive class a hover state and a gold focus-visible ring"
- "reads selection from ARIA state, not from a class"
- "rings a focused chart plot outside it and a focused bar column inside it"
- "moves chart marks on the smooth curve, through transform and opacity only"
- "switches every chart transition and animation off for reduced motion"
- "dims chart marks beside a picked one and brightens the active one"

"never dims a bar column…" already passes, since R1-2's `:has()` dim names only `adm-bar-btn`. It stays as a guard.

- [ ] **Step 19: Add the chart classes to AdminStyles**

These are edits to `src/theme/AdminStyles.tsx`, which R1-2 Step 7 creates. Each "before" block is quoted exactly.

The motion constants. Before:

```tsx
const FAST = `.2s ${EASING.snappy}`;
```

After:

```tsx
const FAST = `.2s ${EASING.snappy}`;
// Chart motion (R1-3b): the smooth curve, on transform and opacity only, so
// SVG marks animate alike in every browser. GLIDE moves the cursor, tooltip and
// mark states; ENTER brings bars, lines and labels in when they mount.
const GLIDE = `.2s ${EASING.smooth}`;
const ENTER = `.5s ${EASING.smooth}`;
```

The end of the `CSS` template. Before:

```tsx
.adm-seg-btn:disabled,.adm-row-btn:disabled,.adm-card-btn:disabled,.adm-bar-btn:disabled,.adm-input:disabled,.adm-select:disabled{opacity:.4;cursor:not-allowed;}

@media (prefers-reduced-motion: reduce){
.adm-nav-item,.adm-nav-mark,.adm-seg-btn,.adm-row-btn,.adm-card-btn,.adm-bar-btn,.adm-input,.adm-select,.adm-hover-row{transition:none;}
}
`;
```

After. The chart rules go after the disabled rule and before the reduced-motion block. The block keeps R1-2's line and adds two of its own:

```tsx
.adm-seg-btn:disabled,.adm-row-btn:disabled,.adm-card-btn:disabled,.adm-bar-btn:disabled,.adm-input:disabled,.adm-select:disabled{opacity:.4;cursor:not-allowed;}

.adm-chart-plot{border-radius:${R.control}px;outline:none;touch-action:pan-y;}
.adm-chart-plot:focus-visible{${FOCUS_RING}outline-offset:2px;}
.adm-chart-hit{flex:1 1 0;min-width:0;margin:0;padding:0;border:none;border-radius:${R.control}px;background:transparent;cursor:pointer;transition:background-color ${FAST};}
.adm-chart-hit:hover${ENABLED}{background:${C.rowHover};}
.adm-chart-hit[aria-pressed="true"]{background:${C.accentTintSoft};}
.adm-chart-hit:focus-visible{${FOCUS_RING}outline-offset:-2px;}
.adm-chart-mark{transition:opacity ${GLIDE},filter ${GLIDE};}
.adm-chart-mark[data-active="true"]{filter:brightness(1.2);}
.adm-chart-mark[data-dim="true"]{opacity:.4;}
.adm-chart-bar{transform-box:fill-box;transform-origin:50% 100%;animation:adm-chart-rise ${ENTER} both;}
.adm-chart-line{stroke-dasharray:1;animation:adm-chart-draw ${ENTER} both;}
.adm-chart-area,.adm-chart-label{animation:adm-chart-fade ${ENTER} both;}
.adm-chart-cursor{transition:transform ${GLIDE};}
.adm-chart-tip{transition:transform ${GLIDE};animation:adm-chart-fade ${GLIDE} both;}
@keyframes adm-chart-rise{from{transform:scaleY(0);}to{transform:scaleY(1);}}
@keyframes adm-chart-draw{from{stroke-dashoffset:1;}to{stroke-dashoffset:0;}}
@keyframes adm-chart-fade{from{opacity:0;}to{opacity:1;}}

@media (prefers-reduced-motion: reduce){
.adm-nav-item,.adm-nav-mark,.adm-seg-btn,.adm-row-btn,.adm-card-btn,.adm-bar-btn,.adm-input,.adm-select,.adm-hover-row{transition:none;}
.adm-chart-hit,.adm-chart-mark,.adm-chart-cursor,.adm-chart-tip{transition:none;}
.adm-chart-bar,.adm-chart-line,.adm-chart-area,.adm-chart-label,.adm-chart-tip{animation:none;}
}
`;
```

What each chart class is for:

| Class | Element | States and design |
|---|---|---|
| `adm-chart-plot` | the plot `<div>` of a chart without selection, `role="slider"` (useChartCursor) | `:focus-visible`: the gold ring at offset 2px, as every control. `touch-action: pan-y`, so a horizontal drag scrubs the chart and a vertical one scrolls the page |
| `adm-chart-hit` | a bar's `<button aria-pressed>`, under the drawing, one per slot | Hover: the `rowHover` fill. Pressed: `accentTintSoft`. `:focus-visible`: the gold ring inside the column (offset −2px), because columns sit flush. Never dimmed |
| `adm-chart-mark` | a bar's SVG `<g>` | `[data-active="true"]` (under the cursor) brightens it to 1.2. `[data-dim="true"]` (another bar picked) drops it to .4 opacity |
| `adm-chart-bar` | the same `<g>` | Rises from its own baseline on mount (`transform-box: fill-box`, origin at the bottom) |
| `adm-chart-line` | a line `<path pathLength="1">` | Draws in once, through `stroke-dashoffset` |
| `adm-chart-area`, `adm-chart-label` | area washes, cap labels, end dots, end labels | Fade in |
| `adm-chart-cursor` | the crosshair `<g>` and its markers, placed by `transform` | Glide to each new x |
| `adm-chart-tip` | ChartTooltip | Glides between points and fades in |

Keep these properties if you edit the rules:
- **Motion uses transform and opacity only.** No keyframe touches layout or SVG geometry attributes, which browsers animate unevenly. The crosshair and markers move by CSS `transform`, never `x`/`cx`. The stylesheet test checks every keyframe.
- **The reduced-motion block comes last.** Its rules have the same specificity as the ones they switch off, so source order decides.
- **The hit column has no sibling dim.** Fading the bars belongs to the SVG (`data-dim`), so the focus ring on any column stays at full strength.
- **`filter` is progressive enhancement.** A browser that ignores CSS `filter` on SVG still shows the active bar through the column wash (cursor mode) or the hit column's fill (selection mode).

- [ ] **Step 20: Run the theme tests and see them pass**

Run: `pnpm vitest run src/theme`
Expected: PASS, `Test Files 2 passed (2)` and `Tests 18 passed (18)`. R1-2's 13 tests still pass, its 1.4.11 case with the emphasis bar in it, and there are 5 new ones.

- [ ] **Step 21: Write the failing BarChart test**

Create `src/charts/__tests__/BarChart.test.tsx`. The geometry comes from the 640px fallback width:
- The y-axis gutter is `BAR_Y_AXIS_WIDTH`, 40px, more than the "40" tick's 12px label and 8px gap need. With the 8px right pad, the plot starts at x 40 and runs 592px.
- The plot is 160px tall under a 16px cap band, so the baseline is at y 176.
- Four bars get 148px slots and the full 24px thickness.
- Sep 28's 37 votes on a 40 top make a 148px bar.

```tsx
import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {BAR_Y_AXIS_WIDTH, BarChart, type BarDatum} from '../BarChart';
import type {SeriesDef} from '../series';

const BANDS: SeriesDef[] = [
  {id: 'high', label: '7+', color: ADMIN_COLORS.under},
  {id: 'mid', label: '5–6', color: ADMIN_COLORS.barNeutral},
  {id: 'unscored', label: 'No score', color: ADMIN_COLORS.muted, pattern: 'hatch'},
];

// Totals 5, 37, 12 and 9: the axis tops out at 40 (ticks 0, 20, 40).
const DAYS: BarDatum[] = [
  {key: '2026-09-27', label: 'Sep 27', values: {high: 3, mid: 2}},
  {key: '2026-09-28', label: 'Sep 28', values: {high: 20, mid: 10, unscored: 7}},
  {key: '2026-09-29', label: 'Sep 29', values: {high: 6, mid: 4, unscored: 2}},
  {key: '2026-09-30', label: 'Sep 30', values: {high: 5, mid: 3, unscored: 1}},
];

function total(d: BarDatum): number {
  return Object.values(d.values).reduce((sum, v) => sum + v, 0);
}

const tooltip = (d: BarDatum) => ({
  title: d.label,
  rows: [
    {label: 'votes', value: String(total(d))},
    {label: 'rated 7+', value: String(d.values.high ?? 0), color: ADMIN_COLORS.under},
  ],
});

/** `count` days of September 2026, from the 1st, with `values` on each. */
function september(count: number, values: (i: number) => Record<string, number> = () => ({high: 1})): BarDatum[] {
  return Array.from({length: count}, (_, i) => {
    const day = String(i + 1).padStart(2, '0');
    return {key: `2026-09-${day}`, label: `Sep ${i + 1}`, values: values(i)};
  });
}

function bar(container: HTMLElement, key: string): SVGGElement {
  const g = container.querySelector<SVGGElement>(`g[data-key="${key}"]`);
  expect(g, key).not.toBeNull();
  return g!;
}

function segment(container: HTMLElement, key: string, series: string): SVGElement {
  const el = bar(container, key).querySelector<SVGElement>(`[data-series="${series}"]`);
  expect(el, `${key} ${series}`).not.toBeNull();
  return el!;
}

const num = (el: Element, attr: string) => Number(el.getAttribute(attr));
/** The y where a rounded-top path starts: its bottom edge. */
const pathBottom = (el: Element) => Number(/^M[\d.]+,([\d.]+)/.exec(el.getAttribute('d') ?? '')?.[1]);
const texts = (container: HTMLElement, selector: string) =>
  Array.from(container.querySelectorAll(selector)).map((t) => t.textContent);

/** jsdom has no layout: the plot's box, at the 640px fallback width. */
function placePlot(plot: HTMLElement) {
  vi.spyOn(plot, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 640, 196));
}

/** A bar's centre, from its drawn segments. */
function centreOf(container: HTMLElement, key: string): number {
  const first = bar(container, key).querySelector('rect');
  return num(first!, 'x') + num(first!, 'width') / 2;
}

function tip(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>('.adm-chart-tip');
}

describe('BarChart: marks', () => {
  it('stacks the series from the baseline up, with a 2px surface gap between segments', () => {
    const {container} = render(<BarChart data={DAYS} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />);
    const high = segment(container, '2026-09-28', 'high');
    const mid = segment(container, '2026-09-28', 'mid');
    const unscored = segment(container, '2026-09-28', 'unscored');

    // The plot runs from y 16 to the baseline at 176 (160px), topped at 40.
    expect(num(high, 'y') + num(high, 'height')).toBe(176);
    expect(num(high, 'height')).toBe(80); // 20 of 37, in a 148px bar
    expect(num(mid, 'y') + num(mid, 'height')).toBe(num(high, 'y') - 2);
    expect(pathBottom(unscored)).toBe(num(mid, 'y') - 2);
    expect(unscored.getAttribute('d')).toMatch(/V32A4,4 0 0 1/); // tops out at 28 = 176 − 148
  });

  it('rounds only the data end, 4px, and keeps bars at most 24px thick', () => {
    const {container} = render(<BarChart data={DAYS} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />);
    const g = bar(container, '2026-09-27');
    expect(g.querySelectorAll('rect')).toHaveLength(1);
    expect(g.querySelector('rect')).not.toHaveAttribute('rx');
    expect(g.querySelector('path')?.getAttribute('d')).toContain('A4,4');
    expect(num(g.querySelector('rect')!, 'width')).toBe(24);
  });

  it('fills a hatched series with its pattern', () => {
    const {container} = render(<BarChart data={DAYS} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />);
    const pattern = container.querySelector('defs pattern');
    expect(pattern).not.toBeNull();
    expect(pattern).toHaveAttribute('patternTransform', 'rotate(45)');
    expect(pattern!.querySelector('rect')).toHaveAttribute('fill', ADMIN_COLORS.muted);
    expect(segment(container, '2026-09-28', 'unscored')).toHaveAttribute('fill', `url(#${pattern!.id})`);
    expect(segment(container, '2026-09-28', 'high')).toHaveAttribute('fill', ADMIN_COLORS.under);
  });

  it('draws a clean axis: hairline grid and muted ticks at 0, 20 and 40', () => {
    const {container} = render(<BarChart data={DAYS} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />);
    const ticks = Array.from(container.querySelectorAll('svg > g > text')).filter((t) => !t.hasAttribute('data-x-label'));
    expect(ticks.map((t) => t.textContent)).toEqual(['0', '20', '40']);
    for (const t of ticks) expect(t).toHaveAttribute('fill', ADMIN_COLORS.muted);
    const grid = container.querySelectorAll('svg > g > line');
    expect(grid).toHaveLength(3);
    for (const line of grid) expect(line).toHaveAttribute('stroke-width', '1');
  });

  it('starts the plot after a fixed 40px y-axis gutter, which a wider tick label widens', () => {
    const {container, rerender} = render(<BarChart data={DAYS} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />);
    expect(BAR_Y_AXIS_WIDTH).toBe(40);
    expect(container.querySelector('svg > g > line')).toHaveAttribute('x1', '40');
    // "40,000" needs 36px plus the 8px gap, so the gutter grows rather than clip it.
    rerender(<BarChart data={september(3, () => ({high: 40000}))} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />);
    expect(container.querySelector('svg > g > line')).toHaveAttribute('x1', '44');
  });

  it('charts all zeros as an empty 0 to 1 axis, with no marks and no cap labels', () => {
    const {container} = render(
      <BarChart data={september(5, () => ({high: 0}))} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />,
    );
    expect(container.querySelectorAll('[data-series]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-cap]')).toHaveLength(0);
    expect(texts(container, 'svg > g > text:not([data-x-label])')).toEqual(['0', '1']);
  });

  it('centres a single bar and prints its total', () => {
    const {container} = render(
      <BarChart data={[DAYS[1]]} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />,
    );
    // left gutter 40, plot 592 wide: the centre is at 336.
    expect(centreOf(container, '2026-09-28')).toBe(336);
    expect(texts(container, '[data-cap]')).toEqual(['37']);
  });

  it('shows the empty text in place of the plot when there is no data', () => {
    const {container} = render(
      <BarChart data={[]} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} emptyText="No votes in this range." />,
    );
    expect(screen.getByText('No votes in this range.')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });
});

describe('BarChart: labels', () => {
  it('prints the totals of the last and the highest bar by default', () => {
    const {container} = render(<BarChart data={DAYS} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />);
    expect(texts(container, '[data-cap]')).toEqual(['37', '9']);
    for (const cap of container.querySelectorAll('[data-cap]')) expect(cap).toHaveAttribute('fill', ADMIN_COLORS.muted);
  });

  it('prints every total, or none, when asked', () => {
    const {container, rerender} = render(
      <BarChart data={DAYS} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} capLabels="all" />,
    );
    expect(texts(container, '[data-cap]')).toEqual(['5', '37', '12', '9']);
    rerender(<BarChart data={DAYS} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} capLabels="none" />);
    expect(container.querySelectorAll('[data-cap]')).toHaveLength(0);
  });

  it('drops the highest total when it would collide with the last one', () => {
    const data = september(30, (i) => ({high: i === 28 ? 4000 : i === 29 ? 3999 : 0}));
    const {container} = render(<BarChart data={data} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />);
    expect(texts(container, '[data-cap]')).toEqual(['3,999']);
  });

  it('prints every nth x label counting back from the newest', () => {
    const {container} = render(
      <BarChart data={september(6)} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} xLabelEvery={2} />,
    );
    expect(texts(container, '[data-x-label]')).toEqual(['Sep 2', 'Sep 4', 'Sep 6']);
  });

  it('thins the x labels further when they would not fit, keeping the newest', () => {
    const {container, rerender} = render(
      <BarChart data={september(30)} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />,
    );
    // 30 bars in 592px leave 19.7px a bar; a 6-character label needs 44px, so every third prints.
    expect(texts(container, '[data-x-label]')).toEqual([
      'Sep 3', 'Sep 6', 'Sep 9', 'Sep 12', 'Sep 15', 'Sep 18', 'Sep 21', 'Sep 24', 'Sep 27', 'Sep 30',
    ]);
    rerender(<BarChart data={september(30)} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} xLabelEvery={5} />);
    expect(texts(container, '[data-x-label]')).toEqual(['Sep 5', 'Sep 10', 'Sep 15', 'Sep 20', 'Sep 25', 'Sep 30']);
  });

  it('puts a sub-label under each x label, in the colour it is given', () => {
    const {container} = render(
      <BarChart
        data={september(3)}
        series={BANDS}
        ariaLabel="Weekly votes"
        tooltip={tooltip}
        subLabel={(d) => (d.key === '2026-09-02' ? null : {text: d.key === '2026-09-03' ? '−0.30' : '+0.83', color: d.key === '2026-09-03' ? ADMIN_COLORS.over : undefined})}
      />,
    );
    const subs = Array.from(container.querySelectorAll('[data-sub-label]'));
    expect(subs.map((t) => t.textContent)).toEqual(['+0.83', '−0.30']);
    expect(subs[0]).toHaveAttribute('fill', ADMIN_COLORS.muted);
    expect(subs[1]).toHaveAttribute('fill', ADMIN_COLORS.over);
  });

  it('draws one series in emphasis: the picked bar in the accent, the rest neutral', () => {
    const weeks = september(4, (i) => ({votes: 10 + i}));
    const {container} = render(
      <BarChart
        data={weeks}
        series={[{id: 'votes', label: 'Votes', color: ADMIN_COLORS.barNeutral}]}
        ariaLabel="Weekly votes"
        tooltip={tooltip}
        emphasisKey="2026-09-04"
      />,
    );
    expect(segment(container, '2026-09-04', 'votes')).toHaveAttribute('fill', ADMIN_COLORS.accent);
    for (const key of ['2026-09-01', '2026-09-02', '2026-09-03']) {
      expect(segment(container, key, 'votes')).toHaveAttribute('fill', ADMIN_COLORS.barNeutral);
    }
    expect(container.querySelector('[data-cap="2026-09-04"]')).toHaveAttribute('fill', ADMIN_COLORS.text);
  });
});

describe('BarChart: hover and keyboard without onSelect', () => {
  it('is one slider, valued at the newest bar with the tooltip text', () => {
    render(<BarChart data={DAYS} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />);
    const slider = screen.getByRole('slider', {name: 'Votes per day'});
    expect(slider).toHaveAttribute('aria-valuetext', 'Sep 30: 9 votes, 5 rated 7+');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the tooltip of the bar under the pointer, washes its column and lifts it', () => {
    const {container} = render(<BarChart data={DAYS} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />);
    const slider = screen.getByRole('slider');
    placePlot(slider);
    fireEvent.pointerMove(slider, {clientX: centreOf(container, '2026-09-28') + 30});

    const shown = tip(container);
    expect(shown).not.toBeNull();
    expect(within(shown!).getByText('Sep 28')).toBeInTheDocument();
    expect(within(shown!).getByText('37')).toBeInTheDocument();
    expect(bar(container, '2026-09-28')).toHaveAttribute('data-active', 'true');
    expect(bar(container, '2026-09-27')).not.toHaveAttribute('data-active');
    expect(container.querySelector('[data-wash]')).not.toBeNull();

    fireEvent.pointerLeave(slider);
    expect(tip(container)).toBeNull();
    expect(container.querySelector('[data-wash]')).toBeNull();
  });

  it('gives the keyboard the same tooltip', async () => {
    const {container} = render(<BarChart data={DAYS} series={BANDS} ariaLabel="Votes per day" tooltip={tooltip} />);
    await userEvent.tab();
    expect(within(tip(container)!).getByText('Sep 30')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowLeft}');
    expect(within(tip(container)!).getByText('Sep 29')).toBeInTheDocument();
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', 'Sep 29: 12 votes, 6 rated 7+');
    await userEvent.keyboard('{Home}');
    expect(within(tip(container)!).getByText('Sep 27')).toBeInTheDocument();
  });
});

describe('BarChart: selectable bars', () => {
  function Selectable({onSelect}: {onSelect: (key: string | null) => void}) {
    const [picked, setPicked] = useState<string | null>(null);
    return (
      <BarChart
        data={DAYS}
        series={BANDS}
        ariaLabel="Votes per day"
        tooltip={tooltip}
        selectedKey={picked}
        onSelect={(key) => {
          setPicked(key);
          onSelect(key);
        }}
      />
    );
  }

  it('makes each bar a toggle button named by its tooltip text', () => {
    render(<Selectable onSelect={() => {}} />);
    const group = screen.getByRole('group', {name: 'Votes per day'});
    expect(within(group).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Sep 27: 5 votes, 3 rated 7+',
      'Sep 28: 37 votes, 20 rated 7+',
      'Sep 29: 12 votes, 6 rated 7+',
      'Sep 30: 9 votes, 5 rated 7+',
    ]);
    for (const b of within(group).getAllByRole('button')) expect(b).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('toggles a bar on and off, dimming the others while one is picked', async () => {
    const onSelect = vi.fn();
    const {container} = render(<Selectable onSelect={onSelect} />);
    const sep28 = screen.getByRole('button', {name: /^Sep 28:/});

    await userEvent.click(sep28);
    expect(onSelect).toHaveBeenLastCalledWith('2026-09-28');
    expect(sep28).toHaveAttribute('aria-pressed', 'true');
    expect(bar(container, '2026-09-28')).not.toHaveAttribute('data-dim');
    expect(bar(container, '2026-09-27')).toHaveAttribute('data-dim', 'true');

    await userEvent.click(sep28);
    expect(onSelect).toHaveBeenLastCalledWith(null);
    expect(sep28).toHaveAttribute('aria-pressed', 'false');
    expect(bar(container, '2026-09-27')).not.toHaveAttribute('data-dim');
  });

  it('has one Tab stop and moves between bars with the arrow keys, Home and End', async () => {
    const onSelect = vi.fn();
    const {container} = render(<Selectable onSelect={onSelect} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.tabIndex)).toEqual([-1, -1, -1, 0]);

    await userEvent.tab();
    expect(buttons[3]).toHaveFocus();
    expect(within(tip(container)!).getByText('Sep 30')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowLeft}');
    expect(buttons[2]).toHaveFocus();
    expect(within(tip(container)!).getByText('Sep 29')).toBeInTheDocument();
    await userEvent.keyboard('{Home}');
    expect(buttons[0]).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(buttons[0]).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(buttons[3]).toHaveFocus();

    await userEvent.keyboard('{ArrowLeft}{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith('2026-09-29');
    expect(buttons.map((b) => b.tabIndex)).toEqual([-1, -1, 0, -1]);

    await userEvent.keyboard('{Escape}');
    expect(tip(container)).toBeNull();
    await userEvent.tab();
    expect(tip(container)).toBeNull();
  });

  it('shows a bar’s tooltip on hover', () => {
    const {container} = render(<Selectable onSelect={() => {}} />);
    fireEvent.pointerEnter(screen.getByRole('button', {name: /^Sep 27:/}));
    expect(within(tip(container)!).getByText('Sep 27')).toBeInTheDocument();
    fireEvent.pointerLeave(screen.getByRole('group', {name: 'Votes per day'}));
    expect(tip(container)).toBeNull();
  });
});
```

- [ ] **Step 22: Run it and see it fail**

Run: `pnpm vitest run src/charts/__tests__/BarChart.test.tsx`
Expected: FAIL, with `Failed to resolve import "../BarChart" from "src/charts/__tests__/BarChart.test.tsx". Does the file exist?`

- [ ] **Step 23: Write `src/charts/BarChart.tsx`**

How the parts fit:
- **The drawing.** One `<svg>`, absolutely placed and `aria-hidden`, that ignores the pointer.
- **The gutter.** The plot starts at `BAR_Y_AXIS_WIDTH` (40px), or further right when a tick label needs more, and stops 8px short of the right edge. The gutter is fixed so R1-8 can count its weekly columns from the frame.
- **Without onSelect.** The plot `<div>` under it is the slider. The cursor washes the column (`data-wash`) and marks the bar `data-active`.
- **With onSelect.**
  - A flex row of `adm-chart-hit` buttons sits under the drawing, one per slot.
  - Each button's name is its tooltip text. The focused or hovered one drives the same cursor, so the tooltip and the brightened bar follow the keyboard as well as the mouse.
  - The roving Tab stop is the last focused bar, else the picked one, else the newest.
- **Data ends.** Interior segments are `<rect>`s. Only the top segment is a `<path>` with the 4px rounded end, so the joins between segments stay square.
- **No inline styles on buttons.** `<button>` gets no `style` prop (`inkweave/no-adhoc-buttons`); the hit row's layout goes on its wrapper `<div>`.

```tsx
import {useId, useRef, useState} from 'react';
import {RADIUS, SPACING, useContainerWidth} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';
import {fmtInt} from '../ui/format';
import {ChartTooltip, type TooltipContent} from './ChartTooltip';
import {HatchPattern} from './HatchPattern';
import {axisTicks, linear, niceCeiling, textWidth} from './scale';
import {CHART_FALLBACK_WIDTH, SURFACE_GAP, chartDomId, hatchId, seriesPaint, tooltipText, type SeriesDef} from './series';
import {useChartCursor} from './useChartCursor';

export interface BarDatum {
  key: string;
  /** The x label and the tooltip title: "Sep 30", "Week of Sep 28". */
  label: string;
  /** By series id. A missing or negative value counts as 0. */
  values: Record<string, number>;
}

interface BarChartProps {
  data: readonly BarDatum[];
  /** Stacked from the baseline up in this order; series[0] sits on the baseline. */
  series: readonly SeriesDef[];
  /** Names the plot: the slider, or the group of bar buttons. */
  ariaLabel: string;
  /** The plot's height in px, without the label bands (default 160). */
  height?: number;
  /** Axis ticks and cap labels (default fmtInt). */
  valueFormat?: (n: number) => string;
  tooltip: (d: BarDatum) => TooltipContent;
  capLabels?: 'none' | 'extremes' | 'all';
  xLabelEvery?: number;
  emphasisKey?: string;
  subLabel?: (d: BarDatum) => {text: string; color?: string} | null;
  selectedKey?: string | null;
  onSelect?: (key: string | null) => void;
  /** Shown in place of the plot when `data` is empty. */
  emptyText?: string;
}

const DEFAULT_HEIGHT = 160;
/** The y-axis gutter left of the plot: a five-character tick ("1,200") at 10px plus the 8px gap. Fixed, so a caller can count columns from its frame (R1-8's weeksThatFit); a wider tick label widens it rather than clip. */
export const BAR_Y_AXIS_WIDTH = SPACING.xxxl + SPACING.sm;
/** Bars are never thicker than this; a wider slot leaves the rest as air (dataviz mark spec). */
const MAX_BAR_WIDTH = SPACING.xxl;
const LABEL_SIZE = ADMIN_TYPE.micro;
/** The band above the plot that holds cap labels. */
const CAP_BAND = SPACING.lg;
/** The band under the plot that holds the x labels, and the one under it for sub-labels. */
const X_BAND = SPACING.xl;
const SUB_BAND = SPACING.section;
const TICK_GAP = SPACING.sm;
/** The air right of the plot. It comes off the plot too, so n bars share width − BAR_Y_AXIS_WIDTH − RIGHT_PAD. */
const RIGHT_PAD = SPACING.sm;

/** Rounds to 2 places, for tidy SVG attributes. */
function px(n: number): number {
  return Math.round(n * 100) / 100;
}

interface Segment {
  series: SeriesDef;
  top: number;
  bottom: number;
}

/**
 * One bar's stack, from the baseline up in series order. Each series takes
 * its share of the bar's height, and a 2px surface gap separates touching
 * segments, taken from the upper one. A segment never drops below 1px, so a
 * small share never vanishes.
 */
function stackOf(datum: BarDatum, series: readonly SeriesDef[], baseline: number, height: number): Segment[] {
  const values = series.map((s) => Math.max(0, datum.values[s.id] ?? 0));
  const total = values.reduce((sum, v) => sum + v, 0);
  const segments: Segment[] = [];
  if (total === 0) return segments;
  let below = 0;
  let previousTop: number | null = null;
  series.forEach((s, i) => {
    if (values[i] === 0) return;
    below += values[i];
    const bottom = previousTop == null ? baseline : previousTop - SURFACE_GAP;
    const top = Math.min(baseline - (below / total) * height, bottom - 1);
    segments.push({series: s, top, bottom});
    previousTop = top;
  });
  return segments;
}

/** A bar's data end: a 4px rounded top (RADIUS.sm) on a square base. */
function roundedTop(x: number, width: number, top: number, bottom: number): string {
  const r = px(Math.min(RADIUS.sm, width / 2, bottom - top));
  return [
    `M${px(x)},${px(bottom)}`,
    `V${px(top + r)}`,
    `A${r},${r} 0 0 1 ${px(x + r)},${px(top)}`,
    `H${px(x + width - r)}`,
    `A${r},${r} 0 0 1 ${px(x + width)},${px(top + r)}`,
    `V${px(bottom)}Z`,
  ].join('');
}

interface Cap {
  index: number;
  text: string;
  x: number;
  y: number;
  width: number;
}

function overlaps(a: Cap, b: Cap): boolean {
  return Math.abs(a.x - b.x) < (a.width + b.width) / 2 + SURFACE_GAP && Math.abs(a.y - b.y) < LABEL_SIZE + SURFACE_GAP;
}

/**
 * Which bars print their total (dataviz: label selectively). 'extremes' prints
 * the last bar and the highest one, dropping the highest when the two labels
 * would collide. 'all' prints every non-zero total while each label fits its
 * slot, and falls back to 'extremes' when one doesn't.
 */
function capsFor(mode: 'none' | 'extremes' | 'all', caps: Cap[], totals: number[], slot: number): Cap[] {
  if (mode === 'none') return [];
  const nonZero = caps.filter((cap) => totals[cap.index] > 0);
  if (mode === 'all' && nonZero.every((cap) => cap.width + SURFACE_GAP <= slot)) return nonZero;
  const last = nonZero.find((cap) => cap.index === totals.length - 1);
  const highest = nonZero.reduce<Cap | undefined>(
    (best, cap) => (best == null || totals[cap.index] > totals[best.index] ? cap : best),
    undefined,
  );
  if (!last) return highest ? [highest] : [];
  return highest && highest !== last && !overlaps(highest, last) ? [highest, last] : [last];
}

/**
 * Vertical columns, one series or stacked (docs/plans/R-redesign.md, Chart
 * kit). Built to the dataviz mark specs: bars at most 24px thick with a 4px
 * rounded data end and a square base, a 2px surface gap between stacked
 * segments, solid 1px gridlines one step off the surface, and the y ticks in
 * muted text.
 *
 * Without onSelect the plot is a slider (useChartCursor): the pointer and the
 * arrow keys move a cursor across the bars, the column under it washes and its
 * bar brightens, and the tooltip shows. With onSelect each bar is a toggle
 * button (aria-pressed) with a roving Tab stop: ←/→, Home and End move between
 * bars, Enter or Space toggles one, and the other bars dim to .4 while one is
 * picked. Either way the tooltip's text is also the bar's accessible name.
 *
 * The width follows the container (useContainerWidth). Until it is measured,
 * and always in jsdom, the chart lays out at CHART_FALLBACK_WIDTH and the SVG
 * scales to fit.
 */
export function BarChart({
  data,
  series,
  ariaLabel,
  height = DEFAULT_HEIGHT,
  valueFormat = fmtInt,
  tooltip,
  capLabels = 'extremes',
  xLabelEvery,
  emphasisKey,
  subLabel,
  selectedKey = null,
  onSelect,
  emptyText = 'No data to chart.',
}: BarChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measured = useContainerWidth(wrapRef);
  const chartId = chartDomId(useId());
  const n = data.length;
  const cursor = useChartCursor(n);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  const width = measured > 0 ? measured : CHART_FALLBACK_WIDTH;
  const totals = data.map((d) => series.reduce((sum, s) => sum + Math.max(0, d.values[s.id] ?? 0), 0));
  const integers = data.every((d) => series.every((s) => Number.isInteger(d.values[s.id] ?? 0)));
  const ceiling = niceCeiling(Math.max(0, ...totals));
  let ticks = axisTicks(ceiling);
  // Counts get whole-number ticks: a 0 / 2.5 / 5 axis becomes 0 / 5.
  if (integers && !ticks.every(Number.isInteger)) ticks = axisTicks(ceiling, 2);
  const tickLabels = ticks.map(valueFormat);

  const left = Math.max(BAR_Y_AXIS_WIDTH, Math.ceil(Math.max(...tickLabels.map((t) => textWidth(t, LABEL_SIZE)))) + TICK_GAP);
  const plotWidth = Math.max(width - left - RIGHT_PAD, 1);
  const slot = plotWidth / Math.max(n, 1);
  const barWidth = Math.max(1, Math.min(MAX_BAR_WIDTH, slot - SURFACE_GAP));
  const plotTop = CAP_BAND;
  const baseline = plotTop + height;
  const svgHeight = baseline + X_BAND + (subLabel ? SUB_BAND : 0);
  const y = linear([0, ceiling], [baseline, plotTop]);
  const centers = data.map((_, i) => left + slot * (i + 0.5));

  const stacks = data.map((d, i) => {
    const barHeight = totals[i] > 0 ? Math.max(SURFACE_GAP, (totals[i] / ceiling) * height) : 0;
    return stackOf(d, series, baseline, barHeight);
  });
  const barTop = (i: number) => stacks[i].at(-1)?.top ?? baseline;
  const emphasis = emphasisKey !== undefined && series.length === 1;
  const fillOf = (s: SeriesDef, d: BarDatum) => {
    if (!emphasis) return seriesPaint(s, chartId);
    return d.key === emphasisKey ? ADMIN_COLORS.accent : ADMIN_COLORS.barNeutral;
  };

  const caps = capsFor(
    capLabels,
    totals.map((total, i) => {
      const text = valueFormat(total);
      const labelWidth = textWidth(text, LABEL_SIZE);
      return {
        index: i,
        text,
        width: labelWidth,
        x: Math.min(Math.max(centers[i], labelWidth / 2), width - labelWidth / 2),
        y: barTop(i) - SPACING.xs,
      };
    }),
    totals,
    slot,
  );
  // Thin the x labels until they fit, counting back from the newest, which always prints.
  const fitEvery = Math.max(1, ...data.map((d) => Math.ceil((textWidth(d.label, LABEL_SIZE) + SPACING.sm) / slot)));
  const every = Math.max(Math.floor(xLabelEvery ?? 1), 1, fitEvery);
  const labelled = (i: number) => (n - 1 - i) % every === 0;

  const contents = data.map(tooltip);
  const names = contents.map(tooltipText);
  const selectedIndex = data.findIndex((d) => d.key === selectedKey);
  const hatched = series.filter((s) => s.pattern === 'hatch' && !emphasis);
  const active = cursor.index;

  const svg = (
    <svg
      aria-hidden="true"
      width={width}
      height={svgHeight}
      viewBox={`0 0 ${width} ${svgHeight}`}
      style={{position: 'absolute', top: 0, left: 0, display: 'block', maxWidth: '100%', height: 'auto', pointerEvents: 'none'}}>
      {hatched.length > 0 && (
        <defs>
          {hatched.map((s) => (
            <HatchPattern key={s.id} id={hatchId(chartId, s)} color={s.color} />
          ))}
        </defs>
      )}
      {ticks.map((tick, i) => (
        <g key={tick}>
          <line
            x1={left}
            x2={left + plotWidth}
            y1={px(y(tick))}
            y2={px(y(tick))}
            stroke={tick === 0 ? ADMIN_COLORS.border : ADMIN_COLORS.divider}
            strokeWidth={1}
            shapeRendering="crispEdges"
          />
          <text
            x={left - TICK_GAP}
            y={px(y(tick))}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={LABEL_SIZE}
            fill={ADMIN_COLORS.muted}
            style={{fontVariantNumeric: 'tabular-nums'}}>
            {tickLabels[i]}
          </text>
        </g>
      ))}
      {!onSelect && active != null && (
        <rect
          data-wash
          x={px(left + slot * active)}
          y={plotTop}
          width={px(slot)}
          height={height}
          rx={RADIUS.md}
          fill={ADMIN_COLORS.navHover}
        />
      )}
      {data.map((d, i) => {
        const x = centers[i] - barWidth / 2;
        const segments = stacks[i];
        return (
          <g
            key={d.key}
            className="adm-chart-mark adm-chart-bar"
            data-key={d.key}
            data-active={i === active || undefined}
            data-dim={(selectedIndex >= 0 && i !== selectedIndex) || undefined}>
            {segments.map((segment, s) =>
              s === segments.length - 1 ? (
                <path
                  key={segment.series.id}
                  data-series={segment.series.id}
                  d={roundedTop(x, barWidth, segment.top, segment.bottom)}
                  fill={fillOf(segment.series, d)}
                />
              ) : (
                <rect
                  key={segment.series.id}
                  data-series={segment.series.id}
                  x={px(x)}
                  y={px(segment.top)}
                  width={px(barWidth)}
                  height={px(segment.bottom - segment.top)}
                  fill={fillOf(segment.series, d)}
                />
              ),
            )}
          </g>
        );
      })}
      {caps.map((cap) => (
        <text
          key={cap.index}
          className="adm-chart-label"
          data-cap={data[cap.index].key}
          x={px(cap.x)}
          y={px(cap.y)}
          textAnchor="middle"
          fontSize={LABEL_SIZE}
          fill={emphasis && data[cap.index].key === emphasisKey ? ADMIN_COLORS.text : ADMIN_COLORS.muted}
          style={{fontVariantNumeric: 'tabular-nums'}}>
          {cap.text}
        </text>
      ))}
      {data.map((d, i) => {
        if (!labelled(i)) return null;
        const labelWidth = textWidth(d.label, LABEL_SIZE);
        const x = px(Math.min(Math.max(centers[i], labelWidth / 2), width - labelWidth / 2));
        const sub = subLabel?.(d) ?? null;
        return (
          <g key={d.key}>
            <text data-x-label x={x} y={baseline + X_BAND - SPACING.xs} textAnchor="middle" fontSize={LABEL_SIZE} fill={ADMIN_COLORS.muted}>
              {d.label}
            </text>
            {sub && (
              <text
                data-sub-label
                x={x}
                y={baseline + X_BAND + SUB_BAND - SPACING.xs}
                textAnchor="middle"
                fontSize={LABEL_SIZE}
                fill={sub.color ?? ADMIN_COLORS.muted}
                style={{fontVariantNumeric: 'tabular-nums'}}>
                {sub.text}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );

  const tip = (
    <ChartTooltip
      content={active == null ? null : contents[active]}
      x={active == null ? 0 : centers[active]}
      y={active == null ? 0 : barTop(active)}
      bounds={{width, height: svgHeight}}
    />
  );

  if (n === 0) {
    return (
      <div ref={wrapRef} style={{minWidth: 0}}>
        <p style={{margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>{emptyText}</p>
      </div>
    );
  }

  if (!onSelect) {
    return (
      <div ref={wrapRef} style={{minWidth: 0}}>
        <div
          className="adm-chart-plot"
          aria-label={ariaLabel}
          {...cursor.plotProps((i) => names[i], centers)}
          style={{position: 'relative', height: svgHeight}}>
          {svg}
          {tip}
        </div>
      </div>
    );
  }

  const tabStop = focusIndex != null && focusIndex < n ? focusIndex : selectedIndex >= 0 ? selectedIndex : n - 1;
  const focusBar = (i: number) => buttons.current[Math.min(Math.max(i, 0), n - 1)]?.focus();
  const onBarKey = (event: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    switch (event.key) {
      case 'ArrowRight':
        focusBar(i + 1);
        break;
      case 'ArrowLeft':
        focusBar(i - 1);
        break;
      case 'Home':
        focusBar(0);
        break;
      case 'End':
        focusBar(n - 1);
        break;
      case 'Escape':
        cursor.setIndex(null);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <div ref={wrapRef} style={{minWidth: 0}}>
      <div
        role="group"
        aria-label={ariaLabel}
        onPointerLeave={() => cursor.setIndex(null)}
        style={{position: 'relative', height: svgHeight}}>
        {/* The hit columns sit under the drawing, each spanning its whole slot and the
            full height, so the target is never just the painted bar. AdminStyles'
            adm-chart-hit draws their hover, pressed and focus states; the drawing
            dims the other bars itself, so a focused column keeps its full ring. */}
        <div style={{position: 'absolute', top: 0, left, width: plotWidth, height: svgHeight, display: 'flex'}}>
          {data.map((d, i) => (
            <button
              key={d.key}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              type="button"
              className="adm-chart-hit"
              aria-label={names[i]}
              aria-pressed={i === selectedIndex}
              tabIndex={i === tabStop ? 0 : -1}
              onClick={() => onSelect(i === selectedIndex ? null : d.key)}
              onKeyDown={(event) => onBarKey(event, i)}
              onFocus={() => {
                setFocusIndex(i);
                cursor.setIndex(i);
              }}
              onBlur={() => cursor.setIndex(null)}
              onPointerEnter={() => cursor.setIndex(i)}
            />
          ))}
        </div>
        {svg}
        {tip}
      </div>
    </div>
  );
}
```

- [ ] **Step 24: Run the test and see it pass**

Run: `pnpm vitest run src/charts/__tests__/BarChart.test.tsx`
Expected: PASS, `Tests 22 passed (22)`.

- [ ] **Step 25: Write the failing LineChart test**

Create `src/charts/__tests__/LineChart.test.tsx`. The geometry, at the 640px fallback width:
- The "40" tick puts the plot's left edge at x 20.
- The end labels "40" and "18" need 22px on the right: 12 of text, the dot's 4 and ring's 2, and a 4px gap. The plot runs 598px.
- The five days sit 149.5px apart.
- The plot is 180px tall under an 8px top pad, so its floor is at y 188.

```tsx
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {fmtGap} from '../../ui/format';
import {LineChart, type LineSeries} from '../LineChart';

const DAYS = ['2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30'];

function seriesOf(id: string, label: string, color: string, ys: Array<number | null>, days = DAYS): LineSeries {
  return {
    id,
    label,
    color,
    points: ys.flatMap((y, i) => (y == null ? [] : [{x: days[i], y}])),
  };
}

const SEARCHES = seriesOf('searches', 'Searches', ADMIN_COLORS.accent, [10, 20, 30, 25, 40]);
// No point on Sep 28: the line breaks there.
const VIEWS = seriesOf('views', 'Card views', ADMIN_COLORS.under, [5, 8, null, 12, 18]);

/** jsdom has no layout: the plot's box, at the 640px fallback width. */
function placePlot(plot: HTMLElement) {
  vi.spyOn(plot, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 640, 208));
}

function tip(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>('.adm-chart-tip');
}

const texts = (container: HTMLElement, selector: string) =>
  Array.from(container.querySelectorAll(selector)).map((t) => t.textContent);

describe('LineChart: marks', () => {
  it('draws each series as a 2px line in its colour, with an end dot ringed in the surface colour', () => {
    const {container} = render(<LineChart series={[SEARCHES, VIEWS]} ariaLabel="Events per day" />);
    const line = container.querySelector('path[data-series="searches"]');
    expect(line).toHaveAttribute('stroke', ADMIN_COLORS.accent);
    expect(line).toHaveAttribute('stroke-width', '2');
    expect(line).toHaveAttribute('fill', 'none');
    const dot = container.querySelector('circle[data-end="views"]');
    expect(dot).toHaveAttribute('fill', ADMIN_COLORS.under);
    expect(dot).toHaveAttribute('r', '4');
    expect(dot).not.toHaveAttribute('stroke');
    // The 2px ring is the surface, the card over the page: two r 6 discs under the dot.
    const discs = Array.from(dot?.parentElement?.querySelectorAll('circle') ?? []);
    expect(discs.map((c) => [c.getAttribute('r'), c.getAttribute('fill')])).toEqual([
      ['6', ADMIN_COLORS.page],
      ['6', ADMIN_COLORS.card],
      ['4', ADMIN_COLORS.under],
    ]);
  });

  it('breaks a line where its series has no point', () => {
    const {container} = render(<LineChart series={[SEARCHES, VIEWS]} ariaLabel="Events per day" />);
    expect(container.querySelector('path[data-series="views"]')?.getAttribute('d')?.match(/M/g)).toHaveLength(2);
    expect(container.querySelector('path[data-series="searches"]')?.getAttribute('d')?.match(/M/g)).toHaveLength(1);
  });

  it('breaks a lone series at a null value, keeping that x on the axis', async () => {
    const weeks = ['2026-09-07', '2026-09-14', '2026-09-21'];
    const gap: LineSeries = {
      id: 'gap',
      label: 'mean gap',
      color: ADMIN_COLORS.accent,
      points: [
        {x: weeks[0], y: 0.4},
        {x: weeks[1], y: null},
        {x: weeks[2], y: -0.2},
      ],
    };
    const {container} = render(<LineChart series={[gap]} ariaLabel="Weekly gap" yFormat={fmtGap} />);
    expect(container.querySelector('path[data-series="gap"]')?.getAttribute('d')?.match(/M/g)).toHaveLength(2);
    expect(texts(container, '[data-x-label]')).toEqual(['Sep 7', 'Sep 14', 'Sep 21']);
    await userEvent.tab();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', 'Sep 14: — mean gap');
  });

  it('gives a point with no neighbours a dot of its own', () => {
    // Searches has every day, so Lonely's Sep 26 and Sep 28 stand alone; Sep 30 has its end dot.
    const lonely = seriesOf('lonely', 'Lonely', ADMIN_COLORS.under, [5, null, 7, null, 9]);
    const {container} = render(<LineChart series={[SEARCHES, lonely]} ariaLabel="Events per day" />);
    expect(container.querySelectorAll('circle[data-lone="lonely"]')).toHaveLength(2);
    expect(container.querySelectorAll('circle[data-lone="searches"]')).toHaveLength(0);
  });

  it('draws a one-point series: one end dot, one x label, a one-position slider', () => {
    const one = seriesOf('s', 'Searches', ADMIN_COLORS.accent, [5], ['2026-09-30']);
    const {container} = render(<LineChart series={[one]} ariaLabel="Events per day" />);
    expect(container.querySelectorAll('circle[data-end]')).toHaveLength(1);
    expect(container.querySelectorAll('circle[data-lone]')).toHaveLength(0);
    expect(texts(container, '[data-x-label]')).toEqual(['Sep 30']);
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemax', '0');
    expect(container.querySelector('path[data-series="s"]')?.getAttribute('d')).not.toMatch(/NaN/);
  });

  it('washes each series down to zero at about 10% only when asked', () => {
    const {container, rerender} = render(<LineChart series={[SEARCHES, VIEWS]} ariaLabel="Events per day" />);
    expect(container.querySelectorAll('path[data-area]')).toHaveLength(0);
    rerender(<LineChart series={[SEARCHES, VIEWS]} ariaLabel="Events per day" area />);
    const wash = container.querySelector('path[data-area="searches"]');
    expect(wash).toHaveAttribute('fill', ADMIN_COLORS.accent);
    expect(wash).toHaveAttribute('fill-opacity', '0.1');
    // The plot's floor is y 188 (8 + 180): the wash closes along it.
    expect(wash?.getAttribute('d')).toMatch(/^M20,188L20,/);
  });

  it('prints each series’ last value at the right end, unless the labels would collide', () => {
    const {container, rerender} = render(<LineChart series={[SEARCHES, VIEWS]} ariaLabel="Events per day" />);
    expect(texts(container, '[data-end-label]')).toEqual(['40', '18']);
    for (const label of container.querySelectorAll('[data-end-label]')) expect(label).toHaveAttribute('fill', ADMIN_COLORS.text);
    const close = seriesOf('close', 'Close', ADMIN_COLORS.under, [5, 8, 9, 12, 39]);
    rerender(<LineChart series={[SEARCHES, close]} ariaLabel="Events per day" />);
    expect(container.querySelectorAll('[data-end-label]')).toHaveLength(0);
  });

  it('labels the first, quarter and last days by default, or the days it is given', () => {
    const nine = Array.from({length: 9}, (_, i) => `2026-09-0${i + 1}`);
    const s = seriesOf('s', 'S', ADMIN_COLORS.accent, [1, 2, 3, 4, 5, 6, 7, 8, 9], nine);
    const {container, rerender} = render(<LineChart series={[s]} ariaLabel="Events per day" />);
    expect(texts(container, '[data-x-label]')).toEqual(['Sep 1', 'Sep 3', 'Sep 5', 'Sep 7', 'Sep 9']);
    rerender(<LineChart series={[s]} ariaLabel="Events per day" xTicks={['2026-09-02', '2026-09-09', 'not here']} />);
    expect(texts(container, '[data-x-label]')).toEqual(['Sep 2', 'Sep 9']);
  });

  it('keeps any x that is not a day in the order given', () => {
    const rounds: LineSeries = {
      id: 'r',
      label: 'Votes',
      color: ADMIN_COLORS.accent,
      points: [
        {x: 'W1', y: 3},
        {x: 'W2', y: 5},
        {x: 'W10', y: 4},
      ],
    };
    const {container} = render(<LineChart series={[rounds]} ariaLabel="Votes per round" />);
    expect(texts(container, '[data-x-label]')).toEqual(['W1', 'W2', 'W10']);
  });

  it('shows the empty text in place of the plot when there are no points', () => {
    const {container} = render(
      <LineChart series={[{...SEARCHES, points: []}]} ariaLabel="Events per day" emptyText="No events in the window." />,
    );
    expect(screen.getByText('No events in the window.')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });
});

describe('LineChart: axis and baseline', () => {
  it('runs the y axis from 0 to a clean top', () => {
    const {container} = render(<LineChart series={[SEARCHES, VIEWS]} ariaLabel="Events per day" />);
    expect(texts(container, 'svg > g > text')).toEqual(['0', '20', '40']);
  });

  it('charts an all-zero series on a bare 0 to 1 axis', () => {
    const {container} = render(
      <LineChart series={[seriesOf('z', 'Searches', ADMIN_COLORS.accent, [0, 0, 0, 0, 0])]} ariaLabel="Events per day" />,
    );
    expect(texts(container, 'svg > g > text')).toEqual(['0', '1']);
  });

  it('spans zero for signed data and draws a labelled baseline', () => {
    const gaps = seriesOf('gap', 'Mean gap', ADMIN_COLORS.accent, [-0.5, 0.3, 1.2]);
    const {container} = render(
      <LineChart series={[gaps]} ariaLabel="Weekly gap" yFormat={fmtGap} baseline={0} baselineLabel="No gap" />,
    );
    expect(texts(container, 'svg > g:not([data-baseline]) > text')).toEqual(['−0.50', '0.00', '+1.20']);
    const baseline = container.querySelector('g[data-baseline]');
    expect(baseline?.querySelector('line')).toHaveAttribute('stroke', ADMIN_COLORS.strongBorder);
    expect(baseline?.querySelector('text')).toHaveTextContent('No gap');
  });

  it('labels the baseline with its value by default, and keeps an all-negative axis on whole numbers', () => {
    const drop = seriesOf('drop', 'Drop', ADMIN_COLORS.over, [-3, -1]);
    const {container} = render(<LineChart series={[drop]} ariaLabel="Drop" baseline={0} />);
    expect(texts(container, 'svg > g:not([data-baseline]) > text')).toEqual(['−3', '0']);
    expect(container.querySelector('g[data-baseline] text')).toHaveTextContent('0');
  });
});

describe('LineChart: crosshair, tooltip and keyboard', () => {
  it('snaps the crosshair to the nearest day and lists every series there', () => {
    const {container} = render(<LineChart series={[SEARCHES, VIEWS]} ariaLabel="Events per day" />);
    const slider = screen.getByRole('slider', {name: 'Events per day'});
    placePlot(slider);
    // Days sit at x 20, 169.5, 319, 468.5 and 618: 359 is nearest Sep 28.
    fireEvent.pointerMove(slider, {clientX: 359});

    expect(container.querySelector('[data-cursor]')).toHaveAttribute('data-cursor', '2');
    const shown = tip(container)!;
    expect(within(shown).getByText('Sep 28')).toBeInTheDocument();
    expect(shown).toHaveTextContent(/30Searches—Card views$/);
    // A marker rides each series that has a point there.
    expect(container.querySelectorAll('circle[data-marker]')).toHaveLength(1);

    fireEvent.pointerMove(slider, {clientX: 600});
    expect(container.querySelector('[data-cursor]')).toHaveAttribute('data-cursor', '4');
    expect(container.querySelectorAll('circle[data-marker]')).toHaveLength(2);

    fireEvent.pointerLeave(slider);
    expect(tip(container)).toBeNull();
    expect(container.querySelector('[data-cursor]')).toBeNull();
  });

  it('places days by time, so a gap in the dates keeps its width', () => {
    const days = ['2026-09-01', '2026-09-02', '2026-09-10'];
    const s = seriesOf('s', 'Searches', ADMIN_COLORS.accent, [1, 2, 3], days);
    const {container} = render(<LineChart series={[s]} ariaLabel="Events per day" />);
    const slider = screen.getByRole('slider');
    placePlot(slider);
    // 60% across the plot is nearer Sep 10 (the right end) than Sep 2 (1/9 of the way).
    fireEvent.pointerMove(slider, {clientX: 380});
    expect(within(tip(container)!).getByText('Sep 10')).toBeInTheDocument();
  });

  it('walks the days with the keyboard, reading the same text as the tooltip', async () => {
    const {container} = render(<LineChart series={[SEARCHES, VIEWS]} ariaLabel="Events per day" />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuetext', 'Sep 30: 40 Searches, 18 Card views');

    await userEvent.tab();
    expect(within(tip(container)!).getByText('Sep 30')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowLeft}');
    expect(slider).toHaveAttribute('aria-valuetext', 'Sep 29: 25 Searches, 12 Card views');
    await userEvent.keyboard('{ArrowLeft}');
    expect(slider).toHaveAttribute('aria-valuetext', 'Sep 28: 30 Searches, — Card views');
    await userEvent.keyboard('{Home}');
    expect(within(tip(container)!).getByText('Sep 26')).toBeInTheDocument();
    await userEvent.keyboard('{End}');
    expect(container.querySelector('[data-cursor]')).toHaveAttribute('data-cursor', '4');
  });

  it('keys each tooltip row with its series colour', async () => {
    const {container} = render(<LineChart series={[SEARCHES, VIEWS]} ariaLabel="Events per day" />);
    await userEvent.tab();
    const shown = tip(container)!;
    expect(within(shown).getByText('40').previousElementSibling).toHaveStyle({background: ADMIN_COLORS.accent});
    expect(within(shown).getByText('18').previousElementSibling).toHaveStyle({background: ADMIN_COLORS.under});
  });
});
```

- [ ] **Step 26: Run it and see it fail**

Run: `pnpm vitest run src/charts/__tests__/LineChart.test.tsx`
Expected: FAIL, with `Failed to resolve import "../LineChart" from "src/charts/__tests__/LineChart.test.tsx". Does the file exist?`

- [ ] **Step 27: Write `src/charts/LineChart.tsx`**

```tsx
import {useRef} from 'react';
import {SPACING, useContainerWidth} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';
import {fmtDay, fmtInt} from '../ui/format';
import {ChartTooltip, type TooltipContent} from './ChartTooltip';
import {axisTicks, dayIndex, isDay, linear, niceCeiling, textWidth} from './scale';
import {CHART_FALLBACK_WIDTH, SURFACE_GAP, tooltipText, type SeriesDef} from './series';
import {useChartCursor} from './useChartCursor';

export interface LinePoint {
  x: string;
  /** Null keeps the x on the axis with no value there (a quiet week): the line breaks and the tooltip shows "—". */
  y: number | null;
}

export interface LineSeries extends SeriesDef {
  /**
   * Days ('YYYY-MM-DD') in any order; any other x in the order to draw it. A
   * series that skips an x another series has breaks its line there.
   */
  points: readonly LinePoint[];
}

interface LineChartProps {
  series: readonly LineSeries[];
  /** Names the plot's slider. */
  ariaLabel: string;
  /** The plot's height in px, without the x-label band (default 180). */
  height?: number;
  /** A ~10% wash of each series' colour between its line and zero. */
  area?: boolean;
  /** Axis ticks, end labels and tooltip values (default fmtInt). */
  yFormat?: (n: number) => string;
  /** X labels and tooltip titles (default fmtDay, which leaves a non-day as it is). */
  xFormat?: (x: string) => string;
  /** The x values to label. Default: the first, the quarter points and the last. */
  xTicks?: readonly string[];
  /** A labelled hairline at this value, inside the y domain (R2: zero gap). */
  baseline?: number;
  /** The baseline's label (default: yFormat(baseline)). */
  baselineLabel?: string;
  /** Shown in place of the plot when no series has a point. */
  emptyText?: string;
}

const DEFAULT_HEIGHT = 180;
const LABEL_SIZE = ADMIN_TYPE.micro;
/** Room above the plot for the top tick label. */
const TOP_PAD = SPACING.sm;
const X_BAND = SPACING.xl;
const TICK_GAP = SPACING.sm;
const RIGHT_PAD = SPACING.sm;
/** Dataviz mark spec: 2px lines, markers of r 4 with a 2px surface ring, area washes at about 10%. */
const LINE_WIDTH = 2;
const DOT_RADIUS = 4;
const RING = 2;
const AREA_OPACITY = 0.1;

/**
 * A marker's 2px ring in the chart's surface colour: the card over the page, as
 * a Panel paints it. `card` is translucent, so the ring is two discs, the page
 * and then the card, under the dot. A stroke in either would read darker than
 * the surface, or vanish.
 */
function SurfaceRing({cx, cy}: {cx?: number; cy?: number}) {
  return (
    <>
      <circle cx={cx} cy={cy} r={DOT_RADIUS + RING} fill={ADMIN_COLORS.page} />
      <circle cx={cx} cy={cy} r={DOT_RADIUS + RING} fill={ADMIN_COLORS.card} />
    </>
  );
}

function px(n: number): number {
  return Math.round(n * 100) / 100;
}

/** The y ticks: 0 / middle / top for one sign, bottom / 0 / top across zero, whole numbers for whole data. */
function yTicks(bottom: number, top: number, integers: boolean): number[] {
  if (bottom < 0 && top > 0) return [bottom, 0, top];
  const span = top > 0 ? top : -bottom;
  let ticks = axisTicks(span);
  if (integers && !ticks.every(Number.isInteger)) ticks = axisTicks(span, 2);
  return top > 0 ? ticks : ticks.map((t) => (t === 0 ? 0 : -t)).reverse();
}

/** An SVG path through the points, starting a new subpath after every gap. */
function linePath(points: ReadonlyArray<{x: number; y: number} | null>): string {
  let d = '';
  let pen = false;
  for (const point of points) {
    if (point == null) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${px(point.x)},${px(point.y)}`;
    pen = true;
  }
  return d;
}

/** The wash under each unbroken run, closed along the zero line. */
function areaPath(points: ReadonlyArray<{x: number; y: number} | null>, zero: number): string {
  const runs: Array<Array<{x: number; y: number}>> = [];
  let run: Array<{x: number; y: number}> = [];
  for (const point of points) {
    if (point == null) {
      if (run.length) runs.push(run);
      run = [];
    } else {
      run.push(point);
    }
  }
  if (run.length) runs.push(run);
  return runs
    .filter((r) => r.length > 1)
    .map((r) => `M${px(r[0].x)},${px(zero)}${r.map((p) => `L${px(p.x)},${px(p.y)}`).join('')}L${px(r[r.length - 1].x)},${px(zero)}Z`)
    .join('');
}

/** The default x labels: the first, the quarter points and the last, without repeats. */
function defaultTicks(xs: readonly string[]): string[] {
  const n = xs.length;
  return [...new Set([0, 0.25, 0.5, 0.75, 1].map((f) => xs[Math.round(f * (n - 1))]))];
}

/**
 * One or more series over the same x, usually days, with an optional area
 * wash and a crosshair (docs/plans/R-redesign.md, Chart kit). One y axis
 * only: two measures of different scale are two charts (dataviz).
 *
 * Days ('YYYY-MM-DD') are placed by time, so a missing day shows as a gap
 * rather than squeezing the line; any other x is spaced evenly. The y domain
 * always includes zero (and the baseline). Each series ends in a dot with a
 * 2px surface ring, and its last value is printed beside it unless the end
 * labels would collide, when the legend and the tooltip carry them.
 *
 * The plot is a slider (useChartCursor): the crosshair snaps to the nearest x
 * under the pointer, ←/→, Home and End move it, and the tooltip lists every
 * series at that x, with "—" for one that has no point there.
 */
export function LineChart({
  series,
  ariaLabel,
  height = DEFAULT_HEIGHT,
  area = false,
  yFormat = fmtInt,
  xFormat = fmtDay,
  xTicks,
  baseline,
  baselineLabel,
  emptyText = 'No data to chart.',
}: LineChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measured = useContainerWidth(wrapRef);
  const seen = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))];
  // Days go into time order; any other x keeps the order the series give it.
  const byTime = seen.length > 0 && seen.every(isDay);
  const xs = byTime ? seen.sort() : seen;
  const n = xs.length;
  const cursor = useChartCursor(n);

  const width = measured > 0 ? measured : CHART_FALLBACK_WIDTH;
  const indexOf = new Map(xs.map((x, i) => [x, i]));
  const values = series.map((s) => {
    const row: Array<number | null> = xs.map(() => null);
    for (const p of s.points) if (Number.isFinite(p.y)) row[indexOf.get(p.x) ?? 0] = p.y;
    return row;
  });
  const all = values.flat().filter((v): v is number => v != null);
  const hi = Math.max(0, ...all, baseline ?? 0);
  const lo = Math.min(0, ...all, baseline ?? 0);
  const top = hi > 0 ? niceCeiling(hi) : lo < 0 ? 0 : 1;
  const bottom = lo < 0 ? -niceCeiling(-lo) : 0;
  const integers = all.every(Number.isInteger) && (baseline == null || Number.isInteger(baseline));
  const ticks = yTicks(bottom, top, integers);
  const tickLabels = ticks.map(yFormat);

  // End labels: each series that reaches the last x prints its last value, unless two would collide.
  const plotTop = TOP_PAD;
  const plotBottom = plotTop + height;
  const y = linear([bottom, top], [plotBottom, plotTop]);
  const ends = series.flatMap((s, si) => {
    const v = values[si][n - 1];
    return v == null ? [] : [{id: s.id, text: yFormat(v), y: y(v)}];
  });
  const sortedEnds = [...ends].sort((a, b) => a.y - b.y);
  const endsCollide = sortedEnds.some((e, i) => i > 0 && e.y - sortedEnds[i - 1].y < LABEL_SIZE + SURFACE_GAP);
  const endLabels = endsCollide ? [] : ends;
  const endRoom = endLabels.length
    ? Math.max(...endLabels.map((e) => textWidth(e.text, LABEL_SIZE))) + DOT_RADIUS + RING + SPACING.xs
    : 0;

  const left = Math.ceil(Math.max(...tickLabels.map((t) => textWidth(t, LABEL_SIZE)))) + TICK_GAP;
  const right = Math.max(RIGHT_PAD, Math.ceil(endRoom));
  const plotWidth = Math.max(width - left - right, 1);
  const svgHeight = plotBottom + X_BAND;
  const positions = xs.map((x, i) => (byTime ? (dayIndex(x) ?? i) : i));
  const xScale = linear([positions[0] ?? 0, positions[n - 1] ?? 0], [left, left + plotWidth]);
  const xPx = positions.map(xScale);
  const points = values.map((row) => row.map((v, i) => (v == null ? null : {x: xPx[i], y: y(v)})));
  const zero = y(0);

  const contentAt = (i: number): TooltipContent => ({
    title: xFormat(xs[i]),
    rows: series.map((s, si) => {
      const v = values[si][i];
      return {label: s.label, value: v == null ? '—' : yFormat(v), color: s.color};
    }),
  });

  // X labels: drop any that would overlap the one before; the last always stays.
  const tickIndexes = (xTicks ?? defaultTicks(xs)).map((x) => indexOf.get(x)).filter((i): i is number => i != null);
  const xLabels: Array<{index: number; x: number; text: string; width: number}> = [];
  for (const index of [...new Set(tickIndexes)].sort((a, b) => a - b)) {
    const text = xFormat(xs[index]);
    const labelWidth = textWidth(text, LABEL_SIZE);
    const label = {index, text, width: labelWidth, x: Math.min(Math.max(xPx[index], labelWidth / 2), width - labelWidth / 2)};
    const before = xLabels.at(-1);
    if (before && label.x - before.x < (label.width + before.width) / 2 + SPACING.sm) {
      if (index !== n - 1) continue;
      xLabels.pop();
    }
    xLabels.push(label);
  }

  const active = cursor.index;
  const activePoints = active == null ? [] : points.map((row) => row[active]);
  const tipY = Math.min(...activePoints.filter((p) => p != null).map((p) => p.y), plotBottom);

  if (n === 0) {
    return (
      <div ref={wrapRef} style={{minWidth: 0}}>
        <p style={{margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>{emptyText}</p>
      </div>
    );
  }

  return (
    <div ref={wrapRef} style={{minWidth: 0}}>
      <div
        className="adm-chart-plot"
        aria-label={ariaLabel}
        {...cursor.plotProps((i) => tooltipText(contentAt(i)), xPx)}
        style={{position: 'relative', height: svgHeight}}>
        <svg
          aria-hidden="true"
          width={width}
          height={svgHeight}
          viewBox={`0 0 ${width} ${svgHeight}`}
          style={{position: 'absolute', top: 0, left: 0, display: 'block', maxWidth: '100%', height: 'auto', pointerEvents: 'none'}}>
          {ticks.map((tick, i) => (
            <g key={tick}>
              <line
                x1={left}
                x2={left + plotWidth}
                y1={px(y(tick))}
                y2={px(y(tick))}
                stroke={tick === 0 ? ADMIN_COLORS.border : ADMIN_COLORS.divider}
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
              <text
                x={left - TICK_GAP}
                y={px(y(tick))}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={LABEL_SIZE}
                fill={ADMIN_COLORS.muted}
                style={{fontVariantNumeric: 'tabular-nums'}}>
                {tickLabels[i]}
              </text>
            </g>
          ))}
          {baseline != null && (
            <g data-baseline>
              <line
                x1={left}
                x2={left + plotWidth}
                y1={px(y(baseline))}
                y2={px(y(baseline))}
                stroke={ADMIN_COLORS.strongBorder}
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
              <text x={left + SPACING.xs} y={px(y(baseline) - SPACING.xs)} fontSize={LABEL_SIZE} fill={ADMIN_COLORS.muted}>
                {baselineLabel ?? yFormat(baseline)}
              </text>
            </g>
          )}
          {area &&
            series.map((s, si) => (
              <path
                key={s.id}
                className="adm-chart-area"
                data-area={s.id}
                d={areaPath(points[si], zero)}
                fill={s.color}
                fillOpacity={AREA_OPACITY}
              />
            ))}
          {series.map((s, si) => (
            <path
              key={s.id}
              className="adm-chart-line"
              data-series={s.id}
              d={linePath(points[si])}
              pathLength={1}
              fill="none"
              stroke={s.color}
              strokeWidth={LINE_WIDTH}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {series.map((s, si) => {
            // A point with no neighbour on either side draws no line, so it gets a dot.
            const row = points[si];
            return row.map((p, i) =>
              p != null && row[i - 1] == null && row[i + 1] == null && i !== n - 1 ? (
                <circle key={`${s.id}-${i}`} data-lone={s.id} cx={px(p.x)} cy={px(p.y)} r={DOT_RADIUS} fill={s.color} />
              ) : null,
            );
          })}
          {series.map((s, si) => {
            const p = points[si].filter((point) => point != null).at(-1);
            return p ? (
              <g key={s.id} className="adm-chart-label">
                <SurfaceRing cx={px(p.x)} cy={px(p.y)} />
                <circle data-end={s.id} cx={px(p.x)} cy={px(p.y)} r={DOT_RADIUS} fill={s.color} />
              </g>
            ) : null;
          })}
          {endLabels.map((e) => (
            <text
              key={e.id}
              className="adm-chart-label"
              data-end-label={e.id}
              x={px(left + plotWidth + DOT_RADIUS + RING + SPACING.xs)}
              y={px(e.y)}
              dominantBaseline="middle"
              fontSize={LABEL_SIZE}
              fill={ADMIN_COLORS.text}
              style={{fontVariantNumeric: 'tabular-nums'}}>
              {e.text}
            </text>
          ))}
          {xLabels.map((label) => (
            <text
              key={label.index}
              data-x-label
              x={px(label.x)}
              y={plotBottom + X_BAND - SPACING.xs}
              textAnchor="middle"
              fontSize={LABEL_SIZE}
              fill={ADMIN_COLORS.muted}>
              {label.text}
            </text>
          ))}
          {active != null && (
            <>
              <g className="adm-chart-cursor" data-cursor={active} style={{transform: `translateX(${px(xPx[active])}px)`}}>
                <line x1={0} x2={0} y1={plotTop} y2={plotBottom} stroke={ADMIN_COLORS.strongBorder} strokeWidth={1} />
              </g>
              {activePoints.map((p, si) =>
                p == null ? null : (
                  <g
                    key={series[si].id}
                    className="adm-chart-cursor"
                    style={{transform: `translate(${px(p.x)}px, ${px(p.y)}px)`}}>
                    <SurfaceRing />
                    <circle data-marker={series[si].id} r={DOT_RADIUS} fill={series[si].color} />
                  </g>
                ),
              )}
            </>
          )}
        </svg>
        <ChartTooltip
          content={active == null ? null : contentAt(active)}
          x={active == null ? 0 : xPx[active]}
          y={tipY}
          bounds={{width, height: svgHeight}}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 28: Run the test and see it pass**

Run: `pnpm vitest run src/charts/__tests__/LineChart.test.tsx`
Expected: PASS, `Tests 18 passed (18)`.

- [ ] **Step 29: Write the stories, `src/charts/Charts.stories.tsx`**

`.storybook/main.ts` picks the file up through `../src/**/*.stories.@(ts|tsx)`. The decorator paints the admin page only. `.storybook/preview.tsx` mounts `AdminStyles` for every story (R1-2 Step 9), so the decorator doesn't.

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {FONTS, SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';
import {gapColor} from '../tools/analytics/gapColor';
import {fmtDay, fmtGap, fmtInt} from '../ui/format';
import {Panel} from '../ui/Panel';
import {BarChart, type BarDatum} from './BarChart';
import {ChartFrame, type ChartTable} from './ChartFrame';
import {ChartLegend} from './ChartLegend';
import {LineChart, type LineSeries} from './LineChart';
import {RangeControl} from './RangeControl';
import {bucketFor, rangeStartDay, type RangePreset} from './range';
import {addDays, eachDay, weekStart} from './scale';
import type {SeriesDef} from './series';

const meta: Meta = {
  title: 'Admin/Charts',
  parameters: {layout: 'fullscreen'},
  // The admin page: background, text colour and body font. .storybook/preview.tsx
  // mounts AdminStyles for every story, so the adm-* chart classes are there.
  // ChartFrame draws no surface, so each story puts it in an untitled Panel, as the pages do.
  decorators: [
    (Story) => (
      <div
        style={{
          minHeight: '100vh',
          padding: SPACING.xxxl,
          background: ADMIN_COLORS.page,
          color: ADMIN_COLORS.text,
          fontFamily: FONTS.body,
        }}>
        <div style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: SPACING.xl, maxWidth: 960}}>
          <Story />
        </div>
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj;

const LAST_DAY = '2026-09-30';
const FIRST_DAY = addDays(LAST_DAY, -119);

const BANDS: SeriesDef[] = [
  {id: 'high', label: '7+', color: ADMIN_COLORS.under},
  {id: 'mid', label: '5–6', color: ADMIN_COLORS.barNeutral},
  {id: 'low', label: '≤4', color: ADMIN_COLORS.over},
  {id: 'unscored', label: 'No score', color: ADMIN_COLORS.muted, pattern: 'hatch'},
];
/** The tooltip's band rows, which read after a number ("5 scored 7+"), as R1-9's do. The legend and the table keep BANDS' labels. */
const BAND_ROW_LABELS: Record<string, string> = {
  high: 'scored 7+',
  mid: 'scored 5–6',
  low: 'scored ≤4',
  unscored: 'with no score',
};

/** Day i's band counts: deterministic, with a quiet day every eleventh. */
function bandsOn(i: number): Record<string, number> {
  if (i % 11 === 4) return {};
  return {high: (i * 7) % 9, mid: (i * 5) % 6, low: (i * 3) % 4, unscored: i % 3 === 0 ? 2 : 0};
}

/** 120 days of band counts, ending on LAST_DAY. */
const DAILY: BarDatum[] = eachDay(FIRST_DAY, LAST_DAY).map((day, i) => ({key: day, label: fmtDay(day), values: bandsOn(i)}));

const sum = (d: BarDatum) => Object.values(d.values).reduce((total, v) => total + v, 0);
const bandOf = (d: BarDatum, id: string) => d.values[id] ?? 0;

/** The days from `start` on, or their Monday weeks when the span is over 90 days (R-9). */
function bucketed(start: string): {weekly: boolean; data: BarDatum[]} {
  const days = DAILY.filter((d) => d.key >= start);
  if (bucketFor(start, LAST_DAY) === 'day') return {weekly: false, data: days};
  const weeks = new Map<string, BarDatum>();
  for (const d of days) {
    const monday = weekStart(d.key);
    const week = weeks.get(monday) ?? {key: monday, label: fmtDay(monday), values: {}};
    for (const [band, v] of Object.entries(d.values)) week.values[band] = (week.values[band] ?? 0) + v;
    weeks.set(monday, week);
  }
  return {weekly: true, data: [...weeks.values()]};
}

function bandTooltip(weekly: boolean) {
  return (d: BarDatum) => ({
    title: weekly ? `Week of ${d.label}` : d.label,
    rows: [
      {label: 'votes', value: fmtInt(sum(d))},
      ...BANDS.map((band) => ({label: BAND_ROW_LABELS[band.id], value: fmtInt(bandOf(d, band.id)), color: band.color})),
    ],
  });
}

function bandTable(data: BarDatum[], weekly: boolean): ChartTable {
  return {
    caption: `Votes per ${weekly ? 'week' : 'day'}, by score band`,
    columns: [weekly ? 'Week of' : 'Day', 'Votes', ...BANDS.map((band) => band.label)],
    rows: data.map((d) => [d.label, fmtInt(sum(d)), ...BANDS.map((band) => fmtInt(bandOf(d, band.id)))]),
  };
}

function StackedDemo() {
  const [range, setRange] = useState<RangePreset>('30d');
  const [picked, setPicked] = useState<string | null>(null);
  const start = rangeStartDay(range, LAST_DAY, FIRST_DAY);
  const {weekly, data} = bucketed(start);
  return (
    <>
      {/* The filter row: one row, above everything it scopes. */}
      <div style={{display: 'flex', flexWrap: 'wrap', gap: SPACING.md}}>
        <RangeControl
          value={range}
          onChange={(v) => {
            setRange(v);
            setPicked(null);
          }}
        />
      </div>
      <Panel>
        <ChartFrame
          title={weekly ? 'Votes per week' : 'Votes per day'}
          subtitle={`${fmtDay(start)} – ${fmtDay(LAST_DAY)}. Pick a bar to filter the log; pick it again to clear.`}
          legend={<ChartLegend series={BANDS} mark="rect" />}
          table={bandTable(data, weekly)}>
          <BarChart
            data={data}
            series={BANDS}
            ariaLabel={weekly ? 'Votes per week' : 'Votes per day'}
            tooltip={bandTooltip(weekly)}
            selectedKey={picked}
            onSelect={setPicked}
          />
        </ChartFrame>
      </Panel>
      <p style={{margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>
        Picked: {picked ? fmtDay(picked) : 'none'}
      </p>
    </>
  );
}

/** Stacked score bands with the range control above, and bars that pick a day. "All" (120 days) charts per week. */
export const StackedWithSelection: Story = {render: () => <StackedDemo />};

const WEEKS: BarDatum[] = Array.from({length: 12}, (_, i) => {
  const monday = addDays('2026-07-13', i * 7);
  return {key: monday, label: fmtDay(monday), values: {votes: 40 + ((i * 37) % 90)}};
});
const WEEK_GAPS = [-0.42, 0.18, null, -0.9, 0.05, 0.31, -0.12, 0.66, -0.3, 0, 0.83, -0.57];
const gapOf = (d: BarDatum) => WEEK_GAPS[WEEKS.indexOf(d)] ?? null;
const VOTES: SeriesDef[] = [{id: 'votes', label: 'Votes', color: ADMIN_COLORS.barNeutral}];

/** One series in emphasis: the newest week in the accent, each week's mean gap under its label (the Overview). */
export const SingleSeriesEmphasis: Story = {
  render: () => {
    const latest = WEEKS[WEEKS.length - 1];
    return (
      <Panel>
        <ChartFrame
          title="Weekly activity"
          subtitle="Monday weeks; the last runs through the latest vote."
          table={{
            caption: 'Votes and mean gap per week',
            columns: ['Week of', 'Votes', 'Mean gap'],
            rows: WEEKS.map((d) => [d.label, fmtInt(d.values.votes), fmtGap(gapOf(d))]),
          }}>
          <BarChart
            data={WEEKS}
            series={VOTES}
            ariaLabel="Weekly activity"
            emphasisKey={latest.key}
            tooltip={(d) => ({
              title: `Week of ${d.label}`,
              rows: [
                {label: 'votes', value: fmtInt(d.values.votes)},
                {label: 'mean gap', value: fmtGap(gapOf(d))},
              ],
            })}
            subLabel={(d) => ({text: fmtGap(gapOf(d)), color: gapColor(gapOf(d))})}
          />
        </ChartFrame>
      </Panel>
    );
  },
};

const TREND_DAYS = eachDay('2026-09-01', LAST_DAY);
const EVENTS: LineSeries[] = [
  {
    id: 'searches',
    label: 'Searches',
    color: ADMIN_COLORS.accent,
    points: TREND_DAYS.map((x, i) => ({x, y: 120 + ((i * 37) % 60) + i * 2})),
  },
  {
    id: 'views',
    label: 'Card views',
    color: ADMIN_COLORS.under,
    points: TREND_DAYS.map((x, i) => ({x, y: 40 + ((i * 23) % 35)})),
  },
];

function eventsTable(series: readonly LineSeries[]): ChartTable {
  return {
    caption: 'Events per day, Sep 1 – Sep 30',
    columns: ['Day', ...series.map((s) => s.label)],
    rows: TREND_DAYS.map((day, i) => [fmtDay(day), ...series.map((s) => fmtInt(s.points[i].y ?? 0))]),
  };
}

/** Two series with the area wash: crosshair, every series in the tooltip, end labels, and the legend. */
export const LineTwoSeriesArea: Story = {
  render: () => (
    <Panel>
      <ChartFrame
        title="Events per day"
        subtitle="Reporting window Sep 1 – Sep 30"
        legend={<ChartLegend series={EVENTS} mark="line" />}
        table={eventsTable(EVENTS)}>
        <LineChart series={EVENTS} ariaLabel="Events per day" area />
      </ChartFrame>
    </Panel>
  ),
};

const GAP_TREND: LineSeries[] = [
  {
    id: 'gap',
    label: 'Mean gap',
    color: ADMIN_COLORS.accent,
    // The quiet week keeps its place on the axis with a null value, so the line breaks there.
    points: WEEKS.map((d) => ({x: d.key, y: gapOf(d)})),
  },
];

/** A signed series on one axis through zero, with the labelled baseline (R2's weekly gap trend). The quiet week breaks the line. */
export const LineWithBaseline: Story = {
  render: () => (
    <Panel>
      <ChartFrame
        title="Weekly gap"
        subtitle="Community minus engine, per Monday week"
        table={{
          caption: 'Mean gap per week',
          columns: ['Week of', 'Mean gap'],
          rows: WEEKS.map((d) => [d.label, fmtGap(gapOf(d))]),
        }}>
        <LineChart series={GAP_TREND} ariaLabel="Weekly gap" yFormat={fmtGap} baseline={0} baselineLabel="No gap" />
      </ChartFrame>
    </Panel>
  ),
};

/** The Chart | Table toggle opened on the table: the accessible twin every chart carries. */
export const TableView: Story = {
  render: () => (
    <Panel>
      <ChartFrame
        title="Events per day"
        legend={<ChartLegend series={EVENTS} mark="line" />}
        table={eventsTable(EVENTS)}
        defaultView="table">
        <LineChart series={EVENTS} ariaLabel="Events per day" />
      </ChartFrame>
    </Panel>
  ),
};

/** Empty and all-zero data: the empty text, and a bare 0 to 1 axis. */
export const EmptyStates: Story = {
  render: () => (
    <>
      <Panel>
        <ChartFrame title="Votes per day" table={{caption: 'Votes per day', columns: ['Day', 'Votes'], rows: []}}>
          <BarChart data={[]} series={BANDS} ariaLabel="Votes per day" tooltip={bandTooltip(false)} emptyText="No votes in this range." />
        </ChartFrame>
      </Panel>
      <Panel>
        <ChartFrame
          title="Votes per day"
          subtitle="A quiet week"
          table={bandTable(DAILY.slice(0, 7).map((d) => ({...d, values: {}})), false)}>
          <BarChart
            data={DAILY.slice(0, 7).map((d) => ({...d, values: {}}))}
            series={BANDS}
            ariaLabel="Votes per day"
            tooltip={bandTooltip(false)}
          />
        </ChartFrame>
      </Panel>
    </>
  ),
};
```

- [ ] **Step 30: Look at the charts in Storybook**

The validator checks colour, not layout, so look at the rendered charts. Run `pnpm storybook`, open `http://localhost:6007` and go to **Admin/Charts**.
- **StackedWithSelection:**
  - Bars are at most 24px thick, with 2px gaps between segments and rounded tops only. "No score" shows 45° stripes, in the legend too.
  - Only the newest and the highest totals print.
  - Hover a bar: its column tints, the bar brightens and the tooltip follows. The tooltip stays inside the plot at both ends. Its band rows read "scored 7+", "scored 5–6", "scored ≤4" and "with no score", while the legend and the table keep "7+" to "No score".
  - Click a bar: its column turns gold-tinted and the other bars drop to 40%. Click it again to clear.
  - Tab lands on the newest bar. ←/→ move a gold ring inside the columns, Escape hides the tooltip, and the ring stays bright on a bar that isn't picked.
  - Switch the range: 7, 30 and 90 days chart per day, and All (120 days) charts per Monday week as "Votes per week". The pick clears.
  - The Table toggle shows every day's bands.
- **SingleSeriesEmphasis:** the newest week is gold and the rest grey. Each week's gap sits under its label in red, green or muted, with the quiet week's "—".
- **LineTwoSeriesArea:**
  - The lines draw in and the washes fade in.
  - The crosshair snaps from day to day, and the tooltip lists both series, value first, with line keys.
  - "Searches" and "Card views" end in ringed dots with their last values beside them, and the legend shows line keys. The ring is the card's own colour, not a darker halo, and the crosshair's markers match it.
- **LineWithBaseline:** the axis reads −1.00, 0.00 and +1.00. "No gap" labels the zero line, and the quiet week breaks the line.
- **TableView:** a real table with a caption, column headers and a row header per day.
- **EmptyStates:** the empty text, then a bare 0 to 1 axis with no marks and no cap labels.
- **Everywhere:**
  - Each frame sits in one card, its story's Panel: one border and one padding, never a card inside a card.
  - Set the viewport to 360px wide. Nothing overflows, labels thin out instead of overlapping, and no text is clipped.
  - In DevTools' Rendering panel, emulate `prefers-reduced-motion: reduce` and reload. Nothing rises, draws or glides.
  - The a11y addon shows no violations.

Stop Storybook before committing, because a running server starves the pre-commit Vitest workers.

- [ ] **Step 31: Lint, typecheck and run the suite**

Run: `pnpm lint`
Expected: no problems. The new files pass every `inkweave/*` rule and the jsx-a11y rules with no exception. Hexes appear only in tests and in `series.ts`'s comment, which the colour rules don't scan.

Run: `pnpm typecheck`
Expected: exits 0. The stories are typechecked too.

Run: `pnpm test:run`
Expected: every test file passes. That includes the 9 chart files (115 tests) and the 2 theme files (18 tests).

- [ ] **Step 32: Commit**

Run this with the Bash tool, and only after the owner approves:

```bash
git add src/charts src/theme/AdminStyles.tsx src/theme/__tests__/AdminStyles.test.tsx src/theme/__tests__/adminTheme.test.ts
USER_APPROVED=1 git commit -m "feat(charts): add the chart kit: frame, legend, tooltip, cursor, bar and line charts (#24)"
```

<!-- Review round 2026-10-01 (14 notes): all applied; parts of notes 2, 3, 5, 8, 9, 11, 12 and 13 were changed or taken by their other option, for these reasons.
- Note 2: the re-export goes into range.ts in Step 11, not Step 4. Step 5's scale and range tests load range.ts, and './RangeControl' can't resolve until Step 11 writes it. The "charts/range exports it" check is one assertion in the first RangeControl test, so the count holds, and the test still imports '../RangeControl', so Step 8 still fails on that import.
- Note 3: dropped ADMIN_RADIUS from ChartFrame's imports and `panel` from Consumes, but kept `border` and `card` in Consumes. BarChart's and LineChart's zero gridline still draws in `border`, and the note 13 ring draws in `card`.
- Note 5: the emphasis line opens `chartMarks` instead of closing it. R3 Step 9 quotes the record's last line and its close (`'No score stripes (muted)'` and `};`) as its own "before", which a line there would break. R1-9's edit, the comment above the record, is untouched either way.
- Note 8: the note's figure, COLUMN_MIN 40, still leaves a slot up to 12/n px short of 44 with R1-8's formula as written. The 8px right pad comes off the plot, and weeksThatFit counts n columns with only n − 1 gaps of air, while BarChart splits the plot into n equal slots. The R1-8 flag gives the count that does guarantee 44px slots.
- Note 9: no `gutters` prop. R2-4a already adds `fixedGutters`, with LINE_Y_AXIS_WIDTH and LINE_END_WIDTH (48px each), and `yDomain`. They come as quoted edits to Steps 25 and 27, with their tests, so the two stacked gap-trend charts line up through those. A second gutter prop here would duplicate that and break R2-4a's quoted `left` and `right` block. So this file takes the note's other option for both: Contract additions say R2-4a adds them, and list the blocks R2-4a quotes, which stay verbatim. The two new LineChart tests sit outside those blocks.
- Note 11: the one-point test counts `circle[data-end]` and `circle[data-lone]`, not every circle, because the note 13 ring adds two discs per dot.
- Note 12: implemented, not deferred. Exporting ChartView alone would break the `type ChartView` block that R3-6 quotes as its "before", so the frame takes R3-6's controlled-view code and its two tests word for word, and R3-6's conditional edits are skipped.
- Note 13: data-end and data-marker stay on the r 4 dot. The dot sits in a <g> with the page and card discs, rather than the attributes moving to the <g>, because R2-4a's fixedGutters test reads circle[data-end]'s cx. The <g> carries adm-chart-label, and for a marker it carries adm-chart-cursor and the transform.
- Found while checking the neighbours:
  - R3-6 now reads the frame as drawing its own card, so the "For R3" bullet tells it to wrap its two standalone frames in a Panel.
  - Note 6 changes R2-4a's ScatterChart Escape test, and note 11's two LineChart tests move R2-4a's Step 2 and 4 counts. The "For R2" bullet records both.
- Verified in a scratch copy of the reviewer's sandbox, with R1-3's Panel added for the stories:
  - 133 tests pass: 115 chart and 18 theme, with the emphasis line in R1-2's chartMarks.
  - `tsc` (strict, stories included) exits 0.
  - Every changed file passes `pnpm exec eslint --stdin` under its src/ path.
  - The two new cursor tests fail against the old hook.
  - R2-4a's nine "before" blocks and R3-6's nine "after" blocks are all found verbatim in this file, and R3 Step 9's "before" survives the chartMarks edit.
-->
