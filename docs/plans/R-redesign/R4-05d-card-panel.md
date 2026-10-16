> Part of [R: Admin redesign](../R-redesign.md), phase R4 ([R4-card-studio.md](R4-card-studio.md)). Read the main plan's decisions (R-57 to R-91 for R4), corrections, global constraints and shared interfaces, then the R4 header, first.

> **Re-base notes (R4-5d, 2026-10-07).** Re-based from the 2026-10-01 outline's "Task R4-5: Studio components, paths and layout" (`R4-card-studio.md:601-810`, its "Card panel" block at `:714-722` and its `StudioCardPanel` tests at `:787-791`) onto `main @ e5e5029` with pin `upstream/inkweave` @ `16283a13`, on branch `feature/24-redesign-r4`. Decisions R-57 to R-91 apply, and so does the R4 audit (`.superpowers/sdd/R-redesign/r4-audit-synth.md`, "R4-5"; `r4-audit-full.json`, `audits[4]`). The audit cited the old pin `bc877e1`; every app fact below was checked again at `16283a13`. What changed and why:
> 1. **The split.** The outline's R4-5 is eight tasks now (5a to 5f, plus 5s and 5h). This one, R4-5d, builds only `StudioCardPanel`: the preview, its caption and translation, both file controls, the staged note, Revert image, the current-art thumbnail and the image's error. It ports `CardPreviewPanel.test.tsx`'s one case. It needs R4-5a (the classes, the layout type and the style constants) and R4-2a's `studioFixtures.ts`, and nothing from R4-5b or R4-5c, so it could run as soon as both have landed.
> 2. **One contract change: `current` replaces `currentImageUrl`** (the R4 header's addition 12). The thumbnail's alt is "Current art for {name}" (R-89), and the name has to be the card's as it stands. In Edit the draft can rename the card, and the preview card (`card`) then carries the new name, so a bare URL couldn't name the art truthfully. The panel takes `current?: LorcanaCard | null`, the card as the lookup holds it, and draws `smallImageUrl(current)` (`loader.ts:78-87`), as R3's card header does (`CardHeader.tsx:89`). New reveal passes none. `staged: {name, error}` and an optional `onRevertImage` stay as the header has them; `staged` is typed `StagedImage` from the new `cardPanel.ts`. The header's addition 12 already carries this contract.
>    - **Not `editorState.ts`'s `StagedImage`.** R4-4b exports an interface of the same name, `{name, dataUrl, error}`, whose `error` is the staged file's own. It is assignable to this one, but its `error` isn't the one the panel shows, which is the controller's R-72 `imageError`. So a pane builds `staged` from `imageName` and `imageError` (see the hand-offs), never by passing Edit's staged image through.
>    - **The thumbnail sits beside the staged note,** not beside the preview as the outline had it (`R4-card-studio.md:719`). A 64 × 90 thumbnail beside a preview up to 320px wide doesn't fit the 320-400px card column, and beside the note it reads as "this replaces that".
> 3. **The preview takes no Tab stop** (the audit's significant item). Without `href`, `CardTile` renders `<button aria-pressed>` (pin `CardTile.tsx:173-206`), so under today's upload overlay it is a dead stop (`CardPreviewPanel.tsx:32`). The tile gets `tabIndex={-1}` (`CardTile.tsx:25`), inside an `aria-hidden` wrapper, and the file control over it is the frame's one stop. The test tabs through the panel and finds no button by role, and each half fails on its own mutation.
> 4. **The stripes show for a card with no name and no art**, not only for `card === null`. The reveal controller always builds a card: the empty form is an Amber Character (`useRevealAdmin.ts:15-34`), and the engine's `transformCard` returns null only for a bad ink or type (`cardTransformer.ts:178-185` at the pin). So the outline's rule would never show the handoff's striped placeholder (README.md:115), and a fresh form would show an Amber "0" badge. Today's "Click to upload card art" placeholder (`CardPreviewPanel.tsx:31-45`) is unreachable for the same reason. `hasPreview(card)` decides it: a name or an image. A scan chosen before the name shows at once.
> 5. **The caption and the pill (R-89).**
>    - Under the preview: the name in Tinos (`FONTS.hero`, `ADMIN_TYPE.sectionTitle` for the handoff's 24px), then the version and the ink icons, which are `decorative={false}` so a screen reader hears the inks (as `CardHeader.tsx:63-64`). Today's "ink · type · cost" line (`CardPreviewPanel.tsx:57-66`) goes. A card with no name shows "Fill in the name to preview the card." in its place.
>    - The pill reads "Click to upload scan", "Click to change scan" once a file is chosen, and "Click to replace image" in Edit (`dc.html:1030`). The pill is the cover label's text, so it is the file input's accessible name too (WCAG 2.5.3). Today's `aria-label` names "Upload card art" (`CardPreviewPanel.tsx:54`) and "Choose image" (`ImageUploadTile.tsx:44`) go.
>    - "drop image" is gone from the copy (R-89): R4 uploads by click and keyboard only.
>    - The pill sits on `COLORS.scrimHeavy` (`theme.ts:122`), the app's black at 0.85, for the handoff's `rgba(11,11,17,.85)`.
> 6. **The notes (R-91 2).** Edit's staged note is "New image staged ({file}). It replaces the current art when you save.", not the handoff's deploy wording (`dc.html:249`). New reveal gets its own: "Scan staged ({file}). It's published with the card." A note shows only while the file passed its checks; a failed file shows its error instead, and the preview keeps the art it had. The accepted formats show under the controls as "JPEG, PNG or WebP." (R-89; the image tool named them at `UploadColumn.tsx:34`).
> 7. **The file controls and the error.**
>    - Both controls are `useHiddenFileInput` labels (`useHiddenFileInput.ts:24-39`) accepting `image/jpeg,image/png,image/webp`, as today (`CardPreviewPanel.tsx:14`). `useImageUpload` still checks the bytes (`useImageUpload.ts:30-36`).
>    - The cover uses R4-5a's `adm-file-cover`, and Edit's "Replace card image" its `adm-file-btn`. Each rings on `data-focused="true"` from the hook's `focused`. R4-5a split the header's one `adm-file-btn` (addition 5) in two, because the cover needs its own geometry: absolute over the frame, the preview's radius, the pill at the bottom. Today's legacy `GOLD_GLOW.focusRing` (`CardPreviewPanel.tsx:52`) goes.
>    - Each control is described by the formats hint and, while there is one, the error first (`fileDescription`). It is `aria-invalid` while the error shows. The error sits in an always-mounted polite live region, because the bytes are checked after the pick and focus is on the control by then.
>    - The ids come from `useId`, not the outline's fixed `field-image-error`: Storybook's docs page renders every story in one document, and a fixed id would repeat.
>    - The panel shows the `staged.error` it is given. R-72 makes that the caller's job: no error before a file is chosen (the header's "Visible errors (R-72)"). R4-6a's draft passes R4-3a's `visibleImageError`, and R4-3b's `imageError` is the same value; see the hand-offs.
> 8. **Focus after Revert image (R-48, R-59).** Revert image unmounts itself, so the panel moves focus first, as PendingTray's Clear all does (`PendingTray.tsx:142-145`). It goes to the last file control in the panel: "Replace card image" in Edit, else the preview's control. Both stay mounted. So the page needs no handoff for Revert, as the header's focus rules now say ("Inside a component, with no page handoff": "Revert image focuses the remaining file control (R4-5d)"). The first header sketch had it among the page's "Plain state updates"; this task moved it.
> 9. **The preview is keyed by its art.** `CardTileImage` remembers a failed load (`CardTile.tsx:72`) and then draws the cost badge for good. In Edit, a card's current art can 404 (a branch-only card before its deploy, R-66), and a staged image would then never show. `key={card.imageUrl ?? ''}` remounts the tile when the art changes, and a test pins it.
> 10. **App facts, checked at 16283a13.**
>     - `CardTranslationPanel` takes `{card, language?, size?, style?}` (`CardTranslationPanel.tsx:11-19`). `language` defaults to `card.scanLanguage` (`:39`) and is for a printing's foreign scan of an English card. The studio previews the card's own scan, so it passes no `language`, and the panel reads "Unofficial translation" and "Translated from the {Language} card" (`:46`, `:105-107`). It names its region "English translation of {fullName}" and holds an `h2`.
>     - `buildPreviewCard` sets `scanLanguage` only when it isn't `en` (`buildPreviewCard.ts:115`), and `buildPreview` copies it onto the preview (`useRevealAdmin.ts:43`, `livePreview.ts` after R4-3b). French (R-60) is named through `Intl.DisplayNames`, so the ported test runs for `ja` and `fr`.
>     - The bridge already exports everything this task uses: `CardTranslationPanel` (`app-bridge.ts:40` at main), `InkIcon` (`:46`), `LinkButton` (`:47`), `CardTile` (`:59`) and `smallImageUrl` (`:62`). R4-5a's `InkwellIcon` (two lines after `:46`) moves the last three to `:49`, `:61` and `:64`, and R4-4d rewrites the loader line's comment, so Step 1 checks the names, not the numbers. This task doesn't touch the bridge, so no reveal-sync run.
> 11. **What R4-5a gives** (Step 1 checks each one): `StudioMode` in `src/shell/nav.ts`; `StudioLayout` in `studioLayout.ts`; `STUDIO_PANEL`, `HINT` and `ERROR_TEXT` in `studioStyles.ts`; and the two classes. Step 1 says what to do if a name differs.
> 12. **Code Health, counted by hand** (named functions; the gate is under 30% primitive parameters per module):
>     - `cardPanel.ts`: 0 primitive parameters in 6. `isStaged(staged)`, `frameState(slot)`, `pillCaption(slot)`, `stagedNote(slot)`, `hasPreview(card)` and `fileDescription({ids, error})` all take an object.
>     - `StudioCardPanel.tsx`: 0 in 12. Ten components take one props object; `fileInputProps(wiring)` takes an object; `focusLastFileControl(root)` takes an element. In the tests, `renderPanel`, `Harness` and the `it.each` callbacks take one object each, as R4-3b's do; `shown` and `rings` take none, and `rings`' map callback takes an element.
>     - **Complexity.** The most complex function is about 4 (`CurrentArt`, `CardCaption`). `StudioCardPanel` is composition, with one `if`/`else`. The words and the frame's state come from `cardPanel.ts`, and the borders from a `Record` lookup.
> 13. **Gates once.** The steps run the two targeted test files, eslint on the six files and one `pnpm typecheck`, then Code Health and the Storybook look. No reveal-sync run, since no contract file or bridge line changes, and no `pnpm build`, which R4-8 runs.
>
> **Verified (2026-10-07)** in `scratchpad/r4-rebase/sandbox-R4-5d`: a copy of `src/` and the configs from the working tree (main `b490fb7` plus the uncommitted bump, pin `16283a13`), with `node_modules` and `upstream/` junctioned in, and Vite's cache and the tsbuildinfo in the sandbox. R4-5a's pieces were its draft files (`nav.ts`, `AdminStyles.tsx`, `studioLayout.ts`, `studioStyles.ts`, `studioPaths.ts`, from `cs-R4-5a`, 15:53). `studioFixtures.ts` held only this task's block.
> - **Re-verified (17:45)** in `scratchpad/r4-rebase/sandbox-v-R4-5d`, the same base with the verified R4-5a files (`sandbox-v-R4-5a`, 17:31) and R4-2a's whole `studioFixtures.ts` (`sandbox-v-r42a`), this task's block appended: Step 1's greps print what Step 1 expects, Steps 4 and 8 fail as quoted, the two files pass 40 of 40, `tsc` and eslint are clean, and `code_health_review` scores the panel and its test 10.0.
> - **Tests.** With no implementation, Step 4 and Step 8 give the resolve errors quoted there. With this task's code, the two files pass, 40 of 40.
> - **The tests bite.** Thirteen mutations each fail at least one test: no `tabIndex={-1}`; no `aria-hidden`; no `key`; no focus move before Revert; no `aria-invalid`; the current art named from the draft; no live region; one max width for both layouts; Revert with no `onImageChange(null)` fallback; the description's order swapped; a note while the file failed; the stripes never shown; and a file label without `data-focused` (no ring).
> - **Types.** `tsc -p tsconfig.app.json` is clean, the stories and tests included.
> - **Lint.** `eslint --max-warnings 0` is clean on the six files in the sandbox, and on the three source files piped through `pnpm exec eslint --stdin` against the repo's own config.
> - **Code Health.** CodeScene MCP 1.5.7 scores `cardPanel.ts`, `StudioCardPanel.tsx`, both test files and the stories 10.0, with no findings.
> - **Not run.** Storybook and the browser (Step 14 is the implementer's), and the server's PR gate (R4-8's `analyze_change_set`).

### Task R4-5d: The card panel

**Files:**
- Create `src/tools/studio/cardPanel.ts`: the panel's words, the frame's state and the inputs' description, as pure functions.
- Create `src/tools/studio/components/StudioCardPanel.tsx`.
- Create `src/tools/studio/components/StudioCardPanel.stories.tsx`.
- Modify `src/tools/studio/studioFixtures.ts` (R4-2a's): append `PANEL_CARD`, `CURRENT_ART` and `STAGED_ART`.
- Test: create `src/tools/studio/__tests__/cardPanel.test.ts`.
- Test: create `src/tools/studio/__tests__/StudioCardPanel.test.tsx`. It ports `src/tools/reveal/__tests__/CardPreviewPanel.test.tsx`'s case, which stays until R4-6c deletes `CardPreviewPanel`.
- Unchanged: `src/app-bridge.ts`, `src/theme/AdminStyles.tsx`, `src/components/useHiddenFileInput.ts` and `useImageUpload.ts`, and every reveal-sync contract file.

**Interfaces:**
- **Consumes:**
  - **From R4-5a** (Step 1 checks each one):
    ```ts
    // src/shell/nav.ts
    export type StudioMode = 'new' | 'edit';
    // src/tools/studio/studioLayout.ts
    export type StudioLayout = 'wide' | 'narrow';
    // src/tools/studio/studioStyles.ts (CSSProperties constants, cardStyles.ts's pattern)
    export const STUDIO_PANEL: CSSProperties;   // a studio panel's surface: the card fill, border and radius
    export const HINT: CSSProperties;           // a muted hint, ADMIN_TYPE.label, never dim (R-6)
    export const ERROR_TEXT: CSSProperties;     // a validator message: ADMIN_TYPE.label in COLORS.error
    // src/theme/AdminStyles.tsx
    // .adm-file-btn: a bordered <label> round a hidden file input ("Replace card image")
    // .adm-file-cover: the <label> laid over the card preview (absolute, inset 0, the pill at the bottom)
    // both ring on [data-focused="true"], from useHiddenFileInput's `focused`
    ```
  - **From R4-2a:** the plain module `src/tools/studio/studioFixtures.ts`, which this task extends.
  - **Existing:**
    - `useHiddenFileInput(onFile: (file: File | null) => void): {focused: boolean; inputProps}` (`src/components/useHiddenFileInput.ts:24-39`).
    - Through the bridge: `CardTile` (`{card, isSelected, tabIndex?}`), `CardTranslationPanel` (`{card, language?, size?, style?}`; no `language` passed), `InkIcon` (`{ink, size?, decorative?}`), `LinkButton` (`{tone?, size?, …button props}`), `smallImageUrl(card)`, `COLORS` (`scrimHeavy`, `error`), `FONTS.hero` and `SPACING`.
    - `ADMIN_COLORS`, `ADMIN_RADIUS` and `ADMIN_TYPE` (`src/theme/adminTheme.ts`).
    - In the tests: `pngFile` (`src/test/images.ts`).
- **Produces:**
  ```ts
  // src/tools/studio/cardPanel.ts
  export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
  export const IMAGE_FORMATS = 'JPEG, PNG or WebP.';
  export interface StagedImage {name: string | null; error: string | null}   // the controller's imageName and its R-72 imageError;
                                                                             // not editorState.ts's StagedImage (R4-4b), whose error is the file's own
  export const NO_IMAGE: StagedImage;                                        // {name: null, error: null}
  export interface ImageSlot {mode: StudioMode; staged: StagedImage}
  export type FrameState = 'empty' | 'current' | 'staged';
  export function isStaged(staged: StagedImage): staged is {name: string; error: null};
  export function frameState(slot: ImageSlot): FrameState;
  export function pillCaption(slot: ImageSlot): string;        // "Click to upload scan" | "Click to change scan" | "Click to replace image"
  export function stagedNote(slot: ImageSlot): string | null;  // R-91 2; null unless isStaged
  export function hasPreview(card: LorcanaCard | null): card is LorcanaCard;   // a name or an image
  export interface ImageNoteIds {hint: string; error: string}
  export function fileDescription(input: {ids: ImageNoteIds; error: string | null}): string;   // "error hint" or "hint"

  // src/tools/studio/components/StudioCardPanel.tsx
  export interface StudioCardPanelProps {
    card: LorcanaCard | null;          // the controller's previewCard: a staged image in place
    mode: StudioMode;
    layout: StudioLayout;              // the preview's max width: 320 wide, 280 narrow
    staged: StagedImage;
    current?: LorcanaCard | null;      // Edit: the card as it stands (R-89's thumbnail and its alt); New passes none
    onImageChange: (file: File | null) => void;
    onRevertImage?: () => void;        // Edit's revertImage; without it Revert image calls onImageChange(null)
  }
  export function StudioCardPanel(props: StudioCardPanelProps);
  // A <section aria-label="Card preview">, in this order: the preview frame (an aria-hidden CardTile with
  // tabIndex -1, or the stripes, under the adm-file-cover pill and its file input); the caption; the
  // translation of a scan that isn't English; Replace card image (Edit) and Revert image (a file chosen);
  // the formats hint; the error in a polite live region; the staged note, with the current art in Edit.

  // src/tools/studio/studioFixtures.ts gains
  export const PANEL_CARD: LorcanaCard;   // Mei - Red Panda, Ruby, with rules text and no art
  export const CURRENT_ART: string;       // stand-in art URLs for the stories and tests (not AVIF, so smallImageUrl keeps them)
  export const STAGED_ART: string;
  ```

- [ ] **Step 1: Check what this task builds on**

From the repo root, on `feature/24-redesign-r4`:
```bash
git branch --show-current
git -C upstream/inkweave rev-parse --short HEAD
git log --oneline main..HEAD
grep -n "export type StudioMode" src/shell/nav.ts
grep -n "export type StudioLayout" src/tools/studio/studioLayout.ts
grep -nE "export const (STUDIO_PANEL|HINT|ERROR_TEXT)\b" src/tools/studio/studioStyles.ts
grep -oE '\.adm-file-(btn|cover)\[data-focused="true"\]' src/theme/AdminStyles.tsx
grep -nE "^export (const|function) " src/tools/studio/studioFixtures.ts
grep -nE "CardTile|CardTranslationPanel|InkIcon|LinkButton|smallImageUrl" src/app-bridge.ts
grep -n "language?: string" upstream/inkweave/apps/web/src/shared/components/CardTranslationPanel.tsx
grep -n "scrimHeavy" upstream/inkweave/apps/web/src/shared/constants/theme.ts
ls src/tools/studio/cardPanel.ts src/tools/studio/components/StudioCardPanel.tsx
```
Expected:
- `feature/24-redesign-r4`, then `16283a1`. The log lists the R4 commits so far, R4-5a's and R4-2a's among them.
- **`StudioMode`, `StudioLayout`:** one line each.
- **The style constants:** three lines. If `HINT` or `ERROR_TEXT` is missing, R4-5a named them differently: import its names. If it has none, declare both at the top of `StudioCardPanel.tsx` with the values in this task's Consumes block (`{margin: 0, fontSize: ADMIN_TYPE.label, color: ADMIN_COLORS.muted}` and the same with `color: COLORS.error`), and drop them from the `studioStyles` import.
- **The classes:** `.adm-file-btn[data-focused="true"]` and `.adm-file-cover[data-focused="true"]`. If only `adm-file-btn` prints, R4-5a kept the header's single class. Stop, and raise it with the controller: the cover needs its own geometry, and a component-level `<style>` is barred (R-41).
- **`studioFixtures.ts`:** R4-2a's exports (`previewEntry`, `previewFileText`, `studioCard` and its named entries). If the file is missing, R4-2a hasn't landed: stop.
- **The bridge:** the two comment lines near the top that name CardTile (`:8`, `:11`), then five export lines: `CardTranslationPanel`, `InkIcon`, `LinkButton`, `CardTile` and the loader line with `smallImageUrl` (R4-4d adds `transformRawCards` to it). After R4-5a they sit at `:40`, `:46`, `:49`, `:61` and `:64`; R4-4d's comment may move the loader line further. Check the names, not the numbers.
- **The pin:** `  language?: string;` and `  scrimHeavy: 'rgba(0, 0, 0, 0.85)',`.
- **The `ls`:** `No such file or directory` for both.

On a fresh checkout, or after a pin bump, run `pnpm build:engine` once first: these tests reach the bridge and the engine.

- [ ] **Step 2: Add the panel's fixtures**

Append to `src/tools/studio/studioFixtures.ts`, below its last export (R4-2a's, or a later task's such as R4-4d's `BRANCH_ONLY_ENTRY`). If Step 1's grep already lists `PANEL_CARD`, `CURRENT_ART` or `STAGED_ART`, stop and ask the controller. If the module doesn't import `type LorcanaCard` from `'inkweave-synergy-engine'` yet, add that import to its import block.

```ts
/** Mei as the card panel previews her (R4-5d): a named Ruby Character with rules text, and no art until a case gives her some. */
export const PANEL_CARD: LorcanaCard = {
  id: '14050',
  name: 'Mei',
  version: 'Red Panda',
  fullName: 'Mei - Red Panda',
  cost: 4,
  ink: 'Ruby',
  inkwell: true,
  type: 'Character',
  strength: 3,
  willpower: 5,
  lore: 2,
  setCode: '14',
  setNumber: 50,
  rarity: 'Rare',
  textSections: ['PANDA POWER When you play this character, draw a card.'],
};

/** Stand-in art for the card panel's tests and stories: the card's art now, and a staged scan. Neither is an AVIF, so smallImageUrl keeps them. */
export const CURRENT_ART = 'https://placehold.co/337x470/1a1a2e/d4af37?text=Current+art';
export const STAGED_ART = 'https://placehold.co/337x470/2e1a1a/ffb900?text=Staged+scan';
```

- [ ] **Step 3: Write the failing test for `cardPanel.ts`**

Create `src/tools/studio/__tests__/cardPanel.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {
  NO_IMAGE,
  fileDescription,
  frameState,
  hasPreview,
  pillCaption,
  stagedNote,
  type FrameState,
  type ImageSlot,
} from '../cardPanel';
import {PANEL_CARD} from '../studioFixtures';

const STAGED = {name: 'mei.png', error: null};
const FAILED = {name: 'mei.png', error: 'mei.png holds a JPEG image; rename it to end in .jpg.'};
/** A fresh New reveal form's card: Amber, a Character, no name and no art. */
const FRESH: LorcanaCard = {...PANEL_CARD, name: '', fullName: '', version: undefined};

interface Words {
  pill: string;
  note: string | null;
  frame: FrameState;
}

describe('the card panel words', () => {
  it.each<{label: string; slot: ImageSlot; expected: Words}>([
    {label: 'New, nothing chosen', slot: {mode: 'new', staged: NO_IMAGE}, expected: {pill: 'Click to upload scan', note: null, frame: 'empty'}},
    {
      label: 'New, a scan staged',
      slot: {mode: 'new', staged: STAGED},
      expected: {pill: 'Click to change scan', note: "Scan staged (mei.png). It's published with the card.", frame: 'staged'},
    },
    {
      label: 'New, a file that failed its check',
      slot: {mode: 'new', staged: FAILED},
      expected: {pill: 'Click to change scan', note: null, frame: 'empty'},
    },
    {
      label: 'Edit, the art as it stands',
      slot: {mode: 'edit', staged: NO_IMAGE},
      expected: {pill: 'Click to replace image', note: null, frame: 'current'},
    },
    {
      label: 'Edit, an image staged',
      slot: {mode: 'edit', staged: STAGED},
      expected: {
        pill: 'Click to replace image',
        note: 'New image staged (mei.png). It replaces the current art when you save.',
        frame: 'staged',
      },
    },
    {
      label: 'Edit, a file that failed its check',
      slot: {mode: 'edit', staged: FAILED},
      expected: {pill: 'Click to replace image', note: null, frame: 'current'},
    },
  ])('$label', ({slot, expected}) => {
    expect({pill: pillCaption(slot), note: stagedNote(slot), frame: frameState(slot)}).toEqual(expected);
  });
});

describe('hasPreview', () => {
  it.each<{label: string; card: LorcanaCard | null; expected: boolean}>([
    {label: 'no card', card: null, expected: false},
    {label: "a fresh form's card", card: FRESH, expected: false},
    {label: 'a named card with no art yet', card: PANEL_CARD, expected: true},
    {label: 'a scan chosen before the name', card: {...FRESH, imageUrl: 'data:image/png;base64,'}, expected: true},
  ])('$label: $expected', ({card, expected}) => {
    expect(hasPreview(card)).toBe(expected);
  });
});

describe('fileDescription', () => {
  const ids = {hint: 'hint', error: 'error'};

  it('is the formats alone, then the error first while there is one', () => {
    expect([fileDescription({ids, error: null}), fileDescription({ids, error: 'Bad file'})]).toEqual(['hint', 'error hint']);
  });
});
```

- [ ] **Step 4: Run it, and see it fail**

Run: `pnpm vitest run --project app src/tools/studio/__tests__/cardPanel.test.ts`
Expected: FAIL, `Test Files  1 failed (1)`, `Tests  no tests`, with:
```
Error: Failed to resolve import "../cardPanel" from "src/tools/studio/__tests__/cardPanel.test.ts". Does the file exist?
```

- [ ] **Step 5: Write `cardPanel.ts`**

Create `src/tools/studio/cardPanel.ts`:

```ts
import type {LorcanaCard} from 'inkweave-synergy-engine';
import type {StudioMode} from '../../shell/nav';

/*
 * What Card studio's card panel says (R4-5d): the pill on the preview, the
 * note under a staged image and the frame's look, by mode and by what the
 * draft holds. Pure, so StudioCardPanel stays composition.
 */

/** What both file controls offer the picker. useImageUpload still reads the bytes (imageProblem). */
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

/** The accepted formats, under the controls (R-89), as the image tool named them (UploadColumn.tsx:34). */
export const IMAGE_FORMATS = 'JPEG, PNG or WebP.';

/** The image a draft holds: its file's name, and the error its file controls show (R-72). */
export interface StagedImage {
  name: string | null;
  error: string | null;
}

/** Nothing chosen, and no error. */
export const NO_IMAGE: StagedImage = {name: null, error: null};

/** What the panel's words turn on: the mode, and the staged image. */
export interface ImageSlot {
  mode: StudioMode;
  staged: StagedImage;
}

/** The preview's frame: no scan yet (dashed), the card's art now (solid), or a staged image (gold). */
export type FrameState = 'empty' | 'current' | 'staged';

/** A file is chosen and nothing is wrong with it, so the preview shows it. A file that failed shows its error instead. */
export function isStaged(staged: StagedImage): staged is {name: string; error: null} {
  return staged.name !== null && staged.error === null;
}

export function frameState({mode, staged}: ImageSlot): FrameState {
  if (isStaged(staged)) return 'staged';
  return mode === 'edit' ? 'current' : 'empty';
}

/** The pill on the preview, in the handoff's words (R-89). It also names the preview's file control. */
export function pillCaption({mode, staged}: ImageSlot): string {
  if (mode === 'edit') return 'Click to replace image';
  return staged.name === null ? 'Click to upload scan' : 'Click to change scan';
}

/**
 * The note under a staged image (R-91 2): Edit's says when the art changes,
 * not the handoff's deploy wording, and New reveal's has its own. Null while
 * nothing is staged, or while the file's error shows in its place.
 */
export function stagedNote({mode, staged}: ImageSlot): string | null {
  if (!isStaged(staged)) return null;
  if (mode === 'edit') return `New image staged (${staged.name}). It replaces the current art when you save.`;
  return `Scan staged (${staged.name}). It's published with the card.`;
}

/**
 * A card the preview can draw: one with a name or with art. A fresh New
 * reveal form still builds a card (Amber, a Character, no name), so without
 * this the frame would show an Amber 0 where the handoff's stripes belong.
 */
export function hasPreview(card: LorcanaCard | null): card is LorcanaCard {
  if (card === null) return false;
  return card.name !== '' || card.imageUrl !== undefined;
}

/** The ids of what describes the file controls: the formats hint, and the error. */
export interface ImageNoteIds {
  hint: string;
  error: string;
}

/** A file control's aria-describedby: the error first while there is one, then the formats. */
export function fileDescription({ids, error}: {ids: ImageNoteIds; error: string | null}): string {
  return error === null ? ids.hint : `${ids.error} ${ids.hint}`;
}
```

- [ ] **Step 6: Run it to PASS**

Run: `pnpm vitest run --project app src/tools/studio/__tests__/cardPanel.test.ts`
Expected: `Tests  11 passed (11)`.

- [ ] **Step 7: Write the panel's failing test**

Create `src/tools/studio/__tests__/StudioCardPanel.test.tsx`. Its translation case ports `CardPreviewPanel.test.tsx:22-30`, now for `ja` and `fr` (R-60):

```tsx
import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import type {StudioMode} from '../../../shell/nav';
import {pngFile} from '../../../test/images';
import {NO_IMAGE, type StagedImage} from '../cardPanel';
import {StudioCardPanel, type StudioCardPanelProps} from '../components/StudioCardPanel';
import {CURRENT_ART, PANEL_CARD, STAGED_ART} from '../studioFixtures';

const FORMATS = 'JPEG, PNG or WebP.';
const BAD_BYTES = 'mei.png holds a JPEG image; rename it to end in .jpg.';
const STAGED: StagedImage = {name: 'mei.png', error: null};
const FAILED: StagedImage = {name: 'mei.png', error: BAD_BYTES};
/** Mei as she stands in Edit: her art now. */
const CURRENT: LorcanaCard = {...PANEL_CARD, imageUrl: CURRENT_ART};
/** Mei as the draft previews her once a new image is staged. */
const STAGED_CARD: LorcanaCard = {...PANEL_CARD, imageUrl: STAGED_ART};

/** The panel as a page renders it: New reveal, Mei with no art, nothing staged, unless a case says otherwise. */
function renderPanel(overrides: Partial<StudioCardPanelProps> = {}) {
  const props: StudioCardPanelProps = {
    card: PANEL_CARD,
    mode: 'new',
    layout: 'wide',
    staged: NO_IMAGE,
    onImageChange: vi.fn(),
    ...overrides,
  };
  return {props, ...render(<StudioCardPanel {...props} />)};
}

/** What the panel shows round the image, as one value per case. */
function shown() {
  return {
    note: screen.queryByText(/ staged \(/)?.textContent ?? null,
    revert: screen.queryByRole('button', {name: 'Revert image'}) !== null,
    replace: screen.queryByLabelText('Replace card image') !== null,
    current: screen.queryByRole('img', {name: /^Current art for/})?.getAttribute('src') ?? null,
  };
}

/** Which file controls show their ring: each label's data-focused, in DOM order (the cover first). */
function rings() {
  return Array.from(document.querySelectorAll('label'), (label) => label.dataset.focused ?? null);
}

/** Holds the staged image as the controllers do, so Revert image unmounts itself. Edit passes its own revert. */
function Harness({mode}: {mode: StudioMode}) {
  const [staged, setStaged] = useState<StagedImage>(STAGED);
  const onRevertImage = mode === 'edit' ? () => setStaged(NO_IMAGE) : undefined;
  return (
    <StudioCardPanel
      card={STAGED_CARD}
      mode={mode}
      layout="wide"
      staged={staged}
      current={CURRENT}
      onImageChange={(file) => setStaged({name: file?.name ?? null, error: null})}
      onRevertImage={onRevertImage}
    />
  );
}

describe('StudioCardPanel', () => {
  it('keeps the preview out of the Tab order: its file control is the one stop', async () => {
    const user = userEvent.setup();
    const {container} = renderPanel();
    // CardTile renders a button: no Tab stop, inside an aria-hidden wrapper.
    expect(container.querySelector('[data-testid="card-tile"]')).toHaveAttribute('tabindex', '-1');
    expect(screen.queryByRole('button')).toBeNull();

    await user.tab();
    expect(screen.getByLabelText('Click to upload scan')).toHaveFocus();
    await user.tab();
    expect(document.body).toHaveFocus();
  });

  it('rings the file control that has the focus, on its label (the input itself is hidden)', async () => {
    const user = userEvent.setup();
    renderPanel({mode: 'edit', card: CURRENT, current: CURRENT});
    expect(rings()).toEqual([null, null]);
    await user.tab();
    expect(rings()).toEqual(['true', null]);
    await user.tab();
    expect(rings()).toEqual([null, 'true']);
  });

  it.each<{label: string; mode: StudioMode; staged: StagedImage; caption: string}>([
    {label: 'New, nothing chosen', mode: 'new', staged: NO_IMAGE, caption: 'Click to upload scan'},
    {label: 'New, a scan staged', mode: 'new', staged: STAGED, caption: 'Click to change scan'},
    {label: 'Edit', mode: 'edit', staged: NO_IMAGE, caption: 'Click to replace image'},
    {label: 'Edit, an image staged', mode: 'edit', staged: STAGED, caption: 'Click to replace image'},
  ])('$label: the pill "$caption" names the preview control, which takes JPEG, PNG and WebP', ({mode, staged, caption}) => {
    renderPanel({mode, staged});
    const input = screen.getByLabelText(caption);
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
    expect(input).toHaveAccessibleDescription(FORMATS);
  });

  it.each<{mode: StudioMode; control: string}>([
    {mode: 'new', control: 'Click to upload scan'},
    {mode: 'edit', control: 'Click to replace image'},
    {mode: 'edit', control: 'Replace card image'},
  ])('$mode: "$control" hands the chosen file over', async ({mode, control}) => {
    const user = userEvent.setup();
    const onImageChange = vi.fn();
    renderPanel({mode, onImageChange});
    const file = pngFile('mei.png');
    await user.upload(screen.getByLabelText(control), file);
    expect(onImageChange).toHaveBeenCalledExactlyOnceWith(file);
  });

  it.each([{control: 'Click to replace image'}, {control: 'Replace card image'}])(
    'ties a file error to "$control", ahead of the formats, and marks it invalid',
    ({control}) => {
      renderPanel({mode: 'edit', card: CURRENT, current: CURRENT, staged: FAILED});
      const input = screen.getByLabelText(control);
      expect(input).toHaveAccessibleDescription(`${BAD_BYTES} ${FORMATS}`);
      expect(input).toBeInvalid();
    },
  );

  it('shows the file error next to the controls, in a polite live region', () => {
    renderPanel({staged: FAILED});
    expect(screen.getByText(BAD_BYTES).parentElement).toHaveAttribute('aria-live', 'polite');
  });

  it.each<{label: string; props: Partial<StudioCardPanelProps>; expected: ReturnType<typeof shown>}>([
    {label: 'New, nothing chosen', props: {}, expected: {note: null, revert: false, replace: false, current: null}},
    {
      label: 'New, a scan staged: its own note, and no current art',
      props: {card: STAGED_CARD, staged: STAGED},
      expected: {note: "Scan staged (mei.png). It's published with the card.", revert: true, replace: false, current: null},
    },
    {
      label: 'Edit, the art as it stands',
      props: {mode: 'edit', card: CURRENT, current: CURRENT},
      expected: {note: null, revert: false, replace: true, current: null},
    },
    {
      label: 'Edit, an image staged: the current art beside the note',
      props: {mode: 'edit', card: STAGED_CARD, current: CURRENT, staged: STAGED},
      expected: {
        note: 'New image staged (mei.png). It replaces the current art when you save.',
        revert: true,
        replace: true,
        current: CURRENT_ART,
      },
    },
    {
      label: 'Edit, a file that failed its check: its error, and no note',
      props: {mode: 'edit', card: CURRENT, current: CURRENT, staged: FAILED},
      expected: {note: null, revert: true, replace: true, current: null},
    },
  ])('$label', ({props, expected}) => {
    renderPanel(props);
    expect(shown()).toEqual(expected);
  });

  it('names the current art for the card as it stands, not as the draft renames it', () => {
    const renamed = {...STAGED_CARD, version: 'Bold Red Panda', fullName: 'Mei - Bold Red Panda'};
    renderPanel({mode: 'edit', card: renamed, current: CURRENT, staged: STAGED});
    expect(screen.getByRole('img', {name: 'Current art for Mei - Red Panda'})).toBeInTheDocument();
  });

  it.each<{mode: StudioMode; next: string}>([
    {mode: 'new', next: 'Click to upload scan'},
    {mode: 'edit', next: 'Replace card image'},
  ])('$mode: Revert image hands focus to "$next" before it goes, then clears the file', async ({mode, next}) => {
    const user = userEvent.setup();
    render(<Harness mode={mode} />);
    await user.click(screen.getByRole('button', {name: 'Revert image'}));
    expect(screen.queryByRole('button', {name: 'Revert image'})).toBeNull();
    expect(screen.getByLabelText(next)).toHaveFocus();
  });

  it.each<{label: string; withRevert: boolean; expected: {revert: number; change: unknown[][]}}>([
    {label: "Edit's onRevertImage", withRevert: true, expected: {revert: 1, change: []}},
    {label: 'onImageChange(null) where there is none', withRevert: false, expected: {revert: 0, change: [[null]]}},
  ])('Revert image calls $label', async ({withRevert, expected}) => {
    const user = userEvent.setup();
    const onRevertImage = vi.fn();
    const onImageChange = vi.fn();
    renderPanel({staged: STAGED, onImageChange, onRevertImage: withRevert ? onRevertImage : undefined});
    await user.click(screen.getByRole('button', {name: 'Revert image'}));
    expect({revert: onRevertImage.mock.calls.length, change: onImageChange.mock.calls}).toEqual(expected);
  });

  it('captions the preview with the name, the version and every ink, named', () => {
    renderPanel({card: {...PANEL_CARD, ink2: 'Sapphire'}});
    expect(screen.getByText('Mei')).toBeInTheDocument();
    expect(screen.getByText('Red Panda')).toBeInTheDocument();
    expect(screen.getAllByRole('img').map((img) => img.getAttribute('alt'))).toEqual(['Ruby', 'Sapphire']);
  });

  it("shows the stripes and a prompt for a fresh form's card, which has no name and no art", () => {
    const {container} = renderPanel({card: {...PANEL_CARD, name: '', fullName: '', version: undefined}});
    expect(container.querySelector('[data-testid="card-tile"]')).toBeNull();
    expect(screen.getByText('Fill in the name to preview the card.')).toBeInTheDocument();
  });

  it.each([
    {scanLanguage: 'ja', language: 'Japanese'},
    {scanLanguage: 'fr', language: 'French'},
  ])('shows what "See translation" will show for a $scanLanguage scan, and nothing for English', ({scanLanguage, language}) => {
    const {rerender, props} = renderPanel({card: {...PANEL_CARD, scanLanguage}});
    const translation = screen.getByRole('region', {name: 'English translation of Mei - Red Panda'});
    expect(translation).toHaveTextContent('PANDA POWER');
    expect(translation).toHaveTextContent(`Translated from the ${language} card`);

    rerender(<StudioCardPanel {...props} card={PANEL_CARD} />);
    expect(screen.queryByRole('region', {name: /English translation/})).toBeNull();
  });

  it('draws a staged image even after the art before it failed to load', () => {
    const {container, rerender, props} = renderPanel({mode: 'edit', card: CURRENT, current: CURRENT});
    fireEvent.error(container.querySelector('img.card-tile-img')!);
    expect(container.querySelector('img.card-tile-img')).toBeNull();

    rerender(<StudioCardPanel {...props} card={STAGED_CARD} staged={STAGED} />);
    expect(container.querySelector('img.card-tile-img')).toHaveAttribute('src', STAGED_ART);
  });

  it.each([
    {layout: 'wide', maxWidth: '320px'},
    {layout: 'narrow', maxWidth: '280px'},
  ] as const)('sizes the preview for the $layout layout: $maxWidth at most', ({layout, maxWidth}) => {
    renderPanel({layout});
    expect(screen.getByLabelText('Click to upload scan').closest('label')?.parentElement).toHaveStyle({maxWidth});
  });
});
```

Notes on the test:
- **No mocks and no stubs.** The panel takes props only, and `userEvent.upload` builds its own `FileList`. Nothing needs restoring in `afterEach`.
- **jsdom loads no image,** so a CardTile `<img>` stays in the DOM (at opacity 0) until a test fires `error` on it, which is how the keyed-tile case fails the first art.
- **The ring.** jsdom draws no outline, so the ring case reads what AdminStyles' rule keys on: `data-focused="true"` on the label whose input has focus (R4-5a's `[data-focused="true"]` selector). The panel renders exactly two labels in Edit, the cover's and Replace card image's.
- **`user.upload` applies the `accept` list** by default, which `pngFile`'s `image/png` passes.
- **The ported case** keeps its region name and texts: `CardTranslationPanel` still names its region "English translation of {fullName}" and prints "Translated from the {Language} card" for a card's own foreign scan at `16283a13`.

- [ ] **Step 8: Run it, and see it fail**

Run: `pnpm vitest run --project app src/tools/studio/__tests__/StudioCardPanel.test.tsx`
Expected: FAIL, `Test Files  1 failed (1)`, `Tests  no tests`, with:
```
Error: Failed to resolve import "../components/StudioCardPanel" from "src/tools/studio/__tests__/StudioCardPanel.test.tsx". Does the file exist?
```

- [ ] **Step 9: Write `StudioCardPanel.tsx`**

Create `src/tools/studio/components/StudioCardPanel.tsx`:

```tsx
import {useId, useRef, type CSSProperties} from 'react';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {
  CardTile,
  CardTranslationPanel,
  COLORS,
  FONTS,
  InkIcon,
  LinkButton,
  SPACING,
  smallImageUrl,
} from '../../../app-bridge';
import {useHiddenFileInput} from '../../../components/useHiddenFileInput';
import type {StudioMode} from '../../../shell/nav';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {
  IMAGE_ACCEPT,
  IMAGE_FORMATS,
  fileDescription,
  frameState,
  hasPreview,
  pillCaption,
  stagedNote,
  type FrameState,
  type ImageNoteIds,
  type ImageSlot,
  type StagedImage,
} from '../cardPanel';
import type {StudioLayout} from '../studioLayout';
import {ERROR_TEXT, HINT, STUDIO_PANEL} from '../studioStyles';

/** The preview's widest, by layout (handoff README §7: 320px wide, 280px narrow). */
const PREVIEW_MAX: Readonly<Record<StudioLayout, number>> = {wide: 320, narrow: 280};
/** CardTile's own proportions, so the stripes and the card take the same box. */
const CARD_ASPECT = '0.72';
const STRIPE = 10;
const ICON_SIZE = 18;
/** The current art's thumbnail: the card header's 64 × 90 (CardHeader.tsx:8-10), a card's proportions. */
const THUMB_WIDTH = 64;
const THUMB_HEIGHT = 90;

const PANEL: CSSProperties = {
  ...STUDIO_PANEL,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: SPACING.lg,
  padding: `${SPACING.xxl}px ${SPACING.xl}px`,
};
// No overflow clip here: the file control's ring sits 2px outside the frame.
const FRAME: CSSProperties = {position: 'relative', width: '100%'};
const PICTURE: CSSProperties = {borderRadius: ADMIN_RADIUS.preview, overflow: 'hidden'};
const FRAME_BORDER: Readonly<Record<FrameState, string>> = {
  empty: `1px dashed ${ADMIN_COLORS.strongBorder}`,
  current: `1px solid ${ADMIN_COLORS.inputBorder}`,
  staged: `1px solid ${ADMIN_COLORS.accentStrong}`,
};
const STRIPES: CSSProperties = {
  aspectRatio: CARD_ASPECT,
  background: `repeating-linear-gradient(135deg, ${ADMIN_COLORS.card} 0 ${STRIPE}px, ${ADMIN_COLORS.rowHover} ${STRIPE}px ${2 * STRIPE}px)`,
};
const PILL: CSSProperties = {
  position: 'relative',
  margin: SPACING.md,
  padding: `${SPACING.xs}px ${SPACING.md}px`,
  borderRadius: ADMIN_RADIUS.pill,
  background: COLORS.scrimHeavy,
  fontSize: ADMIN_TYPE.small,
  color: ADMIN_COLORS.text,
};
const CENTRED: CSSProperties = {textAlign: 'center', maxWidth: PREVIEW_MAX.wide};
const CAPTION: CSSProperties = {display: 'grid', gap: SPACING.xs, justifyItems: 'center', textAlign: 'center'};
const NAME: CSSProperties = {
  margin: 0,
  fontFamily: FONTS.hero,
  fontSize: ADMIN_TYPE.sectionTitle,
  fontWeight: 400,
  lineHeight: 1.2,
  color: ADMIN_COLORS.text,
};
const SUBLINE: CSSProperties = {
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  gap: SPACING.sm,
  fontSize: ADMIN_TYPE.body,
  color: ADMIN_COLORS.muted,
};
const TRANSLATION: CSSProperties = {width: '100%', borderRadius: ADMIN_RADIUS.box};
const ACTIONS: CSSProperties = {display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: SPACING.md};
const STAGED: CSSProperties = {display: 'flex', alignItems: 'center', gap: SPACING.md, maxWidth: PREVIEW_MAX.wide};
const FIGURE: CSSProperties = {margin: 0, flex: 'none', display: 'grid', gap: SPACING.xs, justifyItems: 'center'};
const THUMB: CSSProperties = {objectFit: 'cover', borderRadius: ADMIN_RADIUS.box, border: `1px solid ${ADMIN_COLORS.inputBorder}`};

/** How the file controls report: who takes the file, and what describes them. */
interface FileWiring {
  onFile: (file: File | null) => void;
  describedBy: string;
  invalid: boolean;
}

/** The hidden input's own props: the accept list, the description, and aria-invalid while there is an error. */
function fileInputProps(wiring: FileWiring) {
  return {accept: IMAGE_ACCEPT, 'aria-describedby': wiring.describedBy, 'aria-invalid': wiring.invalid || undefined};
}

/** The pill over the preview: a <label> round a visually hidden file input, which carries the focus. */
function FileCover({caption, wiring}: {caption: string; wiring: FileWiring}) {
  const {focused, inputProps} = useHiddenFileInput(wiring.onFile);
  return (
    <label className="adm-file-cover" data-focused={focused || undefined}>
      <span style={PILL}>{caption}</span>
      <input {...inputProps} {...fileInputProps(wiring)} />
    </label>
  );
}

/** Edit's "Replace card image": the same picker as the preview, as a button (handoff README §7, item 3). */
function ReplaceImage({wiring}: {wiring: FileWiring}) {
  const {focused, inputProps} = useHiddenFileInput(wiring.onFile);
  return (
    <label className="adm-file-btn" data-focused={focused || undefined}>
      Replace card image
      <input {...inputProps} {...fileInputProps(wiring)} />
    </label>
  );
}

/**
 * The card as the app draws it, or the stripes while there is nothing to draw.
 * A picture, never a control: CardTile renders a button, so it takes no Tab
 * stop and sits in an aria-hidden wrapper, and the file control over it is
 * the frame's one stop. Keyed by its art, so art that failed to load doesn't
 * keep the next image from showing (CardTile remembers the failure).
 */
function PreviewPicture({card, state}: {card: LorcanaCard | null; state: FrameState}) {
  return (
    <div aria-hidden="true" style={{...PICTURE, border: FRAME_BORDER[state]}}>
      {hasPreview(card) ? (
        <CardTile key={card.imageUrl ?? ''} card={card} isSelected={false} tabIndex={-1} />
      ) : (
        <div style={STRIPES} />
      )}
    </div>
  );
}

function PreviewFrame({card, slot, layout, wiring}: {card: LorcanaCard | null; slot: ImageSlot; layout: StudioLayout; wiring: FileWiring}) {
  return (
    <div style={{...FRAME, maxWidth: PREVIEW_MAX[layout]}}>
      <PreviewPicture card={card} state={frameState(slot)} />
      <FileCover caption={pillCaption(slot)} wiring={wiring} />
    </div>
  );
}

/** Under the preview (R-89): the name in Tinos, then the version and the inks, named for a screen reader. */
function CardCaption({card}: {card: LorcanaCard | null}) {
  if (!card?.name) return <p style={{...HINT, ...CENTRED}}>Fill in the name to preview the card.</p>;
  return (
    <div style={CAPTION}>
      <p style={NAME}>{card.name}</p>
      <p style={SUBLINE}>
        {card.version}
        <InkIcon ink={card.ink} size={ICON_SIZE} decorative={false} />
        {card.ink2 && <InkIcon ink={card.ink2} size={ICON_SIZE} decorative={false} />}
      </p>
    </div>
  );
}

/** What the app's "See translation" lays over a scan that isn't English. */
function ScanTranslation({card}: {card: LorcanaCard | null}) {
  if (!card?.scanLanguage) return null;
  return <CardTranslationPanel card={card} size="compact" style={TRANSLATION} />;
}

/** The card's art as it stands, beside the note while another image is staged (R-89). */
function CurrentArt({current}: {current: LorcanaCard | null}) {
  const src = current ? smallImageUrl(current) : undefined;
  if (!current || !src) return null;
  return (
    <figure style={FIGURE}>
      <img src={src} alt={`Current art for ${current.fullName}`} width={THUMB_WIDTH} height={THUMB_HEIGHT} style={THUMB} />
      <figcaption style={HINT}>Current</figcaption>
    </figure>
  );
}

function ImageActions({slot, wiring, onRevert}: {slot: ImageSlot; wiring: FileWiring; onRevert: () => void}) {
  return (
    <div style={ACTIONS}>
      {slot.mode === 'edit' && <ReplaceImage wiring={wiring} />}
      {slot.staged.name !== null && (
        <LinkButton type="button" tone="muted" onClick={onRevert} style={{fontSize: ADMIN_TYPE.small}}>
          Revert image
        </LinkButton>
      )}
    </div>
  );
}

/** The formats, the file's error (a polite live region, since the bytes are checked after the pick) and the staged note. */
function ImageNotes({slot, current, ids}: {slot: ImageSlot; current: LorcanaCard | null; ids: ImageNoteIds}) {
  const note = stagedNote(slot);
  return (
    <>
      <p id={ids.hint} style={{...HINT, ...CENTRED}}>
        {IMAGE_FORMATS}
      </p>
      <div aria-live="polite" style={CENTRED}>
        {slot.staged.error !== null && (
          <p id={ids.error} style={ERROR_TEXT}>
            {slot.staged.error}
          </p>
        )}
      </div>
      {note !== null && (
        <div style={STAGED}>
          <CurrentArt current={current} />
          <p style={HINT}>{note}</p>
        </div>
      )}
    </>
  );
}

/** Revert image unmounts itself, so focus moves on first (R-48): to Replace card image in Edit, else the preview's control. */
function focusLastFileControl(root: HTMLElement | null) {
  const inputs = root?.querySelectorAll<HTMLInputElement>('input[type="file"]') ?? [];
  inputs[inputs.length - 1]?.focus();
}

export interface StudioCardPanelProps {
  /** The card as it would publish or save, a staged image in place: the controller's previewCard. */
  card: LorcanaCard | null;
  mode: StudioMode;
  layout: StudioLayout;
  /** The controller's imageName and imageError. */
  staged: StagedImage;
  /** Edit: the card as it stands, whose art the thumbnail shows while an image is staged (R-89). New reveal has none. */
  current?: LorcanaCard | null;
  onImageChange: (file: File | null) => void;
  /** Edit's revertImage. Without it, Revert image clears the file through onImageChange(null), as New reveal does. */
  onRevertImage?: () => void;
}

/**
 * Card studio's card panel (handoff README §7): the app's CardTile render
 * under a click-to-upload pill, the caption, the translation of a scan that
 * isn't English, and the image's controls and notes. Both file controls are
 * useHiddenFileInput labels, so the keyboard reaches them, and both are
 * described by the formats and by the file's error.
 */
export function StudioCardPanel({card, mode, layout, staged, current = null, onImageChange, onRevertImage}: StudioCardPanelProps) {
  const id = useId();
  const ids: ImageNoteIds = {hint: `${id}-hint`, error: `${id}-error`};
  const root = useRef<HTMLElement>(null);
  const slot: ImageSlot = {mode, staged};
  const wiring: FileWiring = {
    onFile: onImageChange,
    describedBy: fileDescription({ids, error: staged.error}),
    invalid: staged.error !== null,
  };
  const revert = () => {
    focusLastFileControl(root.current);
    if (onRevertImage) onRevertImage();
    else onImageChange(null);
  };
  return (
    <section ref={root} aria-label="Card preview" style={PANEL}>
      <PreviewFrame card={card} slot={slot} layout={layout} wiring={wiring} />
      <CardCaption card={card} />
      <ScanTranslation card={card} />
      <ImageActions slot={slot} wiring={wiring} onRevert={revert} />
      <ImageNotes slot={slot} current={current} ids={ids} />
    </section>
  );
}
```

How it reads:
- **The frame** is two layers in a `position: relative` box with no overflow clip, so the cover's focus ring (2px out) is never clipped. The picture clips the tile to the preview's radius and carries the frame's border: dashed while New reveal has no scan, solid in Edit, gold once an image is staged (the handoff's `imgBorder`, `dc.html:1029`).
- **The stripes** are `ADMIN_COLORS.card` and `rowHover` at 135°, the ladder's steps nearest the handoff's `#12121b` and `#15151f`.
- **The preview's widths** are the handoff's 320px and 280px. The stories' columns are 400px and 300px.
- **`fileInputProps` comes after the hook's `inputProps`** in the spread, so the accept list and the description can't be overridden.

- [ ] **Step 10: Run both test files to PASS**

Run: `pnpm vitest run --project app src/tools/studio/__tests__/cardPanel.test.ts src/tools/studio/__tests__/StudioCardPanel.test.tsx`
Expected: `Test Files  2 passed (2)`, `Tests  40 passed (40)`: 11 in `cardPanel.test.ts` and 29 in `StudioCardPanel.test.tsx`.

- [ ] **Step 11: Stories**

Create `src/tools/studio/components/StudioCardPanel.stories.tsx`, titled `Admin/Publish/Card studio/Card panel` (the R4 header's leaf titles). The panel renders no link and no guard, so it needs no router.

```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {SPACING} from '../../../app-bridge';
import {CURRENT_ART, PANEL_CARD, STAGED_ART} from '../studioFixtures';
import {StudioCardPanel} from './StudioCardPanel';

/** The handoff's card column: 400px when wide (README §7), 300px when narrow. */
const WIDE_COLUMN = 400;
const NARROW_COLUMN = 300;
const BAD_BYTES = 'mei.png holds a JPEG image; rename it to end in .jpg.';

/** Mei as she stands in Edit, and as the draft previews her once a new scan is staged. */
const CURRENT = {...PANEL_CARD, imageUrl: CURRENT_ART};
const STAGED_CARD = {...PANEL_CARD, imageUrl: STAGED_ART};

const meta: Meta<typeof StudioCardPanel> = {
  title: 'Admin/Publish/Card studio/Card panel',
  component: StudioCardPanel,
  tags: ['autodocs'],
  decorators: [
    (Story, {args}) => (
      <div style={{maxWidth: args.layout === 'narrow' ? NARROW_COLUMN : WIDE_COLUMN, padding: SPACING.lg}}>
        <Story />
      </div>
    ),
  ],
  args: {
    card: PANEL_CARD,
    mode: 'new',
    layout: 'wide',
    staged: {name: null, error: null},
    onImageChange: () => {},
  },
};
export default meta;
type Story = StoryObj<typeof meta>;

/** A fresh New reveal form: its card has no name and no art, so the frame shows the stripes and the pill. */
export const NewEmpty: Story = {args: {card: {...PANEL_CARD, name: '', fullName: '', version: undefined}}};

/** Named, with no scan yet: the app's own render of the card, in a dashed frame. */
export const NewNamed: Story = {};

/** A scan staged: a gold frame, "Click to change scan", Revert image and New reveal's own note. */
export const NewStaged: Story = {args: {card: STAGED_CARD, staged: {name: 'mei.png', error: null}}};

/** A file that failed its byte check: the error under the controls, which it describes, and no note. */
export const NewBadFile: Story = {args: {staged: {name: 'mei.png', error: BAD_BYTES}}};

/** A Japanese scan: what the app's "See translation" will show, under the caption. */
export const Translation: Story = {args: {card: {...STAGED_CARD, scanLanguage: 'ja'}, staged: {name: 'mei-ja.png', error: null}}};

/** Two inks: both icons in the caption, each named. */
export const DualInk: Story = {args: {card: {...PANEL_CARD, ink2: 'Sapphire'}}};

/** Edit, nothing staged: the card's art, "Click to replace image" and Replace card image. */
export const EditCurrent: Story = {args: {mode: 'edit', card: CURRENT, current: CURRENT}};

/** Edit, an image staged: the current art beside the note, and Revert image. */
export const EditStaged: Story = {
  args: {mode: 'edit', card: STAGED_CARD, current: CURRENT, staged: {name: 'mei-en.png', error: null}},
};

/** Edit, a file that failed its check: both file controls carry the error. */
export const EditBadFile: Story = {
  args: {mode: 'edit', card: CURRENT, current: CURRENT, staged: {name: 'mei-en.png', error: BAD_BYTES}},
};

/** The narrow layout's smaller preview (280px at most). */
export const Narrow: Story = {
  args: {layout: 'narrow', mode: 'edit', card: STAGED_CARD, current: CURRENT, staged: {name: 'mei-en.png', error: null}},
};
```

- [ ] **Step 12: Lint the changed files, and typecheck once**

Run:
```bash
pnpm exec eslint --max-warnings 0 src/tools/studio/cardPanel.ts src/tools/studio/components/StudioCardPanel.tsx src/tools/studio/components/StudioCardPanel.stories.tsx src/tools/studio/studioFixtures.ts src/tools/studio/__tests__/cardPanel.test.ts src/tools/studio/__tests__/StudioCardPanel.test.tsx
```
Expected: no output, exit 0. `react-refresh` accepts the component file's type export, `jsx-a11y` accepts both labels (each wraps its input and has text), and the design-token rules see only tokens: the border and stripe colours interpolate `ADMIN_COLORS`, and the pill's fill is `COLORS.scrimHeavy`.

Run: `pnpm typecheck`
Expected: exit 0. It checks the stories' `args`, the `it.each` row types and `isStaged`'s narrowing in `stagedNote`.

Don't run the full `pnpm lint` or `pnpm test:run` here: the pre-commit hook runs both (gates once). Don't run `pnpm build`: R4-8 does.

- [ ] **Step 13: Code Health**

Run CodeScene's `code_health_review` on:
- `src/tools/studio/cardPanel.ts`;
- `src/tools/studio/components/StudioCardPanel.tsx`;
- `src/tools/studio/components/StudioCardPanel.stories.tsx`;
- both test files.

Expected: 10.0 each, with no findings, as local MCP 1.5.7 scored them in the sandbox. `studioFixtures.ts` gains constants only.

The hand count (re-base note 12): 0 primitive parameters in `cardPanel.ts`'s 6 functions, and 0 in `StudioCardPanel.tsx`'s 12. If a finding appears, fix it before the commit:
- **"Complex Method" on `StudioCardPanel`:** a branch moved back into it. Keep the words in `cardPanel.ts` and each `&&` in its own subcomponent, as Step 9 has them.
- **"Code Duplication" in a test file:** a case grew past its table. Fold it into the nearest `it.each`.

The PR's server gate is stricter, so R4-8 runs `analyze_change_set`. Step 15 runs `pre_commit_code_health_safeguard` once the files are staged.

- [ ] **Step 14: Look at it in Storybook**

jsdom draws nothing, so check the panel in the browser pane, with this session's preview tools:
1. Start Storybook with the preview tool's `admin-storybook` configuration (`.claude/launch.json`), not `pnpm storybook` in a shell.
2. Open `http://localhost:6007/?path=/docs/admin-publish-card-studio-card-panel--docs` and each story. Check:
   - **`NewEmpty`:** the stripes in a dashed frame, the pill "Click to upload scan" at the bottom centre, and "Fill in the name to preview the card." under it.
   - **`NewNamed`:** the app's card render (Ruby, cost 4), still dashed. "Mei" in Tinos, then "Red Panda" and the Ruby icon.
   - **`NewStaged` and `EditStaged`:** the staged art in a gold frame. `EditStaged` shows the 64 × 90 current art captioned "Current" beside the note, and both Replace card image and Revert image.
   - **`NewBadFile` and `EditBadFile`:** the error in red under the formats, and no note.
   - **`Translation`:** the compact translation panel under the caption, as wide as the column.
   - **`Narrow`:** the preview stops at 280px.
3. **The keyboard.** In `EditStaged`'s canvas, press Tab. The cover takes the gold ring 2px outside the frame, and nothing on the tile takes a stop. Tab again: Replace card image rings. Tab again: Revert image. Press Enter on it. With the story's stub nothing clears, but the focus has already moved to Replace card image.
4. **Accessibility.** Storybook's Accessibility panel reports no violations on every story. The aria-hidden wrapper holds a button with `tabindex="-1"`, which axe's `aria-hidden-focus` passes.

Afterwards, stop the server with the preview tool, and set the viewport back to its desktop preset. A running preview server makes the pre-commit hook's Vitest fail to start its workers.

If no browser is available to the implementer, record each check as pending with the owner, and say so in the report. R4-8's Storybook pass runs it then.

- [ ] **Step 15: Commit**

Commit only after the owner approves. Use two separate Bash calls, and never pipe the commit:

```bash
git add src/tools/studio/cardPanel.ts src/tools/studio/components/StudioCardPanel.tsx src/tools/studio/components/StudioCardPanel.stories.tsx src/tools/studio/studioFixtures.ts src/tools/studio/__tests__/cardPanel.test.ts src/tools/studio/__tests__/StudioCardPanel.test.tsx
```

Then run CodeScene's `pre_commit_code_health_safeguard`, and commit only once it passes:

```bash
USER_APPROVED=1 git commit -m "feat(studio): add Card studio's card panel (#24)"
```

- The pre-commit hook runs the full lint and `test:run`. Never pass `--no-verify`.
- If Vitest fails to start its workers under load, stop this session's preview servers, wait out other sessions' runs, and retry.
- Afterwards, `git status --short -- src` prints nothing.

### Hand-offs from R4-5d

- **R4-6a (the New reveal pane).** Wire the panel with no `current` and no `onRevertImage`, so Revert image clears the file through `onImageChange(null)`. Its error is R4-3a's `visibleImageError`, as R4-6a's draft has it (`scanOf(ctrl)` is `{name: ctrl.imageName, ready: ctrl.imageDataUrl !== null, error: ctrl.uploadError}`):
  ```tsx
  <StudioCardPanel
    card={ctrl.previewCard}
    mode="new"
    layout={layout}
    staged={{name: ctrl.imageName, error: visibleImageError(ctrl.validation.errors, scanOf(ctrl))}}
    onImageChange={ctrl.onImageChange}
  />
  ```
  R4-3b's latest draft makes `ctrl.imageError` that same value (its `imageErrorOf` calls `visibleImageError`), so `error: ctrl.imageError` is equivalent once R4-3b lands as drafted. The header's addition 8 still calls `imageError` the raw error; whichever wording the plan commit keeps, the panel must get the R-72 value, and R4-6a's page test pins a fresh form with no image error under the controls.
- **R4-6b (the Edit pane).** Render it only once `edit.lookup.kind === 'ready'` (R4-4b's `EditLookup`), with the lookup's card as it stands:
  ```tsx
  <StudioCardPanel
    card={edit.previewCard}
    mode="edit"
    layout={layout}
    staged={{name: edit.imageName, error: edit.imageError}}
    current={edit.lookup.card}
    onImageChange={edit.onImageChange}
    onRevertImage={edit.revertImage}
  />
  ```
  - **The error.** `edit.imageError` is `imageErrorOf` (R4-3b, R4-4b): null until a file is staged, since `validateCardEdit` never asks for an image. Don't pass `editorState.ts`'s `StagedImage` as `staged`: its `error` is the file's own, without the validator's.
  - **Focus after Revert image is the panel's.** The page holds no handoff for it.
  - **Don't key the panel by the staged image,** or the file control loses focus as a file is chosen. R-46's key on the Edit view by card id is enough.
- **The plan commit, or R4-8 (the main plan).** The R4 header already carries this task's contract (addition 12) and its focus rule ("Inside a component, with no page handoff"). R4-8's record (`R4-08-close.md`, its R4-5d row) puts the rest in `R-redesign.md`:
  - `StudioCardPanel`'s contract line: `currentImageUrl: string | null` becomes `current?: LorcanaCard | null`, and `staged` is `StagedImage` from `cardPanel.ts`.
  - "Focus (R-59, with R-48)": Revert image moves focus inside the panel, not through the page's handoff.
  - R-91 2's correction quotes both notes: Edit's "New image staged ({file}). It replaces the current art when you save." and New reveal's "Scan staged ({file}). It's published with the card."
  - Add `cardPanel.ts` to the file structure and shared interfaces, with its hand count (0 in 6).
  - Record as departures from the outline: the stripes for a card with no name and no art (`hasPreview`); `useId` ids in place of `field-image-error`; the error's live region; the tile keyed by its art; the current-art thumbnail beside the staged note, not beside the preview.
- **R4-6c (retire `/reveal` and `/image`).** This task ported `CardPreviewPanel.test.tsx`'s case, so it can go with `CardPreviewPanel` and its story. `ImageUploadTile` and `ImageComparePanel` go too; nothing in the studio uses them, or the old names "Upload card art" and "Choose image".
- **R4-7 (docs).** If the runbook or a skill tells the operator where to click for an image, quote the built strings: the pill ("Click to upload scan", "Click to replace image"), "Replace card image" and "Revert image".
