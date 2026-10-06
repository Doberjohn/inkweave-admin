/**
 * One raw vote, as buildVoteLog writes it (scripts/lib/voteAnalytics.mjs). The
 * answer fields take only the values the app's votes table allows (its check
 * constraints: supabase/migrations/20260330000001_votes_table.sql:7-12), and
 * null where the voter skipped the question.
 */
export interface VoteLogRow {
  a: string;
  b: string;
  aName: string;
  bName: string;
  score: number | null;
  /** −1 "Should be lower" (the engine's score is too high), 0 "Score is fair", +1 "Should be higher". */
  accuracy: -1 | 0 | 1 | null;
  isReal: boolean | null;
  wouldPlay: boolean | null;
  /** 1 Easy, 2 Situational, 3 Hard. */
  difficulty: 1 | 2 | 3 | null;
  /** Who carries the pair: 'a' and 'b' are this row's a and b cards; 'both' is the one-click default. */
  whoCarries: 'a' | 'b' | 'both' | 'neither' | null;
  ts: string;
  voter: number;
}

export interface VoteLog {
  generatedAt: string;
  votes: VoteLogRow[];
  voterCount: number;
}
