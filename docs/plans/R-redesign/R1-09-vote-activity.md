> Part of [R: Admin redesign](../R-redesign.md). Read its decisions, corrections to the spec, global constraints and shared interfaces first.

**Runs after R1-3b.** The chart, the range control and the week buckets are built on the chart kit (`src/charts/`). Decision R-9 sets the range; R-12 sets the chart's interaction.

### Contract additions (R1-9)

All of these are additions. Nothing in the contract is renamed.

- **`src/tools/analytics/activity/activityModel.ts`**
  - `ActivityFilters.range` (already in the contract) is `'30d'` in `NO_FILTERS`. `ActivityFilters.day` holds the picked bar's key: a UTC day, or the week's Monday when the chart buckets by week.
  - `filterVotes` ignores `range`. The range counts back from the whole log's newest vote, which a filtered list can't know, so the view narrows to the range first (`activityWindow`, then `votesInRange`).
  - `filterVotes`' `day` matches one UTC day. In week buckets pass `day: null` and narrow with `votesInBucket`, as ActivityView does. Passed straight through in week mode, a week's Monday would keep only that Monday's votes.
  - `hasActiveFilters` ignores `range` too. "Clear filters" resets the search, voter, band and picked bar, and keeps the range.
  - `dailyStacks(votes, days, endDay?)` takes an optional third parameter. It defaults to the newest vote's day, as the contract says. `chartStacks` passes the range's last day, so a filter never shifts the window.
  - `weeklyStacks(votes, startDay, endDay)` (already in the contract) counts only the votes from `startDay` to `endDay`, so the first and last weeks can be part weeks. A window that ends before it starts gives `[]`.
  - New exports, all tested:
    - `type ChartBucket = 'day' | 'week'`, the type `bucketFor` returns
    - `NO_FILTERS: ActivityFilters`
    - `SCORE_BANDS: readonly ScoreBand[]` (`['high','mid','low','unscored']`)
    - `BAND_LABELS: Record<ScoreBand, string>` (`7+`, `5–6`, `≤4`, `No score`)
    - `hasActiveFilters(f): boolean`
    - `countOf(n, noun): string` (`"1 vote"`, `"2,054 votes"`)
    - `carriesLabel(vote): string`
    - `interface LogDay {day; count; voters; rows: VoteLogRow[]}`
    - `logPage(votes, limit): {days: LogDay[]; hidden: number}`
    - `activityWindow(votes, range): {startDay: string; endDay: string} | null`. It ends on the newest vote's UTC day and starts at `rangeStartDay(range, endDay, <the oldest vote's day>)`. It is null for an empty log.
    - `chartStacks(votes, startDay, endDay): {bucket: ChartBucket; stacks: DayStack[]}`. `bucketFor` picks the bucket; days come from `dailyStacks`, weeks from `weeklyStacks`.
    - `votesInBucket(votes, key, bucket): VoteLogRow[]`, the votes under one bar: its UTC day, or the seven days from its Monday.
- **`src/tools/analytics/activity/activityChart.ts`** (new). The chart's pure parts, so they are tested without the kit's DOM:
  - `BAND_SERIES: readonly SeriesDef[]`. Each id is its `ScoreBand` and each label its `BAND_LABELS` entry. The colours are `under`, `barNeutral`, `over` and `muted`, and No score has `pattern: 'hatch'`.
  - `chartTitle(bucket)`: "Votes per day" or "Votes per week".
  - `bucketTitle(key, bucket, startDay?, endDay?)`: "Wed Sep 30" or "Week of Sep 28". Given the range's days, a week the range clips says so: "Week of Sep 28 (to Sep 30)", "Week of Jun 8 (from Jun 10)". The tooltips and the table view pass the range; the log's summary (`pickedLabel`) and the log's day picker use the plain form.
  - `chartSubtitle(bucket, startDay, endDay)`: the range's days and how to pick a bar. A weekly chart also says which end weeks the range clips (", first and last weeks partial", ", first week partial", ", last week partial", or nothing when it runs Monday to Sunday).
  - `barData(stacks): BarDatum[]`, `tooltipFor(stacks, bucket, startDay, endDay): (d: BarDatum) => TooltipContent`, `chartTable(stacks, bucket, startDay, endDay): ChartTable`.
  - The tooltip's band rows read "scored 7+", "scored 5–6", "scored ≤4" and "with no score" (a private `BAND_ROW_LABELS`), so a bar's accessible name is heard as "5 scored 7+", not "5 7+". `BAND_LABELS` stays for the legend and the table headers.
  - `labelEvery(bars): number`, the chart's `xLabelEvery`.
  - It holds `BAND_FILL`, so Step 8 points R1-2's theme-test comment at this file.
- **Component naming.** The filter row component is `ActivityFilterBar`, not `ActivityFilters`, because `ActivityFilters` is the contract's type. The KPI row is `ActivityKpiRow`. `VotesPerDayChart` keeps its name, though it charts weeks past 90 days.
- **`VoteLogTable`** takes `pickedLabel` ("Wed Sep 30", "Week of Sep 28") rather than the picked day, so the log's summary can name a week as well as a day. It also takes an optional `picker?: React.ReactNode`, rendered in its Panel's `action` before the summary. `ActivityView` passes the "Pick a day" select there (Hit targets, below).
- **For R1-12 (not a contract change).** R1-12 Step 18 stops whenever a `plot: 'bars'` chart's `minHit` is under 24. Vote activity's columns are under 24px at 90 days on every layout (Hit targets, below), so as written that stop fires on every run. Its check should accept the equivalent control instead: the vote log's "Pick a day" select ("Pick a week" for weekly bars) is present, at least 24px tall, and lists "All days" (or "All weeks") plus one option per bar. `minHit` is then recorded as information, not a pass or fail.
- **For the main plan's maintainer (not an implementation step): a row for "Decisions made in planning".** Add this row: "Votes per day prints totals on two bars only, the newest and the busiest (the kit's `capLabels: 'extremes'`), not README §4's total and 'N voters' over every bar. The `dataviz` rule is to label selectively. Every bar's band counts and voters are in its tooltip, which is also its accessible name, and in the table view."
- **Contract additions requested of R1-3b (lift into the main plan's Chart kit block).** R1-3b's file wasn't written when this task was revised, so this task builds against the contract's "Chart kit (R1-3b)" block and reads it as below. Where the contract leaves a point open, the reading is a request to R1-3b.
  - Import paths:
    - `addDays`, `eachDay` and `weekStart` from `src/charts/scale.ts`
    - `RangePreset`, `RangeControl`, `rangeStartDay` and `bucketFor` from `src/charts/range`. The import has no extension, so it resolves whether the file is `range.ts` or, since it holds a component, `range.tsx`.
    - `SeriesDef` from `src/charts/series.ts`, `TooltipContent` from `src/charts/ChartTooltip.tsx`, `ChartLegend` from `src/charts/ChartLegend.tsx`, `ChartFrame` and `ChartTable` from `src/charts/ChartFrame.tsx`, `BarChart` and `BarDatum` from `src/charts/BarChart.tsx`
  - `rangeStartDay` counts the preset's days back from `endDay`, both ends included. From Wed Sep 30, `'7d'` starts on Sep 24, `'30d'` on Sep 1 and `'90d'` on Jul 3. `'all'` starts on `firstDay`, and every preset stops there.
  - `bucketFor` gives `'week'` only past 90 days. The tests stay off the boundary (a 90-day window, a 113-day one), so the kit can count the span either way.
  - `RangeControl` is a SegmentedControl group named "Range", with buttons labelled from `RANGE_OPTIONS` ("7 days", "30 days", "90 days", "All").
  - `BarChart` with `onSelect`:
    - It renders one button per datum, in data order, with `aria-pressed` from `selectedKey`.
    - Each button's accessible name is its tooltip text, title first, each row read value first ("Wed Sep 30: 12 votes, 5 scored 7+, …"). The tests find a bar by `name: /^Wed Sep 30\b/` and read "12 votes" and "4 voters" in it.
    - Every bar renders in jsdom: the plot doesn't wait for a measured width.
    - Series stack in the order given, and `pattern: 'hatch'` draws 45° stripes in the series colour.
    - `xLabelEvery` = k prints the labels at indexes n−1, n−1−k, n−1−2k, …, counting back from the last bar, so the newest day keeps its label and the gaps stay even. The contract says only "the last one always prints".
    - A bar with votes stays visible however tall the busiest bar is, as the old chart's `SPACING.xxs` floor did.
    - Each bar's hit area is its whole column, and the `role="button"` element itself takes the pointer: it never has `pointer-events: none`. The tests click that element, and userEvent throws on one with `pointer-events: none` in jsdom.
    - A pick of the picked bar may hand back its key or `null`. The view clears the pick either way.
  - `ChartFrame`:
    - Its title is a heading, and its subtitle one text element.
    - The Chart | Table toggle has buttons named "Chart" and "Table". Table shows a `<table>` named by `table.caption`, with a column header per `columns` entry and a row per `rows` entry.
    - It draws no card surface, as R1-8 and R1-10 read it, so `VotesPerDayChart` wraps it in an untitled `Panel`. R1-2's chart-mark test measures against that Panel's card fill. If R1-3b's frame draws its own surface, drop the Panel.
  - `ChartLegend` renders no buttons.
  - **Where each step depends on these readings.** If R1-3b lands with other names, DOM or behaviour, these are the parts to revisit:
    - Steps 1 and 3 (the model and its tests) on `rangeStartDay` and `bucketFor`. `activityWindow`'s test pins the inclusive count (90 days from Wed Sep 30 start on Jul 3, so 90 bars), and `chartStacks` buckets by `bucketFor`.
    - Step 8 on `xLabelEvery`'s direction and on the frame's surface. If the kit counts forward from the first bar, `labelEvery` itself has to change, not only a query: 30 bars at step 7 would print indexes 0, 7, 14, 21 and 28 plus the always-printed 29, so "Sep 29" and "Sep 30" would collide. If the frame draws its own surface, `VotesPerDayChart` drops its Panel (above).
    - Steps 6 and 11 (the component and view tests) on the DOM names (bar buttons named by their tooltip text, the "Range" group, the "Chart" and "Table" buttons, the table's caption), on every bar rendering at width 0, and on bar elements that take a click.
- **What this task assumes about earlier R1 tasks.** These follow the File structure table.
  - Import paths:
    - each primitive from its own file, `src/ui/<Name>.tsx`
    - format from `src/ui/format.ts`
    - theme from `src/theme/adminTheme.ts` (AdminStyles is mounted by the shell and by Storybook's preview, never imported here)
    - `PageLayout` from `src/shell/PageLayout.tsx`
  - `SegmentedControl` renders one `<button aria-pressed>` per option, named by its label, inside a `group` named by `ariaLabel`. It never calls `onChange` for the option already selected.
  - `Panel` renders `title`, `action` and `children`.
  - `PageLayout` renders `title` as a heading.
  - `Notice` renders its children inside one element.
  - `.storybook/preview.tsx` mounts `<AdminStyles />` for every story (R1-2), so the stories don't.
  - `src/test/setup.ts` empties the artifact cache before every test (R1-5), so no test here resets it.
  - R1-2's `src/theme/__tests__/adminTheme.test.ts` has this comment line above `chartMarks`: `    // The Votes per day bands (BAND_FILL in src/tools/analytics/activity/VotesPerDayChart.tsx)`.
  - R1-6's `NAV_ITEMS` in `src/shell/nav.ts` has its analytics entry as this exact line: `  {id: 'analytics', label: 'Analytics', mark: 'An', path: '/analytics', group: 'insights', writes: false},`. The activity entry goes directly below it. R1-11 Step 15 later swaps that line in place for the calibration entry.
  - R1-6's `src/shell/Sidebar.test.tsx` pins the Insights links in order (`expect(hrefs('Insights')).toEqual(['/analytics']);`), so Step 21 adds `/activity` to it. Its `nav.test.ts` checks `navItemFor` and `isWritePath` per path and pins no list of ids.
  - Until R1-11, `src/router.tsx` still has the line `import {AnalyticsPage} from './tools/analytics/AnalyticsPage';` and the route `{path: 'analytics', element: <AnalyticsPage />},`.
  - The last test in `src/router.test.tsx`'s `describe('admin routes', …)` is R1-6's `it('keeps the sidebar collapsed across reloads', …)`. R1-7 and R1-8 leave it in place.
- **Pair key.** The log is already canonical:
  - `buildVoteLog` puts the lower id in `a` (`scripts/lib/voteAnalytics.mjs:200`), and the votes table enforces `card_a_id < card_b_id`.
  - `topPairs` still keys pairs by sorted ids, like `pairKey` in the same script, so a hand-made fixture can't split a pair. A pair takes its names from its first row.
  - `carriesLabel` relies on the canonical order: `'a'` names `aName`.
