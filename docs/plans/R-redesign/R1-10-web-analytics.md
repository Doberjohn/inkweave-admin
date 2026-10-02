> Part of [R: Admin redesign](../R-redesign.md). Read its decisions, corrections to the spec, global constraints and shared interfaces first.

**Contract additions (R1-10)**

- **`webModel.ts` exports.** Next to the contract's `sortEventsByTotal` and `trendSummary`, `src/tools/analytics/web/webModel.ts` also exports `OTHERS_VALUE`, `fillTrendDays(trend, reportingWindow): TrendPoint[]`, `interface BreakdownShare` and `breakdownShares(rows): BreakdownShare[]`. `fillTrendDays` is the skeleton's "day-filling helper": `WebAnalyticsBody` runs every event's trend through it, so `trendSummary`, the sparklines, the chart, its axis labels and its table only ever see a trend with every day of the window.
- **Removed with the hand-drawn chart (R-12).** `chartCeiling`, `chartPoints` and `trendTicks` are gone. In the main plan's "Contract additions from the task drafts", the `src/tools/analytics/web/* (R1-10)` block should drop those three lines and gain `export function fillTrendDays(trend: TrendPoint[], reportingWindow: ReportingWindow | null): TrendPoint[];`, and its "(R1-10 also adds a day-filling helper…)" comment can go. The chart kit's `LineChart` replaces all three:
  - its own y axis (one axis, the kit's clean ceiling and ticks from 0) replaces `chartCeiling`'s "busiest day ×1.1, rounded up to an even number";
  - its own line, area wash and markers replace `chartPoints`' polyline;
  - its default x labels replace `trendTicks`' `{date, x}` pairs for hand-placed labels. The contract's default is the first point, the quarter points and the last, and the series' points already are the filled window, so the card passes no `xTicks` and the model has no tick helper.
- **Kept from the first draft.** `WebAnalyticsBody` still applies `fillTrendDays` to every event and orders the cards with `sortEventsByTotal`; the trend card reads `trendSummary` (the stats). `OTHERS_VALUE`, `BreakdownShare` and `breakdownShares` stay because the breakdowns didn't change. `fillTrendDays` now checks its days with the kit's `isDay` and steps them with its `eachDay`, instead of a local `isDay` and `nextDay`.
- **Bridge exports.** This task adds six exports to `src/app-bridge.ts`: `InkIcon`, `RaritySymbol`, `rarityConfigOf`, plus the three printing webps `enchantedSymbol`, `epicSymbol` and `iconicSymbol`. R3 and R4 reuse them. R4 adds only `InkwellIcon`.
- **Nav entry.** This task adds the `web` entry to `NAV_ITEMS`. The nav task should not add it too.
- **Assumptions about contract items (no renames).** If an earlier task built any of these differently, change the import or the primitive before this task runs:
  - `Notice tone="error"` renders `role="alert"`, as today's error states do.
  - `adm-card-btn` styles the whole card box as R1-2's class table defines it (a `<button>` can't take a `style`): flex column, gap 4, padding `16px 20px`, the `card` fill clipped to the padding box, a 1px `border` edge and the `panel` radius, `font: inherit` and left-aligned text. Hover gives an `accentBorder` edge. `[aria-pressed="true"]` gives the `accentTintSoft` fill and an `accentStrong` edge.
  - Each primitive is its own module: `src/ui/Panel.tsx`, `src/ui/MeterBar.tsx`, `src/ui/Notice.tsx`, `src/ui/Sparkline.tsx`.
  - `PageLayout` renders `title` as a heading.
  - `Sparkline` returns `null` below two points, and its svg is `aria-hidden` with no handlers.
  - The sidebar renders each `NAV_ITEMS` entry as a link whose accessible name contains its `label`, and the current one has `aria-current="page"`. The router test matches `/Web analytics/`, so the "Wa" mark may be inside the link's name.
  - `BranchNotice` prints the branch name in its own element (a `<code>`, as the shell header does today). Then `queryByText('master')` finds it on pages that write.
