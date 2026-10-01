> Part of [R: Admin redesign](../R-redesign.md). Read its decisions, corrections to the spec, global constraints and shared interfaces first.

**Contract additions** (these only add names or state assumptions; no contract item is renamed)

- `src/tools/analytics/verdict.ts` is a new shared module. It exports `CALIBRATION_BAND`, `SCALE_CLAMP`, `interface Verdict`, `verdictFor(meanGap: number | null): Verdict` and `scalePercent(meanGap: number | null): number | null`. `VerdictHero` and the Overview both use it.
- `src/tools/analytics/overview/overviewStats.ts` also exports `MIN_RULE_VOTES = 10`. It is the default for `rulesToReview`'s `minVotes`, and the Rules to review empty state quotes it.
- `overviewStats.ts` also exports `weeksThatFit(width: number): number`, the number of week columns the Weekly activity card shows at a measured plot width: the card's frame less `BAR_Y_AXIS_WIDTH` and BarChart's 8px right pad. It lives there, not in `WeeklyCard.tsx`, so the component file exports only components (`react-refresh/only-export-components`).
- **For R1-3b to export:** `src/charts/BarChart.tsx` also exports `BAR_Y_AXIS_WIDTH: number`, the fixed px its y tick labels take left of the plot (0 if the ticks sit inside the plot, above their gridlines). A plain numeric constant beside the component passes `react-refresh/only-export-components`, which `eslint.config.js` sets to `allowConstantExport: true`. `WeeklyCard` subtracts it before `weeksThatFit`, because `weeksThatFit` counts slots across the plot, not the frame. At the two-up breakpoint (780px of content) the frame is 338px. Less the 40px gutter and the 8px pad, its 290px plot holds 6 slots of 48.3px, each wide enough for "Sep 28" and the gap under it (44px).
- `overviewStats.ts` also exports `WEEKS_SHOWN = 12`, R-9's window. The weekly card's table view holds the whole window, and its chart shows the newest `weeksThatFit(width)` weeks of it.
- **R1-8 runs after R1-3b.** The weekly card is built on the chart kit (`src/charts/`): `ChartFrame`, `BarChart` and their types, exactly as the plan's "Chart kit (R1-3b)" contract names them. The tests rely on these readings of that contract. If R1-3b ships something different, change only the matching test lines:
  - Without `onSelect`, `BarChart`'s plot is `useChartCursor`'s `role="slider"`, named by `ariaLabel`. Its `aria-valuetext` at a position is the tooltip's text: the title, then each row's value and label.
  - `BarChart` renders its plot (the slider and its bars) before its first measurement, as in jsdom, where `useContainerWidth` stays 0. `OverviewView.test.tsx` relies on this: its weekly test finds the slider with no width stubbed.
  - Home, End, ← and → move the cursor, a pointer move over the plot sets it, and leaving the plot clears it. A pointer move maps to a position even when the plot's rect is all zeros (jsdom). The cursor starts empty, so no tooltip shows before the first move.
  - While the cursor is empty, the slider still carries `aria-valuenow` (the newest position) and its `aria-valuetext`. Only the visual tooltip waits for a move. `role="slider"` requires `aria-valuenow`, and Step 37's a11y check runs axe's `aria-required-attr` on the plot.
  - `ChartTooltip` renders its title and then each row, value first and label second, as text inside one `aria-hidden` root.
  - `ChartFrame`'s toggle is two buttons named "Chart" and "Table". The table view is a `<table>` whose `<caption>` is `table.caption`, with one header row of `table.columns`.
  - `ChartFrame` renders `title` as an `<h2>`, `Panel`'s heading level, inside its figcaption. The card's notice and empty states title an `<h2>` through `Panel`, so Weekly activity is reachable by heading in every state. If R1-3b's title isn't a heading, ask R1-3b for a heading-level addition rather than ship the card without one: this reading is the one exception to "change only the matching test lines".
  - `ChartFrame` draws no card surface. It is the figure inside a card, so the weekly card keeps an untitled `Panel` as its surface, and `ChartFrame`'s title is the card's title. If R1-3b's frame draws its own surface, drop that `Panel` in `WeeklyChart` (the card's chart branch) only, and keep the footnote under the frame.
- **For R1-3b (not a contract change):** the accent is a new chart fill, on the `emphasisKey` bar. R1-2's rule is "A chart that adds a fill adds a line to `chartMarks`", and `emphasisKey`'s colour belongs to the kit, so R1-2's `chartMarks` 3:1 check gains `'Emphasis bar (accent)'`, which R1-3b Step 17 adds.
- **For R1-12 (not a contract change):** R1-12 Step 17's census reads this card as `plot: 'slider'`, `positions` = the bars charted (`weeksThatFit`), and `tableRows` = the whole `WEEKS_SHOWN` window, which can exceed `positions` on a narrow card. Keep the two in step.
- **Assumption about import paths:** each primitive is in its own file at `src/ui/<Name>.tsx` (`Panel`, `KpiCard`, `BiasBar`, `ScorePill`, `RawTag`, `Notice`). If the primitives task ships them another way, change only those import lines.
- **Assumption about `PageLayout`:** as R1-6 writes it, `PageLayout` renders `title` as the page's only `<h1>`. The page test and the router tests query `heading` level 1.
- **Assumption about R1-6 and R1-11:**
  - R1-6 leaves `NAV_ITEMS` without an Overview entry. Its entries are `analytics`, `tuning`, `reveal` and `image`, and its index route redirects `/` to `/analytics`.
  - This task adds the entry and takes the index route.
  - `/analytics` keeps the old page until R1-11 redirects it to `/`.
- **Assumption about the test cache reset:** R1-5's `src/test/setup.ts` empties the artifact cache before every test, so these tests don't reset it themselves.

### Task R1-8: Overview page

The Overview replaces the interim redirect at `/`. It has three rows:
- five KPI cards;
- Engine calibration and Weekly activity, side by side;
- Rules to review, Latest votes and Web events, in a row of three.

Each card reads its own artifact and shows that artifact's own loading, error and empty states. So if `vote-analytics.json` is missing, only the cards built from it disappear (KPIs, calibration, weekly, rules). Latest votes and Web events still show (review: overview-vercel-states, vote-log-states).

These choices settle points the spec leaves open:
- **Rules to review** ranks only rules that have a gap and at least 10 score votes. The widest |gap| comes first, and a tie goes to the rule with more votes ("Corrections to the spec").
- **Tune link.** "Tune" links to `/calibration?rule=<ruleId>`, using the analytics rule id. R1-11's Calibration page opens with that rule selected. R2's page maps the id to the rule's `tuning.json` entry.
- **Weekly window.** The weekly chart covers the last 12 weeks (R-9).
  - It shows as many of those weeks as fit at 44px a slot (a 40px column and 4px of air), newest last, and never scrolls.
  - A week without votes gets an empty column instead of being skipped.
  - The table view holds all 12 weeks, the ones a narrow card leaves out of the chart included. A table has no width to run out of.
- **Weekly chart on the kit (R-12).** The card is a `ChartFrame` around a single-series `BarChart`. The earlier draft's hand-drawn columns, per-column `title` tooltips and `role="img"` name are gone.
  - **Emphasis.** The newest week is the `emphasisKey` bar, in the accent, and the rest are neutral. The handoff drew the last bar gold, so the look stays.
  - **Gap line.** `subLabel` prints the week's mean gap under its date, through `fmtGap` and in `gapColor`, as status text. A gap that rounds to "0.00" prints muted, as an exact 0 does: `gapColor` alone would print a −0.004 week's "0.00" in the over-rates red. A week without score votes prints nothing there, and its tooltip and table row read "—". The gap is a second measure on another scale, so it rides as a label and never as a second axis.
  - **Tooltip.** Hover, or the keyboard on the focused plot, shows "Week of Sep 28" over two rows: Votes, and Mean gap. The plot's `aria-valuetext` reads the same text.
  - **Table.** The Chart | Table toggle shows Week, Votes and Mean gap for every week of the window.
- **Cap labels stay on `'extremes'` at every width.** The last bar and the busiest bar print their totals, and `'all'` is not used even at six bars or fewer. Three reasons:
  - `subLabel` already puts one number under every column. A count on every cap would make two per column, and the `dataviz` guidance labels selectively, never every point.
  - The extremes are the two counts the card is for: this week and the record week. The y ticks, the tooltip and the table carry the rest.
  - The rule shouldn't change as the window is resized. Six bars or fewer means a very narrow card or a young log, and there the two extremes already label a third of the bars or more.

  This departs from the handoff's "vote count above each", because R-12 asks for selective direct labels.
- **Verdict word.** The verdict word is marked by colour only. The app ships no italic Tinos face and sets `font-synthesis: none`, so an italic would render upright anyway (review: tinos-italic).
- **Dropped copy.** Two prototype-only items are left out: "Weekly gap trend" and "next build 04:00 UTC" (review: prototype-only-overview-copy). The weekly gap trend comes back in R2, as a chart on Calibration (R-13).
- **Raw-votes notice.** The weekly card's notice uses `RawVotesNotice`'s copy without "dimension participation", which isn't on this page (review: tray-and-notice-polish).
- **Links ahead of their routes.** Three cards link to routes that later R1 tasks add:
  - "Open calibration →" and the Tune links go to `/calibration` (R1-11).
  - "Open activity →" goes to `/activity` (R1-9).
  - "Open web analytics →" goes to `/web` (R1-10).
  - Until each route lands, its link opens NotFound, inside the same phase PR.
- **No hover on panel links.** `PanelLink` is an inline-styled router `Link` with no hover colour, because the contract has no `adm-link` class. Its focus ring comes from the global `:focus-visible`.

**Files:**
- Create: `src/tools/analytics/verdict.ts`
- Create: `src/tools/analytics/__tests__/verdict.test.ts`
- Modify: `src/tools/analytics/VerdictHero.tsx`:
  - the imports, lines 1–2
  - delete lines 11–38
  - `GapScale`'s JSDoc and body, lines 40–54
- Create: `src/tools/analytics/overview/overviewStats.ts`
- Create: `src/tools/analytics/overview/__tests__/overviewStats.test.ts`
- Create: `src/tools/analytics/overview/overviewFixtures.ts`
- Create: `src/tools/analytics/overview/PanelLink.tsx`
- Create: `src/tools/analytics/overview/OverviewKpis.tsx`
- Create: `src/tools/analytics/overview/CalibrationCard.tsx`
- Create: `src/tools/analytics/overview/WeeklyCard.tsx`
- Create: `src/tools/analytics/overview/RulesToReviewCard.tsx`
- Create: `src/tools/analytics/overview/LatestVotesCard.tsx`
- Create: `src/tools/analytics/overview/WebEventsCard.tsx`
- Create: `src/tools/analytics/overview/OverviewView.tsx`
- Create: `src/tools/analytics/overview/OverviewPage.tsx`
- Create: `src/tools/analytics/overview/__tests__/OverviewView.test.tsx`
- Create: `src/tools/analytics/overview/__tests__/WeeklyCard.test.tsx`
- Create: `src/tools/analytics/overview/__tests__/OverviewPage.test.tsx`
- Create: `src/tools/analytics/overview/OverviewView.stories.tsx`
- Modify: `src/shell/nav.ts` (one entry at the head of `NAV_ITEMS`)
- Modify: `src/router.tsx` (the react-router import, the page imports, the index route)
- Test: `src/router.test.tsx`:
  - the `./shell/nav` import
  - R1-6's `sends / to analytics until the Overview exists` test
  - one appended `describe`

**Interfaces:**
- Consumes:
  - From `src/theme/adminTheme.ts`:
    - `ADMIN_COLORS`: `page`, `text`, `muted`, `accent`, `accentTint`, `barTrack`, `barNeutral`, `divider`
    - `ADMIN_TYPE`: `label`, `small`, `body`, `sectionTitle`, `hero`
    - `ADMIN_RADIUS`: `tag`, `control`
  - Bridged: `COLORS`, `FONTS`, `SPACING`, `TRUNCATE`, `hexRgba`, `useContainerWidth`.
  - `fmtInt`, `fmtGap`, `fmtDay` from `src/ui/format.ts`.
  - `Panel`, `KpiCard`, `BiasBar`, `ScorePill`, `RawTag`, `Notice` from `src/ui/`.
  - The chart kit from R1-3b, read as Contract additions describes:
    - `ChartFrame` and `type ChartTable` from `src/charts/ChartFrame.tsx`
    - `BarChart`, `type BarDatum` and `BAR_Y_AXIS_WIDTH` (a Contract addition) from `src/charts/BarChart.tsx`, with its `capLabels`, `emphasisKey`, `subLabel`, `tooltip` and `valueFormat` props
    - `type TooltipContent` from `src/charts/ChartTooltip.tsx`
    - `type SeriesDef` from `src/charts/series.ts`
  - `PageLayout` from `src/shell/PageLayout.tsx` (R1-6).
  - `NAV_ITEMS`, `navItemFor`, `isWritePath` from `src/shell/nav.ts`, plus R1-6's `src/router.tsx` and `src/router.test.tsx`.
  - `useVoteAnalytics`, `useVoteLog` and `useVercelAnalytics`, over R1-5's per-session cache. Their API is unchanged, and `src/test/setup.ts` empties the cache before every test.
  - Existing modules: `biasCopy`, `gapColor`, `latestVoteDay` (`activityStats.ts`), and the three artifact type modules.
  - Routes the cards link to: `/calibration` (R1-11), `/activity` (R1-9), `/web` (R1-10).
