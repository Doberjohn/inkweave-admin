import {describe, it, expect} from 'vitest';
import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import {PINNED_PREVIEW_CARDS_JSON} from '../../../app-bridge';
import {insertCardIntoPreviewJson} from '../insertCardIntoPreviewJson';
import {mergeCardChanges, replaceCardInPreviewJson, type PreviewCardChanges} from '../replaceCardInPreviewJson';

/** A file as the app writes it: two-space JSON and a closing newline, so it round-trips. */
const fileOf = (data: unknown) => `${JSON.stringify(data, null, 2)}\n`;

const MEI: LorcanaJSONCard = {
  id: 14002,
  name: 'Mei',
  fullName: 'Mei - Red Panda',
  cost: 4,
  color: 'Ruby',
  inkwell: true,
  type: 'Character',
  setCode: '14',
  number: 2,
  version: 'Red Panda',
  rarity: 'Rare',
  strength: 3,
  willpower: 5,
  lore: 2,
  variants: [{id: 14224, rarity: 'Enchanted', number: 224}],
  scanLanguage: 'ja',
};
const FIRST: LorcanaJSONCard = {...MEI, id: 14001, name: 'First', fullName: 'First', number: 1};
const LAST: LorcanaJSONCard = {...MEI, id: 14003, name: 'Last', fullName: 'Last', number: 3};
const FILE = fileOf({metadata: {language: 'en'}, sets: {'14': {number: 14}}, cards: [FIRST, MEI, LAST]});

/** The card with this id in a previewCards.json text. */
function cardIn(text: string, id: number): LorcanaJSONCard | undefined {
  return (JSON.parse(text) as {cards: LorcanaJSONCard[]}).cards.find((c) => c.id === id);
}

describe('replaceCardInPreviewJson', () => {
  it('changes only that card: the bytes before and after its entry stay as they were', () => {
    const out = replaceCardInPreviewJson(FILE, 14002, {cost: 5});
    const start = FILE.indexOf('"id": 14002');
    const end = FILE.indexOf('"id": 14003');
    expect(out.slice(0, start)).toBe(FILE.slice(0, start));
    expect(out.slice(out.indexOf('"id": 14003'))).toBe(FILE.slice(end));
    expect(cardIn(out, 14002)?.cost).toBe(5);
  });

  it('keeps the keys Edit card never touches, variants included', () => {
    const out = replaceCardInPreviewJson(FILE, 14002, {name: 'Meilin'});
    expect(cardIn(out, 14002)?.variants).toEqual(MEI.variants);
    expect(cardIn(out, 14002)?.setCode).toBe('14');
  });

  it.each([
    {key: 'scanLanguage', changes: {scanLanguage: null}},
    {key: 'rarity', changes: {rarity: null}},
  ])('removes $key for a null', ({key, changes}) => {
    const out = replaceCardInPreviewJson(FILE, 14002, changes as PreviewCardChanges);
    expect(cardIn(out, 14002)).not.toHaveProperty(key);
  });

  it('keeps the id and the place of a renamed card', () => {
    const out = replaceCardInPreviewJson(FILE, 14002, {name: 'Arthur', version: 'Jousting Knight', fullName: 'Arthur - Jousting Knight'});
    const cards = (JSON.parse(out) as {cards: LorcanaJSONCard[]}).cards;
    expect(cards.map((c) => c.id)).toEqual([14001, 14002, 14003]);
    expect(cards[1].fullName).toBe('Arthur - Jousting Knight');
  });

  it('keeps a changed key where it was and puts a new one last', () => {
    const noVersion = {...MEI};
    delete noVersion.version;
    const file = fileOf({cards: [noVersion]});
    const out = replaceCardInPreviewJson(file, 14002, {cost: 6, version: 'Red Panda'});
    const keys = Object.keys(cardIn(out, 14002) ?? {});
    expect(keys.indexOf('cost')).toBe(Object.keys(noVersion).indexOf('cost'));
    expect(keys.at(-1)).toBe('version');
  });

  // The pinned file round-trips byte for byte, so an edit that changes nothing returns it whole.
  // After a set graduates the file has no cards, so the test inserts one first. A pin bump that
  // changes the file's layout fails here.
  it("returns the pinned file unchanged for an edit that sets a card's own values", () => {
    const pinnedCards = (JSON.parse(PINNED_PREVIEW_CARDS_JSON) as {cards: LorcanaJSONCard[]}).cards;
    const action: LorcanaJSONCard = {id: 14999, name: 'Test', fullName: 'Test', cost: 1, color: 'Amber', inkwell: true, type: 'Action'};
    const input = pinnedCards.length > 0 ? PINNED_PREVIEW_CARDS_JSON : insertCardIntoPreviewJson(PINNED_PREVIEW_CARDS_JSON, action);
    const card = pinnedCards[0] ?? action;
    expect(replaceCardInPreviewJson(input, card.id, {name: card.name, cost: card.cost})).toBe(input);
  });

  it.each([
    {reason: 'the id is missing', id: 14099, changes: {cost: 1}, text: FILE},
    {reason: 'the id appears twice', id: 14002, changes: {cost: 1}, text: fileOf({cards: [MEI, MEI]})},
    {reason: 'it names the id', id: 14002, changes: {id: 1}, text: FILE},
    {reason: 'it names the number', id: 14002, changes: {number: 9}, text: FILE},
    {reason: 'it names the set', id: 14002, changes: {setCode: '13'}, text: FILE},
    {reason: 'it names the variants', id: 14002, changes: {variants: []}, text: FILE},
    {reason: 'it removes the name', id: 14002, changes: {name: null}, text: FILE},
    {reason: 'there are no changes', id: 14002, changes: {}, text: FILE},
    {reason: 'the file is not JSON', id: 14002, changes: {cost: 1}, text: 'not json'},
    {reason: 'the file has no cards array', id: 14002, changes: {cost: 1}, text: fileOf({cards: {}})},
    {reason: 'the file does not round-trip', id: 14002, changes: {cost: 1}, text: JSON.stringify({cards: [MEI]})},
  ])('throws when $reason', ({id, changes, text}) => {
    expect(() => replaceCardInPreviewJson(text, id, changes as PreviewCardChanges)).toThrow(/previewCards\.json/);
  });
});

describe('mergeCardChanges', () => {
  it('applies values, removes nulls and skips undefined', () => {
    const merged = mergeCardChanges(MEI, {cost: 2, rarity: null, lore: undefined});
    expect(merged.cost).toBe(2);
    expect(merged).not.toHaveProperty('rarity');
    expect(merged.lore).toBe(2);
    expect(merged.id).toBe(14002);
  });
});
