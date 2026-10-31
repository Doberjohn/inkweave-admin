// @vitest-environment node
import {afterEach, describe, expect, it, vi} from 'vitest';
import {COLLECTOR_COLUMNS, buildCollectorAnalytics, collectorArtifact, weekStart} from '../collectorAnalytics.mjs';

const NOW = Date.parse('2026-11-04T12:00:00Z'); // a Wednesday
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
/** A collector whose first save was `firstAgo` ms before NOW and whose latest was `latestAgo` ms before it. */
const at = (firstAgo, latestAgo) => ({
  created_at: new Date(NOW - firstAgo).toISOString(),
  updated_at: new Date(NOW - latestAgo).toISOString(),
});
/** The same in days. */
const row = (firstDaysAgo, latestDaysAgo) => at(firstDaysAgo * DAY, latestDaysAgo * DAY);
const counts = (...rows) => buildCollectorAnalytics({rows, now: NOW});

describe('buildCollectorAnalytics', () => {
  it('counts nothing and lists no weeks with no rows', () => {
    expect(counts()).toEqual({
      hasData: true,
      collectors: 0,
      new7: 0,
      returning7: 0,
      returning30: 0,
      cameBack: 0,
      weeks: [],
    });
  });

  it('counts a latest save exactly a day after the first as a return, and a minute less as none', () => {
    expect(counts(at(3 * DAY, 2 * DAY)).cameBack).toBe(1);
    expect(counts(at(3 * DAY, 2 * DAY + MINUTE)).cameBack).toBe(0);
  });

  it('counts a save this week from an older collector as returning over 7 days, never a new one or an idle one', () => {
    expect(counts(row(8, 2)).returning7).toBe(1);
    expect(counts(row(3, 1))).toMatchObject({returning7: 0, new7: 1});
    expect(counts(row(8, 8)).returning7).toBe(0);
  });

  it('puts the 7-day line exactly 7 days back: a first save there is old, a minute later is new', () => {
    expect(counts(at(7 * DAY, DAY))).toMatchObject({returning7: 1, new7: 0});
    expect(counts(at(7 * DAY - MINUTE, DAY))).toMatchObject({returning7: 0, new7: 1});
    // A latest save exactly 7 days back is outside the week; a minute later is in it.
    expect(counts(at(10 * DAY, 7 * DAY)).returning7).toBe(0);
    expect(counts(at(10 * DAY, 7 * DAY - MINUTE)).returning7).toBe(1);
  });

  it('counts returning over 30 days the same way, with its line exactly 30 days back', () => {
    expect(counts(row(31, 2)).returning30).toBe(1);
    expect(counts(row(20, 1)).returning30).toBe(0);
    expect(counts(row(31, 31)).returning30).toBe(0);
    expect(counts(at(30 * DAY, DAY)).returning30).toBe(1);
    expect(counts(at(30 * DAY - MINUTE, DAY)).returning30).toBe(0);
  });

  it('lists start weeks newest first, each with its starts and its returns', () => {
    // Mon Oct 19 is 16 days back, Mon Nov 2 two.
    const {weeks} = counts(row(16, 16), row(2, 1), row(15, 3), row(1, 1));
    expect(weeks.map((w) => [w.week, w.started, w.cameBack])).toEqual([
      ['2026-11-02', 2, 1],
      ['2026-10-19', 2, 1],
    ]);
  });

  it("leaves a collector under a week old out of a week's weekInOf, and counts a save a week in", () => {
    // Oct 19 to 25 (16 to 10 days back): every first save a week old or more.
    const [older] = counts(row(10, 2), row(10, 9), row(12, 12)).weeks;
    expect(older).toMatchObject({week: '2026-10-19', started: 3, cameBack: 2, weekInOf: 3, weekIn: 1, active7: 1});
    // Oct 26 to Nov 1 (9 to 3 days back): the collector 5 days in hasn't had a week yet.
    const [mixed] = counts(row(9, 2), row(5, 1)).weeks;
    expect(mixed).toMatchObject({week: '2026-10-26', started: 2, weekInOf: 1, weekIn: 1});
  });

  it('counts a save exactly a week after the first as a week in, and a minute less as not', () => {
    expect(counts(at(10 * DAY, 3 * DAY)).weeks[0].weekIn).toBe(1);
    expect(counts(at(10 * DAY, 3 * DAY + MINUTE)).weeks[0].weekIn).toBe(0);
  });
});

describe('weekStart', () => {
  it('puts late Sunday in the week before and Monday midnight in its own', () => {
    expect(weekStart(Date.parse('2026-11-01T23:30:00Z'))).toBe('2026-10-26');
    expect(weekStart(Date.parse('2026-11-02T00:00:00Z'))).toBe('2026-11-02');
  });
});

/** A fake Supabase client that records each read and answers with `pages`, one per request, or `error`. */
function fakeClient({pages = [[]], error = null} = {}) {
  const reads = [];
  const client = {
    from: (table) => ({
      select: (columns) => ({
        range: async (from, to) => {
          reads.push({table, columns, from, to});
          return error ? {data: null, error} : {data: pages[reads.length - 1] ?? [], error: null};
        },
      }),
    }),
  };
  return {client, reads};
}

describe('collectorArtifact', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('asks collections for its two timestamps and nothing else', async () => {
    const {client, reads} = fakeClient({pages: [[row(8, 2)]]});
    const artifact = await collectorArtifact({client, now: NOW});
    expect(reads).toEqual([{table: 'collections', columns: 'created_at, updated_at', from: 0, to: 999}]);
    expect(COLLECTOR_COLUMNS).toBe('created_at, updated_at');
    expect(artifact).toMatchObject({hasData: true, collectors: 1, returning7: 1});
  });

  it('pages past 1000 rows', async () => {
    const full = Array.from({length: 1000}, () => row(8, 2));
    const {client, reads} = fakeClient({pages: [full, [row(3, 1)]]});
    const artifact = await collectorArtifact({client, now: NOW});
    expect(reads.map((r) => [r.from, r.to])).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(artifact.collectors).toBe(1001);
  });

  it("gives the page a reason, not a failed deploy, when the read fails, and logs Supabase's message alone", async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const {client} = fakeClient({error: {message: 'permission denied for table collections'}});
    expect(await collectorArtifact({client, now: NOW})).toEqual({hasData: false, reason: 'read-failed'});
    expect(warn).toHaveBeenCalledWith('  ⚠ collections read failed: permission denied for table collections');
  });

  it('says the key is missing with no client', async () => {
    expect(await collectorArtifact({client: null, now: NOW})).toEqual({hasData: false, reason: 'no-key'});
  });
});
