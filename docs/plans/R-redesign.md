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

**Tracking:** Doberjohn/inkweave-admin#24. Branch: one per phase: `feature/24-admin-redesign` (R1), `feature/24-redesign-r2` (R2), `feature/24-redesign-r3` (R3); one PR per phase.

**Status:** R1 built and checked against real data on 2026-10-02; see "R1 as built". R2 built, checked against real data and merged on 2026-10-06 (PRs #27 and #28); see "R2 as built". R3 built and checked against real data on 2026-10-07; see "R3 as built". R4 is outlined below and detailed when it starts.

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
| R-25 | Later, not R2 | A "Votes: Any / 2+ / 5+" filter, and clicking a histogram bar to filter the other charts. |
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
| **R2** | Calibration & tuning merged at `/calibration` (rules table, pairs, votes, dimension participation, tuning aside with pending tray and publish states); the calibration scatter, gap histogram and weekly gap trend; `/tuning` redirects | Calibration, tuning edits on a rehearsal branch | Below (detailed 2026-10-05) |
| **R3** | Card analytics at `/cards` (the card models `cardStats.ts` and `cardVotes.ts`, the switch-card combobox, the engine view from `fetchCardSynergies`, the synergy network diagram, the split meter); card names on the other insights pages link to it | Per-card pages | Below (detailed 2026-10-06) |
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
| `src/ui/format.ts` | Number, gap, share and date formatting shared by every page; `sharePercent` moves here from R2's `chartData.ts` in R3-1a (R-43) |
| `src/ui/*.tsx` | Primitives: `Panel`, `KpiCard`, `SegmentedControl`, `MeterBar`, `BiasBar`, `ScorePill`, `RawTag`, `Notice`, `Sparkline`; from R3, `DataAsOf` (R-54) and `LowNTag` (R-35), which R3-1a moves out of four pages and R2's `RulesTable`, and `SplitMeter` (R3-4c, R-42). R3-6c gives `Panel` `titleFocusable`, and R3-8 widens its `title` to `React.ReactNode` |
| `src/ui/layout.ts` | `twoUp(track)`, the grid that sets two panels side by side once the column holds two tracks (R3-1a, moved from R2's `CalibrationWorkspace`) |
| `src/charts/*` | The chart kit (R1-3b): scales (`scale.ts`), range math and `RangeControl` (`range.ts`, `RangeControl.tsx`), series helpers and the hatch (`series.ts`, `HatchPattern.tsx`), legend, tooltip, keyboard cursor, frame with table view, `BarChart`, `LineChart`, one story file (`Charts.stories.tsx`). Since R1's final fix wave the two charts share their y axis and plot (`axis.ts`, `ChartSvg.tsx`), take their geometry from pure layouts (`barLayout.ts`, `lineLayout.ts`), and BarChart draws through `BarDrawing.tsx` and `SelectableBars.tsx`. R2-4a adds `ScatterChart.tsx` over the pure `scatter.ts`, plotted through `ChartPlot`'s `extend`. R3-4b adds `NetworkDiagram.tsx` over the pure `networkLayout.ts`, whose names are measured with `textWidth` (R-40), and moves `LABEL_HALO` into `axis.ts` |
| `src/github/useGithubToken.ts` | Shared token state (one store for every component), same API as today |
| `src/shell/nav.ts` | The sidebar's items, groups and which routes write (replaces `tools.ts`), and the path helpers `calibrationHref` (R2-6) and `cardsHref` (R3-5, R-33) |
| `src/shell/Sidebar.tsx` | Sidebar: brand, groups, items, token box, collapse (persisted) |
| `src/shell/PageLayout.tsx` | Page header (title, subtitle, meta, actions, branch notice) and scrolling body; `flush` and `PAGE_GUTTER` for a page that lays out its own columns (R2-6); `documentTitle` for a tab name that says more than the title (R3-7, R-51); `scrollKey`, which scrolls the body back to the top when it changes (R3's final fix wave) |
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
| `src/tools/analytics/cards/*` | R3's `/cards`: `cardStats.ts` (the card's calibration from `pairs[]`, its rules, `cardsToReview`; R3-2), `cardVotes.ts` (its raw votes, bound once as `CardVote`; R3-3), `engineView.ts` and `useCardSynergies.ts` (the engine's partners by score then name, and the hook with `retry`; R3-4), `lastCard.ts`, `cardSearch.ts` and `CardSwitcher` (R3-5); `CardAnalyticsView` and its parts: `cardView.ts` (the view's pure derivations) and `cardStyles.ts` (the styles its panels share), `CardHeader`, `CardKpis`, `CardCalibrationPanel` and `VotedPairsPanel` (R3-6a), `voteCharts.ts` and `RawVotePanels` with `CommunityScores`, `VoterAnswers` and `VotesPerWeek` (R3-6b), `engineCharts.ts` and `EnginePanels.tsx` (the Engine view and the network panel; R3-6c); `cardPageState.ts`, `CardPageBody.tsx` (the page's states round the view) and `CardAnalyticsPage` (R3-7); and `cardFixtures.ts`, the plain module the tests and stories share. `scripts/lib/__tests__/cardVotesParity.test.mjs` holds the card identity to the precompute's own transforms |
| `src/tools/analytics/CardName.tsx` | `CardName`, `PairNames` and `PairLine` (R3-8, R-33): a card name that links to `/cards/<id>` only when the card list holds the id, else plain text. Vote activity's log and Most voted pairs, the Overview's Latest votes and Calibration's vote-detail heading print names through them |
| `src/tools/tuning/tuningRows.ts`, `src/tools/tuning/tuningFailure.ts` | The editor's rows and names, and the failure kinds (R2-2), beside the kept `useLiveTuning`, `useTuningAdmin` and `githubClient.ts`, and the restyled `components/PendingTray.tsx` and `components/TierRow.tsx` |
| `src/github/rejectedToken.ts`, `src/github/ForgetTokenOffer.tsx` | A token GitHub rejects (401): the check, and the "Forget token" offer (R-26), for R4's write pages too |
| `src/shell/useUnsavedChangesGuard.ts`, `src/shell/UnsavedChangesGuard.tsx` | The unsaved-edits guard (R-19): the hook, its dialog, and the one-line component a page mounts |
| `src/shell/focusHandoff.ts` | Focus for the next view when an action unmounts the control that had it (R-48): moved from `calibration/` in R3-1a. The tuning aside and the card page take it |
| `src/shell/knownCards.ts`, `src/shell/KnownCardsProvider.tsx` | Which card ids the card list holds (R3-8, R-33): `KnownCardsContext` and `useIsKnownCard`, whose default resolves no id, and the provider `AdminShell` mounts round the outlet. `CardName` reads it |
| `src/test/cardLinks.tsx` | `renderWithCards(ui, known)`: a test's render in a `MemoryRouter`, under a card list of the `known` ids (R3-8) |

Deleted in R1: `src/tools/banner/**`, `scripts/export-banner*.mjs`, `docs/BANNER.md`, `public/art/banner/`, `src/shell/ToolIndex*`, `src/shell/tools.ts`, `src/shell/WriteToolFrame.tsx`, and the top-level `src/tools/analytics/{AnalyticsPage,AdminAnalyticsDashboard,ActivityView,DayGroup,WebAnalyticsView}*` files (not the new `activity/` folder) with their stories and tests. `Scorecard`, `WeeklyActivityChart` and `VerdictHero` stay until R2 (`CalibrationView` uses them). Deleted in R2: R1's `src/tools/analytics/CalibrationPage.tsx` and its test (R2-6); `CalibrationView`, `VerdictHero`, `Scorecard`, `WeeklyActivityChart`, `RuleCalibrationTable` and `RawVotesNotice`, with their stories and tests, and `src/tools/tuning/{TuningPage.tsx,index.ts}` with `components/{TuningEditor,RuleSelector}` and their stories and tests (R2-7). R3 deletes no file. R3-1a moves `focusHandoff.ts` from `calibration/` to `src/shell/`, and drops the private copies of what it shares (`DataAsOf` in four pages, `LowNTag`, `twoUp`, `sharePercent` and `VoteSpan`).

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
export function SegmentedControl<T extends string>(props: {options: ReadonlyArray<{value: T; label: string}>; value: T; onChange: (v: T) => void; ariaLabel: string}): JSX.Element;
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
// src/tools/analytics/voteLogTypes.ts (R3-1): VoteLogRow narrows accuracy to -1 | 0 | 1 | null, difficulty to 1 | 2 | 3 | null and
// whoCarries to 'a' | 'b' | 'both' | 'neither' | null, the votes table's own checks

// src/tools/analytics/CalibrationView.tsx, CalibrationPage.tsx (R1-11; retired in R2: R2-6 deleted the page, R2-7 the view)
// CalibrationViewProps gained: initialRuleId?: string | null  (an id the analytics don't have opens on "All pairs"). Retired in R2 with the view
// R2's page: src/tools/analytics/calibration/CalibrationPage.tsx, export function CalibrationPage(): JSX.Element;

// src/tools/analytics/voteAnalyticsTypes.ts, RuleStat gains (R2-1, R-17)
playstyleId?: string | null; // a playstyle rule's tuning.json key, null for a direct rule; absent in artifacts written before R2
// scripts/lib/voteAnalytics.mjs (R2-1): ruleRosterEntry(rule) -> {ruleId, ruleName, category, playstyleId: string | null};
//   loadRuleRoster maps getAllRules() through it, and rollUpByRule passes playstyleId through

// src/shell/useUnsavedChangesGuard.ts, UnsavedChangesGuard.tsx (R2-5a, R-19; R4's studio reuses them)
export interface UnsavedChangesGuardState {blocked: boolean; stay: () => void; leave: () => void}
export type LeavesPage = (from: Location, to: Location) => boolean; // react-router-dom's Location
export function useUnsavedChangesGuard(dirty: boolean, leaves?: LeavesPage): UnsavedChangesGuardState; // default: a new pathname leaves
export function UnsavedChangesDialog(props: {open: boolean; message: string; onStay: () => void; onLeave: () => void}): JSX.Element | null;
export function UnsavedChangesGuard(props: {dirty: boolean; message: string; leaves?: LeavesPage}): JSX.Element | null;
// useBlocker needs a data router, and a router holds one blocker: one guard per page, mounted by the page, never by a view a story renders.
// R2's calibration model, tuning model and aside: R-redesign/R2-calibration-tuning.md, contract additions 8 to 10.
// R3's card models, engine model and hook, last card, switcher, view and page: R-redesign/R3-card-analytics.md, contract additions 8 to 14.
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

## Phase R2: Calibration & tuning (detailed)

[R-redesign/R2-calibration-tuning.md](R-redesign/R2-calibration-tuning.md): tasks R2-1 to R2-8, re-based on R1 as built (main @ c92e260) and pin bc877e1 on 2026-10-05. Its decisions are R-17 to R-26 above.

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
  - **Filed:** Doberjohn/inkweave#732, for `useDialogFocus`'s Shift+Tab gap.
  - **Skipped:** keeping the left column's state across a token save (F2).
  - **Moved to R3 (R-54):** moving `DataAsOf` into `src/ui` (F12).
- **Real-data check:** run on 2026-10-06 against the files of 2026-10-05. Numbers matched the files, and the layout held at 1440px and 1366px.

## Phase R3: Card analytics (detailed)

[R-redesign/R3-card-analytics.md](R-redesign/R3-card-analytics.md): tasks R3-1 to R3-9, re-based on R2 as built (main @ aea40b4) and pin bc877e1 on 2026-10-06. Its decisions are R-28 to R-56 above.

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
- **Follow-up issues:** Doberjohn/inkweave-admin#29 (the Overview's Engine-silent pairs KPI mostly counts rotated-out cards) and #30 (the Overview's accuracy sentiment rests on few pairs), filed 2026-10-06. Drafted in R3-9, not filed: the votes the app left on set 13's preview ids, `RaritySymbol` and the printing webps, the minimum-votes filter (R-25), and the final review's follow-up list.
- **Real-data check:** run on 2026-10-07 against the files of 2026-10-05.
  - **Numbers.** They matched the files for three cards: the first to review, one with both kinds of engine-silent pairs, and the one with the most accuracy answers. Cards to review, the not-found copy and the links in matched too.
  - **Network subtitle.** Both tie forms read as R3-6c words them, each on a card the check found. The all-tied one was on a capped card, so it read in the fix wave's capped wording ("12 of at least …").
  - **Focus and Retry.** Focus landed on the new card's heading after a Voted pairs link, a network node and a Cards to review link, and stayed in the switcher after a pick, which now opens the new card at the top of the page. After the Engine view's Retry it went to the panel's heading. The card list's Retry is held for the owner.
  - **History.** Back from a card opened from the prompt takes two steps to leave, as R3-7 accepted.
  - **Layout.** It held at 1440px and 1366px, and stacked on a phone with no sideways scroll. At 1366px with the sidebar open, the KPI row wraps five and one, leaving Accuracy sentiment alone on its row (the follow-up list).
  - **Network names** dropped by `textWidth` (R-40): on the first card to review, 0 at 1440px, 0 at 1366px and 11 of 12 at phone width; on the engine-silent card, 0, 0 and 6 of 12, the strongest partner's among them (the follow-up list). Twice-printed short names were told apart by the links' full names.
  - **Votes per week** (R-36): 28 bars, at about 37px a bar at full width at 1440px, 34px at 1366px and 6.5px on a phone.
  - **Accuracy sentiment.** The Overview's figure (from `pairs[]`) and the raw answers disagree in sign, which follow-up #30 takes up.
  - **Fetches.** Each analytics file was fetched once across the pages, and each card's synergy file once.
  - **Code Health.** `analyze_change_set` passed, with no findings. The PR's own CodeScene check is read once the PR opens (Task R3-9, Step 25).

## Phase R4: Card studio (outline)

[R-redesign/R4-card-studio.md](R-redesign/R4-card-studio.md). Detailed when R4 starts.
