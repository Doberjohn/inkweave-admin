import {describe, expect, it} from 'vitest';
import {searchStatus, type SearchStatusState} from '../searchStatus';

const READY = {loading: false, failed: false};

describe('searchStatus', () => {
  it.each<[string, Omit<SearchStatusState, 'list'>, string]>([
    ['counts every card for a blank query, with its cap', {query: '', shown: 40, total: 1228}, '1,228 cards · showing the first 40'],
    ['counts the matches for a typed query', {query: 'elsa', shown: 7, total: 7}, '7 cards match'],
    ['says when the matches pass the cap', {query: 'a', shown: 40, total: 45}, '45 cards match · showing the first 40'],
    ['reads one match in the singular', {query: 'mei', shown: 1, total: 1}, '1 card matches'],
    ['reads one card in the singular', {query: ' ', shown: 1, total: 1}, '1 card'],
    ['names the trimmed query that finds nothing', {query: ' zzz ', shown: 0, total: 0}, 'No cards match "zzz".'],
    ['counts an empty card list as no cards, not as a miss', {query: '', shown: 0, total: 0}, '0 cards'],
  ])('%s', (_, search, expected) => {
    expect(searchStatus({...search, list: READY})).toBe(expected);
  });

  it('says the card list is loading, whatever the query', () => {
    expect(searchStatus({query: 'elsa', shown: 0, total: 0, list: {loading: true, failed: false}})).toBe('Loading cards…');
  });

  it("says nothing once the card list failed: the error is an alert of its own", () => {
    expect(searchStatus({query: '', shown: 0, total: 0, list: {loading: false, failed: true}})).toBe('');
  });
});
