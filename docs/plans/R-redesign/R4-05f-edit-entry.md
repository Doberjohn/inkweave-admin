> Part of [R: Admin redesign](../R-redesign.md), phase R4 ([R4-card-studio.md](R4-card-studio.md)). Read the main plan's decisions (R-57 to R-91 for R4), corrections, global constraints and shared interfaces, then the R4 header, first.

> **Re-base notes (R4-5f, 2026-10-07).** Re-based from the Edit-entry part of the outline's "Task R4-5: Studio components, paths and layout" (`R4-card-studio.md:601-810`, written 2026-10-01 against the planned R1 code: `EditSearch`, `EditingBanner` and `ReleasedCardFacts` in its Files, Produces, "Edit search and banner", the Aside's `ReleasedCardFacts` line and the `EditSearch` tests). It is written against `main @ e5e5029` (R1 to R3 as built, `b490fb7`, plus the pin-bump PR) and pin `upstream/inkweave @ 16283a13`, with decisions R-57 to R-91, the R4 header's contract addition 12 and "Shared rules", and the 2026-10-07 audit (`r4-audit-synth.md`, "R4-5"; `r4-audit-full.json`, the R4-5 entry). The audit cited the old pin `bc877e1`; every app fact below was re-checked at `16283a13`. What changed and why:
> 1. **Scope.** This task builds the three components Edit card shows around the form, plus what they share, and nothing that wires them: R4-6b mounts them.
>    - **`EditSearch`**: the search screen, one row per match, an always-mounted status line, the card list's and the file's states, and the focus handoff.
>    - **`EditingBanner`**: the strip over an open card, with the `h2` the handoff lands on, the links out, and the card's tags.
>    - **`ReleasedCardFacts`**: R-61's read-only facts list, in the form's place for a card that opens image-only.
>    - **Shared:** `CardMarks.tsx` (tags, ink icons, rarity glyph), the pure `searchStatus.ts`, one `Tag` chip in `src/ui`, and `cardFacts` moved into `src/ui`.
> 2. **The props are the header's contract addition 12**, which already carries this task's two additions to the outline:
>    - `EditSearch` takes `rows`, `total`, `query`, `onQuery`, `list: {loading, error, onRetry}`, `file: {error, onRetry, onForgetToken?}` and `handoff?`, in place of the outline's `{cards, previewIds, status, error, onRetry}`. That outline shape merged two sources that fail differently (the audit). The page runs R4-2b's `searchCards` and holds the query, so the query survives opening a card and coming back.
>    - **`notice?: ReactNode`**, a line above the field. R4-6b puts its unknown-id line there, inside the screen's column (see note 19).
>    - **`rows` is `readonly SearchRow[]`**, so the page can pass `searchCards`' result as it is.
>    - `EditingBanner({card, tag, deployed, handoff?})` and `ReleasedCardFacts({card, note})` are the header's, unchanged.
> 3. **Each source's state (R-71, R-66).**
>    - **The card list** (`useCardDataContext`). Every row comes from it, so its failure takes the field's place: R3's `FailedCardList` wording ("Could not load the card list (…)") and a neutral `Retry` (`CardPageBody.tsx:76-87`). While it loads, the field is ready to type in, the status line says "Loading cards…", and no row shows.
>    - **Rows wait for the card list. This is new.** The outline showed whatever rows it was given. But R4-4d's search list is the card list plus every branch-file entry it lacks (R-66). While the card list loads it lacks every entry, so all 204 set-14 cards would show "not deployed yet" for a moment.
>    - **`previewCards.json`.** Its failure shows beside the rows, never in their place (R-71). It is a `Notice` in the error tone: "Could not read previewCards.json: {error}. Cards outside set {REVEAL_SET_CODE} still open for a new image." That holds for both errors the page passes: a failed first read, and a failed re-read (R4-4a's `reloadError`, which R4-4b's `previewFile.error` carries), after which the set's cards still open from the last read. So the line doesn't say they wait. Below it sits one way out, as the tuning aside's `ReadError` gives (`TuningAside.tsx:299-313`):
>      - "Forget token" (`ForgetTokenOffer`) when GitHub rejected the token (`isRejectedToken`, R-26) and the page offers it;
>      - otherwise a neutral "Read previewCards.json again", named apart from the card list's `Retry`, since both can show at once.
>    - The set code comes from `REVEAL_SET_CODE` (bridged), never a literal.
> 4. **The status line.**
>    - It is an always-mounted `<p role="status">` (the audit; `PendingTray.tsx:180-192`), so each new count is announced, as R3's switcher announces "No cards match." (R-30). The no-match line moves into it, so it isn't printed twice.
>    - Its text comes from a pure `searchStatus(state)` in `src/tools/studio/searchStatus.ts`, which keeps the component's branches low (the audit's code-health note). The wording:
>      - "1,228 cards", or "45 cards match", plus " · showing the first 40" when capped;
>      - "1 card matches";
>      - `No cards match "zzz".`, with the trimmed query;
>      - "Loading cards…";
>      - nothing while the card list has failed, since its alert speaks.
>    - "Showing the first N" reads the rows on screen, which are `SEARCH_LIMIT` exactly when capped. The handoff's "N cards in the set" (`dc.html:1016`) doesn't fit: the search covers every Core card, not one set (R4-2b).
> 5. **Focus (R-59, with R-48).** The components take the page's one handoff; R4-6b requests it from the URL, never on a click.
>    - The search field takes it, through `useTakeHandoff` on a wrapper, after "Load a different card", or after the card list's Retry. It takes it only once the card list is in (`useTakeHandoff`'s `ready`, `!list.loading`). Retry sets the list loading, so the field mounts at once. If it took the request then, focus would sit in the field and drop to `<body>` when a second failure swapped it out.
>    - The failed card list's `Retry` takes it when the list fails again, because the request waited out the load, as R3's does: its "Loading cards…" takes nothing (`CardPageBody.tsx:167-168`).
>    - The banner's `h2` (`tabIndex={-1}`) takes it when the URL names a new card, as `CardHeader.tsx:86-94` does.
>    - "Read previewCards.json again" takes nothing. The field stays mounted beside it, so R4-6b's request on the error clearing lands on the field.
> 6. **One `Tag` chip in `src/ui` (the audit's optional item).**
>    - R1's `RawTag` and R3's `LowNTag` repeat one chip style (`RawTag.tsx:12-24`, `LowNTag.tsx:14-26`), and the studio's tags would have been a third copy. `src/ui/Tag.tsx` is that chip, and the two tags now render through it.
>    - The chip gains `whiteSpace: 'nowrap'`, and `RawTag` gains `LowNTag`'s `flex: 'none'`. Neither changes how a short tag looks.
>    - The tags read lowercase, as admin's tags do ("raw", "low n"): `preview`, `released` and `not deployed yet`. Each carries a title saying where the data comes from.
>    - A `null` tag draws no chip (R4-2b: a set-14 card while the file is unread).
> 7. **`deployed` comes from R4-4d's `SearchRow.deployed`** (the header: "R4-4d adds deployed: boolean") and the controller's `deployed`, not from `KnownCardsContext`.
>    - It is the same fact: whether the card list holds the id (R-33).
>    - But that context's default resolves no id, so every test and story without a provider would show every card "not deployed yet" and no analytics link.
>    - "View card analytics" shows only when `deployed` (R-33, R-66).
> 8. **The banner** follows the handoff (README §7, `dc.html:186-190`).
>    - **The h2.** The gold "Editing" eyebrow sits inside the `h2`, so the handoff lands on "Editing Mei Red Panda". Then come `#n` (`<code>`) and the tags. The links are `cardsHref(card.id)` and `studioHref('edit')`, both `react-router` `Link`s with `adm-link` (the audit; R-33, R-81).
>    - **Name and version** print as R3's `CardHeader` prints them: the name, a space text node, then the version muted. The banner doesn't use `cardLabel`'s "name · version", so `cardLabel` stays in `analytics/cards`. Moving it as well would touch three more R3 files for one string.
>    - **The strip** is padded `${SPACING.md}px ${PAGE_GUTTER}`, so its text lines up with the page title. Its fill is `ADMIN_COLORS.panel`, the handoff's `#101018`.
> 9. **`ReleasedCardFacts` (R-61)** is a `Panel` titled "Card data", marked "read only", over a `<dl>`. Its rows:
>    - Name, Version, Set and Collector number;
>    - Ink: each ink's icon with its name in words, the icon decorative, so a screen reader hears each name once;
>    - Type: `cardFacts`' "Character · cost 3 · inkable";
>    - Rarity: `rarityConfigOf`'s glyph and name, as R3's header shows it (R-49).
>
>    A missing value reads "—", as `changeRows` prints one. The note under the list is the `note` prop: R4-2a's `IMAGE_ONLY_NOTES[reason]`. So R-65's image-only preview entries reuse the component with their own sentence, and the outline's hard-coded LorcanaJSON note goes. It shows no synergies and no controls (R-61, R-90).
> 10. **`cardFacts` moves to `src/ui/cardFacts.ts`** (R-61: "move it to a shared module, rather than importing from analytics/cards").
>     - `src/ui` is where R3-1a moved shared pieces (`LowNTag`, `sharePercent`), and R-53 allows it: the module imports only the engine's type.
>     - `cardView.ts` loses the function and its now unused `LorcanaCard` import.
>     - `CardHeader.tsx` imports it from `src/ui`.
>     - Its test moves from `cardView.test.ts` to `src/ui/__tests__/cardFacts.test.ts`, built without `cardFixtures`' `lorcanaCard` (the function takes a `Pick`), and `cardView.test.ts` drops both imports.
> 11. **The rows** are drawn as the handoff draws them (README §7, `dc.html:170-180`). Each is a `Link` to `studioHref('edit', card.id)`:
>     - a 34×48 thumbnail box (`smallImageUrl`, `loading="lazy"`; the box stays for a card with no art, such as one only the branch file holds);
>     - the name with the tags beside it, and the version under it. The tags wrap under a long name, so at phone width a "not deployed yet" chip doesn't run into the marks;
>     - the inks (`InkIcon`, named by alt: the outline's "not decorative") and the rarity glyph (titled for a pointer), in a fixed-width column so the rows line up. The glyph's titled wrapper is `aria-hidden`: otherwise accname's step 2I could read its title into the link's name in a browser, though Testing Library's `dom-accessibility-api` skips a descendant's title, so no test would see it;
>     - `#n`.
>
>     How it's built:
>     - The link carries `adm-row-btn`, so it gets the hover fill and the inset focus ring, which the list's clipped corners keep whole.
>     - The spaces are text nodes, so the link's name reads "Mei preview Red Panda Ruby #103" (Ruby's first number at the pin).
>     - The first row draws no top rule (`row !== rows[0]`, which needs no index parameter).
> 12. **Copy.**
>     - The title: "Find a card to edit" (the handoff's).
>     - The hint: "Every Core card, by name, version or id, with the branch's preview cards first. A preview card opens in the form with its current data; any other card opens for a new image." That matches `filterCards` (fullName or id) and R-76.
>     - The placeholder: "e.g. Maui or Hero to All" (the handoff's).
>     - The field's name stays "Search cards", so the ported `CardImagePicker` query still works.
>     - No set number is hard-coded.
> 13. **Tests.**
>     - `EditSearch.test.tsx` (18), `EditingBanner.test.tsx` (6), `ReleasedCardFacts.test.tsx` (4), `searchStatus.test.ts` (9), `Tag.test.tsx` (2) and the moved `cardFacts.test.ts` (2). The audit asked for banner and facts tests, which the outline lacked.
>     - **The ported case.** `CardImagePicker`'s "narrows the list as you search" runs through a stateful harness that filters with the kept `filterCards`, not `searchCards`. The component is controlled, and R4-4d may widen `searchCards`' input.
>     - **Routing.** The components mount no guard, so the tests use `MemoryRouter`, as `renderWithCards` does. Nothing is stubbed, so nothing needs restoring in the shared worker.
> 14. **Stories.** One file, "Admin/Publish/Card studio/Edit entry": the search (live), no match, the card list loading and failed, the file failed, the token rejected, a preview card's banner, a card not deployed yet, a released card with its facts, and an unnumbered preview entry with its R-65 note.
>     - Each renders inside `PageLayout title="Card studio" writes flush` under a `MemoryRouter`, as R4-6b lays the pane out.
>     - `Primitives.stories.tsx`' Tags story adds the studio's chips.
> 15. **Dependencies (build order).** R4-2a (`studioFixtures.ts`, `IMAGE_ONLY_NOTES`), R4-2b (`SearchRow`, `CardTag`), R4-4d (`SearchRow.deployed`) and R4-5a (`studioHref`). Imports go to modules directly. This task touches no reveal-sync contract file and not the bridge, so there is no reveal-sync run.
> 16. **Code Health.** The local tool scored every file 10.0 with no findings. Hand count of primitive parameters (`string`, `number`, `boolean` and their aliases; lambdas included):
>
>     | Module | Primitive parameters |
>     |---|---|
>     | `src/ui/Tag.tsx` (new) | 0 of 1 |
>     | `src/ui/cardFacts.ts` (new) | 0 of 1 |
>     | `src/tools/studio/searchStatus.ts` (new) | 0 of 2: `countLine(state)`, `searchStatus(state)` |
>     | `CardMarks.tsx` (new) | 0 of 3 |
>     | `EditSearch.tsx` (new) | 0 of 10: eight components, each one props object, plus the `onChange` and `map` lambdas, which take an event and a row |
>     | `EditingBanner.tsx` (new) | 0 of 1 |
>     | `ReleasedCardFacts.tsx` (new) | 0 of 5 |
>     | `RawTag.tsx`, `LowNTag.tsx` | 0 of 0 and 0 of 1, unchanged |
>     | `cardView.ts` | 1 of 7, from 1 of 8: `calibrationData`'s `cardId` |
>
>     - **Complexity** (ESLint's `complexity` rule). The highest is `searchStatus`' 6. `EditSearch` is 5, `EditingBanner`, `ReleasedCardFacts` and `countLine` 4, and every other function 3 or less.
>     - **No condition has more than two terms:** `onForgetToken && isRejectedToken(error)`, and `listed = !list.loading && !failed`. The rows render through a `ResultList` that returns null for none, so no JSX guard chains three terms.
> 17. **Steps follow gates-once:** targeted tests per step, `eslint` on the 20 changed files, one `pnpm typecheck`, a Code Health step, and the commit in two Bash calls. The pre-commit hook runs the full lint and `test:run`. No step runs `pnpm build` or Storybook; R4-8 checks Storybook.
> 18. **Verified in a scratch sandbox** (`scratchpad/r4-rebase/sandbox-R4-5f`).
>     - **Setup.** A copy of the working tree's `src` and configs (main `b490fb7` plus the pin bump to `16283a13`), with `node_modules` and `upstream` as read-only junctions, and Vite's cache and the tsbuildinfo inside the sandbox.
>     - **Stand-ins for earlier tasks:**
>       - R4-2a's `cardEdit.ts`, `studioFixtures.ts` and `replaceCardInPreviewJson.ts`, with its `constants.ts` and `validateForm.ts` (from `sandbox-r42a`);
>       - R4-2b's `editSearch.ts`, `changeRows.ts`, `scanLanguages.ts` and `filterCards.ts` (from `sandbox-r42b`);
>       - R4-5a's `nav.ts`, `studioPaths.ts`, `studioLayout.ts`, `studioStyles.ts`, `AdminStyles.tsx` and `app-bridge.ts` (from `sandbox-R4-5a`);
>       - R4-4d's `deployed: boolean` added to `SearchRow` by hand.
>     - **Red steps.** Steps 3, 6, 9 and 11 fail exactly as quoted.
>     - **Green.** Step 17's run passes 10 files and 98 tests. `src/ui`, `src/tools/analytics` and `src/tools/studio` pass in full: 70 files and 984 tests.
>     - **Typecheck.** `tsc -p tsconfig.app.json` exits 0, and a planted error in the stories file is reported, so it reaches them.
>     - **Lint.** `pnpm exec eslint --max-warnings 0 --stdin`, run in the repo, is clean on all 20 files.
>     - **CodeScene.** The local MCP 1.5.7, run in a throwaway git folder, gives 10.0 with no findings on every file.
>     - **Mutants.** Seven were tried, and the tests caught each one:
>       - rows shown over a failed card list;
>       - Forget token offered for any error;
>       - the analytics link always shown;
>       - no "not deployed yet" chip;
>       - the field ignoring the handoff;
>       - the field taking the handoff while the card list loads (the draft before review: "holds it while the card list loads" fails with `Received element is focused`);
>       - no tag chip.
>     - **Review pass** (`sandbox-v-R4-5f`, a copy of the above with the review's fixes): the same runs pass (10 files and 98 tests; 70 files and 984 tests), `tsc -p tsconfig.app.json` exits 0, `eslint --max-warnings 0` is clean on the three changed files, and CodeScene gives `EditSearch.tsx`, `CardMarks.tsx` and `EditSearch.test.tsx` 10.0 with no findings.
> 19. **When the plan is assembled.**
>     - **R4-4d** adds `deployed: boolean` to `SearchRow` (false only for a card the branch file alone holds), and the same fact as the controller's `deployed` for the banner (not on the ready lookup: R4-4d's note "`deployed` sits on the controller"). If it names the field otherwise, change this task's uses: `ResultRow`, the tests' `ROWS` and `Harness`, and the story's `rowOf`.
>     - **R4-6b wires the pane:**
>       - **The search.** It holds `query` in state, and spreads `searchCards({cards: edit.searchCards, query, previewIds: edit.previewFile.previewIds, branchOnlyIds: edit.branchOnlyIds})` into `EditSearch` with `query` and `onQuery`. Without `branchOnlyIds` every row reads deployed (R4-4d's default).
>       - **`list`** maps from `useCardDataContext()` (`isLoading`, `error`, `retryLoad`). **`file`** maps from `edit.previewFile.error`, with `onRetry` R4-6b's `askWhenLanded(edit.retry, handoff)` (the read's promise), and R-84's confirming forget as `onForgetToken`.
>       - **`notice`** carries its unknown-id line. A notice that takes the handoff wins it, since it renders before the field.
>       - **The banner** goes over the workspace, with the ready lookup's `card`, and `tag` and `deployed` from the controller (`edit.tag`, `edit.deployed`).
>       - **`ReleasedCardFacts`** goes in the form slot while `edit.imageOnly` is set, as `<ReleasedCardFacts card={lookup.card} note={IMAGE_ONLY_NOTES[edit.imageOnly]} />` (R4-4b's hand-off: "Read `imageOnly` with R4-2a's `IMAGE_ONLY_NOTES`").
>       - **Focus.** It requests the handoff as the header's "Focus" rule lists.
>     - **The header's contract addition 12** already carries `notice?` and the `readonly` rows. **R4-8** records `src/ui/Tag.tsx` and `src/ui/cardFacts.ts` in "File structure (R1)", and moves the `cardFacts` line of R3's interfaces to `src/ui` (under Departures if the plan names `cardView.ts`).
>     - **Later tasks** (R4-6a to R4-6c) draw any chip through `Tag`, rather than writing a style. R4-5b to R4-5e land before `Tag` exists, and their drafts draw no chip.

### Task R4-5f: The Edit entry

Edit card opens on a search, and an open card sits under a banner that says what is being edited. A card the studio can only give a new image shows its facts in the form's place. This task builds those three components, presentational and wired by props, so R4-6b only mounts them:
- `EditSearch`: the search screen. It takes the card list's and the file's states separately, keeps an always-mounted status line, and takes the focus handoff.
- `EditingBanner`: the `h2` the handoff lands on, the links out, and the card's tags.
- `ReleasedCardFacts` (R-61): the read-only facts list.

Along the way, admin's two tag chips become one `Tag` in `src/ui`, and `cardFacts` moves to `src/ui`, so Card analytics and Card studio word a card alike.

**Files:**
- **Create:**
  - `src/ui/Tag.tsx`, `src/ui/__tests__/Tag.test.tsx`
  - `src/ui/cardFacts.ts`, `src/ui/__tests__/cardFacts.test.ts`
  - `src/tools/studio/searchStatus.ts`, `src/tools/studio/__tests__/searchStatus.test.ts`
  - `src/tools/studio/components/CardMarks.tsx`
  - `src/tools/studio/components/EditSearch.tsx`, `src/tools/studio/__tests__/EditSearch.test.tsx`
  - `src/tools/studio/components/EditingBanner.tsx`, `src/tools/studio/__tests__/EditingBanner.test.tsx`
  - `src/tools/studio/components/ReleasedCardFacts.tsx`, `src/tools/studio/__tests__/ReleasedCardFacts.test.tsx`
  - `src/tools/studio/components/EditEntry.stories.tsx`
- **Modify:**
  - `src/ui/RawTag.tsx` and `src/ui/LowNTag.tsx`: each renders through `Tag` (whole files below).
  - `src/ui/Primitives.stories.tsx`: one import (after `:16`) and the Tags story (`:223-237`).
  - `src/tools/analytics/cards/cardView.ts`: the `LorcanaCard` import (`:1`) and `cardFacts` (`:104-107`) go.
  - `src/tools/analytics/cards/__tests__/cardView.test.ts`: the `lorcanaCard` (`:12`) and `cardFacts` (`:21`) imports, and the `cardFacts` block (`:127-135`), go.
  - `src/tools/analytics/cards/CardHeader.tsx`: the `cardFacts` import (`:6`) points at `src/ui`.
- **Checked and kept:**
  - `src/ui/__tests__/RawTag.test.tsx` and `LowNTag.test.tsx`: they pass unchanged through `Tag`.
  - `CardAnalyticsView.test.tsx`: it checks the header's "Character · cost 8 · inkable" through the moved `cardFacts`.
  - `src/tools/image/filterCards.ts` (R4-2b's): imported only by the test harness and the story.
  - No reveal-sync contract file, and not the bridge.

**Interfaces:**
- **Consumes:**
  - **R4-5a**, from `src/shell/nav.ts`: `studioHref(mode: StudioMode, cardId?: string | null): string`. `studioHref('edit')` is `'/studio?mode=edit'`, and `studioHref('edit', '14031')` is `'/studio?mode=edit&card=14031'`.
  - **R4-2b**, from `src/tools/studio/editSearch.ts`: `type CardTag = 'Preview' | 'Released'` and `interface SearchRow {card: LorcanaCard; tag: CardTag | null}`, which **R4-4d** widens with `deployed: boolean`.
  - **R4-2a**:
    - from `src/tools/studio/cardEdit.ts`: `IMAGE_ONLY_NOTES: Readonly<Record<ImageOnlyReason, string>>`, in tests and stories only;
    - from `src/tools/studio/studioFixtures.ts`: `cardOf`, `studioCard`, `PREVIEW_ENTRY`, `DUAL_INK_ENTRY`, `VARIANTS_ENTRY`, `JA_SCAN_ENTRY`, `UNNUMBERED_ENTRY`, `RELEASED_CARD` and `CURLY_APOSTROPHE_CARD`, in tests and stories only.
  - **`main`:**
    - `src/shell`: `useTakeHandoff` and `FocusHandoff` (`focusHandoff.ts:13-52`), `cardsHref` (`nav.ts:58-60`), and `PAGE_GUTTER` (`PageLayout.tsx:8`).
    - `src/github`: `ForgetTokenOffer({onForget})` (`ForgetTokenOffer.tsx:11`) and `isRejectedToken` (`rejectedToken.ts:6-8`).
    - `src/ui`: `Notice` (the error tone is the alert), `Panel` (title, action) and `fmtInt`.
    - The bridge: `CtaButton`, `InkIcon`, `RaritySymbol`, `rarityConfigOf` (the five base rarities, named "Super rare" and the like), `smallImageUrl`, `REVEAL_SET_CODE`, `FONTS`, `SPACING`, `TRUNCATE` and `LETTER_SPACING`.
    - `src/tools/image/filterCards.ts`, in the test harness and the story only.
- **Produces:**
  ```ts
  // src/ui/Tag.tsx: admin's one informative chip; RawTag and LowNTag render through it
  export function Tag(props: {children: React.ReactNode; title?: string});
  // src/ui/cardFacts.ts: moved from analytics/cards/cardView.ts, unchanged
  export function cardFacts(card: Pick<LorcanaCard, 'type' | 'cost' | 'inkwell'>): string;   // "Character · cost 3 · inkable"

  // src/tools/studio/searchStatus.ts
  export interface SearchStatusState {query: string; shown: number; total: number; list: {loading: boolean; failed: boolean}}
  export function searchStatus(state: SearchStatusState): string;
  // "1,228 cards · showing the first 40" | "45 cards match" | "1 card matches" | 'No cards match "q".' | "Loading cards…" | ""

  // src/tools/studio/components/CardMarks.tsx
  export const MARK_SIZE = 20;
  export function CardTags(props: {tag: CardTag | null; deployed: boolean});   // "preview" | "released", "not deployed yet"
  export function CardInks(props: {card: Pick<LorcanaCard, 'ink' | 'ink2'>});  // InkIcons named by alt
  export function RarityMark(props: {rarity: string | undefined});            // the base rarity's glyph, titled; null for none

  // src/tools/studio/components/EditSearch.tsx
  export interface EditSearchList {loading: boolean; error: Error | null; onRetry: () => void}
  export interface EditSearchFile {error: string | null; onRetry: () => void; onForgetToken?: () => void}
  export interface EditSearchProps {
    rows: readonly SearchRow[]; total: number; query: string; onQuery: (query: string) => void;
    list: EditSearchList; file: EditSearchFile;
    notice?: React.ReactNode;   // addition: a line above the field (R4-6b's unknown id)
    handoff?: FocusHandoff;     // the field takes it once the card list is in; the failed card list's Retry when it fails again
  }
  export function EditSearch(props: EditSearchProps);

  // src/tools/studio/components/EditingBanner.tsx
  export function EditingBanner(props: {card: LorcanaCard; tag: CardTag; deployed: boolean; handoff?: FocusHandoff});
  // h2 tabIndex -1 "Editing {name} {version}"; #n; tags; "View card analytics" (cardsHref, deployed only); "Load a different card" (studioHref('edit'))

  // src/tools/studio/components/ReleasedCardFacts.tsx
  export function ReleasedCardFacts(props: {card: LorcanaCard; note: string});   // note: IMAGE_ONLY_NOTES[reason]
  ```

- [ ] **Step 1: Check what this task builds on**

From the repo root, on `feature/24-redesign-r4`:

```bash
git -C upstream/inkweave rev-parse --short=8 HEAD
git log --oneline main..HEAD
grep -n "export function studioHref\|export type StudioMode" src/shell/nav.ts
grep -n "export type CardTag\|export interface SearchRow\|deployed" src/tools/studio/editSearch.ts
grep -n "export const IMAGE_ONLY_NOTES" src/tools/studio/cardEdit.ts
grep -cE "^export (const|function) (cardOf|studioCard|PREVIEW_ENTRY|DUAL_INK_ENTRY|VARIANTS_ENTRY|JA_SCAN_ENTRY|UNNUMBERED_ENTRY|RELEASED_CARD|CURLY_APOSTROPHE_CARD)\b" src/tools/studio/studioFixtures.ts
grep -rn "cardFacts" src --include=*.ts --include=*.tsx
ls src/ui/Tag.tsx src/ui/cardFacts.ts src/tools/studio/searchStatus.ts src/tools/studio/components/CardMarks.tsx src/tools/studio/components/EditSearch.tsx src/tools/studio/components/EditingBanner.tsx src/tools/studio/components/ReleasedCardFacts.tsx
```

Expected:
- The first command prints `16283a13`.
- The log lists the R4 commits so far, R4-4d's ("feat(studio): find and open cards only the branch file holds (#24)") and R4-5a's among them.
- The `nav.ts` grep prints two lines: `export type StudioMode` and `export function studioHref`.
- The `editSearch.ts` grep prints `export type CardTag`, `export interface SearchRow`, and at least one `deployed` line: R4-4d's `deployed: boolean` in `SearchRow`. If there is no `deployed`, stop and report: R4-4d hasn't landed, or named the field otherwise (re-base note 19).
- The `cardEdit.ts` grep prints one line, and the fixtures count prints `9`.
- The `cardFacts` grep prints exactly these lines, in any order:
  ```
  src/tools/analytics/cards/cardView.ts:105:export function cardFacts({type, cost, inkwell}: Pick<LorcanaCard, 'type' | 'cost' | 'inkwell'>): string {
  src/tools/analytics/cards/CardHeader.tsx:6:import {cardFacts} from './cardView';
  src/tools/analytics/cards/CardHeader.tsx:67:      <span>{cardFacts(card)}</span>
  src/tools/analytics/cards/__tests__/cardView.test.ts:21:  cardFacts,
  src/tools/analytics/cards/__tests__/cardView.test.ts:128:describe('cardFacts', () => {
  src/tools/analytics/cards/__tests__/cardView.test.ts:133:    expect(cardFacts(lorcanaCard({id: '1', name: 'Any', ...card}))).toBe(text);
  ```
- `ls` prints `No such file or directory` for all seven files.

If any of these differs, stop and report. If this checkout has never built the engine, run `pnpm build:engine` once: the fixtures reach it through `cardOf`.

- [ ] **Step 2: Write the failing `Tag` test**

Create `src/ui/__tests__/Tag.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {ADMIN_COLORS} from '../../theme/adminTheme';
import {Tag} from '../Tag';

describe('Tag', () => {
  it('reads its text in the muted colour, says more on hover, and never shrinks or wraps in a row', () => {
    render(<Tag title="From previewCards.json">preview</Tag>);
    const tag = screen.getByText('preview');
    expect(tag).toHaveAttribute('title', 'From previewCards.json');
    expect(tag).toHaveStyle({color: ADMIN_COLORS.muted, flex: '0 0 auto', whiteSpace: 'nowrap'});
  });

  it('has no title unless given one', () => {
    render(<Tag>released</Tag>);
    expect(screen.getByText('released')).not.toHaveAttribute('title');
  });
});
```

- [ ] **Step 3: Run it, and see it fail**

```bash
pnpm vitest run --project app src/ui/__tests__/Tag.test.tsx src/ui/__tests__/RawTag.test.tsx src/ui/__tests__/LowNTag.test.tsx
```

Expected: FAIL, with `Error: Failed to resolve import "../Tag" from "src/ui/__tests__/Tag.test.tsx". Does the file exist?`, then `Test Files  1 failed | 2 passed (3)` and `Tests  2 passed (2)`. The two passing files are today's tag tests.

- [ ] **Step 4: Write `Tag`, and render `RawTag` and `LowNTag` through it**

Create `src/ui/Tag.tsx`:

```tsx
import {SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../theme/adminTheme';

const TAG: React.CSSProperties = {
  flex: 'none',
  fontSize: ADMIN_TYPE.micro,
  fontWeight: 500,
  lineHeight: 1.4,
  whiteSpace: 'nowrap',
  color: ADMIN_COLORS.muted,
  border: `1px solid ${ADMIN_COLORS.strongBorder}`,
  borderRadius: ADMIN_RADIUS.tag,
  padding: `0 ${SPACING.xs}px`,
};

interface TagProps {
  /** A word or two, lowercase ("raw", "low n", "preview"), that says enough without the title. */
  children: React.ReactNode;
  /** What the tag means, on hover. */
  title?: string;
}

/**
 * A small informative chip beside a name or a number, never a control: muted
 * text in a thin box (R-6). It keeps its size in a flex row and never wraps.
 * RawTag, LowNTag and Card studio's tags are this chip (R4-5f).
 */
export function Tag({children, title}: TagProps) {
  return (
    <span title={title} style={TAG}>
      {children}
    </span>
  );
}
```

Replace `src/ui/RawTag.tsx` with:

```tsx
import {Tag} from './Tag';

/**
 * Marks a number computed from the raw vote log (vote-log.json) rather than
 * the aggregates, as KpiCard's `tag`. Pages hide those numbers when the
 * artifact has no raw votes. The tag is informative, so it takes the muted
 * colour (R-6).
 */
export function RawTag() {
  return <Tag title="From the raw vote log">raw</Tag>;
}
```

Replace `src/ui/LowNTag.tsx` with:

```tsx
import {Tag} from './Tag';

/**
 * The "low n" tag: a number that rests on fewer than `minVotes` score votes is
 * thin evidence. The caller decides when it shows and passes its threshold
 * (calibrationModel's LOW_N, which is MIN_RULE_VOTES), and its row's
 * accessible name should say "low n" too, since the tag is only text beside a
 * name. Moved from RulesTable (R3-1a).
 */
export function LowNTag({minVotes}: {minVotes: number}) {
  return <Tag title={`Fewer than ${minVotes} score votes`}>low n</Tag>;
}
```

Each tag keeps its text and title, and its doc comment, less `LowNTag`'s sentence about being RawTag's chip kept from shrinking, which `Tag`'s comment now says. The style is `Tag`'s, which is `LowNTag`'s plus `whiteSpace: 'nowrap'` (re-base note 6).

Run Step 3's command. Expected: PASS, 3 files and 4 tests.

- [ ] **Step 5: Move `cardFacts`' test to `src/ui`**

Create `src/ui/__tests__/cardFacts.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {cardFacts} from '../cardFacts';

describe('cardFacts', () => {
  it.each([
    [{type: 'Character', cost: 8, inkwell: true} as const, 'Character · cost 8 · inkable'],
    [{type: 'Action', cost: 3, inkwell: false} as const, 'Action · cost 3 · uninkable'],
  ])('%o reads "%s"', (card, text) => {
    expect(cardFacts(card)).toBe(text);
  });
});
```

In `src/tools/analytics/cards/__tests__/cardView.test.ts`:
- delete the line `  lorcanaCard,` (`:12`) from the `../cardFixtures` import;
- delete the line `  cardFacts,` (`:21`) from the `../cardView` import;
- delete the blank line and the whole block after the `silentNote` block (`:127-135`), so the file ends with `silentNote`'s closing `});`:

```ts

describe('cardFacts', () => {
  it.each([
    [{type: 'Character', cost: 8, inkwell: true} as const, 'Character · cost 8 · inkable'],
    [{type: 'Action', cost: 3, inkwell: false} as const, 'Action · cost 3 · uninkable'],
  ])('%o reads "%s"', (card, text) => {
    expect(cardFacts(lorcanaCard({id: '1', name: 'Any', ...card}))).toBe(text);
  });
});
```

- [ ] **Step 6: Run it, and see it fail**

```bash
pnpm vitest run --project app src/ui/__tests__/cardFacts.test.ts
```

Expected: FAIL, with `Error: Failed to resolve import "../cardFacts" from "src/ui/__tests__/cardFacts.test.ts". Does the file exist?`, and `Tests  no tests`.

- [ ] **Step 7: Move `cardFacts` to `src/ui`**

Create `src/ui/cardFacts.ts`:

```ts
import type {LorcanaCard} from 'inkweave-synergy-engine';

/**
 * A card's type, cost and inkwell in one line: "Character · cost 3 · inkable".
 * Card analytics' header prints it (R3-6a), and so does Card studio's facts
 * list for a card it can only give a new image (R-61), so the two pages word a
 * card alike. Moved from analytics/cards/cardView.ts (R4-5f).
 */
export function cardFacts({type, cost, inkwell}: Pick<LorcanaCard, 'type' | 'cost' | 'inkwell'>): string {
  return `${type} · cost ${cost} · ${inkwell ? 'inkable' : 'uninkable'}`;
}
```

In `src/tools/analytics/cards/cardView.ts`, delete the first line, `import type {LorcanaCard} from 'inkweave-synergy-engine';` (nothing else in the module uses it), and delete the blank line and the function at the end (`:103-107`), so the file ends with `silentNote`'s closing `}`:

```ts

/** The header's facts line: "Character · cost 3 · inkable". */
export function cardFacts({type, cost, inkwell}: Pick<LorcanaCard, 'type' | 'cost' | 'inkwell'>): string {
  return `${type} · cost ${cost} · ${inkwell ? 'inkable' : 'uninkable'}`;
}
```

In `src/tools/analytics/cards/CardHeader.tsx`, replace `:6`:

```ts
import {cardFacts} from './cardView';
```

with:

```ts
import {cardFacts} from '../../../ui/cardFacts';
```

Run:

```bash
pnpm vitest run --project app src/ui/__tests__/cardFacts.test.ts src/tools/analytics/cards/__tests__/cardView.test.ts src/tools/analytics/cards/__tests__/CardAnalyticsView.test.tsx
```

Expected: PASS, 3 files and 57 tests (2, 18 and 37). `CardAnalyticsView.test.tsx` still finds "Character · cost 8 · inkable" in the header.

- [ ] **Step 8: Write `searchStatus`' failing test**

Create `src/tools/studio/__tests__/searchStatus.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {searchStatus, type SearchStatusState} from '../searchStatus';

const READY = {loading: false, failed: false};

describe('searchStatus', () => {
  it.each<[string, Omit<SearchStatusState, 'list'>, string]>([
    ['counts every card for a blank query, with its cap', {query: '', shown: 40, total: 1228}, '1,228 cards · showing the first 40'],
    ['counts the matches for a typed query', {query: 'elsa', shown: 7, total: 7}, '7 cards match'],
    ['says when the matches pass the cap', {query: 'a', shown: 40, total: 45}, '45 cards match · showing the first 40'],
    ['reads one match in the singular', {query: 'mei', shown: 1, total: 1}, '1 card matches'],
    ['reads one card in the singular', {query: ' ', shown: 1, total: 1}, '1 card'],
    ['names the trimmed query that finds nothing', {query: ' zzz ', shown: 0, total: 0}, 'No cards match "zzz".'],
    ['counts an empty card list as no cards, not as a miss', {query: '', shown: 0, total: 0}, '0 cards'],
  ])('%s', (_, search, expected) => {
    expect(searchStatus({...search, list: READY})).toBe(expected);
  });

  it('says the card list is loading, whatever the query', () => {
    expect(searchStatus({query: 'elsa', shown: 0, total: 0, list: {loading: true, failed: false}})).toBe('Loading cards…');
  });

  it("says nothing once the card list failed: the error is an alert of its own", () => {
    expect(searchStatus({query: '', shown: 0, total: 0, list: {loading: false, failed: true}})).toBe('');
  });
});
```

- [ ] **Step 9: Run it, and see it fail**

```bash
pnpm vitest run --project app src/tools/studio/__tests__/searchStatus.test.ts
```

Expected: FAIL, with `Error: Failed to resolve import "../searchStatus" from "src/tools/studio/__tests__/searchStatus.test.ts". Does the file exist?`, and `Tests  no tests`.

- [ ] **Step 10: Write `searchStatus.ts`**

Create `src/tools/studio/searchStatus.ts`:

```ts
import {fmtInt} from '../../ui/format';

/** What Edit card's search status line reads from (EditSearch). */
export interface SearchStatusState {
  /** The text in the search field. */
  query: string;
  /** The rows on screen: searchCards' rows.length, at most SEARCH_LIMIT. */
  shown: number;
  /** Every match: searchCards' total; for a blank query, every card. */
  total: number;
  /** The card list's state (useCardDataContext). */
  list: {loading: boolean; failed: boolean};
}

/** "1,228 cards", "1 card matches", "45 cards match". */
function countLine({query, total}: Pick<SearchStatusState, 'query' | 'total'>): string {
  const cards = `${fmtInt(total)} ${total === 1 ? 'card' : 'cards'}`;
  if (query.trim() === '') return cards;
  return `${cards} ${total === 1 ? 'matches' : 'match'}`;
}

/**
 * The search's polite status line (R4-5f), which EditSearch keeps mounted so
 * every change is announced, as R3's switcher announces "No cards match."
 * (R-30). It counts the cards, or the matches for a typed query, and says when
 * the list shows only the first SEARCH_LIMIT. While the card list loads it says
 * so; after it failed it says nothing, since the error is an alert of its own.
 */
export function searchStatus(state: SearchStatusState): string {
  if (state.list.failed) return '';
  if (state.list.loading) return 'Loading cards…';
  const query = state.query.trim();
  if (query !== '' && state.total === 0) return `No cards match "${query}".`;
  const count = countLine(state);
  return state.shown < state.total ? `${count} · showing the first ${fmtInt(state.shown)}` : count;
}
```

Run Step 9's command. Expected: PASS, 9 tests.

- [ ] **Step 11: Write the components' failing tests**

Create `src/tools/studio/__tests__/EditSearch.test.tsx`:

```tsx
import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {REVEAL_SET_CODE} from '../../../app-bridge';
import type {FocusHandoff} from '../../../shell/focusHandoff';
import {filterCards} from '../../image/filterCards';
import {EditSearch, type EditSearchProps} from '../components/EditSearch';
import type {SearchRow} from '../editSearch';
import {DUAL_INK_ENTRY, PREVIEW_ENTRY, RELEASED_CARD, cardOf, studioCard} from '../studioFixtures';

const MEI = cardOf(PREVIEW_ENTRY);
const PRIYA = cardOf(DUAL_INK_ENTRY);

/** As searchCards orders them: the branch file's cards first (R-76). Priya is only in the branch file (R-66). */
const ROWS: SearchRow[] = [
  {card: MEI, tag: 'Preview', deployed: true},
  {card: PRIYA, tag: 'Preview', deployed: false},
  {card: RELEASED_CARD, tag: 'Released', deployed: true},
];

function props(overrides: Partial<EditSearchProps> = {}): EditSearchProps {
  return {
    rows: ROWS,
    total: ROWS.length,
    query: '',
    onQuery: vi.fn(),
    list: {loading: false, error: null, onRetry: vi.fn()},
    file: {error: null, onRetry: vi.fn()},
    ...overrides,
  };
}

/** The rows are links, so the search renders in a router. */
function renderSearch(overrides: Partial<EditSearchProps> = {}) {
  const all = props(overrides);
  render(
    <MemoryRouter>
      <EditSearch {...all} />
    </MemoryRouter>,
  );
  return all;
}

function handoffOf(pending: boolean): FocusHandoff {
  return {pending, request: vi.fn(), done: vi.fn()};
}

const ELSA = studioCard({id: '5001', name: 'Elsa', version: 'Snow Queen'});
const ANNA = studioCard({id: '5002', name: 'Anna', version: 'Heir to Arendelle'});

/** EditSearch is controlled: the harness holds the query and filters the cards, as the page does through searchCards. */
function Harness() {
  const [query, setQuery] = useState('');
  const rows = filterCards([ELSA, ANNA], query).map((card): SearchRow => ({card, tag: 'Released', deployed: true}));
  return (
    <MemoryRouter>
      <EditSearch {...props({rows, total: rows.length, query, onQuery: setQuery})} />
    </MemoryRouter>
  );
}

describe('EditSearch', () => {
  describe('the rows', () => {
    it('links each row to its card in Edit card, tagged with where its data comes from', () => {
      renderSearch();
      const mei = screen.getByRole('link', {name: /^Mei /});
      expect(mei).toHaveAttribute('href', `/studio?mode=edit&card=${MEI.id}`);
      expect(within(mei).getByText('preview')).toHaveAttribute('title', 'Its data comes from previewCards.json');
      const released = screen.getByRole('link', {name: /^Lantern Keeper /});
      expect(released).toHaveAttribute('href', '/studio?mode=edit&card=1001');
      expect(within(released).getByText('released')).toBeInTheDocument();
    });

    it('names each row by its name, tags, version, inks and collector number', () => {
      renderSearch();
      expect(screen.getByRole('link', {name: `Mei preview Red Panda Ruby #${MEI.setNumber}`})).toBeInTheDocument();
      // Both inks of a dual-ink card, each named by its icon.
      const priya = screen.getByRole('link', {name: /^Priya /});
      expect(within(priya).getByRole('img', {name: 'Ruby'})).toBeInTheDocument();
      expect(within(priya).getByRole('img', {name: 'Sapphire'})).toBeInTheDocument();
    });

    it('marks a card only the branch file holds as not deployed yet (R-66)', () => {
      renderSearch();
      expect(within(screen.getByRole('link', {name: /^Priya /})).getByText('not deployed yet')).toBeInTheDocument();
      expect(screen.getAllByText('not deployed yet')).toHaveLength(1);
    });

    it('draws no tag for a card the branch file has yet to place (R-71)', () => {
      renderSearch({rows: [{card: MEI, tag: null, deployed: true}], total: 1});
      expect(screen.getByRole('link', {name: `Mei Red Panda Ruby #${MEI.setNumber}`})).toBeInTheDocument();
    });

    it('narrows the list as you search (ported from CardImagePicker)', async () => {
      render(<Harness />);
      await userEvent.type(screen.getByRole('searchbox', {name: 'Search cards'}), 'anna');
      expect(screen.queryByRole('link', {name: /^Elsa /})).not.toBeInTheDocument();
      expect(screen.getByRole('link', {name: /^Anna /})).toBeInTheDocument();
    });
  });

  describe('the status line', () => {
    it('stays mounted and counts the cards, then the matches, then names a query that finds none', async () => {
      render(<Harness />);
      const status = screen.getByRole('status');
      expect(status).toHaveTextContent('2 cards');
      const field = screen.getByRole('searchbox', {name: 'Search cards'});
      await userEvent.type(field, 'anna');
      expect(screen.getByRole('status')).toBe(status);
      expect(status).toHaveTextContent('1 card matches');
      await userEvent.type(field, 'zz');
      expect(status).toHaveTextContent('No cards match "annazz".');
      expect(screen.queryByRole('list', {name: 'Cards'})).not.toBeInTheDocument();
    });

    it('says how many it shows when the matches pass the cap', () => {
      renderSearch({total: 45});
      expect(screen.getByRole('status')).toHaveTextContent('45 cards · showing the first 3');
    });
  });

  describe('the card list', () => {
    it('says it is loading, with the field ready to type in and no rows until it lands', () => {
      // The page may already hold the branch file's entries (R-66); without the card list they'd all read "not deployed yet".
      renderSearch({list: {loading: true, error: null, onRetry: vi.fn()}});
      expect(screen.getByRole('status')).toHaveTextContent('Loading cards…');
      expect(screen.getByRole('searchbox', {name: 'Search cards'})).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('puts a failure, with Retry, in place of the field and the rows', async () => {
      const onRetry = vi.fn();
      renderSearch({list: {loading: false, error: new Error('HTTP 503'), onRetry}});
      expect(screen.getByRole('alert')).toHaveTextContent('Could not load the card list (HTTP 503)');
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
      await userEvent.click(screen.getByRole('button', {name: 'Retry'}));
      expect(onRetry).toHaveBeenCalledOnce();
    });
  });

  describe('previewCards.json (R-71)', () => {
    const REJECTED = 'GitHub 401 on GET contents/apps/web/public/data/previewCards.json';
    const FAILED = 'GitHub 500 on GET contents/apps/web/public/data/previewCards.json';

    it('shows a failed read beside the rows, which still open', () => {
      renderSearch({file: {error: FAILED, onRetry: vi.fn()}});
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(`Could not read previewCards.json: ${FAILED}.`);
      // True after a failed first read and a failed re-read alike: a re-read keeps the last read's cards (R4-4a).
      expect(alert).toHaveTextContent(`Cards outside set ${REVEAL_SET_CODE} still open for a new image.`);
      expect(screen.getByRole('searchbox', {name: 'Search cards'})).toBeInTheDocument();
      expect(screen.getAllByRole('link')).toHaveLength(ROWS.length);
    });

    it.each([
      {why: 'GitHub rejected the token (R-26)', error: REJECTED, offered: true, way: 'Forget token', calls: 'onForgetToken'},
      {why: 'the page offers no Forget token', error: REJECTED, offered: false, way: 'Read previewCards.json again', calls: 'onRetry'},
      {why: 'the read failed some other way', error: FAILED, offered: true, way: 'Read previewCards.json again', calls: 'onRetry'},
    ] as const)('offers one way out, $way, when $why', async ({error, offered, way, calls}) => {
      const file = {error, onRetry: vi.fn(), onForgetToken: offered ? vi.fn() : undefined};
      renderSearch({file});
      expect(screen.getAllByRole('button')).toHaveLength(1);
      await userEvent.click(screen.getByRole('button', {name: way}));
      expect(file[calls]).toHaveBeenCalledOnce();
    });
  });

  describe('focus (R-59)', () => {
    it('gives a pending handoff to the field: after "Load a different card", or once the card list is back', () => {
      const handoff = handoffOf(true);
      renderSearch({handoff});
      expect(screen.getByRole('searchbox', {name: 'Search cards'})).toHaveFocus();
      expect(handoff.done).toHaveBeenCalled();
    });

    it('gives it to Retry when the card list fails again', () => {
      const handoff = handoffOf(true);
      renderSearch({handoff, list: {loading: false, error: new Error('HTTP 503'), onRetry: vi.fn()}});
      expect(screen.getByRole('button', {name: 'Retry'})).toHaveFocus();
    });

    it('holds it while the card list loads, so Retry takes it if the list fails again', () => {
      const handoff = handoffOf(true);
      const search = (list: EditSearchProps['list']) => (
        <MemoryRouter>
          <EditSearch {...props({handoff, list})} />
        </MemoryRouter>
      );
      const {rerender} = render(search({loading: true, error: null, onRetry: vi.fn()}));
      expect(screen.getByRole('searchbox', {name: 'Search cards'})).not.toHaveFocus();
      expect(handoff.done).not.toHaveBeenCalled();
      rerender(search({loading: false, error: new Error('HTTP 503'), onRetry: vi.fn()}));
      expect(screen.getByRole('button', {name: 'Retry'})).toHaveFocus();
      expect(handoff.done).toHaveBeenCalledOnce();
    });

    it('takes nothing when no handoff is pending', () => {
      const handoff = handoffOf(false);
      renderSearch({handoff});
      expect(screen.getByRole('searchbox', {name: 'Search cards'})).not.toHaveFocus();
      expect(handoff.done).not.toHaveBeenCalled();
    });
  });

  it("shows the page's notice above the field", () => {
    renderSearch({notice: <p>No card has the id 99999.</p>});
    const notice = screen.getByText('No card has the id 99999.');
    const field = screen.getByRole('searchbox', {name: 'Search cards'});
    expect(notice.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
```

Notes on the test:
- **Rows by hand.** The rows are built by hand in `searchCards`' shape, with R4-4d's `deployed`. Priya stands for a card only the branch file holds (R-66).
- **The harness** filters through `filterCards`, as the page's `searchCards` does, and holds the query. So "narrows the list as you search" is `CardImagePicker.test.tsx:24-29`'s case, ported through the controlled field. The status test checks that the line is the same element before and after each keystroke.
- **Exact names.** The link names are exact for Mei: the rarity mark's titled wrapper is `aria-hidden`, so its title never reaches the link's name. Collector numbers come from the fixture, never a literal.
- **The handoff through a load.** "holds it while the card list loads" renders the loading list with a pending handoff, then the failed list. The field must not take it while the list loads (`done` uncalled), so Retry has it when the list fails again.

Create `src/tools/studio/__tests__/EditingBanner.test.tsx`:

```tsx
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import type {FocusHandoff} from '../../../shell/focusHandoff';
import {EditingBanner} from '../components/EditingBanner';
import {PREVIEW_ENTRY, RELEASED_CARD, cardOf, studioCard} from '../studioFixtures';

const MEI = cardOf(PREVIEW_ENTRY);

type BannerProps = Parameters<typeof EditingBanner>[0];

/** The banner's links are router Links. */
function renderBanner(overrides: Partial<BannerProps> = {}) {
  render(
    <MemoryRouter>
      <EditingBanner card={MEI} tag="Preview" deployed {...overrides} />
    </MemoryRouter>,
  );
}

function handoffOf(pending: boolean): FocusHandoff {
  return {pending, request: vi.fn(), done: vi.fn()};
}

describe('EditingBanner', () => {
  it('says which card is open in an h2, with its collector number and tag', () => {
    renderBanner();
    expect(screen.getByRole('heading', {level: 2, name: 'Editing Mei Red Panda'})).toBeInTheDocument();
    expect(screen.getByText(`#${MEI.setNumber}`).tagName).toBe('CODE');
    expect(screen.getByText('preview')).toBeInTheDocument();
  });

  it("links to the card's analytics and back to the search, as data links (adm-link)", () => {
    renderBanner();
    const analytics = screen.getByRole('link', {name: 'View card analytics'});
    expect(analytics).toHaveAttribute('href', `/cards/${MEI.id}`);
    expect(analytics).toHaveClass('adm-link');
    const back = screen.getByRole('link', {name: 'Load a different card'});
    expect(back).toHaveAttribute('href', '/studio?mode=edit');
    expect(back).toHaveClass('adm-link');
  });

  it('leaves out View card analytics for a card only the branch file holds, and marks it (R-33, R-66)', () => {
    renderBanner({deployed: false});
    expect(screen.queryByRole('link', {name: 'View card analytics'})).not.toBeInTheDocument();
    expect(screen.getByText('not deployed yet')).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'Load a different card'})).toBeInTheDocument();
  });

  it('tags a released card', () => {
    renderBanner({card: RELEASED_CARD, tag: 'Released'});
    expect(screen.getByRole('heading', {level: 2, name: 'Editing Lantern Keeper Night Watch'})).toBeInTheDocument();
    expect(screen.getByText('released')).toHaveAttribute('title', 'Its data comes from LorcanaJSON');
  });

  it('reads a card with no version or collector number', () => {
    renderBanner({card: studioCard({id: '2001', name: 'Magic Mirror'}), tag: 'Released'});
    expect(screen.getByRole('heading', {level: 2, name: 'Editing Magic Mirror'})).toBeInTheDocument();
    expect(screen.queryByText(/^#/)).not.toBeInTheDocument();
  });

  it('gives a pending focus handoff to its h2 (R-59)', () => {
    const handoff = handoffOf(true);
    renderBanner({handoff});
    expect(screen.getByRole('heading', {level: 2, name: 'Editing Mei Red Panda'})).toHaveFocus();
    expect(handoff.done).toHaveBeenCalled();
  });
});
```

Create `src/tools/studio/__tests__/ReleasedCardFacts.test.tsx`:

```tsx
import {describe, expect, it} from 'vitest';
import {render, screen, within} from '@testing-library/react';
import {IMAGE_ONLY_NOTES} from '../cardEdit';
import {ReleasedCardFacts} from '../components/ReleasedCardFacts';
import {RELEASED_CARD, studioCard} from '../studioFixtures';

/** Each term with its value, as the list reads them. */
function facts() {
  const region = within(screen.getByRole('region', {name: 'Card data'}));
  const terms = region.getAllByRole('term').map((term) => term.textContent);
  const values = region.getAllByRole('definition').map((value) => value.textContent);
  return Object.fromEntries(terms.map((term, index) => [term, values[index]]));
}

describe('ReleasedCardFacts', () => {
  it("lists a released card's facts, worded as Card analytics words them, then why only its image can change (R-61)", () => {
    render(<ReleasedCardFacts card={RELEASED_CARD} note={IMAGE_ONLY_NOTES.released} />);
    expect(facts()).toEqual({
      Name: 'Lantern Keeper',
      Version: 'Night Watch',
      Set: '9',
      'Collector number': '#12',
      Ink: 'Amber',
      Type: 'Character · cost 3 · inkable',
      Rarity: 'Common',
    });
    expect(screen.getByText('Card data comes from LorcanaJSON; only the image can be replaced here.')).toBeInTheDocument();
  });

  it('names both inks of a dual-ink card, and draws the base rarity with its glyph', () => {
    const card = studioCard({id: '1500', name: 'Priya', ink: 'Ruby', ink2: 'Sapphire', rarity: 'Super Rare'});
    render(<ReleasedCardFacts card={card} note={IMAGE_ONLY_NOTES.released} />);
    expect(facts().Ink).toBe('Ruby Sapphire');
    // rarityConfigOf's name for "Super Rare", beside RaritySymbol's glyph (aria-hidden, so no role).
    expect(screen.getByText('Super rare').querySelector('img')).not.toBeNull();
  });

  it('reads — for what a card lacks, and gives the note it is passed (R-65)', () => {
    const card = studioCard({id: '14901', name: 'Tyler', setCode: '14', inkwell: false, type: 'Action'});
    render(<ReleasedCardFacts card={card} note={IMAGE_ONLY_NOTES.unnumbered} />);
    expect(facts()).toMatchObject({Version: '—', 'Collector number': '—', Type: 'Action · cost 3 · uninkable', Rarity: '—'});
    expect(screen.getByText(IMAGE_ONLY_NOTES.unnumbered)).toBeInTheDocument();
  });

  it('is read only: no control in it', () => {
    render(<ReleasedCardFacts card={RELEASED_CARD} note={IMAGE_ONLY_NOTES.released} />);
    const region = within(screen.getByRole('region', {name: 'Card data'}));
    expect(region.queryAllByRole('textbox')).toHaveLength(0);
    expect(region.queryAllByRole('button')).toHaveLength(0);
  });
});
```

Run:

```bash
pnpm vitest run --project app src/tools/studio/__tests__/EditSearch.test.tsx src/tools/studio/__tests__/EditingBanner.test.tsx src/tools/studio/__tests__/ReleasedCardFacts.test.tsx
```

Expected: FAIL, with three resolve errors, one per file, and `Test Files  3 failed (3)`, `Tests  no tests`:
- `Error: Failed to resolve import "../components/EditSearch" from "src/tools/studio/__tests__/EditSearch.test.tsx". Does the file exist?`
- `Error: Failed to resolve import "../components/EditingBanner" from "src/tools/studio/__tests__/EditingBanner.test.tsx". Does the file exist?`
- `Error: Failed to resolve import "../components/ReleasedCardFacts" from "src/tools/studio/__tests__/ReleasedCardFacts.test.tsx". Does the file exist?`

- [ ] **Step 12: Write `CardMarks.tsx`**

Create `src/tools/studio/components/CardMarks.tsx`:

```tsx
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {InkIcon, RaritySymbol, SPACING, rarityConfigOf} from '../../../app-bridge';
import {Tag} from '../../../ui/Tag';
import type {CardTag} from '../editSearch';

/** The ink and rarity glyphs' box, in px: the handoff's search rows draw them at 20 to 22. */
export const MARK_SIZE = 20;

const MARKS: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: SPACING.xs};

/** Each tag's chip: lowercase, as admin's other tags read ("raw", "low n"), and where the card's data comes from. */
const TAGS: Readonly<Record<CardTag, {text: string; title: string}>> = {
  Preview: {text: 'preview', title: 'Its data comes from previewCards.json'},
  Released: {text: 'released', title: 'Its data comes from LorcanaJSON'},
};

/**
 * A card's tags, in Edit card's search rows and its Editing banner: Preview or
 * Released (cardTag), none while the branch file is unread (R-71), and "not
 * deployed yet" for a card only the branch file holds (R-66).
 */
export function CardTags({tag, deployed}: {tag: CardTag | null; deployed: boolean}) {
  return (
    <>
      {tag && <Tag title={TAGS[tag].title}>{TAGS[tag].text}</Tag>}
      {!deployed && <Tag title="In previewCards.json, not on inkweave.ink yet">not deployed yet</Tag>}
    </>
  );
}

/** The card's ink icons, both for a dual-ink card, each named for a screen reader (its alt), as R3's header names them. */
export function CardInks({card}: {card: Pick<LorcanaCard, 'ink' | 'ink2'>}) {
  return (
    <span style={MARKS}>
      <InkIcon ink={card.ink} size={MARK_SIZE} decorative={false} />
      {card.ink2 && <InkIcon ink={card.ink2} size={MARK_SIZE} decorative={false} />}
    </span>
  );
}

/**
 * The card's rarity glyph, titled with its name for a pointer, or nothing for
 * a card with none. rarityConfigOf knows the five base rarities, as R3's header
 * does (R-49): Enchanted, Epic and Iconic are printings, not cards (R-74).
 * Hidden from screen readers, title and all, so a search row's link name stays
 * "name, tags, version, inks, number" in every browser.
 */
export function RarityMark({rarity}: {rarity: string | undefined}) {
  const config = rarityConfigOf(rarity);
  if (!config) return null;
  return (
    <span title={config.name} aria-hidden style={MARKS}>
      <RaritySymbol rarity={config.key} size={MARK_SIZE} />
    </span>
  );
}
```

`MARK_SIZE` is a constant export, which `react-refresh/only-export-components` allows (`allowConstantExport`). `EditSearch` sizes its marks column from it.

- [ ] **Step 13: Write `EditSearch.tsx`**

Create `src/tools/studio/components/EditSearch.tsx`:

```tsx
import {useId, useRef} from 'react';
import {Link} from 'react-router-dom';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {CtaButton, FONTS, REVEAL_SET_CODE, SPACING, TRUNCATE, smallImageUrl} from '../../../app-bridge';
import {ForgetTokenOffer} from '../../../github/ForgetTokenOffer';
import {isRejectedToken} from '../../../github/rejectedToken';
import {useTakeHandoff, type FocusHandoff} from '../../../shell/focusHandoff';
import {studioHref} from '../../../shell/nav';
import {PAGE_GUTTER} from '../../../shell/PageLayout';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {Notice} from '../../../ui/Notice';
import type {SearchRow} from '../editSearch';
import {searchStatus} from '../searchStatus';
import {CardInks, CardTags, MARK_SIZE, RarityMark} from './CardMarks';

/** The search screen's column, the handoff's 720px (README §7). */
const COLUMN_WIDTH = 720;
/** A row's thumbnail, the handoff's 34 × 48: a card's own proportions. */
const THUMB_WIDTH = 34;
const THUMB_HEIGHT = 48;
/** Room for two inks and a rarity, so every row's marks line up. */
const MARKS_WIDTH = 3 * MARK_SIZE + 2 * SPACING.xs;
/** Room for "#204". */
const NUMBER_WIDTH = 44;

// The page body's padding (PageLayout's BODY), round the handoff's centred column.
const SCREEN: React.CSSProperties = {padding: `${SPACING.xxl}px ${PAGE_GUTTER}`};
const COLUMN: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.lg,
  width: '100%',
  maxWidth: COLUMN_WIDTH,
  margin: '0 auto',
};
const STACK: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.sm};
const TITLE: React.CSSProperties = {
  margin: 0,
  fontFamily: FONTS.hero,
  fontSize: ADMIN_TYPE.sectionTitle,
  fontWeight: 400,
  color: ADMIN_COLORS.text,
};
const HINT: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.body, color: ADMIN_COLORS.muted};
const FIELD: React.CSSProperties = {width: '100%'};
const STATUS: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};
const LIST: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  border: `1px solid ${ADMIN_COLORS.border}`,
  borderRadius: ADMIN_RADIUS.panel,
  overflow: 'hidden',
};
const RULED: React.CSSProperties = {borderTop: `1px solid ${ADMIN_COLORS.divider}`};
// The link fills its row. adm-row-btn gives it the hover fill and the inset
// ring, which the list's clipped corners keep whole.
const ROW: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `${THUMB_WIDTH}px minmax(0, 1fr) ${MARKS_WIDTH}px ${NUMBER_WIDTH}px`,
  alignItems: 'center',
  gap: SPACING.md,
  padding: `${SPACING.sm}px ${SPACING.md}px`,
  textDecoration: 'none',
};
// The empty box shows until the art loads, and stays for a card with none.
const THUMB: React.CSSProperties = {
  display: 'block',
  width: THUMB_WIDTH,
  height: THUMB_HEIGHT,
  overflow: 'hidden',
  borderRadius: ADMIN_RADIUS.tag,
  backgroundColor: ADMIN_COLORS.card,
};
const THUMB_IMAGE: React.CSSProperties = {display: 'block', width: '100%', height: '100%', objectFit: 'cover'};
const NAMES: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.xxs, minWidth: 0};
// The tags wrap under a long name rather than run into the marks at phone width.
const NAME_LINE: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: SPACING.sm,
  minWidth: 0,
};
const NAME: React.CSSProperties = {...TRUNCATE, fontSize: ADMIN_TYPE.emphasis};
const VERSION: React.CSSProperties = {...TRUNCATE, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};
const MARKS: React.CSSProperties = {display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: SPACING.xs};
// Muted, never dim: the number tells two cards of one name apart (R-6).
const NUMBER: React.CSSProperties = {textAlign: 'right', fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

/** The card list (useCardDataContext): every row comes from it, so its failure takes the field's place. */
export interface EditSearchList {
  loading: boolean;
  error: Error | null;
  /** The card list's retryLoad. */
  onRetry: () => void;
}

/** previewCards.json, read from the target branch (R4-4a). It only tags the rows, so its failure leaves them open (R-71). */
export interface EditSearchFile {
  error: string | null;
  /** Reads the file again. */
  onRetry: () => void;
  /**
   * Forgets the saved token: offered in place of reading again when GitHub
   * rejected it (R-26). The page asks first while a draft is dirty (R-84).
   */
  onForgetToken?: () => void;
}

export interface EditSearchProps {
  /** searchCards' rows: the first SEARCH_LIMIT matches, the branch file's cards first (R-76). */
  rows: readonly SearchRow[];
  /** Every match (searchCards' total). */
  total: number;
  /** The text in the field. The page holds it, so it survives opening a card and coming back. */
  query: string;
  onQuery: (query: string) => void;
  list: EditSearchList;
  file: EditSearchFile;
  /** A line above the field: the page's message for an id the card list doesn't hold (R4-6b). */
  notice?: React.ReactNode;
  /**
   * The page's (R-59): the field takes it once "Load a different card", or the
   * card list's Retry, has unmounted the control pressed, and the card list is
   * in. Retry takes it when the card list fails again.
   */
  handoff?: FocusHandoff;
}

/** The screen's h2, and what the search covers. */
function SearchTitle({id}: {id: string}) {
  return (
    <div style={STACK}>
      <h2 id={id} style={TITLE}>
        Find a card to edit
      </h2>
      <p style={HINT}>
        Every Core card, by name, version or id, with the branch’s preview cards first. A preview card opens in
        the form with its current data; any other card opens for a new image.
      </p>
    </div>
  );
}

type SearchFieldProps = Pick<EditSearchProps, 'query' | 'onQuery' | 'handoff'> & {
  /** The card list is in: until then a pending handoff waits, so Retry can take it if the list fails again. */
  ready: boolean;
};

/**
 * The search field. Its wrapper takes a pending handoff, since useTakeHandoff
 * looks inside a container, but only once the card list is in, as R3's card
 * page waits out its load: Retry's request then lands here, or on Retry again.
 */
function SearchField({query, onQuery, handoff, ready}: SearchFieldProps) {
  const ref = useRef<HTMLDivElement>(null);
  useTakeHandoff(handoff, ref, 'input', ready);
  return (
    <div ref={ref}>
      <input
        type="search"
        className="adm-input"
        aria-label="Search cards"
        placeholder="e.g. Maui or Hero to All"
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        style={FIELD}
      />
    </div>
  );
}

/**
 * The card list failed (R3's FailedCardList), and every row comes from it.
 * Retry swaps this for the field, taking its own button with it, so the page
 * asks for a handoff, which waits out the load: the field takes it once the
 * list is in, and Retry takes it if the list fails again.
 */
function FailedCardList({error, onRetry, handoff}: {error: Error; onRetry: () => void; handoff?: FocusHandoff}) {
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

/**
 * previewCards.json couldn't be read (R-71): the error and its way out, beside
 * the rows rather than in their place. Forget token when GitHub rejected the
 * token and the page offers it (R-26), else reading the file again, as the
 * tuning aside's read error does.
 */
function FileReadError({error, file}: {error: string; file: EditSearchFile}) {
  const {onForgetToken} = file;
  return (
    <div style={STACK}>
      <Notice tone="error">
        Could not read previewCards.json: {error}. Cards outside set {REVEAL_SET_CODE} still open for a new image.
      </Notice>
      {onForgetToken && isRejectedToken(error) ? (
        <ForgetTokenOffer onForget={onForgetToken} />
      ) : (
        <CtaButton type="button" variant="neutral" onClick={file.onRetry} style={{alignSelf: 'flex-start'}}>
          Read previewCards.json again
        </CtaButton>
      )}
    </div>
  );
}

/** A row's art, or its empty box. Decoration: the row's text names the card. */
function Thumb({card}: {card: LorcanaCard}) {
  const src = smallImageUrl(card);
  return (
    <span style={THUMB}>
      {src && <img src={src} alt="" width={THUMB_WIDTH} height={THUMB_HEIGHT} loading="lazy" style={THUMB_IMAGE} />}
    </span>
  );
}

/**
 * One match: a link that opens the card in Edit card, drawn as the handoff
 * draws it (README §7): the thumbnail, name and version, inks, rarity and
 * collector number, plus the card's tags. The spaces are text nodes of their
 * own, so the link's name reads "Mei preview Red Panda Ruby #31": a grid or a
 * flex row draws none of them.
 */
function ResultRow({row, ruled}: {row: SearchRow; ruled: boolean}) {
  const {card} = row;
  return (
    <li style={ruled ? RULED : undefined}>
      <Link to={studioHref('edit', card.id)} className="adm-row-btn" style={ROW}>
        <Thumb card={card} />{' '}
        <span style={NAMES}>
          <span style={NAME_LINE}>
            <span style={NAME}>{card.name}</span> <CardTags tag={row.tag} deployed={row.deployed} />
          </span>{' '}
          <span style={VERSION}>{card.version}</span>
        </span>{' '}
        <span style={MARKS}>
          <CardInks card={card} />
          <RarityMark rarity={card.rarity} />
        </span>{' '}
        <code style={NUMBER}>{card.setNumber == null ? '' : `#${card.setNumber}`}</code>
      </Link>
    </li>
  );
}

/** The matches, or nothing for none: the status line says so. */
function ResultList({rows}: {rows: readonly SearchRow[]}) {
  if (rows.length === 0) return null;
  return (
    <ul aria-label="Cards" style={LIST}>
      {rows.map((row) => (
        <ResultRow key={row.card.id} row={row} ruled={row !== rows[0]} />
      ))}
    </ul>
  );
}

/**
 * Edit card's search screen (R4-5f): a search over the card list, each match a
 * link to the card (studioHref), and an always-mounted polite status line that
 * counts the matches. The page runs searchCards and holds the query. The rows
 * wait for the card list, and its failure takes the field's place, since every
 * row comes from it; previewCards.json's failure shows beside the rows, which
 * still open (R-71).
 */
export function EditSearch({rows, total, query, onQuery, list, file, notice, handoff}: EditSearchProps) {
  const titleId = useId();
  const failed = list.error !== null;
  const status = searchStatus({query, shown: rows.length, total, list: {loading: list.loading, failed}});
  // Rows only once the card list is in: while it loads, a card the branch file
  // also holds would read "not deployed yet" (R-66).
  const listed = !list.loading && !failed;
  return (
    <div style={SCREEN}>
      <section aria-labelledby={titleId} style={COLUMN}>
        <SearchTitle id={titleId} />
        {notice}
        {list.error ? (
          <FailedCardList error={list.error} onRetry={list.onRetry} handoff={handoff} />
        ) : (
          <SearchField query={query} onQuery={onQuery} handoff={handoff} ready={!list.loading} />
        )}
        {file.error !== null && <FileReadError error={file.error} file={file} />}
        {/* Mounted with the screen, so each new count is announced. */}
        <p role="status" style={STATUS}>
          {status}
        </p>
        {listed && <ResultList rows={rows} />}
      </section>
    </div>
  );
}
```

Notes:
- **Styles.** Every colour, size and radius is an admin token. The widths (720, 34 × 48, 44) are the handoff's layout numbers, which have no token, as `CardHeader.tsx:9-11` keeps its own. States come from `adm-input`, `adm-row-btn` and `CtaButton`, with no `<button style>` and no new class.
- **The type of `rows`.** `readonly SearchRow[]` accepts `searchCards`' mutable array as it is.

- [ ] **Step 14: Write `EditingBanner.tsx`**

Create `src/tools/studio/components/EditingBanner.tsx`:

```tsx
import {useRef} from 'react';
import {Link} from 'react-router-dom';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {LETTER_SPACING, SPACING} from '../../../app-bridge';
import {useTakeHandoff, type FocusHandoff} from '../../../shell/focusHandoff';
import {cardsHref, studioHref} from '../../../shell/nav';
import {PAGE_GUTTER} from '../../../shell/PageLayout';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import type {CardTag} from '../editSearch';
import {CardTags} from './CardMarks';

// A strip across the page under its header, in the panels' fill (README §7),
// its text in line with the page title's.
const BANNER: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: `${SPACING.sm}px ${SPACING.xl}px`,
  padding: `${SPACING.md}px ${PAGE_GUTTER}`,
  backgroundColor: ADMIN_COLORS.panel,
  borderBottom: `1px solid ${ADMIN_COLORS.border}`,
};
const IDENTITY: React.CSSProperties = {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.md, minWidth: 0};
const TITLE: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.body, fontWeight: 600, color: ADMIN_COLORS.text};
const EYEBROW: React.CSSProperties = {
  marginRight: SPACING.sm,
  fontSize: ADMIN_TYPE.label,
  fontWeight: 700,
  letterSpacing: LETTER_SPACING.eyebrow,
  textTransform: 'uppercase',
  color: ADMIN_COLORS.accent,
};
const VERSION: React.CSSProperties = {fontWeight: 400, color: ADMIN_COLORS.muted};
const NUMBER: React.CSSProperties = {fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};
const LINKS: React.CSSProperties = {display: 'flex', flexWrap: 'wrap', gap: SPACING.lg, fontSize: ADMIN_TYPE.small};

