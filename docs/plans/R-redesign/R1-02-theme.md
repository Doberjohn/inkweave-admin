> Part of [R: Admin redesign](../R-redesign.md). Read its decisions, corrections to the spec, global constraints and shared interfaces first.

**Contract additions:** this adds no new names and renames none. Eight clarifications follow so the other R1 tasks build against the same reading, and after them one note for assembly.
- **`border` and `divider` follow the handoff's token table** ("`#1f1f2c / #1a1a26` borders, dividers").
  - `border` (#1f1f2c) is used for panel and card edges, the header rule, the segmented track and day-separator rows.
  - `divider` (#1a1a26) is the rule between rows inside a panel.
  - The ladder runs faintest first: `divider` < `border` < `inputBorder` < `strongBorder`.
- **A `<button>` with an `adm-*` class takes no `style` prop** (`inkweave/no-adhoc-buttons`). The class is complete on its own. A row's or card's inner layout goes on a child `<span style={…}>`. So do a chart's bar heights and the selected bar's ring.
- **Selection comes only from ARIA state.** Nav items use `aria-current="page"`. Segments, rows, cards and bars use `aria-pressed="true"`. Bars next to a pressed bar dim to .4 opacity through `:has()`, with no extra markup.
- **Chart bars are direct children of one container** (a bar laid out in HTML; the chart kit's `BarChart` uses its own `adm-chart-hit`, R1-3b), with no wrapper per bar. Otherwise the `:has()` dim doesn't reach them.
- **Only the interactive classes (`FOCUSABLE` in the test) have `:focus-visible`.** The other three work differently:
  - `adm-nav-mark` follows its nav item.
  - `adm-seg` is the track around the buttons and has no `:hover` of its own.
  - `adm-hover-row` uses `:hover` and `:focus-within`.
- **A translucent fill with a border sets `backgroundClip: 'padding-box'`** (Panel, KpiCard, the token box). Otherwise its edge renders 3–5 per channel lighter than the ladder. It sets the fill as `backgroundColor`, because a `background` shorthand resets the clip, whether it sits in the same style or a later rule.
- **`.storybook/preview.tsx` mounts `<AdminStyles />` for every story** (this task). Stories for primitives and pages don't mount it themselves.
- **There are three deliberate departures from the spec's literal numbers.** Step 7 explains them inline:
  - Row focus rings sit inside the row (offset −2px), because rows sit flush in panels that clip overflow.
  - The nav item's padding is `0 8px` (`SPACING.sm`). 6 is off the spacing scale, and 8 also centres the 24px mark in the 40px inner width of the collapsed rail.
  - Segment buttons are 32px tall, so the whole control is 38px, the same height as the inputs next to it.
- **For assembly (not a contract change):** two lines in the skeleton need editing.
  - In Global constraints (line 59), "(the rules don't scan template strings; the plan holds the line anyway)" becomes "(the hex and rgba rules scan template strings; the font-size and radius rules don't, so the plan holds that line by test)".
  - In Shared interfaces, the comment "class names (all with :hover and :focus-visible)" becomes "class names (the interactive ones with :hover and :focus-visible)".

### Task R1-2: Admin theme module and AdminStyles

**Files:**
- Create: `src/theme/adminTheme.ts`
- Create: `src/theme/AdminStyles.tsx`
- Create: `src/theme/AdminTheme.stories.tsx`
- Test: `src/theme/__tests__/adminTheme.test.ts`
- Test: `src/theme/__tests__/AdminStyles.test.tsx`
- Modify: `.storybook/preview.tsx:1-14` (import `AdminStyles` and mount it in the global decorator)

**Interfaces:**
- Consumes: `COLORS`, `FONT_SIZES`, `RADIUS`, `SPACING`, `EASING`, `FONTS` and `hexRgba` from `src/app-bridge.ts`. The bridge already exports all of them, so it doesn't change.
- Produces:
  - `ADMIN_COLORS`, `ADMIN_TYPE`, `ADMIN_RADIUS` and `ADMIN_LAYOUT`, exactly as in the plan's shared interfaces.
  - `AdminStyles()`, a single `<style>` element. It defines `adm-nav-item`, `adm-nav-mark`, `adm-seg`, `adm-seg-btn`, `adm-row-btn`, `adm-card-btn`, `adm-bar-btn`, `adm-input`, `adm-select` and `adm-hover-row`.
  - Consumers: the `src/ui/` primitives, `Sidebar`, `PageLayout`, `BranchNotice` and the R1 pages. `AdminShell` mounts `AdminStyles` once.

**How each class is meant to be used** (the later tasks use this table as their reference):

| Class | Element | States | Design (all values are tokens) |
|---|---|---|---|
| `adm-nav-item` | react-router `NavLink` | `:hover`; `[aria-current="page"]` (NavLink sets it); `:focus-visible` | flex, gap 12 (`SPACING.md`), height 36, padding `0 8px`, radius `control` (6), `body` (13) / 500, `muted`. Hover: `navHover` fill, `text`. Active: `accentTint` fill, `text` / 600, a 2px gold inset bar on the left |
| `adm-nav-mark` | `<span aria-hidden>` inside a nav item | follows its nav item | 24×24, 1px `strongBorder`, radius `control`, `micro` (10) / 700, `muted`. On the active item: `accentStrong` border and `accent` text |
| `adm-seg` | `<div role="group" aria-label>` | none | inline-flex track: padding 2 and gap 2 (`SPACING.xxs`), `card` fill clipped to the padding box, 1px `border`, radius `control` |
| `adm-seg-btn` | `<button aria-pressed>` | `:hover`; `[aria-pressed="true"]`; `:focus-visible`; `:disabled` | min-height 32 (the track comes to 38, the input height), padding `0 12px`, radius `control`, `small` (12) / 600, `muted`. Hover: `navHover` fill, `text`. Selected: `navHover` fill, `accent` text and a 1px inset `accentStrong` ring (3.3:1 against the fill, so it passes WCAG 1.4.11) |
| `adm-row-btn` | `<button>` (block, full width, no padding), or a `<tr role="button" tabIndex={0}>` | `:hover`; `[aria-pressed="true"]`; `:focus-visible` (inset ring plus the hover fill); `:disabled` | Hover and focus: `rowHover`. Selected: `accentTintSoft` fill and a 2px gold inset bar on the left; `accentTint` when hovered. The grid and padding go on an inner `<span>` |
| `adm-card-btn` | `<button aria-pressed>` | `:hover`; `[aria-pressed="true"]`; `:focus-visible`; `:disabled` | flex column, gap 4, padding `16px 20px`, `card` fill clipped to the padding box, 1px `border`, radius `panel` (12), `body`. Hover: `accentBorder` edge. Selected: `accentTintSoft` fill and `accentStrong` edge (3.5:1 against the page) |
| `adm-bar-btn` | `<button aria-pressed aria-label>`, a direct child of the chart's flex row (a bar laid out in HTML; the chart kit's `BarChart` uses its own `adm-chart-hit`, R1-3b) | `:hover`; `[aria-pressed="true"]`; `:focus-visible`; `:disabled` | `flex:1`, a full-height column with bottom-aligned content, gap 4, `label` (11), `muted`. Hover: `rowHover`. Selected: `accentTintSoft` fill, `accent` text. The bars next to it dim to .4 |
| `adm-input` | `<input>` or `<textarea>` | `:hover`; `:focus-visible`; `:disabled` | height 38 (a textarea is auto, minimum 76), padding `0 12px`, `card` fill clipped to the padding box, 1px `inputBorder`, radius `control`, `body`, `text`; placeholder in `muted`. Hover: `strongBorder` |
| `adm-select` | `<select>` | as `adm-input` | as `adm-input`, padding `0 8px` |
| `adm-hover-row` | a non-interactive `<div>` or `<tr>` | `:hover` and `:focus-within` | `rowHover` fill |

- **Focus:** every interactive class shows a 2px solid `ADMIN_COLORS.accent` ring at offset 2px. Rows use −2px and also take the hover fill.
- **Motion:** transitions run `.2s EASING.snappy`, and `prefers-reduced-motion` switches them off.
- **Disabled:** a disabled control drops to .4 opacity with a `not-allowed` cursor and takes no hover styling. That is the same recipe as the app's `DISABLED_STYLE`.

- [ ] **Step 1: Write the failing theme test**

Create `src/theme/__tests__/adminTheme.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {COLORS, FONT_SIZES, RADIUS} from '../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../adminTheme';

type Rgb = [number, number, number];

const RGBA = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/;

function rgbOf(hex: string): Rgb {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

const PAGE = rgbOf(COLORS.background);

/** What `color` looks like painted over `base` (the page by default), rounded per channel. */
function over(color: string, base: Rgb = PAGE): Rgb {
  const m = RGBA.exec(color);
  if (!m) return rgbOf(color);
  const alpha = Number(m[4]);
  return base.map((b, i) => Math.round(b + alpha * (Number(m[i + 1]) - b))) as Rgb;
}

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio. */
function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// The handoff's neutral ladder (docs/redesign/handoff/README.md, Design tokens).
// barNeutral is left out: it sits above the handoff's value for WCAG 1.4.11,
// which the last ADMIN_COLORS test holds.
const HANDOFF: Record<string, string> = {
  aside: '#0e0e15',
  sidebar: '#101018',
  panel: '#101018',
  card: '#12121b',
  rowHover: '#14141e',
  navHover: '#1b1b28',
  divider: '#1a1a26',
  border: '#1f1f2c',
  inputBorder: '#262636',
  strongBorder: '#333348',
  barTrack: '#2a2a3c',
};

describe('ADMIN_COLORS', () => {
  it('builds every colour from a bridged token', () => {
    const tokens = new Set<string>(Object.values(COLORS));
    for (const [key, value] of Object.entries(ADMIN_COLORS)) {
      expect(tokens.has(value) || RGBA.test(value), `${key}: ${value}`).toBe(true);
    }
  });

  it('lands the neutral ladder within 3 per channel of the handoff palette', () => {
    for (const [key, hex] of Object.entries(HANDOFF)) {
      const got = over(ADMIN_COLORS[key as keyof typeof ADMIN_COLORS]);
      const want = rgbOf(hex);
      const drift = Math.max(...got.map((v, i) => Math.abs(v - want[i])));
      expect(drift, `${key} lands at rgb(${got.join(', ')}), handoff ${hex}`).toBeLessThanOrEqual(3);
    }
  });

  it('keeps text and muted text at 4.5:1 or more on every fill, stacked and selected ones too (R-6)', () => {
    const sidebar = over(ADMIN_COLORS.sidebar);
    const card = over(ADMIN_COLORS.card);
    const fills: Record<string, Rgb> = {
      page: PAGE,
      aside: over(ADMIN_COLORS.aside),
      sidebar,
      card,
      rowHover: over(ADMIN_COLORS.rowHover),
      navHover: over(ADMIN_COLORS.navHover),
      'card on a panel': over(ADMIN_COLORS.card, over(ADMIN_COLORS.panel)),
      'active nav item': over(ADMIN_COLORS.accentTint, sidebar),
      'selected row, hovered': over(ADMIN_COLORS.accentTint, card),
      'selected card': over(ADMIN_COLORS.accentTintSoft),
    };
    for (const [name, fill] of Object.entries(fills)) {
      expect(contrast(rgbOf(ADMIN_COLORS.text), fill), `text on ${name}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(rgbOf(ADMIN_COLORS.muted), fill), `muted on ${name}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('draws selection borders and chart marks at 3:1 or more (WCAG 1.4.11)', () => {
    const card = over(ADMIN_COLORS.card);
    const segmentFill = over(ADMIN_COLORS.navHover, card);
    expect(contrast(over(ADMIN_COLORS.accentStrong, segmentFill), segmentFill)).toBeGreaterThanOrEqual(3);
    expect(contrast(over(ADMIN_COLORS.accentStrong), PAGE)).toBeGreaterThanOrEqual(3);
    // The Votes per day bands (BAND_FILL in src/tools/analytics/activity/VotesPerDayChart.tsx)
    // sit in a Panel, whose fill is the card over the page. The No score hatch
    // draws muted stripes, with the card showing between them.
    const chartMarks: Record<string, string> = {
      '7+ (under)': ADMIN_COLORS.under,
      '5–6 (barNeutral)': ADMIN_COLORS.barNeutral,
      '≤4 (over)': ADMIN_COLORS.over,
      'No score stripes (muted)': ADMIN_COLORS.muted,
    };
    for (const [band, fill] of Object.entries(chartMarks)) {
      expect(contrast(over(fill, card), card), `${band} on a card`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('ADMIN_TYPE and ADMIN_RADIUS', () => {
  it('only use steps of the app scales (R-5)', () => {
    const sizes = new Set<number>(Object.values(FONT_SIZES));
    for (const [key, size] of Object.entries(ADMIN_TYPE)) expect(sizes.has(size), `ADMIN_TYPE.${key}`).toBe(true);
    const radii = new Set<number>(Object.values(RADIUS));
    for (const [key, radius] of Object.entries(ADMIN_RADIUS)) expect(radii.has(radius), `ADMIN_RADIUS.${key}`).toBe(true);
  });

  it('keep the handoff ordering: page titles above section titles, the hero above both', () => {
    expect(ADMIN_TYPE.sectionTitle).toBeLessThan(ADMIN_TYPE.pageTitle);
    expect(ADMIN_TYPE.pageTitle).toBeLessThan(ADMIN_TYPE.hero);
    expect(ADMIN_RADIUS.control).toBeLessThan(ADMIN_RADIUS.panel);
  });
});
```

The hexes in this file are fine, because the app's colour rules exempt `*.test.ts(x)`.

The 1.4.11 case also holds every fill the Votes per day chart draws (R1-9): 7+ in `under`, 5–6 in `barNeutral`, ≤4 in `over`, and the "No score" hatch in `muted` stripes. Each is measured against the Panel's fill, `card` composited over the page. They land at 10.7:1, 3.3:1, 4.95:1 and 7.1:1. A chart that adds a fill adds a line to `chartMarks`.

- [ ] **Step 2: Run the test and see it fail**

Run: `pnpm vitest run src/theme/__tests__/adminTheme.test.ts`
Expected: FAIL, with `Failed to resolve import "../adminTheme" from "src/theme/__tests__/adminTheme.test.ts". Does the file exist?` and `Test Files 1 failed (1)`. On a fresh clone, run `pnpm build:engine` first.

- [ ] **Step 3: Write the theme module**

Create `src/theme/adminTheme.ts`:

```ts
import {COLORS, FONT_SIZES, RADIUS, hexRgba} from '../app-bridge';

// Admin's theme (docs/plans/R-redesign.md, decisions R-1, R-5 and R-6). Text,
// accent and semantic colours are the app's own tokens. The darker neutral
// ladder of the redesign (surfaces, lines, hovers, bars) has no app token, so
// it is mixed here from one: COLORS.gray400 at a small alpha over the page.
// Every value goes through the bridge, so admin passes the app's design-token
// rules with no exception and no app change.
//
// Why gray400 and not whiteRgba: white over COLORS.background drifts towards
// warm grey (the handoff's #333348 lands at #37373d), while the app's
// blue-grey keeps the handoff's cool cast. Composite per channel, over the page
// (13, 13, 20) with gray400 = (136, 136, 170):
//   R = G = 13 + 123a      B = 20 + 150a
//
//   key            alpha   R,G     B      lands at   handoff
//   aside          .005    13.6   20.8    #0e0e15    #0e0e15
//   sidebar/panel  .025    16.1   23.8    #101018    #101018
//   card           .04     17.9   26.0    #12121a    #12121b
//   rowHover       .06     20.4   29.0    #14141d    #14141e
//   divider        .11     26.5   36.5    #1b1b25    #1a1a26
//   navHover       .125    28.4   38.8    #1c1c27    #1b1b28
//   border         .15     31.4   42.5    #1f1f2b    #1f1f2c
//   inputBorder    .21     38.8   51.5    #272734    #262636
//   barTrack       .25     43.8   57.5    #2c2c3a    #2a2a3c
//   strongBorder   .325    53.0   68.8    #353545    #333348
//   barNeutral     .7      99.1  125.0    #63637d    #4a4a60 (raised for 1.4.11)
//
// Every channel but barNeutral's lands within 3 of the handoff
// (adminTheme.test.ts holds it there). The page itself is COLORS.background
// (#0d0d14, the handoff drew #0b0b11), so the aside reads nearly flat against
// it; its border carries the separation.
//
// The fills are translucent, so they stack: a card inside a panel lands at
// #15151e, one step lighter, which is the app's "elevation is lightness" rule.
// A fill also shows through its own border, so anything with both clips the
// fill to the padding box (background-clip: padding-box), or its edge lands
// 3 to 5 per channel lighter than the ladder. Anything that must hide what is
// under it (a popover, a sticky table head) layers its fill over the page:
//   background: `linear-gradient(${fill}, ${fill}), ${ADMIN_COLORS.page}`
//
// Contrast (WCAG 1.4.3) on every fill above, stacked, hovered and selected
// ones included: text 12.6:1 or more, muted 5.9:1 or more, dim 2.8 to 3.5:1.
// So data text uses `muted`; `dim` is for decoration only (R-6). Selection
// cues reach 3:1 (1.4.11): accentStrong is 3.3:1 against the segmented fill
// and 3.5:1 against the page. barNeutral sits above the handoff's #4a4a60
// (2.3:1) at 3.3:1 on a card, so the 5–6 band passes 1.4.11 without printed
// per-band counts.

/** COLORS.gray400 at `alpha`: one step of the neutral ladder. */
const ladder = (alpha: number) => hexRgba(COLORS.gray400, alpha);

export const ADMIN_COLORS = {
  // Surfaces
  page: COLORS.background,
  sidebar: ladder(0.025),
  panel: ladder(0.025),
  card: ladder(0.04),
  aside: ladder(0.005),
  rowHover: ladder(0.06),
  navHover: ladder(0.125),
  // Lines, faintest first: row rules inside a panel, panel and card edges,
  // input edges, then emphasised edges (nav marks, outline buttons, dashed notices).
  divider: ladder(0.11),
  border: ladder(0.15),
  inputBorder: ladder(0.21),
  strongBorder: ladder(0.325),
  // Chart marks
  barTrack: ladder(0.25),
  barNeutral: ladder(0.7),
  // Text (R-6: data text is never `dim`)
  text: COLORS.text,
  muted: COLORS.textMuted,
  dim: COLORS.textDim,
  // Accent: the one gold (COLORS.primary) and its tints
  accent: COLORS.primary,
  accentHover: COLORS.primaryHover,
  accentTint: hexRgba(COLORS.primary, 0.1),
  accentTintSoft: hexRgba(COLORS.primary, 0.06),
  accentBorder: hexRgba(COLORS.primary, 0.3),
  accentStrong: hexRgba(COLORS.primary, 0.5),
  // Semantic: the engine over-rates (red) or under-rates (green) a pair
  over: COLORS.error,
  under: COLORS.success,
  errorBg: COLORS.errorBg,
  errorBorder: COLORS.errorBorder,
} as const;

/**
 * The handoff's type sizes on the app's FONT_SIZES scale (R-5). Tinos sizes
 * (sectionTitle and up) take FONTS.hero; everything else is the body face.
 */
export const ADMIN_TYPE = {
  micro: FONT_SIZES.xs, // 10: group labels, tags, axis labels
  label: FONT_SIZES.sm, // 11: hints, table heads
  small: FONT_SIZES.md, // 12: secondary text, pills
  body: FONT_SIZES.base, // 13: body, nav items
  emphasis: FONT_SIZES.lg, // 14 (handoff 14–15): emphasised body
  brand: FONT_SIZES.xl, // 16 (handoff 16–17): the brand word
  sectionTitle: FONT_SIZES.xxxl, // 22 (handoff 22–24): section headlines
  pageTitle: FONT_SIZES.displaySm, // 28 (handoff 26 and 34): page titles
  kpi: FONT_SIZES.displaySm, // 28 (handoff 30): KPI values
  hero: FONT_SIZES.displayMd, // 38 (handoff 48): the hero number
} as const;

/** The handoff's radii on the app's RADIUS scale (R-5). */
export const ADMIN_RADIUS = {
  tag: RADIUS.xs, // 2 (handoff 3): tags
  control: RADIUS.md, // 6 (handoff 5–7): controls, nav items, marks
  box: RADIUS.lg, // 8: small panels, the token box
  panel: RADIUS.card, // 12 (handoff 10): cards and panels
  preview: RADIUS.xl, // 14 (handoff 12–16): the card preview
  pill: RADIUS.pill, // 999: pills
} as const;

/** Shell dimensions in px, from the handoff's shell spec. */
export const ADMIN_LAYOUT = {
  sidebarOpen: 240,
  sidebarCollapsed: 64,
  headerMinHeight: 64,
} as const;
```

- [ ] **Step 4: Run the test and see it pass**

Run: `pnpm vitest run src/theme/__tests__/adminTheme.test.ts`
Expected: PASS, `Tests 6 passed (6)`.

- [ ] **Step 5: Write the failing stylesheet test**

Create `src/theme/__tests__/AdminStyles.test.tsx`:

```tsx
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
```

The two "token only" tests enforce the global constraint inside the template string. ESLint already catches a raw hex or `rgba(` there, because the app's string-scan rules read template quasis. It can't see a raw font size or radius in a template, though.

The last two tests check what the stylesheet does, not just its text. jsdom 30 computes both the `:has()` dim and `background-clip`. A `background` shorthand in a state rule resets the clip, in a browser and in jsdom alike, so the clip test fails if one slips in.

- [ ] **Step 6: Run the test and see it fail**

Run: `pnpm vitest run src/theme/__tests__/AdminStyles.test.tsx`
Expected: FAIL with `Failed to resolve import "../AdminStyles" from "src/theme/__tests__/AdminStyles.test.tsx". Does the file exist?`

- [ ] **Step 7: Write AdminStyles**

Create `src/theme/AdminStyles.tsx`:

```tsx
import {EASING, SPACING} from '../app-bridge';
import {ADMIN_COLORS as C, ADMIN_RADIUS as R, ADMIN_TYPE as T} from './adminTheme';

// Control heights from the handoff. Heights have no token in the app's scales,
// so they live here, beside the only rules that use them.
const NAV_ITEM_HEIGHT = 36;
const NAV_MARK_SIZE = 24;
const INPUT_HEIGHT = 38;
// 32 + the track's 2px padding and 1px border on each side = INPUT_HEIGHT, so a
// segmented control lines up with the inputs beside it in a filter row.
const SEG_BUTTON_HEIGHT = 32;

const FAST = `.2s ${EASING.snappy}`;
const FOCUS_RING = `outline:2px solid ${C.accent};`;
// Hover rules skip disabled controls. :where() adds no specificity, so the
// [aria-pressed] rules after them still win.
const ENABLED = ':where(:not(:disabled))';

/**
 * Admin's one scoped stylesheet: every adm-* class the shell, the primitives
 * and the pages share. Inline styles stay the default (the app's house style);
 * these classes exist for what inline styles can't express: :hover,
 * :focus-visible and state selectors. Selection is read from ARIA state
 * (aria-current="page", aria-pressed="true"), never from a class, so the
 * styling and what assistive tech hears can't disagree.
 *
 * The focus ring is the one gold (ADMIN_COLORS.accent), replacing the app's
 * global legacy-gold ring. Rows draw theirs inside the box (offset -2px): they
 * sit flush in panels that clip overflow, where an outer ring would lose its
 * sides. A focused row also takes the hover fill, as RuleRow does today.
 *
 * <button> takes no style prop here (inkweave/no-adhoc-buttons), so the button
 * classes are complete on their own. Lay out a row's or a card's content with
 * an inner <span style={...}>.
 *
 * A translucent fill shows through its own border, so the classes that have
 * both (adm-seg, adm-card-btn, adm-input, adm-select) clip the fill to the
 * padding box. They set background-color, never the background shorthand,
 * which would reset the clip.
 *
 * Nav items pad 8px, not the handoff's 6 (off the spacing scale): in the 64px
 * rail, 12px gutters leave 40px, and 8 + 24 + 8 centres the mark exactly.
 */
const CSS = `
.adm-nav-item{display:flex;align-items:center;gap:${SPACING.md}px;height:${NAV_ITEM_HEIGHT}px;padding:0 ${SPACING.sm}px;border-radius:${R.control}px;color:${C.muted};font-size:${T.body}px;font-weight:500;text-decoration:none;white-space:nowrap;overflow:hidden;transition:background-color ${FAST},color ${FAST};}
.adm-nav-item:hover{background:${C.navHover};color:${C.text};}
.adm-nav-item[aria-current="page"]{background:${C.accentTint};color:${C.text};font-weight:600;box-shadow:inset 2px 0 0 ${C.accent};}
.adm-nav-mark{display:inline-flex;align-items:center;justify-content:center;flex:none;width:${NAV_MARK_SIZE}px;height:${NAV_MARK_SIZE}px;border:1px solid ${C.strongBorder};border-radius:${R.control}px;color:${C.muted};font-size:${T.micro}px;font-weight:700;transition:border-color ${FAST},color ${FAST};}
.adm-nav-item:hover .adm-nav-mark{color:${C.text};}
.adm-nav-item[aria-current="page"] .adm-nav-mark{border-color:${C.accentStrong};color:${C.accent};}

.adm-seg{display:inline-flex;align-items:stretch;gap:${SPACING.xxs}px;padding:${SPACING.xxs}px;background-color:${C.card};background-clip:padding-box;border:1px solid ${C.border};border-radius:${R.control}px;}
.adm-seg-btn{display:inline-flex;align-items:center;justify-content:center;min-height:${SEG_BUTTON_HEIGHT}px;margin:0;padding:0 ${SPACING.md}px;border:none;border-radius:${R.control}px;background:transparent;color:${C.muted};font-family:inherit;font-size:${T.small}px;font-weight:600;white-space:nowrap;cursor:pointer;transition:background-color ${FAST},color ${FAST};}
.adm-seg-btn:hover${ENABLED}{background:${C.navHover};color:${C.text};}
.adm-seg-btn[aria-pressed="true"]{background:${C.navHover};color:${C.accent};box-shadow:inset 0 0 0 1px ${C.accentStrong};}

.adm-row-btn{background:transparent;color:${C.text};cursor:pointer;transition:background-color ${FAST};}
button.adm-row-btn{display:block;width:100%;margin:0;padding:0;border:none;border-radius:0;font:inherit;text-align:left;}
.adm-row-btn:hover${ENABLED}{background:${C.rowHover};}
.adm-row-btn:focus-visible{background:${C.rowHover};}
.adm-row-btn[aria-pressed="true"]{background:${C.accentTintSoft};box-shadow:inset 2px 0 0 ${C.accent};}
.adm-row-btn[aria-pressed="true"]:hover${ENABLED}{background:${C.accentTint};}

.adm-card-btn{display:flex;flex-direction:column;align-items:stretch;gap:${SPACING.xs}px;width:100%;min-width:0;margin:0;padding:${SPACING.lg}px ${SPACING.xl}px;background-color:${C.card};background-clip:padding-box;border:1px solid ${C.border};border-radius:${R.panel}px;color:${C.text};font:inherit;font-size:${T.body}px;text-align:left;cursor:pointer;transition:background-color ${FAST},border-color ${FAST};}
.adm-card-btn:hover${ENABLED}{border-color:${C.accentBorder};}
.adm-card-btn[aria-pressed="true"]{background-color:${C.accentTintSoft};border-color:${C.accentStrong};}

.adm-bar-btn{flex:1 1 0;min-width:0;align-self:stretch;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:${SPACING.xs}px;margin:0;padding:${SPACING.xs}px 0 0;border:none;border-radius:${R.control}px;background:transparent;color:${C.muted};font:inherit;font-size:${T.label}px;cursor:pointer;transition:background-color ${FAST},opacity ${FAST};}
.adm-bar-btn:hover${ENABLED}{background:${C.rowHover};}
.adm-bar-btn[aria-pressed="true"]{background:${C.accentTintSoft};color:${C.accent};}
:has(> .adm-bar-btn[aria-pressed="true"]) > .adm-bar-btn:not([aria-pressed="true"]){opacity:.4;}

.adm-input,.adm-select{box-sizing:border-box;height:${INPUT_HEIGHT}px;margin:0;padding:0 ${SPACING.md}px;background-color:${C.card};background-clip:padding-box;border:1px solid ${C.inputBorder};border-radius:${R.control}px;color:${C.text};font-family:inherit;font-size:${T.body}px;transition:border-color ${FAST};}
textarea.adm-input{height:auto;min-height:${INPUT_HEIGHT * 2}px;padding:${SPACING.sm}px ${SPACING.md}px;line-height:1.5;resize:vertical;}
.adm-select{padding:0 ${SPACING.sm}px;cursor:pointer;}
.adm-input::placeholder{color:${C.muted};opacity:1;}
.adm-input:hover${ENABLED},.adm-select:hover${ENABLED}{border-color:${C.strongBorder};}

.adm-hover-row{transition:background-color ${FAST};}
.adm-hover-row:hover,.adm-hover-row:focus-within{background:${C.rowHover};}

.adm-nav-item:focus-visible,.adm-seg-btn:focus-visible,.adm-card-btn:focus-visible,.adm-bar-btn:focus-visible,.adm-input:focus-visible,.adm-select:focus-visible{${FOCUS_RING}outline-offset:2px;}
.adm-row-btn:focus-visible{${FOCUS_RING}outline-offset:-2px;}

.adm-seg-btn:disabled,.adm-row-btn:disabled,.adm-card-btn:disabled,.adm-bar-btn:disabled,.adm-input:disabled,.adm-select:disabled{opacity:.4;cursor:not-allowed;}

@media (prefers-reduced-motion: reduce){
.adm-nav-item,.adm-nav-mark,.adm-seg-btn,.adm-row-btn,.adm-card-btn,.adm-bar-btn,.adm-input,.adm-select,.adm-hover-row{transition:none;}
}
`;

/** Mounted once, by AdminShell (and by Storybook's preview for every story). */
export function AdminStyles() {
  return <style>{CSS}</style>;
}
```

The design depends on these decisions about rule order and properties. Keep them if you edit the file:
- **Selected states override hover by source order.** Each `[aria-pressed="true"]` and `[aria-current="page"]` rule comes after the `:hover` rule it overrides. Both have specificity 0,2,0, so source order decides, and a selected item keeps its selected look while hovered. The `:where(:not(:disabled))` on each hover rule adds no specificity, so it doesn't change this.
- **The row focus fill comes before the selected rules.** `.adm-row-btn:focus-visible{background:…}` sits above the `[aria-pressed="true"]` rules, so a focused selected row keeps its tint. The row's ring is a separate rule near the end.
- **Bordered fills use `background-color`, never `background`.** `adm-seg`, `adm-card-btn` and `adm-input`/`adm-select` set `background-color`, and so does the selected card's state rule. The shorthand resets `background-clip` to `border-box`, which brings back the lighter edges. The clip test catches it.
- **The sibling dim on bars uses `:has()`, so the page needs no extra class.** Bars must be direct children of one row. jsdom 30 (Vitest) computes it, and the dim test checks it.
- **Dropdown options stay opaque.** The app's `index.css` already sets `option { background: #1e1e35 }`, so `adm-select` dropdowns stay opaque even though the select's fill is translucent.

- [ ] **Step 8: Run both theme tests and see them pass**

Run: `pnpm vitest run src/theme`
Expected: PASS, `Test Files 2 passed (2)` and `Tests 13 passed (13)`.

- [ ] **Step 9: Mount AdminStyles in Storybook's preview**

In `.storybook/preview.tsx`, replace lines 1–14:

```tsx
import type {Preview} from '@storybook/react-vite';
import {themes} from 'storybook/theming';
// The bridge also loads the app's global stylesheet (fonts, .card-tile) and the skeleton styles.
import {COLORS} from '../src/app-bridge';

// The same dark canvas as the app's Storybook.
const preview: Preview = {
  decorators: [
    (Story) => (
      <div style={{background: COLORS.background, minHeight: '100vh'}}>
        <Story />
      </div>
    ),
  ],
```

with:

```tsx
import type {Preview} from '@storybook/react-vite';
import {themes} from 'storybook/theming';
// The bridge also loads the app's global stylesheet (fonts, .card-tile) and the skeleton styles.
import {COLORS} from '../src/app-bridge';
import {AdminStyles} from '../src/theme/AdminStyles';

// The same dark canvas as the app's Storybook.
const preview: Preview = {
  decorators: [
    (Story) => (
      <div style={{background: COLORS.background, minHeight: '100vh'}}>
        {/* Admin's adm-* classes, which AdminShell mounts on the site, so every story can use them. */}
        <AdminStyles />
        <Story />
      </div>
    ),
  ],
```

Leave the rest of the file (`parameters`, `initialGlobals`, the export) as it is.

- [ ] **Step 10: Write the theme stories**

Create `src/theme/AdminTheme.stories.tsx`. `.storybook/main.ts` picks it up through `../src/**/*.stories.@(ts|tsx)`.

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {MemoryRouter, NavLink} from 'react-router-dom';
import {FONTS, SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_LAYOUT, ADMIN_RADIUS, ADMIN_TYPE} from './adminTheme';

type ColorKey = keyof typeof ADMIN_COLORS;

const GROUPS: ReadonlyArray<{title: string; keys: readonly ColorKey[]}> = [
  {title: 'Surfaces', keys: ['page', 'aside', 'sidebar', 'panel', 'card', 'rowHover', 'navHover']},
  {title: 'Lines', keys: ['divider', 'border', 'inputBorder', 'strongBorder']},
  {title: 'Chart marks', keys: ['barTrack', 'barNeutral']},
  {title: 'Text', keys: ['text', 'muted', 'dim']},
  {title: 'Accent', keys: ['accent', 'accentHover', 'accentTint', 'accentTintSoft', 'accentBorder', 'accentStrong']},
  {title: 'Semantic', keys: ['over', 'under', 'errorBg', 'errorBorder']},
];

const SECTION_TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: FONTS.hero,
  fontWeight: 400,
  fontSize: ADMIN_TYPE.sectionTitle,
};

const FIELD: React.CSSProperties = {
  display: 'grid',
  gap: SPACING.xs,
  fontSize: ADMIN_TYPE.small,
  color: ADMIN_COLORS.muted,
};

/** A translucent fill inside a border: clipped to the padding box, so the border stays on the ladder. */
function bordered(fill: string, border: string = ADMIN_COLORS.border): React.CSSProperties {
  return {backgroundColor: fill, backgroundClip: 'padding-box', border: `1px solid ${border}`};
}

function Swatch({name}: {name: ColorKey}) {
  const value = ADMIN_COLORS[name];
  return (
    <figure style={{margin: 0, display: 'grid', gap: SPACING.xs, minWidth: 0}}>
      <div style={{height: 56, ...bordered(value), borderRadius: ADMIN_RADIUS.box}} />
      <figcaption style={{fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.text}}>
        {name}
        <code style={{display: 'block', fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted}}>{value}</code>
      </figcaption>
    </figure>
  );
}

const meta: Meta = {
  title: 'Admin/Theme',
  // The sample nav items are router links, so the stories need a router.
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>
        <div style={{display: 'grid', gap: SPACING.xxl, padding: SPACING.xxxl, color: ADMIN_COLORS.text}}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};
export default meta;
type Story = StoryObj;

/** Every ADMIN_COLORS value over the page, as it renders. Fills are translucent: see the stacked sample. */
export const Palette: Story = {
  render: () => (
    <>
      {GROUPS.map((group) => (
        <section key={group.title} style={{display: 'grid', gap: SPACING.md}}>
          <h2 style={SECTION_TITLE}>{group.title}</h2>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: SPACING.lg}}>
            {group.keys.map((key) => (
              <Swatch key={key} name={key} />
            ))}
          </div>
        </section>
      ))}
      <section style={{display: 'grid', gap: SPACING.md}}>
        <h2 style={SECTION_TITLE}>Fills stack</h2>
        <div
          style={{
            maxWidth: 360,
            padding: SPACING.lg,
            ...bordered(ADMIN_COLORS.panel),
            borderRadius: ADMIN_RADIUS.panel,
          }}>
          <div style={{fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted, marginBottom: SPACING.sm}}>panel</div>
          <div
            style={{
              padding: SPACING.lg,
              ...bordered(ADMIN_COLORS.card),
              borderRadius: ADMIN_RADIUS.box,
              fontSize: ADMIN_TYPE.small,
              color: ADMIN_COLORS.muted,
            }}>
            card inside the panel: one step lighter
          </div>
        </div>
      </section>
    </>
  ),
};

