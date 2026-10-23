import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import {MOTHER_KNOWS_BEST_ENTRY, allCardsText} from '../../finishes/__tests__/finishFixtures';
import {ALL_CARDS_PATH, CATALOG_PATH, PROMOS_PATH} from '../../finishes/finishFiles';
import {EMPTY_PRINTING_FORM, editValuesOf, type ScanState} from '../printingForm';
import {findPrinting, serializeCatalog, type BaseCard, type CatalogPrinting, type PromoCatalog} from '../promoCatalog';
import {mergeOver} from '../promoMerge';
import type {OpenPrintingForm, PrintingFormController, PrintingOutcome} from '../usePrintingForm';

/*
 * Fixtures for the promo printings' tests and stories (#77). The catalog is a small one: five groups,
 * copied as master holds them (Doberjohn/inkweave after #900), with their provisional ids. What the
 * rules read is in it: a Core card's group in `fold`; in `noBaseCard`, Sets 1 to 8 cards' groups with
 * Ravensburger's art, a scan language and two arts under one number (24A/P2, 24B/P2), and Hades -
 * Dark Usurper's, which has no base number and two printings under one code (28/C3). Beside it, the
 * files of a branch that holds it, and the builders of the printing form's states: the forms and the
 * controller the tests and the stories put in front of it. Nothing here reads a file from disk (see
 * pinned.ts) or imports vitest: stories load it.
 */

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

/** Mother Knows Best: the Core card FIXTURE_CATALOG's `fold` group is for. */
export const MKB_BASE: BaseCard = {id: 2035, fullName: 'Mother Knows Best', setCode: '9', number: 99, core: true};

/** Snow White - Unexpected Houseguest: the Sets 1 to 8 card FIXTURE_CATALOG's `noBaseCard` group for 41/P1 and 42/P2 is for. */
export const SNOW_WHITE_BASE: BaseCard = {id: 240, fullName: 'Snow White - Unexpected Houseguest', setCode: '2', number: 24, core: false};

/** Hiro Hamada - Armor Designer: the Sets 1 to 8 card FIXTURE_CATALOG's `noBaseCard` group for 24A/P2 and 24B/P2, two arts under one number, both Ravensburger's, is for. */
export const HIRO_BASE: BaseCard = {id: 1529, fullName: 'Hiro Hamada - Armor Designer', setCode: '7', number: 96, core: false};

/** The printing of FIXTURE_CATALOG with this id. It throws for an id the catalog lacks, so a test that names the wrong one fails here. */
export function printingOf(id: number): CatalogPrinting {
  const found = findPrinting(FIXTURE_CATALOG, id);
  if (found === null) throw new Error(`FIXTURE_CATALOG has no printing ${id}.`);
  return found.printing;
}

/**
 * Mickey Mouse - Brave Little Prince as allCards.json stores him (Set 9 #111, id 2047), trimmed from the
 * pinned file to what names the card (no text, art or hashes), with his Iconic under `variants` and no promo.
 */
export const PRINCE_ENTRY: LorcanaJSONCard = {
  id: 2047,
  name: 'Mickey Mouse',
  version: 'Brave Little Prince',
  fullName: 'Mickey Mouse - Brave Little Prince',
  cost: 3,
  color: 'Ruby',
  inkwell: true,
  type: 'Character',
  setCode: '9',
  number: 111,
  rarity: 'Legendary',
  variants: [{id: 2178, rarity: 'Iconic', number: 242}],
};

/**
 * The files of a branch that is in step with `catalog`: the catalog itself, and allCards.json and
 * collection/promos.json as the app's merge writes them from it over two Core cards: Mother Knows Best,
 * whose `fold` group FIXTURE_CATALOG holds, and Mickey Mouse - Brave Little Prince, which has no group
 * until a test adds a printing of it. A test whose branch has moved since a form opened builds its files
 * with this: otherwise the out-of-step check refuses first.
 */
export function filesFor(catalog: PromoCatalog): Record<string, string> {
  const merged = mergeOver({catalog, files: {allCards: allCardsText([MOTHER_KNOWS_BEST_ENTRY, PRINCE_ENTRY]), promos: '[]\n'}});
  return {[CATALOG_PATH]: serializeCatalog(catalog), [ALL_CARDS_PATH]: merged.allCards, [PROMOS_PATH]: merged.promos};
}

/** The files of a branch that holds FIXTURE_CATALOG. */
export const FIXTURE_FILES: Record<string, string> = filesFor(FIXTURE_CATALOG);

/** A form that holds no scan: nothing chosen, and no error. */
export const NO_SCAN: ScanState = {name: null, dataUrl: null, error: null};

/** What a form leaves behind once it is closed and nothing has been published: no commit, no failure, nothing to say. */
export const NO_OUTCOME: PrintingOutcome = {result: null, error: null, note: ''};

/** Mother Knows Best's add form, as it opens unless `held` changes it. */
export function addForm(held: Partial<OpenPrintingForm> = {}): OpenPrintingForm {
  const opened = EMPTY_PRINTING_FORM;
  return {kind: 'add', card: MKB_BASE, printing: null, values: opened, initial: opened, scan: NO_SCAN, error: null, ...held};
}

/** What a test or a story changes in an edit form it opens: the values the controller holds, the scan, the last failure. */
type EditHeld = Partial<Pick<OpenPrintingForm, 'values' | 'scan' | 'error'>>;

/** The edit form of `printing`, a printing of `card`, as it opens unless `held` changes it. */
export function editFormOf({printing, card, ...held}: {printing: CatalogPrinting; card: BaseCard} & EditHeld): OpenPrintingForm {
  const values = editValuesOf(printing);
  return {kind: 'edit', card, printing, values, initial: values, scan: NO_SCAN, error: null, ...held};
}

/** The edit form of a printing of FIXTURE_CATALOG: Snow White's 42/P2 (80049, a Chinese scan) unless `id` and `card` say another. */
export function editForm({id = 80049, card = SNOW_WHITE_BASE, ...held}: {id?: number; card?: BaseCard} & EditHeld = {}): OpenPrintingForm {
  return editFormOf({printing: printingOf(id), card, ...held});
}

/**
 * Makes one of a controller's actions from what it does. A test passes `vi.fn`, so that the action records
 * its calls: this file can't import vitest. A story passes nothing, and its actions only do what they are given.
 */
export type MakeAction = <Args extends unknown[], Result>(does: (...args: Args) => Result) => (...args: Args) => Result;

const AS_GIVEN: MakeAction = (does) => does;

/**
 * A controller holding `form`, with no publish under way and nothing said. Its actions do nothing, and a
 * publish doesn't land; `rest` changes any of it, and `make` makes each action (`vi.fn` in a test).
 */
export function controllerOf(form: OpenPrintingForm | null, rest: Partial<PrintingFormController> = {}, make: MakeAction = AS_GIVEN): PrintingFormController {
  return {
    form,
    dirty: false,
    publishing: false,
    outcome: NO_OUTCOME,
    openAdd: make(() => {}),
    openEdit: make(() => {}),
    patch: make(() => {}),
    chooseScan: make(() => Promise.resolve()),
    cancel: make(() => {}),
    publish: make(() => Promise.resolve(false)),
    ...rest,
  };
}
