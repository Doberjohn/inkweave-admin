> Part of [R: Admin redesign](../R-redesign.md). Read its decisions, corrections to the spec, global constraints and shared interfaces first.

**Contract additions.** R3 needs the items below. R1-8 creates `verdict.ts` and `MIN_RULE_VOTES`, and R3 only imports them. `GapScale` is private to R1-8's Overview card, so R3 moves it to `src/ui/` (Task R3-5b). None of these items renames anything in the contract.

- **The verdict and the "low n" threshold (R1-8).** `src/tools/analytics/verdict.ts` takes the band and verdict code out of `VerdictHero.tsx`, and `VerdictHero` and the Overview's `CalibrationCard` import it. The threshold is `MIN_RULE_VOTES`, which `src/tools/analytics/overview/overviewStats.ts` exports. R3-2 imports it from `'../overview/overviewStats'`, and R3 uses it wherever a card or rule needs 10 score votes. R2-1 declares its own `LOW_N = 10` in `calibrationModel.ts`, so all three pages draw the line at 10.
    ```ts
    // src/tools/analytics/verdict.ts (R1-8): R3 imports verdictFor
    export const CALIBRATION_BAND = 0.5;
    export interface Verdict {word: string; wordColor: string; numberColor: string}
    export function verdictFor(meanGap: number | null): Verdict;
    // src/tools/analytics/overview/overviewStats.ts (R1-8)
    export const MIN_RULE_VOTES = 10;
    ```
- **`src/ui/GapScale.tsx` (R3-5b)** is the over/under track. R1-8 keeps `GapScale` private in `src/tools/analytics/overview/CalibrationCard.tsx`, with its `TRACK` and `SCALE_LABEL` consts. Task R3-5b moves all three into `src/ui/GapScale.tsx` unchanged and exports `GapScale`. `CalibrationCard` then imports it from there. Its dot sits at `scalePercent(meanGap)` (`verdict.ts`, clamped to ±1.5), and a `null` gap draws no dot. R2 deletes `VerdictHero.tsx`, with its own copy, and `RuleCalibrationTable.tsx`. From then on the Overview card and the per-card verdict share one track and one band.
    ```ts
    export interface GapScaleProps {meanGap: number | null; color: string}   // R1-8's prop names
    export function GapScale(props: GapScaleProps);   // no return annotation, as every admin component
    ```
- `NAV_ITEMS` gains `{id: 'cards', label: 'Card analytics', mark: 'Cd', path: '/cards', group: 'insights', writes: false}` as the last Insights item.
  - `navItemFor` matches `/` exactly. It matches every other item when ``pathname === path || pathname.startsWith(`${path}/`)``.
  - So `/cards/2983` marks Card analytics as current, and Overview never matches it.
  - The Sidebar's `NavLink` sets `end` only on `/`.
- **Return types.** The signatures here and in the R3 tasks have no return annotation.
  - `@types/react` 19.3 has no global `JSX` namespace. It exists only as `React.JSX` (`node_modules/@types/react/index.d.ts:4226`).
  - No admin file annotates a component's return type.
  - The contract's own `JSX.Element` lines need the same reading.
- **Chart kit additions (R-12, R-13).** R3 adds four files to `src/charts/`, in Tasks R3-4b and R3-4c. They build on R1-3b's `ChartTooltip`, `linear` and `SeriesDef` and rename nothing there.
    ```ts
    // src/charts/networkLayout.ts — pure geometry for the network diagram (R3-4b)
    export interface Point {x: number; y: number}
    export interface Box {x: number; y: number; width: number; height: number}
    export interface RingSlot extends Point {angle: number; radius: number}   // angle: radians clockwise from 3 o'clock
    export interface LabelPlacement extends Box {anchor: 'start' | 'middle' | 'end'; textX: number; textY: number}
    export const ONE_RING_MAX = 6;          // up to 6 nodes share one ring; past it the weaker half moves out
    export const INNER_RING_SHARE = 0.55;   // inner radius / outer radius
    export const RING_MARGIN = 40;          // room between the outer ring and the plot edge
    export function ringSizes(count: number): [number, number];                                       // [inner, outer]
    export function ringRadii(width: number, height: number): [number, number];                        // [inner, outer]
    export function ringSlots(count: number, center: Point, radii: readonly [number, number]): RingSlot[]; // strongest at 12 o'clock, clockwise
    export function labelFor(slot: Point & {angle: number}, width: number, height: number, gap: number): LabelPlacement;
    export function overlaps(a: Box, b: Box): boolean;   // shared area only; touching edges, or a float slack under 1e-6, don't count
    export function contains(outer: Box, inner: Box): boolean;
    export function boxAround(p: Point, size: number): Box;
    export function placeLabels(labels: readonly LabelPlacement[], blocked: readonly Box[], bounds: Box): Array<LabelPlacement | null>;

    // src/charts/NetworkDiagram.tsx — a radial ego network (R3-4b)
    export const NETWORK_MAX_NODES = 12;
    export interface NetworkNode {
      id: string; label: string; href: string; value: number; seriesId: string;
      ariaLabel: string; tooltip: TooltipContent;
    }
    export interface NetworkDiagramProps {
      center: {label: string}; nodes: readonly NetworkNode[]; series: readonly SeriesDef[]; ariaLabel: string;
      valueDomain?: readonly [number, number];   // default [0, 10]: the spoke widths, 1 to 4px
      height?: number;                            // default 340, labels included
      onShowAll?: () => void;                     // "and K more in the table" calls it
    }
    export function NetworkDiagram(props: NetworkDiagramProps);

    // src/charts/shares.ts and src/charts/SplitBar.tsx — one stacked bar, filling the track or centred on a neutral part (R3-4c)
    export function sharesOf(values: readonly number[]): number[];   // whole percentages that add up to 100
    export interface SplitPart {id: string; value: number}
    export interface SplitBarProps {
      parts: readonly SplitPart[]; series: readonly SeriesDef[]; ariaLabel: string; unit?: string; height?: number;
      centerId?: string;   // an ordered scale's neutral part: its middle sits on a tick at 50%, and the bar diverges from it
    }
    export function SplitBar(props: SplitBarProps);
    ```
- **`ChartFrame` gains a controlled view.** "and K more in the table" has to open the network's table view, and the frame's toggle is internal.
    ```ts
    // src/charts/ChartFrame.tsx: both props optional. Without `view` the frame keeps its own state, as R1-3b builds it.
    export type ChartView = 'chart' | 'table';
    view?: ChartView; onViewChange?: (view: ChartView) => void;
    ```
  - **Owner.** R1-3b ships it (Steps 13 and 15); R3 uses it as is.
  - When `view` switches from `'chart'` to `'table'` and focus has fallen to `<body>`, the frame focuses its `<table>`, which takes `tabIndex={-1}`. Focus falls to `<body>` because the control that asked for the table unmounted with the chart. The frame's own toggle keeps focus as it does today, and a frame that mounts on the table takes no focus.
- **What R3 relies on in R1-3b, and its tests should hold:**
  - `BarChart` draws nothing for a 0 value in a stack and rounds the topmost non-zero segment. The histogram puts each score's count in its band's series, so every column is one segment.
  - `ChartTooltip` prints its title and each row's label as separate text. The R3 tests find a tooltip by that text.
  - `ChartFrame` unmounts its children in table view. The focus hand-off above depends on it.
  - `ChartTooltip` has `pointer-events: none`. Without it, a tooltip that renders under the pointer fires `pointerleave` on the node link and flickers.
  - `ChartTooltip` renders when `bounds` is 0×0. In jsdom, `SplitBar` passes `offsetWidth`, which is 0, so the "of 50 votes" test needs it.
- **R3-local changes, against this outline's first draft:**
  - `EngineSummary` loses `top`, and `engineSummary` loses its `top` parameter. The network diagram shows the strongest 12, so there is no top-5 list.
  - `EnginePartner` gains `rules`.
  - `CardAnalyticsViewProps` gains `partnerLabel`.
  - `weekStartUtc` goes: the kit's `weekStart` already does it.
  - `votesPerWeek` takes `endDay`, the vote log's newest day (R3-3).
  - `networkSubtitle` takes `capped`, and `cardCharts.ts` gains `modeText` (R3-6).

## Phase R3: Card analytics (outline)

**Sources and definitions.** These follow the plan's corrections. No pipeline changes.

