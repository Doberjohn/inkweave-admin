## Phase R3: Card analytics

> Part of [R: Admin redesign](../R-redesign.md). Read its decisions (R-28 to R-56 settle this phase's questions), corrections to the spec, global constraints, shared interfaces, "R1 as built" and "R2 as built" first.

> **Re-base notes (2026-10-06).** The outline was written on 2026-10-01 against the planned R1 code. R1 and R2 are merged (`main` @ `aea40b4`, PR #28 included) and the pin is still `bc877e1`. App `master` (`cc8e7e1`) moves nothing R3 bridges. The 2026-10-06 audit (one pass per outline task, plus the open questions) fed decisions R-28 to R-56, which the owner took as recommended. Changes:
> 1. **Decisions.** The outline's twelve open questions are settled (R-28 to R-42), and the audit's own questions too (R-43 to R-56). "Decided (2026-10-06)" below names each one's owning task. Four of them change interfaces: R-36 (the weekly window), R-37 (partner order), R-40 (label widths) and R-42 (the split bar).
> 2. **What R1 and R2 already built.** `verdict.ts`, `MIN_RULE_VOTES` and ChartFrame's controlled `view` exist, so R3 only imports them. `LOW_N` is an alias of `MIN_RULE_VOTES` (`calibrationModel.ts:15`). `GapScale` is still private to `CalibrationCard.tsx:24-53`. R2 shipped helpers R3 reuses, several of them private to `calibration/` today: `sharePercent`, `VoteSpan`, the focus handoff, `twoUp`, `LowNTag`, and `DataAsOf` in four copies. New task **R3-1a** moves them where both phases can import them, with no behaviour change.
> 3. **Contract.**
>    - `GapScale` moves to `src/tools/analytics/GapScale.tsx`, not `src/ui` (R-53). `Verdict` gains `phrase`, which fixes the Overview's "The engine well-calibrated" (R-50).
>    - `cardRoutes.ts` goes. `cardsHref` joins `calibrationHref` in `nav.ts` (R-33), and storage moves to `cards/lastCard.ts` under `inkweave-admin.last-card` (R-28).
>    - The kit `SplitBar` and `sharesOf` leave the plan. A `src/ui` `SplitMeter` with a printed legend replaces them (R-42), and shares print through `sharePercent` (R-43).
>    - `networkLayout` takes a `Size` object and the kit's `PlotPoint`. The hub has no name (R-38), and label widths come from `textWidth` (R-40). Each node link's name is `tooltipText` (R-41), so `NetworkNode.ariaLabel` goes.
>    - PageLayout gains `documentTitle` (R-51).
>    - The bridge adds only what R3 uses (R-55).
>    - `PairStat` gains nothing, because the sentiment comes from raw answers (R-32).
>    - `CardAnalyticsView` takes `getCardById` in place of the outline's `cardName` and `partnerLabel`. The page then passes the context's lookup straight through, with no `?.` or `??` of its own (R3-7's complexity). The view gets R-31's "is this partner listed?" and R-33's "link only resolved ids" from the same lookup.
> 4. **Sources.** Accuracy sentiment comes from the vote log (R-32). Engine-silent pairs are a caption split in two (R-31), not a KPI. Votes per week covers the whole log (R-36). Every `scripts/lib/voteAnalytics.mjs` line reference moved by about 20 lines, and each is re-cited below. The calibration identity holds to float precision, not just ±0.005, while engine scores are whole.
> 5. **Modules and fixtures.** The raw-vote side is now its own module, `cardVotes.ts`. Sharing a module with `cardStats.ts` put it at about 43% primitive arguments, against a 30% gate. A bound `CardVote` takes the card id out of every signature. Fixtures live in a plain module, `cards/cardFixtures.ts`, because a story can't import a test file (`chartFixtures.ts:5-12`). A parity test runs the per-card identity through the precompute's own transforms.
> 6. **States and focus.**
>    - The not-found copy names all three causes (R-29).
>    - The failed card list gets a Notice with a neutral `CtaButton` "Retry", and so does a failed synergy fetch (R-45).
>    - A pure `cardPageState` sets the state order.
>    - Focus follows R2's rule and moves only when its control disappears (R-48).
>    - The whole view is keyed by card id (R-46).
>    - The error copy is quoted from today's pages (`OverviewView.tsx:34`, `ActivityView.tsx:134`), since `AnalyticsPage.tsx` is gone.
>    - The raw-votes notice has its copy spelled out, since R2-7 retired `RawVotesNotice`.
> 7. **Test isolation.**
>    - The shared bridge mock resets its mocks in a block-bodied `beforeEach`, as `useLiveTuning.test.ts:17-20` does.
>    - Storage tests use one `vi.stubGlobal`.
>    - The switcher takes `cards` as a prop, so its tests need no bridge mock.
>    - The text-measurement patch goes with R-40.
> 8. **Tasks.**
>    - R3-1a is new.
>    - R3-5b moves up, since it depends on nothing.
>    - R3-3 splits off into `cardVotes.ts`.
>    - R3-6 splits into 6a, 6b and 6c, each green with its own stories.
>    - R3-8 (links into `/cards`, R-33) and R3-9 (docs and the real-data check) are new.
>    - The outline's ids are kept, so the audit files still map.
> 9. **Conventions.** The branch is `feature/24-redesign-r3`, and the plan is committed first (R-56). Each task has its commit message. CodeScene's limits are written in from the start, because the server gate failed R1 and R2 on functions the local tool passed.
> 10. **Verified** in `scratchpad/r3-rebase/sandbox-header`, a copy of `src/` and the configs at `aea40b4`, with `node_modules` and `upstream/` junctioned in and Vite's cache in the sandbox:
>     - **Bridge.** Contract addition 5's lines typecheck (`tsc -p tsconfig.app.json`, exit 0). A probe test checks the tier boundaries at 9.5, 9.49 and 3.99 against `TIER_COLORS`, and that `fetchCardSynergies` doesn't cache a rejection: the second call fetches again.
>     - **The shared bridge mock** under "Test isolation" keeps the real bridge, swaps the two names, and starts every test with no calls.
>     - **Storage.** The `lastCard.ts` sketch and its `vi.stubGlobal('localStorage', …)` test pass: 10 tests in 3 files.
>     - **Shell.** The `documentTitle` and `cardsHref` sketches (contract additions 6 and 7) pass the existing `src/shell` and `router.test.tsx` suites, 95 of 95 tests. The review's revision of addition 6 (`useTabTitle({title, documentTitle})`, the doc comment included) passes `PageLayout.test.tsx` and `router.test.tsx`, 47 of 47 (`scratchpad/r3-rebase/sandbox-header-fix`). The whole file passes `eslint --max-warnings 0 --stdin` in the repo. `tsc -p tsconfig.app.json` reports nothing in it; with addition 4's narrowed types in the same sandbox, it reports exactly addition 4's three errors.
>     - **Lint and Code Health.** Every block passes `pnpm exec eslint --max-warnings 0 --stdin` in the repo. CodeScene (local MCP 1.1.3) scores `PageLayout.tsx` and `nav.ts` with the sketches at 10.0.
>     - **The real-data command** under R3-9 prints `true` on matching files and `false` on a mismatch (checked on hand-made files).

**Contract additions** (to the main plan's "Shared interfaces (R1)" and "Chart kit (R1-3b)". They add names and rename nothing. Every R3 task builds against them. A task that has to change one says so in its own re-base notes. The plan commit records them in the main plan, as R2's did (87a738f), and R3-9 corrects any line the code changed and lists it under Departures.)

1. **What R3 imports from R1 and R2, unchanged.**
    ```ts
    // src/tools/analytics/verdict.ts (R1-8): CALIBRATION_BAND = 0.5, SCALE_CLAMP = 1.5, verdictFor, scalePercent
    // src/tools/analytics/overview/overviewStats.ts:11 (R1-8)
    export const MIN_RULE_VOTES = 10;   // calibrationModel.ts:15's LOW_N is an alias of it
    // src/charts/ChartFrame.tsx (R1-3b, :105-108): the controlled view the network's "and K more in the table" drives
    view?: ChartView; onViewChange?: (view: ChartView) => void;
    // src/charts/scale.ts:123-130: textWidth(text, fontSize), 0.6em a character (R-40)
    // src/charts/lineLayout.ts:43-46, :99-100: PlotPoint {x, y}, DOT_RADIUS = 4, RING = 2
    // src/charts/series.ts:88-91: tooltipText(content), a mark's accessible name (R-41)
    // src/tools/analytics/activity/activityModel.ts: countOf (:61), scoreBandOf (:66), votesInRange (:119),
    //   activityWindow (:131), weeklyStacks (:179); activityChart.ts: BAND_SERIES (:35), bucketTitle (:77), partialWeeks (:90)
    // src/tools/analytics/calibration/chartData.ts: scoreText (:55)
    // src/tools/analytics/gapColor.ts: gapColor (:13); src/tools/analytics/biasCopy.ts: biasCopy (:16)
    // src/tools/analytics/useVoteAnalytics.ts:5-9 and useVoteLog.ts:5-9: UseVoteAnalyticsReturn, UseVoteLogReturn
    ```
    - `cards/` imports `MIN_RULE_VOTES` from `'../overview/overviewStats'`, never `LOW_N` from `calibrationModel.ts`, so the threshold has one name across `cards/`. Import weight is no reason: `scoreText` comes from `calibration/chartData.ts`, which imports `pairId` from `calibrationModel` (`chartData.ts:12`), so `cards/` loads the engine and the tuning modules either way. `cards/` may import from `activity/`, as `calibration/chartData.ts:7-8` already does.
    - **What R3 relies on in the kit, as built:**
      - `BarChart` draws nothing for a 0 value in a stack, so the histogram puts each score's count in its band's series and every column is one segment.
      - `ChartTooltip` prints its title and each row's label as separate text, and has `pointer-events: none` (`ChartTooltip.tsx:77`), so a tooltip under the pointer never fires `pointerleave` on a node link.
      - `ChartFrame` unmounts its children in table view, and focuses its table when a switch to it leaves focus on `<body>` (`ChartFrame.tsx:138-145`).
    - **Return types.** The signatures here and in the R3 tasks have no return annotation.
      - `@types/react` 19.3.0 has no global `JSX` namespace, only `React.JSX` (`node_modules/@types/react/index.d.ts:4226`).
      - No admin file annotates a component's return type.
      - The contract's own `JSX.Element` lines need the same reading.
2. **`src/tools/analytics/GapScale.tsx` and the verdict phrase (R3-5b, R-50, R-53).**
    - `GapScale` moves out of `CalibrationCard.tsx:10-53` with its `TRACK` and `SCALE_LABEL`. No module in `src/ui`, `src/charts`, `src/theme` or `src/shell` imports from `src/tools`, stories and tests aside (`Charts.stories.tsx:5` imports `gapColor`, `AdminShell.test.tsx:4` imports `ImagePage`, and R3-4b's network stories import `TIER_SERIES`). Both callers sit under `analytics/`.
    - Its doc comment is the one intended change: callers print the gap in text, so the track stays `aria-hidden`.
    ```ts
    // src/tools/analytics/GapScale.tsx; test src/tools/analytics/__tests__/GapScale.test.tsx
    export interface GapScaleProps {meanGap: number | null; color: string}   // the dot at scalePercent(meanGap); null draws none
    export function GapScale(props: GapScaleProps);
    // src/tools/analytics/verdict.ts: Verdict gains a phrase; verdictFor fills it
    export interface Verdict {word: string; phrase: string; wordColor: string; numberColor: string}
    // phrase: 'is well-calibrated' | 'runs generous' | 'runs harsh' | 'has too few score votes to judge' (null)
    ```
    - `CalibrationCard.tsx:83` prints "The engine {verdict.phrase}", the phrase in `wordColor`.
    - The card page prints "The engine {phrase} on this card" once the card has enough votes, and "The engine has too few score votes to judge this card" until then.
3. **Shared pieces (R3-1a, R-54).** These move with no behaviour change, and every importer is switched:
    ```ts
    // src/ui/DataAsOf.tsx: "Data as of <code>YYYY-MM-DD</code>", no colour or size of its own (PageLayout's META sets them, PageLayout.tsx:42)
    export function DataAsOf(props: {generatedAt: string});
    // replaces ActivityPage.tsx:6-13, CalibrationPage.tsx:24-31, and the inline copies at OverviewPage.tsx:19-23 and WebAnalyticsPage.tsx:17-23
    // src/ui/LowNTag.tsx: R2's chip (RulesTable.tsx:68-86), titled `Fewer than ${minVotes} score votes`; RulesTable passes LOW_N
    export function LowNTag(props: {minVotes: number});
    // src/ui/format.ts: moved from calibration/chartData.ts:196-207, its doc comment widened to every R3 share (R-43): "<1%" and ">99%" guards, each part rounded on its own
    export function sharePercent(fraction: number): string;
    // src/ui/layout.ts: moved from CalibrationWorkspace.tsx:84-96
    export function twoUp(track: number): React.CSSProperties;   // two tracks of `track` px and the SPACING.xl gap, stacked below that
    // src/shell/focusHandoff.ts: moved from calibration/focusHandoff.ts; code unchanged, doc comment generalised (FocusHandoff, useFocusHandoff, focusUnmoved, useTakeHandoff)
    //   importers: CalibrationPage.tsx:12, CalibrationWorkspace.tsx:17, TuningAside.tsx:19, __tests__/TuningAside.test.tsx:11
    // src/tools/analytics/activity/activityModel.ts: activityWindow's inline return type, named, beside it
    export interface VoteSpan {startDay: Day; endDay: Day}   // chartData.ts:306-309 imports it from here
    export function activityWindow(votes: readonly VoteLogRow[], range: RangePreset): VoteSpan | null;
    ```
    - **`src/ui/Panel.tsx`** gains `titleFocusable?: boolean` (R3-6c, R-48) and widens `title` to `React.ReactNode` (R3-8, R-33). Every other caller passes neither.
    - No `src/ui` file, stories and tests included, imports from `src/charts` or `src/tools` today, and none starts to (R3-4c's stories take `TIER_COLORS` from the bridge). That is why `LowNTag` takes its threshold and `SplitMeter` (addition 12) takes colours, not `SeriesDef`s.
    - `format.ts` is all primitive parameters. If `analyze_change_set` flags it once `sharePercent` lands, move it to its own `src/ui/share.ts` and tell the owner (R-43 names `format.ts`).
4. **Vote value types (R3-1).**
    ```ts
    // src/tools/analytics/voteLogTypes.ts:7, :10, :11, the votes table's checks (20260330000001_votes_table.sql:7-12)
    accuracy: -1 | 0 | 1 | null;
    difficulty: 1 | 2 | 3 | null;
    whoCarries: 'a' | 'b' | 'both' | 'neither' | null;
    ```
    - The narrowing breaks three sites, and R3-1 fixes them:
      - `ActivityView.stories.tsx:42` and `:45` take the file's `as const` tuple idiom (`:31-33`).
      - `activityModel.test.ts:481` types its table `it.each<[VoteLogRow['whoCarries'], string]>`. Today's `[string | null, string]` puts the error at `:488`.
    - Narrowed in a sandbox, the types give exactly those three errors: `activityModel.test.ts:488`, `ActivityView.stories.tsx:42` and `:45`.
    - `PairStat` is unchanged (R-32).
5. **The bridge (R3-1, R-30, R-55).**
    ```ts
    // src/app-bridge.ts:15-37, ASCII order kept: TIER_COLORS between SPACING (:31) and TRUNCATE (:32), Z_INDEX after TRUNCATE
    //   (theme.ts:363-368 and :261-271 at the pin)
    export {
      useAutocomplete,
      useContainerWidth,
      type UseAutocompleteReturn,
    } from '../upstream/inkweave/apps/web/src/shared/hooks';
    export {searchCardsByName, smallImageUrl} from '../upstream/inkweave/apps/web/src/features/cards/loader';                        // :52
    // Caches each id's result for the session; a non-OK or non-JSON response is a cached empty result,
    // and a rejection (a network failure or malformed JSON) is not cached, so the next call fetches again.
    export {fetchCardSynergies} from '../upstream/inkweave/apps/web/src/features/synergies/hooks/usePrecomputedSynergies';
    export {
      getStrengthTier,
      type StrengthTierLabel,
    } from '../upstream/inkweave/apps/web/src/features/synergies/utils/scoreUtils';
    ```
    - **Dropped (R-55):** `type PrecomputedPairData` and `type StrengthTier`. `UseAutocompleteReturn` stays, because it types the switcher's option row.
    - **Stale comments.** The comments at `app-bridge.ts:53-54` and `:57-58` say RaritySymbol draws Common to Legendary only. At the pin it draws Enchanted, Epic and Iconic too (`RaritySymbol.tsx:12-21`), and returns null only for an unknown key. R3-1 leaves them: `BreakdownCards.tsx:27` and `:38-44` rely on the same claim (`PRINTING_SYMBOLS`), so R3-9 drafts the fix as a follow-up issue (draft 4).
    - **What the bridged names do at the pin:**
      - `fetchCardSynergies` is at `usePrecomputedSynergies.ts:51-66`, with `cacheEmptyResult` at `:45-49` and the module cache at `:42`. It rejects on a network failure (`:55`) or malformed JSON (`:63`).
      - `getStrengthTier` (`scoreUtils.ts:18-23`): ≥9.5 Perfect, ≥7 Strong, ≥4 Moderate, otherwise Weak.
      - `searchCardsByName` (`loader.ts:239-247`) is the hook's own predicate (`useAutocomplete.ts:97-103`).
6. **`src/shell/PageLayout.tsx`: `documentTitle` (R3-7, R-51).** Verified in the sandbox:
    ```tsx
    // PageLayoutProps, after flush:
      /**
       * The tab's name before " · Inkweave admin", when it should say more than the
       * title: a card page names its card ("Elsa - Snow Queen · Card analytics", R-51).
       */
      documentTitle?: string;
    // After PageLayoutProps, before PageLayout's doc comment:
    /** The tab's name: "{documentTitle, or else title} · Inkweave admin". */
    function useTabTitle({title, documentTitle}: Pick<PageLayoutProps, 'title' | 'documentTitle'>) {
      const name = documentTitle ?? title;
      useEffect(() => {
        document.title = `${name} · Inkweave admin`;
      }, [name]);
    }
    // PageLayout's doc comment: :80-81 become
     * names the browser tab after the page ("Vote activity · Inkweave admin"), or
     * after `documentTitle` when it has one. Nothing restores the old title on
     * unmount: the next page sets its own.
    // PageLayout: `documentTitle,` after `flush = false,`; the effect at :93-95 becomes
      useTabTitle({title, documentTitle});
    ```
    - **Complexity.** `PageLayout` is already at cyclomatic complexity 8: two `||` in `hasSide`, four `&&` and the `flush` ternary. A `??` in its body, such as `useTabTitle(documentTitle ?? title)`, would make 9. So the hook takes both props and does the `??` itself, and `PageLayout` stays at 8.
    - The card page passes `` `${card.fullName} · Card analytics` `` once the card resolves, and nothing before. So `router.test.tsx`'s `NAV_ITEMS` title loop (`:83-89`) still reads "Card analytics · Inkweave admin" on a bare `/cards`.
7. **`src/shell/nav.ts` (R3-5, R3-7, R-33).** Verified in the sandbox:
    ```ts
    // NAV_ITEMS, after the web item (:25), before reveal (:26): the last Insights item
    {id: 'cards', label: 'Card analytics', mark: 'Cd', path: '/cards', group: 'insights', writes: false},
    /**
     * Card analytics, opened on a card when one is given (R-33): the URL the
     * cards/:cardId? route reads. The id is a card-list id.
     */
    export function cardsHref(cardId?: string): string {
      return cardId ? `/cards/${encodeURIComponent(cardId)}` : '/cards';
    }
    ```
    - **Matching.** `navItemFor` (`:35-37`) already owns a path and every path under it, so `/cards/2983` marks Card analytics current and Overview never matches it.
    - **The sidebar.** Its `NavLink` sets no `end` (`Sidebar.tsx:92-101`). NavLink treats `/` as exact by itself (`router.test.tsx:41-42`).
    - **Tests to update.** `nav.test.ts:36-41` and `Sidebar.test.tsx:32` pin the Insights list, so R3-7 adds `'cards'` and `'/cards'` to them.
    - **R4.** R4's "View card analytics" link uses `cardsHref` (`R4-card-studio.md:23`, `:1027`).
8. **`src/tools/analytics/cards/lastCard.ts` (R3-5, R-28).** Verified in the sandbox:
    ```ts
    export const LAST_CARD_KEY = 'inkweave-admin.last-card';   // admin's own prefix (SIDEBAR_OPEN_KEY, Sidebar.tsx:11)
    export function readLastCard(): string | null;              // null when nothing is stored or storage throws
    export function writeLastCard(cardId: string): void;
    export function forgetLastCard(cardId: string): void;       // clears only when the stored id is this one
    ```
    - Every access sits in a try/catch, as `Sidebar.tsx:24-31` does.
    - The switcher's option label (`version ? `${name} · ${version}` : name`) lives in `cards/cardSearch.ts`, so `CardSwitcher.tsx` exports only its component (react-refresh).
9. **The card models (R3-2, R3-3).** These are pure, unit-tested modules, and each stays under 30% primitive arguments.
    ```ts
    // src/tools/analytics/cards/cardStats.ts (R3-2): the calibration side, from pairs[]
    export const CARDS_TO_REVIEW = 5;   // R-28: how many cards the "Pick a card" prompt lists under Cards to review
    export interface CardPair extends PairStat {partnerId: string; partnerName: string}   // R-52: R2's pair helpers accept it
    export interface CardCalibration {
      pairsVoted: number; scoreVotes: number;
      meanGap: number | null;      // vote-weighted, unrounded
      engineAvg: number | null; communityAvg: number | null;
      enoughVotes: boolean;        // scoreVotes >= MIN_RULE_VOTES
    }                              // no accuracySentiment (R-32)
    export interface CardRuleRow {
      ruleId: string; ruleName: string;   // ruleName falls back to the id
      pairs: number; scoreVotes: number;
      meanGap: number | null;             // as RuleStat.meanGap; never null on real data
      lowN: boolean;                      // scoreVotes < MIN_RULE_VOTES
    }
    export interface CardToReview extends CardCalibration {cardId: string; cardName: string}
    export function pairsForCard(pairs: readonly PairStat[], cardId: string): CardPair[]; // |gap| desc, then scoreVotes desc, then partnerName
    export function cardCalibration(cardPairs: readonly CardPair[]): CardCalibration;     // vote-weighted; null averages with no score votes
    export function verdictGap(cal: CardCalibration): number | null;                      // meanGap to two places (as fmtGap prints it) once enoughVotes, else null
    export function cardReadLine(cal: CardCalibration): string;                           // the line under the verdict
    export function rulesForCard(cardPairs: readonly CardPair[], rules: readonly RuleStat[]): CardRuleRow[];
    //   R-35: low-n rows last; each group by |gap|, then scoreVotes, then name
    export function cardsToReview(pairs: readonly PairStat[]): CardToReview[];
    //   R-28: the top CARDS_TO_REVIEW cards with enoughVotes, widest |meanGap| first, then votes, then name

    // src/tools/analytics/cards/cardVotes.ts (R3-3): the raw-vote side, from vote-log.json, the card bound once
    export interface CardVote {vote: VoteLogRow; side: 'a' | 'b'; partnerId: string}
    export function votesForCard(votes: readonly VoteLogRow[], cardId: string): CardVote[];   // either side, log order
    export interface SilentCount {pairs: number; votes: number}
    // The card's pairs with a score vote and no pairs[] row, and their score votes: histogram.scored === cal.scoreVotes + votes.
    // R-31 splits them by partner: outside the current card list, or listed (both cards in Core, the engine still silent).
    export interface EngineSilent extends SilentCount {partnerUnlisted: SilentCount; partnerListed: SilentCount}
    export function engineSilentForCard(
      cardVotes: readonly CardVote[], cardPairs: readonly CardPair[], isListed: (cardId: string) => boolean,
    ): EngineSilent;   // scored votes only; isListed: (id) => getCardById(id) !== undefined
    export interface ScoreHistogram {counts: number[]; scored: number; unscored: number; mean: number | null}   // counts[i]: votes scoring i + 1
    export function scoreHistogram(cardVotes: readonly CardVote[]): ScoreHistogram;   // plain mean; quick votes counted apart
    export interface Rate {yes: number; answered: number; share: number | null}   // share: a 0-1 fraction, null with no answers
    export interface AccuracyAnswers {tooHigh: number; right: number; tooLow: number; answered: number; sentiment: number | null}
    //   sentiment (R-32): (tooLow − tooHigh) / answered, null with no answers
    export interface CarryShare {named: number; singled: number; share: number | null; both: number; neither: number}
    export interface DifficultyAnswers {easy: number; situational: number; hard: number; answered: number; mean: number | null}
    export interface CardAnswers {accuracy: AccuracyAnswers; isReal: Rate; wouldPlay: Rate; carry: CarryShare; difficulty: DifficultyAnswers}
    export function cardAnswers(cardVotes: readonly CardVote[]): CardAnswers;
    export interface WeekCount {week: Day; votes: number}   // quick votes included
    export function votesPerWeek(cardVotes: readonly CardVote[], logSpan: VoteSpan): WeekCount[];
    //   R-36: every Monday week of logSpan, which is activityWindow(voteLog.votes, 'all')
    export interface CardVoteSpan {votes: number; voters: number; days: VoteSpan}   // not R2's VoteSpan: it holds one
    export function cardVoteSpan(cardVotes: readonly CardVote[]): CardVoteSpan | null;
    ```
    - **`cardAnswers`.** It only assembles small helpers: `count` and `tally`, `ratio({part, whole})`, `accuracyAnswers`, one `rateOf` for both rates, `carryShare` and `difficultyAnswers`. As one function it scored 8.28 (cc 22).
    - **`votesPerWeek`.** It calls `weeklyStacks` directly, which already filters by range. It maps `cardVotes` into a fresh array, because `weeklyStacks` takes a mutable one.
    - **The R2 helpers R3 reuses.** `cardStats.ts` uses one private `voteWeighted(pairs: readonly PairStat[], value)`, a port of the precompute's `voteWeightedMean`, which returns null at zero weight. `cardReadLine` reads `verdictGap(cal)`, so its lean matches the printed gap, and builds its plural with `countOf`.
10. **The engine model and hook (R3-4, R-37, R-45).**
    ```ts
    // src/tools/analytics/cards/engineView.ts
    export type CardSynergies = Awaited<ReturnType<typeof fetchCardSynergies>>;   // the app keeps PrecomputedCardData private
    export const ENGINE_GROUP_CAP = 100;   // SynergyEngine's maxResultsPerGroup default (SynergyEngine.ts:37), cut at :130
    export interface EnginePartner {id: string; name: string; score: number; tier: StrengthTierLabel; ruleNames: string[]}
    //   name: nameOf(id), the name it was sorted by; ruleNames = connections' ruleName in file order:
    //   the engine keeps one connection per rule, strongest first (SynergyEngine.ts:226-259)
    export interface EngineSummary {partners: number; capped: boolean; tiers: Record<StrengthTierLabel, number>}
    export interface CutTie {score: number; drawn: number; tied: number}   // R-37: `drawn` of the `tied` partners at `score` make the cut
    export const TIER_ORDER: readonly StrengthTierLabel[];                 // Perfect, Strong, Moderate, Weak
    export const TIER_COLOR: Readonly<Record<StrengthTierLabel, string>>;  // each tier's TIER_COLORS[...].color (R-15)
    export const TIER_SERIES: readonly SeriesDef[];                        // id = tier, labels "Strong ≥7" etc. (R-44), colour TIER_COLOR
    export function enginePartners(data: CardSynergies, nameOf: (id: string) => string): EnginePartner[];
    //   R-37: score desc, then name (Intl.Collator('en')), then id, so the order is total.
    //   The engine cuts each group by score, then name (SynergyEngine.ts:124-128).
    export function engineSummary(partners: readonly EnginePartner[], groups: CardSynergies['groups']): EngineSummary;
    export function tieAtCut(partners: readonly EnginePartner[], shown: number): CutTie | null;
    //   null when the cut falls between two scores, or cuts nothing (shown >= the partner count, or shown < 1)
    // src/tools/analytics/cards/useCardSynergies.ts
    export interface UseCardSynergiesReturn {data: CardSynergies | null; loading: boolean; error: Error | null; retry: () => void}
    export function useCardSynergies(cardId: string | null): UseCardSynergiesReturn;   // null: no fetch, not loading
    ```
    - **The hook.** It keeps the last settled result keyed by card id (and attempt), and derives `loading` from it, as `usePrecomputedSynergies.ts:190-199` does. A synchronous `setState` in the effect would fail `react-hooks/set-state-in-effect`. `retry` fetches again, which works because a rejection isn't cached.
    - **`tieAtCut`.** It takes the shown count, so R3-4 needs nothing from R3-4b. R3-6c passes `NETWORK_MAX_NODES`.
    - **`nameOf`.** The view builds it from its `getCardById` prop (addition 14): `(id) => getCardById(id)?.fullName ?? id`, in R3-6c. R3-4's hand-off assumes R3-7 passes a `cardName`. With `getCardById` as the prop, the page passes no lambda of its own.
11. **The network diagram joins the kit (R3-4b, R-37, R-38, R-40, R-41, R-46).** This is R3-4b's own block, which replaces the outline's. It builds on `PlotPoint`, `RING`, `chartWidth`, `textWidth`, `ChartTooltip`, `tooltipText` and `Domain` (`scatter.ts:27`), and renames nothing. `LABEL_HALO` moves from `ScatterChart.tsx:84` to `axis.ts`.
    ```ts
    // src/charts/networkLayout.ts — the network's pure geometry (R3-4b), as barLayout.ts, lineLayout.ts and scatter.ts are
    export interface Size {width: number; height: number}
    export type Box = PlotPoint & Size;                       // PlotPoint: lineLayout.ts
    export interface RingSlot extends PlotPoint {angle: number; radius: number}   // angle: radians clockwise from 3 o'clock
    export interface LabelPlacement extends Box {anchor: 'start' | 'middle' | 'end'; textX: number; textY: number}
    export interface NetworkLayout {size: Size; hub: PlotPoint; slots: RingSlot[]; names: Array<LabelPlacement | null>; links: Box[]}
    export const ONE_RING_MAX = 6;            // up to 6 nodes share one ring; past it the weaker half moves out
    export const INNER_RING_SHARE = 0.55;     // inner radius / outer radius
    export const RING_MARGIN: number;         // 40 (SPACING.xxxl + SPACING.sm): room between the outer ring and the plot edge
    export const NODE_TARGET = 24;            // each node link's square, at least; names start just past it
    export const FOCUS_REACH: number;         // 4 (SPACING.xs): names stay this far inside the plot
    export const NAME_SIZE: number;           // ADMIN_TYPE.label (11): names are set, and measured with textWidth (R-40), at this size
    export const SPOKE_WIDTHS: Domain;        // [1, 4] px across the value domain
    export function ringSizes(count: number): [number, number];                  // [inner, outer]
    export function ringRadii(plot: Size): [number, number];                     // [inner, outer]
    export function ringSlots(count: number, plot: Size): RingSlot[];            // round the plot's centre; strongest at 12 o'clock, clockwise
    export function labelFor(slot: Pick<RingSlot, 'x' | 'y' | 'angle'>, text: Size): LabelPlacement;
    export function overlaps(a: Box, b: Box): boolean;                           // shared area only; touching edges, or a float slack under 1e-6, don't count
    export function contains(outer: Box, inner: Box): boolean;
    export function nodeTarget(p: PlotPoint): Box;                               // the NODE_TARGET square centred on p
    export function placeLabels(labels: readonly LabelPlacement[], blocked: readonly Box[], bounds: Box): Array<LabelPlacement | null>;
    export function spokeWidth(value: number, domain: Domain): number;           // SPOKE_WIDTHS across the domain, clamped
    export function networkLayout(plot: Size, names: readonly string[]): NetworkLayout; // names strongest first

    // src/charts/NetworkDiagram.tsx — a radial ego network (R3-4b)
    export const NETWORK_MAX_NODES = 12;      // R-37
    export interface NetworkNode {
      id: string; label: string; href: string; value: number; seriesId: string;
      tooltip: TooltipContent;                // its tooltipText is the node link's accessible name (R-41)
      // label prints inside its link where it fits, so tooltip.title must contain it (label in name): a card's name, the full name as the title
    }
    export interface NetworkDiagramProps {
      nodes: readonly NetworkNode[];          // strongest first; the first NETWORK_MAX_NODES are drawn
      series: readonly SeriesDef[]; ariaLabel: string;   // ariaLabel names the list of node links: "Strongest synergy partners of {fullName}"
      valueDomain?: Domain;                   // default [0, 10]: the spoke widths, 1 to 4px
      height?: number;                        // default 340, names included
      onShowAll?: () => void;                 // "and K more in the table" calls it
      emptyText?: string;                     // shown in place of the plot for no nodes (default "No data to chart.")
    }
    export function NetworkDiagram(props: NetworkDiagramProps);
    // NetworkDiagram measures and places (networkLayout); an inner NetworkPlot holds the active node by id, so a hover
    // places nothing again and new nodes clear it (R-46). The SVG is aria-hidden; each node is a react-router Link in a <ul>
    // named by ariaLabel, covering its 24px target and its printed name (NetworkLayout.links).
    // Hover or focus shows the node's ChartTooltip and dims the other spokes; Escape hides it and keeps focus (WCAG 1.4.13).

    // src/charts/axis.ts: LABEL_HALO = 3 (moved from ScatterChart.tsx, which now imports it), the page-coloured halo round a label drawn over marks
    // src/theme/AdminStyles.tsx: adm-net-link (display block, full size, ADMIN_RADIUS.control; :focus-visible in the controls' list, offset 2px)
    ```
    - **No click hook.** The node links take no `onFollow`. The card page asks for the focus handoff when the URL names another card, not on a link's click (see "Focus" under States).
    - **The hub (R-38).** It is an unnamed dot, so the outline's `center` prop goes.
    - **Names (R-41).** Each node link's accessible name is `tooltipText(node.tooltip)`, so `ariaLabel` per node goes.
    - **Interaction (R-41).** Spokes take `.adm-chart-mark` with `data-dim`/`data-active` through `dataFlag` (`barPaint.ts:54`), and the others dim to 0.4 (`AdminStyles.tsx:101-103`). The diagram has no `<style>` of its own.
    - **AdminStyles.** It gains `.adm-net-link`, added to its focus-visible list (`:90`) and to `AdminStyles.test.tsx`'s class list.
    - **Stories.** The diagram's stories go in `Charts.stories.tsx`, with one that drives `ChartFrame`'s `view` from outside.
12. **The split meter, a `src/ui` primitive (R3-4c, R-42, R-43).** It sits beside `MeterBar`: one full-width bar over the track, as the prototype draws it.
    ```ts
    // src/ui/SplitMeter.tsx — how a few counts divide one whole: one full-width bar, and a legend of shares and counts
    export interface SplitMeterPart {id: string; label: string; color: string; value: number}
    // parts: left to right; a zero part draws no segment but keeps its legend row.
    // ariaLabel names the legend list. emptyText (default "No answers yet.") shows under the bare track when every part is zero.
    export function SplitMeter(props: {parts: readonly SplitMeterPart[]; ariaLabel: string; emptyText?: string});
    ```
    - **Bar and legend.** The bar is `aria-hidden` decoration. The legend is the text: a `<ul>` named by the required `ariaLabel`, printing each part's label, `sharePercent` share and count ("Too high 24% (12)"). The props interface stays private, as `MeterBar`'s does; only the part type is exported, because R3-6's builders return it.
    - **Left out:** a tooltip, a Chart | Table toggle, a centred form and `pattern` support.
    - **Stories.** They go in `Primitives.stories.tsx`.
    - **Why `src/ui`.** CLAUDE.md requires a keyboard-reachable tooltip and a Chart | Table toggle on every kit chart. R1 and R2 kept value-printing meters in `src/ui` (`DimensionParticipation.tsx:19`, `BreakdownCards.tsx:101`).
13. **The switcher and its styles (R3-5, R-30, R-48).**
    ```ts
    // src/tools/analytics/cards/CardSwitcher.tsx: the only export
    export function CardSwitcher(props: {cards: LorcanaCard[]});   // useAutocomplete takes a mutable LorcanaCard[]
    // src/tools/analytics/cards/cardSearch.ts: what the switcher shows, outside the component file (react-refresh)
    export const MIN_QUERY = 2;   // passed to useAutocomplete as minChars, so the list and the status share one threshold
    export const NO_MATCH = 'No cards match.';
    export function cardLabel(card: Pick<LorcanaCard, 'name' | 'version'>): string;   // "name · version", or the bare name
    export interface SwitcherState {cards: LorcanaCard[]; query: string; listOpen: boolean; focused: boolean}
    export function switcherStatus(state: SwitcherState): string;                     // NO_MATCH or ''
    // src/theme/AdminStyles.tsx gains .adm-option, a listbox row: [aria-selected="true"] gets ADMIN_COLORS.rowHover plus an
    //   inset 2px accent bar (a fill alone fails 3:1); it joins the reduced-motion list and AdminStyles.test.tsx's class list
    ```
    - **The hook.** It uses the app's `useAutocomplete` as it is: names only, two letters, newest set first, `maxResults: 6`.
    - **The list.** The `<ul aria-label="Cards">` renders only while open, on the opaque popover fill UnsavedChangesGuard uses.
    - **"No cards match."** An always-mounted polite status (`switcherStatus`) shows it while the field has focus (`isFocused`), the list is closed, cards have loaded, the query has two or more characters, and `searchCardsByName(cards, query)` finds nothing. A matching query never shows the line during the 150 ms debounce (R-30).
    - **A pick.** It navigates to `cardsHref(card.id)`, and focus stays in the input (R-48).
14. **The view and the page (R3-6a to R3-7, R-46, R-48, R-51).**
    ```ts
    // src/tools/analytics/cards/CardAnalyticsView.tsx
    export interface CardAnalyticsViewProps {
      card: LorcanaCard;
      analytics: UseVoteAnalyticsReturn; voteLog: UseVoteLogReturn;   // the hooks' own types
      synergies: UseCardSynergiesReturn;                      // added by R3-6c: R3-6a's props stop before it, so R3-6a needs nothing from R3-4
      getCardById: (id: string) => LorcanaCard | undefined;   // names, R-31's isListed and R-33's resolved-only links, from one lookup
      handoff?: FocusHandoff;                                 // the page's: the card header's h2 takes it (R-48)
      headerActions?: React.ReactNode;                        // R4: "Edit in Card studio", in the card header
    }
    export function CardAnalyticsView(props: CardAnalyticsViewProps);   // the page renders it with key={card.id} (R-46)
    // src/tools/analytics/cards/cardPageState.ts
    export type CardPageState =
      | {kind: 'failed'; error: Error} | {kind: 'pick'} | {kind: 'loading'}
      | {kind: 'unknown'; cardId: string} | {kind: 'card'; card: LorcanaCard};
    export interface CardRoute {cardId: string | undefined; isLoading: boolean; error: Error | null; getCardById: (id: string) => LorcanaCard | undefined}
    export function cardPageState(route: CardRoute): CardPageState;   // failed, then pick, then loading, then card or unknown
    // src/tools/analytics/cards/CardPageBody.tsx
    export interface CardPageBodyProps {state: CardPageState; analytics: UseVoteAnalyticsReturn; voteLog: UseVoteLogReturn;
      synergies: UseCardSynergiesReturn; getCardById: (id: string) => LorcanaCard | undefined; onRetry: () => void; handoff: FocusHandoff}
    export function CardPageBody(props: CardPageBodyProps);   // renders CardAnalyticsView with key={state.card.id} (R-46)
    // src/tools/analytics/cards/CardAnalyticsPage.tsx
    export function CardAnalyticsPage();
    ```
    - **Helpers take objects.** `cardView.ts` (R3-6a), `voteCharts.ts` (R3-6b) and `engineCharts.ts` (R3-6c), each its own module, take objects, not loose strings and numbers. The outline's `cardCharts.ts` sat at 36% primitive arguments, and PR #28 failed at 33.3%. Examples: `scoreTooltip(bar, histogram)`, `weekTable(weeks, {card, log})`, `networkSubtitle(model)`.
    - **`SCORE_SERIES`.** It derives from `BAND_SERIES` (`activityChart.ts:35`).
15. **`NAV_ITEMS` at the end of R3, in order:**
    ```ts
    // {id:'overview', label:'Overview', mark:'Ov', path:'/', group:'main', writes:false}
    // {id:'calibration', label:'Calibration & tuning', mark:'Ca', path:'/calibration', group:'insights', writes:true}
    // {id:'activity', label:'Vote activity', mark:'Ac', path:'/activity', group:'insights', writes:false}
    // {id:'web', label:'Web analytics', mark:'Wa', path:'/web', group:'insights', writes:false}
    // {id:'cards', label:'Card analytics', mark:'Cd', path:'/cards', group:'insights', writes:false}
    // {id:'reveal', label:'Reveal publisher', mark:'Re', path:'/reveal', group:'publish', writes:true}
    // {id:'image', label:'Card images', mark:'Im', path:'/image', group:'publish', writes:true}
    // URL contract: /cards/:cardId? (cardsHref). Bare /cards redirects to the last card viewed, or shows the prompt.
    ```

**Goal.** Build one read-only page at `/cards`: one card's votes, calibration and engine data.
- **The card.**
  - The header's **Switch card** search picks it, and `/cards/:cardId` holds it.
  - A first visit shows a "Pick a card" prompt with "Cards to review" (R-28).
- **The data.**
  - **Calibration** comes from `pairs[]`.
  - **The raw panels** come from the vote log.
  - **The engine view** comes from the card's live synergy file, through the bridged `fetchCardSynergies`. The synergy network diagram (R-13) shows the strongest 12 partners.
  - **No pipeline changes.**
- **Links.**
  - Other pages' card names link in (R3-8, R-33).
  - The card's rules link out to `/calibration?rule=` (R-34).

**Sources and definitions.** These follow the plan's corrections.

| What the page shows | Source | Definition |
|---|---|---|
| Score votes, Pairs voted, Mean gap, Engine → community, the rules table, Voted pairs, Cards to review | `vote-analytics.json` `pairs[]` | Only pairs with at least one score vote **and** an engine score (`computePairRecord`, `scripts/lib/voteAnalytics.mjs:22-44`; `buildPairRecords`, `:62-72`). Every average is weighted by `scoreVotes` (`voteWeightedMean`, `:47-56`), as the global mean gap is (`:182`). The community score is the database's trimmed mean (`internal.trimmed_mean`), rounded to 2 places (`:27`). A pair counts toward every rule in its `rules`, which are rule ids (`:41`), as `rollUpByRule` credits them (`:110-136`). Rule names come from `RuleStat`, or the id when it has none. |
| Accuracy sentiment (raw tag) | `vote-log.json` | **R-32.** The card's raw accuracy answers: the share of "too low" minus the share of "too high", which is the plain mean of the answers. The hint gives the answer count. `pairs[]` carries a sentiment on 21 of 954 pairs (`:40`), so a `pairs[]` KPI would read "—" on almost every card. The log has 234 accuracy answers across 262 cards. The Overview's own KPI rests on the same 21 pairs (`computeGlobal`, `:183-187`), which is a follow-up issue (R3-9). |
| Distinct voters (raw tag) | `vote-log.json` | Distinct `voter` tokens on the card's raw votes (`buildVoteLog`, `:216-230`). |
| Engine-silent caption, under Voted pairs | `vote-log.json` and `pairs[]` | **R-31.** The card's pairs that have a scored vote but no `pairs[]` row, split in two (`engineSilentForCard`): `partnerUnlisted`, pairs whose partner is outside the current card list, and `partnerListed`, pairs with both cards in Core that the engine still doesn't score. 1,587 of the 1,621 engine-silent pairs involve a card outside Core, since the engine covers Core only (`loader.ts:194-198`, `MIN_CORE_SET` 9 at engine `constants.ts:14`). So it is a caption, not a gold KPI, as R2 captioned it (`CalibrationScatter.tsx:129-131`). Both files come from the same Deploy run. The caption renders only once both have loaded. |
| Community scores, How voters answered | `vote-log.json` | Every raw vote that includes the card, using plain means. Unscored (quick) votes stay out of the histogram and every average, and a caption counts them. On real data every quick vote carries an accuracy answer (196 of 196), so the caption says they count under How voters answered. |
| Votes per week | `vote-log.json` | **R-36.** The vote log's whole span (`activityWindow(voteLog.votes, 'all')`), in Monday weeks (`weeklyStacks`, `weekStart` = `isoWeekStart`, `:139-145`), as one series with the latest week in the accent. Part weeks are named by `bucketTitle` and `partialWeeks`, as Vote activity and R2's weekly gap name them. A 12-week window would hold 17.5% of votes and leave 29% of voted cards with an empty chart. |
| Engine view, network diagram | `/data/synergies/<id>.json`, through the bridged `fetchCardSynergies` | Partners are `Object.keys(pairs)`. Each partner's tier is `getStrengthTier(pairs[id].aggregateScore)`. `aggregateScore` is the strongest connection (`SynergyEngine.ts:21-24`), the same number vote analytics uses as `engineScore` (`precompute-vote-analytics.mjs:77`). A pair's `ruleNames` are its `connections[].ruleName` (`PairSynergyConnection`, engine `types/synergy.ts:48-66`). The engine keeps one connection per rule, strongest first (`SynergyEngine.ts:226-259`). Partners are ordered by score, then card name (`Intl.Collator('en')`), as the engine cuts each group (`:124-128`, R-37), then id, so the order is total. `capped` is true when any group lists 100, the engine's cut (`:37`, `:130`). On 2026-10-06, 147 of 1,041 cards were capped. |

Two checks must hold, and the tests assert both:
- **Calibration.** On fixtures whose `gap` equals `communityScore - engineScore`, the tests assert `expect(cal.communityAvg! - cal.engineAvg!).toBeCloseTo(cal.meanGap!, 10)`. Exact equality fails through float rounding (`6.1 - 5.3 === 0.7999999999999998`).
  - On real data each `gap` is `round2(c − e)`, with `c` already rounded (`:27`, `:30`). With whole engine scores, `c − e` already has 2 places, so the identity holds to float precision. ±0.005 bounds it only for a fractional engine score.
  - `cardCalibration` stays unrounded. R3-2's `verdictGap` rounds the mean gap once, to 2 places as `fmtGap` prints it, for `verdictFor` and `GapScale`, as the global gap is rounded once (`:193`). The Mean gap KPI prints `fmtGap(cal.meanGap)`, the same two places.
- **Histogram.** `histogram.scored === cal.scoreVotes + engineSilent.votes`. This one is exact, because every term is an integer count.
  - It held for all 1,080 cards with scored votes on the 2026-10-05 files.
  - R3-3's `scripts/lib/__tests__/cardVotesParity.test.mjs` asserts it for every card through the precompute's own transforms (`buildAnalytics`, `buildVoteLog`), on `weeklyGapsParity.test.mjs`'s harness. It also asserts that the per-card engine-silent pairs, summed over every card, equal 2 × `global.engineSilentPairs`.

**Vote field values**
- **`whoCarries`** is one of `'a' | 'b' | 'both' | 'neither'`. `'a'` always means the row's `a` card:
  - `submit_vote` stores the lower id as `a` and swaps `who_carries` to match (app `20260622000000_relax_vote_rate_limit.sql:20-26`).
  - The votes table enforces `card_a_id < card_b_id` (`20260330000001_votes_table.sql:16`).
  - `buildVoteLog` re-sorts pairs with JS `<` (`voteAnalytics.mjs:220`). For numeric-string ids that order matches the database's, so it never swaps a pair.
- **"Named as carry"** counts the votes whose `whoCarries` is the card's side (`CardVote.side`), out of the votes that named a single card (`'a'` or `'b'`).
  - `'both'` (the one-click default) and `'neither'` stay out of the share, and their counts show beside it.
  - On real data only 28 votes named a single card, against 2,689 `'both'`, so the share is often "—".
- **Difficulty** runs 1–3 (Easy / Situational / Hard, `InDepthVoteForm.tsx:89-91`). It shows as "x.x / 3", not the handoff's "/5".
- **Accuracy:**
  - −1 means "too high": the voter picked "Should be lower" (`InDepthVoteForm.tsx:78-80`).
  - 0 means "right" ("Score is fair").
  - +1 means "too low" ("Should be higher").
  - The answers panel shows that split. The sentiment KPI is its mean (R-32), with the gap's sign: positive means the community wants the score higher.
- **Is real, Would play.** Each is a rate over the votes that answered it. Only 34 votes in the whole log answered them, so each row needs its "No answers yet" state.

**Minimum-vote guard.** The verdict uses `verdictFor(verdictGap(cal))`. R3-2's `verdictGap` returns `cal.meanGap` to 2 places once `cal.enoughVotes`, and null before. It rounds as `fmtGap` does, `Math.sign(g) * Number(Math.abs(g).toFixed(2))`, so the verdict, the scale's dot and the printed gap agree.
- **Why not `Math.round(g * 100) / 100`.** It disagrees with `fmtGap` at the half-cent. 0.495 rounds to 0.5, so the verdict says "runs harsh" and the dot sits at 0.5, while `fmtGap` prints "+0.49". −0.125 rounds to −0.12, while `fmtGap` prints "−0.13".
- **Who reads it.** `GapScale` takes `verdictGap(cal)` as its `meanGap`. The Mean gap KPI prints `fmtGap(cal.meanGap)`, the same two places, and keeps printing under `MIN_RULE_VOTES`.
- **A card under `MIN_RULE_VOTES` (10) score votes.**
  - Its headline is "The engine has too few score votes to judge this card".
  - `GapScale` gets `meanGap={null}`, so it draws no dot.
  - The Mean gap KPI shows the number uncoloured, with the hint `` `low n: under ${MIN_RULE_VOTES} score votes` ``.
  - On the 2026-10-05 files, 36 cards reach 10 score votes on engine-scored pairs.
- **The rules table (R-35).**
  - Rows under `MIN_RULE_VOTES` score votes carry `<LowNTag minVotes={MIN_RULE_VOTES} />` and sort after the others. Within each group they sort by |gap|, then score votes, then name. The median card in `pairs[]` has 2 score votes, so sorted by gap alone, 1-vote rules would top the table.
  - Each rule name links to `calibrationHref(ruleId)` (R-34).
- **Cards to review** lists only cards with at least `MIN_RULE_VOTES` score votes, as the spec's correction for per-card verdicts asks (R-28).

**URL contract**
- **The route** is `cards/:cardId?`, after `calibration` in `router.tsx` (`:19`). Links build it with `cardsHref`.
- **Bare `/cards`.**
  - With an id from `readLastCard()`, it renders `<Navigate to={cardsHref(id)} replace />`.
  - With none, it shows the "Pick a card" prompt and, once vote analytics loads, "Cards to review": the 5 cards from `cardsToReview`, each a link to its page (R-28). On the 2026-10-05 files, 36 cards qualify and 19 sit outside ±0.5, so the list always has rows.
    - **While vote analytics loads, or after it fails,** the prompt shows alone. The list is left out silently, with no loading line or error of its own: locally both files are always missing, and the prompt still works.
    - **Its links don't go through `getCardById`.** Each goes straight to `cardsHref(cardId)`, named by `cardName`. `pairs[]` holds only pairs the engine scores, and none of the 451 unknown voted ids is in it (R-29), so its ids resolve. An id gone stale since the Deploy run would land on the not-found message, which names the causes.
  - Opening a card automatically would make the header wait for the vote files.
- **Remembering.** `useRememberCard(state)` saves the id on `kind === 'card'` and forgets it on `kind === 'unknown'`, which `cardPageState` gives only for a loaded list with no error. `forgetLastCard` clears only that id, so a slow or failed card list never clears a good id.
  - The card is looked up during render, inside `cardPageState`. `getCardById` is a new closure on every provider render (`CardDataContext.tsx:29`), so calling it inside the effect would make `exhaustive-deps` re-run the effect every time.
- **An unknown id** shows the not-found message only (R-29): "No card has the id N in the current card list. Cards from sets before 9 rotated out of Core, and a preview id changes when its card is released."
  - The files carry no names for these ids: all 451 unknown voted ids have `aName === id`, and `pairs[]` never contains them. Vote sections would show bare numbers.
  - They touch 60% of log votes, which is why R3-8 links only ids the card list resolves.
- **One route element serves every id.** So the page renders `<CardAnalyticsView key={card.id} …>` (R-46). Every frame's Chart/Table toggle, the pair list's scroll and the network's hover start fresh on the next card.
- **The tab** reads "{card.fullName} · Card analytics · Inkweave admin" (R-51).
- **The sidebar's "Card analytics" link from a card page** pushes `/cards`, which redirects to the same card. History gains a duplicate entry, and that is accepted: the handoff asks for "Default card: last viewed" (README §6).
- **R4.**
  - **Linking in.** It links here through `cardsHref(id)`.
  - **"Edit in Card studio".** It passes the button as `CardAnalyticsView`'s `headerActions` (the card header), not PageLayout's `actions`, which hold the switcher.
  - **In R3.** R3 ships without that button, because `/studio` doesn't exist yet.

**States.** Each section has its own states. The header and the engine view never wait for the vote files. The prototype hid them whenever vote analytics failed, and locally both files are always missing.

| Section | Loading | Failed | Empty |
|---|---|---|---|
| Body (card list) | "Loading cards…" | `<Notice tone="error">` "Could not load the card list ({message})", with a neutral `CtaButton` "Retry" (`retryLoad`), as `TuningAside.tsx:307` offers one | No id: the "Pick a card" prompt and Cards to review. Unknown id: R-29's copy above |
| KPIs, calibration, voted pairs (vote analytics) | "Loading analytics..." (`OverviewView.tsx:36`) | "Could not load vote analytics. Has the artifact been generated? ({message})" (`OverviewView.tsx:34`) | Card in no `pairs[]` row: "No score votes on pairs the engine scores yet." |
| Raw panels and raw KPIs (vote log) | "Loading vote log..." (`ActivityView.tsx:136`) | "Could not load the vote log. Has the artifact been generated? ({message})" (`ActivityView.tsx:134`) | No raw votes (the log loads empty, or vote analytics says `hasRawVotes: false`): "Votes over time, score spread, answers and voters need raw votes. Set the `SUPABASE_SERVICE_ROLE_KEY` Actions secret, then re-run admin's Deploy workflow." (the copy R2's notices use, `CalibrationWorkspace.tsx:237-244`). Card absent from the log: "No raw votes on this card yet." |
| Engine view | "Loading engine data..." | "Could not load this card's synergies ({message})", with a neutral `CtaButton` "Retry" (`retry`, R-45) | Empty `pairs`: "The engine finds no synergies for this card (or its synergy file could not be read). A card revealed after the app's last deploy has no synergy file yet." `fetchCardSynergies` caches a non-OK response as empty, so the hook can't tell the two apart. |

- **The state order** is one pure function, `cardPageState`, tested on its own: error, then the prompt (no id), then loading, then unknown, then the card.
  - The error comes first on `/cards` too: the switcher searches the context's `cards`, which are empty after a failure, so the prompt would be useless.
  - The page keeps its hooks, the redirect and `PageLayout`. A body component renders the state, so no function passes cyclomatic complexity 8.
- **Every hook runs before the redirect's early return:** `useParams`, `useCardDataContext`, `useVoteAnalytics`, `useVoteLog`, `useCardSynergies(cardId ?? null)`, the focus handoff and `useRememberCard`.
  - Using `cardId` rather than `card?.id` starts the synergy fetch while the card list loads.
  - For an unknown id this costs one 404, which the fetch caches as empty.
- **What renders only once vote analytics has loaded:**
  - the PageLayout `meta` (`<DataAsOf generatedAt={…}/>`, vote-analytics.json's date);
  - the histogram subtitle's "engine X on the pairs it scores";
  - the engine-silent caption (which needs the vote log too: without vote analytics, every scored pair would count as engine-silent);
  - Cards to review;
  - the engine caption's second clause ("vote analytics use the engine as of {date}").
- **Focus (R-48).** Focus moves only when its control disappears, through R2's handoff (moved to `src/shell/focusHandoff.ts` in R3-1a). It never moves when the user has moved it meanwhile (`focusUnmoved`).
  - **A switcher pick.** Focus stays in the switcher, which stays mounted in the header.
  - **A partner link, a network node or a Cards-to-review link.** The page requests the handoff when the URL names another card (R3-7's `useCardHandoff`), and the new card's header `h2` (`tabIndex={-1}`) takes it.
    - **Not on click.** A router `Link` navigates in a transition, so a request made in its click handler commits first. The old card's `h2`, still mounted, then takes it and marks it done before the new card mounts (R3-7 checked this by mutation). So the view's links, and the network's node links, need no click hook.
    - **By REPLACE.** The bare-`/cards` redirect asks for nothing: it is no one's action.
  - **The card list's Retry.** The page requests the handoff when the list's error clears. The state that follows takes it:
    - the new card's `h2`;
    - on bare `/cards`, the prompt's line, a `<p tabIndex={-1}>` as `CalibrationWorkspace.tsx:170` renders its scope line. No card `h2` mounts there: with no id, the state goes from failed to the prompt;
    - for an unknown id, the not-found line, the same kind of `<p tabIndex={-1}>`;
    - Retry again, if the list fails again.
  - **The engine view's Retry (R-45)** follows the same rule inside the panel, with the panel's own `useFocusHandoff()`, requested on Retry's click (a plain state update, as R2's Save token). Once the read lands, with partners or none, the Engine view's `h2` takes focus: R3-6c gives `Panel` an optional `titleFocusable` (`tabIndex={-1}` on its `h2`). Focus goes back to Retry if the read fails again.
  - **Browser Back and Forward** between cards change the URL too, so the page asks. The new `h2` takes focus only if it fell to `<body>` with the old view.

**Page layout** (the body grid, top to bottom; R2's widths, `twoUp` from `src/ui/layout.ts`)
1. The card header:
   - a 64×90 thumbnail when `smallImageUrl(card)` is defined (`loader.ts:78-87`);
   - the `h2` name and version;
   - `InkIcon` for `ink`, then `ink2`;
   - the base rarity through `rarityConfigOf` and `RaritySymbol`, or nothing (R-49: printings aren't rarities);
   - "Type · cost N · inkable" and `<code>#n</code>`;
   - `headerActions`.
2. The KPI row:
   - Score votes, Pairs voted, Mean gap and Engine → community;
   - Distinct voters and Accuracy sentiment, both with the raw tag, when the card has raw votes.
3. Calibration for this card beside Voted pairs: `twoUp(420)`, the prototype's track (`dc.html:600`).
   - **Calibration.** The headline, `cardReadLine`, `GapScale` and the rules table.
   - **Voted pairs.**
     - R2's `PairList` pattern: one list that scrolls inside the panel, with no "Show all" button (R-47).
     - Partner names are links to `cardsHref`.
     - "Engine → community" is printed with `scoreText`, and the gap with `gapColor`.
     - The caveat reads "Most pairs have a single vote — trust the card-level trend over any one row." (`dc.html:619`).
     - The engine-silent caption (R-31) sits under it.
4. Community scores beside How voters answered, `twoUp(376)`, R2's chart track (each plot keeps `ChartTooltip`'s 304px floor and all ten score labels). Votes per week goes under them at full width, since its whole-span series grows a bar a week (R-36).
5. The Engine view panel, full width:
   - the count ("At least" when capped);
   - on a failed read, the error Notice and a neutral `CtaButton` "Retry" (R-45), whose handoff the panel's heading takes;
   - the cap caption;
   - the tier `SplitMeter`, every tier shown, zeros included;
   - the source caption.
6. The network: its own untitled `Panel`, full width, directly under the Engine view (R-39). It holds a `ChartFrame` titled "Strongest partners".

Every chart sits alone in an untitled `Panel`, as in R1 and R2. No frame takes `titleLevel={3}`. There is no filter row, because the switcher is the page's one filter and it sits above everything it scopes.

**Conventions.**
- **Branch.** Work on `feature/24-redesign-r3` (R-56). There is one PR for the phase, and every commit message ends `(#24)`.
- **The plan goes in first.** The branch carries an uncommitted `docs/plans/R-redesign.md` edit: "Decisions for R3" (R-28 to R-56) and the PR #28 record in "R2 as built".
  - **What else it takes first.** The same commit carries this header and the R3 task files, and makes these edits in `R-redesign.md`:
    - `:17`, the Branch sentence after the tracking issue, becomes "Branch: one per phase: `feature/24-admin-redesign` (R1), `feature/24-redesign-r2` (R2), `feature/24-redesign-r3` (R3); one PR per phase."
    - `:156`, the R3 row's last cell: "Outline below" becomes "Below".
    - `:666`: the heading becomes "## Phase R3: Card analytics (detailed)".
    - `:668` becomes "[R-redesign/R3-card-analytics.md](R-redesign/R3-card-analytics.md): tasks R3-1 to R3-9, re-based on R2 as built (main @ aea40b4) and pin bc877e1 on 2026-10-06. Its decisions are R-28 to R-56 above."
    - R-53's row (`:83`): "No file in `src/ui`, `src/charts`, `src/theme` or `src/shell` imports from `src/tools`" becomes "No module outside stories and tests in `src/ui`, `src/charts`, `src/theme` or `src/shell` imports from `src/tools`". `Charts.stories.tsx:5` and `AdminShell.test.tsx:4` already do, and R3-4b's stories will.
    - R3's planned contract in "File structure (R1)", "Shared interfaces (R1)", "Chart kit (R1-3b)" and "Contract additions from the task drafts": the src/ui and src/shell additions, `Panel`, `PageLayout`, `nav.ts`, AdminStyles' three classes, `NetworkDiagram`, `LABEL_HALO`, `NAV_ITEMS` at the end of R3, `CardName`, `VoteSpan`, the bridge record, and `Verdict.phrase` with `GapScale`. R3-5b and R3-9 then edit none of those lines.
  - **When.** Before R3-1, after the owner approves, as two separate Bash calls, so the commit command starts with `USER_APPROVED=1`:
  ```bash
  git add docs/plans/R-redesign.md docs/plans/R-redesign/R3-*.md
  ```
  ```bash
  USER_APPROVED=1 git commit -m "docs(plan): settle R3's decisions and re-base its plan (#24)"
  ```
- **Commits.** Every task ends with its commit step, run with the Bash tool (never PowerShell) and only after the owner approves. Stage and commit in two separate Bash calls, so the commit command starts with `USER_APPROVED=1`; the hook blocks a commit that doesn't:
  ```bash
  git add <the task's named paths>
  ```
  ```bash
  USER_APPROVED=1 git commit -m "<the message in the task file's commit step>"
  ```
  - The task file's commit step wins. The task order below copies each message from its task file, where one had been drafted by 2026-10-06.
  - Stage only the task's named paths: never `git add -A` or `git add .`. Never stage `public/admin-data/`.
  - Never pipe a commit.
  - The pre-commit hook runs lint and tests. If Vitest fails to start its workers under load, stop this session's preview servers and retry.
- **Citations.** `R3-06a-view-shell.md:N` and `R3-card-analytics.md:N` in the task files name the 2026-10-06 drafts. Read them as task ids, since the line numbers move.
- **The task loop.**
  1. Write the failing test.
  2. Run `pnpm vitest run <test file>` and watch it fail as the task says. Run `pnpm build:engine` once before the first run on a fresh clone, because these tests reach the bridge.
  3. Implement.
  4. Run the test again.
  5. Run `pnpm lint` and `pnpm typecheck`.
  6. Commit.

  Check a proposed block with `pnpm exec eslint --stdin --stdin-filename src/<path>`. Scripts run the same way: `pnpm vitest run scripts/lib/__tests__/cardVotesParity.test.mjs`.
- **Code Health.** The PR gate requires new code at CodeScene 10, and the server is stricter than the local MCP (1.1.3).
  - **Where the gate went further.** It failed R1 on `BarChart`, `plotProps` and `capsFor`. It failed R2 on `weeklyGaps` (9.66), scatter.ts's primitive arguments, `seededVotes`' argument count and chartData.ts's primitives (33.3%). A local 10.0 is not proof.
  - **The limits, from the start:**
    - cyclomatic complexity 8 or less per function, inner lambdas included;
    - at most 4 arguments;
    - under 30% primitive arguments per module.
  - **How R3 keeps to them:**
    - object arguments and bound domain types (`CardVote`, `Size`, `VoteSpan`);
    - fixture builders that take one object or one array, never loose primitives;
    - `it.each` tables in tests;
    - components split as R2 split `ScatterChart` and `TuningAside`.
  - Run `analyze_change_set` before every push, then read the PR's CodeScene check.
- **Fixtures.** `src/tools/analytics/cards/cardFixtures.ts` is a plain, seeded module that the tests and the stories share. R3-2 creates it, and R3-3, R3-4, R3-5 and R3-6a to R3-6c extend it. Each builder takes one argument, an object except where a list is the input:
  - `pairStat(seed)` and `ruleStat(seed)` (R3-2);
  - `voteRow(overrides)` (R3-3);
  - `engineFixture(partners)`, which takes an array of `{id, name, score, rules?}` (R3-4);
  - `lorcanaCard(seed)`, and the `SWITCHER_CARDS` list (R3-5).

  Every `gap` equals `communityScore − engineScore`. It covers:
  - a Supabase-form timestamp (`…T12:00:00.123456+00:00`) and a Sunday vote;
  - votes with the card on the b side;
  - a quick-vote-only pair;
  - engine-silent pairs with a listed and an unlisted partner;
  - a card with no rarity and a "Super Rare" card (R-49);
  - capped, 15-partner and one-partner engine results;
  - a tie across the 12th place (R-37).
- **Stories.**
  - Every new component gets a story on the admin canvas, built from `cardFixtures.ts`.
  - The view's stories render under a `MemoryRouter` decorator (the links need a router), titled "Admin/Insights/Card analytics/View", from one base args object. Every `cards/` story file takes a leaf title under "Admin/Insights/Card analytics/…", as R2's sit under "Admin/Insights/Calibration/…", so no title is both a component and a group (R3-5's is ".../Switcher", R3-6b's ".../Raw-vote panels", R3-6c's ".../Engine panels", R3-7's ".../Page states").
  - Nothing a story renders calls `useBlocker`.
- **Before the PR** (R3-9):
  - `pnpm test:run`, `pnpm build` and `pnpm check:deps`;
  - `analyze_change_set`;
  - the owner's real-data check, last.

**Test isolation.** `src/test/setup.ts:6` resets the artifact cache before every test, and nothing else resets state. `vite.config.ts`'s `test` block (`:41-52`) sets neither `restoreMocks` nor `unstubGlobals`, so every file undoes what it stubs.
- **Page and route tests:** `beforeEach(() => localStorage.clear())`. `router.test.tsx`'s `afterEach` already clears it (`:26-32`).
- **Storage that throws** (`lastCard.test.ts`): one stub of the whole object, verified in the sandbox:
  ```ts
  afterEach(() => vi.unstubAllGlobals());

  it('reads null and never throws when storage is unavailable', () => {
    const denied = () => {
      throw new Error('denied');
    };
    vi.stubGlobal('localStorage', {getItem: denied, setItem: denied, removeItem: denied});
    expect(readLastCard()).toBeNull();
    expect(() => writeLastCard('2983')).not.toThrow();
    expect(() => forgetLastCard('2983')).not.toThrow();
  });
  ```
- **Fetch stubs** (R3-1's `bridgeContract.test.ts`): `afterEach(() => vi.unstubAllGlobals())`, as `useVoteAnalytics.test.ts:5` does. `fetchCardSynergies` caches per id at module level (`usePrecomputedSynergies.ts:42`) and never resets, so each case uses its own id.
- **The synergy cache and the card list.** The hook test (R3-4) and the engine panels' test (R3-6c) mock `fetchCardSynergies` through the bridge, in R2's `importOriginal` idiom (`CalibrationCharts.test.tsx:18-22`). The view tests need no bridge mock: `synergies` and `getCardById` are props.
  - The hook test resets the mocks in a block-bodied `beforeEach`, as `useLiveTuning.test.ts:17-20` does. Without the reset, a "fetches the id" case can pass on an earlier test's call, and "a `null` id doesn't fetch" fails, because `not.toHaveBeenCalled` sees the other tests' calls.
  - The page test (R3-7) mocks the view with a recording stand-in. It reads the card list from a small store through `useSyncExternalStore`; its `setCardList` helper moves the list on mid-test, which `mockReturnValue` can't. Its `fetchCardSynergies` never settles (`mockReturnValue(new Promise(() => {}))`), so no hook updates outside `act`.
  - This block passes `eslint --stdin` and, in the sandbox, keeps the real bridge and starts every test with no calls:
  ```ts
  const fetchCardSynergies = vi.hoisted(() => vi.fn());
  vi.mock('../../../../app-bridge', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    fetchCardSynergies,
  }));

  beforeEach(() => {
    // A block, not an arrow's value: mockReset() returns the mock, and Vitest calls a function a hook returns as its teardown.
    fetchCardSynergies.mockReset();
    fetchCardSynergies.mockResolvedValue({groups: [], pairs: {}});
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());
  ```
  - A "late response for the old id" case uses a deferred promise, as `useLiveTuning.test.ts` does.
- **Routing.** Pages render under `createMemoryRouter`, so a test can read `router.state`: the bare `/cards` redirect asserts `historyAction === 'REPLACE'`, as `router.test.tsx` does for `/tuning`. Never use the `MemoryRouter` wrapper there.
  - **The switcher** takes `cards` as a prop, so its test needs no bridge mock.
  - **Its route.** It renders under `createMemoryRouter([{path: 'cards/:cardId?', element: <CardSwitcher cards={CARDS} />}], {initialEntries: ['/cards']})`, so it stays mounted across a pick, as it will on the page.
  - **Timing.** `useAutocomplete` debounces 150 ms (`useAutocomplete.ts:81-95`), so the switcher tests use `userEvent` and `findBy…`.
- **Widths.** jsdom has no ResizeObserver, so `useContainerWidth` stays 0 and every chart lays out at `CHART_FALLBACK_WIDTH` (640). A test that needs another width stubs it, as `CalibrationCharts.test.tsx:15-22` does.
  - The network measures names with `textWidth` (R-40), not the DOM, so it lays out the same in jsdom and the browser.
  - It needs no `getComputedTextLength` patch, and the outline's text-measurement note goes.

**Review focus.** The inputs most likely to bite on real data, each with a test in the task that owns it:
1. **Ties at the 12th partner (R3-4, R3-6c).** Scores are whole numbers. The 12th partner shares its score with a median of 27 others, so the order (score, then name) and the subtitle's tie clause decide what the diagram means.
2. **Unknown ids (R3-7, R3-8).** 60% of log votes touch an id outside the card list. Links resolve ids first, and storage never forgets an id while the list loads or after it fails.
3. **Thin per-card data (R3-6a, R3-6b).** The median voted Core card has 3 raw votes. Every rate, share and split needs its "—" or "No answers yet" state, and `modeText` returns null when the peak is a single vote.
4. **The real `ts` shape (R3-3).** Supabase's `…+00:00` microsecond timestamps, and Sunday votes, bucket into the right Monday week.
5. **State carried across cards (R3-7).** One route element serves every id, so the view's key does the reset. The page test's stand-in view holds a counter: it resets after a partner link, and dropping the key fails it. The network holds its active node by id (R3-4b), so a followed node link leaves no tooltip.

**Decided (2026-10-06).** The outline's twelve open questions, and the audit's own, are settled in the main plan's "Decisions for R3". The owner took every recommendation.

| Question | Decision | Owner (also) |
|---|---|---|
| 1. First visit to `/cards` | R-28: "Pick a card" plus Cards to review; key `inkweave-admin.last-card` | R3-7 (R3-2 `cardsToReview`, R3-5 `lastCard.ts`) |
| 2. An unknown id with votes | R-29: not-found message only, with three causes | R3-7 |
| 3. Switcher search | R-30: `useAutocomplete` as is, `searchCardsByName` for "No cards match." | R3-5 (R3-1 bridges both names) |
| 4. Engine-silent pairs | R-31: a caption split in two, no KPI | R3-6a (R3-3 `engineSilentForCard`) |
| 5. Links into `/cards` | R-33: `cardsHref`, resolved ids only | R3-8 (R3-5 `cardsHref`) |
| 6. Weekly window | R-36: the log's whole span, latest week in the accent | R3-6b (R3-3 `votesPerWeek`) |
| 7. Network size and order | R-37: 12 on two rings, score then name, the tie in the subtitle | R3-4 (R3-4b rings, R3-6c subtitle) |
| 8. The hub's name | R-38: an unnamed dot | R3-4b |
| 9. The split bar's table | R-42: a `src/ui` meter with a printed legend, no tooltip or toggle | R3-4c (R3-6b, R3-6c use it) |
| 10. Histogram colours | Settled by R1 and R2: the score bands | R3-6b |
| 11. Tier split beside the network | Settled by R1 and R2: kept, zero tiers shown | R3-6c |
| 12. Where the network sits | R-39: its own untitled Panel, full width, under the Engine view | R3-6c |
| (new) Accuracy sentiment's source | R-32: raw answers, raw tag | R3-3 (R3-6a's KPI) |
| (new) Rule links to `/calibration` | R-34: each rule in the card's table | R3-6a |
| (new) Low-n rules | R-35: last, then by gap, votes, name; `LowNTag` in `src/ui` | R3-2 (R3-1a moves `LowNTag`, R3-6a shows it) |
| (new) Tier labels | R-44: "Strong ≥7", the app's cut-offs | R3-4 |
| (new) A failed synergy fetch | R-45: Retry | R3-6c (R3-4's `retry`) |
| (new) State across cards | R-46: the view keyed by card id | R3-7 (R3-4b holds the active node by id) |
| (new) Voted pairs beyond 10 rows | R-47: one list that scrolls inside the panel | R3-6a |
| (new) Focus after a card change | R-48: only when its control disappears | R3-7 (R3-1a moves the handoff; R3-5 switcher; R3-6a card `h2`; R3-6c Engine view Retry) |
| (new) Printings in the header | R-49: base rarity only | R3-6a |
| (new) The Overview's headline | R-50: `Verdict.phrase` | R3-5b |
| (new) The tab title | R-51: `documentTitle` | R3-7 |
| (new) A per-card scatter | R-52: not in R3; `CardPair` extends `PairStat` | R3-2 |
| (new) Where GapScale lives | R-53: `src/tools/analytics/GapScale.tsx` | R3-5b |
| (new) DataAsOf | R-54: `src/ui/DataAsOf.tsx`, four pages switched | R3-1a |
| (new) Bridge scope | R-55: only what R3 uses, plus `searchCardsByName` | R3-1 |
| (new) Branch and first commit | R-56: `feature/24-redesign-r3`, plan first | The plan commit (Conventions; R3-1 Step 1 checks it) |
| (new) Network labels and interaction | R-40: `textWidth`; R-41: the kit's dim and `tooltipText` names | R3-4b (R3-6c words the tooltips) |
| (new) How shares print | R-43: `sharePercent` everywhere, moved to `src/ui/format.ts` | R3-1a (R3-4c, R3-6b print through it) |

**Dropped from the outline:**
- **KPIs and windows:**
  - the Engine-silent pairs KPI;
  - the `pairs[]` accuracy sentiment and the `PairStat.accuracySentiment` edit with its four fixture fixes;
  - the 12-week window (`weekWindow`, the literal 12, the `WEEKS_SHOWN` import).
- **The kit:**
  - largest-remainder `sharesOf`;
  - the kit `SplitBar`, its tooltip and its centred form;
  - DOM label measurement and its `fonts.ready` branch;
  - the hub's printed name;
  - the per-node `ariaLabel` and `partnerSentence`.
- **The cards module:**
  - `cards/cardRoutes.ts` (its pieces go to `nav.ts` and `lastCard.ts`);
  - `cardAnalyticsPath`;
  - `Loadable<T>`;
  - the bridged `PrecomputedPairData` and `StrengthTier`.

**Out of scope.**
- **Per-card web stats** (the README §6 follow-up). That work would:
  - add card-id breakdowns to `EVENT_QUERIES` in `scripts/lib/vercelAnalytics.mjs`;
  - query `card_printing_view`;
  - work within Vercel's top-N and 62-day limits.

  It gets its own issue later. R3 changes no pipeline and logs no vote counts.
- **Follow-up issues, drafted in R3-9 for the owner to file:**
  - the Overview's engine-silent KPI hint, "voted, no synergy" (`OverviewKpis.tsx:58-61`), which mostly counts rotation (R-31);
  - the Overview's accuracy sentiment, which rests on 21 pairs (R-32);
  - in the app, the 200 votes stranded on old 13xxx preview ids;
  - `RaritySymbol` for the printings, dropping `PRINTING_SYMBOLS` and the three bridged webps (R3-1's flag);
  - the "Votes: Any / 2+ / 5+" filter R-25 deferred, only if the owner wants it tracked now.

**Task order.** Each task leaves lint, typecheck and tests green. The old ids are kept, so the audit files still map.

| Task | Needs | Decisions | Commit |
|---|---|---|---|
| R3-1 | | R-30, R-55 | `feat(cards): bridge the synergy, tier and autocomplete names and type the vote values (#24)` |
| R3-1a | | R-35, R-43, R-48, R-54 | `refactor(ui): move the pieces R3 shares into src/ui and src/shell (#24)` |
| R3-5b | | R-50, R-53 | `fix(analytics): finish the verdict sentence and share the gap scale (#24)` |
| R3-2 | — | R-28, R-35, R-52 | `feat(cards): add the card calibration model and Cards to review (#24)` |
| R3-3 | R3-1, R3-1a, R3-2 | R-31, R-32, R-36 | `feat(cards): add the card page's raw-vote model, held to the precompute by a parity test (#24)` |
| R3-4 | R3-1, R3-2 and R3-3 (fixtures) | R-37, R-44, R-45 | `feat(cards): add the engine view model and the synergy hook (#24)` |
| R3-4b | R3-1 (`TIER_COLORS`, `getStrengthTier`), R3-4 (stories) | R-37, R-38, R-40, R-41, R-46 | `feat(charts): add the synergy network diagram (#24)` |
| R3-4c | R3-1 (`TIER_COLORS`, stories), R3-1a | R-42, R-43 | `feat(ui): add the split meter (#24)` |
| R3-5 | R3-1, R3-2 (fixtures), R3-4b (AdminStyles) | R-28, R-30, R-33, R-48 | `feat(cards): add the switch-card combobox, cardsHref and the last card viewed (#24)` |
| R3-6a | R3-1a, R3-2, R3-3, R3-5, R3-5b | R-31 to R-35, R-47 to R-49 | `feat(cards): add the card view's header, KPIs, calibration and voted pairs (#24)` |
| R3-6b | R3-3, R3-4c, R3-6a | R-36, R-43 | `feat(cards): add the raw-vote panels (#24)` |
| R3-6c | R3-4, R3-4b, R3-4c, R3-5, R3-6a, R3-6b | R-37, R-39, R-41, R-45, R-48 | `feat(cards): add the engine view and the network panel (#24)` |
| R3-7 | R3-5, R3-6a to R3-6c | R-28, R-29, R-46, R-48, R-51 | `feat(cards): add Card analytics at /cards (#24)` |
| R3-8 | R3-5, R3-7 | R-33 | `feat(cards): link card names on Activity, the Overview and Calibration to their card pages (#24)` |
| R3-9 | every task | | Two commits: `docs: describe Card analytics, the network diagram and the split meter (#24)` (CLAUDE.md), then `docs(plan): record R3 as built (#24)` |

Where a task file's commit step differs from this table, the task file wins.

## Tasks

Each task lives in its own file beside this one, in order. Every task ends with a commit that leaves lint, typecheck and tests green.

| Task | File | Delivers |
|---|---|---|
| R3-1 | [R3-01-bridge.md](R3-01-bridge.md) | The bridged synergy, tier, autocomplete and search names (R-55, R-30); the narrowed vote value types and the three sites they break; `bridgeContract.test.ts` |
| R3-1a | [R3-01a-shared-pieces.md](R3-01a-shared-pieces.md) | `DataAsOf`, `LowNTag`, `sharePercent` and `twoUp` in `src/ui`, the focus handoff in `src/shell`, and `VoteSpan` beside `activityWindow`, with every importer switched and no behaviour change (R-54) |
| R3-5b | [R3-05b-gap-scale.md](R3-05b-gap-scale.md) | `GapScale` in `src/tools/analytics` (R-53), and `Verdict.phrase`, which fixes the Overview's headline (R-50) |
| R3-2 | [R3-02-card-calibration.md](R3-02-card-calibration.md) | `cardStats.ts`: card pairs, calibration, the rules table rows (R-35), the read line and `cardsToReview` (R-28); `cardFixtures.ts` |
| R3-3 | [R3-03-card-votes.md](R3-03-card-votes.md) | `cardVotes.ts`: bound `CardVote`s, the engine-silent split (R-31), the histogram, the answers with raw sentiment (R-32), whole-span weeks (R-36), the span; `cardVotesParity.test.mjs` |
| R3-4 | [R3-04-engine-model.md](R3-04-engine-model.md) | `engineView.ts` (named partners by score, then name, then id, `ruleNames`, summary, `tieAtCut`, tier colours and series) and `useCardSynergies` with `retry` (R-37, R-45); synergy fixtures |
| R3-4b | [R3-04b-network-diagram.md](R3-04b-network-diagram.md) | `networkLayout.ts` and `NetworkDiagram` in the kit, split like `ScatterChart`, with `.adm-net-link` and its stories in `Charts.stories.tsx` (R-37, R-38, R-40, R-41, R-46) |
| R3-4c | [R3-04c-split-meter.md](R3-04c-split-meter.md) | The `src/ui` `SplitMeter`: one bar over the track, with a legend that prints share and count, and a "No answers yet" state (R-42, R-43) |
| R3-5 | [R3-05-switcher.md](R3-05-switcher.md) | `CardSwitcher` on the app's `useAutocomplete` with "No cards match." (R-30), `cardsHref` in `nav.ts`, `lastCard.ts`, `cardSearch.ts`, `.adm-option`, and a story |
| R3-6a | [R3-06a-view-shell.md](R3-06a-view-shell.md) | `CardAnalyticsView`'s shell, card header (R-49), KPIs (R-32), calibration panel with rule links (R-34) and Voted pairs with the engine-silent caption (R-31, R-47) |
| R3-6b | [R3-06b-vote-panels.md](R3-06b-vote-panels.md) | `voteCharts.ts`, `CommunityScores`, `VoterAnswers`, `VotesPerWeek` and `RawVotePanels`: Community scores and How voters answered two-up, Votes per week at full width over the log's whole span (R-36), the raw-votes notice, and the stories |
| R3-6c | [R3-06c-engine-panels.md](R3-06c-engine-panels.md) | `engineCharts.ts` and `EnginePanels`: the Engine view panel (count, cap, tier split, Retry) and the full-width network panel with its tie subtitle (R-37, R-39, R-45); `Panel`'s `titleFocusable` (R-48); the stories |
| R3-7 | [R3-07-route-page.md](R3-07-route-page.md) | `CardAnalyticsPage` at `cards/:cardId?`: `cardPageState`, the prompt with Cards to review (R-28), the view keyed by card (R-46), Retry and focus (R-48), the tab title (R-51), the nav item, and the CLAUDE.md and PLAN.md route lines |
| R3-8 | [R3-08-card-links.md](R3-08-card-links.md) | Card-name links into `/cards` for resolved ids: Activity's vote log and Most voted pairs, the Overview's Latest votes and Calibration's vote-detail heading (R-33) |
| R3-9 | [R3-09-docs-check.md](R3-09-docs-check.md) | Checks the plan commit's records against the code and records departures in "R3 as built"; CLAUDE.md's kit, primitive and route lines; the follow-up issue drafts; `analyze_change_set`; and the owner's real-data check |

- **R3-8's vote-detail heading.** R3-8 widens `Panel`'s `title` to `React.ReactNode`, and the heading carries the card links (`PairNames`).
- **R3-9's real-data check.** It covers:
  - names dropped by the `textWidth` estimate (R-40);
  - the network's tie subtitle (R-37);
  - Cards to review (R-28);
  - the weekly bars' density over the whole span (R-36);
  - the engine-silent split (R-31);
  - the raw sentiment against the Overview's (R-32);
  - the links in (R3-8);
  - the tab title;
  - focus after a partner link;
  - the not-found copy on a rotated id;
  - the layout at 1440px and 1366px.

  With the deployment's files in `public/admin-data/`, this command prints one boolean and never a count. It must print `true` for the histogram identity to hold on real data:
  ```bash
  node --input-type=module -e "import fs from 'node:fs'; const read = (f) => JSON.parse(fs.readFileSync('public/admin-data/' + f, 'utf8')); const {pairs} = read('vote-analytics.json'); const {votes} = read('vote-log.json'); const key = (a, b) => (a < b ? a + ':' + b : b + ':' + a); const scored = new Map(); for (const v of votes) if (v.score != null) scored.set(key(v.a, v.b), (scored.get(key(v.a, v.b)) ?? 0) + 1); console.log('every pairs[] row has exactly its score votes in the log:', pairs.every((p) => scored.get(key(p.a, p.b)) === p.scoreVotes));"
  ```
  A `false` can be a vote cast between the precompute's two reads: it reads `pair_scores` (`precompute-vote-analytics.mjs:127`) before `votes` (`:131`), so such a vote leaves the log one score vote ahead of its `pairs[]` row. Re-run Deploy and check again before treating it as a bug.
