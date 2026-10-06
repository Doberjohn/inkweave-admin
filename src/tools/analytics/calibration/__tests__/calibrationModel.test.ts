import {describe, expect, it} from 'vitest';
import {getAllRules, TUNING, type TuningConfig} from 'inkweave-synergy-engine';
import type {PendingEdit} from '../../../tuning/useTuningAdmin';
import type {GlobalStats, PairStat, RuleStat} from '../../voteAnalyticsTypes';
import type {VoteLogRow} from '../../voteLogTypes';
import {
  buildCalibrationRows,
  calibrationSubtitle,
  editedKeys,
  findPair,
  findRow,
  MAX_PAIRS,
  pairId,
  pairsFor,
  pairsHeading,
  pairsInScope,
  pinnedEntryName,
  rowsSharingKey,
  sortCalibrationRows,
  tuningEntry,
  tuningKeyFor,
  votesForPair,
  withSelectedPair,
} from '../calibrationModel';

/** An analytics rule. No playstyleId unless `over` gives one: the shape of an artifact written before R2. */
function stat(ruleId: string, over: Partial<RuleStat> = {}): RuleStat {
  return {
    ruleId,
    ruleName: ruleId,
    category: 'playstyle',
    scoreVotes: 0,
    pairsVoted: 0,
    meanGap: null,
    accuracySentiment: null,
    pairsCovered: 0,
    ...over,
  };
}

function pair(a: string, b: string, gap: number, rules: string[]): PairStat {
  return {a, b, aName: `Card ${a}`, bName: `Card ${b}`, engineScore: 5, communityScore: 5 + gap, gap, scoreVotes: 1, rules};
}

function vote(a: string, b: string): VoteLogRow {
  return {
    a,
    b,
    aName: `Card ${a}`,
    bName: `Card ${b}`,
    score: 6,
    accuracy: null,
    isReal: null,
    wouldPlay: null,
    difficulty: null,
    whoCarries: null,
    ts: '2026-09-30T14:20:00.123456+00:00',
    voter: 1,
  };
}

function edit(path: (string | number)[]): PendingEdit {
  return {pathKey: JSON.stringify(path), path, value: 'new', oldValue: 'old', label: 'label', valid: true};
}

function global(meanGap: number | null, totalVotes: number): GlobalStats {
  return {
    totalVotes,
    distinctPairs: 0,
    distinctVoters: null,
    meanGap,
    accuracySentiment: null,
    engineSilentPairs: 0,
    weekly: [],
    dimensionFill: null,
  };
}

/** The pinned tuning.json plus one direct entry no engine rule has. */
const WITH_NEW_DIRECT: TuningConfig = {
  ...TUNING,
  directRules: {...TUNING.directRules, 'brand-new': {name: 'Brand New', description: 'Not in the pinned engine yet.'}},
};

/** Every tuning.json key, playstyles then direct rules. */
const TUNING_KEYS = [...Object.keys(TUNING.playstyles), ...Object.keys(TUNING.directRules)];

/**
 * 45 pairs, narrowest gap first, alternating sign: pair i has |gap| i / 10.
 * Every third one (15 in all) fired ramp as well as toy.
 */
const PAIRS: PairStat[] = Array.from({length: 45}, (_, i) =>
  pair(String(i + 1), String(i + 100), (i % 2 ? -1 : 1) * (i / 10), i % 3 === 0 ? ['ramp', 'toy'] : ['toy']),
);

