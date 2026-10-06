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
  // A selected row button's fill, hovered or not. The over-rates red of 13px gap
  // text keeps 4.58:1 on it, against 4.50:1 on accentTintSoft and 4.15:1 on
  // accentTint (axe passes only above 4.5).
  rowSelected: hexRgba(COLORS.primary, 0.05),
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
