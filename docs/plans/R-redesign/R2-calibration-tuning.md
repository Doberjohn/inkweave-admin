> Part of [R: Admin redesign](../R-redesign.md). Read its decisions (R-17 to R-26 for R2), corrections to the spec, global constraints and shared interfaces first.

## Phase R2: Calibration & tuning

> Part of [R: Admin redesign](../R-redesign.md). Read its decisions (R-17 to R-26 settle this phase's open questions), corrections to the spec, global constraints, shared interfaces and "R1 as built" first.

> **Re-base notes (2026-10-05).** The outline was written on 2026-10-01 against the planned R1 code and pin `5a54ee90`. R1 is merged (`main` @ `c92e260`) and the pin is `bc877e17`. Changes:
> 1. **Pin.** `5a54ee90..bc877e17` touches 283 files across the app repo.
>    - **The engine:** 7 of them, all ink-drop scoring: `inkDropScoring.ts`, `utils/inkDrops.ts`, `utils/mechanics.ts`, two export lines each in `index.ts` and `utils/index.ts` (`isDropGainGate`, `isLateDropMaker`), plus `__tests__/inkDrops.test.ts` and `INK_DROPS_RULE.md`. `rules.ts`, `types/synergy.ts`, `data/tuning.ts`, `tuning.json` and `SynergyEngine.ts` are unchanged.
>    - **Bridged app modules that changed:** `theme.ts`, where `FONTS.body` gains an `'Inkweave Sans Fallback'` family (`:18`) and no other token moves, and the reveal tools' modules: `revealSet.ts` (new exports through `constants/index.ts`), `rarity.ts`, `RaritySymbol.tsx`, `features/cards/loader.ts`, `CardDataContext.tsx` and `previewCards.json`. R2 uses none of the reveal modules and doesn't depend on the font fallback.
>    - Every count below was re-run against the engine built at `bc877e17`, and every line reference was re-read. All of them still hold.
> 2. **R-17.** The mapping reads `playstyleId` from the analytics artifact, and the pinned engine is the fallback. R2-1 now also adds the field to the precompute and to `RuleStat`. The `tuning.json` section now comes from the artifact's `category`, so the outline's test "`{ruleId: 'lore-loss', category: 'direct'}` still maps to `lore-denial`" is inverted.
> 3. **R-18.** `reset` is gone. `useTuningAdmin` gains `dropStale(config)`, and `useLiveTuning`'s `reload` resolves with the config it read, so the aside can keep the edits that still apply.
> 4. **R-19.** New task R2-5a: `useUnsavedChangesGuard` and `UnsavedChangesGuard`, a dialog in the app's `DialogShell` (bridged), not `window.confirm`. R2-6 mounts `<UnsavedChangesGuard>` in `TunedWorkspace`. `useBlocker` needs a data router, so the guard is never mounted below the page.
> 5. **R-22.** New task R2-8: the Overview's link reads "Tune" or "Inspect", built with `calibrationHref`. That makes moving the link onto `calibrationHref` part of R2. It was optional before.
> 6. **R-26.** A 401 from GitHub becomes a third failure kind. `publishFailure.ts` becomes `tuningFailure.ts`, since it now classifies read errors too, and `isRejectedToken` goes in a new `src/github/rejectedToken.ts`. It stays out of `githubCommit.ts`, where one more string argument fails CodeScene's gate. The aside's read error and the tray's publish error both offer "Forget token", which asks first when edits are pending (note 12).
> 7. **Chart kit refactor.** R1's final fix wave split the kit, so contract addition 6 now edits `lineLayout.ts` and `LineChart.tsx`, quoting today's code. `axis.ts` needs no edit. `LINE_Y_AXIS_WIDTH` and `LINE_END_WIDTH` live in `lineLayout.ts`, as `BAR_Y_AXIS_WIDTH` lives in `barLayout.ts`. ScatterChart renders through `ChartPlot`, which gains one optional prop, `extend`. Through it the scatter swaps the kit's x-only pointer for the nearest dot, adds click and Enter/Space, and passes focus on to the kit only from the keyboard. `SurfaceRing` stays in `LineChart.tsx`.
> 8. **R-23 as decided, with one question.** Each dot sits on its own opaque r 6 disc in the page colour, as R-23 says, so `barNeutral` composites over the page alone to `#63637d`, the colour the validator run below uses. Since R1's fix wave, LineChart's markers ring in the true surface instead (`SurfaceRing`: a page disc, then a card disc), so the scatter's ring reads a hair darker than the card. If the owner picks the two-disc ring, only R2-4a's `Dots` and `LiftedDot` change, with the two tests that check the disc fill. **Flag this to the owner at review.**
> 9. **R1 as built.**
>    - `GithubTokenGate` is already an h2 in the page body (R1-7), so the planned `inline` prop is dropped. `PageLayout` already sets `document.title`. Contract addition 1 quotes today's `BODY`, and also exports the side gutter so a flush page's columns keep the phone easing.
>    - `/calibration`'s branch label becomes "Tuning writes to Doberjohn/inkweave": the outline's "Tuning writes to" would have replaced the whole default label and dropped the repo. R1's own examples show the short form, so R2-6 updates both: `PageLayout.tsx:64`'s doc comment (`e.g. "Tuning writes to"`) and `PageLayout.stories.tsx:49` (`branchLabel: 'Tuning writes to'`). `PageLayout.test.tsx:61-69` passes its own label and stays.
>    - **R1 tests and stories that R2-6 must change.** Once `calibration` has `writes: true`, the `tuning` nav item is gone and `/tuning` redirects, these break. Checked in a scratch copy against a stand-in for R2-6: the cases marked "fails" fail, and the others still pass but no longer test what they say.
>      - `src/router.test.tsx`:
>        - `:42-46` (passes vacuously) and `:55-59` (fails) render `/tuning`, and `:57` expects an "Engine tuning" link. Both render `/reveal` instead, and `:57` expects "Reveal publisher".
>        - `:61-64`, `it.each(WRITE_PATHS)` (fails on `/calibration`): it matches the exact text "Writes to Doberjohn/inkweave". It takes the parity test's regex, `getByText(/writes to Doberjohn\/inkweave/i)` with `toHaveTextContent(/writes to Doberjohn\/inkweave master/i)`. One new exact case renders `/calibration` and expects `getByText(/^Tuning writes to Doberjohn\/inkweave/)`.
>        - `:72-75` (passes vacuously) lists `/calibration` as writing nothing. It keeps `/no-such-page` only, with the regex.
>        - `:94-100`, the parity test (fails on `/calibration`): `queryByText(/writes to Doberjohn\/inkweave/i)`.
>        - `WRITE_PAGES` (`:102-106`): `['/tuning', 'Engine tuning']` becomes `['/calibration', 'Calibration & tuning']`. It feeds `:108` and `:116` (both fail on `/tuning`) and `:130` (passes vacuously).
>        - `:234-239` (passes vacuously) inverts to "opens Calibration & tuning at /calibration, with a branch notice", expecting `getByText(/^Tuning writes to Doberjohn\/inkweave/)`.
>        - New, beside the `/analytics` case: `/tuning` lands on `/calibration` with `historyAction` `'REPLACE'`.
>        - The `afterEach` (`:23-33`) drops its redundant `renderHook` / `clearToken` (R1-7's deferred item; contract addition 4).
>      - `src/shell/nav.test.ts`: `:18` (fails) becomes `['/calibration', '/reveal', '/image/']`; `:22` (fails) becomes `['/tuning', '/no-such-page']`, since a redirect path writes nothing; `:42-46` (fails) becomes "owns /calibration, and writes", and also checks no `tuning` item is left.
>      - `src/shell/Sidebar.test.tsx`: `:33` (fails) expects Publish to be `['/reveal', '/image']`; `:54`'s read-only case (fails) moves from `/calibration` to `/activity`; `:81` (fails) expects the token box at `/reveal`.
>      - `src/shell/Sidebar.stories.tsx`: `Collapsed` (`:38`) moves from `/tuning` to `/calibration`, or it loses its token box; the decorator's default route (`:15`) moves to `/activity`, so `Open` (`:26`, "A read-only page") stays true.
>      - `src/shell/AdminShell.test.tsx` (`:4`, `:8`, `:25`; fails): `isWritePath('/tuning')` becomes false, so "GitHub token saved" never renders. The route becomes `{path: 'image', element: <ImagePage />}` at `/image`, and the `:13` comment drops "tuning.json".
>
>      These edits pass lint and, against the stand-in, all of their cases pass (41 in `router.test.tsx`; `nav`, `Sidebar` and `AdminShell` too).
>    - `RawVotesNotice` is used only by `CalibrationView` and retires with it. `activityStats.ts` stays, because `activityModel.ts` and `OverviewView.tsx` import it. `docs/PLAN.md` D10 already names the `/tuning` redirect, so R2-7 updates `CLAUDE.md` instead.
> 10. **R1's deferred items** that R2 absorbs are listed under "Deferred from R1".
> 11. **Verified in a scratch sandbox** (`scratchpad/r2-rebase/sandbox-header`, the repo's `node_modules` through a junction, Vitest 5 in jsdom):
>     - Contract addition 6: R2-4a's own verification (R2-4a.md, re-base notes, "Verified") supersedes this sketch.
>     - The `useUnsavedChangesGuard` sketch: 4 cases under `createMemoryRouter` with `window.confirm`. R2-5a's 14 tests supersede it.
>     - The R-17 `tuningKeyFor` sketch: lint-clean, `tsc --strict` clean with the `RuleStat` addition, and run in node against the built engine. With the field and without it, all 23 keys are reached, the six direct rules map to null, and 9 rules share `location-control`.
> 12. **After review (2026-10-05).**
>     - **Forgetting the token with pending edits asks first.** The aside's and the tray's R-26 "Forget token" call `window.confirm` when edits are pending (contract addition 10), in R-19's spirit. A publish checks each edit's `expected` value against the file, never the token, so a replacement token could have published them: dropping them silently lost work. The sidebar's "Forget token" still drops them without asking (see "Noted limit"). **Flag this to the owner at review.**
>     - **The charts row's track is 346px, not 340px.** Each chart sits in a padded `Panel` (20px a side and a 1px border), so 340px left a 298px plot, under `ChartTooltip`'s 304px floor.
>     - **The Overview's last two tracks become `48px 48px`.** "Inspect" overflowed the 36px link column (R2-8 measures it).
>     - **The real-data check runs last**, after R2-8, so it covers the Overview's Tune and Inspect links too.
>     - **The raw-votes and vote-log states** are named under "Charts", and R2-7 lists every file its deletions break.
>     - **New contract addition 13:** NAV_ITEMS at the end of R2.
> 13. **Owner flags at review.**
>     - R2-3's gate: red gap text on a selected row button.
>     - R2-4a's disc: a page disc, or page plus card (note 8).
>     - R2-5: "Read tuning.json again" on a failed read, and the Forget-token confirm (note 12).
>     - R2-5a: bridging `DialogShell`, and first focus on the dialog's message.
>     - R2-4c: the gap plot prints no dates (`xTicks={[]}`).

> **Contract additions** (to "Shared interfaces (R1)". These add names and rename nothing; addition 13 removes the `tuning` nav item.)
> 1. **`src/shell/PageLayout.tsx`: `flush?: boolean` and `PAGE_GUTTER` (R2-6).** Today's `BODY` (`PageLayout.tsx:45`) is both the scroller and the padded grid, with no inner wrapper:
>    ```tsx
>    const BODY: React.CSSProperties = {
>      flex: 1,
>      minHeight: 0,
>      overflowY: 'auto',
>      display: 'grid',
>      gridTemplateColumns: 'minmax(0, 1fr)',
>      alignContent: 'start',
>      gap: SPACING.xxl,
>      padding: `${SPACING.xxl}px ${GUTTER}`,
>    };
>    ```
>    `flush` swaps the body's style for `FLUSH_BODY = {flex: 1, minHeight: 0, overflowY: 'auto'}`, the same scroller with no grid and no padding.
>    - `PageLayoutProps` gains `flush?: boolean` after `branchLabel?: string;` (`:65`).
>    - The signature (`:76`) gains `flush = false` after `branchLabel`.
>    - `<div style={BODY}>{children}</div>` (`:96`) becomes `<div style={flush ? FLUSH_BODY : BODY}>{children}</div>`.
>    - The module-level `GUTTER` (`clamp(16px, 4vw, 32px)`) is exported as `PAGE_GUTTER`, so R2-6's left column pads with it rather than a fixed 32px. A constant export passes `react-refresh/only-export-components` (`allowConstantExport`).
>    - Two cases go in `src/shell/PageLayout.test.tsx`. Only R2 (the full-height aside) and R4 (the studio) use `flush`.
> 2. **`src/shell/nav.ts`: `export function calibrationHref(ruleId?: string): string;` (R2-6).** It returns `'/calibration'`, or `'/calibration?rule=' + encodeURIComponent(ruleId)`. R2-8 moves the Overview's link (`RulesToReviewCard.tsx`, today an inline `` `/calibration?rule=${encodeURIComponent(r.ruleId)}` ``) onto it.
> 3. **`src/tools/analytics/verdict.ts` exists (R1-8).** It exports `CALIBRATION_BAND = 0.5`, `SCALE_CLAMP = 1.5`, `Verdict`, `verdictFor` (`null` gives "not enough data") and `scalePercent`, and its test is `src/tools/analytics/__tests__/verdict.test.ts`. R2 only imports from it.
> 4. **No `resetGithubTokenStore`.** `useGithubToken`'s store reads `localStorage` on every snapshot unless a failed write set `memoryOnly`, and no R2 test makes a write fail. Clearing `localStorage` in `afterEach` is the whole reset.
> 5. **`src/charts/scatter.ts` and `src/charts/ScatterChart.tsx`: a scatter chart joins the kit (R2-4a).** It goes into "Chart kit (R1-3b)" when the plan is assembled. It builds only on kit names (`linear`, `chartWidth`, `SeriesDef`, `ChartTooltip`/`TooltipContent`, `useChartCursor`, `ChartPlot`/`ChartSvg`/`AxisGrid`/`EmptyChart`, `axis.ts`, `DOT_RADIUS`/`RING`) and `fmtInt`, the other charts' default number format:
>    ```ts
>    // src/charts/scatter.ts
>    export interface ScatterPoint {key: string; x: number; y: number; series: string; label: string} // label: the slider's value text
>    export const HIT_RADIUS = 24;                                    // px: the pointer only has to be closest, within this of a dot's centre
>    export const SCATTER_MARGIN: {readonly top: 24; readonly right: 16; readonly bottom: number; readonly left: 32}; // 24/16/40/32 from SPACING; left is a floor
>    export const SCATTER_MAX_WIDTH = 440;
>    export function scatterWidth(measured: number): number;          // min(chartWidth(measured), SCATTER_MAX_WIDTH): 440 until measured
>    export interface DiagonalLine {x1: number; y1: number; x2: number; y2: number; angle: number} // px; angle in degrees
>    export interface ScatterLayout {width: number; height: number; left: number; top: number; side: number;
>      x: (v: number) => number; y: (v: number) => number; diagonal: DiagonalLine | null}
>    export function scatterLayout(width: number, xDomain: readonly [number, number], yDomain: readonly [number, number],
>      yLabels?: readonly string[]): ScatterLayout;                   // a square plot; the left margin fits the widest y label
>    export function jitterOffset(key: string, amount: number): [number, number];   // fixed per key, each axis within ±amount
>    export function diagonalJitter(key: string, along: number, across: number): [number, number]; // fixed per key; y − x moves by at most `across`
>    export type JitterAlong = 'both' | 'diagonal';
>    export interface PlacedDot {point: ScatterPoint; color: string; px: number; py: number}
>    export interface DotOptions {series: readonly SeriesDef[]; jitter: number; jitterAlong: JitterAlong}
>    export function placeDots(points: readonly ScatterPoint[], layout: ScatterLayout, opts: DotOptions): PlacedDot[]; // 'diagonal': across = jitter / 5
>    export function nearestPoint(points: ReadonlyArray<{px: number; py: number}>, x: number, y: number, radius: number): number | null;
>    export function scatterOrder<T extends {key: string; x: number; y: number}>(points: readonly T[]): T[]; // x, then y, then key
>
>    // src/charts/ScatterChart.tsx (re-exports ScatterPoint)
>    export interface ScatterChartProps {
>      points: readonly ScatterPoint[];          // drawn in this order: the last sit on top
>      series: readonly SeriesDef[]; ariaLabel: string;
>      xDomain: readonly [number, number]; yDomain: readonly [number, number];
>      xTicks: readonly number[]; yTicks: readonly number[]; xLabel: string; yLabel: string;
>      tickFormat?: (n: number) => string;      // default fmtInt
>      diagonal?: string;                        // draws y = x, labelled with this text
>      jitter?: number;                          // data units, default 0
>      jitterAlong?: JitterAlong;                // default 'both'; 'diagonal' uses diagonalJitter(key, jitter, jitter / 5)
>      tooltip: (point: ScatterPoint) => TooltipContent;
>      selectedKey?: string | null; onSelect?: (key: string) => void; // with onSelect, click and Enter/Space select
>      emptyText?: string;                       // shown in place of the plot with no points (default "No data to chart.")
>    }
>    export function ScatterChart(props: ScatterChartProps): JSX.Element;
>
>    // src/charts/ChartSvg.tsx: ChartPlot gains
>    extend?: (props: React.HTMLAttributes<HTMLElement>) => React.HTMLAttributes<HTMLElement>; // adjusts the slider's props before they are spread
>    ```
> 6. **`src/charts/lineLayout.ts` and `LineChart.tsx`: what the weekly gap trend (R2-4c) needs.**
>    - **Already in the kit (R1), so R2-4a only checks for them:** `LinePoint.y` is `number | null` (`lineLayout.ts`). A null keeps its x on the axis, breaks the line and reads "—" in the tooltip. A non-null point with no neighbours gets its own dot (`circle[data-lone]`), and the series' last point the ringed end dot (`circle[data-end]`).
>    - **Added by R2-4a:** `LineLayoutOptions` and `LineChart`'s props gain `yDomain?: readonly [number, number]` and `fixedGutters?: boolean`, and `lineLayout.ts` exports `LINE_Y_AXIS_WIDTH` and `LINE_END_WIDTH` (48px each, `SPACING.xxxl + SPACING.lg`), which `LineChart.tsx` re-exports.
>      - **`yDomain`** is the y domain to span, widened only to keep every value, zero and the baseline on the plot. Its ticks follow the computed domain's rule: both ends, and 0 between them when it crosses zero.
>      - **`fixedGutters`** lays the plot out between the two fixed gutters, so two LineCharts over the same x put each x at the same px. A label wider than its gutter widens it, as with `BAR_Y_AXIS_WIDTH`.
>      - Existing callers pass neither and draw as before.
> 7. **`src/charts/ChartLegend.tsx`: `mark: 'rect' | 'line' | 'dot'`.** `'dot'` keys each series with a filled circle (its hatch included), so the scatter's legend mirrors its dots. Existing callers draw as before.
> 8. **`playstyleId` in the analytics artifact (R2-1, R-17).**
>    ```ts
>    // src/tools/analytics/voteAnalyticsTypes.ts, RuleStat (:27-36), after category
>    /** The rule's playstyle (its tuning.json key), null for a direct rule; absent in artifacts from before R-17. */
>    playstyleId?: string | null;
>    ```
>    - `scripts/lib/voteAnalytics.mjs` exports a pure `ruleRosterEntry(rule)` → `{ruleId, ruleName, category, playstyleId: string | null}` (null for a direct rule). `loadRuleRoster()` (`scripts/precompute-vote-analytics.mjs:84-89`) maps `getAllRules()` through it.
>    - `rollUpByRule` (`scripts/lib/voteAnalytics.mjs:101-105`) passes `playstyleId: rule.playstyleId` through unchanged, so a roster without the field leaves it absent and the client falls back.
>    - Four new cases in `scripts/lib/__tests__/voteAnalytics.test.mjs`: two for `ruleRosterEntry`, one for `rollUpByRule`, one for `buildAnalytics`. Nothing logs it.
> 9. **Tuning model (R2-2, R-18, R-26):**
>    ```ts
>    // src/tools/tuning/tuningRows.ts: RowSpec, shiftTierRows, rampRows, rowsForSelection moved verbatim from TuningEditor.tsx:17-67; RowSpec and rowsForSelection are exported, shiftTierRows and rampRows stay private
>    export function tuningName(config: TuningConfig, key: string): string;
>    export function tuningKind(config: TuningConfig, key: string): 'playstyle' | 'direct';
>    export function pendingLabel(ruleName: string, rowLabel: string, field: 'text' | 'score'): string;
>    // src/github/rejectedToken.ts (R4's write pages reuse it)
>    export function isRejectedToken(message: string): boolean;   // "GitHub 401 on …", the form ghJson and readRepoFile throw
>    // src/tools/tuning/tuningFailure.ts (the outline's publishFailure.ts)
>    export type TuningFailureKind = 'stale-value' | 'rejected-token' | 'other';
>    export function tuningFailureKind(message: string): TuningFailureKind; // a read error or a publish error
>    // src/tools/tuning/useTuningAdmin.ts
>    // config holds oldValue at path: the check applyTuningEdits makes. False when the reloaded config no
>    // longer has the path. It never throws: applyTuningEdits' parentOf (githubClient.ts:21) throws a
>    // TypeError on a missing intermediate key, so stillApplies walks the path itself.
>    export function stillApplies(edit: Pick<PendingEdit, 'path' | 'oldValue'>, config: TuningConfig): boolean;
>    // UseTuningAdminResult (:34-44) gains:
>    dropStale: (config: TuningConfig) => number; // keeps the edits that still apply, drops the rest, clears result and error, returns how many it dropped
>    // src/tools/tuning/useLiveTuning.ts: reload resolves with what it read (null when the read failed; the state shows the error)
>    export type UseLiveTuningResult = LiveTuning & {reload: () => Promise<TuningConfig | null>};
>    export function useLiveTuning(token: string): UseLiveTuningResult;
>    ```
>    - The stale-value message in `githubClient.ts:42` changes "Reload the page" to "Reload tuning.json", and keeps "changed since the editor loaded it", which `tuningFailureKind` matches.
>    - R2-2 tests the missing path: an edit under a playstyle key that the reloaded config no longer has gives `stillApplies` false, and `dropStale` drops it and counts it.
> 10. **The aside and the tray (R2-5, R-18, R-21, R-26):**
>     ```ts
>     export interface TuningState {live: ReturnType<typeof useLiveTuning>; admin: UseTuningAdminResult}
>     export function TuningAside(props: {
>       tuning: TuningState | null; onSaveToken: (token: string) => void; onForgetToken: () => void;
>       selected: CalibrationRow | null; sharedWith: CalibrationRow[];
>     }): JSX.Element;
>     // PendingTray props gain:
>     onReload?: () => void;      // shown for a 'stale-value' error
>     onForgetToken?: () => void; // shown for a 'rejected-token' error
>     // src/github/ForgetTokenOffer.tsx (R4 can reuse it)
>     export function ForgetTokenOffer(props: {onForget: () => void}): JSX.Element; // "GitHub rejected the saved token. [Forget token] to enter a new one."
>     // src/tools/analytics/calibration/reloadNote.ts
>     export function reloadNote(dropped: number): string; // the aside's role="status" line after "Reload tuning.json" (R-18)
>     ```
>     - A failed read that isn't a 401 offers "Read tuning.json again" (`live.reload()`). The pending edits live in `TunedWorkspace`, so a read that succeeds brings them back (R2-5, an owner flag).
>     - `GithubTokenGate` doesn't change: R1-7 already renders it as an h2 in the body. Inside `<aside aria-label="Tuning editor">` it heads the aside "GitHub token", and the landmark carries the aside's name.
>     - **R-26's "Forget token" asks before it drops edits.** `TuningAside` wraps `onForgetToken` once and hands the wrapper to both its read error and `PendingTray`, so the tray needs no new logic. With `n = tuning.admin.pending.length > 0`, the wrapper calls ``window.confirm(`Forget the token and drop ${n} unpublished edit${n === 1 ? '' : 's'}?`)`` and calls `onForgetToken` only on OK. With nothing pending it calls `onForgetToken` straight away. R2-5 tests both answers with one pending edit and a publish 401: with `confirm` stubbed to return false, clicking "Forget token" doesn't call `onForgetToken`; stubbed true, it calls it once. It also tests that with no pending edits a read 401's "Forget token" calls `onForgetToken` without asking.
> 11. **`src/shell/useUnsavedChangesGuard.ts` and `src/shell/UnsavedChangesGuard.tsx` (R2-5a, R-19).** The confirm UI is the app's `DialogShell`, bridged (`src/app-bridge.ts` gains `export {DialogShell} from '../upstream/inkweave/apps/web/src/shared/components/DialogShell';`), not `window.confirm`.
>     ```ts
>     export interface UnsavedChangesGuardState {blocked: boolean; stay: () => void; leave: () => void}
>     export type LeavesPage = (from: Location, to: Location) => boolean; // Location from react-router-dom
>     export function useUnsavedChangesGuard(dirty: boolean, leaves?: LeavesPage): UnsavedChangesGuardState;
>     export function UnsavedChangesDialog(props: {open: boolean; message: string; onStay: () => void; onLeave: () => void}): JSX.Element | null;
>     export function UnsavedChangesGuard(props: {dirty: boolean; message: string; leaves?: LeavesPage}): JSX.Element | null;
>     ```
>     - **Leaving the page.** While `dirty`, a navigation that leaves is held, and the dialog "Leave this page?" asks: "Stay on this page" (also Escape and the scrim) or "Leave this page". By default only a new pathname leaves; R4's studio passes its own `leaves`.
>     - **Same-page changes pass.** A navigation that keeps the pathname, such as a new `?rule=`, goes through.
>     - **Closing the tab.** A `beforeunload` listener, attached only while dirty, calls `preventDefault()` so the browser asks in its own words.
>     - **Edits that clear while a navigation is held** (a publish that lands) end the hold as a stay.
>     - **Where to mount it.** `useBlocker` needs a data router, and a router supports one blocker at a time. So mount `UnsavedChangesGuard` once, from a route's element (R2-6's `TunedWorkspace`). Never from a component that stories render: they use a plain `MemoryRouter` (`Sidebar.stories.tsx`, `OverviewView.stories.tsx`). R4's studio reuses it.
> 12. **The Overview's rule link (R2-8, R-22).** `RulesToReviewCard` labels each rule's link "Tune {name}" when `tuningKeyFor(r, TUNING) != null`, and "Inspect {name}" otherwise. The visible text is "Tune" or "Inspect", and both links go to `calibrationHref(r.ruleId)`.
>     - `TUNING` is the pinned engine's bundled copy: the Overview holds no token, so it can't read the live file.
>     - A key added on `master` after the pin reads "Inspect" until the pin bump. The page it opens reads the live file and shows the entry.
>     - **The bias bar.** `BiasBar` gains `minWidth?: number` (default 64). The card passes 0, so the bar spans exactly its shrinking track and never paints over the gap (R2-8 measures it).
>     - **The row's grid.** `RulesToReviewCard.tsx:35`'s `'minmax(80px, 1fr) minmax(0, 100px) 52px 36px'` becomes `'minmax(80px, 1fr) minmax(0, 100px) 48px 48px'`. `PanelLink` is 12px (`ADMIN_TYPE.small`) and `nowrap`, so "Inspect" (43.3px) would overflow the 36px link track past the card's edge, and its right edge would no longer line up with "Tune". The gap column's widest text is at most 40.1px, so it gives up 4px (R2-8 has the measurements).
> 13. **`src/shell/nav.ts`: NAV_ITEMS at the end of R2 (R2-6).** The counterpart of the main plan's "NAV_ITEMS at the end of R1":
>     ```ts
>     // src/shell/nav.ts: NAV_ITEMS at the end of R2, in order
>     // {id:'overview', label:'Overview', mark:'Ov', path:'/', group:'main', writes:false}
>     // {id:'calibration', label:'Calibration & tuning', mark:'Ca', path:'/calibration', group:'insights', writes:true}
>     // {id:'activity', label:'Vote activity', mark:'Ac', path:'/activity', group:'insights', writes:false}
>     // {id:'web', label:'Web analytics', mark:'Wa', path:'/web', group:'insights', writes:false}
>     // {id:'reveal', label:'Reveal publisher', mark:'Re', path:'/reveal', group:'publish', writes:true}
>     // {id:'image', label:'Card images', mark:'Im', path:'/image', group:'publish', writes:true}
>     // URL contract: /calibration?rule=<RuleStat.ruleId, or a tuning key>. R2-6's page reads it and writes it
>     // (useSearchParams, replace: true); calibrationHref (addition 2) builds it, and R2-8's Overview link uses it.
>     ```
>     - The `calibration` item gets `writes: true`, and the `tuning` item is removed. `/tuning` stays a route only, as `<Navigate to="/calibration" replace />` in `router.tsx`.
>     - The comment above the calibration item (`nav.ts:22`), `// Read-only in R1. Tuning moves in with R2, which turns writes on (R-4).`, becomes `// The calibration analytics beside the tuning editor (R2). The editor commits tuning.json, so the page writes (R-4).` (lint-clean).

**Goal.** Build one page at `/calibration`.
- **Left column:** the calibration analytics. They need no token.
- **Right aside:** the tuning editor, behind a token gate.
- **Charts (R-13):** a calibration scatter, a gap histogram and a weekly gap trend in the left column. They use the R1 chart kit plus a new `ScatterChart`, and the selected rule scopes all three.
- **`/tuning`:** redirects to the page.
- **Leaving with unpublished edits** asks first (R-19).
- **Retired:**
  - from `src/tools/analytics/`: `CalibrationView`, `VerdictHero`, `Scorecard`, `WeeklyActivityChart`, `RuleCalibrationTable` and `RawVotesNotice`, and R1's host `src/tools/analytics/CalibrationPage.tsx` with its test (R2-6);
  - from `src/tools/tuning/`: `RuleSelector`, `TuningEditor`, `TuningPage` and `index.ts` (its one line re-exports `TuningEditor`, and nothing imports it).
- **Logic that stays where it is:** validation and the conflict check stay in `useTuningAdmin`, `useLiveTuning` and `githubClient.ts`. R2-2 adds to them:
  - `dropStale` and `stillApplies`;
  - `reload` now resolves with the config it read;
  - the reworded stale-value message.

  Nothing else in them changes.

**How a rule finds its tuning entry (checked at pin `bc877e17`, 2026-10-05).**
- **Where the analytics rules come from.**
  - `loadRuleRoster()` (`scripts/precompute-vote-analytics.mjs:85-89`) imports the built engine of the app's `master` (`app-master/` in the Deploy workflow). It maps `getAllRules()` to `{ruleId, ruleName, category}`.
  - `rollUpByRule` (`scripts/lib/voteAnalytics.mjs:91-116`) passes those three through (`:101-104`).
  - `RuleStat` (`src/tools/analytics/voteAnalyticsTypes.ts:27-36`) has no `playstyleId` yet. Contract addition 8 adds it.
- **Where the engine defines it.**
  - `getAllRules` and `getRuleById` are at `upstream/inkweave/packages/synergy-engine/src/engine/rules.ts:1456` and `:1471`, exported from `src/index.ts:32` and `:35`. `TUNING` and `TuningConfig` are exported at `src/index.ts:144`.
  - `PlaystyleSynergyRule.playstyleId` is at `types/synergy.ts:23-26`. `SynergyRule` is a union on `category`, so only a playstyle rule has one.
  - `createLocationRule` (`rules.ts:490`) gives every `location-*` rule `playstyleId: 'location-control'` (`:495`). Lore Loss gets `'lore-denial'` (`:1011`).
- **What `tuning.json` holds.** `TuningConfig` (`data/tuning.ts`) has three parts:
  - 22 `playstyles` keys: `lore-denial`, `location-control`, `discard`, `toy`, `ramp`, `sacrifice`, `self-discard`, `dwarfs`, `floodborn`, `hunny`, `red-panda`, `items`, `healing`, `exert`, `bounce`, `ink-drops`, `monster`, `princess`, `hero`, `super`, `royalty`, `detective`;
  - one `directRules` key, `shift-targets`;
  - `ruleTexts`, which holds `shift-targets` and `ramp`.
- **How the ids line up.**
  - The engine has 37 rules: 30 playstyle and 7 direct.
  - For 10 of them the id differs from the tuning key: `lore-loss` (to `lore-denial`), and the nine `location-*` rules (to `location-control`). The nine are `location-at-payoff`, `location-play-trigger`, `location-move-trigger`, `location-buff`, `location-location-ramp`, `location-move`, `location-in-play-check`, `location-search` and `location-boost`.
  - Six direct rules have no entry at all: `named-companions`, `singer-songs`, `spike-suit`, `merida-archer`, `merida-wisp` and `free-play`. R-20 keeps them selectable for their pairs.
  - Going through `playstyleId`, all 23 tuning keys are reached. No tuning-only row appears with the full roster.
- **Where admin reads `playstyleId` (R-17).**
  - **From the artifact first.** Deploy builds the artifact from the app's `master`, the branch the aside reads `tuning.json` from. So the rule list, the key and the section agree, however far the pin lags.
  - **The engine as fallback.** An artifact from before the field gives `playstyleId === undefined`. That is every artifact until the first Deploy after R2 merges, plus any local snapshot. For those, the key comes from the pinned engine's `getRuleById`, which admin already imports at runtime (`src/tools/reveal/validateForm.ts:1`). A rule the pin doesn't know falls back to its own id.
  - **The section** always comes from the artifact's `category`.
  - **Rehearsals.** A rehearsal (`VITE_ADMIN_TARGET_BRANCH`) reads its own branch's `tuning.json` against an artifact built from `master`. The keys rarely differ, and the union of the two lists keeps any extra entry reachable.
  - **The mapping, as proposed.** It is lint-clean and `tsc --strict` clean, and in node against the pin it reached all 23 keys both with and without the field:
    ```ts
    /**
     * A playstyle rule's tuning key: the artifact's playstyleId (R-17), else the
     * pinned engine's for an artifact from before that field. Null for a direct
     * rule, and for a rule the pin doesn't know when the artifact can't say.
     */
    function playstyleKey(rule: Pick<RuleStat, 'ruleId' | 'category' | 'playstyleId'>): string | null {
      if (rule.category !== 'playstyle') return null;
      if (rule.playstyleId !== undefined) return rule.playstyleId;
      const engineRule = getRuleById(rule.ruleId);
      return engineRule?.category === 'playstyle' ? engineRule.playstyleId : null;
    }

    /**
     * The tuning.json key that holds a rule's copy, or null when there is none. A
     * playstyle rule's copy lives under its playstyleId (lore-loss under
     * lore-denial, every location-* rule under location-control), a direct rule's
     * under its own id. The key and the section both come from the artifact, which
     * Deploy builds from the app's master, the branch tuning.json is read from.
     */
    export function tuningKeyFor(rule: Pick<RuleStat, 'ruleId' | 'category' | 'playstyleId'>, config: TuningConfig): string | null {
      const key = playstyleKey(rule) ?? rule.ruleId;
      const entries = rule.category === 'playstyle' ? config.playstyles : config.directRules;
      return Object.hasOwn(entries, key) ? key : null;
    }
    ```
  - **The real-data check.** R2's check ("Before the PR", after R2-8) runs on today's artifact, which has no field, so it exercises the fallback. Unit tests cover the field. After the merge, the first Deploy's artifact gets one look: `/calibration?rule=lore-loss` opens the Lore Denial copy.

**Page model.**
- **Selection.**
  - The selected rule lives in `?rule=` (`useSearchParams`, `replace: true`). The Overview's link works, a reload keeps the selection, and a manual pick now writes the URL. That closes R1-11's deferred "reads `?rule=` but never writes it".
  - `?rule=` may name a tuning key (`location-control`). `findRow` resolves it to a row, and the table, the deselect check and the pair scope all use that resolved row's id.
  - The selected pair is derived state: `{ruleId, pair}`, shown only while `ruleId` matches the resolved row. A rule change from any source drops it without an effect: a click, the sidebar link or the Overview link. A reset in `useEffect` would fail `react-hooks/set-state-in-effect`.
  - The pair list and the scatter set that same pair. A dot picked on the scatter opens the pair's votes just as a list row does, and the list shows that pair pressed, appended at its end when it sits below the 40 widest.
- **Rule list.** The list is `buildCalibrationRows(analytics?.rules ?? null, liveConfig)`: the analytics rows plus any `tuning.json` entry no rule reaches. With no analytics, it is `tuning.json` alone. No rows while the analytics load (R2-6's `rulesFor`): `tuning.json` alone never stands in for them meanwhile. With no token and no analytics, the table is empty and says why, with no read-only fallback (R-20).
- **Token.**
  - **Without a token**, the left column renders in full and only the aside shows `GithubTokenGate`.
  - **The sidebar token box** appears once a token is saved, because `/calibration` now writes (`nav.ts`, `writes: true`).
  - **A rejected token** (a 401 on the read or on the publish) puts "Forget token" in the aside's error (R-26). It asks first when edits are pending (contract addition 10), then calls the shared `clearToken`. The gate comes back in the aside, and the left column remounts (see "Hooks").
- **Hooks.**
  - `useLiveTuning`, `useTuningAdmin` and the guard all need the token or the data router. So a small `TunedWorkspace({token, ...rest})` in `CalibrationPage.tsx` does three things:
    - calls `useLiveTuning(token)` and `useTuningAdmin(token)`;
    - mounts `<UnsavedChangesGuard dirty={admin.pending.length > 0} message={UNSAVED_TUNING} />` (R2-5a, R-19);
    - renders `CalibrationWorkspace` with `tuning={{live, admin}}`.
  - Once a token is saved, the page renders `<TunedWorkspace key={token} …>`. Otherwise it renders `<CalibrationWorkspace tuning={null} …>`. `CalibrationWorkspace` never mounts the guard, so its stories need no data router.
  - **Saving or forgetting a token remounts the left column.** The page swaps `CalibrationWorkspace` for `TunedWorkspace` (or back), a different element type at the same place, so React remounts the whole workspace. The open pair, the rules table's sort and each chart's Chart | Table view reset. Only the selected rule survives, because it lives in `?rule=`.
  - **Noted limit:** `TunedWorkspace`, keyed by the token, owns the pending edits, so forgetting the token unmounts them with it. A publish checks only each edit's `expected` value against the file (`applyTuningEdits`, `githubClient.ts:40`), never the token, so a replacement token could have published them.
    - R-26's "Forget token", in the aside and the tray, asks first when edits are pending (contract addition 10).
    - The sidebar's "Forget token" still drops them without asking: the sidebar belongs to the shell and can't see them. It is not a navigation, so the guard doesn't see it either, the same as on `/tuning` today.
- **Stale value (R-18).**
  - "Reload tuning.json" runs `live.reload()`. When that resolves with a config, it runs `admin.dropStale(config)`.
  - The aside then says how many edits it dropped, in a `role="status"` line, or that every pending edit still applies.
  - The kept edits pass `applyTuningEdits`' check against the file they were checked against, because `stillApplies` is that same comparison.
- **A shared entry (R-21).** The aside heads a key several rules share (Locations: 9 rules) with the tuning name and "Shared by N rules". It labels the gap with the selected rule's name.
- **Header.**
  - Title "Calibration & tuning". `PageLayout` names the tab "Calibration & tuning · Inkweave admin".
  - Subtitle `calibrationSubtitle(global)` once the analytics settle. Meta "Data as of `<code>…</code>`".
  - `writes`, with `branchLabel="Tuning writes to Doberjohn/inkweave"`, and `flush`. The branch label keeps the repo and says only the tuning half writes.
  - R2-6 changes R1's parity test (`router.test.tsx:94-100`) to `queryByText(/writes to Doberjohn\/inkweave/i)`, and the other R1 tests and stories that assume a read-only `/calibration` or a `/tuning` page (re-base note 9 lists them, with their replacements).

**Charts (R-13, R-23, R-24; checked at pin `bc877e17` and against `scripts/lib/voteAnalytics.mjs`).**
- **Where they sit.** They go in the left column of README section 3, in this order (R2-6 has the layout):
  1. the analytics notice;
  2. the rules table;
  3. **the scope row** (new): `pairsHeading(selected)`, plus "Show all pairs" while a rule is selected. It is the one filter row above everything the rule scopes.
  4. **the charts row** (new): "Engine vs community" (the scatter) beside "Gap distribution" (the histogram). They sit two-up from 712px of column (two 346px tracks and the row's 20px `SPACING.xl` gap) and stack below that.
  5. the pair list and the votes;
  6. **"Weekly gap"** (new), full width;
  7. dimension participation, with the scope line "All votes, whatever the rule". It sits below the scope row, but `global.dimensionFill` can't be scoped by rule, so the panel says it reads every vote (dataviz: a filter scopes what is below it, so anything it doesn't scope says so).

  The aside doesn't change.
- **Without raw votes** (`hasRawVotes: false`), one Notice replaces items 6 and 7 (R2-6): "The weekly gap trend and dimension participation need raw votes. Set the `SUPABASE_SERVICE_ROLE_KEY` Actions secret, then re-run admin's Deploy workflow." It takes over from `RawVotesNotice`, which retires with `CalibrationView` (R2-7).
- **While the vote log loads or after it fails**, item 6 is a Notice instead of the trend: "Loading the vote log…", or "Could not load the vote log: {message}" in the error tone. `WeeklyGapTrend` renders only once the log is in, so a log that hasn't arrived never reads as "No score votes in this scope yet." Item 7 reads the analytics artifact, not the log, so it renders either way. The vote table's `notice` covers the same three states for a pair's votes.
- **What feeds them.**
  - **`pairs[]` is complete.**
    - `buildAnalytics` (`scripts/lib/voteAnalytics.mjs:217-224`) sorts every gap-defined pair by |gap| and truncates nothing.
    - `fetchAllRows` (`scripts/precompute-vote-analytics.mjs:54-64`) pages past PostgREST's 1,000-row cap, so every `pair_scores` row arrives.
    - Two kinds of pair stay out by design:
      - Pairs without a score vote: `computePairRecord` returns null (`:23`).
      - Engine-silent pairs, because they have no engine score (`buildPairRecords`, `:62-72`). The artifact counts them in `global.engineSilentPairs`, and the scatter's footnote gives that count on the all-pairs scope.
    - The only cap is the client's `MAX_PAIRS` (40), and it applies to the pair list alone. The charts read the uncapped scope, `pairsInScope` (R2-1).
    - Each record also carries `accuracySentiment` and `engineSilent` (`:40-42`), which `PairStat` doesn't declare. Nothing here needs them.
  - **Scatter and histogram:** `pairsInScope(analytics.pairs, selected)`.
  - **Weekly trend:** the vote log joined to that same scope (`weeklyGaps`, R2-4b). It doesn't read `global.weekly`, for three reasons:
    - `global.weekly` (`bucketWeekly`, `:143-153`, fed by `accrueVote`, `:128-136`) can't be scoped by rule.
    - Its `votes` also count unscored votes.
    - It leaves quiet weeks out.

    `weeklyGaps` keeps `bucketWeekly`'s definition of a week's gap: each scored vote's `score − engineScore`, all weighted equally. So with no rule selected it reproduces `global.weekly`'s `meanGap`. The trend's second plot counts the score votes behind each mean. `global.weekly` stays the Overview's source.
- **Engine scores are whole numbers, and that drives three decisions.** A pair's engine score is the highest of its connections' scores (`computeAggregateScore`, `SynergyEngine.ts:21-24`). Rules score in tiers, capped at 10. Most pairs have one vote, so most sit on one of about 100 whole-number spots, and most gaps are whole numbers.
  - **Overlap (R-23): opaque dots, a surface ring, a diagonal jitter and a nearest-point layer.**
    - Partial opacity can't show a stack of dozens of dots: it saturates after a few. At any opacity low enough to show stacking, the neutral and red dots also fall below 3:1 against the card. `barNeutral` at 0.85 is 2.66:1, and `over` at 0.7 is 2.96:1. That fails WCAG 1.4.11, the bar R1-2's theme test holds every chart fill to.
    - **Each dot sits on its own opaque disc in the page colour, 2px wider than the dot** (R-23; R2-4a's `Dots`).
      - The disc hides every dot beneath it. So `barNeutral`'s alpha composites over the page alone and lands at `#63637d`, the composite `adminTheme.ts`'s table and `series.ts`'s validator run record. A neutral dot over a red one never reads pink-grey.
      - The disc is also the 2px ring, a hair darker than the card (re-base note 8), which keeps every overlapped edge visible. A centred stroke would cover half the fill and leave r 3 of it, under the r ≥ 4 mark spec.
    - **A fixed jitter along the diagonal**, seeded by the pair so a dot never moves, spreads each stack into a short dash parallel to y = x.
      - A dot slides up to ±0.35 on both axes together and at most ±0.035 across the line (`diagonalJitter`, `SCATTER_JITTER = 0.35`). So y − x, the gap the chart is read for, moves by at most 0.07.
      - A square jitter of ±0.25 on each axis would move y − x by up to ±0.5, the whole agreement band.
    - The widest gaps draw last, on top.
    - The tooltip says how many pairs share the dot's exact scores, and the table view gives exact values.
    - The hit layer is nearest-point: the pointer only has to be closest, within 24px of a dot's centre (a 48px target).
  - **Dot size (R-23): one size for every pair.**
    - Sizing by votes would mostly say "one vote", and the few pairs with more votes would grow over their neighbours.
    - Area also reads poorly and needs a size legend.
    - Votes are in the tooltip and the table. A votes filter is later (R-25).
  - **Histogram bins (R-24): one point wide.**
    - There are eleven bins, centred on −5 … +5, and the end bins hold everything beyond.
    - A gap on a half point counts in the bin further from zero, so the centre bin is exactly the agreement band, |gap| < `CALIBRATION_BAND`. `GAP_BIN_LIMIT` and `gapBinCenter` keep that rule in one place.
    - The real-data check ("Before the PR", after R2-8) confirms ±5.
    - Bars are hover-only. Clicking a bar to filter is later (R-25).
- **Colour (R-15).**
  - **The split.** The scatter and the histogram share one three-way split by side:
    - "Engine higher (gap ≤ −0.5)" in `over`;
    - "Within ±0.5" in `barNeutral`, the neutral centre;
    - "Community higher (gap ≥ +0.5)" in `under`.

    This is the score-band trio R1-2's theme test already measures for 1.4.11 (`chartMarks`, `adminTheme.test.ts:100-110`).
  - **Selection.** The selected dot keeps its fill and gains an `accent` ring, with size as a second cue.
  - **The validator.** This is the `dataviz` skill's `scripts/validate_palette.js`, re-run on 2026-10-05 with the neutral as the scatter composites it (`#63637d`, `barNeutral` over its page-coloured disc), on the card (`#12121a`):
    ```
    node scripts/validate_palette.js "#ef4444,#63637d,#4ade80" --mode dark --surface "#12121a" --pairs all
      [FAIL] Lightness band         outside band: [["#4ade80",0.8]]
      [FAIL] Chroma floor           below floor (reads gray): [["#63637d",0.041]]
      [PASS] CVD separation         worst all-pairs #63637d↔#ef4444 ΔE 10.3 (protan) · tritan 29.5
      [PASS] Normal-vision floor    worst all-pairs #63637d↔#ef4444 ΔE 25.3 (normal)
      [PASS] Contrast vs surface    all 3 >= 3:1
    ```
  - **Why the two fails stay.** Green's lightness is the app's `success` (R-15). The neutral's low chroma is its job: a diverging midpoint has to read as "nothing".
  - **The gold.** Gold against green measures ΔE 7.9 (protan), a WARN. Gold only ever draws the selection ring, never a fill.
  - **Other cues.** Every mark also carries its position, the legend and the table.
  - **Text.** Gap text keeps `gapColor`, as status text. It now mutes any gap that prints "0.00" (R1's final fix wave). Every other chart text uses text tokens.
- **The weekly trend (R-24): two plots, one y axis each.**
  - **The gap plot** is a LineChart with `baseline={0}`, `yDomain={gapDomain(weeks)}` (symmetric, so its ticks are −d / 0 / +d) and the accent line.
  - **The votes plot** sits under it: a short LineChart area of score votes, in `barNeutral`. A LineChart rather than a BarChart, so each week sits at the same x as the line's point.
  - **Both set `fixedGutters`** (contract addition 6). Without it each plot sizes its gutters to its own labels, and "+1.50" is wider than "120".
  - **One frame.** One ChartFrame holds both plots, with one table (week, mean gap, score votes). A caption names each plot: "Mean gap" and "Score votes".
  - **Empty states.** `WeeklyGapTrend` checks for "no score votes in this scope" itself before drawing. LineChart draws axes for an all-null series (R1-3b's deferred item), and a tuning-only row gives `weeklyGaps(votes, [])`, every week null.
  - **No range control.** The trend spans the whole log. The scatter and the histogram are all-time aggregates, so a range could only move the trend (R-9's reasoning for Web analytics).
- **The dataviz checklist, as applied.**
  - **Legends:** the scatter and the histogram each have three series and a `ChartLegend` whose key mirrors the mark: `mark="dot"` on the scatter (contract addition 7), `mark="rect"` on the histogram. Each trend plot has one series, named by its caption.
  - **Direct labels:** only the diagonal's "Engine = community". The histogram's subtitle carries the summary shares (`capLabels="none"`).
  - **Hover:** on by default. The scatter tooltips the nearest dot; the other charts use the kit's per-bar tooltip and crosshair.
  - **Keyboard:**
    - The scatter is one slider. ←/→/Home/End walk the dots left to right, and Enter or Space selects the dot the slider announces. That is the cursor's dot or, after Escape or once the pointer has left, the resting position in `aria-valuenow`.
    - The value text carries what the eye gets: the tooltip's line, "pairs on these scores", and ", selected" on the selected dot.
    - `ChartPlot`'s `adm-chart-plot` focus ring rings it. Focus from the keyboard (`:focus-visible`) shows the resting dot, and focus from a press keeps what the press found.
  - **Table views:** every chart has one, so a tooltip is never the only place a value appears.
  - **Motion:** ScatterChart has none. The LineCharts and the BarChart follow the kit, which switches motion off under reduced motion.
  - **Width:**
    - The charts row is `repeat(auto-fit, minmax(min(100%, 346px), 1fr))`. Each chart sits in an untitled, padded `Panel`: 20px (`SPACING.xl`) a side inside a 1px border (`Panel.tsx:64-66`), 42px in all. So a 346px track leaves a 304px plot until the row stacks.
    - 304px is where `ChartTooltip`'s floor stops overflowing (R1-3b's deferred item): its `maxWidth` is `max(width / 2 − 12, 140)`, and 140 > 304 / 2 − 12 only below 304. The outline's 340px track left a 298px plot, under it. R2-4c's story constant follows this track.
    - Phone widths under that stay as R1 left them.
  - **Scale:** the scatter draws one SVG circle per pair, which is fine at a few thousand pairs. The real-data check gives the real count.

**Decided (2026-10-05).** The outline's twelve open questions are settled in the main plan's "Decisions for R2". All of them follow the recommendations, and R-26 is new.

| Outline question | Decision | Where it lands |
|---|---|---|
| 1. Where `playstyleId` comes from | R-17: the artifact, with the engine as fallback | R2-1 (contract addition 8) |
| 2. What "Reload tuning.json" keeps | R-18: edits that still apply | R2-2, R2-5 |
| 3. Leaving with unsaved edits | R-19: `useBlocker` + `beforeunload`, reusable | R2-5a, R2-6 |
| 4, 5. Direct rules with no copy; the empty case | R-20: no new entries, no read-only fallback | R2-1, R2-3, R2-5, R2-6 |
| 6. The header for a shared entry | R-21: tuning name, "Shared by N rules", gap labelled by rule | R2-5 |
| 7. The Overview's link | R-22: "Tune" or "Inspect" | R2-8 |
| 8, 9. Scatter overlap; a votes filter | R-23: opaque dots, diagonal jitter, one size; R-25: filter later | R2-4a, R2-4b, R2-4c |
| 10, 11. Histogram bins; weekly votes | R-24: whole-point bins to ±5; votes as an area | R2-4b, R2-4c |
| 12. Cross-filtering | R-25: later | none |
| (new) A token GitHub rejects | R-26: "Forget token" in the aside's error, which asks first when edits are pending (re-base note 12) | R2-2, R2-5, R2-6 |

**Deferred from R1, as R2 takes them** (`.superpowers/sdd/R-redesign/progress.md`):
- **Closed in R2:**
  - R1-11: `/calibration` reads `?rule=` but never writes it. R2-6 writes it.
  - R1-11: no assertions for the "+" on a positive mean gap or for the null-gap subtitle. `VerdictHero` retires, so R2-1's `calibrationSubtitle` tests both: "Mean gap +0.83 · runs harsh · 1 vote" and "Mean gap — · not enough data · 0 votes".
  - R1-11: the stale "analytics page" wording and "(R1-5)" in `router.test.tsx` (`:18`, `:213`). R2-6 edits that file anyway.
  - R1-11: `src/ui/Primitives.stories.tsx:196`'s comment still names the deleted `WebAnalyticsView` ("the sample trend WebAnalyticsView's stories used"). R2-7 rewords it with the other stale comments: "A deterministic sawtooth, so every Sparkline story draws the same sample trend."
  - R1-7: the tuning loading `<p>` keeps default margins. It retires with `TuningPage` (R2-7).
  - R1-7: the unneeded `MemoryRouter` wrapper retires from the `TuningPage` tests with them (R2-7). `writePages.test.tsx` keeps its own for Reveal and Image (under "Not taken").
  - R1-7: `router.test.tsx`'s `afterEach` token clear is redundant with its `localStorage.clear()`, and its comment overstates the module state. R2-6 edits that file anyway, so it drops the `renderHook` / `clearToken` lines and says the one `localStorage.clear()` resets both the token and the sidebar (contract addition 4).
  - R1-12 part B: the outline's R2-4a quotes of LineChart are stale. Contract addition 6 is re-quoted from today's files.
- **Resolved before R2:** the owner's saved token was stale (Engine tuning 401, `progress.md:163`). They replaced it on 2026-10-02, and `/tuning` read `tuning.json` again (`progress.md:166`). R-26 covers the next time a token goes stale.
- **Avoided in R2; the kit's default path unchanged.** R2's charts never meet these, but `LineChart` and `ChartTooltip` still behave as R1 left them:
  - R1-3b: tick labels collide on lopsided signed data (−0.05 to 1.2). The trend passes a symmetric `yDomain`. The fitted case stays as it is ("−0.05 / 0.00 / +1.20", checked), and no R2 chart draws it.
  - R1-3b: an all-null series draws axes instead of `emptyText`. `WeeklyGapTrend` checks first and never hands LineChart one.
  - R1-3b: `ChartTooltip`'s 140px floor overflows plots under 304px. The charts row's 346px track keeps each plot at 304px or more until it stacks. Phone widths still overflow.
- **Not taken**, owner's call, outside calibration:
  - Vote activity's focus loss after "Clear filters" and "Show more";
  - the Overview's "→" spoken in "Open calibration →", and its null-gap "The engine not enough data";
  - `WeeklyCard`'s fixed `BAR_Y_AXIS_WIDTH` at 10,000+ votes a week;
  - R1-7: the `MemoryRouter` wrapper in `writePages.test.tsx`, which stays for Reveal and Image.

**Review findings this phase closes:**
- rule-id-mismatch
- tuning-depends-on-analytics
- editor-content-model
- score-stepper
- token-gate-scope (both reviews)
- missing-load-publish-states
- write-result-states
- routes-and-deeplink
- row-keyboard-a11y
- tray-and-notice-polish
- tables-as-div-grids (rules and votes keep `<table>`)

**Task order.** Each task leaves lint, typecheck and tests green.

| Task | Delivers | Decisions | Commit |
|---|---|---|---|
| R2-1 | `calibrationModel.ts` (rows, the tuning-key mapping, pair scope); `playstyleId` in the precompute (`ruleRosterEntry`), `rollUpByRule` and `RuleStat` | R-17, R-20 | two commits: `feat(analytics): write each rule's playstyleId into the vote analytics (#24)`, then `feat(calibration): map analytics rules to tuning.json entries (#24)` |
| R2-2 | `tuningRows.ts`, `tuningFailure.ts`, `src/github/rejectedToken.ts`, `dropStale` and `stillApplies` (false, never a throw, for a path the reloaded config no longer has: one case drops an edit under a removed playstyle key), `reload` resolving with the config, the reworded stale message | R-18, R-26 | `refactor(tuning): export the editor rows, classify failures and keep edits that still apply (#24)` |
| R2-3 | `RulesTable` (its `emptyText` carries R-20's empty states); the pressed `<tr>`'s first-cell bar in `AdminStyles`; the owner's call on red gap text on a selected row: (a) `ADMIN_COLORS.rowSelected`, (b) the text colour, or neither | R-20 | `feat(calibration): add the rules table (#24)`; with (a): `feat(calibration): add the rules table and a selected-row fill that keeps gap text at 4.5:1 (#24)` |
| R2-4 | `PairList`, `VoteDetailTable` and `DimensionParticipation` in the new style | | `feat(calibration): restyle the pair, vote and dimension panels (#24)` |
| R2-4a | `ScatterChart` and `scatter.ts`; `ChartPlot`'s `extend`; LineChart's `yDomain` and `fixedGutters`, `LINE_Y_AXIS_WIDTH`, `LINE_END_WIDTH`; ChartLegend's `'dot'`; three scatter stories in `Charts.stories.tsx` | R-23 | `feat(charts): add the scatter chart (#24)` |
| R2-4b | `chartData.ts` (sides, scatter points, bins, `weeklyGaps`, `gapDomain`) and `chartFixtures.ts`; in `chartData.ts` too, the three chart tables (`scatterTable`, `histogramTable`, `weeklyTable`) and `sharePercent`; `scripts/lib/__tests__/weeklyGapsParity.test.mjs` | R-23, R-24 | `feat(calibration): derive the scatter, histogram and weekly gap data (#24)` |
| R2-4c | `CalibrationScatter`, `GapHistogram`, `WeeklyGapTrend` | R-23, R-24 | `feat(calibration): add the scatter, gap histogram and weekly gap charts (#24)` |
| R2-5 | `TuningAside`; `PendingTray`'s `onReload` and `onForgetToken`; R-26's "Forget token" confirming before it drops pending edits, with the false / true / nothing-pending cases (contract addition 10); `TierRow` restyled; `ForgetTokenOffer` (`src/github/`) and its story; `reloadNote.ts`; "Read tuning.json again" on a failed read; `PendingTray`'s `Publish to {branch}`, with `TuningEditor.test.tsx`'s two lookups renamed; `Sidebar.tsx`'s `TokenBox` comment | R-18, R-20, R-21, R-26 | `feat(calibration): add the tuning aside (#24)` |
| R2-5a | `DialogShell` bridged; `useUnsavedChangesGuard`, `UnsavedChangesGuard` and `UnsavedChangesDialog`, their two tests and a story (new) | R-19 | `feat(shell): ask before leaving a page with unsaved edits (#24)` |
| R2-6 | `CalibrationWorkspace` and `CalibrationPage` (`TunedWorkspace` mounts `UnsavedChangesGuard`); deletes R1's `src/tools/analytics/CalibrationPage.tsx` and `__tests__/CalibrationPage.test.tsx`; `PageLayout`'s `flush` and `PAGE_GUTTER`, and its "Tuning writes to Doberjohn/inkweave" examples (`PageLayout.tsx:64`, `PageLayout.stories.tsx:49`); `calibrationHref`; `nav.ts` (contract addition 13); the `/tuning` redirect; the R1 tests and stories that assumed a read-only `/calibration` or a `/tuning` page, with re-base note 9's replacements: `router.test.tsx` (`:23-33`, `:42-64`, `:72-75`, `:94-106`, `:234-239`, and a new `/tuning` redirect case), `nav.test.ts` (`:18`, `:22`, `:42-46`), `Sidebar.test.tsx` (`:33`, `:54`, `:81`), `Sidebar.stories.tsx` (`:15`, `:38`) and `AdminShell.test.tsx` (`:4`, `:8`, `:13`, `:25`) | R-19, R-20, R-26 | `feat(calibration): merge calibration and tuning at /calibration (#24)` |
| R2-7 | Retires the old views (listed under "Goal"), and fixes what the deletions break: `src/tools/__tests__/writePages.test.tsx` drops its `TuningPage` import (`:7`) and its "Engine tuning" row (`:24`), and its `:28` comment stops naming the tuning page; `src/tools/tuning/index.ts` is deleted. (`AdminShell.test.tsx` already mounts `ImagePage` from R2-6.) Stale comments: `verdict.ts:18-21` drops "(the SlightLean story)" and says the Overview's calibration card and `calibrationSubtitle` read it, in place of `VerdictHero`; `overview/CalibrationCard.tsx:62`'s "(VerdictHero's logic, shared through verdict.ts)" reads "(verdictFor and biasCopy)"; `overview/WeeklyCard.tsx:119` and `RulesTable.tsx`'s doc comment move to the past tense; `src/ui/Primitives.stories.tsx:196` stops naming `WebAnalyticsView`. `CLAUDE.md:15-18` drops "`WeeklyActivityChart` … stays until R2", lists `/calibration` as a writing page with `/tuning` redirected, and names the guard for write pages with unsaved edits. `docs/tuning-editor-design.md:3` says where the editor lives now. `overview/__tests__/CalibrationCard.test.tsx` ports `VerdictHero.test.tsx`'s scale check; `CAP_LABEL_XS` leaves `src/app-bridge.ts` | | `refactor(analytics): retire the old calibration and tuning views (#24)` |
| R2-8 | The Overview's "Tune" or "Inspect" link through `calibrationHref` (new). `RulesToReviewCard.tsx:35`'s last two tracks become `48px 48px`, so "Inspect" fits (contract addition 12). `OverviewView.test.tsx:65-70` expects "Inspect Singer + Songs". `BiasBar`'s `minWidth` (the card passes 0); `PanelLink`'s comments; the `singer-songs` fixture comment | R-22 | `feat(overview): say Inspect for rules with no tuning copy (#24)` |

R2-6 also wires the guard and tests it at page level: leaving `/calibration` with a pending edit asks, and changing `?rule=` doesn't.

**Conventions.**
- **Branch.** Work on `feature/24-redesign-r2`. There is one PR for the phase, and every commit message ends `(#24)`.
- **The plan goes in first.** The branch carries an uncommitted `docs/plans/R-redesign.md` edit (the "Decisions for R2" table). Before R2-1, it is committed with the re-based R2 plan (`docs/plans/R-redesign/R2-calibration-tuning.md`), after the owner approves:
  ```bash
  git add docs/plans/R-redesign.md docs/plans/R-redesign/R2-calibration-tuning.md
  USER_APPROVED=1 git commit -m "docs(plan): settle R2's decisions and re-base its plan (#24)"
  ```
- **Commits.** Every task ends with the commit step, run with the Bash tool (never PowerShell) and only after the owner approves:
  ```bash
  git add <paths>
  USER_APPROVED=1 git commit -m "<message from the table>"
  ```
  - Stage only the task's named paths: never `git add -A` or `git add .`. Never stage `public/admin-data/`.
  - Never pipe a commit.
  - The pre-commit hook runs lint and tests. If Vitest fails to start its workers under load, stop this session's preview servers and retry.
- **Tests.**
  - Run `pnpm vitest run <path>` (scripts too: `pnpm vitest run scripts/lib/__tests__/voteAnalytics.test.mjs`).
  - After a fresh clone or a pin bump, run `pnpm build:engine` first.
  - Every task also runs `pnpm lint` and `pnpm typecheck`.
  - Check a proposed block with `pnpm exec eslint --stdin --stdin-filename src/<path>`.
- **Before the PR.**
  - `pnpm test:run`, `pnpm build` and `pnpm check:deps`.
  - CodeScene's `analyze_change_set` on the branch. It gates the PR, and R1 needed a refactor pass for it: keep functions small and argument lists short.
  - **The real-data check, last**, after R2-8, so it sees the finished page and the Overview's new links. As R1-12 did it, the owner saves the deployment's three `/admin-data/` files into `public/admin-data/` (git-ignored, never committed), and with `pnpm dev` running, look at the items below. The check never publishes: stage edits on a rehearsal branch (`VITE_ADMIN_TARGET_BRANCH`), or clear them (R2-6).
    - **`/calibration`, all pairs and the busiest rule:**
      - the scatter at full density (its pair count, for "Scale"), with stacked spots reading as short dashes along the line and the tooltip's "pairs on these scores" matching the table;
      - the histogram's end bins (whether ±5 holds, R-24; R2-4b's share command below) and its x labels at the two-up width;
      - the trend's span and quiet weeks, the two weekly plots lining up week for week (`fixedGutters`), and no tick or end label wider than `LINE_Y_AXIS_WIDTH` or `LINE_END_WIDTH` (a wider one widens its gutter, and the two plots stop lining up);
      - the tab order through the scatter's slider;
      - `/calibration?rule=lore-loss` opening Lore Loss with the Lore Denial copy in the aside, through the engine fallback (today's artifact has no `playstyleId`);
      - `/tuning` landing on `/calibration`, and the sidebar marking "Calibration & tuning" current (R2-6);
      - with a token saved, the sidebar showing its token box on `/calibration`, and the header reading "Tuning writes to Doberjohn/inkweave `master`" (R2-6);
      - with an edit staged, the sidebar's "Vote activity" link opening "Leave this page?": "Stay on this page" keeps the edit, and a reload gets the browser's own prompt (R2-6);
      - the seam between the columns, side by side and wrapped, and the tray pinned while the left column scrolls (R2-6).
    - **The Overview's "Rules to review":** each link reads "Tune" or "Inspect" as `tuningKeyFor(r, TUNING)` says, "Inspect" stays inside the card's 48px column, and each link opens `/calibration?rule=<ruleId>` with that rule selected (and, with a token, its entry or R-20's "No copy in tuning.json" in the aside).
    - **The histogram's ±5 (R-24: "R2's real-data check confirms ±5"; R2-4b).**
      - With the deployment's artifacts in `public/admin-data/`, run this from the repo root. It prints two shares and never a count:
        ```bash
        node --input-type=module -e "import fs from 'node:fs'; const {pairs} = JSON.parse(fs.readFileSync('public/admin-data/vote-analytics.json', 'utf8')); const share = (keep) => ((100 * pairs.filter(keep).length) / pairs.length).toFixed(1) + '%'; console.log('in the end bins:', share((p) => Math.abs(p.gap) >= 4.5), '| folded in from ±5.5 out:', share((p) => Math.abs(p.gap) >= 5.5));"
        ```
      - R-24 sets no threshold. Propose one to the owner: ±5 holds while the folded-in share is small, about 5% of pairs or less, because then the end bins mostly hold what their labels say. The owner decides; never change `GAP_BIN_LIMIT` without their word.
      - A change is one constant: the bins, labels and ranges follow it. Then update every test that names ±5 or eleven bins:
        - `chartData.test.ts`: `expect(GAP_BIN_LIMIT).toBe(5)` and `gapBinCenter`'s other fold cases; `gapBins`' eleven centres and its `SIX_PAIRS` case's end bins (`[-5, 1, 1]` and `[5, 1, 1]`); the `binLabel` / `binRange` cases; `histogramTable`'s row heads.
        - R2-4c's `CalibrationCharts.test.tsx`: the 11-bar histogram assertions (the eleven x labels from "≤−5" to "≥+5", the end bins' marks `'-5'` and `'5'`, the 11 table row heads, and the labels kept at the two-up width).
- **Stories.**
  - Every new component gets a story on the admin canvas.
  - Stories render under a plain `MemoryRouter` at most, so nothing a story renders may call `useBlocker`.

<!--
Review notes (2026-10-05), as applied. Each was checked against the repo at main @ c92e260 and the pin @ bc877e17.
- Note 1, partly corrected. Against a stand-in for R2-6 in a scratch copy (redirect, writes, the tuning label, a gate in an aside), the unedited tests fail at router.test.tsx :55-59, :61-64 and :94-100 (on /calibration), :108 and :116 (on /tuning); nav.test.ts :18, :22, :42-46; Sidebar.test.tsx :33, :54, :81; and AdminShell.test.tsx. router.test.tsx :42-46, :72-75, :130 and :234-239 still pass, vacuously: the exact "Writes to Doberjohn/inkweave" query never matches "Tuning writes to …", and /tuning redirects. Their replacements are applied anyway, since they would test the wrong thing. With every replacement, the four files pass (41 cases in router.test.tsx) and lint clean.
- Note 4: took 48px for both tracks ('48px 48px'), as the R2-8 draft measures and specifies, rather than max-content.
- Note 5: took the confirm option (contract addition 10, R2-5), flagged for the owner in re-base note 12. The sidebar's Forget token keeps the silent drop as a noted limit.
- Note 6: took both missing items (Primitives.stories.tsx:196 in R2-7, the afterEach clear in R2-6).
- Note 9, partly rejected. The engine part is right, and applied. "On the app side, the only bridged change is FONTS.body" is wrong: the diffstat of 5a54ee90..bc877e17 in upstream/inkweave also changes bridged modules revealSet.ts (through constants/index.ts), rarity.ts, RaritySymbol.tsx, features/cards/loader.ts, CardDataContext.tsx and previewCards.json. Re-base note 1 lists them; R2 uses none of them.
- Note 11, reason corrected. `linear([0, 0], …)` doesn't divide by zero: scale.ts:52 maps a zero-width domain to the middle of the range. The precondition is tightened anyway, because such a domain draws a flat line under one tick, and a domain off zero puts a 0 tick off the plot.
- Outside this file: R2-4c.md:761's story CHARTS_ROW still says 340px; it should follow the 346px track.
-->

## Tasks

Each task lives in its own file beside this one, in order. Every task ends with a commit that leaves lint, typecheck and tests green.

| Task | File | Delivers |
|---|---|---|
| R2-1 | [R2-01-calibration-model.md](R2-01-calibration-model.md) | Calibration model: rule rows, tuning-key mapping (artifact `playstyleId`, R-17), pairs |
| R2-2 | [R2-02-tuning-rows.md](R2-02-tuning-rows.md) | Tuning rows, failure kinds (401 included), `dropStale` (R-18) |
| R2-3 | [R2-03-rules-table.md](R2-03-rules-table.md) | Rules table |
| R2-4 | [R2-04-panels.md](R2-04-panels.md) | Pair, vote and dimension panels in the new style |
| R2-4a | [R2-04a-scatter-chart.md](R2-04a-scatter-chart.md) | The scatter chart in the kit; LineChart `yDomain`/`fixedGutters`; legend `dot` |
| R2-4b | [R2-04b-chart-data.md](R2-04b-chart-data.md) | Calibration chart data |
| R2-4c | [R2-04c-calibration-charts.md](R2-04c-calibration-charts.md) | The three calibration charts |
| R2-5 | [R2-05-tuning-aside.md](R2-05-tuning-aside.md) | Tuning aside (shared-entry header R-21, Forget token on 401 R-26) |
| R2-5a | [R2-05a-unsaved-guard.md](R2-05a-unsaved-guard.md) | Unsaved-changes guard (R-19) |
| R2-6 | [R2-06-merged-page.md](R2-06-merged-page.md) | The merged page, the route and the `/tuning` redirect |
| R2-7 | [R2-07-retire-old-views.md](R2-07-retire-old-views.md) | Retire the old views |
| R2-8 | [R2-08-overview-link.md](R2-08-overview-link.md) | Overview "Tune" / "Inspect" link (R-22) |
