import {describe, expect, it, vi} from 'vitest';
import {act, renderHook} from '@testing-library/react';
import {
  ANY_VOTES,
  VOTES_FILTERS,
  filterNote,
  filtersPairs,
  pairsWithVotes,
  useVotesFilter,
  votesClause,
  votesFilterById,
  type VotesFilter,
} from '../votesFilter';

const [, TWO_PLUS, FIVE_PLUS] = VOTES_FILTERS;

/** Pairs with these score votes, named by their count. */
const pairsWith = (...votes: number[]) => votes.map((scoreVotes) => ({id: `votes-${scoreVotes}`, scoreVotes}));

describe('votesFilter', () => {
  it("offers R-25's steps, Any first", () => {
    expect(VOTES_FILTERS.map((filter) => filter.label)).toEqual(['Any', '2+', '5+']);
    expect(VOTES_FILTERS.map((filter) => filter.minVotes)).toEqual([1, 2, 5]);
  });

  it('finds a step by its control value, and Any for a value no step has', () => {
    expect(votesFilterById('2')).toBe(TWO_PLUS);
    expect(votesFilterById('5')).toBe(FIVE_PLUS);
    expect(votesFilterById('9' as VotesFilter['id'])).toBe(ANY_VOTES);
  });

  it('leaves pairs out at every step but Any', () => {
    expect(VOTES_FILTERS.map(filtersPairs)).toEqual([false, true, true]);
  });

  it('keeps the pairs with at least the step’s score votes, in their order', () => {
    const pairs = pairsWith(6, 1, 2, 5, 4);
    expect(pairsWithVotes(pairs, ANY_VOTES)).toEqual(pairs);
    expect(pairsWithVotes(pairs, TWO_PLUS).map((pair) => pair.scoreVotes)).toEqual([6, 2, 5, 4]);
    expect(pairsWithVotes(pairs, FIVE_PLUS).map((pair) => pair.scoreVotes)).toEqual([6, 5]);
  });

  it('words what a step keeps, and says the filter is on only past Any', () => {
    expect(votesClause(TWO_PLUS)).toBe('pairs with 2+ score votes');
    expect(filterNote(FIVE_PLUS)).toBe('The Votes filter is on: only pairs with 5+ score votes show.');
    expect(filterNote(ANY_VOTES)).toBeUndefined();
  });
});

describe('useVotesFilter', () => {
  it('starts at Any, the issue’s "off by default"', () => {
    const {result} = renderHook(() => useVotesFilter());
    expect(result.current.filter).toBe(ANY_VOTES);
  });

  it('is one setting: a step set through one reader shows in every other', () => {
    const calibration = renderHook(() => useVotesFilter());
    const cards = renderHook(() => useVotesFilter());
    act(() => calibration.result.current.setFilter(TWO_PLUS));
    expect(cards.result.current.filter).toBe(TWO_PLUS);
  });

  it('holds the step for a reader that mounts later, as the next page does', () => {
    const first = renderHook(() => useVotesFilter());
    act(() => first.result.current.setFilter(FIVE_PLUS));
    first.unmount();
    expect(renderHook(() => useVotesFilter()).result.current.filter).toBe(FIVE_PLUS);
  });

  it('keeps the step in memory only, so a reload puts it back to Any', async () => {
    localStorage.clear();
    sessionStorage.clear();
    const {result} = renderHook(() => useVotesFilter());
    act(() => result.current.setFilter(TWO_PLUS));
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    // A reload runs the module afresh: setup.ts's reset never reaches this copy, so it shows the store's own start.
    vi.resetModules();
    const reloaded = await import('../votesFilter');
    expect(renderHook(() => reloaded.useVotesFilter()).result.current.filter).toEqual(ANY_VOTES);
    expect(result.current.filter).toBe(TWO_PLUS);
  });
});