- **Behaviour decisions.** They follow R-9, the `dataviz` guidance, the prototype and the review findings.
  - **The range (R-9).** The filter row starts with it: 7 / 30 / 90 days / All, 30 by default. It ends on the whole log's newest vote, so a filter never shifts it, and it never starts before the oldest vote, so a young log charts only its own days. It scopes everything below it: the KPIs, the chart, the log and the side panels all read `votesInRange` of it.
  - **The rest of the filter row** (search, voter, band) also narrows everything below it. The bar picked in the chart narrows only the vote log, so the KPIs, the chart and the side panels keep their context. This matches the prototype's `base` and the review's `activity-whole-log-chart` verdict.
  - **"Clear filters"** resets the search, voter, band and picked bar, and keeps the range. The range is the window the page reads, and a reader clearing a search seldom means to jump back to 30 days. A range on its own shows no "Clear filters".
  - **A new range drops the picked bar.** Its day can fall outside the new window, and a day's key means nothing once the bars are weeks.
  - **Weeks past 90 days.** The chart buckets by week (`bucketFor`). Each bar is keyed by its UTC Monday, labelled "Sep 28" under the axis, and titled "Week of Sep 28" in its tooltip. Picking a week sets `filters.day` to that Monday, and the log reads the seven days from it (`votesInBucket`). The log holds only the range's votes, so a part week at either end stays inside the range. The log's summary reads "Week of Sep 28 · 3 votes".
  - **Part weeks say so.** On "All" the newest week almost always runs from Monday to the latest vote, and the first week from the oldest vote, so a whole-week bar there would look like a drop, and `capLabels: 'extremes'` prints a total on the newest one. Their tooltips, accessible names and table rows read "Week of Sep 28 (to Sep 30)" and "Week of Jun 8 (from Jun 10)", and the subtitle names the part weeks. The log's summary keeps the plain "Week of Sep 28".
  - **Labels.** Totals print on the newest bar and the busiest only (`capLabels: 'extremes'`). Each bar's band counts and voters are in its tooltip and accessible name, and every number is in the table view. X labels carry the month ("Sep 30", R-9). `labelEvery` keeps at most seven of them on a calendar rhythm (every bar, every 2nd, every 4th, then whole weeks): 30 days label every 7th day, 90 days every 14th.
  - **The tooltip.** Its title, then the bar's votes, a row per band with its line key, then its voters. Values lead and labels follow. The band rows read as words ("5 scored 7+", "1 with no score"), because the tooltip is also the bar's accessible name and "5 7+" means nothing when heard. Every band shows, a zero included, so the rows never move. Text wears text colours; only the keys wear the band colour.
  - **Colours.** 7+ is `under`, 5–6 `barNeutral`, ≤4 `over`, and No score is hatched in `muted`. R1-2's theme test holds each at 3:1 or more against the card (WCAG 1.4.11). They are the app's band colours, and R-15 keeps them.
  - **Hit targets.** The kit makes each bar's whole column its hit area, and that column misses the `dataviz` 24px target (WCAG 2.5.8) on most layouts:
    - 90 bars at 24px need about 2,160px of plot. With the 240px sidebar, the 32px gutters, the Panel's padding and a y axis, the plot is about 900px at a 1280px viewport (about 10px a column) and about 1,070px at 1440px (about 12px). So 90 days misses the target on every layout.
    - At the default 30 days the columns fall under 24px below a viewport of about 1,100px, and on every phone (about 7px).
    - ←/→ (the kit's roving focus) reaches every bar, but keyboard access doesn't satisfy 2.5.8, and the table view can't pick a day, so neither is an equivalent control.
    - So the vote log's header carries a **"Pick a day"** select ("Pick a week" for weekly bars): `adm-select`, 38px tall, "All days" (or "All weeks") and then one option per bar. It sets the same `filters.day` as a bar pick and shows the current pick, so the two stay in step. This is the equivalent control that 2.5.8's "Equivalent" exception allows, and it sits next to the log it scopes. R1-12 Step 18's `minHit` stop has to accept it (Contract additions, above).
  - **Row keys** in the vote log come from the vote (`ts`, voter, pair), never from the row's position. Picking `#N` then keeps the row, and keyboard focus on it.
  - **The page reads `vote-log.json` alone**, so its loading and error copy names that file (`vote-log-states`).

---

### Task R1-9: Vote activity page

**Files:**
- Create: `src/tools/analytics/activity/activityModel.ts`
- Create: `src/tools/analytics/activity/activityChart.ts`
- Create: `src/tools/analytics/activity/VotesPerDayChart.tsx`
- Create: `src/tools/analytics/activity/VoteLogTable.tsx`
- Create: `src/tools/analytics/activity/ActivityFilterBar.tsx`
- Create: `src/tools/analytics/activity/ActivityKpiRow.tsx`
- Create: `src/tools/analytics/activity/ActivitySidePanels.tsx`
- Create: `src/tools/analytics/activity/ActivityView.tsx`
- Create: `src/tools/analytics/activity/ActivityPage.tsx`
- Create: `src/tools/analytics/activity/ActivityView.stories.tsx`
- Test: `src/tools/analytics/activity/__tests__/activityModel.test.ts`
- Test: `src/tools/analytics/activity/__tests__/activityChart.test.ts`
- Test: `src/tools/analytics/activity/__tests__/VotesPerDayChart.test.tsx`
- Test: `src/tools/analytics/activity/__tests__/VoteLogTable.test.tsx`
- Test: `src/tools/analytics/activity/__tests__/ActivityView.test.tsx`
- Test: `src/tools/analytics/activity/__tests__/ActivityPage.test.tsx`
- Modify: `src/theme/__tests__/adminTheme.test.ts` (R1-2). One comment line, in Step 8: `BAND_FILL` moves to `activityChart.ts`.
- Modify: `src/router.tsx`. Add the import after `import {AnalyticsPage} from './tools/analytics/AnalyticsPage';` and the route before `{path: 'analytics', element: <AnalyticsPage />},`.
- Modify: `src/router.test.tsx`. Add the test as the last one in `describe('admin routes', …)`, after `it('keeps the sidebar collapsed across reloads', …)`.
- Modify: `src/shell/nav.ts`. In `NAV_ITEMS`, add the entry after R1-6's `analytics` entry.
- Modify: `src/shell/Sidebar.test.tsx`. Add `/activity` to the Insights hrefs line.
- Untouched:
  - `src/tools/analytics/ActivityView.tsx`, `DayGroup.tsx` and their stories and tests. R1-11 deletes them.
  - `activityStats.ts` stays, because this task reuses `groupVotesByDay` and `latestVoteDay`.
  - The chart kit. This task draws no bars, axis or legend of its own: no SVG, no `act-*` styles, no inline ring.

**Interfaces:**
- Consumes:
  - From the contract: `ADMIN_COLORS`, `ADMIN_TYPE`, AdminStyles' `adm-*` classes, `fmtInt`, `fmtScore`, `fmtDay`, `fmtWeekday`, `Panel`, `KpiCard`, `SegmentedControl`, `MeterBar`, `ScorePill`, `Notice`, `PageLayout`, `NAV_ITEMS`/`NavItem`, and `fetchAdminData` (cached, through `useVoteLog`).
  - From the chart kit (R1-3b): `addDays`, `eachDay`, `weekStart`, `RangePreset`, `RangeControl`, `rangeStartDay`, `bucketFor`, `SeriesDef`, `TooltipContent`, `ChartLegend`, `ChartFrame`, `ChartTable`, `BarChart`, `BarDatum`.
  - From the bridge: `SPACING`, `LETTER_SPACING`, `TRUNCATE`, `FONTS`, `CtaButton`, `LinkButton`.
  - Existing: `useVoteLog`, `groupVotesByDay`, `latestVoteDay`, `VoteLog`/`VoteLogRow`.
- Produces:
  - Everything listed for `activityModel.ts` in the contract (`votesInRange` and `weeklyStacks` included), plus the additions above.
  - `activityChart.ts`'s exports, above.
  - `ActivityPage` at `/activity`.
  - `NAV_ITEMS` entry `{id: 'activity', label: 'Vote activity', mark: 'Ac', path: '/activity', group: 'insights', writes: false}`.

The engine must be built before any `pnpm vitest run …` below. Earlier R1 tasks build it; if they haven't, run `pnpm build:engine` once.

- [ ] **Step 1: Write the failing model tests**

Create `src/tools/analytics/activity/__tests__/activityModel.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {
  NO_FILTERS,
  activityKpis,
  activityWindow,
  carriesLabel,
  chartStacks,
  countOf,
  dailyStacks,
  filterVotes,
  hasActiveFilters,
  logPage,
  scoreBandOf,
  topPairs,
  topVoters,
  votesInBucket,
  votesInRange,
  weeklyStacks,
  type ScoreBand,
} from '../activityModel';
import type {VoteLogRow} from '../../voteLogTypes';

function row(overrides: Partial<VoteLogRow> & Pick<VoteLogRow, 'ts' | 'voter'>): VoteLogRow {
  return {
    a: '1',
    b: '2',
    aName: 'Elsa',
    bName: 'Anna',
    score: 5,
    accuracy: null,
    isReal: null,
    wouldPlay: null,
    difficulty: null,
    whoCarries: null,
    ...overrides,
  };
}

const MAUI = {a: '3', b: '4', aName: 'Maui', bName: 'Moana'};
const SCAR = {a: '5', b: '6', aName: 'Scar', bName: 'Simba'};

describe('scoreBandOf', () => {
  it.each<[number | null, ScoreBand]>([
    [10, 'high'],
    [7, 'high'],
    [6, 'mid'],
    [5, 'mid'],
    [4, 'low'],
    [1, 'low'],
    [null, 'unscored'],
  ])('puts a score of %s in the %s band', (score, band) => {
    expect(scoreBandOf(score)).toBe(band);
  });
});

describe('NO_FILTERS', () => {
  it('opens on the last 30 days with nothing else set (R-9)', () => {
    expect(NO_FILTERS).toEqual({q: '', voter: null, band: 'all', day: null, range: '30d'});
  });
});

describe('filterVotes', () => {
  const votes = [
    row({ts: '2026-09-30T10:00:00Z', voter: 1, aName: 'Elsa - Spirit of Winter', score: 8}),
    row({...MAUI, ts: '2026-09-30T11:00:00Z', voter: 11, score: 3}),
    row({...SCAR, ts: '2026-09-29T12:00:00Z', voter: 1, score: null}),
    row({ts: '2026-09-28T13:00:00Z', voter: 2, score: 6}),
  ];

  it('passes every vote, in order, with no filter set', () => {
    expect(filterVotes(votes, NO_FILTERS)).toEqual(votes);
  });

  it('matches the search against either card name, ignoring case and outer spaces', () => {
    expect(filterVotes(votes, {...NO_FILTERS, q: '  SPIRIT '})).toEqual([votes[0]]);
    expect(filterVotes(votes, {...NO_FILTERS, q: 'moana'})).toEqual([votes[1]]);
    expect(filterVotes(votes, {...NO_FILTERS, q: 'anna'})).toEqual([votes[0], votes[3]]);
  });

  it('matches the voter token exactly', () => {
    expect(filterVotes(votes, {...NO_FILTERS, voter: 1})).toEqual([votes[0], votes[2]]);
  });

  it('keeps unscored votes out of the score bands, in a band of their own', () => {
    expect(filterVotes(votes, {...NO_FILTERS, band: 'high'})).toEqual([votes[0]]);
    expect(filterVotes(votes, {...NO_FILTERS, band: 'mid'})).toEqual([votes[3]]);
    expect(filterVotes(votes, {...NO_FILTERS, band: 'low'})).toEqual([votes[1]]);
    expect(filterVotes(votes, {...NO_FILTERS, band: 'unscored'})).toEqual([votes[2]]);
  });

  it('matches the day against the start of the timestamp', () => {
    expect(filterVotes(votes, {...NO_FILTERS, day: '2026-09-30'})).toEqual([votes[0], votes[1]]);
  });

  it('applies every filter at once', () => {
    expect(filterVotes(votes, {...NO_FILTERS, q: 'simba', voter: 1, band: 'unscored', day: '2026-09-29'})).toEqual([
      votes[2],
    ]);
    expect(filterVotes(votes, {...NO_FILTERS, q: 'simba', voter: 2})).toEqual([]);
  });

  it('leaves the range to votesInRange, which knows the whole log', () => {
    expect(filterVotes(votes, {...NO_FILTERS, range: '7d'})).toEqual(votes);
  });

  it('returns [] for an empty log', () => {
    expect(filterVotes([], {...NO_FILTERS, q: 'elsa'})).toEqual([]);
  });
});

describe('hasActiveFilters', () => {
  it('ignores a blank search and counts any other filter', () => {
    expect(hasActiveFilters(NO_FILTERS)).toBe(false);
    expect(hasActiveFilters({...NO_FILTERS, q: '   '})).toBe(false);
    expect(hasActiveFilters({...NO_FILTERS, q: 'elsa'})).toBe(true);
    expect(hasActiveFilters({...NO_FILTERS, voter: 3})).toBe(true);
    expect(hasActiveFilters({...NO_FILTERS, band: 'unscored'})).toBe(true);
    expect(hasActiveFilters({...NO_FILTERS, day: '2026-09-30'})).toBe(true);
  });

  it('leaves out the range, which Clear filters keeps', () => {
    expect(hasActiveFilters({...NO_FILTERS, range: 'all'})).toBe(false);
    expect(hasActiveFilters({...NO_FILTERS, range: '7d'})).toBe(false);
  });
});

describe('votesInRange', () => {
  it("keeps the votes from the first day to the last, both included, in input order, real timestamps too", () => {
    const votes = [
      row({ts: '2026-09-30T23:59:59.999999+00:00', voter: 1}),
      row({ts: '2026-09-24T00:00:00+00:00', voter: 2}),
      row({ts: '2026-09-23T23:59:59Z', voter: 3}),
      row({ts: '2026-10-01T00:00:00Z', voter: 4}),
      row({ts: '2026-09-27T12:00:00Z', voter: 5}),
    ];
    expect(votesInRange(votes, '2026-09-24', '2026-09-30').map((v) => v.voter)).toEqual([1, 2, 5]);
  });

  it('keeps a one-day window to that day', () => {
    const votes = [row({ts: '2026-09-29T08:00:00Z', voter: 1}), row({ts: '2026-09-30T08:00:00Z', voter: 2})];
    expect(votesInRange(votes, '2026-09-30', '2026-09-30').map((v) => v.voter)).toEqual([2]);
  });

  it('returns [] for an empty log or a window that ends before it starts', () => {
    expect(votesInRange([], '2026-09-01', '2026-09-30')).toEqual([]);
    expect(votesInRange([row({ts: '2026-09-15T08:00:00Z', voter: 1})], '2026-09-30', '2026-09-01')).toEqual([]);
  });
});

describe('activityWindow', () => {
  // Out of order on purpose: the newest and the oldest vote are found, not assumed.
  const votes = [
    row({ts: '2026-09-01T08:00:00Z', voter: 1}),
    row({ts: '2026-09-30T14:20:00.123456+00:00', voter: 2}),
    row({ts: '2026-06-10T08:00:00Z', voter: 3}),
  ];

  it("ends on the newest vote's day and counts back per the range", () => {
    expect(activityWindow(votes, '7d')).toEqual({startDay: '2026-09-24', endDay: '2026-09-30'});
    expect(activityWindow(votes, '30d')).toEqual({startDay: '2026-09-01', endDay: '2026-09-30'});
    expect(activityWindow(votes, '90d')).toEqual({startDay: '2026-07-03', endDay: '2026-09-30'});
    expect(activityWindow(votes, 'all')).toEqual({startDay: '2026-06-10', endDay: '2026-09-30'});
  });

  it('never starts before the oldest vote', () => {
    const young = [row({ts: '2026-09-30T08:00:00Z', voter: 1}), row({ts: '2026-09-28T08:00:00Z', voter: 2})];
    expect(activityWindow(young, '30d')).toEqual({startDay: '2026-09-28', endDay: '2026-09-30'});
  });

  it('is null for an empty log', () => {
    expect(activityWindow([], '30d')).toBeNull();
  });
});

describe('dailyStacks', () => {
  it('ends at the newest vote and keeps the days without votes', () => {
    const stacks = dailyStacks(
      [row({ts: '2026-09-28T10:00:00Z', voter: 1}), row({ts: '2026-09-30T23:59:00Z', voter: 2})],
      4,
    );
    expect(stacks.map((s) => s.day)).toEqual(['2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30']);
    expect(stacks.map((s) => s.total)).toEqual([0, 1, 0, 1]);
  });

  it('finds the newest vote whatever order the log is in', () => {
    const stacks = dailyStacks(
      [
        row({ts: '2026-09-29T08:00:00Z', voter: 1}),
        row({ts: '2026-09-30T08:00:00Z', voter: 1}),
        row({ts: '2026-09-28T08:00:00Z', voter: 1}),
      ],
      1,
    );
    expect(stacks.map((s) => s.day)).toEqual(['2026-09-30']);
  });

  it('crosses month, year and leap-day boundaries', () => {
    const days = (ts: string, n: number) => dailyStacks([row({ts, voter: 1})], n).map((s) => s.day);
    expect(days('2026-10-02T09:00:00Z', 4)).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
    expect(days('2027-01-01T09:00:00Z', 2)).toEqual(['2026-12-31', '2027-01-01']);
    expect(days('2028-03-01T09:00:00Z', 2)).toEqual(['2028-02-29', '2028-03-01']);
  });

  it('splits a day by band, unscored votes included, and counts distinct voters', () => {
    const [stack] = dailyStacks(
      [
        row({ts: '2026-09-30T08:00:00Z', voter: 1, score: 9}),
        row({ts: '2026-09-30T09:00:00Z', voter: 1, score: 7}),
        row({ts: '2026-09-30T10:00:00Z', voter: 2, score: 5}),
        row({ts: '2026-09-30T11:00:00Z', voter: 3, score: 2}),
        row({ts: '2026-09-30T12:00:00Z', voter: 3, score: null}),
      ],
      1,
    );
    expect(stack).toEqual({day: '2026-09-30', high: 2, mid: 1, low: 1, unscored: 1, total: 5, voters: 3});
  });

  it("buckets the log's real timestamps (Supabase's created_at: microseconds, +00:00) by UTC day", () => {
    const stacks = dailyStacks(
      [
        row({ts: '2026-09-29T23:59:59.999999+00:00', voter: 1}),
        row({ts: '2026-09-30T14:20:00.123456+00:00', voter: 2}),
        row({ts: '2026-09-30T00:00:00+00:00', voter: 3}),
      ],
      2,
    );
    // The window ends on Sep 30 only if Date.parse reads this form: the oldest vote comes first.
    expect(stacks.map((s) => [s.day, s.total])).toEqual([
      ['2026-09-29', 1],
      ['2026-09-30', 2],
    ]);
  });

  it('leaves out votes older than the window', () => {
    const stacks = dailyStacks(
      [row({ts: '2026-09-30T08:00:00Z', voter: 1}), row({ts: '2026-08-31T08:00:00Z', voter: 2})],
      30,
    );
    expect(stacks).toHaveLength(30);
    expect(stacks[0].day).toBe('2026-09-01');
    expect(stacks.reduce((sum, s) => sum + s.total, 0)).toBe(1);
  });

  it("can end on a given day, so filtered votes keep the whole log's window", () => {
    const stacks = dailyStacks([row({ts: '2026-09-20T08:00:00Z', voter: 1})], 3, '2026-09-30');
    expect(stacks.map((s) => s.day)).toEqual(['2026-09-28', '2026-09-29', '2026-09-30']);
    expect(stacks.every((s) => s.total === 0 && s.voters === 0)).toBe(true);
  });

  it('returns [] for an empty log or an empty window', () => {
    expect(dailyStacks([], 30)).toEqual([]);
    expect(dailyStacks([row({ts: '2026-09-30T08:00:00Z', voter: 1})], 0)).toEqual([]);
  });
});

describe('weeklyStacks', () => {
  it("puts each week on its UTC Monday, quiet weeks included", () => {
    const stacks = weeklyStacks(
      // Wed Sep 2 falls in the week of Mon Aug 31, Wed Sep 16 in the week of Mon Sep 14.
      [row({ts: '2026-09-16T08:00:00Z', voter: 1}), row({ts: '2026-09-02T08:00:00Z', voter: 2})],
      '2026-09-01',
      '2026-09-30',
    );
    expect(stacks.map((s) => [s.day, s.total])).toEqual([
      ['2026-08-31', 1],
      ['2026-09-07', 0],
      ['2026-09-14', 1],
      ['2026-09-21', 0],
      ['2026-09-28', 0],
    ]);
  });

  it('counts only the votes inside the window, so the first and last weeks can be part weeks', () => {
    const stacks = weeklyStacks(
      [
        row({ts: '2026-09-01T08:00:00Z', voter: 1}), // the first week's Tuesday, a day before the window
        row({ts: '2026-09-02T08:00:00Z', voter: 2}),
        row({ts: '2026-09-29T08:00:00Z', voter: 3}),
        row({ts: '2026-09-30T08:00:00Z', voter: 4}), // the last week's Wednesday, a day after the window
      ],
      '2026-09-02',
      '2026-09-29',
    );
    expect(stacks.map((s) => s.day)).toEqual(['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28']);
    expect(stacks.map((s) => s.total)).toEqual([1, 0, 0, 0, 1]);
  });

  it('splits a week by band and counts its distinct voters across its days', () => {
    const stacks = weeklyStacks(
      [
        row({ts: '2026-09-28T08:00:00Z', voter: 1, score: 9}),
        row({ts: '2026-09-29T08:00:00+00:00', voter: 1, score: null}),
        row({ts: '2026-09-30T14:20:00.123456+00:00', voter: 2, score: 5}),
        row({ts: '2026-10-04T23:59:59Z', voter: 3, score: 2}),
      ],
      '2026-09-28',
      '2026-10-04',
    );
    expect(stacks).toEqual([{day: '2026-09-28', high: 1, mid: 1, low: 1, unscored: 1, total: 4, voters: 3}]);
  });

  it('crosses a year boundary', () => {
    const stacks = weeklyStacks([row({ts: '2027-01-02T08:00:00Z', voter: 1})], '2026-12-30', '2027-01-05');
    expect(stacks.map((s) => [s.day, s.total])).toEqual([
      ['2026-12-28', 1],
      ['2027-01-04', 0],
    ]);
  });

  it('keeps every week of an empty log, and nothing when the window ends before it starts', () => {
    expect(weeklyStacks([], '2026-09-28', '2026-10-04')).toEqual([
      {day: '2026-09-28', high: 0, mid: 0, low: 0, unscored: 0, total: 0, voters: 0},
    ]);
    expect(weeklyStacks([row({ts: '2026-09-30T08:00:00Z', voter: 1})], '2026-10-04', '2026-09-28')).toEqual([]);
  });
});

describe('chartStacks', () => {
  const votes = [row({ts: '2026-09-30T08:00:00Z', voter: 1}), row({ts: '2026-06-10T08:00:00Z', voter: 2})];

  it('charts a window of up to 90 days per day, every day present', () => {
    const {bucket, stacks} = chartStacks(votes, '2026-07-03', '2026-09-30');
    expect(bucket).toBe('day');
    expect(stacks).toHaveLength(90);
    expect([stacks[0].day, stacks.at(-1)?.day]).toEqual(['2026-07-03', '2026-09-30']);
    expect(stacks.reduce((sum, s) => sum + s.total, 0)).toBe(1);
  });

  it('charts a longer window per week, from the Monday of its first day', () => {
    const {bucket, stacks} = chartStacks(votes, '2026-06-10', '2026-09-30');
    expect(bucket).toBe('week');
    expect(stacks).toHaveLength(17);
    expect([stacks[0].day, stacks.at(-1)?.day]).toEqual(['2026-06-08', '2026-09-28']);
    expect([stacks[0].total, stacks.at(-1)?.total]).toEqual([1, 1]);
  });
});

describe('votesInBucket', () => {
  const votes = [
    row({ts: '2026-09-27T23:59:59Z', voter: 1}), // Sunday, the week before
    row({ts: '2026-09-28T00:00:00+00:00', voter: 2}), // Monday
    row({ts: '2026-09-30T14:20:00.123456+00:00', voter: 3}),
    row({ts: '2026-10-04T23:59:59Z', voter: 4}), // Sunday, the week's last day
    row({ts: '2026-10-05T00:00:00Z', voter: 5}), // Monday, the week after
  ];

  it("keeps a day bar's votes to its UTC day", () => {
    expect(votesInBucket(votes, '2026-09-30', 'day').map((v) => v.voter)).toEqual([3]);
  });

  it("keeps a week bar's votes to the seven days from its Monday", () => {
    expect(votesInBucket(votes, '2026-09-28', 'week').map((v) => v.voter)).toEqual([2, 3, 4]);
  });
});

describe('activityKpis', () => {
  it('counts votes and voters, and averages the scored votes only', () => {
    const kpis = activityKpis([
      row({ts: '2026-09-30T08:00:00Z', voter: 1, score: 8}),
      row({ts: '2026-09-30T09:00:00Z', voter: 2, score: 5}),
      row({ts: '2026-09-29T09:00:00Z', voter: 1, score: null}),
    ]);
    expect(kpis).toEqual({votes: 3, activeVoters: 2, avgScore: 6.5, busiestDay: {day: '2026-09-30', count: 2}});
  });

  it('has no average when no vote has a score', () => {
    expect(activityKpis([row({ts: '2026-09-30T08:00:00Z', voter: 1, score: null})]).avgScore).toBeNull();
  });

  it('breaks a busiest-day tie toward the later day, whatever the order', () => {
    const votes = [
      row({ts: '2026-09-28T08:00:00Z', voter: 1}),
      row({ts: '2026-09-30T08:00:00Z', voter: 1}),
      row({ts: '2026-09-28T09:00:00Z', voter: 2}),
      row({ts: '2026-09-30T09:00:00Z', voter: 2}),
    ];
    expect(activityKpis(votes).busiestDay).toEqual({day: '2026-09-30', count: 2});
    expect(activityKpis([...votes].reverse()).busiestDay).toEqual({day: '2026-09-30', count: 2});
  });

  it('is empty for an empty log', () => {
    expect(activityKpis([])).toEqual({votes: 0, activeVoters: 0, avgScore: null, busiestDay: null});
  });
});

describe('topVoters', () => {
  const votes = [
    row({ts: '2026-09-30T08:00:00Z', voter: 7}),
    row({ts: '2026-09-30T09:00:00Z', voter: 3}),
    row({ts: '2026-09-30T10:00:00Z', voter: 7}),
    row({ts: '2026-09-30T11:00:00Z', voter: 5}),
    row({ts: '2026-09-30T12:00:00Z', voter: 3}),
    row({ts: '2026-09-30T13:00:00Z', voter: 9}),
  ];

  it('ranks voters by votes, breaking a tie toward the lower token', () => {
    expect(topVoters(votes, 10)).toEqual([
      {voter: 3, count: 2},
      {voter: 7, count: 2},
      {voter: 5, count: 1},
      {voter: 9, count: 1},
    ]);
  });

  it('keeps the first n', () => {
    expect(topVoters(votes, 2).map((t) => t.voter)).toEqual([3, 7]);
  });

  it('returns [] for an empty log', () => {
    expect(topVoters([], 6)).toEqual([]);
  });
});

describe('topPairs', () => {
  it('counts each pair and averages its scored votes only', () => {
    const pairs = topPairs(
      [
        row({ts: '2026-09-30T08:00:00Z', voter: 1, score: 8}),
        row({ts: '2026-09-30T09:00:00Z', voter: 2, score: 5}),
        row({ts: '2026-09-30T10:00:00Z', voter: 3, score: null}),
        row({...MAUI, ts: '2026-09-29T10:00:00Z', voter: 3, score: null}),
      ],
      5,
    );
    expect(pairs).toEqual([
      {a: '1', b: '2', aName: 'Elsa', bName: 'Anna', count: 3, avgScore: 6.5},
      {a: '3', b: '4', aName: 'Maui', bName: 'Moana', count: 1, avgScore: null},
    ]);
  });

  it('counts a pair once whichever card comes first', () => {
    const pairs = topPairs(
      [
        row({ts: '2026-09-30T08:00:00Z', voter: 1}),
        row({ts: '2026-09-29T08:00:00Z', voter: 2, a: '2', b: '1', aName: 'Anna', bName: 'Elsa'}),
      ],
      5,
    );
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({a: '1', b: '2', aName: 'Elsa', count: 2});
  });

  it('breaks a tie toward the pair voted most recently, then by card ids', () => {
    const byRecency = topPairs(
      [
        row({...SCAR, ts: '2026-09-29T08:00:00Z', voter: 1}),
        row({ts: '2026-09-28T08:00:00Z', voter: 1}),
        row({...MAUI, ts: '2026-09-30T08:00:00Z', voter: 1}),
      ],
      5,
    );
    expect(byRecency.map((p) => p.aName)).toEqual(['Maui', 'Scar', 'Elsa']);

    const sameMoment = topPairs(
      [row({...SCAR, ts: '2026-09-30T08:00:00Z', voter: 1}), row({...MAUI, ts: '2026-09-30T08:00:00Z', voter: 2})],
      5,
    );
    expect(sameMoment.map((p) => p.aName)).toEqual(['Maui', 'Scar']);
  });

  it('ranks by votes and keeps the first n', () => {
    const pairs = topPairs(
      [
        row({...MAUI, ts: '2026-09-30T08:00:00Z', voter: 1}),
        row({ts: '2026-09-29T08:00:00Z', voter: 1}),
        row({ts: '2026-09-28T08:00:00Z', voter: 2}),
      ],
      1,
    );
    expect(pairs.map((p) => p.aName)).toEqual(['Elsa']);
  });

  it('returns [] for an empty log', () => {
    expect(topPairs([], 5)).toEqual([]);
  });
});

describe('carriesLabel', () => {
  const vote = row({ts: '2026-09-30T08:00:00Z', voter: 1});

  it.each<[string | null, string]>([
    ['a', 'Elsa'],
    ['b', 'Anna'],
    ['both', 'Both'],
    ['neither', 'Neither'],
    [null, '—'],
  ])('reads %s as %s', (whoCarries, label) => {
    expect(carriesLabel({...vote, whoCarries})).toBe(label);
  });
});

describe('logPage', () => {
  const votes = [
    row({ts: '2026-09-29T08:00:00Z', voter: 1, aName: 'Oldest'}),
    row({ts: '2026-09-30T12:00:00Z', voter: 2, aName: 'Newest'}),
    row({ts: '2026-09-30T09:00:00Z', voter: 2, aName: 'Middle'}),
  ];

  it('groups the page by day, newest first', () => {
    const {days, hidden} = logPage(votes, 25);
    expect(days.map((d) => d.day)).toEqual(['2026-09-30', '2026-09-29']);
    expect(days[0].rows.map((v) => v.aName)).toEqual(['Newest', 'Middle']);
    expect(hidden).toBe(0);
  });

  it("keeps a day's full counts when the page cuts it short", () => {
    const {days, hidden} = logPage(votes, 1);
    expect(days).toEqual([{day: '2026-09-30', count: 2, voters: 1, rows: [votes[1]]}]);
    expect(hidden).toBe(2);
  });

  it("orders the log's real timestamps (Supabase's created_at: microseconds, +00:00) newest first", () => {
    // Out of order on purpose: Middle comes before Newest unless Date.parse reads this form.
    const {days} = logPage(
      [
        row({ts: '2026-09-30T09:05:00+00:00', voter: 1, aName: 'Middle'}),
        row({ts: '2026-09-29T23:59:59.999999+00:00', voter: 2, aName: 'Oldest'}),
        row({ts: '2026-09-30T14:20:00.123456+00:00', voter: 3, aName: 'Newest'}),
      ],
      25,
    );
    expect(days.map((d) => d.day)).toEqual(['2026-09-30', '2026-09-29']);
    expect(days[0].rows.map((v) => v.aName)).toEqual(['Newest', 'Middle']);
  });

  it('is empty for an empty log', () => {
    expect(logPage([], 25)).toEqual({days: [], hidden: 0});
  });
});

describe('countOf', () => {
  it('pluralises and groups thousands', () => {
    expect(countOf(1, 'vote')).toBe('1 vote');
    expect(countOf(0, 'voter')).toBe('0 voters');
    expect(countOf(2054, 'vote')).toBe('2,054 votes');
  });
});
```

- [ ] **Step 2: Run the model tests and see them fail**

Run: `pnpm vitest run src/tools/analytics/activity/__tests__/activityModel.test.ts`
Expected: FAIL with `Failed to resolve import "../activityModel" from "src/tools/analytics/activity/__tests__/activityModel.test.ts". Does the file exist?`

- [ ] **Step 3: Write the model**

Create `src/tools/analytics/activity/activityModel.ts`:

```ts
import {bucketFor, rangeStartDay, type RangePreset} from '../../../charts/range';
import {addDays, eachDay, weekStart} from '../../../charts/scale';
import {fmtInt} from '../../../ui/format';
import {groupVotesByDay, latestVoteDay} from '../activityStats';
import type {VoteLogRow} from '../voteLogTypes';

/**
 * A vote's score band. Quick votes carry no score (`score: null`), so they
 * form their own band and never count toward an average or another band
 * (docs/plans/R-redesign.md, corrections to the spec).
 */
export type ScoreBand = 'high' | 'mid' | 'low' | 'unscored';
export type BandFilter = 'all' | ScoreBand;

/** What one bar of the chart covers: a UTC day, or a week from its UTC Monday (bucketFor, R-9). */
export type ChartBucket = 'day' | 'week';

/** The page's filters. The filter row sets all of them but `day`, which is picked in the chart. */
export interface ActivityFilters {
  q: string;
  voter: number | null;
  band: BandFilter;
  /** The picked bar's key: a UTC `YYYY-MM-DD` day, or the week's Monday when the chart buckets by week. */
  day: string | null;
  /** The window the page reads, ending on the log's newest vote (R-9). */
  range: RangePreset;
}

/** One bar in the chart, a day or a week: votes per band, their total, and distinct voters. */
export interface DayStack {
  /** The UTC day, or the week's UTC Monday. */
  day: string;
  high: number;
  mid: number;
  low: number;
  unscored: number;
  total: number;
  voters: number;
}

/** One day on the vote log's current page: the day's full counts, plus the rows the page shows. */
export interface LogDay {
  day: string;
  count: number;
  voters: number;
  rows: VoteLogRow[];
}

export const NO_FILTERS: ActivityFilters = {q: '', voter: null, band: 'all', day: null, range: '30d'};

/** The bands in filter and legend order, and their labels. */
export const SCORE_BANDS: readonly ScoreBand[] = ['high', 'mid', 'low', 'unscored'];
export const BAND_LABELS: Record<ScoreBand, string> = {high: '7+', mid: '5–6', low: '≤4', unscored: 'No score'};

/** A vote's UTC day. The log's timestamps are UTC ISO strings; groupVotesByDay reads them the same way. */
function dayOf(vote: VoteLogRow): string {
  return vote.ts.slice(0, 10);
}

/** "1 vote", "2,054 votes". */
export function countOf(n: number, noun: string): string {
  return `${fmtInt(n)} ${noun}${n === 1 ? '' : 's'}`;
}

/** 7 and up is high, 5–6 mid, 4 and below low; no score is its own band. */
export function scoreBandOf(score: number | null): ScoreBand {
  if (score == null) return 'unscored';
  if (score >= 7) return 'high';
  if (score >= 5) return 'mid';
  return 'low';
}

/**
 * Whether a filter that "Clear filters" resets is set. A blank search doesn't
 * count, and neither does the range: it is the window the page reads, so
 * clearing the filters keeps it.
 */
export function hasActiveFilters(f: ActivityFilters): boolean {
  return f.q.trim() !== '' || f.voter !== null || f.band !== 'all' || f.day !== null;
}

/**
 * The votes that pass the search, voter, band and day filters, in input order.
 * The search matches either card's name, ignoring case; the voter is an exact
 * token; the day is a prefix of the vote's timestamp. `range` is ignored here:
 * it counts back from the whole log's newest vote, which a filtered list can't
 * know, so the view narrows to the range first (activityWindow, votesInRange).
 *
 * `day` matches one UTC day. In week buckets pass `day: null` and narrow with
 * `votesInBucket`, as ActivityView does: a week's Monday passed here would keep
 * only that Monday's votes.
 */
export function filterVotes(votes: VoteLogRow[], f: ActivityFilters): VoteLogRow[] {
  const q = f.q.trim().toLowerCase();
  return votes.filter(
    (v) =>
      (f.voter === null || v.voter === f.voter) &&
      (f.band === 'all' || scoreBandOf(v.score) === f.band) &&
      (f.day === null || v.ts.startsWith(f.day)) &&
      (q === '' || v.aName.toLowerCase().includes(q) || v.bName.toLowerCase().includes(q)),
  );
}

/** The votes whose UTC day falls from `startDay` to `endDay`, both included, in input order. */
export function votesInRange(votes: VoteLogRow[], startDay: string, endDay: string): VoteLogRow[] {
  return votes.filter((v) => {
    const day = dayOf(v);
    return day >= startDay && day <= endDay;
  });
}

/**
 * The days the page reads for a range. The window ends on the whole log's
 * newest vote and counts back per the range, never past the log's oldest vote
 * (rangeStartDay). Null for an empty log.
 */
export function activityWindow(votes: VoteLogRow[], range: RangePreset): {startDay: string; endDay: string} | null {
  const endDay = latestVoteDay(votes);
  if (endDay === undefined) return null;
  const firstDay = votes.reduce((first, vote) => (dayOf(vote) < first ? dayOf(vote) : first), endDay);
  return {startDay: rangeStartDay(range, endDay, firstDay), endDay};
}

interface StackSlot {
  stack: DayStack;
  voters: Set<number>;
}

/** An empty stack per key, in key order. */
function emptySlots(keys: readonly string[]): Map<string, StackSlot> {
  return new Map(
    keys.map((day) => [day, {stack: {day, high: 0, mid: 0, low: 0, unscored: 0, total: 0, voters: 0}, voters: new Set()}]),
  );
}

/** Counts each vote into its slot by band and voter. A vote whose key has no slot is left out. */
function fillSlots(slots: Map<string, StackSlot>, votes: VoteLogRow[], keyOf: (vote: VoteLogRow) => string): DayStack[] {
  for (const vote of votes) {
    const slot = slots.get(keyOf(vote));
    if (!slot) continue;
    slot.stack[scoreBandOf(vote.score)] += 1;
    slot.stack.total += 1;
    slot.voters.add(vote.voter);
  }
  return [...slots.values()].map(({stack, voters}) => ({...stack, voters: voters.size}));
}

/**
 * Votes per day for the last `days` UTC days, oldest first, ending at `endDay`
 * (by default the newest vote's day). Every calendar day is present, a day
 * without votes as zeros, so the time axis stays even.
 */
export function dailyStacks(votes: VoteLogRow[], days: number, endDay = latestVoteDay(votes)): DayStack[] {
  if (endDay === undefined || days < 1) return [];
  const keys = Array.from({length: days}, (_, i) => addDays(endDay, i - (days - 1)));
  return fillSlots(emptySlots(keys), votes, dayOf);
}

/**
 * Votes per week from `startDay` to `endDay`, oldest first. Each stack's `day`
 * is its week's UTC Monday, and every week is present, a quiet one as zeros.
 * Votes outside the window are left out, so the first and last weeks can be
 * part weeks.
 */
export function weeklyStacks(votes: VoteLogRow[], startDay: string, endDay: string): DayStack[] {
  if (startDay > endDay) return [];
  const mondays = eachDay(weekStart(startDay), weekStart(endDay)).filter((_, i) => i % 7 === 0);
  return fillSlots(emptySlots(mondays), votesInRange(votes, startDay, endDay), (vote) => weekStart(dayOf(vote)));
}

/** The chart's bars for a window: one per day up to 90 days, one per week past that (bucketFor, R-9). */
export function chartStacks(
  votes: VoteLogRow[],
  startDay: string,
  endDay: string,
): {bucket: ChartBucket; stacks: DayStack[]} {
  const bucket = bucketFor(startDay, endDay);
  if (bucket === 'week') return {bucket, stacks: weeklyStacks(votes, startDay, endDay)};
  return {bucket, stacks: dailyStacks(votes, eachDay(startDay, endDay).length, endDay)};
}

/** The votes under one bar of the chart: its UTC day, or the seven days from its week's Monday. */
export function votesInBucket(votes: VoteLogRow[], key: string, bucket: ChartBucket): VoteLogRow[] {
  return votesInRange(votes, key, bucket === 'day' ? key : addDays(key, 6));
}

/**
 * The KPI row's numbers. The average covers scored votes only (null when no
 * vote has a score). A tie for the busiest day goes to the later day.
 */
export function activityKpis(votes: VoteLogRow[]): {
  votes: number;
  activeVoters: number;
  avgScore: number | null;
  busiestDay: {day: string; count: number} | null;
} {
  const voters = new Set<number>();
  const perDay = new Map<string, number>();
  let scoreSum = 0;
  let scored = 0;
  for (const vote of votes) {
    voters.add(vote.voter);
    perDay.set(dayOf(vote), (perDay.get(dayOf(vote)) ?? 0) + 1);
    if (vote.score != null) {
      scoreSum += vote.score;
      scored += 1;
    }
  }
  let busiestDay: {day: string; count: number} | null = null;
  for (const [day, count] of perDay) {
    if (!busiestDay || count > busiestDay.count || (count === busiestDay.count && day > busiestDay.day)) {
      busiestDay = {day, count};
    }
  }
  return {votes: votes.length, activeVoters: voters.size, avgScore: scored > 0 ? scoreSum / scored : null, busiestDay};
}

/** The `n` voters with the most votes. A tie goes to the lower token (the voter seen first). */
export function topVoters(votes: VoteLogRow[], n: number): Array<{voter: number; count: number}> {
  const counts = new Map<number, number>();
  for (const vote of votes) counts.set(vote.voter, (counts.get(vote.voter) ?? 0) + 1);
  return [...counts.entries()]
    .map(([voter, count]) => ({voter, count}))
    .sort((x, y) => y.count - x.count || x.voter - y.voter)
    .slice(0, n);
}

interface PairTally {
  key: string;
  a: string;
  b: string;
  aName: string;
  bName: string;
  count: number;
  scoreSum: number;
  scored: number;
  latest: number;
}

/**
 * The `n` pairs with the most votes, each with its average over scored votes
 * (null when none has a score). The log already orders every pair's ids
 * (buildVoteLog puts the lower id in `a`, and the votes table enforces
 * card_a_id < card_b_id), but the key sorts them anyway, like
 * scripts/lib/voteAnalytics.mjs's pairKey, so a pair is one pair whichever way
 * round it comes; names come from the pair's first row. A tie goes to the pair
 * voted most recently, then to the lower key.
 */
export function topPairs(
  votes: VoteLogRow[],
  n: number,
): Array<{a: string; b: string; aName: string; bName: string; count: number; avgScore: number | null}> {
  const tallies = new Map<string, PairTally>();
  for (const vote of votes) {
    const key = vote.a < vote.b ? `${vote.a}:${vote.b}` : `${vote.b}:${vote.a}`;
    let tally = tallies.get(key);
    if (!tally) {
      tally = {key, a: vote.a, b: vote.b, aName: vote.aName, bName: vote.bName, count: 0, scoreSum: 0, scored: 0, latest: -Infinity};
      tallies.set(key, tally);
    }
    tally.count += 1;
    if (vote.score != null) {
      tally.scoreSum += vote.score;
      tally.scored += 1;
    }
    tally.latest = Math.max(tally.latest, Date.parse(vote.ts));
  }
  return [...tallies.values()]
    .sort((x, y) => y.count - x.count || y.latest - x.latest || (x.key < y.key ? -1 : x.key > y.key ? 1 : 0))
    .slice(0, n)
    .map(({a, b, aName, bName, count, scoreSum, scored}) => ({
      a,
      b,
      aName,
      bName,
      count,
      avgScore: scored > 0 ? scoreSum / scored : null,
    }));
}

/**
 * The Carries cell. 'a' and 'b' name the card in that position of the row,
 * 'both' and 'neither' read as words, and no answer shows as '—'.
 */
export function carriesLabel(vote: VoteLogRow): string {
  if (vote.whoCarries == null) return '—';
  switch (vote.whoCarries) {
    case 'a':
      return vote.aName;
    case 'b':
      return vote.bName;
    case 'both':
      return 'Both';
    case 'neither':
      return 'Neither';
    default:
      return vote.whoCarries;
  }
}

/**
 * The vote log's current page: the first `limit` votes, newest first, grouped
 * by UTC day. A day the page cuts short keeps its full vote and voter counts;
 * `hidden` is how many votes the page leaves out.
 */
export function logPage(votes: VoteLogRow[], limit: number): {days: LogDay[]; hidden: number} {
  const newestFirst = [...votes].sort((x, y) => Date.parse(y.ts) - Date.parse(x.ts));
  const days: LogDay[] = [];
  let room = limit;
  for (const group of groupVotesByDay(newestFirst)) {
    if (room <= 0) break;
    const rows = group.votes.slice(0, room);
    room -= rows.length;
    days.push({day: group.day, count: group.count, voters: group.voters, rows});
  }
  return {days, hidden: Math.max(0, votes.length - Math.max(0, limit))};
}
```

- [ ] **Step 4: Run the model tests and see them pass**

Run: `pnpm vitest run src/tools/analytics/activity/__tests__/activityModel.test.ts`
Expected: PASS (63 tests).

- [ ] **Step 5: Lint and commit**

Run: `pnpm lint`. Expected: no errors.
Run with the Bash tool, only after the owner approves:
```bash
git add src/tools/analytics/activity/activityModel.ts src/tools/analytics/activity/__tests__/activityModel.test.ts
USER_APPROVED=1 git commit -m "feat(analytics): add the vote activity model (#24)"
```

- [ ] **Step 6: Write the failing chart and log-table tests**

Create `src/tools/analytics/activity/__tests__/activityChart.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {ADMIN_COLORS} from '../../../../theme/adminTheme';
import {
  BAND_SERIES,
  barData,
  bucketTitle,
  chartSubtitle,
  chartTable,
  chartTitle,
  labelEvery,
  tooltipFor,
} from '../activityChart';
import type {DayStack} from '../activityModel';

function stack(day: string, over: Partial<DayStack> = {}): DayStack {
  return {day, high: 0, mid: 0, low: 0, unscored: 0, total: 0, voters: 0, ...over};
}

const BUSY = stack('2026-09-30', {high: 5, mid: 4, low: 2, unscored: 1, total: 12, voters: 4});
const QUIET = stack('2026-09-29');

describe('BAND_SERIES', () => {
  it('is one series per band, in filter order, in the theme colours, with No score hatched', () => {
    expect(BAND_SERIES).toEqual([
      {id: 'high', label: '7+', color: ADMIN_COLORS.under},
      {id: 'mid', label: '5–6', color: ADMIN_COLORS.barNeutral},
      {id: 'low', label: '≤4', color: ADMIN_COLORS.over},
      {id: 'unscored', label: 'No score', color: ADMIN_COLORS.muted, pattern: 'hatch'},
    ]);
  });
});

describe('chartTitle and bucketTitle', () => {
  it("name the chart and each bar by day, or by week from the week's Monday", () => {
    expect(chartTitle('day')).toBe('Votes per day');
    expect(chartTitle('week')).toBe('Votes per week');
    expect(bucketTitle('2026-09-30', 'day')).toBe('Wed Sep 30');
    expect(bucketTitle('2026-09-28', 'week')).toBe('Week of Sep 28');
  });

  it('says when the range clips a week, and leaves a whole week and a day plain', () => {
    expect(bucketTitle('2026-06-08', 'week', '2026-06-10', '2026-09-30')).toBe('Week of Jun 8 (from Jun 10)');
    expect(bucketTitle('2026-09-28', 'week', '2026-06-10', '2026-09-30')).toBe('Week of Sep 28 (to Sep 30)');
    expect(bucketTitle('2026-09-28', 'week', '2026-09-29', '2026-09-30')).toBe('Week of Sep 28 (Sep 29 to Sep 30)');
    expect(bucketTitle('2026-09-21', 'week', '2026-06-10', '2026-09-30')).toBe('Week of Sep 21');
    // Sun Oct 4 ends the week of Mon Sep 28, so a range ending then leaves it whole.
    expect(bucketTitle('2026-09-28', 'week', '2026-06-10', '2026-10-04')).toBe('Week of Sep 28');
    expect(bucketTitle('2026-09-30', 'day', '2026-09-01', '2026-09-30')).toBe('Wed Sep 30');
  });
});

describe('chartSubtitle', () => {
  it("gives the range's days and how to pick a bar", () => {
    expect(chartSubtitle('day', '2026-09-01', '2026-09-30')).toBe(
      'Sep 1 – Sep 30. Pick a day to filter the log; pick it again to clear.',
    );
  });

  it('says which end weeks the range clips', () => {
    const pick = '. Pick a week to filter the log; pick it again to clear.';
    expect(chartSubtitle('week', '2026-06-10', '2026-09-30')).toBe(
      `Jun 10 – Sep 30, in weeks from Monday, first and last weeks partial${pick}`,
    );
    expect(chartSubtitle('week', '2026-06-08', '2026-09-30')).toBe(
      `Jun 8 – Sep 30, in weeks from Monday, last week partial${pick}`,
    );
    expect(chartSubtitle('week', '2026-06-10', '2026-10-04')).toBe(
      `Jun 10 – Oct 4, in weeks from Monday, first week partial${pick}`,
    );
    expect(chartSubtitle('week', '2026-06-08', '2026-10-04')).toBe(`Jun 8 – Oct 4, in weeks from Monday${pick}`);
  });
});

describe('barData', () => {
  it('keys each bar by its day, labels it with the month, and splits it by band', () => {
    expect(barData([QUIET, BUSY])).toEqual([
      {key: '2026-09-29', label: 'Sep 29', values: {high: 0, mid: 0, low: 0, unscored: 0}},
      {key: '2026-09-30', label: 'Sep 30', values: {high: 5, mid: 4, low: 2, unscored: 1}},
    ]);
  });
});

describe('tooltipFor', () => {
  it("leads with each value: the bar's votes, every band with its line key, then its voters", () => {
    const [, busy] = barData([QUIET, BUSY]);
    // The band rows read as words, because the kit also reads the tooltip out as the bar's name.
    expect(tooltipFor([QUIET, BUSY], 'day', '2026-09-29', '2026-09-30')(busy)).toEqual({
      title: 'Wed Sep 30',
      rows: [
        {label: 'votes', value: '12'},
        {label: 'scored 7+', value: '5', color: ADMIN_COLORS.under},
        {label: 'scored 5–6', value: '4', color: ADMIN_COLORS.barNeutral},
        {label: 'scored ≤4', value: '2', color: ADMIN_COLORS.over},
        {label: 'with no score', value: '1', color: ADMIN_COLORS.muted},
        {label: 'voters', value: '4'},
      ],
    });
  });

  it('names a week from its Monday, noting a clipped end, in the singular for one vote and one voter', () => {
    const week = stack('2026-09-28', {low: 1, total: 1, voters: 1});
    const content = tooltipFor([week], 'week', '2026-06-10', '2026-09-30')(barData([week])[0]);
    expect(content.title).toBe('Week of Sep 28 (to Sep 30)');
    expect(content.rows.at(0)).toEqual({label: 'vote', value: '1'});
    expect(content.rows.at(-1)).toEqual({label: 'voter', value: '1'});
  });
});

describe('chartTable', () => {
  it('lists every bar, oldest first, with all the numbers the chart and its tooltips carry', () => {
    expect(chartTable([QUIET, BUSY], 'day', '2026-09-29', '2026-09-30')).toEqual({
      caption: 'Votes per day, Sep 29 – Sep 30',
      columns: ['Day', 'Votes', '7+', '5–6', '≤4', 'No score', 'Voters'],
      rows: [
        ['Tue Sep 29', '0', '0', '0', '0', '0', '0'],
        ['Wed Sep 30', '12', '5', '4', '2', '1', '4'],
      ],
    });
  });

  it("names weeks by their Monday, the part weeks at each end as such, and the caption by the range's own days", () => {
    const table = chartTable([stack('2026-06-08'), stack('2026-09-28')], 'week', '2026-06-10', '2026-09-30');
    expect(table.caption).toBe('Votes per week, Jun 10 – Sep 30');
    expect(table.columns[0]).toBe('Week');
    expect(table.rows.map((r) => r[0])).toEqual(['Week of Jun 8 (from Jun 10)', 'Week of Sep 28 (to Sep 30)']);
  });
});

describe('labelEvery', () => {
  it.each([
    [0, 1],
    [1, 1],
    [7, 1],
    [8, 2],
    [14, 2],
    [15, 4],
    [17, 4],
    [28, 4],
    [30, 7],
    [49, 7],
    [50, 14],
    [90, 14],
    [98, 14],
    [400, 58],
  ])('labels %i bars every %i, so at most seven labels print', (bars, every) => {
    expect(labelEvery(bars)).toBe(every);
  });
});
```

Create `src/tools/analytics/activity/__tests__/VotesPerDayChart.test.tsx`. It drives the kit's DOM as "What this task assumes about R1-3b" reads it:

```tsx
import type {ComponentProps} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {VotesPerDayChart} from '../VotesPerDayChart';
import type {DayStack} from '../activityModel';

function stack(day: string, over: Partial<DayStack> = {}): DayStack {
  return {day, high: 0, mid: 0, low: 0, unscored: 0, total: 0, voters: 0, ...over};
}

/** Sep 1 to Sep 30 2026, quiet but for Sep 30. */
const SEPTEMBER = [
  ...Array.from({length: 29}, (_, i) => stack(`2026-09-${String(i + 1).padStart(2, '0')}`)),
  stack('2026-09-30', {high: 5, mid: 4, low: 2, unscored: 1, total: 12, voters: 4}),
];

/** The 17 weeks from Mon Jun 8 to Mon Sep 28 2026. */
const SUMMER_WEEKS = Array.from({length: 17}, (_, i) =>
  stack(new Date(Date.UTC(2026, 5, 8 + 7 * i)).toISOString().slice(0, 10)),
);

/** A bar, found by the start of its accessible name: its tooltip's title. */
const bar = (title: string) => screen.getByRole('button', {name: new RegExp(`^${title}\\b`)});

function renderChart(over: Partial<ComponentProps<typeof VotesPerDayChart>> = {}) {
  const props: ComponentProps<typeof VotesPerDayChart> = {
    stacks: SEPTEMBER,
    bucket: 'day',
    startDay: '2026-09-01',
    endDay: '2026-09-30',
    selectedKey: null,
    onSelect: vi.fn(),
    ...over,
  };
  render(<VotesPerDayChart {...props} />);
  return props;
}

describe('VotesPerDayChart', () => {
  it("charts a bar per day under the range's own days, each named by its tooltip", () => {
    renderChart();

    expect(screen.getByRole('heading', {name: 'Votes per day'})).toBeInTheDocument();
    expect(screen.getByText('Sep 1 – Sep 30. Pick a day to filter the log; pick it again to clear.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', {name: /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) Sep \d+\b/})).toHaveLength(30);
    expect(bar('Wed Sep 30')).toHaveAccessibleName(/\b12 votes\b.*\b4 voters\b/);
    expect(bar('Tue Sep 29')).toHaveAccessibleName(/\b0 votes\b/);
  });

  it('marks the picked day and hands each pick back', async () => {
    const props = renderChart({selectedKey: '2026-09-12'});

    expect(bar('Sat Sep 12')).toHaveAttribute('aria-pressed', 'true');
    expect(bar('Sun Sep 13')).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(bar('Sun Sep 13'));
    expect(props.onSelect).toHaveBeenCalledWith('2026-09-13');
  });

  it('shows the same numbers as a table', async () => {
    renderChart();
    await userEvent.click(screen.getByRole('button', {name: 'Table'}));

    const table = screen.getByRole('table', {name: 'Votes per day, Sep 1 – Sep 30'});
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Day',
      'Votes',
      '7+',
      '5–6',
      '≤4',
      'No score',
      'Voters',
    ]);
    const cells = [...(within(table).getByText('Wed Sep 30').closest('tr')?.cells ?? [])];
    expect(cells.map((cell) => cell.textContent)).toEqual(['Wed Sep 30', '12', '5', '4', '2', '1', '4']);
  });

  it('charts weeks past 90 days, each bar named for its Monday', () => {
    renderChart({stacks: SUMMER_WEEKS, bucket: 'week', startDay: '2026-06-10', endDay: '2026-09-30'});

    expect(screen.getByRole('heading', {name: 'Votes per week'})).toBeInTheDocument();
    expect(
      screen.getByText(
        'Jun 10 – Sep 30, in weeks from Monday, first and last weeks partial. Pick a week to filter the log; pick it again to clear.',
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', {name: /^Week of /})).toHaveLength(17);
    // The range starts on a Wednesday and ends on one, so both end weeks say they are part weeks.
    expect(bar('Week of Jun 8')).toHaveAccessibleName(/^Week of Jun 8 \(from Jun 10\)/);
    expect(bar('Week of Sep 28')).toHaveAccessibleName(/^Week of Sep 28 \(to Sep 30\)/);
    expect(bar('Week of Sep 21')).not.toHaveAccessibleName(/\(/);
  });
});
```

Create `src/tools/analytics/activity/__tests__/VoteLogTable.test.tsx`:

```tsx
import type {ComponentProps} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {VoteLogTable} from '../VoteLogTable';
import type {VoteLogRow} from '../../voteLogTypes';

function vote(over: Partial<VoteLogRow> & Pick<VoteLogRow, 'ts' | 'voter'>): VoteLogRow {
  return {
    a: '1',
    b: '2',
    aName: 'Elsa',
    bName: 'Anna',
    score: 8,
    accuracy: null,
    isReal: null,
    wouldPlay: null,
    difficulty: null,
    whoCarries: null,
    ...over,
  };
}

const VOTES: VoteLogRow[] = [
  vote({ts: '2026-09-30T18:05:00Z', voter: 1, whoCarries: 'a'}),
  // The real log's form: Supabase's created_at, with microseconds and a +00:00 offset.
  vote({
    ts: '2026-09-30T09:15:00.123456+00:00',
    voter: 2,
    aName: 'Maui',
    bName: 'Moana',
    score: null,
    whoCarries: 'neither',
  }),
  vote({ts: '2026-09-29T12:00:00Z', voter: 1, score: 3, whoCarries: 'b'}),
];

function renderTable(over: Partial<ComponentProps<typeof VoteLogTable>> = {}) {
  const props: ComponentProps<typeof VoteLogTable> = {
    votes: VOTES,
    limit: 25,
    pickedLabel: null,
    voter: null,
    onShowMore: vi.fn(),
    onPickVoter: vi.fn(),
    ...over,
  };
  render(<VoteLogTable {...props} />);
  return props;
}

describe('VoteLogTable', () => {
  it('is a real table: a caption, column headers and a row header per day', () => {
    renderTable();
    const table = screen.getByRole('table', {name: 'Votes matching the filters, newest first'});

    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Time (UTC)',
      'Pair',
      'Score',
      'Carries',
      'Voter',
    ]);
    expect(within(table).getAllByRole('rowheader').map((th) => th.textContent)).toEqual([
      'Wed Sep 30 · 2 votes · 2 voters',
      'Tue Sep 29 · 1 vote · 1 voter',
    ]);
  });

  it("shows each vote's UTC time and names the card that carries", () => {
    renderTable();
    expect(screen.getByRole('cell', {name: '18:05'})).toBeInTheDocument();
    expect(screen.getByRole('cell', {name: '09:15'})).toBeInTheDocument();
    expect(screen.getByRole('cell', {name: 'Elsa'})).toBeInTheDocument();
    expect(screen.getByRole('cell', {name: 'Anna'})).toBeInTheDocument();
    expect(screen.getByRole('cell', {name: 'Neither'})).toBeInTheDocument();
  });

  it("keeps a day's full counts on a short page, and asks for the rest", async () => {
    const props = renderTable({limit: 1});

    expect(screen.getAllByRole('cell', {name: /×/})).toHaveLength(1);
    expect(screen.getByRole('rowheader', {name: 'Wed Sep 30 · 2 votes · 2 voters'})).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Show 2 more'}));
    expect(props.onShowMore).toHaveBeenCalledOnce();
  });

  it('hands a voter click back', async () => {
    const props = renderTable();
    await userEvent.click(screen.getAllByRole('button', {name: 'Filter by voter #1'})[0]);
    expect(props.onPickVoter).toHaveBeenCalledWith(1);
  });

  it('names the picked bar in its summary', () => {
    renderTable({votes: VOTES.slice(0, 2), pickedLabel: 'Wed Sep 30'});
    expect(screen.getByText('Wed Sep 30 · 2 votes')).toBeInTheDocument();
  });

  it('says when nothing matches, naming the voter when one is picked', () => {
    renderTable({votes: [], voter: 3});
    expect(screen.getByText('No votes from voter 3 match these filters.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run them and see them fail**

Run: `pnpm vitest run src/tools/analytics/activity/__tests__/activityChart.test.ts src/tools/analytics/activity/__tests__/VotesPerDayChart.test.tsx src/tools/analytics/activity/__tests__/VoteLogTable.test.tsx`
Expected: FAIL with `Failed to resolve import "../activityChart"`, `Failed to resolve import "../VotesPerDayChart"` and `Failed to resolve import "../VoteLogTable"`.

- [ ] **Step 8: Write the chart's parts and the chart**

Create `src/tools/analytics/activity/activityChart.ts`:

```ts
import type {BarDatum} from '../../../charts/BarChart';
import type {ChartTable} from '../../../charts/ChartFrame';
import type {TooltipContent} from '../../../charts/ChartTooltip';
import {addDays, weekStart} from '../../../charts/scale';
import type {SeriesDef} from '../../../charts/series';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {fmtDay, fmtInt, fmtWeekday} from '../../../ui/format';
import {BAND_LABELS, SCORE_BANDS, type ChartBucket, type DayStack, type ScoreBand} from './activityModel';

/**
 * Band fills. 5–6 takes barNeutral, which keeps 3:1 against the chart's card
 * (WCAG 1.4.11; src/theme/__tests__/adminTheme.test.ts holds all four). "No
 * score" is the kit's hatch in muted stripes, so it never reads as a score.
 */
const BAND_FILL: Record<ScoreBand, string> = {
  high: ADMIN_COLORS.under,
  mid: ADMIN_COLORS.barNeutral,
  low: ADMIN_COLORS.over,
  unscored: ADMIN_COLORS.muted,
};

/**
 * The tooltip's band rows, which the kit also reads out as each bar's name:
 * "5 scored 7+" is heard as words where "5 7+" isn't. The legend and the table
 * headers keep the short BAND_LABELS.
 */
const BAND_ROW_LABELS: Record<ScoreBand, string> = {
  high: 'scored 7+',
  mid: 'scored 5–6',
  low: 'scored ≤4',
  unscored: 'with no score',
};

/** The chart's four series, one per band, in filter and legend order. Each id is its ScoreBand. */
export const BAND_SERIES: readonly SeriesDef[] = SCORE_BANDS.map((band) =>
  band === 'unscored'
    ? {id: band, label: BAND_LABELS[band], color: BAND_FILL[band], pattern: 'hatch'}
    : {id: band, label: BAND_LABELS[band], color: BAND_FILL[band]},
);

/** Steps that keep a calendar rhythm: every bar, every other, every fourth, then whole weeks. */
const LABEL_STEPS = [1, 2, 4, 7, 14, 28, 56];
/** At most this many x labels, so "Sep 30"-wide labels never touch on a narrow plot. */
const MAX_X_LABELS = 7;

/** The UTC Sunday that closes the week from `monday`. */
function weekEnd(monday: string): string {
  return addDays(monday, 6);
}

/** "Votes per day", or "Votes per week" once the range runs past 90 days. */
export function chartTitle(bucket: ChartBucket): string {
  return bucket === 'day' ? 'Votes per day' : 'Votes per week';
}

/**
 * What a bar covers, in words: "Wed Sep 30", or "Week of Sep 28" from the
 * week's Monday. Given the range's days, a week the range clips says so
 * ("Week of Sep 28 (to Sep 30)", "Week of Jun 8 (from Jun 10)"), so a part
 * week at either end never reads as a whole one. Without them, the plain form.
 */
export function bucketTitle(key: string, bucket: ChartBucket, startDay?: string, endDay?: string): string {
  if (bucket === 'day') return fmtWeekday(key);
  const title = `Week of ${fmtDay(key)}`;
  const from = startDay !== undefined && startDay > key ? startDay : null;
  const to = endDay !== undefined && endDay < weekEnd(key) ? endDay : null;
  if (from !== null && to !== null) return `${title} (${fmtDay(from)} to ${fmtDay(to)})`;
  if (from !== null) return `${title} (from ${fmtDay(from)})`;
  if (to !== null) return `${title} (to ${fmtDay(to)})`;
  return title;
}

/** Which end weeks a weekly range clips, as a clause for the subtitle; "" when it runs Monday to Sunday. */
function partialWeeks(startDay: string, endDay: string): string {
  const first = weekStart(startDay) !== startDay;
  const last = weekEnd(weekStart(endDay)) !== endDay;
  if (first && last) return ', first and last weeks partial';
  if (first) return ', first week partial';
  if (last) return ', last week partial';
  return '';
}

/** The chart's subtitle: the range's days, how a weekly chart cuts them, and how to pick a bar. */
export function chartSubtitle(bucket: ChartBucket, startDay: string, endDay: string): string {
  const days = `${fmtDay(startDay)} – ${fmtDay(endDay)}`;
  const pick = `. Pick a ${bucket} to filter the log; pick it again to clear.`;
  if (bucket === 'day') return `${days}${pick}`;
  return `${days}, in weeks from Monday${partialWeeks(startDay, endDay)}${pick}`;
}

/** One bar per stack, keyed by its day (a week's by its Monday) and labelled "Sep 30" under the axis. */
export function barData(stacks: readonly DayStack[]): BarDatum[] {
  return stacks.map((stack) => ({
    key: stack.day,
    label: fmtDay(stack.day),
    values: {high: stack.high, mid: stack.mid, low: stack.low, unscored: stack.unscored},
  }));
}

/**
 * Each bar's tooltip, which the kit also reads out as the bar's name: what it
 * covers (a clipped end week says so), its votes, one row per band with that
 * band's line key, and its distinct voters. Values lead and labels follow;
 * only the keys wear the band colour. Every band shows, a zero included, so
 * the rows never move.
 */
export function tooltipFor(
  stacks: readonly DayStack[],
  bucket: ChartBucket,
  startDay: string,
  endDay: string,
): (d: BarDatum) => TooltipContent {
  const byKey = new Map(stacks.map((stack) => [stack.day, stack]));
  return (d) => {
    const stack = byKey.get(d.key);
    if (!stack) return {title: d.label, rows: []};
    return {
      title: bucketTitle(stack.day, bucket, startDay, endDay),
      rows: [
        {label: stack.total === 1 ? 'vote' : 'votes', value: fmtInt(stack.total)},
        ...SCORE_BANDS.map((band) => ({
          label: BAND_ROW_LABELS[band],
          value: fmtInt(stack[band]),
          color: BAND_FILL[band],
        })),
        {label: stack.voters === 1 ? 'voter' : 'voters', value: fmtInt(stack.voters)},
      ],
    };
  };
}

/** The chart's table view: a row per bar, oldest first, with every number the bars and tooltips carry. */
export function chartTable(stacks: readonly DayStack[], bucket: ChartBucket, startDay: string, endDay: string): ChartTable {
  return {
    caption: `${chartTitle(bucket)}, ${fmtDay(startDay)} – ${fmtDay(endDay)}`,
    columns: [bucket === 'day' ? 'Day' : 'Week', 'Votes', ...SCORE_BANDS.map((band) => BAND_LABELS[band]), 'Voters'],
    rows: stacks.map((stack) => [
      bucketTitle(stack.day, bucket, startDay, endDay),
      fmtInt(stack.total),
      ...SCORE_BANDS.map((band) => fmtInt(stack[band])),
      fmtInt(stack.voters),
    ]),
  };
}

/** The smallest step that prints at most MAX_X_LABELS x labels across `bars` bars. */
export function labelEvery(bars: number): number {
  return LABEL_STEPS.find((step) => Math.ceil(bars / step) <= MAX_X_LABELS) ?? Math.ceil(bars / MAX_X_LABELS);
}
```

Create `src/tools/analytics/activity/VotesPerDayChart.tsx`. The kit draws the bars, the axis, the tooltip, the selection and the table view; this file only feeds it:

```tsx
import {BarChart} from '../../../charts/BarChart';
import {ChartFrame} from '../../../charts/ChartFrame';
import {ChartLegend} from '../../../charts/ChartLegend';
import {fmtInt} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {BAND_SERIES, barData, chartSubtitle, chartTable, chartTitle, labelEvery, tooltipFor} from './activityChart';
import type {ChartBucket, DayStack} from './activityModel';

/** The plot's height. The kit adds the axis band below it, so the frame never scrolls. */
const PLOT_HEIGHT = 160;

interface VotesPerDayChartProps {
  /** Oldest first, from chartStacks. */
  stacks: DayStack[];
  bucket: ChartBucket;
  /** The range's first and last UTC days. */
  startDay: string;
  endDay: string;
  /** The picked bar's key (its day, or its week's Monday), or null. */
  selectedKey: string | null;
  /** Hands each pick back; the view decides whether it clears the pick. */
  onSelect: (key: string | null) => void;
}

/**
 * Votes per day (per week once the range runs past 90 days), stacked by score
 * band, on the chart kit. Only the newest and the busiest bars print their
 * totals. Every bar's band counts and voters are in its tooltip, which is also
 * its accessible name, and in the table view. Each bar is a toggle: picking
 * one filters the vote log to its day or week, and picking it again clears it.
 */
export function VotesPerDayChart({stacks, bucket, startDay, endDay, selectedKey, onSelect}: VotesPerDayChartProps) {
  const title = chartTitle(bucket);
  return (
    // ChartFrame draws no card surface (R1-8, R1-10), so an untitled Panel is the card.
    <Panel>
      <ChartFrame
        title={title}
        subtitle={chartSubtitle(bucket, startDay, endDay)}
        legend={<ChartLegend series={BAND_SERIES} mark="rect" />}
        table={chartTable(stacks, bucket, startDay, endDay)}>
        <BarChart
          data={barData(stacks)}
          series={BAND_SERIES}
          ariaLabel={title}
          height={PLOT_HEIGHT}
          valueFormat={fmtInt}
          tooltip={tooltipFor(stacks, bucket, startDay, endDay)}
          capLabels="extremes"
          xLabelEvery={labelEvery(stacks.length)}
          selectedKey={selectedKey}
          onSelect={onSelect}
        />
      </ChartFrame>
    </Panel>
  );
}
```

The band fills now live in `activityChart.ts`, so point R1-2's theme test at them. In `src/theme/__tests__/adminTheme.test.ts`, replace:

```ts
    // The Votes per day bands (BAND_FILL in src/tools/analytics/activity/VotesPerDayChart.tsx)
```

with:

```ts
    // The Votes per day bands (BAND_FILL in src/tools/analytics/activity/activityChart.ts)
```

The four band colours that test checks are the four `BAND_FILL` holds (R1-3b's emphasis line stays), so nothing else in it changes. Its next line, "sit in a Panel, whose fill is the card over the page", stays true: `VotesPerDayChart`'s untitled Panel is that card.

- [ ] **Step 9: Write the log table**

Create `src/tools/analytics/activity/VoteLogTable.tsx`:

```tsx
import {CtaButton, LETTER_SPACING, LinkButton, SPACING, TRUNCATE} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtWeekday} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {ScorePill} from '../../../ui/ScorePill';
import type {VoteLogRow} from '../voteLogTypes';
import {carriesLabel, countOf, logPage} from './activityModel';

