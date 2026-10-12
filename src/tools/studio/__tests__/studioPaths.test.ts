import {studioHref} from '../../../shell/nav';
import {draftsAtRisk, shouldBlockStudioNavigation, studioCardOf, studioModeOf} from '../studioPaths';

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
