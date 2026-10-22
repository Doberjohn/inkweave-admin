import {describe, expect, it} from 'vitest';
import type {PrintingFinishes} from 'inkweave-synergy-engine';
import type {PrintingRow} from '../printingRows';
import {
  EMPTY_BATCH,
  afterPublish,
  changeFor,
  clashCount,
  hasClash,
  keptClash,
  marksAny,
  removalNote,
  withChange,
  withClashes,
  withoutChange,
  type VersionBatch,
  type VersionChange,
  type VersionClash,
} from '../versionBatch';
import {YEN_SID_ROWS} from './finishFixtures';

/** Yen Sid's #59 (no field, so Both), his Enchanted #209 (no field, so Foil) and his alt foil #223 (`["foil"]`). */
const [CARD_59, ENCHANTED_209, ALT_FOIL_223] = YEN_SID_ROWS;

/** A batch holding these changes, in this order. */
const batchOf = (...changes: VersionChange[]): VersionBatch => ({changes});

/** Someone else made #223 Normal only on the branch since the change was staged. */
const ALT_FOIL_NOW_NORMAL: VersionClash = {id: '946', now: ['normal'], shownNow: ['normal']};

/** #223's row, as the panel reads it again after the branch gave the printing these versions. */
const altFoilNow = (value: PrintingFinishes): PrintingRow => ({...ALT_FOIL_223, value, shown: value});

describe('changeFor', () => {
  it('describes the row and the choice made for it', () => {
    expect(changeFor({row: ALT_FOIL_223, choice: 'both'})).toEqual({
      id: '946',
      label: 'Yen Sid - Powerful Sorcerer #223',
      ref: {id: '946', kind: 'printing', setCode: '4', core: false},
      from: ['foil'],
      shownFrom: ['foil'],
      to: ['normal', 'foil'],
    });
  });

  it('remembers a printing whose files name no versions as having none, and what it showed', () => {
    const change = changeFor({row: CARD_59, choice: 'foil'});
    expect(change.from).toBeNull();
    expect(change.shownFrom).toEqual(['normal', 'foil']);
    expect(change.to).toEqual(['foil']);
    expect(change.clash).toBeUndefined();
  });
});

