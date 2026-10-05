import {describe, expect, it} from 'vitest';
import {TUNING, type TuningConfig} from 'inkweave-synergy-engine';
import {pendingLabel, rowsForSelection, tuningKind, tuningName} from '../tuningRows';

// `both` sits in both sections, which tuning.json never does: it pins which one wins.
const CONFIG: TuningConfig = {
  playstyles: {ramp: {name: 'Ramp', tagline: 'Ink fast'}, both: {name: 'Both (playstyle)', tagline: 't'}},
  directRules: {
    'shift-targets': {name: 'Shift Targets', description: 'Shifters and their targets'},
    both: {name: 'Both (direct)', description: 'd'},
  },
  ruleTexts: {
    'shift-targets': {'curve.gap3': {score: 5, text: 'Wide gap'}, activationBonus: {text: 'Same target'}},
    ramp: {scores: {density: 5}, templates: {'ramp-ramp': 'Both accelerate'}},
  },
};

const SHIFT = ['ruleTexts', 'shift-targets'];

describe('rowsForSelection', () => {
  it('gives a playstyle its title and tagline', () => {
    expect(rowsForSelection(CONFIG, 'both').slice(0, 2)).toEqual([
      {label: 'Title', textPath: ['playstyles', 'both', 'name'], textValue: 'Both (playstyle)'},
      {label: 'Tagline', textPath: ['playstyles', 'both', 'tagline'], textValue: 't'},
    ]);
  });

  it('gives a direct rule its label and description, and Shift Targets a row per tier', () => {
    expect(rowsForSelection(CONFIG, 'shift-targets')).toEqual([
      {label: 'Label', textPath: ['directRules', 'shift-targets', 'name'], textValue: 'Shift Targets'},
      {
        label: 'Description',
        textPath: ['directRules', 'shift-targets', 'description'],
        textValue: 'Shifters and their targets',
      },
      {
        label: 'curve.gap3',
        textPath: [...SHIFT, 'curve.gap3', 'text'],
        textValue: 'Wide gap',
        scorePath: [...SHIFT, 'curve.gap3', 'score'],
        scoreValue: 5,
      },
      // A computed-score tier (Shift's activation bonus) has text and no score field.
      {label: 'activationBonus', textPath: [...SHIFT, 'activationBonus', 'text'], textValue: 'Same target'},
    ]);
  });

  it('adds the Ramp scores, then the Ramp templates', () => {
    expect(rowsForSelection(CONFIG, 'ramp')).toEqual([
      {label: 'Title', textPath: ['playstyles', 'ramp', 'name'], textValue: 'Ramp'},
      {label: 'Tagline', textPath: ['playstyles', 'ramp', 'tagline'], textValue: 'Ink fast'},
      {label: 'score · density', scorePath: ['ruleTexts', 'ramp', 'scores', 'density'], scoreValue: 5},
      {label: 'template · ramp-ramp', textPath: ['ruleTexts', 'ramp', 'templates', 'ramp-ramp'], textValue: 'Both accelerate'},
    ]);
  });

  it('gives an unknown key no rows', () => {
    expect(rowsForSelection(CONFIG, 'nope')).toEqual([]);
  });

  it('gives every tier of the bundled tuning.json a row, with a score path only where it has a score', () => {
    const tiers = rowsForSelection(TUNING, 'shift-targets').slice(2);
    expect(tiers.map((row) => row.label)).toEqual(Object.keys(TUNING.ruleTexts['shift-targets']));
    for (const row of tiers) {
      expect(row.scorePath !== undefined).toBe(TUNING.ruleTexts['shift-targets'][row.label].score !== undefined);
    }
  });
});

describe('tuningName and tuningKind', () => {
  it('read playstyles before direct rules', () => {
    expect(tuningName(CONFIG, 'both')).toBe('Both (playstyle)');
    expect(tuningKind(CONFIG, 'both')).toBe('playstyle');
  });

  it('name and place the bundled entries', () => {
    expect(tuningName(TUNING, 'location-control')).toBe('Locations');
    expect(tuningKind(TUNING, 'location-control')).toBe('playstyle');
    expect(tuningName(TUNING, 'shift-targets')).toBe('Shift Targets');
    expect(tuningKind(TUNING, 'shift-targets')).toBe('direct');
  });

  it('falls back to the key for an unknown or inherited one', () => {
    expect(tuningName(TUNING, 'nope')).toBe('nope');
    expect(tuningName(TUNING, 'constructor')).toBe('constructor');
  });
});

describe('pendingLabel', () => {
  it('names the entry, the row and the field', () => {
    expect(pendingLabel('Shift Targets', 'curve.gap3', 'score')).toBe('Shift Targets · curve.gap3 · score');
  });
});
