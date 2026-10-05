export interface WeeklyPoint {
  /** The week's UTC Monday as YYYY-MM-DD (isoWeekStart in the precompute), not an ISO week label. */
  week: string;
  votes: number;
  meanGap: number | null;
}

export interface DimensionFill {
  score: number;
  accuracy: number;
  isReal: number;
  wouldPlay: number;
  difficulty: number;
}

export interface GlobalStats {
  totalVotes: number;
  distinctPairs: number;
  distinctVoters: number | null;
  meanGap: number | null;
  accuracySentiment: number | null;
  engineSilentPairs: number;
  weekly: WeeklyPoint[];
  dimensionFill: DimensionFill | null;
}

export interface RuleStat {
  ruleId: string;
  ruleName: string;
  category: 'direct' | 'playstyle';
  /**
   * The tuning.json key of a playstyle rule's copy (its engine playstyleId:
   * lore-denial for lore-loss, location-control for every location-* rule), and
   * null for a direct rule. Absent from artifacts written before R2, and from
   * local snapshots of them; the calibration model then asks the pinned engine.
   */
  playstyleId?: string | null;
  scoreVotes: number;
  pairsVoted: number;
  meanGap: number | null;
  accuracySentiment: number | null;
  pairsCovered: number;
}

export interface PairStat {
  a: string;
  b: string;
  aName: string;
  bName: string;
  engineScore: number;
  communityScore: number;
  gap: number;
  scoreVotes: number;
  rules: string[];
}

export interface VoteAnalytics {
  generatedAt: string;
  hasRawVotes: boolean;
  global: GlobalStats;
  rules: RuleStat[];
  pairs: PairStat[];
}
