// @vitest-environment node
import {describe, it, expect} from 'vitest';
import {releasedRecords} from './released.mjs';
import {loadReleasedChain, loadSeason, loadWriteChain} from './web.mjs';

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

  it("loads Card studio's write chain", async () => {
    const chain = await loadWriteChain();
    expect(Object.keys(chain).sort()).toEqual([
      'buildPreviewCard',
      'insertCardIntoPreviewJson',
      'validateRevealCardForm',
    ]);
    expect(Object.values(chain).every((fn) => typeof fn === 'function')).toBe(true);
  }, SLOW);

  it("loads the app's card transform and Card studio's released-number map, and maps raw cards", async () => {
    const [season, chain] = await Promise.all([loadSeason(), loadReleasedChain()]);
    expect(Object.keys(chain).sort()).toEqual(['releasedRevealNumbers', 'transformRawCards']);
    const miguel = {
      id: 3286,
      name: 'Miguel Rivera',
      version: 'Street Musician',
      fullName: 'Miguel Rivera - Street Musician',
      cost: 1,
      color: 'Amber',
      inkwell: true,
      type: 'Character',
      setCode: season.setCode,
      number: 21,
    };
    // The same card under its preview id is the preview data's, never a released one.
    const preview = {...miguel, id: season.idBase + 21};
    expect(releasedRecords([miguel, preview], chain)).toEqual([
      {number: 21, id: 3286, fullName: 'Miguel Rivera - Street Musician'},
    ]);
  }, SLOW);
});
