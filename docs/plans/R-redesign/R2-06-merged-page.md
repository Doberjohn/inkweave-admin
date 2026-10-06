> Part of [R: Admin redesign](../R-redesign.md), phase R2 ([R2-calibration-tuning.md](R2-calibration-tuning.md)). Read the main plan's decisions (R-17 to R-26 for R2), corrections, global constraints and shared interfaces, then the R2 header, first.

> **Re-base notes (R2-6, 2026-10-05).** Re-based from the 2026-10-01 outline onto main @ `c92e260` (R1 as built, pin `bc877e1`), decisions R-17 to R-26, the re-based header (`scratchpad/r2-rebase/header.md` as of 14:52, re-base notes 9 and 12, contract additions 1, 2, 10 and 13) and the sibling re-bases R2-1 to R2-5a.
> - **The guard is R2-5a's component (R-19).** `TunedWorkspace` mounts `<UnsavedChangesGuard dirty={admin.pending.length > 0} message={UNSAVED_TUNING} />`, R2-5a's hand-off block, whose doc comment gains why the page holds the one guard. R2-5a's final API is a hook that returns `{blocked, stay, leave}` and a component over the app's `DialogShell` ("Leave this page?", "Stay on this page", "Leave this page"). The header's contract addition 11 and its "Hooks" bullet still describe the earlier sketch, `useUnsavedChangesGuard(dirty, message): void` on `window.confirm`; **when the plan is assembled, they should take R2-5a's contract.** The page test renders under `createMemoryRouter` with a `/` route to leave to, and covers R2-5a's three hand-off cases.
> - **`?rule=` is written on every pick,** with `replace: true`: a row press, a second press on the selected row (clears it), and "Show all pairs" (clears it). That closes R1-11's deferred "/calibration reads ?rule= but never writes it". The sidebar's link already cleared it, and its router test still passes.
> - **The page writes.** `nav.ts` gives the calibration item `writes: true` and drops the `tuning` item, with contract addition 13's comment. `PageLayout` gets `writes`, `branchLabel="Tuning writes to Doberjohn/inkweave"` and `flush`. The sidebar's token box shows on `/calibration` once a token is saved.
>   - **The label.** The brief named the outline's "Tuning writes to". The header's re-base note 9 changed it: `BranchNotice`'s `label` replaces the whole default "Writes to Doberjohn/inkweave", so the short form dropped the repo. The handoff drew "Tuning writes to `master`". To go back to it, change `BRANCH_LABEL` in `CalibrationPage.tsx`, the two tests that quote it (`CalibrationPage.test.tsx`'s header case and `router.test.tsx`'s "with a branch notice"), and `router.test.tsx`'s `BRANCH_NOTICE` to `/writes to( Doberjohn\/inkweave)?/i`.
> - **`PageLayout` as built.** It already sets `document.title` (R1), and that effect is untouched. `BODY` is both the scroller and the padded grid, so `flush` swaps the body's style for `FLUSH_BODY` (contract addition 1), and the module's `GUTTER` is exported as `PAGE_GUTTER` for the workspace's left column. R1's label test (`PageLayout.test.tsx:61-69`) stays as it is. Its examples in `PageLayout.tsx:64` and `PageLayout.stories.tsx:49` take the new label, and a `Flush` story joins them.
> - **The R1 tests and stories that assumed a read-only `/calibration` or a `/tuning` page** take the header's re-base note 9 replacements: `router.test.tsx`, `nav.test.ts`, `Sidebar.test.tsx`, `Sidebar.stories.tsx` and `AdminShell.test.tsx`. The outline listed only the first two.
>   - `router.test.tsx` also drops its redundant `afterEach` token clear (R1-7's deferred item, contract addition 4) and its stale "analytics page" and "(R1-5)" wording (R1-11's). Its comment that the sidebar's Forget token is the only one (`:114-115`) also changes, since R2-5's aside offers one of its own when GitHub rejects the token (R-26). Only the comment changes: these cases never reach a 401, so the sidebar's button is still the one they find.
>   - `AdminShell.test.tsx` mounts `ImagePage` at `/image`, as the header's R2-7 row says R2-6 does. `ImagePage` keeps the shell's test free of the guard and the analytics fetches, and R2-7's Step 1 checks for it.
> - **The siblings, as re-based.**
>   - `RulesTable` takes `emptyText` (R2-3), which carries R-20's two empty messages.
>   - `PairList` brings its own "Widest gaps" panel and scrolls past about ten rows (R2-4), so the workspace adds no heading of its own. `VoteDetailTable` gets R2-4's three `notice` texts.
>   - The charts take the scope as `readonly PairStat[]` (R2-4c).
>   - `TuningAside` gets `onForgetToken={clearToken}` (header contract addition 10, R-26). The aside asks before that drops pending edits.
>   - So `CalibrationWorkspaceProps` gains `onForgetToken` over the outline's props.
> - **Changed from the outline's states.**
>   - The pair list and the vote table render once the analytics have loaded, with the charts. The outline rendered them without analytics too, where they could only say "No voted pairs yet."
>   - "Vote analytics are empty" means `global.totalVotes === 0`. The precompute emits every engine rule even with no votes (`scripts/lib/voteAnalytics.mjs:84`), so an empty artifact still lists its rules, and "The rules below come from tuning.json alone." goes with the error notice only.
>   - While the analytics load, the rules table lists no rows and says "Loading the rules…", and the header has no subtitle. `calibrationSubtitle(null)` reads "No vote analytics yet", which is right only once the load has failed. Without the wait (`rulesFor`), a `tuning.json` that lands first lists every entry as a tuning-only row, and `?rule=location-control` marks "Locations" until the analytics swap in "Location Search".
>   - The workspace's own rule controls drop the picked pair in their handlers, as well as the derived `{ruleId, pair}` check. The check alone brought a pair back on Ramp → Lore Loss → Ramp.
>   - The two columns meet on a 1px rule that follows the wrap: the row's `gap: 1` over the border colour, with both columns opaque. A `borderLeft` on the aside would draw a stray line beside the sidebar's edge once the aside wraps under the analytics.
>   - Both two-up rows use the header's 346px track (two-up from 712px of column), so each chart's plot keeps `ChartTooltip`'s 304px floor (header re-base note 12).
> - **Code Health.** The outline's single `CalibrationWorkspace` body scored 9.07 (cyclomatic complexity 12). Split into small named parts, it scores 10.0, and so does every other new or changed file CodeScene scores (`router.tsx` and `PageLayout.stories.tsx` have nothing it scores).
> - **The real-data check** runs last for the phase, after R2-8 (header, "Before the PR"). This task adds its items to that check (hand-off at the end) and has a Storybook look of its own.
> - **Pin `bc877e1`.** R2-6 cites no engine line of its own. Its page tests run R2-1's mapping on the built engine through the `getRuleById` fallback, since the fixtures carry no `playstyleId`: `lore-loss` opens the Lore Denial copy, and `location-control` resolves to its first location rule. The story's names come from the pinned `tuning.json` (`Lore Denial`, `Locations`, `Ramp`).
> - **Verified** in `scratchpad/r2-rebase/sandbox-R2-6`: a copy of `src/` at `c92e260`, with `node_modules` and `upstream/` junctioned in and Vite's cache kept in the sandbox. The siblings' code came from their re-based task files as they stood at 15:30 (R2-1, R2-3, R2-4, R2-4b, R2-4c, R2-5a, and R2-4a's `scatter.ts` and `ScatterChart.tsx`), R2-4a's quoted kit edits from its sandbox, and R2-2 and R2-5 from R2-5's sandbox, whose `TuningAside.tsx` and `PendingTray.tsx` match `R2-5.md` line for line.
>   - Every "expected failure" below was observed, and so was every pass: `CalibrationPage.test.tsx` 28 of 28 (no warnings under `--silent=false`), `src/shell` with `router.test.tsx` 91 of 91, and `PageLayout.test.tsx` 7 of 7.
>   - The review's fixes (the rules' wait for the analytics, the weekly gap's table check, the loading case's `voteLog: never`, and the bare `calibrationHref` case) were re-checked in `scratchpad/r2-rebase/sandbox-apply-r26`, a copy of the review's sandbox. Without `rulesFor`, "lists no tuning.json rows until the analytics settle" fails (1 failed, 27 passed). Without `voteLog: never`, `--silent=false` prints "not wrapped in act(...)". `tsc -p tsconfig.app.json` exits 0.
>   - The whole suite: 96 files and 944 tests, with 3 failures, none in R2-6's files. Two are in `CalibrationCharts.test.tsx`, a bin-label format ("≤−5" against "≤ −5") between the R2-4b and R2-4c task files. One is in `RulesTable.test.tsx`, whose pressed-bar case needs R2-3's own `AdminStyles.tsx` rule, which the sandbox lacks. Those are the siblings' to settle. Under load, a few files time out; they pass when re-run with `--maxWorkers=2`.
>   - Step 11's item 11 (the Forget-token comment, from the cross-task review) was checked in `scratchpad/r2-rebase/sandbox-R2-6-c18`, a copy of `sandbox-R2-6`. `router.test.tsx` passes 40 of 40, and `eslint --max-warnings 0` is clean. Its extra line moves the redirect case to `:236`, and the hand-off now gives that line.
>   - Mutations, each failing the test meant to catch it: dropping the handlers' pair reset, the derived pair check, `replace: true`, the scope line's focus, the guard's `dirty`, the scope in `weeklyGaps` (every pair fed to it under a rule), the rules' wait for the analytics, the all-pairs engine-silent count, the second-press toggle, and `onForgetToken`.
>   - `tsc -p tsconfig.app.json` is clean over all of `src/`, stories included. Every new or changed file passes `pnpm exec eslint --stdin` in the repo, and scores 10.0 where CodeScene scores it. The stories render through `composeStories` with no console errors.

### Task R2-6: The merged page, the route and the `/tuning` redirect

**Files:**
- Create:
  - `src/tools/analytics/calibration/CalibrationWorkspace.tsx`
  - `src/tools/analytics/calibration/CalibrationPage.tsx`
  - `src/tools/analytics/calibration/CalibrationWorkspace.stories.tsx`
- Test: create `src/tools/analytics/calibration/__tests__/CalibrationPage.test.tsx`.
- Delete:
  - `src/tools/analytics/CalibrationPage.tsx`, R1-11's host for `CalibrationView`.
  - `src/tools/analytics/__tests__/CalibrationPage.test.tsx`, its test. Every case moves to the new test: the header and lean cases to "header", the loading and missing-artifact cases to "the analytics notice", "opens with the rule from ?rule= selected" to "selection", and the two vote-log cases to "what the rule scopes".
- Modify:
  - `src/shell/PageLayout.tsx`: `:6-7`, `:20`, `:53-54`, `:64-66`, `:76` and `:96`.
  - `src/shell/PageLayout.test.tsx`: two cases after `:69`.
  - `src/shell/PageLayout.stories.tsx`: `:1-3` and `:47-50`.
  - `src/shell/nav.ts`: `:22-26`, and a function after `:43`.
  - `src/shell/nav.test.ts`: `:1`, `:18`, `:22` and `:42-47`.
  - `src/router.tsx`: `:4-10` and `:25`.
  - `src/router.test.tsx`: `:13-14`, `:17-19`, `:23-33`, `:44`, `:55-64`, `:72-75`, `:98`, `:102-106`, `:114-115`, `:213` and `:234-239`.
  - `src/shell/Sidebar.test.tsx`: `:33`, `:54` and `:81`.
  - `src/shell/Sidebar.stories.tsx`: `:15` and `:38`.
  - `src/shell/AdminShell.test.tsx`: `:4`, `:8`, `:13` and `:25`.

