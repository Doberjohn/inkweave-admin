# R: Admin redesign (implementation plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild admin as one dashboard with a collapsible sidebar and a darker, more neutral theme, following the Claude Design handoff. Every existing capability keeps working.

**Architecture:**
- **Theme.** A new admin theme module (`src/theme/`) composes the darker neutral palette from the app's tokens: the neutral ladder is `hexRgba(COLORS.gray400, α)` over `COLORS.background`. `gray400` keeps the handoff's cool cast, while white drifts warm. It maps the handoff's type and radius values onto the app's scales, so admin still passes the app's design-token lint rules in full, with no app change and no new lint exception.
- **Styles and primitives.** A scoped stylesheet (`AdminStyles`), the house pattern from `WebAnalyticsView`, gives hover and focus states. A small set of UI primitives (`src/ui/`) carries the repeated pieces: panels, KPI cards, segmented controls, bars and pills.
- **Shell.** The shell becomes a sidebar layout. Pages render through one `PageLayout` (title, subtitle, meta, the branch notice on pages that write). The analytics artifacts are fetched once per session, through a promise cache.
- **Phasing.** The work ships in four phases, R1 to R4. Each phase leaves admin working and is reviewable on its own.

**Tech stack:** React 19, react-router 7, inline styles plus scoped `<style>` blocks with interpolated tokens, Vitest 5 + Testing Library (jsdom), Storybook 10, the app's tokens and kit through `src/app-bridge.ts`.

**Spec:** the Claude Design handoff of 2026-10-01, a README plus the prototype `Inkweave Admin.dc.html`. It lived outside git, in the owner's working copy only, and was retired when R4 shipped (owner, 2026-10-01; R-88). So the `docs/redesign/handoff/…` paths and `dc.html` lines that the task files cite no longer resolve, and those files record what the handoff said. The spec's own fixtures were sample data. Where this plan and the spec disagreed, **this plan won**: "Corrections to the spec" lists every case, from the 2026-10-01 review of the handoff against the code and from R4's decisions (R-91).

**Tracking:** Doberjohn/inkweave-admin#24. Branch: one per phase: `feature/24-admin-redesign` (R1), `feature/24-redesign-r2` (R2), `feature/24-redesign-r3` (R3), `feature/24-redesign-r4` (R4); one PR per phase.

