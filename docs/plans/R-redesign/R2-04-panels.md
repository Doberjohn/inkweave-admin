> Part of [R: Admin redesign](../R-redesign.md), phase R2 ([R2-calibration-tuning.md](R2-calibration-tuning.md)). Read the main plan's decisions (R-17 to R-26 for R2), corrections, global constraints and shared interfaces, then the R2 header, first.

> **Owner decision (2026-10-05, R-27): option (a).** Implement every part marked "only (a)" and skip every part marked "only (b)" or "neither". No need to ask the owner before Step 1.

> **Re-base notes (R2-4, 2026-10-05, against main `c92e260`, pin `bc877e1`).** What changed from the 2026-10-01 outline, and why:
> - **Code basis.** All three components and their stories are still exactly as they were before R1: their last commit is `135f8c1`, and R1 never touched them. Every Before block below is the real file, byte for byte apart from line endings (the checkout is CRLF, this plan LF; every step replaces the whole file, so it doesn't matter). The outline's line references hold (`PairList.tsx:24-51` CtaButton rows, `:30-39` the style, `:40-50` the spans). No app or engine fact is involved, so the pin move changes nothing here.
> - **No dependency on R2-1 to R2-3.** The task builds only on R1 code that is on main: `Panel`, `MeterBar`, `ScorePill`, `fmtGap`/`fmtInt`/`fmtScore`, `countOf`, `gapColor` and `adm-row-btn`. Its two pair helpers (`scoreText`, `isSelected`, below) are private to `PairList`.
> - **Each component is now a `Panel`** (a region named by its h2), as every R1 insight panel is:
>   - `PairList` is "Widest gaps", with the handoff's "engine → community" caption in the action slot. This task owns the heading R2-6 item 5 asks for, so R2-6 puts no heading of its own around `PairList`.
>   - `VoteDetailTable` is "Votes" while no pair is selected. With a pair, the panel is named after the pair, with "engine N" in the action slot (the handoff's title line).
>   - `DimensionParticipation` puts `scope` in the action slot. That slot is Panel's own caption style (`ADMIN_TYPE.small`, muted), not the outline's `ADMIN_TYPE.label`, so the scope line matches every other panel caption.
> - **`PairList` rows:**
>   - **Accessible names.** Each row gets an `aria-label` in the words the scatter uses for the same pair (R2-4b's `scatterPoints` label, without its "pairs on these scores" clause). Without it, the name comes from the content: the failing run printed "Card 1×Card 27 → 41".
>   - **Columns.** The jump and count columns take fixed widths (80px and 40px). Each row is its own grid, so `auto` columns don't line up from row to row.
>   - **Structure.** The rows are a `<ul>` of `adm-row-btn` buttons, as R1's `TopVotersPanel` is. `emptyText` stays inside the panel, and the footnote shows only when there are rows. The vote count becomes muted data text; it was `textDim`, which R-6 rules out.
>   - **Numbers.** The jump and the row's name print scores as the scatter does, through a private `scoreText` with the body of R2-4b's exported one: whole numbers bare, averages to two places. Printed raw, as today, a two-vote average would read "community 7.5" in the list and "community 7.50" on the dot.
>   - **Selection either way round.** A private `isSelected` matches `selectedPair` to a row in either order, as R2-1's `findPair`, `withSelectedPair` and `votesForPair` do. R2-1's test appends a reversed selection (`{a: scope[40].b, b: scope[40].a}`), and R2-4c rings a pair selected as `{a: '4', b: '3'}`. Matched in order, that row would read `aria-pressed="false"` while the scatter and the vote panel show it selected.
>   - **Height.** The list scrolls inside the panel past 384px (about ten and a half rows), and the header and footnote stay put. In R2-6 the list sits beside the vote panel and holds up to 41 rows (about 1,400px): unscrolled, picking row 30 would open its votes about 1,000px above, out of view. Today `CalibrationView` caps the list with a 480px wrapper, and a wrapper outside the Panel would scroll the "Widest gaps" header away.
> - **`VoteDetailTable`:**
>   - **`notice`** renders as a muted line inside the panel, not as a `Notice`. The page's own Notice already announces a vote-log failure (`role="alert"`), and a second alert would announce it twice. A test checks the panel holds no alert.
>   - **New empty state.** A selected pair with no votes in the log reads "No votes for this pair in the vote log." instead of showing an empty table.
>   - **The table.** It is named (`aria-label`), has `<th scope="col">` heads styled as VoteLogTable's, and has no hover rows. Its rows aren't interactive, and the red `ScorePill` dips to 4.30:1 on `rowHover` (R1-3, deferred).
>   - **"When"** keeps the ISO UTC day, the handoff's format, which carries the year. It is now muted, where it was `textDim`.
> - **`DimensionParticipation`:**
>   - **Bars.** `MeterBar` rows, decorative because the share is printed beside each bar, with the accent fill. It was `primary` at 0.7 opacity.
>   - **Empty state.** "No votes yet." when `dimensionStats` returns nothing.
>   - **Margin.** The old `marginBottom` is gone, because the panel sits in a grid gap.
> - **Stories:**
>   - All three move under `Admin/Insights/Calibration/…` on the admin canvas.
>   - New stories: PairList `Empty` (the outline's), VoteDetailTable `NoVotes` and `Loading` plus a no-score vote, and DimensionParticipation `Scoped` and `NoVotes`.
>   - PairList's fixture runs widest gap first, as the panel's title says.
> - **Interim consumer.** `CalibrationView` renders all three until R2-7 deletes it. Every new prop is optional, so its call sites (`:90`, `:146`, `:148`) compile unchanged, and its tests stay green.
> - **Owner decision, flagged here and assigned to R2-3: gap-coloured text on a pressed row fails 1.4.3.** R2-3 is the first task that puts gap-coloured text on a pressed `adm-row-btn` (its Gap column); this task's jump column is the second. The header's flag list should carry it.
>   - **Measured** from the real tokens: red text (`over`, #ef4444) on a pressed row (`accentTintSoft`, 0.06 gold over the card) is **4.497:1, so it fails without hover too**, and 4.15:1 pressed and hovered (`accentTint`). 13px text needs 4.5:1. Hover alone is 4.63:1 and the row at rest 4.95:1. Green (`under`) passes everywhere (8.9:1 or more). It bites in the common case: the widest gaps lean negative, so the selected row's jump is usually red.
>   - **R2-3's gate settles it for both tasks.** With (a), `ADMIN_COLORS.rowSelected` fills every pressed row button, these included, and this task adds nothing. With (b), add Step 3's `jumpColor` and Step 1's extra case below. With neither, record the axe violation on `WithSelection` (its pressed Maui row prints "7 → 4" in red), as R2-3 does.
>   - Either way, this task changes no theme file: it builds on whatever R2-3 lands.
> - **Verified (2026-10-05).** The sandbox is `scratchpad/r2-rebase/sandbox-fix-r24`, a copy of the first pass's `sandbox-r24` with the review fixes applied. It uses the real repo files listed under Files, plus the real `CalibrationView`, `CalibrationPage`, `PageLayout`, `adminData` and their imports. Its bridge re-exports the pinned app's real tokens, `CtaButton`, `LinkButton` and `useContainerWidth`.
>   - **Before** (old components, new tests): PairList `5 failed | 2 passed (7)`, VoteDetailTable `5 failed | 1 passed (6)`, DimensionParticipation `3 failed (3)`.
>   - **After:** `30 passed (30)` over 6 files: PairList 7, VoteDetailTable 6, DimensionParticipation 3, `CalibrationView.test.tsx` 4, `CalibrationPage.test.tsx` 8 and `dimensionStats.test.ts` 2.
>   - **Typecheck:** `tsc` (strict, `noUnused*`) was clean over the sandbox, stories included.
>   - **Lint:** all 9 files pass `pnpm exec eslint --stdin --stdin-filename src/tools/analytics/…`. The R2-6 `notice` expression typechecks and lints inside a probe component. A probe confirmed the `inkweave/*` rules run through stdin.
>   - **Option (b)**, in `scratchpad/r2-rebase/sandbox-apply-r24` (a copy of the cross-task critic's `sandbox-critic/s`), with Steps 1 and 3 extracted from this file and the (b) edits applied as written: the old component fails `6 failed | 2 passed (8)`, the new one with `jumpColor` passes `8 passed (8)`, and without `jumpColor` only the new case fails (`1 failed | 7 passed (8)`). Without the (b) parts the counts stay 7. Both (b) files pass `pnpm exec eslint --max-warnings 0 --stdin`, and `tsc` is clean over the sandbox.

### Task R2-4: Pair, vote and dimension panels in the new style

**Files:**
- Modify `src/tools/analytics/PairList.tsx`: the whole file (60 lines today).
- Modify `src/tools/analytics/VoteDetailTable.tsx`: the whole file (101 lines today).
- Modify `src/tools/analytics/DimensionParticipation.tsx`: the whole file (36 lines today).
- Modify `src/tools/analytics/PairList.stories.tsx`, `src/tools/analytics/VoteDetailTable.stories.tsx` and `src/tools/analytics/DimensionParticipation.stories.tsx`.
- Modify `src/tools/analytics/__tests__/PairList.test.tsx`. Its two tests stay as they are, and five are added.
- Create `src/tools/analytics/__tests__/VoteDetailTable.test.tsx` and `src/tools/analytics/__tests__/DimensionParticipation.test.tsx`. Only `dimensionStats.test.ts` exists for these today.
- Unchanged: `src/tools/analytics/CalibrationView.tsx`, which keeps rendering all three until R2-7 deletes it, and `src/tools/analytics/dimensionStats.ts`.

**Interfaces:**
- **Consumes** (R1, on main):
  - `Panel({title?, action?, children, padded?})` from `src/ui/Panel.tsx`.
    - A titled panel is a `region` named by its `<h2>`, and `action` sits at the right of the header row (`ADMIN_TYPE.small`, muted).
    - `padded={false}` drops the body padding. The header then keeps its padding and gets a bottom border, and the section clips its overflow.
  - `MeterBar({fraction, color, height?, label?})` from `src/ui/MeterBar.tsx`. Without `label` it is `aria-hidden` decoration.
  - `ScorePill({score})` from `src/ui/ScorePill.tsx`. A null score is `role="img"`, named "No score", with the text "—".
  - `fmtGap`, `fmtInt` and `fmtScore(n, digits)` from `src/ui/format.ts`.
  - `countOf(n, noun)` from `src/tools/analytics/activity/activityModel.ts:61`. It gives "1 vote" and "12 votes".
  - `gapColor(gap)` from `src/tools/analytics/gapColor.ts`, and `dimensionStats(fill, totalVotes)` from `src/tools/analytics/dimensionStats.ts`.
  - `ADMIN_COLORS` and `ADMIN_TYPE` from `src/theme/adminTheme.ts`.
  - `SPACING`, `TRUNCATE`, `LETTER_SPACING` and `FONTS` from `src/app-bridge.ts`.
  - The `adm-row-btn` class from `src/theme/AdminStyles.tsx`.
    - `button.adm-row-btn` is a full-width block with no padding and no border.
    - `[aria-pressed="true"]` draws the gold inset bar on `accentTintSoft` (on R2-3's `rowSelected` under its option (a); nothing here depends on which).
    - The focus ring is drawn inside the box (offset −2px).
- **Produces:**
```ts
// src/tools/analytics/PairList.tsx
export function PairList(props: {
  pairs: PairStat[];
  selectedPair: {a: string; b: string} | null;
  onSelectPair: (p: {a: string; b: string}) => void;
  emptyText?: string; // default "No voted pairs yet."
}): JSX.Element;
// A <Panel title="Widest gaps" action="engine → community" padded={false}>: role region, name "Widest gaps".
// One <li><button type="button" className="adm-row-btn" aria-pressed> per pair, in a <ul> that scrolls past 384px.
// aria-pressed is true when selectedPair names the pair either way round ({a, b} or {b, a}).
// The button's accessible name is `${aName} × ${bName}: engine ${scoreText(engineScore)}, community
// ${scoreText(communityScore)}, gap ${fmtGap(gap)}, ${countOf(scoreVotes, 'vote')}`, and the visible jump is
// `${scoreText(engineScore)} → ${scoreText(communityScore)}`. scoreText is private, with R2-4b's body:
// fmtScore(n, Number.isInteger(n) ? 0 : 2), so 7 -> "7" and 7.5 -> "7.50".
// The jump prints in gapColor(gap). Only under R2-3's option (b): the selected row's red jump prints in
// ADMIN_COLORS.text instead (a private jumpColor).
// No pairs: emptyText inside the panel, with no list and no footnote.

// src/tools/analytics/VoteDetailTable.tsx
export function VoteDetailTable(props: {
  pair: {aName: string; bName: string; engineScore: number} | null;
  votes: VoteLogRow[];
  notice?: string; // replaces the table: vote log loading, failed, or no raw votes. A muted line, never an alert.
}): JSX.Element;
// pair null: a region named "Votes", holding "Select a pair to see its votes".
// With a pair: a region named `${aName} × ${bName}`, with the action `engine ${engineScore}`.
//   - notice ?? (votes.length === 0 ? "No votes for this pair in the vote log." : table) fills the panel.
//   - The table is named `Votes on ${aName} × ${bName}`, with the columns Score, Accuracy, Would play and When.

// src/tools/analytics/DimensionParticipation.tsx
export function DimensionParticipation(props: {fill: DimensionFill | null; totalVotes: number; scope?: string}): JSX.Element;
// A region named "Dimension participation". `scope` goes in the header's action slot (absent without it).
// One <li> per dimensionStats row; "No votes yet." when there are none.
```
- **For R2-4b:** `PairList`'s private `scoreText` has the same body as R2-4b's exported `scoreText` (`fmtScore(n, Number.isInteger(n) ? 0 : 2)`), so a row and its dot print a score alike. Keep the two in step.
- **For R2-6:**
  - `PairList` brings its own "Widest gaps" heading, and the workspace's scope row keeps `pairsHeading`.
  - Put no scroll wrapper around `PairList`: its list scrolls inside the panel, under a fixed header and footnote.
  - Pass `VoteDetailTable` a `notice`, checking raw votes first. With raw votes off, the precompute still writes an empty `vote-log.json` (`scripts/precompute-vote-analytics.mjs:120` and `:137`), so `voteLog.data` is present and can't stand for "no raw votes":

    ```tsx
    notice={
      !analytics.data.hasRawVotes
        ? 'No raw votes to show.'
        : voteLog.data
          ? undefined
          : voteLog.error
            ? 'Could not load the vote log.' // the page's error Notice already gives the message
            : 'Loading the vote log…'
    }
    ```
  - The "A dot opens its votes" test can find the vote panel as `getByRole('region', {name: 'Card <a> × Card <b>'})`.

- [ ] **Step 1: Write PairList's failing tests**

Replace `src/tools/analytics/__tests__/PairList.test.tsx`. The two existing tests are kept as they are; the import line gains `within`, and five tests follow them. Before (the whole current file):

```tsx
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {COLORS} from '../../../app-bridge';
import {PairList} from '../PairList';
import type {PairStat} from '../voteAnalyticsTypes';

function pair(a: string, b: string): PairStat {
  return {a, b, aName: `Card ${a}`, bName: `Card ${b}`, engineScore: 7, communityScore: 4, gap: -3, scoreVotes: 1, rules: []};
}

const PAIRS = [pair('1', '2'), pair('3', '4')];

describe('PairList', () => {
  it('selects a pair and marks the selected one pressed', async () => {
    const onSelectPair = vi.fn();
    render(<PairList pairs={PAIRS} selectedPair={{a: '1', b: '2'}} onSelectPair={onSelectPair} />);

    await userEvent.click(screen.getByRole('button', {name: /Card 3/}));
    expect(onSelectPair).toHaveBeenCalledWith({a: '3', b: '4'});
    expect(screen.getByRole('button', {name: /Card 1/})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', {name: /Card 3/})).toHaveAttribute('aria-pressed', 'false');
  });

  it('colors each score jump by direction, as the verdict scale does', () => {
    const under = {...pair('5', '6'), engineScore: 4, communityScore: 6, gap: 2};
    const even = {...pair('7', '8'), engineScore: 5, communityScore: 5, gap: 0};
    render(<PairList pairs={[pair('1', '2'), under, even]} selectedPair={null} onSelectPair={vi.fn()} />);

    expect(screen.getByText('7 → 4')).toHaveStyle({color: COLORS.error});
    expect(screen.getByText('4 → 6')).toHaveStyle({color: COLORS.success});
    expect(screen.getByText('5 → 5')).toHaveStyle({color: COLORS.textMuted});
  });
});
```

After:

```tsx
import {describe, expect, it, vi} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {COLORS} from '../../../app-bridge';
import {PairList} from '../PairList';
import type {PairStat} from '../voteAnalyticsTypes';

function pair(a: string, b: string): PairStat {
  return {a, b, aName: `Card ${a}`, bName: `Card ${b}`, engineScore: 7, communityScore: 4, gap: -3, scoreVotes: 1, rules: []};
}

const PAIRS = [pair('1', '2'), pair('3', '4')];

describe('PairList', () => {
  it('selects a pair and marks the selected one pressed', async () => {
    const onSelectPair = vi.fn();
    render(<PairList pairs={PAIRS} selectedPair={{a: '1', b: '2'}} onSelectPair={onSelectPair} />);

    await userEvent.click(screen.getByRole('button', {name: /Card 3/}));
    expect(onSelectPair).toHaveBeenCalledWith({a: '3', b: '4'});
    expect(screen.getByRole('button', {name: /Card 1/})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', {name: /Card 3/})).toHaveAttribute('aria-pressed', 'false');
  });

  it('colors each score jump by direction, as the verdict scale does', () => {
    const under = {...pair('5', '6'), engineScore: 4, communityScore: 6, gap: 2};
    const even = {...pair('7', '8'), engineScore: 5, communityScore: 5, gap: 0};
    render(<PairList pairs={[pair('1', '2'), under, even]} selectedPair={null} onSelectPair={vi.fn()} />);

    expect(screen.getByText('7 → 4')).toHaveStyle({color: COLORS.error});
    expect(screen.getByText('4 → 6')).toHaveStyle({color: COLORS.success});
    expect(screen.getByText('5 → 5')).toHaveStyle({color: COLORS.textMuted});
  });

  it('is the "Widest gaps" panel, captioned engine → community, with one list item per pair', () => {
    render(<PairList pairs={PAIRS} selectedPair={null} onSelectPair={vi.fn()} />);
    const panel = screen.getByRole('region', {name: 'Widest gaps'});

    expect(within(panel).getByText('engine → community')).toBeInTheDocument();
    expect(within(panel).getAllByRole('listitem')).toHaveLength(2);
    // The rows scroll inside the panel, so R2-6 puts no scroll wrapper around it.
    expect(within(panel).getByRole('list')).toHaveStyle({maxHeight: '384px', overflowY: 'auto'});
    expect(within(panel).getByText(/trust the rule-level trend over any one row/)).toBeInTheDocument();
  });

  it('names each row in words, as the scatter names its dot', () => {
    render(<PairList pairs={PAIRS} selectedPair={null} onSelectPair={vi.fn()} />);
    expect(
      screen.getByRole('button', {name: 'Card 1 × Card 2: engine 7, community 4, gap −3.00, 1 vote'}),
    ).toBeInTheDocument();
  });

  it('prints an average score to two places, as the scatter does', () => {
    const averaged = {...pair('5', '6'), engineScore: 8, communityScore: 7.5, gap: -0.5, scoreVotes: 2};
    render(<PairList pairs={[averaged]} selectedPair={null} onSelectPair={vi.fn()} />);

    expect(screen.getByText('8 → 7.50')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {name: 'Card 5 × Card 6: engine 8, community 7.50, gap −0.50, 2 votes'}),
    ).toBeInTheDocument();
  });

  it('presses the selected pair given the other way round, as the scatter and the vote panel match it', () => {
    render(<PairList pairs={PAIRS} selectedPair={{a: '2', b: '1'}} onSelectPair={vi.fn()} />);
    expect(screen.getByRole('button', {name: /Card 1/})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', {name: /Card 3/})).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows emptyText in place of the list, and "No voted pairs yet." without it', () => {
    const {rerender} = render(
      <PairList pairs={[]} selectedPair={null} onSelectPair={vi.fn()} emptyText="No voted pairs for this rule yet." />,
    );
    const panel = screen.getByRole('region', {name: 'Widest gaps'});
    expect(within(panel).getByText('No voted pairs for this rule yet.')).toBeInTheDocument();
    expect(within(panel).queryByRole('list')).not.toBeInTheDocument();
    expect(within(panel).queryByText(/trust the rule-level trend/)).not.toBeInTheDocument();

    rerender(<PairList pairs={[]} selectedPair={null} onSelectPair={vi.fn()} />);
    expect(screen.getByText('No voted pairs yet.')).toBeInTheDocument();
  });
});
```

**Only (b), R2-3's option.** The test file gains one import and one case:
- Add this line after `import {COLORS} from '../../../app-bridge';`:

  ```tsx
  import {ADMIN_COLORS} from '../../../theme/adminTheme';
  ```
- Add this case before the `'shows emptyText in place of the list, and "No voted pairs yet." without it'` case:

  ```tsx
    it("prints the selected row's negative jump in the text colour, the others in red (R2-3 option (b))", () => {
      render(<PairList pairs={PAIRS} selectedPair={{a: '1', b: '2'}} onSelectPair={vi.fn()} />);
      const jump = (name: RegExp) => within(screen.getByRole('button', {name})).getByText('7 → 4');
      expect(jump(/^Card 1 × Card 2/)).toHaveStyle({color: ADMIN_COLORS.text});
      expect(jump(/^Card 3 × Card 4/)).toHaveStyle({color: COLORS.error});
    });
  ```

- [ ] **Step 2: Run it and watch the new tests fail**

Run: `pnpm vitest run src/tools/analytics/__tests__/PairList.test.tsx`

Expected: FAIL, `Tests  5 failed | 2 passed (7)`, or `Tests  6 failed | 2 passed (8)` under (b).
- The first failure reads `Unable to find an accessible element with the role "region" and name "Widest gaps"`.
- The naming test fails too; the old rows are named "Card 1×Card 27 → 41".
- The average test reads `Unable to find an element with the text: 8 → 7.50`: the old row prints "8 → 7.5".
- The reversed selection leaves the old "Card 1" row at `aria-pressed="false"`.
- Under (b), the extra case reads ``Unable to find an accessible element with the role "button" and name `/^Card 1 × Card 2/` ``.

- [ ] **Step 3: Rebuild PairList as the "Widest gaps" panel**

Replace `src/tools/analytics/PairList.tsx`. Before (the whole current file):

```tsx
import {COLORS, CtaButton, FONTS, FONT_SIZES, RADIUS, SPACING, TRUNCATE} from '../../app-bridge';
import {gapColor} from './gapColor';
import type {PairStat} from './voteAnalyticsTypes';

interface PairListProps {
  pairs: PairStat[];
  selectedPair: {a: string; b: string} | null;
  onSelectPair: (p: {a: string; b: string}) => void;
}

/**
 * A clickable list of voted pairs (already filtered + sorted by the parent).
 * Each row shows the two card names, the engine→community score jump, and the
 * vote count; the selected row is the kit's ghost button, the rest neutral (#509). A caption reminds the reader
 * that most pairs carry a single vote, so the rule-level trend is what to trust.
 */
export function PairList({pairs, selectedPair, onSelectPair}: PairListProps) {
  return (
    <div style={{fontFamily: FONTS.body}}>
      <div style={{display: 'flex', flexDirection: 'column', gap: SPACING.xs}}>
        {pairs.map((pair) => {
          const selected = selectedPair?.a === pair.a && selectedPair?.b === pair.b;
          return (
            <CtaButton
              key={`${pair.a}|${pair.b}`}
              type="button"
              variant={selected ? 'ghost' : 'neutral'}
              aria-pressed={selected}
              onClick={() => onSelectPair({a: pair.a, b: pair.b})}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: SPACING.md,
                width: '100%',
                minHeight: 0,
                padding: `${SPACING.sm}px ${SPACING.md}px`,
                borderRadius: RADIUS.md,
                textAlign: 'left',
              }}>
              <span style={{...TRUNCATE, fontSize: FONT_SIZES.base, color: COLORS.text}}>
                {pair.aName}
                <span style={{color: COLORS.textDim}}> × </span>
                {pair.bName}
              </span>
              <span style={{fontSize: FONT_SIZES.md, color: gapColor(pair.gap), fontVariantNumeric: 'tabular-nums'}}>
                {pair.engineScore} → {pair.communityScore}
              </span>
              <span style={{fontSize: FONT_SIZES.xs, color: COLORS.textDim, fontVariantNumeric: 'tabular-nums'}}>
                {pair.scoreVotes}
              </span>
            </CtaButton>
          );
        })}
      </div>
      <div style={{fontSize: FONT_SIZES.xs, color: COLORS.textDim, marginTop: SPACING.sm}}>
        Most pairs have a single vote — trust the rule-level trend over any one row.
      </div>
    </div>
  );
}
```

After:

```tsx
import {SPACING, TRUNCATE} from '../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../theme/adminTheme';
import {fmtGap, fmtInt, fmtScore} from '../../ui/format';
import {Panel} from '../../ui/Panel';
import {countOf} from './activity/activityModel';
import {gapColor} from './gapColor';
import type {PairStat} from './voteAnalyticsTypes';

interface PairListProps {
  pairs: PairStat[];
  selectedPair: {a: string; b: string} | null;
  onSelectPair: (p: {a: string; b: string}) => void;
  /** Shown in place of the list when there are no pairs. Default "No voted pairs yet." */
  emptyText?: string;
}

/**
 * A row's three columns. Every row is its own grid, so the score jump and the
 * vote count take fixed widths ("10 → 4.33" fits 80px at 13px) and line up from
 * row to row. The side padding is the flush panel header's, so the names sit
 * under the title.
 */
const ROW: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 80px 40px',
  alignItems: 'baseline',
  gap: SPACING.md,
  padding: `${SPACING.sm}px ${SPACING.lg}px`,
  fontSize: ADMIN_TYPE.body,
};

/**
 * The rows scroll inside the panel past about ten and a half of them (a row is
 * about 36px tall), so the cut row shows there is more. The header and the
 * footnote stay put, and the panel stays level with the votes panel beside it.
 * The rows are buttons, so keyboard focus scrolls each one into view.
 */
const LIST: React.CSSProperties = {listStyle: 'none', margin: 0, padding: 0, maxHeight: 384, overflowY: 'auto'};

const NUMBER: React.CSSProperties = {textAlign: 'right', fontVariantNumeric: 'tabular-nums'};

const EMPTY: React.CSSProperties = {
  margin: 0,
  padding: `${SPACING.xxl}px ${SPACING.lg}px`,
  textAlign: 'center',
  fontSize: ADMIN_TYPE.body,
  color: ADMIN_COLORS.muted,
};

const FOOTNOTE: React.CSSProperties = {
  margin: 0,
  padding: `${SPACING.sm}px ${SPACING.lg}px ${SPACING.section}px`,
  borderTop: `1px solid ${ADMIN_COLORS.divider}`,
  fontSize: ADMIN_TYPE.label,
  color: ADMIN_COLORS.muted,
};

/**
 * A score as the scatter prints it: whole numbers bare ("7"), averages to two
 * places ("7.50"). The same body as R2-4b's exported scoreText.
 */
function scoreText(n: number): string {
  return fmtScore(n, Number.isInteger(n) ? 0 : 2);
}

/** A selection names its pair either way round, as R2-1's findPair matches it. */
function isSelected(pair: PairStat, selected: {a: string; b: string} | null): boolean {
  if (selected == null) return false;
  return (selected.a === pair.a && selected.b === pair.b) || (selected.a === pair.b && selected.b === pair.a);
}

/**
 * A row's accessible name: what it shows, in words, as the scatter names the
 * same pair's dot. Read from the content, the row would run the numbers into
 * the names ("Card 27 → 41") and leave the vote count without a noun.
 */
function pairLabel(pair: PairStat): string {
  return (
    `${pair.aName} × ${pair.bName}: engine ${scoreText(pair.engineScore)}, community ${scoreText(pair.communityScore)}, ` +
    `gap ${fmtGap(pair.gap)}, ${countOf(pair.scoreVotes, 'vote')}`
  );
}

/**
 * The voted pairs the parent picked (scoped, sorted and capped there), as the
 * "Widest gaps" panel: each row shows the two card names, the engine →
 * community score jump in the gap colour, and the vote count. Rows are
 * adm-row-btn buttons, so the selected one wears the gold bar and says
 * aria-pressed. A footnote reminds the reader that most pairs carry a single
 * vote, so the rule-level trend is what to trust.
 */
export function PairList({pairs, selectedPair, onSelectPair, emptyText = 'No voted pairs yet.'}: PairListProps) {
  return (
    <Panel title="Widest gaps" action="engine → community" padded={false}>
      {pairs.length === 0 ? (
        <p style={EMPTY}>{emptyText}</p>
      ) : (
        <>
          <ul style={LIST}>
            {pairs.map((pair, i) => {
              const selected = isSelected(pair, selectedPair);
              const names = `${pair.aName} × ${pair.bName}`;
              return (
                <li
                  key={`${pair.a}|${pair.b}`}
                  // The panel header already rules off the first row.
                  style={i === 0 ? undefined : {borderTop: `1px solid ${ADMIN_COLORS.divider}`}}>
                  <button
                    type="button"
                    className="adm-row-btn"
                    aria-pressed={selected}
                    aria-label={pairLabel(pair)}
                    onClick={() => onSelectPair({a: pair.a, b: pair.b})}>
                    {/* The grid lives on a span: a native button takes no style (no-adhoc-buttons). */}
                    <span style={ROW}>
                      <span style={TRUNCATE} title={names}>
                        {pair.aName}
                        <span style={{color: ADMIN_COLORS.muted}}> × </span>
                        {pair.bName}
                      </span>
                      <span style={{...NUMBER, color: gapColor(pair.gap)}}>
                        {scoreText(pair.engineScore)} → {scoreText(pair.communityScore)}
                      </span>
                      <span style={{...NUMBER, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>
                        {fmtInt(pair.scoreVotes)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p style={FOOTNOTE}>Most pairs have a single vote — trust the rule-level trend over any one row.</p>
        </>
      )}
    </Panel>
  );
}
```

**Only (b), R2-3's option.** Add this function right above `/** A selection names its pair either way round, as R2-1's findPair matches it. */`:

```tsx
/**
 * The jump's text colour (R2-3's option (b)). On the selected row a negative
 * gap prints in the text colour: the over-rates red measures 4.50:1 on the
 * selected fill and 4.15:1 when that row is also hovered, and 13px text needs
 * more than 4.5:1. The row's name still gives the gap's sign.
 */
function jumpColor(gap: number, selected: boolean): string {
  const color = gapColor(gap);
  return selected && color === ADMIN_COLORS.over ? ADMIN_COLORS.text : color;
}
```

Then the jump uses it. Before:

```tsx
                      <span style={{...NUMBER, color: gapColor(pair.gap)}}>
```

After:

```tsx
                      <span style={{...NUMBER, color: jumpColor(pair.gap, selected)}}>
```

- [ ] **Step 4: Run it to PASS**

Run: `pnpm vitest run src/tools/analytics/__tests__/PairList.test.tsx`

Expected: PASS, `Tests  7 passed (7)`, or `Tests  8 passed (8)` under (b).

- [ ] **Step 5: Write VoteDetailTable's failing tests**

Create `src/tools/analytics/__tests__/VoteDetailTable.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import {VoteDetailTable} from '../VoteDetailTable';
import type {VoteLogRow} from '../voteLogTypes';

const PAIR = {aName: 'Sisu', bName: 'Raya', engineScore: 8};

function vote(over: Partial<VoteLogRow>): VoteLogRow {
  return {
    a: '1',
    b: '2',
    aName: 'Sisu',
    bName: 'Raya',
    score: 8,
    accuracy: null,
    isReal: null,
    wouldPlay: null,
    difficulty: null,
    whoCarries: null,
    ts: '2026-06-28T14:02:00Z',
    voter: 1,
    ...over,
  };
}

const VOTES: VoteLogRow[] = [
  vote({voter: 1, score: 8, accuracy: -1, wouldPlay: true, ts: '2026-06-28T14:02:00Z'}),
  // The real log's form: Supabase's created_at, with microseconds and a +00:00 offset.
  vote({voter: 2, score: 5, accuracy: 0, wouldPlay: false, ts: '2026-06-29T09:41:00.123456+00:00'}),
  vote({voter: 3, score: null, accuracy: 1, wouldPlay: null, ts: '2026-06-30T22:15:00Z'}),
];

describe('VoteDetailTable', () => {
  it('prompts for a pair when none is selected', () => {
    render(<VoteDetailTable pair={null} votes={[]} />);
    const panel = screen.getByRole('region', {name: 'Votes'});
    expect(within(panel).getByText('Select a pair to see its votes')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('heads the panel with the pair and its engine score, over a table of its votes', () => {
    render(<VoteDetailTable pair={PAIR} votes={VOTES} />);
    const panel = screen.getByRole('region', {name: 'Sisu × Raya'});
    expect(within(panel).getByText('engine 8')).toBeInTheDocument();

    const table = within(panel).getByRole('table', {name: 'Votes on Sisu × Raya'});
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Score',
      'Accuracy',
      'Would play',
      'When',
    ]);
    expect(within(table).getAllByRole('row')).toHaveLength(4);
  });

  it('labels accuracy as too high / right / too low, would-play as yes / no / —, and dates each vote', () => {
    render(<VoteDetailTable pair={PAIR} votes={VOTES} />);
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('cell').slice(1).map((td) => td.textContent))).toEqual([
      ['too high', 'yes', '2026-06-28'],
      ['right', 'no', '2026-06-29'],
      ['too low', '—', '2026-06-30'],
    ]);
  });

  it('shows "—" in the score pill for a vote with no score', () => {
    render(<VoteDetailTable pair={PAIR} votes={VOTES} />);
    expect(screen.getByRole('img', {name: 'No score'})).toHaveTextContent('—');
  });

  it('shows the notice in place of the table', () => {
    render(<VoteDetailTable pair={PAIR} votes={VOTES} notice="Loading the vote log…" />);
    const panel = screen.getByRole('region', {name: 'Sisu × Raya'});
    expect(within(panel).getByText('Loading the vote log…')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    // The page's own Notice announces a failure; this line never does.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says so when the vote log holds no votes for the pair', () => {
    render(<VoteDetailTable pair={PAIR} votes={[]} />);
    expect(screen.getByText('No votes for this pair in the vote log.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run it and watch it fail**

Run: `pnpm vitest run src/tools/analytics/__tests__/VoteDetailTable.test.tsx`

Expected: FAIL, `Tests  5 failed | 1 passed (6)`.
- The first failure reads `Unable to find an accessible element with the role "region" and name "Votes"`.
- The labels test already passes: the old component has the same words and the same `ts.slice(0, 10)` day.

- [ ] **Step 7: Rebuild VoteDetailTable as a panel with a real table**

Replace `src/tools/analytics/VoteDetailTable.tsx`. Before (the whole current file):

```tsx
import {CAP_LABEL_XS, COLORS, EMPTY_BOX, FONTS, FONT_SIZES, RADIUS, SPACING} from '../../app-bridge';
import type {VoteLogRow} from './voteLogTypes';

interface VoteDetailTableProps {
  pair: {aName: string; bName: string; engineScore: number} | null;
  votes: VoteLogRow[];
}

/** High scores read green, low scores red; middling scores stay neutral. */
function scoreColor(score: number | null): string {
  if (score == null) return COLORS.textMuted;
  if (score >= 7) return COLORS.success;
  if (score <= 4) return COLORS.error;
  return COLORS.text;
}

/** Map the accuracy thumb (-1 / 0 / 1 / null) to its label. */
function accuracyLabel(accuracy: number | null): string {
  if (accuracy === -1) return 'too high';
  if (accuracy === 0) return 'right';
  if (accuracy === 1) return 'too low';
  return '—';
}

function wouldPlayLabel(wouldPlay: boolean | null): string {
  if (wouldPlay == null) return '—';
  return wouldPlay ? 'yes' : 'no';
}

const HEAD: React.CSSProperties = {
  ...CAP_LABEL_XS,
  textAlign: 'left',
  padding: `${SPACING.sm}px ${SPACING.md}px`,
};

/**
 * The per-pair vote breakdown. With no pair selected it renders a muted empty
 * state; otherwise a heading (names + engine score) and a table of each vote's
 * score, accuracy thumb, would-play flag, and date.
 */
export function VoteDetailTable({pair, votes}: VoteDetailTableProps) {
  if (pair == null) {
    return (
      <div
        style={{
          ...EMPTY_BOX,
          fontFamily: FONTS.body,
          fontSize: FONT_SIZES.base,
          padding: SPACING.lg,
        }}>
        Select a pair to see its votes
      </div>
    );
  }

  const cell: React.CSSProperties = {
    padding: `${SPACING.sm}px ${SPACING.md}px`,
    fontSize: FONT_SIZES.base,
    color: COLORS.text,
  };

  return (
    <div style={{fontFamily: FONTS.body}}>
      <div style={{fontSize: FONT_SIZES.lg, fontWeight: 700, color: COLORS.text, marginBottom: SPACING.sm}}>
        {pair.aName} <span style={{color: COLORS.textDim}}>×</span> {pair.bName}
        <span style={{fontSize: FONT_SIZES.md, color: COLORS.textMuted, fontWeight: 400, marginLeft: SPACING.sm}}>
          engine {pair.engineScore}
        </span>
      </div>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          background: COLORS.surface,
          border: `1px solid ${COLORS.surfaceBorder}`,
          borderRadius: RADIUS.lg,
        }}>
        <thead>
          <tr style={{borderBottom: `1px solid ${COLORS.surfaceBorder}`}}>
            <th style={HEAD}>Score</th>
            <th style={HEAD}>Accuracy</th>
            <th style={HEAD}>Would play</th>
            <th style={HEAD}>When</th>
          </tr>
        </thead>
        <tbody>
          {votes.map((vote, i) => (
            <tr key={`${vote.voter}-${vote.ts}-${i}`} style={{borderBottom: `1px solid ${COLORS.surfaceBorder}`}}>
              <td style={{...cell, fontWeight: 700, color: scoreColor(vote.score)}}>
                {vote.score == null ? '—' : vote.score}
              </td>
              <td style={{...cell, color: COLORS.textMuted}}>{accuracyLabel(vote.accuracy)}</td>
              <td style={{...cell, color: COLORS.textMuted}}>{wouldPlayLabel(vote.wouldPlay)}</td>
              <td style={{...cell, color: COLORS.textDim, fontVariantNumeric: 'tabular-nums'}}>{vote.ts.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

After. `scoreColor` goes, because `ScorePill` bands the score now: 7 and up, 4 and below, and a "No score" dash.

```tsx
import {LETTER_SPACING, SPACING} from '../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../theme/adminTheme';
import {Panel} from '../../ui/Panel';
import {ScorePill} from '../../ui/ScorePill';
import type {VoteLogRow} from './voteLogTypes';

interface VoteDetailTableProps {
  pair: {aName: string; bName: string; engineScore: number} | null;
  votes: VoteLogRow[];
  /**
   * Shown in place of the table while the votes can't be: the vote log is
   * loading, failed, or the artifact has no raw votes. The page's own Notice
   * announces a failure, so this one stays quiet (no role="alert").
   */
  notice?: string;
}

/** Map the accuracy thumb (-1 / 0 / 1 / null) to its label. */
function accuracyLabel(accuracy: number | null): string {
  if (accuracy === -1) return 'too high';
  if (accuracy === 0) return 'right';
  if (accuracy === 1) return 'too low';
  return '—';
}

function wouldPlayLabel(wouldPlay: boolean | null): string {
  if (wouldPlay == null) return '—';
  return wouldPlay ? 'yes' : 'no';
}

const MESSAGE: React.CSSProperties = {
  margin: 0,
  padding: `${SPACING.xxl}px ${SPACING.lg}px`,
  textAlign: 'center',
  fontSize: ADMIN_TYPE.body,
  color: ADMIN_COLORS.muted,
};

const HEAD_CELL: React.CSSProperties = {
  padding: `${SPACING.sm}px ${SPACING.lg}px`,
  background: ADMIN_COLORS.panel,
  textAlign: 'left',
  fontSize: ADMIN_TYPE.label,
  fontWeight: 700,
  letterSpacing: LETTER_SPACING.cap,
  textTransform: 'uppercase',
  color: ADMIN_COLORS.muted,
};

const CELL: React.CSSProperties = {
  padding: `${SPACING.sm}px ${SPACING.lg}px`,
  borderTop: `1px solid ${ADMIN_COLORS.divider}`,
  color: ADMIN_COLORS.muted,
  verticalAlign: 'middle',
};

/**
 * The votes themselves. Rows take no hover fill: nothing in them is
 * interactive, and the red score pill would dip under 4.5:1 on rowHover.
 */
function VoteRows({title, votes}: {title: string; votes: VoteLogRow[]}) {
  return (
    <div style={{overflowX: 'auto'}}>
      <table aria-label={`Votes on ${title}`} style={{width: '100%', borderCollapse: 'collapse', fontSize: ADMIN_TYPE.body}}>
        <thead>
          <tr>
            <th scope="col" style={HEAD_CELL}>
              Score
            </th>
            <th scope="col" style={HEAD_CELL}>
              Accuracy
            </th>
            <th scope="col" style={HEAD_CELL}>
              Would play
            </th>
            <th scope="col" style={HEAD_CELL}>
              When
            </th>
          </tr>
        </thead>
        <tbody>
          {votes.map((vote, i) => (
            <tr key={`${vote.voter}-${vote.ts}-${i}`}>
              <td style={CELL}>
                <ScorePill score={vote.score} />
              </td>
              <td style={CELL}>{accuracyLabel(vote.accuracy)}</td>
              <td style={CELL}>{wouldPlayLabel(vote.wouldPlay)}</td>
              <td style={{...CELL, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums'}}>{vote.ts.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The selected pair's votes, as a panel. With no pair it is the "Votes" panel
 * and asks for one. With a pair, the panel is named by it, with the engine
 * score beside the title, over a table of each vote's score, accuracy thumb,
 * would-play flag and UTC day. A notice, or a pair the vote log holds no votes
 * for, replaces the table with one line.
 */
export function VoteDetailTable({pair, votes, notice}: VoteDetailTableProps) {
  if (pair == null) {
    return (
      <Panel title="Votes" padded={false}>
        <p style={MESSAGE}>Select a pair to see its votes</p>
      </Panel>
    );
  }
  const title = `${pair.aName} × ${pair.bName}`;
  const message = notice ?? (votes.length === 0 ? 'No votes for this pair in the vote log.' : null);
  return (
    <Panel title={title} action={`engine ${pair.engineScore}`} padded={false}>
      {message === null ? <VoteRows title={title} votes={votes} /> : <p style={MESSAGE}>{message}</p>}
    </Panel>
  );
}
```

- [ ] **Step 8: Run it to PASS**

Run: `pnpm vitest run src/tools/analytics/__tests__/VoteDetailTable.test.tsx`

Expected: PASS, `Tests  6 passed (6)`.

- [ ] **Step 9: Write DimensionParticipation's failing tests**

Create `src/tools/analytics/__tests__/DimensionParticipation.test.tsx`. The shares are `dimensionStats`' rounding: 1730 / 1823 is 94.9%, 115 / 1823 is 6.3% and 24 / 1823 is 1.3%.

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import {DimensionParticipation} from '../DimensionParticipation';
import type {DimensionFill} from '../voteAnalyticsTypes';

const FILL: DimensionFill = {score: 1730, accuracy: 115, isReal: 24, wouldPlay: 24, difficulty: 24};
const ALL_VOTES = 'All votes, whatever the rule';

describe('DimensionParticipation', () => {
  it("lists each dimension's share of the votes, over the footnote", () => {
    render(<DimensionParticipation fill={FILL} totalVotes={1823} />);
    const panel = screen.getByRole('region', {name: 'Dimension participation'});

    expect(within(panel).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Synergy score94.9%',
      'Accuracy6.3%',
      'Is real1.3%',
      'Would play1.3%',
      'Difficulty1.3%',
    ]);
    expect(within(panel).getByText(/who_carries excluded/)).toBeInTheDocument();
  });

  it('shows the scope beside its title when given, and nothing there without it', () => {
    const {rerender} = render(<DimensionParticipation fill={FILL} totalVotes={1823} scope={ALL_VOTES} />);
    // Panel's header row holds the h2 and the action side by side.
    const header = () => screen.getByRole('heading', {level: 2, name: 'Dimension participation'}).parentElement;
    expect(header()).toHaveTextContent(ALL_VOTES);

    rerender(<DimensionParticipation fill={FILL} totalVotes={1823} />);
    expect(header()).toHaveTextContent(/^Dimension participation$/);
    expect(screen.queryByText(ALL_VOTES)).not.toBeInTheDocument();
  });

  it('says there is nothing to measure without votes', () => {
    render(<DimensionParticipation fill={null} totalVotes={0} />);
    expect(screen.getByText('No votes yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 10: Run it and watch it fail**

Run: `pnpm vitest run src/tools/analytics/__tests__/DimensionParticipation.test.tsx`

Expected: FAIL, `Tests  3 failed (3)`. The first failure reads `Unable to find an accessible element with the role "region" and name "Dimension participation"`. Today's `<section>` has no accessible name, and its heading is an `<h3>`.

- [ ] **Step 11: Rebuild DimensionParticipation on Panel and MeterBar**

Replace `src/tools/analytics/DimensionParticipation.tsx`. Before (the whole current file):

```tsx
import {COLORS, FONT_SIZES, RADIUS, SPACING} from '../../app-bridge';
import {dimensionStats} from './dimensionStats';
import type {DimensionFill} from './voteAnalyticsTypes';

/** Horizontal bars: what fraction of votes filled each dimension. */
export function DimensionParticipation({fill, totalVotes}: {fill: DimensionFill | null; totalVotes: number}) {
  const rows = dimensionStats(fill, totalVotes);
  return (
    <section
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.surfaceBorder}`,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.section,
      }}>
      <h3 style={{fontSize: FONT_SIZES.base, fontWeight: 600, margin: `0 0 ${SPACING.sm}px`}}>Dimension participation</h3>
      <div style={{display: 'flex', flexDirection: 'column', gap: 7}}>
        {rows.map((row) => (
          <div key={row.label} style={{display: 'flex', alignItems: 'center', gap: SPACING.sm, fontSize: FONT_SIZES.base}}>
            <span style={{width: 96, color: COLORS.textMuted}}>{row.label}</span>
            <div style={{flex: 1, height: 8, background: COLORS.surfaceAlt, borderRadius: RADIUS.sm, overflow: 'hidden'}}>
              <div style={{height: '100%', width: `${row.pct}%`, background: COLORS.primary, opacity: 0.7}} />
            </div>
            <span style={{width: 44, textAlign: 'right', color: COLORS.text, fontVariantNumeric: 'tabular-nums'}}>
              {row.pct}%
            </span>
          </div>
        ))}
      </div>
      <div style={{fontSize: FONT_SIZES.xs, color: COLORS.textDim, marginTop: SPACING.sm}}>
        Which questions voters actually answer. who_carries excluded (98.8% default).
      </div>
    </section>
  );
}
```

After. `dimensionStats` and the footnote are unchanged.

```tsx
import {SPACING} from '../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../theme/adminTheme';
import {MeterBar} from '../../ui/MeterBar';
import {Panel} from '../../ui/Panel';
import {dimensionStats} from './dimensionStats';
import type {DimensionFill} from './voteAnalyticsTypes';

interface DimensionParticipationProps {
  fill: DimensionFill | null;
  totalVotes: number;
  /**
   * What the panel reads, beside its title. On a page whose filter row scopes
   * the panels below it, a panel the filter doesn't reach says so ("All votes,
   * whatever the rule").
   */
  scope?: string;
}

/** Label, bar, share: the bar is decoration (MeterBar with no label), since the share is printed beside it. */
const ROW: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '96px minmax(0, 1fr) 48px',
  alignItems: 'center',
  gap: SPACING.md,
  fontSize: ADMIN_TYPE.body,
};

const NOTE: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted};

/** What share of the votes filled each dimension, as accent bars in a panel. */
export function DimensionParticipation({fill, totalVotes, scope}: DimensionParticipationProps) {
  const rows = dimensionStats(fill, totalVotes);
  return (
    <Panel title="Dimension participation" action={scope}>
      {rows.length === 0 ? (
        <p style={{...NOTE, fontSize: ADMIN_TYPE.body}}>No votes yet.</p>
      ) : (
        <>
          <ul style={{listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: SPACING.sm}}>
            {rows.map((row) => (
              <li key={row.label} style={ROW}>
                <span style={{color: ADMIN_COLORS.muted}}>{row.label}</span>
                <MeterBar fraction={row.pct / 100} color={ADMIN_COLORS.accent} height={8} />
                <span style={{textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>{row.pct}%</span>
              </li>
            ))}
          </ul>
          <p style={NOTE}>Which questions voters actually answer. who_carries excluded (98.8% default).</p>
        </>
      )}
    </Panel>
  );
}
```

- [ ] **Step 12: Run it to PASS**

Run: `pnpm vitest run src/tools/analytics/__tests__/DimensionParticipation.test.tsx`

Expected: PASS, `Tests  3 passed (3)`.

- [ ] **Step 13: Check the consumers still pass**

`CalibrationView` (and through it `/calibration` and the router) renders all three panels until R2-7.

Run: `pnpm vitest run src/tools/analytics src/router.test.tsx`

Expected: PASS, with no failures.
- In the sandbox, `CalibrationView.test.tsx` (4) and `CalibrationPage.test.tsx` (8) ran green against the new panels.
- `router.test.tsx`'s calibration cases query only "All pairs" (CalibrationView's header line) and the Ramp row. These panels render neither.
- `CalibrationView.test.tsx` "signs every gap with a true minus" counts exactly two "−0.40" texts. The panels add none: a gap appears only in a row's `aria-label`, which `getAllByText` doesn't read.
- In the interim, `PairList` sits inside `CalibrationView`'s 480px scroll wrapper. Its header, 384px list and one-line footnote come to about 474px, so the wrapper has nothing left to scroll. R2-7 deletes the wrapper with `CalibrationView`.

- [ ] **Step 14: Update the three stories**

All three move from `Features/AdminAnalytics/…` to `Admin/Insights/Calibration/…`, R1's insights group. Each gains the admin canvas: text colour and body font. `.storybook/preview.tsx` already mounts `AdminStyles` and the page background.

`src/tools/analytics/PairList.stories.tsx`. Before (the whole current file):

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {PairList} from './PairList';
import type {PairStat} from './voteAnalyticsTypes';

const meta: Meta<typeof PairList> = {
  title: 'Features/AdminAnalytics/PairList',
  component: PairList,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof meta>;

const DEFAULT_PAIR: PairStat = {
  a: 'a',
  b: 'b',
  aName: '',
  bName: '',
  engineScore: 0,
  communityScore: 0,
  gap: 0,
  scoreVotes: 1,
  rules: ['ramp'],
};

/** Build a PairStat fixture; gap defaults to communityScore - engineScore. */
const pair = (p: Partial<PairStat>): PairStat => {
  const merged = {...DEFAULT_PAIR, ...p};
  return {...merged, gap: p.gap ?? merged.communityScore - merged.engineScore};
};

const PAIRS: PairStat[] = [
  pair({a: 'crd_a', b: 'crd_b', aName: 'Sisu - Divine Water Dragon', bName: 'Raya - Leader of Heart', engineScore: 8, communityScore: 5, scoreVotes: 3}),
  pair({a: 'crd_c', b: 'crd_d', aName: 'Maui - Hero to All', bName: 'Moana - Of Motunui', engineScore: 7, communityScore: 4, scoreVotes: 1}),
  pair({a: 'crd_e', b: 'crd_f', aName: 'Elsa - Snow Queen', bName: 'Anna - Heir to Arendelle', engineScore: 6, communityScore: 5, scoreVotes: 1}),
  pair({a: 'crd_g', b: 'crd_h', aName: 'Mickey Mouse - Brave Little Tailor', bName: 'Donald Duck - Boisterous Fowl', engineScore: 9, communityScore: 6, scoreVotes: 2}),
];

const noop = () => {};

export const Default: Story = {args: {pairs: PAIRS, selectedPair: null, onSelectPair: noop}};
export const WithSelection: Story = {
  args: {pairs: PAIRS, selectedPair: {a: 'crd_c', b: 'crd_d'}, onSelectPair: noop},
};
```

After:
- The pairs run widest gap first, as the parent sorts them under the "Widest gaps" title: Maui (−3), Mickey (+3), Sisu (−2.67), Elsa (0).
- The Sisu pair's community score becomes an average (5.33, printed "8 → 5.33"), and the Mickey pair is under-rated (3 → 6), so all three gap colours show.
- `pair` rounds the derived gap to two places, as the precompute does, and its doc comment says so.
- `Empty` is new.

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {FONTS, SPACING} from '../../app-bridge';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {PairList} from './PairList';
import type {PairStat} from './voteAnalyticsTypes';

const meta: Meta<typeof PairList> = {
  title: 'Admin/Insights/Calibration/Pair list',
  component: PairList,
  tags: ['autodocs'],
  // One column of the page's pairs-and-votes grid. .storybook/preview.tsx
  // mounts AdminStyles (adm-row-btn) and the page background.
  decorators: [
    (Story) => (
      <div style={{maxWidth: 480, padding: SPACING.xxxl, color: ADMIN_COLORS.text, fontFamily: FONTS.body}}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

const DEFAULT_PAIR: PairStat = {
  a: 'a',
  b: 'b',
  aName: '',
  bName: '',
  engineScore: 0,
  communityScore: 0,
  gap: 0,
  scoreVotes: 1,
  rules: ['ramp'],
};

/**
 * Build a PairStat fixture. The gap defaults to communityScore - engineScore,
 * rounded to two places as the precompute rounds it.
 */
const pair = (p: Partial<PairStat>): PairStat => {
  const merged = {...DEFAULT_PAIR, ...p};
  return {...merged, gap: p.gap ?? Math.round((merged.communityScore - merged.engineScore) * 100) / 100};
};

const PAIRS: PairStat[] = [
  // Widest gap first, as the parent sorts them.
  pair({a: 'crd_c', b: 'crd_d', aName: 'Maui - Hero to All', bName: 'Moana - Of Motunui', engineScore: 7, communityScore: 4, scoreVotes: 1}),
  pair({a: 'crd_g', b: 'crd_h', aName: 'Mickey Mouse - Brave Little Tailor', bName: 'Donald Duck - Boisterous Fowl', engineScore: 3, communityScore: 6, scoreVotes: 2}),
  // An average of three votes: the precompute rounds it to two places.
  pair({a: 'crd_a', b: 'crd_b', aName: 'Sisu - Divine Water Dragon', bName: 'Raya - Leader of Heart', engineScore: 8, communityScore: 5.33, scoreVotes: 3}),
  pair({a: 'crd_e', b: 'crd_f', aName: 'Elsa - Snow Queen', bName: 'Anna - Heir to Arendelle', engineScore: 6, communityScore: 6, scoreVotes: 1}),
];

const noop = () => {};

export const Default: Story = {args: {pairs: PAIRS, selectedPair: null, onSelectPair: noop}};

export const WithSelection: Story = {
  args: {pairs: PAIRS, selectedPair: {a: 'crd_c', b: 'crd_d'}, onSelectPair: noop},
};

/** A rule with no voted pairs: the workspace passes the rule's empty copy. */
export const Empty: Story = {
  args: {pairs: [], selectedPair: null, onSelectPair: noop, emptyText: 'No voted pairs for this rule yet.'},
};
```

`src/tools/analytics/VoteDetailTable.stories.tsx`. Before (the whole current file):

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {VoteDetailTable} from './VoteDetailTable';
import type {VoteLogRow} from './voteLogTypes';

const meta: Meta<typeof VoteDetailTable> = {
  title: 'Features/AdminAnalytics/VoteDetailTable',
  component: VoteDetailTable,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof meta>;

const DEFAULT_VOTE: VoteLogRow = {
  a: 'crd_a',
  b: 'crd_b',
  aName: 'Sisu - Divine Water Dragon',
  bName: 'Raya - Leader of Heart',
  score: null,
  accuracy: null,
  isReal: true,
  wouldPlay: null,
  difficulty: null,
  whoCarries: null,
  ts: '',
  voter: 1,
};

/** Build a VoteLogRow fixture over the shared default pair. */
const vote = (v: Partial<VoteLogRow>): VoteLogRow => ({...DEFAULT_VOTE, ...v});

const VOTES: VoteLogRow[] = [
  vote({voter: 1, score: 8, accuracy: -1, wouldPlay: true, ts: '2026-06-28T14:02:00Z'}),
  vote({voter: 2, score: 5, accuracy: 0, wouldPlay: false, ts: '2026-06-29T09:41:00Z'}),
  vote({voter: 3, score: 3, accuracy: 1, wouldPlay: null, ts: '2026-06-30T22:15:00Z'}),
];

export const WithVotes: Story = {
  args: {
    pair: {aName: 'Sisu - Divine Water Dragon', bName: 'Raya - Leader of Heart', engineScore: 8},
    votes: VOTES,
  },
};

export const Empty: Story = {args: {pair: null, votes: []}};
```

After. A quick vote (no score) joins the fixture, `NoVotes` shows a pair the vote log holds no votes for, and `Loading` shows the notice:

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {FONTS, SPACING} from '../../app-bridge';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {VoteDetailTable} from './VoteDetailTable';
import type {VoteLogRow} from './voteLogTypes';

const meta: Meta<typeof VoteDetailTable> = {
  title: 'Admin/Insights/Calibration/Vote detail',
  component: VoteDetailTable,
  tags: ['autodocs'],
  // One column of the page's pairs-and-votes grid, on the admin canvas.
  decorators: [
    (Story) => (
      <div style={{maxWidth: 480, padding: SPACING.xxxl, color: ADMIN_COLORS.text, fontFamily: FONTS.body}}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

const DEFAULT_VOTE: VoteLogRow = {
  a: 'crd_a',
  b: 'crd_b',
  aName: 'Sisu - Divine Water Dragon',
  bName: 'Raya - Leader of Heart',
  score: null,
  accuracy: null,
  isReal: true,
  wouldPlay: null,
  difficulty: null,
  whoCarries: null,
  ts: '',
  voter: 1,
};

/** Build a VoteLogRow fixture over the shared default pair. */
const vote = (v: Partial<VoteLogRow>): VoteLogRow => ({...DEFAULT_VOTE, ...v});

const VOTES: VoteLogRow[] = [
  vote({voter: 1, score: 8, accuracy: -1, wouldPlay: true, ts: '2026-06-28T14:02:00Z'}),
  vote({voter: 2, score: 5, accuracy: 0, wouldPlay: false, ts: '2026-06-29T09:41:00Z'}),
  vote({voter: 3, score: 3, accuracy: 1, wouldPlay: null, ts: '2026-06-30T22:15:00Z'}),
  // A quick vote: no score, so the pill is the neutral dash.
  vote({voter: 4, ts: '2026-07-01T08:30:00Z'}),
];

const PAIR = {aName: 'Sisu - Divine Water Dragon', bName: 'Raya - Leader of Heart', engineScore: 8};

export const WithVotes: Story = {args: {pair: PAIR, votes: VOTES}};

/** No pair selected yet. */
export const Empty: Story = {args: {pair: null, votes: []}};

/** A pair the vote log holds no votes for. */
export const NoVotes: Story = {args: {pair: PAIR, votes: []}};

/** The vote log is still loading: the notice stands in for the table. */
export const Loading: Story = {args: {pair: PAIR, votes: [], notice: 'Loading the vote log…'}};
```

`src/tools/analytics/DimensionParticipation.stories.tsx`. Before (the whole current file):

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {DimensionParticipation} from './DimensionParticipation';

const meta: Meta<typeof DimensionParticipation> = {
  title: 'Features/AdminAnalytics/DimensionParticipation',
  component: DimensionParticipation,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {fill: {score: 1730, accuracy: 115, isReal: 24, wouldPlay: 24, difficulty: 24}, totalVotes: 1823},
};
```

After. `Scoped` and `NoVotes` are new:

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {FONTS, SPACING} from '../../app-bridge';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {DimensionParticipation} from './DimensionParticipation';

const meta: Meta<typeof DimensionParticipation> = {
  title: 'Admin/Insights/Calibration/Dimension participation',
  component: DimensionParticipation,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{maxWidth: 720, padding: SPACING.xxxl, color: ADMIN_COLORS.text, fontFamily: FONTS.body}}>
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

const FILL = {score: 1730, accuracy: 115, isReal: 24, wouldPlay: 24, difficulty: 24};

export const Default: Story = {args: {fill: FILL, totalVotes: 1823}};

/** Under /calibration's scope row, which this panel ignores, so it says what it reads. */
export const Scoped: Story = {args: {fill: FILL, totalVotes: 1823, scope: 'All votes, whatever the rule'}};

export const NoVotes: Story = {args: {fill: null, totalVotes: 0}};
```

Optional look: `pnpm storybook` (http://localhost:6007), then Admin › Insights › Calibration. Check four things:
- the pressed row's gold bar (under (b), with its "7 → 4" in the text colour);
- the jump and count columns lining up from row to row;
- a long pair name truncating with its full text in the tooltip;
- the `Loading` notice inside the vote panel.

- [ ] **Step 15: Lint and typecheck**

Run: `pnpm lint` and `pnpm typecheck`.

Expected: both pass. Every changed file passes the `inkweave/*` rules:
- no styled `<button>`;
- font sizes from `ADMIN_TYPE`;
- no raw colours;
- no `useMemo` or `useCallback`.

Every new prop is optional, so `CalibrationView`'s call sites typecheck unchanged.

- [ ] **Step 16: Commit**, with the Bash tool, only after the owner approves. Use two separate calls, so the commit command starts with `USER_APPROVED=1`:

```bash
git add src/tools/analytics/PairList.tsx src/tools/analytics/VoteDetailTable.tsx src/tools/analytics/DimensionParticipation.tsx src/tools/analytics/PairList.stories.tsx src/tools/analytics/VoteDetailTable.stories.tsx src/tools/analytics/DimensionParticipation.stories.tsx src/tools/analytics/__tests__/PairList.test.tsx src/tools/analytics/__tests__/VoteDetailTable.test.tsx src/tools/analytics/__tests__/DimensionParticipation.test.tsx
```

```bash
USER_APPROVED=1 git commit -m "feat(calibration): restyle the pair, vote and dimension panels (#24)"
```

The pre-commit hook runs lint and the tests. If Vitest fails to start its workers, the machine is under load (memory: "Pre-commit worker timeout"). Stop any preview servers of your own, wait out other sessions' runs, and retry. Never skip the hook.

<!--
Review notes on R2-4 (2026-10-05), how each was handled:
- Notes 1 to 7 were checked against the repo and applied here. Sandbox: scratchpad/r2-rebase/sandbox-fix-r24.
- Note 1 also asks for the owner decision to be raised in the header's task table or flag list and assigned to R2-3. This pass edits only R2-4.md, so header.md and R2-3.md are unchanged. The orchestrator should carry the flag there; the measurements are in the Re-base notes above (the proposal that sat beside them is withdrawn, see the last line).
- Note 2 asks to tell R2-4b that PairList's private scoreText matches its exported one. That is the "For R2-4b" line under Interfaces; R2-4b.md is unchanged.
- Note 8 (R2-4c's story title 'Admin/Insights/Calibration charts' should be 'Admin/Insights/Calibration/Charts') is correct but not applied here: the fix is in R2-4c.md, which this pass doesn't edit. R2-4's three titles already use 'Admin/Insights/Calibration/…'.
- No note was rejected.
- Cross-task critic, item 5 (2026-10-05): the accentTintFaint proposal is withdrawn. R2-3's gate decides for both tasks: (a) rowSelected needs nothing here, (b) adds jumpColor (Step 3) and one case (Step 1), and neither records WithSelection's violation. Checked in scratchpad/r2-rebase/sandbox-apply-r24.
-->
