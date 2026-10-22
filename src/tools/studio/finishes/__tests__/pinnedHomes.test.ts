import {readFileSync, readdirSync} from 'node:fs';
import {relative, resolve} from 'node:path';
import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {describe, expect, it} from 'vitest';
import {transformPromos, transformRawCards, type RawCollectionPromo} from '../../../../app-bridge';
import {COLLECTION_ONLY_SETS} from '../collectionCards';
import {ALL_CARDS_PATH, CATALOG_PATH, PROMOS_PATH, readEntryFacts, setChunkPath} from '../finishFiles';
import {homesOf} from '../printingHomes';
import {printingRowsFor, type PrintingRow} from '../printingRows';

/*
 * The homes a publish writes, held to the pinned app's own data (#68). A publish writes a printing
 * into the files `homesOf` names for the ref its row was built with, and nowhere else, so a layout
 * change in the app (a new file that holds printings, an entry moved between files) must fail here,
 * on the pin bump's CI, before a publish misses a home without a word. The files are read with
 * node:fs, which is no import, so the boundary lint allows it (finishFiles.test.ts reads them so too).
 */

const APP = resolve('upstream/inkweave');
const read = (path: string) => readFileSync(resolve(APP, path), 'utf8');
const COLLECTION_DIR = 'apps/web/public/data/collection';

/** Every set whose chunk the pinned collection holds, in set order. */
const CHUNK_SETS = readdirSync(resolve(APP, COLLECTION_DIR))
  .filter((name) => /^\d+\.json$/.test(name))
  .map((name) => name.replace('.json', ''))
  .sort((a, b) => Number(a) - Number(b));

/** The four kinds of file that hold printings, by path: allCards.json, each set's chunk, promos.json and the catalog. */
const TEXTS = new Map<string, string>(
  [ALL_CARDS_PATH, ...CHUNK_SETS.map(setChunkPath), PROMOS_PATH, CATALOG_PATH].map((path) => [path, read(path)]),
);
const textOf = (path: string) => TEXTS.get(path) ?? '';

/** Every id in those files, with the paths of the files that hold it, as a publish reads them (`readEntryFacts`). */
function holdersOfEachId(): Map<string, Set<string>> {
  const holders = new Map<string, Set<string>>();
  for (const [path, text] of TEXTS) {
    for (const id of readEntryFacts({path, text}).keys()) holders.set(id, (holders.get(id) ?? new Set()).add(path));
  }
  return holders;
}

/** Each set's chunk as the app's loader builds it: its cards and its printings. */
const CHUNKS = new Map(CHUNK_SETS.map((set) => [set, transformRawCards(JSON.parse(textOf(setChunkPath(set))) as LorcanaJSONCard[])]));

/**
 * The cards Edit card opens a Printings panel for: every card of allCards.json, and the cards of
 * Sets 1 to 8's chunks (their entries that name no base card), as collectionCards.ts reads them.
 */
function cardsWithPanels(): LorcanaCard[] {
  const core = transformRawCards((JSON.parse(textOf(ALL_CARDS_PATH)) as {cards: LorcanaJSONCard[]}).cards);
  const old = COLLECTION_ONLY_SETS.flatMap((set) => (CHUNKS.get(set) ?? []).filter((card) => card.baseId === undefined));
  return [...core, ...old];
}

const RAW_PROMOS = JSON.parse(textOf(PROMOS_PATH)) as RawCollectionPromo[];

/** Every row of every card's panel, built as useBranchPrintings builds them, from its set's chunk and promos.json. */
function everyRow(): PrintingRow[] {
  const promos = transformPromos(RAW_PROMOS);
  return cardsWithPanels().flatMap((card) =>
    printingRowsFor({card, chunk: CHUNKS.get(card.setCode ?? '') ?? [], promos, valueOf: () => null}),
  );
}

const ROWS = everyRow();
const HOLDERS = holdersOfEachId();

/** Every .json file under a folder of the pinned app, as a path of the app's repo. */
function jsonFilesUnder(folder: string): string[] {
  const files = readdirSync(resolve(APP, folder), {recursive: true, encoding: 'utf8'});
  return files.filter((name) => name.endsWith('.json')).map((name) => relative(APP, resolve(APP, folder, name)).replaceAll('\\', '/'));
}

describe('the homes a publish writes, on the pinned app data', () => {
  it('builds rows for the cards of every kind of file', () => {
    // Core cards, Sets 1 to 8 cards, printings in both kinds of chunk, and promos.
    expect(new Set(ROWS.map(({ref}) => `${ref.core ? 'Core' : 'pre-Core'} ${ref.kind}`))).toEqual(
      new Set(['Core card', 'Core printing', 'Core promo', 'pre-Core card', 'pre-Core printing', 'pre-Core promo']),
    );
  });

  it('names, for every row, exactly the files that hold its printing', () => {
    const misplaced = ROWS.flatMap(({ref, label}) => {
      const homes = [...homesOf(ref)].sort();
      const holders = [...(HOLDERS.get(ref.id) ?? [])].sort();
      return homes.join() === holders.join() ? [] : [{id: ref.id, label, homes, holders}];
    });
    expect(misplaced).toEqual([]);
  });

  it('reaches every entry of those files from a row, but a promo that names no card', () => {
    const reached = new Set(ROWS.map(({ref}) => ref.id));
    const unreached = [...HOLDERS.keys()].filter((id) => !reached.has(id)).sort();
    // Today: Hades - Dark Usurper's three C3 promos, 80031 to 80033, whose card no dataset holds yet.
    const cardless = RAW_PROMOS.filter(({baseId}) => baseId === undefined).map(({id}) => String(id));
    expect(unreached).toEqual(cardless.sort());
  });

  it('finds a finishes key in no other file of the app’s data or scripts', () => {
    const others = [...jsonFilesUnder('apps/web/public/data'), ...jsonFilesUnder('scripts/data')].filter((path) => !TEXTS.has(path));
    expect(others.length).toBeGreaterThan(0);
    expect(others.filter((path) => /"finishes"\s*:/.test(read(path)))).toEqual([]);
  });
});
