> Part of [R: Admin redesign](../R-redesign.md), phase R3 ([R3-card-analytics.md](R3-card-analytics.md)). Read the main plan's decisions (R-28 to R-56 for R3), corrections, global constraints and shared interfaces, then the R3 header, first.

> **Re-base notes (R3-4c, 2026-10-06).** Re-based from the 2026-10-01 outline ("Task R3-4c: Split bar (chart kit)") onto main @ aea40b4 (R2 as built, pin bc877e1) and decisions R-42 and R-43. What changed and why:
> 1. **It leaves the chart kit (R-42).** The outline's `src/charts/SplitBar.tsx` becomes `src/ui/SplitMeter.tsx`, a primitive beside `MeterBar` and `BiasBar`. CLAUDE.md asks every kit chart for a tooltip the keyboard reaches and a Chart | Table toggle (R-12). R1 and R2 kept meters that print their own values in `src/ui`, so this one goes there too and needs neither. As planned, `SplitBar` scored 9.44 on CodeScene: a Brain Method with cc 20 (audit). The rewrite is four small components, each taking one object argument.
> 2. **Dropped:** the kit `SplitBar` and `SplitBarProps`, `src/charts/shares.ts` with largest-remainder `sharesOf`, and the centred form: `centerId`, the lead and trail spacers and the 50% tick. Only 53 cards have 3 or more accuracy answers (R-42). Also dropped:
>    - the hover state, the tooltip and the 24px hit targets;
>    - the fade to 0.55;
>    - the `unit`, `height` and `series` props;
>    - `SplitBar.stories.tsx`.
>
>    The audit's findings about the old form go with it: touch and keyboard reach, hover through `data-active`, the tooltip anchor, the tick on an unknown `centerId`, and the drift from flex-basis padding.
> 3. **Each part carries its own label and colour.** `src/ui` never imports from `src/charts` (the direction is charts → ui, and Step 1 checks that no `src/ui` file breaks it). So the meter can't take a `SeriesDef[]` or `SURFACE_GAP`. A part is `{id, label, color, value}`, and the 2px gap is `SPACING.xxs`, which is `SURFACE_GAP`'s own value. R3-6b and R3-6c build the parts (`accuracyParts`, `tierParts`).
> 4. **Shares (R-43).** Each part's share is `sharePercent(part.value / total)` from `src/ui/format.ts`, which R3-1a moves there from `calibration/chartData.ts`. Each part rounds on its own:
>    - A part with a count never reads 0% ("<1%").
>    - A part one short of the whole never reads 100% (">99%").
>    - Equal counts read alike (1/1/1 reads 33% three times, not 34/33/33).
>    - The shares can sum to 99% or 101%.
>
>    The tests pin all four. The outline's `sharesOf` table and its claim that a legend "never reads 99% or 101%" go.
> 5. **The mark** is one full-width bar, 10px thick, as the prototype draws it (dc.html:636). Its parts fill the width left to right, with no centring.
>    - The prototype joins segments with no gap. The `dataviz` mark spec puts a 2px surface gap between touching fills, so the segments sit on the surface with `columnGap: SPACING.xxs`. That is why the `barTrack` track shows only when the meter is empty: a track under the segments would show in the gaps.
>    - The bar's outer ends round at `RADIUS.sm` through `overflow: hidden` on the row, and the inner joins stay square, as the outline had them. No per-segment corner logic is needed.
>    - With no centring, the outline's reason to avoid a flex `gap` is gone.
>    - A part above zero is never narrower than 4px (`SPACING.xs`), so a "<1%" part still shows.
> 6. **The legend** keeps the outline's text, "Too high 24% (12)": a swatch, the label, the share in `text` at weight 600, and the count in muted.
>    - It is a `<ul>` named by `ariaLabel`, styled like `ChartLegend`'s list (wrapping, `ADMIN_TYPE.label`, muted, never `dim`, R-6).
>    - The swatch is `ChartLegend`'s 10px rect swatch (`SPACING.md − SPACING.xxs`), which the Community scores histogram's legend draws in the neighbouring panel, not the handoff's 8px.
>    - There is no tooltip, so there's no unit. That makes the audit's "1 votes" plural finding moot.
>    - It isn't `role="meter"`, which models one value; a list carries several.
> 7. **"No answers yet."** When every part is zero, or there are no parts, the meter shows the bare `barTrack` track and one muted line, `emptyText`, which defaults to "No answers yet.". It renders no list then, because a legend of "0% (0)" rows would be noise.
> 8. **No hatch.** `SplitMeterPart` has no `pattern`: neither use has a "No score" part (audit, cosmetic).
> 9. **Stories** join `src/ui/Primitives.stories.tsx` as `SplitMeters`, each meter in a titled `Panel` on the file's admin-page decorator.
>    - The tier colours come through the bridge (`TIER_COLORS`, which R3-1 adds), not R3-4's `TIER_SERIES`: `src/ui` never imports from `src/tools`.
>    - One panel sits at the 376px two-up chart track (header item 4), so the wrapping legend is visible.
> 10. **Code Health.** `SplitMeter`, `SplitSegments`, `SplitLegend` and `SplitEmpty` each take one object argument, so the module has no primitive arguments. Each has cc ≤ 2.
>     - The test helpers take an object (`answers({tooHigh, right, tooLow})`) or nothing (`legendRows()`).
>     - The story helper takes an object.
>     - A local 10.0 is not proof, because the server gate is stricter (audit-synth, "CodeScene"). Run `analyze_change_set` before the push, as R3-9 does.
> 11. **Prerequisites.** R3-1a must have landed, for `sharePercent` in `src/ui/format.ts`. So must R3-1, for `TIER_COLORS` on the bridge, which only the stories use. In the new task order this task runs 8th, after both.
>     - R3-1a also inserts a `LowNTag` import and a `Tags` story into `Primitives.stories.tsx`, its `TAG_ROW`/`Tags` block directly above `const SCORES`. So "after `Bars` and before `const SCORES`" fits two places, and `};` is no unique anchor.
>     - This task's anchors are the `SegmentedControl`/`Sparkline` import pair, and R3-1a's `const TAG_ROW` line. The new block lands between `Bars` and R3-1a's `Tags`.
> 12. **The commit scope is `ui`.** It was `charts`.
> 13. **Changes header addition 12.** The part type is `SplitMeterPart`, not `SplitPart`, and the meter takes a required `ariaLabel`, because the legend is a named list. The R3 header asks a task that changes a contract name to say so here; its addition 12 now has this form.
>
> **Verified (2026-10-06)** in a scratch sandbox: copies of `src/` and the configs, junctions to the repo's `node_modules` and `upstream/`, and the Vite cache and tsbuildinfo kept in the sandbox. The repo's tree and caches stayed untouched.
> - **Against main.** With R3-1a's `sharePercent` and R3-1's `TIER_COLORS` export stubbed in as those tasks specify:
>   - Without `SplitMeter.tsx`, Step 3 fails with the `Failed to resolve import` message quoted below.
>   - With it, Step 5 gives `Tests 10 passed (10)`, and `vitest run src/ui` gives 11 files and 73 tests.
> - **Against R3-1a's re-based `src/ui`.** Its `format.ts`, `DataAsOf`, `LowNTag`, `layout.ts`, tests and stories, with this task applied on top: `vitest run src/ui` gives 14 files and 86 tests.
> - **The tests bite.** Each style assertion was mutation-checked: a changed `flexGrow`, `columnGap`, bar height, radius, `overflow`, `minWidth`, swatch fill or empty-track fill each fails its test, and so does the share in `dim` or at weight 400.
> - **The story renders.** Step 6's edits apply by exact match on top of R3-1a's (each anchor matches once), and `composeStories` renders `SplitMeters` in jsdom with the legend text given under Step 6.
> - **Lint and types.** `tsc -p tsconfig.app.json` is clean. `eslint --max-warnings 0` is clean on all three files, both in the sandbox and through `pnpm exec eslint --stdin` against the repo's config.
> - **Code Health.** CodeScene MCP 1.1.3 scores all three files 10.0.

