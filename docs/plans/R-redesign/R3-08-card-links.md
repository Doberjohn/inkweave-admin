> Part of [R: Admin redesign](../R-redesign.md), phase R3 ([R3-card-analytics.md](R3-card-analytics.md)). Read the main plan's decisions (R-28 to R-56 for R3), corrections, global constraints and shared interfaces, then the R3 header, first.

> **Re-base notes (R3-8, 2026-10-06).** This task is new. The outline had no R3-8: it left links into `/cards` as open question 5 (`R3-card-analytics.md:2763`), and R-33 settled it. It is written against main @ `aea40b4` (R2 as built), pin `upstream/inkweave` @ `bc877e1`, R3-5's `cardsHref` (`R3-05-switcher.md` Step 3) and the audit's Q5 (`audit-questions.json`).
> - **What changes (R-33).**
>   - Card names become links to `cardsHref(id)` on four surfaces:
>     - Activity's vote log (`VoteLogTable.tsx:51-58`);
>     - Activity's Most voted pairs (`ActivitySidePanels.tsx:97-103`);
>     - the Overview's Latest votes (`LatestVotesCard.tsx:41-44`);
>     - Calibration's vote-detail heading (`VoteDetailTable.tsx:113-116`).
>   - A name links only when the card list resolves its id. Every other name stays plain text: 60% of logged votes name an id outside the list (R-33), and `/cards` could only show its not-found message for them (R-29).
>   - PairList's rows stay buttons (`PairList.tsx:107-123`). A link can't sit inside a button, so on `/calibration` the vote-detail heading carries the links.
> - **How a surface knows the card list: a small admin context, `KnownCardsContext`.**
>   - **Where it lives.**
>     - `src/shell/knownCards.ts` holds the context and its hook.
>     - `src/shell/KnownCardsProvider.tsx` fills it from the app's `getCardById`.
>     - AdminShell mounts the provider inside `CardDataProvider`, around the `Outlet` (`AdminShell.tsx:21`, `:35-37`).
>     - Its default resolves no id. So a view rendered on its own, as in a test or a story, prints every name as text, exactly as today. Not one existing test or story changes because of it.
>   - **Why not `useCardDataContext()` in the name component.**
>     - It throws outside `CardDataProvider` (`CardDataContext.tsx:38-44`).
>     - The four surfaces render without that provider in every view test and story: `VoteLogTable.test`, `ActivityView.test`, `OverviewView.test`, `VoteDetailTable.test`, `CalibrationPage.test`, and the ActivityView, OverviewView, VoteDetailTable and CalibrationWorkspace stories.
>     - The app's context object isn't exported, so a test can't hand it a fake list. Only `CardDataProvider` can fill it, and that provider fetches the card list.
>   - **Why not props from each page.** The card list would have to travel through about a dozen signatures:
>     - `ActivityPage` → `ActivityView` → `ActivityBody` → `VoteLogTable` → `LogTable` → `DayRows` → `VoteRow`, and → `TopPairsPanel`;
>     - `OverviewPage` → `OverviewView` → `LatestVotesCard` → `LatestVotesBody`;
>     - `CalibrationPage` → `TunedWorkspace` → `CalibrationWorkspace` → `ScopedAnalytics` → `VoteDetailTable`.
>
>     The three pages would call `useCardDataContext()`, so `ActivityPage.test`, `OverviewPage.test` and `CalibrationPage.test` would each need a bridge mock.
>   - **Placement follows R-53.** No file in `src/shell` imports from `src/tools`, so the context and the provider go in the shell. The name components go in `src/tools/analytics/`, beside `VoteDetailTable` and `PairList`, where all four callers live. That is R-53's reasoning for `GapScale`.
>   - **Two file names that differ by more than case.** `knownCards.ts` and `KnownCardsProvider.tsx`, never `KnownCards.tsx`. On this Windows file system, `./KnownCards` would resolve to `knownCards.ts` first, since `.ts` comes before `.tsx` in the resolver's list.
>   - **React 19's `<Context value>`** is the provider. This is admin's first `createContext`; the app uses the same pattern for its card data.
> - **The name components: one file, three components** (`src/tools/analytics/CardName.tsx`).
>   - `CardName({id, name})`: a router `Link` to `cardsHref(id)` when the id resolves, else the bare name.
>   - `PairNames({pair})`: "Elsa × Anna", each name a `CardName`. It renders inline, for the heading.
>   - `PairLine({pair})`: `PairNames` on one truncating line, for the log, the list and the latest votes.
>   - **Its prop types.** `pair` is `{a, b, aName, bName}`. `VoteLogRow`, `PairStat` and `topPairs`' rows all fit it.
> - **The link's style: `.adm-link` in AdminStyles.** CLAUDE.md puts states there.
>   - **At rest.** The link keeps the text colour and takes a muted underline. Gold alone won't do:
>     - Gold (`#ffb900`) against the white text beside it (`#e8e8e8`) is 1.41:1. Telling a link from plain text by colour alone needs 3:1 (WCAG 1.4.1, technique G183), and the axe rule `link-in-text-block` that Storybook's a11y addon runs checks the same thing.
>     - The underline is the cue. It shows which names have a page, so "Elsa × 2983" reads as one linked name and one plain name.
>     - The underline is `muted` (`#90a1b9`), 7.08:1 on a card.
>   - **On hover.** The link turns gold, 10.8:1 on a card.
>   - **On focus.** The admin ring: 2px gold, 2px out (`.adm-nav-item` and the rest use the same).
> - **The focus ring needs room in the lines that clip.**
>   - The three lines truncate with `TRUNCATE`, which sets `overflow: hidden`:
>     - **Most voted pairs.** The cell has no side padding (`ActivitySidePanels.tsx:19`), so a ring 2px out would lose its left edge.
>     - **Latest votes.** The line has no padding at all. Its line box is 19.5px (13px at the app's 1.5 line height) round a 16.4px content area: Plus Jakarta Sans is 1038 / −222 units per 1000, read from the woff2's `hhea`. So the ring would lose its left edge and most of its top and bottom.
>   - **The fix.** `PairLine` pads 4px (`SPACING.xs`, the ring's 2px width plus its 2px offset) and takes it back as a negative margin. The ring then fits inside the clip, and nothing on the page moves.
>   - The vote log's cell has 8px / 16px of padding and needed no room. It uses `PairLine` too, so all three lines are one component.
>   - The heading doesn't clip.
>   - **What remains.** A second name cut short by the ellipsis loses its ring's right edge. The cell's `title` keeps the whole pair, as it does today.
> - **Panel's `title` widens from `string` to `React.ReactNode`.**
>   - It is VoteDetailTable's heading. Panel already renders whatever `title` holds, so only the type changes.
>   - The region is still named by the h2's text, "Sisu × Raya". `CalibrationPage.test.tsx`'s region queries (`:359`, `:394`, `:483`, `:500`, `:523`) hold.
> - **`VoteDetailTable`'s `pair` prop gains `a` and `b`.** `CalibrationWorkspace` already passes a `PairStat` from `findPair` (`CalibrationWorkspace.tsx:295-299`), which has both. The story's `PAIR` needs them (Step 7).
> - **Behaviour worth knowing:**
>   - **Accessible names.** Each link's name is its card's name. Two links with the same name go to the same page (WCAG 3.2.4).
>   - **Tab stops.** The log gains up to two per row. Its `adm-hover-row:focus-within` highlights the row a focused name sits in.
>   - **Unsaved edits.** On `/calibration` with pending tuning edits, a name link asks first. A new pathname leaves the page, so R2's `UnsavedChangesGuard` catches it (R-19).
>   - **While the card list loads,** names are plain text. They gain their underline when the list lands. After a failed load they stay plain.
>   - **On `/calibration`, nearly every heading name links.** `pairs[]` holds only pairs the engine scores, and no unknown voted id appears in `pairs[]` (R-29).
> - **Tests.**
>   - Each surface gets a case: a resolved id is a link to `/cards/<id>`, an unresolved one stays text.
>   - `CardName.test.tsx` covers the three components and the context's default.
>   - The shell's wiring is tested in `AdminShell.test.tsx`, through a bridge mock of `useCardDataContext`, the repo's idiom (`writePages.test.tsx:15-18`).
>   - Every new test renders through one helper, `renderWithCards(ui, known)`, in `src/test/cardLinks.tsx`, beside the repo's other test helpers.
> - **Stories.** A `CardLinks` story each in Vote detail, Vote activity and Overview. The a11y addon then sees the links, and Step 10 checks the ring and the layout in them.
> - **Code Health.**
>   - **Local scores** (CodeScene MCP 1.1.3). 10.0 for:
>     - `CardName.tsx`, `knownCards.ts`, `KnownCardsProvider.tsx` and `CardName.test.tsx`;
>     - the edited `VoteLogTable.tsx`, `LatestVotesCard.tsx`, `VoteDetailTable.tsx`, `Panel.tsx` and `AdminShell.tsx`;
>     - the edited tests: `AdminShell.test.tsx`, `AdminStyles.test.tsx`, `ActivityView.test.tsx`, `OverviewView.test.tsx`, `VoteLogTable.test.tsx` and `VoteDetailTable.test.tsx`.
>
>     It gives no score for `ActivitySidePanels.tsx`, nor for that file at main, nor for the 17-line `cardLinks.tsx`.
>   - **Complexity.** The highest cyclomatic complexity is 2 (`CardName`). Only the test helper `renderWithCards(ui, known)` takes more than one argument.
>   - **Primitive arguments.** One: the provider's inline check takes a string id. `CardName.tsx` takes none, since every component takes an object.
>     - That check is one of `KnownCardsProvider.tsx`'s two parameter lists (`{children}` is the other). So by hand count the file is at 50%, over the 30% rule.
>     - CodeScene still scores it 10.0 with no finding. That score was re-checked on the review's fix sandbox.
>     - **The fix, not taken.** The context could carry `getCardById` itself (`value={getCardById}`, with `CardName` testing for `undefined`). But that renames the contract R3-9 records (`IsKnownCard` and `useIsKnownCard`, in R3-09-docs-check.md's contract record). The PR's CodeScene check is stricter than the local tool: it failed R2's `chartData.ts` at 33% primitive arguments while the local tool scored it 10. If it flags this file, take this fix and update R3-9's record to match.
>   - **A local 10.0 isn't proof.** R3-9 runs `analyze_change_set`.
> - **Verified in a scratch sandbox** (`scratchpad/r3-rebase/sandbox-R3-8`).
>   - **Setup.** A copy of `src` and the configs at `aea40b4`, with junctions to the repo's `node_modules` and `upstream`, and its own Vite cache. R3-5's `cardsHref` was added to its `nav.ts` (R3-5 Step 3). No R3-7 page was needed: the unit tests only read hrefs.
>   - **Red states.** Every "watch it fail" output below came from the sandbox with that step's implementation removed.
>   - **Results.**
>     - The seven touched test files plus `CardName.test.tsx` all pass.
>     - The whole `vitest run src` gave `Test Files  93 passed (93)` and `Tests  1063 passed (1063)` at main plus this task, with no `act()` warnings. That is 92 files and 1,050 tests at main, plus 1 file and 13 tests.
>     - `tsc -p tsconfig.app.json` exits 0.
>     - `eslint src --max-warnings=0` exits 0. Each new or edited file also passes `pnpm exec eslint --stdin` from the repo.
>   - **The earlier tasks' edits, re-checked** (`scratchpad/r3-rebase/sandbox-R3-8-fix`).
>     - **Setup.** Main, plus three sets of edits applied from their task files:
>       - R3-4b's and R3-5's AdminStyles edits and test cases;
>       - R3-5's `cardsHref`;
>       - R3-6c's `Panel` edits and test case.
>     - **Baseline.** AdminStyles and Panel gave 14 and 4 passing tests.
>     - **Steps 2 to 5,** as written below, then printed the quoted outputs:
>       - `3 failed | 12 passed (15)`;
>       - `15 passed (15)`;
>       - `2 failed | 1 passed (3)` with `5 passed (5)`, and the same five `tsc` errors;
>       - `13 passed (13)`.
>     - **Code Health.** CodeScene scored the merged `Panel.tsx` (R3-6c's prop plus this task's type) 10.0.
>   - **Not run.** No dev server and no Storybook. Steps 10 and 11 are the browser checks.
> - **Not taken.**
>   - **Gold at rest, as `PanelLink`.** It fails 1.4.1 against the neighbouring text (above). `PanelLink`'s links stand alone in a header or their own column, so they never had that problem.
>   - **Linking the pair list's rows, the scatter's tooltip or Most active voters.** R-33 names four surfaces. The rows are buttons, and the other two aren't card names.
>   - **A `title` on the Latest votes line.** It had none, and adding one is outside R-33.
>   - **R3-6's own links.** Its Voted pairs and network link partners on `/cards` itself, and R3-6 runs before this task. A follow-up could move them onto `CardName`, if a partner outside the card list should stay text there too.
> - **Depends on, and when it runs.** It runs after R3-7, as the task order puts it:
>   - **R3-5:** `cardsHref` in `src/shell/nav.ts`.
>   - **R3-7:** the `/cards` route and its nav item, so the links land on a page.
>   - Step 1 checks both.

### Task R3-8: Links into `/cards` (R-33)

**Files:**
- Create:
  - `src/shell/knownCards.ts`: the context, its type and its hook;
  - `src/shell/KnownCardsProvider.tsx`: the provider;
  - `src/tools/analytics/CardName.tsx`: `CardName`, `PairNames` and `PairLine`;
  - `src/test/cardLinks.tsx`: the test helper `renderWithCards`.
- Test, create: `src/tools/analytics/__tests__/CardName.test.tsx`.
- Modify `src/shell/AdminShell.tsx`: the imports (`:6-7`), the doc comment (`:9-13`) and the outlet (`:35-37`).
- Test, modify `src/shell/AdminShell.test.tsx`: the head (`:1-16`), and a case at the end (`:34`).
- Modify `src/theme/AdminStyles.tsx`:
  - the doc comment's last paragraph (`:53-55`);
  - three `adm-link` rules before the focus-visible block (`:90`);
  - one reduced-motion line (`:113`).
- Test, modify `src/theme/__tests__/AdminStyles.test.tsx`: `CLASSES` (`:17-18`, where R3-5's `'adm-option'` now sits), `FOCUSABLE` (`:36-37`), and a case at the end (`:168`).
- Modify `src/ui/Panel.tsx`: the `title` prop (`:6-7`).
- Test, modify `src/ui/__tests__/Panel.test.tsx`: a case before `:19`.
- Modify the four surfaces:
  - `src/tools/analytics/activity/VoteLogTable.tsx`: the imports (`:5-6`) and `VoteRow` (`:50-58`);
  - `src/tools/analytics/activity/ActivitySidePanels.tsx`: the imports (`:1`, `:6-7`), the doc comment (`:72`) and the pair cell (`:101-103`);
  - `src/tools/analytics/overview/LatestVotesCard.tsx`: the imports (`:2`, `:6-7`), the doc comment (`:22`) and the name line (`:41-44`);
  - `src/tools/analytics/VoteDetailTable.tsx`: the imports and props (`:4-8`), the doc comment (`:98-104`) and the panel's title (`:116`).
- Test, modify the surfaces' tests:
  - `src/tools/analytics/activity/__tests__/VoteLogTable.test.tsx`: the imports (`:4-5`), and a case before `:99`;
  - `src/tools/analytics/activity/__tests__/ActivityView.test.tsx`: the imports (`:3-4`), and a case before `:102`;
  - `src/tools/analytics/overview/__tests__/OverviewView.test.tsx`: the imports (`:3-4`), and a case before `:90`;
  - `src/tools/analytics/__tests__/VoteDetailTable.test.tsx`: the imports and `PAIR` (`:2-6`), and a case before `:54`.
- Modify the stories:
  - `src/tools/analytics/VoteDetailTable.stories.tsx`: the imports (`:1-3`), `PAIR` (`:49`), and a story at the end;
  - `src/tools/analytics/activity/ActivityView.stories.tsx`: the imports (`:1-3`), and a story at the end;
  - `src/tools/analytics/overview/OverviewView.stories.tsx`: the imports (`:3-4`), and a story at the end.

Line numbers are main's. Earlier tasks edit some of these files:
- **R3-1** edits `ActivityView.stories.tsx:42` and `:45`.
- **R3-4b and R3-5** add rules and cases to AdminStyles and its test. Steps 2 and 3 quote the text as it stands after them.
- **R3-6c** edits `Panel.tsx` (`:15`, `:19`, `:33`, `:50` and `:70`: the optional `titleFocusable`). It also adds a `Panel.test.tsx` case before `:30`.
- **R3-5b** changes `OverviewView.test.tsx:45`.
- **R3-1a and R3-7** touch none of these lines.

None of these edits touches this task's other anchors:
- Panel's `title?: string;` and the `'has no heading…'` case. R3-6c's case sits after the new one, so Step 4's `Panel.test.tsx(22,9)` error still holds.
- The OverviewView test's imports and its `'lists web events…'` case.

Every edit below names its anchor text, so it applies on top of theirs.

**Interfaces:**
- **Consumes:**
  - From `src/shell/nav.ts` (R3-5, R-33):
    ```ts
    export function cardsHref(cardId?: string): string; // '/cards', or '/cards/' + encodeURIComponent(cardId)
    ```
  - From the bridge: `useCardDataContext` (`CardDataContext.tsx:38-44`, at the pin):
    ```ts
    useCardDataContext(): UseCardDataReturn & {getCardById: (id: string) => LorcanaCard | undefined}; // throws outside CardDataProvider
    // cards: Core cards with the preview cards merged in (loader.ts:194-198); [] while loading or after a failure (useCardData.ts:64)
    ```
    The bridge also gives `SPACING` and `TRUNCATE`.
  - `Link` from `react-router-dom`, and `createContext` and `useContext` from `react`.
  - The surfaces' rows: `VoteLogRow` (`voteLogTypes.ts`), `topPairs`' rows (`activityModel.ts`) and `PairStat` (`voteAnalyticsTypes.ts`). Each has `a`, `b`, `aName` and `bName`.
- **Produces:**
  ```ts
  // src/shell/knownCards.ts (R3-8, R-33)
  export type IsKnownCard = (cardId: string) => boolean;
  export const KnownCardsContext: React.Context<IsKnownCard>; // default: no id resolves
  export function useIsKnownCard(): IsKnownCard;

  // src/shell/KnownCardsProvider.tsx: AdminShell mounts it inside CardDataProvider, round the Outlet
  export function KnownCardsProvider(props: {children: React.ReactNode});

  // src/tools/analytics/CardName.tsx
  export function CardName(props: {id: string; name: string});              // a Link to cardsHref(id) when the id resolves, else the name
  export function PairNames(props: {pair: {a: string; b: string; aName: string; bName: string}}); // "A × B", inline
  export function PairLine(props: {pair: {a: string; b: string; aName: string; bName: string}});  // PairNames on one truncating line, with 4px of ring room

  // src/test/cardLinks.tsx (tests only)
  export function renderWithCards(ui: React.ReactElement, known: readonly string[]): RenderResult; // in a MemoryRouter, under a card list of `known`

  // src/theme/AdminStyles.tsx: adm-link (a text link in data: text colour and a muted underline at rest, gold on hover, the 2px-out ring)
  // src/ui/Panel.tsx: title?: React.ReactNode (was string)
  // src/tools/analytics/VoteDetailTable.tsx: pair: {a; b; aName; bName; engineScore} | null (gains a and b)
  ```
- **What tests and pages can rely on in the DOM:**
  - A resolved name is `<a href="/cards/<id>" class="adm-link">{name}</a>`. Its accessible name is the card's name.
  - An unresolved name is a text node, so the cell's and the region's names stay "A × B".
  - Without `KnownCardsContext`, nothing links and no router is needed.

- [ ] **Step 1: Check what this task builds on**

From the repo root:

```bash
grep -n "export function cardsHref" src/shell/nav.ts
grep -n "id: 'cards'" src/shell/nav.ts
grep -n "cards/:cardId" src/router.tsx
grep -rn "KnownCards\|adm-link\|CardName\|PairLine" src
```

Expected:
- One line each from the first three: R3-5's helper, then R3-7's nav item and route.
- Nothing from the fourth.

What to do when the output differs:
- **No `cardsHref`.** R3-5 hasn't landed: stop.
- **No nav item or route.** R3-7 hasn't landed: stop. The links would land on the not-found page. If R3-7 wrote its route another way, look for it with `grep -n "cards" src/router.tsx` before stopping.
- **The fourth grep finds something.** Read it before going on: this task may have started already.

If this checkout hasn't built the engine since the pin, run `pnpm build:engine` once: these tests reach the bridge.

- [ ] **Step 2: Write the failing test for the link's style, and watch it fail**

In `src/theme/__tests__/AdminStyles.test.tsx`, `CLASSES` just before the chart kit's comment. At main that comment follows `'adm-hover-row',` (lines 17-18). R3-5 (Step 6) has put its `'adm-option'` and that option's comment between the two. Current:

```ts
  'adm-option',
  // The chart kit's (R1-3b).
```

New:

```ts
  'adm-option',
  // R3-8's: a card name's link.
  'adm-link',
  // The chart kit's (R1-3b).
```

R3-4b's `'adm-net-link'` and its comment stay at the end of `CLASSES`.

The end of `FOCUSABLE` (lines 36-37). R3-4b keeps `adm-net-link` out of `FOCUSABLE` on purpose, because it has no hover rule. So the list still ends as at main. Current:

```ts
  'adm-chart-hit',
];
```

New:

```ts
  'adm-chart-hit',
  'adm-link',
];
```

`adm-link` joins `FOCUSABLE`, so the existing case checks that it has a hover rule and a focus-visible rule. It doesn't join `PRESSABLE`, since a link has no pressed state.

At the end of the `describe`, before its closing `});` (line 168 at main), add:

```ts

  it('underlines a card link in the muted colour, golds it on hover and rings it 2px out (R3-8)', () => {
    const css = stylesheet();
    expect(css).toContain(`.adm-link{color:inherit;text-decoration:underline;text-decoration-color:${ADMIN_COLORS.muted};`);
    expect(css).toContain(`.adm-link:hover{color:${ADMIN_COLORS.accent};text-decoration-color:${ADMIN_COLORS.accent};}`);
    expect(css).toContain(`.adm-link:focus-visible{outline:2px solid ${ADMIN_COLORS.accent};outline-offset:2px;}`);
    const reduced = /@media \(prefers-reduced-motion: reduce\)\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(reduced).toMatch(/[.]adm-link(?![a-z-])[^{]*[{]transition:none;[}]/);
  });
```

Run:

```bash
pnpm vitest run src/theme/__tests__/AdminStyles.test.tsx
```

Expected: `Tests  3 failed | 12 passed (15)`. Before this case the file holds 14: main's 12, plus R3-4b's and R3-5's one each. The failures:
- `defines every adm-* class in the contract`: `AssertionError: expected '\n.adm-nav-item{display:flex;align-it…' to match /[.]adm-link(?![a-z-])/`
- `gives every interactive class a hover state and a gold focus-visible ring`: `AssertionError: expected '\n.adm-nav-item{display:flex;align-it…' to contain '.adm-link:hover'`
- `underlines a card link in the muted colour, golds it on hover and rings it 2px out (R3-8)`: `AssertionError: expected '\n.adm-nav-item{display:flex;align-it…' to contain '.adm-link{color:inherit;text-decorati…'`

- [ ] **Step 3: Add the `adm-link` rules**

In `src/theme/AdminStyles.tsx`, the doc comment's last paragraph (lines 53-55). Current:

```ts
 * Nav items pad 8px, not the handoff's 6 (off the spacing scale): in the 64px
 * rail, 12px gutters leave 40px, and 8 + 24 + 8 centres the mark exactly.
 */
```

New:

```ts
 * Nav items pad 8px, not the handoff's 6 (off the spacing scale): in the 64px
 * rail, 12px gutters leave 40px, and 8 + 24 + 8 centres the mark exactly.
 *
 * A text link inside data (adm-link: a card name in a log row, a list or a
 * heading) keeps its text colour and takes a muted underline: gold sits at
 * 1.41:1 against the text beside it, under the 3:1 that colour alone would
 * need (WCAG 1.4.1), so the underline is what tells a linked name from a
 * plain one. Hover golds it. Its ring sits 2px out, as a control's does, and
 * a line that clips keeps room for it (CardName's PairLine).
 */
```

Find the line that starts `.adm-nav-item:focus-visible,` (line 90 at main; R3-4b has appended `.adm-net-link:focus-visible` to it). Insert these three rules and a blank line above it. R3-5's `adm-option` rules, after the `adm-hover-row` rules, stay where they are, above the new rules:

```ts
.adm-link{color:inherit;text-decoration:underline;text-decoration-color:${C.muted};transition:color ${FAST},text-decoration-color ${FAST};}
.adm-link:hover{color:${C.accent};text-decoration-color:${C.accent};}
.adm-link:focus-visible{${FOCUS_RING}outline-offset:2px;}

```

The rules get their own focus-visible rule rather than a place in the shared list at line 90, which R3-4b extends. The two edits then never touch the same line.

In the reduced-motion block (line 113 at main), the block's opening line. Current:

```ts
@media (prefers-reduced-motion: reduce){
```

New:

```ts
@media (prefers-reduced-motion: reduce){
.adm-link{transition:none;}
```

The line below it is left alone. R3-5 has appended `,.adm-option` to it, so it now reads `…,.adm-hover-row,.adm-option{transition:none;}`.

Notes on the rules:
- **`color:inherit`.** A link takes its line's colour: the text colour in a cell or a heading. Without it, the UA's link blue would show. The app's stylesheet sets no `a` colour.
- **Token colours only.** `C.muted` and `C.accent` are COLORS hexes, which the token-colour case accepts. No font size or radius is added, so the scale case holds.
- **The default underline position.** The rules set no `text-underline-offset`, so the font's own position and the browser's default skip-ink keep it clear of descenders.

Run `pnpm vitest run src/theme/__tests__/AdminStyles.test.tsx`. Expected: `Tests  15 passed (15)`.

- [ ] **Step 4: Write the failing tests for the names, the Panel title and the shell, and watch them fail**

Create the test helper `src/test/cardLinks.tsx`:

```tsx
import type {ReactElement} from 'react';
import {render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {KnownCardsContext} from '../shell/knownCards';

/**
 * Renders `ui` the way a page in the shell sees it: in a router, under a card
 * list that holds the `known` ids (KnownCardsContext). Card names with those
 * ids render as links, every other name as text.
 */
export function renderWithCards(ui: ReactElement, known: readonly string[]) {
  return render(
    <MemoryRouter>
      <KnownCardsContext value={(cardId) => known.includes(cardId)}>{ui}</KnownCardsContext>
    </MemoryRouter>,
  );
}
```

Create `src/tools/analytics/__tests__/CardName.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {renderWithCards} from '../../../test/cardLinks';
import {CardName, PairLine, PairNames} from '../CardName';

// 2983 is in the card list; 17 isn't (rotated out of Core, say).
const PAIR = {a: '2983', b: '17', aName: 'Elsa - Snow Queen', bName: 'Anna - Heir to Arendelle'};

/** Each link as [its name, where it goes]. */
const links = () => screen.queryAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')]);

describe('CardName', () => {
  it('links a card the card list holds to its Card analytics page (R-33)', () => {
    renderWithCards(<CardName id="2983" name="Elsa - Snow Queen" />, ['2983']);
    expect(links()).toEqual([['Elsa - Snow Queen', '/cards/2983']]);
  });

  it('prints a card the card list lacks as plain text', () => {
    renderWithCards(<CardName id="17" name="Anna - Heir to Arendelle" />, ['2983']);
    expect(screen.getByText('Anna - Heir to Arendelle')).toBeInTheDocument();
    expect(links()).toEqual([]);
  });

  it('links nothing outside the shell, so a view renders on its own, with no router', () => {
    render(<CardName id="2983" name="Elsa - Snow Queen" />);
    expect(screen.getByText('Elsa - Snow Queen')).toBeInTheDocument();
    expect(links()).toEqual([]);
  });

  it('escapes the id, so it stays one path segment', () => {
    renderWithCards(<CardName id="a/b c" name="Odd" />, ['a/b c']);
    expect(links()).toEqual([['Odd', '/cards/a%2Fb%20c']]);
  });
});

describe('PairNames', () => {
  it('links each name on its own, with a × between them', () => {
    const {container} = renderWithCards(<PairNames pair={PAIR} />, ['2983']);
    expect(container).toHaveTextContent(/^Elsa - Snow Queen × Anna - Heir to Arendelle$/);
    expect(links()).toEqual([['Elsa - Snow Queen', '/cards/2983']]);
  });
});

describe('PairLine', () => {
  it('ends in an ellipsis, with room inside its clip for a focused link’s ring', () => {
    renderWithCards(<PairLine pair={PAIR} />, ['2983', '17']);
    const line = screen.getByRole('link', {name: 'Elsa - Snow Queen'}).parentElement;
    expect(line).toHaveTextContent('Elsa - Snow Queen × Anna - Heir to Arendelle');
    // The ring is 2px wide and 2px out: 4px of padding, taken back as margin, so the line doesn't move.
    expect(line).toHaveStyle({
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      padding: '4px',
      margin: '-4px',
    });
  });
});
```

In `src/ui/__tests__/Panel.test.tsx`, before `it('has no heading and is no landmark without a title', …` (line 19), add:

```tsx
  it('takes links in its title, and is still named by its text', () => {
    render(
      <Panel
        title={
          <>
            <a href="/cards/1">Sisu</a> × Raya
          </>
        }>
        <p>Votes</p>
      </Panel>,
    );
    const panel = screen.getByRole('region', {name: 'Sisu × Raya'});
    expect(within(panel).getByRole('heading', {level: 2, name: 'Sisu × Raya'})).toBeInTheDocument();
    expect(within(panel).getByRole('link', {name: 'Sisu'})).toHaveAttribute('href', '/cards/1');
  });

```

In `src/shell/AdminShell.test.tsx`, replace the head of the file (lines 1-16). Current:

```tsx
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import {ImagePage} from '../tools/image/ImagePage';
import {AdminShell} from './AdminShell';

function renderShellAt(path: string) {
  const routes = [{element: <AdminShell />, children: [{path: 'image', element: <ImagePage />}]}];
  render(<RouterProvider router={createMemoryRouter(routes, {initialEntries: [path]})} />);
}

beforeEach(() => {
  // The card data load never settles; the test is about the token.
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
  localStorage.setItem('inkweave.reveal-admin.gh-token', 'tok');
});
```

New:

```tsx
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import {CardName} from '../tools/analytics/CardName';
import {ImagePage} from '../tools/image/ImagePage';
import {AdminShell} from './AdminShell';

// The pages read a card list that holds one card, 2983; the rest of the bridge
// stays real. CardDataProvider still mounts, and its own load never settles.
vi.mock('../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../app-bridge')>()),
  useCardDataContext: () => ({cards: [], getCardById: (id: string) => (id === '2983' ? {id} : undefined)}),
}));

/** A page that prints two card names: one the card list holds, one it doesn't. */
function NamesPage() {
  return (
    <p>
      <CardName id="2983" name="Elsa - Snow Queen" /> and <CardName id="17" name="Anna - Heir to Arendelle" />
    </p>
  );
}

function renderShellAt(path: string) {
  const routes = [
    {
      element: <AdminShell />,
      children: [
        {path: 'image', element: <ImagePage />},
        {path: 'names', element: <NamesPage />},
      ],
    },
  ];
  render(<RouterProvider router={createMemoryRouter(routes, {initialEntries: [path]})} />);
}

beforeEach(() => {
  // The card data load never settles; the tests are about the token and the card links.
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
  localStorage.setItem('inkweave.reveal-admin.gh-token', 'tok');
});
```

The mock returns `cards: []` as well as `getCardById`. The token case's `ImagePage` reads `cards` (`useImageAdmin.ts:59`), which is the same empty list the never-settling load gives it today.

At the end of the `describe`, before its closing `});`, add:

```tsx

  it('links a card name on any page to its card page, but only a card the card list holds (R-33)', () => {
    renderShellAt('/names');
    expect(screen.getByRole('link', {name: 'Elsa - Snow Queen'})).toHaveAttribute('href', '/cards/2983');
    expect(screen.queryByRole('link', {name: 'Anna - Heir to Arendelle'})).not.toBeInTheDocument();
    expect(screen.getByText(/and Anna - Heir to Arendelle$/)).toBeInTheDocument();
  });
```

The case fails if AdminShell forgets the provider: `CardName` then reads the context's default and prints both names as text.

Run:

```bash
pnpm vitest run src/tools/analytics/__tests__/CardName.test.tsx src/ui/__tests__/Panel.test.tsx src/shell/AdminShell.test.tsx
```

Expected: `Test Files  2 failed | 1 passed (3)` and `Tests  5 passed (5)`.
- `src/shell/AdminShell.test.tsx`: `Error: Failed to resolve import "../tools/analytics/CardName" from "src/shell/AdminShell.test.tsx". Does the file exist?`
- `src/tools/analytics/__tests__/CardName.test.tsx`: `Error: Failed to resolve import "../CardName" from "src/tools/analytics/__tests__/CardName.test.tsx". Does the file exist?`
- Panel's five cases pass: main's three, R3-6c's, and the new one. Panel already renders whatever `title` holds; only its type is narrower. The type is what fails here:

```bash
pnpm typecheck
```

Expected: it fails with exactly these errors, after the engine build's output. The sandbox ran `tsc -p tsconfig.app.json`, the app half of `tsc -b`:

```
src/shell/AdminShell.test.tsx(4,24): error TS2307: Cannot find module '../tools/analytics/CardName' or its corresponding type declarations.
src/test/cardLinks.tsx(4,33): error TS2307: Cannot find module '../shell/knownCards' or its corresponding type declarations.
src/test/cardLinks.tsx(14,34): error TS7006: Parameter 'cardId' implicitly has an 'any' type.
src/tools/analytics/__tests__/CardName.test.tsx(4,45): error TS2307: Cannot find module '../CardName' or its corresponding type declarations.
src/ui/__tests__/Panel.test.tsx(22,9): error TS2322: Type 'Element' is not assignable to type 'string'.
```

- [ ] **Step 5: Add the context, the provider, the name components, and widen Panel's title**

Create `src/shell/knownCards.ts`:

```ts
import {createContext, useContext} from 'react';

/** Whether the card list holds a card with this id: whether /cards/<id> has a card to show. */
export type IsKnownCard = (cardId: string) => boolean;

/** No card list, so no id resolves. */
const NO_CARD_LIST: IsKnownCard = () => false;

/**
 * Which card ids the app's card list holds, so the insights pages link a card
 * name to its Card analytics page only when that page has a card to show
 * (R-33). AdminShell provides it from the card list (KnownCardsProvider).
 * Without a provider, as in a view's own test or story, no id resolves and
 * every name stays text. A test or story that wants links provides its own.
 */
export const KnownCardsContext = createContext<IsKnownCard>(NO_CARD_LIST);

/** The nearest KnownCardsContext's check. */
export function useIsKnownCard(): IsKnownCard {
  return useContext(KnownCardsContext);
}
```

Create `src/shell/KnownCardsProvider.tsx`:

```tsx
import type {ReactNode} from 'react';
import {useCardDataContext} from '../app-bridge';
import {KnownCardsContext} from './knownCards';

/**
 * Gives the pages under it the card list's id check (KnownCardsContext). The
 * list is the app's: Core cards with the preview cards merged in. While it
 * loads, or after it fails, it holds no card, so names stay text until it
 * lands. AdminShell mounts it inside CardDataProvider.
 */
export function KnownCardsProvider({children}: {children: ReactNode}) {
  const {getCardById} = useCardDataContext();
  return <KnownCardsContext value={(cardId) => getCardById(cardId) !== undefined}>{children}</KnownCardsContext>;
}
```

Notes:
- **Two files.** `react-refresh/only-export-components` keeps the context and the hook out of the component file.
- **Names that differ by more than case.** `knownCards.ts` and `KnownCardsProvider.tsx`. A `KnownCards.tsx` would collide with `knownCards.ts` on a case-insensitive file system.
- **React 19's `<Context value>`** is the provider. The React Compiler keeps the check's identity while `getCardById` is unchanged.

In `src/shell/AdminShell.tsx`, the imports (lines 6-7). Current:

```tsx
import {ADMIN_COLORS} from '../theme/adminTheme';
import {Sidebar} from './Sidebar';
```

New:

```tsx
import {ADMIN_COLORS} from '../theme/adminTheme';
import {KnownCardsProvider} from './KnownCardsProvider';
import {Sidebar} from './Sidebar';
```

The doc comment (lines 9-13). Current:

```tsx
/**
 * The layout every admin route renders in: the sidebar beside the page, the
 * app's card data and admin's scoped styles. Unlike the public app's layout it
 * has no public nav, Vercel Analytics or Speed Insights (docs/PLAN.md, 4.1).
 */
```

New:

```tsx
/**
 * The layout every admin route renders in: the sidebar beside the page, the
 * app's card data and admin's scoped styles. Unlike the public app's layout it
 * has no public nav, Vercel Analytics or Speed Insights (docs/PLAN.md, 4.1).
 * The pages also get the card list's id check (KnownCardsProvider), so a card
 * name links to /cards only when the list holds the card (R-33).
 */
```

The outlet (lines 35-37). Current:

```tsx
          <div style={{flex: 1, minWidth: 0, overflowY: 'auto'}}>
            <Outlet />
          </div>
```

New:

```tsx
          <div style={{flex: 1, minWidth: 0, overflowY: 'auto'}}>
            <KnownCardsProvider>
              <Outlet />
            </KnownCardsProvider>
          </div>
```

It goes round the outlet, not the sidebar: only the pages read it.

Create `src/tools/analytics/CardName.tsx`:

```tsx
import {Link} from 'react-router-dom';
import {SPACING, TRUNCATE} from '../../app-bridge';
import {useIsKnownCard} from '../../shell/knownCards';
import {cardsHref} from '../../shell/nav';

/** The two cards a pair, a vote or a vote-log pair names. */
interface PairCards {
  a: string;
  b: string;
  aName: string;
  bName: string;
}

/**
 * Room round a line that clips, for a focused link's ring: adm-link's outline
 * is 2px wide and 2px out. The line pads by it and takes it back as a negative
 * margin, so the ring stays inside the clip and the line keeps its place.
 */
const RING_ROOM = SPACING.xs;

const LINE: React.CSSProperties = {...TRUNCATE, padding: RING_ROOM, margin: -RING_ROOM};

/**
 * A card's name: a link to its Card analytics page when the card list holds
 * the id (R-33), plain text otherwise. Most logged votes name a card outside
 * the list (rotated out of Core, or a preview id since released), and /cards
 * could only say it has no such card.
 */
export function CardName({id, name}: {id: string; name: string}) {
  const isKnownCard = useIsKnownCard();
  if (!isKnownCard(id)) return name;
  return (
    <Link to={cardsHref(id)} className="adm-link">
      {name}
    </Link>
  );
}

/** "Elsa × Anna", each name a CardName. Inline, so a heading or a cell lays it out. */
export function PairNames({pair}: {pair: PairCards}) {
  return (
    <>
      <CardName id={pair.a} name={pair.aName} />
      {' × '}
      <CardName id={pair.b} name={pair.bName} />
    </>
  );
}

/** PairNames on one line that ends in an ellipsis when it runs out of room: a log row, a list item. */
export function PairLine({pair}: {pair: PairCards}) {
  return (
    <div style={LINE}>
      <PairNames pair={pair} />
    </div>
  );
}
```

Notes on the components:
- **An unresolved name is a bare string.** React 19's types accept a component that returns one, so a cell holding two plain names keeps exactly today's text nodes.
- **`PairLine` is a `div`.** It is valid in a `<td>` and in a `<li>`'s column. Its negative margin keeps its margin box at the line box, so the row doesn't move. Step 10 measures that.
- **Three components in one file.** `react-refresh` allows that, since every export is a component.

In `src/ui/Panel.tsx`, the `title` prop (lines 6-7). Current:

```tsx
interface PanelProps {
  /** The panel's h2, which also names it as a region. */
  title?: string;
```

New:

```tsx
interface PanelProps {
  /**
   * The panel's h2, which also names it as a region: text, or text with links
   * in it (VoteDetailTable's card names). The region's name is the text.
   */
  title?: React.ReactNode;
```

The rest of the file doesn't change. `title &&`, `Boolean(title)` and `title ? titleId : undefined` read a node as they read a string.

Run:

```bash
pnpm vitest run src/tools/analytics/__tests__/CardName.test.tsx src/ui/__tests__/Panel.test.tsx src/shell/AdminShell.test.tsx
```

Expected: `Test Files  3 passed (3)` and `Tests  13 passed (13)`: CardName 6, Panel 5 and AdminShell 2.

- [ ] **Step 6: Write the failing tests for the four surfaces, and watch them fail**

**The vote log.** In `src/tools/analytics/activity/__tests__/VoteLogTable.test.tsx`, the imports (lines 4-5). Current:

```tsx
import userEvent from '@testing-library/user-event';
import {VoteLogTable} from '../VoteLogTable';
```

New:

```tsx
import userEvent from '@testing-library/user-event';
import {renderWithCards} from '../../../../test/cardLinks';
import {VoteLogTable} from '../VoteLogTable';
```

Before `it('says when nothing matches, naming the voter when one is picked', …` (line 99), add:

```tsx
  it('links each card the card list holds to its card page, and leaves the rest as text (R-33)', () => {
    renderWithCards(
      <VoteLogTable
        votes={VOTES.slice(0, 1)}
        limit={25}
        pickedLabel={null}
        voter={null}
        onShowMore={vi.fn()}
        onPickVoter={vi.fn()}
      />,
      ['1'],
    );
    const pair = screen.getByRole('cell', {name: 'Elsa × Anna'});
    expect(within(pair).getByRole('link', {name: 'Elsa'})).toHaveAttribute('href', '/cards/1');
    expect(within(pair).queryByRole('link', {name: 'Anna'})).not.toBeInTheDocument();
    // The whole pair stays the cell's title, for a line cut short.
    expect(pair).toHaveAttribute('title', 'Elsa × Anna');
  });

```

**Most voted pairs, through the view.** `TopPairsPanel` has no test file of its own; `ActivityView.test.tsx` covers it. In `src/tools/analytics/activity/__tests__/ActivityView.test.tsx`, the imports (lines 3-4). Current:

```tsx
import userEvent from '@testing-library/user-event';
import {ActivityView} from '../ActivityView';
```

New:

```tsx
import userEvent from '@testing-library/user-event';
import {renderWithCards} from '../../../../test/cardLinks';
import {ActivityView} from '../ActivityView';
```

Before `it('narrows to 7 days and widens to 90, charting each day', …` (line 102), add:

```tsx
  it('links the cards the card list holds, in Most voted pairs and in the log (R-33)', () => {
    // Elsa is card 1 and Moana card 4; Anna, Maui, Scar and Simba are outside the card list.
    renderWithCards(<ActivityView voteLog={LOG} />, ['1', '4']);
    const top = within(screen.getByRole('table', {name: 'Most voted pairs'}));
    expect(top.getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Elsa', '/cards/1'],
      ['Moana', '/cards/4'],
    ]);
    expect(within(logTable()).getAllByRole('link').map((a) => a.textContent)).toEqual(['Elsa', 'Moana', 'Elsa']);
  });

```

What the case reads:
- The view opens on 30 days, which hold four votes: Elsa × Anna twice, Maui × Moana once and Scar × Simba once.
- So Most voted pairs lists Elsa × Anna, then Maui × Moana, then Scar × Simba (`:93-97`), and only Elsa and Moana link.
- The case also proves that the view and the page need no new prop: the context reaches through.

**Latest votes.** In `src/tools/analytics/overview/__tests__/OverviewView.test.tsx`, the imports (lines 3-4). Current:

```tsx
import {MemoryRouter} from 'react-router-dom';
import {OverviewView, type OverviewViewProps} from '../OverviewView';
```

New:

```tsx
import {MemoryRouter} from 'react-router-dom';
import {renderWithCards} from '../../../../test/cardLinks';
import {OverviewView, type OverviewViewProps} from '../OverviewView';
```

Before `it('lists web events busiest first, with all-time totals and the trend window', …` (line 90), add:

```tsx
  it('links a latest vote’s card to its card page when the card list holds it (R-33)', () => {
    renderWithCards(<OverviewView {...LOADED} />, ['crd-Maui']);
    const rows = within(screen.getByRole('list', {name: 'Latest votes'})).getAllByRole('listitem');
    expect(within(rows[0]).getByRole('link', {name: 'Maui'})).toHaveAttribute('href', '/cards/crd-Maui');
    expect(within(rows[0]).queryByRole('link', {name: 'Fishhook'})).not.toBeInTheDocument();
    expect(rows[0]).toHaveTextContent('Maui × Fishhook');
    expect(within(rows[3]).queryByRole('link')).not.toBeInTheDocument();
  });

```

The Overview fixtures key each card as `crd-<name>` (`overviewFixtures.ts:100-104`). `rows[3]` is Cogsworth × Beast’s Castle, neither of them in this list.

**The vote-detail heading.** In `src/tools/analytics/__tests__/VoteDetailTable.test.tsx`, lines 2-6. Current:

```tsx
import {render, screen, within} from '@testing-library/react';
import {VoteDetailTable} from '../VoteDetailTable';
import type {VoteLogRow} from '../voteLogTypes';

const PAIR = {aName: 'Sisu', bName: 'Raya', engineScore: 8};
```

New:

```tsx
import {render, screen, within} from '@testing-library/react';
import {renderWithCards} from '../../../test/cardLinks';
import {VoteDetailTable} from '../VoteDetailTable';
import type {VoteLogRow} from '../voteLogTypes';

const PAIR = {a: '1', b: '2', aName: 'Sisu', bName: 'Raya', engineScore: 8};
```

Before `it('pills each score, labels accuracy as too high / right / too low, …` (line 54), add:

```tsx
  it('links each name in its heading that the card list holds (R-33), still named by the pair', () => {
    renderWithCards(<VoteDetailTable pair={PAIR} votes={VOTES} />, ['1']);
    const panel = screen.getByRole('region', {name: 'Sisu × Raya'});
    const heading = within(panel).getByRole('heading', {level: 2, name: 'Sisu × Raya'});
    expect(within(heading).getByRole('link', {name: 'Sisu'})).toHaveAttribute('href', '/cards/1');
    expect(within(heading).queryByRole('link', {name: 'Raya'})).not.toBeInTheDocument();
    expect(within(panel).getByRole('table', {name: 'Votes on Sisu × Raya'})).toBeInTheDocument();
  });

```

Run:

```bash
pnpm vitest run src/tools/analytics/activity/__tests__/VoteLogTable.test.tsx src/tools/analytics/activity/__tests__/ActivityView.test.tsx src/tools/analytics/overview/__tests__/OverviewView.test.tsx src/tools/analytics/__tests__/VoteDetailTable.test.tsx
```

Expected at main plus this step: `Test Files  4 failed (4)` and `Tests  4 failed | 42 passed (46)`. Each new case fails, and every old one passes:
- `VoteLogTable > links each card the card list holds …`: `TestingLibraryElementError: Unable to find an accessible element with the role "link" and name "Elsa"`
- `ActivityView > links the cards the card list holds, in Most voted pairs and in the log (R-33)`: `TestingLibraryElementError: Unable to find an accessible element with the role "link"`
- `OverviewView > links a latest vote’s card …`: `TestingLibraryElementError: Unable to find an accessible element with the role "link" and name "Maui"`
- `VoteDetailTable > links each name in its heading …`: `TestingLibraryElementError: Unable to find an accessible element with the role "link" and name "Sisu"`

The extra `a` and `b` on the test's `PAIR` typecheck before Step 7: a variable may carry fields its prop type doesn't name.

- [ ] **Step 7: Link the four surfaces**

**`src/tools/analytics/activity/VoteLogTable.tsx`.** The imports (lines 5-6). Current:

```tsx
import {ScorePill} from '../../../ui/ScorePill';
import type {VoteLogRow} from '../voteLogTypes';
```

New:

```tsx
import {ScorePill} from '../../../ui/ScorePill';
import {PairLine} from '../CardName';
import type {VoteLogRow} from '../voteLogTypes';
```

`VoteRow`'s comment and pair cell (lines 50-58). Current:

```tsx
/** One vote: its time, the pair, the score, who carries, and the voter, who filters the log when picked. */
function VoteRow({vote, onPickVoter}: {vote: VoteLogRow; onPickVoter: (voter: number) => void}) {
  const pair = `${vote.aName} × ${vote.bName}`;
  return (
    <tr className="adm-hover-row">
      <td style={{...CELL, color: ADMIN_COLORS.muted, fontVariantNumeric: 'tabular-nums'}}>{vote.ts.slice(11, 16)}</td>
      <td style={{...CELL, ...TRUNCATE}} title={pair}>
        {pair}
      </td>
```

New:

```tsx
/**
 * One vote: its time, the pair, the score, who carries, and the voter, who
 * filters the log when picked. A card the card list holds links to its card
 * page (PairLine, R-33). The cell's title keeps the whole pair, for a line
 * cut short.
 */
function VoteRow({vote, onPickVoter}: {vote: VoteLogRow; onPickVoter: (voter: number) => void}) {
  const pair = `${vote.aName} × ${vote.bName}`;
  return (
    <tr className="adm-hover-row">
      <td style={{...CELL, color: ADMIN_COLORS.muted, fontVariantNumeric: 'tabular-nums'}}>{vote.ts.slice(11, 16)}</td>
      <td style={CELL} title={pair}>
        <PairLine pair={vote} />
      </td>
```

`TRUNCATE` stays imported: the carries cell (`:62`) still uses it.

**`src/tools/analytics/activity/ActivitySidePanels.tsx`.** Line 1. Current:

```tsx
import {SPACING, TRUNCATE} from '../../../app-bridge';
```

New:

```tsx
import {SPACING} from '../../../app-bridge';
```

Lines 6-7. Current:

```tsx
import {ScorePill} from '../../../ui/ScorePill';
import type {VoteLogRow} from '../voteLogTypes';
```

New:

```tsx
import {ScorePill} from '../../../ui/ScorePill';
import {PairLine} from '../CardName';
import type {VoteLogRow} from '../voteLogTypes';
```

`TopPairsPanel`'s comment (line 72). Current:

```tsx
/** Most voted pairs: the top five in the range, under the filters, each with its average over scored votes. */
```

New:

```tsx
/**
 * Most voted pairs: the top five in the range, under the filters, each with
 * its average over scored votes. A card the card list holds links to its card
 * page (PairLine, R-33).
 */
```

The pair cell (lines 101-103). Current:

```tsx
                  <td style={{...CELL, ...TRUNCATE}} title={name}>
                    {name}
                  </td>
```

New:

```tsx
                  <td style={CELL} title={name}>
                    <PairLine pair={pair} />
                  </td>
```

**`src/tools/analytics/overview/LatestVotesCard.tsx`.** Line 2. Current:

```tsx
import {SPACING, TRUNCATE} from '../../../app-bridge';
```

New:

```tsx
import {SPACING} from '../../../app-bridge';
```

Lines 6-7. Current:

```tsx
import {ScorePill} from '../../../ui/ScorePill';
import {latestVotes} from './overviewStats';
```

New:

```tsx
import {ScorePill} from '../../../ui/ScorePill';
import {PairLine} from '../CardName';
import {latestVotes} from './overviewStats';
```

`LatestVotesBody`'s comment (line 22). Current:

```tsx
/** The card body: vote-log.json's own loading, error and no-raw-votes states, or the newest votes. */
```

New:

```tsx
/**
 * The card body: vote-log.json's own loading, error and no-raw-votes states,
 * or the newest votes. A card the card list holds links to its card page
 * (PairLine, R-33).
 */
```

The name line (lines 41-44). Current:

```tsx
          <div style={{minWidth: 0, flex: 1}}>
            <div style={{...TRUNCATE, fontSize: ADMIN_TYPE.body}}>
              {v.aName} × {v.bName}
            </div>
```

New:

```tsx
          <div style={{minWidth: 0, flex: 1, fontSize: ADMIN_TYPE.body}}>
            <PairLine pair={v} />
```

The body size moves up to the column. The meta line under it keeps its own `ADMIN_TYPE.label` (`:45`).

**`src/tools/analytics/VoteDetailTable.tsx`.** The imports and props (lines 4-8). Current:

```tsx
import {ScorePill} from '../../ui/ScorePill';
import type {VoteLogRow} from './voteLogTypes';

interface VoteDetailTableProps {
  pair: {aName: string; bName: string; engineScore: number} | null;
```

New:

```tsx
import {ScorePill} from '../../ui/ScorePill';
import {PairNames} from './CardName';
import type {VoteLogRow} from './voteLogTypes';

interface VoteDetailTableProps {
  /** The selected pair: its cards' ids and names, and the engine's score. Null asks for one. */
  pair: {a: string; b: string; aName: string; bName: string; engineScore: number} | null;
```

The component's comment (lines 98-104). Current:

```tsx
/**
 * The selected pair's votes, as a panel. With no pair it is the "Votes" panel
 * and asks for one. With a pair, the panel is named by it, with the engine
 * score beside the title, over a table of each vote's score, accuracy thumb,
 * would-play flag and UTC day. A notice, or a pair the vote log holds no votes
 * for, replaces the table with one line.
 */
```

New:

```tsx
/**
 * The selected pair's votes, as a panel. With no pair it is the "Votes" panel
 * and asks for one. With a pair, the panel is named by it, with the engine
 * score beside the title, over a table of each vote's score, accuracy thumb,
 * would-play flag and UTC day. In the title, a card the card list holds links
 * to its card page (R-33): the pair list's rows are buttons, which can't hold
 * a link. A notice, or a pair the vote log holds no votes for, replaces the
 * table with one line.
 */
```

The panel's title (line 116). Current:

```tsx
    <Panel title={title} action={`engine ${pair.engineScore}`} padded={false}>
```

New:

```tsx
    <Panel title={<PairNames pair={pair} />} action={`engine ${pair.engineScore}`} padded={false}>
```

`title` (`:113`) stays a string, for the table's name "Votes on {title}" (`:64`). `CalibrationWorkspace` needs no edit: it passes `findPair(...)`, a `PairStat`, which has `a` and `b`.

**The story's pair.** The prop now needs `a` and `b`. In `src/tools/analytics/VoteDetailTable.stories.tsx`, line 49. Current:

```tsx
const PAIR = {aName: 'Sisu - Divine Water Dragon', bName: 'Raya - Leader of Heart', engineScore: 8};
```

New, with the ids of the story's `DEFAULT_VOTE` (`:24-25`):

```tsx
const PAIR = {
  a: 'crd_a',
  b: 'crd_b',
  aName: 'Sisu - Divine Water Dragon',
  bName: 'Raya - Leader of Heart',
  engineScore: 8,
};
```

Without this edit, `pnpm typecheck` fails three times in that file (`:51`, `:57`, `:60`): `error TS2739: Type '{ aName: string; bName: string; engineScore: number; }' is missing the following properties from type '{ a: string; b: string; aName: string; bName: string; engineScore: number; }': a, b`.

Run the four surface tests again:

```bash
pnpm vitest run src/tools/analytics/activity/__tests__/VoteLogTable.test.tsx src/tools/analytics/activity/__tests__/ActivityView.test.tsx src/tools/analytics/overview/__tests__/OverviewView.test.tsx src/tools/analytics/__tests__/VoteDetailTable.test.tsx
```

Expected at main plus this task: `Test Files  4 passed (4)` and `Tests  46 passed (46)`.

Every older case in these files still passes unchanged:
- They render without a card list, so names stay text nodes.
- `getAllByRole('cell', {name: /×/})` (`ActivityView.test.tsx:43`, `:95`; `VoteLogTable.test.tsx:82`) still finds each pair cell. `PairLine`'s `div` adds no name of its own.
- `CalibrationPage.test.tsx`'s region queries still find "Card 1 × Card 2".

- [ ] **Step 8: Add a `CardLinks` story to each of the three story files**

The views' stories render without the shell, so they show no links. One story each provides a card list, so the a11y addon sees the links, and Step 10 checks them.

**`src/tools/analytics/VoteDetailTable.stories.tsx`.** The imports (lines 1-3). Current:

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {FONTS, SPACING} from '../../app-bridge';
import {ADMIN_COLORS} from '../../theme/adminTheme';
```

New:

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {MemoryRouter} from 'react-router-dom';
import {FONTS, SPACING} from '../../app-bridge';
import {KnownCardsContext} from '../../shell/knownCards';
import {ADMIN_COLORS} from '../../theme/adminTheme';
```

At the end of the file, add:

```tsx

/**
 * In the shell (R-33): Sisu is in the card list, so its name links to its card
 * page; Raya isn't (rotated out of Core, say), so its name stays text.
 */
export const CardLinks: Story = {
  args: {pair: PAIR, votes: VOTES},
  decorators: [
    (Story) => (
      <MemoryRouter>
        <KnownCardsContext value={(id) => id === 'crd_a'}>
          <Story />
        </KnownCardsContext>
      </MemoryRouter>
    ),
  ],
};
```

**`src/tools/analytics/activity/ActivityView.stories.tsx`.** The imports (lines 1-3). Current:

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {FONTS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
```

New:

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {MemoryRouter} from 'react-router-dom';
import {FONTS, SPACING} from '../../../app-bridge';
import {KnownCardsContext} from '../../../shell/knownCards';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
```

At the end of the file, add:

```tsx

/** Ariel's and Ursula's ids, which this story's card list lacks (rotated out of Core, say). */
const ROTATED_OUT = ['1530', '1702'];

/**
 * In the shell (R-33): a card the card list holds links to its card page, in
 * the log and in Most voted pairs. Ariel and Ursula aren't in the list, so
 * their names stay text.
 */
export const CardLinks: Story = {
  args: {voteLog: LOG},
  decorators: [
    (Story) => (
      <MemoryRouter>
        <KnownCardsContext value={(id) => !ROTATED_OUT.includes(id)}>
          <Story />
        </KnownCardsContext>
      </MemoryRouter>
    ),
  ],
};
```

The ids are the story's own `PAIRS` (`:10-19`). R3-1's edits at `:42` and `:45` don't touch these lines.

**`src/tools/analytics/overview/OverviewView.stories.tsx`.** The meta's decorator already supplies a `MemoryRouter` (`:32-46`). The imports (lines 3-4). Current:

```tsx
import {FONTS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
```

New:

```tsx
import {FONTS, SPACING} from '../../../app-bridge';
import {KnownCardsContext} from '../../../shell/knownCards';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
```

At the end of the file, add:

```tsx

/** In the shell (R-33): Maui and Cogsworth are in the card list, so their names link to their card pages. */
export const CardLinks: Story = {
  decorators: [
    (Story) => (
      <KnownCardsContext value={(id) => id === 'crd-Maui' || id === 'crd-Cogsworth'}>
        <Story />
      </KnownCardsContext>
    ),
  ],
};
```

A story's own decorators sit inside the meta's, so this context renders within the meta's router.

- [ ] **Step 9: Lint, typecheck and run the full suite**

```bash
pnpm lint
pnpm typecheck
pnpm test:run
```

Expected: all three exit 0. Against the test count before this task, `pnpm test:run` gains 1 file (`CardName.test.tsx`) and 13 tests:
- `CardName.test.tsx`: 6;
- `AdminStyles.test.tsx`, `Panel.test.tsx`, `AdminShell.test.tsx`, `VoteLogTable.test.tsx`, `ActivityView.test.tsx`, `OverviewView.test.tsx` and `VoteDetailTable.test.tsx`: 1 each.

In the sandbox, main plus this task gave `Test Files  93 passed (93)` and `Tests  1063 passed (1063)`.

- [ ] **Step 10: Check the links in Storybook**

jsdom has no layout, so no test sees the underline, the ring or the clip. Check them in the browser pane, with this session's preview tools:
1. Start Storybook with the preview tool's `admin-storybook` configuration (`.claude/launch.json`), not `pnpm storybook` in a shell.
2. Open `http://localhost:6007/iframe.html?id=admin-insights-calibration-vote-detail--card-links&viewMode=story`.
   - "Sisu - Divine Water Dragon" in the heading is underlined in a muted grey. "Raya - Leader of Heart" isn't.
   - Hover Sisu: the name and its underline turn gold.
   - Tab to it: the gold ring shows on all four sides.
   - The a11y addon's panel reports no violation.
3. Open `id=admin-insights-vote-activity--card-links`.
   - The log's and Most voted pairs' names are underlined, except Ariel and Ursula.
   - Tab into Most voted pairs, to a first name that isn't cut short. With the name focused, run this with the browser pane's JavaScript tool:
     ```js
     (() => {
       const link = document.activeElement;
       let clip = link.parentElement;
       while (clip && getComputedStyle(clip).overflow === 'visible') clip = clip.parentElement;
       const r = link.getBoundingClientRect();
       const c = clip.getBoundingClientRect();
       const ring = 4; // 2px wide, 2px out
       return {
         clip: clip.tagName,
         left: r.left - ring >= c.left,
         top: r.top - ring >= c.top,
         right: r.right + ring <= c.right,
         bottom: r.bottom + ring <= c.bottom,
       };
     })();
     ```
     Expected: `clip: 'DIV'` (the `PairLine`), and `true` for all four sides.
   - Do the same for a first name in the log. Expected: the same.
4. Open `id=admin-insights-overview--card-links`.
   - In Latest votes, Maui and Cogsworth are underlined.
   - Tab to Maui and run the snippet. Expected: `clip: 'DIV'` and four `true`s.
   - Then check that no row moved. Run this here, then on `id=admin-insights-overview--full-data` at the same viewport:
     ```js
     [...document.querySelectorAll('ul[aria-label="Latest votes"] > li')].map((li) => li.getBoundingClientRect().height)
     ```
     Expected: the same four heights in both stories.
5. **If a side reads `false`:**
   - Look for a clip ancestor between the link and the `PairLine`. A new `overflow` on a cell would be one.
   - A second name cut short by the ellipsis reads `right: false`. That is expected, and it is why the snippet uses a first name.

Afterwards, stop Storybook with the preview tool, and set the viewport back to its desktop preset. A running preview server makes the pre-commit hook's Vitest fail to start its workers.

If no browser is available to the implementer, record each check as pending with the owner, as R1-2's Step 11 did, and say so in the report.

- [ ] **Step 11: Check with real data (when the owner's snapshot is in `public/admin-data/`)**

If `public/admin-data/vote-log.json` and `vote-analytics.json` exist locally (the owner's saved copies, "Seeing R1 with real data locally"; never commit them):
1. Start the dev server with the preview tool's `admin-dev` configuration, not `pnpm dev` in a shell. Open `http://localhost:5180/activity`.
2. Once the card list loads, some names in the log and in Most voted pairs are underlined, and the rest stay plain. Most logged votes involve a card outside the list (R-33), so most rows have at least one plain name.
3. Follow five underlined names from different rows. Each opens `/cards/<id>` on that card, never the "No card has the id …" message (R-29).
4. Open `/`. In Latest votes, the underlined names open their card pages too.
5. Open `/calibration` and pick a pair in the pair list. The vote panel's heading names the pair, and its names are underlined. They nearly always are: `pairs[]` holds only cards the engine scores.
   - Follow one. It opens that card's page.
   - With a token saved and a pending tuning edit, following one asks first. That is the unsaved-changes guard: stay, and nothing is lost.
6. Stop the dev server with the preview tool.

Without the snapshot, skip this step and say so in the report. The unit tests cover both a resolved and an unresolved name on every surface.

- [ ] **Step 12: Commit**

After the owner approves, with the Bash tool. Stage the files as their own call:

```bash
git add src/shell/knownCards.ts src/shell/KnownCardsProvider.tsx src/shell/AdminShell.tsx src/shell/AdminShell.test.tsx src/theme/AdminStyles.tsx src/theme/__tests__/AdminStyles.test.tsx src/ui/Panel.tsx src/ui/__tests__/Panel.test.tsx src/test/cardLinks.tsx src/tools/analytics/CardName.tsx src/tools/analytics/__tests__/CardName.test.tsx src/tools/analytics/activity/VoteLogTable.tsx src/tools/analytics/activity/ActivitySidePanels.tsx src/tools/analytics/overview/LatestVotesCard.tsx src/tools/analytics/VoteDetailTable.tsx src/tools/analytics/activity/__tests__/VoteLogTable.test.tsx src/tools/analytics/activity/__tests__/ActivityView.test.tsx src/tools/analytics/overview/__tests__/OverviewView.test.tsx src/tools/analytics/__tests__/VoteDetailTable.test.tsx src/tools/analytics/VoteDetailTable.stories.tsx src/tools/analytics/activity/ActivityView.stories.tsx src/tools/analytics/overview/OverviewView.stories.tsx
```

Then commit as a separate call, unpiped:

```bash
USER_APPROVED=1 git commit -m "feat(cards): link card names on Activity, the Overview and Calibration to their card pages (#24)"
```
