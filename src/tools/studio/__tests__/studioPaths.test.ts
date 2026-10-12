import {studioHref} from '../../../shell/nav';
import {
  draftsAtRisk,
  forgetTokenQuestion,
  shouldBlockStudioNavigation,
  studioCardOf,
  studioModeOf,
  studioUnsavedMessage,
} from '../studioPaths';

// A URL has the pathname and search a router Location has.
const at = (path: string) => new URL(path, 'https://admin.test');

const CLEAN = {reveal: false, edit: false};
const REVEAL = {reveal: true, edit: false};
const EDIT = {reveal: false, edit: true};
const BOTH = {reveal: true, edit: true};

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
    {why: 'leaving with both drafts clean goes through', from: '/studio', to: '/', dirty: CLEAN, blocks: false},
    {why: 'another card holds an Edit draft', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', dirty: EDIT, blocks: true},
    {why: 'another card leaves a New reveal draft be', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', dirty: REVEAL, blocks: false},
    {why: 'no card holds an Edit draft', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit', dirty: EDIT, blocks: true},
    // R-57: both drafts stay mounted, so a mode switch never asks.
    {why: 'a switch to New reveal keeps both drafts', from: '/studio?mode=edit&card=14023', to: studioHref('new', '14023'), dirty: BOTH, blocks: false},
    {why: 'a switch to Edit card keeps both drafts', from: '/studio?card=14023', to: studioHref('edit', '14023'), dirty: BOTH, blocks: false},
    {why: 'a switch with no card keeps both drafts', from: '/studio', to: studioHref('edit'), dirty: BOTH, blocks: false},
  ])('$why', ({from, to, dirty, blocks}) => {
    expect(shouldBlockStudioNavigation(at(from), at(to), dirty)).toBe(blocks);
  });
});

describe('draftsAtRisk', () => {
  it('names every dirty draft when the navigation leaves the studio', () => {
    expect(draftsAtRisk(at('/studio?mode=edit&card=1'), at('/'), BOTH)).toEqual(BOTH);
    expect(draftsAtRisk(at('/studio'), at('/calibration'), REVEAL)).toEqual(REVEAL);
  });

  it('names only the Edit draft when the card changes', () => {
    expect(draftsAtRisk(at('/studio?mode=edit&card=1'), at('/studio?mode=edit&card=2'), BOTH)).toEqual(EDIT);
  });

  it('names none on a mode switch', () => {
    expect(draftsAtRisk(at('/studio?mode=edit&card=1'), at('/studio?card=1'), BOTH)).toEqual(CLEAN);
  });
});

// The guard's lines (R-58). The branch is master: vite.config.ts pins VITE_ADMIN_TARGET_BRANCH empty in tests.
const UNPUBLISHED = "Your New reveal card isn't published yet. Leaving Card studio drops it.";
const UNSAVED = "Your Edit card changes aren't saved yet. Leaving Card studio drops them.";
const UNSAVED_CARD = "Your changes to this card aren't saved yet. Leaving the card drops them.";
const SAVED_CARD = 'Your changes to this card are saved. Leaving the card drops nothing.';
const PUBLISHING = "A publish to master is in progress. Leaving won't stop it, and you won't see whether it landed.";
const SAVING = "A save to master is in progress. Leaving won't stop it, and you won't see whether it landed.";

describe('studioUnsavedMessage', () => {
  it.each([
    {why: 'leaving names the New reveal draft', from: '/studio', to: '/', drafts: REVEAL, busy: CLEAN, says: UNPUBLISHED},
    {why: 'leaving names the Edit draft', from: '/studio?mode=edit&card=1', to: '/cards/1', drafts: EDIT, busy: CLEAN, says: UNSAVED},
    {why: 'leaving names both drafts, New reveal first', from: '/studio?card=1', to: '/', drafts: BOTH, busy: CLEAN, says: `${UNPUBLISHED} ${UNSAVED}`},
    {why: 'another card names only the Edit draft', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', drafts: BOTH, busy: CLEAN, says: UNSAVED_CARD},
    {why: 'the search names only the Edit draft', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit', drafts: BOTH, busy: CLEAN, says: UNSAVED_CARD},
    {why: 'a publish in flight takes the shared line', from: '/studio', to: '/', drafts: REVEAL, busy: REVEAL, says: PUBLISHING},
    {why: 'a save in flight takes it beside an unpublished card', from: '/studio?mode=edit&card=1', to: '/', drafts: BOTH, busy: EDIT, says: `${UNPUBLISHED} ${SAVING}`},
    {why: 'a save in flight takes it on a card change', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', drafts: EDIT, busy: EDIT, says: SAVING},
    // A card change keeps New reveal's draft, so its publish in flight goes unmentioned.
    {why: 'a card change leaves a publish in flight out', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', drafts: BOTH, busy: REVEAL, says: UNSAVED_CARD},
    // The guard ends a hold only once neither draft is dirty: a card change held past Edit's save stays open
    // while New reveal is dirty, and the open dialog shows what this returns (R4-5s).
    {why: 'a card change held past its save says nothing is left to drop', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', drafts: REVEAL, busy: CLEAN, says: SAVED_CARD},
  ])('$why', ({from, to, drafts, busy, says}) => {
    expect(studioUnsavedMessage({from: at(from), to: at(to), drafts, busy})).toBe(says);
  });
});

describe('forgetTokenQuestion', () => {
  it.each([
    [REVEAL, 'Forget the token and drop your New reveal card?'],
    [EDIT, 'Forget the token and drop your Edit card changes?'],
    [BOTH, 'Forget the token and drop your New reveal card and your Edit card changes?'],
  ])('asks before dropping %j (R-84)', (drafts, question) => {
    expect(forgetTokenQuestion(drafts)).toBe(question);
  });

  it('asks nothing while both drafts are clean', () => {
    expect(forgetTokenQuestion(CLEAN)).toBeNull();
  });
});
