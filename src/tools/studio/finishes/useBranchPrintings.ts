import {useEffect, useState} from 'react';
import {isCoreSet, type LorcanaCard, type LorcanaJSONCard} from 'inkweave-synergy-engine';
import {transformPromos, transformRawCards, type RawCollectionPromo} from '../../../app-bridge';
import {parseCatalog, type PromoCatalog} from '../promos/promoCatalog';
import {
  cachedBranchFile,
  forgetBranchFiles,
  lastTextCached,
  messageOf,
  namingItsFile,
  readBranchFile,
  useBranchFilesGeneration,
  type BranchFile,
} from './branchFiles';
import {ALL_CARDS_PATH, CATALOG_PATH, PROMOS_PATH, readFinishes, setChunkPath, type FileValues} from './finishFiles';
import {primaryHome} from './printingHomes';
import {printingRowsFor, type PrintingRow, type PrintingSources} from './printingRows';

/*
 * A card's printings, with the versions the target branch gives them (#68): what Edit card's
 * Printings panel shows. They are read from the branch's files, not the deployed data's, so
 * Publish's check of a change against a printing's value compares like with like.
 */

/** What the panel has of a card's printings: nothing yet, a read that failed, or the rows. */
export type BranchPrintings =
  | {status: 'loading'}
  /** `retry` reads the files again, all of them: text the parsers couldn't read was kept like any other. */
  | {status: 'error'; error: string; retry: () => void}
  /**
   * `refreshing`: the files are being read again since a publish dropped them, and these rows are
   * the last read's, for the panel to hold until the read lands.
   *
   * `catalog`: the branch's promo catalog, the same read's, which the panel's printing form reads
   * (#77): the entry a row's Edit opens, and who has the code a form names. The hook sets it, or
   * `catalogError` where the catalog's shape is wrong for the form (parseCatalog: a section it lacks,
   * named with the file, #84). The rows and their versions don't read those sections, so they stay,
   * and only the form is off. `catalog` is optional so that a view a test or a story builds without
   * one still types: the panel then offers no form.
   */
  | {status: 'ready'; rows: readonly PrintingRow[]; refreshing?: true; catalog?: PromoCatalog; catalogError?: string};

const LOADING: BranchPrintings = {status: 'loading'};

/** The catalog as the printing form reads it, or what is wrong with its shape, naming the file (#84). */
type CatalogRead = {catalog: PromoCatalog} | {catalogError: string};

/**
 * What a card's rows are made from, but the card and whether it has a twin, and the catalog its
 * promos are filed in: the files of its set, parsed.
 */
type Files = Omit<PrintingSources, 'card' | 'twin'> & {catalog: CatalogRead};

/** How a read of the files ended. */
type Outcome = {files: Files} | {error: string};

/** An outcome, with the set whose files it read and the count of drops (`useBranchFilesGeneration`) it read them after. */
interface Settled {
  setCode: string;
  generation: number;
  outcome: Outcome;
}

/** Each parse of a file's text is kept until that file's text changes, so a card of another set doesn't parse allCards.json again. */
const finishesIn = lastTextCached(namingItsFile(readFinishes));
const cardsIn = lastTextCached(namingItsFile(({text}) => transformRawCards(JSON.parse(text) as LorcanaJSONCard[])));
const promosIn = lastTextCached(namingItsFile(({text}) => transformPromos(JSON.parse(text) as RawCollectionPromo[])));
/** The catalog checked as the printing form reads it (parseCatalog), where a problem is named and thrown. */
const checkedCatalog = namingItsFile(({text}) => parseCatalog(text));

/**
 * The catalog itself, which the panel's printing form reads (#77). `finishesIn` reads the same text for
 * its versions: each parses a text once. A catalog whose shape the form can't read, a section missing,
 * fails only the form (#84): the versions read `fold` and `noBaseCard` as the app does, the second as
 * optional, so a read keeps its rows. A publish still checks the whole catalog (publishPrinting.ts).
 */
const catalogIn = lastTextCached((file: BranchFile): CatalogRead => {
  try {
    return {catalog: checkedCatalog(file)};
  } catch (e) {
    return {catalogError: messageOf(e)};
  }
});

/**
 * The files a card's rows are made from. The entries come from the first two: its set's chunk,
 * which holds its printings (and, below Core, the card), and promos.json, which holds its promos.
 * The versions come from whichever of them is a printing's primary home: the chunk, the catalog,
 * where a promo's versions are first set, and for a Core card allCards.json. The catalog, the
 * third, is the printing form's as well.
 */
function pathsOf(setCode: string): string[] {
  return [setChunkPath(setCode), PROMOS_PATH, CATALOG_PATH, ...(isCoreSet(setCode) ? [ALL_CARDS_PATH] : [])];
}