describe('tuningKeyFor', () => {
  describe("with the artifact's playstyleId (R-17)", () => {
    it('maps a playstyle rule to its playstyleId', () => {
      expect(tuningKeyFor({ruleId: 'lore-loss', category: 'playstyle', playstyleId: 'lore-denial'}, TUNING)).toBe(
        'lore-denial',
      );
      expect(
        tuningKeyFor({ruleId: 'location-boost', category: 'playstyle', playstyleId: 'location-control'}, TUNING),
      ).toBe('location-control');
      expect(tuningKeyFor({ruleId: 'ramp', category: 'playstyle', playstyleId: 'ramp'}, TUNING)).toBe('ramp');
    });

    it('maps a direct rule (playstyleId null) to its own id, and to null when tuning.json has no entry', () => {
      expect(tuningKeyFor({ruleId: 'shift-targets', category: 'direct', playstyleId: null}, TUNING)).toBe(
        'shift-targets',
      );
      expect(tuningKeyFor({ruleId: 'singer-songs', category: 'direct', playstyleId: null}, TUNING)).toBeNull();
    });

    it('reaches a rule app master has and the pin does not yet', () => {
      expect(
        tuningKeyFor({ruleId: 'location-new-trigger', category: 'playstyle', playstyleId: 'location-control'}, TUNING),
      ).toBe('location-control');
    });

    it('wins over the pinned engine when the two disagree', () => {
      // As if master had moved lore-loss to another playstyle after the pin.
      expect(tuningKeyFor({ruleId: 'lore-loss', category: 'playstyle', playstyleId: 'discard'}, TUNING)).toBe('discard');
    });

    it('returns null for a playstyleId tuning.json has no entry for', () => {
      expect(tuningKeyFor({ruleId: 'x', category: 'playstyle', playstyleId: 'no-such-playstyle'}, TUNING)).toBeNull();
    });
  });

  describe('without it (an artifact written before R2): the pinned engine', () => {
    it('maps lore-loss to lore-denial and location-boost to location-control', () => {
      expect(tuningKeyFor({ruleId: 'lore-loss', category: 'playstyle'}, TUNING)).toBe('lore-denial');
      expect(tuningKeyFor({ruleId: 'location-boost', category: 'playstyle'}, TUNING)).toBe('location-control');
    });

    it('maps ramp to ramp and the direct rule shift-targets to shift-targets', () => {
      expect(tuningKeyFor({ruleId: 'ramp', category: 'playstyle'}, TUNING)).toBe('ramp');
      expect(tuningKeyFor({ruleId: 'shift-targets', category: 'direct'}, TUNING)).toBe('shift-targets');
    });

    it('returns null for singer-songs, a direct rule with no entry', () => {
      expect(tuningKeyFor({ruleId: 'singer-songs', category: 'direct'}, TUNING)).toBeNull();
    });

    it("takes the section from the artifact's category, not the pinned engine", () => {
      expect(tuningKeyFor({ruleId: 'lore-loss', category: 'direct'}, TUNING)).toBeNull();
    });

    it("falls back to the rule's own id and the artifact's category for a rule the pin doesn't know", () => {
      expect(tuningKeyFor({ruleId: 'brand-new', category: 'direct'}, WITH_NEW_DIRECT)).toBe('brand-new');
      expect(tuningKeyFor({ruleId: 'brand-new', category: 'playstyle'}, WITH_NEW_DIRECT)).toBeNull();
      expect(tuningKeyFor({ruleId: 'brand-new', category: 'direct'}, TUNING)).toBeNull();
    });
  });

  it("doesn't count inherited keys", () => {
    expect(tuningKeyFor({ruleId: 'constructor', category: 'direct'}, TUNING)).toBeNull();
    expect(tuningKeyFor({ruleId: 'x', category: 'playstyle', playstyleId: 'toString'}, TUNING)).toBeNull();
  });
});

describe('the pinned engine and tuning.json (fails on a pin bump that breaks the mapping)', () => {
  const rules = getAllRules();
  // An artifact written before R2, and one written by R2's precompute (ruleRosterEntry in scripts/lib/voteAnalytics.mjs).
  const older = rules.map((rule) => stat(rule.id, {ruleName: rule.name, category: rule.category}));
  const current = rules.map((rule) =>
    stat(rule.id, {
      ruleName: rule.name,
      category: rule.category,
      playstyleId: rule.category === 'playstyle' ? rule.playstyleId : null,
    }),
  );

  it.each([
    ['without playstyleId', older],
    ['with playstyleId', current],
  ])('reaches every tuning.json entry from the rules %s, adding no tuning-only row', (_, stats) => {
    const rows = buildCalibrationRows(stats, TUNING);
    expect(rows.filter((row) => row.stat == null)).toEqual([]);
    expect(new Set(rows.map((row) => row.tuningKey).filter((key) => key != null))).toEqual(new Set(TUNING_KEYS));
  });

  it('maps every rule to the same key either way', () => {
    expect(current.map((s) => tuningKeyFor(s, TUNING))).toEqual(older.map((s) => tuningKeyFor(s, TUNING)));
  });
});