- **Assumptions about the chart kit (R1-3b, no renames).** R1-3b's code (Steps 3 and 10–27) matches every reading below; the view tests (Step 8) check this behaviour through `WebAnalyticsBody`. If R1-3b changes any of it before this task runs, change this task's tests or `TrendCard` to match the kit. Don't change the kit for it.
  - Everything renders in jsdom, where nothing is laid out. `LineChart` doesn't wait for a measured width: it lays out at 640px until the bridged `useContainerWidth` reports, so the plot, the slider, every x label and the tooltip render, and a pointer move over the zero-size plot still lands on a day. Step 8 stubs that hook at 720px, as R1-8's card test does, so the chart lays out at a card's width (jsdom has no `ResizeObserver`, so the real hook stays at 0).
  - `ChartFrame` renders a `<figure>` and draws no card surface. It is the figure inside a card, as R1-8 reads it too, so `TrendCard` keeps an untitled `Panel` as its surface, and the frame's title is the card's title.
  - `ChartFrame` prints `title` as a heading (an `<h2>` under the page's `<h1>`), `subtitle` under it, and `actions` in its header, beside the toggle.
  - The toggle is two buttons named "Chart" and "Table", with `aria-pressed` on the one showing (Chart first). Table replaces the children with a `<table>` whose `<caption>` is `table.caption`, with one header row of `table.columns` and one row per `table.rows` entry. Chart brings the children back. The frame keeps the choice while its props change, and it renders a `rows: []` table as its header row alone.
  - `LineChart`'s plot is `useChartCursor`'s `role="slider"`, named by `ariaLabel`. Its `aria-valuetext` at a position is the tooltip's text: the day (`xFormat(x)`), then each series' `yFormat(y)` and label.
  - Home, End, ← and → move the cursor, a pointer move over the plot sets it, and leaving the plot clears it. The cursor starts empty, so no tooltip shows before the first move. Which day a jsdom pointer lands on is the kit's business: the hover test checks only that a tooltip follows the pointer and leaves with it. The slider still carries `aria-valuenow` and `aria-valuetext` from the first render (for example the last day). ARIA requires `aria-valuenow` on `role="slider"`. `aria-valuemax − aria-valuemin + 1` is the number of positions.
  - `ChartTooltip` renders its title and then each row, value first and label second, as text inside one `aria-hidden` root inside the chart (no portal). The tests find it by its title text, as R1-8's do.
  - `LineChart` draws a one-point series (one marker, one x label) without dividing by zero, and prints every x label through `xFormat`.
  - With no `xTicks`, `LineChart` labels the first point, the quarter points and the last, each once: point `Math.round(f × (n − 1))` for f = 0, ¼, ½, ¾ and 1. On the view tests' 19-day window that is Sep 12, 17, 21, 26 and 30. On the stories' 30 days it is Jun 1, 8, 16, 23 and 30, on the Deploy run's default 61-day window every 15 days, and on a one-point series its one day.
  - `eachDay(start, end)` returns every UTC day from `start` to `end` inclusive, oldest first, across month ends.
  - `isDay(day)` is true only for a real `YYYY-MM-DD` calendar day. It round-trips the date, so `2026-02-30`, which `Date.parse` rolls over into March, is not a day.
- **`WebAnalyticsView*`.** This task doesn't touch `WebAnalyticsView.tsx`, its stories or its test. The task that retires `/analytics` deletes them.

### Task R1-10: Web analytics page

This task builds `/web` from README §5 and the prototype. It replaces `WebAnalyticsView`'s layout with a summary line, event cards, a trend card and breakdown cards. The trend card is the chart kit's `ChartFrame` and `LineChart` (R-12), so it **runs after R1-3b**. It reads only `vercel-analytics.json`, so its states don't depend on the vote artifacts.

Rules this task fixes where the spec and the review left gaps:
- **Missing days.** Nothing in the precompute fills a day the API leaves out. `scripts/precompute-vercel-analytics.mjs:79-83` asks `events/aggregate` for `by: 'day'` with no fill option, and `buildEvent` (`scripts/lib/vercelAnalytics.mjs:206-209`) maps the returned rows one for one. The repo doesn't show whether Vercel returns zero-count days, so the artifact's trend may skip idle days, and spacing points by index would squeeze time and inflate the average. `fillTrendDays` fills every calendar day of the reporting window with 0 (with no window, the trend's first day to its last). `WebAnalyticsBody` applies it to every event before the sparklines, the chart, its table and the summary read the trend.
- **Daily average.** It divides by the number of days in the reporting window, idle days included (the filled trend).
- **Peak day.** If two days tie, the later day wins.
- **No activity.** If the trend is empty, or every day in it is 0, the chart's place says "No activity in window." The average and the peak show `—`. The table view still lists the window's idle days.
- **The trend chart (R-12).** It is the kit's `LineChart` inside a `ChartFrame`, on an untitled `Panel`, 180px tall as in the handoff:
  - One series, the selected event, as a gold line with the kit's area wash. The title "{label} per day" names it, so there is no legend.
  - One y axis, the kit's: clean ticks from 0, printed by `fmtInt`. The handoff's "max ×1.1" top goes with `chartCeiling`; the kit's ceiling is the same on every chart.
  - The x labels are the kit's default over the filled trend (review `web-trend-window`): the window's first day, its quarter points and its last day. So they follow the Deploy run's window: a 60-day lookback by default, 61 days inclusive, labelled every 15 days.
- **Crosshair and table.**
  - Hover the plot, or focus it and press ←, →, Home or End, and a crosshair snaps to a day. Its tooltip reads the day ("Sep 30") and the count. The slider's `aria-valuetext` says the same, so keyboard and screen-reader users get what the pointer gets.
  - The tooltip never gates a value: the Chart | Table toggle swaps the chart for a Day / Count table of every day in the window, idle days as 0.
  - The stats sit in the frame's header, so they stay in both views.
  - Picking another event keeps the view, and starts the crosshair afresh (the chart is keyed by event).
- **One-day trend.** A trend that fills to one day (a one-day window, or no window and one day of data) draws as one point with that day as its only label, and its table has one row. The chart and the table are named by that day alone ("Votes skipped per day, Sep 30").
- **No range control (R-9).** The export fixes one reporting window for the trends and the breakdowns, so a control could only move the trend. The page shows the window instead ("Trends & breakdowns Sep 12 – Sep 30"), in the summary row above everything it covers.
- **Event cards.** Each card is one button. Its sparkline stays the non-interactive `Sparkline` (aria-hidden, no cursor, no tooltip): a chart's slider inside the button would nest one control in another, which HTML and jsx-a11y both forbid. The trend card below is the page's interactive chart. The selected card's total stays in the text colour, beside a sparkline that turns gold: text never wears the series colour, and the plan carves out only `gapColor`. The handoff's "gold number" gives way to that rule. R1-2's pressed `adm-card-btn` (`accentTintSoft` fill, `accentStrong` edge) and the gold sparkline mark the selection. Text inside the charts uses text tokens only.
- **Breakdowns.** They stay lists with directly labelled bars: every row prints its value, count and share, so they need no tooltip or table twin. Each bar scales to the breakdown's biggest row.
- **Rarity icons.**
  - `reveal_card_click` sends `card.rarity ?? null` (app `pages/RevealsPage.tsx:121-129`).
  - `RaritySymbol` draws Common to Legendary, using the lowercased keys that `rarityConfigOf` returns.
  - Enchanted, Epic and Iconic rows get the printing webps that the app's `PrintingPills` shows (`shared/components/PrintingPills.tsx:14-16`).
  - Only `Others` and values the app has no symbol for show text alone.
- **`Others`.** This row folds the tail of a breakdown. It goes last, with a neutral bar and muted text.
- **Notice copy.** The no-Vercel-data copy keeps today's text, except "this tab" becomes "this page".

**Files:**
- Create: `src/tools/analytics/web/webModel.ts`
- Create: `src/tools/analytics/web/EventCards.tsx`
- Create: `src/tools/analytics/web/TrendCard.tsx`
- Create: `src/tools/analytics/web/BreakdownCards.tsx`
- Create: `src/tools/analytics/web/WebAnalyticsBody.tsx`
- Create: `src/tools/analytics/web/WebAnalyticsBody.stories.tsx`
- Create: `src/tools/analytics/web/WebAnalyticsPage.tsx`
- Modify: `src/app-bridge.ts`: two re-export insertions, after the `CtaButton` line (today line 42) and after the `smallImageUrl` line (today line 51)
- Modify: `src/shell/nav.ts` (as left by the nav task): one `NAV_ITEMS` entry
- Modify: `src/router.tsx` (as left by the shell task): one import and one route
- Test: `src/tools/analytics/web/__tests__/webModel.test.ts` (create)
- Test: `src/tools/analytics/web/__tests__/WebAnalyticsBody.test.tsx` (create)
- Test: `src/tools/analytics/web/__tests__/WebAnalyticsPage.test.tsx` (create)
- Test: `src/router.test.tsx`: one case
- Test: `src/shell/Sidebar.test.tsx` (as left by R1-9): the Insights hrefs line

**Interfaces:**
- **Consumes:**
  - `src/theme/adminTheme.ts`: `ADMIN_COLORS`, `ADMIN_TYPE`, `ADMIN_RADIUS`
  - `src/theme/AdminStyles.tsx`: the `adm-card-btn` class (`.storybook/preview.tsx` mounts `AdminStyles` for every story, R1-2, so the stories don't)
  - `src/ui/format.ts`: `fmtInt`, `fmtDay`
  - primitives: `Panel` (the trend card's surface and the breakdown cards), `MeterBar`, `Notice`, `Sparkline` (the event cards)
  - the chart kit (R1-3b):
    - `src/charts/ChartFrame.tsx`: `ChartFrame`, `ChartTable`
    - `src/charts/LineChart.tsx`: `LineChart`, `LineSeries`
    - `src/charts/scale.ts`: `eachDay`, `isDay`
  - `src/shell/PageLayout.tsx`: `PageLayout`
  - `src/shell/nav.ts`: `NAV_ITEMS`
  - `src/tools/analytics/adminData.ts`: `fetchAdminData` (with the cache), through `useVercelAnalytics`. `src/test/setup.ts` empties the cache before every test (R1-5), so the tests don't reset it.
  - `src/tools/analytics/useVercelAnalytics.ts`: `useVercelAnalytics`, unchanged
  - `src/tools/analytics/vercelAnalyticsTypes.ts`: `VercelAnalytics`, `VercelEvent`, `TrendPoint`, `ReportingWindow`, `Breakdown`, `BreakdownRow`
  - bridge: `ALL_INKS`, `INK_COLORS`, `FONTS`, `SPACING`, `TRUNCATE`
- **Produces:**
  - from `webModel.ts`: `sortEventsByTotal`, `trendSummary` (contract), plus `OTHERS_VALUE`, `fillTrendDays`, `BreakdownShare`, `breakdownShares`
  - components: `EventCards`, `TrendCard`, `BreakdownCards`, `WebAnalyticsBody({analytics, error})`, `WebAnalyticsPage`
  - bridge re-exports: `InkIcon`, `RaritySymbol`, `rarityConfigOf`, `enchantedSymbol`, `epicSymbol`, `iconicSymbol`
  - the `/web` route and the `NAV_ITEMS` entry `{id: 'web', label: 'Web analytics', mark: 'Wa', path: '/web', group: 'insights', writes: false}`

The test commands use `pnpm vitest run`, which doesn't build the engine. The bridged modules import the engine. If it hasn't been built since the last pin bump, run `pnpm build:engine` once first.

- [ ] **Step 1: Write the failing model test**

Create `src/tools/analytics/web/__tests__/webModel.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import type {BreakdownRow, TrendPoint, VercelEvent} from '../../vercelAnalyticsTypes';
import {breakdownShares, fillTrendDays, sortEventsByTotal, trendSummary} from '../webModel';

function event(name: string, total: number): VercelEvent {
  return {name, label: name, total, visitors: 1, trend: [], breakdowns: []};
}

/** One point per day from 2026-09-01, with the given counts. */
function days(...counts: number[]): TrendPoint[] {
  return counts.map((count, i) => ({date: `2026-09-${String(i + 1).padStart(2, '0')}`, count}));
}

function row(value: string, count: number): BreakdownRow {
  return {value, count, visitors: 1};
}

describe('sortEventsByTotal', () => {
  it('puts the busiest event first and keeps the artifact order on ties', () => {
    const sorted = sortEventsByTotal([event('a', 5), event('b', 9), event('c', 5), event('d', 12)]);
    expect(sorted.map((e) => e.name)).toEqual(['d', 'b', 'a', 'c']);
  });

  it('leaves the input array alone', () => {
    const events = [event('a', 1), event('b', 2)];
    sortEventsByTotal(events);
    expect(events.map((e) => e.name)).toEqual(['a', 'b']);
  });
});

describe('fillTrendDays', () => {
  // Vercel's by=day rows for an event with activity on Sep 1 and Sep 5 only.
  const gap: TrendPoint[] = [
    {date: '2026-09-01', count: 4},
    {date: '2026-09-05', count: 6},
  ];

  it('fills the days Vercel left out with zeros', () => {
    expect(fillTrendDays(gap, null)).toEqual(days(4, 0, 0, 0, 6));
  });

  it('spans the whole reporting window, oldest day first, across a month end', () => {
    const filled = fillTrendDays([gap[1], gap[0]], {since: '2026-08-30', until: '2026-09-06'});
    expect(filled.map((point) => point.count)).toEqual([0, 0, 4, 0, 0, 0, 6, 0]);
    expect(filled[0].date).toBe('2026-08-30');
    expect(filled[1].date).toBe('2026-08-31');
    expect(filled[7].date).toBe('2026-09-06');
  });

  it('widens the span for a day outside the window rather than dropping it', () => {
    expect(fillTrendDays(gap, {since: '2026-09-02', until: '2026-09-05'})).toEqual(days(4, 0, 0, 0, 6));
  });

  it('fills an empty trend with zeros across the window, and leaves it empty with no window', () => {
    expect(fillTrendDays([], {since: '2026-09-01', until: '2026-09-03'})).toEqual(days(0, 0, 0));
    expect(fillTrendDays([], null)).toEqual([]);
  });

  it('skips a point with no date instead of failing', () => {
    // buildEvent writes '' when a row has neither timestamp nor date.
    expect(fillTrendDays([{date: '', count: 2}, ...gap], null)).toEqual(days(4, 0, 0, 0, 6));
  });

  it('lets the average count the missing days', () => {
    const filled = fillTrendDays(gap, null);
    expect(trendSummary(gap).dailyAverage).toBe(5);
    expect(trendSummary(filled).dailyAverage).toBe(2);
  });
});

describe('trendSummary', () => {
  it('sums the days it is given and averages over all of them', () => {
    const summary = trendSummary(days(4, 10, 1));
    expect(summary.inWindow).toBe(15);
    expect(summary.dailyAverage).toBe(5);
    expect(summary.peak).toEqual({date: '2026-09-02', count: 10});
  });

  it('gives a tied peak to the later day, whatever order the trend is in', () => {
    const [first, second, third] = days(7, 3, 7);
    expect(trendSummary([third, first, second]).peak).toEqual({date: '2026-09-03', count: 7});
    expect(trendSummary([first, second, third]).peak).toEqual({date: '2026-09-03', count: 7});
  });

  it('has no peak and a zero average for an empty trend', () => {
    expect(trendSummary([])).toEqual({inWindow: 0, dailyAverage: 0, peak: null});
  });
});

describe('breakdownShares', () => {
  it('gives each row its whole-percent share of the total', () => {
    const shares = breakdownShares([row('quick', 720), row('score', 360), row('in_depth', 160)]);
    expect(shares.map((s) => s.pct)).toEqual([58, 29, 13]);
  });

  it('scales bars to the biggest row, not the first one', () => {
    // Score breakdowns arrive in value order, so the biggest row can sit anywhere.
    const shares = breakdownShares([row('3', 60), row('7', 300), row('9', 150)]);
    expect(shares.map((s) => s.fraction)).toEqual([0.2, 1, 0.5]);
  });

  it('moves "Others" to the bottom and still scales against it when it is the biggest', () => {
    const shares = breakdownShares([row('Others', 400), row('elsa', 200), row('shift', 100)]);
    expect(shares.map((s) => [s.row.value, s.fraction, s.others])).toEqual([
      ['elsa', 0.5, false],
      ['shift', 0.25, false],
      ['Others', 1, true],
    ]);
  });

  it('returns nothing for a breakdown with no rows in the window', () => {
    expect(breakdownShares([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm vitest run src/tools/analytics/web/__tests__/webModel.test.ts`
Expected: FAIL with `Error: Failed to resolve import "../webModel" from "src/tools/analytics/web/__tests__/webModel.test.ts". Does the file exist?`

- [ ] **Step 3: Implement the model**

Create `src/tools/analytics/web/webModel.ts`. Its days come from the chart kit's `eachDay`, and the kit's `isDay` screens out a date that names no day (R1-3b):

```ts
import {eachDay, isDay} from '../../../charts/scale';
import type {BreakdownRow, ReportingWindow, TrendPoint, VercelEvent} from '../vercelAnalyticsTypes';

/** The value Vercel gives the row that folds a breakdown's tail beyond its query limit. */
export const OTHERS_VALUE = 'Others';

/** Events busiest first. Returns a copy, and ties keep the artifact's order (sort is stable). */
export function sortEventsByTotal(events: VercelEvent[]): VercelEvent[] {
  return [...events].sort((a, b) => b.total - a.total);
}

/**
 * The trend with one point for every calendar day of the reporting window,
 * oldest first, and 0 for each day the trend lacks. The precompute keeps only
 * the rows Vercel's by=day query returns (buildEvent in
 * scripts/lib/vercelAnalytics.mjs), so idle days may be missing. Filling them
 * keeps the chart's time axis even, its table complete and the daily average
 * honest. A day outside the window widens the span instead of vanishing. With
 * no window, the span runs from the trend's first day to its last. A point with
 * no usable date (buildEvent writes '' for a row without one) can't be placed,
 * so it's skipped. The days come from the chart kit's eachDay (UTC, inclusive).
 */
export function fillTrendDays(trend: TrendPoint[], reportingWindow: ReportingWindow | null): TrendPoint[] {
  const counts = new Map(trend.map((point) => [point.date, point.count]));
  const bounds = reportingWindow ? [reportingWindow.since, reportingWindow.until] : [];
  const days = [...counts.keys(), ...bounds].filter(isDay).sort();
  if (days.length === 0) return [];
  return eachDay(days[0], days[days.length - 1]).map((date) => ({date, count: counts.get(date) ?? 0}));
}

/**
 * The trend card's three numbers. The daily average divides by the days it is
 * given: the page passes the trend filled to the whole window (fillTrendDays),
 * so idle days count. A tie for the peak goes to the later day, so a flat run
 * reads as its most recent day. An empty trend has no peak and averages 0.
 */
export function trendSummary(trend: TrendPoint[]): {inWindow: number; dailyAverage: number; peak: TrendPoint | null} {
  let inWindow = 0;
  let peak: TrendPoint | null = null;
  for (const point of trend) {
    inWindow += point.count;
    if (!peak || point.count > peak.count || (point.count === peak.count && point.date > peak.date)) peak = point;
  }
  return {inWindow, dailyAverage: trend.length === 0 ? 0 : inWindow / trend.length, peak};
}

/** One breakdown row ready to draw. */
export interface BreakdownShare {
  row: BreakdownRow;
  /** The row's share of the breakdown's total, as a whole percent. */
  pct: number;
  /** Bar length (0–1) against the breakdown's biggest row. */
  fraction: number;
  /** True for the "Others" row. */
  others: boolean;
}

/**
 * A breakdown's rows with their shares. Rows keep the artifact's order (by
 * count, or by value for score breakdowns), except that "Others" goes last.
 * Bars scale to the biggest row wherever it sits, "Others" included.
 */
export function breakdownShares(rows: BreakdownRow[]): BreakdownShare[] {
  const sum = rows.reduce((total, row) => total + row.count, 0) || 1;
  const top = Math.max(1, ...rows.map((row) => row.count));
  const shares = rows.map((row) => ({
    row,
    pct: Math.round((row.count / sum) * 100),
    fraction: row.count / top,
    others: row.value === OTHERS_VALUE,
  }));
  return [...shares.filter((share) => !share.others), ...shares.filter((share) => share.others)];
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `pnpm vitest run src/tools/analytics/web/__tests__/webModel.test.ts`
Expected: PASS, 15 tests.

- [ ] **Step 5: Lint and typecheck the model**

Run: `pnpm lint`
Expected: no errors.

Run: `pnpm typecheck`
Expected: exits 0. This checks the `eachDay` and `isDay` imports from `src/charts/scale.ts` (R1-3b). The pre-commit hook runs lint and tests but not typecheck, which only runs on push.

- [ ] **Step 6: Commit**

Run with the Bash tool, only after the owner approves:
```bash
git add src/tools/analytics/web/webModel.ts src/tools/analytics/web/__tests__/webModel.test.ts
USER_APPROVED=1 git commit -m "feat(analytics): add the web analytics model (#24)"
```

- [ ] **Step 7: Bridge the ink and rarity icons**

Bridge these from the app:
- **`InkIcon`** (`upstream/inkweave/apps/web/src/shared/components/InkIcon.tsx`). Props: `{ink: Ink; size?: number; decorative?: boolean}`. It is decorative by default (`alt=""`, `aria-hidden`).
- **`RaritySymbol`** (`features/reveals/RaritySymbol.tsx`). Props: `{rarity: string; size: number}`. `rarity` must be one of five lowercased keys: `common`, `uncommon`, `rare`, `super rare` or `legendary`. Any other key renders `null`.
- **`rarityConfigOf`** (`features/reveals/rarity.ts`). It trims and lowercases a raw `card.rarity`. It returns `{key, name}` for exactly those five keys, and `undefined` for anything else.
- **The three printing webps.** Enchanted, Epic and Iconic are printings with no `RaritySymbol`. The app's `PrintingPills` (`shared/components/PrintingPills.tsx:14-16`) draws them from `assets/{enchanted,epic,iconic}.webp`, imported with `?no-inline`. Bridge those three files the same way. `vite/client` is in `tsconfig.app.json`'s `types`, and it declares the `*?no-inline` module (`node_modules/vite/client.d.ts:264`).

In `src/app-bridge.ts`, replace:
```ts
export {CtaButton} from '../upstream/inkweave/apps/web/src/shared/components/CtaButton';
export {LinkButton} from '../upstream/inkweave/apps/web/src/shared/components/LinkButton';
```
with:
```ts
export {CtaButton} from '../upstream/inkweave/apps/web/src/shared/components/CtaButton';
export {InkIcon} from '../upstream/inkweave/apps/web/src/shared/components/InkIcon';
export {LinkButton} from '../upstream/inkweave/apps/web/src/shared/components/LinkButton';
```
and replace:
```ts
export {smallImageUrl} from '../upstream/inkweave/apps/web/src/features/cards/loader';
```
with:
```ts
export {smallImageUrl} from '../upstream/inkweave/apps/web/src/features/cards/loader';
// RaritySymbol draws Common to Legendary; rarityConfigOf maps a card's rarity
// ("Super Rare") to the same five keys and returns undefined for any other.
export {RaritySymbol} from '../upstream/inkweave/apps/web/src/features/reveals/RaritySymbol';
export {rarityConfigOf} from '../upstream/inkweave/apps/web/src/features/reveals/rarity';
// Enchanted, Epic and Iconic are printings RaritySymbol doesn't draw; the app's
// PrintingPills shows them from these files (?no-inline keeps them out of the JS).
export {default as enchantedSymbol} from '../upstream/inkweave/apps/web/src/assets/enchanted.webp?no-inline';
export {default as epicSymbol} from '../upstream/inkweave/apps/web/src/assets/epic.webp?no-inline';
export {default as iconicSymbol} from '../upstream/inkweave/apps/web/src/assets/iconic.webp?no-inline';
```

- [ ] **Step 8: Write the failing view test**

Create `src/tools/analytics/web/__tests__/WebAnalyticsBody.test.tsx`. It ports both cases from `__tests__/WebAnalyticsView.test.tsx`. The selected card now reports `aria-pressed`, not `aria-current`. New cases cover:
- selection, and the reporting window in place of a range control (R-9);
- the chart across the filled window, its crosshair by keyboard and by pointer, and a fresh crosshair for each event picked;
- the table view, its idle days, and that it holds when another event is picked;
- empty trends (with a window and with none), all-zero and one-day trends, and a trend with days missing from the window;
- the event cards as single controls (the sparkline is a picture);
- the breakdown icons;
- every loading, error and empty state.

The chart cases use the kit as **Assumptions about the chart kit** describes it. `ChartTooltip` is `aria-hidden`, so the tests find it by its title text and read it with `toHaveTextContent`, as R1-8's do. They pick days whose label appears nowhere else in the card (Sep 28 is no axis label and no stat), so the title finds only the tooltip. jsdom lays nothing out, so the hover case checks only that a day's tooltip follows the pointer and leaves with it. jsdom has no `ResizeObserver` either, so the file stubs the bridged `useContainerWidth` at a card's width, as R1-8's card test does (see the first chart kit assumption).

```tsx
import {describe, expect, it, vi} from 'vitest';
import {act, fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ADMIN_COLORS} from '../../../../theme/adminTheme';
import {WebAnalyticsBody} from '../WebAnalyticsBody';
import type {BreakdownRow, VercelAnalytics, VercelEvent} from '../../vercelAnalyticsTypes';

// jsdom has no ResizeObserver, so the bridged useContainerWidth stays at 0.
// R1-3b's LineChart measures itself with it, so this gives it a card's width.
vi.mock('../../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useContainerWidth: () => 720,
}));

function event(name: string, label: string, total: number, overrides: Partial<VercelEvent> = {}): VercelEvent {
  return {name, label, total, visitors: 1, trend: [], breakdowns: [], ...overrides};
}

function row(value: string, count: number): BreakdownRow {
  return {value, count, visitors: 1};
}

const REVEALS = event('reveal_card_click', 'Reveal card clicks', 9340, {
  visitors: 1310,
  trend: [
    {date: '2026-09-26', count: 4},
    {date: '2026-09-27', count: 10},
    {date: '2026-09-28', count: 1},
    {date: '2026-09-29', count: 10},
    {date: '2026-09-30', count: 5},
  ],
  breakdowns: [
    {prop: 'ink', label: 'By ink', rows: [row('Amber', 30), row('Others', 50), row('Steel', 20)]},
    {
      prop: 'rarity',
      label: 'By rarity',
      rows: [row('Others', 50), row('Common', 30), row('Enchanted', 10), row('Super Rare', 20)],
    },
    {prop: 'deviceType', label: 'By device', rows: []},
  ],
});
const SEARCHES = event('search_submitted', 'Searches', 5120);
const SKIPS = event('vote_skipped', 'Votes skipped', 230, {trend: [{date: '2026-09-30', count: 3}]});

const ANALYTICS: VercelAnalytics = {
  generatedAt: '2026-09-30T04:00:00Z',
  hasVercelData: true,
  reportingWindow: {since: '2026-09-12', until: '2026-09-30'},
  events: [SEARCHES, REVEALS, SKIPS],
};

/** The value printed under a trend stat's label. */
function stat(label: string) {
  return screen.getByText(label).nextElementSibling;
}

/** The trend card: the chart frame's figure around its title. */
function trendCard(title: string) {
  return screen.getByRole('heading', {name: title}).closest('figure')!;
}

/** The chart's plot: the crosshair's slider, named after the chart. */
function plot(name: string) {
  return screen.getByRole('slider', {name});
}

/** The tooltip showing `title`. ChartTooltip's root is aria-hidden (R1-3b), so it is found by its text. */
function tooltip(title: string): HTMLElement {
  const tip = screen.getByText(title).closest<HTMLElement>('[aria-hidden="true"]');
  expect(tip, `no tooltip around "${title}"`).not.toBeNull();
  return tip as HTMLElement;
}

/** The body rows of the table named `caption`, as the text of each cell, header cells included. */
function tableRows(caption: string) {
  const [, ...body] = within(screen.getByRole('table', {name: caption})).getAllByRole('row');
  return body.map((tr) => [...tr.querySelectorAll('th, td')].map((cell) => cell.textContent));
}

/** A day label as fmtDay prints it ("Sep 30"). */
const DAY_LABEL = /^[A-Z][a-z]{2} \d{1,2}$/;

/** The rows of the breakdown list that holds `value`, by their tooltip. */
function rowsAround(value: string) {
  return within(screen.getByText(value).closest('ul')!)
    .getAllByRole('listitem')
    .map((li) => li.title);
}

async function pick(label: RegExp) {
  await userEvent.click(screen.getByRole('button', {name: label}));
}

describe('WebAnalyticsBody', () => {
  it('focuses the busiest event first, then the one you pick', async () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    expect(screen.getByRole('button', {name: /Reveal card clicks/})).toHaveAttribute('aria-pressed', 'true');
    // Text never wears the series colour, so the pressed card's total stays in the text colour.
    expect(screen.getByText('9,340')).toHaveStyle({color: ADMIN_COLORS.text});

    await pick(/Searches/);
    expect(screen.getByRole('button', {name: /Searches/})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', {name: /Reveal card clicks/})).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('9,340')).toHaveStyle({color: ADMIN_COLORS.text});
    expect(screen.getByRole('heading', {name: 'Searches per day'})).toBeInTheDocument();
  });

  it('sums every event all-time and names the trend window', () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    expect(screen.getByText('events tracked across 3 event types · all-time')).toHaveTextContent(
      '14,690 events tracked across 3 event types · all-time',
    );
    expect(screen.getByText('Trends & breakdowns')).toHaveTextContent('Trends & breakdowns Sep 12 – Sep 30');
  });

  it('leaves out the window pill when the artifact has no window', () => {
    render(<WebAnalyticsBody analytics={{...ANALYTICS, reportingWindow: null}} />);
    expect(screen.queryByText('Trends & breakdowns')).not.toBeInTheDocument();
  });

  it('shows the reporting window instead of a range control (R-9)', () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    // One window covers the trends and the breakdowns alike, so a range could only move the trend.
    expect(screen.queryByRole('group', {name: 'Range'})).not.toBeInTheDocument();
    expect(screen.getByText('Trends & breakdowns')).toBeInTheDocument();
  });

  it("summarises the selected event's trend over the whole window, giving a tied peak to the later day", () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    expect(screen.getByRole('heading', {name: 'Reveal card clicks per day'})).toBeInTheDocument();
    expect(screen.getByText('1,310 visitors all-time')).toBeInTheDocument();
    expect(stat('In window')).toHaveTextContent('30');
    // 30 over the window's 19 days (Sep 12 to Sep 30), not over the 5 days the trend returned.
    expect(stat('Daily average')).toHaveTextContent('1.6');
    expect(stat('Peak day')).toHaveTextContent('Sep 29');
  });

  it('charts the selected event across the window, with dates from the filled trend', () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    const chart = plot('Reveal card clicks per day, Sep 12 to Sep 30');
    expect(Number(chart.getAttribute('aria-valuemax')) - Number(chart.getAttribute('aria-valuemin')) + 1).toBe(19);
    expect(chart).toHaveAttribute('aria-valuenow');
    // The kit's default ticks over the 19 filled days put the quarter points on Sep 17, Sep 21 and Sep 26.
    const card = trendCard('Reveal card clicks per day');
    for (const label of ['Sep 12', 'Sep 17', 'Sep 21', 'Sep 26', 'Sep 30']) {
      expect(within(card).getByText(label)).toBeInTheDocument();
    }
  });

  it('moves the crosshair with the arrow keys, reading each day and its count', async () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    const chart = plot('Reveal card clicks per day, Sep 12 to Sep 30');
    // Sep 28 is neither an axis label nor a stat, so its text shows only in the tooltip.
    expect(screen.queryByText('Sep 28')).not.toBeInTheDocument();

    act(() => chart.focus());
    await userEvent.keyboard('{End}');
    // Screen readers get the tooltip's text as the slider's value: the day, then the count.
    expect(chart).toHaveAttribute('aria-valuetext', expect.stringMatching(/Sep 30.*\b5\b/));

    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    // The tooltip's title is the day; its one row leads with the count, then the event.
    expect(tooltip('Sep 28')).toHaveTextContent(/Sep 28\s*1\s*Reveal card clicks/);
    expect(chart).toHaveAttribute('aria-valuetext', expect.stringMatching(/Sep 28.*\b1\b/));

    // Sep 12 is a day Vercel left out: the cursor reads it as 0.
    await userEvent.keyboard('{Home}');
    expect(chart).toHaveAttribute('aria-valuetext', expect.stringMatching(/Sep 12.*\b0\b/));
    expect(screen.queryByText('Sep 28')).not.toBeInTheDocument();
  });

  it('shows the tooltip under the pointer and drops it when the pointer leaves', async () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    const card = trendCard('Reveal card clicks per day');
    const chart = plot('Reveal card clicks per day, Sep 12 to Sep 30');
    // The day labels before any hover: the five axis labels and the peak day.
    const labelsOnly = within(card).getAllByText(DAY_LABEL).length;

    await userEvent.hover(chart);
    // jsdom lays nothing out, so which day the pointer lands on is the kit's
    // business (R1-3b tests the mapping). This checks the card's wiring: a
    // tooltip titled with a day, and a day in the slider's value.
    expect(within(card).getAllByText(DAY_LABEL).length).toBeGreaterThan(labelsOnly);
    expect(chart).toHaveAttribute('aria-valuetext', expect.stringMatching(/^[A-Z][a-z]{2} \d{1,2}\b/));

    await userEvent.unhover(chart);
    expect(within(card).getAllByText(DAY_LABEL)).toHaveLength(labelsOnly);
  });

  it('starts the crosshair afresh when you pick another event', () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    const labelsOnly = within(trendCard('Reveal card clicks per day')).getAllByText(DAY_LABEL).length;
    // A pointer move with no leave holds the cursor. Blur would clear it anyway (R1-3b),
    // so the pick is a bare click: no pointer or focus events reach the plot.
    fireEvent.pointerMove(plot('Reveal card clicks per day, Sep 12 to Sep 30'), {clientX: 0});
    expect(within(trendCard('Reveal card clicks per day')).getAllByText(DAY_LABEL)).toHaveLength(labelsOnly + 1);
    fireEvent.click(screen.getByRole('button', {name: /Votes skipped/}));
    expect(plot('Votes skipped per day, Sep 12 to Sep 30')).toBeInTheDocument();
    // The same five axis labels and a peak day: without TrendCard's key, the held cursor would add a tooltip title.
    expect(within(trendCard('Votes skipped per day')).getAllByText(DAY_LABEL)).toHaveLength(labelsOnly);
  });

  it('lists every day of the window in the table view, idle days as 0, and switches back', async () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    await userEvent.click(screen.getByRole('button', {name: 'Table'}));
    expect(screen.getByRole('button', {name: 'Table'})).toHaveAttribute('aria-pressed', 'true');
    const rows = tableRows('Reveal card clicks per day, Sep 12 to Sep 30');
    expect(rows).toHaveLength(19);
    expect(rows[0]).toEqual(['Sep 12', '0']);
    expect(rows.slice(-5)).toEqual([
      ['Sep 26', '4'],
      ['Sep 27', '10'],
      ['Sep 28', '1'],
      ['Sep 29', '10'],
      ['Sep 30', '5'],
    ]);
    // The stats sit in the frame's header, so they stay with the table.
    expect(stat('In window')).toHaveTextContent('30');
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', {name: 'Chart'}));
    expect(plot('Reveal card clicks per day, Sep 12 to Sep 30')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('keeps the table view when you pick another event', async () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    await userEvent.click(screen.getByRole('button', {name: 'Table'}));
    await pick(/Searches/);
    const rows = tableRows('Searches per day, Sep 12 to Sep 30');
    expect(rows).toHaveLength(19);
    expect(rows.every(([, count]) => count === '0')).toBe(true);
  });

  it('counts the days Vercel left out as zero, across the whole window', async () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    await pick(/Votes skipped/);
    // One day of data (Sep 30) in a 19-day window: the chart spans the window, and the average is 3 / 19.
    expect(plot('Votes skipped per day, Sep 12 to Sep 30')).toBeInTheDocument();
    expect(within(trendCard('Votes skipped per day')).getByText('Sep 12')).toBeInTheDocument();
    expect(stat('In window')).toHaveTextContent('3');
    expect(stat('Daily average')).toHaveTextContent('0.2');
    expect(stat('Peak day')).toHaveTextContent('Sep 30');
  });

  it('says so when the selected event has no days in the window', async () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    await pick(/Searches/);
    expect(screen.getByText('No activity in window.')).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(stat('In window')).toHaveTextContent('0');
    expect(stat('Daily average')).toHaveTextContent('—');
    expect(stat('Peak day')).toHaveTextContent('—');
  });

  it('treats a window of zero-count days as no activity', async () => {
    const idle = event('sort_changed', 'Sort changes', 1, {
      trend: [
        {date: '2026-09-29', count: 0},
        {date: '2026-09-30', count: 0},
      ],
    });
    render(<WebAnalyticsBody analytics={{...ANALYTICS, events: [...ANALYTICS.events, idle]}} />);
    await pick(/Sort changes/);
    expect(screen.getByText('No activity in window.')).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(stat('Daily average')).toHaveTextContent('—');
    expect(stat('Peak day')).toHaveTextContent('—');
  });

  it('has nothing to chart or list for an event with no days and no window', async () => {
    render(<WebAnalyticsBody analytics={{...ANALYTICS, reportingWindow: null}} />);
    await pick(/Searches/);
    expect(screen.getByText('No activity in window.')).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(stat('In window')).toHaveTextContent('0');
    expect(stat('Peak day')).toHaveTextContent('—');
    await userEvent.click(screen.getByRole('button', {name: 'Table'}));
    expect(tableRows('Searches per day')).toEqual([]);
  });

  it('draws a one-day trend as its one day, by keyboard and in the table', async () => {
    // With no window to fill to, the trend stays its one day, and the names say that day alone.
    render(<WebAnalyticsBody analytics={{...ANALYTICS, reportingWindow: null}} />);
    await pick(/Votes skipped/);
    const chart = plot('Votes skipped per day, Sep 30');
    act(() => chart.focus());
    await userEvent.keyboard('{Home}');
    expect(chart).toHaveAttribute('aria-valuetext', expect.stringMatching(/Sep 30.*\b3\b/));
    expect(stat('Daily average')).toHaveTextContent('3.0');
    expect(stat('Peak day')).toHaveTextContent('Sep 30');

    await userEvent.click(screen.getByRole('button', {name: 'Table'}));
    expect(tableRows('Votes skipped per day, Sep 30')).toEqual([['Sep 30', '3']]);
  });

  it('keeps each event card one control: its sparkline is a picture, not a chart', () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    const card = screen.getByRole('button', {name: /Reveal card clicks/});
    expect(card.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    // Nothing inside the button takes focus or a role: no slider, link or second button.
    expect(card.querySelector('[role], [tabindex], a, button, input')).toBeNull();
  });

  it('puts the ink icon on ink rows and keeps "Others" last, as text', () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    expect(rowsAround('Amber')).toEqual(['Amber: 30 (30%)', 'Steel: 20 (20%)', 'Others: 50 (50%)']);
    expect(screen.getByText('Amber').closest('li')!.querySelector('img')).not.toBeNull();
    expect(screen.getByText('Steel').closest('li')!.querySelector('img')).not.toBeNull();
    const inkList = screen.getByText('Amber').closest('ul')!;
    expect(within(inkList).getByText('Others').closest('li')!.querySelector('img')).toBeNull();
  });

  it('puts the rarity symbol on every rarity, and text alone on Others', () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    expect(rowsAround('Common')).toEqual([
      'Common: 30 (27%)',
      'Enchanted: 10 (9%)',
      'Super Rare: 20 (18%)',
      'Others: 50 (45%)',
    ]);
    expect(screen.getByText('Common').closest('li')!.querySelector('img')).not.toBeNull();
    expect(screen.getByText('Super Rare').closest('li')!.querySelector('img')).not.toBeNull();
    expect(screen.getByText('Enchanted').closest('li')!.querySelector('img')).not.toBeNull();
    const rarityList = screen.getByText('Common').closest('ul')!;
    expect(within(rarityList).getByText('Others').closest('li')!.querySelector('img')).toBeNull();
  });

  it('names each breakdown by its prop and says when one is empty', () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    expect(screen.getByText('By device')).toBeInTheDocument();
    expect(screen.getByText('deviceType')).toBeInTheDocument();
    expect(screen.getByText('No data in window.')).toBeInTheDocument();
  });

  it('says when the selected event has no breakdowns configured', async () => {
    render(<WebAnalyticsBody analytics={ANALYTICS} />);
    await pick(/Searches/);
    expect(screen.getByText('No property breakdowns configured for this event.')).toBeInTheDocument();
    expect(screen.queryByText('By ink')).not.toBeInTheDocument();
  });

  it('says why when the data could not be loaded, instead of loading forever', () => {
    render(<WebAnalyticsBody analytics={null} error={new Error('vercel-analytics.json has not been generated yet')} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load Web Analytics (vercel-analytics.json has not been generated yet).',
    );
    expect(screen.queryByText('Loading Web Analytics...')).not.toBeInTheDocument();
  });

  it('shows the loading state until the artifact arrives', () => {
    render(<WebAnalyticsBody analytics={null} />);
    expect(screen.getByText('Loading Web Analytics...')).toBeInTheDocument();
  });

  it('names the secrets to set when the artifact has no Vercel data', () => {
    render(<WebAnalyticsBody analytics={{...ANALYTICS, hasVercelData: false, reportingWindow: null, events: []}} />);
    expect(screen.getByText('VERCEL_ANALYTICS_TOKEN')).toBeInTheDocument();
    expect(screen.getByText('ANALYTICS_VERCEL_PROJECT_ID')).toBeInTheDocument();
    expect(screen.queryByText('No events tracked yet.')).not.toBeInTheDocument();
  });

  it('says when Vercel has no events yet', () => {
    render(<WebAnalyticsBody analytics={{...ANALYTICS, events: []}} />);
    expect(screen.getByText('No events tracked yet.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 9: Run it to confirm it fails**

Run: `pnpm vitest run src/tools/analytics/web/__tests__/WebAnalyticsBody.test.tsx`
Expected: FAIL with `Error: Failed to resolve import "../WebAnalyticsBody" from "src/tools/analytics/web/__tests__/WebAnalyticsBody.test.tsx". Does the file exist?`

- [ ] **Step 10: Create the event cards**

Create `src/tools/analytics/web/EventCards.tsx`. Each card stays one control: its `Sparkline` is a picture, and the trend card below is the interactive chart (see **Event cards**).

```tsx
import {FONTS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtInt} from '../../../ui/format';
import {Sparkline} from '../../../ui/Sparkline';
import type {VercelEvent} from '../vercelAnalyticsTypes';

interface EventCardsProps {
  /** Already sorted, busiest first, each trend filled to the window (fillTrendDays). */
  events: VercelEvent[];
  selectedName: string;
  onSelect: (name: string) => void;
}

/**
 * One card per tracked event: label, event name, all-time total, visitors and
 * the window's sparkline. The cards pick the event that the trend and the
 * breakdowns below describe. Each is a native button styled by AdminStyles'
 * adm-card-btn (a <button> takes no inline style, #509); the picked one is
 * pressed (a gold edge and tint) and its line turns gold. Its total stays in
 * the text colour, as text never wears the series colour. The sparkline stays
 * a picture (aria-hidden, no cursor, no tooltip): a chart's slider inside the
 * button would nest one control in another, so the interactive chart is the
 * trend card below.
 */
export function EventCards({events, selectedName, onSelect}: EventCardsProps) {
  return (
    <div
      role="group"
      aria-label="Tracked events"
      style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: SPACING.md}}>
      {events.map((event) => {
        const selected = event.name === selectedName;
        return (
          <button
            key={event.name}
            type="button"
            className="adm-card-btn"
            aria-pressed={selected}
            onClick={() => onSelect(event.name)}>
            <span style={{display: 'flex', flexDirection: 'column', gap: SPACING.xs, textAlign: 'left'}}>
              <span
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: SPACING.sm,
                }}>
                <span style={{fontSize: ADMIN_TYPE.small, fontWeight: 500, color: ADMIN_COLORS.muted}}>{event.label}</span>{' '}
                <code style={{fontSize: ADMIN_TYPE.micro, color: ADMIN_COLORS.muted}}>{event.name}</code>
              </span>
              <span
                style={{
                  fontFamily: FONTS.hero,
                  fontSize: ADMIN_TYPE.kpi,
                  lineHeight: 1,
                  color: ADMIN_COLORS.text,
                }}>
                {fmtInt(event.total)}
              </span>
              <span style={{fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted}}>{fmtInt(event.visitors)} visitors</span>
              <Sparkline
                data={event.trend.map((point) => point.count)}
                color={selected ? ADMIN_COLORS.accent : ADMIN_COLORS.barNeutral}
                height={28}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 11: Create the trend card on the chart kit**

Create `src/tools/analytics/web/TrendCard.tsx`. An untitled `Panel` is the card. Inside it, `ChartFrame` holds the title, the visitors line, the three stats (its `actions`) and the Day / Count table. `LineChart` draws one gold series with the area wash, `fmtInt` on the y axis and in the tooltip, `fmtDay` on the x axis and as the tooltip title, and the kit's default x labels (the window's first day, quarter points and last day), so it passes no `xTicks`.

```tsx
import {FONTS, SPACING} from '../../../app-bridge';
import {ChartFrame, type ChartTable} from '../../../charts/ChartFrame';
import {LineChart, type LineSeries} from '../../../charts/LineChart';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtDay, fmtInt} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import type {TrendPoint, VercelEvent} from '../vercelAnalyticsTypes';
import {trendSummary} from './webModel';

/** The plot's height in px, the handoff's 180px area chart. */
const CHART_HEIGHT = 180;

const fmtAverage = (n: number) => n.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1});

function Stat({label, value}: {label: string; value: string}) {
  return (
    <div>
      <dt style={{fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted}}>{label}</dt>
      <dd
        style={{
          margin: 0,
          fontFamily: FONTS.hero,
          fontSize: ADMIN_TYPE.sectionTitle,
          lineHeight: 1.1,
          color: ADMIN_COLORS.text,
        }}>
        {value}
      </dd>
    </div>
  );
}

/** "Sep 12 to Sep 30"; the day alone for a one-day trend; null with no days. */
function spanOf(trend: TrendPoint[]): string | null {
  if (trend.length === 0) return null;
  const from = fmtDay(trend[0].date);
  return trend.length === 1 ? from : `${from} to ${fmtDay(trend[trend.length - 1].date)}`;
}

/** The chart's table twin: every day of the window, idle ones as 0. */
function trendTable(caption: string, trend: TrendPoint[]): ChartTable {
  return {caption, columns: ['Day', 'Count'], rows: trend.map((point) => [fmtDay(point.date), fmtInt(point.count)])};
}

/**
 * The selected event's daily trend over the reporting window, on the chart
 * kit (R-12). The frame's header holds the window total, the daily average and
 * the peak day; below it sits one area series in the accent, the selected
 * event, so the title names it and there is no legend. Hover, or the arrow
 * keys on the focused plot, snap a crosshair to a day, and its tooltip reads
 * the day and the count ("Sep 30", "5"). The Chart | Table toggle swaps the
 * chart for every day of the window, so the tooltip never gates a value.
 *
 * The trend arrives filled to every day of the window (WebAnalyticsBody runs
 * it through fillTrendDays), so the average, the axis, the crosshair and the
 * table all count idle days. An event with no activity in the window (no days,
 * or only zero days) says so instead of drawing a flat line at 0, and shows "—"
 * for the average and the peak; its table still lists the idle days.
 */
export function TrendCard({event}: {event: VercelEvent}) {
  const {trend} = event;
  const {inWindow, dailyAverage, peak} = trendSummary(trend);
  // Only zero days (the filled idle window), or no days at all (no window and no data): nothing to chart.
  const active = inWindow > 0;
  const title = `${event.label} per day`;
  const span = spanOf(trend);
  // The chart's and the table's name: the title plus the days it covers.
  const name = span ? `${title}, ${span}` : title;
  const series: LineSeries[] = [
    {
      id: event.name,
      label: event.label,
      color: ADMIN_COLORS.accent,
      points: trend.map((point) => ({x: point.date, y: point.count})),
    },
  ];
  return (
    // ChartFrame draws no surface (R1-3b), so an untitled Panel is the card and the frame's title is its title.
    <Panel>
      <ChartFrame
        title={title}
        subtitle={`${fmtInt(event.visitors)} visitors all-time`}
        actions={
          <dl style={{display: 'flex', flexWrap: 'wrap', gap: `${SPACING.md}px ${SPACING.xxl}px`, margin: 0}}>
            <Stat label="In window" value={fmtInt(inWindow)} />
            <Stat label="Daily average" value={active ? fmtAverage(dailyAverage) : '—'} />
            <Stat label="Peak day" value={active && peak ? fmtDay(peak.date) : '—'} />
          </dl>
        }
        table={trendTable(name, trend)}>
        {active ? (
          // Keyed by event: picking another event starts its crosshair afresh,
          // while the frame keeps the Chart | Table choice.
          <LineChart
            key={event.name}
            series={series}
            ariaLabel={name}
            height={CHART_HEIGHT}
            area
            yFormat={fmtInt}
            xFormat={fmtDay}
          />
        ) : (
          <p style={{margin: 0, fontSize: ADMIN_TYPE.body, color: ADMIN_COLORS.muted}}>No activity in window.</p>
        )}
      </ChartFrame>
    </Panel>
  );
}
```

- [ ] **Step 12: Create the breakdown cards**

Create `src/tools/analytics/web/BreakdownCards.tsx`:

```tsx
import {
  ALL_INKS,
  INK_COLORS,
  InkIcon,
  RaritySymbol,
  SPACING,
  TRUNCATE,
  enchantedSymbol,
  epicSymbol,
  iconicSymbol,
  rarityConfigOf,
} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtInt} from '../../../ui/format';
import {MeterBar} from '../../../ui/MeterBar';
import {Notice} from '../../../ui/Notice';
import {Panel} from '../../../ui/Panel';
import type {Breakdown} from '../vercelAnalyticsTypes';
import {breakdownShares} from './webModel';

