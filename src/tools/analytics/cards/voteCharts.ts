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
