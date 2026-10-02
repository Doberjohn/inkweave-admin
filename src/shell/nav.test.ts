import {NAV_ITEMS, isWritePath, navItemFor} from './nav';

describe('navItemFor', () => {
  it.each([
    ['/reveal', 'reveal'],
    ['/reveal/', 'reveal'],
    ['/calibration/anything', 'calibration'],
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

  it.each(['/calibration', '/no-such-page'])('%s writes nothing', (pathname) => {
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

describe('the Calibration & tuning item', () => {
  it('heads Insights, where the analytics page was', () => {
    const insights = NAV_ITEMS.filter((item) => item.group === 'insights').map((item) => item.id);
    expect(insights).toEqual(['calibration', 'activity', 'web']);
    expect(NAV_ITEMS.some((item) => item.id === 'analytics')).toBe(false);
  });

  it('owns /calibration, and writes nothing in R1', () => {
    expect(navItemFor('/calibration')).toMatchObject({id: 'calibration', label: 'Calibration & tuning', mark: 'Ca'});
    // Tuning moves in, and the page starts writing, in R2 (R-4).
    expect(isWritePath('/calibration')).toBe(false);
  });
});
