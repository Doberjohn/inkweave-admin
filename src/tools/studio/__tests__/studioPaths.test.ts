import {studioHref} from '../../../shell/nav';
import {
  draftsAtRisk,
  forgetTokenQuestion,
  shouldBlockStudioNavigation,
  studioCardOf,
  studioModeOf,
  studioUnsavedMessage,
  studioUnsavedQuestion,
} from '../studioPaths';

// A URL has the pathname and search a router Location has.
const at = (path: string) => new URL(path, 'https://admin.test');

// The drafts that can hold unsaved edits: New reveal's form, Edit card's, and Edit card's promo printing form (#77).
const CLEAN = {reveal: false, edit: false, printing: false};
const REVEAL = {...CLEAN, reveal: true};
const EDIT = {...CLEAN, edit: true};
const PRINTING = {...CLEAN, printing: true};
const REVEAL_EDIT = {...CLEAN, reveal: true, edit: true};
const REVEAL_PRINTING = {...CLEAN, reveal: true, printing: true};
const EDIT_PRINTING = {...CLEAN, edit: true, printing: true};
const ALL = {reveal: true, edit: true, printing: true};

describe('studioModeOf', () => {
  it.each([
    ['/studio?mode=edit', 'edit'],
    ['/studio?mode=edit&card=14023', 'edit'],
    ['/studio', 'new'],
    ['/studio?card=14023', 'new'],
    ['/studio?mode=EDIT', 'new'],
  ] as const)('reads %s as %s', (path, mode) => {
    expect(studioModeOf(at(path))).toBe(mode);
  });

  it('reads back the mode studioHref writes', () => {
    expect(studioModeOf(at(studioHref('edit', '14023')))).toBe('edit');
    expect(studioModeOf(at(studioHref('new', '14023')))).toBe('new');
  });
});

describe('studioCardOf', () => {
  it.each([
    ['/studio?mode=edit&card=14023', '14023'],
    ['/studio?card=14023', '14023'],
    ['/studio?mode=edit', null],
    ['/studio?mode=edit&card=', null],
  ] as const)('reads %s as card %j', (path, card) => {
    expect(studioCardOf(at(path))).toBe(card);
  });

  it.each(['14023', 'a&b c', 'é/?#'])('reads back the id %j that studioHref writes', (id) => {
    expect(studioCardOf(at(studioHref('edit', id)))).toBe(id);
  });
});

