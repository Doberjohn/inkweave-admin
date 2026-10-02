import {describe, expect, it} from 'vitest';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {fmtInt} from '../../ui/format';
import {BAR_Y_AXIS_WIDTH, barLayout, barLayoutOptions, type BarDatum, type BarLayoutOptions} from '../barLayout';
import type {SeriesDef} from '../series';

// jsdom measures no width, so BarChart's own tests all run at the 640px
// fallback. These place the bars at the widths a card really has.

const BANDS: SeriesDef[] = [
  {id: 'high', label: '7+', color: ADMIN_COLORS.under},
  {id: 'mid', label: '5–6', color: ADMIN_COLORS.barNeutral},
  {id: 'unscored', label: 'No score', color: ADMIN_COLORS.muted, pattern: 'hatch'},
];

// Totals 5, 37, 12 and 9: the axis tops out at 40.
const DAYS: BarDatum[] = [
  {key: '2026-09-27', label: 'Sep 27', values: {high: 3, mid: 2}},
  {key: '2026-09-28', label: 'Sep 28', values: {high: 20, mid: 10, unscored: 7}},
  {key: '2026-09-29', label: 'Sep 29', values: {high: 6, mid: 4, unscored: 2}},
  {key: '2026-09-30', label: 'Sep 30', values: {high: 5, mid: 3, unscored: 1}},
];

const OPTIONS: BarLayoutOptions = {height: 160, valueFormat: fmtInt, capLabels: 'extremes', subLabels: false};

/** `count` days of September 2026, from the 1st, with `values` on each. */
function september(count: number, values: (i: number) => Record<string, number> = () => ({high: 1})): BarDatum[] {
  return Array.from({length: count}, (_, i) => ({
    key: `2026-09-${String(i + 1).padStart(2, '0')}`,
    label: `Sep ${i + 1}`,
    values: values(i),
  }));
}

const labelTexts = (data: readonly BarDatum[], layout: ReturnType<typeof barLayout>) =>
  layout.xLabels.map(({index}) => data[index].label);

