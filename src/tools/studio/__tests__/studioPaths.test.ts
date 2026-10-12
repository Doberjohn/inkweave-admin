import {describe, expect, it} from 'vitest';
import {
  shouldBlockStudioNavigation,
  studioCardOf,
  studioHref,
  studioModeOf,
  type StudioDrafts,
  type StudioMode,
} from '../studioPaths';

describe('studioHref', () => {
  it.each<{mode: StudioMode; card?: string | null; href: string}>([
    {mode: 'new', href: '/studio'},
    {mode: 'new', card: '14023', href: '/studio?card=14023'},
    {mode: 'edit', href: '/studio?mode=edit'},
    {mode: 'edit', card: '14023', href: '/studio?mode=edit&card=14023'},
    {mode: 'edit', card: null, href: '/studio?mode=edit'},
  ])('gives $href for $mode on card $card', ({mode, card, href}) => {
    expect(studioHref(mode, card)).toBe(href);
  });
});

describe('studioModeOf and studioCardOf', () => {
  it('reads Edit card from ?mode=edit, and New reveal from anything else', () => {
    expect(studioModeOf(new URLSearchParams('mode=edit&card=1'))).toBe('edit');
    expect(studioModeOf(new URLSearchParams('mode=Edit'))).toBe('new');
    expect(studioModeOf(new URLSearchParams(''))).toBe('new');
  });

  it('reads the card, and no card from a blank one', () => {
    expect(studioCardOf(new URLSearchParams('mode=edit&card=14023'))).toBe('14023');
    expect(studioCardOf(new URLSearchParams('card='))).toBeNull();
    expect(studioCardOf(new URLSearchParams('mode=edit'))).toBeNull();
  });
});

describe('shouldBlockStudioNavigation', () => {
  const at = (href: string) => {
    const [pathname, search = ''] = href.split('?');
    return {pathname, search: search ? `?${search}` : ''};
  };
  const BOTH: StudioDrafts = {reveal: true, edit: true};
  const REVEAL: StudioDrafts = {reveal: true, edit: false};
  const EDIT: StudioDrafts = {reveal: false, edit: true};
  const CLEAN: StudioDrafts = {reveal: false, edit: false};

  it.each([
    {from: '/studio', to: '/', dirty: REVEAL, blocks: true},
    {from: '/studio?mode=edit&card=1', to: '/cards/1', dirty: EDIT, blocks: true},
    {from: '/studio?mode=edit&card=1', to: '/', dirty: CLEAN, blocks: false},
    {from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', dirty: EDIT, blocks: true},
    {from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', dirty: REVEAL, blocks: false},
    {from: '/studio?mode=edit&card=1', to: '/studio?mode=edit', dirty: EDIT, blocks: true},
    {from: '/studio?mode=edit&card=14023', to: '/studio?card=14023', dirty: BOTH, blocks: false},
    {from: '/studio', to: '/studio?mode=edit', dirty: BOTH, blocks: false},
    {from: '/studio?card=1', to: '/studio?card=2', dirty: EDIT, blocks: true},
  ])('$from to $to blocks: $blocks', ({from, to, dirty, blocks}) => {
    expect(shouldBlockStudioNavigation(at(from), at(to), dirty)).toBe(blocks);
  });
});
