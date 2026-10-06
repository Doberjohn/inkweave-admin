import {describe, expect, it} from 'vitest';
import {
  FOCUS_REACH,
  NAME_SIZE,
  NODE_TARGET,
  labelFor,
  networkLayout,
  nodeTarget,
  overlaps,
  placeLabels,
  ringRadii,
  ringSizes,
  ringSlots,
  spokeWidth,
  type Box,
  type LabelPlacement,
  type RingSlot,
} from '../networkLayout';
import {textWidth} from '../scale';

const PLOT = {width: 560, height: 340};
const BOUNDS = {x: 0, y: 0, ...PLOT};

/** A slot's angle in whole degrees, clockwise from 12 o'clock, in [0, 360). */
function clockDegrees(slot: RingSlot): number {
  return Math.round((((slot.angle + Math.PI / 2) * 180) / Math.PI + 360) % 360);
}

/** A start-anchored label covering `box`. */
function label(box: Box): LabelPlacement {
  return {anchor: 'start', textX: box.x, textY: box.y + box.height / 2, ...box};
}

describe('ringSizes', () => {
  it.each([
    [0, [0, 0]],
    [6, [6, 0]],
    [7, [4, 3]],
    [12, [6, 6]],
  ])('splits %i nodes as %j', (count, sizes) => {
    expect(ringSizes(count)).toEqual(sizes);
  });
});

describe('ringRadii', () => {
  it('fits the outer ring inside the shorter side, less the margin, with the inner ring at 55%', () => {
    const [inner, outer] = ringRadii(PLOT);
    expect(outer).toBe(130);
    expect(inner).toBeCloseTo(71.5, 10);
  });

  it('never goes negative on a tiny plot', () => {
    expect(ringRadii({width: 60, height: 60})).toEqual([0, 0]);
  });
});

describe('ringSlots', () => {
  it('puts a lone ring on the outer radius round the plot centre, strongest at 12 o’clock, then clockwise', () => {
    const slots = ringSlots(4, PLOT);
    expect(slots.map(clockDegrees)).toEqual([0, 90, 180, 270]);
    expect(slots.every((s) => s.radius === 130)).toBe(true);
    expect(slots[0].x).toBeCloseTo(280, 10);
    expect(slots[0].y).toBeCloseTo(40, 10);
    expect(slots[1].x).toBeCloseTo(410, 10);
  });

  it('keeps the stronger half on the inner ring and seats the outer ring between them', () => {
    const slots = ringSlots(12, PLOT);
    expect(slots.slice(0, 6).map((s) => s.radius.toFixed(1))).toEqual(Array(6).fill('71.5'));
    expect(slots.slice(0, 6).map(clockDegrees)).toEqual([0, 60, 120, 180, 240, 300]);
    expect(slots.slice(6).map((s) => s.radius)).toEqual(Array(6).fill(130));
    expect(slots.slice(6).map(clockDegrees)).toEqual([30, 90, 150, 210, 270, 330]);
  });

  it('spreads a smaller outer ring over the midpoints, so no two nodes share a spoke', () => {
    expect(ringSlots(7, PLOT).map(clockDegrees)).toEqual([0, 90, 180, 270, 45, 135, 225]);
  });

  it('lays out the same way every time', () => {
    expect(ringSlots(9, PLOT)).toEqual(ringSlots(9, PLOT));
  });
});

describe('labelFor', () => {
  /** A point 100px from the plot centre at a clock angle in degrees. */
  const at = (degrees: number) => {
    const angle = ((degrees - 90) * Math.PI) / 180;
    return {angle, x: 280 + 100 * Math.cos(angle), y: 170 + 100 * Math.sin(angle)};
  };
  const NAME = {width: 80, height: 16};

  it('starts a name just past the target of a node on the right', () => {
    expect(labelFor(at(90), NAME)).toMatchObject({anchor: 'start', textX: 392, textY: 170, x: 392, y: 162, width: 80, height: 16});
  });

  it('ends a name just past the target of a node on the left', () => {
    const name = labelFor(at(270), NAME);
    expect(name.anchor).toBe('end');
    expect(name.textX).toBeCloseTo(168, 10);
    expect(name.x).toBeCloseTo(88, 10);
  });

  it('centres a name above a node near 12 o’clock and below one near 6', () => {
    const top = labelFor(at(0), NAME);
    expect(top.anchor).toBe('middle');
    expect(top.textY).toBeCloseTo(50, 10);
    expect(top.y + top.height).toBeCloseTo(58, 10);
    const bottom = labelFor(at(180), NAME);
    expect(bottom.textY).toBeCloseTo(290, 10);
    expect(bottom.y).toBeCloseTo(282, 10);
    expect(bottom.x).toBeCloseTo(240, 10);
  });
});

