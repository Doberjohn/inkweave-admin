import {SPACING} from '../app-bridge';

/** The art preview's size: a card's proportions (5:7), its art and name readable at a glance. */
export const ART_WIDTH = 200;
export const ART_HEIGHT = 280;

/** Between the preview and its link, and between the preview and the window's edges. */
const GAP = SPACING.sm;

/** Where the preview goes, in the window's coordinates (position: fixed). */
export interface ArtPlace {
  top: number;
  left: number;
}

/** A box in the window's coordinates, as getBoundingClientRect gives it: the link's, or one round it. */
type Box = Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right'>;

/** The window's size. */
interface Viewport {
  width: number;
  height: number;
}

/** `value` kept from `min` to `max`, `min` winning when the two cross (a window narrower than the preview). */
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

/** The window as a box. */
const windowBox = ({width, height}: Viewport): Box => ({top: 0, bottom: height, left: 0, right: width});

/** Whether boxes `a` and `b` overlap, or touch at an edge. */
const meets = (a: Box, b: Box) => a.bottom >= b.top && a.top <= b.bottom && a.right >= b.left && a.left <= b.right;

/**
 * Where a link's art preview goes: above the link when the window has room
 * for it there, else below it, kept inside the window; its left edge at the
 * link's, kept inside the window too. A name starts at its link's left edge,
 * even where the link fills a table cell, so the art sits over the name, and
 * over the same column for every row of a table. It takes no pointer, so
 * where it can't fit either side it may cover its own link.
 *
 * Nowhere while none of the link shows: while it is out of the window, or out
 * of a box that clips it (`clips`: a page's body, a list that scrolls), as a
 * focused link scrolled away is, so the art never stays on the page without
 * it. A link that shows even in part keeps its art, and the art above such a
 * link ends inside the window.
 */
export function artPlacement(anchor: Box, viewport: Viewport, clips: readonly Box[] = []): ArtPlace | null {
  if (![windowBox(viewport), ...clips].every((box) => meets(anchor, box))) return null;
  const above = anchor.top - GAP - ART_HEIGHT;
  const below = clamp(anchor.bottom + GAP, GAP, viewport.height - GAP - ART_HEIGHT);
  return {
    top: above >= GAP ? above : below,
    left: clamp(anchor.left, GAP, viewport.width - GAP - ART_WIDTH),
  };
}
