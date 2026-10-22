import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import type {BaseCard, PromoCatalog} from '../promoCatalog';

/*
 * Fixtures for the promo printings' tests and stories (#77). The catalog is a small one: five groups,
 * copied as master holds them (Doberjohn/inkweave after #900), with their provisional ids. What the
 * rules read is in it: a Core card's group in `fold`; in `noBaseCard`, Sets 1 to 8 cards' groups with
 * Ravensburger's art, a scan language and two arts under one number (24A/P2, 24B/P2), and Hades -
 * Dark Usurper's, which has no base number and two printings under one code (28/C3).
 */

/** A file of the pinned app, as text: what the tests use as a stand-in for the branch's copy. */
export function readPinned(path: string): string {
  return readFileSync(resolve('upstream/inkweave', path), 'utf8');
}

/** Those groups as a catalog. Its `stats` are what `recountStats` makes of them, written out here. */
export const FIXTURE_CATALOG: PromoCatalog = {
  about: 'Fixture.',
  stats: {
    promoPrintings: 14,
    withLorcanaJsonId: 4,
    withProvisionalId: 10,
    withOfficialArtUrl: 4,
    foldIntoAllCards: {printings: 2, baseCards: 1},
    noBaseCardInAllCards: {printings: 12, cards: 4},
    byPromoGrouping: {C1: 1, C3: 7, D23: 1, P1: 2, P2: 3},
  },
  fold: [
    {
      baseId: 2035,
      fullName: 'Mother Knows Best',
      setCode: '9',
      number: 99,
      variants: [
        {id: 80017, rarity: 'Special', number: 1, promoGrouping: 'C3', finishes: ['normal']},
        {id: 80024, rarity: 'Special', number: 13, promoGrouping: 'C3', finishes: ['foil']},
      ],
    },
  ],
  noBaseCard: [
    {
      fullName: 'Mickey Mouse - Brave Little Tailor',
      lorcanaJsonBaseId: 115,
      baseSetCode: '1',
      baseNumber: 115,
      variants: [
        {id: 80003, rarity: 'Special', number: 5, promoGrouping: 'C1', finishes: ['foil']},
        {id: 80023, rarity: 'Special', number: 12, promoGrouping: 'C3', finishes: ['normal']},
        {id: 80030, rarity: 'Special', number: 24, promoGrouping: 'C3', finishes: ['foil']},
        {
          id: 1191,
          rarity: 'Special',
          number: 1,
          promoGrouping: 'D23',
          images: {
            full: 'https://api.lorcana.ravensburger.com/images/en/d23/1_1217b22b5c937088bfd49a72c7c226af713e557f.jpg',
            thumbnail: 'https://api.lorcana.ravensburger.com/images/en/d23/1_e703beca799cc92c4427ccd50e6edd7b132b1131.jpg',
          },
          finishes: ['foil'],
        },
        {
          id: 659,
          rarity: 'Special',
          number: 1,
          promoGrouping: 'P1',
          images: {
            full: 'https://api.lorcana.ravensburger.com/images/en/promo1/1_62ec0c3084773497fc59cccc9274ad5a4d8af386.jpg',
            thumbnail: 'https://api.lorcana.ravensburger.com/images/en/promo1/1_71345637b9eddc5d2937523edb2dc2242f992459.jpg',
          },
          finishes: ['foil'],
        },
      ],
    },
    {
      fullName: 'Hades - Dark Usurper',
      lorcanaJsonBaseId: null,
      baseSetCode: '15',
      baseNumber: null,
      variants: [
        {id: 80031, rarity: 'Special', number: 28, promoGrouping: 'C3', promoSource: 'Challenge Top 8 (250 copies)'},
        {id: 80032, rarity: 'Special', number: 28, promoGrouping: 'C3', promoSource: 'Championship (36 copies)'},
        {id: 80033, rarity: 'Special', number: 29, promoGrouping: 'C3'},
      ],
    },
    {
      fullName: 'Snow White - Unexpected Houseguest',
      lorcanaJsonBaseId: 240,
      baseSetCode: '2',
      baseNumber: 24,
      variants: [
        {id: 80043, rarity: 'Special', number: 41, promoGrouping: 'P1', scanLanguage: 'ja', finishes: ['foil']},
        {id: 80049, rarity: 'Special', number: 42, promoGrouping: 'P2', scanLanguage: 'zh', finishes: ['foil']},
      ],
    },
    {
      fullName: 'Hiro Hamada - Armor Designer',
      lorcanaJsonBaseId: 1529,
      baseSetCode: '7',
      baseNumber: 96,
      variants: [
        {
          id: 1661,
          rarity: 'Special',
          number: 24,
          promoGrouping: 'P2',
          artVariant: 'A',
          images: {
            full: 'https://api.lorcana.ravensburger.com/images/en/promo2/24A_e61d0cc08440d0623274b0c69fef33dc32a5f64b.jpg',
            thumbnail: 'https://api.lorcana.ravensburger.com/images/en/promo2/24A_cc84f7fe9ea26d1ae15e97aa838b6f39b26c510b.jpg',
          },
          finishes: ['normal'],
        },
        {
          id: 1662,
          rarity: 'Special',
          number: 24,
          promoGrouping: 'P2',
          artVariant: 'B',
          images: {
            full: 'https://api.lorcana.ravensburger.com/images/en/promo2/24B_0665cc15db892a07de98b8cfefc0015a762e79d5.jpg',
            thumbnail: 'https://api.lorcana.ravensburger.com/images/en/promo2/24B_1f7b73a61642bb4b35e2355fac3e617c6f555e91.jpg',
          },
          finishes: ['foil'],
        },
      ],
    },
  ],
  provisionalIds: {
    '80003': '5/C1 Mickey Mouse - Brave Little Tailor',
    '80017': '1/C3 Mother Knows Best',
    '80023': '12/C3 Mickey Mouse - Brave Little Tailor',
    '80024': '13/C3 Mother Knows Best',
    '80030': '24/C3 Mickey Mouse - Brave Little Tailor',
    '80031': '28/C3 (Challenge Top 8 (250 copies)) Hades - Dark Usurper',
    '80032': '28/C3 (Championship (36 copies)) Hades - Dark Usurper',
    '80033': '29/C3 Hades - Dark Usurper',
    '80043': '41/P1 Snow White - Unexpected Houseguest',
    '80049': '42/P2 Snow White - Unexpected Houseguest',
  },
  notes: [],
};

/** Mickey Mouse - Brave Little Prince: a Core card FIXTURE_CATALOG has no group for, so a first printing of it starts one. */
export const PRINCE: BaseCard = {id: 2047, fullName: 'Mickey Mouse - Brave Little Prince', setCode: '9', number: 111, core: true};
