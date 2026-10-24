import {fmtInt} from '../../ui/format';

/** What Edit card's search status line reads from (EditSearch). */
export interface SearchStatusState {
  /** The text in the search field. */
  query: string;
  /** The rows on screen: searchCards' rows.length, at most SEARCH_LIMIT. */
  shown: number;
  /** Every match: searchCards' total; for a blank query, every card. */
  total: number;
  /** The card list's state (useCardDataContext), and whether Sets 1 to 8 are still being read (#74). */
  list: {loading: boolean; failed: boolean; setsLoading: boolean};
}

/** "1,228 cards", "1 card matches", "45 cards match". */
function countLine({query, total}: Pick<SearchStatusState, 'query' | 'total'>): string {
  const cards = `${fmtInt(total)} ${total === 1 ? 'card' : 'cards'}`;
  if (query.trim() === '') return cards;
  return `${cards} ${total === 1 ? 'matches' : 'match'}`;
}

/** A typed query that matches nothing. While Sets 1 to 8 are still read, it may match once they are in (#74). */
function noMatchLine({query, setsLoading}: {query: string; setsLoading: boolean}): string {
  return setsLoading ? `No cards match "${query}" yet: Sets 1 to 8 are still loading.` : `No cards match "${query}".`;
}

/**
 * The search's polite status line (R4-5f), which EditSearch keeps mounted so
 * every change is announced, as R3's switcher announces "No cards match."
 * (R-30). It counts the cards, or the matches for a typed query, and says when
 * the list shows only the first SEARCH_LIMIT. While the card list loads it says
 * so; after it failed it says nothing, since the error is an alert of its own.
 * A miss while Sets 1 to 8 are still read says they are, so it isn't taken as
 * final (#74).
 */
export function searchStatus(state: SearchStatusState): string {
  if (state.list.failed) return '';
  if (state.list.loading) return 'Loading cards…';
  const query = state.query.trim();
  if (query !== '' && state.total === 0) return noMatchLine({query, setsLoading: state.list.setsLoading});
  const count = countLine(state);
  return state.shown < state.total ? `${count} · showing the first ${fmtInt(state.shown)}` : count;
}
