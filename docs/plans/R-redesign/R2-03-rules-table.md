> Part of [R: Admin redesign](../R-redesign.md), phase R2 ([R2-calibration-tuning.md](R2-calibration-tuning.md)). Read the main plan's decisions (R-17 to R-26 for R2), corrections, global constraints and shared interfaces, then the R2 header, first.

> **Owner decision (2026-10-05, R-27): option (a).** Implement every part marked "only (a)" and skip every part marked "only (b)" or "neither". No need to ask the owner before Step 1.

> **Re-base notes (2026-10-05, main @ c92e260, pin bc877e1).** Rebased from the outline's "Task R2-3: Rules table" (written 2026-10-01 against the planned R1 code and pin 5a54ee9).
> - **Kept from the outline:** the three new files; the props `rows`, `selectedId`, `edited` and `onSelect`; the sort state inside the component, `useState<RuleSortKey>('gap')`, with a `SegmentedControl` named "Sort rules by" and the options |Gap| and Votes in the `Panel`'s action; a `<table>` with `<th scope="col">` for Rule, Type, Bias, Gap and Votes inside an `overflow-x: auto` box; rows as `<tr role="button" tabIndex={0} aria-pressed>` that select on click, Enter and Space, with `className="adm-row-btn"` in place of the hover state; "low n" under `LOW_N` (10) in an `ADMIN_RADIUS.tag` tag; a `<span role="img" aria-label="Pending tuning edit">` gold dot on every row whose `tuningKey` is in `edited`; "—" for Gap and Votes and an empty bias bar on a tuning-only row; and the outline's six tests.
> - **Changed, and why:**
>   1. **A rule with no score votes is drawn in muted text, not at 0.5 opacity** (R-6). At half opacity its muted cells (votes, "—", "low n") measure 2.66:1 on the card, 2.63:1 hovered and 2.61:1 selected, so they fail 1.4.3. The name still steps down to `muted`, and a test holds both.
>   2. **New optional `emptyText` prop (default "No rules to show.").** R-20 makes an empty table a real state: no token and no analytics. R2-6 picks the text it passes; the `Empty` story shows a stand-in. With no rows, the sort control is hidden too.
>   3. **The pressed row's gold bar is also drawn on its first cell, by AdminStyles.** `adm-row-btn` draws the bar as an inset `box-shadow` on the row. R1-2's ledger carried "inset box-shadow on `<tr role=button>`" to a browser check that never covered it: R1 applied the class only to `<button>`s, and `RuleCalibrationTable` still styles itself inline. Browsers differ on painting a box-shadow on a `<tr>` in a collapsed table, while a cell's always paints. CLAUDE.md keeps hover, focus and selected states in `src/theme/AdminStyles.tsx`, so the first cell's bar is a rule there, `tr.adm-row-btn[aria-pressed="true"]>td:first-child`, and the reasoning moves into its doc comment. The two bars coincide where both paint.
>   4. **The table's name carries the sort** ("Rules, widest gap first" / "Rules, most votes first"), and **`aria-sort` marks the sorted column**: `other` on Gap, because it sorts by size, and `descending` on Votes. The sort control sits outside the column heads, so this is how a screen reader hears the order. **When no row has a stat** (`tuning.json` alone: local dev and the `TuningOnly` story), sorting moves nothing, so the control, the order in the name and `aria-sort` all go, and the table is named "Rules".
>   5. **Each row is named by `rowLabel`.** A `<tr role="button">` has presentational children, so a screen reader never hears the column heads, and the row's text alone ("Location Boost low n Pending tuning edit Playstyle +2.44 9") gives numbers with no words. The row's `aria-label` puts a word on each: "Location Boost, Playstyle, gap +2.44, 9 score votes, low n, pending tuning edit". A rule nobody has scored, tuning-only rows included, reads "no score votes" rather than "gap —, 0 score votes", as R2-1's `pairsHeading` does. The label starts with the visible name (2.5.3). The draft's `{' '}` spacing workaround went with it.
>   6. **`minWidth` is 560, not the handoff's 520.** The handoff's own column minimums (150 + 80 + 100 + 60 + 60 = 450), plus four 16px gaps and two 16px insets, need 546px. At 560, with the fixed columns here (Type 96, Bias 136, Gap 76, Votes 84, padding included), Rule gets 560 − 392 = 168px, which is 144px of content inside its 16px and 8px padding. This matches `VoteLogTable`.
>   7. **Built on R1's real code.** `gapColor` now mutes any gap that prints "0.00", and a test covers it. `BiasBar` lives in `src/ui`: it is `aria-hidden`, and its fill carries `data-direction`. `Panel padded={false}` and the head cells follow `VoteLogTable`. Stories are titled `Admin/Insights/…`, as R1's are.
>   8. **The ported test changes shape.** The old test found rows with `getAllByRole('button', {pressed: false})` and sorted with the "Votes ▼" header button. Both are gone: sorting moved to the `SegmentedControl`. The new test queries rows inside the table and reads the order from the Gap and Votes columns, which also checks U+2212, the "+" sign and `fmtInt`. It renders the table under `AdminStyles`, as AdminShell mounts it, because the first-cell bar is now a stylesheet rule.
>   9. **A held Enter or Space selects once.** `onKeyDown` fires on every key repeat, and the workspace turns a second press into "all pairs", so a held key would flip the selection about 30 times a second and redraw every chart each time. The handler ignores `e.repeat`.
>   10. **Small helpers keep Code Health at 10.0.** With items 4, 5 and 9 written inline, the local CodeScene scored the file 9.38 (Overall Code Complexity: the mean per function). `scoreWords`, `rowLabel`, `onRowKey` and the `TYPE_LABEL` map bring it back to 10.0.
> - **The owner's call before Step 1: red gap text on a selected row.** See the block under the task heading. R2-4's pair rows print red text on `adm-row-btn` too (its "Flagged, not changed here" item), so it is decided once, here.
> - **Pin check:** R2-3 cites no app or engine line. The facts R2-1 cites are unchanged at bc877e1: `getAllRules` `rules.ts:1456`, `getRuleById` `:1471`, `location-control` `:495`, `lore-denial` `:1011`; `tuning.json` has 22 playstyles plus `shift-targets`, and `ruleTexts` holds `shift-targets` and `ramp`. The colours in the contrast table are the pin's `theme.ts` tokens (`error` #ef4444, `success` #4ade80, `primary` #ffb900, `gray400` #8888aa, `background` #0d0d14).
> - **Depends on R2-1 (re-based)** for `CalibrationRow {id, name, category, stat, tuningKey}`, `LOW_N`, `RuleSortKey` and `sortCalibrationRows(rows, key)`. That function puts rows with a stat first, by |gap| (null counts as 0) or by votes, both descending, and tuning-only rows last in input order. This was checked against the re-based `R2-1.md`: its `sortCalibrationRows` (Step 10) has exactly these semantics, `LOW_N = MIN_RULE_VOTES` (10), and `RuleStat.playstyleId` is optional (`playstyleId?: string | null`). So the `stat()` builders in the test and the stories need nothing new. If a later change makes that field required, add `playstyleId: null` to both builders.
> - **Deferred R1 items:** none of the "minor (deferred)" entries in `progress.md` touch the rules table. The R1-2 ⚠️ item (the inset box-shadow on `<tr role=button>`) is item 3 above, plus Step 7's browser check.
> - **Verified** in a scratch sandbox (`scratchpad/r2-rebase/sandbox-fix-r23`): a copy of the repo's `src` and configs, the repo's `node_modules` and `upstream` linked by junction (the engine built from the pin, bc877e1), plus R2-1's `calibrationModel.ts` as `R2-1.md` writes it and `RuleStat.playstyleId?`. Every code block below was extracted from this file and run, for each of the three answers:
>   - Step 2 fails as written: the import error for the table, plus, for (a), the three theme tests.
>   - Step 4 passes: 28 tests (neither), 29 (b) and 30 (a), over three files. A cold run under load once timed the first test out (5.8 s against Vitest's 5 s); both reruns passed.
>   - Taking out the first-cell rule, the `e.repeat` guard, `sortable` or the `aria-label` each fails exactly one test.
>   - axe-core 4.13.0 in jsdom, over the five stories through `composeStories`, reports no violations. jsdom has no layout, so colour contrast was off there; the contrast table was computed by hand, both unrounded and with axe's per-channel rounding.
>   - `tsc -p tsconfig.app.json` (strict, the app's flags) is clean. `pnpm exec eslint --stdin` is clean on every changed file.
>   - CodeScene `code_health_review` scores 10.0 on every changed file that has functions (`adminTheme.ts` has none). That was the local MCP 1.1.3; the server-side PR gate is newer.

### Task R2-3: Rules table

**The owner's call before Step 1: red gap text on a selected row.** Ask the owner before you start, and name the answer in your report. Each step below marks what only (a) or only (b) adds.

The Gap cell is 13px regular text in `gapColor`, so a negative gap prints in `ADMIN_COLORS.over` (#ef4444). `adm-row-btn` fills a selected row with `accentTintSoft`, and a selected, hovered row with `accentTint`, both over the panel's card. 13px text needs 4.5:1, and axe-core passes only above it (`contrast > expected`, axe 4.13.0):

| Row state | Fill over the card | Red gap text |
|---|---|---|
| At rest | none | 4.95:1 |
| Hovered or focused | `rowHover` | 4.63:1 |
| Selected | `accentTintSoft` (gold at 0.06) | **4.497:1, fails** (axe prints 4.49) |
| Selected and hovered: the usual state after a click, with the pointer still on the row | `accentTint` (gold at 0.1) | **4.15:1, fails** |

Green gap text stays above 8.9:1 on every fill, and text and muted above 5.9:1. Offer the owner these choices:
- **(a) Theme.** A new `ADMIN_COLORS.rowSelected`, `hexRgba(COLORS.primary, 0.05)`, fills a selected row button, hovered or not: no hover step-up. Red reaches 4.58:1. Only `.adm-row-btn[aria-pressed="true"]` and its `:hover` rule use it. Every row button changes with it: Activity's "Most active voters" today, and R2-4's pair rows when they land, which settles R2-4's flagged item. This adds `adminTheme.ts`, `AdminTheme.stories.tsx` and a test in each theme suite to this task.
- **(b) RulesTable.** On the selected row, a negative gap prints in `ADMIN_COLORS.text` (12.7:1 even hovered). Its "−" sign and the bias bar still show the side. The theme doesn't change, and R2-4 must make the same change to its pair rows. This adds one test.
- **Neither.** Write the code without the (a) or (b) parts. Step 7 then expects exactly one violation, and it is recorded as the owner's call, as R1-3's red ScorePill contrast was.

**Files:**
- Create: `src/tools/analytics/calibration/RulesTable.tsx`
- Create: `src/tools/analytics/calibration/RulesTable.stories.tsx`
- Test: `src/tools/analytics/calibration/__tests__/RulesTable.test.tsx`
- Modify: `src/theme/AdminStyles.tsx`. The pressed `<tr>`'s first-cell bar and its doc comment, and with (a), the two selected-row rules.
- Only (a), modify: `src/theme/adminTheme.ts` (`rowSelected`) and `src/theme/AdminTheme.stories.tsx` (its swatch).
- Only (a), test: `src/theme/__tests__/adminTheme.test.ts` and `src/theme/__tests__/AdminStyles.test.tsx`.
- `RuleCalibrationTable` stays until R2-7 deletes it, and R2-6 mounts `RulesTable` in the workspace.

**Interfaces:**
- **Consumes:**
  - From R2-1's `src/tools/analytics/calibration/calibrationModel.ts`:
    - `CalibrationRow` (`{id: string; name: string; category: 'playstyle' | 'direct'; stat: RuleStat | null; tuningKey: string | null}`)
    - `LOW_N` (10)
    - `RuleSortKey` (`'gap' | 'votes'`)
    - `sortCalibrationRows(rows: CalibrationRow[], key: RuleSortKey): CalibrationRow[]`
  - `RuleStat` from `src/tools/analytics/voteAnalyticsTypes.ts` (a type, in the component, the test and the stories).
  - R1's UI pieces:
    - `Panel({title, action, children, padded})` from `src/ui/Panel.tsx`
    - `SegmentedControl({options, value, onChange, ariaLabel})` from `src/ui/SegmentedControl.tsx`
    - `BiasBar({gap})` from `src/ui/BiasBar.tsx`
    - `fmtGap` and `fmtInt` from `src/ui/format.ts`
    - `gapColor` from `src/tools/analytics/gapColor.ts`
  - The theme and the bridge:
    - `ADMIN_COLORS`, `ADMIN_RADIUS` and `ADMIN_TYPE` from `src/theme/adminTheme.ts`
    - `LETTER_SPACING`, `SPACING` and `TRUNCATE` from `src/app-bridge.ts`
    - the `adm-row-btn` class and the `AdminStyles` component from `src/theme/AdminStyles.tsx` (the component in the test only)
- **Produces:**
```ts
// src/tools/analytics/calibration/RulesTable.tsx
export function RulesTable(props: {
  rows: CalibrationRow[];
  selectedId: string | null;      // a row id: the workspace passes the row ?rule= resolves to (findRow), never the raw value
  edited: ReadonlySet<string>;    // editedKeys(pending): tuning keys with a pending edit
  onSelect: (id: string) => void; // the row's id on click, Enter or Space (once per press); the workspace turns a second press into "all pairs"
  emptyText?: string;             // in place of the table when rows is empty; default "No rules to show." R2-6 picks its text (R-20)
}): JSX.Element;
// Renders <Panel title="Rules"> (a region named "Rules") holding <table aria-label="Rules, widest gap first" |
// "Rules, most votes first">, or "Rules" when no row has a stat (then no sort control and no aria-sort).
// Each rule row is role="button", aria-pressed, named by rowLabel:
// "Location Boost, Playstyle, gap +2.44, 9 score votes, low n, pending tuning edit"; "Questing, Playstyle, no score votes".

// src/theme/AdminStyles.tsx: new rule
// tr.adm-row-btn[aria-pressed="true"]>td:first-child{box-shadow:inset 2px 0 0 <accent>;}

// Only (a), src/theme/adminTheme.ts:
// ADMIN_COLORS.rowSelected = hexRgba(COLORS.primary, 0.05): a selected row button's fill, hovered or not.
```

- [ ] **Step 1: Write the failing test**

Create `src/tools/analytics/calibration/__tests__/RulesTable.test.tsx`:

```tsx
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {AdminStyles} from '../../../../theme/AdminStyles';
import {ADMIN_COLORS} from '../../../../theme/adminTheme';
import type {RuleStat} from '../../voteAnalyticsTypes';
import type {CalibrationRow} from '../calibrationModel';
import {RulesTable} from '../RulesTable';

function stat(ruleId: string, meanGap: number | null, scoreVotes: number): RuleStat {
  return {
    ruleId,
    ruleName: ruleId,
    category: 'playstyle',
    scoreVotes,
    pairsVoted: 1,
    meanGap,
    accuracySentiment: null,
    pairsCovered: 1,
  };
}

/** A row as buildCalibrationRows makes it: a playstyle under its own tuning key, unless `extra` says otherwise. */
function row(id: string, name: string, extra: Partial<CalibrationRow> = {}): CalibrationRow {
  return {id, name, category: 'playstyle', stat: null, tuningKey: id, ...extra};
}

const ROWS: CalibrationRow[] = [
  row('ramp', 'Ramp', {stat: stat('ramp', -0.57, 557)}),
  // A tuning.json entry no analytics rule reaches: listed last whatever the sort.
  row('questing', 'Questing'),
  row('shift-targets', 'Shift Targets', {category: 'direct', stat: stat('shift-targets', 1.2, 214)}),
  // A direct rule with no tuning.json copy.
  row('singer-songs', 'Singer + Songs', {category: 'direct', stat: stat('singer-songs', 0.18, 143), tuningKey: null}),
  // Two rules that share one tuning.json entry; one under LOW_N score votes, one exactly at it.
  row('location-boost', 'Location Boost', {stat: stat('location-boost', 2.44, 9), tuningKey: 'location-control'}),
  row('location-lore', 'Location Lore', {stat: stat('location-lore', -0.1, 10), tuningKey: 'location-control'}),
  row('dwarfs', 'Seven Dwarfs', {stat: stat('dwarfs', null, 0)}),
];

const NO_EDITS: ReadonlySet<string> = new Set();
const [TYPE, GAP, VOTES] = [1, 3, 4];

/** The table under AdminStyles, as AdminShell mounts it: the pressed row's first-cell bar is a stylesheet rule. */
function renderTable(props: Partial<React.ComponentProps<typeof RulesTable>> = {}) {
  const onSelect = vi.fn();
  render(
    <>
      <AdminStyles />
      <RulesTable rows={ROWS} selectedId={null} edited={NO_EDITS} onSelect={onSelect} {...props} />
    </>,
  );
  return onSelect;
}

/** The rule rows, top to bottom: each row is one button, inside the table. */
const ruleRows = () => within(screen.getByRole('table')).getAllByRole('button') as HTMLTableRowElement[];
/** One column's text, top to bottom. */
const column = (index: number) => ruleRows().map((r) => r.cells[index].textContent);
const ruleRow = (name: RegExp) => within(screen.getByRole('table')).getByRole('button', {name}) as HTMLTableRowElement;

describe('RulesTable', () => {
  it('sorts by the size of the gap, then by votes from the sort control', async () => {
    renderTable();
    expect(column(GAP)).toEqual(['+2.44', '+1.20', '−0.57', '+0.18', '−0.10', '—', '—']);
    expect(screen.getByRole('columnheader', {name: 'Gap'})).toHaveAttribute('aria-sort', 'other');
    expect(screen.getByRole('table', {name: 'Rules, widest gap first'})).toBeInTheDocument();

    const sort = screen.getByRole('group', {name: 'Sort rules by'});
    await userEvent.click(within(sort).getByRole('button', {name: 'Votes'}));
    expect(column(VOTES)).toEqual(['557', '214', '143', '10', '9', '0', '—']);
    expect(within(sort).getByRole('button', {name: 'Votes'})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('columnheader', {name: 'Votes'})).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getByRole('columnheader', {name: 'Gap'})).not.toHaveAttribute('aria-sort');
    expect(screen.getByRole('table', {name: 'Rules, most votes first'})).toBeInTheDocument();
  });

  it('drops the sort control, the order and aria-sort when no row has a stat (tuning.json alone)', () => {
    renderTable({rows: [row('ramp', 'Ramp'), row('questing', 'Questing')]});
    expect(screen.queryByRole('group', {name: 'Sort rules by'})).not.toBeInTheDocument();
    expect(screen.getByRole('table', {name: 'Rules'})).toBeInTheDocument();
    expect(screen.getByRole('columnheader', {name: 'Gap'})).not.toHaveAttribute('aria-sort');
    expect(screen.getByRole('columnheader', {name: 'Votes'})).not.toHaveAttribute('aria-sort');
  });

  it('selects a row by click, Enter and Space, and marks the row whose id is selectedId pressed', async () => {
    const onSelect = renderTable({selectedId: 'location-boost'});
    const boost = ruleRow(/^Location Boost/);
    expect(within(screen.getByRole('table')).getAllByRole('button', {pressed: true})).toEqual([boost]);
    // AdminStyles draws the gold bar on the pressed row's first cell as well as on the row.
    expect(boost.cells[0]).toHaveStyle({boxShadow: `inset 2px 0 0 ${ADMIN_COLORS.accent}`});

    const ramp = ruleRow(/^Ramp/);
    expect(ramp).toHaveAttribute('aria-pressed', 'false');
    expect(ramp.cells[0]).not.toHaveStyle({boxShadow: `inset 2px 0 0 ${ADMIN_COLORS.accent}`});
    await userEvent.click(ramp);
    expect(ramp).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onSelect.mock.calls).toEqual([['ramp'], ['ramp'], ['ramp']]);
    // Space selects without scrolling the page.
    expect(fireEvent.keyDown(ramp, {key: ' '})).toBe(false);
    // A held key repeats; only its first press selects.
    fireEvent.keyDown(ramp, {key: 'Enter', repeat: true});
    expect(onSelect).toHaveBeenCalledTimes(4);
  });

  it('marks a rule with fewer than 10 score votes "low n"', () => {
    renderTable();
    expect(within(ruleRow(/^Location Boost/)).getByText('low n')).toBeInTheDocument();
    expect(within(ruleRow(/^Location Lore/)).queryByText('low n')).not.toBeInTheDocument();
    expect(within(ruleRow(/^Questing/)).queryByText('low n')).not.toBeInTheDocument();
  });

  it('draws a rule with no score votes in muted text, at full opacity', () => {
    renderTable();
    expect(screen.getByText('Seven Dwarfs')).toHaveStyle({color: ADMIN_COLORS.muted});
    expect(screen.getByText('Ramp')).toHaveStyle({color: ADMIN_COLORS.text});
    expect(ruleRow(/^Seven Dwarfs/)).not.toHaveStyle({opacity: '0.5'});
  });

  it('shows "—" for Gap and Votes on a tuning-only row, with an empty bias bar, and lists it last', () => {
    renderTable();
    const last = ruleRows().at(-1)!;
    expect(last).toBe(ruleRow(/^Questing/));
    expect(last.cells[GAP]).toHaveTextContent('—');
    expect(last.cells[VOTES]).toHaveTextContent('—');
    expect(last.querySelector('[data-direction]')).toBeNull();
  });

  it('colours a gap by its side, and one that prints 0.00 as no gap', () => {
    const rows = [
      row('a', 'Alpha', {stat: stat('a', -0.57, 20)}),
      row('b', 'Beta', {stat: stat('b', 1.2, 20)}),
      row('c', 'Gamma', {stat: stat('c', -0.004, 20)}),
    ];
    renderTable({rows});
    expect(screen.getByText('−0.57')).toHaveStyle({color: ADMIN_COLORS.over});
    expect(screen.getByText('+1.20')).toHaveStyle({color: ADMIN_COLORS.under});
    expect(screen.getByText('0.00')).toHaveStyle({color: ADMIN_COLORS.muted});
  });

  it('shows the pending-edit dot on every row that shares an edited tuning key', () => {
    renderTable({edited: new Set(['location-control'])});
    expect(screen.getAllByRole('img', {name: 'Pending tuning edit'})).toHaveLength(2);
    expect(within(ruleRow(/^Location Lore/)).getByRole('img', {name: 'Pending tuning edit'})).toBeInTheDocument();
  });

  it('names each row with a word for every number, since a button row hides the column heads', () => {
    renderTable({edited: new Set(['location-control'])});
    expect(ruleRow(/^Location Boost/)).toHaveAccessibleName(
      'Location Boost, Playstyle, gap +2.44, 9 score votes, low n, pending tuning edit',
    );
    expect(ruleRow(/^Shift Targets/)).toHaveAccessibleName('Shift Targets, Direct, gap +1.20, 214 score votes');
    // Nobody has scored these, so no "gap —".
    expect(ruleRow(/^Seven Dwarfs/)).toHaveAccessibleName('Seven Dwarfs, Playstyle, no score votes');
    expect(ruleRow(/^Questing/)).toHaveAccessibleName('Questing, Playstyle, no score votes');
  });

  it("names each row's type as Playstyle or Direct", () => {
    renderTable();
    expect(column(TYPE)).toEqual(['Playstyle', 'Direct', 'Playstyle', 'Direct', 'Playstyle', 'Playstyle', 'Playstyle']);
  });

  it('shows the empty text in place of the table and the sort control when there are no rows', () => {
    const {rerender} = render(<RulesTable rows={[]} selectedId={null} edited={NO_EDITS} onSelect={() => {}} />);
    expect(screen.getByText('No rules to show.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', {name: 'Sort rules by'})).not.toBeInTheDocument();

    rerender(
      <RulesTable rows={[]} selectedId={null} edited={NO_EDITS} onSelect={() => {}} emptyText="Nothing here." />,
    );
    expect(screen.getByText('Nothing here.')).toBeInTheDocument();
  });
});
```

**Only (b):** in the same file, add this test after the `'colours a gap by its side, and one that prints 0.00 as no gap'` test:

```tsx
  it('prints a negative gap on the selected row in the text colour, its sign and bar still showing the side', () => {
    renderTable({selectedId: 'ramp'});
    const ramp = ruleRow(/^Ramp/);
    expect(within(ramp).getByText('−0.57')).toHaveStyle({color: ADMIN_COLORS.text});
    expect(ramp.querySelector('[data-direction="over"]')).not.toBeNull();
    // A row that isn't selected keeps its side's colour.
    expect(within(ruleRow(/^Location Lore/)).getByText('−0.10')).toHaveStyle({color: ADMIN_COLORS.over});
  });
```

**Only (a):** in `src/theme/__tests__/adminTheme.test.ts`, the fills of the text-contrast test. `accentTint` stays covered, since WebEventsCard draws it on a card; `rowSelected` joins. Before:

```ts
      'active nav item': over(ADMIN_COLORS.accentTint, sidebar),
      'selected row, hovered': over(ADMIN_COLORS.accentTint, card),
      'selected card': over(ADMIN_COLORS.accentTintSoft),
```

After:

```ts
      'active nav item': over(ADMIN_COLORS.accentTint, sidebar),
      'accent tint on a card': over(ADMIN_COLORS.accentTint, card),
      'selected row': over(ADMIN_COLORS.rowSelected, card),
      'selected card': over(ADMIN_COLORS.accentTintSoft),
```

Then add this test before `it('draws selection borders and chart marks at 3:1 or more (WCAG 1.4.11)', () => {`:

```ts
  it('keeps the gap colours above 4.5:1 on a row button in every state, a selected one included', () => {
    const card = over(ADMIN_COLORS.card);
    const rowFills: Record<string, Rgb> = {
      'row at rest': card,
      'row hovered or focused': over(ADMIN_COLORS.rowHover, card),
      'selected row, hovered or not': over(ADMIN_COLORS.rowSelected, card),
    };
    for (const [name, fill] of Object.entries(rowFills)) {
      // axe passes text above the ratio, not at it.
      expect(contrast(rgbOf(ADMIN_COLORS.over), fill), `over on ${name}`).toBeGreaterThan(4.5);
      expect(contrast(rgbOf(ADMIN_COLORS.under), fill), `under on ${name}`).toBeGreaterThan(4.5);
    }
  });
```

**Only (a):** in `src/theme/__tests__/AdminStyles.test.tsx`, add this test before `it('uses token colours only: hexes from COLORS, rgba() from ADMIN_COLORS', () => {`:

```tsx
  it('keeps a selected row button on one fill, hovered or not', () => {
    const css = stylesheet();
    expect(css).toContain(`.adm-row-btn[aria-pressed="true"]{background:${ADMIN_COLORS.rowSelected};`);
    expect(css).toContain(`.adm-row-btn[aria-pressed="true"]:hover:where(:not(:disabled)){background:${ADMIN_COLORS.rowSelected};}`);
  });
```

- [ ] **Step 2: Run it and watch it fail**

R2-1's `calibrationModel.ts` must be committed first. On a fresh checkout, run `pnpm build:engine` first, because `calibrationModel.ts` imports the engine.

Run: `pnpm vitest run src/tools/analytics/calibration/__tests__/RulesTable.test.tsx src/theme/__tests__`

Expected: FAIL.
- **Every answer:** the table's file reads `Failed to resolve import "../RulesTable" from "src/tools/analytics/calibration/__tests__/RulesTable.test.tsx". Does the file exist?` and runs no tests.
- **Neither, or (b):** both theme suites pass: `Test Files  1 failed | 2 passed (3)`, `Tests  17 passed (17)`.
- **(a):** three theme tests fail as well: `TypeError: Cannot read properties of undefined (reading 'slice')` in both `adminTheme.test.ts` tests that read `rowSelected`, and `AssertionError: expected '…' to contain '.adm-row-btn[aria-pressed="true"]{bac…'` in `AdminStyles.test.tsx`. The run ends with `Test Files  3 failed (3)` and `Tests  3 failed | 16 passed (19)`.

- [ ] **Step 3: Write the component and the stylesheet rule**

Create `src/tools/analytics/calibration/RulesTable.tsx`:

```tsx
import {useState} from 'react';
import {LETTER_SPACING, SPACING, TRUNCATE} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {BiasBar} from '../../../ui/BiasBar';
import {fmtGap, fmtInt} from '../../../ui/format';
import {Panel} from '../../../ui/Panel';
import {SegmentedControl} from '../../../ui/SegmentedControl';
import {gapColor} from '../gapColor';
import type {RuleStat} from '../voteAnalyticsTypes';
import {LOW_N, sortCalibrationRows, type CalibrationRow, type RuleSortKey} from './calibrationModel';

interface RulesTableProps {
  /** buildCalibrationRows' rows: the analytics rules, then any tuning.json entry no rule reaches. */
  rows: CalibrationRow[];
  /** The selected row's id. The workspace passes the row ?rule= resolves to (findRow), never the raw value. */
  selectedId: string | null;
  /** Tuning keys with a pending edit (editedKeys). Every row that shares one shows the dot. */
  edited: ReadonlySet<string>;
  /** A row's id, on click, Enter or Space. The workspace decides that a second press means all pairs. */
  onSelect: (id: string) => void;
  /** Shown in place of the table when there are no rows. */
  emptyText?: string;
}

const SORT_OPTIONS: ReadonlyArray<{value: RuleSortKey; label: string}> = [
  {value: 'gap', label: '|Gap|'},
  {value: 'votes', label: 'Votes'},
];
/** The table's name says its order, so a screen reader hears the sort the control shows. */
const ORDER: Record<RuleSortKey, string> = {gap: 'widest gap first', votes: 'most votes first'};
const TYPE_LABEL: Record<CalibrationRow['category'], string> = {playstyle: 'Playstyle', direct: 'Direct'};

/** Every column fits from this width; a narrower column scrolls the table inside its own box. */
const TABLE_MIN_WIDTH = 560;
/** The fixed columns, padding included. Rule takes the rest. */
const COLUMN_WIDTH = {type: 96, bias: 136, gap: 76, votes: 84};
const PENDING_DOT = 6;
const NO_VALUE = '—';

const HEAD_CELL: React.CSSProperties = {
  padding: `${SPACING.sm}px`,
  background: ADMIN_COLORS.panel,
  textAlign: 'left',
  fontSize: ADMIN_TYPE.label,
  fontWeight: 700,
  letterSpacing: LETTER_SPACING.cap,
  textTransform: 'uppercase',
  color: ADMIN_COLORS.muted,
};
const CELL: React.CSSProperties = {
  padding: `${SPACING.md}px ${SPACING.sm}px`,
  borderTop: `1px solid ${ADMIN_COLORS.divider}`,
  verticalAlign: 'middle',
};
const NUMBER: React.CSSProperties = {textAlign: 'right', fontVariantNumeric: 'tabular-nums'};
// Cells sit 16px apart (8px each side); the outer two keep 16px from the panel's edge.
const START: React.CSSProperties = {paddingLeft: SPACING.lg};
const END: React.CSSProperties = {paddingRight: SPACING.lg};

/** Under LOW_N score votes a rule's gap is thin evidence. */
function LowNTag() {
  return (
    <span
      title={`Fewer than ${LOW_N} score votes`}
      style={{
        flex: 'none',
        fontSize: ADMIN_TYPE.micro,
        fontWeight: 500,
        lineHeight: 1.4,
        color: ADMIN_COLORS.muted,
        border: `1px solid ${ADMIN_COLORS.strongBorder}`,
        borderRadius: ADMIN_RADIUS.tag,
        padding: `0 ${SPACING.xs}px`,
      }}>
      low n
    </span>
  );
}

/** The gold dot of a rule whose tuning.json entry has a pending edit. The row's name says it too (rowLabel). */
function PendingDot() {
  return (
    <span
      role="img"
      aria-label="Pending tuning edit"
      title="Pending tuning edit"
      style={{
        flex: 'none',
        width: PENDING_DOT,
        height: PENDING_DOT,
        borderRadius: ADMIN_RADIUS.pill,
        background: ADMIN_COLORS.accent,
      }}
    />
  );
}

/**
 * The name, then its markers. A rule with no score votes draws in the muted
 * colour: half opacity, the handoff's cue, would drop its muted cells to about
 * 2.6:1, under 1.4.3 (R-6).
 */
function RuleName({row, edited}: {row: CalibrationRow; edited: boolean}) {
  const votes = row.stat?.scoreVotes;
  return (
    <span style={{display: 'flex', alignItems: 'center', gap: SPACING.sm, minWidth: 0}}>
      <span
        title={row.name}
        style={{
          ...TRUNCATE,
          minWidth: 0,
          fontSize: ADMIN_TYPE.emphasis,
          color: votes === 0 ? ADMIN_COLORS.muted : ADMIN_COLORS.text,
        }}>
        {row.name}
      </span>
      {votes !== undefined && votes < LOW_N && <LowNTag />}
      {edited && <PendingDot />}
    </span>
  );
}

/**
 * A rule's numbers in words: "gap −0.57", "557 score votes", then "low n" under
 * LOW_N. A rule nobody has scored says so, as pairsHeading does, rather than
 * "gap —, 0 score votes".
 */
function scoreWords(stat: RuleStat | null): string[] {
  if (!stat?.scoreVotes) return ['no score votes'];
  const votes = stat.scoreVotes;
  const words = [`gap ${fmtGap(stat.meanGap)}`, `${fmtInt(votes)} score ${votes === 1 ? 'vote' : 'votes'}`];
  return votes < LOW_N ? [...words, 'low n'] : words;
}

/**
 * The row's accessible name. A role="button" row's cells are presentational, so
 * a screen reader never reaches the column heads: each number carries its word
 * ("Ramp, Playstyle, gap −0.57, 557 score votes").
 */
function rowLabel(row: CalibrationRow, edited: boolean): string {
  const marks = edited ? ['pending tuning edit'] : [];
  return [row.name, TYPE_LABEL[row.category], ...scoreWords(row.stat), ...marks].join(', ');
}

/**
 * Enter or Space selects, once per press: a held key repeats, and the
 * workspace turns a second press into "all pairs".
 */
function onRowKey(e: React.KeyboardEvent<HTMLTableRowElement>, select: () => void) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  // Space would scroll the page.
  e.preventDefault();
  if (!e.repeat) select();
}

interface RuleRowProps {
  row: CalibrationRow;
  selected: boolean;
  edited: boolean;
  onSelect: (id: string) => void;
}

/**
 * One rule, as one button: the whole row is the target, and rowLabel names it
 * (the bias bar is decoration). AdminStyles' adm-row-btn draws hover, focus and
 * the pressed row (the gold inset bar, on its first cell too, over the accent
 * tint). A tuning-only row has no stat, so its gap and votes read "—" and its
 * bias bar is empty.
 */
function RuleRow({row, selected, edited, onSelect}: RuleRowProps) {
  const gap = row.stat?.meanGap ?? null;
  return (
    <tr
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={rowLabel(row, edited)}
      className="adm-row-btn"
      onClick={() => onSelect(row.id)}
      onKeyDown={(e) => onRowKey(e, () => onSelect(row.id))}>
      <td style={{...CELL, ...START}}>
        <RuleName row={row} edited={edited} />
      </td>
      <td style={{...CELL, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted}}>
        {TYPE_LABEL[row.category]}
      </td>
      <td style={CELL}>
        <BiasBar gap={gap} />
      </td>
      <td style={{...CELL, ...NUMBER, color: gapColor(gap)}}>{fmtGap(gap)}</td>
      <td style={{...CELL, ...NUMBER, ...END, color: ADMIN_COLORS.muted}}>
        {row.stat ? fmtInt(row.stat.scoreVotes) : NO_VALUE}
      </td>
    </tr>
  );
}

/**
 * The column heads. aria-sort marks the column the rows follow: Gap by size
 * ("other"), or Votes, most first. Null (nothing to sort by) marks neither.
 */
function RulesHead({sortKey}: {sortKey: RuleSortKey | null}) {
  return (
    <thead>
      <tr>
        <th scope="col" style={{...HEAD_CELL, ...START}}>
          Rule
        </th>
        <th scope="col" style={HEAD_CELL}>
          Type
        </th>
        <th scope="col" style={HEAD_CELL}>
          Bias
        </th>
        <th scope="col" aria-sort={sortKey === 'gap' ? 'other' : undefined} style={{...HEAD_CELL, ...NUMBER}}>
          Gap
        </th>
        <th
          scope="col"
          aria-sort={sortKey === 'votes' ? 'descending' : undefined}
          style={{...HEAD_CELL, ...NUMBER, ...END}}>
          Votes
        </th>
      </tr>
    </thead>
  );
}

/**
 * The rules table on /calibration: one row per selectable rule, sorted by
 * |gap| or by votes (sortCalibrationRows, so tuning-only rows stay last). It
 * replaces RuleCalibrationTable. Rows keep <table> semantics for the columns
 * and are buttons with aria-pressed; click, Enter or Space selects. A rule
 * under LOW_N score votes carries "low n", and a row whose tuning entry has a
 * pending edit carries the gold dot (every rule sharing that entry does).
 */
export function RulesTable({rows, selectedId, edited, onSelect, emptyText = 'No rules to show.'}: RulesTableProps) {
  const [sortKey, setSortKey] = useState<RuleSortKey>('gap');
  const sorted = sortCalibrationRows(rows, sortKey);
  // tuning.json alone (no analytics) has nothing to sort by: no control, no order in the name, no aria-sort.
  const sortable = rows.some((row) => row.stat !== null);
  const sort = (
    <SegmentedControl ariaLabel="Sort rules by" options={SORT_OPTIONS} value={sortKey} onChange={setSortKey} />
  );
  return (
    <Panel title="Rules" action={sortable ? sort : undefined} padded={false}>
      {rows.length === 0 ? (
        <p
          style={{
            margin: 0,
            padding: `${SPACING.xxl}px ${SPACING.lg}px`,
            textAlign: 'center',
            fontSize: ADMIN_TYPE.body,
            color: ADMIN_COLORS.muted,
          }}>
          {emptyText}
        </p>
      ) : (
        <div style={{overflowX: 'auto'}}>
          <table
            aria-label={sortable ? `Rules, ${ORDER[sortKey]}` : 'Rules'}
            style={{
              width: '100%',
              minWidth: TABLE_MIN_WIDTH,
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
              fontSize: ADMIN_TYPE.body,
            }}>
            <colgroup>
              <col />
              <col style={{width: COLUMN_WIDTH.type}} />
              <col style={{width: COLUMN_WIDTH.bias}} />
              <col style={{width: COLUMN_WIDTH.gap}} />
              <col style={{width: COLUMN_WIDTH.votes}} />
            </colgroup>
            <RulesHead sortKey={sortable ? sortKey : null} />
            <tbody>
              {sorted.map((row) => (
                <RuleRow
                  key={row.id}
                  row={row}
                  selected={row.id === selectedId}
                  edited={row.tuningKey !== null && edited.has(row.tuningKey)}
                  onSelect={onSelect}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
```

Then, in `src/theme/AdminStyles.tsx`, draw the pressed `<tr>`'s bar on its first cell. Before (`:66-67`):

```ts
.adm-row-btn[aria-pressed="true"]{background:${C.accentTintSoft};box-shadow:inset 2px 0 0 ${C.accent};}
.adm-row-btn[aria-pressed="true"]:hover${ENABLED}{background:${C.accentTint};}
```

After:

```ts
.adm-row-btn[aria-pressed="true"]{background:${C.accentTintSoft};box-shadow:inset 2px 0 0 ${C.accent};}
tr.adm-row-btn[aria-pressed="true"]>td:first-child{box-shadow:inset 2px 0 0 ${C.accent};}
.adm-row-btn[aria-pressed="true"]:hover${ENABLED}{background:${C.accentTint};}
```

And its doc comment says why. Before (`:35-36`):

```ts
 * sides. A focused row also takes the hover fill, as RuleRow does today.
 *
```

After:

```ts
 * sides. A focused row also takes the hover fill, as RuleRow does today.
 *
 * A table row can be a row button too (<tr role="button" className="adm-row-btn">,
 * the rules table on /calibration). Its first cell draws the selected bar as
 * well: browsers differ on painting a box-shadow on a <tr> in a collapsed
 * table, and a cell's always paints, so the two coincide where both do.
 *
```

**Only (a):** add the fill to `src/theme/adminTheme.ts`. Before (`:78-79`):

```ts
  accentTint: hexRgba(COLORS.primary, 0.1),
  accentTintSoft: hexRgba(COLORS.primary, 0.06),
```

After:

```ts
  accentTint: hexRgba(COLORS.primary, 0.1),
  accentTintSoft: hexRgba(COLORS.primary, 0.06),
  // A selected row button's fill, hovered or not. The over-rates red of 13px gap
  // text keeps 4.58:1 on it, against 4.50:1 on accentTintSoft and 4.15:1 on
  // accentTint (axe passes only above 4.5).
  rowSelected: hexRgba(COLORS.primary, 0.05),
```

**Only (a):** in `src/theme/AdminStyles.tsx`, both selected-row rules take it. Before (the three lines above, as this step left them):

```ts
.adm-row-btn[aria-pressed="true"]{background:${C.accentTintSoft};box-shadow:inset 2px 0 0 ${C.accent};}
tr.adm-row-btn[aria-pressed="true"]>td:first-child{box-shadow:inset 2px 0 0 ${C.accent};}
.adm-row-btn[aria-pressed="true"]:hover${ENABLED}{background:${C.accentTint};}
```

After:

```ts
.adm-row-btn[aria-pressed="true"]{background:${C.rowSelected};box-shadow:inset 2px 0 0 ${C.accent};}
tr.adm-row-btn[aria-pressed="true"]>td:first-child{box-shadow:inset 2px 0 0 ${C.accent};}
.adm-row-btn[aria-pressed="true"]:hover${ENABLED}{background:${C.rowSelected};}
```

And the doc comment. Before (`:35`):

```ts
 * sides. A focused row also takes the hover fill, as RuleRow does today.
```

After:

```ts
 * sides. A focused row also takes the hover fill, as RuleRow does today. A
 * selected row keeps one fill (rowSelected), hovered or not: red gap text on
 * the next step up would drop under 4.5:1.
```

**Only (a):** show the swatch in `src/theme/AdminTheme.stories.tsx`. Before (`:14`):

```ts
  {title: 'Accent', keys: ['accent', 'accentHover', 'accentTint', 'accentTintSoft', 'accentBorder', 'accentStrong']},
```

After:

```ts
  {title: 'Accent', keys: ['accent', 'accentHover', 'accentTint', 'accentTintSoft', 'rowSelected', 'accentBorder', 'accentStrong']},
```

**Only (b):** in `RulesTable.tsx`, add this function right above `interface RuleRowProps {`:

```tsx
/**
 * The gap's text colour (the owner's call, option (b)). On the selected row a
 * negative gap prints in the text colour: the over-rates red measures 4.50:1
 * on the selected fill and 4.15:1 when that row is also hovered, and 13px text
 * needs more than 4.5:1. The sign and the bias bar still show the side.
 */
function gapTextColor(gap: number | null, selected: boolean): string {
  const color = gapColor(gap);
  return selected && color === ADMIN_COLORS.over ? ADMIN_COLORS.text : color;
}
```

Then the Gap cell uses it. Before:

```tsx
      <td style={{...CELL, ...NUMBER, color: gapColor(gap)}}>{fmtGap(gap)}</td>
```

After:

```tsx
      <td style={{...CELL, ...NUMBER, color: gapTextColor(gap, selected)}}>{fmtGap(gap)}</td>
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `pnpm vitest run src/tools/analytics/calibration/__tests__/RulesTable.test.tsx src/theme/__tests__`

Expected: PASS, `Test Files  3 passed (3)`, with `Tests  28 passed (28)` for neither, `29 passed (29)` for (b) and `30 passed (30)` for (a). Under load, a cold first run can time out the first test at Vitest's 5 s: rerun once before you treat it as a failure.

- [ ] **Step 5: Add the stories**

Create `src/tools/analytics/calibration/RulesTable.stories.tsx`. `Default` is interactive, the way the workspace selects. The others pin one state each: a rule selected, a low-n rule selected, `tuning.json` alone, and empty.

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {FONTS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import type {RuleStat} from '../voteAnalyticsTypes';
import type {CalibrationRow} from './calibrationModel';
import {RulesTable} from './RulesTable';

const stat = (ruleId: string, scoreVotes: number, meanGap: number | null): RuleStat => ({
  ruleId,
  ruleName: ruleId,
  category: 'playstyle',
  scoreVotes,
  pairsVoted: Math.round(scoreVotes / 2),
  meanGap,
  accuracySentiment: meanGap == null ? null : -meanGap / 2,
  pairsCovered: scoreVotes * 3,
});

/** A row as buildCalibrationRows makes it: a playstyle under its own tuning key unless `extra` says otherwise. */
const row = (id: string, name: string, extra: Partial<CalibrationRow> = {}): CalibrationRow => ({
  id,
  name,
  category: 'playstyle',
  stat: null,
  tuningKey: id,
  ...extra,
});

const ROWS: CalibrationRow[] = [
  row('ramp', 'Ramp', {stat: stat('ramp', 557, -0.57)}),
  row('shift-targets', 'Shift Targets', {category: 'direct', stat: stat('shift-targets', 214, -0.31)}),
  // A direct rule with no tuning.json copy (R-20).
  row('singer-songs', 'Singer + Songs', {category: 'direct', stat: stat('singer-songs', 143, 0.18), tuningKey: null}),
  // Two of the nine location-* rules, which share the Locations entry.
  row('location-boost', 'Location Boost', {stat: stat('location-boost', 9, 2.44), tuningKey: 'location-control'}),
  row('location-buff', 'Location Buff', {stat: stat('location-buff', 64, -0.12), tuningKey: 'location-control'}),
  row('discard', 'Discard', {stat: stat('discard', 88, 0.62)}),
  row('dwarfs', 'Seven Dwarfs', {stat: stat('dwarfs', 0, null)}),
  // A tuning.json entry no analytics rule reaches.
  row('detective', 'Detectives'),
];

/** What local dev shows with no analytics: tuning.json alone, playstyles then direct rules. */
const TUNING_ONLY: CalibrationRow[] = [
  row('lore-denial', 'Lore Denial'),
  row('location-control', 'Locations'),
  row('ramp', 'Ramp'),
  row('shift-targets', 'Shift Targets', {category: 'direct'}),
];

const meta: Meta<typeof RulesTable> = {
  title: 'Admin/Insights/Calibration/Rules table',
  component: RulesTable,
  tags: ['autodocs'],
  // The left column's width on a desktop page. .storybook/preview.tsx mounts AdminStyles (adm-row-btn).
  decorators: [
    (Story) => (
      <div
        style={{
          minHeight: '100vh',
          padding: SPACING.xxxl,
          background: ADMIN_COLORS.page,
          color: ADMIN_COLORS.text,
          fontFamily: FONTS.body,
        }}>
        <div style={{maxWidth: 840}}>
          <Story />
        </div>
      </div>
    ),
  ],
  args: {rows: ROWS, selectedId: null, edited: new Set<string>(), onSelect: () => {}},
};
export default meta;
type Story = StoryObj<typeof meta>;

/** Selection as the workspace keeps it: a click selects a rule, a second click goes back to all pairs. */
function Selectable(args: React.ComponentProps<typeof RulesTable>) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const toggle = (id: string) => setSelectedId((current) => (current === id ? null : id));
  return <RulesTable {...args} selectedId={selectedId} onSelect={toggle} />;
}

/** Click, Enter or Space selects. The two location rules show the pending dot of the Locations entry they share. */
export const Default: Story = {
  args: {edited: new Set(['location-control'])},
  render: (args) => <Selectable {...args} />,
};

export const RuleSelected: Story = {args: {selectedId: 'ramp'}};

/** A rule under 10 score votes, selected: "low n" beside its name. */
export const LowSampleSelected: Story = {args: {selectedId: 'location-boost'}};

/** No analytics: every row is a tuning.json entry, with "—" for gap and votes and nothing to sort by. */
export const TuningOnly: Story = {args: {rows: TUNING_ONLY}};

/** No token and no analytics (R-20). R2-6 picks the real text; this one stands in for it. */
export const Empty: Story = {
  args: {rows: [], emptyText: 'No rules to show: vote analytics are missing and tuning.json needs a GitHub token.'},
};
```

- [ ] **Step 6: Lint, typecheck, Code Health**

Run: `pnpm lint`
Expected: exit 0, with no new warnings on the changed files.

Run: `pnpm typecheck`
Expected: exit 0.

Then run CodeScene's `code_health_review` on each changed file: the three new ones and `src/theme/AdminStyles.tsx`, plus for (a) `adminTheme.ts`, `AdminTheme.stories.tsx`, `adminTheme.test.ts` and `AdminStyles.test.tsx`. Expected: 10.0, with no findings. `adminTheme.ts` has no function, so it gets no score. CodeScene gates the PR (R1's PR #25 failed it twice), so fix any finding now rather than at PR time. Keep the small helpers (`scoreWords`, `rowLabel`, `onRowKey`, `TYPE_LABEL`, and with (b) `gapTextColor`): written inline, the same logic scored 9.38 for Overall Code Complexity.

- [ ] **Step 7: Look at it in Storybook**

1. Load the `anthropic-skills:built-in-browser` skill.
2. Start Storybook with `mcp__Claude_Browser__preview_start` `{name: "admin-storybook"}`, the `.claude/launch.json` entry on port 6007, as R1-12 did.
3. Navigate to `http://localhost:6007` and open `Admin/Insights/Calibration/Rules table`.

Check these:
- **Default:**
  - Hovering a row fills it with `rowHover`.
  - Tab reaches the sort control, then each row in turn. The focused row shows the 2px gold ring inside its edge.
  - Enter or Space selects the focused row, and pressing it again clears the selection. Holding Enter selects once; the row doesn't flicker.
  - The selected row shows the gold bar at its left edge, on the accent tint. With (a), hovering the selected row keeps the same fill. Otherwise it steps up to `accentTint`.
  - Both location rows show the gold dot.
  - "low n" sits beside Location Boost, and a long name truncates with an ellipsis before its markers.
- **TuningOnly:** no sort control, and the table is named "Rules".
- **The `<tr>` paint, in Chrome:** the selected row's gold bar and the focused row's ring are both drawn on a `<tr>` (the bar on its first cell too). Check both in the pane, which is Chrome. Firefox isn't available to an agent, so record the Firefox half of both checks as pending with the owner.
- **The Accessibility panel, on every story** (`mcp__Claude_Browser__find` "Accessibility", then click it):
  - **(a) or (b):** no violations on any story.
  - **Neither:** `RuleSelected` shows exactly one violation, `color-contrast`, on the Gap cell "−0.57" (4.49:1 against 4.5:1). `Default` shows the same once you select Ramp. Every other story shows none. Report it as the owner's call, so the controller records it in `progress.md` as R1-3's ScorePill item was: "minor (deferred, owner's call): red gap text on a selected rules-table row, 4.50:1 (axe 4.49), 4.15:1 hovered".
  - The panel can't hover, so for every answer, the hovered selected row is judged from the contrast table above.
- **Narrow width:** below about 630px of canvas (560, plus the decorator's padding and the panel border), the table scrolls inside the panel and the page does not.

Then stop Storybook: `mcp__Claude_Browser__preview_list`, then `mcp__Claude_Browser__preview_stop` with its `serverId`. The pre-commit Vitest run times out on its workers while a preview server runs.

If no browser is available to the implementer, record each check as pending with the owner, as R1-2's Step 11 did, and say so in the report.

- [ ] **Step 8: Commit (after the owner approves)**

Use the Bash tool, not PowerShell. For neither, or for (b):

```bash
git add src/tools/analytics/calibration/RulesTable.tsx src/tools/analytics/calibration/RulesTable.stories.tsx src/tools/analytics/calibration/__tests__/RulesTable.test.tsx src/theme/AdminStyles.tsx
USER_APPROVED=1 git commit -m "feat(calibration): add the rules table (#24)"
```

For (a), the theme files go in the same commit:

```bash
git add src/tools/analytics/calibration/RulesTable.tsx src/tools/analytics/calibration/RulesTable.stories.tsx src/tools/analytics/calibration/__tests__/RulesTable.test.tsx src/theme/AdminStyles.tsx src/theme/adminTheme.ts src/theme/AdminTheme.stories.tsx src/theme/__tests__/adminTheme.test.ts src/theme/__tests__/AdminStyles.test.tsx
USER_APPROVED=1 git commit -m "feat(calibration): add the rules table and a selected-row fill that keeps gap text at 4.5:1 (#24)"
```

<!--
Review of 2026-10-05 (8 notes): all applied, none rejected. Where the result departs from the note's wording:
- Note 1: a subagent can't raise it with the owner, so the plan does: a gate under the task heading offers (a), (b) and "neither", every step carries the (a)-only and (b)-only code, and Step 7 states each outcome. Re-measured: the selected fill gives 4.497:1 unrounded and 4.498:1 with axe's per-channel rounding (axe prints 4.49); the hovered selected fill gives 4.15:1 unrounded and 4.13:1 rounded; the 0.05 fill gives 4.58:1. Both ways, the selected states fail and (a) passes.
- Note 3: rowLabel is applied, with two changes. A rule with no score votes reads "no score votes" rather than "gap —, 0 score votes", matching R2-1's pairsHeading. The logic is split into scoreWords, rowLabel, onRowKey and TYPE_LABEL, because with notes 3, 4 and 5 written inline the local CodeScene scored RulesTable.tsx 9.38 (Overall Code Complexity), the reviewer's patched file included. The note's expected name for Location Boost is unchanged.
- Note 7: only R2-3.md could be edited, so the wording option was taken ("R2-6 picks the text"), plus R-20 in the Produces block. Recording R-20 against R2-3 in header.md's task table is left to whoever edits header.md.
- Note 8: both numbers corrected (546px; 168px, 144px of content).
-->