describe('buildCalibrationRows', () => {
  it('lists tuning.json alone without analytics: playstyles, then direct rules, none with a stat', () => {
    const rows = buildCalibrationRows(null, TUNING);
    expect(rows.map((row) => row.id)).toEqual(TUNING_KEYS);
    expect(rows.every((row) => row.stat == null && row.tuningKey === row.id)).toBe(true);
    expect(rows.find((row) => row.id === 'location-control')).toEqual({
      id: 'location-control',
      name: 'Locations',
      category: 'playstyle',
      stat: null,
      tuningKey: 'location-control',
    });
    expect(rows.find((row) => row.id === 'shift-targets')?.category).toBe('direct');
  });

  it('lists the analytics rules with no tuning key without a config', () => {
    const ramp = stat('ramp', {ruleName: 'Ramp'});
    const singer = stat('singer-songs', {ruleName: 'Singer + Songs', category: 'direct'});
    expect(buildCalibrationRows([ramp, singer], null)).toEqual([
      {id: 'ramp', name: 'Ramp', category: 'playstyle', stat: ramp, tuningKey: null},
      {id: 'singer-songs', name: 'Singer + Songs', category: 'direct', stat: singer, tuningKey: null},
    ]);
  });

  it('lists nothing with neither (R-20: no read-only fallback)', () => {
    expect(buildCalibrationRows(null, null)).toEqual([]);
  });

  it('appends each tuning.json entry no analytics rule reaches, in tuning.json order', () => {
    const rows = buildCalibrationRows(
      [stat('lore-loss'), stat('ramp'), stat('singer-songs', {category: 'direct'})],
      TUNING,
    );
    expect(rows.slice(0, 3).map((row) => [row.id, row.tuningKey])).toEqual([
      ['lore-loss', 'lore-denial'],
      ['ramp', 'ramp'],
      ['singer-songs', null],
    ]);
    const tuningOnly = rows.slice(3);
    expect(tuningOnly.map((row) => row.id)).toEqual(TUNING_KEYS.filter((key) => key !== 'lore-denial' && key !== 'ramp'));
    expect(tuningOnly.every((row) => row.stat == null)).toBe(true);
  });
});

describe('sortCalibrationRows', () => {
  const config: TuningConfig = {
    ...TUNING,
    playstyles: {
      a: {name: 'A', tagline: ''},
      b: {name: 'B', tagline: ''},
      c: {name: 'C', tagline: ''},
      d: {name: 'D', tagline: ''},
      x: {name: 'X', tagline: ''},
    },
    directRules: {y: {name: 'Y', description: ''}},
  };
  const rows = buildCalibrationRows(
    [
      stat('a', {meanGap: 0.2, scoreVotes: 50}),
      stat('b', {meanGap: -1.1, scoreVotes: 5}),
      stat('c', {meanGap: null, scoreVotes: 0}),
      stat('d', {meanGap: 0.6, scoreVotes: 120}),
    ],
    config,
  );

  it('orders rows with a stat by |gap|, a null gap as 0, and tuning-only rows last', () => {
    expect(sortCalibrationRows(rows, 'gap').map((row) => row.id)).toEqual(['b', 'd', 'a', 'c', 'x', 'y']);
  });

  it('orders them by score votes', () => {
    expect(sortCalibrationRows(rows, 'votes').map((row) => row.id)).toEqual(['d', 'a', 'b', 'c', 'x', 'y']);
  });

  it('leaves the input in its order', () => {
    sortCalibrationRows(rows, 'gap');
    expect(rows.map((row) => row.id)).toEqual(['a', 'b', 'c', 'd', 'x', 'y']);
  });
});

describe('findRow', () => {
  const rows = buildCalibrationRows([stat('ramp'), stat('location-boost'), stat('location-move')], TUNING);

  it('matches a row id first', () => {
    expect(findRow(rows, 'ramp')?.id).toBe('ramp');
    expect(findRow(rows, 'discard')?.stat).toBeNull();
  });

  it('then a tuning key: location-control finds the first location rule', () => {
    expect(findRow(rows, 'location-control')?.id).toBe('location-boost');
  });

  it('returns null for an unknown id or none', () => {
    expect(findRow(rows, 'retired-rule')).toBeNull();
    expect(findRow(rows, null)).toBeNull();
  });
});

describe('rowsSharingKey', () => {
  const rows = buildCalibrationRows(
    [
      stat('location-boost', {playstyleId: 'location-control'}),
      stat('ramp', {playstyleId: 'ramp'}),
      stat('location-move', {playstyleId: 'location-control'}),
      stat('location-search', {playstyleId: 'location-control'}),
    ],
    TUNING,
  );

  it('returns every analytics rule whose copy is that entry', () => {
    expect(rowsSharingKey(rows, 'location-control').map((row) => row.id)).toEqual([
      'location-boost',
      'location-move',
      'location-search',
    ]);
  });

  it('leaves out tuning-only rows', () => {
    expect(rowsSharingKey(rows, 'discard')).toEqual([]);
  });

  it('gives the nine location rules at the pin', () => {
    const all = buildCalibrationRows(
      getAllRules().map((rule) => stat(rule.id, {category: rule.category})),
      TUNING,
    );
    expect(rowsSharingKey(all, 'location-control')).toHaveLength(9);
  });
});

