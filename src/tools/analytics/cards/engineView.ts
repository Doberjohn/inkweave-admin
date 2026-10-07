import {TIER_COLORS, getStrengthTier, type StrengthTierLabel, type fetchCardSynergies} from '../../../app-bridge';
import type {SeriesDef} from '../../../charts/series';

/*
 * The Engine view's model: what the engine says about one card, read from its
 * precomputed synergy file (/data/synergies/<id>.json, through the bridged
 * fetchCardSynergies). Pure functions; useCardSynergies loads the file, and
 * the Engine panels (R3-6c) draw what these return.
 */

/** What fetchCardSynergies resolves to (the app keeps PrecomputedCardData private). */
export type CardSynergies = Awaited<ReturnType<typeof fetchCardSynergies>>;

/** SynergyEngine's maxResultsPerGroup default (SynergyEngine.ts:37): a group at this size was cut (:130). */
export const ENGINE_GROUP_CAP = 100;

export interface EnginePartner {
  id: string;
  /** The name the caller's lookup gave, or the id for a card it doesn't hold. The order's tie-break. */
  name: string;
  /** The pair's aggregateScore: its strongest connection (SynergyEngine.ts:20-24). */
  score: number;
  tier: StrengthTierLabel;
  /**
   * The names of the rules that connect the pair, in the file's order. The
   * engine keeps one connection per rule and sorts them strongest first
   * (SynergyEngine.ts:227-256), so each name appears once.
   */
  ruleNames: string[];
}

export interface EngineSummary {
  /** Every partner, each once. A floor when `capped`. */
  partners: number;
  /** A group hit ENGINE_GROUP_CAP, so the engine left partners out. */
  capped: boolean;
  tiers: Record<StrengthTierLabel, number>;
}

/** A tie that the cut at `shown` partners splits: `drawn` of the `tied` partners at `score` make the cut. */
export interface CutTie {
  score: number;
  drawn: number;
  tied: number;
}

/** Strongest first, as the network diagram's legend and the tier split read. */
export const TIER_ORDER: readonly StrengthTierLabel[] = ['Perfect', 'Strong', 'Moderate', 'Weak'];

/** Each tier's mark colour: its TIER_COLORS entry, an app entity colour R-15 keeps. */
export const TIER_COLOR: Readonly<Record<StrengthTierLabel, string>> = {
  Perfect: TIER_COLORS.perfect.color,
  Strong: TIER_COLORS.strong.color,
  Moderate: TIER_COLORS.moderate.color,
  Weak: TIER_COLORS.weak.color,
};

/** Each tier with getStrengthTier's own cut-off (scoreUtils.ts:18-23; R-44). */
const TIER_LABEL: Record<StrengthTierLabel, string> = {
  Perfect: 'Perfect ≥9.5',
  Strong: 'Strong ≥7',
  Moderate: 'Moderate ≥4',
  Weak: 'Weak <4',
};

/** The tiers as chart series, strongest first. Each id is its tier label. */
export const TIER_SERIES: readonly SeriesDef[] = TIER_ORDER.map((tier) => ({
  id: tier,
  label: TIER_LABEL[tier],
  color: TIER_COLOR[tier],
}));

/**
 * Names in one order in every browser. The engine cuts each group by score,
 * then name, with localeCompare in the build's locale (SynergyEngine.ts:124-128);
 * a fixed 'en' keeps the viewer's locale out of it.
 */
const NAME_ORDER = new Intl.Collator('en');

/** Score, highest first, then name (R-37), then id by code unit, so the order is total. */
function byStrength(a: EnginePartner, b: EnginePartner): number {
  return b.score - a.score || NAME_ORDER.compare(a.name, b.name) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/**
 * Every partner the engine pairs with this card, in byStrength's order, with
 * the rules behind each pair. A partner in several groups is one key of
 * `pairs`, so it counts once. `nameOf` names a partner: the card page passes
 * the card list's full name, so the order within a score reads alphabetically.
 */
export function enginePartners(data: CardSynergies, nameOf: (id: string) => string): EnginePartner[] {
  return Object.entries(data.pairs)
    .map(([id, pair]) => ({
      id,
      name: nameOf(id),
      score: pair.aggregateScore,
      tier: getStrengthTier(pair.aggregateScore).label,
      ruleNames: pair.connections.map((connection) => connection.ruleName),
    }))
    .sort(byStrength);
}

/**
 * The partner count, whether a group hit the engine's cap (the count is then a
 * floor), and the count per tier. Takes enginePartners' list, so the card page
 * builds it once.
 */
export function engineSummary(partners: readonly EnginePartner[], groups: CardSynergies['groups']): EngineSummary {
  const tiers: Record<StrengthTierLabel, number> = {Perfect: 0, Strong: 0, Moderate: 0, Weak: 0};
  for (const partner of partners) tiers[partner.tier] += 1;
  return {
    partners: partners.length,
    capped: groups.some((group) => group.synergies.length >= ENGINE_GROUP_CAP),
    tiers,
  };
}

/**
 * The tie that cutting enginePartners' list at `shown` splits, or null when
 * the cut falls between two scores or nothing is cut. Engine scores are whole
 * numbers, so the cut usually lands inside a tie, and the network's subtitle
 * says which partners it drew (R-37).
 */
export function tieAtCut(partners: readonly EnginePartner[], shown: number): CutTie | null {
  if (shown < 1 || shown >= partners.length) return null;
  const score = partners[shown - 1].score;
  if (partners[shown].score !== score) return null;
  const atScore = (partner: EnginePartner) => partner.score === score;
  return {
    score,
    drawn: partners.slice(0, shown).filter(atScore).length,
    tied: partners.filter(atScore).length,
  };
}
