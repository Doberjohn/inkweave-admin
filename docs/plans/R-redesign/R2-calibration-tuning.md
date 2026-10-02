> Part of [R: Admin redesign](../R-redesign.md). Read its decisions, corrections to the spec, global constraints and shared interfaces first.

## Phase R2: Calibration & tuning (outline)

> **Contract additions** (to "Shared interfaces (R1)". These add names and rename nothing):
> 1. **`src/shell/PageLayout.tsx`: `flush?: boolean`.** With it, children go straight into the scrolling body, with no padding and no grid: a `FLUSH_BODY` style keeps `BODY`'s scroller (`flex: 1`, `minHeight: 0`, `overflowY: 'auto'`) and drops its grid and padding. R1-6's `BODY` is both the scroller and the padded grid, so there is no inner wrapper to skip. R2-6 adds it, with two tests. Only R2 and R4 use it: R2 for the full-height tuning aside, R4 for the studio container.
> 2. **`src/shell/nav.ts`: `export function calibrationHref(ruleId?: string): string;`.** It returns `'/calibration'`, or `'/calibration?rule=' + encodeURIComponent(ruleId)`. No R1 task creates it, so R2-6 adds it to `nav.ts` (its Files list has the code), and R2-6's nav test checks it. R1-8's Overview "Tune" link builds the same URL inline (`` `/calibration?rule=${encodeURIComponent(r.ruleId)}` ``), so the two agree; moving that link onto `calibrationHref` is optional and outside R2. R2's page reads `?rule=`.
> 3. **`src/tools/analytics/verdict.ts`: owned and written by R1-8.** It exports `CALIBRATION_BAND`, `SCALE_CLAMP`, `Verdict`, `verdictFor` and `scalePercent`, and R1-8 writes its test, `src/tools/analytics/__tests__/verdict.test.ts`. So the band keeps a test after R2-7 deletes `VerdictHero.test.tsx`. R2 only imports from it.
> 4. **Dropped: `resetGithubTokenStore`.** R1-4's store reads `localStorage` on every snapshot unless a failed write set `memoryOnly`, and no R2 test makes a write fail. Clearing `localStorage` in `afterEach` is enough, so R2-6's tests need no reset and `useGithubToken.ts` gains nothing.
> 5. **`src/charts/ScatterChart.tsx` and `src/charts/scatter.ts`: a scatter chart joins the kit (R2-4a).** It goes into "Chart kit (R1-3b)" when the plan is assembled. It builds only on kit names (`linear`, `SeriesDef`, `ChartTooltip`, `TooltipContent`, `useChartCursor`) and renames nothing:
>    ```ts
>    // src/charts/scatter.ts
>    export const HIT_RADIUS = 24;                                     // px: the pointer only has to be closest, within this of a dot's centre
>    export const SCATTER_MARGIN: {readonly top: 24; readonly right: 16; readonly bottom: 40; readonly left: 32}; // the `as const` object
>    export interface ScatterLayout {width: number; height: number; left: number; top: number; side: number; x: (v: number) => number; y: (v: number) => number}
>    export function scatterLayout(width: number, xDomain: readonly [number, number], yDomain: readonly [number, number]): ScatterLayout; // a square plot
>    export function jitterOffset(key: string, amount: number): [number, number];  // fixed per key, each axis within ±amount
>    export function diagonalJitter(key: string, along: number, across: number): [number, number]; // fixed per key; y − x moves by at most `across`
>    export function nearestPoint(points: ReadonlyArray<{px: number; py: number}>, x: number, y: number, radius: number): number | null;
>    export function scatterOrder<T extends {key: string; x: number; y: number}>(points: readonly T[]): T[]; // x, then y, then key
>
>    // src/charts/ScatterChart.tsx
>    export interface ScatterPoint {key: string; x: number; y: number; series: string; label: string} // label: the cursor's aria-valuetext
>    export interface ScatterChartProps {
>      points: readonly ScatterPoint[];          // drawn in this order: the last sit on top
>      series: readonly SeriesDef[]; ariaLabel: string;
>      xDomain: readonly [number, number]; yDomain: readonly [number, number];
>      xTicks: readonly number[]; yTicks: readonly number[]; xLabel: string; yLabel: string;
>      tickFormat?: (n: number) => string;      // default String
>      diagonal?: string;                        // draws y = x, labelled with this text
>      jitter?: number;                          // data units, default 0
>      jitterAlong?: 'both' | 'diagonal';        // default 'both'; 'diagonal' uses diagonalJitter(key, jitter, jitter / 5)
>      tooltip: (point: ScatterPoint) => TooltipContent;
>      selectedKey?: string | null; onSelect?: (key: string) => void; // with onSelect, click and Enter/Space select
>    }
>    export function ScatterChart(props: ScatterChartProps): JSX.Element;
>    ```
> 6. **`src/charts/LineChart.tsx`: what the weekly gap trend (R2-4c) needs.** Checked against R1-3b's task file (`R1-03b-chart-kit.md`, Step 27).
>    - **Already in R1-3b (its own contract addition), so R2-4a only checks for them:**
>      - `LinePoint.y` is `number | null`. A null keeps its x on the axis and breaks the line, so a week with no score votes shows as a gap, not as a zero or a straight line across it. The crosshair still stops there, and the tooltip prints "—".
>      - A non-null point whose neighbours are both null gets a dot of its own (`circle[data-lone]`, r 4), and the series' last point gets the ringed end dot (`circle[data-end]`). So a scored week between two quiet ones still shows.
>    - **Added by R2-4a, as quoted edits to R1-3b's `LineChart.tsx`:**
>      - `yDomain?: readonly [number, number]`. With it, the y scale spans exactly that domain. The ticks follow it as they follow the computed one: both ends, and 0 between them when it crosses zero. Without it, LineChart keeps its own scale (0 and the baseline always inside, a clean top).
>      - `fixedGutters?: boolean`, with `export const LINE_Y_AXIS_WIDTH` and `export const LINE_END_WIDTH` (48px each, `SPACING.xxxl + SPACING.lg`). With it, the plot sits between those fixed gutters instead of the room its own tick and end labels need. R1-3b sizes both gutters to the labels ("−0.50" needs more room than "120"), so two LineCharts over the same weeks only put a week at the same x when both set it. It is the line chart's counterpart to R1-8's `BAR_Y_AXIS_WIDTH`.
>    - Existing callers pass neither, so they compile and draw as before.
>    - **When the plan is assembled,** the main plan's "Chart kit (R1-3b)" contract should read `export interface LinePoint {x: string; y: number | null}` (R1-3b's widening), and `LineChart`'s props gain `yDomain?: readonly [number, number]` and `fixedGutters?: boolean`, with the two constants beside it. If R1-3b absorbs these edits and addition 7's then, drop R2-4a's Steps 2 to 4 (the kit tests and edits).
> 7. **`src/charts/ChartLegend.tsx`: `mark: 'rect' | 'line' | 'dot'`.** `'dot'` keys each series with a filled circle, so the scatter's legend mirrors its dots (dataviz: a legend mirrors its mark). R2-4a adds it as a quoted edit to R1-3b's `ChartLegend.tsx`, with a test. Existing callers pass `'rect'` or `'line'` and draw as before.

**Goal.** Build one page at `/calibration`.
- **Left column:** the calibration analytics. They need no token.
- **Right aside:** the tuning editor, behind a token gate.
- **Charts (decision R-13):** a calibration scatter, a gap histogram and a weekly gap trend in the left column. They use the R1 chart kit plus a new `ScatterChart`, and the selected rule scopes all three.
- **`/tuning`:** redirects to the page.
- **Retired:** `CalibrationView`, `VerdictHero`, `Scorecard`, `WeeklyActivityChart`, `RuleCalibrationTable`, `RuleSelector`, `TuningEditor` and `TuningPage`.
- **Unchanged logic:** logic, validation and the conflict checks stay in `useTuningAdmin`, `useLiveTuning` and `githubClient.ts`. R2-2 adds `reset` and rewords the stale-value message; nothing else in them changes.

**How a rule finds its tuning entry (checked at pin `5a54ee90`).**
- **Where the analytics rules come from.**
  - `loadRuleRoster()` lives in `scripts/precompute-vote-analytics.mjs:85-89`, not in `scripts/lib/voteAnalytics.mjs`. It maps the engine's `getAllRules()` to `{ruleId, ruleName, category}`.
  - `rollUpByRule` (`scripts/lib/voteAnalytics.mjs:91-116`) passes only those three fields through.
  - `RuleStat` (`src/tools/analytics/voteAnalyticsTypes.ts:27-36`) has no `playstyleId`.
- **Where the engine defines it.**
  - `getAllRules` and `getRuleById` are at `upstream/inkweave/packages/synergy-engine/src/engine/rules.ts:1456` and `:1471`, exported from `src/index.ts`.
  - `PlaystyleSynergyRule.playstyleId` is at `types/synergy.ts:23-26`.
  - `createLocationRule` gives every `location-*` rule `playstyleId: 'location-control'` (`rules.ts:495`). Lore Loss gets `'lore-denial'` (`rules.ts:1011`).
- **What `tuning.json` holds.** `TuningConfig` (`data/tuning.ts`) has 22 `playstyles` keys and one `directRules` key, `shift-targets`. `ruleTexts` holds `shift-targets` and `ramp`.
- **How the ids line up.**
  - The engine has 37 rules. For 10 of them the id differs from the tuning key: `lore-loss` and the nine `location-*` rules.
  - Six direct rules have no entry at all: `named-companions`, `singer-songs`, `spike-suit`, `merida-archer`, `merida-wisp`, `free-play`.
  - Going through `playstyleId`, all 23 tuning keys are reached.
- **Where admin reads `playstyleId`.**
  - Admin already imports the engine at runtime (`src/tools/reveal/validateForm.ts:1`). The mapping reads `playstyleId` from the pinned engine in the browser, with no pipeline change.
  - The engine also supplies the `tuning.json` section (playstyle or direct). The artifact is built from app master and the pin can lag, so taking the key from one and the section from the other could disagree.
  - Open question 1 covers the alternative.

**Page model.**
- **Selection.** The selected row lives in `?rule=` (`useSearchParams`, `replace: true`). That way the Overview's "Tune" link works and a reload keeps the selection.
  - `?rule=` may name a tuning key (`location-control`). `findRow` resolves it to a row, and the table, the deselect check and the pair scope all use that resolved row's id.
  - The selected pair is derived state: `{ruleId, pair}`, shown only while `ruleId` matches the resolved row. A rule change from any source drops it without an effect. Sources include a click, the sidebar link and the Overview link.
  - The pair list and the scatter set that same pair. A dot picked on the scatter opens the pair's votes just as a list row does. The list also shows the pair pressed, appended at its end when it sits below the 40 widest.
- **Rule list.** The list is `buildCalibrationRows(analytics?.rules ?? null, liveConfig)`: the analytics rows plus any `tuning.json` entry that no rule reaches. With no analytics, it is `tuning.json` alone.
- **Token.** Without a token, the left column renders in full and only the aside shows the gate. The sidebar token box appears, because `/calibration` now writes.
- **Hooks.**
  - `useLiveTuning` and `useTuningAdmin` both need a token. A small `TunedWorkspace({token, ...rest})` calls both and renders `CalibrationWorkspace` with `tuning={{live, admin}}`.
  - Once a token is saved, the page renders `TunedWorkspace` with `key={token}`. Otherwise it renders `CalibrationWorkspace tuning={null}`.

**Charts (decision R-13; checked at pin `5a54ee90` and against `scripts/lib/voteAnalytics.mjs`).**
- **Where they sit.** They go in the left column of README section 3, in this order (R2-6 has the layout):
  1. the analytics notice;
  2. the rules table;
  3. **the scope row** (new): `pairsHeading(selected)`, plus "Show all pairs" while a rule is selected. It is the one filter row above everything the rule scopes.
  4. **the charts row** (new): "Engine vs community" (the scatter) beside "Gap distribution" (the histogram). They sit two-up from about 700px and stack below that.
  5. the pair list and the votes;
  6. **"Weekly gap"** (new), full width;
  7. dimension participation, with the scope line "All votes, whatever the rule". It sits below the scope row, but `global.dimensionFill` can't be scoped by rule, so the panel says it reads every vote (dataviz: a filter scopes what is below it, so anything it doesn't scope says so).

  The aside doesn't change.
- **What feeds them.**
  - **`pairs[]` is complete.**
    - `buildAnalytics` (`scripts/lib/voteAnalytics.mjs:217-224`) sorts every gap-defined pair by |gap| and truncates nothing.
    - `fetchAllRows` (`scripts/precompute-vote-analytics.mjs:54-64`) pages past PostgREST's 1,000-row cap, so every `pair_scores` row arrives.
    - Two kinds of pair stay out by design. Pairs without a score vote are dropped: `computePairRecord` returns null at `:23`. Engine-silent pairs are dropped because they have no engine score (`buildPairRecords`, `:62-72`). The artifact counts them in `global.engineSilentPairs`, and the scatter's footnote gives that count on the all-pairs scope.
    - The only cap is the client's `MAX_PAIRS` (40), and it applies to the pair list alone. The charts read the uncapped scope, `pairsInScope` (R2-1).
    - Each record also carries `accuracySentiment` and `engineSilent` (`:40-42`), which `PairStat` doesn't declare. Nothing here needs them.
  - **Scatter and histogram:** `pairsInScope(analytics.pairs, selected)`.
  - **Weekly trend:** the vote log joined to that same scope (`weeklyGaps`, R2-4b). It doesn't read `global.weekly`, for three reasons.
    - `global.weekly` (`bucketWeekly`, `:128-153`) can't be scoped by rule.
    - Its `votes` also count unscored votes.
    - It leaves quiet weeks out.

    `weeklyGaps` keeps its definition of a week's gap: each scored vote's `score − engineScore`, all weighted equally. So with no rule selected it reproduces `global.weekly`'s `meanGap`. The trend's second plot counts the score votes behind each mean. `global.weekly` stays the Overview's source. The trend needs raw votes, as dimension participation does.
- **Engine scores are whole numbers, and that drives three decisions.** A pair's engine score is the highest of its connections' scores (`SynergyEngine.ts:21-24`). Rules score in tiers, capped at 10. Most pairs have one vote, so most sit on one of about 100 whole-number spots, and most gaps are whole numbers.
  - **Overlap: opaque dots, jitter, rings and a nearest-point layer (decided; the planning brief suggested partial opacity).**
    - Partial opacity can't show a stack of dozens of dots: it saturates after a few.
    - At any opacity low enough to show stacking, the neutral and red dots also fall below 3:1 against the card. `barNeutral` at 0.85 is 2.66:1, and `over` at 0.7 is 2.96:1. That fails WCAG 1.4.11, the bar R1-2's theme test holds every chart fill to. At their token values (`barNeutral` is itself 0.7 alpha) R1-2 already measures them at 3.3:1, 4.95:1 and 10.7:1.
    - So the dots stay opaque, and four things handle the overlap.
      - **Each dot sits on its own opaque disc in `page`**, 2px wider than the dot. So `barNeutral`'s alpha composites over the page colour alone, never over the dots beneath it: the neutral dot is exactly the validator's `#63637d`, and a neutral dot over a red one never reads pink-grey. The disc is also the 2px ring, which keeps every overlapped edge visible. A centred stroke would cover half of it and leave r 3 of fill, under the r ≥ 4 mark spec.
      - **A fixed jitter along the diagonal**, seeded by the pair so a dot never moves, spreads each stack into a short dash parallel to y = x. A dot slides up to ±0.35 on both axes together and at most ±0.035 across the line (`diagonalJitter`, with `SCATTER_JITTER = 0.35`). So y − x, the gap the chart is read for, moves by at most 0.07, and a dot's distance from the line stays within 0.07 of its gap. A square jitter of ±0.25 on each axis would move y − x by up to ±0.5, the whole agreement band: a pair with gap 0 could sit half a point off the line, and a red pair at −0.5 on it. Spots off the diagonal sit on parallel dashes about 0.6 of a point apart; spots on the same diagonal keep about a quarter point clear on each axis.
      - The widest gaps draw last, on top.
      - The tooltip says how many pairs share the dot's exact scores, and the table view gives exact values.
    - The hit layer is nearest-point: the pointer only has to be closest, within 24px of a dot's centre (a 48px target).
  - **Dot size: one size for every pair (decided).**
    - Sizing by votes would mostly say "one vote", since most pairs have one.
    - The few pairs with more votes would grow over their neighbours. They are already the dots off the lattice, because their community score is an average.
    - Area also reads poorly and needs a size legend.
    - Votes are in the tooltip and the table. Open question 9 offers a votes filter instead.
  - **Histogram bins one point wide (decided; the planning brief suggested half a point).**
    - There are eleven bins, centred on −5 … +5; the end bins hold everything beyond.
    - Half-point bins would draw a comb: full bins on the whole numbers, nearly empty ones between them.
    - A gap on a half point counts in the bin further from zero. That makes the centre bin exactly the agreement band, |gap| < 0.5: `CALIBRATION_BAND`, the band `verdictFor` reads.
    - `GAP_BIN_LIMIT` and `gapBinCenter` keep that rule in one place.