interface EditingBannerProps {
  card: LorcanaCard;
  /** cardTag's: whose data the card shows. */
  tag: CardTag;
  /** False for a card only the branch file holds (R-66): it has no Card analytics page yet (R-33). */
  deployed: boolean;
  /** The page's (R-59): it asks when the URL names a new card, and this h2 takes it. */
  handoff?: FocusHandoff;
}

/**
 * The strip over an open card in Edit card (README §7): "Editing", the card's
 * name and version in the h2 the focus handoff lands on, its collector number
 * and tags, then the links out. "View card analytics" shows only for a card the
 * card list holds (R-33), and "Load a different card" goes back to the search.
 * Both are router Links, so the page moves focus from the URL, never on a click
 * (R-59).
 */
export function EditingBanner({card, tag, deployed, handoff}: EditingBannerProps) {
  const ref = useRef<HTMLDivElement>(null);
  useTakeHandoff(handoff, ref, 'h2');
  return (
    <div ref={ref} style={BANNER}>
      <div style={IDENTITY}>
        <h2 tabIndex={-1} style={TITLE}>
          {/* Each space is a text node of its own, so the h2's name reads "Editing Mei Red Panda". */}
          <span style={EYEBROW}>Editing</span> {card.name}
          {card.version && (
            <>
              {' '}
              <span style={VERSION}>{card.version}</span>
            </>
          )}
        </h2>
        {card.setNumber != null && <code style={NUMBER}>#{card.setNumber}</code>}
        <CardTags tag={tag} deployed={deployed} />
      </div>
      <div style={LINKS}>
        {deployed && (
          <Link to={cardsHref(card.id)} className="adm-link">
            View card analytics
          </Link>
        )}
        <Link to={studioHref('edit')} className="adm-link">
          Load a different card
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 15: Write `ReleasedCardFacts.tsx`**

Create `src/tools/studio/components/ReleasedCardFacts.tsx`:

```tsx
import type {Ink, LorcanaCard} from 'inkweave-synergy-engine';
import {InkIcon, RaritySymbol, SPACING, rarityConfigOf} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {cardFacts} from '../../../ui/cardFacts';
import {Panel} from '../../../ui/Panel';

/** A glyph beside its name. */
const ICON_SIZE = 18;
/** What a missing value reads, as the change list prints one (changeRows). */
const MISSING = '—';

const FACTS: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'max-content minmax(0, 1fr)',
  gap: `${SPACING.sm}px ${SPACING.xl}px`,
  margin: 0,
  fontSize: ADMIN_TYPE.body,
};
const TERM: React.CSSProperties = {color: ADMIN_COLORS.muted};
const DETAIL: React.CSSProperties = {margin: 0, color: ADMIN_COLORS.text};
const MARKS: React.CSSProperties = {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: SPACING.md};
const MARK: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: SPACING.xs};
const NOTE: React.CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

interface ReleasedCardFactsProps {
  card: LorcanaCard;
  /** Why the card opens image-only: IMAGE_ONLY_NOTES' line for its reason (R-61, R-65). */
  note: string;
}

/** A term and its value: the list's two columns. */
function Fact({term, children}: {term: string; children: React.ReactNode}) {
  return (
    <>
      <dt style={TERM}>{term}</dt>
      <dd style={DETAIL}>{children}</dd>
    </>
  );
}

/** One ink: its icon, and its name in words beside it. */
function InkName({ink}: {ink: Ink}) {
  return (
    <span style={MARK}>
      <InkIcon ink={ink} size={ICON_SIZE} />
      {ink}
    </span>
  );
}

/** The card's ink, or both for a dual-ink card, read "Ruby Sapphire": a flex row draws no space of its own. */
function InkNames({card}: {card: LorcanaCard}) {
  return (
    <span style={MARKS}>
      <InkName ink={card.ink} />
      {card.ink2 && (
        <>
          {' '}
          <InkName ink={card.ink2} />
        </>
      )}
    </span>
  );
}

/** The base rarity's glyph and name, as R3's header shows it (R-49), or — for a card with none. */
function RarityName({rarity}: {rarity: string | undefined}) {
  const config = rarityConfigOf(rarity);
  if (!config) return MISSING;
  return (
    <span style={MARK}>
      <RaritySymbol rarity={config.key} size={ICON_SIZE} />
      {config.name}
    </span>
  );
}

/**
 * What Edit card shows in place of the form for a card it can only give a new
 * image (R-61): a short read-only list of the card's facts, worded as Card
 * analytics words them (cardFacts), then why its fields can't change here. A
 * read-only list, not a disabled form: disabled controls would fail R-6's
 * contrast, and would suggest the card can be edited.
 */
export function ReleasedCardFacts({card, note}: ReleasedCardFactsProps) {
  return (
    <Panel title="Card data" action="read only">
      <dl style={FACTS}>
        <Fact term="Name">{card.name}</Fact>
        <Fact term="Version">{card.version ?? MISSING}</Fact>
        <Fact term="Set">{card.setCode ?? MISSING}</Fact>
        <Fact term="Collector number">{card.setNumber == null ? MISSING : `#${card.setNumber}`}</Fact>
        <Fact term="Ink">
          <InkNames card={card} />
        </Fact>
        <Fact term="Type">{cardFacts(card)}</Fact>
        <Fact term="Rarity">
          <RarityName rarity={card.rarity} />
        </Fact>
      </dl>
      <p style={NOTE}>{note}</p>
    </Panel>
  );
}
```

Notes:
- **`Fact`** returns a fragment, so each `dt` and `dd` is a direct child of the `dl`'s two-column grid.
- **`RarityName`** returns "—" as a string, which a React 19 component may return.

Run Step 11's command. Expected: PASS, 3 files and 28 tests (18, 6 and 4).

- [ ] **Step 16: Add the stories**

Create `src/tools/studio/components/EditEntry.stories.tsx`:

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {MemoryRouter} from 'react-router-dom';
import {userEvent, within} from 'storybook/test';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {REVEAL_SET_CODE, SPACING} from '../../../app-bridge';
import {PageLayout} from '../../../shell/PageLayout';
import {filterCards} from '../../image/filterCards';
import {IMAGE_ONLY_NOTES} from '../cardEdit';
import type {SearchRow} from '../editSearch';
import {
  CURLY_APOSTROPHE_CARD,
  DUAL_INK_ENTRY,
  JA_SCAN_ENTRY,
  PREVIEW_ENTRY,
  RELEASED_CARD,
  UNNUMBERED_ENTRY,
  VARIANTS_ENTRY,
  cardOf,
} from '../studioFixtures';
import {EditingBanner} from './EditingBanner';
import {EditSearch, type EditSearchFile, type EditSearchList} from './EditSearch';
import {ReleasedCardFacts} from './ReleasedCardFacts';

const MEI = cardOf(PREVIEW_ENTRY);
/** Only the branch file holds Priya (R-66). */
const PRIYA = cardOf(DUAL_INK_ENTRY);
const CARDS: LorcanaCard[] = [
  MEI,
  PRIYA,
  cardOf(VARIANTS_ENTRY),
  cardOf(JA_SCAN_ENTRY),
  CURLY_APOSTROPHE_CARD,
  RELEASED_CARD,
];

const READY: EditSearchList = {loading: false, error: null, onRetry: () => {}};
const READ: EditSearchFile = {error: null, onRetry: () => {}};

/** As cardTag tags them: the reveal set's cards wait for the file (R-71), and every other card is Released. */
function rowOf({card, fileRead}: {card: LorcanaCard; fileRead: boolean}): SearchRow {
  if (card.setCode !== REVEAL_SET_CODE) return {card, tag: 'Released', deployed: true};
  return {card, tag: fileRead ? 'Preview' : null, deployed: card !== PRIYA};
}

/**
 * The search as the page runs it: it holds the query, and filters the cards on
 * each key (the page runs searchCards). Type to narrow it; "pan's" finds the
 * name printed with ’.
 */
function LiveSearch({list = READY, file = READ}: {list?: EditSearchList; file?: EditSearchFile}) {
  const [query, setQuery] = useState('');
  const rows = filterCards(CARDS, query).map((card) => rowOf({card, fileRead: file.error === null}));
  return <EditSearch rows={rows} total={rows.length} query={query} onQuery={setQuery} list={list} file={file} />;
}

/**
 * Card studio's page in Edit card, as R4-6b lays it out: the page's header,
 * then its flush body. A MemoryRouter, since the rows and the banner's links
 * navigate; nothing here calls useBlocker.
 */
function StudioFrame({children}: {children: React.ReactNode}) {
  return (
    <MemoryRouter initialEntries={['/studio?mode=edit']}>
      {/* As in the shell's main column: the layout fills the height, and only its body scrolls. */}
      <div style={{height: '100vh'}}>
        <PageLayout title="Card studio" writes flush>
          {children}
        </PageLayout>
      </div>
    </MemoryRouter>
  );
}

/** Where the form would sit, for the facts list in place of it. */
const FORM_SLOT: React.CSSProperties = {maxWidth: 640, padding: SPACING.lg};

const meta: Meta = {title: 'Admin/Publish/Card studio/Edit entry'};
export default meta;
type Story = StoryObj;

/** The search screen: the branch file's cards first (R-76), each tagged, and Priya only in the branch file (R-66). */
export const Search: Story = {
  render: () => (
    <StudioFrame>
      <LiveSearch />
    </StudioFrame>
  ),
};

/** Text that finds no card: the status line names it, and the list goes. */
export const NoMatch: Story = {
  render: Search.render,
  play: async ({canvasElement}) => {
    await userEvent.type(within(canvasElement).getByRole('searchbox', {name: 'Search cards'}), 'zzz');
  },
};

/** The card list still loading: the field is ready, and the status says so. */
export const CardListLoading: Story = {
  render: () => (
    <StudioFrame>
      <LiveSearch list={{...READY, loading: true}} />
    </StudioFrame>
  ),
};

/** The card list failed: every row comes from it, so its error and Retry take the field's place. */
export const CardListFailed: Story = {
  render: () => (
    <StudioFrame>
      <LiveSearch list={{...READY, error: new Error('HTTP 503')}} />
    </StudioFrame>
  ),
};

/** previewCards.json failed: its error sits beside the rows, which still open, and set 14's wait untagged (R-71). */
export const FileReadFailed: Story = {
  render: () => (
    <StudioFrame>
      <LiveSearch file={{...READ, error: 'GitHub 500 on GET contents/apps/web/public/data/previewCards.json'}} />
    </StudioFrame>
  ),
};

/** GitHub rejected the token on the file's read: Forget token in place of reading again (R-26). */
export const TokenRejected: Story = {
  render: () => (
    <StudioFrame>
      <LiveSearch
        file={{
          error: 'GitHub 401 on GET contents/apps/web/public/data/previewCards.json',
          onRetry: () => {},
          onForgetToken: () => {},
        }}
      />
    </StudioFrame>
  ),
};

/** A preview card open: the banner over the form (R4-5b draws the form). */
export const EditingAPreviewCard: Story = {
  render: () => (
    <StudioFrame>
      <EditingBanner card={MEI} tag="Preview" deployed />
    </StudioFrame>
  ),
};

/** A card only the branch file holds: marked, and with no Card analytics link yet (R-33, R-66). */
export const NotDeployedYet: Story = {
  render: () => (
    <StudioFrame>
      <EditingBanner card={PRIYA} tag="Preview" deployed={false} />
    </StudioFrame>
  ),
};

/** A released card: the banner, then its facts in the form's place, and why only its image can change (R-61). */
export const ReleasedCard: Story = {
  render: () => (
    <StudioFrame>
      <EditingBanner card={RELEASED_CARD} tag="Released" deployed />
      <div style={FORM_SLOT}>
        <ReleasedCardFacts card={RELEASED_CARD} note={IMAGE_ONLY_NOTES.released} />
      </div>
    </StudioFrame>
  ),
};

/** A preview entry with no collector number yet opens image-only too, with its own reason (R-65). */
export const UnnumberedPreviewCard: Story = {
  render: () => {
    const card = cardOf(UNNUMBERED_ENTRY);
    return (
      <StudioFrame>
        <EditingBanner card={card} tag="Preview" deployed />
        <div style={FORM_SLOT}>
          <ReleasedCardFacts card={card} note={IMAGE_ONLY_NOTES.unnumbered} />
        </div>
      </StudioFrame>
    );
  },
};
```

In `src/ui/Primitives.stories.tsx`:
- add `import {Tag} from './Tag';` after the `SplitMeter` import (`:16`);
- replace the Tags story and its doc comment (`:223-237`) with:

```tsx
/**
 * The informative tags, all one chip (Tag): "low n" beside a name with few
 * score votes, "raw" beside a number from the vote log, and Card studio's
 * tags beside a card's name (R4-5f).
 */
export const Tags: Story = {
  render: () => (
    <Stack>
      <div style={TAG_ROW}>
        <span>Location Boost</span>
        <LowNTag minVotes={10} />
      </div>
      <div style={TAG_ROW}>
        <span>Distinct voters</span>
        <RawTag />
      </div>
      <div style={TAG_ROW}>
        <span>Mei</span>
        <Tag title="Its data comes from previewCards.json">preview</Tag>
        <Tag title="In previewCards.json, not on inkweave.ink yet">not deployed yet</Tag>
      </div>
    </Stack>
  ),
};
```

The stories are typechecked in Step 17. They render under a `MemoryRouter` and call no `useBlocker`, so Storybook needs no data router. R4-8 looks at them in Storybook.

- [ ] **Step 17: Run the gates**

```bash
pnpm vitest run --project app src/ui/__tests__/Tag.test.tsx src/ui/__tests__/RawTag.test.tsx src/ui/__tests__/LowNTag.test.tsx src/ui/__tests__/cardFacts.test.ts src/tools/analytics/cards/__tests__/cardView.test.ts src/tools/analytics/cards/__tests__/CardAnalyticsView.test.tsx src/tools/studio/__tests__/searchStatus.test.ts src/tools/studio/__tests__/EditSearch.test.tsx src/tools/studio/__tests__/EditingBanner.test.tsx src/tools/studio/__tests__/ReleasedCardFacts.test.tsx
pnpm exec eslint --max-warnings 0 src/ui/Tag.tsx src/ui/RawTag.tsx src/ui/LowNTag.tsx src/ui/cardFacts.ts src/ui/__tests__/Tag.test.tsx src/ui/__tests__/cardFacts.test.ts src/ui/Primitives.stories.tsx src/tools/analytics/cards/cardView.ts src/tools/analytics/cards/__tests__/cardView.test.ts src/tools/analytics/cards/CardHeader.tsx src/tools/studio/searchStatus.ts src/tools/studio/__tests__/searchStatus.test.ts src/tools/studio/components/CardMarks.tsx src/tools/studio/components/EditSearch.tsx src/tools/studio/components/EditingBanner.tsx src/tools/studio/components/ReleasedCardFacts.tsx src/tools/studio/components/EditEntry.stories.tsx src/tools/studio/__tests__/EditSearch.test.tsx src/tools/studio/__tests__/EditingBanner.test.tsx src/tools/studio/__tests__/ReleasedCardFacts.test.tsx
pnpm typecheck
```

Expected:
- **The tests:** 10 files and 98 tests pass: Tag 2, RawTag 1, LowNTag 1, cardFacts 2, cardView 18, CardAnalyticsView 37, searchStatus 9, EditSearch 18, EditingBanner 6 and ReleasedCardFacts 4.
- **`eslint`:** exits 0 with no warnings.
- **`pnpm typecheck`:** builds the engine and exits 0. It covers the stories.

Don't run `pnpm lint`, `pnpm test:run` or `pnpm build`: the pre-commit hook runs the first two, and R4-8 runs the build. This task touches no reveal-sync contract file and not the bridge, so there is no `scripts/reveal-sync` run.

- [ ] **Step 18: Check Code Health**

Run `mcp__codescene__code_health_review` on each source file:
- `src/ui/Tag.tsx`, `src/ui/RawTag.tsx`, `src/ui/LowNTag.tsx` and `src/ui/cardFacts.ts`;
- `src/tools/analytics/cards/cardView.ts` and `src/tools/analytics/cards/CardHeader.tsx`;
- `src/tools/studio/searchStatus.ts`;
- `src/tools/studio/components/CardMarks.tsx`, `EditSearch.tsx`, `EditingBanner.tsx`, `ReleasedCardFacts.tsx` and `EditEntry.stories.tsx`;
- the seven test files: the six new ones and the trimmed `cardView.test.ts`.

Expected: 10.0 with no findings for each.

The PR gate is stricter than the local tool, so check the hand count in re-base note 16 as well. Every new module has 0 primitive parameters, and `cardView.ts` stays at 1 of 7. If a review finds anything, fix it, review again, and confirm with `mcp__codescene__code_health_score`.

- [ ] **Step 19: Commit**

Use the Bash tool, never PowerShell, and only after the owner approves. Run each command as its own Bash call, and pipe neither.

1. Stage only these paths:

   ```bash
   git add src/ui/Tag.tsx src/ui/RawTag.tsx src/ui/LowNTag.tsx src/ui/cardFacts.ts src/ui/__tests__/Tag.test.tsx src/ui/__tests__/cardFacts.test.ts src/ui/Primitives.stories.tsx src/tools/analytics/cards/cardView.ts src/tools/analytics/cards/__tests__/cardView.test.ts src/tools/analytics/cards/CardHeader.tsx src/tools/studio/searchStatus.ts src/tools/studio/__tests__/searchStatus.test.ts src/tools/studio/components/CardMarks.tsx src/tools/studio/components/EditSearch.tsx src/tools/studio/components/EditingBanner.tsx src/tools/studio/components/ReleasedCardFacts.tsx src/tools/studio/components/EditEntry.stories.tsx src/tools/studio/__tests__/EditSearch.test.tsx src/tools/studio/__tests__/EditingBanner.test.tsx src/tools/studio/__tests__/ReleasedCardFacts.test.tsx
   ```

2. Run `mcp__codescene__pre_commit_code_health_safeguard`. Continue only when it passes.

3. Commit:

   ```bash
   USER_APPROVED=1 git commit -m "feat(studio): add the Edit search, banner and released-card facts (#24)"
   ```

Husky's pre-commit runs the full lint and the tests. Never pass `--no-verify`. If Vitest fails to start its workers under load, stop this session's preview servers, wait for other sessions' runs to finish, and retry.
