import {describe, expect, it} from 'vitest';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {
  NO_IMAGE,
  fileDescription,
  frameState,
  hasPreview,
  pillCaption,
  stagedNote,
  type FrameState,
  type ImageSlot,
} from '../cardPanel';
import {PANEL_CARD} from '../studioFixtures';

const STAGED = {name: 'mei.png', error: null};
const FAILED = {name: 'mei.png', error: 'mei.png holds a JPEG image; rename it to end in .jpg.'};
/** A fresh New card form's card: Amber, a Character, no name and no art. */
const FRESH: LorcanaCard = {...PANEL_CARD, name: '', fullName: '', version: undefined};

interface Words {
  pill: string;
  note: string | null;
  frame: FrameState;
}

describe('the card panel words', () => {
  it.each<{label: string; slot: ImageSlot; expected: Words}>([
    {label: 'New, nothing chosen', slot: {mode: 'new', staged: NO_IMAGE}, expected: {pill: 'Click or drop to upload scan', note: null, frame: 'empty'}},
    {
      label: 'New, a scan staged',
      slot: {mode: 'new', staged: STAGED},
      expected: {pill: 'Click or drop to change scan', note: "Scan staged (mei.png). It's published with the card.", frame: 'staged'},
    },
    {
      label: 'New, a file that failed its check',
      slot: {mode: 'new', staged: FAILED},
      expected: {pill: 'Click or drop to change scan', note: null, frame: 'empty'},
    },
    {
      label: 'Edit, the art as it stands',
      slot: {mode: 'edit', staged: NO_IMAGE},
      expected: {pill: 'Click or drop to replace image', note: null, frame: 'current'},
    },
    {
      label: 'Edit, an image staged',
      slot: {mode: 'edit', staged: STAGED},
      expected: {
        pill: 'Click or drop to replace image',
        note: 'New image staged (mei.png). It replaces the current art when you save.',
        frame: 'staged',
      },
    },
    {
      label: 'Edit, a file that failed its check',
      slot: {mode: 'edit', staged: FAILED},
      expected: {pill: 'Click or drop to replace image', note: null, frame: 'current'},
    },
  ])('$label', ({slot, expected}) => {
    expect({pill: pillCaption(slot), note: stagedNote(slot), frame: frameState(slot)}).toEqual(expected);
  });
});

describe('hasPreview', () => {
  it.each<{label: string; card: LorcanaCard | null; expected: boolean}>([
    {label: 'no card', card: null, expected: false},
    {label: "a fresh form's card", card: FRESH, expected: false},
    {label: 'a named card with no art yet', card: PANEL_CARD, expected: true},
    {label: 'a scan chosen before the name', card: {...FRESH, imageUrl: 'data:image/png;base64,'}, expected: true},
  ])('$label: $expected', ({card, expected}) => {
    expect(hasPreview(card)).toBe(expected);
  });
});

describe('fileDescription', () => {
  const ids = {hint: 'hint', error: 'error'};

  it('is the formats alone, then the error first while there is one', () => {
    expect([fileDescription({ids, error: null}), fileDescription({ids, error: 'Bad file'})]).toEqual(['hint', 'error hint']);
  });
});
