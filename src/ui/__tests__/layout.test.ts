import {describe, expect, it} from 'vitest';
import {SPACING} from '../../app-bridge';
import {KPI_TRACK, kpiColumns, kpiRow, twoUp} from '../layout';

describe('twoUp', () => {
  it('fits as many tracks as the row holds, each at least the given width, and stacks them below that', () => {
    expect(twoUp(346)).toEqual({
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 346px), 1fr))',
      gap: SPACING.xl,
      alignItems: 'start',
    });
    expect(twoUp(376).gridTemplateColumns).toBe('repeat(auto-fit, minmax(min(100%, 376px), 1fr))');
  });
});

describe('kpiColumns', () => {
  // Six cards take 6 × 170 + 5 × 12 = 1080px on one row, and 3 × 170 + 2 × 12 = 534px three across.
  it('pins the track the rule fits cards to', () => {
    expect(KPI_TRACK).toBe(170);
  });

  it.each([
    [1136, 6, 'the 1440px page with the sidebar open'],
    [1080, 6, 'exactly six tracks'],
    [1079, 3, 'a pixel short of six'],
    [1062, 3, 'the 1366px page with the sidebar open, where auto-fit wrapped five and one'],
    [534, 3, 'exactly three tracks'],
    [533, 2, 'a pixel short of three'],
    [237, 2, 'a phone'],
  ])('puts six cards in a %ipx row %i across (%s)', (width, columns) => {
    expect(kpiColumns({count: 6, width})).toBe(columns);
  });

  it('puts four cards 4 or 2 across, never 3', () => {
    // 4 × 170 + 3 × 12 = 716.
    expect(kpiColumns({count: 4, width: 716})).toBe(4);
    expect(kpiColumns({count: 4, width: 715})).toBe(2);
    expect(kpiColumns({count: 4, width: 600})).toBe(2);
  });

  it('keeps two cards side by side at any width', () => {
    expect(kpiColumns({count: 2, width: 1200})).toBe(2);
    expect(kpiColumns({count: 2, width: 200})).toBe(2);
  });

  it('puts every card on one row until the row is measured', () => {
    expect(kpiColumns({count: 6, width: 0})).toBe(6);
  });
});

describe('kpiRow', () => {
  it("lays the cards out in kpiColumns' equal columns, the KPI gap between them", () => {
    expect(kpiRow({count: 6, width: 600})).toEqual({
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: SPACING.md,
    });
  });
});
