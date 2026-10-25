import {describe, expect, it} from 'vitest';
import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import {PINNED_PREVIEW_CARDS_JSON, REVEAL_ID_BASE, REVEAL_SET_CODE, inkBlock} from '../../../app-bridge';
import {buildPreviewCard, type RevealCardForm} from '../../reveal/buildPreviewCard';
import {EDITABLE_CARD_KEYS, mergeCardChanges, type PreviewCardChanges} from '../../reveal/replaceCardInPreviewJson';
import {validateRevealCardForm} from '../../reveal/validateForm';
import {
  FIELD_KEYS,
  IMAGE_ONLY_NOTES,
  cardChanges,
  editKindOf,
  formFromPreviewCard,
  hasEdits,
  roundTrips,
  validateCardEdit,
  type CardKind,
} from '../cardEdit';
import {
  DUAL_INK_ENTRY,
  JA_SCAN_ENTRY,
  NAMED_ABILITY_ENTRY,
  OTHER_SET_ENTRY,
  PREVIEW_ENTRY,
  UNLISTED_SCAN_ENTRY,
  UNNUMBERED_ENTRY,
  VARIANTS_ENTRY,
  previewEntry,
} from '../studioFixtures';

const AMBER_NUMBER = inkBlock('Amber').first;

/** An action with nothing optional: no version, rarity, franchise, subtypes, abilities, text or stats. */
const BARE: LorcanaJSONCard = {
  id: REVEAL_ID_BASE + AMBER_NUMBER,
  name: 'Tea Party',
  fullName: 'Tea Party',
  cost: 2,
  color: 'Amber',
  inkwell: false,
  type: 'Action',
  setCode: REVEAL_SET_CODE,
  number: AMBER_NUMBER,
};

/** A Location, the one type that prints a move cost. */
const LOCATION_ENTRY = previewEntry({type: 'Location', strength: undefined, moveCost: 2});

const FORM = formFromPreviewCard(PREVIEW_ENTRY);
const FIELDS: CardKind = {kind: 'fields'};

/**
 * One edit per form field but the locked number, each to a value that builds a
 * different card, on an entry that prints the field. Each edits its field alone,
 * so a key the edit changes that FIELD_KEYS leaves off its field goes missing
 * from the change. A row pins only the keys its own edit changes: the type row
 * pins strength, which a Location drops, and the cardChanges table's type rows
 * pin willpower, lore and moveCost.
 */
const ONE_FIELD_EDITS: readonly [string, Partial<RevealCardForm>, LorcanaJSONCard][] = [
  ['name', {name: 'Mei Lee'}, PREVIEW_ENTRY],
  ['version', {version: 'Panda Form'}, PREVIEW_ENTRY],
  ['rarity', {rarity: 'Common'}, PREVIEW_ENTRY],
  ['franchise', {franchise: 'Pixar Shorts'}, PREVIEW_ENTRY],
  ['cost', {cost: '6'}, PREVIEW_ENTRY],
  ['ink', {ink: 'Amber'}, PREVIEW_ENTRY],
  ['ink2', {ink2: 'Sapphire'}, PREVIEW_ENTRY],
  ['inkwell', {inkwell: false}, PREVIEW_ENTRY],
  ['type', {type: 'Location'}, PREVIEW_ENTRY],
  ['strength', {strength: '7'}, PREVIEW_ENTRY],
  ['willpower', {willpower: '8'}, PREVIEW_ENTRY],
  ['lore', {lore: '3'}, PREVIEW_ENTRY],
  ['moveCost', {moveCost: '4'}, LOCATION_ENTRY],
  ['subtypes', {subtypes: 'Storyborn, Villain'}, PREVIEW_ENTRY],
  ['keywords', {keywords: 'Evasive'}, PREVIEW_ENTRY],
  ['fullText', {fullText: 'Evasive'}, PREVIEW_ENTRY],
  ['scanLanguage', {scanLanguage: 'ja'}, PREVIEW_ENTRY],
];

/** The loaded card's form with `patch` typed over it, diffed against the card. */
function changesTo(patch: Partial<RevealCardForm>, loaded: LorcanaJSONCard = PREVIEW_ENTRY): PreviewCardChanges {
  const before = formFromPreviewCard(loaded);
  return cardChanges(loaded, before, {...before, ...patch});
}

/** The keys Edit writes, in EDITABLE_CARD_KEYS order, without those the card lacks: what a commit would write. */
function editable(card: LorcanaJSONCard): string {
  return JSON.stringify(EDITABLE_CARD_KEYS.flatMap((key) => (card[key] === undefined ? [] : [[key, card[key]]])));
}