- Produces:
  - `verdict.ts`, as listed in Contract additions.
  - `overviewStats.ts`: `trackedEventsTotal`, `rulesToReview`, `latestVotes` and `recentWeeks` (the contract), plus `MIN_RULE_VOTES`, `WEEKS_SHOWN` and `weeksThatFit`. `recentWeeks` fills in weeks that have no votes.
  - `OverviewView` and `export interface OverviewViewProps`. The props are the task's own, plus an optional `voteLogError?: Error | null`.
  - `OverviewPage`, the route element for `/`.
  - `NAV_ITEMS[0]` = `{id: 'overview', label: 'Overview', mark: 'Ov', path: '/', group: 'main', writes: false}`.
  - The link format `/calibration?rule=<ruleId>`, which R1-11's Calibration page reads.

---

- [ ] **Step 1: Write the failing verdict test**

Create `src/tools/analytics/__tests__/verdict.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {COLORS} from '../../../app-bridge';
import {CALIBRATION_BAND, scalePercent, verdictFor} from '../verdict';

describe('verdictFor', () => {
  it('has no verdict without a gap', () => {
    expect(verdictFor(null)).toEqual({word: 'not enough data', wordColor: COLORS.textMuted, numberColor: COLORS.textMuted});
  });

  it('reads well-calibrated inside the band, with a neutral number', () => {
    for (const gap of [-0.49, -0.3, 0, 0.3, 0.49]) {
      expect(verdictFor(gap)).toEqual({word: 'well-calibrated', wordColor: COLORS.success, numberColor: COLORS.textMuted});
    }
  });

  it('runs generous from the band edge down, all in the over-rates colour', () => {
    expect(verdictFor(-CALIBRATION_BAND)).toEqual({word: 'runs generous', wordColor: COLORS.error, numberColor: COLORS.error});
    expect(verdictFor(-0.93).word).toBe('runs generous');
  });

  it('runs harsh from the band edge up, all in the under-rates colour', () => {
    expect(verdictFor(CALIBRATION_BAND)).toEqual({word: 'runs harsh', wordColor: COLORS.success, numberColor: COLORS.success});
    expect(verdictFor(0.7).word).toBe('runs harsh');
  });
});

describe('scalePercent', () => {
  it('has no position without a gap', () => {
    expect(scalePercent(null)).toBeNull();
  });

  it('centres no gap and scales linearly out to the clamp', () => {
    expect(scalePercent(0)).toBe(50);
    expect(scalePercent(0.75)).toBe(75);
    expect(scalePercent(-1.5)).toBe(0);
  });

  it('pins gaps beyond the clamp to the ends', () => {
    expect(scalePercent(2.44)).toBe(100);
    expect(scalePercent(-3)).toBe(0);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/tools/analytics/__tests__/verdict.test.ts`
Expected: FAIL with `Failed to resolve import "../verdict" from "src/tools/analytics/__tests__/verdict.test.ts"`.

- [ ] **Step 3: Create the shared verdict module**

Create `src/tools/analytics/verdict.ts`. It holds `VerdictHero`'s band, clamp and verdict logic unchanged, plus the dot position:

```ts
import {COLORS} from '../../app-bridge';

/** Within this magnitude the engine reads as well-calibrated; a small lean is noted in the read line, not the headline. */
export const CALIBRATION_BAND = 0.5;
/** meanGap is clamped to +/- this before positioning the scale dot. */
export const SCALE_CLAMP = 1.5;

export interface Verdict {
  word: string;
  wordColor: string;
  numberColor: string;
}

/**
 * One band drives the verb, number, and dot, so they never contradict each
 * other. Within +/-CALIBRATION_BAND the engine is "well-calibrated" (green verb,
 * neutral-toned number/dot); beyond it the verb, number, and dot all take the
 * over-rates (error) or under-rates (success) color together. The read line
 * (biasCopy) is finer on purpose: it names a lean from +/-0.25, so a -0.3 gap
 * reads "well-calibrated" with the lean noted underneath (the SlightLean story).
 * VerdictHero and the Overview's calibration card both read it.
 */
export function verdictFor(meanGap: number | null): Verdict {
  if (meanGap == null) return {word: 'not enough data', wordColor: COLORS.textMuted, numberColor: COLORS.textMuted};
  if (Math.abs(meanGap) < CALIBRATION_BAND) {
    return {word: 'well-calibrated', wordColor: COLORS.success, numberColor: COLORS.textMuted};
  }
  const dirColor = meanGap < 0 ? COLORS.error : COLORS.success;
  return {word: meanGap < 0 ? 'runs generous' : 'runs harsh', wordColor: dirColor, numberColor: dirColor};
}

/**
 * Where the scale's dot sits, as a percentage of the track from its
 * over-rates end: 50 at no gap, the ends at +/-SCALE_CLAMP and beyond. Null
 * when there is no gap to mark.
 */
export function scalePercent(meanGap: number | null): number | null {
  if (meanGap == null) return null;
  const clamped = Math.max(-SCALE_CLAMP, Math.min(SCALE_CLAMP, meanGap));
  return 50 + (clamped / SCALE_CLAMP) * 50;
}
```

- [ ] **Step 4: Point VerdictHero at the shared module**

In `src/tools/analytics/VerdictHero.tsx`, make these four edits.

First, lines 1–2. Before:

```tsx
import {CAP_LABEL_XS, COLORS, FONTS, FONT_SIZES, LETTER_SPACING, RADIUS, SPACING} from '../../app-bridge';
import {biasCopy} from './biasCopy';
```

After:

```tsx
import {CAP_LABEL_XS, COLORS, FONTS, FONT_SIZES, LETTER_SPACING, RADIUS, SPACING} from '../../app-bridge';
import {biasCopy} from './biasCopy';
import {scalePercent, verdictFor} from './verdict';
```

Second, delete lines 11–38, including the blank line after the closing brace. That code now lives in `verdict.ts`:

```tsx
/** Within this magnitude the engine reads as well-calibrated; a small lean is noted in the read line, not the headline. */
const CALIBRATION_BAND = 0.5;
/** meanGap is clamped to +/- this before positioning the scale dot. */
const SCALE_CLAMP = 1.5;

interface Verdict {
  word: string;
  wordColor: string;
  numberColor: string;
}

/**
 * One band drives the verb, number, and dot, so they never contradict each
 * other. Within +/-CALIBRATION_BAND the engine is "well-calibrated" (green verb,
 * neutral-toned number/dot); beyond it the verb, number, and dot all take the
 * over-rates (error) or under-rates (success) color together. The read line
 * (biasCopy) is finer on purpose: it names a lean from +/-0.25, so a -0.3 gap
 * reads "well-calibrated" with the lean noted underneath (the SlightLean story).
 */
function verdictFor(meanGap: number | null): Verdict {
  if (meanGap == null) return {word: 'not enough data', wordColor: COLORS.textMuted, numberColor: COLORS.textMuted};
  if (Math.abs(meanGap) < CALIBRATION_BAND) {
    return {word: 'well-calibrated', wordColor: COLORS.success, numberColor: COLORS.textMuted};
  }
  const dirColor = meanGap < 0 ? COLORS.error : COLORS.success;
  return {word: meanGap < 0 ? 'runs generous' : 'runs harsh', wordColor: dirColor, numberColor: dirColor};
}

```

Third, `GapScale`'s JSDoc (old lines 40–41), which names the deleted constant. Before:

```tsx
 * The diverging over/under scale. The dot marks meanGap, clamped to
 * +/-SCALE_CLAMP points, and is left out when there is no gap to mark.
```

After:

```tsx
 * The diverging over/under scale. The dot marks meanGap (positioned by
 * scalePercent) and is left out when there is no gap to mark.
```

Fourth, `GapScale`'s body (old lines 43–54). Before:

```tsx
function GapScale({meanGap, color}: {meanGap: number | null; color: string}) {
  const clamped = meanGap == null ? null : Math.max(-SCALE_CLAMP, Math.min(SCALE_CLAMP, meanGap));
```

After:

```tsx
function GapScale({meanGap, color}: {meanGap: number | null; color: string}) {
  const dot = scalePercent(meanGap);
```

Before:

```tsx
        {clamped != null && (
          <div
            style={{
              position: 'absolute',
              left: `${50 + (clamped / SCALE_CLAMP) * 50}%`,
```

After:

```tsx
        {dot != null && (
          <div
            style={{
              position: 'absolute',
              left: `${dot}%`,
```

The rest of `VerdictHero.tsx` stays as it is, and it still uses `COLORS`. The edited file passes `eslint` as written.

- [ ] **Step 5: Run the verdict and VerdictHero tests**

Run: `pnpm vitest run src/tools/analytics/__tests__/verdict.test.ts src/tools/analytics/__tests__/VerdictHero.test.tsx`
Expected: PASS (7 tests in `verdict.test.ts`, 1 in `VerdictHero.test.tsx`).

- [ ] **Step 6: Commit** (run with the Bash tool, only after the owner approves)

```bash
git add src/tools/analytics/verdict.ts src/tools/analytics/__tests__/verdict.test.ts src/tools/analytics/VerdictHero.tsx
USER_APPROVED=1 git commit -m "refactor(analytics): share the calibration verdict in verdict.ts (#24)"
```

- [ ] **Step 7: Write the failing overviewStats test**

Create `src/tools/analytics/overview/__tests__/overviewStats.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {latestVotes, recentWeeks, rulesToReview, trackedEventsTotal, weeksThatFit} from '../overviewStats';
import type {RuleStat, WeeklyPoint} from '../../voteAnalyticsTypes';
import type {VoteLogRow} from '../../voteLogTypes';
import type {VercelAnalytics, VercelEvent} from '../../vercelAnalyticsTypes';

function rule(ruleId: string, scoreVotes: number, meanGap: number | null): RuleStat {
  return {
    ruleId,
    ruleName: ruleId,
    category: 'playstyle',
    scoreVotes,
    pairsVoted: 1,
    meanGap,
    accuracySentiment: null,
    pairsCovered: 0,
  };
}

function vote(ts: string, score: number | null = 5): VoteLogRow {
  return {
    a: '1',
    b: '2',
    aName: 'Card A',
    bName: 'Card B',
    score,
    accuracy: null,
    isReal: null,
    wouldPlay: null,
    difficulty: null,
    whoCarries: null,
    ts,
    voter: 1,
  };
}

function event(name: string, total: number): VercelEvent {
  return {name, label: name, total, visitors: 1, trend: [], breakdowns: []};
}

function vercel(overrides: Partial<VercelAnalytics> = {}): VercelAnalytics {
  return {
    generatedAt: '2026-09-30T00:00:00Z',
    hasVercelData: true,
    reportingWindow: null,
    events: [event('search', 5), event('vote_submitted', 9)],
    ...overrides,
  };
}

const ids = (rules: RuleStat[]) => rules.map((r) => r.ruleId);

describe('trackedEventsTotal', () => {
  it('sums every event total and counts the event types', () => {
    expect(trackedEventsTotal(vercel())).toEqual({total: 14, eventTypes: 2});
  });

  it('is null before the artifact loads', () => {
    expect(trackedEventsTotal(null)).toBeNull();
  });

  it('is null for the empty artifact written without the Vercel secrets', () => {
    expect(trackedEventsTotal(vercel({hasVercelData: false, events: []}))).toBeNull();
  });

  it('is null when no events were tracked', () => {
    expect(trackedEventsTotal(vercel({events: []}))).toBeNull();
  });
});

describe('rulesToReview', () => {
  it('ranks rules by the size of their gap, in either direction', () => {
    expect(ids(rulesToReview([rule('small', 50, 0.1), rule('over', 50, -0.9), rule('under', 50, 0.6)]))).toEqual([
      'over',
      'under',
      'small',
    ]);
  });

  it('leaves out rules with fewer than 10 score votes, however wide their gap', () => {
    expect(ids(rulesToReview([rule('thin', 9, 2.44), rule('enough', 10, 0.3)]))).toEqual(['enough']);
  });

  it('leaves out rules with no gap', () => {
    expect(rulesToReview([rule('unvoted', 0, null), rule('no-gap', 40, null)])).toEqual([]);
  });

  it('lists four rules by default', () => {
    const rules = [0.1, 0.2, 0.3, 0.4, 0.5].map((gap, i) => rule(`r${i}`, 20, gap));
    expect(ids(rulesToReview(rules))).toEqual(['r4', 'r3', 'r2', 'r1']);
  });

  it('takes a limit and a vote floor', () => {
    const rules = [rule('a', 3, 1), rule('b', 30, 0.5), rule('c', 30, 0.2)];
    expect(ids(rulesToReview(rules, {limit: 1, minVotes: 1}))).toEqual(['a']);
  });

  it('breaks a tie in favour of the rule with more votes', () => {
    expect(ids(rulesToReview([rule('fewer', 12, -0.4), rule('more', 80, 0.4)]))).toEqual(['more', 'fewer']);
  });

  it('leaves the input order alone', () => {
    const rules = [rule('a', 20, 0.1), rule('b', 20, 0.9)];
    rulesToReview(rules);
    expect(ids(rules)).toEqual(['a', 'b']);
  });
});

describe('latestVotes', () => {
  it('returns the newest votes first, whatever order the log is in', () => {
    const votes = [vote('2026-09-28T10:00:00Z'), vote('2026-09-30T08:00:00Z'), vote('2026-09-29T23:59:00Z')];
    expect(latestVotes(votes, 2).map((v) => v.ts)).toEqual(['2026-09-30T08:00:00Z', '2026-09-29T23:59:00Z']);
  });

  it('compares instants, not strings', () => {
    // 09:30 at +02:00 is 07:30Z, so the 08:00Z vote is the newer one.
    const votes = [vote('2026-09-30T09:30:00+02:00'), vote('2026-09-30T08:00:00Z')];
    expect(latestVotes(votes, 1)[0].ts).toBe('2026-09-30T08:00:00Z');
  });

  it("orders Supabase's created_at shape by instant, microseconds and offset included", () => {
    // vote-log.json carries ts as Supabase returns created_at. As strings, the Z vote would sort first.
    const votes = [
      vote('2026-09-30T14:20:00Z'),
      vote('2026-09-30T14:20:00.123456+00:00'),
      vote('2026-09-29T23:59:59.999999+00:00'),
    ];
    expect(latestVotes(votes, 3).map((v) => v.ts)).toEqual([
      '2026-09-30T14:20:00.123456+00:00',
      '2026-09-30T14:20:00Z',
      '2026-09-29T23:59:59.999999+00:00',
    ]);
  });

  it('keeps unscored quick votes', () => {
    expect(latestVotes([vote('2026-09-30T08:00:00Z', null)], 4)[0].score).toBeNull();
  });

  it('returns the whole log when it is shorter than n, and nothing for an empty log', () => {
    expect(latestVotes([vote('2026-09-30T08:00:00Z')], 4)).toHaveLength(1);
    expect(latestVotes([], 4)).toEqual([]);
  });

  it('leaves the log order alone', () => {
    const votes = [vote('2026-09-28T10:00:00Z'), vote('2026-09-30T08:00:00Z')];
    latestVotes(votes, 2);
    expect(votes.map((v) => v.ts)).toEqual(['2026-09-28T10:00:00Z', '2026-09-30T08:00:00Z']);
  });
});

describe('recentWeeks', () => {
  const weekly: WeeklyPoint[] = ['2026-07-06', '2026-07-13', '2026-07-20', '2026-07-27'].map((week) => ({
    week,
    votes: 10,
    meanGap: null,
  }));

  it('keeps the last n weeks, oldest first', () => {
    expect(recentWeeks(weekly, 2).map((w) => w.week)).toEqual(['2026-07-20', '2026-07-27']);
  });

  it('keeps every week when there are fewer than n', () => {
    expect(recentWeeks(weekly, 12)).toEqual(weekly);
  });

  it('keeps none for n of 0', () => {
    expect(recentWeeks(weekly, 0)).toEqual([]);
  });

  it('fills a week without votes instead of skipping it', () => {
    const sparse: WeeklyPoint[] = [
      {week: '2026-07-06', votes: 3, meanGap: null},
      {week: '2026-07-27', votes: 4, meanGap: -0.1},
    ];
    expect(recentWeeks(sparse, 3)).toEqual([
      {week: '2026-07-13', votes: 0, meanGap: null},
      {week: '2026-07-20', votes: 0, meanGap: null},
      {week: '2026-07-27', votes: 4, meanGap: -0.1},
    ]);
  });
});

describe('weeksThatFit', () => {
  it('shows all 12 weeks before the chart is measured, as in jsdom', () => {
    expect(weeksThatFit(0)).toBe(12);
  });

  it('fits as many 44px slots (a 40px column and SPACING.xs of air) as the plot holds', () => {
    // Narrower than one slot still shows the newest week.
    expect(weeksThatFit(43)).toBe(1);
    // 11 slots take 11 × 44 = 484px; 12 take 528px.
    expect(weeksThatFit(527)).toBe(11);
    expect(weeksThatFit(528)).toBe(12);
  });

  it('never shows more than 12 weeks', () => {
    expect(weeksThatFit(10000)).toBe(12);
  });
});
```

