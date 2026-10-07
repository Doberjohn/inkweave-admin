import {describe, expect, it} from 'vitest';
import {lorcanaCard} from '../cardFixtures';
import {cardPageState, type CardPageState, type CardRoute} from '../cardPageState';

const ELSA = lorcanaCard({id: '2983', name: 'Elsa', version: 'Snow Queen', ink: 'Sapphire'});
const FAILED = new Error('HTTP 503');

/** The route at `cardId`, over a loaded list that holds Elsa alone; `over` sets the rest. */
function route(over: Partial<CardRoute>): CardRoute {
  return {
    cardId: undefined,
    isLoading: false,
    error: null,
    getCardById: (id) => (id === ELSA.id ? ELSA : undefined),
    ...over,
  };
}

describe('cardPageState', () => {
  it.each<[string, Partial<CardRoute>, CardPageState]>([
    // The switcher searches the card list, so after a failure the prompt has nothing to offer.
    ['a failed list, on bare /cards', {error: FAILED}, {kind: 'failed', error: FAILED}],
    ['a failed list, over a card the lookup finds', {cardId: '2983', error: FAILED}, {kind: 'failed', error: FAILED}],
    ['no id, while the list loads', {isLoading: true}, {kind: 'pick'}],
    ['an empty id', {cardId: ''}, {kind: 'pick'}],
    ['an id, while the list loads', {cardId: '2983', isLoading: true}, {kind: 'loading'}],
    ['an id the list holds', {cardId: '2983'}, {kind: 'card', card: ELSA}],
    ['an id the list lacks', {cardId: '999999'}, {kind: 'unknown', cardId: '999999'}],
  ])('reads %s', (_case, over, expected) => {
    expect(cardPageState(route(over))).toEqual(expected);
  });
});
