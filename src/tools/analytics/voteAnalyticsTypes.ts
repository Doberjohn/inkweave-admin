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

/** The engine-silent pairs split by the current card list (#29). The two add up to engineSilentPairs. */
export interface EngineSilentSplit {
  /** Both cards are in the card list, and the engine still gives the pair no score: the real engine gaps. */
  listed: number;
  /**
   * A card is outside the card list (rotated out of Core, or a preview id its
   * release replaced), so the engine never scores the pair.
   */
  unlisted: number;
}

export interface GlobalStats {
  totalVotes: number;
  distinctPairs: number;
  distinctVoters: number | null;
  meanGap: number | null;
  /**
   * The mean accuracy answer, from −1 to +1: the share of "too low" answers
   * less the share of "too high" ones, over every raw vote that answered (#30),
   * as the card page has it per card (R-32). Null without raw votes or
   * answers. An artifact written before #30 holds a figure from pairs[] here
   * instead, so it is read only beside accuracyAnswers.
   */
  accuracySentiment: number | null;
  /** The answers accuracySentiment rests on; null without raw votes. Absent from artifacts written before #30. */
  accuracyAnswers?: number | null;
  /** Voted pairs the engine gives no score, which pairs[] leaves out. */
  engineSilentPairs: number;
  /** engineSilentPairs split by the current card list. Absent from artifacts written before #29. */
  engineSilentSplit?: EngineSilentSplit;
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
