import {describe, expect, it} from 'vitest';
import {REVEAL_ID_BASE, REVEAL_SET_CODE} from '../constants';
import {releasedRevealNumbers} from '../releasedNumbers';
import {studioCard} from '../../studio/studioFixtures';

// Graduation gives a reveal-set card its official id: #21 became 3286 (Doberjohn/inkweave#780).
const MIGUEL = studioCard({
  id: '3286',
  name: 'Miguel Rivera',
  version: 'Street Musician',
  setCode: REVEAL_SET_CODE,
  setNumber: 21,
});

describe('releasedRevealNumbers', () => {
  it("maps a released reveal-set card's number to its id and full name", () => {
    expect(releasedRevealNumbers([MIGUEL]).get(21)).toEqual({id: 3286, fullName: 'Miguel Rivera - Street Musician'});
  });

  it('leaves out a preview card, whose id is in the reveal band', () => {
    const preview = {...MIGUEL, id: String(REVEAL_ID_BASE + 21)};
    expect(releasedRevealNumbers([preview]).size).toBe(0);
  });

  it("leaves out another set's card with the same number", () => {
    expect(releasedRevealNumbers([{...MIGUEL, setCode: '9'}]).size).toBe(0);
  });

  it('skips a card with no collector number', () => {
    expect(releasedRevealNumbers([{...MIGUEL, setNumber: undefined}]).size).toBe(0);
  });
});
