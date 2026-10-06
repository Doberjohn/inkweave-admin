import {afterAll, beforeAll, describe, expect, it, vi} from 'vitest';
import {ADMIN_COLORS} from '../../../../theme/adminTheme';
import type {PairStat} from '../../voteAnalyticsTypes';
import type {VoteLogRow} from '../../voteLogTypes';
import {
  GAP_BIN_LIMIT,
  GAP_SERIES,
  SCATTER_JITTER,
  SCORE_DOMAIN,
  SCORE_TICKS,
  binLabel,
  binRange,
  gapBinCenter,
  gapBins,
  gapDomain,
  gapShares,
  gapSide,
  histogramTable,
  pairWords,
  scatterPoints,
  scatterTable,
  scoreText,
  sharePercent,
  sharedScores,
  sideColor,
  weeklyGaps,
  weeklyTable,
  type WeeklyGap,
} from '../chartData';
import {pairId} from '../calibrationModel';
import {ALL_PAIRS, ONE_RULE, ONE_RULE_VOTES, SIX_PAIRS, pairOf, seededPairs} from '../chartFixtures';

/** A vote-log row on (a, b) at `ts`. weeklyGaps reads only a, b, score and ts. */
function vote(a: string, b: string, ts: string, score: number | null): VoteLogRow {
  return {
    a,
    b,
    aName: `Card ${a}`,
    bName: `Card ${b}`,
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

/** A pair with exactly this gap, no float detour through community − engine. */
function withGap(gap: number): PairStat {
  return {...pairOf('1', '2', 5, 5), gap};
}

/** Noon UTC on `day`, in Supabase's microsecond +00:00 form. */
const at = (day: string) => `${day}T12:00:00.000000+00:00`;

// Week starts are UTC days whatever the viewer's zone. A zone west of UTC puts
// Monday 00:00 UTC on the previous local Sunday, so a weekly bucket built from
// local-time dates fails here; CI runs in UTC, where it would pass unnoticed.
// The zone is this file's alone: afterAll puts the previous one back.
const ORIGINAL_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
beforeAll(() => {
  vi.stubEnv('TZ', 'America/Los_Angeles');
});
afterAll(() => {
  // Name the original zone before unstubbing: when TZ was unset, unstubAllEnvs
  // deletes it, and Node on Windows keeps the last zone when TZ is deleted.
  vi.stubEnv('TZ', ORIGINAL_ZONE);
  vi.unstubAllEnvs();
});

describe('GAP_SERIES, sideColor and gapSide', () => {
  it('splits by side in axis order, in the score-band colours, with true minus signs', () => {
    expect(GAP_SERIES).toEqual([
      {id: 'over', label: 'Engine higher (gap ≤ −0.5)', color: ADMIN_COLORS.over},
      {id: 'agree', label: 'Within ±0.5', color: ADMIN_COLORS.barNeutral},
      {id: 'under', label: 'Community higher (gap ≥ +0.5)', color: ADMIN_COLORS.under},
    ]);
    expect(sideColor('agree')).toBe(ADMIN_COLORS.barNeutral);
    expect(sideColor('over')).toBe(ADMIN_COLORS.over);
  });

  it('agrees inside the calibration band, and leans from ±0.5', () => {
    expect([-0.49, 0, 0.49].map(gapSide)).toEqual(['agree', 'agree', 'agree']);
    expect(gapSide(-0.5)).toBe('over');
    expect(gapSide(0.5)).toBe('under');
  });
});

describe('gapBinCenter', () => {
  it('rounds halves away from zero, and keeps just-short-of-half in', () => {
    expect([0.5, -0.5, 2.5, -2.49].map(gapBinCenter)).toEqual([1, -1, 3, -2]);
  });

  it('folds everything beyond ±GAP_BIN_LIMIT into the end bins', () => {
    expect(GAP_BIN_LIMIT).toBe(5);
    expect(gapBinCenter(-8)).toBe(-5);
    expect(gapBinCenter(7.2)).toBe(5);
  });

  it('never returns −0', () => {
    expect(Object.is(gapBinCenter(-0.2), 0)).toBe(true);
  });

  it('makes the centre bin exactly the agreement band, and gives every bin its gap’s side', () => {
    for (let i = -600; i <= 600; i++) {
      const gap = i / 100;
      expect(gapBinCenter(gap) === 0, `gap ${gap}`).toBe(gapSide(gap) === 'agree');
      const [bin] = gapBins([withGap(gap)]).filter((b) => b.pairs === 1);
      expect(bin.side, `gap ${gap}`).toBe(gapSide(gap));
    }
  });
});

describe('gapBins', () => {
  it('always gives the eleven bins from −5 to +5, empty ones included', () => {
    const bins = gapBins([]);
    expect(bins.map((b) => b.center)).toEqual([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]);
    expect(bins.every((b) => b.pairs === 0 && b.votes === 0)).toBe(true);
    expect(bins.map((b) => b.side)).toEqual([...Array(5).fill('over'), 'agree', ...Array(5).fill('under')]);
  });

  it('counts pairs and sums their votes per bin, in any order', () => {
    // SIX_PAIRS' gaps: −3, 0, 0 (2 votes), +6, −0.5 (2 votes) and −8.
    const filled = (pairs: readonly PairStat[]) =>
      gapBins(pairs)
        .filter((b) => b.pairs > 0)
        .map((b) => [b.center, b.pairs, b.votes]);
    expect(filled(SIX_PAIRS)).toEqual([
      [-5, 1, 1],
      [-3, 1, 1],
      [-1, 1, 2],
      [0, 2, 3],
      [5, 1, 1],
    ]);
    expect(filled([...SIX_PAIRS].reverse())).toEqual(filled(SIX_PAIRS));
  });
});

describe('binLabel and binRange', () => {
  it('label the end bins as open and the rest by their centre', () => {
    expect([-5, -3, 0, 3, 5].map(binLabel)).toEqual(['≤−5', '−3', '0', '+3', '≥+5']);
  });

  it('say which gaps each bin holds', () => {
    expect([-5, -3, 0, 3, 5].map(binRange)).toEqual([
      '−4.5 or lower',
      '−3.5 to −2.5',
      'within ±0.5',
      '+2.5 to +3.5',
      '+4.5 or higher',
    ]);
  });

  it('print every minus as U+2212', () => {
    const text = gapBins([])
      .flatMap((b) => [binLabel(b.center), binRange(b.center)])
      .join(' ');
    expect(text).toContain('−');
    expect(text).not.toContain('-');
  });
});

describe('gapShares and sharePercent', () => {
  it('give each side’s share of the pairs', () => {
    const shares = gapShares(gapBins(SIX_PAIRS));
    expect(shares.over).toBeCloseTo(1 / 2);
    expect(shares.agree).toBeCloseTo(1 / 3);
    expect(shares.under).toBeCloseTo(1 / 6);
    expect([shares.agree, shares.over, shares.under].map(sharePercent)).toEqual(['33%', '50%', '17%']);
  });

  it('give 0 for every side with no pairs, and never print 0% for a side with some', () => {
    expect(gapShares(gapBins([]))).toEqual({over: 0, agree: 0, under: 0});
    expect(sharePercent(0)).toBe('0%');
    expect(sharePercent(1 / 400)).toBe('<1%');
  });

  it('switches from <1% to 1% at the rounding boundary', () => {
    expect(sharePercent(0.0049)).toBe('<1%');
    expect(sharePercent(0.005)).toBe('1%');
  });
});

describe('scatterPoints, pairWords, sharedScores and scoreText', () => {
  it('gives one point per pair: engine across, community up, coloured by side, narrowest gap first', () => {
    const points = scatterPoints(SIX_PAIRS);
    // pairId sorts as strings, so the 9 × 10 pair keys as '10|9'.
    expect(points.map((p) => p.key)).toEqual(['3|4', '5|6', '10|9', '1|2', '7|8', '11|12']);
    expect(points.find((p) => p.key === '1|2')).toMatchObject({x: 7, y: 4, series: 'over'});
    expect(points.find((p) => p.key === '7|8')).toMatchObject({x: 3, y: 9, series: 'under'});
    expect(points.find((p) => p.key === '3|4')).toMatchObject({x: 7, y: 7, series: 'agree'});
  });

  it('labels each point as the slider reads it, averages to two places', () => {
    const label = (key: string) => scatterPoints(SIX_PAIRS).find((p) => p.key === key)?.label;
    expect(label('1|2')).toBe('Card 1 × Card 2: engine 7, community 4, gap −3.00, 1 vote');
    expect(label('10|9')).toBe('Card 9 × Card 10: engine 8, community 7.50, gap −0.50, 2 votes');
  });

  it('names a pair in words, which the slider and the pair list both read', () => {
    const [first, , , , averaged] = SIX_PAIRS;
    expect(pairWords(first)).toBe('Card 1 × Card 2: engine 7, community 4, gap −3.00, 1 vote');
    expect(pairWords(averaged)).toBe('Card 9 × Card 10: engine 8, community 7.50, gap −0.50, 2 votes');
    for (const point of scatterPoints(SIX_PAIRS)) {
      const pair = SIX_PAIRS.find((p) => pairId(p.a, p.b) === point.key);
      expect(point.label.startsWith(pairWords(pair!)), point.key).toBe(true);
    }
  });

  it('says how many pairs share a dot’s exact scores, as the tooltip does', () => {
    expect(scatterPoints(SIX_PAIRS).find((p) => p.key === '3|4')?.label).toBe(
      'Card 3 × Card 4: engine 7, community 7, gap 0.00, 1 vote, 2 pairs on these scores',
    );
    const sharing = sharedScores(SIX_PAIRS);
    expect([sharing.get('3|4'), sharing.get('5|6'), sharing.get('1|2')]).toEqual([2, 2, 1]);
  });

  it('prints whole scores bare and averages to two places', () => {
    expect([7, 7.5, 4.33].map(scoreText)).toEqual(['7', '7.50', '4.33']);
  });
});

describe('the chart tables', () => {
  it('scatterTable lists every pair widest gap first with exact values, whatever order the scope comes in', () => {
    const table = scatterTable([...SIX_PAIRS].reverse(), 'Ramp');
    expect(table.caption).toBe('Every plotted pair, Ramp, widest gap first');
    expect(table.columns).toEqual(['Pair', 'Engine', 'Community', 'Gap', 'Votes']);
    expect(table.rows).toHaveLength(6);
    expect(table.rows[0]).toEqual(['Card 11 × Card 12', '9', '1', '−8.00', '1']);
    expect(table.rows[3]).toEqual(['Card 9 × Card 10', '8', '7.50', '−0.50', '2']);
  });

  it('histogramTable has a row for every bin, the rule on half points in its caption', () => {
    const table = histogramTable(gapBins(SIX_PAIRS), 'Ramp');
    expect(table.caption).toBe(
      'Pairs by gap (community − engine), Ramp. A gap on a half point counts in the bin further from zero.',
    );
    expect(table.columns).toEqual(['Gap', 'Pairs', 'Votes', 'Share of pairs']);
    expect(table.rows.map((row) => row[0])).toEqual([
      '−4.5 or lower',
      '−4.5 to −3.5',
      '−3.5 to −2.5',
      '−2.5 to −1.5',
      '−1.5 to −0.5',
      'within ±0.5',
      '+0.5 to +1.5',
      '+1.5 to +2.5',
      '+2.5 to +3.5',
      '+3.5 to +4.5',
      '+4.5 or higher',
    ]);
    expect(table.rows[2]).toEqual(['−3.5 to −2.5', '1', '1', '17%']);
    expect(table.rows[5]).toEqual(['within ±0.5', '2', '3', '33%']);
    expect(histogramTable(gapBins([]), 'All pairs').rows.every((row) => row[3] === '0%')).toBe(true);
  });

  it('histogramTable prints <1% for a one-pair end bin among 400, never 0%', () => {
    const pairs = [...Array.from({length: 399}, () => withGap(0)), withGap(6)];
    const table = histogramTable(gapBins(pairs), 'All pairs');
    expect(table.rows[10]).toEqual(['+4.5 or higher', '1', '1', '<1%']);
    expect(table.rows[5][3]).toBe('100%');
  });

  it('weeklyTable has a row per week, a quiet one with "—"', () => {
    const weeks: WeeklyGap[] = [
      {week: '2026-09-14', meanGap: -0.5, scoreVotes: 2},
      {week: '2026-09-21', meanGap: null, scoreVotes: 0},
      {week: '2026-09-28', meanGap: -1, scoreVotes: 3},
    ];
    const table = weeklyTable(weeks, 'Ramp');
    expect(table.caption).toBe('Weekly mean gap and score votes, Ramp. Weeks start on Monday (UTC).');
    expect(table.columns).toEqual(['Week of', 'Mean gap', 'Score votes']);
    expect(table.rows).toEqual([
      ['Sep 14', '−0.50', '2'],
      ['Sep 21', '—', '0'],
      ['Sep 28', '−1.00', '3'],
    ]);
  });
});

describe('weeklyGaps', () => {
  const PAIR = pairOf('1', '2', 7, 6);

  it("takes a week's plain mean of its score votes' gaps, as bucketWeekly does", () => {
    const votes = [
      vote('1', '2', at('2026-09-14'), 4),
      vote('1', '2', at('2026-09-15'), 8),
      vote('1', '2', at('2026-09-16'), 6),
    ];
    // Gaps −3, +1 and −1.
    expect(weeklyGaps(votes, [PAIR])).toEqual([{week: '2026-09-14', meanGap: -1, scoreVotes: 3}]);
  });

  it('leaves unscored votes and votes outside the scope out of the mean, but lets them set the span', () => {
    const votes = [
      vote('1', '2', at('2026-09-07'), null),
      vote('1', '2', at('2026-09-14'), 9),
      vote('3', '4', at('2026-09-21'), 2),
    ];
    expect(weeklyGaps(votes, [PAIR])).toEqual([
      {week: '2026-09-07', meanGap: null, scoreVotes: 0},
      {week: '2026-09-14', meanGap: 2, scoreVotes: 1},
      {week: '2026-09-21', meanGap: null, scoreVotes: 0},
    ]);
  });

  it('joins a vote stored the other way round to its pair', () => {
    expect(weeklyGaps([vote('2', '1', at('2026-09-14'), 9)], [PAIR])).toEqual([
      {week: '2026-09-14', meanGap: 2, scoreVotes: 1},
    ]);
  });

  it("buckets Supabase's microsecond +00:00 timestamps by their UTC day", () => {
    const votes = [
      vote('1', '2', '2026-09-27T23:59:59.999999+00:00', 7), // a Sunday: the week of Monday Sep 21
      vote('1', '2', '2026-09-28T00:00:00.000001+00:00', 9), // the next Monday
    ];
    expect(weeklyGaps(votes, [PAIR]).map((w) => [w.week, w.meanGap])).toEqual([
      ['2026-09-21', 0],
      ['2026-09-28', 2],
    ]);
  });

  it('keeps a quiet week inside the span, and the same weeks for every scope', () => {
    const other = pairOf('3', '4', 5, 5);
    const votes = [
      vote('1', '2', at('2026-09-14'), 7),
      vote('3', '4', at('2026-09-14'), 5),
      vote('3', '4', at('2026-09-28'), 6),
    ];
    const all = weeklyGaps(votes, [PAIR, other]);
    expect(all[1]).toEqual({week: '2026-09-21', meanGap: null, scoreVotes: 0});
    expect(weeklyGaps(votes, [PAIR]).map((w) => w.week)).toEqual(all.map((w) => w.week));
  });

  it('gives every week of the log with no mean for an empty scope (a tuning-only row)', () => {
    const votes = [vote('1', '2', at('2026-09-14'), 7), vote('1', '2', at('2026-09-28'), 8)];
    expect(weeklyGaps(votes, [])).toEqual([
      {week: '2026-09-14', meanGap: null, scoreVotes: 0},
      {week: '2026-09-21', meanGap: null, scoreVotes: 0},
      {week: '2026-09-28', meanGap: null, scoreVotes: 0},
    ]);
  });

  it('reads the log in any order: buildVoteLog writes it newest first', () => {
    const oldestFirst = [
      vote('1', '2', at('2026-09-14'), 4),
      vote('1', '2', at('2026-09-21'), 9),
      vote('1', '2', at('2026-09-22'), 8),
    ];
    expect(weeklyGaps([...oldestFirst].reverse(), [PAIR])).toEqual(weeklyGaps(oldestFirst, [PAIR]));
  });

  it('gives no weeks for an empty log', () => {
    expect(weeklyGaps([], [PAIR])).toEqual([]);
  });
});

describe('gapDomain', () => {
  const weeks = (...gaps: Array<number | null>): WeeklyGap[] =>
    gaps.map((meanGap, i) => ({week: `2026-09-0${i + 1}`, meanGap, scoreVotes: meanGap == null ? 0 : 1}));

  it('is centred on zero and never narrower than ±1', () => {
    expect(gapDomain([])).toEqual([-1, 1]);
    expect(gapDomain(weeks(0.2, -0.4))).toEqual([-1, 1]);
  });

  it('widens in half-point steps to hold the widest weekly mean, either side', () => {
    expect(gapDomain(weeks(1.3))).toEqual([-1.5, 1.5]);
    expect(gapDomain(weeks(0.5, -2.2))).toEqual([-2.5, 2.5]);
  });

  it('ignores quiet weeks', () => {
    expect(gapDomain(weeks(null, -0.7, null))).toEqual([-1, 1]);
  });
});

describe('SCORE_DOMAIN and SCORE_TICKS', () => {
  it('hold every jittered dot: an axis moves by at most 1.1 × SCATTER_JITTER', () => {
    expect(SCATTER_JITTER).toBe(0.35);
    expect(SCORE_DOMAIN).toEqual([0.5, 10.5]);
    expect(SCORE_TICKS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(1 - 1.1 * SCATTER_JITTER).toBeGreaterThanOrEqual(SCORE_DOMAIN[0]);
    expect(10 + 1.1 * SCATTER_JITTER).toBeLessThanOrEqual(SCORE_DOMAIN[1]);
  });
});

describe('the fixtures', () => {
  it('hold still, at real density, inside the score range', () => {
    expect(seededPairs(400)).toEqual(seededPairs(400));
    expect(ALL_PAIRS).toHaveLength(400);
    expect(ALL_PAIRS.filter((p) => p.scoreVotes > 1)).toHaveLength(40);
    expect(ALL_PAIRS.some((p) => !Number.isInteger(p.communityScore))).toBe(true);
    expect(ALL_PAIRS.every((p) => p.engineScore >= 1 && p.engineScore <= 10)).toBe(true);
    expect(ALL_PAIRS.every((p) => p.communityScore >= 1 && p.communityScore <= 10)).toBe(true);
  });

  it('give one rule 16 weeks of votes with exactly one quiet week, the eleventh', () => {
    const weeks = weeklyGaps(ONE_RULE_VOTES, ONE_RULE);
    expect(ONE_RULE).toHaveLength(60);
    expect(weeks).toHaveLength(16);
    expect(weeks.filter((w) => w.scoreVotes === 0).map((w) => weeks.indexOf(w))).toEqual([10]);
    expect(weeks.at(-1)?.week).toBe('2026-09-28');
  });
});
