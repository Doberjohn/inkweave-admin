import type {PrintingFinishes} from 'inkweave-synergy-engine';
import {promoSetRank} from '../../../app-bridge';

/*
 * The owner's catalog of promo printings (scripts/data/promo-printings.json in the app, #77), which
 * the app's promo merge folds into allCards.json and collection/promos.json. This module is what
 * Card studio knows of it: its shape, how it reads and writes as text, and the rules a printing's
 * code and id follow. It changes no catalog; catalogEdits.ts applies an add or an edit. A catalog
 * parsed and serialized again is its text, byte for byte: the round trip over the pinned file, in
 * the test beside this, holds that.
 */

/** A promo printing as the catalog stores it, its keys in the order listed. */
export interface CatalogPrinting {
  id: number;
  rarity: 'Special';
  /** The number printed on it, left out where nobody knows it yet. */
  number?: number;
  /** Its promo set, by the code printed on it: "P1" in 25/P1. */
  promoGrouping: string;
  /** Tells printings under one code apart; none needs it today. */
  finish?: string;
  /** Tells two arts under one number apart: "A" in 24A/P2. */
  artVariant?: string;
  /** The character's name, on a printing that isn't its card's. */
  printedName?: string;
  /** Ravensburger's art, where it has published it. */
  images?: {full?: string; thumbnail?: string};
  /** The language of its scan, left out for English. */
  scanLanguage?: string;
  /** Where it came from, on a printing that needs telling: "Championship (36 copies)". */
  promoSource?: string;
  /** The versions it comes in. */
  finishes?: PrintingFinishes;
}

/** A Core card's promo printings, which fold into that card in allCards.json. */
export interface FoldGroup {
  baseId: number;
  fullName: string;
  setCode: string;
  number: number;
  variants: CatalogPrinting[];
}

/**
 * The promo printings of a card allCards.json doesn't hold: a Sets 1 to 8 card Core doesn't reprint,
 * or one no dataset has yet (Hades - Dark Usurper, with no base number). They wait here for their card.
 */
export interface WaitingGroup {
  fullName: string;
  lorcanaJsonBaseId: number | null;
  baseSetCode: string;
  baseNumber: number | null;
  variants: CatalogPrinting[];
}

/** What the owner kept of a printing, filed under the code printed on it ("10/C1") and its card. */
export interface CatalogNote {
  printing: string;
  card: string;
  note: string;
}

/** The counts the catalog keeps of its own entries, in the order it keeps them. */
export interface CatalogStats {
  promoPrintings: number;
  withLorcanaJsonId: number;
  withProvisionalId: number;
  withOfficialArtUrl: number;
  foldIntoAllCards: {printings: number; baseCards: number};
  noBaseCardInAllCards: {printings: number; cards: number};
  byPromoGrouping: Record<string, number>;
}

/** The catalog file, its sections in the order it writes them. */
export interface PromoCatalog {
  about: string;
  stats: CatalogStats;
  fold: FoldGroup[];
  noBaseCard: WaitingGroup[];
  /** Every provisional id issued, each with the code and card it was issued for. */
  provisionalIds: Record<string, string>;
  notes: CatalogNote[];
}

/** What a printing's code is made of: its promo set, its number and its art. */
export type CodeParts = Pick<CatalogPrinting, 'promoGrouping' | 'number' | 'artVariant'>;

/** A printing and the group that holds it. */
export interface FoundPrinting {
  printing: CatalogPrinting;
  group: FoldGroup | WaitingGroup;
}

/** The card a promo reprints, as the catalog files its group: a Core card in fold, any other in noBaseCard. */
export interface BaseCard {
  id: number;
  fullName: string;
  setCode: string;
  number: number;
  core: boolean;
}

/** Where provisional ids start. A printing LorcanaJSON lacks takes the next one; LorcanaJSON's own ids are below. */
const PROVISIONAL_ID_BASE = 80001;

/** The catalog's sections that are lists. */
const LISTS = ['fold', 'noBaseCard', 'notes'] as const;

/** The sections that list groups, each of which lists its printings under `variants`. */
const GROUPED = ['fold', 'noBaseCard'] as const;

/** Whether the value is an object with keys: not null, and not an array. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Whether a group lists its printings: an object whose `variants` is a list. */
function listsItsPrintings(group: unknown): boolean {
  return isRecord(group) && Array.isArray(group.variants);
}

/**
 * What is wrong with the shape of a parsed catalog, as far as admin reads it, or null where nothing is.
 * It doesn't check `about` or `stats`: nothing reads them as a shape.
 */
function shapeProblem(file: Record<string, unknown>): string | null {
  const notAList = LISTS.find((key) => !Array.isArray(file[key]));
  if (notAList) return `its "${notAList}" isn't a list`;
  if (!isRecord(file.provisionalIds)) return `its "provisionalIds" isn't an object`;
  const ungrouped = GROUPED.find((key) => !(file[key] as unknown[]).every(listsItsPrintings));
  return ungrouped ? `a group in "${ungrouped}" has no "variants" list` : null;
}

/**
 * The catalog the text holds. Its shape is checked as far as admin reads it: `fold`, `noBaseCard` and
 * `notes` are lists, `provisionalIds` is an object, and each group lists its printings under `variants`.
 * One that isn't throws an Error that names what is wrong (`its "noBaseCard" isn't a list`), where a read
 * of it further on would throw a bare TypeError.
 */
export function parseCatalog(text: string): PromoCatalog {
  const parsed: unknown = JSON.parse(text);
  const problem = shapeProblem(isRecord(parsed) ? parsed : {});
  if (problem !== null) throw new Error(problem);
  return parsed as PromoCatalog;
}

