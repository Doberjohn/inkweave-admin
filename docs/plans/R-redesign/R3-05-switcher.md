> Part of [R: Admin redesign](../R-redesign.md), phase R3 ([R3-card-analytics.md](R3-card-analytics.md)). Read the main plan's decisions (R-28 to R-56 for R3), corrections, global constraints and shared interfaces, then the R3 header, first.

> **Re-base notes (R3-5, 2026-10-06).** Re-based from the outline's Task R3-5 (`R3-card-analytics.md:1889-1931`, written 2026-10-01 against the planned R1 code) onto main @ `aea40b4` (R2 as built), pin `upstream/inkweave` @ `bc877e1`, decisions R-28 to R-56, and the audit `audit-R3-5.json`.
> - **`cardRoutes.ts` is gone. Its two halves move.**
>   - **The path helper goes to the shell (R-33).** It is `cardsHref(cardId?)` in `src/shell/nav.ts`, beside R2's `calibrationHref` (`nav.ts:44-50`), with the same shape and tests (`nav.test.ts:51-61`). The outline's `cardAnalyticsPath` lived in a tool folder, so R3-8's links from Activity, the Overview and Calibration would have deep-imported across tools. R4 expects a shared helper (`R4-card-studio.md:23`, `:1027`).
>   - **The storage goes to `cards/lastCard.ts`.** Its key is `inkweave-admin.last-card` (R-28), after admin's own `inkweave-admin.sidebar-open` (`Sidebar.tsx:11`). The outline's `inkweave.admin.` prefix matched nothing. The precedent for the plain try/catch is Sidebar's (`Sidebar.tsx:24-32`, `:233-241`), not `useGithubToken`, whose memory fallback and store this doesn't need.
>   - **`readLastCard` reads an empty value as none.** Otherwise R3-7's `<Navigate to={cardsHref(last)}>` would send bare `/cards` to `/cards` again.
> - **"No cards match." (R-30, replacing open question 3).**
>   - It is a polite status: `role="status"`, always mounted, empty until it speaks.
>   - It comes from the bridged `searchCardsByName` run on the live text, so it never flashes during the hook's 150 ms debounce. It shows only while the list is closed.
>   - It floats where the list would, as the prototype draws it (`Inkweave Admin.dc.html:568`, `:943`).
>   - **Two conditions R-30 doesn't spell out:**
>     - **Focus.** It also needs the hook's `isFocused`, the rule the list itself follows (`useAutocomplete.ts:106`). Without it, the note would stay over the page body after focus leaves.
>     - **An empty card list.** It never speaks then. While the list loads, or after it fails, `cards` is `[]` (`useCardData.ts:64`), and "No cards match." would be false.
>   - The check is a pure `switcherStatus` in a new `cards/cardSearch.ts`. `react-refresh/only-export-components` keeps helpers out of a component file. The module also holds the label and `MIN_QUERY`, which the switcher passes to the hook as `minChars`. So the list and the status share one threshold by construction.
> - **The switcher takes `cards` as a prop**, as `CardImagePicker` does (`CardImagePicker.tsx:6-10`). R3-7 already calls `useCardDataContext()`, and passes `cards={cards}`. The switcher's tests then need no bridge mock, and its story needs no `CardDataProvider`.
> - **Styling follows R2's rules, not the outline's inline fill.**
>   - **The highlight.** The active option is the keyboard's focus indicator (`aria-activedescendant`). An inline `rowHover` fill alone is about 1.1:1, under the 3:1 a state cue needs (WCAG 1.4.11). CLAUDE.md also puts states in AdminStyles. So a new `adm-option` class reads `[aria-selected="true"]`: the `rowHover` fill plus the inset 2px accent bar of `adm-row-btn[aria-pressed]` (`AdminStyles.tsx:73`). The hook moves `aria-selected` on hover too (`useAutocomplete.ts:189`), so one rule serves the pointer and the keys.
>   - **The popover.** It is opaque: the card fill laid over the page, as `adminTheme.ts:38-40` asks and `UnsavedChangesGuard.tsx:11-18` does, with a `strongBorder` and `ADMIN_RADIUS.box`.
>   - **The list.** It renders only while it's open, as the app's `SearchAutocomplete` does. An empty listbox fails axe. It is named "Cards", because axe's `aria-input-field-name` names listboxes, and the a11y addon runs on every story (`.storybook/main.ts:10`).
> - **The option row.**
>   - **The label.** It is `version ? name · version : name` (`cardLabel`). Actions, items and songs have no `version` (engine `types/card.ts:29`), and the outline's template would print "· undefined".
>   - **Inks.** It shows `ink2` for a dual-ink card.
>   - **Text.** The label truncates with the bridged `TRUNCATE`. `#n` is a `<code>` in `muted`, never dim (R-6), and a JSX space keeps it apart in the option's accessible name.
>   - **The field.** It is `type="text"` with `autoComplete="off"` and `spellCheck={false}`. A search field's own Escape would empty the field as the hook closes the list.
> - **Fixtures.** They go in `cards/cardFixtures.ts`, a plain module that the tests and the story both read.
>   - R3-2 creates the file, and this task appends to it: `lorcanaCard(seed)`, one options-object builder, and `SWITCHER_CARDS`. R3-6 can reuse the builder for its header cards.
>   - Eight cards match "mi" across sets 10 and 11, so the newest-set sort and the cut at 6 both show.
>   - Among them are a card with no version, a card with no number, and a dual-ink card.
> - **Tests.**
>   - **Typing and navigation.** The tests type with `userEvent`, since the list needs focus (`useAutocomplete.ts:106`). They observe navigation through `createMemoryRouter` and `router.state.location`, as `UnsavedChangesGuard.test.tsx:26-36` and `router.test.tsx:228-233` do.
>   - **Focus.** A pick keeps focus in the field (R-48).
>   - **Storage.** A single `vi.stubGlobal('localStorage', …)` stands in for unavailable storage, as `Sidebar.test.tsx:114-122` does. The outline used three `Storage.prototype` spies.
> - **A story** with play functions: Closed, Open and NoMatch. The switcher lives in PageLayout's `actions` (R3-7), and R3-6's stories render the view, not the page. So without its own story the a11y addon would never see the open list. These are the repo's first `play` functions, through `storybook/test` (bundled with `storybook` 10, typechecked here).
> - **Depends on:**
>   - **R3-1's bridge lines.** `Z_INDEX` after `TRUNCATE`. `useAutocomplete` and `type UseAutocompleteReturn` on the hooks line (R-55 keeps the type). `searchCardsByName` beside `smallImageUrl` (R-30).
>   - **R3-2's `cardFixtures.ts`.** This task appends to it, and never creates it.
>   - **R3-4b's AdminStyles lines.** The task order runs R3-4b, then R3-4c, then R3-5. R3-4b inserts `.adm-net-link` after `AdminStyles.tsx:103` and adds one AdminStyles case, so the line numbers and test counts below count both.
>   - Step 1 checks R3-1 and R3-2, and stops if either is missing.
> - **Citations corrected.**
>   - The cards are Core cards with preview cards merged in: `loader.ts:194-195` (merge) and `:198` (the Core floor), not `:192-206`. The Core set filter is `:206-210`.
>   - `searchCardsByName` is at `loader.ts:239-246`, and `parseSetOrder` at `:122-129`.
>   - `Z_INDEX` is at `shared/constants/theme.ts:261-271`, with `autocomplete: 900` at `:262`.
>   - App master moves none of these files' code that R3-5 uses. It inserts one line at `loader.ts:115`.
> - **Code Health.**
>   - **Local scores.** CodeScene MCP 1.1.3 scores every new file 10.0: `CardSwitcher.tsx`, `cardSearch.ts`, `lastCard.ts`, `cardFixtures.ts`, the three test files and the story. `nav.ts` also scores 10.0.
>   - **One fix it forced.** `switcherStatus` first had one four-term `if` and scored 9.53 (Complex Conditional), so its guard is two `if`s.
>   - **Complexity.** ESLint's `complexity` rule, run through the repo config, gives `switcherStatus` 6 (two `if`s, two `||` and the ternary), `CardOption` and `CardSwitcher` 3 each, and `cardLabel` 2. The highest is 6 (`switcherStatus`), under the limit of 8. No function takes more than one argument, outside the test helper `openList(user, input, query)`.
>   - **Primitive arguments.** `cardSearch.ts` takes 0%: both functions take objects. `lastCard.ts` takes 2 of 2 strings, and `nav.ts` goes to 4 of 4. The server gate passed `nav.ts` at 3 of 3 in R2, so small modules sit under its size floor.
>   - **If the gate flags `lastCard.ts`,** `writeLastCard` takes `Pick<LorcanaCard, 'id'>`, since R3-7 has the card when it writes.
>   - **A local 10.0 isn't proof.** R3-9 runs `analyze_change_set`.
> - **Verified in a scratch sandbox** (`scratchpad/r3-rebase/sandbox-R3-5`).
>   - **Setup.** The sandbox is a copy of `src` and the configs at `aea40b4`, with junctions to the repo's `node_modules` and `upstream`, and its own Vite and tsbuildinfo caches. R3-1's drafted `src/app-bridge.ts` is copied in.
>   - **Failures before the code.** Every "watch it fail" output below was produced with the implementation files removed.
>   - **Tests.** The five files gave `Test Files  5 passed (5)` and `Tests  63 passed (63)`. The sandbox had no R3-4b, so with its AdminStyles case the run gives 64, as Step 11 says. The whole `vitest run src` gave 95 files and 1,084 tests passed, with no `act()` warnings.
>   - **Typecheck and lint.** `tsc -p tsconfig.app.json` exits 0, story included. `pnpm exec eslint --stdin --max-warnings=0` is clean on every new file, run from the repo.
>   - **Not run.** No dev server or Storybook ran here. Step 14 is the browser check.