### Task R3-4c: Split meter (a `src/ui` primitive)

**Files:**
- Create `src/ui/SplitMeter.tsx`.
- Test: create `src/ui/__tests__/SplitMeter.test.tsx`.
- Modify `src/ui/Primitives.stories.tsx`: the `SplitMeters` story.

**Interfaces:**
- **Consumes:**
  - Through the bridge: `RADIUS` (`xs` 2, `sm` 4) and `SPACING` (`xxs` 2, `xs` 4, `sm` 8, `md` 12, `lg` 16), unchanged at bc877e1. The stories also use `TIER_COLORS` (R3-1): `{perfect, strong, moderate, weak}`, each `{color, bg}`.
  - From the theme: `ADMIN_COLORS.barTrack`, `.muted` and `.text`, plus `ADMIN_TYPE.label`. The tests and stories also use `.over`, `.barNeutral` and `.under`.
  - From `src/ui/format.ts`: `fmtInt(n: number): string`, and `sharePercent(fraction: number): string` (R3-1a, unchanged).
  - In the stories: `Panel` and the file's own `Stack`.
- **Produces:** the code block of the R3 header's contract addition 12 (re-base note 13):
  ```ts
  // src/ui/SplitMeter.tsx — how a few counts divide one whole: one full-width bar, and a legend of shares and counts (R3-4c, R-42)
  export interface SplitMeterPart {id: string; label: string; color: string; value: number}
  // parts: left to right; a zero part draws no segment but keeps its legend row.
  // ariaLabel names the legend list. emptyText (default "No answers yet.") shows under the bare track when every part is zero.
  export function SplitMeter(props: {parts: readonly SplitMeterPart[]; ariaLabel: string; emptyText?: string});
  ```
  The props interface stays private, as `MeterBar`'s does. Only the part type is exported, because R3-6's builders return it.

