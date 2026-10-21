import type {PrintingFinishes} from 'inkweave-synergy-engine';

/*
 * A printing's `finishes` in the app's data files (#68). Admin commits those files as text,
 * so a write parses a file, sets the field on the entries it names and serializes the whole
 * again in the file's own format: every other byte stays as it was, and the commit's diff
 * shows only the entries that changed. `finishes` is always an entry's last key, so a write
 * deletes the key before it assigns it. The round trip over the pinned app files, in the test
 * beside this, is what holds each format to the app's: a pin bump that changes one fails it.
 */

const COLLECTION_DIR = 'apps/web/public/data/collection';

/** The Core pool: its cards, some with their other printings under `variants`. */
export const ALL_CARDS_PATH = 'apps/web/public/data/allCards.json';
/** Every promo printing. */
export const PROMOS_PATH = `${COLLECTION_DIR}/promos.json`;
/** The owner's catalog of promo printings, where a promo's versions are first set. */
export const CATALOG_PATH = 'scripts/data/promo-printings.json';

/** A set's chunk of the collection data: that set's cards and printings. */
export function setChunkPath(setCode: string): string {
  return `${COLLECTION_DIR}/${setCode}.json`;
}

/** Every entry id a file holds, with its `finishes`, or null where the entry has none. */
export type FileValues = ReadonlyMap<string, PrintingFinishes | null>;

/** A path that is none of the four files, or an id the file doesn't hold. */
export class FinishFileError extends Error {
  name = 'FinishFileError';
}

/** A printing's entry, whichever file holds it: the only two keys this module reads or writes. */
interface Entry {
  id: number | string;
  finishes?: PrintingFinishes;
}

/** A card of allCards.json, which holds its other printings under `variants` when it has any. */
interface Card extends Entry {
  variants?: Entry[];
}

/** A group of the promo catalog: the printings of one card. */
interface Group {
  variants: Entry[];
}

/** A file's text, and the path that says which of the four it is. */
interface FileText {
  path: string;
  text: string;
}

/** A parsed file: its entries, and how to write it back out. */
interface OpenFile {
  entries: Entry[];
  /** The file's text again, with its entries as they now stand, in the file's own format. */
  serialize: () => string;
}

/**
 * A set's chunk or promos.json: a `.json` file straight under the collection folder, but not
 * its index, which projects every card down to a few fields (generate-collection-data.mjs)
 * and holds no `finishes`. The app's set codes are letters and digits.
 */
const COLLECTION_FILE = new RegExp(`^${COLLECTION_DIR}/(?!index\\.json$)[A-Za-z0-9]+\\.json$`);

/** allCards.json: `JSON.stringify(x, null, 2)` and a newline. Its entries are its cards and their variants. */
function openAllCards(parsed: unknown): OpenFile {
  const file = parsed as {cards: Card[]};
  return {
    entries: file.cards.flatMap((card) => [card, ...(card.variants ?? [])]),
    serialize: () => `${JSON.stringify(file, null, 2)}\n`,
  };
}

/** A set's chunk or promos.json: `JSON.stringify(x)` and a newline. A bare array of entries. */
function openCollectionFile(parsed: unknown): OpenFile {
  const file = parsed as Entry[];
  return {entries: file, serialize: () => `${JSON.stringify(file)}\n`};
}

/**
 * The promo catalog: `JSON.stringify(x, null, 2)`, no newline. Its entries are the variants of its
 * groups, those that fold into a base card (`fold`) and those that have none (`noBaseCard`).
 */
function openCatalog(parsed: unknown): OpenFile {
  const file = parsed as {fold: Group[]; noBaseCard: Group[]};
  return {
    entries: [...file.fold, ...file.noBaseCard].flatMap((group) => group.variants),
    serialize: () => JSON.stringify(file, null, 2),
  };
}

/** Opens one of the four files. Any other path is refused before a byte of its text is parsed. */
function openFile({path, text}: FileText): OpenFile {
  if (path === ALL_CARDS_PATH) return openAllCards(JSON.parse(text));
  if (path === CATALOG_PATH) return openCatalog(JSON.parse(text));
  if (COLLECTION_FILE.test(path)) return openCollectionFile(JSON.parse(text));
  throw new FinishFileError(`${path} isn't one of the files that hold printings' versions`);
}

/** Every entry id the file holds, with the versions it names, or null where the entry names none. */
export function readFinishes(file: FileText): FileValues {
  const {entries} = openFile(file);
  return new Map(
    entries.map((entry): [string, PrintingFinishes | null] => [String(entry.id), entry.finishes ?? null]),
  );
}

/**
 * The file's text with `finishes` set, as the last key, on every entry whose id is in
 * `values`, and every other entry as it was, in the file's own format. An id the file
 * doesn't hold is refused outright, so a half-made edit never comes back.
 */
export function writeFinishes({path, text, values}: FileText & {values: ReadonlyMap<string, PrintingFinishes>}): string {
  const file = openFile({path, text});
  const held = new Set(file.entries.map((entry) => String(entry.id)));
  const missing = [...values.keys()].find((id) => !held.has(id));
  if (missing !== undefined) throw new FinishFileError(`${missing} isn't in ${path}`);
  for (const entry of file.entries) {
    const finishes = values.get(String(entry.id));
    if (finishes === undefined) continue;
    delete entry.finishes; // so an existing one moves to the end with the new one
    entry.finishes = finishes;
  }
  return file.serialize();
}
