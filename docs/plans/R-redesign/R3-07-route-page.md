> Part of [R: Admin redesign](../R-redesign.md), phase R3 ([R3-card-analytics.md](R3-card-analytics.md)). Read the main plan's decisions (R-28 to R-56 for R3), corrections, global constraints and shared interfaces, then the R3 header, first.

> **Re-base notes (R3-7, 2026-10-06).** Re-based from the 2026-10-01 outline (`R3-card-analytics.md:2717-2755`) onto main @ `aea40b4` (R1 and R2 merged, PR #28 included), pin `bc877e1`, decisions R-28 to R-56, the audit (`audit-R3-7.json`), the re-based R3 header (`scratchpad/r3-rebase/header.md`, rechecked as it stood at 20:05: contract additions 6, 7, 8, 9 and 14, "URL contract", "States", "Focus (R-48)" and "Test isolation") and the sibling drafts as they stood at 18:45: R3-1's bridge and R3-5's `nav.ts`, `lastCard.ts` and `CardSwitcher` (`sandbox-R3-5`), R3-1a's `DataAsOf` and `src/shell/focusHandoff.ts` (`sandbox-R3-1a`), R3-2's `cardStats.ts` and `cardFixtures.ts` (`sandbox-R3-2`), and R3-4's `useCardSynergies` (`sandbox-r34`). The review pass (20:45) also read R3-6a's draft (`CardHeader.tsx` takes the handoff, `cardStyles.ts` holds `CELL_LINK`) and R3-6c's (the engine panels).
> - **Blocking: two tests pin the Insights list.** `nav.test.ts:39` and `Sidebar.test.tsx:32` list the Insights items, and both fail once `cards` joins. Both are in the Modify list now, so the pre-commit hook can pass. The outline listed only `router.test.tsx` and one `navItemFor` case.
> - **Every hook runs before the redirect.** The order is: `useParams`, `useCardDataContext`, `cardPageState`, `useVoteAnalytics`, `useVoteLog`, `useCardSynergies(cardId ?? null)`, the focus handoff, and the storage effect. Only then does bare `/cards` return `<Navigate replace>` (rules of hooks).
>   - The synergy fetch takes the URL's id, not the resolved card's, so it runs while the card list loads. A test pins this.
>   - The view gets the hook results as they are (R2's pass-through, `CalibrationWorkspace.tsx:40-41`). The outline's `cardName` and `partnerLabel` lambdas are gone, because the view takes `getCardById` (header contract addition 14).
> - **The state order is a pure function, `cardPageState`** (audit: significant; header: "The state order"):
>   - error first, on bare `/cards` too;
>   - then the prompt (no id);
>   - then "Loading cards…";
>   - then the card, or not found.
>
>   It departs from the header's sketch in two ways, which contract addition 14 should take when the plan is assembled:
>   - **It returns a discriminated union** (`{kind: 'card', card}`, `{kind: 'unknown', cardId}`, `{kind: 'failed', error}`) instead of a string. The body's `switch` then narrows `card` and `cardId` with no checks of its own. A string union plus a separate `card` cost the body an extra branch per state.
>   - **It takes the context's `getCardById`** instead of a resolved `card`, and looks the card up during render. So the page passes `{...cardData, cardId}` with no ternary of its own.
> - **The view is keyed by card id** (R-46): `<CardAnalyticsView key={state.card.id} …>`, in `CardPageBody`. A test proves the remount: a stand-in view's own state resets on a partner link, and fails with the key removed.
> - **Focus (R-48) is asked for when the state moves on, not on click.** This task found the rule by test, and the header's "Focus (R-48)" (`R3-card-analytics.md:480-491`) now states it.
>   - **Why not on click.** A router `Link`'s navigation renders as a transition (React Router 7's `RouterProvider` wraps its state updates in `startTransition`; see `react-router/dist/development/chunk-OB3PAWPO.mjs:6843`). So a `handoff.request()` made in the click handler commits first. The old card's h2, still mounted with `useTakeHandoff`, takes the request and marks it done before the new card mounts. Checked by mutation: with the page's state-driven request swapped for a click-time one, the partner-link and Cards-to-review tests fail (2 failed). The same is true of Retry: `retryLoad` only bumps a counter, and the provider's effect clears the error a commit later, so the still-mounted Retry button takes the request (4 failed).
>   - **A click-time request beside the page's is only redundant.** With the stand-in's Partner link also calling `handoff?.request()` on click, and `useCardHandoff` unchanged, all 16 page tests pass (`sandbox-R3-7-rev`, and again in `sandbox-R3-7-fix`): the old h2 takes the first request, and the page asks again when the URL changes. So the view's links need no click hook, and R3-6a as re-based has no `onLeave`: one rule.
>   - **The rule.** `useCardHandoff` (private to the page) asks when the URL names another card, or when the card list's error clears, which only Retry does. It asks for nothing when the change came by REPLACE, because the bare-`/cards` redirect is no one's action.
>   - **Who takes it.** Each state that can follow takes it through `useTakeHandoff`, which moves focus only if it fell to `<body>`:
>     - the card's h2 (R3-6a);
>     - Retry, when the list fails again;
>     - the prompt's line, after Retry on bare `/cards`;
>     - the not-found line.
>
>     The prompt's and the not-found lines are `<p tabIndex={-1}>`, R2's scope-line idiom (`CalibrationWorkspace.tsx:170`).
>   - **A switcher pick** keeps focus in the switcher, because the input never unmounts.
>   - **Browser Back and Forward between two cards** ask too, by the same rule and with no extra code. The h2 takes focus only if it had fallen to `<body>` with the old view.
> - **Remembering (R-28).** `useRememberCard(state)` replaces the header's `useRememberCard({cardId, card, isLoading, error})` (URL contract › Remembering, `R3-card-analytics.md:446`).
>   - It writes on `kind === 'card'` and forgets on `kind === 'unknown'`, which `cardPageState` gives only for a loaded list with no error. So the outline's guard (`!isLoading && error == null && card === undefined`) holds by construction.
>   - Two tests check that a remembered id survives a loading list and a failed one, and a mutation that forgets on "not a card" fails 9 tests.
> - **The prompt and Cards to review (R-28).**
>   - **The prompt.** It is a `Notice` with the line "Pick a card: search for it by name in Switch card, above." That copy is this task's own; the handoff has no prompt.
>   - **Cards to review.** Once vote analytics loads, a `Panel` named "Cards to review" follows, with "widest gap first" as its action. It lays out like the Overview's `RulesToReviewCard.tsx:36-80`: name, `BiasBar` and gap. The name is the link (`cardsHref`), so there is no separate Tune or Inspect column.
>   - **No vote count.** The row copies `RulesToReviewCard`, which shows none, as R-28 has the list work like Rules to review. R3-2's hand-off (`R3-02-card-calibration.md:950`) asked for `countOf(card.scoreVotes, 'score vote')` on each row; R3-2's note now drops it.
>   - **Its width.** The row grid (`minmax(80px, 1fr) minmax(0, 100px) 48px`, the Overview's less its link column) was made for a card about 280 to 450px wide (`OverviewView.tsx:29`, `:64-65`). Across a body 1000px and wider, the name column would stretch and leave the bars and gaps far from the names. So the panel sits in a one-panel grid on `twoUp(420)`'s tracks, but `auto-fill`: the empty tracks stay, and the panel fills one, 420px to about 640px, or the whole width below 860px. The review asked for `twoUp(420)` itself, but its `auto-fit` collapses the empty tracks, and the one panel's `1fr` track then takes the whole row.
>   - **Its links** take R3-6a's `CELL_LINK` (`cards/cardStyles.ts`), the accent link that truncates, in place of a copy of it.
>   - **Too few votes.** With no card at 10 votes it says "No card has 10 or more score votes yet."
>   - **Fields read.** `CardToReview`'s `cardId`, `cardName` and `meanGap` (R3-2; header contract 9, `R3-card-analytics.md:203`).
> - **The not-found message (R-29).** It reads "No card has the id `<code>N</code>` in the current card list. Cards from sets before 9 rotated out of Core, and a preview id changes when its card is released." The Core floor is at `loader.ts:194-198`, which calls `isCoreSet` with `MIN_CORE_SET = 9` (engine `constants.ts:14`). The outline cited `loader.ts:206`.
> - **A failed card list.** It shows `<Notice tone="error">Could not load the card list ({message})</Notice>` and a neutral `CtaButton` "Retry", as `TuningAside.tsx:307` offers one. This is also the state on bare `/cards`, since the switcher has nothing to search after a failure.
> - **The tab title (R-51).** `PageLayout` gains `documentTitle` (header contract addition 6), and the page passes `` `${card.fullName} · Card analytics` `` once the card resolves. One change from the header's sketch: `useTabTitle` takes `{title, documentTitle}` and does the `??` itself, so `PageLayout`'s own complexity doesn't grow. It already has `hasSide`, four `&&` and the `flush` ternary.
> - **`DataAsOf` comes from `src/ui`** (R-54, moved there by R3-1a). The date is `vote-analytics.json`'s `generatedAt`, and the meta waits for that file, as on `/calibration`.
> - **Trimmed router tests.** The `NAV_ITEMS` loops already cover `/cards` for the sidebar href, the tab title and the branch notice (`router.test.tsx:47-52`, `:83-89`, `:93-99`). The title loop renders bare `/cards`, which shows the prompt inside `PageLayout`. So the router test gains only two things:
>   - one case for `aria-current` on `/cards/2983`, with Overview not current;
>   - `/cards/2983` in the "names no branch" `it.each` (`:71`).
>
>   The redirect's `historyAction === 'REPLACE'` check is in the page test.
> - **Placement.** The import goes after `router.tsx:5` and the route after `:19`. The nav item goes after `nav.ts:25` (web), before `:26` (reveal). R3-5 adds `cardsHref` at the end of `nav.ts`, so those lines don't move.
> - **History duplicates, accepted.**
>   - The sidebar's "Card analytics" link from a card page pushes `/cards`, which redirects to the same card. The header accepts this.
>   - So is Back from a card opened from the prompt: Back lands on the bare `/cards` entry, which redirects (REPLACE) to the card just remembered, so a second Back leaves. A sandbox probe confirmed it (`historyAction` REPLACE, the same `/cards/2983`).
>   - Both come from R-28's "last viewed" default. R3-9's real-data check lists the second one.
> - **Docs.**
>   - `CLAUDE.md:16` lists `/cards/:cardId?` with the insights pages.
>   - `docs/PLAN.md:75` (D10) gains "R3 adds `/cards/:cardId?`". R3-9 checks it with ``grep -c 'R3 adds `/cards'`` and falls back to the same words (R3-9's Step 20, item 4).
>   - "R3 as built" waits for R3-9.
> - **Test design.**
>   - **The page test mocks the view.** It uses a recording stand-in, R2's recording-mock idiom (`CalibrationCharts.test.tsx:27-35`), because R3-6's view has its own tests and its copy isn't settled. The stand-in keeps what the page relies on: an h2 that takes the handoff, a counter only a remount resets, and a partner link.
>   - **State across cards (R-46) is the counter test.** "Mounts a fresh view for the next card…" presses the stand-in's counter, follows the partner link, and expects it back at 0; with the key dropped it fails. It stands in for the outline's un-mocked test (a frame on Table, a link to the next card, the chart again), which R3-6c's hand-off sends here and the header's Review focus #5 describes. R3-6c's note 9 points at this test, and so does the header's Review focus #5.
>   - **The card list is a small store,** read through `useSyncExternalStore`, because the Retry cases move it on mid-test. The header's `useCardDataContext.mockReturnValue` (Test isolation, `R3-card-analytics.md:612`) can't re-render the page.
>   - **`fetchCardSynergies` never settles by default,** unlike the header's shared block (`R3-card-analytics.md:626`), which resolves an empty file. The stand-in reads no synergies, and a settling hook would print `act(...)` warnings.
>   - **Cards are local.** They come from R3-5's `lorcanaCard` builder. Cards to review uses one local `PairStat`, so the test doesn't hang on `REVIEW_PAIRS`' exact contents. The stories use `REVIEW_PAIRS` and `SWITCHER_CARDS` from `cardFixtures.ts`.
> - **Code Health.**
>   - Every function has cyclomatic complexity 6 or less: `CardAnalyticsPage` about 6, `CardPageBody`'s `switch` 6, `cardPageState` 5, and the rest 3 or less.
>   - No function takes more than two arguments.
>   - The non-test modules take no primitive arguments: every function takes one object or a domain type.
>   - CodeScene MCP 1.1.3 scores all seven new or changed files 10.0 with no findings: the page, the body, the state module, both tests, the stories and `PageLayout.tsx`. The PR gate runs a stricter server version (R3 header, "Code Health"), so run `analyze_change_set` before the push.
> - **Verified** in `scratchpad/r3-rebase/sandbox-R3-7`.
>   - **Setup.** A copy of `src/` at `aea40b4`, with `node_modules` and `upstream/` junctioned in, and Vite's cache and the tsbuildinfo kept in the sandbox. The siblings' drafts were laid over it (listed above). `CardAnalyticsView.tsx` was a sandbox stub with header contract 14's props, an h2 that takes the handoff, and nothing else. R3-6 replaces it, and the page test mocks it anyway.
>   - **Expected failures.** Each one quoted below was observed, and so was each pass:
>     - the page test, 16 of 16;
>     - `cardPageState.test.ts`, 7 of 7;
>     - `PageLayout.test.tsx`, 8 of 8;
>     - `src/shell` with `router.test.tsx`, 105 of 105;
>     - the whole sandbox suite, 94 files and 1,083 tests.
>
>     None printed an `act(...)` warning under `--silent=false`.
>   - **Mutations.** Each of these fails the test meant to catch it:
>     - dropping the key;
>     - dropping the REPLACE check;
>     - dropping the card-change request;
>     - dropping the error-clears request;
>     - putting the prompt before the error;
>     - fetching synergies only for a resolved card;
>     - not forgetting an unknown id;
>     - forgetting while the list loads;
>     - dropping `documentTitle`;
>     - an unconditional meta;
>     - the two click-time requests above.
>   - **Typecheck and lint.** `tsc -p tsconfig.app.json` exits 0, sibling drafts included. Every block passes `pnpm exec eslint --max-warnings 0 --stdin --stdin-filename <repo path>` in the repo. That includes the render-time `setState` in `useCardHandoff`, the pattern the app's own `useAutocomplete.ts:72-79` uses.
>   - **Stories.** The five stories render through `composeStories` with no console error, and `PickACard` lists 5 rows.
> - **Review pass (20:45), re-verified** in `scratchpad/r3-rebase/sandbox-R3-7-fix`, a copy of `sandbox-R3-7-rev` with R3-6a's `cardStyles.ts` laid over it.
>   - **Changed.** Step 1's view greps (R3-6a's `CardHeader.tsx` takes the handoff, R3-6c adds `synergies`), plus `CELL_LINK` and a no-click-hook check; Step 4's line ranges; Step 12's `CELL_LINK` and review track; Step 22's width check; the hand-offs to R3-6a, R3-6c and R3-2.
>   - **Results.** The new `CardPageBody.tsx` passes eslint (`--max-warnings 0`) and `tsc -p tsconfig.app.json` exits 0. The page and state tests pass, 23 of 23, with no `act(...)` warning. The five stories render through `composeStories` with no console error, `PickACard` lists 5 rows, and its panel sits in the `auto-fill` grid. CodeScene MCP 1.1.3 scores the body 10.

### Task R3-7: Route, page and navigation

**Files:**
- Create:
  - `src/tools/analytics/cards/cardPageState.ts`
  - `src/tools/analytics/cards/CardPageBody.tsx`
  - `src/tools/analytics/cards/CardPageBody.stories.tsx`
  - `src/tools/analytics/cards/CardAnalyticsPage.tsx`
- Test, create:
  - `src/tools/analytics/cards/__tests__/cardPageState.test.ts`
  - `src/tools/analytics/cards/__tests__/CardAnalyticsPage.test.tsx`
- Modify:
  - `src/shell/PageLayout.tsx`: `:61-74` (the props), `:76-82` (the doc comment), `:83-92` (the parameters) and `:93-95` (the title effect).
  - `src/shell/PageLayout.test.tsx`: one case after `:41`.
  - `src/shell/nav.ts`: one item after `:25`.
  - `src/shell/nav.test.ts`: `:4-8`, `:23` and `:38-39`.
  - `src/shell/Sidebar.test.tsx`: `:32`.
  - `src/router.tsx`: one import after `:5`, and one route after `:19`.
  - `src/router.test.tsx`: `:71`, and one case before `:158`.
  - `CLAUDE.md`: `:16`.
  - `docs/PLAN.md`: `:75`.

**Interfaces:**
- **Consumes:**
  - **R3-1a.**
    - `DataAsOf({generatedAt})` (`src/ui/DataAsOf.tsx`).
    - `FocusHandoff`, `useFocusHandoff()` and `useTakeHandoff(handoff, container, selector, ready?)` (`src/shell/focusHandoff.ts`).
  - **R3-2.**
    - `cardsToReview(pairs: readonly PairStat[]): CardToReview[]`.
    - `CardToReview`'s `cardId`, `cardName` and `meanGap` (`cards/cardStats.ts`).
    - `REVIEW_PAIRS` (`cards/cardFixtures.ts`), for the stories.
  - **R3-4.** `useCardSynergies(cardId: string | null): UseCardSynergiesReturn` (`cards/useCardSynergies.ts`).
  - **R3-5.**
    - `cardsHref(cardId?)` (`src/shell/nav.ts`).
    - `readLastCard()`, `writeLastCard(id)` and `forgetLastCard(id)` (`cards/lastCard.ts`, key `inkweave-admin.last-card`).
    - `CardSwitcher({cards})`.
    - `lorcanaCard(seed)` and `SWITCHER_CARDS` (`cards/cardFixtures.ts`).
  - **R3-6a.**
    - `CardAnalyticsView` and `CardAnalyticsViewProps` (header contract addition 14): `{card, analytics, voteLog, getCardById, handoff?, headerActions?}`.
    - `CardHeader` (`cards/CardHeader.tsx`) takes the view's `handoff` on its h2 (`tabIndex={-1}`). None of the view's links asks for it (hand-offs below).
    - `CELL_LINK` (`cards/cardStyles.ts`), for Cards to review's name links.
  - **R3-6c.** `synergies: UseCardSynergiesReturn` in `CardAnalyticsViewProps`, which the view hands to its engine panels.
  - **R1 and R2.**
    - `PageLayout`, `Notice`, `Panel`, `BiasBar`, `fmtGap`, `gapColor` and `MIN_RULE_VOTES`.
    - `useVoteAnalytics()` / `UseVoteAnalyticsReturn` and `useVoteLog()` / `UseVoteLogReturn`.
    - `CtaButton`, `SPACING` and `useCardDataContext` through the bridge.
    - `ADMIN_COLORS` and `ADMIN_TYPE`.
  - **react-router-dom 7.18.4.** `Navigate`, `NavigationType`, `useNavigationType`, `useParams` and `Link`.
- **Produces:**
```ts
// src/shell/PageLayout.tsx: PageLayoutProps gains, after flush (header contract addition 6, R-51)
documentTitle?: string; // the tab's name before " · Inkweave admin" when it should say more than the title

// src/shell/nav.ts: NAV_ITEMS gains, after web, the last Insights item (header contract addition 15)
{id: 'cards', label: 'Card analytics', mark: 'Cd', path: '/cards', group: 'insights', writes: false}

// src/router.tsx: after calibration
{path: 'cards/:cardId?', element: <CardAnalyticsPage />}

// src/tools/analytics/cards/cardPageState.ts (replaces header contract addition 14's string union)
export type CardPageState =
  | {kind: 'failed'; error: Error}
  | {kind: 'pick'}
  | {kind: 'loading'}
  | {kind: 'unknown'; cardId: string}
  | {kind: 'card'; card: LorcanaCard};
export interface CardRoute {cardId: string | undefined; isLoading: boolean; error: Error | null; getCardById: (id: string) => LorcanaCard | undefined}
export function cardPageState(route: CardRoute): CardPageState; // failed, then pick, then loading, then card or unknown

// src/tools/analytics/cards/CardPageBody.tsx
export interface CardPageBodyProps {
  state: CardPageState; analytics: UseVoteAnalyticsReturn; voteLog: UseVoteLogReturn; synergies: UseCardSynergiesReturn;
  getCardById: (id: string) => LorcanaCard | undefined; onRetry: () => void; handoff: FocusHandoff;
}
export function CardPageBody(props: CardPageBodyProps); // renders CardAnalyticsView with key={state.card.id} (R-46)

// src/tools/analytics/cards/CardAnalyticsPage.tsx
export function CardAnalyticsPage(); // the cards/:cardId? route's element
// URL contract: /cards/:cardId? (cardsHref). Bare /cards redirects (replace) to readLastCard(), or shows the prompt.
```

**The page.**
- **PageLayout props.**
  - `title="Card analytics"`.
  - `subtitle="Votes, calibration and engine data for one card"`, the prototype's copy (`dc.html:563`).
  - `meta`: `<DataAsOf generatedAt={…} />`, `vote-analytics.json`'s date. It is omitted until that file loads.
  - `actions={<CardSwitcher cards={cardData.cards} />}`.
  - `documentTitle`: `` `${card.fullName} · Card analytics` `` once the card resolves, else nothing. The tab then reads "Elsa - Snow Queen · Card analytics · Inkweave admin" (R-51).
  - No `writes`, so there's no branch notice, and no `UnsavedChangesGuard`, because the page writes nothing.
- **The body, one state at a time (`cardPageState`):**

  | State | When | Shows | Takes a pending handoff on |
  |---|---|---|---|
  | `failed` | The card list's `error`, on any `/cards` URL | `<Notice tone="error">` "Could not load the card list ({message})", and a neutral `CtaButton` "Retry" (`retryLoad`) | Retry |
  | `pick` | No id, and none remembered | A `Notice`: "Pick a card: search for it by name in Switch card, above." Once vote analytics loads, the "Cards to review" panel: 5 links (R-28), or "No card has 10 or more score votes yet." | The prompt's line |
  | `loading` | An id, while the list loads | `Notice` "Loading cards…" | Nothing (the next state does) |
  | `unknown` | An id the loaded list lacks | `Notice` with R-29's copy, with the id in a `<code>` | Its line |
  | `card` | An id the list holds | `<CardAnalyticsView key={card.id} …>` (R-46) | The card header's h2 (R3-6a) |
- **Storage (R-28).** `useRememberCard(state)` writes the id on `card` and forgets it on `unknown`. A list that is loading or failed is neither, so it never costs a good id.
- **Focus (R-48).** `useCardHandoff` asks for the handoff when:
  - the URL names another card, except by REPLACE (the redirect); or
  - the card list's error clears (Retry).

  The state that takes it moves focus only if focus fell to `<body>`, so a switcher pick keeps focus in the switcher.

- [ ] **Step 1: Check what this task builds on**

```bash
grep -n "export function DataAsOf" src/ui/DataAsOf.tsx
grep -n "export function useTakeHandoff" src/shell/focusHandoff.ts
grep -n "export function cardsHref" src/shell/nav.ts
grep -n "export function readLastCard\|export function writeLastCard\|export function forgetLastCard" src/tools/analytics/cards/lastCard.ts
grep -n "export function CardSwitcher" src/tools/analytics/cards/CardSwitcher.tsx
grep -n "export function cardsToReview\|cardName: string" src/tools/analytics/cards/cardStats.ts
grep -n "export function useCardSynergies" src/tools/analytics/cards/useCardSynergies.ts
grep -n "export interface CardAnalyticsViewProps\|handoff?: FocusHandoff\|synergies: UseCardSynergiesReturn" src/tools/analytics/cards/CardAnalyticsView.tsx
grep -n "useTakeHandoff(handoff, ref, 'h2')\|<h2 tabIndex={-1}" src/tools/analytics/cards/CardHeader.tsx
grep -n "export const CELL_LINK" src/tools/analytics/cards/cardStyles.ts
grep -n "export function lorcanaCard\|export const SWITCHER_CARDS\|export const REVIEW_PAIRS" src/tools/analytics/cards/cardFixtures.ts
grep -n "onLeave\|handoff?.request" src/tools/analytics/cards/*.tsx
```

Expected:
- **Every command but the last** prints at least one line: the `CardAnalyticsView.tsx` grep three and the `CardHeader.tsx` grep two. If one prints less, stop: R3-1a, R3-2, R3-4, R3-5, R3-6a or R3-6c hasn't landed. The `synergies` line is R3-6c's.
- **The last** prints nothing: no view link asks for the handoff on click. If it prints a line, R3-6a or R3-6c kept a click-time request that the plan drops (hand-offs below). It is redundant, not harmful, so report it to the owner rather than stop, and leave those files to their own task.

- [ ] **Step 2: Write PageLayout's failing tab-title test**

In `src/shell/PageLayout.test.tsx`, after the "names the browser tab after the page" case (`:25-41`), add:

```tsx
  it('names the tab after documentTitle when the page gives one, and after its title again without (R-51)', () => {
    const {rerender} = render(
      <PageLayout title="Card analytics" documentTitle="Elsa - Snow Queen · Card analytics">
        <p>Body</p>
      </PageLayout>,
    );
    expect(document.title).toBe('Elsa - Snow Queen · Card analytics · Inkweave admin');
    // The h1 keeps the page's own title.
    expect(screen.getByRole('heading', {level: 1, name: 'Card analytics'})).toBeInTheDocument();
    rerender(
      <PageLayout title="Card analytics">
        <p>Body</p>
      </PageLayout>,
    );
    expect(document.title).toBe('Card analytics · Inkweave admin');
  });
```

- [ ] **Step 3: Run it, and see it fail**

Run: `pnpm vitest run src/shell/PageLayout.test.tsx`
Expected: 1 failed, 7 passed:
```
AssertionError: expected 'Card analytics · Inkweave admin' to be 'Elsa - Snow Queen · Card analytics · …' // Object.is equality
```

- [ ] **Step 4: Give PageLayout `documentTitle`**

In `src/shell/PageLayout.tsx`, replace `:71-74` (`flush`'s comment, `flush`, `children` and the interface's closing `}`) with the block below. It keeps those four lines, adds the prop after `flush`, and adds the hook after the interface. The line numbers in this step are `aea40b4`'s, before any of its edits:

```tsx
  /** Children go straight into the scrolling body, with no padding and no grid. */
  flush?: boolean;
  /**
   * The tab's name before " · Inkweave admin", when it should say more than the
   * title: a card page names its card ("Elsa - Snow Queen · Card analytics", R-51).
   */
  documentTitle?: string;
  children: React.ReactNode;
}

/**
 * Names the browser tab "{name} · Inkweave admin": the page's documentTitle
 * when it gives one, else its title. Nothing restores the old name on
 * unmount: the next page sets its own.
 */
function useTabTitle({title, documentTitle}: Pick<PageLayoutProps, 'title' | 'documentTitle'>) {
  const name = documentTitle ?? title;
  useEffect(() => {
    document.title = `${name} · Inkweave admin`;
  }, [name]);
}
```

In the doc comment, `:79-82` (from "that stacks the page's sections" to the closing `*/`) become:

```tsx
 * that stacks the page's sections. It renders the page's only <main>, and
 * names the browser tab after the page ("Vote activity · Inkweave admin"), or
 * after `documentTitle` when that says more.
 */
```

In the parameter list, `documentTitle,` goes after `flush = false,` (`:90`). The effect at `:93-95` becomes one line:

```tsx
  useTabTitle({title, documentTitle});
```

The hook takes both names and does the `??` itself, so `PageLayout`'s own complexity stays where it is.

- [ ] **Step 5: Run it to PASS**

Run: `pnpm vitest run src/shell/PageLayout.test.tsx`
Expected: 8 passed.

- [ ] **Step 6: Write the state module's failing test**

Create `src/tools/analytics/cards/__tests__/cardPageState.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {lorcanaCard} from '../cardFixtures';
import {cardPageState, type CardPageState, type CardRoute} from '../cardPageState';

const ELSA = lorcanaCard({id: '2983', name: 'Elsa', version: 'Snow Queen', ink: 'Sapphire'});
const FAILED = new Error('HTTP 503');

/** The route at `cardId`, over a loaded list that holds Elsa alone; `over` sets the rest. */
function route(over: Partial<CardRoute>): CardRoute {
  return {
    cardId: undefined,
    isLoading: false,
    error: null,
    getCardById: (id) => (id === ELSA.id ? ELSA : undefined),
    ...over,
  };
}

describe('cardPageState', () => {
  it.each<[string, Partial<CardRoute>, CardPageState]>([
    // The switcher searches the card list, so after a failure the prompt has nothing to offer.
    ['a failed list, on bare /cards', {error: FAILED}, {kind: 'failed', error: FAILED}],
    ['a failed list, over a card the lookup finds', {cardId: '2983', error: FAILED}, {kind: 'failed', error: FAILED}],
    ['no id, while the list loads', {isLoading: true}, {kind: 'pick'}],
    ['an empty id', {cardId: ''}, {kind: 'pick'}],
    ['an id, while the list loads', {cardId: '2983', isLoading: true}, {kind: 'loading'}],
    ['an id the list holds', {cardId: '2983'}, {kind: 'card', card: ELSA}],
    ['an id the list lacks', {cardId: '999999'}, {kind: 'unknown', cardId: '999999'}],
  ])('reads %s', (_case, over, expected) => {
    expect(cardPageState(route(over))).toEqual(expected);
  });
});
```

- [ ] **Step 7: Run it, and see it fail**

Run: `pnpm vitest run src/tools/analytics/cards/__tests__/cardPageState.test.ts`
Expected: the file fails to collect, with no tests run:
```
Error: Failed to resolve import "../cardPageState" from "src/tools/analytics/cards/__tests__/cardPageState.test.ts". Does the file exist?
```

- [ ] **Step 8: Write `cardPageState.ts`**

Create `src/tools/analytics/cards/cardPageState.ts`:

```ts
import type {LorcanaCard} from 'inkweave-synergy-engine';

/**
 * What the Card analytics body shows. Each kind carries what its view needs,
 * so the page's switch narrows it with no checks of its own.
 */
export type CardPageState =
  | {kind: 'failed'; error: Error}
  | {kind: 'pick'}
  | {kind: 'loading'}
  | {kind: 'unknown'; cardId: string}
  | {kind: 'card'; card: LorcanaCard};

/** The URL's card id, beside what the page reads from the shell's card list (useCardDataContext). */
export interface CardRoute {
  cardId: string | undefined;
  isLoading: boolean;
  error: Error | null;
  getCardById: (id: string) => LorcanaCard | undefined;
}

/**
 * The body's state, decided in one order:
 * 1. A failed card list, on bare /cards too: the switcher searches that list,
 *    so the prompt would have nothing to offer.
 * 2. No id: the "Pick a card" prompt (R-28). It waits for nothing.
 * 3. A list still loading: "Loading cards…".
 * 4. The card, or the not-found message for an id the list doesn't hold (R-29).
 * The card is looked up here, during render. getCardById is a new function on
 * every CardDataProvider render (CardDataContext.tsx:29), so an effect that
 * called it would re-run on each one.
 */
export function cardPageState({cardId, isLoading, error, getCardById}: CardRoute): CardPageState {
  if (error) return {kind: 'failed', error};
  if (!cardId) return {kind: 'pick'};
  if (isLoading) return {kind: 'loading'};
  const card = getCardById(cardId);
  return card ? {kind: 'card', card} : {kind: 'unknown', cardId};
}
```

- [ ] **Step 9: Run it to PASS**

Run: `pnpm vitest run src/tools/analytics/cards/__tests__/cardPageState.test.ts`
Expected: 7 passed.

- [ ] **Step 10: Write the page's failing test**

Create `src/tools/analytics/cards/__tests__/CardAnalyticsPage.test.tsx`.
- **The view.** It is mocked, in R2's recording-mock idiom (`CalibrationCharts.test.tsx:27-35`). R3-6's view has its own tests, and this checks what the page does with it.
- **The card list.** It is a small store, so the Retry cases can move it on and the page re-renders as it would under `CardDataProvider`.
- **The synergy fetch.** It never settles by default, so no hook updates outside `act`.

```tsx
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import type {useCardDataContext} from '../../../../app-bridge';
import type {PairStat, VoteAnalytics} from '../../voteAnalyticsTypes';
import type {CardAnalyticsViewProps} from '../CardAnalyticsView';
import {CardAnalyticsPage} from '../CardAnalyticsPage';
import {lorcanaCard} from '../cardFixtures';

/** What the page reads from the shell's card list. */
type CardList = Pick<
  ReturnType<typeof useCardDataContext>,
  'cards' | 'isLoading' | 'error' | 'getCardById' | 'retryLoad'
>;

// The card list as a store a test moves on (loading, loaded, failed), so the
// page re-renders as it would under the shell's CardDataProvider.
const cardList = vi.hoisted(() => ({
  value: null as CardList | null,
  listeners: new Set<() => void>(),
  retryLoad: vi.fn(),
}));
const fetchCardSynergies = vi.hoisted(() => vi.fn());
vi.mock('../../../../app-bridge', async (importOriginal) => {
  const {useSyncExternalStore} = await import('react');
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    fetchCardSynergies,
    useCardDataContext: function useCardDataContext() {
      return useSyncExternalStore(
        (onChange) => {
          cardList.listeners.add(onChange);
          return () => cardList.listeners.delete(onChange);
        },
        () => cardList.value,
      );
    },
  };
});

// R3-6's view has its own tests. This stand-in keeps what the page relies on:
// the card header's h2 takes the page's handoff (R-48), a count that only a
// remount resets (R-46), and a partner link. It records the props it gets.
const viewProps = vi.hoisted(() => [] as CardAnalyticsViewProps[]);
vi.mock('../CardAnalyticsView', async () => {
  const {useRef, useState} = await import('react');
  const {Link} = await import('react-router-dom');
  const {useTakeHandoff} = await import('../../../../shell/focusHandoff');
  function CardAnalyticsView(props: CardAnalyticsViewProps) {
    viewProps.push(props);
    const ref = useRef<HTMLElement>(null);
    const [presses, setPresses] = useState(0);
    useTakeHandoff(props.handoff, ref, 'h2');
    return (
      <section ref={ref}>
        <h2 tabIndex={-1}>{props.card.fullName}</h2>
        <button type="button" onClick={() => setPresses((n) => n + 1)}>
          Pressed {presses}
        </button>
        <Link to="/cards/2984">Partner</Link>
      </section>
    );
  }
  return {CardAnalyticsView};
});

// Pinned here, not imported: renaming the key would silently forget everyone's last card.
const KEY = 'inkweave-admin.last-card';

const ELSA = lorcanaCard({id: '2983', name: 'Elsa', version: 'Snow Queen', ink: 'Sapphire'});
const ANNA = lorcanaCard({id: '2984', name: 'Anna', version: 'Heir to Arendelle'});

// One pair with 12 score votes, 7 → 5.5: both cards make Cards to review at −1.50, Anna first by name.
const PAIR: PairStat = {
  a: ELSA.id,
  b: ANNA.id,
  aName: ELSA.fullName,
  bName: ANNA.fullName,
  engineScore: 7,
  communityScore: 5.5,
  gap: -1.5,
  scoreVotes: 12,
  rules: ['ramp'],
};

const ANALYTICS: VoteAnalytics = {
  generatedAt: '2026-10-05T04:12:00Z',
  hasRawVotes: true,
  global: {
    totalVotes: 12,
    distinctPairs: 1,
    distinctVoters: 3,
    meanGap: -1.5,
    accuracySentiment: null,
    engineSilentPairs: 0,
    weekly: [],
    dimensionFill: null,
  },
  rules: [],
  pairs: [PAIR],
};

type Answer = () => Response | Promise<Response>;
const json = (body: unknown) => new Response(JSON.stringify(body), {headers: {'content-type': 'application/json'}});
/** What Vite and vercel.json serve for an artifact that was never generated. */
const spaFallback = () => new Response('<!doctype html>', {headers: {'content-type': 'text/html'}});
/** A request that never settles, so its hook stays on its loading state. */
const never = () => new Promise<Response>(() => {});

/** Answers vote-analytics.json with `analytics`; the vote log never settles. */
function stubFetch(analytics: Answer = never) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => (url === '/admin-data/vote-analytics.json' ? Promise.resolve(analytics()) : never())),
  );
}

/** Sets the card list the page reads, and re-renders the page. By default it has loaded, with Elsa and Anna. */
function setCardList({cards = [ELSA, ANNA], isLoading = false, error = null}: Partial<CardList> = {}) {
  const getCardById = (id: string) => cards.find((c) => c.id === id);
  cardList.value = {cards, isLoading, error, getCardById, retryLoad: cardList.retryLoad};
  act(() => cardList.listeners.forEach((onChange) => onChange()));
}

/** The page at `path` in a data router, so a test can read where a redirect left it. */
function renderPage(path: string) {
  const router = createMemoryRouter([{path: '/cards/:cardId?', element: <CardAnalyticsPage />}], {
    initialEntries: [path],
  });
  render(<RouterProvider router={router} />);
  return {router, user: userEvent.setup()};
}

const cardHeading = (name: string) => screen.getByRole('heading', {level: 2, name});
const prompt = () => screen.getByText(/^Pick a card/);
const notFound = () => screen.getByText(/^No card has the id/);

beforeEach(() => {
  // A block, not an arrow's value: mockReset() returns the mock, and Vitest calls a function a hook returns as its teardown.
  fetchCardSynergies.mockReset();
  fetchCardSynergies.mockReturnValue(new Promise(() => {}));
  cardList.retryLoad.mockReset();
  viewProps.length = 0;
  localStorage.clear();
  setCardList();
  stubFetch();
});

afterEach(() => vi.unstubAllGlobals());

describe('CardAnalyticsPage: bare /cards', () => {
  it('opens the last card viewed in place of /cards, and leaves focus alone', async () => {
    localStorage.setItem(KEY, ELSA.id);
    const {router} = renderPage('/cards');
    await waitFor(() => expect(router.state.location.pathname).toBe('/cards/2983'));
    // Replaced, not pushed: Back doesn't land on the redirect again.
    expect(router.state.historyAction).toBe('REPLACE');
    expect(cardHeading('Elsa - Snow Queen')).toBeInTheDocument();
    // A redirect is no one's action, so nothing asks for the handoff.
    expect(document.body).toHaveFocus();
  });

  it('prompts on a first visit, lists Cards to review once vote analytics loads, and opens one (R-28)', async () => {
    stubFetch(() => json(ANALYTICS));
    const {router, user} = renderPage('/cards');
    expect(prompt()).toHaveTextContent('Pick a card: search for it by name in Switch card, above.');
    expect(screen.getByRole('heading', {level: 1, name: 'Card analytics'})).toBeInTheDocument();

    const list = within(await screen.findByRole('list', {name: 'Cards to review'}));
    expect(list.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Anna - Heir to Arendelle', '/cards/2984'],
      ['Elsa - Snow Queen', '/cards/2983'],
    ]);
    expect(router.state.location.pathname).toBe('/cards');

    // The link goes with the prompt, so the card's h2 takes focus (R-48).
    await user.click(list.getByRole('link', {name: 'Elsa - Snow Queen'}));
    expect(cardHeading('Elsa - Snow Queen')).toHaveFocus();
  });

  it('lists no card under 10 score votes', async () => {
    stubFetch(() => json({...ANALYTICS, pairs: [{...PAIR, scoreVotes: 9}]}));
    renderPage('/cards');
    expect(await screen.findByText('No card has 10 or more score votes yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list', {name: 'Cards to review'})).not.toBeInTheDocument();
  });

  it('shows the prompt alone while vote analytics loads', () => {
    renderPage('/cards');
    expect(prompt()).toBeInTheDocument();
    expect(screen.queryByRole('region', {name: 'Cards to review'})).not.toBeInTheDocument();
    expect(screen.queryByText(/Data as of/)).not.toBeInTheDocument();
  });
});

describe('CardAnalyticsPage: a card', () => {
  it('shows the card, names the tab after it, dates the data and remembers it (R-51, R-28)', async () => {
    stubFetch(() => json(ANALYTICS));
    renderPage('/cards/2983');
    expect(screen.getByRole('heading', {level: 1, name: 'Card analytics'})).toBeInTheDocument();
    expect(screen.getByText('Votes, calibration and engine data for one card')).toBeInTheDocument();
    expect(screen.getByRole('combobox', {name: 'Switch card'})).toBeInTheDocument();
    expect(cardHeading('Elsa - Snow Queen')).toBeInTheDocument();
    expect(document.title).toBe('Elsa - Snow Queen · Card analytics · Inkweave admin');
    expect(localStorage.getItem(KEY)).toBe('2983');
    // The date sits in a <code>, so the line is matched on the element that holds both.
    expect(await screen.findByText(/Data as of/)).toHaveTextContent('Data as of 2026-10-05');
  });

  it('fetches the synergy file while the card list loads, and hands the view the hooks as they are', () => {
    setCardList({cards: [], isLoading: true});
    renderPage('/cards/2983');
    expect(screen.getByText('Loading cards…')).toBeInTheDocument();
    expect(fetchCardSynergies).toHaveBeenCalledWith('2983');
    expect(document.title).toBe('Card analytics · Inkweave admin');

    setCardList();
    expect(cardHeading('Elsa - Snow Queen')).toBeInTheDocument();
    // The card's arrival doesn't fetch it again.
    expect(fetchCardSynergies).toHaveBeenCalledOnce();
    expect(viewProps.at(-1)).toMatchObject({
      card: ELSA,
      analytics: {loading: true},
      voteLog: {loading: true},
      synergies: {loading: true},
      getCardById: cardList.value?.getCardById,
    });
  });

  it('still shows the card when vote analytics was never generated, with no date in the header', async () => {
    stubFetch(spaFallback);
    renderPage('/cards/2983');
    await waitFor(() =>
      expect(viewProps.at(-1)?.analytics.error?.message).toBe('vote-analytics.json has not been generated yet'),
    );
    expect(cardHeading('Elsa - Snow Queen')).toBeInTheDocument();
    expect(screen.queryByText(/Data as of/)).not.toBeInTheDocument();
  });

  it('says no card has an unknown id, and forgets it (R-29)', () => {
    localStorage.setItem(KEY, '999999');
    renderPage('/cards/999999');
    expect(notFound()).toHaveTextContent(
      'No card has the id 999999 in the current card list. ' +
        'Cards from sets before 9 rotated out of Core, and a preview id changes when its card is released.',
    );
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(document.title).toBe('Card analytics · Inkweave admin');
  });

  it.each<[string, Partial<CardList>]>([
    ['loads', {cards: [], isLoading: true}],
    ['has failed', {cards: [], error: new Error('HTTP 503')}],
  ])('keeps the remembered id while the card list %s', (_case, list) => {
    localStorage.setItem(KEY, ELSA.id);
    setCardList(list);
    renderPage('/cards/2983');
    expect(localStorage.getItem(KEY)).toBe('2983');
  });
});

describe('CardAnalyticsPage: moving between cards', () => {
  it('mounts a fresh view for the next card, and focuses its h2 after a partner link (R-46, R-48)', async () => {
    const {user} = renderPage('/cards/2983');
    await user.click(screen.getByRole('button', {name: 'Pressed 0'}));
    expect(screen.getByRole('button', {name: 'Pressed 1'})).toBeInTheDocument();

    await user.click(screen.getByRole('link', {name: 'Partner'}));
    expect(cardHeading('Anna - Heir to Arendelle')).toHaveFocus();
    // Keyed by card: nothing from Elsa's view carries over.
    expect(screen.getByRole('button', {name: 'Pressed 0'})).toBeInTheDocument();
    expect(document.title).toBe('Anna - Heir to Arendelle · Card analytics · Inkweave admin');
    expect(localStorage.getItem(KEY)).toBe('2984');
  });

  it('leaves focus in the switcher after a pick (R-48)', async () => {
    const {router, user} = renderPage('/cards/2983');
    const input = screen.getByRole('combobox', {name: 'Switch card'});
    await user.type(input, 'an');
    await user.click(await screen.findByRole('option', {name: /Anna/}));
    await waitFor(() => expect(router.state.location.pathname).toBe('/cards/2984'));
    expect(cardHeading('Anna - Heir to Arendelle')).toBeInTheDocument();
    expect(input).toHaveFocus();
  });
});

describe('CardAnalyticsPage: a failed card list', () => {
  it.each<[string, string, Partial<CardList>, () => HTMLElement]>([
    ['the card, once the list loads', '/cards/2983', {}, () => cardHeading('Elsa - Snow Queen')],
    [
      'Retry again, when the list fails again',
      '/cards/2983',
      {cards: [], error: new Error('HTTP 503')},
      () => screen.getByRole('button', {name: 'Retry'}),
    ],
    ['the not-found line, for an id the list lacks', '/cards/999999', {}, notFound],
  ])('retries, then focuses %s (R-48)', async (_case, path, settled, focused) => {
    setCardList({cards: [], error: new Error('HTTP 500')});
    const {user} = renderPage(path);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the card list (HTTP 500)');

    await user.click(screen.getByRole('button', {name: 'Retry'}));
    expect(cardList.retryLoad).toHaveBeenCalledOnce();
    // What useCardData does next: loading again, then the list or another error.
    setCardList({cards: [], isLoading: true});
    expect(screen.getByText('Loading cards…')).toBeInTheDocument();
    setCardList(settled);
    expect(focused()).toHaveFocus();
  });

  it('offers Retry on bare /cards too, and focuses the prompt, which waits for no list', async () => {
    setCardList({cards: [], error: new Error('HTTP 500')});
    const {user} = renderPage('/cards');
    expect(screen.queryByText(/^Pick a card/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'Retry'}));
    setCardList({cards: [], isLoading: true});
    expect(prompt()).toHaveFocus();
  });
});
```

- [ ] **Step 11: Run it, and see it fail**

Run: `pnpm vitest run src/tools/analytics/cards/__tests__/CardAnalyticsPage.test.tsx`
Expected: the file fails to collect, with no tests run:
```
Error: Failed to resolve import "../CardAnalyticsPage" from "src/tools/analytics/cards/__tests__/CardAnalyticsPage.test.tsx". Does the file exist?
```

- [ ] **Step 12: Write `CardPageBody.tsx`**

Create `src/tools/analytics/cards/CardPageBody.tsx`.
- **States.** The non-card states each take a pending handoff on their own element. The `switch` hands the card state to the view, keyed by card id.
- **Copy.** "Pick a card: …" is this task's. "Could not load the card list (…)" and R-29's not-found copy come from the R3 header's States table.
- **Cards to review.** Each name is a `Link` styled with R3-6a's `CELL_LINK`. The panel sits in `REVIEW_TRACK`, an `auto-fill` grid on `twoUp(420)`'s tracks, so it keeps a card's width on a wide body. Not `twoUp` itself: its `auto-fit` would stretch the one panel across the row.

```tsx
import {useRef} from 'react';
import {Link} from 'react-router-dom';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {CtaButton, SPACING} from '../../../app-bridge';
import {useTakeHandoff, type FocusHandoff} from '../../../shell/focusHandoff';
import {cardsHref} from '../../../shell/nav';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {BiasBar} from '../../../ui/BiasBar';
import {fmtGap} from '../../../ui/format';
import {Notice} from '../../../ui/Notice';
import {Panel} from '../../../ui/Panel';
import {gapColor} from '../gapColor';
import {MIN_RULE_VOTES} from '../overview/overviewStats';
import type {UseVoteAnalyticsReturn} from '../useVoteAnalytics';
import type {UseVoteLogReturn} from '../useVoteLog';
import type {PairStat} from '../voteAnalyticsTypes';
import {CardAnalyticsView} from './CardAnalyticsView';
import type {CardPageState} from './cardPageState';
import {cardsToReview, type CardToReview} from './cardStats';
import {CELL_LINK} from './cardStyles';
import type {UseCardSynergiesReturn} from './useCardSynergies';

const STACK: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.md};
const LINE: React.CSSProperties = {margin: 0};
const LIST: React.CSSProperties = {listStyle: 'none', margin: 0, padding: 0};
const EMPTY: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.body, color: ADMIN_COLORS.muted};

// The Overview's Rules to review row (RulesToReviewCard.tsx:51-61), less its link column:
// here the name is the link. Names keep 80px, and the bias bar's track gives first.
const REVIEW_ROW: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(80px, 1fr) minmax(0, 100px) 48px',
  alignItems: 'center',
  gap: SPACING.md,
  padding: `${SPACING.sm}px 0`,
  borderBottom: `1px solid ${ADMIN_COLORS.divider}`,
  fontSize: ADMIN_TYPE.body,
};
const GAP: React.CSSProperties = {textAlign: 'right', fontVariantNumeric: 'tabular-nums'};

// Cards to review keeps a card's width, not the body's. The tracks are twoUp(420)'s, as in the card
// view's calibration row, but auto-fill keeps the empty ones, so the one panel fills one track: 420px to
// about 640px, and the whole width below 860px. twoUp's auto-fit would collapse the empty tracks and
// stretch the panel across the body.
const REVIEW_TRACK: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 420px), 1fr))',
  gap: SPACING.xl,
};

/**
 * A Notice for a state with no control of its own. Its line takes a pending
 * handoff (R-48): after Retry, or a link to a card the list doesn't hold, the
 * control pressed is gone, so focus lands on what replaced it.
 */
function FocusNotice({handoff, children}: {handoff: FocusHandoff; children: React.ReactNode}) {
  const ref = useRef<HTMLDivElement>(null);
  useTakeHandoff(handoff, ref, 'p');
  return (
    <div ref={ref}>
      <Notice>
        <p tabIndex={-1} style={LINE}>
          {children}
        </p>
      </Notice>
    </div>
  );
}

/**
 * The card list failed (useCardDataContext's error), and every other state
 * needs it. Retry swaps this for "Loading cards…", taking its own button with
 * it, so the page asks for a handoff; the next state takes it, and if the list
 * fails again, this button does.
 */
function FailedCardList({error, onRetry, handoff}: {error: Error; onRetry: () => void; handoff: FocusHandoff}) {
  const ref = useRef<HTMLDivElement>(null);
  useTakeHandoff(handoff, ref, 'button');
  return (
    <div ref={ref} style={STACK}>
      <Notice tone="error">Could not load the card list ({error.message})</Notice>
      <CtaButton type="button" variant="neutral" onClick={onRetry} style={{alignSelf: 'flex-start'}}>
        Retry
      </CtaButton>
    </div>
  );
}

/** A Cards to review row: the card's name, which opens its page, its bias bar and its mean gap. */
function ReviewRow({card}: {card: CardToReview}) {
  return (
    <li style={REVIEW_ROW}>
      <Link to={cardsHref(card.cardId)} title={card.cardName} style={CELL_LINK}>
        {card.cardName}
      </Link>
      {/* minWidth 0: the bar shrinks with its track, as on the Overview. */}
      <BiasBar gap={card.meanGap} minWidth={0} />
      <span style={{...GAP, color: gapColor(card.meanGap)}}>{fmtGap(card.meanGap)}</span>
    </li>
  );
}

/**
 * The cards most worth a look (R-28): the five with MIN_RULE_VOTES or more
 * score votes on pairs the engine scores, widest mean gap first
 * (cardsToReview). It reads like the Overview's Rules to review.
 */
function CardsToReview({pairs}: {pairs: readonly PairStat[]}) {
  const cards = cardsToReview(pairs);
  return (
    <Panel title="Cards to review" action="widest gap first">
      {cards.length === 0 ? (
        <p style={EMPTY}>No card has {MIN_RULE_VOTES} or more score votes yet.</p>
      ) : (
        <ul aria-label="Cards to review" style={LIST}>
          {cards.map((card) => (
            <ReviewRow key={card.cardId} card={card} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

/**
 * No card in the URL, and none remembered (R-28): the prompt, and Cards to
 * review once vote analytics has loaded. The prompt waits for nothing, so it
 * shows while the card list loads.
 */
function PickACard({analytics, handoff}: {analytics: UseVoteAnalyticsReturn; handoff: FocusHandoff}) {
  return (
    <>
      <FocusNotice handoff={handoff}>Pick a card: search for it by name in Switch card, above.</FocusNotice>
      {analytics.data && (
        <div style={REVIEW_TRACK}>
          <CardsToReview pairs={analytics.data.pairs} />
        </div>
      )}
    </>
  );
}

export interface CardPageBodyProps {
  state: CardPageState;
  analytics: UseVoteAnalyticsReturn;
  voteLog: UseVoteLogReturn;
  synergies: UseCardSynergiesReturn;
  getCardById: (id: string) => LorcanaCard | undefined;
  /** The card list's retryLoad. */
  onRetry: () => void;
  /** The page's (R-48). Whichever state replaces the control that went takes it. */
  handoff: FocusHandoff;
}

/**
 * The Card analytics body, one state at a time (cardPageState). The card's
 * view is keyed by its id (R-46): one route element serves every card, so
 * without the key a frame's Table view, the pair list's scroll and the
 * network's hover would carry over to the next card.
 */
export function CardPageBody({state, onRetry, handoff, ...data}: CardPageBodyProps) {
  switch (state.kind) {
    case 'failed':
      return <FailedCardList error={state.error} onRetry={onRetry} handoff={handoff} />;
    case 'pick':
      return <PickACard analytics={data.analytics} handoff={handoff} />;
    case 'loading':
      return <Notice>Loading cards…</Notice>;
    case 'unknown':
      return (
        <FocusNotice handoff={handoff}>
          No card has the id <code>{state.cardId}</code> in the current card list. Cards from sets before 9 rotated out
          of Core, and a preview id changes when its card is released.
        </FocusNotice>
      );
    case 'card':
      return <CardAnalyticsView key={state.card.id} card={state.card} handoff={handoff} {...data} />;
  }
}
```

- [ ] **Step 13: Write `CardAnalyticsPage.tsx`**

Create `src/tools/analytics/cards/CardAnalyticsPage.tsx`.
- **Hooks first.** Every hook runs before bare `/cards` returns its `Navigate`.
- **The focus rule.** `useCardHandoff` is the one place that asks for focus. Its comment says why: a click-time request is taken by the old card's h2 before the navigation's transition commits.
- **The setState in render.** `setSeen` and `handoff.request()` run during render, guarded by a change, as the app's `useAutocomplete.ts:72-79` does. React re-renders the page at once, before its children.

```tsx
import {useEffect, useState} from 'react';
import {Navigate, NavigationType, useNavigationType, useParams} from 'react-router-dom';
import {useCardDataContext} from '../../../app-bridge';
import {useFocusHandoff, type FocusHandoff} from '../../../shell/focusHandoff';
import {cardsHref} from '../../../shell/nav';
import {PageLayout} from '../../../shell/PageLayout';
import {DataAsOf} from '../../../ui/DataAsOf';
import {useVoteAnalytics} from '../useVoteAnalytics';
import {useVoteLog} from '../useVoteLog';
import {CardPageBody} from './CardPageBody';
import {CardSwitcher} from './CardSwitcher';
import {cardPageState, type CardPageState} from './cardPageState';
import {forgetLastCard, readLastCard, writeLastCard} from './lastCard';
import {useCardSynergies} from './useCardSynergies';

/** What the focus handoff watches: the card the URL names, and whether the card list has failed. */
interface Watched {
  cardId: string | undefined;
  failed: boolean;
}

/**
 * Whether the move from `before` to `now` leaves focus for the next state to
 * take (R-48). Two moves do: the card list's error clearing, which only Retry
 * does, and the URL naming another card, unless a redirect did it (`replaced`):
 * bare /cards opening the last card is no one's action.
 */
function asksForFocus(before: Watched, now: Watched & {replaced: boolean}): boolean {
  if (before.failed && !now.failed) return true;
  return now.cardId !== before.cardId && now.cardId !== undefined && !now.replaced;
}

/**
 * The page's focus handoff (R-48). The page asks for it when the state moves
 * on, not in a click handler: a link's navigation renders as a transition,
 * after the click's own update, so the old card's h2 would take a request made
 * on click. The state that takes it moves focus only if focus fell to <body>
 * (useTakeHandoff): a partner link or Retry goes with the state it sat in, but
 * after a switcher pick focus is still in the switcher, and it stays there.
 */
function useCardHandoff(watched: Watched): FocusHandoff {
  const handoff = useFocusHandoff();
  const replaced = useNavigationType() === NavigationType.Replace;
  const [seen, setSeen] = useState(watched);
  if (seen.cardId !== watched.cardId || seen.failed !== watched.failed) {
    setSeen(watched);
    if (asksForFocus(seen, {...watched, replaced})) handoff.request();
  }
  return handoff;
}

/**
 * Remembers the card on screen as the last one viewed (R-28), and forgets an
 * id the loaded card list doesn't hold. A list that is loading or has failed
 * is neither, so it never costs a good id.
 */
function useRememberCard(state: CardPageState) {
  useEffect(() => {
    if (state.kind === 'card') writeLastCard(state.card.id);
    if (state.kind === 'unknown') forgetLastCard(state.cardId);
  }, [state]);
}

/**
 * Card analytics (/cards/:cardId?): one card's votes, calibration and engine
 * data. The header's Switch card picks the card, and bare /cards opens the
 * last card viewed, or the "Pick a card" prompt. The header and the engine
 * view never wait for the vote files. Read-only, so no branch notice.
 */
export function CardAnalyticsPage() {
  const {cardId} = useParams();
  const cardData = useCardDataContext();
  const state = cardPageState({...cardData, cardId});
  const analytics = useVoteAnalytics();
  const voteLog = useVoteLog();
  // The URL's id, not the resolved card's: the synergy file loads while the card list does.
  const synergies = useCardSynergies(cardId ?? null);
  const handoff = useCardHandoff({cardId, failed: state.kind === 'failed'});
  useRememberCard(state);

  // Every hook has run: bare /cards may now hand over to the last card viewed.
  const last = cardId ? null : readLastCard();
  if (last) return <Navigate to={cardsHref(last)} replace />;
  return (
    <PageLayout
      title="Card analytics"
      subtitle="Votes, calibration and engine data for one card"
      meta={analytics.data ? <DataAsOf generatedAt={analytics.data.generatedAt} /> : undefined}
      actions={<CardSwitcher cards={cardData.cards} />}
      documentTitle={state.kind === 'card' ? `${state.card.fullName} · Card analytics` : undefined}>
      <CardPageBody
        state={state}
        analytics={analytics}
        voteLog={voteLog}
        synergies={synergies}
        getCardById={cardData.getCardById}
        onRetry={cardData.retryLoad}
        handoff={handoff}
      />
    </PageLayout>
  );
}
```

`useRememberCard`'s effect runs again whenever `state` is a new object, which means on a card-list change or an id change. It rewrites the same key with the same id, which costs nothing. Keying it on primitives would put `cardId` and `kind` back as loose arguments, against the module's 0% primitive arguments.

- [ ] **Step 14: Run them to PASS**

Run: `pnpm vitest run src/tools/analytics/cards/__tests__/CardAnalyticsPage.test.tsx src/tools/analytics/cards/__tests__/cardPageState.test.ts --silent=false`
Expected: 23 passed (16 and 7), with no "not wrapped in act(...)" warning.

- [ ] **Step 15: Point the shell's tests at the new item and route**

`src/shell/nav.test.ts`. At `:4-8`, the `navItemFor` table gains `/cards/2983`:

```ts
  it.each([
    ['/reveal', 'reveal'],
    ['/reveal/', 'reveal'],
    ['/calibration/anything', 'calibration'],
    ['/cards/2983', 'cards'],
  ])('gives %s to the %s item', (pathname, id) => {
```

At `:23`, it also gains:

```ts
  it.each(['/tuning', '/cards/2983', '/no-such-page'])('%s writes nothing', (pathname) => {
```

At `:38-39`:

```ts
    const insights = NAV_ITEMS.filter((item) => item.group === 'insights').map((item) => item.id);
    // Card analytics ends the group (R3), as the handoff lists it.
    expect(insights).toEqual(['calibration', 'activity', 'web', 'cards']);
```

`src/shell/Sidebar.test.tsx:32`:

```tsx
    expect(hrefs('Insights')).toEqual(['/calibration', '/activity', '/web', '/cards']);
```

`src/router.test.tsx`. At `:71`:

```tsx
  it.each(['/cards/2983', '/no-such-page'])('names no branch on %s, which writes nothing', (path) => {
```

Add this before "opens web analytics at /web" (`:158`):

```tsx
  it('opens Card analytics on a card at /cards/2983, current in the sidebar while Overview is not', () => {
    renderAt('/cards/2983');
    expect(screen.getByRole('heading', {level: 1, name: 'Card analytics'})).toBeInTheDocument();
    // The file's fetch stub never settles, so the card list is still loading.
    expect(screen.getByText('Loading cards…')).toBeInTheDocument();
    expect(sidebarNav().getByRole('link', {name: 'Card analytics'})).toHaveAttribute('aria-current', 'page');
    expect(sidebarNav().getByRole('link', {name: 'Overview'})).not.toHaveAttribute('aria-current');
  });
```

The `NAV_ITEMS` loops cover the rest for `/cards` once the item exists, with no change of their own:
- the sidebar href (`:47-52`);
- the tab title (`:83-89`): bare `/cards` with nothing stored shows the prompt inside `PageLayout`, so it reads "Card analytics · Inkweave admin";
- the branch notice against `writes` (`:93-99`).

`fetchCardSynergies` caches only settled results (`usePrecomputedSynergies.ts:42-67`), so the never-settling stub leaves nothing for a later test.

- [ ] **Step 16: Run them, and see them fail**

Run: `pnpm vitest run src/shell/nav.test.ts src/shell/Sidebar.test.tsx src/router.test.tsx`
Expected: 4 failed:
```
× gives /cards/2983 to the cards item
× heads Insights, where the analytics page was
× lists the pages under their group labels
× opens Card analytics on a card at /cards/2983, current in the sidebar while Overview is not
```

"names no branch on /cards/2983" and "/cards/2983 writes nothing" already pass, on the Not found page and with no item. They hold the line once the page exists.

- [ ] **Step 17: Add the nav item and the route**

`src/shell/nav.ts`, after the web item (`:25`), before reveal (`:26`):

```ts
  {id: 'web', label: 'Web analytics', mark: 'Wa', path: '/web', group: 'insights', writes: false},
  {id: 'cards', label: 'Card analytics', mark: 'Cd', path: '/cards', group: 'insights', writes: false},
  {id: 'reveal', label: 'Reveal publisher', mark: 'Re', path: '/reveal', group: 'publish', writes: true},
```

What the item gets with no other change:
- `navItemFor` (`:35-37`) already owns a path and every path under it, so `/cards/2983` marks it current and Overview never matches it.
- `writes: false` means no token box (`isWritePath`).
- The Sidebar's `NavLink` sets no `end` (`Sidebar.tsx:92-101`). NavLink treats `/` as exact by itself, and marks `/cards` current on `/cards/<id>`.

`src/router.tsx`, the import after `:5`:

```tsx
import {CalibrationPage} from './tools/analytics/calibration/CalibrationPage';
import {CardAnalyticsPage} from './tools/analytics/cards/CardAnalyticsPage';
```

The route after `:19`:

```tsx
      {path: 'calibration', element: <CalibrationPage />},
      // One element for every card: bare /cards opens the last card viewed, or the "Pick a card" prompt.
      {path: 'cards/:cardId?', element: <CardAnalyticsPage />},
```

It slots in before the `analytics` redirect, and `'*'` stays last. Nothing in `forwarded-paths.json` is a prefix of `/cards/`, and `vercel.json`'s catch-all serves `/cards/*` as `index.html`.

- [ ] **Step 18: Run them to PASS**

Run: `pnpm vitest run src/shell src/router.test.tsx`
Expected: every file passes (105 tests in the sandbox, with R3-5's `cardsHref` cases).

- [ ] **Step 19: Stories**

Create `src/tools/analytics/cards/CardPageBody.stories.tsx`. They show the states around the view, under the page's real header, on the bare `/cards` route. The card state is the view, which has its own stories (R3-6).

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {MemoryRouter} from 'react-router-dom';
import type {FocusHandoff} from '../../../shell/focusHandoff';
import {PageLayout} from '../../../shell/PageLayout';
import {DataAsOf} from '../../../ui/DataAsOf';
import type {UseVoteAnalyticsReturn} from '../useVoteAnalytics';
import type {VoteAnalytics} from '../voteAnalyticsTypes';
import {CardPageBody} from './CardPageBody';
import {CardSwitcher} from './CardSwitcher';
import {REVIEW_PAIRS, SWITCHER_CARDS} from './cardFixtures';
import type {CardPageState} from './cardPageState';

const ANALYTICS: VoteAnalytics = {
  generatedAt: '2026-10-05T04:00:00Z',
  hasRawVotes: true,
  global: {
    totalVotes: 74,
    distinctPairs: REVIEW_PAIRS.length,
    distinctVoters: 12,
    meanGap: -0.2,
    accuracySentiment: null,
    engineSilentPairs: 0,
    weekly: [],
    dimensionFill: null,
  },
  rules: [],
  pairs: [...REVIEW_PAIRS],
};

const LOADED: UseVoteAnalyticsReturn = {data: ANALYTICS, loading: false, error: null};
const LOADING: UseVoteAnalyticsReturn = {data: null, loading: true, error: null};
/** No story takes a handoff: nothing here unmounts the control pressed. */
const NO_HANDOFF: FocusHandoff = {pending: false, request: () => {}, done: () => {}};

interface PageStateStoryProps {
  state: CardPageState;
  analytics: UseVoteAnalyticsReturn;
}

/**
 * The body under the page's own header, as CardAnalyticsPage lays it out, on
 * the bare /cards route. The card state is the view, which has its own stories
 * (R3-6), so these show the states around it. A MemoryRouter: the switcher and
 * the Cards to review links navigate, and nothing here calls useBlocker.
 */
function PageStateStory({state, analytics}: PageStateStoryProps) {
  return (
    <MemoryRouter initialEntries={['/cards']}>
      {/* As in the shell's main column: the layout fills the height, and only its body scrolls. */}
      <div style={{height: '100vh'}}>
        <PageLayout
          title="Card analytics"
          subtitle="Votes, calibration and engine data for one card"
          meta={analytics.data ? <DataAsOf generatedAt={analytics.data.generatedAt} /> : undefined}
          actions={<CardSwitcher cards={SWITCHER_CARDS} />}>
          <CardPageBody
            state={state}
            analytics={analytics}
            voteLog={{data: null, loading: true, error: null}}
            synergies={{data: null, loading: true, error: null, retry: () => {}}}
            getCardById={() => undefined}
            onRetry={() => {}}
            handoff={NO_HANDOFF}
          />
        </PageLayout>
      </div>
    </MemoryRouter>
  );
}

const meta: Meta<typeof PageStateStory> = {
  title: 'Admin/Insights/Card analytics/Page states',
  component: PageStateStory,
  args: {state: {kind: 'pick'}, analytics: LOADED},
};
export default meta;
type Story = StoryObj<typeof meta>;

/** A first visit (R-28): the prompt, and the five cards most worth a look, widest gap first. */
export const PickACard: Story = {};

/** The prompt alone, while vote analytics loads (or after it failed). */
export const PickWhileAnalyticsLoads: Story = {
  args: {analytics: LOADING},
};

/** An id, while the card list loads. */
export const LoadingCards: Story = {
  args: {state: {kind: 'loading'}},
};

/** An id the card list doesn't hold (R-29). */
export const UnknownCard: Story = {
  args: {state: {kind: 'unknown', cardId: '13127'}},
};

/** The card list failed: the error and Retry, on any /cards URL. */
export const FailedCardList: Story = {
  args: {state: {kind: 'failed', error: new Error('Failed to fetch')}, analytics: LOADING},
};
```

`PageLayout` gains no story: the tab title doesn't show in Storybook, and `PageLayout.test.tsx` pins it.

- [ ] **Step 20: Record the route in the docs**

`CLAUDE.md:16`. The opening sentence changes from:

```markdown
- Routes: the Overview at `/`, the insights pages `/calibration`, `/activity` and `/web`, and the write tools `/reveal` and `/image`.
```

to:

```markdown
- Routes: the Overview at `/`, the insights pages `/calibration`, `/activity`, `/web` and `/cards/:cardId?` (Card analytics: bare `/cards` opens the last card viewed, which each browser remembers), and the write tools `/reveal` and `/image`.
```

The rest of the line is unchanged.

`docs/PLAN.md:75` (D10). Change:

```markdown
R2 redirects `/tuning` to `/calibration`, and R4 redirects `/reveal` and `/image` to `/studio`
```

to:

```markdown
R2 redirects `/tuning` to `/calibration`, R3 adds `/cards/:cardId?`, and R4 redirects `/reveal` and `/image` to `/studio`
```

"R3 as built", the file-structure rows and the contract's final form in `docs/plans/R-redesign.md` are R3-9's.

- [ ] **Step 21: Lint, typecheck, the whole suite and Code Health**

Run: `pnpm lint`
Expected: no problems. The render-time `setState` in `useCardHandoff` passes `react-hooks` 7.1.1 and `react-compiler`.

Run: `pnpm typecheck`
Expected: exit 0. It covers the stories and the test files.

Run: `pnpm test:run`
Expected: every file passes.

Then run CodeScene's `code_health_review` on these files:
- `cardPageState.ts`, `CardPageBody.tsx`, `CardPageBody.stories.tsx` and `CardAnalyticsPage.tsx`;
- both new test files;
- `src/shell/PageLayout.tsx`.

Expected: 10.0 each, with no findings (MCP 1.1.3 gave that in the sandbox). The gate is stricter, so `analyze_change_set` runs before the push (R3-9). If it flags a function, split it, as `CardPageBody`'s states are split.

- [ ] **Step 22: Look at it in Storybook**

Run: `pnpm storybook`, then open http://localhost:6007 → `Admin/Insights/Card analytics/Page states`. Check these:
- **`PickACard`:**
  - the prompt sits above Cards to review;
  - five rows, widest gap first, each name a link in the accent colour that truncates on a narrow canvas;
  - the bias bars give way before the names;
  - the panel's width: on a canvas whose body is 860px or wider, Cards to review keeps one track, 420px to about 640px, with each gap close to its bar, not stretched across the body; below 860px it takes the whole width;
  - "Data as of 2026-10-05" in the header.
- **`FailedCardList`:** the red notice, then a neutral "Retry" at its content width.
- **`UnknownCard`:** the id in mono.
- **Every story:** Storybook's Accessibility panel reports no violations.

Stop the server afterwards. If no browser is available to the implementer, record each check as pending with the owner, as R1-2's Step 11 did, and say so in the report.

- [ ] **Step 23: Commit**, with the Bash tool, only after the owner approves. Use two separate calls, so the commit command starts with `USER_APPROVED=1`:

```bash
git add src/tools/analytics/cards/cardPageState.ts src/tools/analytics/cards/__tests__/cardPageState.test.ts src/tools/analytics/cards/CardPageBody.tsx src/tools/analytics/cards/CardPageBody.stories.tsx src/tools/analytics/cards/CardAnalyticsPage.tsx src/tools/analytics/cards/__tests__/CardAnalyticsPage.test.tsx src/shell/PageLayout.tsx src/shell/PageLayout.test.tsx src/shell/nav.ts src/shell/nav.test.ts src/shell/Sidebar.test.tsx src/router.tsx src/router.test.tsx CLAUDE.md docs/PLAN.md
```

```bash
USER_APPROVED=1 git commit -m "feat(cards): add Card analytics at /cards (#24)"
```

Never stage `public/admin-data/`. Husky's pre-commit runs lint and the tests. If Vitest fails to start its workers under load, stop this session's preview servers, wait out other sessions' runs, and retry.

### Hand-offs from R3-7

- **R3-6a (the view).**
  - **Taking the handoff.** The card header's h2 takes the page's handoff: `useTakeHandoff(handoff, ref, 'h2')` in `CardHeader.tsx`, with the h2 `tabIndex={-1}`. R3-6a's draft already does this.
  - **Its tests.** The view's own test should cover the h2 taking a pending handoff. R3-7's page test checks that only through its stand-in.
- **R3-6c (engine view).**
  - **Network node links.** They need no click hook either; R3-6c's draft already says so (its note on R-48).
  - **The view's `synergies` prop.** R3-6c's Step 14 adds `synergies: UseCardSynergiesReturn;` to `CardAnalyticsViewProps` (its draft as of 20:59), as header contract 14 writes it. R3-7's Step 1 greps for that line.
  - **Its Retry (R-45) needs its own handoff.** It needs a `useFocusHandoff()` of the panel's own, not the page's. With the page's, the card header's h2, always mounted and taking, would take a click-time request at once.
  - **A click-time request works there.** `useCardSynergies`' `retry` is a plain state update batched with the click. Its loading state is derived in the same render, so the failed panel is gone before the next one takes the request, as with R2's Save token.
- **R3-5 (switcher).**
  - **It stays mounted.** It sits in `PageLayout`'s `actions`. It unmounts only across the bare-`/cards` redirect, when `PageLayout` gives way to `<Navigate>` for one render.
  - **A pick pushes.** From the prompt, Back then lands on bare `/cards`, which redirects to the card just picked. That is accepted (re-base notes).
- **R3-9.**
  - **Real-data items.** Add these to the phase's list:
    - the tab title on a card;
    - focus on the new card's h2 after a Voted pairs link, a network node and a Cards to review link;
    - focus staying in the switcher after a pick;
    - the not-found copy on a rotated-out id, for example a set-8 card's id;
    - Cards to review's five rows against the files, and its width on a wide window;
    - Retry with the network offline in DevTools;
    - Back from a card opened from the prompt (accepted).
  - **"R3 as built".** It records what this task settled: the discriminated `CardPageState`; `useRememberCard(state)`; state-driven handoff requests, with the prompt and not-found lines taking focus and Back and Forward asking too; Cards to review without vote counts, at a card's width.

<!--
Review pass (2026-10-06, 20:45-21:05): notes not applied as written, and why.
- Note 3 (D10 wording): not applied. R3-9 took the review's other option before this pass: its check is now grep -c 'R3 adds `/cards' docs/PLAN.md (no closing backtick), and its fallback "New" text is R3-7's own words, "R3 adds `/cards/:cardId?`" (R3-9's Step 20, item 4, as of 20:54). Changing R3-7 to "R3 adds `/cards` and `/cards/:cardId`" would now break that fallback, so Step 20 keeps its text.
- Note 8 (Cards to review width): the problem is right, the fix is not. twoUp(420) is repeat(auto-fit, minmax(min(100%, 420px), 1fr)) (CalibrationWorkspace.tsx:89-96, moved to src/ui/layout.ts by R3-1a). With one child, auto-fit collapses the empty tracks to 0 and the remaining 1fr track takes the free space (CSS Grid, repeat(auto-fit)), so the wrapper would still span the body. Applied instead: REVIEW_TRACK, the same tracks and gap with auto-fill, which keeps the empty tracks; twoUp is not added to Consumes. Verified in sandbox-R3-7-fix (lint, tsc, 23 tests, the stories); the width itself waits for Step 22's Storybook check, since jsdom does no layout.
- Note 2 and note 4's edits to sibling drafts (R3-6a's onLeave, test and notes; R3-6c's hand-off; R3-2's countOf item; the header's Review focus #5): only R3-07-route-page.md may be edited here, so they are recorded under "Hand-offs from R3-7" and "When the plan is assembled". R3-6c's note 9 already points at R3-7's remount test (R3-6c as of 20:59), and R3-6c's Step 14 now adds the view's synergies prop.
- Note 9: took the second option (no count column, per R-28), so R3-7's tests and stories stay as verified.
-->