/** eventData props that carry an ink name: their rows get the ink's icon, and their bars the ink's colour. */
const INK_PROPS = new Set(['ink', 'clickedCardInk', 'cardAInk', 'cardBInk']);

/** The eventData prop that carries a card's rarity (reveal_card_click sends `card.rarity ?? null`). */
const RARITY_PROP = 'rarity';

/** Printings RaritySymbol doesn't draw; the app shows them from these webps (PrintingPills). */
const PRINTING_SYMBOLS: Record<string, string> = {enchanted: enchantedSymbol, epic: epicSymbol, iconic: iconicSymbol};

/** Row icon size in px. */
const ICON_SIZE = 18;

/** The row's ink, when its prop carries inks and its value is one. */
function inkOf(prop: string, value: string) {
  return INK_PROPS.has(prop) ? ALL_INKS.find((ink) => ink === value) : undefined;
}

/**
 * The icon in front of a row's value: the app's ink icon on ink props. On the
 * rarity prop, RaritySymbol draws Common to Legendary (the five keys
 * rarityConfigOf knows) and the printing webps cover Enchanted, Epic and
 * Iconic. "Others" and any other value show their text alone.
 */
function ValueIcon({prop, value}: {prop: string; value: string}) {
  const ink = inkOf(prop, value);
  if (ink) return <InkIcon ink={ink} size={ICON_SIZE} />;
  if (prop !== RARITY_PROP) return null;
  const rarity = rarityConfigOf(value);
  if (rarity) return <RaritySymbol rarity={rarity.key} size={ICON_SIZE} />;
  const printing = PRINTING_SYMBOLS[value.trim().toLowerCase()];
  if (!printing) return null;
  return (
    <img
      src={printing}
      alt=""
      aria-hidden
      width={ICON_SIZE}
      height={ICON_SIZE}
      style={{display: 'block', flexShrink: 0, objectFit: 'contain'}}
    />
  );
}