**How it draws:**
- **The bar is decoration** (`aria-hidden`). It is one flex row, 10px tall, with `columnGap` 2px on the surface, and `RADIUS.sm` outer ends through the row's clip.
  - Each part above zero is a `div[data-part]` with `flexGrow` set to its count (`flexShrink: 0`, `flexBasis: 0`, `minWidth: 4px`), painted `backgroundColor: part.color`.
  - The row fills its container, and the wrapper is a `minWidth: 0` grid, so the meter shrinks inside a grid track.
- **The legend** sits 8px under the bar (`SPACING.sm`). It is a `<ul aria-label={ariaLabel}>`, and each `<li>` holds:
  - a 10px swatch in the part's colour, `aria-hidden`;
  - the label;
  - the share (`text`, weight 600);
  - the count in brackets.

  The `{' '}` spaces keep each row one phrase for assistive tech ("Too high 24% (12)"), while the flex gap does the visual spacing. Text never wears the part's colour.
- **Empty** (the parts sum to 0, or there are no parts): the bare 10px track in `barTrack` (`aria-hidden`), with `emptyText` under it in muted `ADMIN_TYPE.label`. No list.
- **Interaction:** none. There is no hover, focus or motion, so nothing has to respect reduced motion. In forced-colors mode the fills drop, as `MeterBar`'s do, and the legend still carries every number.

- [ ] **Step 1: Check what this task builds on**

Run with the Bash tool:
```bash
grep -n "export function sharePercent" src/ui/format.ts
grep -n "TIER_COLORS" src/app-bridge.ts
grep -rln "from '\.\./charts\|from '\.\./tools" src/ui
ls src/ui/SplitMeter.tsx
```
Expected:
- one line each from the first two;
- nothing from the third (no `src/ui` file imports the kit or a tool);
- `ls: cannot access 'src/ui/SplitMeter.tsx': No such file or directory` from the fourth.

If either of the first two prints nothing, R3-1a or R3-1 hasn't landed. Stop and do that task first.

- [ ] **Step 2: Write the failing test**

