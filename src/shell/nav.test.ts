import {NAV_ITEMS, isWritePath, navItemFor} from './nav';

describe('navItemFor', () => {
  it.each([
    ['/reveal', 'reveal'],
    ['/reveal/', 'reveal'],
    ['/analytics/anything', 'analytics'],
  ])('gives %s to the %s item', (pathname, id) => {
    expect(navItemFor(pathname)?.id).toBe(id);
  });

  it.each(['/imagery', '/no-such-page'])('gives %s to no item', (pathname) => {
    expect(navItemFor(pathname)).toBeUndefined();
  });
});

describe('isWritePath', () => {
  it.each(['/tuning', '/reveal', '/image/'])('%s writes to the app', (pathname) => {
    expect(isWritePath(pathname)).toBe(true);
  });

  it.each(['/analytics', '/no-such-page'])('%s writes nothing', (pathname) => {
    expect(isWritePath(pathname)).toBe(false);
  });
});

describe('NAV_ITEMS', () => {
  it('gives every item its own id and path, and a two-letter mark', () => {
    expect(new Set(NAV_ITEMS.map((item) => item.id)).size).toBe(NAV_ITEMS.length);
    expect(new Set(NAV_ITEMS.map((item) => item.path)).size).toBe(NAV_ITEMS.length);
    for (const item of NAV_ITEMS) expect(item.mark).toMatch(/^[A-Z][a-z]$/);
  });
});