/** ADMIN_TYPE: body sizes in the body face, titles and numbers in Tinos. */
export const Type: Story = {
  render: () => (
    <div style={{display: 'grid', gap: SPACING.md}}>
      {Object.entries(ADMIN_TYPE).map(([name, size]) => {
        const tinos = size >= ADMIN_TYPE.sectionTitle;
        return (
          <div key={name} style={{display: 'flex', alignItems: 'baseline', gap: SPACING.lg}}>
            <code style={{width: 120, fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted}}>
              {name} · {size}
            </code>
            <span style={{fontSize: size, fontFamily: tinos ? FONTS.hero : FONTS.body}}>Engine calibration 2,054</span>
          </div>
        );
      })}
    </div>
  ),
};

/** ADMIN_RADIUS on a card fill. */
export const Radius: Story = {
  render: () => (
    <div style={{display: 'flex', flexWrap: 'wrap', gap: SPACING.lg}}>
      {Object.entries(ADMIN_RADIUS).map(([name, radius]) => (
        <div
          key={name}
          style={{
            width: 120,
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...bordered(ADMIN_COLORS.card, ADMIN_COLORS.strongBorder),
            borderRadius: radius,
            fontSize: ADMIN_TYPE.small,
            color: ADMIN_COLORS.muted,
          }}>
          {name} · {radius}
        </div>
      ))}
    </div>
  ),
};

