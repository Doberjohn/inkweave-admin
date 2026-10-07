> Part of [R: Admin redesign](../R-redesign.md), phase R4 ([R4-card-studio.md](R4-card-studio.md)). Read the main plan's decisions (R-57 to R-91 for R4), corrections, global constraints and shared interfaces, then the R4 header, first.

> **Re-base notes (R4-3a, 2026-10-07).** Re-based from the 2026-10-01 outline's Task R4-3 (`R4-card-studio.md:325-412`) onto main @ `e5e5029` (branch `feature/24-redesign-r4`, after R4-0 and R4-1a), the app pin `upstream/inkweave` @ `16283a13`, decisions R-57 to R-91 (owner, 2026-10-07) and the R4 audit (`r4-audit-synth.md`, "R4-3"; `r4-audit-full.json`, `audits[2]`). The outline was written against the planned R1 code; the audit cited the old pin `bc877e1`, and every app fact below was checked again at `16283a13`.
> - **Split.** The outline's R4-3 is two tasks now. This one, R4-3a, is the pure model: no React, no hook. R4-3b moves `buildPreview` and `computeSynergies` to `livePreview.ts` and adds the controller's `imageName`, `imageDataUrl`, `uploadError`, `imageError`, `commitError` and `dirty`, with the checklist-against-`canPublish` test across `useRevealAdmin`'s states. That invariant needs both halves, so its hook form is R4-3b's. This task pins the same invariant on the pure model (the last `describe` in `readiness.test.ts`).
> - **R-72: a blank required field is incomplete, never red** (significant; replaces the outline's `sectionStatus`).
>   - The validator reports every blank required value (`validateForm.ts:34-35` the number, `:39` the name, `:44` the cost, `:76-78` the stats, `:100-101` the image). Under the outline's rule a fresh New reveal form would open with red Identity and Type & stats dots, and only the ink section could ever be `incomplete`.
>   - `visibleErrors(form, errors)` keeps an error only when its form value is filled in: a malformed or negative number, the ink-block clash, a collision, a past-the-set number, glyph words. A blank or all-space value's error is dropped. It never holds `image`.
>   - `visibleImageError(errors, image)` is the same rule for the file input: no error before a file is chosen ("Upload a card image" is the checklist's), then the upload's own error (`useImageUpload.ts:83-88`), else the validator's image error. The upload's comes first, as the header's "Visible errors" rule and R4-3b's `imageErrorOf` order them: for a misnamed file it says what to do ("mei.gif holds a PNG image; rename it to end in .png."), where the validator says only "Image must be jpg, jpeg, png, or webp". Today's publisher shows the upload's message (`publishError ?? upload.error`, `useRevealAdmin.ts:149`) and never the validator's image error (`RevealPage.tsx:39-46`), so this keeps parity. The card panel shows `visibleImageError` (R4-6a); both controllers' raw `imageError` is `imageErrorOf`, in the same order.
>   - `validateForm.ts` keeps its messages: R-72 decides only what shows.
> - **`sectionStatuses(form, errors)` replaces `sectionStatus(section, form, errors)`** (Code Health). It drops the `SectionId` parameter, a string alias that CodeScene counts as primitive, and StudioForm needs all four statuses anyway. A section is red for a shown error (its message is the first one in the form's order), green when none of its keys has any error and the validator could check it, and neutral otherwise. `message` is null unless the state is `error`.
> - **The validator is the one source of what is required** (departure from the outline's `SECTION_REQUIRED`). A blank required value already carries a validator error, hidden by R-72, and that keeps its section neutral. A second list of required fields would copy `STAT_FIELDS` and could drift from the validator. The one gap the validator leaves is the ink check, which it skips without an error while the number is blank or unparseable (`validateForm.ts:66-68`). So each section has a `checked` test, and only Ink's isn't always true: it waits for a number in the set. `SECTION_FIELDS` and `SECTION_REQUIRED` are no longer exported: nothing outside the module reads them, and the tests check key coverage through the outputs.
> - **`revealChecklist(form, validation, image: {ready, error})`** (significant). A boolean couldn't carry a file that fails its byte check: its name passes the validator's extension check, so the Image item would sit open with no message. The parameter is typed `Pick<ImageStatus, 'ready' | 'error'>`, so a caller passes the whole `ImageStatus` it builds for `visibleImageError`. An item's `message` is null exactly when it is done, and it is the validator's message for the item's first key in the form's order. Otherwise it is the item's own reason: Ink's "Checked against the collector number: set it first". The Image item reads its message as the file input does (the upload's error, else the validator's), else "Reading the image…" while the bytes are read, so the checklist and the input never word one file differently.
> - **"Number valid" now means "in the set"**, `1 ≤ intField(collectorNumber) ≤ SET_TOTAL`. That is exactly when the validator's ink-block check runs, since the blocks tile 1 to `SET_TOTAL` (revealSet.ts:56-79). A colliding number still counts, as the outline says. With R-73 this makes the invariant exact: every item is done if and only if `validation.ok` and the bytes are read. Before R-73, #205 with the Amber default passed validation while Ink waited.
> - **R-73: `validateForm.ts` refuses every number above `SET_TOTAL`** (settled by the owner, 2026-10-07).
>   - The message is the decision's: `#205 is past the 204-card set: special printings go in through variants.mjs stage`. The runtime string drops the decision's backticks, which the inline error would print as is.
>   - A private `collectorError(form, existingIds)` returns the number's error. `checkIdentity` keeps its signature, and the module's exports and signatures don't change, so the reveal-sync contract holds (`R4-card-studio.md:26-33`).
>   - The test that skipped the ink check past the set (`validateForm.test.ts:71-74`) gives way to three: #205 and #242 are refused with that message alone (the ink check still doesn't run there), and `SET_TOTAL` itself passes in the last ink's block.
>   - reveal-sync is unaffected: its numbering gate skips any number outside `1..setTotal` before the write chain (`gates.mjs:85-97`), and every fixture card is numbered 9 to 150 of 204. `checkInkBlock`'s comment (`:58-63`) loses "promos, enchanteds".
> - **`EMPTY_FORM` and `sameForm` move to a new `src/tools/reveal/emptyForm.ts`.** `useRevealAdmin.ts:15-34` loses its private copy and imports it.
>   - **Why not an existing file.** `buildPreviewCard.ts` and `constants.ts` are contract files that reveal-sync loads by path (`web.mjs:61-74`, `write.test.mjs:7-10`). `readiness.ts` is the studio's, and the reveal tool needs the form too.
>   - **`sameForm(a, b)`** compares key by key over `EMPTY_FORM`'s keys, so the order a form's keys were set in doesn't count, as it would with the outline's `JSON.stringify` check. R4-3b's `dirty` uses it; Edit's `dirty` is R4-2a's `hasEdits` (R4-4b).
> - **`src/test/revealForm.ts`** promotes `validateForm.test.ts:9-31`'s `form()` as `revealForm(overrides)`, with `RUBY_NUMBER`. `validateForm.test.ts` imports it as `form`, so no test body there changes. `buildPreviewCard.test.ts:5`'s fixture stays: it is a different card, with a franchise, keywords and text.
> - **R-60: French in `SCAN_LANGUAGES`, and `ScanLanguage` widened to `string`** (added in verification). The header's contract addition 7 and its decisions table give R-60's `constants.ts` half to this task, and R4-2a defers to it (its Appendix A, whose block Step 4 uses). `constants.ts` is a reveal-sync contract file, and this task already runs reveal-sync for `validateForm.ts`. R4-2a's and R4-5b's Step 1 stop if `ScanLanguage` is still the list's union.
>   - `RevealCardForm` keeps its shape; its `scanLanguage` takes any code, as the engine's `scanLanguage?: string` does (`packages/synergy-engine/src/types/card.ts:59`, `utils/cardTransformer.ts:68`). The app's integrity test takes any two-letter code but `en` (`reveal-set-integrity.test.ts:153-160`).
>   - New reveal's select offers French with no other change: a new `RevealAdminForm.test.tsx` case pins it, failing first. `RevealAdminForm.tsx:167`'s `as ScanLanguage` cast still compiles and lints (the lint isn't type-aware), and goes with that file in R4-6c.
>   - reveal-sync never sets the field (`adjudicate.mjs:474-493`). No function takes a `ScanLanguage`, so the `string` alias adds no primitive parameter.
> - **Departures from the header's contract addition 7** (`R4-card-studio.md`, "The form helpers and readiness"). The controller updates the header to match, or this file:
>   - **`src/tools/reveal/emptyForm.ts`, not `revealForm.ts`.** `src/test/revealForm.ts` already takes that basename for the fixture, which exports `revealForm`; a product `revealForm.ts` exporting `EMPTY_FORM` beside it would be easy to mix up. R4-5b and R4-6a import `../reveal/emptyForm` already. R4-3b's draft names `./revealForm`: its Step 1 says to switch the two import lines to whichever module exists.
>   - **`ImageStatus {name, ready, error}`, not `ImageState {ready, error}`.** The checklist takes `Pick<ImageStatus, 'ready' | 'error'>`, so `{ready, error}` literals (R4-3b's test) still type-check; `visibleImageError` needs the name too. `error` is the upload's own; passing the controller's `imageError` instead gives the same checklist.
>   - **`SECTION_FIELDS` is not exported**, and there is no `SECTION_REQUIRED` (above). R4-5b imports only `sectionStatuses`, `visibleErrors` and the section types, and its sections hold the same fields.
>   - **R-73's check sits in `collectorError`**, which `checkIdentity` calls.
> - **A fresh form reads 1/7.** Card text is ticked from the start: it is optional, since a vanilla card has none, and it has no error until text is typed. The outline's table implies this, and a test pins it. If the owner would rather Card text start open, the change is to `CHECKLIST` alone.
> - **Pin facts at `16283a13`.**
>   - `SET_TOTAL` is 204 (revealSet.ts:56), bridged at `app-bridge.ts:30`. `inkBlock` is at :77-79. Set 14's Epic, Enchanted and Iconic printings are #205-242 (:96-105).
>   - The pinned `previewCards.json` holds 204 cards, numbered 1 to 204, all set 14: 38 have `variants` and no card has `scanLanguage` (one printing does). So R-73 refuses no pinned card, and R4-2a's "every pinned preview card passes `validateCardEdit`" still holds.
>   - revealSet.ts is unchanged since the audit's `bc877e1`.
> - **Gates once.** The steps run the five app test files, reveal-sync (this task touches `validateForm.ts` and `constants.ts`, both contract files), eslint on the ten changed files and one `pnpm typecheck`. The pre-commit hook runs the full lint and `test:run`.
> - **Code Health, counted by hand.**
>   - **Primitive parameters.** `readiness.ts`: none of 18. `firstError`'s `keys: readonly string[]` is the only candidate; counted as one, that is 1/18 (6%). `emptyForm.ts`: 0/2. `src/test/revealForm.ts`: 0/1. `constants.ts`: no functions. `validateForm.ts` goes from 4/18 (22%) to 4/20 (20%): `collectorError` takes the form, not the parsed number.
>   - **Complexity.** The highest is `collectorError` at 5. `checkIdentity` drops from 5 to 3. In `readiness.ts`, `statusOf` and the checklist's map callback are about 4, and `imagePending` 3. There is no `a || b || c` chain.
> - **What was verified, and how.** Copies of `src` and `scripts` and the configs were put in `scratchpad/r4-rebase/sandbox-R4-3a` (the draft) and again, from the working tree, in `sandbox-R4-3a-verify` (this file as it stands), with junctions to the repo's `node_modules` and `upstream` (at `16283a13`). Vite's cache and tsc's build info were kept in the sandbox, with `server.fs.strict` off so Vite follows the junctions; the changed files were copied to a scratch git folder for CodeScene. Every code block was taken from this file by script.
>   - **Failing first.** With the fixture and the new tests in place and the old code, `validateForm.test.ts` gives `Tests 2 failed | 18 passed (20)` and `RevealAdminForm.test.tsx` `Tests 1 failed | 3 passed (4)`. Before their modules exist, `emptyForm.test.ts` and `readiness.test.ts` fail to resolve `../emptyForm` and `../readiness` (`Tests no tests`).
>   - **Passing.** After each step's code: `readiness.test.ts` 37, `emptyForm.test.ts` 7, `validateForm.test.ts` 20, `RevealAdminForm.test.tsx` 4 and `useRevealAdmin.test.ts` 3: `Tests 71 passed (71)`.
>   - **Wider runs.** The whole app project gave `Test Files 118 passed (118)`, `Tests 1542 passed (1542)`, and `--project scripts scripts/reveal-sync` gave `Test Files 18 passed (18)`, `Tests 272 passed (272)`.
>   - **Mutation check.** 12 mutants were run against `readiness.ts`, `validateForm.ts` and `emptyForm.ts`:
>     - no upper bound on the number;
>     - every error shown;
>     - no hidden-error check, and no `checked`;
>     - the item's own reason before the validator's message;
>     - no chosen-file check;
>     - no trim;
>     - no past-the-set refusal;
>     - a JSON `sameForm`;
>     - Ink with no reason of its own;
>     - no "Reading the image…";
>     - the image's two errors in the other order.
>
>     All 12 are killed. The revised `readiness.ts` was checked again with 8: the upload's error alone, the validator's alone, the validator's first (the draft's order, which the "a refused name whose bytes failed too" row now fails), no chosen-file check, no "Reading the image…", no upper bound, every error shown and no `checked`. All 8 are killed.
>   - **Typecheck.** `tsc -b` over the sandbox (src, the tests, the bridge) is clean, with `ScanLanguage = string`.
>   - **Lint.** All ten files, and the unchanged `RevealAdminForm.tsx` with its cast, pass `pnpm exec eslint` (exit 0).
>   - **Code Health.** Local CodeScene (MCP 1.5.7) scores `readiness.ts`, `readiness.test.ts`, `validateForm.ts`, `validateForm.test.ts`, `emptyForm.ts`, `emptyForm.test.ts`, `RevealAdminForm.test.tsx` and `useRevealAdmin.ts` 10.0 with no findings. `src/test/revealForm.ts` and `constants.ts` get no score, since they hold no logic to score. The PR gate is stricter, so `analyze_change_set` runs before the phase's push (R4-8).

### Task R4-3a: The readiness model (checklist, section dots, R-72's visible errors, R-73's refusal, R-60's French)

**Files:**
- Create `src/tools/studio/readiness.ts`: the checklist, the section statuses and the visible-error rule.
- Create `src/tools/reveal/emptyForm.ts`: `EMPTY_FORM`, moved out of `useRevealAdmin.ts`, and `sameForm`.
- Create `src/test/revealForm.ts`: the shared form fixture, promoted from `validateForm.test.ts`.
- Modify `src/tools/reveal/validateForm.ts`: export `intField`, and refuse a number past the set (R-73).
- Modify `src/tools/reveal/constants.ts`: French in `SCAN_LANGUAGES`, and `ScanLanguage` widened to `string` (R-60).
- Modify `src/tools/reveal/useRevealAdmin.ts`: import `EMPTY_FORM` and delete the private copy. Nothing else changes; R4-3b adds the controller's fields.
- Test (create): `src/tools/studio/__tests__/readiness.test.ts`, `src/tools/reveal/__tests__/emptyForm.test.ts`.
- Test (modify): `src/tools/reveal/__tests__/validateForm.test.ts`. It moves to the shared fixture, and R-73 replaces the test that skipped the ink check past the set.
- Test (modify): `src/tools/reveal/__tests__/RevealAdminForm.test.tsx`: one case, that the scan-language select offers French (R-60). R4-6c deletes the file with the form; R4-5b's select test reads `SCAN_LANGUAGES`.

`src/tools/studio/` may not exist yet: this task creates it. Nothing in the app bridge changes: `SET_TOTAL`, `inkBlock`, `ALL_INKS` and `REVEAL_ID_BASE` are bridged already (`app-bridge.ts:16`, `:26`, `:30`, `:37`).

**Interfaces:**
- **Consumes:**
  - `validateRevealCardForm(form: RevealCardForm, existingIds: ReadonlySet<number>, imageName: string | null): ValidationResult` and `interface ValidationResult {ok: boolean; errors: Record<string, string>}` (`src/tools/reveal/validateForm.ts:113-126`, `:15-18`). Its keys: `collectorNumber`, `name`, `cost`, `ink`, `ink2`, `type`, `strength`, `willpower`, `lore`, `moveCost`, `fullText`, `keywords` and `image`.
  - `intField(value: string): number | null` (`validateForm.ts:26`), exported by this task.
  - `RevealCardForm` (`src/tools/reveal/buildPreviewCard.ts:9-28`), `type StatField` (`src/tools/reveal/constants.ts:6`), and `SCAN_LANGUAGES` with `type ScanLanguage` (`constants.ts:39-46`), which R-60 changes.
  - From the bridge: `SET_TOTAL` (204 at the pin, `revealSet.ts:56`), `inkBlock` (`:77-79`), `ALL_INKS`, `REVEAL_ID_BASE`.
  - The shape `ImageStatus` mirrors: `useImageUpload`'s `file`, `dataUrl` and `error` (`src/components/useImageUpload.ts:48-59`). `dataUrl` is set only for bytes that pass the check, and never beside an `error` (`:74-89`).
- **Produces:**
```ts
// src/tools/studio/readiness.ts
export interface ImageStatus {name: string | null; ready: boolean; error: string | null}
// name: the chosen file's (null before one); ready: its bytes are read and pass (dataUrl set); error: the upload's own
export type ChecklistId = 'collectorNumber' | 'name' | 'ink' | 'cost' | 'typeStats' | 'cardText' | 'image';
export interface ChecklistItem {id: ChecklistId; label: string; done: boolean; message: string | null} // message null iff done
/** Every item done exactly when validation.ok and the image bytes are read (readyToPublish, the token aside). */
export function revealChecklist(form: RevealCardForm, validation: ValidationResult, image: Pick<ImageStatus, 'ready' | 'error'>): ChecklistItem[];
/** R-72: the errors on values the operator filled in; a blank value's error is dropped, and `image` never appears. */
export function visibleErrors(form: RevealCardForm, errors: Readonly<Record<string, string>>): Record<string, string>;
/** R-72 for the file input: null before a file is chosen, then the upload's own error, else the validator's image error. */
export function visibleImageError(errors: Readonly<Record<string, string>>, image: ImageStatus): string | null;
export type SectionId = 'identity' | 'ink' | 'type' | 'text';
export type SectionState = 'error' | 'complete' | 'incomplete';
export interface SectionStatus {state: SectionState; message: string | null} // message: the first shown error, null unless 'error'
export function sectionStatuses(form: RevealCardForm, errors: Readonly<Record<string, string>>): Record<SectionId, SectionStatus>;

// src/tools/reveal/emptyForm.ts
export const EMPTY_FORM: Readonly<RevealCardForm>;   // every text field blank; Amber, Character, inkable, 'en'
export function sameForm(a: Readonly<RevealCardForm>, b: Readonly<RevealCardForm>): boolean; // key by key; key order doesn't count

// src/tools/reveal/validateForm.ts (signatures otherwise unchanged)
export function intField(value: string): number | null; // was private
// validateRevealCardForm now reports collectorNumber "#N is past the {SET_TOTAL}-card set: special printings go in through variants.mjs stage" for N > SET_TOTAL (R-73)

// src/tools/reveal/constants.ts (R-60; a reveal-sync contract file, so additive only)
export const SCAN_LANGUAGES; // gains {code: 'fr', label: 'French'} after Italian
export type ScanLanguage = string; // was the list's union: a listed code, or any code a card already carries

// src/test/revealForm.ts (tests and stories only)
export const RUBY_NUMBER: number;                                          // inkBlock('Ruby').first
export function revealForm(overrides?: Partial<RevealCardForm>): RevealCardForm; // a complete Ruby character, no card text
```

**The checklist.** It reads "Ready to publish N/7", in the form's order. Each item takes the validator's message for its first key with one (the form's order), else its own reason. The Image item has no keys of its own: it reads the image's message as the file input does. Rarity is not an item: it stays optional.

| Item (`label`) | Keys, in order | Open with no key's message when |
|---|---|---|
| `collectorNumber` (Collector number) | `collectorNumber` | — |
| `name` (Name) | `name` | — |
| `ink` (Ink) | `ink`, `ink2` | the number isn't in the set: "Checked against the collector number: set it first". So the Amber default never ticks it. |
| `cost` (Cost) | `cost` | — |
| `typeStats` (Type and stats) | `type`, `strength`, `moveCost`, `willpower`, `lore` | — |
| `cardText` (Card text) | `keywords`, `fullText` | — |
| `image` (Image) | none: it reads `image` after the upload's error | the upload's error, else the validator's `image` (no file yet, or a name it refuses), else "Reading the image…" while the bytes are read |

Between them the items cover every key the validator reports, each once: the Image item covers `image`. The stat order is the form's: a Character prints Strength and a Location Move cost, then both print Willpower and Lore.

**The sections** (`sectionStatuses`), which follow the studio form:

| Section | Keys, in the form's order | Checked once |
|---|---|---|
| `identity` | `collectorNumber`, `name`, `version`, `franchise`, `subtypes` | always |
| `ink` | `ink`, `ink2`, `rarity` | the number is in the set |
| `type` | `type`, `inkwell`, `cost`, `strength`, `moveCost`, `willpower`, `lore` | always |
| `text` | `keywords`, `fullText`, `scanLanguage` | always |

- **`error`** (red): a key has an error `visibleErrors` shows. The message is the first one.
- **`complete`** (green): no key has any error, shown or hidden, and the section is checked.
- **`incomplete`** (neutral): anything else. A blank required value is the common case: its error is hidden.

Every validator key except `image` lands on exactly one section.

**What shows red** (R-72):

| Value | Error | Shown? |
|---|---|---|
| a blank or all-space required field (number, name, cost, a printed stat) | the validator's "Enter …" or "… is required" | no: the section is neutral and the checklist names it |
| `0`, `12x`, `-1`, `1.5`, a number past the set, a colliding number | the validator's | yes |
| an ink its number's block refuses; a second ink equal to the first | the validator's | yes |
| a glyph word in the text or a keyword chip | the validator's | yes |
| no image chosen | "Upload a card image" | no: the checklist's Image item names it |
| a chosen file whose name or bytes fail | the upload's (it says what to do, as today's publisher shows it), else the validator's | yes, on the file input |

- [ ] **Step 1: Check what this task builds on**

```bash
git -C upstream/inkweave rev-parse HEAD
grep -n "^function intField\|^export function intField" src/tools/reveal/validateForm.ts
grep -n "skips the ink check past the numbered set" src/tools/reveal/__tests__/validateForm.test.ts
grep -n "^const EMPTY_FORM" src/tools/reveal/useRevealAdmin.ts
grep -n "{code: 'it'\|^export type ScanLanguage" src/tools/reveal/constants.ts
grep -n "^  SET_TOTAL,$" src/app-bridge.ts
grep -n "^export const SET_TOTAL\|^export function inkBlock" upstream/inkweave/apps/web/src/shared/constants/revealSet.ts
ls src/test src/tools/studio
pnpm build:engine
```

Expected:
- The pin starts `16283a13`. If not, stop: the pin bump hasn't merged into this branch's base.
- `26:function intField(value: string): number | null {`: still private.
- `71:  it('skips the ink check past the numbered set (promos, enchanteds)', () => {`
- `15:const EMPTY_FORM: RevealCardForm = {`
- `43:  {code: 'it', label: 'Italian'},` and `46:export type ScanLanguage = (typeof SCAN_LANGUAGES)[number]['code'];`: no French yet.
- `30:  SET_TOTAL,`
- `56:export const SET_TOTAL = …` and `77:export function inkBlock(ink: Ink): …`
- `src/test` lists `DeferredReader.ts`, `base64.ts`, `cardLinks.tsx`, `images.ts` and `setup.ts`, with no `revealForm.ts`. `src/tools/studio` doesn't exist, or holds no `readiness.ts`.
- `pnpm build:engine` exits 0. It builds the engine from the pin, which `validateForm.ts` imports. `typecheck` and `test:run` build it themselves, but a bare `pnpm vitest run` doesn't.

If a grep prints nothing, an earlier task or another branch has already changed the file: stop and report it.

- [ ] **Step 2: Promote the form fixture, and write R-73's and R-60's failing tests**

Create `src/test/revealForm.ts`:

```ts
import {inkBlock} from '../app-bridge';
import type {RevealCardForm} from '../tools/reveal/buildPreviewCard';

/** The first number of Ruby's block: taken from the season's constants, so the fixture stays valid every season. */
export const RUBY_NUMBER = inkBlock('Ruby').first;

/**
 * A complete Ruby character with no card text. With an image name and no
 * existing ids it passes validateRevealCardForm, so each test overrides only
 * what it is about.
 */
export function revealForm(overrides: Partial<RevealCardForm> = {}): RevealCardForm {
  return {
    collectorNumber: String(RUBY_NUMBER),
    name: 'Mei',
    version: 'Red Panda',
    rarity: 'Rare',
    franchise: '',
    cost: '4',
    ink: 'Ruby',
    ink2: '',
    inkwell: true,
    type: 'Character',
    strength: '3',
    willpower: '5',
    lore: '2',
    moveCost: '',
    subtypes: '',
    keywords: '',
    fullText: '',
    scanLanguage: 'en',
    ...overrides,
  };
}
```

In `src/tools/reveal/__tests__/validateForm.test.ts`, replace `:1-31` (the imports, `RUBY_NUMBER` and `form()`) with the imports below. Importing the fixture as `form` leaves every test body as it is:

```ts
import {describe, it, expect} from 'vitest';
import {validateRevealCardForm} from '../validateForm';
import {ALL_INKS, REVEAL_ID_BASE, SET_TOTAL} from '../../../app-bridge';
import {RUBY_NUMBER, revealForm as form} from '../../../test/revealForm';
```

Then replace the test at `:71-74` (before this step's edit):

```ts
  it('skips the ink check past the numbered set (promos, enchanteds)', () => {
    const r = validateRevealCardForm(form({ink: 'Amber', collectorNumber: String(SET_TOTAL + 5)}), NO_IDS, 'mei.png');
    expect(r.ok).toBe(true);
  });
```

with:

```ts
  // R-73: every number past the set is an Epic, Enchanted or Iconic printing of a set
  // card, and a printing is never a card. The ink check doesn't run there either.
  it.each([SET_TOTAL + 1, SET_TOTAL + 38])('refuses #%i, past the set, and points to variants.mjs', (n) => {
    const r = validateRevealCardForm(form({ink: 'Amber', collectorNumber: String(n)}), NO_IDS, 'mei.png');
    expect(r.errors).toEqual({
      collectorNumber: `#${n} is past the ${SET_TOTAL}-card set: special printings go in through variants.mjs stage`,
    });
  });

  it("accepts the set's last number in the last ink's block", () => {
    const lastInk = ALL_INKS[ALL_INKS.length - 1];
    expect(validateRevealCardForm(form({ink: lastInk, collectorNumber: String(SET_TOTAL)}), NO_IDS, 'mei.png').ok).toBe(true);
  });
```

At the pin these are #205, the first Epic, and #242, the last Iconic (`revealSet.ts:96-105`).

In `src/tools/reveal/__tests__/RevealAdminForm.test.tsx`, add a case after "picks the scan language, English unless changed" (`:52-60`), inside the `describe`:

```tsx
  // R-60: mid-season a card's only scan was French (14188), marked by hand.
  it('offers French as a scan language', () => {
    const onChange = vi.fn();
    render(<RevealAdminForm form={FORM} errors={{}} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText(/^Scan language/), {target: {value: 'fr'}});
    expect(onChange).toHaveBeenCalledWith({scanLanguage: 'fr'});
    expect(screen.getByRole('option', {name: 'French'})).toBeInTheDocument();
  });
```

- [ ] **Step 3: Run them, and see three fail**

Run: `pnpm vitest run --project app src/tools/reveal/__tests__/validateForm.test.ts src/tools/reveal/__tests__/RevealAdminForm.test.tsx`

Expected: `Test Files  2 failed (2)`, `Tests  3 failed | 21 passed (24)`. Both refusals fail:
```
AssertionError: expected {} to deeply equal { Object (collectorNumber) }
-   "collectorNumber": "#205 is past the 204-card set: special printings go in through variants.mjs stage",
```
and so does French, since jsdom sets a select to `''` for a value it has no option for:
```
AssertionError: expected "vi.fn()" to be called with arguments: [ { scanLanguage: 'fr' } ]
-     "scanLanguage": "fr",
+     "scanLanguage": "",
```
The last-number test passes already, and so does every test on the shared fixture.

- [ ] **Step 4: Refuse numbers past the set, export `intField`, and add French**

In `src/tools/reveal/validateForm.ts` (line numbers as they are before this step's edits):

1. Replace the bridge import at `:3`:
   ```ts
   import {ALL_INKS, SET_TOTAL, inkBlock} from '../../app-bridge';
   ```
2. Replace `intField`'s doc comment and signature (`:22-26`). Its body stays:
   ```ts
   /**
    * Parse a trimmed whole number, or null when blank or anything else ("1.5",
    * "3foo", or digits past what a JavaScript number holds exactly). Exported so the
    * Card studio's checklist reads the collector number exactly as this file does.
    */
   export function intField(value: string): number | null {
   ```
3. Replace `checkIdentity` (`:32-40`) with `collectorError` and a shorter `checkIdentity`. Its signature stays:
   ```ts
   /**
    * Why the collector number can't be a new card's, or undefined. Every number past
    * the set is an Epic, Enchanted or Iconic printing of one of its cards, and a
    * printing is never a card: it goes in through scripts/reveal-sync/variants.mjs.
    */
   function collectorError(form: RevealCardForm, existingIds: ReadonlySet<number>): string | undefined {
     const collector = intField(form.collectorNumber);
     if (collector === null || collector <= 0) return 'Enter a positive collector number';
     if (collector > SET_TOTAL) {
       return `#${collector} is past the ${SET_TOTAL}-card set: special printings go in through variants.mjs stage`;
     }
     if (existingIds.has(REVEAL_ID_BASE + collector)) return `Card id ${REVEAL_ID_BASE + collector} already exists`;
     return undefined;
   }

   function checkIdentity(form: RevealCardForm, existingIds: ReadonlySet<number>, errors: Errors): void {
     const collector = collectorError(form, existingIds);
     if (collector) errors.collectorNumber = collector;
     if (form.name.trim() === '') errors.name = 'Name is required';
   }
   ```
4. Replace `checkInkBlock`'s doc comment (`:58-63`). The function stays:
   ```ts
   /**
    * A set is numbered ink by ink, so the collector number implies the card's (first)
    * ink. Catches the form's default ink being left unchanged, which caused both of
    * last season's wrong-ink publishes. A number past the set belongs to no block, so
    * it isn't checked here: collectorError already refuses it.
    */
   ```

`validateRevealCardForm`'s signature and every other export stay the same: the reveal-sync contract (`R4-card-studio.md:26-33`).

In `src/tools/reveal/constants.ts` (R-60, R4-2a's Appendix A), replace the end of `SCAN_LANGUAGES` and the `ScanLanguage` line (`:43-46`):

```ts
  {code: 'it', label: 'Italian'},
  {code: 'fr', label: 'French'},
] as const;

/**
 * A scan language code on the form: a listed one, or any other code a card
 * already carries, which Card studio keeps as it is (R-60). 'en' leaves the
 * card unmarked. The app takes any two-letter code but 'en' (its
 * reveal-set-integrity test).
 */
export type ScanLanguage = string;
```

`RevealCardForm` keeps its shape. `RevealAdminForm.tsx:167`'s `e.target.value as ScanLanguage` stays: it compiles and lints as it is, and goes with the file in R4-6c.

- [ ] **Step 5: Run them to PASS, then reveal-sync**

Run: `pnpm vitest run --project app src/tools/reveal/__tests__/validateForm.test.ts src/tools/reveal/__tests__/RevealAdminForm.test.tsx`
Expected: `Test Files  2 passed (2)`, `Tests  24 passed (24)`.

Run: `pnpm vitest run --project scripts scripts/reveal-sync`
Expected: every file passes: `Test Files  18 passed (18)` and `Tests  272 passed (272)` when this was written. The write chain (`write-chain.test.mjs`, `write.test.mjs`, `web.test.mjs`) loads `validateForm.ts`, `write.test.mjs` imports `constants.ts`, and the numbering gate skips any number outside the set first (`gates.mjs:85-97`). If a test fails here, stop: the contract has moved.

- [ ] **Step 6: Write `sameForm`'s failing test**

Create `src/tools/reveal/__tests__/emptyForm.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import type {RevealCardForm} from '../buildPreviewCard';
import {EMPTY_FORM, sameForm} from '../emptyForm';

describe('sameForm', () => {
  it('reads a form patched back to its start as unchanged, whatever order its keys were set in', () => {
    const {collectorNumber, ...rest} = EMPTY_FORM;
    const reordered: RevealCardForm = {...rest, collectorNumber};
    // A JSON comparison would call it changed.
    expect({json: JSON.stringify(reordered) === JSON.stringify(EMPTY_FORM), same: sameForm(reordered, EMPTY_FORM)}).toEqual({
      json: false,
      same: true,
    });
  });

  it.each<[string, Partial<RevealCardForm>]>([
    ['a text field', {name: 'Mei'}],
    ['the ink', {ink: 'Ruby'}],
    ['the second ink', {ink2: 'Steel'}],
    ['inkable', {inkwell: false}],
    ['the type', {type: 'Item'}],
    ['the scan language', {scanLanguage: 'ja'}],
  ])('tells a change to %s', (_, patch) => {
    expect(sameForm({...EMPTY_FORM, ...patch}, EMPTY_FORM)).toBe(false);
  });
});
```

- [ ] **Step 7: Run it, and see it fail**

Run: `pnpm vitest run --project app src/tools/reveal/__tests__/emptyForm.test.ts`
Expected: `Test Files  1 failed (1)`, `Tests  no tests`:
```
Error: Failed to resolve import "../emptyForm" from "src/tools/reveal/__tests__/emptyForm.test.ts". Does the file exist?
```

- [ ] **Step 8: Move `EMPTY_FORM` out, and add `sameForm`**

Create `src/tools/reveal/emptyForm.ts`:

```ts
import type {RevealCardForm} from './buildPreviewCard';

/**
 * A New reveal form before the operator types: every text field blank, the
 * controls on their defaults (Amber, a Character, inkable, an English scan).
 */
export const EMPTY_FORM: Readonly<RevealCardForm> = {
  collectorNumber: '',
  name: '',
  version: '',
  rarity: '',
  franchise: '',
  cost: '',
  ink: 'Amber',
  ink2: '',
  inkwell: true,
  type: 'Character',
  strength: '',
  willpower: '',
  lore: '',
  moveCost: '',
  subtypes: '',
  keywords: '',
  fullText: '',
  scanLanguage: 'en',
};

// EMPTY_FORM is a whole RevealCardForm, so its keys are every key a form holds.
const FORM_KEYS = Object.keys(EMPTY_FORM) as (keyof RevealCardForm)[];

/**
 * Whether two forms hold the same values, key by key. Unlike comparing two
 * JSON strings, the order the keys were set in doesn't count: a form patched
 * back to its start reads as unchanged.
 */
export function sameForm(a: Readonly<RevealCardForm>, b: Readonly<RevealCardForm>): boolean {
  return FORM_KEYS.every((key) => a[key] === b[key]);
}
```

In `src/tools/reveal/useRevealAdmin.ts`, delete the private `EMPTY_FORM` (`:15-34`, and the blank line after it), and import the shared one after `buildPreviewCard`'s import (`:10`):

```ts
import {buildPreviewCard, type RevealCardForm} from './buildPreviewCard';
import {EMPTY_FORM} from './emptyForm';
import {validateRevealCardForm, type ValidationResult} from './validateForm';
```

`useState<RevealCardForm>(EMPTY_FORM)` (`:94`) and `setForm(EMPTY_FORM)` (`:128`) take the `Readonly` constant as they are. React state never mutates it: `patchForm` spreads a new object.

- [ ] **Step 9: Run them to PASS**

Run: `pnpm vitest run --project app src/tools/reveal/__tests__/emptyForm.test.ts src/tools/reveal/__tests__/useRevealAdmin.test.ts`
Expected: `Test Files  2 passed (2)`, `Tests  10 passed (10)`: 7 for `sameForm` and the hook's 3, which are unchanged.

- [ ] **Step 10: Write the readiness model's failing test**

Create `src/tools/studio/__tests__/readiness.test.ts`. Every error comes from `validateRevealCardForm`; no test writes one by hand. One `it.each` table holds a form for each validator key, and checks both the checklist item and the section it lands on.

```ts
import {describe, expect, it} from 'vitest';
import type {CardType} from 'inkweave-synergy-engine';
import {REVEAL_ID_BASE, SET_TOTAL, inkBlock} from '../../../app-bridge';
import {RUBY_NUMBER, revealForm} from '../../../test/revealForm';
import type {RevealCardForm} from '../../reveal/buildPreviewCard';
import {EMPTY_FORM} from '../../reveal/emptyForm';
import {validateRevealCardForm} from '../../reveal/validateForm';
import {
  revealChecklist,
  sectionStatuses,
  visibleErrors,
  visibleImageError,
  type ChecklistId,
  type ChecklistItem,
  type ImageStatus,
  type SectionId,
  type SectionState,
  type SectionStatus,
} from '../readiness';

const NO_IDS: ReadonlySet<number> = new Set();
/** The fixture card's own id, so its number collides. */
const TAKEN: ReadonlySet<number> = new Set([REVEAL_ID_BASE + RUBY_NUMBER]);
const NO_FILE: ImageStatus = {name: null, ready: false, error: null};
const READING: ImageStatus = {name: 'mei.png', ready: false, error: null};
const READ: ImageStatus = {name: 'mei.png', ready: true, error: null};
const INK_NEEDS_NUMBER = 'Checked against the collector number: set it first';

/** A form as the page holds it: the card list's ids and the image beside it. */
interface Case {form: RevealCardForm; ids?: ReadonlySet<number>; image?: ImageStatus}

/** The validator's verdict, as the page runs it: no test writes errors by hand. */
function validate({form, ids = NO_IDS, image = READ}: Case) {
  return validateRevealCardForm(form, ids, image.name);
}

function checklist(c: Case): ChecklistItem[] {
  return revealChecklist(c.form, validate(c), c.image ?? READ);
}

/** The items still open, each as its id and message. */
function openItems(c: Case): Array<Pick<ChecklistItem, 'id' | 'message'>> {
  return checklist(c)
    .filter((item) => !item.done)
    .map(({id, message}) => ({id, message}));
}

/** The sections that aren't complete, with their status. */
function openSections(c: Case): Partial<Record<SectionId, SectionStatus>> {
  const statuses = sectionStatuses(c.form, validate(c).errors);
  return Object.fromEntries(Object.entries(statuses).filter(([, status]) => status.state !== 'complete'));
}

interface OneError {key: string; c: Case; item: ChecklistId; section?: SectionId; state?: SectionState}

// One form per key validateRevealCardForm reports, valid but for that key. Each key
// opens exactly one checklist item, which takes the validator's message, and every
// key but the image opens exactly one section: red for a filled value that fails,
// neutral for a blank one (R-72).
const ONE_ERROR: readonly OneError[] = [
  // A collision leaves Collector number open, and Ink done: the block check ran on the number.
  {key: 'collectorNumber', c: {form: revealForm(), ids: TAKEN}, item: 'collectorNumber', section: 'identity', state: 'error'},
  {key: 'name', c: {form: revealForm({name: ''})}, item: 'name', section: 'identity', state: 'incomplete'},
  {key: 'cost', c: {form: revealForm({cost: ''})}, item: 'cost', section: 'type', state: 'incomplete'},
  // The ink-block clash: the number's block names another ink.
  {key: 'ink', c: {form: revealForm({ink: 'Amber'})}, item: 'ink', section: 'ink', state: 'error'},
  {key: 'ink2', c: {form: revealForm({ink2: 'Ruby'})}, item: 'ink', section: 'ink', state: 'error'},
  // Only a hand-built form gets this far: the type control offers the four types.
  {key: 'type', c: {form: revealForm({type: 'Bogus' as CardType})}, item: 'typeStats', section: 'type', state: 'error'},
  {key: 'strength', c: {form: revealForm({strength: '3foo'})}, item: 'typeStats', section: 'type', state: 'error'},
  {key: 'willpower', c: {form: revealForm({willpower: '-1'})}, item: 'typeStats', section: 'type', state: 'error'},
  // A Character with no lore leaves Type & stats incomplete, not red.
  {key: 'lore', c: {form: revealForm({lore: ''})}, item: 'typeStats', section: 'type', state: 'incomplete'},
  {key: 'moveCost', c: {form: revealForm({type: 'Location', moveCost: ''})}, item: 'typeStats', section: 'type', state: 'incomplete'},
  {key: 'fullText', c: {form: revealForm({fullText: 'Your Strength wins.'})}, item: 'cardText', section: 'text', state: 'error'},
  {key: 'keywords', c: {form: revealForm({keywords: 'Challenger +2 Strength'})}, item: 'cardText', section: 'text', state: 'error'},
  {key: 'image', c: {form: revealForm(), image: NO_FILE}, item: 'image'},
];

describe('the checklist and the section dots', () => {
  it.each(ONE_ERROR)('put $key on the $item item, and on one section at most', ({key, c, item, section, state}) => {
    const message = validate(c).errors[key];
    expect({errors: Object.keys(validate(c).errors), items: openItems(c), sections: openSections(c)}).toEqual({
      errors: [key],
      items: [{id: item, message}],
      sections: section ? {[section]: {state, message: state === 'error' ? message : null}} : {},
    });
  });

  it.each([
    ['a Character', revealForm()],
    ['an Item with a cost and no stats', revealForm({type: 'Item', strength: '', willpower: '', lore: ''})],
    ['a Location with its move cost', revealForm({type: 'Location', strength: '', moveCost: '1'})],
  ])('tick every item and section for %s with its image read', (_, form) => {
    expect({items: openItems({form}), sections: openSections({form})}).toEqual({items: [], sections: {}});
  });

  it('read 1/7 on a fresh form, naming what is left, with no section red', () => {
    const c: Case = {form: EMPTY_FORM, image: NO_FILE};
    expect({items: openItems(c), sections: openSections(c)}).toEqual({
      // Card text is optional, as a vanilla card has none, so it starts ticked.
      items: [
        {id: 'collectorNumber', message: 'Enter a positive collector number'},
        {id: 'name', message: 'Name is required'},
        {id: 'ink', message: INK_NEEDS_NUMBER},
        {id: 'cost', message: 'Enter a cost (0 or more)'},
        {id: 'typeStats', message: 'Enter strength for a character'},
        {id: 'image', message: 'Upload a card image'},
      ],
      sections: {
        identity: {state: 'incomplete', message: null},
        ink: {state: 'incomplete', message: null},
        type: {state: 'incomplete', message: null},
      },
    });
  });

  it('turn a section red for one value that fails, even beside a blank one', () => {
    const form = revealForm({collectorNumber: '0', name: ''});
    expect(sectionStatuses(form, validate({form}).errors).identity).toEqual({
      state: 'error',
      message: 'Enter a positive collector number',
    });
  });
});

describe('the Ink item', () => {
  // The tick follows the ink-block check, never the Amber default.
  it.each(['', '0', '12x', String(SET_TOTAL + 1)])('waits for a number in the set (%j), with the Amber default', (collectorNumber) => {
    const form = revealForm({collectorNumber, ink: 'Amber'});
    const ink = checklist({form}).find((item) => item.id === 'ink');
    expect({ink, section: sectionStatuses(form, validate({form}).errors).ink}).toEqual({
      ink: {id: 'ink', label: 'Ink', done: false, message: INK_NEEDS_NUMBER},
      section: {state: 'incomplete', message: null},
    });
  });

  it("ticks once the number is in the ink's own block", () => {
    const form = revealForm({collectorNumber: String(inkBlock('Amber').first), ink: 'Amber'});
    expect(checklist({form}).find((item) => item.id === 'ink')?.done).toBe(true);
  });
});

describe('the image', () => {
  it.each([
    {name: 'no file yet', image: NO_FILE, item: 'Upload a card image', input: null},
    {name: 'bytes still being read', image: READING, item: 'Reading the image…', input: null},
    {
      name: 'a name the validator refuses',
      image: {...READING, name: 'mei.gif'},
      item: 'Image must be jpg, jpeg, png, or webp',
      input: 'Image must be jpg, jpeg, png, or webp',
    },
    {
      name: 'bytes that fail the byte check',
      image: {...READING, error: 'mei.png is not a JPEG, PNG or WebP image.'},
      item: 'mei.png is not a JPEG, PNG or WebP image.',
      input: 'mei.png is not a JPEG, PNG or WebP image.',
    },
    // Both refuse it: the upload's message comes first, since it says what to do.
    {
      name: 'a refused name whose bytes failed too',
      image: {name: 'mei.gif', ready: false, error: 'mei.gif holds a PNG image; rename it to end in .png.'},
      item: 'mei.gif holds a PNG image; rename it to end in .png.',
      input: 'mei.gif holds a PNG image; rename it to end in .png.',
    },
    {name: 'a file read and checked', image: READ, item: null, input: null},
  ])('gives the checklist and the file input their messages for $name', ({image, item, input}) => {
    const c: Case = {form: revealForm(), image};
    const imageItem = checklist(c).find((entry) => entry.id === 'image');
    expect({item: imageItem?.message, input: visibleImageError(validate(c).errors, image)}).toEqual({item, input});
  });
});

describe('visibleErrors', () => {
  it('keeps the errors on filled values and drops those on blank ones, spaces included (R-72)', () => {
    const form = revealForm({name: '   ', cost: '1.5', lore: '', fullText: 'Your Strength wins.'});
    expect(visibleErrors(form, validate({form}).errors)).toEqual({
      cost: 'Enter a cost (0 or more)',
      fullText: '"Strength" is spelled out: use ¤ ("their ¤")',
    });
  });

  it('shows nothing on a fresh form, and never the image', () => {
    const fresh = validate({form: EMPTY_FORM, image: NO_FILE}).errors;
    const badName = validate({form: revealForm(), image: {...READ, name: 'mei.gif'}}).errors;
    expect({fresh: visibleErrors(EMPTY_FORM, fresh), badName: visibleErrors(revealForm(), badName)}).toEqual({
      fresh: {},
      badName: {},
    });
  });
});

describe('readiness against readyToPublish', () => {
  // Every item is done exactly when the validation passes and the bytes are read.
  // Past the set, the validator once passed while Ink waited; R-73 refuses the number.
  it.each([
    {name: 'a fresh form', c: {form: EMPTY_FORM, image: NO_FILE}},
    {name: 'a valid form with no image', c: {form: revealForm(), image: NO_FILE}},
    {name: 'a valid form whose image is being read', c: {form: revealForm(), image: READING}},
    {name: 'a valid form whose image is read', c: {form: revealForm(), image: READ}},
    {name: 'a colliding number', c: {form: revealForm(), ids: TAKEN, image: READ}},
    {name: 'a number past the set', c: {form: revealForm({collectorNumber: String(SET_TOTAL + 1), ink: 'Amber'}), image: READ}},
  ])('hold for $name', ({c}) => {
    const validation = validate(c);
    expect(checklist(c).every((item) => item.done)).toBe(validation.ok && c.image.ready);
  });
});
```

- [ ] **Step 11: Run it, and see it fail**

Run: `pnpm vitest run --project app src/tools/studio/__tests__/readiness.test.ts`
Expected: `Test Files  1 failed (1)`, `Tests  no tests`:
```
Error: Failed to resolve import "../readiness" from "src/tools/studio/__tests__/readiness.test.ts". Does the file exist?
```

- [ ] **Step 12: Write `readiness.ts`**

Create `src/tools/studio/readiness.ts`:

```ts
import {SET_TOTAL} from '../../app-bridge';
import type {RevealCardForm} from '../reveal/buildPreviewCard';
import type {StatField} from '../reveal/constants';
import {intField, type ValidationResult} from '../reveal/validateForm';

/** The validator's errors: a message per key (validateRevealCardForm). */
type Errors = Readonly<Record<string, string>>;

/**
 * The stats in the order the form shows them: a Character prints Strength and a
 * Location Move cost, then both print Willpower and Lore (STAT_FIELDS).
 */
const STAT_KEYS: readonly StatField[] = ['strength', 'moveCost', 'willpower', 'lore'];

/** The first of these keys' messages, in the order given, or null. */
function firstError(errors: Errors, keys: readonly string[]): string | null {
  const key = keys.find((k) => Object.hasOwn(errors, k));
  return key === undefined ? null : errors[key];
}

/**
 * The collector number parses as the validator parses it (intField) and falls
 * inside the set, so the validator's ink-block check ran on it. A number that
 * collides with an existing id still counts: the check runs on it too.
 */
function numberInSet(form: RevealCardForm): boolean {
  const collector = intField(form.collectorNumber) ?? 0;
  return collector >= 1 && collector <= SET_TOTAL;
}

/**
 * The card image as useImageUpload holds it. The checklist reads `ready` and
 * `error`; the file input's error (visibleImageError) reads `name` and `error`.
 */
export interface ImageStatus {
  /** The chosen file's name, or null before one is chosen. */
  name: string | null;
  /** Its bytes are read and pass the byte check: useImageUpload's dataUrl is set. */
  ready: boolean;
  /** The upload's own error: bytes that aren't the image the name claims, or a read that failed. */
  error: string | null;
}

export type ChecklistId = 'collectorNumber' | 'name' | 'ink' | 'cost' | 'typeStats' | 'cardText' | 'image';
/** One line of "Ready to publish N/7". `message` says why it is open, and is null exactly when it is done. */
export interface ChecklistItem {id: ChecklistId; label: string; done: boolean; message: string | null}

interface ItemInput {form: RevealCardForm; errors: Errors; image: Pick<ImageStatus, 'ready' | 'error'>}
interface ItemSpec {
  id: ChecklistId;
  label: string;
  /** The validator's keys the item covers, in the form's order: it takes the first one's message as its own. */
  keys: readonly string[];
  /** Why the item is still open when none of its keys has a message, or null. */
  pending?: (input: ItemInput) => string | null;
}

const INK_NEEDS_NUMBER = 'Checked against the collector number: set it first';
const READING_IMAGE = 'Reading the image…';

/**
 * The image's error: the upload's own (bytes that aren't the image the name
 * claims, or a read that failed), else the validator's (no file yet, or a name
 * it refuses). The upload's comes first because it says what to do ("rename it
 * to end in .png"), as the reveal publisher shows it today.
 */
function imageError(errors: Errors, image: Pick<ImageStatus, 'error'>): string | null {
  return image.error ?? firstError(errors, ['image']);
}

/** Why the Image item is open: imageError, else "Reading the image…" until the bytes are read and pass. */
function imagePending({errors, image}: ItemInput): string | null {
  return imageError(errors, image) ?? (image.ready ? null : READING_IMAGE);
}

/**
 * The checklist, in the form's order. Between them the keys cover every key
 * validateRevealCardForm reports but `image`, each once; the Image item reads
 * that one through imageError. Rarity is no item: it stays optional.
 */
const CHECKLIST: readonly ItemSpec[] = [
  {id: 'collectorNumber', label: 'Collector number', keys: ['collectorNumber']},
  {id: 'name', label: 'Name', keys: ['name']},
  // The tick follows the ink-block check, never the Amber default.
  {id: 'ink', label: 'Ink', keys: ['ink', 'ink2'], pending: ({form}) => (numberInSet(form) ? null : INK_NEEDS_NUMBER)},
  {id: 'cost', label: 'Cost', keys: ['cost']},
  {id: 'typeStats', label: 'Type and stats', keys: ['type', ...STAT_KEYS]},
  {id: 'cardText', label: 'Card text', keys: ['keywords', 'fullText']},
  {id: 'image', label: 'Image', keys: [], pending: imagePending},
];

/**
 * New reveal's checklist, from the validator. Every item is done exactly when
 * the validation passes and the image's bytes are read: readyToPublish, the
 * token aside. Each open item carries the validator's message for it, a blank
 * field's included, so the list names what is left.
 */
export function revealChecklist(
  form: RevealCardForm,
  validation: ValidationResult,
  image: Pick<ImageStatus, 'ready' | 'error'>,
): ChecklistItem[] {
  const input: ItemInput = {form, errors: validation.errors, image};
  return CHECKLIST.map(({id, label, keys, pending}) => {
    const message = firstError(validation.errors, keys) ?? pending?.(input) ?? null;
    return {id, label, done: message === null, message};
  });
}

/**
 * The form's own keys, each with whether its value is still blank: text the
 * operator hasn't filled in, spaces included. Its other values never are.
 */
function blankness(form: RevealCardForm): Map<string, boolean> {
  return new Map(Object.entries(form).map(([key, value]) => [key, typeof value === 'string' && value.trim() === '']));
}

/**
 * The errors to show in red (R-72): only those on a value the operator filled
 * in, such as a malformed number, the ink-block clash, a collision or a glyph
 * word. A blank required field is incomplete, not wrong: it gets no inline
 * error and no aria-invalid, and the checklist names it instead. The image is
 * no form field: the file input takes visibleImageError.
 */
export function visibleErrors(form: RevealCardForm, errors: Errors): Record<string, string> {
  const blank = blankness(form);
  return Object.fromEntries(Object.entries(errors).filter(([key]) => blank.get(key) === false));
}

/**
 * The file input's error (R-72): once a file is chosen, imageError, the
 * upload's own error before the validator's. Before a file is chosen, "Upload a
 * card image" is the checklist's, never the input's.
 */
export function visibleImageError(errors: Errors, image: ImageStatus): string | null {
  return image.name === null ? null : imageError(errors, image);
}

export type SectionId = 'identity' | 'ink' | 'type' | 'text';
/** A section header's dot: red for an error, green when complete, neutral while incomplete. */
export type SectionState = 'error' | 'complete' | 'incomplete';
/** `message` is the section's first shown error, and null unless the state is 'error'. */
export interface SectionStatus {state: SectionState; message: string | null}

interface SectionSpec {
  /** The section's form keys, in the order it shows them. */
  keys: readonly (keyof RevealCardForm)[];
  /** Whether the validator could check the section yet: Ink waits for a number in the set. */
  checked: (form: RevealCardForm) => boolean;
}

const ALWAYS = () => true;

/**
 * The studio form's four sections and the keys each holds. Which values a section
 * requires is the validator's to say: it reports every blank required value.
 */
const SECTIONS: Readonly<Record<SectionId, SectionSpec>> = {
  identity: {keys: ['collectorNumber', 'name', 'version', 'franchise', 'subtypes'], checked: ALWAYS},
  ink: {keys: ['ink', 'ink2', 'rarity'], checked: numberInSet},
  type: {keys: ['type', 'inkwell', 'cost', ...STAT_KEYS], checked: ALWAYS},
  text: {keys: ['keywords', 'fullText', 'scanLanguage'], checked: ALWAYS},
};

interface SectionInput {form: RevealCardForm; errors: Errors; shown: Errors}

/** Red for a shown error; green with no error at all once checked; else neutral, as for a blank required value. */
function statusOf(spec: SectionSpec, {form, errors, shown}: SectionInput): SectionStatus {
  const error = firstError(shown, spec.keys);
  if (error !== null) return {state: 'error', message: error};
  const complete = firstError(errors, spec.keys) === null && spec.checked(form);
  return {state: complete ? 'complete' : 'incomplete', message: null};
}

/**
 * Each section's status, for its header dot and, when closed, its summary.
 * Only an error visibleErrors shows turns a section red (R-72): a fresh form's
 * sections are neutral, never red. The image belongs to no section.
 */
export function sectionStatuses(form: RevealCardForm, errors: Errors): Record<SectionId, SectionStatus> {
  const input: SectionInput = {form, errors, shown: visibleErrors(form, errors)};
  const {identity, ink, type, text} = SECTIONS;
  return {
    identity: statusOf(identity, input),
    ink: statusOf(ink, input),
    type: statusOf(type, input),
    text: statusOf(text, input),
  };
}
```

- [ ] **Step 13: Run the task's tests to PASS**

Run: `pnpm vitest run --project app src/tools/studio/__tests__/readiness.test.ts src/tools/reveal/__tests__/emptyForm.test.ts src/tools/reveal/__tests__/validateForm.test.ts src/tools/reveal/__tests__/RevealAdminForm.test.tsx src/tools/reveal/__tests__/useRevealAdmin.test.ts`
Expected: `Test Files  5 passed (5)` and `Tests  71 passed (71)`: 37 + 7 + 20 + 4 + 3.

- [ ] **Step 14: Lint the changed files, and typecheck once**

Run:
```bash
pnpm exec eslint src/test/revealForm.ts src/tools/reveal/validateForm.ts src/tools/reveal/__tests__/validateForm.test.ts src/tools/reveal/constants.ts src/tools/reveal/__tests__/RevealAdminForm.test.tsx src/tools/reveal/emptyForm.ts src/tools/reveal/__tests__/emptyForm.test.ts src/tools/reveal/useRevealAdmin.ts src/tools/studio/readiness.ts src/tools/studio/__tests__/readiness.test.ts
```
Expected: no problems.

Run: `pnpm typecheck`
Expected: exit 0. It covers the tests too, and every reader of `ScanLanguage` (`buildPreviewCard.ts:27`, `RevealAdminForm.tsx:167`) under the widened type.

Don't run `pnpm lint` or `pnpm test:run` in full: the pre-commit hook does.

- [ ] **Step 15: Check Code Health**

Run CodeScene's `code_health_review` on these files:
- `src/tools/studio/readiness.ts` and its test;
- `src/tools/reveal/emptyForm.ts` and its test;
- `src/tools/reveal/validateForm.ts` and its test;
- `src/tools/reveal/constants.ts` and `src/tools/reveal/__tests__/RevealAdminForm.test.tsx`;
- `src/tools/reveal/useRevealAdmin.ts`;
- `src/test/revealForm.ts`.

Expected: 10.0 each, with no findings. MCP 1.5.7 gave that in the sandbox, and `src/test/revealForm.ts` and `constants.ts` got no score, since they hold no logic. The hand count is in the re-base notes. Primitive parameters: `readiness.ts` 0/18 (at most 1/18 if `readonly string[]` counts), `emptyForm.ts` 0/2, and `validateForm.ts` 4/20. Highest complexity: `collectorError`, at 5.

If a finding appears, fix it in this task, before the commit. Split the function, as `collectorError` came out of `checkIdentity`. The PR gate is stricter than the local tool, so R4-8 runs `analyze_change_set` before the push.

- [ ] **Step 16: Commit**, with the Bash tool, only after the owner approves. Use two separate calls, so the commit command starts with `USER_APPROVED=1`:

```bash
git add src/test/revealForm.ts src/tools/reveal/validateForm.ts src/tools/reveal/__tests__/validateForm.test.ts src/tools/reveal/constants.ts src/tools/reveal/__tests__/RevealAdminForm.test.tsx src/tools/reveal/emptyForm.ts src/tools/reveal/__tests__/emptyForm.test.ts src/tools/reveal/useRevealAdmin.ts src/tools/studio/readiness.ts src/tools/studio/__tests__/readiness.test.ts
```

```bash
USER_APPROVED=1 git commit -m "feat(studio): derive the reveal checklist and section dots from the validator (#24)"
```

The message is the header's task table's (`R4-card-studio.md`, R4-3a's row).

Husky's pre-commit runs the full lint and `test:run`; never `--no-verify`. If Vitest fails to start its workers under load, stop this session's preview servers, wait out other sessions' runs, and retry.

### Hand-offs from R4-3a

- **R4-3b (the reveal controller).**
  - **The module is `./emptyForm`.** R4-3b's draft imports `EMPTY_FORM` and `sameForm` from `./revealForm`; its Step 1 already says to use whichever module exists, in the hook's and the test's import lines.
  - **`dirty`** is `!sameForm(form, EMPTY_FORM) || upload.file !== null`, both from `./emptyForm`, not the outline's `JSON.stringify`. After a publish, `setForm(EMPTY_FORM)` (`useRevealAdmin.ts:128`, before this task's edit) makes it clean again.
  - **`imageError`.** R4-3b's `imageErrorOf(image: ChosenImage, validation)` calls `visibleImageError`, so each controller's `imageError` is already R-72's file-control error (null before a file is chosen). The card panel takes it as it is. A test that a fresh form's panel shows no "Upload a card image" belongs where the panel is wired (R4-6a has it).
  - **The invariant test** across the hook's states: `revealChecklist(ctrl.form, ctrl.validation, {ready: ctrl.imageDataUrl !== null, error: ctrl.uploadError}).every((item) => item.done) === ctrl.canPublish`, with the token saved. Passing `ctrl.imageError` as `error` gives the same items. Add a state where the bytes fail the check (`DeferredReader.reads[0].fail()`, or a `.gif` name).
  - **The fixture.** `useRevealAdmin.test.ts:20-30`'s `VALID_FORM` may become `revealForm()` from `src/test/revealForm.ts`. Its `patchForm` calls take a full form just as well.
- **R4-2a (`cardEdit.ts`).**
  - **R-73 reaches Edit too.** `validateCardEdit` calls `validateRevealCardForm`, so a preview entry numbered past the set fails every field save with R-73's message. That fails closed. No pinned entry is numbered past 204, so "every pinned preview card passes" holds.
  - **`editKindOf`.** If R4-2a would rather open such an entry image-only, with one of R-65's messages, it adds that rule itself.
  - **R-60 has landed here.** `constants.ts` carries French and `type ScanLanguage = string`, exactly Appendix A's block, so R4-2a's Step 1 check passes and Appendix A needs no second application.
- **R4-2b and R4-5b (R-60).** French is in `SCAN_LANGUAGES` and `ScanLanguage` is `string` from this task on; R4-5b's `onChange({scanLanguage: e.target.value})` needs no cast.
- **R4-4b (the Edit controller).** Edit's `dirty` is R4-2a's `hasEdits({changes, imageName})`. Its `imageError` is R4-3b's `imageErrorOf(staged, validateCardEdit(…))`, the same helper, so both panes word an image alike.
- **R4-5b (the form frame).**
  - **Errors.** The harness spreads `EMPTY_FORM` from `src/tools/reveal/emptyForm.ts`, which the outline called `EMPTY` (`R4-card-studio.md:767`). Or it uses `revealForm()` for a filled form.
  - **One rule for the form.** StudioForm can take the validator's full `errors`, and derive from them:
    - each `Field`'s inline error and `aria-invalid`, through `visibleErrors(form, errors)`;
    - each header's dot and closed summary, through `sectionStatuses(form, errors)`. An `error` header shows its `message`, so the state is never told by colour alone.
  - **The ported test.** "It ties each error to its control" then passes a filled, failing value, not a blank one.
- **R4-5d (the card panel).** The page passes it `visibleImageError`'s result as the staged image's `error` (R4-6a). No error shows before a file is chosen.
- **R4-5e (`ReadyChecklist`).**
  - It shows "Ready to publish {done}/{items.length}", with every open item's `message`. Each open item has one.
  - A fresh form reads 1/7: Card text starts ticked.
  - The checklist never turns red. R-72's red is for the fields, the dots and the file input.
- **R4-7 (docs).** The runbook's line that the publisher would add a printing as a card (REVEAL_RUNBOOK.md:42) changes. New reveal now refuses any number past the set and points to `variants.mjs stage`.
- **R4-8 ("R4 as built").** Record these as departures from the outline:
  - `sectionStatuses` in place of `sectionStatus`, with no `SECTION_REQUIRED` and no exported `SECTION_FIELDS`;
  - `visibleImageError` and `ImageStatus` (the header's `ImageState`), with the upload's error before the validator's;
  - `emptyForm.ts` (the header's `revealForm.ts`);
  - the checklist's "message null iff done".

  Add R-73's message to the plan's shared interfaces under `validateForm.ts`, and R-60's `ScanLanguage = string` under `constants.ts`.