- **Colour (R-15).**
  - **The split.** The scatter and the histogram share one three-way split by side:
    - "Engine higher (gap ≤ −0.5)" in `over`;
    - "Within ±0.5" in `barNeutral`, the neutral centre;
    - "Community higher (gap ≥ +0.5)" in `under`.

    This is the score-band trio R1-2 already measures for 1.4.11, so the theme test needs no new line.
  - **Selection.** The selected dot keeps its fill and gains an `accent` ring, with size as a second cue.
  - **The validator** (the `dataviz` skill's `scripts/validate_palette.js`, 2026-10-01; `#63637d` is `barNeutral` composited on the page, `#12121a` the card):
    ```
    node scripts/validate_palette.js "#ef4444,#63637d,#4ade80" --mode dark --surface "#12121a" --pairs all
      [FAIL] Lightness band       outside band: #4ade80 (0.8)
      [FAIL] Chroma floor         below floor (reads gray): #63637d (0.041)
      [PASS] CVD separation       worst all-pairs #63637d↔#ef4444 ΔE 10.3 (protan) · tritan 29.5
      [PASS] Normal-vision floor  worst all-pairs #63637d↔#ef4444 ΔE 25.3 (normal)
      [PASS] Contrast vs surface  all 3 >= 3:1
    ```
  - **Why the two fails stay.**
    - Green's lightness is the app's `success` (R-15).
    - The neutral's low chroma is its job: a diverging midpoint has to read as "nothing".
  - **The gold.** Gold against green measures ΔE 7.9 (protan), a WARN. Gold only ever draws the selection ring, never a fill.
  - **Other cues.** Every mark also carries its position, the legend and the table.
  - **Text.** Gap text keeps `gapColor`, as status text. Every other chart text uses text tokens.
- **The weekly trend: two plots, one y axis each.**
  - **The gap plot** is a LineChart with `baseline={0}`, a symmetric `yDomain` (`gapDomain`) and the accent line.
  - **The votes plot** sits under it: a short LineChart area of score votes, in `barNeutral`.
  - **Why two LineCharts:** they share the same weeks, so a week sits at the same x in both. A small BarChart would put its bars half a band off the line's points.
  - **Both set `fixedGutters`** (contract addition 6). R1-3b's LineChart sizes its gutters to its own labels, and "+1.50" is wider than "120", so without it the same week would fall at different x in the two plots.
  - **One frame:** one ChartFrame holds both plots, with one table (week, mean gap, score votes). A caption names each plot: "Mean gap" and "Score votes".
  - **No range control:** the trend spans the whole log. The scatter and the histogram are all-time aggregates, so a range could only move the trend. That is R-9's reasoning for Web analytics.
- **The dataviz checklist, as applied.**
  - **Legends:** the scatter and the histogram each have three series and a `ChartLegend` whose key mirrors the mark: `mark="dot"` on the scatter (contract addition 7), `mark="rect"` on the histogram. Each trend plot has one series and is named by its caption.
  - **Direct labels:** only the diagonal's "Engine = community". The histogram's subtitle carries the summary shares (`capLabels="none"`).
  - **Hover:** on by default. The scatter tooltips the nearest dot; the other charts use the kit's per-bar tooltip and crosshair.
  - **Keyboard:** the scatter is one slider. ←/→/Home/End walk the dots left to right, and Enter or Space selects the dot the slider announces. Its value text carries what the eye gets: the tooltip's "pairs on these scores" and ", selected" on the selected dot. The app's global `:focus-visible` outline (`index.css`, through the bridge) rings it.
  - **Table views:** every chart has one, so a tooltip is never the only place a value appears.
  - **Motion:** ScatterChart has none, so reduced motion needs nothing from it. The LineCharts follow R1-3b.
  - **Scale:** the scatter draws one SVG circle per pair, which is fine at a few thousand pairs. The R1-12 real-data check gives the real count.

**Review findings this phase closes:**
- rule-id-mismatch
- tuning-depends-on-analytics
- editor-content-model
- score-stepper
- token-gate-scope (both reviews)
- missing-load-publish-states
- write-result-states
- routes-and-deeplink
- row-keyboard-a11y
- tray-and-notice-polish
- tables-as-div-grids (rules and votes keep `<table>`)

Every task ends with the standard commit step, run with the Bash tool and only after the owner approves:
```bash
git add <paths>
USER_APPROVED=1 git commit -m "<message below>"
```
Run tests with `pnpm vitest run <path>`. On a fresh checkout, run `pnpm build:engine` first. Every task also runs `pnpm lint` and `pnpm typecheck`.

### Task R2-1: Calibration model (rule rows, tuning-key mapping, pairs)

**Files:**
- Create `src/tools/analytics/calibration/calibrationModel.ts`
- Test `src/tools/analytics/calibration/__tests__/calibrationModel.test.ts`

**Interfaces:**
- **Consumes:**
  - `RuleStat`, `PairStat` and `GlobalStats` from `voteAnalyticsTypes.ts`
  - `VoteLogRow`
  - `PendingEdit` (`src/tools/tuning/useTuningAdmin.ts:5-13`)
  - `getRuleById` and `TuningConfig` from `inkweave-synergy-engine`
  - `fmtGap` and `fmtInt` from R1's `src/ui/format.ts`
  - `verdictFor` from R1's `src/tools/analytics/verdict.ts` (contract addition 3)
- **Produces:**
```ts
/** Below this many score votes a rule's number is statistically thin. */
export const LOW_N = 10;
/** Most gaps are near zero; the widest-gap pairs first surface the outliers worth reviewing. */
export const MAX_PAIRS = 40;
export type RuleSortKey = 'gap' | 'votes';
export interface CalibrationRow {id: string; name: string; category: 'playstyle' | 'direct'; stat: RuleStat | null; tuningKey: string | null}
export function tuningKeyFor(rule: Pick<RuleStat, 'ruleId' | 'category'>, config: TuningConfig): string | null;
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
export function pairsHeading(row: CalibrationRow | null): string;
export function calibrationSubtitle(global: GlobalStats | null): string;
```
The mapping, as proposed. It passes `pnpm exec eslint --stdin`:
```ts
/**
 * The tuning.json key that holds a rule's copy, or null when there is none. A
 * playstyle rule's copy lives under its engine playstyleId (lore-loss under
 * lore-denial, every location-* rule under location-control), a direct rule's
 * under its own id. Both the key and the section come from the pinned engine,
 * so they always agree even when the artifact (built from app master) is ahead
 * of the pin; a rule the pin doesn't know yet falls back to its own id and the
 * artifact's category.
 */
export function tuningKeyFor(rule: Pick<RuleStat, 'ruleId' | 'category'>, config: TuningConfig): string | null {
  const engineRule = getRuleById(rule.ruleId);
  const category = engineRule?.category ?? rule.category;
  const key = engineRule?.category === 'playstyle' ? engineRule.playstyleId : rule.ruleId;
  const entries = category === 'playstyle' ? config.playstyles : config.directRules;
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

/** Tuning keys with a pending edit. path[1] is the key in all three sections (ruleTexts.ramp belongs to ramp). */
export function editedKeys(pending: PendingEdit[]): Set<string> {
  return new Set(pending.map((edit) => String(edit.path[1])));
}
```
The scope helpers the charts add, as proposed. They pass `pnpm exec eslint --stdin`:
```ts
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
```

**Tests** (`calibrationModel.test.ts`):
- **`tuningKeyFor`:**
  - It maps `lore-loss` to `lore-denial`, and `location-boost` to `location-control`.
  - It maps `ramp` to `ramp`, and the direct rule `shift-targets` to `shift-targets`.
  - It returns null for `singer-songs`, a direct rule with no entry.
  - It takes the section from the pinned engine. `{ruleId: 'lore-loss', category: 'direct'}` still maps to `lore-denial`.
  - For a rule the pinned engine doesn't know, it falls back to the rule's own id and the artifact's category, when `tuning.json` has an entry under that id.
  - It returns null for the ruleId `constructor`; inherited keys don't count.
- **Pin-bump contract test:** with stats built from every `getAllRules()` rule and the bundled `TUNING`, every `tuning.json` key is reached and no tuning-only row is added.
- **`buildCalibrationRows`:**
  - Without analytics, the rows are the `tuning.json` entries, playstyles then direct rules, each with `stat: null`.
  - Without a config, the rows are the analytics rules with `tuningKey: null`.
  - A `tuning.json` entry that no analytics rule reaches is appended as a tuning-only row.
- **`sortCalibrationRows`:** orders by |gap|, then by votes. A null gap counts as 0. Tuning-only rows come last.
- **`findRow`:** matches the id first, then the tuning key (`location-control` finds the first `location-*` row). An unknown id or null returns null.
- **`rowsSharingKey`:** `rowsSharingKey(rows, 'location-control')` returns the nine location rows.
- **`editedKeys`:** maps `['ruleTexts','ramp','scores','x']` to `ramp`, and `['ruleTexts','shift-targets','curve.gap3','score']` to `shift-targets`.
- **`pairId`:** gives `'1|2'` for both `('1', '2')` and `('2', '1')`.
- **`pairsInScope`:**
  - a null row gives every pair, widest gap first and uncapped: 45 pairs in, 45 out;
  - a row with no stat gives `[]`;
  - a rule row gives only the pairs that rule fired on.
- **`pairsFor`:**
  - a null row gives every pair, widest gap first, capped at 40;
  - a row with no stat gives `[]`;
  - a rule row gives only the pairs that rule fired on.
- **`findPair`:**
  - finds the scope's record for a selection given either way round;
  - gives null without a selection, and for a pair outside the scope.
- **`withSelectedPair`:**
  - appends the selected pair when it is 41st in the scope, so the list has 41 rows with it last;
  - leaves the 40 alone when the selection is already among them, or when nothing is selected.
- **`votesForPair`:** returns only the selected pair's votes, and `[]` without a pair. It also matches a vote stored the other way round (`a: '2', b: '1'` for the pair `1|2`).
- **`pairsHeading`:**
  - with no row, it gives "All pairs";
  - a rule row gives "Ramp · gap −0.57 · 557 votes", with U+2212;
  - a tuning-only row gives "Locations · no score votes yet".
- **`calibrationSubtitle`:** gives "Mean gap −0.30 · well-calibrated · 2,054 votes". With null it gives "No vote analytics yet", because nothing says `tuning.json` is loaded.

**Commit:** `feat(calibration): map analytics rules to tuning.json entries (#24)`

### Task R2-2: Tuning rows, publish-failure kinds, `reset`

**Files:**
- Create `src/tools/tuning/tuningRows.ts`. It takes `RowSpec`, `shiftTierRows`, `rampRows` and `rowsForSelection` verbatim from `src/tools/tuning/components/TuningEditor.tsx:17-67`, now exported.
- Modify `src/tools/tuning/components/TuningEditor.tsx:17-67`:
  - delete `RowSpec`, `shiftTierRows`, `rampRows` and `rowsForSelection`;
  - add `import {rowsForSelection, type RowSpec} from '../tuningRows';`.
  - `TuningEditor` keeps rendering from these until R2-7 deletes it.
- Create `src/tools/tuning/publishFailure.ts`.
- Modify `src/tools/tuning/useTuningAdmin.ts`:
  - `:34-44` (the result type);
  - `:71-73` (next to `clear`);
  - `:105-115` (the return).
- Modify `src/tools/tuning/githubClient.ts:42`. The stale-value message no longer says to reload the page, since the aside offers a "Reload tuning.json" button. The substring "changed since the editor loaded it" stays, so `publishFailureKind` still matches.
  - Before: ``  `${path.join('.')} changed since the editor loaded it (now ${JSON.stringify(node[key])}). Reload the page and make the edit again.`, ``
  - After: ``  `${path.join('.')} changed since the editor loaded it (now ${JSON.stringify(node[key])}). Reload tuning.json and make the edit again.`, ``
- Modify `src/tools/tuning/__tests__/githubClient.test.ts:38`:
  - Before: `).toThrow('ruleTexts.ramp.scores.density changed since the editor loaded it (now 7). Reload the page and make the edit again.');`
  - After: `).toThrow('ruleTexts.ramp.scores.density changed since the editor loaded it (now 7). Reload tuning.json and make the edit again.');`
- Test:
  - Create `src/tools/tuning/__tests__/tuningRows.test.ts`.
  - Create `src/tools/tuning/__tests__/publishFailure.test.ts`.
  - Add a case to `src/tools/tuning/__tests__/useTuningAdmin.test.ts`.

**Interfaces (Produces):**
```ts
export interface RowSpec {label: string; textPath?: (string | number)[]; textValue?: string; scorePath?: (string | number)[]; scoreValue?: number}
export function rowsForSelection(config: TuningConfig, selectedId: string): RowSpec[];
export function tuningName(config: TuningConfig, key: string): string;
export function tuningKind(config: TuningConfig, key: string): 'playstyle' | 'direct';
export function pendingLabel(ruleName: string, rowLabel: string, field: 'text' | 'score'): string;
export type PublishFailureKind = 'stale-value' | 'other';
export function publishFailureKind(message: string): PublishFailureKind;
// UseTuningAdminResult gains:
reset: () => void; // clears pending, result and error
```
The new helpers, as proposed. Both files pass `pnpm exec eslint --stdin`:
```ts
// tuningRows.ts, below rowsForSelection
/** The display name of a tuning.json entry: its playstyle title or direct-rule label, else the key. */
export function tuningName(config: TuningConfig, key: string): string {
  return config.playstyles[key]?.name ?? config.directRules[key]?.name ?? key;
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
```ts
// publishFailure.ts
export type PublishFailureKind = 'stale-value' | 'other';

/**
 * What a failed publish asks of the user. A stale value (applyTuningEdits
 * refused an edit because tuning.json changed after it was read) needs a
 * reload before the edit can be made again. Anything else, the branch moving
 * mid-publish included, keeps the edits, and its message says what to do.
 */
export function publishFailureKind(message: string): PublishFailureKind {
  return message.includes('changed since the editor loaded it') ? 'stale-value' : 'other';
}
```
There are two kinds, not three. The branch-moved message (`src/github/githubCommit.ts:161`) already ends "Publish again.", the edits stay pending and Publish stays enabled, so the UI needs nothing extra for it.

`reset`, next to `clear` in `useTuningAdmin.ts`:
```ts
  /** Drops every pending edit and the last publish's outcome, so a reload starts clean. */
  function reset() {
    setPending([]);
    setResult(null);
    setError(null);
  }
```

**Tests:**
- **`rowsForSelection`:**
  - A playstyle gives Title and Tagline.
  - A direct rule gives Label and Description.
  - `shift-targets` adds one row per tier, with a score path only on tiers that have a score.
  - `ramp` adds the score rows, then the template rows.
  - An unknown key gives `[]`.
- **`tuningName` and `tuningKind`:**
  - Both read playstyles before direct rules.
  - `tuningName(TUNING, 'shift-targets')` is "Shift Targets", and doesn't throw on a direct-rule key.
  - `tuningName(TUNING, 'nope')` is `nope`.
- **`pendingLabel`:** gives "Shift Targets · curve.gap3 · score".
- **`publishFailureKind`:**
  - It classifies `applyTuningEdits`' real refusal as `stale-value`. The test calls it with a mismatched `expected` and catches the error.
  - It classifies "master changed while publishing, so nothing was published. Publish again." as `other`.
  - It classifies "GitHub 403 on /git/refs…" as `other`.
- **`reset()`:** clears pending edits, the last result and the last error.
- **`githubClient.test.ts:38`:** passes with the new wording.

**Commit:** `refactor(tuning): export the editor rows and classify publish failures (#24)`

### Task R2-3: Rules table

**Files:**
- Create `src/tools/analytics/calibration/RulesTable.tsx` and `RulesTable.stories.tsx`.
- Test `src/tools/analytics/calibration/__tests__/RulesTable.test.tsx`.

**Interfaces:**
- **Consumes:** `CalibrationRow`, `sortCalibrationRows`, `LOW_N`, `RuleSortKey`; R1's `Panel`, `SegmentedControl`, `BiasBar`, `fmtGap`, `fmtInt`; `gapColor`.
- **Produces:**
```ts
export function RulesTable(props: {
  rows: CalibrationRow[]; selectedId: string | null; edited: ReadonlySet<string>; onSelect: (id: string) => void;
}): JSX.Element; // selectedId is a row id (the workspace passes the resolved row's id, never the raw ?rule= value)
```

**Shape:**
- **Sort:** state is internal, `useState<RuleSortKey>('gap')`. The Panel's action holds a `SegmentedControl` with `ariaLabel="Sort rules by"` and the options |Gap| and Votes.
- **Table:** a `<table>` with `<th scope="col">` for Rule, Type, Bias, Gap and Votes. It sits inside an `overflow-x: auto` wrapper whose inner element has `minWidth: 520`.
- **Rows:** they keep today's semantics, `<tr role="button" tabIndex={0} aria-pressed>` with Enter and Space (`RuleCalibrationTable.tsx:110-131`). `className="adm-row-btn"` replaces the hover state.
- **Visual cues:**
  - zero-vote rows render at 0.5 opacity;
  - rows under `LOW_N` votes get a "low n" tag (`ADMIN_RADIUS.tag`);
  - a pending edit shows a gold dot, `<span role="img" aria-label="Pending tuning edit">`, on every row whose `tuningKey` is in `edited`;
  - a tuning-only row shows "—" for Gap and Votes and an empty bias bar.

**Tests:**
- Sorts by |gap|, then by votes from the sort control. Ported from `RuleCalibrationTable.test.tsx`, querying rows inside the table.
- Selects a row by click, Enter and Space, and marks the row whose id is `selectedId` pressed.
- Marks a rule with fewer than 10 votes "low n".
- Shows "—" for Gap and Votes on a tuning-only row, and lists it last.
- Shows "Pending tuning edit" on both location rows when `location-control` is edited.
- Names each row's Type as Playstyle or Direct.

**Commit:** `feat(calibration): add the rules table (#24)`

### Task R2-4: Pair, vote and dimension panels in the new style

**Files:**
- Modify `src/tools/analytics/PairList.tsx`:
  - The `CtaButton` rows at `:24-51` become `<button type="button" className="adm-row-btn" aria-pressed>`.
  - The grid layout now on `CtaButton`'s `style` (`:30-38`) moves to an inner `<span>`, because a native `<button>` takes no `style` (`inkweave/no-adhoc-buttons`).
  - It gains an optional empty state.
- Modify `src/tools/analytics/VoteDetailTable.tsx`: `ScorePill` replaces `scoreColor`, and a `notice` prop is added.
- Modify `src/tools/analytics/DimensionParticipation.tsx`: `Panel` plus `MeterBar` rows, and an optional `scope` line in the Panel's `action` slot (muted, `ADMIN_TYPE.label`). `dimensionStats` and the footnote stay unchanged.
- Update the three stories, and add an `Empty` story to `PairList.stories.tsx`.
- Test:
  - add to `src/tools/analytics/__tests__/PairList.test.tsx`;
  - create `src/tools/analytics/__tests__/VoteDetailTable.test.tsx` and `src/tools/analytics/__tests__/DimensionParticipation.test.tsx`.

**Interfaces (Produces):**
```ts
export function PairList(props: {pairs: PairStat[]; selectedPair: {a: string; b: string} | null; onSelectPair: (p: {a: string; b: string}) => void; emptyText?: string}): JSX.Element; // emptyText defaults to "No voted pairs yet."
export function VoteDetailTable(props: {pair: {aName: string; bName: string; engineScore: number} | null; votes: VoteLogRow[]; notice?: string}): JSX.Element; // notice replaces the table (loading, error, no raw votes)
export function DimensionParticipation(props: {fill: DimensionFill | null; totalVotes: number; scope?: string}): JSX.Element; // scope: what the panel reads, beside its title
```
`emptyText` is optional, so the existing renders still typecheck: `PairList.test.tsx:17` and `:28`, and `PairList.stories.tsx`. The row, as proposed (the whole component passes `pnpm exec eslint --stdin`):
```tsx
export function PairList({pairs, selectedPair, onSelectPair, emptyText = 'No voted pairs yet.'}: PairListProps) {
  if (pairs.length === 0) {
    return <p style={{margin: 0, fontSize: FONT_SIZES.md, color: ADMIN_COLORS.muted}}>{emptyText}</p>;
  }
  // …
            <button
              key={`${pair.a}|${pair.b}`}
              type="button"
              className="adm-row-btn"
              aria-pressed={selected}
              onClick={() => onSelectPair({a: pair.a, b: pair.b})}>
              {/* The grid lives on a span: a native button takes no style (no-adhoc-buttons). */}
              <span
                style={{display: 'grid', gridTemplateColumns: '1fr auto auto', gap: SPACING.md, width: '100%', alignItems: 'baseline'}}>
                {/* the three spans of today's :40-50, colours from ADMIN_COLORS */}
              </span>
            </button>
```

**Tests:**
- **PairList:**
  - The two existing tests still pass, unchanged.
  - Shows `emptyText` ("No voted pairs for this rule yet.") when there are no pairs, and "No voted pairs yet." without the prop.
- **VoteDetailTable:**
  - Prompts "Select a pair to see its votes" when there is no pair.
  - Shows the `notice` text in place of the table.
  - Labels accuracy as too high / right / too low, and would-play as yes / no / —.
  - Shows "—" in the score pill for a vote with no score.
- **DimensionParticipation** (create `src/tools/analytics/__tests__/DimensionParticipation.test.tsx`; only `dimensionStats.test.ts` exists today): shows `scope` ("All votes, whatever the rule") beside the "Dimension participation" title when given, and nothing there without it.

**Commit:** `feat(calibration): restyle the pair, vote and dimension panels (#24)`

### Task R2-4a: The scatter chart in the kit

**Files:**
- Create `src/charts/scatter.ts`, `src/charts/ScatterChart.tsx` and `src/charts/ScatterChart.stories.tsx`.
- Modify `src/charts/LineChart.tsx`, which R1-3b Step 27 creates: `yDomain`, `fixedGutters`, `LINE_Y_AXIS_WIDTH` and `LINE_END_WIDTH` (contract addition 6).
- Modify `src/charts/ChartLegend.tsx`, which R1-3b Step 10 creates: `mark="dot"` (contract addition 7).
- Test:
  - create `src/charts/__tests__/scatter.test.ts` and `src/charts/__tests__/ScatterChart.test.tsx`;
  - add to `src/charts/__tests__/LineChart.test.tsx` (R1-3b Step 25) and `src/charts/__tests__/ChartLegend.test.tsx` (R1-3b Step 7).

**Interfaces:**
- **Consumes:**
  - from R1-3b: `linear` (`scale.ts`), `SeriesDef`, `ChartTooltip` and `TooltipContent`, and `useChartCursor` as R1-3b Step 11 writes it. On focus it sets the cursor to the newest position. Escape hides the tooltip and keeps the slider's value. Blur and a mouse or pen leaving the plot empty it, and an empty cursor reports the newest position in `aria-valuenow` and `aria-valuetext`. Its `plotProps` also carry `onPointerDown`, which snaps to the nearest x;
  - `LineChart` and `ChartLegend` as R1-3b Steps 27 and 10 write them;
  - `useContainerWidth` and `SPACING` through the bridge;
  - `ADMIN_COLORS` and `ADMIN_TYPE`.
- **Produces:** contract additions 5 and 7, and R2-4a's half of 6.

**How it draws:**
- **The plot** is square, so equal domains draw y = x at 45°.
  - Each tick gets a solid 1px gridline in `divider`.
  - Tick labels are `muted` at `micro`, with tabular figures.
  - The axis titles are `muted` at `label`: y's sits top left, x's bottom right.
- **The diagonal** is a solid hairline in `dim`. Its label is `muted` and runs along the line at its top end.
- **Dots:**
  - r 4, each on its own opaque r 6 disc in `page`, and that disc is the 2px ring. The ring has to be opaque, and `card` is translucent. As a stroke it would be centred on the edge, cover half the fill and leave r 3 of it, under the r ≥ 4 mark spec.
  - The disc also keeps a translucent fill honest. `barNeutral` is 0.7 alpha, and on its own page disc it composites to exactly the validator's `#63637d`, whatever lies beneath.
  - Dots are opaque and drawn in `points` order.
  - The dot under the cursor lifts to r 6, on an r 8 disc. So does the selected one, which also gets a 2px `accent` ring just outside its disc.
- **Jitter:** `jitterAlong="diagonal"` slides each dot along y = x by up to ±`jitter` and across it by up to a fifth of that (`diagonalJitter`). So y − x moves by at most `jitter / 5`. The default `'both'` keeps `jitterOffset`'s square spread.
- **Width:** the container's, up to 440px. Before the first measure, and in jsdom, it is 360px.
- **Pointer:**
  - The dot nearest the pointer, within `HIT_RADIUS`, gets the cursor and the tooltip. A mouse or pen leaving the plot clears them; a lifted finger keeps the tapped dot, as the kit's cursor does (R1-3b).
  - A click selects the nearest dot. With none within 24px it does nothing.
- **Keyboard:**
  - `useChartCursor`'s `plotProps` give the plot its slider role, tab stop, `aria-value*`, focus and ←/→/Home/End/Escape.
  - ScatterChart swaps the kit's x-only pointer, on move and on press, for the nearest dot in two dimensions.
  - It adds Enter/Space to select, and they select the dot the slider announces: the cursor's or, while the cursor is empty, the resting position in `aria-valuenow`. So a screen-reader user who hears a pair and presses Enter selects that pair, even after Escape or once the pointer has left.
  - The value text is the point's label, plus ", selected" on the selected dot, so the selection reaches assistive tech as the accent ring reaches the eye.
  - These merge into one props object on the plot, so the role and the handlers arrive together. As separate JSX attributes, jsx-a11y fails the handlers (`no-static-element-interactions`). With a literal `role`, it asks for a literal `aria-valuenow` as well.
- **Motion:** none.

- [ ] **Step 1: Check that R1-3b's LineChart has what R2 builds on**

```bash
grep -n "y: number | null" src/charts/LineChart.tsx
grep -n "data-lone" src/charts/LineChart.tsx
```

Expected: one line each, the `LinePoint` field and the lone-point circle (contract addition 6, "Already in R1-3b"). If either prints nothing, R1-3b did not land as its task file says. Stop and settle it with the owner before going on.

- [ ] **Step 2: Add the failing kit tests**

These are edits to R1-3b's test files. Each "before" block is quoted exactly from R1-3b.

In `src/charts/__tests__/LineChart.test.tsx` (R1-3b Step 25), the import. Before:

```tsx
import {LineChart, type LineSeries} from '../LineChart';
```

After:

```tsx
import {LINE_END_WIDTH, LINE_Y_AXIS_WIDTH, LineChart, type LineSeries} from '../LineChart';
```

The end of `describe('LineChart: axis and baseline', …)`. Before:

```tsx
    expect(container.querySelector('g[data-baseline] text')).toHaveTextContent('0');
  });
});
```

After:

```tsx
    expect(container.querySelector('g[data-baseline] text')).toHaveTextContent('0');
  });

  it('spans exactly a fixed y domain, with ticks at both ends and the baseline', () => {
    const gaps = seriesOf('gap', 'Mean gap', ADMIN_COLORS.accent, [-0.5, 0.3, 1.2]);
    const {container} = render(
      <LineChart series={[gaps]} ariaLabel="Weekly gap" yFormat={fmtGap} baseline={0} yDomain={[-2, 2]} />,
    );
    expect(texts(container, 'svg > g:not([data-baseline]) > text')).toEqual(['−2.00', '0.00', '+2.00']);
  });

  it('puts each x at the same px in two charts with fixed gutters, whatever their labels', () => {
    // Without fixedGutters these two differ: "−0.50" and "+1.20" need more room than "120".
    const gaps = seriesOf('gap', 'Mean gap', ADMIN_COLORS.accent, [-0.5, 0.3, 1.2]);
    const votes = seriesOf('votes', 'Score votes', ADMIN_COLORS.barNeutral, [12, 45, 120]);
    const firstX = (container: HTMLElement, id: string) =>
      container.querySelector(`path[data-series="${id}"]`)?.getAttribute('d')?.match(/^M([\d.]+),/)?.[1];
    const endX = (container: HTMLElement, id: string) => container.querySelector(`circle[data-end="${id}"]`)?.getAttribute('cx');
    const gap = render(<LineChart series={[gaps]} ariaLabel="Gap" yFormat={fmtGap} fixedGutters />).container;
    const vote = render(<LineChart series={[votes]} ariaLabel="Votes" fixedGutters />).container;
    expect(firstX(gap, 'gap')).toBe(String(LINE_Y_AXIS_WIDTH));
    expect(firstX(vote, 'votes')).toBe(String(LINE_Y_AXIS_WIDTH));
    // The 640px fallback width, less the right gutter.
    expect(endX(gap, 'gap')).toBe(String(640 - LINE_END_WIDTH));
    expect(endX(vote, 'votes')).toBe(String(640 - LINE_END_WIDTH));
  });
});
```

In `src/charts/__tests__/ChartLegend.test.tsx` (R1-3b Step 7), the end of the file. Before:

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

  it('keys scatter dots with a filled circle', () => {
    const {container} = render(<ChartLegend series={BANDS.slice(0, 2)} mark="dot" />);
    const keys = container.querySelectorAll('svg[aria-hidden="true"] > circle');
    expect(keys).toHaveLength(2);
    expect(keys[0]).toHaveAttribute('fill', ADMIN_COLORS.under);
    expect(container.querySelector('rect')).toBeNull();
  });
});
```

Run: `pnpm vitest run src/charts/__tests__/LineChart.test.tsx src/charts/__tests__/ChartLegend.test.tsx`
Expected: FAIL, `Tests 3 failed | 22 passed (25)`:
- "keys scatter dots with a filled circle": `expected … to have a length of 2 but got +0`;
- "spans exactly a fixed y domain…": `expected [ '−0.50', '0.00', '+1.20' ] to deeply equal [ '−2.00', '0.00', '+2.00' ]`;
- "puts each x at the same px…": `expected '38' to be 'undefined'`.

- [ ] **Step 3: Make the kit edits**

In `src/charts/LineChart.tsx` (R1-3b Step 27), the end of `LineChartProps`. Before:

```tsx
  /** Shown in place of the plot when no series has a point. */
  emptyText?: string;
}

