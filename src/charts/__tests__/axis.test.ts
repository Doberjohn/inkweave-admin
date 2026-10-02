import {describe, expect, it} from 'vitest';
import {fmtGap, fmtInt} from '../../ui/format';
import {LABEL_SIZE, TICK_GAP, labelWidth, labelX, px, wholeTicks, yAxis} from '../axis';
import {linear} from '../scale';

describe('axis', () => {
  it('rounds SVG numbers to two places', () => {
    expect(px(12.3456)).toBe(12.35);
    expect(px(7)).toBe(7);
  });

  it('measures labels at the micro size', () => {
    expect(LABEL_SIZE).toBe(10);
    // 0.6em a character: "Sep 30" is 36px.
    expect(labelWidth('Sep 30')).toBe(36);
  });

  it('centres a label on its x, moved in at either edge of the chart', () => {
    expect(labelX(100, 36, 320)).toBe(100);
    expect(labelX(10, 36, 320)).toBe(18);
    expect(labelX(315, 36, 320)).toBe(302);
  });

  it('gives whole-number data whole-number ticks', () => {
    expect(wholeTicks(40, true)).toEqual([0, 20, 40]);
    expect(wholeTicks(5, true)).toEqual([0, 5]);
    expect(wholeTicks(5, false)).toEqual([0, 2.5, 5]);
  });

  it('labels and places each tick, and sizes the gutter to the widest label', () => {
    const axis = yAxis([0, 20, 40], fmtInt, linear([0, 40], [176, 16]));
    expect(axis.ticks).toEqual([
      {value: 0, label: '0', y: 176},
      {value: 20, label: '20', y: 96},
      {value: 40, label: '40', y: 16},
    ]);
    // "40" is 12px wide, plus the gap.
    expect(axis.gutter).toBe(12 + TICK_GAP);
    // "−0.50" (5 characters, 30px) is the widest of a signed axis.
    expect(yAxis([-0.5, 0, 1.2], fmtGap, (v) => v).gutter).toBe(30 + TICK_GAP);
  });
});
