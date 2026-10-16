import {describe, expect, it} from 'vitest';
import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import type {PreviewCardChanges} from '../../reveal/replaceCardInPreviewJson';
import {changeCount, changeRows, type ChangeRow} from '../changeRows';

/** A preview entry as previewCards.json holds one: no version, franchise or scanLanguage. */
const LOADED: LorcanaJSONCard = {
  id: 14031,
  name: 'Bambi',
  fullName: 'Bambi',
  cost: 3,
  color: 'Amber',
  inkwell: true,
  type: 'Character',
  rarity: 'Rare',
  subtypes: ['Storyborn', 'Hero'],
  abilities: [{type: 'keyword', keyword: 'Singer', keywordValue: '5', fullText: 'Singer 5'}],
  fullText: 'Singer 5',
  fullTextSections: ['Singer 5'],
  strength: 2,
  willpower: 4,
  lore: 1,
  setCode: '14',
  number: 31,
};

const rowsFor = (changes: PreviewCardChanges, imageName: string | null = null) =>
  changeRows({loaded: LOADED, changes, imageName});

describe('changeRows', () => {
  it('labels a rename, prints — for a value the card lacked, and gives fullName no row', () => {
    expect(rowsFor({name: 'Faline', version: 'Playful Fawn', fullName: 'Faline - Playful Fawn'})).toEqual([
      {id: 'name', label: 'Name', from: 'Bambi', to: 'Faline'},
      {id: 'version', label: 'Version', from: '—', to: 'Playful Fawn'},
    ]);
  });

  it('prints — for a removed value (null)', () => {
    expect(rowsFor({rarity: null})).toEqual([{id: 'rarity', label: 'Rarity', from: 'Rare', to: '—'}]);
  });

  it('lists a retype with the stats it clears, under STAT_LABELS’ names', () => {
    expect(rowsFor({type: 'Location', strength: null, moveCost: 2})).toEqual([
      {id: 'type', label: 'Type', from: 'Character', to: 'Location'},
      {id: 'strength', label: 'Strength', from: '2', to: '—'},
      {id: 'moveCost', label: 'Move cost', from: '—', to: '2'},
    ]);
  });

  it.each<[string, PreviewCardChanges, Pick<ChangeRow, 'from' | 'to'>]>([
    ['a dual ink with a slash', {color: 'Amber-Steel'}, {from: 'Amber', to: 'Amber / Steel'}],
    ['the inkwell in words', {inkwell: false}, {from: 'Inkable', to: 'Uninkable'}],
    ['subtypes joined with commas', {subtypes: ['Storyborn', 'Ally']}, {from: 'Storyborn, Hero', to: 'Storyborn, Ally'}],
    [
      'each keyword by its text',
      {abilities: [{type: 'keyword', keyword: 'Singer', keywordValue: '5', fullText: 'Singer 5'}, {type: 'keyword', keyword: 'Ward', fullText: 'Ward'}]},
      {from: 'Singer 5', to: 'Singer 5, Ward'},
    ],
    ['emptied keywords as —', {abilities: null}, {from: 'Singer 5', to: '—'}],
    ['the cost as a number', {cost: 10}, {from: '3', to: '10'}],
    ['a marked scan by its language, and no mark as English', {scanLanguage: 'ja'}, {from: 'English', to: 'Japanese'}],
    ['an unlisted code by its English name (R-60)', {scanLanguage: 'zh'}, {from: 'English', to: 'Chinese'}],
  ])('prints %s', (_, changes, expected) => {
    expect(rowsFor(changes)).toMatchObject([expected]);
  });

  it('prints English for a scan refreshed to English (admin#14’s case)', () => {
    const loaded = {...LOADED, scanLanguage: 'it'};
    expect(changeRows({loaded, changes: {scanLanguage: null}, imageName: null})).toEqual([
      {id: 'scanLanguage', label: 'Scan language', from: 'Italian', to: 'English'},
    ]);
  });

  it('keeps every value whole, however long', () => {
    const fullText = `Whenever this character quests, ${'each opponent loses 1 lore and '.repeat(8)}you gain 1 lore.`;
    const [row] = rowsFor({fullText, fullTextSections: [fullText]});
    expect(row).toEqual({id: 'fullText', label: 'Card text', from: 'Singer 5', to: fullText});
  });

  it('lists the rows in the form’s order, whatever order the changes come in', () => {
    // Every editable key changes, listed backwards: the rows still read section by section.
    const changes: PreviewCardChanges = {
      scanLanguage: 'de',
      fullTextSections: ['Ward'],
      fullText: 'Ward',
      abilities: null,
      moveCost: 1,
      lore: 2,
      willpower: 3,
      strength: 4,
      cost: 5,
      inkwell: false,
      type: 'Location',
      rarity: 'Common',
      color: 'Ruby',
      subtypes: ['Ally'],
      franchise: 'Bambi',
      fullName: 'Faline - Playful Fawn',
      version: 'Playful Fawn',
      name: 'Faline',
    };
    expect(rowsFor(changes, 'faline.png').map((row) => row.id)).toEqual([
      'name',
      'version',
      'franchise',
      'subtypes',
      'color',
      'rarity',
      'type',
      'inkwell',
      'cost',
      'strength',
      'willpower',
      'lore',
      'moveCost',
      'abilities',
      'fullText',
      'scanLanguage',
      'image',
    ]);
  });

  it('puts a staged image last, worded as the card panel words it', () => {
    expect(rowsFor({cost: 4}, 'bambi-new.png')).toEqual([
      {id: 'cost', label: 'Cost', from: '3', to: '4'},
      {id: 'image', label: 'Image', from: 'current art', to: 'bambi-new.png'},
    ]);
  });

  it('gives an image-only card its Image row alone (loaded null, no changes)', () => {
    expect(changeRows({loaded: null, changes: {}, imageName: 'elsa.webp'})).toEqual([
      {id: 'image', label: 'Image', from: 'current art', to: 'elsa.webp'},
    ]);
  });

  it('is empty with no changes and no image', () => {
    expect(changeRows({loaded: null, changes: {}, imageName: null})).toEqual([]);
    expect(rowsFor({})).toEqual([]);
  });
});

describe('changeCount', () => {
  const row: ChangeRow = {id: 'cost', label: 'Cost', from: '3', to: '4'};

  it.each([
    [0, 'No changes yet'],
    [1, '1 change'],
    [3, '3 changes'],
  ])('reads %i rows as "%s"', (count, expected) => {
    expect(changeCount(Array.from({length: count}, () => row))).toBe(expected);
  });
});
