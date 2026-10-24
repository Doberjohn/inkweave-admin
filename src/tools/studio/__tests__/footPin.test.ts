import {describe, expect, it} from 'vitest';
import {PIN_SHARE, pinsInView} from '../footPin';

describe('pinsInView (#86)', () => {
  it.each([
    // The ruling's cases: at 400% zoom a rejected-token foot over a body of about 150px, and a clash foot on a 375px phone.
    ['unpins a rejected-token foot at 400% zoom', {foot: 277, view: 150}, false],
    ['pins a clash foot on a 375px phone', {foot: 186, view: 564}, true],
    ['pins a plain foot on a phone', {foot: 70, view: 564}, true],
    ['pins a foot of exactly half the view', {foot: 282, view: 564}, true],
    ['unpins a foot a pixel over half the view', {foot: 283, view: 564}, false],
  ])('%s', (_case, fit, pins) => {
    expect(pinsInView(fit)).toBe(pins);
  });

  it.each([
    ['the foot', {foot: 0, view: 564}],
    ['the view', {foot: 277, view: 0}],
  ])('pins, as before the rule, until %s is measured', (_what, fit) => {
    expect(pinsInView(fit)).toBe(true);
  });

  it('lets a foot cover half its view at most', () => {
    expect(PIN_SHARE).toBe(0.5);
  });
});
