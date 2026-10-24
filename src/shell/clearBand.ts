/*
 * Keeping a field that takes focus clear of the boxes pinned over its scroller's view (WCAG 2.4.11).
 * The browser scrolls a focused field only as far as the view's edge, which can leave it under a
 * pinned box, so the page measures the band the pinned boxes leave clear and scrolls the field into
 * it. The tuning aside keeps its fields between its pinned entry header and its tray (TuningAside);
 * Card studio keeps its controls above the Version changes tray's pinned foot (#74).
 */

/** A stretch of the view, from its top to its bottom, in px. */
export type Span = Pick<DOMRect, 'top' | 'bottom'>;

/**
 * How far to scroll, down being positive, so a field sits in the clear band:
 * 0 when it is inside already; else centred in the band, or with its top at
 * the band's top when it is taller than the band, so its start shows.
 */
export function clearScroll(field: Span, band: Span): number {
  if (field.top >= band.top && field.bottom <= band.bottom) return 0;
  const room = band.bottom - band.top;
  const height = field.bottom - field.top;
  return field.top - (height > room ? band.top : band.top + (room - height) / 2);
}

/** The nearest ancestor that scrolls, the one pinned boxes pin to: PageLayout's body on a page. */
export function scrollerOf(field: Element): Element {
  for (let node = field.parentElement; node; node = node.parentElement) {
    const {overflowY} = getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
  }
  return document.scrollingElement ?? document.documentElement;
}

/** Scrolls the field's scroller so the field sits in `band`, unless it does already (clearScroll). */
export function scrollIntoBand({field, band}: {field: Element; band: Span}): void {
  const by = clearScroll(field.getBoundingClientRect(), band);
  if (by !== 0) scrollerOf(field).scrollBy({top: by});
}

/** Where a scroller's view starts: its top edge, or the window's for the document, whose own box scrolls away. */
function viewTopOf(scroller: Element): number {
  const documentScrolls = scroller === document.scrollingElement || scroller === document.documentElement;
  return documentScrolls ? 0 : scroller.getBoundingClientRect().top;
}

/**
 * Keeps a field that takes focus clear of `foot`, a box pinned to the bottom of the view, or null
 * while none is: the band runs from the top of the field's scroller's view to the foot's top. A field
 * inside the foot is left alone: the foot is pinned, so scrolling for it would move the page and
 * never it.
 */
export function keepClearOfFoot({field, foot}: {field: Element; foot: Element | null}): void {
  if (foot === null || foot.contains(field)) return;
  scrollIntoBand({field, band: {top: viewTopOf(scrollerOf(field)), bottom: foot.getBoundingClientRect().top}});
}
