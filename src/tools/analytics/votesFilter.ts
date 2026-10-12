import {useSyncExternalStore} from 'react';
import type {PairStat} from './voteAnalyticsTypes';

/**
 * One step of the votes filter (#33, R-25): the fewest score votes a pair
 * needs to stay in view. Most voted pairs rest on a single score vote, so one
 * pair's gap is noisy, and every step past Any keeps only pairs with more.
 */
export interface VotesFilter {
  /** The control's value. */
  id: 'any' | '2' | '5';
  /** The control's label: "Any", "2+" or "5+". */
  label: string;
  /** pairs[] holds only pairs with a score vote, so Any's 1 keeps every one. */
  minVotes: number;
}

/** The default: every voted pair, as the pages read before the filter. */
export const ANY_VOTES: VotesFilter = {id: 'any', label: 'Any', minVotes: 1};

/** R-25's steps, in the control's order. */
export const VOTES_FILTERS: readonly VotesFilter[] = [
  ANY_VOTES,
  {id: '2', label: '2+', minVotes: 2},
  {id: '5', label: '5+', minVotes: 5},
];

/** The step a control value names; Any for a value no step has. */
export function votesFilterById(id: VotesFilter['id']): VotesFilter {
  return VOTES_FILTERS.find((filter) => filter.id === id) ?? ANY_VOTES;
}

/*
 * The filter is one setting for the whole tab, as the owner chose for #33:
 * /calibration and /cards read the same store, so a step set on one page holds
 * on the other. It lives in memory only, so a reload puts it back to Any, the
 * issue's "off by default".
 */
const listeners = new Set<() => void>();
let current: VotesFilter = ANY_VOTES;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The store's snapshot: one of VOTES_FILTERS, so React re-renders only when the step changes. */
function snapshot(): VotesFilter {
  return current;
}

/**
 * Sets the step for every page that reads it: the control's onChange, through
 * useVotesFilter, or a story's beforeEach. Module-level, so every caller gets
 * the same function.
 */
export function setVotesFilter(next: VotesFilter): void {
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener();
}

/**
 * Puts the filter back to Any, as a reload does: src/test/setup.ts calls it
 * before every test and .storybook/preview.tsx before every story, so none
 * opens on another's step.
 */
export function resetVotesFilter(): void {
  setVotesFilter(ANY_VOTES);
}

export interface UseVotesFilter {
  filter: VotesFilter;
  setFilter: (next: VotesFilter) => void;
}

/** The shared votes filter, and its setter. */
export function useVotesFilter(): UseVotesFilter {
  return {filter: useSyncExternalStore(subscribe, snapshot), setFilter: setVotesFilter};
}

/** Whether the step leaves pairs out: every step but Any. */
export function filtersPairs(filter: VotesFilter): boolean {
  return filter.minVotes > 1;
}

/** The pairs the step keeps, in their order. A card's pairs (CardPair) come back as they went in. */
export function pairsWithVotes<T extends Pick<PairStat, 'scoreVotes'>>(pairs: readonly T[], filter: VotesFilter): T[] {
  return pairs.filter((pair) => pair.scoreVotes >= filter.minVotes);
}

/** What a step past Any keeps, in words: "pairs with 2+ score votes". */
export function votesClause(filter: VotesFilter): string {
  return `pairs with ${filter.label} score votes`;
}

/**
 * The line a filtered pair list carries in place of its single-vote caveat,
 * so the list says the filter is on; undefined at Any.
 */
export function filterNote(filter: VotesFilter): string | undefined {
  return filtersPairs(filter) ? `The Votes filter is on: only ${votesClause(filter)} show.` : undefined;
}
