> Part of [R: Admin redesign](../R-redesign.md), phase R3 ([R3-card-analytics.md](R3-card-analytics.md)). Read the main plan's decisions (R-28 to R-56 for R3), corrections, global constraints and shared interfaces, then the R3 header, first.

> **Re-base notes (R3-6a, 2026-10-06).** Re-based from the outline's "Task R3-6: Card analytics view" (`R3-card-analytics.md:2145-2715`, written 2026-10-01 against the planned R1 code) onto main @ `aea40b4` (R1 and R2 as built, PRs #25, #27 and #28), pin `upstream/inkweave` @ `bc877e1`, the audit (`audit-R3-6.json`) and decisions R-28 to R-56. What changed and why:
> 1. **R3-6 is three tasks.** This one builds `CardAnalyticsView` with the card header, the KPI row, "Calibration for this card" and "Voted pairs". R3-6b adds the three raw-vote panels and R3-6c the Engine view and the network. Each ends green with its own stories.
>    - So the view's props here have no `synergies`: R3-6c adds `synergies: UseCardSynergiesReturn`. This task needs nothing from R3-4.
>    - The outline's `cardName` and `partnerLabel` go. The view takes the card list's own `getCardById` (the header's contract addition 14), and gets R-31's "is the partner listed?" and R-33's "link only to cards the list holds" from that one lookup.
>    - `Loadable<T>` goes. The props are the hooks' own `UseVoteAnalyticsReturn` and `UseVoteLogReturn` (`useVoteAnalytics.ts:5-9`, `useVoteLog.ts:5-9`), as `CalibrationWorkspace.tsx:40-41` takes them.
> 2. **The rarity (R-49, the audit's blocking item).** The outline drew `<RaritySymbol rarity={card.rarity.toLowerCase()}>` and expected Enchanted to draw nothing. At the pin, RaritySymbol draws Enchanted, Epic and Iconic too (`RaritySymbol.tsx:12-21`), so that test and the LowN story would have failed. The header now goes through `rarityConfigOf` (`app-bridge.ts:56`), as `BreakdownCards.tsx:49-50` does: the glyph and the config's name ("Super rare") for the five base rarities, and nothing otherwise. The tests cover "Super Rare" (a key with a space), a card with no rarity, and a card whose `rarity` reads "Enchanted".
> 3. **Fixtures (the audit's other blocking item).** They go in `cards/cardFixtures.ts`, the plain module R3-2 creates, because the stories need them (`chartFixtures.ts:5-12`). This task appends:
>    - the cards: `MAUI_CARD` (Super Rare, a thumbnail, collector number 113) and `CARD_500` (no version, rarity, number or image; two inks; an uninkable action);
>    - Maui's raw votes, `MAUI_LOG`. The 14 on its `pairs[]` partners match R3-2's `CARD_PAIRS`, so R3-3's histogram identity holds for Maui too: 17 scored votes = 14 + 3 engine-silent;
>    - the two files and the card list: `VIEW_ANALYTICS`, `NO_RAW_ANALYTICS`, `VIEW_LOG`, `EMPTY_LOG`, `VIEW_CARDS` and `viewCard`;
>    - the hook states: `loaded(data)`, `LOADING` and `NOT_GENERATED`.
>
>    Gramma Tala (2001) is left out of the card list on purpose, so one voted pair has no page to link to (R-33). Every builder takes one object.
> 4. **KPIs (R-31, R-32).**
>    - There is no Engine-silent KPI. Voted pairs captions that count instead.
>    - Accuracy sentiment comes from the card's raw accuracy answers (R3-3's `AccuracyAnswers.sentiment`), with the raw tag and the answer count in its hint. The outline's `pairs[]` sentiment, with no tag, goes: `pairs[]` has one on 21 of 954 pairs.
>    - Distinct voters keeps its raw tag, with "N raw votes" as its hint.
>    - The calibration four show only for a card with a voted pair. The raw two show only when the log holds a vote on the card, so they still show when vote analytics fails.
>    - The row is the Overview's (`OverviewKpis.tsx:45-47`, 170px cards).
> 5. **The verdict.** It reads `verdictGap(cal)` (R3-2): the mean gap to two places, or null under `MIN_RULE_VOTES`. That is the header's "round once" rule, kept in the model, so the verdict, the scale's dot and the printed gap agree.
>    - The headline is "The engine {phrase} on this card", or "The engine has too few score votes to judge this card", through R3-5b's `Verdict.phrase` (R-50). The outline's `verdict.word === 'well-calibrated' ? …` special case goes.
>    - `GapScale` comes from `../GapScale` (R-53).
>    - The two doc comments R3-5b handed on are updated here: `GapScale`'s names the card page's text twin of the gap, and `verdictFor`'s names the card page.
> 6. **The rules table (R-34, R-35).**
>    - Each rule name links to `/calibration?rule=<id>` through `calibrationHref` (`nav.ts:48-50`).
>    - The order is `rulesForCard`'s (R3-2): rules with enough votes first, then by |gap|, score votes and name.
>    - "low n" is R2's chip, moved to `src/ui/LowNTag` by R3-1a, given `MIN_RULE_VOTES`.
>    - The columns are the prototype's "Rule on its pairs", Bias, Gap and Pairs (`dc.html:611`), plus **Votes**. The order and the "low n" chip both turn on score votes, and `/calibration`'s rules table prints them too.
> 7. **Voted pairs (R-47, R-33, R-31).**
>    - It uses R2's `PairList` pattern: every pair, in a list that scrolls inside the panel past about ten rows (`PairList.tsx:33-39`'s 384px). The outline's "first 10 rows, then Show all N" and its focus problem go.
>    - It is a `<table>`, because the four columns need their heads. The head is sticky on an opaque fill (`adminTheme.ts:39-40`), so the columns stay named while the rows scroll.
>    - The scroller has a top scroll padding of 40px (`SPACING.xxxl + SPACING.sm`). So a partner link that Shift+Tab scrolls to the top lands below the 32.5px head with its 4px focus ring whole (WCAG 2.2, 2.4.11).
>    - A partner links to `cardsHref(id)` only when the card list holds it. Gramma Tala's row stays plain text.
>    - "Engine → community" prints through `scoreText`, as `PairList.tsx:125` does, and the gap is coloured with `gapColor`.
>    - The caveat is the prototype's per-card one (`dc.html:619`).
>    - **The engine-silent caption (R-31).** It is built from R3-3's `partnerUnlisted` and `partnerListed`, in R2's scatter wording (`CalibrationScatter.tsx:131`): "Not listed: 3 engine-silent pairs (voted, but the engine gives them no score): 2 with a card outside the current card list, 1 with both cards in Core."
>      - Without raw votes, it reads "Engine-silent pairs aren't listed, and counting them needs raw votes."
>      - It says nothing while the log is loading or after it failed, or when the count is zero, as R2's scatter does at zero.
> 8. **Focus (R-48).**
>    - The header's `h2` has `tabIndex={-1}` and takes the page's handoff through `useTakeHandoff` (moved to `src/shell/focusHandoff.ts` by R3-1a).
>    - Its links don't ask. R3-7's `useCardHandoff` asks when the URL names another card, because a click-time request is taken by the old card's h2 before the transition commits. The next card's `h2` then takes focus once the keyed view remounts (R3-7 keys it, R-46), unless focus has moved meanwhile.
>    - The outline's per-panel key goes. R3-7 keys the whole view.
> 9. **States.**
>    - The analytics notice is the Overview's, word for word (`OverviewView.tsx:33-36`).
>    - A card in no `pairs[]` row gets one notice, "No score votes on pairs the engine scores yet.", plus its engine-silent caption when it has one.
>    - The header never waits for a vote file.
> 10. **Layout.**
>     - The view is OverviewView's single-column grid.
>     - Calibration sits beside Voted pairs at `twoUp(420)`, the prototype's track (`dc.html:600`), from `src/ui/layout.ts` (R3-1a).
>     - Both tables keep a link's focus ring clear of what clips. The rules table's scroller reaches 4px into the panel's padding, and the pairs' first column pads 16px. The pairs' scroll padding keeps it clear of the sticky head too (note 7).
> 11. **`DataAsOf` (R-54).** The view prints none: it belongs to R3-7's `PageLayout` meta. The stories frame the view in that header, with `<DataAsOf>` as its meta once vote analytics loads, so they show the page as R3-7 builds it.
>     - **The stories' title** is the leaf `Admin/Insights/Card analytics/View`, as the R3 header asks, so no title is both a component and a group. The other `cards/` story files sit beside it: R3-5's `…/Switcher`, R3-6b's `…/Raw-vote panels`, R3-6c's `…/Engine panels` and R3-7's `…/Page states`.
> 12. **Shared styles.** `cards/cardStyles.ts` holds the muted `CAPTION` (the audit counted three near-copies already), the table cells and the accent `LINK` (PanelLink's colour). R3-6b and R3-6c reuse `CAPTION`.
> 13. **Code Health.**
>     - Every function sits at cyclomatic complexity 5 or less, and every function takes one argument except `calibrationData(analytics, cardId)`.
>     - By the server's count, `cardView.ts` has 1 primitive parameter in 8. `cardFixtures.ts` stays under 30%: after R3-4's engine block it has 2 or 3 in about 14 (R3-4's `ruleIdOf`, `engineFixture`'s `nameOf` lambda if it is counted, and this task's `viewCard`).
>     - The view test's named helpers take at most one argument, and `onePair` takes an object (`onePair({gap, scoreVotes})`). That leaves 2 primitives in 4 helpers that take one: `kpi`'s `label` and `handoffOf`'s `pending`. The server's gate has failed R1 and R2 on primitives before.
>     - The view is composition only. The derivations are pure and tested in `cardView.ts`: `calibrationData`, `calibrationOf`, `rawVotesFor`, `votesOnCard`, `rawFigures`, `silentNote` and `cardFacts`.
>     - The KPIs split into `CalibrationKpis` and `RawKpis`, and the header into `CardHeader`, `CardFacts` and `CardRarity`.
> 14. **Citations re-checked.**
>     - `verdictFor`'s in-band verdict is `verdict.ts:37` after R3-5b. `VerdictHero.tsx` was deleted in R2-7.
>     - `smallImageUrl` is at upstream `loader.ts:78-87`, and the thumbnail is `dc.html:578`.
>     - Consumes adds `rarityConfigOf` and drops `getStrengthTier`, which is R3-6c's.
> 15. **Not taken.**
>     - A per-card scatter (R-52).
>     - The outline's "Show all N" (R-47).
>     - `cardAnalyticsPath`: R3-5 named it `cardsHref`, in `nav.ts`.
>     - A U+2212 check on "Engine → community". Its scores are 1 to 10, so only the gaps can be negative, and those are tested.
> 16. **Verified (2026-10-06)** in `scratchpad/r3-rebase/sandbox-R3-6a`, and again after the review in `sandbox-R3-6a-fix` (the same setup, with the review's fixes).
>     - **Setup.**
>       - A copy of `src` at `aea40b4`, with junctions to the repo's `node_modules` and `upstream/`, and Vite's cache in the sandbox. The repo was not touched.
>       - The prerequisite tasks were laid over it: R3-1's bridge and vote types, R3-1a's sandbox draft (`DataAsOf`, `LowNTag`, `twoUp`, `sharePercent`, `src/shell/focusHandoff.ts`, `VoteSpan`), R3-5b's `GapScale` and `phrase`, and R3-5's `cardsHref`, switcher and `lorcanaCard`.
>       - R3-2's `cardStats.ts` and R3-3's `cardVotes.ts` are byte-identical to the code blocks in R3-02-card-calibration.md and R3-03-card-votes.md. `cardFixtures.ts` was R3-2's, then R3-3's and R3-5's appended blocks.
>     - **Failing first.** Step 4 and Step 8 fail on the missing module, with the messages quoted there. Then `cardView.test.ts` passes 20 tests and `CardAnalyticsView.test.tsx` 33.
>     - **The whole suite.** `vitest run src` gives 103 files and 1,224 tests passed. `tsc -p tsconfig.app.json --noEmit` exits 0, with the stories.
>       - One of two runs saw R3-5's CardSwitcher case "waits for the open list to close" fail under the whole suite's load. It passed alone (14 of 14) and on the next run. This task doesn't touch it.
>     - **Lint.** `pnpm exec eslint --max-warnings 0 --stdin`, run from the repo, is clean on every new or changed file.
>     - **Mutants.** 26 were tried, the draft's 20 and six from the review's re-check. The two test files killed all of them:
>       - the handoff take, and the header waiting for vote analytics to load;
>       - the headline's "on", and the dot from the unrounded gap;
>       - the listed check, the split's two counts swapped, the zero and no-raw captions, and `hasRawVotes`;
>       - the no-pairs notice without its engine-silent count;
>       - `rarityConfigOf` replaced by the outline's lowercase key, and a glyph drawn for a printing (Enchanted);
>       - voters counted as votes, and zeros in place of no raw figures;
>       - the empty-pairs guard, the low-n colour and hint, the "low n" chip, and rule links by name;
>       - `scoreText`, the gap colour, the scroller, and its scroll padding (removed, or cut to 32px);
>       - the collector-number and second-ink guards.
>     - **Focus after a partner link.** A stand-in page under `createMemoryRouter` keys the view and asks for the handoff in render when the card id changes, as R3-7's `useCardHandoff` does. Following the Moana link then focuses Moana's `h2`, with `userEvent` and with `fireEvent` (2 of 2). With the draft's click-time request, focus fell to `<body>` (the review's `sandbox-R3-6a-adv`).
>     - **Stories.** All nine render in jsdom through `composeStories`, and `axe-core` 4.13 finds no violations in any of them. Colour contrast can't be computed in jsdom, so Step 18 checks it in Storybook. Default's header meta reads "Data as of 2026-10-06", and ManyPairs draws 19 pair rows.
>     - **CodeScene.** The local MCP 1.1.3 scores the nine files that have functions 10.0, with no findings, and again after the review's changes. The stories and `cardStyles.ts` have none, so they get no score. The server is stricter, so R3-9 runs `analyze_change_set` before the push.
>     - **R3-1a.** The sandbox used R3-1a's draft. `R3-01a-shared-pieces.md` (written alongside) gives the same names and signatures: `DataAsOf`, `LowNTag({minVotes})`, `twoUp(track)` in `src/ui/layout.ts`, and `src/shell/focusHandoff.ts`. Step 1 checks them.

### Task R3-6a: The view shell, card header, KPIs, calibration panel and Voted pairs

**Files:**
- Create (all under `src/tools/analytics/cards/`):
  - `cardView.ts`, the view's pure derivations, and `cardStyles.ts`, the shared cell, link and caption styles;
  - `CardAnalyticsView.tsx`, `CardHeader.tsx`, `CardKpis.tsx`, `CardCalibrationPanel.tsx` and `VotedPairsPanel.tsx`;
  - `CardAnalyticsView.stories.tsx`.
- Test, create: `src/tools/analytics/cards/__tests__/cardView.test.ts` and `src/tools/analytics/cards/__tests__/CardAnalyticsView.test.tsx`.
- Modify `src/tools/analytics/cards/cardFixtures.ts`: two type imports widened, and the view's fixtures appended.
- Modify two doc comments that R3-5b handed on: `src/tools/analytics/GapScale.tsx` and `src/tools/analytics/verdict.ts`.

**Interfaces:**
- **Consumes:**
  - **R3-2** (`cards/cardStats.ts`): `pairsForCard(pairs, cardId): CardPair[]`, `cardCalibration(cardPairs): CardCalibration`, `verdictGap(cal): number | null`, `cardReadLine(cal): string` and `rulesForCard(cardPairs, rules): CardRuleRow[]` (`CardRuleRow.meanGap` is `number | null`).
  - **R3-3** (`cards/cardVotes.ts`): `votesForCard(votes, cardId): CardVote[]`, `engineSilentForCard(cardVotes, cardPairs, isListed): EngineSilent` (`{pairs, votes, partnerUnlisted: {pairs, votes}, partnerListed: {pairs, votes}}`), `cardAnswers(cardVotes)` and `cardVoteSpan(cardVotes): CardVoteSpan | null`.
  - **R3-5:** `cardsHref(cardId?)` (`src/shell/nav.ts`), and `lorcanaCard(seed)` in `cardFixtures.ts`.
  - **R3-5b:** `GapScale({meanGap, color})` (`src/tools/analytics/GapScale.tsx`), and `Verdict.phrase` from `verdictFor`.
  - **R3-1a:**
    - `DataAsOf({generatedAt})` (`src/ui/DataAsOf.tsx`), in the stories only;
    - `LowNTag({minVotes})` (`src/ui/LowNTag.tsx`);
    - `twoUp(track)` (`src/ui/layout.ts`);
    - `FocusHandoff` and `useTakeHandoff(handoff, container, selector, ready?)` (`src/shell/focusHandoff.ts`).
  - **R1 and R2:**
    - `calibrationHref(ruleId?)` (`nav.ts:48-50`);
    - `scoreText(n)` (`calibration/chartData.ts:55-57`) and `gapColor(gap)` (`gapColor.ts:13`);
    - `countOf(n, noun)` (`activityModel.ts:61`) and `MIN_RULE_VOTES` (`overviewStats.ts:11`);
    - `verdictFor` (`verdict.ts`);
    - `KpiCard`, `RawTag`, `Panel`, `Notice`, `BiasBar` and `fmtGap`/`fmtInt`/`fmtScore` (`src/ui`);
    - `PageLayout`, in the stories only;
    - `UseVoteAnalyticsReturn` and `UseVoteLogReturn`.
  - **The bridge:** `FONTS`, `SPACING`, `TRUNCATE`, `LETTER_SPACING`, `InkIcon` (`app-bridge.ts:44`), `smallImageUrl` (`:52`), `RaritySymbol` (`:55`) and `rarityConfigOf` (`:56`), plus `CtaButton`, in the stories only. The line numbers are main's, before R3-1's edits.
  - `type LorcanaCard` from `inkweave-synergy-engine`, as `CardImagePicker.tsx:2` imports it. `Link` from `react-router-dom`.
- **Produces:**
```ts
// src/tools/analytics/cards/CardAnalyticsView.tsx
export interface CardAnalyticsViewProps {
  card: LorcanaCard;
  analytics: UseVoteAnalyticsReturn;
  voteLog: UseVoteLogReturn;
  getCardById: (id: string) => LorcanaCard | undefined;   // R-31's isListed and R-33's resolved-only links
  handoff?: FocusHandoff;                                 // the page's (R-48): the card header's h2 takes it
  headerActions?: React.ReactNode;                        // R4's "Edit in Card studio"
}                                                         // R3-6c adds synergies: UseCardSynergiesReturn
export function CardAnalyticsView(props: CardAnalyticsViewProps);   // R3-7 renders it with key={card.id} (R-46)

// src/tools/analytics/cards/cardView.ts: pure; R3-6b reads rawVotesFor and votesOnCard too
export interface CardCalibrationData {cardPairs: CardPair[]; rules: readonly RuleStat[]}
export function calibrationData(analytics: VoteAnalytics | null, cardId: string): CardCalibrationData | null;
export function calibrationOf(data: CardCalibrationData | null): CardCalibration | null;   // null: not loaded, or no voted pair
export type RawVotes = {kind: 'waiting'} | {kind: 'none'} | {kind: 'card'; cardVotes: CardVote[]};
export interface RawVotesInput {analytics: VoteAnalytics | null; voteLog: VoteLog | null; cardId: string}
export function rawVotesFor(input: RawVotesInput): RawVotes;   // 'none': hasRawVotes false, or an empty log; 'waiting': no log yet
export function votesOnCard(raw: RawVotes): CardVote[];
export interface RawFigures {votes: number; voters: number; sentiment: number | null; answered: number}
export function rawFigures(cardVotes: readonly CardVote[]): RawFigures | null;   // null: nobody voted on the card
export const NO_RAW_SILENT_NOTE: string;   // "Engine-silent pairs aren't listed, and counting them needs raw votes."
export interface SilentNoteInput {raw: RawVotes; cardPairs: readonly CardPair[]; isListed: (cardId: string) => boolean}
export function silentNote(input: SilentNoteInput): string | null;   // R-31's split; null while waiting, or at zero
export function cardFacts(card: Pick<LorcanaCard, 'type' | 'cost' | 'inkwell'>): string;   // "Character · cost 3 · inkable"

// src/tools/analytics/cards/cardStyles.ts
export const CAPTION, HEAD_CELL, CELL, NUMBER, LINK, CELL_LINK: React.CSSProperties;

// The view's parts, each file's only export
export function CardHeader(props: {card: LorcanaCard; actions?: React.ReactNode; handoff?: FocusHandoff});
export function CardKpis(props: {calibration: CardCalibrationData | null; raw: RawVotes});
export function CardCalibrationPanel(props: {cardPairs: readonly CardPair[]; rules: readonly RuleStat[]});
export function VotedPairsPanel(props: {cardPairs: readonly CardPair[]; isListed: (cardId: string) => boolean; note: string | null});   // its links don't ask for the handoff (R3-7 does)

// src/tools/analytics/cards/cardFixtures.ts (appended; tests and stories only)
export function loaded<T>(data: T): {data: T; loading: false; error: null};
export const LOADING, NOT_GENERATED;   // {data: null, loading: true, error: null}; {…, error: new Error('HTTP 404')}
export const MAUI_CARD: LorcanaCard;   // CARD_ID, Super Rare, #113, a thumbnail
export const CARD_500: LorcanaCard;    // VOTED_CARD: no version, rarity, number or image; Amber and Sapphire
export const MAUI_UNLISTED: readonly string[];   // ['412', '418']
export const MAUI_LOG: readonly VoteLogRow[];    // 18 votes, 10 voters
export const VIEW_LOG: VoteLog;                  // VOTED_CARD_LOG + MAUI_LOG
export const VIEW_ANALYTICS: VoteAnalytics;      // CARD_PAIRS + VOTED_CARD_PAIRS, CARD_RULES
export const NO_RAW_ANALYTICS: VoteAnalytics; export const EMPTY_LOG: VoteLog;
export const VIEW_CARDS: readonly LorcanaCard[]; // no 2001 (Gramma Tala), no MAUI_UNLISTED, no UNLISTED_IDS
export function viewCard(id: string): LorcanaCard | undefined;
```

**What the fixtures give the tests** (Maui, `CARD_ID` 1046; R3-2's table has its pairs):

| | Maui (`MAUI_CARD`) | Card 500 (`CARD_500`) |
|---|---|---|
| Score votes, pairs voted | 14, 5 | 4, 2 |
| Mean gap, verdict | −1.00, runs generous (`COLORS.error`) | +0.25, too few to judge |
| Engine → community | 7.5 → 6.5 | 7.0 → 7.3 |
| Raw votes, voters | 18, 10 | 11, 8 |
| Accuracy answers, sentiment | 5, −0.40 | 4, −0.25 |
| Engine-silent pairs: unlisted, listed | 2 (412, 418), 1 (1050) | 1 (305), 1 (710) |
| Rules, in order | Ramp (12 votes, −1.17); then low n: Singer + Songs (−2.50), Location Boost (−2.00), Shift Targets (+2.00), retired-rule (0.00) | low n: Shift Targets (+0.50), Ramp (+0.25) |

- [ ] **Step 1: Check what this task builds on**

From the repo root, on `feature/24-redesign-r3`:
```bash
grep -nE "export function (pairsForCard|cardCalibration|verdictGap|cardReadLine|rulesForCard)" src/tools/analytics/cards/cardStats.ts
grep -nE "export function (votesForCard|engineSilentForCard|cardAnswers|cardVoteSpan)|partnerUnlisted: SilentCount" src/tools/analytics/cards/cardVotes.ts
grep -nE "export (function (pairStat|voteRow|lorcanaCard)|const (CARD_ID|CARD_PAIRS|CARD_RULES|VOTED_CARD|VOTED_CARD_LOG|VOTED_CARD_PAIRS|UNLISTED_IDS))\b" src/tools/analytics/cards/cardFixtures.ts
grep -n "export function cardsHref" src/shell/nav.ts
grep -nE "export function (useTakeHandoff|useFocusHandoff)" src/shell/focusHandoff.ts
grep -n "export function twoUp" src/ui/layout.ts
grep -n "export function LowNTag({minVotes}" src/ui/LowNTag.tsx
grep -n "export function DataAsOf" src/ui/DataAsOf.tsx
grep -n "phrase: string" src/tools/analytics/verdict.ts
grep -n "export function GapScale" src/tools/analytics/GapScale.tsx
```
Expected:
- the first grep prints 5 lines, and the second 5;
- the third prints 10 lines;
- each of the rest prints 1 line, except `focusHandoff.ts`, which prints 2.

If one prints nothing, stop. R3-1a, R3-2, R3-3, R3-5 or R3-5b hasn't landed, or it named something differently. Adjust the imports below to the names it chose before going on. For R3-1a, the names in the R3 header's contract addition 3 are the ones assumed here.

On a fresh checkout, or after a pin bump, run `pnpm build:engine` once first: these tests reach the bridge and the engine.

- [ ] **Step 2: Add the view's fixtures**

In `src/tools/analytics/cards/cardFixtures.ts`, widen the two type imports. Before:
```ts
import type {PairStat, RuleStat} from '../voteAnalyticsTypes';
import type {VoteLogRow} from '../voteLogTypes';
```
After:
```ts
import type {PairStat, RuleStat, VoteAnalytics} from '../voteAnalyticsTypes';
import type {VoteLog, VoteLogRow} from '../voteLogTypes';
```

At the end of the file (after R3-5's `SWITCHER_CARDS`), append:
```ts
/*
 * The card page's view (R3-6a): the cards it opens, Maui's raw votes, and the
 * two vote files and the card list it reads. Maui (CARD_ID) has enough score
 * votes to judge, and card 500 (VOTED_CARD) too few. Maui has three
 * engine-silent pairs, two of them with a partner outside the card list, so
 * the caption's two counts differ; card 500 has one of each.
 */

/** A hook's settled state, as useVoteAnalytics and useVoteLog return it. */
export function loaded<T>(data: T): {data: T; loading: false; error: null} {
  return {data, loading: false, error: null};
}

/** A vote file still loading. */
export const LOADING = {data: null, loading: true, error: null} as const;

/** A vote file that couldn't be read: the 404 of an artifact Deploy hasn't written (local dev). */
export const NOT_GENERATED = {data: null, loading: false, error: new Error('HTTP 404')} as const;

/** Maui, as the card list has it: a Super Rare (R-49), whose thumbnail URL isn't an AVIF, so smallImageUrl keeps it. */
export const MAUI_CARD = lorcanaCard({
  id: CARD_ID,
  name: 'Maui',
  version: 'Hero to All',
  ink: 'Ruby',
  cost: 8,
  rarity: 'Super Rare',
  setCode: '1',
  setNumber: 113,
  imageUrl: 'https://placehold.co/64x90/1a1a2e/d4af37?text=Maui',
});

/** Card 500: a preview with no version, rarity, collector number or image, in two inks. */
export const CARD_500 = lorcanaCard({id: VOTED_CARD, name: 'Card 500', ink2: 'Sapphire', inkwell: false, type: 'Action'});

/** Maui's partners outside the card list: cards that rotated out of Core. */
export const MAUI_UNLISTED: readonly string[] = ['412', '418'];

/** One of Maui's raw votes with `partner`, the lower id on side a as the votes table stores it. */
function mauiVote({partner, ...rest}: Partial<VoteLogRow> & Pick<VoteLogRow, 'ts'> & {partner: string}): VoteLogRow {
  const [a, b] = partner < CARD_ID ? [partner, CARD_ID] : [CARD_ID, partner];
  return voteRow({a, b, ...rest});
}

/**
 * Maui's 18 raw votes from 10 voters. The 14 on its pairs[] partners match
 * CARD_PAIRS (Moana's six average 5.5, Heihei's four 7.25), one Heihei vote is
 * a quick vote, and three are engine-silent: Kakamora (1050) is in the card
 * list, the two MAUI_UNLISTED partners aren't. Five votes answer the accuracy
 * question: three "too high", one "right", one "too low", so the sentiment is
 * −0.40.
 */
export const MAUI_LOG: readonly VoteLogRow[] = [
  mauiVote({partner: '1012', ts: '2026-09-01T10:00:00.123456+00:00', score: 5, accuracy: -1, voter: 11}),
  mauiVote({partner: '1012', ts: '2026-09-03T10:00:00.123456+00:00', score: 6, accuracy: -1, voter: 12}),
  mauiVote({partner: '1012', ts: '2026-09-09T10:00:00.123456+00:00', score: 5, accuracy: -1, voter: 13}),
  mauiVote({partner: '1012', ts: '2026-09-15T10:00:00.123456+00:00', score: 6, accuracy: 0, voter: 14}),
  mauiVote({partner: '1012', ts: '2026-09-21T10:00:00.123456+00:00', score: 5, voter: 15}),
  mauiVote({partner: '1012', ts: '2026-09-29T10:00:00.123456+00:00', score: 6, voter: 16}),
  mauiVote({partner: '1033', ts: '2026-09-10T10:00:00.123456+00:00', score: 4, voter: 11}),
  mauiVote({partner: '1102', ts: '2026-09-05T10:00:00.123456+00:00', score: 7, voter: 11}),
  mauiVote({partner: '1102', ts: '2026-09-12T10:00:00.123456+00:00', score: 7, voter: 12}),
  mauiVote({partner: '1102', ts: '2026-09-19T10:00:00.123456+00:00', score: 7, accuracy: 1, voter: 13}),
  mauiVote({partner: '1102', ts: '2026-09-26T10:00:00.123456+00:00', score: 8, voter: 14}),
  mauiVote({partner: '1102', ts: '2026-10-02T10:00:00.123456+00:00', score: null, voter: 17}),
  mauiVote({partner: '1187', ts: '2026-09-17T10:00:00.123456+00:00', score: 7, voter: 15}),
  mauiVote({partner: '2001', ts: '2026-09-22T10:00:00.123456+00:00', score: 9, voter: 16}),
  mauiVote({partner: '2001', ts: '2026-09-30T10:00:00.123456+00:00', score: 9, voter: 17}),
  mauiVote({partner: '1050', ts: '2026-10-01T10:00:00.123456+00:00', score: 6, voter: 18}),
  mauiVote({partner: MAUI_UNLISTED[0], ts: '2026-10-05T10:00:00.123456+00:00', score: 3, voter: 19}),
  mauiVote({partner: MAUI_UNLISTED[1], ts: '2026-10-05T11:00:00.123456+00:00', score: 2, voter: 20}),
];

const VIEW_VOTES: readonly VoteLogRow[] = [...VOTED_CARD_LOG, ...MAUI_LOG];
const VIEW_VOTERS = new Set(VIEW_VOTES.map((vote) => vote.voter)).size;

/** vote-log.json for the view: card 500's log and Maui's votes. */
export const VIEW_LOG: VoteLog = {generatedAt: '2026-10-06T09:00:00Z', votes: [...VIEW_VOTES], voterCount: VIEW_VOTERS};

/**
 * vote-analytics.json for the view: Maui's pairs and card 500's, and the rules
 * they name. The global numbers only have to be plausible: the view prints
 * none of them.
 */
export const VIEW_ANALYTICS: VoteAnalytics = {
  generatedAt: '2026-10-06T09:00:00Z',
  hasRawVotes: true,
  global: {
    totalVotes: VIEW_VOTES.length,
    distinctPairs: 14,
    distinctVoters: VIEW_VOTERS,
    meanGap: -0.62,
    accuracySentiment: null,
    engineSilentPairs: 5,
    weekly: [],
    dimensionFill: null,
  },
  rules: [...CARD_RULES],
  pairs: [...CARD_PAIRS, ...VOTED_CARD_PAIRS],
};

/** The same deploy without the service-role key: no raw votes, an empty log. */
export const NO_RAW_ANALYTICS: VoteAnalytics = {...VIEW_ANALYTICS, hasRawVotes: false};
export const EMPTY_LOG: VoteLog = {generatedAt: VIEW_LOG.generatedAt, votes: [], voterCount: 0};

/**
 * The current card list. Gramma Tala (2001) is missing, as a card is around a
 * release: its pair keeps a plain name. So are MAUI_UNLISTED and UNLISTED_IDS,
 * the engine-silent partners outside Core.
 */
export const VIEW_CARDS: readonly LorcanaCard[] = [
  MAUI_CARD,
  CARD_500,
  lorcanaCard({id: '1012', name: 'Moana', version: 'Of Motunui', ink: 'Amber'}),
  lorcanaCard({id: '1033', name: 'Tamatoa', version: 'So Shiny!', ink: 'Steel'}),
  lorcanaCard({id: '1050', name: 'Kakamora', version: 'Boarding Party', ink: 'Steel'}),
  lorcanaCard({id: '1102', name: 'Heihei', version: 'Boat Snack', ink: 'Ruby'}),
  lorcanaCard({id: '1187', name: 'Pua', version: 'Potbellied Buddy', ink: 'Amber'}),
  lorcanaCard({id: '120', name: 'Card 120'}),
  lorcanaCard({id: '640', name: 'Card 640'}),
  lorcanaCard({id: '710', name: 'Card 710'}),
  lorcanaCard({id: '880', name: 'Card 880'}),
];

const VIEW_CARDS_BY_ID = new Map(VIEW_CARDS.map((card) => [card.id, card]));

/** The card list's getCardById over VIEW_CARDS. */
export function viewCard(id: string): LorcanaCard | undefined {
  return VIEW_CARDS_BY_ID.get(id);
}
```

Run: `pnpm exec tsc -p tsconfig.app.json --noEmit`
Expected: exit 0.

- [ ] **Step 3: Write the failing tests for `cardView.ts`**

Create `src/tools/analytics/cards/__tests__/cardView.test.ts`:
```ts
import {describe, expect, it} from 'vitest';
import {
  CARD_ID,
  CARD_PAIRS,
  CARD_RULES,
  EMPTY_LOG,
  MAUI_LOG,
  NO_RAW_ANALYTICS,
  VIEW_ANALYTICS,
  VIEW_LOG,
  VOTED_CARD,
  lorcanaCard,
  viewCard,
} from '../cardFixtures';
import {pairsForCard} from '../cardStats';
import {votesForCard} from '../cardVotes';
import {
  NO_RAW_SILENT_NOTE,
  calibrationData,
  calibrationOf,
  cardFacts,
  rawFigures,
  rawVotesFor,
  silentNote,
  votesOnCard,
  type RawVotes,
} from '../cardView';

const isListed = (id: string) => viewCard(id) !== undefined;
const MAUI_PAIRS = pairsForCard(CARD_PAIRS, CARD_ID);
const MAUI_VOTES: RawVotes = {kind: 'card', cardVotes: votesForCard(MAUI_LOG, CARD_ID)};

describe('calibrationData', () => {
  it("is null until vote analytics loads, then the card's pairs and every rule", () => {
    expect(calibrationData(null, CARD_ID)).toBeNull();
    const data = calibrationData(VIEW_ANALYTICS, CARD_ID);
    expect(data?.cardPairs.map((p) => p.partnerId)).toEqual(['1012', '1187', '1033', '1102', '2001']);
    expect(data?.rules).toBe(VIEW_ANALYTICS.rules);
  });

  it('gives a card in no pairs[] row no pairs, not null', () => {
    expect(calibrationData(VIEW_ANALYTICS, '9999')?.cardPairs).toEqual([]);
  });
});

describe('calibrationOf', () => {
  it('has no numbers before vote analytics loads, or for a card with no voted pair', () => {
    expect(calibrationOf(null)).toBeNull();
    expect(calibrationOf({cardPairs: [], rules: CARD_RULES})).toBeNull();
  });

  it("is the card's calibration once it has a voted pair", () => {
    expect(calibrationOf({cardPairs: MAUI_PAIRS, rules: CARD_RULES})).toMatchObject({
      pairsVoted: 5,
      scoreVotes: 14,
      meanGap: -1,
      enoughVotes: true,
    });
  });
});

describe('rawVotesFor', () => {
  it.each<[string, RawVotes['kind'], Parameters<typeof rawVotesFor>[0]]>([
    ['vote analytics says the deploy had no raw votes', 'none', {analytics: NO_RAW_ANALYTICS, voteLog: VIEW_LOG, cardId: CARD_ID}],
    ['the log is still loading, or failed', 'waiting', {analytics: VIEW_ANALYTICS, voteLog: null, cardId: CARD_ID}],
    ['the log loaded empty, before vote analytics', 'none', {analytics: null, voteLog: EMPTY_LOG, cardId: CARD_ID}],
    ['the log has votes', 'card', {analytics: null, voteLog: VIEW_LOG, cardId: CARD_ID}],
  ])('%s: %s', (_, kind, input) => {
    expect(rawVotesFor(input).kind).toBe(kind);
  });

  it("keeps the card's own votes, from either side of the row", () => {
    const raw = rawVotesFor({analytics: VIEW_ANALYTICS, voteLog: VIEW_LOG, cardId: CARD_ID});
    expect(votesOnCard(raw)).toHaveLength(18);
    expect(votesOnCard(raw).map((v) => v.side)).toContain('b');
  });

  it('gives a card nobody voted on an empty list, not "none"', () => {
    expect(rawVotesFor({analytics: VIEW_ANALYTICS, voteLog: VIEW_LOG, cardId: '9999'})).toEqual({kind: 'card', cardVotes: []});
  });
});

describe('votesOnCard', () => {
  it('has none until the log is in', () => {
    expect(votesOnCard({kind: 'waiting'})).toEqual([]);
    expect(votesOnCard({kind: 'none'})).toEqual([]);
  });
});

describe('rawFigures', () => {
  it("counts Maui's raw votes, voters and accuracy answers, and the sentiment they give (R-32)", () => {
    expect(rawFigures(votesOnCard(MAUI_VOTES))).toEqual({votes: 18, voters: 10, sentiment: -0.4, answered: 5});
  });

  it("reads card 500's from the shared log", () => {
    expect(rawFigures(votesForCard(VIEW_LOG.votes, VOTED_CARD))).toEqual({votes: 11, voters: 8, sentiment: -0.25, answered: 4});
  });

  it('is null for a card nobody has voted on', () => {
    expect(rawFigures([])).toBeNull();
  });
});

describe('silentNote', () => {
  it('splits the engine-silent pairs by whether the partner is in the card list (R-31)', () => {
    expect(silentNote({raw: MAUI_VOTES, cardPairs: MAUI_PAIRS, isListed})).toBe(
      'Not listed: 3 engine-silent pairs (voted, but the engine gives them no score): ' +
        '2 with a card outside the current card list, 1 with both cards in Core.',
    );
  });

  it('says why it has no count without raw votes', () => {
    expect(silentNote({raw: {kind: 'none'}, cardPairs: MAUI_PAIRS, isListed})).toBe(NO_RAW_SILENT_NOTE);
  });

  it('says nothing while the log is out, or when the engine scores every voted pair', () => {
    expect(silentNote({raw: {kind: 'waiting'}, cardPairs: MAUI_PAIRS, isListed})).toBeNull();
    const onListedPairs = votesForCard(MAUI_LOG.slice(0, 15), CARD_ID);
    expect(silentNote({raw: {kind: 'card', cardVotes: onListedPairs}, cardPairs: MAUI_PAIRS, isListed})).toBeNull();
  });

  it('counts a pair whose every vote is engine-silent: the card then has no pairs[] row at all', () => {
    const silentOnly = votesForCard(MAUI_LOG.slice(15), CARD_ID);
    expect(silentNote({raw: {kind: 'card', cardVotes: silentOnly}, cardPairs: [], isListed})).toMatch(/^Not listed: 3 /);
  });
});

describe('cardFacts', () => {
  it.each([
    [{type: 'Character', cost: 8, inkwell: true} as const, 'Character · cost 8 · inkable'],
    [{type: 'Action', cost: 3, inkwell: false} as const, 'Action · cost 3 · uninkable'],
  ])('%o reads "%s"', (card, text) => {
    expect(cardFacts(lorcanaCard({id: '1', name: 'Any', ...card}))).toBe(text);
  });
});
```

- [ ] **Step 4: Run them, and see them fail**

Run: `pnpm vitest run src/tools/analytics/cards/__tests__/cardView.test.ts`
Expected: FAIL, `Error: Failed to resolve import "../cardView" from "src/tools/analytics/cards/__tests__/cardView.test.ts". Does the file exist?`, then `Tests  no tests`.

- [ ] **Step 5: Write `cardView.ts`**

Create `src/tools/analytics/cards/cardView.ts`:
```ts
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {fmtInt} from '../../../ui/format';
import {countOf} from '../activity/activityModel';
import type {RuleStat, VoteAnalytics} from '../voteAnalyticsTypes';
import type {VoteLog} from '../voteLogTypes';
import {cardCalibration, pairsForCard, type CardCalibration, type CardPair} from './cardStats';
import {cardAnswers, cardVoteSpan, engineSilentForCard, votesForCard, type CardVote} from './cardVotes';

/*
 * What the card page's view reads off the two vote files, for one card (R3-6a).
 * Pure functions over cardStats.ts (pairs[]) and cardVotes.ts (the vote log),
 * so the components only draw. R3-6b's raw panels read rawVotesFor too.
 */

/** The card's share of vote analytics: its voted pairs, and the rules to name them by. */
export interface CardCalibrationData {
  cardPairs: CardPair[];
  rules: readonly RuleStat[];
}

/** Null until vote analytics loads (or after it failed). A card in no pairs[] row has no pairs. */
export function calibrationData(analytics: VoteAnalytics | null, cardId: string): CardCalibrationData | null {
  return analytics ? {cardPairs: pairsForCard(analytics.pairs, cardId), rules: analytics.rules} : null;
}

/** The calibration KPIs' numbers; null before vote analytics loads, and for a card with no voted pair. */
export function calibrationOf(data: CardCalibrationData | null): CardCalibration | null {
  return data && data.cardPairs.length > 0 ? cardCalibration(data.cardPairs) : null;
}

/**
 * What the vote log holds for the card:
 * - 'waiting': the log is loading or failed (R3-6b's panels say which);
 * - 'none': no raw votes at all, because Deploy ran without the service-role
 *   key (vote analytics says so, or the log came back empty);
 * - 'card': the card's own votes, possibly none.
 */
export type RawVotes = {kind: 'waiting'} | {kind: 'none'} | {kind: 'card'; cardVotes: CardVote[]};

export interface RawVotesInput {
  analytics: VoteAnalytics | null;
  voteLog: VoteLog | null;
  cardId: string;
}

export function rawVotesFor({analytics, voteLog, cardId}: RawVotesInput): RawVotes {
  if (analytics?.hasRawVotes === false) return {kind: 'none'};
  if (!voteLog) return {kind: 'waiting'};
  if (voteLog.votes.length === 0) return {kind: 'none'};
  return {kind: 'card', cardVotes: votesForCard(voteLog.votes, cardId)};
}

/** The card's votes in the log: none until it loads. */
export function votesOnCard(raw: RawVotes): CardVote[] {
  return raw.kind === 'card' ? raw.cardVotes : [];
}

/** The two raw KPIs' numbers (R-32): distinct voters, and the accuracy sentiment with its answer count. */
export interface RawFigures {
  votes: number;
  voters: number;
  /** (too low − too high) / answered, from −1 to +1; null with no answers. */
  sentiment: number | null;
  answered: number;
}

/** Null for a card nobody has voted on. */
export function rawFigures(cardVotes: readonly CardVote[]): RawFigures | null {
  const span = cardVoteSpan(cardVotes);
  if (!span) return null;
  const {accuracy} = cardAnswers(cardVotes);
  return {votes: span.votes, voters: span.voters, sentiment: accuracy.sentiment, answered: accuracy.answered};
}

/** What Voted pairs says in place of the engine-silent split, without raw votes to count them from. */
export const NO_RAW_SILENT_NOTE = "Engine-silent pairs aren't listed, and counting them needs raw votes.";

export interface SilentNoteInput {
  raw: RawVotes;
  cardPairs: readonly CardPair[];
  /** Whether the current card list holds an id: getCardById(id) !== undefined. */
  isListed: (cardId: string) => boolean;
}

/**
 * Voted pairs' caption (R-31): the card's engine-silent pairs, which pairs[]
 * leaves out, split by whether the partner is still in the current card list.
 * Most aren't: the engine covers Core only. Null while the log loads or after
 * it failed, and for a card with none, as R2's scatter leaves its own caption
 * out at zero.
 */
export function silentNote({raw, cardPairs, isListed}: SilentNoteInput): string | null {
  if (raw.kind === 'none') return NO_RAW_SILENT_NOTE;
  if (raw.kind === 'waiting') return null;
  const silent = engineSilentForCard(raw.cardVotes, cardPairs, isListed);
  if (silent.pairs === 0) return null;
  return (
    `Not listed: ${countOf(silent.pairs, 'engine-silent pair')} (voted, but the engine gives them no score): ` +
    `${fmtInt(silent.partnerUnlisted.pairs)} with a card outside the current card list, ` +
    `${fmtInt(silent.partnerListed.pairs)} with both cards in Core.`
  );
}

/** The header's facts line: "Character · cost 3 · inkable". */
export function cardFacts({type, cost, inkwell}: Pick<LorcanaCard, 'type' | 'cost' | 'inkwell'>): string {
  return `${type} · cost ${cost} · ${inkwell ? 'inkable' : 'uninkable'}`;
}
```

Notes:
- **`rawVotesFor` reads `hasRawVotes` first.** Vote analytics and the log come from the same Deploy run. So once vote analytics says there are no raw votes, the log's state doesn't matter. An empty log says the same thing before vote analytics loads.
- **A card nobody voted on** gets `{kind: 'card', cardVotes: []}`, not `'none'`. R3-6b tells the two apart: "No raw votes on this card yet." against the raw-votes notice.
- **`silentNote` needs `pairs[]`.** It is called only once vote analytics has loaded (the view's `CalibrationRow`), so an unscored pair is never mistaken for an engine-silent one (R-31).

- [ ] **Step 6: Run them to PASS**

Run: `pnpm vitest run src/tools/analytics/cards/__tests__/cardView.test.ts`
Expected: PASS, `Tests  20 passed (20)`.

- [ ] **Step 7: Write the view's failing test**

Create `src/tools/analytics/cards/__tests__/CardAnalyticsView.test.tsx`. The view has no unsaved-changes guard, so the `MemoryRouter` wrapper is enough. Its partner and rule links need a router; `createMemoryRouter` is only for guarded pages (CLAUDE.md).
```tsx
import {describe, expect, it, vi} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {COLORS} from '../../../../app-bridge';
import type {FocusHandoff} from '../../../../shell/focusHandoff';
import {CardAnalyticsView, type CardAnalyticsViewProps} from '../CardAnalyticsView';
import {
  CARD_500,
  CARD_ID,
  EMPTY_LOG,
  LOADING,
  MAUI_CARD,
  NOT_GENERATED,
  NO_RAW_ANALYTICS,
  VIEW_ANALYTICS,
  VIEW_LOG,
  loaded,
  lorcanaCard,
  pairStat,
  viewCard,
} from '../cardFixtures';

const BASE: CardAnalyticsViewProps = {
  card: MAUI_CARD,
  analytics: loaded(VIEW_ANALYTICS),
  voteLog: loaded(VIEW_LOG),
  getCardById: viewCard,
};

/** The view under a router (its links need one), with any props overridden. */
function renderView(overrides: Partial<CardAnalyticsViewProps> = {}) {
  return render(
    <MemoryRouter>
      <CardAnalyticsView {...BASE} {...overrides} />
    </MemoryRouter>,
  );
}

/** A KPI card's value: the group's second line. */
function kpi(label: string) {
  return within(screen.getByRole('group', {name: label}));
}

/** Analytics whose only pairs[] row for Maui is one pair with this gap and these score votes. */
function onePair({gap, scoreVotes}: {gap: number; scoreVotes: number}) {
  const pair = pairStat({a: '1012', b: CARD_ID, engineScore: 6, communityScore: 6 + gap, scoreVotes});
  return loaded({...VIEW_ANALYTICS, pairs: [pair]});
}

function handoffOf(pending: boolean): FocusHandoff {
  return {pending, request: vi.fn(), done: vi.fn()};
}

describe('CardAnalyticsView', () => {
  describe('the card header', () => {
    it("names the card in its h2 and shows its inks, base rarity, facts and collector number", () => {
      renderView();
      expect(screen.getByRole('heading', {level: 2, name: 'Maui Hero to All'})).toBeInTheDocument();
      expect(screen.getByRole('img', {name: 'Ruby'})).toBeInTheDocument();
      expect(screen.getByText('Character · cost 8 · inkable')).toBeInTheDocument();
      expect(screen.getByText('#113').tagName).toBe('CODE');
      // R-49: "Super Rare" finds its key (with a space) through rarityConfigOf, so the glyph draws beside the name.
      expect(screen.getByText('Super rare').querySelector('img')).not.toBeNull();
    });

    it('shows the thumbnail as decoration, 64 × 90', () => {
      const {container} = renderView();
      const thumb = container.querySelector('img[src^="https://placehold.co"]');
      expect(thumb).toHaveAttribute('alt', '');
      expect(thumb).toHaveAttribute('width', '64');
      expect(thumb).toHaveAttribute('height', '90');
    });

    it('leaves out what a card lacks: version, rarity, collector number and image; and names both inks', () => {
      const {container} = renderView({card: CARD_500});
      expect(screen.getByRole('heading', {level: 2, name: 'Card 500'})).toBeInTheDocument();
      expect(screen.getByRole('img', {name: 'Amber'})).toBeInTheDocument();
      expect(screen.getByRole('img', {name: 'Sapphire'})).toBeInTheDocument();
      expect(screen.getByText('Action · cost 3 · uninkable')).toBeInTheDocument();
      expect(container.querySelector('code')).toBeNull();
      // The only images left are the two named inks: no thumbnail, no rarity glyph.
      expect(container.querySelectorAll('img')).toHaveLength(2);
    });

    it('shows nothing for a rarity that is a printing, not a base rarity (R-49)', () => {
      const {container} = renderView({card: lorcanaCard({id: CARD_ID, name: 'Maui', rarity: 'Enchanted'})});
      expect(screen.queryByText(/Enchanted/)).not.toBeInTheDocument();
      // RaritySymbol draws Enchanted at the pin, so check the glyph too: the one image left is the Amber ink.
      expect(container.querySelectorAll('img')).toHaveLength(1);
    });

    it("puts the header's actions in the header (R4's Edit in Card studio)", () => {
      renderView({headerActions: <button type="button">Edit in Card studio</button>});
      expect(screen.getByRole('button', {name: 'Edit in Card studio'})).toBeInTheDocument();
    });

    it("gives a pending focus handoff to the card's h2 (R-48)", () => {
      const handoff = handoffOf(true);
      renderView({handoff});
      expect(screen.getByRole('heading', {level: 2, name: 'Maui Hero to All'})).toHaveFocus();
      expect(handoff.done).toHaveBeenCalled();
    });

    it.each([
      ['while vote analytics loads', LOADING],
      ['after vote analytics failed', NOT_GENERATED],
    ])('still renders %s', (_, state) => {
      renderView({analytics: state, voteLog: state});
      expect(screen.getByRole('heading', {level: 2, name: 'Maui Hero to All'})).toBeInTheDocument();
    });
  });

  describe('the KPIs', () => {
    it('reads the calibration four from pairs[], the mean gap in the verdict colour with a true minus sign', () => {
      renderView();
      expect(kpi('Score votes').getByText('14')).toBeInTheDocument();
      expect(kpi('Pairs voted').getByText('5')).toBeInTheDocument();
      expect(kpi('Mean gap').getByText('−1.00')).toHaveStyle({color: COLORS.error});
      expect(kpi('Mean gap').getByText('vote-weighted')).toBeInTheDocument();
      expect(kpi('Engine → community').getByText('7.5 → 6.5')).toBeInTheDocument();
    });

    it('tags the raw two (R-32): distinct voters, and the accuracy sentiment from the raw answers', () => {
      renderView();
      expect(kpi('Distinct voters').getByText('10')).toBeInTheDocument();
      expect(kpi('Distinct voters').getByText('18 raw votes')).toBeInTheDocument();
      expect(kpi('Accuracy sentiment').getByText('−0.40')).toBeInTheDocument();
      expect(kpi('Accuracy sentiment').getByText('too-low vs too-high · 5 answers')).toBeInTheDocument();
      expect(kpi('Distinct voters').getByText('raw')).toBeInTheDocument();
      expect(kpi('Accuracy sentiment').getByText('raw')).toBeInTheDocument();
    });

    it('has no engine-silent KPI (R-31)', () => {
      renderView();
      expect(screen.queryByRole('group', {name: /engine-silent/i})).not.toBeInTheDocument();
    });

    it('leaves the mean gap uncoloured under 10 score votes, with the "low n" hint', () => {
      renderView({card: CARD_500});
      expect(kpi('Score votes').getByText('4')).toBeInTheDocument();
      expect(kpi('Mean gap').getByText('+0.25')).toHaveStyle({color: COLORS.text});
      expect(kpi('Mean gap').getByText('low n: under 10 score votes')).toBeInTheDocument();
    });

    it('drops the raw two without raw votes', () => {
      renderView({analytics: loaded(NO_RAW_ANALYTICS), voteLog: loaded(EMPTY_LOG)});
      expect(screen.queryByRole('group', {name: 'Distinct voters'})).not.toBeInTheDocument();
      expect(screen.getByRole('group', {name: 'Mean gap'})).toBeInTheDocument();
    });

    it('drops the raw two for a card the log has no vote on', () => {
      renderView({voteLog: loaded({...VIEW_LOG, votes: VIEW_LOG.votes.filter((v) => v.a !== CARD_ID && v.b !== CARD_ID)})});
      expect(screen.queryByRole('group', {name: 'Distinct voters'})).not.toBeInTheDocument();
      expect(screen.getByRole('group', {name: 'Mean gap'})).toBeInTheDocument();
    });

    it('shows the raw two alone when vote analytics failed but the log loaded', () => {
      renderView({analytics: NOT_GENERATED});
      expect(screen.getByRole('group', {name: 'Distinct voters'})).toBeInTheDocument();
      expect(screen.queryByRole('group', {name: 'Mean gap'})).not.toBeInTheDocument();
    });
  });

  describe('Calibration for this card', () => {
    function panel() {
      return screen.getByRole('region', {name: 'Calibration for this card'});
    }

    it.each([
      ['runs generous', -0.8, 'The engine runs generous on this card'],
      ['is well-calibrated', -0.2, 'The engine is well-calibrated on this card'],
      ['runs harsh', 1.25, 'The engine runs harsh on this card'],
    ])('reads "%s" for a %s gap on 10 score votes', (_, gap, headline) => {
      renderView({analytics: onePair({gap, scoreVotes: 10})});
      expect(panel()).toHaveTextContent(headline);
    });

    it('says the card has too few score votes, and draws no dot, under 10 (R-50)', () => {
      renderView({analytics: onePair({gap: -0.8, scoreVotes: 4})});
      expect(panel()).toHaveTextContent('The engine has too few score votes to judge this card');
      expect(panel()).toHaveTextContent('Only 4 score votes on pairs the engine scores. The verdict needs 10.');
      // GapScale's track comes first: its centre tick, and no dot.
      expect(panel().querySelector('[aria-hidden="true"]')!.children).toHaveLength(1);
    });

    it('puts the dot on the scale, and the read line under the verdict, once the card has enough votes', () => {
      renderView();
      expect(panel()).toHaveTextContent("The engine rates this card's pairs about 1.00 points higher than the community.");
      expect(panel().querySelector('[aria-hidden="true"]')!.children).toHaveLength(2);
    });

    it('lists the rules on its pairs, low n last (R-35), each a link to the rule on /calibration (R-34)', () => {
      renderView();
      const table = within(panel()).getByRole('table', {name: "Rules on this card's pairs, low n last"});
      const names = within(table)
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('cell')[0].textContent);
      expect(names).toEqual(['Ramp', 'Singer + Songslow n', 'Location Boostlow n', 'Shift Targetslow n', 'retired-rulelow n']);
      expect(within(table).getByRole('link', {name: 'Ramp'})).toHaveAttribute('href', '/calibration?rule=ramp');
      expect(within(table).getByRole('link', {name: 'retired-rule'})).toHaveAttribute('href', '/calibration?rule=retired-rule');
      expect(within(table).getAllByText('low n')[0]).toHaveAttribute('title', 'Fewer than 10 score votes');
    });

    it('prints each rule gap with a true minus sign in the gap colour', () => {
      renderView();
      const ramp = within(panel()).getByRole('link', {name: 'Ramp'}).closest('tr')!;
      expect(within(ramp).getByText('−1.17')).toHaveStyle({color: COLORS.error});
      expect(within(ramp).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['Ramp', '', '−1.17', '3', '12']);
    });
  });

  describe('Voted pairs', () => {
    function panel() {
      return screen.getByRole('region', {name: 'Voted pairs'});
    }

    it('lists every pair, widest gap first, in a list that scrolls inside the panel (R-47)', () => {
      renderView();
      expect(within(panel()).getByText('5 pairs · widest gap first')).toBeInTheDocument();
      const rows = within(panel()).getAllByRole('row').slice(1);
      expect(rows.map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent))).toEqual([
        ['Moana - Of Motunui', '8 → 5.50', '−2.50', '6'],
        ['Pua - Potbellied Buddy', '5 → 7', '+2.00', '1'],
        ['Tamatoa - So Shiny!', '6 → 4', '−2.00', '1'],
        ['Heihei - Boat Snack', '7 → 7.25', '+0.25', '4'],
        ['Gramma Tala - Storyteller', '9 → 9', '0.00', '2'],
      ]);
      expect(within(panel()).getByRole('table').parentElement).toHaveStyle({maxHeight: '384px', overflowY: 'auto'});
      expect(within(panel()).getByRole('columnheader', {name: 'Paired with'})).toHaveStyle({position: 'sticky', top: '0px'});
      expect(within(panel()).queryByRole('button', {name: /show all/i})).not.toBeInTheDocument();
    });

    it('colours each gap, and heads the jump column in full', () => {
      renderView();
      expect(within(panel()).getByText('−2.50')).toHaveStyle({color: COLORS.error});
      expect(within(panel()).getByText('+2.00')).toHaveStyle({color: COLORS.success});
      expect(within(panel()).getByRole('columnheader', {name: 'Engine → community'})).toBeInTheDocument();
    });

    it('links a partner the card list holds to its card page, and leaves the others plain (R-33)', () => {
      renderView();
      expect(within(panel()).getByRole('link', {name: 'Moana - Of Motunui'})).toHaveAttribute('href', '/cards/1012');
      expect(within(panel()).queryByRole('link', {name: 'Gramma Tala - Storyteller'})).not.toBeInTheDocument();
      expect(within(panel()).getByText('Gramma Tala - Storyteller')).toBeInTheDocument();
    });

    it("leaves the focus handoff to the page: a partner link doesn't ask for it (R-48, R3-7's useCardHandoff)", async () => {
      const handoff = handoffOf(false);
      renderView({handoff});
      await userEvent.click(within(panel()).getByRole('link', {name: 'Moana - Of Motunui'}));
      expect(handoff.request).not.toHaveBeenCalled();
    });

    it('keeps a row Shift+Tab reaches clear of the sticky head (WCAG 2.4.11)', () => {
      renderView();
      expect(within(panel()).getByRole('table').parentElement).toHaveStyle({scrollPaddingTop: '40px'});
    });

    it("keeps the handoff's caveat, and splits the engine-silent pairs in a caption (R-31)", () => {
      renderView();
      expect(
        within(panel()).getByText('Most pairs have a single vote — trust the card-level trend over any one row.'),
      ).toBeInTheDocument();
      expect(
        within(panel()).getByText(
          'Not listed: 3 engine-silent pairs (voted, but the engine gives them no score): ' +
            '2 with a card outside the current card list, 1 with both cards in Core.',
        ),
      ).toBeInTheDocument();
    });

    it('says the engine-silent pairs need raw votes without them, and says nothing while the log loads', () => {
      const {unmount} = renderView({analytics: loaded(NO_RAW_ANALYTICS), voteLog: loaded(EMPTY_LOG)});
      expect(within(panel()).getByText("Engine-silent pairs aren't listed, and counting them needs raw votes.")).toBeInTheDocument();
      unmount();
      renderView({voteLog: LOADING});
      expect(within(panel()).queryByText(/engine-silent/)).not.toBeInTheDocument();
    });
  });

  describe('states', () => {
    it('says vote analytics is loading', () => {
      renderView({analytics: LOADING});
      expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
      expect(screen.queryByRole('region', {name: 'Calibration for this card'})).not.toBeInTheDocument();
    });

    it("says why vote analytics is missing, in today's words", () => {
      renderView({analytics: NOT_GENERATED});
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Could not load vote analytics. Has the artifact been generated? (HTTP 404)',
      );
    });

    it('has one notice for a card in no pairs[] row', () => {
      const elsa = lorcanaCard({id: '9999', name: 'Elsa', version: 'Snow Queen'});
      renderView({card: elsa});
      expect(screen.getByText('No score votes on pairs the engine scores yet.')).toBeInTheDocument();
      expect(screen.queryByRole('region', {name: 'Voted pairs'})).not.toBeInTheDocument();
      expect(screen.queryByRole('region', {name: 'Key figures'})).not.toBeInTheDocument();
    });

    it('adds the engine-silent count to that notice when every pair the card was voted on is engine-silent (R-31)', () => {
      renderView({card: viewCard('710')!});
      expect(screen.getByText(/^No score votes on pairs the engine scores yet\./)).toHaveTextContent(
        'No score votes on pairs the engine scores yet. Not listed: 1 engine-silent pair (voted, but the engine gives them no score): ' +
          '0 with a card outside the current card list, 1 with both cards in Core.',
      );
    });
  });
});
```

- [ ] **Step 8: Run it, and see it fail**

Run: `pnpm vitest run src/tools/analytics/cards/__tests__/CardAnalyticsView.test.tsx`
Expected: FAIL, `Error: Failed to resolve import "../CardAnalyticsView" from "src/tools/analytics/cards/__tests__/CardAnalyticsView.test.tsx". Does the file exist?`, then `Tests  no tests`.

- [ ] **Step 9: Write the shared styles**

Create `src/tools/analytics/cards/cardStyles.ts`:
```ts
import type {CSSProperties} from 'react';
import {LETTER_SPACING, SPACING, TRUNCATE} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';

/*
 * The styles the card page's panels share (R3-6a to R3-6c): its two tables'
 * cells, its links and its captions. RulesTable and VoteDetailTable keep their
 * own copies; these match them.
 */

/** A muted line under a chart or a list: a caveat, a count left out, where the data comes from. */
export const CAPTION: CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted};

/** A column head, as RulesTable and VoteDetailTable set theirs. */
export const HEAD_CELL: CSSProperties = {
  padding: `${SPACING.sm}px`,
  textAlign: 'left',
  fontSize: ADMIN_TYPE.label,
  fontWeight: 700,
  letterSpacing: LETTER_SPACING.cap,
  textTransform: 'uppercase',
  color: ADMIN_COLORS.muted,
};

export const CELL: CSSProperties = {
  padding: `${SPACING.sm}px`,
  borderTop: `1px solid ${ADMIN_COLORS.divider}`,
  verticalAlign: 'middle',
};

/** A number column: right-aligned, in figures that line up row to row. */
export const NUMBER: CSSProperties = {textAlign: 'right', fontVariantNumeric: 'tabular-nums'};

/**
 * A link on the card page: a card or a rule, in the accent, as PanelLink sets
 * the Overview's. The app's global :focus-visible ring draws 4px outside it,
 * so nothing that clips may sit within 4px of a link's edge.
 */
export const LINK: CSSProperties = {color: ADMIN_COLORS.accent, textDecoration: 'none'};

/** A link that fills its cell or flex slot and cuts a long name with an ellipsis. */
export const CELL_LINK: CSSProperties = {...LINK, ...TRUNCATE, display: 'block', minWidth: 0};
```

- [ ] **Step 10: Write the card header**

Create `src/tools/analytics/cards/CardHeader.tsx`:
```tsx
import {useRef} from 'react';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {FONTS, InkIcon, RaritySymbol, SPACING, rarityConfigOf, smallImageUrl} from '../../../app-bridge';
import {useTakeHandoff, type FocusHandoff} from '../../../shell/focusHandoff';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {cardFacts} from './cardView';

/** The thumbnail's box: the handoff's 64 × 90 (dc.html:578), a card's own proportions. */
const THUMB_WIDTH = 64;
const THUMB_HEIGHT = 90;
const ICON_SIZE = 18;

const HEADER: React.CSSProperties = {display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.xl};
const THUMB: React.CSSProperties = {
  flex: 'none',
  objectFit: 'cover',
  borderRadius: ADMIN_RADIUS.box,
  border: `1px solid ${ADMIN_COLORS.inputBorder}`,
};
const IDENTITY: React.CSSProperties = {flex: '1 1 240px', minWidth: 0, display: 'grid', gap: SPACING.sm};
const NAME: React.CSSProperties = {
  margin: 0,
  fontFamily: FONTS.hero,
  fontSize: ADMIN_TYPE.pageTitle,
  fontWeight: 400,
  lineHeight: 1.1,
  color: ADMIN_COLORS.text,
};
const VERSION: React.CSSProperties = {fontFamily: FONTS.body, fontSize: ADMIN_TYPE.emphasis, color: ADMIN_COLORS.muted};
const FACTS: React.CSSProperties = {
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: SPACING.md,
  fontSize: ADMIN_TYPE.small,
  color: ADMIN_COLORS.muted,
};
const ICONS: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: SPACING.xs};

/**
 * The base rarity's glyph and name (R-49), through rarityConfigOf, the five
 * rarities RaritySymbol draws for a card. Nothing for a card without one: a
 * preview card can have none, and Enchanted, Epic and Iconic are printings,
 * not rarities (R-3).
 */
function CardRarity({rarity}: {rarity: string | undefined}) {
  const config = rarityConfigOf(rarity);
  if (!config) return null;
  return (
    <span style={ICONS}>
      <RaritySymbol rarity={config.key} size={ICON_SIZE} />
      {config.name}
    </span>
  );
}

/** The line under the name: inks (named for a screen reader), rarity, type, cost, inkwell and collector number. */
function CardFacts({card}: {card: LorcanaCard}) {
  return (
    <p style={FACTS}>
      <span style={ICONS}>
        <InkIcon ink={card.ink} size={ICON_SIZE} decorative={false} />
        {card.ink2 && <InkIcon ink={card.ink2} size={ICON_SIZE} decorative={false} />}
      </span>
      <CardRarity rarity={card.rarity} />
      <span>{cardFacts(card)}</span>
      {card.setNumber != null && <code>#{card.setNumber}</code>}
    </p>
  );
}

interface CardHeaderProps {
  card: LorcanaCard;
  /** At the right: R4's "Edit in Card studio". */
  actions?: React.ReactNode;
  /** The page's focus handoff (R-48): the page asks when the URL names another card (R3-7), and this h2 takes it. */
  handoff?: FocusHandoff;
}

/**
 * The card the page is about: its thumbnail, its name (the h2 the focus
 * handoff lands on), and what kind of card it is. The thumbnail is
 * decoration, so it has no alt text: the h2 names the card.
 */
export function CardHeader({card, actions, handoff}: CardHeaderProps) {
  const ref = useRef<HTMLDivElement>(null);
  useTakeHandoff(handoff, ref, 'h2');
  const thumb = smallImageUrl(card);
  return (
    <div ref={ref} style={HEADER}>
      {thumb && <img src={thumb} alt="" width={THUMB_WIDTH} height={THUMB_HEIGHT} style={THUMB} />}
      <div style={IDENTITY}>
        <h2 tabIndex={-1} style={NAME}>
          {card.name}
          {/* The space is its own text node, so the h2's name reads "Maui Hero to All", not "MauiHero to All". */}
          {card.version && (
            <>
              {' '}
              <span style={VERSION}>{card.version}</span>
            </>
          )}
        </h2>
        <CardFacts card={card} />
      </div>
      {actions != null && <div style={{marginLeft: 'auto'}}>{actions}</div>}
    </div>
  );
}
```

Notes:
- **The name's space.** The space between name and version is its own text node. Testing Library (and the accessible-name algorithm it follows) trims a child element's leading space, so `{' Hero to All'}` inside the span gives "MauiHero to All". This was checked in the sandbox.
- **The h2 takes focus only through the handoff.** `tabIndex={-1}` keeps it out of the Tab order.

- [ ] **Step 11: Write the KPI row**

Create `src/tools/analytics/cards/CardKpis.tsx`:
```tsx
import {SPACING} from '../../../app-bridge';
import {fmtGap, fmtInt, fmtScore} from '../../../ui/format';
import {KpiCard} from '../../../ui/KpiCard';
import {RawTag} from '../../../ui/RawTag';
import {countOf} from '../activity/activityModel';
import {MIN_RULE_VOTES} from '../overview/overviewStats';
import {verdictFor} from '../verdict';
import {verdictGap, type CardCalibration} from './cardStats';
import {calibrationOf, rawFigures, votesOnCard, type CardCalibrationData, type RawFigures, type RawVotes} from './cardView';

/** The Overview's KPI row (OverviewKpis.tsx:45-47): as many 170px cards as fit, wrapping. */
const ROW: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: SPACING.md};

const LOW_N_HINT = `low n: under ${MIN_RULE_VOTES} score votes`;

/**
 * The four numbers from pairs[], vote-weighted as the Overview's are. The mean
 * gap takes the verdict's colour once the card has enough score votes to
 * judge; under that it stays in the text colour, with the "low n" hint.
 */
function CalibrationKpis({cal}: {cal: CardCalibration}) {
  const gap = verdictGap(cal);
  return (
    <>
      <KpiCard label="Score votes" value={fmtInt(cal.scoreVotes)} hint="on pairs the engine scores" />
      <KpiCard label="Pairs voted" value={fmtInt(cal.pairsVoted)} hint="partners the engine scores" />
      <KpiCard
        label="Mean gap"
        value={fmtGap(cal.meanGap)}
        hint={cal.enoughVotes ? 'vote-weighted' : LOW_N_HINT}
        valueColor={gap == null ? undefined : verdictFor(gap).numberColor}
      />
      <KpiCard
        label="Engine → community"
        value={`${fmtScore(cal.engineAvg)} → ${fmtScore(cal.communityAvg)}`}
        hint="vote-weighted pair averages"
      />
    </>
  );
}

/**
 * The two numbers from the card's raw votes, tagged raw. Accuracy sentiment
 * comes from the card's own accuracy answers (R-32): pairs[] carries one on
 * too few pairs to say anything per card.
 */
function RawKpis({figures}: {figures: RawFigures}) {
  return (
    <>
      <KpiCard
        label="Distinct voters"
        value={fmtInt(figures.voters)}
        hint={countOf(figures.votes, 'raw vote')}
        tag={<RawTag />}
      />
      <KpiCard
        label="Accuracy sentiment"
        value={fmtGap(figures.sentiment)}
        hint={`too-low vs too-high · ${countOf(figures.answered, 'answer')}`}
        tag={<RawTag />}
      />
    </>
  );
}

interface CardKpisProps {
  /** The card's share of vote analytics; null until it loads. */
  calibration: CardCalibrationData | null;
  raw: RawVotes;
}

/**
 * The card's headline numbers: the calibration four once the card has a voted
 * pair, then the raw two once the log holds a vote on it. There is no
 * engine-silent KPI (R-31): Voted pairs captions that count. Nothing renders
 * when neither file has a number for the card.
 */
export function CardKpis({calibration, raw}: CardKpisProps) {
  const cal = calibrationOf(calibration);
  const figures = rawFigures(votesOnCard(raw));
  if (!cal && !figures) return null;
  return (
    <section aria-label="Key figures" style={ROW}>
      {cal && <CalibrationKpis cal={cal} />}
      {figures && <RawKpis figures={figures} />}
    </section>
  );
}
```

`fmtGap(cal.meanGap)` prints the unrounded mean to two places, which is exactly `verdictGap`'s value. So the KPI and the verdict can't disagree at a −0.4996.

- [ ] **Step 12: Write "Calibration for this card"**

Create `src/tools/analytics/cards/CardCalibrationPanel.tsx`:
```tsx
import {Link} from 'react-router-dom';
import {FONTS, SPACING} from '../../../app-bridge';
import {calibrationHref} from '../../../shell/nav';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {BiasBar} from '../../../ui/BiasBar';
import {fmtGap, fmtInt} from '../../../ui/format';
import {LowNTag} from '../../../ui/LowNTag';
import {Panel} from '../../../ui/Panel';
import {GapScale} from '../GapScale';
import {gapColor} from '../gapColor';
import {MIN_RULE_VOTES} from '../overview/overviewStats';
import {verdictFor} from '../verdict';
import type {RuleStat} from '../voteAnalyticsTypes';
import {CELL, CELL_LINK, HEAD_CELL, NUMBER} from './cardStyles';
import {cardCalibration, cardReadLine, rulesForCard, verdictGap, type CardPair, type CardRuleRow} from './cardStats';

const BODY: React.CSSProperties = {display: 'grid', gap: SPACING.lg};
const HEADLINE: React.CSSProperties = {
  margin: 0,
  fontFamily: FONTS.hero,
  fontSize: ADMIN_TYPE.sectionTitle,
  lineHeight: 1.2,
  color: ADMIN_COLORS.text,
};
const READ: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.body, color: ADMIN_COLORS.muted};

/** The fixed columns, padding included; Rule takes the rest. */
const COLUMN_WIDTH = {bias: 88, gap: 64, pairs: 52, votes: 56};
/** Under this the table scrolls inside its own box rather than squeezing the rule names to nothing. */
const TABLE_MIN_WIDTH = 360;
/**
 * The table's scroller reaches 4px into the panel's padding on each side, and
 * pads the same back, so the table lines up with the headline while a rule
 * link's focus ring (4px outside it, the app's global :focus-visible) stays
 * inside the box that clips.
 */
const SCROLLER: React.CSSProperties = {
  overflowX: 'auto',
  margin: `0 -${SPACING.xs}px`,
  padding: `0 ${SPACING.xs}px`,
  borderTop: `1px solid ${ADMIN_COLORS.divider}`,
};
const TABLE: React.CSSProperties = {
  width: '100%',
  minWidth: TABLE_MIN_WIDTH,
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
  fontSize: ADMIN_TYPE.body,
};
// The outer cells sit flush with the panel's padding, under the headline.
const FIRST: React.CSSProperties = {paddingLeft: 0};
const LAST: React.CSSProperties = {paddingRight: 0};
const RULE_NAME: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: SPACING.sm, minWidth: 0};
const MUTED_NUMBER: React.CSSProperties = {...NUMBER, color: ADMIN_COLORS.muted};

/**
 * One rule on the card's pairs. Its name links to the rule on /calibration
 * (R-34), where it can be tuned. The bias bar is decoration: the gap prints
 * beside it. A rule on fewer than MIN_RULE_VOTES of the card's score votes
 * carries "low n" (R-35).
 */
function RuleRow({row}: {row: CardRuleRow}) {
  return (
    <tr>
      <td style={{...CELL, ...FIRST}}>
        <span style={RULE_NAME}>
          <Link to={calibrationHref(row.ruleId)} title={row.ruleName} style={CELL_LINK}>
            {row.ruleName}
          </Link>
          {row.lowN && <LowNTag minVotes={MIN_RULE_VOTES} />}
        </span>
      </td>
      <td style={CELL}>
        <BiasBar gap={row.meanGap} />
      </td>
      <td style={{...CELL, ...NUMBER, color: gapColor(row.meanGap)}}>{fmtGap(row.meanGap)}</td>
      <td style={{...CELL, ...MUTED_NUMBER}}>{fmtInt(row.pairs)}</td>
      <td style={{...CELL, ...MUTED_NUMBER, ...LAST}}>{fmtInt(row.scoreVotes)}</td>
    </tr>
  );
}

/**
 * The rules that scored the card's voted pairs, as rulesForCard orders them:
 * rules with enough score votes first, each group by |gap|, then score votes,
 * then name (R-35). Nothing for a card whose pairs name no rule.
 */
function CardRulesTable({rows}: {rows: CardRuleRow[]}) {
  if (rows.length === 0) return null;
  return (
    <div style={SCROLLER}>
      <table aria-label="Rules on this card's pairs, low n last" style={TABLE}>
        <colgroup>
          <col />
          <col style={{width: COLUMN_WIDTH.bias}} />
          <col style={{width: COLUMN_WIDTH.gap}} />
          <col style={{width: COLUMN_WIDTH.pairs}} />
          <col style={{width: COLUMN_WIDTH.votes}} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" style={{...HEAD_CELL, ...FIRST}}>
              Rule on its pairs
            </th>
            <th scope="col" style={HEAD_CELL}>
              Bias
            </th>
            <th scope="col" style={{...HEAD_CELL, ...NUMBER}}>
              Gap
            </th>
            <th scope="col" style={{...HEAD_CELL, ...NUMBER}}>
              Pairs
            </th>
            <th scope="col" style={{...HEAD_CELL, ...NUMBER, ...LAST}}>
              Votes
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <RuleRow key={row.ruleId} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface CardCalibrationPanelProps {
  /** pairsForCard's pairs: at least one (the view shows a notice for none). */
  cardPairs: readonly CardPair[];
  rules: readonly RuleStat[];
}

/**
 * "Calibration for this card": the verdict on the card's pairs, its read line
 * and the over/under scale, then the rules behind it. The verdict reads the
 * mean gap to two places (verdictGap), as the Mean gap KPI prints it, and only
 * from MIN_RULE_VOTES score votes: under that the headline says so and the
 * scale draws no dot. The phrase takes the verdict's colour, as on the
 * Overview (R-50).
 */
export function CardCalibrationPanel({cardPairs, rules}: CardCalibrationPanelProps) {
  const cal = cardCalibration(cardPairs);
  const gap = verdictGap(cal);
  const verdict = verdictFor(gap);
  return (
    <Panel title="Calibration for this card" action="community minus engine">
      <div style={BODY}>
        <p style={HEADLINE}>
          The engine <span style={{color: verdict.wordColor}}>{verdict.phrase}</span>
          {gap == null ? ' this card' : ' on this card'}
        </p>
        <p style={READ}>{cardReadLine(cal)}</p>
        <GapScale meanGap={gap} color={verdict.numberColor} />
        <CardRulesTable rows={rulesForCard(cardPairs, rules)} />
      </div>
    </Panel>
  );
}
```

- [ ] **Step 13: Write "Voted pairs"**

Create `src/tools/analytics/cards/VotedPairsPanel.tsx`:
```tsx
import {Link} from 'react-router-dom';
import {SPACING, TRUNCATE} from '../../../app-bridge';
import {cardsHref} from '../../../shell/nav';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtGap, fmtInt} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {countOf} from '../activity/activityModel';
import {scoreText} from '../calibration/chartData';
import {gapColor} from '../gapColor';
import {CAPTION, CELL, CELL_LINK, HEAD_CELL, NUMBER} from './cardStyles';
import type {CardPair} from './cardStats';

/** The fixed columns, padding included; Paired with takes the rest. "10 → 4.33" fits 96px at 13px. */
const COLUMN_WIDTH = {scores: 96, gap: 68, votes: 60};
/**
 * R2's PairList scroller (R-47): past about ten rows the list scrolls inside
 * the panel, so the panel stays level with the calibration beside it, with no
 * "Show all" button to vanish from under focus. Keyboard users reach the rows
 * through their partner links, and focus scrolls each into view. The scroll
 * padding keeps a row Shift+Tab reaches clear of the sticky head (WCAG
 * 2.4.11): the head is 32.5px (8px of padding twice, an 11px line at 1.5),
 * and the focus ring reaches 4px above the link.
 */
const SCROLLER: React.CSSProperties = {maxHeight: 384, overflowY: 'auto', scrollPaddingTop: SPACING.xxxl + SPACING.sm};
const TABLE: React.CSSProperties = {width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: ADMIN_TYPE.body};
/**
 * The head stays put while the rows scroll under it, so its fill is opaque: the
 * panel's card fill over the page (adminTheme.ts:39-40). Its own bottom rule
 * stays with it; a collapsed border wouldn't.
 */
const STICKY_HEAD: React.CSSProperties = {
  ...HEAD_CELL,
  position: 'sticky',
  top: 0,
  background: `linear-gradient(${ADMIN_COLORS.card}, ${ADMIN_COLORS.card}), ${ADMIN_COLORS.page}`,
  boxShadow: `inset 0 -1px 0 ${ADMIN_COLORS.divider}`,
};
// The outer cells keep 16px from the panel's edge, as PairList's rows do.
const START: React.CSSProperties = {paddingLeft: SPACING.lg};
const END: React.CSSProperties = {paddingRight: SPACING.lg};
const MUTED_NUMBER: React.CSSProperties = {...NUMBER, color: ADMIN_COLORS.muted};
const FOOTER: React.CSSProperties = {
  display: 'grid',
  gap: SPACING.xs,
  padding: `${SPACING.sm}px ${SPACING.lg}px ${SPACING.section}px`,
  borderTop: `1px solid ${ADMIN_COLORS.divider}`,
};

interface PartnerProps {
  pair: CardPair;
  /** The current card list holds the partner: only then is there a page to link to (R-33). */
  listed: boolean;
}

/** The partner's name: a link to its own card page, or plain text when the card list can't open it. */
function Partner({pair, listed}: PartnerProps) {
  if (!listed) {
    return (
      <span title={pair.partnerName} style={{...TRUNCATE, display: 'block'}}>
        {pair.partnerName}
      </span>
    );
  }
  return (
    <Link to={cardsHref(pair.partnerId)} title={pair.partnerName} style={CELL_LINK}>
      {pair.partnerName}
    </Link>
  );
}

interface PairRowProps extends PartnerProps {
  /** The head's own rule sits over the first row, so it draws none. */
  first: boolean;
}

/** One voted pair: the partner, the engine → community jump, the gap in its colour and the score votes. */
function PairRow({first, ...partner}: PairRowProps) {
  const {pair} = partner;
  const cell = first ? {...CELL, borderTop: 'none'} : CELL;
  return (
    <tr>
      <td style={{...cell, ...START}}>
        <Partner {...partner} />
      </td>
      <td style={{...cell, ...MUTED_NUMBER}}>
        {scoreText(pair.engineScore)} → {scoreText(pair.communityScore)}
      </td>
      <td style={{...cell, ...NUMBER, color: gapColor(pair.gap)}}>{fmtGap(pair.gap)}</td>
      <td style={{...cell, ...MUTED_NUMBER, ...END}}>{fmtInt(pair.scoreVotes)}</td>
    </tr>
  );
}

function PairsHead() {
  return (
    <thead>
      <tr>
        <th scope="col" style={{...STICKY_HEAD, ...START}}>
          Paired with
        </th>
        {/* "Engine → community" doesn't fit a number column's head, so the head shows the handoff's short form and says it in full. */}
        <th scope="col" aria-label="Engine → community" title="Engine → community" style={{...STICKY_HEAD, ...NUMBER}}>
          Eng → com
        </th>
        <th scope="col" style={{...STICKY_HEAD, ...NUMBER}}>
          Gap
        </th>
        <th scope="col" style={{...STICKY_HEAD, ...NUMBER, ...END}}>
          Votes
        </th>
      </tr>
    </thead>
  );
}

interface VotedPairsPanelProps {
  /** pairsForCard's pairs, widest gap first: at least one (the view shows a notice for none). */
  cardPairs: readonly CardPair[];
  isListed: (cardId: string) => boolean;
  /** silentNote's caption (R-31), or null. */
  note: string | null;
}

/**
 * The card's voted pairs that the engine scores, widest gap first, every one
 * of them in a list that scrolls inside the panel (R-47). Each partner links
 * to its own card page when the card list holds it (R-33). The jump prints as
 * PairList prints it (scoreText), so a pair reads the same on /calibration.
 * The footer keeps the handoff's caveat and the engine-silent caption.
 */
export function VotedPairsPanel({cardPairs, isListed, note}: VotedPairsPanelProps) {
  return (
    <Panel title="Voted pairs" action={`${countOf(cardPairs.length, 'pair')} · widest gap first`} padded={false}>
      <div style={SCROLLER}>
        <table aria-label="Voted pairs, widest gap first" style={TABLE}>
          <colgroup>
            <col />
            <col style={{width: COLUMN_WIDTH.scores}} />
            <col style={{width: COLUMN_WIDTH.gap}} />
            <col style={{width: COLUMN_WIDTH.votes}} />
          </colgroup>
          <PairsHead />
          <tbody>
            {cardPairs.map((pair, i) => (
              <PairRow
                key={pair.partnerId}
                pair={pair}
                listed={isListed(pair.partnerId)}
                first={i === 0}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div style={FOOTER}>
        <p style={CAPTION}>Most pairs have a single vote — trust the card-level trend over any one row.</p>
        {note && <p style={CAPTION}>{note}</p>}
      </div>
    </Panel>
  );
}
```

Notes:
- **The jump's head.** "Engine → community" doesn't fit a 96px number column at the head's 11px caps. The head shows the prototype's "Eng → com" (`dc.html:617`) and carries the full words as its accessible name and its title.
- **Keyboard scrolling.** Rows are reached through their partner links, and focus scrolls each one into view inside the scroller. A card whose partners the list doesn't hold has no links. Its scroller is still focusable in current Chrome and Firefox, which make scroll containers keyboard-focusable.
- **The scroll padding.** Shift+Tab scrolls a link to the scroller's top edge, under the sticky head. The head is 32.5px: `HEAD_CELL`'s 8px padding top and bottom, and an 11px line at the app's 1.5 line height (`index.css`). The focus ring reaches 4px above the link (2px outline, 2px offset). So `scrollPaddingTop` is 40px (`SPACING.xxxl + SPACING.sm`), and the link lands below the head with its ring whole (WCAG 2.2, 2.4.11).
- **No click hook.** A partner link doesn't ask for the focus handoff. R3-7's page asks when the URL names another card. A click-time request would be taken by the old card's `h2` before the router's transition commits, so focus would fall to `<body>` (header, "Focus").

- [ ] **Step 14: Write the view, and run its test to PASS**

Create `src/tools/analytics/cards/CardAnalyticsView.tsx`:
```tsx
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {SPACING} from '../../../app-bridge';
import type {FocusHandoff} from '../../../shell/focusHandoff';
import {twoUp} from '../../../ui/layout';
import {Notice} from '../../../ui/Notice';
import type {UseVoteAnalyticsReturn} from '../useVoteAnalytics';
import type {UseVoteLogReturn} from '../useVoteLog';
import {CardCalibrationPanel} from './CardCalibrationPanel';
import {CardHeader} from './CardHeader';
import {CardKpis} from './CardKpis';
import {calibrationData, rawVotesFor, silentNote, type CardCalibrationData, type RawVotes} from './cardView';
import {VotedPairsPanel} from './VotedPairsPanel';

export interface CardAnalyticsViewProps {
  card: LorcanaCard;
  analytics: UseVoteAnalyticsReturn;
  voteLog: UseVoteLogReturn;
  /** The card list's lookup: R-31's "is the partner listed?" and R-33's links only to cards it holds. */
  getCardById: (id: string) => LorcanaCard | undefined;
  /** The page's focus handoff (R-48): the header's h2 takes it. A story leaves it out. */
  handoff?: FocusHandoff;
  /** R4's "Edit in Card studio", at the right of the card header. R3 passes none. */
  headerActions?: React.ReactNode;
}

// PageLayout's body grid (OverviewView's): a grid, not a column flexbox, which collapses panels that clip.
const VIEW: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: SPACING.xxl};
// Calibration beside Voted pairs at the handoff's 420px track (dc.html:600), stacked below 860px of column.
const CALIBRATION_ROW = twoUp(420);

/** Why the calibration panels are missing: vote analytics is loading, or could not be read. */
function AnalyticsNotice({analytics}: {analytics: UseVoteAnalyticsReturn}) {
  if (analytics.error) {
    return <Notice tone="error">Could not load vote analytics. Has the artifact been generated? ({analytics.error.message})</Notice>;
  }
  return analytics.loading ? <Notice>Loading analytics...</Notice> : null;
}

interface CalibrationRowProps {
  calibration: CardCalibrationData;
  raw: RawVotes;
  isListed: (cardId: string) => boolean;
}

/**
 * Calibration for this card beside Voted pairs, or one notice for a card in no
 * pairs[] row. The engine-silent caption (R-31) goes with either: a card
 * whose every vote is engine-silent still says how many pairs it has.
 */
function CalibrationRow({calibration, raw, isListed}: CalibrationRowProps) {
  const {cardPairs, rules} = calibration;
  const note = silentNote({raw, cardPairs, isListed});
  if (cardPairs.length === 0) {
    return <Notice>No score votes on pairs the engine scores yet.{note && ` ${note}`}</Notice>;
  }
  return (
    <div style={CALIBRATION_ROW}>
      <CardCalibrationPanel cardPairs={cardPairs} rules={rules} />
      <VotedPairsPanel cardPairs={cardPairs} isListed={isListed} note={note} />
    </div>
  );
}

/**
 * One card's analytics (R3): the card, then its numbers from vote analytics
 * and the vote log, each section in its own state, so the header never waits
 * for a vote file. R3-6b adds the raw-vote panels and R3-6c the engine view
 * below. The page renders it keyed by card id (R-46), so nothing a section
 * holds carries over to the next card. Purely presentational: the page fetches.
 */
export function CardAnalyticsView({card, analytics, voteLog, getCardById, handoff, headerActions}: CardAnalyticsViewProps) {
  const calibration = calibrationData(analytics.data, card.id);
  const raw = rawVotesFor({analytics: analytics.data, voteLog: voteLog.data, cardId: card.id});
  const isListed = (id: string) => getCardById(id) !== undefined;
  return (
    <div style={VIEW}>
      <CardHeader card={card} actions={headerActions} handoff={handoff} />
      <AnalyticsNotice analytics={analytics} />
      <CardKpis calibration={calibration} raw={raw} />
      {calibration && <CalibrationRow calibration={calibration} raw={raw} isListed={isListed} />}
    </div>
  );
}
```

Run: `pnpm vitest run src/tools/analytics/cards/__tests__/CardAnalyticsView.test.tsx src/tools/analytics/cards/__tests__/cardView.test.ts`
Expected: PASS, `Tests  53 passed (53)`: 20 in `cardView.test.ts` and 33 in `CardAnalyticsView.test.tsx`.

- [ ] **Step 15: Name the card page in the two doc comments R3-5b handed on**

In `src/tools/analytics/GapScale.tsx`, before:
```tsx
 * (clamped by scalePercent), left out when there is no gap. Every caller
 * prints the gap as text beside the track (the Overview card's hero number,
 * for one), so the track is hidden from assistive tech.
 */
```
After:
```tsx
 * (clamped by scalePercent), left out when there is no gap. Every caller
 * prints the gap as text beside the track (the Overview card's hero number;
 * on a card page, the Mean gap KPI and the read line), so the track is hidden
 * from assistive tech.
 */
```

In `src/tools/analytics/verdict.ts`, before:
```ts
 * page's subtitle (calibrationSubtitle) reads the word, and the Overview's
 * calibration card the phrase.
 */
```
After:
```ts
 * page's subtitle (calibrationSubtitle) reads the word, and the Overview's
 * calibration card and the card page's calibration panel the phrase.
 */
```

Comments only, so nothing else changes.

- [ ] **Step 16: Stories**

Create `src/tools/analytics/cards/CardAnalyticsView.stories.tsx`, titled `Admin/Insights/Card analytics/View` (note 11). Its nine stories share the meta's args, and each overrides only what it is about. R3-6b's stories are in `RawVotePanels.stories.tsx`, R3-6c's in `EnginePanels.stories.tsx`.
```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {MemoryRouter} from 'react-router-dom';
import {CtaButton} from '../../../app-bridge';
import {PageLayout} from '../../../shell/PageLayout';
import {DataAsOf} from '../../../ui/DataAsOf';
import {CardAnalyticsView} from './CardAnalyticsView';
import {
  CARD_500,
  CARD_ID,
  EMPTY_LOG,
  LOADING,
  MAUI_CARD,
  NOT_GENERATED,
  NO_RAW_ANALYTICS,
  VIEW_ANALYTICS,
  VIEW_LOG,
  loaded,
  lorcanaCard,
  pairStat,
  viewCard,
} from './cardFixtures';

/** A phone-width column: every row stacks. */
const NARROW = 375;

const meta: Meta<typeof CardAnalyticsView> = {
  title: 'Admin/Insights/Card analytics/View',
  component: CardAnalyticsView,
  tags: ['autodocs'],
  // The partner and rule links need a router. The view sits in the page's own
  // header, as R3-7's page will put it, so the meta line shows DataAsOf once
  // vote analytics has loaded (R-54). .storybook/preview.tsx mounts AdminStyles.
  decorators: [
    (Story, {args}) => (
      <MemoryRouter>
        <PageLayout
          title="Card analytics"
          subtitle="Votes, calibration and engine data for one card"
          meta={args.analytics?.data ? <DataAsOf generatedAt={args.analytics.data.generatedAt} /> : undefined}>
          <Story />
        </PageLayout>
      </MemoryRouter>
    ),
  ],
  args: {card: MAUI_CARD, analytics: loaded(VIEW_ANALYTICS), voteLog: loaded(VIEW_LOG), getCardById: viewCard},
};
export default meta;
type Story = StoryObj<typeof meta>;

/** Maui: enough score votes to judge, raw votes, two engine-silent pairs, and a partner the card list lacks. */
export const Default: Story = {};

/** Card 500: four score votes, so no verdict and no dot; no version, rarity, number or image; two inks. */
export const LowN: Story = {args: {card: CARD_500}};

/** A deploy without the service-role key: no raw KPIs, and Voted pairs says why it can't count engine-silent pairs. */
export const NoRawVotes: Story = {args: {analytics: loaded(NO_RAW_ANALYTICS), voteLog: loaded(EMPTY_LOG)}};

/** A card in no pairs[] row, that nobody has voted on: the header and one notice. */
export const NoVotes: Story = {args: {card: lorcanaCard({id: '9999', name: 'Elsa', version: 'Snow Queen', rarity: 'Legendary'})}};

/** Local dev: vote analytics was never generated. The header and the raw KPIs still show. */
export const AnalyticsNotGenerated: Story = {args: {analytics: NOT_GENERATED}};

export const AnalyticsLoading: Story = {args: {analytics: LOADING, voteLog: LOADING}};

/** R4's slot: "Edit in Card studio" at the right of the card header. */
export const HeaderActions: Story = {
  args: {
    headerActions: (
      <CtaButton type="button" variant="neutral">
        Edit in Card studio
      </CtaButton>
    ),
  },
};

/** Fourteen more partners for Maui, none of them in the card list, at gaps from 0 to −1.5. */
const MORE_PAIRS = Array.from({length: 14}, (_, i) =>
  pairStat({a: CARD_ID, b: String(1300 + i), bName: `Partner ${i + 1}`, engineScore: 7, communityScore: 7 - (i % 4) * 0.5}),
);

/** Nineteen voted pairs: the list scrolls inside its panel past about ten rows, under a head that stays put. */
export const ManyPairs: Story = {
  args: {analytics: loaded({...VIEW_ANALYTICS, pairs: [...VIEW_ANALYTICS.pairs, ...MORE_PAIRS]})},
};

/** At phone width: the KPIs wrap, and Voted pairs stacks under the calibration. */
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{maxWidth: NARROW}}>
        <Story />
      </div>
    ),
  ],
};
```

`PageLayout` names the tab "Card analytics · Inkweave admin" in Storybook too. That is harmless: nothing restores a title on unmount, and every page sets its own.

- [ ] **Step 17: Lint, typecheck, the whole suite and Code Health**

Run: `pnpm lint`
Expected: no problems.

Run: `pnpm typecheck`
Expected: exit 0. It covers the stories and the test files.

Run: `pnpm test:run`
Expected: every file passes.

Then run CodeScene's `code_health_review` on each new file:
- `cardView.ts`, `cardStyles.ts` and `cardFixtures.ts`;
- `CardAnalyticsView.tsx`, `CardHeader.tsx`, `CardKpis.tsx`, `CardCalibrationPanel.tsx` and `VotedPairsPanel.tsx`;
- `CardAnalyticsView.stories.tsx`;
- the two test files.

Expected: 10.0 each, with no findings (a file with no functions, such as `cardStyles.ts` or the stories, reports no score).

Count the primitive parameters by hand too: string, number or boolean, aliases included, in named functions.
- `cardView.ts` has 1 in 8 (`calibrationData`'s `cardId`).
- `cardFixtures.ts` stays under 30%: 2 or 3 in about 14 after R3-4's engine block (R3-4's `ruleIdOf`, `engineFixture`'s `nameOf` lambda if counted, and `viewCard`'s `id`, this task's only new one).
- The view test has 2 in its 4 one-argument helpers (`kpi`'s `label`, `handoffOf`'s `pending`): `onePair` takes an object.

CodeScene gates the PR, so fix a finding now: split the function it names, as this task splits the header and the KPIs.

- [ ] **Step 18: Look at it in Storybook**

Run: `pnpm storybook`, then open http://localhost:6007 → `Admin/Insights/Card analytics/View`. Check these:
- **`Default`, at a wide canvas:**
  - The header: Maui's placeholder thumbnail, "Maui" in Tinos with "Hero to All" beside it, the Ruby icon, the Super rare glyph, the facts and `#113`. The page header's meta reads "Data as of 2026-10-06".
  - Six KPIs, with "raw" on the last two, and the Mean gap in red.
  - Calibration sits beside Voted pairs, and each rule and listed partner is a gold link.
  - Tab through the links. The focus ring shows whole on every rule link, including the first column's, and on every partner link.
  - Gramma Tala's name is plain text.
  - The caption names 3 engine-silent pairs.
- **`ManyPairs`:**
  - Voted pairs scrolls inside its panel after about ten rows, and its head stays put and opaque while the rows scroll under it.
  - The 14 added partners aren't in the card list, so they are plain text. Tab through the partner links to Heihei's, the 14th row, which scrolls the list. Then Shift+Tab back to Tamatoa's, the 3rd: it scrolls back into view below the head, with its focus ring whole.
  - The sidebar shows `View` beside R3-5's `Switcher` under "Card analytics".
- **`LowN`:**
  - The headline reads "too few score votes to judge this card", and the scale has no dot.
  - The header has no thumbnail, version, rarity or number, and shows both inks.
- **`Narrow`:** the KPIs wrap, and Voted pairs stacks under the calibration panel, with no sideways scroll on the page.
- **`HeaderActions`:** "Edit in Card studio" sits at the right of the card header.
- **Every story:** Storybook's Accessibility panel reports no violations. This includes the gold links on the panel, and the muted text on the sticky head's fill.

Stop the server afterwards. If no browser is available to the implementer, record each check as pending with the owner, as R1-2's Step 11 did, and say so in the report.

- [ ] **Step 19: Commit**, with the Bash tool, only after the owner approves. Use two separate calls, so the commit command starts with `USER_APPROVED=1`:

```bash
git add src/tools/analytics/cards/cardView.ts src/tools/analytics/cards/cardStyles.ts src/tools/analytics/cards/CardAnalyticsView.tsx src/tools/analytics/cards/CardHeader.tsx src/tools/analytics/cards/CardKpis.tsx src/tools/analytics/cards/CardCalibrationPanel.tsx src/tools/analytics/cards/VotedPairsPanel.tsx src/tools/analytics/cards/CardAnalyticsView.stories.tsx src/tools/analytics/cards/cardFixtures.ts src/tools/analytics/cards/__tests__/cardView.test.ts src/tools/analytics/cards/__tests__/CardAnalyticsView.test.tsx src/tools/analytics/GapScale.tsx src/tools/analytics/verdict.ts
```

```bash
USER_APPROVED=1 git commit -m "feat(cards): add the card view's header, KPIs, calibration and voted pairs (#24)"
```

Never pipe the commit, and never stage `public/admin-data/`. Husky's pre-commit runs lint and the tests. If Vitest fails to start its workers under load, stop this session's preview servers, wait out other sessions' runs, and retry.

### Hand-offs from R3-6a

- **R3-6b (the raw-vote panels).**
  - It adds its row after the view's `CalibrationRow`, in the same `VIEW` grid.
  - It reads `rawVotesFor` and `votesOnCard` from `cardView.ts`. `'none'` is its raw-votes notice. For `'waiting'`, it reads `voteLog.loading` and `voteLog.error` for "Loading vote log..." or the error. A `'card'` with no votes is "No raw votes on this card yet."
  - Its captions use `CAPTION` from `cardStyles.ts`.
  - The histogram subtitle's "engine X on the pairs it scores" can read `calibrationOf(calibrationData(…))?.engineAvg`.
  - Maui's fixtures already give it 17 scored votes and one quick vote, and card 500's give it a part last week.
  - **Its Step 11 count.** The view test has 33 cases after this task, not 29. So R3-6b's "29 + 2 = 31" becomes 33 + 2 = 35.
- **R3-6c (the engine view).**
  - It adds `synergies: UseCardSynergiesReturn` to `CardAnalyticsViewProps`, and its two panels after R3-6b's row.
  - Names come from the view's `getCardById` (`?.fullName ?? id` and `?.name ?? id`), and node links from `cardsHref`. Node links don't ask; the page does (R3-7, R-48).
  - The engine caption's "as of" date comes from `analytics.data?.generatedAt`.
- **R3-7 (the page).**
  - It owns `useFocusHandoff()`, and renders `<CardAnalyticsView key={card.id} card={card} … getCardById={getCardById} handoff={handoff} />` (R-46).
  - `PageLayout`'s `meta` is `<DataAsOf generatedAt={analytics.data.generatedAt} />` once vote analytics loads, as these stories show it.
  - A test there follows a partner link and expects the new card's `h2` to have focus. Its `useCardHandoff` is what asks: Voted pairs' links don't (note 8).
- **R3-9 (docs).**
  - The plan commit records these files.
  - **The sidebar check.** The view's stories are titled `Admin/Insights/Card analytics/View`, not exactly `Admin/Insights/Card analytics`. So no node is a story title and a group at once, and R3-9's check for that, with its `fix(cards)` fallback, can go. What remains: "Card analytics" holds `View`, `Switcher`, `Raw-vote panels`, `Engine panels` and `Page states`, and each story opens.

<!--
Review of 2026-10-06 (notes 1 to 10), applied after re-checking each in scratchpad/r3-rebase/sandbox-R3-6a-fix.
- Note 1 (no click-time request): applied as written. R3-07-route-page.md's hand-off and R3-6c.template.md's agree, and the stand-in page probe passes 2 of 2 with the links not asking.
- Note 2 (story title): applied. Also recorded for R3-9, whose sidebar check assumed the exact "Admin/Insights/Card analytics" title.
- Note 3 (scroll padding): applied with 40px (SPACING.xxxl + SPACING.sm), not 32px. The sticky head is 32.5px, not about 30: HEAD_CELL's 8px padding twice, plus an 11px line at the app's :root line-height of 1.5 (upstream index.css). At 32px the link's top would sit 0.5px under the head and the top 4.5px of its focus ring (2px outline, 2px offset) would be hidden. At 40px both are clear. The test expects '40px', and a 32px mutant fails it.
- Note 4 (printing glyph): applied. The review's mutant (lowercase key, no config guard) fails the test now.
- Note 5 (notice with the engine-silent count): applied, with a reworded title. "The card's every scored pair is engine-silent" contradicts itself, since engine-silent pairs are the unscored ones. Card 710's only votes are with card 500, all engine-silent.
- Note 6 (titles that overclaim): applied. The two additions are separate cases, not second renders inside the old ones: "drops the raw two for a card the log has no vote on", and an it.each of LOADING and NOT_GENERATED for "still renders". So each title says what it checks, no unmount is needed, and the count matches note 7's "31 + 2". The rawVotesFor table is [description, kind, input], and the silentNote title reads "when the engine scores every voted pair".
- Note 7 (counts): applied. Step 14 expects 53 (20 + 33), and the whole suite is 103 files and 1,224 tests. R3-06b-vote-panels.md's "29 + 2 = 31" is outside this file, so the R3-6b hand-off records 33 + 2 = 35.
- Note 8 (fixtures' primitives): applied in note 13 and Step 17.
- Note 9 (optional, label in name): not applied. The th isn't a control. WCAG 2.5.3 Label in Name covers user interface components, and the global constraint covers "every clickable thing". A short visible head with its full words as the accessible name is the usual pattern for an abbreviated column. A wrapped two-line head would be about 49px on every column, would need about 56px of scroll padding, and can't be checked for fit without a browser.
- Note 10 (optional, onePair's primitives): applied. onePair takes {gap, scoreVotes}.
-->
