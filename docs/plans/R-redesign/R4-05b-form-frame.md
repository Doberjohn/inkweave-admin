> Part of [R: Admin redesign](../R-redesign.md), phase R4 ([R4-card-studio.md](R4-card-studio.md)). Read the main plan's decisions (R-57 to R-91 for R4), corrections, global constraints and shared interfaces, then the R4 header, first.

> **Re-base notes (R4-5b, 2026-10-07).** Re-based from the 2026-10-01 outline ("Task R4-5: Studio components, paths and layout", `R4-card-studio.md:601-810`, written against the planned R1 code) onto `main @ e5e5029` with pin `upstream/inkweave` @ `16283a13`, on branch `feature/24-redesign-r4`. Decisions R-57 to R-91 apply, and so does the R4 audit (`.superpowers/sdd/R-redesign/r4-audit-synth.md`, "R4-5"; `r4-audit-full.json`, audits[4]). What changed and why:
> 1. **The split.** Outline Task R4-5 is now 5a to 5f, plus 5s and 5h. This task is the form frame: `Field`, `FormSection`, the Identity, Type & stats and Card text sections, and `StudioForm`. Two pieces move across the 5b/5c line:
>    - **The Dual-ink switch is built here, not in R4-5c.** Its open state is lifted into `StudioForm` here (the audit's significant item: a section's own state would reset when the narrow accordion unmounts it), and only the switch can show that the lift works. R4-5c keeps the switch and `SectionProps.dual` as they are.
>    - **The ink and rarity controls, and Inkable, are interim ports.** `InkRaritySection` holds RevealAdminForm's Ink, Second ink and Rarity selects (`RevealAdminForm.tsx:99-113`, `:136-143`), and `TypeStatsSection` its Inkable checkbox (`:121-126`), all on admin's classes. So the form has every field at every commit, and the stories show a whole card. R4-5c **modifies** both files: InkPicker tiles (R-75), rarity buttons (R-74, R-83) and the Inkable buttons replace them.
>    - **The ink group's half of the first ported case moves to R4-5c,** with the group it describes (the outline's "the ink error describes `getByRole('group', {name: 'Ink'})`"). This task ports all three of `RevealAdminForm.test.tsx`'s cases (`:28-60`; the first on a filled cost, note 2) and both card-text cases. R4-3a's fourth case there, that the select offers French, is covered by "lists a language the list lacks…", whose expected options are `SCAN_LANGUAGES`, French included.
> 2. **R-72, one rule for the form.** `StudioForm` takes the validator's errors, all of them, as R4-3a's hand-off asks. Through `visibleErrors(form, errors)`, each field's inline error and `aria-invalid` show only for a filled value that fails. Through `sectionStatuses(form, errors)`, each header's dot does the same. A fresh New reveal form opens with nothing red: three neutral sections and Card text green, since nothing there is required.
>    - **The ported "ties each error to its control"** passed a blank name's "Name is required" (`RevealAdminForm.test.tsx:28-35`). R-72 hides that, so the port fills a cost of `1.5`, and a new case checks that a blank name beside a failing ink stays unmarked.
>    - **Errors are built by the validator** in every test and story, never by hand (audit).
> 3. **The accordion (the audit's significant item).**
>    - **Narrow.** Each header is `h2 > button.adm-acc-head`, with `aria-expanded`, and `aria-controls` only while its body is mounted. A closed section's fields unmount, as the outline has it. Identity opens first (`dc.html:672`), one section is open at a time, and pressing the open header closes it (`dc.html:1001`).
>    - **The status is never colour alone (WCAG 1.4.1).** Each heading says it in words, through a visually hidden ", complete", ", incomplete" or ", has an error". The dot differs in shape too: a hollow ring while incomplete, filled once complete or in error. A closed header shows the prototype's one-line summary (`dc.html:996-999`), and an error's message replaces it.
>    - **Wide.** Every section is open under a plain `h2` with the same dot and words, and nothing toggles.
>    - Each section is a region named by its title alone.
> 4. **Wide is two by two over the page's columns 2 and 3.** `StudioForm`'s root takes R4-5a's `STUDIO_FORM[layout]`. Wide, that is a two-column grid filled down each column (`gridAutoFlow: 'column'`), so Identity sits over Ink & rarity and Type & stats over Card text (README §7). R4-6a puts the form's slot across the page's middle columns (`STUDIO_SLOT.wide.form`). Sections in a row stretch to one height, and the full card text grows into the space (README §7: "grows to fill").
> 5. **`Field` (the audit's cosmetic item).** It ports `errorId`, `controlProps` and `Field` (`RevealAdminForm.tsx:32-68`) onto admin's tokens:
>    - The wiring is a pure module, `fieldWiring.ts`. A control is described by its hint, then its error: `aria-describedby="field-x-hint field-x-error"`.
>    - `Field` renders its control through a render prop, so the label, the control's ids and its description can't disagree.
>    - The ids keep the old scheme (`field-{name}`, `field-{name}-error`), plus `-label` and `-hint`. R4-5c's ink group takes `field-ink-label`. R4-5d's file inputs take `useId` ids instead of the outline's `field-image-error` (its note 7), so nothing outside the form uses this scheme.
>    - The ids are page-global, so one `StudioForm` mounts at a time (R4-6a renders only the active pane), and the form's story has no `autodocs` tag: a docs page would render all eight stories in one document and repeat every id.
>    - Controls are `adm-input` and `adm-select`. Labels, hints and errors use R4-5a's `FIELD_LABEL`, `HINT` (muted, never dim, R-6) and `ERROR_TEXT` (`COLORS.error`, as PendingTray prints one).
> 6. **Labels.** Today's strings are kept, so the ported queries hold: "Collector number", "Name", "Version (subtitle)", "Cost", "Strength", "Willpower", "Lore", "Move cost", "Keywords (one per line, e.g. Singer 5)", "Full card text (one ability per line)" and "Subtypes / classifications (comma separated)". The changes:
>    - **Franchise** is labelled "Franchise", with the hint "Featured franchise: {FEATURED_FRANCHISE_HINT}", in place of the hint in the label. README §7 and `dc.html:210` print "Franchise: Coco (…)" under the field; the label already says Franchise, so the hint names what Coco is (`FEATURED_FRANCHISE_HINT`'s comment in `constants.ts`). R4-8 records the wording.
>    - **Scan language** is labelled "Scan language", with the handoff's note as its hint. The ported `/^Scan language/` query still matches.
>    - **Second ink** shows only while Dual-ink is on, so "(dual-ink only)" goes, and its empty option reads "None".
>    - **Rarity**'s empty option reads "None", which is what R4-5c's first rarity button will say.
> 7. **The cost.** The box labelled "Cost" holds the raw string (`inputMode="numeric"`), so the validator still refuses `1.5` and `getByLabelText('Cost')` finds one control. Beside it, a 0-10 `adm-range` slider is named "Cost slider". `costSlider(form)`, a pure helper, says what the slider shows:
>    - **Blank:** no thumb (`data-unset="true"`) and `aria-valuetext="Not set"`.
>    - **Not a cost** (`1.5`, `-1`): no thumb, "Not a valid cost".
>    - **Above 10:** the thumb at 10, reading the real cost.
>    - **The first press**, or a key that moves a range (arrows, Home, End, Page Up/Down), sets 0 first, so 0 can be picked. Tab passing over the slider doesn't.
>    - **Order.** The box comes before the slider, where `dc.html:226` puts the slider first. The label names the box, so the box follows it in reading and Tab order.
> 8. **Locked (R-91 1).** `locked` makes the text fields it names read-only (`readOnly`, still focusable and readable, never `disabled` at .4 opacity), and the collector number then says why: "Locked: a new number would change the card's id, which goes in by PR." R4 locks only the collector number. Selects, the type control and the switch ignore `locked`.
> 9. **The scan language (R-60).** The select's options come from R4-2b's `scanLanguageOptions(form.scanLanguage)`: `SCAN_LANGUAGES`, then a hand-marked code the list lacks, named in English. R4-3a adds French and widens `ScanLanguage` to `string` (R-60; the header's contract addition 7), so the old `as ScanLanguage` cast goes. The test builds its expected options from `SCAN_LANGUAGES`, so French is in them without being named.
> 10. **One visually hidden style (audit reuse 13).** `VoteLogTable.tsx:13-23`'s `SR_ONLY` moves to `src/ui/layout.ts`, and VoteLogTable imports it. The status words use it, so there is no third copy. `useHiddenFileInput`'s `SR_ONLY_INPUT` stays: it is the file input's own style, and R4 keeps that hook unchanged.
> 11. **Stories.** `StudioForm.stories.tsx` is titled `Admin/Publish/Card studio/Form` (the R4 header's leaf titles). Its eight stories validate live, as the page will. Their card is the tests' `revealForm` Mei, with a franchise, subtypes and card text added.
> 12. **Code Health.** Every component takes one props object, and every helper one object. Every `it.each` row is one object: a five-argument tuple callback scored 9.68 in the sandbox (Excess Number of Function Arguments). The hand counts are under Interfaces.
> 13. **Names from earlier tasks.** Step 1 checks each, and only imports change if one lands differently:
>     - **`EMPTY_FORM`** is in `src/tools/reveal/emptyForm.ts` (R4-3a, and the header's contract addition 7). `revealForm` is `src/test/revealForm.ts`'s, for tests and stories.
>     - **R4-5a's style names**, as its task file writes them: `STUDIO_FORM`, `STUDIO_PANEL`, `FIELD_LABEL`, `HINT` and `ERROR_TEXT` in `studioStyles.ts`, and `StudioLayout` in `studioLayout.ts`.
>     - **`scanLanguageOptions`** is R4-2b's, in `src/tools/studio/scanLanguages.ts` beside its name function `languageName` (the header's name). This task needs only the options.
>     - **French and `ScanLanguage = string`** are R4-3a's (its `constants.ts` step).
> 14. **Gates, run once.** The steps run the targeted tests, eslint on the changed files and one `pnpm typecheck`, then Code Health. No reveal-sync run: no contract file and no bridge line changes. No `pnpm build`: R4-8 runs it.
>
> **Verified (2026-10-07)**, first in `scratchpad/r4-rebase/sandbox-R4-5b`, then again in `sandbox-v-R4-5b` against the earlier tasks' files as they now stand. Each is a copy of `src/` and the configs from the working tree (main `b490fb7` plus the uncommitted bump, pin `16283a13`), with `node_modules` and `upstream/` junctioned in, and Vite's cache and the tsbuildinfo kept in the sandbox. Earlier tasks' pieces were taken from their task files: R4-3a's `readiness.ts`, `emptyForm.ts`, `validateForm.ts` (with `intField` exported), `constants.ts` (French, `ScanLanguage = string`) and `src/test/revealForm.ts`; R4-5a's `studioLayout.ts` and `studioStyles.ts` (its `AdminStyles.tsx` in the first run); R4-2b's `scanLanguages.ts`. This task's files were written from the code blocks below by script, the `SR_ONLY` move included.
> - **Failing first.** Before the modules exist, all four test files fail to resolve their imports, with the messages quoted in Steps 4 and 8.
> - **Passing.** `fieldWiring.test.ts` 5, `formSections.test.ts` 16, `StudioForm.test.tsx` 20 and `StudioFormCardText.test.tsx` 2: `Tests 43 passed (43)`, with no act warning. After the `SR_ONLY` move, the activity tests and `layout.test.ts` pass unchanged: `Test Files 7 passed (7)`, `Tests 121 passed (121)`.
> - **The tests bite.** 13 mutants, each killed:
>   - the form passing the validator's errors unfiltered;
>   - wide opening one section only;
>   - the Dual-ink state held in the section, so it dies with the closed accordion;
>   - every key, Tab too, starting the slider at 0;
>   - a blank cost given a thumb;
>   - `aria-controls` on a closed header;
>   - a summary on the open header, and the error message not replacing the summary;
>   - `locked` ignored;
>   - the hint read after the error;
>   - switching Dual-ink off keeping the second ink;
>   - no status words;
>   - the card text rewritten on every blur.
> - **Types.** `tsc -p tsconfig.app.json` exits 0, stories and tests included.
> - **Lint.** `pnpm exec eslint --max-warnings 0 --stdin --stdin-filename <path>`, run from the repo on every file below, is clean (jsx-a11y and the React Compiler rules included).
> - **Stories.** All eight render in jsdom through `composeStories`, and axe-core 4.13 finds no violations in any of them. Colour contrast can't be computed in jsdom, so Step 17 checks it in Storybook.
> - **Code Health.** CodeScene MCP 1.5.7 scores all 16 files 10.0 with no findings, in both runs (copies in a scratch `git init` folder).

### Task R4-5b: The form frame

**Files:**
- Create in `src/tools/studio/`:
  - `fieldWiring.ts`: the ids and the error and hint wiring of a field.
  - `formSections.ts`: the sections, their props type, the closed headers' summaries, `costSlider`, `dualInk` and the form's hint strings.
- Create in `src/tools/studio/components/`:
  - `Field.tsx` (`Field`, `TextField`) and `FormSection.tsx`;
  - `IdentitySection.tsx`, `InkRaritySection.tsx` (interim selects, plus the Dual-ink switch), `TypeStatsSection.tsx` and `CardTextSection.tsx`;
  - `StudioForm.tsx` and `StudioForm.stories.tsx`.
- Test (create) in `src/tools/studio/__tests__/`: `fieldWiring.test.ts`, `formSections.test.ts`, `StudioForm.test.tsx` and `StudioFormCardText.test.tsx`.
- Modify `src/ui/layout.ts`: `SR_ONLY`, moved in from VoteLogTable.
- Modify `src/tools/analytics/activity/VoteLogTable.tsx`: import `SR_ONLY` and drop its own copy (`:13-23`).
- Unchanged: `RevealAdminForm.tsx` and its two tests. They go in R4-6c, once this task and R4-5c have ported their cases.

**Interfaces:**
- **Consumes:**
  - **R4-3a.**
    - `src/tools/studio/readiness.ts`: `visibleErrors(form, errors): Record<string, string>`, `sectionStatuses(form, errors): Record<SectionId, SectionStatus>`, `type SectionId = 'identity' | 'ink' | 'type' | 'text'`, `type SectionState = 'error' | 'complete' | 'incomplete'` and `interface SectionStatus {state: SectionState; message: string | null}`. Its sections hold: `identity` collectorNumber, name, version, franchise and subtypes; `ink` ink, ink2 and rarity; `type` type, inkwell, cost and the stats; `text` keywords, fullText and scanLanguage. This task's sections hold the same fields.
    - `src/tools/reveal/emptyForm.ts`: `EMPTY_FORM: Readonly<RevealCardForm>` (tests and stories).
    - `src/tools/reveal/validateForm.ts`: `intField(value: string): number | null`, now exported.
    - `src/tools/reveal/constants.ts` (R-60): French in `SCAN_LANGUAGES`, and `type ScanLanguage = string`.
    - `src/test/revealForm.ts`: `revealForm(overrides?)`, a complete Ruby character, and `RUBY_NUMBER` (tests; `revealForm` in the story too).
  - **R4-5a.**
    - `src/tools/studio/studioLayout.ts`: `type StudioLayout = 'wide' | 'narrow'`.
    - `src/tools/studio/studioStyles.ts`: `STUDIO_FORM: Record<StudioLayout, CSSProperties>` (wide: `repeat(2, minmax(0, 1fr))`, rows `auto auto`, `gridAutoFlow: 'column'`; narrow: a column), `STUDIO_PANEL`, `FIELD_LABEL`, `HINT` and `ERROR_TEXT`.
    - AdminStyles: `adm-acc-head` (the button inside a header's `h2`, its chevron turned on `aria-expanded`), `adm-switch` (`input[type=checkbox][role=switch]`) and `adm-range` (`[data-unset="true"]` hides the thumb).
  - **R4-2b.** `src/tools/studio/scanLanguages.ts`: `scanLanguageOptions(current: string): readonly {code: string; label: string}[]`, which is `SCAN_LANGUAGES`, plus `current` named in English when the list lacks it (R-60).
  - **Existing.**
    - `RevealCardForm` (`buildPreviewCard.ts:9-28`), and from `constants.ts` `CARD_TYPES`, `STAT_FIELDS`, `STAT_LABELS`, `RARITIES`, `FEATURED_FRANCHISE_HINT` and `type StatField`.
    - `validateRevealCardForm` (tests and stories). `canonicalizeCardFullText` from `inkweave-synergy-engine`.
    - `SegmentedControl` (`src/ui/SegmentedControl.tsx:17`), and `ADMIN_COLORS`, `ADMIN_TYPE` and `ADMIN_RADIUS`.
    - Through the bridge: `COLORS`, `SPACING`, `TRUNCATE` and `ALL_INKS`, and `inkBlock` in the tests and stories.
- **Produces:**
```ts
// src/ui/layout.ts (moved from VoteLogTable.tsx:13-23, unchanged)
export const SR_ONLY: CSSProperties;

// src/tools/studio/fieldWiring.ts
export interface FieldSpec {name: string; errors: Readonly<Record<string, string>>; hint?: boolean}
export interface FieldIds {control: string; label: string; hint: string; error: string}   // field-{name}, -label, -hint, -error
export interface ControlProps {id: string; 'aria-invalid': true | undefined; 'aria-describedby': string | undefined}
export function fieldIds({name}: Pick<FieldSpec, 'name'>): FieldIds;
export function controlProps(spec: FieldSpec): ControlProps;   // described by the hint, then the error

// src/tools/studio/formSections.ts
export const SECTIONS: readonly {id: SectionId; title: string}[];   // Identity, Ink & rarity, Type & stats, Card text
export const LOCKED_NUMBER_HINT: string;   // "Locked: a new number would change the card's id, which goes in by PR."
export const SCAN_LANGUAGE_HINT: string;   // "Anything but English adds “See translation”."
export const SINGLE_INK_HINT: string;      // "Pick the second ink. With none, the card publishes as single-ink."
export type TextKey = 'collectorNumber' | 'name' | 'version' | 'franchise' | 'subtypes' | StatField;
export interface DualInk {on: boolean; toggle: () => void}
export interface SectionProps {
  form: RevealCardForm;
  errors: Readonly<Record<string, string>>;   // visibleErrors' (R-72)
  onChange: (patch: Partial<RevealCardForm>) => void;
  layout: StudioLayout;
  locked: ReadonlySet<keyof RevealCardForm>;
  dual: DualInk;
}
export function dualInk(state: {open: boolean; setOpen: (open: boolean) => void; form: RevealCardForm;
  onChange: (patch: Partial<RevealCardForm>) => void}): DualInk;
export const SECTION_SUMMARY: Readonly<Record<SectionId, (form: RevealCardForm) => string>>;
export const COST_SLIDER_MAX = 10;
export interface CostSlider {value: number; unset: boolean; valueText: string | undefined}
export function costSlider({cost}: Pick<RevealCardForm, 'cost'>): CostSlider;

// src/tools/studio/components: one props object each
export function Field(props: {label: string; name: string; errors: Readonly<Record<string, string>>; hint?: string;
  grow?: boolean; children: (control: ControlProps) => ReactNode});
export function TextField(props: {name: TextKey; label: string; section: SectionProps; hint?: string;
  input?: Pick<InputHTMLAttributes<HTMLInputElement>, 'inputMode' | 'placeholder'>});
export function FormSection(props: {title: string; layout: StudioLayout; status: SectionStatus; summary: string;
  open: boolean; onToggle: () => void; children: ReactNode});
export function IdentitySection(props: SectionProps);
export function InkRaritySection(props: SectionProps);   // interim selects, plus the Dual-ink switch; R4-5c rebuilds the rest
export function TypeStatsSection(props: SectionProps);   // interim Inkable checkbox; R4-5c's buttons replace it
export function CardTextSection(props: SectionProps);
/** The header's contract, unchanged: errors are the validator's; Edit passes locked {collectorNumber} (R-91). */
export function StudioForm(props: {form: RevealCardForm; errors: Readonly<Record<string, string>>;
  onChange: (patch: Partial<RevealCardForm>) => void; layout: StudioLayout; locked?: ReadonlySet<keyof RevealCardForm>});
```
- **Primitive parameters, hand-counted** (named functions; the PR gate wants under 30% per module):
  - `fieldWiring.ts`: `fieldIds({name})` and `controlProps(spec)` take objects. 0 of 2.
  - `formSections.ts`: `dualInk(state)`, `costSlider({cost})`, the four `SECTION_SUMMARY` functions (the form) and `toggle()`. 0 of 7.
  - Components: one props object each (`Field`, `TextField`, `TitleWithStatus`, `PlainHeading`, `AccordionHeading`, `FormSection`, the four sections, `DualInkSwitch`, `CostField`, `StudioForm`). Their handlers take events, `startAtZero` nothing. 0 in every file.
  - `src/ui/layout.ts`: unchanged at 1 of 1 (`twoUp(track)`, which passed R3's gate). `SR_ONLY` is a constant.
  - Tests and stories: `errorsOf(form)`, the `Harness`es (props), `toggle(title: RegExp)` (an object), `dualOver({open, ink2})`, and one-object `it.each` rows. 0.
- **Complexity.** Inner lambdas count toward their function. The highest are `Field`, `controlProps` and `costSlider`, at 5 each. `AccordionHeading`, `CostField` and `StudioForm` are 4, and every other function 3 or less. There is no `a || b || c` chain.

- [ ] **Step 1: Check what this task builds on**

Run with the Bash tool from the repo root:
```bash
git branch --show-current
git -C upstream/inkweave rev-parse --short HEAD
grep -nE "export function (visibleErrors|sectionStatuses)|export type (SectionId|SectionState)|export interface SectionStatus" src/tools/studio/readiness.ts
grep -rn "export const EMPTY_FORM" src/tools/reveal
grep -n "export function intField" src/tools/reveal/validateForm.ts
grep -nE "code: 'fr'|export type ScanLanguage" src/tools/reveal/constants.ts
grep -nE "export (function revealForm|const RUBY_NUMBER)" src/test/revealForm.ts
grep -nE "export (type StudioLayout|function studioLayout)" src/tools/studio/studioLayout.ts
grep -nE "export const (STUDIO_FORM|STUDIO_PANEL|FIELD_LABEL|HINT|ERROR_TEXT)\b" src/tools/studio/studioStyles.ts
grep -oE "\.adm-(acc-head|switch|range)\{" src/theme/AdminStyles.tsx
grep -n "export function scanLanguageOptions" src/tools/studio/scanLanguages.ts
grep -n "const SR_ONLY" src/tools/analytics/activity/VoteLogTable.tsx
ls src/tools/studio/components src/tools/studio/fieldWiring.ts src/tools/studio/formSections.ts
```
Expected:
- `feature/24-redesign-r4`, then `16283a1`.
- **`readiness.ts`:** 5 lines, for `visibleErrors`, `sectionStatuses`, `SectionId`, `SectionState` and `SectionStatus`.
- **`EMPTY_FORM`:** one line, in `src/tools/reveal/emptyForm.ts`. If it landed in another module, change the `emptyForm` import in the three files that read it: `formSections.test.ts`, `StudioForm.test.tsx` and the story.
- **`intField`:** one line, exported.
- **`constants.ts`:** `{code: 'fr', label: 'French'},` and `export type ScanLanguage = string;`. If `ScanLanguage` is still the list's union, stop and tell the controller: R4-3a's R-60 widening hasn't landed, and Step 15's typecheck would fail on `CardTextSection.tsx`'s `onChange({scanLanguage: e.target.value})` and the tests' `'zh'`.
- **`revealForm.ts`:** 2 lines.
- **`studioLayout.ts`:** 2 lines.
- **`studioStyles.ts`:** 5 lines. If R4-5a named one differently, use its name in the imports below; if one is missing, stop.
- **`AdminStyles.tsx`:** `.adm-acc-head{`, `.adm-switch{` and `.adm-range{`.
- **`scanLanguages.ts`:** one line. If the file or the function is missing, R4-2b hasn't landed: stop.
- **`VoteLogTable.tsx`:** `14:const SR_ONLY: React.CSSProperties = {`.
- **`ls`:** `No such file or directory` for all three. This task creates them, and the folder.

On a fresh checkout, or after a pin bump, run `pnpm build:engine` once first: the tests reach the engine through the validator and `canonicalizeCardFullText`.

- [ ] **Step 2: Move `SR_ONLY` to `src/ui/layout.ts`**

Append to `src/ui/layout.ts` (after `twoUp`, `:12-19`):
```ts

/**
 * Hides text on screen and keeps it for screen readers: a table's caption, or
 * the word that says a studio section's status beside its coloured dot. Moved
 * from VoteLogTable (R4-5b).
 */
export const SR_ONLY: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
};
```

In `src/tools/analytics/activity/VoteLogTable.tsx`, delete `:13-23`, which is the comment and the constant:
```tsx
/** Hides the caption on screen; screen readers still name the table by it. */
const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
};

```
Then add the import after `:3` (`import {fmtWeekday} from '../../../ui/format';`):
```tsx
import {SR_ONLY} from '../../../ui/layout';
```
`<caption style={SR_ONLY}>` (`:108`) is unchanged.

Run: `pnpm vitest run --project app src/tools/analytics/activity src/ui/__tests__/layout.test.ts`
Expected: PASS, `Test Files 7 passed (7)` and `Tests 121 passed (121)` at the base. Nothing changes but where the constant lives, and `VoteLogTable.test.tsx`'s "is a real table: a caption…" still names the table.

- [ ] **Step 3: Write the failing tests for the pure modules**

Create `src/tools/studio/__tests__/fieldWiring.test.ts`:
```ts
import {describe, expect, it} from 'vitest';
import {controlProps, fieldIds, type ControlProps, type FieldSpec} from '../fieldWiring';

const NAME_ERROR = {name: 'Name is required'};

describe('fieldIds', () => {
  it("keeps the old reveal form's ids, and adds the label's and the hint's", () => {
    expect(fieldIds({name: 'ink'})).toEqual({
      control: 'field-ink',
      label: 'field-ink-label',
      hint: 'field-ink-hint',
      error: 'field-ink-error',
    });
  });
});

describe('controlProps', () => {
  it.each<{title: string; spec: FieldSpec; wired: ControlProps}>([
    {
      title: 'leaves a valid field with no hint undescribed',
      spec: {name: 'name', errors: {}},
      wired: {id: 'field-name', 'aria-invalid': undefined, 'aria-describedby': undefined},
    },
    {
      title: 'marks a field with an error and points at the message',
      spec: {name: 'name', errors: NAME_ERROR},
      wired: {id: 'field-name', 'aria-invalid': true, 'aria-describedby': 'field-name-error'},
    },
    {
      title: 'points a valid field at its hint',
      spec: {name: 'franchise', errors: NAME_ERROR, hint: true},
      wired: {id: 'field-franchise', 'aria-invalid': undefined, 'aria-describedby': 'field-franchise-hint'},
    },
    {
      title: 'reads the hint before the error',
      spec: {name: 'name', errors: NAME_ERROR, hint: true},
      wired: {id: 'field-name', 'aria-invalid': true, 'aria-describedby': 'field-name-hint field-name-error'},
    },
  ])('$title', ({spec, wired}) => {
    expect(controlProps(spec)).toEqual(wired);
  });
});
```

Create `src/tools/studio/__tests__/formSections.test.ts`:
```ts
import {describe, expect, it, vi} from 'vitest';
import type {RevealCardForm} from '../../reveal/buildPreviewCard';
import {EMPTY_FORM} from '../../reveal/emptyForm';
import {RUBY_NUMBER, revealForm} from '../../../test/revealForm';
import {COST_SLIDER_MAX, SECTION_SUMMARY, costSlider, dualInk, type CostSlider} from '../formSections';

describe('SECTION_SUMMARY', () => {
  it.each<{title: string; patch: Partial<RevealCardForm>; sums: [string, string, string]}>([
    {title: 'a fresh form', patch: {}, sums: ['Unnamed', 'Amber · no rarity', 'Character · inkable · no cost']},
    {
      title: 'a filled card',
      patch: revealForm({ink2: 'Steel', inkwell: false}),
      sums: [`Mei · Red Panda · #${RUBY_NUMBER}`, 'Ruby / Steel · Rare', 'Character · uninkable · cost 4'],
    },
    {
      title: 'a card with no version',
      patch: {name: ' Stitch ', collectorNumber: '12'},
      sums: ['Stitch · #12', 'Amber · no rarity', 'Character · inkable · no cost'],
    },
  ])('sums up the identity, ink and type of $title', ({patch, sums}) => {
    const form = {...EMPTY_FORM, ...patch};
    expect([SECTION_SUMMARY.identity(form), SECTION_SUMMARY.ink(form), SECTION_SUMMARY.type(form)]).toEqual(sums);
  });

  it.each<{title: string; patch: Partial<RevealCardForm>; summary: string}>([
    {title: 'says when the card text is empty', patch: {}, summary: 'Not filled yet'},
    {
      title: 'joins the first keyword and the first line of text',
      patch: {keywords: 'Singer 5\nEvasive', fullText: 'BIG VOICE\nDraw a card.'},
      summary: 'Singer 5 · BIG VOICE',
    },
    {title: 'cuts a long line at 40 characters', patch: {fullText: 'A'.repeat(41)}, summary: `${'A'.repeat(40)}…`},
  ])('$title', ({patch, summary}) => {
    expect(SECTION_SUMMARY.text({...EMPTY_FORM, ...patch})).toBe(summary);
  });
});

describe('costSlider', () => {
  it.each<{title: string; cost: string; slider: CostSlider}>([
    {title: 'reads a blank cost as not set, with no thumb', cost: '', slider: {value: 0, unset: true, valueText: 'Not set'}},
    {title: 'treats spaces as blank', cost: '  ', slider: {value: 0, unset: true, valueText: 'Not set'}},
    {title: 'shows a cost in range as itself', cost: '7', slider: {value: 7, unset: false, valueText: undefined}},
    {title: 'shows 0 as a chosen 0', cost: '0', slider: {value: 0, unset: false, valueText: undefined}},
    {
      title: 'holds a cost above the end there, and reads the real cost',
      cost: '12',
      slider: {value: COST_SLIDER_MAX, unset: false, valueText: '12'},
    },
    {
      title: 'shows no thumb for a cost the validator refuses',
      cost: '1.5',
      slider: {value: 0, unset: true, valueText: 'Not a valid cost'},
    },
    {title: 'shows no thumb for a negative cost', cost: '-1', slider: {value: 0, unset: true, valueText: 'Not a valid cost'}},
  ])('$title ($cost)', ({cost, slider}) => {
    expect(costSlider({cost})).toEqual(slider);
  });
});

describe('dualInk', () => {
  /** The switch over a form, with spies for the state StudioForm lifts and the form's onChange. */
  function dualOver({open, ink2}: {open: boolean; ink2: RevealCardForm['ink2']}) {
    const setOpen = vi.fn();
    const onChange = vi.fn();
    return {dual: dualInk({open, setOpen, form: {...EMPTY_FORM, ink2}, onChange}), setOpen, onChange};
  }

  it('is off with nothing held and no second ink, and turns on without touching the form', () => {
    const {dual, setOpen, onChange} = dualOver({open: false, ink2: ''});
    expect(dual.on).toBe(false);
    dual.toggle();
    expect(setOpen).toHaveBeenCalledWith(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('stays on while held, even with no second ink picked', () => {
    expect(dualOver({open: true, ink2: ''}).dual.on).toBe(true);
  });

  it('is on for a second ink the form already holds, and turning it off clears that ink', () => {
    const {dual, setOpen, onChange} = dualOver({open: false, ink2: 'Steel'});
    expect(dual.on).toBe(true);
    dual.toggle();
    expect(setOpen).toHaveBeenCalledWith(false);
    expect(onChange).toHaveBeenCalledWith({ink2: ''});
  });
});
```
The spies are local to each case, so no `beforeEach` reset is needed, and nothing is stubbed.

- [ ] **Step 4: Run them, and see them fail**

Run: `pnpm vitest run --project app src/tools/studio/__tests__/fieldWiring.test.ts src/tools/studio/__tests__/formSections.test.ts`
Expected: FAIL, `Test Files 2 failed (2)`, `Tests no tests`, with:
```
Error: Failed to resolve import "../fieldWiring" from "src/tools/studio/__tests__/fieldWiring.test.ts". Does the file exist?
Error: Failed to resolve import "../formSections" from "src/tools/studio/__tests__/formSections.test.ts". Does the file exist?
```

- [ ] **Step 5: Write `fieldWiring.ts` and `formSections.ts`**

Create `src/tools/studio/fieldWiring.ts`:
```ts
/*
 * How a studio field ties its parts together for assistive tech (R4-5b): the
 * label names the control, and the control is described by its hint and, while
 * it has one, its error. The ids keep the old reveal form's scheme
 * (field-{name}, field-{name}-error), and R4-5c's ink group labels itself by
 * field-ink-label. They are page-global, so one form mounts at a time.
 */

/** A field's name, the errors to show (visibleErrors', R-72), and whether it prints a hint. */
export interface FieldSpec {
  name: string;
  errors: Readonly<Record<string, string>>;
  hint?: boolean;
}

/** The ids of a field's parts. */
export interface FieldIds {
  control: string;
  label: string;
  hint: string;
  error: string;
}

/** What a field's control spreads: its id, and its error and hint wiring. */
export interface ControlProps {
  id: string;
  'aria-invalid': true | undefined;
  'aria-describedby': string | undefined;
}

/** field-{name} for the control; -label, -hint and -error for the rest. */
export function fieldIds({name}: Pick<FieldSpec, 'name'>): FieldIds {
  const control = `field-${name}`;
  return {control, label: `${control}-label`, hint: `${control}-hint`, error: `${control}-error`};
}

/**
 * The control's id, plus its wiring: aria-invalid while the field has an error
 * to show, and aria-describedby naming its hint, then its error. Each is left
 * off when there is nothing to point at, so a valid field reads as no more than
 * its label and hint.
 */
export function controlProps({name, errors, hint}: FieldSpec): ControlProps {
  const ids = fieldIds({name});
  const invalid = Object.hasOwn(errors, name);
  const describedBy = [hint ? ids.hint : '', invalid ? ids.error : ''].filter(Boolean).join(' ');
  return {id: ids.control, 'aria-invalid': invalid || undefined, 'aria-describedby': describedBy || undefined};
}
```

Create `src/tools/studio/formSections.ts`:
```ts
import type {RevealCardForm} from '../reveal/buildPreviewCard';
import type {StatField} from '../reveal/constants';
import {intField} from '../reveal/validateForm';
import type {SectionId} from './readiness';
import type {StudioLayout} from './studioLayout';

/*
 * The studio form's four sections (handoff README §7), and the pure parts of
 * their controls: what a closed accordion header sums up, the cost slider's
 * state, and the Dual-ink switch over ink2. The section ids and the keys each
 * holds are readiness.ts's, so a header's dot and its fields agree.
 */

/** The sections in the form's order. Wide lays them out two by two, down each column. */
export const SECTIONS: readonly {id: SectionId; title: string}[] = [
  {id: 'identity', title: 'Identity'},
  {id: 'ink', title: 'Ink & rarity'},
  {id: 'type', title: 'Type & stats'},
  {id: 'text', title: 'Card text'},
];

/** Why Edit's collector number is read-only (R-91): a new number is a new id, which goes in by PR. */
export const LOCKED_NUMBER_HINT = "Locked: a new number would change the card's id, which goes in by PR.";

/** The note under the scan language (README §7). */
export const SCAN_LANGUAGE_HINT = 'Anything but English adds “See translation”.';

/** Under the Dual-ink switch while it is on with no second ink picked. */
export const SINGLE_INK_HINT = 'Pick the second ink. With none, the card publishes as single-ink.';

/** The form's plain text inputs: what TextField edits. */
export type TextKey = 'collectorNumber' | 'name' | 'version' | 'franchise' | 'subtypes' | StatField;

/**
 * The Dual-ink switch, a view over ink2 (the reveal-sync contract keeps the
 * form's shape). It is on while the operator holds it on or a second ink is
 * picked; turning it off clears the second ink.
 */
export interface DualInk {
  on: boolean;
  toggle: () => void;
}

/** What every section's body takes from StudioForm. */
export interface SectionProps {
  form: RevealCardForm;
  /** The errors to show: visibleErrors' (R-72), never the validator's whole set. */
  errors: Readonly<Record<string, string>>;
  onChange: (patch: Partial<RevealCardForm>) => void;
  layout: StudioLayout;
  /** The text fields that are read-only: the collector number in Edit (R-91). */
  locked: ReadonlySet<keyof RevealCardForm>;
  dual: DualInk;
}

interface DualInkState {
  /** Held on by the switch: StudioForm's state, so a closed accordion section can't drop it. */
  open: boolean;
  setOpen: (open: boolean) => void;
  form: RevealCardForm;
  onChange: (patch: Partial<RevealCardForm>) => void;
}

/**
 * The switch's state, from the state StudioForm lifts. Turning it on with no
 * second ink keeps it on: derived from ink2 alone, it would flip straight back.
 */
export function dualInk({open, setOpen, form, onChange}: DualInkState): DualInk {
  const on = open || form.ink2 !== '';
  return {
    on,
    toggle: () => {
      setOpen(!on);
      if (on) onChange({ink2: ''});
    },
  };
}

/** The handoff's longest summary of the card text, before it cuts. */
const TEXT_SUMMARY_MAX = 40;

/**
 * What a closed accordion header says about its section (dc.html:996-999).
 * An error replaces it: FormSection shows the section's message instead.
 */
export const SECTION_SUMMARY: Readonly<Record<SectionId, (form: RevealCardForm) => string>> = {
  identity: ({name, version, collectorNumber}) => {
    const number = collectorNumber.trim();
    return [name.trim() || 'Unnamed', version.trim(), number && `#${number}`].filter(Boolean).join(' · ');
  },
  ink: ({ink, ink2, rarity}) => [[ink, ink2].filter(Boolean).join(' / '), rarity || 'no rarity'].join(' · '),
  type: ({type, inkwell, cost}) => {
    const trimmed = cost.trim();
    return [type, inkwell ? 'inkable' : 'uninkable', trimmed === '' ? 'no cost' : `cost ${trimmed}`].join(' · ');
  },
  text: ({keywords, fullText}) => {
    const line = [keywords, fullText]
      .map((text) => text.trim().split('\n')[0])
      .filter(Boolean)
      .join(' · ');
    if (line === '') return 'Not filled yet';
    return line.length > TEXT_SUMMARY_MAX ? `${line.slice(0, TEXT_SUMMARY_MAX)}…` : line;
  },
};

/** The slider's end: a cost above it keeps the slider there (README §7). */
export const COST_SLIDER_MAX = 10;

export interface CostSlider {
  value: number;
  /** No thumb (adm-range's data-unset): the cost is blank, or not a cost at all. */
  unset: boolean;
  /** What the slider reads out in place of its value, when that would mislead. */
  valueText: string | undefined;
}

/**
 * The cost slider's state, read from the Cost box. A blank cost shows no thumb
 * and reads "Not set", never 0, so 0 is a value the operator chose. A cost
 * above the end keeps the slider there and reads the real cost.
 */
export function costSlider({cost}: Pick<RevealCardForm, 'cost'>): CostSlider {
  const value = intField(cost);
  if (value === null || value < 0) {
    return {value: 0, unset: true, valueText: cost.trim() === '' ? 'Not set' : 'Not a valid cost'};
  }
  if (value > COST_SLIDER_MAX) return {value: COST_SLIDER_MAX, unset: false, valueText: String(value)};
  return {value, unset: false, valueText: undefined};
}
```
`SectionProps` and `TextKey` are types in a `.ts` module, so the sections share them with no import cycle through a component file, and react-refresh sees component files that export only components.

- [ ] **Step 6: Run them to PASS**

Run: `pnpm vitest run --project app src/tools/studio/__tests__/fieldWiring.test.ts src/tools/studio/__tests__/formSections.test.ts`
Expected: PASS, `Test Files 2 passed (2)`, `Tests 21 passed (21)`: 5 in `fieldWiring.test.ts` and 16 in `formSections.test.ts`.

- [ ] **Step 7: Write the form's failing tests**

Create `src/tools/studio/__tests__/StudioForm.test.tsx`. The first three cases port `RevealAdminForm.test.tsx:28-60`. Every other case is new. The harness renders `layout="wide"` unless a case says otherwise, so every field is mounted, as the outline asked:
```tsx
import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {inkBlock} from '../../../app-bridge';
import {RUBY_NUMBER, revealForm} from '../../../test/revealForm';
import type {RevealCardForm} from '../../reveal/buildPreviewCard';
import {SCAN_LANGUAGES} from '../../reveal/constants';
import {EMPTY_FORM} from '../../reveal/emptyForm';
import {validateRevealCardForm} from '../../reveal/validateForm';
import {StudioForm} from '../components/StudioForm';
import {LOCKED_NUMBER_HINT, SCAN_LANGUAGE_HINT, SINGLE_INK_HINT} from '../formSections';
import type {StudioLayout} from '../studioLayout';

/** The validator's errors, every one, blank fields' included: what the page passes (R-72 filters them). */
function errorsOf(form: RevealCardForm): Record<string, string> {
  return validateRevealCardForm(form, new Set(), 'scan.png').errors;
}

interface HarnessProps {
  layout?: StudioLayout;
  initial?: Partial<RevealCardForm>;
  locked?: ReadonlySet<keyof RevealCardForm>;
}

/** StudioForm is controlled: the harness holds the form and validates it on every render, as the page does. */
function Harness({layout = 'wide', initial = {}, locked}: HarnessProps) {
  const [form, setForm] = useState<RevealCardForm>({...EMPTY_FORM, ...initial});
  return (
    <StudioForm
      form={form}
      errors={errorsOf(form)}
      layout={layout}
      locked={locked}
      onChange={(patch) => setForm((f) => ({...f, ...patch}))}
    />
  );
}

/** A narrow section's toggle, by the start of its name: its title. */
const toggle = (title: RegExp) => screen.getByRole('button', {name: title});

describe('StudioForm, ported from RevealAdminForm', () => {
  // The old test passed a blank name's "Name is required". Under R-72 a blank
  // field shows no error, so the port fills a value that fails instead.
  it("ties a filled value's error to its control", () => {
    render(<Harness initial={revealForm({cost: '1.5'})} />);

    const cost = screen.getByLabelText('Cost');
    expect(cost).toHaveAttribute('aria-invalid', 'true');
    expect(cost).toHaveAccessibleDescription('Enter a cost (0 or more)');
    expect(screen.getByLabelText('Version (subtitle)')).not.toHaveAttribute('aria-invalid');
  });

  it("shows the stats the card's type prints", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByLabelText('Strength')).toBeInTheDocument();
    expect(screen.queryByLabelText('Move cost')).toBeNull();

    const type = screen.getByRole('group', {name: 'Type'});
    await user.click(within(type).getByRole('button', {name: 'Location'}));
    expect(screen.getByLabelText('Move cost')).toBeInTheDocument();
    expect(screen.getByLabelText('Willpower')).toBeInTheDocument();
    expect(screen.getByLabelText('Lore')).toBeInTheDocument();
    expect(screen.queryByLabelText('Strength')).toBeNull();

    await user.click(within(type).getByRole('button', {name: 'Item'}));
    expect(screen.queryByLabelText('Willpower')).toBeNull();
  });

  it('picks the scan language, English unless changed', () => {
    const onChange = vi.fn();
    render(<StudioForm form={EMPTY_FORM} errors={{}} onChange={onChange} layout="wide" />);

    const language = screen.getByLabelText(/^Scan language/);
    expect(language).toHaveValue('en');
    fireEvent.change(language, {target: {value: 'ja'}});
    expect(onChange).toHaveBeenCalledWith({scanLanguage: 'ja'});
  });
});

describe('StudioForm: what shows red (R-72)', () => {
  it('opens a fresh New reveal form with nothing marked invalid, and every section neutral but Card text', () => {
    // The validator does report the blank number, name, cost and stats: they stay hidden.
    expect(Object.keys(errorsOf(EMPTY_FORM))).toEqual(
      expect.arrayContaining(['collectorNumber', 'name', 'cost', 'strength', 'willpower', 'lore']),
    );
    const {container} = render(<Harness />);

    expect(container.querySelectorAll('[aria-invalid]')).toHaveLength(0);
    expect(screen.getByLabelText('Name')).not.toHaveAccessibleDescription();
    expect(screen.getAllByRole('heading', {level: 2}).map((heading) => heading.textContent)).toEqual([
      'Identity, incomplete',
      'Ink & rarity, incomplete',
      'Type & stats, incomplete',
      'Card text, complete',
    ]);
  });

  it("marks a filled value that fails, names its section's error, and still hides a blank field's", () => {
    const amber = inkBlock('Amber').first;
    render(<Harness initial={revealForm({collectorNumber: String(amber), name: ''})} />);

    const ink = screen.getByLabelText('Ink');
    expect(ink).toHaveAttribute('aria-invalid', 'true');
    expect(ink).toHaveAccessibleDescription(expect.stringMatching(new RegExp(`^#${amber} is in the Amber block`)));
    expect(screen.getByRole('heading', {name: 'Ink & rarity, has an error'})).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByRole('heading', {name: 'Identity, incomplete'})).toBeInTheDocument();
  });
});

describe('StudioForm: the cost', () => {
  it('keeps the Cost box and the slider apart, and holds what was typed', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const box = screen.getByLabelText('Cost');
    expect(box).toHaveRole('textbox');
    await user.type(box, '1.5');
    expect(box).toHaveValue('1.5');
    expect(box).toHaveAccessibleDescription('Enter a cost (0 or more)');
    expect(screen.getByRole('slider', {name: 'Cost slider'})).toHaveAttribute('aria-valuetext', 'Not a valid cost');
  });

  it('reads a blank cost as Not set, with no thumb', () => {
    render(<Harness />);
    const slider = screen.getByRole('slider', {name: 'Cost slider'});
    expect(slider).toHaveAttribute('aria-valuetext', 'Not set');
    expect(slider).toHaveAttribute('data-unset', 'true');
  });

  it.each<{title: string; press: (slider: HTMLElement) => void}>([
    {title: 'press', press: (slider) => fireEvent.pointerDown(slider)},
    {title: 'key that moves it', press: (slider) => fireEvent.keyDown(slider, {key: 'ArrowLeft'})},
  ])("sets a blank cost to 0 on the slider's first $title", ({press}) => {
    render(<Harness />);
    const slider = screen.getByRole('slider', {name: 'Cost slider'});
    press(slider);
    expect(screen.getByLabelText('Cost')).toHaveValue('0');
    expect(slider).not.toHaveAttribute('aria-valuetext');
    expect(slider).not.toHaveAttribute('data-unset');
  });

  it('leaves a blank cost blank when Tab passes over the slider', () => {
    render(<Harness />);
    fireEvent.keyDown(screen.getByRole('slider', {name: 'Cost slider'}), {key: 'Tab'});
    expect(screen.getByLabelText('Cost')).toHaveValue('');
  });

  it('moves the box with the slider, and holds a cost above 10 at the end', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const slider = screen.getByRole('slider', {name: 'Cost slider'});
    const box = screen.getByLabelText('Cost');

    fireEvent.change(slider, {target: {value: '7'}});
    expect(box).toHaveValue('7');

    await user.clear(box);
    await user.type(box, '12');
    expect(slider).toHaveValue('10');
    expect(slider).toHaveAttribute('aria-valuetext', '12');
  });
});

