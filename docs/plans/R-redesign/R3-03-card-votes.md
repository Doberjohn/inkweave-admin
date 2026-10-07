> Part of [R: Admin redesign](../R-redesign.md), phase R3 ([R3-card-analytics.md](R3-card-analytics.md)). Read the main plan's decisions (R-28 to R-56 for R3), corrections, global constraints and shared interfaces, then the R3 header, first.

> **Re-base notes** (2026-10-06, against main `aea40b4`, pin `bc877e1` and decisions R-28 to R-56)
> - **Its own module.** The raw-vote side moves out of `cardStats.ts` into `src/tools/analytics/cards/cardVotes.ts`, with its own test file. R3-2 and R3-3 sharing one module came to about 9 primitive parameters in 21 (43%), against CodeScene's 30% gate. That gate failed R2 twice (`scatter.ts` on PR #27, and `chartData.ts` at 33.3% on PR #28).
> - **The card is bound once.** `votesForCard` returns `CardVote {vote, side, partnerId}`, and every other function takes `CardVote[]`. `engineSilentForCard` and `cardAnswers` no longer take `cardId`. A carry vote names this card when `whoCarries === side`. By the server's count (function declarations; string, number and boolean are primitive), the module is at 1 primitive parameter in 22 (4.5%).
> - **`cardAnswers` is split.** In one loop it scored 8.28 in the audit's CodeScene probe (cc 22, Bumpy Road). It now assembles small private helpers:
>   - `count` and `tally` do the counting;
>   - `ratio({part, whole})` gives each share and mean;
>   - `accuracyAnswers`, `rateOf` (shared by "is real" and "would play", so the two rates aren't duplicated), `carryShare` and `difficultyAnswers` each read one question.
>
>   Each helper has a cyclomatic complexity of 3 or less.
> - **R-32: sentiment from the raw answers.** `AccuracyAnswers` gains `sentiment`: (too low − too high) / answered, from −1 to +1, null with no answers. That is the prototype's formula (`dc.html:958`). It is also the mean answer, which is how the view defines a pair's `accuracy_sentiment`. The outline's "no sentiment field here" goes, and R3-6a's KPI reads this one with the raw tag.
> - **R-36: votes per week span the whole log.** `votesPerWeek(cardVotes, logSpan)` takes the log's span, `activityWindow(voteLog.votes, 'all')`, as `CalibrationWorkspace.tsx:229` passes it to the weekly gap. It calls `weeklyStacks` once; the outline filtered twice through `votesInRange`. `weeks`, `endDay`, the 12-week window and `latestVoteDay` all go. R3-6b needs the span anyway, to name the part weeks with `bucketTitle` and `partialWeeks`.
> - **R-31: the engine-silent count is split.** `engineSilentForCard(cardVotes, cardPairs, isListed)` keeps the totals for the histogram check. It adds `partnerUnlisted` (rotated out of Core, or a replaced preview id) and `partnerListed` (both cards in Core, still unscored) for R3-6a's Voted pairs caption. The KPI is gone.
> - **`VoteSpan` became `CardVoteSpan`.** R2 already exports a `VoteSpan {startDay, endDay}`, which R3-1a moves beside `activityWindow`. The card's span is now `CardVoteSpan {votes, voters, days: VoteSpan}`, built on `activityWindow(rows, 'all')` rather than a min/max loop.
> - **Types.**
>   - Days are `Day`.
>   - Every input is `readonly`. `votesPerWeek` maps into a fresh array for `weeklyStacks`, which takes a mutable one (`activityModel.ts:190` once R3-1a has moved `VoteSpan`; `:179` at HEAD).
>   - Shares and rates are fractions from 0 to 1. R3-6b prints them with `sharePercent` (in `src/ui/format.ts` after R3-1a).
> - **Fixtures.** They live in R3-2's plain module `cards/cardFixtures.ts`, because R3-6a's and R3-6b's stories need them. `voteRow(overrides)` takes one object. The pairs go through R3-2's `pairStat`, as every fixture does, so `gap` is community − engine. The data covers:
>   - rows the votes table would accept: one vote per voter and pair, and every row answers at least one question (its `has_vote` check, `votes_table.sql:17-20`), so a quick vote here answers who carries;
>   - a Supabase timestamp;
>   - a late-Sunday vote;
>   - the card on side b;
>   - a quick vote, `'both'` and `'neither'`;
>   - an engine-silent pair on each side of the card list;
>   - a quick-only pair;
>   - a log whose first and last votes aren't on the card.
> - **New parity test.** `scripts/lib/__tests__/cardVotesParity.test.mjs` uses `weeklyGapsParity`'s harness to hold the module to the real transforms (`buildAnalytics`, `buildVoteLog`). It checks three things:
>   - for every card, scored votes = `pairs[]` score votes + engine-silent votes;
>   - the engine-silent pairs, summed over every card, are twice `global.engineSilentPairs`;
>   - the cards' weeks add up to twice `global.weekly`, with the skipped weeks filled.
>
>   Its rotated-out card 9 has no name, as on real data (R-29: every unknown voted id has `aName === id`, and `allCards.json` holds only sets 9 to 13). So the test lists its cards by hand, not from the names map.
> - **Citations re-checked.**
>   - `isoWeekStart` is at `voteAnalytics.mjs:139-145`, and `buildVoteLog`'s a < b sort at `:220`.
>   - The value sets are unchanged at the pin and on app master: `votes_table.sql:7-12`, plus the `who_carries` swap in `relax_vote_rate_limit.sql:20-26`. Accuracy −1 is "Should be lower" (`InDepthVoteForm.tsx:78-80`).
>   - `loader.ts:196-198` drops every card outside Core.
> - **Verified** in `scratchpad/r3-rebase/sandbox-r33`. The sandbox had main's files, plus stand-ins:
>   - R3-1's narrowed unions;
>   - R3-1a's `VoteSpan` move;
>   - R3-2's `CardPair`, `pairsForCard` and `cardCalibration`, from the audit's contract.
>
>   The tests were then run again on R3-2's own draft (`sandbox-R3-2`'s `cardStats.ts` and `cardFixtures.ts`, with these fixtures appended). That run passes 36 tests, `tsc` finds nothing in `cards/`, and eslint is clean.
>
>   Results:
>   - Both new files fail on the missing module, with the messages quoted in Step 5. Then 36 tests pass (33 + 3).
>   - The calibration and activity suites still pass with the `VoteSpan` move (16 files, 381 tests).
>   - `tsc` is clean in the new files, against both the narrowed and the original vote types.
>   - `eslint --max-warnings 0` passes, in the sandbox and through `--stdin` from the repo.
>   - Ten mutants were all killed: side swap, quick votes counted as silent, the split inverted, the sentiment sign, `'both'` in the carry denominator, the mean over every vote, "false" counted as yes, a difficulty weight, quick votes dropped from the weeks, and votes counted as voters.
>   - The local CodeScene MCP 1.1.3 gives all four files 10.0. The server is stricter, so R3-9 runs `analyze_change_set` before the push.
>
>   After the review, these blocks were run again in `scratchpad/r3-rebase/sandbox-r33-fix`, on R3-2's draft. The changes were the unnamed card 9, the quick votes' `'both'`, and `VOTED_CARD_PAIRS` through `pairStat`.
>   - Step 7's files, plus `cardStats.test.ts`, pass 74 tests: this task's 38 and R3-2's 36.
>   - `tsc -p tsconfig.app.json` reports no errors.
>   - All four files pass `eslint --max-warnings 0 --stdin` from the repo, and CodeScene scores each 10.0.
>   - Counted from the TypeScript AST, `cardVotes.ts` has 1 primitive parameter in 22 and the fixtures 0 in 4.

