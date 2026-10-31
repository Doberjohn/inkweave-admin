import type {CollectorCounts} from '../collectorAnalyticsTypes';

/**
 * Collectors fixtures, shared by the page's tests and stories: 27 collectors over
 * four start weeks as of Wednesday 4 November, the newest too new for a week in and
 * only the oldest started before the 30 days, so only its collectors can be
 * returning over 30 days. The counts agree with the weeks as the precompute's would.
 */
export const COUNTS: CollectorCounts = {
  generatedAt: '2026-11-04T04:14:00Z',
  hasData: true,
  collectors: 27,
  new7: 10,
  returning7: 5,
  returning30: 6,
  cameBack: 17,
  weeks: [
    {week: '2026-11-02', started: 5, cameBack: 1, weekIn: 0, weekInOf: 0, active7: 5},
    {week: '2026-10-26', started: 8, cameBack: 5, weekIn: 1, weekInOf: 3, active7: 6},
    {week: '2026-10-19', started: 6, cameBack: 5, weekIn: 3, weekInOf: 6, active7: 2},
    {week: '2026-09-28', started: 8, cameBack: 6, weekIn: 4, weekInOf: 8, active7: 2},
  ],
};