describe('StudioForm: narrow, an accordion', () => {
  it('opens Identity first, and one section at a time', async () => {
    const user = userEvent.setup();
    render(<Harness layout="narrow" />);
    expect(toggle(/^Identity/)).toHaveAttribute('aria-expanded', 'true');
    expect(toggle(/^Type & stats/)).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.queryByLabelText('Strength')).toBeNull();

    await user.click(toggle(/^Type & stats/));
    expect(toggle(/^Type & stats/)).toHaveAttribute('aria-expanded', 'true');
    expect(toggle(/^Identity/)).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText('Strength')).toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).toBeNull();

    await user.click(toggle(/^Type & stats/));
    expect(screen.queryAllByRole('button', {expanded: true})).toHaveLength(0);
  });

  it('points the open toggle at its fields, and a closed one at nothing', () => {
    render(<Harness layout="narrow" />);
    const controls = toggle(/^Identity/).getAttribute('aria-controls');
    expect(document.getElementById(controls ?? '')).toContainElement(screen.getByLabelText('Name'));
    expect(toggle(/^Card text/)).not.toHaveAttribute('aria-controls');
  });

  it("sums up a closed section, and shows a section's error in its place", () => {
    render(<Harness layout="narrow" initial={revealForm({cost: '1.5'})} />);
    expect(toggle(/^Ink & rarity/)).toHaveAccessibleName('Ink & rarity, complete Ruby · Rare');
    expect(toggle(/^Type & stats/)).toHaveAccessibleName('Type & stats, has an error Enter a cost (0 or more)');
    expect(toggle(/^Card text/)).toHaveAccessibleName('Card text, complete Not filled yet');
    // The open section sums nothing up: its fields show.
    expect(toggle(/^Identity/)).toHaveAccessibleName('Identity, complete');
  });
});

