import {NO_MATCH, cardLabel, switcherStatus, type SwitcherState} from '../cardSearch';
import {SWITCHER_CARDS} from '../cardFixtures';

describe('cardLabel', () => {
  it.each([
    {card: {name: 'Mickey Mouse', version: 'Brave Little Tailor'}, label: 'Mickey Mouse · Brave Little Tailor'},
    // Actions, items and songs have no version: no dangling separator.
    {card: {name: 'Magic Mirror'}, label: 'Magic Mirror'},
  ])('reads "$label"', ({card, label}) => {
    expect(cardLabel(card)).toBe(label);
  });
});

describe('switcherStatus', () => {
  // The field has focus, its list is closed, and "zq" finds no card.
  const NO_CARD_FOUND: SwitcherState = {cards: SWITCHER_CARDS, query: 'zq', listOpen: false, focused: true};

  it('says "No cards match." when the typed text finds no card', () => {
    expect(switcherStatus(NO_CARD_FOUND)).toBe(NO_MATCH);
    expect(NO_MATCH).toBe('No cards match.');
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