| What the page shows | Source | Definition |
|---|---|---|
| Score votes, Pairs voted, Mean gap, Engine → community, Accuracy sentiment, rules table, Voted pairs | `vote-analytics.json` `pairs[]` | Only pairs with at least one score vote **and** an engine score (`scripts/lib/voteAnalytics.mjs:62-72`, `:217-223`). Every average is weighted by `scoreVotes`, as the global KPIs are. The community score is the database's trimmed mean (`internal.trimmed_mean`). Accuracy sentiment averages each pair's `accuracySentiment` (the view's `avg(accuracy)`, `voteAnalytics.mjs:40`), weighted by `scoreVotes` over the pairs that have one. That is the Overview's own formula (`voteAnalytics.mjs:163-167`), so the two numbers compare. It needs no raw votes. |
| Engine-silent pairs | `vote-log.json` and `pairs[]` | The card's pairs that have a scored vote but no `pairs[]` row. Both files come from the same Deploy run. Without raw votes the count can't be computed, so the Voted pairs panel says so in a caption. |
| Score histogram, answers, votes per week, voters | `vote-log.json` | Every raw vote that includes the card, using plain means. Unscored (quick) votes stay out of the histogram and every average; a caption counts them. |
| Engine view, network diagram | `/data/synergies/<id>.json` via the bridged `fetchCardSynergies` | Partners are `Object.keys(pairs)`. Each partner's tier is `getStrengthTier(pairs[id].aggregateScore)`. The rules that connect a pair are its `pairs[id].connections[].ruleName` (`PairSynergyConnection`, engine `types/synergy.ts:49-66`), so the tooltip and the table name them with no extra fetch. |

Two checks must hold. The tests assert both:
- **Calibration.** On fixtures whose `gap` equals `communityScore - engineScore`, the tests assert `expect(cal.communityAvg! - cal.engineAvg!).toBeCloseTo(cal.meanGap!, 10)`. Exact equality fails through float rounding (`6.1 - 5.3 === 0.7999999999999998`). On real data each `gap` is `round2(c − e)`, with `c` already rounded (`voteAnalytics.mjs:27, 30`), so there the identity holds only to ±0.005.
- **Histogram.** `histogram.scored === cal.scoreVotes + engineSilent.votes`. This one is exact, because every term is an integer count.

**Vote field values**
- **`whoCarries`** is one of `'a' | 'b' | 'both' | 'neither'`. `'a'` always means the row's `a` card:
  - The current `submit_vote` stores the lower id as `a` and swaps `who_carries` to match (`20260622000000_relax_vote_rate_limit.sql:20-26`).
  - The votes table enforces `card_a_id < card_b_id` (`20260330000001_votes_table.sql:16`).
  - `buildVoteLog` re-sorts pairs with JS `<` (`voteAnalytics.mjs:200`). For numeric-string ids that order matches the database's, so it never swaps a pair.
- **"Named as carry"** counts the votes that name this card, out of the votes that named a single card (`'a'` or `'b'`). `'both'` (the one-click default) and `'neither'` stay out of the share. Their counts are shown next to it.
- **Difficulty** runs 1–3 (Easy / Situational / Hard, from `InDepthVoteForm.tsx:88-92`) and is shown as "x.x / 3".
- **Accuracy:**
  - −1 means "too high" (the voter picked "Should be lower"), 0 means "right", and +1 means "too low".
  - The answers panel shows that split from raw votes.
  - The sentiment KPI comes from `pairs[]` (see the table above).

**Minimum-vote guard.** The verdict uses `verdictFor(cal.enoughVotes ? cal.meanGap : null)`.
- A card under `MIN_RULE_VOTES` (10) score votes reads "Not enough score votes to judge this card". Its Mean gap KPI shows the number uncoloured, with a "low n" hint.
- In the rules table, rows under `MIN_RULE_VOTES` votes get the "low n" chip and sort after the others.

**URL contract**
- The route is `cards/:cardId?`.
- Bare `/cards` redirects (`<Navigate replace>`) to the last card viewed.
  - That id is stored in `localStorage['inkweave.admin.last-card']`, and every access is wrapped in try/catch.
  - With nothing stored, `/cards` shows a "Pick a card" state.
- The page saves a card as last viewed once its id resolves to a card.
- An unknown id shows a not-found message. A card that has rotated out of Core (`loader.ts:206`) is one example.
- The page clears an unknown id from storage only when `!isLoading && error == null && getCardById(id) === undefined`. A slow or failed card list never clears a good id.
- R4 links here through `cardAnalyticsPath(id)`.
  - It passes "Edit in Card studio" as `CardAnalyticsView`'s `headerActions` (the card header).
  - It does not use PageLayout's `actions`, which holds the switcher.
  - R3 ships without that button, because `/studio` doesn't exist yet.

**States.** Each section has its own states. The header and the engine view never wait for the vote files. The prototype hid them whenever vote analytics failed, and locally both files are always missing.

| Section | Loading | Failed | Empty |
|---|---|---|---|
| Header (card list) | "Loading cards…" | "Could not load the card list (…)" + Retry (`retryLoad`) | No id: "Pick a card" prompt. Unknown id: "No card has the id N. It may have rotated out of Core." |
| KPIs, calibration, voted pairs | "Loading vote analytics..." | "Could not load vote analytics. Has the artifact been generated? (…)" (today's copy, `AnalyticsPage.tsx:74`) | Card in no `pairs[]` row: "No score votes on pairs the engine scores yet." |
| Raw panels and raw KPIs (vote log; Engine-silent also needs vote analytics) | "Loading vote log..." | "Could not load the vote log (…)" | Empty log (written when there's no service-role key): the raw-votes notice. Card absent from the log: "No raw votes on this card yet." |
| Engine view | "Loading engine data..." | "Could not load this card’s synergies (…)" | Empty `pairs`: "The engine finds no synergies for this card (or its synergy file could not be read). A card revealed after the app’s last deploy has no synergy file yet." |

- Three things render only when vote analytics has loaded:
  - the Engine-silent KPI
  - the "engine X on the pairs it scores" clause of the histogram caption
  - the Voted pairs caption

  Without vote analytics, every scored pair would count as engine-silent.
- Until vote analytics has loaded, the page omits PageLayout `meta` and the second clause of the engine caption.

**The task loop.** Every task follows the same loop:
1. Write the failing test.
2. Run `pnpm vitest run <test file>`. Run `pnpm build:engine` once before the first run, because these tests reach the bridge.
3. Implement.
4. Run the test again.
5. Run `pnpm lint` and `pnpm typecheck`.
6. Finish with the standard commit step: the Bash tool, owner approval, `USER_APPROVED=1 git commit -m "feat(cards): … (#24)"`.

**Test isolation.** `src/test/setup.ts` resets the artifact cache before every test (R1-5); nothing else resets state. `vite.config.ts` sets neither `restoreMocks` nor `unstubGlobals`.
- **cardRoutes and page tests:** `beforeEach(() => localStorage.clear())`.
- **The "storage throws" case:**
  - Use `vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); })`.
  - Write one spy each for `setItem` and `removeItem`. A loop over the method names gives a union `MockInstance` that doesn't typecheck.
  - Add `afterEach(() => vi.restoreAllMocks())`.
- **Fetch stubs (bridgeContract and page tests):** `afterEach(() => vi.unstubAllGlobals())`, as `useVoteAnalytics.test.ts:5` does.
- **The synergy cache:**
  - `fetchCardSynergies` caches per id at module level (`usePrecomputedSynergies.ts:42`) and never resets.
  - Hook, switcher and page tests mock it, along with the card list, through the bridge, in the repo's `vi.hoisted` idiom (`useImageAdmin.test.ts:16`). The block below passes `eslint --stdin`.
  - Each test sets `useCardDataContext.mockReturnValue({cards, isLoading, error, getCardById, retryLoad: vi.fn()})`. That also makes "Retry calls `retryLoad`" testable.
  ```ts
  const fetchCardSynergies = vi.hoisted(() => vi.fn());
  const useCardDataContext = vi.hoisted(() => vi.fn());
  vi.mock('../../../../app-bridge', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../app-bridge')>()),
    fetchCardSynergies,
    useCardDataContext,
  }));

  beforeEach(() => {
    localStorage.clear();
    fetchCardSynergies.mockResolvedValue({groups: [], pairs: {}});
  });
  afterEach(() => vi.unstubAllGlobals());
  ```
- **Text measurement:** jsdom has no `getComputedTextLength`, so the network diagram measures every name as 0 and prints them all. The one test that checks the collision fallback defines it on `SVGElement.prototype` and deletes it in `afterEach` (R3-4b, Step 5).

### Task R3-1: Bridge additions and vote value types

**Files:**
- Modify `src/app-bridge.ts`. R1-1 has already deleted line 52 (`usePrecomputedSynergies`), whose only consumer is `BannerPage.tsx:23`.
  - **Constants export (lines 15–40).** Add `TIER_COLORS` after `SURFACE_CARD` and `Z_INDEX` after `TRUNCATE`. The app defines them at `theme.ts:363-368` and `:261-271`.
  - **The `useContainerWidth` re-export line** (line 45 before R1-10's insertions) becomes:
    ```ts
    export {useAutocomplete, useContainerWidth, type UseAutocompleteReturn} from '../upstream/inkweave/apps/web/src/shared/hooks';
    ```
  - **After the `smallImageUrl` line**, add:
    ```ts
    export {fetchCardSynergies, type PrecomputedPairData} from '../upstream/inkweave/apps/web/src/features/synergies/hooks/usePrecomputedSynergies';
    export {getStrengthTier, type StrengthTier, type StrengthTierLabel} from '../upstream/inkweave/apps/web/src/features/synergies/utils/scoreUtils';
    ```
  - `InkIcon` and `RaritySymbol` come from R1.
  - The whole edited file passes `eslint --stdin --stdin-filename src/app-bridge.ts`.
- Modify `src/tools/analytics/voteLogTypes.ts:7,10,11`:
  - `accuracy: -1 | 0 | 1 | null`
  - `difficulty: 1 | 2 | 3 | null`
  - `whoCarries: 'a' | 'b' | 'both' | 'neither' | null`
  - Add a comment citing the check constraints at `20260330000001_votes_table.sql:7-12`.
- Modify `src/tools/analytics/voteAnalyticsTypes.ts:38-48`. This is a type-only change; the precompute already writes the field.
  - Add `accuracySentiment: number | null;` to `PairStat` after `scoreVotes`.
  - Its comment: "the pair's mean accuracy (−1/0/+1) over every vote that answered it (`voteAnalytics.mjs:40`)".
- Test: `src/tools/analytics/cards/__tests__/bridgeContract.test.ts`.

**Interfaces:**
- **Produces:** the bridge names above, plus `PairStat.accuracySentiment`.
- **Consumes `getStrengthTier`** (`scoreUtils.ts:18-23`): ≥9.5 Perfect, ≥7 Strong, ≥4 Moderate, otherwise Weak.
- **Consumes `fetchCardSynergies`** (`usePrecomputedSynergies.ts:44-67`):
  - It caches per id for the whole session.
  - Any non-OK or non-JSON response, 5xx included, becomes a cached empty result.
  - It rejects on a network failure or on malformed JSON (`:64`).

**Tests:**
- **Tiers.** Labels at 9.5, 9.49, 7, 6.99, 4 and 3.99, and `.color` equals the matching `TIER_COLORS` entry.
- **`fetchCardSynergies`**, with the fetch stubbed:
  - It returns `{groups: [], pairs: {}}` for a 404, for a 500 and for an HTML 200.
  - A second call for the 500 id doesn't fetch again.
  - It passes JSON through.
  - It rejects on `application/json` with the body `{`.
  - Each case uses its own id, because of the module cache.

**Checks:**
- **Old fixtures.** `grep -rnE "whoCarries: '[AB]'" src` prints nothing.
- **Typecheck.** `pnpm typecheck` passes. An untyped fixture whose `accuracy` or `difficulty` widens to `number` fails here.
- **`PairStat` fixtures.** Typecheck also names every `PairStat` fixture that lacks `accuracySentiment`. `grep -rln "communityScore:" src` lists the candidates. Add `accuracySentiment: null` to each.

### Task R3-2: cardStats, calibration side

**Files:**
- Create `src/tools/analytics/cards/cardStats.ts`.
- Test: `src/tools/analytics/cards/__tests__/cardStats.test.ts`, with shared fixtures in `__tests__/fixtures.ts`. Every `gap` there equals `communityScore - engineScore`.

**Interfaces:**
```ts
export interface CardPair {
  partnerId: string; partnerName: string; engineScore: number; communityScore: number;
  gap: number; scoreVotes: number; accuracySentiment: number | null; rules: string[];
}
export function pairsForCard(pairs: PairStat[], cardId: string): CardPair[];          // |gap| desc, then scoreVotes desc, then partnerName
export interface CardCalibration {
  pairsVoted: number; scoreVotes: number; meanGap: number | null; engineAvg: number | null;
  communityAvg: number | null; accuracySentiment: number | null; enoughVotes: boolean;
}
export function cardCalibration(cardPairs: CardPair[], minVotes?: number): CardCalibration;   // vote-weighted; minVotes = MIN_RULE_VOTES
export interface CardRuleRow {ruleId: string; ruleName: string; pairs: number; scoreVotes: number; meanGap: number; lowN: boolean}
export function rulesForCard(cardPairs: CardPair[], rules: RuleStat[], minVotes?: number): CardRuleRow[];
export function cardReadLine(cal: CardCalibration, minVotes?: number): string;
```

`cardStats.ts` imports `MIN_RULE_VOTES` from `'../overview/overviewStats'` (R1-8) as the default `minVotes` of `cardCalibration`, `rulesForCard` and `cardReadLine`. `cardReadLine` uses the copy from `dc.html:946`, and the ±0.25 band comes from `biasCopy`. The tests assert these strings exactly. The function below, with its two imports, passes `eslint --stdin`:
- 0 votes: `No score votes on pairs the engine scores yet.`
- Under `minVotes`: `` `Only ${n} score vote${n === 1 ? '' : 's'} on pairs the engine scores. The verdict needs ${minVotes}.` ``
- Gap ≤ −0.25: `` `The engine rates this card's pairs about ${m} points higher than the community.` ``
- Gap ≥ +0.25: `` `The engine rates this card's pairs about ${m} points lower than the community.` ``
- Otherwise: `Its pairs score close to what the community says.`
```ts
import {biasCopy} from '../biasCopy';
import {MIN_RULE_VOTES} from '../overview/overviewStats';

/** The plain-English line under the per-card verdict. The ±0.25 lean band is biasCopy's. */
export function cardReadLine(cal: CardCalibration, minVotes = MIN_RULE_VOTES): string {
  const n = cal.scoreVotes;
  if (n === 0 || cal.meanGap == null) return 'No score votes on pairs the engine scores yet.';
  if (n < minVotes) {
    return `Only ${n} score vote${n === 1 ? '' : 's'} on pairs the engine scores. The verdict needs ${minVotes}.`;
  }
  const {direction} = biasCopy(cal.meanGap);
  if (direction === 'neutral') return 'Its pairs score close to what the community says.';
  const m = Math.abs(cal.meanGap).toFixed(2);
  return `The engine rates this card's pairs about ${m} points ${direction === 'over' ? 'higher' : 'lower'} than the community.`;
}
```

**Tests:**
- `pairsForCard`:
  - Matches the card on either side and takes the partner from the other side.
  - Copies `accuracySentiment`.
  - Leaves out other cards' pairs.
  - Keeps the sort order above.
- `cardCalibration`:
  - Gaps of −1 (3 votes) and +1 (1 vote) give −0.5.
  - The calibration check passes with `toBeCloseTo(…, 10)`.
  - Sentiments of −1 (3 votes), +1 (1 vote) and `null` (5 votes) give −0.5. Pairs without a sentiment add no weight.
  - An empty list gives `null` for every average.
  - `enoughVotes` is false at 9 votes and true at 10.
- `rulesForCard`:
  - A pair counts toward every rule in its `rules`.
  - Names come from `RuleStat`, falling back to the id.
  - "Low n" rows come last, and each group sorts by |gap|.
- `cardReadLine`:
  - 0 votes gives the "No score votes" line.
  - 1 vote: "Only 1 score vote on pairs the engine scores. The verdict needs 10."
  - 4 votes: "Only 4 score votes on pairs the engine scores. The verdict needs 10."
  - −0.3 reads "about 0.30 points higher" and +0.83 reads "about 0.83 points lower".
  - −0.24 and +0.24 read "close".

### Task R3-3: cardStats, raw-vote side

**Files:**
- Extend `cardStats.ts`, its test and `__tests__/fixtures.ts`. The fixtures cover a null score, `'both'`, an engine-silent pair and a pair voted only by quick votes.

**Interfaces:**
```ts
export function votesForCard(votes: VoteLogRow[], cardId: string): VoteLogRow[];
export interface EngineSilent {pairs: number; votes: number}
export function engineSilentForCard(cardVotes: VoteLogRow[], cardPairs: CardPair[], cardId: string): EngineSilent;
export interface ScoreHistogram {counts: number[]; scored: number; unscored: number; mean: number | null}   // counts[i] = votes scoring i + 1
export function scoreHistogram(cardVotes: VoteLogRow[]): ScoreHistogram;
export interface Rate {yes: number; answered: number; share: number | null}
export interface CarryShare {named: number; singled: number; share: number | null; both: number; neither: number}
export interface CardAnswers {
  accuracy: {tooHigh: number; right: number; tooLow: number; answered: number};
  isReal: Rate; wouldPlay: Rate; carry: CarryShare;
  difficulty: {easy: number; situational: number; hard: number; answered: number; mean: number | null};
}
export function cardAnswers(cardVotes: VoteLogRow[], cardId: string): CardAnswers;
export interface WeekCount {week: string; votes: number}   // week: the UTC Monday, 'YYYY-MM-DD'
export function votesPerWeek(cardVotes: VoteLogRow[], weeks: number, endDay: string): WeekCount[];  // last `weeks` Mondays ending at weekStart(endDay), zero weeks kept
export interface VoteSpan {votes: number; voters: number; first: string; last: string}   // first/last: UTC days, ts.slice(0, 10)
export function voteSpan(cardVotes: VoteLogRow[]): VoteSpan | null;
```

`CardAnswers.accuracy` has no sentiment field. The sentiment KPI comes from `pairs[]` (`cardCalibration`), so the page shows one sentiment number, not two.

`votesPerWeek` builds on the chart kit and R1-9 rather than its own week helper:
- `endDay` is the newest UTC day (`ts.slice(0, 10)`) across the whole `voteLog.votes`, not the card's own newest vote. The view passes `latestVoteDay(voteLog.votes)` (`activityStats.ts:40`), the day R1-9's windows end on, as the Overview's weeks end at the log's newest week. A card nobody has voted on lately then ends in quiet weeks, so the gold latest week never overstates how recent its votes are.
- `start` is the Monday `7 × (weeks − 1)` days before the kit's `weekStart(endDay)`.
- The result is `weeklyStacks(votesInRange(cardVotes, start, endDay), start, endDay)`, mapped to `{week: s.day, votes: s.total}`.
- `weeklyStacks` keeps quiet weeks, and its `total` counts quick votes too.
- `weekStart` (R1-3b) is the same UTC Monday as `isoWeekStart` (`voteAnalytics.mjs:119-125`), and R1-3b tests the Sunday case.

**Tests:**
- `engineSilentForCard`:
  - A scored vote on a pair missing from `pairs[]` counts.
  - A pair with only unscored votes doesn't count, and neither does a pair that is in `pairs[]`.
  - The histogram check holds on one shared fixture.
- `scoreHistogram`:
  - It has 10 buckets.
  - A `null` score adds to `unscored` only.
  - The mean is a plain mean, and `null` when there are no scored votes.
- `cardAnswers`:
  - −1 counts as "too high" and +1 as "too low". `null` answers are ignored.
  - Each share uses only the votes that answered that question.
  - Carry: `'a'` credits the row's `a` card and `'b'` the row's `b` card, whichever side the card is on. `'both'` and `'neither'` are counted separately and stay out of the denominator.
  - The difficulty mean and the per-level counts.
- `votesPerWeek`:
  - Zero weeks are included, and votes older than the window are dropped.
  - A Sunday vote counts in the week of the Monday before it.
  - The last entry is `weekStart(endDay)`. A card whose last vote is 3 weeks before `endDay` ends with 3 zero weeks.
  - There are exactly `weeks` entries.
- `voteSpan`:
  - Distinct voters.
  - `first` and `last` are `YYYY-MM-DD`, so they go straight into `fmtDay`.
  - `null` when there are no votes.

### Task R3-4: Engine view model and synergy hook

**Files:**
- Create `src/tools/analytics/cards/engineView.ts` and `useCardSynergies.ts`.
- Tests: `__tests__/engineView.test.ts` and `__tests__/useCardSynergies.test.ts`.

**Interfaces:**
```ts
export type CardSynergies = Awaited<ReturnType<typeof fetchCardSynergies>>;   // the app keeps PrecomputedCardData private
export interface UseCardSynergiesReturn {data: CardSynergies | null; loading: boolean; error: Error | null}
export function useCardSynergies(cardId: string | null): UseCardSynergiesReturn;
export const ENGINE_GROUP_CAP = 100;   // SynergyEngine maxResultsPerGroup default (SynergyEngine.ts:37)
export interface EnginePartner {id: string; score: number; tier: StrengthTierLabel; rules: string[]}
export interface EngineSummary {partners: number; capped: boolean; tiers: Record<StrengthTierLabel, number>}
export const TIER_ORDER: readonly StrengthTierLabel[];   // Perfect, Strong, Moderate, Weak
export const TIER_SERIES: readonly SeriesDef[];          // the tiers as chart series, TIER_COLORS (R-15)
export function enginePartners(data: CardSynergies): EnginePartner[];   // every partner, score desc, then id
export function engineSummary(data: CardSynergies): EngineSummary;
```

The model, as proposed. It passes `pnpm exec eslint --stdin` and typechecks against the pinned app:
```ts
import {TIER_COLORS, getStrengthTier, type StrengthTierLabel, type fetchCardSynergies} from '../../../app-bridge';
import type {SeriesDef} from '../../../charts/series';

/** What fetchCardSynergies resolves to (the app keeps PrecomputedCardData private). */
export type CardSynergies = Awaited<ReturnType<typeof fetchCardSynergies>>;

/** SynergyEngine's maxResultsPerGroup default (SynergyEngine.ts:37): a group at this size was cut. */
export const ENGINE_GROUP_CAP = 100;

export interface EnginePartner {
  id: string;
  /** The pair's aggregateScore: its strongest connection (SynergyEngine.ts:21-24). */
  score: number;
  tier: StrengthTierLabel;
  /** The names of the rules that connect the pair, strongest connection first, each once. */
  rules: string[];
}

export interface EngineSummary {
  partners: number;
  capped: boolean;
  tiers: Record<StrengthTierLabel, number>;
}

/** Strongest first, as the network diagram's legend and the tier split read. */
export const TIER_ORDER: readonly StrengthTierLabel[] = ['Perfect', 'Strong', 'Moderate', 'Weak'];

/**
 * The strength tiers as chart series: the id is the tier's label, the colour
 * its TIER_COLORS entry (decision R-15), the label its threshold
 * (getStrengthTier, scoreUtils.ts:18-23).
 */
export const TIER_SERIES: readonly SeriesDef[] = [
  {id: 'Perfect', label: 'Perfect ≥9.5', color: TIER_COLORS.perfect.color},
  {id: 'Strong', label: 'Strong ≥7', color: TIER_COLORS.strong.color},
  {id: 'Moderate', label: 'Moderate ≥4', color: TIER_COLORS.moderate.color},
  {id: 'Weak', label: 'Weak <4', color: TIER_COLORS.weak.color},
];

/**
 * Every partner the engine pairs with this card, strongest first (score, then
 * id), with the rules behind each pair. A partner in several groups is one key
 * of `pairs`, so it counts once.
 */
export function enginePartners(data: CardSynergies): EnginePartner[] {
  return Object.entries(data.pairs)
    .map(([id, pair]) => ({
      id,
      score: pair.aggregateScore,
      tier: getStrengthTier(pair.aggregateScore).label,
      rules: [...new Set([...pair.connections].sort((a, b) => b.score - a.score).map((c) => c.ruleName))],
    }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

/** The partner count, whether a group hit the engine's cap (the count is then a floor), and the count per tier. */
export function engineSummary(data: CardSynergies): EngineSummary {
  const tiers: Record<StrengthTierLabel, number> = {Perfect: 0, Strong: 0, Moderate: 0, Weak: 0};
  const partners = enginePartners(data);
  for (const partner of partners) tiers[partner.tier] += 1;
  return {
    partners: partners.length,
    capped: data.groups.some((group) => group.synergies.length >= ENGINE_GROUP_CAP),
    tiers,
  };
}
```

**How it works:**
- Partners are the keys of `pairs`, so a partner that appears in several groups counts once.
- `aggregateScore` is the highest connection score (`SynergyEngine.ts:21-24`). Vote analytics uses the same number as `engineScore` (`precompute-vote-analytics.mjs:67-82`).
- `rules` lists each pair's `connections[].ruleName`, strongest connection first, each name once. A pair can carry one rule twice, at two scores.
- `capped` is true when any group lists 100 partners, because the engine cuts each group to its top 100 (`SynergyEngine.ts:130`).
  - The partner count is then a lower bound.
  - The 2026-10-01 review counted 142 of 1,194 Core cards at the cap.
- An empty result can mean "no synergies" or "file unreadable". `fetchCardSynergies` caches a non-OK response as empty, so the hook can't tell the two apart. The Empty copy hedges for that.
- The hook keeps the last settled result keyed by card id. It derives `loading` from whether that id matches the current one.
  - A synchronous `setState` in the effect would fail `react-hooks/set-state-in-effect`. A probe lint confirmed that, and the derived pattern passes.
  - It uses a cancelled flag, as `useVoteAnalytics` does.

**Tests:**
- `enginePartners`:
  - Sorts by score, then by id.
  - `rules`: connections Ramp 5, Shift Targets 8 and Ramp 7 give `['Shift Targets', 'Ramp']`. A pair with no connections gives `[]`.
  - Tier boundaries match `getStrengthTier`: 9.5 is Perfect, 3.99 is Weak.
- `engineSummary`:
  - A partner in two groups counts once.
  - The tier counts add up to `partners`.
  - `capped` is true only when a group has 100 entries.
  - Empty data gives 0 partners.
- `TIER_SERIES`: its ids are `TIER_ORDER`, and each colour is that tier's `TIER_COLORS` entry.
- `useCardSynergies`:
  - Mock the bridge with `importOriginal`, as `src/tools/reveal/__tests__/useRevealAdmin.test.ts:12-13` does, with `fetchCardSynergies` from `vi.hoisted` (the block under "Test isolation").
  - Loading, then data.
  - A rejection sets `error`.
  - After switching ids it reads as loading again, and a late response for the old id is ignored.
  - A `null` id doesn't fetch.

### Task R3-4b: Synergy network diagram (chart kit)

Decision R-13. A radial ego network of one card: the card at the centre, its strongest partners round it, and each spoke coloured by strength tier and weighted by engine score. The component is generic (`src/charts/`), and R3-6's Engine view feeds it the card's partners.

**Design, against the `dataviz` guidance:**
- **Form.** The job is "who does this card work with, and how strongly": identity plus magnitude for one subject. An ego network shows both at a glance, and the table view carries the full ranked list. The layout is fixed by rule (no force simulation), so the same card always draws the same picture and the tests can check positions.
  - At most `NETWORK_MAX_NODES = 12` partners are drawn. Twelve names fit round a 340px plot at panel width; more would mean smaller type or a zoom.
  - The strongest sits at 12 o'clock and the rest follow clockwise.
  - Up to six share one ring. Past six, the stronger half takes the inner ring (closer means stronger), and each outer node sits midway between two inner ones, so no spoke runs through a node.
  - The rest are counted under the plot: "and K more in the table", which opens the table view.
- **Colour.** Spokes and dots take the tier colours (`TIER_COLORS` through the bridge, decision R-15). Spokes are ordered categories with a legend (`ChartLegend`, `mark="line"`, from the page) and a second cue in their width, 1px at score 0 to 4px at 10. The validator run on 2026-10-01 (`--mode dark --surface "#12121a"`) passes chroma, CVD separation (worst adjacent ΔE 11.3, Strong and Perfect, deutan), the normal-vision floor (18.3) and contrast (all four ≥ 3:1). The lightness band fails, as R-15 records. On a card the tiers land at 8.2:1 to 12.1:1, and Step 9 adds them to the theme's 1.4.11 test.
  - The centre dot is `ADMIN_COLORS.text`, not the accent: `COLORS.primary` (#ffb900) and the Perfect tier (#fbbf24) are too close to tell apart.
  - Names wear text tokens (`muted`, `text` on the hovered node and the centre), never a tier colour.
- **Marks.** Dots are r 5 (the centre r 8) with a 2px surface ring. Spokes have round caps. Names carry a 3px page-coloured halo (`paint-order: stroke`), so a crossing spoke never cuts through a letter.
- **Labels.** Each name sits beside its node, on the side away from the centre: start-anchored on the right, end-anchored on the left, centred above or below near 12 and 6 o'clock. So a node's own spoke never crosses its name.
  - Names are measured (`getComputedTextLength`, in a layout effect, once per set of names and again once the web fonts have loaded) and placed strongest first.
  - A name prints only when it stays inside the plot, 4px clear of its edge (a focus ring's reach), and clears every node's 24px target and every name already placed. The centre's name goes first.
  - A name that doesn't fit stays in the tooltip, the link's accessible name and the table view. On a phone-width panel the side names drop first.
- **Interaction.** Each node is a react-router `Link` in a `<ul>` named by `ariaLabel`, in strength order.
  - The links sit over the SVG, which is decoration (`aria-hidden`). Each covers at least 24px round its dot, plus its printed name.
  - Hover or focus shows that node's `ChartTooltip`, grows its dot, brightens its name and fades the other spokes to 0.2. The fade's transition switches off under `prefers-reduced-motion`.
  - Enter follows the link, as any link does.
  - The focus ring is `adm-net-link:focus-visible`, the gold ring every admin control uses. It lives in a scoped `<style>` with interpolated tokens.
- **Table view.** The page passes `ChartFrame` a table of every partner, not just the drawn twelve: Partner, Score, Tier and Rules. Rules is there because the tooltip shows it, and a tooltip may never be the only way to a value.

**Files:**
- Create `src/charts/networkLayout.ts`, `src/charts/NetworkDiagram.tsx` and `src/charts/NetworkDiagram.stories.tsx`.
- Test: `src/charts/__tests__/networkLayout.test.ts` and `src/charts/__tests__/NetworkDiagram.test.tsx`.
- Modify: `src/theme/__tests__/adminTheme.test.ts` (R1-2): add the tiers to `chartMarks`.

**Interfaces:**
- **Consumes:**
  - R1-3b: `ChartTooltip`, `TooltipContent`, `linear` and `SeriesDef`. The stories also use `ChartLegend`.
  - The bridge: `EASING`, `LinkButton`, `SPACING` and `useContainerWidth`. The stories and Step 9 also need `TIER_COLORS` (R3-1).
  - `ADMIN_COLORS`, `ADMIN_RADIUS`, `ADMIN_TYPE`, `fmtInt`, and react-router's `Link`.
- **Produces:** the `networkLayout.ts` and `NetworkDiagram.tsx` names under "Contract additions".

All the code in this task passes `pnpm exec eslint --stdin`. It typechecked, and the tests below passed, in a scratch copy on 2026-10-01 against stubs of R1-3b's `ChartTooltip`, `linear` and `SeriesDef`, because R1-3b wasn't written yet. After the review (the overlap slack, the font re-measure and the clip layer), the code typechecked and the tests passed again against R1-3b's written `ChartTooltip` and `linear`, with stubbed tokens. Run them again on the real kit.

- [ ] **Step 1: Write the failing layout test**

Create `src/charts/__tests__/networkLayout.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {
  boxAround,
  labelFor,
  overlaps,
  placeLabels,
  ringRadii,
  ringSizes,
  ringSlots,
  type LabelPlacement,
} from '../networkLayout';

const CENTER = {x: 280, y: 170};
const RADII: [number, number] = [70, 130];
const BOUNDS = {x: 0, y: 0, width: 560, height: 340};

/** A slot's angle in whole degrees, clockwise from 12 o'clock, in [0, 360). */
function clockDegrees(angle: number): number {
  return Math.round((((angle + Math.PI / 2) * 180) / Math.PI + 360) % 360);
}

describe('ringSizes', () => {
  it.each([
    [0, [0, 0]],
    [6, [6, 0]],
    [7, [4, 3]],
    [12, [6, 6]],
  ])('splits %i nodes as %j', (count, sizes) => {
    expect(ringSizes(count)).toEqual(sizes);
  });
});

describe('ringRadii', () => {
  it('fits the outer ring inside the shorter side, less the margin, with the inner ring at 55%', () => {
    const [inner, outer] = ringRadii(560, 340);
    expect(outer).toBe(130);
    expect(inner).toBeCloseTo(71.5, 10);
  });

  it('never goes negative on a tiny plot', () => {
    expect(ringRadii(60, 60)).toEqual([0, 0]);
  });
});

describe('ringSlots', () => {
  it('puts a lone ring on the outer radius, strongest at 12 o’clock, then clockwise', () => {
    const slots = ringSlots(4, CENTER, RADII);
    expect(slots.map((s) => clockDegrees(s.angle))).toEqual([0, 90, 180, 270]);
    expect(slots.every((s) => s.radius === 130)).toBe(true);
    expect(slots[0].x).toBeCloseTo(280, 10);
    expect(slots[0].y).toBeCloseTo(40, 10);
    expect(slots[1].x).toBeCloseTo(410, 10);
  });

  it('keeps the stronger half on the inner ring and seats the outer ring between them', () => {
    const slots = ringSlots(12, CENTER, RADII);
    expect(slots.slice(0, 6).map((s) => s.radius)).toEqual([70, 70, 70, 70, 70, 70]);
    expect(slots.slice(0, 6).map((s) => clockDegrees(s.angle))).toEqual([0, 60, 120, 180, 240, 300]);
    expect(slots.slice(6).map((s) => s.radius)).toEqual([130, 130, 130, 130, 130, 130]);
    expect(slots.slice(6).map((s) => clockDegrees(s.angle))).toEqual([30, 90, 150, 210, 270, 330]);
  });

  it('spreads a smaller outer ring over the midpoints, so no two nodes share a spoke', () => {
    const slots = ringSlots(7, CENTER, RADII);
    expect(slots.map((s) => clockDegrees(s.angle))).toEqual([0, 90, 180, 270, 45, 135, 225]);
  });

  it('lays out the same way every time', () => {
    expect(ringSlots(9, CENTER, RADII)).toEqual(ringSlots(9, CENTER, RADII));
  });
});

describe('labelFor', () => {
  const at = (degrees: number) => {
    const angle = ((degrees - 90) * Math.PI) / 180;
    return {angle, x: CENTER.x + 100 * Math.cos(angle), y: CENTER.y + 100 * Math.sin(angle)};
  };

  it('starts a label to the right of a node on the right', () => {
    const label = labelFor(at(90), 80, 16, 12);
    expect(label).toMatchObject({anchor: 'start', textX: 392, textY: 170, x: 392, y: 162, width: 80, height: 16});
  });

  it('ends a label to the left of a node on the left', () => {
    const label = labelFor(at(270), 80, 16, 12);
    expect(label.anchor).toBe('end');
    expect(label.textX).toBeCloseTo(168, 10);
    expect(label.x).toBeCloseTo(88, 10);
  });

  it('centres a label above a node near 12 o’clock and below one near 6', () => {
    const top = labelFor(at(0), 80, 16, 12);
    expect(top.anchor).toBe('middle');
    expect(top.textY).toBeCloseTo(50, 10);
    expect(top.y + top.height).toBeCloseTo(58, 10);
    const bottom = labelFor(at(180), 80, 16, 12);
    expect(bottom.textY).toBeCloseTo(290, 10);
    expect(bottom.y).toBeCloseTo(282, 10);
    expect(bottom.x).toBeCloseTo(240, 10);
  });
});

describe('overlaps', () => {
  it('counts shared area, not touching edges', () => {
    const a = {x: 0, y: 0, width: 10, height: 10};
    expect(overlaps(a, {x: 9, y: 9, width: 10, height: 10})).toBe(true);
    expect(overlaps(a, {x: 10, y: 0, width: 10, height: 10})).toBe(false);
    const unmeasured = {x: 5, y: 5, width: 0, height: 16};
    expect(overlaps(unmeasured, {...unmeasured})).toBe(false);
  });

  it('never counts a label as covering its own node through float rounding', () => {
    const slots = ringSlots(7, {x: 163, y: 170}, ringRadii(326, 340));
    expect(slots.map((s) => overlaps(labelFor(s, 40, 15, 12), boxAround(s, 24)))).toEqual(Array(7).fill(false));
  });
});

describe('placeLabels', () => {
  const label = (x: number, y: number, width: number): LabelPlacement => ({
    anchor: 'start',
    textX: x,
    textY: y + 8,
    x,
    y,
    width,
    height: 16,
  });

  it('prints the stronger of two colliding labels and drops the weaker', () => {
    const placed = placeLabels([label(100, 100, 80), label(150, 108, 80), label(300, 100, 80)], [], BOUNDS);
    expect(placed.map((p) => p !== null)).toEqual([true, false, true]);
  });

  it('drops a label that would leave the plot', () => {
    expect(placeLabels([label(500, 100, 80)], [], BOUNDS)).toEqual([null]);
  });

  it('drops a label that covers another node’s hit target', () => {
    expect(placeLabels([label(100, 100, 80)], [boxAround({x: 150, y: 108}, 24)], BOUNDS)).toEqual([null]);
  });

  it('prints every unmeasured (zero-width) label that sits inside the plot', () => {
    expect(placeLabels([label(100, 100, 0), label(100, 100, 0)], [], BOUNDS).every(Boolean)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `pnpm vitest run src/charts/__tests__/networkLayout.test.ts`
Expected: FAIL, with `Failed to resolve import "../networkLayout" from "src/charts/__tests__/networkLayout.test.ts". Does the file exist?` and `Test Files 1 failed (1)`.

- [ ] **Step 3: Write the layout module**

Create `src/charts/networkLayout.ts`:

```ts
/**
 * Geometry for NetworkDiagram: a radial ego network laid out by rule, not by a
 * force simulation, so the same partners always land in the same places and
 * the tests can check positions. Angles are radians, clockwise from 3 o'clock
 * (SVG's y axis points down), so 12 o'clock is -π/2.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A node's place: the angle and radius of its ring, and the point they give. */
export interface RingSlot extends Point {
  angle: number;
  radius: number;
}

/** A label's anchor (`textX`, `textY`: the anchor point, vertically centred) and the box its text covers. */
export interface LabelPlacement extends Box {
  anchor: 'start' | 'middle' | 'end';
  textX: number;
  textY: number;
}

/** Up to this many nodes share one ring; past it the weaker half moves out to a second. */
export const ONE_RING_MAX = 6;
/** The inner ring's radius as a share of the outer ring's. */
export const INNER_RING_SHARE = 0.55;
/** Room kept between the outer ring and the plot's edge, for a label above or below a node. */
export const RING_MARGIN = 40;
/** |cos(angle)| above this puts a label beside its node; at or below it, above or below the node. */
const SIDE_THRESHOLD = 0.35;
const TOP = -Math.PI / 2;
/** The slack overlaps allows: float rounding can leave a label one ulp inside its own node's target. */
const EPS = 1e-6;

/** How many nodes go on the inner and the outer ring: one ring up to ONE_RING_MAX, else the stronger ceil(n / 2) inside. */
export function ringSizes(count: number): [number, number] {
  if (count <= ONE_RING_MAX) return [count, 0];
  const inner = Math.ceil(count / 2);
  return [inner, count - inner];
}

/** The inner and outer ring radii for a plot of this size: the outer ring fills it, less RING_MARGIN. */
export function ringRadii(width: number, height: number): [number, number] {
  const outer = Math.max(0, Math.min(width, height) / 2 - RING_MARGIN);
  return [outer * INNER_RING_SHARE, outer];
}

/**
 * Slots for `count` nodes, strongest first. The strongest sits at 12 o'clock
 * and the rest follow clockwise. A single ring uses the outer radius. With two,
 * the inner ring holds the stronger half (closer means stronger), and each
 * outer slot sits midway between two inner ones, so no spoke runs through a node.
 */
export function ringSlots(count: number, center: Point, radii: readonly [number, number]): RingSlot[] {
  const [innerCount, outerCount] = ringSizes(count);
  const at = (angle: number, radius: number): RingSlot => ({
    angle,
    radius,
    x: center.x + radius * Math.cos(angle),
    y: center.y + radius * Math.sin(angle),
  });
  const step = (2 * Math.PI) / Math.max(innerCount, 1);
  const innerRadius = outerCount === 0 ? radii[1] : radii[0];
  const inner = Array.from({length: innerCount}, (_, i) => at(TOP + i * step, innerRadius));
  // The outer ring takes outerCount of the innerCount midpoints, spread evenly.
  const outer = Array.from({length: outerCount}, (_, j) =>
    at(TOP + step / 2 + Math.floor((j * innerCount) / outerCount) * step, radii[1]),
  );
  return [...inner, ...outer];
}

/**
 * Where a node's label goes, `gap` from the node's centre: beside the node on
 * the side away from the centre (start-anchored on the right, end-anchored on
 * the left), or centred above or below it near 12 and 6 o'clock. So a node's
 * own spoke never runs through its name.
 */
export function labelFor(slot: Point & {angle: number}, width: number, height: number, gap: number): LabelPlacement {
  const cos = Math.cos(slot.angle);
  if (cos > SIDE_THRESHOLD) {
    const textX = slot.x + gap;
    return {anchor: 'start', textX, textY: slot.y, x: textX, y: slot.y - height / 2, width, height};
  }
  if (cos < -SIDE_THRESHOLD) {
    const textX = slot.x - gap;
    return {anchor: 'end', textX, textY: slot.y, x: textX - width, y: slot.y - height / 2, width, height};
  }
  const textY = Math.sin(slot.angle) < 0 ? slot.y - gap - height / 2 : slot.y + gap + height / 2;
  return {anchor: 'middle', textX: slot.x, textY, x: slot.x - width / 2, y: textY - height / 2, width, height};
}

/**
 * True when two boxes share area. Touching edges don't count, so two zero-width
 * (unmeasured) labels never collide, and nor does a label that float rounding
 * leaves a hair (under EPS) inside its own node's target.
 */
export function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width - EPS &&
    b.x < a.x + a.width - EPS &&
    a.y < b.y + b.height - EPS &&
    b.y < a.y + a.height - EPS
  );
}

/** True when `inner` lies wholly inside `outer`. */
export function contains(outer: Box, inner: Box): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

/** The square of side `size` centred on a point: a node's hit target. */
export function boxAround(p: Point, size: number): Box {
  return {x: p.x - size / 2, y: p.y - size / 2, width: size, height: size};
}

/**
 * Which labels print. Labels are tried in priority order (the centre's first,
 * then the strongest partner's), and one prints only when it lies inside
 * `bounds` and clears every box in `blocked` (the nodes' hit targets) and
 * every label already placed. The rest come back null: their name stays in the
 * node's tooltip, its accessible name and the table view.
 */
export function placeLabels(
  labels: readonly LabelPlacement[],
  blocked: readonly Box[],
  bounds: Box,
): Array<LabelPlacement | null> {
  const placed: Box[] = [];
  return labels.map((label) => {
    const fits =
      contains(bounds, label) && !blocked.some((b) => overlaps(label, b)) && !placed.some((p) => overlaps(label, p));
    if (!fits) return null;
    placed.push(label);
    return label;
  });
}
```

- [ ] **Step 4: Run the layout test and see it pass**

Run: `pnpm vitest run src/charts/__tests__/networkLayout.test.ts`
Expected: PASS, `Tests 19 passed (19)`. Without the `EPS` slack in `overlaps`, the float-rounding test fails at index 2: on a 326px plot with 7 nodes, the inner node at 6 o'clock sits at (163, 237.65), and its name's top edge lands one ulp inside its own target.

- [ ] **Step 5: Write the failing diagram test**

Create `src/charts/__tests__/NetworkDiagram.test.tsx`. The tooltip queries read `ChartTooltip`'s title text, so they rely on R1-3b printing the title as its own text (see "Contract additions"). The tooltip title is the full name and the printed label is the short one, so the two never match the same query.

```tsx
import {afterEach, describe, expect, it, vi} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter, Route, Routes, useLocation} from 'react-router-dom';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {NETWORK_MAX_NODES, NetworkDiagram, type NetworkNode} from '../NetworkDiagram';
import type {SeriesDef} from '../series';

const SERIES: SeriesDef[] = [
  {id: 'strong', label: 'Strong', color: ADMIN_COLORS.under},
  {id: 'weak', label: 'Weak', color: ADMIN_COLORS.over},
];

function node(i: number, overrides: Partial<NetworkNode> = {}): NetworkNode {
  const name = `Partner ${i}`;
  return {
    id: String(i),
    label: name,
    href: `/cards/${i}`,
    value: 10 - i * 0.5,
    seriesId: i < 3 ? 'strong' : 'weak',
    ariaLabel: `${name}: score ${10 - i * 0.5}`,
    tooltip: {title: `${name} - Full Name`, rows: [{label: 'engine score', value: String(10 - i * 0.5)}]},
    ...overrides,
  };
}

const nodes = (n: number) => Array.from({length: n}, (_, i) => node(i));

/** Prints the router's path, so a test can see a link was followed. */
function Location() {
  return <output aria-label="Location">{useLocation().pathname}</output>;
}

function renderDiagram(props: Partial<React.ComponentProps<typeof NetworkDiagram>> = {}) {
  return render(
    <MemoryRouter initialEntries={['/cards/0']}>
      <Routes>
        <Route
          path="/cards/:id"
          element={
            <>
              <NetworkDiagram center={{label: 'Elsa'}} nodes={nodes(4)} series={SERIES} ariaLabel="Strongest partners" {...props} />
              <Location />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

/** The SVG text that prints a name (the links carry the accessible names; the text is decoration). */
function printedName(container: HTMLElement, name: string) {
  return Array.from(container.querySelectorAll('text')).find((t) => t.textContent === name);
}

afterEach(() => {
  // Only the label-collision test defines it; jsdom has no text measurement of its own.
  delete (SVGElement.prototype as Partial<SVGTextElement>).getComputedTextLength;
});

describe('NetworkDiagram', () => {
  it('lists one link per partner, strongest first, each to its page and named by its sentence', () => {
    renderDiagram();
    const list = screen.getByRole('list', {name: 'Strongest partners'});
    const links = within(list).getAllByRole('link');
    expect(links.map((a) => a.getAttribute('aria-label'))).toEqual([
      'Partner 0: score 10',
      'Partner 1: score 9.5',
      'Partner 2: score 9',
      'Partner 3: score 8.5',
    ]);
    expect(links[2]).toHaveAttribute('href', '/cards/2');
  });

  it('draws at most twelve partners and offers the rest in the table', async () => {
    const onShowAll = vi.fn();
    renderDiagram({nodes: nodes(15), onShowAll});
    expect(within(screen.getByRole('list', {name: 'Strongest partners'})).getAllByRole('link')).toHaveLength(NETWORK_MAX_NODES);
    await userEvent.click(screen.getByRole('button', {name: 'and 3 more in the table'}));
    expect(onShowAll).toHaveBeenCalledOnce();
  });

  it('names the rest as text when there is no table to open, and says nothing when all fit', () => {
    const {unmount} = renderDiagram({nodes: nodes(13)});
    expect(screen.getByText('and 1 more in the table view')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    unmount();
    renderDiagram({nodes: nodes(12)});
    expect(screen.queryByText(/more in the table/)).not.toBeInTheDocument();
  });

  it('colours each spoke by its series and widens it with the value', () => {
    const {container} = renderDiagram({nodes: [node(0, {value: 10}), node(3, {value: 0})]});
    const spokes = Array.from(container.querySelectorAll('line'));
    // Weakest first in the DOM, so the strongest paints on top.
    expect(spokes.map((l) => l.getAttribute('stroke'))).toEqual([ADMIN_COLORS.over, ADMIN_COLORS.under]);
    expect(spokes.map((l) => l.getAttribute('stroke-width'))).toEqual(['1', '4']);
  });

  it('shows a partner’s tooltip on hover and on focus, and fades the other spokes', async () => {
    const {container} = renderDiagram();
    const links = within(screen.getByRole('list', {name: 'Strongest partners'})).getAllByRole('link');

    await userEvent.hover(links[1]);
    expect(screen.getByText('Partner 1 - Full Name')).toBeInTheDocument();
    const spokes = Array.from(container.querySelectorAll('line')).reverse(); // back to strength order
    expect(spokes[1]).toHaveStyle({opacity: '1'});
    expect(spokes[0]).toHaveStyle({opacity: '0.2'});
    await userEvent.unhover(links[1]);
    expect(screen.queryByText('Partner 1 - Full Name')).not.toBeInTheDocument();

    await userEvent.tab();
    expect(links[0]).toHaveFocus();
    expect(screen.getByText('Partner 0 - Full Name')).toBeInTheDocument();
  });

  it('follows a partner’s link', async () => {
    renderDiagram();
    await userEvent.click(screen.getByRole('link', {name: 'Partner 2: score 9'}));
    expect(screen.getByRole('status', {name: 'Location'})).toHaveTextContent('/cards/2');
  });

  it('prints every name that fits and leaves out one too wide for the plot', () => {
    Object.defineProperty(SVGElement.prototype, 'getComputedTextLength', {
      configurable: true,
      value(this: SVGElement) {
        return (this.textContent ?? '').length * 6;
      },
    });
    const wide = 'An extraordinarily long partner name that cannot fit beside its node at all, anywhere';
    const {container} = renderDiagram({nodes: [node(0), node(1, {label: wide}), node(2), node(3)]});
    expect(printedName(container, 'Elsa')).toHaveAttribute('visibility', 'visible');
    expect(printedName(container, 'Partner 0')).toHaveAttribute('visibility', 'visible');
    expect(printedName(container, wide)).toHaveAttribute('visibility', 'hidden');
    // The name it leaves out stays in the link's accessible name.
    expect(screen.getByRole('link', {name: 'Partner 1: score 9.5'})).toBeInTheDocument();
  });

  it('turns its transitions off under reduced motion', () => {
    const {container} = renderDiagram();
    expect(container.querySelector('style')?.textContent).toMatch(/prefers-reduced-motion: reduce\)\{\.adm-net-fade\{transition:none;\}\}/);
  });
});
```

- [ ] **Step 6: Run it and see it fail**

Run: `pnpm vitest run src/charts/__tests__/NetworkDiagram.test.tsx`
Expected: FAIL, with `Failed to resolve import "../NetworkDiagram" from "src/charts/__tests__/NetworkDiagram.test.tsx". Does the file exist?`

- [ ] **Step 7: Write the diagram**

Create `src/charts/NetworkDiagram.tsx`. Notes on the choices that look odd:
- **The measuring effect.** It sets state from DOM reads in `useLayoutEffect`, which `react-hooks/set-state-in-effect` allows for values read from a ref. It runs before paint, so the names never flash in the wrong state.
  - It measures again once `document.fonts.ready` resolves. The body face comes through the forwarded `/fonts/`, so the first measure may be the fallback face's, and collisions would be judged on the wrong widths until the names changed.
  - jsdom has no `document.fonts`, hence the `?.`. The `live` flag drops a late resolve after the names change or the diagram unmounts.
- **The fallback width.** Until `useContainerWidth` reports, and in jsdom, the plot lays out at 560px. `useContainerWidth` returns 0 until its ResizeObserver fires, after the first paint.
- **The clip layer.** The SVG and the links sit in an `absolute`, `overflow: hidden` layer inside the plot.
  - It clips that first 560px paint, which would otherwise scroll a 320px phone page sideways.
  - Being absolute, it adds nothing to the plot's min-content width. The plot is a grid item with `min-width: auto`, so a 560px SVG in normal flow would hold it at 560px. The ResizeObserver would then report 560 and the diagram would never narrow.
  - The tooltip sits outside the layer, so a tooltip that runs past a narrow plot is never cut off.
  - Node targets sit at least 28px inside the plot (`RING_MARGIN` less half the 24px target), and names are placed 4px clear of the edge (`FOCUS_REACH`), so no focus ring is clipped either.
- **No `useMemo`.** The React Compiler memoizes, and `eslint.config.js` bans the hook.

```tsx
import {useLayoutEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {EASING, LinkButton, SPACING, useContainerWidth} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../theme/adminTheme';
import {fmtInt} from '../ui/format';
import {ChartTooltip, type TooltipContent} from './ChartTooltip';
import {boxAround, labelFor, placeLabels, ringRadii, ringSlots, type Box} from './networkLayout';
import {linear} from './scale';
import type {SeriesDef} from './series';

/** The most nodes the diagram draws. The rest are counted under it, and the table view lists them. */
export const NETWORK_MAX_NODES = 12;

export interface NetworkNode {
  id: string;
  /** Printed beside the node where it fits. Keep it short: a card's name, not its full name. */
  label: string;
  /** The node is a react-router Link to this path. */
  href: string;
  /** The spoke's weight, within valueDomain. */
  value: number;
  /** The SeriesDef that colours the node's spoke and dot. */
  seriesId: string;
  /** The link's accessible name: what the tooltip says, as one sentence. */
  ariaLabel: string;
  tooltip: TooltipContent;
}

export interface NetworkDiagramProps {
  center: {label: string};
  /** Strongest first. The first NETWORK_MAX_NODES are drawn, in this order. */
  nodes: readonly NetworkNode[];
  series: readonly SeriesDef[];
  /** Names the list of node links. */
  ariaLabel: string;
  /** The value range the spoke widths span (default 0 to 10, the engine's score scale). */
  valueDomain?: readonly [number, number];
  /** The plot's whole height in px, labels included (default 340). */
  height?: number;
  /** Shown with more than NETWORK_MAX_NODES nodes: "and K more in the table" calls it. */
  onShowAll?: () => void;
}

const DEFAULT_HEIGHT = 340;
/**
 * jsdom, and the first render before the ResizeObserver reports, measure 0: lay
 * out at a typical panel width meanwhile. The plot's clip layer keeps that
 * first paint from widening the page.
 */
const FALLBACK_WIDTH = 560;
const NODE_R = 5;
const CENTER_R = 8;
/** Each node's link covers at least this square round its dot (the dataviz hit-target floor), and names start past it. */
const HIT = 24;
/** The surface ring round each dot, and the halo round each name, in px. */
const RING = 2;
const HALO = 3;
/** How far a link's focus ring reaches past it (2px outline, 2px offset). Names stay this far inside the plot, so no ring is clipped. */
const FOCUS_REACH = 4;
/** Spoke widths at the bottom and the top of valueDomain. */
const SPOKE: [number, number] = [1, 4];
const LINE_HEIGHT = Math.round(ADMIN_TYPE.label * 1.4);
const SPOKE_OPACITY = {rest: 0.8, focus: 1, faded: 0.2};

const FAST = `.2s ${EASING.snappy}`;
/**
 * The focus ring and the fade, which inline styles can't express. The fade
 * switches off under reduced motion; the highlight itself stays.
 */
const CSS = `
.adm-net-fade{transition:opacity ${FAST};}
.adm-net-link{display:block;width:100%;height:100%;border-radius:${ADMIN_RADIUS.control}px;}
.adm-net-link:focus-visible{outline:2px solid ${ADMIN_COLORS.accent};outline-offset:2px;}
@media (prefers-reduced-motion: reduce){.adm-net-fade{transition:none;}}
`;

/** A name's rendered width, or 0 where the DOM can't measure text (jsdom). */
function textWidth(el: SVGTextElement): number {
  return typeof el.getComputedTextLength === 'function' ? el.getComputedTextLength() : 0;
}

/** The smallest box that holds both. */
function union(a: Box, b: Box): Box {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y};
}

/**
 * A radial ego network (decision R-13): the subject at the centre, its
 * strongest partners round it on one or two rings, strongest at 12 o'clock and
 * then clockwise, the stronger half on the inner ring. Each spoke takes its
 * node's series colour, and its width grows with the node's value. The layout
 * is fixed by rule (networkLayout.ts), never simulated.
 *
 * The SVG is decoration (aria-hidden). Each node is a real link in a named
 * list, in strength order, covering at least 24px round its dot and its
 * printed name; hover or focus shows the node's tooltip and fades the other
 * spokes. A name prints only where it fits: names are measured, and one that
 * would leave the plot or cover another name or node is left out. It stays in
 * the tooltip, the link's accessible name and the table view, which the page
 * passes to ChartFrame.
 */
export function NetworkDiagram({
  center,
  nodes,
  series,
  ariaLabel,
  valueDomain = [0, 10],
  height = DEFAULT_HEIGHT,
  onShowAll,
}: NetworkDiagramProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<SVGGElement>(null);
  const width = useContainerWidth(plotRef) || FALLBACK_WIDTH;
  const [active, setActive] = useState<number | null>(null);

  const shown = nodes.slice(0, NETWORK_MAX_NODES);
  const more = nodes.length - shown.length;
  const mid = {x: width / 2, y: height / 2};
  const slots = ringSlots(shown.length, mid, ringRadii(width, height));
  const spoke = linear([valueDomain[0], valueDomain[1]], SPOKE);
  const spokeWidth = (value: number) => Math.min(Math.max(spoke(value), SPOKE[0]), SPOKE[1]);
  const colorOf = (seriesId: string) => series.find((s) => s.id === seriesId)?.color ?? ADMIN_COLORS.barNeutral;

  // Measure the names once per set of names, and again once the web fonts have
  // loaded: the body face comes through the forwarded /fonts/, so the first
  // measure may be the fallback face's. A text's anchor point doesn't depend on
  // its width, so the names render (hidden) before they are measured.
  const texts = [center.label, ...shown.map((node) => node.label)];
  const signature = texts.join('\n');
  const [measured, setMeasured] = useState<{signature: string; widths: number[]} | null>(null);
  useLayoutEffect(() => {
    const group = labelsRef.current;
    if (!group) return;
    const measure = () => setMeasured({signature, widths: Array.from(group.querySelectorAll('text'), textWidth)});
    measure();
    // jsdom has no document.fonts.
    let live = true;
    document.fonts?.ready.then(() => {
      if (live) measure();
    });
    return () => {
      live = false;
    };
  }, [signature]);
  const widths = measured?.signature === signature ? measured.widths : null;

  const candidates = [
    labelFor({...mid, angle: Math.PI / 2}, widths?.[0] ?? 0, LINE_HEIGHT, HIT / 2),
    ...slots.map((slot, i) => labelFor(slot, widths?.[i + 1] ?? 0, LINE_HEIGHT, HIT / 2)),
  ];
  const targets = [mid, ...slots].map((point) => boxAround(point, HIT));
  const inside = {x: FOCUS_REACH, y: FOCUS_REACH, width: width - 2 * FOCUS_REACH, height: height - 2 * FOCUS_REACH};
  const placed = widths ? placeLabels(candidates, targets, inside) : candidates.map(() => null);

  const activeNode = active == null ? undefined : shown[active];
  const activeSlot = active == null ? undefined : slots[active];
  const spokeOpacity = (i: number) =>
    active == null ? SPOKE_OPACITY.rest : active === i ? SPOKE_OPACITY.focus : SPOKE_OPACITY.faded;

  return (
    <div style={{display: 'grid', gap: SPACING.sm}}>
      <style>{CSS}</style>
      <div ref={plotRef} style={{position: 'relative', height}}>
        {/*
          The clip layer. Until useContainerWidth reports, the plot lays out at
          FALLBACK_WIDTH, which would scroll a phone page sideways. Being
          absolute, the SVG also adds nothing to the plot's min-content width:
          as a grid item with min-width auto, the plot would otherwise stay as
          wide as the SVG, and the ResizeObserver would never see it narrow.
          The tooltip sits outside the layer, so it is never clipped.
        */}
        <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
          <svg width={width} height={height} aria-hidden="true" style={{display: 'block'}}>
            {/* Weakest first, so the strongest spokes draw on top. */}
            {slots
              .map((slot, i) => ({slot, i}))
              .reverse()
              .map(({slot, i}) => (
                <line
                  key={shown[i].id}
                  className="adm-net-fade"
                  x1={mid.x}
                  y1={mid.y}
                  x2={slot.x}
                  y2={slot.y}
                  stroke={colorOf(shown[i].seriesId)}
                  strokeWidth={spokeWidth(shown[i].value)}
                  strokeLinecap="round"
                  style={{opacity: spokeOpacity(i)}}
                />
              ))}
            {slots.map((slot, i) => (
              <circle
                key={shown[i].id}
                cx={slot.x}
                cy={slot.y}
                r={active === i ? NODE_R + RING : NODE_R}
                fill={colorOf(shown[i].seriesId)}
                stroke={ADMIN_COLORS.page}
                strokeWidth={RING}
              />
            ))}
            <circle cx={mid.x} cy={mid.y} r={CENTER_R} fill={ADMIN_COLORS.text} stroke={ADMIN_COLORS.page} strokeWidth={RING} />
            {/* The halo (a page-coloured stroke painted under the fill) keeps a name legible where a spoke crosses it. */}
            <g
              ref={labelsRef}
              fontSize={ADMIN_TYPE.label}
              stroke={ADMIN_COLORS.page}
              strokeWidth={HALO}
              strokeLinejoin="round"
              style={{paintOrder: 'stroke'}}>
              {candidates.map((label, i) => (
                <text
                  key={i === 0 ? 'center' : shown[i - 1].id}
                  x={label.textX}
                  y={label.textY}
                  textAnchor={label.anchor}
                  dominantBaseline="central"
                  fill={i === 0 || active === i - 1 ? ADMIN_COLORS.text : ADMIN_COLORS.muted}
                  fontWeight={i === 0 ? 600 : 500}
                  visibility={placed[i] ? 'visible' : 'hidden'}>
                  {texts[i]}
                </text>
              ))}
            </g>
          </svg>
          <ul aria-label={ariaLabel} style={{margin: 0, padding: 0, listStyle: 'none'}}>
            {shown.map((node, i) => {
              const label = placed[i + 1];
              const box = label ? union(targets[i + 1], label) : targets[i + 1];
              return (
                <li key={node.id} style={{position: 'absolute', left: box.x, top: box.y, width: box.width, height: box.height}}>
                  <Link
                    to={node.href}
                    aria-label={node.ariaLabel}
                    className="adm-net-link"
                    onPointerEnter={() => setActive(i)}
                    onPointerLeave={() => setActive(null)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                  />
                </li>
              );
            })}
          </ul>
        </div>
        <ChartTooltip
          content={activeNode?.tooltip ?? null}
          x={activeSlot?.x ?? 0}
          y={activeSlot?.y ?? 0}
          bounds={{width, height}}
        />
      </div>
      {more > 0 && (
        <p style={{margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>
          {onShowAll ? (
            <LinkButton type="button" size="sm" onClick={onShowAll} style={{minHeight: HIT}}>
              and {fmtInt(more)} more in the table
            </LinkButton>
          ) : (
            `and ${fmtInt(more)} more in the table view`
          )}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Run the diagram test and see it pass**

Run: `pnpm vitest run src/charts/__tests__/NetworkDiagram.test.tsx`
Expected: PASS, `Tests 8 passed (8)`.

- [ ] **Step 9: Hold the tier colours to WCAG 1.4.11**

R1-2's rule is that a chart which adds a fill adds a line to `chartMarks`. In `src/theme/__tests__/adminTheme.test.ts`, the import, before:

```ts
import {COLORS, FONT_SIZES, RADIUS} from '../../app-bridge';
```

After:

```ts
import {COLORS, FONT_SIZES, RADIUS, TIER_COLORS} from '../../app-bridge';
```

The end of `chartMarks`, before:

```ts
      'No score stripes (muted)': ADMIN_COLORS.muted,
    };
```

After:

```ts
      'No score stripes (muted)': ADMIN_COLORS.muted,
      // The strength tiers: the network diagram's spokes and dots, and the tier split (R3).
      'Perfect tier': TIER_COLORS.perfect.color,
      'Strong tier': TIER_COLORS.strong.color,
      'Moderate tier': TIER_COLORS.moderate.color,
      'Weak tier': TIER_COLORS.weak.color,
    };
```

Run: `pnpm vitest run src/theme/__tests__/adminTheme.test.ts`
Expected: PASS, `Tests 6 passed (6)`. This test passes from the start, because the tiers clear 3:1 with room to spare (8.2:1 to 12.1:1). It is there so the colours stay that way.

- [ ] **Step 10: Write the stories**

Create `src/charts/NetworkDiagram.stories.tsx`. `.storybook/preview.tsx` mounts `AdminStyles` for every story (R1-2), and the diagram brings its own scoped styles.

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {MemoryRouter} from 'react-router-dom';
import {TIER_COLORS} from '../app-bridge';
import {ChartLegend} from './ChartLegend';
import {NetworkDiagram, type NetworkNode} from './NetworkDiagram';
import type {SeriesDef} from './series';

const TIERS: SeriesDef[] = [
  {id: 'Perfect', label: 'Perfect ≥9.5', color: TIER_COLORS.perfect.color},
  {id: 'Strong', label: 'Strong ≥7', color: TIER_COLORS.strong.color},
  {id: 'Moderate', label: 'Moderate ≥4', color: TIER_COLORS.moderate.color},
  {id: 'Weak', label: 'Weak <4', color: TIER_COLORS.weak.color},
];

const NAMES = [
  'Elsa',
  'Anna',
  'Olaf',
  'Kristoff',
  'Sven',
  'Hans',
  'Marshmallow',
  'Grand Pabbie',
  'Oaken',
  'Duke of Weselton',
  'Bruni',
  'Iduna',
  'Agnarr',
  'Honeymaren',
  'Ryder',
];
const SCORES = [10, 10, 9, 8, 8, 8, 7, 7, 6, 6, 5, 4, 3, 3, 2];

function tierOf(score: number): string {
  if (score >= 9.5) return 'Perfect';
  if (score >= 7) return 'Strong';
  return score >= 4 ? 'Moderate' : 'Weak';
}

function nodes(count: number, label: (i: number) => string = (i) => NAMES[i]): NetworkNode[] {
  return Array.from({length: count}, (_, i) => {
    const score = SCORES[i];
    const tier = tierOf(score);
    return {
      id: String(i + 1),
      label: label(i),
      href: `/cards/${i + 1}`,
      value: score,
      seriesId: tier,
      ariaLabel: `${NAMES[i]} - Story Version: ${tier}, engine score ${score}, from Ramp`,
      tooltip: {
        title: `${NAMES[i]} - Story Version`,
        rows: [
          {value: String(score), label: `engine score · ${tier}`, color: TIERS.find((t) => t.id === tier)?.color},
          {value: 'Ramp', label: 'rule'},
        ],
      },
    };
  });
}

const meta = {
  title: 'Admin/NetworkDiagram',
  component: NetworkDiagram,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div style={{maxWidth: 640}}>
          <ChartLegend series={TIERS} mark="line" />
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  args: {center: {label: 'Queen Elsa'}, series: TIERS, ariaLabel: 'Strongest synergy partners', nodes: nodes(12)},
} satisfies Meta<typeof NetworkDiagram>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Twelve partners: the stronger six on the inner ring. */
export const TwoRings: Story = {};

/** Up to six partners share one ring. */
export const OneRing: Story = {args: {nodes: nodes(5)}};

/** Fifteen partners: twelve drawn, "and 3 more in the table" under the plot. */
export const MoreThanTwelve: Story = {args: {nodes: nodes(15), onShowAll: () => {}}};

/** Long names that can't all fit: the weaker ones drop to their tooltips. */
export const LongNames: Story = {
  args: {nodes: nodes(12, (i) => `${NAMES[i]} of the Northern Mountains and the Enchanted Forest`)},
};

/** A narrow panel (phone width): the side names drop first. */
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{maxWidth: 320}}>
        <Story />
      </div>
    ),
  ],
};
```

- [ ] **Step 11: Lint and typecheck**

Run: `pnpm lint` and `pnpm typecheck`
Expected: no errors and no warnings in the new files.

- [ ] **Step 12: Commit**

Run with the Bash tool, only after the owner approves:
```bash
git add src/charts/networkLayout.ts src/charts/NetworkDiagram.tsx src/charts/NetworkDiagram.stories.tsx src/charts/__tests__/networkLayout.test.ts src/charts/__tests__/NetworkDiagram.test.tsx src/theme/__tests__/adminTheme.test.ts
USER_APPROVED=1 git commit -m "feat(charts): add the synergy network diagram (#24)"
```

### Task R3-4c: Split bar (chart kit)

A card's page has two splits of a few ordered parts: the partners' strength tiers, a part-to-whole split, and the accuracy answers (too high, right, too low), an ordered scale.
- **Two forms, one component.** The `dataviz` form table gives each its own form:
  - Part-to-whole with up to six parts goes on a stacked bar. A `MeterBar` shows a single ratio against a limit, so it can't show three parts, and a donut is deprioritized. The tier split is a plain stacked bar that fills the track.
  - An ordered-scale share (Likert, sentiment) goes on a diverging stacked bar centred on neutral. Too high / Right / Too low is that kind of scale, so the accuracy split passes `centerId="right"`. The middle of "right" sits on a 1px `ADMIN_COLORS.muted` tick at 50%, "too high" reaches left and "too low" reaches right.
  - **The centred scale.** Let `c` be the centre part's value, `left` the sum of the parts before it, `right` the sum after it, and `maxSide = max(left + c/2, right + c/2)`. Each part's width is `value / (2 × maxSide)` of the track. A leading spacer fills `50% − (left + c/2) / (2 × maxSide)` and a trailing one the rest, so both arms share one scale and the shorter arm leaves track empty. With `parts(12, 30, 8)`, the leading spacer is 0 and "right" is 55.6% wide.
- **Marks.** Painted segments sit 2px apart on the surface, the bar's outer ends round at 4px (`RADIUS.sm`), and its inner joins stay square.
  - Each part is a transparent 24px-tall hover target (the `dataviz` hit-target floor) that holds its painted segment. The 2px surface gap is 1px of padding on each side of a target, inside it, so targets meet with no dead gap between them. The `dataviz` rule says a mark's hit area includes its surface gap.
  - A flex `gap` would leave the centre part off the 50% tick whenever the two arms hold different numbers of parts, so padding carries the gap instead.
- The legend under the bar prints each part's swatch, label, share and count. It is the selective direct label, and it is also the bar's table: every value is in text.
  - So the bar is `aria-hidden`, and the legend is a list named by `ariaLabel`.
  - This is the one chart with no `ChartFrame` toggle. Decision R-12 asks for a Chart/Table toggle on every chart, but here the Table view would repeat the legend line for line. Open question 9 asks the owner.
- Hovering a segment lifts it (the others fade to 0.55) and shows its tooltip: share, then count. The tooltip repeats the legend, so it gates nothing. The fade is instant, so there is no motion to reduce.
- Shares are whole percentages that add up to 100 (largest remainder), so a legend never reads 99% or 101%.

**Files:**
- Create `src/charts/shares.ts`, `src/charts/SplitBar.tsx` and `src/charts/SplitBar.stories.tsx`.
- Test: `src/charts/__tests__/SplitBar.test.tsx`.
- `sharesOf` gets its own module because a component file that also exports a function trips `react-refresh/only-export-components`.

**Interfaces:**
- **Consumes:** R1-3b's `ChartTooltip`, `TooltipContent`, `SeriesDef` and `SURFACE_GAP` (`series.ts`); the bridged `RADIUS`, `SPACING` and `TIER_COLORS` (the stories only); `ADMIN_COLORS`, `ADMIN_TYPE` and `fmtInt`.
- **Produces:** `sharesOf`, `SplitPart`, `SplitBarProps` (with `centerId`) and `SplitBar`, as under "Contract additions".

The code passes `pnpm exec eslint --stdin`. It typechecked, and the tests passed, in the same scratch copy as R3-4b. The reviewed version (the centred scale and the 24px targets) typechecked and passed again on 2026-10-01 against R1-3b's written `ChartTooltip`, with stubbed tokens.

- [ ] **Step 1: Write the failing test**

Create `src/charts/__tests__/SplitBar.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {fireEvent, render, screen, within} from '@testing-library/react';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {SplitBar} from '../SplitBar';
import type {SeriesDef} from '../series';
import {sharesOf} from '../shares';

const SERIES: SeriesDef[] = [
  {id: 'tooHigh', label: 'Too high', color: ADMIN_COLORS.over},
  {id: 'right', label: 'Right', color: ADMIN_COLORS.barNeutral},
  {id: 'tooLow', label: 'Too low', color: ADMIN_COLORS.under},
];

const parts = (tooHigh: number, right: number, tooLow: number) => [
  {id: 'tooHigh', value: tooHigh},
  {id: 'right', value: right},
  {id: 'tooLow', value: tooLow},
];

/** An element's flex-grow: its length on the track, in the parts' units. A missing element is 0. */
const grow = (el: Element | null) => Number((el as HTMLElement | null)?.style.flexGrow || 0);

describe('sharesOf', () => {
  it.each([
    [[1, 1, 1], [34, 33, 33]],
    [[12, 30, 8], [24, 60, 16]],
    [[2, 0, 1], [67, 0, 33]],
    [[0, 0, 0], [0, 0, 0]],
  ])('splits %j into whole percentages %j that add up', (values, shares) => {
    expect(sharesOf(values)).toEqual(shares);
  });
});

describe('SplitBar', () => {
  it('prints every part’s share and count in a named legend, zero parts included', () => {
    render(<SplitBar parts={parts(12, 30, 0)} series={SERIES} ariaLabel="Accuracy answers" />);
    const items = within(screen.getByRole('list', {name: 'Accuracy answers'})).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual(['Too high 29% (12)', 'Right 71% (30)', 'Too low 0% (0)']);
  });

  it('draws one 24px hover target per non-zero part, sized by its value, around a segment in its series colour', () => {
    const {container} = render(<SplitBar parts={parts(12, 30, 0)} series={SERIES} ariaLabel="Accuracy answers" />);
    const segments = Array.from(container.querySelectorAll<HTMLElement>('[data-part]'));
    expect(segments.map((s) => s.dataset.part)).toEqual(['tooHigh', 'right']);
    expect(segments[0]).toHaveStyle({flexGrow: '12'});
    expect(segments[0]).toHaveStyle({height: '24px'});
    expect(container.querySelector('[data-part="tooHigh"] > div')).toHaveStyle({backgroundColor: ADMIN_COLORS.over});
    expect(segments[0].closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('lifts the hovered segment and shows its share in a tooltip', () => {
    const {container} = render(<SplitBar parts={parts(12, 30, 8)} series={SERIES} ariaLabel="Accuracy answers" />);
    const [, right] = Array.from(container.querySelectorAll<HTMLElement>('[data-part]'));
    fireEvent.pointerEnter(right);
    expect(screen.getByText('of 50 votes')).toBeInTheDocument();
    expect(container.querySelector('[data-part="right"] > div')).toHaveStyle({opacity: '1'});
    expect(container.querySelector('[data-part="tooHigh"] > div')).toHaveStyle({opacity: '0.55'});
    fireEvent.pointerLeave(right);
    expect(screen.queryByText('of 50 votes')).not.toBeInTheDocument();
  });

  it('centres the neutral part on a tick at 50%, every part on one scale', () => {
    const {container, rerender} = render(
      <SplitBar parts={parts(12, 30, 8)} series={SERIES} ariaLabel="Accuracy answers" centerId="right" />,
    );
    // Left of centre: 12 + 30/2 = 27. Right of it: 8 + 30/2 = 23. The track spans 2 × 27.
    const track = () => Array.from(container.querySelectorAll('[data-part], [data-spacer]')).reduce((sum, el) => sum + grow(el), 0);
    expect(grow(container.querySelector('[data-spacer="lead"]'))).toBe(0);
    expect(grow(container.querySelector('[data-spacer="trail"]'))).toBe(4);
    expect(grow(container.querySelector('[data-part="right"]')) / track()).toBeCloseTo(0.556, 3);
    expect(container.querySelector('[data-center-tick]')).toHaveStyle({left: '50%', width: '1px'});
    expect(container.querySelector('[data-center-tick]')).toHaveStyle({backgroundColor: ADMIN_COLORS.muted});

    // The longer side is the right one now: 10 + 6/2 = 13 against 2 + 3 = 5.
    rerender(<SplitBar parts={parts(2, 6, 10)} series={SERIES} ariaLabel="Accuracy answers" centerId="right" />);
    expect(grow(container.querySelector('[data-spacer="lead"]'))).toBe(8);
    expect(grow(container.querySelector('[data-spacer="lead"]')) / track()).toBeCloseTo(0.5 - 5 / 26, 10);
  });

  it('shows an empty track when nothing was answered', () => {
    const {container} = render(<SplitBar parts={parts(0, 0, 0)} series={SERIES} ariaLabel="Accuracy answers" unit="answers" />);
    expect(container.querySelectorAll('[data-part]')).toHaveLength(0);
    expect(container.querySelector('[aria-hidden="true"] > div')).toHaveStyle({backgroundColor: ADMIN_COLORS.barTrack});
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `pnpm vitest run src/charts/__tests__/SplitBar.test.tsx`
Expected: FAIL, with `Failed to resolve import "../SplitBar" from "src/charts/__tests__/SplitBar.test.tsx". Does the file exist?`

- [ ] **Step 3: Write the shares helper and the bar**

Create `src/charts/shares.ts`:

```ts
/**
 * Whole-number percentages that add up to 100 (largest remainder, ties to the
 * earlier part), so a legend never reads 99% or 101%. All zeros for a zero total.
 */
export function sharesOf(values: readonly number[]): number[] {
  const total = values.reduce((sum, v) => sum + v, 0);
  if (total <= 0) return values.map(() => 0);
  const raw = values.map((v) => (v / total) * 100);
  const shares = raw.map(Math.floor);
  const order = raw.map((r, i) => ({i, rest: r - Math.floor(r)})).sort((a, b) => b.rest - a.rest || a.i - b.i);
  const missing = 100 - shares.reduce((sum, s) => sum + s, 0);
  for (let k = 0; k < missing; k++) shares[order[k].i] += 1;
  return shares;
}
```

Create `src/charts/SplitBar.tsx`:

```tsx
import {useState} from 'react';
import {RADIUS, SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';
import {fmtInt} from '../ui/format';
import {ChartTooltip, type TooltipContent} from './ChartTooltip';
import {SURFACE_GAP, type SeriesDef} from './series';
import {sharesOf} from './shares';

export interface SplitPart {
  /** The SeriesDef this part is drawn and named by. */
  id: string;
  value: number;
}

export interface SplitBarProps {
  /** One per series, in the order they read left to right. A zero part draws nothing but keeps its legend row. */
  parts: readonly SplitPart[];
  series: readonly SeriesDef[];
  /** Names the legend list, which carries every number. */
  ariaLabel: string;
  /** The noun after each count: "votes" (default), "partners". */
  unit?: string;
  /** The bar's thickness in px (default 12; the mark spec caps bars at 24). */
  height?: number;
  /**
   * The neutral part of an ordered scale, such as the accuracy answers' "right".
   * When it is set, the bar diverges: that part's middle sits on a tick at 50%,
   * the parts before it reach left and the parts after it reach right, all on
   * one scale. Without it, the parts fill the track.
   */
  centerId?: string;
}

const DEFAULT_HEIGHT = 12;
const MAX_HEIGHT = 24;
/** Every part's hover target is this tall, whatever the bar's thickness (the dataviz hit-target floor). */
const HIT = 24;
const FADED = 0.55;

/**
 * The empty track before and after the parts, in the parts' own units. Zero
 * for a plain bar. For a centred one, each side reaches max(left, right), the
 * longer side's length from the centre part's middle, so that middle sits at 50%.
 */
function spacersOf(parts: readonly SplitPart[], centerId: string | undefined): {lead: number; trail: number} {
  const center = centerId == null ? -1 : parts.findIndex((part) => part.id === centerId);
  if (center < 0) return {lead: 0, trail: 0};
  const sum = (from: number, to: number) => parts.slice(from, to).reduce((total, part) => total + part.value, 0);
  const half = parts[center].value / 2;
  const left = sum(0, center) + half;
  const right = sum(center + 1, parts.length) + half;
  const side = Math.max(left, right);
  return {lead: side - left, trail: side - right};
}

/**
 * One stacked bar of a few ordered parts: the strength tiers fill the track
 * (part-to-whole), and the accuracy answers diverge from "right" (an
 * ordered-scale share, `centerId`), as the dataviz form table asks. A
 * single-ratio MeterBar can't show three parts. Painted segments sit 2px apart
 * on the surface, the bar's outer ends round (RADIUS.sm) and its inner joins
 * stay square.
 *
 * Each part is a 24px-tall hover target that includes its share of the surface
 * gap, and the painted segment sits inside it. The legend under the bar prints
 * every part's share and count beside a swatch, so the bar itself is
 * decoration (aria-hidden) and needs no table view: the legend is its table.
 * Hovering a part lifts it and shows its tooltip.
 */
export function SplitBar({parts, series, ariaLabel, unit = 'votes', height = DEFAULT_HEIGHT, centerId}: SplitBarProps) {
  const [hover, setHover] = useState<{index: number; x: number; width: number} | null>(null);
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  const shares = sharesOf(parts.map((part) => part.value));
  const {lead, trail} = spacersOf(parts, centerId);
  const thickness = Math.min(height, MAX_HEIGHT);
  const defOf = (id: string) => series.find((s) => s.id === id);
  const drawn = parts.flatMap((part, index) => (part.value > 0 ? [{part, index}] : []));
  const hovered = hover == null ? undefined : parts[hover.index];
  const tooltip: TooltipContent | null =
    hover && hovered
      ? {
          title: defOf(hovered.id)?.label ?? hovered.id,
          rows: [
            {value: `${shares[hover.index]}%`, label: `of ${fmtInt(total)} ${unit}`},
            {value: fmtInt(hovered.value), label: unit},
          ],
        }
      : null;

  return (
    <div style={{display: 'grid', gap: SPACING.sm, minWidth: 0}}>
      <div style={{position: 'relative'}}>
        {/* Decoration: the legend below carries every number. The gaps show the surface. */}
        <div aria-hidden="true" style={{position: 'relative', display: 'flex', alignItems: 'center', height: HIT}}>
          {lead > 0 && <div data-spacer="lead" style={{flex: `${lead} 0 0`}} />}
          {total === 0 ? (
            <div style={{flex: 1, height: thickness, borderRadius: RADIUS.sm, backgroundColor: ADMIN_COLORS.barTrack}} />
          ) : (
            drawn.map(({part, index}, k) => {
              const left = k === 0 ? RADIUS.sm : 0;
              const right = k === drawn.length - 1 ? RADIUS.sm : 0;
              return (
                <div
                  key={part.id}
                  data-part={part.id}
                  onPointerEnter={(event) => {
                    const target = event.currentTarget;
                    setHover({
                      index,
                      x: target.offsetLeft + target.offsetWidth / 2,
                      width: target.parentElement?.offsetWidth ?? 0,
                    });
                  }}
                  onPointerLeave={() => setHover(null)}
                  style={{
                    flex: `${part.value} 0 0`,
                    minWidth: 2 * SURFACE_GAP,
                    height: HIT,
                    display: 'flex',
                    alignItems: 'center',
                    boxSizing: 'border-box',
                    padding: `0 ${SURFACE_GAP / 2}px`,
                  }}>
                  <div
                    style={{
                      flex: 1,
                      height: thickness,
                      borderRadius: `${left}px ${right}px ${right}px ${left}px`,
                      backgroundColor: defOf(part.id)?.color ?? ADMIN_COLORS.barNeutral,
                      opacity: hover == null || hover.index === index ? 1 : FADED,
                    }}
                  />
                </div>
              );
            })
          )}
          {trail > 0 && <div data-spacer="trail" style={{flex: `${trail} 0 0`}} />}
          {centerId != null && (
            <div
              data-center-tick
              style={{position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, backgroundColor: ADMIN_COLORS.muted}}
            />
          )}
        </div>
        <ChartTooltip content={tooltip} x={hover?.x ?? 0} y={0} bounds={{width: hover?.width ?? 0, height}} />
      </div>
      <ul
        aria-label={ariaLabel}
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
        {parts.map((part, i) => (
          <li key={part.id} style={{display: 'flex', alignItems: 'center', gap: SPACING.xs}}>
            <span
              aria-hidden="true"
              style={{
                width: SPACING.sm,
                height: SPACING.sm,
                borderRadius: RADIUS.xs,
                backgroundColor: defOf(part.id)?.color ?? ADMIN_COLORS.barNeutral,
              }}
            />
            {/* The spaces keep the text readable as one phrase ("Right 60% (30)"); the flex gap does the spacing. */}
            {defOf(part.id)?.label ?? part.id}{' '}
            <span style={{color: ADMIN_COLORS.text, fontWeight: 600}}>{shares[i]}%</span>{' '}
            <span>({fmtInt(part.value)})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Run the test and see it pass**

Run: `pnpm vitest run src/charts/__tests__/SplitBar.test.tsx`
Expected: PASS, `Tests 9 passed (9)`.

- [ ] **Step 5: Write the stories**

Create `src/charts/SplitBar.stories.tsx`:

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {TIER_COLORS} from '../app-bridge';
import {ADMIN_COLORS} from '../theme/adminTheme';
import {SplitBar} from './SplitBar';

const meta = {
  title: 'Admin/SplitBar',
  component: SplitBar,
  decorators: [
    (Story) => (
      <div style={{maxWidth: 420}}>
        <Story />
      </div>
    ),
  ],
  args: {
    ariaLabel: 'Is the engine’s score right?',
    unit: 'answers',
    series: [
      {id: 'tooHigh', label: 'Too high', color: ADMIN_COLORS.over},
      {id: 'right', label: 'Right', color: ADMIN_COLORS.barNeutral},
      {id: 'tooLow', label: 'Too low', color: ADMIN_COLORS.under},
    ],
    parts: [
      {id: 'tooHigh', value: 12},
      {id: 'right', value: 30},
      {id: 'tooLow', value: 8},
    ],
  },
} satisfies Meta<typeof SplitBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The accuracy answers on a card's page: an ordered scale, so the bar diverges from "right". */
export const Accuracy: Story = {args: {centerId: 'right'}};

/** The same answers as a plain part-to-whole bar, the tier split's form, for comparison. */
export const AccuracyPlain: Story = {};

/** A part with no votes keeps its legend row and draws no segment. */
export const WithAZeroPart: Story = {
  args: {
    centerId: 'right',
    parts: [
      {id: 'tooHigh', value: 0},
      {id: 'right', value: 9},
      {id: 'tooLow', value: 3},
    ],
  },
};

/** The strength tiers in the Engine view. */
export const Tiers: Story = {
  args: {
    ariaLabel: 'Partners by strength tier',
    unit: 'partners',
    series: [
      {id: 'Perfect', label: 'Perfect ≥9.5', color: TIER_COLORS.perfect.color},
      {id: 'Strong', label: 'Strong ≥7', color: TIER_COLORS.strong.color},
      {id: 'Moderate', label: 'Moderate ≥4', color: TIER_COLORS.moderate.color},
      {id: 'Weak', label: 'Weak <4', color: TIER_COLORS.weak.color},
    ],
    parts: [
      {id: 'Perfect', value: 6},
      {id: 'Strong', value: 41},
      {id: 'Moderate', value: 77},
      {id: 'Weak', value: 18},
    ],
  },
};

/** Nothing answered yet: an empty track, with the centre tick. */
export const Empty: Story = {
  args: {
    centerId: 'right',
    parts: [
      {id: 'tooHigh', value: 0},
      {id: 'right', value: 0},
      {id: 'tooLow', value: 0},
    ],
  },
};
```

- [ ] **Step 6: Lint and typecheck**

Run: `pnpm lint` and `pnpm typecheck`
Expected: no errors and no warnings in the new files.

- [ ] **Step 7: Commit**

Run with the Bash tool, only after the owner approves:
```bash
git add src/charts/shares.ts src/charts/SplitBar.tsx src/charts/SplitBar.stories.tsx src/charts/__tests__/SplitBar.test.tsx
USER_APPROVED=1 git commit -m "feat(charts): add the split bar for part-to-whole and ordered-scale splits (#24)"
```

### Task R3-5: Switch-card combobox and card routes

**Files:**
- Create `src/tools/analytics/cards/CardSwitcher.tsx` and `cardRoutes.ts`.
- Tests: `__tests__/CardSwitcher.test.tsx` and `__tests__/cardRoutes.test.ts`.

**Interfaces:**
```ts
export const LAST_CARD_KEY = 'inkweave.admin.last-card';
export function cardAnalyticsPath(cardId: string): string;   // `/cards/${encodeURIComponent(cardId)}`; R4 links with it
export function readLastCard(): string | null;               // try/catch, like useGithubToken
export function writeLastCard(cardId: string): void;
export function forgetLastCard(cardId: string): void;        // clears only if it is the stored id
export function CardSwitcher();
```

**How it works:**
- It reads the cards from `useCardDataContext().cards`: Core cards, preview cards included (`loader.ts:192-206`).
- It calls the bridged `useAutocomplete({cards, query, onQueryChange, onSelect: (c) => navigate(cardAnalyticsPath(c.id)), maxResults: 6})`.
  - The hook supplies the combobox behaviour: `role="combobox"`, `aria-expanded`, `aria-controls` and `aria-activedescendant`.
  - It also handles Arrow, Enter and Escape, the blur delay, and selection on mousedown.
- Admin renders:
  - An input with `aria-label="Switch card"`, the placeholder "Switch card…" and the class `adm-input`.
  - A `<ul role="listbox">` at `Z_INDEX.autocomplete`, holding `<li role="option">` rows.
  - Each row shows `InkIcon`, then "name · version", then `<code>#{setNumber}</code>` (only when `setNumber != null`).
  - The highlighted row uses `ADMIN_COLORS.rowHover`.
- The list is not modal: no `aria-modal` and no focus trap, so `no-unshelled-dialogs` doesn't apply. A sketch of this markup passes `eslint --stdin` with the inkweave and jsx-a11y rules.
- Search follows the app: it matches name, full name or version, puts newer sets first, needs two letters and waits 150 ms.

**Tests:**
- `cardRoutes`, under "Test isolation"'s storage rules:
  - The path encodes the id.
  - Read, write and forget round-trip.
  - Forget leaves a different stored id alone.
  - When `getItem`, `setItem` and `removeItem` throw, read returns `null` and nothing throws.
- `CardSwitcher`, with the card list mocked through the bridge as under "Test isolation":
  - The combobox has its name and starts collapsed.
  - One letter shows no list.
  - "mi" shows at most 6 options, each with "name · version" and "#number". A card without a `setNumber` shows no number.
  - ArrowDown then Enter navigates to `/cards/<id>` and clears the input. Clicking an option does the same.
  - Escape sets `aria-expanded="false"`.
  - Nothing on the page has `aria-modal`.
  - The tests use real timers with `findAllByRole('option')`.

### Task R3-5b: Shared GapScale

R1-8 keeps the over/under track private to the Overview's calibration card. The per-card verdict (R3-6) draws the same track, so this task moves it, unchanged, to `src/ui/GapScale.tsx`, and `CalibrationCard` imports it from there. One track, one band and one clamp then serve both pages.

**Files:**
- Create `src/ui/GapScale.tsx`.
- Test: `src/ui/__tests__/GapScale.test.tsx`.
- Modify `src/tools/analytics/overview/CalibrationCard.tsx` (R1-8 Step 17): its imports, and the `TRACK`, `SCALE_LABEL` and `GapScale` block, which moves out.

**Interfaces:**
- **Consumes:** R1-8's `scalePercent` (`src/tools/analytics/verdict.ts`); the bridged `COLORS`, `SPACING` and `hexRgba`; `ADMIN_COLORS`, `ADMIN_RADIUS` and `ADMIN_TYPE`.
- **Produces:** `GapScaleProps` and `GapScale`, as under "Contract additions". The props keep R1-8's names, `meanGap` and `color`.

All the code in this task passes `pnpm exec eslint --stdin`. It typechecked, and the test passed, in the R3-4b scratch copy against R1-8's `verdict.ts`.

- [ ] **Step 1: Write the failing test**

Create `src/ui/__tests__/GapScale.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {COLORS} from '../../app-bridge';
import {GapScale} from '../GapScale';

/** The track's marks: the centre tick, then the dot when there is one. */
function marks(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('[aria-hidden="true"] > div'));
}

describe('GapScale', () => {
  it('names its two ends and hides the track from assistive tech', () => {
    const {container} = render(<GapScale meanGap={0.75} color={COLORS.success} />);
    expect(screen.getByText('over-rates')).toBeInTheDocument();
    expect(screen.getByText('under-rates')).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('puts the dot at the gap in the colour it is given, clamped to the ends', () => {
    const {container, rerender} = render(<GapScale meanGap={0.75} color={COLORS.success} />);
    expect(marks(container)[1]).toHaveStyle({left: '75%', backgroundColor: COLORS.success});
    rerender(<GapScale meanGap={-3} color={COLORS.error} />);
    expect(marks(container)[1]).toHaveStyle({left: '0%', backgroundColor: COLORS.error});
  });

  it('draws only the centre tick without a gap', () => {
    const {container} = render(<GapScale meanGap={null} color={COLORS.textMuted} />);
    expect(marks(container)).toHaveLength(1);
    expect(marks(container)[0]).toHaveStyle({left: '50%'});
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `pnpm vitest run src/ui/__tests__/GapScale.test.tsx`
Expected: FAIL, with `Failed to resolve import "../GapScale" from "src/ui/__tests__/GapScale.test.tsx". Does the file exist?` and `Test Files 1 failed (1)`.

- [ ] **Step 3: Create the shared track**

Create `src/ui/GapScale.tsx`. `TRACK`, `SCALE_LABEL` and the body of `GapScale` are R1-8's, character for character. Only the `export`s and the named props interface are new.

```tsx
import type {CSSProperties} from 'react';
import {COLORS, SPACING, hexRgba} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../theme/adminTheme';
import {scalePercent} from '../tools/analytics/verdict';

/**
 * The track tints toward the over-rates colour on the left and the under-rates
 * colour on the right: COLORS.error and COLORS.success, as verdictFor and
 * gapColor use them.
 */
const TRACK = `linear-gradient(90deg, ${hexRgba(COLORS.error, 0.35)}, ${ADMIN_COLORS.barTrack} 30%, ${ADMIN_COLORS.barTrack} 70%, ${hexRgba(COLORS.success, 0.35)})`;

const SCALE_LABEL: CSSProperties = {fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted};

export interface GapScaleProps {
  meanGap: number | null;
  color: string;
}

/**
 * The diverging over/under scale: a centre tick, and a dot at the mean gap
 * (clamped by scalePercent), left out when there is no gap. The number above
 * says the same thing, so the track is hidden from assistive tech.
 */
export function GapScale({meanGap, color}: GapScaleProps) {
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
```

- [ ] **Step 4: Point CalibrationCard at it**

In `src/tools/analytics/overview/CalibrationCard.tsx`, replace the top of the file, from the imports through the end of `GapScale`. Before (R1-8 Step 17):

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
```

After:

```tsx
import {FONTS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtGap} from '../../../ui/format';
import {GapScale} from '../../../ui/GapScale';
import {Panel} from '../../../ui/Panel';
import {biasCopy} from '../biasCopy';
import {verdictFor} from '../verdict';
import {PanelLink} from './PanelLink';
```

The rest of the file, from `interface CalibrationCardProps` on, stays as it is. Its `<GapScale meanGap={meanGap} color={verdict.numberColor} />` now renders the shared track. `COLORS`, `hexRgba`, `ADMIN_RADIUS`, `scalePercent` and `CSSProperties` leave the imports, because only the moved code used them. The edited file passes `eslint --stdin`.

- [ ] **Step 5: Run the tests and see them pass**

Run: `pnpm vitest run src/ui/__tests__/GapScale.test.tsx src/tools/analytics/overview`
Expected: PASS. `GapScale.test.tsx` has `Tests 3 passed (3)`, and R1-8's Overview tests pass unchanged, because the card renders the same markup.

- [ ] **Step 6: Lint and typecheck**

Run: `pnpm lint` and `pnpm typecheck`
Expected: no errors and no warnings.

- [ ] **Step 7: Commit**

Run with the Bash tool, only after the owner approves:
```bash
git add src/ui/GapScale.tsx src/ui/__tests__/GapScale.test.tsx src/tools/analytics/overview/CalibrationCard.tsx
USER_APPROVED=1 git commit -m "refactor(ui): share the over/under gap scale (#24)"
```

### Task R3-6: Card analytics view

**Files** (all under `src/tools/analytics/cards/`):
- Create `CardAnalyticsView.tsx`, `CardHeader.tsx`, `CardKpis.tsx`, `CardCalibrationPanel.tsx`, `VotedPairsPanel.tsx`, `RawVotePanels.tsx`, `EngineViewPanel.tsx`, `cardCharts.ts` and `CardAnalyticsView.stories.tsx`.
- Tests: `__tests__/CardAnalyticsView.test.tsx` and `__tests__/cardCharts.test.ts`. The view test reuses `__tests__/fixtures.ts` and adds a capped engine result, a 15-partner engine result with rules on its pairs, a one-partner engine result, and an Enchanted card.

**Interfaces:**
```ts
export interface Loadable<T> {data: T | null; loading: boolean; error: Error | null}   // what the three hooks return
export interface CardAnalyticsViewProps {
  card: LorcanaCard; analytics: Loadable<VoteAnalytics>; voteLog: Loadable<VoteLog>; synergies: Loadable<CardSynergies>;
  cardName: (id: string) => string;      // getCardById(id)?.fullName ?? id
  partnerLabel: (id: string) => string;  // getCardById(id)?.name ?? id: the short names the network prints
  headerActions?: React.ReactNode;       // R4: "Edit in Card studio", in the card header
}
export function CardAnalyticsView(props: CardAnalyticsViewProps);

// cardCharts.ts: the per-card charts' data, series and tables (pure, unit-tested)
export const SCORE_SERIES: readonly SeriesDef[];      // ≤4 over, 5–6 barNeutral, 7+ under (BAND_LABELS)
export const WEEK_SERIES: readonly SeriesDef[];       // one series: no legend
export const ACCURACY_SERIES: readonly SeriesDef[];   // Too high over, Right barNeutral, Too low under
export function scoreBars(histogram: ScoreHistogram): BarDatum[];
export function scoreTooltip(bar: BarDatum, scored: number): TooltipContent;
export function scoreTable(histogram: ScoreHistogram, cardName: string): ChartTable;
export function modeText(histogram: ScoreHistogram): string | null;   // "most often 7 (9 votes)"; null with no scored votes
export function weekBars(weeks: WeekCount[]): BarDatum[];
export function weekTooltip(bar: BarDatum): TooltipContent;
export function weekTable(weeks: WeekCount[], cardName: string): ChartTable;
export function accuracyParts(accuracy: CardAnswers['accuracy']): SplitPart[];
export function tierParts(summary: EngineSummary): SplitPart[];
export function engineScoreText(score: number): string;   // 8 -> "8", 9.5 -> "9.5"
export function partnerNodes(partners: EnginePartner[], names: {short: (id: string) => string; full: (id: string) => string}): NetworkNode[];
export function networkSubtitle(total: number, capped: boolean): string;   // capped: the count is a floor, "at least"
export function partnerTable(partners: EnginePartner[], fullName: (id: string) => string, cardName: string): ChartTable;
```

**Consumes:**
- From R3: `cardStats`, `engineSummary`, `enginePartners` and `TIER_SERIES`; `NetworkDiagram` and `NETWORK_MAX_NODES` (R3-4b); `SplitBar` (R3-4c); `cardAnalyticsPath` (R3-5).
- From the contract additions: `verdictFor` and `MIN_RULE_VOTES` (R1-8), `GapScale` (R3-5b), and `ChartFrame`'s `view` and `onViewChange` (R1-3b).
- The chart kit (R1-3b): `ChartFrame`, `ChartTable`, `ChartLegend`, `BarChart`, `BarDatum`, `TooltipContent` and `SeriesDef`.
- From R1-9's `activityModel.ts`: `BAND_LABELS`, `scoreBandOf` and `countOf`.
- Existing helpers: `biasCopy`, `gapColor` and `latestVoteDay` (`activityStats.ts`), the end day `votesPerWeek` takes.
- R1 primitives: `Panel`, `KpiCard`, `RawTag`, `BiasBar`, `MeterBar`, `Notice`, the `fmt*` helpers and the `ADMIN_*` tokens.
- From the bridge: `InkIcon`, `RaritySymbol`, `smallImageUrl`, `getStrengthTier` and `LinkButton`.
- `type LorcanaCard` from `inkweave-synergy-engine`, as `CardImagePicker.tsx:2` imports it. It is not in the bridge.
- `Link` from `react-router-dom`.

**What each panel shows** (README §6 with the corrections):
- **Header**
  - A 64×90 thumbnail (`alt=""`), rendered only when `smallImageUrl(card)` is defined. It returns `string | undefined` (`loader.ts:75-77`).
  - The card name in an `<h2>`, plus the version.
  - One `InkIcon` per ink (`ink`, then `ink2` when present), with `decorative={false}`.
  - `card.rarity && <RaritySymbol rarity={card.rarity.toLowerCase()} size={16} />`, plus the `card.rarity` text.
    - `rarity` is optional and title case ("Super Rare", engine `types/card.ts:54`).
    - `RaritySymbol` keys are lowercase (`RaritySymbol.tsx:8-14`).
    - Enchanted has no glyph, so it returns `null` and only the name shows.
  - "Character · cost 3 · inkable", then `<code>#{setNumber}</code>` only when `setNumber != null`.
  - `headerActions`, at the right.
  - A sketch of this header passes `eslint --stdin`.
- **KPIs**
  - Score votes ("on pairs the engine scores").
  - Pairs voted ("partners the engine scores").
  - Mean gap: `valueColor` is `verdict.numberColor` only when `cal.enoughVotes`. The hint is "vote-weighted", or "low n: under 10 score votes".
  - Engine → community, for example "5.6 → 6.0" ("vote-weighted pair averages").
  - Accuracy sentiment: `fmtGap(cal.accuracySentiment)`, hint "vote-weighted, as on Overview". It has no raw tag, because it comes from `pairs[]`.
  - When the card has raw votes, two more KPIs with the raw tag:
    - Distinct voters ("N raw votes").
    - Engine-silent pairs, in the accent colour ("N scored votes, no engine score"). Shown only when vote analytics has also loaded.
- **Calibration for this card**
  - The headline is `The engine {verdict.word === 'well-calibrated' ? 'is well-calibrated' : verdict.word} on this card`.
    - `verdictFor` returns the bare word `'well-calibrated'` (`VerdictHero.tsx:33`). The prototype's word is `'is well-calibrated'` (`dc.html:945`).
  - When `!cal.enoughVotes`, the headline is "Not enough score votes to judge this card", and `GapScale` gets `meanGap={null}` (no dot).
  - Otherwise `GapScale` gets `meanGap={cal.meanGap}` and `color={verdict.numberColor}`.
  - The read line from `cardReadLine` goes between the headline and the scale.
  - A `<table>` of rules: Rule (with the "low n" chip), Bias (`BiasBar`, ±2.5), Gap and Pairs.
- **Voted pairs**
  - A `<table>` with these columns:
    - Paired with: a `Link` to `cardAnalyticsPath(partnerId)`.
    - Engine → community.
    - Gap.
    - Votes.
  - The first 10 rows, then a "Show all N" button.
  - The caption "{shown} of {total} · widest gap first".
  - The single-vote caveat.
  - Without raw votes: "Pairs the engine doesn't score aren't listed; counting them needs raw votes."
- **The charts (R-12, R-13).** Every chart below is built on the chart kit. Each sits in a `ChartFrame` with a Chart / Table toggle and a table twin, and each has a tooltip on hover and focus. The one exception is the split bar (R3-4c), whose legend prints every value.
  - **Where the frames sit.** Community scores and Votes per week each sit in an untitled `Panel`, which is the card. R1-3b's `ChartFrame` draws no surface, and its title names the figure.
  - The network's frame sits flat inside the Engine view panel, with `titleLevel={3}` under the panel's `h2`.
  - **No filter row.** There is no range control here. The card is the scope, and the switcher in the page header is its one filter, above everything it scopes.
- **Community scores** (`CommunityScoresChart`, in `RawVotePanels.tsx`)
  - A `BarChart` of 10 columns, scores 1 to 10, from scored votes only. Quick votes have no score and stay out (the plan's correction).
  - Colour follows admin's score bands, through three series, `SCORE_SERIES` (≤4 `over`, 5–6 `barNeutral`, 7+ `under`). `scoreBars` puts each count in its band's series, so each column is one segment. A `ChartLegend` (`mark="rect"`) names the bands, as it must for more than one series.
  - **Labels.** `capLabels="none"`: no column prints its count. The default, `'extremes'`, labels the last bar, which is meant for the end of a time series. On a score histogram the last bar is score 10, an arbitrary column. The peak goes in the subtitle instead (`modeText`), and the y axis ticks, the tooltip ("Score 7 · 4 votes · 27% of 15 scored votes") and the table carry the rest. The first draft printed a count over every column, which the `dataviz` guidance rules out. Its reason, no values that appear only on hover, is now met by the table view.
  - **The subtitle.** "Average 6.1 from 37 scored votes (plain mean) · most often 7 (9 votes) · engine 5.6 on the pairs it scores". A tie names every tied score ("most often 7 and 8 (4 votes each)"). The engine clause appears only when vote analytics has loaded.
  - Under the frame, in the same `Panel`: "N quick votes without a score left out".
  - **Only quick votes.** A card whose raw votes are all quick votes (R3-3's fixtures include such a pair) has nothing to chart. In place of ten empty columns, the chart is a `Notice`: "No scored votes on this card yet (3 quick votes without a score)."
  - The table: Score, Votes (10 rows).
- **How voters answered**
  - **The accuracy split** (`AccuracySplit`) is a `SplitBar` of Too high / Right / Too low, read left to right, in `over` / `barNeutral` / `under`.
    - These are the gap's own colours: "too high" means the engine over-rates.
    - Its legend prints each share and count, for example "Too high 24% (12)", and "N votes answered the accuracy question" follows it.
    - The `dataviz` form table sends an ordered-scale share (Likert, sentiment) to a diverging stacked bar centred on neutral, and Too high / Right / Too low is that kind of scale. So `AccuracySplit` passes `centerId="right"`: the middle of "right" sits on the tick at 50%, "too high" reaches left and "too low" right, on one scale (R3-4c). A `MeterBar` shows one ratio, not three parts.
  - **"Says it's real", "Would play it" and "Named as carry"** are single ratios against their own denominators, which is the `MeterBar` case. Each is a labelled `MeterBar` (in the accent) beside its text:
    - "Says it's real 72% · of 40".
    - "Would play it 55% · of 38".
    - "Named as carry 40% · 2 of 5 votes that named one card · 'both' 31 · 'neither' 1".
  - "Average difficulty 1.8 / 3 (Easy 4 · Situational 3 · Hard 2)".
- **Votes per week** (`VotesPerWeekChart`)
  - A `BarChart` of the last 12 weeks (the Overview's R-9 window), one series. The window ends at the vote log's newest week, not the card's: `votesPerWeek(cardVotes, 12, latestVoteDay(voteLog.votes))`. `latestVoteDay` returns `string | undefined`, and it is defined whenever the card has raw votes, the only time the chart renders. `emphasisKey` golds the latest week, and the rest stay neutral. A card nobody has voted on lately shows a quiet latest week.
  - `capLabels` stays at `'extremes'`: the latest week and the busiest week print their counts.
  - `xLabelEvery={3}`, with labels from `fmtDay` (the week's Monday, "Sep 28"). The last label always prints.
  - No legend, because it is one series and the title names it.
  - The subtitle: "First vote Jul 2 · last Sep 30 · 9 distinct voters", from `voteSpan` passed through `fmtDay`.
  - The table: Week of, Votes (12 rows).
- **Engine view** (`EngineViewPanel`)
  - `countOf(n, 'synergy partner')` ("1 synergy partner", "142 synergy partners"), prefixed with "At least" when capped, and captioned "A synergy group lists only its top 100 partners."
  - **The tier split.** A `SplitBar` of every partner by tier (`TIER_SERIES`, `unit="partners"`). Its legend prints each tier's share and count.
  - **The network diagram** (R3-4b), in a `ChartFrame` titled "Strongest partners":
    - **Subtitle.** `networkSubtitle(summary.partners, summary.capped)`, for example "The 12 strongest of 142 partners, ranked clockwise from 12 o’clock, the stronger half on the inner ring. Thicker spokes score higher." A capped count reads "The 12 strongest of at least 142 partners", so it agrees with the panel's "At least 142 synergy partners".
    - **Legend.** `<ChartLegend series={TIER_SERIES} mark="line" />`, which mirrors the spokes.
    - **Nodes.** `partnerNodes`: the short name printed, a link to `cardAnalyticsPath(id)`, and the sentence "Mulan - Elite Archer: Strong, engine score 8, from Ramp" as the link's name. The tooltip shows the full name, then the score row ("8", "engine score · Strong", with the tier's line key), then the rules row.
    - **"and K more in the table"** sets the frame's `view` to `'table'`. The frame then focuses the table (contract addition).
    - **Table.** `partnerTable` lists every partner, strongest first: Partner, Score, Tier, Rules ("—" when a pair has no named rule). The tooltip shows the rules, so the table must too.
  - This replaces the first draft's top-5 list, whose scores were printed in tier colours. Text never wears a series colour, and the network names the strongest 12.
  - `CardAnalyticsView` renders `<EngineViewPanel key={card.id} …>`, so switching cards brings the frame back to the chart.
  - The caption "Live engine data from inkweave.ink; vote analytics use the engine as of {fmtDay(generatedAt.slice(0, 10))}."
    - Until vote analytics has loaded, only "Live engine data from inkweave.ink." shows.

The chart helpers, as proposed (`cardCharts.ts`). It passes `pnpm exec eslint --stdin` and typechecked against stubs of the R1-3b and R1-9 names it imports:
```ts
import type {BarDatum} from '../../../charts/BarChart';
import type {ChartTable} from '../../../charts/ChartFrame';
import type {TooltipContent, TooltipRow} from '../../../charts/ChartTooltip';
import {NETWORK_MAX_NODES, type NetworkNode} from '../../../charts/NetworkDiagram';
import {ONE_RING_MAX} from '../../../charts/networkLayout';
import type {SeriesDef} from '../../../charts/series';
import type {SplitPart} from '../../../charts/SplitBar';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {fmtDay, fmtInt, fmtScore} from '../../../ui/format';
import {BAND_LABELS, countOf, scoreBandOf} from '../activity/activityModel';
import {cardAnalyticsPath} from './cardRoutes';
import type {CardAnswers, ScoreHistogram, WeekCount} from './cardStats';
import {TIER_ORDER, TIER_SERIES, type EnginePartner, type EngineSummary} from './engineView';

/**
 * The histogram's colours: admin's score bands (ScorePill, Vote activity),
 * lowest first, as the x axis reads. The bands repeat the x position on
 * purpose: they tie this chart to every other score in admin.
 */
export const SCORE_SERIES: readonly SeriesDef[] = [
  {id: 'low', label: BAND_LABELS.low, color: ADMIN_COLORS.over},
  {id: 'mid', label: BAND_LABELS.mid, color: ADMIN_COLORS.barNeutral},
  {id: 'high', label: BAND_LABELS.high, color: ADMIN_COLORS.under},
];

/** Votes per week is one series, so it takes no legend; BarChart's emphasisKey golds the latest week. */
export const WEEK_SERIES: readonly SeriesDef[] = [{id: 'votes', label: 'Votes', color: ADMIN_COLORS.barNeutral}];

/** The accuracy answers, as the voter reads them: the engine's score is too high, right, or too low. */
export const ACCURACY_SERIES: readonly SeriesDef[] = [
  {id: 'tooHigh', label: 'Too high', color: ADMIN_COLORS.over},
  {id: 'right', label: 'Right', color: ADMIN_COLORS.barNeutral},
  {id: 'tooLow', label: 'Too low', color: ADMIN_COLORS.under},
];

/** One column per score, 1 to 10. Each count sits in its band's series, so every stack is one segment. */
export function scoreBars(histogram: ScoreHistogram): BarDatum[] {
  return histogram.counts.map((count, i) => {
    const score = String(i + 1);
    return {key: score, label: score, values: {low: 0, mid: 0, high: 0, [scoreBandOf(i + 1)]: count}};
  });
}

/** A column's tooltip: its votes, and their share of the card's scored votes. */
export function scoreTooltip(bar: BarDatum, scored: number): TooltipContent {
  const votes = Object.values(bar.values).reduce((sum, n) => sum + n, 0);
  const share = scored > 0 ? Math.round((votes / scored) * 100) : 0;
  return {
    title: `Score ${bar.label}`,
    rows: [
      {value: fmtInt(votes), label: votes === 1 ? 'vote' : 'votes'},
      {value: `${share}%`, label: `of ${fmtInt(scored)} scored votes`},
    ],
  };
}

export function scoreTable(histogram: ScoreHistogram, cardName: string): ChartTable {
  return {
    caption: `Community scores for ${cardName}, from scored votes only`,
    columns: ['Score', 'Votes'],
    rows: histogram.counts.map((count, i) => [String(i + 1), fmtInt(count)]),
  };
}

/**
 * The histogram's peak, for its subtitle (the columns print no counts): "most
 * often 7 (9 votes)", every tied score on a tie ("most often 7 and 8 (4 votes
 * each)"). Null with no scored votes.
 */
export function modeText(histogram: ScoreHistogram): string | null {
  const top = Math.max(0, ...histogram.counts);
  if (top === 0) return null;
  const scores = histogram.counts.flatMap((count, i) => (count === top ? [String(i + 1)] : []));
  const list = scores.length === 1 ? scores[0] : `${scores.slice(0, -1).join(', ')} and ${scores.at(-1)}`;
  return `most often ${list} (${countOf(top, 'vote')}${scores.length > 1 ? ' each' : ''})`;
}

/** One column per week, labelled by its Monday. */
export function weekBars(weeks: WeekCount[]): BarDatum[] {
  return weeks.map((w) => ({key: w.week, label: fmtDay(w.week), values: {votes: w.votes}}));
}

export function weekTooltip(bar: BarDatum): TooltipContent {
  const votes = bar.values.votes ?? 0;
  return {title: `Week of ${bar.label}`, rows: [{value: fmtInt(votes), label: votes === 1 ? 'vote' : 'votes'}]};
}

export function weekTable(weeks: WeekCount[], cardName: string): ChartTable {
  return {
    caption: `Votes per week on ${cardName}`,
    columns: ['Week of', 'Votes'],
    rows: weeks.map((w) => [fmtDay(w.week), fmtInt(w.votes)]),
  };
}

export function accuracyParts(accuracy: CardAnswers['accuracy']): SplitPart[] {
  return [
    {id: 'tooHigh', value: accuracy.tooHigh},
    {id: 'right', value: accuracy.right},
    {id: 'tooLow', value: accuracy.tooLow},
  ];
}

export function tierParts(summary: EngineSummary): SplitPart[] {
  return TIER_ORDER.map((tier) => ({id: tier, value: summary.tiers[tier]}));
}

/** An engine score: the rules score in whole points, so "8"; anything else keeps one place, so "9.5". */
export function engineScoreText(score: number): string {
  return fmtScore(score, Number.isInteger(score) ? 0 : 1);
}

/** The sentence a partner's link reads and its tooltip shows: "Mulan - Elite Archer: Strong, engine score 8, from Ramp". */
function partnerSentence(name: string, partner: EnginePartner): string {
  const rules = partner.rules.length > 0 ? `, from ${partner.rules.join(', ')}` : '';
  return `${name}: ${partner.tier}, engine score ${engineScoreText(partner.score)}${rules}`;
}

/**
 * The network diagram's nodes, strongest first: each partner's printed name
 * (short), its link, its spoke (score, tier) and its tooltip, which names the
 * rules that connect the pair.
 */
export function partnerNodes(
  partners: EnginePartner[],
  names: {short: (id: string) => string; full: (id: string) => string},
): NetworkNode[] {
  return partners.map((partner) => {
    const name = names.full(partner.id);
    const tierColor = TIER_SERIES.find((s) => s.id === partner.tier)?.color;
    const rows: TooltipRow[] = [{value: engineScoreText(partner.score), label: `engine score · ${partner.tier}`, color: tierColor}];
    if (partner.rules.length > 0) {
      rows.push({value: partner.rules.join(', '), label: partner.rules.length === 1 ? 'rule' : 'rules'});
    }
    return {
      id: partner.id,
      label: names.short(partner.id),
      href: cardAnalyticsPath(partner.id),
      value: partner.score,
      seriesId: partner.tier,
      ariaLabel: partnerSentence(name, partner),
      tooltip: {title: name, rows},
    };
  });
}

/**
 * The diagram's subtitle: which partners it draws and how to read it. A capped
 * count (a synergy group cut at ENGINE_GROUP_CAP) is a floor, so it reads
 * "at least", as the Engine view's count does.
 */
export function networkSubtitle(total: number, capped: boolean): string {
  const drawn = Math.min(total, NETWORK_MAX_NODES);
  const which =
    drawn === total ? 'Every partner' : `The ${drawn} strongest of ${capped ? 'at least ' : ''}${fmtInt(total)} partners`;
  const rings = drawn > ONE_RING_MAX ? ', the stronger half on the inner ring' : '';
  return `${which}, ranked clockwise from 12 o’clock${rings}. Thicker spokes score higher.`;
}

/** The diagram's table view: every partner, not just the drawn ones, with everything the tooltip shows. */
export function partnerTable(partners: EnginePartner[], fullName: (id: string) => string, cardName: string): ChartTable {
  return {
    caption: `Synergy partners of ${cardName}, strongest first`,
    columns: ['Partner', 'Score', 'Tier', 'Rules'],
    rows: partners.map((p) => [fullName(p.id), engineScoreText(p.score), p.tier, p.rules.join(', ') || '—']),
  };
}
```

The two raw-vote charts and the accuracy split, as they sit in `RawVotePanels.tsx` (the "How voters answered" panel round the split, the states and the rate rows are left out; each chart brings its own untitled `Panel`). It passes `pnpm exec eslint --stdin`:
```tsx
import {SPACING} from '../../../app-bridge';
import {BarChart} from '../../../charts/BarChart';
import {ChartFrame} from '../../../charts/ChartFrame';
import {ChartLegend} from '../../../charts/ChartLegend';
import {SplitBar} from '../../../charts/SplitBar';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtDay, fmtInt, fmtScore} from '../../../ui/format';
import {Notice} from '../../../ui/Notice';
import {Panel} from '../../../ui/Panel';
import {countOf} from '../activity/activityModel';
import {
  ACCURACY_SERIES,
  SCORE_SERIES,
  WEEK_SERIES,
  accuracyParts,
  modeText,
  scoreBars,
  scoreTable,
  scoreTooltip,
  weekBars,
  weekTable,
  weekTooltip,
} from './cardCharts';
import type {CardAnswers, ScoreHistogram, VoteSpan, WeekCount} from './cardStats';

const CAPTION: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted};

/**
 * Scores 1–10 from raw votes; quick votes have no score and stay out (counted
 * under the chart, in the same card). The columns print no counts: a score
 * histogram has no "last" bar, so the subtitle names the peak instead.
 * ChartFrame draws no surface, so the untitled Panel is the card.
 */
export function CommunityScoresChart({histogram, engineAvg, cardName}: {histogram: ScoreHistogram; engineAvg: number | null; cardName: string}) {
  if (histogram.scored === 0) {
    return <Notice>No scored votes on this card yet ({countOf(histogram.unscored, 'quick vote')} without a score).</Notice>;
  }
  const mode = modeText(histogram);
  return (
    <Panel>
      <ChartFrame
        title="Community scores"
        subtitle={
          <>
            Average {fmtScore(histogram.mean)} from {countOf(histogram.scored, 'scored vote')} (plain mean)
            {mode && <> · {mode}</>}
            {engineAvg != null && <> · engine {fmtScore(engineAvg)} on the pairs it scores</>}
          </>
        }
        legend={<ChartLegend series={SCORE_SERIES} mark="rect" />}
        table={scoreTable(histogram, cardName)}>
        <BarChart
          data={scoreBars(histogram)}
          series={SCORE_SERIES}
          ariaLabel="Community scores from 1 to 10"
          valueFormat={fmtInt}
          capLabels="none"
          tooltip={(bar) => scoreTooltip(bar, histogram.scored)}
        />
      </ChartFrame>
      {histogram.unscored > 0 && <p style={CAPTION}>{countOf(histogram.unscored, 'quick vote')} without a score left out</p>}
    </Panel>
  );
}

/** The last 12 weeks, the latest in the accent, in an untitled Panel: the frame draws no surface. */
export function VotesPerWeekChart({weeks, span, cardName}: {weeks: WeekCount[]; span: VoteSpan | null; cardName: string}) {
  return (
    <Panel>
      <ChartFrame
        title="Votes per week"
        subtitle={
          span
            ? `First vote ${fmtDay(span.first)} · last ${fmtDay(span.last)} · ${countOf(span.voters, 'distinct voter')}`
            : undefined
        }
        table={weekTable(weeks, cardName)}>
        <BarChart
          data={weekBars(weeks)}
          series={WEEK_SERIES}
          ariaLabel="Votes per week"
          emphasisKey={weeks.at(-1)?.week}
          xLabelEvery={3}
          tooltip={weekTooltip}
        />
      </ChartFrame>
    </Panel>
  );
}

/**
 * The accuracy question's three answers, an ordered scale, as one diverging
 * split bar centred on "right"; its legend prints each share and count.
 */
export function AccuracySplit({accuracy}: {accuracy: CardAnswers['accuracy']}) {
  return (
    <div style={{display: 'grid', gap: SPACING.xs}}>
      <SplitBar
        parts={accuracyParts(accuracy)}
        series={ACCURACY_SERIES}
        ariaLabel="Is the engine's score right?"
        unit="answers"
        centerId="right"
      />
      <p style={CAPTION}>{countOf(accuracy.answered, 'vote')} answered the accuracy question</p>
    </div>
  );
}
```

`EngineViewPanel.tsx`, as proposed. It passes `pnpm exec eslint --stdin`, and its states follow the table under "States":
```tsx
import {useState} from 'react';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {SPACING} from '../../../app-bridge';
import {ChartFrame, type ChartView} from '../../../charts/ChartFrame';
import {ChartLegend} from '../../../charts/ChartLegend';
import {NetworkDiagram} from '../../../charts/NetworkDiagram';
import {SplitBar} from '../../../charts/SplitBar';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtDay} from '../../../ui/format';
import {Notice} from '../../../ui/Notice';
import {Panel} from '../../../ui/Panel';
import {countOf} from '../activity/activityModel';
import {networkSubtitle, partnerNodes, partnerTable, tierParts} from './cardCharts';
import {TIER_SERIES, enginePartners, engineSummary, type CardSynergies} from './engineView';

interface EngineViewPanelProps {
  card: LorcanaCard;
  synergies: {data: CardSynergies | null; loading: boolean; error: Error | null};
  /** getCardById(id)?.fullName ?? id: the tooltip, the link name and the table. */
  cardName: (id: string) => string;
  /** getCardById(id)?.name ?? id: the name the diagram prints. */
  partnerLabel: (id: string) => string;
  /** vote analytics' generatedAt day, or null until vote analytics has loaded. */
  analyticsAsOf: string | null;
}

const CAPTION: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted};

/**
 * The engine's view of the card, from its live synergy file: how many
 * partners, how they split by strength tier, and the strongest twelve as a
 * network. "and K more" opens the diagram's table, which lists every partner.
 * CardAnalyticsView keys this panel by card id, so a new card starts on the chart.
 */
export function EngineViewPanel({card, synergies, cardName, partnerLabel, analyticsAsOf}: EngineViewPanelProps) {
  const [view, setView] = useState<ChartView>('chart');
  const source = analyticsAsOf
    ? `Live engine data from inkweave.ink; vote analytics use the engine as of ${fmtDay(analyticsAsOf)}.`
    : 'Live engine data from inkweave.ink.';
  const data = synergies.data;
  const partners = data ? enginePartners(data) : [];

  let body: React.ReactNode;
  if (synergies.loading) {
    body = <Notice>Loading engine data...</Notice>;
  } else if (synergies.error) {
    body = <Notice tone="error">Could not load this card’s synergies ({synergies.error.message})</Notice>;
  } else if (!data || partners.length === 0) {
    body = (
      <Notice>
        The engine finds no synergies for this card (or its synergy file could not be read). A card revealed after the
        app’s last deploy has no synergy file yet.
      </Notice>
    );
  } else {
    const summary = engineSummary(data);
    body = (
      <>
        <p style={{margin: 0, fontSize: ADMIN_TYPE.emphasis, color: ADMIN_COLORS.text}}>
          {summary.capped ? 'At least ' : ''}
          {countOf(summary.partners, 'synergy partner')}
        </p>
        {summary.capped && <p style={CAPTION}>A synergy group lists only its top 100 partners.</p>}
        <SplitBar parts={tierParts(summary)} series={TIER_SERIES} ariaLabel="Partners by strength tier" unit="partners" />
        <ChartFrame
          title="Strongest partners"
          titleLevel={3}
          subtitle={networkSubtitle(summary.partners, summary.capped)}
          legend={<ChartLegend series={TIER_SERIES} mark="line" />}
          table={partnerTable(partners, cardName, card.fullName)}
          view={view}
          onViewChange={setView}>
          <NetworkDiagram
            center={{label: card.name}}
            nodes={partnerNodes(partners, {short: partnerLabel, full: cardName})}
            series={TIER_SERIES}
            ariaLabel={`Strongest synergy partners of ${card.fullName}`}
            onShowAll={() => setView('table')}
          />
        </ChartFrame>
      </>
    );
  }

  return (
    <Panel title="Engine view">
      <div style={{display: 'grid', gap: SPACING.md}}>
        {body}
        <p style={CAPTION}>{source}</p>
      </div>
    </Panel>
  );
}
```

**Tests:**
- KPI values, including the true minus sign (U+2212) in the gap and in the Engine → community text.
- Accuracy sentiment shows the vote-weighted value with no raw tag, and it still shows when the vote log is empty.
- Headlines:
  - A −0.2 card reads "The engine is well-calibrated on this card".
  - A −0.8 card reads "The engine runs generous on this card".
  - A 4-vote card reads "Not enough score votes to judge this card", with the "low n" hint.
- Rules: sort order and the "low n" chip.
- Voted pairs:
  - 10 rows, then "Show all".
  - Partner links point to `/cards/<id>`.
  - The no-raw caption.
- An empty vote log shows the raw notice and no raw KPIs. A card missing from the log shows "No raw votes on this card yet."
- With the vote log loaded and vote analytics failed:
  - There is no Engine-silent KPI.
  - The histogram caption has no "engine" clause.
  - The engine caption has no "as of" clause.
- Community scores:
  - The subtitle has the plain mean, the scored count and the peak ("most often 7 (9 votes)"). The unscored caption counts the quick votes.
  - No column prints a count (`capLabels="none"`).
  - The legend names "≤4", "5–6" and "7+".
  - The Table view (the frame's toggle) lists 10 rows of Score and Votes, matching the fixture's counts. A quick vote is in no row.
  - A card with only quick votes shows "No scored votes on this card yet (N quick votes without a score)." and no chart.
- How voters answered:
  - The accuracy legend reads "Too high 24% (12)", "Right 60% (30)" and "Too low 16% (8)" as list items of "Is the engine's score right?".
  - The accuracy bar is centred: it has the `[data-center-tick]`, and the tier split has none.
  - The carry denominator text, and difficulty "/ 3".
  - "Says it's real" and "Would play it" are meters named with their share.
- Votes per week:
  - The Table view lists 12 weeks, "Week of" each Monday through `fmtDay`, the newest last. The newest is the vote log's newest week, even for a card whose last vote is older.
  - The subtitle reads "First vote … · last … · N distinct voters".
  - There is no legend.
- Engine view:
  - "At least" when capped, plus the hedged empty copy and the error and loading copy.
  - A one-partner card reads "1 synergy partner".
  - With the capped fixture, the network's subtitle reads "The 12 strongest of at least …", matching the panel's "At least …".
  - The tier split's legend counts every partner, for example "Strong ≥7 29% (41)".
  - With the 15-partner fixture, the "Strongest synergy partners of …" list holds 12 links, strongest first.
    - Each is named by its sentence ("…: Strong, engine score 8, from Ramp").
    - Each points to `/cards/<id>`.
  - Focusing a partner link shows its tooltip with the rules.
  - "and 3 more in the table" switches the frame to its table, which then has focus. The table has 15 rows and the columns Partner, Score, Tier and Rules, with "—" for a pair without rules.
  - A tier's colour shows only on marks: no partner name or score carries `TIER_COLORS` as its text colour.
  - Switching to another card (a rerender with a new `card`) shows the chart again, not the table.
- With vote analytics failing, the header and the engine view still render.
- Vote-log loading and error copy.
- An Enchanted card renders its rarity name and no rarity image.
- `cardCharts` (unit):
  - `scoreBars` puts each count in one band only: 4 → `low`, 6 → `mid`, 7 → `high`.
  - `scoreTooltip` gives the share of scored votes ("27%" for 4 of 15) and "1 vote" in the singular.
  - `weekBars` labels a column by its Monday through `fmtDay`.
  - `engineScoreText`: 8 → "8", 9.5 → "9.5".
  - `partnerNodes`:
    - The label is the short name, `href` is `/cards/<id>`, and `seriesId` is the tier.
    - The rules row reads "rule" for one and "rules" for several, and is left out when there are none.
  - `networkSubtitle`:
    - `(5, false)`: "Every partner, ranked clockwise from 12 o’clock. Thicker spokes score higher."
    - `(142, false)`: "The 12 strongest of 142 partners, ranked clockwise from 12 o’clock, the stronger half on the inner ring. Thicker spokes score higher."
    - `(142, true)`: "The 12 strongest of at least 142 partners, ranked clockwise from 12 o’clock, the stronger half on the inner ring. Thicker spokes score higher."
  - `modeText`: one peak gives "most often 7 (9 votes)", a single vote "most often 3 (1 vote)", a tie "most often 7 and 8 (4 votes each)", three tied "most often 6, 7 and 8 (3 votes each)", and no scored votes `null`.
  - `partnerTable` lists every partner, past the twelve drawn.

**Stories:** Default, LowN (an Enchanted card, so no rarity glyph), NoRawVotes, NoVotes, AnalyticsNotGenerated, EngineCapped (the network with "and K more"), EngineFewPartners (one ring), EngineEmpty.

### Task R3-7: Route, page and navigation

**Files:**
- Create `src/tools/analytics/cards/CardAnalyticsPage.tsx`.
- Modify:
  - `src/router.tsx`: add `{path: 'cards/:cardId?', element: <CardAnalyticsPage />}`.
  - `src/shell/nav.ts`: add the Card analytics item. R1-6's `navItemFor` already matches a path or a path under it (R1-6 Step 3), so add a `/cards/2983` → `cards` case to its test.
  - `src/router.test.tsx`.
- Test: `__tests__/CardAnalyticsPage.test.tsx`.

**Interfaces:** `export function CardAnalyticsPage();`

**PageLayout props:**
- `title="Card analytics"`.
- `subtitle="Votes, calibration and engine data for one card"`.
- `meta`: "Data as of `<code>YYYY-MM-DD</code>`" from `generatedAt`. It is omitted until vote analytics has loaded.
- `actions={<CardSwitcher />}`.
- No `writes`, so there's no branch notice.

**How it works:**
- It reads the vote files through R1's cache. The setup file resets the cache before every test (R1-5).
- It passes `CardAnalyticsView` `cardName = (id) => getCardById(id)?.fullName ?? id` and `partnerLabel = (id) => getCardById(id)?.name ?? id`.
- One effect, keyed on the id, the card, `isLoading` and `error`, handles storage:
  - It calls `writeLastCard` once the id resolves to a card.
  - It calls `forgetLastCard(id)` only when `!isLoading && error == null && getCardById(id) === undefined`.

**Tests:**
- Page (the bridge mock and the hygiene under "Test isolation"):
  - With an id stored, `/cards` redirects. Check the memory router's location.
  - On a first visit, `/cards` shows the "Pick a card" prompt.
  - A known id is saved as last viewed.
  - An unknown id shows "No card has the id 999999" and clears that id from storage.
  - The stored id survives on `/cards/<id>` while the card list is loading (`isLoading: true`) and when it fails (`error` set, empty `cards`).
  - A card-list error shows Retry, which calls `retryLoad`.
  - With vote analytics not generated, the header and the engine view still render, and the header has no "Data as of" meta.
- Router:
  - `/cards/2983` shows the h1 "Card analytics".
  - The "Card analytics" nav link has `href="/cards"` and is `aria-current="page"` on `/cards/2983`.
  - The Overview link is not current on `/cards/2983`.

### Open questions

1. **First visit:** show an empty "Pick a card" state (planned), or open the card with the most score votes?
2. **An unknown id that still has votes** (a card rotated out of Core): show only the not-found message (planned), or also show the vote sections using the names stored in the analytics files?
3. **Search behaviour.** `useAutocomplete` searches names only (no ids) and needs two letters. Admin's `filterCards` also matches ids and ranks prefix matches first. The hook doesn't report when a search has settled, so a "No cards match" line would flash for 150 ms after the second letter. The plan shows no such line, and an empty list just stays closed.
4. **Engine-silent pairs:** keep them as a raw KPI (planned), or show them as a caption only?
5. **Links into `/cards` from other pages** (Activity pair names, Calibration pairs, Overview's latest votes) are cheap with `cardAnalyticsPath`. They aren't in R3 unless the owner wants them.
6. **Weekly window:** is 12 weeks right for a single card, or should the chart show the card's whole history?
7. **Network size.** The diagram draws the strongest 12 partners on two rings (planned), and the table lists the rest. Twelve names fit a 340px plot at panel width. A larger number needs smaller type or a third ring.
8. **The hub's name.** The centre prints the card's name (planned). Should it go unlabelled, since the page header already names the card? That would also free the busiest spot for the inner names.
9. **The split bar's table.** R-12 asks for a Chart/Table toggle on every chart. The split bar has none, because its legend prints every share and count (planned). Should it get a `ChartFrame` anyway?
10. **Histogram colours.** The columns take admin's score bands (planned), which repeats the x position as colour so that this chart reads like Vote activity and `ScorePill`. Should they be one neutral series instead, with the mean marked?
11. **Tier split and network together.** The Engine view keeps both (planned). The split counts every partner, and the network shows only the strongest 12. Should the split go, with its counts moved into the network's legend?
12. **The network's place.** The network's frame sits flat inside the Engine view panel, under the count and the tier split (planned). Should the network stand beside the panel instead, in an untitled `Panel` of its own?

**Out of scope: per-card web stats** (the README §6 follow-up). That work would:
- add card-id breakdowns to `EVENT_QUERIES` in `scripts/lib/vercelAnalytics.mjs`
- query `card_printing_view`
- work within Vercel's top-N and 62-day limits

It gets its own issue later. R3 changes no pipeline and logs no vote counts.

<!--
Review notes, 2026-10-01: what was applied differently from the note, or not at all, and why.

- Note 2 (ChartFrame view / onViewChange). The note's premise is wrong: R1-03b-chart-kit.md exists (Task R1-3b, 3,539 lines). Its substance holds, though: R1-3b's ChartFrame (Step 15) has defaultView but neither prop, and keeps ChartView private. So the fallback owner was applied at first, with R3-6 carrying the exact before/after edits and the two tests. One addition: the focus hand-off fires only on a chart-to-table switch, never on mount, because a frame that opens on its table would otherwise take focus at page load. R1-3b has since taken the props, the `ChartView` export, the focus hand-off and both tests word for word (Steps 13 and 15), so the fallback block is gone from R3-6 and R3 uses R1-3b's frame as is.
- Note 6 (24px hit targets). Applied, except the row's `gap: SPACING.xxs`. The 2px surface gap is 1px of padding inside each target instead. A flex gap leaves a 2px dead strip between targets, and the dataviz rule says a mark's hit area includes its surface gap. It also puts the centred bar's middle part off the 50% tick (note 5) whenever the two arms hold different numbers of parts.
- Note 14 (first-paint overflow). Applied in another form. With `overflow: hidden` on the plot div itself, "nothing is clipped" does not hold:
  - ChartTooltip renders inside the plot div, and its maxWidth floor (140px) exceeds half of any plot narrower than about 304px, so a tooltip at 12 o'clock would be cut off on a phone.
  - The 28px margin holds for node targets only. A printed name may touch the plot's edge, and a focus ring reaches 4px past its link.
  So the SVG and the links sit in an absolute, inset-0, overflow-hidden layer, the tooltip stays outside it, and names keep 4px (FOCUS_REACH) clear of the edge. The absolute layer also fixes something the note did not name: as a grid item with min-width auto, the plot div was held at the SVG's 560px width, so its ResizeObserver would report 560 and the diagram would never narrow.
- Note 15, first bullet (where the frames sit). Applied: R1-3b's ChartFrame draws no surface, so Community scores and Votes per week each sit in an untitled Panel, which is the card, and the network's frame sits flat inside the Engine view panel with titleLevel={3} under the panel's h2. Open question 12 asks whether the network should stand beside the panel. The second bullet (navItemFor) is applied as written.
- Note 16 (histogram cap labels). Took the note's first option: capLabels="none", with the peak printed in the subtitle by a new cardCharts helper, modeText. A 'max' cap label would have been a change to R1-3b's BarChart contract.
- Notes 1, 3, 4, 5, 7 to 13 and 17 are applied as written. The changed code blocks were re-linted through eslint's stdin mode. The R3-4b, R3-4c, R3-5b and ChartFrame blocks were also typechecked and their tests run (46 passing) in a scratch copy, against R1-3b's written ChartTooltip, ChartFrame and linear, R1-3's SegmentedControl, R1-8's verdict.ts and stubbed tokens.
-->