const BANDS = ['All', '7+', '5–6', '≤4'] as const;
const DAYS = [
  {day: 'Sep 28', votes: 12},
  {day: 'Sep 29', votes: 30},
  {day: 'Sep 30', votes: 21},
  {day: 'Oct 1', votes: 8},
];

/** Every adm-* class in its states. Tab through it to see the focus rings. */
function ControlsDemo() {
  const [band, setBand] = useState<(typeof BANDS)[number]>('All');
  const [row, setRow] = useState<string | null>('Ramp');
  const [card, setCard] = useState('Searches');
  const [day, setDay] = useState<string | null>(null);
  const most = Math.max(...DAYS.map((d) => d.votes));
  return (
    <>
      <nav
        aria-label="Sample navigation"
        style={{
          width: ADMIN_LAYOUT.sidebarOpen,
          display: 'grid',
          gap: SPACING.xxs,
          padding: SPACING.md,
          background: ADMIN_COLORS.sidebar,
        }}>
        <NavLink to="/" end className="adm-nav-item">
          <span className="adm-nav-mark" aria-hidden="true">
            Ov
          </span>
          Overview
        </NavLink>
        <NavLink to="/activity" className="adm-nav-item">
          <span className="adm-nav-mark" aria-hidden="true">
            Va
          </span>
          Vote activity
        </NavLink>
      </nav>

      <div role="group" aria-label="Score band" className="adm-seg" style={{justifySelf: 'start'}}>
        {BANDS.map((b) => (
          <button key={b} type="button" className="adm-seg-btn" aria-pressed={band === b} onClick={() => setBand(b)}>
            {b}
          </button>
        ))}
      </div>

      <div style={{maxWidth: 420, overflow: 'hidden', ...bordered(ADMIN_COLORS.card), borderRadius: ADMIN_RADIUS.panel}}>
        {['Ramp', 'Singer', 'Location shift'].map((name) => (
          <button
            key={name}
            type="button"
            className="adm-row-btn"
            aria-pressed={row === name}
            onClick={() => setRow(row === name ? null : name)}>
            <span
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: SPACING.md,
                padding: `${SPACING.md}px ${SPACING.lg}px`,
                borderTop: `1px solid ${ADMIN_COLORS.divider}`,
                fontSize: ADMIN_TYPE.body,
              }}>
              <span>{name}</span>
              <span style={{color: ADMIN_COLORS.muted}}>−0.30</span>
            </span>
          </button>
        ))}
        <div
          className="adm-hover-row"
          style={{padding: `${SPACING.md}px ${SPACING.lg}px`, borderTop: `1px solid ${ADMIN_COLORS.divider}`}}>
          A row that only hovers
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: SPACING.md}}>
        {['Searches', 'Votes submitted'].map((name) => (
          <button key={name} type="button" className="adm-card-btn" aria-pressed={card === name} onClick={() => setCard(name)}>
            <span style={{color: ADMIN_COLORS.muted}}>{name}</span>
            <span style={{fontFamily: FONTS.hero, fontSize: ADMIN_TYPE.kpi}}>8,540</span>
          </button>
        ))}
      </div>

      {/* The bars are direct children of this row: the :has() dim only reaches siblings. */}
      <div style={{display: 'flex', gap: SPACING.lg, height: 160, maxWidth: 420}}>
        {DAYS.map((d) => (
          <button
            key={d.day}
            type="button"
            className="adm-bar-btn"
            aria-pressed={day === d.day}
            aria-label={`${d.day}: ${d.votes} votes`}
            onClick={() => setDay(day === d.day ? null : d.day)}>
            <span style={{color: ADMIN_COLORS.text}}>{d.votes}</span>
            <span
              style={{
                width: '100%',
                height: (d.votes / most) * 100,
                background: ADMIN_COLORS.barNeutral,
                borderRadius: ADMIN_RADIUS.tag,
              }}
            />
            <span>{d.day}</span>
          </button>
        ))}
      </div>

      <div style={{display: 'flex', flexWrap: 'wrap', gap: SPACING.md, alignItems: 'end'}}>
        <label style={FIELD}>
          Search pairs
          <input className="adm-input" placeholder="Maui" />
        </label>
        <label style={FIELD}>
          Voter
          <select className="adm-select" defaultValue="">
            <option value="">All voters</option>
            <option value="4">Voter 4</option>
          </select>
        </label>
        <label style={FIELD}>
          Tagline
          <textarea className="adm-input" />
        </label>
        <label style={FIELD}>
          Disabled
          <input className="adm-input" placeholder="No hover" disabled />
        </label>
      </div>
    </>
  );
}

