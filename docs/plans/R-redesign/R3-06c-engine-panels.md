> Part of [R: Admin redesign](../R-redesign.md), phase R3 ([R3-card-analytics.md](R3-card-analytics.md)). Read the main plan's decisions (R-28 to R-56 for R3), corrections, global constraints and shared interfaces, then the R3 header, first.

> **Re-base notes (R3-6c, 2026-10-06).** Re-based from the engine third of the outline's "Task R3-6: Card analytics view" (`R3-card-analytics.md:2145-2715`, written 2026-10-01 against the planned R1 code). This version is written against main @ `aea40b4` (R1 and R2 as built, PR #28 included), pin `upstream/inkweave` @ `bc877e1`, the R3 header, the audit (`audit-R3-6.json`), and decisions R-37 to R-39 and R-41 to R-48. The audit split R3-6 into 6a, 6b and 6c; this task builds the Engine view panel and the network panel under it. What changed and why:
> 1. **Where the network sits (R-39).**
>    - It leaves the Engine view panel for its own untitled `Panel`, full width, directly under it. The Engine view keeps the partner count, the cap caption, the tier split and the source caption.
>    - Its `ChartFrame` keeps the default `h2`, as every R1 and R2 chart does. The outline's `titleLevel={3}` goes (the header: "No frame takes `titleLevel={3}`").
>    - The network panel renders only once the engine pairs the card with anyone. Loading, a failed read and "no synergies" show in the Engine view alone.
> 2. **One component became eight (Code Health).**
>    - The outline's `EngineViewPanel` was one function with about 9 decision points (audit), over the gate's 8. It also built the partner list twice: `enginePartners(data)`, and again inside `engineSummary(data)`.
>    - Now the export `EnginePanels` composes `EngineViewPanel`, `EngineBody` (one `switch` over four states), `EngineNumbers`, `PartnerCount`, `EngineFailed`, `SourceCaption` and `NetworkPanel`. The most complex is `EngineBody`, at cyclomatic complexity 5.
>    - The pure `engineState` builds the partners once per render through R3-4's API: `enginePartners(data, nameOf)`, then `engineSummary(partners, groups)` and `tieAtCut(partners, NETWORK_MAX_NODES)`.
> 3. **Its own helper module, `engineCharts.ts`.**
>    - The outline put the network helpers in `cardCharts.ts`, beside the histogram's. R3-6b put its helpers in a sibling, `voteCharts.ts`, so this task's go in another sibling. Neither task edits the other's file, and neither carries the other's primitive arguments.
>    - Every helper takes objects. The module's named functions have 19 parameters, and one of them is a bare `number` (`engineScoreText(score)`): about 5%, against the gate's 30%. The outline's `cardCharts.ts` sat at 36%, and PR #28 failed at 33.3%.
>    - Header contract 14's example, `networkSubtitle({summary, cut})`, becomes `networkSubtitle(model)`, which takes the whole `EngineModel`: the spokes clause reads the drawn partners' scores (note 4).
> 4. **The tie at the cut (R-37).** `networkSubtitle` reads R3-4's `tieAtCut`. It has three cases:
>    - **The cut falls between two scores:** "The 12 strongest of 142 partners, ranked clockwise from 12 o'clock, the first 6 on the inner ring. Thicker spokes score higher."
>    - **The cut falls inside a lower tie** (`ENGINE_FIFTEEN`): the same, plus "7 of the 8 partners at score 7 make the cut, by name."
>    - **Every drawn partner is in the tie** (`ENGINE_CAPPED`, and the usual real case, since the 12th partner shares its score with a median of 27 others): "12 of the 30 partners at score 8, by name, of at least 142 in all, ranked clockwise from 12 o'clock, the first 6 on the inner ring." This drops "strongest" (R3-4's hand-off).
>    - **"Thicker spokes score higher"** is left out whenever every drawn spoke has the same score, because widths then say nothing: the all-tied cut above, one partner ("Every partner, ranked clockwise from 12 o'clock."), and up to 12 partners all at one score. `spokesClause` compares the first and the last drawn partner's score, so it covers all three with one rule.
>    - The rings clause names its count ("the first 6 on the inner ring", from R3-4b's `ringSizes`). The outline's "the stronger half" is untrue when a tie spans both rings.
> 5. **The nodes (R-38, R-41).**
>    - **No `center` prop**, because the hub has no name (R-38).
>    - **No `ariaLabel` per node and no `partnerSentence`.** Each link's accessible name is `tooltipText(node.tooltip)` (R-41). So the tooltip's rows are worded to read after their value: "Wren Ashdown - Keeper of Keys: 10 engine score, Perfect tier, Shift Targets and Ramp rules".
>    - **The tier gets its own row.** R3-4b suggested `{value: '8', label: 'engine score · Strong'}`. A separate "tier" row keeps the "·" out of a screen reader's sentence.
>    - **Rule lists** read "A, B and C" through one `Intl.ListFormat('en-GB')`, in the tooltip and in the table.
>    - **Names.** The tooltip's title and the table use `partner.name`, R3-4's full name, so two partners that print the same short name still read apart (R3-9's network check). The diagram prints the short name (`card.name`).
>    - **Links** go to `cardsHref(id)` (R-33, R3-5), not the dropped `cardAnalyticsPath`.
> 6. **The tier split (R-42, R-43, Q11).**
>    - It is R3-4c's `src/ui` `SplitMeter`, not the kit `SplitBar`. So `unit`, `series` and the outline's `SplitPart` go.
>    - `tierParts(summary)` returns `SplitMeterPart`s, each with its tier's label (R-44's "Strong ≥7") and colour from R3-4's `TIER_SERIES`. Every tier keeps its part, zeros included (Q11, settled).
>    - Shares print through `sharePercent`, inside the meter.
> 7. **Retry (R-45) and focus (R-48).**
>    - A failed read shows R2's error `Notice` and a neutral `CtaButton` "Retry", as `ReadError` does (`TuningAside.tsx:299-314`).
>    - Retry asks for a focus handoff (R2's, which R3-1a moves to `src/shell/focusHandoff.ts`) and calls `synergies.retry()`. When the read lands, with partners or none, the Engine view's heading takes focus. When it fails again, the new Retry takes it. `focusUnmoved` leaves focus alone if the user moved it while the read ran.
>    - The heading needs `tabIndex={-1}`, and `Panel` renders its own `h2`. So `Panel` gains one optional prop, `titleFocusable`, as R2-8 gave `BiasBar` its `minWidth`.
>    - The R3 header's "Focus (R-48)" states this design.
> 8. **The count** prints its number in Tinos at the KPI size (R-14), as the prototype does (`dc.html:654`). "At least" and "synergy partner(s)" are muted body text. The outline set the whole line at `ADMIN_TYPE.emphasis`. The cap caption is built from `ENGINE_GROUP_CAP`, so the two can't drift apart.
> 9. **State across cards (R-46).** The outline's `<EngineViewPanel key={card.id}>` goes, because R3-7 keys the whole view. The outline's test "switching to another card shows the chart again" is dropped: R3-7's remount test (`R3-07-route-page.md:17`) proves the key resets the view's state, and `NetworkPanel`'s `view` state lives under that key. R3-7's page test renders a stand-in view, so it couldn't open this table anyway.
> 10. **Props.**
>     - `EnginePanels` takes the hooks' own return types: `UseCardSynergiesReturn` (R3-4, with `retry`) and `UseVoteAnalyticsReturn`. `Loadable<T>` goes.
>     - It takes the context's `getCardById` (header contract 14) and derives both names through `partnerNames`. So the view gains the `synergies` prop and one line, with no `?.` or `??` of its own.
>     - R3-6a's `CardAnalyticsViewProps` has no `synergies` (`R3-06a-view-shell.md:7`, `:131`), so Step 14 adds it, and gives R3-6a's test `BASE` and its stories' meta args an empty read (`ENGINE_EMPTY`). Without them every R3-6a view test and story would throw on `synergies.loading`; typecheck can't catch the stories, whose args `Meta<typeof CardAnalyticsView>` makes optional.
>     - It reads the vote analytics only for the source caption's date, so the engine side never waits for the vote files.
> 11. **Copy.** The states are the header's States table: "Loading engine data...", "Could not load this card's synergies ({message})" with Retry, and the hedged empty copy. Admin's copy uses straight apostrophes (`CalibrationWorkspace.tsx:141`), and the repo's lint has no `react/no-unescaped-entities`.
> 12. **Stories.** They go in their own file, `EnginePanels.stories.tsx`, titled "Admin/Insights/Card analytics/Engine panels": a leaf under the "Card analytics" group, beside ".../View" and ".../Raw-vote panels" (header:586). There are six stories, built from one base args object under a `MemoryRouter`. The view's own stories gain an empty `synergies` arg (Step 14), so they show the Engine view's empty notice.
> 13. **Not taken.**
>     - **Node links don't ask for the page's focus handoff (R-48).** The kit's node links have no click hook. And a request made in a link's click would be taken by the old card's header before the new card renders: react-router 7.18 runs its router updates inside `startTransition` (`chunk-OB3PAWPO.mjs:6843`, `:7068`), so the click's own state update renders first. R3-7's `useCardHandoff` asks when the URL names another card instead (`R3-07-route-page.md:20`, `:948`), so node links need no hook.
>     - **Plain text for partners the card list doesn't hold.** They still link, and print their id. The synergy file and the card list come from the same deploy of inkweave.ink.
>     - **The prototype's "synergies.json" label** in the Engine view's header row. The source caption says where the data comes from.
> 14. **Coupling to the sibling re-bases.** Step 1 checks every name this task uses:
>     - **R3-4** as `R3-04-engine-model.md` gives it: `tieAtCut` and `CutTie {score, drawn, tied}`, `EnginePartner.name` and `.ruleNames`, `TIER_COLOR`, and the `ENGINE_*` fixtures.
>     - **R3-4b:** `NetworkDiagram` and `ringSizes`, as `R3-04b-network-diagram.md` gives them.
>     - **R3-4c:** `SplitMeter({parts, ariaLabel})` and `SplitMeterPart`.
>     - **R3-5:** `cardsHref` and `lorcanaCard`.
>     - **R3-1a:** `src/shell/focusHandoff.ts`.
>     - **R3-1:** `TIER_COLORS` on the bridge (the tests).
>     - **R3-6a:** `cardStyles.ts`'s `CAPTION`, which the panels' captions share with R3-6a's and R3-6b's (`R3-06a-view-shell.md:942`).
>     - **R3-6a's view**, its test's `BASE` and render helper, and its stories' meta args. Step 14 gives the view the `synergies` prop and one line, its test's `BASE` an empty read and one `describe`, and its stories' args the same empty read.
> 15. **Verified** in `scratchpad/r3-rebase/sandbox-R3-6c` (the draft, before the review's fixes), then again after them (the last bullet).
>     - **Setup.** R3-1a's sandbox `src` (main plus R3-1a), with R3-1's bridge, R3-4's `engineView.ts`, `useCardSynergies.ts` and engine fixtures, R3-4b's `NetworkDiagram.tsx`, `networkLayout.ts` and `AdminStyles.tsx`, R3-4c's `SplitMeter.tsx` and R3-5's `nav.ts` and `lorcanaCard`. Junctions to the repo's `node_modules` and `upstream`, and Vite's cache in the sandbox. R3-4's `engineView.ts` and hook, R3-4b's `NetworkDiagram.tsx` and R3-4c's `SplitMeter.tsx` match their task files' code, comments aside.
>     - **R3-6a's view** didn't exist, so a stand-in with the header contract's props held Step 14's line, and a stand-in test held its `describe`.
>     - **Steps 3, 7, 11 and 14** fail with the messages quoted there.
>     - **Steps 4, 9, 13 and 14** pass: 4 of 4 (`Panel`), 24 of 24 (`engineCharts`), 21 of 21 (`EnginePanels`), and the view's case.
>     - **The whole sandbox `src`:** 103 files and 1,198 tests passed, R3-4's, R3-4b's and R3-4c's suites included.
>     - **Typecheck.** `tsc -p tsconfig.app.json --noEmit` is clean, tests and stories included.
>     - **Lint.** `pnpm exec eslint --max-warnings 0 --stdin`, run in the repo, is clean on all ten files (the view and its test as stand-ins).
>     - **Replay.** The plan's own blocks, applied to main's `Panel.tsx` and `Panel.test.tsx` and to the stand-ins, give files byte-identical to the verified ones.
>     - **Every story** renders, checked with a throwaway `composeStories` test that is not part of the plan: 6 of 6.
>     - **The tests bite.** 27 mutants, each run against both new test files, and every one failed them. Among them: the heading not focusable, Retry asking for no handoff, the failed view taking nothing, the heading taking focus while loading, zero tiers dropped from the split, no tie clause, the all-tied form never used, "Thicker spokes" always printed, the cap left out of the subtitle, "and K more" doing nothing, the caption never dated, one decimal on every score, the full name printed on the node, the short name in the tooltip, the tier key gone, the rules plural always, a link to `/calibration`, the count in the body font, a tier colour on the split's legend text, and no network panel.
>     - **CodeScene MCP 1.1.3** scores `engineCharts.ts`, `EnginePanels.tsx`, the stories, both test files, `cardFixtures.ts` and `Panel.tsx` 10.0, with no findings. The local tool is laxer than the PR gate, so this is not proof.
>     - **After the review, against R3-6a's real view** (`scratchpad/r3-rebase/sandbox-R3-6c-fix2`: `sandbox-R3-6a`'s `src` plus this task's files, R3-6b not applied). `apply-6c-fix2.cjs` writes every file from this plan's own blocks: the new files verbatim, and Step 14's edits applied to `sandbox-R3-6a`'s view, test and stories.
>       - **Step 14's red step** gives `Tests  1 failed | 29 passed (30)`, with the quoted message.
>       - **The cards folder and `Panel`:** 10 files, 199 of 199 (`engineCharts` 25, `EnginePanels` 21, the view 30, `Panel` 4).
>       - **Typecheck** `tsc -p tsconfig.app.json --noEmit` exits 0. **Lint** is clean on the eight changed `cards/` files.
>       - **Every story renders** (a throwaway `composeStories` test): R3-6a's 9 and this task's 6, each with the Engine view. Without the stories' `synergies` arg, all 9 of R3-6a's throw `Cannot read properties of undefined (reading 'loading')`.
>       - **CodeScene MCP 1.1.3** scores `EnginePanels.test.tsx`, `engineCharts.ts` and `CardAnalyticsView.tsx` 10.0.

### Task R3-6c: The engine panels

**Files:**
- Create `src/tools/analytics/cards/engineCharts.ts`: the engine panels' pure helpers.
- Create `src/tools/analytics/cards/EnginePanels.tsx`: the Engine view panel and the network panel.
- Create `src/tools/analytics/cards/EnginePanels.stories.tsx`.
- Modify `src/ui/Panel.tsx`: the optional `titleFocusable`.
- Modify `src/tools/analytics/cards/cardFixtures.ts`: `ENGINE_CARD` and `partnerLookup`.
- Modify `src/tools/analytics/cards/CardAnalyticsView.tsx` (R3-6a): the `synergies` prop, and render the panels.
- Modify `src/tools/analytics/cards/CardAnalyticsView.stories.tsx` (R3-6a): an empty `synergies` in the meta's args.
- Test:
  - create `src/tools/analytics/cards/__tests__/engineCharts.test.ts` and `__tests__/EnginePanels.test.tsx`;
  - add to `src/ui/__tests__/Panel.test.tsx` and to R3-6a's `src/tools/analytics/cards/__tests__/CardAnalyticsView.test.tsx`.

**Interfaces:**
- **Consumes:**
  - R3-4, `src/tools/analytics/cards/engineView.ts` and `useCardSynergies.ts`:
    ```ts
    export type CardSynergies = Awaited<ReturnType<typeof fetchCardSynergies>>;
    export const ENGINE_GROUP_CAP = 100;
    export interface EnginePartner {id: string; name: string; score: number; tier: StrengthTierLabel; ruleNames: string[]}
    export interface EngineSummary {partners: number; capped: boolean; tiers: Record<StrengthTierLabel, number>}
    export interface CutTie {score: number; drawn: number; tied: number}   // `drawn` of the `tied` partners at `score` make the cut
    export const TIER_COLOR: Readonly<Record<StrengthTierLabel, string>>;
    export const TIER_SERIES: readonly SeriesDef[];                        // id = the tier, label "Strong ≥7" (R-44), strongest first
    export function enginePartners(data: CardSynergies, nameOf: (id: string) => string): EnginePartner[]; // score, then name (R-37)
    export function engineSummary(partners: readonly EnginePartner[], groups: CardSynergies['groups']): EngineSummary;
    export function tieAtCut(partners: readonly EnginePartner[], shown: number): CutTie | null;
    export interface UseCardSynergiesReturn {data: CardSynergies | null; loading: boolean; error: Error | null; retry: () => void}
    export function useCardSynergies(cardId: string | null): UseCardSynergiesReturn;
    // cardFixtures.ts: EngineFixture {data, nameOf}, engineFixture(partners), ENGINE_EMPTY, ENGINE_ONE_PARTNER,
    //   ENGINE_FIFTEEN (10, 9, 9, 8, 8, eight at 7, 5, 3), ENGINE_CAPPED (142: 30 at 8, 70 at 6, 42 at 3; Ramp at 100)
    ```
  - R3-4b, `src/charts/NetworkDiagram.tsx` and `networkLayout.ts`:
    ```ts
    export const NETWORK_MAX_NODES = 12;
    export interface NetworkNode {id: string; label: string; href: string; value: number; seriesId: string; tooltip: TooltipContent}
    export function NetworkDiagram(props: {nodes: readonly NetworkNode[]; series: readonly SeriesDef[]; ariaLabel: string;
      valueDomain?: Domain; height?: number; onShowAll?: () => void; emptyText?: string});
    // each node link is named tooltipText(node.tooltip); "and K more in the table" is a LinkButton that calls onShowAll
    export function ringSizes(count: number): [number, number];   // [inner, outer]: one ring up to 6, else ceil(n / 2) inside
    ```
  - R3-4c, `src/ui/SplitMeter.tsx`:
    ```ts
    export interface SplitMeterPart {id: string; label: string; color: string; value: number}
    export function SplitMeter(props: {parts: readonly SplitMeterPart[]; ariaLabel: string; emptyText?: string});
    // the legend is a <ul aria-label={ariaLabel}>, one <li> per part, zeros kept: "Strong ≥7 80% (12)"
    ```
  - R3-5: `cardsHref(cardId?: string): string` (`src/shell/nav.ts`) and `lorcanaCard(seed)` (`cardFixtures.ts`).
  - R3-1a, `src/shell/focusHandoff.ts`: `FocusHandoff {pending; request; done}`, `useFocusHandoff()` and `useTakeHandoff(handoff, container, selector, ready?)`, R2's, moved by R3-1a (code unchanged, doc comment generalised).
  - R3-6a:
    ```ts
    // src/tools/analytics/cards/cardStyles.ts
    export const CAPTION: CSSProperties;   // {margin: 0, fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted}
    // src/tools/analytics/cards/CardAnalyticsView.tsx: no synergies yet (R3-06a-view-shell.md:7, :131)
    export interface CardAnalyticsViewProps {
      card: LorcanaCard; analytics: UseVoteAnalyticsReturn; voteLog: UseVoteLogReturn;
      getCardById: (id: string) => LorcanaCard | undefined; handoff?: FocusHandoff; headerActions?: React.ReactNode;
    }
    // __tests__/CardAnalyticsView.test.tsx: const BASE: CardAnalyticsViewProps, and
    //   renderView(overrides: Partial<CardAnalyticsViewProps> = {}), under a MemoryRouter
    // CardAnalyticsView.stories.tsx: meta.args {card, analytics, voteLog, getCardById: viewCard}
    ```
  - From R1 and R2, unchanged: `ChartFrame` with its controlled `view` (`ChartFrame.tsx:105-145`), `ChartLegend` (`mark="line"`), `tooltipText` (`series.ts:88-91`), `Panel`, `Notice`, `fmtDay`, `fmtInt`, `fmtScore`, `ADMIN_COLORS`, `ADMIN_TYPE`, `UseVoteAnalyticsReturn` (`useVoteAnalytics.ts:5-9`), and `ANALYTICS` (`overview/overviewFixtures.ts:47`, generated `2026-09-30`) for the tests and stories.
  - Through the bridge: `CtaButton`, `FONTS` (`hero`, Tinos), `SPACING`, `type StrengthTierLabel`, and `TIER_COLORS` (R3-1) in the tests. `type LorcanaCard` comes from `inkweave-synergy-engine`, as `CardImagePicker.tsx:2` imports it.
- **Produces:**
  ```ts
  // src/ui/Panel.tsx: PanelProps gains
  titleFocusable?: boolean;   // the h2 takes tabIndex -1, so a focus handoff can land on it (R-48); default false

  // src/tools/analytics/cards/engineCharts.ts
  export interface PartnerNames {full: (id: string) => string; short: (id: string) => string}
  export function partnerNames(getCardById: (id: string) => LorcanaCard | undefined): PartnerNames;   // the id when unknown
  export interface EngineModel {partners: EnginePartner[]; summary: EngineSummary; cut: CutTie | null}
  export type EngineState = {kind: 'loading'} | {kind: 'failed'; error: Error} | {kind: 'empty'} | {kind: 'loaded'; model: EngineModel};
  export function engineState(synergies: Pick<UseCardSynergiesReturn, 'data' | 'loading' | 'error'>, names: PartnerNames): EngineState;
  export function tierParts(summary: EngineSummary): SplitMeterPart[];         // every tier, strongest first, zeros kept
  export function engineScoreText(score: number): string;                      // 8 -> "8", 9.5 -> "9.5"
  export function partnerNodes(partners: readonly EnginePartner[], names: PartnerNames): NetworkNode[];
  export function networkSubtitle(model: EngineModel): string;   // R-37: the rings, the tie at the cut, and the spokes
  export function partnerTable(partners: readonly EnginePartner[], card: Pick<LorcanaCard, 'fullName'>): ChartTable;

  // src/tools/analytics/cards/EnginePanels.tsx: the only component export
  export interface EnginePanelsProps {
    card: LorcanaCard; synergies: UseCardSynergiesReturn; analytics: UseVoteAnalyticsReturn;
    getCardById: (id: string) => LorcanaCard | undefined;
  }
  export function EnginePanels(props: EnginePanelsProps);   // a fragment: the Engine view panel, then the network panel

  // src/tools/analytics/cards/CardAnalyticsView.tsx: CardAnalyticsViewProps gains
  synergies: UseCardSynergiesReturn;   // the page's useCardSynergies(card.id), for the engine panels

  // src/tools/analytics/cards/cardFixtures.ts (tests and stories)
  export const ENGINE_CARD: LorcanaCard;   // id 300, "Marlowe Finch - Clockmaker"; no engine fixture lists it
  export function partnerLookup(fixture: EngineFixture): (id: string) => LorcanaCard | undefined;
  ```

**How it draws:**
- **The Engine view** is a titled `Panel`, "Engine view", the full width of the view's body. Its children, in order:
  - **With partners:**
    - the count, "At least 142 synergy partners": the number in Tinos at `ADMIN_TYPE.kpi`, the words in muted body text, "At least" only when a group hit the cap;
    - when capped, the caption "A synergy group lists only its top 100 partners.";
    - the tier `SplitMeter`, named "Partners by strength tier", with every tier's legend row, zeros included.
  - **Loading:** "Loading engine data...".
  - **Failed:** the error `Notice` ("Could not load this card's synergies (offline)", `role="alert"`) and a neutral `CtaButton` "Retry" under it, at its own width.
  - **No synergies:** "The engine finds no synergies for this card (or its synergy file could not be read). A card revealed after the app's last deploy has no synergy file yet." `fetchCardSynergies` keeps a non-OK response as an empty result, so the two causes can't be told apart.
  - Always last, the source caption: "Live engine data from inkweave.ink; vote analytics use the engine as of Sep 30." The clause after the semicolon shows only once vote analytics has loaded.
- **The network** is an untitled `Panel` under it, also full width, around a `ChartFrame` titled "Strongest partners":
  - the subtitle from `networkSubtitle` (note 4);
  - the legend `<ChartLegend series={TIER_SERIES} mark="line" />`, which mirrors the spokes;
  - the `NetworkDiagram` of every partner, which draws the first 12 and counts the rest. Its node list is named "Strongest synergy partners of {fullName}";
  - "and K more in the table" switches the frame's controlled view to the table, and the frame focuses it;
  - the table lists every partner, strongest first: Partner, Score, Tier, Rules ("—" for a pair with no named rule).
- **Text never wears a tier colour.** The colours paint the spokes, the dots, the legend's line keys, the split's segments and swatches, and the tooltip's score key. A test walks every text element to check it.
- **Focus (R-48).** Retry asks for the handoff. The Engine view's heading takes it once the read lands, loaded or empty; the new Retry takes it when the read fails again. Nothing moves if the user moved focus meanwhile.

- [ ] **Step 1: Check what this task builds on**

Run with the Bash tool:
```bash
cd /d/johnn/Projects/inkweave-admin
git grep -nE "export (function|interface) (useFocusHandoff|useTakeHandoff|FocusHandoff)\b" -- src/shell/focusHandoff.ts
git grep -nE "export (function SplitMeter|interface SplitMeterPart)\b" -- src/ui/SplitMeter.tsx
git grep -nE "export (const (ENGINE_GROUP_CAP|TIER_COLOR|TIER_SERIES)|function (enginePartners|engineSummary|tieAtCut)|interface (EnginePartner|EngineSummary|CutTie))\b" -- src/tools/analytics/cards/engineView.ts
git grep -nE "export interface UseCardSynergiesReturn" -- src/tools/analytics/cards/useCardSynergies.ts
git grep -nE "export (const NETWORK_MAX_NODES|interface NetworkNode|function NetworkDiagram|function ringSizes)\b" -- src/charts/NetworkDiagram.tsx src/charts/networkLayout.ts
git grep -nE "export function cardsHref" -- src/shell/nav.ts
git grep -nE "export (function (lorcanaCard|engineFixture)|const ENGINE_(EMPTY|ONE_PARTNER|FIFTEEN|CAPPED)|interface EngineFixture)\b" -- src/tools/analytics/cards/cardFixtures.ts
git grep -n "export const CAPTION" -- src/tools/analytics/cards/cardStyles.ts
git grep -n "TIER_COLORS," -- src/app-bridge.ts
git grep -nE "synergies|getCardById|EnginePanels" -- src/tools/analytics/cards/CardAnalyticsView.tsx
git grep -nE "^(function|const) (render|BASE)" -- src/tools/analytics/cards/__tests__/CardAnalyticsView.test.tsx
git grep -n "getCardById: viewCard" -- src/tools/analytics/cards/CardAnalyticsView.stories.tsx
git grep -n "titleFocusable" -- src/ui
```

Expected:
- **The first eight greps** print 3, 2, 9, 1, 4, 1, 7 and 1 lines: every name above. If one is missing, the task that owns it hasn't landed. Stop and do it first (R3-1a, R3-4c, R3-4, R3-4, R3-4b, R3-5, R3-4 and R3-5, then R3-6a).
- **`TIER_COLORS,`** prints one line (R3-1).
- **The view.** `getCardById` appears in R3-6a's props; `synergies` and `EnginePanels` don't (`R3-06a-view-shell.md:7`). Step 14 adds both. If R3-6a rendered an engine placeholder, Step 14 replaces it.
- **The view's test** prints its `BASE` and its render helper's line. Step 14 calls the helper `renderView`; use its real name.
- **The view's stories** print one line, the meta's `args`, which Step 14 gives a `synergies`.
- **`titleFocusable`** prints nothing.

- [ ] **Step 2: Write the failing test for a focusable panel title**

In `src/ui/__tests__/Panel.test.tsx`, add this case before `it('pads its body unless told not to, for flush tables'` (`:30`):

```tsx
  it('lets its title take focus from script, but never from Tab, when asked (R-48)', () => {
    const {rerender} = render(
      <Panel title="Engine view">
        <p>Body</p>
      </Panel>,
    );
    expect(screen.getByRole('heading', {name: 'Engine view'})).not.toHaveAttribute('tabindex');

    rerender(
      <Panel title="Engine view" titleFocusable>
        <p>Body</p>
      </Panel>,
    );
    const heading = screen.getByRole('heading', {name: 'Engine view'});
    expect(heading).toHaveAttribute('tabindex', '-1');
    heading.focus();
    expect(heading).toHaveFocus();
  });
```

- [ ] **Step 3: Run it and watch it fail**

Run: `pnpm vitest run src/ui/__tests__/Panel.test.tsx`

Expected: `Tests  1 failed | 3 passed (4)`. The new case fails with `Expected the element to have attribute:` `tabindex="-1"`.

- [ ] **Step 4: Give Panel `titleFocusable`**

In `src/ui/Panel.tsx`, four edits.

In `PanelProps`, after `padded?: boolean;` (`:15`), add:
```tsx
  /**
   * The title can take focus from script (tabIndex −1), so a focus handoff can
   * land on it when the control that had focus goes (R-48). The Engine view's
   * Retry uses it. Default false: a heading is not a tab stop either way.
   */
  titleFocusable?: boolean;
```

Replace `PanelHeader`'s signature (`:19`) and its `h2` opening tag (`:33`):
```tsx
function PanelHeader({title, titleId, action, padded}: Omit<PanelProps, 'children'> & {titleId: string}) {
```
```tsx
        <h2 id={titleId} style={{margin: 0, fontSize: ADMIN_TYPE.body, fontWeight: 700, color: ADMIN_COLORS.text}}>
```
with:
```tsx
function PanelHeader({
  title,
  titleId,
  action,
  padded,
  titleFocusable,
}: Omit<PanelProps, 'children'> & {titleId: string}) {
```
```tsx
        <h2
          id={titleId}
          tabIndex={titleFocusable ? -1 : undefined}
          style={{margin: 0, fontSize: ADMIN_TYPE.body, fontWeight: 700, color: ADMIN_COLORS.text}}>
```

Replace `Panel`'s signature (`:50`) and the header line (`:70`):
```tsx
export function Panel({title, action, children, padded = true}: PanelProps) {
```
```tsx
      {(Boolean(title) || action != null) && <PanelHeader title={title} titleId={titleId} action={action} padded={padded} />}
```
with:
```tsx
export function Panel({title, action, children, padded = true, titleFocusable}: PanelProps) {
```
```tsx
      {(Boolean(title) || action != null) && (
        <PanelHeader title={title} titleId={titleId} action={action} padded={padded} titleFocusable={titleFocusable} />
      )}
```

Run: `pnpm vitest run src/ui/__tests__/Panel.test.tsx`

Expected: `Tests  4 passed (4)`. Every other `Panel` caller passes nothing, so it renders as before.

- [ ] **Step 5: Add the engine panels' fixtures**

At the end of `src/tools/analytics/cards/cardFixtures.ts`, append the block below. It needs no new import: the file already imports `type LorcanaCard` (R3-5) and holds `lorcanaCard` and `EngineFixture`.

```ts
// ── Engine panels (R3-6c) ──

/** The card whose engine panels the R3-6c tests and stories draw. No engine fixture lists it as a partner. */
export const ENGINE_CARD: LorcanaCard = lorcanaCard({id: '300', name: 'Marlowe Finch', version: 'Clockmaker'});

/**
 * The card list's lookup for an engine fixture: each partner as a card, its
 * fixture name split at " - " into name and version, as the loader builds
 * fullName (so "Wren Ashdown - Keeper of Keys" prints "Wren Ashdown"). Any
 * other id is a card the list doesn't hold.
 */
export function partnerLookup({data, nameOf}: EngineFixture): (id: string) => LorcanaCard | undefined {
  const cards = new Map(
    Object.keys(data.pairs).map((id) => {
      const [name, version] = nameOf(id).split(' - ');
      return [id, lorcanaCard({id, name, version})] as const;
    }),
  );
  return (id) => cards.get(id);
}
```

`ENGINE_CARD`'s id, 300, is no partner of any engine fixture (301 to 315, 401, 2001 to 2142).

- [ ] **Step 6: Write the failing tests for the helpers**

Create `src/tools/analytics/cards/__tests__/engineCharts.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {TIER_COLORS} from '../../../../app-bridge';
import {tooltipText} from '../../../../charts/series';
import {
  ENGINE_CAPPED,
  ENGINE_EMPTY,
  ENGINE_FIFTEEN,
  ENGINE_ONE_PARTNER,
  engineFixture,
  partnerLookup,
  type EngineFixture,
} from '../cardFixtures';
import {
  engineScoreText,
  engineState,
  networkSubtitle,
  partnerNames,
  partnerNodes,
  partnerTable,
  tierParts,
  type EngineModel,
} from '../engineCharts';

/** A settled read of the fixture's file, as useCardSynergies returns it. */
const read = (fixture: EngineFixture) => ({data: fixture.data, loading: false, error: null});
const namesOf = (fixture: EngineFixture) => partnerNames(partnerLookup(fixture));

/** The fixture's model: what the panels draw once the read lands with partners. */
function modelOf(fixture: EngineFixture, names = namesOf(fixture)): EngineModel {
  const state = engineState(read(fixture), names);
  if (state.kind !== 'loaded') throw new Error(`no partners in the fixture (${state.kind})`);
  return state.model;
}

/** One partner the engine names no rule for. */
const bare = engineFixture([{id: '601', name: 'Quiet Partner', score: 6, rules: []}]);

/** `count` partners, one per score from 10 down in half points: no two tie. */
const distinct = (count: number) =>
  engineFixture(
    Array.from({length: count}, (_, i) => ({id: String(501 + i), name: `Spoke ${i + 1}`, score: 10 - i / 2})),
  );

describe('partnerNames', () => {
  it('reads the full and the short name from the card list, and the id for a card it does not hold', () => {
    const names = namesOf(ENGINE_FIFTEEN);
    expect(names.full('301')).toBe('Wren Ashdown - Keeper of Keys');
    expect(names.short('301')).toBe('Wren Ashdown');
    expect(names.full('999')).toBe('999');
    expect(names.short('999')).toBe('999');
  });
});

describe('engineState', () => {
  const names = namesOf(ENGINE_FIFTEEN);

  it.each([
    ['loading', {data: null, loading: true, error: null}],
    ['empty', {data: null, loading: false, error: null}],
    ['empty', read(ENGINE_EMPTY)],
  ] as const)('reads %s', (kind, synergies) => {
    expect(engineState(synergies, names).kind).toBe(kind);
  });

  it('carries a failed read’s error', () => {
    const error = new Error('offline');
    expect(engineState({data: null, loading: false, error}, names)).toEqual({kind: 'failed', error});
  });

  it.each<[string, EngineFixture, EngineModel['summary'], EngineModel['cut']]>([
    [
      'fifteen partners, the cut inside the eight at 7',
      ENGINE_FIFTEEN,
      {partners: 15, capped: false, tiers: {Perfect: 1, Strong: 12, Moderate: 1, Weak: 1}},
      {score: 7, drawn: 7, tied: 8},
    ],
    [
      'a capped group, all twelve from the 30 at 8',
      ENGINE_CAPPED,
      {partners: 142, capped: true, tiers: {Perfect: 0, Strong: 30, Moderate: 70, Weak: 42}},
      {score: 8, drawn: 12, tied: 30},
    ],
    [
      'one partner, no cut',
      ENGINE_ONE_PARTNER,
      {partners: 1, capped: false, tiers: {Perfect: 0, Strong: 0, Moderate: 1, Weak: 0}},
      null,
    ],
  ])('builds the partners once, with their summary and cut: %s', (_, fixture, summary, cut) => {
    const model = modelOf(fixture);
    expect(model.summary).toEqual(summary);
    expect(model.cut).toEqual(cut);
    expect(model.partners).toHaveLength(summary.partners);
  });
});

describe('tierParts', () => {
  it('keeps every tier, strongest first, with its label, colour and count, zeros included (R-44)', () => {
    expect(tierParts(modelOf(ENGINE_ONE_PARTNER).summary)).toEqual([
      {id: 'Perfect', label: 'Perfect ≥9.5', color: TIER_COLORS.perfect.color, value: 0},
      {id: 'Strong', label: 'Strong ≥7', color: TIER_COLORS.strong.color, value: 0},
      {id: 'Moderate', label: 'Moderate ≥4', color: TIER_COLORS.moderate.color, value: 1},
      {id: 'Weak', label: 'Weak <4', color: TIER_COLORS.weak.color, value: 0},
    ]);
  });
});

describe('engineScoreText', () => {
  it.each([
    [8, '8'],
    [10, '10'],
    [9.5, '9.5'],
  ])('prints %s as "%s"', (score, text) => {
    expect(engineScoreText(score)).toBe(text);
  });
});

describe('partnerNodes', () => {
  const nodes = partnerNodes(modelOf(ENGINE_FIFTEEN).partners, namesOf(ENGINE_FIFTEEN));

  it('prints the short name, links to the partner’s page and takes its tier’s series', () => {
    expect(nodes).toHaveLength(15);
    expect(nodes[0]).toMatchObject({
      id: '301',
      label: 'Wren Ashdown',
      href: '/cards/301',
      value: 10,
      seriesId: 'Perfect',
    });
  });

  it('names a node by its tooltip: full name, score, tier and every rule (R-41)', () => {
    expect(tooltipText(nodes[0].tooltip)).toBe(
      'Wren Ashdown - Keeper of Keys: 10 engine score, Perfect tier, Shift Targets and Ramp rules',
    );
    expect(tooltipText(nodes[1].tooltip)).toBe(
      'Ada Brightwater - Tidecaller: 9 engine score, Strong tier, Singer rule',
    );
  });

  it('keys the score row in the tier’s colour, and the text never takes it', () => {
    expect(nodes[0].tooltip.rows[0]).toEqual({value: '10', label: 'engine score', color: TIER_COLORS.perfect.color});
    expect(nodes[0].tooltip.rows.slice(1).every((row) => row.color === undefined)).toBe(true);
  });

  it('leaves the rules row out for a pair the engine names no rule for', () => {
    const [node] = partnerNodes(modelOf(bare).partners, namesOf(bare));
    expect(tooltipText(node.tooltip)).toBe('Quiet Partner: 6 engine score, Moderate tier');
  });

  it('falls back to the id for a partner the card list does not hold', () => {
    const unknown = partnerNames(() => undefined);
    const [node] = partnerNodes(modelOf(ENGINE_ONE_PARTNER, unknown).partners, unknown);
    expect(node.label).toBe('401');
    expect(node.tooltip.title).toBe('401');
  });
});

describe('networkSubtitle', () => {
  const READ = "ranked clockwise from 12 o'clock";

  it.each<[string, EngineFixture, string]>([
    // One spoke, or spokes that all share a score: widths say nothing, so the subtitle leaves them out.
    ['one partner', ENGINE_ONE_PARTNER, `Every partner, ${READ}.`],
    [
      'three partners at one score',
      engineFixture([
        {id: '701', name: 'Ash', score: 7},
        {id: '702', name: 'Birch', score: 7},
        {id: '703', name: 'Cedar', score: 7},
      ]),
      `Every partner, ${READ}.`,
    ],
    [
      'nine partners, two rings',
      distinct(9),
      `Every partner, ${READ}, the first 5 on the inner ring. Thicker spokes score higher.`,
    ],
    [
      'a cut between two scores',
      distinct(13),
      `The 12 strongest of 13 partners, ${READ}, the first 6 on the inner ring. Thicker spokes score higher.`,
    ],
    [
      'a cut inside a tie (R-37)',
      ENGINE_FIFTEEN,
      `The 12 strongest of 15 partners, ${READ}, the first 6 on the inner ring. ` +
        '7 of the 8 partners at score 7 make the cut, by name. Thicker spokes score higher.',
    ],
    [
      'a capped count, a floor, every drawn partner in the tie',
      ENGINE_CAPPED,
      // Every drawn spoke has the same score, so the subtitle says how they were picked and nothing of widths.
      `12 of the 30 partners at score 8, by name, of at least 142 in all, ${READ}, the first 6 on the inner ring.`,
    ],
  ])('%s', (_, fixture, subtitle) => {
    expect(networkSubtitle(modelOf(fixture))).toBe(subtitle);
  });
});

describe('partnerTable', () => {
  it('lists every partner, past the twelve drawn, strongest first, with all the tooltip shows', () => {
    const table = partnerTable(modelOf(ENGINE_FIFTEEN).partners, {fullName: 'Marlowe Finch - Clockmaker'});
    expect(table.caption).toBe(
      'Synergy partners of Marlowe Finch - Clockmaker, strongest first (by engine score, then name)',
    );
    expect(table.columns).toEqual(['Partner', 'Score', 'Tier', 'Rules']);
    expect(table.rows).toHaveLength(15);
    expect(table.rows[0]).toEqual(['Wren Ashdown - Keeper of Keys', '10', 'Perfect', 'Shift Targets and Ramp']);
    expect(table.rows[12]).toEqual(['Yara Stormwick - Captain', '7', 'Strong', 'Ramp']);
    expect(table.rows[14]).toEqual(['Lumen - Glowworm', '3', 'Weak', 'Ramp']);
  });

  it('prints "—" for a pair with no named rule', () => {
    const {rows} = partnerTable(modelOf(bare).partners, {fullName: 'Marlowe Finch - Clockmaker'});
    expect(rows).toEqual([['Quiet Partner', '6', 'Moderate', '—']]);
  });
});
```

What the fixtures give, so each expectation can be checked by hand:
- **`ENGINE_FIFTEEN`**, by score then name: Wren Ashdown (10), Ada Brightwater and Tobias Quill (9), Moss and Pell (8), then the eight at 7: Bramble, Cinder, Ezra Vale, Hollis Grey, Kit Marlow, Odette Fernsby, Uma Lark and Yara Stormwick, then Garnet (5) and Lumen (3). The cut at 12 keeps seven of the eight at 7, and Yara Stormwick is the 13th. Its tiers: 1 Perfect, 12 Strong, 1 Moderate, 1 Weak.
- **`ENGINE_CAPPED`:** 30 at 8 (Strong), 70 at 6 (Moderate), 42 at 3 (Weak). The Ramp group holds 100, the engine's cap.
- **`ringSizes`:** 9 nodes put 5 inside; 12 put 6.

- [ ] **Step 7: Run them and watch them fail**

Run: `pnpm vitest run src/tools/analytics/cards/__tests__/engineCharts.test.ts`

Expected: the file fails with `Failed to resolve import "../engineCharts" from "src/tools/analytics/cards/__tests__/engineCharts.test.ts". Does the file exist?`

- [ ] **Step 8: Write `engineCharts.ts`**

Create `src/tools/analytics/cards/engineCharts.ts`:

```ts
import type {LorcanaCard} from 'inkweave-synergy-engine';
import type {StrengthTierLabel} from '../../../app-bridge';
import type {ChartTable} from '../../../charts/ChartFrame';
import type {TooltipContent, TooltipRow} from '../../../charts/ChartTooltip';
import {NETWORK_MAX_NODES, type NetworkNode} from '../../../charts/NetworkDiagram';
import {ringSizes} from '../../../charts/networkLayout';
import {cardsHref} from '../../../shell/nav';
import {fmtInt, fmtScore} from '../../../ui/format';
import type {SplitMeterPart} from '../../../ui/SplitMeter';
import {
  TIER_COLOR,
  TIER_SERIES,
  enginePartners,
  engineSummary,
  tieAtCut,
  type CardSynergies,
  type CutTie,
  type EnginePartner,
  type EngineSummary,
} from './engineView';
import type {UseCardSynergiesReturn} from './useCardSynergies';

/*
 * The engine panels' state, numbers and words (R3-6c), from one card's live
 * synergy file: which state the Engine view shows, the tier split, and the
 * network's nodes, subtitle and table. Pure; EnginePanels.tsx draws them.
 */

/** A partner's names from the card list: the full one (tooltip, link, table, order) and the short one printed. */
export interface PartnerNames {
  full: (id: string) => string;
  short: (id: string) => string;
}

/** What the Engine view and the network draw once the engine pairs the card with anyone. */
export interface EngineModel {
  /** Every partner, strongest first: score, then name (R-37). Each `name` is the full one. */
  partners: EnginePartner[];
  summary: EngineSummary;
  /** The tie the network's cut at NETWORK_MAX_NODES splits, or null (R-37). */
  cut: CutTie | null;
}

export type EngineState =
  | {kind: 'loading'}
  | {kind: 'failed'; error: Error}
  | {kind: 'empty'}
  | {kind: 'loaded'; model: EngineModel};

const LOADING: EngineState = {kind: 'loading'};
const EMPTY: EngineState = {kind: 'empty'};

/** Rule names as a phrase: "Ramp", "Shift Targets and Ramp", "Ramp, Singer and Locations". */
const RULE_LIST = new Intl.ListFormat('en-GB', {type: 'conjunction'});

/**
 * Names from the card list, or the id for a card it doesn't hold. Partners
 * come from the live synergy file, which covers the same card list, so a bare
 * id shows only while the two are a deploy apart.
 */
export function partnerNames(getCardById: (id: string) => LorcanaCard | undefined): PartnerNames {
  return {
    full: (id) => getCardById(id)?.fullName ?? id,
    short: (id) => getCardById(id)?.name ?? id,
  };
}

/** The partners, built once, with what the panels read off them; null when the engine pairs the card with no one. */
function engineModel(data: CardSynergies, names: PartnerNames): EngineModel | null {
  const partners = enginePartners(data, names.full);
  if (partners.length === 0) return null;
  return {partners, summary: engineSummary(partners, data.groups), cut: tieAtCut(partners, NETWORK_MAX_NODES)};
}

/**
 * Which of the Engine view's states to show. `empty` covers a missing or
 * unreadable file too: fetchCardSynergies keeps a non-OK response as an empty
 * result, so the two can't be told apart.
 */
export function engineState(
  synergies: Pick<UseCardSynergiesReturn, 'data' | 'loading' | 'error'>,
  names: PartnerNames,
): EngineState {
  if (synergies.loading) return LOADING;
  if (synergies.error) return {kind: 'failed', error: synergies.error};
  const model = synergies.data && engineModel(synergies.data, names);
  return model ? {kind: 'loaded', model} : EMPTY;
}

/** The tier split's parts, strongest tier first. Every tier keeps its part, zeros included (R-44: "Strong ≥7"). */
export function tierParts(summary: EngineSummary): SplitMeterPart[] {
  // TIER_SERIES' ids are the tier labels (R3-4).
  return TIER_SERIES.map(({id, label, color}) => ({id, label, color, value: summary.tiers[id as StrengthTierLabel]}));
}

/** An engine score: rules score in whole points, so "8"; anything else keeps one place, so "9.5". */
export function engineScoreText(score: number): string {
  return fmtScore(score, Number.isInteger(score) ? 0 : 1);
}

/**
 * A partner's tooltip, whose text is also its node link's name (R-41): "Wren
 * Ashdown - Keeper of Keys: 10 engine score, Perfect tier, Shift Targets and
 * Ramp rules". The title is the full name, so two partners that print the same
 * short name still read apart. The score row carries the tier's line key; a
 * pair the engine names no rule for has no rules row.
 */
function partnerTooltip(partner: EnginePartner): TooltipContent {
  const rows: TooltipRow[] = [
    {value: engineScoreText(partner.score), label: 'engine score', color: TIER_COLOR[partner.tier]},
    {value: partner.tier, label: 'tier'},
  ];
  if (partner.ruleNames.length > 0) {
    rows.push({value: RULE_LIST.format(partner.ruleNames), label: partner.ruleNames.length === 1 ? 'rule' : 'rules'});
  }
  return {title: partner.name, rows};
}

/**
 * The network's nodes, strongest first: every partner, though the diagram
 * draws only the first NETWORK_MAX_NODES and counts the rest. Each prints its
 * short name, links to its own card page and takes its tier's series.
 */
export function partnerNodes(partners: readonly EnginePartner[], names: PartnerNames): NetworkNode[] {
  return partners.map((partner) => ({
    id: partner.id,
    label: names.short(partner.id),
    href: cardsHref(partner.id),
    value: partner.score,
    seriesId: partner.tier,
    tooltip: partnerTooltip(partner),
  }));
}

/** Every drawn partner sits in the tie: the cut splits the top score, so names alone pick the twelve. */
function allTied(cut: CutTie | null): cut is CutTie {
  return cut !== null && cut.drawn === NETWORK_MAX_NODES;
}

/** "7 of the 8 partners at score 7". */
function tieText(cut: CutTie): string {
  return `${cut.drawn} of the ${cut.tied} partners at score ${engineScoreText(cut.score)}`;
}

/** Which partners the diagram draws. A capped count is a floor, so it reads "at least", as the panel's count does. */
function whichPartners({summary, cut}: Pick<EngineModel, 'summary' | 'cut'>): string {
  if (summary.partners <= NETWORK_MAX_NODES) return 'Every partner';
  const total = `${summary.capped ? 'at least ' : ''}${fmtInt(summary.partners)}`;
  if (allTied(cut)) return `${tieText(cut)}, by name, of ${total} in all`;
  return `The ${NETWORK_MAX_NODES} strongest of ${total} partners`;
}

/** How many sit on the inner ring, when there are two (networkLayout's ringSizes). */
function ringClause(summary: EngineSummary): string {
  const [inner, outer] = ringSizes(Math.min(summary.partners, NETWORK_MAX_NODES));
  return outer > 0 ? `, the first ${inner} on the inner ring` : '';
}

/** R-37: a cut inside a tie below the top score names the tie, whose drawn partners are picked by name. */
function tieClause(cut: CutTie | null): string {
  if (!cut || allTied(cut)) return '';
  return ` ${tieText(cut)} make the cut, by name.`;
}

/** Spoke widths say nothing when every drawn spoke has the same score: one partner, or a drawn set that all tie. */
function spokesClause(partners: readonly EnginePartner[]): string {
  const drawn = partners.slice(0, NETWORK_MAX_NODES);
  return drawn[0].score === drawn[drawn.length - 1].score ? '' : ' Thicker spokes score higher.';
}

/**
 * The diagram's subtitle: which partners it draws, how to read it, and the
 * tie its cut splits, if any (R-37). "The 12 strongest of 15 partners, ranked
 * clockwise from 12 o'clock, the first 6 on the inner ring. 7 of the 8
 * partners at score 7 make the cut, by name. Thicker spokes score higher."
 */
export function networkSubtitle(model: EngineModel): string {
  const read = `ranked clockwise from 12 o'clock${ringClause(model.summary)}`;
  return `${whichPartners(model)}, ${read}.${tieClause(model.cut)}${spokesClause(model.partners)}`;
}

/** The diagram's table view: every partner, not only the drawn ones, with all its tooltip shows. */
export function partnerTable(partners: readonly EnginePartner[], card: Pick<LorcanaCard, 'fullName'>): ChartTable {
  return {
    caption: `Synergy partners of ${card.fullName}, strongest first (by engine score, then name)`,
    columns: ['Partner', 'Score', 'Tier', 'Rules'],
    rows: partners.map((p) => [p.name, engineScoreText(p.score), p.tier, RULE_LIST.format(p.ruleNames) || '—']),
  };
}
```

- [ ] **Step 9: Run the helper tests and see them pass**

Run: `pnpm vitest run src/tools/analytics/cards/__tests__/engineCharts.test.ts`

Expected: `Tests  25 passed (25)`.

- [ ] **Step 10: Write the failing tests for the panels**

Create `src/tools/analytics/cards/__tests__/EnginePanels.test.tsx`:

```tsx
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {RouterProvider, createMemoryRouter} from 'react-router-dom';
import {FONTS, TIER_COLORS} from '../../../../app-bridge';
import {ANALYTICS} from '../../overview/overviewFixtures';
import type {UseVoteAnalyticsReturn} from '../../useVoteAnalytics';
import {
  ENGINE_CAPPED,
  ENGINE_CARD,
  ENGINE_EMPTY,
  ENGINE_FIFTEEN,
  ENGINE_ONE_PARTNER,
  partnerLookup,
  type EngineFixture,
} from '../cardFixtures';
import {EnginePanels} from '../EnginePanels';
import {useCardSynergies, type UseCardSynergiesReturn} from '../useCardSynergies';

// The retry tests run the real hook over a mocked fetch; the rest of the bridge is real.
const fetchCardSynergies = vi.hoisted(() => vi.fn());
vi.mock('../../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  fetchCardSynergies,
}));

beforeEach(() => {
  // A block, not an arrow's value: mockReset() returns the mock, and Vitest calls
  // a function a hook returns as its teardown.
  fetchCardSynergies.mockReset();
});

const NO_ANALYTICS: UseVoteAnalyticsReturn = {data: null, loading: true, error: null};

/** A settled read of the fixture's file, as useCardSynergies returns it. */
const settled = (fixture: EngineFixture): UseCardSynergiesReturn => ({
  data: fixture.data,
  loading: false,
  error: null,
  retry: vi.fn(),
});

interface Setup {
  fixture?: EngineFixture;
  synergies?: Partial<UseCardSynergiesReturn>;
  analytics?: UseVoteAnalyticsReturn;
}

/** The panels on the card's page, under a data router, so a test can follow a node link and read the URL. */
function renderPanels({fixture = ENGINE_FIFTEEN, synergies, analytics = NO_ANALYTICS}: Setup = {}) {
  const element = (
    <EnginePanels
      card={ENGINE_CARD}
      synergies={{...settled(fixture), ...synergies}}
      analytics={analytics}
      getCardById={partnerLookup(fixture)}
    />
  );
  const router = createMemoryRouter([{path: '/cards/:cardId', element}], {initialEntries: ['/cards/300']});
  render(<RouterProvider router={router} />);
  return router;
}

/** The panels over the real useCardSynergies, so Retry fetches again. */
function LivePanels() {
  const synergies = useCardSynergies(ENGINE_CARD.id);
  return (
    <EnginePanels
      card={ENGINE_CARD}
      synergies={synergies}
      analytics={NO_ANALYTICS}
      getCardById={partnerLookup(ENGINE_FIFTEEN)}
    />
  );
}

function renderLive() {
  render(<RouterProvider router={createMemoryRouter([{path: '/', element: <LivePanels />}])} />);
}

const engineView = () => screen.getByRole('region', {name: 'Engine view'});
const network = () => screen.getByRole('figure', {name: 'Strongest partners'});
const nodeList = () => screen.getByRole('list', {name: 'Strongest synergy partners of Marlowe Finch - Clockmaker'});
const nodeLinks = () => within(nodeList()).getAllByRole('link');

/** A colour as the DOM writes it back ("rgb(…)"), so a hex token compares with an element's style. */
function cssColor({color}: {color: string}): string {
  const probe = document.createElement('i');
  probe.style.color = color;
  return probe.style.color;
}

const tierLegend = () =>
  within(screen.getByRole('list', {name: 'Partners by strength tier'}))
    .getAllByRole('listitem')
    .map((item) => item.textContent);

describe('EnginePanels: the Engine view', () => {
  it('counts every partner, the number in Tinos, and splits them by tier, every tier shown', () => {
    renderPanels();
    expect(engineView()).toHaveTextContent('15 synergy partners');
    expect(within(engineView()).getByText('15')).toHaveStyle({fontFamily: FONTS.hero});
    expect(within(engineView()).queryByText(/At least/)).not.toBeInTheDocument();
    expect(within(engineView()).queryByText(/top 100 partners/)).not.toBeInTheDocument();
    expect(tierLegend()).toEqual([
      'Perfect ≥9.5 7% (1)',
      'Strong ≥7 80% (12)',
      'Moderate ≥4 7% (1)',
      'Weak <4 7% (1)',
    ]);
  });

  it('keeps a tier with no partners in the split (Q11), and reads "1 synergy partner"', () => {
    renderPanels({fixture: ENGINE_ONE_PARTNER});
    expect(engineView()).toHaveTextContent('1 synergy partner');
    expect(engineView()).not.toHaveTextContent('1 synergy partners');
    expect(tierLegend()).toEqual([
      'Perfect ≥9.5 0% (0)',
      'Strong ≥7 0% (0)',
      'Moderate ≥4 100% (1)',
      'Weak <4 0% (0)',
    ]);
  });

  it('reads "At least" and gives the reason when a group hit the engine’s cap', () => {
    renderPanels({fixture: ENGINE_CAPPED});
    expect(engineView()).toHaveTextContent('At least 142 synergy partners');
    expect(within(engineView()).getByText('A synergy group lists only its top 100 partners.')).toBeInTheDocument();
  });

  it.each<[string, Setup, string]>([
    ['loading', {synergies: {data: null, loading: true}}, 'Loading engine data...'],
    [
      'with no synergies',
      {fixture: ENGINE_EMPTY},
      'The engine finds no synergies for this card (or its synergy file could not be read). ' +
        "A card revealed after the app's last deploy has no synergy file yet.",
    ],
  ])('says so while %s, with no count, split or network', (_, setup, text) => {
    renderPanels(setup);
    expect(within(engineView()).getByText(text)).toBeInTheDocument();
    expect(screen.queryByRole('list', {name: 'Partners by strength tier'})).not.toBeInTheDocument();
    expect(screen.queryByRole('figure', {name: 'Strongest partners'})).not.toBeInTheDocument();
  });

  it('says why a read failed and offers Retry, which reads the file again (R-45)', async () => {
    const retry = vi.fn();
    renderPanels({synergies: {data: null, error: new Error('offline'), retry}});
    expect(screen.getByRole('alert')).toHaveTextContent("Could not load this card's synergies (offline)");
    expect(screen.queryByRole('figure', {name: 'Strongest partners'})).not.toBeInTheDocument();
    await userEvent.click(within(engineView()).getByRole('button', {name: 'Retry'}));
    expect(retry).toHaveBeenCalledOnce();
  });

  it.each<[string, UseVoteAnalyticsReturn, string]>([
    [
      'loaded',
      {data: ANALYTICS, loading: false, error: null},
      'Live engine data from inkweave.ink; vote analytics use the engine as of Sep 30.',
    ],
    ['loading', NO_ANALYTICS, 'Live engine data from inkweave.ink.'],
    ['failed', {data: null, loading: false, error: new Error('404')}, 'Live engine data from inkweave.ink.'],
  ])('names its source, and the vote analytics’ engine date once they have %s', (_, analytics, caption) => {
    renderPanels({analytics});
    expect(within(engineView()).getByText(caption)).toBeInTheDocument();
  });
});

describe('EnginePanels: focus after Retry (R-48)', () => {
  it('moves focus to the panel’s heading once the read lands', async () => {
    fetchCardSynergies.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(ENGINE_FIFTEEN.data);
    renderLive();
    await userEvent.click(await screen.findByRole('button', {name: 'Retry'}));
    expect(await screen.findByText('synergy partners')).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: 'Engine view'})).toHaveFocus();
    expect(fetchCardSynergies).toHaveBeenCalledTimes(2);
  });

  it('hands focus back to Retry when the read fails again', async () => {
    fetchCardSynergies.mockRejectedValue(new Error('offline'));
    renderLive();
    await userEvent.click(await screen.findByRole('button', {name: 'Retry'}));
    await vi.waitFor(() => expect(fetchCardSynergies).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('button', {name: 'Retry'})).toHaveFocus();
  });
});

