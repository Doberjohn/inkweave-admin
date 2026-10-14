import {describe, it, expect} from 'vitest';
import {requiredPlaceholders, requirePlaceholders} from '../placeholders';

const SHIFT_TEXT = ['ruleTexts', 'shift-targets', 'curve.gap3', 'text'];
const TEMPLATES = ['ruleTexts', 'ramp', 'templates'];

describe('requiredPlaceholders', () => {
  it('needs the base and the Shift card in a Shift tier text', () => {
    expect(requiredPlaceholders(SHIFT_TEXT)).toEqual(['<BASE>', '<SHIFT>']);
  });

  it("needs a Ramp template's two roles, or {A} and {B} when both cards share one", () => {
    expect(requiredPlaceholders([...TEMPLATES, 'ramp-trigger'])).toEqual(['{RAMP}', '{TRIGGER}']);
    expect(requiredPlaceholders([...TEMPLATES, 'trigger-cost'])).toEqual(['{TRIGGER}', '{COST}']);
    expect(requiredPlaceholders([...TEMPLATES, 'cost-cost'])).toEqual(['{A}', '{B}']);
  });

  it('needs none in the other texts', () => {
    expect(requiredPlaceholders(['playstyles', 'ramp', 'tagline'])).toEqual([]);
    expect(requiredPlaceholders(['directRules', 'shift-targets', 'description'])).toEqual([]);
  });
});

describe('requirePlaceholders', () => {
  it('keeps a text that names both cards', () => {
    const text = {ok: true as const, value: 'Smooth curve: <BASE> flows into <SHIFT>.'};
    expect(requirePlaceholders(text, SHIFT_TEXT)).toBe(text);
  });

  it('refuses a text that drops a placeholder, naming each one it lacks', () => {
    expect(requirePlaceholders({ok: true, value: 'Smooth curve: <BASE> flows on.'}, SHIFT_TEXT)).toEqual({
      ok: false,
      error: 'Keep the <SHIFT> placeholder: it names a card in the synergy line',
    });
    expect(requirePlaceholders({ok: true, value: 'Both reduce costs.'}, [...TEMPLATES, 'cost-cost'])).toEqual({
      ok: false,
      error: 'Keep the {A} and {B} placeholders: they name the cards in the synergy line',
    });
  });

  it('passes on an earlier refusal unchanged', () => {
    const empty = {ok: false as const, error: 'Text cannot be empty'};
    expect(requirePlaceholders(empty, SHIFT_TEXT)).toBe(empty);
  });
});