### Task R3-3: Card vote model (`cardVotes.ts`)

**Files:**
- Create `src/tools/analytics/cards/cardVotes.ts`.
- Modify `src/tools/analytics/cards/cardFixtures.ts` (R3-2's plain fixtures module): append the raw-vote fixtures.
- Test `src/tools/analytics/cards/__tests__/cardVotes.test.ts`.
- Test `scripts/lib/__tests__/cardVotesParity.test.mjs`.
- No other file changes. The task has no story, because the module is pure data. R3-6a's and R3-6b's stories use the fixtures.

**Interfaces:**
- **Consumes:**
  - `VoteLogRow` (`src/tools/analytics/voteLogTypes.ts:1-14`). R3-1 narrows `accuracy` to `-1 | 0 | 1 | null`, `difficulty` to `1 | 2 | 3 | null` and `whoCarries` to `'a' | 'b' | 'both' | 'neither' | null`. The code below typechecks with or without the narrowing.
  - From `src/tools/analytics/activity/activityModel.ts`, at its lines once R3-1a has landed (R3-1a adds 11 lines before them; at HEAD they are `:131-136` and `:179-183`):
    - `activityWindow(votes: readonly VoteLogRow[], range: RangePreset): VoteSpan | null` (`:142-147`);
    - `weeklyStacks(votes: VoteLogRow[], startDay: Day, endDay: Day): DayStack[]` (`:190-194`), which keys weeks by their UTC Monday, keeps quiet weeks, and counts quick votes in `total`;
    - `type VoteSpan {startDay: Day; endDay: Day}` (`:132-135`), which R3-1a moves here from `calibration/chartData.ts:306-309`, as `activityWindow`'s return type.
  - `type Day` (`src/charts/scale.ts:14`). `weeklyStacks` uses `weekStart` (`:116-121`), the same UTC Monday as the precompute's `isoWeekStart`.
  - From R3-2 (`src/tools/analytics/cards/cardStats.ts`):
    - `type CardPair` (`PairStat` plus `partnerId` and `partnerName`, R-52);
    - `pairsForCard(pairs: readonly PairStat[], cardId: string): CardPair[]`;
    - `cardCalibration(cardPairs: readonly CardPair[]): CardCalibration`, of which this task reads `.scoreVotes` (tests only).
  - From R3-2's fixtures (`src/tools/analytics/cards/cardFixtures.ts`): `pairStat(seed: PairSeed): PairStat`, which names the cards "Card {id}", sets `gap` to community − engine, and defaults `scoreVotes` to 1 and `rules` to `['ramp']`.
  - The parity test also uses `buildAnalytics` (`scripts/lib/voteAnalytics.mjs:237-243`) and `buildVoteLog` (`:216-230`). `computeGlobal` (`:180-213`) writes `engineSilentPairs` and `weekly` through `bucketWeekly` (`:163-173`).
- **Produces:**
```ts
// cardVotes.ts
export interface CardVote {vote: VoteLogRow; side: 'a' | 'b'; partnerId: string}
export function votesForCard(votes: readonly VoteLogRow[], cardId: string): CardVote[];   // either side, log order
export interface SilentCount {pairs: number; votes: number}
export interface EngineSilent extends SilentCount {partnerUnlisted: SilentCount; partnerListed: SilentCount}
export function engineSilentForCard(
  cardVotes: readonly CardVote[], cardPairs: readonly CardPair[], isListed: (cardId: string) => boolean,
): EngineSilent;                                    // scored votes only; isListed: (id) => getCardById(id) !== undefined
export interface ScoreHistogram {counts: number[]; scored: number; unscored: number; mean: number | null} // counts[i]: score i + 1
export function scoreHistogram(cardVotes: readonly CardVote[]): ScoreHistogram;          // plain mean; quick votes counted apart
export interface Rate {yes: number; answered: number; share: number | null}               // share: 0 to 1
export interface AccuracyAnswers {tooHigh: number; right: number; tooLow: number; answered: number; sentiment: number | null}
export interface CarryShare {named: number; singled: number; share: number | null; both: number; neither: number}
export interface DifficultyAnswers {easy: number; situational: number; hard: number; answered: number; mean: number | null}
export interface CardAnswers {accuracy: AccuracyAnswers; isReal: Rate; wouldPlay: Rate; carry: CarryShare; difficulty: DifficultyAnswers}
export function cardAnswers(cardVotes: readonly CardVote[]): CardAnswers;
export interface WeekCount {week: Day; votes: number}                                      // quick votes included
export function votesPerWeek(cardVotes: readonly CardVote[], logSpan: VoteSpan): WeekCount[]; // logSpan: activityWindow(voteLog.votes, 'all')
export interface CardVoteSpan {votes: number; voters: number; days: VoteSpan}
export function cardVoteSpan(cardVotes: readonly CardVote[]): CardVoteSpan | null;

// cardFixtures.ts (added; tests and stories only)
export const VOTED_CARD = '500';
export const UNLISTED_IDS: ReadonlySet<string>;     // {'305'}
export function voteRow(overrides: Partial<VoteLogRow> & Pick<VoteLogRow, 'a' | 'b' | 'ts'>): VoteLogRow;
export const VOTED_CARD_LOG: readonly VoteLogRow[]; // 13 votes, Aug 31 to Oct 6; 11 on card 500
export const VOTED_CARD_PAIRS: readonly PairStat[]; // pairs[] for that log: 120 × 500, 500 × 640, 120 × 640
```
- **What R3-6a and R3-6b read, so their re-bases match.** Both import from `./cardVotes`, not `./cardStats`, and drop `latestVoteDay`. The card's votes are bound once, `votesForCard(voteLog.votes, card.id)` (R3-6a's `rawVotesFor` holds them).
  - **R3-6a: the KPIs and the Voted pairs caption.**
    - **KPIs.** "Distinct voters" is `cardVoteSpan(cardVotes)?.voters`, hint `countOf(span.votes, 'raw vote')`, with the raw tag. "Accuracy sentiment" is `fmtGap(answers.accuracy.sentiment)`, its hint ending in `countOf(answers.accuracy.answered, 'answer')`, with the raw tag (R-32). R3-6a's `rawFigures` reads both. There is no engine-silent KPI (R-31).
    - **Voted pairs caption.** It comes from `engineSilentForCard(cardVotes, cardPairs, (id) => getCardById(id) !== undefined)`, through its `partnerUnlisted` and `partnerListed` (R3-6a's `silentNote`). It renders only once vote analytics has loaded. Without `pairs[]`, every scored pair would read as engine-silent.
  - **R3-6b: the histogram, the answers and the weeks.**
    - **Histogram and answers.** `scoreHistogram(cardVotes)` and `cardAnswers(cardVotes)`.
    - **Votes per week.** The data is `votesPerWeek(cardVotes, logSpan)`, with `logSpan = activityWindow(voteLog.votes, 'all')`, which is non-null whenever the card has votes. The subtitle reads `cardVoteSpan(cardVotes)`'s `days.startDay` and `days.endDay` (`fmtDay`), and appends `partialWeeks(logSpan.startDay, logSpan.endDay)`. The tooltip, the slider and the table's "Week" column use `bucketTitle(w.week, 'week', logSpan.startDay, logSpan.endDay)`, as `weekTitle` does (`calibration/chartData.ts:306-308` after R3-1a; `:328-330` at HEAD). On the 2026-10-05 data, the span is about 26 weeks, and the real-data check (R3-9) looks at the bar density.
    - **Shares.** `Rate.share`, `CarryShare.share` and each accuracy part's share (`part / answered`) print through `sharePercent`. A null share prints "—".
  - **The histogram check** (`scored === cal.scoreVotes + engineSilent.votes`) is for tests only. On real data it can be off by a vote cast between the precompute's two reads (`precompute-vote-analytics.mjs:127` reads `pair_scores`, then `:131` reads the votes). Neither view depends on it.

- [ ] **Step 1: Check what this task builds on**

R3-1, R3-1a and R3-2 come first. Run:
```bash
grep -n "accuracy: -1 | 0 | 1 | null" src/tools/analytics/voteLogTypes.ts
grep -n "export interface VoteSpan" src/tools/analytics/activity/activityModel.ts
grep -nE "^export (type CardPair|interface CardPair|function pairsForCard|function cardCalibration)" src/tools/analytics/cards/cardStats.ts
grep -n "partnerId" src/tools/analytics/cards/cardStats.ts
grep -n "export function pairStat" src/tools/analytics/cards/cardFixtures.ts
grep -nE "VOTED_CARD|UNLISTED_IDS|voteRow" src/tools/analytics/cards/cardFixtures.ts
```
Expected:
- the first two print one line each;
- the third prints three lines (`CardPair`, `pairsForCard`, `cardCalibration`);
- the fourth prints at least one line;
- the fifth prints one line (R3-2's fixture builder);
- the last prints nothing.

If one of the first five prints nothing, stop: R3-1, R3-1a or R3-2 hasn't landed, or it named things differently. Fix the names here before going on. `cardVotes.ts` must not import `VoteSpan` from `calibration/chartData.ts`, which pulls in the engine and the tuning modules through `calibrationModel.ts:1-9`.

The tests reach the bridge through `cardStats.ts` (`overviewStats.ts:1` imports `SPACING`). So on a fresh checkout, or after a pin bump, run `pnpm build:engine` once first.

- [ ] **Step 2: Add the raw-vote fixtures**

Append to `src/tools/analytics/cards/cardFixtures.ts`, after R3-2's exports (its header comment already says "R3-3 adds the card's raw votes"). Add `import type {VoteLogRow} from '../voteLogTypes';` as the line after its `import type {PairStat, RuleStat} from '../voteAnalyticsTypes';`, so the imports stay sorted by path. The new names don't collide with R3-2's (`CARD_ID`, `CARD_PAIRS`, `pairStat`, …). The pairs below go through R3-2's `pairStat`, as every fixture does, so each `gap` is community − engine and each name "Card {id}"; the first pair takes its default rules, `['ramp']`.
```ts
/*
 * Raw votes (R3-3): one card's votes in a small vote log, and the pairs[]
 * rows the precompute would write for that log. Card 500 has, among its
 * partners:
 * - 120 and 640, pairs the engine scores (500 sits on side b of 120's rows
 *   and side a of 640's);
 * - 710, engine-silent with both cards in the card list;
 * - 305, engine-silent with a partner outside the list (UNLISTED_IDS);
 * - 880, only quick votes, so not engine-silent.
 * The log runs from Monday Aug 31 to Tuesday Oct 6, so its last week is a
 * part week, and its first and last votes aren't on card 500.
 */

/** Card 500: the card whose votes the R3-3 fixtures follow. */
export const VOTED_CARD = '500';

/** Partners outside the current card list: the card list's lookup says no to these. */
export const UNLISTED_IDS: ReadonlySet<string> = new Set(['305']);

/** A vote-log row: "Card <a>" × "Card <b>" by voter 1, score 5, nothing else answered. Override what a case needs. */
export function voteRow({a, b, ...rest}: Partial<VoteLogRow> & Pick<VoteLogRow, 'a' | 'b' | 'ts'>): VoteLogRow {
  return {
    a,
    b,
    aName: `Card ${a}`,
    bName: `Card ${b}`,
    score: 5,
    accuracy: null,
    isReal: null,
    wouldPlay: null,
    difficulty: null,
    whoCarries: null,
    voter: 1,
    ...rest,
  };
}

/**
 * The whole vote log, oldest first (the file itself is newest first; nothing
 * reads the order). Timestamps are Supabase's microsecond +00:00 form, and
 * one vote lands late on a Sunday. Every row is one the votes table accepts:
 * no voter votes the same pair twice (its unique index), and every row
 * answers something (its has_vote check), so each quick vote here answers who
 * carries.
 */
export const VOTED_CARD_LOG: readonly VoteLogRow[] = [
  voteRow({a: '120', b: '640', ts: '2026-08-31T12:00:00.123456+00:00', score: 6, voter: 7}),
  voteRow({
    a: '120',
    b: '500',
    ts: '2026-09-08T09:00:00.123456+00:00',
    score: 7,
    accuracy: 0,
    isReal: true,
    wouldPlay: true,
    difficulty: 1,
    whoCarries: 'b',
  }),
  voteRow({
    a: '120',
    b: '500',
    ts: '2026-09-13T23:30:00.123456+00:00',
    score: 5,
    accuracy: -1,
    isReal: true,
    wouldPlay: false,
    difficulty: 2,
    whoCarries: 'a',
    voter: 2,
  }),
  voteRow({
    a: '500',
    b: '640',
    ts: '2026-09-14T10:00:00.123456+00:00',
    score: 9,
    accuracy: 1,
    isReal: false,
    wouldPlay: true,
    difficulty: 3,
    whoCarries: 'a',
  }),
  voteRow({a: '500', b: '640', ts: '2026-09-16T10:00:00.123456+00:00', score: 8, whoCarries: 'both', voter: 3}),
  voteRow({a: '500', b: '640', ts: '2026-09-17T10:00:00.123456+00:00', score: null, whoCarries: 'both', voter: 4}),
  voteRow({
    a: '500',
    b: '710',
    ts: '2026-09-22T10:00:00.123456+00:00',
    score: 3,
    accuracy: -1,
    difficulty: 1,
    whoCarries: 'neither',
    voter: 2,
  }),
  voteRow({a: '500', b: '710', ts: '2026-09-23T10:00:00.123456+00:00', score: 4, whoCarries: 'b', voter: 5}),
  voteRow({a: '500', b: '710', ts: '2026-09-23T11:00:00.123456+00:00', score: null, whoCarries: 'both', voter: 8}),
  voteRow({a: '305', b: '500', ts: '2026-09-24T10:00:00.123456+00:00', score: 6}),
  voteRow({a: '500', b: '880', ts: '2026-09-25T10:00:00.123456+00:00', score: null, whoCarries: 'both', voter: 6}),
  voteRow({a: '500', b: '880', ts: '2026-09-26T10:00:00.123456+00:00', score: null, whoCarries: 'both', voter: 9}),
  voteRow({a: '120', b: '640', ts: '2026-10-06T08:00:00.123456+00:00', score: 7}),
];

/**
 * pairs[] for that log, as the precompute writes it: only the pairs the
 * engine scores that have a score vote, community score the plain mean (no
 * pair reaches 10 score votes, so nothing is trimmed), gap = community −
 * engine. 710, 305 and 880 have no row.
 */
export const VOTED_CARD_PAIRS: readonly PairStat[] = [
  pairStat({a: '120', b: VOTED_CARD, engineScore: 6, communityScore: 6, scoreVotes: 2}),
  pairStat({a: VOTED_CARD, b: '640', engineScore: 8, communityScore: 8.5, scoreVotes: 2, rules: ['ramp', 'shift-targets']}),
  pairStat({a: '120', b: '640', engineScore: 7, communityScore: 6.5, scoreVotes: 2, rules: ['shift-targets']}),
];
```

The numbers the tests rely on, for checking by hand:

| Card 500 | Value |
|---|---|
| Raw votes | 11, from 8 voters, Sep 8 to Sep 26 |
| Scores | 7, 5, 9, 8, 3, 4, 6: 7 scored, mean 6. Plus 4 quick votes |
| `pairs[]` score votes | 4 (120: 2, 640: 2) |
| Engine-silent | 2 pairs, 3 votes: 710 is listed (2 votes; its quick vote doesn't count), 305 is unlisted (1). 4 + 3 = 7 |
| Accuracy | too high 2, right 1, too low 1: sentiment (1 − 2) / 4 = −0.25 |
| Is real / would play | 2 of 3 / 2 of 3 |
| Carry | 2 named this card, of 4 that named one card (sides b, a, a, b), 5 'both' (one scored vote and the 4 quick votes), 1 'neither' |
| Difficulty | easy 2, situational 1, hard 1: mean 1.75 |
| Weeks, over the log's span Aug 31 to Oct 6 | Aug 31: 0, Sep 7: 2 (Tue and late Sun), Sep 14: 3, Sep 21: 6, Sep 28: 0, Oct 5: 0 |

- [ ] **Step 3: Write the failing unit tests**

Create `src/tools/analytics/cards/__tests__/cardVotes.test.ts`:
```ts
import {describe, expect, it} from 'vitest';
import {activityWindow} from '../../activity/activityModel';
import type {VoteLogRow} from '../../voteLogTypes';
import {UNLISTED_IDS, VOTED_CARD, VOTED_CARD_LOG, VOTED_CARD_PAIRS, voteRow} from '../cardFixtures';
import {cardCalibration, pairsForCard} from '../cardStats';
import {
  cardAnswers,
  cardVoteSpan,
  engineSilentForCard,
  scoreHistogram,
  votesForCard,
  votesPerWeek,
  type CardVote,
} from '../cardVotes';

const CARD_VOTES = votesForCard(VOTED_CARD_LOG, VOTED_CARD);
const CARD_PAIRS = pairsForCard(VOTED_CARD_PAIRS, VOTED_CARD);
/** The card list's lookup: every fixture id but UNLISTED_IDS. */
const isListed: (cardId: string) => boolean = (cardId) => !UNLISTED_IDS.has(cardId);

/** Card 500's votes from rows on 500 × 640 (the card on side a), one voter each, with these answers. */
function answered(answers: ReadonlyArray<Partial<VoteLogRow>>): CardVote[] {
  const rows = answers.map((answer, i) =>
    voteRow({a: VOTED_CARD, b: '640', ts: '2026-09-14T10:00:00.123456+00:00', voter: i + 1, ...answer}),
  );
  return votesForCard(rows, VOTED_CARD);
}

describe('votesForCard', () => {
  it("binds each of the card's votes to the card's side and its partner, whichever side the card is on", () => {
    expect(CARD_VOTES.map((cv) => [cv.side, cv.partnerId])).toEqual([
      ['b', '120'],
      ['b', '120'],
      ['a', '640'],
      ['a', '640'],
      ['a', '640'],
      ['a', '710'],
      ['a', '710'],
      ['a', '710'],
      ['b', '305'],
      ['a', '880'],
      ['a', '880'],
    ]);
  });

  it('keeps the log rows themselves, in log order, and leaves out votes on other cards', () => {
    expect(CARD_VOTES.map((cv) => cv.vote)).toEqual(VOTED_CARD_LOG.slice(1, -1));
    expect(CARD_VOTES[0].vote).toBe(VOTED_CARD_LOG[1]);
    expect(votesForCard(VOTED_CARD_LOG, '999')).toEqual([]);
  });
});

describe('scoreHistogram', () => {
  it('counts each score from 1 to 10 and leaves quick votes out of the counts and the mean', () => {
    expect(scoreHistogram(CARD_VOTES)).toEqual({
      counts: [0, 0, 1, 1, 1, 1, 1, 1, 1, 0],
      scored: 7,
      unscored: 4,
      // The plain mean of 7, 5, 9, 8, 3, 4 and 6, engine-silent pairs included.
      mean: 6,
    });
  });

  it('has ten empty buckets and no mean when no vote has a score', () => {
    expect(scoreHistogram(answered([{score: null}, {score: null}]))).toEqual({
      counts: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      scored: 0,
      unscored: 2,
      mean: null,
    });
    expect(scoreHistogram([]).mean).toBeNull();
  });

  it('puts 1 in the first bucket and 10 in the last', () => {
    const {counts} = scoreHistogram(answered([{score: 1}, {score: 10}, {score: 10}]));
    expect(counts).toEqual([1, 0, 0, 0, 0, 0, 0, 0, 0, 2]);
  });
});

describe('engineSilentForCard', () => {
  it('counts scored votes on pairs missing from pairs[], split by whether the partner is listed (R-31)', () => {
    expect(engineSilentForCard(CARD_VOTES, CARD_PAIRS, isListed)).toEqual({
      pairs: 2,
      votes: 3,
      partnerUnlisted: {pairs: 1, votes: 1},
      // 710's quick vote has no score, so it isn't one of these.
      partnerListed: {pairs: 1, votes: 2},
    });
  });

  it('leaves out a pair with only quick votes, and a pair the engine scores', () => {
    const quickOnly = CARD_VOTES.filter((cv) => cv.partnerId === '880');
    expect(engineSilentForCard(quickOnly, CARD_PAIRS, isListed).votes).toBe(0);
    const scoredByEngine = CARD_VOTES.filter((cv) => cv.partnerId === '120' || cv.partnerId === '640');
    expect(engineSilentForCard(scoredByEngine, CARD_PAIRS, isListed).pairs).toBe(0);
  });

  it("holds the histogram check: the card's scored votes are its pairs[] votes plus its engine-silent ones", () => {
    const silent = engineSilentForCard(CARD_VOTES, CARD_PAIRS, isListed);
    expect(scoreHistogram(CARD_VOTES).scored).toBe(cardCalibration(CARD_PAIRS).scoreVotes + silent.votes);
  });
});

describe('cardAnswers', () => {
  it('reads every question from the votes that answered it', () => {
    expect(cardAnswers(CARD_VOTES)).toEqual({
      accuracy: {tooHigh: 2, right: 1, tooLow: 1, answered: 4, sentiment: -0.25},
      isReal: {yes: 2, answered: 3, share: 2 / 3},
      wouldPlay: {yes: 2, answered: 3, share: 2 / 3},
      carry: {named: 2, singled: 4, share: 0.5, both: 5, neither: 1},
      difficulty: {easy: 2, situational: 1, hard: 1, answered: 4, mean: 1.75},
    });
  });

  it.each<[VoteLogRow['accuracy'], 'tooHigh' | 'right' | 'tooLow']>([
    [-1, 'tooHigh'],
    [0, 'right'],
    [1, 'tooLow'],
  ])('counts an accuracy answer of %s as %s, and ignores no answer', (accuracy, key) => {
    const {accuracy: answers} = cardAnswers(answered([{accuracy}, {accuracy: null}]));
    expect(answers[key]).toBe(1);
    expect(answers.tooHigh + answers.right + answers.tooLow).toBe(1);
    expect(answers.answered).toBe(1);
  });

  it.each<[Array<VoteLogRow['accuracy']>, number | null]>([
    [[1, 1, -1], 1 / 3],
    [[-1, null], -1],
    [[0, 0], 0],
    [[null], null],
  ])('reads accuracy answers %j as a sentiment of %s: the mean answer (R-32)', (accuracies, sentiment) => {
    expect(cardAnswers(answered(accuracies.map((accuracy) => ({accuracy})))).accuracy.sentiment).toBe(sentiment);
  });

  it.each<['a' | 'b', VoteLogRow['whoCarries'], {named: number; singled: number; both: number; neither: number}]>([
    ['a', 'a', {named: 1, singled: 1, both: 0, neither: 0}],
    ['a', 'b', {named: 0, singled: 1, both: 0, neither: 0}],
    ['b', 'b', {named: 1, singled: 1, both: 0, neither: 0}],
    ['b', 'a', {named: 0, singled: 1, both: 0, neither: 0}],
    ['a', 'both', {named: 0, singled: 0, both: 1, neither: 0}],
    ['b', 'neither', {named: 0, singled: 0, both: 0, neither: 1}],
    ['a', null, {named: 0, singled: 0, both: 0, neither: 0}],
  ])("with the card on side %s, reads whoCarries %s by the row's own sides", (side, whoCarries, counts) => {
    const pair = side === 'a' ? {a: VOTED_CARD, b: '640'} : {a: '120', b: VOTED_CARD};
    const row = voteRow({...pair, ts: '2026-09-14T10:00:00.123456+00:00', whoCarries});
    const {carry} = cardAnswers(votesForCard([row], VOTED_CARD));
    // One vote, so a share is 1 or 0, and none when it named no single card.
    expect(carry).toEqual({...counts, share: counts.singled > 0 ? counts.named : null});
  });

  it('gives each rate its own denominator, and no share where nobody answered', () => {
    const answers = cardAnswers(answered([{isReal: true}, {isReal: false, wouldPlay: true}, {isReal: true}]));
    expect(answers.isReal).toEqual({yes: 2, answered: 3, share: 2 / 3});
    expect(answers.wouldPlay).toEqual({yes: 1, answered: 1, share: 1});
    expect(cardAnswers(answered([{score: 7}])).isReal).toEqual({yes: 0, answered: 0, share: null});
  });

  it.each<[VoteLogRow['difficulty'], 'easy' | 'situational' | 'hard']>([
    [1, 'easy'],
    [2, 'situational'],
    [3, 'hard'],
  ])('counts a difficulty of %s as %s', (difficulty, key) => {
    const answers = cardAnswers(answered([{difficulty}, {difficulty: null}])).difficulty;
    expect(answers[key]).toBe(1);
    expect(answers.answered).toBe(1);
    expect(answers.mean).toBe(difficulty);
  });

  it('averages the difficulty levels, and has no mean when nobody answered', () => {
    const levels: Array<VoteLogRow['difficulty']> = [1, 2, 3, 3];
    expect(cardAnswers(answered(levels.map((difficulty) => ({difficulty})))).difficulty.mean).toBe(2.25);
    expect(cardAnswers(answered([{difficulty: null}])).difficulty.mean).toBeNull();
  });
});

describe('votesPerWeek', () => {
  // activityWindow(voteLog.votes, 'all'), as R3-6b passes it: the whole log, not the card's votes.
  const LOG_SPAN = {startDay: '2026-08-31', endDay: '2026-10-06'};

  it("covers the whole log's weeks from Monday, quiet ones as 0, and counts quick votes (R-36)", () => {
    expect(activityWindow(VOTED_CARD_LOG, 'all')).toEqual(LOG_SPAN);
    expect(votesPerWeek(CARD_VOTES, LOG_SPAN).map((w) => [w.week, w.votes])).toEqual([
      // The log's first week: its only vote isn't on the card.
      ['2026-08-31', 0],
      // Tuesday Sep 8, and Sunday Sep 13 late in the evening (UTC).
      ['2026-09-07', 2],
      ['2026-09-14', 3],
      ['2026-09-21', 6],
      ['2026-09-28', 0],
      // The log's part week, Oct 5 to 6: the card has no vote in it.
      ['2026-10-05', 0],
    ]);
  });

  it("adds up to the card's votes and doesn't depend on the log's order", () => {
    const weeks = votesPerWeek(CARD_VOTES, LOG_SPAN);
    expect(weeks.reduce((n, w) => n + w.votes, 0)).toBe(CARD_VOTES.length);
    const newestFirst = votesForCard([...VOTED_CARD_LOG].reverse(), VOTED_CARD);
    expect(votesPerWeek(newestFirst, LOG_SPAN)).toEqual(weeks);
  });

  it('leaves out votes outside the span it is given', () => {
    const threeDays = {startDay: '2026-09-21', endDay: '2026-09-23'};
    expect(votesPerWeek(CARD_VOTES, threeDays)).toEqual([{week: '2026-09-21', votes: 3}]);
  });
});

describe('cardVoteSpan', () => {
  it("gives the card's raw votes, distinct voters, and first and last vote days", () => {
    expect(cardVoteSpan(CARD_VOTES)).toEqual({
      votes: 11,
      voters: 8,
      days: {startDay: '2026-09-08', endDay: '2026-09-26'},
    });
  });

  it('is null for a card nobody has voted on', () => {
    expect(cardVoteSpan([])).toBeNull();
  });
});
```

- [ ] **Step 4: Write the parity test**

Create `scripts/lib/__tests__/cardVotesParity.test.mjs`. It runs in node, as `weeklyGapsParity.test.mjs` does, and imports the `.ts` modules by path:
```js
// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {activityWindow} from '../../../src/tools/analytics/activity/activityModel.ts';
import {cardCalibration, pairsForCard} from '../../../src/tools/analytics/cards/cardStats.ts';
import {
  engineSilentForCard,
  scoreHistogram,
  votesForCard,
  votesPerWeek,
} from '../../../src/tools/analytics/cards/cardVotes.ts';
import {buildAnalytics, buildVoteLog} from '../voteAnalytics.mjs';

/*
 * The card page's raw-vote model against the precompute, on the same raw
 * votes, through the transforms the Deploy runs (buildAnalytics,
 * buildVoteLog), as weeklyGapsParity.test.mjs does for /calibration. It holds
 * the card page's two files together: a card's scored votes in the log are its
 * pairs[] score votes plus its engine-silent votes, and its weeks are
 * global.weekly's weeks.
 *
 * On real data the first check can be off by a vote: the precompute reads
 * pair_scores before the votes, so a vote cast in between is in one file and
 * not the other. The page never relies on it; only this test does.
 */

// The engine's pairs as loadEngineArtifacts keys them (pairKey: ids sorted, ':').
const ENGINE_PAIRS = new Map([
  ['1:2', {engineScore: 7, connections: [{ruleId: 'ramp'}]}],
  ['1:3', {engineScore: 6, connections: [{ruleId: 'ramp'}]}],
  ['3:4', {engineScore: 5, connections: [{ruleId: 'shift-targets'}]}],
]);
const ALL_RULES = [
  {ruleId: 'ramp', ruleName: 'Ramp', category: 'playstyle'},
  {ruleId: 'shift-targets', ruleName: 'Shift Targets', category: 'direct'},
];
// Card 9 has rotated out of Core: the card list doesn't have it, and the
// precompute has no name for it (its rows carry the bare id).
const NAMES = new Map(['1', '2', '3', '4', '5'].map((id) => [id, `Card ${id}`]));
const isListed = (id) => NAMES.has(id);
/** Every card in the log, card 9 included. */
const CARD_IDS = ['1', '2', '3', '4', '5', '9'];

/** A raw vote as fetchAllRows reads it: Supabase's microsecond +00:00 timestamp, card ids in either order. */
function raw(createdAt, a, b, score) {
  return {
    created_at: createdAt,
    ip_hash: `voter-${a}-${b}`,
    card_a_id: a,
    card_b_id: b,
    score,
    accuracy: null,
    is_real: null,
    would_play: null,
    difficulty: null,
    who_carries: null,
  };
}

// Card 1 has a pair the engine scores with 2 and with 3, a quick vote on
// 1 × 2, only a quick vote with 4, and engine-silent pairs with 5 (in the
// card list) and 9 (rotated out). 3 × 4 is a pair without card 1. The week of
// Oct 5 has no vote at all.
const RAW_VOTES = [
  raw('2026-09-14T10:00:00.123456+00:00', '2', '1', 4),
  raw('2026-09-15T10:00:00.123456+00:00', '1', '2', 10),
  raw('2026-09-20T23:59:59.999999+00:00', '3', '1', 6),
  raw('2026-09-22T10:00:00.123456+00:00', '1', '2', null),
  raw('2026-09-22T11:00:00.123456+00:00', '4', '1', null),
  raw('2026-09-28T10:00:00.123456+00:00', '1', '5', 6),
  raw('2026-09-29T10:00:00.123456+00:00', '5', '1', 3),
  raw('2026-09-30T10:00:00.123456+00:00', '9', '1', 8),
  raw('2026-10-12T10:00:00.123456+00:00', '3', '4', 5),
];
// pair_scores for those votes, ids in the view's own order: the scored votes'
// mean and count, and every vote. No pair reaches 10 score votes, so nothing
// is trimmed. 1 × 4 has no score vote, so it has no avg_score.
const SCORE_ROWS = [
  {card_a_id: '1', card_b_id: '2', avg_score: 7, score_votes: 2, total_votes: 3, accuracy_sentiment: null},
  {card_a_id: '1', card_b_id: '3', avg_score: 6, score_votes: 1, total_votes: 1, accuracy_sentiment: null},
  {card_a_id: '1', card_b_id: '4', avg_score: null, score_votes: 0, total_votes: 1, accuracy_sentiment: null},
  {card_a_id: '1', card_b_id: '5', avg_score: 4.5, score_votes: 2, total_votes: 2, accuracy_sentiment: null},
  {card_a_id: '1', card_b_id: '9', avg_score: 8, score_votes: 1, total_votes: 1, accuracy_sentiment: null},
  {card_a_id: '3', card_b_id: '4', avg_score: 5, score_votes: 1, total_votes: 1, accuracy_sentiment: null},
];

const analytics = buildAnalytics({
  scoreRows: SCORE_ROWS,
  enginePairs: ENGINE_PAIRS,
  allRules: ALL_RULES,
  names: NAMES,
  ruleTotalPairs: {ramp: 2, 'shift-targets': 1},
  rawVotes: RAW_VOTES,
});
const log = buildVoteLog(RAW_VOTES, NAMES);

/** One card's raw-vote model, as the card page builds it. */
function cardModel(cardId) {
  const cardVotes = votesForCard(log.votes, cardId);
  const cardPairs = pairsForCard(analytics.pairs, cardId);
  return {cardVotes, cardPairs, silent: engineSilentForCard(cardVotes, cardPairs, isListed)};
}

describe('the card vote model against the precompute', () => {
  it("adds every card's pairs[] score votes and engine-silent votes up to its scored votes in the log", () => {
    for (const id of CARD_IDS) {
      const {cardVotes, cardPairs, silent} = cardModel(id);
      expect(scoreHistogram(cardVotes).scored, id).toBe(cardCalibration(cardPairs).scoreVotes + silent.votes);
      expect(silent.partnerUnlisted.votes + silent.partnerListed.votes, id).toBe(silent.votes);
    }
    expect(cardModel('1').silent).toEqual({
      pairs: 2,
      votes: 3,
      partnerUnlisted: {pairs: 1, votes: 1},
      partnerListed: {pairs: 1, votes: 2},
    });
  });

  it('counts each engine-silent pair once from each of its cards: twice global.engineSilentPairs', () => {
    const pairs = CARD_IDS.reduce((n, id) => n + cardModel(id).silent.pairs, 0);
    expect(analytics.global.engineSilentPairs).toBe(2);
    expect(pairs).toBe(2 * analytics.global.engineSilentPairs);
  });

  it("buckets votes into global.weekly's Monday weeks, and fills the weeks it skips", () => {
    const logSpan = activityWindow(log.votes, 'all');
    const perWeek = new Map();
    for (const id of CARD_IDS) {
      for (const {week, votes} of votesPerWeek(cardModel(id).cardVotes, logSpan)) {
        perWeek.set(week, (perWeek.get(week) ?? 0) + votes);
      }
    }
    // global.weekly lists only the weeks that have a vote: Oct 5 has none.
    expect(analytics.global.weekly.map((w) => [w.week, w.votes])).toEqual([
      ['2026-09-14', 3],
      ['2026-09-21', 2],
      ['2026-09-28', 3],
      ['2026-10-12', 1],
    ]);
    // Every vote has two cards, so the cards' weeks add up to twice the log's,
    // and the weeks global.weekly skips are there, with no votes.
    for (const point of analytics.global.weekly) expect(perWeek.get(point.week), point.week).toBe(2 * point.votes);
    expect([...perWeek.keys()]).toEqual(['2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12']);
    expect(perWeek.get('2026-10-05')).toBe(0);
  });
});
```

- [ ] **Step 5: Run the tests and see them fail**

Run: `pnpm vitest run src/tools/analytics/cards/__tests__/cardVotes.test.ts scripts/lib/__tests__/cardVotesParity.test.mjs`

Expected: FAIL, with `Test Files  2 failed (2)` and `Tests  no tests`. Both files fail on the missing module, each in its environment's words:
- `Failed to resolve import "../cardVotes" from "src/tools/analytics/cards/__tests__/cardVotes.test.ts". Does the file exist?`
- `Cannot find module '../../../src/tools/analytics/cards/cardVotes.ts' imported from <repo>/scripts/lib/__tests__/cardVotesParity.test.mjs` (the node environment's message).

- [ ] **Step 6: Write `cardVotes.ts`**

Create `src/tools/analytics/cards/cardVotes.ts`:
```ts
import type {Day} from '../../../charts/scale';
import {activityWindow, weeklyStacks, type VoteSpan} from '../activity/activityModel';
import type {VoteLogRow} from '../voteLogTypes';
import type {CardPair} from './cardStats';

/*
 * The card page's raw-vote side (R3-3): what /cards reads from vote-log.json
 * for one card. votesForCard binds the card once, and every other function
 * takes the CardVote[] it returns, so none of them is passed the card again.
 * Pure functions, and none of them reorders its input.
 *
 * Every number here comes from raw votes, with plain means: quick votes (no
 * score) stay out of the histogram and its mean, and count everywhere else.
 * The calibration side (cardStats.ts, R3-2) comes from pairs[] instead.
 */

/** A raw vote on the card: the log's row, the side of it the card is on, and the card on the other side. */
export interface CardVote {
  vote: VoteLogRow;
  /** buildVoteLog puts the lower id in `a`, so the side says nothing about the vote itself. */
  side: 'a' | 'b';
  partnerId: string;
}

/** The votes on `cardId`, from either side of the row, in log order. */
export function votesForCard(votes: readonly VoteLogRow[], cardId: string): CardVote[] {
  return votes.flatMap((vote): CardVote[] => {
    if (vote.a === cardId) return [{vote, side: 'a', partnerId: vote.b}];
    return vote.b === cardId ? [{vote, side: 'b', partnerId: vote.a}] : [];
  });
}

/** part / whole; null when whole is 0. */
function ratio({part, whole}: {part: number; whole: number}): number | null {
  return whole > 0 ? part / whole : null;
}

/** How many of the card's votes pass `test`. */
function count(cardVotes: readonly CardVote[], test: (cardVote: CardVote) => boolean): number {
  return cardVotes.filter(test).length;
}

/** How many of the card's votes give each of `answers`, in the same order. */
function tally<T>(
  cardVotes: readonly CardVote[],
  read: (vote: VoteLogRow) => T | null,
  answers: readonly T[],
): number[] {
  return answers.map((answer) => count(cardVotes, (cardVote) => read(cardVote.vote) === answer));
}

/** Engine-silent pairs, and the scored votes on them. */
export interface SilentCount {
  pairs: number;
  votes: number;
}

/**
 * The card's engine-silent pairs (R-31): partners it has a scored vote with
 * and no pairs[] row, which holds only the pairs the engine scores. `votes`
 * counts their scored votes only, so the histogram's scored votes are
 * cardCalibration's scoreVotes plus these, exactly. The two parts split the
 * pairs by whether the partner is in the current card list; /cards shows only
 * a card the list resolves, so a listed partner means both cards are in Core.
 */
export interface EngineSilent extends SilentCount {
  /** The partner isn't in the card list: rotated out of Core, or a preview id its release replaced (R-29). */
  partnerUnlisted: SilentCount;
  /** The partner is in the card list too, and the engine still scores the pair nothing. */
  partnerListed: SilentCount;
}

function silentCount(silent: readonly CardVote[]): SilentCount {
  return {pairs: new Set(silent.map((cardVote) => cardVote.partnerId)).size, votes: silent.length};
}

/**
 * The scored votes on pairs missing from `cardPairs` (pairsForCard over
 * pairs[], R3-2), split by `isListed`, the card list's lookup:
 * `(id) => getCardById(id) !== undefined`. A pair with only quick votes isn't
 * in pairs[] either, and doesn't count: it has no score to compare.
 */
export function engineSilentForCard(
  cardVotes: readonly CardVote[],
  cardPairs: readonly CardPair[],
  isListed: (cardId: string) => boolean,
): EngineSilent {
  const scoredByEngine = new Set(cardPairs.map((pair) => pair.partnerId));
  const silent = cardVotes.filter((cardVote) => cardVote.vote.score != null && !scoredByEngine.has(cardVote.partnerId));
  return {
    ...silentCount(silent),
    partnerUnlisted: silentCount(silent.filter((cardVote) => !isListed(cardVote.partnerId))),
    partnerListed: silentCount(silent.filter((cardVote) => isListed(cardVote.partnerId))),
  };
}

const SCORES = 10;

export interface ScoreHistogram {
  /** counts[i]: the votes that scored i + 1. Always ten entries, for scores 1 to 10. */
  counts: number[];
  scored: number;
  /** Quick votes: no score, so out of `counts` and the mean. */
  unscored: number;
  /** The plain mean of the scored votes; null with none. */
  mean: number | null;
}

/**
 * The card's scores, 1 to 10, from every raw vote on it: the pairs the engine
 * scores and the engine-silent ones alike. Scores are whole numbers from 1 to
 * 10, as the votes table's check holds them.
 */
export function scoreHistogram(cardVotes: readonly CardVote[]): ScoreHistogram {
  const counts = Array.from({length: SCORES}, () => 0);
  let sum = 0;
  for (const {vote} of cardVotes) {
    if (vote.score == null) continue;
    counts[vote.score - 1] += 1;
    sum += vote.score;
  }
  const scored = counts.reduce((total, n) => total + n, 0);
  return {counts, scored, unscored: cardVotes.length - scored, mean: ratio({part: sum, whole: scored})};
}

/**
 * A yes/no question's answers. `share` is yes / answered, from 0 to 1 (R3-6b
 * prints it with sharePercent); null when no vote answered.
 */
export interface Rate {
  yes: number;
  answered: number;
  share: number | null;
}

/** "Is the engine's score right?": −1 "Should be lower", 0 "Score is fair", +1 "Should be higher". */
export interface AccuracyAnswers {
  tooHigh: number;
  right: number;
  tooLow: number;
  answered: number;
  /**
   * The share of "too low" minus the share of "too high", from −1 to +1, null
   * when none answered (R-32). It is the mean answer, the definition the
   * view's per-pair accuracy_sentiment uses, taken over the card's raw votes.
   */
  sentiment: number | null;
}

/** "Who carries the pair?": 'a' and 'b' name the card on that side of the row. */
export interface CarryShare {
  /** The votes that named this card. */
  named: number;
  /** The votes that named one card, either one: the share's denominator. */
  singled: number;
  /** named / singled, from 0 to 1; null when no vote named one card. */
  share: number | null;
  /** 'both' (the form's default) and 'neither' stay out of the share. */
  both: number;
  neither: number;
}

/** "How hard is it to pull off?": 1 Easy, 2 Situational, 3 Hard. */
export interface DifficultyAnswers {
  easy: number;
  situational: number;
  hard: number;
  answered: number;
  /** The mean level, from 1 to 3; null when none answered. */
  mean: number | null;
}

export interface CardAnswers {
  accuracy: AccuracyAnswers;
  isReal: Rate;
  wouldPlay: Rate;
  carry: CarryShare;
  difficulty: DifficultyAnswers;
}

function accuracyAnswers(cardVotes: readonly CardVote[]): AccuracyAnswers {
  const [tooHigh, right, tooLow] = tally(cardVotes, (vote) => vote.accuracy, [-1, 0, 1]);
  const answered = tooHigh + right + tooLow;
  return {tooHigh, right, tooLow, answered, sentiment: ratio({part: tooLow - tooHigh, whole: answered})};
}

function rateOf(cardVotes: readonly CardVote[], answer: (vote: VoteLogRow) => boolean | null): Rate {
  const yes = count(cardVotes, (cardVote) => answer(cardVote.vote) === true);
  const answered = count(cardVotes, (cardVote) => answer(cardVote.vote) != null);
  return {yes, answered, share: ratio({part: yes, whole: answered})};
}

function carryShare(cardVotes: readonly CardVote[]): CarryShare {
  const named = count(cardVotes, (cardVote) => cardVote.vote.whoCarries === cardVote.side);
  const [a, b, both, neither] = tally(cardVotes, (vote) => vote.whoCarries, ['a', 'b', 'both', 'neither']);
  return {named, singled: a + b, share: ratio({part: named, whole: a + b}), both, neither};
}

function difficultyAnswers(cardVotes: readonly CardVote[]): DifficultyAnswers {
  const [easy, situational, hard] = tally(cardVotes, (vote) => vote.difficulty, [1, 2, 3]);
  const answered = easy + situational + hard;
  const levels = easy + 2 * situational + 3 * hard;
  return {easy, situational, hard, answered, mean: ratio({part: levels, whole: answered})};
}

/** How voters answered the in-depth questions on the card's pairs. Each counts only the votes that answered it. */
export function cardAnswers(cardVotes: readonly CardVote[]): CardAnswers {
  return {
    accuracy: accuracyAnswers(cardVotes),
    isReal: rateOf(cardVotes, (vote) => vote.isReal),
    wouldPlay: rateOf(cardVotes, (vote) => vote.wouldPlay),
    carry: carryShare(cardVotes),
    difficulty: difficultyAnswers(cardVotes),
  };
}

/** One week of the card's votes: its UTC Monday, and every vote that week, quick votes included. */
export interface WeekCount {
  week: Day;
  votes: number;
}

/**
 * The card's votes per Monday week (UTC) across `logSpan`, oldest first, a
 * quiet week as 0 (R-36). Pass the whole log's span,
 * `activityWindow(voteLog.votes, 'all')`, not the card's: every card then
 * shares the log's weeks, as /calibration's weekly gap does, and a card nobody
 * has voted on lately ends in quiet weeks. The span's first and last weeks can
 * be part weeks; R3-6b names them with bucketTitle and partialWeeks.
 */
export function votesPerWeek(cardVotes: readonly CardVote[], logSpan: VoteSpan): WeekCount[] {
  const rows = cardVotes.map((cardVote) => cardVote.vote);
  return weeklyStacks(rows, logSpan.startDay, logSpan.endDay).map((stack) => ({week: stack.day, votes: stack.total}));
}

/** The card's raw votes, its distinct voters, and the days of its first and last vote. */
export interface CardVoteSpan {
  votes: number;
  voters: number;
  /** UTC 'YYYY-MM-DD' days, ready for fmtDay. */
  days: VoteSpan;
}

/** Null when nobody has voted on the card. */
export function cardVoteSpan(cardVotes: readonly CardVote[]): CardVoteSpan | null {
  const rows = cardVotes.map((cardVote) => cardVote.vote);
  const days = activityWindow(rows, 'all');
  if (days == null) return null;
  return {votes: rows.length, voters: new Set(rows.map((vote) => vote.voter)).size, days};
}
```

- [ ] **Step 7: Run the tests and see them pass**

Run: `pnpm vitest run src/tools/analytics/cards/__tests__/cardVotes.test.ts scripts/lib/__tests__/cardVotesParity.test.mjs scripts/lib/__tests__/weeklyGapsParity.test.mjs`

Expected: PASS, with `Test Files  3 passed (3)` and `Tests  38 passed (38)`: 33 in `cardVotes.test.ts`, 3 in the new parity test, and R2's 2.

- [ ] **Step 8: Lint, typecheck, the full suite and Code Health**

```bash
pnpm lint
pnpm typecheck
pnpm test:run
```

Expected: all three exit 0. Nothing imports `cardVotes.ts` yet: R3-6a and R3-6b are its first consumers.

If a busy machine times out an unrelated jsdom test (5 s), rerun that file alone before you suspect this task. See the memory note on Vitest worker timeouts under load.

Then run `mcp__codescene__code_health_review` on the four files: `src/tools/analytics/cards/cardVotes.ts`, `src/tools/analytics/cards/cardFixtures.ts`, `src/tools/analytics/cards/__tests__/cardVotes.test.ts` and `scripts/lib/__tests__/cardVotesParity.test.mjs`.

Expected: 10.0 each, with no findings. CodeScene gates the PR, so fix a finding now: split the function it names, as `cardAnswers` is split.

The local tool flags primitive arguments later than the PR gate does (R3-1a's probe: a module of one-number functions scored 10.0 at 13 parameters), so count by hand too. `cardVotes.ts` has 1 primitive parameter (`votesForCard`'s `cardId`) in 22 (4.5%, against the gate's 30%). The fixtures' additions bring none, because `voteRow` takes one object.

- [ ] **Step 9: Commit, after the owner approves**

Use the Bash tool. Stage with explicit paths, never `git add -A`, as its own call:
```bash
git add src/tools/analytics/cards/cardVotes.ts src/tools/analytics/cards/cardFixtures.ts src/tools/analytics/cards/__tests__/cardVotes.test.ts scripts/lib/__tests__/cardVotesParity.test.mjs
```
Then commit as a separate, unpiped call:
```bash
USER_APPROVED=1 git commit -m "feat(cards): add the card page's raw-vote model, held to the precompute by a parity test (#24)"
```

<!--
Review notes, 2026-10-06: all seven applied. Where the result differs from the note:
- Note 1. Since the review, R3-card-analytics.md (20:02 draft) has made the note's edits at :213-222 (was :199-204), :233-234 (was :215) and :351 (was :306). Only the helper list, now at :238, is still stale. So the assembler block keeps just that edit, plus a grep that checks it.
- Note 2. The note says "the local tool doesn't report Primitive Obsession". R3-1a's probe shows the tool does report it, only later than the PR gate does (9.68 at 14 parameters), so Step 8 says that instead. The count is 22 parameters, not "about 21": the TypeScript AST gives 1 primitive in 22, as the Re-base notes already said.
- Note 4. The parity test's two quick votes answer nothing either, but they were left as they are. That fixture breaks the table's rules on purpose (card ids in either order, so buildVoteLog's re-sort is exercised), and it doesn't claim to follow them.
- Note 6. The same 11-line shift applies to weekTitle in chartData.ts, which R3-1a moves from :328-330 to :306-308. It is cited both ways too.
- Note 7. The other mentions of "R3-6" (the Re-base notes, the Files list, and three code comments) now name R3-6a or R3-6b as well.
-->
