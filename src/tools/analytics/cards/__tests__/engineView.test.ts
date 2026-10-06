import {describe, expect, it} from 'vitest';
import {TIER_COLORS, getStrengthTier} from '../../../../app-bridge';
import {
  ENGINE_CAPPED,
  ENGINE_EMPTY,
  ENGINE_FIFTEEN,
  ENGINE_ONE_PARTNER,
  engineFixture,
  type EngineFixture,
} from '../cardFixtures';
import {
  ENGINE_GROUP_CAP,
  TIER_COLOR,
  TIER_ORDER,
  TIER_SERIES,
  enginePartners,
  engineSummary,
  tieAtCut,
} from '../engineView';

const partnersOf = ({data, nameOf}: EngineFixture) => enginePartners(data, nameOf);

describe('enginePartners', () => {
  it('lists every partner once, with its name, score, tier and the rules behind the pair', () => {
    const partners = partnersOf(ENGINE_FIFTEEN);
    expect(partners).toHaveLength(15);
    expect(partners[0]).toEqual({
      id: '301',
      name: 'Wren Ashdown - Keeper of Keys',
      score: 10,
      tier: 'Perfect',
      ruleNames: ['Shift Targets', 'Ramp'],
    });
  });

  it('orders by score, then name, so the cut at 12 inside a tie keeps the names that come first', () => {
    expect(partnersOf(ENGINE_FIFTEEN).map((partner) => partner.id)).toEqual([
      '301',
      '303',
      '302',
      '305',
      '304',
      '307',
      '311',
      '310',
      '312',
      '309',
      '308',
      '313',
      '306',
      '314',
      '315',
    ]);
  });

  it('breaks a tie on score and name by id, in code-unit order', () => {
    const twins = engineFixture([
      {id: '9', name: 'Pell - Tinker', score: 8},
      {id: '10', name: 'Pell - Tinker', score: 8},
      {id: '2', name: 'Ada - Tidecaller', score: 8},
    ]);
    expect(partnersOf(twins).map((partner) => partner.id)).toEqual(['2', '10', '9']);
  });

  it('names a partner by the lookup it is given', () => {
    expect(enginePartners(ENGINE_ONE_PARTNER.data, (id) => `#${id}`)[0].name).toBe('#401');
  });

  it("keeps the file's rule order: the engine keeps one connection per rule, strongest first", () => {
    const rules = ['Singer', 'Ramp', 'Shift Targets'];
    const [partner] = partnersOf(engineFixture([{id: '1', name: 'A', score: 9, rules}]));
    expect(partner.ruleNames).toEqual(rules);
  });

  it.each([
    [10, 'Perfect'],
    [9.5, 'Perfect'],
    [9.49, 'Strong'],
    [7, 'Strong'],
    [6.99, 'Moderate'],
    [4, 'Moderate'],
    [3.99, 'Weak'],
  ])("tiers a pair scoring %s as %s, getStrengthTier's label", (score, tier) => {
    expect(partnersOf(engineFixture([{id: '1', name: 'A', score}]))[0].tier).toBe(tier);
  });

  it('gives no partners for an empty file', () => {
    expect(partnersOf(ENGINE_EMPTY)).toEqual([]);
  });
});

describe('engineSummary', () => {
  const summaryOf = (fixture: EngineFixture) => engineSummary(partnersOf(fixture), fixture.data.groups);

  it('counts a partner in two groups once, and counts every tier', () => {
    expect(ENGINE_FIFTEEN.data.groups.flatMap((group) => group.synergies)).toHaveLength(16);
    expect(summaryOf(ENGINE_FIFTEEN)).toEqual({
      partners: 15,
      capped: false,
      tiers: {Perfect: 1, Strong: 12, Moderate: 1, Weak: 1},
    });
  });

  it('is capped once a group lists ENGINE_GROUP_CAP partners, and not one short of it', () => {
    expect(ENGINE_GROUP_CAP).toBe(100);
    expect(summaryOf(ENGINE_CAPPED)).toMatchObject({partners: 142, capped: true});
    const underCap = engineFixture(
      Array.from({length: ENGINE_GROUP_CAP - 1}, (_, i) => ({id: String(i + 1), name: `Card ${i + 1}`, score: 6})),
    );
    expect(summaryOf(underCap)).toMatchObject({partners: 99, capped: false});
  });

  it('gives 0 partners and no tiers for an empty file', () => {
    expect(summaryOf(ENGINE_EMPTY)).toEqual({
      partners: 0,
      capped: false,
      tiers: {Perfect: 0, Strong: 0, Moderate: 0, Weak: 0},
    });
  });
});

describe('tieAtCut', () => {
  it('counts the tie that the cut splits: 7 of the 8 partners at 7 make the 12', () => {
    expect(tieAtCut(partnersOf(ENGINE_FIFTEEN), 12)).toEqual({score: 7, drawn: 7, tied: 8});
  });

  it('counts a tie that holds every drawn partner', () => {
    expect(tieAtCut(partnersOf(ENGINE_CAPPED), 12)).toEqual({score: 8, drawn: 12, tied: 30});
  });

  it.each([
    ['the cut falls between two scores', ENGINE_FIFTEEN, 13],
    ['no partner is past the cut', ENGINE_FIFTEEN, 15],
    ['there are fewer partners than the cut', ENGINE_ONE_PARTNER, 12],
    ['there are no partners', ENGINE_EMPTY, 12],
    ['the cut is 0', ENGINE_FIFTEEN, 0],
  ])('is null when %s', (_, fixture, shown) => {
    expect(tieAtCut(partnersOf(fixture), shown)).toBeNull();
  });
});

describe('TIER_SERIES', () => {
  it('lists the tiers strongest first, each in its TIER_COLORS entry', () => {
    expect(TIER_ORDER).toEqual(['Perfect', 'Strong', 'Moderate', 'Weak']);
    expect(TIER_SERIES.map((series) => series.id)).toEqual(TIER_ORDER);
    expect(TIER_SERIES.map((series) => series.color)).toEqual([
      TIER_COLORS.perfect.color,
      TIER_COLORS.strong.color,
      TIER_COLORS.moderate.color,
      TIER_COLORS.weak.color,
    ]);
    expect(TIER_SERIES.map((series) => series.color)).toEqual(TIER_ORDER.map((tier) => TIER_COLOR[tier]));
  });

  it.each([
    ['Perfect', 'Perfect ≥9.5', 9.5],
    ['Strong', 'Strong ≥7', 7],
    ['Moderate', 'Moderate ≥4', 4],
  ])("labels %s with getStrengthTier's own cut-off", (tier, label, cutOff) => {
    expect(TIER_SERIES.find((series) => series.id === tier)?.label).toBe(label);
    expect(getStrengthTier(cutOff).label).toBe(tier);
    expect(getStrengthTier(cutOff - 0.01).label).not.toBe(tier);
  });

  it('labels Weak as everything under Moderate', () => {
    expect(TIER_SERIES.at(-1)?.label).toBe('Weak <4');
    expect(getStrengthTier(3.99).label).toBe('Weak');
    expect(getStrengthTier(4).label).toBe('Moderate');
  });
});
