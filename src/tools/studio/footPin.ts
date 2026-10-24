import {useEffect, useState, type RefObject} from 'react';
import {scrollerOf} from '../../shell/clearBand';

/*
 * Whether the Version changes tray's foot may pin to the bottom of the view (#86). Pinned, it covers
 * the page by its own height, and a notice in it (a clash, a rejected token) makes it tall: at 400% zoom
 * (WCAG 1.4.10's 320 × 256 CSS px) a rejected-token foot of 277px would cover all of a scrolling body of
 * about 150px, so no content and no focus would show (WCAG 2.4.11). So it pins only while it takes at most
 * half of its scroller's view, and above that it stays in its place under the tray's panel.
 */

/** The share of its scroller's view a pinned foot may cover, at most. */
export const PIN_SHARE = 0.5;

/** The foot's height and its scroller's view's, in px: 0 for what isn't measured yet. */
export interface FootFit {
  foot: number;
  view: number;
}

/**
 * Whether a foot this tall may pin over a view this tall: while it takes at most PIN_SHARE of it. Until
 * both are measured (a browser with no ResizeObserver, jsdom, or the frame before the first measure), it
 * may: the foot pins as it did before the rule.
 */
export function pinsInView({foot, view}: FootFit): boolean {
  if (foot <= 0 || view <= 0) return true;
  return foot <= view * PIN_SHARE;
}

/** How tall a scroller's view is: its own box's inside, or the window's for the document, whose box scrolls. */
function viewHeightOf(scroller: Element): number {
  const documentScrolls = scroller === document.scrollingElement || scroller === document.documentElement;
  return documentScrolls ? window.innerHeight : scroller.clientHeight;
}

/** The refs the tray may hand its foot to: its own while the foot sits in place, the page's while it pins. */
export interface FootRefs {
  own: RefObject<HTMLElement | null>;
  page?: RefObject<HTMLElement | null>;
}

/**
 * Whether the foot fits under half its scroller's view (pinsInView), measured as the studio measures its
 * root: a ResizeObserver on the foot, as its notices come and go, and on its scroller, as the window or
 * the zoom changes it. The foot is in one of the refs when the tray mounts, and stays the same node as the
 * tray hands it from one to the other, so the observer follows it throughout.
 */
export function useFootFits({own, page}: FootRefs): boolean {
  const [fit, setFit] = useState<FootFit>({foot: 0, view: 0});
  useEffect(() => {
    const foot = own.current ?? page?.current ?? null;
    if (foot === null || typeof ResizeObserver === 'undefined') return;
    const scroller = scrollerOf(foot);
    const measure = () => setFit({foot: foot.getBoundingClientRect().height, view: viewHeightOf(scroller)});
    // The observer reports each box as it starts observing, but only in a frame the page renders: a page
    // that isn't drawn (a hidden pane, a background tab) gets none, so the first measure is taken here.
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(foot);
    observer.observe(scroller);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [own, page]);
  return pinsInView(fit);
}
