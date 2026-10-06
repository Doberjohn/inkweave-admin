import {getRuleById, type TuningConfig} from 'inkweave-synergy-engine';
import {rowsForSelection, tuningName, type RowSpec} from '../../tuning/tuningRows';
import type {PendingEdit} from '../../tuning/useTuningAdmin';
import {fmtGap} from '../../../ui/format';
import {countOf} from '../activity/activityModel';
import {MIN_RULE_VOTES} from '../overview/overviewStats';
import {verdictFor} from '../verdict';
import type {GlobalStats, PairStat, RuleStat} from '../voteAnalyticsTypes';
import type {VoteLogRow} from '../voteLogTypes';

/**
 * Below this many score votes a rule's number is statistically thin: the rules
 * table's "low n" tag. The Overview's Rules to review uses the same threshold.
 */
export const LOW_N = MIN_RULE_VOTES;
/** Most gaps are near zero; the widest-gap pairs first surface the outliers worth reviewing. */
export const MAX_PAIRS = 40;

export type RuleSortKey = 'gap' | 'votes';

/**
 * One selectable rule on /calibration. `id` is the analytics ruleId, or the
 * tuning.json key for an entry no analytics rule reaches (a tuning-only row,
 * `stat: null`). `tuningKey` is the tuning.json entry holding the rule's copy,
 * null when there is none or tuning.json isn't loaded.
 */
export interface CalibrationRow {
  id: string;
  name: string;
  category: 'playstyle' | 'direct';
  stat: RuleStat | null;
  tuningKey: string | null;
}

/** What tuningKeyFor reads from a rule: an artifact rule, or just an id and a category. */
type RuleRef = Pick<RuleStat, 'ruleId' | 'category' | 'playstyleId'>;

/**
 * The tuning.json section and key a rule's copy would live under. The section
 * is always the artifact's category, which Deploy writes from app master (R-17).
 */
function tuningSlot(rule: RuleRef): {section: CalibrationRow['category']; key: string} {
  if (rule.category === 'direct') return {section: 'direct', key: rule.ruleId};
  // R2's precompute writes a playstyle rule's playstyleId from app master's engine.
  if (rule.playstyleId !== undefined) return {section: 'playstyle', key: rule.playstyleId ?? rule.ruleId};
  // An older artifact, or a local snapshot of one: ask the pinned engine. A rule
  // the pin doesn't know (or files as direct) keeps its own id.
  const engineRule = getRuleById(rule.ruleId);
  return {section: 'playstyle', key: engineRule?.category === 'playstyle' ? engineRule.playstyleId : rule.ruleId};
}

/**
 * The tuning.json key that holds a rule's copy, or null when there is none. A
 * playstyle rule's copy lives under its playstyleId (lore-loss under
 * lore-denial, every location-* rule under location-control), a direct rule's
 * under its own id. The section is always the artifact's category, and the
 * key its playstyleId, so both come from the same app master as the rule list;
 * an artifact written before R2 has no playstyleId, and the pinned engine's
 * stands in.
 */
export function tuningKeyFor(rule: RuleRef, config: TuningConfig): string | null {
  const {section, key} = tuningSlot(rule);
  const entries = section === 'playstyle' ? config.playstyles : config.directRules;
  return Object.hasOwn(entries, key) ? key : null;
}

/**
 * The selectable rules: every analytics rule, then every tuning.json entry no
 * analytics rule maps to. Without analytics (local dev, a failed Deploy) that
 * is tuning.json alone; without tuning.json (no token yet), the analytics alone.
 */
export function buildCalibrationRows(rules: RuleStat[] | null, config: TuningConfig | null): CalibrationRow[] {
  const rows: CalibrationRow[] = (rules ?? []).map((stat) => ({
    id: stat.ruleId,
    name: stat.ruleName,
    category: stat.category,
    stat,
    tuningKey: config ? tuningKeyFor(stat, config) : null,
  }));
  if (!config) return rows;
  const reached = new Set(rows.map((row) => row.tuningKey));
  const tuningOnly = (category: CalibrationRow['category'], entries: Record<string, {name: string}>) =>
    Object.entries(entries)
      .filter(([key]) => !reached.has(key))
      .map(([key, {name}]): CalibrationRow => ({id: key, name, category, stat: null, tuningKey: key}));
  return [...rows, ...tuningOnly('playstyle', config.playstyles), ...tuningOnly('direct', config.directRules)];
}

/**
 * Rows with a stat first, by |gap| (a null gap counts as 0) or by score votes,
 * largest first, ties in artifact order; tuning-only rows last, in tuning.json
 * order. The input array is not reordered.
 */
export function sortCalibrationRows(rows: CalibrationRow[], key: RuleSortKey): CalibrationRow[] {
  const rank = (stat: RuleStat) => (key === 'gap' ? Math.abs(stat.meanGap ?? 0) : stat.scoreVotes);
  const withStat = rows.filter((row): row is CalibrationRow & {stat: RuleStat} => row.stat != null);
  return [...withStat.sort((p, q) => rank(q.stat) - rank(p.stat)), ...rows.filter((row) => row.stat == null)];
}

