import {describe, expect, it} from 'vitest';
import {TIER_COLORS} from '../../../../app-bridge';
import {tooltipText} from '../../../../charts/series';
import {
  ENGINE_CAPPED,
  ENGINE_EMPTY,
  ENGINE_FIFTEEN,
  ENGINE_ONE_PARTNER,
  engineFixture,
  partnerLookup,
  type EngineFixture,
} from '../cardFixtures';
import {
  engineScoreText,
  engineState,
  networkSubtitle,
  partnerNames,
  partnerNodes,
  partnerTable,
  tierParts,
  type EngineModel,
} from '../engineCharts';

/** A settled read of the fixture's file, as useCardSynergies returns it. */
const read = (fixture: EngineFixture) => ({data: fixture.data, loading: false, error: null});
const namesOf = (fixture: EngineFixture) => partnerNames(partnerLookup(fixture));

/** The fixture's model: what the panels draw once the read lands with partners. */
function modelOf(fixture: EngineFixture, names = namesOf(fixture)): EngineModel {
  const state = engineState(read(fixture), names);
  if (state.kind !== 'loaded') throw new Error(`no partners in the fixture (${state.kind})`);
  return state.model;
}

/** One partner the engine names no rule for. */
const bare = engineFixture([{id: '601', name: 'Quiet Partner', score: 6, rules: []}]);

/** A full group: 100 partners at `score`, "Tied 001" to "Tied 100", whose names sort as they are numbered. */
const hundredTied = ({score}: {score: number}) =>
  Array.from({length: 100}, (_, i) => ({id: String(3001 + i), name: `Tied ${String(i + 1).padStart(3, '0')}`, score}));

/**
 * Ties that reach the engine's cap (F7): one group lists exactly 100 partners, all at one score,
 * so the engine may have left more at that score out, and the file's tie count is a floor.
 * In the first every drawn partner ties; in the second, 8 at 9 (another group) come first.
 */
const TIED_AT_CAP = engineFixture(hundredTied({score: 7}));
const CUT_AT_CAP = engineFixture([
  ...Array.from({length: 8}, (_, i) => ({id: String(3201 + i), name: `Strong ${i + 1}`, score: 9, rules: ['Singer']})),
  ...hundredTied({score: 6}),
]);

/** `count` partners, one per score from 10 down in half points: no two tie. */
const distinct = (count: number) =>
  engineFixture(
    Array.from({length: count}, (_, i) => ({id: String(501 + i), name: `Spoke ${i + 1}`, score: 10 - i / 2})),
  );

describe('partnerNames', () => {
  it('reads the full and the short name from the card list, and the id for a card it does not hold', () => {
    const names = namesOf(ENGINE_FIFTEEN);
    expect(names.full('301')).toBe('Wren Ashdown - Keeper of Keys');
    expect(names.short('301')).toBe('Wren Ashdown');
    expect(names.full('999')).toBe('999');
    expect(names.short('999')).toBe('999');
  });
});