**Interfaces:**
- **Consumes:**
  - R2-1 (`calibration/calibrationModel.ts`): `CalibrationRow`, `buildCalibrationRows(rules, config)`, `findRow(rows, id)`, `rowsSharingKey(rows, key)`, `editedKeys(pending)`, `pairsInScope(pairs, row)`, `pairsFor(pairs, row)`, `findPair(scope, selected)`, `withSelectedPair(listed, scope, selected)`, `votesForPair(votes, pair)`, `pairsHeading(row)` and `calibrationSubtitle(global)`.
  - R2-2: `useLiveTuning(token)`, whose `reload` resolves with the config it read, and `useTuningAdmin(token)`. `TunedWorkspace` passes both through as they are.
  - R2-3: `RulesTable({rows, selectedId, edited, onSelect, emptyText?})`.
  - R2-4:
    - `PairList({pairs, selectedPair, onSelectPair, emptyText?})`, a region named "Widest gaps";
    - `VoteDetailTable({pair, votes, notice?})`, a region named "Votes", or named by the pair once one is picked;
    - `DimensionParticipation({fill, totalVotes, scope?})`.
  - R2-4b: `weeklyGaps(votes, pairs)`. In the test and the story, `pairOf`, `ALL_PAIRS` and `ALL_PAIRS_VOTES` from `chartFixtures.ts`.
  - R2-4c: `CalibrationScatter({pairs, scopeLabel, selectedPair, onSelectPair, engineSilentPairs?, emptyText?})`, `GapHistogram({pairs, scopeLabel, emptyText?})` and `WeeklyGapTrend({weeks, scopeLabel})`.
  - R2-5: `TuningState` and `TuningAside({tuning, onSaveToken, onForgetToken, selected, sharedWith})` (contract addition 10).
  - R2-5a: `UnsavedChangesGuard({dirty, message, leaves?})` from `src/shell/UnsavedChangesGuard.tsx`.
  - R1: `useVoteAnalytics()` and `UseVoteAnalyticsReturn`, `useVoteLog()` and `UseVoteLogReturn`, `useGithubToken()`, `PageLayout`, `Notice`, `ADMIN_COLORS` and `ADMIN_TYPE`, and `LinkButton` and `SPACING` through the bridge.
- **Produces:**
```ts
// src/shell/PageLayout.tsx (contract addition 1)
export const PAGE_GUTTER: string;  // `clamp(16px, 4vw, 32px)`: the page's side padding, for a flush page's own columns
// PageLayoutProps gains, after branchLabel:
flush?: boolean;                   // children go straight into the scrolling body, with no padding and no grid

// src/shell/nav.ts (contract additions 2 and 13)
export function calibrationHref(ruleId?: string): string; // '/calibration', or '/calibration?rule=' + encodeURIComponent(ruleId)
// NAV_ITEMS: the calibration item gets writes: true, and the tuning item is gone

// src/tools/analytics/calibration/CalibrationWorkspace.tsx
export interface CalibrationWorkspaceProps {
  analytics: UseVoteAnalyticsReturn;
  voteLog: UseVoteLogReturn;
  tuning: TuningState | null;            // null: the aside shows the token gate
  onSaveToken: (token: string) => void;
  onForgetToken: () => void;             // R-26's way out of a token GitHub rejects
  selectedId: string | null;             // ?rule=: a row id, or a tuning key that findRow resolves
  onSelect: (id: string | null) => void; // writes ?rule=; null clears it
}
export function CalibrationWorkspace(props: CalibrationWorkspaceProps): JSX.Element;

// src/tools/analytics/calibration/CalibrationPage.tsx
// Title "Calibration & tuning", subtitle calibrationSubtitle(global) once the analytics have settled,
// meta "Data as of <code>…</code>", writes, branchLabel "Tuning writes to Doberjohn/inkweave", flush.
export function CalibrationPage(): JSX.Element;

// src/router.tsx
// {path: 'calibration', element: <CalibrationPage />}, from the new path
// {path: 'tuning', element: <Navigate to="/calibration" replace />}
// URL contract: /calibration?rule=<RuleStat.ruleId, or a tuning key>. The page reads it and writes it (replace: true).
```

**The page.**
- **Left column**, `flex: '999 1 520px'`, padded with `PAGE_GUTTER`. In this order:
  1. **The analytics notice.**
     - "Loading analytics..." while they load.
     - "Could not load vote analytics. Has the artifact been generated? ({message})", in the error tone. Once `tuning.json` has loaded, " The rules below come from tuning.json alone." follows.
     - "Vote analytics are empty: no votes yet." for an artifact with no votes.
  2. **`RulesTable`**, with the resolved row's id. A press on the selected row clears `?rule=`. It lists no rows until the analytics settle, so `tuning.json` alone never stands in for them while they load. With no rows it says:
     - "Loading the rules…" while the analytics load;
     - "No rules to show: vote analytics are missing and tuning.json needs a GitHub token." without a token;
     - "No rules to show: vote analytics are missing and tuning.json hasn't loaded." with one (R-20).
  3. **The scope row**, once the analytics have loaded: `pairsHeading(selected)` in a `<p tabIndex={-1}>`, and, while a rule is selected, a "Show all pairs" `LinkButton` (`size="base"`, a 24px target). It clears `?rule=` and moves focus to the scope line, since it unmounts as the rule clears.
  4. **The charts row:** `CalibrationScatter` beside `GapHistogram`, both over the uncapped scope. The scatter's engine-silent footnote shows on all pairs only.
  5. **Pairs and votes:** `PairList` (the widest 40, plus the picked pair at the end when it sits below them) beside `VoteDetailTable`. The vote table's `notice` is "No raw votes to show." without raw votes, and "Loading the vote log…" or "Could not load the vote log." until the log is in.
  6. **The weekly gap:** `WeeklyGapTrend` over `weeklyGaps(votes, scope)`. Until the log is in, a Notice stands in: "Loading the vote log…", or "Could not load the vote log: {message}" in the error tone.
  7. **Dimension participation**, with the scope line "All votes, whatever the rule".

  Without raw votes, one Notice replaces items 6 and 7: "The weekly gap trend and dimension participation need raw votes. Set the `SUPABASE_SERVICE_ROLE_KEY` Actions secret, then re-run admin's Deploy workflow."
- **The aside:** `<aside aria-label="Tuning editor">`, `flex: '1 1 340px'`, holding `TuningAside` with the resolved row and the rows that share its tuning key.
- **Selection.** `?rule=` holds the rule. `findRow` resolves a tuning key to its first rule, and that row is what the table marks, what a second press deselects and what scopes everything below the scope row. The picked pair is `{ruleId, pair}` state, shown only while `ruleId` is the resolved row's, so a rule change from outside the workspace hides it with no effect. The workspace's own rule controls also drop it, in their handlers.
- **Hooks.** `useLiveTuning`, `useTuningAdmin` and the guard need a token or the data router, so `TunedWorkspace` in `CalibrationPage.tsx` calls them and renders `CalibrationWorkspace`. Without a token, the page renders `CalibrationWorkspace tuning={null}`. Nothing the workspace renders calls `useBlocker`, so its story needs no data router.

- [ ] **Step 1: Check what this task builds on**

```bash
grep -n "export function calibrationSubtitle" src/tools/analytics/calibration/calibrationModel.ts
grep -n "emptyText" src/tools/analytics/calibration/RulesTable.tsx
grep -n "notice?: string" src/tools/analytics/VoteDetailTable.tsx
grep -n "export function WeeklyGapTrend" src/tools/analytics/calibration/WeeklyGapTrend.tsx
grep -n "onForgetToken" src/tools/analytics/calibration/TuningAside.tsx
grep -n "export function UnsavedChangesGuard" src/shell/UnsavedChangesGuard.tsx
grep -n "Promise<TuningConfig | null>" src/tools/tuning/useLiveTuning.ts
```

Expected: each prints at least one line. If one prints nothing, stop: R2-1, R2-2, R2-3, R2-4, R2-4c, R2-5 or R2-5a hasn't landed.

On a fresh checkout, or after a pin bump, run `pnpm build:engine` once first: `calibrationModel.ts` imports the engine.

- [ ] **Step 2: Write PageLayout's failing flush tests**

In `src/shell/PageLayout.test.tsx`, add two cases after R1's label case. R1's label case stays as it is: it passes its own label. Before (`:61-70`):

```tsx
  it("takes the page's own label, and names a rehearsal branch", () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    render(
      <PageLayout title="Calibration & tuning" writes branchLabel="Tuning writes to">
        <p>Body</p>
      </PageLayout>,
    );
    expect(screen.getByText('Tuning writes to')).toHaveTextContent('Tuning writes to admin-verify');
  });
});
```

After:

```tsx
  it("takes the page's own label, and names a rehearsal branch", () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    render(
      <PageLayout title="Calibration & tuning" writes branchLabel="Tuning writes to">
        <p>Body</p>
      </PageLayout>,
    );
    expect(screen.getByText('Tuning writes to')).toHaveTextContent('Tuning writes to admin-verify');
  });

  it('puts a flush page straight into the scrolling body, with no padding and no grid', () => {
    render(
      <PageLayout title="Calibration & tuning" flush>
        <p>Body</p>
      </PageLayout>,
    );
    const body = screen.getByText('Body').parentElement;
    expect(body).toHaveStyle({overflowY: 'auto'});
    expect(body).not.toHaveStyle({display: 'grid'});
    expect(body?.style.padding).toBe('');
  });

  it('lays the body out as the padded grid without flush', () => {
    render(
      <PageLayout title="Vote activity">
        <p>Body</p>
      </PageLayout>,
    );
    const body = screen.getByText('Body').parentElement;
    expect(body).toHaveStyle({overflowY: 'auto', display: 'grid'});
    expect(body?.style.padding).not.toBe('');
  });
});
```

- [ ] **Step 3: Run them, and see the flush case fail**

Run: `pnpm vitest run src/shell/PageLayout.test.tsx`

Expected: FAIL, `Tests  1 failed | 6 passed (7)`: "× puts a flush page straight into the scrolling body, with no padding and no grid", at `expect(element).not.toHaveStyle()`. Without the prop, the body is still the padded grid.

- [ ] **Step 4: Give PageLayout `flush` and `PAGE_GUTTER`**

In `src/shell/PageLayout.tsx`:

1. Export the side gutter. Before (`:6-7`):
   ```tsx
   // Side padding: 32px on a desktop, easing to 16px on a phone.
   const GUTTER = `clamp(${SPACING.lg}px, 4vw, ${SPACING.xxxl}px)`;
   ```
   After:
   ```tsx
   // Side padding: 32px on a desktop, easing to 16px on a phone. Exported for a
   // flush page, which pads its own columns (R2's calibration workspace).
   export const PAGE_GUTTER = `clamp(${SPACING.lg}px, 4vw, ${SPACING.xxxl}px)`;
   ```
2. The header's padding. Before (`:20`):
   ```tsx
     padding: `${SPACING.md}px ${GUTTER}`,
   ```
   After:
   ```tsx
     padding: `${SPACING.md}px ${PAGE_GUTTER}`,
   ```
3. The body's padding, and the flush body under it. Before (`:53-54`):
   ```tsx
     padding: `${SPACING.xxl}px ${GUTTER}`,
   };
   ```
   After:
   ```tsx
     padding: `${SPACING.xxl}px ${PAGE_GUTTER}`,
   };

   // `flush`: the same scroller with no padding and no grid, for a page that lays
   // out its own columns edge to edge (R2's tuning aside, R4's studio).
   const FLUSH_BODY: React.CSSProperties = {flex: 1, minHeight: 0, overflowY: 'auto'};
   ```
4. The prop, with R1's example label brought up to date. Before (`:64-66`):
   ```tsx
     /** BranchNotice's label when the default doesn't fit, e.g. "Tuning writes to". */
     branchLabel?: string;
     children: React.ReactNode;
   ```
   After:
   ```tsx
     /** BranchNotice's label when the default doesn't fit, e.g. "Tuning writes to Doberjohn/inkweave". */
     branchLabel?: string;
     /** Children go straight into the scrolling body, with no padding and no grid. */
     flush?: boolean;
     children: React.ReactNode;
   ```
5. The signature. Before (`:76`):
   ```tsx
   export function PageLayout({title, subtitle, meta, actions, writes = false, branchLabel, children}: PageLayoutProps) {
   ```
   After:
   ```tsx
   export function PageLayout({
     title,
     subtitle,
     meta,
     actions,
     writes = false,
     branchLabel,
     flush = false,
     children,
   }: PageLayoutProps) {
   ```
6. The body. Before (`:96`):
   ```tsx
         <div style={BODY}>{children}</div>
   ```
   After:
   ```tsx
         <div style={flush ? FLUSH_BODY : BODY}>{children}</div>
   ```

The `useEffect` that names the tab stays as it is. `PAGE_GUTTER` is a constant export, which `react-refresh/only-export-components` allows (`allowConstantExport`).

- [ ] **Step 5: Run them to PASS**

Run: `pnpm vitest run src/shell/PageLayout.test.tsx`

Expected: PASS, `Tests  7 passed (7)`.

- [ ] **Step 6: Write the page's failing test**

