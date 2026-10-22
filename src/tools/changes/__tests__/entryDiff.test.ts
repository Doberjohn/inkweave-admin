import {describe, expect, it} from 'vitest';
import type {DataEntry, EntryMap} from '../dataEntries';
import {diffEntries, mergeEntryChanges, type EntryChange} from '../entryDiff';

/** A file's entries, from each entry's fields: its id, label and card come from them. */
function file(...entries: Array<Record<string, unknown>>): EntryMap {
  return new Map(
    entries.map((fields): [string, DataEntry] => {
      const id = String(fields.id);
      return [id, {id, cardId: String(fields.baseId ?? fields.id), label: String(fields.fullName ?? id), fields}];
    }),
  );
}

const ELSA = {id: 1, fullName: 'Elsa - Snow Queen', name: 'Elsa', version: 'Snow Queen', cost: 5, color: 'Amethyst', rarity: 'Legendary'};

describe('diffEntries', () => {
  it("words a card's changed fields as Edit card's change list does, in its order", () => {
    const [change] = diffEntries({before: file(ELSA), after: file({...ELSA, cost: 4, color: 'Amethyst-Sapphire'})});
    expect(change).toEqual({
      id: '1',
      cardId: '1',
      label: 'Elsa - Snow Queen',
      kind: 'changed',
      values: [
        {key: 'color', label: 'Ink', from: 'Amethyst', to: 'Amethyst / Sapphire'},
        {key: 'cost', label: 'Cost', from: '5', to: '4'},
      ],
    });
  });

  it("words a printing's versions as the Printings panel does, and none set as Not set", () => {
    const promo = {id: 1194, fullName: 'Bruno 4/D23', baseId: 1936, rarity: 'Special'};
    expect(diffEntries({before: file(promo), after: file({...promo, finishes: ['foil']})})[0].values).toEqual([
      {key: 'finishes', label: 'Versions', from: 'Not set', to: 'Foil only'},
    ]);
    expect(
      diffEntries({before: file({...promo, finishes: ['foil']}), after: file({...promo, finishes: ['normal', 'foil']})})[0].values,
    ).toEqual([{key: 'finishes', label: 'Versions', from: 'Foil only', to: 'Both'}]);
  });

  it('names any other key, printing a short value and holding back a long one', () => {
    const full = 'https://example.com/a-long-path/to-an-image/that-goes-on-and-on.jpg';
    const before = {id: 7, fullName: 'X', number: 12, images: {full, thumb: 'https://example.com/t.jpg'}};
    const after = {...before, number: 13, images: {...before.images, thumb: 'https://example.com/u.jpg'}};
    expect(diffEntries({before: file(before), after: file(after)})[0].values).toEqual([
      {key: 'number', label: 'number', from: '12', to: '13'},
      {key: 'images', label: 'images', from: null, to: null},
    ]);
  });

  it('lists the entries added and changed in the file’s order, then the ones removed, and none left as they were', () => {
    const changes = diffEntries({
      before: file(ELSA, {id: 2, fullName: 'Gone'}, {id: 3, fullName: 'Kept'}),
      after: file({id: 4, fullName: 'New'}, {...ELSA, cost: 4}, {id: 3, fullName: 'Kept'}),
    });
    expect(changes.map(({label, kind}) => [label, kind])).toEqual([
      ['New', 'added'],
      ['Elsa - Snow Queen', 'changed'],
      ['Gone', 'removed'],
    ]);
  });
});

describe('mergeEntryChanges', () => {
  const versions = {key: 'finishes', label: 'Versions', from: 'Not set', to: 'Foil only'};
  const inCatalog: EntryChange = {id: '1194', cardId: '1936', label: 'Bruno 4/D23', kind: 'changed', values: [versions]};

  it("makes a promo's change to three files one line, named by the first file", () => {
    const inAllCards: EntryChange = {...inCatalog, label: 'Bruno Madrigal 4/D23'};
    expect(mergeEntryChanges([[inCatalog], [inCatalog], [inAllCards]])).toEqual([inCatalog]);
  });

  it('adds the values a later file lists that the first one doesn’t', () => {
    const number = {key: 'number', label: 'number', from: '4', to: '5'};
    const merged = mergeEntryChanges([[inCatalog], [{...inCatalog, values: [versions, number]}]]);
    expect(merged).toEqual([{...inCatalog, values: [versions, number]}]);
  });
});
