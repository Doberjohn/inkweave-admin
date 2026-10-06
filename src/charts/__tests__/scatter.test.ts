import {describe, expect, it} from 'vitest';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {
  SCATTER_MAX_WIDTH,
  diagonalJitter,
  jitterOffset,
  nearestPoint,
  placeDots,
  scatterLayout,
  scatterOrder,
  scatterWidth,
  type ScatterPoint,
} from '../scatter';

// jsdom measures no width, so ScatterChart's own tests all run at
// SCATTER_MAX_WIDTH. These lay the plot out at the widths a card really has.

const KEYS = Array.from({length: 5000}, (_, i) => `${i}|${i + 1}`);
const SCORES = [0.5, 10.5] as const;

describe('scatterLayout', () => {
  it('lays a square plot inside the margins', () => {
    const layout = scatterLayout(440, SCORES, SCORES);
    expect([layout.left, layout.top, layout.side, layout.height]).toEqual([32, 24, 392, 456]);
    expect([layout.x(0.5), layout.x(10.5)]).toEqual([32, 424]);
    expect([layout.y(10.5), layout.y(0.5)]).toEqual([24, 416]);
  });

  it('widens the left margin for y tick labels that need more room, and shrinks the plot to fit', () => {
    // "10" is 12px, inside the 32px floor; "−1,000" is 36px, plus the 8px tick gap.
    expect(scatterLayout(440, SCORES, SCORES, ['1', '10']).left).toBe(32);
    const wide = scatterLayout(440, SCORES, SCORES, ['−1,000']);
    expect([wide.left, wide.side]).toEqual([44, 380]);
  });

  it('runs y = x across the overlap of the two domains, at −45° on equal domains', () => {
    const square = scatterLayout(440, SCORES, SCORES);
    expect(square.diagonal).toEqual({x1: 32, y1: 416, x2: 424, y2: 24, angle: -45});
    const overlap = scatterLayout(440, [0, 10], [5, 20]);
    expect([overlap.diagonal?.x1, overlap.diagonal?.x2]).toEqual([overlap.x(5), overlap.x(10)]);
    // Half the y span for the same x run: atan(196 / 392), −26.565°.
    expect(scatterLayout(440, [0, 10], [0, 20]).diagonal?.angle).toBeCloseTo(-26.565, 3);
    expect(scatterLayout(440, [0, 4], [5, 9]).diagonal).toBeNull();
  });
});

describe('scatterWidth', () => {
  it('follows the measured width up to SCATTER_MAX_WIDTH, and starts there before it is measured', () => {
    expect(scatterWidth(320)).toBe(320);
    expect(scatterWidth(900)).toBe(SCATTER_MAX_WIDTH);
    expect(scatterWidth(0)).toBe(SCATTER_MAX_WIDTH);
  });
});

describe('jitterOffset', () => {
  it('gives each key one fixed offset, within ±amount on each axis', () => {
    expect(jitterOffset('1|2', 0.25)).toEqual(jitterOffset('1|2', 0.25));
    expect(jitterOffset('1|2', 0.25)).not.toEqual(jitterOffset('1|3', 0.25));
    for (const key of KEYS) {
      for (const d of jitterOffset(key, 0.25)) expect(Math.abs(d)).toBeLessThanOrEqual(0.25);
    }
  });

  it('gives no offset for an amount of 0', () => {
    expect(jitterOffset('1|2', 0)).toEqual([0, 0]);
  });
});

describe('diagonalJitter', () => {
  it('moves y − x by at most `across`, and each axis by at most along + across / 2', () => {
    expect(diagonalJitter('1|2', {along: 0.35, across: 0.07})).toEqual(diagonalJitter('1|2', {along: 0.35, across: 0.07}));
    for (const key of KEYS) {
      const [dx, dy] = diagonalJitter(key, {along: 0.35, across: 0.07});
      expect(Math.abs(dy - dx)).toBeLessThanOrEqual(0.07 + 1e-12);
      expect(Math.abs(dx)).toBeLessThanOrEqual(0.385 + 1e-12);
      expect(Math.abs(dy)).toBeLessThanOrEqual(0.385 + 1e-12);
    }
  });
});

describe('placeDots', () => {
  const layout = scatterLayout(440, [0, 10], [0, 10]);
  const series = [
    {id: 'low', label: 'Low', color: ADMIN_COLORS.over},
    {id: 'high', label: 'High', color: ADMIN_COLORS.under},
  ];
  const points: ScatterPoint[] = [
    {key: 'a', x: 2, y: 6, series: 'high', label: 'A'},
    {key: 'b', x: 5, y: 5, series: 'gone', label: 'B'},
  ];

  it('places each point at its value in its series colour, in the order given, a stray series in the neutral', () => {
    const dots = placeDots(points, layout, {series, jitter: 0, jitterAlong: 'both'});
    expect(dots.map((d) => [d.point.key, d.color, d.px, d.py])).toEqual([
      ['a', ADMIN_COLORS.under, layout.x(2), layout.y(6)],
      ['b', ADMIN_COLORS.barNeutral, layout.x(5), layout.y(5)],
    ]);
  });

  it('adds each key its fixed jitter: square for both, along y = x for diagonal', () => {
    const [both] = placeDots(points, layout, {series, jitter: 0.25, jitterAlong: 'both'});
    const [dx, dy] = jitterOffset('a', 0.25);
    expect([both.px, both.py]).toEqual([layout.x(2 + dx), layout.y(6 + dy)]);
    const [along] = placeDots(points, layout, {series, jitter: 0.35, jitterAlong: 'diagonal'});
    const [ax, ay] = diagonalJitter('a', {along: 0.35, across: 0.07});
    expect(along.px).toBeCloseTo(layout.x(2 + ax), 9);
    expect(along.py).toBeCloseTo(layout.y(6 + ay), 9);
  });
});

describe('nearestPoint', () => {
  const points = [
    {px: 100, py: 100},
    {px: 130, py: 100},
    {px: 100, py: 124},
  ];

  it('picks the closest point', () => {
    expect(nearestPoint(points, {x: 126, y: 101}, 24)).toBe(1);
  });

  it('keeps a point exactly at the radius and drops one just past it', () => {
    expect(nearestPoint([{px: 0, py: 0}], {x: 24, y: 0}, 24)).toBe(0);
    expect(nearestPoint([{px: 0, py: 0}], {x: 24.01, y: 0}, 24)).toBeNull();
  });

  it('gives null with nothing in range, and the first of two equally near points', () => {
    expect(nearestPoint(points, {x: 300, y: 300}, 24)).toBeNull();
    expect(nearestPoint(points, {x: 100, y: 112}, 24)).toBe(0);
  });
});

describe('scatterOrder', () => {
  it('sorts by x, then y, then key', () => {
    const order = scatterOrder([
      {key: 'b', x: 2, y: 1},
      {key: 'c', x: 1, y: 5},
      {key: 'a', x: 2, y: 1},
      {key: 'd', x: 1, y: 2},
    ]);
    expect(order.map((p) => p.key)).toEqual(['d', 'c', 'a', 'b']);
  });
});
