import {getInks, type Ink, type LorcanaCard} from 'inkweave-synergy-engine';
import {FEATURED_INKS, featuredEntry, featuredListProblem, type FeaturedEntry} from '../../app-bridge';
import {filterCards} from '../image/filterCards';
import type {SlotChange} from './githubClient';

/** One of the homepage's six places: its ink, and the card the list puts there. */
export interface FeaturedSlot {
  ink: Ink;
  /** The card's id, as featuredCardIds.json names it. */
  id: string;
  /** The file's own line for it, "Amethyst: Un Poco Loco": all the page knows of a card the card list lacks. */
  label: string;
  /** The card from the card list, or undefined where the list doesn't hold it. */
  card: LorcanaCard | undefined;
}

/** How a slot's card is looked up: the card list's getCardById. */
export type CardById = (id: string) => LorcanaCard | undefined;

/** The six slots, Amber to Steel, entry i in FEATURED_INKS[i]'s place. */
export function slotsOf(entries: readonly FeaturedEntry[], cardById: CardById): FeaturedSlot[] {
  return entries.map(({id, card}, i) => ({ink: FEATURED_INKS[i], id, label: card, card: cardById(id)}));
}

/** The inks a line names before its colon, "Amethyst-Sapphire: …" naming two. */
function labelInks(label: string): string[] {
  const colon = label.indexOf(':');
  return colon === -1 ? [] : label.slice(0, colon).split('-');
}

/** A slot's inks: its card's, else its line's. */
const slotInks = (slot: FeaturedSlot): readonly string[] => (slot.card ? getInks(slot.card) : labelInks(slot.label));

/** Why a slot's card can't be featured, or null: the card list lacks it, it has no art, or another slot holds it. */
export function slotProblem(slot: FeaturedSlot, slots: readonly FeaturedSlot[]): string | null {
  if (!slot.card) return 'The card list doesn’t hold this card.';
  // The homepage's pickFeatured skips a card without art, so the row would show five.
  if (!slot.card.imageUrl) return 'This card has no art, so the homepage would skip it.';
  const holder = slots.find((other) => other !== slot && other.id === slot.id);
  return holder ? `The ${holder.ink} slot holds this card too.` : null;
}

/**
 * Why the six can't be saved, or null: a slot's own problem first, then the
 * app's rule for the list (featuredListProblem: six different cards that carry
 * every ink between them), so admin refuses what graduation refuses.
 */
export function featuredProblem(slots: readonly FeaturedSlot[]): string | null {
  for (const slot of slots) {
    const problem = slotProblem(slot, slots);
    if (problem) return `${slot.ink}: ${problem}`;
  }
  const listProblem = featuredListProblem(slots.map((slot) => ({id: slot.id, inks: slotInks(slot)})));
  return listProblem && `Can’t save: ${listProblem}.`;
}

/** How many cards a slot's search lists at once. */
export const SEARCH_LIMIT = 40;

/**
 * The cards a slot may take, the first SEARCH_LIMIT matching `query` (filterCards): those that carry
 * its ink, a dual-ink card under both of its inks, and have art.
 */
export function candidatesFor(ink: Ink, cards: readonly LorcanaCard[], query: string): LorcanaCard[] {
  const offered = cards.filter((card) => Boolean(card.imageUrl) && getInks(card).includes(ink));
  return filterCards(offered, query, SEARCH_LIMIT);
}

/** The file's six lines: each card's own, or the file's line for a card the card list lacks. */
export function entriesOf(slots: readonly FeaturedSlot[]): FeaturedEntry[] {
  return slots.map(({id, label, card}) =>
    card ? featuredEntry({id, inks: getInks(card), fullName: card.fullName}) : {id, card: label},
  );
}

/** The slots whose card differs between two lists of six, each with its line before and after. */
export function changedSlots(before: readonly FeaturedEntry[], after: readonly FeaturedEntry[]): SlotChange[] {
  return after.flatMap((to, i) => (before[i]?.id === to.id ? [] : [{ink: FEATURED_INKS[i], from: before[i], to}]));
}
