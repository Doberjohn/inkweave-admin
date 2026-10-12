import {SPACING} from '../../app-bridge';

/**
 * The studio's two layouts (handoff README §7). Wide sets the card panel, the
 * form's four sections (two by two) and the aside in four columns, with every
 * section open. Narrow wraps the form, the card panel and the aside, and the
 * form becomes an accordion with one section open at a time.
 */
export type StudioLayout = 'wide' | 'narrow';

/** The padding inside the studio's measured root, on every side (README §7: 16px). */
export const STUDIO_PADDING = SPACING.lg;

// Where the handoff switches to wide: its root's width, padding included
// (getBoundingClientRect, dc.html:675-678).
const HANDOFF_WIDE_MIN = 1360;

/**
 * The narrowest root that lays out wide, in px of its content box (R-64):
 * useContainerWidth reads contentRect, which leaves out the padding, so the
 * handoff's 1360px border box is 1328px here. The narrow accordion takes over
 * below it.
 */
export const STUDIO_WIDE_MIN = HANDOFF_WIDE_MIN - 2 * STUDIO_PADDING;

/** The layout at a measured width. 0, the width before the first measure (and always in jsdom), is narrow. */
export function studioLayout(width: number): StudioLayout {
  return width >= STUDIO_WIDE_MIN ? 'wide' : 'narrow';
}

/** The three regions StudioWorkspace lays out. */
export type StudioSlot = 'card' | 'form' | 'aside';

/**
 * The regions in DOM order, which is the Tab order (R-63, WCAG 2.4.3): the
 * card panel first when wide, where it is the first column, and the form first
 * when narrow, as the handoff orders it. The workspace renders them as keyed
 * children, so a layout switch moves them and keeps their state.
 */
export const STUDIO_SLOT_ORDER: Readonly<Record<StudioLayout, readonly StudioSlot[]>> = {
  wide: ['card', 'form', 'aside'],
  narrow: ['form', 'card', 'aside'],
};