### Task R3-5: Switch-card combobox, `cardsHref` and the last card viewed

**Files:**
- Modify `src/shell/nav.ts`: add `cardsHref` after `calibrationHref` (`:44-50`).
- Modify `src/shell/nav.test.ts`: the import (`:1`), and a `describe` at the end (after `:61`).
- Modify `src/theme/AdminStyles.tsx`:
  - the doc comment (`:28-30`, and a paragraph after `:42`);
  - the `adm-option` rules after `.adm-hover-row` (`:87-88`);
  - the reduced-motion list (`:115`: R3-4b's `.adm-net-link` rule at `:104` moves it down one).
- Modify `src/theme/__tests__/AdminStyles.test.tsx`: the `CLASSES` list (`:17-18`), and one case after `:75`.
- Modify `src/tools/analytics/cards/cardFixtures.ts` (R3-2 creates it): one `import type` line first, and `lorcanaCard` and `SWITCHER_CARDS` appended.
- Create in `src/tools/analytics/cards/`:
  - `lastCard.ts`, `cardSearch.ts`, `CardSwitcher.tsx` and `CardSwitcher.stories.tsx`;
  - the tests `__tests__/lastCard.test.ts`, `__tests__/cardSearch.test.ts` and `__tests__/CardSwitcher.test.tsx`.

**Interfaces:**
- **Consumes:**
  - From `src/app-bridge.ts`:
    - R3-1 adds `Z_INDEX`, `useAutocomplete`, `type UseAutocompleteReturn` and `searchCardsByName`.
    - `InkIcon`, `SPACING` and `TRUNCATE` are bridged already.
  - Their shapes at the pin:
    ```ts
    // shared/hooks/useAutocomplete.ts:5-13, 15-49 (the options type isn't exported)
    useAutocomplete(options: {
      cards: LorcanaCard[]; query: string; onQueryChange: (query: string) => void; onSelect: (card: LorcanaCard) => void;
      minChars?: number; maxResults?: number; debounceMs?: number; // defaults 2, 10, 150 (:56-58)
    }): UseAutocompleteReturn;
    interface UseAutocompleteReturn {
      suggestions: LorcanaCard[]; isOpen: boolean; isFocused: boolean; highlightedIndex: number;
      inputProps: {value; onChange; onKeyDown; onFocus; onBlur; role: 'combobox'; 'aria-expanded'; 'aria-autocomplete': 'list'; 'aria-controls'; 'aria-activedescendant'};
      listboxProps: {id: string; role: 'listbox'};
      getOptionProps: (index: number) => {id: string; role: 'option'; 'aria-selected': boolean; onMouseDown; onMouseEnter};
      close: () => void; searchImmediate: (term: string) => void;
    }
    // features/cards/loader.ts:239-246: a substring of name, fullName or version, case-insensitive, ’ and ' alike
    export function searchCardsByName(cards: LorcanaCard[], query: string): LorcanaCard[];
    // shared/constants/theme.ts:261-262
    Z_INDEX.autocomplete === 900; // over ChartTooltip's 1, under DialogShell's modal layers (999, 1000)
    ```
  - What the hook does, at the pin (`useAutocomplete.ts`), so admin redoes none of it:
    - **The list.** It sorts newest set first (`:101-103`, through `parseSetOrder`). It opens only while the field has focus, a debounced search has results, and the text has `minChars` (`:106`).
    - **Keys.** ArrowDown and ArrowUp wrap, and Enter picks the highlighted card. Escape empties the debounced query, which closes the list and keeps the text (`:128-152`).
    - **Blur.** Focus leaving waits 150 ms (`:163-171`).
    - **The pointer.** Mousedown picks, with `preventDefault`, so the field keeps focus (`:185-188`). Hover highlights (`:189`).
    - **A pick** calls `onSelect`, then `onQueryChange('')`, then `close()` (`:121-126`).
  - `LorcanaCard` from `'inkweave-synergy-engine'`, as `CardImagePicker.tsx:2` imports it.
  - `ADMIN_COLORS` (`card`, `page`, `strongBorder`, `muted`, `text`, `rowHover`, `accent`), `ADMIN_TYPE` (`small`, `label`, `body`) and `ADMIN_RADIUS.box`.
- **Produces:**
  ```ts
  // src/shell/nav.ts (R-33)
  export function cardsHref(cardId?: string): string; // '/cards', or '/cards/' + encodeURIComponent(cardId)

  // src/tools/analytics/cards/lastCard.ts (R-28): every access in try/catch
  export const LAST_CARD_KEY = 'inkweave-admin.last-card';
  export function readLastCard(): string | null;        // null: nothing saved, an empty value, or storage unavailable
  export function writeLastCard(cardId: string): void;
  export function forgetLastCard(cardId: string): void; // only when it is the saved id

  // src/tools/analytics/cards/cardSearch.ts
  export const MIN_QUERY = 2;                     // passed to useAutocomplete as minChars
  export const NO_MATCH = 'No cards match.';
  export function cardLabel(card: Pick<LorcanaCard, 'name' | 'version'>): string; // "name · version", or the bare name
  export interface SwitcherState {cards: LorcanaCard[]; query: string; listOpen: boolean; focused: boolean}
  export function switcherStatus(state: SwitcherState): string; // NO_MATCH or ''

  // src/tools/analytics/cards/CardSwitcher.tsx: the only export
  export function CardSwitcher(props: {cards: LorcanaCard[]});

  // src/tools/analytics/cards/cardFixtures.ts (appended)
  export function lorcanaCard(seed: Pick<LorcanaCard, 'id' | 'name'> & Partial<LorcanaCard>): LorcanaCard;
  export const SWITCHER_CARDS: LorcanaCard[];

  // src/theme/AdminStyles.tsx: adm-option (a listbox option; [aria-selected="true"] = the active one)
  ```
- **What R3-7's page and its tests can rely on in the DOM:**
  - The field is the combobox "Switch card". The listbox "Cards" exists only while it is open.
  - Each option is named "{name} · {version} #{number}". The version and the number are dropped when the card has none.
  - One `role="status"` is always mounted. It is empty unless a query finds no card. Page tests that look for another status must scope the query, for example `within(main)` or by its text.

**How it works:**
- **The search.** `CardSwitcher({cards})` holds the field's text in its own state and calls the bridged `useAutocomplete({cards, query, onQueryChange: setQuery, onSelect: (card) => navigate(cardsHref(card.id)), minChars: MIN_QUERY, maxResults: 6})`. So search follows the app:
  - it matches name, full name or version;
  - it puts newer sets first;
  - it needs two letters, and waits 150 ms.

  An id already works in the URL (R-30).
- **The field.** It is `className="adm-input"` with `aria-label="Switch card"` and the placeholder "Switch card…". Its wrapper is the handoff's 320px, `maxWidth: '100%'` (`dc.html:564`).
- **The list.** It is rendered only while `isOpen`: a `<ul aria-label="Cards">` at `Z_INDEX.autocomplete`, opaque, under the field. Each `<li className="adm-option">` spreads `getOptionProps(index)`. It shows:
  - the ink icon, or both for a dual-ink card;
  - `cardLabel(card)`;
  - `#{setNumber}` when there is one.
- **The status.** `switcherStatus` gives "No cards match." while the field has focus, the list is closed, cards have loaded, and two or more letters find nothing. The status is an always-mounted `role="status"` under the field. Its text sits on the same opaque surface as the list.
- **No dialog.** The list is not modal: no `aria-modal` and no focus trap, so `inkweave/no-unshelled-dialogs` doesn't apply. Focus stays in the field, and `aria-activedescendant` points at the active option.
- **A pick** navigates and empties the field. On the card page, the switcher sits in PageLayout's `actions`, outside the view that R-46 keys by card id, so it stays mounted and keeps focus (R-48).

- [ ] **Step 1: Check what this task builds on**

From the repo root:

```bash
grep -nE "^  Z_INDEX,$" src/app-bridge.ts
grep -n "  useAutocomplete,\|type UseAutocompleteReturn" src/app-bridge.ts
grep -n "export {searchCardsByName, smallImageUrl}" src/app-bridge.ts
grep -rn "cardsHref\|cardAnalyticsPath\|cardRoutes\|last-card" src
ls src/tools/analytics/cards/cardFixtures.ts
```

Expected:
- The first three greps each print one line or more (R3-1's bridge lines).
- The fourth prints nothing.
- `ls` lists the file (R3-2).

If any of the first three prints nothing, R3-1 hasn't landed: stop. If `ls` finds no file, R3-2 hasn't landed: stop.

If this checkout hasn't built the engine since the pin, run `pnpm build:engine` once: the card tests reach the bridge.

- [ ] **Step 2: Write the failing tests for `cardsHref`, and watch them fail**

In `src/shell/nav.test.ts`, line 1. Current:

```ts
import {NAV_ITEMS, calibrationHref, isWritePath, navItemFor} from './nav';
```

New:

```ts
import {NAV_ITEMS, calibrationHref, cardsHref, isWritePath, navItemFor} from './nav';
```

At the end of the file, after the `calibrationHref` block (`:51-61`), add:

```ts

describe('cardsHref', () => {
  it('links the bare page when no card is given', () => expect(cardsHref()).toBe('/cards'));

  it.each([
    ['2983', '/cards/2983'],
    // Escaped, so an id always stays one path segment.
    ['a/b c', '/cards/a%2Fb%20c'],
  ])('links %s to %s', (cardId, href) => {
    expect(cardsHref(cardId)).toBe(href);
  });
});
```

Run:

```bash
pnpm vitest run src/shell/nav.test.ts
```

Expected: `Tests  3 failed | 17 passed (20)`. Each of the three `cardsHref` cases fails with `TypeError: cardsHref is not a function`.

- [ ] **Step 3: Add `cardsHref`**

At the end of `src/shell/nav.ts`, after `calibrationHref` (`:44-50`), add:

```ts

/**
 * The Card analytics page, opened on a card when one is given (R-33): what the
 * switcher, the partner links and other pages' card links navigate to. Bare
 * /cards opens the last card viewed, or the "Pick a card" prompt.
 */
export function cardsHref(cardId?: string): string {
  return cardId ? `/cards/${encodeURIComponent(cardId)}` : '/cards';
}
```

R3-7 adds the Card analytics nav item, not this task.

Run `pnpm vitest run src/shell/nav.test.ts`. Expected: `Tests  20 passed (20)`.

- [ ] **Step 4: Write the failing tests for the last card viewed, and watch them fail**

Create `src/tools/analytics/cards/__tests__/lastCard.test.ts`:

```ts
import {LAST_CARD_KEY, forgetLastCard, readLastCard, writeLastCard} from '../lastCard';

// Pinned here, not imported: renaming the key would silently drop everyone's last card.
const KEY = 'inkweave-admin.last-card';

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('lastCard', () => {
  it("saves under admin's own key", () => {
    expect(LAST_CARD_KEY).toBe(KEY);
    writeLastCard('2983');
    expect(localStorage.getItem(KEY)).toBe('2983');
  });

  it('reads nothing before a card is viewed', () => {
    expect(readLastCard()).toBeNull();
  });

  it('reads back the newest card written', () => {
    writeLastCard('2983');
    writeLastCard('1004');
    expect(readLastCard()).toBe('1004');
  });

  it('reads an empty saved value as no card', () => {
    localStorage.setItem(KEY, '');
    expect(readLastCard()).toBeNull();
  });

  it('forgets the saved card', () => {
    writeLastCard('999999');
    forgetLastCard('999999');
    expect(readLastCard()).toBeNull();
  });

  it('leaves a different saved card alone', () => {
    writeLastCard('2983');
    forgetLastCard('999999');
    expect(readLastCard()).toBe('2983');
  });

  it('reads nothing and throws nothing when storage is unavailable', () => {
    const denied = () => {
      throw new Error('storage denied');
    };
    vi.stubGlobal('localStorage', {getItem: denied, setItem: denied, removeItem: denied});
    expect(readLastCard()).toBeNull();
    expect(() => writeLastCard('2983')).not.toThrow();
    expect(() => forgetLastCard('2983')).not.toThrow();
  });
});
```

These tests follow Sidebar's idiom (`Sidebar.test.tsx:6-7`, `:23-26`, `:114-122`):
- the key is pinned literally;
- `afterEach` unstubs before it clears, so `clear()` reaches the real storage;
- one stubbed `localStorage` covers all three methods.

Run:

```bash
pnpm vitest run src/tools/analytics/cards/__tests__/lastCard.test.ts
```

Expected: `Test Files  1 failed (1)`, `Tests  no tests`, with `Error: Failed to resolve import "../lastCard" from "src/tools/analytics/cards/__tests__/lastCard.test.ts". Does the file exist?`

- [ ] **Step 5: Add `lastCard.ts`**

Create `src/tools/analytics/cards/lastCard.ts`:

```ts
/**
 * Where the last card viewed is saved (R-28), so bare /cards opens it again.
 * Admin's own keys start inkweave-admin., as the sidebar's does
 * (SIDEBAR_OPEN_KEY). Only the id is saved: the card list says what it is.
 */
export const LAST_CARD_KEY = 'inkweave-admin.last-card';

// Every access is wrapped, as the sidebar's is (Sidebar.tsx): a private window
// or blocked site data throws, and the page must still work without storage.

/** The last card viewed, or null when none was saved (or storage is unavailable). */
export function readLastCard(): string | null {
  try {
    // An empty value counts as none: /cards would otherwise redirect to itself.
    return localStorage.getItem(LAST_CARD_KEY) || null;
  } catch {
    return null;
  }
}

/** Saves a card as the last viewed. The page calls it once the id resolves to a card. */
export function writeLastCard(cardId: string): void {
  try {
    localStorage.setItem(LAST_CARD_KEY, cardId);
  } catch {
    /* storage unavailable: the next visit to /cards shows the prompt */
  }
}

/**
 * Forgets `cardId` if it is the saved card, and leaves any other alone. The
 * page calls it for an id the loaded card list doesn't have.
 */
export function forgetLastCard(cardId: string): void {
  try {
    if (localStorage.getItem(LAST_CARD_KEY) === cardId) localStorage.removeItem(LAST_CARD_KEY);
  } catch {
    /* storage unavailable: nothing was saved */
  }
}
```

Run `pnpm vitest run src/tools/analytics/cards/__tests__/lastCard.test.ts`. Expected: `Tests  7 passed (7)`.

- [ ] **Step 6: Write the failing test for the `adm-option` rule, and watch it fail**

In `src/theme/__tests__/AdminStyles.test.tsx`, the `CLASSES` list (lines 17-18). Current:

```ts
  'adm-hover-row',
  // The chart kit's (R1-3b).
```

New:

```ts
  'adm-hover-row',
  // The card switcher's options (R3-5).
  'adm-option',
  // The chart kit's (R1-3b).
```

`adm-option` joins neither `FOCUSABLE` nor `PRESSABLE`. It never takes focus, since focus stays in the field (`aria-activedescendant`). And it reads `aria-selected`, not `aria-pressed`.

After the case `keeps a selected row button on one fill, hovered or not` (lines 71-75), add:

```ts

  it('marks the active option from aria-selected, with the row fill and the selected bar', () => {
    const css = stylesheet();
    expect(css).toContain(
      `.adm-option[aria-selected="true"]{background:${ADMIN_COLORS.rowHover};box-shadow:inset 2px 0 0 ${ADMIN_COLORS.accent};}`,
    );
    // The hook highlights a hovered option too, so the one rule covers the pointer.
    expect(css).not.toContain('.adm-option:hover');
    const reduced = /@media \(prefers-reduced-motion: reduce\)\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(reduced).toMatch(/[.]adm-option(?![a-z-])[^{]*[{]transition:none;[}]/);
  });
```

R3-4b's `'adm-net-link'` and its comment stay at the end of `CLASSES`. The lines quoted above are unchanged by it.

Run:

```bash
pnpm vitest run src/theme/__tests__/AdminStyles.test.tsx
```

Expected: `Tests  2 failed | 12 passed (14)`. The two failures:
- `defines every adm-* class in the contract`: `AssertionError: expected '\n.adm-nav-item{display:flex;align-it…' to match /[.]adm-option(?![a-z-])/`
- `marks the active option from aria-selected, with the row fill and the selected bar`: `AssertionError: expected '\n.adm-nav-item{display:flex;align-it…' to contain '.adm-option[aria-selected="true"]{bac…'`

- [ ] **Step 7: Add the `adm-option` rule**

In `src/theme/AdminStyles.tsx`, the doc comment (lines 28-30). Current:

```ts
 * :focus-visible and state selectors. Selection is read from ARIA state
 * (aria-current="page", aria-pressed="true"), never from a class, so the
 * styling and what assistive tech hears can't disagree.
```

New:

```ts
 * :focus-visible and state selectors. Selection is read from ARIA state
 * (aria-current="page", aria-pressed="true", aria-selected="true"), never from
 * a class, so the styling and what assistive tech hears can't disagree.
```

After the paragraph that ends `table, and a cell's always paints, so the two coincide where both do.` (line 42), add a paragraph. Current:

```ts
 * table, and a cell's always paints, so the two coincide where both do.
 *
 * <button> takes no style prop here (inkweave/no-adhoc-buttons), so the button
```

New:

```ts
 * table, and a cell's always paints, so the two coincide where both do.
 *
 * A listbox option (adm-option, the card switcher's) never takes focus: focus
 * stays in its field, which points at the active option (aria-activedescendant).
 * So the option draws no ring. aria-selected marks the active one with the
 * row fill and the selected bar, the 3:1 cue. The app's useAutocomplete moves
 * aria-selected on hover too, so one rule serves the pointer and the keys.
 *
 * <button> takes no style prop here (inkweave/no-adhoc-buttons), so the button
```

After the `.adm-hover-row` rules (lines 87-88). Current:

```ts
.adm-hover-row{transition:background-color ${FAST};}
.adm-hover-row:hover,.adm-hover-row:focus-within{background:${C.rowHover};}
```

New:

```ts
.adm-hover-row{transition:background-color ${FAST};}
.adm-hover-row:hover,.adm-hover-row:focus-within{background:${C.rowHover};}

.adm-option{display:flex;align-items:center;gap:${SPACING.sm}px;padding:${SPACING.sm}px ${SPACING.md}px;color:${C.text};font-size:${T.body}px;cursor:pointer;transition:background-color ${FAST};}
.adm-option[aria-selected="true"]{background:${C.rowHover};box-shadow:inset 2px 0 0 ${C.accent};}
```

The reduced-motion list (line 115). Current:

```ts
.adm-nav-item,.adm-nav-mark,.adm-seg-btn,.adm-row-btn,.adm-card-btn,.adm-input,.adm-select,.adm-hover-row{transition:none;}
```

New:

```ts
.adm-nav-item,.adm-nav-mark,.adm-seg-btn,.adm-row-btn,.adm-card-btn,.adm-input,.adm-select,.adm-hover-row,.adm-option{transition:none;}
```

Notes on the rule:
- **Colours.** The fill and the bar are the ones `adm-row-btn[aria-pressed]` uses (`:73`), on `rowHover` rather than `rowSelected`. An option's text is plain, with no red gap text to keep at 4.5:1 (R-27). Text stays at 12.6:1 or more and muted at 5.9:1 or more on every hovered fill (`adminTheme.ts:42-44`). The gold bar is the 3:1 cue.
- **Size.** The row is about 34px tall: 8px of padding each side of the 18px ink icon. That clears WCAG 2.5.8's 24px.

Run `pnpm vitest run src/theme/__tests__/AdminStyles.test.tsx`. Expected: `Tests  14 passed (14)`.

- [ ] **Step 8: Add the switcher's fixtures, write the failing tests for `cardSearch`, and watch them fail**

At the end of `src/tools/analytics/cards/cardFixtures.ts`, append:

```ts

/**
 * A card in the shape the loader gives the app: `fullName` is "name - version"
 * (or the bare name), and the rest of what LorcanaCard requires has a plain
 * default. `seed` names the fields a test or story cares about.
 */
export function lorcanaCard(seed: Pick<LorcanaCard, 'id' | 'name'> & Partial<LorcanaCard>): LorcanaCard {
  const {name, version} = seed;
  return {
    fullName: version ? `${name} - ${version}` : name,
    cost: 3,
    ink: 'Amber',
    inkwell: true,
    type: 'Character',
    ...seed,
  };
}

/**
 * The switcher's card list. Eight cards match "mi": five from set 10 listed
 * first, then three from set 11, so newest-set-first moves set 11 to the top
 * and the sixth result cuts Madam Mim and Magic Mirror. Magic Mirror (an item)
 * has no version, Miss Bianca (a preview) no collector number, and Minnie Mouse
 * - Musketeer Champion two inks. Elsa matches nothing in "mi".
 */
export const SWITCHER_CARDS: LorcanaCard[] = [
  lorcanaCard({id: '3001', name: 'Mickey Mouse', version: 'Brave Little Tailor', setCode: '10', setNumber: 115}),
  lorcanaCard({id: '3002', name: 'Minnie Mouse', version: 'Beloved Princess', setCode: '10', setNumber: 12}),
  lorcanaCard({id: '3003', name: 'Mirabel Madrigal', version: 'Gift of the Family', setCode: '10', setNumber: 18}),
  lorcanaCard({id: '3004', name: 'Madam Mim', version: 'Fox', ink: 'Amethyst', setCode: '10', setNumber: 50}),
  lorcanaCard({id: '3005', name: 'Magic Mirror', type: 'Item', ink: 'Amethyst', setCode: '10', setNumber: 66}),
  lorcanaCard({id: '3006', name: 'Miss Bianca', version: 'Unwavering Agent', ink: 'Sapphire', setCode: '11'}),
  lorcanaCard({id: '3007', name: 'Mickey Mouse', version: 'Wayward Sorcerer', ink: 'Amethyst', setCode: '11', setNumber: 40}),
  lorcanaCard({
    id: '3008',
    name: 'Minnie Mouse',
    version: 'Musketeer Champion',
    ink2: 'Steel',
    setCode: '11',
    setNumber: 120,
  }),
  lorcanaCard({id: '3009', name: 'Elsa', version: 'Snow Queen', ink: 'Sapphire', setCode: '10', setNumber: 42}),
];
```

The file also needs the card type. Add this import as the file's first line, before the relative imports (`'../voteAnalyticsTypes'` and the others R3-2 to R3-4 added):

```ts
import type {LorcanaCard} from 'inkweave-synergy-engine';
```

Notes on the fixtures:
- **The builder.** `lorcanaCard` takes one options object, never positional arguments: R1 and R2 failed the CodeScene gate on 5-argument fixture helpers. R3-6 can build its header's cards with it (no rarity, "Super Rare").
- **The ids.** They are made up. R3-2's `REVIEW_PAIRS` also uses 3001 to 3007, for other cards, so never pair the two lists in one test. The sets are numbers, as `parseSetOrder` reads them (`loader.ts:122-129`).

Create `src/tools/analytics/cards/__tests__/cardSearch.test.ts`:

```ts
import {NO_MATCH, cardLabel, switcherStatus, type SwitcherState} from '../cardSearch';
import {SWITCHER_CARDS} from '../cardFixtures';

describe('cardLabel', () => {
  it.each([
    {card: {name: 'Mickey Mouse', version: 'Brave Little Tailor'}, label: 'Mickey Mouse · Brave Little Tailor'},
    // Actions, items and songs have no version: no dangling separator.
    {card: {name: 'Magic Mirror'}, label: 'Magic Mirror'},
  ])('reads "$label"', ({card, label}) => {
    expect(cardLabel(card)).toBe(label);
  });
});

describe('switcherStatus', () => {
  // The field has focus, its list is closed, and "zq" finds no card.
  const NO_CARD_FOUND: SwitcherState = {cards: SWITCHER_CARDS, query: 'zq', listOpen: false, focused: true};

  it('says "No cards match." when the typed text finds no card', () => {
    expect(switcherStatus(NO_CARD_FOUND)).toBe(NO_MATCH);
    expect(NO_MATCH).toBe('No cards match.');
  });

  it.each<[string, Partial<SwitcherState>]>([
    ['the text finds a card', {query: 'mi'}],
    // Found in the version, as the app's search does.
    ['the text finds a version', {query: 'sorcerer'}],
    ['one letter has been typed', {query: 'z'}],
    ['the list is still open on the last match', {listOpen: true}],
    ['the field has lost focus', {focused: false}],
    ['no cards have loaded', {cards: []}],
  ])('says nothing when %s', (_, change) => {
    expect(switcherStatus({...NO_CARD_FOUND, ...change})).toBe('');
  });
});
```

Run:

```bash
pnpm vitest run src/tools/analytics/cards/__tests__/cardSearch.test.ts
```

Expected: `Test Files  1 failed (1)`, `Tests  no tests`, with `Error: Failed to resolve import "../cardSearch" from "src/tools/analytics/cards/__tests__/cardSearch.test.ts". Does the file exist?`

- [ ] **Step 9: Add `cardSearch.ts`**

Create `src/tools/analytics/cards/cardSearch.ts`:

```ts
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {searchCardsByName} from '../../../app-bridge';

/**
 * The switcher searches from two letters: useAutocomplete's own default,
 * passed to it explicitly so its list and the status below agree.
 */
export const MIN_QUERY = 2;

/** The switcher's status when a query finds no card (R-30, the handoff's words). */
export const NO_MATCH = 'No cards match.';

/**
 * A switcher row's text, as the handoff writes it: "Mickey Mouse · Brave
 * Little Tailor", or the bare name for a card with no version (actions, items
 * and songs have none).
 */
export function cardLabel({name, version}: Pick<LorcanaCard, 'name' | 'version'>): string {
  return version ? `${name} · ${version}` : name;
}

/** What the switcher's status reads from: its cards, and the hook's state. */
export interface SwitcherState {
  /** Every card the switcher can open. Empty while the card list loads, or after it failed. */
  cards: LorcanaCard[];
  /** The text in the field, ahead of the hook's 150 ms debounce. */
  query: string;
  /** useAutocomplete's isOpen. */
  listOpen: boolean;
  /** useAutocomplete's isFocused: the field has focus, or lost it under 150 ms ago. */
  focused: boolean;
}

/**
 * The switcher's polite status (R-30): "No cards match." while the field has
 * focus, its list is closed and the typed text finds no card, and '' the rest
 * of the time. It runs the hook's own search, searchCardsByName, on the live
 * text rather than the debounced one, so it never shows during the 150 ms the
 * list takes to catch up. With no cards loaded nothing was searched, so it
 * says nothing.
 */
export function switcherStatus({cards, query, listOpen, focused}: SwitcherState): string {
  // Out of sight: the field has no focus, or its list shows the last results.
  if (!focused || listOpen) return '';
  // Nothing searched: no cards to search, or under two letters.
  if (cards.length === 0 || query.length < MIN_QUERY) return '';
  return searchCardsByName(cards, query).length === 0 ? NO_MATCH : '';
}
```

Notes:
- The guard is two `if`s, not one four-term condition: CodeScene scored the single condition 9.53 (Complex Conditional).
- Both functions take objects, so the module has no primitive arguments.
- `searchCardsByName` runs on every render while the status can speak. That is a substring filter over the card list (about a thousand cards), the same work the hook does per debounced query, and the React Compiler memoizes it on `cards` and `query`.

Run `pnpm vitest run src/tools/analytics/cards/__tests__/cardSearch.test.ts`. Expected: `Tests  9 passed (9)`.

- [ ] **Step 10: Write the failing tests for the switcher, and watch them fail**

Create `src/tools/analytics/cards/__tests__/CardSwitcher.test.tsx`:

```tsx
import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {SWITCHER_CARDS} from '../cardFixtures';
import {CardSwitcher} from '../CardSwitcher';

type User = ReturnType<typeof userEvent.setup>;

/**
 * The switcher on the card page's route, as R3-7 mounts it in the header: one
 * route element serves every id, so a pick navigates and the switcher stays.
 */
function renderSwitcher(cards: LorcanaCard[] = SWITCHER_CARDS) {
  const router = createMemoryRouter([{path: '/cards/:cardId?', element: <CardSwitcher cards={cards} />}], {
    initialEntries: ['/cards'],
  });
  render(<RouterProvider router={router} />);
  return {router, user: userEvent.setup(), input: screen.getByRole('combobox', {name: 'Switch card'})};
}

/** Types into the field, then waits out the hook's 150 ms debounce for the list. */
async function openList(user: User, input: HTMLElement, query: string) {
  await user.type(input, query);
  return screen.findAllByRole('option');
}

const optionTexts = () => screen.getAllByRole('option').map((option) => option.textContent);

/** Longer than the hook's 150 ms debounce, so a list that was going to open has. */
const pastTheDebounce = () => new Promise((resolve) => setTimeout(resolve, 200));

describe('CardSwitcher', () => {
  it('is a named combobox that starts collapsed', () => {
    const {input} = renderSwitcher();
    expect(input).toHaveAttribute('placeholder', 'Switch card…');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('waits for two letters', async () => {
    const {user, input} = renderSwitcher();
    await user.type(input, 'm');
    await pastTheDebounce();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.type(input, 'i');
    expect(await screen.findByRole('listbox', {name: 'Cards'})).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });

  it('lists up to 6 cards, newest set first: "name · version" and the collector number', async () => {
    const {user, input} = renderSwitcher();
    await openList(user, input, 'mi');
    // Eight cards match. Set 11 comes first, and Madam Mim and Magic Mirror (set 10) are cut.
    expect(optionTexts()).toEqual([
      'Miss Bianca · Unwavering Agent',
      'Mickey Mouse · Wayward Sorcerer #40',
      'Minnie Mouse · Musketeer Champion #120',
      'Mickey Mouse · Brave Little Tailor #115',
      'Minnie Mouse · Beloved Princess #12',
      'Mirabel Madrigal · Gift of the Family #18',
    ]);
    // A popover, not a dialog: nothing traps focus.
    expect(document.querySelector('[aria-modal]')).toBeNull();
  });

  it.each([
    ['a card with no version as its bare name', 'mirror', ['Magic Mirror #66']],
    ['a card with no collector number without one', 'bianca', ['Miss Bianca · Unwavering Agent']],
  ])('shows %s', async (_, query, texts) => {
    const {user, input} = renderSwitcher();
    await openList(user, input, query);
    expect(optionTexts()).toEqual(texts);
  });

  it("shows both of a dual-ink card's inks", async () => {
    const {user, input} = renderSwitcher();
    const [option] = await openList(user, input, 'musketeer');
    // The icons are decorative: the option's name is its text alone.
    expect(option.querySelectorAll('img[alt=""][aria-hidden="true"]')).toHaveLength(2);
    expect(option).toHaveAccessibleName('Minnie Mouse · Musketeer Champion #120');
  });

  it('highlights an option from the keys and the pointer alike', async () => {
    const {user, input} = renderSwitcher();
    const options = await openList(user, input, 'mi');
    await user.keyboard('{ArrowDown}');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
    // The class is what paints the highlight: AdminStyles reads aria-selected on it.
    expect(options[0]).toHaveClass('adm-option');
    await user.hover(options[2]);
    expect(options[2]).toHaveAttribute('aria-selected', 'true');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
  });

  it('opens the highlighted card on Enter, empties the field and keeps focus in it', async () => {
    const {router, user, input} = renderSwitcher();
    await openList(user, input, 'mi');
    await user.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(router.state.location.pathname).toBe('/cards/3006'));
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens a clicked card, and keeps focus in the field', async () => {
    const {router, user, input} = renderSwitcher();
    await openList(user, input, 'mi');
    await user.click(screen.getByRole('option', {name: 'Mickey Mouse · Brave Little Tailor #115'}));
    await waitFor(() => expect(router.state.location.pathname).toBe('/cards/3001'));
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
  });

  it('closes on Escape and keeps the text', async () => {
    const {user, input} = renderSwitcher();
    await openList(user, input, 'mi');
    await user.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveValue('mi');
    // Cards still match the text, so there's nothing to report.
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  describe('"No cards match."', () => {
    it('is said politely as soon as the text finds no card', async () => {
      const {user, input} = renderSwitcher();
      await user.type(input, 'zq');
      expect(screen.getByRole('status')).toHaveTextContent('No cards match.');
    });

    it('waits for the open list to close, so it never shows beside stale results', async () => {
      const {user, input} = renderSwitcher();
      await openList(user, input, 'mi');
      await user.type(input, 'x');
      // "mix" finds nothing, but the list still shows "mi" for up to 150 ms, and the status waits.
      // Checked only while the list is up: on a loaded machine the 150 ms may already have passed.
      if (screen.queryByRole('listbox')) expect(screen.getByRole('status')).toBeEmptyDOMElement();
      await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
      expect(screen.getByRole('status')).toHaveTextContent('No cards match.');
    });

    it('goes once focus leaves the field', async () => {
      const {user, input} = renderSwitcher();
      await user.type(input, 'zq');
      expect(screen.getByRole('status')).toHaveTextContent('No cards match.');
      await user.tab();
      // After the hook's 150 ms blur delay, as the list would close.
      await waitFor(() => expect(screen.getByRole('status')).toBeEmptyDOMElement());
    });

    it('is never said while the card list is empty (loading, or failed)', async () => {
      const {user, input} = renderSwitcher([]);
      await user.type(input, 'zq');
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });
  });
});
```

Notes on the tests:
- **Timers.** They are real, with `findAllByRole`, which waits up to 1,000 ms against a 150 ms debounce. The one-letter case waits 200 ms (`pastTheDebounce`), so a switcher that searched from one letter would fail it.
- **The stale-list check.** "waits for the open list to close" checks the empty status only while the old list is still up. The pre-commit hook runs tests under load, where more than 150 ms can pass inside `user.type`. Dropping `listOpen` from `switcherStatus`'s guard still fails it on a normal run, and `cardSearch.test.ts` pins that guard anyway.
- **The highlight's class.** `adm-option` is the active option's only visual cue, so "highlights an option…" checks the class as well as `aria-selected`.
- **The route.** It is `/cards/:cardId?`, which keeps the switcher mounted across a pick, as R3-7's page does. Navigation shows in `router.state.location`, as in `UnsavedChangesGuard.test.tsx` and `router.test.tsx`.
- **No mocks.** The switcher takes its cards as a prop, and the hook and the search are the real bridged ones.

Run:

```bash
pnpm vitest run src/tools/analytics/cards/__tests__/CardSwitcher.test.tsx
```

Expected: `Test Files  1 failed (1)`, `Tests  no tests`, with `Error: Failed to resolve import "../CardSwitcher" from "src/tools/analytics/cards/__tests__/CardSwitcher.test.tsx". Does the file exist?`

- [ ] **Step 11: Add the switcher**

Create `src/tools/analytics/cards/CardSwitcher.tsx`:

```tsx
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {InkIcon, SPACING, TRUNCATE, Z_INDEX, useAutocomplete, type UseAutocompleteReturn} from '../../../app-bridge';
import {cardsHref} from '../../../shell/nav';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {MIN_QUERY, cardLabel, switcherStatus} from './cardSearch';

/** The handoff's "up to 6 results" (the hook's default is 10). */
const MAX_RESULTS = 6;
/** The handoff's ink icon size, in px. */
const INK_SIZE = 18;

// The handoff's 320px field, narrower when the header is. The list and the
// status float under it, over the page body.
const WRAP: React.CSSProperties = {position: 'relative', width: 320, maxWidth: '100%'};
const INPUT: React.CSSProperties = {width: '100%'};

// Under the field. Z_INDEX.autocomplete puts it over the page body and under the
// app's modal layers (the unsaved-changes dialog).
const FLOAT: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  margin: `${SPACING.xs}px 0 0`,
  zIndex: Z_INDEX.autocomplete,
};

// Opaque: the card fill laid over the page, as adminTheme.ts asks of anything
// that hides what is under it (UnsavedChangesGuard's panel does the same).
const SURFACE: React.CSSProperties = {
  background: `linear-gradient(${ADMIN_COLORS.card}, ${ADMIN_COLORS.card}), ${ADMIN_COLORS.page}`,
  border: `1px solid ${ADMIN_COLORS.strongBorder}`,
  borderRadius: ADMIN_RADIUS.box,
};

const LIST: React.CSSProperties = {...FLOAT, ...SURFACE, padding: 0, listStyle: 'none', overflow: 'hidden'};
const NOTE: React.CSSProperties = {
  ...SURFACE,
  margin: 0,
  padding: `${SPACING.sm}px ${SPACING.md}px`,
  fontSize: ADMIN_TYPE.small,
  color: ADMIN_COLORS.muted,
};
const INKS: React.CSSProperties = {display: 'flex', flex: 'none', gap: SPACING.xxs};
const LABEL: React.CSSProperties = {flex: 1, minWidth: 0, ...TRUNCATE};
// Muted, never dim: the number tells two printings apart (R-6).
const NUMBER: React.CSSProperties = {flex: 'none', fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted};

type OptionProps = ReturnType<UseAutocompleteReturn['getOptionProps']>;

/**
 * One result: the card's ink (both, for a dual-ink card), "name · version" and
 * its collector number. The highlight comes from aria-selected (adm-option).
 */
function CardOption({card, optionProps}: {card: LorcanaCard; optionProps: OptionProps}) {
  return (
    <li {...optionProps} className="adm-option">
      <span style={INKS}>
        <InkIcon ink={card.ink} size={INK_SIZE} />
        {card.ink2 && <InkIcon ink={card.ink2} size={INK_SIZE} />}
      </span>
      <span style={LABEL}>{cardLabel(card)}</span>
      {/* The space parts the number from the name in the option's accessible name; a flex row doesn't draw it. */}
      {card.setNumber != null && (
        <>
          {' '}
          <code style={NUMBER}>#{card.setNumber}</code>
        </>
      )}
    </li>
  );
}

interface CardSwitcherProps {
  /**
   * Every card the switcher can open: the card list's Core cards, preview
   * cards included (useCardDataContext().cards). Empty while it loads.
   */
  cards: LorcanaCard[];
}

/**
 * The Card analytics header's "Switch card" field (R-30): the app's
 * useAutocomplete as it is, so it searches names, from two letters, newest set
 * first, 150 ms after the last key, and handles the arrow keys, Enter, Escape
 * and the mouse. Picking a card opens its page and empties the field, which
 * keeps focus (R-48). A query that finds no card says so in a polite status.
 */
export function CardSwitcher({cards}: CardSwitcherProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const {inputProps, listboxProps, getOptionProps, suggestions, isOpen, isFocused} = useAutocomplete({
    cards,
    query,
    onQueryChange: setQuery,
    onSelect: (card) => navigate(cardsHref(card.id)),
    minChars: MIN_QUERY,
    maxResults: MAX_RESULTS,
  });
  const status = switcherStatus({cards, query, listOpen: isOpen, focused: isFocused});
  return (
    <div style={WRAP}>
      {/* type="text", not search: a search field's own Escape would empty it as the hook closes the list. */}
      <input
        {...inputProps}
        type="text"
        className="adm-input"
        aria-label="Switch card"
        placeholder="Switch card…"
        autoComplete="off"
        spellCheck={false}
        style={INPUT}
      />
      {isOpen && (
        <ul {...listboxProps} aria-label="Cards" style={LIST}>
          {suggestions.map((card, index) => (
            <CardOption key={card.id} card={card} optionProps={getOptionProps(index)} />
          ))}
        </ul>
      )}
      {/* Always mounted, so a screen reader hears the text when it appears. */}
      <div role="status" style={FLOAT}>
        {status && <p style={NOTE}>{status}</p>}
      </div>
    </div>
  );
}
```

Notes on the component:
- **Exports.** `CardSwitcher` is the file's only export. `CardOption` is private, and the helpers live in `cardSearch.ts`, so `react-refresh/only-export-components` holds.
- **The option row's props.** They come from the hook. Its markup follows the app's `SearchAutocomplete` (`shared/components/SearchAutocomplete.tsx:55-143`), which isn't bridged: it paints the app's surface (`COLORS.surface` and a gold ring shadow), not admin's.
- **The status, empty.** The empty status `div` is absolutely placed with no padding, so it takes no room and catches no clicks. Only its `<p>` draws the surface.
- **Shadow and placement.**
  - There is no drop shadow: admin has no shadow token, and `UnsavedChangesGuard`'s panel draws none either. The opaque fill and `strongBorder` separate it from the page.
  - The wrapper is `position: relative` with no z-index. It sits in PageLayout's header (`SIDE`, `PageLayout.tsx:40`, `:104-110`), and nothing above it makes a stacking context, so the list overlays the scrolling body.
- **Navigation.** `navigate()` returns a promise in a data router. The hook's `onSelect` ignores the return value, and admin's ESLint config has no type-checked promise rules.

Run:

```bash
pnpm vitest run src/tools/analytics/cards/__tests__/CardSwitcher.test.tsx
```

Expected: `Tests  14 passed (14)`, with no `act()` warning in the output.

Then run this task's five test files together:

```bash
pnpm vitest run src/shell/nav.test.ts src/theme/__tests__/AdminStyles.test.tsx src/tools/analytics/cards/__tests__/lastCard.test.ts src/tools/analytics/cards/__tests__/cardSearch.test.ts src/tools/analytics/cards/__tests__/CardSwitcher.test.tsx
```

Expected: `Test Files  5 passed (5)` and `Tests  64 passed (64)`: nav 20, AdminStyles 14, lastCard 7, cardSearch 9 and CardSwitcher 14.

- [ ] **Step 12: Add the story**

Create `src/tools/analytics/cards/CardSwitcher.stories.tsx`:

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {MemoryRouter} from 'react-router-dom';
import {userEvent, within} from 'storybook/test';
import {SPACING} from '../../../app-bridge';
import {SWITCHER_CARDS} from './cardFixtures';
import {CardSwitcher} from './CardSwitcher';

const meta: Meta<typeof CardSwitcher> = {
  title: 'Admin/Insights/Card analytics/Switcher',
  component: CardSwitcher,
  args: {cards: SWITCHER_CARDS},
  // At the header's right edge, on the card page's route: a pick navigates.
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/cards']}>
        <div style={{display: 'flex', justifyContent: 'flex-end', padding: SPACING.xxxl}}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

/** As the header shows it. */
export const Closed: Story = {};

/**
 * "mi" typed and the first result highlighted: six of the eight matches, newest
 * set first, with a dual-ink card, a card with no collector number, and the
 * highlight's row fill and bar. Click the canvas and the list closes; type again
 * to reopen it.
 */
export const Open: Story = {
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole('combobox', {name: 'Switch card'}), 'mi');
    await canvas.findAllByRole('option');
    await userEvent.keyboard('{ArrowDown}');
  },
};

/** Text that finds no card: the polite status where the list would be. */
export const NoMatch: Story = {
  play: async ({canvasElement}) => {
    await userEvent.type(within(canvasElement).getByRole('combobox', {name: 'Switch card'}), 'zq');
  },
};
```

Notes on the story:
- **Why it exists.** Only these stories render the switcher. R3-6's view stories don't, and the page has none.
- **Play functions.** `play` types through the instrumented `userEvent` of `storybook/test`, part of the `storybook` 10 package (`node_modules/storybook/package.json`, export `./test`). The a11y addon runs after `play`, so it checks the open list and the status.
- **The title.** It is a leaf under "Admin/Insights/Card analytics", the way Calibration's parts sit under "Admin/Insights/Calibration/…". So R3-6's view stories should take a leaf title too, such as "Admin/Insights/Card analytics/View", not the group's own name.
- **The decorator.** It is the MemoryRouter idiom of `Sidebar.stories.tsx:13-21`.

- [ ] **Step 13: Lint and typecheck**

```bash
pnpm lint
pnpm typecheck
```

Expected: both exit 0, with no warnings.

- [ ] **Step 14: Check the stories in the browser**

jsdom has no layout and no axe, so look at the switcher in Storybook, using this session's preview tools:
1. Start Storybook with the preview tool's `admin-storybook` configuration (`.claude/launch.json`), not `pnpm storybook` in a shell.
2. Open `http://localhost:6007/?path=/story/admin-insights-card-analytics-switcher--open`. When the Interactions panel shows the play function passed, check the canvas:
   - six rows under the field, opaque over the canvas, with rounded corners and a border;
   - Miss Bianca first, highlighted with the row fill and a gold bar at its left edge, and no `#` number;
   - Minnie Mouse · Musketeer Champion with two ink icons;
   - the numbers muted, and long names cut with an ellipsis, not wrapped.
3. Open the Accessibility panel. Expected: 0 violations. Colour contrast over the gradient fill may appear under "Incomplete": axe can't read a gradient. The theme's contrast tests cover those colours.
4. In the story's iframe (`http://localhost:6007/iframe.html?id=admin-insights-card-analytics-switcher--open&viewMode=story`), run this with the browser pane's JavaScript tool:
   ```js
   (() => {
     const list = document.querySelector('[role="listbox"]');
     const first = list.querySelector('[role="option"]');
     const style = getComputedStyle(list);
     return {
       name: list.getAttribute('aria-label'),
       options: list.children.length,
       selected: first.getAttribute('aria-selected'),
       bar: getComputedStyle(first).boxShadow,
       fill: style.backgroundImage,
       z: style.zIndex,
     };
   })();
   ```
   - Expected:
     - `name: 'Cards'`, `options: 6`, `selected: 'true'`;
     - `bar` an inset 2px shadow in the accent gold;
     - `fill` starting `linear-gradient(`;
     - `z: '900'`.
   - If `listbox` is null, the iframe lost focus and the list closed. Click the field, type "mi", press ArrowDown, and run it again.
5. Open the `NoMatch` story (`?path=/story/admin-insights-card-analytics-switcher--no-match`). "No cards match." sits under the field on the same surface, in muted text, and the Accessibility panel shows 0 violations. The status needs the field's focus, as the list does, so it empties 150 ms after the iframe loses focus. If the status is empty, the iframe lost focus: click the field, type "zq", and check again. Then open `Closed`: 0 violations.
6. Stop Storybook with the preview tool. A running preview server makes the pre-commit hook's Vitest fail to start its workers.

The real header (PageLayout's `actions`, its wrap on a phone) is checked in R3-7, which mounts the switcher.

- [ ] **Step 15: Run the full suite**

```bash
pnpm test:run
```

Expected: exit 0.

- [ ] **Step 16: Commit**

After the owner approves, with the Bash tool. Stage the files as one call:

```bash
git add src/shell/nav.ts src/shell/nav.test.ts src/theme/AdminStyles.tsx src/theme/__tests__/AdminStyles.test.tsx src/tools/analytics/cards/cardFixtures.ts src/tools/analytics/cards/lastCard.ts src/tools/analytics/cards/cardSearch.ts src/tools/analytics/cards/CardSwitcher.tsx src/tools/analytics/cards/CardSwitcher.stories.tsx src/tools/analytics/cards/__tests__/lastCard.test.ts src/tools/analytics/cards/__tests__/cardSearch.test.ts src/tools/analytics/cards/__tests__/CardSwitcher.test.tsx
```

Then, as its own unpiped call:

```bash
USER_APPROVED=1 git commit -m "feat(cards): add the switch-card combobox, cardsHref and the last card viewed (#24)"
```

<!--
Re-base pass on R3-5, 2026-10-06: every must_change item of audit-R3-5.json was checked against main @ aea40b4, the pin
bc877e1 and R-28 to R-56, and applied, with these choices where the audit left one open:
- The label helper went to a new cards/cardSearch.ts, with switcherStatus and MIN_QUERY, not to lastCard.ts: they are
  one concern (what the switcher shows), and storage is another.
- R-30's status also requires isFocused and a non-empty card list. Both are argued in the re-base notes. Neither
  changes what R-30 decided: the live-query check, the polite status, shown only while the list is closed.
- MIN_QUERY is passed to the hook as minChars (its default, 2) so the status and the list share one threshold. That is
  still "the hook as is".
- The audit's cardAnalyticsHref name is R-33's cardsHref.
- The story uses play functions, the repo's first. They type through storybook/test, which typechecks against the
  installed storybook 10.
-->

<!--
Review pass on R3-5, 2026-10-06: all eight review notes were checked against main @ aea40b4, R3-02-card-calibration.md, R3-04-engine-model.md, R3-04b-network-diagram.md
and R3-card-analytics.md, and applied. None was rejected.
- Note 1: AdminStyles.test.tsx has 12 cases at main and R3-4b adds one (R3-04b-network-diagram.md:1309), so 14 with R3-5's. R3-4b
  inserts .adm-net-link after AdminStyles.tsx:103, so the reduced-motion line moves to 115, and it adds no
  reduced-motion entry (R3-04b-network-diagram.md:985). R3-4c touches neither file.
- Note 3: Step 16's commit message wins. It names cardsHref and the last-card store, which the header's "add the card
  switcher" leaves out. The header edit is in the assembly notes.
- Note 4: the import goes first because R3-2's file opens with import type {PairStat, RuleStat} from
  '../voteAnalyticsTypes' (R3-02-card-calibration.md:145), and sandbox-R3-6a's later snapshot has the engine import first.
- Note 5: confirmed with eslint --rule complexity:0 through the repo config: switcherStatus 6, cardLabel 2, CardOption
  and CardSwitcher 3, readLastCard and forgetLastCard 3, writeLastCard 2.
- Notes 6 and 8, verified in scratchpad/r3-rebase/sandbox-R3-5-fix (a copy of sandbox-review-R3-5 with the new test):
  CardSwitcher.test.tsx gives 14 passed (14). With className="adm-option" removed, the highlight case fails on
  toHaveClass. With listOpen dropped from switcherStatus's guard, the stale-list case still fails. The test block
  passes eslint --max-warnings 0 --stdin from the repo.
-->
