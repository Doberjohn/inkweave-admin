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