Create `src/ui/__tests__/SplitMeter.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {SplitMeter, type SplitMeterPart} from '../SplitMeter';

const ANSWERS = [
  {id: 'tooHigh', label: 'Too high', color: ADMIN_COLORS.over},
  {id: 'right', label: 'Right', color: ADMIN_COLORS.barNeutral},
  {id: 'tooLow', label: 'Too low', color: ADMIN_COLORS.under},
] as const;

type Counts = Record<(typeof ANSWERS)[number]['id'], number>;

/** The three accuracy answers with these counts, too high to too low. */
function answers(counts: Counts): SplitMeterPart[] {
  return ANSWERS.map((part) => ({...part, value: counts[part.id]}));
}

/** Every test names its meter this. */
const NAME = 'Accuracy answers';

/** The legend's rows, as text. */
function legendRows() {
  return within(screen.getByRole('list', {name: NAME}))
    .getAllByRole('listitem')
    .map((item) => item.textContent);
}

describe('SplitMeter', () => {
  it('prints every part’s label, share and count in a list named by ariaLabel, zero parts included', () => {
    render(<SplitMeter parts={answers({tooHigh: 12, right: 30, tooLow: 0})} ariaLabel={NAME} />);
    expect(legendRows()).toEqual(['Too high 29% (12)', 'Right 71% (30)', 'Too low 0% (0)']);
  });

  it.each<[Counts, string[]]>([
    // R-43: a part with a count never reads 0%, and one short of the whole never reads 100%.
    [{tooHigh: 1, right: 399, tooLow: 0}, ['Too high <1% (1)', 'Right >99% (399)', 'Too low 0% (0)']],
    // Each part rounds on its own, so equal counts read alike (and these sum to 99%).
    [{tooHigh: 1, right: 1, tooLow: 1}, ['Too high 33% (1)', 'Right 33% (1)', 'Too low 33% (1)']],
    // A part with every count reads 100%, and counts are grouped.
    [{tooHigh: 0, right: 2054, tooLow: 0}, ['Too high 0% (0)', 'Right 100% (2,054)', 'Too low 0% (0)']],
  ])('prints %j as %j', (counts, rows) => {
    render(<SplitMeter parts={answers(counts)} ariaLabel={NAME} />);
    expect(legendRows()).toEqual(rows);
  });

  it('keeps text in text colours: the swatch carries the part’s colour', () => {
    render(<SplitMeter parts={answers({tooHigh: 12, right: 30, tooLow: 8})} ariaLabel={NAME} />);
    const list = screen.getByRole('list', {name: NAME});
    expect(list).toHaveStyle({color: ADMIN_COLORS.muted});
    const [first] = within(list).getAllByRole('listitem');
    expect(first.querySelector('[aria-hidden="true"]')).toHaveStyle({backgroundColor: ADMIN_COLORS.over});
    expect(within(first).getByText('24%')).toHaveStyle({color: ADMIN_COLORS.text, fontWeight: '600'});
  });

  it('draws one segment per part above zero, in order, grown by its count and painted its colour', () => {
    const {container} = render(
      <SplitMeter parts={answers({tooHigh: 12, right: 30, tooLow: 0})} ariaLabel={NAME} />,
    );
    const segments = Array.from(container.querySelectorAll<HTMLElement>('[data-part]'));
    expect(segments.map((segment) => segment.dataset.part)).toEqual(['tooHigh', 'right']);
    expect(segments[0]).toHaveStyle({flexGrow: '12', backgroundColor: ADMIN_COLORS.over});
    expect(segments[1]).toHaveStyle({flexGrow: '30', backgroundColor: ADMIN_COLORS.barNeutral});
  });

  it('hides the bar from assistive tech, with the surface gap between segments and rounded outer ends', () => {
    const {container} = render(
      <SplitMeter parts={answers({tooHigh: 12, right: 30, tooLow: 8})} ariaLabel={NAME} />,
    );
    const bar = container.querySelector('[data-part]')?.parentElement;
    expect(bar).toHaveAttribute('aria-hidden', 'true');
    expect(bar).toHaveStyle({columnGap: '2px', height: '10px', borderRadius: '4px', overflow: 'hidden'});
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
  });

  it('keeps a part with a sliver of the whole visible, 4px wide or more', () => {
    const {container} = render(
      <SplitMeter parts={answers({tooHigh: 1, right: 399, tooLow: 0})} ariaLabel={NAME} />,
    );
    expect(container.querySelector('[data-part="tooHigh"]')).toHaveStyle({minWidth: '4px'});
  });

  it('shows the bare track and "No answers yet." when every part is zero', () => {
    const {container} = render(
      <SplitMeter parts={answers({tooHigh: 0, right: 0, tooLow: 0})} ariaLabel={NAME} />,
    );
    expect(screen.getByText('No answers yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-part]')).toHaveLength(0);
    expect(container.querySelector('[aria-hidden="true"]')).toHaveStyle({backgroundColor: ADMIN_COLORS.barTrack});
  });

  it('takes the empty line from emptyText, and treats no parts as empty', () => {
    render(<SplitMeter parts={[]} ariaLabel="Partners by strength tier" emptyText="No synergy partners." />);
    expect(screen.getByText('No synergy partners.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run it and see it fail**

Run: `pnpm vitest run src/ui/__tests__/SplitMeter.test.tsx`
Expected: FAIL, `Test Files 1 failed (1)`, `Tests no tests`, with `Error: Failed to resolve import "../SplitMeter" from "src/ui/__tests__/SplitMeter.test.tsx". Does the file exist?`

- [ ] **Step 4: Write the meter**

Create `src/ui/SplitMeter.tsx`:

```tsx
import {RADIUS, SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../theme/adminTheme';
import {fmtInt, sharePercent} from './format';

/** One part of a split: a count, with the name and colour it is drawn in. */
export interface SplitMeterPart {
  /** Keys the part; unique within one meter. */
  id: string;
  /** The part's name in the legend. Text stays in text colours, never `color`. */
  label: string;
  /** Paints the part's segment and its legend swatch. */
  color: string;
  /** A count, 0 or more. */
  value: number;
}

interface SplitMeterProps {
  /** Left to right, in reading order. A zero part draws no segment but keeps its legend row. */
  parts: readonly SplitMeterPart[];
  /** Names the legend list, which carries every share and count. */
  ariaLabel: string;
  /** The line under the bare track when every part is zero (default "No answers yet."). */
  emptyText?: string;
}

/** The bar's thickness in px: the handoff prototype's 10, under the mark spec's 24px cap. */
const BAR = 10;
/** A part above zero never draws narrower than this, so a "<1%" part still shows. */
const MIN_SEGMENT = SPACING.xs;
/**
 * The legend swatch: ChartLegend's 10px rect swatch (SPACING.md − SPACING.xxs), which the
 * Community scores histogram's legend draws in the neighbouring panel, not the handoff's 8px.
 */
const SWATCH = SPACING.md - SPACING.xxs;

const STACK: React.CSSProperties = {display: 'grid', gap: SPACING.sm, minWidth: 0};

/** ChartLegend's list: wrapping rows of label-size muted text. */
const LEGEND: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: `${SPACING.xs}px ${SPACING.lg}px`,
  margin: 0,
  padding: 0,
  listStyle: 'none',
  fontSize: ADMIN_TYPE.label,
  color: ADMIN_COLORS.muted,
};