/**
 * The row `?rule=` names: an exact row id first, else the first row whose
 * tuning key it is (the Locations entry, location-control, opens its first
 * location rule). Null for no id or one nothing matches.
 */
export function findRow(rows: CalibrationRow[], id: string | null): CalibrationRow | null {
  if (id == null) return null;
  return rows.find((row) => row.id === id) ?? rows.find((row) => row.tuningKey === id) ?? null;
}

/** A tuning.json entry the aside can edit: its key, its name and its editable rows. */
export interface TuningEntry {
  key: string;
  /** The entry's playstyle title or direct-rule label: the aside's heading, and the Tune link's name. */
  name: string;
  rows: RowSpec[];
}

/**
 * The entry the aside edits for a row: Locations for any location-* rule.
 * Null when the row has no copy in tuning.json (no key, or a key with no
 * rows), where the aside says so and the Tune link stays hidden.
 */
export function tuningEntry(config: TuningConfig, row: CalibrationRow): TuningEntry | null {
  const key = row.tuningKey;
  const rows = key ? rowsForSelection(config, key) : [];
  if (!key || rows.length === 0) return null;
  return {key, name: tuningName(config, key), rows};
}

/** The analytics rules whose copy is the tuning entry `key` (all nine location rules share location-control). */
export function rowsSharingKey(rows: CalibrationRow[], key: string): CalibrationRow[] {
  return rows.filter((row) => row.stat != null && row.tuningKey === key);
}

/** Tuning keys with a pending edit. path[1] is the key in all three sections (ruleTexts.ramp belongs to ramp). */
export function editedKeys(pending: PendingEdit[]): Set<string> {
  return new Set(pending.map((edit) => String(edit.path[1])));
}

/** One key per pair, whichever way round its cards come: the vote log sorts a < b, and pair_scores need not. */
export function pairId(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Every voted pair in a row's scope, widest |gap| first, uncapped: what the
 * charts plot. A null row is every pair; a row with no stat (tuning-only) has none.
 */
export function pairsInScope(pairs: PairStat[], row: CalibrationRow | null): PairStat[] {
  if (row && !row.stat) return [];
  const scoped = row ? pairs.filter((p) => p.rules.includes(row.id)) : pairs;
  return [...scoped].sort((p, q) => Math.abs(q.gap) - Math.abs(p.gap));
}

/** The pair list: the widest MAX_PAIRS of the scope. */
export function pairsFor(pairs: PairStat[], row: CalibrationRow | null): PairStat[] {
  return pairsInScope(pairs, row).slice(0, MAX_PAIRS);
}

/** The scope's record for a selected pair, matched either way round, or null. */
export function findPair(scope: PairStat[], selected: {a: string; b: string} | null): PairStat | null {
  if (!selected) return null;
  const id = pairId(selected.a, selected.b);
  return scope.find((p) => pairId(p.a, p.b) === id) ?? null;
}

/**
 * The listed pairs, plus the selected one at the end when the list doesn't
 * hold it: a dot picked on the scatter can sit below the widest MAX_PAIRS, and
 * the list still shows what is selected.
 */
export function withSelectedPair(
  listed: PairStat[],
  scope: PairStat[],
  selected: {a: string; b: string} | null,
): PairStat[] {
  const pick = findPair(scope, selected);
  return pick && !listed.includes(pick) ? [...listed, pick] : listed;
}

/** The raw votes on one pair, matched either way round; none without a pair. */
export function votesForPair(votes: VoteLogRow[], pair: {a: string; b: string} | null): VoteLogRow[] {
  if (!pair) return [];
  const id = pairId(pair.a, pair.b);
  return votes.filter((vote) => pairId(vote.a, vote.b) === id);
}

/**
 * What the scope row says is in scope: "All pairs", or the rule with its gap
 * and votes ("Ramp · gap −0.57 · 557 votes"). A rule nobody has scored yet,
 * tuning-only rows included, says so instead of "gap — · 0 votes".
 */
export function pairsHeading(row: CalibrationRow | null): string {
  if (!row) return 'All pairs';
  if (!row.stat?.scoreVotes) return `${row.name} · no score votes yet`;
  return `${row.name} · gap ${fmtGap(row.stat.meanGap)} · ${countOf(row.stat.scoreVotes, 'vote')}`;
}

/** The page header's summary: "Mean gap −0.30 · well-calibrated · 2,054 votes". */
export function calibrationSubtitle(global: GlobalStats | null): string {
  // Nothing here says whether tuning.json loaded, so the empty case names only the analytics.
  if (!global) return 'No vote analytics yet';
  return `Mean gap ${fmtGap(global.meanGap)} · ${verdictFor(global.meanGap).word} · ${countOf(global.totalVotes, 'vote')}`;
}
