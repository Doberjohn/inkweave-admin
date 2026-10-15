import {SPACING} from '../../../app-bridge';
import {STUDIO_PADDING} from '../studioLayout';
import {STUDIO_FORM, STUDIO_GAP, STUDIO_GRID, STUDIO_SLOT} from '../studioStyles';

// The box useContainerWidth measures: what must not change with the layout.
const BOX = ['boxSizing', 'width', 'maxWidth', 'margin', 'padding'] as const;

describe('the studio layout styles', () => {
  it('pads the measured root by STUDIO_PADDING, which STUDIO_WIDE_MIN allows for', () => {
    expect(STUDIO_PADDING).toBe(SPACING.lg);
    expect(STUDIO_GRID.wide.padding).toBe(STUDIO_PADDING);
  });

  it.each(BOX)("keeps the root's %s the same in both layouts, so a switch can't move the measure", (key) => {
    expect(STUDIO_GRID.narrow[key]).toBe(STUDIO_GRID.wide[key]);
  });

  it("spans the form across the page's two middle columns when wide", () => {
    // The handoff's tracks: the card panel, two equal form columns, the aside.
    expect(STUDIO_GRID.wide.gridTemplateColumns).toBe('minmax(320px, 400px) minmax(0, 1fr) minmax(0, 1fr) 280px');
    expect(STUDIO_SLOT.wide).toMatchObject({card: {gridColumn: '1'}, form: {gridColumn: '2 / span 2'}, aside: {gridColumn: '4'}});
  });

  it('lets every narrow slot give way on a phone, so the studio never scrolls sideways beside the 64px rail', () => {
    // The form keeps 300-400px where the line has 300px. Under that (a 360px phone: 360 - 64 - 32 = 264px),
    // it takes the whole line.
    expect(STUDIO_SLOT.narrow.form).toEqual({flex: '0 1 400px', minWidth: 'min(300px, 100%)'});
    expect(STUDIO_SLOT.narrow.card.minWidth).toBe(0);
    expect(STUDIO_SLOT.narrow.aside.minWidth).toBe(0);
  });

  it("lines the form's two columns up with the page's: two equal columns on the page's gap", () => {
    expect(STUDIO_FORM.wide).toMatchObject({gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: STUDIO_GAP});
    expect(STUDIO_GRID.wide.gap).toBe(STUDIO_GAP);
  });
});
