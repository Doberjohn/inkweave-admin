import {describe, it, expect} from 'vitest';
import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {PINNED_PREVIEW_CARDS_JSON, REVEAL_ID_BASE, inkBlock} from '../../../app-bridge';
import {buildPreviewCard, type RevealCardForm} from '../../reveal/buildPreviewCard';
import type {ScanLanguage} from '../../reveal/constants';
import {
  cardChanges,
  cardTag,
  changeRows,
  editKindOf,
  formFromPreviewCard,
  searchCards,
  validateCardEdit,
  withBranchPreviews,
} from '../cardEdit';

// Taken from the season's constants so these fixtures stay valid every season.
const RUBY_NUMBER = inkBlock('Ruby').first;
const MEI_ID = REVEAL_ID_BASE + RUBY_NUMBER;

function form(overrides: Partial<RevealCardForm> = {}): RevealCardForm {
  return {
    collectorNumber: String(RUBY_NUMBER),
    name: 'Mei',
    version: 'Red Panda',
    rarity: 'Rare',
    franchise: 'Turning Red',
    cost: '4',
    ink: 'Ruby',
    ink2: '',
    inkwell: true,
    type: 'Character',
    strength: '3',
    willpower: '5',
    lore: '2',
    moveCost: '',
    subtypes: 'Storyborn, Hero',
    keywords: 'Singer 5\nEvasive',
    fullText: 'Singer 5\nEvasive\nPANDA POWER When you play this character, gain 1 lore.',
    scanLanguage: 'en',
    ...overrides,
  };
}

/** A previewCards.json entry as New reveal writes it. */
const entry = (overrides: Partial<RevealCardForm> = {}): LorcanaJSONCard => buildPreviewCard(form(overrides));
const MEI = entry();

const PINNED_CARDS = (JSON.parse(PINNED_PREVIEW_CARDS_JSON) as {cards: LorcanaJSONCard[]}).cards;

function card(p: Partial<LorcanaCard>): LorcanaCard {
  return {id: '1', name: 'X', fullName: 'X', cost: 1, ink: 'Amber', inkwell: true, type: 'Character', ...p};
}

describe('formFromPreviewCard', () => {
  it('turns an entry back into the form New reveal built it from', () => {
    expect(formFromPreviewCard(MEI)).toEqual(form({subtypes: 'Storyborn, Hero'}));
  });

  it('splits a dual ink into the two ink fields', () => {
    expect(formFromPreviewCard({...MEI, color: 'Ruby-Sapphire'})).toMatchObject({ink: 'Ruby', ink2: 'Sapphire'});
  });

  it('fills blanks for the fields a card lacks', () => {
    const bare = entry({version: '', rarity: '', franchise: '', subtypes: '', keywords: '', fullText: '', type: 'Action'});
    expect(formFromPreviewCard(bare)).toMatchObject({
      version: '',
      rarity: '',
      franchise: '',
      subtypes: '',
      keywords: '',
      fullText: '',
      strength: '',
      moveCost: '',
    });
  });

  it('keeps a scan language the form does not list', () => {
    expect(formFromPreviewCard({...MEI, scanLanguage: 'fr'}).scanLanguage).toBe('fr' as ScanLanguage);
  });
});

// The pin's previewCards.json is what Edit card opens. A pin bump whose cards the form
// can't hold, or that fail New reveal's checks, fails here. After a set graduates the
// file has no cards, and this passes trivially.
describe('every pinned preview card', () => {
  it('opens for field edits, passes the checks with no image, and changes nothing unedited', () => {
    const ids = new Set(PINNED_CARDS.map((c) => c.id));
    const failing = PINNED_CARDS.filter((pinned) => {
      const loaded = formFromPreviewCard(pinned);
      const fine = editKindOf(pinned) === 'fields' && validateCardEdit(loaded, ids, pinned.id, null).ok;
      return !fine || Object.keys(cardChanges(pinned, loaded, loaded)).length > 0;
    });
    expect(failing.map((c) => c.id)).toEqual([]);
  });
});

describe('cardChanges', () => {
  const before = formFromPreviewCard(MEI);
  const changesFor = (patch: Partial<RevealCardForm>, loaded = MEI) =>
    cardChanges(loaded, formFromPreviewCard(loaded), {...formFromPreviewCard(loaded), ...patch});

  it('renames with the name keys only, never the id', () => {
    expect(changesFor({name: 'Meilin'})).toEqual({name: 'Meilin', fullName: 'Meilin - Red Panda'});
  });

  it.each([
    {change: 'an English scan', patch: {scanLanguage: 'en' as const}, loaded: entry({scanLanguage: 'ja'}), expected: {scanLanguage: null}},
    {change: 'a cleared rarity', patch: {rarity: ''}, loaded: MEI, expected: {rarity: null}},
    {change: 'emptied keywords', patch: {keywords: ''}, loaded: MEI, expected: {abilities: null}},
    {change: 'a whitespace-only text edit', patch: {fullText: `${MEI.fullText}  \n`}, loaded: MEI, expected: {}},
  ])('writes $expected for $change', ({patch, loaded, expected}) => {
    expect(changesFor(patch, loaded)).toEqual(expected);
  });

  it("drops the stats a new type doesn't print, and adds none the card never had", () => {
    expect(changesFor({type: 'Action'})).toEqual({type: 'Action', strength: null, willpower: null, lore: null});
  });

  it('refuses a changed collector number', () => {
    expect(() => cardChanges(MEI, before, {...before, collectorNumber: '999'})).toThrow(/collector number/);
  });
});