function BreakdownCard({breakdown}: {breakdown: Breakdown}) {
  const shares = breakdownShares(breakdown.rows);
  return (
    <Panel
      title={breakdown.label}
      action={<code style={{fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted}}>{breakdown.prop}</code>}>
      {shares.length === 0 ? (
        <p style={{margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>No data in window.</p>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: SPACING.sm,
          }}>
          {shares.map(({row, pct, fraction, others}) => {
            const ink = inkOf(breakdown.prop, row.value);
            const barColor = ink ? INK_COLORS[ink].border : others ? ADMIN_COLORS.barNeutral : ADMIN_COLORS.accent;
            return (
              <li
                key={row.value}
                title={`${row.value}: ${fmtInt(row.count)} (${pct}%)`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 110px) minmax(0, 1fr) 48px 36px',
                  gap: SPACING.sm,
                  alignItems: 'center',
                  fontSize: ADMIN_TYPE.small,
                }}>
                <span style={{display: 'flex', alignItems: 'center', gap: SPACING.sm, minWidth: 0}}>
                  <ValueIcon prop={breakdown.prop} value={row.value} />
                  <span style={{...TRUNCATE, color: others ? ADMIN_COLORS.muted : ADMIN_COLORS.text}}>{row.value}</span>
                </span>
                <MeterBar fraction={fraction} color={barColor} height={6} />
                <span style={{textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>{fmtInt(row.count)}</span>
                <span style={{textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: ADMIN_COLORS.muted}}>
                  {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/**
 * The selected event's eventData breakdowns over the reporting window, one
 * card each. Each bar is scaled to the breakdown's biggest row; the percent is
 * the row's share of the whole breakdown.
 */
export function BreakdownCards({breakdowns}: {breakdowns: Breakdown[]}) {
  if (breakdowns.length === 0) return <Notice>No property breakdowns configured for this event.</Notice>;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
        gap: SPACING.lg,
      }}>
      {breakdowns.map((breakdown) => (
        <BreakdownCard key={breakdown.prop} breakdown={breakdown} />
      ))}
    </div>
  );
}
```

- [ ] **Step 13: Create the page body**

Create `src/tools/analytics/web/WebAnalyticsBody.tsx`. The no-Vercel-data copy is today's `NoVercelDataNotice` text (`WebAnalyticsView.tsx:152-155`), with "this tab" changed to "this page". The body fills every event's trend to the reporting window before the cards and the trend card read it (see **Missing days**).

```tsx
import {useState} from 'react';
import {SPACING} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtDay, fmtInt} from '../../../ui/format';
import {Notice} from '../../../ui/Notice';
import type {VercelAnalytics} from '../vercelAnalyticsTypes';
import {BreakdownCards} from './BreakdownCards';
import {EventCards} from './EventCards';
import {TrendCard} from './TrendCard';
import {fillTrendDays, sortEventsByTotal} from './webModel';

/** Shown when the artifact reports hasVercelData: false (no token or project at build time). */
function NoVercelDataNotice() {
  return (
    <Notice>
      Web Analytics needs a Vercel access token when admin&apos;s Deploy workflow generates this data. Set the{' '}
      <code style={{color: ADMIN_COLORS.accent}}>VERCEL_ANALYTICS_TOKEN</code> and{' '}
      <code style={{color: ADMIN_COLORS.accent}}>ANALYTICS_VERCEL_PROJECT_ID</code> (the app&apos;s project) Actions
      secrets, then re-run the Deploy workflow to populate this page.
    </Notice>
  );
}

interface WebAnalyticsBodyProps {
  analytics: VercelAnalytics | null;
  /** Why the artifact could not be fetched (e.g. not generated yet); takes precedence over loading. */
  error?: Error | null;
}

/**
 * The Web analytics page body: the all-time summary, one card per event, then
 * the selected event's trend and breakdowns, with the busiest event selected
 * first. Data arrives through props, so Storybook renders it from fixtures;
 * `null` with no `error` means the artifact is still loading. Every state
 * comes from vercel-analytics.json alone, never from the vote artifacts.
 */
export function WebAnalyticsBody({analytics, error}: WebAnalyticsBodyProps) {
  const [selectedName, setSelectedName] = useState<string | null>(null);

  if (error) return <Notice tone="error">Could not load Web Analytics ({error.message}).</Notice>;
  if (!analytics) return <Notice>Loading Web Analytics...</Notice>;
  if (!analytics.hasVercelData) return <NoVercelDataNotice />;

  const {reportingWindow} = analytics;
  // Every day of the window, idle ones as 0, before the sparklines, the chart,
  // its table and the daily average read a trend.
  const events = sortEventsByTotal(analytics.events).map((event) => ({
    ...event,
    trend: fillTrendDays(event.trend, reportingWindow),
  }));
  if (events.length === 0) return <Notice>No events tracked yet.</Notice>;

  const selected = events.find((event) => event.name === selectedName) ?? events[0];
  const total = events.reduce((sum, event) => sum + event.total, 0);
  const eventTypes = `${events.length} event ${events.length === 1 ? 'type' : 'types'}`;

  return (
    <div style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: SPACING.xl}}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: SPACING.md,
        }}>
        <p style={{margin: 0, fontSize: ADMIN_TYPE.body, color: ADMIN_COLORS.muted}}>
          <b style={{color: ADMIN_COLORS.text}}>{fmtInt(total)}</b> events tracked across {eventTypes} · all-time
        </p>
        {reportingWindow && (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: SPACING.sm,
              minHeight: 30,
              padding: `0 ${SPACING.md}px`,
              border: `1px solid ${ADMIN_COLORS.inputBorder}`,
              borderRadius: ADMIN_RADIUS.pill,
              fontSize: ADMIN_TYPE.small,
              color: ADMIN_COLORS.muted,
            }}>
            Trends &amp; breakdowns{' '}
            <b style={{color: ADMIN_COLORS.text, fontWeight: 600}}>
              {fmtDay(reportingWindow.since)} – {fmtDay(reportingWindow.until)}
            </b>
          </span>
        )}
      </div>
      <EventCards events={events} selectedName={selected.name} onSelect={setSelectedName} />
      <TrendCard event={selected} />
      <BreakdownCards breakdowns={selected.breakdowns} />
    </div>
  );
}
```

- [ ] **Step 14: Run the view test to confirm it passes**

Run: `pnpm vitest run src/tools/analytics/web/__tests__/WebAnalyticsBody.test.tsx`
Expected: PASS, 25 tests.

- [ ] **Step 15: Add the stories**

Create `src/tools/analytics/web/WebAnalyticsBody.stories.tsx`. `Populated`, `Loading` and `NoToken` are ported from `WebAnalyticsView.stories.tsx`. `SparseEvents`, `OneDayTrend`, `LoadError` and `NoEvents` are new. The crosshair and the table view are the kit's, so the stories need no play functions: Step 25 hovers, tabs and presses Table by hand.

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {FONTS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {WebAnalyticsBody} from './WebAnalyticsBody';
import type {TrendPoint, VercelAnalytics} from '../vercelAnalyticsTypes';

const meta: Meta<typeof WebAnalyticsBody> = {
  title: 'Admin/Insights/Web analytics',
  component: WebAnalyticsBody,
  parameters: {layout: 'fullscreen'},
  tags: ['autodocs'],
  // The page body's frame (PageLayout's padding on the admin page colour). The
  // event cards' adm-card-btn states come from .storybook/preview.tsx, which
  // mounts AdminStyles for every story. The trend card is the chart kit's
  // ChartFrame and LineChart (R1-3b), so its crosshair, tooltip and table view
  // are the kit's own.
  decorators: [
    (Story) => (
      <div
        style={{
          background: ADMIN_COLORS.page,
          color: ADMIN_COLORS.text,
          fontFamily: FONTS.body,
          padding: `${SPACING.xxl}px ${SPACING.xxxl}px`,
          minHeight: '100vh',
        }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

/** Deterministic sawtooth trend over June, so the charts look alive without random data. */
function trend(base: number): TrendPoint[] {
  return Array.from({length: 30}, (_, i) => ({
    date: `2026-06-${String(i + 1).padStart(2, '0')}`,
    count: base + ((i * 7) % 11),
  }));
}

const populated: VercelAnalytics = {
  generatedAt: '2026-07-03T12:00:00.000Z',
  hasVercelData: true,
  // The window the trend() points fill.
  reportingWindow: {since: '2026-06-01', until: '2026-06-30'},
  events: [
    {
      name: 'reveal_card_click',
      label: 'Reveal card clicks',
      total: 4820,
      visitors: 1310,
      trend: trend(30),
      breakdowns: [
        {
          prop: 'source',
          label: 'By source',
          rows: [
            {value: 'mosaic', count: 3120, visitors: 980},
            {value: 'franchise_modal', count: 1700, visitors: 610},
          ],
        },
        {
          prop: 'franchise',
          label: 'By franchise',
          rows: [
            {value: 'Frozen', count: 1400, visitors: 520},
            {value: 'The Little Mermaid', count: 1100, visitors: 430},
            {value: 'Mulan', count: 820, visitors: 300},
            {value: 'Peter Pan', count: 700, visitors: 260},
            {value: 'Others', count: 800, visitors: 300},
          ],
        },
        {
          prop: 'ink',
          label: 'By ink',
          rows: [
            {value: 'Amber', count: 990, visitors: 420},
            {value: 'Emerald', count: 880, visitors: 390},
            {value: 'Ruby', count: 760, visitors: 340},
            {value: 'Sapphire', count: 720, visitors: 300},
            {value: 'Amethyst', count: 700, visitors: 290},
            {value: 'Steel', count: 770, visitors: 310},
          ],
        },
        {
          prop: 'type',
          label: 'By card type',
          rows: [
            {value: 'Character', count: 3600, visitors: 1120},
            {value: 'Action', count: 700, visitors: 300},
            {value: 'Item', count: 320, visitors: 150},
            {value: 'Location', count: 200, visitors: 90},
          ],
        },
        {
          prop: 'rarity',
          label: 'By rarity',
          rows: [
            {value: 'Common', count: 1200, visitors: 500},
            {value: 'Uncommon', count: 980, visitors: 420},
            {value: 'Rare', count: 900, visitors: 380},
            {value: 'Super Rare', count: 820, visitors: 340},
            {value: 'Legendary', count: 620, visitors: 260},
            {value: 'Enchanted', count: 300, visitors: 140},
          ],
        },
        {
          prop: 'deviceType',
          label: 'By device',
          rows: [
            {value: 'desktop', count: 3100, visitors: 900},
            {value: 'mobile', count: 1500, visitors: 520},
            {value: 'tablet', count: 220, visitors: 90},
          ],
        },
      ],
    },
    {
      name: 'vote_submitted',
      label: 'Votes submitted',
      total: 1240,
      visitors: 410,
      trend: trend(8),
      breakdowns: [
        {
          prop: 'voteType',
          label: 'By vote type',
          rows: [
            {value: 'quick', count: 720, visitors: 260},
            {value: 'score', count: 360, visitors: 140},
            {value: 'in_depth', count: 160, visitors: 70},
          ],
        },
        {
          prop: 'engineScore',
          label: 'By engine score',
          rows: [
            {value: '3', count: 60, visitors: 40},
            {value: '4', count: 120, visitors: 70},
            {value: '5', count: 260, visitors: 120},
            {value: '6', count: 240, visitors: 110},
            {value: '7', count: 300, visitors: 130},
            {value: '8', count: 180, visitors: 90},
            {value: '9', count: 80, visitors: 50},
          ],
        },
        {
          prop: 'userScore',
          label: 'By user score',
          rows: [
            {value: '4', count: 90, visitors: 60},
            {value: '5', count: 150, visitors: 90},
            {value: '6', count: 210, visitors: 110},
            {value: '7', count: 300, visitors: 140},
            {value: '8', count: 260, visitors: 120},
            {value: '9', count: 150, visitors: 80},
            {value: '10', count: 80, visitors: 50},
          ],
        },
        {
          prop: 'deviceType',
          label: 'By device',
          rows: [
            {value: 'desktop', count: 820, visitors: 300},
            {value: 'mobile', count: 380, visitors: 150},
            {value: 'tablet', count: 40, visitors: 20},
          ],
        },
      ],
    },
    {
      name: 'search_submitted',
      label: 'Searches',
      total: 2010,
      visitors: 640,
      trend: trend(14),
      breakdowns: [
        {
          prop: 'source',
          label: 'By source',
          rows: [
            {value: 'home', count: 1200, visitors: 410},
            {value: 'gallery', count: 540, visitors: 190},
            {value: 'mobile_sheet', count: 270, visitors: 110},
          ],
        },
        {
          prop: 'query',
          label: 'Top queries',
          rows: [
            {value: 'elsa', count: 210, visitors: 120},
            {value: 'shift', count: 180, visitors: 90},
            {value: 'seven dwarfs', count: 150, visitors: 80},
            {value: 'Others', count: 1470, visitors: 520},
          ],
        },
      ],
    },
    {
      name: 'vote_skipped',
      label: 'Votes skipped',
      total: 330,
      visitors: 120,
      trend: trend(2),
      breakdowns: [
        {
          prop: 'engineScore',
          label: 'By engine score',
          rows: [
            {value: '2', count: 90, visitors: 50},
            {value: '3', count: 120, visitors: 60},
            {value: '4', count: 70, visitors: 40},
            {value: '5', count: 30, visitors: 20},
            {value: '6', count: 20, visitors: 12},
          ],
        },
      ],
    },
  ],
};

/**
 * Four events over June. Hover the trend, or tab to it and use the arrow keys,
 * Home and End: the crosshair snaps to a day and the tooltip reads it ("Jun 16")
 * with its count. Table swaps the chart for all 30 days.
 */
export const Populated: Story = {args: {analytics: populated}};

/**
 * The edges of real data: one event with a single day of data in a 61-day
 * window (the other 60 fill as zeros), one with no days and no breakdowns,
 * and an empty breakdown.
 */
export const SparseEvents: Story = {
  args: {
    analytics: {
      generatedAt: '2026-09-30T04:00:00.000Z',
      hasVercelData: true,
      reportingWindow: {since: '2026-08-01', until: '2026-09-30'},
      events: [
        {
          name: 'synergy_card_clicked',
          label: 'Synergy cards followed',
          total: 64,
          visitors: 21,
          trend: [{date: '2026-09-30', count: 5}],
          breakdowns: [
            {
              prop: 'clickedCardInk',
              label: 'By ink',
              rows: [
                {value: 'Sapphire', count: 3, visitors: 2},
                {value: 'Ruby', count: 2, visitors: 2},
              ],
            },
            {prop: 'groupKey', label: 'By synergy group', rows: []},
          ],
        },
        {name: 'sort_changed', label: 'Sort changes', total: 9, visitors: 4, trend: [], breakdowns: []},
      ],
    },
  },
};

/**
 * No reporting window and one day of data: the chart has one point and one
 * label, and the table one row.
 */
export const OneDayTrend: Story = {
  args: {
    analytics: {
      generatedAt: '2026-09-30T04:00:00.000Z',
      hasVercelData: true,
      reportingWindow: null,
      events: [
        {
          name: 'vote_skipped',
          label: 'Votes skipped',
          total: 230,
          visitors: 90,
          trend: [{date: '2026-09-30', count: 3}],
          breakdowns: [],
        },
      ],
    },
  },
};

export const Loading: Story = {args: {analytics: null}};

export const LoadError: Story = {
  args: {analytics: null, error: new Error('vercel-analytics.json has not been generated yet')},
};

export const NoToken: Story = {
  args: {
    analytics: {
      generatedAt: '2026-07-03T12:00:00.000Z',
      hasVercelData: false,
      reportingWindow: null,
      events: [],
    },
  },
};

export const NoEvents: Story = {
  args: {
    analytics: {
      generatedAt: '2026-07-03T12:00:00.000Z',
      hasVercelData: true,
      reportingWindow: {since: '2026-05-04', until: '2026-07-03'},
      events: [],
    },
  },
};
```

