import {describe, expect, it} from 'vitest';
import {readEntries, type DataEntry} from '../dataEntries';

const ALL_CARDS = 'apps/web/public/data/allCards.json';
const PREVIEW = 'apps/web/public/data/previewCards.json';
const CATALOG = 'scripts/data/promo-printings.json';
const PROMOS = 'apps/web/public/data/collection/promos.json';
const CHUNK = 'apps/web/public/data/collection/4.json';

/** Each entry's id, card and label, the way a test reads them. */
function named(path: string, file: unknown): Array<Pick<DataEntry, 'id' | 'cardId' | 'label'>> {
  const entries = readEntries({path, text: JSON.stringify(file)});
  return [...(entries?.values() ?? [])].map(({id, cardId, label}) => ({id, cardId, label}));
}

describe('readEntries', () => {
  it("reads allCards.json's cards and the printings under them, each printing named after its card", () => {
    const file = {
      cards: [
        {
          id: 1936,
          fullName: 'Bruno Madrigal - Undetected Uncle',
          setCode: '9',
          number: 0,
          variants: [
            {id: 1194, number: 4, promoGrouping: 'D23'},
            {id: 1195, number: 209, rarity: 'Enchanted'},
          ],
        },
      ],
    };
    expect(named(ALL_CARDS, file)).toEqual([
      {id: '1936', cardId: '1936', label: 'Bruno Madrigal - Undetected Uncle #0'},
      {id: '1194', cardId: '1936', label: 'Bruno Madrigal - Undetected Uncle 4/D23'},
      {id: '1195', cardId: '1936', label: 'Bruno Madrigal - Undetected Uncle #209 · Enchanted'},
    ]);
  });

  it("leaves a card's printings out of its own fields", () => {
    const entries = readEntries({path: ALL_CARDS, text: JSON.stringify({cards: [{id: 1, fullName: 'A', number: 1, variants: [{id: 2}]}]})});
    expect(entries?.get('1')?.fields).toEqual({id: 1, fullName: 'A', number: 1});
  });

  it("reads previewCards.json's cards", () => {
    expect(named(PREVIEW, {metadata: {}, cards: [{id: 14046, fullName: 'Madam Mim - Rhyming Rascal', setCode: '14', number: 46}]})).toEqual([
      {id: '14046', cardId: '14046', label: 'Madam Mim - Rhyming Rascal #46'},
    ]);
  });

  it("reads the catalog's promos, a group's printed code and name, and a group with no base card", () => {
    const file = {
      about: 'x',
      fold: [
        {
          baseId: 2154,
          fullName: 'Moana - Adventurer of Land and Sea',
          variants: [{id: 3001, number: 26, promoGrouping: 'P2', printedName: 'Vaiana'}, {id: 3002, number: 24, artVariant: 'A', promoGrouping: 'P2'}],
        },
      ],
      noBaseCard: [{fullName: 'Dragon Fire', variants: [{id: 1187, number: 1, promoGrouping: 'C1'}]}],
    };
    expect(named(CATALOG, file)).toEqual([
      {id: '3001', cardId: '2154', label: 'Moana - Adventurer of Land and Sea 26/P2 · Vaiana'},
      {id: '3002', cardId: '2154', label: 'Moana - Adventurer of Land and Sea 24A/P2'},
      {id: '1187', cardId: null, label: 'Dragon Fire 1/C1'},
    ]);
  });

  it('reads a collection file: promos by their base card, a chunk’s printings and its cards', () => {
    expect(named(PROMOS, [{id: 1187, number: 1, promoGrouping: 'C1', fullName: 'Dragon Fire', baseId: 2322}])).toEqual([
      {id: '1187', cardId: '2322', label: 'Dragon Fire 1/C1'},
    ]);
    const chunk = [
      {id: 900, fullName: 'Yen Sid - Powerful Sorcerer', setCode: '4', number: 223, rarity: 'Legendary'},
      {id: 901, fullName: 'Yen Sid - Powerful Sorcerer', setCode: '4', number: 230, rarity: 'Enchanted', baseId: 900},
    ];
    expect(named(CHUNK, chunk)).toEqual([
      {id: '900', cardId: '900', label: 'Yen Sid - Powerful Sorcerer #223 · Set 4'},
      {id: '901', cardId: '900', label: 'Yen Sid - Powerful Sorcerer #230 · Enchanted · Set 4'},
    ]);
  });

  // Set 3's Dalmatian Puppy - Tail Wagger cards are all #4, so only their ids tell them apart, as in the Printings panel (#74).
  it('ends the labels of entries that share one with their ids, as the Printings panel ends a twin’s, and no other label', () => {
    const puppy = {fullName: 'Dalmatian Puppy - Tail Wagger', setCode: '3', number: 4, rarity: 'Common'};
    const chunk = [
      {...puppy, id: 436},
      {...puppy, id: 437},
      {id: 900, fullName: 'Yen Sid - Powerful Sorcerer', setCode: '3', number: 4, rarity: 'Legendary'},
    ];
    expect(named('apps/web/public/data/collection/3.json', chunk).map(({label}) => label)).toEqual([
      'Dalmatian Puppy - Tail Wagger #4 · Set 3 · id 436',
      'Dalmatian Puppy - Tail Wagger #4 · Set 3 · id 437',
      'Yen Sid - Powerful Sorcerer #4 · Set 3',
    ]);
  });

  it('leaves the label of an entry a file holds twice as it is: it is one entry, not two alike', () => {
    const entry = {id: 900, fullName: 'Yen Sid - Powerful Sorcerer', setCode: '4', number: 223, rarity: 'Legendary'};
    expect(named(CHUNK, [entry, entry])).toEqual([{id: '900', cardId: '900', label: 'Yen Sid - Powerful Sorcerer #223 · Set 4'}]);
  });

  it("reads no file it doesn't know, and no layout it doesn't expect", () => {
    expect(readEntries({path: 'apps/web/public/data/other.json', text: '[]'})).toBeNull();
    expect(readEntries({path: ALL_CARDS, text: '[]'})).toBeNull();
    expect(readEntries({path: CHUNK, text: '{}'})).toBeNull();
  });

  it("throws on text that isn't JSON", () => {
    expect(() => readEntries({path: ALL_CARDS, text: '{'})).toThrow();
  });
});