- [ ] **Step 8: Run it and watch it fail**

Run: `pnpm vitest run src/tools/analytics/overview/__tests__/overviewStats.test.ts`
Expected: FAIL with `Failed to resolve import "../overviewStats"`.

- [ ] **Step 9: Create overviewStats**

Create `src/tools/analytics/overview/overviewStats.ts`. `bucketWeekly` (`scripts/lib/voteAnalytics.mjs:128-153`) writes a point only for a week that has votes. So `recentWeeks` walks calendar weeks and doesn't count points. `weeksThatFit` is the Weekly activity card's column count; it lives here so that `WeeklyCard.tsx` exports only components and the test can reach it. `WEEKS_SHOWN` is exported because the card's table view holds the whole window while its chart shows only the weeks that fit:

```ts
import {SPACING} from '../../../app-bridge';
import type {RuleStat, WeeklyPoint} from '../voteAnalyticsTypes';
import type {VoteLogRow} from '../voteLogTypes';
import type {VercelAnalytics} from '../vercelAnalyticsTypes';

/**
 * Rules backed by fewer score votes than this are left out of Rules to review:
 * a rule with a handful of votes can carry a huge gap that means nothing. The
 * same threshold as the calibration table's "low n" chip.
 */
export const MIN_RULE_VOTES = 10;
/** How many rules the Overview lists. */
const RULES_SHOWN = 4;
/** One week in ms. Weeks are UTC Mondays, so there is no daylight-saving drift. */
const WEEK_MS = 7 * 86_400_000;
/**
 * The Weekly activity window: the last 12 Monday weeks. The whole log (about
 * 26 weeks by Oct 2026) would crush the bars (R-9). The card's table view
 * holds all of them; its chart shows as many as fit (weeksThatFit).
 */
export const WEEKS_SHOWN = 12;
/**
 * A week's column never gets narrower than this. With SPACING.xs of air its slot
 * is 44px: "Sep 28" (36px at the micro size) plus BarChart's 8px label gap, so
 * every week prints its date and its gap. A narrower plot shows fewer weeks.
 */
const COLUMN_MIN = 40;

/**
 * The sum of every tracked event's all-time total, and how many event types it
 * covers. Null when there is nothing to sum: the artifact hasn't loaded, it is
 * the empty file written without the Vercel secrets (or after a failed API
 * call), or no events were tracked.
 */
export function trackedEventsTotal(v: VercelAnalytics | null): {total: number; eventTypes: number} | null {
  if (!v || !v.hasVercelData || v.events.length === 0) return null;
  return {total: v.events.reduce((sum, e) => sum + e.total, 0), eventTypes: v.events.length};
}

/**
 * The rules most worth tuning next: widest |meanGap| first, either direction,
 * ties to the rule with more votes. Rules without a gap, or with fewer than
 * `minVotes` score votes, are left out (docs/plans/R-redesign.md, "Corrections
 * to the spec"). The input array is not reordered.
 */
export function rulesToReview(
  rules: RuleStat[],
  {limit = RULES_SHOWN, minVotes = MIN_RULE_VOTES}: {limit?: number; minVotes?: number} = {},
): RuleStat[] {
  return rules
    .filter((r): r is RuleStat & {meanGap: number} => r.meanGap != null && r.scoreVotes >= minVotes)
    .sort((x, y) => Math.abs(y.meanGap) - Math.abs(x.meanGap) || y.scoreVotes - x.scoreVotes)
    .slice(0, limit);
}

/**
 * The `n` newest votes, newest first, whatever order the log is in. Timestamps
 * are compared as instants, not strings. Unscored quick votes stay in.
 */
export function latestVotes(votes: VoteLogRow[], n: number): VoteLogRow[] {
  return [...votes].sort((x, y) => Date.parse(y.ts) - Date.parse(x.ts)).slice(0, n);
}

/**
 * The last `n` calendar weeks up to the newest weekly point, oldest first, so
 * the Overview's chart stays readable however long the log runs (R-9). The
 * precompute writes a point only for a week that has votes, so a quiet week
 * comes back as a zero-vote week with no gap instead of being skipped. The
 * window never starts before the first point.
 */
export function recentWeeks(weekly: WeeklyPoint[], n: number): WeeklyPoint[] {
  if (n <= 0 || weekly.length === 0) return [];
  const byWeek = new Map(weekly.map((w) => [w.week, w]));
  const first = Date.parse(weekly[0].week);
  const last = Date.parse(weekly[weekly.length - 1].week);
  const weeks: WeeklyPoint[] = [];
  for (let t = Math.max(first, last - (n - 1) * WEEK_MS); t <= last; t += WEEK_MS) {
    const week = new Date(t).toISOString().slice(0, 10);
    weeks.push(byWeek.get(week) ?? {week, votes: 0, meanGap: null});
  }
  return weeks;
}

/**
 * How many week slots fit `width` px of the Weekly activity chart's plot: a
 * COLUMN_MIN column plus SPACING.xs of air each (BarChart splits the plot into
 * equal slots), at least 1 and at most WEEKS_SHOWN. WeeklyCard passes its
 * frame's width less BarChart's y-axis gutter and its 8px right pad. A slot
 * holds the week's x label and the gap under it; BarChart (R1-3b) caps the bar
 * inside it at 24px. All WEEKS_SHOWN before the first measure, and in jsdom,
 * where the width stays 0.
 */
export function weeksThatFit(width: number): number {
  if (width <= 0) return WEEKS_SHOWN;
  return Math.max(1, Math.min(WEEKS_SHOWN, Math.floor(width / (COLUMN_MIN + SPACING.xs))));
}
```

- [ ] **Step 10: Run the test again**

Run: `pnpm vitest run src/tools/analytics/overview/__tests__/overviewStats.test.ts`
Expected: PASS (24 tests).

- [ ] **Step 11: Commit** (run with the Bash tool, only after the owner approves)

```bash
git add src/tools/analytics/overview/overviewStats.ts src/tools/analytics/overview/__tests__/overviewStats.test.ts
USER_APPROVED=1 git commit -m "feat(analytics): add the Overview's stats helpers (#24)"
```

- [ ] **Step 12: Add the shared Overview fixtures**

Create `src/tools/analytics/overview/overviewFixtures.ts`. The tests and the stories both read it. A stories file shouldn't export data, so nothing imports from `CalibrationView.stories.tsx`, which goes away in R2.