describe('EnginePanels: the network (R-39)', () => {
  it('sits in its own untitled panel under the Engine view, titled by its frame', () => {
    renderPanels();
    expect(engineView().compareDocumentPosition(network()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(engineView()).not.toContainElement(network());
    expect(network().closest('section')).not.toHaveAttribute('aria-labelledby');
  });

  it('draws the twelve strongest as links, strongest first, each named by its tooltip (R-41)', () => {
    renderPanels();
    const links = nodeLinks();
    expect(links).toHaveLength(12);
    expect(links[0]).toHaveAccessibleName(
      'Wren Ashdown - Keeper of Keys: 10 engine score, Perfect tier, Shift Targets and Ramp rules',
    );
    expect(links[0]).toHaveAttribute('href', '/cards/301');
    // By name within the eight at 7: Uma Lark makes the cut, Yara Stormwick doesn't.
    expect(links[11]).toHaveAccessibleName('Uma Lark - Songbird: 7 engine score, Strong tier, Singer rule');
  });

  it('says in its subtitle which tie the cut splits (R-37)', () => {
    renderPanels();
    expect(network()).toHaveTextContent('The 12 strongest of 15 partners');
    expect(network()).toHaveTextContent('7 of the 8 partners at score 7 make the cut, by name.');
  });

  it('reads "at least" for a capped count, as the Engine view does, and says all twelve share a score', () => {
    renderPanels({fixture: ENGINE_CAPPED});
    expect(network()).toHaveTextContent('12 of the 30 partners at score 8, by name, of at least 142 in all');
    expect(network()).not.toHaveTextContent('Thicker spokes');
  });

  it('draws one partner on one ring, with nothing more to show', () => {
    renderPanels({fixture: ENGINE_ONE_PARTNER});
    expect(nodeLinks()).toHaveLength(1);
    expect(network()).toHaveTextContent("Every partner, ranked clockwise from 12 o'clock.");
    expect(network()).not.toHaveTextContent('Thicker spokes');
    expect(screen.queryByRole('button', {name: /more in the table/})).not.toBeInTheDocument();
  });

  it('keys the spokes with the tiers', () => {
    renderPanels();
    const legend = within(network()).getByRole('list', {name: 'Legend'});
    expect(within(legend).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Perfect ≥9.5',
      'Strong ≥7',
      'Moderate ≥4',
      'Weak <4',
    ]);
  });

  it('shows a node’s tooltip, rules included, when its link takes focus', () => {
    renderPanels();
    act(() => nodeLinks()[0].focus());
    const tip = screen.getByText('Wren Ashdown - Keeper of Keys').closest<HTMLElement>('[aria-hidden="true"]');
    expect(tip).not.toBeNull();
    expect(tip).toHaveTextContent('Shift Targets and Ramp');
  });

  it('opens the table from "and 3 more in the table", focused, listing every partner', async () => {
    renderPanels();
    await userEvent.click(screen.getByRole('button', {name: 'and 3 more in the table'}));
    const table = within(network()).getByRole('table');
    expect(table).toHaveFocus();
    const columns = within(table).getAllByRole('columnheader').map((th) => th.textContent);
    expect(columns).toEqual(['Partner', 'Score', 'Tier', 'Rules']);
    expect(within(table).getAllByRole('row')).toHaveLength(16);
    expect(within(table).getByRole('rowheader', {name: 'Yara Stormwick - Captain'})).toBeInTheDocument();
  });

  it('follows a node link to that partner’s card page', async () => {
    const router = renderPanels();
    await userEvent.click(nodeLinks()[2]);
    expect(router.state.location.pathname).toBe('/cards/302');
  });

  it('gives tier colours to marks only: no text wears one', async () => {
    renderPanels();
    const tierColors = Object.values(TIER_COLORS).map(cssColor);
    const texts = [...document.querySelectorAll<HTMLElement | SVGElement>('p, span, li, text, h2, h3, th, td')];
    for (const el of texts) {
      expect(tierColors).not.toContain(el.style.color);
      expect(tierColors).not.toContain(cssColor({color: el.getAttribute('fill') ?? ''}));
    }
    await userEvent.click(screen.getByRole('button', {name: 'and 3 more in the table'}));
    for (const cell of within(network()).getAllByRole('cell')) {
      expect(tierColors).not.toContain(cell.style.color);
    }
  });
});
```

How the tests reach what they check:
- **The bridge mock** swaps only `fetchCardSynergies`, in R2's `importOriginal` idiom, and resets it in a block-bodied `beforeEach` (the header's "Test isolation"). The two focus tests run R3-4's real `useCardSynergies` over it, so Retry really fetches again; every other test passes a settled `synergies` object.
- **The data router** (`createMemoryRouter`) lets "follows a node link" read `router.state.location`, and the node links need a router anyway.
- **The tooltip** is found by its title text, then its `aria-hidden` root, as R2's chart tests find it (`CalibrationCharts.test.tsx:54-58`). Its text is not in the DOM until a link takes focus.
- **"No text wears a tier colour"** compares every text element's `style.color`, and every SVG `text`'s `fill`, against the four `TIER_COLORS`, through the DOM's own colour form, in the chart view and then the table view.

- [ ] **Step 11: Run them and watch them fail**

Run: `pnpm vitest run src/tools/analytics/cards/__tests__/EnginePanels.test.tsx`

Expected: the file fails with `Failed to resolve import "../EnginePanels" from "src/tools/analytics/cards/__tests__/EnginePanels.test.tsx". Does the file exist?`

- [ ] **Step 12: Write `EnginePanels.tsx`**

Create `src/tools/analytics/cards/EnginePanels.tsx`:

```tsx
import {useRef, useState} from 'react';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {CtaButton, FONTS, SPACING} from '../../../app-bridge';
import {ChartFrame, type ChartView} from '../../../charts/ChartFrame';
import {ChartLegend} from '../../../charts/ChartLegend';
import {NetworkDiagram} from '../../../charts/NetworkDiagram';
import {useFocusHandoff, useTakeHandoff, type FocusHandoff} from '../../../shell/focusHandoff';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {fmtDay, fmtInt} from '../../../ui/format';
import {Notice} from '../../../ui/Notice';
import {Panel} from '../../../ui/Panel';
import {SplitMeter} from '../../../ui/SplitMeter';
import type {UseVoteAnalyticsReturn} from '../useVoteAnalytics';
import {CAPTION} from './cardStyles';
import {
  engineState,
  networkSubtitle,
  partnerNames,
  partnerNodes,
  partnerTable,
  tierParts,
  type EngineModel,
  type EngineState,
  type PartnerNames,
} from './engineCharts';
import {ENGINE_GROUP_CAP, TIER_SERIES, type EngineSummary} from './engineView';
import type {UseCardSynergiesReturn} from './useCardSynergies';

export interface EnginePanelsProps {
  card: LorcanaCard;
  /** The page's useCardSynergies(card.id). */
  synergies: UseCardSynergiesReturn;
  /** Vote analytics, for the source caption's date alone: the panels never wait for it. */
  analytics: UseVoteAnalyticsReturn;
  /** The card list's lookup: each partner's full and short name. */
  getCardById: (id: string) => LorcanaCard | undefined;
}

const COUNT: React.CSSProperties = {margin: 0, color: ADMIN_COLORS.text};
/** The count is a headline number: Tinos at the KPI size (R-14), as the prototype draws it (dc.html:654). */
const COUNT_NUMBER: React.CSSProperties = {fontFamily: FONTS.hero, fontSize: ADMIN_TYPE.kpi, lineHeight: 1};
const COUNT_WORDS: React.CSSProperties = {fontSize: ADMIN_TYPE.body, color: ADMIN_COLORS.muted};
const FAILED: React.CSSProperties = {display: 'grid', gap: SPACING.md};
const RETRY: React.CSSProperties = {justifySelf: 'start'};
/** The focus wrapper is the view's grid item, so it must shrink as the panel would. */
const PANEL_WRAP: React.CSSProperties = {minWidth: 0};

const CAP_TEXT = `A synergy group lists only its top ${ENGINE_GROUP_CAP} partners.`;
const EMPTY_TEXT =
  'The engine finds no synergies for this card (or its synergy file could not be read). ' +
  "A card revealed after the app's last deploy has no synergy file yet.";

/** "At least 142 synergy partners": the number in Tinos, the words in muted body text. */
function PartnerCount({summary}: {summary: EngineSummary}) {
  return (
    <p style={COUNT}>
      {summary.capped && <span style={COUNT_WORDS}>At least </span>}
      <span style={COUNT_NUMBER}>{fmtInt(summary.partners)}</span>{' '}
      <span style={COUNT_WORDS}>{summary.partners === 1 ? 'synergy partner' : 'synergy partners'}</span>
    </p>
  );
}

/** A read with partners: the count, the cap's caveat, and the split by tier, every tier shown, zeros included. */
function EngineNumbers({summary}: {summary: EngineSummary}) {
  return (
    <>
      <PartnerCount summary={summary} />
      {summary.capped && <p style={CAPTION}>{CAP_TEXT}</p>}
      <SplitMeter parts={tierParts(summary)} ariaLabel="Partners by strength tier" />
    </>
  );
}

/** A failed read and its Retry (R-45). When the next read fails too, Retry's handoff lands back on it (R-48). */
function EngineFailed({error, onRetry, handoff}: {error: Error; onRetry: () => void; handoff: FocusHandoff}) {
  const failedRef = useRef<HTMLDivElement>(null);
  useTakeHandoff(handoff, failedRef, 'button');
  return (
    <div ref={failedRef} style={FAILED}>
      <Notice tone="error">Could not load this card's synergies ({error.message})</Notice>
      <CtaButton type="button" variant="neutral" onClick={onRetry} style={RETRY}>
        Retry
      </CtaButton>
    </div>
  );
}

interface EngineBodyProps {
  state: EngineState;
  handoff: FocusHandoff;
  onRetry: () => void;
}

/** The Engine view's body for each state of the read. */
function EngineBody({state, handoff, onRetry}: EngineBodyProps) {
  switch (state.kind) {
    case 'loading':
      return <Notice>Loading engine data...</Notice>;
    case 'failed':
      return <EngineFailed error={state.error} onRetry={onRetry} handoff={handoff} />;
    case 'empty':
      return <Notice>{EMPTY_TEXT}</Notice>;
    default:
      return <EngineNumbers summary={state.model.summary} />;
  }
}

/** Where the numbers come from. The date waits for vote analytics, whose engine is the one its Deploy built. */
function SourceCaption({analytics}: {analytics: UseVoteAnalyticsReturn}) {
  const generatedAt = analytics.data?.generatedAt;
  const asOf = generatedAt ? `; vote analytics use the engine as of ${fmtDay(generatedAt.slice(0, 10))}` : '';
  return <p style={CAPTION}>Live engine data from inkweave.ink{asOf}.</p>;
}

/**
 * The Engine view panel. Retry asks for the handoff, and the panel's heading
 * takes it once a read lands, with partners or none; a read that fails again
 * hands it to the new Retry instead (R-48).
 */
function EngineViewPanel({state, analytics, ...body}: EngineBodyProps & {analytics: UseVoteAnalyticsReturn}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  useTakeHandoff(body.handoff, wrapRef, 'h2', state.kind === 'loaded' || state.kind === 'empty');
  return (
    <div ref={wrapRef} style={PANEL_WRAP}>
      <Panel title="Engine view" titleFocusable>
        <EngineBody state={state} {...body} />
        <SourceCaption analytics={analytics} />
      </Panel>
    </div>
  );
}

/**
 * The strongest partners as a network, alone in an untitled Panel, as every
 * chart is (R-39). "and K more in the table" switches the frame to its table,
 * which lists every partner, and the frame then focuses it.
 */
function NetworkPanel({card, model, names}: {card: LorcanaCard; model: EngineModel; names: PartnerNames}) {
  const [view, setView] = useState<ChartView>('chart');
  return (
    <Panel>
      <ChartFrame
        title="Strongest partners"
        subtitle={networkSubtitle(model)}
        legend={<ChartLegend series={TIER_SERIES} mark="line" />}
        table={partnerTable(model.partners, card)}
        view={view}
        onViewChange={setView}>
        <NetworkDiagram
          nodes={partnerNodes(model.partners, names)}
          series={TIER_SERIES}
          ariaLabel={`Strongest synergy partners of ${card.fullName}`}
          onShowAll={() => setView('table')}
        />
      </ChartFrame>
    </Panel>
  );
}

/**
 * The card's engine side, from its live synergy file (R3-6c): the Engine view
 * panel, and under it the network in a panel of its own, once the engine pairs
 * the card with anyone. Both run the page's full width, and neither waits for
 * the vote files. CardAnalyticsView renders this last; the page keys the view
 * by card (R-46), so a new card starts on the chart, with no handoff waiting.
 */
export function EnginePanels({card, synergies, analytics, getCardById}: EnginePanelsProps) {
  const handoff = useFocusHandoff();
  const names = partnerNames(getCardById);
  const state = engineState(synergies, names);
  const retry = () => {
    handoff.request();
    synergies.retry();
  };
  return (
    <>
      <EngineViewPanel state={state} analytics={analytics} handoff={handoff} onRetry={retry} />
      {state.kind === 'loaded' && <NetworkPanel card={card} model={state.model} names={names} />}
    </>
  );
}
```

Notes on the code:
- **The captions** (the cap's caveat and the source) use R3-6a's shared `CAPTION` from `cardStyles.ts`, as R3-6b's panels do.
- **`EngineViewPanel`'s wrapper `div`** is there for `useTakeHandoff`, which looks for the `h2` inside a container ref, and `Panel` takes no ref. In the view's grid the wrapper is the grid item, so it carries `minWidth: 0`, as `Panel` does.
- **`retry`** asks for the handoff before it calls `synergies.retry()`. Both state updates land in one render, so the failed view (and its Retry) unmounts in the same render that marks the handoff pending, and no stale view takes it.
- **The network panel's `view`** is the frame's controlled view (`ChartFrame.tsx:105-108`), so "and K more in the table" can open the table. The frame keeps it in step with its own toggle through `onViewChange`.

- [ ] **Step 13: Run both test files and see them pass**

Run: `pnpm vitest run src/tools/analytics/cards/__tests__/engineCharts.test.ts src/tools/analytics/cards/__tests__/EnginePanels.test.tsx`

Expected: `Test Files  2 passed (2)` and `Tests  46 passed (46)`.

- [ ] **Step 14: Put the panels in the view**

R3-6a's `CardAnalyticsViewProps` has no `synergies` (`R3-06a-view-shell.md:7`): this step adds it. Every R3-6a test and story then has to pass one, or the view throws `Cannot read properties of undefined (reading 'loading')`. Typecheck catches the test's `BASE`, but not the stories: `Meta<typeof CardAnalyticsView>` makes every story arg optional.

First the test. In R3-6a's `src/tools/analytics/cards/__tests__/CardAnalyticsView.test.tsx`, add `ENGINE_EMPTY` and `ENGINE_FIFTEEN` to the file's `../cardFixtures` import (it already imports `vi` from `vitest`). Then give `BASE` an empty read, before `getCardById`. Before:

```tsx
const BASE: CardAnalyticsViewProps = {
  card: MAUI_CARD,
  analytics: loaded(VIEW_ANALYTICS),
  voteLog: loaded(VIEW_LOG),
  getCardById: viewCard,
};
```

After:

```tsx
const BASE: CardAnalyticsViewProps = {
  card: MAUI_CARD,
  analytics: loaded(VIEW_ANALYTICS),
  voteLog: loaded(VIEW_LOG),
  synergies: {data: ENGINE_EMPTY.data, loading: false, error: null, retry: vi.fn()},
  getCardById: viewCard,
};
```

An empty read shows only the Engine view's notice, so R3-6a's and R3-6b's cases see no network and no new alert.

Then add this `describe` after the file's last one. It goes through the file's render helper, which takes one options object (the header's Code Health rule); it is called `renderView` here, so use its real name (Step 1):

```tsx
describe('CardAnalyticsView: the engine panels (R3-6c)', () => {
  it('ends with the Engine view and, under it, the network, without waiting for the vote files', () => {
    renderView({
      analytics: {data: null, loading: true, error: null},
      voteLog: {data: null, loading: true, error: null},
      synergies: {data: ENGINE_FIFTEEN.data, loading: false, error: null, retry: vi.fn()},
    });
    const engine = screen.getByRole('region', {name: 'Engine view'});
    const network = screen.getByRole('figure', {name: 'Strongest partners'});
    expect(engine).toHaveTextContent('15 synergy partners');
    expect(screen.getAllByRole('figure').at(-1)).toBe(network);
    expect(engine.compareDocumentPosition(network) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
```

Run: `pnpm vitest run src/tools/analytics/cards/__tests__/CardAnalyticsView.test.tsx`

Expected: the new case fails with `Unable to find an accessible element with the role "region" and name "Engine view"`. R3-6a's own cases, and R3-6b's, still pass: Vitest doesn't typecheck, and the view ignores the extra prop until it takes it.

Then, in R3-6a's `src/tools/analytics/cards/CardAnalyticsView.tsx`, four edits.

Add the two imports beside the view's other `./` imports: `EnginePanels` after `./cardView`'s line, and the type before `./VotedPairsPanel`'s (after R3-6b's `./RawVotePanels`):

```tsx
import {EnginePanels} from './EnginePanels';
```
```tsx
import type {UseCardSynergiesReturn} from './useCardSynergies';
```

In `CardAnalyticsViewProps`, after `voteLog: UseVoteLogReturn;`, add:

```tsx
  /** The page's useCardSynergies(card.id), for the engine panels (R3-6c). */
  synergies: UseCardSynergiesReturn;
```

Replace the view's signature:

```tsx
export function CardAnalyticsView({card, analytics, voteLog, getCardById, handoff, headerActions}: CardAnalyticsViewProps) {
```

with:

```tsx
export function CardAnalyticsView({card, analytics, voteLog, synergies, getCardById, handoff, headerActions}: CardAnalyticsViewProps) {
```

Render the panels as the last child of the view's body grid, after R3-6b's `<RawVotePanels … />`. The fragment's two panels become the grid's last two rows, each the full width (R-39):

```tsx
      <EnginePanels card={card} synergies={synergies} analytics={analytics} getCardById={getCardById} />
```

If Step 1 found an engine placeholder in R3-6a's view, delete it, along with any R3-6a test that pins it.

Last, R3-6a's `src/tools/analytics/cards/CardAnalyticsView.stories.tsx`. Add `ENGINE_EMPTY` to its `./cardFixtures` import, and give the meta's args the same empty read. Before:

```tsx
  args: {card: MAUI_CARD, analytics: loaded(VIEW_ANALYTICS), voteLog: loaded(VIEW_LOG), getCardById: viewCard},
```

After:

```tsx
  args: {
    card: MAUI_CARD,
    analytics: loaded(VIEW_ANALYTICS),
    voteLog: loaded(VIEW_LOG),
    // No synergies: the Engine view's empty notice. EnginePanels.stories.tsx draws the engine side.
    synergies: {data: ENGINE_EMPTY.data, loading: false, error: null, retry: () => {}},
    getCardById: viewCard,
  },
```

Don't merge `partnerLookup(ENGINE_FIFTEEN)` into `viewCard` to draw a network here: id 305 is card 500's unlisted partner (`UNLISTED_IDS`), so listing it would change the LowN story's engine-silent split.

Run: `pnpm vitest run src/tools/analytics/cards`

Expected: every file in the folder passes, R3-6a's and R3-6b's included.

- [ ] **Step 15: Write the stories**

Create `src/tools/analytics/cards/EnginePanels.stories.tsx`:

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {MemoryRouter} from 'react-router-dom';
import {FONTS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {ANALYTICS} from '../overview/overviewFixtures';
import {
  ENGINE_CAPPED,
  ENGINE_CARD,
  ENGINE_EMPTY,
  ENGINE_FIFTEEN,
  ENGINE_ONE_PARTNER,
  partnerLookup,
  type EngineFixture,
} from './cardFixtures';
import {EnginePanels, type EnginePanelsProps} from './EnginePanels';

/** Retry in a story: a static read can't change, so it does nothing. */
const retry = () => {};

/** A settled read of the fixture's file, as useCardSynergies returns it, and the card list's lookup. */
function engineArgs(fixture: EngineFixture): Pick<EnginePanelsProps, 'synergies' | 'getCardById'> {
  return {synergies: {data: fixture.data, loading: false, error: null, retry}, getCardById: partnerLookup(fixture)};
}

const meta: Meta<typeof EnginePanels> = {
  title: 'Admin/Insights/Card analytics/Engine panels',
  component: EnginePanels,
  // The node links are react-router Links, so the story needs a router. The
  // frame stands in for the card view's body: the page colour, its padding and
  // its one-column grid, so the two panels sit apart as they will on the page.
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr)',
            gap: SPACING.xxl,
            background: ADMIN_COLORS.page,
            color: ADMIN_COLORS.text,
            fontFamily: FONTS.body,
            padding: `${SPACING.xxl}px ${SPACING.xxxl}px`,
          }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  args: {card: ENGINE_CARD, analytics: {data: ANALYTICS, loading: false, error: null}, ...engineArgs(ENGINE_FIFTEEN)},
};
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 15 partners: the cut at twelve falls inside the eight at score 7, so the
 * subtitle names the tie, and "and 3 more in the table" opens the table.
 */
export const FifteenPartners: Story = {};

/**
 * A group at the engine's cap: "At least 142", all twelve drawn from the 30
 * tied at 8. Vote analytics are still loading, so the caption has no date.
 */
export const Capped: Story = {
  args: {...engineArgs(ENGINE_CAPPED), analytics: {data: null, loading: true, error: null}},
};

/** One partner: one ring, and every tier in the split, three of them at 0%. */
export const OnePartner: Story = {args: engineArgs(ENGINE_ONE_PARTNER)};

/** No synergy file, or an empty one: the hedged empty copy, and no network panel. */
export const NoSynergies: Story = {args: engineArgs(ENGINE_EMPTY)};

export const Loading: Story = {args: {synergies: {data: null, loading: true, error: null, retry}}};

/** A failed read, with Retry (R-45). */
export const Failed: Story = {
  args: {synergies: {data: null, loading: false, error: new Error('Failed to fetch'), retry}},
};
```

- **The decorator** stands in for the view's body: the page colour and padding, and a one-column grid with the view's 24px gap, so the two panels sit apart as they will on the page. `.storybook/preview.tsx` already mounts `AdminStyles`, so `.adm-net-link`'s focus ring shows.
- **Base args.** Every story starts from the meta's `args`, which hold `FifteenPartners`, and overrides only what it needs.

- [ ] **Step 16: Lint, typecheck and the full suite**

Run: `pnpm lint`, `pnpm typecheck` and `pnpm test:run`

Expected: all three pass, with no warnings in the eleven files. `test:run` builds the engine first.

- [ ] **Step 17: Look at it in Storybook (when a browser is available)**

Start Storybook with the built-in browser's `preview_start` (add a `.claude/launch.json` entry for `pnpm storybook` on port 6007 if there isn't one), and open "Admin/Insights/Card analytics/Engine panels". Check:
- **FifteenPartners.**
  - The count's number is in Tinos, beside muted words. The split has four legend rows.
  - The network's names don't collide, and hovering a node dims the other spokes and shows its tooltip, rules included.
  - "and 3 more in the table" opens the table, focused, with 15 rows.
  - Tab reaches each node link, strongest first, with a visible focus ring.
- **Capped.** The count reads "At least 142", with the cap caption. The subtitle is the all-tied form, with no "Thicker spokes".
- **OnePartner.** One node on one ring, no "Thicker spokes", and three of the split's rows at 0% (0).
- **NoSynergies, Loading and Failed.** Only the Engine view shows. Failed has its Retry under the alert.
- **At 375px wide** (`resize_window` with the mobile preset), nothing scrolls sideways, and the split's legend wraps.

Stop the server afterwards. If no browser is available to the implementer, record each check as pending with the owner, as R1-2's Step 11 did, and say so in the report.

- [ ] **Step 18: Check Code Health (when the CodeScene MCP is available)**

Score `engineCharts.ts`, `EnginePanels.tsx`, `EnginePanels.stories.tsx`, both new test files, `cardFixtures.ts`, `Panel.tsx` and `CardAnalyticsView.tsx` with `mcp__codescene__code_health_review`. Expected: 10.0 each, with no findings. Count by hand too, because the server gate is stricter than the local tool:
- **Cyclomatic complexity:** no function above 5. The highest are `EngineBody` (the `switch`), `engineState` and `whichPartners`.
- **Arguments:** none takes more than 2, apart from `useTakeHandoff`'s existing 4.
- **Primitive arguments in `engineCharts.ts`:** one of 19 (`engineScoreText`'s `score`).
- **Primitive arguments in `EnginePanels.test.tsx`:** none. Its named functions that take anything are `renderPanels(setup)` and `cssColor({color})`, which takes an object so the module stays under 30%.

- [ ] **Step 19: Commit**, with the Bash tool and only after the owner approves. Use two separate calls, so the commit command starts with `USER_APPROVED=1`:

```bash
git add src/ui/Panel.tsx src/ui/__tests__/Panel.test.tsx src/tools/analytics/cards/engineCharts.ts src/tools/analytics/cards/EnginePanels.tsx src/tools/analytics/cards/EnginePanels.stories.tsx src/tools/analytics/cards/cardFixtures.ts src/tools/analytics/cards/CardAnalyticsView.tsx src/tools/analytics/cards/CardAnalyticsView.stories.tsx src/tools/analytics/cards/__tests__/engineCharts.test.ts src/tools/analytics/cards/__tests__/EnginePanels.test.tsx src/tools/analytics/cards/__tests__/CardAnalyticsView.test.tsx
```

```bash
USER_APPROVED=1 git commit -m "feat(cards): add the engine view and the network panel (#24)"
```

Husky's pre-commit runs lint and the tests. If Vitest fails to start its workers under load, stop this session's preview servers (Step 17's Storybook included), wait out other sessions' runs, and retry.

### Hand-offs from R3-6c

- **R3-7 (the page).** Already in R3-7: `useCardHandoff` asks when the URL changes, so node links need no hook.
- **R3-9 (docs).**
  - The plan commit records `titleFocusable` and the cards row; R3-9 checks them.
  - **"R3 as built":** the subtitle's three forms (note 4), and focus after Retry going to the Engine view's heading.
  - **The real-data check:** read the network's subtitle on a card whose drawn twelve include stronger partners above a tie at the cut, and on one whose drawn twelve all share a score. Expect the two forms of note 4.

<!--
Review notes applied 2026-10-06 (all ten verified against the repo at aea40b4 and the sibling task files; none rejected).
- Note 1: applied. Step 1's stories grep is `getCardById: viewCard`, not `args:`, which matches three lines in R3-6a's stories (the meta and two multi-line stories). Re-verified in sandbox-R3-6c-fix2 (sandbox-R3-6a plus this task, no R3-6b): 199 of 199 across the cards folder and Panel (the reviewer counted 203 in a sandbox whose file set differed), tsc exit 0, 15 of 15 stories render.
- Note 2: applied, with the owner's alternative recorded in note 7.
- Note 3: applied; `ADMIN_TYPE` and `ADMIN_COLORS` stay imported in EnginePanels.tsx (the count's styles use them).
- Note 4: applied; the cardStyles grep joins the list, so "the first eight greps".
- Note 5: applied.
- Note 6: applied; note 13's node-link bullet now points at R3-7's useCardHandoff too.
- Note 7: applied. Also added `expect(network()).not.toHaveTextContent('Thicker spokes')` to the one-partner panel test: toHaveTextContent matches a substring, so the new expectation alone would still pass with the clause printed.
- Note 8: applied. "How it draws" has no o'clock in it, so nothing changed there. Test titles keep their curly apostrophes, as the repo's do (BarChart.test.tsx:349, chartData.test.ts:111).
- Note 9: applied; CodeScene MCP scores the file 10.0.
- Note 10: applied. The R3-6a hand-off's wording replaces the one R3-6b's hand-off (R3-06b-vote-panels.md:116) proposed.
-->
