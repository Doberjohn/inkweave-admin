import {readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import type {PrintingFinishes} from 'inkweave-synergy-engine';
import {describe, expect, it} from 'vitest';
import {
  ALL_CARDS_PATH,
  CATALOG_PATH,
  COLLECTION_DIR,
  FinishFileError,
  PROMOS_PATH,
  readEntryFacts,
  readFinishes,
  requireItsFormat,
  setChunkPath,
  writeFinishes,
} from '../finishFiles';

/** A file as the pinned app holds it. */
const pinnedText = (path: string) => readFileSync(resolve('upstream/inkweave', path), 'utf8');

/**
 * Every file of the pinned app a publish may write: allCards.json, every collection file but the index (each
 * set's chunk and promos.json), read from the pinned directory, so a chunk a pin bump adds is in, and the catalog.
 */
const PINNED_FILES = [
  ALL_CARDS_PATH,
  ...readdirSync(resolve('upstream/inkweave', COLLECTION_DIR))
    .filter((name) => name.endsWith('.json') && name !== 'index.json')
    .map((name) => `${COLLECTION_DIR}/${name}`),
  CATALOG_PATH,
];

const chunk = JSON.stringify([{id: 946, rarity: 'Legendary', baseId: 750}, {id: 750, rarity: 'Legendary'}]) + '\n';
const all = JSON.stringify({metadata: {}, sets: {}, cards: [{id: 2035, rarity: 'Uncommon', variants: [{id: 80017, rarity: 'Special', finishes: ['normal']}]}]}, null, 2) + '\n';
const catalog = JSON.stringify({about: '', fold: [{baseId: 2035, variants: [{id: 80017, rarity: 'Special', finishes: ['normal']}]}], noBaseCard: [{variants: [{id: 3237, rarity: 'Special'}]}]}, null, 2);

describe('finishFiles', () => {
  it('reads every entry, null where finishes is absent', () => {
    expect(readFinishes({path: setChunkPath('4'), text: chunk})).toEqual(new Map([['946', null], ['750', null]]));
    expect(readFinishes({path: ALL_CARDS_PATH, text: all}).get('80017')).toEqual(['normal']);
    expect(readFinishes({path: CATALOG_PATH, text: catalog}).get('3237')).toBeNull();
  });
  it('writes finishes as the last key and keeps the compact format', () => {
    const out = writeFinishes({path: setChunkPath('4'), text: chunk, values: new Map([['946', ['foil']]])});
    expect(out).toBe(JSON.stringify([{id: 946, rarity: 'Legendary', baseId: 750, finishes: ['foil']}, {id: 750, rarity: 'Legendary'}]) + '\n');
  });
  it('moves an existing finishes to the end when it changes it', () => {
    const text = JSON.stringify([{id: 1, finishes: ['foil'], rarity: 'Rare'}]) + '\n';
    expect(writeFinishes({path: setChunkPath('5'), text, values: new Map([['1', ['normal', 'foil']]])}))
      .toBe(JSON.stringify([{id: 1, rarity: 'Rare', finishes: ['normal', 'foil']}]) + '\n');
  });
  it('keeps the catalog without a trailing newline and allCards with one', () => {
    expect(writeFinishes({path: CATALOG_PATH, text: catalog, values: new Map([['80017', ['normal', 'foil']]])}).endsWith('\n')).toBe(false);
    expect(writeFinishes({path: ALL_CARDS_PATH, text: all, values: new Map([['80017', ['foil']]])}).endsWith('}\n')).toBe(true);
  });
  it('refuses an id the file does not hold', () => {
    expect(() => writeFinishes({path: PROMOS_PATH, text: '[]\n', values: new Map([['80017', ['foil']]])})).toThrow("80017 isn't in apps/web/public/data/collection/promos.json");
  });
  it('finds every set’s chunk and promos.json in the pinned collection directory', () => {
    expect(PINNED_FILES).toEqual(expect.arrayContaining([setChunkPath('1'), setChunkPath('14'), PROMOS_PATH]));
    expect(PINNED_FILES).not.toContain(`${COLLECTION_DIR}/index.json`);
  });

  it('round-trips the pinned app files byte for byte, each in its format, every collection file included', () => {
    for (const path of PINNED_FILES) {
      const text = pinnedText(path);
      expect(() => requireItsFormat({path, text}), path).not.toThrow();
      expect(writeFinishes({path, text, values: new Map()}), path).toBe(text);
    }
  });

  it('reads and writes a catalog with no noBaseCard key, and adds none', () => {
    const fold = [{baseId: 2035, variants: [{id: 80017, rarity: 'Special', finishes: ['normal']}]}];
    const bare = JSON.stringify({about: '', fold}, null, 2);
    expect(readFinishes({path: CATALOG_PATH, text: bare})).toEqual(new Map([['80017', ['normal']]]));
    expect(writeFinishes({path: CATALOG_PATH, text: bare, values: new Map()})).toBe(bare);
    expect(writeFinishes({path: CATALOG_PATH, text: bare, values: new Map([['80017', ['foil']]])})).toBe(
      JSON.stringify({about: '', fold: [{baseId: 2035, variants: [{id: 80017, rarity: 'Special', finishes: ['foil']}]}]}, null, 2),
    );
  });

  it('reads a card and its variants from allCards.json, and the catalog groups with or without a base card', () => {
    expect(readFinishes({path: ALL_CARDS_PATH, text: all})).toEqual(new Map([['2035', null], ['80017', ['normal']]]));
    expect(readFinishes({path: CATALOG_PATH, text: catalog})).toEqual(new Map([['80017', ['normal']], ['3237', null]]));
  });
  it('reads and writes promos.json as a bare array, like a set chunk', () => {
    const text = JSON.stringify([{id: 80017, rarity: 'Special', finishes: ['normal']}, {id: 3237, rarity: 'Special'}]) + '\n';
    expect(readFinishes({path: PROMOS_PATH, text})).toEqual(new Map([['80017', ['normal']], ['3237', null]]));
    expect(writeFinishes({path: PROMOS_PATH, text, values: new Map([['3237', ['foil']]])}))
      .toBe(JSON.stringify([{id: 80017, rarity: 'Special', finishes: ['normal']}, {id: 3237, rarity: 'Special', finishes: ['foil']}]) + '\n');
  });
  it('sets finishes on a card and on its variant in allCards.json, and changes nothing else', () => {
    const values = new Map<string, PrintingFinishes>([['2035', ['foil']], ['80017', ['normal', 'foil']]]);
    expect(writeFinishes({path: ALL_CARDS_PATH, text: all, values})).toBe(
      JSON.stringify({metadata: {}, sets: {}, cards: [{id: 2035, rarity: 'Uncommon', variants: [{id: 80017, rarity: 'Special', finishes: ['normal', 'foil']}], finishes: ['foil']}]}, null, 2) + '\n',
    );
  });
  it('sets finishes on a catalog variant that has no base card', () => {
    expect(writeFinishes({path: CATALOG_PATH, text: catalog, values: new Map([['3237', ['foil']]])})).toBe(
      JSON.stringify({about: '', fold: [{baseId: 2035, variants: [{id: 80017, rarity: 'Special', finishes: ['normal']}]}], noBaseCard: [{variants: [{id: 3237, rarity: 'Special', finishes: ['foil']}]}]}, null, 2),
    );
  });
  it('changes no byte of an entry that already holds the value', () => {
    expect(writeFinishes({path: ALL_CARDS_PATH, text: all, values: new Map([['80017', ['normal']]])})).toBe(all);
  });
  it('compares ids as strings, however the file writes them', () => {
    const text = JSON.stringify([{id: 5}, {id: '6'}]) + '\n';
    expect(readFinishes({path: setChunkPath('4'), text})).toEqual(new Map([['5', null], ['6', null]]));
    expect(writeFinishes({path: setChunkPath('4'), text, values: new Map([['5', ['foil']], ['6', ['foil']]])}))
      .toBe(JSON.stringify([{id: 5, finishes: ['foil']}, {id: '6', finishes: ['foil']}]) + '\n');
  });
  it('names an id the file does not hold even when it holds the others', () => {
    const write = () => writeFinishes({path: setChunkPath('4'), text: chunk, values: new Map([['946', ['foil']], ['99999', ['foil']]])});
    expect(write).toThrow(FinishFileError);
    expect(write).toThrow("99999 isn't in apps/web/public/data/collection/4.json");
  });
  it('is a FinishFileError by name', () => {
    expect(new FinishFileError('x')).toBeInstanceOf(Error);
    expect(new FinishFileError('x').name).toBe('FinishFileError');
  });
  it('names the id a file lacks on its refusal, for the publish to name the change', () => {
    const write = () => writeFinishes({path: setChunkPath('4'), text: chunk, values: new Map([['99999', ['foil']]])});
    expect(write).toThrow(expect.objectContaining({name: 'FinishFileError', id: '99999'}));
    // A path that is none of the four files is wrong whatever the ids: it names none.
    expect(() => readFinishes({path: 'README.md', text: ''})).toThrow(expect.objectContaining({id: undefined}));
  });
  it.each([
    'apps/web/public/data/previewCards.json',
    'apps/web/public/data/collection/index.json',
    'apps/web/public/data/collection/sub/4.json',
    'README.md',
  ])('refuses %s, which is none of the four files', (path) => {
    expect(() => readFinishes({path, text: '[]'})).toThrow(FinishFileError);
    expect(() => writeFinishes({path, text: '[]', values: new Map()})).toThrow(FinishFileError);
  });
  it.each([ALL_CARDS_PATH, setChunkPath('4'), PROMOS_PATH, CATALOG_PATH])('reads every finishes value the pinned %s holds', (path) => {
    const text = pinnedText(path);
    const keys = text.match(/"finishes":/g)?.length ?? 0;
    expect([...readFinishes({path, text}).values()].filter((finishes) => finishes !== null)).toHaveLength(keys);
  });
});

/*
 * A write serializes the whole file in its format, so a file whose text has drifted from that format
 * (a newline added or dropped at the end by hand) would be rewritten all over, not only where an entry
 * changes. Such a file is refused, naming its format, before anything is written (#74).
 */
describe('a file whose text drifted from its format', () => {
  it.each([
    ['allCards.json, without its newline at the end', ALL_CARDS_PATH, all.trimEnd(), 'JSON.stringify(x, null, 2) and a newline'],
    ['a collection file, without its newline at the end', setChunkPath('4'), chunk.trimEnd(), 'JSON.stringify(x) and a newline'],
    ['the catalog, with a newline at the end', CATALOG_PATH, `${catalog}\n`, 'JSON.stringify(x, null, 2), with no newline at the end'],
  ])('refuses %s, naming its path and its format, before it writes', (_file, path, text, format) => {
    const message = `${path} isn't in its format (${format}), so a publish would rewrite all of it. Put it back in that format first.`;
    // Whatever the write sets: an entry the file holds, or none.
    const [id] = readFinishes({path, text}).keys();
    for (const values of [new Map<string, PrintingFinishes>(), new Map<string, PrintingFinishes>([[id, ['foil']]])]) {
      expect(() => writeFinishes({path, text, values})).toThrow(expect.objectContaining({name: 'FinishFileError', message}));
    }
    expect(() => requireItsFormat({path, text})).toThrow(expect.objectContaining({name: 'FinishFileError', message}));
  });

  // The pinned app files pass too: the round trip above checks each.
  it('passes each file that is in its format', () => {
    for (const [path, text] of [[ALL_CARDS_PATH, all], [setChunkPath('4'), chunk], [CATALOG_PATH, catalog]]) {
      expect(() => requireItsFormat({path, text}), path).not.toThrow();
    }
  });
});

describe('readEntryFacts', () => {
  it('reads each entry’s versions and rarity, null and undefined where it names none', () => {
    expect(readEntryFacts({path: setChunkPath('4'), text: chunk})).toEqual(
      new Map([
        ['946', {finishes: null, rarity: 'Legendary'}],
        ['750', {finishes: null, rarity: 'Legendary'}],
      ]),
    );
    expect(readEntryFacts({path: ALL_CARDS_PATH, text: all})).toEqual(
      new Map([
        ['2035', {finishes: null, rarity: 'Uncommon'}],
        ['80017', {finishes: ['normal'], rarity: 'Special'}],
      ]),
    );
    expect(readEntryFacts({path: CATALOG_PATH, text: catalog}).get('3237')).toEqual({finishes: null, rarity: 'Special'});
    expect(readEntryFacts({path: PROMOS_PATH, text: '[{"id":1}]\n'}).get('1')).toEqual({finishes: null, rarity: undefined});
  });

  it('refuses a path that is none of the four files, as readFinishes does', () => {
    expect(() => readEntryFacts({path: 'apps/web/public/data/collection/index.json', text: '[]'})).toThrow(FinishFileError);
  });

  // A clash shows what a printing comes in now by the rarity its entry gives it, so every entry needs one.
  it.each([ALL_CARDS_PATH, setChunkPath('4'), PROMOS_PATH, CATALOG_PATH])(
    'reads the versions readFinishes reads, and a rarity for every entry, from the pinned %s',
    (path) => {
      const text = pinnedText(path);
      const facts = readEntryFacts({path, text});
      expect(new Map([...facts].map(([id, {finishes}]) => [id, finishes]))).toEqual(readFinishes({path, text}));
      expect([...facts.values()].filter(({rarity}) => typeof rarity !== 'string')).toEqual([]);
    },
  );
});