describe('shouldBlockStudioNavigation', () => {
  it.each([
    {why: 'leaving the studio holds a New reveal draft', from: '/studio', to: '/', dirty: REVEAL, blocks: true},
    {why: 'leaving the studio holds an Edit draft', from: '/studio?mode=edit&card=1', to: '/cards/1', dirty: EDIT, blocks: true},
    {why: 'leaving the studio holds a printing form', from: '/studio?mode=edit&card=1', to: '/cards/1', dirty: PRINTING, blocks: true},
    {why: 'leaving with every draft clean goes through', from: '/studio', to: '/', dirty: CLEAN, blocks: false},
    {why: 'another card holds an Edit draft', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', dirty: EDIT, blocks: true},
    {why: 'another card holds a printing form', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', dirty: PRINTING, blocks: true},
    {why: 'another card leaves a New reveal draft be', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', dirty: REVEAL, blocks: false},
    {why: 'no card holds an Edit draft', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit', dirty: EDIT, blocks: true},
    {why: 'no card holds a printing form', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit', dirty: PRINTING, blocks: true},
    // R-57: every draft stays mounted, so a mode switch never asks.
    {why: 'a switch to New reveal keeps the drafts', from: '/studio?mode=edit&card=14023', to: studioHref('new', '14023'), dirty: REVEAL_EDIT, blocks: false},
    {why: 'a switch to New reveal keeps a printing form', from: '/studio?mode=edit&card=1', to: '/studio?card=1', dirty: PRINTING, blocks: false},
    {why: 'a switch to Edit card keeps the drafts', from: '/studio?card=14023', to: studioHref('edit', '14023'), dirty: ALL, blocks: false},
    {why: 'a switch with no card keeps the drafts', from: '/studio', to: studioHref('edit'), dirty: ALL, blocks: false},
  ])('$why', ({from, to, dirty, blocks}) => {
    expect(shouldBlockStudioNavigation(at(from), at(to), dirty)).toBe(blocks);
  });
});

describe('draftsAtRisk', () => {
  it('names every dirty draft when the navigation leaves the studio', () => {
    expect(draftsAtRisk(at('/studio?mode=edit&card=1'), at('/'), ALL)).toEqual(ALL);
    expect(draftsAtRisk(at('/studio'), at('/calibration'), REVEAL)).toEqual(REVEAL);
    expect(draftsAtRisk(at('/studio?mode=edit&card=1'), at('/'), PRINTING)).toEqual(PRINTING);
  });

  it('names the Edit draft and the printing form when the card changes, and never New reveal', () => {
    expect(draftsAtRisk(at('/studio?mode=edit&card=1'), at('/studio?mode=edit&card=2'), ALL)).toEqual(EDIT_PRINTING);
    expect(draftsAtRisk(at('/studio?mode=edit&card=1'), at('/studio?mode=edit&card=2'), REVEAL_EDIT)).toEqual(EDIT);
    expect(draftsAtRisk(at('/studio?mode=edit&card=1'), at('/studio?mode=edit&card=2'), PRINTING)).toEqual(PRINTING);
  });

  it('names none on a mode switch', () => {
    expect(draftsAtRisk(at('/studio?mode=edit&card=1'), at('/studio?card=1'), ALL)).toEqual(CLEAN);
  });
});

// The guard's lines (R-58). The branch is master: vite.config.ts pins VITE_ADMIN_TARGET_BRANCH empty in tests.
const UNPUBLISHED = "Your New reveal card isn't published yet. Leaving Card studio drops it.";
const UNSAVED = "Your Edit card changes aren't saved yet. Leaving Card studio drops them.";
const UNSAVED_CARD = "Your changes to this card aren't saved yet. Leaving the card drops them.";
const SAVED_CARD = 'Your changes to this card are saved. Leaving the card drops nothing.';
const PUBLISHING = "A publish to master is in progress. Leaving won't stop it, and you won't see whether it landed.";
// The form stays editable while a save runs, and a landed save makes only what it sent the baseline (useEditSave's
// land), so Edit's in-flight line adds what leaving still drops: the edits made since, and a failed save's own,
// which go with the draft.
const SAVING =
  "A save to master is in progress. Leaving won't stop it, and you won't see whether it landed. " +
  'Any edits made since the save started are dropped, and if the save fails, its changes are lost too.';
// R4-8c: the drafts in one sentence, so "Leaving Card studio drops" isn't said twice. The printing form (#77) is
// named last, as New reveal and Edit card are in their order, and three drafts end "drops all three".
const UNSAVED_BOTH =
  "Your New reveal card isn't published yet, and your Edit card changes aren't saved yet. Leaving Card studio drops both.";
const PRINTING_LEAVES = "Your printing form isn't published yet. Leaving Card studio drops it.";
const PRINTING_CARD = "Your printing form for this card isn't published yet. Leaving the card drops it.";
const REVEAL_PRINTING_LEAVES =
  "Your New reveal card isn't published yet, and your printing form isn't published yet. Leaving Card studio drops both.";
const EDIT_PRINTING_LEAVES =
  "Your Edit card changes aren't saved yet, and your printing form isn't published yet. Leaving Card studio drops both.";
const ALL_LEAVES =
  "Your New reveal card isn't published yet, your Edit card changes aren't saved yet, and your printing form isn't published yet. " +
  'Leaving Card studio drops all three.';
// A card change names the card in both clauses: the second says "for it".
const EDIT_PRINTING_CARD =
  "Your changes to this card aren't saved yet, and your printing form for it isn't published yet. Leaving the card drops both.";

describe('studioUnsavedMessage', () => {
  it.each([
    {why: 'leaving names the New reveal draft', from: '/studio', to: '/', drafts: REVEAL, busy: CLEAN, says: UNPUBLISHED},
    {why: 'leaving names the Edit draft', from: '/studio?mode=edit&card=1', to: '/cards/1', drafts: EDIT, busy: CLEAN, says: UNSAVED},
    {why: 'leaving names the printing form', from: '/studio?mode=edit&card=1', to: '/cards/1', drafts: PRINTING, busy: CLEAN, says: PRINTING_LEAVES},
    {why: 'leaving names New reveal and Edit card in one sentence, New reveal first', from: '/studio?card=1', to: '/', drafts: REVEAL_EDIT, busy: CLEAN, says: UNSAVED_BOTH},
    {why: 'leaving names New reveal and the printing form in one sentence', from: '/studio?card=1', to: '/', drafts: REVEAL_PRINTING, busy: CLEAN, says: REVEAL_PRINTING_LEAVES},
    {why: 'leaving names Edit card and the printing form in one sentence', from: '/studio?mode=edit&card=1', to: '/', drafts: EDIT_PRINTING, busy: CLEAN, says: EDIT_PRINTING_LEAVES},
    {why: 'leaving names all three in one sentence, in the order the studio names them', from: '/studio?mode=edit&card=1', to: '/calibration', drafts: ALL, busy: CLEAN, says: ALL_LEAVES},
    // The message sees Edit's busy alone, which StudioWorkspace takes from savingThisDraft (R4-8c): false while the
    // save running was made on another card. A card change then reaches it as this row's does, with no save of this
    // draft's, so no row here can tell the two apart. StudioEdit.test.tsx's card change mid-save and
    // useCardEditor.save.test.ts's next-card case pin savingThisDraft itself.
    {why: 'a card change with no save of this draft running names the edits', from: '/studio?mode=edit&card=2', to: '/studio?mode=edit&card=3', drafts: EDIT, busy: CLEAN, says: UNSAVED_CARD},
    {why: 'another card names only the Edit draft', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', drafts: REVEAL_EDIT, busy: CLEAN, says: UNSAVED_CARD},
    {why: 'the search names only the Edit draft', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit', drafts: REVEAL_EDIT, busy: CLEAN, says: UNSAVED_CARD},
    {why: 'another card names the printing form, which belongs to its card', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', drafts: PRINTING, busy: CLEAN, says: PRINTING_CARD},
    {why: 'the search names the printing form too', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit', drafts: PRINTING, busy: CLEAN, says: PRINTING_CARD},
    {why: 'another card names the Edit draft and the printing form in one sentence', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', drafts: EDIT_PRINTING, busy: CLEAN, says: EDIT_PRINTING_CARD},
    {why: 'another card names only those two when New reveal is dirty as well', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', drafts: ALL, busy: CLEAN, says: EDIT_PRINTING_CARD},
    {why: 'a publish in flight takes the shared line', from: '/studio', to: '/', drafts: REVEAL, busy: REVEAL, says: PUBLISHING},
    {why: 'a printing publish in flight takes the shared line', from: '/studio?mode=edit&card=1', to: '/', drafts: PRINTING, busy: PRINTING, says: PUBLISHING},
    {why: 'a printing publish in flight takes it on a card change too', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', drafts: PRINTING, busy: PRINTING, says: PUBLISHING},
    {why: 'a save in flight takes it, with what leaving still drops, beside an unpublished card', from: '/studio?mode=edit&card=1', to: '/', drafts: REVEAL_EDIT, busy: EDIT, says: `${UNPUBLISHED} ${SAVING}`},
    {why: 'a save in flight takes it, with what leaving still drops, on a card change', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', drafts: EDIT, busy: EDIT, says: SAVING},
    // With a commit in flight the drafts take a line each, the one in flight in its own words, as before the printing form.
    {why: 'a printing publish in flight beside an unpublished card gets a line each', from: '/studio?card=1', to: '/', drafts: REVEAL_PRINTING, busy: PRINTING, says: `${UNPUBLISHED} ${PUBLISHING}`},
    {why: 'a printing publish in flight beside two unsaved drafts gets a line each', from: '/studio?mode=edit&card=1', to: '/', drafts: ALL, busy: PRINTING, says: `${UNPUBLISHED} ${UNSAVED} ${PUBLISHING}`},
    {why: 'a printing publish in flight beside unsaved edits gets a line each on a card change', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', drafts: EDIT_PRINTING, busy: PRINTING, says: `${UNSAVED_CARD} ${PUBLISHING}`},
    {why: 'a save in flight beside an unpublished form gets a line each on a card change', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', drafts: EDIT_PRINTING, busy: EDIT, says: `${SAVING} ${PRINTING_CARD}`},
    // A card change keeps New reveal's draft, so its publish in flight goes unmentioned.
    {why: 'a card change leaves a publish in flight out', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', drafts: REVEAL_EDIT, busy: REVEAL, says: UNSAVED_CARD},
    {why: 'a card change leaves a publish in flight out beside the printing form', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', drafts: ALL, busy: REVEAL, says: EDIT_PRINTING_CARD},
    // The guard ends a hold only once no draft is dirty: a card change held past Edit's save stays open
    // while New reveal is dirty, and the open dialog shows what this returns (R4-5s).
    {why: 'a card change held past its save says nothing is left to drop', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', drafts: REVEAL, busy: CLEAN, says: SAVED_CARD},
  ])('$why', ({from, to, drafts, busy, says}) => {
    expect(studioUnsavedMessage({from: at(from), to: at(to), drafts, busy})).toBe(says);
  });
});

describe('studioUnsavedQuestion (R4-8c)', () => {
  it('asks about the card on a card change, which stays on the page', () => {
    const leave = {from: at('/studio?mode=edit&card=1'), to: at('/studio?mode=edit&card=2'), drafts: EDIT, busy: CLEAN};
    expect(studioUnsavedQuestion(leave)).toEqual({
      title: 'Leave this card?',
      message: UNSAVED_CARD,
      stay: 'Keep editing',
      leave: 'Drop changes',
    });
  });

  // R4-8f: where the card's saved edits stay with its save, the leave answer doesn't say it drops changes. A save in
  // flight still drops the edits made since it started, and its own changes if it fails, and its line says so.
  // The printing form's publish (#77) is the same: leaving doesn't stop it, so "Drop changes" would claim too much.
  it.each([
    {why: 'its save landed while the dialog was open', drafts: REVEAL, busy: CLEAN, says: SAVED_CARD, leave: 'Leave the card'},
    {why: 'its own save is in flight', drafts: EDIT, busy: EDIT, says: SAVING, leave: 'Leave the card'},
    {why: "only New reveal's publish is in flight", drafts: REVEAL_EDIT, busy: REVEAL, says: UNSAVED_CARD, leave: 'Drop changes'},
    {why: 'the printing form is unpublished and no commit is in flight', drafts: PRINTING, busy: CLEAN, says: PRINTING_CARD, leave: 'Drop changes'},
    {why: 'the printing form and the Edit draft are unsaved and no commit is in flight', drafts: EDIT_PRINTING, busy: CLEAN, says: EDIT_PRINTING_CARD, leave: 'Drop changes'},
    {why: "the printing form's publish is in flight", drafts: PRINTING, busy: PRINTING, says: PUBLISHING, leave: 'Leave the card'},
    {why: "the printing form's publish is in flight beside unsaved edits", drafts: EDIT_PRINTING, busy: PRINTING, says: `${UNSAVED_CARD} ${PUBLISHING}`, leave: 'Leave the card'},
    {why: "Edit's save is in flight beside an unpublished printing form", drafts: EDIT_PRINTING, busy: EDIT, says: `${SAVING} ${PRINTING_CARD}`, leave: 'Leave the card'},
    {why: "only New reveal's publish is in flight beside the printing form", drafts: ALL, busy: REVEAL, says: EDIT_PRINTING_CARD, leave: 'Drop changes'},
  ])('answers a card change in words that fit when $why', ({drafts, busy, says, leave}) => {
    const change = {from: at('/studio?mode=edit&card=1'), to: at('/studio?mode=edit&card=2'), drafts, busy};
    expect(studioUnsavedQuestion(change)).toEqual({title: 'Leave this card?', message: says, stay: 'Keep editing', leave});
  });

  it.each([
    {where: 'the Overview', to: '/', drafts: EDIT, says: UNSAVED},
    {where: 'Card analytics', to: '/cards/1', drafts: EDIT, says: UNSAVED},
    {where: 'Calibration, with the printing form', to: '/calibration', drafts: PRINTING, says: PRINTING_LEAVES},
    {where: 'the Overview, with every draft', to: '/', drafts: ALL, says: ALL_LEAVES},
  ])("leaves a way out to $where in the guard's own words: the line alone", ({to, drafts, says}) => {
    const leave = {from: at('/studio?mode=edit&card=1'), to: at(to), drafts, busy: CLEAN};
    expect(studioUnsavedQuestion(leave)).toBe(says);
  });
});

describe('forgetTokenQuestion', () => {
  it.each([
    [REVEAL, 'Forget the token and drop your New reveal card?'],
    [EDIT, 'Forget the token and drop your Edit card changes?'],
    [PRINTING, 'Forget the token and drop your printing form?'],
    [REVEAL_EDIT, 'Forget the token and drop your New reveal card and your Edit card changes?'],
    [EDIT_PRINTING, 'Forget the token and drop your Edit card changes and your printing form?'],
    [ALL, 'Forget the token and drop your New reveal card and your Edit card changes and your printing form?'],
  ])('asks before dropping %j (R-84)', (drafts, question) => {
    expect(forgetTokenQuestion(drafts)).toBe(question);
  });

  it('asks nothing while every draft is clean', () => {
    expect(forgetTokenQuestion(CLEAN)).toBeNull();
  });
});
