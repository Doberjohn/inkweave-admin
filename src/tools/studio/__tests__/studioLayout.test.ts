import {STUDIO_SLOT_ORDER, STUDIO_WIDE_MIN, studioLayout} from '../studioLayout';

describe('studioLayout', () => {
  it('switches where the handoff does: its 1360px border box is a 1328px content box (R-64)', () => {
    expect(STUDIO_WIDE_MIN).toBe(1328);
  });

  it.each([
    [0, 'narrow'],
    [1327.5, 'narrow'],
    [1328, 'wide'],
    // The widest root: 1600px less 16px of padding on each side.
    [1568, 'wide'],
  ] as const)('lays out %spx as %s', (width, layout) => {
    expect(studioLayout(width)).toBe(layout);
  });
});

describe('STUDIO_SLOT_ORDER', () => {
  it('puts the card panel first when wide, where it is the first column (R-63)', () => {
    expect(STUDIO_SLOT_ORDER.wide).toEqual(['card', 'form', 'aside']);
  });

  it('puts the form first when narrow, as the handoff orders it', () => {
    expect(STUDIO_SLOT_ORDER.narrow).toEqual(['form', 'card', 'aside']);
  });
});