```ts
import type {RuleStat, VoteAnalytics, WeeklyPoint} from '../voteAnalyticsTypes';
import type {VoteLog, VoteLogRow} from '../voteLogTypes';
import type {VercelAnalytics, VercelEvent} from '../vercelAnalyticsTypes';

/*
 * Overview fixtures, shared by the Overview's tests and stories: sample rules,
 * votes and events in the shape of the three admin-data artifacts. The weekly
 * series runs 14 Mondays, so the 12-week window has two weeks to cut, and its
 * totals add up to totalVotes.
 */

type RuleSeed = Pick<RuleStat, 'ruleId' | 'ruleName' | 'category' | 'scoreVotes' | 'meanGap'>;
/** A RuleStat with its secondary counts filled in; the Overview reads only the seed fields. */
const rule = (r: RuleSeed): RuleStat => ({...r, pairsVoted: Math.round(r.scoreVotes / 2), accuracySentiment: null, pairsCovered: 0.4});

const RULES: RuleStat[] = [
  rule({ruleId: 'ramp', ruleName: 'Ramp', category: 'playstyle', scoreVotes: 557, meanGap: -0.57}),
  rule({ruleId: 'shift-targets', ruleName: 'Shift Targets', category: 'direct', scoreVotes: 214, meanGap: -0.22}),
  rule({ruleId: 'singer-songs', ruleName: 'Singer + Songs', category: 'direct', scoreVotes: 141, meanGap: 0.14}),
  rule({ruleId: 'discard', ruleName: 'Discard', category: 'playstyle', scoreVotes: 103, meanGap: 0.83}),
  // The widest gap of all, on 9 votes: Rules to review leaves it out.
  rule({ruleId: 'location-boost', ruleName: 'Location Boost', category: 'playstyle', scoreVotes: 9, meanGap: 2.44}),
  // No score votes, so no gap.
  rule({ruleId: 'bodyguard', ruleName: 'Bodyguard', category: 'direct', scoreVotes: 0, meanGap: null}),
];

/** [Monday, votes, mean gap]. The week of Aug 10 holds only quick votes, so it has no gap. */
const WEEKS: Array<[string, number, number | null]> = [
  ['2026-06-29', 62, -0.52],
  ['2026-07-06', 75, -0.47],
  ['2026-07-13', 88, -0.44],
  ['2026-07-20', 101, -0.41],
  ['2026-07-27', 96, -0.39],
  ['2026-08-03', 118, -0.35],
  ['2026-08-10', 134, null],
  ['2026-08-17', 150, -0.31],
  ['2026-08-24', 172, -0.28],
  ['2026-08-31', 160, -0.31],
  ['2026-09-07', 188, -0.22],
  ['2026-09-14', 214, -0.27],
  ['2026-09-21', 236, -0.33],
  ['2026-09-28', 260, -0.3],
];
const WEEKLY: WeeklyPoint[] = WEEKS.map(([week, votes, meanGap]) => ({week, votes, meanGap}));

export const ANALYTICS: VoteAnalytics = {
  generatedAt: '2026-09-30T04:12:00Z',
  hasRawVotes: true,
  global: {
    totalVotes: 2054,
    distinctPairs: 1928,
    distinctVoters: 114,
    meanGap: -0.3,
    accuracySentiment: 0.03,
    engineSilentPairs: 196,
    weekly: WEEKLY,
    dimensionFill: {score: 1610, accuracy: 1902, isReal: 1204, wouldPlay: 980, difficulty: 742},
  },
  rules: RULES,
  pairs: [],
};

/**
 * A log a few weeks old: three weekly points with a quiet week (Sep 14)
 * between them, so the chart has four bars, and no rule with 10 score votes
 * yet. The busiest week (Sep 21) isn't the newest, so the 'extremes' cap
 * labels print two totals. The weeks add up to totalVotes.
 */
export const EARLY_ANALYTICS: VoteAnalytics = {
  ...ANALYTICS,
  global: {
    ...ANALYTICS.global,
    totalVotes: 92,
    distinctPairs: 85,
    distinctVoters: 14,
    meanGap: -0.31,
    accuracySentiment: 0.05,
    engineSilentPairs: 9,
    weekly: [
      {week: '2026-09-07', votes: 18, meanGap: -0.61},
      {week: '2026-09-21', votes: 41, meanGap: -0.35},
      {week: '2026-09-28', votes: 33, meanGap: -0.18},
    ],
    dimensionFill: {score: 70, accuracy: 88, isReal: 50, wouldPlay: 41, difficulty: 30},
  },
  rules: [],
};

/** The artifact built without SUPABASE_SERVICE_ROLE_KEY: no voters, weeks or dimension fill. */
export const NO_RAW_ANALYTICS: VoteAnalytics = {
  ...ANALYTICS,
  hasRawVotes: false,
  global: {...ANALYTICS.global, distinctVoters: null, weekly: [], dimensionFill: null},
};

function vote(aName: string, bName: string, score: number | null, ts: string, voter: number): VoteLogRow {
  return {
    a: `crd-${aName}`,
    b: `crd-${bName}`,
    aName,
    bName,
    score,
    accuracy: score == null ? 1 : 0,
    isReal: null,
    wouldPlay: null,
    difficulty: null,
    whoCarries: null,
    ts,
    voter,
  };
}

/**
 * Newest first, as the precompute writes it. Voter 12's vote is a quick vote:
 * no score. The newest ts has the shape vote-log.json really carries,
 * Supabase's created_at (microseconds and +00:00); the others use the short Z
 * form.
 */
export const VOTE_LOG: VoteLog = {
  generatedAt: '2026-09-30T04:12:00Z',
  voterCount: 114,
  votes: [
    vote('Maui', 'Fishhook', 5, '2026-09-30T14:20:00.123456+00:00', 41),
    vote('Maui', 'Fishhook', null, '2026-09-30T09:05:00Z', 12),
    vote('Elsa - Spirit', 'Elsa - Snow Queen', 7, '2026-09-29T18:44:00Z', 5),
    vote('Cogsworth', 'Beast’s Castle', 3, '2026-09-28T11:02:00Z', 6),
    vote('Mad Hatter', 'The Queen of Hearts', 8, '2026-09-27T20:15:00Z', 88),
  ],
};

/** The vote log written without raw votes. */
export const EMPTY_VOTE_LOG: VoteLog = {generatedAt: '2026-09-30T04:12:00Z', votes: [], voterCount: 0};

function event(name: string, label: string, total: number, visitors: number): VercelEvent {
  return {name, label, total, visitors, trend: [], breakdowns: []};
}

/** 8,540 events over five types, out of order on purpose: the card sorts them. */
export const VERCEL: VercelAnalytics = {
  generatedAt: '2026-09-30T04:15:00Z',
  hasVercelData: true,
  reportingWindow: {since: '2026-07-31', until: '2026-09-29'},
  events: [
    event('vote_submitted', 'Votes submitted', 1240, 410),
    event('reveal_card_click', 'Reveal card clicks', 4820, 1310),
    event('search_submitted', 'Searches', 2010, 640),
    event('vote_skipped', 'Votes skipped', 330, 120),
    event('share_clicked', 'Share clicks', 140, 88),
  ],
};

/** The empty-but-valid artifact written without the Vercel secrets. */
export const NO_VERCEL: VercelAnalytics = {
  generatedAt: '2026-09-30T04:15:00Z',
  hasVercelData: false,
  reportingWindow: null,
  events: [],
};

/** Vercel answered, but no custom events have been tracked. */
export const NO_EVENTS: VercelAnalytics = {...VERCEL, events: []};
```

- [ ] **Step 13: Write the failing OverviewView and WeeklyCard tests**

Create `src/tools/analytics/overview/__tests__/OverviewView.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {OverviewView, type OverviewViewProps} from '../OverviewView';
import {
  ANALYTICS,
  EMPTY_VOTE_LOG,
  NO_EVENTS,
  NO_RAW_ANALYTICS,
  NO_VERCEL,
  VERCEL,
  VOTE_LOG,
} from '../overviewFixtures';

const LOADED: OverviewViewProps = {
  analytics: ANALYTICS,
  analyticsState: {loading: false, error: null},
  voteLog: VOTE_LOG,
  voteLogError: null,
  vercel: VERCEL,
  vercelError: null,
};

// The cards link to other pages, so the view needs a router.
function renderView(overrides: Partial<OverviewViewProps> = {}) {
  render(
    <MemoryRouter>
      <OverviewView {...LOADED} {...overrides} />
    </MemoryRouter>,
  );
}

const kpis = () => screen.getByRole('region', {name: 'Key figures'});

describe('OverviewView', () => {
  it('leads with the headline numbers', () => {
    renderView();
    for (const text of ['2,054', '+260 since Sep 28', '1,928', 'Distinct voters', '114', '196', '8,540', '5 event types · Vercel']) {
      expect(within(kpis()).getByText(text)).toBeInTheDocument();
    }
  });

  it('reads the calibration verdict and links to Calibration', () => {
    renderView();
    expect(screen.getByText('well-calibrated')).toBeInTheDocument();
    expect(screen.getByText('mean gap').parentElement).toHaveTextContent('−0.30');
    expect(
      screen.getByText('The engine rates pairs about 0.30 points higher than the community on average.'),
    ).toBeInTheDocument();
    expect(screen.getByText('+0.03')).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'Open calibration →'})).toHaveAttribute('href', '/calibration');
  });

  it('charts weekly activity, the last bar dated by the latest vote', () => {
    // WeeklyCard.test.tsx covers the chart itself: tooltips, keyboard, table view and width.
    renderView();
    expect(screen.getByRole('slider', {name: 'Votes per week'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Table'})).toBeInTheDocument();
    expect(screen.getByText(/the last bar runs through the latest vote \(Sep 30\)\.$/)).toBeInTheDocument();
  });

  it('lists the rules to review widest gap first, leaving out thin and unvoted rules', () => {
    renderView();
    const list = screen.getByRole('list', {name: 'Rules to review'});
    expect(within(list).getAllByRole('link').map((link) => link.getAttribute('aria-label'))).toEqual([
      'Tune Discard',
      'Tune Ramp',
      'Tune Shift Targets',
      'Tune Singer + Songs',
    ]);
    expect(within(list).getByRole('link', {name: 'Tune Ramp'})).toHaveAttribute('href', '/calibration?rule=ramp');
    expect(within(list).queryByText('Location Boost')).not.toBeInTheDocument();
    expect(within(list).queryByText('Bodyguard')).not.toBeInTheDocument();
  });

  it('shows the four latest votes newest first, with a dash for a quick vote', () => {
    renderView();
    const rows = within(screen.getByRole('list', {name: 'Latest votes'})).getAllByRole('listitem');
    expect(rows).toHaveLength(4);
    // Voter 41's ts is Supabase's created_at shape: it still sorts first and is labelled by its UTC day.
    expect(rows[0]).toHaveTextContent('Maui × Fishhook');
    expect(rows[0]).toHaveTextContent('voter 41 · Sep 30');
    expect(rows[1]).toHaveTextContent('voter 12 · Sep 30');
    expect(rows[1]).toHaveTextContent('—');
    expect(rows[3]).toHaveTextContent('Cogsworth × Beast’s Castle');
    expect(screen.getByRole('link', {name: 'Open activity →'})).toHaveAttribute('href', '/activity');
  });

  it('lists web events busiest first, with all-time totals and the trend window', () => {
    renderView();
    const rows = within(screen.getByRole('list', {name: 'Web events'})).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      'Reveal card clicks4,820',
      'Searches2,010',
      'Votes submitted1,240',
      'Votes skipped330',
      'Share clicks140',
    ]);
    expect(screen.getByText('Trends Jul 31 – Sep 29 · totals all-time')).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'Open web analytics →'})).toHaveAttribute('href', '/web');
  });

  it('says it is loading while each artifact loads', () => {
    renderView({analytics: null, analyticsState: {loading: true, error: null}, voteLog: null, vercel: null});
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
    expect(screen.queryByRole('region', {name: 'Key figures'})).not.toBeInTheDocument();
    expect(screen.getByText('Loading votes...')).toBeInTheDocument();
    expect(screen.getByText('Loading Web Analytics...')).toBeInTheDocument();
  });

  it('keeps Tracked events blank while the Vercel data loads', () => {
    renderView({vercel: null});
    expect(within(kpis()).getByText('—')).toBeInTheDocument();
    expect(within(kpis()).getByText('Loading Vercel data...')).toBeInTheDocument();
  });

  it('says why vote analytics are missing, without hiding the other artifacts', () => {
    renderView({
      analytics: null,
      analyticsState: {loading: false, error: new Error('vote-analytics.json has not been generated yet')},
    });
    expect(
      screen.getByText(
        'Could not load vote analytics. Has the artifact been generated? (vote-analytics.json has not been generated yet)',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Loading analytics...')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', {name: 'Rules to review'})).not.toBeInTheDocument();
    expect(screen.getByRole('list', {name: 'Latest votes'})).toBeInTheDocument();
    expect(screen.getByRole('list', {name: 'Web events'})).toBeInTheDocument();
  });

  it('asks for raw votes where the Overview needs them', () => {
    renderView({analytics: NO_RAW_ANALYTICS, voteLog: EMPTY_VOTE_LOG});
    expect(within(kpis()).queryByText('Distinct voters')).not.toBeInTheDocument();
    expect(within(kpis()).queryByText(/since/)).not.toBeInTheDocument();
    expect(screen.queryByRole('slider', {name: 'Votes per week'})).not.toBeInTheDocument();
    expect(screen.getByText(/Weekly activity and voter counts need raw votes/)).toBeInTheDocument();
    expect(screen.getByText(/Needs raw votes/)).toBeInTheDocument();
  });

  it('names the missing Vercel secrets instead of showing a zero', () => {
    renderView({vercel: NO_VERCEL});
    expect(within(kpis()).getByText('—')).toBeInTheDocument();
    expect(kpis()).toHaveTextContent('Needs VERCEL_ANALYTICS_TOKEN and ANALYTICS_VERCEL_PROJECT_ID');
    expect(screen.getAllByText('VERCEL_ANALYTICS_TOKEN')).toHaveLength(2);
    expect(screen.queryByRole('list', {name: 'Web events'})).not.toBeInTheDocument();
  });

  it('says when no web events were tracked', () => {
    renderView({vercel: NO_EVENTS});
    expect(within(kpis()).getByText('No events tracked yet')).toBeInTheDocument();
    expect(screen.getByText('No events tracked yet.')).toBeInTheDocument();
  });

  it('reports an artifact that failed to load in the cards built from it', () => {
    renderView({
      voteLog: null,
      voteLogError: new Error('vote-log.json: HTTP 500'),
      vercel: null,
      vercelError: new Error('vercel-analytics.json: HTTP 500'),
    });
    expect(screen.getByText('Could not load the vote log (vote-log.json: HTTP 500).')).toBeInTheDocument();
    expect(screen.getByText('Could not load Web Analytics (vercel-analytics.json: HTTP 500).')).toBeInTheDocument();
    expect(within(kpis()).getByText('Vercel data could not load')).toBeInTheDocument();
    expect(screen.getByText(/the last bar runs through the latest vote\.$/)).toBeInTheDocument();
  });
});
```

Create `src/tools/analytics/overview/__tests__/WeeklyCard.test.tsx`. It drives the weekly chart the way a reader does: the keyboard on the focused plot, a pointer over it, and the Chart | Table toggle. The tooltip and the slider's value text must agree, and the table must hold every week of the window.

jsdom has no `ResizeObserver`, so the real bridged `useContainerWidth` stays at 0 there. The file stubs the hook at 600px, which holds all 12 slots, so the card's own tests don't lean on how the kit treats an unmeasured width. One test narrows the card to a 460px plot and reads which weeks the chart keeps. That runs the narrow-card path (review focus 1) end to end, on top of Step 7's `weeksThatFit` cases. If R1-3b's `BarChart` measures itself through the same bridged hook, it gets the same width and lays out at it too. If it measures some other way, it stays unmeasured in jsdom, which the "renders its plot before its first measurement" reading under Contract additions covers:

```tsx
import type {ComponentProps} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {BAR_Y_AXIS_WIDTH} from '../../../../charts/BarChart';
import {WeeklyCard} from '../WeeklyCard';
import {ANALYTICS, EARLY_ANALYTICS} from '../overviewFixtures';

// jsdom has no ResizeObserver, so the real useContainerWidth stays at 0. The
// stub gives the card a width, and BarChart the same one if it measures
// through the bridged hook too.
const measured = vi.hoisted(() => ({width: 600}));
vi.mock('../../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useContainerWidth: () => measured.width,
}));

beforeEach(() => {
  // 600px holds all 12 slots (weeksThatFit), with room for BarChart's y-axis gutter.
  measured.width = 600;
});

type CardProps = Partial<ComponentProps<typeof WeeklyCard>>;

function renderCard(props: CardProps = {}) {
  return render(<WeeklyCard weekly={ANALYTICS.global.weekly} hasRawVotes latestDay="2026-09-30" {...props} />);
}

/** The plot: useChartCursor's slider, named by BarChart's ariaLabel (R1-3b). */
const chart = () => screen.getByRole('slider', {name: 'Votes per week'});

/** The tooltip showing `title`. ChartTooltip's root is aria-hidden (R1-3b), so it is found by its text. */
function tooltip(title: string): HTMLElement {
  const tip = screen.getByText(title).closest<HTMLElement>('[aria-hidden="true"]');
  expect(tip, `no tooltip around "${title}"`).not.toBeNull();
  return tip as HTMLElement;
}

/** A table row's cells as text, header cells included. */
const cells = (row: HTMLElement) => [...row.querySelectorAll('th, td')].map((cell) => cell.textContent);

describe('WeeklyCard', () => {
  it('reads a week from the keyboard: the votes, then the mean gap', async () => {
    const user = userEvent.setup();
    renderCard();
    expect(screen.queryByText(/^Week of /)).not.toBeInTheDocument();
    // Before the first move the slider already has a value; only the tooltip waits for one.
    expect(chart()).toHaveAttribute('aria-valuenow');

    act(() => chart().focus());
    await user.keyboard('{End}');
    // Title first, then each row: the value leads and its label follows.
    expect(tooltip('Week of Sep 28')).toHaveTextContent(/Week of Sep 28\s*260\s*Votes\s*−0\.30\s*Mean gap/);
    // Screen readers get the same text as the slider's value.
    expect(chart()).toHaveAttribute('aria-valuetext', expect.stringMatching(/Week of Sep 28.*260.*−0\.30/));

    await user.keyboard('{ArrowLeft}');
    expect(tooltip('Week of Sep 21')).toHaveTextContent(/Week of Sep 21\s*236\s*Votes\s*−0\.33\s*Mean gap/);

    // The window starts 12 weeks back, at Jul 13, not at the log's first week (Jun 29).
    await user.keyboard('{Home}');
    expect(tooltip('Week of Jul 13')).toHaveTextContent(/Week of Jul 13\s*88\s*Votes\s*−0\.44\s*Mean gap/);
  });

  it('shows the tooltip under the pointer and drops it when the pointer leaves', async () => {
    const user = userEvent.setup();
    renderCard();
    await user.hover(chart());
    // jsdom lays nothing out (every rect is zeros), so which week the pointer
    // lands on is the kit's business (R1-3b tests the mapping). This checks the
    // card's wiring: a week's title, then its votes and its mean gap, in order.
    const title = screen.getByText(/^Week of [A-Z][a-z]{2} \d{1,2}$/).textContent ?? '';
    expect(tooltip(title)).toHaveTextContent(/\d\s*Votes\s*\S+\s*Mean gap$/);
    await user.unhover(chart());
    expect(screen.queryByText(/^Week of /)).not.toBeInTheDocument();
  });

  it('gives a quiet week an empty column with no gap, instead of skipping it', async () => {
    const user = userEvent.setup();
    renderCard({weekly: EARLY_ANALYTICS.global.weekly});
    act(() => chart().focus());
    await user.keyboard('{Home}{ArrowRight}');
    expect(tooltip('Week of Sep 14')).toHaveTextContent(/Week of Sep 14\s*0\s*Votes\s*—\s*Mean gap/);
  });

  it('has a table view of every week in the window', async () => {
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole('button', {name: 'Table'}));
    const table = screen.getByRole('table', {name: 'Votes and mean gap per week'});
    const [head, ...rows] = within(table).getAllByRole('row');
    expect(cells(head)).toEqual(['Week', 'Votes', 'Mean gap']);
    expect(rows).toHaveLength(12);
    expect(cells(rows[0])).toEqual(['Jul 13', '88', '−0.44']);
    // The week of Aug 10 holds only quick votes, so it has no gap.
    expect(cells(rows[4])).toEqual(['Aug 10', '134', '—']);
    expect(cells(rows[11])).toEqual(['Sep 28', '260', '−0.30']);

    await user.click(screen.getByRole('button', {name: 'Chart'}));
    expect(chart()).toBeInTheDocument();
  });

  it('charts only the newest weeks that fit a narrow card, and keeps the whole window in the table', async () => {
    // A 460px plot holds 10 slots of 46px (weeksThatFit), so the chart starts two weeks
    // later, at Jul 27. The frame is the plot plus BarChart's y-axis gutter and its 8px right pad.
    measured.width = 460 + BAR_Y_AXIS_WIDTH + 8;
    const user = userEvent.setup();
    renderCard();
    act(() => chart().focus());
    await user.keyboard('{Home}');
    expect(tooltip('Week of Jul 27')).toHaveTextContent(/Week of Jul 27\s*96\s*Votes/);
    await user.keyboard('{End}');
    expect(tooltip('Week of Sep 28')).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'Table'}));
    const rows = within(screen.getByRole('table', {name: 'Votes and mean gap per week'})).getAllByRole('row');
    expect(rows).toHaveLength(13);
    expect(cells(rows[1])[0]).toBe('Jul 13');
  });

  it('says so when there are no votes yet, with nothing to chart', () => {
    renderCard({weekly: []});
    expect(screen.getByText('No votes yet.')).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Table'})).not.toBeInTheDocument();
  });

  it('titles the card with the same h2 in every state', () => {
    // Panel titles the raw-votes notice and the empty state; ChartFrame titles the chart (R1-3b).
    const states: CardProps[] = [{}, {hasRawVotes: false}, {weekly: []}];
    for (const props of states) {
      const {unmount} = renderCard(props);
      expect(screen.getByRole('heading', {level: 2, name: 'Weekly activity'})).toBeInTheDocument();
      unmount();
    }
  });
});
```

What the tests rely on in the chart kit is listed under Contract additions. `ChartTooltip` is `aria-hidden`, so the tests find it by its title text and read it with `toHaveTextContent`. Which week a jsdom pointer lands on is R1-3b's business: the hover test checks that a tooltip follows the pointer with the week's title and both rows in order, and leaves with it.

- [ ] **Step 14: Run them and watch them fail**

Run: `pnpm vitest run src/tools/analytics/overview/__tests__/OverviewView.test.tsx src/tools/analytics/overview/__tests__/WeeklyCard.test.tsx`
Expected: FAIL with `Failed to resolve import "../OverviewView"` and `Failed to resolve import "../WeeklyCard"`. On a checkout without R1-3b's `src/charts/`, stop: this task runs after R1-3b.

- [ ] **Step 15: Create the panel link**

Create `src/tools/analytics/overview/PanelLink.tsx`:

```tsx
import type {ReactNode} from 'react';
import {Link} from 'react-router-dom';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';

interface PanelLinkProps {
  to: string;
  /** The accessible name, when the visible text alone is ambiguous (four "Tune" links). */
  label?: string;
  children: ReactNode;
}

/** A panel's text link ("Open calibration →", "Tune"): a router Link in the accent colour. */
export function PanelLink({to, label, children}: PanelLinkProps) {
  return (
    <Link
      to={to}
      aria-label={label}
      style={{fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.accent, textDecoration: 'none', whiteSpace: 'nowrap'}}>
      {children}
    </Link>
  );
}
```

- [ ] **Step 16: Create the KPI row**

Create `src/tools/analytics/overview/OverviewKpis.tsx`:

```tsx
import type {ReactNode} from 'react';
import {SPACING} from '../../../app-bridge';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {fmtDay, fmtInt} from '../../../ui/format';
import {KpiCard} from '../../../ui/KpiCard';
import {RawTag} from '../../../ui/RawTag';
import {trackedEventsTotal} from './overviewStats';
import type {VoteAnalytics} from '../voteAnalyticsTypes';
import type {VercelAnalytics} from '../vercelAnalyticsTypes';

interface OverviewKpisProps {
  analytics: VoteAnalytics;
  vercel: VercelAnalytics | null;
  vercelError: Error | null;
}

/** Why Tracked events has no total, in a few words: never a misleading 0. */
function trackedEventsHint(vercel: VercelAnalytics | null, vercelError: Error | null): ReactNode {
  if (vercelError) return 'Vercel data could not load';
  if (!vercel) return 'Loading Vercel data...';
  if (!vercel.hasVercelData) {
    // The secret names are long; let them break inside the narrow card.
    return (
      <span style={{overflowWrap: 'anywhere'}}>
        Needs <code>VERCEL_ANALYTICS_TOKEN</code> and <code>ANALYTICS_VERCEL_PROJECT_ID</code>
      </span>
    );
  }
  return 'No events tracked yet';
}

/**
 * The Overview's headline numbers. Distinct voters needs the raw vote log, so
 * it shows only with raw votes. The Total votes hint is the newest weekly
 * point: the votes cast since that week's Monday, which is every vote since
 * then, because no later week has any. It says "since", not "last week",
 * because that week is usually still running. Tracked events comes from the
 * Vercel artifact and reads "—" with the reason whenever there's no total.
 */
export function OverviewKpis({analytics, vercel, vercelError}: OverviewKpisProps) {
  const g = analytics.global;
  const lastWeek = g.weekly.length > 0 ? g.weekly[g.weekly.length - 1] : null;
  const tracked = trackedEventsTotal(vercel);
  return (
    <section
      aria-label="Key figures"
      style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: SPACING.md}}>
      <KpiCard
        label="Total votes"
        value={fmtInt(g.totalVotes)}
        hint={lastWeek ? `+${fmtInt(lastWeek.votes)} since ${fmtDay(lastWeek.week)}` : undefined}
      />
      <KpiCard label="Pairs covered" value={fmtInt(g.distinctPairs)} hint="distinct card pairs" />
      {analytics.hasRawVotes && g.distinctVoters != null && (
        <KpiCard label="Distinct voters" value={fmtInt(g.distinctVoters)} hint="from raw vote log" tag={<RawTag />} />
      )}
      <KpiCard
        label="Engine-silent pairs"
        value={fmtInt(g.engineSilentPairs)}
        hint="voted, no synergy"
        valueColor={ADMIN_COLORS.accent}
      />
      <KpiCard
        label="Tracked events"
        value={tracked ? fmtInt(tracked.total) : '—'}
        hint={tracked ? `${fmtInt(tracked.eventTypes)} event types · Vercel` : trackedEventsHint(vercel, vercelError)}
      />
    </section>
  );
}
```

- [ ] **Step 17: Create the engine calibration card**

Create `src/tools/analytics/overview/CalibrationCard.tsx`:

```tsx
import type {CSSProperties} from 'react';
import {COLORS, FONTS, SPACING, hexRgba} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtGap} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {biasCopy} from '../biasCopy';
import {scalePercent, verdictFor} from '../verdict';
import {PanelLink} from './PanelLink';

/**
 * The track tints toward the over-rates colour on the left and the under-rates
 * colour on the right: COLORS.error and COLORS.success, as verdictFor and
 * gapColor use them.
 */
const TRACK = `linear-gradient(90deg, ${hexRgba(COLORS.error, 0.35)}, ${ADMIN_COLORS.barTrack} 30%, ${ADMIN_COLORS.barTrack} 70%, ${hexRgba(COLORS.success, 0.35)})`;

const SCALE_LABEL: CSSProperties = {fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted};

/**
 * The diverging over/under scale: a centre tick, and a dot at the mean gap
 * (clamped by scalePercent), left out when there is no gap. The number above
 * says the same thing, so the track is hidden from assistive tech.
 */
function GapScale({meanGap, color}: {meanGap: number | null; color: string}) {
  const dot = scalePercent(meanGap);
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: SPACING.md}}>
      <span style={SCALE_LABEL}>over-rates</span>
      <div
        aria-hidden="true"
        style={{position: 'relative', flex: 1, height: 6, borderRadius: ADMIN_RADIUS.tag, background: TRACK}}>
        <div style={{position: 'absolute', left: '50%', top: -4, width: 1, height: 14, background: ADMIN_COLORS.muted}} />
        {dot != null && (
          <div
            style={{
              position: 'absolute',
              left: `${dot}%`,
              top: -3,
              width: 12,
              height: 12,
              boxSizing: 'border-box',
              borderRadius: '50%',
              background: color,
              border: `2px solid ${ADMIN_COLORS.page}`,
              transform: 'translateX(-50%)',
            }}
          />
        )}
      </div>
      <span style={SCALE_LABEL}>under-rates</span>
    </div>
  );
}

interface CalibrationCardProps {
  meanGap: number | null;
  accuracySentiment: number | null;
}

/**
 * The Overview's engine-calibration card: the verdict sentence and read line
 * (VerdictHero's logic, shared through verdict.ts), the mean gap as the hero
 * number, the over/under scale and the accuracy sentiment. The verdict word is
 * marked by colour only: the app ships no italic Tinos face and sets
 * font-synthesis: none, so an italic would render upright anyway.
 */
export function CalibrationCard({meanGap, accuracySentiment}: CalibrationCardProps) {
  const verdict = verdictFor(meanGap);
  const {read} = biasCopy(meanGap);
  return (
    <Panel title="Engine calibration" action={<PanelLink to="/calibration">Open calibration →</PanelLink>}>
      <div style={{display: 'flex', flexDirection: 'column', gap: SPACING.lg}}>
        <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: SPACING.xxl}}>
          <div style={{flex: '1 1 220px'}}>
            <p
              style={{
                margin: 0,
                fontFamily: FONTS.hero,
                fontSize: ADMIN_TYPE.sectionTitle,
                lineHeight: 1.15,
                color: ADMIN_COLORS.text,
              }}>
              The engine <span style={{color: verdict.wordColor}}>{verdict.word}</span>
            </p>
            <p style={{margin: `${SPACING.sm}px 0 0`, maxWidth: 340, fontSize: ADMIN_TYPE.body, color: ADMIN_COLORS.muted}}>
              {read}
            </p>
          </div>
          <div style={{textAlign: 'right'}}>
            <div style={{fontFamily: FONTS.hero, fontSize: ADMIN_TYPE.hero, lineHeight: 1, color: verdict.numberColor}}>
              {fmtGap(meanGap)}
            </div>
            <div style={{fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted}}>mean gap</div>
          </div>
        </div>
        <GapScale meanGap={meanGap} color={verdict.numberColor} />
        <p
          style={{
            margin: 0,
            paddingTop: SPACING.md,
            borderTop: `1px solid ${ADMIN_COLORS.divider}`,
            fontSize: ADMIN_TYPE.small,
            color: ADMIN_COLORS.muted,
          }}>
          Accuracy sentiment <strong style={{color: ADMIN_COLORS.text}}>{fmtGap(accuracySentiment)}</strong> (thumbs:
          too-low vs too-high)
        </p>
      </div>
    </Panel>
  );
}
```

