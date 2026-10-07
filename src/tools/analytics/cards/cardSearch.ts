import type {LorcanaCard} from 'inkweave-synergy-engine';
import {searchCardsByName} from '../../../app-bridge';

/**
 * The switcher searches from two letters: useAutocomplete's own default,
 * passed to it explicitly so its list and the status below agree.
 */
export const MIN_QUERY = 2;

/** The switcher's status when a query finds no card (R-30, the handoff's words). */
export const NO_MATCH = 'No cards match.';

/**
 * A switcher row's text, as the handoff writes it: "Mickey Mouse · Brave
 * Little Tailor", or the bare name for a card with no version (actions, items
 * and songs have none).
 */
export function cardLabel({name, version}: Pick<LorcanaCard, 'name' | 'version'>): string {
  return version ? `${name} · ${version}` : name;
}

/** What the switcher's status reads from: its cards, and the hook's state. */
export interface SwitcherState {
  /** Every card the switcher can open. Empty while the card list loads, or after it failed. */
  cards: LorcanaCard[];
  /** The text in the field, ahead of the hook's 150 ms debounce. */
  query: string;
  /** useAutocomplete's isOpen. */
  listOpen: boolean;
  /** useAutocomplete's isFocused: the field has focus, or lost it under 150 ms ago. */
  focused: boolean;
}

/**
 * The switcher's polite status (R-30): "No cards match." while the field has
 * focus, its list is closed and the typed text finds no card, and '' the rest
 * of the time. It runs the hook's own search, searchCardsByName, on the live
 * text rather than the debounced one, so it never shows during the 150 ms the
 * list takes to catch up. With no cards loaded nothing was searched, so it
 * says nothing.
 */
export function switcherStatus({cards, query, listOpen, focused}: SwitcherState): string {
  // Out of sight: the field has no focus, or its list shows the last results.
  if (!focused || listOpen) return '';
  // Nothing searched: no cards to search, or under two letters.
  if (cards.length === 0 || query.length < MIN_QUERY) return '';
  return searchCardsByName(cards, query).length === 0 ? NO_MATCH : '';
}