/** Rows on the log's first page, and rows each "Show more" adds. */
export const LOG_PAGE_SIZE = 25;

/** Hides the caption on screen; screen readers still name the table by it. */
const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
};

const CELL: React.CSSProperties = {
  padding: `${SPACING.sm}px ${SPACING.lg}px`,
  borderTop: `1px solid ${ADMIN_COLORS.divider}`,
  verticalAlign: 'middle',
};

const HEAD_CELL: React.CSSProperties = {
  padding: `${SPACING.sm}px ${SPACING.lg}px`,
  background: ADMIN_COLORS.panel,
  textAlign: 'left',
  fontSize: ADMIN_TYPE.label,
  fontWeight: 700,
  letterSpacing: LETTER_SPACING.cap,
  textTransform: 'uppercase',
  color: ADMIN_COLORS.muted,
};

const DAY_CELL: React.CSSProperties = {
  ...CELL,
  background: ADMIN_COLORS.aside,
  textAlign: 'left',
  fontSize: ADMIN_TYPE.label,
  fontWeight: 700,
  color: ADMIN_COLORS.text,
};

interface VoteLogTableProps {
  /** The votes in the range that pass every filter, the picked bar included. */
  votes: VoteLogRow[];
  limit: number;
  /** What the picked bar covers ("Wed Sep 30", "Week of Sep 28"), or null with no pick. */
  pickedLabel: string | null;
  voter: number | null;
  onShowMore: () => void;
  onPickVoter: (voter: number) => void;
  /** A control in the header, before the summary: ActivityView's "Pick a day" select. */
  picker?: React.ReactNode;
}