describe('StudioForm: wide', () => {
  it('shows every section open, under plain headings with no toggles', () => {
    render(<Harness initial={revealForm()} />);
    expect(screen.getAllByRole('heading', {level: 2})).toHaveLength(4);
    expect(screen.queryAllByRole('button', {expanded: false})).toHaveLength(0);
    expect(screen.queryAllByRole('button', {expanded: true})).toHaveLength(0);
    for (const label of ['Name', 'Ink', 'Cost', 'Full card text (one ability per line)']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole('region', {name: 'Type & stats'})).toBeInTheDocument();
  });
});

describe('StudioForm: Dual-ink, the state it lifts', () => {
  it('shows Second ink only while the switch is on, and turning it off clears the second ink', async () => {
    const user = userEvent.setup();
    render(<Harness initial={revealForm()} />);
    const dual = screen.getByRole('switch', {name: 'Dual-ink card'});
    expect(dual).not.toBeChecked();
    expect(screen.queryByLabelText('Second ink')).toBeNull();

    await user.click(dual);
    expect(dual).toBeChecked();
    expect(dual).toHaveAccessibleDescription(SINGLE_INK_HINT);
    await user.selectOptions(screen.getByLabelText('Second ink'), 'Steel');
    expect(dual).not.toHaveAccessibleDescription();

    await user.click(dual);
    expect(screen.queryByLabelText('Second ink')).toBeNull();
    await user.click(dual);
    expect(screen.getByLabelText('Second ink')).toHaveValue('');
  });

  it('stays on while the narrow accordion closes its section', async () => {
    const user = userEvent.setup();
    render(<Harness layout="narrow" initial={revealForm()} />);
    await user.click(toggle(/^Ink & rarity/));
    await user.click(screen.getByRole('switch', {name: 'Dual-ink card'}));

    await user.click(toggle(/^Identity/));
    expect(screen.queryByRole('switch')).toBeNull();
    await user.click(toggle(/^Ink & rarity/));
    expect(screen.getByRole('switch', {name: 'Dual-ink card'})).toBeChecked();
  });
});

