import {describe, it, expect} from 'vitest';
import type {CardType} from 'inkweave-synergy-engine';
import {REVEAL_ID_BASE, inkBlock} from '../../../app-bridge';
import type {RevealCardForm} from '../../reveal/buildPreviewCard';
import {validateRevealCardForm} from '../../reveal/validateForm';
import {revealChecklist, sectionStatus} from '../readiness';

// Taken from the season's constants so these fixtures stay valid every season.
const RUBY_NUMBER = inkBlock('Ruby').first;

/** A complete Ruby character, numbered inside Ruby's block. */
function form(overrides: Partial<RevealCardForm> = {}): RevealCardForm {
  return {
    collectorNumber: String(RUBY_NUMBER),
    name: 'Mei',
    version: 'Red Panda',
    rarity: 'Rare',
    franchise: '',
    cost: '4',
    ink: 'Ruby',
    ink2: '',
    inkwell: true,
    type: 'Character',
    strength: '3',
    willpower: '5',
    lore: '2',
    moveCost: '',
    subtypes: '',
    keywords: '',
    fullText: '',
    scanLanguage: 'en',
    ...overrides,
  };
}

interface Run {
  form: RevealCardForm;
  ids?: ReadonlySet<number>;
  imageName?: string | null;
}

/** The validation New reveal runs, and the checklist over it with the image read. */
function check({form: f, ids = new Set<number>(), imageName = 'mei.png'}: Run) {
  const validation = validateRevealCardForm(f, ids, imageName);
  return {validation, items: revealChecklist(f, validation, true)};
}

const item = (run: Run, id: string) => check(run).items.find((i) => i.id === id);

describe('revealChecklist', () => {
  it.each([
    {key: 'collectorNumber', patch: {collectorNumber: ''}},
    {key: 'name', patch: {name: ' '}},
    {key: 'cost', patch: {cost: ''}},
    {key: 'ink', patch: {ink: 'Amber' as const}},
    {key: 'ink2', patch: {ink2: 'Ruby' as const}},
    {key: 'type', patch: {type: 'Song' as CardType}},
    {key: 'strength', patch: {strength: ''}},
    {key: 'willpower', patch: {willpower: '-1'}},
    {key: 'lore', patch: {lore: ''}},
    {key: 'moveCost', patch: {type: 'Location' as const}},
    {key: 'fullText', patch: {fullText: 'Gain 2 Lore.'}},
    {key: 'keywords', patch: {keywords: 'Challenger +2 Strength'}},
  ])('puts the $key error on exactly one item', ({key, patch}) => {
    const {validation, items} = check({form: form(patch)});
    const message = validation.errors[key];
    expect(message).toBeTruthy();
    expect(items.filter((i) => i.message === message && !i.done)).toHaveLength(1);
  });

  it('puts the missing image on the Image item', () => {
    const {validation, items} = check({form: form(), imageName: null});
    expect(items.filter((i) => !i.done)).toEqual([
      {id: 'image', label: 'Image', done: false, message: validation.errors.image},
    ]);
  });

  it('ticks every item for a valid form whose image is read', () => {
    expect(check({form: form()}).items.every((i) => i.done)).toBe(true);
  });

  it('keeps Image open while the file is still being read', () => {
    const {validation} = check({form: form()});
    const image = revealChecklist(form(), validation, false).find((i) => i.id === 'image');
    expect(image).toMatchObject({done: false, message: null});
  });

  it("leaves Ink open until there is a number, so the default ink can't tick it", () => {
    expect(item({form: form({collectorNumber: '', ink: 'Amber'})}, 'ink')).toMatchObject({
      done: false,
      message: 'Checked against the collector number: set it first',
    });
  });

  it("shows the validator's message for an ink outside the number's block", () => {
    expect(item({form: form({ink: 'Amber'})}, 'ink')?.message).toMatch(/Ruby block/);
  });

  it('checks the ink against a number that collides with a card', () => {
    const run = {form: form(), ids: new Set([REVEAL_ID_BASE + RUBY_NUMBER])};
    expect(item(run, 'collectorNumber')).toMatchObject({done: false, message: expect.stringMatching(/already exists/)});
    expect(item(run, 'ink')?.done).toBe(true);
  });
});

describe('sectionStatus', () => {
  const errorsOf = (f: RevealCardForm) => validateRevealCardForm(f, new Set(), 'mei.png').errors;

  it('shows an error over a section whose values are in', () => {
    const f = form({strength: '-1'});
    expect(sectionStatus('type', f, errorsOf(f))).toEqual({state: 'error', message: errorsOf(f).strength});
  });

  it('puts the ink block error on the ink section', () => {
    const f = form({ink: 'Amber'});
    expect(sectionStatus('ink', f, errorsOf(f)).message).toMatch(/Ruby block/);
    expect(sectionStatus('identity', f, errorsOf(f)).state).toBe('complete');
  });

  it('puts a glyph-word error on the text section', () => {
    const f = form({fullText: 'Gain 2 Lore.'});
    expect(sectionStatus('text', f, errorsOf(f)).state).toBe('error');
  });

  it('leaves the ink section incomplete without a number, even with the default ink', () => {
    const f = form({collectorNumber: '', ink: 'Amber'});
    expect(sectionStatus('ink', f, errorsOf(f)).state).toBe('incomplete');
  });

  it("leaves the type section incomplete until the type's stats are in", () => {
    const blankLore = form({lore: ''});
    expect(sectionStatus('type', blankLore, errorsOf(blankLore)).state).toBe('incomplete');
    const item = form({type: 'Item', cost: '2', strength: '', lore: ''});
    expect(sectionStatus('type', item, errorsOf(item)).state).toBe('complete');
  });

  it("reads a blank field's missing-value error as incomplete, and a wrong value as an error", () => {
    const blankNumber = form({collectorNumber: ''});
    expect(sectionStatus('identity', blankNumber, errorsOf(blankNumber))).toEqual({state: 'incomplete', message: null});
    const zero = form({collectorNumber: '0'});
    expect(sectionStatus('identity', zero, errorsOf(zero))).toEqual({state: 'error', message: errorsOf(zero).collectorNumber});
  });
});