/**
 * The raw vote log, newest first, grouped by UTC day. Each day opens with a
 * row header that keeps the day's full counts even when the page cuts the day
 * short. `#N` filters the page to that voter. A row's key is the vote itself,
 * never its position, so the row (and the focus on its `#N`) survives a filter.
 */
export function VoteLogTable({votes, limit, pickedLabel, voter, onShowMore, onPickVoter, picker}: VoteLogTableProps) {
  const {days, hidden} = logPage(votes, limit);
  const summary = `${pickedLabel === null ? '' : `${pickedLabel} · `}${countOf(votes.length, 'vote')}`;

  return (
    <Panel
      title="Vote log"
      action={
        <span style={{display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.md}}>
          {picker}
          <span style={{fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>{summary}</span>
        </span>
      }
      padded={false}>
      {days.length === 0 ? (
        <p
          style={{
            margin: 0,
            padding: `${SPACING.xxl}px ${SPACING.lg}px`,
            textAlign: 'center',
            fontSize: ADMIN_TYPE.body,
            color: ADMIN_COLORS.muted,
          }}>
          {voter === null ? 'No votes match these filters.' : `No votes from voter ${voter} match these filters.`}
        </p>
      ) : (
        <div style={{overflowX: 'auto'}}>
          <table
            style={{
              width: '100%',
              minWidth: 560,
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
              fontSize: ADMIN_TYPE.body,
            }}>
            <caption style={SR_ONLY}>Votes matching the filters, newest first</caption>
            <colgroup>
              <col style={{width: 96}} />
              <col />
              <col style={{width: 72}} />
              <col style={{width: 160}} />
              <col style={{width: 80}} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" style={HEAD_CELL}>
                  Time (UTC)
                </th>
                <th scope="col" style={HEAD_CELL}>
                  Pair
                </th>
                <th scope="col" style={{...HEAD_CELL, textAlign: 'center'}}>
                  Score
                </th>
                <th scope="col" style={HEAD_CELL}>
                  Carries
                </th>
                <th scope="col" style={{...HEAD_CELL, textAlign: 'right'}}>
                  Voter
                </th>
              </tr>
            </thead>
            {days.map((group) => (
              <tbody key={group.day}>
                <tr>
                  <th scope="rowgroup" colSpan={5} style={DAY_CELL}>
                    {fmtWeekday(group.day)}
                    {' · '}
                    <span style={{fontWeight: 500, color: ADMIN_COLORS.muted}}>
                      {`${countOf(group.count, 'vote')} · ${countOf(group.voters, 'voter')}`}
                    </span>
                  </th>
                </tr>
                {group.rows.map((vote) => {
                  const pair = `${vote.aName} × ${vote.bName}`;
                  return (
                    <tr key={`${vote.ts}:${vote.voter}:${vote.a}:${vote.b}`} className="adm-hover-row">
                      <td style={{...CELL, color: ADMIN_COLORS.muted, fontVariantNumeric: 'tabular-nums'}}>
                        {vote.ts.slice(11, 16)}
                      </td>
                      <td style={{...CELL, ...TRUNCATE}} title={pair}>
                        {pair}
                      </td>
                      <td style={{...CELL, textAlign: 'center'}}>
                        <ScorePill score={vote.score} />
                      </td>
                      <td style={{...CELL, ...TRUNCATE, color: ADMIN_COLORS.muted}}>{carriesLabel(vote)}</td>
                      <td style={{...CELL, textAlign: 'right'}}>
                        <LinkButton
                          type="button"
                          tone="muted"
                          size="sm"
                          aria-label={`Filter by voter #${vote.voter}`}
                          onClick={() => onPickVoter(vote.voter)}>
                          #{vote.voter}
                        </LinkButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>
      )}
      {hidden > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: SPACING.md,
            borderTop: `1px solid ${ADMIN_COLORS.divider}`,
          }}>
          <CtaButton type="button" variant="neutral" onClick={onShowMore}>
            Show {Math.min(LOG_PAGE_SIZE, hidden)} more
          </CtaButton>
        </div>
      )}
    </Panel>
  );
}
```

- [ ] **Step 10: Run them and see them pass**

Run: `pnpm vitest run src/tools/analytics/activity/__tests__/activityChart.test.ts src/tools/analytics/activity/__tests__/VotesPerDayChart.test.tsx src/tools/analytics/activity/__tests__/VoteLogTable.test.tsx src/theme`
Expected: PASS (34 tests here: 24, 4 and 6, plus R1-2's theme tests).

- [ ] **Step 11: Write the failing view tests**

Create `src/tools/analytics/activity/__tests__/ActivityView.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ActivityView} from '../ActivityView';
import type {VoteLog, VoteLogRow} from '../../voteLogTypes';

function vote(over: Partial<VoteLogRow> & Pick<VoteLogRow, 'ts' | 'voter'>): VoteLogRow {
  return {
    a: '1',
    b: '2',
    aName: 'Elsa',
    bName: 'Anna',
    score: 8,
    accuracy: null,
    isReal: null,
    wouldPlay: null,
    difficulty: null,
    whoCarries: null,
    ...over,
  };
}

const MAUI = {a: '3', b: '4', aName: 'Maui', bName: 'Moana'};
const SCAR = {a: '5', b: '6', aName: 'Scar', bName: 'Simba'};

// Newest first, as buildVoteLog writes the log. The ranges, counted back from Wed Sep 30:
// 7 days (from Sep 24) hold the first three votes, 30 days (from Sep 1) four, 90 days
// (from Jul 3) five, and All (from Jun 10, 113 days) all six, charted per week.
const LOG: VoteLog = {
  generatedAt: '2026-10-01T04:00:00Z',
  voterCount: 3,
  votes: [
    vote({ts: '2026-09-30T18:05:00Z', voter: 1, score: 8, whoCarries: 'a'}),
    vote({...MAUI, ts: '2026-09-30T09:15:00Z', voter: 2, score: 3, whoCarries: 'both'}),
    vote({ts: '2026-09-29T12:00:00Z', voter: 1, score: null}),
    vote({...SCAR, ts: '2026-09-01T08:00:00Z', voter: 3, score: 6}),
    vote({...MAUI, ts: '2026-08-15T10:00:00Z', voter: 3, score: 9}),
    vote({...SCAR, ts: '2026-06-10T10:00:00Z', voter: 2, score: 4}),
  ],
};

const logTable = () => screen.getByRole('table', {name: 'Votes matching the filters, newest first'});
const pairsInLog = () => within(logTable()).getAllByRole('cell', {name: /×/}).map((cell) => cell.textContent);
const kpis = () => within(screen.getByRole('region', {name: 'Activity summary'}));
const search = () => screen.getByRole('searchbox', {name: 'Search pairs'});
const voterSelect = () => screen.getByRole('combobox', {name: 'Filter by voter'});
const range = (label: string) => within(screen.getByRole('group', {name: 'Range'})).getByRole('button', {name: label});
const band = (label: string) =>
  within(screen.getByRole('group', {name: 'Filter by score'})).getByRole('button', {name: label});
/** A chart bar, found by the start of its accessible name: its tooltip's title. */
const bar = (title: string) => screen.getByRole('button', {name: new RegExp(`^${title}\\b`)});
/** The vote log's day picker, the bars' 24px-or-larger equivalent (WCAG 2.5.8). */
const daySelect = () => screen.getByRole('combobox', {name: 'Pick a day'});

describe('ActivityView', () => {
  it('says the vote log is loading', () => {
    render(<ActivityView voteLog={null} />);
    expect(screen.getByText('Loading vote log...')).toBeInTheDocument();
  });

  it('names the file when the vote log could not load', () => {
    render(<ActivityView voteLog={null} error={new Error('vote-log.json has not been generated yet')} />);
    expect(
      screen.getByText('Could not load the vote log. Has the artifact been generated? (vote-log.json has not been generated yet)'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Loading vote log...')).not.toBeInTheDocument();
  });

  it('explains an empty log as no raw votes, with nothing to filter', () => {
    render(<ActivityView voteLog={{generatedAt: '2026-10-01T04:00:00Z', votes: [], voterCount: 0}} />);
    expect(screen.getByText(/^No raw votes yet\./)).toBeInTheDocument();
    expect(screen.getByText('SUPABASE_SERVICE_ROLE_KEY')).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('opens on the last 30 days, and the range scopes the KPIs, chart, log and side panels', () => {
    render(<ActivityView voteLog={LOG} />);
    expect(range('30 days')).toHaveAttribute('aria-pressed', 'true');

    expect(kpis().getByText('4')).toBeInTheDocument();
    expect(kpis().getByText('of 3 distinct voters')).toBeInTheDocument();
    // (8 + 3 + 6) / 3: the unscored vote counts as a vote, never toward the average.
    expect(kpis().getByText('5.7')).toBeInTheDocument();
    expect(kpis().getByText('Wed Sep 30')).toBeInTheDocument();
    expect(kpis().getByText('2 votes')).toBeInTheDocument();

    expect(screen.getByRole('heading', {name: 'Votes per day'})).toBeInTheDocument();
    expect(screen.getAllByRole('button', {name: /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Aug|Sep) \d+\b/})).toHaveLength(30);
    expect(bar('Tue Sep 1')).toBeInTheDocument();

    expect(pairsInLog()).toHaveLength(4);
    // Ties on votes go to the pair voted most recently: Maui × Moana's vote is Sep 30, Scar × Simba's Sep 1.
    expect(
      within(screen.getByRole('table', {name: 'Most voted pairs'}))
        .getAllByRole('cell', {name: /×/})
        .map((cell) => cell.textContent),
    ).toEqual(['Elsa × Anna', 'Maui × Moana', 'Scar × Simba']);
    expect(screen.getByRole('button', {name: '#1, 2 votes'})).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Clear filters'})).not.toBeInTheDocument();
  });

  it('narrows to 7 days and widens to 90, charting each day', async () => {
    render(<ActivityView voteLog={LOG} />);

    await userEvent.click(range('7 days'));
    expect(range('7 days')).toHaveAttribute('aria-pressed', 'true');
    expect(kpis().getByText('3')).toBeInTheDocument();
    expect(kpis().getByText('5.5')).toBeInTheDocument();
    expect(screen.getAllByRole('button', {name: /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) Sep \d+\b/})).toHaveLength(7);
    expect(pairsInLog()).toHaveLength(3);

    await userEvent.click(range('90 days'));
    expect(kpis().getByText('5')).toBeInTheDocument();
    expect(kpis().getByText('6.5')).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: 'Votes per day'})).toBeInTheDocument();
    expect(pairsInLog()).toHaveLength(5);
    // The range is the window, not a filter, so there is nothing to clear.
    expect(screen.queryByRole('button', {name: 'Clear filters'})).not.toBeInTheDocument();
  });

  it('charts the whole log per week once it runs past 90 days', async () => {
    render(<ActivityView voteLog={LOG} />);
    await userEvent.click(range('All'));

    expect(kpis().getByText('6')).toBeInTheDocument();
    expect(kpis().getByText('6.0')).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: 'Votes per week'})).toBeInTheDocument();
    // Mon Jun 8 (the week of the oldest vote) to Mon Sep 28: 17 weeks.
    expect(screen.getAllByRole('button', {name: /^Week of /})).toHaveLength(17);
    expect(bar('Week of Jun 8')).toBeInTheDocument();
    expect(pairsInLog()).toHaveLength(6);
  });

  it('searches either card name, ignoring case', async () => {
    render(<ActivityView voteLog={LOG} />);
    await userEvent.type(search(), 'MOANA');
    // Maui × Moana's Aug 15 vote is older than the 30 days.
    expect(pairsInLog()).toEqual(['Maui × Moana']);
    expect(kpis().getByText('1 vote')).toBeInTheDocument();
  });

  it('narrows the page to the voter picked in the select', async () => {
    render(<ActivityView voteLog={LOG} />);
    await userEvent.selectOptions(voterSelect(), '3');
    expect(pairsInLog()).toEqual(['Scar × Simba']);
    expect(screen.getByRole('button', {name: '#3, 1 vote'})).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps unscored votes in a band of their own', async () => {
    render(<ActivityView voteLog={LOG} />);
    await userEvent.click(band('No score'));
    expect(band('No score')).toHaveAttribute('aria-pressed', 'true');
    expect(pairsInLog()).toEqual(['Elsa × Anna']);
    expect(kpis().getByText('—')).toBeInTheDocument();

    await userEvent.click(band('≤4'));
    expect(pairsInLog()).toEqual(['Maui × Moana']);
  });

  it('filters the log to a day picked in the chart, and clears it on a second pick', async () => {
    render(<ActivityView voteLog={LOG} />);

    await userEvent.click(bar('Tue Sep 29'));
    expect(bar('Tue Sep 29')).toHaveAttribute('aria-pressed', 'true');
    expect(pairsInLog()).toEqual(['Elsa × Anna']);
    expect(screen.getByText('Tue Sep 29 · 1 vote')).toBeInTheDocument();
    // The day narrows the log, not the KPIs.
    expect(kpis().getByText('4')).toBeInTheDocument();

    await userEvent.click(bar('Tue Sep 29'));
    expect(bar('Tue Sep 29')).toHaveAttribute('aria-pressed', 'false');
    expect(pairsInLog()).toHaveLength(4);
  });

  it("picks a day from the log's select as a bar pick does, and the select follows a bar pick", async () => {
    render(<ActivityView voteLog={LOG} />);
    expect(daySelect()).toHaveValue('');

    await userEvent.selectOptions(daySelect(), '2026-09-29');
    expect(bar('Tue Sep 29')).toHaveAttribute('aria-pressed', 'true');
    expect(pairsInLog()).toEqual(['Elsa × Anna']);

    await userEvent.click(bar('Wed Sep 30'));
    expect(daySelect()).toHaveValue('2026-09-30');

    await userEvent.selectOptions(daySelect(), '');
    expect(bar('Wed Sep 30')).toHaveAttribute('aria-pressed', 'false');
    expect(pairsInLog()).toHaveLength(4);
  });

  it('picks a whole week when the chart runs per week, and the log reads that week', async () => {
    render(<ActivityView voteLog={LOG} />);
    await userEvent.click(range('All'));
    await userEvent.click(bar('Week of Sep 28'));

    expect(bar('Week of Sep 28')).toHaveAttribute('aria-pressed', 'true');
    expect(pairsInLog()).toEqual(['Elsa × Anna', 'Maui × Moana', 'Elsa × Anna']);
    // The log's summary and its picker keep the plain week name; the bar's own name says the week is clipped.
    expect(screen.getByText('Week of Sep 28 · 3 votes')).toBeInTheDocument();
    expect(screen.getByRole('combobox', {name: 'Pick a week'})).toHaveValue('2026-09-28');
    expect(kpis().getByText('6')).toBeInTheDocument();
  });

  it('drops the picked bar when the range changes', async () => {
    render(<ActivityView voteLog={LOG} />);
    await userEvent.click(bar('Tue Sep 29'));
    expect(pairsInLog()).toEqual(['Elsa × Anna']);

    await userEvent.click(range('7 days'));
    expect(bar('Tue Sep 29')).toHaveAttribute('aria-pressed', 'false');
    expect(pairsInLog()).toHaveLength(3);
    expect(screen.queryByRole('button', {name: 'Clear filters'})).not.toBeInTheDocument();
  });

  it('filters by a voter picked in the log, keeping focus on the pick, and Most active voters toggles them off', async () => {
    render(<ActivityView voteLog={LOG} />);
    await userEvent.click(screen.getByRole('button', {name: 'Filter by voter #2'}));
    expect(voterSelect()).toHaveValue('2');
    expect(pairsInLog()).toEqual(['Maui × Moana']);
    // The row keeps its key when the filter drops the rows around it, so keyboard focus stays put.
    expect(screen.getByRole('button', {name: 'Filter by voter #2'})).toHaveFocus();

    const topVoter = screen.getByRole('button', {name: '#2, 1 vote'});
    expect(topVoter).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(topVoter);
    expect(voterSelect()).toHaveValue('');
    expect(pairsInLog()).toHaveLength(4);
  });

  it('lists 25 votes, then 25 more on request, and starts over when a filter changes', async () => {
    // Thirty distinct times on one day, half an hour apart, so every row has its own key.
    const votes = Array.from({length: 30}, (_, i) =>
      vote({
        ts: `2026-09-30T${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}:00Z`,
        voter: 1,
        aName: `Card ${i}`,
      }),
    );
    render(<ActivityView voteLog={{generatedAt: '2026-10-01T04:00:00Z', votes, voterCount: 1}} />);
    expect(pairsInLog()).toHaveLength(25);

    await userEvent.click(screen.getByRole('button', {name: 'Show 5 more'}));
    expect(pairsInLog()).toHaveLength(30);
    expect(screen.queryByRole('button', {name: /^Show \d+ more$/})).not.toBeInTheDocument();

    await userEvent.click(band('7+'));
    expect(pairsInLog()).toHaveLength(25);
  });

  it('clears the search, voter, band and picked day at once, and keeps the range', async () => {
    render(<ActivityView voteLog={LOG} />);
    await userEvent.click(range('7 days'));
    await userEvent.type(search(), 'elsa');
    await userEvent.selectOptions(voterSelect(), '1');
    await userEvent.click(band('7+'));
    await userEvent.click(bar('Wed Sep 30'));
    expect(pairsInLog()).toEqual(['Elsa × Anna']);

    await userEvent.click(screen.getByRole('button', {name: 'Clear filters'}));
    expect(search()).toHaveValue('');
    expect(voterSelect()).toHaveValue('');
    expect(band('All')).toHaveAttribute('aria-pressed', 'true');
    expect(bar('Wed Sep 30')).toHaveAttribute('aria-pressed', 'false');
    expect(range('7 days')).toHaveAttribute('aria-pressed', 'true');
    expect(pairsInLog()).toHaveLength(3);
    expect(screen.queryByRole('button', {name: 'Clear filters'})).not.toBeInTheDocument();
  });

  it('says when no vote matches, naming the voter when one is picked', async () => {
    render(<ActivityView voteLog={LOG} />);
    await userEvent.type(search(), 'zzz');
    expect(screen.getByText('No votes match these filters.')).toBeInTheDocument();
    expect(screen.queryByRole('table', {name: /newest first/})).not.toBeInTheDocument();

    await userEvent.clear(search());
    await userEvent.selectOptions(voterSelect(), '3');
    await userEvent.click(band('No score'));
    expect(screen.getByText('No votes from voter 3 match these filters.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 12: Run it and see it fail**

Run: `pnpm vitest run src/tools/analytics/activity/__tests__/ActivityView.test.tsx`
Expected: FAIL with `Failed to resolve import "../ActivityView" from "src/tools/analytics/activity/__tests__/ActivityView.test.tsx"`.

- [ ] **Step 13: Write the filter row, KPI row and side panels**

Create `src/tools/analytics/activity/ActivityFilterBar.tsx`. The range comes first (`dataviz`: date range first, in one row above what it scopes):

```tsx
import {LinkButton, SPACING} from '../../../app-bridge';
import {RangeControl} from '../../../charts/range';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {SegmentedControl} from '../../../ui/SegmentedControl';
import {BAND_LABELS, SCORE_BANDS, hasActiveFilters, type ActivityFilters, type BandFilter} from './activityModel';

const BAND_OPTIONS: ReadonlyArray<{value: BandFilter; label: string}> = [
  {value: 'all', label: 'All'},
  ...SCORE_BANDS.map((band) => ({value: band, label: BAND_LABELS[band]})),
];

interface ActivityFilterBarProps {
  filters: ActivityFilters;
  /** Distinct voters in the whole log; the select offers Voter 1 to N. */
  voterCount: number;
  onChange: (patch: Partial<ActivityFilters>) => void;
  onClear: () => void;
}

/**
 * The filter row, which scopes everything below it: the range first (R-9),
 * then pair search, voter and score band, and "Clear filters" once one of
 * those or a picked bar is set. Clearing keeps the range, the window the page
 * reads; the view's onClear resets the rest.
 */
export function ActivityFilterBar({filters, voterCount, onChange, onClear}: ActivityFilterBarProps) {
  return (
    <div style={{display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.md}}>
      <RangeControl value={filters.range} onChange={(range) => onChange({range})} />
      <input
        type="search"
        className="adm-input"
        aria-label="Search pairs"
        placeholder="Search pairs"
        value={filters.q}
        onChange={(e) => onChange({q: e.target.value})}
        style={{flex: '1 1 220px', maxWidth: 320}}
      />
      <select
        className="adm-select"
        aria-label="Filter by voter"
        value={filters.voter ?? ''}
        onChange={(e) => onChange({voter: e.target.value === '' ? null : Number(e.target.value)})}>
        <option value="">All voters</option>
        {Array.from({length: voterCount}, (_, i) => i + 1).map((voter) => (
          <option key={voter} value={voter}>
            Voter {voter}
          </option>
        ))}
      </select>
      <div style={{display: 'flex', alignItems: 'center', gap: SPACING.sm}}>
        {/* The visual label; the group's own name ("Filter by score") is what screen readers hear. */}
        <span aria-hidden="true" style={{fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>
          Score
        </span>
        <SegmentedControl
          options={BAND_OPTIONS}
          value={filters.band}
          onChange={(band) => onChange({band})}
          ariaLabel="Filter by score"
        />
      </div>
      {hasActiveFilters(filters) && (
        <LinkButton type="button" tone="muted" size="sm" onClick={onClear}>
          Clear filters
        </LinkButton>
      )}
    </div>
  );
}
```

Create `src/tools/analytics/activity/ActivityKpiRow.tsx`:

```tsx
import {SPACING} from '../../../app-bridge';
import {fmtInt, fmtScore, fmtWeekday} from '../../../ui/format';
import {KpiCard} from '../../../ui/KpiCard';
import type {VoteLogRow} from '../voteLogTypes';
import {activityKpis, countOf} from './activityModel';

interface ActivityKpiRowProps {
  /** The votes in the range that pass the filter row; the picked bar doesn't narrow the KPIs. */
  votes: VoteLogRow[];
  /** Distinct voters in the whole log. */
  voterCount: number;
}

/** The four KPI cards over the range's filtered votes. Unscored votes count as votes, never toward the average. */
export function ActivityKpiRow({votes, voterCount}: ActivityKpiRowProps) {
  const {votes: total, activeVoters, avgScore, busiestDay} = activityKpis(votes);
  return (
    <section
      aria-label="Activity summary"
      style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: SPACING.md}}>
      <KpiCard label="Votes" value={fmtInt(total)} hint="matching filters" />
      <KpiCard label="Active voters" value={fmtInt(activeVoters)} hint={`of ${fmtInt(voterCount)} distinct voters`} />
      <KpiCard label="Average score" value={fmtScore(avgScore, 1)} hint="1–10, scored votes only" />
      <KpiCard
        label="Busiest day"
        value={busiestDay ? fmtWeekday(busiestDay.day) : '—'}
        hint={busiestDay ? countOf(busiestDay.count, 'vote') : undefined}
      />
    </section>
  );
}
```

Create `src/tools/analytics/activity/ActivitySidePanels.tsx`:

```tsx
import {SPACING, TRUNCATE} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtInt} from '../../../ui/format';
import {MeterBar} from '../../../ui/MeterBar';
import {Panel} from '../../../ui/Panel';
import {ScorePill} from '../../../ui/ScorePill';
import type {VoteLogRow} from '../voteLogTypes';
import {countOf, topPairs, topVoters} from './activityModel';

const NOTE: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

const HEAD: React.CSSProperties = {
  padding: `0 0 ${SPACING.xs}px`,
  fontSize: ADMIN_TYPE.label,
  fontWeight: 600,
  color: ADMIN_COLORS.muted,
};

const CELL: React.CSSProperties = {padding: `${SPACING.xs}px 0`, borderTop: `1px solid ${ADMIN_COLORS.divider}`};

interface TopVotersPanelProps {
  /** The votes in the range that pass the filter row. */
  votes: VoteLogRow[];
  selectedVoter: number | null;
  onToggleVoter: (voter: number) => void;
}

/**
 * Most active voters: the top six in the range, under the filters. Picking
 * one filters the page to that voter; picking them again clears the voter
 * filter.
 */
export function TopVotersPanel({votes, selectedVoter, onToggleVoter}: TopVotersPanelProps) {
  const voters = topVoters(votes, 6);
  const most = voters.at(0)?.count ?? 1;
  return (
    <Panel title="Most active voters">
      {voters.length === 0 ? (
        <p style={NOTE}>No voters match these filters.</p>
      ) : (
        <ul style={{listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: SPACING.xxs}}>
          {voters.map(({voter, count}) => (
            <li key={voter}>
              <button
                type="button"
                className="adm-row-btn"
                aria-pressed={voter === selectedVoter}
                aria-label={`#${voter}, ${countOf(count, 'vote')}`}
                onClick={() => onToggleVoter(voter)}>
                <span
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '48px minmax(0, 1fr) 40px',
                    alignItems: 'center',
                    gap: SPACING.sm,
                    width: '100%',
                    fontSize: ADMIN_TYPE.small,
                  }}>
                  <span style={{color: ADMIN_COLORS.muted, textAlign: 'left'}}>#{voter}</span>
                  <MeterBar fraction={count / most} color={ADMIN_COLORS.accent} />
                  <span style={{textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>{fmtInt(count)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** Most voted pairs: the top five in the range, under the filters, each with its average over scored votes. */
export function TopPairsPanel({votes}: {votes: VoteLogRow[]}) {
  const pairs = topPairs(votes, 5);
  return (
    <Panel title="Most voted pairs">
      {pairs.length === 0 ? (
        <p style={NOTE}>No pairs match these filters.</p>
      ) : (
        <table
          aria-label="Most voted pairs"
          style={{width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: ADMIN_TYPE.small}}>
          <thead>
            <tr>
              <th scope="col" style={{...HEAD, textAlign: 'left'}}>
                Pair
              </th>
              <th scope="col" style={{...HEAD, width: 48, textAlign: 'right'}}>
                Votes
              </th>
              <th scope="col" style={{...HEAD, width: 72, textAlign: 'right'}}>
                Average
              </th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((pair) => {
              const name = `${pair.aName} × ${pair.bName}`;
              return (
                <tr key={`${pair.a}:${pair.b}`}>
                  <td style={{...CELL, ...TRUNCATE}} title={name}>
                    {name}
                  </td>
                  <td style={{...CELL, textAlign: 'right', color: ADMIN_COLORS.muted, fontVariantNumeric: 'tabular-nums'}}>
                    {fmtInt(pair.count)}
                  </td>
                  <td style={{...CELL, textAlign: 'right'}}>
                    {/* One decimal, so the pill never prints a long fraction. */}
                    <ScorePill score={pair.avgScore === null ? null : Math.round(pair.avgScore * 10) / 10} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
```

- [ ] **Step 14: Write the view**

Create `src/tools/analytics/activity/ActivityView.tsx`:

```tsx
import {useState} from 'react';
import {SPACING} from '../../../app-bridge';
import {Notice} from '../../../ui/Notice';
import type {VoteLog} from '../voteLogTypes';
import {ActivityFilterBar} from './ActivityFilterBar';
import {ActivityKpiRow} from './ActivityKpiRow';
import {TopPairsPanel, TopVotersPanel} from './ActivitySidePanels';
import {LOG_PAGE_SIZE, VoteLogTable} from './VoteLogTable';
import {VotesPerDayChart} from './VotesPerDayChart';
import {bucketTitle} from './activityChart';
import {
  NO_FILTERS,
  activityWindow,
  chartStacks,
  filterVotes,
  votesInBucket,
  votesInRange,
  type ActivityFilters,
} from './activityModel';

interface ActivityViewProps {
  /** The vote-log artifact; `null` with no `error` while it loads. */
  voteLog: VoteLog | null;
  error?: Error | null;
}

/**
 * The Vote activity page body, as PageLayout's grid items. The range (R-9)
 * and the rest of the filter row narrow everything below them: the KPIs, the
 * chart, the log and the side panels. The bar picked in the chart narrows only
 * the vote log, so the rest keep their context. Every filter change starts the
 * log at its first page again.
 */
export function ActivityView({voteLog, error}: ActivityViewProps) {
  const [filters, setFilters] = useState<ActivityFilters>(NO_FILTERS);
  const [limit, setLimit] = useState(LOG_PAGE_SIZE);

  if (error) {
    return <Notice tone="error">Could not load the vote log. Has the artifact been generated? ({error.message})</Notice>;
  }
  if (!voteLog) return <Notice>Loading vote log...</Notice>;
  // The window counts back from the whole log's newest vote, so a filter never shifts the days on show.
  const span = activityWindow(voteLog.votes, filters.range);
  if (!span) {
    return (
      <Notice>
        No raw votes yet. Set the <code>SUPABASE_SERVICE_ROLE_KEY</code> Actions secret, then re-run admin&apos;s
        Deploy workflow.
      </Notice>
    );
  }

  const update = (patch: Partial<ActivityFilters>) => {
    const next = {...filters, ...patch};
    // A new range drops the picked bar: its day can fall outside the new window, and past 90 days the bars are weeks.
    if (next.range !== filters.range) next.day = null;
    setFilters(next);
    setLimit(LOG_PAGE_SIZE);
  };
  // Clear filters keeps the range: it is the window the page reads, not a filter inside it.
  const clear = () => update({...NO_FILTERS, range: filters.range});

  const base = filterVotes(votesInRange(voteLog.votes, span.startDay, span.endDay), {...filters, day: null});
  const {bucket, stacks} = chartStacks(base, span.startDay, span.endDay);
  const logVotes = filters.day === null ? base : votesInBucket(base, filters.day, bucket);

  return (
    <>
      <ActivityFilterBar filters={filters} voterCount={voteLog.voterCount} onChange={update} onClear={clear} />
      <ActivityKpiRow votes={base} voterCount={voteLog.voterCount} />
      <VotesPerDayChart
        stacks={stacks}
        bucket={bucket}
        startDay={span.startDay}
        endDay={span.endDay}
        selectedKey={filters.day}
        // A pick of the picked bar clears it, whether the kit hands back its key or null.
        onSelect={(key) => update({day: key === null || key === filters.day ? null : key})}
      />
      <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: SPACING.xl}}>
        <div style={{flex: '999 1 520px', minWidth: 0}}>
          <VoteLogTable
            votes={logVotes}
            limit={limit}
            pickedLabel={filters.day === null ? null : bucketTitle(filters.day, bucket)}
            voter={filters.voter}
            onShowMore={() => setLimit(limit + LOG_PAGE_SIZE)}
            onPickVoter={(voter) => update({voter})}
            // A bar's column can be under 24px wide (90 days, a phone), so the log offers the same pick
            // as a select: the equivalent control WCAG 2.5.8 allows. It shows a bar pick too.
            picker={
              <select
                className="adm-select"
                aria-label={bucket === 'day' ? 'Pick a day' : 'Pick a week'}
                value={filters.day ?? ''}
                onChange={(e) => update({day: e.target.value === '' ? null : e.target.value})}>
                <option value="">{bucket === 'day' ? 'All days' : 'All weeks'}</option>
                {stacks.map((stack) => (
                  <option key={stack.day} value={stack.day}>
                    {bucketTitle(stack.day, bucket)}
                  </option>
                ))}
              </select>
            }
          />
        </div>
        <div style={{flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: SPACING.xl}}>
          <TopVotersPanel
            votes={base}
            selectedVoter={filters.voter}
            onToggleVoter={(voter) => update({voter: filters.voter === voter ? null : voter})}
          />
          <TopPairsPanel votes={base} />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 15: Run the view tests and see them pass**

Run: `pnpm vitest run src/tools/analytics/activity/__tests__/ActivityView.test.tsx`
Expected: PASS (17 tests).

- [ ] **Step 16: Add the stories**

Create `src/tools/analytics/activity/ActivityView.stories.tsx`:

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {FONTS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import type {VoteLog, VoteLogRow} from '../voteLogTypes';
import {ActivityView} from './ActivityView';

const DAY_MS = 24 * 60 * 60 * 1000;

// Card ids in canonical order (a < b), as buildVoteLog writes them.
const PAIRS = [
  {a: '1012', b: '1388', aName: 'Elsa - Spirit of Winter', bName: 'Anna - Heir to Arendelle'},
  {a: '0441', b: '0902', aName: 'Maui - Hero to All', bName: 'Moana - Of Motunui'},
  {a: '0215', b: '0733', aName: 'Scar - Shameless Firebrand', bName: 'Simba - Returned King'},
  {a: '0118', b: '0264', aName: 'Belle - Strange but Special', bName: 'Beast - Hardheaded'},
  {a: '1530', b: '1702', aName: 'Ariel - Spectacular Singer', bName: 'Ursula - Power Hungry'},
  {a: '0377', b: '0391', aName: 'Stitch - Rock Star', bName: 'Lilo - Making a Wish'},
  {a: '0820', b: '1145', aName: 'Jafar - Wickedly Powerful', bName: 'Iago - Loud-Mouthed Parrot'},
  {a: '0602', b: '0658', aName: 'Mickey Mouse - Brave Little Tailor', bName: 'Goofy - Musketeer'},
];

/**
 * `days` days of sample votes ending Wed Sep 30 2026, newest first: quieter
 * weekends, a few empty days, about a third quick votes with no score, and most
 * carries left at the one-click default 'both'. A fixed-seed generator keeps
 * every render the same.
 */
function sampleLog(days: number): VoteLog {
  let seed = 20260930;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const start = Date.UTC(2026, 8, 30) - (days - 1) * DAY_MS;
  const votes: VoteLogRow[] = [];
  for (let d = 0; d < days; d++) {
    const weekday = new Date(start + d * DAY_MS).getUTCDay();
    const quiet = weekday === 0 || weekday === 6;
    const count = d % 17 === 5 ? 0 : 4 + Math.floor(next() * (quiet ? 12 : 40));
    for (let i = 0; i < count; i++) {
      const pair = PAIRS[Math.floor(next() * PAIRS.length)];
      const quick = next() < 0.35;
      votes.push({
        ...pair,
        score: quick ? null : 1 + Math.floor(next() * 10),
        accuracy: Math.floor(next() * 3) - 1,
        isReal: quick ? null : next() < 0.9,
        wouldPlay: quick ? null : next() < 0.6,
        difficulty: quick ? null : 1 + Math.floor(next() * 3),
        whoCarries: quick ? null : next() < 0.85 ? 'both' : (['a', 'b', 'neither'] as const)[Math.floor(next() * 3)],
        ts: new Date(start + d * DAY_MS + Math.floor(next() * DAY_MS)).toISOString(),
        voter: 1 + Math.floor(next() ** 2 * 40),
      });
    }
  }
  votes.sort((x, y) => (x.ts < y.ts ? 1 : x.ts > y.ts ? -1 : 0));
  return {generatedAt: '2026-10-01T04:00:00.000Z', votes, voterCount: 40};
}

/** Ten weeks, Jul 23 to Sep 30: every range charts per day. */
const LOG = sampleLog(70);
/** Six months, Apr 2 to Sep 30: All runs past 90 days, so it charts per week. */
const HALF_YEAR = sampleLog(182);

const meta: Meta<typeof ActivityView> = {
  title: 'Admin/Insights/Vote activity',
  component: ActivityView,
  tags: ['autodocs'],
  // ActivityView renders PageLayout's body: a one-column grid. .storybook/preview.tsx mounts AdminStyles.
  decorators: [
    (Story) => (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          alignContent: 'start',
          gap: SPACING.xl,
          padding: `${SPACING.xxl}px ${SPACING.xxxl}px`,
          minHeight: '100vh',
          background: ADMIN_COLORS.page,
          color: ADMIN_COLORS.text,
          fontFamily: FONTS.body,
        }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

/** Opens on the last 30 days; 90 days and All still chart per day. */
export const Default: Story = {args: {voteLog: LOG}};

/** Pick All: the range runs past 90 days, so the chart switches to weeks ("Week of Mar 30" first). */
export const HalfYear: Story = {args: {voteLog: HALF_YEAR}};

/** Three days of votes: every range starts at the oldest vote, so the chart has three bars. */
export const FewDays: Story = {
  args: {voteLog: {...LOG, votes: LOG.votes.filter((v) => v.ts >= '2026-09-28')}},
};

export const Loading: Story = {args: {voteLog: null}};

export const LoadError: Story = {
  args: {voteLog: null, error: new Error('vote-log.json has not been generated yet')},
};

/** What a Deploy without SUPABASE_SERVICE_ROLE_KEY writes. */
export const NoRawVotes: Story = {
  args: {voteLog: {generatedAt: '2026-10-01T04:00:00.000Z', votes: [], voterCount: 0}},
};
```

Run `pnpm storybook` and open **Admin/Insights/Vote activity**. Check these:
- Default opens on **30 days**: 30 bars, Sep 1 – Sep 30, labelled every 7th day back from the newest (Sep 2, 9, 16, 23 and 30).
- Only the newest bar and the busiest bar print a total, and no label collides with another.
- Hovering a bar, or Tab to the chart and ←/→, shows one tooltip: "Wed Sep 30", then votes, the four bands with line keys, then voters. Only the keys carry band colour.
- The legend shows the four bands, and No score is hatched in the legend and in the bars.
- Empty days stay pickable. Picking a bar marks it and dims the others, and the log narrows to it. Picking it again clears it.
- The log's "Pick a day" select makes the same pick, follows a bar pick, and "All days" clears it. On HalfYear's **All** it reads "Pick a week", and the first and last weeks' tooltips say "(from …)" and "(to Sep 30)".
- **Table** shows the same numbers as the chart.
- **7 days**, **90 days** and **All** re-scope the KPIs, the chart, the log and both side panels, and drop a picked bar.
- HalfYear: **All** switches to "Votes per week", with "Week of Mar 30" first. Picking a week narrows the log to it, and the log's summary names the week.
- FewDays shows three bars whatever the range.
- "Clear filters" keeps the range.
- Tab reaches the range, the chart, every segment, voter row and `#N`, each with a visible focus ring. Picking a `#N` with Enter leaves focus on it.
- With reduced motion on, a range change swaps the bars without a transition.
- The a11y panel reports no violations.

- [ ] **Step 17: Lint, typecheck and commit**

Run: `pnpm lint`. Expected: no errors.
Run: `pnpm typecheck`. Expected: exit 0.
Run with the Bash tool, only after the owner approves:
```bash
git add src/tools/analytics/activity/activityChart.ts src/tools/analytics/activity/VotesPerDayChart.tsx src/tools/analytics/activity/VoteLogTable.tsx src/tools/analytics/activity/ActivityFilterBar.tsx src/tools/analytics/activity/ActivityKpiRow.tsx src/tools/analytics/activity/ActivitySidePanels.tsx src/tools/analytics/activity/ActivityView.tsx src/tools/analytics/activity/ActivityView.stories.tsx src/tools/analytics/activity/__tests__/activityChart.test.ts src/tools/analytics/activity/__tests__/VotesPerDayChart.test.tsx src/tools/analytics/activity/__tests__/VoteLogTable.test.tsx src/tools/analytics/activity/__tests__/ActivityView.test.tsx src/theme/__tests__/adminTheme.test.ts
USER_APPROVED=1 git commit -m "feat(analytics): build the Vote activity view (#24)"
```

- [ ] **Step 18: Write the failing page test**

Create `src/tools/analytics/activity/__tests__/ActivityPage.test.tsx`:

```tsx
import {afterEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {ActivityPage} from '../ActivityPage';

const json = (body: unknown) => new Response(JSON.stringify(body), {headers: {'content-type': 'application/json'}});

const LOG = {
  generatedAt: '2026-10-01T04:00:00Z',
  voterCount: 1,
  votes: [
    {
      a: '1',
      b: '2',
      aName: 'Elsa',
      bName: 'Anna',
      score: 8,
      accuracy: null,
      isReal: null,
      wouldPlay: null,
      difficulty: null,
      whoCarries: 'both',
      ts: '2026-09-30T18:05:00Z',
      voter: 1,
    },
  ],
};

// src/test/setup.ts empties the artifact cache before every test, so each test fetches afresh.
afterEach(() => vi.unstubAllGlobals());

function renderPage() {
  render(
    <MemoryRouter>
      <ActivityPage />
    </MemoryRouter>,
  );
}

describe('ActivityPage', () => {
  it('loads the vote log and names the day it was built', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(LOG)));
    renderPage();

    expect(screen.getByRole('heading', {name: 'Vote activity'})).toBeInTheDocument();
    expect(screen.getByText('Raw community votes, from the last 7 days to the whole log.')).toBeInTheDocument();
    expect(screen.getByText('Loading vote log...')).toBeInTheDocument();
    expect(await screen.findByText('2026-10-01')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', {name: 'Search pairs'})).toBeInTheDocument();
  });

  it('names the file when the vote log fails to load', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', {status: 404})));
    renderPage();

    expect(
      await screen.findByText('Could not load the vote log. Has the artifact been generated? (vote-log.json: HTTP 404)'),
    ).toBeInTheDocument();
  });
});
```

Run: `pnpm vitest run src/tools/analytics/activity/__tests__/ActivityPage.test.tsx`
Expected: FAIL with `Failed to resolve import "../ActivityPage"`.

- [ ] **Step 19: Write the page**

Create `src/tools/analytics/activity/ActivityPage.tsx`:

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

/**
 * Vote activity (/activity): the raw votes in vote-log.json, filterable by
 * range, pair, voter, score band and day or week. It reads the vote log alone,
 * so its loading and error states name that file; vote-analytics.json isn't
 * needed here.
 */
export function ActivityPage() {
  const {data, error} = useVoteLog();
  return (
    <PageLayout
      title="Vote activity"
      subtitle="Raw community votes, from the last 7 days to the whole log."
      meta={data ? <DataAsOf generatedAt={data.generatedAt} /> : undefined}>
      <ActivityView voteLog={data} error={error} />
    </PageLayout>
  );
}
```

Run: `pnpm vitest run src/tools/analytics/activity/__tests__/ActivityPage.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 20: Write the failing route test**

In `src/router.test.tsx`, inside `describe('admin routes', …)`, directly after its last test, R1-6's:

```tsx
  it('keeps the sidebar collapsed across reloads', async () => {
    const first = renderAt('/analytics');
    await userEvent.click(screen.getByRole('button', {name: 'Collapse sidebar'}));
    first.unmount();

    renderAt('/analytics');
    expect(screen.getByRole('button', {name: 'Expand sidebar'})).toHaveAttribute('aria-expanded', 'false');
    expect(sidebarNav().getByRole('link', {name: 'Analytics'})).toHaveAttribute('title', 'Analytics');
  });
```

add, before the `describe`'s closing `});`:

```tsx

  it('opens vote activity at /activity, marked current in the sidebar', () => {
    renderAt('/activity');
    expect(screen.getByRole('heading', {name: 'Vote activity'})).toBeInTheDocument();
    // The file's fetch stub never settles, so the page waits on the vote log.
    expect(screen.getByText('Loading vote log...')).toBeInTheDocument();
    expect(sidebarNav().getByRole('link', {name: /Vote activity/})).toHaveAttribute('aria-current', 'page');
  });
```

Run: `pnpm vitest run src/router.test.tsx`
Expected: FAIL in `opens vote activity at /activity…`. `/activity` falls through to `NotFound`, so the error is `Unable to find an accessible element with the role "heading" and name "Vote activity"`.

- [ ] **Step 21: Add the route and the sidebar item**

In `src/router.tsx`, replace:

```tsx
import {AnalyticsPage} from './tools/analytics/AnalyticsPage';
```

with:

```tsx
import {AnalyticsPage} from './tools/analytics/AnalyticsPage';
import {ActivityPage} from './tools/analytics/activity/ActivityPage';
```

and replace:

```tsx
      {path: 'analytics', element: <AnalyticsPage />},
```

with:

```tsx
      {path: 'activity', element: <ActivityPage />},
      {path: 'analytics', element: <AnalyticsPage />},
```

In `src/shell/nav.ts`, inside `NAV_ITEMS`, replace R1-6's analytics entry:

```ts
  {id: 'analytics', label: 'Analytics', mark: 'An', path: '/analytics', group: 'insights', writes: false},
```

with:

```ts
  {id: 'analytics', label: 'Analytics', mark: 'An', path: '/analytics', group: 'insights', writes: false},
  {id: 'activity', label: 'Vote activity', mark: 'Ac', path: '/activity', group: 'insights', writes: false},
```

This keeps the Insights group in sidebar order: Analytics (Calibration & tuning from R1-11), Vote activity, then Web analytics once R1-10 lands. R1-11 Step 15 swaps the analytics line in place. `writes: false` keeps the branch notice and the token box off this page (R-4). The router test in Step 20 covers the new item's link and `aria-current`.

R1-6's `src/shell/Sidebar.test.tsx` pins the Insights links in order, so it gains the new one. In its `lists the pages under their group labels` test, replace:

```tsx
    expect(hrefs('Insights')).toEqual(['/analytics']);
```

with:

```tsx
    expect(hrefs('Insights')).toEqual(['/analytics', '/activity']);
```

Its `nav.test.ts` needs no change: it checks `navItemFor` and `isWritePath` per path, that ids and paths are unique, and that every mark is two letters (`Ac` is).

Run: `pnpm vitest run src/router.test.tsx src/shell src/tools/analytics/activity`
Expected: PASS.

- [ ] **Step 22: Full check and commit**

Run: `pnpm lint`. Expected: no errors.
Run: `pnpm typecheck`. Expected: exit 0.
Run: `pnpm test:run`. Expected: all tests pass. The old `ActivityView`/`DayGroup` tests still pass, because nothing they use changed.

Run with the Bash tool, only after the owner approves:
```bash
git add src/tools/analytics/activity/ActivityPage.tsx src/tools/analytics/activity/__tests__/ActivityPage.test.tsx src/router.tsx src/router.test.tsx src/shell/nav.ts src/shell/Sidebar.test.tsx
USER_APPROVED=1 git commit -m "feat(shell): add Vote activity at /activity (#24)"
```

<!-- note 5: Step 21's nav "before" is R1-6 Step 3's analytics line, copied from R1-6's draft; R1-11 Step 15 swaps that line for calibration. -->
<!-- Revision for R-9 and the chart kit (2026-10-01): every code block was linted from stdin and passed eslint. The model, chart-part, chart, log-table, view and page tests (112) also ran green in a scratch copy outside the repo, against stubs written from the contract's "Chart kit (R1-3b)" block; the scratch copy was then removed. -->
<!-- Review round 2026-10-01 (9 notes): all applied, none rejected. Verified against R1-08's and R1-10's "ChartFrame draws no card surface" readings and R1-08's untitled-Panel WeeklyChart, R1-02's chartMarks comment ("sit in a Panel") and its adm-select height (38px), R1-03's Panel (no title: no heading, no name), R1-06's sidebarNav helper and GUTTER, and R1-12 Step 18's minHit stop. Note 2 took fix (a), the "Pick a day" select; R1-12 Step 18 still needs the change in "For R1-12" above, which this file can't make. Choices beyond the notes: the select's name follows the bucket ("Pick a week" for weekly bars, as its first option already did). The week subtitle's part-week clause is computed (chartSubtitle, tested) rather than always appended, because a window that starts on a Monday or ends on a Sunday has whole end weeks. The existing chartTable week test took the clipped row names rather than a second test with the same arguments, which would have contradicted it, and bucketTitle got its own clipped-week test. tooltipFor takes startDay and endDay as required, like chartTable. Re-verified: every changed block passes eslint --stdin; a fresh scratch copy against the reviewer's contract stubs passes tsc (strict) and 116 tests (63 + 24 + 4 + 6 + 17 + 2). -->
