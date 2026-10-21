import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import type {PrintingFinishes} from 'inkweave-synergy-engine';
import {describe, expect, it} from 'vitest';
import {
  ALL_CARDS_PATH,
  CATALOG_PATH,
  FinishFileError,
  PROMOS_PATH,
  readEntryFacts,
  readFinishes,
  setChunkPath,
  writeFinishes,
} from '../finishFiles';

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
  it('round-trips the pinned app files byte for byte', () => {
    for (const rel of ['allCards.json', 'collection/4.json', 'collection/promos.json']) {
      const path = `apps/web/public/data/${rel}`;
      const text = readFileSync(resolve('upstream/inkweave', path), 'utf8');
      expect(writeFinishes({path, text, values: new Map()})).toBe(text);
    }
    const text = readFileSync(resolve('upstream/inkweave', CATALOG_PATH), 'utf8');
    expect(writeFinishes({path: CATALOG_PATH, text, values: new Map()})).toBe(text);
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
    const text = readFileSync(resolve('upstream/inkweave', path), 'utf8');
    const keys = text.match(/"finishes":/g)?.length ?? 0;
    expect([...readFinishes({path, text}).values()].filter((finishes) => finishes !== null)).toHaveLength(keys);
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
      const text = readFileSync(resolve('upstream/inkweave', path), 'utf8');
      const facts = readEntryFacts({path, text});
      expect(new Map([...facts].map(([id, {finishes}]) => [id, finishes]))).toEqual(readFinishes({path, text}));
      expect([...facts.values()].filter(({rarity}) => typeof rarity !== 'string')).toEqual([]);
    },
  );
});