describe('engineState', () => {
  const names = namesOf(ENGINE_FIFTEEN);

  it.each([
    ['loading', {data: null, loading: true, error: null}],
    ['empty', {data: null, loading: false, error: null}],
    ['empty', read(ENGINE_EMPTY)],
  ] as const)('reads %s', (kind, synergies) => {
    expect(engineState(synergies, names).kind).toBe(kind);
  });

  it('carries a failed read’s error', () => {
    const error = new Error('offline');
    expect(engineState({data: null, loading: false, error}, names)).toEqual({kind: 'failed', error});
  });

  it.each<[string, EngineFixture, EngineModel['summary'], EngineModel['cut']]>([
    [
      'fifteen partners, the cut inside the eight at 7',
      ENGINE_FIFTEEN,
      {partners: 15, capped: false, tiers: {Perfect: 1, Strong: 12, Moderate: 1, Weak: 1}},
      {score: 7, drawn: 7, tied: 8},
    ],
    [
      'a capped group, all twelve from the 30 at 8',
      ENGINE_CAPPED,
      {partners: 142, capped: true, tiers: {Perfect: 0, Strong: 30, Moderate: 70, Weak: 42}},
      {score: 8, drawn: 12, tied: 30},
    ],
    [
      'a capped group, all at the tie score, all twelve from it',
      TIED_AT_CAP,
      {partners: 100, capped: true, tiers: {Perfect: 0, Strong: 100, Moderate: 0, Weak: 0}},
      {score: 7, drawn: 12, tied: 100},
    ],
    [
      'a capped group, all at the tie score, the cut inside it',
      CUT_AT_CAP,
      {partners: 108, capped: true, tiers: {Perfect: 0, Strong: 8, Moderate: 100, Weak: 0}},
      {score: 6, drawn: 4, tied: 100},
    ],
    [
      'one partner, no cut',
      ENGINE_ONE_PARTNER,
      {partners: 1, capped: false, tiers: {Perfect: 0, Strong: 0, Moderate: 1, Weak: 0}},
      null,
    ],
  ])('builds the partners once, with their summary and cut: %s', (_, fixture, summary, cut) => {
    const model = modelOf(fixture);
    expect(model.summary).toEqual(summary);
    expect(model.cut).toEqual(cut);
    expect(model.partners).toHaveLength(summary.partners);
  });
});

describe('tierParts', () => {
  it('keeps every tier, strongest first, with its label, colour and count, zeros included (R-44)', () => {
    expect(tierParts(modelOf(ENGINE_ONE_PARTNER).summary)).toEqual([
      {id: 'Perfect', label: 'Perfect ≥9.5', color: TIER_COLORS.perfect.color, value: 0},
      {id: 'Strong', label: 'Strong ≥7', color: TIER_COLORS.strong.color, value: 0},
      {id: 'Moderate', label: 'Moderate ≥4', color: TIER_COLORS.moderate.color, value: 1},
      {id: 'Weak', label: 'Weak <4', color: TIER_COLORS.weak.color, value: 0},
    ]);
  });
});

describe('engineScoreText', () => {
  it.each([
    [8, '8'],
    [10, '10'],
    [9.5, '9.5'],
  ])('prints %s as "%s"', (score, text) => {
    expect(engineScoreText(score)).toBe(text);
  });
});

describe('partnerNodes', () => {
  const nodes = partnerNodes(modelOf(ENGINE_FIFTEEN).partners, namesOf(ENGINE_FIFTEEN));

  it('prints the short name, links to the partner’s page and takes its tier’s series', () => {
    expect(nodes).toHaveLength(15);
    expect(nodes[0]).toMatchObject({
      id: '301',
      label: 'Wren Ashdown',
      href: '/cards/301',
      value: 10,
      seriesId: 'Perfect',
    });
  });

  it('names a node by its tooltip: full name, score, tier and every rule (R-41)', () => {
    expect(tooltipText(nodes[0].tooltip)).toBe(
      'Wren Ashdown - Keeper of Keys: 10 engine score, Perfect tier, Shift Targets and Ramp rules',
    );
    expect(tooltipText(nodes[1].tooltip)).toBe(
      'Ada Brightwater - Tidecaller: 9 engine score, Strong tier, Singer rule',
    );
  });

  it('keys the score row in the tier’s colour, and the text never takes it', () => {
    expect(nodes[0].tooltip.rows[0]).toEqual({value: '10', label: 'engine score', color: TIER_COLORS.perfect.color});
    expect(nodes[0].tooltip.rows.slice(1).every((row) => row.color === undefined)).toBe(true);
  });

  it('leaves the rules row out for a pair the engine names no rule for', () => {
    const [node] = partnerNodes(modelOf(bare).partners, namesOf(bare));
    expect(tooltipText(node.tooltip)).toBe('Quiet Partner: 6 engine score, Moderate tier');
  });

  it('falls back to the id for a partner the card list does not hold', () => {
    const unknown = partnerNames(() => undefined);
    const [node] = partnerNodes(modelOf(ENGINE_ONE_PARTNER, unknown).partners, unknown);
    expect(node.label).toBe('401');
    expect(node.tooltip.title).toBe('401');
  });
});