describe('tuningEntry', () => {
  const rows = buildCalibrationRows(
    [
      stat('location-boost', {ruleName: 'Location Boost', playstyleId: 'location-control'}),
      stat('singer-songs', {category: 'direct', playstyleId: null}),
    ],
    TUNING,
  );
  const [boost, singer] = rows;

  it("gives the entry the aside edits for a rule: its key, its name and its rows", () => {
    const entry = tuningEntry(TUNING, boost);
    expect(entry?.key).toBe('location-control');
    // The entry's name, which the aside heads its rows with, not the rule's.
    expect(entry?.name).toBe(TUNING.playstyles['location-control'].name);
    expect(entry?.name).not.toBe('Location Boost');
    expect(entry?.rows.map((row) => row.label)).toEqual(['Title', 'Tagline']);
  });

  it('gives null for a rule with no copy in tuning.json: no key, or a key with no rows', () => {
    expect(tuningEntry(TUNING, singer)).toBeNull();
    // A key from app master that this tuning.json has no entry for (R-17).
    expect(tuningEntry(TUNING, {...singer, tuningKey: 'ghost-key'})).toBeNull();
  });
});

describe('pinnedEntryName', () => {
  // No token: the rows carry no tuning key, since the live tuning.json is unread.
  const [boost, singer, lore] = buildCalibrationRows(
    [
      stat('location-boost', {ruleName: 'Location Boost'}),
      stat('singer-songs', {ruleName: 'Singer + Songs', category: 'direct'}),
      stat('lore-loss', {ruleName: 'Lore Loss', playstyleId: 'lore-denial'}),
    ],
    null,
  );

  it("names the entry the pinned tuning.json holds a rule's copy in, as the aside heads it", () => {
    expect(boost.tuningKey).toBeNull();
    expect(pinnedEntryName(boost)).toBe(TUNING.playstyles['location-control'].name);
    // The artifact's playstyleId first (R-17).
    expect(pinnedEntryName(lore)).toBe(TUNING.playstyles['lore-denial'].name);
  });

  it('gives null for a rule the pinned tuning.json has no copy of, and for a row with no rule', () => {
    expect(pinnedEntryName(singer)).toBeNull();
    // A key that is new on master: no copy here until a pin bump.
    const [fresh] = buildCalibrationRows([stat('lore-loss', {playstyleId: 'brand-new-playstyle'})], null);
    expect(pinnedEntryName(fresh)).toBeNull();
    expect(pinnedEntryName({...boost, stat: null, tuningKey: 'location-control'})).toBeNull();
  });
});

describe('editedKeys', () => {
  it('reads the tuning key from each pending path', () => {
    expect(
      editedKeys([
        edit(['ruleTexts', 'ramp', 'scores', 'x']),
        edit(['ruleTexts', 'shift-targets', 'curve.gap3', 'score']),
        edit(['playstyles', 'location-control', 'tagline']),
        edit(['playstyles', 'ramp', 'name']),
      ]),
    ).toEqual(new Set(['ramp', 'shift-targets', 'location-control']));
  });

  it('is empty without pending edits', () => {
    expect(editedKeys([]).size).toBe(0);
  });
});

describe('pairId', () => {
  it('gives one key whichever way round the cards come', () => {
    expect(pairId('1', '2')).toBe('1|2');
    expect(pairId('2', '1')).toBe('1|2');
    expect(pairId('9', '10')).toBe(pairId('10', '9'));
  });
});

describe('pairsInScope', () => {
  const ramp = buildCalibrationRows([stat('ramp')], null)[0];
  const tuningOnly = buildCalibrationRows(null, TUNING)[0];

  it('gives every pair for no row, widest gap first and uncapped', () => {
    const scope = pairsInScope(PAIRS, null);
    expect(scope).toHaveLength(45);
    expect(scope[0].gap).toBe(4.4);
    expect(scope[1].gap).toBe(-4.3);
    const widths = scope.map((p) => Math.abs(p.gap));
    expect(widths).toEqual([...widths].sort((x, y) => y - x));
  });

  it('gives no pairs for a tuning-only row', () => {
    expect(pairsInScope(PAIRS, tuningOnly)).toEqual([]);
  });

  it("gives only the pairs a rule fired on", () => {
    const scope = pairsInScope(PAIRS, ramp);
    expect(scope).toHaveLength(15);
    expect(scope.every((p) => p.rules.includes('ramp'))).toBe(true);
    expect(scope[0].gap).toBe(4.2);
  });

  it('leaves the input in its order', () => {
    pairsInScope(PAIRS, null);
    expect(PAIRS[0].a).toBe('1');
  });
});

