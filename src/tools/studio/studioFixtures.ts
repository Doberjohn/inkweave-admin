import {transformCard, type LorcanaCard, type LorcanaJSONCard} from 'inkweave-synergy-engine';
import {REVEAL_ID_BASE, REVEAL_SET_CODE, REVEAL_SET_NUMBER, SET_NAMES, SET_TOTAL, inkBlock} from '../../app-bridge';

/*
 * Card studio fixtures, shared by the studio's tests and stories, as
 * analytics/cards/cardFixtures.ts is for /cards. They live in a plain module:
 * Storybook reads every named export of a .stories.tsx file as a story, and a
 * story can't import a test file. Nothing in the app imports this file, so the
 * build leaves it out. Every builder takes one argument: an object, or for
 * previewFileText the list of cards. R4-2a writes it; later tasks add to it.
 */

/** Ruby's first number, from the season's own ink blocks, so the fixtures stay valid every season. */
const RUBY_NUMBER = inkBlock('Ruby').first;

/**
 * A previewCards.json entry as the app writes it: Mei, a numbered Ruby
 * Character of the reveal set with one keyword ability and a line of text. It
 * round-trips through the form. `overrides` replace keys; to give an entry
 * another number, set `id` and `number` together (id = REVEAL_ID_BASE + number).
 */
export function previewEntry(overrides: Partial<LorcanaJSONCard> = {}): LorcanaJSONCard {
  return {
    id: REVEAL_ID_BASE + RUBY_NUMBER,
    name: 'Mei',
    fullName: 'Mei - Red Panda',
    cost: 4,
    color: 'Ruby',
    inkwell: true,
    type: 'Character',
    setCode: REVEAL_SET_CODE,
    number: RUBY_NUMBER,
    version: 'Red Panda',
    rarity: 'Rare',
    franchise: 'Turning Red',
    subtypes: ['Storyborn', 'Hero'],
    abilities: [{type: 'keyword', keyword: 'Singer', keywordValue: '5', fullText: 'Singer 5'}],
    fullText: 'Singer 5\nPANDA POWER When you play this character, draw a card.',
    fullTextSections: ['Singer 5', 'PANDA POWER When you play this character, draw a card.'],
    strength: 3,
    willpower: 5,
    lore: 2,
    ...overrides,
  };
}

/** A previewCards.json text holding `cards`, laid out as the app writes it, so it round-trips. */
export function previewFileText(cards: readonly LorcanaJSONCard[]): string {
  const sets = {[REVEAL_SET_CODE]: {name: SET_NAMES[REVEAL_SET_CODE], number: REVEAL_SET_NUMBER}};
  return JSON.stringify({metadata: {language: 'en'}, sets, cards}, null, 2) + '\n';
}

/** A card as the card list holds it; fullName follows name and version. */
export function studioCard(seed: Pick<LorcanaCard, 'id' | 'name'> & Partial<LorcanaCard>): LorcanaCard {
  const {name, version} = seed;
  return {
    fullName: version ? `${name} - ${version}` : name,
    cost: 3,
    ink: 'Amber',
    inkwell: true,
    type: 'Character',
    ...seed,
  };
}

/** The card list's card for an entry, through the engine's transformCard (the app's loader adds only its art). */
export function cardOf(entry: LorcanaJSONCard): LorcanaCard {
  const card = transformCard(entry);
  if (!card) throw new Error(`fixture ${entry.id} has an ink or type the engine refuses`);
  return card;
}

/** One of Ruby's next numbers, with the matching id. */
function ruby(offset: number): Pick<LorcanaJSONCard, 'id' | 'number'> {
  return {id: REVEAL_ID_BASE + RUBY_NUMBER + offset, number: RUBY_NUMBER + offset};
}

/** Mei: the base entry. */
export const PREVIEW_ENTRY = previewEntry();

/** Two inks, which the pinned file has none of (R-75). */
export const DUAL_INK_ENTRY = previewEntry({...ruby(1), name: 'Priya', fullName: 'Priya - Panda Fan', version: 'Panda Fan', color: 'Ruby-Sapphire'});

/** A card with an Epic printing past the set, which Edit never touches (R-2, R-67). */
export const VARIANTS_ENTRY = previewEntry({
  ...ruby(2),
  name: 'Ming',
  fullName: 'Ming - Watchful Mother',
  version: 'Watchful Mother',
  variants: [{id: REVEAL_ID_BASE + SET_TOTAL + 1, rarity: 'Epic', number: SET_TOTAL + 1}],
});