describe('networkSubtitle', () => {
  const READ = "ranked clockwise from 12 o'clock";

  it.each<[string, EngineFixture, string]>([
    // One spoke, or spokes that all share a score: widths say nothing, so the subtitle leaves them out.
    ['one partner', ENGINE_ONE_PARTNER, `Every partner, ${READ}.`],
    [
      'three partners at one score',
      engineFixture([
        {id: '701', name: 'Ash', score: 7},
        {id: '702', name: 'Birch', score: 7},
        {id: '703', name: 'Cedar', score: 7},
      ]),
      `Every partner, ${READ}.`,
    ],
    [
      'nine partners, two rings',
      distinct(9),
      `Every partner, ${READ}, the first 5 on the inner ring. Thicker spokes score higher.`,
    ],
    [
      'twelve partners, all drawn',
      distinct(12),
      `Every partner, ${READ}, the first 6 on the inner ring. Thicker spokes score higher.`,
    ],
    [
      'a cut between two scores',
      distinct(13),
      `The 12 strongest of 13 partners, ${READ}, the first 6 on the inner ring. Thicker spokes score higher.`,
    ],
    [
      'a cut inside a tie (R-37)',
      ENGINE_FIFTEEN,
      `The 12 strongest of 15 partners, ${READ}, the first 6 on the inner ring. ` +
        '7 of the 8 partners at score 7 make the cut, by name. Thicker spokes score higher.',
    ],
    [
      'a capped count, a floor, every drawn partner in the tie',
      ENGINE_CAPPED,
      // Every drawn spoke has the same score, so the subtitle says how they were picked and nothing of widths.
      // Capped, so the tie's count is a floor too: the file can't show that the engine kept every partner at 8.
      `12 of at least 30 partners at score 8, by name, of at least 142 in all, ${READ}, the first 6 on the inner ring.`,
    ],
    [
      'a capped tie that fills its group, every drawn partner in it (F7)',
      TIED_AT_CAP,
      `12 of at least 100 partners at score 7, by name, of at least 100 in all, ${READ}, the first 6 on the inner ring.`,
    ],
    [
      'a capped tie that fills its group, the cut inside it (F7)',
      CUT_AT_CAP,
      `The 12 strongest of at least 108 partners, ${READ}, the first 6 on the inner ring. ` +
        '4 of at least 100 partners at score 6 make the cut, by name, among those the engine lists. ' +
        'Thicker spokes score higher.',
    ],
  ])('%s', (_, fixture, subtitle) => {
    expect(networkSubtitle(modelOf(fixture))).toBe(subtitle);
  });
});

describe('partnerTable', () => {
  it('lists every partner, past the twelve drawn, strongest first, with all the tooltip shows', () => {
    const table = partnerTable(modelOf(ENGINE_FIFTEEN).partners, {fullName: 'Marlowe Finch - Clockmaker'});
    expect(table.caption).toBe(
      'Synergy partners of Marlowe Finch - Clockmaker, strongest first (by engine score, then name)',
    );
    expect(table.columns).toEqual(['Partner', 'Score', 'Tier', 'Rules']);
    expect(table.rows).toHaveLength(15);
    expect(table.rows[0]).toEqual(['Wren Ashdown - Keeper of Keys', '10', 'Perfect', 'Shift Targets and Ramp']);
    expect(table.rows[12]).toEqual(['Yara Stormwick - Captain', '7', 'Strong', 'Ramp']);
    expect(table.rows[14]).toEqual(['Lumen - Glowworm', '3', 'Weak', 'Ramp']);
  });

  it('prints "—" for a pair with no named rule', () => {
    const {rows} = partnerTable(modelOf(bare).partners, {fullName: 'Marlowe Finch - Clockmaker'});
    expect(rows).toEqual([['Quiet Partner', '6', 'Moderate', '—']]);
  });
});