Create `src/tools/analytics/calibration/__tests__/CalibrationPage.test.tsx`.
- **The router.** The page renders under `createMemoryRouter`, never the `MemoryRouter` wrapper: with a token it mounts the guard, whose `useBlocker` needs a data router. A `/` route gives it a page to leave to.
- **The fetch stub.** Each request gets a fresh `Response`, since a body reads only once. By default `tuning.json` answers with `LIVE` and both artifacts were never generated (the SPA's HTML fallback). `src/test/setup.ts` empties the artifact cache before every test, and clearing `localStorage` resets the token store, so the file needs no other reset.
- **The commit** is the one mock (`vi.mock` with `importOriginal`): `readTuning` stays real and reads through the stub.
- **The fixtures** carry no `playstyleId`, so the mapping runs on the pinned engine (R-17's fallback).
- **Sibling copy it matches.** If a sibling task renamed any of these, follow it here:

  | Text or name | From |
  |---|---|
  | "Ramp · gap −0.57 · 557 votes", "Toys · no score votes yet", "All pairs", "Mean gap −0.30 · well-calibrated · 2,054 votes" | R2-1 `pairsHeading`, `calibrationSubtitle` |
  | Rule rows: buttons whose name starts with the rule's name, and "pending tuning edit" in it | R2-3 `RulesTable` (`rowLabel`) |
  | The "Widest gaps" region and its pair buttons ("{a} × {b}: …"), the "Votes" region, a region named by the picked pair, and the table "Votes on {pair}" | R2-4 |
  | The figures "Engine vs community", "Gap distribution" and "Weekly gap"; the sliders "Engine score against community score, {scope}" and "Weekly mean gap, {scope}"; "No voted pairs yet.", "No voted pairs for this rule yet.", "No score votes in this scope yet.", "Not plotted: N engine-silent pairs" | R2-4c |
  | "Title text" (`TierRow`), "Live Ramp · Title · text" (`pendingLabel`), "Publish to master" (`PendingTray`), "Forget token" (`ForgetTokenOffer`), "Could not read tuning.json: …", the h2 "Lore Denial" | R2-2, R2-5 |
  | "Leave this page?", "Stay on this page" | R2-5a |
  | "GitHub token", "Save token" | R1-7's `GithubTokenGate` |

```tsx
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen, waitFor, waitForElementToBeRemoved, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {commitTuning} from '../../../tuning/githubClient';
import type {PairStat, RuleStat, VoteAnalytics} from '../../voteAnalyticsTypes';
import type {VoteLog, VoteLogRow} from '../../voteLogTypes';
import {CalibrationPage} from '../CalibrationPage';
import {pairOf} from '../chartFixtures';

// The tuning.json read stays real and runs against the fetch stub; only the commit is faked.
vi.mock('../../../tuning/githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../tuning/githubClient')>()),
  commitTuning: vi.fn(),
}));

const TOKEN_KEY = 'inkweave.reveal-admin.gh-token';
const TUNING_URL =
  'https://api.github.com/repos/Doberjohn/inkweave/contents/packages/synergy-engine/src/data/tuning.json?ref=master';

/**
 * A tuning.json unlike the bundled copy, so a pass proves the page edits the
 * live file. No analytics rule reaches Toys: it is a tuning-only row.
 */
const LIVE: TuningConfig = {
  playstyles: {
    ramp: {name: 'Live Ramp', tagline: 'From the branch'},
    'lore-denial': {name: 'Lore Denial', tagline: 'Cards that make your opponent lose lore.'},
    'location-control': {name: 'Locations', tagline: 'Cards that build their value around locations.'},
    toy: {name: 'Toys', tagline: 'Toys that play together.'},
  },
  directRules: {},
  ruleTexts: {'shift-targets': {}, ramp: {scores: {}, templates: {}}},
};

/** A playstyle rule's stat. No playstyleId, so the mapping asks the pinned engine (R-17's fallback). */
function rule(ruleId: string, ruleName: string, meanGap: number | null, scoreVotes: number): RuleStat {
  return {
    ruleId,
    ruleName,
    category: 'playstyle',
    scoreVotes,
    pairsVoted: 2,
    meanGap,
    accuracySentiment: null,
    pairsCovered: 0.1,
  };
}

// Artifact order. Location Search is the first rule under location-control,
// though the table, widest gap first, lists Location Boost above it.
const RULES: RuleStat[] = [
  rule('ramp', 'Ramp', -0.57, 557),
  rule('lore-loss', 'Lore Loss', 0.4, 31),
  rule('location-search', 'Location Search', -1.2, 12),
  rule('location-boost', 'Location Boost', 2.44, 9),
];

// Engine → community: 7 → 4 under Ramp, 3 → 9 under Ramp and Lore Loss, 8 → 7.5 under Lore Loss.
const PAIRS: PairStat[] = [
  pairOf('1', '2', 7, 4, 3, ['ramp']),
  pairOf('3', '4', 3, 9, 1, ['ramp', 'lore-loss']),
  pairOf('5', '6', 8, 7.5, 2, ['lore-loss']),
];

const ANALYTICS: VoteAnalytics = {
  generatedAt: '2026-09-29T04:12:00Z',
  hasRawVotes: false,
  global: {
    totalVotes: 2054,
    distinctPairs: 1928,
    distinctVoters: null,
    meanGap: -0.3,
    accuracySentiment: null,
    engineSilentPairs: 196,
    weekly: [],
    dimensionFill: null,
  },
  rules: RULES,
  pairs: PAIRS,
};

/** The same artifact from a Deploy that had the raw votes. */
const RAW: VoteAnalytics = {
  ...ANALYTICS,
  hasRawVotes: true,
  global: {
    ...ANALYTICS.global,
    distinctVoters: 2,
    dimensionFill: {score: 2054, accuracy: 900, isReal: 300, wouldPlay: 800, difficulty: 120},
  },
};

/** One score vote on a pair (its community score, rounded), at noon UTC on `day`, in Supabase's form. */
function voteOn(pair: PairStat, day: string): VoteLogRow {
  return {
    a: pair.a,
    b: pair.b,
    aName: pair.aName,
    bName: pair.bName,
    score: Math.round(pair.communityScore),
    accuracy: null,
    isReal: null,
    wouldPlay: true,
    difficulty: null,
    whoCarries: null,
    ts: `${day}T12:00:00.000000+00:00`,
    voter: 1,
  };
}

/** Three weeks of votes, newest first as the precompute writes them. The week of Sep 28 has none under Ramp. */
const VOTE_LOG: VoteLog = {
  generatedAt: '2026-09-29T04:12:00Z',
  votes: [
    voteOn(PAIRS[2], '2026-09-29'),
    voteOn(PAIRS[1], '2026-09-23'),
    voteOn(PAIRS[0], '2026-09-22'),
    voteOn(PAIRS[0], '2026-09-15'),
  ],
  voterCount: 2,
};

const json = (body: unknown) => new Response(JSON.stringify(body), {headers: {'content-type': 'application/json'}});
/** What Vite and vercel.json serve for an artifact that was never generated. */
const spaFallback = () => new Response('<!doctype html>', {headers: {'content-type': 'text/html'}});
/** A request that never settles, so the page stays on its loading state. */
const never = () => new Promise<Response>(() => {});

type Answer = () => Response | Promise<Response>;

/**
 * Answers each request with a fresh Response (a body reads only once), picked
 * by URL: the tuning.json read, then the two admin-data artifacts. By default
 * tuning.json is LIVE and neither artifact was generated.
 */
function stubFetch({
  tuning = () => json(LIVE),
  analytics = spaFallback,
  voteLog = spaFallback,
}: {tuning?: Answer; analytics?: Answer; voteLog?: Answer} = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url === TUNING_URL) return tuning();
    if (url.endsWith('/admin-data/vote-analytics.json')) return analytics();
    if (url.endsWith('/admin-data/vote-log.json')) return voteLog();
    return new Response('Not Found', {status: 404});
  });
}

/**
 * The page at `path` in a data router, which the unsaved-edits guard needs,
 * beside a page to leave to. With `token`, a GitHub token is saved first.
 */
function renderPage(path: string, token?: string) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  const router = createMemoryRouter(
    [
      {path: '/calibration', element: <CalibrationPage />},
      {path: '/', element: <h1>Overview</h1>},
    ],
    {initialEntries: [path]},
  );
  render(<RouterProvider router={router} />);
  return {router, user: userEvent.setup()};
}

const aside = () => within(screen.getByRole('complementary', {name: 'Tuning editor'}));
const figure = (name: string) => within(screen.getByRole('figure', {name}));
/** A rules table row: a button whose name starts with the rule's name (R2-3). */
const ruleRow = (name: string, pressed?: boolean) =>
  screen.findByRole('button', {name: new RegExp(`^${name}\\b`), pressed});
const pairButtons = () => within(screen.getByRole('region', {name: 'Widest gaps'})).getAllByRole('button');

beforeEach(() => vi.mocked(commitTuning).mockReset());

afterEach(() => {
  // The token store reads localStorage on every snapshot, so clearing it is the whole reset.
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('CalibrationPage: header', () => {
  it('sums up the calibration, dates the data and names the branch tuning writes to', async () => {
    stubFetch({analytics: () => json(ANALYTICS)});
    renderPage('/calibration');
    expect(screen.getByRole('heading', {level: 1, name: 'Calibration & tuning'})).toBeInTheDocument();
    expect(await screen.findByText('Mean gap −0.30 · well-calibrated · 2,054 votes')).toBeInTheDocument();
    // The date sits in a <code>, so the line is matched on the element that holds both.
    expect(screen.getByText(/Data as of/)).toHaveTextContent('Data as of 2026-09-29');
    expect(screen.getByText('Tuning writes to Doberjohn/inkweave')).toHaveTextContent(
      'Tuning writes to Doberjohn/inkweave master',
    );
    expect(document.title).toBe('Calibration & tuning · Inkweave admin');
  });

  it('names the lean when the gap leaves the calibrated band', async () => {
    stubFetch({analytics: () => json({...ANALYTICS, global: {...ANALYTICS.global, meanGap: -0.8}})});
    renderPage('/calibration');
    expect(await screen.findByText('Mean gap −0.80 · runs generous · 2,054 votes')).toBeInTheDocument();
  });
});

describe('CalibrationPage: the analytics notice', () => {
  it('shows a loading notice under the page title until the analytics arrive', () => {
    stubFetch({analytics: never, voteLog: never});
    renderPage('/calibration');
    expect(screen.getByRole('heading', {level: 1, name: 'Calibration & tuning'})).toBeInTheDocument();
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
    expect(screen.getByText('Loading the rules…')).toBeInTheDocument();
  });

  it.each([
    ['is missing', () => new Response('', {status: 404}), 'vote-analytics.json: HTTP 404'],
    ['was never generated', spaFallback, 'vote-analytics.json has not been generated yet'],
  ])('says so when the artifact %s, and why the rules table is empty without a token (R-20)', async (_, respond, reason) => {
    stubFetch({analytics: respond});
    renderPage('/calibration');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      `Could not load vote analytics. Has the artifact been generated? (${reason})`,
    );
    expect(screen.queryByText('Loading analytics...')).not.toBeInTheDocument();
    expect(
      screen.getByText('No rules to show: vote analytics are missing and tuning.json needs a GitHub token.'),
    ).toBeInTheDocument();
  });

  it('lists no tuning.json rows until the analytics settle', async () => {
    stubFetch({analytics: never});
    renderPage('/calibration?rule=location-control', 'tok');
    // The aside has read tuning.json, and no row is selected yet.
    expect(await aside().findByText(/^Pick a playstyle/)).toBeInTheDocument();
    expect(screen.getByText('Loading the rules…')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /^Live Ramp\b/})).not.toBeInTheDocument();
  });

  it('lists the rules from the live tuning.json when the analytics are missing', async () => {
    const fetchMock = stubFetch();
    renderPage('/calibration', 'tok');
    expect(await ruleRow('Live Ramp')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(TUNING_URL, expect.anything());
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load vote analytics. Has the artifact been generated? (vote-analytics.json has not been generated yet) The rules below come from tuning.json alone.',
    );
  });

  it('says so when nobody has voted yet, and both charts say there are no pairs', async () => {
    const empty: VoteAnalytics = {
      ...ANALYTICS,
      global: {...ANALYTICS.global, totalVotes: 0, distinctPairs: 0, meanGap: null, engineSilentPairs: 0},
      rules: RULES.map((r) => ({...r, scoreVotes: 0, pairsVoted: 0, meanGap: null})),
      pairs: [],
    };
    stubFetch({analytics: () => json(empty)});
    renderPage('/calibration');
    expect(await screen.findByText('Vote analytics are empty: no votes yet.')).toBeInTheDocument();
    expect(figure('Engine vs community').getByText('No voted pairs yet.')).toBeInTheDocument();
    expect(figure('Gap distribution').getByText('No voted pairs yet.')).toBeInTheDocument();
    expect(figure('Gap distribution').getByText('All pairs · no pairs')).toBeInTheDocument();
  });
});

describe('CalibrationPage: selection', () => {
  it('opens with the rule from ?rule= selected', async () => {
    stubFetch({analytics: () => json(ANALYTICS)});
    renderPage('/calibration?rule=ramp');
    expect(await ruleRow('Ramp')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Ramp · gap −0.57 · 557 votes')).toBeInTheDocument();
    expect(screen.queryByText('All pairs')).not.toBeInTheDocument();
  });

  it('opens on all pairs when ?rule= names a rule the analytics lack', async () => {
    stubFetch({analytics: () => json(ANALYTICS)});
    renderPage('/calibration?rule=retired-rule');
    expect(await ruleRow('Ramp')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('All pairs')).toBeInTheDocument();
    // A stale id must not scope the list to a rule nobody has: every pair still shows.
    expect(pairButtons()).toHaveLength(3);
  });

  it('selects Lore Loss from ?rule=lore-loss and opens the Lore Denial copy', async () => {
    stubFetch({analytics: () => json(ANALYTICS)});
    renderPage('/calibration?rule=lore-loss', 'tok');
    expect(await aside().findByRole('heading', {level: 2, name: 'Lore Denial'})).toBeInTheDocument();
    expect(await ruleRow('Lore Loss')).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens a tuning key on its first rule, and a second click on that row clears ?rule=', async () => {
    stubFetch({analytics: () => json(ANALYTICS)});
    const {router, user} = renderPage('/calibration?rule=location-control', 'tok');
    // ?rule= names the Locations entry: the first rule under it in the artifact is the one the table marks.
    const search = await ruleRow('Location Search', true);
    expect(await ruleRow('Location Boost')).toHaveAttribute('aria-pressed', 'false');
    await user.click(search);
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(search).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('All pairs')).toBeInTheDocument();
  });

  it('writes ?rule= when a rule is picked, scoping the pairs, and clears it on a second pick', async () => {
    stubFetch({analytics: () => json(ANALYTICS)});
    const {router, user} = renderPage('/calibration');
    const ramp = await ruleRow('Ramp');
    expect(pairButtons()).toHaveLength(3);

    await user.click(ramp);
    await waitFor(() => expect(router.state.location.search).toBe('?rule=ramp'));
    // Replaced, not pushed: a pick is a view of the page, and Back leaves it.
    expect(router.state.historyAction).toBe('REPLACE');
    expect(ramp).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Ramp · gap −0.57 · 557 votes')).toBeInTheDocument();
    expect(pairButtons().map((b) => b.getAttribute('aria-label')?.split(':')[0])).toEqual([
      'Card 3 × Card 4',
      'Card 1 × Card 2',
    ]);

    await user.click(ramp);
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(ramp).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('All pairs')).toBeInTheDocument();
    expect(pairButtons()).toHaveLength(3);
  });

  it('drops a picked pair when the rule changes, from the URL or from the table', async () => {
    stubFetch({analytics: () => json(ANALYTICS)});
    const {router, user} = renderPage('/calibration');
    await ruleRow('Ramp');
    const pair = () => screen.getByRole('button', {name: /^Card 3 × Card 4:/});

    await user.click(pair());
    expect(pair()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('region', {name: 'Card 3 × Card 4'})).toBeInTheDocument();

    // From outside the workspace, as the Overview's link or the sidebar's would.
    await act(() => router.navigate('/calibration?rule=ramp'));
    expect(pair()).toHaveAttribute('aria-pressed', 'false');
    expect(document.querySelector('[data-state="selected"]')).toBeNull();
    expect(screen.getByRole('region', {name: 'Votes'})).toHaveTextContent('Select a pair to see its votes');

    // From the table: picked under Ramp, gone after Lore Loss and back.
    await user.click(pair());
    await user.click(await ruleRow('Lore Loss'));
    await user.click(await ruleRow('Ramp'));
    expect(pair()).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('CalibrationPage: what the rule scopes', () => {
  it('scopes the scatter, the histogram and the weekly gap, but not dimension participation', async () => {
    stubFetch({analytics: () => json(RAW), voteLog: () => json(VOTE_LOG)});
    const {user} = renderPage('/calibration?rule=ramp');
    expect(await screen.findByRole('slider', {name: 'Weekly mean gap, Ramp'})).toBeInTheDocument();
    expect(figure('Engine vs community').getByText(/^Ramp · 2 pairs\./)).toBeInTheDocument();
    expect(figure('Gap distribution').getByText(/^Ramp · /)).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', {name: 'Dimension participation'})).getByText('All votes, whatever the rule'),
    ).toBeInTheDocument();
    // The week of Sep 28 holds one vote, on a Lore Loss pair: under Ramp it has none.
    await user.click(figure('Weekly gap').getByRole('button', {name: 'Table'}));
    const lastWeek = within(figure('Weekly gap').getByRole('row', {name: /^Sep 28 /}));
    expect(lastWeek.getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['—', '0']);
  });

  it('"Show all pairs" clears ?rule=, rescopes the charts and leaves focus on the scope line', async () => {
    stubFetch({analytics: () => json(RAW), voteLog: () => json(VOTE_LOG)});
    const {router, user} = renderPage('/calibration?rule=ramp');
    await screen.findByRole('slider', {name: 'Weekly mean gap, Ramp'});

    await user.click(screen.getByRole('button', {name: 'Show all pairs'}));
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(figure('Engine vs community').getByText(/^All pairs · 3 pairs\./)).toBeInTheDocument();
    expect(figure('Gap distribution').getByText(/^All pairs · /)).toBeInTheDocument();
    expect(screen.getByRole('slider', {name: 'Weekly mean gap, All pairs'})).toBeInTheDocument();
    // The button went with the rule; focus stays on the line that says what is in scope.
    expect(screen.queryByRole('button', {name: 'Show all pairs'})).not.toBeInTheDocument();
    expect(screen.getByText('All pairs', {selector: 'p'})).toHaveFocus();
  });

  it('shows an empty scope for a rule with no stat, in both charts and the weekly gap', async () => {
    stubFetch({analytics: () => json(RAW), voteLog: () => json(VOTE_LOG)});
    renderPage('/calibration?rule=toy', 'tok');
    expect(await screen.findByText('Toys · no score votes yet')).toBeInTheDocument();
    expect(figure('Engine vs community').getByText('No voted pairs for this rule yet.')).toBeInTheDocument();
    expect(figure('Gap distribution').getByText('No voted pairs for this rule yet.')).toBeInTheDocument();
    expect(await figure('Weekly gap').findByText('No score votes in this scope yet.')).toBeInTheDocument();
    expect(screen.queryByRole('slider', {name: 'Weekly mean gap, Toys'})).not.toBeInTheDocument();
  });

  it('counts the engine-silent pairs on all pairs only', async () => {
    stubFetch({analytics: () => json(ANALYTICS)});
    const {user} = renderPage('/calibration');
    expect(await screen.findByText(/^Not plotted: 196 engine-silent pairs/)).toBeInTheDocument();
    await user.click(await ruleRow('Ramp'));
    expect(screen.queryByText(/Not plotted/)).not.toBeInTheDocument();
  });

  it("opens a dot's votes from the scatter, and lists its pair below the 40 widest", async () => {
    // 40 pairs at engine 5 with distinct gaps, then the narrowest (1 → 1), furthest left of all.
    const many = [
      ...Array.from({length: 40}, (_, i) => pairOf(String(i + 1), String(i + 101), 5, 5 + (i + 1) / 10)),
      pairOf('900', '901', 1, 1),
    ];
    const votes = [voteOn(many[40], '2026-09-29'), voteOn(many[0], '2026-09-22')];
    stubFetch({
      analytics: () => json({...RAW, pairs: many}),
      voteLog: () => json({...VOTE_LOG, votes}),
    });
    const {user} = renderPage('/calibration');
    const slider = await screen.findByRole('slider', {name: 'Engine score against community score, All pairs'});

    act(() => slider.focus());
    await user.keyboard('{Home}{Enter}');

    const panel = within(await screen.findByRole('region', {name: 'Card 900 × Card 901'}));
    expect(await panel.findByRole('table', {name: 'Votes on Card 900 × Card 901'})).toBeInTheDocument();
    const listed = pairButtons();
    expect(listed).toHaveLength(41);
    expect(listed[40]).toHaveAccessibleName(/^Card 900 × Card 901:/);
    expect(listed[40]).toHaveAttribute('aria-pressed', 'true');
  });

  it('puts one notice in place of the weekly gap and dimension participation without raw votes', async () => {
    stubFetch({analytics: () => json(ANALYTICS)});
    const {user} = renderPage('/calibration');
    expect(
      await screen.findByText(/^The weekly gap trend and dimension participation need raw votes\./),
    ).toBeInTheDocument();
    expect(screen.queryByRole('figure', {name: 'Weekly gap'})).not.toBeInTheDocument();
    expect(screen.queryByRole('region', {name: 'Dimension participation'})).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: /^Card 1 × Card 2:/}));
    expect(screen.getByRole('region', {name: 'Card 1 × Card 2'})).toHaveTextContent('No raw votes to show.');
  });

  it.each([
    ['is still loading', never, 'Loading the vote log…'],
    ['failed', () => new Response('', {status: 500}), 'Could not load the vote log: vote-log.json: HTTP 500'],
  ])('says so where the weekly gap goes while the vote log %s', async (_, voteLog, text) => {
    stubFetch({analytics: () => json(RAW), voteLog});
    renderPage('/calibration');
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(screen.queryByRole('figure', {name: 'Weekly gap'})).not.toBeInTheDocument();
  });
});

describe('CalibrationPage: the tuning aside', () => {
  it('keeps the analytics without a token, and asks for one in the aside', async () => {
    const fetchMock = stubFetch({analytics: () => json(ANALYTICS)});
    renderPage('/calibration');
    expect(await ruleRow('Ramp')).toBeInTheDocument();
    expect(aside().getByRole('heading', {level: 2, name: 'GitHub token'})).toBeInTheDocument();
    expect(aside().getByRole('button', {name: 'Save token'})).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(TUNING_URL, expect.anything());
  });

  it('says why tuning.json cannot be read, in the aside', async () => {
    stubFetch({tuning: () => new Response('Not Found', {status: 404})});
    renderPage('/calibration', 'tok');
    expect(await aside().findByRole('alert')).toHaveTextContent('Could not read tuning.json: GitHub 404');
  });

  it('forgets a token GitHub rejects from the aside, and keeps the analytics (R-26)', async () => {
    stubFetch({
      analytics: () => json(ANALYTICS),
      tuning: () => new Response('{"message":"Bad credentials"}', {status: 401}),
    });
    const {user} = renderPage('/calibration', 'tok');
    await user.click(await aside().findByRole('button', {name: 'Forget token'}));
    expect(aside().getByRole('button', {name: 'Save token'})).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(await ruleRow('Ramp')).toBeInTheDocument();
  });
});

describe('CalibrationPage: unpublished edits (R-19)', () => {
  /** Opens Ramp's copy and stages one edit to its title. */
  async function stageTitleEdit() {
    stubFetch({analytics: () => json(ANALYTICS)});
    const harness = renderPage('/calibration?rule=ramp', 'tok');
    await harness.user.type(await aside().findByRole('textbox', {name: 'Title text'}), '!');
    expect(aside().getByText('Live Ramp · Title · text')).toBeInTheDocument();
    return harness;
  }

  it('asks before leaving the page, and stays with the edit', async () => {
    const {router, user} = await stageTitleEdit();
    act(() => void router.navigate('/'));
    const dialog = await screen.findByRole('dialog', {name: 'Leave this page?'});
    expect(dialog).toHaveTextContent("Your pending tuning edits aren't published yet. Leaving this page drops them.");

    await user.click(within(dialog).getByRole('button', {name: 'Stay on this page'}));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(router.state.location.pathname).toBe('/calibration');
    expect(aside().getByText('Live Ramp · Title · text')).toBeInTheDocument();
  });

  it('picks another rule without asking, and keeps the edit and its mark', async () => {
    const {router, user} = await stageTitleEdit();
    await user.click(await ruleRow('Lore Loss'));
    await waitFor(() => expect(router.state.location.search).toBe('?rule=lore-loss'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(aside().getByText('Live Ramp · Title · text')).toBeInTheDocument();
    expect(await ruleRow('Ramp')).toHaveAccessibleName(/pending tuning edit/i);
  });

  it('lets the page go once the edit is published', async () => {
    vi.mocked(commitTuning).mockResolvedValue({commitUrl: 'https://github.com/Doberjohn/inkweave/commit/abc123'});
    const {router, user} = await stageTitleEdit();
    await user.click(aside().getByRole('button', {name: 'Publish to master'}));
    await waitFor(() => expect(aside().queryByText('Live Ramp · Title · text')).not.toBeInTheDocument());

    act(() => void router.navigate('/'));
    expect(await screen.findByRole('heading', {level: 1, name: 'Overview'})).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run it, and see it fail**

Run: `pnpm vitest run src/tools/analytics/calibration/__tests__/CalibrationPage.test.tsx`

Expected: FAIL, `Test Files  1 failed (1)` and `Tests  no tests`, with `Error: Failed to resolve import "../CalibrationPage" from "src/tools/analytics/calibration/__tests__/CalibrationPage.test.tsx". Does the file exist?`

- [ ] **Step 8: Write `CalibrationWorkspace.tsx`**

Create `src/tools/analytics/calibration/CalibrationWorkspace.tsx`. It is small named parts, so each function stays well under CodeScene's complexity threshold: one body with all of it scored 9.07.
- **The pair state.** A reset in `useEffect` would fail `react-hooks/set-state-in-effect`. So the pair is derived: `{ruleId, pair}`, shown only while `ruleId` is the resolved row's. `useRuleSelection`'s handlers drop it as well.
- **The seam.** The two columns meet on the row's 1px `gap` over `ADMIN_COLORS.border`, so the rule runs down the seam side by side and across it once the aside wraps under. That's why both columns are opaque: the aside's translucent tint goes over the page colour (`adminTheme.ts`).

```tsx
import {useRef, useState} from 'react';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {LinkButton, SPACING} from '../../../app-bridge';
import {PAGE_GUTTER} from '../../../shell/PageLayout';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {Notice} from '../../../ui/Notice';
import {DimensionParticipation} from '../DimensionParticipation';
import {PairList} from '../PairList';
import type {UseVoteAnalyticsReturn} from '../useVoteAnalytics';
import type {UseVoteLogReturn} from '../useVoteLog';
import {VoteDetailTable} from '../VoteDetailTable';
import type {PairStat, VoteAnalytics} from '../voteAnalyticsTypes';
import {CalibrationScatter} from './CalibrationScatter';
import {GapHistogram} from './GapHistogram';
import {RulesTable} from './RulesTable';
import {TuningAside, type TuningState} from './TuningAside';
import {WeeklyGapTrend} from './WeeklyGapTrend';
import {
  buildCalibrationRows,
  editedKeys,
  findPair,
  findRow,
  pairsFor,
  pairsHeading,
  pairsInScope,
  rowsSharingKey,
  votesForPair,
  withSelectedPair,
  type CalibrationRow,
} from './calibrationModel';
import {weeklyGaps} from './chartData';

type PairPick = {a: string; b: string};

export interface CalibrationWorkspaceProps {
  analytics: UseVoteAnalyticsReturn;
  voteLog: UseVoteLogReturn;
  /** Both tuning hooks, once a token is saved (CalibrationPage's TunedWorkspace). Null: the aside asks for a token. */
  tuning: TuningState | null;
  onSaveToken: (token: string) => void;
  /** Clears the shared token: the aside's way out when GitHub rejects it (R-26). */
  onForgetToken: () => void;
  /** ?rule=: a row id, or a tuning key that findRow resolves to its first rule. */
  selectedId: string | null;
  /** Writes ?rule=; null clears it. */
  onSelect: (id: string | null) => void;
}

// The two columns meet on a 1px rule: the row's border fill shows through the
// gap, down the seam side by side and across it once the aside wraps under.
const COLUMNS: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 1,
  minHeight: '100%',
  background: ADMIN_COLORS.border,
};

// The page body's grid (PageLayout's BODY) on the page colour, with the page's side gutter.
const LEFT: React.CSSProperties = {
  flex: '999 1 520px',
  minWidth: 0,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  alignContent: 'start',
  gap: SPACING.xxl,
  padding: `${SPACING.xxl}px ${PAGE_GUTTER}`,
  background: ADMIN_COLORS.page,
};

// The aside's tint is translucent, so it goes over the page colour, or the seam's fill would show through it.
const ASIDE: React.CSSProperties = {
  flex: '1 1 340px',
  minWidth: 0,
  background: `linear-gradient(${ADMIN_COLORS.aside}, ${ADMIN_COLORS.aside}), ${ADMIN_COLORS.page}`,
};

/**
 * Two panels side by side from 712px of column (two 346px tracks and the gap),
 * stacked below that. A chart's padded Panel takes 42px of its track, so 346px
 * keeps the plot at 304px, ChartTooltip's floor.
 */
const TWO_UP: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 346px), 1fr))',
  gap: SPACING.xl,
  alignItems: 'start',
};

