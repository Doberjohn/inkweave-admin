import {describe, expect, it} from 'vitest';
import {ART_HEIGHT, ART_WIDTH, artPlacement} from '../artPlacement';

const WINDOW = {width: 1280, height: 800};

/** A link's box, 80px wide and 20px tall, its top-left corner at (left, top). */
const link = ({top, left}: {top: number; left: number}) => ({top, bottom: top + 20, left, right: left + 80});

/** A page's body under its 64px header, beside a 240px sidebar: the box that scrolls round its links. */
const BODY = {top: 64, bottom: 800, left: 240, right: 1280};

describe('artPlacement', () => {
  it('puts the art above the link, 8px clear of it, its left edge at the link’s', () => {
    expect(artPlacement(link({top: 400, left: 500}), WINDOW)).toEqual({top: 400 - 8 - ART_HEIGHT, left: 500});
  });

  it('puts it above for as long as it clears the window’s top by 8px', () => {
    expect(artPlacement(link({top: 8 + ART_HEIGHT + 8, left: 500}), WINDOW)?.top).toBe(8);
  });

  it('puts it below a link too near the window’s top for it to fit above', () => {
    expect(artPlacement(link({top: 100, left: 500}), WINDOW)?.top).toBe(100 + 20 + 8);
  });

  it('keeps it inside a window too short for it on either side, where it may cover its link', () => {
    const short = {width: 1280, height: 400};
    expect(artPlacement(link({top: 200, left: 500}), short)?.top).toBe(400 - 8 - ART_HEIGHT);
  });

  it('keeps it 8px inside the window’s left and right edges', () => {
    expect(artPlacement(link({top: 400, left: 0}), WINDOW)?.left).toBe(8);
    expect(artPlacement(link({top: 400, left: 1200}), WINDOW)?.left).toBe(1280 - 8 - ART_WIDTH);
  });

  it('places nothing while the link is outside the window, as a focused link scrolled away is', () => {
    expect(artPlacement(link({top: -30, left: 500}), WINDOW)).toBeNull();
    expect(artPlacement(link({top: 810, left: 500}), WINDOW)).toBeNull();
    expect(artPlacement(link({top: 400, left: -100}), WINDOW)).toBeNull();
    expect(artPlacement(link({top: 400, left: 1290}), WINDOW)).toBeNull();
  });

  it('places nothing while a box round the link hides it, as a page body scrolled up under its header does', () => {
    expect(artPlacement(link({top: 30, left: 500}), WINDOW, [BODY])).toBeNull();
  });

  it('places the art of a link the box shows even in part, as it would without the box', () => {
    expect(artPlacement(link({top: 54, left: 500}), WINDOW, [BODY])).toEqual({top: 54 + 20 + 8, left: 500});
    expect(artPlacement(link({top: 400, left: 500}), WINDOW, [BODY])).toEqual({top: 400 - 8 - ART_HEIGHT, left: 500});
  });

  it('keeps the art above a link the window’s bottom edge cuts off inside the window', () => {
    const place = artPlacement(link({top: 790, left: 500}), WINDOW);
    expect(place?.top).toBe(790 - 8 - ART_HEIGHT);
    expect((place?.top ?? Infinity) + ART_HEIGHT).toBeLessThanOrEqual(800 - 8);
  });

  it('starts it 8px from the left in a window narrower than it', () => {
    expect(artPlacement(link({top: 400, left: 50}), {width: 150, height: 800})?.left).toBe(8);
  });
});
