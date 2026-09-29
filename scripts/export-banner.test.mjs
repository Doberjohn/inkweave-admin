// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {MAX_GROUPS, ROWS_PER_PAGE} from '../src/tools/banner/bannerPaging.ts';
import {pageCountForGroups, slugFor, staleExports} from './export-banner.mjs';

// Derived from BannerPage's own paging constants, so retuning them can't leave these behind.
const FULL = Math.ceil(MAX_GROUPS / ROWS_PER_PAGE);

describe('pageCountForGroups', () => {
  it.each([
    [0, 1],
    [ROWS_PER_PAGE, 1],
    [ROWS_PER_PAGE + 1, 2],
    [MAX_GROUPS, FULL],
    [MAX_GROUPS + 3, FULL],
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

describe('staleExports', () => {
  const written = ['poca-page-1.png', 'poca-page-1-fb2048.jpg'];

  it("lists an earlier run's extra pages and old names, never this run's files", () => {
    const existing = [...written, 'poca-page-2.png', 'poca-page-2-fb2048.jpg', 'old-name-page-1.png'];
    expect(staleExports(existing, written)).toEqual(['poca-page-2.png', 'poca-page-2-fb2048.jpg', 'old-name-page-1.png']);
  });

  it('leaves files the exporter did not make', () => {
    expect(staleExports([...written, 'notes.txt', 'poca-final.png'], written)).toEqual([]);
  });
});
