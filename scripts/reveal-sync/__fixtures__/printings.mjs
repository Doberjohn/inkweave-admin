/**
 * Set 14's variant printings as illumineertales.com and the app had them on 2026-10-01
 * (issue #22). Each official slot is here for a case the variants command must handle:
 *
 *   #205  an unrevealed slot, which still carries an "ink"
 *   #206  Judy Hopps' Epic, already in the app on its base card
 *   #213  Baymax's Epic, first revealed with an Italian scan (a translation link)
 *   #215  Héctor Rivera's Epic, whose base card the app spells "Hector"
 *   #239  Tiana's Enchanted
 *
 * The cards are copies of the app's own records. allCards.json is trimmed to one canonical
 * card, which carries a printing of its own.
 */
import {SEASON14} from './official.mjs';

/** The season, shaped like web.mjs's loadSeason(). */
export const SEASON = {...SEASON14, idBase: 14000};

export const SLOT_205 = {
  set_number: 205,
  name: '',
  subtitle: '',
  magic_ink_colors: ['EPIC'],
  card_type: '',
  rarity: '',
  keywords: [],
  image_version: '',
  translation_url: '',
  reveal_timestamp: '',
  revealed_by: '',
  revealed_url: '',
};

export const SLOT_206 = {
  set_number: 206,
  name: 'Judy Hopps',
  subtitle: 'Always Vigilant',
  magic_ink_colors: ['AMBER'],
  card_type: 'CHARACTER',
  rarity: 'EPIC',
  keywords: ['Zootopia'],
  image_version: '',
  translation_url: '',
  reveal_timestamp: '2026-10-01T10:00:00.000Z',
  revealed_by: 'NecrossMelphist',
  revealed_url: 'https://www.youtube.com/shorts/5i1GJ5Xlomg',
};

export const SLOT_213 = {
  set_number: 213,
  name: 'Baymax',
  subtitle: 'Lab Assistant',
  magic_ink_colors: ['EMERALD'],
  card_type: 'CHARACTER',
  rarity: 'EPIC',
  keywords: ['Big Hero 6'],
  image_version: 'app',
  translation_url: 'https://www.instagram.com/p/DdnzS5mDe8d/?img_index=1',
  reveal_timestamp: '2026-09-23T07:00:00.000Z',
  revealed_by: 'Disney Lorcana',
  revealed_url: 'https://disneylorcana.com/en-US/',
};

const IGN = {
  reveal_timestamp: '2026-10-01T15:48:00.000Z',
  revealed_by: 'IGN',
  revealed_url:
    'https://www.ign.com/articles/disney-lorcana-hyperia-city-exclusive-hctor-rivera-and-tiana-cards-revealed',
};

export const SLOT_215 = {
  set_number: 215,
  name: 'Héctor Rivera',
  subtitle: 'Street Musician',
  magic_ink_colors: ['RUBY'],
  card_type: 'CHARACTER',
  rarity: 'EPIC',
  keywords: ['Coco'],
  image_version: '',
  translation_url: '',
  ...IGN,
};

export const SLOT_239 = {
  set_number: 239,
  name: 'Tiana',
  subtitle: 'Party Hostess',
  magic_ink_colors: ['STEEL'],
  card_type: 'CHARACTER',
  rarity: 'ENCHANTED',
  keywords: ['The Princess and the Frog'],
  image_version: '',
  translation_url: '',
  ...IGN,
};

/** The official list's JSON holding these set slots. */
export const officialJson = (...slots) => ({'set-14-hyperia-city': slots, promos: []});

/** Every slot above, as the list served them. */
export const OFFICIAL_SLOTS = [SLOT_205, SLOT_206, SLOT_213, SLOT_215, SLOT_239];

export const HECTOR = {
  id: 14117,
  name: 'Hector Rivera',
  fullName: 'Hector Rivera - Street Musician',
  cost: 1,
  color: 'Ruby',
  inkwell: true,
  type: 'Character',
  setCode: '14',
  number: 117,
  version: 'Street Musician',
  rarity: 'Uncommon',
  franchise: 'Coco',
  subtypes: ['Storyborn', 'Mentor'],
  abilities: [{type: 'keyword', keyword: 'Singer', keywordValue: '2', fullText: 'Singer 2'}],
  fullText:
    'Singer 2 (This character counts as cost 2 to sing songs.)\nSTRIKE A CHORD When you play this character, you may put the top card of your deck into your discard.',
  fullTextSections: [
    'Singer 2 (This character counts as cost 2 to sing songs.)',
    'STRIKE A CHORD When you play this character, you may put the top card of your deck into your discard.',
  ],
  strength: 2,
  willpower: 1,
  lore: 1,
};

