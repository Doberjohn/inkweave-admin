// @vitest-environment node
import {describe, it, expect} from 'vitest';
import {loadSeason, loadWriteChain} from './web.mjs';

// Both load admin's TypeScript through Vite, the bridge included: seconds on a cold start.
const SLOW = 60_000;

describe('web', () => {
  it('reads the season from the pinned app through the bridge', async () => {
    const season = await loadSeason();
    expect(season.setCode).toMatch(/^\d+$/);
    expect(season.setNumber).toBe(Number(season.setCode));
    expect(season.setSlug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(season.setTotal).toBeGreaterThan(0);
    expect(Number.isInteger(season.idBase)).toBe(true);
    expect(Object.keys(season.inkBlocks)).toHaveLength(6);
  }, SLOW);

  it("loads the reveal publisher's write chain", async () => {
    const chain = await loadWriteChain();
    expect(Object.keys(chain).sort()).toEqual([
      'buildPreviewCard',
      'insertCardIntoPreviewJson',
      'validateRevealCardForm',
    ]);
    expect(Object.values(chain).every((fn) => typeof fn === 'function')).toBe(true);
  }, SLOW);
});