const SCOPE_ROW: React.CSSProperties = {display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: SPACING.md};
const SCOPE_LINE: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.body, fontWeight: 700, color: ADMIN_COLORS.text};

/** Dimension participation sits under the scope row, but reads every vote, so it says so. */
const ALL_VOTES = 'All votes, whatever the rule';

/** A failed analytics load. Once tuning.json has loaded, the rules come from it alone. */
function AnalyticsError({error, tuningLoaded}: {error: Error; tuningLoaded: boolean}) {
  return (
    <Notice tone="error">
      Could not load vote analytics. Has the artifact been generated? ({error.message})
      {tuningLoaded && ' The rules below come from tuning.json alone.'}
    </Notice>
  );
}

/** The analytics' loading, failed and empty states. */
function AnalyticsNotice({analytics, tuningLoaded}: {analytics: UseVoteAnalyticsReturn; tuningLoaded: boolean}) {
  if (analytics.loading) return <Notice>Loading analytics...</Notice>;
  if (analytics.error) return <AnalyticsError error={analytics.error} tuningLoaded={tuningLoaded} />;
  // The precompute lists every engine rule, voted or not, so an empty artifact still has its rules.
  if (analytics.data?.global.totalVotes === 0) return <Notice>Vote analytics are empty: no votes yet.</Notice>;
  return null;
}