describe('barLayout', () => {
  it('splits a 320px card into one slot per bar after the y-axis gutter and the right pad', () => {
    const layout = barLayout(320, DAYS, BANDS, OPTIONS);
    expect(layout.left).toBe(BAR_Y_AXIS_WIDTH);
    // 320 − 40 − 8 = 272, four slots of 68.
    expect(layout.plotWidth).toBe(272);
    expect(layout.slot).toBe(68);
    expect(layout.centers).toEqual([74, 142, 210, 278]);
    expect(layout.barWidth).toBe(24);
    expect(layout.svgHeight).toBe(196);
  });

  it('puts the ticks on a clean axis from the baseline up to the plot top', () => {
    const layout = barLayout(320, DAYS, BANDS, OPTIONS);
    expect(layout.ticks).toEqual([
      {value: 0, label: '0', y: 176},
      {value: 20, label: '20', y: 96},
      {value: 40, label: '40', y: 16},
    ]);
    expect([layout.plotTop, layout.baseline, layout.plotHeight]).toEqual([16, 176, 160]);
  });

  it('thins bars to the slot on a phone, keeping the 2px gap between them', () => {
    const data = september(30);
    const layout = barLayout(200, data, BANDS, OPTIONS);
    // 152px over 30 bars: a 5.07px slot, a 3.07px bar.
    expect(layout.slot).toBeCloseTo(5.067, 3);
    expect(layout.barWidth).toBeCloseTo(layout.slot - 2, 6);
  });

  it('thins the x labels until they fit, counting back from the newest, at any width', () => {
    const data = september(30);
    // At 200px, "Sep 10" and its 8px gap span 9 slots.
    expect(labelTexts(data, barLayout(200, data, BANDS, OPTIONS))).toEqual(['Sep 3', 'Sep 12', 'Sep 21', 'Sep 30']);
    // At 1200px every slot is 38.4px, so every other label prints.
    expect(labelTexts(data, barLayout(1200, data, BANDS, OPTIONS))).toEqual(
      Array.from({length: 15}, (_, i) => `Sep ${2 * i + 2}`),
    );
    // A wider step than fits is the caller's to ask for.
    expect(labelTexts(data, barLayout(1200, data, BANDS, {...OPTIONS, xLabelEvery: 10}))).toEqual(['Sep 10', 'Sep 20', 'Sep 30']);
  });

  it('keeps a label inside the chart when its bar sits near the edge', () => {
    const weeks: BarDatum[] = [{key: '2026-09-28', label: 'Week of Sep 28', values: {high: 12}}];
    const layout = barLayout(100, weeks, BANDS, OPTIONS);
    // The bar's centre is 66, but the 84px label would run 8px past the right edge.
    expect(layout.centers).toEqual([66]);
    expect(layout.xLabels).toEqual([{index: 0, x: 58}]);
  });

  it('stacks the series from the baseline up, with a 2px gap and a 1px floor for a tiny share', () => {
    const series = BANDS.slice(0, 2);
    const layout = barLayout(320, [{key: 'k', label: 'K', values: {high: 1000, mid: 1}}], series, OPTIONS);
    const [high, mid] = layout.stacks[0];
    expect(high.bottom).toBe(176);
    expect(mid.bottom).toBeCloseTo(high.top - 2, 6);
    expect(mid.bottom - mid.top).toBeCloseTo(1, 6);
    expect(layout.barTops[0]).toBe(mid.top);
  });

  it('gives an empty bar no segments and its top at the baseline', () => {
    const layout = barLayout(320, september(2, (i) => ({high: i})), BANDS, OPTIONS);
    expect(layout.stacks[0]).toEqual([]);
    expect(layout.barTops[0]).toBe(176);
    // The other bar holds the whole total, so it reaches the top of the axis.
    expect(layout.baseline - layout.barTops[1]).toBe(160);
  });

  it('widens the gutter for a wider tick label rather than clip it', () => {
    const layout = barLayout(320, september(3, () => ({high: 40000})), BANDS, OPTIONS);
    // "40,000" is 36px plus the 8px gap.
    expect(layout.left).toBe(44);
    expect(layout.plotWidth).toBe(268);
  });

  it('prints the last and the highest total, or the last alone when the two would collide', () => {
    expect(barLayout(320, DAYS, BANDS, OPTIONS).caps.map((cap) => cap.text)).toEqual(['37', '9']);
    // 60px leaves 6px slots: "40" and "39" overlap.
    const close = september(2, (i) => ({high: 40 - i}));
    expect(barLayout(60, close, BANDS, OPTIONS).caps.map((cap) => cap.text)).toEqual(['39']);
  });

  it('prints every total while each fits its slot, and falls back to the extremes when one does not', () => {
    const all = {...OPTIONS, capLabels: 'all' as const};
    expect(barLayout(320, DAYS, BANDS, all).caps.map((cap) => cap.text)).toEqual(['5', '37', '12', '9']);
    expect(barLayout(60, september(2, (i) => ({high: 40 - i})), BANDS, all).caps.map((cap) => cap.text)).toEqual(['39']);
    expect(barLayout(320, DAYS, BANDS, {...OPTIONS, capLabels: 'none'}).caps).toEqual([]);
  });

  it('sits each cap label just above its bar', () => {
    const layout = barLayout(320, DAYS, BANDS, OPTIONS);
    const highest = layout.caps.find((cap) => cap.index === 1)!;
    expect(highest.x).toBe(142);
    expect(highest.y).toBe(layout.barTops[1] - 4);
  });

  it("fills in BarChart's defaults: a 160px plot, fmtInt values and 'extremes' caps", () => {
    expect(barLayoutOptions({})).toEqual({height: 160, valueFormat: fmtInt, capLabels: 'extremes', xLabelEvery: undefined, subLabels: false});
    expect(barLayoutOptions({height: 90, capLabels: 'all', xLabelEvery: 7, subLabel: () => null})).toMatchObject({
      height: 90,
      capLabels: 'all',
      xLabelEvery: 7,
      subLabels: true,
    });
  });

  it('adds the sub-label band under the x labels only when asked', () => {
    const plain = barLayout(320, DAYS, BANDS, OPTIONS);
    const withSub = barLayout(320, DAYS, BANDS, {...OPTIONS, subLabels: true});
    expect(withSub.svgHeight - plain.svgHeight).toBe(14);
    expect(plain.xLabelY).toBe(192);
    expect(withSub.subLabelY).toBe(206);
  });
});