const ITEM: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: SPACING.xs};

/**
 * The parts as one bar, decoration only (aria-hidden): each part above zero is
 * a segment that grows by its count. The 2px surface gap separates touching
 * segments (the dataviz mark spec), and the clip rounds only the bar's outer
 * ends, so its inner joins stay square.
 */
function SplitSegments({parts}: {parts: readonly SplitMeterPart[]}) {
  return (
    <div
      aria-hidden="true"
      style={{display: 'flex', columnGap: SPACING.xxs, height: BAR, borderRadius: RADIUS.sm, overflow: 'hidden'}}>
      {parts
        .filter((part) => part.value > 0)
        .map((part) => (
          <div
            key={part.id}
            data-part={part.id}
            style={{flexGrow: part.value, flexShrink: 0, flexBasis: 0, minWidth: MIN_SEGMENT, backgroundColor: part.color}}
          />
        ))}
    </div>
  );
}

/** Every part's swatch, label, share of `total` and count, zero parts included: "Too high 24% (12)". */
function SplitLegend({parts, total, ariaLabel}: {parts: readonly SplitMeterPart[]; total: number; ariaLabel: string}) {
  return (
    <ul aria-label={ariaLabel} style={LEGEND}>
      {parts.map((part) => (
        <li key={part.id} style={ITEM}>
          <span
            aria-hidden="true"
            style={{flex: 'none', width: SWATCH, height: SWATCH, borderRadius: RADIUS.xs, backgroundColor: part.color}}
          />
          {/* The spaces keep the text one phrase for assistive tech; the flex gap does the visual spacing. */}
          {part.label}{' '}
          <span style={{color: ADMIN_COLORS.text, fontWeight: 600}}>{sharePercent(part.value / total)}</span>{' '}
          <span>({fmtInt(part.value)})</span>
        </li>
      ))}
    </ul>
  );
}

/** Nothing to split: the bare track, and a line that says why. */
function SplitEmpty({text}: {text: string}) {
  return (
    <div style={STACK}>
      <div aria-hidden="true" style={{height: BAR, borderRadius: RADIUS.sm, backgroundColor: ADMIN_COLORS.barTrack}} />
      <p style={{margin: 0, fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted}}>{text}</p>
    </div>
  );
}

/**
 * How a few counts divide one whole, as one full-width bar over the track
 * with a legend under it (R-42): the accuracy answers (too high, right, too
 * low) and a card's partners by strength tier. A MeterBar shows one ratio
 * against its limit; this shows the whole's parts side by side.
 *
 * The legend, a list named by `ariaLabel`, prints every part's share and
 * count, so the bar is decoration and the meter needs no tooltip and no
 * Chart/Table toggle. Each share rounds on its own (`sharePercent`, R-43): a
 * part with a count never reads 0%, one short of the whole never reads 100%,
 * and the shares may sum to 99% or 101%. With every part at zero, or no
 * parts, it shows the bare track and `emptyText`.
 */