/** What the rules table says with no rows. No token and no analytics leaves it empty, with no read-only fallback (R-20). */
function rulesEmptyText(analytics: UseVoteAnalyticsReturn, hasToken: boolean): string {
  if (analytics.loading) return 'Loading the rules…';
  return hasToken
    ? "No rules to show: vote analytics are missing and tuning.json hasn't loaded."
    : 'No rules to show: vote analytics are missing and tuning.json needs a GitHub token.';
}

/**
 * The one filter row above everything the rule scopes (dataviz: filters sit
 * above what they scope): what is in scope, and the way back to every pair.
 * "Show all pairs" unmounts as it clears the rule, so it hands focus to the
 * scope line first, not to <body>.
 */
function ScopeRow({selected, onShowAll}: {selected: CalibrationRow | null; onShowAll: () => void}) {
  const lineRef = useRef<HTMLParagraphElement>(null);
  return (
    <div style={SCOPE_ROW}>
      <p ref={lineRef} tabIndex={-1} style={SCOPE_LINE}>
        {pairsHeading(selected)}
      </p>
      {selected && (
        // A 24px target (2.5.8): size sm is about 15px tall, and base alone about 19px.
        <LinkButton
          type="button"
          size="base"
          style={{minHeight: SPACING.xxl}}
          onClick={() => {
            onShowAll();
            lineRef.current?.focus();
          }}>
          Show all pairs
        </LinkButton>
      )}
    </div>
  );
}

/** What the vote table says in place of votes it can't show. The page's own Notice gives a failure's reason. */
function voteNotice(data: VoteAnalytics, voteLog: UseVoteLogReturn): string | undefined {
  if (!data.hasRawVotes) return 'No raw votes to show.';
  if (voteLog.data) return undefined;
  return voteLog.error ? 'Could not load the vote log.' : 'Loading the vote log…';
}

/** What the selected rule scopes, what to call it, and what an empty scope says. */
interface Scope {
  /** Every voted pair in scope, widest gap first and uncapped (pairsInScope): what the charts plot. */
  pairs: PairStat[];
  label: string;
  emptyText: string;
  /** Voted pairs with no engine score: counted on all pairs only, since no rule fired on them. */
  engineSilentPairs: number;
}

/** The selected rule's scope, or every pair's. */
function scopeOf(data: VoteAnalytics, selected: CalibrationRow | null): Scope {
  const pairs = pairsInScope(data.pairs, selected);
  if (!selected) {
    return {pairs, label: 'All pairs', emptyText: 'No voted pairs yet.', engineSilentPairs: data.global.engineSilentPairs};
  }
  return {pairs, label: selected.name, emptyText: 'No voted pairs for this rule yet.', engineSilentPairs: 0};
}

/** The weekly gap once the vote log is in; until then, or if it failed, a notice in its place. */
function WeeklyGap({voteLog, scope}: {voteLog: UseVoteLogReturn; scope: Scope}) {
  if (voteLog.data) return <WeeklyGapTrend weeks={weeklyGaps(voteLog.data.votes, scope.pairs)} scopeLabel={scope.label} />;
  if (voteLog.error) return <Notice tone="error">Could not load the vote log: {voteLog.error.message}</Notice>;
  return <Notice>Loading the vote log…</Notice>;
}

/** The weekly gap and dimension participation, which need the raw votes; one notice stands in for both without them. */
function RawVoteSections({data, voteLog, scope}: {data: VoteAnalytics; voteLog: UseVoteLogReturn; scope: Scope}) {
  if (!data.hasRawVotes) {
    return (
      <Notice>
        The weekly gap trend and dimension participation need raw votes. Set the <code>SUPABASE_SERVICE_ROLE_KEY</code>{' '}
        Actions secret, then re-run admin&apos;s Deploy workflow.
      </Notice>
    );
  }
  return (
    <>
      <WeeklyGap voteLog={voteLog} scope={scope} />
      <DimensionParticipation fill={data.global.dimensionFill} totalVotes={data.global.totalVotes} scope={ALL_VOTES} />
    </>
  );
}

interface ScopedAnalyticsProps {
  data: VoteAnalytics;
  voteLog: UseVoteLogReturn;
  selected: CalibrationRow | null;
  selectedPair: PairPick | null;
  onSelectPair: (pair: PairPick) => void;
  onShowAll: () => void;
}

/**
 * Everything the selected rule scopes, under the scope row that says what that
 * is: the scatter beside the histogram, the widest pairs beside the selected
 * pair's votes, then the weekly gap. The charts read the whole scope, the list
 * its widest 40. The scatter and the list pick the same pair, so a dot opens
 * its votes as a row does, and the list shows it even below the 40.
 */
function ScopedAnalytics({data, voteLog, selected, selectedPair, onSelectPair, onShowAll}: ScopedAnalyticsProps) {
  const scope = scopeOf(data, selected);
  return (
    <>
      <ScopeRow selected={selected} onShowAll={onShowAll} />
      <div style={TWO_UP}>
        <CalibrationScatter
          pairs={scope.pairs}
          scopeLabel={scope.label}
          selectedPair={selectedPair}
          onSelectPair={onSelectPair}
          engineSilentPairs={scope.engineSilentPairs}
          emptyText={scope.emptyText}
        />
        <GapHistogram pairs={scope.pairs} scopeLabel={scope.label} emptyText={scope.emptyText} />
      </div>
      <div style={TWO_UP}>
        <PairList
          pairs={withSelectedPair(pairsFor(data.pairs, selected), scope.pairs, selectedPair)}
          selectedPair={selectedPair}
          onSelectPair={onSelectPair}
          emptyText={scope.emptyText}
        />
        <VoteDetailTable
          pair={findPair(scope.pairs, selectedPair)}
          votes={votesForPair(voteLog.data?.votes ?? [], selectedPair)}
          notice={voteNotice(data, voteLog)}
        />
      </div>
      <RawVoteSections data={data} voteLog={voteLog} scope={scope} />
    </>
  );
}

/** What the workspace reads from the tuning hooks: tuning.json once it is read, and the keys with pending edits. */
function tuningView(tuning: TuningState | null): {config: TuningConfig | null; edited: Set<string>} {
  if (!tuning) return {config: null, edited: new Set()};
  return {
    config: tuning.live.status === 'ready' ? tuning.live.config : null,
    edited: editedKeys(tuning.admin.pending),
  };
}

/**
 * The rules table's rows. None until the analytics settle: tuning.json alone
 * would list every entry as a tuning-only row, then swap them for the
 * analytics rules when those land.
 */
function rulesFor(analytics: UseVoteAnalyticsReturn, config: TuningConfig | null): CalibrationRow[] {
  if (analytics.loading) return [];
  return buildCalibrationRows(analytics.data?.rules ?? null, config);
}

/**
 * The selected rule and pair. ?rule= may name a tuning key (location-control):
 * the row it resolves to is what the table marks, what a second click
 * deselects and what scopes the pairs. A pair belongs to the rule it was
 * picked under: a rule change from outside (the sidebar's link, the
 * Overview's) hides it with no effect, and the workspace's own rule controls
 * drop it.
 */
