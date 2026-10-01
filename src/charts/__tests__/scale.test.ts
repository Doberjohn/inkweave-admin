import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  addDays,
  axisTicks,
  dayIndex,
  daySpan,
  eachDay,
  isDay,
  linear,
  nearestIndex,
  niceCeiling,
  textWidth,
  weekStart,
} from '../scale';

// The zone this run started in. Deleting TZ doesn't reset Node's zone cache, so
// the cleanup names this zone again before Vitest drops the stub (as format.test.ts does).
const HOST_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

describe('niceCeiling', () => {
  it.each([
    [37, 40],
    [402, 500],
    [1, 1],
    [7, 8],
    [9, 10],
    [10, 10],
    [11, 12],
    [13, 15],
    [1000, 1000],
    [1001, 1200],
    [0.37, 0.4],
    [0.3, 0.3],
  ])('tops %s at %s', (max, top) => {
    expect(niceCeiling(max)).toBe(top);
  });

  it.each([0, -5, NaN, Infinity])('gives 1 for %s, so an empty or all-zero chart still has an axis', (max) => {
    expect(niceCeiling(max)).toBe(1);
  });
});

describe('axisTicks', () => {
  it('spaces three ticks from 0 to the top by default', () => {
    expect(axisTicks(40)).toEqual([0, 20, 40]);
    expect(axisTicks(1)).toEqual([0, 0.5, 1]);
  });

  it('takes a count, and treats one below 2 as 2', () => {
    expect(axisTicks(500, 5)).toEqual([0, 125, 250, 375, 500]);
    expect(axisTicks(10, 2)).toEqual([0, 10]);
    expect(axisTicks(10, 1)).toEqual([0, 10]);
  });

  it('leaves no float noise in fractional ticks', () => {
    expect(axisTicks(0.3)).toEqual([0, 0.15, 0.3]);
  });

  it.each([0, -1, NaN])('gives a lone 0 for a top of %s', (ceiling) => {
    expect(axisTicks(ceiling)).toEqual([0]);
  });
});

describe('linear', () => {
  it('maps the domain onto the range, flipped for a y axis, and extrapolates', () => {
    const y = linear([0, 40], [216, 16]);
    expect(y(0)).toBe(216);
    expect(y(40)).toBe(16);
    expect(y(10)).toBe(166);
    expect(y(80)).toBe(-184);
  });

  it('puts every value in the middle of a zero-width domain (one point)', () => {
    const x = linear([3, 3], [0, 100]);
    expect(x(3)).toBe(50);
    expect(x(99)).toBe(50);
  });
});

describe('nearestIndex', () => {
  it('snaps to the nearest position, the earlier one on a tie', () => {
    const xs = [0, 10, 20];
    expect(nearestIndex(xs, 4)).toBe(0);
    expect(nearestIndex(xs, 6)).toBe(1);
    expect(nearestIndex(xs, 5)).toBe(0);
    expect(nearestIndex(xs, -50)).toBe(0);
    expect(nearestIndex(xs, 999)).toBe(2);
  });

  it('handles one position and none', () => {
    expect(nearestIndex([42], -1)).toBe(0);
    expect(nearestIndex([], 10)).toBe(-1);
  });
});

describe('calendar days', () => {
  it('lists every day across a month and a year boundary, both ends included', () => {
    expect(eachDay('2026-09-28', '2026-10-02')).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
    expect(eachDay('2026-12-30', '2027-01-02')).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
  });

  it('includes a leap day', () => {
    expect(eachDay('2024-02-28', '2024-03-01')).toEqual(['2024-02-28', '2024-02-29', '2024-03-01']);
    expect(eachDay('2026-02-28', '2026-03-01')).toEqual(['2026-02-28', '2026-03-01']);
  });

  it('gives one day for a one-day span and none for a reversed or broken one', () => {
    expect(eachDay('2026-09-30', '2026-09-30')).toEqual(['2026-09-30']);
    expect(eachDay('2026-10-01', '2026-09-30')).toEqual([]);
    expect(eachDay('2026-02-30', '2026-03-02')).toEqual([]);
    expect(eachDay('not a day', '2026-09-30')).toEqual([]);
  });

  it('counts days inclusively', () => {
    expect(daySpan('2026-09-30', '2026-09-30')).toBe(1);
    expect(daySpan('2026-09-01', '2026-09-30')).toBe(30);
    expect(daySpan('2025-10-01', '2026-09-30')).toBe(365);
    expect(daySpan('2026-10-01', '2026-09-30')).toBe(0);
    expect(daySpan('2026-9-1', '2026-09-30')).toBe(0);
  });

  it('moves a day by whole days across months, years and a leap day', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-09-30', -89)).toBe('2026-07-03');
    expect(addDays('garbage', 3)).toBe('garbage');
  });

  it('finds the UTC Monday of a week', () => {
    expect(weekStart('2026-09-28')).toBe('2026-09-28'); // a Monday
    expect(weekStart('2026-10-01')).toBe('2026-09-28'); // Thursday
    expect(weekStart('2026-10-04')).toBe('2026-09-28'); // Sunday closes the week
    expect(weekStart('2026-03-01')).toBe('2026-02-23'); // Sunday, back across a month
    expect(weekStart('2027-01-01')).toBe('2026-12-28'); // Friday, back across a year
    expect(weekStart('2026-02-31')).toBe('2026-02-31'); // not a day: unchanged
  });

  it('tells real days from look-alikes, and numbers them', () => {
    expect(isDay('2024-02-29')).toBe(true);
    expect(isDay('2026-02-29')).toBe(false);
    expect(isDay('2026-09-30T00:00:00Z')).toBe(false);
    expect(dayIndex('1970-01-02')).toBe(1);
    expect(dayIndex('2026-10-01')! - dayIndex('2026-09-30')!).toBe(1);
    expect(dayIndex('Sep 30')).toBeNull();
  });

  describe('in any time zone, across daylight-saving changes', () => {
    afterEach(() => {
      vi.stubEnv('TZ', HOST_ZONE);
      vi.unstubAllEnvs();
    });

    // Athens and New York change their clocks on these days in 2026 (Mar 29 and
    // Oct 25, Mar 8 and Nov 1). Kiritimati (UTC+14) has no DST, but local and UTC
    // dates differ there all afternoon. UTC day math must not notice any of it.
    it.each(['Europe/Athens', 'America/New_York', 'Pacific/Kiritimati'])('keeps whole days in %s', (zone) => {
      vi.stubEnv('TZ', zone);
      expect(eachDay('2026-03-28', '2026-03-30')).toEqual(['2026-03-28', '2026-03-29', '2026-03-30']);
      expect(eachDay('2026-03-07', '2026-03-09')).toEqual(['2026-03-07', '2026-03-08', '2026-03-09']);
      expect(daySpan('2026-10-24', '2026-11-02')).toBe(10);
      expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
      expect(addDays('2026-11-02', -2)).toBe('2026-10-31');
      expect(weekStart('2026-03-29')).toBe('2026-03-23');
      expect(weekStart('2026-11-01')).toBe('2026-10-26');
    });
  });
});

describe('textWidth', () => {
  it('estimates 0.6em a character', () => {
    expect(textWidth('Sep 30', 10)).toBe(36);
    expect(textWidth('', 10)).toBe(0);
  });
});