/** A card whose only scan is Japanese. */
export const JA_SCAN_ENTRY = previewEntry({...ruby(3), name: 'Miriam', fullName: 'Miriam - Bandmate', version: 'Bandmate', scanLanguage: 'ja'});

/** A scan language SCAN_LANGUAGES doesn't list, marked by hand (R-60). */
export const UNLISTED_SCAN_ENTRY = previewEntry({...ruby(4), name: 'Abby', fullName: 'Abby - Drummer', version: 'Drummer', scanLanguage: 'zh'});

/** R-65: revealed with no collector number yet, so its id sits in the +900 band. */
export const UNNUMBERED_ENTRY = previewEntry({id: REVEAL_ID_BASE + 901, number: undefined, name: 'Tyler', fullName: 'Tyler - Party Host', version: 'Party Host'});

/** R-65: an entry of the set before the pin's. */
export const OTHER_SET_ENTRY = previewEntry({
  id: (REVEAL_SET_NUMBER - 1) * 1000 + RUBY_NUMBER,
  setCode: String(REVEAL_SET_NUMBER - 1),
  name: 'Sun Yee',
  fullName: 'Sun Yee - Ancestor',
  version: 'Ancestor',
});

/** R-65: a named ability beside the keyword, which the form has no field for. */
export const NAMED_ABILITY_ENTRY = previewEntry({
  ...ruby(5),
  name: 'Jin',
  fullName: 'Jin - Steady Father',
  version: 'Steady Father',
  abilities: [
    {type: 'keyword', keyword: 'Singer', keywordValue: '5', fullText: 'Singer 5'},
    {
      type: 'triggered',
      name: 'PANDA POWER',
      effect: 'When you play this character, draw a card.',
      fullText: 'PANDA POWER When you play this character, draw a card.',
    },
  ],
});

/** A released card (set 9), which only the card list holds (R-61, R-71). */
export const RELEASED_CARD = studioCard({id: '1001', name: 'Lantern Keeper', version: 'Night Watch', setCode: '9', setNumber: 12, rarity: 'Common'});

/** A name printed with ’, as two pinned preview names are (R4-2b's search folds it). */
export const CURLY_APOSTROPHE_CARD = studioCard({
  id: String(REVEAL_ID_BASE + RUBY_NUMBER + 6),
  name: 'Peter Pan’s Shadow',
  version: 'Elusive Prankster',
  ink: 'Ruby',
  setCode: REVEAL_SET_CODE,
  setNumber: RUBY_NUMBER + 6,
});

/**
 * The card list's card for a preview entry, with its art: cardOf, plus the
 * imageUrl the app's loader gives a preview card (loader.ts's
 * resolveImageUrl). Edit card's live preview shows it until an image is staged.
 */
export function listCard(entry: LorcanaJSONCard): LorcanaCard {
  return {...cardOf(entry), imageUrl: `/card-images-preview/${entry.id}.avif`};
}

/** A released Song that PREVIEW_ENTRY's Singer 5 can sing, so Edit card's synergies have one to find (R4-4b). */
export const RELEASED_SONG = cardOf({
  id: 1002,
  name: 'Let It Go',
  fullName: 'Let It Go',
  cost: 5,
  color: 'Amethyst',
  inkwell: true,
  type: 'Action',
  subtypes: ['Song'],
  fullText: '(A character with cost 5 or more can ⟳ to sing this song for free.)\nDraw 2 cards.',
  setCode: '9',
  number: 81,
  rarity: 'Rare',
});

/** previewCards.json on the branch for the Edit controller's tests (R4-4b): two editable entries, then R-65's three. */
export const BRANCH_ENTRIES: LorcanaJSONCard[] = [PREVIEW_ENTRY, DUAL_INK_ENTRY, UNNUMBERED_ENTRY, NAMED_ABILITY_ENTRY, OTHER_SET_ENTRY];

/** The card list over them: the released cards, then the branch entries with their art, preview cards last as the app's loader orders them. */
export const STUDIO_CARDS: LorcanaCard[] = [RELEASED_CARD, RELEASED_SONG, ...BRANCH_ENTRIES.map(listCard)];