describe('validateCardEdit', () => {
  const ids = new Set([MEI_ID, MEI_ID + 1]);

  it("passes the card's own id and no image", () => {
    expect(validateCardEdit(form(), ids, MEI_ID, null)).toEqual({ok: true, errors: {}});
  });

  it('still refuses a staged file that is not an image', () => {
    expect(validateCardEdit(form(), ids, MEI_ID, 'mei.gif').errors.image).toMatch(/jpg, jpeg, png, or webp/);
  });

  it.each([
    {check: 'a spelled-out glyph word', patch: {fullText: 'Gain 2 Lore.'}, key: 'fullText'},
    {check: 'a missing stat', patch: {lore: ''}, key: 'lore'},
    {check: "another block's ink", patch: {ink: 'Amber' as const}, key: 'ink'},
  ])('still fails $check', ({patch, key}) => {
    expect(validateCardEdit(form(patch), ids, MEI_ID, null).errors).toHaveProperty(key);
  });
});

describe('editKindOf', () => {
  it('opens a numbered card of the reveal set for field edits', () => {
    expect(editKindOf(MEI)).toBe('fields');
  });

  it.each([
    {card: 'a released card', entry: undefined},
    {card: 'an entry with no number', entry: {...MEI, number: undefined}},
    {card: "another set's preview card", entry: {...MEI, setCode: '13'}},
    {card: 'an id its number does not give', entry: {...MEI, id: MEI_ID + 500}},
    {card: 'an entry the form cannot write back', entry: {...MEI, abilities: [{type: 'triggered', name: 'PANDA POWER', fullText: 'PANDA POWER …'}]}},
  ])('keeps $card image-only', ({entry: e}) => {
    expect(editKindOf(e)).toBe('image');
  });
});

describe('changeRows', () => {
  it('labels each change and shows a missing value as a dash', () => {
    expect(changeRows(MEI, {rarity: null, version: 'Panda'}, null)).toEqual([
      {label: 'Version', from: 'Red Panda', to: 'Panda'},
      {label: 'Rarity', from: 'Rare', to: '—'},
    ]);
  });

  it('reads inkwell, keywords and scan language as words', () => {
    const rows = changeRows(MEI, {inkwell: false, abilities: null, scanLanguage: 'ja'}, null);
    expect(rows.map((r) => [r.from, r.to])).toEqual([
      ['Inkable', 'Uninkable'],
      ['Singer 5, Evasive', '—'],
      ['English', 'Japanese'],
    ]);
  });

  it('gives derived keys no row and puts the staged image last', () => {
    const rows = changeRows(MEI, {name: 'Meilin', fullName: 'Meilin - Red Panda'}, 'mei.png');
    expect(rows).toEqual([
      {label: 'Name', from: 'Mei', to: 'Meilin'},
      {label: 'Image', from: 'current', to: 'mei.png'},
    ]);
  });
});

describe('searchCards', () => {
  const ANNA = card({id: '14001', name: 'Anna', fullName: 'Anna - Heir to Arendelle'});
  const ELSA = card({id: '9002', name: 'Elsa', fullName: 'Elsa - Snow Queen'});
  const HANNA = card({id: '9003', name: 'Hanna', fullName: 'Hanna - Ice Skater'});

  it('matches names and ids, full-name prefixes first', () => {
    const ids = (query: string) => searchCards([HANNA, ANNA, ELSA], query, new Set()).rows.map((r) => r.card.id);
    expect(ids('anna')).toEqual(['14001', '9003']);
    expect(ids('9002')).toEqual(['9002']);
  });

  it('caps the rows but counts every match', () => {
    const many = Array.from({length: 50}, (_, i) => card({id: String(i), fullName: `Zz ${i}`}));
    const {rows, total} = searchCards(many, 'zz', new Set());
    expect(rows).toHaveLength(40);
    expect(total).toBe(50);
  });

  it("tags the branch's preview cards by their numeric ids", () => {
    const {rows} = searchCards([ANNA, ELSA], '', new Set([14001]));
    expect(rows.map((r) => r.tag)).toEqual(['Preview', 'Released']);
    expect(cardTag(ELSA, new Set([9002]))).toBe('Preview');
  });
});

describe('withBranchPreviews', () => {
  it("adds the branch's preview cards the live list lacks, once", () => {
    const live = [card({id: String(MEI_ID), fullName: 'Mei - Red Panda'})];
    const fresh = {...MEI, id: MEI_ID + 1, number: RUBY_NUMBER + 1, name: 'Ming', fullName: 'Ming - Mother'};
    expect(withBranchPreviews(live, [MEI, fresh]).map((c) => [c.id, c.fullName])).toEqual([
      [String(MEI_ID), 'Mei - Red Panda'],
      [String(MEI_ID + 1), 'Ming - Mother'],
    ]);
  });
});