/** The catalog as its file holds it: `JSON.stringify(x, null, 2)`, with no newline at the end. */
export function serializeCatalog(catalog: PromoCatalog): string {
  return JSON.stringify(catalog, null, 2);
}

/** The code printed on a printing: "1/P5", "24A/P2", or "?/C1" where nobody knows its number. */
export function printingCode({number, artVariant, promoGrouping}: CodeParts): string {
  return `${number ?? '?'}${artVariant ?? ''}/${promoGrouping}`;
}

/** The catalog's groups, those that fold first. */
function groupsOf(catalog: PromoCatalog): Array<FoldGroup | WaitingGroup> {
  return [...catalog.fold, ...catalog.noBaseCard];
}

/** The first printing, in the file's order, that `matches`, with its group. */
function firstWhere(catalog: PromoCatalog, matches: (printing: CatalogPrinting) => boolean): FoundPrinting | null {
  for (const group of groupsOf(catalog)) {
    const printing = group.variants.find(matches);
    if (printing) return {printing, group};
  }
  return null;
}

/** The printing with this id and the group that holds it, or null where the catalog has none. */
export function findPrinting(catalog: PromoCatalog, id: number): FoundPrinting | null {
  return firstWhere(catalog, (printing) => printing.id === id);
}

/** Whether both name an art and the names differ: 24A/P2 and 24B/P2 are two printings of one number. */
function artsDiffer({artVariant: a}: CodeParts, {artVariant: b}: CodeParts): boolean {
  if (a === undefined || b === undefined) return false;
  return a !== b;
}

/** Whether both name a number and it is the same one. A number nobody knows is no one's: it matches nothing. */
function sameNumber({number: a}: CodeParts, {number: b}: CodeParts): boolean {
  return a !== undefined && a === b;
}

/**
 * Whether the printing has the code: the same promo set and number, unless the two name different arts.
 * A code or a printing with no number matches nothing.
 */
function hasCode(printing: CodeParts, code: CodeParts): boolean {
  if (printing.promoGrouping !== code.promoGrouping || !sameNumber(printing, code)) return false;
  return !artsDiffer(printing, code);
}

/**
 * The first printing that has this code, with its group, or null where the code is free. `exceptId`
 * leaves out the printing being edited, so that it doesn't clash with its own code. A code with no number
 * is free: no printing has it, one with no number included.
 */
export function takenBy({catalog, code, exceptId}: {catalog: PromoCatalog; code: CodeParts; exceptId?: number}): FoundPrinting | null {
  return firstWhere(catalog, (printing) => printing.id !== exceptId && hasCode(printing, code));
}

/** Whether the app knows the promo set: only those can be chosen or published. */
export function isKnownPromoSet(code: string): boolean {
  return promoSetRank(code) !== -1;
}

/** The id of every printing the catalog holds, in both sections. */
function heldIds(catalog: PromoCatalog): number[] {
  return groupsOf(catalog).flatMap((group) => group.variants.map(({id}) => id));
}

/**
 * The id the next provisional printing takes: one above the highest the catalog has issued, whether
 * `provisionalIds` lists it or only an entry holds it. A printing removed by hand keeps its line there,
 * marked "(removed)", and a provisional printing can lack its line (an edit writes it one), so neither
 * id is issued twice. LorcanaJSON's ids, all below 80001, never raise it.
 */
export function nextProvisionalId(catalog: PromoCatalog): number {
  const listed = Object.keys(catalog.provisionalIds).map(Number);
  return Math.max(PROVISIONAL_ID_BASE - 1, ...listed, ...heldIds(catalog)) + 1;
}

/** Whether the printing has a provisional id, not a LorcanaJSON one. */
export function isProvisional({id}: Pick<CatalogPrinting, 'id'>): boolean {
  return id >= PROVISIONAL_ID_BASE;
}

/** Whether the printing has Ravensburger's art, which its entry holds as `images`. */
export function hasOfficialArt({images}: Pick<CatalogPrinting, 'images'>): boolean {
  return images !== undefined;
}

/** How many printings each promo set holds, its codes in alphabetical order. */
function countBySet(printings: readonly CatalogPrinting[]): Record<string, number> {
  const counts = new Map<string, number>();
  for (const {promoGrouping} of printings) counts.set(promoGrouping, (counts.get(promoGrouping) ?? 0) + 1);
  return Object.fromEntries([...counts].sort(([a], [b]) => a.localeCompare(b)));
}

/** The counts admin works out from the entries, in the order the file keeps them. */
function countsOf(catalog: PromoCatalog): CatalogStats {
  const folded = catalog.fold.flatMap((group) => group.variants);
  const waiting = catalog.noBaseCard.flatMap((group) => group.variants);
  const all = [...folded, ...waiting];
  return {
    promoPrintings: all.length,
    withLorcanaJsonId: all.filter((printing) => !isProvisional(printing)).length,
    withProvisionalId: all.filter(isProvisional).length,
    withOfficialArtUrl: all.filter(hasOfficialArt).length,
    foldIntoAllCards: {printings: folded.length, baseCards: catalog.fold.length},
    noBaseCardInAllCards: {printings: waiting.length, cards: catalog.noBaseCard.length},
    byPromoGrouping: countBySet(all),
  };
}

/**
 * The catalog's counts, in the order the file keeps them: each count admin knows worked out from the
 * entries, and any other as the file holds it. A count admin knows that the file lacks comes after
 * them. So a count the app adds before admin's pin knows of it is never dropped or moved, and the
 * commit's diff shows only the counts that changed. The recount spreads over the file's counts, and a
 * key that is already there keeps its place.
 */
export function recountStats(catalog: PromoCatalog): CatalogStats {
  return {...catalog.stats, ...countsOf(catalog)};
}