describe('StudioForm: Edit and the scan language', () => {
  it('makes a locked collector number read-only, and says why (R-91)', async () => {
    const user = userEvent.setup();
    render(<Harness initial={revealForm()} locked={new Set(['collectorNumber'])} />);
    const number = screen.getByLabelText('Collector number');
    expect(number).toHaveAttribute('readonly');
    expect(number).toHaveAccessibleDescription(LOCKED_NUMBER_HINT);

    await user.type(number, '9');
    expect(number).toHaveValue(String(RUBY_NUMBER));
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('readonly');
  });

  it('describes the scan language by its note', () => {
    render(<Harness />);
    expect(screen.getByLabelText('Scan language')).toHaveAccessibleDescription(SCAN_LANGUAGE_HINT);
  });

  it('lists a language the list lacks as its own option, by its English name (R-60)', () => {
    render(<Harness initial={{scanLanguage: 'zh'}} />);
    const language = screen.getByLabelText('Scan language');
    expect(language).toHaveValue('zh');
    expect(within(language).getAllByRole('option').map((option) => option.textContent)).toEqual([
      ...SCAN_LANGUAGES.map(({label}) => label),
      'Chinese',
    ]);
  });
});
```
Two notes on the tests:
- **Accessible names.** Testing Library computes them as a screen reader would. The status word is part of each heading's name, and a closed header's summary follows it after a space, because the summary is a block.
- **Isolation.** Nothing is stubbed, and the only spy (`vi.fn()` in the scan-language case) is local, so the shared `vmForks` worker needs no restore.

Create `src/tools/studio/__tests__/StudioFormCardText.test.tsx`. It ports `RevealAdminFormCardText.test.tsx` with that file's harness. The fixture becomes a constant spread with the text, so the module has no helper taking a string:
```tsx
import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {describe, it, expect} from 'vitest';
import type {RevealCardForm} from '../../reveal/buildPreviewCard';
import {StudioForm} from '../components/StudioForm';

