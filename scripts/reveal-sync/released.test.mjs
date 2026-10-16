// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {transformRawCards} from '../../src/app-bridge.ts';
import {REVEAL_ID_BASE, REVEAL_SET_CODE} from '../../src/tools/reveal/constants.ts';
import {releasedRevealNumbers} from '../../src/tools/reveal/releasedNumbers.ts';
import {UsageError} from './cli.mjs';
import {parseCardLines} from './extract-card.mjs';
import {existingVerdict} from './gates.mjs';
import {assertReleasedRead, heldCards, releasedRecords} from './released.mjs';
import {LIONHEART, page} from './__fixtures__/cards.mjs';

// Set 14's #147, released under its official id since graduation (Doberjohn/inkweave#780).
const RELEASED_LIONHEART = {number: 147, id: 3412, fullName: 'Lionheart - Cleaning Up the City'};

/** A raw allCards.json card of the pinned reveal set, with what the app's loader needs. */
function rawCard({fullName, ...card}) {
  const [name, version] = fullName.split(' - ');
  return {name, version, fullName, cost: 1, color: 'Amber', inkwell: true, type: 'Character', setCode: REVEAL_SET_CODE, ...card};
}

describe('releasedRecords', () => {
  const chain = {transformRawCards, releasedRevealNumbers};

  it('keeps each number a released card of the reveal set holds, by number', () => {
    const cards = [
      rawCard({id: 3412, fullName: RELEASED_LIONHEART.fullName, number: 147}),
      rawCard({id: 3286, fullName: 'Miguel Rivera - Street Musician', number: 21}),
      // Not released cards of the set: one under a preview id, one of another set, one with no number.
      rawCard({id: REVEAL_ID_BASE + 24, fullName: 'Judy Hopps - Always Vigilant', number: 24}),
      rawCard({id: 1937, fullName: 'The Queen - Conceited Ruler', setCode: '9', number: 1}),
      rawCard({id: 3470, fullName: 'Test Captain - Harbor Watch'}),
    ];
    expect(releasedRecords(cards, chain)).toEqual([
      {number: 21, id: 3286, fullName: 'Miguel Rivera - Street Musician'},
      RELEASED_LIONHEART,
    ]);
  });
});

describe('heldCards', () => {
  const lionheart = () => parseCardLines(page(LIONHEART), {slug: LIONHEART.slug, imageFile: LIONHEART.imageFile});

  it('knows a released card the site shows under its own number and name, with no preview card', () => {
    expect(existingVerdict(lionheart(), heldCards([], [RELEASED_LIONHEART]))).toEqual({status: 'known'});
  });

  it('flags another name on a number a released card holds', () => {
    const held = heldCards([], [{...RELEASED_LIONHEART, fullName: 'Bellwether - Super Capable'}]);
    expect(existingVerdict(lionheart(), held)).toMatchObject({
      status: 'conflict',
      reason: 'number-taken',
      detail: '#147 is already in Inkweave as "Bellwether - Super Capable" (3412)',
    });
  });

  it('keeps the preview cards first, and gives the released ones their shape', () => {
    const preview = {id: 14009, number: 9, name: 'Test Chloe - Cafe Owner'};
    expect(heldCards([preview], [RELEASED_LIONHEART])).toEqual([
      preview,
      {id: 3412, number: 147, name: 'Lionheart - Cleaning Up the City'},
    ]);
  });
});

describe('assertReleasedRead', () => {
  it('refuses a run opened before the check, naming the issue', () => {
    const refuse = () => assertReleasedRead({runId: '20261010-101500', official: {revealed: 120}, cards: {}});
    expect(refuse).toThrow(UsageError);
    expect(refuse).toThrow(/^run 20261010-101500 was opened before .*Doberjohn\/inkweave-admin#51.*Start a new run\.$/);
  });

  it('lets a run go on when no card of its set is released yet', () => {
    expect(() => assertReleasedRead({runId: '20261016-101500', released: []})).not.toThrow();
  });
});