export const Controls: Story = {render: () => <ControlsDemo />};
```

- [ ] **Step 11: Check the stories by eye**

Run `pnpm storybook`, open http://localhost:6007 and go to **Admin/Theme**.
- **Palette:** every Surfaces, Lines and Chart marks swatch is a slightly cool neutral with no blue cast. All of them are dark apart from the lighter `barNeutral`. Each swatch's border is the same grey whatever the fill.
- **Type and Radius:** the type sizes rise in order, and so do the radii.
- **Controls:** tab through the story and check each control:
  - Every focused control shows a 2px gold ring.
  - The rings on the rows sit inside the rows, and the panel doesn't clip them. A focused row also takes the hover fill, and the selected row keeps its gold tint when focused.
  - The selected segment shows gold text and a gold ring.
  - Clicking a bar dims the other bars, and clicking it again restores them.
  - The `Overview` nav item has the gold inset bar.
  - The disabled input sits at .4 opacity, and hovering it changes nothing.

Stop Storybook (Ctrl+C) before committing, because a running server starves the pre-commit Vitest workers.

- [ ] **Step 12: Lint, typecheck and run the suite**

Run: `pnpm lint`
Expected: no problems. The new files pass every `inkweave/*` rule and the jsx-a11y rules, with no exception added.

Run: `pnpm typecheck`
Expected: exits 0 with no errors.

Run: `pnpm test:run`
Expected: every test file passes, the two new ones included.

- [ ] **Step 13: Commit**

Run this with the Bash tool, and only after the owner approves:

```bash
git add src/theme/adminTheme.ts src/theme/AdminStyles.tsx src/theme/AdminTheme.stories.tsx src/theme/__tests__/adminTheme.test.ts src/theme/__tests__/AdminStyles.test.tsx .storybook/preview.tsx
USER_APPROVED=1 git commit -m "feat(theme): add the admin palette, scales and AdminStyles (#24)"
```

<!-- applied with changes, none rejected:
- Note 2: the clipped rules (.adm-seg, .adm-card-btn, .adm-input/.adm-select) and the selected card's state rule now use background-color, not the background shorthand. A later shorthand resets background-clip to border-box, and jsdom 30 also drops a background-clip that follows the shorthand in the same rule. A jsdom test now checks the clip, so Step 8 expects 13 tests, not 12. The stories clip their bordered fills too (the bordered() helper).
- Note 3: the selector :where(:not(:disabled)) is interpolated from an ENABLED constant. The CSS it outputs is the same as the review's text.
- Note 9: the ADMIN_TYPE comments had the same problem, so they use the same "result (handoff …)" form.
- Note 11: the skeleton isn't part of this section, so the fix is an assembly item in the note at the top.
-->