/** Every field a person types, with spaces added round it: a buildPreviewCard no-op. Rarity is a picker. */
function spaced(form: RevealCardForm): RevealCardForm {
  const typed = ['name', 'version', 'franchise', 'cost', 'strength', 'willpower', 'lore', 'moveCost', 'subtypes', 'keywords', 'fullText'] as const;
  return {...form, ...Object.fromEntries(typed.map((field) => [field, ` ${form[field]}  `]))};
}

// The pinned app's previewCards.json. Set 14's graduation emptied it on 2026-10-14
// (Doberjohn/inkweave#780), so until set 15's reveals reach the pin the walk takes
// the fixtures that open with fields, rather than pass over no cards.
const PINNED = (JSON.parse(PINNED_PREVIEW_CARDS_JSON) as {cards: LorcanaJSONCard[]}).cards;
const WALKED: readonly LorcanaJSONCard[] =
  PINNED.length > 0 ? PINNED : [PREVIEW_ENTRY, DUAL_INK_ENTRY, VARIANTS_ENTRY, JA_SCAN_ENTRY, UNLISTED_SCAN_ENTRY, BARE];

describe('every pinned preview card', () => {
  it('builds back from its form with every editable key unchanged', () => {
    expect(WALKED.length).toBeGreaterThan(0);
    const lossy = WALKED.filter((card) => editable(buildPreviewCard(formFromPreviewCard(card))) !== editable(card));
    expect(lossy.map((card) => card.id)).toEqual([]);
  });

  it('opens with editable fields, and passes validateCardEdit with no image', () => {
    expect(WALKED.filter((card) => editKindOf(card).kind !== 'fields').map((card) => card.id)).toEqual([]);
    expect(WALKED.filter((card) => !validateCardEdit(formFromPreviewCard(card), null).ok).map((card) => card.id)).toEqual([]);
  });

  it('has no edits when every typed field only gains spaces', () => {
    const edited = WALKED.filter((card) => {
      const form = formFromPreviewCard(card);
      return hasEdits({changes: cardChanges(card, form, spaced(form)), imageName: null});
    });
    expect(edited.map((card) => card.id)).toEqual([]);
  });
});

describe('formFromPreviewCard', () => {
  it('gives the form New card would build the card from', () => {
    expect(FORM).toEqual({
      collectorNumber: String(PREVIEW_ENTRY.number),
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
      keywords: 'Singer 5',
      fullText: 'Singer 5\nPANDA POWER When you play this character, draw a card.',
      scanLanguage: 'en',
    });
  });

  it('splits a dual ink into ink and ink2', () => {
    expect(formFromPreviewCard(DUAL_INK_ENTRY)).toMatchObject({ink: 'Ruby', ink2: 'Sapphire'});
  });

  it('puts each keyword ability on its own line, with its value', () => {
    const abilities = [
      {type: 'keyword', keyword: 'Evasive', fullText: 'Evasive'},
      {type: 'keyword', keyword: 'Shift', keywordValue: '3', fullText: 'Shift 3'},
    ];
    expect(formFromPreviewCard(previewEntry({abilities})).keywords).toBe('Evasive\nShift 3');
  });

  it('leaves blank what the entry lacks', () => {
    expect(formFromPreviewCard(BARE)).toMatchObject({
      version: '',
      rarity: '',
      franchise: '',
      subtypes: '',
      keywords: '',
      fullText: '',
      strength: '',
      willpower: '',
      lore: '',
      moveCost: '',
      ink2: '',
      inkwell: false,
      type: 'Action',
      scanLanguage: 'en',
    });
  });

  it.each([
    ['listed', JA_SCAN_ENTRY, 'ja'],
    ['unlisted', UNLISTED_SCAN_ENTRY, 'zh'],
  ])('keeps a %s scan language as it is, and builds it back', (_case, entry, code) => {
    expect(formFromPreviewCard(entry).scanLanguage).toBe(code);
    expect(buildPreviewCard(formFromPreviewCard(entry)).scanLanguage).toBe(code);
  });
});