const DEFAULT_HEIGHT = 180;
```

After:

```tsx
  /** Shown in place of the plot when no series has a point. */
  emptyText?: string;
  /**
   * The y scale's exact domain, in place of 0 to a clean top. It must hold
   * every value and the baseline. The ticks follow it as they follow the
   * computed domain: both ends, and 0 between them when it crosses zero.
   */
  yDomain?: readonly [number, number];
  /**
   * Fixed gutters: LINE_Y_AXIS_WIDTH left of the plot and LINE_END_WIDTH right
   * of it, in place of the room its own labels need. Two charts over the same
   * x that both set it place each x at the same px (R2's weekly gap trend).
   */
  fixedGutters?: boolean;
}

/** fixedGutters' left gutter: a six-character tick label such as "−10.00" (36px at micro), and the gap to the plot. */
export const LINE_Y_AXIS_WIDTH = SPACING.xxxl + SPACING.lg;
/** fixedGutters' right gutter: the end dot, its ring and a six-character end label. */
export const LINE_END_WIDTH = SPACING.xxxl + SPACING.lg;

const DEFAULT_HEIGHT = 180;
```

The props' defaults. Before:

```tsx
  baselineLabel,
  emptyText = 'No data to chart.',
}: LineChartProps) {
```

After:

```tsx
  baselineLabel,
  emptyText = 'No data to chart.',
  yDomain,
  fixedGutters = false,
}: LineChartProps) {
```

The y domain. Before:

```tsx
  const top = hi > 0 ? niceCeiling(hi) : lo < 0 ? 0 : 1;
  const bottom = lo < 0 ? -niceCeiling(-lo) : 0;
```

After:

```tsx
  const top = yDomain ? yDomain[1] : hi > 0 ? niceCeiling(hi) : lo < 0 ? 0 : 1;
  const bottom = yDomain ? yDomain[0] : lo < 0 ? -niceCeiling(-lo) : 0;
```

The gutters. Before:

```tsx
  const left = Math.ceil(Math.max(...tickLabels.map((t) => textWidth(t, LABEL_SIZE)))) + TICK_GAP;
  const right = Math.max(RIGHT_PAD, Math.ceil(endRoom));
```

After:

```tsx
  const left = fixedGutters
    ? LINE_Y_AXIS_WIDTH
    : Math.ceil(Math.max(...tickLabels.map((t) => textWidth(t, LABEL_SIZE)))) + TICK_GAP;
  const right = fixedGutters ? LINE_END_WIDTH : Math.max(RIGHT_PAD, Math.ceil(endRoom));
```

In `src/charts/ChartLegend.tsx` (R1-3b Step 10), the `mark` prop. Before:

```tsx
  /** 'rect' for bars and areas, 'line' for lines: the swatch mirrors the mark. */
  mark: 'rect' | 'line';
```

After:

```tsx
  /** 'rect' for bars and areas, 'line' for lines, 'dot' for scatter dots: the swatch mirrors the mark. */
  mark: 'rect' | 'line' | 'dot';
```

The swatch. Before:

```tsx
              <rect width={SWATCH} height={SWATCH} rx={RADIUS.xs} fill={seriesPaint(s, chartId)} />
```

After:

```tsx
              {mark === 'dot' ? (
                <circle cx={SWATCH / 2} cy={SWATCH / 2} r={SWATCH / 2} fill={seriesPaint(s, chartId)} />
              ) : (
                <rect width={SWATCH} height={SWATCH} rx={RADIUS.xs} fill={seriesPaint(s, chartId)} />
              )}
```

- [ ] **Step 4: Run them and see them pass**

Run: `pnpm vitest run src/charts/__tests__/LineChart.test.tsx src/charts/__tests__/ChartLegend.test.tsx`
Expected: PASS, `Tests 25 passed (25)` (20 + 5).

- [ ] **Step 5: Write the failing scatter tests**

Create `src/charts/__tests__/scatter.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {diagonalJitter, jitterOffset, nearestPoint, scatterLayout, scatterOrder} from '../scatter';

const KEYS = Array.from({length: 5000}, (_, i) => `${i}|${i + 1}`);

describe('scatterLayout', () => {
  it('lays a square plot inside the margins', () => {
    const layout = scatterLayout(360, [0.5, 10.5], [0.5, 10.5]);
    expect(layout.side).toBe(312);
    expect(layout.height).toBe(376);
    expect(layout.x(0.5)).toBe(32);
    expect(layout.x(10.5)).toBe(344);
    expect(layout.y(10.5)).toBe(24);
    expect(layout.y(0.5)).toBe(336);
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

Create `src/charts/__tests__/ScatterChart.test.tsx`. jsdom has no layout, so the chart draws at its 360px fallback and the plot's box starts at 0, 0:

```tsx
import {describe, expect, it, vi} from 'vitest';
import {act, fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {ScatterChart, type ScatterPoint} from '../ScatterChart';
import {scatterLayout} from '../scatter';
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
// jsdom has no layout, so the chart draws at its 360px fallback and the plot's box starts at 0, 0.
const layout = scatterLayout(360, DOMAIN, DOMAIN);
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

describe('ScatterChart', () => {
  it('draws one dot per point in its series colour', () => {
    const {container} = renderChart();
    const dots = container.querySelectorAll('circle[data-key]');
    expect(dots).toHaveLength(3);
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

  it('walks the dots left to right with the arrow keys and reads each one out', async () => {
    renderChart();
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

  it('shows the tooltip for the dot nearest the pointer, within 24px', () => {
    renderChart();
    const b = at(POINTS[2]);
    fireEvent.pointerMove(slider(), {clientX: b.clientX + 20, clientY: b.clientY});
    expect(screen.getByText('Tip b')).toBeInTheDocument();
    fireEvent.pointerMove(slider(), {clientX: b.clientX + 30, clientY: b.clientY - 30});
    expect(screen.queryByText(/^Tip/)).not.toBeInTheDocument();
  });

  it('selects the dot under a click, and the focused dot with Enter', async () => {
    const onSelect = vi.fn();
    renderChart({onSelect});
    fireEvent.click(slider(), at(POINTS[0]));
    expect(onSelect).toHaveBeenLastCalledWith('c');
    act(() => slider().focus());
    await userEvent.keyboard('{Home}{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith('a');
    fireEvent.click(slider(), {clientX: 1, clientY: 1});
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('selects the dot the slider announces, before any arrow key and after Escape', async () => {
    const onSelect = vi.fn();
    renderChart({onSelect});
    act(() => slider().focus());
    expect(slider()).toHaveAttribute('aria-valuetext', 'C at 8, 2');
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith('c');
    // Escape hides the tooltip and keeps the place (R1-3b): the slider still announces A, and Space takes it.
    await userEvent.keyboard('{Home}{Escape}');
    expect(slider()).toHaveAttribute('aria-valuetext', 'A at 2, 6');
    await userEvent.keyboard(' ');
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenLastCalledWith('a');
  });

  it('rings the selected dot in the accent', () => {
    const {container} = renderChart({selectedKey: 'b'});
    const ring = container.querySelector('[data-state="selected"] circle');
    expect(ring).toHaveAttribute('stroke', ADMIN_COLORS.accent);
    expect(ring).toHaveAttribute('cx', String(layout.x(5)));
  });

  it('labels both axes and the y = x line', () => {
    renderChart({diagonal: 'Equal'});
    expect(screen.getByText('Across')).toBeInTheDocument();
    expect(screen.getByText('Up')).toBeInTheDocument();
    expect(screen.getByText('Equal')).toBeInTheDocument();
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
    expect(Math.abs(dy - dx)).toBeLessThanOrEqual(0.35 / 5 + 1e-9);
  });
});
```

Run: `pnpm vitest run src/charts/__tests__/scatter.test.ts src/charts/__tests__/ScatterChart.test.tsx`
Expected: FAIL, `Test Files 2 failed (2)`, each with `Failed to resolve import "../scatter"` (or `"../ScatterChart"`) and `Does the file exist?`

- [ ] **Step 6: Write `src/charts/scatter.ts` and `src/charts/ScatterChart.tsx`**

Both files pass `pnpm exec eslint --stdin`.

```ts
// src/charts/scatter.ts
import {linear} from './scale';

/** The pointer only has to be the closest to a dot, within this many px of its centre (a 48px target). */
export const HIT_RADIUS = 24;

/** Plot margins in px: tick labels left and below, the axis titles above and below. */
export const SCATTER_MARGIN = {top: 24, right: 16, bottom: 40, left: 32} as const;

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
}

/** A chart `width` px wide around a square plot, so equal domains draw y = x at 45°. */
export function scatterLayout(
  width: number,
  xDomain: readonly [number, number],
  yDomain: readonly [number, number],
): ScatterLayout {
  const {top, right, bottom, left} = SCATTER_MARGIN;
  const side = Math.max(0, width - left - right);
  return {
    width,
    height: side + top + bottom,
    left,
    top,
    side,
    x: linear([xDomain[0], xDomain[1]], [left, left + side]),
    y: linear([yDomain[0], yDomain[1]], [top + side, top]),
  };
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

```tsx
// src/charts/ScatterChart.tsx
import {useRef} from 'react';
import {useContainerWidth} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';
import {ChartTooltip, type TooltipContent} from './ChartTooltip';
import {HIT_RADIUS, diagonalJitter, jitterOffset, nearestPoint, scatterLayout, scatterOrder} from './scatter';
import type {SeriesDef} from './series';
import {useChartCursor} from './useChartCursor';

export interface ScatterPoint {
  /** Unique and stable: selection, React keys and the jitter seed use it. */
  key: string;
  x: number;
  y: number;
  /** The SeriesDef id whose colour the dot takes. */
  series: string;
  /** The point in words: the keyboard cursor's aria-valuetext. */
  label: string;
}

export interface ScatterChartProps {
  /** Drawn in this order, so the last points sit on top. */
  points: readonly ScatterPoint[];
  series: readonly SeriesDef[];
  ariaLabel: string;
  xDomain: readonly [number, number];
  yDomain: readonly [number, number];
  xTicks: readonly number[];
  yTicks: readonly number[];
  xLabel: string;
  yLabel: string;
  tickFormat?: (n: number) => string;
  /** Draws the y = x line where the domains overlap, with this label at its top end. */
  diagonal?: string;
  /** Spread of the per-key offset, in data units (default 0). */
  jitter?: number;
  /**
   * 'both' (default): up to ±jitter on each axis on its own. 'diagonal': up to
   * ±jitter along y = x and a fifth of that across it, so y − x moves by at
   * most jitter / 5 (diagonalJitter).
   */
  jitterAlong?: 'both' | 'diagonal';
  tooltip: (point: ScatterPoint) => TooltipContent;
  selectedKey?: string | null;
  /** With it, a click on the nearest dot, or Enter/Space on the dot the slider announces, selects that dot's key. */
  onSelect?: (key: string) => void;
}

/** The widest the chart grows, and its width before the container is measured (and in jsdom). */
const MAX_WIDTH = 440;
const FALLBACK_WIDTH = 360;
/**
 * Mark specs (R1-3b): r 4 dots in a 2px surface ring; the dot under the cursor
 * and the selected one lift to r 6. The ring is an opaque disc in `page` under
 * each dot, not a stroke: a stroke centred on the edge would cover half of it
 * and leave r 3 of fill, and `card` is translucent.
 */
const DOT_R = 4;
const LIFT_R = 6;
const RING = 2;

/**
 * Two measures per item on one square plot, with the kit's hover layer: the
 * dot nearest the pointer (within HIT_RADIUS) lifts and shows the tooltip, and
 * the plot is one keyboard slider whose ← and → walk the dots left to right.
 * Dots are opaque, each on its own page-coloured disc, so the ring keeps every
 * edge visible where dots overlap, and `jitter` spreads dots that share exact
 * values.
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
  tickFormat = String,
  diagonal,
  jitter = 0,
  jitterAlong = 'both',
  tooltip,
  selectedKey = null,
  onSelect,
}: ScatterChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const measured = useContainerWidth(ref);
  const layout = scatterLayout(measured > 0 ? Math.min(measured, MAX_WIDTH) : FALLBACK_WIDTH, xDomain, yDomain);
  const colorOf = new Map(series.map((s) => [s.id, s.color]));
  const offset = (key: string) =>
    jitterAlong === 'diagonal' ? diagonalJitter(key, jitter, jitter / 5) : jitterOffset(key, jitter);
  const place = (point: ScatterPoint) => {
    const [dx, dy] = offset(point.key);
    const color = colorOf.get(point.series) ?? ADMIN_COLORS.barNeutral;
    return {point, color, px: layout.x(point.x + dx), py: layout.y(point.y + dy)};
  };
  const drawn = points.map(place);
  const walk = scatterOrder(points).map(place);
  const cursor = useChartCursor(walk.length);
  const active = cursor.index == null ? null : (walk[cursor.index] ?? null);
  const selected = drawn.find((dot) => dot.point.key === selectedKey) ?? null;
  // The valuetext carries what the eye gets: the point, and whether it is the selected one.
  const plotProps = cursor.plotProps(
    (i) => (walk[i] ? `${walk[i].point.label}${walk[i].point.key === selectedKey ? ', selected' : ''}` : ''),
    walk.map((dot) => dot.px),
  );
  // Enter and Space select the dot the slider announces: the cursor's, or, while
  // the cursor is empty (after Escape, or once the pointer leaves), the resting
  // position the slider still reports in aria-valuenow.
  const resting = plotProps['aria-valuenow'];
  const announced = cursor.index ?? (typeof resting === 'number' ? resting : null);
  const target = announced == null ? null : (walk[announced] ?? null);
  const bottom = layout.top + layout.side;
  const low = Math.max(xDomain[0], yDomain[0]);
  const high = Math.min(xDomain[1], yDomain[1]);

  /** The walk index of the dot nearest the pointer, or null. */
  const dotAt = (event: React.MouseEvent<HTMLElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return nearestPoint(walk, event.clientX - box.left, event.clientY - box.top, HIT_RADIUS);
  };
  // useChartCursor gives the plot its slider role, tab stop, aria-value*,
  // focus and ←/→/Home/End/Escape (R1-3b). The scatter swaps its x-only pointer
  // (move and down) for the nearest dot in two dimensions, and adds click and
  // Enter/Space to select. Its leave keeps the kit's touch rule: a lifted
  // finger keeps the tapped dot, and only a mouse or pen leaving clears it.
  const sliderProps: React.HTMLAttributes<HTMLElement> = {
    ...plotProps,
    'aria-label': ariaLabel,
    onPointerMove: (event) => cursor.setIndex(dotAt(event)),
    onPointerDown: (event) => cursor.setIndex(dotAt(event)),
    onPointerLeave: (event) => {
      if (event.pointerType !== 'touch') cursor.setIndex(null);
    },
    onClick: (event) => {
      const i = dotAt(event);
      if (onSelect && i != null) onSelect(walk[i].point.key);
    },
    onKeyDown: (event) => {
      if (onSelect && target && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onSelect(target.point.key);
        return;
      }
      plotProps.onKeyDown?.(event);
    },
  };

  const lifted = (dot: (typeof drawn)[number], state: 'active' | 'selected') => (
    <g key={state} data-state={state}>
      {state === 'selected' && (
        <circle cx={dot.px} cy={dot.py} r={LIFT_R + RING + 1} fill="none" stroke={ADMIN_COLORS.accent} strokeWidth={RING} />
      )}
      <circle cx={dot.px} cy={dot.py} r={LIFT_R + RING} fill={ADMIN_COLORS.page} />
      <circle cx={dot.px} cy={dot.py} r={LIFT_R} fill={dot.color} />
    </g>
  );

  return (
    <div ref={ref} style={{width: '100%', minWidth: 0}}>
      <div
        {...sliderProps}
        style={{
          position: 'relative',
          width: layout.width,
          height: layout.height,
          cursor: onSelect && active ? 'pointer' : 'default',
        }}>
        <svg width={layout.width} height={layout.height} aria-hidden="true" focusable="false" style={{display: 'block'}}>
          {xTicks.map((tick) => (
            <g key={`x${tick}`}>
              <line x1={layout.x(tick)} x2={layout.x(tick)} y1={layout.top} y2={bottom} stroke={ADMIN_COLORS.divider} />
              <text
                x={layout.x(tick)}
                y={bottom + 14}
                textAnchor="middle"
                fontSize={ADMIN_TYPE.micro}
                fill={ADMIN_COLORS.muted}
                style={{fontVariantNumeric: 'tabular-nums'}}>
                {tickFormat(tick)}
              </text>
            </g>
          ))}
          {yTicks.map((tick) => (
            <g key={`y${tick}`}>
              <line
                x1={layout.left}
                x2={layout.left + layout.side}
                y1={layout.y(tick)}
                y2={layout.y(tick)}
                stroke={ADMIN_COLORS.divider}
              />
              <text
                x={layout.left - 8}
                y={layout.y(tick)}
                dy="0.32em"
                textAnchor="end"
                fontSize={ADMIN_TYPE.micro}
                fill={ADMIN_COLORS.muted}
                style={{fontVariantNumeric: 'tabular-nums'}}>
                {tickFormat(tick)}
              </text>
            </g>
          ))}
          <text x={0} y={12} fontSize={ADMIN_TYPE.label} fill={ADMIN_COLORS.muted}>
            {yLabel}
          </text>
          <text x={layout.left + layout.side} y={layout.height - 4} textAnchor="end" fontSize={ADMIN_TYPE.label} fill={ADMIN_COLORS.muted}>
            {xLabel}
          </text>
          {diagonal && low < high && (
            <g>
              <line x1={layout.x(low)} y1={layout.y(low)} x2={layout.x(high)} y2={layout.y(high)} stroke={ADMIN_COLORS.dim} />
              <text
                x={layout.x(high) - 6}
                y={layout.y(high) + 6}
                dy="-0.4em"
                textAnchor="end"
                transform={`rotate(-45 ${layout.x(high) - 6} ${layout.y(high) + 6})`}
                fontSize={ADMIN_TYPE.micro}
                fill={ADMIN_COLORS.muted}>
                {diagonal}
              </text>
            </g>
          )}
          {drawn.map((dot) => (
            <g key={dot.point.key}>
              <circle cx={dot.px} cy={dot.py} r={DOT_R + RING} fill={ADMIN_COLORS.page} />
              <circle data-key={dot.point.key} cx={dot.px} cy={dot.py} r={DOT_R} fill={dot.color} />
            </g>
          ))}
          {selected && lifted(selected, 'selected')}
          {active && active.point.key !== selected?.point.key && lifted(active, 'active')}
        </svg>
        <ChartTooltip
          content={active ? tooltip(active.point) : null}
          x={active?.px ?? 0}
          y={active?.py ?? 0}
          bounds={{width: layout.width, height: layout.height}}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Run them and see them pass**

Run: `pnpm vitest run src/charts/__tests__/scatter.test.ts src/charts/__tests__/ScatterChart.test.tsx`
Expected: PASS, `Tests 19 passed (19)` (8 + 11).

Steps 2 to 7 ran green in a scratch harness (2026-10-01). It used R1-3b's `useChartCursor`, `LineChart`, `ChartLegend`, `ChartTooltip`, `scale.ts` and `series.ts`, and R1-3's `format.ts`, all taken verbatim from their task files. Only the bridge and the theme were stubbed.

- [ ] **Step 8: Write the stories**

`ScatterChart.stories.tsx`, on R1-2's admin canvas. They draw from a seeded generator, never `Math.random`, so the stories hold still:
- `Default`: 30 points in two series.
- `DenseLattice`: 600 points on whole-number spots, with `jitter={0.35}`, `jitterAlong="diagonal"` and the diagonal.
- `Selected`: `DenseLattice` with one key selected.

- [ ] **Step 9: Lint and typecheck**

Run: `pnpm lint` and `pnpm typecheck`. Expected: both pass.

- [ ] **Step 10: Commit**, with the Bash tool and only after the owner approves:

```bash
git add src/charts/scatter.ts src/charts/ScatterChart.tsx src/charts/ScatterChart.stories.tsx src/charts/LineChart.tsx src/charts/ChartLegend.tsx src/charts/__tests__/scatter.test.ts src/charts/__tests__/ScatterChart.test.tsx src/charts/__tests__/LineChart.test.tsx src/charts/__tests__/ChartLegend.test.tsx
USER_APPROVED=1 git commit -m "feat(charts): add the scatter chart (#24)"
```

**Commit:** `feat(charts): add the scatter chart (#24)`

### Task R2-4b: Calibration chart data

**Files:**
- Create `src/tools/analytics/calibration/chartData.ts`.
- Create `src/tools/analytics/calibration/chartFixtures.ts`: the six-pair fixture and the seeded generators, shared by both test files (`chartData.test.ts`, R2-4c's `CalibrationCharts.test.tsx`) and both stories files (R2-4c's `CalibrationCharts.stories.tsx`, R2-6's `CalibrationWorkspace.stories.tsx`). It is a plain module because Storybook (`.storybook/main.ts`, CSF) reads every named export of a `.stories.tsx` file as a story, and a story can't import from a test file. Nothing in the app imports it, so the build leaves it out.
- Test `src/tools/analytics/calibration/__tests__/chartData.test.ts`.

**Interfaces:**
- **Consumes:**
  - `PairStat`, `VoteLogRow`;
  - `pairId` (R2-1);
  - `CALIBRATION_BAND` (R1-8's `verdict.ts`);
  - `weekStart` (R1-3b's `scale.ts`);
  - `SeriesDef` and `ScatterPoint` (R2-4a);
  - `fmtGap`, `fmtScore` (R1-3), and `countOf` (R1-9's `activityModel.ts`);
  - `ADMIN_COLORS`.
- **Produces:**
```ts
export type GapSide = 'over' | 'agree' | 'under';
export const GAP_SERIES: readonly SeriesDef[];                  // over, agree, under: the scatter's and the histogram's one split
export function sideColor(side: GapSide): string;
export function gapSide(gap: number): GapSide;                  // |gap| < CALIBRATION_BAND agrees
export function scoreText(n: number): string;                   // 7 -> "7", 7.5 -> "7.50"
export const SCORE_DOMAIN: readonly [number, number];           // [0.5, 10.5]
export const SCORE_TICKS: readonly number[];                    // 1 to 10
export const SCATTER_JITTER = 0.35;                              // along y = x (jitterAlong="diagonal"); y − x moves by at most a fifth of it
export function scatterPoints(pairs: readonly PairStat[]): ScatterPoint[];     // narrowest gap first; the label adds "N pairs on these scores" when N > 1
export function sharedScores(pairs: readonly PairStat[]): Map<string, number>; // pairId -> pairs on the same two scores
export const GAP_BIN_LIMIT = 5;
export interface GapBin {center: number; side: GapSide; pairs: number; votes: number}
export function gapBinCenter(gap: number): number;
export function gapBins(pairs: readonly PairStat[]): GapBin[];  // always 11, from −5 to +5
export function binLabel(center: number): string;               // "≤ −5", "−3", "0", "+3", "≥ +5"
export function binRange(center: number): string;               // "−3.5 to −2.5", "within ±0.5", "−4.5 or lower"
export function gapShares(bins: readonly GapBin[]): Record<GapSide, number>;
export interface WeeklyGap {week: string; meanGap: number | null; scoreVotes: number}
export function weeklyGaps(votes: readonly VoteLogRow[], pairs: readonly PairStat[]): WeeklyGap[];
export function gapDomain(weeks: readonly WeeklyGap[]): [number, number];

// chartFixtures.ts (tests and stories only)
export function pairOf(a: string, b: string, engineScore: number, communityScore: number, scoreVotes?: number, rules?: string[]): PairStat; // "Card <a>" × "Card <b>"
export const SIX_PAIRS: readonly PairStat[];
export function seeded(seed: number): () => number;                                     // mulberry32, 0 to 1
export function seededPairs(count: number, seed?: number, rules?: string[]): PairStat[];
export function seededVotes(pairs: readonly PairStat[], weeks: number, lastWeek: string, seed?: number, quietWeek?: number | null): VoteLogRow[];
export const ALL_PAIRS: readonly PairStat[];            // 400 pairs
export const ALL_PAIRS_VOTES: readonly VoteLogRow[];    // their 16 weeks of votes
export const ONE_RULE: readonly PairStat[];             // 60 pairs
export const ONE_RULE_VOTES: readonly VoteLogRow[];     // 16 weeks, the eleventh quiet
```
`chartData.ts`, as proposed. It passes `pnpm exec eslint --stdin`, and a run of its logic against the cases below matched each one:
```ts
import {weekStart} from '../../../charts/scale';
import type {ScatterPoint} from '../../../charts/ScatterChart';
import type {SeriesDef} from '../../../charts/series';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {fmtGap, fmtScore} from '../../../ui/format';
import {countOf} from '../activity/activityModel';
import {CALIBRATION_BAND} from '../verdict';
import type {PairStat} from '../voteAnalyticsTypes';
import type {VoteLogRow} from '../voteLogTypes';
import {pairId} from './calibrationModel';

/** Where a gap sits against the agreement band: the engine scores higher, they agree, or the community scores higher. */
export type GapSide = 'over' | 'agree' | 'under';

const BAND = String(CALIBRATION_BAND);

/** The three sides as chart series, in axis order. The scatter and the histogram share them, so a side keeps one colour. */
export const GAP_SERIES: readonly SeriesDef[] = [
  {id: 'over', label: `Engine higher (gap ≤ −${BAND})`, color: ADMIN_COLORS.over},
  {id: 'agree', label: `Within ±${BAND}`, color: ADMIN_COLORS.barNeutral},
  {id: 'under', label: `Community higher (gap ≥ +${BAND})`, color: ADMIN_COLORS.under},
];

/** A side's mark colour, for the line key in a tooltip row. */
export function sideColor(side: GapSide): string {
  return GAP_SERIES.find((s) => s.id === side)?.color ?? ADMIN_COLORS.barNeutral;
}

/** The band verdictFor reads a mean gap by, applied to one pair: |gap| < CALIBRATION_BAND agrees. */
export function gapSide(gap: number): GapSide {
  if (Math.abs(gap) < CALIBRATION_BAND) return 'agree';
  return gap < 0 ? 'over' : 'under';
}

/** A score as the charts print it: whole numbers bare ("7"), averages to two places ("4.33"). */
export function scoreText(n: number): string {
  return fmtScore(n, Number.isInteger(n) ? 0 : 2);
}

/** Both axes run 1 to 10, with half a point of room so an edge dot's jitter stays inside. */
export const SCORE_DOMAIN: readonly [number, number] = [0.5, 10.5];
export const SCORE_TICKS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
/**
 * Engine scores are whole numbers and most pairs have one vote, so most pairs
 * sit on a whole-number spot. The scatter slides each dot along y = x by up to
 * this much (jitterAlong="diagonal"), and across it by a fifth of that, so a
 * stack spreads into a short dash and y − x, the gap the chart is read for,
 * moves by at most SCATTER_JITTER / 5 (0.07). Each axis moves by at most
 * 1.1 × SCATTER_JITTER (0.385), inside SCORE_DOMAIN's half point of room.
 */
export const SCATTER_JITTER = 0.35;

/**
 * One point per pair: engine score across, community score up. Narrowest gap
 * first, so the widest draw on top. The label is the slider's value text, so it
 * carries what the tooltip adds: how many pairs share the dot's exact scores.
 */
export function scatterPoints(pairs: readonly PairStat[]): ScatterPoint[] {
  const sharing = sharedScores(pairs);
  return [...pairs]
    .sort((p, q) => Math.abs(p.gap) - Math.abs(q.gap))
    .map((p) => {
      const key = pairId(p.a, p.b);
      const shared = sharing.get(key) ?? 1;
      return {
        key,
        x: p.engineScore,
        y: p.communityScore,
        series: gapSide(p.gap),
        label:
          `${p.aName} × ${p.bName}: engine ${scoreText(p.engineScore)}, ` +
          `community ${scoreText(p.communityScore)}, gap ${fmtGap(p.gap)}, ${countOf(p.scoreVotes, 'vote')}` +
          (shared > 1 ? `, ${countOf(shared, 'pair')} on these scores` : ''),
      };
    });
}

/** For each pair (by pairId), how many pairs in the list share its exact engine and community scores, itself included. */
export function sharedScores(pairs: readonly PairStat[]): Map<string, number> {
  const spot = (p: PairStat) => `${p.engineScore}|${p.communityScore}`;
  const perSpot = new Map<string, number>();
  for (const p of pairs) perSpot.set(spot(p), (perSpot.get(spot(p)) ?? 0) + 1);
  return new Map(pairs.map((p) => [pairId(p.a, p.b), perSpot.get(spot(p)) ?? 1]));
}

/** The histogram's outer bins hold every gap beyond ±GAP_BIN_LIMIT. */
export const GAP_BIN_LIMIT = 5;

export interface GapBin {
  /** The whole-number gap at the bin's centre, −GAP_BIN_LIMIT to +GAP_BIN_LIMIT. */
  center: number;
  side: GapSide;
  pairs: number;
  votes: number;
}

/**
 * The bin a gap counts in: the nearest whole number, halves away from zero, so
 * the centre bin holds exactly the gaps gapSide reads as agreeing (|gap| < 0.5).
 */
export function gapBinCenter(gap: number): number {
  const nearest = Math.sign(gap) * Math.floor(Math.abs(gap) + 0.5);
  // `+ 0` turns −0 into 0.
  return Math.max(-GAP_BIN_LIMIT, Math.min(GAP_BIN_LIMIT, nearest)) + 0;
}

/** Every bin from −GAP_BIN_LIMIT to +GAP_BIN_LIMIT, empty ones included, so the axis holds still between rules. */
export function gapBins(pairs: readonly PairStat[]): GapBin[] {
  const bins = Array.from({length: GAP_BIN_LIMIT * 2 + 1}, (_, i): GapBin => {
    const center = i - GAP_BIN_LIMIT;
    return {center, side: center === 0 ? 'agree' : center < 0 ? 'over' : 'under', pairs: 0, votes: 0};
  });
  for (const p of pairs) {
    const bin = bins[gapBinCenter(p.gap) + GAP_BIN_LIMIT];
    bin.pairs += 1;
    bin.votes += p.scoreVotes;
  }
  return bins;
}

/** A signed half-point number: "−3.5", "+2.5", "0". */
function signed(n: number): string {
  return (n > 0 ? '+' : '') + fmtScore(n, Number.isInteger(n) ? 0 : 1);
}

/** A bin's axis label: "≤ −5", "−3", "0", "+3", "≥ +5". */
export function binLabel(center: number): string {
  if (center <= -GAP_BIN_LIMIT) return `≤ ${signed(-GAP_BIN_LIMIT)}`;
  if (center >= GAP_BIN_LIMIT) return `≥ ${signed(GAP_BIN_LIMIT)}`;
  return signed(center);
}

/** The gaps a bin holds, in words: "−3.5 to −2.5", "within ±0.5", "−4.5 or lower". */
export function binRange(center: number): string {
  if (center === 0) return 'within ±0.5';
  if (center <= -GAP_BIN_LIMIT) return `${signed(center + 0.5)} or lower`;
  if (center >= GAP_BIN_LIMIT) return `${signed(center - 0.5)} or higher`;
  return `${signed(center - 0.5)} to ${signed(center + 0.5)}`;
}

/** Each side's share of the pairs, from 0 to 1; all 0 when there are none. */
export function gapShares(bins: readonly GapBin[]): Record<GapSide, number> {
  const total = bins.reduce((n, bin) => n + bin.pairs, 0);
  const share = (side: GapSide) =>
    total === 0 ? 0 : bins.filter((bin) => bin.side === side).reduce((n, bin) => n + bin.pairs, 0) / total;
  return {over: share('over'), agree: share('agree'), under: share('under')};
}

export interface WeeklyGap {
  /** The week's UTC Monday, 'YYYY-MM-DD'. */
  week: string;
  /** The mean gap of the week's score votes in scope; null for a week without one. */
  meanGap: number | null;
  /** The score votes behind that mean. */
  scoreVotes: number;
}

const WEEK_MS = 7 * 86_400_000;

/**
 * The weekly mean gap of the scope's score votes. A vote's gap is its score
 * minus its pair's engine score, and a week's mean weighs every vote equally:
 * the definition bucketWeekly uses for global.weekly
 * (scripts/lib/voteAnalytics.mjs:128-153), so with every pair in scope this
 * reproduces it. Unlike global.weekly it can be scoped to a rule, and it counts
 * only the votes behind each mean. The weeks run from the log's first vote to
 * its last whatever the scope, so every scope shares one axis and a quiet week
 * shows as a break in the line.
 */
export function weeklyGaps(votes: readonly VoteLogRow[], pairs: readonly PairStat[]): WeeklyGap[] {
  const engineOf = new Map(pairs.map((p) => [pairId(p.a, p.b), p.engineScore]));
  const sums = new Map<string, {total: number; n: number}>();
  let first = '';
  let last = '';
  for (const vote of votes) {
    // The log's timestamps are UTC (Supabase writes +00:00), so the first ten characters are the UTC day.
    const week = weekStart(vote.ts.slice(0, 10));
    if (!first || week < first) first = week;
    if (!last || week > last) last = week;
    const engine = engineOf.get(pairId(vote.a, vote.b));
    if (vote.score == null || engine === undefined) continue;
    const sum = sums.get(week) ?? {total: 0, n: 0};
    sums.set(week, {total: sum.total + (vote.score - engine), n: sum.n + 1});
  }
  if (!first) return [];
  const weeks: WeeklyGap[] = [];
  for (let t = Date.parse(first); t <= Date.parse(last); t += WEEK_MS) {
    const week = new Date(t).toISOString().slice(0, 10);
    const sum = sums.get(week);
    weeks.push({week, meanGap: sum ? sum.total / sum.n : null, scoreVotes: sum?.n ?? 0});
  }
  return weeks;
}

/** A y domain centred on zero that holds every weekly mean: at least ±1, in half-point steps. */
export function gapDomain(weeks: readonly WeeklyGap[]): [number, number] {
  const widest = weeks.reduce((max, w) => Math.max(max, Math.abs(w.meanGap ?? 0)), 0);
  const edge = Math.max(1, Math.ceil(widest * 2) / 2);
  return [-edge, edge];
}
```

`chartFixtures.ts`, as proposed. It passes `pnpm exec eslint --stdin`, and the cases below ran green against it in the scratch harness (R2-4a Step 7), together with `chartData.ts`:
```ts
import type {PairStat} from '../voteAnalyticsTypes';
import type {VoteLogRow} from '../voteLogTypes';

/**
 * Shared chart fixtures for the calibration tests and stories. They live in a
 * plain module: Storybook reads every named export of a .stories.tsx file as a
 * story, and a story can't import a test file. All of them are seeded, never
 * Math.random, so stories hold still and tests repeat.
 */

/** A pair record: "Card <a>" × "Card <b>", gap = community − engine. */
export function pairOf(
  a: string,
  b: string,
  engineScore: number,
  communityScore: number,
  scoreVotes = 1,
  rules: string[] = ['ramp'],
): PairStat {
  return {a, b, aName: `Card ${a}`, bName: `Card ${b}`, engineScore, communityScore, gap: communityScore - engineScore, scoreVotes, rules};
}

/**
 * Engine → community: 7 → 4, 7 → 7, 7 → 7 (2 votes), 3 → 9, 8 → 7.5 (2 votes)
 * and 9 → 1. Gaps −3, 0, 0, +6, −0.5 and −8, every pair under Ramp.
 */
export const SIX_PAIRS: readonly PairStat[] = [
  pairOf('1', '2', 7, 4),
  pairOf('3', '4', 7, 7),
  pairOf('5', '6', 7, 7, 2),
  pairOf('7', '8', 3, 9),
  pairOf('9', '10', 8, 7.5, 2),
  pairOf('11', '12', 9, 1),
];

/** A seeded 0-to-1 sequence (mulberry32). */
export function seeded(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * `count` pairs at real density: whole-number engine scores from 1 to 10 and a
 * community score within three points of it. Every tenth pair has two to five
 * votes and an averaged community score; the rest have one vote each.
 */
export function seededPairs(count: number, seed = 1, rules: string[] = ['ramp']): PairStat[] {
  const next = seeded(seed);
  return Array.from({length: count}, (_, i) => {
    const engine = 1 + Math.floor(next() * 10);
    const votes = i % 10 === 9 ? 2 + Math.floor(next() * 4) : 1;
    // The mean of `votes` whole-number scores is a multiple of 1 / votes.
    const drift = Math.round((next() * 6 - 3) * votes) / votes;
    const community = Math.min(10, Math.max(1, engine + drift));
    return pairOf(String(2 * i + 1), String(2 * i + 2), engine, community, votes, rules);
  });
}

const DAY_MS = 86_400_000;

/**
 * One score vote per pair vote, spread over the `weeks` weeks that end with the
 * Monday `lastWeek`, on seeded days. Each scores its pair's community score,
 * rounded. The week at index `quietWeek`, if given, gets none.
 */
export function seededVotes(
  pairs: readonly PairStat[],
  weeks: number,
  lastWeek: string,
  seed = 1,
  quietWeek: number | null = null,
): VoteLogRow[] {
  const next = seeded(seed);
  const end = Date.parse(lastWeek);
  return pairs.flatMap((p) =>
    Array.from({length: p.scoreVotes}, (): VoteLogRow => {
      let week = Math.floor(next() * weeks);
      if (week === quietWeek) week = (week + 1) % weeks;
      const day = new Date(end - (weeks - 1 - week) * 7 * DAY_MS + Math.floor(next() * 7) * DAY_MS);
      return {
        a: p.a,
        b: p.b,
        aName: p.aName,
        bName: p.bName,
        score: Math.round(p.communityScore),
        accuracy: null,
        isReal: null,
        wouldPlay: null,
        difficulty: null,
        whoCarries: null,
        ts: `${day.toISOString().slice(0, 10)}T12:00:00.000000+00:00`,
        voter: 1 + Math.floor(next() * 40),
      };
    }),
  );
}

/** The all-pairs scope at real density, and its 16 weeks of votes, ending the week of Sep 28. */
export const ALL_PAIRS: readonly PairStat[] = seededPairs(400);
export const ALL_PAIRS_VOTES: readonly VoteLogRow[] = seededVotes(ALL_PAIRS, 16, '2026-09-28');
/** One rule's scope: 60 pairs, and a log with a quiet week (the eleventh of 16). */
export const ONE_RULE: readonly PairStat[] = seededPairs(60, 7);
export const ONE_RULE_VOTES: readonly VoteLogRow[] = seededVotes(ONE_RULE, 16, '2026-09-28', 7, 10);
```

**Tests** (`chartData.test.ts`, importing `SIX_PAIRS` from `../chartFixtures`):
- **`gapSide`:**
  - −0.49, 0 and 0.49 agree;
  - −0.5 is over, and 0.5 is under.
- **`gapBinCenter`:**
  - Halves go away from zero: 0.5 → 1, −0.5 → −1, 2.5 → 3. Just short of a half stays in: −2.49 → −2.
  - It clamps: −8 → −5, 7.2 → 5.
  - It never returns −0: `Object.is(gapBinCenter(-0.2), 0)`.
- **The centre bin is the agreement band.** For every gap from −6 to +6 in 0.01 steps, `gapBinCenter(gap) === 0` exactly when `gapSide(gap) === 'agree'`, and the bin's side matches the gap's.
- **`gapBins`:**
  - It always gives 11 bins, from −5 to +5 in order, empty ones included; `[]` gives 11 empty bins.
  - It counts pairs and sums votes. `SIX_PAIRS`, engine → community, is 7 → 4, 7 → 7, 7 → 7 (2 votes), 3 → 9, 8 → 7.5 (2 votes) and 9 → 1. Its gaps are −3, 0, 0, +6, −0.5 and −8. As pairs/votes per bin, it gives −5: 1/1, −3: 1/1, −1: 1/2, 0: 2/3, +5: 1/1.
- **`binLabel` and `binRange`:**
  - labels "≤ −5", "−3", "0", "+3", "≥ +5";
  - ranges "−4.5 or lower", "−3.5 to −2.5", "within ±0.5", "+2.5 to +3.5", "+4.5 or higher";
  - every minus is U+2212.
- **`gapShares`:** the fixture gives over 0.5, agree 1/3 and under 1/6. With no pairs, all three are 0.
- **`scatterPoints`:**
  - one point per pair: key `pairId`, x the engine score, y the community score, series its side;
  - narrowest gap first;
  - the label of a pair alone on its scores reads "Card 1 × Card 2: engine 7, community 4, gap −3.00, 1 vote", and an average prints two places ("Card 9 × Card 10: engine 8, community 7.50, gap −0.50, 2 votes");
  - a pair that shares its scores says so, as the tooltip does: the 7 → 7 pair reads "Card 3 × Card 4: engine 7, community 7, gap 0.00, 1 vote, 2 pairs on these scores".
- **`sharedScores`:** two pairs at engine 7, community 7 both read 2, and a pair alone on its spot reads 1.
- **`weeklyGaps`:**
  - A week's mean is the plain mean of its score votes' gaps: −3, +1 and −1 give −1, which is `bucketWeekly`'s definition.
  - Unscored votes and votes on pairs outside the scope don't count toward a mean, but they still set the span.
  - A vote stored the other way round (`a: '2', b: '1'`) still joins its pair.
  - Supabase's microsecond `+00:00` timestamps go by their UTC day. A Sunday 23:59:59 vote counts in that week's Monday.
  - A quiet week inside the span comes back as `{meanGap: null, scoreVotes: 0}`. Scoped to one pair, the same log keeps the same weeks.
  - With no votes it gives `[]`.
- **`gapDomain`:**
  - the minimum is ±1;
  - a widest mean of 1.3 gives ±1.5;
  - null weeks don't count.
- **`SCORE_DOMAIN`:** holds every jittered dot. A diagonal jitter moves each axis by at most 1.1 × `SCATTER_JITTER` (along plus half of across), and 1 − 0.385 and 10 + 0.385 fall inside [0.5, 10.5].
- **The fixtures** hold still: `seededPairs(400)` gives the same 400 pairs on every call, about a tenth of them with averaged community scores, all within 1 to 10. `weeklyGaps(ONE_RULE_VOTES, ONE_RULE)` gives 16 weeks, exactly one of them quiet.

**Commit:** `feat(calibration): derive the scatter, histogram and weekly gap data (#24)`

### Task R2-4c: The three calibration charts

**Files:**
- Create `src/tools/analytics/calibration/CalibrationScatter.tsx`, `GapHistogram.tsx`, `WeeklyGapTrend.tsx` and `CalibrationCharts.stories.tsx`.
- Test `src/tools/analytics/calibration/__tests__/CalibrationCharts.test.tsx`.

**Interfaces:**
- **Consumes:**
  - R2-4a (`ScatterChart`, with `jitterAlong`; LineChart's `yDomain` and `fixedGutters`; ChartLegend's `mark="dot"`) and R2-4b (`chartData.ts`, `chartFixtures.ts`);
  - from R1-3b: `ChartFrame`, `ChartLegend`, `BarChart` and `BarDatum`, `LineChart` (null points and lone-point dots), `TooltipContent` and `TooltipRow`;
  - R1-3's `Panel`, untitled, as each chart's card;
  - `pairId` (R2-1);
  - `fmtGap`, `fmtInt`, `fmtScore`, `fmtDay` and `countOf`.
- **Produces:**
```ts
export interface CalibrationScatterProps {
  pairs: PairStat[]; scopeLabel: string;                       // the uncapped scope, and "All pairs" or the rule's name
  selectedPair: {a: string; b: string} | null; onSelectPair: (pair: {a: string; b: string}) => void;
  engineSilentPairs?: number;                                  // the all-pairs scope only
  emptyText?: string;                                          // default "No voted pairs yet."
}
export function CalibrationScatter(props: CalibrationScatterProps): JSX.Element;
export interface GapHistogramProps {pairs: PairStat[]; scopeLabel: string; emptyText?: string} // emptyText default "No voted pairs yet."
export function GapHistogram(props: GapHistogramProps): JSX.Element;
export function WeeklyGapTrend(props: {weeks: WeeklyGap[]; scopeLabel: string}): JSX.Element;
```
- **The empty copy.** Both `emptyText`s default to "No voted pairs yet.", which is right on "All pairs". The workspace passes `selected ? 'No voted pairs for this rule yet.' : 'No voted pairs yet.'`, as it does for `PairList`. An empty scope's subtitle reads `${scopeLabel} · no pairs`, never "0% within ±0.5, 0% …".
- **The weekly trend's empty states.** "No score votes in this scope yet." when no week has a score vote. A tuning-only row gives `weeklyGaps(votes, [])`: every week of the log, all of them null. Otherwise "Not enough weeks of votes to draw a trend yet." under two weeks.
- **The histogram's stacking.** It draws each bar's count in its side's series, through BarChart's stacked mode, with the other two series at 0. That relies on a stack drawing nothing for a 0 segment. Vote activity's daily stacks have zero bands on most days, so R1-3b covers it.
- **The surface.** Each chart returns its `ChartFrame` inside an untitled `Panel`, which is the card: R1-3b's frame draws no surface, as on R1-8, R1-9 and R1-10.

As proposed. All three pass `pnpm exec eslint --stdin`:
```tsx
// CalibrationScatter.tsx
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
  scoreText,
  sharedScores,
  sideColor,
} from './chartData';

export interface CalibrationScatterProps {
  /** The scope, uncapped (pairsInScope): every voted pair the selected rule fired on, or every pair. */
  pairs: PairStat[];
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
 * list does, so its votes open below. The untitled Panel is the card.
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
  const table = {
    caption: `Every plotted pair, ${scopeLabel}, widest gap first`,
    columns: ['Pair', 'Engine', 'Community', 'Gap', 'Votes'],
    rows: [...pairs]
      .sort((p, q) => Math.abs(q.gap) - Math.abs(p.gap))
      .map((p) => [
        `${p.aName} × ${p.bName}`,
        scoreText(p.engineScore),
        scoreText(p.communityScore),
        fmtGap(p.gap),
        fmtInt(p.scoreVotes),
      ]),
  };
  return (
    <Panel>
      <ChartFrame
        title="Engine vs community"
        subtitle={
          pairs.length === 0
            ? `${scopeLabel} · no pairs`
            : `${scopeLabel} · ${countOf(pairs.length, 'pair')}. Above the line, the community scores a pair higher than the engine does.`
        }
        legend={<ChartLegend series={GAP_SERIES} mark="dot" />}
        table={table}>
        {pairs.length === 0 ? (
          <p style={NOTE}>{emptyText}</p>
        ) : (
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
        )}
        <p style={NOTE}>
          Each dot slides a little along the line, so pairs on the same scores stay visible, and its distance from the line
          stays within {fmtScore(SCATTER_JITTER / 5, 2)} of its gap. The tooltip and the table give the exact values. Select a
          dot to open its votes.
          {engineSilentPairs > 0 &&
            ` Not plotted: ${countOf(engineSilentPairs, 'engine-silent pair')} (voted, but the engine gives them no score).`}
        </p>
      </ChartFrame>
    </Panel>
  );
}
```
```tsx
// GapHistogram.tsx
import {BarChart, type BarDatum} from '../../../charts/BarChart';
import {ChartFrame} from '../../../charts/ChartFrame';
import {ChartLegend} from '../../../charts/ChartLegend';
import type {TooltipContent} from '../../../charts/ChartTooltip';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtInt} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import type {PairStat} from '../voteAnalyticsTypes';
import {GAP_SERIES, binLabel, binRange, gapBins, gapShares, sideColor, type GapBin} from './chartData';

const pct = (fraction: number) => `${Math.round(fraction * 100)}%`;

/** The pair count, the votes behind it and its share; the count is keyed in the bin's side colour. */
function binTooltip(bin: GapBin, total: number): TooltipContent {
  return {
    title: `Gap ${binRange(bin.center)}`,
    rows: [
      {value: fmtInt(bin.pairs), label: bin.pairs === 1 ? 'pair' : 'pairs', color: sideColor(bin.side)},
      {value: fmtInt(bin.votes), label: bin.votes === 1 ? 'vote' : 'votes'},
      {value: pct(total === 0 ? 0 : bin.pairs / total), label: 'of pairs'},
    ],
  };
}

export interface GapHistogramProps {
  pairs: PairStat[];
  scopeLabel: string;
  /** What an empty scope says (default "No voted pairs yet."). */
  emptyText?: string;
}

/**
 * How the scope's pair gaps spread, one whole-number bin each from ≤ −5 to
 * ≥ +5. Bins left of centre are pairs the engine scores higher, right of it
 * pairs the community scores higher, and the neutral centre bin is the
 * agreement band. Each bar carries its side in one stacked series, so the kit's
 * BarChart colours it; the other two series are 0 there. The untitled Panel is
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
  const table = {
    caption: `Pairs by gap (community − engine), ${scopeLabel}. A gap on a half point counts in the bin further from zero.`,
    columns: ['Gap', 'Pairs', 'Votes', 'Share of pairs'],
    rows: bins.map((bin) => [
      binRange(bin.center),
      fmtInt(bin.pairs),
      fmtInt(bin.votes),
      pct(pairs.length === 0 ? 0 : bin.pairs / pairs.length),
    ]),
  };
  return (
    <Panel>
      <ChartFrame
        title="Gap distribution"
        subtitle={
          pairs.length === 0
            ? `${scopeLabel} · no pairs`
            : `${scopeLabel} · ${pct(shares.agree)} within ±0.5, ${pct(shares.over)} engine higher, ${pct(shares.under)} community higher`
        }
        legend={<ChartLegend series={GAP_SERIES} mark="rect" />}
        table={table}>
        {pairs.length === 0 ? (
          <p style={{margin: 0, fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted}}>{emptyText}</p>
        ) : (
          <BarChart
            data={data}
            series={GAP_SERIES}
            ariaLabel={`Pairs by gap, ${scopeLabel}`}
            height={180}
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
```tsx
// WeeklyGapTrend.tsx
import {ChartFrame} from '../../../charts/ChartFrame';
import {LineChart} from '../../../charts/LineChart';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtDay, fmtGap, fmtInt} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {gapDomain, type WeeklyGap} from './chartData';

/** Names one of the figure's two plots: each has its own y axis, so each says what it measures. */
function PlotCaption({children}: {children: React.ReactNode}) {
  return <p style={{margin: 0, fontSize: ADMIN_TYPE.label, fontWeight: 600, color: ADMIN_COLORS.muted}}>{children}</p>;
}

/**
 * The scope's weekly mean gap against a zero baseline, with the score votes
 * behind each week in a short plot underneath. Two plots, one y axis each:
 * never a second axis on one plot. Both are LineCharts over the same weeks with
 * fixed gutters, so a week sits at the same x in both. The untitled Panel is
 * the card.
 */
export function WeeklyGapTrend({weeks, scopeLabel}: {weeks: WeeklyGap[]; scopeLabel: string}) {
  const table = {
    caption: `Weekly mean gap and score votes, ${scopeLabel}. Weeks start on Monday (UTC).`,
    columns: ['Week of', 'Mean gap', 'Score votes'],
    rows: weeks.map((w) => [fmtDay(w.week), fmtGap(w.meanGap), fmtInt(w.scoreVotes)]),
  };
  // A tuning-only row scopes no pairs, so its weeks span the log with no score vote in any of them.
  const empty = !weeks.some((w) => w.scoreVotes > 0)
    ? 'No score votes in this scope yet.'
    : weeks.length < 2
      ? 'Not enough weeks of votes to draw a trend yet.'
      : null;
  return (
    <Panel>
      <ChartFrame
        title="Weekly gap"
        subtitle={`${scopeLabel} · each week's mean gap (community − engine) and the score votes behind it`}
        table={table}>
        {empty ? (
          <p style={{margin: 0, fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted}}>{empty}</p>
        ) : (
          <>
            <PlotCaption>Mean gap</PlotCaption>
            <LineChart
              series={[
                {id: 'gap', label: 'Mean gap', color: ADMIN_COLORS.accent, points: weeks.map((w) => ({x: w.week, y: w.meanGap}))},
              ]}
              ariaLabel={`Weekly mean gap, ${scopeLabel}`}
              height={160}
              yFormat={fmtGap}
              xFormat={fmtDay}
              baseline={0}
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
              height={72}
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

**Tests** (`CalibrationCharts.test.tsx`, with the real kit and `SIX_PAIRS` from `../chartFixtures`). Two things in the harness matter:
- `vi.mock` is hoisted and covers the whole file, so the `LineChart` mock records its props and still renders the real chart. Every other test in the file keeps the real sliders.
- `ChartTooltip` renders the value and the label as separate text (R1-3b Step 10), so a tooltip is found by its title and matched as a whole, with R1-8's `tooltip(title)` helper: `toHaveTextContent(/\+6\.00\s*gap/)`, never `getByText('+6.00 gap')`.

The whole file below passes `pnpm exec eslint --stdin`. Its sixteen tests ran green in the scratch harness (R2-4a Step 7) against the three components, R1-3b's `ChartFrame`, `BarChart`, `LineChart` (with R2-4a's edits) and `ChartLegend`, and R1-3's `SegmentedControl`, all taken verbatim from their task files:
```tsx
import type {ComponentProps} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {LineChart as RealLineChart} from '../../../../charts/LineChart';
import {CalibrationScatter} from '../CalibrationScatter';
import {GapHistogram} from '../GapHistogram';
import {WeeklyGapTrend} from '../WeeklyGapTrend';
import {SIX_PAIRS} from '../chartFixtures';
import {gapDomain, type WeeklyGap} from '../chartData';

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
  lineProps.length = 0;
});

/** The tooltip showing `title`. ChartTooltip's root is aria-hidden (R1-3b), so it is found by its text. */
function tooltip(title: string): HTMLElement {
  const tip = screen.getByText(title).closest<HTMLElement>('[aria-hidden="true"]');
  expect(tip, `no tooltip around "${title}"`).not.toBeNull();
  return tip as HTMLElement;
}

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

describe('CalibrationScatter: scope, selection, table and footnote', () => {
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
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(6);
    expect([...rows[0].querySelectorAll('th, td')].map((c) => c.textContent)).toEqual(['Card 11 × Card 12', '9', '1', '−8.00', '1']);
  });

  it('notes the jitter, and the engine-silent pairs only when given', () => {
    const {rerender} = render(<CalibrationScatter pairs={PAIRS} scopeLabel="All pairs" selectedPair={null} onSelectPair={vi.fn()} />);
    expect(screen.getByText(/within 0\.07 of its gap/)).toBeInTheDocument();
    expect(screen.queryByText(/Not plotted/)).not.toBeInTheDocument();
    rerender(
      <CalibrationScatter pairs={PAIRS} scopeLabel="All pairs" selectedPair={null} onSelectPair={vi.fn()} engineSilentPairs={2} />,
    );
    expect(screen.getByText(/Not plotted: 2 engine-silent pairs/)).toBeInTheDocument();
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
  });

  it('says what an empty scope holds, with a subtitle of no shares', () => {
    render(<GapHistogram pairs={[]} scopeLabel="All pairs" />);
    expect(screen.getByText('No voted pairs yet.')).toBeInTheDocument();
    expect(screen.getByText('All pairs · no pairs')).toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });
});

describe('GapHistogram: bars, table and rule copy', () => {
  it('draws eleven bars from ≤ −5 to ≥ +5, and tables every bin', async () => {
    const {container} = render(<GapHistogram pairs={PAIRS} scopeLabel="Ramp" />);
    const labels = [...container.querySelectorAll('svg text')].map((t) => t.textContent);
    expect(labels).toContain('≤ −5');
    expect(labels).toContain('≥ +5');
    await userEvent.click(screen.getByRole('button', {name: 'Table'}));
    const table = screen.getByRole('table');
    expect(table.querySelector('caption')?.textContent).toMatch(/A gap on a half point counts in the bin further from zero\.$/);
    const heads = within(table).getAllByRole('rowheader').map((th) => th.textContent);
    expect(heads).toHaveLength(11);
    expect(heads[0]).toBe('−4.5 or lower');
    expect(heads[10]).toBe('+4.5 or higher');
  });

  it('names the rule when the workspace says so', () => {
    render(<GapHistogram pairs={[]} scopeLabel="Ramp" emptyText="No voted pairs for this rule yet." />);
    expect(screen.getByText('No voted pairs for this rule yet.')).toBeInTheDocument();
  });
});

describe('WeeklyGapTrend', () => {
  it('hands the gap plot its baseline, its domain, fixed gutters and a null for the quiet week', () => {
    render(<WeeklyGapTrend weeks={WEEKS} scopeLabel="Ramp" />);
    expect(screen.getByRole('slider', {name: 'Weekly mean gap, Ramp'})).toBeInTheDocument();
    expect(screen.getByRole('slider', {name: 'Score votes per week, Ramp'})).toBeInTheDocument();
    const gap = lineProps.find((p) => p.ariaLabel === 'Weekly mean gap, Ramp');
    expect(gap?.baseline).toBe(0);
    expect(gap?.yDomain).toEqual(gapDomain(WEEKS));
    expect(gap?.fixedGutters).toBe(true);
    expect(gap?.series[0].points[1]).toEqual({x: '2026-09-21', y: null});
    expect(lineProps.find((p) => p.ariaLabel === 'Score votes per week, Ramp')?.fixedGutters).toBe(true);
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
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    const cells = rows.map((row) => [...row.querySelectorAll('th, td')].map((c) => c.textContent));
    expect(cells[2]).toEqual(['Sep 28', '−1.00', '3']);
    expect(cells[1]).toEqual(['Sep 21', '—', '0']);
  });
});
```

Run: `pnpm vitest run src/tools/analytics/calibration/__tests__/CalibrationCharts.test.tsx`
Expected before the components exist: FAIL, `Failed to resolve import "../CalibrationScatter"` and `Does the file exist?`. After: PASS, `Tests 16 passed (16)`.

**Stories** (`CalibrationCharts.stories.tsx`). They import their data from `./chartFixtures` and never call `Math.random`:
- `AllPairs`: `ALL_PAIRS` (400 pairs on whole-number spots, a tenth of them with averaged community scores) and `weeklyGaps(ALL_PAIRS_VOTES, ALL_PAIRS)`, 16 weeks.
- `OneRule`: `ONE_RULE`, 60 pairs.
- `QuietWeek`: the trend over `weeklyGaps(ONE_RULE_VOTES, ONE_RULE)`, whose eleventh week has no score votes.
- `Empty`: no pairs on "All pairs", and a trend with no score votes.

**Commit:** `feat(calibration): add the scatter, gap histogram and weekly gap charts (#24)`

### Task R2-5: Tuning aside

**Files:**
- Create `src/tools/analytics/calibration/TuningAside.tsx` and `TuningAside.stories.tsx`.
- Test `src/tools/analytics/calibration/__tests__/TuningAside.test.tsx`.
- Modify `src/tools/tuning/components/TierRow.tsx`: tokens and `adm-input`. The aria-labels stay, and errors are tied to their field with `aria-describedby`.
- Modify `src/tools/tuning/components/PendingTray.tsx`:
  - the heading reads "Pending changes · N";
  - diffs sit in a wrapping `<code>` and are never truncated;
  - the button reads `Publish to {targetBranch()}`;
  - errors show in `Notice tone="error"`, which is `role="alert"` (R1-3), with no wrapper of their own;
  - a new optional `onReload` prop.
- Modify `src/github/GithubTokenGate.tsx`: an `inline` prop (R4 reuses it).
- Update the stories, and add a `StaleValue` story to `PendingTray.stories.tsx` with `onReload`.
- Add to `src/tools/tuning/__tests__/PendingTray.test.tsx`.

**Interfaces:**
- **Consumes:**
  - `LiveTuning`
  - `UseTuningAdminResult` (with `reset`)
  - `rowsForSelection`, `RowSpec`, `tuningName`, `tuningKind` and `pendingLabel`
  - `publishFailureKind`
  - `biasCopy`, `goLiveNote` and `targetBranch`
  - R1's `Notice`
- **Produces:**
```ts
export interface TuningState {live: LiveTuning & {reload: () => void}; admin: UseTuningAdminResult}
export function TuningAside(props: {tuning: TuningState | null; onSaveToken: (token: string) => void; selected: CalibrationRow | null; sharedWith: CalibrationRow[]}): JSX.Element;
// PendingTray props gain: onReload?: () => void   (the button shows only when given and publishFailureKind(error) === 'stale-value')
// GithubTokenGate props gain: inline?: boolean    (h2 instead of h1, no page centring)
```
`onReload` is optional, so `renderTray` (`PendingTray.test.tsx:16-29`) and `PendingTray.stories.tsx` still typecheck. The tray's error block, as proposed (it passes `pnpm exec eslint --stdin`):
```tsx
/** A failed publish, and the way out of a stale-value refusal. Notice's error tone is the alert (R1-3). */
function PublishError({error, onReload}: {error: string; onReload?: () => void}) {
  return (
    <div style={{marginTop: SPACING.sm}}>
      <Notice tone="error">{error}</Notice>
      {onReload && publishFailureKind(error) === 'stale-value' && (
        <CtaButton type="button" variant="neutral" onClick={onReload} style={{marginTop: SPACING.sm}}>
          Reload tuning.json
        </CtaButton>
      )}
    </div>
  );
}
```

**States, in order:**
1. **No token:** `GithubTokenGate inline title="Tuning editor"`.
2. **Loading:** "Reading tuning.json from {branch}…".
3. **Read error:** `<Notice tone="error">Could not read tuning.json: {error}</Notice>`, which is the aside's one `role="alert"`. A second alert wrapped around it would make R2-6's `within(aside).findByRole('alert')` throw "Found multiple elements".
4. **No selection:** "Pick a playstyle or direct synergy to edit its copy and scores."
5. **No tuning entry:** "{name} has no copy or scores in tuning.json."
6. **Editing:**
   - Header: "{Playstyle | Direct synergy} · tuning.json", from `tuningKind`, then the `tuningName` as an h2.
   - Next to the header: the selected row's gap (`fmtGap`, `gapColor`) and the `biasCopy` read line. The line is prefixed with the rule name when it differs from the tuning name.
   - "Shared by N rules: …" when `sharedWith.length > 1`.
   - Then the `rowsForSelection(config, key)` rows. `EditableRow` (`TuningEditor.tsx:71-106`) is copied into `TuningAside.tsx`; `TuningEditor` keeps its own until R2-7. The copy takes a `name` prop, and its labels become `pendingLabel(name, row.label, field)`, with `name = tuningName(config, key)`. The copy passes `pnpm exec eslint --stdin`.

From state 4 on, `PendingTray` stays pinned to the bottom (`position: sticky; bottom: 0`).
- **Publish** keeps `publishThenRefresh` (`TuningEditor.tsx:115-117`): `admin.publish().then(() => live.reload(), () => undefined)`.
- **Stale value:** the tray gets `onReload={() => { admin.reset(); live.reload(); }}`.

**Tests:**
- **Harness:** it renders the real `useTuningAdmin('tok')` with `commitTuning` mocked, as `TuningEditor.test.tsx` does, plus a fake `live`. The file adds `afterEach(() => vi.unstubAllEnvs())`, because `vite.config.ts` doesn't set `unstubEnvs` (`router.test.tsx:17-19` unstubs by hand).
- **TuningAside, by state:**
  - Without a token, asks for one in a level-2 "Tuning editor" heading.
  - While loading, says it is reading `tuning.json` from the target branch.
  - Says why `tuning.json` could not be read, in an alert.
  - With no rule selected, prompts to pick one.
  - Says `singer-songs` has no copy in `tuning.json`.
- **TuningAside, editing:**
  - Opens the Locations entry for `location-boost` and names the 9 rules that share it.
  - Shows each rule its own values and keeps a pending edit with its rule (ported).
  - Shows the saved value again once an edit is reverted (ported).
  - Prefixes pending labels with the entry name: "Ramp · Title · text".
- **TuningAside, publishing:**
  - After a successful publish, links the commit, shows the go-live note and asks for fresh values (ported, plus the success line).
  - Keeps the values it has when a publish fails, and says why in an alert (ported).
  - Shows "Publishing…" on a disabled button while the commit runs.
  - On a stale-value refusal, offers "Reload tuning.json", which clears pending edits, the error and the result, and calls `live.reload` once.
  - Names a rehearsal branch on the button: "Publish to admin-verify", via `vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify')`.
- **PendingTray:**
  - Shows a long tagline diff in full.
  - Offers "Reload tuning.json" only for a stale-value error, and only when `onReload` is given.
  - Its three existing tests still pass, unchanged.

**Commit:** `feat(calibration): add the tuning aside (#24)`

### Task R2-6: The merged page, the route and the `/tuning` redirect

**Files:**
- Create `src/tools/analytics/calibration/CalibrationWorkspace.tsx`, `CalibrationPage.tsx` and `CalibrationWorkspace.stories.tsx`.
- Test `src/tools/analytics/calibration/__tests__/CalibrationPage.test.tsx`.
- Delete R1's `src/tools/analytics/CalibrationPage.tsx` and R1-11's test for it, `src/tools/analytics/__tests__/CalibrationPage.test.tsx`, which imports it. Its cases move to the new `calibration/__tests__/CalibrationPage.test.tsx`: "opens with the rule from ?rule= selected" to "Selection from the URL", the header and lean cases to "Header", and the two vote-log cases to the weekly gap Notice tests.
- Modify `src/shell/PageLayout.tsx` (R1-6 Step 8): add `flush?: boolean` (contract addition 1). R1-6's `BODY` is both the scroller and the padded grid, with no inner wrapper, so `flush` swaps the body's style rather than skipping a wrapper. Below `BODY`:
  ```tsx
  // `flush`: the same scroller with no padding and no grid, for a page that lays
  // out its own columns edge to edge (R2's tuning aside, R4's studio).
  const FLUSH_BODY: React.CSSProperties = {flex: 1, minHeight: 0, overflowY: 'auto'};
  ```
  In `PageLayoutProps`, before `children`: `/** Children go straight into the scrolling body, with no padding and no grid. */ flush?: boolean;`. The signature gains `flush = false` after `branchLabel`, and the body becomes `<div style={flush ? FLUSH_BODY : BODY}>{children}</div>`. The edited file passes `pnpm exec eslint --stdin`.
- Add two cases to `src/shell/PageLayout.test.tsx` (R1-6 Step 5), inside its `describe`. They pass `pnpm exec eslint --stdin` and ran green in the scratch harness against the edited `PageLayout`:
  ```tsx
  it('puts a flush page straight into the scrolling body, with no padding and no grid', () => {
    render(
      <PageLayout title="Calibration & tuning" flush>
        <p>Body</p>
      </PageLayout>,
    );
    const body = screen.getByText('Body').parentElement;
    expect(body).toHaveStyle({overflowY: 'auto'});
    expect(body).not.toHaveStyle({display: 'grid'});
  });

  it('lays the body out as the padded grid without flush', () => {
    render(
      <PageLayout title="Vote activity">
        <p>Body</p>
      </PageLayout>,
    );
    expect(screen.getByText('Body').parentElement).toHaveStyle({overflowY: 'auto', display: 'grid'});
  });
  ```
- Modify `src/router.tsx`: import from the new path, and replace R1's `/tuning` route with `{path: 'tuning', element: <Navigate to="/calibration" replace />}`.
- Modify `src/router.test.tsx`.
- Modify `src/shell/nav.ts`:
  - set the calibration item to `writes: true`;
  - drop any interim "Engine tuning" item from R1;
  - add `calibrationHref` (contract addition 2) at the end of the file. It passes `pnpm exec eslint --stdin`:
    ```ts
    /** The Calibration & tuning page, opened on a rule when one is given: what ?rule= reads (R2-6). */
    export function calibrationHref(ruleId?: string): string {
      return ruleId ? `/calibration?rule=${encodeURIComponent(ruleId)}` : '/calibration';
    }
    ```
  - update R1's nav test to match, and add the `calibrationHref` cases (under "Nav" below).

**Interfaces:**
- **Consumes:**
  - everything above, the charts (R2-4c) and `weeklyGaps` (R2-4b) included;
  - `useVoteAnalytics`, `useVoteLog`, `useGithubToken`, `useLiveTuning`, `useTuningAdmin`;
  - `PageLayout` (`writes`, `branchLabel="Tuning writes to"`, `flush`), `Notice`, and the kit's `LinkButton` through the bridge;
  - in tests only: `resetAdminDataCache` (R1-5's `src/test/setup.ts` already calls it before every test; the `afterEach` keeps the file self-contained).
- **Produces:**
```ts
export function calibrationHref(ruleId?: string): string; // src/shell/nav.ts (contract addition 2)
export interface CalibrationWorkspaceProps {
  analytics: UseVoteAnalyticsReturn; voteLog: UseVoteLogReturn; tuning: TuningState | null;
  onSaveToken: (token: string) => void; selectedId: string | null; onSelect: (id: string | null) => void;
}
export function CalibrationWorkspace(props: CalibrationWorkspaceProps): JSX.Element;
export function CalibrationPage(): JSX.Element; // title "Calibration & tuning", subtitle calibrationSubtitle(), meta "Data as of <code>…</code>"
```
Selection, as proposed. Both blocks pass `pnpm exec eslint --stdin`. A reset in `useEffect` would fail `react-hooks/set-state-in-effect` (eslint-plugin-react-hooks 7.1.1), so the pair is derived:
```tsx
// CalibrationPage.tsx
/** Both tuning hooks need a token, so they live below the gate. */
function TunedWorkspace({token, ...rest}: Omit<CalibrationWorkspaceProps, 'tuning'> & {token: string}) {
  const live = useLiveTuning(token);
  const admin = useTuningAdmin(token);
  return <CalibrationWorkspace {...rest} tuning={{live, admin}} />;
}

export function CalibrationPage() {
  const analytics = useVoteAnalytics();
  const voteLog = useVoteLog();
  const {token, setToken} = useGithubToken();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('rule');
  const onSelect = (id: string | null) => setParams(id ? {rule: id} : {}, {replace: true});
  const props = {analytics, voteLog, onSaveToken: setToken, selectedId, onSelect};
  // PageLayout wraps this; omitted here.
  return token ? <TunedWorkspace key={token} token={token} {...props} /> : <CalibrationWorkspace {...props} tuning={null} />;
}
```
```tsx
// CalibrationWorkspace.tsx, inside the component
const config = tuning?.live.status === 'ready' ? tuning.live.config : null;
const rows = buildCalibrationRows(analytics.data?.rules ?? null, config);
// ?rule= may name a tuning key (location-control); the row it resolves to is
// what the table marks and what a second click deselects.
const selected = findRow(rows, selectedId);
const selectedRowId = selected?.id ?? null;
const [pairSel, setPairSel] = useState<{ruleId: string | null; pair: {a: string; b: string}} | null>(null);
// A pair belongs to the rule it was picked under, so any rule change (a
// click, the sidebar link, the Overview's Tune link) drops it without an effect.
const selectedPair = pairSel?.ruleId === selectedRowId ? pairSel.pair : null;

<RulesTable rows={rows} selectedId={selectedRowId} edited={editedKeys(tuning?.admin.pending ?? [])}
  onSelect={(id) => onSelect(selected?.id === id ? null : id)} />
```
The scope row, the charts, the pairs and the trend, as proposed. Wrapped in a stand-in component (with `useRef` and `useState` from React, and `LinkButton` and `SPACING` from the bridge), the block passes `pnpm exec eslint --stdin`:
```tsx
// CalibrationWorkspace.tsx, module level
/** One row above everything the rule scopes: what is in scope, and the way back to every pair. */
const SCOPE_ROW: React.CSSProperties = {display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: SPACING.md};
/** The scatter and the histogram side by side, stacked once the column is under about 700px. */
const CHARTS_ROW: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
  gap: SPACING.xl,
  alignItems: 'start',
};
/** Dimension participation sits below the scope row but reads every vote, so it says so. */
const ALL_VOTES = 'All votes, whatever the rule';

// inside the component, after selectedPair
const scopeRef = useRef<HTMLParagraphElement>(null);
const allPairs = analytics.data?.pairs ?? [];
// The selected rule scopes everything under the scope row: both charts, the pairs, the votes and the weekly trend.
const scope = pairsInScope(allPairs, selected);
const scopeLabel = selected?.name ?? 'All pairs';
const emptyText = selected ? 'No voted pairs for this rule yet.' : 'No voted pairs yet.';
// The scatter and the pair list set the same pair, so a dot picked on the chart opens its votes as a row does.
const pickPair = (pair: {a: string; b: string}) => setPairSel({ruleId: selectedRowId, pair});

{analytics.data && (
  <>
    <div style={SCOPE_ROW}>
      {/* tabIndex -1: "Show all pairs" unmounts as it clears the rule, so focus lands here, not on <body>. */}
      <p ref={scopeRef} tabIndex={-1} style={{margin: 0, fontSize: ADMIN_TYPE.body, fontWeight: 700, color: ADMIN_COLORS.text}}>
        {pairsHeading(selected)}
      </p>
      {selected && (
        <LinkButton
          type="button"
          size="base"
          style={{minHeight: SPACING.xxl}}
          onClick={() => {
            onSelect(null);
            scopeRef.current?.focus();
          }}>
          Show all pairs
        </LinkButton>
      )}
    </div>
    <div style={CHARTS_ROW}>
      <CalibrationScatter
        pairs={scope}
        scopeLabel={scopeLabel}
        selectedPair={selectedPair}
        onSelectPair={pickPair}
        engineSilentPairs={selected ? 0 : analytics.data.global.engineSilentPairs}
        emptyText={emptyText}
      />
      <GapHistogram pairs={scope} scopeLabel={scopeLabel} emptyText={emptyText} />
    </div>
  </>
)}
<PairList
  pairs={withSelectedPair(pairsFor(allPairs, selected), scope, selectedPair)}
  selectedPair={selectedPair}
  onSelectPair={pickPair}
  emptyText={emptyText}
/>
<VoteDetailTable pair={findPair(scope, selectedPair)} votes={votesForPair(voteLog.data?.votes ?? [], selectedPair)} />
{analytics.data &&
  (analytics.data.hasRawVotes ? (
    <>
      {voteLog.data ? (
        <WeeklyGapTrend weeks={weeklyGaps(voteLog.data.votes, scope)} scopeLabel={scopeLabel} />
      ) : (
        <Notice tone={voteLog.error ? 'error' : 'info'}>
          {voteLog.error ? `Could not load the vote log: ${voteLog.error.message}` : 'Loading the vote log…'}
        </Notice>
      )}
      <DimensionParticipation
        fill={analytics.data.global.dimensionFill}
        totalVotes={analytics.data.global.totalVotes}
        scope={ALL_VOTES}
      />
    </>
  ) : (
    <Notice>
      The weekly gap trend and dimension participation need raw votes. Set the <code>SUPABASE_SERVICE_ROLE_KEY</code>{' '}
      Actions secret, then re-run admin&apos;s Deploy workflow.
    </Notice>
  ))}
```
- **"Show all pairs"** is `size="base"` with `minHeight: SPACING.xxl`, a 24px target (`sm` is about 15px tall). It unmounts as soon as the rule clears, so its click moves focus to the scope line first. `scopeRef` is still mounted then, and the `<p>` keeps focus once the button goes.

The pair list and the vote table keep their side-by-side grid from item 5 below. The block shows the props, not that wrapper. `VoteDetailTable` also keeps its `notice`, for a vote log that is loading, failed or has no raw votes.

**Layout.**
- **Left column:** `flex: '999 1 520px'`, `minWidth: 0`, padding `${SPACING.xxl}px ${SPACING.xxxl}px`. In this order:
  1. **The analytics notice** (`Notice`, info tone):
     - "Loading analytics...";
     - "Could not load vote analytics. Has the artifact been generated? ({message})";
     - for an empty artifact, "Vote analytics are empty.";
     - after the error or the empty message, "The rules below come from tuning.json alone." only when a config is loaded.
  2. **`RulesTable`.** With no rows:
     - without a token, "No rules to show: vote analytics are missing and tuning.json needs a GitHub token.";
     - with a token, "No rules to show: vote analytics are missing and tuning.json hasn't loaded."
  3. **The scope row** (only once analytics have loaded):
     - `pairsHeading(selected)`, for example "Ramp · gap −0.57 · 557 votes" or "All pairs", in a `<p tabIndex={-1}>` that takes focus when "Show all pairs" goes;
     - while a rule is selected, a `LinkButton` "Show all pairs" (`size="base"`, 24px tall) that calls `onSelect(null)` and moves focus to the scope line.

     It is the one filter row above what the rule scopes (`dataviz`: filters sit in one row above what they scope). The charts, the pairs, the votes and the trend all follow it. Dimension participation, the one panel below it that the rule doesn't scope, says so (item 7).
  4. **The charts row** (only once analytics have loaded): `CalibrationScatter`, then `GapHistogram`, in `CHARTS_ROW`, both with the workspace's `emptyText`. That is two-up at the usual desktop width (about 800px of column) and stacked under about 700px. Each chart is a `ChartFrame` in an untitled `Panel`, which is the card (R1-3b's frame draws none).
  5. **Pairs and votes:** `PairList` beside `VoteDetailTable`.
     - The list's heading becomes "Widest gaps", with the handoff's "engine → community" caption. `pairsHeading` moved up to the scope row.
     - The list shows `withSelectedPair(...)`, so a dot picked below the 40 widest still shows as a pressed row.
     - The vote table's `notice` covers a vote log that is loading, failed or has no raw votes.
  6. **Weekly gap:** `WeeklyGapTrend`, full width, with `weeklyGaps(voteLog.data.votes, scope)`.
     - While the vote log loads, the Notice reads "Loading the vote log…".
     - On a failure it reads "Could not load the vote log: {message}" (error tone).
  7. **Dimensions:** `DimensionParticipation`, with `scope="All votes, whatever the rule"`: it sits under the scope row, but `global.dimensionFill` can't be scoped by rule. Without raw votes, one Notice replaces both 6 and 7: "The weekly gap trend and dimension participation need raw votes. Set the `SUPABASE_SERVICE_ROLE_KEY` Actions secret, then re-run admin's Deploy workflow."
- **Aside:** `<aside aria-label="Tuning editor">` (`flex: '1 1 340px'`, `ADMIN_COLORS.aside`). It holds `TuningAside`, with `selected` and `sharedWith = selected?.tuningKey ? rowsSharingKey(rows, selected.tuningKey) : []`.
- **Selecting:** `RulesTable` gets the resolved `selectedRowId`. Clicking the selected row (`selected?.id === id`) calls `onSelect(null)`.

**Tests** (`CalibrationPage.test.tsx`). The page renders in `createMemoryRouter([{path: '/calibration', element: <CalibrationPage />}], {initialEntries: [path]})`.
- **Fetch stub:** each request gets a fresh `Response`, because one body reads only once. The admin-data files are JSON (`adminData.ts` checks the content type). The harness passes `pnpm exec eslint --stdin`:
```tsx
const TUNING_URL =
  'https://api.github.com/repos/Doberjohn/inkweave/contents/packages/synergy-engine/src/data/tuning.json?ref=master';

const json = (body: unknown) => new Response(JSON.stringify(body), {headers: {'content-type': 'application/json'}});
// What Vite and vercel.json serve for an artifact that was never generated.
const spaFallback = () => new Response('<!doctype html>', {headers: {'content-type': 'text/html'}});

/**
 * Answers each request with a fresh Response (a body reads only once), picked
 * by URL: the tuning.json read, then the two admin-data artifacts.
 */
function stubFetch(answers: {tuning: () => Response; analytics?: () => Response; voteLog?: () => Response}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);
    if (url === TUNING_URL) return Promise.resolve(answers.tuning());
    if (url.endsWith('/admin-data/vote-analytics.json')) return Promise.resolve((answers.analytics ?? spaFallback)());
    if (url.endsWith('/admin-data/vote-log.json')) return Promise.resolve((answers.voteLog ?? spaFallback)());
    return Promise.resolve(new Response('Not Found', {status: 404}));
  });
}

beforeEach(() => localStorage.setItem('inkweave.reveal-admin.gh-token', 'tok'));

// R1-4's token store reads localStorage on every snapshot, so clearing it is the whole reset.
afterEach(() => {
  resetAdminDataCache();
  localStorage.clear();
  vi.restoreAllMocks();
});
```
- **Without a token** (the test clears `localStorage` first): shows the analytics rules, and an inline token prompt in the aside.
- **With a token and missing analytics:** lists the live `tuning.json` entry (`findByRole('button', {name: /Live Ramp/})`). Then `expect(fetchMock).toHaveBeenCalledWith(TUNING_URL, expect.anything())`, ported from `TuningPage.test.tsx`.
- **Read error:** says why `tuning.json` cannot be read, ported. The query is `within(screen.getByRole('complementary', {name: 'Tuning editor'})).findByRole('alert')` with text "Could not read tuning.json: GitHub 404".
- **Selection from the URL:**
  - `?rule=lore-loss` selects Lore Loss on load and opens the Lore Denial copy.
  - `?rule=location-control` marks the first location row pressed, and clicking that row clears `?rule=`.
- **Selecting:** selecting a rule writes `?rule=` (`router.state.location.search`) and scopes the pairs. Clicking it again goes back to "All pairs", ported from `CalibrationView.test.tsx`.
- **Pair reset:** a pair picked under one rule is no longer pressed after `router.navigate('/calibration?rule=ramp')`, and no dot on the scatter is ringed.
- **Charts follow the scope:**
  - With `?rule=ramp`, the scatter's subtitle starts "Ramp · ", the histogram's starts "Ramp · ", and the weekly plot is named "Weekly mean gap, Ramp".
  - "Show all pairs" clears `?rule=`, all three then read "All pairs", and focus sits on the scope line: `expect(screen.getByText('All pairs', {selector: 'p'})).toHaveFocus()`.
  - A tuning-only row (no stat) shows "No voted pairs for this rule yet." in both charts, and the weekly gap says "No score votes in this scope yet." with no plot.
  - An empty artifact (`pairs: []`) on "All pairs" shows "No voted pairs yet." in both charts, and the histogram's subtitle reads "All pairs · no pairs".
  - With `?rule=ramp`, dimension participation still says "All votes, whatever the rule".
- **A dot opens its votes.**
  - The fixture has 41 pairs. The narrowest sits furthest left (engine 1, community 1).
  - Focus the slider "Engine score against community score, All pairs", then press Home and Enter.
  - The vote table then shows that pair's title and votes. The pair list shows it as a 41st, pressed row.
- **Without raw votes:** one Notice names both the weekly gap trend and dimension participation, and no "Weekly gap" figure renders.
- **Engine-silent footnote:** shows `global.engineSilentPairs` on "All pairs", and nothing once a rule is selected.
- **Header:**
  - shows "Mean gap −0.30 · well-calibrated · 2,054 votes";
  - `expect(screen.getByText(/Data as of/)).toHaveTextContent('Data as of 2026-09-29')`. The date sits in a `<code>`, so `getByText` can't match the whole string.
- **Router:**
  - `/tuning` redirects to `/calibration`: a level-1 heading "Calibration & tuning", and `router.state.location.pathname === '/calibration'`.
  - `/calibration` names the branch it writes to ("Tuning writes to", `master`).
- **Nav:**
  - `isWritePath('/calibration')` is true, and no item points at `/tuning`;
  - `calibrationHref('lore-loss') === '/calibration?rule=lore-loss'`, `calibrationHref('a b') === '/calibration?rule=a%20b'` and `calibrationHref() === '/calibration'`.
- **PageLayout:** the two `flush` cases under Files.

**Stories** (`CalibrationWorkspace.stories.tsx`): the default story imports `ALL_PAIRS` and `ALL_PAIRS_VOTES` from `./chartFixtures` (R2-4b), the data R2-4c's `AllPairs` story draws, so the charts render at real density.

**Real-data check**, as R1-12 does it: put the deployment's artifacts in `public/admin-data/`, then look at these.
- The scatter at full density, on "All pairs" and on the busiest rule. Check that stacked spots read as short dashes along the line, and that the tooltip's "pairs on these scores" matches the table.
- The histogram's end bins, and its x labels at the two-up width: R1-3b's BarChart thins labels that would collide, so `xLabelEvery={1}` is a floor.
- The trend's span and its quiet weeks.
- The two weekly plots line up week for week (`fixedGutters`), and no tick or end label overflows `LINE_Y_AXIS_WIDTH` or `LINE_END_WIDTH` at the real data's widest values ("−10.00", or a weekly count past 99,999).
- The tab order through the slider.

**Commit:** `feat(calibration): merge calibration and tuning at /calibration (#24)`

### Task R2-7: Retire the old views

**Files:**
- **Delete:**
  - in `src/tools/analytics/`: `CalibrationView.tsx`, `VerdictHero.tsx`, `Scorecard.tsx`, `WeeklyActivityChart.tsx` and `RuleCalibrationTable.tsx`, with their `.stories.tsx`, plus `__tests__/{CalibrationView,VerdictHero,RuleCalibrationTable}.test.tsx`. The band logic stays covered by R1-8's `__tests__/verdict.test.ts`.
  - in `src/tools/tuning/`: `TuningPage.tsx`, `index.ts`, `__tests__/{TuningPage,TuningEditor,RuleSelector}.test.tsx`, and `components/{TuningEditor,RuleSelector}.tsx` with their stories.
- **Delete only if nothing imports them** (`grep -rn "activityStats\|RawVotesNotice" src`): `activityStats.ts` with `__tests__/activityStats.test.ts`, and `RawVotesNotice.tsx` with its story. R1's Overview may still use them.
- **Docs:**
  - `docs/tuning-editor-design.md:3`: one sentence saying the editor now lives in the `/calibration` aside and that `/tuning` redirects there.
  - `docs/PLAN.md:73` (D10): add `/tuning` → `/calibration`, unless R1 already rewrote that row.

**Steps:**
- This import check returns nothing. It checks imports only, so comments and docs that name the old files don't trip it:
  ```bash
  grep -rnE "from '[^']*(CalibrationView|VerdictHero|Scorecard|WeeklyActivityChart|RuleCalibrationTable|RuleSelector|TuningEditor|TuningPage)'" src .storybook
  ```
- `pnpm lint`, `pnpm typecheck`, `pnpm test:run` and `pnpm build` pass.

**Commit:** `refactor(analytics): retire the old calibration and tuning views (#24)`

### Open questions for the owner

1. **Where the mapping gets `playstyleId`.** The plan reads it from the pinned engine (`getRuleById`), with no pipeline change.
   - **The gap:** a new rule whose id differs from its playstyle, landing on master before the pin bump, shows "no copy in tuning.json" until the bump. Its playstyle stays reachable through the union.
   - **The alternative:** add `playstyleId` to `loadRuleRoster` (`scripts/precompute-vote-analytics.mjs:88`) and to `rollUpByRule` (`scripts/lib/voteAnalytics.mjs:101-104`). That would be one field, plus a `voteAnalytics.test.mjs` case.
2. **The stale-value "Reload tuning.json".** It drops every pending edit, because they were staged against the old values. Is that acceptable, or should edits whose old value still matches survive the reload?
3. **Leaving with unsaved edits.** Leaving `/calibration` with pending edits loses them, as leaving `/tuning` does today. Should R2 add a react-router `useBlocker` plus a `beforeunload` guard? R4 faces the same question.
4. **Direct rules with no copy.** The six direct rules without `tuning.json` copy stay selectable for their pairs, and the aside says they have no copy. Should they get `directRules` entries instead? That would be an app change, outside R2.
5. **The empty case.** With no token and no analytics, the rules table is empty. Should it fall back to the bundled `TUNING` names, read-only? The plan says no.
6. **The header for a shared entry.** A key can be shared by several rules (Locations, 9 rules). The plan heads the aside with the tuning name, adds "Shared by 9 rules", and labels the gap with the selected rule's name. Is that header right?
7. **R1's "Tune" link.** On the Overview, should "Tune" show for rules without a tuning entry, or read "Inspect" for them? This is R1's link, but it should match the aside's "no copy" state.
8. **Scatter overlap.** The plan draws opaque dots, each on its own page-coloured disc, with a fixed jitter along the diagonal (±0.35, and at most 0.07 off the dot's true distance from the line) and the "pairs on these scores" tooltip line. A dash along y = x reads less like a cloud than a square spread does, but a square ±0.25 would move a dot's distance from the line by up to half a point, the whole agreement band. The planning brief suggested partial opacity. At an opacity that shows stacking (0.85 or less), the neutral and red dots fall below 3:1 on the card, and opacity saturates within a few dots on a whole-number spot anyway. Keep opaque dots, or accept translucent ones below 3:1 and lean on the table view?
9. **A votes filter instead of sizing.** Dots are one size (see "Charts"). A "Votes: Any | 2+ | 5+" segmented control in the scope row could scope the scatter, the histogram and the pair list to pairs with more votes. Those are the pairs the caption says to trust. Add it in R2, or later?
10. **Histogram bins.** The bins are one point wide, centred on whole numbers, so the centre bin is the agreement band. Half-point bins would show a comb, because most gaps are whole numbers. `GAP_BIN_LIMIT` (±5) folds wider gaps into the end bins. Is ±5 right once the real data is in?
11. **Weekly votes as an area.** The score votes under the gap line are a LineChart area, not the small BarChart the planning brief named, so each week lines up with the line's point. Bars would match the Overview's weekly chart, at the cost of half a band of offset. Which?
12. **Cross-filtering.** Clicking a histogram bar could narrow the pair list, and ring the scatter's dots, to that bin. The plan leaves bars as hover-only, with a tooltip and the table. Wanted in R2?

<!-- review round (charts, 2026-10-01): notes 1-9 and 11-21 applied; note 10 adapted, as below.
- Note 9 (wrap each chart in a Panel): applied: R1-3b's frame draws no surface. An earlier R1-3b draft drew the card in ChartFrame, and this file first followed it; R1-3b now puts the frame in an untitled Panel, as R1-8, R1-9 and R1-10 do. CalibrationScatter, GapHistogram and WeeklyGapTrend each return their ChartFrame inside one, and R2-4c and R2-6 (item 4) say so.
- Note 10 (precondition owned by R1-3b, "R1-03b-chart-kit.md doesn't exist"): the premise is stale. The file exists (3,539 lines), and its LineChart already widens LinePoint.y to number | null and draws lone points (data-lone). It has no yDomain and no fixed gutter, though, and this task may not edit R1-3b or the main plan, so a stop-if-missing grep for yDomain would always stop. R2-4a now owns those edits as exact quoted Before/After blocks against R1-3b Step 27 (and Step 10 for ChartLegend's 'dot'), with a Step 1 grep that stops only if R1-3b's own null points or lone dots are missing. Contract addition 6 records how the main plan's kit contract should read once the plan is assembled. The SCATTER_MARGIN type fix is applied.
- Note 5a: R1-3b already gives a point with no neighbours a dot (circle[data-lone], r 4, no ring), so isolated weeks don't vanish. Addition 6 says so, and R2-4c tests it on the trend. The ring the note asked for is not added, since that would change R1-3b's mark.
- Note 2: with R1-3b's real hook, focus already sets the cursor to the newest dot, so a plain Enter worked. The fix still matters after Escape or once the pointer leaves, when the cursor is empty but aria-valuenow still names a dot. The test covers both, and it fails without the fix.
- Choices where a note offered two: note 4 took (a), diagonal jitter; note 13 dropped resetGithubTokenStore; note 16 added the scope line; note 17 added mark 'dot'.
- Also fixed in passing: R1-3b's plotProps carry onPointerDown (an x-only snap), so ScatterChart now overrides it with the 2-D nearest dot as well, or a press could jump the tooltip to another dot. Note 19 also sets minHeight: SPACING.xxl, because size="base" alone is about 19px.
- Checked in a scratch harness (2026-10-01) with R1-3b's useChartCursor, LineChart, BarChart, ChartFrame, ChartLegend, ChartTooltip, scale.ts and series.ts, R1-3's format.ts and SegmentedControl, and R1-6's PageLayout, all taken verbatim from their task files, with only the bridge and the theme stubbed: R2-4a's kit tests 25/25 (3 failing before the edits), scatter 8/8, ScatterChart 11/11, CalibrationCharts 16/16, and the two PageLayout flush tests. Every changed code block passes pnpm exec eslint --stdin.
- Cross-task critic round (2026-10-01), items 3, 5, 6 and 7: the three charts sit in an untitled Panel (R1-3b's frame draws no surface); R2-4a's counts follow R1-3b's 18 LineChart and 4 ChartLegend tests (Step 2: 3 failed | 22 passed (25); Step 4: 25 passed (25)); Escape keeps the slider's place, so the ScatterChart test expects "A at 2, 6" and 'a' after {Home}{Escape} (the old 'C at 8, 2' expectation fails against R1-3b's hook); ScatterChart's own leave keeps the kit's touch rule. Re-run in a fresh scratch harness built from the current R1-03b, R1-03 (Panel) and R2 task files, with R2-4a's Before/After edits applied by script: 3 failed | 22 passed (25) before Step 3, then 60/60 (LineChart 20, ChartLegend 5, scatter 8, ScatterChart 11, CalibrationCharts 16). tsc is clean on those files, and the five changed blocks (ScatterChart.tsx, its test, and the three charts) pass pnpm exec eslint --stdin. -->
