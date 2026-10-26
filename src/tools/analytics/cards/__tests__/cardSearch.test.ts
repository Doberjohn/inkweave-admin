import {suggestCardsByName} from '../../../../app-bridge';
import {NO_MATCH, cardLabel, openedStatus, switcherStatus, type SwitcherState} from '../cardSearch';
import {SWITCHER_CARDS} from '../cardFixtures';

// The real search, which one case swaps for a single call.
vi.mock('../../../../app-bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../app-bridge')>();
  return {...actual, suggestCardsByName: vi.fn(actual.suggestCardsByName)};
});

describe('cardLabel', () => {
  it.each([
    {card: {name: 'Mickey Mouse', version: 'Brave Little Tailor'}, label: 'Mickey Mouse · Brave Little Tailor'},
    // Actions, items and songs have no version: no dangling separator.
    {card: {name: 'Magic Mirror'}, label: 'Magic Mirror'},
  ])('reads "$label"', ({card, label}) => {
    expect(cardLabel(card)).toBe(label);
  });
});

describe('openedStatus', () => {
  it('names the card a pick opened as its row does', () => {
    expect(openedStatus({name: 'Mickey Mouse', version: 'Brave Little Tailor'})).toBe(
      'Opened Mickey Mouse · Brave Little Tailor.',
    );
    expect(openedStatus({name: 'Magic Mirror'})).toBe('Opened Magic Mirror.');
  });
});

describe('switcherStatus', () => {
  // The field has focus, its list is closed, and "zq" finds no card.
  const NO_CARD_FOUND: SwitcherState = {cards: SWITCHER_CARDS, query: 'zq', listOpen: false, focused: true};

  it('says "No cards match." when the typed text finds no card', () => {
    expect(switcherStatus(NO_CARD_FOUND)).toBe(NO_MATCH);
    expect(NO_MATCH).toBe('No cards match.');
  });

  it("runs the list's search, so it never says no card matches beside a list of them", () => {
    // "mi" finds cards, unless the list's search finds none: then the status agrees with the list.
    vi.mocked(suggestCardsByName).mockReturnValueOnce([]);
    expect(switcherStatus({...NO_CARD_FOUND, query: 'mi'})).toBe(NO_MATCH);
  });

  it.each<[string, Partial<SwitcherState>]>([
    ['the text finds a card', {query: 'mi'}],
    // Found in the version, as the app's search does.
    ['the text finds a version', {query: 'sorcerer'}],
    ['one letter has been typed', {query: 'z'}],
    ['the list is still open on the last match', {listOpen: true}],
    ['the field has lost focus', {focused: false}],
    ['no cards have loaded', {cards: []}],
  ])('says nothing when %s', (_, change) => {
    expect(switcherStatus({...NO_CARD_FOUND, ...change})).toBe('');
  });
});