export function SplitMeter({parts, ariaLabel, emptyText = 'No answers yet.'}: SplitMeterProps) {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  if (total > 0) {
    return (
      <div style={STACK}>
        <SplitSegments parts={parts} />
        <SplitLegend parts={parts} total={total} ariaLabel={ariaLabel} />
      </div>
    );
  }
  return <SplitEmpty text={emptyText} />;
}
```

- [ ] **Step 5: Run the tests and see them pass**

Run: `pnpm vitest run src/ui/__tests__/SplitMeter.test.tsx`
Expected: PASS, `Tests 10 passed (10)`. The `it.each` table counts as three.

Run: `pnpm vitest run src/ui`
Expected: PASS, every file. After R3-1a as re-based, that is `Test Files 14 passed (14)`, `Tests 86 passed (86)`. If R3-1a landed with a different number of tests, expect its count plus this file's 10.

- [ ] **Step 6: Add the stories**

In `src/ui/Primitives.stories.tsx`, change the bridge import. Before:
```tsx
import {FONTS, LinkButton, SPACING} from '../app-bridge';
```
After:
```tsx
import {FONTS, LinkButton, SPACING, TIER_COLORS} from '../app-bridge';
```

Add the meter's import after `Sparkline`'s, keeping the imports in order. Before:
```tsx
import {SegmentedControl} from './SegmentedControl';
import {Sparkline} from './Sparkline';
```
After:
```tsx
import {SegmentedControl} from './SegmentedControl';
import {Sparkline} from './Sparkline';
import {SplitMeter, type SplitMeterPart} from './SplitMeter';
```

Insert this block, followed by one blank line, immediately above R3-1a's `const TAG_ROW: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: SPACING.sm};`. That line is unique in the file, and the block lands between the `Bars` story and R3-1a's `Tags`. The meters then sit right after `MeterBar` and `BiasBar` in the sidebar's story order.
```tsx
const ANSWERS = [
  {id: 'tooHigh', label: 'Too high', color: ADMIN_COLORS.over},
  {id: 'right', label: 'Right', color: ADMIN_COLORS.barNeutral},
  {id: 'tooLow', label: 'Too low', color: ADMIN_COLORS.under},
] as const;

/** The three accuracy answers with these counts, too high to too low. */
function answers(counts: Record<(typeof ANSWERS)[number]['id'], number>): SplitMeterPart[] {
  return ANSWERS.map((part) => ({...part, value: counts[part.id]}));
}

/** A card's partners by strength tier: the app's tier colours, its getStrengthTier thresholds. */
const TIERS: SplitMeterPart[] = [
  {id: 'Perfect', label: 'Perfect ≥9.5', color: TIER_COLORS.perfect.color, value: 6},
  {id: 'Strong', label: 'Strong ≥7', color: TIER_COLORS.strong.color, value: 41},
  {id: 'Moderate', label: 'Moderate ≥4', color: TIER_COLORS.moderate.color, value: 77},
  {id: 'Weak', label: 'Weak <4', color: TIER_COLORS.weak.color, value: 18},
];

const ACCURACY_NAME = 'Is the engine’s score right?';