- [ ] **Step 16: Lint and typecheck**

Run: `pnpm lint`
Expected: no errors. The new files pass every `inkweave/*` rule and jsx-a11y, no `<button>` has a `style`, and nothing calls `useMemo` or `useCallback`.

Run: `pnpm typecheck`
Expected: exits 0. This includes the newly bridged `InkIcon.tsx`, `RaritySymbol.tsx` and `rarity.ts`. `vite/client` types their `.svg` imports and the webps' `?no-inline` imports. It also checks `TrendCard`'s props against R1-3b's `ChartFrame`, `ChartTable`, `LineChart` and `LineSeries`.

- [ ] **Step 17: Commit**

Run with the Bash tool, only after the owner approves:
```bash
git add src/app-bridge.ts src/tools/analytics/web/EventCards.tsx src/tools/analytics/web/TrendCard.tsx src/tools/analytics/web/BreakdownCards.tsx src/tools/analytics/web/WebAnalyticsBody.tsx src/tools/analytics/web/WebAnalyticsBody.stories.tsx src/tools/analytics/web/__tests__/WebAnalyticsBody.test.tsx
USER_APPROVED=1 git commit -m "feat(analytics): build the web analytics view on the chart kit, with ink and rarity icons (#24)"
```

- [ ] **Step 18: Write the failing page and route tests**

