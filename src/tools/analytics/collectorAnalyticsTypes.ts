/** Shape of /admin-data/collector-analytics.json, produced by scripts/precompute-collector-analytics.mjs. */

/** One start week: the collectors whose first save fell in it, and how they held up. */
export interface CollectorWeek {
  /** The UTC Monday that starts it, YYYY-MM-DD. */
  week: string;
  started: number;
  /** Of them, the collectors whose latest save came a day or more after their first. */
  cameBack: number;
  /** Of `weekInOf`, those who saved again a week or more after their first save. */
  weekIn: number;
  /** Its collectors whose first save is a week old or more: 0 while the week is too new. */
  weekInOf: number;
  /** Its collectors with a save in the last 7 days. */
  active7: number;
}

/** The counts, as of `generatedAt`. A return is a save a day or more after the first. */
export interface CollectorCounts {
  generatedAt: string;
  hasData: true;
  /** Accounts with a collection. */
  collectors: number;
  /** First saves in the last 7 days. */
  new7: number;
  /** Saves in the last 7 days from collectors whose first save came before them. */
  returning7: number;
  /** The same over 30 days. */
  returning30: number;
  /** Collectors whose latest save came a day or more after their first. */
  cameBack: number;
  /** Newest first. */
  weeks: CollectorWeek[];
}

/** Why the last deploy wrote no counts: no service-role key, or the read failed. */
export interface NoCollectorCounts {
  generatedAt: string;
  hasData: false;
  reason: 'no-key' | 'read-failed';
}

export type CollectorAnalytics = CollectorCounts | NoCollectorCounts;