describe('overlaps', () => {
  it('counts shared area, not touching edges', () => {
    const a = {x: 0, y: 0, width: 10, height: 10};
    expect(overlaps(a, {x: 9, y: 9, width: 10, height: 10})).toBe(true);
    expect(overlaps(a, {x: 10, y: 0, width: 10, height: 10})).toBe(false);
  });

  it('never counts a name as covering its own node’s target through float rounding', () => {
    const slots = ringSlots(7, {width: 326, height: 340});
    expect(slots.map((s) => overlaps(labelFor(s, {width: 40, height: 15}), nodeTarget(s)))).toEqual(Array(7).fill(false));
  });
});

describe('placeLabels', () => {
  it('prints the stronger of two colliding labels and drops the weaker', () => {
    const labels = [
      label({x: 100, y: 100, width: 80, height: 16}),
      label({x: 150, y: 108, width: 80, height: 16}),
      label({x: 300, y: 100, width: 80, height: 16}),
    ];
    expect(placeLabels(labels, [], BOUNDS).map((p) => p !== null)).toEqual([true, false, true]);
  });

  it('drops a label that would leave the bounds', () => {
    expect(placeLabels([label({x: 500, y: 100, width: 80, height: 16})], [], BOUNDS)).toEqual([null]);
  });

  it('drops a label that covers a blocked box, such as another node’s target', () => {
    const blocked = [nodeTarget({x: 150, y: 108})];
    expect(placeLabels([label({x: 100, y: 100, width: 80, height: 16})], blocked, BOUNDS)).toEqual([null]);
  });
});

describe('nodeTarget', () => {
  it('is the NODE_TARGET square centred on the point', () => {
    expect(nodeTarget({x: 100, y: 50})).toEqual({x: 88, y: 38, width: NODE_TARGET, height: NODE_TARGET});
  });
});

describe('spokeWidth', () => {
  it.each([
    [0, 1],
    [5, 2.5],
    [10, 4],
    [-2, 1],
    [12, 4],
  ])('draws a value of %d %dpx wide, clamped to 1 to 4px', (value, width) => {
    expect(spokeWidth(value, [0, 10])).toBe(width);
  });
});

describe('networkLayout', () => {
  const NAMES = ['Elsa', 'Anna', 'Olaf', 'Kristoff', 'Sven', 'Hans', 'Marshmallow', 'Grand Pabbie', 'Oaken', 'Bruni', 'Iduna', 'Agnarr'];

  it('puts the hub at the centre and a slot per name, as ringSlots does', () => {
    const layout = networkLayout(PLOT, NAMES);
    expect(layout.size).toEqual(PLOT);
    expect(layout.hub).toEqual({x: 280, y: 170});
    expect(layout.slots).toEqual(ringSlots(12, PLOT));
  });

  it('measures each name with the kit’s textWidth estimate at NAME_SIZE', () => {
    const [elsa] = networkLayout(PLOT, ['Elsa']).names;
    expect(elsa?.width).toBe(textWidth('Elsa', NAME_SIZE));
  });

  it('prints a name that fits and widens its link to cover it; one too wide keeps the bare target', () => {
    const wide = 'An extraordinarily long partner name that cannot fit beside its node at all';
    const layout = networkLayout(PLOT, ['Elsa', wide, 'Olaf']);
    expect(layout.names.map(Boolean)).toEqual([true, false, true]);
    expect(layout.links[1]).toEqual(nodeTarget(layout.slots[1]));
    const [elsaLink, elsaName, elsaTarget] = [layout.links[0], layout.names[0]!, nodeTarget(layout.slots[0])];
    expect(elsaLink.y).toBe(elsaName.y);
    expect(elsaLink.y + elsaLink.height).toBe(elsaTarget.y + elsaTarget.height);
  });

  it('keeps every printed name inside the plot, clear of each other, of every node and of the hub, at any width', () => {
    for (const width of [320, 480, 640, 960]) {
      const plot = {width, height: 340};
      const layout = networkLayout(plot, NAMES.map((name) => `${name} - Keeper of the Northern Lights`));
      const printed = layout.names.filter((name) => name !== null);
      const targets = [nodeTarget(layout.hub), ...layout.slots.map((slot) => nodeTarget(slot))];
      for (const [i, name] of printed.entries()) {
        expect(name.x).toBeGreaterThanOrEqual(FOCUS_REACH);
        expect(name.x + name.width).toBeLessThanOrEqual(width - FOCUS_REACH);
        expect(targets.some((target) => overlaps(name, target))).toBe(false);
        expect(printed.slice(i + 1).some((other) => overlaps(name, other))).toBe(false);
      }
    }
  });
});
