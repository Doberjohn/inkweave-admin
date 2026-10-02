# R: Admin redesign (implementation plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild admin as one dashboard with a collapsible sidebar and a darker, more neutral theme, following the Claude Design handoff. Every existing capability keeps working.

**Architecture:**
- **Theme.** A new admin theme module (`src/theme/`) composes the darker neutral palette from the app's tokens: the neutral ladder is `hexRgba(COLORS.gray400, α)` over `COLORS.background`. `gray400` keeps the handoff's cool cast, while white drifts warm. It maps the handoff's type and radius values onto the app's scales, so admin still passes the app's design-token lint rules in full, with no app change and no new lint exception.
- **Styles and primitives.** A scoped stylesheet (`AdminStyles`), the house pattern from `WebAnalyticsView`, gives hover and focus states. A small set of UI primitives (`src/ui/`) carries the repeated pieces: panels, KPI cards, segmented controls, bars and pills.
- **Shell.** The shell becomes a sidebar layout. Pages render through one `PageLayout` (title, subtitle, meta, the branch notice on pages that write). The analytics artifacts are fetched once per session, through a promise cache.
- **Phasing.** The work ships in four phases, R1 to R4. Each phase leaves admin working and is reviewable on its own.

**Tech stack:** React 19, react-router 7, inline styles plus scoped `<style>` blocks with interpolated tokens, Vitest 5 + Testing Library (jsdom), Storybook 10, the app's tokens and kit through `src/app-bridge.ts`.

**Spec:** `docs/redesign/handoff/README.md` plus the prototype `docs/redesign/handoff/Inkweave Admin.dc.html`. The handoff lives outside git, in the owner's working copy only (`.git/info/exclude`), and is deleted once R4 ships (owner, 2026-10-01). Open the prototype with `support.js` next to it, served over HTTP; it doesn't run from `file://`. The spec's own fixtures are sample data. Where this plan and the spec disagree, **this plan wins**: the "Corrections to the spec" section lists every case, and each comes from the 2026-10-01 review of the handoff against the code.

**Tracking:** Doberjohn/inkweave-admin#24. Branch: `feature/24-admin-redesign`, one PR per phase.

**Status:** R1 built and checked against real data on 2026-10-02; see "R1 as built". R2 to R4 are outlined below and detailed when each starts.

---

## Decisions (owner, 2026-10-01)

| # | Decision | Detail |
|---|---|---|
| R-1 | Admin-local theme file | Colours come from `src/theme/adminTheme.ts`. Text, accent, semantic, ink and tier colours are the app's tokens. The darker neutral ladder (surfaces, borders, dividers, hovers) is `hexRgba(COLORS.gray400, α)` over `COLORS.background`. No app PR, no pin bump, no lint exception. |
| R-2 | Edit card splits preview and released cards | Preview cards (ids in `previewCards.json`): field edits and an image replacement go out in one commit, through a new fail-closed `replaceCardInPreviewJson` that merges the changed fields into the loaded card object and keeps keys the form doesn't hold (`variants`). Released cards: image only, fields read-only, through the image tool's existing `commitCardImage`. Edit card searches every card. Delivers admin#14 item 3 for preview cards (R4). |
| R-3 | No Epic or Iconic in the rarity picker | The engine models them as printings (`VariantRarity`), not base rarities. The picker keeps `RARITIES` as they are today. |
| R-12 | Interactive, hand-built charts | A chart kit (`src/charts/`, Task R1-3b) built in SVG on the admin theme, following the `dataviz` skill: one styled tooltip, a crosshair on line and area charts, keyboard access, a Chart/Table toggle on every chart, legends for two or more series, selective direct labels, thin marks with 2px surface gaps, recessive hairline grids, and transitions that respect reduced motion. No chart library. |
| R-13 | More charts | R2 adds a calibration scatter (engine against community score per pair, with the agreement diagonal), a gap histogram and a weekly gap trend. R3 adds a synergy network diagram for a card. All of them build on the R1 chart kit. |
| R-4 | Branch notice only on pages that write | The header names the target branch on pages that commit to the app (today `/tuning`, `/reveal`, `/image`; `/calibration` from R2, `/studio` from R4). CLAUDE.md's "The shell header always names the branch" changes to match. |

## Decisions made in planning (owner may overrule)

