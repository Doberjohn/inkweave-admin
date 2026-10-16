import {describe, it, expect} from 'vitest';
import type {CardType, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {PINNED_PREVIEW_CARDS_JSON} from '../../../app-bridge';
import {buildPreviewCard, type RevealCardForm} from '../buildPreviewCard';
import {insertCardIntoPreviewJson} from '../insertCardIntoPreviewJson';
import {
  EDITABLE_CARD_KEYS,
  mergeCardChanges,
  replaceCardInPreviewJson,
  type PreviewCardChanges,
  type PreviewCardEdit,
} from '../replaceCardInPreviewJson';

// Three entries in the app's key order. MIDDLE has no version, so a rename can
// add one, and carries a scan language and a variant printing, as real entries can.
const FIRST: LorcanaJSONCard = {
  id: 14001,
  name: 'First',
  fullName: 'First',
  cost: 1,
  color: 'Amber',
  inkwell: true,
  type: 'Action',
  setCode: '14',
  number: 1,
  rarity: 'Common',
};
const MIDDLE: LorcanaJSONCard = {
  id: 14002,
  name: 'Middle',
  fullName: 'Middle',
  cost: 3,
  color: 'Amber-Steel',
  inkwell: false,
  type: 'Character',
  setCode: '14',
  number: 2,
  rarity: 'Rare',
  subtypes: ['Storyborn'],
  strength: 2,
  willpower: 3,
  lore: 1,
  scanLanguage: 'ja',
  variants: [{id: 14205, rarity: 'Enchanted', number: 205}],
};
const LAST: LorcanaJSONCard = {
  id: 14003,
  name: 'Last',
  fullName: 'Last',
  cost: 2,
  color: 'Steel',
  inkwell: true,
  type: 'Item',
  setCode: '14',
  number: 3,
  abilities: [{type: 'keyword', keyword: 'Evasive', fullText: 'Evasive'}],
};

// The fixtures are written as the app writes the file, so they round-trip.
const serialize = (file: unknown) => `${JSON.stringify(file, null, 2)}\n`;
const FILE = {
  metadata: {formatVersion: '2.3.2', language: 'en'},
  sets: {'14': {name: 'Hyperia City', number: 14}},
  cards: [FIRST, MIDDLE, LAST],
};
const TEXT = serialize(FILE);

const cardsOf = (text: string) => (JSON.parse(text) as {cards: LorcanaJSONCard[]}).cards;

/** MIDDLE edited in TEXT. */
const editMiddle = (changes: PreviewCardChanges) => replaceCardInPreviewJson(TEXT, {id: MIDDLE.id, changes});

/** A card's entry as the file holds it: two-space JSON, four more spaces in. */
const entryText = (card: LorcanaJSONCard) =>
  JSON.stringify(card, null, 2)
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');

/** Changes the types refuse, as a cast or a bad caller could still send them. */
const untyped = (changes: Record<string, unknown>) => changes as PreviewCardChanges;

/** An edit that sets every editable key the card has to the value it already holds. */
const ownValues = (card: LorcanaJSONCard) =>
  Object.fromEntries(EDITABLE_CARD_KEYS.filter((key) => key in card).map((key) => [key, card[key]])) as PreviewCardChanges;

describe('mergeCardChanges', () => {
  it('keeps a changed key in its place and puts a new key last', () => {
    const merged = mergeCardChanges(MIDDLE, {cost: 4, version: 'Now'});
    expect(Object.keys(merged)).toEqual([...Object.keys(MIDDLE), 'version']);
    expect(merged).toMatchObject({cost: 4, version: 'Now'});
  });

  it('removes a key set to null and ignores an undefined one', () => {
    const merged = mergeCardChanges(MIDDLE, {scanLanguage: null, rarity: null, lore: undefined});
    expect(merged).not.toHaveProperty('scanLanguage');
    expect(merged).not.toHaveProperty('rarity');
    expect(merged.lore).toBe(1);
  });

  it('keeps every key it is not given, variants among them, and leaves the card it was given alone', () => {
    const before = structuredClone(MIDDLE);
    const merged = mergeCardChanges(MIDDLE, {name: 'Renamed', fullName: 'Renamed'});
    expect(merged).toEqual({...before, name: 'Renamed', fullName: 'Renamed'});
    expect(MIDDLE).toEqual(before);
  });
});

describe('replaceCardInPreviewJson', () => {
  it('rewrites only that entry: every byte before and after it stays', () => {
    const out = editMiddle({name: 'Renamed', fullName: 'Renamed - Now', version: 'Now'});
    const at = TEXT.indexOf(entryText(MIDDLE));
    const tail = TEXT.slice(at + entryText(MIDDLE).length);
    expect(out.slice(0, at)).toBe(TEXT.slice(0, at));
    expect(out.endsWith(tail)).toBe(true);
    expect(out.slice(at, out.length - tail.length)).toBe(
      entryText({...MIDDLE, name: 'Renamed', fullName: 'Renamed - Now', version: 'Now'}),
    );
  });

  it('renames a card in place: its id and its position stay', () => {
    const cards = cardsOf(editMiddle({name: 'Renamed', fullName: 'Renamed'}));
    expect(cards.map((card) => card.id)).toEqual([14001, 14002, 14003]);
    expect(cards[1]).toMatchObject({id: 14002, name: 'Renamed', fullName: 'Renamed'});
  });

  it("keeps the card's variants, and every other card, as they were", () => {
    const cards = cardsOf(editMiddle({cost: 4, type: 'Location', strength: null, moveCost: 1}));
    expect(cards[1].variants).toEqual(MIDDLE.variants);
    expect([cards[0], cards[2]]).toEqual([FIRST, LAST]);
  });

  it.each<[keyof LorcanaJSONCard]>([['scanLanguage'], ['rarity']])('removes %s when the edit sets it to null', (key) => {
    expect(cardsOf(editMiddle({[key]: null}))[1]).not.toHaveProperty(key);
  });

  it.each([['fr'], ['it']])('writes the scan language %s, a code the app accepts', (code) => {
    expect(cardsOf(editMiddle({scanLanguage: code}))[1].scanLanguage).toBe(code);
  });

  const DUPLICATED = serialize({...FILE, cards: [FIRST, MIDDLE, {...LAST, id: MIDDLE.id}]});
  const COMPACT = `${JSON.stringify(FILE)}\n`;

  it.each<[string, string, PreviewCardEdit, RegExp]>([
    ['the file is not JSON', 'not json', {id: 14002, changes: {cost: 4}}, /not valid JSON/],
    ['the file has no cards array', serialize({metadata: {}}), {id: 14002, changes: {cost: 4}}, /no cards array/],
    ['the file is null', serialize(null), {id: 14002, changes: {cost: 4}}, /no cards array/],
    ['its cards are not an array', serialize({cards: {}}), {id: 14002, changes: {cost: 4}}, /no cards array/],
    ['the file is compact', COMPACT, {id: 14002, changes: {cost: 4}}, /not laid out/],
    ['the file lacks its last newline', TEXT.trimEnd(), {id: 14002, changes: {cost: 4}}, /not laid out/],
    ['no entry has the id', TEXT, {id: 14999, changes: {cost: 4}}, /has no card 14999/],
    ['two entries have the id', DUPLICATED, {id: 14002, changes: {cost: 4}}, /holds card 14002 2 times/],
    ['the edit is empty', TEXT, {id: 14002, changes: {}}, /changes nothing/],
    ['the edit changes nothing', TEXT, {id: 14002, changes: {version: undefined}}, /changes nothing/],
    ['it changes the id', TEXT, {id: 14002, changes: untyped({id: 14004})}, /can't change id/],
    ['it changes the number', TEXT, {id: 14002, changes: untyped({number: 4})}, /can't change number/],
    ['it changes the set', TEXT, {id: 14002, changes: untyped({setCode: '13'})}, /can't change setCode/],
    ['it changes the variants', TEXT, {id: 14002, changes: untyped({variants: []})}, /can't change variants/],
    ['it removes the name', TEXT, {id: 14002, changes: {name: null}}, /every card needs name/],
    ['it removes the type', TEXT, {id: 14002, changes: {cost: 4, type: null}}, /every card needs type/],
    ['it marks the scan English', TEXT, {id: 14002, changes: {scanLanguage: 'en'}}, /two-letter code other than en/],
    ['its scan language is not two letters', TEXT, {id: 14002, changes: {scanLanguage: 'fra'}}, /not "fra"/],
    ['its scan language is in capitals', TEXT, {id: 14002, changes: {scanLanguage: 'FR'}}, /not "FR"/],
  ])('refuses the edit when %s', (_reason, text, edit, refusal) => {
    const replace = () => replaceCardInPreviewJson(text, edit);
    expect(replace).toThrow(/^previewCards\.json/);
    expect(replace).toThrow(refusal);
  });

  // Edit writes what buildPreviewCard builds (R4-2a), so a key it adds must be
  // one Edit may change, or every save that touches it would be refused.
  const FORM: RevealCardForm = {
    collectorNumber: '2',
    name: 'Middle',
    version: 'Now',
    rarity: 'Rare',
    franchise: 'Coco',
    cost: '3',
    ink: 'Amber',
    ink2: 'Steel',
    inkwell: true,
    type: 'Character',
    strength: '2',
    willpower: '3',
    lore: '1',
    moveCost: '2',
    subtypes: 'Storyborn, Hero',
    keywords: 'Evasive',
    fullText: 'Evasive\nWhen you play this character, draw a card.',
    scanLanguage: 'ja',
  };

  it.each<[CardType]>([['Character'], ['Location']])(
    'may change every key buildPreviewCard writes for a %s, except id, setCode and number',
    (type) => {
      const keys = Object.keys(buildPreviewCard({...FORM, type}));
      expect(keys.filter((key) => !(EDITABLE_CARD_KEYS as readonly string[]).includes(key))).toEqual([
        'id',
        'setCode',
        'number',
      ]);
    },
  );
});

// The file as a graduation leaves it: the app's graduate-canonical-set.mjs
// writes a metadata block and the set's sets entry, and empties the cards. Set
// 14 graduated on 2026-10-14 (Doberjohn/inkweave#780), so until set 15's
// reveals reach the pin, the pinned file is this one, and the two cases below
// run the same input.
const GRADUATED = serialize({...(JSON.parse(PINNED_PREVIEW_CARDS_JSON) as object), cards: []});

// The pinned file's own layout, filled as a reveal season fills it, with
// MIDDLE's variants: so a file that holds cards stays under test while the
// pinned one is empty.
const POPULATED = serialize({...(JSON.parse(PINNED_PREVIEW_CARDS_JSON) as object), cards: [FIRST, MIDDLE, LAST]});

// A card with a variant printing, inserted when a file has none, as the
// graduated file has none.
const LOCAL_CARD: LorcanaJSONCard = {
  id: 13099,
  name: 'Test',
  fullName: 'Test',
  cost: 1,
  color: 'Amber',
  inkwell: true,
  type: 'Action',
  variants: [{id: 13299, rarity: 'Enchanted', number: 299}],
};

/** The file and its first card with variants, or the file with LOCAL_CARD inserted when no card has any. */
function withVariants({text}: {text: string}): {text: string; card: LorcanaJSONCard} {
  const card = cardsOf(text).find((entry) => entry.variants?.length);
  if (card) return {text, card};
  return {text: insertCardIntoPreviewJson(text, LOCAL_CARD), card: LOCAL_CARD};
}

// No counts or ids from the file are written down here: each case finds its
// card, and the pinned case fails on a pin bump that changes the file's layout.
describe.each([
  {state: 'as pinned', text: PINNED_PREVIEW_CARDS_JSON},
  {state: 'as graduation leaves it', text: GRADUATED},
  {state: 'as a reveal season fills it', text: POPULATED},
])('replaceCardInPreviewJson on previewCards.json $state', (file) => {
  it("returns the file byte for byte when an edit sets a card's own values", () => {
    const {text, card} = withVariants(file);
    expect(replaceCardInPreviewJson(text, {id: card.id, changes: ownValues(card)})).toBe(text);
  });

  it('edits a card that has variants and keeps them, with every other card as it was', () => {
    const {text, card} = withVariants(file);
    const changes: PreviewCardChanges = {name: 'Renamed', fullName: 'Renamed', version: null, scanLanguage: 'fr'};
    const [before, after] = [cardsOf(text), cardsOf(replaceCardInPreviewJson(text, {id: card.id, changes}))];
    const index = before.findIndex((entry) => entry.id === card.id);
    expect(after[index]).toEqual(mergeCardChanges(card, changes));
    expect(after[index].variants).toEqual(card.variants);
    expect(after.filter((_, i) => i !== index)).toEqual(before.filter((_, i) => i !== index));
  });
});
