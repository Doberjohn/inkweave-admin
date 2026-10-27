import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {COLORS, DURATION, EASING, FONT_SIZES, RADIUS, SPACING} from '../../app-bridge';
import {AdminStyles, FEATURED_TWO_UP_BELOW, SEARCH_STACK_BELOW} from '../AdminStyles';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../adminTheme';

// The class names in the plan's shared interfaces (docs/plans/R-redesign.md).
const CLASSES = [
  'adm-nav-item',
  'adm-nav-mark',
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
  // Card studio's controls (R4-5a).
  'adm-acc-head',
  'adm-ink-tile',
  'adm-pick-btn',
  'adm-switch',
  'adm-file-btn',
  'adm-file-cover',
  'adm-range',
  // A box that scrolls a table sideways, which the keyboard reaches (R4-8b).
  'adm-scroll-region',
  // Edit card's search rows, their marks under their names in a narrow list (#74).
  'adm-search-list',
  'adm-search-names',
  'adm-search-marks',
  // Featured cards' slots and the rows of a slot's search (#95).
  'adm-featured',
  'adm-featured-grid',
  'adm-pick-row',
];
const FOCUSABLE = [
  'adm-nav-item',
  'adm-row-btn',
  'adm-card-btn',
  'adm-input',
  'adm-select',
  'adm-chart-hit',
  'adm-link',
  'adm-acc-head',
  'adm-pick-btn',
  'adm-switch',
  'adm-range',
];
const PRESSABLE = ['adm-row-btn', 'adm-card-btn', 'adm-chart-hit', 'adm-pick-btn'];
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
    // The lookahead keeps .adm-featured from matching inside .adm-featured-grid.
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

  it('lays an option out as a padded row of body text, under the pointer', () => {
    expect(stylesheet()).toContain(
      `.adm-option{display:flex;align-items:center;gap:${SPACING.sm}px;padding:${SPACING.sm}px ${SPACING.md}px;` +
        `color:${ADMIN_COLORS.text};font-size:${ADMIN_TYPE.body}px;cursor:pointer;`,
    );
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

  it('clips translucent fills to the padding box, selected cards, tiles and picks included', () => {
    render(
      <>
        <AdminStyles />
        <button type="button" className="adm-card-btn" aria-pressed="true">Searches</button>
        <button type="button" className="adm-pick-btn adm-ink-tile" aria-pressed="true" aria-label="Amber" />
        <button type="button" className="adm-pick-btn" aria-pressed="true">Rare</button>
        <input aria-label="Search pairs" className="adm-input" />
      </>,
    );
    const filled = [...screen.getAllByRole('button'), screen.getByRole('textbox')];
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
    expect(css).toContain(`.adm-chart-cursor{transition:transform ${DURATION.base}ms ${EASING.smooth};}`);
    expect(css).toContain(`.adm-chart-tip{transition:transform ${DURATION.base}ms ${EASING.smooth};`);
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

  it("turns an accordion header's chevron on aria-expanded, and rings the header inside, as a row (R4)", () => {
    const css = stylesheet();
    expect(css).toContain('.adm-acc-head[aria-expanded="true"]::after{transform:rotate(45deg);}');
    // Drawn from two borders with no content, so the chevron adds nothing to the button's name.
    expect(css).toContain('.adm-acc-head::after{content:"";');
    expect(css).toContain(`.adm-acc-head:focus-visible{outline:2px solid ${ADMIN_COLORS.accent};outline-offset:-2px;}`);
  });

  it("gives a pick button, an ink tile's too, adm-card-btn's pressed fill and border, admin's one selected look (R-75)", () => {
    const css = stylesheet();
    const look = `background-color:${ADMIN_COLORS.accentTintSoft};border-color:${ADMIN_COLORS.accentStrong};`;
    expect(css).toContain(`.adm-card-btn[aria-pressed="true"]{${look}}`);
    expect(css).toContain(`.adm-pick-btn[aria-pressed="true"]{${look}color:${ADMIN_COLORS.text};}`);
  });

  it('sizes an ink tile as a square up to 48px, a second-ink tile at 40px, where a plain pick button fills its cell', () => {
    render(
      <>
        <AdminStyles />
        <button type="button" className="adm-pick-btn adm-ink-tile" aria-label="Amber" />
        <button type="button" className="adm-pick-btn adm-ink-tile" data-size="sm" aria-label="Ruby" />
        <button type="button" className="adm-pick-btn">Rare</button>
      </>,
    );
    const [amber, ruby, rare] = screen.getAllByRole('button').map((button) => {
      const {width, maxWidth, height} = getComputedStyle(button);
      return {width, maxWidth, height};
    });
    expect(rare.width).toBe('100%');
    // A square, no wider than its grid column (the primary ink row's), so a narrow section shrinks the six
    // tiles rather than wrap them. A width of 100% would wrap them in a row that sizes to its content.
    expect({amber, ruby}).toEqual({
      amber: {width: '48px', maxWidth: '100%', height: 'auto'},
      ruby: {width: '40px', maxWidth: '100%', height: '40px'},
    });
    expect(stylesheet()).toContain(
      '.adm-pick-btn.adm-ink-tile{flex:none;justify-content:center;width:48px;max-width:100%;min-height:0;aspect-ratio:1 / 1;',
    );
  });

  it("keeps an ink tile square in a column under a pick button's 34px, and its icon inside its border", () => {
    // A 320px phone with the rail gives the six tiles about 28px each, where the 34px minimum height would
    // stretch them and the 28px icon would cover their borders.
    render(
      <>
        <AdminStyles />
        <button type="button" className="adm-pick-btn adm-ink-tile" aria-label="Amber" />
        <button type="button" className="adm-pick-btn">
          Rare
        </button>
      </>,
    );
    const [tile, rare] = screen.getAllByRole('button').map((button) => getComputedStyle(button).minHeight);
    expect({tile, rare}).toEqual({tile: '0px', rare: '34px'});
    // jsdom computes an img's height as auto whatever a rule says, so the icon's rule is pinned as written.
    expect(stylesheet()).toContain('.adm-ink-tile>img{max-width:100%;height:auto;}');
  });

  it('golds a checked switch and slides its knob to the far end', () => {
    const css = stylesheet();
    expect(css).toContain(`.adm-switch:checked{background-color:${ADMIN_COLORS.accent};}`);
    // The 34px track less the 20px of its height: the knob keeps its 2px inset at both ends.
    expect(css).toContain('.adm-switch:checked::before{transform:translateX(14px);}');
  });

  it('rings a file label while its hidden input has focus, or a file is dragged over it, 2px out as a control is ringed', () => {
    const css = stylesheet();
    expect(css).toContain(
      '.adm-file-btn[data-focused="true"],.adm-file-cover[data-focused="true"],' +
        '.adm-file-btn[data-dragging="true"],.adm-file-cover[data-dragging="true"]:where(:not(:has(input:disabled)))' +
        `{outline:2px solid ${ADMIN_COLORS.accent};outline-offset:2px;}`,
    );
    // A <label> never matches :focus-visible itself, so FOCUSABLE leaves both out.
    expect(css).not.toContain('.adm-file-btn:focus-visible');
    expect(css).not.toContain('.adm-file-cover:focus-visible');
  });

  it('holds a file cover whose input is disabled: dimmed as a disabled control, with neither its hover ring nor its drop ring', () => {
    const css = stylesheet();
    expect(css).toContain('.adm-file-cover:has(input:disabled){opacity:.4;cursor:not-allowed;}');
    expect(css).toContain(`.adm-file-cover:hover:where(:not(:has(input:disabled))){box-shadow:inset 0 0 0 1px ${ADMIN_COLORS.accentStrong};}`);
    render(
      <>
        <AdminStyles />
        <label className="adm-file-cover">
          Held
          <input type="file" disabled />
        </label>
        <label className="adm-file-cover">
          Live
          <input type="file" />
        </label>
      </>,
    );
    const look = (name: string) => {
      const {opacity, cursor} = getComputedStyle(screen.getByLabelText(name).closest('label')!);
      return {opacity, cursor};
    };
    expect(look('Held')).toEqual({opacity: '0.4', cursor: 'not-allowed'});
    expect(look('Live')).toEqual({opacity: '1', cursor: 'pointer'});
  });

  it("hides the cost slider's thumb while the cost is unset, in each engine's own rule", () => {
    const css = stylesheet();
    expect(css).toContain('.adm-range[data-unset="true"]::-webkit-slider-thumb{opacity:0;}');
    expect(css).toContain('.adm-range[data-unset="true"]::-moz-range-thumb{opacity:0;}');
    // An engine drops a whole selector list that names a pseudo-element it doesn't know.
    const vendored = [...css.matchAll(/([^{}]*::-(?:webkit|moz)-[^{]*)\{/g)].map(([, selector]) => selector.trim());
    expect(vendored).toHaveLength(8);
    for (const selector of vendored) expect(selector).not.toContain(',');
  });

  it("draws the cost slider's track in barNeutral, so a blank cost's slider, which has no thumb, still shows (1.4.11)", () => {
    const css = stylesheet();
    for (const track of ['::-webkit-slider-runnable-track', '::-moz-range-track']) {
      const rule = css.split(`.adm-range${track}{`)[1]?.split('}')[0];
      expect(rule, track).toContain(`background:${ADMIN_COLORS.barNeutral};`);
    }
  });

  it("moves a search row's marks under its name in a list too narrow for its widest tag beside them, and nothing wider (#74)", () => {
    const css = stylesheet();
    // The list is the container the rule measures, so a row answers to the list's width, not the screen's.
    expect(css).toContain('.adm-search-list{container-type:inline-size;}');
    const narrow = new RegExp(`@container \\(width < ${SEARCH_STACK_BELOW}px\\)\\{([\\s\\S]*?)\\n\\}`).exec(css);
    expect(narrow?.[1]).toBe(
      '\n.adm-search-names{grid-column:2 / 4;}\n.adm-search-marks{grid-row:2;grid-column:2 / 4;justify-self:start;}',
    );
    // Elsewhere the row's own inline grid lays it out, so a wider list looks as it always has.
    expect(css.replace(narrow?.[0] ?? '', '')).not.toMatch(/[.]adm-search-(names|marks)/);
  });

  it("runs Featured cards' slots three to a row, and two in a column narrower than three fit (#95)", () => {
    const css = stylesheet();
    // The slots' wrapper is the container the rule measures, so the grid answers to the page column, not the screen.
    expect(css).toContain('.adm-featured{container-type:inline-size;}');
    expect(css).toContain(`.adm-featured-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:${SPACING.lg}px;}`);
    const narrow = new RegExp(`@container \\(width < ${FEATURED_TWO_UP_BELOW}px\\)\\{([\\s\\S]*?)\\n\\}`).exec(css);
    expect(narrow?.[1]).toBe('\n.adm-featured-grid{grid-template-columns:repeat(2,minmax(0,1fr));}');
  });

  it("lays a slot search's row out as thumbnail, names and id, over the row button's block display (#95)", () => {
    // Two classes, so the rule outranks button.adm-row-btn's display:block.
    expect(stylesheet()).toContain(
      'button.adm-row-btn.adm-pick-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;',
    );
  });

  it('rings a focused scroll region 2px outside it, as a chart plot is ringed', () => {
    expect(stylesheet()).toContain(
      `.adm-scroll-region:focus-visible{outline:2px solid ${ADMIN_COLORS.accent};outline-offset:2px;}`,
    );
  });

  it("switches the studio controls' transitions off for reduced motion", () => {
    const reduced = /@media \(prefers-reduced-motion: reduce\)\{([\s\S]*?)\n\}/.exec(stylesheet())?.[1] ?? '';
    for (const name of ['adm-acc-head', 'adm-pick-btn', 'adm-switch', 'adm-file-btn', 'adm-file-cover']) {
      expect(reduced, name).toMatch(new RegExp(`[.]${name}(?![a-z-])[^{]*[{]transition:none;[}]`));
    }
    // The chevron and the knob turn and slide by transitions of their own.
    expect(reduced).toMatch(/[.]adm-acc-head::after[^{]*[{]transition:none;[}]/);
    expect(reduced).toMatch(/[.]adm-switch::before[^{]*[{]transition:none;[}]/);
  });
});
