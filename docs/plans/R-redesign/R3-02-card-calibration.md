> Part of [R: Admin redesign](../R-redesign.md), phase R3 ([R3-card-analytics.md](R3-card-analytics.md)). Read the main plan's decisions (R-28 to R-56 for R3), corrections, global constraints and shared interfaces, then the R3 header, first.

> **Re-base notes (R3-2, 2026-10-06).** Re-based on main @ `aea40b4` (branch `feature/24-redesign-r3`), the app pin `upstream/inkweave` @ `bc877e1`, decisions R-28 to R-56 and the audit (`audit-R3-2.json`). The outline was written on 2026-10-01 against the planned R1 code.
> - **Folder.** Everything lives in `src/tools/analytics/cards/`, laid out like R2's `calibration/` folder (and `overview/`, `activity/`): the model `cardStats.ts` beside its page, the test in `cards/__tests__/`, and the shared fixtures in a plain sibling module, `cardFixtures.ts`.
> - **Fixtures move out of `__tests__` (significant).** The outline's `__tests__/fixtures.ts` becomes `cards/cardFixtures.ts`. A story can't import a test file, and R3-6's stories need the same data. This is R2's rule (calibration/chartFixtures.ts:5-12, overview/overviewFixtures.ts:5-10).
>   - Every builder takes one object: `pairStat(seed)` and `ruleStat(seed)`, as overviewFixtures.ts:12-14 builds rules. chartFixtures' `pairOf` already takes 6 positional parameters.
>   - The module exports `CARD_ID`, `CARD_NAME`, `CARD_PAIRS`, `CARD_RULES` and `REVIEW_PAIRS`. R3-3 adds the card's raw votes, R3-4 its synergy file, and R3-6 its cards and engine results.
> - **R-32: no accuracy sentiment here.** `CardPair` and `CardCalibration` drop `accuracySentiment`, and so do the sentiment test and the fixtures. R3-1 no longer edits `PairStat`. The KPI comes from the card's raw accuracy answers in R3-3 (`cardVotes.ts`).
> - **R-52: `CardPair` is the `pairs[]` row plus its partner** (`interface CardPair extends PairStat {partnerId; partnerName}`), built with one spread. `PairList` (`pairs: PairStat[]`, PairList.tsx:11, for R-47) and the `PairStat` helpers (`pairWords`, `scatterPoints`, `gapBins`, chartData.ts:77/:90/:160) take it as it is. R2's other pair helpers (`pairId`, calibrationModel.ts:155; `gapSide` and `scoreText`, chartData.ts:49/:55) take primitives, which a `CardPair`'s fields supply.
> - **No `minVotes` parameters (significant for Code Health).** `cardCalibration`, `rulesForCard` and `cardReadLine` use `MIN_RULE_VOTES` directly (overviewStats.ts:11). No caller passed another value, and two callers passing different values could split a verdict from its read line.
>   - `cardReadLine(cal)` reads `cal.enoughVotes` and builds its plural with `countOf` (activityModel.ts:61-63), as R2 does (calibrationModel.ts:210,217).
>   - The module's primitive arguments are 3 of 24 (12.5%), against the gate's 30%. The outline's signatures gave 44%.
> - **One private weighted mean.** `voteWeighted(pairs, value)` ports the precompute's `voteWeightedMean` (scripts/lib/voteAnalytics.mjs:46-56): the same summing order, and null at zero weight. It is typed on `PairStat`. The audit's generic version was only needed for the sentiment's narrowed list, which R-32 removes.
> - **New: `verdictGap(cal)`.** It returns the card's mean gap to two places, as `fmtGap` prints it, once the card has `MIN_RULE_VOTES` score votes, and null otherwise.
>   - It settles the audit's rounding item in the model rather than in a note for R3-6. An unrounded −0.4996 makes `verdictFor` say "well-calibrated" (|gap| < 0.5, verdict.ts:36) while `fmtGap` prints −0.50 beside it. verdict.ts:17-26 promises that the word, the number and the dot agree. (verdict.ts lines are as R3-5b leaves the file, since R3-5b runs first.)
>   - `cardCalibration` itself stays unrounded, so the identity test holds.
>   - `cardReadLine` reads `verdictGap` too, so its lean matches the printed gap. One change from the outline: −0.2496 now reads "about 0.25 points higher", not "close", because the KPI prints −0.25.
> - **`rulesForCard` is split** into `groupByRule`, `ruleRow` and a named comparator, `byRuleRank`. Low-n rows sort last, and each group sorts by |gap|, then score votes, then name (R-35).
>   - `CardRuleRow.meanGap` is `number | null`, as `RuleStat.meanGap` is. It is never null on real data, because `pairs[]` never holds a pair without a score vote (:23). Its consumers (`fmtGap`, `gapColor`, `BiasBar`) already take null.
> - **`pairsForCard`'s order goes into a named comparator, `byPairRank`.** Names compare with `localeCompare`, as the engine orders partners (SynergyEngine.ts:127) and as R-37 asks of R3-4.
> - **New: `cardsToReview(pairs)` (R-28).** It lists the `CARDS_TO_REVIEW` (5) cards with at least `MIN_RULE_VOTES` score votes, widest |mean gap| first, then score votes, then name. Each row is the card's id, its `pairs[]` name and its `cardCalibration`.
>   - It uses a constant, not an `n` parameter, for the same Code Health reason as `minVotes`.
>   - A shared `sidesOf(pair)` gives each card's view of a pair to both `pairsForCard` and `cardsToReview`, so the partner mapping lives in one place.
>   - `groupByCard` sorts each card's pairs with `byPairRank`, so `cardsToReview` sums them in `pairsForCard`'s order and its numbers match the card page's to the last bit. Float sums depend on their order, and `pairs[]` is sorted only by |gap| (voteAnalytics.mjs:242), so in pairs[] order the two could differ inside |gap| ties. Near a `.xx5` boundary that last bit flips what `fmtGap` prints and what `verdictGap` gives. (Review fix: the draft summed in pairs[] order.)
> - **Tests.** They are written out in full: 37 cases.
>   - The read lines run as one `it.each` table, including ±0.25 (`biasCopy`'s `<=`/`>=`, biasCopy.ts:21,24) and the −0.2496 case.
>   - The 9/10 vote boundary is tested for both the card and a rule.
>   - Every tie-break is tested.
>   - Frozen inputs show that nothing is sorted in place.
>   - `cardsToReview` is checked against the card page's own numbers, and to the last bit on three round2 gaps whose sum depends on its order.
> - **Citations corrected:**
>   - The two lean lines are the prototype's `vRead` (dc.html:949, not :946). The 0-vote and "Only N" lines are this plan's copy.
>   - `LOW_N` is `export const LOW_N = MIN_RULE_VOTES` (calibrationModel.ts:15), an alias rather than a value of its own.
>   - The voteAnalytics.mjs references are now: `computePairRecord` :22-44 (its closing brace is :44, as the header cites it), `voteWeightedMean` :46-56, `buildPairRecords` :62-72, rule credit :112-115, the rule's `meanGap` :127, the global `round2` :193 and `buildAnalytics` :237-243.
>   - The calibration identity holds to float precision while engine scores are whole numbers. ±0.005 bounds only a fractional engine score.
> - **Dependencies.** R3-2 needs nothing from R3-1 any more: under R-32 it uses no new bridge name and no new `PairStat` field. It sits after R3-5b in the new task order.
> - **What was verified, and how.** Copies of `src` were put in a scratch sandbox (`scratchpad/r3-rebase/sandbox-R3-2`), with junctions to the repo's `node_modules` and `upstream`, and Vite's and tsc's caches kept in the sandbox.
>   - **The new test.** Before Step 4 it fails to resolve `../cardStats` ("Tests no tests"). After Step 4 it gives `Tests 37 passed (37)` (re-run after the review fix in `scratchpad/r3-rebase/sandbox-R3-2-fix`, with the code blocks extracted from this file).
>   - **Mutation check.** 18 mutants were run against the model. 17 were killed at first: the six tie-breaks, the card threshold, the low-n order, both roundings, the unweighted mean, the partner side, the filter, the cap, the name fallback, the zero-vote check and the copy. The survivor (`lowN: scoreVotes <= MIN_RULE_VOTES`) led to the rule boundary test, which kills it. A 19th, `groupByCard` without its sort, fails the summing-order test (`1 failed | 36 passed (37)`: −0.044285714285714296 against −0.044285714285714275).
>   - **Typecheck.** `tsc -p` with the repo's `tsconfig.app.json` is clean over the full `src` plus the three files, with the real bridge.
>   - **Full suite.** `vitest run src` under the repo's `vite.config.ts` gave 93 files and 1,086 tests passed. That run predates the review's 37th case, the only test added since, and the full suite wasn't re-run after it. One run timed out under load in `ActivityView.test.tsx` (5 s), which passes alone (17/17) and is untouched here. After the review fix, `tsc -p` over the full `src` is still clean.
>   - **Lint.** All three files pass `pnpm exec eslint --stdin --stdin-filename src/tools/analytics/cards/<file>` (exit 0). A bad control snippet fails (exit 1).
>   - **Code Health.** Local CodeScene (MCP 1.1.3) scores all three files 10.0 with no findings, and still scores `cardStats.ts` and its test 10.0 after the review fix.
>     - Primitive arguments: 3/24 in the model, 0/3 in the fixtures and 0/2 in the test.
>     - The highest cyclomatic complexity is `byRuleRank` at 6.
>     - The server gate is stricter, so run `analyze_change_set` before the phase's push.
>   - **Real data.** The model was run over the owner's local `public/admin-data/vote-analytics.json` (2026-10-05), read in place and never copied into the repo.
>     - `pairs[]` holds 594 cards. 36 have 10 or more score votes, and 19 of those sit outside ±0.5, which matches R-28's figures. The list has 5 rows.
>     - The largest |communityAvg − engineAvg − meanGap| is 1.3e-15.
>     - `verdictGap` changes no card's verdict.
>     - No pair has fewer than 1 score vote, no rule row has a null gap, and no rule falls back to its id.
>     - `cardsToReview`'s numbers equal the card page's for each listed card.
>     - Names are full names ("Hector Rivera - Street Musician"), ids are numeric strings, and every pair has `a < b`.

### Task R3-2: Card calibration model (`cardStats.ts`) and Cards to review

**Files:**
- Create `src/tools/analytics/cards/cardFixtures.ts`: the shared `/cards` fixtures, a plain module that the tests and R3-6's stories both import.
- Create `src/tools/analytics/cards/cardStats.ts`.
- Test: `src/tools/analytics/cards/__tests__/cardStats.test.ts`.

Nothing outside `cards/` changes. `cards/` doesn't exist yet, so nothing collides.

**Interfaces:**
- **Consumes:**
  - `PairStat` and `RuleStat` from `src/tools/analytics/voteAnalyticsTypes.ts` (`RuleStat` :27-43, `PairStat` :45-55). These are the shapes at HEAD: under R-32, R3-1 adds nothing to `PairStat`.
  - `MIN_RULE_VOTES` (`= 10`) from `src/tools/analytics/overview/overviewStats.ts:11`.
    - Not `LOW_N`: calibrationModel.ts:1-9 pulls in the engine and the tuning modules.
    - overviewStats.ts:1 imports `SPACING` from the bridge, so the test reaches app modules. Run `pnpm build:engine` once before a bare `pnpm vitest run` (`test:run` builds the engine itself).
  - `biasCopy(meanGap: number | null): BiasCopy` (`src/tools/analytics/biasCopy.ts:16-28`). Only its `direction` is read: `'over'` at gap ≤ −0.25, `'under'` at gap ≥ +0.25, else `'neutral'`. The band (`NEUTRAL_BAND`, :9) stays private, so 0.25 is never copied.
  - `countOf(n: number, noun: string): string` (`src/tools/analytics/activity/activityModel.ts:61-63`): "1 score vote", "4 score votes".
  - Test only: `fmtGap` (`src/ui/format.ts:30-35`) and `verdictFor` (`src/tools/analytics/verdict.ts:27-42`, as R3-5b leaves it).
  - **The data's guarantees** (scripts/lib/voteAnalytics.mjs):
    - `pairs[]` holds only pairs the engine scores that have at least one score vote. `computePairRecord` drops a pair with none (:23), and `buildPairRecords` splits off engine-silent ones (:62-72).
    - `gap = round2(communityScore − engineScore)`, with `communityScore` already rounded (:27, :30).
    - `rules` holds the engine's rule ids (:41).
    - Names are the card's `fullName` (`addNameIfAbsent`, scripts/precompute-vote-analytics.mjs:92-96).
    - The precompute credits a pair to every rule in its `rules` (:112-115) and weights by `scoreVotes` (:127).
- **Produces:**
```ts
// src/tools/analytics/cards/cardStats.ts
/** How many cards the "Pick a card" prompt lists under Cards to review (R-28). */
export const CARDS_TO_REVIEW = 5;
/** A pairs[] row seen from one of its cards (R-52): R2's PairStat helpers and PairList take it as it is. */
export interface CardPair extends PairStat {partnerId: string; partnerName: string}
export interface CardCalibration {
  pairsVoted: number; scoreVotes: number;
  meanGap: number | null;      // vote-weighted, unrounded
  engineAvg: number | null; communityAvg: number | null;
  enoughVotes: boolean;        // scoreVotes >= MIN_RULE_VOTES
}
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
export function rulesForCard(cardPairs: readonly CardPair[], rules: readonly RuleStat[]): CardRuleRow[]; // low n last; |gap|, votes, name
export function cardsToReview(pairs: readonly PairStat[]): CardToReview[];            // R-28: top CARDS_TO_REVIEW with enoughVotes; |meanGap|, votes, name

// src/tools/analytics/cards/cardFixtures.ts (tests and stories only)
export interface PairSeed {a: string; b: string; engineScore: number; communityScore: number; scoreVotes?: number; rules?: string[]; aName?: string; bName?: string}
export function pairStat(seed: PairSeed): PairStat;   // gap = community − engine, unrounded
export const CARD_ID = '1046';
export const CARD_NAME = 'Maui - Hero to All';
export const CARD_PAIRS: readonly PairStat[];        // Maui's 5 voted pairs (2 with Maui on the b side) and 1 other pair
export function ruleStat(seed: Pick<RuleStat, 'ruleId' | 'ruleName' | 'category' | 'scoreVotes' | 'meanGap'>): RuleStat;
export const CARD_RULES: readonly RuleStat[];        // ramp, shift-targets, singer-songs, location-boost ('retired-rule' has none)
export const REVIEW_PAIRS: readonly PairStat[];      // 7 review cards: 5 listed, a sixth, and one under 10 votes
```

**The read line** (`cardReadLine`). The tests assert these strings exactly.

| Case | Line | Source |
|---|---|---|
| No score votes | `No score votes on pairs the engine scores yet.` | plan copy |
| Under `MIN_RULE_VOTES` | `` `Only ${countOf(n, 'score vote')} on pairs the engine scores. The verdict needs 10.` `` | plan copy |
| `verdictGap` ≤ −0.25 | `` `The engine rates this card's pairs about ${m} points higher than the community.` `` | dc.html:949 |
| `verdictGap` ≥ +0.25 | `` `The engine rates this card's pairs about ${m} points lower than the community.` `` | dc.html:949 |
| Otherwise | `Its pairs score close to what the community says.` | dc.html:949 |

The read line reads `verdictGap`, so its lean always matches the printed gap. The read line is finer than the verdict on purpose (verdict.ts:21-23, after R3-5b). A −0.3 card reads "well-calibrated", with the lean noted in the line under it.

**The fixture card** (`CARD_PAIRS`, engine → community, score votes, rules):

| Partner (id) | Maui's side | Engine → community | Votes | Gap | Rules |
|---|---|---|---|---|---|
| Moana - Of Motunui (1012) | b | 8 → 5.5 | 6 | −2.5 | ramp, singer-songs |
| Pua - Potbellied Buddy (1187) | a | 5 → 7 | 1 | +2 | shift-targets |
| Tamatoa - So Shiny! (1033) | b | 6 → 4 | 1 | −2 | location-boost |
| Heihei - Boat Snack (1102) | a | 7 → 7.25 | 4 | +0.25 | ramp |
| Gramma Tala - Storyteller (2001) | a | 9 → 9 | 2 | 0 | ramp, retired-rule |

Plus Heihei × Pua (4 → 6, 3 votes), which doesn't involve Maui. Maui has 14 score votes, a mean gap of exactly −1, and averages of 7.5 → 6.5. Its rules table reads: Ramp (3 pairs, 12 votes, −14/12), then the low-n rows Singer + Songs (−2.5), Location Boost (−2) and Shift Targets (+2), the last two tied and ordered by name, then `retired-rule` (0), named by its id.

- [ ] **Step 1: Write the shared fixtures**

Create `src/tools/analytics/cards/cardFixtures.ts`:

```ts
import type {PairStat, RuleStat} from '../voteAnalyticsTypes';

/*
 * Card analytics fixtures, shared by the /cards tests and stories, as
 * calibration/chartFixtures.ts is for /calibration's. They live in a plain
 * module: Storybook reads every named export of a .stories.tsx file as a
 * story, and a story can't import a test file. Nothing in the app imports this
 * file, so the build leaves it out. Every builder takes one object, so a
 * fixture names what it sets. R3-3 adds the card's raw votes, and R3-4 its
 * synergy file.
 */

/** What a pairs[] fixture sets. Names default to "Card <id>", score votes to 1 and rules to Ramp. */
export interface PairSeed {
  a: string;
  b: string;
  engineScore: number;
  communityScore: number;
  scoreVotes?: number;
  rules?: string[];
  aName?: string;
  bName?: string;
}

/**
 * A pairs[] row, shaped as computePairRecord writes it
 * (scripts/lib/voteAnalytics.mjs:22-44). Its gap is community − engine,
 * unrounded: with a whole engine score the precompute's round2 changes
 * nothing, so communityAvg − engineAvg equals meanGap to float precision.
 * Give `a` the lower id in string order, as the votes table does. Score votes
 * are 1 or more: the precompute drops a pair with none (:23).
 */
export function pairStat(seed: PairSeed): PairStat {
  const {a, b, engineScore, communityScore, scoreVotes = 1, rules = ['ramp']} = seed;
  return {
    a,
    b,
    aName: seed.aName ?? `Card ${a}`,
    bName: seed.bName ?? `Card ${b}`,
    engineScore,
    communityScore,
    gap: communityScore - engineScore,
    scoreVotes,
    rules,
  };
}

/** The card the /cards fixtures look at. */
export const CARD_ID = '1046';
export const CARD_NAME = 'Maui - Hero to All';

/**
 * Maui's five voted pairs, plus one between two other cards. Engine →
 * community (score votes, rules):
 * - Moana 8 → 5.5 (6, Ramp and Singer + Songs), with Maui on the b side;
 * - Pua 5 → 7 (1, Shift Targets) and Tamatoa 6 → 4 (1, Location Boost, Maui
 *   on the b side): the same |gap| and votes, so the name orders them;
 * - Heihei 7 → 7.25 (4, Ramp);
 * - Gramma Tala 9 → 9 (2, Ramp and a rule the analytics no longer have).
 * Maui: 14 score votes, mean gap −1, engine 7.5 → community 6.5.
 */
export const CARD_PAIRS: readonly PairStat[] = [
  pairStat({
    a: '1012',
    b: CARD_ID,
    aName: 'Moana - Of Motunui',
    bName: CARD_NAME,
    engineScore: 8,
    communityScore: 5.5,
    scoreVotes: 6,
    rules: ['ramp', 'singer-songs'],
  }),
  pairStat({
    a: '1033',
    b: CARD_ID,
    aName: 'Tamatoa - So Shiny!',
    bName: CARD_NAME,
    engineScore: 6,
    communityScore: 4,
    rules: ['location-boost'],
  }),
  pairStat({
    a: CARD_ID,
    b: '1102',
    aName: CARD_NAME,
    bName: 'Heihei - Boat Snack',
    engineScore: 7,
    communityScore: 7.25,
    scoreVotes: 4,
  }),
  pairStat({
    a: CARD_ID,
    b: '1187',
    aName: CARD_NAME,
    bName: 'Pua - Potbellied Buddy',
    engineScore: 5,
    communityScore: 7,
    rules: ['shift-targets'],
  }),
  pairStat({
    a: CARD_ID,
    b: '2001',
    aName: CARD_NAME,
    bName: 'Gramma Tala - Storyteller',
    engineScore: 9,
    communityScore: 9,
    scoreVotes: 2,
    rules: ['ramp', 'retired-rule'],
  }),
  pairStat({
    a: '1102',
    b: '1187',
    aName: 'Heihei - Boat Snack',
    bName: 'Pua - Potbellied Buddy',
    engineScore: 4,
    communityScore: 6,
    scoreVotes: 3,
  }),
];

/** What a sample rule sets; the card page reads only its id and name. */
type RuleSeed = Pick<RuleStat, 'ruleId' | 'ruleName' | 'category' | 'scoreVotes' | 'meanGap'>;

/** A RuleStat with its secondary counts filled in, as overview/overviewFixtures.ts builds them. */
export function ruleStat(seed: RuleSeed): RuleStat {
  return {...seed, pairsVoted: Math.round(seed.scoreVotes / 2), accuracySentiment: null, pairsCovered: 0.4};
}

/** The analytics rules behind CARD_PAIRS. 'retired-rule' has none, so the card's table names it by its id. */
export const CARD_RULES: readonly RuleStat[] = [
  ruleStat({ruleId: 'ramp', ruleName: 'Ramp', category: 'playstyle', scoreVotes: 557, meanGap: -0.57}),
  ruleStat({ruleId: 'shift-targets', ruleName: 'Shift Targets', category: 'direct', scoreVotes: 214, meanGap: -0.22}),
  ruleStat({ruleId: 'singer-songs', ruleName: 'Singer + Songs', category: 'direct', scoreVotes: 141, meanGap: 0.14}),
  ruleStat({ruleId: 'location-boost', ruleName: 'Location Boost', category: 'playstyle', scoreVotes: 9, meanGap: 2.44}),
];

/** A card for Cards to review: two pairs with cards of its own, both at `gap`, with `votes` score votes each. */
interface ReviewSeed {
  id: string;
  name: string;
  gap: number;
  votes: readonly [number, number];
}

/** A review card's two pairs. Each partner's id extends the card's, so the card keeps the a side. */
function reviewPairs({id, name, gap, votes}: ReviewSeed): PairStat[] {
  return votes.map((scoreVotes, i) =>
    pairStat({a: id, b: `${id}${i + 1}`, aName: name, engineScore: 6, communityScore: 6 + gap, scoreVotes}),
  );
}

/**
 * Seven cards at quarter-point gaps (exact in floating point), and their
 * partners, none of which reaches 10 score votes. Cards to review lists Elsa
 * (−1.75), Stitch (+1.5), Hades (+1.25, 12 votes), Belle (−1.25, 10 votes) and
 * Tinker Bell (+0.75); Mickey (−0.5) is sixth, and Ursula's −3 rests on 9
 * votes.
 */
const REVIEW_SEEDS: readonly ReviewSeed[] = [
  {id: '3001', name: 'Elsa - Spirit of Winter', gap: -1.75, votes: [5, 5]},
  {id: '3002', name: 'Stitch - Rock Star', gap: 1.5, votes: [5, 5]},
  {id: '3003', name: 'Belle - Strange but Special', gap: -1.25, votes: [5, 5]},
  {id: '3004', name: 'Hades - King of Olympus', gap: 1.25, votes: [6, 6]},
  {id: '3005', name: 'Tinker Bell - Giant Fairy', gap: 0.75, votes: [5, 5]},
  {id: '3006', name: 'Mickey Mouse - Wayward Sorcerer', gap: -0.5, votes: [5, 5]},
  {id: '3007', name: 'Ursula - Power Hungry', gap: -3, votes: [4, 5]},
];
export const REVIEW_PAIRS: readonly PairStat[] = REVIEW_SEEDS.flatMap(reviewPairs);
```

- [ ] **Step 2: Write the failing test**

Create `src/tools/analytics/cards/__tests__/cardStats.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {fmtGap} from '../../../../ui/format';
import {MIN_RULE_VOTES} from '../../overview/overviewStats';
import {verdictFor} from '../../verdict';
import type {PairStat} from '../../voteAnalyticsTypes';
import {CARD_ID, CARD_NAME, CARD_PAIRS, CARD_RULES, pairStat, REVIEW_PAIRS} from '../cardFixtures';
import {
  type CardPair,
  cardCalibration,
  cardReadLine,
  cardsToReview,
  CARDS_TO_REVIEW,
  pairsForCard,
  rulesForCard,
  verdictGap,
} from '../cardStats';

/** A test pair of CARD_ID's: its gap (community − engine), score votes (default MIN_RULE_VOTES) and partner. */
interface GapSeed {
  gap: number;
  scoreVotes?: number;
  partner?: string;
}

/** One of CARD_ID's pairs, at an engine score of 5. */
function gapPair({gap, scoreVotes = MIN_RULE_VOTES, partner = '2001'}: GapSeed): PairStat {
  return pairStat({a: CARD_ID, b: partner, engineScore: 5, communityScore: 5 + gap, scoreVotes});
}

/** CARD_ID's calibration over these pairs. */
function calibrate(pairs: readonly PairStat[]) {
  return cardCalibration(pairsForCard(pairs, CARD_ID));
}

const MAUI = pairsForCard(CARD_PAIRS, CARD_ID);

describe('pairsForCard', () => {
  it('finds the card on either side, and takes each partner from the other', () => {
    expect(MAUI.map((p) => [p.partnerId, p.partnerName])).toEqual([
      ['1012', 'Moana - Of Motunui'],
      ['1187', 'Pua - Potbellied Buddy'],
      ['1033', 'Tamatoa - So Shiny!'],
      ['1102', 'Heihei - Boat Snack'],
      ['2001', 'Gramma Tala - Storyteller'],
    ]);
  });

  it('keeps the pairs[] row whole, so a CardPair is a PairStat (R-52)', () => {
    const moana: PairStat = MAUI[0];
    expect(moana).toEqual({...CARD_PAIRS[0], partnerId: '1012', partnerName: 'Moana - Of Motunui'});
  });

  it("leaves out other cards' pairs, and finds none for a card in no pair", () => {
    expect(MAUI.every((p) => p.a === CARD_ID || p.b === CARD_ID)).toBe(true);
    expect(pairsForCard(CARD_PAIRS, '9999')).toEqual([]);
  });

  it('orders the widest |gap| first, then more score votes, then the partner name', () => {
    const pairs = [
      gapPair({gap: 1, scoreVotes: 2, partner: '2001'}),
      gapPair({gap: -1, scoreVotes: 5, partner: '2002'}),
      gapPair({gap: 3, scoreVotes: 1, partner: '2003'}),
      pairStat({a: CARD_ID, b: '2004', bName: 'Aladdin', engineScore: 5, communityScore: 6, scoreVotes: 2}),
    ];
    expect(pairsForCard(pairs, CARD_ID).map((p) => p.partnerName)).toEqual([
      'Card 2003',
      'Card 2002',
      'Aladdin',
      'Card 2001',
    ]);
  });

  it('leaves its input in its order: sorting a frozen array in place would throw', () => {
    expect(() => pairsForCard(Object.freeze([...CARD_PAIRS]), CARD_ID)).not.toThrow();
  });
});

describe('cardCalibration', () => {
  it("weights every average by score votes: Maui's 14 votes", () => {
    expect(cardCalibration(MAUI)).toEqual({
      pairsVoted: 5,
      scoreVotes: 14,
      meanGap: -1,
      engineAvg: 7.5,
      communityAvg: 6.5,
      enoughVotes: true,
    });
  });

  it('gives −0.5 for gaps of −1 on 3 votes and +1 on 1 vote', () => {
    const cal = calibrate([
      gapPair({gap: -1, scoreVotes: 3, partner: '2001'}),
      gapPair({gap: 1, scoreVotes: 1, partner: '2002'}),
    ]);
    expect(cal.meanGap).toBe(-0.5);
  });

  it('keeps community − engine equal to the mean gap, to float precision', () => {
    const cal = calibrate([
      pairStat({a: CARD_ID, b: '2001', engineScore: 5, communityScore: 6.1, scoreVotes: 3}),
      pairStat({a: CARD_ID, b: '2002', engineScore: 7, communityScore: 5.33, scoreVotes: 2}),
      pairStat({a: CARD_ID, b: '2003', engineScore: 3, communityScore: 4.67, scoreVotes: 1}),
    ]);
    expect(cal.communityAvg! - cal.engineAvg!).toBeCloseTo(cal.meanGap!, 10);
  });

  it('gives no averages for a card with no voted pairs', () => {
    expect(cardCalibration([])).toEqual({
      pairsVoted: 0,
      scoreVotes: 0,
      meanGap: null,
      engineAvg: null,
      communityAvg: null,
      enoughVotes: false,
    });
  });

  it.each([
    [MIN_RULE_VOTES - 1, false],
    [MIN_RULE_VOTES, true],
  ])('judges a card on %i score votes: %s', (scoreVotes, enough) => {
    expect(calibrate([gapPair({gap: -2, scoreVotes})]).enoughVotes).toBe(enough);
  });
});

describe('verdictGap', () => {
  it('gives the mean gap to two places, as fmtGap prints it', () => {
    const cal = calibrate([gapPair({gap: -0.4996})]);
    expect(verdictGap(cal)).toBe(-0.5);
    expect(fmtGap(verdictGap(cal))).toBe('−0.50');
  });

  it('so the verdict agrees with the printed gap', () => {
    const cal = calibrate([gapPair({gap: -0.4996})]);
    expect(verdictFor(cal.meanGap).word).toBe('well-calibrated');
    expect(verdictFor(verdictGap(cal)).word).toBe('runs generous');
  });

  it('is null under MIN_RULE_VOTES score votes, and with none', () => {
    expect(verdictGap(calibrate([gapPair({gap: -2, scoreVotes: MIN_RULE_VOTES - 1})]))).toBeNull();
    expect(verdictGap(cardCalibration([]))).toBeNull();
  });
});

describe('cardReadLine', () => {
  it.each<[string, readonly PairStat[], string]>([
    ['no score votes', [], 'No score votes on pairs the engine scores yet.'],
    [
      '1 score vote',
      [gapPair({gap: -2, scoreVotes: 1})],
      'Only 1 score vote on pairs the engine scores. The verdict needs 10.',
    ],
    [
      '4 score votes',
      [gapPair({gap: -2, scoreVotes: 4})],
      'Only 4 score votes on pairs the engine scores. The verdict needs 10.',
    ],
    [
      'a gap of −0.3',
      [gapPair({gap: -0.3})],
      "The engine rates this card's pairs about 0.30 points higher than the community.",
    ],
    [
      'a gap of +0.83',
      [gapPair({gap: 0.83})],
      "The engine rates this card's pairs about 0.83 points lower than the community.",
    ],
    [
      'a gap of −0.25',
      [gapPair({gap: -0.25})],
      "The engine rates this card's pairs about 0.25 points higher than the community.",
    ],
    [
      'a gap of +0.25',
      [gapPair({gap: 0.25})],
      "The engine rates this card's pairs about 0.25 points lower than the community.",
    ],
    [
      'a gap of −0.2496, printed −0.25',
      [gapPair({gap: -0.2496})],
      "The engine rates this card's pairs about 0.25 points higher than the community.",
    ],
    ['a gap of −0.24', [gapPair({gap: -0.24})], 'Its pairs score close to what the community says.'],
    ['a gap of +0.24', [gapPair({gap: 0.24})], 'Its pairs score close to what the community says.'],
  ])('reads %s', (_, pairs, line) => {
    expect(cardReadLine(calibrate(pairs))).toBe(line);
  });
});

describe('rulesForCard', () => {
  const rows = rulesForCard(MAUI, CARD_RULES);

  it('counts a pair toward every rule that scored it, low n last (R-35)', () => {
    expect(rows).toEqual([
      {ruleId: 'ramp', ruleName: 'Ramp', pairs: 3, scoreVotes: 12, meanGap: -14 / 12, lowN: false},
      {ruleId: 'singer-songs', ruleName: 'Singer + Songs', pairs: 1, scoreVotes: 6, meanGap: -2.5, lowN: true},
      {ruleId: 'location-boost', ruleName: 'Location Boost', pairs: 1, scoreVotes: 1, meanGap: -2, lowN: true},
      {ruleId: 'shift-targets', ruleName: 'Shift Targets', pairs: 1, scoreVotes: 1, meanGap: 2, lowN: true},
      {ruleId: 'retired-rule', ruleName: 'retired-rule', pairs: 1, scoreVotes: 2, meanGap: 0, lowN: true},
    ]);
  });

  it('breaks a tie on |gap| by score votes, then by name', () => {
    const pairs: CardPair[] = pairsForCard(
      [
        pairStat({a: CARD_ID, b: '2001', engineScore: 5, communityScore: 6, scoreVotes: 2, rules: ['zeta']}),
        pairStat({a: CARD_ID, b: '2002', engineScore: 5, communityScore: 4, scoreVotes: 3, rules: ['omega']}),
        pairStat({a: CARD_ID, b: '2003', engineScore: 5, communityScore: 4, scoreVotes: 2, rules: ['alpha']}),
      ],
      CARD_ID,
    );
    expect(rulesForCard(pairs, []).map((row) => row.ruleId)).toEqual(['omega', 'alpha', 'zeta']);
  });

  it.each([
    [MIN_RULE_VOTES - 1, true],
    [MIN_RULE_VOTES, false],
  ])('marks a rule on %i score votes low n: %s', (scoreVotes, lowN) => {
    const [row] = rulesForCard(pairsForCard([gapPair({gap: 1, scoreVotes})], CARD_ID), CARD_RULES);
    expect(row.lowN).toBe(lowN);
  });

  it('gives no rows for a card with no voted pairs', () => {
    expect(rulesForCard([], CARD_RULES)).toEqual([]);
  });

  it('leaves its input in its order', () => {
    expect(() => rulesForCard(Object.freeze([...MAUI]), Object.freeze([...CARD_RULES]))).not.toThrow();
  });
});

describe('cardsToReview (R-28)', () => {
  const listed = cardsToReview(REVIEW_PAIRS);

  it('lists the cards with 10 or more score votes, widest |mean gap| first, then more votes', () => {
    expect(listed.map((card) => card.cardName)).toEqual([
      'Elsa - Spirit of Winter',
      'Stitch - Rock Star',
      'Hades - King of Olympus',
      'Belle - Strange but Special',
      'Tinker Bell - Giant Fairy',
    ]);
  });

  it(`stops at ${CARDS_TO_REVIEW}, and never lists a card under 10 score votes, however wide its gap`, () => {
    expect(listed).toHaveLength(CARDS_TO_REVIEW);
    expect(listed.map((card) => card.cardId)).not.toContain('3007');
    expect(listed.every((card) => card.scoreVotes >= MIN_RULE_VOTES)).toBe(true);
  });

  it("carries each card's id, name and calibration", () => {
    expect(listed[0]).toEqual({
      cardId: '3001',
      cardName: 'Elsa - Spirit of Winter',
      pairsVoted: 2,
      scoreVotes: 10,
      meanGap: -1.75,
      engineAvg: 6,
      communityAvg: 4.25,
      enoughVotes: true,
    });
  });

  it('counts a pair toward both its cards, and breaks a full tie by name', () => {
    const pair = pairStat({a: '1', b: '2', aName: 'Beta', bName: 'Alpha', engineScore: 5, communityScore: 7});
    expect(cardsToReview([{...pair, scoreVotes: MIN_RULE_VOTES}]).map((card) => card.cardId)).toEqual(['2', '1']);
  });

  it("sums a card's pairs in the card page's order, so its numbers match it to the last bit", () => {
    // Gaps as round2 writes them. Summed in pairs[] order instead, the mean differs in its last bit.
    const pairs = [
      {...pairStat({a: '1', b: '4', engineScore: 5, communityScore: 5.16, scoreVotes: 5}), gap: 0.16},
      {...pairStat({a: '1', b: '3', engineScore: 5, communityScore: 5.78, scoreVotes: 5}), gap: 0.78},
      {...pairStat({a: '1', b: '2', engineScore: 5, communityScore: 3.67, scoreVotes: 4}), gap: -1.33},
    ];
    expect(cardsToReview(pairs)[0].meanGap).toBe(cardCalibration(pairsForCard(pairs, '1')).meanGap);
  });

  it("matches the card page's own numbers", () => {
    const maui = cardsToReview(CARD_PAIRS).find((card) => card.cardId === CARD_ID);
    expect(maui).toEqual({cardId: CARD_ID, cardName: CARD_NAME, ...cardCalibration(MAUI)});
  });

  it('lists nothing before any card has 10 score votes, and leaves its input in its order', () => {
    expect(cardsToReview([gapPair({gap: -3, scoreVotes: MIN_RULE_VOTES - 1})])).toEqual([]);
    expect(() => cardsToReview(Object.freeze([...REVIEW_PAIRS]))).not.toThrow();
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

On a fresh clone or after a pin bump, build the engine first: the test reaches the bridge through `overviewStats.ts` and `verdict.ts`.

```bash
pnpm build:engine
pnpm vitest run src/tools/analytics/cards/__tests__/cardStats.test.ts
```

Expected: `Error: Failed to resolve import "../cardStats" from "src/tools/analytics/cards/__tests__/cardStats.test.ts". Does the file exist?`, with `Test Files  1 failed (1)` and `Tests  no tests`.

- [ ] **Step 4: Write the model**

Create `src/tools/analytics/cards/cardStats.ts`:

```ts
import {countOf} from '../activity/activityModel';
import {biasCopy} from '../biasCopy';
import {MIN_RULE_VOTES} from '../overview/overviewStats';
import type {PairStat, RuleStat} from '../voteAnalyticsTypes';

/*
 * The calibration side of /cards (R3): one card's share of vote-analytics.json's
 * pairs[], which holds the pairs the engine scores that have at least one score
 * vote (scripts/lib/voteAnalytics.mjs:23, :62-72). Every average is weighted by
 * scoreVotes, as the precompute weights the global and per-rule ones
 * (voteWeightedMean, :46-56), so a card's numbers compare with the Overview's
 * and /calibration's. The raw-vote side is cardVotes.ts (R3-3). Nothing here
 * reorders its input.
 */

/** How many cards the "Pick a card" prompt lists under Cards to review (R-28). */
export const CARDS_TO_REVIEW = 5;

/**
 * One of a card's voted pairs, seen from the card: the pairs[] row itself, so
 * PairList and R2's PairStat helpers (pairWords, scatterPoints, gapBins) take
 * it as it is (R-52), plus the other card's id and name.
 */
export interface CardPair extends PairStat {
  partnerId: string;
  partnerName: string;
}

/** A card's calibration over its voted pairs. The averages are null when it has no score votes. */
export interface CardCalibration {
  /** How many partners the engine scores have a score vote with the card. */
  pairsVoted: number;
  scoreVotes: number;
  /** Community − engine, vote-weighted, unrounded. verdictGap gives the two-place value to judge and draw. */
  meanGap: number | null;
  engineAvg: number | null;
  communityAvg: number | null;
  /** At least MIN_RULE_VOTES score votes: enough to judge (the corrections to the spec). */
  enoughVotes: boolean;
}

/** A row of the card's rules table: a rule that scored at least one of the card's voted pairs. */
export interface CardRuleRow {
  ruleId: string;
  /** The analytics rule's name, or its id when the artifact has no such rule. */
  ruleName: string;
  /** How many of the card's voted pairs the rule scored. */
  pairs: number;
  scoreVotes: number;
  /** Vote-weighted over those pairs. Null only for pairs with no score vote, which pairs[] never holds. */
  meanGap: number | null;
  /** Under MIN_RULE_VOTES score votes: R2's "low n" chip, and the row sorts after the others (R-35). */
  lowN: boolean;
}

/** A row of Cards to review: a card with enough score votes to judge, and its calibration. */
export interface CardToReview extends CardCalibration {
  cardId: string;
  /** The card's name as pairs[] has it (aName or bName). */
  cardName: string;
}

/** A pair from one of its cards' sides. */
interface CardSide {
  cardId: string;
  cardName: string;
  pair: CardPair;
}

/** A rule and the card's voted pairs it scored. */
interface RuleGroup {
  ruleId: string;
  pairs: CardPair[];
}

/** A card in pairs[], with its name and its voted pairs. */
interface CardGroup {
  cardId: string;
  cardName: string;
  pairs: CardPair[];
}

/** A pair seen from each of its two cards. */
function sidesOf(p: PairStat): CardSide[] {
  return [
    {cardId: p.a, cardName: p.aName, pair: {...p, partnerId: p.b, partnerName: p.bName}},
    {cardId: p.b, cardName: p.bName, pair: {...p, partnerId: p.a, partnerName: p.aName}},
  ];
}

/** The score votes behind some pairs. */
function scoreVotesOf(pairs: readonly PairStat[]): number {
  return pairs.reduce((n, p) => n + p.scoreVotes, 0);
}

/** The mean of `value` over `pairs`, weighted by score votes, as voteWeightedMean is; null at zero weight. */
function voteWeighted(pairs: readonly PairStat[], value: (p: PairStat) => number): number | null {
  let sum = 0;
  let weight = 0;
  for (const p of pairs) {
    sum += value(p) * p.scoreVotes;
    weight += p.scoreVotes;
  }
  return weight === 0 ? null : sum / weight;
}

/** Widest |gap| first, then more score votes, then the partner's name. */
function byPairRank(x: CardPair, y: CardPair): number {
  return (
    Math.abs(y.gap) - Math.abs(x.gap) ||
    y.scoreVotes - x.scoreVotes ||
    x.partnerName.localeCompare(y.partnerName)
  );
}

/**
 * The card's voted pairs, each with its partner: widest |gap| first, then more
 * score votes, then the partner's name. The card may sit on either side of a
 * pair. Empty for a card in no pairs[] row.
 */
export function pairsForCard(pairs: readonly PairStat[], cardId: string): CardPair[] {
  return pairs
    .flatMap(sidesOf)
    .filter((side) => side.cardId === cardId)
    .map((side) => side.pair)
    .sort(byPairRank);
}

/**
 * A card's calibration over its voted pairs (pairsForCard). The averages are
 * vote-weighted and unrounded, so communityAvg − engineAvg equals meanGap to
 * float precision while engine scores are whole numbers.
 */
export function cardCalibration(cardPairs: readonly CardPair[]): CardCalibration {
  const scoreVotes = scoreVotesOf(cardPairs);
  return {
    pairsVoted: cardPairs.length,
    scoreVotes,
    meanGap: voteWeighted(cardPairs, (p) => p.gap),
    engineAvg: voteWeighted(cardPairs, (p) => p.engineScore),
    communityAvg: voteWeighted(cardPairs, (p) => p.communityScore),
    enoughVotes: scoreVotes >= MIN_RULE_VOTES,
  };
}

/** A gap to two places, as fmtGap prints it: −0.4996 is −0.5. */
function asPrinted(gap: number): number {
  return Math.sign(gap) * Number(Math.abs(gap).toFixed(2));
}

/**
 * The gap the card's verdict reads: its mean gap to two places once it has
 * MIN_RULE_VOTES score votes, else null ("not enough data"). R3-6 passes it to
 * verdictFor and GapScale, so the verdict, the scale's dot and the printed gap
 * agree: unrounded, a −0.4996 would read "well-calibrated" (|gap| < 0.5)
 * beside a printed −0.50.
 */
export function verdictGap(cal: CardCalibration): number | null {
  return cal.enoughVotes && cal.meanGap != null ? asPrinted(cal.meanGap) : null;
}

/** The read line of a judged card: which way the engine leans from ±0.25 (biasCopy's band), or close. */
function leanLine(gap: number): string {
  const {direction} = biasCopy(gap);
  if (direction === 'neutral') return 'Its pairs score close to what the community says.';
  const way = direction === 'over' ? 'higher' : 'lower';
  return `The engine rates this card's pairs about ${Math.abs(gap).toFixed(2)} points ${way} than the community.`;
}

/**
 * The plain-English line under the card's verdict. The two lean lines are the
 * prototype's (dc.html:949), read off verdictGap, so they match the printed
 * gap. The two count lines are the plan's own.
 */
export function cardReadLine(cal: CardCalibration): string {
  const gap = verdictGap(cal);
  if (gap != null) return leanLine(gap);
  if (cal.scoreVotes === 0) return 'No score votes on pairs the engine scores yet.';
  const votes = countOf(cal.scoreVotes, 'score vote');
  return `Only ${votes} on pairs the engine scores. The verdict needs ${MIN_RULE_VOTES}.`;
}

/**
 * The card's voted pairs under each rule that scored them. A pair counts toward
 * every rule in its `rules`, as rollUpByRule credits it, so a card's rows add up
 * the way the global ones do.
 */
function groupByRule(cardPairs: readonly CardPair[]): RuleGroup[] {
  const groups = new Map<string, CardPair[]>();
  for (const p of cardPairs) {
    for (const ruleId of p.rules) groups.set(ruleId, [...(groups.get(ruleId) ?? []), p]);
  }
  return Array.from(groups, ([ruleId, pairs]) => ({ruleId, pairs}));
}

/** One rules-table row. `names` maps a rule id to the analytics rule's name. */
function ruleRow(group: RuleGroup, names: ReadonlyMap<string, string>): CardRuleRow {
  const scoreVotes = scoreVotesOf(group.pairs);
  return {
    ruleId: group.ruleId,
    ruleName: names.get(group.ruleId) ?? group.ruleId,
    pairs: group.pairs.length,
    scoreVotes,
    meanGap: voteWeighted(group.pairs, (p) => p.gap),
    lowN: scoreVotes < MIN_RULE_VOTES,
  };
}

/** Rows with enough votes first; within each group the widest |gap|, then more score votes, then the name (R-35). */
function byRuleRank(x: CardRuleRow, y: CardRuleRow): number {
  return (
    Number(x.lowN) - Number(y.lowN) ||
    Math.abs(y.meanGap ?? 0) - Math.abs(x.meanGap ?? 0) ||
    y.scoreVotes - x.scoreVotes ||
    x.ruleName.localeCompare(y.ruleName)
  );
}

/**
 * The card's rules table: one row per rule that scored any of its voted pairs
 * (pairsForCard), named from the analytics rules, "low n" rows last (R-35).
 */
export function rulesForCard(cardPairs: readonly CardPair[], rules: readonly RuleStat[]): CardRuleRow[] {
  const names = new Map(rules.map((r) => [r.ruleId, r.ruleName]));
  return groupByRule(cardPairs)
    .map((group) => ruleRow(group, names))
    .sort(byRuleRank);
}

/** Every card in pairs[], with its voted pairs. A pair counts toward both its cards. */
function groupByCard(pairs: readonly PairStat[]): CardGroup[] {
  const groups = new Map<string, CardGroup>();
  for (const side of pairs.flatMap(sidesOf)) {
    const group = groups.get(side.cardId) ?? {cardId: side.cardId, cardName: side.cardName, pairs: []};
    group.pairs.push(side.pair);
    groups.set(side.cardId, group);
  }
  // Each card's pairs in pairsForCard's order, so its sums run in the same order and match the card page to the last bit.
  return [...groups.values()].map((group) => ({...group, pairs: group.pairs.sort(byPairRank)}));
}

/** Widest |mean gap| first, then more score votes, then the card's name. */
function byCardRank(x: CardToReview, y: CardToReview): number {
  return (
    Math.abs(y.meanGap ?? 0) - Math.abs(x.meanGap ?? 0) ||
    y.scoreVotes - x.scoreVotes ||
    x.cardName.localeCompare(y.cardName)
  );
}

/**
 * Cards to review, under the "Pick a card" prompt (R-28): the CARDS_TO_REVIEW
 * cards with at least MIN_RULE_VOTES score votes, widest |mean gap| first, then
 * more score votes, then name. It reads like the Overview's Rules to review
 * (rulesToReview). A card under the threshold never makes the list, however
 * wide its gap.
 */
export function cardsToReview(pairs: readonly PairStat[]): CardToReview[] {
  return groupByCard(pairs)
    .map(({cardId, cardName, pairs: cardPairs}) => ({cardId, cardName, ...cardCalibration(cardPairs)}))
    .filter((card) => card.enoughVotes)
    .sort(byCardRank)
    .slice(0, CARDS_TO_REVIEW);
}
```

- [ ] **Step 5: Run it and watch it pass**

```bash
pnpm vitest run src/tools/analytics/cards/__tests__/cardStats.test.ts
```

Expected: `Tests  37 passed (37)`.

- [ ] **Step 6: Lint, typecheck and the full suite**

```bash
pnpm lint
pnpm typecheck
pnpm test:run
```

Expected: all three exit 0. Nothing imports the model yet. R3-3 (`cardVotes.ts`, for `CardPair`) and R3-6 (the view) are its first consumers, and R3-7 (the "Pick a card" prompt) uses `cardsToReview`.

If a busy machine times out an unrelated jsdom test (5 s), rerun that file alone before you suspect this task. See the memory note on Vitest worker timeouts under load.

- [ ] **Step 7: Commit the model**

After the owner approves, stage the files with the Bash tool as one call:

```bash
git add src/tools/analytics/cards/cardStats.ts src/tools/analytics/cards/cardFixtures.ts src/tools/analytics/cards/__tests__/cardStats.test.ts
```

Then commit as a separate, unpiped Bash call:

```bash
USER_APPROVED=1 git commit -m "feat(cards): add the card calibration model and Cards to review (#24)"
```

**Notes for later tasks:**
- **R3-3 (`cardVotes.ts`).**
  - Import `CardPair` from `./cardStats`. `engineSilentForCard(cardVotes, cardPairs, isListed)` (header contract 9, R-31) treats a partner outside `cardPairs.map((p) => p.partnerId)` as engine-silent.
  - It appends its own fixtures to `cardFixtures.ts`, after R3-2's exports: `VOTED_CARD`, `VOTED_CARD_LOG` and `VOTED_CARD_PAIRS`.
  - The parity test's identity is `scoreHistogram(...).scored === cardCalibration(pairsForCard(analytics.pairs, id)).scoreVotes + engineSilent.votes`.
  - Name its span type `CardVoteSpan`: R2's `VoteSpan {startDay, endDay}` already exists, and R3-1a moves it to `activity/activityModel.ts` (:132-135 after R3-1a) before this task.
- **R3-6 (the view).**
  - Judge the card with `const gap = verdictGap(cal)`:
    - `verdictFor(gap)` for the headline and colours;
    - `<GapScale meanGap={gap} …>`;
    - the headline is `The engine {verdictFor(gap).phrase} on this card`. With `gap` null (fewer than `MIN_RULE_VOTES` votes) it reads "The engine has too few score votes to judge this card" (R-50, R3-5b).
  - The Mean gap KPI prints `fmtGap(cal.meanGap)`, the same text, coloured only when `cal.enoughVotes`.
  - Engine → community is `fmtScore(cal.engineAvg)` → `fmtScore(cal.communityAvg)`.
  - The rules table is `rulesForCard(cardPairs, analytics.rules)`:
    - each row links with `calibrationHref(row.ruleId)` (R-34);
    - `LowNTag` (from `src/ui` after R3-1a) marks `row.lowN`;
    - the Gap and Bias cells use `fmtGap`, `gapColor` and `BiasBar`, which all take null.
  - Voted pairs passes `cardPairs` to `PairList` as it is (R-47).
  - Accuracy sentiment comes from R3-3's raw answers (R-32), not from here.
  - R3-6a builds its own `VIEW_ANALYTICS` from `CARD_PAIRS`, `VOTED_CARD_PAIRS` and `CARD_RULES`.
  - With `[...CARD_PAIRS, ...REVIEW_PAIRS]`, Cards to review lists Elsa, Stitch, Hades, Belle and Maui (−1.00, 14 votes), and Tinker Bell drops out. `REVIEW_PAIRS` alone lists Elsa, Stitch, Hades, Belle and Tinker Bell.
- **R3-7 (the prompt, R-28).**
  - Once vote analytics loads, list `cardsToReview(analytics.pairs)`. Each row is a link through `cardsHref(card.cardId)`, with `card.cardName`, its `BiasBar` and `fmtGap(card.meanGap)`: no vote count, as Rules to review shows none.
  - The names in `pairs[]` are the cards' full names, as the live card list's `fullName` is.
  - `REVIEW_PAIRS` holds 5 listed cards, a sixth that misses the cut and one under 10 votes, for its test and story. Alone it lists Elsa, Stitch, Hades, Belle and Tinker Bell. Mixed with `CARD_PAIRS`, Maui (−1.00, 14 votes) takes Tinker Bell's place.
  - A fixture that spreads `ANALYTICS` takes it from `../overview/overviewFixtures` (overviewFixtures.ts:47).

<!-- Review of 2026-10-06, applied. No note was rejected.
- Note 1: applied as given (groupByCard sorts each card's pairs with byPairRank; the summing-order test; 37 cases). Re-checked in sandbox-R3-2-fix: 37 passed with the fix, 1 failed | 36 passed without it; eslint --stdin exits 0 on all three files; tsc -p over the full src exits 0; local CodeScene scores cardStats.ts and the test 10.
- Note 4: the new numbers match R3-5b's verdict.ts (sandbox-R3-5b and R3-05b-gap-scale.md Step 9); each citation now says "after R3-5b".
- Note 3: computePairRecord's closing brace is voteAnalytics.mjs:44, so :22-44 was picked and this file's two citations (re-base notes, cardFixtures' pairStat comment) now use it.
- Note 7: applied; the R3-6 bullet also says R3-6a's draft builds its own VIEW_ANALYTICS (CARD_PAIRS + VOTED_CARD_PAIRS), which R3-06a-view-shell.md:307-322 shows. The mixed list (Elsa, Stitch, Hades, Belle, Maui −1 on 14) was re-checked in sandbox-R3-2-fix.
- Note 8: only this file may change, so Step 7 keeps its message and the header-pass list asks for the header's task-table row (:648) to match it.
-->
