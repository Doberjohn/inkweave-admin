import {describe, expect, it} from 'vitest';
import {diffTuning} from '../tuningDiff';

const TUNING = {
  playstyles: {ramp: {name: 'Ramp', tagline: 'Faster ink'}},
  directRules: {'shift-targets': {name: 'Shift Targets', description: 'Shift onto it'}},
  ruleTexts: {
    'shift-targets': {'curve.gap3': {score: 5, text: 'Wide'}},
    ramp: {scores: {'chain.mixed': 8}, templates: {short: 'Ramps {a}'}},
  },
};

const text = (value: unknown) => JSON.stringify(value, null, 2);

describe('diffTuning', () => {
  it('names each changed value as the tuning editor names its row', () => {
    const after = structuredClone(TUNING);
    after.playstyles.ramp.tagline = 'Even faster ink';
    after.directRules['shift-targets'].name = 'Shift targets';
    after.ruleTexts['shift-targets']['curve.gap3'].score = 6;
    after.ruleTexts.ramp.scores['chain.mixed'] = 7;
    expect(diffTuning({before: text(TUNING), after: text(after)})).toEqual([
      {key: 'playstyles.ramp.tagline', label: 'Ramp · Tagline', from: 'Faster ink', to: 'Even faster ink'},
      {key: 'directRules.shift-targets.name', label: 'Shift targets · Label', from: 'Shift Targets', to: 'Shift targets'},
      {key: 'ruleTexts.shift-targets.curve.gap3.score', label: 'Shift targets · curve.gap3 · score', from: '5', to: '6'},
      {key: 'ruleTexts.ramp.scores.chain.mixed', label: 'Ramp · scores · chain.mixed', from: '8', to: '7'},
    ]);
  });

  it('lists an added entry value by value, and names a removed one as it was', () => {
    const after = structuredClone(TUNING) as typeof TUNING & {playstyles: Record<string, {name: string; tagline: string}>};
    after.playstyles.villains = {name: 'Villains', tagline: 'Boo'};
    delete (after.directRules as Partial<typeof TUNING.directRules>)['shift-targets'];
    expect(diffTuning({before: text(TUNING), after: text(after)})).toEqual([
      {key: 'playstyles.villains.name', label: 'Villains · Title', from: '—', to: 'Villains'},
      {key: 'playstyles.villains.tagline', label: 'Villains · Tagline', from: '—', to: 'Boo'},
      {key: 'directRules.shift-targets.name', label: 'Shift Targets · Label', from: 'Shift Targets', to: '—'},
      {key: 'directRules.shift-targets.description', label: 'Shift Targets · Description', from: 'Shift onto it', to: '—'},
    ]);
  });

  it('reads a file the commit added as every value new, and a key outside the entries by its path', () => {
    expect(diffTuning({before: null, after: text({version: 2})})).toEqual([{key: 'version', label: 'version', from: '—', to: '2'}]);
  });

  it("throws on text that isn't JSON", () => {
    expect(() => diffTuning({before: '{', after: '{}'})).toThrow();
  });
});
