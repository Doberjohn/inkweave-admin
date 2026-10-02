import {describe, expect, it} from 'vitest';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {fmtDay, fmtGap, fmtInt} from '../../ui/format';
import {lineLayout, lonePoints, tooltipY, type LineLayoutOptions, type LineSeries} from '../lineLayout';

// jsdom measures no width, so LineChart's own tests all run at the 640px
// fallback. These place the lines at the widths a card really has.

const DAYS = ['2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30'];

const OPTIONS: LineLayoutOptions = {height: 180, yFormat: fmtInt, xFormat: fmtDay};

function seriesOf(id: string, ys: Array<number | null>, days: readonly string[] = DAYS): LineSeries {
  return {id, label: id, color: ADMIN_COLORS.accent, points: ys.flatMap((y, i) => (y == null ? [] : [{x: days[i], y}]))};
}

const SEARCHES = seriesOf('searches', [10, 20, 30, 25, 40]);
const VIEWS = seriesOf('views', [5, 8, null, 12, 18]);

describe('lineLayout', () => {
  it('fits a 320px card: the gutter on the left, the end labels on the right', () => {
    const layout = lineLayout(320, [SEARCHES, VIEWS], OPTIONS);
    // "40" (12px) plus the gap on the left; "40" beside its ringed dot (4 + 2 + 4) on the right.
    expect(layout.left).toBe(20);
    expect(layout.plotWidth).toBe(278);
    expect(layout.xPx).toEqual([20, 89.5, 159, 228.5, 298]);
    expect(layout.endLabels.map((e) => e.text)).toEqual(['40', '18']);
    expect(layout.endLabelX).toBe(308);
    expect(layout.svgHeight).toBe(208);
  });

  it('gives the plot the right pad alone when the end labels would collide', () => {
    const close = seriesOf('close', [5, 8, 9, 12, 39]);
    const layout = lineLayout(320, [SEARCHES, close], OPTIONS);
    expect(layout.endLabels).toEqual([]);
    expect(layout.plotWidth).toBe(320 - 20 - 8);
  });

  it('places days by time, so a gap in the dates keeps its width', () => {
    const days = ['2026-09-01', '2026-09-02', '2026-09-10'];
    const layout = lineLayout(400, [seriesOf('s', [1, 2, 3], days)], OPTIONS);
    const [first, second, last] = layout.xPx;
    expect((second - first) * 9).toBeCloseTo(last - first, 6);
  });

  it('keeps the values and their points per series, null where a series has none', () => {
    const layout = lineLayout(320, [SEARCHES, VIEWS], OPTIONS);
    expect(layout.values[1]).toEqual([5, 8, null, 12, 18]);
    expect(layout.points[1][2]).toBeNull();
    expect(layout.points[0][4]).toEqual({x: 298, y: layout.plotTop});
  });

  it('spans zero for signed data, and takes the baseline into the domain', () => {
    const gaps = seriesOf('gap', [-0.5, 0.3, 1.2]);
    const signed = lineLayout(320, [gaps], {...OPTIONS, yFormat: fmtGap});
    expect(signed.ticks.map((t) => t.label)).toEqual(['−0.50', '0.00', '+1.20']);
    expect(signed.zero).toBe(signed.ticks[1].y);

    const above = lineLayout(320, [seriesOf('s', [2, 3])], {...OPTIONS, baseline: -1});
    expect(above.ticks.map((t) => t.value)).toEqual([-1, 0, 3]);
    expect(above.baseline).toEqual({value: -1, y: above.plotBottom});
    expect(lineLayout(320, [seriesOf('s', [2, 3])], OPTIONS).baseline).toBeNull();
  });

  it('drops x labels that would crowd the one before on a narrow card, keeping the last', () => {
    const nine = Array.from({length: 9}, (_, i) => `2026-09-0${i + 1}`);
    const s = seriesOf('s', [1, 2, 3, 4, 5, 6, 7, 8, 9], nine);
    // At 120px the quarter points sit 21px apart, and "Sep 3" needs 38: every other one prints.
    expect(lineLayout(120, [s], OPTIONS).xLabels.map((l) => l.text)).toEqual(['Sep 1', 'Sep 5', 'Sep 9']);
    // The last day replaces a label it would crowd.
    const asked = lineLayout(120, [s], {...OPTIONS, xTicks: ['2026-09-01', '2026-09-08', '2026-09-09']});
    expect(asked.xLabels.map((l) => l.text)).toEqual(['Sep 1', 'Sep 9']);
    // At 640px all five fit.
    expect(lineLayout(640, [s], OPTIONS).xLabels).toHaveLength(5);
  });

  it('has nothing to place without points', () => {
    const layout = lineLayout(320, [seriesOf('s', [])], OPTIONS);
    expect(layout.xs).toEqual([]);
    expect(layout.xLabels).toEqual([]);
    expect(layout.endLabels).toEqual([]);
  });
});

describe('lonePoints', () => {
  it('finds the points with no neighbour on either side, but not the last one', () => {
    const p = {x: 0, y: 0};
    expect(lonePoints([p, null, p, null, p])).toEqual([0, 2]);
    expect(lonePoints([p, p, null, p])).toEqual([]);
    expect(lonePoints([])).toEqual([]);
  });
});

describe('tooltipY', () => {
  it('sits over the highest point at the x, or on the plot floor where no series has one', () => {
    const layout = lineLayout(320, [SEARCHES, VIEWS], OPTIONS);
    expect(tooltipY(layout, 4)).toBe(layout.points[0][4]!.y);
    const lone = lineLayout(320, [seriesOf('a', [1, null]), seriesOf('b', [null, 2])], OPTIONS);
    expect(tooltipY(lone, 0)).toBe(lone.points[0][0]!.y);
    // A null value keeps its x on the axis with no point there.
    const quiet: LineSeries = {...seriesOf('q', [1]), points: [{x: DAYS[0], y: 1}, {x: DAYS[1], y: null}]};
    expect(tooltipY(lineLayout(320, [quiet], OPTIONS), 1)).toBe(layout.plotBottom);
  });
});
