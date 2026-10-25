import {isCoreSet, type LorcanaCard} from 'inkweave-synergy-engine';
import {REVEAL_ID_BASE, REVEAL_SET_CODE, SET_LOGOS, SET_NAMES, SET_TOTAL} from '../../app-bridge';
import {releasedRevealNumbers} from '../reveal/releasedNumbers';
import {intField} from '../reveal/validateForm';

/*
 * The sets New card's first step names. The set decides where a new card is
 * written, so the step shows that and never asks for it: a card of the reveal
 * set goes to previewCards.json under a preview id until graduation swaps it
 * for LorcanaJSON's, and the app refuses a preview card of any other set
 * (reveal-set-integrity.test.ts). Every other Core set is LorcanaJSON's, in
 * allCards.json, so it takes no new card here. All of it reads inkweave.ink's
 * card list, as New card's number check does (releasedRevealNumbers).
 */

/** A Core set as New card names it. */
export interface NewCardSet {
  code: string;
  /** The app's name for it, or undefined for a code the pinned app hasn't named yet. */
  name: string | undefined;
  /** Its logo under /art/sets/, or undefined for a set without one. */
  logo: string | undefined;
}

/**
 * Whether the reveal set takes a new card: 'open' while one of its numbers is
 * free; 'graduated' once released cards hold every number, as after
 * graduation; 'full' while cards hold every number but some are still previews.
 */
export type RevealSetStatus = 'open' | 'graduated' | 'full';

/** The reveal set, and how many of its numbers are in. */
export interface RevealSetState extends NewCardSet {
  /** Its collector numbers, 1 to SET_TOTAL, that a card in the list holds, preview or released. */
  taken: number;
  /** SET_TOTAL: every number past it is a variant printing, never a card. */
  total: number;
  status: RevealSetStatus;
}

/** What New card's first step shows. */
export interface NewCardSets {
  reveal: RevealSetState;
  /** Every other Core set the card list holds, newest first. None of them takes a new card. */
  released: NewCardSet[];
}

const NAMES: Readonly<Partial<Record<string, string>>> = SET_NAMES;

/** A set by its code, as New card names it. */
export function newCardSet(code: string): NewCardSet {
  return {code, name: NAMES[code], logo: SET_LOGOS[code]};
}

/** A set as a line names it: "Set 13 · Attack of the Vine!", or "Set 15" while the pinned app has no name for it. */
export function setLabel({code, name}: NewCardSet): string {
  return name === undefined ? `Set ${code}` : `Set ${code} · ${name}`;
}

/** Whether `n` is one of the reveal set's own numbers, 1 to SET_TOTAL. */
function inSet(n: number | null | undefined): n is number {
  return n != null && Number.isInteger(n) && n >= 1 && n <= SET_TOTAL;
}

/** How many of the reveal set's numbers a card in the list holds, under a preview id or its official one. */
function takenCount(cards: readonly LorcanaCard[]): number {
  const numbers = cards.filter((card) => card.setCode === REVEAL_SET_CODE).map((card) => card.setNumber);
  return new Set(numbers.filter(inSet)).size;
}

/** How many of the reveal set's numbers a released card holds. */
function releasedCount(cards: readonly LorcanaCard[]): number {
  return [...releasedRevealNumbers(cards).keys()].filter(inSet).length;
}

function revealStatus({taken, released}: {taken: number; released: number}): RevealSetStatus {
  if (taken < SET_TOTAL) return 'open';
  return released === SET_TOTAL ? 'graduated' : 'full';
}

/** Whether the card is of a Core set other than the reveal set. */
function isOtherCoreSet(code: string | undefined): code is string {
  return code !== undefined && code !== REVEAL_SET_CODE && isCoreSet(code);
}

/** The Core sets besides the reveal set that the list holds, newest first. */
function releasedSets(cards: readonly LorcanaCard[]): NewCardSet[] {
  const codes = new Set(cards.map((card) => card.setCode).filter(isOtherCoreSet));
  return [...codes].sort((a, b) => Number(b) - Number(a)).map(newCardSet);
}

/** The reveal set's state and the other Core sets, from the card list. */
export function newCardSets(cards: readonly LorcanaCard[]): NewCardSets {
  const taken = takenCount(cards);
  const status = revealStatus({taken, released: releasedCount(cards)});
  return {
    reveal: {...newCardSet(REVEAL_SET_CODE), taken, total: SET_TOTAL, status},
    released: releasedSets(cards),
  };
}

/**
 * Why the reveal set takes no new card, as step 1 says it, or null while it
 * takes one. A full set is still in its season: its preview cards graduate
 * with it.
 */
export function closedReason(reveal: RevealSetState): string | null {
  if (reveal.status === 'open') return null;
  const label = setLabel(reveal);
  return reveal.status === 'graduated'
    ? `${label} has graduated: released cards hold all ${reveal.total} of its numbers.`
    : `${label} is full: cards hold all ${reveal.total} of its numbers, some of them still previews.`;
}

/**
 * The sets step 1 lists as taking no new card: the reveal set first once it
 * has graduated, then the other Core sets. A full reveal set is still in its
 * season, so it stays out: the notice names it.
 */
export function closedSets({reveal, released}: NewCardSets): NewCardSet[] {
  return reveal.status === 'graduated' ? [reveal, ...released] : [...released];
}

/**
 * The id the set bar says a card will be written under: "card 14023" for a
 * number the set has, read as the form reads it (intField), else
 * "14000 + its collector number".
 */
export function previewIdText(collectorNumber: string): string {
  const n = intField(collectorNumber);
  return inSet(n) ? `card ${REVEAL_ID_BASE + n}` : `${REVEAL_ID_BASE} + its collector number`;
}