// Kit Cloudkicker - Sure Shot (14192) as it was typed into the reveal publisher (#635).
const SPELLED_OUT =
  'Shift 3 (You may pay 3 Ink to play this on top of one of your characters named Kit Cloudkicker.)';

const KIT: RevealCardForm = {
  collectorNumber: '192',
  name: 'Kit Cloudkicker',
  version: 'Sure Shot',
  rarity: 'Rare',
  franchise: '',
  cost: '5',
  ink: 'Steel',
  ink2: '',
  inkwell: true,
  type: 'Character',
  strength: '3',
  willpower: '4',
  lore: '2',
  moveCost: '',
  subtypes: '',
  keywords: '',
  fullText: '',
  scanLanguage: 'en',
};

/** The form with real state, beside a Publish button, as the studio lays them out. Wide: every field shows. */
function Harness({fullText}: {fullText: string}) {
  const [form, setForm] = useState<RevealCardForm>(() => ({...KIT, fullText}));
  return (
    <>
      <StudioForm form={form} errors={{}} layout="wide" onChange={(patch) => setForm((f) => ({...f, ...patch}))} />
      <button type="button">Publish</button>
    </>
  );
}

const cardText = () => screen.getByLabelText('Full card text (one ability per line)');

describe('StudioForm Card Text', () => {
  it('shows the house-style rewrite when the owner moves on to another control', async () => {
    const user = userEvent.setup();
    render(<Harness fullText={SPELLED_OUT} />);
    await user.click(cardText());
    await user.click(screen.getByRole('button', {name: 'Publish'}));
    expect(cardText()).toHaveValue(
      'Shift 3 ⬡ (You may pay 3 ⬡ to play this on top of one of your characters named Kit Cloudkicker.)',
    );
  });

  // Alt-tab to copy the next ability blurs the field but leaves it the active element. A
  // rewrite then would trim the trailing newline and glue the next paste onto this line.
  it('leaves the text exactly as typed when the window loses focus', async () => {
    const user = userEvent.setup();
    const typed = `${SPELLED_OUT}\n`;
    render(<Harness fullText={typed} />);
    await user.click(cardText());
    fireEvent.blur(cardText());
    expect(cardText()).toHaveValue(typed);
  });
});
```

- [ ] **Step 8: Run them, and see them fail**

Run: `pnpm vitest run --project app src/tools/studio/__tests__/StudioForm.test.tsx src/tools/studio/__tests__/StudioFormCardText.test.tsx`
Expected: FAIL, `Test Files 2 failed (2)`, `Tests no tests`, with:
```
Error: Failed to resolve import "../components/StudioForm" from "src/tools/studio/__tests__/StudioForm.test.tsx". Does the file exist?
Error: Failed to resolve import "../components/StudioForm" from "src/tools/studio/__tests__/StudioFormCardText.test.tsx". Does the file exist?
```

- [ ] **Step 9: Write `Field.tsx`**

Create `src/tools/studio/components/Field.tsx`:
```tsx
import type {InputHTMLAttributes, ReactNode} from 'react';
import {SPACING} from '../../../app-bridge';
import type {RevealCardForm} from '../../reveal/buildPreviewCard';
import {controlProps, fieldIds, type ControlProps} from '../fieldWiring';
import type {SectionProps, TextKey} from '../formSections';
import {ERROR_TEXT, FIELD_LABEL, HINT} from '../studioStyles';

const FIELD: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.xs, minWidth: 0};
// The full card text's field takes the height its section has left (README §7: "grows to fill").
const GROWING_FIELD: React.CSSProperties = {...FIELD, flex: '1 1 auto'};

interface FieldProps {
  label: string;
  /** The form key: it names the ids, and picks the field's error out of `errors`. */
  name: string;
  /** The errors to show (visibleErrors', R-72). */
  errors: Readonly<Record<string, string>>;
  /** A line under the control that describes it: a format, a rule, why it is locked. */
  hint?: string;
  grow?: boolean;
  /** Renders the control, spreading `control`: its id, aria-invalid and aria-describedby. */
  children: (control: ControlProps) => ReactNode;
}

/**
 * A label over one control, then the control's hint and its error. Ported from
 * RevealAdminForm's Field on admin's tokens. The error shows next to its
 * control, and the control is described by the hint, then the error.
 */
export function Field({label, name, errors, hint, grow, children}: FieldProps) {
  const ids = fieldIds({name});
  const error = errors[name];
  return (
    <div style={grow ? GROWING_FIELD : FIELD}>
      <label id={ids.label} htmlFor={ids.control} style={FIELD_LABEL}>
        {label}
      </label>
      {children(controlProps({name, errors, hint: hint !== undefined}))}
      {hint !== undefined && (
        <p id={ids.hint} style={HINT}>
          {hint}
        </p>
      )}
      {error && (
        <p id={ids.error} style={ERROR_TEXT}>
          {error}
        </p>
      )}
    </div>
  );
}

interface TextFieldProps {
  name: TextKey;
  label: string;
  section: SectionProps;
  hint?: string;
  input?: Pick<InputHTMLAttributes<HTMLInputElement>, 'inputMode' | 'placeholder'>;
}

/** A one-line text field on the form, read-only while `section.locked` holds it. */
export function TextField({name, label, section, hint, input}: TextFieldProps) {
  const {form, errors, onChange, locked} = section;
  return (
    <Field label={label} name={name} errors={errors} hint={hint}>
      {(control) => (
        <input
          {...control}
          {...input}
          className="adm-input"
          value={form[name]}
          readOnly={locked.has(name)}
          onChange={(e) => onChange({[name]: e.target.value} as Partial<RevealCardForm>)}
        />
      )}
    </Field>
  );
}
```
The `as Partial<RevealCardForm>` is the old form's (`RevealAdminForm.tsx:71-72`): a computed key over the `TextKey` union types as a string index.

- [ ] **Step 10: Write `FormSection.tsx`**

Create `src/tools/studio/components/FormSection.tsx`:
```tsx
import {useId, type ReactNode} from 'react';
import {COLORS, SPACING, TRUNCATE} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_RADIUS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {SR_ONLY} from '../../../ui/layout';
import type {SectionState, SectionStatus} from '../readiness';
import type {StudioLayout} from '../studioLayout';
import {STUDIO_PANEL} from '../studioStyles';

