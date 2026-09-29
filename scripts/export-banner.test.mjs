// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {pageCountForGroups, slugFor} from './export-banner.mjs';

describe('pageCountForGroups', () => {
  it.each([
    [0, 1],
    [3, 1],
    [4, 2],
    [6, 2],
    [9, 2],
  ])('renders %i synergy groups on %i page(s), as BannerPage slices them', (groups, pages) => {
    expect(pageCountForGroups(groups)).toBe(pages);
  });
});

describe('slugFor', () => {
  it("turns a card's full name into a file name", () => {
    expect(slugFor('Pocahontas - Guiding the Tribe')).toBe('pocahontas-guiding-the-tribe');
  });

  it('drops leading and trailing separators', () => {
    expect(slugFor("  Will o' the Wisp!")).toBe('will-o-the-wisp');
  });
});
