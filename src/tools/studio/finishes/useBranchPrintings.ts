import {useEffect, useState} from 'react';
import {isCoreSet, type LorcanaCard, type LorcanaJSONCard} from 'inkweave-synergy-engine';
import {transformPromos, transformRawCards, type RawCollectionPromo} from '../../../app-bridge';
import {
  forgetBranchFiles,
  lastTextCached,
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
  | {status: 'ready'; rows: readonly PrintingRow[]};

const LOADING: BranchPrintings = {status: 'loading'};

/** What a card's rows are made from, but the card: the files of its set, parsed. */
type Files = Omit<PrintingSources, 'card'>;

/** How a read of the files ended. */
type Outcome = {files: Files} | {error: string};

/** An outcome, with the set whose files it read and the count of drops (`useBranchFilesGeneration`) it read them after. */
interface Settled {
  setCode: string;
  generation: number;
  outcome: Outcome;
}

const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** `parse`, but a file it can't make sense of is named: a parser says only what it met ("Unexpected token <"). */
function namingItsFile<T>(parse: (file: BranchFile) => T): (file: BranchFile) => T {
  return (file) => {
    try {
      return parse(file);
    } catch (e) {
      throw new Error(`${file.path} can't be read: ${messageOf(e)}`, {cause: e});
    }
  };
}

/** Each parse of a file's text is kept until that file's text changes, so a card of another set doesn't parse allCards.json again. */
const finishesIn = lastTextCached(namingItsFile(readFinishes));
const cardsIn = lastTextCached(namingItsFile(({text}) => transformRawCards(JSON.parse(text) as LorcanaJSONCard[])));
const promosIn = lastTextCached(namingItsFile(({text}) => transformPromos(JSON.parse(text) as RawCollectionPromo[])));

/**
 * The files a card's rows are made from. The entries come from the first two: its set's chunk,
 * which holds its printings (and, below Core, the card), and promos.json, which holds its promos.
 * The versions come from whichever of them is a printing's primary home: the chunk, the catalog,
 * where a promo's versions are first set, and for a Core card allCards.json.
 */
function pathsOf(setCode: string): string[] {
  return [setChunkPath(setCode), PROMOS_PATH, CATALOG_PATH, ...(isCoreSet(setCode) ? [ALL_CARDS_PATH] : [])];
}

/**
 * Reads and parses the files of a set. A printing's versions are what its primary home names for
 * it: nothing, where that file has no entry for it.
 */
async function readFiles({token, setCode}: {token: string; setCode: string}): Promise<Files> {
  const paths = pathsOf(setCode);
  const texts = await Promise.all(paths.map((path) => readBranchFile({token, path})));
  const files = paths.map((path, i): BranchFile => ({path, text: texts[i]}));
  const [chunk, promos] = files;
  const values = new Map(files.map((file): [string, FileValues] => [file.path, finishesIn(file)]));
  return {
    chunk: cardsIn(chunk),
    promos: promosIn(promos),
    valueOf: (ref) => values.get(primaryHome(ref))?.get(ref.id) ?? null,
  };
}

/**
 * Reads a card's printings from the target branch's files. The files depend on the card's set
 * alone, so another card of the same set reads and loads nothing, while a card of another set
 * discards the last one's pending read. The view reads as loading until a read lands that answers
 * the card's set and the latest drop of the files (`forgetBranchFiles`, which a publish makes). A
 * read landing late is dropped: it never shows another card's rows, nor replaces a newer read.
 */
export function useBranchPrintings({token, card}: {token: string; card: LorcanaCard}): BranchPrintings {
  const {setCode = ''} = card;
  const generation = useBranchFilesGeneration();
  const [settled, setSettled] = useState<Settled | null>(null);

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

  if (settled?.setCode !== setCode || settled.generation !== generation) return LOADING;
  if ('error' in settled.outcome) return {status: 'error', error: settled.outcome.error, retry: forgetBranchFiles};
  return {status: 'ready', rows: printingRowsFor({card, ...settled.outcome.files})};
}