- [ ] **Step 18: Create the weekly activity card**

Create `src/tools/analytics/overview/WeeklyCard.tsx`, on R1-3b's chart kit. It is a `ChartFrame` around a single-series `BarChart`, and its choices are set out at the top of this task ("Weekly chart on the kit" and "Cap labels").
- **Width.** The card measures itself with the bridged `useContainerWidth`, and the chart shows only the newest weeks that fit, as `weeksThatFit` (Step 9) counts them across the plot: the measured frame less `BAR_Y_AXIS_WIDTH`, R1-3b's y-axis gutter and its 8px right pad. An unmeasured frame (0) passes 0, so the chart shows the whole window. `Math.max(1, …)` keeps a measured width from reaching 0 or below, which `weeksThatFit` would read as unmeasured. A scroller would start at its left edge and hide the accented current week, and an unfocusable scroller fails axe's `scrollable-region-focusable`.
- **What is measured.** `useContainerWidth` observes only the element its ref held at mount (its effect depends on the ref object alone). Two things follow:
  - The chart branch is its own component, `WeeklyChart`, which owns the ref and mounts only once there are weeks to chart. A card that first rendered its notice or its empty state, and later gets weeks on the same instance (Storybook controls, a future refetch), still measures. With the ref in `WeeklyCard`, its mount-only effect would have found nothing to observe, and the chart would show 12 weeks at any width.
  - The ref sits on a wrapper around the whole `ChartFrame`, which stays mounted in both views. A ref inside the chart view would go stale after one trip to the table, and the chart would stop following resizes.