export const TIANA = {
  id: 14196,
  name: 'Tiana',
  fullName: 'Tiana - Party Hostess',
  cost: 7,
  color: 'Steel',
  inkwell: true,
  type: 'Character',
  setCode: '14',
  number: 196,
  version: 'Party Hostess',
  rarity: 'Legendary',
  franchise: 'The Princess and the Frog',
  subtypes: ['Dreamborn', 'Hero', 'Princess'],
  abilities: [{type: 'keyword', keyword: 'Shift', keywordValue: '5', fullText: 'Shift 5'}],
  fullText:
    'Shift 5 ⬡ (You may pay 5 ⬡ to play this on top of one of your characters named Tiana.)\nIDEAL VENUE When you play this character, you may draw 2 cards, then choose and discard a card. If you discarded a location card this way, you may play it from your discard for free.',
  fullTextSections: [
    'Shift 5 ⬡ (You may pay 5 ⬡ to play this on top of one of your characters named Tiana.)',
    'IDEAL VENUE When you play this character, you may draw 2 cards, then choose and discard a card. If you discarded a location card this way, you may play it from your discard for free.',
  ],
  strength: 4,
  willpower: 5,
  lore: 2,
};

export const JUDY = {
  id: 14024,
  name: 'Judy Hopps',
  fullName: 'Judy Hopps - Always Vigilant',
  cost: 4,
  color: 'Amber',
  inkwell: true,
  type: 'Character',
  setCode: '14',
  number: 24,
  version: 'Always Vigilant',
  rarity: 'Rare',
  franchise: 'Zootopia',
  subtypes: ['Dreamborn', 'Hero', 'Detective'],
  abilities: [{type: 'keyword', keyword: 'Shift', keywordValue: '2', fullText: 'Shift 2'}],
  fullText:
    'Shift 2 ⬡ (You may pay 2 ⬡ to play this on top of one of your characters named Judy Hopps.)\nGOT YOU NOW When you play this character, if you played another character this turn, you may banish chosen character with 5 ¤ or more.',
  fullTextSections: [
    'Shift 2 ⬡ (You may pay 2 ⬡ to play this on top of one of your characters named Judy Hopps.)',
    'GOT YOU NOW When you play this character, if you played another character this turn, you may banish chosen character with 5 ¤ or more.',
  ],
  strength: 4,
  willpower: 4,
  lore: 1,
  variants: [{id: 14206, rarity: 'Epic', number: 206}],
};

/** previewCards.json, parsed, holding these cards. */
export const previewOf = (...cards) => ({
  metadata: {formatVersion: '2.3.2', generatedOn: '2026-09-21T12:00:00', language: 'en'},
  sets: {14: {name: 'Hyperia City', number: 14, type: 'expansion'}},
  cards,
});

/** A canonical Set 9 card with its Epic, as LorcanaJSON's data folds it. */
export const THE_QUEEN = {
  id: 1937,
  name: 'The Queen',
  version: 'Conceited Ruler',
  fullName: 'The Queen - Conceited Ruler',
  cost: 3,
  color: 'Amber',
  inkwell: true,
  type: 'Character',
  subtypes: ['Storyborn', 'Villain', 'Queen', 'Sorcerer'],
  setCode: '9',
  number: 1,
  rarity: 'Rare',
  variants: [
    {
      id: 2159,
      rarity: 'Epic',
      number: 205,
      images: {
        full: 'https://api.lorcana.ravensburger.com/images/en/set9/205_62acc44798cda182710f8be20268c233d776cf58.jpg',
        thumbnail:
          'https://api.lorcana.ravensburger.com/images/en/set9/205_f26be77b70ccc0716edb22b65d2b8932e4e8a495.jpg',
      },
    },
  ],
};

/** allCards.json, parsed, holding these cards. */
export const allCardsOf = (...cards) => ({
  metadata: {formatVersion: '2.3.2', generatedOn: '2026-07-07T12:08:21', language: 'en'},
  sets: {9: {name: 'Fabled', number: 9, type: 'expansion'}},
  cards,
});

/** The app's AVIFs for the base cards above and Judy's Epic. */
export const APP_AVIFS = ['14024.avif', '14024-sm.avif', '14117.avif', '14117-sm.avif', '14196.avif', '14196-sm.avif', '14206.avif', '14206-sm.avif'];