describe('editKindOf and roundTrips', () => {
  it.each<[string, LorcanaJSONCard | null, CardKind]>([
    ['a numbered entry of the reveal set', PREVIEW_ENTRY, FIELDS],
    ['an entry with nothing optional', BARE, FIELDS],
    ['a dual-ink entry', DUAL_INK_ENTRY, FIELDS],
    ['an entry with a printing, which Edit never touches', VARIANTS_ENTRY, FIELDS],
    ['an unlisted scan language', UNLISTED_SCAN_ENTRY, FIELDS],
    ['a released card, which has no entry', null, {kind: 'image', reason: 'released'}],
    ['an entry with no collector number', UNNUMBERED_ENTRY, {kind: 'image', reason: 'unnumbered'}],
    ['an entry of another set', OTHER_SET_ENTRY, {kind: 'image', reason: 'other-set'}],
    ['a named ability', NAMED_ABILITY_ENTRY, {kind: 'image', reason: 'unrepresentable'}],
    [
      'a keyword value that is not a number',
      previewEntry({abilities: [{type: 'keyword', keyword: 'Shift', keywordValue: 'X', fullText: 'Shift X'}]}),
      {kind: 'image', reason: 'unrepresentable'},
    ],
    ["sections that aren't the text's lines", previewEntry({fullTextSections: ['Singer 5 PANDA POWER']}), {kind: 'image', reason: 'unrepresentable'}],
    ["a stat its type doesn't print", previewEntry({type: 'Action'}), {kind: 'image', reason: 'unrepresentable'}],
    ['an English mark', previewEntry({scanLanguage: 'en'}), {kind: 'image', reason: 'unrepresentable'}],
    // The reasons are checked in order: released, other set, unnumbered, then unrepresentable.
    ['another set with no number: the set comes first', {...OTHER_SET_ENTRY, number: undefined}, {kind: 'image', reason: 'other-set'}],
    [
      'another set with a named ability: the set comes first',
      {...OTHER_SET_ENTRY, abilities: NAMED_ABILITY_ENTRY.abilities},
      {kind: 'image', reason: 'other-set'},
    ],
    [
      'no number and a named ability: the number comes first',
      {...UNNUMBERED_ENTRY, abilities: NAMED_ABILITY_ENTRY.abilities},
      {kind: 'image', reason: 'unnumbered'},
    ],
  ])('%s', (_case, entry, kind) => {
    expect(editKindOf(entry)).toEqual(kind);
  });

  // A hand edit can break the entry's own type, which the form can't read.
  it.each<[string, LorcanaJSONCard]>([
    ['no color', previewEntry({color: undefined})],
    ['no name', previewEntry({name: undefined})],
    ['subtypes that are not a list', previewEntry({subtypes: 'Storyborn' as unknown as string[]})],
  ])('fails closed on an entry with %s: image-only, never a throw', (_case, entry) => {
    expect(roundTrips(entry)).toBe(false);
    expect(editKindOf(entry)).toEqual({kind: 'image', reason: 'unrepresentable'});
  });

  it('round-trips an entry the form holds whole, whatever its set or number', () => {
    expect([PREVIEW_ENTRY, OTHER_SET_ENTRY, UNNUMBERED_ENTRY].map(roundTrips)).toEqual([true, true, true]);
    expect(roundTrips(NAMED_ABILITY_ENTRY)).toBe(false);
  });

  it('words each reason as the studio shows it (R-61, R-65)', () => {
    expect(IMAGE_ONLY_NOTES).toEqual({
      released: "Card data comes from LorcanaJSON: only the image and the printings' versions can be changed here.",
      unnumbered: 'No collector number yet: numbering it changes its id, which goes by PR.',
      'other-set': `Admin's pin names set ${REVEAL_SET_CODE}; bump the pin to edit this card's fields.`,
      unrepresentable: "This entry holds data the form can't.",
    });
  });
});