- **The table.** It takes the whole `WEEKS_SHOWN` window from `recentWeeks`, and the chart takes the newest `weeksThatFit(width)` of those same weeks. The two never disagree about a week, and the table keeps the weeks a narrow card leaves out.
- **Colour.** The single series is `ADMIN_COLORS.barNeutral`, which clears 3:1 on a card (R1-2's chart-marks test). `emphasisKey` puts the newest week in the accent. No legend: one series, and the title names it. The gap under each date is `gapColor` status text, muted when it rounds to "0.00". Every other piece of text is the kit's, in text tokens.
- **Tooltip and table text.** Both come from the same `WeeklyPoint`, through `fmtInt`, `fmtGap` and `fmtDay`, so a week reads the same wherever it shows. A week without score votes has `meanGap: null`: `gapLine` prints nothing under its date, and `fmtGap` gives "—" in the tooltip and the table.

```tsx
import {useRef, type CSSProperties} from 'react';
import {SPACING, useContainerWidth} from '../../../app-bridge';
import {BAR_Y_AXIS_WIDTH, BarChart, type BarDatum} from '../../../charts/BarChart';
import {ChartFrame, type ChartTable} from '../../../charts/ChartFrame';
import type {TooltipContent} from '../../../charts/ChartTooltip';
import type {SeriesDef} from '../../../charts/series';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtDay, fmtGap, fmtInt} from '../../../ui/format';
import {Notice} from '../../../ui/Notice';
import {Panel} from '../../../ui/Panel';
import {gapColor} from '../gapColor';
import {WEEKS_SHOWN, recentWeeks, weeksThatFit} from './overviewStats';
import type {WeeklyPoint} from '../voteAnalyticsTypes';

const TITLE = 'Weekly activity';

/**
 * One series, so no legend: the title names it. With emphasisKey, BarChart
 * draws the newest week in the accent and the rest in this neutral, which
 * clears 3:1 on a card (R1-2's chart-marks test).
 */
const VOTES: readonly SeriesDef[] = [{id: 'votes', label: 'Votes', color: ADMIN_COLORS.barNeutral}];

const SMALL_MUTED: CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted};

/** "Week of Sep 28", then the votes and the mean gap; a week without score votes reads "—" for its gap. */
function weekTooltip(w: WeeklyPoint): TooltipContent {
  return {
    title: `Week of ${fmtDay(w.week)}`,
    rows: [
      {label: 'Votes', value: fmtInt(w.votes)},
      {label: 'Mean gap', value: fmtGap(w.meanGap)},
    ],
  };
}

/**
 * The gap under a week's date, in its over/under colour; nothing for a week
 * without score votes. A gap that rounds to "0.00" is muted, as gapColor makes
 * an exact 0, so a −0.004 week doesn't print "0.00" in the over-rates red.
 */
function gapLine(w: WeeklyPoint): {text: string; color: string} | null {
  if (w.meanGap == null) return null;
  const text = fmtGap(w.meanGap);
  return {text, color: text === '0.00' ? ADMIN_COLORS.muted : gapColor(w.meanGap)};
}

/** The table view: every week of the window, oldest first, the narrow card's dropped weeks included. */
function weekTable(weeks: WeeklyPoint[]): ChartTable {
  return {
    caption: 'Votes and mean gap per week',
    columns: ['Week', 'Votes', 'Mean gap'],
    rows: weeks.map((w) => [fmtDay(w.week), fmtInt(w.votes), fmtGap(w.meanGap)]),
  };
}

/**
 * The card's chart branch, in its own component so it owns the measured ref.
 * useContainerWidth observes only the element its ref held at mount (its
 * effect depends on the ref object alone), and this mounts only once there are
 * weeks to chart, so a card that first showed its notice or its empty state
 * still measures when the weeks arrive. `recent` is never empty.
 */
function WeeklyChart({recent, latestDay}: {recent: WeeklyPoint[]; latestDay?: string}) {
  // On a wrapper around the whole frame, which stays mounted in both views: a
  // ref inside the chart view would go stale after a trip to the table.
  const frameRef = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(frameRef);
  // weeksThatFit counts slots across the plot: the frame less BarChart's y-axis
  // gutter and its 8px right pad (SPACING.sm, R1-3b). Unmeasured (0) stays 0, the
  // whole window; a measured width never drops to 0, which weeksThatFit would read
  // as unmeasured.
  const fit = weeksThatFit(width > 0 ? Math.max(1, width - BAR_Y_AXIS_WIDTH - SPACING.sm) : 0);
  const shown = recent.slice(-fit);
  const data: BarDatum[] = shown.map((w) => ({key: w.week, label: fmtDay(w.week), values: {votes: w.votes}}));
  const byWeek = new Map(shown.map((w) => [w.week, w]));
  // Every datum comes from `shown`, so the fallback never runs; it keeps the type a WeeklyPoint.
  const pointOf = (d: BarDatum): WeeklyPoint =>
    byWeek.get(d.key) ?? {week: d.key, votes: d.values.votes, meanGap: null};
  return (
    // ChartFrame titles the card with its h2, so the Panel is the surface only.
    <Panel>
      <div ref={frameRef}>
        <ChartFrame title={TITLE} subtitle="Votes per week · the mean gap under each date" table={weekTable(recent)}>
          <BarChart
            data={data}
            series={VOTES}
            ariaLabel="Votes per week"
            valueFormat={fmtInt}
            tooltip={(d) => weekTooltip(pointOf(d))}
            capLabels="extremes"
            emphasisKey={shown[shown.length - 1].week}
            subLabel={(d) => gapLine(pointOf(d))}
          />
        </ChartFrame>
      </div>
      <p style={SMALL_MUTED}>
        Labels are the week&apos;s Monday. Bars are Monday-start weeks; the last bar runs through the latest vote
        {latestDay ? ` (${fmtDay(latestDay)})` : ''}.
      </p>
    </Panel>
  );
}

interface WeeklyCardProps {
  weekly: WeeklyPoint[];
  hasRawVotes: boolean;
  /** The newest vote's day (YYYY-MM-DD), once the vote log has loaded. */
  latestDay?: string;
}

/**
 * Votes and mean gap per Monday-start week, on the chart kit (R1-3b): the
 * last 12 weeks (R-9), of which the chart shows as many as fit the plot at
 * 44px a slot, newest last, so it never scrolls. The newest week is the
 * emphasised bar. Cap labels stay on 'extremes' (this week and the busiest
 * one), because the gap under every date is already one number per column;
 * the y ticks, the tooltip and the table carry the rest. The table view holds
 * the whole window, including weeks a narrow card leaves out. Weekly points
 * come from the raw vote log, so without raw votes the card says how to enable
 * them (RawVotesNotice's copy, minus the panels that now live on Calibration).
 */
export function WeeklyCard({weekly, hasRawVotes, latestDay}: WeeklyCardProps) {
  if (!hasRawVotes) {
    return (
      <Panel title={TITLE}>
        <Notice>
          Weekly activity and voter counts need raw votes. Set the <code>SUPABASE_SERVICE_ROLE_KEY</code> Actions
          secret, then re-run admin&apos;s Deploy workflow to enable them.
        </Notice>
      </Panel>
    );
  }
  const recent = recentWeeks(weekly, WEEKS_SHOWN);
  if (recent.length === 0) {
    return (
      <Panel title={TITLE}>
        <p style={SMALL_MUTED}>No votes yet.</p>
      </Panel>
    );
  }
  return <WeeklyChart recent={recent} latestDay={latestDay} />;
}
```

- [ ] **Step 18b: Run the weekly card test**

Run: `pnpm vitest run src/tools/analytics/overview/__tests__/WeeklyCard.test.tsx`
Expected: PASS (7 tests). A failure that names a role, a heading, a button or the tooltip text points at one of the chart-kit readings under Contract additions: check R1-3b's code before changing this card.

- [ ] **Step 19: Create the rules-to-review card**

Create `src/tools/analytics/overview/RulesToReviewCard.tsx`:

```tsx
import {SPACING, TRUNCATE} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtGap} from '../../../ui/format';
import {BiasBar} from '../../../ui/BiasBar';
import {Panel} from '../../../ui/Panel';
import {gapColor} from '../gapColor';
import {MIN_RULE_VOTES, rulesToReview} from './overviewStats';
import {PanelLink} from './PanelLink';
import type {RuleStat} from '../voteAnalyticsTypes';

/**
 * The rules most worth tuning next, widest gap first (rulesToReview leaves out
 * rules with too few votes to trust). "Tune" opens Calibration with the rule
 * picked: /calibration?rule=<ruleId>, the analytics rule id. R1-11's
 * Calibration page selects that rule; R2's maps it to its tuning.json entry.
 */
export function RulesToReviewCard({rules}: {rules: RuleStat[]}) {
  const top = rulesToReview(rules);
  return (
    <Panel
      title="Rules to review"
      action={<span style={{fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>widest gap first</span>}>
      {top.length === 0 ? (
        <p style={{margin: 0, fontSize: ADMIN_TYPE.body, color: ADMIN_COLORS.muted}}>
          No rule has {MIN_RULE_VOTES} or more score votes yet.
        </p>
      ) : (
        <ul aria-label="Rules to review" style={{listStyle: 'none', margin: 0, padding: 0}}>
          {top.map((r) => (
            <li
              key={r.ruleId}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 100px 52px 36px',
                alignItems: 'center',
                gap: SPACING.md,
                padding: `${SPACING.sm}px 0`,
                borderBottom: `1px solid ${ADMIN_COLORS.divider}`,
                fontSize: ADMIN_TYPE.body,
              }}>
              <span style={TRUNCATE} title={r.ruleName}>
                {r.ruleName}
              </span>
              <BiasBar gap={r.meanGap} />
              {/* A gap that rounds to "0.00" reads neutral, as the weekly chart's gapLine does. */}
              <span
                style={{
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                  color: fmtGap(r.meanGap) === '0.00' ? ADMIN_COLORS.muted : gapColor(r.meanGap),
                }}>
                {fmtGap(r.meanGap)}
              </span>
              <span style={{textAlign: 'right'}}>
                <PanelLink to={`/calibration?rule=${encodeURIComponent(r.ruleId)}`} label={`Tune ${r.ruleName}`}>
                  Tune
                </PanelLink>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
```

- [ ] **Step 20: Create the latest-votes card**

Create `src/tools/analytics/overview/LatestVotesCard.tsx`:

```tsx
import type {CSSProperties} from 'react';
import {SPACING, TRUNCATE} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtDay} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {ScorePill} from '../../../ui/ScorePill';
import {latestVotes} from './overviewStats';
import {PanelLink} from './PanelLink';
import type {VoteLog} from '../voteLogTypes';

/** How many votes the card lists. */
const SHOWN = 4;

const MUTED: CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

interface LatestVotesCardProps {
  voteLog: VoteLog | null;
  /** Why vote-log.json could not be fetched, if it could not. */
  error: Error | null;
}

/** The card body: vote-log.json's own loading, error and no-raw-votes states, or the newest votes. */
function LatestVotesBody({voteLog, error}: LatestVotesCardProps) {
  if (error) return <p style={MUTED}>Could not load the vote log ({error.message}).</p>;
  if (!voteLog) return <p style={MUTED}>Loading votes...</p>;
  if (voteLog.votes.length === 0) {
    return (
      <p style={MUTED}>
        Needs raw votes (<code>SUPABASE_SERVICE_ROLE_KEY</code>).
      </p>
    );
  }
  return (
    <ul aria-label="Latest votes" style={{listStyle: 'none', margin: 0, padding: 0}}>
      {latestVotes(voteLog.votes, SHOWN).map((v) => (
        <li
          key={`${v.ts}|${v.voter}|${v.a}|${v.b}`}
          style={{display: 'flex', alignItems: 'center', gap: SPACING.md, padding: `${SPACING.xs}px 0`}}>
          {/* A quick vote has no score: the pill shows "—". */}
          <ScorePill score={v.score} />
          <div style={{minWidth: 0, flex: 1}}>
            <div style={{...TRUNCATE, fontSize: ADMIN_TYPE.body}}>
              {v.aName} × {v.bName}
            </div>
            <div style={{fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted}}>
              voter {v.voter} · {fmtDay(v.ts.slice(0, 10))}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The newest votes from the raw vote log, with a link to Vote activity. */
export function LatestVotesCard({voteLog, error}: LatestVotesCardProps) {
  return (
    <Panel title="Latest votes" action={<PanelLink to="/activity">Open activity →</PanelLink>}>
      <LatestVotesBody voteLog={voteLog} error={error} />
    </Panel>
  );
}
```

- [ ] **Step 21: Create the web-events card**

Create `src/tools/analytics/overview/WebEventsCard.tsx`:

```tsx
import type {CSSProperties} from 'react';
import {SPACING, TRUNCATE} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtDay, fmtInt} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {PanelLink} from './PanelLink';
import type {ReportingWindow, VercelAnalytics} from '../vercelAnalyticsTypes';

const MUTED: CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

/** Totals are all-time; only the Web analytics page's trends use the reporting window. */
function windowCaption(range: ReportingWindow | null): string {
  if (!range) return 'Totals all-time';
  return `Trends ${fmtDay(range.since)} – ${fmtDay(range.until)} · totals all-time`;
}

interface WebEventsCardProps {
  vercel: VercelAnalytics | null;
  /** Why vercel-analytics.json could not be fetched, if it could not. */
  error: Error | null;
}

/** The card body: the Web analytics page's states in short form, or the events busiest first. */
function WebEventsBody({vercel, error}: WebEventsCardProps) {
  if (error) return <p style={MUTED}>Could not load Web Analytics ({error.message}).</p>;
  if (!vercel) return <p style={MUTED}>Loading Web Analytics...</p>;
  if (!vercel.hasVercelData) {
    return (
      <p style={{...MUTED, overflowWrap: 'anywhere'}}>
        Needs <code>VERCEL_ANALYTICS_TOKEN</code> and <code>ANALYTICS_VERCEL_PROJECT_ID</code>.
      </p>
    );
  }
  if (vercel.events.length === 0) return <p style={MUTED}>No events tracked yet.</p>;

  const events = [...vercel.events].sort((a, b) => b.total - a.total);
  // Each fill is scaled to the busiest event, so the top row is always full width.
  const top = Math.max(1, events[0].total);
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: SPACING.sm}}>
      <ul
        aria-label="Web events"
        style={{listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: SPACING.xs}}>
        {events.map((e) => (
          <li
            key={e.name}
            style={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'space-between',
              gap: SPACING.sm,
              padding: `${SPACING.xs}px ${SPACING.sm}px`,
              borderRadius: ADMIN_RADIUS.control,
              overflow: 'hidden',
              fontSize: ADMIN_TYPE.small,
            }}>
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: `${(e.total / top) * 100}%`,
                background: ADMIN_COLORS.accentTint,
              }}
            />
            <span style={{position: 'relative', minWidth: 0, ...TRUNCATE}}>{e.label}</span>
            <span style={{position: 'relative', color: ADMIN_COLORS.muted, fontVariantNumeric: 'tabular-nums'}}>
              {fmtInt(e.total)}
            </span>
          </li>
        ))}
      </ul>
      <p style={{...MUTED, fontSize: ADMIN_TYPE.label}}>{windowCaption(vercel.reportingWindow)}</p>
    </div>
  );
}

/** Custom-event totals from Vercel Web Analytics, with a link to the Web analytics page. */
export function WebEventsCard({vercel, error}: WebEventsCardProps) {
  return (
    <Panel title="Web events" action={<PanelLink to="/web">Open web analytics →</PanelLink>}>
      <WebEventsBody vercel={vercel} error={error} />
    </Panel>
  );
}
```

- [ ] **Step 22: Create the view**

Create `src/tools/analytics/overview/OverviewView.tsx`:

```tsx
import {SPACING} from '../../../app-bridge';
import {Notice} from '../../../ui/Notice';
import {latestVoteDay} from '../activityStats';
import {CalibrationCard} from './CalibrationCard';
import {LatestVotesCard} from './LatestVotesCard';
import {OverviewKpis} from './OverviewKpis';
import {RulesToReviewCard} from './RulesToReviewCard';
import {WebEventsCard} from './WebEventsCard';
import {WeeklyCard} from './WeeklyCard';
import type {VoteAnalytics} from '../voteAnalyticsTypes';
import type {VoteLog} from '../voteLogTypes';
import type {VercelAnalytics} from '../vercelAnalyticsTypes';

export interface OverviewViewProps {
  /** vote-analytics.json, or null while it loads or after it failed. */
  analytics: VoteAnalytics | null;
  analyticsState: {loading: boolean; error: Error | null};
  /** vote-log.json, or null while it loads or after it failed. */
  voteLog: VoteLog | null;
  voteLogError?: Error | null;
  /** vercel-analytics.json, or null while it loads or after it failed. */
  vercel: VercelAnalytics | null;
  vercelError: Error | null;
}

/** Two cards side by side from 780px of content width, stacked below. */
const TWO_UP = 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))';
/** Three cards side by side from 880px of content width. */
const THREE_UP = 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))';

/** Why the vote-analytics cards are missing: the artifact is loading, or it could not be read. */
function AnalyticsNotice({loading, error}: OverviewViewProps['analyticsState']) {
  if (error) {
    return <Notice tone="error">Could not load vote analytics. Has the artifact been generated? ({error.message})</Notice>;
  }
  return loading ? <Notice>Loading analytics...</Notice> : null;
}

/**
 * The Overview's body. Each card reads its own artifact and shows that
 * artifact's states, so a missing vote-analytics.json hides only the cards
 * built from it (KPIs, calibration, weekly, rules), not Latest votes or Web
 * events. Purely presentational: OverviewPage fetches.
 */
export function OverviewView({analytics, analyticsState, voteLog, voteLogError = null, vercel, vercelError}: OverviewViewProps) {
  return (
    // A grid, not a column flexbox: panels with overflow:hidden collapse in one.
    <div style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: SPACING.xxl}}>
      {analytics ? (
        <>
          <OverviewKpis analytics={analytics} vercel={vercel} vercelError={vercelError} />
          <div style={{display: 'grid', gridTemplateColumns: TWO_UP, gap: SPACING.xl}}>
            <CalibrationCard meanGap={analytics.global.meanGap} accuracySentiment={analytics.global.accuracySentiment} />
            <WeeklyCard
              weekly={analytics.global.weekly}
              hasRawVotes={analytics.hasRawVotes}
              latestDay={voteLog ? latestVoteDay(voteLog.votes) : undefined}
            />
          </div>
        </>
      ) : (
        <AnalyticsNotice loading={analyticsState.loading} error={analyticsState.error} />
      )}
      <div style={{display: 'grid', gridTemplateColumns: THREE_UP, gap: SPACING.xl}}>
        {analytics && <RulesToReviewCard rules={analytics.rules} />}
        <LatestVotesCard voteLog={voteLog} error={voteLogError} />
        <WebEventsCard vercel={vercel} error={vercelError} />
      </div>
    </div>
  );
}
```

- [ ] **Step 23: Run the view tests again**

Run: `pnpm vitest run src/tools/analytics/overview/__tests__/OverviewView.test.tsx src/tools/analytics/overview/__tests__/WeeklyCard.test.tsx`
Expected: PASS (13 tests in `OverviewView.test.tsx`, 7 in `WeeklyCard.test.tsx`).

- [ ] **Step 24: Write the failing page test**

Create `src/tools/analytics/overview/__tests__/OverviewPage.test.tsx`:

```tsx
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {OverviewPage} from '../OverviewPage';
import {ANALYTICS, VERCEL, VOTE_LOG} from '../overviewFixtures';

const ARTIFACTS: Record<string, unknown> = {
  '/admin-data/vote-analytics.json': ANALYTICS,
  '/admin-data/vote-log.json': VOTE_LOG,
  '/admin-data/vercel-analytics.json': VERCEL,
};

// src/test/setup.ts empties the artifact cache before every test, so each test fetches afresh.
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve(new Response(JSON.stringify(ARTIFACTS[url]), {headers: {'content-type': 'application/json'}})),
    ),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe('OverviewPage', () => {
  it('fills the Overview from the three artifacts and dates it by vote analytics', async () => {
    render(
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', {level: 1, name: 'Overview'})).toBeInTheDocument();
    expect(screen.getByText('Engine calibration, community activity and traffic in one place.')).toBeInTheDocument();
    expect(await screen.findByText('2026-09-30')).toBeInTheDocument();
    expect(await screen.findByRole('region', {name: 'Key figures'})).toBeInTheDocument();
    expect(await screen.findByRole('list', {name: 'Latest votes'})).toBeInTheDocument();
    expect(await screen.findByRole('list', {name: 'Web events'})).toBeInTheDocument();
  });
});
```

- [ ] **Step 25: Run it and watch it fail**

Run: `pnpm vitest run src/tools/analytics/overview/__tests__/OverviewPage.test.tsx`
Expected: FAIL with `Failed to resolve import "../OverviewPage"`.

- [ ] **Step 26: Create the page**

Create `src/tools/analytics/overview/OverviewPage.tsx`:

```tsx
import {PageLayout} from '../../../shell/PageLayout';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {useVercelAnalytics} from '../useVercelAnalytics';
import {useVoteAnalytics} from '../useVoteAnalytics';
import {useVoteLog} from '../useVoteLog';
import {OverviewView} from './OverviewView';

/**
 * Admin's home at /: engine calibration, community activity and traffic at a
 * glance. It reads all three admin-data artifacts (cached for the session in
 * adminData.ts) and hands them to OverviewView with their states. "Data as of"
 * is vote-analytics.json's build date, as on the old analytics page.
 */
export function OverviewPage() {
  const {data: analytics, loading, error} = useVoteAnalytics();
  const {data: voteLog, error: voteLogError} = useVoteLog();
  const {data: vercel, error: vercelError} = useVercelAnalytics();

  const meta = analytics ? (
    <>
      Data as of <code style={{color: ADMIN_COLORS.muted}}>{analytics.generatedAt.slice(0, 10)}</code>
    </>
  ) : undefined;

  return (
    <PageLayout title="Overview" subtitle="Engine calibration, community activity and traffic in one place." meta={meta}>
      <OverviewView
        analytics={analytics}
        analyticsState={{loading, error}}
        voteLog={voteLog}
        voteLogError={voteLogError}
        vercel={vercel}
        vercelError={vercelError}
      />
    </PageLayout>
  );
}
```

- [ ] **Step 27: Run the page test again**

Run: `pnpm vitest run src/tools/analytics/overview/__tests__/OverviewPage.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 28: Add the stories**

Create `src/tools/analytics/overview/OverviewView.stories.tsx`. It has one story per state: the prototype's `dataState` options, plus a vote-log error. Three more stories cover the weekly chart:
- `WeeklyTable` opens the table view. Its `play` function clicks "Table", using the `canvas` and `userEvent` that Storybook 10 hands every play function, so the a11y addon checks the table too.
- `NarrowCard` shows a phone-width column, where the chart keeps only the newest weeks that fit.
- `EarlyLog` shows a young log: four bars, a quiet week, two cap labels (the busiest week isn't the newest), and Rules to review's empty state.

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {MemoryRouter} from 'react-router-dom';
import {FONTS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {OverviewView} from './OverviewView';
import {
  ANALYTICS,
  EARLY_ANALYTICS,
  EMPTY_VOTE_LOG,
  NO_EVENTS,
  NO_RAW_ANALYTICS,
  NO_VERCEL,
  VERCEL,
  VOTE_LOG,
} from './overviewFixtures';

/**
 * A phone-width content column. The weekly chart's frame gets about 298px of
 * it (the panel's padding and border come off), and its plot 250px (less
 * BarChart's 40px gutter and 8px right pad), so weeksThatFit keeps the newest
 * 5 weeks, at 50px a slot.
 */
const NARROW = 340;

const meta: Meta<typeof OverviewView> = {
  title: 'Admin/Insights/Overview',
  component: OverviewView,
  tags: ['autodocs'],
  // The cards link to other pages, so the story needs a router. The frame
  // stands in for PageLayout's body: the admin page colour and padding.
  // .storybook/preview.tsx already mounts AdminStyles for every story.
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div
          style={{
            background: ADMIN_COLORS.page,
            color: ADMIN_COLORS.text,
            fontFamily: FONTS.body,
            padding: `${SPACING.xxl}px ${SPACING.xxxl}px`,
          }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  args: {
    analytics: ANALYTICS,
    analyticsState: {loading: false, error: null},
    voteLog: VOTE_LOG,
    voteLogError: null,
    vercel: VERCEL,
    vercelError: null,
  },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const FullData: Story = {};

/** The weekly card's table view: every week of the window, as a screen reader or a copy-paste wants it. */
export const WeeklyTable: Story = {
  play: async ({canvas, userEvent}) => {
    await userEvent.click(canvas.getByRole('button', {name: 'Table'}));
  },
};

/** At phone width: the cards stack and the weekly chart keeps only the newest weeks that fit. */
export const NarrowCard: Story = {
  decorators: [
    (Story) => (
      <div style={{maxWidth: NARROW}}>
        <Story />
      </div>
    ),
  ],
};

/** A log a few weeks old: four weekly bars with a quiet week, and no rule with 10 score votes yet. */
export const EarlyLog: Story = {args: {analytics: EARLY_ANALYTICS}};

export const Loading: Story = {
  args: {analytics: null, analyticsState: {loading: true, error: null}, voteLog: null, vercel: null},
};

export const NotGenerated: Story = {
  args: {
    analytics: null,
    analyticsState: {loading: false, error: new Error('vote-analytics.json has not been generated yet')},
  },
};

export const NoRawVotes: Story = {args: {analytics: NO_RAW_ANALYTICS, voteLog: EMPTY_VOTE_LOG}};

export const NoVercelData: Story = {args: {vercel: NO_VERCEL}};

export const NoEventsTracked: Story = {args: {vercel: NO_EVENTS}};

export const WebAnalyticsError: Story = {
  args: {vercel: null, vercelError: new Error('vercel-analytics.json: HTTP 500')},
};

export const VoteLogError: Story = {
  args: {voteLog: null, voteLogError: new Error('vote-log.json: HTTP 500')},
};
```

- [ ] **Step 29: Lint and typecheck**

Run: `pnpm lint`
Expected: no errors. While this plan was written, each new file and the edited `VerdictHero.tsx` were checked against the `inkweave/*` and `jsx-a11y` rules with `eslint --stdin`. The chart-kit revision (`WeeklyCard.tsx`, `WeeklyCard.test.tsx`, the stories, and the `overviewStats.ts` and `overviewFixtures.ts` changes) was checked the same way. Lint doesn't resolve imports, so that check ran before R1-3b's files existed.

Run: `pnpm typecheck`
Expected: exit 0. This is the first check that holds `WeeklyCard.tsx` to R1-3b's real prop types. If it fails there, the kit and the plan's "Chart kit (R1-3b)" contract disagree. Follow R1-3b's code, never a cast, and note the difference under Contract additions.

- [ ] **Step 30: Commit** (run with the Bash tool, only after the owner approves)

```bash
git add src/tools/analytics/overview/
USER_APPROVED=1 git commit -m "feat(analytics): build the Overview page (#24)"
```

- [ ] **Step 31: Write the failing route and nav tests**

In `src/router.test.tsx`, as R1-6 left it, make three edits.

First, the nav import. Before:

```tsx
import {NAV_ITEMS} from './shell/nav';
```

After:

```tsx
import {NAV_ITEMS, isWritePath, navItemFor} from './shell/nav';
```

Second, replace R1-6's interim test for `/`, the first test in `describe('admin routes', …)`. Before:

```tsx
  it('sends / to analytics until the Overview exists', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', {level: 1, name: 'Engine Calibration'})).toBeInTheDocument();
    expect(sidebarNav().getByRole('link', {name: 'Analytics'})).toHaveAttribute('aria-current', 'page');
  });
```

After:

```tsx
  it('shows the Overview at /, current in the sidebar', () => {
    renderAt('/');
    expect(screen.getByRole('heading', {level: 1, name: 'Overview'})).toBeInTheDocument();
    expect(sidebarNav().getByRole('link', {name: 'Overview'})).toHaveAttribute('aria-current', 'page');
  });

  it('marks Overview current on / only', () => {
    // NavLink treats to="/" as exact, so the sidebar needs no `end` prop.
    renderAt('/tuning');
    expect(sidebarNav().getByRole('link', {name: 'Overview'})).not.toHaveAttribute('aria-current');
  });
```

Third, append this block at the end of the file:

```tsx

describe('the Overview nav item', () => {
  it('owns / and nothing under it, and writes nothing', () => {
    expect(navItemFor('/')?.id).toBe('overview');
    expect(navItemFor('/no-such-page')).toBeUndefined();
    expect(isWritePath('/')).toBe(false);
  });
});
```

The rest of the file stays as R1-6 wrote it. Its `beforeEach` stubs a `fetch` that never settles, and the Overview's artifact fetches get that stub too. R1-5's `src/test/setup.ts` empties the artifact cache before each test, so no test inherits another's pending promise.

- [ ] **Step 32: Run it and watch it fail**

Run: `pnpm vitest run src/router.test.tsx`. On a fresh clone, run `pnpm build:engine` first, because the write pages import the engine.
Expected: FAIL in the three new tests. R1-6's tests still pass.
- `shows the Overview at /…`: `Unable to find an accessible element with the role "heading" and name "Overview"`, because `/` still redirects to `/analytics`.
- `marks Overview current on / only`: `Unable to find an accessible element with the role "link" and name "Overview"`, because the sidebar has no Overview item yet.
- `owns / and nothing under it…`: `expected undefined to be 'overview'`.

- [ ] **Step 33: Add Overview to the nav**

In `src/shell/nav.ts`, put the Overview entry at the head of `NAV_ITEMS`. Before:

```ts
export const NAV_ITEMS: readonly NavItem[] = [
  {id: 'analytics', label: 'Analytics', mark: 'An', path: '/analytics', group: 'insights', writes: false},
```

After:

```ts
export const NAV_ITEMS: readonly NavItem[] = [
  {id: 'overview', label: 'Overview', mark: 'Ov', path: '/', group: 'main', writes: false},
  {id: 'analytics', label: 'Analytics', mark: 'An', path: '/analytics', group: 'insights', writes: false},
```

Nothing else in the shell changes:
- **`navItemFor`** already gives `/` to its own item only. R1-6's predicate is `pathname === item.path || pathname.startsWith(`${item.path}/`)`, whose second branch would need a path starting `//`. Its JSDoc already says "an item at / owns / alone".
- **The Sidebar** gives its `main` group no label, so this item heads the list as the spec's ungrouped Overview.
- **The Sidebar's `NavLink` needs no `end` prop.** In react-router 7.18.4, a NavLink to `/` is current only at `/`, because its prefix match needs a `/` right after the `to` path (`dist/development/chunk-OB3PAWPO.mjs:10709-10710`). The `/tuning` test pins this.
- **`writes: false`** keeps the branch notice and the token box off the page (R-4).

R1-6's `nav.test.ts` (unique ids and paths, two-letter marks) and its `links every page from the sidebar` router test now cover this entry too.

- [ ] **Step 34: Point the index route at the Overview**

In `src/router.tsx`, as R1-6 left it, make three edits.

First, the react-router import. Before:

```tsx
import {createBrowserRouter, Navigate, type RouteObject} from 'react-router-dom';
```

After:

```tsx
import {createBrowserRouter, type RouteObject} from 'react-router-dom';
```

The index redirect is `Navigate`'s only use, and `noUnusedLocals` (`tsconfig.app.json`) would fail typecheck on it. R1-11 imports it again for the `/analytics` → `/` redirect, and the line it quotes is this one.

Second, the page imports. Before:

```tsx
import {AnalyticsPage} from './tools/analytics/AnalyticsPage';
```

After:

```tsx
import {AnalyticsPage} from './tools/analytics/AnalyticsPage';
import {OverviewPage} from './tools/analytics/overview/OverviewPage';
```

Third, the index route. Before:

```tsx
      // Until the Overview takes / (R1).
      {index: true, element: <Navigate to="/analytics" replace />},
```

After:

```tsx
      {index: true, element: <OverviewPage />},
```

`/analytics` keeps the old page until R1-11 redirects it to `/`. The edited file passes `eslint` as written.

- [ ] **Step 35: Run the route and shell tests again**

Run: `pnpm vitest run src/router.test.tsx src/shell`
Expected: PASS. R1-6's `nav.test.ts` and `Sidebar.test.tsx` pass unchanged with the new entry.

- [ ] **Step 36: Full verification**

Run: `pnpm lint`
Expected: no errors.

Run: `pnpm typecheck`
Expected: exit 0.

Run: `pnpm test:run`
Expected: PASS, with all of these green:
- `verdict.test.ts`, `overviewStats.test.ts`, `OverviewView.test.tsx`, `WeeklyCard.test.tsx`, `OverviewPage.test.tsx` and `VerdictHero.test.tsx`
- R1-3b's `src/charts` tests
- `router.test.tsx`
- the `src/shell` tests

- [ ] **Step 37: Look at the stories**

Run `pnpm storybook` and open **Admin/Insights/Overview** at `http://localhost:6007`. Step through these stories: FullData, WeeklyTable, NarrowCard, EarlyLog, Loading, NotGenerated, NoRawVotes, NoVercelData, NoEventsTracked, WebAnalyticsError and VoteLogError. Check these things:
- KPI cards wrap at narrow widths, and the long Vercel secret names break inside their card.
- As the canvas narrows, the weekly chart drops its oldest weeks. It keeps the accented newest week at the right and never scrolls sideways. In NarrowCard every x label and the gap under it fit their slot without touching a neighbour.
- In FullData only one bar prints a total: Sep 28 is both the newest and the busiest, so 'extremes' labels it once. EarlyLog prints two, Sep 21 (the busiest) and Sep 28 (the newest), and its quiet week, Sep 14, has an empty slot with no gap under its date.
- The gap under each date is red for a negative gap and green for a positive one, and the week of Aug 10 (quick votes only) has none. No other chart text is coloured, and the single series has no legend.
- Hovering a bar shows "Week of …" with Votes and Mean gap, values first. Tab to the plot and press ←, →, Home and End: the same tooltip follows the keyboard. The tooltip stays inside the card at both ends, and it goes when the pointer leaves.
- WeeklyTable shows Week, Votes and Mean gap for all 12 weeks. NarrowCard's table still has all 12 rows.
- With reduced motion turned on (the OS setting, or DevTools' "Emulate CSS prefers-reduced-motion"), the bars and the tooltip appear without a transition.
- There are no a11y-addon violations, in the table view too.

Stop Storybook before committing: a running server can starve the pre-commit Vitest workers.

- [ ] **Step 38: Commit** (run with the Bash tool, only after the owner approves)

```bash
git add src/router.tsx src/router.test.tsx src/shell/nav.ts
USER_APPROVED=1 git commit -m "feat(shell): open the Overview at / (#24)"
```

<!-- rejected: note 1, in part. R1-6's draft, the shell code this task builds on, ships NAV_ITEMS = analytics, tuning, reveal, image with no Overview entry, and its index route is `<Navigate to="/analytics" replace />`. R1-11 assumes that R1-8 adds `overview`. So the nav step stays, now Step 33, rewritten as an exact before/after, and `src/shell/nav.ts` stays in Files and in the commit. The `/analytics` → `/` redirect belongs to R1-11 (R1-6 keeps the old page at `/analytics`), so that router test moved out of this task rather than having its failure reworded. The rest of note 1 is applied: Step 31 names the exact test it replaces, Step 34 quotes the real before lines (and drops the now-unused `Navigate` import), the Sidebar `end` step and the `navItemFor` conditional are gone, and `src/shell/Sidebar.tsx` is out of Files and the commit. -->
<!-- rejected: note 5. R1-5 (revised) adds `beforeEach(() => resetAdminDataCache())` to src/test/setup.ts, which Vitest runs before every test in every file, and lists src/router.test.tsx as covered. A per-file reset would duplicate it, so OverviewPage.test.tsx drops its own reset too. -->
<!-- also: R1-11, not R2, is the first reader of ?rule=, so the Tune bullet, Produces and RulesToReviewCard's JSDoc now say so. While reading sibling drafts, I created one helper script in the session scratchpad (last.cjs). No repo file was touched. -->
<!-- revised 2026-10-01 (R-12): the weekly card moved onto R1-3b's chart kit (ChartFrame + BarChart, emphasis on the newest week, 'extremes' cap labels, gap sub-labels, tooltip, table view). weeksThatFit and its tests are unchanged; overviewStats exports WEEKS_SHOWN; WeeklyCard.test.tsx and Step 18b are new; step numbers 1-38 are unchanged because R1-11 quotes Step 34. -->
<!-- review round (chart kit), 2026-10-01: notes 2-11 applied, and note 1 in part (below). Note 2 took option (b): R1-3b exports BAR_Y_AXIS_WIDTH (Contract additions) and WeeklyChart subtracts it, so the card stays right whether the kit's y ticks sit in a gutter or inside the plot. Note 4 added one WeeklyCard test (all three states, one h2), so WeeklyCard.test.tsx now has 7 tests. -->
<!-- rejected (chart-kit round): note 1, in part. The new reading names OverviewView.test.tsx only. OverviewPage.test.tsx never queries the chart (it checks the h1, the subtitle, "Data as of", Key figures, Latest votes and Web events), so a BarChart that waited for its first measurement would not fail it. -->
<!-- cross-task round, 2026-10-01: R1-3b's "For R1-8" request applied. COLUMN_MIN is 40, so a slot with its SPACING.xs of air is 44px, enough for "Sep 28" and the gap under it; weeksThatFit counts plot / 44, and WeeklyChart hands it the frame less BAR_Y_AXIS_WIDTH and the 8px right pad. Step 7's weeksThatFit case, Step 13's narrow-card test (a 460px plot) and the NARROW story comment follow; overviewStats.test.ts still counts 24 tests. -->
