import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {COLORS, EASING, FONT_SIZES, RADIUS} from '../../app-bridge';
import {AdminStyles} from '../AdminStyles';
import {ADMIN_COLORS, ADMIN_RADIUS} from '../adminTheme';

// The class names in the plan's shared interfaces (docs/plans/R-redesign.md).
const CLASSES = [
  'adm-nav-item',
  'adm-nav-mark',
  'adm-seg',
  'adm-seg-btn',
  'adm-row-btn',
  'adm-card-btn',
  'adm-input',
  'adm-select',
  'adm-hover-row',
  // The card switcher's options (R3-5).
  'adm-option',
  // R3-8's: a card name's link.
  'adm-link',
  // The chart kit's (R1-3b).
  'adm-chart-plot',
  'adm-chart-hit',
  'adm-chart-mark',
  'adm-chart-bar',
  'adm-chart-line',
  'adm-chart-area',
  'adm-chart-label',
  'adm-chart-cursor',
  'adm-chart-tip',
  // The network diagram's node links (R3-4b).
  'adm-net-link',
];
const FOCUSABLE = [
  'adm-nav-item',
  'adm-seg-btn',
  'adm-row-btn',
  'adm-card-btn',
  'adm-input',
  'adm-select',
  'adm-chart-hit',
  'adm-link',
];
const PRESSABLE = ['adm-seg-btn', 'adm-row-btn', 'adm-card-btn', 'adm-chart-hit'];
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

  it('keeps a selected row button on one fill, hovered or not', () => {
    const css = stylesheet();
    expect(css).toContain(`.adm-row-btn[aria-pressed="true"]{background:${ADMIN_COLORS.rowSelected};`);
    expect(css).toContain(`.adm-row-btn[aria-pressed="true"]:hover:where(:not(:disabled)){background:${ADMIN_COLORS.rowSelected};}`);
  });

  it('marks the active option from aria-selected, with the row fill and the selected bar', () => {
    const css = stylesheet();
    expect(css).toContain(
      `.adm-option[aria-selected="true"]{background:${ADMIN_COLORS.rowHover};box-shadow:inset 2px 0 0 ${ADMIN_COLORS.accent};}`,
    );
    // The hook highlights a hovered option too, so the one rule covers the pointer.
    expect(css).not.toContain('.adm-option:hover');
    const reduced = /@media \(prefers-reduced-motion: reduce\)\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(reduced).toMatch(/[.]adm-option(?![a-z-])[^{]*[{]transition:none;[}]/);
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

  it('rings a focused chart plot outside it and a focused bar column inside it', () => {
    const css = stylesheet();
    expect(css).toContain(`.adm-chart-plot:focus-visible{outline:2px solid ${ADMIN_COLORS.accent};outline-offset:2px;}`);
    // Bar columns sit flush against each other, so their ring stays inside the column.
    expect(css).toContain(`.adm-chart-hit:focus-visible{outline:2px solid ${ADMIN_COLORS.accent};outline-offset:-2px;}`);
  });

  it('lets a network node link fill its box, and rings it outside it as the controls are ringed', () => {
    const css = stylesheet();
    expect(css).toContain(`.adm-net-link{display:block;width:100%;height:100%;border-radius:${ADMIN_RADIUS.control}px;}`);
    // Last in the controls' focus-visible list. It has no hover style (a hover shows its tooltip), so FOCUSABLE leaves it out.
    expect(css).toContain(`.adm-net-link:focus-visible{outline:2px solid ${ADMIN_COLORS.accent};outline-offset:2px;}`);
  });

  it('never dims a bar column, so a focused one keeps its full ring while another is picked', () => {
    render(
      <>
        <AdminStyles />
        <div>
          <button type="button" className="adm-chart-hit" aria-pressed="true" aria-label="Sep 29" />
          <button type="button" className="adm-chart-hit" aria-pressed="false" aria-label="Sep 30" />
        </div>
      </>,
    );
    expect(getComputedStyle(screen.getByRole('button', {name: 'Sep 30'})).opacity).toBe('1');
  });

  it('moves chart marks on the smooth curve, through transform and opacity only', () => {
    const css = stylesheet();
    expect(css).toContain(`.adm-chart-cursor{transition:transform .2s ${EASING.smooth};}`);
    expect(css).toContain(`.adm-chart-tip{transition:transform .2s ${EASING.smooth};`);
    expect(css).toContain('@keyframes adm-chart-rise{from{transform:scaleY(0);}to{transform:scaleY(1);}}');
    expect(css).toContain('@keyframes adm-chart-draw{from{stroke-dashoffset:1;}to{stroke-dashoffset:0;}}');
    // No keyframe touches layout, so SVG and HTML marks animate alike.
    const keyframes = [...css.matchAll(/@keyframes [a-z-]+\{(.*?)\}\}/g)];
    expect(keyframes).toHaveLength(3);
    for (const [, body] of keyframes) {
      for (const [, property] of body.matchAll(/([a-z-]+):/g)) {
        expect(['transform', 'opacity', 'stroke-dashoffset']).toContain(property);
      }
    }
  });

  it('switches every chart transition and animation off for reduced motion', () => {
    const reduced = /@media \(prefers-reduced-motion: reduce\)\{([\s\S]*?)\n\}/.exec(stylesheet())?.[1] ?? '';
    for (const name of ['adm-chart-hit', 'adm-chart-mark', 'adm-chart-cursor', 'adm-chart-tip']) {
      expect(reduced, name).toMatch(new RegExp(`[.]${name}(?![a-z-])[^{]*[{]transition:none;[}]`));
    }
    for (const name of ['adm-chart-bar', 'adm-chart-line', 'adm-chart-area', 'adm-chart-label', 'adm-chart-tip']) {
      expect(reduced, name).toMatch(new RegExp(`[.]${name}(?![a-z-])[^{]*[{]animation:none;[}]`));
    }
  });

  it('dims chart marks beside a picked one and brightens the active one', () => {
    render(
      <>
        <AdminStyles />
        <svg>
          <g data-testid="dimmed" className="adm-chart-mark" data-dim="true" />
          <g data-testid="active" className="adm-chart-mark" data-active="true" />
          <g data-testid="plain" className="adm-chart-mark" />
        </svg>
      </>,
    );
    expect(getComputedStyle(screen.getByTestId('dimmed')).opacity).toBe('0.4');
    expect(getComputedStyle(screen.getByTestId('active')).filter).toBe('brightness(1.2)');
    expect(getComputedStyle(screen.getByTestId('plain')).opacity).toBe('1');
  });

  it('underlines a card link in the muted colour, golds it on hover and rings it 2px out (R3-8)', () => {
    const css = stylesheet();
    expect(css).toContain(`.adm-link{color:inherit;text-decoration:underline;text-decoration-color:${ADMIN_COLORS.muted};`);
    expect(css).toContain(`.adm-link:hover{color:${ADMIN_COLORS.accent};text-decoration-color:${ADMIN_COLORS.accent};}`);
    expect(css).toContain(`.adm-link:focus-visible{outline:2px solid ${ADMIN_COLORS.accent};outline-offset:2px;}`);
    const reduced = /@media \(prefers-reduced-motion: reduce\)\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(reduced).toMatch(/[.]adm-link(?![a-z-])[^{]*[{]transition:none;[}]/);
  });
});