describe('withChange', () => {
  it('stages a change and replaces it by id', () => {
    const once = withChange(EMPTY_BATCH, changeFor({row: ALT_FOIL_223, choice: 'both'}));
    const twice = withChange(once, changeFor({row: ALT_FOIL_223, choice: 'normal'}));
    expect(twice.changes).toHaveLength(1);
    expect(twice.changes[0].to).toEqual(['normal']);
  });

  it('drops a change that shows the value it started from', () => {
    const back = withChange(
      withChange(EMPTY_BATCH, changeFor({row: ALT_FOIL_223, choice: 'both'})),
      changeFor({row: ALT_FOIL_223, choice: 'foil'}),
    );
    expect(back.changes).toEqual([]);
    // #59 has no field and shows Both: choosing Both writes the same versions the binder already shows.
    expect(withChange(EMPTY_BATCH, changeFor({row: CARD_59, choice: 'both'})).changes).toEqual([]);
  });

  it('counts a choice the printing’s rarity already gives as the value it started from', () => {
    // The Enchanted has no field and shows Foil, as every Enchanted does.
    expect(withChange(EMPTY_BATCH, changeFor({row: ENCHANTED_209, choice: 'foil'})).changes).toEqual([]);
    const both = withChange(EMPTY_BATCH, changeFor({row: ENCHANTED_209, choice: 'both'}));
    expect(both.changes).toHaveLength(1);
    expect(both.changes[0]).toMatchObject({from: null, shownFrom: ['foil'], to: ['normal', 'foil']});
  });

  it('keeps a change where it was when a later choice replaces it', () => {
    const first = changeFor({row: CARD_59, choice: 'foil'});
    const second = changeFor({row: ALT_FOIL_223, choice: 'both'});
    const batch = withChange(withChange(EMPTY_BATCH, first), second);
    expect(batch.changes.map((change) => change.id)).toEqual(['750', '946']);

    const again = withChange(batch, changeFor({row: CARD_59, choice: 'normal'}));
    expect(again.changes.map((change) => [change.id, change.to])).toEqual([
      ['750', ['normal']],
      ['946', ['normal', 'foil']],
    ]);
  });

  it('removes the pending change of a printing that is set back, and leaves the others', () => {
    const batch = batchOf(changeFor({row: CARD_59, choice: 'foil'}), changeFor({row: ALT_FOIL_223, choice: 'both'}));
    const back = withChange(batch, changeFor({row: CARD_59, choice: 'both'}));
    expect(back.changes.map((change) => change.id)).toEqual(['946']);
  });

  it('keeps the base of a change chosen again, whatever its row shows now, and writes only the new choice', () => {
    const staged = changeFor({row: ALT_FOIL_223, choice: 'both'});
    // The branch moved since: someone made #223 Normal only. The panel read it again (a reload, say), so the row says so.
    const again = withChange(batchOf(staged), changeFor({row: altFoilNow(['normal']), choice: 'normal'}));
    // The publish still checks the printing against what it held when the change was first staged.
    expect(again.changes).toEqual([{...staged, to: ['normal']}]);
  });

  it('takes a change back when the owner chooses what the printing showed when it was first staged, whatever its row shows now', () => {
    const staged = withChange(EMPTY_BATCH, changeFor({row: ALT_FOIL_223, choice: 'both'}));
    expect(withChange(staged, changeFor({row: altFoilNow(['normal']), choice: 'foil'})).changes).toEqual([]);
  });

  it('keeps the clash of a change chosen again, with its base: only Keep mine or Drop settles it', () => {
    const clashed = withClashes(batchOf(changeFor({row: ALT_FOIL_223, choice: 'both'})), [ALT_FOIL_NOW_NORMAL]);
    // The panel read the branch again after the refused publish, so the row now says Normal only.
    const again = withChange(clashed, changeFor({row: altFoilNow(['normal']), choice: 'normal'}));
    expect(again.changes).toEqual([{...clashed.changes[0], to: ['normal']}]);
    expect(again.changes[0]).toMatchObject({from: ['foil'], shownFrom: ['foil'], clash: ALT_FOIL_NOW_NORMAL});
    expect(hasClash(again)).toBe(true);
  });

  it('drops a clashed change when the owner chooses what the printing showed when the change was first staged', () => {
    const clashed = withClashes(batchOf(changeFor({row: ALT_FOIL_223, choice: 'both'})), [ALT_FOIL_NOW_NORMAL]);
    expect(withChange(clashed, changeFor({row: altFoilNow(['normal']), choice: 'foil'})).changes).toEqual([]);
  });

  it('keeps the label the change was staged with', () => {
    const staged = changeFor({row: ALT_FOIL_223, choice: 'both'});
    const renamed = changeFor({row: {...ALT_FOIL_223, label: 'Another label'}, choice: 'normal'});
    expect(withChange(batchOf(staged), renamed).changes[0].label).toBe(staged.label);
  });

  it('leaves the batch it was given as it was', () => {
    const batch = batchOf(changeFor({row: ALT_FOIL_223, choice: 'both'}));
    const before = JSON.parse(JSON.stringify(batch)) as VersionBatch;
    withChange(batch, changeFor({row: ALT_FOIL_223, choice: 'normal'}));
    withChange(batch, changeFor({row: ALT_FOIL_223, choice: 'foil'}));
    withChange(batch, changeFor({row: CARD_59, choice: 'foil'}));
    expect(batch).toEqual(before);
  });
});

describe('withoutChange', () => {
  it('removes the change of a printing and leaves the others', () => {
    const batch = batchOf(changeFor({row: CARD_59, choice: 'foil'}), changeFor({row: ALT_FOIL_223, choice: 'both'}));
    expect(withoutChange(batch, '750').changes.map((change) => change.id)).toEqual(['946']);
    expect(withoutChange(withoutChange(batch, '750'), '946').changes).toEqual([]);
  });

  it('leaves the changes as they are for a printing that has none', () => {
    const batch = batchOf(changeFor({row: ALT_FOIL_223, choice: 'both'}));
    expect(withoutChange(batch, '750').changes).toEqual(batch.changes);
    expect(withoutChange(EMPTY_BATCH, '750').changes).toEqual([]);
  });
});