/** The word each status adds to its section's heading: the dot is never the only cue (WCAG 1.4.1). */
const STATUS_WORD: Readonly<Record<SectionState, string>> = {
  error: 'has an error',
  complete: 'complete',
  incomplete: 'incomplete',
};

const DOT_SIZE = 8;
const DOT: React.CSSProperties = {
  flex: 'none',
  boxSizing: 'border-box',
  width: DOT_SIZE,
  height: DOT_SIZE,
  borderRadius: ADMIN_RADIUS.pill,
};

/**
 * The header's status dot (README §7): red for an error, green once complete,
 * and a hollow ring while incomplete, so complete and incomplete differ in
 * shape as well as colour.
 */
const STATUS_DOT: Readonly<Record<SectionState, React.CSSProperties>> = {
  error: {...DOT, background: COLORS.error},
  complete: {...DOT, background: COLORS.success},
  incomplete: {...DOT, border: `2px solid ${ADMIN_COLORS.barNeutral}`},
};

const SUMMARY_LINE: React.CSSProperties = {...TRUNCATE, display: 'block', fontSize: ADMIN_TYPE.small, fontWeight: 400};
/** A closed header's summary, or its section's error message in the error colour. */
const SUMMARY: Readonly<Record<SectionState, React.CSSProperties>> = {
  error: {...SUMMARY_LINE, color: COLORS.error},
  complete: {...SUMMARY_LINE, color: ADMIN_COLORS.muted},
  incomplete: {...SUMMARY_LINE, color: ADMIN_COLORS.muted},
};

const SECTION: React.CSSProperties = {...STUDIO_PANEL, display: 'flex', flexDirection: 'column'};
const HEADING: React.CSSProperties = {margin: 0};
// The wide header: the accordion header's padding and type, with no button.
const PLAIN_HEADING: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: SPACING.md,
  margin: 0,
  padding: `${SPACING.section}px ${SPACING.lg}px`,
  fontSize: ADMIN_TYPE.body,
  fontWeight: 700,
  color: ADMIN_COLORS.text,
};
const HEAD_TEXT: React.CSSProperties = {display: 'flex', flexDirection: 'column', flex: '1 1 auto', minWidth: 0};
const BODY: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.md,
  flex: '1 1 auto',
  padding: `0 ${SPACING.lg}px ${SPACING.lg}px`,
};

interface HeadingProps {
  titleId: string;
  title: string;
  status: SectionStatus;
}

/** The title, then its status in words, for screen readers. */
function TitleWithStatus({titleId, title, status}: HeadingProps) {
  return (
    <span>
      <span id={titleId}>{title}</span>
      <span style={SR_ONLY}>, {STATUS_WORD[status.state]}</span>
    </span>
  );
}

/** Wide: a plain heading. Every section is open, so there is nothing to toggle. */
function PlainHeading(props: HeadingProps) {
  return (
    <h2 style={PLAIN_HEADING}>
      <span aria-hidden="true" style={STATUS_DOT[props.status.state]} />
      <TitleWithStatus {...props} />
    </h2>
  );
}

interface AccordionHeadingProps extends HeadingProps {
  bodyId: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
}

/**
 * Narrow: the heading holds the accordion's button (h2 > button, as the APG
 * accordion has it). Closed, it sums up the section, or shows the section's
 * error message in its place.
 */
function AccordionHeading({bodyId, summary, open, onToggle, ...heading}: AccordionHeadingProps) {
  const {status} = heading;
  return (
    <h2 style={HEADING}>
      <button
        type="button"
        className="adm-acc-head"
        aria-expanded={open}
        aria-controls={open ? bodyId : undefined}
        onClick={onToggle}>
        <span aria-hidden="true" style={STATUS_DOT[status.state]} />
        <span style={HEAD_TEXT}>
          <TitleWithStatus {...heading} />
          {!open && <span style={SUMMARY[status.state]}>{status.message ?? summary}</span>}
        </span>
      </button>
    </h2>
  );
}