Create `src/tools/analytics/web/__tests__/WebAnalyticsPage.test.tsx`:

```tsx
import {afterEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {WebAnalyticsPage} from '../WebAnalyticsPage';
import type {VercelAnalytics} from '../../vercelAnalyticsTypes';

// src/test/setup.ts empties the artifact cache before every test (R1-5).
afterEach(() => {
  vi.unstubAllGlobals();
});

const json = (body: unknown) => new Response(JSON.stringify(body), {headers: {'content-type': 'application/json'}});

const ANALYTICS: VercelAnalytics = {
  generatedAt: '2026-09-29T04:00:00Z',
  hasVercelData: true,
  reportingWindow: null,
  events: [{name: 'vote_submitted', label: 'Votes submitted', total: 12, visitors: 3, trend: [], breakdowns: []}],
};

function renderPage() {
  render(
    <MemoryRouter>
      <WebAnalyticsPage />
    </MemoryRouter>,
  );
}

describe('WebAnalyticsPage', () => {
  it('loads vercel-analytics.json and dates the page from it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(ANALYTICS));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    expect(screen.getByRole('heading', {name: 'Web analytics'})).toBeInTheDocument();
    expect(screen.getByText('Vercel custom events from inkweave.ink')).toBeInTheDocument();
    expect(screen.getByText('Loading Web Analytics...')).toBeInTheDocument();
    expect(screen.queryByText(/Data as of/)).not.toBeInTheDocument();

    expect(await screen.findByText('2026-09-29')).toBeInTheDocument();
    expect(screen.getByText(/Data as of/)).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /Votes submitted/})).toHaveAttribute('aria-pressed', 'true');
    expect(fetchMock).toHaveBeenCalledWith('/admin-data/vercel-analytics.json');
  });

  it('fails on its own artifact alone, without fetching the vote artifacts', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', {status: 404}));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load Web Analytics (vercel-analytics.json: HTTP 404).',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
```