describe('clashes', () => {
  it('marks clashes, keeps one on top of the new value, and blocks publish meanwhile', () => {
    const batch = withChange(EMPTY_BATCH, changeFor({row: ALT_FOIL_223, choice: 'both'}));
    const clashed = withClashes(batch, [{id: '946', now: ['normal'], shownNow: ['normal']}]);
    expect(hasClash(clashed)).toBe(true);
    const kept = keptClash(clashed, '946');
    expect(kept.changes[0]).toMatchObject({from: ['normal'], shownFrom: ['normal'], to: ['normal', 'foil']});
    expect(hasClash(kept)).toBe(false);
  });

  it('has no clash until one is marked', () => {
    expect(hasClash(EMPTY_BATCH)).toBe(false);
    expect(hasClash(batchOf(changeFor({row: ALT_FOIL_223, choice: 'both'})))).toBe(false);
  });

  it('counts the changes that are marked, and only those', () => {
    const batch = batchOf(
      changeFor({row: CARD_59, choice: 'foil'}),
      changeFor({row: ALT_FOIL_223, choice: 'both'}),
      changeFor({row: ENCHANTED_209, choice: 'both'}),
    );
    expect(clashCount(EMPTY_BATCH)).toBe(0);
    expect(clashCount(batch)).toBe(0);
    const one = withClashes(batch, [ALT_FOIL_NOW_NORMAL]);
    expect(clashCount(one)).toBe(1);
    const two = withClashes(one, [ALT_FOIL_NOW_NORMAL, {id: '750', now: null, shownNow: [], gone: true}]);
    expect(clashCount(two)).toBe(2);
    // Keeping one leaves the other marked: the count is of the marks that remain, not of those a publish found.
    expect(clashCount(keptClash(two, '946'))).toBe(1);
    expect(clashCount(withoutChange(two, '750'))).toBe(1);
  });

  it('marks only the changes a clash names, with the clash itself', () => {
    const batch = batchOf(changeFor({row: CARD_59, choice: 'foil'}), changeFor({row: ALT_FOIL_223, choice: 'both'}));
    const clashed = withClashes(batch, [ALT_FOIL_NOW_NORMAL]);
    expect(clashed.changes[0].clash).toBeUndefined();
    expect(clashed.changes[1].clash).toEqual(ALT_FOIL_NOW_NORMAL);
    expect(clashed.changes[1]).toMatchObject(batch.changes[1]);
  });

  it('marks every clash it is given at once, one that is gone included', () => {
    const batch = batchOf(changeFor({row: CARD_59, choice: 'foil'}), changeFor({row: ALT_FOIL_223, choice: 'both'}));
    const gone: VersionClash = {id: '750', now: null, shownNow: [], gone: true};
    const clashed = withClashes(batch, [gone, ALT_FOIL_NOW_NORMAL]);
    expect(clashed.changes.map((change) => change.clash)).toEqual([gone, ALT_FOIL_NOW_NORMAL]);
  });

  it('tells whether any clash names a change the batch holds', () => {
    const batch = batchOf(changeFor({row: CARD_59, choice: 'foil'}), changeFor({row: ALT_FOIL_223, choice: 'both'}));
    expect(marksAny(batch, [ALT_FOIL_NOW_NORMAL])).toBe(true);
    expect(marksAny(batch, [{id: '900', now: null, shownNow: ['foil']}, ALT_FOIL_NOW_NORMAL])).toBe(true);
    // Another tab published or reverted the change the clash names: nothing is left to mark.
    expect(marksAny(withoutChange(batch, '946'), [ALT_FOIL_NOW_NORMAL])).toBe(false);
    expect(marksAny(EMPTY_BATCH, [ALT_FOIL_NOW_NORMAL])).toBe(false);
    expect(marksAny(batch, [])).toBe(false);
  });

  it('leaves the batch it was given unmarked', () => {
    const batch = batchOf(changeFor({row: ALT_FOIL_223, choice: 'both'}));
    withClashes(batch, [ALT_FOIL_NOW_NORMAL]);
    expect(hasClash(batch)).toBe(false);
  });

  it('keeps one clash and leaves the others open', () => {
    const batch = batchOf(changeFor({row: CARD_59, choice: 'foil'}), changeFor({row: ALT_FOIL_223, choice: 'both'}));
    const clashed = withClashes(batch, [{id: '750', now: ['normal'], shownNow: ['normal']}, ALT_FOIL_NOW_NORMAL]);
    const kept = keptClash(clashed, '946');
    expect(kept.changes.map((change) => change.id)).toEqual(['750', '946']);
    expect(kept.changes[0].clash).toBeDefined();
    expect(kept.changes[1].clash).toBeUndefined();
    expect(hasClash(kept)).toBe(true);
  });

  it('lets a change leave the batch when what the branch now has is what it asked for', () => {
    const batch = batchOf(changeFor({row: ALT_FOIL_223, choice: 'both'}));
    const clashed = withClashes(batch, [{id: '946', now: ['normal', 'foil'], shownNow: ['normal', 'foil']}]);
    expect(keptClash(clashed, '946').changes).toEqual([]);
  });

  it('keeps a change on top of a branch that dropped the field', () => {
    // The branch has no field for #223 now, so it shows Both again, as the Legendary's rarity gives it.
    const clashed = withClashes(batchOf(changeFor({row: ALT_FOIL_223, choice: 'normal'})), [
      {id: '946', now: null, shownNow: ['normal', 'foil']},
    ]);
    expect(keptClash(clashed, '946').changes[0]).toMatchObject({
      from: null,
      shownFrom: ['normal', 'foil'],
      to: ['normal'],
    });
  });

  it('has nothing to keep for a printing that is gone, and for one with no clash', () => {
    const batch = batchOf(changeFor({row: ALT_FOIL_223, choice: 'both'}));
    const gone = withClashes(batch, [{id: '946', now: null, shownNow: [], gone: true}]);
    expect(keptClash(gone, '946')).toEqual(gone);
    expect(keptClash(batch, '946')).toEqual(batch);
    expect(keptClash(batch, '750')).toEqual(batch);
  });
});