| # | Decision | Why |
|---|---|---|
| R-5 | Type and radius map to the app's scales | The handoff's 26/30/34/48px and radius 10/7/3 sit between the app's steps. Mapping (table below) keeps one scale and costs a few pixels. |
| R-6 | Data text uses `COLORS.textMuted`, never `COLORS.textDim` | `textDim` is 3.4–3.8:1 on these surfaces (fails WCAG 1.4.3 for data). `textDim` stays only for purely decorative text. |
| R-7 | Mono text renders as `<code>` | `fontFamily` literals fail `no-literal-font-family`, and `/fonts/` forwards to the app. `<code>` gets the UA monospace with no font declaration, as the branch name does today. |
| R-8 | Analytics artifacts are fetched once per session | Four insights routes replace one page. `fetchAdminData` caches each file's promise, so moving between pages doesn't refetch 0.5 MB of vote log. |
| R-9 | Charts are windowed | The vote log spans months. Vote activity gets a range control (7 / 30 / 90 days / All, default 30) in its filter row, and the range scopes everything below it: KPIs, chart, log and side panels. Spans over 90 days chart per week, not per day. The Overview's weekly chart shows the last 12 weeks. Day labels always carry the month ("Sep 30"). Web analytics gets no range control: the export fixes one reporting window for both trends and breakdowns, so a control could only move the trend. The window is shown instead. |
| R-14 | Tinos stays on headline numbers | The `dataviz` guidance puts hero and KPI figures in the sans. The owner's design uses Tinos (the brand's display face, the app's "hero numerals" tier), so it stays, with proportional figures. `tabular-nums` is only for columns and axis ticks. |
| R-15 | Brand colours stay in charts | The validator (2026-10-01, dark, on the card surface) passes colour-blind and normal-vision separation for the inks, the score bands and the tiers. Their lightness band, and Steel's and the neutral band's chroma, fail. These are the app's fixed entity colours, and every use carries a second cue (ink icons, labels, the legend, the table view), so they stay. Task R1-3b records the validator output. |
| R-16 | Bar charts print two totals, not every one | Votes per day and the Overview's weekly chart print totals on the newest and the busiest bar only (the kit's `capLabels: 'extremes'`), not the handoff's count over every bar (README §4: total and "N voters"). The `dataviz` rule is to label selectively. Every bar's numbers are in its tooltip, which is also its accessible name, and in the table view. |
| R-10 | Old routes redirect | `/analytics` → `/` in R1; `/tuning` → `/calibration` in R2; `/reveal` and `/image` → `/studio` (with the right mode) in R4. Skills and runbooks are updated in the phase that moves their route. |
| R-11 | `/art/sets/` and `/brand/` stay forwarded after the banner goes | Bridged app components may reference them; a forward costs nothing. |

## Corrections to the spec

Each of these overrides the handoff README. The phase that builds the area applies it.