In `src/router.test.tsx`, add this case inside `describe('admin routes', …)`:
- It uses the file's existing `renderAt` helper.
- The file's `beforeEach` fetch stub never settles, so the page stays in its loading state.
- `/web` doesn't write, so the header shows no branch notice (R-4).

```tsx
  it('opens web analytics at /web, current in the sidebar and with no branch notice', () => {
    renderAt('/web');
    expect(screen.getByRole('heading', {name: 'Web analytics'})).toBeInTheDocument();
    expect(screen.getByText('Loading Web Analytics...')).toBeInTheDocument();
    const link = screen.getByRole('link', {name: /Web analytics/});
    expect(link).toHaveAttribute('href', '/web');
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByText('master')).not.toBeInTheDocument();
  });
```

- [ ] **Step 19: Run them to confirm they fail**

Run: `pnpm vitest run src/tools/analytics/web/__tests__/WebAnalyticsPage.test.tsx src/router.test.tsx`
Expected: FAIL.
- `WebAnalyticsPage.test.tsx` fails with `Error: Failed to resolve import "../WebAnalyticsPage"`.
- `opens web analytics at /web` fails with `Unable to find an accessible element with the role "heading" and name "Web analytics"`.

- [ ] **Step 20: Create the page**

Create `src/tools/analytics/web/WebAnalyticsPage.tsx`:

