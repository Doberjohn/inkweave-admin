import {describe, expect, it} from 'vitest';
import {GOLIATH, SIX, featuredFileText} from '../../featured/featuredFixtures';
import {diffFeatured} from '../featuredDiff';

describe('diffFeatured', () => {
  it('names each changed slot by its ink, with the card before and after', () => {
    const before = featuredFileText([SIX[0], GOLIATH, ...SIX.slice(2)]);
    expect(diffFeatured({before, after: featuredFileText()})).toEqual([
      {slot: 'Amethyst', from: {id: '3318', name: 'Goliath - Transformed Warrior'}, to: {id: '3328', name: 'Un Poco Loco'}},
    ]);
  });

  it('lists every slot of a file the commit added', () => {
    const changes = diffFeatured({before: null, after: featuredFileText()});
    expect(changes.map((change) => [change.slot, change.from])).toEqual(
      ['Amber', 'Amethyst', 'Emerald', 'Ruby', 'Sapphire', 'Steel'].map((ink) => [ink, null]),
    );
  });

  it('lists nothing when only a line’s name changed', () => {
    const renamed = featuredFileText().replace('Un Poco Loco', 'Un Poco Loco!');
    expect(diffFeatured({before: featuredFileText(), after: renamed})).toEqual([]);
  });

  it('throws for a side that isn’t JSON, so the file is listed as not itemized', () => {
    expect(() => diffFeatured({before: 'not json', after: featuredFileText()})).toThrow();
  });
});