function useRuleSelection(rows: CalibrationRow[], selectedId: string | null, onSelect: (id: string | null) => void) {
  const selected = findRow(rows, selectedId);
  const selectedRowId = selected?.id ?? null;
  const [pick, setPick] = useState<{ruleId: string | null; pair: PairPick} | null>(null);
  const selectRule = (id: string | null) => {
    setPick(null);
    onSelect(id);
  };
  return {
    selected,
    selectedRowId,
    selectedPair: pick?.ruleId === selectedRowId ? pick.pair : null,
    pickPair: (pair: PairPick) => setPick({ruleId: selectedRowId, pair}),
    selectRule,
    /** A row's press: that rule, or all pairs again when it is the selected one. */
    toggleRule: (id: string) => selectRule(id === selectedRowId ? null : id),
  };
}

/** The rules sharing the selected rule's tuning.json entry: the aside names them (R-21). */
function sharedWith(rows: CalibrationRow[], selected: CalibrationRow | null): CalibrationRow[] {
  return selected?.tuningKey ? rowsSharingKey(rows, selected.tuningKey) : [];
}

/**
 * /calibration's body: the calibration analytics in the left column, the
 * tuning editor in the aside. It holds no route state: the rule comes in as
 * `selectedId` (?rule=), so the Overview's link, the sidebar's and a reload
 * all agree, and goes out through `onSelect`. It mounts no unsaved-edits
 * guard (CalibrationPage does), so a story renders it with no data router.
 */
export function CalibrationWorkspace({
  analytics,
  voteLog,
  tuning,
  onSaveToken,
  onForgetToken,
  selectedId,
  onSelect,
}: CalibrationWorkspaceProps) {
  const {config, edited} = tuningView(tuning);
  const rows = rulesFor(analytics, config);
  const selection = useRuleSelection(rows, selectedId, onSelect);
  return (
    <div style={COLUMNS}>
      <div style={LEFT}>
        <AnalyticsNotice analytics={analytics} tuningLoaded={config != null} />
        <RulesTable
          rows={rows}
          selectedId={selection.selectedRowId}
          edited={edited}
          onSelect={selection.toggleRule}
          emptyText={rulesEmptyText(analytics, tuning != null)}
        />
        {analytics.data && (
          <ScopedAnalytics
            data={analytics.data}
            voteLog={voteLog}
            selected={selection.selected}
            selectedPair={selection.selectedPair}
            onSelectPair={selection.pickPair}
            onShowAll={() => selection.selectRule(null)}
          />
        )}
      </div>
      <aside aria-label="Tuning editor" style={ASIDE}>
        <TuningAside
          tuning={tuning}
          onSaveToken={onSaveToken}
          onForgetToken={onForgetToken}
          selected={selection.selected}
          sharedWith={sharedWith(rows, selection.selected)}
        />
      </aside>
    </div>
  );
}
```

- [ ] **Step 9: Write `CalibrationPage.tsx`**

Create `src/tools/analytics/calibration/CalibrationPage.tsx`. `TunedWorkspace` is R2-5a's hand-off block, its message word for word; its doc comment also says why the page holds the router's one blocker.
- **The key.** A new token starts a fresh read of `tuning.json` and an empty tray.
- **Saving or forgetting a token** swaps `CalibrationWorkspace` for `TunedWorkspace` or back, so React remounts the workspace. The picked pair, the rules table's sort and each chart's view reset, and the rule survives in `?rule=` (header, "Hooks").

```tsx
import {useSearchParams} from 'react-router-dom';
import {useGithubToken} from '../../../github/useGithubToken';
import {PageLayout} from '../../../shell/PageLayout';
import {UnsavedChangesGuard} from '../../../shell/UnsavedChangesGuard';
import {useLiveTuning} from '../../tuning/useLiveTuning';
import {useTuningAdmin} from '../../tuning/useTuningAdmin';
import {useVoteAnalytics} from '../useVoteAnalytics';
import {useVoteLog} from '../useVoteLog';
import {CalibrationWorkspace, type CalibrationWorkspaceProps} from './CalibrationWorkspace';
import {calibrationSubtitle} from './calibrationModel';

/** What leaving /calibration with pending edits loses (R-19). */
const UNSAVED_TUNING = "Your pending tuning edits aren't published yet. Leaving this page drops them.";

/** The branch pill: only the page's tuning half writes, and the pill keeps the repo it writes to. */
const BRANCH_LABEL = 'Tuning writes to Doberjohn/inkweave';

/** "Data as of 2026-09-30": the day admin's Deploy workflow built the analytics. */
function DataAsOf({generatedAt}: {generatedAt: string}) {
  return (
    <>
      Data as of <code>{generatedAt.slice(0, 10)}</code>
    </>
  );
}

/**
 * Both tuning hooks need a token, so they live below the gate, and so does the
 * guard over their edits. It is the page's one guard (a router holds one
 * blocker), and it needs the data router, which a story doesn't have.
 */
function TunedWorkspace({token, ...rest}: Omit<CalibrationWorkspaceProps, 'tuning'> & {token: string}) {
  const live = useLiveTuning(token);
  const admin = useTuningAdmin(token);
  return (
    <>
      <UnsavedChangesGuard dirty={admin.pending.length > 0} message={UNSAVED_TUNING} />
      <CalibrationWorkspace {...rest} tuning={{live, admin}} />
    </>
  );
}

/**
 * Calibration & tuning (/calibration): the calibration analytics beside the
 * tuning editor, which writes tuning.json to the target branch. The selected
 * rule lives in ?rule= (the Overview's links carry it), and a pick writes it,
 * replacing the entry. Without a token the analytics render in full and only
 * the aside asks for one. /tuning redirects here.
 */