/**
 * Parses the files of a set, in the order of `pathsOf`. A printing's versions are what its primary
 * home names for it: nothing, where that file has no entry for it.
 */
function parsedFiles(files: readonly BranchFile[]): Files {
  const [chunk, promos, catalog] = files;
  const values = new Map(files.map((file): [string, FileValues] => [file.path, finishesIn(file)]));
  return {
    chunk: cardsIn(chunk),
    promos: promosIn(promos),
    catalog: catalogIn(catalog),
    valueOf: (ref) => values.get(primaryHome(ref))?.get(ref.id) ?? null,
  };
}

/** Reads and parses the files of a set. */
async function readFiles({token, setCode}: {token: string; setCode: string}): Promise<Files> {
  const paths = pathsOf(setCode);
  const texts = await Promise.all(paths.map((path) => readBranchFile({token, path})));
  return parsedFiles(paths.map((path, i): BranchFile => ({path, text: texts[i]})));
}

/**
 * The files of a set, parsed, when a read of every one of them has landed already; else null. A
 * text its parser can't read is no files either: the read the hook starts reports that file.
 */
function cachedFiles(setCode: string): Files | null {
  const files: BranchFile[] = [];
  for (const path of pathsOf(setCode)) {
    const text = cachedBranchFile(path);
    if (text === undefined) return null;
    files.push({path, text});
  }
  try {
    return parsedFiles(files);
  } catch {
    return null;
  }
}

/** What a hook that mounts after the files were read starts with, in place of loading: their outcome, or none. */
function settledFromCache({setCode, generation}: {setCode: string; generation: number}): Settled | null {
  const files = cachedFiles(setCode);
  return files && {setCode, generation, outcome: {files}};
}

/** What the hook reads: the token the files are read with, the card, and whether it has a twin. */
interface BranchPrintingsInput {
  token: string;
  card: LorcanaCard;
  /** Another card of its set has its full name and number (`twinIdsOf`), so its rows' labels end in their ids (#74). */
  twin?: boolean;
}

/** What the hook's view is made from: the read it settled on, how many drops it has seen, and the card it shows. */
interface ViewInput extends Pick<BranchPrintingsInput, 'card' | 'twin'> {
  settled: Settled | null;
  generation: number;
}

/**
 * What the hook shows of the read it settled on. One of another set is loading. One made before
 * the latest drop of the files is a read under way again: its rows and its catalog stay, marked
 * refreshing, while one that failed has none to keep, so that is loading too.
 */
function viewOf({settled, generation, card, twin}: ViewInput): BranchPrintings {
  if (settled?.setCode !== (card.setCode ?? '')) return LOADING;
  const {outcome} = settled;
  const current = settled.generation === generation;
  if ('error' in outcome) return current ? {status: 'error', error: outcome.error, retry: forgetBranchFiles} : LOADING;
  const {catalog, ...sources} = outcome.files;
  const rows = printingRowsFor({card, twin, ...sources});
  return current ? {status: 'ready', rows, ...catalog} : {status: 'ready', rows, ...catalog, refreshing: true};
}

/**
 * Reads a card's printings from the target branch's files. The files depend on the card's set
 * alone, so another card of the same set reads and loads nothing, while a card of another set
 * discards the last one's pending read. The view reads as loading until a read lands that answers
 * the card's set. Once the files are dropped (`forgetBranchFiles`, which a publish makes) they are
 * read again, and until that read lands the rows of the last one stay, marked refreshing, so the
 * panel holds them rather than drop its list and the focus in it. A read landing late is dropped:
 * it never shows another card's rows, nor replaces a newer read.
 *
 * Card studio mounts the panel anew for each card it opens, so a hook that mounts when the files
 * were read already starts with their rows, and never shows loading for the frame it takes the
 * read to answer from its cache. The read is made all the same, and settles on the same rows.
 *
 * A card with a twin (`twin`, #74) reads the same files: only its rows' labels differ.
 */
export function useBranchPrintings({token, card, twin}: BranchPrintingsInput): BranchPrintings {
  const {setCode = ''} = card;
  const generation = useBranchFilesGeneration();
  const [settled, setSettled] = useState<Settled | null>(() => settledFromCache({setCode, generation}));

  useEffect(() => {
    let cancelled = false;
    const settle = (outcome: Outcome) => {
      if (!cancelled) setSettled({setCode, generation, outcome});
    };
    readFiles({token, setCode}).then(
      (files) => settle({files}),
      (e: unknown) => settle({error: messageOf(e)}),
    );
    return () => {
      cancelled = true;
    };
  }, [token, setCode, generation]);

  return viewOf({settled, generation, card, twin});
}