- **Unscored votes (R1, R3).** Quick votes have `score: null`. They form their own "No score" band (neutral segment, `—` in pills and tiles) and are left out of every average, band and histogram.
- **Vote field values (R3).** `whoCarries` is `'a' | 'b' | 'both' | 'neither'`; difficulty is 1–3, not out of 5.
- **Rules to review / per-card verdicts (R1, R3).** Rank only rules with at least 10 score votes (the table's "low n" threshold).
- **Calibration & tuning (R2).** The selectable rule list is the union of `tuning.json` entries and analytics rules. Analytics rules map to tuning entries through the engine's `playstyleId` (several `location-*` rules share one); direct rules map by id. Without analytics (local dev, a failed Deploy) the list comes from `tuning.json` alone. The editor panel shows the real rows (`TuningEditor.rowsForSelection`: title and tagline, plus shift tiers and ramp rows), seeded from the live `tuning.json`. There is no per-rule "Score 1–10".
- **Card studio validation (R4).** The ready checklist and the Publish button derive from `validateRevealCardForm` and `readyToPublish`, not a separate five-item list. Every validator message shows next to its control. A closed accordion section with an error shows a red dot and the message. Rarity stays optional and clearable. The Ink tick follows the ink-block check, never the Amber default.
- **Write states (R2, R4).** Every page that writes shows busy, success (commit link and the go-live note) and failure states, as the current tools do.
- **Card panel (R4).** The preview keeps the app's `CardTile` render and `CardTranslationPanel` ("See translation") for non-English scans. Uploads keep `useHiddenFileInput` / `useImageUpload` (accept list, byte checks, keyboard access).
- **Icons (R1, R3, R4).** Bridge the app's `InkIcon`, `InkwellIcon` and `RaritySymbol` (plus the Enchanted webp) through `src/app-bridge.ts`. Don't copy the handoff's `assets/icons/` files (in the original download, not in the repo copy) anywhere: they are damaged exports of the app's own icons.
- **Token box (R1).** The sidebar shows the token box on every page that writes when a token is saved. Token state is shared, so "Forget token" anywhere updates every page.
- **Banner removal (R1).** The spec's list misses files; Task R1-1 has the full list.

## Global constraints

- Admin files pass every `inkweave/*` rule in `eslint.config.js`. No new exception. Interpolate tokens inside scoped `<style>` blocks too. The hex and rgba rules scan template strings; the font-size and radius rules don't, so `AdminStyles.test.tsx` holds that line.
- Import app code only through `src/app-bridge.ts`. Never edit `upstream/`.
- No `<button style=…>` (`no-adhoc-buttons`). Buttons are `CtaButton` / `LinkButton` from the kit, or native `<button className="adm-…">` styled by `AdminStyles`. Navigation is react-router `Link` / `NavLink`.
- Every clickable thing is a `button` or a link with an accessible name; selectable rows, cards and bars use `aria-pressed`; current nav items use `aria-current="page"`.
- No `useMemo` / `useCallback` (React Compiler; `eslint.config.js` bans them).
- Copy uses the true minus sign (U+2212) for negative numbers, through `fmtGap` / `fmtInt` / `fmtScore`.
- Commit messages carry `(#24)`, the redesign issue.
- The vote log ships only inside the login-gated deployment. Nothing new logs vote, voter or event counts.
- Commit and push only after the owner approves, with `USER_APPROVED=1` as the first characters of the Bash command. One PR per phase.

### Type and radius mapping (R-5)

| Handoff | Use | Token |
|---|---|---|
| 10px | group labels, tags, axis labels | `FONT_SIZES.xs` |
| 11px | hints, table heads | `FONT_SIZES.sm` |
| 12px | secondary text, pills | `FONT_SIZES.md` |
| 13px | body, nav items | `FONT_SIZES.base` |
| 14–15px | emphasised body | `FONT_SIZES.lg` |
| 16–17px | brand word | `FONT_SIZES.xl` |
| 22–24px | section headlines (Tinos) | `FONT_SIZES.xxxl` |
| 26px / 30px / 34px | page titles, KPI values (Tinos) | `FONT_SIZES.displaySm` (28) |
| 48px | hero number (Tinos) | `FONT_SIZES.displayMd` (38) |
| radius 3 | tags | `RADIUS.xs` |
| radius 5–7 | controls, nav items, marks | `RADIUS.md` |
| radius 8 | small panels, token box | `RADIUS.lg` |
| radius 10 | cards and panels | `RADIUS.card` |
| radius 12–16 | card preview | `RADIUS.xl` |
| 999 | pills | `RADIUS.pill` |

## Roadmap

| Phase | Delivers | Owner sees with real data | Detailed |
|---|---|---|---|
| **R1** | Banner removal; theme, styles and primitives; shared token state; sidebar shell and page layout; artifact cache; **Overview**, **Vote activity**, **Web analytics**; `/calibration` hosting today's calibration view; old write tools inside the new shell | Everything read-only | Below |
| **R2** | Calibration & tuning merged at `/calibration` (rules table, pairs, votes, dimension participation, tuning aside with pending tray and publish states); the calibration scatter, gap histogram and weekly gap trend; `/tuning` redirects | Calibration, tuning edits on a rehearsal branch | Outline below; detailed when R2 starts |
| **R3** | Card analytics at `/cards` (`cardStats.ts` + tests, switch-card combobox, engine view from `fetchCardSynergies`, the synergy network diagram) | Per-card pages | Outline below |
| **R4** | Card studio at `/studio`: New reveal (preview-led layout, validator-driven checklist and errors), Edit card (preview vs released split, `replaceCardInPreviewJson`), image replacement inside Edit; `/reveal` and `/image` redirect; skill and runbook links move | The full redesign | Outline below |

The owner plans further changes after seeing R1 with real data, so R2–R4 are detailed only when each starts.

### Seeing R1 with real data locally

Card lists and art are real already (forwarded to inkweave.ink). The analytics artifacts exist only in the deployment:
1. Sign in to `https://inkweave-admin.vercel.app` in a browser.
2. Open and save `/admin-data/vote-analytics.json`, `/admin-data/vote-log.json` and `/admin-data/vercel-analytics.json` into the local `public/admin-data/` (git-ignored).
3. `pnpm dev` and open `http://localhost:5180`.

Never commit those files. The repo is private now, but the vote log holds raw votes, and it ships only inside the login-gated deployment.

---

## File structure (R1)

| Path | Responsibility |
|---|---|
| `src/theme/adminTheme.ts` | `ADMIN_COLORS`, `ADMIN_TYPE`, `ADMIN_RADIUS`, `ADMIN_LAYOUT`: the admin palette and scales, composed only from bridged tokens |
| `src/theme/AdminStyles.tsx` | `AdminStyles` component: the one scoped stylesheet with every `adm-*` class (hover, focus-visible, selected states) |
| `src/ui/format.ts` | Number, gap and date formatting shared by every page |
| `src/ui/*.tsx` | Primitives: `Panel`, `KpiCard`, `SegmentedControl`, `MeterBar`, `BiasBar`, `ScorePill`, `RawTag`, `Notice`, `Sparkline` |
| `src/charts/*` | The chart kit (R1-3b): scales (`scale.ts`), range math and `RangeControl` (`range.ts`, `RangeControl.tsx`), series helpers and the hatch (`series.ts`, `HatchPattern.tsx`), legend, tooltip, keyboard cursor, frame with table view, `BarChart`, `LineChart`, one story file (`Charts.stories.tsx`). Since R1's final fix wave the two charts share their y axis and plot (`axis.ts`, `ChartSvg.tsx`), take their geometry from pure layouts (`barLayout.ts`, `lineLayout.ts`), and BarChart draws through `BarDrawing.tsx` and `SelectableBars.tsx` |
| `src/github/useGithubToken.ts` | Shared token state (one store for every component), same API as today |
| `src/shell/nav.ts` | The sidebar's items, groups and which routes write (replaces `tools.ts`) |
| `src/shell/Sidebar.tsx` | Sidebar: brand, groups, items, token box, collapse (persisted) |
| `src/shell/PageLayout.tsx` | Page header (title, subtitle, meta, actions, branch notice) and scrolling body |
| `src/shell/BranchNotice.tsx` | "Writes to Doberjohn/inkweave `master`" pill |
| `src/shell/AdminShell.tsx` | Providers, `AdminStyles`, sidebar + outlet |
| `src/router.tsx` | New routes and redirects |
| `src/tools/analytics/adminData.ts` | Adds the per-session promise cache |
| `src/tools/analytics/overview/*` | Overview page, view and `overviewStats.ts` |
| `src/tools/analytics/activity/*` | Vote activity page, view parts and `activityModel.ts` |
| `src/tools/analytics/web/*` | Web analytics page, view parts and `webModel.ts` |
| `src/tools/analytics/CalibrationPage.tsx` | R1 host for today's `CalibrationView` (replaced in R2) |
| `src/tools/analytics/verdict.ts` | The verdict thresholds and words, shared by `VerdictHero` and the Overview (later R2 and R3) |
| `src/shell/WriteToolFrame.tsx` | Interim only: R1-6 creates it to frame the old write pages, and R1-7 deletes it |

Deleted in R1: `src/tools/banner/**`, `scripts/export-banner*.mjs`, `docs/BANNER.md`, `public/art/banner/`, `src/shell/ToolIndex*`, `src/shell/tools.ts`, `src/shell/WriteToolFrame.tsx`, and the top-level `src/tools/analytics/{AnalyticsPage,AdminAnalyticsDashboard,ActivityView,DayGroup,WebAnalyticsView}*` files (not the new `activity/` folder) with their stories and tests. `Scorecard`, `WeeklyActivityChart` and `VerdictHero` stay until R2 (`CalibrationView` uses them).

## Shared interfaces (R1)

Every task builds against these names and types. A task may add to them; it may not rename them.

```ts
// src/theme/adminTheme.ts
export const ADMIN_COLORS: {
  page: string; sidebar: string; panel: string; card: string; aside: string;
  rowHover: string; navHover: string; divider: string; border: string;
  inputBorder: string; strongBorder: string; barTrack: string; barNeutral: string;
  text: string; muted: string; dim: string;
  accent: string; accentHover: string; accentTint: string; accentTintSoft: string;
  accentBorder: string; accentStrong: string;
  over: string; under: string; errorBg: string; errorBorder: string;
};
export const ADMIN_TYPE: {
  micro: number; label: number; small: number; body: number; emphasis: number;
  brand: number; sectionTitle: number; pageTitle: number; kpi: number; hero: number;
};
export const ADMIN_RADIUS: {tag: number; control: number; box: number; panel: number; preview: number; pill: number};
export const ADMIN_LAYOUT: {sidebarOpen: 240; sidebarCollapsed: 64; headerMinHeight: 64};

// src/theme/AdminStyles.tsx — class names (the interactive ones with :hover and :focus-visible;
// adm-nav-mark follows its item, adm-seg is the track, adm-hover-row uses :hover/:focus-within)
// adm-nav-item ([aria-current="page"] = active), adm-nav-mark,
// adm-seg (group) / adm-seg-btn ([aria-pressed="true"]),
// adm-row-btn (selectable list/table row, [aria-pressed="true"]),
// adm-card-btn (selectable card, [aria-pressed="true"]),
// adm-input, adm-select, adm-hover-row (non-interactive row hover)
// chart kit (R1-3b adds): adm-chart-plot (a slider plot), adm-chart-hit (a selectable bar's column button,
// [aria-pressed="true"], never dimmed), adm-chart-mark ([data-active="true"], [data-dim="true"]), adm-chart-bar,
// adm-chart-line, adm-chart-area, adm-chart-label, adm-chart-cursor, adm-chart-tip; keyframes adm-chart-rise,
// adm-chart-draw, adm-chart-fade; reduced motion switches all of it off
export function AdminStyles(): JSX.Element;

// src/ui/format.ts
export function fmtInt(n: number): string;                 // 2054 -> "2,054"
export function fmtGap(gap: number | null): string;         // -0.3 -> "−0.30", 0.83 -> "+0.83", null -> "—"
export function fmtScore(n: number | null, digits?: number): string; // null -> "—"
export function fmtDay(day: string): string;                // "2026-09-30" -> "Sep 30"
export function fmtWeekday(day: string): string;            // "2026-09-30" -> "Wed Sep 30"

// src/ui primitives
export function Panel(props: {title?: string; action?: React.ReactNode; children: React.ReactNode; padded?: boolean}): JSX.Element;
export function KpiCard(props: {label: string; value: React.ReactNode; hint?: React.ReactNode; tag?: React.ReactNode; valueColor?: string}): JSX.Element;
export function SegmentedControl<T extends string>(props: {options: ReadonlyArray<{value: T; label: string}>; value: T; onChange: (v: T) => void; ariaLabel: string}): JSX.Element;
export function MeterBar(props: {fraction: number; color: string; height?: number; label?: string}): JSX.Element;
export function BiasBar(props: {gap: number | null; scale?: number}): JSX.Element;   // diverging, full scale ±scale (default 2.5)
export function ScorePill(props: {score: number | null}): JSX.Element;               // ≥7 under colour, ≤4 over colour, null "—"
export function RawTag(): JSX.Element;
export function Notice(props: {tone?: 'info' | 'error'; children: React.ReactNode}): JSX.Element;
export function Sparkline(props: {data: number[]; color?: string; height?: number}): JSX.Element | null;

// src/github/useGithubToken.ts (same API, shared state)
export interface UseGithubToken {token: string | null; setToken: (t: string) => void; clearToken: () => void}
export function useGithubToken(): UseGithubToken;

// src/shell/nav.ts
export type NavGroup = 'main' | 'insights' | 'publish';
export interface NavItem {id: string; label: string; mark: string; path: string; group: NavGroup; writes: boolean}
export const NAV_ITEMS: readonly NavItem[];
export function navItemFor(pathname: string): NavItem | undefined;
export function isWritePath(pathname: string): boolean;

// src/shell/PageLayout.tsx
export function PageLayout(props: {
  title: string; subtitle?: React.ReactNode; meta?: React.ReactNode; actions?: React.ReactNode;
  writes?: boolean; branchLabel?: string; children: React.ReactNode;
}): JSX.Element;

// src/tools/analytics/adminData.ts
export function fetchAdminData<T>(file: string): Promise<T>;   // now cached per file for the session
export function cachedAdminData<T>(file: string): T | undefined; // the parsed artifact once its fetch this session succeeded
export function resetAdminDataCache(): void;                    // tests only: src/test/setup.ts calls it before every test; tests need no reset of their own

// src/tools/analytics/overview/overviewStats.ts
export function trackedEventsTotal(v: VercelAnalytics | null): {total: number; eventTypes: number} | null;
export function rulesToReview(rules: RuleStat[], opts?: {limit?: number; minVotes?: number}): RuleStat[];
export function latestVotes(votes: VoteLogRow[], n: number): VoteLogRow[];
export function recentWeeks(weekly: WeeklyPoint[], n: number): WeeklyPoint[];

// src/tools/analytics/activity/activityModel.ts
export type ScoreBand = 'high' | 'mid' | 'low' | 'unscored';
export type BandFilter = 'all' | ScoreBand;
export interface ActivityFilters {q: string; voter: number | null; band: BandFilter; day: string | null; range: RangePreset} // range default '30d' (R-9)
export function votesInRange(votes: VoteLogRow[], startDay: string, endDay: string): VoteLogRow[];
export function weeklyStacks(votes: VoteLogRow[], startDay: string, endDay: string): DayStack[]; // `day` = the week's UTC Monday; quiet weeks included
export interface DayStack {day: string; high: number; mid: number; low: number; unscored: number; total: number; voters: number}
export function scoreBandOf(score: number | null): ScoreBand;
export function filterVotes(votes: VoteLogRow[], f: ActivityFilters): VoteLogRow[];
export function dailyStacks(votes: VoteLogRow[], days: number, endDay?: string): DayStack[]; // last `days` days ending at endDay (default: the newest vote's UTC day), zero days included
export function activityKpis(votes: VoteLogRow[]): {votes: number; activeVoters: number; avgScore: number | null; busiestDay: {day: string; count: number} | null};
export function topVoters(votes: VoteLogRow[], n: number): Array<{voter: number; count: number}>;
export function topPairs(votes: VoteLogRow[], n: number): Array<{a: string; b: string; aName: string; bName: string; count: number; avgScore: number | null}>;

// src/tools/analytics/web/webModel.ts
export function sortEventsByTotal(events: VercelEvent[]): VercelEvent[];
export function trendSummary(trend: TrendPoint[]): {inWindow: number; dailyAverage: number; peak: TrendPoint | null};
```

### Chart kit (R1-3b)

Every chart in R1 to R4 builds on these. Marks follow the `dataviz` mark specs:
- bars at most 24px thick, with a 4px rounded data end (`RADIUS.sm`) and a square baseline;
- 2px lines, markers of r ≥ 4 with a 2px surface ring, and area fills at about 10% opacity;
- a 2px surface gap between touching fills;
- solid 1px gridlines one step off the surface.

Text never wears the series colour. Semantic gap colours (`gapColor`) stay, as status text.

```ts
// src/charts/scale.ts
export function niceCeiling(max: number): number;                  // clean axis top: 37 -> 40, 402 -> 500, 0 -> 1
export function axisTicks(ceiling: number, count?: number): number[]; // evenly spaced from 0 to ceiling (default 3 ticks)
export function linear(domain: [number, number], range: [number, number]): (v: number) => number;
export function nearestIndex(xs: readonly number[], x: number): number;
export function eachDay(start: string, end: string): string[];     // inclusive UTC 'YYYY-MM-DD' days
export function weekStart(day: string): string;                    // the UTC Monday of that day

// src/charts/range.ts
export type RangePreset = '7d' | '30d' | '90d' | 'all';
export const RANGE_OPTIONS: ReadonlyArray<{value: RangePreset; label: string}>; // '7 days', '30 days', '90 days', 'All'
export function rangeStartDay(preset: RangePreset, endDay: string, firstDay: string): string; // never before firstDay
export function bucketFor(startDay: string, endDay: string): 'day' | 'week';                  // 'week' when the span is over 90 days
export function RangeControl(props: {value: RangePreset; onChange: (v: RangePreset) => void}): JSX.Element; // a SegmentedControl named "Range"; lives in RangeControl.tsx, re-exported here (import it from charts/range)

// src/charts/series.ts
export interface SeriesDef {id: string; label: string; color: string; pattern?: 'hatch'} // hatch: 45° stripes for "No score"

// src/charts/ChartLegend.tsx
export function ChartLegend(props: {series: readonly SeriesDef[]; mark: 'rect' | 'line'}): JSX.Element; // rendered only for 2+ series

// src/charts/ChartTooltip.tsx
export interface TooltipRow {label: string; value: string; color?: string}  // value leads, label follows; a line key in `color`
export interface TooltipContent {title: string; rows: TooltipRow[]}
export function ChartTooltip(props: {content: TooltipContent | null; x: number; y: number; bounds: {width: number; height: number}}): JSX.Element | null;
// Visual only (aria-hidden): every mark or cursor position also carries the same text as its accessible name.

// src/charts/useChartCursor.ts — keyboard and pointer cursor over n positions
export interface ChartCursor {
  index: number | null;                  // what the tooltip shows; null when empty or after Escape
  setIndex: (i: number | null) => void;
  // spread onto the plot: role="slider", tabIndex 0, aria-valuemin/max/now/text, ←/→/Home/End/Escape, pointer move/down/leave
  plotProps: (valueText: (i: number) => string, xs: readonly number[]) => React.HTMLAttributes<HTMLElement>;
}
export function useChartCursor(n: number): ChartCursor;
// Focus shows the newest (or tapped) position. Escape hides the tooltip and keeps aria-valuenow/-valuetext.
// Blur and a mouse or pen leaving the plot clear it; a touch leave keeps the tapped position.

// src/charts/ChartFrame.tsx — <figure> with title, optional subtitle/legend/actions, and a Chart | Table toggle.
// It draws no surface: a page puts it in an untitled Panel (R1-3). Its <figcaption> is the header row.
export interface ChartTable {caption: string; columns: readonly string[]; rows: ReadonlyArray<readonly string[]>}
export type ChartView = 'chart' | 'table';
export function ChartFrame(props: {
  title: string; subtitle?: React.ReactNode; legend?: React.ReactNode; actions?: React.ReactNode;
  table: ChartTable; children: React.ReactNode;
  titleLevel?: 2 | 3;                                    // default 2; 3 inside a titled section
  defaultView?: ChartView;                               // default 'chart'
  view?: ChartView; onViewChange?: (view: ChartView) => void; // controlled view; a switch to the table focuses it when focus fell to <body>
}): JSX.Element;

// src/charts/BarChart.tsx — vertical columns, single or stacked series
export interface BarDatum {key: string; label: string; values: Record<string, number>}
export function BarChart(props: {
  data: readonly BarDatum[]; series: readonly SeriesDef[]; ariaLabel: string; height?: number;
  valueFormat?: (n: number) => string;
  tooltip: (d: BarDatum) => TooltipContent;
  capLabels?: 'none' | 'extremes' | 'all';   // default 'extremes': the last bar and the highest bar print their totals
  xLabelEvery?: number;                       // a floor: every nth x label counting back from the newest, thinned further until labels fit
  emphasisKey?: string;                       // single series: this bar in the accent, the rest neutral
  subLabel?: (d: BarDatum) => {text: string; color?: string} | null; // a second line under a printed x label (the Overview's weekly gap)
  selectedKey?: string | null; onSelect?: (key: string | null) => void; // with onSelect, bars are buttons (aria-pressed, roving ←/→)
  emptyText?: string;                         // shown in place of the plot for no data (default "No data to chart.")
}): JSX.Element;
export const BAR_Y_AXIS_WIDTH: number;        // 40px y-axis gutter; with the 8px right pad, n bars share (width − 48) / n each
// Without onSelect the plot uses useChartCursor (role="slider") so keyboard readers get the same tooltip.

// src/charts/LineChart.tsx — one or more series over the same x (dates), optional area wash, crosshair
export interface LinePoint {x: string; y: number | null} // null keeps the x on the axis and breaks the line
export interface LineSeries extends SeriesDef {points: readonly LinePoint[]}
export function LineChart(props: {
  series: readonly LineSeries[]; ariaLabel: string; height?: number; area?: boolean;
  yFormat?: (n: number) => string; xFormat?: (x: string) => string;
  xTicks?: readonly string[];               // default: first, quarter points, last
  baseline?: number; baselineLabel?: string;  // a labelled hairline (R2: zero gap); label default yFormat(baseline)
  emptyText?: string;                         // shown in place of the plot when no series has a point
}): JSX.Element;
// One y axis, always. Two measures of different scale are two charts.
```

### Contract additions from the task drafts

These came out of drafting and reconciling the R1 tasks. They add names and rename nothing.

```ts
// src/charts/* (R1-3b), beyond the "Chart kit (R1-3b)" block
// scale.ts: isDay(day): boolean; dayIndex(day): number | null; addDays(day, n): string; daySpan(start, end): number;
//           textWidth(text, fontSize): number   // 0.6em a character, so labels are laid out before they are placed
// range.ts: DAILY_BUCKET_LIMIT = 90
// series.ts: CHART_FALLBACK_WIDTH = 640; SURFACE_GAP (SPACING.xxs); HATCH; chartDomId(reactId); hatchId(chartId, series);
//            seriesPaint(series, chartId); tooltipText(content)   // "Sep 30: 12 votes, 4 voters": a bar's name and the slider's value text
// HatchPattern.tsx: HatchPattern({id, color}), the 45° <pattern> the legend swatch and the bars share
// ChartLegend returns null for fewer than two series
// BarChart and LineChart measure their wrapper with the bridged useContainerWidth and lay out at 640px until it reports (always, in jsdom)
// R1's final fix wave (no rename; BarChart and LineChart re-export what moved):
// scale.ts: type Day = string ('YYYY-MM-DD'; a name only), taken by the day functions
// axis.ts: LABEL_SIZE, TICK_GAP, AxisTick, YAxis, px(n), labelWidth(text), labelX(center, width, chartWidth),
//          wholeTicks(top, integers), yAxis(values, format, y)   // the y axis both charts share
// ChartSvg.tsx: ChartSvg({width, height}), AxisGrid({ticks, left, right}), EmptyChart({text?}),
//               ChartPlot({ariaLabel, cursor, valueText, xs, height})   // the slider plot both charts render
// series.ts: chartWidth(measured)   // the measured width, or CHART_FALLBACK_WIDTH until there is one
// barLayout.ts: barLayout(width, data, series, opts): BarLayout; barLayoutOptions(sizing) (BarChart's defaults);
//               BarDatum, BarSizing, CapLabels and BAR_Y_AXIS_WIDTH live here
// BarChart's parts: BarDrawing.tsx (the drawing and tooltip), SelectableBars.tsx (the bar buttons),
//               useBarFocus.ts (their roving focus), barPaint.ts (paint, roundedTop, data flags)
// lineLayout.ts: lineLayout(width, series, opts): LineLayout; lonePoints(row); tooltipY(layout, index); LinePoint, LineSeries
// R1-2's theme test gains 'Emphasis bar (accent)' at the start of chartMarks

// src/github/GithubTokenGate.tsx (R1-7)
export function GithubTokenGate(props: {onSave: (token: string) => void}): JSX.Element; // h2 "GitHub token"; the page's PageLayout gives the h1
// RevealAdminController and ImageAdminController no longer have clearToken (R1-7)

// src/shell/Sidebar.tsx, BranchNotice.tsx, WriteToolFrame.tsx (R1-6)
export const SIDEBAR_OPEN_KEY = 'inkweave-admin.sidebar-open';
export function Sidebar(props: {tokenSaved: boolean; onForgetToken: () => void}): JSX.Element;
export function BranchNotice(props: {label?: string}): JSX.Element; // default 'Writes to Doberjohn/inkweave'; branch in its own <code>
export function WriteToolFrame(props: {children: React.ReactNode}): JSX.Element; // interim: deleted in R1-7
// PageLayout renders the page's only <main> and only <h1>; its body is a one-column grid with a gap

// src/shell/nav.ts: NAV_ITEMS at the end of R1, in order
// {id:'overview', label:'Overview', mark:'Ov', path:'/', group:'main', writes:false}
// {id:'calibration', label:'Calibration & tuning', mark:'Ca', path:'/calibration', group:'insights', writes:false}
// {id:'activity', label:'Vote activity', mark:'Ac', path:'/activity', group:'insights', writes:false}
// {id:'web', label:'Web analytics', mark:'Wa', path:'/web', group:'insights', writes:false}
// {id:'tuning', label:'Engine tuning', mark:'Tu', path:'/tuning', group:'publish', writes:true}
// {id:'reveal', label:'Reveal publisher', mark:'Re', path:'/reveal', group:'publish', writes:true}
// {id:'image', label:'Card images', mark:'Im', path:'/image', group:'publish', writes:true}
// URL contract: /calibration?rule=<RuleStat.ruleId> (R1-8 writes it, R1-11 reads it)

// src/tools/analytics/verdict.ts (R1-8)
export const CALIBRATION_BAND = 0.5;
export const SCALE_CLAMP = 1.5;
export interface Verdict {word: string; wordColor: string; numberColor: string}
export function verdictFor(meanGap: number | null): Verdict;
export function scalePercent(meanGap: number | null): number | null;

// src/tools/analytics/overview/* (R1-8)
export const MIN_RULE_VOTES = 10;
export function recentWeeks(weekly: WeeklyPoint[], n: number): WeeklyPoint[]; // last n calendar weeks; quiet weeks filled {votes: 0, meanGap: null}
export const WEEKS_SHOWN = 12;                                                  // R-9's window: the table holds all of it, the chart its newest weeksThatFit
export function weeksThatFit(width: number): number;                            // how many 44px week slots fit a plot this wide (the frame less BAR_Y_AXIS_WIDTH and the 8px right pad); 12 when unmeasured
export interface OverviewViewProps {
  analytics: VoteAnalytics | null; analyticsState: {loading: boolean; error: Error | null};
  voteLog: VoteLog | null; voteLogError?: Error | null;
  vercel: VercelAnalytics | null; vercelError: Error | null;
}
export function OverviewView(props: OverviewViewProps): JSX.Element;
export function OverviewPage(): JSX.Element;

// src/tools/analytics/activity/* (R1-9)
export interface LogDay {day: string; count: number; voters: number; rows: VoteLogRow[]}
export const NO_FILTERS: ActivityFilters;
export const SCORE_BANDS: readonly ScoreBand[];             // ['high','mid','low','unscored']
export const BAND_LABELS: Record<ScoreBand, string>;         // '7+', '5–6', '≤4', 'No score'
export function hasActiveFilters(f: ActivityFilters): boolean;
export function countOf(n: number, noun: string): string;
export function carriesLabel(vote: VoteLogRow): string;
export function logPage(votes: VoteLogRow[], limit: number): {days: LogDay[]; hidden: number};
export const LOG_PAGE_SIZE = 25;                             // VoteLogTable.tsx
export type ChartBucket = 'day' | 'week';
export function activityWindow(votes: VoteLogRow[], range: RangePreset): {startDay: string; endDay: string} | null;
export function chartStacks(votes: VoteLogRow[], startDay: string, endDay: string): {bucket: ChartBucket; stacks: DayStack[]};
export function votesInBucket(votes: VoteLogRow[], key: string, bucket: ChartBucket): VoteLogRow[];
// NO_FILTERS.range is '30d'; filterVotes and hasActiveFilters ignore range
// activity/activityChart.ts: BAND_SERIES, chartTitle(bucket), bucketTitle(key, bucket, startDay?, endDay?), chartSubtitle(bucket, startDay, endDay),
//   barData(stacks), tooltipFor(stacks, bucket, startDay, endDay), chartTable(stacks, bucket, startDay, endDay), labelEvery(bars)
// VoteLogTable takes pickedLabel: string | null and picker?: React.ReactNode (the "Pick a day" / "Pick a week" select, the 2.5.8 equivalent)
export function ActivityView(props: {voteLog: VoteLog | null; error?: Error | null}): JSX.Element;
export function ActivityPage(): JSX.Element;

// src/tools/analytics/web/* (R1-10)
export const OTHERS_VALUE = 'Others';
export function fillTrendDays(trend: TrendPoint[], reportingWindow: ReportingWindow | null): TrendPoint[]; // every day of the window, idle days as 0
export interface BreakdownShare {row: BreakdownRow; pct: number; fraction: number; others: boolean}
export function breakdownShares(rows: BreakdownRow[]): BreakdownShare[];
export function WebAnalyticsBody(props: {analytics: VercelAnalytics | null; error?: Error | null}): JSX.Element;
export function WebAnalyticsPage(): JSX.Element;

// src/app-bridge.ts: R1-1 removes usePrecomputedSynergies; R1-10 adds
// InkIcon, RaritySymbol, rarityConfigOf, enchantedSymbol, epicSymbol, iconicSymbol (the webps imported with ?no-inline)

// src/tools/analytics/CalibrationView.tsx, CalibrationPage.tsx (R1-11)
// CalibrationViewProps gains: initialRuleId?: string | null  (an id the analytics don't have opens on "All pairs")
export function CalibrationPage(): JSX.Element;
```

## Review focus

The inputs most likely to bite someone using R1, which the spec never mentions. Each has a test in the task that owns the code.

1. **Weekly chart at real widths (R1-8).** jsdom renders at width 0, so the "fewer weeks on a narrow card" path never runs in a page test. `weeksThatFit` is exported and tested across widths.
2. **Vercel trends with missing days (R1-10).** If the API leaves out zero-count days, index-spaced charts compress time and the daily average comes out too high. The trend is filled to every day of the reporting window before charting and averaging, with a test for a gap.
3. **The real `ts` shape (R1-8, R1-9).** The log's `ts` is Supabase's `created_at` (`2026-09-30T14:20:00.123456+00:00`), not the `…Z` the fixtures use. Day bucketing, the "Time (UTC)" column and the newest-first sorts each get a fixture row in that format.
4. **Viewport and saved preference (R1-6).** The small-screen "start collapsed" default is read once at mount, and a saved preference wins over it. Both are documented and tested.
5. **Chart mark contrast (R1-2).** Band fills and neutral bars sit on a translucent card over the page. The theme test checks every chart fill reaches 3:1 (WCAG 1.4.11) against that composite.

---

## Phase R1: shell and insights (detailed)

Each task lives in its own file under [R-redesign/](R-redesign/), in order. Every task ends with a commit that leaves lint, typecheck and tests green. Each file starts with any contract additions it relies on; those are also collected above.

| Task | File | Delivers |
|---|---|---|
| R1-1 | [R1-01-banner-removal.md](R-redesign/R1-01-banner-removal.md) | The phase branch; the Banner generator gone in full (tests, playwright, docs, lint exception) |
| R1-2 | [R1-02-theme.md](R-redesign/R1-02-theme.md) | `adminTheme.ts`, `AdminStyles`, contrast tests, stories on the admin canvas |
| R1-3 | [R1-03-primitives.md](R-redesign/R1-03-primitives.md) | `format.ts` and the UI primitives with tests and stories |
| R1-3b | [R1-03b-chart-kit.md](R-redesign/R1-03b-chart-kit.md) | The chart kit: scales, frame with table view, legend, tooltip, keyboard cursor, bar and line/area charts, range control |
| R1-4 | [R1-04-token-state.md](R-redesign/R1-04-token-state.md) | One shared GitHub token store |
| R1-5 | [R1-05-artifact-cache.md](R-redesign/R1-05-artifact-cache.md) | Per-session artifact cache |
| R1-6 | [R1-06-shell.md](R-redesign/R1-06-shell.md) | Sidebar, `PageLayout`, `BranchNotice`, routes (interim) |
| R1-7 | [R1-07-write-tools.md](R-redesign/R1-07-write-tools.md) | Reveal, image and tuning pages inside `PageLayout`; the sidebar owns Forget token |
| R1-8 | [R1-08-overview.md](R-redesign/R1-08-overview.md) | Overview at `/`, `verdict.ts` |
| R1-9 | [R1-09-vote-activity.md](R-redesign/R1-09-vote-activity.md) | Vote activity at `/activity` |
| R1-10 | [R1-10-web-analytics.md](R-redesign/R1-10-web-analytics.md) | Web analytics at `/web`, bridged ink and rarity icons |
| R1-11 | [R1-11-calibration-host.md](R-redesign/R1-11-calibration-host.md) | `/calibration` (today's view, `?rule=`), `/analytics` retired |
| R1-12 | [R1-12-docs-and-check.md](R-redesign/R1-12-docs-and-check.md) | CLAUDE.md and PLAN.md, stories sweep, real-data check, gates, PR |

### R1 as built (2026-10-02)

- **Checked with real data** (Task R1-12): the Overview matches the numbers computed from the data files (the deployed `/analytics` page is behind the login, so it could not be compared), every chart shows its tooltip on hover and from the keyboard and switches to a table of its values, Vote activity draws 30 days with month labels and redraws for 7 and 90 days and All (weekly bars past 90 days), with day selection, Web analytics shows the events by total with ink and rarity icons and a crosshair on the trend, Calibration renders, the write pages show the branch notice and the token gate (the token box is covered by unit tests only, until the owner saves a token), the sidebar's state survives a reload, `/analytics` lands on the Overview, and each analytics file is fetched once per session. The files were exported at 18:53 UTC on 2026-10-01, so the newest day in each daily chart is partial.
- **Pending with the owner:** the token-saved checks on the write pages (the sidebar's token box, and "Forget token" acting on every page at once), which only the owner can run because only the owner enters a token.
- **Bridge:** the re-exports R1 left unused (`CAP_LABEL`, `SURFACE_CARD` and `TabList`, Task R1-12 Steps 6 and 7) were dropped from `src/app-bridge.ts` (owner, 2026-10-02).
- **Departures from the task text:** none.

---

## Phase R2: Calibration & tuning (outline)

[R-redesign/R2-calibration-tuning.md](R-redesign/R2-calibration-tuning.md). Detailed when R2 starts, after the owner has seen R1.

## Phase R3: Card analytics (outline)

[R-redesign/R3-card-analytics.md](R-redesign/R3-card-analytics.md). Detailed when R3 starts.

## Phase R4: Card studio (outline)

[R-redesign/R4-card-studio.md](R-redesign/R4-card-studio.md). Detailed when R4 starts.
