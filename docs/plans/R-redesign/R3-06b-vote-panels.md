> Part of [R: Admin redesign](../R-redesign.md), phase R3 ([R3-card-analytics.md](R3-card-analytics.md)). Read the main plan's decisions (R-28 to R-56 for R3), corrections, global constraints and shared interfaces, then the R3 header, first.

> **Re-base notes (R3-6b, 2026-10-06).** Re-based from the raw-vote third of the outline's "Task R3-6: Card analytics view" (`R3-card-analytics.md:2145-2715`, written 2026-10-01 against the planned R1 code), onto main @ `aea40b4` (R1 and R2 as built, PR #28 included), pin `upstream/inkweave` @ `bc877e1`, the R3 header and decisions R-36, R-42 and R-43. The audit (`audit-R3-6.json`) split R3-6 into 6a, 6b and 6c. This task builds Community scores, How voters answered and Votes per week, and the raw section's states.
> - **What this task owns.**
>   - The three panels.
>   - The raw section's notices, in the panels' place:
>     - the raw-votes notice, for an artifact without raw votes or an empty log;
>     - the vote log's loading and error notices;
>     - "No raw votes on this card yet.".
>   - R3-6a's KPI row only hides its two raw KPIs (Distinct voters, Accuracy sentiment). R3-6c builds the engine view. The header's States table has one row for "Raw panels and raw KPIs", so the notice is said once, here.
> - **Files: four components and a helper module, not one `RawVotePanels.tsx` of three.**
>   - The outline put `CommunityScoresChart`, `VotesPerWeekChart` and `AccuracySplit` in one file, and the chart helpers in `cardCharts.ts` with R3-6c's network helpers.
>   - Now each panel is its own file (`CommunityScores.tsx`, `VoterAnswers.tsx`, `VotesPerWeek.tsx`). `RawVotePanels.tsx` is the section: states and layout. Every function stays at cyclomatic complexity 5 or less, which is how R2 split `ScatterChart` and `TuningAside`.
>   - This task's helpers are their own module, `cards/voteCharts.ts`: 18 functions, 23 parameters, none of them a bare `string`, `number` or `boolean`. R3-6c's network helpers go in their own module, so neither task edits the other's and neither drags the other's strings into its primitive count. The outline's `cardCharts.ts` sat at 36% (audit), and PR #28 failed at 33.3%. Header contract 14 says "`cardCharts.ts` and its siblings": this is a sibling.
> - **R-36: the whole log's span.**
>   - **Dropped:**
>     - `votesPerWeek(cardVotes, 12, latestVoteDay(...))`;
>     - the `WEEKS_SHOWN` window;
>     - `xLabelEvery={3}`;
>     - the "Week of" column.
>   - **Now:**
>     - The weeks are R3-3's `votesPerWeek(cardVotes, activityWindow(log.votes, 'all'))`.
>     - Labels thin through Vote activity's `labelEvery` (`activityChart.ts:163`, at most seven).
>     - Every week is named by `bucketTitle(week, 'week', startDay, endDay)` (`:77`), so the log's part week reads "Week of Sep 28 (to Sep 30)" in the tooltip, the slider and the table.
>     - The table's first column is "Week", as `chartTable` and `weeklyTable` name it.
>   - **The subtitle** names the window and its part weeks through `partialWeeks` (`:90`): "Whole vote log, Aug 17 – Sep 30, in weeks from Monday, last week partial · votes on this card Aug 17 – Sep 29".
>   - The outline's "N distinct voters" leaves the subtitle: R3-6a's Distinct voters KPI shows it.
> - **R-42 and R-43: the split meter and shares.**
>   - The accuracy answers draw through R3-4c's `src/ui` `SplitMeter`, not the kit `SplitBar`. So there is no `centerId` and no `[data-center-tick]` test.
>   - Every share prints through `sharePercent` (`src/ui/format.ts` after R3-1a):
>     - the score tooltip and table, where the outline used `Math.round`;
>     - the rate shares.
>   - The 199-of-200 case reads ">99%".
> - **The audit's other changes, applied.**
>   - **`modeText`** returns null when the peak is a single vote, not only with no scored votes (header, Review focus 3). The median voted card has 3 raw votes, so "most often 3, 5 and 8 (1 vote each)" would be the common case and says nothing. The outline's "most often 3 (1 vote)" case is gone.
>   - **A card with only quick votes keeps its titled frame.** The empty text sits inside it and there is no legend, as R2's `GapHistogram` does (`GapHistogram.tsx:66-77`). The outline's bare `Notice` is gone.
>   - **The rate meters are unnamed `MeterBar`s** beside a printed share, as `MeterBar.tsx:10-14` asks and `DimensionParticipation.tsx:19-26` does. A named meter would read the share twice. A null share prints "—" over an empty track.
>   - **Props use the hooks' own types** (`UseVoteAnalyticsReturn`, `UseVoteLogReturn`), not `Loadable<T>`.
>   - **`SCORE_SERIES` derives from `BAND_SERIES`** (`activityChart.ts:35`): `filter(...).reverse()`. `toReversed` is ES2023, and `tsconfig.app.json` targets ES2022.
>   - **The score tooltip** keys its count in the band colour, as R2's `binTooltip` does (`GapHistogram.tsx:29`). The table gains "Share of scored votes", because the tooltip shows it.
>   - **The raw-votes notice** has its copy spelled out, as the header's States table gives it. It shows when `analytics.data?.hasRawVotes === false`, or when the log loads with no votes. It needs no wait for the log, as R2's `RawVoteSections` (`CalibrationWorkspace.tsx:237-244`).
>   - **The loading and error copy** is Vote activity's (`ActivityView.tsx:134`, `:136`).
>   - **The quick-vote caption** adds where those votes do count: "3 quick votes without a score left out. How voters answered counts their answers." On real data every quick vote answers the accuracy question (header, Sources).
>   - **The muted notes use R3-6a's shared `CAPTION`** (`cards/cardStyles.ts`, "the styles the card page's panels share (R3-6a to R3-6c)"), and the share column uses its `NUMBER`. The audit asked for one caption style rather than more `CAPTION` copies.
> - **One layout change against the header** (its "Page layout", item 4).
>   - The header puts all three panels in one `twoUp(376)` grid. Here Community scores and How voters answered share the `twoUp(376)` row, and Votes per week sits under them at full width.
>   - With three items, auto-fit gives two columns from 772px to 1,167px. The usual body column (1440 − 240 − 64 = 1,136px) is in that range, so the third panel would sit alone at half width.
>   - The whole-span chart also grows a bar a week (R-36). At 30 weeks, a 376px track leaves each week a slot under 10px (334px less BarChart's 48px of gutters), and the full width about 35px.
>   - The header's layout item 4 needs the same edit when the plan is assembled.
> - **Kept from the outline:**
>   - the three panels' titles, `capLabels="none"` with the peak in the subtitle, `xLabelEvery={1}`;
>   - the band colours (Q10, settled by R1 and R2), the legend `mark="rect"`;
>   - the single-series weekly chart with the latest week in the accent and `capLabels="extremes"`;
>   - "x.x / 3" difficulty, the carry share over the votes that named one card, with Both and Neither beside it;
>   - each chart alone in an untitled `Panel` around its `ChartFrame`;
>   - the subtitle's engine clause, only once vote analytics has loaded.
> - **What the panels take.**
>   - `card: Pick<LorcanaCard, 'id' | 'fullName'>`, so the tests and stories need no full card. The view passes its whole card.
>   - `RawVotePanels` takes the view's own props: the card and the two hook returns. So the view adds one line.
>   - **The state rule is R3-6a's.** The section asks R3-6a's `rawVotesFor` (`cards/cardView.ts`) whether there are raw votes. R3-6a's KPI row and its engine-silent caption follow the same rule. That function's doc names R3-6b's panels as its other reader. `'none'` is the raw-votes notice. `'waiting'` is the log's error or loading notice, split by `voteLog.error`.
>   - **The engine average** comes from `engineAverage`, which reads R3-6a's `calibrationOf(calibrationData(…))`, as R3-6a's hand-off suggests. So the subtitle's engine figure is the Engine → community KPI's. The cost is that `pairsForCard` runs a second time per render, over 954 pairs.
> - **Coupling to the sibling re-bases.** Step 1 checks every name, and says what to do if one differs.
>   - **R3-3:** `cardVotes.ts` as header contract 9 lists it.
>   - **R3-2:** `pairsForCard` and `cardCalibration`, through R3-6a's `calibrationData` and `calibrationOf`.
>   - **R3-1a:**
>     - `sharePercent` in `src/ui/format.ts`;
>     - `twoUp` in `src/ui/layout.ts`;
>     - `VoteSpan` in `activityModel.ts`.
>   - **R3-4c:** `SplitMeter({parts, ariaLabel, emptyText})` with `SplitMeterPart {id, label, color, value}`, as header contract 12 and R3-4c's draft (`sandbox-4c/src/ui/SplitMeter.tsx`) have it.
>   - **The fixture builders** `voteRow` (R3-3) and `pairStat` (R3-2), from their drafts.
>   - **R3-6a,** as `R3-06a-view-shell.md` and its sandbox have them:
>     - `rawVotesFor`, `RawVotes`, `calibrationData` and `calibrationOf` in `cardView.ts`;
>     - `CAPTION` and `NUMBER` in `cardStyles.ts`;
>     - `loaded`, `LOADING`, `NOT_GENERATED`, `NO_RAW_ANALYTICS`, `EMPTY_LOG`, `VIEW_LOG` and `VIEW_ANALYTICS` in `cardFixtures.ts`;
>     - the view test's `renderView(overrides)`.
>   - **R3-6a's view.** Step 11 adds one element to it.
> - **Fixture ids.** The raw-vote fixtures use ids 7990 and 8001 to 8030. R3-2's Cards to review and R3-5's switcher fixtures already use 3001 to 3009.
> - **Stories.**
>   - `RawVotePanels.stories.tsx`, titled "Admin/Insights/Card analytics/Raw-vote panels", eight stories built from one base args object.
>   - The panels hold no links, so they need no router decorator.
>   - Its title is a leaf under "Admin/Insights/Card analytics/…" (header, Stories), beside R3-6a's "…/View".
>   - **R3-6a's story file is left alone** (its Step 16 already points here). These stories get their own file, on the section alone, because each state needs a different card and log: on the view, every one would need a full `LorcanaCard` and its own `getCardById`.
>   - The view's stories now show the panels anyway: `Default` (Maui's votes), the raw-votes notice in `NoRawVotes`, and the loading notice in `AnalyticsLoading`.
> - **Fixtures.** The section gets its own small log rather than Maui's. Its tests read an exact count for every answer kind, every score band and every week, and each is written down in the fixture's doc comment. The log takes R3-6a's `VIEW_LOG.generatedAt` (Oct 6), so it is generated after its newest vote (Sep 30), and its vote analytics are R3-6a's `VIEW_ANALYTICS` with its own pairs, so `cardFixtures.ts` imports nothing from `overviewFixtures.ts`.
> - **Not taken:**
>   - **Voters per week in the tooltip.** R3-3's `WeekCount` carries votes only.
>   - **A centred split meter.** R-42 dropped it.
>   - **Docs edits.** R3-9 records the files, the layout and the module in "R3 as built".
> - **Verified** in three scratch sandboxes. Each has junctions to the repo's `node_modules` and `upstream`, and Vite's cache in the sandbox.
>   - **`sandbox-R3-6b-fix`, the code below.** A copy of `sandbox-R3-6b2` (by way of the review's `sandbox-R3-6b-adv`) with the review's fixes: the fixtures built from R3-6a's `VIEW_LOG` and `VIEW_ANALYTICS`, the failed-analytics case in Step 7, and Step 11's two added assertions.
>     - **Steps 6, 10 and 11.** The three test files pass 87 of 87: 34, 22 and 31.
>     - **`src/tools/analytics/cards` with `SplitMeter.test.tsx`.** 10 files, 216 tests passed.
>     - **Typecheck.** `tsc -p tsconfig.app.json --noEmit` is clean.
>     - **Lint.** `pnpm exec eslint --max-warnings 0 --stdin`, run in the repo, is clean on `cardFixtures.ts`, `CardAnalyticsView.tsx` and the two changed test files.
>   - **`sandbox-R3-6b2`, the code before the review.**
>     - **Setup.** R3-6a's sandbox `src` as of 19:10 on 2026-10-06. That is main plus the drafts of R3-1 (the narrowed vote types included), R3-1a, R3-5b, R3-2, R3-3, R3-5 and R3-6a. To it were added R3-4c's `SplitMeter.tsx` and its test.
>     - **Step 4 and Step 8.** Each fails with the import error quoted there.
>     - **Step 6 and Step 10.** 34 of 34, and 21 of 21 (before the failed-analytics case).
>     - **Step 11.** With the line in R3-6a's view, its view test passes 31 of 31: its own 29 and the two new cases. Without the line, the two new cases fail.
>     - **`src/tools/analytics/cards` with `SplitMeter.test.tsx`.** 10 files, 215 tests passed.
>     - **Every story.** Each renders, checked with a throwaway `composeStories` test that is not part of the plan: 8 of 8.
>     - **Typecheck.** `tsc -p tsconfig.app.json --noEmit` is clean, tests and stories included.
>     - **Lint.** `pnpm exec eslint --max-warnings 0 --stdin`, run in the repo, is clean on all eleven touched files.
>     - **CodeScene MCP 1.1.3.** It scored every touched source file, test and fixture 10.0, with no findings. The local tool is laxer than the PR gate, so this is not proof.
>   - **`sandbox-R3-6b`, the first draft.** It was built on R3-1a's sandbox and `sandbox-r33`'s R3-2 and R3-3 modules, with no R3-6a: the section checked the states itself, and each file had its own caption style.
>     - **`src/tools/analytics`.** The whole folder passed 620 of 620. One run timed out `ActivityView`'s 30-day test under load (7.1s against the 5s default); it passed alone.
>     - **The tests bite.** Each of these failed its tests:
>       - a single-vote peak named;
>       - a labelled meter;
>       - `capLabels="none"` dropped;
>       - the part week's span dropped from the tooltip.

### Task R3-6b: The raw-vote panels

**Files:**
- Create `src/tools/analytics/cards/voteCharts.ts`: the panels' pure helpers.
- Create `src/tools/analytics/cards/CommunityScores.tsx`, `VoterAnswers.tsx` and `VotesPerWeek.tsx`: one panel each.
- Create `src/tools/analytics/cards/RawVotePanels.tsx`: the section, with its states and layout.
- Create `src/tools/analytics/cards/RawVotePanels.stories.tsx`.
- Modify `src/tools/analytics/cards/cardFixtures.ts` (R3-2's module, with R3-3's `voteRow` and R3-6a's state fixtures): the raw-vote panels' log, pairs and cards.
- Modify `src/tools/analytics/cards/CardAnalyticsView.tsx` (R3-6a): render the section.
- Test `src/tools/analytics/cards/__tests__/voteCharts.test.ts` and `__tests__/RawVotePanels.test.tsx`.
- Modify `src/tools/analytics/cards/__tests__/CardAnalyticsView.test.tsx` (R3-6a): one case.

**Interfaces:**
- **Consumes:**
  - R3-3 (header contract 9), `src/tools/analytics/cards/cardVotes.ts`:
    ```ts
    export interface CardVote {vote: VoteLogRow; side: 'a' | 'b'; partnerId: string}
    export function votesForCard(votes: readonly VoteLogRow[], cardId: string): CardVote[];
    export interface ScoreHistogram {counts: number[]; scored: number; unscored: number; mean: number | null}   // counts[i]: votes scoring i + 1
    export function scoreHistogram(cardVotes: readonly CardVote[]): ScoreHistogram;
    export interface Rate {yes: number; answered: number; share: number | null}
    export interface CarryShare {named: number; singled: number; share: number | null; both: number; neither: number}
    export interface AccuracyAnswers {tooHigh: number; right: number; tooLow: number; answered: number; sentiment: number | null}
    export interface DifficultyAnswers {easy: number; situational: number; hard: number; answered: number; mean: number | null}
    export interface CardAnswers {accuracy: AccuracyAnswers; isReal: Rate; wouldPlay: Rate; carry: CarryShare; difficulty: DifficultyAnswers}
    export function cardAnswers(cardVotes: readonly CardVote[]): CardAnswers;
    export interface WeekCount {week: Day; votes: number}
    export function votesPerWeek(cardVotes: readonly CardVote[], logSpan: VoteSpan): WeekCount[];   // R-36: every Monday week of `logSpan`
    export interface CardVoteSpan {votes: number; voters: number; days: VoteSpan}
    export function cardVoteSpan(cardVotes: readonly CardVote[]): CardVoteSpan | null;          // null for no votes
    ```
  - R3-2, `cardStats.ts`, through R3-6a's `calibrationData` and `calibrationOf`: `CardCalibration.engineAvg: number | null`, vote-weighted, and null at no score votes.
  - R3-1a (header contract 3):
    - `sharePercent(fraction: number): string` in `src/ui/format.ts`;
    - `twoUp(track: number): React.CSSProperties` in `src/ui/layout.ts`;
    - `VoteSpan {startDay: Day; endDay: Day}` and `activityWindow(votes, range): VoteSpan | null` in `activity/activityModel.ts`.
  - R3-4c, `src/ui/SplitMeter.tsx`:
    ```ts
    export interface SplitMeterPart {id: string; label: string; color: string; value: number}
    export function SplitMeter(props: {parts: readonly SplitMeterPart[]; ariaLabel: string; emptyText?: string});
    // the legend is a <ul aria-label={ariaLabel}>, one <li> per part: "Too high 20% (2)"; every part zero shows emptyText
    ```
  - The fixture builders in `cardFixtures.ts`:
    - `pairStat({a, b, engineScore, communityScore, scoreVotes?, rules?})` (R3-2), which makes the gap community − engine;
    - `voteRow({a, b, ts, ...rest})` (R3-3), which defaults to "Card {id}" names, score 5, voter 1 and nothing answered.
  - On main, unchanged:
    - `activity/activityChart.ts`: `BAND_SERIES` (`:35`), `bucketTitle` (`:77`), `partialWeeks` (`:90`) and `labelEvery` (`:163`).
    - `activity/activityModel.ts`: `countOf` (`:61`) and `scoreBandOf` (`:66`).
    - The kit: `BarChart` and `BarDatum`, `ChartFrame` and `ChartTable`, `ChartLegend`, `TooltipContent`, `SeriesDef`.
    - `src/ui`: `Panel`, `Notice`, `MeterBar`, and `fmtDay`, `fmtInt` and `fmtScore`. The `ADMIN_*` tokens and the bridge's `SPACING` and `FONTS`.
    - `UseVoteAnalyticsReturn` (`useVoteAnalytics.ts:5-9`) and `UseVoteLogReturn` (`useVoteLog.ts:5-9`).
  - R3-6a, as its draft has them:
    ```ts
    // src/tools/analytics/cards/cardView.ts
    export type RawVotes = {kind: 'waiting'} | {kind: 'none'} | {kind: 'card'; cardVotes: CardVote[]};
    export function rawVotesFor(input: {analytics: VoteAnalytics | null; voteLog: VoteLog | null; cardId: string}): RawVotes;
    //   'none': hasRawVotes false, or a log loaded empty; 'waiting': no log yet (loading or failed); 'card': the card's votes, maybe none
    export function calibrationData(analytics: VoteAnalytics | null, cardId: string): CardCalibrationData | null;   // null before vote analytics
    export function calibrationOf(data: CardCalibrationData | null): CardCalibration | null;   // null too for a card in no pairs[] row
    // src/tools/analytics/cards/cardStyles.ts
    export const CAPTION: CSSProperties;   // a muted label-size line under a chart or a list
    export const NUMBER: CSSProperties;    // right-aligned tabular figures
    // src/tools/analytics/cards/cardFixtures.ts
    export function loaded<T>(data: T): {data: T; loading: false; error: null};
    export const LOADING;          // {data: null, loading: true, error: null}
    export const NOT_GENERATED;    // {data: null, loading: false, error: new Error('HTTP 404')}
    export const NO_RAW_ANALYTICS: VoteAnalytics;   // hasRawVotes: false
    export const EMPTY_LOG: VoteLog;                // no votes
    export const VIEW_LOG: VoteLog;                 // generatedAt '2026-10-06T09:00:00Z'
    export const VIEW_ANALYTICS: VoteAnalytics;     // rules: CARD_RULES, which include ramp and shift-targets
    // src/tools/analytics/cards/CardAnalyticsView.tsx: CardAnalyticsView({card, analytics, voteLog, getCardById, handoff?, headerActions?})
    // __tests__/CardAnalyticsView.test.tsx: renderView(overrides: Partial<CardAnalyticsViewProps>), under a MemoryRouter
    ```
- **Produces:**
  ```ts
  // src/tools/analytics/cards/voteCharts.ts
  export const SCORE_SERIES: readonly SeriesDef[];   // BAND_SERIES without 'unscored', lowest first: ≤4 over, 5–6 barNeutral, 7+ under
  export const WEEK_SERIES: readonly SeriesDef[];    // one neutral series: no legend
  export function scoreBars(histogram: ScoreHistogram): BarDatum[];                     // 10 columns, each count in its band's series only
  export function scoreTooltip(bar: BarDatum, histogram: ScoreHistogram): TooltipContent;   // "Score 7: 4 votes, 31% of 13 scored votes"
  export function scoreTable(histogram: ScoreHistogram, card: Pick<LorcanaCard, 'fullName'>): ChartTable;
  export function modeText(histogram: ScoreHistogram): string | null;   // "most often 7 (4 votes)"; null when no score has 2 votes
  export interface ScoresSummary {histogram: ScoreHistogram; engineAvg: number | null}
  export function scoresSubtitle(summary: ScoresSummary): string | null;   // null with no scored votes
  export function engineAverage(analytics: VoteAnalytics | null, card: Pick<LorcanaCard, 'id'>): number | null;
  export function weekBars(weeks: readonly WeekCount[]): BarDatum[];
  export function weekTooltip(bar: BarDatum, log: VoteSpan): TooltipContent;   // "Week of Sep 28 (to Sep 30): 2 votes"
  export interface WeekScope {card: Pick<LorcanaCard, 'fullName'>; log: VoteSpan}
  export function weekTable(weeks: readonly WeekCount[], scope: WeekScope): ChartTable;   // columns Week, Votes
  export interface WeekSummary {log: VoteSpan; votes: CardVoteSpan}
  export function weekSubtitle(summary: WeekSummary): string;
  export function accuracyParts(accuracy: AccuracyAnswers): SplitMeterPart[];   // too high (over), right (barNeutral), too low (under)
  export function shareText(rate: Pick<Rate, 'share'>): string;                  // "75%", "—"
  export function rateDetail(rate: Rate): string;                                // "3 of 4 answers", "No answers yet"
  export function carryDetail(carry: CarryShare): string;   // "2 of 3 votes that named one card · Both 9 · Neither 1"
  export function difficultyText(difficulty: DifficultyAnswers): string;         // "Average difficulty 1.8 / 3 (Easy 2 · Situational 1 · Hard 1)"

  // src/tools/analytics/cards/CommunityScores.tsx, VoterAnswers.tsx, VotesPerWeek.tsx, RawVotePanels.tsx: each exports its component
  export function CommunityScores(props: {histogram: ScoreHistogram; engineAvg: number | null; card: Pick<LorcanaCard, 'fullName'>});
  export function VoterAnswers(props: {answers: CardAnswers});
  export function VotesPerWeek(props: {weeks: readonly WeekCount[]; log: VoteSpan; votes: CardVoteSpan; card: Pick<LorcanaCard, 'fullName'>});
  export interface RawVotePanelsProps {card: Pick<LorcanaCard, 'id' | 'fullName'>; analytics: UseVoteAnalyticsReturn; voteLog: UseVoteLogReturn}
  export function RawVotePanels(props: RawVotePanelsProps);

  // src/tools/analytics/cards/cardFixtures.ts gains
  export const RAW_CARD, THIN_CARD, QUICK_ONLY_CARD, UNVOTED_CARD: Pick<LorcanaCard, 'id' | 'fullName'>;   // 8001, 8020, 8010, 8030
  export const RAW_LOG: VoteLog;                 // 20 votes, Mon Aug 17 to Wed Sep 30, generated at VIEW_LOG's time
  export const RAW_PAIRS: readonly PairStat[];   // the pairs the engine scores in that log
  export const RAW_ANALYTICS: VoteAnalytics;     // R3-6a's VIEW_ANALYTICS with RAW_PAIRS
  ```
  - **The section's states**, in this order. Every function is cyclomatic complexity 5 or less:
    1. `rawVotesFor` says `'none'`: the raw-votes notice. That is vote analytics' `hasRawVotes: false`, even while the log loads, or a log that loaded empty.
    2. `rawVotesFor` says `'waiting'`: with `voteLog.error`, the error notice (`role="alert"`); without it, "Loading vote log...".
    3. `'card'` with no votes on the card: "No raw votes on this card yet.".
    4. Otherwise the panels show.

- [ ] **Step 1: Check what this task builds on**

R3-6b needs R3-1a, R3-2, R3-3, R3-4c and R3-6a committed on `feature/24-redesign-r3`. Run each line from the repo root, in Git Bash:

```bash
git log --oneline -12
grep -nE "export function (votesForCard|scoreHistogram|cardAnswers|votesPerWeek|cardVoteSpan)\(" src/tools/analytics/cards/cardVotes.ts
grep -nE "export function (pairsForCard|cardCalibration)\(" src/tools/analytics/cards/cardStats.ts
grep -nE "export function (voteRow|pairStat)\(" src/tools/analytics/cards/cardFixtures.ts
grep -n "export function sharePercent" src/ui/format.ts
grep -n "export function twoUp" src/ui/layout.ts
grep -n "export interface VoteSpan" src/tools/analytics/activity/activityModel.ts
grep -nE "export (function SplitMeter|interface SplitMeterPart)|ariaLabel" src/ui/SplitMeter.tsx
grep -nE "export (function (rawVotesFor|calibrationData|calibrationOf)|type RawVotes)" src/tools/analytics/cards/cardView.ts
grep -nE "export const (CAPTION|NUMBER)\b" src/tools/analytics/cards/cardStyles.ts
grep -nE "export (function loaded|const (LOADING|NOT_GENERATED|NO_RAW_ANALYTICS|EMPTY_LOG|VIEW_LOG|VIEW_ANALYTICS)\b)" src/tools/analytics/cards/cardFixtures.ts
grep -n "function renderView" src/tools/analytics/cards/__tests__/CardAnalyticsView.test.tsx
grep -n "Loading vote log\|Could not load the vote log\|need raw votes" src/tools/analytics/cards/*.tsx
```

Expected:
- The log shows the commits of R3-1a, R3-2, R3-3, R3-4c and R3-6a.
- The `cardVotes.ts` grep prints five lines.
- The `cardStats.ts` grep prints two lines.
- The `voteRow` and `pairStat` grep prints two lines.
- The `sharePercent`, `twoUp` and `VoteSpan` greps print one line each.
- The `SplitMeter` grep prints the component, the part type and its `ariaLabel` prop.
- The `cardView.ts` grep prints four lines.
- The `cardStyles.ts` grep prints two lines.
- The state-fixtures grep prints seven lines.
- The `renderView` grep prints one line.
- The last grep prints nothing: no card component words the raw section yet. R3-6a's KPI row hides its raw KPIs, and its engine-silent caption has its own copy in `cardView.ts`.

If something differs:
- **`SplitMeter`.** If it has no `ariaLabel`:
  - pass the question through whatever names its legend;
  - change the two tests that find the list by "Is the engine’s score right?".
- **A fixture builder or state fixture** with another name: rename it in Steps 2, 3, 7, 11 and 12.
- **No `rawVotesFor`.** R3-6a may have dropped it. Then `RawVotePanels` makes the same checks inline, in this order:
  - `analytics.data?.hasRawVotes === false` shows `RawVotesNeeded`;
  - `voteLog.error` or no `voteLog.data` shows `LogNotice`;
  - a log whose `activityWindow(votes, 'all')` is null shows `RawVotesNeeded`;
  - otherwise it hands `votesForCard(voteLog.data.votes, card.id)` to `CardPanels`.

  Each function stays at 8 or less (about 6), and Step 7's tests hold unchanged.
- **No `calibrationData` or `calibrationOf`.** `engineAverage` reads R3-2 directly: `analytics ? cardCalibration(pairsForCard(analytics.pairs, card.id)).engineAvg : null`, with `cardStats.ts`' two names imported in place of `cardView.ts`'.
- **No `cardStyles.ts`.** Give each panel file a local `const NOTE: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted};`, and give the share cell `textAlign: 'right'` and `fontVariantNumeric: 'tabular-nums'`.
- **The last grep prints a line.** R3-6a words part of the raw section itself, such as a loading or no-raw notice for its KPI row. Note where it is. Step 11 removes it, since the header's States table gives the raw panels and the raw KPIs one notice, and this task's.
- **`CardAnalyticsView.tsx`.** Read it and find where the calibration row ends (header, "Page layout", item 3). In R3-6a's draft that is the line `{calibration && <CalibrationRow … />}`, the body's last. Step 11 adds the section right after it.

- [ ] **Step 2: Add the raw-vote fixtures**

In `src/tools/analytics/cards/cardFixtures.ts`, append this block at the end of the file. The head needs no change: R3-5 imports `LorcanaCard`, and R3-6a's Step 2 widens the type imports to `VoteAnalytics` and `VoteLog`. The block builds on R3-6a's `VIEW_LOG` and `VIEW_ANALYTICS`, defined above it. Every count the tests read is in its doc comments. No function is added, so the module's primitive-argument share doesn't move.

```ts
/*
 * The raw-vote panels (R3-6b): a small vote log, written to be read by eye.
 * Card 8001 has 16 votes on four partners, from Monday Aug 17 to Tuesday
 * Sep 29: 13 scored (7 four times, so one clear peak) and 3 quick votes, which
 * answer the accuracy question as real quick votes do. It sits on the b side
 * of 7990's rows. One vote lands late on a Sunday (Sep 13), and every
 * timestamp has Supabase's microsecond +00:00 form. The log's newest vote, on
 * another pair, is on Wednesday Sep 30, so the log's last week is a part week.
 * Card 8020 has two scored votes with nothing else answered, the last on
 * Sep 9. Card 8010 has only quick votes. Card 8030 has none.
 */

/** Card 8001's partners, each pair with the lower id on side a, as the votes table stores it. */
const WITH_7990 = {a: '7990', b: '8001'} as const;
const WITH_8002 = {a: '8001', b: '8002'} as const;
const WITH_8003 = {a: '8001', b: '8003'} as const;
const WITH_8004 = {a: '8001', b: '8004'} as const;

/** Card 8001: every panel has data. */
export const RAW_CARD: Pick<LorcanaCard, 'id' | 'fullName'> = {id: '8001', fullName: 'Card 8001'};
/** Card 8020: two scored votes, a point apart, and no answers. */
export const THIN_CARD: Pick<LorcanaCard, 'id' | 'fullName'> = {id: '8020', fullName: 'Card 8020'};
/** Card 8010: two quick votes, so nothing to score. */
export const QUICK_ONLY_CARD: Pick<LorcanaCard, 'id' | 'fullName'> = {id: '8010', fullName: 'Card 8010'};
/** Card 8030: in the card list, with no raw votes. */
export const UNVOTED_CARD: Pick<LorcanaCard, 'id' | 'fullName'> = {id: '8030', fullName: 'Card 8030'};

/**
 * Card 8001's answers, counted: accuracy too high 2, right 6, too low 2; real
 * 3 of 4; would play 1 of 3; carry named 2 of 3 that named one card, both 9,
 * neither 1; difficulty easy 2, situational 1, hard 1. Weeks from Aug 17: 2,
 * 0, 3, 1, 5, 3, 2.
 */
const RAW_VOTES: readonly VoteLogRow[] = [
  voteRow({
    ...WITH_7990,
    ts: '2026-08-17T10:00:00.123456+00:00',
    score: 7,
    voter: 1,
    accuracy: 0,
    isReal: true,
    difficulty: 1,
    whoCarries: 'both',
  }),
  voteRow({...WITH_8002, ts: '2026-08-19T10:00:00.123456+00:00', score: 7, voter: 2, whoCarries: 'both'}),
  voteRow({...WITH_8002, ts: '2026-09-01T10:00:00.123456+00:00', score: 8, voter: 3, accuracy: -1, wouldPlay: true, whoCarries: 'a'}),
  voteRow({...WITH_8003, ts: '2026-09-03T10:00:00.123456+00:00', score: 6, voter: 1, whoCarries: 'both'}),
  voteRow({...WITH_8002, ts: '2026-09-04T10:00:00.123456+00:00', score: null, voter: 4, accuracy: 0}),
  // Sunday night: still the week of Sep 7.
  voteRow({
    ...WITH_7990,
    ts: '2026-09-13T23:30:00.123456+00:00',
    score: 7,
    voter: 2,
    accuracy: 1,
    isReal: true,
    difficulty: 2,
    whoCarries: 'b',
  }),
  voteRow({
    ...WITH_8002,
    ts: '2026-09-14T10:00:00.123456+00:00',
    score: 8,
    voter: 5,
    accuracy: 0,
    isReal: false,
    wouldPlay: false,
    difficulty: 3,
    whoCarries: 'both',
  }),
  voteRow({...WITH_8002, ts: '2026-09-15T10:00:00.123456+00:00', score: 10, voter: 6, whoCarries: 'both'}),
  // 'a' is 7990 here: the other card.
  voteRow({...WITH_7990, ts: '2026-09-16T10:00:00.123456+00:00', score: 6, voter: 3, accuracy: -1, whoCarries: 'a'}),
  voteRow({...WITH_8004, ts: '2026-09-17T10:00:00.123456+00:00', score: 9, voter: 2, whoCarries: 'both'}),
  voteRow({...WITH_8003, ts: '2026-09-18T10:00:00.123456+00:00', score: null, voter: 5, accuracy: 0}),
  voteRow({...WITH_8002, ts: '2026-09-21T10:00:00.123456+00:00', score: 5, voter: 7, accuracy: 1, whoCarries: 'neither'}),
  voteRow({
    ...WITH_7990,
    ts: '2026-09-23T10:00:00.123456+00:00',
    score: 8,
    voter: 4,
    isReal: true,
    difficulty: 1,
    whoCarries: 'both',
  }),
  voteRow({...WITH_8003, ts: '2026-09-24T10:00:00.123456+00:00', score: 3, voter: 6, whoCarries: 'both'}),
  voteRow({...WITH_8002, ts: '2026-09-28T10:00:00.123456+00:00', score: 7, voter: 8, accuracy: 0, wouldPlay: false, whoCarries: 'both'}),
  voteRow({...WITH_7990, ts: '2026-09-29T10:00:00.123456+00:00', score: null, voter: 9, accuracy: 0}),
  voteRow({a: '8020', b: '8021', ts: '2026-08-26T10:00:00.123456+00:00', score: 5, voter: 3}),
  voteRow({a: '8020', b: '8021', ts: '2026-09-09T10:00:00.123456+00:00', score: 6, voter: 4}),
  voteRow({a: '8010', b: '8011', ts: '2026-09-22T10:00:00.123456+00:00', score: null, voter: 1, accuracy: 0}),
  // The log's newest vote, on a Wednesday.
  voteRow({a: '8010', b: '8011', ts: '2026-09-30T14:20:00.123456+00:00', score: null, voter: 2, accuracy: 1}),
];

/** The vote log the raw-vote panels read: 20 votes by 9 voters, generated with the view's log, after its newest vote. */
export const RAW_LOG: VoteLog = {generatedAt: VIEW_LOG.generatedAt, voterCount: 9, votes: [...RAW_VOTES]};

/**
 * pairs[] for that log: the pairs the engine scores. Card 8001's engine
 * average is (6 × 4 + 8 × 6) / 10 = 7.2; 8003 and 8004 are engine-silent.
 */
export const RAW_PAIRS: readonly PairStat[] = [
  pairStat({...WITH_7990, engineScore: 6, communityScore: 7, scoreVotes: 4}),
  pairStat({...WITH_8002, engineScore: 8, communityScore: 7.5, scoreVotes: 6, rules: ['ramp', 'shift-targets']}),
  pairStat({a: '8020', b: '8021', engineScore: 7, communityScore: 5.5, scoreVotes: 2}),
];

/**
 * Vote analytics with those pairs: the view's otherwise (VIEW_ANALYTICS), raw
 * votes on. Its rules name ramp and shift-targets; its global numbers aren't
 * this log's, and the panels print none of them.
 */
export const RAW_ANALYTICS: VoteAnalytics = {...VIEW_ANALYTICS, pairs: [...RAW_PAIRS]};
```

- [ ] **Step 3: Write the failing tests for the helpers**

Create `src/tools/analytics/cards/__tests__/voteCharts.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {ADMIN_COLORS} from '../../../../theme/adminTheme';
import {BAND_SERIES} from '../../activity/activityChart';
import type {VoteSpan} from '../../activity/activityModel';
import {RAW_ANALYTICS, RAW_CARD, THIN_CARD, UNVOTED_CARD} from '../cardFixtures';
import type {CardVoteSpan, CarryShare, DifficultyAnswers, Rate, ScoreHistogram} from '../cardVotes';
import {
  SCORE_SERIES,
  WEEK_SERIES,
  accuracyParts,
  carryDetail,
  difficultyText,
  engineAverage,
  modeText,
  rateDetail,
  scoreBars,
  scoreTable,
  scoreTooltip,
  scoresSubtitle,
  shareText,
  weekBars,
  weekSubtitle,
  weekTable,
  weekTooltip,
} from '../voteCharts';

/** A histogram from its ten counts, scores 1 to 10; the mean is the counts' own. */
function histogramOf({counts, unscored = 0}: {counts: number[]; unscored?: number}): ScoreHistogram {
  const scored = counts.reduce((sum, n) => sum + n, 0);
  const total = counts.reduce((sum, n, i) => sum + n * (i + 1), 0);
  return {counts, scored, unscored, mean: scored > 0 ? total / scored : null};
}

/** Card 8001's: 7 four times, 8 three times, 6 twice, and one each of 3, 5, 9 and 10. */
const RAW = histogramOf({counts: [0, 0, 1, 0, 1, 2, 4, 3, 1, 1], unscored: 3});
/** The log of the raw-vote fixtures: Monday Aug 17 to Wednesday Sep 30. */
const LOG: VoteSpan = {startDay: '2026-08-17', endDay: '2026-09-30'};
/** The same weeks, ending on a Sunday: no part week. */
const WHOLE_WEEKS: VoteSpan = {startDay: '2026-08-17', endDay: '2026-10-04'};

describe('the series', () => {
  it('colours the histogram with Vote activity’s score bands, lowest first, without "No score"', () => {
    expect(SCORE_SERIES.map((s) => s.label)).toEqual(['≤4', '5–6', '7+']);
    for (const series of SCORE_SERIES) {
      expect(series).toEqual(BAND_SERIES.find((band) => band.id === series.id));
    }
  });

  it('draws the weeks as one neutral series, so they take no legend', () => {
    expect(WEEK_SERIES).toEqual([{id: 'votes', label: 'Votes', color: ADMIN_COLORS.barNeutral}]);
  });
});

describe('scoreBars', () => {
  const BANDS = histogramOf({counts: [0, 0, 0, 2, 0, 3, 5, 0, 0, 0]});

  it.each([
    [4, 'low', 2],
    [6, 'mid', 3],
    [7, 'high', 5],
  ])('puts score %i’s count in the %s band alone', (score, band, votes) => {
    const bar = scoreBars(BANDS)[score - 1];
    expect(bar.key).toBe(String(score));
    expect(bar.label).toBe(String(score));
    expect(Object.entries(bar.values).filter(([, n]) => n > 0)).toEqual([[band, votes]]);
  });
});

describe('scoreTooltip and scoreTable', () => {
  it('gives a column its votes, keyed in its band colour, and their share of the scored votes', () => {
    const bar = scoreBars(RAW)[6];
    expect(scoreTooltip(bar, RAW)).toEqual({
      title: 'Score 7',
      rows: [
        {value: '4', label: 'votes', color: ADMIN_COLORS.under},
        {value: '31%', label: 'of 13 scored votes'},
      ],
    });
  });

  it.each<[string, ScoreHistogram, string[]]>([
    ['one vote', histogramOf({counts: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0]}), ['1', 'vote', '100%', 'of 1 scored vote']],
    // R-43: one short of every scored vote never reads 100%.
    ['199 of 200', histogramOf({counts: [0, 0, 199, 0, 0, 0, 0, 0, 0, 1]}), ['199', 'votes', '>99%', 'of 200 scored votes']],
  ])('words %s', (_, histogram, [votes, unit, share, of]) => {
    const tip = scoreTooltip(scoreBars(histogram)[2], histogram);
    expect(tip.rows.map((row) => [row.value, row.label])).toEqual([
      [votes, unit],
      [share, of],
    ]);
  });

  it('tables every score, empty ones included, and reads 0% with no scored votes', () => {
    const table = scoreTable(RAW, RAW_CARD);
    expect(table.caption).toBe('Community scores for Card 8001, from scored votes only');
    expect(table.columns).toEqual(['Score', 'Votes', 'Share of scored votes']);
    expect(table.rows).toHaveLength(10);
    expect(table.rows[0]).toEqual(['1', '0', '0%']);
    expect(table.rows[6]).toEqual(['7', '4', '31%']);
    expect(table.rows[9]).toEqual(['10', '1', '8%']);
    const empty = scoreTable(histogramOf({counts: Array(10).fill(0), unscored: 2}), RAW_CARD);
    expect(empty.rows.every((row) => row[2] === '0%')).toBe(true);
  });
});

describe('modeText', () => {
  it.each<[string, number[], string | null]>([
    ['one peak', [0, 0, 1, 0, 1, 2, 4, 3, 1, 1], 'most often 7 (4 votes)'],
    ['a tie', [0, 0, 0, 0, 0, 1, 4, 4, 0, 0], 'most often 7 and 8 (4 votes each)'],
    ['three tied', [0, 0, 0, 0, 0, 3, 3, 3, 0, 0], 'most often 6, 7 and 8 (3 votes each)'],
    ['a peak of two', [0, 0, 0, 0, 2, 0, 0, 0, 0, 1], 'most often 5 (2 votes)'],
    // A single-vote peak says nothing: every voted score would tie.
    ['single votes', [0, 0, 1, 0, 1, 0, 0, 0, 1, 0], null],
    ['one vote', [0, 0, 0, 0, 0, 0, 1, 0, 0, 0], null],
    ['no scored votes', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], null],
  ])('%s', (_, counts, text) => {
    expect(modeText(histogramOf({counts}))).toBe(text);
  });
});

describe('scoresSubtitle', () => {
  it.each<[string, ScoreHistogram, number | null, string | null]>([
    [
      'the mean, the peak and the engine',
      RAW,
      7.2,
      'Average 7.0 from 13 scored votes (plain mean) · most often 7 (4 votes) · engine 7.2 on the pairs it scores',
    ],
    ['no engine clause before vote analytics', RAW, null, 'Average 7.0 from 13 scored votes (plain mean) · most often 7 (4 votes)'],
    [
      'no peak on single votes',
      histogramOf({counts: [0, 0, 0, 0, 1, 1, 0, 0, 0, 0]}),
      7,
      'Average 5.5 from 2 scored votes (plain mean) · engine 7.0 on the pairs it scores',
    ],
    ['nothing with no scored votes', histogramOf({counts: Array(10).fill(0), unscored: 2}), 7, null],
  ])('%s', (_, histogram, engineAvg, text) => {
    expect(scoresSubtitle({histogram, engineAvg})).toBe(text);
  });
});

describe('engineAverage', () => {
  it('weights the card’s engine scores by score votes, once vote analytics is in', () => {
    // (6 × 4 + 8 × 6) / 10
    expect(engineAverage(RAW_ANALYTICS, RAW_CARD)).toBeCloseTo(7.2, 10);
    expect(engineAverage(RAW_ANALYTICS, THIN_CARD)).toBe(7);
  });

  it('is null before vote analytics loads, and for a card in no pairs[] row', () => {
    expect(engineAverage(null, RAW_CARD)).toBeNull();
    expect(engineAverage(RAW_ANALYTICS, UNVOTED_CARD)).toBeNull();
  });
});

describe('the weeks', () => {
  const WEEKS = [
    {week: '2026-09-21', votes: 1},
    {week: '2026-09-28', votes: 2},
  ];

  it('labels each column by its Monday', () => {
    expect(weekBars(WEEKS)).toEqual([
      {key: '2026-09-21', label: 'Sep 21', values: {votes: 1}},
      {key: '2026-09-28', label: 'Sep 28', values: {votes: 2}},
    ]);
  });

  it('names the log’s part week in the tooltip and the table, as Vote activity does', () => {
    const [whole, part] = weekBars(WEEKS);
    expect(weekTooltip(whole, LOG)).toEqual({title: 'Week of Sep 21', rows: [{value: '1', label: 'vote'}]});
    expect(weekTooltip(part, LOG)).toEqual({title: 'Week of Sep 28 (to Sep 30)', rows: [{value: '2', label: 'votes'}]});
    const table = weekTable(WEEKS, {card: RAW_CARD, log: LOG});
    expect(table.caption).toBe('Votes per week on Card 8001, Aug 17 – Sep 30. Weeks start on Monday (UTC).');
    expect(table.columns).toEqual(['Week', 'Votes']);
    expect(table.rows).toEqual([
      ['Week of Sep 21', '1'],
      ['Week of Sep 28 (to Sep 30)', '2'],
    ]);
  });

  it.each<[string, VoteSpan, CardVoteSpan['days'], string]>([
    [
      'a part last week',
      LOG,
      {startDay: '2026-08-17', endDay: '2026-09-29'},
      'Whole vote log, Aug 17 – Sep 30, in weeks from Monday, last week partial · votes on this card Aug 17 – Sep 29',
    ],
    [
      'whole weeks, and a card voted on one day',
      WHOLE_WEEKS,
      {startDay: '2026-09-09', endDay: '2026-09-09'},
      'Whole vote log, Aug 17 – Oct 4, in weeks from Monday · votes on this card Sep 9',
    ],
  ])('words the subtitle for %s', (_, log, days, text) => {
    expect(weekSubtitle({log, votes: {votes: 2, voters: 2, days}})).toBe(text);
  });
});

describe('the answers', () => {
  it('splits the accuracy answers too high, right, too low, in the gap’s colours', () => {
    expect(accuracyParts({tooHigh: 2, right: 6, tooLow: 2, answered: 10, sentiment: 0})).toEqual([
      {id: 'tooHigh', label: 'Too high', color: ADMIN_COLORS.over, value: 2},
      {id: 'right', label: 'Right', color: ADMIN_COLORS.barNeutral, value: 6},
      {id: 'tooLow', label: 'Too low', color: ADMIN_COLORS.under, value: 2},
    ]);
  });

  it.each<[Rate, string, string]>([
    [{yes: 3, answered: 4, share: 0.75}, '75%', '3 of 4 answers'],
    [{yes: 1, answered: 1, share: 1}, '100%', '1 of 1 answer'],
    [{yes: 0, answered: 0, share: null}, '—', 'No answers yet'],
  ])('prints the rate %j as %s, "%s"', (rate, share, detail) => {
    expect(shareText(rate)).toBe(share);
    expect(rateDetail(rate)).toBe(detail);
  });

  it.each<[CarryShare, string]>([
    [{named: 2, singled: 3, share: 2 / 3, both: 9, neither: 1}, '2 of 3 votes that named one card · Both 9 · Neither 1'],
    [{named: 0, singled: 0, share: null, both: 31, neither: 0}, 'No vote named one card · Both 31 · Neither 0'],
  ])('counts the carry answers %j', (carry, text) => {
    expect(carryDetail(carry)).toBe(text);
  });

  it.each<[DifficultyAnswers, string]>([
    [
      {easy: 2, situational: 1, hard: 1, answered: 4, mean: 1.75},
      'Average difficulty 1.8 / 3 (Easy 2 · Situational 1 · Hard 1)',
    ],
    [{easy: 0, situational: 0, hard: 0, answered: 0, mean: null}, 'No difficulty answers yet.'],
  ])('words the difficulty %j', (difficulty, text) => {
    expect(difficultyText(difficulty)).toBe(text);
  });
});
```

- [ ] **Step 4: Run them and watch them fail**

Run: `pnpm vitest run src/tools/analytics/cards/__tests__/voteCharts.test.ts`

Expected: FAIL, with `Error: Failed to resolve import "../voteCharts" from "src/tools/analytics/cards/__tests__/voteCharts.test.ts". Does the file exist?` and `Test Files  1 failed (1)`.

- [ ] **Step 5: Write `voteCharts.ts`**

Create `src/tools/analytics/cards/voteCharts.ts`:

```ts
import type {LorcanaCard} from 'inkweave-synergy-engine';
import type {BarDatum} from '../../../charts/BarChart';
import type {ChartTable} from '../../../charts/ChartFrame';
import type {TooltipContent} from '../../../charts/ChartTooltip';
import type {SeriesDef} from '../../../charts/series';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {fmtDay, fmtInt, fmtScore, sharePercent} from '../../../ui/format';
import type {SplitMeterPart} from '../../../ui/SplitMeter';
import {BAND_SERIES, bucketTitle, partialWeeks} from '../activity/activityChart';
import {countOf, scoreBandOf, type VoteSpan} from '../activity/activityModel';
import type {VoteAnalytics} from '../voteAnalyticsTypes';
import {calibrationData, calibrationOf} from './cardView';
import type {
  AccuracyAnswers,
  CardVoteSpan,
  CarryShare,
  DifficultyAnswers,
  Rate,
  ScoreHistogram,
  WeekCount,
} from './cardVotes';

/*
 * The words and numbers behind /cards' raw-vote panels (R3-6b): Community
 * scores, How voters answered and Votes per week. Pure functions over
 * cardVotes.ts' counts; the panels only draw what these return. Every one
 * takes objects, never loose strings or numbers, so the module stays clear of
 * the CodeScene gate's primitive-argument limit.
 */

/**
 * The histogram's colours: admin's score bands as Vote activity draws them
 * (BAND_SERIES), lowest first as the x axis reads, without "No score": a quick
 * vote has no score to place. Derived, so the two charts can't drift apart.
 */
export const SCORE_SERIES: readonly SeriesDef[] = BAND_SERIES.filter((s) => s.id !== 'unscored').reverse();

/** Votes per week is one series, so it takes no legend: its title names it, and emphasisKey draws the latest week in the accent. */
export const WEEK_SERIES: readonly SeriesDef[] = [{id: 'votes', label: 'Votes', color: ADMIN_COLORS.barNeutral}];

/** Each band's mark colour, for the line key on a column's count. */
const BAND_COLOR: Record<string, string> = Object.fromEntries(SCORE_SERIES.map((s) => [s.id, s.color]));

/** One column per score, 1 to 10. Each count sits in its band's series and the other two are 0, so every column is one segment. */
export function scoreBars(histogram: ScoreHistogram): BarDatum[] {
  return histogram.counts.map((count, i) => {
    const score = String(i + 1);
    return {key: score, label: score, values: {low: 0, mid: 0, high: 0, [scoreBandOf(i + 1)]: count}};
  });
}

/** Each score's share of the card's scored votes, scores 1 to 10, as sharePercent prints it (R-43); "0%" each with none. */
function scoreShares(histogram: ScoreHistogram): string[] {
  return histogram.counts.map((count) => sharePercent(histogram.scored > 0 ? count / histogram.scored : 0));
}

/** A column's tooltip, which is also its name for the keyboard: "Score 7: 4 votes, 31% of 13 scored votes". */
export function scoreTooltip(bar: BarDatum, histogram: ScoreHistogram): TooltipContent {
  const i = Number(bar.key) - 1;
  const votes = histogram.counts[i] ?? 0;
  return {
    title: `Score ${bar.key}`,
    rows: [
      {value: fmtInt(votes), label: votes === 1 ? 'vote' : 'votes', color: BAND_COLOR[scoreBandOf(i + 1)]},
      {value: scoreShares(histogram)[i] ?? '0%', label: `of ${countOf(histogram.scored, 'scored vote')}`},
    ],
  };
}

/** The histogram's table view: every score, empty ones included, with its votes and its share. */
export function scoreTable(histogram: ScoreHistogram, card: Pick<LorcanaCard, 'fullName'>): ChartTable {
  const shares = scoreShares(histogram);
  return {
    caption: `Community scores for ${card.fullName}, from scored votes only`,
    columns: ['Score', 'Votes', 'Share of scored votes'],
    rows: histogram.counts.map((count, i) => [String(i + 1), fmtInt(count), shares[i]]),
  };
}

/** "7", "7 and 8", "6, 7 and 8". */
function listOf(items: readonly string[]): string {
  return items.length === 1 ? items[0] : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

/**
 * The histogram's peak, for its subtitle, since the columns print no counts:
 * "most often 7 (4 votes)", and every tied score on a tie ("most often 7 and 8
 * (4 votes each)"). Null when no score has two votes: a peak of one vote says
 * nothing, and the median voted card has 3 raw votes.
 */
export function modeText(histogram: ScoreHistogram): string | null {
  const top = Math.max(...histogram.counts);
  if (top < 2) return null;
  const scores = histogram.counts.flatMap((count, i) => (count === top ? [String(i + 1)] : []));
  return `most often ${listOf(scores)} (${countOf(top, 'vote')}${scores.length > 1 ? ' each' : ''})`;
}

/** What Community scores' subtitle reads. */
export interface ScoresSummary {
  histogram: ScoreHistogram;
  /** The card's vote-weighted engine score on the pairs it scores (engineAverage); null leaves the engine clause out. */
  engineAvg: number | null;
}

/**
 * "Average 7.0 from 13 scored votes (plain mean) · most often 7 (4 votes) ·
 * engine 7.2 on the pairs it scores". The peak and the engine clause drop out
 * when there is none. Null with no scored votes: the panel says so instead.
 */
export function scoresSubtitle({histogram, engineAvg}: ScoresSummary): string | null {
  if (histogram.scored === 0) return null;
  const clauses = [
    `Average ${fmtScore(histogram.mean)} from ${countOf(histogram.scored, 'scored vote')} (plain mean)`,
    modeText(histogram),
    engineAvg == null ? null : `engine ${fmtScore(engineAvg)} on the pairs it scores`,
  ];
  return clauses.filter((clause) => clause != null).join(' · ');
}

/**
 * The card's vote-weighted engine score over the pairs it scores, as R3-6a's
 * Engine → community KPI reads it (calibrationOf), for Community scores'
 * subtitle. Null until vote analytics loads, and for a card in no pairs[] row.
 */
export function engineAverage(analytics: VoteAnalytics | null, card: Pick<LorcanaCard, 'id'>): number | null {
  return calibrationOf(calibrationData(analytics, card.id))?.engineAvg ?? null;
}

/** One column per Monday week, labelled by its Monday ("Sep 28"). */
export function weekBars(weeks: readonly WeekCount[]): BarDatum[] {
  return weeks.map((w) => ({key: w.week, label: fmtDay(w.week), values: {votes: w.votes}}));
}

/**
 * A column's tooltip, and its name for the keyboard, in Vote activity's words
 * (bucketTitle): "Week of Sep 28 (to Sep 30): 2 votes" for the log's part week.
 */
export function weekTooltip(bar: BarDatum, log: VoteSpan): TooltipContent {
  const votes = bar.values.votes ?? 0;
  return {
    title: bucketTitle(bar.key, 'week', log.startDay, log.endDay),
    rows: [{value: fmtInt(votes), label: votes === 1 ? 'vote' : 'votes'}],
  };
}

/** What Votes per week's table names. */
export interface WeekScope {
  card: Pick<LorcanaCard, 'fullName'>;
  /** The whole vote log's first and last days: activityWindow(votes, 'all') (R-36). */
  log: VoteSpan;
}

/** The table view: every week of the log, quiet ones included, oldest first, each named as its tooltip names it. */
export function weekTable(weeks: readonly WeekCount[], {card, log}: WeekScope): ChartTable {
  return {
    caption: `Votes per week on ${card.fullName}, ${dayRange(log)}. Weeks start on Monday (UTC).`,
    columns: ['Week', 'Votes'],
    rows: weeks.map((w) => [bucketTitle(w.week, 'week', log.startDay, log.endDay), fmtInt(w.votes)]),
  };
}

/** "Aug 17 – Sep 30", or "Sep 9" for one day. */
function dayRange({startDay, endDay}: VoteSpan): string {
  return startDay === endDay ? fmtDay(startDay) : `${fmtDay(startDay)} – ${fmtDay(endDay)}`;
}

/** What Votes per week's subtitle reads. */
export interface WeekSummary {
  log: VoteSpan;
  /** The card's own votes (cardVoteSpan). */
  votes: CardVoteSpan;
}

/**
 * "Whole vote log, Aug 17 – Sep 30, in weeks from Monday, last week partial ·
 * votes on this card Aug 17 – Sep 29". The weeks are the log's, so every card
 * shares one axis (R-36), and partialWeeks names the part weeks as Vote
 * activity does.
 */
export function weekSubtitle({log, votes}: WeekSummary): string {
  const weeks = `Whole vote log, ${dayRange(log)}, in weeks from Monday${partialWeeks(log.startDay, log.endDay)}`;
  return `${weeks} · votes on this card ${dayRange(votes.days)}`;
}

/**
 * The accuracy question's answers as the voter reads them, left to right: the
 * engine's score is too high, right or too low. They take the gap's own
 * colours: "too high" is the engine scoring above the community (over).
 */
const ACCURACY_PARTS = [
  {id: 'tooHigh', label: 'Too high', color: ADMIN_COLORS.over},
  {id: 'right', label: 'Right', color: ADMIN_COLORS.barNeutral},
  {id: 'tooLow', label: 'Too low', color: ADMIN_COLORS.under},
] as const;

/** The split meter's parts: each answer's count, in reading order. */
export function accuracyParts(accuracy: AccuracyAnswers): SplitMeterPart[] {
  return ACCURACY_PARTS.map((part) => ({...part, value: accuracy[part.id]}));
}

/** A rate's share as printed beside its meter: "75%", or "—" when nobody answered. */
export function shareText({share}: Pick<Rate, 'share'>): string {
  return share == null ? '—' : sharePercent(share);
}

/** A yes/no question's counts under its meter: "3 of 4 answers", or "No answers yet". */
export function rateDetail(rate: Rate): string {
  return rate.answered === 0 ? 'No answers yet' : `${fmtInt(rate.yes)} of ${countOf(rate.answered, 'answer')}`;
}

/**
 * Named as carry's counts: of the votes that named one card, how many named
 * this one, then "Both" and "Neither" (carriesLabel's words), which the share
 * leaves out.
 */
export function carryDetail(carry: CarryShare): string {
  const named =
    carry.singled === 0
      ? 'No vote named one card'
      : `${fmtInt(carry.named)} of ${countOf(carry.singled, 'vote')} that named one card`;
  return `${named} · Both ${fmtInt(carry.both)} · Neither ${fmtInt(carry.neither)}`;
}

/** "Average difficulty 1.8 / 3 (Easy 2 · Situational 1 · Hard 1)": difficulty runs 1 to 3, not the handoff's 5. */
export function difficultyText(difficulty: DifficultyAnswers): string {
  const {answered, mean, easy, situational, hard} = difficulty;
  if (answered === 0) return 'No difficulty answers yet.';
  return `Average difficulty ${fmtScore(mean)} / 3 (Easy ${fmtInt(easy)} · Situational ${fmtInt(situational)} · Hard ${fmtInt(hard)})`;
}
```

- [ ] **Step 6: Run the helper tests and see them pass**

Run: `pnpm vitest run src/tools/analytics/cards/__tests__/voteCharts.test.ts`

Expected: `Tests  34 passed (34)`.

- [ ] **Step 7: Write the failing tests for the panels**

Create `src/tools/analytics/cards/__tests__/RawVotePanels.test.tsx`. No mock is needed:
- the panels hold no link, so they need no router;
- they call nothing from the bridge that fetches;
- jsdom measures every chart at `CHART_FALLBACK_WIDTH` (640px), so all ten score labels and all seven week labels print.

```tsx
import {describe, expect, it} from 'vitest';
import {act, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ADMIN_COLORS} from '../../../../theme/adminTheme';
import {RawVotePanels, type RawVotePanelsProps} from '../RawVotePanels';
import {
  EMPTY_LOG,
  LOADING,
  NOT_GENERATED,
  NO_RAW_ANALYTICS,
  QUICK_ONLY_CARD,
  RAW_ANALYTICS,
  RAW_CARD,
  RAW_LOG,
  THIN_CARD,
  UNVOTED_CARD,
  loaded,
} from '../cardFixtures';

/** Card 8001 with both files loaded, unless the case says otherwise. */
function renderPanels(props: Partial<RawVotePanelsProps> = {}) {
  return render(<RawVotePanels card={RAW_CARD} analytics={loaded(RAW_ANALYTICS)} voteLog={loaded(RAW_LOG)} {...props} />);
}

/** A table row's cells as text, header cells included. */
const cells = (row: HTMLElement) => [...row.querySelectorAll('th, td')].map((cell) => cell.textContent);

describe('RawVotePanels: states', () => {
  it.each<[string, Partial<RawVotePanelsProps>, string]>([
    // The artifact says there are no raw votes: no need to wait for the log.
    ['no raw votes, said by vote analytics', {analytics: loaded(NO_RAW_ANALYTICS), voteLog: LOADING}, 'need raw votes'],
    ['no raw votes, an empty log', {voteLog: loaded(EMPTY_LOG)}, 'need raw votes'],
    ['the log loading', {voteLog: LOADING}, 'Loading vote log...'],
    ['a card no vote names', {card: UNVOTED_CARD}, 'No raw votes on this card yet.'],
  ])('%s', (_, props, text) => {
    renderPanels(props);
    expect(screen.getByText(text, {exact: false})).toBeInTheDocument();
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
  });

  it('names the secret in the raw-votes notice', () => {
    renderPanels({voteLog: loaded(EMPTY_LOG)});
    expect(screen.getByText('SUPABASE_SERVICE_ROLE_KEY').tagName).toBe('CODE');
  });

  it('says why the log failed, as an alert', () => {
    renderPanels({voteLog: NOT_GENERATED});
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load the vote log. Has the artifact been generated? (HTTP 404)',
    );
  });

  it('puts the histogram beside the answers, and the weekly chart under them at full width', () => {
    renderPanels();
    const row = screen.getByRole('region', {name: 'How voters answered'}).parentElement;
    expect(row).toHaveStyle({display: 'grid'});
    expect(row).toContainElement(screen.getByRole('figure', {name: 'Community scores'}));
    expect(row).not.toContainElement(screen.getByRole('figure', {name: 'Votes per week'}));
  });

  it.each<[string, RawVotePanelsProps['analytics']]>([
    ['still loads', LOADING],
    ['failed', NOT_GENERATED],
  ])('draws every panel while vote analytics %s, and leaves the engine out of the subtitle', (_, analytics) => {
    renderPanels({analytics});
    expect(screen.getByRole('figure', {name: 'Community scores'})).toBeInTheDocument();
    expect(screen.getByText('Average 7.0 from 13 scored votes (plain mean) · most often 7 (4 votes)')).toBeInTheDocument();
  });
});

describe('Community scores', () => {
  it('reads the mean, the peak and the engine in its subtitle, and counts the quick votes under it', () => {
    renderPanels();
    expect(
      screen.getByText(
        'Average 7.0 from 13 scored votes (plain mean) · most often 7 (4 votes) · engine 7.2 on the pairs it scores',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('3 quick votes without a score left out. How voters answered counts their answers.')).toBeInTheDocument();
  });

  it('draws ten columns in the score bands, prints no count over them, and keys the bands', () => {
    renderPanels();
    const figure = screen.getByRole('figure', {name: 'Community scores'});
    const labels = [...figure.querySelectorAll('[data-x-label]')].map((t) => t.textContent);
    expect(labels).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    const mark = (key: string) => figure.querySelector(`[data-key="${key}"] [data-series]`);
    expect(mark('3')).toHaveAttribute('fill', ADMIN_COLORS.over);
    expect(mark('6')).toHaveAttribute('fill', ADMIN_COLORS.barNeutral);
    expect(mark('7')).toHaveAttribute('fill', ADMIN_COLORS.under);
    expect(mark('1')).toBeNull();
    expect(figure.querySelectorAll('[data-cap]')).toHaveLength(0);
    const legend = within(figure).getByRole('list', {name: 'Legend'});
    expect(within(legend).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['≤4', '5–6', '7+']);
  });

  it('reads a column from the keyboard', async () => {
    renderPanels();
    const slider = screen.getByRole('slider', {name: 'Community scores from 1 to 10'});
    act(() => slider.focus());
    await userEvent.keyboard('{Home}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}');
    expect(slider).toHaveAttribute('aria-valuetext', 'Score 7: 4 votes, 31% of 13 scored votes');
  });

  it('tables all ten scores, and no quick vote', async () => {
    renderPanels();
    const figure = screen.getByRole('figure', {name: 'Community scores'});
    await userEvent.click(within(figure).getByRole('button', {name: 'Table'}));
    const table = within(figure).getByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(10);
    expect(cells(rows[6])).toEqual(['7', '4', '31%']);
    expect(rows.reduce((sum, row) => sum + Number(cells(row)[1]), 0)).toBe(13);
  });

  it('names no peak when every score has one vote, and keeps the engine', () => {
    renderPanels({card: THIN_CARD});
    expect(screen.getByText('Average 5.5 from 2 scored votes (plain mean) · engine 7.0 on the pairs it scores')).toBeInTheDocument();
  });

  it('keeps its titled frame with only quick votes, with the reason in place of the chart and no legend', () => {
    renderPanels({card: QUICK_ONLY_CARD});
    const figure = screen.getByRole('figure', {name: 'Community scores'});
    expect(within(figure).getByText('No scored votes on this card yet (2 quick votes without a score).')).toBeInTheDocument();
    expect(screen.queryByRole('slider', {name: 'Community scores from 1 to 10'})).not.toBeInTheDocument();
    expect(within(figure).queryByRole('list', {name: 'Legend'})).not.toBeInTheDocument();
  });
});

describe('How voters answered', () => {
  it('splits the accuracy answers, with each share and count in the legend', () => {
    renderPanels();
    const panel = screen.getByRole('region', {name: 'How voters answered'});
    const split = within(panel).getByRole('list', {name: 'Is the engine’s score right?'});
    expect(within(split).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Too high 20% (2)',
      'Right 60% (6)',
      'Too low 20% (2)',
    ]);
    expect(within(panel).getByText('10 votes answered it.')).toBeInTheDocument();
  });

  it('prints each rate beside an unnamed meter, with its counts, and the difficulty out of 3', () => {
    renderPanels();
    const panel = screen.getByRole('region', {name: 'How voters answered'});
    const rows = within(panel)
      .getAllByRole('listitem')
      .filter((item) => !item.closest('[aria-label="Is the engine’s score right?"]'));
    expect(rows.map((row) => [...row.children].map((child) => child.textContent))).toEqual([
      ['Says it’s real', '', '75%', '3 of 4 answers'],
      ['Would play it', '', '33%', '1 of 3 answers'],
      ['Named as carry', '', '67%', '2 of 3 votes that named one card · Both 9 · Neither 1'],
    ]);
    // The share is printed, so the bar is decoration: a named meter would read it twice.
    expect(within(panel).queryAllByRole('meter')).toHaveLength(0);
    expect(within(panel).getByText('Average difficulty 1.8 / 3 (Easy 2 · Situational 1 · Hard 1)')).toBeInTheDocument();
  });

  it('says where nobody answered', () => {
    renderPanels({card: THIN_CARD});
    const panel = screen.getByRole('region', {name: 'How voters answered'});
    expect(within(panel).getByText('No accuracy answers yet.')).toBeInTheDocument();
    expect(within(panel).queryByText(/answered it\.$/)).not.toBeInTheDocument();
    expect(within(panel).getAllByText('No answers yet')).toHaveLength(2);
    expect(within(panel).getAllByText('—')).toHaveLength(3);
    expect(within(panel).getByText('No vote named one card · Both 0 · Neither 0')).toBeInTheDocument();
    expect(within(panel).getByText('No difficulty answers yet.')).toBeInTheDocument();
  });
});

describe('Votes per week', () => {
  it('runs over the whole log in Monday weeks, names its part week, and tables every week', async () => {
    renderPanels();
    const figure = screen.getByRole('figure', {name: 'Votes per week'});
    expect(
      within(figure).getByText(
        'Whole vote log, Aug 17 – Sep 30, in weeks from Monday, last week partial · votes on this card Aug 17 – Sep 29',
      ),
    ).toBeInTheDocument();
    await userEvent.click(within(figure).getByRole('button', {name: 'Table'}));
    const rows = within(within(figure).getByRole('table')).getAllByRole('row').slice(1);
    expect(rows.map(cells)).toEqual([
      ['Week of Aug 17', '2'],
      ['Week of Aug 24', '0'],
      ['Week of Aug 31', '3'],
      ['Week of Sep 7', '1'],
      ['Week of Sep 14', '5'],
      ['Week of Sep 21', '3'],
      ['Week of Sep 28 (to Sep 30)', '2'],
    ]);
  });

  it('draws the latest week in the accent, prints the latest and the busiest counts, and has no legend', () => {
    renderPanels();
    const figure = screen.getByRole('figure', {name: 'Votes per week'});
    const mark = (key: string) => figure.querySelector(`[data-key="${key}"] [data-series="votes"]`);
    expect(mark('2026-09-28')).toHaveAttribute('fill', ADMIN_COLORS.accent);
    expect(mark('2026-09-14')).toHaveAttribute('fill', ADMIN_COLORS.barNeutral);
    expect([...figure.querySelectorAll('[data-cap]')].map((cap) => cap.getAttribute('data-cap'))).toEqual([
      '2026-09-14',
      '2026-09-28',
    ]);
    expect(within(figure).queryByRole('list', {name: 'Legend'})).not.toBeInTheDocument();
  });

  it('reads the part week from the keyboard', async () => {
    renderPanels();
    const slider = screen.getByRole('slider', {name: 'Votes per week'});
    act(() => slider.focus());
    await userEvent.keyboard('{End}');
    expect(slider).toHaveAttribute('aria-valuetext', 'Week of Sep 28 (to Sep 30): 2 votes');
  });

  it('ends at the log’s newest week for a card whose last vote is older', async () => {
    renderPanels({card: THIN_CARD});
    const figure = screen.getByRole('figure', {name: 'Votes per week'});
    await userEvent.click(within(figure).getByRole('button', {name: 'Table'}));
    const rows = within(within(figure).getByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(7);
    expect(cells(rows[6])).toEqual(['Week of Sep 28 (to Sep 30)', '0']);
  });
});
```

- [ ] **Step 8: Run them and watch them fail**

Run: `pnpm vitest run src/tools/analytics/cards/__tests__/RawVotePanels.test.tsx`

Expected: FAIL, with `Error: Failed to resolve import "../RawVotePanels" from "src/tools/analytics/cards/__tests__/RawVotePanels.test.tsx". Does the file exist?`.

- [ ] **Step 9: Write the three panels and the section**

Create `src/tools/analytics/cards/CommunityScores.tsx`:

```tsx
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {BarChart} from '../../../charts/BarChart';
import {ChartFrame} from '../../../charts/ChartFrame';
import {ChartLegend} from '../../../charts/ChartLegend';
import {fmtInt} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {countOf} from '../activity/activityModel';
import {CAPTION} from './cardStyles';
import type {ScoreHistogram} from './cardVotes';
import {SCORE_SERIES, scoreBars, scoreTable, scoreTooltip, scoresSubtitle} from './voteCharts';

export interface CommunityScoresProps {
  histogram: ScoreHistogram;
  /** The card's engine average on the pairs it scores (engineAverage); null until vote analytics loads. */
  engineAvg: number | null;
  card: Pick<LorcanaCard, 'fullName'>;
}

/**
 * The ten columns. No column prints its count (capLabels "none"): 'extremes'
 * labels the last bar, which suits the end of a time series, and here the
 * last bar is score 10, an arbitrary column. The subtitle names the peak, and
 * the y ticks, the tooltip and the table carry the rest.
 */
function ScoreColumns({histogram}: {histogram: ScoreHistogram}) {
  return (
    <BarChart
      data={scoreBars(histogram)}
      series={SCORE_SERIES}
      ariaLabel="Community scores from 1 to 10"
      valueFormat={fmtInt}
      capLabels="none"
      xLabelEvery={1}
      tooltip={(bar) => scoreTooltip(bar, histogram)}
    />
  );
}

/**
 * The card's raw scores, 1 to 10, from every vote that has one, in admin's
 * score-band colours (Vote activity's). Quick votes have no score: a note
 * under the frame counts them, in both views. A card with only quick votes
 * keeps the titled frame, with the reason in place of the chart and no legend,
 * as R2's gap histogram does. ChartFrame draws no surface, so the untitled
 * Panel is the card.
 */
export function CommunityScores({histogram, engineAvg, card}: CommunityScoresProps) {
  const scored = histogram.scored > 0;
  return (
    <Panel>
      <ChartFrame
        title="Community scores"
        subtitle={scoresSubtitle({histogram, engineAvg})}
        legend={scored ? <ChartLegend series={SCORE_SERIES} mark="rect" /> : undefined}
        table={scoreTable(histogram, card)}>
        {scored ? (
          <ScoreColumns histogram={histogram} />
        ) : (
          <p style={CAPTION}>No scored votes on this card yet ({countOf(histogram.unscored, 'quick vote')} without a score).</p>
        )}
      </ChartFrame>
      {scored && histogram.unscored > 0 && (
        <p style={CAPTION}>
          {countOf(histogram.unscored, 'quick vote')} without a score left out. How voters answered counts their answers.
        </p>
      )}
    </Panel>
  );
}
```

Create `src/tools/analytics/cards/VoterAnswers.tsx`. The labels use the typographic apostrophe (U+2019), as the rest of admin's copy does, so JSX needs no `&apos;`:

```tsx
import {SPACING} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {MeterBar} from '../../../ui/MeterBar';
import {Panel} from '../../../ui/Panel';
import {SplitMeter} from '../../../ui/SplitMeter';
import {countOf} from '../activity/activityModel';
import {CAPTION, NUMBER} from './cardStyles';
import type {AccuracyAnswers, CardAnswers, Rate} from './cardVotes';
import {accuracyParts, carryDetail, difficultyText, rateDetail, shareText} from './voteCharts';

/** The accuracy question: the split meter's visible label and its legend's name. */
const ACCURACY_QUESTION = 'Is the engine’s score right?';

const STACK: React.CSSProperties = {display: 'grid', gap: SPACING.sm, minWidth: 0};
const QUESTION: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};
const BODY: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.body, color: ADMIN_COLORS.text};
const RATES: React.CSSProperties = {listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: SPACING.md};

/**
 * Label, bar and share on one line, the counts under the bar. The bar is
 * decoration (MeterBar with no label), because its share is printed beside it,
 * as Dimension participation's rows are.
 */
const RATE_ROW: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '112px minmax(0, 1fr) 48px',
  alignItems: 'center',
  columnGap: SPACING.md,
  rowGap: SPACING.xxs,
  fontSize: ADMIN_TYPE.body,
};
const SHARE: React.CSSProperties = {...NUMBER, color: ADMIN_COLORS.text};
const DETAIL: React.CSSProperties = {gridColumn: '2 / -1', fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted};

/**
 * The accuracy answers, an ordered scale, as one split meter (R-42): too high,
 * right, too low, with each share and count in its legend (R-43).
 */
function AccuracySplit({accuracy}: {accuracy: AccuracyAnswers}) {
  return (
    <div style={STACK}>
      <p style={QUESTION}>{ACCURACY_QUESTION}</p>
      <SplitMeter parts={accuracyParts(accuracy)} ariaLabel={ACCURACY_QUESTION} emptyText="No accuracy answers yet." />
      {accuracy.answered > 0 && <p style={CAPTION}>{countOf(accuracy.answered, 'vote')} answered it.</p>}
    </div>
  );
}

interface RateRowProps {
  label: string;
  /** The share to fill and print: a 0-1 fraction, or null when nobody answered (an empty track and "—"). */
  rate: Pick<Rate, 'share'>;
  /** The counts behind it (rateDetail, carryDetail). */
  detail: string;
}

/** One single-ratio question: its label, an accent meter and the printed share, then its counts. */
function RateRow({label, rate, detail}: RateRowProps) {
  return (
    <li style={RATE_ROW}>
      <span style={{color: ADMIN_COLORS.muted}}>{label}</span>
      <MeterBar fraction={rate.share ?? 0} color={ADMIN_COLORS.accent} height={8} />
      <span style={SHARE}>{shareText(rate)}</span>
      <span style={DETAIL}>{detail}</span>
    </li>
  );
}

/**
 * How voters answered the in-depth questions on the card's pairs. Each counts
 * only the votes that answered it, quick votes included. The accuracy answers
 * are three parts of one whole, so they are a split meter; "Says it's real",
 * "Would play it" and "Named as carry" are single ratios against their own
 * answers, so each is a meter; difficulty is a mean, so it is text.
 */
export function VoterAnswers({answers}: {answers: CardAnswers}) {
  const {accuracy, isReal, wouldPlay, carry, difficulty} = answers;
  return (
    <Panel title="How voters answered">
      <AccuracySplit accuracy={accuracy} />
      <ul style={RATES}>
        <RateRow label="Says it’s real" rate={isReal} detail={rateDetail(isReal)} />
        <RateRow label="Would play it" rate={wouldPlay} detail={rateDetail(wouldPlay)} />
        <RateRow label="Named as carry" rate={carry} detail={carryDetail(carry)} />
      </ul>
      <p style={BODY}>{difficultyText(difficulty)}</p>
    </Panel>
  );
}
```

Create `src/tools/analytics/cards/VotesPerWeek.tsx`:

```tsx
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {BarChart} from '../../../charts/BarChart';
import {ChartFrame} from '../../../charts/ChartFrame';
import {fmtInt} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {labelEvery} from '../activity/activityChart';
import type {VoteSpan} from '../activity/activityModel';
import type {CardVoteSpan, WeekCount} from './cardVotes';
import {WEEK_SERIES, weekBars, weekSubtitle, weekTable, weekTooltip} from './voteCharts';

export interface VotesPerWeekProps {
  /** votesPerWeek over `log`: every Monday week of the vote log, oldest first. */
  weeks: readonly WeekCount[];
  /** The whole vote log's first and last days: activityWindow(votes, 'all') (R-36). */
  log: VoteSpan;
  /** The card's own votes (cardVoteSpan), for the subtitle. */
  votes: CardVoteSpan;
  card: Pick<LorcanaCard, 'fullName'>;
}

/**
 * The card's votes per Monday week over the whole vote log (R-36), so every
 * card shares one axis and a card nobody has voted on lately ends in quiet
 * weeks. One series: the latest week in the accent (emphasisKey), the rest
 * neutral, and no legend. The latest and the busiest weeks print their counts
 * ('extremes'), and the x labels thin to at most seven (Vote activity's
 * labelEvery). Part weeks are named as Vote activity names them. The untitled
 * Panel is the card.
 */
export function VotesPerWeek({weeks, log, votes, card}: VotesPerWeekProps) {
  return (
    <Panel>
      <ChartFrame title="Votes per week" subtitle={weekSubtitle({log, votes})} table={weekTable(weeks, {card, log})}>
        <BarChart
          data={weekBars(weeks)}
          series={WEEK_SERIES}
          ariaLabel="Votes per week"
          valueFormat={fmtInt}
          capLabels="extremes"
          xLabelEvery={labelEvery(weeks.length)}
          emphasisKey={weeks.at(-1)?.week}
          tooltip={(bar) => weekTooltip(bar, log)}
        />
      </ChartFrame>
    </Panel>
  );
}
```

Create `src/tools/analytics/cards/RawVotePanels.tsx`:

```tsx
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {SPACING} from '../../../app-bridge';
import {Notice} from '../../../ui/Notice';
import {twoUp} from '../../../ui/layout';
import {activityWindow, type VoteSpan} from '../activity/activityModel';
import type {UseVoteAnalyticsReturn} from '../useVoteAnalytics';
import type {UseVoteLogReturn} from '../useVoteLog';
import type {VoteAnalytics} from '../voteAnalyticsTypes';
import {CommunityScores} from './CommunityScores';
import {VoterAnswers} from './VoterAnswers';
import {VotesPerWeek} from './VotesPerWeek';
import {rawVotesFor} from './cardView';
import {cardAnswers, cardVoteSpan, scoreHistogram, votesPerWeek, type CardVote} from './cardVotes';
import {engineAverage} from './voteCharts';

export interface RawVotePanelsProps {
  card: Pick<LorcanaCard, 'id' | 'fullName'>;
  /** Read for hasRawVotes and the card's engine average only: the panels never wait for it. */
  analytics: UseVoteAnalyticsReturn;
  voteLog: UseVoteLogReturn;
}

/** The section's two rows: the histogram beside the answers, then the weekly chart at full width. */
const SECTION: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: SPACING.xl};
// R2's chart track (CalibrationWorkspace's charts row): a 334px plot keeps all ten score labels and ChartTooltip's 304px floor.
const ANSWERS_ROW = twoUp(376);

/** Deploy ran without the service-role key, so there are no raw votes: R3-6a's word for it is rawVotesFor's 'none'. */
function RawVotesNeeded() {
  return (
    <Notice>
      Votes over time, score spread, answers and voters need raw votes. Set the <code>SUPABASE_SERVICE_ROLE_KEY</code>{' '}
      Actions secret, then re-run admin&apos;s Deploy workflow.
    </Notice>
  );
}

/** The vote log isn't in: still loading, or it failed (Vote activity's copy, ActivityView.tsx:134, :136). */
function LogNotice({error}: {error: Error | null}) {
  if (error) {
    return <Notice tone="error">Could not load the vote log. Has the artifact been generated? ({error.message})</Notice>;
  }
  return <Notice>Loading vote log...</Notice>;
}

interface CardPanelsProps {
  card: RawVotePanelsProps['card'];
  /** The card's votes in the log (votesForCard), possibly none. */
  cardVotes: readonly CardVote[];
  /** The whole log's first and last days: activityWindow(votes, 'all') (R-36). */
  logSpan: VoteSpan;
  /** Vote analytics once loaded, for the engine clause; null until then. */
  analytics: VoteAnalytics | null;
}

/** The three panels for a card the log names, or the line that says it names none. */
function CardPanels({card, cardVotes, logSpan, analytics}: CardPanelsProps) {
  const votes = cardVoteSpan(cardVotes);
  if (!votes) return <Notice>No raw votes on this card yet.</Notice>;
  return (
    <div style={SECTION}>
      <div style={ANSWERS_ROW}>
        <CommunityScores histogram={scoreHistogram(cardVotes)} engineAvg={engineAverage(analytics, card)} card={card} />
        <VoterAnswers answers={cardAnswers(cardVotes)} />
      </div>
      <VotesPerWeek weeks={votesPerWeek(cardVotes, logSpan)} log={logSpan} votes={votes} card={card} />
    </div>
  );
}

/**
 * The card page's raw-vote panels (R3-6b): Community scores and How voters
 * answered two-up, then Votes per week at full width. They read the vote log
 * alone, so they never wait for vote analytics, which adds only the histogram
 * subtitle's engine clause once it loads. In their place: the raw-votes
 * notice when there are none (rawVotesFor, the rule R3-6a's KPIs and caption
 * follow), the log's loading and error notices, and "No raw votes on this
 * card yet." for a card no vote names.
 */
export function RawVotePanels({card, analytics, voteLog}: RawVotePanelsProps) {
  const raw = rawVotesFor({analytics: analytics.data, voteLog: voteLog.data, cardId: card.id});
  if (raw.kind === 'none') return <RawVotesNeeded />;
  // 'card' means the log loaded with votes, so the span is there; the check is for the type.
  const logSpan = voteLog.data ? activityWindow(voteLog.data.votes, 'all') : null;
  if (raw.kind === 'waiting' || !logSpan) return <LogNotice error={voteLog.error} />;
  return <CardPanels card={card} cardVotes={raw.cardVotes} logSpan={logSpan} analytics={analytics.data} />;
}
```

- [ ] **Step 10: Run both test files and see them pass**

Run: `pnpm vitest run src/tools/analytics/cards/__tests__/voteCharts.test.ts src/tools/analytics/cards/__tests__/RawVotePanels.test.tsx`

Expected: `Test Files  2 passed (2)` and `Tests  56 passed (56)`.

- [ ] **Step 11: Put the panels in the view**

In R3-6a's `src/tools/analytics/cards/CardAnalyticsView.tsx`, add the import after `import {calibrationData, rawVotesFor, silentNote, type CardCalibrationData, type RawVotes} from './cardView';` and before `import {VotedPairsPanel} from './VotedPairsPanel';`:

```tsx
import {RawVotePanels} from './RawVotePanels';
```

Then render the section as the body's fourth row, directly after the calibration row (Calibration for this card beside Voted pairs) and before anything R3-6c will add. In R3-6a's view that is right after its last line, `{calibration && <CalibrationRow calibration={calibration} raw={raw} isListed={isListed} />}`:

```tsx
      <RawVotePanels card={card} analytics={analytics} voteLog={voteLog} />
```

`card`, `analytics` and `voteLog` are the view's own props (header contract 14), so nothing else changes. The view's body grid gives the section its `SPACING.xxl` gap. Inside, the section spaces its two rows by `SPACING.xl`, the same as the gap between its two panels.

If Step 1's last grep found a raw-section notice in R3-6a's code, delete it now, along with any R3-6a test that pins its copy. The section's notices replace it, and Step 7's tests pin them.

In R3-6a's `__tests__/CardAnalyticsView.test.tsx`, add this `describe` after its last one. It goes through the file's `renderView`, which takes one overrides object, and R3-6a's `LOADING` and `NOT_GENERATED`, which the file already imports. Both cases hold whatever card and log R3-6a's fixtures use:

```tsx
describe('CardAnalyticsView: the raw-vote panels (R3-6b)', () => {
  it('shows the vote log’s state where the raw-vote panels go', () => {
    renderView({voteLog: LOADING});
    expect(screen.getByText('Loading vote log...')).toBeInTheDocument();
  });

  it('says why the vote log failed, in the raw section alone', () => {
    renderView({voteLog: NOT_GENERATED});
    expect(screen.getByText('Could not load the vote log. Has the artifact been generated? (HTTP 404)')).toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('group', {name: 'Mean gap'})).toBeInTheDocument();
  });
});
```

Run: `pnpm vitest run src/tools/analytics/cards`

Expected: every file in the folder passes. R3-6a's view test gains these two cases, and its own cases are unchanged: its 33 cases and these 2 pass together, 35 of 35. Its Maui card has votes in its log, so the view now draws the three panels under its calibration row too.

- [ ] **Step 12: Write the stories**

Create `src/tools/analytics/cards/RawVotePanels.stories.tsx`:

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {FONTS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {RawVotePanels, type RawVotePanelsProps} from './RawVotePanels';
import {
  EMPTY_LOG,
  LOADING,
  NOT_GENERATED,
  NO_RAW_ANALYTICS,
  QUICK_ONLY_CARD,
  RAW_ANALYTICS,
  RAW_CARD,
  RAW_LOG,
  THIN_CARD,
  UNVOTED_CARD,
  loaded,
} from './cardFixtures';

/** Card 8001 with both files loaded: every story changes one thing from here. */
const BASE: RawVotePanelsProps = {
  card: RAW_CARD,
  analytics: loaded(RAW_ANALYTICS),
  voteLog: loaded(RAW_LOG),
};

const meta: Meta<typeof RawVotePanels> = {
  title: 'Admin/Insights/Card analytics/Raw-vote panels',
  component: RawVotePanels,
  args: BASE,
  // The card page's body column at a 1440px window (1440 − the 240px sidebar −
  // two 32px gutters), on the admin page colour, so the answers row sits two-up.
  // .storybook/preview.tsx mounts AdminStyles.
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
        <div style={{maxWidth: 1136}}>
          <Story />
        </div>
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

/** Card 8001: a clear peak at 7, quick votes counted under the chart, answers to every question, and a part last week. */
export const Default: Story = {};

/** The same card before vote analytics loads: every panel draws, and the subtitle has no engine clause yet. */
export const BeforeVoteAnalytics: Story = {args: {analytics: LOADING}};

/** Two scored votes a point apart: no peak to name, nothing answered, and quiet weeks since Sep 9. */
export const ThinCard: Story = {args: {card: THIN_CARD}};

/** Only quick votes: the histogram keeps its frame and says why it is empty. */
export const QuickVotesOnly: Story = {args: {card: QUICK_ONLY_CARD}};

/** A card in the card list that no vote names. */
export const NotOnThisCard: Story = {args: {card: UNVOTED_CARD}};

/** An artifact built without SUPABASE_SERVICE_ROLE_KEY: the raw-votes notice. */
export const NoRawVotes: Story = {args: {analytics: loaded(NO_RAW_ANALYTICS), voteLog: loaded(EMPTY_LOG)}};

export const LogLoading: Story = {args: {voteLog: LOADING}};

/** The vote log's 404, as local dev sees it before the owner saves the deployment's files. */
export const LogFailed: Story = {args: {voteLog: NOT_GENERATED}};
```

- [ ] **Step 13: Lint, typecheck and the full suite**

Run: `pnpm lint`, then `pnpm typecheck`, then `pnpm test:run`.

Expected: all three pass. `typecheck` covers the stories and the tests (`tsconfig.app.json` includes `src`).

Under load, a long jsdom test can pass its 5s timeout. In the sandbox, `ActivityView`'s 30-day test once took 7.1s in a full run and passed alone. If a test outside this task times out, stop this session's preview servers, wait for other sessions' runs, and run it alone before suspecting the change.

- [ ] **Step 14: Look at it in Storybook (when a browser is available)**

1. Start Storybook with the preview tool's `admin-storybook` configuration (`.claude/launch.json`), not `pnpm storybook` in a shell.
2. Open `http://localhost:6007/iframe.html?id=admin-insights-card-analytics-raw-vote-panels--default&viewMode=story`. Check:
   - Community scores and How voters answered sit side by side, and Votes per week runs full width under them.
   - The histogram's columns are in the three band colours. None prints a count, and all ten labels show. The tooltip reads "Score 7 · 4 votes · 31% of 13 scored votes", from the pointer and from the keyboard.
   - The accuracy bar's three parts and the rate meters sit inside the panel at 376px, with nothing clipped.
   - The last week's bar is gold. The busiest (Sep 14) and the last week print their counts, and the last tooltip reads "Week of Sep 28 (to Sep 30)".
3. Open `--thin-card`, `--quick-votes-only` and `--no-raw-votes`, and check that each reads as its doc comment says.
4. Open R3-6a's `admin-insights-card-analytics-view--default`, and check that the raw section sits between the calibration row and the end of the page. Its `admin-insights-card-analytics-view--no-raw-votes` story shows the raw-votes notice once, where the panels go.
5. Stop Storybook with the preview tool (`mcp__Claude_Browser__preview_list`, then `mcp__Claude_Browser__preview_stop`). A running preview server makes the pre-commit hook's Vitest fail to start its workers.

If no browser is available, record this check as pending with the owner, and say so in the report. R3-9's real-data check looks at the weekly bars' density over the whole span (R-36).

- [ ] **Step 15: Check Code Health (when the CodeScene MCP is available)**

Run `mcp__codescene__code_health_review` on the five new source files, `CardAnalyticsView.tsx`, both new test files and `cardFixtures.ts`.

Expected:
- 10.0 with no findings for each.
- By hand, count `voteCharts.ts`'s parameters typed `string`, `number` or `boolean`: there are none in its 23.

The local tool is laxer than the PR gate, so a 10.0 here isn't proof. R3-9 runs `analyze_change_set` before the push.

- [ ] **Step 16: Commit**

Use the Bash tool, never PowerShell, and only after the owner approves. Run the two commands as two separate Bash calls, and don't pipe either one. Stage only these paths, and never `public/admin-data/`.

```bash
git add src/tools/analytics/cards/voteCharts.ts src/tools/analytics/cards/CommunityScores.tsx src/tools/analytics/cards/VoterAnswers.tsx src/tools/analytics/cards/VotesPerWeek.tsx src/tools/analytics/cards/RawVotePanels.tsx src/tools/analytics/cards/RawVotePanels.stories.tsx src/tools/analytics/cards/cardFixtures.ts src/tools/analytics/cards/CardAnalyticsView.tsx src/tools/analytics/cards/__tests__/voteCharts.test.ts src/tools/analytics/cards/__tests__/RawVotePanels.test.tsx src/tools/analytics/cards/__tests__/CardAnalyticsView.test.tsx
```

```bash
USER_APPROVED=1 git commit -m "feat(cards): add the raw-vote panels (#24)"
```

Husky's pre-commit runs lint and the tests. If Vitest fails to start its workers under load, stop this session's preview servers, wait for other sessions' runs to finish, and retry.

<!--
Review notes not applied as written (2026-10-06):
- Note 3, R3-9's :672 and :709. The current R3-09-docs-check.md already makes both changes: its pitch check reads full width, about 1,094px and 35px a bar (R3-09-docs-check.md:751), and its empty accuracy check reads "No accuracy answers yet." (R3-09-docs-check.md:794). Only the report template's "two-up at 1440px" (R3-09-docs-check.md:1495, the note's :1390) remains, so "When the plan is assembled" names that line alone and cites the other two as already matching. emptyText stays, since R3-9 now expects it.
- Note 4, the minimal fix (moving the last vote to 03:20). Not taken: the preferred fix (VIEW_LOG.generatedAt and VIEW_ANALYTICS) was applied and verified instead.
- Note 1, "the drafter's summary point 4". That summary was the drafter's reply, not part of this file, so there is nothing here to change.
-->
