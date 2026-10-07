import type {LorcanaCard} from 'inkweave-synergy-engine';
import type {StrengthTierLabel} from '../../../app-bridge';
import type {ChartTable} from '../../../charts/ChartFrame';
import type {TooltipContent, TooltipRow} from '../../../charts/ChartTooltip';
import {NETWORK_MAX_NODES, type NetworkNode} from '../../../charts/NetworkDiagram';
import {ringSizes} from '../../../charts/networkLayout';
import {cardsHref} from '../../../shell/nav';
import {fmtInt, fmtScore} from '../../../ui/format';
import type {SplitMeterPart} from '../../../ui/SplitMeter';
import {
  TIER_COLOR,
  TIER_SERIES,
  enginePartners,
  engineSummary,
  tieAtCut,
  type CardSynergies,
  type CutTie,
  type EnginePartner,
  type EngineSummary,
} from './engineView';
import type {UseCardSynergiesReturn} from './useCardSynergies';

/*
 * The engine panels' state, numbers and words (R3-6c), from one card's live
 * synergy file: which state the Engine view shows, the tier split, and the
 * network's nodes, subtitle and table. Pure; EnginePanels.tsx draws them.
 */

/** A partner's names from the card list: the full one (tooltip, link, table, order) and the short one printed. */
export interface PartnerNames {
  full: (id: string) => string;
  short: (id: string) => string;
}

/** What the Engine view and the network draw once the engine pairs the card with anyone. */
export interface EngineModel {
  /** Every partner, strongest first: score, then name (R-37). Each `name` is the full one. */
  partners: EnginePartner[];
  summary: EngineSummary;
  /** The tie the network's cut at NETWORK_MAX_NODES splits, or null (R-37). */
  cut: CutTie | null;
}

export type EngineState =
  | {kind: 'loading'}
  | {kind: 'failed'; error: Error}
  | {kind: 'empty'}
  | {kind: 'loaded'; model: EngineModel};

const LOADING: EngineState = {kind: 'loading'};
const EMPTY: EngineState = {kind: 'empty'};

/** Rule names as a phrase: "Ramp", "Shift Targets and Ramp", "Ramp, Singer and Locations". */
const RULE_LIST = new Intl.ListFormat('en-GB', {type: 'conjunction'});

/**
 * Names from the card list, or the id for a card it doesn't hold. Partners
 * come from the live synergy file, which covers the same card list, so a bare
 * id shows only while the two are a deploy apart.
 */
export function partnerNames(getCardById: (id: string) => LorcanaCard | undefined): PartnerNames {
  return {
    full: (id) => getCardById(id)?.fullName ?? id,
    short: (id) => getCardById(id)?.name ?? id,
  };
}

/** The partners, built once, with what the panels read off them; null when the engine pairs the card with no one. */
function engineModel(data: CardSynergies, names: PartnerNames): EngineModel | null {
  const partners = enginePartners(data, names.full);
  if (partners.length === 0) return null;
  return {partners, summary: engineSummary(partners, data.groups), cut: tieAtCut(partners, NETWORK_MAX_NODES)};
}

/**
 * Which of the Engine view's states to show. `empty` covers a missing or
 * unreadable file too: fetchCardSynergies keeps a non-OK response as an empty
 * result, so the two can't be told apart.
 */
export function engineState(
  synergies: Pick<UseCardSynergiesReturn, 'data' | 'loading' | 'error'>,
  names: PartnerNames,
): EngineState {
  if (synergies.loading) return LOADING;
  if (synergies.error) return {kind: 'failed', error: synergies.error};
  const model = synergies.data && engineModel(synergies.data, names);
  return model ? {kind: 'loaded', model} : EMPTY;
}

/** The tier split's parts, strongest tier first. Every tier keeps its part, zeros included (R-44: "Strong ≥7"). */
export function tierParts(summary: EngineSummary): SplitMeterPart[] {
  // TIER_SERIES' ids are the tier labels (R3-4).
  return TIER_SERIES.map(({id, label, color}) => ({id, label, color, value: summary.tiers[id as StrengthTierLabel]}));
}

/** An engine score: rules score in whole points, so "8"; anything else keeps one place, so "9.5". */
export function engineScoreText(score: number): string {
  return fmtScore(score, Number.isInteger(score) ? 0 : 1);
}