**Status:** R1 built and checked against real data on 2026-10-02; see "R1 as built". R2 built, checked against real data and merged on 2026-10-06 (PRs #27 and #28); see "R2 as built". R3 built, checked against real data and merged on 2026-10-07 (PR #31); see "R3 as built". R4 built, checked and rehearsed on 2026-10-16; see "R4 as built". R4's PR completes the redesign; #24's closing comment records its merge.

**Task files:** each task's own file under `R-redesign/` was removed once the redesign shipped (#110). Every mention of one in this plan (a task link, a `R4-card-studio.md:23`-style citation in the decision tables, the contract additions the phase sections point to) refers to that file in commit 2ed41e8, the last that has them: [R-redesign/ at 2ed41e8](https://github.com/Doberjohn/inkweave-admin/tree/2ed41e8edbe6b5afce6e0db3f8a974ea21354cd7/docs/plans/R-redesign).

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

## Decisions for R2 (owner, 2026-10-05)

The R2 outline's open questions, settled before re-basing it. All twelve follow the recommendations.

| # | Decision | Detail |
|---|---|---|
| R-17 | `playstyleId` comes from the analytics artifact | The precompute adds `playstyleId` to each rule (`loadRuleRoster` in `scripts/precompute-vote-analytics.mjs`, `rollUpByRule` in `scripts/lib/voteAnalytics.mjs`, `RuleStat`). So the rule list, the tuning key and the section all come from the app's `master`, and a pin lag can't make them disagree. Until a Deploy writes the field (old artifacts, local snapshots), the mapping falls back to the pinned engine's `getRuleById`. |
| R-18 | Reload keeps edits that still apply | After a stale-value conflict, "Reload tuning.json" keeps every pending edit whose old value still matches the reloaded file, and drops only the stale ones. It says how many it dropped. |
| R-19 | Unsaved edits are guarded | Leaving `/calibration` with pending edits asks first: a react-router `useBlocker` for in-app navigation and a `beforeunload` handler for tab close or reload. The guard is a reusable hook that R4's Card studio also uses. |
| R-20 | No new tuning entries in R2 | The six direct rules with no `tuning.json` copy stay selectable for their pairs, and the aside says "No copy in tuning.json". Adding `directRules` entries is an app change, outside R2. With no token and no analytics, the rules table stays empty behind the token gate: no read-only fallback. |
| R-21 | A shared entry names its rules | A tuning key several rules share (Locations: 9 rules) heads the aside with the tuning name and "Shared by N rules", and labels the gap with the selected rule's name. |
| R-22 | "Inspect" where there's nothing to tune | The Overview's "Rules to review" link reads "Tune" for a rule with a tuning entry and "Inspect" for one without; both open `/calibration?rule=<id>`. |
| R-23 | Scatter: opaque dots, diagonal jitter, one size | Opaque dots, each on its own page-coloured disc, spread along the diagonal by a fixed per-pair jitter (±0.35 along, ±0.035 across), widest gaps on top, and a "pairs on these scores" tooltip line. Translucent dots would fail 3:1. One dot size for every pair. |
| R-24 | Histogram and trend shapes | Gap bins are one point wide, centred on whole numbers, with everything beyond ±5 folded into the end bins; R2's real-data check confirms ±5. The weekly score votes draw as an area under the gap line, so each week lines up. |
| R-25 | Later, not R2 | A "Votes: Any / 2+ / 5+" filter, and clicking a histogram bar to filter the other charts. The votes filter came with #33 (see "#33: the votes filter"); the histogram bar filter is still open. |
| R-27 | A fainter fill on selected rows | R2-3's option (a): `ADMIN_COLORS.rowSelected` = `hexRgba(COLORS.primary, 0.05)` fills a pressed `adm-row-btn`, hovered or not, so red gap text on a selected row reaches 4.58:1 (the 0.06 tint gave 4.50:1, and 4.15:1 hovered). R2-3 and R2-4 implement the (a) parts and skip (b). The sidebar's "Forget token" still drops unpublished tuning edits without asking (a noted limit). |
| R-26 | Rejected token on a write page | When GitHub rejects the saved token (401), the tuning aside's error offers "Forget token" (the shared store), so the gate comes back without a trip to the sidebar. |

## Decisions for R3 (owner, 2026-10-06)

The R3 outline's open questions, re-checked against R1 and R2 as built (audit workflow, 2026-10-06), plus the questions the audit raised. The owner took every recommendation. Q10 (score-band histogram colours) and Q11 (keep the tier split beside the network, zero tiers shown) were already settled by R1 and R2.

| # | Decision | Detail |
|---|---|---|
| R-28 | First visit to `/cards` (Q1) | Show a "Pick a card" prompt with a "Cards to review" list under it: the 5 cards with at least 10 score votes on engine-scored pairs, widest mean gap first. The list appears once vote analytics loads. Later visits open the last card viewed, stored under `inkweave-admin.last-card`. Opening a card automatically would make the header wait for the vote files. The list works like the Overview's Rules to review (`rulesToReview`, overviewStats.ts:47-55). On the 2026-10-05 data, 36 cards qualify and 19 of them are outside ±0.5, so the list always has rows. The storage key follows admin's own `inkweave-admin.sidebar-open` (Sidebar.tsx:11). |
| R-29 | An unknown id that still has votes (Q2) | Show the not-found message only, and forget the id as planned. Copy: "No card has the id N in the current card list. Cards from sets before 9 rotated out of Core, and a preview id changes when its card is released." The files have no names for these ids: all 451 unknown voted ids have `aName === id`, and `pairs[]` never contains them. Vote sections would show bare numbers. |
| R-30 | Switcher search (Q3, and R3-5's question about ids) | Use the app's `useAutocomplete` as it is: names only, two letters, newest set first, up to 6 results. Add a polite "No cards match." status. It comes from a bridged `searchCardsByName` run on the live query, and shows only while the list is closed. Running the hook's own check on the live query avoids the 150 ms flash. A combobox built in admin would redo R2's focus and ARIA work. An id already works in the URL. R4's full-page search can keep `filterCards`. |
| R-31 | Engine-silent pairs (Q4) | No KPI. Put a caption in Voted pairs that splits the count in two: pairs whose partner is outside the current card list, and pairs with both cards in Core that the engine still doesn't score. Open a follow-up issue for the Overview KPI's hint. 1,587 of the 1,621 engine-silent pairs involve a card outside Core, so a gold KPI on a Core card mostly counts rotation. R2 used a caption for the same thing (CalibrationScatter.tsx:129-131). The handoff's KPIs don't include it (README.md:85). |
| R-32 | Where Accuracy sentiment comes from (new) | Compute it from the card's raw accuracy answers: the share of "too low" minus the share of "too high", as the prototype does. Give it the raw tag, with the answer count in the hint. R3-1 then drops its `PairStat.accuracySentiment` edit. `pairs[]` has a sentiment on only 21 of 954 pairs (933 are null), so the planned KPI would read "—" on almost every card. The vote log has 234 accuracy answers across 262 cards, and only 32 of those answers are on `pairs[]`. The prototype tags it raw (README.md:85, dc.html:958). The Overview's own KPI rests on the same 21 pairs, which is another follow-up issue. |
| R-33 | Links into `/cards` (Q5) | Yes, in a new task R3-8. Add `cardsHref(cardId?)` to `src/shell/nav.ts`, beside `calibrationHref`. Card names become links in Activity's vote log and Most voted pairs, the Overview's Latest votes, and Calibration's vote-detail heading, but only for ids the card list resolves. PairList rows stay buttons. R2 set this pattern (nav.ts:44-50, R-22), and R4 expects a path helper (R4-card-studio.md:23). 60% of log votes involve an id outside the card list, so those names stay plain text. A link can't sit inside PairList's button rows. |
| R-34 | Links from the card page to `/calibration` (new) | Each rule in the card's rules table links to `/calibration?rule=<id>` through `calibrationHref`. The engine view keeps rule names only, renamed `ruleNames`. It takes one click from a card's badly scored rule to its tuning, and `CardRuleRow.ruleId` already holds the id. Rule links from the engine view can come later. |
| R-35 | Low-n rules in the card's rules table (new) | Sort them last as planned. Within each group, sort by absolute gap, then score votes, then name. Show R2's "low n" chip, moved into `src/ui`. Most of a card's rules are low n (the median card in `pairs[]` has 2 score votes). Sorted by gap alone, 1-vote rules would top the table. |
| R-36 | Votes per week (Q6, and R3-3's question about the series) | Cover the vote log's whole span (`activityWindow(votes, 'all')`) in Monday weeks, as one series with the latest week in the accent colour, as the prototype draws it. Name part weeks with `bucketTitle` and `partialWeeks`. A 12-week window holds 17.5% of votes and leaves 29% of voted cards with an empty chart. R2's weekly gap already uses the whole log's span (chartData.ts:265-287), and PR #28 named its part weeks. The prototype draws one series with a gold last bar (dc.html:966). |
| R-37 | Network size and order (Q7, and R3-4's tie-break) | Keep 12 partners on two rings. Order them by score, then card name, which is how the engine cuts each group (SynergyEngine.ts:124-128). When the 12th place falls inside a tie, the subtitle says so, e.g. "12 of the 30 partners at score 8, by name". As built, a capped card's tie reads "12 of at least 30 partners at score 8, by name", since its file holds only each group's top 100 partners (R3's final fix wave; see "R3 as built"). Scores are whole numbers, and the 12th partner shares its score with a median of 27 others. Breaking ties by id would draw an arbitrary slice and still call it "the 12 strongest". |
| R-38 | The hub (Q8) | Draw a dot with no name. Two rings are the normal case, and a name in the centre crowds the inner ring's strongest names. The page header and the name of the node list already name the card. |
| R-39 | Where the network sits (Q12) | In its own untitled `Panel`, full width, directly under the Engine view panel. Every R1 and R2 chart frame sits alone in an untitled Panel, and `titleLevel={3}` is used nowhere yet. Beside another panel, names would get about 40px on each side. |
| R-40 | Network label widths (new) | Measure labels with the kit's `textWidth` estimate (scale.ts:123-130) instead of the DOM. Check again at the real-data check if too many names drop. The estimate gives the same result in tests and in the browser. It removes the layout effect, the `fonts.ready` branch and the SVG patch in the tests, and much of the complexity. The cost: about 20% more names move to the tooltip and the table. |
| R-41 | Network interaction (new) | Follow the kit. Hover dims the other spokes (`.adm-chart-mark`, others at 0.4). Each node link's accessible name is its tooltip text (`tooltipText`). Stories go in `Charts.stories.tsx`. A tap follows the link, and on a phone the table view carries the scores. This keeps one emphasis rule and one naming rule across the kit, and no component-level `<style>`, since AdminStyles is the one stylesheet. Showing the tooltip on the first tap would break how links work. |
| R-42 | The split bar (Q9, and R3-4c's two follow-ups) | Make it a `src/ui` primitive beside MeterBar: one full-width bar over a track, as the prototype draws it. Its legend prints each part's share and count. No tooltip, no Chart/Table toggle, and a "No answers yet" state. CLAUDE.md now requires a keyboard-reachable tooltip and a Chart/Table toggle on every kit chart. R1 and R2 kept meters that print their values in `src/ui`. The planned SplitBar scored 9.44 (cc 20). Only 53 cards have 3 or more accuracy answers, so the centred form adds little. |
| R-43 | How shares print (new) | Use R2's `sharePercent` everywhere in R3: each part rounds on its own, with "<1%" and ">99%". Move it to `src/ui/format.ts`, and drop largest-remainder rounding. R2 ruled that a part with votes never reads 0% (chartData.ts:197-207). Largest remainder prints "0% (1)", and equal counts can print different shares. |
| R-44 | Tier legend labels (new) | Keep the app's thresholds as planned ("Strong ≥7"). They are `getStrengthTier`'s own cut-offs (scoreUtils.ts:18-23), and they stay true if scores ever stop being whole numbers. |
| R-45 | A failed synergy fetch (new) | Offer Retry. The hook returns `retry`, as the card list's error already offers one. A failed fetch isn't cached (usePrecomputedSynergies.ts:63), so a retry fetches again. |
| R-46 | State when switching cards (new) | Key the whole view by card id (`<CardAnalyticsView key={card.id}>`). Every frame's Chart/Table toggle, the pair list and the network's hover then reset. One route element serves every id, so state would carry over to the next card. In a test, following a partner link left a tooltip on a node that no longer matched anything. |
| R-47 | Voted pairs beyond 10 rows (new) | Use R2's `PairList` pattern: one list that scrolls inside the panel, with no "Show all" button. There is no button to vanish from under focus, and it matches /calibration. Most cards have few voted pairs anyway. |
| R-48 | Focus after a card change (new) | Focus moves only when its control disappears. After a switcher pick, it stays in the switcher. After a partner link or a successful Retry, it goes to the new card's `h2`, through R2's focus handoff moved to `src/shell`. This is R2's rule (F2, F19, F4). The switcher stays on the page; a partner link and the Retry button don't. |
| R-49 | Printings in the card header (new) | Leave them out. Show the base rarity through `rarityConfigOf` and `RaritySymbol`, or nothing for a card without one. R-3: printings aren't rarities, and this page is about the card's pairs. |
| R-50 | The Overview's verdict headline (new) | Fix it in R3-5b. `Verdict` gains a phrase ("is well-calibrated", "runs generous", "runs harsh", and "has too few score votes to judge" for no data), used by the Overview card and the card page. Today the Overview can read "The engine well-calibrated" or "The engine not enough data" (CalibrationCard.tsx:83). R3-5b already edits that file. |
| R-51 | The browser tab title on a card (new) | "{card name} · Card analytics · Inkweave admin", through an optional `documentTitle` prop on PageLayout. Today every card page has the same title (PageLayout.tsx:93-95), so tabs and history can't tell cards apart. The change is one optional prop. |
| R-52 | A scatter or histogram of the card's own pairs (new) | Not in R3. Define `CardPair` as `PairStat` plus `partnerId` and `partnerName`, so R2's pair helpers accept it and a scatter can be added later. R-13 names only the network for R3, and per-card data is thin. |
| R-53 | Where GapScale lives (R3-5b) | `src/tools/analytics/GapScale.tsx`, beside verdict.ts. No module outside stories and tests in `src/ui`, `src/charts`, `src/theme` or `src/shell` imports from `src/tools`, and both callers are under analytics. |
| R-54 | DataAsOf (R2's held item F12) | Release it: `src/ui/DataAsOf.tsx`, taking `{generatedAt}` and printing a bare `<code>`. Switch the four existing pages to it in the new shared-pieces task (R3-1a). /cards would otherwise add a fifth copy (ActivityPage.tsx:7-13, CalibrationPage.tsx:25-31, OverviewPage.tsx:19-23, WebAnalyticsPage.tsx:17-23). |
| R-55 | Bridge only what R3 uses (R3-1) | Drop `type PrecomputedPairData` and `type StrengthTier`. Keep `type UseAutocompleteReturn`, which types the switcher's option row, and add `searchCardsByName` (R-30). No R3 or R4 task uses the two dropped types. R1-12 dropped unused re-exports on the owner's word (R-redesign.md:583). |
| R-56 | Branch and first commit (R3-1) | Work on `feature/24-redesign-r3`. The re-based plan, split into one file per task as R2's is, and this table go in first, after the owner approves. This is R2's convention (R2-calibration-tuning.md:493-494). R-redesign.md:17 still names the R1 branch. |

## Decisions for R4 (owner, 2026-10-07)

The R4 outline’s open questions, re-checked against R1 to R3 as built, main b490fb7, pin bc877e1 and app master 16283a13 (R4 audit, 2026-10-07), plus the questions the audit raised. The owner took every recommendation, and settled R-73’s check: every number past the set is an alternate-art printing of a card in the set. Q4 (the links between the studio and `/cards`) and the gate's placement were already settled by R3 and R1-7; the R4 header lists them.

| # | Decision | Detail |
|---|---|---|
| R-57 | Mode switch (Q1) | Keep both drafts mounted and never ask on a switch. The switch pushes `studioHref(mode, card)`, so Back returns to the other mode. It keeps `?card=` and sits in PageLayout's `actions`. Update SegmentedControl's doc comment (SegmentedControl.tsx:10-16), which still expects the studio to reset on a switch. **Evidence:** R2-5a's hand-off already wires this: one guard whose `leaves` holds a card change and never a mode switch (R2-05a-unsaved-guard.md:678-693). Asking on a switch would need a second hold, and the router keeps only one blocker (useUnsavedChangesGuard.ts:30-33). The cost is one previewCards.json read per visit, even in New mode. |
| R-58 | Unsaved guard wording (Q9) | Mount one `UnsavedChangesGuard` in StudioWorkspace, as R2-5a's hand-off specifies, and drop the outline's `useUnsavedGuard`. Make one additive change in src/shell: `message` may also be `(to: Location) => string`, fed by the held `blocker.location`. A card change then names only the Edit draft. Leaving `/studio` names every dirty draft. While a publish or save is in flight, the dialog uses R2's wording (CalibrationPage.tsx:20), moved into a shared helper. **Evidence:** `message` is a fixed string today (UnsavedChangesGuard.tsx:92-98), and the hook returns only blocked, stay and leave (useUnsavedChangesGuard.ts:55-60). /calibration keeps its string. |
| R-59 | Focus, keying and the tab title in Edit (Q10) | Apply R3's rules. The page holds one `useFocusHandoff` and requests it from state, never on a click: when the URL's card changes (except on a REPLACE), when a failed read's error clears, and when Load it again's re-read lands. Targets: the Editing banner's h2 (tabIndex -1), the search field after "Load a different card", and the outcome line when Publish or Save leaves focus on `<body>`. Key the editor view by card id (R-46), and pass `documentTitle` "{fullName} · Card studio" (R-51) and `scrollKey={studioHref(mode, card)}`, so every mode or card change opens at the top (owner, 2026-10-07). **Evidence:** R-48 and R3-7: a router link's navigation renders as a transition, so a request made on click lands on the old view (CardAnalyticsPage.tsx:28-50). |
| R-60 | Scan languages (Q2) | Add French to `SCAN_LANGUAGES`. Keep an extra option for any other code, named in English through `Intl.DisplayNames` as CardTranslationPanel does, both in the select and in the change list. **Evidence:** mid-season, 18 of 182 cards were marked, one of them `fr` (14188, before ac6968ff). No card on master is marked today, but one printing is (14213, `it`). Widening `ScanLanguage` keeps `RevealCardForm`'s shape, and reveal-sync never sets the field (adjudicate.mjs:474-493). The app's integrity test accepts any two-letter code except `en`, so the outline's worry about that check doesn't apply. |
| R-61 | Released cards (Q3) | A short read-only facts list, not a disabled form. It shows name and version, set and number, the inks as named InkIcons, type, cost, inkwell and rarity, then "Card data comes from LorcanaJSON; only the image can be replaced here." Copy the wording of R3's one-line `cardFacts` (cardView.ts:104-107), or move it to a shared module, rather than importing from analytics/cards. Leave out the synergy panel for image-only cards. **Evidence:** released cards are Edit's common case: 1,024 of the 1,228 searchable cards, and every card once set 14 graduates (release 2026-10-23). About 20 disabled controls at .45 opacity would fail R-6's contrast and suggest the card can be edited. |
| R-62 | App-repo docs (Q5) | After R4 merges, file one inkweave issue, as R1 did with inkweave#701. It covers: CLAUDE.md:225's tool names and its bridged-module list (add R2's DialogShell, R3's usePrecomputedSynergies and scoreUtils, and R4's InkwellIcon), and START_REVEAL_SEASON.md's "reveal publisher" mentions and its `/reveal` link. R4-8 drafts it, and it is filed on the owner's word. **Evidence:** the app's list already lags R2 and R3. The `/reveal` redirect (R-10) keeps the link working, so R4 doesn't wait on the issue. |
| R-63 | Tab order at wide widths (Q6) | Put the card first in the DOM when wide and the form first when narrow, as the handoff orders them (README.md:112). StudioWorkspace already knows its layout. Render the three slots as keyed children, so React moves them instead of remounting them. **Evidence:** with the form first in the DOM at wide widths, focus would run through columns 2 and 3, jump back to column 1, then go to column 4 (WCAG 2.4.3). No R1-R3 layout places anything out of DOM order. |
| R-64 | Wide threshold (new) | Measure what the handoff measured. Set `STUDIO_WIDE_MIN` to 1328 against `useContainerWidth`'s content box: the handoff's 1360 border box less its 16px padding on each side. Keep the narrow accordion below that, and look again at the owner's rehearsal. **Evidence:** `useContainerWidth` reads `contentRect` (upstream useContainerWidth.ts:17), while the prototype used `getBoundingClientRect` (dc.html:675-678). Even so, the wide layout needs a 1608px window with the sidebar open, or 1432px with it collapsed, in Chrome or Edge, where the page reserves an 8px scrollbar gutter (measured at the rehearsal, 2026-10-15; planned as about 1600px and 1425px). So 1366px screens get the accordion, and 1440px ones get it only with the sidebar open. |
| R-65 | Image-only preview cards, and entries the form can't hold (Q7, new) | Keep `editKindOf`'s rule: a preview entry outside `REVEAL_SET_CODE`, or with no number, opens image-only. Also fail closed: an entry opens with editable fields only when it round-trips through the form (`roundTrips`). Say why on screen, with one message per case: "No collector number yet: numbering it changes its id, which goes by PR", "Admin's pin names set 14; bump the pin to edit this card's fields", and "This entry holds data the form can't". Cover each case with a fixture. **Evidence:** none of these cases exists today. All 204 entries at the pin and on master are set 14, numbered and keyword-only, and all round-trip. A hand edit could add one, and a field edit would then silently rewrite it. |
| R-66 | Cards only in the branch file (Q8) | Add them to the search. The list is the card list plus every branch-file entry it lacks, tagged Preview and "not deployed yet", with no "View card analytics" link (R-33). Reload Edit's file after a New reveal publish, so the new card opens at once. A reveal-band id that the card list holds but the branch file lacks (after graduation) gets no save, with a "no longer in previewCards.json" message: R-29 notes that a preview id changes when its card is released. An id in both lists reads as Released, since allCards wins (loader.ts:172, :195). Fix the New reveal note's "~2-3 min" (RevealPage.tsx:26) to the runbook's 15 to 20 minutes (REVEAL_RUNBOOK.md:34). **Evidence:** R2 built the calibration list the same way (calibrationModel.ts:67-87). A commit takes 15 to 20 minutes to reach inkweave.ink, so without this a just-published card can't be fixed for that long. The engine's `transformCard` sets no `imageUrl`. The app's own wrapper is private at the pin and is exported as `transformRawCards` on master, so without R-85 a fallback card shows no current art until it deploys. |
| R-67 | How strict the stale check is (new) | Compare only `EDITABLE_CARD_KEYS` plus id, setCode and number. Merge the changes into the entry as it stands at the base commit, so `variants` come from there. Every key the edit could touch still fails closed. Add a test where the base gained `variants` and the edit lands with them. **Evidence:** variant printings land often: 7 variant commits from 2026-09-30 to 2026-10-05, and 24 variant-bearing cards at the pin against 38 on master. A whole-entry check would refuse every pending edit of those cards over a key the edit can't touch. |
| R-68 | "Load it again" after a refusal (new) | Keep the edits that still apply and say how many were dropped, as R-18 rules for tuning. A changed form field is kept when the fresh entry's value for it still equals the value the draft started from. A staged image is kept too. **Evidence:** under R-67, a refusal means someone changed one of this card's own fields, so most of the draft usually still applies. The outline drops the whole draft (R4-card-studio.md:500-504). |
| R-69 | A save that lands after leaving the card (new) | Drop its outcome, as R2 does. Result, error and stale clear whenever a new card or a followed read re-seeds the draft, and a save's outcome applies only while its seed still matches. **Evidence:** the guard already asks while a save is in flight, and R2's wording says "you won't see whether it landed" (CalibrationPage.tsx:20). The image tool cleared these on a card change (useImageAdmin.ts:81-82) but then showed a late result on the next card. |
| R-70 | After a save in Edit (new) | Keep the card open. The saved values become its new baseline, the staged image clears and the outcome shows. Record this as a departure from the image tool. **Evidence:** the image tool dropped the card after a publish (useImageAdmin.ts:92-95). The studio's card is URL state, and the operator often checks the result or edits again. |
| R-71 | Image fixes when previewCards.json can't be read (new) | Don't make them wait. A card whose setCode isn't `REVEAL_SET_CODE` is released and image-only straight from the card list. Only set-14 cards wait for the file, which decides preview or released. A failed read shows its error and Retry, plus Forget token on a 401, beside the search rather than in place of it. **Evidence:** the image tool never read the file. As outlined, any failed read would block image fixes for all 1,024 released cards. **As built (R4-8a):** only a reveal-set card under a preview id waits, so a released set-14 card such as 3286 opens from the card list at once too. An image-only save of a card under a preview id reads the file at its base commit, and is refused once the file no longer holds the card (R4-8a, R4-8f). |
| R-72 | Errors on a blank form (new) | Treat a blank required field as "incomplete": a neutral dot, no inline error and no `aria-invalid`, and the checklist names what's left. Show red only for a filled value that fails (a malformed number, the ink-block clash, a collision, glyph words) or for a file that fails its byte check. One pure studio helper, for example `visibleErrors(form, errors)`, decides this for the dots, the fields and the file input. validateForm.ts stays unchanged. **Evidence:** the validator reports every blank required field (validateForm.ts:32-48, :73-81) and "Upload a card image", so a fresh New form would open with red sections and an invalid file input. The handoff's dots turn "green when complete" (README.md:112). This rule also makes R4-3's test "a Character with no lore leaves type incomplete" true. |
| R-73 | Collector numbers past the set (new) | Refuse them in New reveal. validateForm.ts rejects a number above `SET_TOTAL` with "#N is past the {SET_TOTAL}-card set: special printings go in through `variants.mjs stage`". This replaces the test that the ink check is skipped there (validateForm.test.ts:71). The signature doesn't change, and reveal-sync's numbering gate skips such numbers first (gates.mjs:84-97). **Evidence:** at the pin, #205-242 are set 14's Epic, Enchanted and Iconic printings (revealSet.ts:96-105). The publisher would add one as a card (REVEAL_RUNBOOK.md:42), and its id would collide with the printing that `variants.mjs` adds later. **Settled (owner, 2026-10-07):** every number past the set is an alternate-art printing (Epic, Enchanted, Iconic) of a card in the set, so every number above `SET_TOTAL` is refused. |
| R-74 | Enchanted in the studio's rarity picker (new; revisits R-3) | Leave Enchanted out, filtered in the studio, so `RARITIES` (constants.ts:25-32, a reveal-sync contract file) stays as it is. **Evidence:** R-3 (2026-10-01) removed only Epic and Iconic. Since then PR #23 added `variants.mjs`, and CLAUDE.md now says Enchanted printings are never cards. No card on master has an Enchanted rarity (0 of 204). This is the owner's call, since it reverses R-3's Enchanted half. |
| R-75 | The ink picker (new) | Follow the handoff's behaviour. The second-ink row leaves out the primary ink. Picking a primary that equals the second ink clears the second. The label reads "Ink · {name}". Keep admin's one selected look, adm-card-btn's gold pressed state (AdminStyles.tsx:92), with the InkIcon naming the ink. **Evidence:** the handoff's rules are at README.md:119 and dc.html:218, :769. A per-ink fill would need `data-ink` rules and a wider colour check in AdminStyles.test.tsx (:95-102). |
| R-76 | Edit search with a blank query (new) | List the branch file's preview cards first, then the rest, capped at `SEARCH_LIMIT` (40) with the total, as now. **Evidence:** the card list puts preview cards last (loader.ts:195-198), so a blank query today shows set 9's oldest cards, while field edits apply only to preview cards. After graduation the file is empty, and the order falls back to the card list's. |
| R-77 | Per-row revert in Edit's change list (new) | Not in R4. Offer Discard (all) and Revert image, as the handoff draws them (dc.html:253-260). File per-row revert as a follow-up if it's wanted after use. **Evidence:** per-row revert would make every `ChangeRow` carry the form fields it restores, and one field can feed several card keys (type sets five). R2's tray has per-row revert (F23) because tuning edits are independent rows. |
| R-78 | Edit's commit message (new) | Use `fix(reveals): update {fullName} ({setCode}{number})`, adding " and its image" when an image is committed too. When the edit removes `scanLanguage` (admin#14's case), use `fix(reveals): refresh {fullName} ({setCode}{number}) to its English scan`. An image-only save keeps commitCardImage's message. **Evidence:** the app's history already reads this way: the parenthetical is commitNewCard's (app #408, 6a1ca652), and the refresh wording is ed89b608's ("fix(reveals): refresh Arthur 14193 to its English version"). It costs one small helper. **As built:** the parenthetical reads "(1485)" for set 14's #85, as commitNewCard's does. The rehearsal raised it, and the owner kept it (2026-10-15). |
| R-79 | Guards beyond the merge (new) | Add one. `replaceCardInPreviewJson` refuses a `scanLanguage` that isn't a two-letter code other than `en`, mirroring the app's integrity test (reveal-set-integrity.test.ts:153-157). Skip the ink guard: the validator's ink-block check already pins the first ink (validateForm.ts:61-71). **Evidence:** app master has no ruleset, so a commit that fails the app's CI still lands. |
| R-80 | Printings' English refresh, and admin#14 (new) | Out of R4. Edit card refreshes cards, never printings: it keeps `variants` as loaded (R-2), and its search lists cards only. Document a printing's refresh as a hand edit in the app, and bring the runbook's :102 and :108 up to master's #728 wording now. Close admin#14 on R4's merge with this noted. File a follow-up (for example `variants.mjs refresh <number>`) only if the owner wants one. **Evidence:** master has one such printing today: 14213 (the Epic of 14085) is marked `it`. |
| R-81 | Where `studioHref` lives (new) | In src/shell/nav.ts with `type StudioMode`, beside `calibrationHref` and `cardsHref` (nav.ts:49-60). studioPaths.ts keeps `studioModeOf` and `shouldBlockStudioNavigation`. **Evidence:** CLAUDE.md says nav.ts builds the links into pages, and R-33 put `cardsHref` there. Elsewhere, Card analytics' "Edit in Card studio" would have to import from tools/studio. nav.ts would go from 4 string parameters to 6; it passed R3's gate with only string parameters, but count them and run analyze_change_set before the push. |
| R-82 | The "Edit in Card studio" link (new) | A react-router Link, built in CardPageBody's 'card' case and passed as `headerActions` (CardAnalyticsView.tsx:28, :82), styled like PanelLink (overview/PanelLink.tsx:13-21). Switch the story's CtaButton (CardAnalyticsView.stories.tsx:78) to the Link. **Evidence:** navigation is always a Link (global constraints). CardPageBody already holds the card (CardPageBody.tsx:176-177), so the page passes nothing new. No adm-* class draws the handoff's bordered link, and one link doesn't justify a new class. |
| R-83 | Rarity symbols and admin#32 (new) | Draw every rarity the picker shows through `RaritySymbol`. Fold #32 into R4 as one small task: /web's BreakdownCards draws its printings through RaritySymbol, and the three webp re-exports and their comment (app-bridge.ts:74-82) go. **Evidence:** at the pin, RaritySymbol draws enchanted, epic and iconic (RaritySymbol.tsx:7-21), so the bridge comment is wrong and already misled the outline. R4 edits the bridge anyway. **As built:** PR #40 made the same change on main first and closed #32. The merge of main into R4 (8850e5b) kept #40's version, and R4-5h's `RARITY_PROP` doc. |
| R-84 | Forget token and the drafts (new) | Both drafts live under the gate, in a workspace keyed by token as R2's is (CalibrationPage.tsx:84-86). The sidebar's Forget token drops them without asking, extending R-27's noted limit. The in-page Forget token offered on a 401 (R-26) asks first while a draft is dirty, using `window.confirm` as the tuning aside does (TuningAside.tsx:130-136). **Evidence:** today /reveal keeps its draft across Forget token, because RevealPage mounts `useRevealAdmin` above the gate (RevealPage.tsx:80). Keeping that would split the drafts across the gate, and the one guard couldn't see both. |
| R-85 | Bump the app pin before R4 (new) | Yes, as its own chore PR before R4's plan commit, following CLAUDE.md's four steps (owner approval, `USER_APPROVED=1`). Skip it if Dependabot's weekly bump lands first. **Evidence:** master is 123 commits ahead of bc877e1. The bump brings: the pinned previewCards.json that R4's tests read (38 variant-bearing cards and a printing with `scanLanguage`, against 24 and none at the pin); `transformRawCards` for R-66's art; `scanLanguage` on printings in the engine's types; and CardTranslationPanel's `language` prop. |
| R-86 | When the owner's rehearsal runs (new) | Before set 14 graduates (planned for its release, 2026-10-23). The rehearsal is owner-held: only the owner enters a token, and the throwaway branch is an app-repo write. It covers: New reveal up to its disabled Publish, the checklist naming the collision (set 14 is fully revealed at pin 16283a13, so a live publish waits for set 15; `commitNewCard` is unchanged and tested; owner, 2026-10-07); edit a preview card that has `variants` and confirm they survive; refresh one card to English with a rename; replace a released card's image. **Evidence:** graduation empties previewCards.json (the app's graduate-canonical-set.mjs:359-373), so after it Edit has no field edits to rehearse until set 15's reveals. Image-only edits can be checked at any time. **As built:** set 14 graduated early, on 2026-10-14 (Doberjohn/inkweave#780). So the rehearsal ran on 2026-10-15 against a throwaway branch cut from 564f0f4a, the app commit before graduation, whose previewCards.json still held set 14's 204 preview cards. The controller drove it, with the token the owner saved (see "R4 as built"). |
| R-87 | Closing admin#24 (new) | Close #24 after R4 merges and deploys, on the owner's word. The closing comment names the PR and merge sha and lists the follow-ups that then stand alone: #29, #30, #33, #34, #37, and #32 if it isn't folded in. Check #14 the same way. **Evidence:** #24 tracks R1 to R4 (docs/PLAN.md:14), and closing keywords have failed in this repo before. **As built:** all six closed on main before R4 merged: #29 and #30 by PR #41, #32 and #37 by #40, #33 by #43 and #34 by #42. So the comment lists R4's follow-ups (#51 to #55) instead. |
| R-88 | Retiring the handoff (new) | Make it the R4 branch's last commit, after the final review. Drop eslint.config.js's `docs/redesign/` ignore (:32-34), rewrite the handoff sentences in R-redesign.md:15, and reword the path in adminTheme.test.ts:37. The owner deletes the local folder after the merge. **Evidence:** docs/redesign/ is git-excluded (.git/info/exclude:13), so the commit touches three files and saves a separate PR's billed CI minutes. The original download is already gone. |
| R-89 | Card panel details the outline leaves out (new) | Adopt the handoff's caption under the preview (name, version, ink icons; README.md:115) and its pill caption ("Click to upload scan", "Click to change scan", "Click to replace image"). For a staged image in Edit, show the current art as the handoff's thumbnail, with alt "Current art for {name}". State the accepted formats. Drop "drop image" from the copy: R4 uploads by click and keyboard only, as today. **Evidence:** today's panel prints the name and "ink · type · cost" (CardPreviewPanel.tsx:57-66), and the image tool names the formats (UploadColumn.tsx:31-45). |
| R-90 | The synergy panel (new) | Restyle SynergyPreviewPanel's rows to admin tokens and put it in a Panel titled "Synergies", marked "computed live" (README.md:122), at the bottom of the aside. Omit it for image-only cards (R-61). **Evidence:** it still draws the app's `COLORS.surfaceAlt` and `gray600` (SynergyPreviewPanel.tsx:11, 26, 32), and R1-7 left restyling the tools to R4. |
| R-91 | Spec corrections to record (new) | Add four entries to "Corrections to the spec": (1) Edit locks the collector number, because renumbering changes the id, which goes by PR; the prototype lets it change (dc.html:787). (2) The staged-image note reads "It replaces the current art when you save", not the handoff's deploy wording, and New reveal gets its own note. (3) The width comes from `useContainerWidth` (ResizeObserver, content box), not a resize listener (README.md:110). (4) The mode switch sits in PageLayout's `actions`, not beside the title (dc.html:152-158). **Evidence:** the plan wins over the handoff, but today these choices are recorded only inside task text. |

## Decisions made in planning (owner may overrule)

| # | Decision | Why |
|---|---|---|
| R-5 | Type and radius map to the app's scales | The handoff's 26/30/34/48px and radius 10/7/3 sit between the app's steps. Mapping (table below) keeps one scale and costs a few pixels. |
| R-6 | Data text uses `COLORS.textMuted`, never `COLORS.textDim` | `textDim` is 3.4–3.8:1 on these surfaces (fails WCAG 1.4.3 for data). `textDim` stays only for purely decorative text. |
| R-7 | Mono text renders as `<code>` | `fontFamily` literals fail `no-literal-font-family`, and `/fonts/` forwards to the app. `<code>` gets the UA monospace with no font declaration, as the branch name does today. |
| R-8 | Analytics artifacts are fetched once per session | Four insights routes replace one page. `fetchAdminData` caches each file's promise, so moving between pages doesn't refetch 0.5 MB of vote log. |
| R-9 | Charts are windowed | The vote log spans months. Vote activity gets a range control (7 / 30 / 90 days / All, default 30) in its filter row, and the range scopes everything below it: KPIs, chart, log and side panels. Spans over 90 days chart per week, not per day. The Overview's weekly chart shows the last 12 weeks. Day labels always carry the month ("Sep 30"). Web analytics gets no range control: the export fixes one reporting window for both trends and breakdowns, so a control could only move the trend. The window is shown instead. |
| R-14 | The display face stays on headline numbers | The `dataviz` guidance puts hero and KPI figures in the sans. The owner's design uses the brand's display face (`FONTS.hero`, the app's "hero numerals" tier), so it stays, with proportional figures. `tabular-nums` is only for columns and axis ticks. The face was Tinos when this was decided; since Doberjohn/inkweave#912 it is Marcellus, one weight (400), and on 2026-10-23 the owner chose that admin follows the app. |
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
- **Card studio validation (R4).** The ready checklist (seven items) and the Publish button derive from `validateRevealCardForm` and `readyToPublish`, not a separate five-item list.
  - **Blank is not wrong (R-72).** A blank required field is incomplete: a neutral dot, no inline message and no `aria-invalid`. The checklist names it.
  - **Red** shows only for a filled value that fails (a malformed number, the ink-block clash, a collision, a number past the set, glyph words), or for a file that fails its check. The message sits next to its control, and a closed accordion section with one shows a red dot and the message.
  - **Rarity** stays optional and clearable.
  - **The Ink tick** follows the ink-block check, never the Amber default.
  - **Numbers past the set (R-73).** New reveal refuses a collector number above `SET_TOTAL`, pointing to `variants.mjs stage`.
  - **Numbers a released card holds (R4-5y, R4-8a).** New reveal refuses a number that a released card of the reveal set holds, naming the card. So Publish waits until the card list has loaded without error, and the Collector number item says why.
- **Write states (R2, R4).** Every page that writes shows busy, success (commit link and the go-live note) and failure states, as the current tools do.
- **Card panel (R4).** The preview keeps the app's `CardTile` render and `CardTranslationPanel` ("See translation") for non-English scans. Uploads keep `useHiddenFileInput` / `useImageUpload` (accept list, byte checks, keyboard access).
- **Edit card's collector number (R4, R-91).** Edit locks the collector number, read-only but focusable, with its reason as its hint: a new number changes the card's id, which goes in by PR. The prototype lets it change (`dc.html:787`).
- **Staged-image notes (R4, R-91).** Edit's note reads "New image staged ({file}). It replaces the current art when you save.", not the handoff's deploy wording (README.md:106). New reveal has its own: "Scan staged ({file}). It's published with the card."
- **The studio's width (R4, R-91, R-64).** The layout reads the bridged `useContainerWidth`, a ResizeObserver on the content box, not a window resize listener (README.md:110). `STUDIO_WIDE_MIN` is 1328: the handoff's 1360 border box less its 16px padding on each side.
- **The mode switch (R4, R-91, R-57).** The New reveal | Edit card switch sits in `PageLayout`'s `actions`, not beside the title (dc.html:152-158).
- **Icons (R1, R3, R4).** Bridge the app's `InkIcon`, `InkwellIcon` and `RaritySymbol` through `src/app-bridge.ts`. `InkwellIcon` is R4's one new icon (R4-5a). `RaritySymbol` draws the Enchanted, Epic and Iconic printings too, so admin bridges none of their webps (#32), and `/web` draws its printings through it (R-83). R4-5h did the same work on the R4 branch; the merge of main kept #32's version. Don't copy the handoff's `assets/icons/` files (in the original download, not in the repo copy) anywhere: they are damaged exports of the app's own icons.
- **Token box (R1).** The sidebar shows the token box on every page that writes when a token is saved. Token state is shared, so "Forget token" anywhere updates every page.
- **Banner removal (R1).** The spec's list misses files; Task R1-1 has the full list.

## Global constraints

- Admin files pass every `inkweave/*` rule in `eslint.config.js`. No new exception. Interpolate tokens inside scoped `<style>` blocks too. The hex and rgba rules scan template strings; the font-size and radius rules don't, so `AdminStyles.test.tsx` holds that line.
- Import app code only through `src/app-bridge.ts`. Never edit `upstream/`.
- The layers under the tools never import them: no module in `src/shell`, `src/ui`, `src/charts` or `src/theme` imports from `src/tools` (R-53), and `src/ui` doesn't import the chart kit, which builds on `src/ui`. Stories and tests may. `eslint.config.js` enforces both (#37).
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
| 22–24px | section headlines (display face) | `FONT_SIZES.xxxl` |
| 26px / 30px / 34px | page titles, KPI values (display face) | `FONT_SIZES.displaySm` (28) |
| 48px | hero number (display face) | `FONT_SIZES.displayMd` (38) |
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
| **R2** | Calibration & tuning merged at `/calibration` (rules table, pairs, votes, dimension participation, tuning aside with pending tray and publish states); the calibration scatter, gap histogram and weekly gap trend; `/tuning` redirects | Calibration, tuning edits on a rehearsal branch | Below (detailed 2026-10-05) |
| **R3** | Card analytics at `/cards` (the card models `cardStats.ts` and `cardVotes.ts`, the switch-card combobox, the engine view from `fetchCardSynergies`, the synergy network diagram, the split meter); card names on the other insights pages link to it | Per-card pages | Below (detailed 2026-10-06) |
| **R4** | Card studio at `/studio`, which replaces `/reveal` and `/image` (both redirect): New reveal (a preview-led layout, a checklist and section states from the validator), Edit card (field edits and an image in one fail-closed commit for preview cards, image-only fixes for released cards, and the cards only the branch file holds); "Edit in Card studio" on Card analytics; printings through `RaritySymbol` (#32, which PR #40 closed on main first); skill and runbook links move | The full redesign | Below (detailed 2026-10-07) |

Each of R2 to R4 was detailed when it started, after the owner had used the phase before it.

### Seeing R1 with real data locally

Card lists and art are real already (forwarded to inkweave.ink). The analytics artifacts exist only in the deployment:
1. Sign in to `https://inkweave-admin.vercel.app` in a browser.
2. Open and save `/admin-data/vote-analytics.json`, `/admin-data/vote-log.json`, `/admin-data/vercel-analytics.json` and `/admin-data/collector-analytics.json` into the local `public/admin-data/` (git-ignored).
3. `pnpm dev` and open `http://localhost:5180`.

Never commit those files. The repo is private now, but the vote log holds raw votes, and it ships only inside the login-gated deployment.

---

## File structure (R1)

| Path | Responsibility |
|---|---|
| `src/theme/adminTheme.ts` | `ADMIN_COLORS`, `ADMIN_TYPE`, `ADMIN_RADIUS`, `ADMIN_LAYOUT`: the admin palette and scales, composed only from bridged tokens |
| `src/theme/AdminStyles.tsx` | `AdminStyles` component: the one scoped stylesheet with every `adm-*` class (hover, focus-visible, selected states); from R4-5x it also exports `INK_TILE_SIZE` (48), the ink tile's largest size |
| `src/ui/format.ts` | Number, gap, share and date formatting shared by every page; `sharePercent` moves here from R2's `chartData.ts` in R3-1a (R-43) |
| `src/ui/*.tsx` | Primitives: `Panel`, `KpiCard`, `SegmentedControl`, `MeterBar`, `BiasBar`, `ScorePill`, `RawTag`, `Notice`, `Sparkline`; from R3, `DataAsOf` (R-54) and `LowNTag` (R-35), which R3-1a moves out of four pages and R2's `RulesTable`, and `SplitMeter` (R3-4c, R-42). R3-6c gives `Panel` `titleFocusable`, and R3-8 widens its `title` to `React.ReactNode`. R4-5f adds `Tag`, admin's one informative chip, which `RawTag` and `LowNTag` now render through. `Notice` wraps a long word, so an API path can't push a narrow column sideways (`ff94ba4`), and R4-8b gives `SegmentedControl` `fill` |
| `src/ui/layout.ts` | `twoUp(track)`, the grid that sets two panels side by side once the column holds two tracks (R3-1a, moved from R2's `CalibrationWorkspace`); and `SR_ONLY`, the visually hidden style, moved from `VoteLogTable` by #34 (`e804608`) on main. R4-5b made the same move, and the merge of main (`8850e5b`) kept main's |
| `src/charts/*` | The chart kit (R1-3b): scales (`scale.ts`), range math and `RangeControl` (`range.ts`, `RangeControl.tsx`), series helpers and the hatch (`series.ts`, `HatchPattern.tsx`), legend, tooltip, keyboard cursor, frame with table view, `BarChart`, `LineChart`, one story file (`Charts.stories.tsx`). Since R1's final fix wave the two charts share their y axis and plot (`axis.ts`, `ChartSvg.tsx`), take their geometry from pure layouts (`barLayout.ts`, `lineLayout.ts`), and BarChart draws through `BarDrawing.tsx` and `SelectableBars.tsx`. R2-4a adds `ScatterChart.tsx` over the pure `scatter.ts`, plotted through `ChartPlot`'s `extend`. R3-4b adds `NetworkDiagram.tsx` over the pure `networkLayout.ts`, whose names are measured with `textWidth` (R-40), and moves `LABEL_HALO` into `axis.ts` |
| `src/github/useGithubToken.ts` | Shared token state (one store for every component), same API as today |
| `src/shell/nav.ts` | The sidebar's items, groups and which routes write (replaces `tools.ts`), and the path helpers `calibrationHref` (R2-6), `cardsHref` (R3-5, R-33) and `studioHref` with `type StudioMode` (R4-5a, R-81) |
| `src/shell/Sidebar.tsx` | Sidebar: brand, groups, items, token box, collapse (persisted) |
| `src/shell/PageLayout.tsx` | Page header (title, subtitle, meta, actions, branch notice) and scrolling body; `flush` and `PAGE_GUTTER` for a page that lays out its own columns (R2-6); `documentTitle` for a tab name that says more than the title (R3-7, R-51); `scrollKey`, which scrolls the body back to the top when it changes (R3's final fix wave). From R4-6a, the flush body keeps a stable scrollbar gutter, so a scrollbar can't flip the studio's layout (R-64). From R4-5u, both bodies are positioned (`position: 'relative'`), so `SR_ONLY` text below the fold clips inside the scroller instead of growing the document (rehearsal finding F8) |
| `src/shell/BranchNotice.tsx` | "Writes to Doberjohn/inkweave `master`" pill |
| `src/shell/AdminShell.tsx` | Providers, `AdminStyles`, sidebar + outlet; from R3-8, `KnownCardsProvider` round the outlet, inside `CardDataProvider` |
| `src/router.tsx` | New routes and redirects |
| `src/tools/analytics/adminData.ts` | Adds the per-session promise cache |
| `src/tools/analytics/overview/*` | Overview page, view and `overviewStats.ts` |
| `src/tools/analytics/activity/*` | Vote activity page, view parts and `activityModel.ts`, which names `activityWindow`'s span `VoteSpan` (R3-1a) for R2's weekly gap and R3's card votes |
| `src/tools/analytics/web/*` | Web analytics page, view parts and `webModel.ts` |
| ~~`src/tools/analytics/CalibrationPage.tsx`~~ | R1 host for the old `CalibrationView`. Retired in R2: R2-6 deleted it for `calibration/CalibrationPage.tsx` |
| `src/tools/analytics/verdict.ts` | The verdict thresholds, words and phrases (R-50), shared by the Overview's calibration card and R2's `calibrationSubtitle` (later R3); `VerdictHero` retired in R2-7 |
| `src/tools/analytics/GapScale.tsx` | The over/under gap track (R-53): private to the Overview's calibration card until R3-5b, then shared with R3's card page |
| `src/shell/WriteToolFrame.tsx` | Interim only: R1-6 creates it to frame the old write pages, and R1-7 deletes it |
| `src/tools/analytics/calibration/*` | R2's `/calibration`: `calibrationModel.ts` (rows, tuning-key mapping, pair scope), `chartData.ts` and `chartFixtures.ts`, `RulesTable`, `CalibrationScatter`, `GapHistogram`, `WeeklyGapTrend`, `TuningAside` and `reloadNote.ts`, `CalibrationWorkspace` and `CalibrationPage` (its `TunedWorkspace` mounts the guard). Its `focusHandoff.ts` (focus for the aside's next view, R2's final fix wave) moves to `src/shell/` in R3-1a |
| `src/tools/analytics/cards/*` | R3's `/cards`: `cardStats.ts` (the card's calibration from `pairs[]`, its rules, `cardsToReview`; R3-2), `cardVotes.ts` (its raw votes, bound once as `CardVote`; R3-3), `engineView.ts` and `useCardSynergies.ts` (the engine's partners by score then name, and the hook with `retry`; R3-4), `lastCard.ts`, `cardSearch.ts` and `CardSwitcher` (R3-5); `CardAnalyticsView` and its parts: `cardView.ts` (the view's pure derivations) and `cardStyles.ts` (the styles its panels share), `CardHeader`, `CardKpis`, `CardCalibrationPanel` and `VotedPairsPanel` (R3-6a), `voteCharts.ts` and `RawVotePanels` with `CommunityScores`, `VoterAnswers` and `VotesPerWeek` (R3-6b), `engineCharts.ts` and `EnginePanels.tsx` (the Engine view and the network panel; R3-6c); `cardPageState.ts`, `CardPageBody.tsx` (the page's states round the view) and `CardAnalyticsPage` (R3-7); and `cardFixtures.ts`, the plain module the tests and stories share. `scripts/lib/__tests__/cardVotesParity.test.mjs` holds the card identity to the precompute's own transforms. From R4, `CardPageBody` passes "Edit in Card studio" as the header's action (R4-6c, R-82) and takes `FocusNotice` from `src/shell` (R4-8d), and `CardCalibrationPanel`'s rules table scrolls sideways in a named region the keyboard reaches and scrolls (`role="region"`, "Rules table", `tabIndex` 0, `adm-scroll-region`; R4-8b) |
| `src/tools/analytics/CardName.tsx` | `CardName`, `PairNames` and `PairLine` (R3-8, R-33): a card name that links to `/cards/<id>` only when the card list holds the id, else plain text. Vote activity's log and Most voted pairs, the Overview's Latest votes and Calibration's vote-detail heading print names through them |
| `src/tools/tuning/tuningRows.ts`, `src/tools/tuning/tuningFailure.ts` | The editor's rows and names, and the failure kinds (R2-2), beside the kept `useLiveTuning`, `useTuningAdmin` and `githubClient.ts`, and the restyled `components/PendingTray.tsx` and `components/TierRow.tsx` |
| `src/github/rejectedToken.ts`, `src/github/ForgetTokenOffer.tsx` | A token GitHub rejects (401): the check, and the "Forget token" offer (R-26), for R4's write pages too |
| `src/shell/useUnsavedChangesGuard.ts`, `src/shell/UnsavedChangesGuard.tsx`, `src/shell/writeInFlight.ts` | The unsaved-edits guard (R-19): the hook, its dialog, and the one-line component a page mounts. R4-5s (R-58) adds the held navigation's target (`to`), a `message` that may be a function of it, and `writeInFlightMessage`: R2's in-flight sentence, shared by `/calibration` and `/studio`. R4-8c lets that function return a whole `UnsavedQuestion` (the dialog's title and answers too), which the dialog takes as `words`. R4-5z drops the guard's Shift+Tab workaround, since the app's trap covers it (Doberjohn/inkweave#769), and R4-5t has Leave blur the focused element first, so the next view's handoff lands |
| `src/shell/focusHandoff.ts` | Focus for the next view when an action unmounts the control that had it (R-48): moved from `calibration/` in R3-1a. The tuning aside and the card page take it |
| `src/shell/FocusNotice.tsx` | `FocusNotice({handoff, children})`: a `Notice` whose line takes the page's handoff (R3-7). R4-8d moved it out of `CardPageBody` and dropped Edit card's copy, so `/cards` and Edit card share it |
| `src/shell/knownCards.ts`, `src/shell/KnownCardsProvider.tsx` | Which card ids the card list holds (R3-8, R-33): `KnownCardsContext` and `useIsKnownCard`, whose default resolves no id, and the provider `AdminShell` mounts round the outlet. `CardName` reads it |
| `src/test/cardLinks.tsx` | `renderWithCards(ui, known)`: a test's render in a `MemoryRouter`, under a card list of the `known` ids (R3-8) |
| `src/tools/studio/*` | R4's `/studio`, Card studio. **The page:** `StudioPage` (the gate inside `PageLayout … writes`, or `StudioWorkspace` keyed by token) and `StudioWorkspace` (both controllers, the header with the mode switch, the one guard, the measured root), with `NewRevealPane` (R4-6a), `EditPane`, `useStudioHandoff.ts` and `useReloadAfterPublish.ts` (R4-6b), and `studioCopy.ts`. **The pure models:** `readiness.ts` (R4-3a), `cardEdit.ts` (R4-2a), `editSearch.ts`, `changeRows.ts` and `scanLanguages.ts` (R4-2b), `previewCardsFile.ts` (R4-4a), `editorState.ts` (R4-4b), `editSave.ts` (R4-4c), `branchCards.ts` (R4-4d), `studioPaths.ts`, `studioLayout.ts` and `studioStyles.ts` (R4-5a), `fieldWiring.ts` and `formSections.ts` (R4-5b), `inkPicks.ts` (R4-5c), `cardPanel.ts` (R4-5d), `loadAgainNote.ts` (R4-5e), `searchStatus.ts` (R4-5f) and `outcomeShows.ts`, the one rule for when the outcome line takes the handoff (R4-8d). **The hooks:** `usePreviewCardsFile.ts`, `useCardEditor.ts` and `useEditSave.ts` (R4-4a to R4-4d). **`components/`:** `StudioForm` and its sections, the pickers, `StudioCardPanel`, `ReadyChecklist`, `ChangeList`, `CommitOutcome`, `SynergyPanel`, `EditSearch`, `EditingBanner`, `ReleasedCardFacts`, `CardMarks` and `StudioSlots`. **Fixtures:** `studioFixtures.ts`, the plain module the tests and stories share. The two page tests share one harness (R4-8d, tests only): `__tests__/studioStores.ts`, the stores the bridge mock loads, and `__tests__/studioHarness.tsx`, which renders the page |
| `src/tools/reveal/replaceCardInPreviewJson.ts`, `livePreview.ts`, `emptyForm.ts`, `releasedNumbers.ts` | These sit beside the reveal-sync contract files, which keep their paths and signatures, but for R4-5y's optional fourth argument to `validateRevealCardForm`. They hold Edit's fail-closed merge of one entry (R4-1a, R-79), the live preview and synergies both modes share, with `imageErrorOf` (R4-3b), `EMPTY_FORM` with `sameForm` (R4-3a), and `releasedRevealNumbers`, each collector number a released card of the reveal set holds (R4-5y). `githubClient.ts` gains `StaleCardError`, `readPreviewCards` and `commitCardEdit` (R4-1b, R-67, R-78), and `commitPreviewCardImage` (R4-8a). From R4-8a, `useRevealAdmin.ts` reads `cardListPending` from `studio/readiness.ts`, and `releasedNumbers.ts` reads `hasPreviewId` from `studio/branchCards.ts`: no lint rule forbids it, and nothing cycles at run time. After R4-6c, `src/tools/image` keeps only `filterCards.ts` (with R4-2b's apostrophe fold) and `githubClient.ts` (`commitCardImage`, which R4-8a gives an optional `atBase`) |
| `src/ui/cardFacts.ts` | "Character · cost 3 · inkable": moved from `analytics/cards/cardView.ts` (R4-5f, R-61), so Card analytics' header and Card studio's facts list word a card alike |
| `src/test/revealForm.ts` | `revealForm(overrides)` and `RUBY_NUMBER`: a complete Ruby character for the form's tests and stories, promoted from `validateForm.test.ts` (R4-3a) |

Deleted in R1: `src/tools/banner/**`, `scripts/export-banner*.mjs`, `docs/BANNER.md`, `public/art/banner/`, `src/shell/ToolIndex*`, `src/shell/tools.ts`, `src/shell/WriteToolFrame.tsx`, and the top-level `src/tools/analytics/{AnalyticsPage,AdminAnalyticsDashboard,ActivityView,DayGroup,WebAnalyticsView}*` files (not the new `activity/` folder) with their stories and tests. `Scorecard`, `WeeklyActivityChart` and `VerdictHero` stay until R2 (`CalibrationView` uses them). Deleted in R2: R1's `src/tools/analytics/CalibrationPage.tsx` and its test (R2-6); `CalibrationView`, `VerdictHero`, `Scorecard`, `WeeklyActivityChart`, `RuleCalibrationTable` and `RawVotesNotice`, with their stories and tests, and `src/tools/tuning/{TuningPage.tsx,index.ts}` with `components/{TuningEditor,RuleSelector}` and their stories and tests (R2-7). R3 deletes no file. R3-1a moves `focusHandoff.ts` from `calibration/` to `src/shell/`, and drops the private copies of what it shares (`DataAsOf` in four pages, `LowNTag`, `twoUp`, `sharePercent` and `VoteSpan`). Deleted in R4 (R4-6c), each with its stories and tests:
- `src/tools/reveal/{RevealPage.tsx,index.ts}` and `components/{RevealAdminForm,CardPreviewPanel}` (`RevealAdminFormCardText.test.tsx` included);
- `src/tools/image/{ImagePage.tsx,useImageAdmin.ts,index.ts}` and `components/{CardImagePicker,ImageComparePanel,UploadColumn}`;
- `src/components/ImageUploadTile`;
- `src/tools/__tests__/writePages.test.tsx`, whose cases now live in `StudioPage.test.tsx` and `router.test.tsx`;
- `RevealAdminController.publishError`;
- from the bridge, `EMPTY_BOX` and `GOLD_GLOW`. The three printing webps went with #32 (PR #40) on main; R4-5h made the same change, and the merge of main (`8850e5b`) kept main's.

## Shared interfaces (R1)

Every task builds against these names and types. A task may add to them; it may not rename them.

```ts
// src/theme/adminTheme.ts
export const ADMIN_COLORS: {
  page: string; sidebar: string; panel: string; card: string; aside: string;
  rowHover: string; navHover: string; divider: string; border: string;
  inputBorder: string; strongBorder: string; barTrack: string; barNeutral: string;
  text: string; muted: string; dim: string;
  accent: string; accentHover: string; accentTint: string; accentTintSoft: string; rowSelected: string; // rowSelected: R2-3 (R-27), a selected row button's fill
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
// R3 adds: adm-option (a listbox row; [aria-selected="true"] = the active option, the rowHover fill and an inset accent bar; R3-5),
// adm-net-link (a network node's link: block, full size, a focus ring and no hover; R3-4b),
// adm-link (a text link in data, a card name: the text colour and a muted underline at rest, gold on hover, the ring 2px out; R3-8)
// R4 adds nine classes and one rule. R4-5a's seven (R-41, R-75): adm-acc-head (an accordion header's <button> in its <h2>;
// [aria-expanded="true"] turns the ::after chevron; ring inside), adm-pick-btn (a rarity or Inkable button, 34px; [aria-pressed="true"]
// is adm-card-btn's one selected look), adm-ink-tile (with adm-pick-btn: a square ink tile, INK_TILE_SIZE or its grid column's width
// where that is less (R4-5x), with no 34px minimum and an icon that shrinks with it (R4-8b); data-size="sm" a fixed 40px), adm-switch
// (<input type="checkbox" role="switch">), adm-file-btn (a <label> round a hidden file input, a bordered 36px button) and adm-file-cover
// (the <label> over the card preview), both ringed on [data-focused="true"], and adm-range (the cost slider, per engine; [data-unset="true"]
// hides the thumb; from R4-8b its track is barNeutral, 3.3:1 on a card, WCAG 1.4.11). R4-8b's two and the rule: .adm-seg[data-fill="true"]
// (SegmentedControl's fill: the buttons share the row from a 4px pad), adm-seg-pair (a fill control's buttons two by two, never wrapped
// apart, so a row that wraps goes two and two) and adm-scroll-region (a box that scrolls a table sideways: tabIndex 0, a named region,
// the ring 2px out)
// #74 adds three: adm-search-list (Edit card's search list, the container whose width its rows' rule asks) and adm-search-names
// and adm-search-marks (a row's names and its marks: in a list narrower than SEARCH_STACK_BELOW only the marks move, down under
// the names, which take the marks' columns too)
export const INK_TILE_SIZE = 48; // R4-5x: the ink tile's largest size; PickerGroup's 'inks' grid caps its six columns at it
// #74: the search list's width under which a row's marks stack under its names; the widest chip, "not deployed yet" (92px), sets it
export const SEARCH_STACK_BELOW = 306;
export function AdminStyles(): JSX.Element;

// src/ui/format.ts
export function fmtInt(n: number): string;                 // 2054 -> "2,054"
export function fmtGap(gap: number | null): string;         // -0.3 -> "−0.30", 0.83 -> "+0.83", null -> "—"
export function fmtScore(n: number | null, digits?: number): string; // null -> "—"
export function fmtDay(day: string): string;                // "2026-09-30" -> "Sep 30"
export function fmtWeekday(day: string): string;            // "2026-09-30" -> "Wed Sep 30"
export function sharePercent(fraction: number): string;     // R3-1a (R-43): 1/3 -> "33%", (0, 0.005) -> "<1%", [0.995, 1) -> ">99%"

// src/ui primitives
export function Panel(props: {title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; padded?: boolean; titleFocusable?: boolean}): JSX.Element;
// R3-8 (R-33) widens title from string: it can hold links (VoteDetailTable's card names), and the region is still named by the h2's text
// R3-6c (R-48): titleFocusable puts tabIndex -1 on the h2, so a focus handoff can land on it
export function KpiCard(props: {label: string; value: React.ReactNode; hint?: React.ReactNode; tag?: React.ReactNode; valueColor?: string}): JSX.Element;
export function SegmentedControl<T extends string>(props: {options: ReadonlyArray<{value: T; label: string}>; value: T; onChange: (v: T) => void; ariaLabel: string; fill?: boolean}): JSX.Element;
// fill (R4-8b): data-fill="true", the options across the row in pairs (adm-seg-pair), so a column narrower than the labels wraps a
// whole pair; Card studio's Type sets it. Without it the control is as wide as its options, as before
export function MeterBar(props: {fraction: number; color: string; height?: number; label?: string}): JSX.Element;
export function BiasBar(props: {gap: number | null; scale?: number; minWidth?: number}): JSX.Element; // diverging, full scale ±scale (default 2.5); minWidth default 64, 0 to follow a grid track (R2-8)
export function ScorePill(props: {score: number | null}): JSX.Element;               // ≥7 under colour, ≤4 over colour, null "—"
export function RawTag(): JSX.Element;
export function Notice(props: {tone?: 'info' | 'error'; children: React.ReactNode}): JSX.Element;
export function Sparkline(props: {data: number[]; color?: string; height?: number}): JSX.Element | null;
export function DataAsOf(props: {generatedAt: string});              // R3-1a (R-54): "Data as of <code>YYYY-MM-DD</code>", for PageLayout's meta
export function LowNTag(props: {minVotes: number});                  // R3-1a (R-35): "low n", titled "Fewer than {minVotes} score votes"
export interface SplitMeterPart {id: string; label: string; color: string; value: number}
export function SplitMeter(props: {parts: readonly SplitMeterPart[]; ariaLabel: string; emptyText?: string});
// R3-4c (R-42): one full-width bar (aria-hidden) and a legend list named by ariaLabel, each row "Too high 24% (12)" through
// sharePercent (R-43); every part 0: the bare track and emptyText (default "No answers yet."). No tooltip and no Table view
// src/ui/layout.ts (R3-1a)
export function twoUp(track: number): React.CSSProperties; // two tracks of `track` px and the SPACING.xl gap, stacked below that

// src/github/useGithubToken.ts (same API, shared state)
export interface UseGithubToken {token: string | null; setToken: (t: string) => void; clearToken: () => void}
export function useGithubToken(): UseGithubToken;

// src/shell/nav.ts
export type NavGroup = 'main' | 'insights' | 'publish';
export interface NavItem {id: string; label: string; mark: string; path: string; group: NavGroup; writes: boolean}
export const NAV_ITEMS: readonly NavItem[];
export function navItemFor(pathname: string): NavItem | undefined;
export function isWritePath(pathname: string): boolean;
export function calibrationHref(ruleId?: string): string; // R2-6: '/calibration', or '/calibration?rule=' + encodeURIComponent(ruleId)
export function cardsHref(cardId?: string): string;          // R3-5 (R-33): '/cards', or '/cards/' + encodeURIComponent(cardId)
export type StudioMode = 'new' | 'edit';                              // R4-5a (R-81): Card studio's two modes
export function studioHref(mode: StudioMode, cardId?: string | null): string; // R4-5a (R-81): '/studio', '/studio?card=…', '/studio?mode=edit',
// '/studio?mode=edit&card=…'; the id goes through URLSearchParams, and a mode switch keeps the card (R-57)

// src/shell/PageLayout.tsx
export const PAGE_GUTTER: string; // R2-6: the side padding, clamp(16px, 4vw, 32px), for a flush page's own columns
export function PageLayout(props: {
  title: string; subtitle?: React.ReactNode; meta?: React.ReactNode; actions?: React.ReactNode;
  writes?: boolean; branchLabel?: string;
  flush?: boolean; // R2-6: children go straight into the scrolling body, with no padding and no grid (R2's aside, R4's studio)
  documentTitle?: string; // R3-7 (R-51): the tab's name before " · Inkweave admin", when it should say more than `title`
  scrollKey?: string;     // R3's final fix wave: what the body shows; when it changes, the body scrolls back to the top before the next paint, and the header stays mounted (CardAnalyticsPage passes the card id)
  children: React.ReactNode;
}): JSX.Element;

// src/shell/focusHandoff.ts (R3-1a, R-48): moved from calibration/; code unchanged. Focus moves only when its control unmounts
export interface FocusHandoff {pending: boolean; request: () => void; done: () => void}
export function useFocusHandoff(): FocusHandoff;
export function focusUnmoved(from?: Element | null): boolean; // focus is still on `from`, or fell to <body>
export function useTakeHandoff(handoff: FocusHandoff | undefined, container: RefObject<HTMLElement | null>, selector: string, ready?: boolean): void;

// src/shell/knownCards.ts and KnownCardsProvider.tsx (R3-8, R-33): which ids the card list holds, for CardName's links
export type IsKnownCard = (cardId: string) => boolean;
export const KnownCardsContext: React.Context<IsKnownCard>; // default: no id resolves, so a view's tests and stories need no card list
export function useIsKnownCard(): IsKnownCard;
export function KnownCardsProvider(props: {children: React.ReactNode}); // AdminShell mounts it inside CardDataProvider, round the Outlet

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
export function ChartLegend(props: {series: readonly SeriesDef[]; mark: 'rect' | 'line' | 'dot'}): JSX.Element; // rendered only for 2+ series; 'dot' (R2-4a) keys scatter dots with a filled circle, its hatch included

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
export interface ChartTableLink {text: string; href: string}   // #34: a cell that opens a page, as the network's partner names do
export type ChartTableCell = string | ChartTableLink;
export interface ChartTable {caption: string; columns: readonly string[]; rows: ReadonlyArray<readonly ChartTableCell[]>}
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
  // R2-4c moved the baseline's label from inside the plot into the y gutter, at the baseline's y. A tick within 12px of it
  // (a label's height and the surface gap) keeps its gridline and prints no label. Keep the label short: the gutter grows to fit it.
  titleFormat?: (x: string) => string;        // R2-4c: the tooltip's title and the slider's lead-in for an x (default xFormat): "Week of Sep 14"
  missingText?: string;                       // R2's final fix wave: the slider's words for a series with no value at an x ("no score votes"); the tooltip keeps "—"
  emptyText?: string;                         // shown in place of the plot when no series has a point
  yDomain?: readonly [number, number];        // R2-4a: the y domain to span, widened only to keep every value, zero and the baseline on the plot
  fixedGutters?: boolean;                     // R2-4a: lay out between LINE_Y_AXIS_WIDTH and LINE_END_WIDTH (a wider label widens its gutter)
}): JSX.Element;
export const LINE_Y_AXIS_WIDTH: number;       // R2-4a: 48px (SPACING.xxxl + SPACING.lg); lives in lineLayout.ts, re-exported here
export const LINE_END_WIDTH: number;          // R2-4a: 48px
// One y axis, always. Two measures of different scale are two charts.

// src/charts/scatter.ts (R2-4a): the scatter's pure geometry
export interface ScatterPoint {key: string; x: number; y: number; series: string; label: string} // label: the slider's value text
export const HIT_RADIUS = 24;                 // px: the pointer only has to be closest, within this of a dot's centre
export const SCATTER_MARGIN: {readonly top: 24; readonly right: 16; readonly bottom: number; readonly left: 32}; // from SPACING; left is a floor
export const SCATTER_MAX_WIDTH = 440;
export function scatterWidth(measured: number): number; // min(chartWidth(measured), SCATTER_MAX_WIDTH): 440 until measured
export interface DiagonalLine {x1: number; y1: number; x2: number; y2: number; angle: number}
export interface ScatterLayout {width: number; height: number; left: number; top: number; side: number;
  x: (v: number) => number; y: (v: number) => number; diagonal: DiagonalLine | null}
export function scatterLayout(width: number, xDomain: readonly [number, number], yDomain: readonly [number, number],
  yLabels?: readonly string[]): ScatterLayout; // a square plot; the left margin fits the widest y label
export function jitterOffset(key: string, amount: number): [number, number];
export function diagonalJitter(key: string, along: number, across: number): [number, number]; // y − x moves by at most `across`
export type JitterAlong = 'both' | 'diagonal';
export const ACROSS_SHARE = 1 / 5;            // R2-4c: 'diagonal' jitter's spread across y = x, as a share of `jitter`
export interface PlacedDot {point: ScatterPoint; color: string; px: number; py: number}
export interface DotOptions {series: readonly SeriesDef[]; jitter: number; jitterAlong: JitterAlong}
export function placeDots(points: readonly ScatterPoint[], layout: ScatterLayout, opts: DotOptions): PlacedDot[];
export function nearestPoint(points: ReadonlyArray<{px: number; py: number}>, x: number, y: number, radius: number): number | null; // a tie goes to the first
export function scatterOrder<T extends {key: string; x: number; y: number}>(points: readonly T[]): T[]; // x, then y, then key
// Jitter keys should be more than a couple of characters long: short keys streak along diagonals. R2's "id|id" pair keys don't.

// src/charts/ScatterChart.tsx (R2-4a): two measures per item on one square plot, through ChartPlot; re-exports ScatterPoint
export function ScatterChart(props: {
  points: readonly ScatterPoint[]; series: readonly SeriesDef[]; ariaLabel: string;
  xDomain: readonly [number, number]; yDomain: readonly [number, number];
  xTicks: readonly number[]; yTicks: readonly number[]; xLabel: string; yLabel: string;
  tickFormat?: (n: number) => string;   // default fmtInt
  diagonal?: string;                     // draws y = x, labelled with this text
  jitter?: number; jitterAlong?: JitterAlong; // default 0 and 'both'; 'diagonal' slides along y = x, a fifth of that across
  tooltip: (point: ScatterPoint) => TooltipContent;
  selectedKey?: string | null; onSelect?: (key: string) => void; // with onSelect, click and Enter/Space select
  emptyText?: string;                    // default "No data to chart."
  describedBy?: string;                  // R2's final fix wave: the id of what describes the slider (aria-describedby), passed on to ChartPlot
}): JSX.Element;
// Opaque r 4 dots, each on its own r 6 disc in the page colour (R-23); the nearest dot within HIT_RADIUS lifts and shows the tooltip.
// As built (R2's final fix wave): ScatterChart measures the width and places the dots (scatterLayout, then placeDots for the
// drawing order and the keyboard walk), and an inner ScatterPlot holds the cursor and the selection and draws. So a hover, an
// arrow key or a new selection re-renders the plot alone and places no dot again.
// The stated exception to the global constraint "Every clickable thing is a button or a link": the dots sit in an aria-hidden
// SVG, so the plot is one slider. ←/→/Home/End walk the dots, Enter or Space selects the dot the slider announces, and the
// selected dot's value text ends ", selected". R2's scatter describes the slider with its note's instruction (describedBy).

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
export function labelSpots(slot: Pick<RingSlot, 'x' | 'y' | 'angle'>, text: Size): LabelPlacement[]; // best first: away from the centre, then the node's other outer sides (#34)
export function overlaps(a: Box, b: Box): boolean;                           // shared area only; touching edges, or a float slack under 1e-6, don't count
export function contains(outer: Box, inner: Box): boolean;
export function nodeTarget(p: PlotPoint): Box;                               // the NODE_TARGET square centred on p
export function placeLabels(spots: ReadonlyArray<readonly LabelPlacement[]>, blocked: readonly Box[], bounds: Box): Array<LabelPlacement | null>; // each name, strongest first, takes its first spot that fits
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
// The stated exception to useChartCursor and ChartPlot: twelve links are twelve Tab stops, not one slider (R3-4b, note 2).
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
//          gutterFor(labels) (R2-4c): the room left of the plot that labels need, so LineChart's gutter counts the baseline's label
//          LABEL_HALO (R3-4b): 3, the page-coloured halo round a label drawn over marks (moved from ScatterChart.tsx; the network's names use it too)
// ChartSvg.tsx: ChartSvg({width, height}), AxisGrid({ticks, left, right}), EmptyChart({text?}),
//               ChartPlot({ariaLabel, cursor, valueText, xs, height, extend?, describedBy?})   // the slider plot every chart renders;
//               extend (R2-4a) adjusts the slider's props before they are spread (ScatterChart's 2-D pointer and Enter/Space);
//               describedBy (R2's final fix wave) sets the slider's aria-describedby. AxisGrid draws a tick with an empty label
//               as a gridline alone (R2-4c)
// series.ts: chartWidth(measured)   // the measured width, or CHART_FALLBACK_WIDTH until there is one
// barLayout.ts: barLayout(width, data, series, opts): BarLayout; barLayoutOptions(sizing) (BarChart's defaults);
//               BarDatum, BarSizing, CapLabels and BAR_Y_AXIS_WIDTH live here
// BarChart's parts: BarDrawing.tsx (the drawing and tooltip), SelectableBars.tsx (the bar buttons),
//               useBarFocus.ts (their roving focus), barPaint.ts (paint, roundedTop, data flags)
// lineLayout.ts: lineLayout(width, series, opts): LineLayout; lonePoints(row); tooltipY(layout, index); LinePoint, LineSeries
//               LineLayoutOptions.yDomain and .fixedGutters, LINE_Y_AXIS_WIDTH and LINE_END_WIDTH (R2-4a)
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
// URL contract: /calibration?rule=<RuleStat.ruleId, or a tuning key>. R1-8 wrote it and R1-11 read it; from R2, R2-6's page reads it
// and writes it (replace: true), and R2-8's Overview link builds it with calibrationHref
// src/shell/nav.ts: NAV_ITEMS at the end of R2 (R2-6; the R2 header's contract addition 13), in order:
// calibration now writes, and the tuning item is gone
// {id:'overview', label:'Overview', mark:'Ov', path:'/', group:'main', writes:false}
// {id:'calibration', label:'Calibration & tuning', mark:'Ca', path:'/calibration', group:'insights', writes:true}
// {id:'activity', label:'Vote activity', mark:'Ac', path:'/activity', group:'insights', writes:false}
// {id:'web', label:'Web analytics', mark:'Wa', path:'/web', group:'insights', writes:false}
// {id:'reveal', label:'Reveal publisher', mark:'Re', path:'/reveal', group:'publish', writes:true}
// {id:'image', label:'Card images', mark:'Im', path:'/image', group:'publish', writes:true}
// /tuning is a route only: <Navigate to="/calibration" replace /> (R-10)
// src/shell/nav.ts: NAV_ITEMS at the end of R3 (R3-7), in order: cards joins Insights, last
// {id:'overview', label:'Overview', mark:'Ov', path:'/', group:'main', writes:false}
// {id:'calibration', label:'Calibration & tuning', mark:'Ca', path:'/calibration', group:'insights', writes:true}
// {id:'activity', label:'Vote activity', mark:'Ac', path:'/activity', group:'insights', writes:false}
// {id:'web', label:'Web analytics', mark:'Wa', path:'/web', group:'insights', writes:false}
// {id:'cards', label:'Card analytics', mark:'Cd', path:'/cards', group:'insights', writes:false}
// {id:'reveal', label:'Reveal publisher', mark:'Re', path:'/reveal', group:'publish', writes:true}
// {id:'image', label:'Card images', mark:'Im', path:'/image', group:'publish', writes:true}
// URL contract: /cards/:cardId? (cardsHref). Bare /cards redirects (replace) to the last card viewed, stored under
// localStorage['inkweave-admin.last-card'] (cards/lastCard.ts), or shows the "Pick a card" prompt with Cards to review (R-28).
// R3-8 links card names into it from Vote activity, the Overview and Calibration, for ids the card list resolves (R-33).
// src/shell/nav.ts: NAV_ITEMS at the end of R4, in order. R4-6a adds studio, first in Publish, and R4-6c removes reveal and image
// {id:'overview', label:'Overview', mark:'Ov', path:'/', group:'main', writes:false}
// {id:'calibration', label:'Calibration & tuning', mark:'Ca', path:'/calibration', group:'insights', writes:true}
// {id:'activity', label:'Vote activity', mark:'Ac', path:'/activity', group:'insights', writes:false}
// {id:'web', label:'Web analytics', mark:'Wa', path:'/web', group:'insights', writes:false}
// {id:'cards', label:'Card analytics', mark:'Cd', path:'/cards', group:'insights', writes:false}
// {id:'studio', label:'Card studio', mark:'Cs', path:'/studio', group:'publish', writes:true}
// URL contract: /studio?mode=edit&card=<id> (studioHref). No ?mode is New reveal; ?card= is Edit card's card and survives a mode
// switch. /reveal and /image redirect (replace) to studioHref('new') and studioHref('edit') (R-10). Card analytics' "Edit in Card
// studio" (R4-6c, R-82) is a Link, through the Overview's PanelLink, to studioHref('edit', card.id).

// src/tools/analytics/CardName.tsx (R3-8, R-33): every card name on those pages prints through one of these
export function CardName(props: {id: string; name: string});              // a Link (.adm-link) to cardsHref(id) when the id resolves, else the bare name
export function PairNames(props: {pair: {a: string; b: string; aName: string; bName: string}}); // "A × B", inline
export function PairLine(props: {pair: {a: string; b: string; aName: string; bName: string}});  // PairNames on one truncating line, with 4px of ring room
// src/tools/analytics/VoteDetailTable.tsx: pair: {a; b; aName; bName; engineScore} | null (gains a and b, for the heading's links)
// src/test/cardLinks.tsx (tests only)
export function renderWithCards(ui: React.ReactElement, known: readonly string[]): RenderResult; // in a MemoryRouter, under a card list of `known`

// src/tools/analytics/verdict.ts (R1-8)
export const CALIBRATION_BAND = 0.5;
export const SCALE_CLAMP = 1.5;
export interface Verdict {word: string; phrase: string; wordColor: string; numberColor: string}
// phrase (R3-5b, R-50) completes "The engine …": "is well-calibrated", "runs generous", "runs harsh", or with no gap
// "has too few score votes to judge". word stays the bare verdict calibrationSubtitle prints ("not enough data" with no gap)
export function verdictFor(meanGap: number | null): Verdict;
export function scalePercent(meanGap: number | null): number | null;

// src/tools/analytics/GapScale.tsx (R3-5b, R-53): the over/under track, moved out of the Overview's CalibrationCard
export interface GapScaleProps {meanGap: number | null; color: string} // R1-8's prop names; callers pass verdictFor(meanGap).numberColor
export function GapScale(props: GapScaleProps);                         // the track is aria-hidden: every caller prints the gap as text

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
export interface VoteSpan {startDay: Day; endDay: Day}   // R3-1a: activityWindow's span, named; moved from calibration/chartData.ts
export function activityWindow(votes: readonly VoteLogRow[], range: RangePreset): VoteSpan | null;
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
// R2-5a adds DialogShell (for UnsavedChangesDialog); R2-7 removes CAP_LABEL_XS (its last importers retire)
// R3-1 adds TIER_COLORS, Z_INDEX, useAutocomplete with type UseAutocompleteReturn, searchCardsByName (R-30), fetchCardSynergies,
// getStrengthTier and type StrengthTierLabel: only what R3 uses (R-55)
// R4-5a adds InkwellIcon; R4-4d adds transformRawCards to the loader line (R-66: the app's own transform, so a card only the branch
// file holds points at its art). #32 removes enchantedSymbol, epicSymbol and iconicSymbol: RaritySymbol draws the printings at the pin
// (R4-5h did the same for R-83). R4-6c removes EMPTY_BOX and GOLD_GLOW, since their last importers retire, and R4-7 rewords the
// PINNED_PREVIEW_CARDS_JSON comment: the write chain's tests and Card studio's Edit tests read it
// src/tools/analytics/voteLogTypes.ts (R3-1): VoteLogRow narrows accuracy to -1 | 0 | 1 | null, difficulty to 1 | 2 | 3 | null and
// whoCarries to 'a' | 'b' | 'both' | 'neither' | null, the votes table's own checks

// src/tools/analytics/CalibrationView.tsx, CalibrationPage.tsx (R1-11; retired in R2: R2-6 deleted the page, R2-7 the view)
// CalibrationViewProps gained: initialRuleId?: string | null  (an id the analytics don't have opens on "All pairs"). Retired in R2 with the view
// R2's page: src/tools/analytics/calibration/CalibrationPage.tsx, export function CalibrationPage(): JSX.Element;

// src/tools/analytics/voteAnalyticsTypes.ts, RuleStat gains (R2-1, R-17)
playstyleId?: string | null; // a playstyle rule's tuning.json key, null for a direct rule; absent in artifacts written before R2
// scripts/lib/voteAnalytics.mjs (R2-1): ruleRosterEntry(rule) -> {ruleId, ruleName, category, playstyleId: string | null};
//   loadRuleRoster maps getAllRules() through it, and rollUpByRule passes playstyleId through

// src/shell/useUnsavedChangesGuard.ts, UnsavedChangesGuard.tsx (R2-5a, R-19; R4's studio reuses them, and R4-5s and R4-8c widen them
// additively, R-58)
export interface UnsavedChangesGuardState {blocked: boolean; to: Location | null; stay: () => void; leave: () => void}
// to (R4-5s): where the held navigation goes. It is non-null exactly when blocked (gated on dirty), so null in the render where the edits clear
export type LeavesPage = (from: Location, to: Location) => boolean; // react-router-dom's Location
export function useUnsavedChangesGuard(dirty: boolean, leaves?: LeavesPage): UnsavedChangesGuardState; // default: a new pathname leaves
export interface UnsavedWords {title: string; stay: string; leave: string}  // R4-8c: the heading (the dialog's name) and the two answers
export interface UnsavedQuestion extends UnsavedWords {message: string}      // R4-8c: a question in full
export function UnsavedChangesDialog(props: {open: boolean; message: string; words?: UnsavedWords; onStay: () => void; onLeave: () => void}): JSX.Element | null;
// words (R4-8c): default a page leave's: "Leave this page?", "Stay on this page", "Leave this page". While the dialog fades out, it keeps
// the question it last showed, words and all (R4-5s, R4-8c)
export type UnsavedMessage = string | ((to: Location) => string | UnsavedQuestion); // R4-5s, widened in R4-8c: called during render,
// only while a navigation is held; never ''. A line alone asks in a page leave's words
export function UnsavedChangesGuard(props: {dirty: boolean; message: UnsavedMessage; leaves?: LeavesPage}): JSX.Element | null;
// Leave blurs the focused element, then lets the navigation through, so the next view's handoff sees <body> (R4-5t, R-59). The app's
// trap keeps Shift+Tab from the message inside the dialog (Doberjohn/inkweave#769, for #732), so the guard has no workaround (R4-5z)
// src/shell/writeInFlight.ts (R4-5s, R-58): R2's F13 sentence, moved out of CalibrationPage
export interface WriteInFlight {action: 'publish' | 'save'}
export function writeInFlightMessage({action}: WriteInFlight): string;
// "A {action} to {targetBranch()} is in progress. Leaving won't stop it, and you won't see whether it landed."
// useBlocker needs a data router, and a router holds one blocker: one guard per page, mounted by the page, never by a view a story renders.
// R2's calibration model, tuning model and aside: R-redesign/R2-calibration-tuning.md, contract additions 8 to 10.
// R3's card models, engine model and hook, last card, switcher, view and page: R-redesign/R3-card-analytics.md, contract additions 8 to 14.
// R4's contract in full: R-redesign/R4-card-studio.md, contract additions 1 to 14, as planned. The main names, as built (R4-8); the
// block after them records where the code differs from the additions:
// src/tools/reveal/replaceCardInPreviewJson.ts (R4-1a, R-79): not a reveal-sync contract file
export const EDITABLE_CARD_KEYS: readonly ['name', 'fullName', 'version', 'cost', 'color', 'inkwell', 'type', 'rarity', 'franchise',
  'subtypes', 'abilities', 'fullText', 'fullTextSections', 'strength', 'willpower', 'lore', 'moveCost', 'scanLanguage']; // as const
export type EditableCardKey = (typeof EDITABLE_CARD_KEYS)[number];
export type PreviewCardChanges = {[K in EditableCardKey]?: LorcanaJSONCard[K] | null}; // null removes the key; undefined is no change
export interface PreviewCardEdit {id: number; changes: PreviewCardChanges}
export function mergeCardChanges(card: LorcanaJSONCard, changes: PreviewCardChanges): LorcanaJSONCard;
export function replaceCardInPreviewJson(fileText: string, edit: PreviewCardEdit): string; // fail-closed: throws, never half-writes
// src/tools/reveal/githubClient.ts (R4-1b, R-67, R-78), beside commitNewCard (unchanged)
export class StaleCardError extends Error { name = 'StaleCardError'; } // R4-5r names the card: "{fullName} changed on {branch} since
// you loaded it. Load it again.", or "{fullName} is no longer in previewCards.json on {branch}. Load it again."
export function readPreviewCards(token: string): Promise<LorcanaJSONCard[]>; // at targetBranch()
export interface CardEditCommit {token: string; loaded: LorcanaJSONCard; changes: PreviewCardChanges; image: {dataUrl: string; ext: string} | null}
export function commitCardEdit(opts: CardEditCommit): Promise<CommitResult>; // compares EDITABLE_CARD_KEYS plus id, setCode, number at the base
export function commitPreviewCardImage(opts: Omit<CardImageCommit, 'atBase'>): Promise<CommitResult>; // R4-8a: commitCardImage's commit
// for a card under a preview id, sent only while previewCards.json at the base commit still holds the card, else the "no longer" refusal
// src/tools/image/githubClient.ts (R4-8a): commitCardImage keeps its message; its options become an interface with an optional atBase
export type FilesAtBase = Exclude<Parameters<typeof commitFiles>[0]['files'], CommitFile[]>; // commitFiles' files, as its callback
export interface CardImageCommit {token: string; card: ImageAdminCard; imageBase64: string; imageExt: string; atBase?: (raw: CommitFile) => FilesAtBase}
export function commitCardImage(opts: CardImageCommit): Promise<CommitResult>; // with no atBase it reads nothing, as before
// src/tools/reveal, the rest:
//   emptyForm.ts (R4-3a): EMPTY_FORM and sameForm(a, b)
//   validateForm.ts: exports intField. collectorError refuses, in order, a number that isn't positive; one above SET_TOTAL ("#N is past
//   the {SET_TOTAL}-card set: special printings go in through variants.mjs stage", R-73); one a released card of the reveal set holds
//   ("#21 is already Miguel Rivera - Street Musician (3286)", R4-5y); and an existing card's id
export interface ReleasedCard {id: number; fullName: string}       // R4-5y: a released reveal-set card, under its official id
export type ReleasedNumbers = ReadonlyMap<number, ReleasedCard>;   // R4-5y: each collector number such a card holds
export function validateRevealCardForm(form: RevealCardForm, existingIds: ReadonlySet<number>, imageName: string | null,
  released?: ReleasedNumbers): ValidationResult;
// released (R4-5y): optional, default none, so reveal-sync's three-argument call (write.mjs) checks as before: an additive change to the
// reveal-sync contract. reveal-sync's own check is Doberjohn/inkweave-admin#51
//   releasedNumbers.ts (R4-5y): releasedRevealNumbers(cards: readonly LorcanaCard[]): ReleasedNumbers, from the reveal-set cards with
//   a setNumber and an id outside the preview band (hasPreviewId)
//   constants.ts: French in SCAN_LANGUAGES, and type ScanLanguage = string (R-60)
//   livePreview.ts (R4-3b): buildPreview, computeSynergies, ChosenImage and imageErrorOf(image, validation)
//   RevealAdminController: gains dirty, imageName, imageDataUrl, uploadError, imageError and commitError (R4-3b); publish returns
//   Promise<void> (R4-6a); publishError goes (R4-6c); cardList: CardListStatus, which Publish waits on (R4-8a), and retryCardList, the
//   card list's retryLoad (R4-8f)
// src/tools/studio/readiness.ts (R4-3a, R-72)
export interface CardListStatus {isLoading: boolean; error: Error | null}  // R4-8a
export function cardListPending(list: CardListStatus): string | null;     // R4-8a: why the number can't be checked yet: "Checking the
// number needs the card list: it's still loading…", or "…, which failed to load: {message}"; null once loaded. readyToPublish refuses while set
export function revealChecklist(form: RevealCardForm, validation: ValidationResult, image: Pick<ImageStatus, 'ready' | 'error'>,
  list?: CardListStatus): ChecklistItem[]; // list (R4-8a): the Collector number item carries cardListPending's line; none counts as loaded
export function visibleErrors(form: RevealCardForm, errors: Readonly<Record<string, string>>): Record<string, string>;
export function visibleImageError(errors: Readonly<Record<string, string>>, image: ImageStatus): string | null; // null before a file is chosen
export function sectionStatuses(form: RevealCardForm, errors: Readonly<Record<string, string>>, list?: CardListStatus): Record<SectionId, SectionStatus>;
// list (R4-8f): Identity turns complete only once the card list has loaded without error; until then it is incomplete, or red for an error the form shows. None counts as loaded
// src/tools/studio/cardEdit.ts (R4-2a; R-61, R-65)
export function editKindOf(entry: LorcanaJSONCard | null): CardKind; // {kind: 'fields'} | {kind: 'image'; reason: ImageOnlyReason}
export function cardChanges(loaded: LorcanaJSONCard, before: RevealCardForm, after: RevealCardForm): PreviewCardChanges; // throws on a renumber
export function hasEdits(edit: {changes: PreviewCardChanges; imageName: string | null}): boolean; // Edit's one edits rule
// src/tools/studio/editSearch.ts and changeRows.ts (R4-2b; R-71, R-76). R4-4d adds SearchRow.deployed
export function searchCards(input: EditSearchInput): EditSearchResult; // the branch file's cards first; rows capped at SEARCH_LIMIT (40)
export function changeRows(input: ChangeRowsInput): ChangeRow[];      // form order, then the Image row
// src/tools/studio, the Edit controller (R4-4a to R4-4d; R-66 to R-71)
export function usePreviewCardsFile(token: string): UsePreviewCardsFileResult;
export function useCardEditor(input: {token: string; cardId: string | null}): CardEditorController;
// src/tools/studio/branchCards.ts (R4-4d, R4-8a)
export function hasPreviewId(card: Pick<LorcanaCard, 'id' | 'setCode'>): boolean;    // an id in its set's preview band; the one copy, which
// releasedNumbers.ts imports too (R4-8a). An image-only save of such a card checks the branch file (SavePlan.checksFile, R4-8f)
export function isRevealPreview(card: Pick<LorcanaCard, 'id' | 'setCode'>): boolean; // R4-8a: a reveal-set card under a preview id, the
// one kind the branch file decides: only it waits for previewCards.json (R-71), and only it reads untagged while the file is unread
// src/tools/studio/studioPaths.ts and studioLayout.ts (R4-5a, R4-6a; R-57, R-63, R-64)
export function shouldBlockStudioNavigation(from: StudioLocation, to: StudioLocation, dirty: StudioDrafts): boolean;
export function studioUnsavedMessage(leave: StudioLeave): string; // names exactly the drafts the hold protects; both in one sentence while
// neither commit is in flight (R4-8c)
export function studioUnsavedQuestion(leave: StudioLeave): string | UnsavedQuestion; // R4-8c, the guard's message: leaving Card studio,
// the line alone; a card change, "Leave this card?" with "Keep editing" and "Drop changes", or "Leave the card" when it drops nothing (R4-8f)
export function studioLayout(width: number): StudioLayout;        // STUDIO_WIDE_MIN 1328, on useContainerWidth's content box
// src/tools/studio/outcomeShows.ts (R4-8d): when the outcome line shows something, and so takes the handoff in place of the banner (R-59)
export function outcomeShows(outcome: {result: {commitUrl: string} | null; error: string | null; dropped?: number | null}): boolean;
// src/tools/studio/StudioPage.tsx (R4-6a, R4-6b)
export function StudioPage(); // no token: PageLayout "Card studio" writes, round GithubTokenGate; a token: <StudioWorkspace key={token} />
// src/ui (R4-5f): Tag({children, title?}); cardFacts(card), moved from analytics/cards/cardView.ts. SR_ONLY in layout.ts is #34's (e804608)
// src/shell/FocusNotice.tsx (R4-8d): FocusNotice({handoff, children}), moved out of CardPageBody; Edit card's notices take it too

// As built against R4-card-studio.md's contract additions (R4-8). Each changes or adds to an addition; nothing is renamed.
// Addition 5, the classes: see "R4 adds" under AdminStyles above: R4-5a's seven, reshaped by R4-5x and R4-8b, and R4-8b's two and its rule.
// Addition 6, the layout: STUDIO_SLOT.narrow.form's minimum is 'min(300px, 100%)', so the form takes a phone's whole line (R4-8b, WCAG
//   1.4.10); studioStyles.ts exports PICK_MIN_WIDTH (112), the rarity and Inkwell grids' column (R4-8b)
// Addition 7, readiness: the Ink item reads "Checked against the collector number: fix it first" for a filled number outside the set,
//   "set it first" for a blank one (R4-5x). An in-set number a released card holds leaves Ink done (R4-5y)
// Addition 8: editorState's StagedImage went (R4-8d): stagedImage() returns livePreview's ChosenImage. cardPanel.ts's {name, error}
//   StagedImage is the one left
// Addition 11, the Edit controller:
//   Draft gains dropped?: number (R4-4c) and kept?: KeptEdits, set as a same-card re-seed lands (R4-8c)
export interface KeptEdits {edits: boolean; staged: boolean; wasEditable: boolean} // R4-8c (wasEditable: R4-8f): what the re-read left
//   imageOnlyOf({draft, lookup}): ImageOnlyReason | null (R4-4b), the reason the page shows, following the lookup
//   revertDraftImage(draft) (R4-8f): Revert image as a pure step. It and discardDraft take back what KeptEdits claims
//   EditSave gains savingThisDraft: boolean, a save made from the draft on screen, which the guard words as in flight (R4-8c), and
//   kept: KeptEdits | null (R4-8c). loadAgain also serves the read-only view's "Read previewCards.json again" (R4-5r)
//   CardEditorController: retry reads the file after any failed read, a later read's reloadError too (R4-6b); previewFile also serves the
//   open card's failed re-read (R4-8c); seed: number, by which the Edit pane keys its form (R4-6b)
//   SavePlan's image path gains checksFile: hasPreviewId(card) (R4-8a, R4-8f), and goes through commitPreviewCardImage when it is set
//   cardLookup opens every card that isn't isRevealPreview straight from the card list (R4-8a), so a released set-14 card never waits
// Addition 12, the components:
//   PickerGroup's layouts are 'inks' | 'tiles' | 'grid' (R4-5x): 'inks' is the primary row's six columns, minmax(0, INK_TILE_SIZE) each
//   StudioForm gains list?: CardListStatus (R4-8f); ReadyChecklist gains actions?: ChecklistActions, a control under an item (R4-8f:
//   "Load the card list again" under Collector number while the list has failed)
//   StudioCardPanel: the file's error and the staged note share one polite live region, beside the current art (R4-8c)
//   ChangeList gains imageOnly?: boolean (R4-5r): "Replace the image to make a change. It's listed here before you save."
//   CommitOutcome gains editable?, edits?, staged? (R4-5r, R4-8c) and wasEditable? (R4-8f), which loadAgainNote words; it takes the
//   handoff while outcomeShows
// Addition 13, the page:
//   Edit's note with an image is "Vercel is deploying it: allow 15 to 20 minutes before the new image shows on inkweave.ink." (R4-8c);
//   a fields save's is New reveal's
//   R4-6b's Produces block: EditPane(props: EditPaneProps {edit, cardId, layout, handoff, onForgetToken});
//   StudioWatch {cardId, failed} and asksForFocus(before, now & {replaced}), useStudioHandoff(): FocusHandoff, which starts from no
//   card on a PUSH, so "Edit in Card studio" from /cards hands focus to the banner (R4-8c); PublishedReload {published, reload} and
//   useReloadAfterPublish(input): void, R-66's read once a New reveal publish lands
//   NewRevealPane asks for the handoff after a publish only while it is still shown (R4-8c)
// studioFixtures.ts: RELEASED_REVEAL_CARD (3286, set 14's #21, R4-8a); revealController gains a loaded cardList and a no-op retryCardList
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

Each task had its own file under [R-redesign/][task-files], in order; the files were removed once the redesign shipped (#110) and the links below open them in history. Every task ends with a commit that leaves lint, typecheck and tests green. Each file starts with any contract additions it relies on; those are also collected above.

| Task | File | Delivers |
|---|---|---|
| R1-1 | [R1-01-banner-removal.md][R1-01-banner-removal] | The phase branch; the Banner generator gone in full (tests, playwright, docs, lint exception) |
| R1-2 | [R1-02-theme.md][R1-02-theme] | `adminTheme.ts`, `AdminStyles`, contrast tests, stories on the admin canvas |
| R1-3 | [R1-03-primitives.md][R1-03-primitives] | `format.ts` and the UI primitives with tests and stories |
| R1-3b | [R1-03b-chart-kit.md][R1-03b-chart-kit] | The chart kit: scales, frame with table view, legend, tooltip, keyboard cursor, bar and line/area charts, range control |
| R1-4 | [R1-04-token-state.md][R1-04-token-state] | One shared GitHub token store |
| R1-5 | [R1-05-artifact-cache.md][R1-05-artifact-cache] | Per-session artifact cache |
| R1-6 | [R1-06-shell.md][R1-06-shell] | Sidebar, `PageLayout`, `BranchNotice`, routes (interim) |
| R1-7 | [R1-07-write-tools.md][R1-07-write-tools] | Reveal, image and tuning pages inside `PageLayout`; the sidebar owns Forget token |
| R1-8 | [R1-08-overview.md][R1-08-overview] | Overview at `/`, `verdict.ts` |
| R1-9 | [R1-09-vote-activity.md][R1-09-vote-activity] | Vote activity at `/activity` |
| R1-10 | [R1-10-web-analytics.md][R1-10-web-analytics] | Web analytics at `/web`, bridged ink and rarity icons |
| R1-11 | [R1-11-calibration-host.md][R1-11-calibration-host] | `/calibration` (today's view, `?rule=`), `/analytics` retired |
| R1-12 | [R1-12-docs-and-check.md][R1-12-docs-and-check] | CLAUDE.md and PLAN.md, stories sweep, real-data check, gates, PR |

### R1 as built (2026-10-02)

- **Checked with real data** (Task R1-12): the Overview matches the numbers computed from the data files (the deployed `/analytics` page is behind the login, so it could not be compared), every chart shows its tooltip on hover and from the keyboard and switches to a table of its values, Vote activity draws 30 days with month labels and redraws for 7 and 90 days and All (weekly bars past 90 days), with day selection, Web analytics shows the events by total with ink and rarity icons and a crosshair on the trend, Calibration renders, the write pages show the branch notice and the token gate (the token box is covered by unit tests only, until the owner saves a token), the sidebar's state survives a reload, `/analytics` lands on the Overview, and each analytics file is fetched once per session. The files were exported at 18:53 UTC on 2026-10-01, so the newest day in each daily chart is partial.
- **Pending with the owner:** the token-saved checks on the write pages (the sidebar's token box, and "Forget token" acting on every page at once), which only the owner can run because only the owner enters a token.
- **Bridge:** the re-exports R1 left unused (`CAP_LABEL`, `SURFACE_CARD` and `TabList`, Task R1-12 Steps 6 and 7) were dropped from `src/app-bridge.ts` (owner, 2026-10-02).
- **Departures from the task text:** none.

---

## Phase R2: Calibration & tuning (detailed)

[R-redesign/R2-calibration-tuning.md][R2-calibration-tuning]: tasks R2-1 to R2-8, re-based on R1 as built (main @ c92e260) and pin bc877e1 on 2026-10-05. Its decisions are R-17 to R-26 above.

### R2 as built (2026-10-06)

Tasks R2-1 to R2-8, then the final review's fix wave (`a79ecf7`, `dbe6c47`, `8c5fa7e`, `c0ec330`) and a polish commit (`adfc79e`), on `feature/24-redesign-r2`.

- **What shipped:**
  - **`/calibration`, merged.** The left column holds the rules table, the scope row, the scatter beside the gap histogram, the pair list beside its votes, the weekly gap and dimension participation. The aside holds the token gate, then the selected entry's rows over the pinned pending tray and its publish states. The selected rule lives in `?rule=`. The page writes: the sidebar shows the token box, and the header reads "Tuning writes to Doberjohn/inkweave `master`".
  - **`/tuning`** redirects to `/calibration`, and the sidebar's `tuning` item is gone (the R2 header's contract addition 13). R2-7 deleted the old calibration and tuning views.
  - **The chart kit:** `ScatterChart` over `scatter.ts`; `ChartPlot`'s `extend` and `describedBy`; LineChart's `yDomain`, `fixedGutters`, `titleFormat` and `missingText`, with the baseline's label in the y gutter; `ChartLegend`'s `'dot'`; `axis.ts`'s `gutterFor`.
  - **The guard:** `useUnsavedChangesGuard` and `UnsavedChangesGuard` (`src/shell/`), over the app's `DialogShell`, bridged. `TunedWorkspace` mounts it, once per page.
  - Also: `playstyleId` in the vote analytics (R-17), `calibrationHref` and the Overview's "Tune" or "Inspect" link (R-22), `PageLayout`'s `flush` and `PAGE_GUTTER`, and `BiasBar`'s `minWidth`.
- **Departures from the plan:**
  - **The charts row's track is 376px, not 346px** (R2-6). The scatter and the histogram sit side by side only from a 772px column. Each plot is then 334px or more, so the histogram prints all eleven bin labels. With 346px tracks, a column of 712 to 772px dropped the centre "0". The pairs row keeps 346px, two-up from 712px.
  - **The baseline's label sits in the y gutter** (R2-4c). Inside the plot, a gap line near zero struck "No gap" through. A tick within 12px of the baseline keeps its gridline and prints no label, so the two never meet. LineChart also gained `titleFormat`, so the gap plot's tooltip says "Week of Sep 14".
  - **The diagonal's label draws after the dots, with a 3px halo in the page colour** (R2-4c). At the two-up width the dots on the +1 row covered it.
  - **A failed reload keeps the last good config** (C1). `useLiveTuning`'s ready state carries `reloadError`. So when the read after a publish fails, "Published. View commit", the tray and the pending edits stay, with the read error above the tray. The full error view is only for a first read that failed. While the tray shows a stale-value refusal, its "Reload tuning.json" is the one way out: the read error offers no "Read tuning.json again" beside it.
  - **A missing path is a stale value** (F6). `applyTuningEdits` met an edit whose entry or Shift tier was gone with a raw TypeError. `githubClient.ts`'s `parentOf` now stops at a missing key, and the refusal reads "… changed since the editor loaded it (now missing)", so the tray offers Reload, which drops the edit.
  - **Focus moves on when its control goes** (F2, F19, F4). The page holds a focus handoff (`focusHandoff.ts`), which the aside's next view takes:
    - Save token focuses the aside's first heading, the entry's or else the tray's. After a failed first read, it focuses the error's button: "Read tuning.json again", or "Forget token" for a 401.
    - Forget token focuses the gate's "GitHub token" field.
    - "Read tuning.json again" focuses the first heading once a read lands.
    - "Reload tuning.json" focuses its status line, unless the user moved focus while the read ran.
    - A field that takes focus under the pinned tray scrolls into view (WCAG 2.4.11).
  - **The tray names each revert** "Revert {edit}" (F23). After a revert, focus goes to the next row's revert button, else the previous row's, else the tray's heading. Clear all focuses the heading.
  - **The guard words a publish in flight** (F13): "A publish to {branch} is in progress. Leaving won't stop it, and you won't see whether it landed." Otherwise it keeps the unsaved-edits message.
  - Smaller ones from the final review: the scatter places its dots once per layout (F1; see "Chart kit (R1-3b)"); its note's instruction describes its slider (F15); and the weekly gap's slider reads "no score votes" for a quiet week (F10).
- **Held for the owner, and how each was settled (2026-10-06):**
  - **Shipped in PR #28:**
    - a "Tune {entry}" link from the selected rule to its editor (C3);
    - the weekly gap's partial weeks, worded as Vote activity words them (F21);
    - ">99%" for a share just under 1 (`sharePercent`);
    - a sticky entry header in the aside.

    Its review added section-aware entry lookups (`EntryRef`), focus kept between the pinned header and the tray, and one-week wording in the shared helpers.
  - **Filed:** Doberjohn/inkweave#732, for `useDialogFocus`'s Shift+Tab gap. Doberjohn/inkweave#769 fixed it, and R4-5z dropped the guard's workaround (see "R4 as built").
  - **Skipped:** keeping the left column's state across a token save (F2).
  - **Moved to R3 (R-54):** moving `DataAsOf` into `src/ui` (F12).
- **Real-data check:** run on 2026-10-06 against the files of 2026-10-05. Numbers matched the files, and the layout held at 1440px and 1366px.

## Phase R3: Card analytics (detailed)

[R-redesign/R3-card-analytics.md][R3-card-analytics]: tasks R3-1 to R3-9, re-based on R2 as built (main @ aea40b4) and pin bc877e1 on 2026-10-06. Its decisions are R-28 to R-56 above.

### R3 as built (2026-10-07)

Tasks R3-1 to R3-9 (with R3-1a, R3-4b, R3-4c, R3-5b and R3-6a to R3-6c) on `feature/24-redesign-r3`, then the final review's fix wave (`51ec000`, `9757390`).

- **What shipped:**
  - **`/cards`, Card analytics.**
    - The page header's Switch card search (R-30), and under it the card header (R-49).
    - A KPI row, with Accuracy sentiment from raw answers (R-32).
    - Calibration for the card beside its voted pairs, with an engine-silent caption split in two (R-31).
    - Community scores and How voters answered two-up, and under them, at full width, Votes per week over the log's whole span (R-36).
    - The Engine view, and under it the network of the twelve strongest partners (R-37 to R-39). The network's subtitle takes one of three forms (R3-6c): a cut between two scores; a tie below stronger partners ("7 of the 8 partners at score 7 make the cut, by name."); or every drawn partner tied ("12 of at least 30 partners at score 8, by name, of at least 142 in all" on a capped card, with no "Thicker spokes score higher."). After the Engine view's Retry, focus goes to the panel's heading (`Panel`'s `titleFocusable`), or back to Retry when the read fails again (R-45, R-48).

    A bare `/cards` opens the last card viewed, or a "Pick a card" prompt with Cards to review (R-28). The tab names the card (R-51).
  - **Links.**
    - In: card names on Vote activity, the Overview and Calibration, through `CardName`, for ids the card list resolves (R-33).
    - Out: the card's rules link to `/calibration?rule=` (R-34).
  - **The chart kit.** `NetworkDiagram` over `networkLayout.ts`, with names measured by `textWidth` (R-40), the kit's dimming and naming (R-41), and `LABEL_HALO` in `axis.ts`.
  - **Shared pieces.**
    - In `src/ui`: `DataAsOf`, `LowNTag`, `sharePercent` and `twoUp` (R3-1a), and `SplitMeter` (R3-4c).
    - In `src/shell`: the focus handoff (R3-1a), and `KnownCardsContext` with its provider (R3-8).
    - In `activityModel.ts`: `VoteSpan`, beside `activityWindow` (R3-1a).
    - In `src/tools/analytics`: `CardName`, `PairNames` and `PairLine` (R3-8).
  - **Also:**
    - `GapScale` in `src/tools/analytics`, and `Verdict.phrase`, which fixed the Overview's "The engine well-calibrated" (R-50, R-53);
    - `PageLayout`'s `documentTitle` and, from the fix wave, `scrollKey`, and `nav.ts`'s `cardsHref`;
    - `Panel`'s `titleFocusable` (R3-6c), and its `title` widened to `React.ReactNode` for linked names (R3-8);
    - `.adm-option`, `.adm-net-link` and `.adm-link`;
    - the bridge's new names (R-55).
- **Departures from the plan:**
  - **Task R3-7, re-base (2026-10-06), against the R3 header's sketch:**
    - `cardPageState` returns a discriminated `CardPageState` (`{kind: 'card', card}`, `{kind: 'unknown', cardId}`, `{kind: 'failed', error}`, and the prompt and loading kinds) and takes the context's `getCardById`, so `CardPageBody`'s `switch` narrows each state with no checks of its own;
    - `useRememberCard(state)` takes that state, in place of `useRememberCard({cardId, card, isLoading, error})`;
    - the page requests the focus handoff from its state, when the URL names another card (never on a REPLACE) or the card list's error clears, and never on click: a router link's click-time request is taken by the old card's heading inside the navigation's transition (found by mutation);
    - the prompt's line and the not-found line take focus too (`<p tabIndex={-1}>`), so a Retry that lands on either keeps focus;
    - browser Back and Forward between two cards ask for the handoff too, and the heading takes it only if focus fell to `<body>`.
  - **The final review's fix wave, `51ec000` (F2):** `PageLayout` gained `scrollKey?: string`, which the plan didn't have. A Switch card pick opened the next card at the previous card's scroll offset: the scrolling body is `PageLayout`'s, outside the view keyed by card (R-46), and focus stays in the switcher (R-48), so nothing scrolled the new card into view. When the key changes, the body now scrolls back to the top before the next paint, and the header stays mounted, so focus stays in the switcher. `CardAnalyticsPage` passes the URL's card id, and no other page passes one. The plan's `PageLayout` lines record it (approved 2026-10-07).
  - **The final review's fix wave, `9757390`: a capped card's wording.** The engine keeps each group's top `ENGINE_GROUP_CAP` (100) partners, so a capped card's synergy file is partial: its tier split leaves out the weaker partners past the cap, and its tie count at the cut is only a floor (approved 2026-10-07).
    - The Engine view's cap caption now says so: "A synergy group lists only its top 100 partners, so the split counts only those and undercounts the weaker tiers."
    - The network's tie count reads "N of at least T partners at score S", where an uncapped card's reads "N of the T partners at score S". On a capped card, a tie below stronger partners ends "make the cut, by name, among those the engine lists."
    - Uncapped cards read as before. R-37's example gains the capped form.
- **Held for the owner:** the card list's Retry (R-45, R-48). The Browser pane can't fail the card list once it has loaded, so the check needs DevTools' request blocking in the owner's Chrome (Task R3-9, Step 13). It hasn't run; the page's tests cover the Retry and where focus lands after it.
- **Follow-up issues:** Doberjohn/inkweave-admin#29 (the Overview's Engine-silent pairs KPI mostly counts rotated-out cards) and #30 (the Overview's accuracy sentiment rests on few pairs), filed 2026-10-06. Filed 2026-10-07: Doberjohn/inkweave#748 (the votes the app left on set 13's preview ids), #32 (`RaritySymbol` and the printing webps), #33 (the minimum-votes filter, R-25), #34 (the final review's polish and test pins) and #35 (a faster test suite: the jsdom tests in a vm pool).
- **Real-data check:** run on 2026-10-07 against the files of 2026-10-05.
  - **Numbers.** They matched the files for three cards: the first to review, one with both kinds of engine-silent pairs, and the one with the most accuracy answers. Cards to review, the not-found copy and the links in matched too.
  - **Network subtitle.** Both tie forms read as R3-6c words them: every drawn partner tied on the first card to review, and a tie below stronger partners on the engine-silent card and on a second card the check found. The all-tied form also showed on a capped card, in the fix wave's capped wording ("12 of at least …").
  - **Focus and Retry.** Focus landed on the new card's heading after a Voted pairs link, a network node and a Cards to review link, and stayed in the switcher after a pick, which now opens the new card at the top of the page. After the Engine view's Retry it went to the panel's heading. The card list's Retry is held for the owner.
  - **History.** Back from a card opened from the prompt takes two steps to leave, as R3-7 accepted.
  - **Layout.** It held at 1440px and 1366px, and stacked on a phone with no sideways scroll. At 1366px with the sidebar open, the KPI row wraps five and one, leaving Accuracy sentiment alone on its row (the follow-up list).
  - **Network names** dropped by `textWidth` (R-40): on the first card to review, 0 at 1440px, 0 at 1366px and 11 of 12 at phone width; on the engine-silent card, 0, 0 and 6 of 12, the strongest partner's among them (the follow-up list). Twice-printed short names were told apart by the links' full names.
  - **Votes per week** (R-36): 28 bars, at about 37px a bar at full width at 1440px, 34px at 1366px and 6.5px on a phone.
  - **Accuracy sentiment.** The Overview's figure (from `pairs[]`) and the raw answers disagree in sign, which follow-up #30 takes up.
  - **Fetches.** Each analytics file was fetched once across the pages, and each card's synergy file once.
  - **Code Health.** `analyze_change_set` passed, with no findings. The PR's own CodeScene check is read once the PR opens (Task R3-9, Step 25).

#### #33: the votes filter (2026-10-12)

- **One setting.** "Votes: Any / 2+ / 5+" (R-25) keeps only the pairs with that many score votes. `/calibration` shows it at the end of the scope row, and the card page in Voted pairs' header. Both read one store, `src/tools/analytics/votesFilter.ts`, so a step set on one page holds on the other. The store lives in memory only, so a reload puts it back to Any, the issue's "off by default" (the owner chose one shared setting for the session, 2026-10-12).
- **What it scopes.** On `/calibration`: the scatter, the histogram, Widest gaps and the weekly gap. Widest gaps filters before it takes its widest 40. The rules table, the scope line and dimension participation stay on every vote. On `/cards`: Voted pairs only. The KPIs and Calibration for this card stay on every vote.
- **Saying so.** Past Any, every scoped view names the step. The charts' scope label reads "All pairs with 2+ score votes" or "Ramp, pairs with 2+ score votes" in each subtitle, slider name and table caption. Widest gaps and Voted pairs say "The Votes filter is on: only pairs with 2+ score votes show." in place of the single-vote caveat, and Voted pairs counts "3 of 5 pairs". An empty scope says what it lacks: "No pairs with 5+ score votes under this rule yet."
- **Engine-silent counts.** Voted pairs' caption counts the card's engine-silent pairs from raw votes, so past Any it counts only those with the step's score votes ("Not listed: 1 engine-silent pair with 2+ score votes …"), and goes when none has. The scatter's count comes from the artifact, which holds no votes per engine-silent pair, so it stays on every vote and says so past Any: "The Votes filter doesn't apply to this count."
- **A picked pair** the filter leaves out shows as no pick, and comes back with its votes when the filter lets it in again.
- **Real data** (Supabase, 2026-10-12): of the 2,731 pairs with a score vote, 148 have 2+ and 1 has 5+. Of those app master's engine scores, 62 have 2+ (60 with two, 2 with three) and none has 5+, so 5+ shows nothing yet. R-25's steps stand as decided.

#### #34: the final review's polish (2026-10-12)

- **Layout.** The KPI row runs 6, 3 or 2 columns, never five and one. The network places each name, strongest first, on the first side of its node with room (`labelSpots`, `placeLabels`), so the strongest names take the room before the rest. Whether a name fits depends on the plot's measured width and the names' lengths, not on the screen's: in Storybook at 375px, 8 of the fixture's 12 names print, the strongest among them (5 before, without it). On narrower plots most still drop, and the plot keeps 340px. A tap on a node still opens the card (R-41, kept by the owner on 2026-10-12).
- **Links.** A `ChartTable` cell can carry an href (`ChartTableLink`), so the network's Table view links every partner. The card page's links take `.adm-link`, and Voted pairs tells linked partners by that underline.
- **Focus and status.** A Switch card pick says "Opened …" in the switcher's polite status, for screen readers only. A page that another page's card link mounts focuses the card's heading.
- **Shared pieces.** `SR_ONLY` in `src/ui/layout.ts`, the legend styles in `src/ui/legend.ts`, `RetryNotice` for the card list's and the Engine view's Retry, and `parityHarness.mjs` for the two parity tests.

## Phase R4: Card studio (detailed)

[R-redesign/R4-card-studio.md][R4-card-studio]: tasks R4-1a to R4-8, re-based on R3 as built and the pin bump (main @ e5e5029, pin 16283a13) on 2026-10-07. Its decisions are R-57 to R-91 above.

### R4 as built (2026-10-16)

Tasks R4-1a to R4-8 (R4-1a, R4-3a, R4-5a, R4-5s, R4-5h, R4-1b, R4-2a, R4-2b, R4-3b, R4-4a to R4-4d, R4-5b to R4-5f, R4-6a to R4-6c, R4-7) on `feature/24-redesign-r4`, cut from `main` after the pin bump to `16283a13` (PR #38); then the post-plan tasks R4-5x (`951e1c4`), the notice fix (`ff94ba4`), R4-5y (`5334453`), R4-5z (`0cf6abc`), R4-5r (`4a51cd8`), R4-5t (`edc4621`) and R4-5u (`45f104d`); two merges of `main`, `8850e5b` (PRs #39 to #43 and #46 to #49) and `2424347` (PR #50: the pin bump to `e6175c63`, main `15feac6`); and the final review's fix wave, R4-8a (`9f16117`), R4-8b (`3fb720d`, `d747749`), R4-8c (`620783a`), R4-8d (`baae08b`), R4-8e (`c0e4c9b`) and R4-8f (`1e138a8`).

- **What shipped:**
  - **`/studio`, Card studio.** One write page with two modes, New reveal and Edit card, behind the token gate inside `PageLayout … writes`.
    - The mode switch sits in the header's actions. It pushes `studioHref(mode, card)`, so Back returns to the other mode, and both drafts stay mounted (R-57). `scrollKey` is `studioHref(mode, card)`, so every mode or card change opens at the top (owner, 2026-10-07).
    - One `UnsavedChangesGuard` names the drafts a navigation would drop, in one sentence when it leaves Card studio with both dirty and neither commit in flight. It uses R2's sentence for a draft whose commit is in flight: New reveal's publish, or an Edit save made from the card on screen (R-58, R4-8c). A held card change asks "Leave this card?", with "Keep editing" and "Drop changes", or "Leave the card" when it drops nothing (R4-8c, R4-8f).
    - At a content width of 1328px and up the card comes first, in four columns; below that the form leads, as an accordion (R-63, R-64). In Chrome or Edge that is a 1608px window with the sidebar open, and 1432px with it collapsed.
    - The sidebar's Forget token drops both drafts. The in-page offer after a 401 asks first while a draft is dirty (R-84).
  - **New reveal.** It is the reveal publisher's write chain, unchanged (`commitNewCard`), with:
    - a ready checklist and section states from the validator, where a blank required field is incomplete, never red (R-72);
    - a refusal for a number past the set, which points to `variants.mjs stage` (R-73), and for a number a released card of the reveal set holds, which names the card (R4-5y);
    - Publish held until the card list has loaded without error, with the reason on the Collector number item, and "Load the card list again" after a failure (R4-8a, R4-8f);
    - French in the scan languages, and any other code named (R-60);
    - the card panel's caption, pill and formats (R-89);
    - the synergies in a "Synergies" panel marked "computed live" (R-90);
    - a go-live note of 15 to 20 minutes (R-66).
  - **Edit card.** It searches the card list plus the cards only the branch file holds, tagged "not deployed yet" (R-66). On a blank query, the branch file's preview cards come first (R-76).
    - **A preview card that round-trips through the form** gets field edits and an image in one commit (`replaceCardInPreviewJson`, `commitCardEdit`).
      - The commit compares only the editable keys plus id, setCode and number, and merges at the base commit, so `variants` survive (R-67).
      - Its messages follow R-78: `fix(reveals): update {fullName} ({setCode}{number})`, with " and its image" when a scan goes too, and `fix(reveals): refresh {fullName} ({setCode}{number}) to its English scan` when the edit drops `scanLanguage`. The collector number stays locked (R-91).
      - A changed entry is refused with "{fullName} changed on {branch} since you loaded it. Load it again.", and one that left the file with "{fullName} is no longer in previewCards.json on {branch}. Load it again." (R4-5r).
    - **A released card, or an entry the form can't hold,** gets a facts list with its reason, and an image-only commit through `commitCardImage` (R-61, R-65). For a card under a preview id, `commitPreviewCardImage` first checks that the branch file still holds it (R4-8a, R4-8f). An entry the form can't hold offers "Read previewCards.json again" (R4-5r).
    - **Only a reveal-set card under a preview id waits on `previewCards.json`** (R-71, R4-8a). Released cards, set 14's own since graduation, open from the card list at once, and a failed read blocks none of their image fixes.
    - **After a save,** the card stays open, and the saved values become its baseline (R-70).
    - **A refusal** offers Load it again, which keeps the edits that still apply and says how many it dropped (R-68). Its line says what the read left, as it landed: every edit, the staged image, or nothing more (R4-8c, R4-8f).
    - **A save that lands after the operator left the card** shows nothing (R-69).
    - **Focus** moves from state, never on a click (R-59, R-48), and the tab names the card (R-51). After "Drop changes" on a held "Load a different card", the search takes focus (R4-5t), and "Edit in Card studio" from `/cards` hands it to the Editing banner (R4-8c).
  - **Links.**
    - "Edit in Card studio" on Card analytics (R-82).
    - "View card analytics" from the Editing banner, for deployed cards (R-33).
    - `/reveal` and `/image` redirect to `studioHref('new')` and `studioHref('edit')` (R-10).
  - **Shared pieces.**
    - `studioHref` and `StudioMode` in `nav.ts` (R-81);
    - the guard's `to` and its message function, which may return a whole `UnsavedQuestion`, and `writeInFlightMessage` (R-58, R4-8c);
    - `Tag` and `cardFacts` in `src/ui` (R4-5f), and `FocusNotice` in `src/shell` (R4-8d);
    - `SegmentedControl`'s `fill` (R4-8b), `Notice`'s long-word wrap (`ff94ba4`) and `PageLayout`'s positioned bodies (R4-5u);
    - nine `adm-*` classes and the `.adm-seg[data-fill="true"]` rule;
    - in the bridge, `InkwellIcon` and `transformRawCards` added, and `EMPTY_BOX` and `GOLD_GLOW` gone.
  - **Also:**
    - `/web` draws printings through `RaritySymbol` (R-83), and the bridge no longer re-exports the three printing webps (`RaritySymbol` imports them itself). PR #40 did it on main first, closing #32, and the merge kept its version;
    - the runbook, the skills and the reveal-sync wording point at Card studio (R4-7, R4-8e, R4-8f).
- **Departures from the plan:**
  - **The base (merged 2026-10-14 and 2026-10-15; the second on the owner's go-ahead of 2026-10-15):** `main` was merged in twice, `8850e5b` after PRs #39 to #43 and #46 to #49 (#44 and #45 were closed unmerged) and `2424347` after PR #50, so the branch ends on main `15feac6` and pin `e6175c63`. Set 14 graduated on 2026-10-14 (Doberjohn/inkweave#780), so the pinned `previewCards.json` holds no cards, and the tests that read it run the graduated file. Where main and R4 had made the same change, the merge kept main's: #32's `RaritySymbol` path on `/web` and the webps' removal (PR #40; of R4-5h's work, its `RARITY_PROP` doc and its per-rarity `RaritySymbol` glyph test in `WebAnalyticsBody.test.tsx` stay), and the `SR_ONLY` move (#34, `e804608`; R4-5b's).
  - **`ff94ba4` (the controller's story check, 2026-10-12):** `Notice` wraps a long word (`overflowWrap: 'anywhere'`), so a GitHub 401's API path can't push the 280px aside sideways. Its props are unchanged, and the tuning aside gains it too.
  - **Task R4-5x (`951e1c4`, the controller's story check, 2026-10-12):** the six primary ink tiles sit in a six-column grid (`PickerGroup`'s new `inks` layout, with `INK_TILE_SIZE` exported from `AdminStyles.tsx`), so Steel no longer wraps alone in the wide form. The Ink item says "fix it first" for a filled number outside the set, and Card text's empty summary reads "None (optional)".
  - **Task R4-5y (`5334453`, approved 2026-10-15):** New reveal refuses a number a released card of the reveal set holds ("#21 is already Miguel Rivera - Street Musician (3286)"). Graduation gave set 14's cards official ids (14021 became 3286), so no preview id showed the number taken, and New reveal could publish a duplicate. `validateRevealCardForm` gains an optional fourth argument, `released` (`releasedNumbers.ts`), so every three-argument caller, reveal-sync's `write.mjs` included, checks as before: an additive change to the reveal-sync contract. Reveal-sync's own check is Doberjohn/inkweave-admin#51.
  - **Task R4-5z (`0cf6abc`, approved 2026-10-15):** the guard drops its Shift+Tab workaround, since the app's trap at `e6175c63` counts the message as sitting before the first button (Doberjohn/inkweave#769, for #732). The guard's Shift+Tab test now pins the app's fix through the bridge, so a pin that lost #769 would fail it.
  - **Task R4-5r (`4a51cd8`, the rehearsal's findings, approved 2026-10-15):** an image-only card's empty change list reads "Replace the image to make a change. It's listed here before you save."; the stale refusals name the card by `fullName`, where the plan said "Card {id}"; Load it again into an entry the form can't hold says "It can't be edited here now, so N edits were dropped."; that read-only view offers "Read previewCards.json again"; `EditForm` reads the controller's `imageOnly`, not the lookup's; and a failed re-read shows its error under the outcome. `keepEdits` counts none dropped for an image-only draft, which the re-read's line needs.
  - **Task R4-5t (`edc4621`, the rehearsal, approved 2026-10-15):** Leave this page blurs the focused element before it lets the navigation through, so after a held card change the search takes the handoff. That fixes R4-6b's open defect, where focus fell to `<body>` (R-59). The search selects its old query on focus, and `commitNewCard`'s message is pinned ('feat(reveals): add Test (1485)').
  - **Task R4-5u (`45f104d`, the rehearsal's finding F8, approved 2026-10-15):** `PageLayout`'s bodies are positioned. Before, `SR_ONLY` text below the fold (`FormSection`'s status spans, `VoteLogTable`'s caption) sat against the document, which grew an 8px scrollbar that took width from R-64's measure and let the shell scroll.
  - **Task R4-8a (`9f16117`, the final review; the owner's "can you fix them all here?", 2026-10-15):** New reveal's Publish waits for the card list (`cardListPending`), so the released-number check fails closed: the important finding `released-guard-fails-open-without-card-list`. Only `isRevealPreview` cards wait for `previewCards.json`, so released set-14 cards open at once (R-71). A preview card's image-only save checks the branch file at its base (`commitPreviewCardImage`, over `commitCardImage`'s new optional `atBase`), since a raw scan under an id the app no longer has would convert to an orphan AVIF. `hasPreviewId` has one copy, in `branchCards.ts`. Every editable key's stale check is pinned. Reveal-sync's PR body names the write chain, not "Card studio's validation". `useGithubToken.ts:4` and `useRevealAdmin.ts`'s doc are reworded as history, comments only. The reveal controller and `releasedNumbers.ts` now import from `src/tools/studio` (`readiness`, `branchCards`); no lint rule forbids it.
  - **Task R4-8b (`3fb720d`, `d747749`, the same approval):** Type's `SegmentedControl` takes `fill`, its buttons sharing the row in pairs, so it fits the wide form's 306px column at the R-64 switch and goes two and two on a 320px phone: the important finding `v1-type-control-overflow-at-1440`. The narrow form slot's minimum is `min(300px, 100%)`, so `/studio` reflows on a phone with the rail (`studio-phone-reflow`, WCAG 1.4.10). A form section clips (`overflow: 'clip'`), so the accordion header's ring and fill stay inside its corners. The cost slider's track is `barNeutral` (3.3:1, WCAG 1.4.11). The Editing banner clips its fill to its padding box. Card analytics' rules table scrolls in a named region the keyboard reaches (`adm-scroll-region`), in `CardCalibrationPanel.tsx`, a file the plan didn't list. `d747749` answered its review. Its one important finding was Uninkable's label running past its button at 320px, so the Inkwell pair stacks where two `PICK_MIN_WIDTH` (112px) columns don't fit. The Type buttons pair up (`adm-seg-pair`), so a wrapped row goes two and two, and the ink tiles stay square there.
  - **Task R4-8c (`620783a`, the same approval):** Edit's image note gives the deploy's wait, "Vercel is deploying it: allow 15 to 20 minutes before the new image shows on inkweave.ink.", since the deploy converts the scan itself: the important finding `image-go-live-note`. "Edit in Card studio" from `/cards` hands focus to the banner, as `/cards` does on a PUSH. The guard words a save in flight only for the draft on screen (`savingThisDraft`). The staged note speaks in the card panel's polite region. The re-read line says only what the read kept (`KeptEdits`). A held card change asks about the card (`UnsavedQuestion`, the dialog's `words`), and leaving Card studio with both drafts dirty says so in one sentence. The open card's file error shows only after a failed re-read, with Forget token on a 401. New reveal asks for the handoff after a publish only while its pane is shown, and its card panel reads `ctrl.imageError`. Page-level tests now pin the guard's `dirty` and `busy` and the REPLACE rule.
  - **Task R4-8d (`baae08b`, the same approval):** one `FocusNotice`, in `src/shell`, for `/cards` and Edit card; one outcome rule (`outcomeShows.ts`); one page-test harness, split in two (`studioStores.ts`, `studioHarness.tsx`) because a module the bridge mock loads binds to the real bridge; editorState's `StagedImage` gives way to `ChosenImage`, its twin; `AdminShell.test.tsx`'s bridge mock gains `isLoading` and `error`; stories for the new states; and `NoMatch`'s play function asserts. `router.test.tsx` already scored 10.0, so it was left as it was.
  - **Task R4-8e (`c0e4c9b`, Step 12's `docs: describe Card studio as built (#24)`, the same approval):** besides CLAUDE.md, it changed the runbook, the fetch-reveals skill and a `PageLayout.test.tsx` comment, where the plan had "CLAUDE.md, only if its Step 12 finds a gap". The runbook says when a save goes stale and when Publish waits for the card list. The temporary admin#51 stops say when they go.
  - **Task R4-8f (`1e138a8`, the wave's own review notes, approved 2026-10-16):** the card-change dialog's leave answer reads "Leave the card" when the change drops nothing; Discard and Revert image take back what the re-read line claims (`revertDraftImage`); "It still holds data the form can't." shows only for a card that was already read-only (`KeptEdits.wasEditable`), else "It can't be edited here now, because it holds data the form can't."; New reveal's Identity dot stays incomplete while the card list loads or has failed, and "Load the card list again" retries it (`retryCardList`, `ReadyChecklist`'s `actions`); the image-only file check covers every preview id (`hasPreviewId`); and `eslint.config.js` lets a `region` take `tabIndex` 0 (`jsx-a11y/no-noninteractive-tabindex`'s roles), so `src/` holds no `eslint-disable`.
  - **`nav.ts`'s hand count (R-81):** 6 of 6 primitive parameters, over CLAUDE.md's 30% as written. R-81 accepted the risk, and the PR's CodeScene check judges it.
  - **The planned tasks, as their hand-offs record:**
    - **R4-3a:** `sectionStatuses`, with no exported `SECTION_FIELDS`; `visibleImageError` and `ImageStatus`; the form module is `emptyForm.ts`; a checklist item's message is null exactly when it is done.
    - **R4-3b:** `readyToPublish` returns the publish's inputs or null, and `canPublish` is `ready !== null`; `livePreview.ts` holds `ChosenImage` and `imageErrorOf`, which both controllers' `imageError` go through.
    - **R4-4a:** `requested` is state; `reloadError` and `commit(entry)` are new; `reload` returns a promise, which a replaced caller resolves with the newest read's cards, once its landing renders.
    - **R4-4c:** `EditSave`, `dropped: number | null`, and `failure` for a stale refusal; and R-70's departure from the image tool, which dropped the card after a publish.
    - **R4-4d:** an id in both lists is decided by the preview-id band; `deployed` sits on the controller and on `SearchRow`; branch-only cards lead the list; Edit's synergies run over the union.
    - **R4-5a:** `studioModeOf(location)`, `studioCardOf`, `draftsAtRisk` and `STUDIO_SLOT_ORDER`; `adm-file-cover`, a seventh class.
    - **R4-5b:** the Dual-ink switch, with its state in `StudioForm`; `fieldWiring.ts` and `formSections.ts`; the labels (Franchise and Scan language with hints, Second ink, "None"); the Cost box before its slider; `locked` covers text fields only.
    - **R4-5c:** the Inkable buttons after the Type row; the Dual-ink switch starts on for a form with a second ink; an unlisted rarity stays as its own pressed button; no `aria-invalid` on a picker group; the ink group is named "Ink".
    - **R4-5d:** `StudioCardPanel` takes `current` and `staged: StagedImage`; Revert image keeps focus in the panel; the stripes for a card with no name or art, `useId` ids, and the tile keyed by its art.
    - **R4-5e:** `CommitOutcome` is always mounted, with `dropped`, `onForgetToken` and `handoff`; `loadAgainNote.ts`; Load it again is a neutral `CtaButton`; the synergy panel has its own empty line.
    - **R4-5f:** `Tag` and `cardFacts` in `src/ui`, `cardFacts` moved from `cardView.ts`.
    - **R4-6a:** `PageLayout` renders inside `StudioWorkspace` once a token is saved; `publish` returns its promise; `FLUSH_BODY`'s `scrollbarGutter`; `StudioSlots`; `revealController` in `studioFixtures.ts`.
    - **R4-6b:** the URL-driven handoff is `useStudioHandoff`, in `StudioPage`, where a move to no card asks too; a gone card shows `goneNote` above the search; the Editing banner sits inside the workspace's 16px padding, not full-bleed; R-66's reload is an effect keyed on the commit's link (`useReloadAfterPublish`); `retryReads` reads the file after any failed read.
    - **R4-6c:** "Edit in Card studio" is the Overview's `PanelLink` (R-82); writePages' invariants live in `StudioPage.test.tsx` and `router.test.tsx`.
    - **R4-7:** beyond the plan, R4-5y's refusal and R4-5r's lines in the runbook, the graduation record, and a temporary stop on `/fetch-reveals` for a graduated set until admin#51, in the runbook and in the skill's preflight. `goneNote` carries a second sentence the plan didn't quote ("If its set was released, inkweave.ink lists the card under a new id once the release deploys: reload admin then, and find it by name."), and CLAUDE.md says Card studio reads `previewCards.json` after each of its commits that changes the file, since an image-only commit reads nothing (CM-5).
  - **This plan's records, rewritten from the code (R4-8, Step 13):** the Roadmap's R4 row and the sentence under it; R-64's switch widths, R-78's evidence and R-86's date, each in place, with as-built notes on R-71, R-83 and R-87; the released-number correction to the spec; the file rows for `AdminStyles`, the primitives, `layout.ts`'s `SR_ONLY`, `PageLayout`, the guard, `FocusNotice` (new), Card analytics, the studio and the reveal modules, and the deleted list's webps; the class list, `INK_TILE_SIZE` and `SegmentedControl`'s `fill`; the bridge record; the guard's records (`UnsavedWords`, `UnsavedQuestion`, the dialog's `words`, the widened `UnsavedMessage`); R4's block of main names, with a new block for where the code differs from the R4 header's contract additions; and R2 as built's #732 line, which now names its fix. The task files keep the plan as it was.
- **Held for the owner:**
  - **Set 15.** A live New reveal publish, and Edit's read after it (R-66's `useReloadAfterPublish`), wait for set 15's reveals: set 14 is fully revealed and graduated. Tests cover both.
  - **After the merge (R-88).** The handoff left the working copy on 2026-10-16; the owner deletes it, and `.git/info/exclude`'s two handoff lines.
  - **Settled:** R4-6b's focus defect, fixed in the branch (R4-5t, `edc4621`), so it has no issue; the user-level `scan-reveal-card` skill edit, applied on the owner's yes (R4-7); and Edit's spacing (the rehearsal's check 10): the Editing banner's text starts 16px right of the page title, inside the workspace's padding (R4-6b), which the owner kept (2026-10-16).
- **Follow-up issues:**
  - Doberjohn/inkweave-admin#51: reveal-sync's write refuses a reveal-set number a released card holds
  - Doberjohn/inkweave-admin#52: Card studio: revert one change at a time in Edit's change list (R-77)
  - Doberjohn/inkweave-admin#53: Refresh a variant printing to its English scan from admin (R-80)
  - Doberjohn/inkweave-admin#54: Card studio: accept a dropped image file (R-89)
  - Doberjohn/inkweave-admin#55: Card studio: polish and test pins left from R4's final review
  - The app's docs issue (R-62) is filed after the merge, and #24's closing comment names it.
- **The owner's rehearsal (R-86):** run on 2026-10-15 against `rehearsal/r4-studio`, a throwaway app branch cut from `564f0f4a`, the commit before graduation, with set 14's 204 preview cards; deleted since. The controller drove it, with the token the owner saved, in the built-in browser. The pane was hidden for most of the first run, so a second run, with it painting, took the collapsed layout. A read-only audit found all five of admin's saves byte-clean: the file's layout kept, only the intended keys changed, nothing lost.
  - **New reveal:** #21 read "#21 is already Miguel Rivera - Street Musician (3286)" (R4-5y), and #205 "#205 is past the 204-card set: special printings go in through variants.mjs stage", with the Ink item's "fix it first". Publish stayed off, and nothing was published.
  - **Edit, variants kept:** Baymax - Lab Assistant (14085) kept its `variants`, its Epic printing's `scanLanguage: "it"` included, in `3be03300` "fix(reveals): update Baymax - Lab Assistant (1485)".
  - **English refresh:** Nick Wilde - Toy Drive Officer (14014) took `scanLanguage: "fr"` in `9a380728`, then lost it, with its version renamed, in `e7842ea1` "fix(reveals): refresh Nick Wilde - Toy Drive Captain (1414) to its English scan".
  - **Released card:** 3286's image went image-only in `529474b2` "fix(card-images): update image for Miguel Rivera - Street Musician [3286]", beside the read-only "Card data" list. convert-reveal-images runs only on master, so the scan's AVIF conversion never ran.
  - **Stale refusal:** a hand edit to Port Authority (14034) on the branch refused the save, and after a consistent rename Load it again kept the edit ("Every edit still applies."), saved in `a01ba1e5`. A first hand edit that changed `version` alone left the entry unreadable to the form, so it opened read-only, which R4-5r took up.
  - **Layout:** the switch came at a 1608px window with the sidebar open (root 1360px) and 1432px collapsed. 1366px and 1440px with the sidebar open, and 1366px collapsed, gave the accordion; 1440px collapsed gave four columns. With the sidebar collapsed, each width near the switch (1432px, 1436px and 1440px) held one layout over 2 s in New reveal, and Edit with a tall card (14034) stayed wide at 1432px and 1440px, with no sideways scroll. The run found F8, the document scrolling under the narrow accordion, which R4-5u fixed. Focus across a flip (check 2) was closed on the code, on the owner's call: focus stays in a moved slot, with two known limits, a field in a section the narrow accordion closes, and an accordion header when the form widens.
  - **Branch-only card and spacing:** on that base every set-14 preview row was branch-only ("not deployed yet"), and 14085, 14014 and 14034 opened and saved. Only the read after a New reveal publish waits for set 15. The Editing banner's text starts 16px right of the page title (48px in, against the title's 32px) at 1366px and 1440px, which the owner kept (2026-10-16).
  - **Focus after Leave:** R4-5t fixed it, and its `StudioEdit.test.tsx` case, by mouse and by keyboard, failed before the fix. The browser check (check 7's focus) was closed on that test, on the owner's call. Check 7's wording, Stay and the mode switch passed. The links and redirects (check 9) passed, and the reload prompt (check 11) was closed on R2's guard tests, on the owner's call.
  - **Not exercised:** a field edit saved with a scan, the two-file commit whose message ends " and its image", is covered by unit tests only. After a rename on the branch, the banner, the search and the facts show the deployed name until inkweave.ink deploys (R-66, finding D3): the owner left it as is.
- **Checks (R4-8):**
  - **Storybook.** At `45f104d`, `storybook build` passed and every story rendered (204 of 204). R4's 90 stories showed no sideways scroll at 1600px, 1440px, 1366px and 375px, except the stories pinned to the wide layout at 375px (New reveal's EmptyWide, Published and RejectedToken, and Form's wide stories). axe reported 0 violations in 57 stories. That run found V1, the Type control overflowing at the R-64 switch, which R4-8b fixed. After the wave, at `c0e4c9b`, the build passed again, and 16 layout measurements found nothing: the Type control on one line in the 306px column and two and two on a 320px phone, the ink tiles square at every width, the other segmented controls unchanged, and `NoMatch`'s play function passing. At `1e138a8` (R4-8f), `pnpm build`, `check:deps` and `storybook build` (210 stories) passed once more.
  - **Without a token** (at `45f104d`), `/studio` shows the gate under the page's header and branch notice (`master`), with six nav links and no sideways scroll, at desktop width and at 375px. `/reveal` and `/image` redirect without a history entry of their own. "Edit in Card studio" on `/cards/1936` opens `/studio?mode=edit&card=1936`, and Back returns to the card. Nothing requests GitHub.
  - **Final review:** 20 findings, 4 important (all confirmed) and 16 minor, none rejected; the critic checked all 35 decisions and all 48 parity capabilities. On the owner's word the wave fixed all 20, with the ledger's sweep minors (R4-8a to R4-8e). R4-8f took the wave's own review notes, and the rest is in #55.
  - **Code Health.** `analyze_change_set` passed at `45f104d` (165 files), at `c0e4c9b` (178 files) and at `1e138a8` (179 files), with no findings, and every new file scores 10.0. The PR gate's watch points are `nav.ts`, at 6 of 6 primitive parameters (R-81's accepted risk), and `router.test.tsx`'s helpers. The PR's own CodeScene check is read once the PR opens (Task R4-8, Step 17).

<!-- The removed task files, at the last commit that has them (2ed41e8). -->
[task-files]: https://github.com/Doberjohn/inkweave-admin/tree/2ed41e8edbe6b5afce6e0db3f8a974ea21354cd7/docs/plans/R-redesign
[R1-01-banner-removal]: https://github.com/Doberjohn/inkweave-admin/blob/2ed41e8edbe6b5afce6e0db3f8a974ea21354cd7/docs/plans/R-redesign/R1-01-banner-removal.md
[R1-02-theme]: https://github.com/Doberjohn/inkweave-admin/blob/2ed41e8edbe6b5afce6e0db3f8a974ea21354cd7/docs/plans/R-redesign/R1-02-theme.md
[R1-03-primitives]: https://github.com/Doberjohn/inkweave-admin/blob/2ed41e8edbe6b5afce6e0db3f8a974ea21354cd7/docs/plans/R-redesign/R1-03-primitives.md
[R1-03b-chart-kit]: https://github.com/Doberjohn/inkweave-admin/blob/2ed41e8edbe6b5afce6e0db3f8a974ea21354cd7/docs/plans/R-redesign/R1-03b-chart-kit.md
[R1-04-token-state]: https://github.com/Doberjohn/inkweave-admin/blob/2ed41e8edbe6b5afce6e0db3f8a974ea21354cd7/docs/plans/R-redesign/R1-04-token-state.md
[R1-05-artifact-cache]: https://github.com/Doberjohn/inkweave-admin/blob/2ed41e8edbe6b5afce6e0db3f8a974ea21354cd7/docs/plans/R-redesign/R1-05-artifact-cache.md
[R1-06-shell]: https://github.com/Doberjohn/inkweave-admin/blob/2ed41e8edbe6b5afce6e0db3f8a974ea21354cd7/docs/plans/R-redesign/R1-06-shell.md
[R1-07-write-tools]: https://github.com/Doberjohn/inkweave-admin/blob/2ed41e8edbe6b5afce6e0db3f8a974ea21354cd7/docs/plans/R-redesign/R1-07-write-tools.md
[R1-08-overview]: https://github.com/Doberjohn/inkweave-admin/blob/2ed41e8edbe6b5afce6e0db3f8a974ea21354cd7/docs/plans/R-redesign/R1-08-overview.md
[R1-09-vote-activity]: https://github.com/Doberjohn/inkweave-admin/blob/2ed41e8edbe6b5afce6e0db3f8a974ea21354cd7/docs/plans/R-redesign/R1-09-vote-activity.md
[R1-10-web-analytics]: https://github.com/Doberjohn/inkweave-admin/blob/2ed41e8edbe6b5afce6e0db3f8a974ea21354cd7/docs/plans/R-redesign/R1-10-web-analytics.md
[R1-11-calibration-host]: https://github.com/Doberjohn/inkweave-admin/blob/2ed41e8edbe6b5afce6e0db3f8a974ea21354cd7/docs/plans/R-redesign/R1-11-calibration-host.md
[R1-12-docs-and-check]: https://github.com/Doberjohn/inkweave-admin/blob/2ed41e8edbe6b5afce6e0db3f8a974ea21354cd7/docs/plans/R-redesign/R1-12-docs-and-check.md
[R2-calibration-tuning]: https://github.com/Doberjohn/inkweave-admin/blob/2ed41e8edbe6b5afce6e0db3f8a974ea21354cd7/docs/plans/R-redesign/R2-calibration-tuning.md
[R3-card-analytics]: https://github.com/Doberjohn/inkweave-admin/blob/2ed41e8edbe6b5afce6e0db3f8a974ea21354cd7/docs/plans/R-redesign/R3-card-analytics.md
[R4-card-studio]: https://github.com/Doberjohn/inkweave-admin/blob/2ed41e8edbe6b5afce6e0db3f8a974ea21354cd7/docs/plans/R-redesign/R4-card-studio.md
