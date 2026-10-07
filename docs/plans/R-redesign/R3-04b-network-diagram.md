> Part of [R: Admin redesign](../R-redesign.md), phase R3 ([R3-card-analytics.md](R3-card-analytics.md)). Read the main plan's decisions (R-28 to R-56 for R3), corrections, global constraints and shared interfaces, then the R3 header, first.

> **Re-base notes (R3-4b, 2026-10-06).** Re-based from the 2026-10-01 outline (R3-card-analytics.md:485-1450) onto the kit as built in R1 and R2 (main @ aea40b4, pin bc877e1), the audit (audit-R3-4b.json) and decisions R-37, R-38, R-40, R-41 and R-46. What changed and why:
> 1. **Kit reuse instead of local copies.** The width is `chartWidth(useContainerWidth(ref))`, so it lays out at `CHART_FALLBACK_WIDTH` (640) until measured, not the outline's own 560 (`FALLBACK_WIDTH` goes). `PlotPoint` and `RING` come from `lineLayout.ts` (the outline's `Point` and its own `RING = 2` go), `Domain` from `scatter.ts`, `dataFlag` and `dimmed` from `barPaint.ts`, `tooltipText` from `series.ts`, `EmptyChart` from `ChartSvg.tsx`. The 3px name halo is one constant, `LABEL_HALO`, which moves from `ScatterChart.tsx` (private) to `axis.ts` beside `LABEL_SIZE`, and both charts import it. Names use the `paintOrder="stroke"` attribute, as ScatterChart's diagonal label does, not an inline style.
> 2. **Why it doesn't use `ChartPlot`, `useChartCursor` or `ChartSvg`.**
>    - Each node is a react-router `Link` (R-41: a tap follows the link), its own Tab stop. That meets the global rule that every clickable thing is a button or a link. `ChartPlot` makes a plot one `role="slider"`, which would turn twelve links into one slider; R2's single-slider exception was for a scatter of hundreds of dots and doesn't apply to twelve links.
>    - `useChartCursor` holds an index, and an index is the bug R-46 describes (see note 8). The diagram keeps its own one-line `useState` of the active node's id.
>    - `ChartSvg` scales its drawing by `viewBox` and `maxWidth: 100%`. On the first frame (640px, before the container reports) the drawing would shrink while the HTML link layer stayed at 640px, so the two would part. The network keeps its own 1:1 `<svg>` inside the clip layer. The tooltip is the kit's `ChartTooltip`, and the frame and table the page's `ChartFrame`.
> 3. **Split the way R2 split ScatterChart** (Code Health; the gate failed R1's one-piece BarChart and `plotProps`). `networkLayout.ts` gains one pure entry point, `networkLayout(plot, names)`, which returns the hub, the slots, the printed names and each node's link box: the work the outline did inline in the component (outline 1164-1170, plus the `union` of target and name). `NetworkDiagram` measures the width and places the network. An inner `NetworkPlot` holds the active node and renders small parts: `Spokes`, `Disc`, `Dots`, `Names`, `NodeLinks`, `NodeTooltip`, and `MoreNote` for "and K more". Colours come from a `Map`, as `placeDots` does. A placement test (as ScatterChart's) pins that a hover or a focus calls `networkLayout` no more; it fails when the state sits beside the placing.
> 4. **Object arguments** (Primitive Obsession: scatter.ts failed the gate at about 50%). `ringRadii(plot: Size)`, `ringSlots(count, plot: Size)` (the centre and the radii now come from the plot, so the tests pass a plot, and the inner radius is 71.5, not the outline's hand-fed 70), `labelFor(slot, text: Size)` with the 12px gap a constant (`NAME_GAP`, half of `NODE_TARGET`, which every call passed), and `nodeTarget(p)` in place of `boxAround(p, 24)`. By hand count (the TypeScript AST, typed parameters): `networkLayout.ts` 3 primitive of 24 (12.5%; the outline was 8 of 19, 42%), `NetworkDiagram.tsx` 0 of 12. Every function is at cyclomatic complexity 4 or less and takes 3 arguments or fewer.
> 5. **R-40, widths from `textWidth`.** Names are measured with the kit's estimate at `NAME_SIZE` (`ADMIN_TYPE.label`, 11px) inside `networkLayout`. The layout effect, the `document.fonts.ready` re-measure, the measured-signature state, the hidden-then-shown `<text>`s and the test's `SVGElement.prototype.getComputedTextLength` patch all go. A name that doesn't fit is not rendered at all. The outline's "Text measurement" test-isolation note goes too (the re-based header has already dropped it, its re-base note 7). The outline's zero-width ("unmeasured") cases in the `overlaps` and `placeLabels` tests go, since nothing is unmeasured now. On the 2026-10-06 probe, twelve real card names ("Mickey Mouse" … "Tinker Bell") all print from 480px up, and ten of twelve at 320px. R3-9's real-data check looks at how many drop.
> 6. **R-38, an unnamed hub.** The `center` prop goes. The hub is a dot in `ADMIN_COLORS.text`. Its 24px target still blocks names, so no name covers it.
> 7. **R-41, the kit's emphasis and naming.**
>    - Spokes are `.adm-chart-mark` with `data-dim` and `data-active` (`dataFlag`, `dimmed`). At rest every spoke is at full opacity (the outline's 0.8 goes). While a node is active the others drop to 0.4 (the outline's 0.2 goes) and its own brightens. The motion is the kit's smooth curve, which AdminStyles already switches off under reduced motion, so the component's own reduced-motion test goes.
>    - No component `<style>`. `.adm-net-link` (block, full size, the control radius) joins AdminStyles, and its `:focus-visible` joins the controls' list (`outline-offset: 2px`). `AdminStyles.test.tsx` adds it to `CLASSES` and gets its own ring test. It stays out of `FOCUSABLE`, which requires a `:hover` rule; the link has none, because a hover shows its tooltip. The component no longer imports `EASING` or `ADMIN_RADIUS`.
>    - Each link's accessible name is `tooltipText(node.tooltip)`. `NetworkNode.ariaLabel` goes, and so does R3-6c's `partnerSentence` (see "For later tasks"). The printed name sits inside its link's box, so the global "label in name" rule (WCAG 2.5.3) holds only when `tooltip.title` contains `label`. `NetworkNode.label`'s doc says so: a card's name, with its full name as the title.
>    - Escape hides the focused node's tooltip and leaves focus on its link (WCAG 1.4.13), as the kit's slider (`useChartCursor.ts:85-94`) and selectable bars (`useBarFocus.ts:20`, `SelectableBars.tsx:21`) do. A tooltip beside its dot can cover the next nodes' names. A test pins it.
>    - A tap follows the link. On a phone, the table view carries the scores.
>    - The links take no `onFollow`. Header contract 11's "No click hook" holds: R3-7's page asks for the focus handoff when the URL names another card (`useCardHandoff`, R-48), because a request made at click time is taken by the old card's still-mounted `h2` (a router `Link` navigates in a transition).
>    - The stories join the kit's one story file, `Charts.stories.tsx`, using R3-4's `TIER_SERIES` and `TIER_COLOR` and the bridged `getStrengthTier`. Each story node's tooltip title starts with its printed label, so the long-name story keeps label in name too. Every network story drives `ChartFrame`'s controlled `view`, so "and 3 more in the table" opens the table and the frame focuses it. The separate `NetworkDiagram.stories.tsx`, its own `TIERS` and `tierOf`, and the no-op `onShowAll` go.
> 8. **R-46, the active node is held by id.** Following a partner link swaps the nodes with no `pointerleave` or `blur`. The outline's index state then showed the new card's node at the same index (the audit reproduced it). `NetworkPlot` holds the id instead, so an id that is gone shows nothing. A test follows a link on route-dependent nodes and expects no tooltip and no dimmed spoke; it fails with index state. R3-7 still keys the view by card id (R-46); this makes the diagram right on its own too.
> 9. **R-37 is unchanged here.** It keeps `NETWORK_MAX_NODES = 12` on two rings. The order is the caller's (R3-4's score-then-name sort). The tie subtitle is R3-6c's `networkSubtitle`.
> 10. **Dots like the scatter's (R-23).** Each dot is drawn on its own page-coloured disc `RING` wider: two circles, not a stroke. A centred 2px stroke would leave only r 4 of fill on an r 5 dot. Nodes are r 5 on r 7, the active node r 7 on r 9, and the hub r 8 on r 10.
> 11. **Kit parity.**
>    - `emptyText` with `EmptyChart` for no nodes. R3-6c shows its own Notice instead, so this is a fallback.
>    - The width ref sits on the outer wrapper in both branches, as ScatterChart's does. `useContainerWidth` observes once (`[ref]`), so a ref that appeared only after the first render would never be measured.
>    - The default value domain is a module constant (`SCORE_DOMAIN`), not an inline default.
> 12. **Tests use `createMemoryRouter`** (R2's pattern), with nodes that depend on the `:id` param, so following a link really swaps them.
> 13. **Prerequisites, now explicit.** R3-1 bridges `TIER_COLORS` and `getStrengthTier` (the stories and the theme test use them). R3-4 creates `TIER_COLOR` and `TIER_SERIES` in `src/tools/analytics/cards/engineView.ts` (the stories). Step 1 checks both.
> 14. **Smaller fixes.**
>    - `adminTheme.test.ts` has 7 tests, not 6.
>    - The "run them again on the real kit" note is done (see "Verified").
>    - `NetworkDiagram.stories.tsx` and its `Admin/NetworkDiagram` title go.
>    - The docs record (R-redesign.md's file-structure row for `src/charts/*` and the "Chart kit (R1-3b)" block) is R3-9's, from the contract block below.
>
> **Verified (2026-10-06)** in a scratch sandbox: copies of `src/` and the configs, junctions to the repo's `node_modules` and `upstream/`, and the Vite cache and tsbuildinfo kept in the sandbox. The repo and its caches stayed untouched. Two stand-ins took the place of the earlier tasks: the bridge gained `TIER_COLORS` and `getStrengthTier`/`StrengthTierLabel` (R3-1), and `cards/engineView.ts` held R3-4's `TIER_COLOR` and `TIER_SERIES` (R3-4).
> - Step 3 and Step 7 print the failures quoted below. Step 5 gives 28/28. Step 11 gives 14 + 13 + 7, then `src/charts` and `src/theme` together give 18 files and 255 tests (212 before). `vitest run src` gives 94 files and 1,093 tests (the review's one-test link-box probe set aside). On the first full run, before the Escape test, one test failed under load, WebAnalyticsBody's "focuses the busiest event first…", a 5s timeout. It passes on its own and on the re-run, and is untouched by this task.
> - Mutations, each reverted:
>   - Dropping the link's `onKeyDown` fails the Escape test (1 failed, 13 passed).
>   - Holding the active node by index fails the R-46 test.
>   - Moving the state into `NetworkDiagram` beside the placing fails the placement test.
>   - Dropping `EPS` from `overlaps` fails the float-rounding test at index 2.
> - `tsc -p tsconfig.app.json` is clean. `eslint --max-warnings 0` is clean on `src/charts`, `src/theme` and the stand-in. A probe confirmed that the design-token rules fire in the sandbox.
> - React Compiler (babel-plugin-react-compiler 1.0.0) compiles every component in `NetworkDiagram.tsx` that returns JSX of its own, with no bailout. `Spokes` returns a mapped array, as ScatterChart's `Dots` and BarDrawing's `BarMarks` do, and is left uncompiled like them.
> - The five network stories render in jsdom (`composeStories`). In `NetworkMoreInTable`, the button opens the table (16 rows) and the table has focus. In `NetworkTwoRings` and `NetworkLongNames`, every printed name begins its link's accessible name (label in name).
> - The local CodeScene (MCP 1.1.3) scores all four new files and the story file 10.0. That proves little (the audit found it scoring two files the gate failed at 10.0), so the limits above were met by construction. Run `analyze_change_set` before the push, then read the PR's CodeScene check.

**Contract additions (R3-4b), re-based.** These replace the `networkLayout.ts` and `NetworkDiagram.tsx` half of the outline's "Chart kit additions" block (outline lines 29-58). The re-based header's contract addition 11 (R3-card-analytics.md:267-314) already carries the same names and signatures. Only comments differ: this block also says that `label` must sit inside `tooltip.title`, that Escape hides the tooltip, and that the links take no click hook. Against the outline's block:
- `Point` is the kit's `PlotPoint`, and `Box` is the type `PlotPoint & Size`, not an interface of its own (note 1).
- `ringRadii(plot: Size)`, `ringSlots(count, plot: Size)` and `labelFor(slot, text: Size)` take objects, the gap is the internal `NAME_GAP`, and `boxAround(p, size)` is `nodeTarget(p)` (note 4).
- `NetworkNode.ariaLabel` and the `center` prop go (notes 6 and 7), and `valueDomain` is a `Domain`.
- New: `Size`, `NetworkLayout` and `networkLayout` (note 3), `NODE_TARGET` (note 4), `NAME_SIZE` (note 5) and `emptyText` (note 11). `FOCUS_REACH`, `SPOKE_WIDTHS` and `spokeWidth` were the component's private `FOCUS_REACH`, `SPOKE` and `spokeWidth` (outline lines 1074-1076 and 1137-1138), now exported from the layout.

They rename nothing in the kit as built:
```ts
// src/charts/networkLayout.ts — the network's pure geometry (R3-4b)
export interface Size {width: number; height: number}
export type Box = PlotPoint & Size;                       // PlotPoint: lineLayout.ts
export interface RingSlot extends PlotPoint {angle: number; radius: number}   // angle: radians clockwise from 3 o'clock
export interface LabelPlacement extends Box {anchor: 'start' | 'middle' | 'end'; textX: number; textY: number}
export interface NetworkLayout {size: Size; hub: PlotPoint; slots: RingSlot[]; names: Array<LabelPlacement | null>; links: Box[]}
export const ONE_RING_MAX = 6;            // up to 6 nodes share one ring; past it the weaker half moves out
export const INNER_RING_SHARE = 0.55;     // inner radius / outer radius
export const RING_MARGIN: number;         // 40 (SPACING.xxxl + SPACING.sm): room between the outer ring and the plot edge
export const NODE_TARGET = 24;            // each node link's square, at least; names start just past it
export const FOCUS_REACH: number;         // 4 (SPACING.xs): names stay this far inside the plot
export const NAME_SIZE: number;           // ADMIN_TYPE.label (11): names are set, and measured with textWidth (R-40), at this size
export const SPOKE_WIDTHS: Domain;        // [1, 4] px across the value domain
export function ringSizes(count: number): [number, number];                  // [inner, outer]
export function ringRadii(plot: Size): [number, number];                     // [inner, outer]
export function ringSlots(count: number, plot: Size): RingSlot[];            // round the plot's centre; strongest at 12 o'clock, clockwise
export function labelFor(slot: Pick<RingSlot, 'x' | 'y' | 'angle'>, text: Size): LabelPlacement;
export function overlaps(a: Box, b: Box): boolean;                           // shared area only; touching edges, or a float slack under 1e-6, don't count
export function contains(outer: Box, inner: Box): boolean;
export function nodeTarget(p: PlotPoint): Box;                               // the NODE_TARGET square centred on p
export function placeLabels(labels: readonly LabelPlacement[], blocked: readonly Box[], bounds: Box): Array<LabelPlacement | null>;
export function spokeWidth(value: number, domain: Domain): number;           // SPOKE_WIDTHS across the domain, clamped
export function networkLayout(plot: Size, names: readonly string[]): NetworkLayout; // names strongest first

// src/charts/NetworkDiagram.tsx — a radial ego network (R3-4b)
export const NETWORK_MAX_NODES = 12;      // R-37
export interface NetworkNode {
  id: string; label: string; href: string; value: number; seriesId: string;
  tooltip: TooltipContent;                // its tooltipText is the node link's accessible name (R-41)
  // label prints inside its link where it fits, so tooltip.title must contain it (label in name): a card's name, the full name as the title
}
export interface NetworkDiagramProps {
  nodes: readonly NetworkNode[];          // strongest first; the first NETWORK_MAX_NODES are drawn
  series: readonly SeriesDef[]; ariaLabel: string;   // ariaLabel names the list of node links
  valueDomain?: Domain;                   // default [0, 10]: the spoke widths, 1 to 4px
  height?: number;                        // default 340, names included
  onShowAll?: () => void;                 // "and K more in the table" calls it
  emptyText?: string;                     // shown in place of the plot for no nodes (default "No data to chart.")
}
export function NetworkDiagram(props: NetworkDiagramProps);
// No center prop: the hub is an unnamed dot (R-38). The SVG is aria-hidden; each node is a react-router Link in a <ul>
// named by ariaLabel, covering its 24px target and its printed name (NetworkLayout.links). Hover or focus shows the
// node's ChartTooltip and dims the other spokes (adm-chart-mark). Escape hides the tooltip and keeps focus.
// The active node is held by id, so new nodes clear it (R-46). No click hook: the page asks for the focus handoff when
// the URL names another card (R-48). NetworkDiagram measures and places (networkLayout); an inner NetworkPlot holds
// the active node, so a hover places nothing again.

// src/charts/axis.ts: LABEL_HALO = 3 (moved from ScatterChart.tsx, which now imports it), the page-coloured halo round a label drawn over marks
// src/theme/AdminStyles.tsx: adm-net-link (display block, full size, ADMIN_RADIUS.control; :focus-visible in the controls' list, offset 2px)
```

### Task R3-4b: Synergy network diagram (chart kit)

Decision R-13. This is a radial ego network of one card. The hub is the card, its strongest partners sit round it, and each spoke takes its partner's strength-tier colour and is weighted by engine score. The component is generic (`src/charts/`), and R3-6c's Engine view feeds it the card's partners.

**Prerequisites:** R3-1 (`TIER_COLORS`, `getStrengthTier` in the bridge) and R3-4 (`TIER_COLOR` and `TIER_SERIES` in `src/tools/analytics/cards/engineView.ts`).

**Design, against the `dataviz` guidance:**
- **Form.** The job is "who does this card work with, and how strongly": identity plus magnitude for one subject. An ego network shows both at a glance, and the table view carries the full ranked list. The layout is fixed by rule (no force simulation), so the same card always draws the same picture and the tests can check positions.
  - At most `NETWORK_MAX_NODES = 12` partners are drawn (R-37). Twelve names fit round a 340px plot at panel width.
  - The strongest sits at 12 o'clock and the rest follow clockwise, in the order the caller gives (R3-4: score, then name).
  - Up to six share one ring. Past six, the stronger half takes the inner ring (closer means stronger), and each outer node sits midway between two inner ones, so no spoke runs through a node.
  - The rest are counted under the plot: "and K more in the table", which opens the table view.
- **Colour.** Spokes and dots take the tier colours (`TIER_SERIES`, from `TIER_COLORS`; R-15). Spokes are ordered categories with a legend (`ChartLegend`, `mark="line"`, from the page) and a second cue in their width, 1px at score 0 to 4px at 10. The validator record is series.ts:22-26 (CVD worst ΔE 11.3, all four ≥ 3:1, lightness band failing as R-15 records). On a card the tiers land at 8.2:1 to 12.1:1, and Step 6 adds them to the theme's 1.4.11 test.
  - The hub is `ADMIN_COLORS.text`, not the accent: `COLORS.primary` (#ffb900) and the Perfect tier (#fbbf24) are too close to tell apart. It has no name (R-38).
  - Names wear text tokens (`muted`, `text` on the active node), never a tier colour.
- **Marks.** Each node is an r 5 dot on its own r 7 disc in `page`, as the scatter's dots (R-23). The active node lifts to r 7 on r 9, and the hub is r 8 on r 10. Spokes have round caps. Names carry a 3px page-coloured halo (`LABEL_HALO`, `paintOrder="stroke"`), so a crossing spoke never cuts through a letter.
- **Names.** Each name sits beside its node, on the side away from the centre: start-anchored on the right, end-anchored on the left, centred above or below near 12 and 6 o'clock. So a node's own spoke never crosses its name.
  - Names are measured with `textWidth` at `NAME_SIZE` (R-40), which errs wide, and placed strongest first.
  - A name prints only when it stays inside the plot, 4px clear of its edge (a focus ring's reach), and clears the hub's and every node's 24px target and every name already placed.
  - A name that doesn't fit stays in the tooltip, the link's accessible name and the table view. On a phone-width panel the side names drop first.
- **Interaction (R-41).** Each node is a react-router `Link` in a `<ul>` named by `ariaLabel`, in strength order.
  - The links sit over the SVG, which is decoration (`aria-hidden`). Each covers at least 24px round its dot, plus its printed name. Its accessible name is `tooltipText(node.tooltip)`, the kit's rule that a mark's name is its tooltip's text.
  - Hover or focus shows that node's `ChartTooltip`, lifts its dot, brightens its name and spoke, and dims the other spokes to 0.4 (`.adm-chart-mark`). Reduced motion stops the transition (AdminStyles).
  - Escape hides the focused node's tooltip and leaves focus on its link (WCAG 1.4.13), as the kit's slider and bars do.
  - Enter or a tap follows the link, as any link does.
  - The printed name sits inside its link, so its tooltip title must contain it (label in name, WCAG 2.5.3): a card's name, with its full name as the title.
  - The focus ring is `.adm-net-link:focus-visible`, the gold ring every admin control uses, from AdminStyles.
- **Layout.** The SVG and the links sit in an absolute, `overflow: hidden` clip layer inside the plot. It clips the first 640px frame, which would otherwise scroll a phone page sideways, and as an absolute layer it adds nothing to the plot's min-content width. The tooltip sits outside the layer, so it is never clipped. Node targets sit at least 28px inside the plot (`RING_MARGIN` less half the target), and names 4px, so no focus ring is clipped either.
- **Table view.** The page passes `ChartFrame` a table of every partner, not just the drawn twelve: Partner, Score, Tier and Rules. Rules is there because the tooltip shows it, and a tooltip may never be the only way to a value.

**Files:**
- Create:
  - `src/charts/networkLayout.ts` and `src/charts/NetworkDiagram.tsx`;
  - `src/charts/__tests__/networkLayout.test.ts` and `src/charts/__tests__/NetworkDiagram.test.tsx`.
- Modify:
  - `src/charts/axis.ts`: `LABEL_HALO`;
  - `src/charts/ScatterChart.tsx`: imports `LABEL_HALO` and drops its own;
  - `src/theme/AdminStyles.tsx`: `.adm-net-link` and its focus ring;
  - `src/charts/Charts.stories.tsx`: five network stories.
- Test (modify):
  - `src/theme/__tests__/AdminStyles.test.tsx`: the class and its ring;
  - `src/theme/__tests__/adminTheme.test.ts`: the tiers in `chartMarks`.

**Interfaces:**
- **Consumes:**
  - **Kit:**
    - `ChartTooltip`, `TooltipContent`;
    - `EmptyChart` (`ChartSvg.tsx`);
    - `linear` and `textWidth` (`scale.ts`);
    - `SeriesDef`, `chartWidth` and `tooltipText` (`series.ts`);
    - `PlotPoint` and `RING` (`lineLayout.ts`);
    - `Domain` (`scatter.ts`);
    - `dataFlag` and `dimmed` (`barPaint.ts`);
    - `px` (`axis.ts`).
  - **Stories:** `ChartFrame` with `view`/`onViewChange`, `ChartLegend`, and `Panel`.
  - **Bridge:** `LinkButton`, `SPACING` and `useContainerWidth`. The stories and the theme test also need `TIER_COLORS` and `getStrengthTier` (R3-1).
  - **R3-4:** `TIER_COLOR` and `TIER_SERIES` (stories).
  - **Elsewhere:** `ADMIN_COLORS`, `ADMIN_TYPE`, `fmtInt`, and react-router's `Link` (the diagram) and `MemoryRouter` (the stories).
- **Produces:** the block above.

- [ ] **Step 1: Check what this task builds on**

Run from the repo root:
```bash
grep -n "TIER_COLORS,\|getStrengthTier" src/app-bridge.ts
grep -nE "export const TIER_(COLOR|SERIES)\b" src/tools/analytics/cards/engineView.ts
grep -n "export function textWidth\|export function dataFlag\|export function dimmed\|export function chartWidth\|export function tooltipText\|export const RING\|export interface PlotPoint\|export type Domain" src/charts/scale.ts src/charts/barPaint.ts src/charts/series.ts src/charts/lineLayout.ts src/charts/scatter.ts
```
Expected: `TIER_COLORS,` and a `getStrengthTier` export in the bridge (R3-1), two engineView lines, `TIER_COLOR` and `TIER_SERIES` (R3-4), and eight kit lines: `scale.ts:128`, `barPaint.ts:54` and `:59`, `series.ts:51` and `:88`, `lineLayout.ts:43` and `:100`, `scatter.ts:27`. If R3-1 or R3-4 hasn't landed, stop: Steps 6 and 12 need them.

- [ ] **Step 2: Write the failing layout test**

Create `src/charts/__tests__/networkLayout.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {
  FOCUS_REACH,
  NAME_SIZE,
  NODE_TARGET,
  labelFor,
  networkLayout,
  nodeTarget,
  overlaps,
  placeLabels,
  ringRadii,
  ringSizes,
  ringSlots,
  spokeWidth,
  type Box,
  type LabelPlacement,
  type RingSlot,
} from '../networkLayout';
import {textWidth} from '../scale';

const PLOT = {width: 560, height: 340};
const BOUNDS = {x: 0, y: 0, ...PLOT};

/** A slot's angle in whole degrees, clockwise from 12 o'clock, in [0, 360). */
function clockDegrees(slot: RingSlot): number {
  return Math.round((((slot.angle + Math.PI / 2) * 180) / Math.PI + 360) % 360);
}

/** A start-anchored label covering `box`. */
function label(box: Box): LabelPlacement {
  return {anchor: 'start', textX: box.x, textY: box.y + box.height / 2, ...box};
}

describe('ringSizes', () => {
  it.each([
    [0, [0, 0]],
    [6, [6, 0]],
    [7, [4, 3]],
    [12, [6, 6]],
  ])('splits %i nodes as %j', (count, sizes) => {
    expect(ringSizes(count)).toEqual(sizes);
  });
});

describe('ringRadii', () => {
  it('fits the outer ring inside the shorter side, less the margin, with the inner ring at 55%', () => {
    const [inner, outer] = ringRadii(PLOT);
    expect(outer).toBe(130);
    expect(inner).toBeCloseTo(71.5, 10);
  });

  it('never goes negative on a tiny plot', () => {
    expect(ringRadii({width: 60, height: 60})).toEqual([0, 0]);
  });
});

describe('ringSlots', () => {
  it('puts a lone ring on the outer radius round the plot centre, strongest at 12 o’clock, then clockwise', () => {
    const slots = ringSlots(4, PLOT);
    expect(slots.map(clockDegrees)).toEqual([0, 90, 180, 270]);
    expect(slots.every((s) => s.radius === 130)).toBe(true);
    expect(slots[0].x).toBeCloseTo(280, 10);
    expect(slots[0].y).toBeCloseTo(40, 10);
    expect(slots[1].x).toBeCloseTo(410, 10);
  });

  it('keeps the stronger half on the inner ring and seats the outer ring between them', () => {
    const slots = ringSlots(12, PLOT);
    expect(slots.slice(0, 6).map((s) => s.radius.toFixed(1))).toEqual(Array(6).fill('71.5'));
    expect(slots.slice(0, 6).map(clockDegrees)).toEqual([0, 60, 120, 180, 240, 300]);
    expect(slots.slice(6).map((s) => s.radius)).toEqual(Array(6).fill(130));
    expect(slots.slice(6).map(clockDegrees)).toEqual([30, 90, 150, 210, 270, 330]);
  });

  it('spreads a smaller outer ring over the midpoints, so no two nodes share a spoke', () => {
    expect(ringSlots(7, PLOT).map(clockDegrees)).toEqual([0, 90, 180, 270, 45, 135, 225]);
  });

  it('lays out the same way every time', () => {
    expect(ringSlots(9, PLOT)).toEqual(ringSlots(9, PLOT));
  });
});

describe('labelFor', () => {
  /** A point 100px from the plot centre at a clock angle in degrees. */
  const at = (degrees: number) => {
    const angle = ((degrees - 90) * Math.PI) / 180;
    return {angle, x: 280 + 100 * Math.cos(angle), y: 170 + 100 * Math.sin(angle)};
  };
  const NAME = {width: 80, height: 16};

  it('starts a name just past the target of a node on the right', () => {
    expect(labelFor(at(90), NAME)).toMatchObject({anchor: 'start', textX: 392, textY: 170, x: 392, y: 162, width: 80, height: 16});
  });

  it('ends a name just past the target of a node on the left', () => {
    const name = labelFor(at(270), NAME);
    expect(name.anchor).toBe('end');
    expect(name.textX).toBeCloseTo(168, 10);
    expect(name.x).toBeCloseTo(88, 10);
  });

  it('centres a name above a node near 12 o’clock and below one near 6', () => {
    const top = labelFor(at(0), NAME);
    expect(top.anchor).toBe('middle');
    expect(top.textY).toBeCloseTo(50, 10);
    expect(top.y + top.height).toBeCloseTo(58, 10);
    const bottom = labelFor(at(180), NAME);
    expect(bottom.textY).toBeCloseTo(290, 10);
    expect(bottom.y).toBeCloseTo(282, 10);
    expect(bottom.x).toBeCloseTo(240, 10);
  });
});

describe('overlaps', () => {
  it('counts shared area, not touching edges', () => {
    const a = {x: 0, y: 0, width: 10, height: 10};
    expect(overlaps(a, {x: 9, y: 9, width: 10, height: 10})).toBe(true);
    expect(overlaps(a, {x: 10, y: 0, width: 10, height: 10})).toBe(false);
  });

  it('never counts a name as covering its own node’s target through float rounding', () => {
    const slots = ringSlots(7, {width: 326, height: 340});
    expect(slots.map((s) => overlaps(labelFor(s, {width: 40, height: 15}), nodeTarget(s)))).toEqual(Array(7).fill(false));
  });
});

describe('placeLabels', () => {
  it('prints the stronger of two colliding labels and drops the weaker', () => {
    const labels = [
      label({x: 100, y: 100, width: 80, height: 16}),
      label({x: 150, y: 108, width: 80, height: 16}),
      label({x: 300, y: 100, width: 80, height: 16}),
    ];
    expect(placeLabels(labels, [], BOUNDS).map((p) => p !== null)).toEqual([true, false, true]);
  });

  it('drops a label that would leave the bounds', () => {
    expect(placeLabels([label({x: 500, y: 100, width: 80, height: 16})], [], BOUNDS)).toEqual([null]);
  });

  it('drops a label that covers a blocked box, such as another node’s target', () => {
    const blocked = [nodeTarget({x: 150, y: 108})];
    expect(placeLabels([label({x: 100, y: 100, width: 80, height: 16})], blocked, BOUNDS)).toEqual([null]);
  });
});

describe('nodeTarget', () => {
  it('is the NODE_TARGET square centred on the point', () => {
    expect(nodeTarget({x: 100, y: 50})).toEqual({x: 88, y: 38, width: NODE_TARGET, height: NODE_TARGET});
  });
});

describe('spokeWidth', () => {
  it.each([
    [0, 1],
    [5, 2.5],
    [10, 4],
    [-2, 1],
    [12, 4],
  ])('draws a value of %d %dpx wide, clamped to 1 to 4px', (value, width) => {
    expect(spokeWidth(value, [0, 10])).toBe(width);
  });
});

describe('networkLayout', () => {
  const NAMES = ['Elsa', 'Anna', 'Olaf', 'Kristoff', 'Sven', 'Hans', 'Marshmallow', 'Grand Pabbie', 'Oaken', 'Bruni', 'Iduna', 'Agnarr'];

  it('puts the hub at the centre and a slot per name, as ringSlots does', () => {
    const layout = networkLayout(PLOT, NAMES);
    expect(layout.size).toEqual(PLOT);
    expect(layout.hub).toEqual({x: 280, y: 170});
    expect(layout.slots).toEqual(ringSlots(12, PLOT));
  });

  it('measures each name with the kit’s textWidth estimate at NAME_SIZE', () => {
    const [elsa] = networkLayout(PLOT, ['Elsa']).names;
    expect(elsa?.width).toBe(textWidth('Elsa', NAME_SIZE));
  });

  it('prints a name that fits and widens its link to cover it; one too wide keeps the bare target', () => {
    const wide = 'An extraordinarily long partner name that cannot fit beside its node at all';
    const layout = networkLayout(PLOT, ['Elsa', wide, 'Olaf']);
    expect(layout.names.map(Boolean)).toEqual([true, false, true]);
    expect(layout.links[1]).toEqual(nodeTarget(layout.slots[1]));
    const [elsaLink, elsaName, elsaTarget] = [layout.links[0], layout.names[0]!, nodeTarget(layout.slots[0])];
    expect(elsaLink.y).toBe(elsaName.y);
    expect(elsaLink.y + elsaLink.height).toBe(elsaTarget.y + elsaTarget.height);
  });

  it('keeps every printed name inside the plot, clear of each other, of every node and of the hub, at any width', () => {
    for (const width of [320, 480, 640, 960]) {
      const plot = {width, height: 340};
      const layout = networkLayout(plot, NAMES.map((name) => `${name} - Keeper of the Northern Lights`));
      const printed = layout.names.filter((name) => name !== null);
      const targets = [nodeTarget(layout.hub), ...layout.slots.map((slot) => nodeTarget(slot))];
      for (const [i, name] of printed.entries()) {
        expect(name.x).toBeGreaterThanOrEqual(FOCUS_REACH);
        expect(name.x + name.width).toBeLessThanOrEqual(width - FOCUS_REACH);
        expect(targets.some((target) => overlaps(name, target))).toBe(false);
        expect(printed.slice(i + 1).some((other) => overlaps(name, other))).toBe(false);
      }
    }
  });
});
```

- [ ] **Step 3: Run it and see it fail**

Run: `pnpm vitest run src/charts/__tests__/networkLayout.test.ts`
Expected: FAIL, with `Failed to resolve import "../networkLayout" from "src/charts/__tests__/networkLayout.test.ts". Does the file exist?` and `Test Files  1 failed (1)`.

- [ ] **Step 4: Write the layout module**

Create `src/charts/networkLayout.ts`:

```ts
import {SPACING} from '../app-bridge';
import {ADMIN_TYPE} from '../theme/adminTheme';
import type {PlotPoint} from './lineLayout';
import {linear, textWidth} from './scale';
import type {Domain} from './scatter';

/*
 * The network diagram's geometry: a radial ego network laid out by rule, not
 * by a force simulation, so the same partners always land in the same places
 * and the tests can check positions. Pure, so it can be tested at any width
 * (jsdom measures none). NetworkDiagram draws it.
 *
 * Angles are radians, clockwise from 3 o'clock (SVG's y axis points down), so
 * 12 o'clock is −π/2.
 */

/** A width and a height in px: a plot's, or a name's. */
export interface Size {
  width: number;
  height: number;
}

/** A box in px: its top left corner and its size. */
export type Box = PlotPoint & Size;

/** A node's place: the angle and radius of its ring, and the point they give. */
export interface RingSlot extends PlotPoint {
  angle: number;
  radius: number;
}

/** A name's anchor point (textX, textY: the anchor, vertically centred) and the box its text covers. */
export interface LabelPlacement extends Box {
  anchor: 'start' | 'middle' | 'end';
  textX: number;
  textY: number;
}

/** Where everything goes, at one plot size. Every x and y is in px from the plot's top left. */
export interface NetworkLayout {
  /** The plot, names included. */
  size: Size;
  /** The hub: the plot's centre. */
  hub: PlotPoint;
  /** One slot per node, strongest first. */
  slots: RingSlot[];
  /** Each node's printed name, or null where it would leave the plot or cover another name, a node or the hub. */
  names: Array<LabelPlacement | null>;
  /** Each node's link: its NODE_TARGET square, grown to cover its printed name. */
  links: Box[];
}

/** Up to this many nodes share one ring; past it the weaker half moves out to a second. */
export const ONE_RING_MAX = 6;
/** The inner ring's radius as a share of the outer ring's. */
export const INNER_RING_SHARE = 0.55;
/** Room kept between the outer ring and the plot's edge, for a name above or below a node: 40px. */
export const RING_MARGIN = SPACING.xxxl + SPACING.sm;
/** The square each node's link covers at least, round its dot (the dataviz hit-target floor). Names start just past it. */
export const NODE_TARGET = 24;
/** How far a link's focus ring reaches past it (a 2px outline 2px out). Names stay this far inside the plot, so no ring is clipped. */
export const FOCUS_REACH = SPACING.xs;
/** The names' font size. Their widths come from textWidth at this size (R-40), so the layout is the same in jsdom and the browser. */
export const NAME_SIZE = ADMIN_TYPE.label;
/** A spoke's width at the bottom and the top of the value domain, in px. */
export const SPOKE_WIDTHS: Domain = [1, 4];
/** One line of names. */
const NAME_HEIGHT = Math.round(NAME_SIZE * 1.4);
/** A name's anchor sits this far from its node's centre: just outside the node's target. */
const NAME_GAP = NODE_TARGET / 2;
/** |cos(angle)| above this puts a name beside its node; at or below it, above or below the node. */
const SIDE_THRESHOLD = 0.35;
const TOP = -Math.PI / 2;
/** The slack overlaps allows: float rounding can leave a name one ulp inside its own node's target. */
const EPS = 1e-6;

/** How many nodes go on the inner and the outer ring: one ring up to ONE_RING_MAX, else the stronger ceil(n / 2) inside. */
export function ringSizes(count: number): [number, number] {
  if (count <= ONE_RING_MAX) return [count, 0];
  const inner = Math.ceil(count / 2);
  return [inner, count - inner];
}

/** The inner and outer ring radii for a plot of this size: the outer ring fills it, less RING_MARGIN. */
export function ringRadii(plot: Size): [number, number] {
  const outer = Math.max(0, Math.min(plot.width, plot.height) / 2 - RING_MARGIN);
  return [outer * INNER_RING_SHARE, outer];
}

/** The plot's centre, where the hub sits. */
function centerOf(plot: Size): PlotPoint {
  return {x: plot.width / 2, y: plot.height / 2};
}

/** The slot `ring.radius` from `center` at `ring.angle`. */
function slotAt(center: PlotPoint, ring: {angle: number; radius: number}): RingSlot {
  return {...ring, x: center.x + ring.radius * Math.cos(ring.angle), y: center.y + ring.radius * Math.sin(ring.angle)};
}

/**
 * Slots for `count` nodes round the plot's centre, strongest first. The
 * strongest sits at 12 o'clock and the rest follow clockwise. A single ring
 * uses the outer radius. With two, the inner ring holds the stronger half
 * (closer means stronger), and each outer slot sits midway between two inner
 * ones, so no spoke runs through a node.
 */
export function ringSlots(count: number, plot: Size): RingSlot[] {
  const [innerCount, outerCount] = ringSizes(count);
  const [innerRadius, outerRadius] = ringRadii(plot);
  const center = centerOf(plot);
  const step = (2 * Math.PI) / Math.max(innerCount, 1);
  const firstRadius = outerCount === 0 ? outerRadius : innerRadius;
  const inner = Array.from({length: innerCount}, (_, i) => slotAt(center, {angle: TOP + i * step, radius: firstRadius}));
  // The outer ring takes outerCount of the innerCount midpoints, spread evenly.
  const outer = Array.from({length: outerCount}, (_, j) =>
    slotAt(center, {angle: TOP + step / 2 + Math.floor((j * innerCount) / outerCount) * step, radius: outerRadius}),
  );
  return [...inner, ...outer];
}

/**
 * Where a node's name goes: just past the node's target, on the side away
 * from the centre (start-anchored on the right, end-anchored on the left), or
 * centred above or below it near 12 and 6 o'clock. So a node's own spoke never
 * runs through its name.
 */
export function labelFor(slot: Pick<RingSlot, 'x' | 'y' | 'angle'>, text: Size): LabelPlacement {
  const {width, height} = text;
  const cos = Math.cos(slot.angle);
  if (cos > SIDE_THRESHOLD) {
    const textX = slot.x + NAME_GAP;
    return {anchor: 'start', textX, textY: slot.y, x: textX, y: slot.y - height / 2, width, height};
  }
  if (cos < -SIDE_THRESHOLD) {
    const textX = slot.x - NAME_GAP;
    return {anchor: 'end', textX, textY: slot.y, x: textX - width, y: slot.y - height / 2, width, height};
  }
  const textY = Math.sin(slot.angle) < 0 ? slot.y - NAME_GAP - height / 2 : slot.y + NAME_GAP + height / 2;
  return {anchor: 'middle', textX: slot.x, textY, x: slot.x - width / 2, y: textY - height / 2, width, height};
}

/**
 * True when two boxes share area. Touching edges don't count, nor does a name
 * that float rounding leaves a hair (under EPS) inside its own node's target.
 */
export function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width - EPS &&
    b.x < a.x + a.width - EPS &&
    a.y < b.y + b.height - EPS &&
    b.y < a.y + a.height - EPS
  );
}

/** True when `inner` lies wholly inside `outer`. */
export function contains(outer: Box, inner: Box): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

/** The NODE_TARGET square centred on a point: a node's, or the hub's, hit target. */
export function nodeTarget(p: PlotPoint): Box {
  const half = NODE_TARGET / 2;
  return {x: p.x - half, y: p.y - half, width: NODE_TARGET, height: NODE_TARGET};
}

/** The smallest box that holds both. */
function union(a: Box, b: Box): Box {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y};
}

/** Where names may print: the plot less FOCUS_REACH on every side. */
function printable(plot: Size): Box {
  return {x: FOCUS_REACH, y: FOCUS_REACH, width: plot.width - 2 * FOCUS_REACH, height: plot.height - 2 * FOCUS_REACH};
}

/**
 * Which labels print. Labels are tried in order (the strongest node's first),
 * and one prints only when it lies inside `bounds` and clears every box in
 * `blocked` (the targets of the nodes and the hub) and every label already
 * placed. The rest come back null: their name stays in the node's tooltip, its
 * link's accessible name and the table view.
 */
export function placeLabels(
  labels: readonly LabelPlacement[],
  blocked: readonly Box[],
  bounds: Box,
): Array<LabelPlacement | null> {
  const placed: Box[] = [];
  return labels.map((label) => {
    const fits =
      contains(bounds, label) && !blocked.some((b) => overlaps(label, b)) && !placed.some((p) => overlaps(label, p));
    if (!fits) return null;
    placed.push(label);
    return label;
  });
}

/** A spoke's width for a value: SPOKE_WIDTHS across the domain, clamped at its ends. */
export function spokeWidth(value: number, domain: Domain): number {
  const [thin, thick] = SPOKE_WIDTHS;
  const width = linear([domain[0], domain[1]], [thin, thick])(value);
  return Math.min(Math.max(width, thin), thick);
}

/**
 * The whole diagram at one plot size, for nodes with these names, strongest
 * first: the hub, each node's slot, the names that print (measured with
 * textWidth, strongest first) and each node's link box.
 */
export function networkLayout(plot: Size, names: readonly string[]): NetworkLayout {
  const hub = centerOf(plot);
  const slots = ringSlots(names.length, plot);
  const targets = slots.map((slot) => nodeTarget(slot));
  const candidates = slots.map((slot, i) => labelFor(slot, {width: textWidth(names[i], NAME_SIZE), height: NAME_HEIGHT}));
  const printed = placeLabels(candidates, [nodeTarget(hub), ...targets], printable(plot));
  const links = targets.map((target, i) => {
    const name = printed[i];
    return name ? union(target, name) : target;
  });
  return {size: plot, hub, slots, names: printed, links};
}
```

- [ ] **Step 5: Run the layout test and see it pass**

Run: `pnpm vitest run src/charts/__tests__/networkLayout.test.ts`
Expected: PASS, `Tests  28 passed (28)`.

Without the `EPS` slack in `overlaps`, the float-rounding test fails at index 2. On a 326px plot with 7 nodes, the inner node at 6 o'clock sits at (163, 237.65), and its name's top edge lands one ulp inside its own target.

- [ ] **Step 6: Write the failing diagram and stylesheet tests**

Create `src/charts/__tests__/NetworkDiagram.test.tsx`. The tooltip queries read `ChartTooltip`'s title, which it prints as its own text (ChartTooltip.tsx:82). The title is the full name and the printed name the short one, so the two never match the same query.

```tsx
import {describe, expect, it, vi} from 'vitest';
import {act, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {RouterProvider, createMemoryRouter, useLocation, useParams} from 'react-router-dom';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {NETWORK_MAX_NODES, NetworkDiagram, type NetworkNode} from '../NetworkDiagram';
import {networkLayout} from '../networkLayout';
import {CHART_FALLBACK_WIDTH, tooltipText, type SeriesDef} from '../series';

// networkLayout runs as it is, and counts its calls: the placement test checks a hover places nothing again.
vi.mock('../networkLayout', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../networkLayout')>();
  return {...actual, networkLayout: vi.fn(actual.networkLayout)};
});

const SERIES: SeriesDef[] = [
  {id: 'strong', label: 'Strong', color: ADMIN_COLORS.under},
  {id: 'weak', label: 'Weak', color: ADMIN_COLORS.over},
];

/** Card i as a partner, strongest first by i: a short printed name and a fuller tooltip title. */
function node(i: number, overrides: Partial<NetworkNode> = {}): NetworkNode {
  const score = 10 - i * 0.5;
  return {
    id: String(i),
    label: `Partner ${i}`,
    href: `/cards/${i}`,
    value: score,
    seriesId: i < 3 ? 'strong' : 'weak',
    tooltip: {title: `Partner ${i} - Full Name`, rows: [{label: 'engine score', value: String(score)}]},
    ...overrides,
  };
}

const nodes = (count: number) => Array.from({length: count}, (_, i) => node(i));

/** A card's partners: the first four other cards, so following a link swaps the nodes, as on /cards/:id. */
const partnersOf = (cardId: string) => [0, 1, 2, 3, 4].filter((i) => String(i) !== cardId).slice(0, 4).map((i) => node(i));

/** The diagram on /cards/:id, with the router's path printed so a test can see a link was followed. */
function Diagram(props: Partial<React.ComponentProps<typeof NetworkDiagram>>) {
  const {id = ''} = useParams();
  return (
    <>
      <NetworkDiagram nodes={partnersOf(id)} series={SERIES} ariaLabel="Strongest partners" {...props} />
      <output aria-label="Location">{useLocation().pathname}</output>
    </>
  );
}

function renderDiagram(props: Partial<React.ComponentProps<typeof NetworkDiagram>> = {}) {
  const router = createMemoryRouter([{path: '/cards/:id', element: <Diagram {...props} />}], {initialEntries: ['/cards/9']});
  return render(<RouterProvider router={router} />);
}

const nodeLinks = () => within(screen.getByRole('list', {name: 'Strongest partners'})).getAllByRole('link');
/** The spokes in strength order (the DOM draws the weakest first, so the strongest sits on top). */
const spokesOf = (container: HTMLElement) => Array.from(container.querySelectorAll('line')).reverse();
const printedNames = (container: HTMLElement) => Array.from(container.querySelectorAll('text'), (t) => t.textContent);

describe('NetworkDiagram: nodes and links', () => {
  it('lists one link per node, strongest first, each to its page and named by its tooltip’s text (R-41)', () => {
    renderDiagram();
    const links = nodeLinks();
    expect(links.map((a) => a.getAttribute('aria-label'))).toEqual([0, 1, 2, 3].map((i) => tooltipText(node(i).tooltip)));
    expect(links[0]).toHaveAccessibleName('Partner 0 - Full Name: 10 engine score');
    expect(links[2]).toHaveAttribute('href', '/cards/2');
  });

  it('draws at most twelve nodes and offers the rest in the table', async () => {
    const onShowAll = vi.fn();
    renderDiagram({nodes: nodes(15), onShowAll});
    expect(nodeLinks()).toHaveLength(NETWORK_MAX_NODES);
    await userEvent.click(screen.getByRole('button', {name: 'and 3 more in the table'}));
    expect(onShowAll).toHaveBeenCalledOnce();
  });

  it('names the rest as text when there is no table to open, and says nothing when all fit', () => {
    const {unmount} = renderDiagram({nodes: nodes(13)});
    expect(screen.getByText('and 1 more in the table view')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    unmount();
    renderDiagram({nodes: nodes(12)});
    expect(screen.queryByText(/more in the table/)).not.toBeInTheDocument();
  });

  it('covers each node’s target and its printed name with its link', () => {
    renderDiagram();
    // jsdom measures no width, so the diagram lays out at CHART_FALLBACK_WIDTH and its default 340px height.
    const layout = networkLayout({width: CHART_FALLBACK_WIDTH, height: 340}, ['Partner 0', 'Partner 1', 'Partner 2', 'Partner 3']);
    const items = within(screen.getByRole('list', {name: 'Strongest partners'})).getAllByRole('listitem');
    expect(items.map((li) => [li.style.left, li.style.top, li.style.width, li.style.height])).toEqual(
      layout.links.map((box) => [`${box.x}px`, `${box.y}px`, `${box.width}px`, `${box.height}px`]),
    );
  });

  it('follows a node’s link, as a click or a tap does', async () => {
    renderDiagram();
    await userEvent.click(screen.getByRole('link', {name: /^Partner 2 - Full Name/}));
    expect(screen.getByRole('status', {name: 'Location'})).toHaveTextContent('/cards/2');
  });

  it('shows its empty text, and no list, without nodes', () => {
    renderDiagram({nodes: [], emptyText: 'No partners to draw.'});
    expect(screen.getByText('No partners to draw.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

describe('NetworkDiagram: marks', () => {
  it('colours each spoke and dot by its series, neutral for an unknown one, and widens the spoke with the value', () => {
    const {container} = renderDiagram({nodes: [node(0, {value: 10}), node(3, {value: 0}), node(4, {seriesId: 'gone', value: 5})]});
    expect(spokesOf(container).map((l) => l.getAttribute('stroke'))).toEqual([
      ADMIN_COLORS.under,
      ADMIN_COLORS.over,
      ADMIN_COLORS.barNeutral,
    ]);
    expect(spokesOf(container).map((l) => l.getAttribute('stroke-width'))).toEqual(['4', '1', '2.5']);
    expect(container.querySelector('circle[data-mark="3"]')).toHaveAttribute('fill', ADMIN_COLORS.over);
  });

  it('draws the hub as an unnamed dot (R-38): every printed name is a node’s', () => {
    const {container} = renderDiagram();
    expect(container.querySelector('circle[data-mark="hub"]')).toHaveAttribute('fill', ADMIN_COLORS.text);
    expect(printedNames(container)).toEqual(['Partner 0', 'Partner 1', 'Partner 2', 'Partner 3']);
  });

  it('prints the names that fit and leaves out one too wide for the plot, which keeps its accessible name (R-40)', () => {
    const wide = 'An extraordinarily long partner name that cannot fit beside its node at all';
    const {container} = renderDiagram({nodes: [node(0), node(1, {label: wide}), node(2), node(3)]});
    expect(printedNames(container)).toEqual(['Partner 0', 'Partner 2', 'Partner 3']);
    expect(screen.getByRole('link', {name: /^Partner 1 - Full Name/})).toBeInTheDocument();
  });
});

describe('NetworkDiagram: hover and focus', () => {
  it('shows the node’s tooltip on hover, lifts its dot, brightens its name and dims the other spokes (R-41)', async () => {
    const {container} = renderDiagram();
    await userEvent.hover(nodeLinks()[1]);
    expect(screen.getByText('Partner 1 - Full Name')).toBeInTheDocument();
    const spokes = spokesOf(container);
    expect(spokes.every((l) => l.classList.contains('adm-chart-mark'))).toBe(true);
    expect(spokes.map((l) => l.getAttribute('data-dim'))).toEqual(['true', null, 'true', 'true']);
    expect(spokes[1]).toHaveAttribute('data-active', 'true');
    expect(container.querySelector('circle[data-mark="1"]')).toHaveAttribute('r', '7');
    expect(Array.from(container.querySelectorAll('text'), (t) => t.getAttribute('fill'))).toEqual([
      ADMIN_COLORS.muted,
      ADMIN_COLORS.text,
      ADMIN_COLORS.muted,
      ADMIN_COLORS.muted,
    ]);

    await userEvent.unhover(nodeLinks()[1]);
    expect(screen.queryByText('Partner 1 - Full Name')).not.toBeInTheDocument();
    expect(container.querySelector('line[data-dim], line[data-active]')).toBeNull();
  });

  it('shows the focused node’s tooltip, follows Tab, and hides it on blur', async () => {
    renderDiagram();
    const links = nodeLinks();
    await userEvent.tab();
    expect(links[0]).toHaveFocus();
    expect(screen.getByText('Partner 0 - Full Name')).toBeInTheDocument();
    await userEvent.tab();
    expect(links[1]).toHaveFocus();
    expect(screen.getByText('Partner 1 - Full Name')).toBeInTheDocument();
    expect(screen.queryByText('Partner 0 - Full Name')).not.toBeInTheDocument();
    act(() => links[1].blur());
    expect(screen.queryByText('Partner 1 - Full Name')).not.toBeInTheDocument();
  });

  it('hides the focused node’s tooltip on Escape and keeps focus on its link (WCAG 1.4.13)', async () => {
    const {container} = renderDiagram();
    await userEvent.tab();
    expect(screen.getByText('Partner 0 - Full Name')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('Partner 0 - Full Name')).not.toBeInTheDocument();
    expect(container.querySelector('line[data-dim], line[data-active]')).toBeNull();
    expect(nodeLinks()[0]).toHaveFocus();
  });

  it('shows nothing active once a followed link swaps the nodes, though no leave or blur came (R-46)', async () => {
    const {container} = renderDiagram();
    await userEvent.click(screen.getByRole('link', {name: /^Partner 2 - Full Name/}));
    // The new card's partners: node 2's link is gone with no pointerleave or blur, and the pointer rests where it was.
    expect(screen.getByRole('status', {name: 'Location'})).toHaveTextContent('/cards/2');
    expect(nodeLinks().map((a) => a.getAttribute('href'))).toEqual(['/cards/0', '/cards/1', '/cards/3', '/cards/4']);
    expect(container.querySelector('.adm-chart-tip')).toBeNull();
    expect(container.querySelector('line[data-dim], line[data-active]')).toBeNull();
  });

  it('places the nodes once per layout: hover and focus place nothing again', async () => {
    renderDiagram();
    const placed = vi.mocked(networkLayout);
    placed.mockClear();
    for (const link of nodeLinks()) await userEvent.hover(link);
    await userEvent.tab();
    expect(screen.getByText('Partner 0 - Full Name')).toBeInTheDocument();
    expect(placed).not.toHaveBeenCalled();
    // The control: new nodes are placed again.
    await userEvent.click(nodeLinks()[2]);
    expect(placed).toHaveBeenCalled();
  });
});
```

In `src/theme/__tests__/AdminStyles.test.tsx`, the import (line 5), before:

```tsx
import {ADMIN_COLORS} from '../adminTheme';
```

After:

```tsx
import {ADMIN_COLORS, ADMIN_RADIUS} from '../adminTheme';
```

The end of `CLASSES` (lines 26-28), before:

```tsx
  'adm-chart-cursor',
  'adm-chart-tip',
];
```

After:

```tsx
  'adm-chart-cursor',
  'adm-chart-tip',
  // The network diagram's node links (R3-4b).
  'adm-net-link',
];
```

And a new test before `it('never dims a bar column, …')` (line 114), after the chart plot's ring test:

```tsx
  it('lets a network node link fill its box, and rings it outside it as the controls are ringed', () => {
    const css = stylesheet();
    expect(css).toContain(`.adm-net-link{display:block;width:100%;height:100%;border-radius:${ADMIN_RADIUS.control}px;}`);
    // Last in the controls' focus-visible list. It has no hover style (a hover shows its tooltip), so FOCUSABLE leaves it out.
    expect(css).toContain(`.adm-net-link:focus-visible{outline:2px solid ${ADMIN_COLORS.accent};outline-offset:2px;}`);
  });

```

R1-2's rule is that a chart which adds a fill adds a line to `chartMarks`. In `src/theme/__tests__/adminTheme.test.ts`, the import (line 2), before:

```ts
import {COLORS, FONT_SIZES, RADIUS} from '../../app-bridge';
```

After:

```ts
import {COLORS, FONT_SIZES, RADIUS, TIER_COLORS} from '../../app-bridge';
```

The end of `chartMarks` (lines 121-122), before:

```ts
      'No score stripes (muted)': ADMIN_COLORS.muted,
    };
```

After:

```ts
      'No score stripes (muted)': ADMIN_COLORS.muted,
      // The strength tiers: the network diagram's spokes and dots (R3-4b) and the tier split (R3).
      'Perfect tier': TIER_COLORS.perfect.color,
      'Strong tier': TIER_COLORS.strong.color,
      'Moderate tier': TIER_COLORS.moderate.color,
      'Weak tier': TIER_COLORS.weak.color,
    };
```

- [ ] **Step 7: Run them and see them fail**

Run: `pnpm vitest run src/charts/__tests__/NetworkDiagram.test.tsx src/theme`
Expected: FAIL, `Test Files  2 failed | 1 passed (3)` and `Tests  2 failed | 18 passed (20)`:
- `NetworkDiagram.test.tsx`: `Failed to resolve import "../NetworkDiagram" from "src/charts/__tests__/NetworkDiagram.test.tsx". Does the file exist?`
- `AdminStyles.test.tsx`: "defines every adm-* class in the contract" (`expected '…' to match /[.]adm-net-link(?![a-z-])/`) and the new ring test.
- `adminTheme.test.ts` passes, 7 of 7. The tiers clear 3:1 with room to spare (8.2:1 to 12.1:1); the lines keep them that way.

- [ ] **Step 8: Share the label halo**

In `src/charts/axis.ts`, before (lines 14-15):

```ts
/** The air between a tick label and the plot. */
export const TICK_GAP = SPACING.sm;
```

After:

```ts
/** The air between a tick label and the plot. */
export const TICK_GAP = SPACING.sm;
/**
 * The halo round a label drawn over marks: a stroke this wide in the page
 * colour, painted under the glyphs (paintOrder="stroke"), so 1.5px of page
 * shows round each one and a line crossing the label never cuts a letter.
 */
export const LABEL_HALO = 3;
```

In `src/charts/ScatterChart.tsx`, the import (line 5), before:

```tsx
import {LABEL_SIZE, labelWidth, labelX, px, yAxis} from './axis';
```

After:

```tsx
import {LABEL_HALO, LABEL_SIZE, labelWidth, labelX, px, yAxis} from './axis';
```

And its constants (lines 81-84), before:

```tsx
/** The keys that select the dot the slider announces. */
const SELECT_KEYS = new Set(['Enter', ' ']);
/** The y = x label's halo: a stroke 3px wide, so 1.5px of page colour shows outside each glyph. */
const LABEL_HALO = 3;
```

After:

```tsx
/** The keys that select the dot the slider announces. */
const SELECT_KEYS = new Set(['Enter', ' ']);
```

`DiagonalLabel` keeps `strokeWidth={LABEL_HALO}` as it is.

- [ ] **Step 9: Add the node link's class to AdminStyles**

In `src/theme/AdminStyles.tsx`, the controls' focus ring (line 90), before:

```tsx
.adm-nav-item:focus-visible,.adm-seg-btn:focus-visible,.adm-card-btn:focus-visible,.adm-input:focus-visible,.adm-select:focus-visible{${FOCUS_RING}outline-offset:2px;}
```

After:

```tsx
.adm-nav-item:focus-visible,.adm-seg-btn:focus-visible,.adm-card-btn:focus-visible,.adm-input:focus-visible,.adm-select:focus-visible,.adm-net-link:focus-visible{${FOCUS_RING}outline-offset:2px;}
```

And after the chart marks' states (line 103), before:

```tsx
.adm-chart-mark[data-dim="true"]{opacity:.4;}
.adm-chart-bar{transform-box:fill-box;transform-origin:50% 100%;animation:adm-chart-rise ${ENTER} both;}
```

After:

```tsx
.adm-chart-mark[data-dim="true"]{opacity:.4;}
.adm-net-link{display:block;width:100%;height:100%;border-radius:${R.control}px;}
.adm-chart-bar{transform-box:fill-box;transform-origin:50% 100%;animation:adm-chart-rise ${ENTER} both;}
```

The link has no transition or animation, so the reduced-motion block needs no line.

- [ ] **Step 10: Write the diagram**

Create `src/charts/NetworkDiagram.tsx`. Notes on the choices that look odd:
- **Its own `<svg>`, not `ChartSvg`.** `ChartSvg` scales by `viewBox` with `maxWidth: 100%`, so on the first 640px frame the drawing would shrink while the HTML links stayed put. Here the drawing is 1:1 in the clip layer, as the links are.
- **The clip layer.** The SVG and the links sit in an `absolute`, `overflow: hidden` layer (`CLIP`).
  - It clips the first 640px frame, which would otherwise scroll a 320px phone page sideways.
  - Being absolute, it adds nothing to the plot's min-content width, so the measured wrapper can narrow.
  - The tooltip sits outside the layer and is never cut off.
- **The ref on the wrapper, in both branches.** `useContainerWidth` starts observing on mount only (its effect depends on `[ref]`), so the measured element must exist from the first render, empty or not. ScatterChart does the same.
- **The active node by id, in `NetworkPlot`.** See Re-base notes 3 and 8. `findIndex` turns it into the index the parts draw with, −1 for none, which `dimmed` reads as "nothing picked".
- **`Spokes` returns a mapped array** (weakest first, so the strongest draw on top), as ScatterChart's `Dots` does.
- **Escape on each link** (`hideOnEscape`). Escape clears the active node and leaves focus where it is (WCAG 1.4.13), as `useChartCursor` and `useBarFocus` do. The next focus, Tab or hover shows a tooltip again.
- **No `onClick`.** A followed link needs nothing from the diagram: R3-7's page asks for the focus handoff when the URL names another card (R-48, header contract 11's "No click hook").
- **No `useMemo`.** The React Compiler memoizes, and `eslint.config.js` bans the hook. The placement lives in the outer component, which a hover never re-renders.

```tsx
import {useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {LinkButton, SPACING, useContainerWidth} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';
import {fmtInt} from '../ui/format';
import {LABEL_HALO, px} from './axis';
import {dataFlag, dimmed} from './barPaint';
import {EmptyChart} from './ChartSvg';
import {ChartTooltip, type TooltipContent} from './ChartTooltip';
import {RING, type PlotPoint} from './lineLayout';
import {NAME_SIZE, NODE_TARGET, networkLayout, spokeWidth, type NetworkLayout} from './networkLayout';
import type {Domain} from './scatter';
import {chartWidth, tooltipText, type SeriesDef} from './series';

/** The most nodes the diagram draws (R-37). The rest are counted under it, and the table view lists them. */
export const NETWORK_MAX_NODES = 12;

export interface NetworkNode {
  /** Unique and stable: React keys and the hover state use it. */
  id: string;
  /**
   * Printed beside the node, inside its link, where it fits, so `tooltip.title`
   * must contain it (label in name): a card's name, with the full name as the title.
   */
  label: string;
  /** The node is a react-router Link to this path. */
  href: string;
  /** The spoke's weight, within valueDomain. */
  value: number;
  /** The SeriesDef that colours the node's spoke and dot. */
  seriesId: string;
  /** Shown on hover and focus. Its text (tooltipText) is also the node link's accessible name (R-41). */
  tooltip: TooltipContent;
}

export interface NetworkDiagramProps {
  /** Strongest first. The first NETWORK_MAX_NODES are drawn, in this order. */
  nodes: readonly NetworkNode[];
  series: readonly SeriesDef[];
  /** Names the list of node links. */
  ariaLabel: string;
  /** The value range the spoke widths span (default 0 to 10, the engine's score scale). */
  valueDomain?: Domain;
  /** The plot's whole height in px, names included (default 340). */
  height?: number;
  /** Shown with more than NETWORK_MAX_NODES nodes: "and K more in the table" calls it. */
  onShowAll?: () => void;
  /** Shown in place of the plot when there are no nodes (default "No data to chart."). */
  emptyText?: string;
}

/** The drawn nodes, placed and painted: what NetworkDiagram hands NetworkPlot, and what a hover leaves alone. */
interface PlacedNetwork {
  layout: NetworkLayout;
  /** The drawn nodes, strongest first, as the layout's slots. */
  nodes: readonly NetworkNode[];
  /** Each node's series colour. */
  colors: readonly string[];
  /** Each node's spoke width in px. */
  widths: readonly number[];
}

/** A drawing part's props: the placed network and the active node's index, −1 for none. */
type Drawing = PlacedNetwork & {active: number};

const DEFAULT_HEIGHT = 340;
/** The engine's score scale. At module scope, not inline in the parameters (see ChartSvg's asIs). */
const SCORE_DOMAIN: Domain = [0, 10];
const NODE_RADIUS = 5;
const HUB_RADIUS = 8;
const WRAP: React.CSSProperties = {display: 'grid', gap: SPACING.sm, minWidth: 0};
/**
 * The clip layer the SVG and the links sit in. Until useContainerWidth
 * reports, the plot lays out at CHART_FALLBACK_WIDTH, which would scroll a
 * phone page sideways. Being absolute, it also adds nothing to the plot's
 * min-content width. The tooltip sits outside it, so it is never clipped.
 */
const CLIP: React.CSSProperties = {position: 'absolute', inset: 0, overflow: 'hidden'};
const SVG: React.CSSProperties = {display: 'block'};
const LIST: React.CSSProperties = {margin: 0, padding: 0, listStyle: 'none'};
const NOTE: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};
const NOTE_BUTTON: React.CSSProperties = {minHeight: NODE_TARGET};

/** Each node's series colour, neutral for a series the chart doesn't define (as the scatter's placeDots). */
function nodeColors(nodes: readonly NetworkNode[], series: readonly SeriesDef[]): string[] {
  const colorOf = new Map(series.map((s) => [s.id, s.color]));
  return nodes.map((node) => colorOf.get(node.seriesId) ?? ADMIN_COLORS.barNeutral);
}

/**
 * The spokes, hub to node, weakest first so the strongest draw on top. While
 * a node is active its spoke brightens and the others dim: the kit's
 * adm-chart-mark states, which reduced motion keeps from animating.
 */
function Spokes({layout, nodes, colors, widths, active}: Drawing) {
  const {hub, slots} = layout;
  return nodes
    .map((node, i) => (
      <line
        key={node.id}
        className="adm-chart-mark"
        data-active={dataFlag(i === active)}
        data-dim={dataFlag(dimmed(i, active))}
        x1={px(hub.x)}
        y1={px(hub.y)}
        x2={px(slots[i].x)}
        y2={px(slots[i].y)}
        stroke={colors[i]}
        strokeWidth={px(widths[i])}
        strokeLinecap="round"
      />
    ))
    .reverse();
}

/** A dot on its own page-coloured disc, RING wider, as the scatter's dots sit (R-23). `mark` names it for tests. */
function Disc({at, r, fill, mark}: {at: PlotPoint; r: number; fill: string; mark: string}) {
  return (
    <>
      <circle cx={px(at.x)} cy={px(at.y)} r={r + RING} fill={ADMIN_COLORS.page} />
      <circle data-mark={mark} cx={px(at.x)} cy={px(at.y)} r={r} fill={fill} />
    </>
  );
}

/** Each node's dot in its colour, the active one lifted by RING, and the hub: an unnamed dot in the text colour (R-38). */
function Dots({layout, nodes, colors, active}: Drawing) {
  return (
    <>
      {nodes.map((node, i) => (
        <Disc key={node.id} at={layout.slots[i]} r={i === active ? NODE_RADIUS + RING : NODE_RADIUS} fill={colors[i]} mark={node.id} />
      ))}
      <Disc at={layout.hub} r={HUB_RADIUS} fill={ADMIN_COLORS.text} mark="hub" />
    </>
  );
}

/** The names that fit, each beside its node with a page-coloured halo; the active node's in the text colour, the rest muted. */
function Names({layout, nodes, active}: Drawing) {
  return (
    <g
      fontSize={NAME_SIZE}
      fontWeight={500}
      stroke={ADMIN_COLORS.page}
      strokeWidth={LABEL_HALO}
      strokeLinejoin="round"
      paintOrder="stroke">
      {layout.names.map((name, i) =>
        name ? (
          <text
            key={nodes[i].id}
            x={px(name.textX)}
            y={px(name.textY)}
            textAnchor={name.anchor}
            dominantBaseline="central"
            fill={i === active ? ADMIN_COLORS.text : ADMIN_COLORS.muted}>
            {nodes[i].label}
          </text>
        ) : null,
      )}
    </g>
  );
}

interface NodeLinksProps {
  placed: PlacedNetwork;
  ariaLabel: string;
  onActive: (id: string | null) => void;
}

/** Escape hides the tooltip and leaves focus where it is (WCAG 1.4.13), as the kit's slider and bars do. */
function hideOnEscape(onActive: (id: string | null) => void): React.KeyboardEventHandler {
  return (event) => {
    if (event.key === 'Escape') onActive(null);
  };
}

/**
 * One link per node, strongest first, in a list `ariaLabel` names. Each covers
 * its node's 24px target and its printed name, and its accessible name is its
 * tooltip's text (R-41). Pointer and focus make it the active node, and
 * Escape hides its tooltip. A tap follows it, as any link: on a phone the
 * table view carries the scores.
 */
function NodeLinks({placed, ariaLabel, onActive}: NodeLinksProps) {
  return (
    <ul aria-label={ariaLabel} style={LIST}>
      {placed.nodes.map((node, i) => {
        const box = placed.layout.links[i];
        return (
          <li key={node.id} style={{position: 'absolute', left: box.x, top: box.y, width: box.width, height: box.height}}>
            <Link
              to={node.href}
              aria-label={tooltipText(node.tooltip)}
              className="adm-net-link"
              onPointerEnter={() => onActive(node.id)}
              onPointerLeave={() => onActive(null)}
              onFocus={() => onActive(node.id)}
              onBlur={() => onActive(null)}
              onKeyDown={hideOnEscape(onActive)}
            />
          </li>
        );
      })}
    </ul>
  );
}

/** The active node's tooltip, beside its dot; nothing without one. */
function NodeTooltip({layout, nodes, active}: Drawing) {
  if (active < 0) return null;
  const slot = layout.slots[active];
  return <ChartTooltip content={nodes[active].tooltip} x={slot.x} y={slot.y} bounds={layout.size} />;
}

/**
 * The drawing and the links over a network NetworkDiagram has placed. The
 * active node lives here, not in NetworkDiagram, so a hover or a focus
 * re-renders this alone and places nothing again (as ScatterChart's
 * ScatterPlot). It is held by id, not index: when the nodes change under it
 * with no leave or blur (a followed link brings another card's partners), an
 * id that is gone shows nothing, where an index would land on whichever node
 * took its place (R-46).
 */
function NetworkPlot({placed, ariaLabel}: {placed: PlacedNetwork; ariaLabel: string}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const drawing: Drawing = {...placed, active: placed.nodes.findIndex((node) => node.id === activeId)};
  const {width, height} = placed.layout.size;
  return (
    <>
      <div style={CLIP}>
        <svg aria-hidden="true" width={width} height={height} style={SVG}>
          <Spokes {...drawing} />
          <Dots {...drawing} />
          <Names {...drawing} />
        </svg>
        <NodeLinks placed={placed} ariaLabel={ariaLabel} onActive={setActiveId} />
      </div>
      <NodeTooltip {...drawing} />
    </>
  );
}

/** "and K more in the table" under the plot: a link-style button with onShowAll, else plain text. Nothing when every node is drawn. */
function MoreNote({more, onShowAll}: {more: number; onShowAll?: () => void}) {
  if (more <= 0) return null;
  return (
    <p style={NOTE}>
      {onShowAll ? (
        <LinkButton type="button" size="sm" onClick={onShowAll} style={NOTE_BUTTON}>
          and {fmtInt(more)} more in the table
        </LinkButton>
      ) : (
        `and ${fmtInt(more)} more in the table view`
      )}
    </p>
  );
}

/**
 * A radial ego network (decision R-13): an unnamed hub (R-38), and round it
 * the subject's strongest partners on one or two rings, strongest at 12
 * o'clock and then clockwise, the stronger half on the inner ring (R-37).
 * Each spoke takes its node's series colour, and its width grows with the
 * node's value. networkLayout places everything by rule; this draws it.
 *
 * The SVG is decoration (aria-hidden). Each node is a real link in a named
 * list, in strength order, covering at least 24px round its dot and its
 * printed name. Hover or focus shows the node's tooltip and dims the other
 * spokes (R-41). A name prints only where textWidth says it fits (R-40); one
 * that doesn't stays in the tooltip, the link's name and the table view the
 * page passes ChartFrame.
 *
 * This measures the width and places the network, and nothing else: the
 * active node lives in NetworkPlot. The width follows the container
 * (useContainerWidth). Until it is measured, and always in jsdom, it lays out
 * at CHART_FALLBACK_WIDTH, and the clip layer keeps that first frame from
 * widening the page.
 */
export function NetworkDiagram({
  nodes,
  series,
  ariaLabel,
  valueDomain = SCORE_DOMAIN,
  height = DEFAULT_HEIGHT,
  onShowAll,
  emptyText,
}: NetworkDiagramProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const width = chartWidth(useContainerWidth(wrapRef));

  if (nodes.length === 0) {
    return (
      <div ref={wrapRef} style={WRAP}>
        <EmptyChart text={emptyText} />
      </div>
    );
  }

  const shown = nodes.slice(0, NETWORK_MAX_NODES);
  const placed: PlacedNetwork = {
    layout: networkLayout({width, height}, shown.map((node) => node.label)),
    nodes: shown,
    colors: nodeColors(shown, series),
    widths: shown.map((node) => spokeWidth(node.value, valueDomain)),
  };
  return (
    <div ref={wrapRef} style={WRAP}>
      <div style={{position: 'relative', height}}>
        <NetworkPlot placed={placed} ariaLabel={ariaLabel} />
      </div>
      <MoreNote more={nodes.length - shown.length} onShowAll={onShowAll} />
    </div>
  );
}
```

- [ ] **Step 11: Run them and see them pass**

Run: `pnpm vitest run src/charts/__tests__/NetworkDiagram.test.tsx src/theme`
Expected: PASS, `Test Files  3 passed (3)` and `Tests  34 passed (34)`: NetworkDiagram 14, AdminStyles 13 and adminTheme 7.

Run: `pnpm vitest run src/charts src/theme`
Expected: PASS, `Test Files  18 passed (18)` and `Tests  255 passed (255)`. ScatterChart's 22 tests pass unchanged after the halo move.

- [ ] **Step 12: Add the stories to the kit's story file**

In `src/charts/Charts.stories.tsx`, the imports (lines 1-5), before:

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {FONTS, SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';
import {gapColor} from '../tools/analytics/gapColor';
```

After:

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {FONTS, SPACING, getStrengthTier} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';
import {TIER_COLOR, TIER_SERIES} from '../tools/analytics/cards/engineView';
import {gapColor} from '../tools/analytics/gapColor';
```

And (line 11), before:

```tsx
import {LineChart, type LineSeries} from './LineChart';
```

After:

```tsx
import {LineChart, type LineSeries} from './LineChart';
import {NetworkDiagram, type NetworkNode} from './NetworkDiagram';
```

Then append to the end of the file, after `export const ScatterSelected`:

```tsx
/**
 * A card's partners for the network stories, strongest first: whole-number
 * engine scores with ties, each tie in name order, as R3-4 sorts them (R-37).
 */
const PARTNERS: ReadonlyArray<readonly [string, number]> = [
  ['Anna', 10],
  ['Olaf', 10],
  ['Kristoff', 9],
  ['Grand Pabbie', 8],
  ['Hans', 8],
  ['Marshmallow', 8],
  ['Sven', 8],
  ['Oaken', 7],
  ['Bruni', 6],
  ['Duke of Weselton', 6],
  ['Iduna', 5],
  ['Agnarr', 4],
  ['Honeymaren', 3],
  ['Ryder', 3],
  ['Yelana', 2],
];
const PARTNER_RULES = ['Ramp', 'Shift Targets', 'Locations'];

/**
 * The first `count` partners as nodes: the short name printed, and in the
 * tooltip the full name (the printed one and a version, so label in name
 * holds), score, tier and rule.
 */
function partnerNodes(count: number, label: (name: string) => string = (name) => name): NetworkNode[] {
  return PARTNERS.slice(0, count).map(([name, score], i) => {
    const tier = getStrengthTier(score).label;
    const shown = label(name);
    return {
      id: String(i + 1),
      label: shown,
      href: `/cards/${i + 1}`,
      value: score,
      seriesId: tier,
      tooltip: {
        title: `${shown} - Story Version`,
        rows: [
          {value: fmtInt(score), label: `engine score · ${tier}`, color: TIER_COLOR[tier]},
          {value: PARTNER_RULES[i % PARTNER_RULES.length], label: 'rule'},
        ],
      },
    };
  });
}

interface NetworkCardProps {
  nodes: readonly NetworkNode[];
  subtitle: string;
  /** The panel's widest, for the phone-width story. */
  maxWidth?: number;
}

/**
 * The network in its frame, as R3-6c's Engine view sets it (R-39): an untitled
 * Panel, the tier legend, and the table of every partner. The frame's view is
 * controlled here, so "and K more in the table" opens the table view, which
 * takes focus.
 */
function NetworkCard({nodes, subtitle, maxWidth}: NetworkCardProps) {
  const [view, setView] = useState<ChartView>('chart');
  return (
    <MemoryRouter>
      <div style={{maxWidth}}>
        <Panel>
          <ChartFrame
            title="Strongest partners"
            subtitle={subtitle}
            legend={<ChartLegend series={TIER_SERIES} mark="line" />}
            table={{
              caption: 'Synergy partners of Queen Elsa, strongest first',
              columns: ['Partner', 'Score', 'Tier', 'Rules'],
              rows: nodes.map((node) => [node.tooltip.title, fmtInt(node.value), node.seriesId, node.tooltip.rows[1].value]),
            }}
            view={view}
            onViewChange={setView}>
            <NetworkDiagram
              nodes={nodes}
              series={TIER_SERIES}
              ariaLabel="Strongest synergy partners of Queen Elsa"
              onShowAll={() => setView('table')}
            />
          </ChartFrame>
        </Panel>
      </div>
    </MemoryRouter>
  );
}

/** Twelve partners on two rings: the stronger six inside. Hover or Tab to a node for its tooltip; the other spokes dim. */
export const NetworkTwoRings: Story = {
  render: () => <NetworkCard nodes={partnerNodes(12)} subtitle="The 12 strongest partners, clockwise from 12 o’clock" />,
};

/** Up to six partners share one ring. */
export const NetworkOneRing: Story = {
  render: () => <NetworkCard nodes={partnerNodes(5)} subtitle="Every partner, clockwise from 12 o’clock" />,
};

/** Fifteen partners: twelve drawn, and "and 3 more in the table" opens the frame's table view and focuses it. */
export const NetworkMoreInTable: Story = {
  render: () => <NetworkCard nodes={partnerNodes(15)} subtitle="The 12 strongest of 15 partners" />,
};

/** Long names: the ones textWidth says won't fit (R-40) stay in their tooltips, the link names and the table. */
export const NetworkLongNames: Story = {
  render: () => (
    <NetworkCard
      nodes={partnerNodes(12, (name) => `${name} of the Northern Mountains`)}
      subtitle="Names that don’t fit beside their nodes are left to the tooltip"
    />
  ),
};

/** A phone-width panel: the side names drop first. */
export const NetworkNarrow: Story = {
  render: () => <NetworkCard nodes={partnerNodes(12)} subtitle="At 320px" maxWidth={320} />,
};
```

`.storybook/preview.tsx` mounts `AdminStyles` for every story, so `adm-chart-mark` and `adm-net-link` are there. Check by hand in `pnpm storybook` (http://localhost:6007, "Admin/Charts"):
- hover and Tab move the tooltip and dim the other spokes;
- "and 3 more in the table" opens the table and focuses it;
- `NetworkNarrow` drops the side names and never scrolls sideways.

- [ ] **Step 13: Lint and typecheck**

Run: `pnpm lint` and `pnpm typecheck`
Expected: no errors and no warnings.

- [ ] **Step 14: Commit**, with the Bash tool and only after the owner approves. Stage first, as its own call:

```bash
git add src/charts/networkLayout.ts src/charts/NetworkDiagram.tsx src/charts/__tests__/networkLayout.test.ts src/charts/__tests__/NetworkDiagram.test.tsx src/charts/axis.ts src/charts/ScatterChart.tsx src/charts/Charts.stories.tsx src/theme/AdminStyles.tsx src/theme/__tests__/AdminStyles.test.tsx src/theme/__tests__/adminTheme.test.ts
```

Then, as its own unpiped call:

```bash
USER_APPROVED=1 git commit -m "feat(charts): add the synergy network diagram (#24)"
```

**Commit:** `feat(charts): add the synergy network diagram (#24)`

**For later tasks** (consequences of this re-base; the owning tasks apply them):
- **R3 header.**
  - Contract addition 11 (R3-card-analytics.md:267-314) already carries this block's names and signatures. Add this task's Escape sentence ("Escape hides the tooltip and keeps focus.") and the label-in-name comment on `NetworkNode` to its code block, so the two stay the same.
  - The bullet "`ChartTooltip` has `pointer-events: none`" still holds (ChartTooltip.tsx:77).
  - The `SplitBar` half of the kit block is R3-4c's (R-42 moves it to `src/ui`).
- **R3-6c.**
  - `partnerNodes` drops `ariaLabel`, and `partnerSentence` goes (R-41). The link's name is now the tooltip's text, so word the rows to read after their value, e.g. `{value: '8', label: 'engine score · Strong'}` and `{value: 'Ramp', label: 'rule'}`, which reads "Mulan - Elite Archer: 8 engine score · Strong, Ramp rule". Its test of the sentence becomes a check of `tooltipText(node.tooltip)`.
  - Each node's `tooltip.title` (the full name) must contain its `label` (the printed short name), for label in name. A Lorcana full name is "Name - Version", so `card.name` inside `card.fullName` holds it; a partner the card list doesn't hold prints and titles its id.
  - The `<NetworkDiagram>` call drops `center` (R-38). It keeps `onShowAll={() => setView('table')}` with ChartFrame's controlled view, sits in its own untitled Panel under the Engine view (R-39), and imports `NETWORK_MAX_NODES` from `NetworkDiagram` and `ONE_RING_MAX` from `networkLayout`, as before.
- **R3-7.**
  - It still keys the view by card id (R-46). The diagram no longer depends on that key to drop a stale tooltip, but the toggle and the pair list do.
  - A followed node link hands focus on through the page, not the diagram: `useCardHandoff` asks for the handoff when the URL names another card (R-48), and the new card's `h2` takes it. The node links take no `onFollow` (header contract 11, "No click hook").
- **R3-9.**
  - The plan commit already records `networkLayout.ts`, `NetworkDiagram.tsx`, `LABEL_HALO` and `adm-net-link` in R-redesign.md (the `src/charts/*` file-structure row, the "Chart kit (R1-3b)" block and the AdminStyles class list). R3-9 only checks them against the code as built.
  - Its NetworkDiagram block (R3-09-docs-check.md:1213-1232) gains the Escape sentence ("Escape hides the tooltip and keeps focus.") and the label-in-name rule on `NetworkNode.label`.
  - Add NetworkDiagram to CLAUDE.md's chart kit sentence.
  - At the real-data check, count the names `textWidth` drops at the panel's real width, and the network's tie subtitle.

<!--
Review of 2026-10-06 (sandbox-R3-4b-adv), applied in sandbox-R3-4b-fix3. Notes 1, 4, 5 and 6 applied as written. Rejected or applied in part:
- Note 2 (an onFollow prop, called on a node link's click, so the page can request the handoff): rejected. The re-based header already settles R-48 for node links. Contract 11's "No click hook" (R3-card-analytics.md:315) and "Focus" under States (R3-card-analytics.md:480-482) say the page asks for the handoff when the URL names another card, through R3-7's useCardHandoff. The header's review log (R3-card-analytics.md:778) and R3-07-route-page.md:19 record why the click-time request fails: a router Link navigates in a transition, so the old card's h2, still mounted, takes the request first. A mutation in sandbox-R3-7 showed it (the partner-link and Cards-to-review tests fail). So "neither route is written down" doesn't hold. Applied instead: a re-base note, a Step 10 note, a line in the contract comment, and an R3-7 bullet under "For later tasks", all pointing to the page's handoff. Without the prop, Step 11's counts are NetworkDiagram 14, 34 in all, and 255 for src/charts plus src/theme (checked).
- Note 3 (list the deltas from contract addition 11): applied in part. Its premise is stale. R3-card-analytics.md now holds this task's re-based block as addition 11 (lines 267-314), with ringSlots(count, plot), labelFor(slot, text), nodeTarget, Box = PlotPoint & Size, RING_MARGIN as SPACING.xxxl + SPACING.sm, and emptyText. None of the old names it quotes (boxAround, ringSlots(count, center, radii), labelFor(..., gap), interface Box) are there; grep finds them only in the outline. Applied: the intro now names addition 11 as already carrying the block, and lists the deltas against the outline's block (outline lines 29-58), which is where those names came from. The "R3 header" bullet asks for only this task's two new comments, not for the block to be replaced.
- Note 6, first item: applied. The header already dropped "Text measurement" (its re-base note 7; the Test isolation block at R3-card-analytics.md:593 has no such bullet). Re-base note 5 says so too.
-->
