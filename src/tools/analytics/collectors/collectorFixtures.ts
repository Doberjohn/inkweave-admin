import type {CollectorCounts} from '../collectorAnalyticsTypes';

/**
 * Collectors fixtures, shared by the page's tests and stories: 27 collectors over
 * four start weeks, the newest too new for a week in.
 */
export const COUNTS: CollectorCounts = {
  generatedAt: '2026-11-04T04:14:00Z',
  hasData: true,
  collectors: 27,
  new7: 5,
  returning7: 9,
  returning30: 14,
  cameBack: 17,
  weeks: [
    {week: '2026-11-02', started: 5, cameBack: 1, weekIn: 0, weekInOf: 0, active7: 5},
    {week: '2026-10-26', started: 8, cameBack: 5, weekIn: 1, weekInOf: 3, active7: 4},
    {week: '2026-10-19', started: 10, cameBack: 8, weekIn: 6, weekInOf: 10, active7: 3},
    {week: '2026-10-12', started: 4, cameBack: 3, weekIn: 2, weekInOf: 4, active7: 1},
  ],
};