describe('cardChanges', () => {
  it('reaches every editable key from some form field', () => {
    expect(new Set(Object.values(FIELD_KEYS).flat())).toEqual(new Set(EDITABLE_CARD_KEYS));
  });

  it('edits every field but the locked number alone below', () => {
    const edited = ONE_FIELD_EDITS.flatMap(([, patch]) => Object.keys(patch));
    expect(edited).toEqual(Object.keys(FIELD_KEYS).filter((field) => field !== 'collectorNumber'));
  });

  it.each(ONE_FIELD_EDITS)('turns an edit of %s alone into the card the form builds', (_field, patch, loaded) => {
    const after = {...formFromPreviewCard(loaded), ...patch};
    const changes = changesTo(patch, loaded);
    expect(changes).not.toEqual({});
    expect(editable(mergeCardChanges(loaded, changes))).toBe(editable(buildPreviewCard(after)));
  });

  it.each<[string, LorcanaJSONCard, Partial<RevealCardForm>, PreviewCardChanges]>([
    ['a rename keeps the id', PREVIEW_ENTRY, {name: 'Mei Lee', version: 'Panda Form'}, {name: 'Mei Lee', version: 'Panda Form', fullName: 'Mei Lee - Panda Form'}],
    ['a first version', BARE, {version: 'Party Host'}, {version: 'Party Host', fullName: 'Tea Party - Party Host'}],
    ['English drops the mark', JA_SCAN_ENTRY, {scanLanguage: 'en'}, {scanLanguage: null}],
    [
      'English and a rename (admin#14 item 3)',
      JA_SCAN_ENTRY,
      {scanLanguage: 'en', name: 'Miriam Mendelsohn'},
      {scanLanguage: null, name: 'Miriam Mendelsohn', fullName: 'Miriam Mendelsohn - Bandmate'},
    ],
    ['a cleared rarity', PREVIEW_ENTRY, {rarity: ''}, {rarity: null}],
    ['Character to Action', PREVIEW_ENTRY, {type: 'Action'}, {type: 'Action', strength: null, willpower: null, lore: null}],
    ['Character to Location', PREVIEW_ENTRY, {type: 'Location', moveCost: '1'}, {type: 'Location', strength: null, moveCost: 1}],
    // The type field alone drops the move cost: an Action that kept it would reopen image-only.
    ['Location to Action', LOCATION_ENTRY, {type: 'Action'}, {type: 'Action', willpower: null, lore: null, moveCost: null}],
    ['Action to Item, neither with stats', BARE, {type: 'Item'}, {type: 'Item'}],
    ['emptied keywords', PREVIEW_ENTRY, {keywords: ''}, {abilities: null}],
    ['a second ink', PREVIEW_ENTRY, {ink2: 'Sapphire'}, {color: 'Ruby-Sapphire'}],
    ['new card text', PREVIEW_ENTRY, {fullText: 'Singer 5'}, {fullText: 'Singer 5', fullTextSections: ['Singer 5']}],
    ['a cost and Uninkable', PREVIEW_ENTRY, {cost: '5', inkwell: false}, {cost: 5, inkwell: false}],
  ])('%s', (_case, loaded, patch, changes) => {
    expect(changesTo(patch, loaded)).toEqual(changes);
  });

  it.each<[string, LorcanaJSONCard, Partial<RevealCardForm>]>([
    ['"Singer  5"', PREVIEW_ENTRY, {keywords: 'Singer  5'}],
    ['keywords as a list with a trailing comma', PREVIEW_ENTRY, {keywords: 'Singer 5,'}],
    ['subtypes with no space', PREVIEW_ENTRY, {subtypes: 'Storyborn,Hero'}],
    ['subtypes one per line', PREVIEW_ENTRY, {subtypes: 'Storyborn\nHero'}],
    ['spaces round the name and the cost', PREVIEW_ENTRY, {name: ' Mei ', cost: ' 4 '}],
    ['doubled spaces in the text', PREVIEW_ENTRY, {fullText: 'Singer  5\nPANDA POWER  When you play this character, draw a card. '}],
    ['the same type picked again', PREVIEW_ENTRY, {type: 'Character'}],
    ['a stat its type hides', BARE, {strength: '3'}],
  ])('emits nothing for typing that builds the same card: %s', (_case, loaded, patch) => {
    expect(changesTo(patch, loaded)).toEqual({});
  });

  it('refuses a changed collector number: Edit never renumbers', () => {
    expect(() => changesTo({collectorNumber: String(Number(FORM.collectorNumber) + 1)})).toThrow(/renumber/);
  });
});

describe('validateCardEdit', () => {
  it("passes the card's own number, which New card would call taken", () => {
    expect(validateRevealCardForm(FORM, new Set([PREVIEW_ENTRY.id]), null).errors.collectorNumber).toMatch(/already exists/);
    expect(validateCardEdit(FORM, null)).toEqual({ok: true, errors: {}});
  });

  it('takes a staged image, and still checks its extension', () => {
    expect(validateCardEdit(FORM, 'mei.webp').ok).toBe(true);
    expect(validateCardEdit(FORM, 'mei.gif').errors).toEqual({image: 'Image must be jpg, jpeg, png, or webp'});
  });

  it.each<[string, Partial<RevealCardForm>, string]>([
    ['a spelled-out glyph word', {fullText: 'Your Strength wins.'}, 'fullText'],
    ['a stat its type prints, left blank', {lore: ''}, 'lore'],
    ["an ink outside the number's block", {ink: 'Amber'}, 'ink'],
  ])('still refuses %s', (_case, patch, field) => {
    const result = validateCardEdit({...FORM, ...patch}, null);
    expect(result.ok).toBe(false);
    expect(Object.keys(result.errors)).toEqual([field]);
  });
});

describe('hasEdits', () => {
  it.each<[string, PreviewCardChanges, string | null, boolean]>([
    ['nothing', {}, null, false],
    ['a staged image alone', {}, 'mei.webp', true],
    ['a removed key alone', {rarity: null}, null, true],
    ['an undefined value, which is no change', {rarity: undefined}, null, false],
  ])('%s', (_case, changes, imageName, edited) => {
    expect(hasEdits({changes, imageName})).toBe(edited);
  });

  it('counts typing that builds the same card as no edit', () => {
    expect(hasEdits({changes: cardChanges(PREVIEW_ENTRY, FORM, spaced(FORM)), imageName: null})).toBe(false);
  });
});