describe('afterPublish', () => {
  it('removes only the changes a publish sent', () => {
    const a = changeFor({row: CARD_59, choice: 'foil'});
    const b = changeFor({row: ALT_FOIL_223, choice: 'both'});
    const staged = withChange(EMPTY_BATCH, a);
    const sent = staged.changes;
    // B is staged while A's publish is under way.
    const during = withChange(staged, b);
    expect(afterPublish(during, sent).changes).toEqual([b]);
  });

  it('removes a change by identity, so one staged again for the same printing stays', () => {
    const sentChange = changeFor({row: ALT_FOIL_223, choice: 'both'});
    const sent = [sentChange];
    const during = withChange(batchOf(sentChange), changeFor({row: ALT_FOIL_223, choice: 'normal'}));
    const after = afterPublish(during, sent);
    expect(after.changes).toHaveLength(1);
    expect(after.changes[0].to).toEqual(['normal']);
  });

  it('starts a change staged again for a printing it sent from what it sent: the value the branch now holds', () => {
    const sentChange = changeFor({row: ALT_FOIL_223, choice: 'both'});
    // Another tab chose #223 again while the publish ran: Normal only, from the base the sent change had.
    const during = batchOf({...sentChange, to: ['normal']});
    expect(afterPublish(during, [sentChange]).changes).toEqual([
      {...sentChange, from: ['normal', 'foil'], shownFrom: ['normal', 'foil'], to: ['normal']},
    ]);
  });

  it('drops the clash mark of a change it starts again from what it sent', () => {
    const sentChange = changeFor({row: ALT_FOIL_223, choice: 'both'});
    const during = batchOf({...sentChange, to: ['normal'], clash: ALT_FOIL_NOW_NORMAL});
    const [after] = afterPublish(during, [sentChange]).changes;
    expect(after).not.toHaveProperty('clash');
    expect(after).toMatchObject({from: ['normal', 'foil'], shownFrom: ['normal', 'foil'], to: ['normal']});
  });

  it('drops a change staged again that asks for what the publish sent, and keeps the others as they are', () => {
    const sentChange = changeFor({row: ALT_FOIL_223, choice: 'both'});
    const other = changeFor({row: CARD_59, choice: 'foil'});
    // A copy of the sent change, as another tab's save hands it back: another object that asks for the same.
    const during = batchOf({...sentChange}, other);
    const after = afterPublish(during, [sentChange]);
    expect(after.changes).toEqual([other]);
    expect(after.changes[0]).toBe(other);
  });

  it('empties the batch when it sent every change, and leaves it alone when it sent none', () => {
    const batch = batchOf(changeFor({row: CARD_59, choice: 'foil'}), changeFor({row: ALT_FOIL_223, choice: 'both'}));
    expect(afterPublish(batch, batch.changes).changes).toEqual([]);
    expect(afterPublish(batch, []).changes).toEqual(batch.changes);
  });
});

describe('removalNote', () => {
  it('words a removal', () => {
    expect(removalNote(changeFor({row: CARD_59, choice: 'foil'}))).toBe(
      'Removes Normal. Copies counted in it will show under Foil.',
    );
    expect(removalNote(changeFor({row: ALT_FOIL_223, choice: 'both'}))).toBeNull();
  });

  it('names the version that goes, and the one that stays', () => {
    expect(removalNote(changeFor({row: CARD_59, choice: 'normal'}))).toBe(
      'Removes Foil. Copies counted in it will show under Normal.',
    );
    expect(removalNote(changeFor({row: ALT_FOIL_223, choice: 'normal'}))).toBe(
      'Removes Foil. Copies counted in it will show under Normal.',
    );
  });

  it('says nothing when the change only adds a version', () => {
    expect(removalNote(changeFor({row: ENCHANTED_209, choice: 'both'}))).toBeNull();
  });
});