```tsx
import {PageLayout} from '../../../shell/PageLayout';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {useVercelAnalytics} from '../useVercelAnalytics';
import {WebAnalyticsBody} from './WebAnalyticsBody';

/**
 * The Web analytics route (/web): Vercel custom events from inkweave.ink. It
 * reads only vercel-analytics.json (cached for the session by fetchAdminData),
 * so it loads, fails and dates itself independently of the vote artifacts.
 */
export function WebAnalyticsPage() {
  const {data, error} = useVercelAnalytics();
  return (
    <PageLayout
      title="Web analytics"
      subtitle="Vercel custom events from inkweave.ink"
      meta={
        data ? (
          <>
            Data as of <code style={{color: ADMIN_COLORS.muted}}>{data.generatedAt.slice(0, 10)}</code>
          </>
        ) : undefined
      }>
      <WebAnalyticsBody analytics={data} error={error} />
    </PageLayout>
  );
}
```

- [ ] **Step 21: Add the sidebar entry and its Sidebar test line**

In `src/shell/nav.ts`, add this entry to `NAV_ITEMS` directly after the Vote activity entry (`id: 'activity'`). The Insights group then reads Analytics (Calibration & tuning from R1-11), Vote activity, Web analytics, which is the spec's order (Card analytics joins in R3). This is an insertion, and no existing line in `nav.ts` changes.
```ts
  {id: 'web', label: 'Web analytics', mark: 'Wa', path: '/web', group: 'insights', writes: false},
```

The sidebar test pins the Insights links, so it changes with the entry. In `src/shell/Sidebar.test.tsx` (R1-6's test as R1-9 left it), in `it('lists the pages under their group labels', …)`, replace:
```tsx
    expect(hrefs('Insights')).toEqual(['/analytics', '/activity']);
```
with:
```tsx
    expect(hrefs('Insights')).toEqual(['/analytics', '/activity', '/web']);
```
R1-11 Step 13 later turns `'/analytics'` into `'/calibration'` in this list.

- [ ] **Step 22: Add the route**

In `src/router.tsx`, add the import next to the other page imports:
```tsx
import {WebAnalyticsPage} from './tools/analytics/web/WebAnalyticsPage';
```
Then add the route to the `AdminShell` route's `children`, directly after the `activity` route:
```tsx
      {path: 'web', element: <WebAnalyticsPage />},
```

- [ ] **Step 23: Run them to confirm they pass**

Run: `pnpm vitest run src/tools/analytics/web/__tests__/WebAnalyticsPage.test.tsx src/router.test.tsx src/shell/Sidebar.test.tsx`
Expected: PASS. Both page tests pass, and so does every router case, the new one included, and every Sidebar case with the three Insights links.

- [ ] **Step 24: Full checks**

Run: `pnpm lint`
Expected: no errors.

Run: `pnpm typecheck`
Expected: exits 0.

Run: `pnpm test:run`
Expected: every suite passes.

- [ ] **Step 25: Look at it**

1. Run `pnpm storybook` (http://localhost:6007) and open **Admin/Insights/Web analytics**. Check that:
   - **Populated:** the cards are sorted 4,820 / 2,010 / 1,240 / 330, and the first one is pressed (gold edge and line).
   - **Populated:** the trend is a 2px gold line over a faint gold wash. It has one y axis of clean ticks from 0 on hairline gridlines, and x labels Jun 1, Jun 8, Jun 16, Jun 23, Jun 30. There is no legend: the title names the one series.
   - **Populated:** hovering the plot snaps a hairline crosshair and a marker to the nearest day. The tooltip reads the day ("Jun 16") and the count, keyed with a short gold line, and moving off the plot hides it.
   - **Populated:** Tab reaches the plot, which shows the focus ring. ←, →, Home and End move the crosshair and the tooltip as the pointer does.
   - **Populated:** Table swaps the chart for a Day / Count table of all 30 days, and the stats stay in the header. Picking "Searches" keeps the table, now for Searches. Chart brings the line back.
   - **Populated:** the card totals, the axis labels, the tooltip text and the stats use text colours, never the gold. In the trend card only the line, its marker and its wash are gold.
   - **Populated:** "By ink" has ink icons and ink-coloured bars.
   - **Populated:** every rarity has its symbol, Enchanted included.
   - **Populated:** "Others" is last, with a neutral bar, on "By franchise" and "Top queries".
   - **SparseEvents:**
     - A line flat at 0 that rises only on Sep 30, labelled Aug 1, Aug 16, Aug 31, Sep 15 and Sep 30, with a daily average of 0.1 (5 over the window's 61 days). The crosshair reads 0 on the idle days.
     - "No data in window." on "By synergy group".
     - After you pick "Sort changes": "No activity in window." and the no-breakdowns notice. Table lists the 61 idle days as 0.
   - **OneDayTrend:** one point under the one label Sep 30, a tooltip of "Sep 30" and 3, and a one-row table.
   - You can reach the cards by keyboard, and they show the focus ring. No card holds a second control.
   - The Accessibility panel (`@storybook/addon-a11y`) reports no violations on **Populated**, with the chart showing and with the table showing.
   - With reduced motion on (Chrome DevTools, Rendering, "Emulate CSS media feature prefers-reduced-motion: reduce"), the crosshair and the tooltip move without transitions.
2. Load the real data (see "Seeing R1 with real data locally"), run `pnpm dev` and open http://localhost:5180/web. Check that:
   - The header reads "Data as of" with the artifact's date.
   - The x labels follow the Deploy run's window. At the default 60-day lookback that is 61 days inclusive (`reportingWindow` in `scripts/lib/vercelAnalytics.mjs`). The labels fall on the first day, every 15 days after it, and the last day.
   - Every event's chart starts at `reportingWindow.since` and ends at `until`, even when its `trend` in DevTools (Network, `vercel-analytics.json`) has fewer points than the window has days: `fillTrendDays` fills the missing days with 0, and the table lists every day. Note in the PR whether Vercel's trends skipped idle days, since the repo doesn't say.

- [ ] **Step 26: Commit**

Run with the Bash tool, only after the owner approves:
```bash
git add src/tools/analytics/web/WebAnalyticsPage.tsx src/tools/analytics/web/__tests__/WebAnalyticsPage.test.tsx src/shell/nav.ts src/shell/Sidebar.test.tsx src/router.tsx src/router.test.tsx
USER_APPROVED=1 git commit -m "feat(analytics): serve web analytics at /web (#24)"
```

<!-- No review note rejected. Note 3: the sidebar link query matches /Web analytics/, not the exact string, because the nav task may put the "Wa" mark inside the link's accessible name; the assumption is recorded under Contract additions. -->
<!-- Review round 2026-10-01 (8 notes): all applied, none rejected. Verified against upstream/inkweave/apps/web/src/shared/hooks/useContainerWidth.ts (0 until a ResizeObserver reports), R1-08's WeeklyCard stub and its aria-valuenow assumption, R1-09's "Every bar renders in jsdom", axe-core 4.13.0 (slider: requiredAttrs ['aria-valuenow']), R1-02's adm-card-btn pressed rule (accentTintSoft fill, accentStrong edge), the main plan's "Text never wears the series colour" (only gapColor is carved out) and LineChart's xTicks default, R1-12's census (positions from aria-valuemax − aria-valuemin + 1) and .husky (typecheck runs on push only). Choices: note 5 took option A (totals in the text colour); option B needs an owner decision row in the main plan, which this task can't add, and the handoff's "gold number" yields to the plan's rule. Note 6 took option A (windowTicks deleted, model tests 19 → 15): R2's LineCharts use the same default, so one tick rule serves every line chart, and a new kit assumption pins Math.round, which the view test's Sep 17 / 21 / 26 labels check. Note 7's reworded bullet drops "(and windowTicks)" with it. Note 8's new Step 5 renumbers the later steps by one (no other task file cites R1-10's step numbers); view tests 23 → 25. -->
