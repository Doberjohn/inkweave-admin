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

/** The link's box, as getBoundingClientRect gives it. */
type Anchor = Pick<DOMRect, 'top' | 'bottom' | 'left'>;

/** The window's size. */
interface Viewport {
  width: number;
  height: number;
}

/** `value` kept from `min` to `max`, `min` winning when the two cross (a window narrower than the preview). */
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

/**
 * Where a link's art preview goes: above the link when the window has room
 * for it there, else below it, kept inside the window; its left edge at the
 * link's, kept inside the window too. A name starts at its link's left edge,
 * even where the link fills a table cell, so the art sits over the name, and
 * over the same column for every row of a table. It takes no pointer, so
 * where it can't fit either side it may cover its own link.
 */
export function artPlacement(anchor: Anchor, viewport: Viewport): ArtPlace {
  const above = anchor.top - GAP - ART_HEIGHT;
  const below = clamp(anchor.bottom + GAP, GAP, viewport.height - GAP - ART_HEIGHT);
  return {
    top: above >= GAP ? above : below,
    left: clamp(anchor.left, GAP, viewport.width - GAP - ART_WIDTH),
  };
}
