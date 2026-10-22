import {describe, expect, it} from 'vitest';
import {savedChangesOf} from '../savedChanges';
import {
  NUMBER_209_TO_BOTH,
  NUMBER_223_TO_BOTH,
  NUMBER_223_TO_BOTH_CLASHED,
  NUMBER_59_TO_FOIL,
  NUMBER_59_TO_FOIL_GONE,
} from './finishFixtures';

/*
 * A saved batch is text, which anyone or an earlier build may have written, and the tray reads
 * every field of a change it shows while a publish reads the rest. So an entry is kept only when
 * every one of those fields is what a change holds, and any other goes without a word (Ruling 4).
 */

type Entry = Record<string, unknown>;

/** A change as JSON gives it back: what a saved batch holds, with a key that is undefined gone. */
const saved = (change: unknown): Entry => JSON.parse(JSON.stringify(change)) as Entry;

/** Two good entries that stand beside the bad one, so a test sees that the rest are kept. */
const GOOD = [saved(NUMBER_209_TO_BOTH), saved(NUMBER_59_TO_FOIL)];

/** The entry without `key`. */
const without = (key: string) => (entry: Entry) => {
  const rest = {...entry};
  delete rest[key];
  return rest;
};
/** The entry with `key` set to `value`. */
const set = (key: string, value: unknown) => (entry: Entry) => ({...entry, [key]: value});
/** The entry with `key` of its `ref` (or of its `clash`) set to `value`, which saved as JSON is gone where it is undefined. */
const inPart = (part: 'ref' | 'clash', key: string, value: unknown) => (entry: Entry) => ({
  ...entry,
  [part]: {...(entry[part] as Entry), [key]: value},
});

/** One bad entry: what is wrong with it, the good entry it starts from, and how it is made bad. */
type Bad = [what: string, base: unknown, spoil: (entry: Entry) => unknown];

const PRINTING = NUMBER_223_TO_BOTH;
const CLASHED = NUMBER_223_TO_BOTH_CLASHED;

const BAD_ENTRIES: Bad[] = [
  // Not entries at all.
  ['null', PRINTING, () => null],
  ['text', PRINTING, () => 'foil'],
  ['a number', PRINTING, () => 7],
  ['a list', PRINTING, () => [PRINTING]],
  // id: a non-empty string.
  ['no id', PRINTING, without('id')],
  ['an empty id', PRINTING, set('id', '')],
  ['a number for its id', PRINTING, set('id', 946)],
  ['a null id', PRINTING, set('id', null)],
  // label: a string.
  ['no label', PRINTING, without('label')],
  ['a number for its label', PRINTING, set('label', 223)],
  // ref: an object with a string id, a kind, a string setCode and a boolean core.
  ['no ref', PRINTING, without('ref')],
  ['a null ref', PRINTING, set('ref', null)],
  ['text for its ref', PRINTING, set('ref', '946')],
  ['a list for its ref', PRINTING, set('ref', [])],
  ['no id in its ref', PRINTING, inPart('ref', 'id', undefined)],
  ['a number for the id in its ref', PRINTING, inPart('ref', 'id', 946)],
  ['no kind in its ref', PRINTING, inPart('ref', 'kind', undefined)],
  ['a kind that is none of the three', PRINTING, inPart('ref', 'kind', 'variant')],
  ['no setCode in its ref', PRINTING, inPart('ref', 'setCode', undefined)],
  ['a number for the setCode in its ref', PRINTING, inPart('ref', 'setCode', 4)],
  ['no core in its ref', PRINTING, inPart('ref', 'core', undefined)],
  ['text for the core in its ref', PRINTING, inPart('ref', 'core', 'false')],
  // The entry names one printing: its ref finds the printing its id names.
  ['a ref to another printing', PRINTING, inPart('ref', 'id', '900')],
  ['an id that is not its ref’s', PRINTING, set('id', '947')],
  // from: null, or a list of versions.
  ['no from', PRINTING, without('from')],
  ['text for from', PRINTING, set('from', 'foil')],
  ['a version that is neither normal nor foil in from', PRINTING, set('from', ['standard'])],
  ['a number among the versions of from', PRINTING, set('from', ['foil', 7])],
  // shownFrom: a list of versions, with at least one.
  ['no shownFrom', PRINTING, without('shownFrom')],
  ['a null shownFrom', PRINTING, set('shownFrom', null)],
  ['text for shownFrom', PRINTING, set('shownFrom', 'foil')],
  ['an empty shownFrom', PRINTING, set('shownFrom', [])],
  ['a version that is neither normal nor foil in shownFrom', PRINTING, set('shownFrom', ['standard'])],
  // to: one of the three values.
  ['no to', PRINTING, without('to')],
  ['text for to', PRINTING, set('to', 'foil')],
  ['a choice in the place of to', PRINTING, set('to', ['both'])],
  ['versions out of order in to', PRINTING, set('to', ['foil', 'normal'])],
  ['an empty to', PRINTING, set('to', [])],
  // clash: absent, or an object with a string id, now, shownNow and gone.
  ['a null clash', CLASHED, set('clash', null)],
  ['text for its clash', CLASHED, set('clash', 'yes')],
  ['a list for its clash', CLASHED, set('clash', [])],
  ['an empty clash', CLASHED, set('clash', {})],
  ['no id in its clash', CLASHED, inPart('clash', 'id', undefined)],
  ['a number for the id in its clash', CLASHED, inPart('clash', 'id', 946)],
  ['a clash on another printing', CLASHED, inPart('clash', 'id', '900')],
  ['no now in its clash', CLASHED, inPart('clash', 'now', undefined)],
  ['text for the now of its clash', CLASHED, inPart('clash', 'now', 'normal')],
  ['a version that is neither normal nor foil in now', CLASHED, inPart('clash', 'now', ['standard'])],
  ['no shownNow in its clash', CLASHED, inPart('clash', 'shownNow', undefined)],
  ['text for the shownNow of its clash', CLASHED, inPart('clash', 'shownNow', 'normal')],
  ['a version that is neither normal nor foil in shownNow', CLASHED, inPart('clash', 'shownNow', ['standard'])],
  ['an empty shownNow where the printing is not gone', CLASHED, inPart('clash', 'shownNow', [])],
  [
    'an empty shownNow where gone is false',
    CLASHED,
    (entry) => inPart('clash', 'gone', false)(inPart('clash', 'shownNow', [])(entry)),
  ],
  ['text for gone', CLASHED, inPart('clash', 'gone', 'yes')],
  ['a number for gone', CLASHED, inPart('clash', 'gone', 1)],
  ['a null gone', CLASHED, inPart('clash', 'gone', null)],
];