describe('pairsFor', () => {
  it('gives the widest MAX_PAIRS for no row', () => {
    const listed = pairsFor(PAIRS, null);
    expect(listed).toHaveLength(MAX_PAIRS);
    expect(listed).toEqual(pairsInScope(PAIRS, null).slice(0, 40));
  });

  it('gives no pairs for a tuning-only row', () => {
    expect(pairsFor(PAIRS, buildCalibrationRows(null, TUNING)[0])).toEqual([]);
  });

  it('gives only the pairs a rule fired on', () => {
    const listed = pairsFor(PAIRS, buildCalibrationRows([stat('ramp')], null)[0]);
    expect(listed).toHaveLength(15);
    expect(listed.every((p) => p.rules.includes('ramp'))).toBe(true);
  });
});

describe('findPair', () => {
  const scope = pairsInScope(PAIRS, null);

  it("finds the scope's record for a selection given either way round", () => {
    expect(findPair(scope, {a: '1', b: '100'})).toBe(PAIRS[0]);
    expect(findPair(scope, {a: '100', b: '1'})).toBe(PAIRS[0]);
  });

  it('gives null without a selection, and for a pair outside the scope', () => {
    expect(findPair(scope, null)).toBeNull();
    const rampScope = pairsInScope(PAIRS, buildCalibrationRows([stat('ramp')], null)[0]);
    expect(findPair(rampScope, {a: '2', b: '101'})).toBeNull();
  });
});

describe('withSelectedPair', () => {
  const scope = pairsInScope(PAIRS, null);
  const listed = pairsFor(PAIRS, null);

  it('appends the selected pair when it sits below the widest 40', () => {
    const shown = withSelectedPair(listed, scope, {a: scope[40].b, b: scope[40].a});
    expect(shown).toHaveLength(41);
    expect(shown[40]).toBe(scope[40]);
  });

  it('leaves the list alone when it holds the selection, or nothing is selected', () => {
    expect(withSelectedPair(listed, scope, {a: scope[3].a, b: scope[3].b})).toBe(listed);
    expect(withSelectedPair(listed, scope, null)).toBe(listed);
  });
});

describe('votesForPair', () => {
  const votes = [vote('1', '2'), vote('2', '1'), vote('1', '3')];

  it("returns only the selected pair's votes, either way round", () => {
    expect(votesForPair(votes, {a: '1', b: '2'})).toEqual([votes[0], votes[1]]);
  });

  it('returns none without a pair', () => {
    expect(votesForPair(votes, null)).toEqual([]);
  });
});

describe('pairsHeading', () => {
  it('reads "All pairs" with no row', () => {
    expect(pairsHeading(null)).toBe('All pairs');
  });

  it("gives a rule's gap and votes, with a true minus sign", () => {
    const [ramp] = buildCalibrationRows([stat('ramp', {ruleName: 'Ramp', meanGap: -0.57, scoreVotes: 557})], TUNING);
    expect(pairsHeading(ramp)).toBe('Ramp · gap −0.57 · 557 votes');
    const [toy] = buildCalibrationRows([stat('toy', {ruleName: 'Toy', meanGap: 0.83, scoreVotes: 1})], TUNING);
    expect(pairsHeading(toy)).toBe('Toy · gap +0.83 · 1 vote');
  });

  it('says a tuning-only row, or a rule nobody has scored, has no score votes yet', () => {
    const locations = buildCalibrationRows(null, TUNING).find((row) => row.id === 'location-control') ?? null;
    expect(pairsHeading(locations)).toBe('Locations · no score votes yet');
    const [singer] = buildCalibrationRows([stat('singer-songs', {ruleName: 'Singer + Songs', category: 'direct'})], null);
    expect(pairsHeading(singer)).toBe('Singer + Songs · no score votes yet');
  });
});

describe('calibrationSubtitle', () => {
  it('gives the mean gap, the verdict and the votes', () => {
    expect(calibrationSubtitle(global(-0.3, 2054))).toBe('Mean gap −0.30 · well-calibrated · 2,054 votes');
    expect(calibrationSubtitle(global(0.83, 1))).toBe('Mean gap +0.83 · runs harsh · 1 vote');
  });

  it('says there is not enough data without a gap', () => {
    expect(calibrationSubtitle(global(null, 0))).toBe('Mean gap — · not enough data · 0 votes');
  });

  it('names only the analytics when there are none', () => {
    expect(calibrationSubtitle(null)).toBe('No vote analytics yet');
  });
});