export const SplitMeters: Story = {
  render: () => (
    <Stack>
      <Panel title="SplitMeter: the accuracy answers">
        <SplitMeter parts={answers({tooHigh: 12, right: 30, tooLow: 8})} ariaLabel={ACCURACY_NAME} />
      </Panel>
      <Panel title="A part with no answers keeps its legend row">
        <SplitMeter parts={answers({tooHigh: 0, right: 9, tooLow: 3})} ariaLabel={ACCURACY_NAME} />
      </Panel>
      <Panel title="One answer in 400: a 4px sliver that reads <1%">
        <SplitMeter parts={answers({tooHigh: 1, right: 399, tooLow: 0})} ariaLabel={ACCURACY_NAME} />
      </Panel>
      <Panel title="Partners by strength tier">
        <SplitMeter parts={TIERS} ariaLabel="Partners by strength tier" />
      </Panel>
      <div style={{maxWidth: 376}}>
        <Panel title="At R3’s two-up chart track, 376px: the legend wraps">
          <SplitMeter parts={TIERS} ariaLabel="Partners by strength tier" />
        </Panel>
      </div>
      <Panel title="No answers yet">
        <SplitMeter parts={answers({tooHigh: 0, right: 0, tooLow: 0})} ariaLabel={ACCURACY_NAME} />
      </Panel>
    </Stack>
  ),
};
```

In jsdom, the story's three accuracy legends read:
- `Too high 24% (12)` / `Right 60% (30)` / `Too low 16% (8)`;
- `Too high 0% (0)` / `Right 75% (9)` / `Too low 25% (3)`;
- `Too high <1% (1)` / `Right >99% (399)` / `Too low 0% (0)`.

The tiers read `Perfect ≥9.5 4% (6)` / `Strong ≥7 29% (41)` / `Moderate ≥4 54% (77)` / `Weak <4 13% (18)`. The last panel reads "No answers yet.".

- [ ] **Step 7: Look at it in Storybook**

Run `pnpm storybook` and open **Admin/UI/Primitives → Split Meters** at http://localhost:6007. Check:
- **The bars.** Each bar runs the full panel width. Only its outer ends are rounded. The segments are split by thin gaps the colour of the panel, not by a lighter line.
- **The sliver.** The 1-in-400 panel's red sliver is visible at the left end.
- **The 376px panel.** The tier legend wraps onto a second row, and no row overflows.
- **The empty panel.** "No answers yet" shows the plain grey track.
- **Accessibility.** Storybook's Accessibility panel reports no violations for the story.

Stop the server afterwards. If no browser is available to the implementer, record each check as pending with the owner, as R1-2's Step 11 did, and say so in the report.

- [ ] **Step 8: Lint and typecheck**

Run: `pnpm lint` and `pnpm typecheck`
Expected: both pass, with no warnings in the three files.

- [ ] **Step 9: Commit**, with the Bash tool and only after the owner approves. Use two separate calls, so the commit command starts with `USER_APPROVED=1`:

```bash
git add src/ui/SplitMeter.tsx src/ui/__tests__/SplitMeter.test.tsx src/ui/Primitives.stories.tsx
```

```bash
USER_APPROVED=1 git commit -m "feat(ui): add the split meter (#24)"
```

Husky's pre-commit runs lint and the tests. If Vitest fails to start its workers under load, stop this session's preview servers (Step 7's Storybook included), wait out other sessions' runs, and retry.

### Hand-offs from R3-4c

- **R3-9 (docs).**
  - In CLAUDE.md's tools paragraph, change "`Sparkline`, `MeterBar` and `BiasBar` stay `src/ui` primitives" to add `SplitMeter`. The chart rule needs no exception, because the meter is not a kit chart.
  - The plan commit records `SplitMeter` in R-redesign.md.
  - "Chart kit (R1-3b)" gains nothing from R3-4c.

<!--
Review fixes (2026-10-06): all nine notes applied; none rejected. Where the applied form differs from the note's wording:
- Note 1(c), 1(d): this pass edits only R3-04c-split-meter.md, so the header's task-order row is a new "R3 header" hand-off bullet, and Step 9 takes the header's commit message, `feat(ui): add the split meter (#24)`.
- Note 3: the hand-off follows R3-6b's existing draft, not the note's emptyText "No votes answered the accuracy question yet.". That draft's AccuracySplit prints the question above the meter and passes emptyText "No accuracy answers yet.", and its view test ("says where nobody answered") finds that text. The note's own wording would make this hand-off contradict the task that consumes it. The note's substance stands: the empty line names the question, the caption shows only when answered > 0, the [data-center-tick] test goes, and the list name uses ’.
- Note 6: the story title is "At R3’s two-up chart track, 376px: the legend wraps", with ’ to match the plan's other UI text.
- Note 5: the SWATCH doc comment wraps onto two lines.
Re-verified in scratchpad/r3-rebase/sandbox-4c-fix, with the code blocks extracted verbatim from this file and R3-1a's Tags block applied first. Step 6's anchors each match once. vitest run src/ui: 11 files and 73 tests pass. The new share assertion fails when the share is `dim` or at weight 400. The SplitMeters story renders through composeStories. tsc -p tsconfig.app.json is clean, and pnpm exec eslint --max-warnings 0 --stdin is clean on all three files in the repo. CodeScene MCP 1.1.3 scores all three files 10.
-->
