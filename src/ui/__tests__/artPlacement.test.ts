import {describe, expect, it} from 'vitest';
import {ART_HEIGHT, ART_WIDTH, artPlacement} from '../artPlacement';

const WINDOW = {width: 1280, height: 800};

/** A link's box, 20px tall, its top-left corner at (left, top). */
const link = ({top, left}: {top: number; left: number}) => ({top, bottom: top + 20, left});

describe('artPlacement', () => {
  it('puts the art above the link, 8px clear of it, its left edge at the link’s', () => {
    expect(artPlacement(link({top: 400, left: 500}), WINDOW)).toEqual({top: 400 - 8 - ART_HEIGHT, left: 500});
  });

  it('puts it above for as long as it clears the window’s top by 8px', () => {
    expect(artPlacement(link({top: 8 + ART_HEIGHT + 8, left: 500}), WINDOW).top).toBe(8);
  });

  it('puts it below a link too near the window’s top for it to fit above', () => {
    expect(artPlacement(link({top: 100, left: 500}), WINDOW).top).toBe(100 + 20 + 8);
  });

  it('keeps it inside a window too short for it on either side, where it may cover its link', () => {
    const short = {width: 1280, height: 400};
    expect(artPlacement(link({top: 200, left: 500}), short).top).toBe(400 - 8 - ART_HEIGHT);
  });

  it('keeps it 8px inside the window’s left and right edges', () => {
    expect(artPlacement(link({top: 400, left: 0}), WINDOW).left).toBe(8);
    expect(artPlacement(link({top: 400, left: 1200}), WINDOW).left).toBe(1280 - 8 - ART_WIDTH);
  });

  it('starts it 8px from the left in a window narrower than it', () => {
    expect(artPlacement(link({top: 400, left: 50}), {width: 150, height: 800}).left).toBe(8);
  });
});
