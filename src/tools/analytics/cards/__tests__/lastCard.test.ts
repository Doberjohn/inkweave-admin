import {LAST_CARD_KEY, forgetLastCard, readLastCard, writeLastCard} from '../lastCard';

// Pinned here, not imported: renaming the key would silently drop everyone's last card.
const KEY = 'inkweave-admin.last-card';

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('lastCard', () => {
  it("saves under admin's own key", () => {
    expect(LAST_CARD_KEY).toBe(KEY);
    writeLastCard('2983');
    expect(localStorage.getItem(KEY)).toBe('2983');
  });

  it('reads nothing before a card is viewed', () => {
    expect(readLastCard()).toBeNull();
  });

  it('reads back the newest card written', () => {
    writeLastCard('2983');
    writeLastCard('1004');
    expect(readLastCard()).toBe('1004');
  });

  it('reads an empty saved value as no card', () => {
    localStorage.setItem(KEY, '');
    expect(readLastCard()).toBeNull();
  });

  it('forgets the saved card', () => {
    writeLastCard('999999');
    forgetLastCard('999999');
    expect(readLastCard()).toBeNull();
  });

  it('leaves a different saved card alone', () => {
    writeLastCard('2983');
    forgetLastCard('999999');
    expect(readLastCard()).toBe('2983');
  });

  it('reads nothing and throws nothing when storage is unavailable', () => {
    const denied = () => {
      throw new Error('storage denied');
    };
    vi.stubGlobal('localStorage', {getItem: denied, setItem: denied, removeItem: denied});
    expect(readLastCard()).toBeNull();
    expect(() => writeLastCard('2983')).not.toThrow();
    expect(() => forgetLastCard('2983')).not.toThrow();
  });
});
