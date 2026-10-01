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
