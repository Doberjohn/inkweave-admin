import {describe, expect, it} from 'vitest';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {fmtDay, fmtGap, fmtInt} from '../../ui/format';
import {
  LINE_END_WIDTH,
  LINE_Y_AXIS_WIDTH,
  lineLayout,
  lonePoints,
  tooltipY,
  type LineLayoutOptions,
  type LineSeries,
} from '../lineLayout';

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
    expect(above.baseline).toEqual({value: -1, y: above.plotBottom, label: '−1'});
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

  it('spans a fixed y domain, widened only to keep every value on the plot', () => {
    // On its own, −0.05 to 1.2 gets ticks at −0.05 and 0 just 7.2px apart: their labels collide.
    const lopsided = seriesOf('gap', [-0.05, 0.3, 1.2]);
    const own = lineLayout(320, [lopsided], {...OPTIONS, yFormat: fmtGap});
    expect(own.ticks.map((t) => t.label)).toEqual(['−0.05', '0.00', '+1.20']);
    expect(own.ticks[0].y - own.ticks[1].y).toBeCloseTo(7.2, 6);
    // A symmetric domain (R2's gapDomain) puts zero mid-plot, 90px from each end.
    const fixed = lineLayout(320, [lopsided], {...OPTIONS, yFormat: fmtGap, yDomain: [-1.5, 1.5]});
    expect(fixed.ticks.map((t) => [t.label, t.y])).toEqual([
      ['−1.50', 188],
      ['0.00', 98],
      ['+1.50', 8],
    ]);
    // A value past a fixed end widens that end; nothing is clipped.
    const narrow = lineLayout(320, [lopsided], {...OPTIONS, yFormat: fmtGap, yDomain: [-1, 1]});
    expect(narrow.ticks.map((t) => t.label)).toEqual(['−1.00', '0.00', '+1.20']);
  });

  it('widens a fixed y domain to hold zero and the baseline too', () => {
    // 2 to 5 over values of 3 and 4 would leave zero, and the area wash's floor, below the plot.
    const above = lineLayout(320, [seriesOf('s', [3, 4])], {...OPTIONS, yDomain: [2, 5]});
    expect(above.ticks.map((t) => t.value)).toEqual([0, 5]);
    expect(above.zero).toBe(above.plotBottom);
    // −1 to 1 with a baseline of −2 reaches down to the baseline.
    const below = lineLayout(320, [seriesOf('s', [0.2, 0.5])], {...OPTIONS, yDomain: [-1, 1], baseline: -2});
    expect(below.ticks.map((t) => t.value)).toEqual([-2, 0, 1]);
    expect(below.baseline?.y).toBe(below.plotBottom);
  });

  it('lays the plot between fixed gutters when asked, whatever its labels need', () => {
    const gaps = lineLayout(320, [seriesOf('gap', [-0.5, 0.3, 1.2])], {...OPTIONS, yFormat: fmtGap, fixedGutters: true});
    const votes = lineLayout(320, [seriesOf('votes', [12, 45, 120])], {...OPTIONS, fixedGutters: true});
    for (const layout of [gaps, votes]) {
      expect(layout.left).toBe(LINE_Y_AXIS_WIDTH);
      expect(layout.plotWidth).toBe(320 - LINE_Y_AXIS_WIDTH - LINE_END_WIDTH);
    }
    expect(gaps.xPx).toEqual(votes.xPx);
    // On their own, "−0.50" (30px) needs a wider gutter than "120" (18px).
    expect(lineLayout(320, [seriesOf('gap', [-0.5, 0.3, 1.2])], {...OPTIONS, yFormat: fmtGap}).left).toBe(38);
    expect(lineLayout(320, [seriesOf('votes', [12, 45, 120])], OPTIONS).left).toBe(26);
  });

  it('labels the baseline in the gutter, and blanks the tick label that sits on it', () => {
    const gaps = seriesOf('gap', [-0.5, 0.3, 1.2]);
    const layout = lineLayout(320, [gaps], {...OPTIONS, yFormat: fmtGap, baseline: 0, baselineLabel: 'No gap'});
    expect(layout.baseline).toEqual({value: 0, y: layout.zero, label: 'No gap'});
    // The 0.00 tick is on the baseline: it keeps its gridline (value and y) and prints nothing.
    expect(layout.ticks.map((t) => [t.value, t.label])).toEqual([
      [-0.5, '−0.50'],
      [0, ''],
      [1.2, '+1.20'],
    ]);
    expect(layout.ticks[1].y).toBe(layout.zero);
  });

  it('blanks every tick label within a label height of the baseline, and keeps the rest', () => {
    // On its own, −0.05 to 1.2 gets ticks at −0.05 and 0, 7.2px apart: both are within 12px (a label and the surface gap) of the baseline.
    const lopsided = seriesOf('gap', [-0.05, 0.3, 1.2]);
    const near = lineLayout(320, [lopsided], {...OPTIONS, yFormat: fmtGap, baseline: 0});
    expect(near.ticks.map((t) => t.label)).toEqual(['', '', '+1.20']);
    // A symmetric domain (R2's gapDomain) puts the ends 90px from it: only the zero tick's label goes.
    const far = lineLayout(320, [lopsided], {...OPTIONS, yFormat: fmtGap, baseline: 0, yDomain: [-1.5, 1.5]});
    expect(far.ticks.map((t) => t.label)).toEqual(['−1.50', '', '+1.50']);
  });

  it('counts the baseline label in the gutter, and "No gap" fits the fixed one', () => {
    const gaps = seriesOf('gap', [-0.5, 0.3, 1.2]);
    const base = {...OPTIONS, yFormat: fmtGap, baseline: 0};
    // Without a baseline label the widest tick, "−0.50" (30px), sets the gutter: 30 and the gap.
    expect(lineLayout(320, [gaps], {...OPTIONS, yFormat: fmtGap}).left).toBe(38);
    // "No gap" is 6 characters (36px): the gutter grows to hold it, 36 and the gap.
    expect(lineLayout(320, [gaps], {...base, baselineLabel: 'No gap'}).left).toBe(44);
    expect(lineLayout(320, [gaps], {...base, baselineLabel: 'No gap this week'}).left).toBe(104);
    // The fixed gutter (48px) holds "No gap" as it is, and widens for a longer label rather than clip it.
    expect(lineLayout(320, [gaps], {...base, baselineLabel: 'No gap', fixedGutters: true}).left).toBe(LINE_Y_AXIS_WIDTH);
    expect(lineLayout(320, [gaps], {...base, baselineLabel: 'No gap this week', fixedGutters: true}).left).toBe(104);
  });

  it('widens a fixed gutter rather than clip a label that needs more', () => {
    // "150,000" on the axis and "123,456" at the end are seven characters (42px) each.
    const wide = lineLayout(320, [seriesOf('votes', [1000, 99999, 123456])], {...OPTIONS, fixedGutters: true});
    expect(wide.left).toBe(50);
    expect(wide.width - wide.left - wide.plotWidth).toBe(52);
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