describe('savedChangesOf', () => {
  it.each(BAD_ENTRIES)('drops an entry with %s, and keeps the others', (_what, base, spoil) => {
    // Saved, the bad entry is JSON like the rest: a key left undefined is a key that is missing.
    const bad = saved(spoil(saved(base)));
    expect(savedChangesOf([GOOD[0], bad, GOOD[1]])).toEqual(GOOD);
  });

  it('keeps every kind of change the studio makes, as JSON hands it back', () => {
    // A change on a printing whose files name no versions, a clash with the versions the branch shows now, and a printing that is gone.
    const entries = [NUMBER_209_TO_BOTH, NUMBER_223_TO_BOTH_CLASHED, NUMBER_59_TO_FOIL_GONE].map(saved);
    expect(savedChangesOf(entries)).toEqual(entries);
  });

  it('keeps a change on a printing whose files name no versions, and a clash on one', () => {
    // `from` and `now` are null where the files give the printing no `finishes`: its rarity gives the versions.
    expect(NUMBER_209_TO_BOTH.from).toBeNull();
    const byRarity = saved({...NUMBER_209_TO_BOTH, clash: {id: '900', now: null, shownNow: ['foil']}});
    expect(savedChangesOf([byRarity])).toEqual([byRarity]);
  });

  it('keeps a clash on a printing that is gone, whether or not it lists the versions it showed', () => {
    const gone = (id: string, shownNow: unknown) =>
      saved({
        ...NUMBER_59_TO_FOIL_GONE,
        id,
        ref: {...NUMBER_59_TO_FOIL_GONE.ref, id},
        clash: {id, now: null, shownNow, gone: true},
      });
    const entries = [gone('1', []), gone('2', ['normal'])];
    expect(savedChangesOf(entries)).toEqual(entries);
  });

  it('keeps a clash that says gone is false, so long as it lists the versions the printing shows now', () => {
    const notGone = saved({...CLASHED, clash: {id: '946', now: ['normal'], shownNow: ['normal'], gone: false}});
    expect(savedChangesOf([notGone])).toEqual([notGone]);
  });

  it('keeps an entry that carries a key it does not know, as a later build may add one', () => {
    const later = {...saved(PRINTING), addedLater: {anything: true}};
    expect(savedChangesOf([later])).toEqual([later]);
  });

  it('keeps the first entry for a printing, and drops the later ones', () => {
    const first = saved(PRINTING);
    const later = {...saved(PRINTING), to: ['normal']};
    expect(savedChangesOf([first, GOOD[0], later, GOOD[1]])).toEqual([first, ...GOOD]);
  });

  it('keeps the first entry that is good where an earlier entry for the printing is not', () => {
    const spoiled = without('shownFrom')(saved(PRINTING));
    const good = saved(PRINTING);
    expect(savedChangesOf([spoiled, good])).toEqual([good]);
  });

  it('keeps the order of the entries, and holds none when it is given none', () => {
    expect(savedChangesOf([GOOD[1], GOOD[0]])).toEqual([GOOD[1], GOOD[0]]);
    expect(savedChangesOf([])).toEqual([]);
  });
});