interface FormSectionProps {
  title: string;
  layout: StudioLayout;
  /** sectionStatuses' entry for the section (R-72): red only for an error the form shows. */
  status: SectionStatus;
  /** What the header says while closed (SECTION_SUMMARY); an error's message replaces it. */
  summary: string;
  /** Wide: always. Narrow: the one open section. */
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/**
 * One of the studio form's four sections, a region named by its title. Wide,
 * its heading is plain and its body always shows. Narrow, the heading is the
 * accordion's toggle, and a closed section's fields unmount.
 */
export function FormSection({title, layout, status, summary, open, onToggle, children}: FormSectionProps) {
  const titleId = useId();
  const bodyId = useId();
  const heading = {titleId, title, status};
  return (
    <section
      aria-labelledby={titleId}
      style={{...SECTION, border: `1px solid ${open ? ADMIN_COLORS.strongBorder : ADMIN_COLORS.border}`}}>
      {layout === 'wide' ? (
        <PlainHeading {...heading} />
      ) : (
        <AccordionHeading {...heading} bodyId={bodyId} summary={summary} open={open} onToggle={onToggle} />
      )}
      {open && (
        <div id={bodyId} style={BODY}>
          {children}
        </div>
      )}
    </section>
  );
}
```
Notes:
- **The border.** The section overrides `STUDIO_PANEL`'s whole `border`, never `borderColor`. React warns when a re-render changes a longhand beside its shorthand. An open section takes the strong border (`dc.html:1002`: `#333348` when on), and so does every section when wide.
- **`aria-controls`** is set only while the body is mounted. A closed section's fields unmount, so the id would point at nothing.
- **`SectionStatus.message`** is null unless the state is `error` (R4-3a), so `status.message ?? summary` picks the error's message exactly when there is one.

- [ ] **Step 11: Write the four sections**

Create `src/tools/studio/components/IdentitySection.tsx`:
```tsx
import {SPACING} from '../../../app-bridge';
import {FEATURED_FRANCHISE_HINT} from '../../reveal/constants';
import {LOCKED_NUMBER_HINT, type SectionProps} from '../formSections';
import type {StudioLayout} from '../studioLayout';
import {TextField} from './Field';

const ROW_GAP = SPACING.sm;
/** The collector number's column (README §7: 100px), then the name. */
const NUMBER_ROW: React.CSSProperties = {display: 'grid', gridTemplateColumns: '100px minmax(0, 1fr)', gap: ROW_GAP};
/** Version beside Franchise when wide, stacked in the narrow column. */
const PAIR_ROW: Readonly<Record<StudioLayout, React.CSSProperties>> = {
  wide: {display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: ROW_GAP, alignItems: 'start'},
  narrow: {display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: ROW_GAP},
};

/** Collector number and name, version and franchise, then subtypes. */
export function IdentitySection(section: SectionProps) {
  const locked = section.locked.has('collectorNumber');
  return (
    <>
      <div style={NUMBER_ROW}>
        <TextField
          name="collectorNumber"
          label="Collector number"
          section={section}
          hint={locked ? LOCKED_NUMBER_HINT : undefined}
          input={{inputMode: 'numeric'}}
        />
        <TextField name="name" label="Name" section={section} />
      </div>
      <div style={PAIR_ROW[section.layout]}>
        <TextField name="version" label="Version (subtitle)" section={section} />
        <TextField
          name="franchise"
          label="Franchise"
          section={section}
          hint={`Featured franchise: ${FEATURED_FRANCHISE_HINT}`}
        />
      </div>
      <TextField
        name="subtypes"
        label="Subtypes / classifications (comma separated)"
        section={section}
        input={{placeholder: 'Hero, Red Panda'}}
      />
    </>
  );
}
```

Create `src/tools/studio/components/InkRaritySection.tsx`. The three selects are interim (re-base note 1). The switch is the studio's own and stays:
```tsx
import {useId} from 'react';
import type {Ink} from 'inkweave-synergy-engine';
import {ALL_INKS, SPACING} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {RARITIES} from '../../reveal/constants';
import {SINGLE_INK_HINT, type SectionProps} from '../formSections';
import {HINT} from '../studioStyles';
import {Field} from './Field';

const SWITCH_ROW: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.xs};
const SWITCH_LABEL: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: SPACING.sm,
  alignSelf: 'flex-start',
  fontSize: ADMIN_TYPE.body,
  color: ADMIN_COLORS.text,
  cursor: 'pointer',
};

/**
 * "Dual-ink card" (README §7): a checkbox with the switch role, a view over
 * ink2. Its state is StudioForm's (SectionProps.dual), so closing this section
 * in the narrow accordion can't turn it off. On with no second ink, the hint
 * says the card publishes as single-ink.
 */
function DualInkSwitch({form, dual}: Pick<SectionProps, 'form' | 'dual'>) {
  const hintId = useId();
  const single = dual.on && form.ink2 === '';
  return (
    <div style={SWITCH_ROW}>
      <label style={SWITCH_LABEL}>
        <input
          type="checkbox"
          role="switch"
          className="adm-switch"
          checked={dual.on}
          aria-describedby={single ? hintId : undefined}
          onChange={dual.toggle}
        />
        Dual-ink card
      </label>
      {single && (
        <p id={hintId} style={HINT}>
          {SINGLE_INK_HINT}
        </p>
      )}
    </div>
  );
}

/**
 * The ink, Dual-ink and the second ink, and the rarity. The three selects are
 * RevealAdminForm's, ported onto admin's classes until R4-5c's pickers replace
 * them (R-74, R-75, R-83). The Dual-ink switch is the studio's own.
 */
export function InkRaritySection({form, errors, onChange, dual}: SectionProps) {
  return (
    <>
      <Field label="Ink" name="ink" errors={errors}>
        {(control) => (
          <select {...control} className="adm-select" value={form.ink} onChange={(e) => onChange({ink: e.target.value as Ink})}>
            {ALL_INKS.map((ink) => (
              <option key={ink} value={ink}>
                {ink}
              </option>
            ))}
          </select>
        )}
      </Field>
      <DualInkSwitch form={form} dual={dual} />
      {dual.on && (
        <Field label="Second ink" name="ink2" errors={errors}>
          {(control) => (
            <select
              {...control}
              className="adm-select"
              value={form.ink2}
              onChange={(e) => onChange({ink2: e.target.value as '' | Ink})}>
              <option value="">None</option>
              {ALL_INKS.map((ink) => (
                <option key={ink} value={ink}>
                  {ink}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}
      <Field label="Rarity" name="rarity" errors={errors}>
        {(control) => (
          <select {...control} className="adm-select" value={form.rarity} onChange={(e) => onChange({rarity: e.target.value})}>
            <option value="">None</option>
            {RARITIES.map((rarity) => (
              <option key={rarity} value={rarity}>
                {rarity}
              </option>
            ))}
          </select>
        )}
      </Field>
    </>
  );
}
```
The switch is a native checkbox, so it takes Space, reports `checked` as the switch's state, and is named by its wrapping label. jsx-a11y accepts `role="switch"` on `input[type=checkbox]` with no `aria-checked`.

Create `src/tools/studio/components/TypeStatsSection.tsx`:
```tsx
import type {CardType} from 'inkweave-synergy-engine';
import {SPACING} from '../../../app-bridge';
import {SegmentedControl} from '../../../ui/SegmentedControl';
import {CARD_TYPES, STAT_FIELDS, STAT_LABELS} from '../../reveal/constants';
import {COST_SLIDER_MAX, costSlider, type SectionProps} from '../formSections';
import {FIELD_LABEL} from '../studioStyles';
import {Field, TextField} from './Field';

const TYPE_OPTIONS = CARD_TYPES.map((type) => ({value: type, label: type}));

// The keys that move a range input. Any other key, Tab above all, leaves a blank cost blank.
const SLIDER_KEYS: ReadonlySet<string> = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

const COST_BOX_WIDTH = 64;
const COST_ROW: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: SPACING.md};
const COST_BOX: React.CSSProperties = {flex: 'none', width: COST_BOX_WIDTH};
const STATS_ROW: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: SPACING.sm};
const CHECK_ROW: React.CSSProperties = {...FIELD_LABEL, display: 'inline-flex', alignItems: 'center', gap: SPACING.sm};

/**
 * The cost: a box that holds exactly what was typed, so the validator still
 * refuses "1.5", and beside it a 0-10 slider with its own name. A blank cost's
 * slider has no thumb and reads "Not set"; its first press, or a key that moves
 * it, sets 0 first, so 0 can be picked.
 */
function CostField({form, errors, onChange}: SectionProps) {
  const slider = costSlider(form);
  const startAtZero = () => {
    if (slider.unset) onChange({cost: '0'});
  };
  return (
    <Field label="Cost" name="cost" errors={errors}>
      {(control) => (
        <div style={COST_ROW}>
          <input
            {...control}
            className="adm-input"
            style={COST_BOX}
            inputMode="numeric"
            value={form.cost}
            onChange={(e) => onChange({cost: e.target.value})}
          />
          <input
            type="range"
            className="adm-range"
            min={0}
            max={COST_SLIDER_MAX}
            step={1}
            aria-label="Cost slider"
            aria-valuetext={slider.valueText}
            data-unset={slider.unset || undefined}
            value={slider.value}
            onPointerDown={startAtZero}
            onKeyDown={(e) => {
              if (SLIDER_KEYS.has(e.key)) startAtZero();
            }}
            onChange={(e) => onChange({cost: e.target.value})}
          />
        </div>
      )}
    </Field>
  );
}

/**
 * The card's type, whether it is inkable, its cost and the stats its type
 * prints (STAT_FIELDS). R4-5c replaces the Inkable checkbox with the
 * handoff's Inkable and Uninkable buttons, first in the section.
 */
export function TypeStatsSection(section: SectionProps) {
  const {form, onChange} = section;
  const stats = STAT_FIELDS[form.type] ?? [];
  return (
    <>
      <SegmentedControl<CardType>
        options={TYPE_OPTIONS}
        value={form.type}
        onChange={(type) => onChange({type})}
        ariaLabel="Type"
      />
      <label style={CHECK_ROW}>
        <input type="checkbox" checked={form.inkwell} onChange={(e) => onChange({inkwell: e.target.checked})} />
        Inkable (can go in inkwell)
      </label>
      <CostField {...section} />
      {stats.length > 0 && (
        <div style={STATS_ROW}>
          {stats.map((stat) => (
            <TextField key={stat} name={stat} label={STAT_LABELS[stat]} section={section} input={{inputMode: 'numeric'}} />
          ))}
        </div>
      )}
    </>
  );
}
```
How the slider's first key works: the key's `keydown` sets the cost to `'0'` first. The browser's default action then moves the range from 0, so ArrowRight lands on 1, and ArrowLeft or Home stay on 0 with no change event. `data-unset={slider.unset || undefined}` renders `data-unset="true"` or nothing, which is what `adm-range`'s rule reads.

Create `src/tools/studio/components/CardTextSection.tsx`. Its `canonicalizeOnLeave` and the comment above it move unchanged from `RevealAdminForm.tsx:76-83`:
```tsx
import type {FocusEvent} from 'react';
import {canonicalizeCardFullText} from 'inkweave-synergy-engine';
import {SCAN_LANGUAGE_HINT, type SectionProps} from '../formSections';
import {scanLanguageOptions} from '../scanLanguages';
import {Field} from './Field';

const FULL_TEXT: React.CSSProperties = {flex: '1 1 auto'};

/** Keywords, the full card text and the scan's language. */
export function CardTextSection({form, errors, onChange}: SectionProps) {
  // Show the house-style rewrite (#635) when the owner moves on within the page. Not when the
  // window or tab loses focus (alt-tab to copy the next ability): the field is still the active
  // element then, and trimming its trailing newline would glue the next paste onto this line.
  const canonicalizeOnLeave = (e: FocusEvent<HTMLTextAreaElement>) => {
    const field = e.currentTarget;
    if (field.ownerDocument.activeElement === field) return;
    onChange({fullText: canonicalizeCardFullText(field.value)});
  };

  return (
    <>
      <Field label="Keywords (one per line, e.g. Singer 5)" name="keywords" errors={errors}>
        {(control) => (
          <textarea
            {...control}
            className="adm-input"
            value={form.keywords}
            onChange={(e) => onChange({keywords: e.target.value})}
          />
        )}
      </Field>
      <Field label="Full card text (one ability per line)" name="fullText" errors={errors} grow>
        {(control) => (
          <textarea
            {...control}
            className="adm-input"
            style={FULL_TEXT}
            value={form.fullText}
            onChange={(e) => onChange({fullText: e.target.value})}
            onBlur={canonicalizeOnLeave}
          />
        )}
      </Field>
      <Field label="Scan language" name="scanLanguage" errors={errors} hint={SCAN_LANGUAGE_HINT}>
        {(control) => (
          <select
            {...control}
            className="adm-select"
            value={form.scanLanguage}
            onChange={(e) => onChange({scanLanguage: e.target.value})}>
            {scanLanguageOptions(form.scanLanguage).map(({code, label}) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        )}
      </Field>
    </>
  );
}
```

- [ ] **Step 12: Write `StudioForm.tsx`**

Create `src/tools/studio/components/StudioForm.tsx`:
```tsx
import {useState} from 'react';
import type {RevealCardForm} from '../../reveal/buildPreviewCard';
import {SECTION_SUMMARY, SECTIONS, dualInk, type SectionProps} from '../formSections';
import {sectionStatuses, visibleErrors, type SectionId} from '../readiness';
import type {StudioLayout} from '../studioLayout';
import {STUDIO_FORM} from '../studioStyles';
import {CardTextSection} from './CardTextSection';
import {FormSection} from './FormSection';
import {IdentitySection} from './IdentitySection';
import {InkRaritySection} from './InkRaritySection';
import {TypeStatsSection} from './TypeStatsSection';

/** Each section's fields. */
const BODIES: Readonly<Record<SectionId, (props: SectionProps) => React.JSX.Element>> = {
  identity: IdentitySection,
  ink: InkRaritySection,
  type: TypeStatsSection,
  text: CardTextSection,
};

const NO_LOCKS: ReadonlySet<keyof RevealCardForm> = new Set();

interface StudioFormProps {
  form: RevealCardForm;
  /** The validator's errors, all of them: the form shows them through visibleErrors (R-72). */
  errors: Readonly<Record<string, string>>;
  onChange: (patch: Partial<RevealCardForm>) => void;
  layout: StudioLayout;
  /** Text fields shown read-only: Edit locks the collector number (R-91). */
  locked?: ReadonlySet<keyof RevealCardForm>;
}

/**
 * Card studio's form: four sections over one RevealCardForm (README §7). Wide,
 * they sit two by two across the page's middle columns, every one open. Narrow,
 * they are an accordion with one section open at a time, Identity first. A
 * blank required field is incomplete, not wrong (R-72): it shows no error and
 * leaves its section's dot neutral.
 *
 * It holds the view state the sections share: which section is open, and the
 * Dual-ink switch, lifted here so closing the Ink & rarity section can't drop
 * it. Edit keys the form by card (R-46), which resets both; New keeps them.
 */
export function StudioForm({form, errors, onChange, layout, locked = NO_LOCKS}: StudioFormProps) {
  const [openId, setOpenId] = useState<SectionId | null>('identity');
  const [dualOpen, setDualOpen] = useState(false);
  const statuses = sectionStatuses(form, errors);
  const section: SectionProps = {
    form,
    errors: visibleErrors(form, errors),
    onChange,
    layout,
    locked,
    dual: dualInk({open: dualOpen, setOpen: setDualOpen, form, onChange}),
  };
  return (
    <div style={STUDIO_FORM[layout]}>
      {SECTIONS.map(({id, title}) => {
        const Body = BODIES[id];
        return (
          <FormSection
            key={id}
            title={title}
            layout={layout}
            status={statuses[id]}
            summary={SECTION_SUMMARY[id](form)}
            open={layout === 'wide' || openId === id}
            onToggle={() => setOpenId(openId === id ? null : id)}>
            <Body {...section} />
          </FormSection>
        );
      })}
    </div>
  );
}
```
`BODIES` holds module-level components, so `<Body />` is no component made during render: `react-hooks/static-components` and the React Compiler rule pass it.

- [ ] **Step 13: Run them to PASS**

Run: `pnpm vitest run --project app src/tools/studio/__tests__/StudioForm.test.tsx src/tools/studio/__tests__/StudioFormCardText.test.tsx`
Expected: PASS, `Test Files 2 passed (2)`, `Tests 22 passed (22)`: 20 in `StudioForm.test.tsx`, with the `it.each` counting as two, and 2 in `StudioFormCardText.test.tsx`. React logs no "not wrapped in act" warning.

Then run all four together: `pnpm vitest run --project app src/tools/studio/__tests__/fieldWiring.test.ts src/tools/studio/__tests__/formSections.test.ts src/tools/studio/__tests__/StudioForm.test.tsx src/tools/studio/__tests__/StudioFormCardText.test.tsx`
Expected: `Tests 43 passed (43)`.

- [ ] **Step 14: Stories**

Create `src/tools/studio/components/StudioForm.stories.tsx`, titled `Admin/Publish/Card studio/Form`. The harness validates on every change, as the page does, so every story is live. The forms come from `EMPTY_FORM` and from R4-3a's `revealForm`, the plain fixture module in `src/test` that R4-3a made for tests and stories (R4-5c's and R4-5e's stories import it too). A story never imports a `*.test.tsx` file:
```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {inkBlock} from '../../../app-bridge';
import {revealForm} from '../../../test/revealForm';
import type {RevealCardForm} from '../../reveal/buildPreviewCard';
import {EMPTY_FORM} from '../../reveal/emptyForm';
import {validateRevealCardForm} from '../../reveal/validateForm';
import type {StudioLayout} from '../studioLayout';
import {StudioForm} from './StudioForm';

/** Mei, as New reveal would hold her: the tests' complete Ruby character, with a franchise, subtypes and card text. */
const MEI = revealForm({
  franchise: 'Turning Red',
  subtypes: 'Hero, Red Panda',
  keywords: 'Singer 5',
  fullText: 'PANDA POWER When you play this character, draw a card.',
});

// The form's column at narrow widths (README §7: flex 0 1 400px).
const NARROW_COLUMN = 400;
// The form slot at the narrowest wide layout (R-64): the page's two middle columns and the gap between them,
// (1328 - 400 - 280 - 2 × 12) px.
const WIDE_COLUMNS = 624;

interface HarnessProps {
  start?: RevealCardForm;
  layout?: StudioLayout;
  locked?: ReadonlySet<keyof RevealCardForm>;
}

/** The form with real state, validated on every change as the page validates it, so every story is live. */
function Harness({start = EMPTY_FORM, layout = 'wide', locked}: HarnessProps) {
  const [form, setForm] = useState<RevealCardForm>(start);
  const {errors} = validateRevealCardForm(form, new Set(), 'scan.png');
  return (
    <div style={{maxWidth: layout === 'wide' ? WIDE_COLUMNS : NARROW_COLUMN}}>
      <StudioForm
        form={form}
        errors={errors}
        layout={layout}
        locked={locked}
        onChange={(patch) => setForm((f) => ({...f, ...patch}))}
      />
    </div>
  );
}

const meta: Meta<typeof StudioForm> = {
  title: 'Admin/Publish/Card studio/Form',
  component: StudioForm,
};
export default meta;
type Story = StoryObj<typeof StudioForm>;

/** A fresh New reveal form: no red anywhere (R-72), every section neutral but Card text. */
export const NewReveal: Story = {render: () => <Harness />};

/** The same form in the narrow accordion: Identity open, the rest summed up. */
export const NewRevealNarrow: Story = {render: () => <Harness layout="narrow" />};

/** A complete card: four green dots. */
export const Complete: Story = {render: () => <Harness start={MEI} />};

/**
 * Filled values that fail: a cost of 1.5, an Amber number on a Ruby card, and
 * a spelled-out glyph word. A blank name stays neutral beside them.
 */
export const FilledErrors: Story = {
  render: () => (
    <Harness
      layout="narrow"
      start={{
        ...MEI,
        name: '',
        cost: '1.5',
        collectorNumber: String(inkBlock('Amber').first),
        fullText: 'PANDA POWER Your Strength wins every challenge.',
      }}
    />
  ),
};

/** Edit card: the collector number is locked (R-91). */
export const EditLocked: Story = {render: () => <Harness start={MEI} locked={new Set(['collectorNumber'])} />};

/**
 * A dual-ink card, Ruby and Steel: the switch is on. Turn it off and the
 * second ink clears; turn it on again and the hint says the card publishes as
 * single-ink until one is picked.
 */
export const DualInk: Story = {render: () => <Harness start={{...MEI, ink2: 'Steel'}} />};

/**
 * Kit Cloudkicker - Sure Shot (14192) as it was typed in. Click into the full
 * card text and out again: the words become glyphs (#635).
 */
export const SpelledOutCardText: Story = {
  render: () => (
    <Harness
      start={{
        ...MEI,
        fullText: 'Shift 3 (You may pay 3 Ink to play this on top of one of your characters named Kit Cloudkicker.)',
      }}
    />
  ),
};

/** A card marked by hand with a language the list lacks: it keeps its own option, by its English name (R-60). */
export const UnlistedScanLanguage: Story = {render: () => <Harness start={{...MEI, scanLanguage: 'zh'}} />};
```
`.storybook/preview.tsx` mounts AdminStyles, so the `adm-*` classes draw. Nothing here calls `useBlocker`, so no story needs a data router. The meta has no `tags: ['autodocs']`, on purpose: the form's `field-*` ids are page-global, and a docs page would render all eight stories in one document and repeat them.

- [ ] **Step 15: Lint the changed files and typecheck once**

Run:
```bash
pnpm exec eslint --max-warnings 0 src/ui/layout.ts src/tools/analytics/activity/VoteLogTable.tsx src/tools/studio/fieldWiring.ts src/tools/studio/formSections.ts src/tools/studio/components src/tools/studio/__tests__/fieldWiring.test.ts src/tools/studio/__tests__/formSections.test.ts src/tools/studio/__tests__/StudioForm.test.tsx src/tools/studio/__tests__/StudioFormCardText.test.tsx
```
Expected: no output, exit 0.

Run: `pnpm typecheck`
Expected: exit 0. It covers the stories and the test files, so the `Readonly<RevealCardForm>` passed as `form`, the computed-key patch and the `'zh'` code are checked too.

No reveal-sync run: this task touches no contract file and no bridge line. No `pnpm lint` or `pnpm test:run`: the pre-commit hook runs both.

- [ ] **Step 16: Code Health**

Run CodeScene's `code_health_review` on each changed file:
- `src/tools/studio/fieldWiring.ts` and `src/tools/studio/formSections.ts`;
- the eight files in `src/tools/studio/components/`;
- the four test files;
- `src/ui/layout.ts` and `src/tools/analytics/activity/VoteLogTable.tsx`.

Expected: 10.0 each, with no findings (MCP 1.5.7 gave that in the sandbox). A file with no functions, such as the stories, may report no score.

Check the hand count under Interfaces too: 0 primitive parameters in every new module. If the review flags a component, split it the way `FormSection` splits its headings and `TypeStatsSection` its cost: tables over branches, and subcomponents of one props object each. Keep `it.each` rows as one object; a tuple callback with five arguments failed the Excess Number of Function Arguments check in the sandbox. The PR gate is stricter than the local tool, so R4-8 runs `analyze_change_set` before the push.

- [ ] **Step 17: Look at it in Storybook**

Run: `pnpm storybook`, then open http://localhost:6007 → `Admin/Publish/Card studio/Form`. Check these:
- **`NewReveal`:**
  - Four sections, two by two: Identity over Ink & rarity, Type & stats over Card text, the rows at equal heights.
  - No red anywhere. Three hollow dots and one green dot (Card text).
  - The cost slider shows no thumb. Press it: the box reads 0 and the thumb appears.
  - Collector number and Name share a row (100px, then the rest), and Version sits beside Franchise.
- **`NewRevealNarrow`:**
  - Only Identity is open, with its chevron turned. The other headers show a dot, the title and a one-line summary.
  - Open Type & stats: Identity closes.
  - Tab through: every header button shows the gold ring inside its edge.
- **`FilledErrors`:** Ink & rarity, Type & stats and Card text are red, each showing its message as its summary. Open each: the message sits under its control in red. Identity stays neutral, with its blank name unmarked.
- **`EditLocked`:** the collector number can't be typed into, and its hint says why.
- **`DualInk`:** the switch is on with Steel picked. Turn it off: Second ink goes. Turn it on: the hint shows and Second ink reads None.
- **`SpelledOutCardText`:** click into the full card text and out again, and the words become glyphs.
- **`UnlistedScanLanguage`:** the select reads Chinese, the last option.
- **Every story:** Storybook's Accessibility panel reports no violations, contrast included: muted hints, the red summaries and the dots on the panel fill.

Stop the server afterwards. If no browser is available to the implementer, record each check as pending with the owner, as R1-2's Step 11 did, and say so in the report.

- [ ] **Step 18: Commit**, with the Bash tool and only after the owner approves. Use two separate calls, so the commit command starts with `USER_APPROVED=1`:

```bash
git add src/ui/layout.ts src/tools/analytics/activity/VoteLogTable.tsx src/tools/studio/fieldWiring.ts src/tools/studio/formSections.ts src/tools/studio/components/Field.tsx src/tools/studio/components/FormSection.tsx src/tools/studio/components/IdentitySection.tsx src/tools/studio/components/InkRaritySection.tsx src/tools/studio/components/TypeStatsSection.tsx src/tools/studio/components/CardTextSection.tsx src/tools/studio/components/StudioForm.tsx src/tools/studio/components/StudioForm.stories.tsx src/tools/studio/__tests__/fieldWiring.test.ts src/tools/studio/__tests__/formSections.test.ts src/tools/studio/__tests__/StudioForm.test.tsx src/tools/studio/__tests__/StudioFormCardText.test.tsx
```

Then run CodeScene's `pre_commit_code_health_safeguard`, and go on only when it passes.

```bash
USER_APPROVED=1 git commit -m "feat(studio): add the studio form and its accordion (#24)"
```

Never pipe the commit, and never pass `--no-verify`. Husky's pre-commit runs the full lint and `test:run`. If Vitest fails to start its workers under load, stop this session's preview servers, wait out other sessions' runs, and retry.

### Hand-offs from R4-5b

- **R4-5c (the pickers).** It **modifies** `InkRaritySection.tsx` and `TypeStatsSection.tsx`; it creates neither.
  - **Keep** `DualInkSwitch`, `SectionProps.dual` and `dualInk`. The switch's state lives in `StudioForm`.
  - **Ink.** `InkPicker` replaces the Ink select. Its group takes `aria-labelledby={fieldIds({name: 'ink'}).label}` on its visible "Ink · {name}" label, and `aria-describedby` from `controlProps({name: 'ink', errors})['aria-describedby']`, with the error printed under it with `id={fieldIds({name: 'ink'}).error}`. Add the outline's "the ink error describes the Ink group" case.
  - **Second ink.** Its tiles replace the second select, under `dual.on`. R-75: the row leaves out the primary ink, and picking a primary equal to `ink2` also clears `ink2` (`onChange({ink, ink2: ''})`). `SINGLE_INK_HINT` still describes the switch.
  - **Rarity.** Buttons replace the Rarity select: "None" first, then `RARITIES` less Enchanted (R-74), each with `RaritySymbol` (R-83).
  - **Inkable.** The Inkable and Uninkable buttons replace the checkbox. README §7 says "first in the row" without naming the row; the prototype draws them after the Type row and before Cost (`dc.html:224-226`), which is where the checkbox sits.
  - **Tests to update in `StudioForm.test.tsx`.** "marks a filled value that fails…" reads `getByLabelText('Ink')`, which becomes the group (`getByRole('group', {name: /^Ink/})`). The first Dual-ink case picks Steel through `selectOptions` on "Second ink", which becomes the Steel tile. The section summaries and statuses don't change.
- **R4-5d (the card panel).** Its task file gives the file inputs `useId` ids, so it doesn't need `fieldWiring.ts`; its description order (the error, then the formats) is its own. `SR_ONLY` is in `src/ui/layout.ts` if it needs one.
- **R4-6a (the page and New reveal).**
  - Render `<StudioForm form={ctrl.form} errors={ctrl.validation.errors} onChange={ctrl.patchForm} layout={layout} />` inside the form slot (`STUDIO_SLOT[layout].form`). Pass the validator's errors whole: the form applies R-72 itself.
  - **Ids are page-global** (`field-*`), so only one `StudioForm` mounts at a time. R-57 keeps both drafts in their controllers, not both forms on the page: render only the active mode's pane, as R4-6a's draft does.
  - **A publish resets the form, not the form's view state.** New reveal's `StudioForm` stays mounted when `useRevealAdmin` resets the form to `EMPTY_FORM`, so the open accordion section and the Dual-ink hold carry over (on, with the single-ink hint, after a dual-ink card). If the next card should start fresh, key New's form by the last commit (for example `key={ctrl.result?.commitUrl ?? 'new'}`), alongside R-59's focus after Publish. R4-5c's hand-off says the same.
  - **jsdom is narrow.** `useContainerWidth` measures 0 there, so the page renders the accordion with only Identity's fields mounted. A page test that fills Cost or the stats either sets the measured width wide, or opens Type & stats first (`getByRole('button', {name: /^Type & stats/})`).
- **R4-6b (the Edit pane).**
  - Pass `locked={EDIT_LOCKS}`, a module constant `new Set<keyof RevealCardForm>(['collectorNumber'])`, and `edit.validation.errors`.
  - Keying the Edit view by card id (R-46) remounts the form, which resets its open section to Identity and its Dual-ink hold. A card that has `ink2` reads as dual from the form alone.
- **R4-6c (retiring `/reveal`).** Both test files go with `RevealAdminForm.tsx`, every case ported:
  - `RevealAdminForm.test.tsx` holds four cases once R4-3a adds its French one. Its three originals are ported here, in "StudioForm, ported from RevealAdminForm": "ties each error to its control" on a filled cost (R-72), with its ink-group half in R4-5c's edit of "marks a filled value that fails…". R4-3a's French case is covered by "lists a language the list lacks…", whose options are `SCAN_LANGUAGES`, French included. R4-6c's count of tests that go with the deleted files should read 4 for this file, not 3.
  - `RevealAdminFormCardText.test.tsx`'s two are ported here, in `StudioFormCardText.test.tsx`.
- **R4-8 ("R4 as built").** Record these as departures from the outline:
  - the Dual-ink switch landed in R4-5b, with its state in `StudioForm`;
  - `fieldWiring.ts` and `formSections.ts`, with `Field`'s render prop;
  - `SR_ONLY` moved to `src/ui/layout.ts`;
  - the changed labels (Franchise and Scan language with hints, Second ink, "None"), and the franchise hint worded "Featured franchise: …" where the handoff prints "Franchise: …";
  - the Cost box before its slider;
  - `locked` covers text fields only.
