import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {COLORS, FONT_SIZES, RADIUS} from '../../app-bridge';
import {AdminStyles} from '../AdminStyles';
import {ADMIN_COLORS} from '../adminTheme';

// The class names in the plan's shared interfaces (docs/plans/R-redesign.md).
const CLASSES = [
  'adm-nav-item',
  'adm-nav-mark',
  'adm-seg',
  'adm-seg-btn',
  'adm-row-btn',
  'adm-card-btn',
  'adm-bar-btn',
  'adm-input',
  'adm-select',
  'adm-hover-row',
];
const FOCUSABLE = ['adm-nav-item', 'adm-seg-btn', 'adm-row-btn', 'adm-card-btn', 'adm-bar-btn', 'adm-input', 'adm-select'];
const PRESSABLE = ['adm-seg-btn', 'adm-row-btn', 'adm-card-btn', 'adm-bar-btn'];
const RGBA = /rgba\(\d+, \d+, \d+, [\d.]+\)/g;

function stylesheet(): string {
  const {container} = render(<AdminStyles />);
  const style = container.querySelector('style');
  expect(style).not.toBeNull();
  return style!.textContent ?? '';
}

describe('AdminStyles', () => {
  it('defines every adm-* class in the contract', () => {
    const css = stylesheet();
    // The lookahead keeps .adm-seg from matching inside .adm-seg-btn.
    for (const name of CLASSES) expect(css).toMatch(new RegExp(`[.]${name}(?![a-z-])`));
  });

  it('gives every interactive class a hover state and a gold focus-visible ring', () => {
    const css = stylesheet();
    for (const name of FOCUSABLE) {
      expect(css).toContain(`.${name}:hover`);
      expect(css).toContain(`.${name}:focus-visible`);
    }
    expect(css).toContain('.adm-hover-row:hover');
    expect(css).toContain(`outline:2px solid ${ADMIN_COLORS.accent}`);
  });

  it('reads selection from ARIA state, not from a class', () => {
    const css = stylesheet();
    expect(css).toContain('.adm-nav-item[aria-current="page"]');
    for (const name of PRESSABLE) expect(css).toContain(`.${name}[aria-pressed="true"]`);
  });

  it('uses token colours only: hexes from COLORS, rgba() from ADMIN_COLORS', () => {
    const css = stylesheet();
    const tokenHexes = new Set(Object.values(COLORS).map((v) => v.toLowerCase()));
    const hexes = css.replace(RGBA, '').match(/#[0-9a-f]{3,8}\b/gi) ?? [];
    for (const hex of hexes) expect(tokenHexes.has(hex.toLowerCase()), `raw hex ${hex}`).toBe(true);
    const adminRgbas = new Set<string>(Object.values(ADMIN_COLORS));
    for (const rgba of css.match(RGBA) ?? []) expect(adminRgbas.has(rgba), `raw ${rgba}`).toBe(true);
  });

  it('uses scale font sizes and radii only', () => {
    const css = stylesheet();
    const sizes = new Set<number>(Object.values(FONT_SIZES));
    for (const [, px] of css.matchAll(/font-size:(\d+)px/g)) expect(sizes.has(Number(px)), `font-size ${px}px`).toBe(true);
    const radii = new Set<number>([0, ...Object.values(RADIUS)]);
    for (const [, px] of css.matchAll(/border-radius:(\d+)/g)) expect(radii.has(Number(px)), `border-radius ${px}`).toBe(true);
  });

  it('dims the bars next to a pressed bar', () => {
    render(
      <>
        <AdminStyles />
        <div>
          <button type="button" className="adm-bar-btn" aria-pressed="true">Sep 29</button>
          <button type="button" className="adm-bar-btn" aria-pressed="false">Sep 30</button>
        </div>
      </>,
    );
    expect(getComputedStyle(screen.getByRole('button', {name: 'Sep 29'})).opacity).toBe('1');
    expect(getComputedStyle(screen.getByRole('button', {name: 'Sep 30'})).opacity).toBe('0.4');
  });

  it('clips translucent fills to the padding box, a selected card included', () => {
    render(
      <>
        <AdminStyles />
        <div role="group" aria-label="Score band" className="adm-seg" />
        <button type="button" className="adm-card-btn" aria-pressed="true">Searches</button>
        <input aria-label="Search pairs" className="adm-input" />
      </>,
    );
    const filled = [screen.getByRole('group'), screen.getByRole('button'), screen.getByRole('textbox')];
    for (const el of filled) expect(getComputedStyle(el).backgroundClip, el.className).toBe('padding-box');
  });
});
