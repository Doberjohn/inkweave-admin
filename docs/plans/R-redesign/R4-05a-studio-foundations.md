> Part of [R: Admin redesign](../R-redesign.md), phase R4 ([R4-card-studio.md](R4-card-studio.md)). Read the main plan's decisions (R-57 to R-91 for R4), corrections, global constraints and shared interfaces, then the R4 header, first.

> **Re-base notes (R4-5a, 2026-10-07).** Re-based from the outline's Task R4-5 (`R4-card-studio.md:601-810`) and its contract additions 1 to 3 (`:5-23`), written 2026-10-01 against the planned R1 code. The new base is `main @ e5e5029` (R1 to R3 as built, plus the pin bump), with pin `upstream/inkweave` @ `16283a13`. It also follows decisions R-57 to R-91 and the 2026-10-07 audit (`r4-audit-full.json`'s R4-5 entry, `r4-audit-synth.md`). What changed and why:
> 1. **R4-5 is now seven tasks: 5a to 5f, plus 5s and 5h.** This one lays the foundations and builds no component: `studioHref`, the studio's paths, its layout, its style constants, its `adm-*` classes and `InkwellIcon`. It needs nothing from R4-1a or R4-3a, which land before it. R4-5b to R4-5f, R4-6a and R4-6c consume what it makes (see "Hand-offs from R4-5a").
> 2. **`studioHref` and `StudioMode` live in `src/shell/nav.ts` (R-81),** beside `calibrationHref` and `cardsHref` (`nav.ts:45-60`).
>    - **Why the shell.** Card analytics' "Edit in Card studio" (R-82) and the router's redirects would otherwise import from `tools/studio`.
>    - **The code.** It is the header's (contract addition 3), with a longer doc comment: the redirects use it too, and an empty id names no card. It builds the query with `URLSearchParams`, so an id is encoded (`a&b c` becomes `a%26b+c`), and `studioCardOf` reads back exactly what it writes.
>    - **Hand count.** `nav.ts` goes from 4 parameters to 6, every one a string or `StudioMode`. CodeScene MCP 1.5.7 scores it 10.0. R4-8 runs `analyze_change_set` before the push (R-81).
> 3. **`studioPaths.ts` reads Location-like objects.** `StudioLocation` is `Pick<Location, 'pathname' | 'search'>`. A router `Location` and a `URL` both fit. The module has 0 primitive parameters in 9.
>    - **`studioModeOf(location)`.** The outline's sketch (`R4-card-studio.md:632` on main) has `studioModeOf(params: URLSearchParams)`. This task follows its brief, "over Location-like objects", as the header's addition 6 now does, for two reasons. R4-6a holds the `location` anyway: the guard's message needs `from`, and R-59's handoff watches the URL. And then every helper here speaks one type.
>    - **`studioCardOf(location)`.** It is the one reader of `?card=`. An empty `?card=` reads as no card, which is what `studioHref` writes for one.
>    - **`draftsAtRisk(from, to, dirty)`.** It names the drafts a navigation would drop, and `shouldBlockStudioNavigation` holds only when it names one. R-58 needs that list: a card change names only the Edit draft, and leaving `/studio` names every dirty draft. So R4-6a's `studioUnsavedMessage` builds on it, and the dialog's words can't disagree with the hold.
>    - **The blocking table.** It is the outline's (`:756-761`), as R2-5a's hand-off plugs it into `leaves` (`R2-05a-unsaved-guard.md:678-693`).
> 4. **`studioLayout.ts` (R-64, R-63).**
>    - **The threshold.** `STUDIO_WIDE_MIN` is 1328, computed as the handoff's 1360 less `2 * STUDIO_PADDING`. The handoff measured its root's border box (`dc.html:675-678`); `useContainerWidth` reads `contentRect` (upstream `useContainerWidth.ts:17`). So the number follows the padding if the padding ever changes.
>    - **`STUDIO_SLOT_ORDER`.** It holds R-63's DOM order: the card first when wide, the form first when narrow.
> 5. **No `StudioStyles.tsx` (R-41).** AdminStyles stays the one `<style>` (`AdminStyles.tsx:142-145`).
>    - **`studioStyles.ts`.** It holds the shared inline styles, as R3's `cardStyles.ts` does:
>      - `STUDIO_GRID`, the header's name: the measured root, wide or narrow;
>      - `STUDIO_SLOT`: each slot's place in it;
>      - `STUDIO_FORM`: the audit's "2×2 over the page's columns 2-3" when wide, and a stack when narrow;
>      - `STUDIO_GAP` and `STUDIO_PANEL`;
>      - `FIELD_LABEL`, `HINT` and `ERROR_TEXT`.
>    - **One rule its test pins.** The root's box (width, max width, margin, padding, box sizing) is the same in both layouts, so a layout switch can't move the measure across the threshold.
> 6. **Seven new `adm-*` classes.** These are the header's six (addition 5), plus `adm-file-cover`. Each is built from `ADMIN_*` tokens, the `SPACING` scale and named height constants, as `NAV_ITEM_HEIGHT` is (`AdminStyles.tsx:6-11`).
>    - **`adm-acc-head`.** The accordion header: the button inside its `h2`.
>      - `aria-expanded` turns a chevron that `::after` draws from two borders. It has no text content, so it adds nothing to the button's name.
>      - It rings inside (−2px), as a row does, because a section may clip its corners.
>    - **`adm-pick-btn`.** A rarity, Inkable or Uninkable button, full width so its parent's grid sizes it.
>      - With `adm-ink-tile` it is an ink tile: 48px, or 40px for the second-ink row with `data-size="sm"`. The header has this composition.
>      - The tile rules use the compound `.adm-pick-btn.adm-ink-tile`, so the tile's size wins whatever the rule order.
>      - The pressed fill and border are `adm-card-btn`'s (`AdminStyles.tsx:92`), admin's one selected look (R-75).
>    - **`adm-switch`.** A native checkbox with `role="switch"`. `appearance: none` drops the box, `::before` is the knob, and `:checked` golds the track and slides the knob.
>      - The off track is `barNeutral`, 3.3:1 on a card (R1-2's 1.4.11 value).
>      - The knob is the page colour, which reads on both tracks.
>    - **`adm-file-btn` and `adm-file-cover`.** Both are `<label>`s round `useHiddenFileInput`'s input, and both ring 2px out on `data-focused="true"`. A label never matches `:focus-visible`, so they stay out of `FOCUSABLE` and get their own assertion, as the audit asks.
>      - **Why two classes.** The header puts `adm-file-btn` on both the preview overlay and "Replace card image". They look nothing alike: one is a bordered button (the handoff's 36px Replace), the other an invisible layer over the preview with a hover edge. One class would need its look overridden inline on the overlay. `adm-file-cover` is the overlay's.
>    - **`adm-range`.** The cost slider.
>      - It is styled per engine (`::-webkit-slider-*`, `::-moz-range-*`), in separate rules: a selector list that names a pseudo-element the browser doesn't know is dropped whole. A test pins that no such list exists.
>      - `[data-unset="true"]` hides the thumb (opacity 0), so a blank cost never reads as 0.
>      - It has no transition, so it needs no reduced-motion entry.
>    - **Tests.** Each class joins `AdminStyles.test.tsx`'s `CLASSES`, plus `FOCUSABLE`, `PRESSABLE` and the reduced-motion block where it applies. Seven new cases cover the chevron, the one selected look, the tile sizes (computed in jsdom), the switch, the file rings, the per-engine slider rules and reduced motion.
> 7. **The bridge gains `InkwellIcon` only.** `InkIcon`, `RaritySymbol`, `rarityConfigOf` and the webps are bridged already (`app-bridge.ts:46`, `:76-82`). So appending the outline's four lines would have failed `tsc` (the audit's blocking item).
>    - **No `enchantedSymbol` either.** At the pin, `RaritySymbol` draws Enchanted (R-83), and R4-5h removes the webps.
>    - **The reveal-sync check, reworded.** The outline's premise, "No bridged module imports an asset today", was wrong. `InkIcon` and `RaritySymbol` already import SVG and WebP files, and they load under Vite's runner.
>      - `web.test.mjs` stays as a regression check for `InkwellIcon`'s two SVGs. It guards `loadSeason` (`web.mjs:47`), which `/fetch-reveals` and `variants.mjs` use.
>      - The test file is unchanged: R4-7 owns the reveal-sync wording.
> 8. **`SegmentedControl`'s doc comment (R-57).** It still says the studio resets its mode on a switch (`SegmentedControl.tsx:13-15`). This task rewrites those two sentences, so R4-6a doesn't: the header (addition 3, item 13) gives them to R4-5a.
> 9. **One story, `Admin/Theme` → `Studio Controls`.** It is the only visual check of these classes before R4-5b to R4-5d use them. The knob, the chevron and the hidden thumb are pseudo-elements, which jsdom doesn't draw. `axe-core` 4.13 finds no violations in it, with colour contrast left to Storybook.
>    - **Its ink tiles are R4-5c's markup:** no `aria-label`, and an `InkIcon` with `decorative={false}`, whose `alt` names the tile.
> 10. **Not taken from the outline:**
>     - the components and their tests, which are R4-5b to R4-5f;
>     - `StudioStyles.tsx` and its `stu-*` classes;
>     - three of the four bridge exports, and `enchantedSymbol`;
>     - `pnpm lint`, `pnpm test:run` and `pnpm build` inside the task (gates once).
> 11. **Code Health (CodeScene MCP 1.5.7, in a scratch git folder holding the changed files).**
>     - **Scores.** 10.0 with no findings for `nav.ts`, `studioPaths.ts`, `studioLayout.ts`, `AdminStyles.tsx`, `AdminTheme.stories.tsx` and the five test files. `studioStyles.ts` and `app-bridge.ts` get no score, because they hold no functions.
>     - **Complexity.** ESLint's `complexity` rule, through the repo config, gives these: `studioHref` 4, `CostDemo` 4, `draftsAtRisk` 3, `FileDemo` 3, and 2 or less elsewhere.
>     - **Arguments.** No function takes more than 3. Primitive parameters, by hand:
>       - `nav.ts`: 6 of 6;
>       - `studioPaths.ts`: 0 of 9;
>       - `studioLayout.ts`: 1 of 1, a one-function module like R3's `lastCard.ts`;
>       - `studioStyles.ts` and `AdminStyles.tsx`: none;
>       - the story's new demos: none;
>       - `studioPaths.test.ts`: `at(path)`, 1 of 1.
> 12. **Verified (2026-10-07)** in `scratchpad/r4-rebase/sandbox-R4-5a`.
>     - **Setup.** A copy of `src/`, `scripts/reveal-sync/` and the configs from the working tree: `main @ b490fb7` plus the uncommitted pin bump to `16283a13`. `node_modules` and `upstream/` are junctioned in. Vite's caches stay in the sandbox: `cacheDir` in its `vite.config.ts`, and a sandbox-only `cacheDir` in its `web.mjs` for `runnerImport`.
>     - **Failing first.** Each "watch it fail" output below was produced with the new code absent.
>     - **Passing.** The five test files give `Tests  91 passed (91)`: 29, 25, 7, 8 and 22. The whole `app` project gives 119 files and 1,549 tests passed. `web.test.mjs` passes its 2 tests with `InkwellIcon` bridged.
>     - **Mutants.** Each failed the tests: comparing `search` instead of the card in `draftsAtRisk`, dropping `atRisk.reveal` from the hold, and dropping `|| null` from `studioCardOf`. With main's stylesheet, 11 of the 22 AdminStyles cases fail.
>     - **Typecheck and lint.** `tsc -p tsconfig.app.json --noEmit` exits 0, story and tests included. `eslint --max-warnings 0` is clean on all 13 changed files, in the sandbox and through `pnpm exec eslint --stdin` in the repo.
>     - **Stories.** `Studio Controls` and `Controls` render in jsdom through `composeStories`, and `axe-core` 4.13 (colour contrast off) finds no violations.
>     - **Not run.** No Storybook or browser: Step 17 is the visual check.
>     - **Re-checked by the verifier** in `sandbox-v-R4-5a`, a fresh copy with every block applied from this file: each "Current" matched the working tree once. The five files gave 91 passed, and each fail-first output matched. jsdom honours specificity: the tile case still passed with the compound rules moved above `.adm-pick-btn{`. `tsc` exited 0, eslint was clean (the story through `--stdin` in the repo too), `web.test.mjs` passed, and CodeScene gave 10.0 to `nav.ts`, `studioPaths.ts`, the story and two test files. An axe probe of the story, with the tiles' `decorative={false}`, found no violations.

### Task R4-5a: Studio foundations: `studioHref`, the studio's paths, layout, styles and classes, and `InkwellIcon`

**Files:**
- Modify `src/shell/nav.ts`: `StudioMode` and `studioHref` appended after `cardsHref` (`:53-60`).
- Modify `src/shell/nav.test.ts`: the import (`:1`), and a `describe` appended after `:75`.
- Create in `src/tools/studio/` (R4-3a created the folder, with `readiness.ts`):
  - `studioLayout.ts`, `studioPaths.ts`, `studioStyles.ts`;
  - `__tests__/studioLayout.test.ts`, `__tests__/studioPaths.test.ts`, `__tests__/studioStyles.test.ts`.
- Modify `src/theme/AdminStyles.tsx`:
  - the height constants after `:11`;
  - a doc paragraph after `:67`;
  - the class rules after `:108`;
  - the focus lines (`:110-111`), the disabled line (`:113`) and the reduced-motion block (`:136`).
- Modify `src/theme/__tests__/AdminStyles.test.tsx`:
  - `CLASSES`, `FOCUSABLE` and `PRESSABLE` (`:32-45`);
  - the clip case (`:112-123`);
  - seven cases appended before the file's last `});` (`:202`).
- Modify `src/app-bridge.ts`: one export after `InkIcon` (`:46`).
- Modify `src/ui/SegmentedControl.tsx`: the doc comment's last two sentences (`:13-15`).
- Modify `src/theme/AdminTheme.stories.tsx`: the imports (`:1-5`), and a `StudioControls` story appended after `:253`.

**Interfaces:**
- **Consumes:**
  - `SPACING`, `COLORS`, `EASING`, `ALL_INKS`, `InkIcon`, `RaritySymbol` (bridged already), and the pinned app's `InkwellIcon`:
    ```ts
    // upstream shared/components/InkwellIcon.tsx:4, :24 (at 16283a13): not in the components barrel
    export type InkwellValue = 'inkable' | 'uninkable';
    export function InkwellIcon({value, size = 20, decorative = true}: InkwellIconProps); // an <img>, aria-hidden unless decorative is false
    ```
  - `ADMIN_COLORS`, `ADMIN_TYPE`, `ADMIN_RADIUS` (`src/theme/adminTheme.ts`).
  - `type Location` from `react-router-dom`, as `useUnsavedChangesGuard.ts:2` imports it.
  - `useHiddenFileInput` (`src/components/useHiddenFileInput.ts`: `{focused, inputProps}`), in the story only.
- **Produces:**
  ```ts
  // src/shell/nav.ts (R-81)
  export type StudioMode = 'new' | 'edit';
  export function studioHref(mode: StudioMode, cardId?: string | null): string;
  // '/studio', '/studio?card=14023', '/studio?mode=edit', '/studio?mode=edit&card=14023'; null or '' adds no card;
  // the id is encoded by URLSearchParams ('a&b c' -> 'a%26b+c')

  // src/tools/studio/studioPaths.ts: 0 primitive parameters
  export type StudioLocation = Pick<Location, 'pathname' | 'search'>;  // a router Location or a URL
  export interface StudioDrafts {reveal: boolean; edit: boolean}       // each draft's dirty
  export function studioModeOf(location: StudioLocation): StudioMode;  // ?mode=edit is 'edit'; anything else 'new'
  export function studioCardOf(location: StudioLocation): string | null; // ?card=, or null (an empty ?card= too)
  /** Leaving /studio: every dirty draft. Another card, or none: the Edit draft. A mode switch: none (R-57). */
  export function draftsAtRisk(from: StudioLocation, to: StudioLocation, dirty: StudioDrafts): StudioDrafts;
  /** UnsavedChangesGuard's `leaves`: true when draftsAtRisk names a draft. */
  export function shouldBlockStudioNavigation(from: StudioLocation, to: StudioLocation, dirty: StudioDrafts): boolean;

  // src/tools/studio/studioLayout.ts
  export type StudioLayout = 'wide' | 'narrow';
  export const STUDIO_PADDING: 16;                    // SPACING.lg, the measured root's padding
  export const STUDIO_WIDE_MIN: number;               // 1328 = 1360 - 2 * STUDIO_PADDING (R-64)
  export function studioLayout(width: number): StudioLayout; // 0 (unmeasured, and always in jsdom) is narrow
  export type StudioSlot = 'card' | 'form' | 'aside';
  export const STUDIO_SLOT_ORDER: Readonly<Record<StudioLayout, readonly StudioSlot[]>>; // R-63's DOM order

  // src/tools/studio/studioStyles.ts: inline styles, as cardStyles.ts
  export const STUDIO_GAP: 12;                                                     // SPACING.md
  export const STUDIO_GRID: Readonly<Record<StudioLayout, CSSProperties>>;         // the measured root
  export const STUDIO_SLOT: Readonly<Record<StudioLayout, Readonly<Record<StudioSlot, CSSProperties>>>>;
  export const STUDIO_FORM: Readonly<Record<StudioLayout, CSSProperties>>;         // StudioForm's root
  export const STUDIO_PANEL: CSSProperties;   // Panel's surface: card fill, border, panel radius
  export const FIELD_LABEL: CSSProperties;    // 12px, muted
  export const HINT: CSSProperties;           // 11px, muted (never dim, R-6)
  export const ERROR_TEXT: CSSProperties;     // 11px, COLORS.error, as PendingTray.tsx:68

  // src/app-bridge.ts
  export {InkwellIcon} from '../upstream/inkweave/apps/web/src/shared/components/InkwellIcon';

  // src/theme/AdminStyles.tsx: seven classes
  // adm-acc-head  : an accordion section's header, the <button> in its <h2>; [aria-expanded="true"] turns the ::after
  //                 chevron down; hover rowHover; ring inside (-2px)
  // adm-pick-btn  : a rarity, Inkable or Uninkable button, full width (its parent's grid sizes it), 34px tall;
  //                 [aria-pressed="true"] = adm-card-btn's fill and border (R-75); hover accentBorder; ring 2px out
  // adm-ink-tile  : with adm-pick-btn (className="adm-pick-btn adm-ink-tile"): a 48px ink tile; data-size="sm": 40px
  // adm-switch    : <input type="checkbox" role="switch">; :checked golds the track and slides the ::before knob
  // adm-file-btn  : a <label> round a hidden file input, as a bordered 36px button ("Replace card image");
  //                 data-focused="true" rings it 2px out
  // adm-file-cover: a <label> laid over the card preview (absolute, inset 0, radius preview, flex-end for a caption pill);
  //                 hover draws an inset accentStrong edge; data-focused="true" rings it 2px out
  // adm-range     : <input type="range">, the cost slider: barTrack track, accent thumb; data-unset="true" hides the thumb
  ```

**How it works:**
- **A studio URL** is `/studio`, with `?mode=edit` for Edit card and `?card=<id>` for the card. `studioHref` writes it, and `studioModeOf` and `studioCardOf` read it back.
- **A mode switch** changes only `mode` and keeps `card` (R-57). So `draftsAtRisk` compares only the pathname and the card:
  - a new pathname drops every dirty draft;
  - another card, or none, drops the Edit draft;
  - anything else drops nothing.
- **The layout** comes from the measured content width. 1328px and up is wide, and below it, including the unmeasured 0, is narrow.
  - **Wide:** a four-column grid (`minmax(320px, 400px) minmax(0, 1fr) minmax(0, 1fr) 280px`). The form slot spans the two middle columns, and inside it `STUDIO_FORM.wide` lays the four sections two by two, down each column, on the page's gap. So its columns are the page's columns 2 and 3 (README §7: Identity over Ink & rarity, Type & stats over Card text).
  - **Narrow:** the slots wrap with the handoff's flex values: form `0 1 400px` (300px at least), card `999 1 240px`, aside `1 1 280px`.

- [ ] **Step 1: Check what this task builds on**

From the repo root, on `feature/24-redesign-r4`:

```bash
git log --oneline main..HEAD
git submodule status upstream/inkweave
grep -n "export function InkwellIcon" upstream/inkweave/apps/web/src/shared/components/InkwellIcon.tsx
grep -nE "^export \{(InkIcon|InkwellIcon|RaritySymbol)\}" src/app-bridge.ts
grep -rnE "StudioMode|studioHref|studioLayout|studioPaths|studioStyles" src
grep -cE "adm-(acc-head|ink-tile|pick-btn|switch|file-btn|file-cover|range)" src/theme/AdminStyles.tsx
grep -n "Card studio's mode" src/ui/SegmentedControl.tsx
ls src/tools/studio
```

Expected:
- `git log` lists, newest first, R4-3a's `feat(studio): derive the reveal checklist and section dots from the validator (#24)`, R4-1a's `feat(reveal): replace one preview card in previewCards.json, fail-closed (#24)` and the plan commit. This task uses neither task's code.
- `git submodule status` prints ` 16283a13502106205b8ed15c7bb33e89e2fe4e6f upstream/inkweave …`, with no leading `+` or `-`.
- The `InkwellIcon` grep prints `24:export function InkwellIcon({value, size = 20, decorative = true}: InkwellIconProps) {`.
- The bridge grep prints two lines, `46:export {InkIcon} …` and `76:export {RaritySymbol} …`, and no `InkwellIcon`.
- The `src` grep prints nothing, and the count prints `0`.
- The `SegmentedControl` grep prints `14: * does nothing, so a parent that resets state on change (Card studio's mode)`.
- `ls` lists `__tests__` and `readiness.ts` (R4-3a). If the folder is missing, R4-3a hasn't landed. This task doesn't need it, so go on: the first file you create makes the folder.

If the submodule line starts with `+`, the checkout's pin isn't the branch's. Run `git submodule update` then `pnpm install --frozen-lockfile` (the "switching branches across pins" rule). If `pnpm build:engine` hasn't run since the pin, run it once: these tests reach the bridge.

- [ ] **Step 2: Write the failing tests for `studioHref`, and watch them fail**

In `src/shell/nav.test.ts`, line 1. Current:

```ts
import {NAV_ITEMS, calibrationHref, cardsHref, isWritePath, navItemFor} from './nav';
```

New:

```ts
import {NAV_ITEMS, calibrationHref, cardsHref, isWritePath, navItemFor, studioHref} from './nav';
```

At the end of the file, after the `cardsHref` block (`:65-75`), add:

```ts

describe('studioHref', () => {
  it.each([
    ['new', undefined, '/studio'],
    ['new', '14023', '/studio?card=14023'],
    ['edit', undefined, '/studio?mode=edit'],
    ['edit', '14023', '/studio?mode=edit&card=14023'],
    // What a page holds when the URL names no card: useSearchParams' null, or an empty ?card=.
    ['edit', null, '/studio?mode=edit'],
    ['edit', '', '/studio?mode=edit'],
    // Escaped, so an id always stays one parameter.
    ['edit', 'a&b c', '/studio?mode=edit&card=a%26b+c'],
  ] as const)('links %s mode, card %j, to %s', (mode, cardId, href) => {
    expect(studioHref(mode, cardId)).toBe(href);
  });
});
```

Run:

```bash
pnpm vitest run --project app src/shell/nav.test.ts
```

Expected: `Tests  7 failed | 22 passed (29)`. Each `studioHref` case fails with `TypeError: studioHref is not a function`.

- [ ] **Step 3: Add `StudioMode` and `studioHref`**

At the end of `src/shell/nav.ts`, after `cardsHref` (`:53-60`), add:

```ts

/** Card studio's two modes (R-57): New reveal, and Edit card. */
export type StudioMode = 'new' | 'edit';

/**
 * Card studio in a mode, opened on a card when one is given (R-81): what the
 * mode switch, the Edit search's rows, Card analytics' "Edit in Card studio"
 * and the old /reveal and /image redirects navigate to. New reveal is the bare
 * path, and the card rides along as ?card=, so a switch keeps it and Back
 * returns to the other mode (R-57). An empty id names no card.
 */
export function studioHref(mode: StudioMode, cardId?: string | null): string {
  const params = new URLSearchParams();
  if (mode === 'edit') params.set('mode', 'edit');
  if (cardId) params.set('card', cardId);
  const search = params.toString();
  return search ? `/studio?${search}` : '/studio';
}
```

R4-6a adds the Card studio nav item, not this task.

Run `pnpm vitest run --project app src/shell/nav.test.ts`. Expected: `Tests  29 passed (29)`.

- [ ] **Step 4: Write the failing tests for `studioLayout.ts`, and watch them fail**

Create `src/tools/studio/__tests__/studioLayout.test.ts`:

```ts
import {STUDIO_SLOT_ORDER, STUDIO_WIDE_MIN, studioLayout} from '../studioLayout';

describe('studioLayout', () => {
  it('switches where the handoff does: its 1360px border box is a 1328px content box (R-64)', () => {
    expect(STUDIO_WIDE_MIN).toBe(1328);
  });

  it.each([
    [0, 'narrow'],
    [1327.5, 'narrow'],
    [1328, 'wide'],
    // The widest root: 1600px less 16px of padding on each side.
    [1568, 'wide'],
  ] as const)('lays out %spx as %s', (width, layout) => {
    expect(studioLayout(width)).toBe(layout);
  });
});

describe('STUDIO_SLOT_ORDER', () => {
  it('puts the card panel first when wide, where it is the first column (R-63)', () => {
    expect(STUDIO_SLOT_ORDER.wide).toEqual(['card', 'form', 'aside']);
  });

  it('puts the form first when narrow, as the handoff orders it', () => {
    expect(STUDIO_SLOT_ORDER.narrow).toEqual(['form', 'card', 'aside']);
  });
});
```

Run:

```bash
pnpm vitest run --project app src/tools/studio/__tests__/studioLayout.test.ts
```

Expected: `Test Files  1 failed (1)`, `Tests  no tests`, with `Error: Failed to resolve import "../studioLayout" from "src/tools/studio/__tests__/studioLayout.test.ts". Does the file exist?`

- [ ] **Step 5: Add `studioLayout.ts`**

Create `src/tools/studio/studioLayout.ts`:

```ts
import {SPACING} from '../../app-bridge';

/**
 * The studio's two layouts (handoff README §7). Wide sets the card panel, the
 * form's four sections (two by two) and the aside in four columns, with every
 * section open. Narrow wraps the form, the card panel and the aside, and the
 * form becomes an accordion with one section open at a time.
 */
export type StudioLayout = 'wide' | 'narrow';

/** The padding inside the studio's measured root, on every side (README §7: 16px). */
export const STUDIO_PADDING = SPACING.lg;

// Where the handoff switches to wide: its root's width, padding included
// (getBoundingClientRect, dc.html:675-678).
const HANDOFF_WIDE_MIN = 1360;

/**
 * The narrowest root that lays out wide, in px of its content box (R-64):
 * useContainerWidth reads contentRect, which leaves out the padding, so the
 * handoff's 1360px border box is 1328px here. The narrow accordion takes over
 * below it.
 */
export const STUDIO_WIDE_MIN = HANDOFF_WIDE_MIN - 2 * STUDIO_PADDING;

/** The layout at a measured width. 0, the width before the first measure (and always in jsdom), is narrow. */
export function studioLayout(width: number): StudioLayout {
  return width >= STUDIO_WIDE_MIN ? 'wide' : 'narrow';
}

/** The three regions StudioWorkspace lays out. */
export type StudioSlot = 'card' | 'form' | 'aside';

/**
 * The regions in DOM order, which is the Tab order (R-63, WCAG 2.4.3): the
 * card panel first when wide, where it is the first column, and the form first
 * when narrow, as the handoff orders it. The workspace renders them as keyed
 * children, so a layout switch moves them and keeps their state.
 */
export const STUDIO_SLOT_ORDER: Readonly<Record<StudioLayout, readonly StudioSlot[]>> = {
  wide: ['card', 'form', 'aside'],
  narrow: ['form', 'card', 'aside'],
};
```

Run `pnpm vitest run --project app src/tools/studio/__tests__/studioLayout.test.ts`. Expected: `Tests  7 passed (7)`.

- [ ] **Step 6: Write the failing tests for `studioPaths.ts`, and watch them fail**

Create `src/tools/studio/__tests__/studioPaths.test.ts`:

```ts
import {studioHref} from '../../../shell/nav';
import {draftsAtRisk, shouldBlockStudioNavigation, studioCardOf, studioModeOf} from '../studioPaths';

// A URL has the pathname and search a router Location has.
const at = (path: string) => new URL(path, 'https://admin.test');

const CLEAN = {reveal: false, edit: false};
const REVEAL = {reveal: true, edit: false};
const EDIT = {reveal: false, edit: true};
const BOTH = {reveal: true, edit: true};

describe('studioModeOf', () => {
  it.each([
    ['/studio?mode=edit', 'edit'],
    ['/studio?mode=edit&card=14023', 'edit'],
    ['/studio', 'new'],
    ['/studio?card=14023', 'new'],
    ['/studio?mode=EDIT', 'new'],
  ] as const)('reads %s as %s', (path, mode) => {
    expect(studioModeOf(at(path))).toBe(mode);
  });

  it('reads back the mode studioHref writes', () => {
    expect(studioModeOf(at(studioHref('edit', '14023')))).toBe('edit');
    expect(studioModeOf(at(studioHref('new', '14023')))).toBe('new');
  });
});

describe('studioCardOf', () => {
  it.each([
    ['/studio?mode=edit&card=14023', '14023'],
    ['/studio?card=14023', '14023'],
    ['/studio?mode=edit', null],
    ['/studio?mode=edit&card=', null],
  ] as const)('reads %s as card %j', (path, card) => {
    expect(studioCardOf(at(path))).toBe(card);
  });

  it.each(['14023', 'a&b c', 'é/?#'])('reads back the id %j that studioHref writes', (id) => {
    expect(studioCardOf(at(studioHref('edit', id)))).toBe(id);
  });
});

describe('shouldBlockStudioNavigation', () => {
  it.each([
    {why: 'leaving the studio holds a New reveal draft', from: '/studio', to: '/', dirty: REVEAL, blocks: true},
    {why: 'leaving the studio holds an Edit draft', from: '/studio?mode=edit&card=1', to: '/cards/1', dirty: EDIT, blocks: true},
    {why: 'leaving with both drafts clean goes through', from: '/studio', to: '/', dirty: CLEAN, blocks: false},
    {why: 'another card holds an Edit draft', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', dirty: EDIT, blocks: true},
    {why: 'another card leaves a New reveal draft be', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit&card=2', dirty: REVEAL, blocks: false},
    {why: 'no card holds an Edit draft', from: '/studio?mode=edit&card=1', to: '/studio?mode=edit', dirty: EDIT, blocks: true},
    // R-57: both drafts stay mounted, so a mode switch never asks.
    {why: 'a switch to New reveal keeps both drafts', from: '/studio?mode=edit&card=14023', to: studioHref('new', '14023'), dirty: BOTH, blocks: false},
    {why: 'a switch to Edit card keeps both drafts', from: '/studio?card=14023', to: studioHref('edit', '14023'), dirty: BOTH, blocks: false},
    {why: 'a switch with no card keeps both drafts', from: '/studio', to: studioHref('edit'), dirty: BOTH, blocks: false},
  ])('$why', ({from, to, dirty, blocks}) => {
    expect(shouldBlockStudioNavigation(at(from), at(to), dirty)).toBe(blocks);
  });
});

describe('draftsAtRisk', () => {
  it('names every dirty draft when the navigation leaves the studio', () => {
    expect(draftsAtRisk(at('/studio?mode=edit&card=1'), at('/'), BOTH)).toEqual(BOTH);
    expect(draftsAtRisk(at('/studio'), at('/calibration'), REVEAL)).toEqual(REVEAL);
  });

  it('names only the Edit draft when the card changes', () => {
    expect(draftsAtRisk(at('/studio?mode=edit&card=1'), at('/studio?mode=edit&card=2'), BOTH)).toEqual(EDIT);
  });

  it('names none on a mode switch', () => {
    expect(draftsAtRisk(at('/studio?mode=edit&card=1'), at('/studio?card=1'), BOTH)).toEqual(CLEAN);
  });
});
```

Run:

```bash
pnpm vitest run --project app src/tools/studio/__tests__/studioPaths.test.ts
```

Expected: `Test Files  1 failed (1)`, `Tests  no tests`, with `Error: Failed to resolve import "../studioPaths" from "src/tools/studio/__tests__/studioPaths.test.ts". Does the file exist?`

- [ ] **Step 7: Add `studioPaths.ts`**

Create `src/tools/studio/studioPaths.ts`:

```ts
import type {Location} from 'react-router-dom';
import type {StudioMode} from '../../shell/nav';

/**
 * The parts of a location the studio reads. react-router's Location fits, and
 * so does a URL, which is how the tests build one.
 */
export type StudioLocation = Pick<Location, 'pathname' | 'search'>;

/** Which drafts hold unsaved edits: New reveal's form and Edit card's. */
export interface StudioDrafts {
  reveal: boolean;
  edit: boolean;
}

const NOTHING_AT_RISK: StudioDrafts = {reveal: false, edit: false};

const paramsOf = (location: StudioLocation) => new URLSearchParams(location.search);

/** The mode a studio URL opens: ?mode=edit is Edit card, anything else New reveal (studioHref's reverse). */
export function studioModeOf(location: StudioLocation): StudioMode {
  return paramsOf(location).get('mode') === 'edit' ? 'edit' : 'new';
}

/** The card a studio URL names (?card=), or null. An empty ?card= names none, as studioHref writes none. */
export function studioCardOf(location: StudioLocation): string | null {
  return paramsOf(location).get('card') || null;
}

/**
 * The drafts a navigation from `from` to `to` would drop (R-57, R-58).
 * - Leaving /studio drops every dirty draft.
 * - Inside it, another card, or none, drops the Edit draft: the editor is keyed
 *   by the card (R-59).
 * - A mode switch drops nothing: both drafts stay mounted, and studioHref keeps
 *   the card (R-57).
 */
export function draftsAtRisk(from: StudioLocation, to: StudioLocation, dirty: StudioDrafts): StudioDrafts {
  if (from.pathname !== to.pathname) return dirty;
  if (studioCardOf(from) === studioCardOf(to)) return NOTHING_AT_RISK;
  return {reveal: false, edit: dirty.edit};
}

/**
 * UnsavedChangesGuard's `leaves` for the studio: whether the navigation would
 * drop a draft. The page passes it the two drafts' `dirty` (R2-5a's hand-off).
 */
export function shouldBlockStudioNavigation(from: StudioLocation, to: StudioLocation, dirty: StudioDrafts): boolean {
  const atRisk = draftsAtRisk(from, to, dirty);
  return atRisk.reveal || atRisk.edit;
}
```

Run `pnpm vitest run --project app src/tools/studio/__tests__/studioPaths.test.ts`. Expected: `Tests  25 passed (25)`.

- [ ] **Step 8: Write the failing tests for `studioStyles.ts`, and watch them fail**

Create `src/tools/studio/__tests__/studioStyles.test.ts`:

```ts
import {SPACING} from '../../../app-bridge';
import {STUDIO_PADDING} from '../studioLayout';
import {STUDIO_FORM, STUDIO_GAP, STUDIO_GRID, STUDIO_SLOT} from '../studioStyles';

// The box useContainerWidth measures: what must not change with the layout.
const BOX = ['boxSizing', 'width', 'maxWidth', 'margin', 'padding'] as const;

describe('the studio layout styles', () => {
  it('pads the measured root by STUDIO_PADDING, which STUDIO_WIDE_MIN allows for', () => {
    expect(STUDIO_PADDING).toBe(SPACING.lg);
    expect(STUDIO_GRID.wide.padding).toBe(STUDIO_PADDING);
  });

  it.each(BOX)("keeps the root's %s the same in both layouts, so a switch can't move the measure", (key) => {
    expect(STUDIO_GRID.narrow[key]).toBe(STUDIO_GRID.wide[key]);
  });

  it("spans the form across the page's two middle columns when wide", () => {
    // The handoff's tracks: the card panel, two equal form columns, the aside.
    expect(STUDIO_GRID.wide.gridTemplateColumns).toBe('minmax(320px, 400px) minmax(0, 1fr) minmax(0, 1fr) 280px');
    expect(STUDIO_SLOT.wide).toMatchObject({card: {gridColumn: '1'}, form: {gridColumn: '2 / span 2'}, aside: {gridColumn: '4'}});
  });

  it("lines the form's two columns up with the page's: two equal columns on the page's gap", () => {
    expect(STUDIO_FORM.wide).toMatchObject({gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: STUDIO_GAP});
    expect(STUDIO_GRID.wide.gap).toBe(STUDIO_GAP);
  });
});
```

Run:

```bash
pnpm vitest run --project app src/tools/studio/__tests__/studioStyles.test.ts
```

Expected: `Test Files  1 failed (1)`, `Tests  no tests`, with `Error: Failed to resolve import "../studioStyles" from "src/tools/studio/__tests__/studioStyles.test.ts". Does the file exist?`

- [ ] **Step 9: Add `studioStyles.ts`**

Create `src/tools/studio/studioStyles.ts`:

```ts
import type {CSSProperties} from 'react';
import {COLORS, SPACING} from '../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../theme/adminTheme';
import {STUDIO_PADDING, type StudioLayout, type StudioSlot} from './studioLayout';

/*
 * The styles Card studio's parts share (R4): the page's layout, its panels and
 * the text its fields and notes print. Inline, as cardStyles.ts is for the card
 * page: hover, focus and selected states are adm-* classes in AdminStyles
 * (R-41). The layout follows the handoff (README §7).
 */

/** The gap between the studio's panels, across and down (12px). */
export const STUDIO_GAP = SPACING.md;

// The handoff's widest studio, padding included.
const STUDIO_MAX_WIDTH = 1600;

// The same box in both layouts, so a layout switch never moves the measured
// width across STUDIO_WIDE_MIN and back.
const ROOT_BOX: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  maxWidth: STUDIO_MAX_WIDTH,
  margin: '0 auto',
  padding: STUDIO_PADDING,
  gap: STUDIO_GAP,
};

/**
 * StudioWorkspace's root, the element useContainerWidth measures. Wide: the
 * card panel's column, two equal columns for the form and the aside's, each
 * slot as tall as the tallest. Narrow: the slots wrap, each at its own height.
 */
export const STUDIO_GRID: Readonly<Record<StudioLayout, CSSProperties>> = {
  wide: {
    ...ROOT_BOX,
    display: 'grid',
    gridTemplateColumns: 'minmax(320px, 400px) minmax(0, 1fr) minmax(0, 1fr) 280px',
  },
  narrow: {...ROOT_BOX, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start'},
};

/**
 * Where each slot sits. Wide: the form spans the two middle columns. Narrow:
 * the form keeps 300-400px, the card panel takes the free width, and the aside
 * wraps under them when it doesn't fit.
 */
export const STUDIO_SLOT: Readonly<Record<StudioLayout, Readonly<Record<StudioSlot, CSSProperties>>>> = {
  wide: {
    card: {gridColumn: '1', minWidth: 0},
    form: {gridColumn: '2 / span 2', minWidth: 0},
    aside: {gridColumn: '4', minWidth: 0},
  },
  narrow: {
    form: {flex: '0 1 400px', minWidth: 300},
    card: {flex: '999 1 240px', minWidth: 0},
    aside: {flex: '1 1 280px', minWidth: 0},
  },
};

/**
 * StudioForm's root, inside the form slot. Wide: two by two, filled down each
 * column (Identity over Ink & rarity, Type & stats over Card text), on the
 * same gap as the page, so its columns are the page's middle two and each row
 * is as tall as its taller section. Narrow: the accordion's sections in a stack.
 */
export const STUDIO_FORM: Readonly<Record<StudioLayout, CSSProperties>> = {
  wide: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gridTemplateRows: 'auto auto',
    gridAutoFlow: 'column',
    gap: STUDIO_GAP,
  },
  narrow: {display: 'flex', flexDirection: 'column', gap: STUDIO_GAP},
};

/**
 * A studio panel: a form section, the card panel, an aside box. The surface is
 * Panel's (src/ui), so these sit beside the aside's Panels as one set; the
 * translucent fill stops at the border (R1-2).
 */
export const STUDIO_PANEL: CSSProperties = {
  minWidth: 0,
  backgroundColor: ADMIN_COLORS.card,
  backgroundClip: 'padding-box',
  border: `1px solid ${ADMIN_COLORS.border}`,
  borderRadius: ADMIN_RADIUS.panel,
};

/** A field's or a picker's label, over its control. */
export const FIELD_LABEL: CSSProperties = {fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};

/** A hint under a control, or a note under the preview: muted, never dim (R-6). */
export const HINT: CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted};

/** A validator message beside its control (the spec's "next to its control"), as PendingTray prints one. */
export const ERROR_TEXT: CSSProperties = {margin: 0, fontSize: ADMIN_TYPE.label, color: COLORS.error};
```

Run `pnpm vitest run --project app src/tools/studio/__tests__/studioStyles.test.ts`. Expected: `Tests  8 passed (8)`.

- [ ] **Step 10: Write the failing tests for the studio's classes, and watch them fail**

In `src/theme/__tests__/AdminStyles.test.tsx`, three hunks. Line numbers are main's, and each hunk moves the lines after it, so find each by its text.

The lists (lines 32-45). Current:

```ts
  // The network diagram's node links (R3-4b).
  'adm-net-link',
];
const FOCUSABLE = [
  'adm-nav-item',
  'adm-seg-btn',
  'adm-row-btn',
  'adm-card-btn',
  'adm-input',
  'adm-select',
  'adm-chart-hit',
  'adm-link',
];
const PRESSABLE = ['adm-seg-btn', 'adm-row-btn', 'adm-card-btn', 'adm-chart-hit'];
```

New:

```ts
  // The network diagram's node links (R3-4b).
  'adm-net-link',
  // Card studio's controls (R4-5a).
  'adm-acc-head',
  'adm-ink-tile',
  'adm-pick-btn',
  'adm-switch',
  'adm-file-btn',
  'adm-file-cover',
  'adm-range',
];
const FOCUSABLE = [
  'adm-nav-item',
  'adm-seg-btn',
  'adm-row-btn',
  'adm-card-btn',
  'adm-input',
  'adm-select',
  'adm-chart-hit',
  'adm-link',
  'adm-acc-head',
  'adm-pick-btn',
  'adm-switch',
  'adm-range',
];
const PRESSABLE = ['adm-seg-btn', 'adm-row-btn', 'adm-card-btn', 'adm-chart-hit', 'adm-pick-btn'];
```

Two classes stay out of `FOCUSABLE` and `PRESSABLE`:
- `adm-ink-tile` only sizes an `adm-pick-btn`, whose rules it shares.
- The file labels never take focus themselves. They get their own case below.

The clip case (lines 112-123). Current:

```tsx
  it('clips translucent fills to the padding box, a selected card included', () => {
    render(
      <>
        <AdminStyles />
        <div role="group" aria-label="Score band" className="adm-seg" />
        <button type="button" className="adm-card-btn" aria-pressed="true">Searches</button>
        <input aria-label="Search pairs" className="adm-input" />
      </>,
    );
    const filled = [screen.getByRole('group'), screen.getByRole('button'), screen.getByRole('textbox')];
```

New:

```tsx
  it('clips translucent fills to the padding box, selected cards, tiles and picks included', () => {
    render(
      <>
        <AdminStyles />
        <div role="group" aria-label="Score band" className="adm-seg" />
        <button type="button" className="adm-card-btn" aria-pressed="true">Searches</button>
        <button type="button" className="adm-pick-btn adm-ink-tile" aria-pressed="true" aria-label="Amber" />
        <button type="button" className="adm-pick-btn" aria-pressed="true">Rare</button>
        <input aria-label="Search pairs" className="adm-input" />
      </>,
    );
    const filled = [screen.getByRole('group'), ...screen.getAllByRole('button'), screen.getByRole('textbox')];
```

The case's last line (the `for` over `filled`) is unchanged.

After the last case, `underlines a card link in the muted colour, golds it on hover and rings it 2px out (R3-8)` (lines 194-201), and before the file's closing `});`, add:

```tsx

  it("turns an accordion header's chevron on aria-expanded, and rings the header inside, as a row (R4)", () => {
    const css = stylesheet();
    expect(css).toContain('.adm-acc-head[aria-expanded="true"]::after{transform:rotate(45deg);}');
    // Drawn from two borders with no content, so the chevron adds nothing to the button's name.
    expect(css).toContain('.adm-acc-head::after{content:"";');
    expect(css).toContain(`.adm-acc-head:focus-visible{outline:2px solid ${ADMIN_COLORS.accent};outline-offset:-2px;}`);
  });

  it("gives a pick button, an ink tile's too, adm-card-btn's pressed fill and border, admin's one selected look (R-75)", () => {
    const css = stylesheet();
    const look = `background-color:${ADMIN_COLORS.accentTintSoft};border-color:${ADMIN_COLORS.accentStrong};`;
    expect(css).toContain(`.adm-card-btn[aria-pressed="true"]{${look}}`);
    expect(css).toContain(`.adm-pick-btn[aria-pressed="true"]{${look}color:${ADMIN_COLORS.text};}`);
  });

  it('sizes an ink tile at 48px and a second-ink tile at 40px, where a plain pick button fills its cell', () => {
    render(
      <>
        <AdminStyles />
        <button type="button" className="adm-pick-btn adm-ink-tile" aria-label="Amber" />
        <button type="button" className="adm-pick-btn adm-ink-tile" data-size="sm" aria-label="Ruby" />
        <button type="button" className="adm-pick-btn">Rare</button>
      </>,
    );
    expect(getComputedStyle(screen.getByRole('button', {name: 'Rare'})).width).toBe('100%');
    expect(getComputedStyle(screen.getByRole('button', {name: 'Amber'})).width).toBe('48px');
    expect(getComputedStyle(screen.getByRole('button', {name: 'Ruby'})).width).toBe('40px');
  });

  it('golds a checked switch and slides its knob to the far end', () => {
    const css = stylesheet();
    expect(css).toContain(`.adm-switch:checked{background-color:${ADMIN_COLORS.accent};}`);
    // The 34px track less the 20px of its height: the knob keeps its 2px inset at both ends.
    expect(css).toContain('.adm-switch:checked::before{transform:translateX(14px);}');
  });

  it('rings a file label while its hidden input has focus, 2px out as a control is ringed', () => {
    const css = stylesheet();
    expect(css).toContain(
      `.adm-file-btn[data-focused="true"],.adm-file-cover[data-focused="true"]{outline:2px solid ${ADMIN_COLORS.accent};outline-offset:2px;}`,
    );
    // A <label> never matches :focus-visible itself, so FOCUSABLE leaves both out.
    expect(css).not.toContain('.adm-file-btn:focus-visible');
    expect(css).not.toContain('.adm-file-cover:focus-visible');
  });

  it("hides the cost slider's thumb while the cost is unset, in each engine's own rule", () => {
    const css = stylesheet();
    expect(css).toContain('.adm-range[data-unset="true"]::-webkit-slider-thumb{opacity:0;}');
    expect(css).toContain('.adm-range[data-unset="true"]::-moz-range-thumb{opacity:0;}');
    // An engine drops a whole selector list that names a pseudo-element it doesn't know.
    const vendored = [...css.matchAll(/([^{}]*::-(?:webkit|moz)-[^{]*)\{/g)].map(([, selector]) => selector.trim());
    expect(vendored).toHaveLength(8);
    for (const selector of vendored) expect(selector).not.toContain(',');
  });

  it("switches the studio controls' transitions off for reduced motion", () => {
    const reduced = /@media \(prefers-reduced-motion: reduce\)\{([\s\S]*?)\n\}/.exec(stylesheet())?.[1] ?? '';
    for (const name of ['adm-acc-head', 'adm-pick-btn', 'adm-switch', 'adm-file-btn', 'adm-file-cover']) {
      expect(reduced, name).toMatch(new RegExp(`[.]${name}(?![a-z-])[^{]*[{]transition:none;[}]`));
    }
    // The chevron and the knob turn and slide by transitions of their own.
    expect(reduced).toMatch(/[.]adm-acc-head::after[^{]*[{]transition:none;[}]/);
    expect(reduced).toMatch(/[.]adm-switch::before[^{]*[{]transition:none;[}]/);
  });
```

`adm-range` has no transition, so it needs no reduced-motion entry.

Run:

```bash
pnpm vitest run --project app src/theme/__tests__/AdminStyles.test.tsx
```

Expected: `Tests  11 failed | 11 passed (22)`. The failures:
- `defines every adm-* class in the contract`: `expected '\n.adm-nav-item{display:flex;align-it…' to match /[.]adm-acc-head(?![a-z-])/`
- `gives every interactive class a hover state and a gold focus-visible ring`: `… to contain '.adm-acc-head:hover'`
- `reads selection from ARIA state, not from a class`: `… to contain '.adm-pick-btn[aria-pressed="true"]'`
- `clips translucent fills to the padding box, selected cards, tiles and picks included`: `adm-pick-btn adm-ink-tile: expected 'border-box' to be 'padding-box'`
- `sizes an ink tile at 48px …`: `expected 'auto' to be '100%'`
- `switches the studio controls' transitions off for reduced motion`: `adm-acc-head: expected '\n.adm-link{transition:none;}…' to match …`
- the other five new cases, each with `… to contain '…'` on its first assertion.

- [ ] **Step 11: Add the studio's classes**

In `src/theme/AdminStyles.tsx`, five hunks, in this order. Line numbers are main's, and each hunk moves the lines after it, so find each by its text.

1. **The heights**, after `const SEG_BUTTON_HEIGHT = 32;` (line 11). Add:

```ts
// Card studio's controls (R4), sized as the handoff draws them (README §7).
const CHEVRON_SIZE = 6;
const INK_TILE_SIZE = 48;
const INK_TILE_SIZE_SM = 40;
const PICK_HEIGHT = 34;
const FILE_BUTTON_HEIGHT = 36;
const SWITCH_WIDTH = 34;
const SWITCH_HEIGHT = 20;
const SWITCH_INSET = 2;
const SWITCH_KNOB = SWITCH_HEIGHT - 2 * SWITCH_INSET;
const RANGE_HEIGHT = 20;
const RANGE_MIN_WIDTH = 60;
const RANGE_TRACK = 4;
const RANGE_THUMB = 16;
```

2. **The doc comment's end** (lines 66-68). Current:

```ts
 * plain one. Hover golds it. Its ring sits 2px out, as a control's does, and
 * a line that clips keeps room for it (CardName's PairLine).
 */
```

New:

```ts
 * plain one. Hover golds it. Its ring sits 2px out, as a control's does, and
 * a line that clips keeps room for it (CardName's PairLine).
 *
 * Card studio's controls (R4):
 * - adm-acc-head is an accordion section's header, the button inside its h2.
 *   aria-expanded turns its chevron, which ::after draws from two borders, so
 *   it adds nothing to the button's name. It rings inside, as a row does.
 * - adm-pick-btn is a compact pressable: a rarity, Inkable or Uninkable, full
 *   width so the parent's grid sizes it, or, with adm-ink-tile, an ink's 48px
 *   tile (data-size="sm": the second-ink row's 40px). Its pressed fill and
 *   border are adm-card-btn's, admin's one selected look (R-75).
 * - adm-switch is a native checkbox with role="switch" (Dual-ink card):
 *   :checked golds the track and moves the knob, its ::before.
 * - A file control is a <label> round a visually hidden file input
 *   (useHiddenFileInput). The input takes the focus, so the label rings on
 *   data-focused="true", from the hook's `focused`. adm-file-btn is a bordered
 *   button (Replace card image); adm-file-cover lies over the card preview.
 * - adm-range is the cost slider. data-unset="true" hides its thumb, so a
 *   blank cost never reads as 0. Its track and thumb rules repeat per engine:
 *   a selector list with a pseudo-element the browser doesn't know is dropped
 *   whole.
 */
```

3. **The rules**, after `.adm-link:focus-visible{${FOCUS_RING}outline-offset:2px;}` (line 108). Add:

```ts

.adm-acc-head{display:flex;align-items:center;gap:${SPACING.md}px;width:100%;margin:0;padding:${SPACING.section}px ${SPACING.lg}px;border:none;border-radius:0;background:transparent;color:${C.text};font:inherit;font-size:${T.body}px;font-weight:700;text-align:left;cursor:pointer;transition:background-color ${FAST};}
.adm-acc-head::after{content:"";flex:none;width:${CHEVRON_SIZE}px;height:${CHEVRON_SIZE}px;margin-left:auto;border-right:2px solid ${C.muted};border-bottom:2px solid ${C.muted};transform:rotate(-45deg);transition:transform ${FAST};}
.adm-acc-head[aria-expanded="true"]::after{transform:rotate(45deg);}
.adm-acc-head:hover${ENABLED}{background:${C.rowHover};}

.adm-pick-btn{display:flex;align-items:center;gap:${SPACING.sm}px;width:100%;min-width:0;min-height:${PICK_HEIGHT}px;margin:0;padding:0 ${SPACING.sm}px;background-color:transparent;background-clip:padding-box;border:1px solid ${C.inputBorder};border-radius:${R.control}px;color:${C.muted};font:inherit;font-size:${T.small}px;text-align:left;white-space:nowrap;cursor:pointer;transition:background-color ${FAST},border-color ${FAST},color ${FAST};}
.adm-pick-btn.adm-ink-tile{flex:none;justify-content:center;width:${INK_TILE_SIZE}px;height:${INK_TILE_SIZE}px;padding:0;border-radius:${R.panel}px;}
.adm-pick-btn.adm-ink-tile[data-size="sm"]{width:${INK_TILE_SIZE_SM}px;height:${INK_TILE_SIZE_SM}px;border-radius:${R.box}px;}
.adm-pick-btn:hover${ENABLED}{border-color:${C.accentBorder};color:${C.text};}
.adm-pick-btn[aria-pressed="true"]{background-color:${C.accentTintSoft};border-color:${C.accentStrong};color:${C.text};}

.adm-switch{appearance:none;position:relative;flex:none;width:${SWITCH_WIDTH}px;height:${SWITCH_HEIGHT}px;margin:0;border:none;border-radius:${R.pill}px;background-color:${C.barNeutral};cursor:pointer;transition:background-color ${FAST},box-shadow ${FAST};}
.adm-switch::before{content:"";position:absolute;top:${SWITCH_INSET}px;left:${SWITCH_INSET}px;width:${SWITCH_KNOB}px;height:${SWITCH_KNOB}px;border-radius:${R.pill}px;background:${C.page};transition:transform ${FAST};}
.adm-switch:checked{background-color:${C.accent};}
.adm-switch:checked::before{transform:translateX(${SWITCH_WIDTH - SWITCH_HEIGHT}px);}
.adm-switch:hover${ENABLED}{box-shadow:0 0 0 1px ${C.accentBorder};}

.adm-file-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:${SPACING.sm}px;min-height:${FILE_BUTTON_HEIGHT}px;padding:0 ${SPACING.section}px;border:1px solid ${C.strongBorder};border-radius:${R.control}px;color:${C.text};font-size:${T.body}px;font-weight:600;white-space:nowrap;cursor:pointer;transition:border-color ${FAST},color ${FAST};}
.adm-file-btn:hover{border-color:${C.accentStrong};color:${C.accent};}
.adm-file-cover{position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;border-radius:${R.preview}px;cursor:pointer;transition:box-shadow ${FAST};}
.adm-file-cover:hover{box-shadow:inset 0 0 0 1px ${C.accentStrong};}
.adm-file-btn[data-focused="true"],.adm-file-cover[data-focused="true"]{${FOCUS_RING}outline-offset:2px;}

.adm-range{appearance:none;display:block;flex:1 1 auto;min-width:${RANGE_MIN_WIDTH}px;height:${RANGE_HEIGHT}px;margin:0;background:transparent;cursor:pointer;}
.adm-range::-webkit-slider-runnable-track{height:${RANGE_TRACK}px;border-radius:${R.tag}px;background:${C.barTrack};}
.adm-range::-moz-range-track{height:${RANGE_TRACK}px;border-radius:${R.tag}px;background:${C.barTrack};}
.adm-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:${RANGE_THUMB}px;height:${RANGE_THUMB}px;margin-top:${(RANGE_TRACK - RANGE_THUMB) / 2}px;border:none;border-radius:${R.pill}px;background:${C.accent};}
.adm-range::-moz-range-thumb{width:${RANGE_THUMB}px;height:${RANGE_THUMB}px;border:none;border-radius:${R.pill}px;background:${C.accent};}
.adm-range:hover${ENABLED}::-webkit-slider-thumb{background:${C.accentHover};}
.adm-range:hover${ENABLED}::-moz-range-thumb{background:${C.accentHover};}
.adm-range[data-unset="true"]::-webkit-slider-thumb{opacity:0;}
.adm-range[data-unset="true"]::-moz-range-thumb{opacity:0;}
```

These rules sit after the hover rules they must beat:
- **The pressed rule** comes after the hover rule. Both are (0,2,0), so a hovered selected button keeps its gold border.
- **The tile's size** is a compound `.adm-pick-btn.adm-ink-tile` (0,2,0), so it beats `.adm-pick-btn`'s `width:100%` wherever it sits.

4. **Focus and disabled** (lines 110-113). Current:

```ts
.adm-nav-item:focus-visible,.adm-seg-btn:focus-visible,.adm-card-btn:focus-visible,.adm-input:focus-visible,.adm-select:focus-visible,.adm-net-link:focus-visible{${FOCUS_RING}outline-offset:2px;}
.adm-row-btn:focus-visible{${FOCUS_RING}outline-offset:-2px;}

.adm-seg-btn:disabled,.adm-row-btn:disabled,.adm-card-btn:disabled,.adm-input:disabled,.adm-select:disabled{opacity:.4;cursor:not-allowed;}
```

New:

```ts
.adm-nav-item:focus-visible,.adm-seg-btn:focus-visible,.adm-card-btn:focus-visible,.adm-input:focus-visible,.adm-select:focus-visible,.adm-net-link:focus-visible{${FOCUS_RING}outline-offset:2px;}
.adm-pick-btn:focus-visible,.adm-switch:focus-visible,.adm-range:focus-visible{${FOCUS_RING}outline-offset:2px;}
.adm-row-btn:focus-visible,.adm-acc-head:focus-visible{${FOCUS_RING}outline-offset:-2px;}

.adm-seg-btn:disabled,.adm-row-btn:disabled,.adm-card-btn:disabled,.adm-input:disabled,.adm-select:disabled{opacity:.4;cursor:not-allowed;}
.adm-acc-head:disabled,.adm-pick-btn:disabled,.adm-switch:disabled,.adm-range:disabled{opacity:.4;cursor:not-allowed;}
```

5. **Reduced motion**, after `.adm-nav-item,.adm-nav-mark,.adm-seg-btn,.adm-row-btn,.adm-card-btn,.adm-input,.adm-select,.adm-hover-row,.adm-option{transition:none;}` (line 136). Add:

```ts
.adm-acc-head,.adm-acc-head::after,.adm-pick-btn,.adm-switch,.adm-switch::before,.adm-file-btn,.adm-file-cover{transition:none;}
```

Run `pnpm vitest run --project app src/theme/__tests__/AdminStyles.test.tsx`. Expected: `Tests  22 passed (22)`. The existing token cases pass too: colours only from `COLORS` and `ADMIN_COLORS`, and font sizes and radii on the scales.

- [ ] **Step 12: Bridge `InkwellIcon`, and check reveal-sync still loads the bridge**

In `src/app-bridge.ts`, after line 46 (`export {InkIcon} from '../upstream/inkweave/apps/web/src/shared/components/InkIcon';`), add:

```ts
// Inkable or Uninkable, as the app draws them (Card studio's Inkable buttons).
export {InkwellIcon} from '../upstream/inkweave/apps/web/src/shared/components/InkwellIcon';
```

Nothing else in the bridge changes. `InkIcon`, `RaritySymbol` and `rarityConfigOf` are bridged already, and R4-5h removes the webps (R-83).

Run:

```bash
pnpm vitest run --project scripts scripts/reveal-sync/web.test.mjs
```

Expected: `Tests  2 passed (2)`. `web.mjs:47` loads the bridge through Vite's `runnerImport` for `/fetch-reveals` and `variants.mjs`. The bridge already imported SVG and WebP files (`InkIcon`, `RaritySymbol`), and `InkwellIcon`'s two SVGs load the same way.

- [ ] **Step 13: Reword `SegmentedControl`'s doc comment (R-57)**

In `src/ui/SegmentedControl.tsx`, lines 13-15. Current:

```ts
 * (`.adm-seg-btn[aria-pressed="true"]`). Pressing the selected option again
 * does nothing, so a parent that resets state on change (Card studio's mode)
 * can't lose work to a stray click.
```

New:

```ts
 * (`.adm-seg-btn[aria-pressed="true"]`). Pressing the selected option again
 * does nothing, so onChange fires only for a real change: Card studio's mode
 * switch keeps both drafts and pushes a URL (R-57), and a stray click on the
 * current mode adds no history entry.
```

The code doesn't change.

- [ ] **Step 14: Add the studio controls' story**

In `src/theme/AdminTheme.stories.tsx`, the imports (lines 1-5). Current:

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {MemoryRouter, NavLink} from 'react-router-dom';
import {FONTS, SPACING} from '../app-bridge';
import {ADMIN_COLORS, ADMIN_LAYOUT, ADMIN_RADIUS, ADMIN_TYPE} from './adminTheme';
```

New:

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import type {Ink} from 'inkweave-synergy-engine';
import {useState} from 'react';
import {MemoryRouter, NavLink} from 'react-router-dom';
import {ALL_INKS, FONTS, InkIcon, InkwellIcon, RaritySymbol, SPACING} from '../app-bridge';
import {useHiddenFileInput} from '../components/useHiddenFileInput';
import {ADMIN_COLORS, ADMIN_LAYOUT, ADMIN_RADIUS, ADMIN_TYPE} from './adminTheme';
```

At the end of the file, after `export const Controls: Story = {render: () => <ControlsDemo />};` (line 253), add:

```tsx

// Card studio's controls (R4-5a), before the studio's own components use them.
const ROW: React.CSSProperties = {display: 'flex', flexWrap: 'wrap', gap: SPACING.xs};
const INLINE: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: SPACING.sm, fontSize: ADMIN_TYPE.body};
const PICK_GRID: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))', gap: SPACING.xs};
const PILL: React.CSSProperties = {
  margin: SPACING.md,
  padding: `${SPACING.xs}px ${SPACING.md}px`,
  borderRadius: ADMIN_RADIUS.pill,
  backgroundColor: ADMIN_COLORS.page,
  fontSize: ADMIN_TYPE.small,
  color: ADMIN_COLORS.text,
};
const ACC_BODY: React.CSSProperties = {fontSize: ADMIN_TYPE.small, color: ADMIN_COLORS.muted};
const ACCEPT = 'image/jpeg,image/png,image/webp';
const RARITY_SAMPLES = [
  {label: 'Common', key: 'common'},
  {label: 'Rare', key: 'rare'},
  {label: 'Super Rare', key: 'super rare'},
  {label: 'Legendary', key: 'legendary'},
] as const;
const INKWELLS = [
  {value: 'inkable', label: 'Inkable'},
  {value: 'uninkable', label: 'Uninkable'},
] as const;

/** A form section's accordion header (narrow layout), over its body. */
function AccordionDemo() {
  const [open, setOpen] = useState(true);
  return (
    <section style={{maxWidth: 400, ...bordered(ADMIN_COLORS.card), borderRadius: ADMIN_RADIUS.panel, overflow: 'hidden'}}>
      <h2 style={{margin: 0}}>
        <button type="button" className="adm-acc-head" aria-expanded={open} aria-controls="demo-identity" onClick={() => setOpen(!open)}>
          Identity
        </button>
      </h2>
      {/* No display in this style: one would override `hidden`. */}
      <p id="demo-identity" hidden={!open} style={{margin: 0, padding: `0 ${SPACING.lg}px ${SPACING.lg}px`, ...ACC_BODY}}>
        Collector #, name, version, franchise
      </p>
    </section>
  );
}

/** The ink tiles, the Dual-ink switch and the smaller second-ink tiles. Each tile's InkIcon alt names it (R4-5c's markup). */
function InkDemo() {
  const [ink, setInk] = useState<Ink>('Amber');
  const [ink2, setInk2] = useState<Ink | null>(null);
  const [dual, setDual] = useState(true);
  return (
    <div style={{display: 'grid', gap: SPACING.md, justifyItems: 'start'}}>
      <div role="group" aria-label="Ink" style={ROW}>
        {ALL_INKS.map((name) => (
          <button
            key={name}
            type="button"
            className="adm-pick-btn adm-ink-tile"
            aria-pressed={ink === name}
            onClick={() => setInk(name)}>
            <InkIcon ink={name} size={28} decorative={false} />
          </button>
        ))}
      </div>
      <label style={INLINE}>
        <input type="checkbox" role="switch" className="adm-switch" checked={dual} onChange={(e) => setDual(e.target.checked)} />
        Dual-ink card
      </label>
      {dual && (
        <div role="group" aria-label="Second ink" style={ROW}>
          {ALL_INKS.filter((name) => name !== ink).map((name) => (
            <button
              key={name}
              type="button"
              className="adm-pick-btn adm-ink-tile"
              data-size="sm"
              aria-pressed={ink2 === name}
              onClick={() => setInk2(name)}>
              <InkIcon ink={name} size={22} decorative={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** The rarity and inkwell pick buttons: full width, so their grid sizes them. */
function PickDemo() {
  const [rarity, setRarity] = useState('Super Rare');
  const [inkable, setInkable] = useState(true);
  return (
    <div style={{display: 'grid', gap: SPACING.md, maxWidth: 480}}>
      <div role="group" aria-label="Rarity" style={PICK_GRID}>
        {RARITY_SAMPLES.map(({label, key}) => (
          <button key={key} type="button" className="adm-pick-btn" aria-pressed={rarity === label} onClick={() => setRarity(label)}>
            <RaritySymbol rarity={key} size={18} />
            {label}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Inkwell" style={{...PICK_GRID, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'}}>
        {INKWELLS.map(({value, label}) => (
          <button
            key={value}
            type="button"
            className="adm-pick-btn"
            aria-pressed={inkable === (value === 'inkable')}
            onClick={() => setInkable(value === 'inkable')}>
            <InkwellIcon value={value} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The cost box and slider: the slider shows no thumb until a cost is set. */
function CostDemo() {
  const [cost, setCost] = useState('');
  const unset = cost === '';
  return (
    <div style={{...INLINE, maxWidth: 360}}>
      <label style={INLINE}>
        Cost
        <input className="adm-input" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} style={{width: 64}} />
      </label>
      <input
        type="range"
        className="adm-range"
        min={0}
        max={10}
        step={1}
        aria-label="Cost slider"
        aria-valuetext={unset ? 'Not set' : undefined}
        data-unset={unset ? 'true' : undefined}
        value={Math.min(10, Number(cost) || 0)}
        onPointerDown={() => {
          if (unset) setCost('0');
        }}
        onChange={(e) => setCost(e.target.value)}
      />
    </div>
  );
}

/** The two file labels: the cover over the card preview, and Replace card image. */
function FileDemo() {
  const cover = useHiddenFileInput(() => {});
  const replace = useHiddenFileInput(() => {});
  return (
    <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: SPACING.xl}}>
      <div style={{position: 'relative', width: 160, aspectRatio: '5 / 7', ...bordered(ADMIN_COLORS.card), borderRadius: ADMIN_RADIUS.preview}}>
        <label className="adm-file-cover" data-focused={cover.focused ? 'true' : undefined}>
          <span style={PILL}>Click to upload scan</span>
          <input {...cover.inputProps} accept={ACCEPT} />
        </label>
      </div>
      <label className="adm-file-btn" data-focused={replace.focused ? 'true' : undefined}>
        Replace card image
        <input {...replace.inputProps} accept={ACCEPT} />
      </label>
    </div>
  );
}

/** Card studio's adm-* classes in their states. Tab through it to see the rings. */
export const StudioControls: Story = {
  render: () => (
    <>
      <AccordionDemo />
      <InkDemo />
      <PickDemo />
      <CostDemo />
      <FileDemo />
    </>
  ),
};
```

These demos show the classes, not the studio's rules. R4-5b to R4-5d build the real controls, with their errors, hints and wiring.

- [ ] **Step 15: Run this task's tests together, lint the changed files and typecheck**

```bash
pnpm vitest run --project app src/shell/nav.test.ts src/tools/studio/__tests__/studioLayout.test.ts src/tools/studio/__tests__/studioPaths.test.ts src/tools/studio/__tests__/studioStyles.test.ts src/theme/__tests__/AdminStyles.test.tsx
```

Expected: `Test Files  5 passed (5)`, `Tests  91 passed (91)` (29 + 7 + 25 + 8 + 22).

```bash
pnpm exec eslint --max-warnings 0 src/shell/nav.ts src/shell/nav.test.ts src/tools/studio/studioLayout.ts src/tools/studio/studioPaths.ts src/tools/studio/studioStyles.ts src/tools/studio/__tests__/studioLayout.test.ts src/tools/studio/__tests__/studioPaths.test.ts src/tools/studio/__tests__/studioStyles.test.ts src/theme/AdminStyles.tsx src/theme/__tests__/AdminStyles.test.tsx src/theme/AdminTheme.stories.tsx src/app-bridge.ts src/ui/SegmentedControl.tsx
```

Expected: no output, exit 0.

```bash
pnpm typecheck
```

Expected: exit 0. It builds the engine and runs `tsc -b`, which covers the story and the tests.

Don't run `pnpm lint` or `pnpm test:run` in full: the pre-commit hook runs both (gates once).

- [ ] **Step 16: Code Health**

Run CodeScene's `code_health_review` on each of these:
- `src/shell/nav.ts`;
- `src/tools/studio/studioLayout.ts`, `studioPaths.ts` and `studioStyles.ts`;
- `src/theme/AdminStyles.tsx` and `src/theme/AdminTheme.stories.tsx`;
- the five test files.

Expected:
- **10.0 with no findings for each,** as MCP 1.5.7 gave in the sandbox. `studioStyles.ts` and `src/app-bridge.ts` hold no functions, so they get no score.
- **`nav.ts`.** Its 6 of 6 string parameters (R-81) scored 10.0 locally. The PR gate is stricter, so R4-8's `analyze_change_set` checks it before the push.
- **If a function is flagged,** split it. The highest cyclomatic complexity here is 4 (`studioHref`, `CostDemo`).

- [ ] **Step 17: Look at the classes in Storybook**

jsdom draws no pseudo-elements and checks no contrast, so look at the story:
1. Start Storybook with the preview tool's `admin-storybook` configuration (`.claude/launch.json`), not `pnpm storybook` in a shell.
2. Open `http://localhost:6007/?path=/story/admin-theme--studio-controls` and check these:
   - **Identity.** A chevron at the right points down while open. A click turns it to point right and hides the line under it. Hover fills the header row.
   - **The ink tiles.** Six 48px tiles, Amber pressed: the faint gold fill and gold border of `adm-card-btn`'s pressed state. The second-ink row has five 40px tiles with no Amber.
   - **Dual-ink card.** The switch is on: a gold track with the dark knob at the right. Clicking it moves the knob left over a grey track, and the second-ink row goes.
   - **Rarity.** Four buttons in a grid, each with its symbol, with Super Rare pressed. Inkable and Uninkable share one row with their inkwell icons.
   - **Cost.** The slider shows a track and no thumb. Pressing the track puts the thumb at 0 and the box reads 0. Typing 12 puts the thumb at the right end.
   - **Files.** The 5:7 box carries a "Click to upload scan" pill at its bottom, and a gold inner edge on hover. "Replace card image" is a bordered button that golds on hover.
3. Tab through the story from the top. Each control shows the gold ring when it takes focus:
   - the header's ring sits inside its row;
   - the file labels ring 2px outside when their hidden inputs take focus.
4. Open the Accessibility panel: 0 violations. Colour contrast over the translucent fills may show under "Incomplete".
5. Stop Storybook with the preview tool. A running preview server makes the pre-commit hook's Vitest fail to start its workers.

If no browser is available to the implementer, record each check as pending with the owner, as R1-2's Step 11 did, and say so in the report.

- [ ] **Step 18: Commit**, with the Bash tool, only after the owner approves. Use two separate calls, so the commit command starts with `USER_APPROVED=1`:

```bash
git add src/shell/nav.ts src/shell/nav.test.ts src/tools/studio/studioLayout.ts src/tools/studio/studioPaths.ts src/tools/studio/studioStyles.ts src/tools/studio/__tests__/studioLayout.test.ts src/tools/studio/__tests__/studioPaths.test.ts src/tools/studio/__tests__/studioStyles.test.ts src/theme/AdminStyles.tsx src/theme/__tests__/AdminStyles.test.tsx src/theme/AdminTheme.stories.tsx src/app-bridge.ts src/ui/SegmentedControl.tsx
```

Then run CodeScene's `pre_commit_code_health_safeguard` on the staged change (CLAUDE.md), and go on only when it passes. Then commit as a separate call, unpiped:

```bash
USER_APPROVED=1 git commit -m "feat(studio): add studioHref, the studio's paths, layout and classes, and InkwellIcon (#24)"
```

Husky's pre-commit hook runs the full lint and `test:run`. Never pass `--no-verify`. If Vitest fails to start its workers under load, stop this session's preview servers, wait out other sessions' runs, and retry.

### Hand-offs from R4-5a

- **The R4 header (the controller).** It already carries this task as written: `studioModeOf(location)`, `studioCardOf`, `draftsAtRisk` and `STUDIO_SLOT_ORDER` (addition 6), the seven classes and `studioStyles.ts`'s exports (addition 5), `SegmentedControl`'s comment as R4-5a's (addition 3 and item 13), and the tasks table. Keep them in step if this file changes.
  - **R-redesign.md's class list (`:242-244`)** gains an "R4 adds" line with the seven classes, at the plan commit or in R4-8 (R4-8 checks for it).
- **R4-5b (the form).**
  - **The roots.** `StudioForm`'s root is `STUDIO_FORM[layout]`, and each section's box is `STUDIO_PANEL`. In wide, the four sections go in DOM order Identity, Ink & rarity, Type & stats, Card text, and `gridAutoFlow: 'column'` places them.
  - **A narrow header** is `<h2 style={{margin: 0}}><button type="button" className="adm-acc-head" aria-expanded aria-controls>`. The status dot comes first, then the title and summary in a `flex: 1` block. The chevron is the class's `::after`, so the button holds no chevron element.
  - **A wide header** is a plain `h2`, with no button and no chevron. Pad it as `adm-acc-head` pads (`${SPACING.section}px ${SPACING.lg}px`), so the two layouts line up.
  - **Text.** Labels use `FIELD_LABEL`, hints `HINT`, and field errors `ERROR_TEXT`. The cost slider is `className="adm-range"` with `data-unset={unset ? 'true' : undefined}`; the class gives it `flex: 1 1 auto`, so put it in a flex row beside the Cost box.
- **R4-5c (the pickers).**
  - **Buttons.** Rarity and Inkable/Uninkable are `adm-pick-btn`: give each group a grid, and the buttons fill it (`repeat(auto-fill, minmax(112px, 1fr))` for rarity, two equal columns for the inkwell). An ink is `className="adm-pick-btn adm-ink-tile"`, and a second-ink tile adds `data-size="sm"`.
  - **Dual-ink** is `<input type="checkbox" role="switch" className="adm-switch">` inside its `<label>`.
  - **Icons.** `InkwellIcon` takes `value: 'inkable' | 'uninkable'` and is decorative by default, so the button's text names it. An ink tile has no text, so its `InkIcon` takes `decorative={false}` and its `alt` names the tile. The story's `PickDemo` and `InkDemo` show the markup.
- **R4-5d (the card panel).**
  - **The overlay** is `<label className="adm-file-cover" data-focused={focused ? 'true' : undefined}>` with the pill caption inside. The class positions it absolutely over its parent, so the preview frame is `position: relative`. The ring sits 2px outside, so nothing between the cover and the panel's padding may clip (no `overflow: hidden` on the frame).
  - **Replace card image** is `<label className="adm-file-btn" …>`.
  - **Notes and the image error** use `HINT` and `ERROR_TEXT`, and the panel's box is `STUDIO_PANEL`.
- **R4-5f (the Edit entry).** Search rows link to `studioHref('edit', card.id)`, and "Load a different card" links to `studioHref('edit')`, both from `src/shell/nav.ts`.
- **R4-6a (the page).**
  - **Location.** Read the URL through `useLocation()`: `studioModeOf(location)` and `studioCardOf(location)`.
  - **The guard.** `leaves={(from, to) => shouldBlockStudioNavigation(from, to, drafts)}`. Build `studioUnsavedMessage` on `draftsAtRisk(location, to, drafts)`, so the dialog names exactly the drafts the hold protects.
  - **The root.** It takes `ref` and `style={STUDIO_GRID[layout]}`, with `layout = studioLayout(useContainerWidth(ref))`.
  - **The slots.** Render `STUDIO_SLOT_ORDER[layout].map((slot) => <div key={slot} style={STUDIO_SLOT[layout][slot]}>…</div>)` (R-63).
  - **A flip to check (R-64).** The root's own box never changes with the layout, but the flush body's scrollbar can. Near the threshold, the narrow layout (one accordion section open, the three slots in one row) can be shorter than the wide one (four sections open, two rows). If it fits without a scrollbar and the wide one doesn't, a content width between 1328 and about 1343px flips from wide to narrow and back on each measure, wherever the scrollbar takes layout width.
    - **R4-6a's fix** (header addition 13): `scrollbarGutter: 'stable'` on `PageLayout`'s `FLUSH_BODY` (`PageLayout.tsx:59`). It changes only the two flush pages.
    - **The owner's rehearsal** at 1366px and 1440px (R-86) still watches for it.
- **R4-6c (the routes).** The redirects are `<Navigate to={studioHref('new')} replace />` and `<Navigate to={studioHref('edit')} replace />`, imported from `src/shell/nav.ts`. "Edit in Card studio" links to `studioHref('edit', state.card.id)`.
- **R4-8.** `analyze_change_set` covers `nav.ts`'s 6 string parameters (R-81). Record in "R4 as built" that the slider's per-engine rules and the switch's pseudo-elements were checked in Storybook (Step 17), or note them as pending.

<!--
Re-base pass on R4-5a, 2026-10-07. Choices where the brief, the header draft and the audit differ:
- studioModeOf takes a StudioLocation, as the brief says ("over Location-like objects"), against the header draft's
  URLSearchParams sketch (R4-card-studio.md addition 6, as of 15:50). R4-6a needs the location for the guard's message
  and the URL-driven handoff, so one type serves every helper. Flagged under Hand-offs for the header.
- adm-ink-tile composes with adm-pick-btn, as the header draft has it, through a compound selector so the size can't
  lose to rule order. adm-file-cover is new: the header draft puts adm-file-btn on two controls that look nothing alike.
- STUDIO_GRID keeps the header draft's name. STUDIO_SLOT, STUDIO_FORM, STUDIO_SLOT_ORDER and draftsAtRisk are
  additions, each consumed by a named later task (Hand-offs).
- web.test.mjs: its premise is reworded in this file, and the test file is left alone. R4-7 owns reveal-sync wording,
  and R4-5h's draft cites this task's "assets already load".
- The scrollbar flip under R4-6a was found while checking R-64's arithmetic against the handoff's narrow flex values.
  It is not fixed here: PageLayout is R4-6a's to change, and R4-6a takes scrollbarGutter: 'stable'.
- Verifier pass (2026-10-07): the header has since taken every name above, so the Hand-offs list only what remains.
  The story's ink tiles now use R4-5c's markup (InkIcon decorative={false}, no aria-label). Step 1 gained the
  git log, and Step 18 the pre_commit_code_health_safeguard (the header's task loop and CLAUDE.md).
-->
