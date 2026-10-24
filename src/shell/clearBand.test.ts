import {afterEach, describe, expect, it, vi} from 'vitest';
import {clearScroll, keepClearOfFoot, scrollIntoBand, scrollerOf} from './clearBand';

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  // The document's own scroller takes a stub in one case: put its own scrollBy back.
  Reflect.deleteProperty(document.documentElement, 'scrollBy');
});

/** A box from `top` to `bottom` in the view, all that getBoundingClientRect's callers here read. */
const box = (top: number, bottom: number) => ({top, bottom}) as DOMRect;

/**
 * A scroller in the document, as PageLayout's body is, holding a field and a foot pinned to its
 * bottom. jsdom lays nothing out, so `pin` fixes a box in the view, and `place` puts the field
 * there, which the scroller's scrollBy moves as a real scroll would.
 */
function scrollerWithFoot(overflowY = 'auto') {
  const scroller = document.body.appendChild(document.createElement('div'));
  scroller.style.overflowY = overflowY;
  const field = scroller.appendChild(document.createElement('button'));
  const foot = scroller.appendChild(document.createElement('div'));
  const publish = foot.appendChild(document.createElement('button'));
  let scrolled = 0;
  const scrollBy = vi.fn((options: ScrollToOptions) => {
    scrolled += options.top ?? 0;
  });
  Object.defineProperty(scroller, 'scrollBy', {value: scrollBy, configurable: true});
  const pin = (el: Element, top: number, bottom: number) => vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(box(top, bottom));
  const place = (el: Element, top: number, bottom: number) =>
    vi.spyOn(el, 'getBoundingClientRect').mockImplementation(() => box(top - scrolled, bottom - scrolled));
  return {scroller, field, foot, publish, scrollBy, pin, place};
}

describe('clearScroll', () => {
  const band = box(100, 500);

  it('asks for no scroll when the field is inside the band', () => {
    expect(clearScroll(box(100, 140), band)).toBe(0);
    expect(clearScroll(box(460, 500), band)).toBe(0);
  });

  it('centres a field below the band, or above it, in the band', () => {
    // A 40px field in a 400px band sits 180px under its top: at 280 to 320.
    expect(clearScroll(box(520, 560), band)).toBe(240);
    expect(clearScroll(box(20, 60), band)).toBe(-260);
  });

  it('puts the top of a field taller than the band at its top, so its start shows', () => {
    expect(clearScroll(box(450, 950), band)).toBe(350);
  });
});

describe('scrollerOf', () => {
  it('finds the nearest ancestor that scrolls, past one that only clips', () => {
    const {scroller, field} = scrollerWithFoot();
    const clip = scroller.appendChild(document.createElement('div'));
    clip.style.overflowY = 'hidden';
    clip.appendChild(field);
    expect(scrollerOf(field)).toBe(scroller);
  });

  it('takes the document when no ancestor scrolls', () => {
    const {field} = scrollerWithFoot('visible');
    expect(scrollerOf(field)).toBe(document.scrollingElement ?? document.documentElement);
  });
});

describe('scrollIntoBand', () => {
  it('scrolls the field’s scroller so the field sits in the band, and only when it doesn’t', () => {
    const {field, scrollBy, place} = scrollerWithFoot();
    place(field, 120, 160);
    scrollIntoBand({field, band: box(100, 500)});
    expect(scrollBy).not.toHaveBeenCalled();

    place(field, 520, 560);
    scrollIntoBand({field, band: box(100, 500)});
    expect(scrollBy).toHaveBeenCalledExactlyOnceWith({top: 240});
    expect(field.getBoundingClientRect()).toMatchObject({top: 280, bottom: 320});
  });
});

/*
 * A box pinned to the bottom of the view (the Version changes tray's foot, #74) hides what scrolls
 * under it, and the browser scrolls a focused control only as far as the view's edge.
 */
describe('keepClearOfFoot', () => {
  it('scrolls a field under the foot into the band from the scroller’s top to the foot’s top', () => {
    const {scroller, field, foot, scrollBy, pin, place} = scrollerWithFoot();
    pin(scroller, 64, 900);
    pin(foot, 830, 900);
    place(field, 850, 882);
    keepClearOfFoot({field, foot});
    expect(scrollBy).toHaveBeenCalledOnce();
    // Centred between 64 and 830.
    expect(field.getBoundingClientRect()).toMatchObject({top: 431, bottom: 463});
  });

  it('leaves a field clear of the foot where it is', () => {
    const {scroller, field, foot, scrollBy, pin, place} = scrollerWithFoot();
    pin(scroller, 64, 900);
    pin(foot, 830, 900);
    place(field, 700, 732);
    keepClearOfFoot({field, foot});
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it('leaves a field inside the foot alone: the foot is pinned, so scrolling would move the page and never it', () => {
    const {scroller, foot, publish, scrollBy, pin} = scrollerWithFoot();
    pin(scroller, 64, 900);
    pin(foot, 830, 900);
    pin(publish, 842, 886);
    keepClearOfFoot({field: publish, foot});
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it('does nothing with no foot pinned', () => {
    const {scroller, field, scrollBy, pin, place} = scrollerWithFoot();
    pin(scroller, 64, 900);
    place(field, 850, 882);
    keepClearOfFoot({field, foot: null});
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it('starts the band at the top of the view where the document scrolls, whose own box scrolls away', () => {
    const {field, foot, pin} = scrollerWithFoot('visible');
    const page = scrollerOf(field);
    let scrolled = 0;
    const scrollBy = vi.fn((options: ScrollToOptions) => {
      scrolled += options.top ?? 0;
    });
    Object.defineProperty(page, 'scrollBy', {value: scrollBy, configurable: true});
    // The document scrolled 2000px down, so its own box starts far above the view.
    pin(page, -2000, -1000);
    pin(foot, 730, 800);
    vi.spyOn(field, 'getBoundingClientRect').mockImplementation(() => box(760 - scrolled, 800 - scrolled));
    keepClearOfFoot({field, foot});
    expect(scrollBy).toHaveBeenCalledOnce();
    // Centred between the view's top, 0, and the foot's top, 730.
    expect(field.getBoundingClientRect()).toMatchObject({top: 345, bottom: 385});
  });
});
