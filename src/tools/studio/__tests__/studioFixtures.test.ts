import {describe, expect, it} from 'vitest';
import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import {REVEAL_ID_BASE, REVEAL_SET_CODE} from '../../../app-bridge';
import {
  CURLY_APOSTROPHE_CARD,
  DUAL_INK_ENTRY,
  JA_SCAN_ENTRY,
  NAMED_ABILITY_ENTRY,
  OTHER_SET_ENTRY,
  PREVIEW_ENTRY,
  RELEASED_CARD,
  UNLISTED_SCAN_ENTRY,
  UNNUMBERED_ENTRY,
  VARIANTS_ENTRY,
  cardOf,
  previewFileText,
} from '../studioFixtures';

const NUMBERED = [PREVIEW_ENTRY, DUAL_INK_ENTRY, VARIANTS_ENTRY, JA_SCAN_ENTRY, UNLISTED_SCAN_ENTRY, NAMED_ABILITY_ENTRY];

describe('studioFixtures', () => {
  it('lays a file out as the app writes it, so it round-trips', () => {
    const text = previewFileText(NUMBERED);
    const parsed = JSON.parse(text) as {cards: LorcanaJSONCard[]};
    expect(JSON.stringify(parsed, null, 2) + '\n').toBe(text);
    expect(parsed.cards).toEqual(NUMBERED);
  });

  it('gives each named entry its own id, a numbered one the reveal base plus its number', () => {
    expect(NUMBERED.map((entry) => entry.id - REVEAL_ID_BASE)).toEqual(NUMBERED.map((entry) => entry.number));
    expect(new Set([...NUMBERED, UNNUMBERED_ENTRY, OTHER_SET_ENTRY].map((entry) => entry.id)).size).toBe(NUMBERED.length + 2);
  });

  it("builds the card list's cards", () => {
    expect(cardOf(DUAL_INK_ENTRY)).toMatchObject({
      id: String(DUAL_INK_ENTRY.id),
      fullName: 'Priya - Panda Fan',
      ink: 'Ruby',
      ink2: 'Sapphire',
      setCode: REVEAL_SET_CODE,
    });
    expect(RELEASED_CARD).toMatchObject({fullName: 'Lantern Keeper - Night Watch', setCode: '9'});
    expect(CURLY_APOSTROPHE_CARD.fullName).toBe('Peter Pan’s Shadow - Elusive Prankster');
  });
});
