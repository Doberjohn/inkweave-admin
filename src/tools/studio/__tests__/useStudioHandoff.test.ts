import {describe, expect, it} from 'vitest';
import {asksForFocus, type StudioWatch} from '../useStudioHandoff';

// What the handoff watches, before and after a move: a card, another card, none, a failed card list, and New card.
const CARD: StudioWatch = {mode: 'edit', cardId: '14031', failed: false};
const OTHER: StudioWatch = {mode: 'edit', cardId: '14032', failed: false};
const SEARCH: StudioWatch = {mode: 'edit', cardId: null, failed: false};
const FAILED: StudioWatch = {mode: 'edit', cardId: '14031', failed: true};
const NEW_CARD: StudioWatch = {mode: 'new', cardId: null, failed: false};

describe('asksForFocus (R-59)', () => {
  it.each<{move: string; before: StudioWatch; now: StudioWatch; replaced?: boolean; asks: boolean}>([
    {move: 'another card, by a link or Back', before: CARD, now: OTHER, asks: true},
    {move: 'a first card, from the search', before: SEARCH, now: CARD, asks: true},
    {move: 'the search, from Load a different card', before: CARD, now: SEARCH, asks: true},
    {move: 'the card list recovering on Retry', before: FAILED, now: CARD, asks: true},
    {move: 'another card by a redirect', before: SEARCH, now: CARD, replaced: true, asks: false},
    {move: 'Edit card, from New card (Edit a card instead, or the switch)', before: NEW_CARD, now: SEARCH, asks: true},
    {move: 'New card, from Edit card', before: SEARCH, now: NEW_CARD, asks: true},
    {move: 'another mode by a redirect', before: NEW_CARD, now: SEARCH, replaced: true, asks: false},
    {move: 'the same mode and card, as a render with nothing new', before: CARD, now: CARD, asks: false},
    {move: 'the card list failing', before: CARD, now: FAILED, asks: false},
  ])('asks for $move: $asks', ({before, now, replaced = false, asks}) => {
    expect(asksForFocus(before, {...now, replaced})).toBe(asks);
  });
});
