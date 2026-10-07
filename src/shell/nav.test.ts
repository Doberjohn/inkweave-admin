import {NAV_ITEMS, calibrationHref, cardsHref, isWritePath, navItemFor} from './nav';

describe('navItemFor', () => {
  it.each([
    ['/reveal', 'reveal'],
    ['/reveal/', 'reveal'],
    ['/calibration/anything', 'calibration'],
    ['/cards/2983', 'cards'],
  ])('gives %s to the %s item', (pathname, id) => {
    expect(navItemFor(pathname)?.id).toBe(id);
  });

  it.each(['/imagery', '/no-such-page'])('gives %s to no item', (pathname) => {
    expect(navItemFor(pathname)).toBeUndefined();
  });
});

describe('isWritePath', () => {
  it.each(['/calibration', '/reveal', '/image/'])('%s writes to the app', (pathname) => {
    expect(isWritePath(pathname)).toBe(true);
  });

  // /tuning is a redirect now, and a redirect writes nothing.
  it.each(['/tuning', '/cards/2983', '/no-such-page'])('%s writes nothing', (pathname) => {
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
    // Card analytics ends the group (R3), as the handoff lists it.
    expect(insights).toEqual(['calibration', 'activity', 'web', 'cards']);
    expect(NAV_ITEMS.some((item) => item.id === 'analytics')).toBe(false);
  });

  it('owns /calibration, and writes', () => {
    expect(navItemFor('/calibration')).toMatchObject({id: 'calibration', label: 'Calibration & tuning', mark: 'Ca'});
    // The tuning editor moved into the page (R-4), and /tuning only redirects to it.
    expect(isWritePath('/calibration')).toBe(true);
    expect(NAV_ITEMS.some((item) => item.id === 'tuning' || item.path === '/tuning')).toBe(false);
  });
});

describe('calibrationHref', () => {
  it('links the bare page when no rule is given', () => expect(calibrationHref()).toBe('/calibration'));

  it.each([
    ['lore-loss', '/calibration?rule=lore-loss'],
    ['location-control', '/calibration?rule=location-control'],
    ['a b', '/calibration?rule=a%20b'],
  ])('links %s to %s', (ruleId, href) => {
    expect(calibrationHref(ruleId)).toBe(href);
  });
});

describe('cardsHref', () => {
  it('links the bare page when no card is given', () => expect(cardsHref()).toBe('/cards'));

  it.each([
    ['2983', '/cards/2983'],
    // Escaped, so an id always stays one path segment.
    ['a/b c', '/cards/a%2Fb%20c'],
  ])('links %s to %s', (cardId, href) => {
    expect(cardsHref(cardId)).toBe(href);
  });
});