export function CalibrationPage() {
  const analytics = useVoteAnalytics();
  const voteLog = useVoteLog();
  const {token, setToken, clearToken} = useGithubToken();
  const [params, setParams] = useSearchParams();
  const workspace = {
    analytics,
    voteLog,
    onSaveToken: setToken,
    onForgetToken: clearToken,
    selectedId: params.get('rule'),
    // Replace: a pick changes the view, and Back should leave the page, not step through picks.
    onSelect: (id: string | null) => setParams(id ? {rule: id} : {}, {replace: true}),
  };
  return (
    <PageLayout
      title="Calibration & tuning"
      subtitle={analytics.loading ? undefined : calibrationSubtitle(analytics.data?.global ?? null)}
      meta={analytics.data ? <DataAsOf generatedAt={analytics.data.generatedAt} /> : undefined}
      writes
      branchLabel={BRANCH_LABEL}
      flush>
      {/* The key: a new token starts a fresh tuning.json read and an empty tray. */}
      {token ? (
        <TunedWorkspace key={token} token={token} {...workspace} />
      ) : (
        <CalibrationWorkspace {...workspace} tuning={null} />
      )}
    </PageLayout>
  );
}
```

- [ ] **Step 10: Run it to PASS**

Run: `pnpm vitest run src/tools/analytics/calibration/__tests__/CalibrationPage.test.tsx --silent=false`

Expected: PASS, `Tests  28 passed (28)`, with no warnings in the output. `--silent=false` is what shows them: Vitest hides a passing test's console output, an `act()` warning included. The guard's cases wait on `DialogShell`, which focuses 100ms after it opens and unmounts 400ms after it closes, so the file takes a few seconds. If Vitest times a case out under load (another session's run, a preview server), stop what this session runs and run it again.

- [ ] **Step 11: Point the shell's tests at the page that writes**

These fail once the calibration item writes, the `tuning` item goes and `/tuning` redirects, or pass while no longer testing what they say (header re-base note 9).

**`src/router.test.tsx`:**

1. The notice every write page shows. Before (`:13-14`):
   ```tsx
   const sidebarNav = () => within(screen.getByRole('navigation', {name: 'Admin'}));
   const WRITE_PATHS = NAV_ITEMS.filter((item) => item.writes).map((item) => item.path);
   ```
   After:
   ```tsx
   const sidebarNav = () => within(screen.getByRole('navigation', {name: 'Admin'}));
   const WRITE_PATHS = NAV_ITEMS.filter((item) => item.writes).map((item) => item.path);
   // Every page that writes names the repo: "Writes to Doberjohn/inkweave", or its
   // own label that keeps it ("Tuning writes to Doberjohn/inkweave").
   const BRANCH_NOTICE = /writes to Doberjohn\/inkweave/i;
   ```
2. R1-11's stale wording. Before (`:17-19`):
   ```tsx
     // The shell's CardDataProvider loads the card data on mount, and the
     // analytics page its artifacts. These tests only check routing, so those
     // fetches never settle.
   ```
   After:
   ```tsx
     // The shell's CardDataProvider loads the card data on mount, and the
     // insights pages their artifacts. These tests only check routing, so those
     // fetches never settle.
   ```
3. R1-7's redundant token clear (contract addition 4). `renderHook`, `act` and `useGithubToken` stay imported: the Forget-token cases use them. Before (`:23-33`):
   ```tsx
   afterEach(() => {
     // The token store is module-level: a case that fails before its Forget-token
     // click would otherwise hand its token to every later case. Clear it while the
     // page is still mounted and fetch is still stubbed.
     const store = renderHook(() => useGithubToken());
     act(() => store.result.current.clearToken());
     vi.unstubAllGlobals();
     vi.unstubAllEnvs();
     // The sidebar's collapsed state persists in localStorage.
     localStorage.clear();
   });
   ```
   After:
   ```tsx
   afterEach(() => {
     vi.unstubAllGlobals();
     vi.unstubAllEnvs();
     // The token store reads localStorage on every snapshot, so this one clear
     // resets the saved token and the sidebar's collapsed state alike.
     localStorage.clear();
   });
   ```
4. Overview isn't current on another page. Before (`:42-46`):
   ```tsx
     it('marks Overview current on / only', () => {
       // NavLink treats to="/" as exact, so the sidebar needs no `end` prop.
       renderAt('/tuning');
       expect(sidebarNav().getByRole('link', {name: 'Overview'})).not.toHaveAttribute('aria-current');
     });
   ```
   After:
   ```tsx
     it('marks Overview current on / only', () => {
       // NavLink treats to="/" as exact, so the sidebar needs no `end` prop.
       renderAt('/reveal');
       expect(sidebarNav().getByRole('link', {name: 'Overview'})).not.toHaveAttribute('aria-current');
     });
   ```
5. The current link, and the branch on every write path. Before (`:55-64`):
   ```tsx
     it("marks only the current page's link", () => {
       renderAt('/tuning');
       expect(sidebarNav().getByRole('link', {name: 'Engine tuning'})).toHaveAttribute('aria-current', 'page');
       expect(sidebarNav().getByRole('link', {name: 'Calibration & tuning'})).not.toHaveAttribute('aria-current');
     });

     it.each(WRITE_PATHS)('names the branch %s writes to', (path) => {
       renderAt(path);
       expect(screen.getByText('Writes to Doberjohn/inkweave')).toHaveTextContent('Writes to Doberjohn/inkweave master');
     });
   ```
   After:
   ```tsx
     it("marks only the current page's link", () => {
       renderAt('/reveal');
       expect(sidebarNav().getByRole('link', {name: 'Reveal publisher'})).toHaveAttribute('aria-current', 'page');
       expect(sidebarNav().getByRole('link', {name: 'Calibration & tuning'})).not.toHaveAttribute('aria-current');
     });

     it.each(WRITE_PATHS)('names the branch %s writes to', (path) => {
       renderAt(path);
       expect(screen.getByText(BRANCH_NOTICE)).toHaveTextContent(/writes to Doberjohn\/inkweave master/i);
     });
   ```
6. No branch where nothing writes. Before (`:72-75`):
   ```tsx
     it.each(['/calibration', '/no-such-page'])('names no branch on %s, which writes nothing', (path) => {
       renderAt(path);
       expect(screen.queryByText('Writes to Doberjohn/inkweave')).not.toBeInTheDocument();
     });
   ```
   After:
   ```tsx
     it.each(['/no-such-page'])('names no branch on %s, which writes nothing', (path) => {
       renderAt(path);
       expect(screen.queryByText(BRANCH_NOTICE)).not.toBeInTheDocument();
     });
   ```
7. The parity test. Before (`:98`):
   ```tsx
         expect(screen.queryByText('Writes to Doberjohn/inkweave') != null).toBe(writes);
   ```
   After:
   ```tsx
         expect(screen.queryByText(BRANCH_NOTICE) != null).toBe(writes);
   ```
8. The pages that write, which feed the token-gate cases below them. Before (`:102-106`):
   ```tsx
     const WRITE_PAGES: Array<[path: string, title: string]> = [
       ['/reveal', 'Reveal publisher'],
       ['/image', 'Card images'],
       ['/tuning', 'Engine tuning'],
     ];
   ```
   After:
   ```tsx
     const WRITE_PAGES: Array<[path: string, title: string]> = [
       ['/reveal', 'Reveal publisher'],
       ['/image', 'Card images'],
       // The gate fills the tuning aside; the analytics beside it need no token.
       ['/calibration', 'Calibration & tuning'],
     ];
   ```
9. R1-11's "(R1-5)". Before (`:213`):
   ```tsx
       // src/test/setup.ts has already emptied the artifact cache (R1-5), and the
   ```
   After:
   ```tsx
       // src/test/setup.ts has already emptied the artifact cache, and the
   ```
10. The redirect, and the branch notice on `/calibration`. Before (`:234-239`):
    ```tsx
      it('opens Calibration & tuning at /calibration, without a branch notice', async () => {
        routerAt('/calibration');
        expect(screen.getByRole('heading', {level: 1, name: 'Calibration & tuning'})).toBeInTheDocument();
        expect(await screen.findByText('All pairs')).toBeInTheDocument();
        expect(screen.queryByText('Writes to Doberjohn/inkweave')).not.toBeInTheDocument();
      });
    ```
    After:
    ```tsx
      it('redirects the retired /tuning to Calibration & tuning', async () => {
        const router = routerAt('/tuning');
        await waitFor(() => expect(router.state.location.pathname).toBe('/calibration'));
        expect(router.state.historyAction).toBe('REPLACE');
        expect(screen.getByRole('heading', {level: 1, name: 'Calibration & tuning'})).toBeInTheDocument();
      });

      it('opens Calibration & tuning at /calibration, with a branch notice', async () => {
        routerAt('/calibration');
        expect(screen.getByRole('heading', {level: 1, name: 'Calibration & tuning'})).toBeInTheDocument();
        expect(await screen.findByText('All pairs')).toBeInTheDocument();
        expect(screen.getByText(/^Tuning writes to Doberjohn\/inkweave/)).toHaveTextContent(
          'Tuning writes to Doberjohn/inkweave master',
        );
      });
    ```
11. The Forget-token comment above the token-gate case, which R2-5's aside makes untrue. The case itself is unchanged: its fetches never settle, so no 401 shows the aside's button, and the sidebar's is the one it clicks. Before (`:114-115`):
    ```tsx
      // The write pages have no Forget token of their own any more (README section 1).
      // The sidebar's is the only one, and the shared token state carries it to the page.
    ```
    After:
    ```tsx
      // The sidebar's Forget token works on every write page (README section 1), and the
      // shared token state carries it to the page. /calibration's aside offers its own only
      // when GitHub rejects the token (R-26).
    ```

**`src/shell/nav.test.ts`:**

1. Before (`:1`):
   ```ts
   import {NAV_ITEMS, isWritePath, navItemFor} from './nav';
   ```
   After:
   ```ts
   import {NAV_ITEMS, calibrationHref, isWritePath, navItemFor} from './nav';
   ```
2. Before (`:18`):
   ```ts
     it.each(['/tuning', '/reveal', '/image/'])('%s writes to the app', (pathname) => {
   ```
   After:
   ```ts
     it.each(['/calibration', '/reveal', '/image/'])('%s writes to the app', (pathname) => {
   ```
3. Before (`:22`):
   ```ts
     it.each(['/calibration', '/no-such-page'])('%s writes nothing', (pathname) => {
   ```
   After:
   ```ts
     // /tuning is a redirect now, and a redirect writes nothing.
     it.each(['/tuning', '/no-such-page'])('%s writes nothing', (pathname) => {
   ```
4. Before (`:42-47`, to the end of the file):
   ```ts
     it('owns /calibration, and writes nothing in R1', () => {
       expect(navItemFor('/calibration')).toMatchObject({id: 'calibration', label: 'Calibration & tuning', mark: 'Ca'});
       // Tuning moves in, and the page starts writing, in R2 (R-4).
       expect(isWritePath('/calibration')).toBe(false);
     });
   });
   ```
   After:
   ```ts
     it('owns /calibration, and writes', () => {
       expect(navItemFor('/calibration')).toMatchObject({id: 'calibration', label: 'Calibration & tuning', mark: 'Ca'});
       // The tuning editor moved into the page (R-4), and /tuning only redirects to it.
       expect(isWritePath('/calibration')).toBe(true);
       expect(NAV_ITEMS.some((item) => item.id === 'tuning' || item.path === '/tuning')).toBe(false);
     });
   });

   describe('calibrationHref', () => {
     it('links the bare page when no rule is given', () => expect(calibrationHref()).toBe('/calibration'));

     it.each([
       ['lore-loss', '/calibration?rule=lore-loss'],
       ['location-control', '/calibration?rule=location-control'],
       ['a b', '/calibration?rule=a%20b'],
     ])('links %s to %s', (ruleId, href) => {
       expect(calibrationHref(ruleId)).toBe(href);
     });
   });
   ```

**`src/shell/Sidebar.test.tsx`:**
- `:33` before:
  ```tsx
      expect(hrefs('Publish')).toEqual(['/tuning', '/reveal', '/image']);
  ```
  After:
  ```tsx
      expect(hrefs('Publish')).toEqual(['/reveal', '/image']);
  ```
- `:54` (a read-only page) before:
  ```tsx
      ['a read-only page, even with a token saved', '/calibration', true],
  ```
  After:
  ```tsx
      ['a read-only page, even with a token saved', '/activity', true],
  ```
- `:81` (a page that writes) before:
  ```tsx
      renderSidebar({path: '/tuning', tokenSaved: true, onForgetToken});
  ```
  After:
  ```tsx
      renderSidebar({path: '/reveal', tokenSaved: true, onForgetToken});
  ```

The default path in `renderSidebar` (`:9`, `'/calibration'`) still serves the layout cases.

**`src/shell/AdminShell.test.tsx`:** the shell's own test moves to another page that writes, so it needs neither the guard nor the analytics.
- `:4` before:
  ```tsx
  import {TuningPage} from '../tools/tuning/TuningPage';
  ```
  After:
  ```tsx
  import {ImagePage} from '../tools/image/ImagePage';
  ```
- `:8` before:
  ```tsx
    const routes = [{element: <AdminShell />, children: [{path: 'tuning', element: <TuningPage />}]}];
  ```
  After:
  ```tsx
    const routes = [{element: <AdminShell />, children: [{path: 'image', element: <ImagePage />}]}];
  ```
- `:13` before:
  ```tsx
    // The card data and tuning.json loads never settle; the test is about the token.
  ```
  After:
  ```tsx
    // The card data load never settles; the test is about the token.
  ```
- `:25` before:
  ```tsx
      renderShellAt('/tuning');
  ```
  After:
  ```tsx
      renderShellAt('/image');
  ```

- [ ] **Step 12: Run them, and see them fail**

Run: `pnpm vitest run src/shell src/router.test.tsx`

Expected: FAIL, `Test Files  3 failed | 4 passed (7)` and `Tests  12 failed | 81 passed (93)`.
- `nav.test.ts` (7): "/calibration writes to the app", "/tuning writes nothing", "owns /calibration, and writes", and the four `calibrationHref` cases (`TypeError: calibrationHref is not a function`).
- `Sidebar.test.tsx` (1): "lists the pages under their group labels".
- `router.test.tsx` (4): "asks for a GitHub token on /calibration, under the page title", "returns /calibration to the token gate from the sidebar's Forget token", "redirects the retired /tuning to Calibration & tuning", and "opens Calibration & tuning at /calibration, with a branch notice".

The counts include R2-5a's two guard test files, which sit in `src/shell`.

- [ ] **Step 13: Make the page write, route it, and redirect `/tuning`**

1. **`src/shell/nav.ts`**, contract addition 13. Before (`:22-26`):
   ```ts
     // Read-only in R1. Tuning moves in with R2, which turns writes on (R-4).
     {id: 'calibration', label: 'Calibration & tuning', mark: 'Ca', path: '/calibration', group: 'insights', writes: false},
     {id: 'activity', label: 'Vote activity', mark: 'Ac', path: '/activity', group: 'insights', writes: false},
     {id: 'web', label: 'Web analytics', mark: 'Wa', path: '/web', group: 'insights', writes: false},
     {id: 'tuning', label: 'Engine tuning', mark: 'Tu', path: '/tuning', group: 'publish', writes: true},
   ```
   After:
   ```ts
     // The calibration analytics beside the tuning editor (R2). The editor commits tuning.json, so the page writes (R-4).
     {id: 'calibration', label: 'Calibration & tuning', mark: 'Ca', path: '/calibration', group: 'insights', writes: true},
     {id: 'activity', label: 'Vote activity', mark: 'Ac', path: '/activity', group: 'insights', writes: false},
     {id: 'web', label: 'Web analytics', mark: 'Wa', path: '/web', group: 'insights', writes: false},
   ```
   Then add contract addition 2 at the end of the file, after `isWritePath` (`:40-43`), with a blank line between:
   ```ts
   /**
    * The Calibration & tuning page, opened on a rule when one is given: the URL
    * its ?rule= reads. The rule is a RuleStat.ruleId or a tuning.json key.
    */
   export function calibrationHref(ruleId?: string): string {
     return ruleId ? `/calibration?rule=${encodeURIComponent(ruleId)}` : '/calibration';
   }
   ```
2. **`src/router.tsx`.** The imports, before (`:4-10`):
   ```tsx
   import {CalibrationPage} from './tools/analytics/CalibrationPage';
   import {ActivityPage} from './tools/analytics/activity/ActivityPage';
   import {OverviewPage} from './tools/analytics/overview/OverviewPage';
   import {WebAnalyticsPage} from './tools/analytics/web/WebAnalyticsPage';
   import {ImagePage} from './tools/image/ImagePage';
   import {RevealPage} from './tools/reveal/RevealPage';
   import {TuningPage} from './tools/tuning/TuningPage';
   ```
   After:
   ```tsx
   import {ActivityPage} from './tools/analytics/activity/ActivityPage';
   import {CalibrationPage} from './tools/analytics/calibration/CalibrationPage';
   import {OverviewPage} from './tools/analytics/overview/OverviewPage';
   import {WebAnalyticsPage} from './tools/analytics/web/WebAnalyticsPage';
   import {ImagePage} from './tools/image/ImagePage';
   import {RevealPage} from './tools/reveal/RevealPage';
   ```
   The route, before (`:25`):
   ```tsx
         {path: 'tuning', element: <TuningPage />},
   ```
   After:
   ```tsx
         // The tuning editor moved into /calibration's aside (R-10).
         {path: 'tuning', element: <Navigate to="/calibration" replace />},
   ```
   `TuningPage` stays on disk, unrouted, until R2-7 deletes it with `writePages.test.tsx`'s row for it.
3. **Delete R1's host and its test:**
   ```bash
   rm src/tools/analytics/CalibrationPage.tsx src/tools/analytics/__tests__/CalibrationPage.test.tsx
   ```
4. **`src/shell/Sidebar.stories.tsx`.** The decorator's default route (`:15`) moves to a read-only page, so `Open` ("A read-only page") stays true. Before:
   ```tsx
         <MemoryRouter initialEntries={[parameters.route ?? '/calibration']}>
   ```
   After:
   ```tsx
         <MemoryRouter initialEntries={[parameters.route ?? '/activity']}>
   ```
   `Collapsed` (`:38`) moves to a page that writes, so it keeps its token box. Before:
   ```tsx
     parameters: {route: '/tuning'},
   ```
   After:
   ```tsx
     parameters: {route: '/calibration'},
   ```

- [ ] **Step 14: Run them to PASS**

Run: `pnpm vitest run src/shell src/router.test.tsx src/tools/analytics/calibration`

Expected: PASS. `src/shell` with `router.test.tsx` is `Test Files  7 passed (7)` and `Tests  91 passed (91)`, and every file under `calibration` passes, `CalibrationPage.test.tsx` among them.

- [ ] **Step 15: Stories**

Create `src/tools/analytics/calibration/CalibrationWorkspace.stories.tsx`.
- **What it renders.** The page's header and workspace, with `?rule=` held in state. Stories have no data router, so it mounts no guard.
- **The data.** The pairs and votes R2-4c's `AllPairs` story draws (400 pairs at real density), spread over three rules so a rule scopes part of them.
- **The token stand-in.** It uses the real edit hook on the bundled `tuning.json`; publishing needs a real token.
- **The stories:**
  - `AllPairs`: no token;
  - `TuningARule`: a token, with Ramp picked;
  - `SharedEntry`: `?rule=location-control`;
  - `TuningOnly`: no analytics, with a token;
  - `Loading`.

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {TUNING} from 'inkweave-synergy-engine';
import {PageLayout} from '../../../shell/PageLayout';
import {useTuningAdmin} from '../../tuning/useTuningAdmin';
import type {UseVoteAnalyticsReturn} from '../useVoteAnalytics';
import type {UseVoteLogReturn} from '../useVoteLog';
import type {PairStat, RuleStat, VoteAnalytics} from '../voteAnalyticsTypes';
import {CalibrationWorkspace} from './CalibrationWorkspace';
import type {TuningState} from './TuningAside';
import {calibrationSubtitle} from './calibrationModel';
import {ALL_PAIRS, ALL_PAIRS_VOTES} from './chartFixtures';

// The 400 pairs R2-4c's AllPairs story draws, spread over three rules, so a
// rule scopes the charts to part of them.
const PAIRS: PairStat[] = ALL_PAIRS.map((pair, i) => ({
  ...pair,
  rules: [['ramp', 'lore-loss'], ['ramp'], ['location-boost']][i % 3],
}));

/** A rule's stat from its pairs: score votes summed, the gap weighted by votes. No playstyleId: the pinned engine maps it. */
function ruleStat(ruleId: string, ruleName: string): RuleStat {
  const pairs = PAIRS.filter((pair) => pair.rules.includes(ruleId));
  const scoreVotes = pairs.reduce((sum, pair) => sum + pair.scoreVotes, 0);
  const meanGap = scoreVotes ? pairs.reduce((sum, pair) => sum + pair.gap * pair.scoreVotes, 0) / scoreVotes : null;
  return {
    ruleId,
    ruleName,
    category: 'playstyle',
    scoreVotes,
    pairsVoted: pairs.length,
    meanGap,
    accuracySentiment: null,
    pairsCovered: 0.2,
  };
}

const RULES: RuleStat[] = [
  ruleStat('ramp', 'Ramp'),
  ruleStat('lore-loss', 'Lore Loss'),
  ruleStat('location-boost', 'Location Boost'),
  ruleStat('location-search', 'Location Search'),
];

const TOTAL_VOTES = PAIRS.reduce((sum, pair) => sum + pair.scoreVotes, 0);

const ANALYTICS: VoteAnalytics = {
  generatedAt: '2026-10-05T04:00:00Z',
  hasRawVotes: true,
  global: {
    totalVotes: TOTAL_VOTES,
    distinctPairs: PAIRS.length,
    distinctVoters: 40,
    meanGap: PAIRS.reduce((sum, pair) => sum + pair.gap * pair.scoreVotes, 0) / TOTAL_VOTES,
    accuracySentiment: null,
    engineSilentPairs: 37,
    weekly: [],
    dimensionFill: {score: TOTAL_VOTES, accuracy: 210, isReal: 90, wouldPlay: 180, difficulty: 40},
  },
  rules: RULES,
  pairs: PAIRS,
};

const LOADED: UseVoteAnalyticsReturn = {data: ANALYTICS, loading: false, error: null};
const VOTE_LOG: UseVoteLogReturn = {
  data: {generatedAt: ANALYTICS.generatedAt, votes: [...ALL_PAIRS_VOTES], voterCount: 40},
  loading: false,
  error: null,
};

// The bundled copy stands in for the live tuning.json, and a reload reads it again.
const READY: TuningState['live'] = {status: 'ready', config: TUNING, reload: () => Promise.resolve(TUNING)};

interface WorkspaceStoryProps {
  analytics: UseVoteAnalyticsReturn;
  voteLog: UseVoteLogReturn;
  /** A saved token: the aside edits the bundled tuning.json with the real edit hook. Publishing needs a real token. */
  withToken: boolean;
  /** ?rule= as the story opens. */
  rule: string | null;
}

/**
 * The page as CalibrationPage lays it out, with ?rule= held in state. A story
 * has no data router, so it renders the workspace without the page's guard.
 */
function WorkspaceStory({analytics, voteLog, withToken, rule}: WorkspaceStoryProps) {
  const [selectedId, setSelectedId] = useState(rule);
  const admin = useTuningAdmin('ghp_example');
  const tuning: TuningState | null = withToken ? {live: READY, admin} : null;
  return (
    // As in the shell's main column: the layout fills the height, and only its body scrolls.
    <div style={{height: '100vh'}}>
      <PageLayout
        title="Calibration & tuning"
        subtitle={analytics.loading ? undefined : calibrationSubtitle(analytics.data?.global ?? null)}
        writes
        branchLabel="Tuning writes to Doberjohn/inkweave"
        flush>
        <CalibrationWorkspace
          analytics={analytics}
          voteLog={voteLog}
          tuning={tuning}
          onSaveToken={() => {}}
          onForgetToken={() => {}}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </PageLayout>
    </div>
  );
}

const meta: Meta<typeof WorkspaceStory> = {
  title: 'Admin/Insights/Calibration/Workspace',
  component: WorkspaceStory,
  args: {analytics: LOADED, voteLog: VOTE_LOG, withToken: false, rule: null},
};
export default meta;
type Story = StoryObj<typeof meta>;

/** All pairs at real density, without a token: the analytics in full, the token gate in the aside. */
export const AllPairs: Story = {};

/** A rule picked with a token saved: the charts follow it, and the aside edits its tuning.json entry. */
export const TuningARule: Story = {
  args: {withToken: true, rule: 'ramp'},
};

/** The Locations entry, which several rules share: ?rule= names the key, and its first rule opens. */
export const SharedEntry: Story = {
  args: {withToken: true, rule: 'location-control'},
};

/** No analytics, with a token: the rules come from tuning.json alone. */
export const TuningOnly: Story = {
  args: {
    analytics: {data: null, loading: false, error: new Error('vote-analytics.json has not been generated yet')},
    voteLog: {data: null, loading: false, error: null},
    withToken: true,
  },
};

/** The analytics still loading, without a token. */
export const Loading: Story = {
  args: {
    analytics: {data: null, loading: true, error: null},
    voteLog: {data: null, loading: true, error: null},
  },
};
```

Then `src/shell/PageLayout.stories.tsx`. Its imports, before (`:1-3`):

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {CtaButton} from '../app-bridge';
import {PageLayout} from './PageLayout';
```

After:

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {CtaButton, SPACING} from '../app-bridge';
import {ADMIN_COLORS} from '../theme/adminTheme';
import {PAGE_GUTTER, PageLayout} from './PageLayout';
```

The label story, and a `Flush` story after it. Before (`:47-50`, to the end of the file):

```tsx
/** A page that writes, with its own notice label. */
export const WritesWithLabel: Story = {
  args: {title: 'Calibration & tuning', writes: true, branchLabel: 'Tuning writes to'},
};
```

After:

```tsx
/** A page that writes, with its own notice label. */
export const WritesWithLabel: Story = {
  args: {title: 'Calibration & tuning', writes: true, branchLabel: 'Tuning writes to Doberjohn/inkweave'},
};

/** A flush body: no padding and no grid, so the page lays out its own columns edge to edge (R2's aside). */
export const Flush: Story = {
  args: {
    title: 'Calibration & tuning',
    writes: true,
    branchLabel: 'Tuning writes to Doberjohn/inkweave',
    flush: true,
    children: (
      <div style={{display: 'flex', flexWrap: 'wrap', minHeight: '100%'}}>
        <p style={{flex: '999 1 520px', margin: 0, padding: `${SPACING.xxl}px ${PAGE_GUTTER}`}}>The left column.</p>
        <p style={{flex: '1 1 340px', margin: 0, padding: SPACING.xxl, background: ADMIN_COLORS.aside}}>The aside.</p>
      </div>
    ),
  },
};
```

- [ ] **Step 16: Lint, typecheck, the whole suite and Code Health**

Run: `pnpm lint`
Expected: no problems.

Run: `pnpm typecheck`
Expected: exit 0. It covers the stories and the test files.

Run: `pnpm test:run`
Expected: every file passes. `src/tools/tuning` still holds `TuningPage` and its tests, unrouted, until R2-7.

Then run CodeScene's `code_health_review` on `CalibrationWorkspace.tsx`, `CalibrationPage.tsx`, `CalibrationWorkspace.stories.tsx`, `__tests__/CalibrationPage.test.tsx`, `src/shell/PageLayout.tsx` and `src/shell/nav.ts`.
Expected: 10.0 each, with no findings. CodeScene gates the PR, so fix a finding now: split the function it names, as `CalibrationWorkspace.tsx` is split.

- [ ] **Step 17: Look at it in Storybook**

Run: `pnpm storybook`, then open http://localhost:6007 → `Admin/Insights/Calibration/Workspace`. Check these:
- **`AllPairs`:**
  - The scatter and the histogram sit two-up at a wide canvas, and stack once the left column is under 712px.
  - The pair list scrolls inside its panel.
  - The aside shows the token gate under its own landmark.
- **`TuningARule`:**
  - The charts read "Ramp · …".
  - Typing in a field puts a gold dot on the Ramp row and an edit in the tray.
  - "Show all pairs" leaves focus on the scope line.
- **The seam:**
  - Narrow the canvas until the aside wraps under the left column. The 1px rule runs across the seam, with no line left down the page's edge.
  - The tray stays pinned to the bottom while the left column scrolls.
- **`Admin/PageLayout` → `Flush`:** both columns run edge to edge under the header.
- **Every story:** Storybook's Accessibility panel reports no violations.

Stop the server afterwards. If no browser is available to the implementer, record each check as pending with the owner, as R1-2's Step 11 did, and say so in the report.

- [ ] **Step 18: Commit**, with the Bash tool, only after the owner approves. Use two separate calls, so the commit command starts with `USER_APPROVED=1`:

```bash
git add src/tools/analytics/calibration/CalibrationWorkspace.tsx src/tools/analytics/calibration/CalibrationPage.tsx src/tools/analytics/calibration/CalibrationWorkspace.stories.tsx src/tools/analytics/calibration/__tests__/CalibrationPage.test.tsx src/tools/analytics/CalibrationPage.tsx src/tools/analytics/__tests__/CalibrationPage.test.tsx src/shell/PageLayout.tsx src/shell/PageLayout.test.tsx src/shell/PageLayout.stories.tsx src/shell/nav.ts src/shell/nav.test.ts src/shell/Sidebar.test.tsx src/shell/Sidebar.stories.tsx src/shell/AdminShell.test.tsx src/router.tsx src/router.test.tsx
```

```bash
USER_APPROVED=1 git commit -m "feat(calibration): merge calibration and tuning at /calibration (#24)"
```

`git add` on the two deleted paths stages their removal. Never stage `public/admin-data/`. Husky's pre-commit runs lint and the tests. If Vitest fails to start its workers under load, stop this session's preview servers, wait out other sessions' runs, and retry.

### Hand-offs from R2-6

- **R2-7.**
  - `src/tools/__tests__/writePages.test.tsx` still renders `TuningPage` (`:7`, `:24`). It is unrouted after this task, and R2-7 deletes it (the header's R2-7 row).
  - R2-7's Step 1 finds `AdminShell.test.tsx` on `ImagePage`. Its Step 6 grep prints three lines, `nav.test.ts:23`, `nav.test.ts:47` (the path comparison) and `router.test.tsx:236` (item 11's third comment line moves it down from `:235`): R2-7's "if R2-6 compares paths" case.
  - `CLAUDE.md:16` still lists `/tuning` with the write tools until R2-7 rewrites it.
- **R2-8.** `calibrationHref` exists. `CalibrationPage.tsx` says "the Overview's links", never "Tune link", so R2-8's `grep -rn "Tune link" src` finds nothing here.
- **The phase's real-data check** (header, "Before the PR"). Add these items to its `/calibration` list. Stage edits on a rehearsal branch (`VITE_ADMIN_TARGET_BRANCH`), or clear them; the check never publishes.
  - `/tuning` lands on `/calibration`, and the sidebar marks "Calibration & tuning" current.
  - With a token saved, the sidebar shows its token box on `/calibration`, and the header reads "Tuning writes to Doberjohn/inkweave `master`".
  - With an edit staged, the sidebar's "Vote activity" link opens "Leave this page?". "Stay on this page" keeps the edit, and a reload gets the browser's own prompt.
  - The seam between the columns, side by side and wrapped, and the tray pinned while the left column scrolls.
- **When the plan is assembled.**
  - The header's contract addition 11 and its "Hooks" bullet take R2-5a's guard contract.
  - The main plan's "NAV_ITEMS at the end of R1" gains contract addition 13.
  - The URL contract line reads: `/calibration?rule=<RuleStat.ruleId, or a tuning key>`. R2-6's page reads it and writes it, and R2-8's Overview link builds it with `calibrationHref`.