/**
 * A partner's tooltip, whose text is also its node link's name (R-41): "Wren
 * Ashdown - Keeper of Keys: 10 engine score, Perfect tier, Shift Targets and
 * Ramp rules". The title is the full name, so two partners that print the same
 * short name still read apart. The score row carries the tier's line key; a
 * pair the engine names no rule for has no rules row.
 */
function partnerTooltip(partner: EnginePartner): TooltipContent {
  const rows: TooltipRow[] = [
    {value: engineScoreText(partner.score), label: 'engine score', color: TIER_COLOR[partner.tier]},
    {value: partner.tier, label: 'tier'},
  ];
  if (partner.ruleNames.length > 0) {
    rows.push({value: RULE_LIST.format(partner.ruleNames), label: partner.ruleNames.length === 1 ? 'rule' : 'rules'});
  }
  return {title: partner.name, rows};
}

/**
 * The network's nodes, strongest first: every partner, though the diagram
 * draws only the first NETWORK_MAX_NODES and counts the rest. Each prints its
 * short name, links to its own card page and takes its tier's series.
 */
export function partnerNodes(partners: readonly EnginePartner[], names: PartnerNames): NetworkNode[] {
  return partners.map((partner) => ({
    id: partner.id,
    label: names.short(partner.id),
    href: cardsHref(partner.id),
    value: partner.score,
    seriesId: partner.tier,
    tooltip: partnerTooltip(partner),
  }));
}

/** Every drawn partner sits in the tie: the cut splits the top score, so names alone pick the twelve. */
function allTied(cut: CutTie | null): cut is CutTie {
  return cut !== null && cut.drawn === NETWORK_MAX_NODES;
}

/** "7 of the 8 partners at score 7". */
function tieText(cut: CutTie): string {
  return `${cut.drawn} of the ${cut.tied} partners at score ${engineScoreText(cut.score)}`;
}

/** Which partners the diagram draws. A capped count is a floor, so it reads "at least", as the panel's count does. */
function whichPartners({summary, cut}: Pick<EngineModel, 'summary' | 'cut'>): string {
  if (summary.partners <= NETWORK_MAX_NODES) return 'Every partner';
  const total = `${summary.capped ? 'at least ' : ''}${fmtInt(summary.partners)}`;
  if (allTied(cut)) return `${tieText(cut)}, by name, of ${total} in all`;
  return `The ${NETWORK_MAX_NODES} strongest of ${total} partners`;
}

/** How many sit on the inner ring, when there are two (networkLayout's ringSizes). */
function ringClause(summary: EngineSummary): string {
  const [inner, outer] = ringSizes(Math.min(summary.partners, NETWORK_MAX_NODES));
  return outer > 0 ? `, the first ${inner} on the inner ring` : '';
}

/** R-37: a cut inside a tie below the top score names the tie, whose drawn partners are picked by name. */
function tieClause(cut: CutTie | null): string {
  if (!cut || allTied(cut)) return '';
  return ` ${tieText(cut)} make the cut, by name.`;
}

/** Spoke widths say nothing when every drawn spoke has the same score: one partner, or a drawn set that all tie. */
function spokesClause(partners: readonly EnginePartner[]): string {
  const drawn = partners.slice(0, NETWORK_MAX_NODES);
  return drawn[0].score === drawn[drawn.length - 1].score ? '' : ' Thicker spokes score higher.';
}

/**
 * The diagram's subtitle: which partners it draws, how to read it, and the
 * tie its cut splits, if any (R-37). "The 12 strongest of 15 partners, ranked
 * clockwise from 12 o'clock, the first 6 on the inner ring. 7 of the 8
 * partners at score 7 make the cut, by name. Thicker spokes score higher."
 */
export function networkSubtitle(model: EngineModel): string {
  const read = `ranked clockwise from 12 o'clock${ringClause(model.summary)}`;
  return `${whichPartners(model)}, ${read}.${tieClause(model.cut)}${spokesClause(model.partners)}`;
}

/** The diagram's table view: every partner, not only the drawn ones, with all its tooltip shows. */
export function partnerTable(partners: readonly EnginePartner[], card: Pick<LorcanaCard, 'fullName'>): ChartTable {
  return {
    caption: `Synergy partners of ${card.fullName}, strongest first (by engine score, then name)`,
    columns: ['Partner', 'Score', 'Tier', 'Rules'],
    rows: partners.map((p) => [p.name, engineScoreText(p.score), p.tier, RULE_LIST.format(p.ruleNames) || '—']),
  };
}
