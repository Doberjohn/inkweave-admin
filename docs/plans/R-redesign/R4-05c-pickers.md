> Part of [R: Admin redesign](../R-redesign.md), phase R4 ([R4-card-studio.md](R4-card-studio.md)). Read the main plan's decisions (R-57 to R-91 for R4), corrections, global constraints and shared interfaces, then the R4 header, first.

> **Re-base notes (R4-5c, 2026-10-07).** Re-based from the 2026-10-01 outline's Task R4-5 (`R4-card-studio.md:601-810`: the Ink, Dual ink, Rarity and Inkable bullets at `:654-680`, contract addition 1 at `:6-13`, and the form tests at `:771-781`), onto `main @ e5e5029` with pin `upstream/inkweave` @ `16283a13`, on branch `feature/24-redesign-r4`. The outline was written against the planned R1 code. Decisions R-57 to R-91 apply; this task carries R-74, R-75 and R-83. The R4 audit applies too (`.superpowers/sdd/R-redesign/r4-audit-synth.md`, "R4-5"; `r4-audit-full.json`, `audits[4]`). It builds on R4-5a and R4-5b as their task files define them (`R4-05a-studio-foundations.md`, `R4-05b-form-frame.md`). What changed and why:
> 1. **The 5b/5c line, as R4-5b drew it.**
>    - **R4-5b builds the Dual-ink switch** and lifts its state into `StudioForm`: `SectionProps.dual`, `dualInk()` and `SINGLE_INK_HINT` in `formSections.ts`, and `DualInkSwitch` in `InkRaritySection.tsx`. Only the switch can show that the lift works. It ships the outline's other ink, rarity and inkwell controls as interim ports: three `adm-select`s and the old Inkable checkbox.
>    - **This task keeps the switch as it is.** It **modifies** `InkRaritySection.tsx` and `TypeStatsSection.tsx`, as R4-5b's hand-off says, and creates no section.
>    - **So the outline's own `dualOpen` sketch (`:658-677`) is gone.** What's left of "the Dual-ink switch" here is the second-ink tiles under it, and R-75's start state (item 2).
> 2. **R-75, the ink picker** (the handoff's rules: `README.md:119`, `dc.html:214-218`, `:782-789`).
>    - **The tiles.** Six `aria-pressed` tiles, `className="adm-pick-btn adm-ink-tile"`, each holding an `InkIcon` with `decorative={false}`. The icon's `alt` is the ink's name, so the tile's name is the ink and nothing names it twice.
>    - **The selected look.** It is admin's one gold, `adm-pick-btn`'s pressed fill and border (`adm-card-btn`'s, R4-5a). It is never the handoff's `INK_COLORS` fill, which would need `data-ink` rules and a wider colour check in `AdminStyles.test.tsx`.
>    - **The label** reads "Ink · {name}": "Ink · Amber", or "Ink · Amber / Ruby" (`dc.html:1007`). Only "Ink" is the group's name (`aria-labelledby` on `field-ink-label`). The name after the dot sits outside it, so the group keeps one name while the picks change.
>    - **The second-ink row** shows while `dual.on`. Its tiles are 40px (`data-size="sm"`), and it leaves out the primary (`dc.html:782`).
>    - **A primary pick equal to the second ink clears the second** (`{ink, ink2: ''}`, `dc.html:789`).
>    - **One line in `StudioForm.tsx`.** This is the only edit outside the two files R4-5b's hand-off names. The switch's hold now starts open when the form mounts with a second ink: `useState(() => form.ink2 !== '')` in place of `useState(false)`.
>      - The handoff keeps its `dual` flag when a pick clears the second ink: `loadCard` sets it from the card (`dc.html:760`), and the pick leaves it alone (`:789`).
>      - With R4-5b's `false`, a loaded dual-ink card would turn its switch off and hide the row. A switch turned on by hand would stay on. So the result would hang on how the switch got there.
>      - Edit keys the form by card (R-46), so the start state is read once per card. New reveal's form first mounts on `EMPTY_FORM`, so it starts closed, as before. The page renders only the active mode's pane (R4-6a), so a mode switch remounts New's form on its kept draft (R-57): a draft that holds a second ink then starts open, as an Edit card does.
> 3. **R-74 and R-83, the rarity.**
>    - **`STUDIO_RARITIES`** is `RARITIES` less Enchanted (R-74), filtered in the studio. `RARITIES` (`constants.ts:25-32`) is a reveal-sync contract file and stays as it is; a test pins both.
>    - **The order.** "None" comes first and clears the rarity, which stays optional.
>    - **The glyphs.** Each button draws `<RaritySymbol rarity={rarity.toLowerCase()} size={18} />` (R-83). At the pin RaritySymbol keys `common` to `legendary` and the three printings (`RaritySymbol.tsx:12-21`), and it is `aria-hidden`, so the button's text names it. There is no `enchantedSymbol`: R4-5h drops the webps and keeps `RaritySymbol`.
>    - **An unlisted rarity stays in view.** This is new; no decision covers it. A form whose rarity isn't offered (an Edit card marked Enchanted by hand) shows it as one more button, pressed, after the five. Picking another drops it, as R4-5b's select does for an unlisted scan language (R-60).
>      - Without it, Edit would show no pressed button, and a click would silently replace a value the operator never saw.
>      - It never shows today: the pinned file has no Enchanted card (0 of 204), and one card has no rarity, which None presses.
>      - If the owner would rather not have it, delete `rarityChoices` and map `STUDIO_RARITIES`.
> 4. **The Inkable buttons sit after Type, before Cost.**
>    - **Where.** That is the prototype's order (`dc.html:224-226`: the Type control, then the inkwell row, then the cost row). It is also where R4-5b's checkbox sits.
>    - **R4-5b's hand-off** now says the same: README §7's "first in the row" names no row, and the prototype draws the buttons after the Type row and before Cost. Only R4-5b's doc comment on `TypeStatsSection` still says "first in the section", and Step 7 rewrites it. R4-8 records the placement, since the README reads either way.
>    - **How.** The two buttons are `adm-pick-btn`s with the app's `InkwellIcon` (`value: 'inkable' | 'uninkable'`, decorative). They sit in a two-column grid named "Inkwell", as `SegmentedControl` names the Type row above it with `ariaLabel`.
> 5. **Accessibility.**
>    - **`PickerGroup` is `Field`'s counterpart for a set of buttons.** A `role="group"` isn't labelable, so its visible label names it through `aria-labelledby` (`fieldIds({name}).label`). Its error is printed under it (`fieldIds({name}).error`) and describes it through `controlProps({name, errors})['aria-describedby']`: R4-5b's one wiring rule, so "every validator message next to its control" holds.
>    - **No `aria-invalid` on a group.** ARIA 1.2 doesn't support it on `group`, and jsx-a11y can't see a spread value. The described message and the section's red dot (with ", has an error" in its heading) carry the error.
>    - **So one ported case changes.** R4-5b's "marks a filled value that fails…" read `getByLabelText('Ink')` and its `aria-invalid`. It now asserts the description on `getByRole('group', {name: 'Ink'})`. This is the outline's "the ink error describes the Ink group", which R4-5b's hand-off moves here. R4-5b's first Dual-ink case clicks the Steel tile instead of selecting it.
>    - **Every button is a Tab stop**, fired by Enter or Space, as `SegmentedControl`'s are. No roving arrow keys: the global constraint is `aria-pressed` buttons.
> 6. **The tests.**
>    - **`inkPicks.test.ts`** covers the pure rules, one-object `it.each` rows.
>    - **`StudioPickers.test.tsx`** drives the pickers through `StudioForm` (wide), so the switch's lifted state, `visibleErrors` and the wiring are the page's own.
>      - It pins the outline's "chosen ink is pressed", "None clears the rarity" and the second-ink row.
>      - It pins R-75's rules, the five rarities with no Enchanted, and each glyph against RaritySymbol's own `src` (R4-5h's way: no asset path in a test).
>      - It pins the unlisted rarity, and the Inkable buttons' place and state.
>    - **`StudioForm.test.tsx`** gets R4-5b's two cases updated, and one helper.
>    - **Errors are built by the validator** in every test and story, never by hand.
> 7. **What doesn't change.**
>    - No reveal-sync contract file (`RARITIES` is only read) and no bridge line: `InkwellIcon` is R4-5a's, and `RaritySymbol` is already bridged. So there is no reveal-sync run.
>    - No new `adm-*` class: R4-5a's `adm-pick-btn`, `adm-ink-tile` and `adm-switch` are what the handoff draws.
>    - `RevealAdminForm.tsx` stays until R4-6c.
> 8. **Names other tasks settle.** Step 1 checks each:
>    - **R4-5a:** the compound `.adm-pick-btn.adm-ink-tile` with `data-size="sm"`; `FIELD_LABEL`, `ERROR_TEXT` and `STUDIO_PANEL`; `export {InkwellIcon}`. R4-5a's earlier draft made `adm-ink-tile` a class of its own; its task file composes the two.
>    - **R4-5b:** `fieldIds`, `controlProps`, `SectionProps`, `DualInk`, `dualInk` and `SINGLE_INK_HINT`, and the lines this task replaces.
>    - **R4-3a:** `EMPTY_FORM` in `src/tools/reveal/emptyForm.ts`, and `revealForm` in `src/test/revealForm.ts`.
> 9. **Code Health, counted by hand** (named functions; the PR gate wants under 30% primitive parameters per module):
>    - **`inkPicks.ts`:** `rarityChoices(form)`, `secondInks(form)`, `primaryInkPatch(pick)` and `inkName(form)` take objects. 0 of 4. The `filter` callbacks are unannotated.
>    - **Components:** one props object each (`PickerGroup`, `InkTiles`, `InkPicker`, `SecondInkPicker`, `RarityPicker`, `InkwellPicker`, `DualInkSwitch`, `InkRaritySection`, and the story's `Pickers`). 0 in every file. `TypeStatsSection.tsx` and `StudioForm.tsx` keep R4-5b's 0.
>    - **`StudioPickers.test.tsx`:** `inGroup(name: string)` is the one primitive. `names(buttons)`, `srcOf(icon)` and `Harness(props)` take objects, and `inkLabel` and `dualSwitch` take nothing. That is 1 of 4 (25%), which is why there is no `pressed(name)` or `tile(group, ink)` helper. `StudioForm.test.tsx` gains `secondInk()`, with no parameter.
>    - **Complexity:** at most 3 (`PickerGroup`, `rarityChoices`), with no `a || b || c` chain.
> 10. **Gates once.** The steps run the three test files, then the studio folder, then eslint on the twelve changed files and one `pnpm typecheck`, then Code Health. No reveal-sync run, and no `pnpm build`: R4-8 runs it. The pre-commit hook runs the full lint and `test:run`.
>
> **Verified (2026-10-07)** in `scratchpad/r4-rebase/sandbox-R4-5c`:
> - **Setup.** It is a copy of R4-5b's sandbox tree. R4-5b's code for the three files this task edits matches `R4-05b-form-frame.md`, line for line. On top of it: R4-5a's bridge line, and R-60's `constants.ts` block (French, `ScanLanguage = string`: R4-3a's, from R4-2a's Appendix A), which R4-5b's own files need.
>   - `node_modules` and `upstream/` are junctioned in. Vite's cache is in the sandbox, and `tsc -p` wrote no build info.
>   - The sandbox's `AdminStyles.tsx` is R4-5a's earlier draft (a standalone `.adm-ink-tile`). No jsdom test computes these classes; Step 12 is the visual check.
> - **Failing first.**
>   - `inkPicks.test.ts` fails to resolve `../inkPicks`.
>   - Against R4-5b's interim selects, `StudioPickers.test.tsx` gives `14 failed (14)` and `StudioForm.test.tsx` gives `2 failed | 18 passed (20)`. Each failure is `Unable to find an accessible element with the role "group" and name …`.
> - **Passing.** The three files give `Tests 49 passed (49)`: 15, 14 and 20. The studio folder gives `Test Files 6 passed (6)`, `Tests 72 passed (72)`.
> - **The tests bite.** 16 mutants, each killed:
>   - no second-ink clear on a primary pick;
>   - the primary left in the second row;
>   - Enchanted offered;
>   - an unlisted rarity dropped;
>   - "Ink ·" ignoring the second ink;
>   - decorative ink icons (unnamed tiles);
>   - RaritySymbol given "Super Rare" unlowered;
>   - no `aria-describedby`, and no `aria-labelledby`, on the group;
>   - no name after the dot;
>   - the hold starting closed;
>   - the inkwell's `aria-pressed` wrong;
>   - the second row always shown;
>   - Inkable after Cost;
>   - no ink tile pressed;
>   - None never pressed.
> - **Stories.** A probe rendered this task's 4 stories and R4-5b's 8 (now with the pickers) through `composeStories`. axe-core 4.13 found no violations in any of them. Colour contrast can't be computed in jsdom; Step 12 checks it.
> - **Types and lint.**
>   - `tsc -p tsconfig.app.json --noEmit` exits 0.
>   - All twelve files pass `pnpm exec eslint --max-warnings 0 --stdin --stdin-filename <repo path>`, run from the repo (jsx-a11y and the React Compiler rules included).
> - **Code Health.** CodeScene MCP 1.5.7 scores all twelve 10.0, with no findings. CodeScene ran on copies in a scratch `git init` folder.
> - **Not run.** No Storybook in a browser (Step 12).
> - **Re-checked by the verifier** in `scratchpad/r4-rebase/sandbox-v-R4-5c`, after R4-5b's file changed (its `StudioForm` doc comment, its Inkable hand-off and its stories, 2026-10-07 18:09).
>   - **The base.** R4-5b's files were written from its task file as it now stands, and R4-3a's `readiness.ts` from its task file. R4-5b's four studio tests passed there (`43 passed`) before this task.
>   - **This task.** Its blocks were applied by script from this file. Every "Current" matched once.
>   - **Results.** Step 2's and Step 4's failures repeat: Step 4 gives `16 failed | 18 passed (34)` with the group messages quoted. Step 8 gives `49 passed (49)`, and the studio folder `72 passed (72)` (`84` with the 12-story axe probe). `tsc -p tsconfig.app.json` exits 0, and the twelve files lint clean through the repo's eslint (`--stdin`).
>   - **Code Health and mutants.** CodeScene scores all twelve 10.0 with no findings. Ten mutants were each killed: the hold starting closed, no clear on a primary pick, the primary left in the second row, Enchanted offered, an unlisted rarity dropped, no `aria-describedby` on the group, decorative ink icons, RaritySymbol given the rarity unlowered, the second row always shown, and the inkwell's `aria-pressed` wrong.
>
> **Not taken.**
> - A `radiogroup` with arrow keys: the house pattern is `aria-pressed` buttons, as the Type row.
> - A hint on the second-ink group: R4-5b's `SINGLE_INK_HINT` already describes the switch.
> - `title` tooltips on the tiles: the label names the picked ink, and a title would repeat the accessible name as its description.
> - Pressing the picked second ink again to clear it: the switch clears it, as in the handoff.

### Task R4-5c: The pickers (ink, rarity, Inkable)

**Files:**
- Create `src/tools/studio/inkPicks.ts`: what each picker offers, and what a pick changes.
- Create in `src/tools/studio/components/`:
  - `PickerGroup.tsx`: a labelled `role="group"` of buttons, with its error;
  - `InkPicker.tsx`: `InkPicker` and `SecondInkPicker`, over one private `InkTiles`;
  - `RarityPicker.tsx` and `InkwellPicker.tsx`;
  - `Pickers.stories.tsx`.
- Modify in `src/tools/studio/components/` (R4-5b's files):
  - `InkRaritySection.tsx`: the three selects give way to the pickers. `DualInkSwitch` is kept as it is.
  - `TypeStatsSection.tsx`: the Inkable checkbox gives way to `InkwellPicker`.
  - `StudioForm.tsx`: one line, the switch's start state (R-75).
- Test, create: `src/tools/studio/__tests__/inkPicks.test.ts` and `src/tools/studio/__tests__/StudioPickers.test.tsx`.
- Test, modify: `src/tools/studio/__tests__/StudioForm.test.tsx`: one helper and two of R4-5b's cases.
- Unchanged:
  - `src/app-bridge.ts`, `src/theme/AdminStyles.tsx` and `src/tools/reveal/constants.ts`;
  - `formSections.ts` and `fieldWiring.ts`;
  - `RevealAdminForm.tsx` and its tests, which R4-6c deletes.

**Interfaces:**
- **Consumes:**
  ```ts
  // R4-5b: src/tools/studio/formSections.ts
  export const SINGLE_INK_HINT: string;      // "Pick the second ink. With none, the card publishes as single-ink."
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
    onChange: (patch: Partial<RevealCardForm>) => void}): DualInk;   // on = open || ink2 !== ''; off clears ink2
  // R4-5b: src/tools/studio/fieldWiring.ts
  export function fieldIds({name}: {name: string}): {control: string; label: string; hint: string; error: string};
  export function controlProps(spec: {name: string; errors: Readonly<Record<string, string>>; hint?: boolean}):
    {id: string; 'aria-invalid': true | undefined; 'aria-describedby': string | undefined};
  // R4-5b: StudioForm({form, errors, onChange, layout, locked?}), whose BODIES table renders InkRaritySection and
  //   TypeStatsSection with SectionProps; InkRaritySection.tsx's DualInkSwitch({form, dual})
  // R4-5a: src/tools/studio/studioStyles.ts: FIELD_LABEL, ERROR_TEXT, STUDIO_PANEL (CSSProperties)
  // R4-5a: AdminStyles' adm-pick-btn (aria-pressed: adm-card-btn's fill and border), adm-pick-btn.adm-ink-tile
  //   (48px; data-size="sm": 40px), adm-switch
  // R4-3a: src/tools/reveal/emptyForm.ts EMPTY_FORM; src/test/revealForm.ts revealForm(overrides) (a Ruby character, Rare)
  // src/tools/reveal: RevealCardForm (buildPreviewCard.ts:9-28); RARITIES (constants.ts:25-32, read only);
  //   validateRevealCardForm (the tests' and the story's errors)
  // the bridge, pin 16283a13:
  export const ALL_INKS: Ink[];   // Amber, Amethyst, Emerald, Ruby, Sapphire, Steel (theme.ts:206)
  export function InkIcon(props: {ink: Ink; size?: number; decorative?: boolean}); // <img alt={decorative ? '' : ink}>
  export function InkwellIcon(props: {value: 'inkable' | 'uninkable'; size?: number; decorative?: boolean}); // R4-5a
  export function RaritySymbol(props: {rarity: string; size: number}); // lowercase key; <img alt="" aria-hidden>; null if unknown
  ```
- **Produces:**
  ```ts
  // src/tools/studio/inkPicks.ts
  export const STUDIO_RARITIES: readonly string[];   // RARITIES less Enchanted (R-74): Common … Legendary
  export function rarityChoices(form: Pick<RevealCardForm, 'rarity'>): readonly string[];   // + an unlisted current rarity
  export function secondInks(form: Pick<RevealCardForm, 'ink'>): readonly Ink[];            // every ink but the primary
  export function primaryInkPatch(pick: {form: Pick<RevealCardForm, 'ink' | 'ink2'>; ink: Ink}): Partial<RevealCardForm>;
  export function inkName(form: Pick<RevealCardForm, 'ink' | 'ink2'>): string;              // "Amber" | "Amber / Ruby"

  // src/tools/studio/components: one props object each
  export type PickerLayout = 'tiles' | 'grid';
  export function PickerGroup(props: {name: string; label: string; detail?: string; layout: PickerLayout;
    errors: Readonly<Record<string, string>>; children: React.ReactNode});
  export function InkPicker(props: Pick<SectionProps, 'form' | 'errors' | 'onChange'>);
  export function SecondInkPicker(props: Pick<SectionProps, 'form' | 'errors' | 'onChange'>);
  export function RarityPicker(props: Pick<SectionProps, 'form' | 'errors' | 'onChange'>);
  export function InkwellPicker(props: Pick<SectionProps, 'form' | 'onChange'>);
  export function InkRaritySection(props: SectionProps);   // unchanged signature; now the pickers plus R4-5b's switch
  export function TypeStatsSection(props: SectionProps);   // unchanged signature; InkwellPicker after the Type row
  ```
- **What tests and later tasks can rely on in the DOM.**
  - `getByRole('group', {name: 'Ink'})`: six buttons named by ink, one pressed. Its error, an ink-block clash, is its accessible description.
  - `getByRole('group', {name: 'Second ink'})`: shown while the switch is on. Five buttons named by ink, the primary left out, none pressed until a pick.
  - `getByRole('group', {name: 'Rarity'})`: "None", then Common, Uncommon, Rare, Super Rare, Legendary, plus a form's unlisted rarity. Each rarity button holds one `aria-hidden` RaritySymbol `img`.
  - `getByRole('group', {name: 'Inkwell'})`: Inkable and Uninkable, inside the "Type & stats" region, between the Type group and the Cost box.
  - `getByRole('switch', {name: 'Dual-ink card'})`: R4-5b's. It is checked from the start for a form that mounts with a second ink.
  - `getByLabelText('Ink')` still finds the Ink group, through `aria-labelledby`.

- [ ] **Step 1: Check what this task builds on**

Run with the Bash tool from the repo root:
```bash
git branch --show-current
git -C upstream/inkweave rev-parse --short HEAD
grep -nE "^export \{(InkIcon|InkwellIcon|RaritySymbol)\}" src/app-bridge.ts
grep -oE "\.adm-pick-btn(\.adm-ink-tile)?(\[data-size=\"sm\"\])?\{|\.adm-switch\{" src/theme/AdminStyles.tsx
grep -nE "export const (FIELD_LABEL|ERROR_TEXT|STUDIO_PANEL)\b" src/tools/studio/studioStyles.ts
grep -nE "export function (fieldIds|controlProps)" src/tools/studio/fieldWiring.ts
grep -nE "export (interface (SectionProps|DualInk)\b|function dualInk|const SINGLE_INK_HINT)" src/tools/studio/formSections.ts
grep -nE "function DualInkSwitch|className=\"adm-select\"" src/tools/studio/components/InkRaritySection.tsx
grep -nE "const CHECK_ROW|Inkable \(can go in inkwell\)" src/tools/studio/components/TypeStatsSection.tsx
grep -n "useState(false)" src/tools/studio/components/StudioForm.tsx
grep -nE "selectOptions|getByLabelText\('Ink'\)" src/tools/studio/__tests__/StudioForm.test.tsx
grep -n "export const EMPTY_FORM" src/tools/reveal/emptyForm.ts
grep -n "export function revealForm" src/test/revealForm.ts
grep -n "'Enchanted'" src/tools/reveal/constants.ts
ls src/tools/studio/components
```
Expected:
- `feature/24-redesign-r4`, then `16283a1`.
- **The bridge:** three lines. `46:export {InkIcon} …`, then R4-5a's `48:export {InkwellIcon} …` (under its one-line comment), then `export {RaritySymbol} …`. That one is main's `:76`, now lower: R4-5a's two lines, R4-4d's loader comment (four more) and R4-5h's rewritten RaritySymbol comment (three more) sit above it, so expect `85:`. Only the three names matter.
- **`AdminStyles.tsx`:** `.adm-pick-btn{`, `.adm-pick-btn.adm-ink-tile{`, `.adm-pick-btn.adm-ink-tile[data-size="sm"]{` and `.adm-switch{`.
- **`studioStyles.ts`:** 3 lines.
- **`fieldWiring.ts`:** 2 lines.
- **`formSections.ts`:** 4 lines: `DualInk`, `SectionProps`, `dualInk` and `SINGLE_INK_HINT`.
- **`InkRaritySection.tsx`:** `27:function DualInkSwitch({form, dual}: Pick<SectionProps, 'form' | 'dual'>) {`, then three `className="adm-select"` lines (`:62`, `:77`, `:92`).
- **`TypeStatsSection.tsx`:** `27:const CHECK_ROW …` and `92:        Inkable (can go in inkwell)`.
- **`StudioForm.tsx`:** `46:  const [dualOpen, setDualOpen] = useState(false);`.
- **`StudioForm.test.tsx`:** `105:    const ink = screen.getByLabelText('Ink');` and `228:    await user.selectOptions(screen.getByLabelText('Second ink'), 'Steel');`.
- **`EMPTY_FORM` and `revealForm`:** one line each.
- **`constants.ts`:** `31:  'Enchanted',`.
- **`ls`:** R4-5b's eight files: `CardTextSection.tsx`, `Field.tsx`, `FormSection.tsx`, `IdentitySection.tsx`, `InkRaritySection.tsx`, `StudioForm.stories.tsx`, `StudioForm.tsx` and `TypeStatsSection.tsx`. There is no `InkPicker.tsx`.

What to do when the output differs:
- **The branch or the pin differs.** Stop: R4 is cut from main after the pin bump.
- **There is no `.adm-pick-btn.adm-ink-tile{` but a `.adm-ink-tile{` of its own.** That is R4-5a's earlier draft. Write `className="adm-ink-tile"` in Step 6's `InkTiles`, keep `data-size`, and tell the controller.
- **There is no `InkwellIcon` export.** R4-5a hasn't landed: stop.
- **`formSections.ts` has no `dual`, or `InkRaritySection.tsx` has no `DualInkSwitch`.** R4-5b drew the line elsewhere. Stop and tell the controller, because this task keeps the switch and doesn't build it.
- **R4-5b's lines sit elsewhere.** Every hunk below names its anchor text, so line numbers don't matter.
- **`EMPTY_FORM` or `revealForm` live elsewhere.** Change the imports in the two new test files and the story.
- **`'Enchanted'` is missing from `RARITIES`.** Someone changed a reveal-sync contract file. Stop and report.

On a fresh checkout, or after a pin bump, run `pnpm build:engine` once first: the tests reach the engine through the validator.

- [ ] **Step 2: Write the failing tests for the picker rules**

Create `src/tools/studio/__tests__/inkPicks.test.ts`:
```ts
import {describe, expect, it} from 'vitest';
import type {Ink} from 'inkweave-synergy-engine';
import {ALL_INKS} from '../../../app-bridge';
import {RARITIES} from '../../reveal/constants';
import {inkName, primaryInkPatch, rarityChoices, secondInks, STUDIO_RARITIES} from '../inkPicks';

describe('STUDIO_RARITIES (R-74)', () => {
  it('offers the five base rarities in order, and leaves RARITIES as reveal-sync reads it', () => {
    expect(STUDIO_RARITIES).toEqual(['Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary']);
    expect(RARITIES).toContain('Enchanted');
  });
});

describe('rarityChoices', () => {
  it.each([
    {rarity: '', choices: STUDIO_RARITIES},
    {rarity: 'Super Rare', choices: STUDIO_RARITIES},
    // A card that holds another rarity keeps it in view, after the studio's own.
    {rarity: 'Enchanted', choices: [...STUDIO_RARITIES, 'Enchanted']},
  ])('gives $choices.length buttons for rarity "$rarity"', ({rarity, choices}) => {
    expect(rarityChoices({rarity})).toEqual(choices);
  });
});

describe('secondInks (R-75)', () => {
  it.each(ALL_INKS)('leaves out the primary, %s', (ink) => {
    expect(secondInks({ink})).toEqual(ALL_INKS.filter((other) => other !== ink));
  });
});

describe('primaryInkPatch (R-75)', () => {
  it.each<{ink2: '' | Ink; patch: Partial<{ink: Ink; ink2: ''}>}>([
    {ink2: '', patch: {ink: 'Ruby'}},
    {ink2: 'Steel', patch: {ink: 'Ruby'}},
    // The new primary was the second ink: the card would hold Ruby twice.
    {ink2: 'Ruby', patch: {ink: 'Ruby', ink2: ''}},
  ])('picks Ruby over a second ink of "$ink2"', ({ink2, patch}) => {
    expect(primaryInkPatch({form: {ink: 'Amber', ink2}, ink: 'Ruby'})).toEqual(patch);
  });
});

describe('inkName (R-75)', () => {
  it.each<{ink2: '' | Ink; name: string}>([
    {ink2: '', name: 'Amber'},
    {ink2: 'Ruby', name: 'Amber / Ruby'},
  ])('reads "$name"', ({ink2, name}) => {
    expect(inkName({ink: 'Amber', ink2})).toBe(name);
  });
});
```

Run: `pnpm vitest run --project app src/tools/studio/__tests__/inkPicks.test.ts`
Expected: FAIL, with `Error: Failed to resolve import "../inkPicks" from "src/tools/studio/__tests__/inkPicks.test.ts". Does the file exist?`, `Test Files 1 failed (1)`, `Tests no tests`.

- [ ] **Step 3: Write `inkPicks.ts`**

Create `src/tools/studio/inkPicks.ts`:
```ts
import type {Ink} from 'inkweave-synergy-engine';
import {ALL_INKS} from '../../app-bridge';
import type {RevealCardForm} from '../reveal/buildPreviewCard';
import {RARITIES} from '../reveal/constants';

/*
 * The rules behind the studio's ink and rarity pickers (R4-5c): what each one
 * offers, and what a pick changes. The components are wiring over these.
 */

type InkFields = Pick<RevealCardForm, 'ink' | 'ink2'>;

/**
 * The rarities the studio offers (R-74): RARITIES less Enchanted, which is a
 * printing and never a card (variants.mjs stages printings). Epic and Iconic
 * were never in it (R-3). RARITIES itself is reveal-sync's (constants.ts, a
 * contract file), so it stays as it is.
 */
export const STUDIO_RARITIES: readonly string[] = RARITIES.filter((rarity) => rarity !== 'Enchanted');

/**
 * The rarity buttons after None: the studio's, plus the form's own rarity when
 * it is another one, so Edit never hides what a card holds. Picking any other
 * button drops the extra one, as an unlisted scan language's option does.
 */
export function rarityChoices(form: Pick<RevealCardForm, 'rarity'>): readonly string[] {
  const unlisted = form.rarity !== '' && !STUDIO_RARITIES.includes(form.rarity);
  return unlisted ? [...STUDIO_RARITIES, form.rarity] : STUDIO_RARITIES;
}

/** The Second ink row (R-75): every ink but the primary. */
export function secondInks(form: Pick<RevealCardForm, 'ink'>): readonly Ink[] {
  return ALL_INKS.filter((ink) => ink !== form.ink);
}

/** A primary ink pick (R-75). A primary equal to the second ink clears the second, so no card holds one ink twice. */
export function primaryInkPatch(pick: {form: InkFields; ink: Ink}): Partial<RevealCardForm> {
  return pick.form.ink2 === pick.ink ? {ink: pick.ink, ink2: ''} : {ink: pick.ink};
}

/** What follows "Ink ·" (R-75): "Amber", or "Amber / Ruby" for a dual-ink card. */
export function inkName(form: InkFields): string {
  return form.ink2 === '' ? form.ink : `${form.ink} / ${form.ink2}`;
}
```

Run: `pnpm vitest run --project app src/tools/studio/__tests__/inkPicks.test.ts`
Expected: PASS, `Tests 15 passed (15)`.

- [ ] **Step 4: Write the pickers' failing tests, and update R4-5b's two cases**

Create `src/tools/studio/__tests__/StudioPickers.test.tsx`. It renders the real `StudioForm`, wide, so every section is open and the switch's state is the one `StudioForm` lifts:
```tsx
import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {ALL_INKS, InkwellIcon, RaritySymbol} from '../../../app-bridge';
import {revealForm} from '../../../test/revealForm';
import type {RevealCardForm} from '../../reveal/buildPreviewCard';
import {EMPTY_FORM} from '../../reveal/emptyForm';
import {validateRevealCardForm} from '../../reveal/validateForm';
import {StudioForm} from '../components/StudioForm';
import {SINGLE_INK_HINT} from '../formSections';
import {STUDIO_RARITIES} from '../inkPicks';

interface HarnessProps {
  initial?: Partial<RevealCardForm>;
  /** Sees every patch the form sends. */
  onPatch?: (patch: Partial<RevealCardForm>) => void;
}

/** StudioForm, wide and controlled, validated on every render as the page does: the pickers' real home. */
function Harness({initial = {}, onPatch = () => {}}: HarnessProps) {
  const [form, setForm] = useState<RevealCardForm>({...EMPTY_FORM, ...initial});
  const onChange = (patch: Partial<RevealCardForm>) => {
    onPatch(patch);
    setForm((f) => ({...f, ...patch}));
  };
  const errors = validateRevealCardForm(form, new Set(), 'scan.png').errors;
  return <StudioForm form={form} errors={errors} onChange={onChange} layout="wide" />;
}

/** Queries inside the group its label names: "Ink", "Second ink", "Rarity", "Inkwell". */
const inGroup = (name: string) => within(screen.getByRole('group', {name}));
const PRESSED = {pressed: true} as const;
/** Buttons by name: a tile's is its InkIcon's alt text, a pick button's its text. */
const names = (buttons: HTMLElement[]) => buttons.map((button) => button.textContent || button.querySelector('img')?.alt);
const inkLabel = () => screen.getByText('Ink').parentElement;
const dualSwitch = () => screen.getByRole('switch', {name: 'Dual-ink card'});
/** The src RaritySymbol or InkwellIcon draws on its own, so no test names an asset path. */
const srcOf = (icon: React.ReactElement) => render(icon).container.querySelector('img')?.getAttribute('src');

describe('the ink picker (R-75)', () => {
  it('presses the chosen ink, each tile named by its icon, under "Ink · {name}"', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(names(inGroup('Ink').getAllByRole('button'))).toEqual(ALL_INKS);
    expect(names(inGroup('Ink').queryAllByRole('button', PRESSED))).toEqual(['Amber']);
    expect(inkLabel()).toHaveTextContent('Ink · Amber');

    await user.click(inGroup('Ink').getByRole('button', {name: 'Ruby'}));
    expect(names(inGroup('Ink').queryAllByRole('button', PRESSED))).toEqual(['Ruby']);
    expect(inkLabel()).toHaveTextContent('Ink · Ruby');
  });

  it('leaves the primary out of the second-ink row, and names both inks once one is picked', async () => {
    const user = userEvent.setup();
    render(<Harness initial={revealForm()} />);
    await user.click(dualSwitch());
    expect(names(inGroup('Second ink').getAllByRole('button'))).toEqual(ALL_INKS.filter((ink) => ink !== 'Ruby'));
    expect(names(inGroup('Second ink').queryAllByRole('button', PRESSED))).toEqual([]);

    await user.click(inGroup('Second ink').getByRole('button', {name: 'Sapphire'}));
    expect(names(inGroup('Second ink').queryAllByRole('button', PRESSED))).toEqual(['Sapphire']);
    expect(inkLabel()).toHaveTextContent('Ink · Ruby / Sapphire');
  });

  it('clears the second ink when the primary takes it, and keeps the switch on for the next (R-75)', async () => {
    const user = userEvent.setup();
    const onPatch = vi.fn();
    render(<Harness initial={revealForm({ink2: 'Steel'})} onPatch={onPatch} />);
    expect(dualSwitch()).toBeChecked();

    await user.click(inGroup('Ink').getByRole('button', {name: 'Steel'}));
    expect(onPatch).toHaveBeenLastCalledWith({ink: 'Steel', ink2: ''});
    expect(names(inGroup('Ink').queryAllByRole('button', PRESSED))).toEqual(['Steel']);
    expect(inkLabel()).toHaveTextContent('Ink · Steel');
    expect(dualSwitch()).toBeChecked();
    expect(dualSwitch()).toHaveAccessibleDescription(SINGLE_INK_HINT);
    expect(names(inGroup('Second ink').getAllByRole('button'))).not.toContain('Steel');
    expect(names(inGroup('Second ink').queryAllByRole('button', PRESSED))).toEqual([]);
  });

  it('ties the second ink’s error to its group', () => {
    // Only a hand edit of the file can hold this: the tiles never offer the primary twice.
    render(<Harness initial={revealForm({ink2: 'Ruby'})} />);
    const secondInk = screen.getByRole('group', {name: 'Second ink'});
    expect(secondInk).toHaveAccessibleDescription('Second ink must differ from the first');
  });
});

describe('the rarity picker (R-74, R-83)', () => {
  it('offers None, then the five base rarities: no Enchanted, Epic or Iconic', () => {
    render(<Harness />);
    expect(names(inGroup('Rarity').getAllByRole('button'))).toEqual(['None', ...STUDIO_RARITIES]);
    expect(names(inGroup('Rarity').queryAllByRole('button', PRESSED))).toEqual(['None']);
    expect(screen.getByRole('group', {name: 'Rarity'})).not.toHaveAttribute('aria-describedby');
  });

  it.each(STUDIO_RARITIES)('draws %s through RaritySymbol, hidden from the button’s name', (rarity) => {
    const glyph = srcOf(<RaritySymbol rarity={rarity.toLowerCase()} size={18} />);
    render(<Harness />);
    const img = inGroup('Rarity').getByRole('button', {name: rarity}).querySelector('img');
    expect(glyph).toBeTruthy();
    expect(img).toHaveAttribute('src', glyph);
    expect(img).toHaveAttribute('aria-hidden', 'true');
  });

  it('picks a rarity, and None clears it', async () => {
    const user = userEvent.setup();
    const onPatch = vi.fn();
    render(<Harness onPatch={onPatch} />);

    await user.click(inGroup('Rarity').getByRole('button', {name: 'Super Rare'}));
    expect(onPatch).toHaveBeenLastCalledWith({rarity: 'Super Rare'});
    expect(names(inGroup('Rarity').queryAllByRole('button', PRESSED))).toEqual(['Super Rare']);

    await user.click(inGroup('Rarity').getByRole('button', {name: 'None'}));
    expect(onPatch).toHaveBeenLastCalledWith({rarity: ''});
    expect(names(inGroup('Rarity').queryAllByRole('button', PRESSED))).toEqual(['None']);
  });

  it("keeps a card's unlisted rarity in view, pressed, until another is picked", async () => {
    const user = userEvent.setup();
    render(<Harness initial={revealForm({rarity: 'Enchanted'})} />);
    expect(names(inGroup('Rarity').queryAllByRole('button', PRESSED))).toEqual(['Enchanted']);

    await user.click(inGroup('Rarity').getByRole('button', {name: 'Legendary'}));
    expect(inGroup('Rarity').queryByRole('button', {name: 'Enchanted'})).toBeNull();
  });
});

describe('the Inkable buttons', () => {
  it('sit in Type & stats between the type and the cost, each with its InkwellIcon', () => {
    render(<Harness />);
    const section = within(screen.getByRole('region', {name: 'Type & stats'}));
    const type = section.getByRole('group', {name: 'Type'});
    const inkwell = section.getByRole('group', {name: 'Inkwell'});
    const cost = section.getByLabelText('Cost');
    // The handoff's order (dc.html:224-226): the type, then the inkwell, then the cost.
    expect(type.compareDocumentPosition(inkwell) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(inkwell.compareDocumentPosition(cost) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const uninkable = srcOf(<InkwellIcon value="uninkable" />);
    expect(inGroup('Inkwell').getByRole('button', {name: 'Uninkable'}).querySelector('img')).toHaveAttribute('src', uninkable);
  });

  it("press the form's inkwell, and set it", async () => {
    const user = userEvent.setup();
    const onPatch = vi.fn();
    render(<Harness onPatch={onPatch} />);
    expect(names(inGroup('Inkwell').queryAllByRole('button', PRESSED))).toEqual(['Inkable']);

    await user.click(inGroup('Inkwell').getByRole('button', {name: 'Uninkable'}));
    expect(onPatch).toHaveBeenLastCalledWith({inkwell: false});
    expect(names(inGroup('Inkwell').queryAllByRole('button', PRESSED))).toEqual(['Uninkable']);
  });
});
```
The file stubs nothing (no `vi.stubEnv` or `vi.stubGlobal`), so it leaves nothing behind in the worker. `vi.fn()` spies are made per test.

In `src/tools/studio/__tests__/StudioForm.test.tsx` (R4-5b's), make three edits. `within` is imported already (line 1).

First, the helpers (line 41). Current:
```tsx
/** A narrow section's toggle, by the start of its name: its title. */
const toggle = (title: RegExp) => screen.getByRole('button', {name: title});
```
New:
```tsx
/** A narrow section's toggle, by the start of its name: its title. */
const toggle = (title: RegExp) => screen.getByRole('button', {name: title});
/** The second-ink tiles (R4-5c), shown while Dual-ink is on. */
const secondInk = () => screen.getByRole('group', {name: 'Second ink'});
```

Second, in "marks a filled value that fails, names its section's error, and still hides a blank field's" (lines 105-106). Current:
```tsx
    const ink = screen.getByLabelText('Ink');
    expect(ink).toHaveAttribute('aria-invalid', 'true');
```
New:
```tsx
    // The ink is a group of tiles (R4-5c): its error describes it. A group takes no aria-invalid.
    const ink = screen.getByRole('group', {name: 'Ink'});
```
The next line, `expect(ink).toHaveAccessibleDescription(expect.stringMatching(new RegExp(\`^#${amber} is in the Amber block\`)));`, stays. With it, the case is now the outline's "the ink error describes the Ink group".

Third, in "shows Second ink only while the switch is on, and turning it off clears the second ink" (lines 228-234). Current:
```tsx
    await user.selectOptions(screen.getByLabelText('Second ink'), 'Steel');
    expect(dual).not.toHaveAccessibleDescription();

    await user.click(dual);
    expect(screen.queryByLabelText('Second ink')).toBeNull();
    await user.click(dual);
    expect(screen.getByLabelText('Second ink')).toHaveValue('');
```
New:
```tsx
    await user.click(within(secondInk()).getByRole('button', {name: 'Steel'}));
    expect(dual).not.toHaveAccessibleDescription();

    await user.click(dual);
    expect(screen.queryByRole('group', {name: 'Second ink'})).toBeNull();
    await user.click(dual);
    expect(within(secondInk()).queryAllByRole('button', {pressed: true})).toHaveLength(0);
```
Line 223's `expect(screen.queryByLabelText('Second ink')).toBeNull();`, before the switch goes on, stays: the group's label names it once it shows.

Run: `pnpm vitest run --project app src/tools/studio/__tests__/StudioPickers.test.tsx src/tools/studio/__tests__/StudioForm.test.tsx`
Expected: FAIL.
- `StudioPickers.test.tsx`: `14 failed (14)`.
- `StudioForm.test.tsx`: `2 failed | 18 passed (20)`, the two cases just edited.
- Together: `Tests 16 failed | 18 passed (34)`. Every failure reads `TestingLibraryElementError: Unable to find an accessible element with the role "group" and name …`, for "Ink" (3), "Second ink" (3), "Rarity" (8) or "Inkwell" (2): R4-5b's selects and checkbox are no such groups.

- [ ] **Step 5: Write `PickerGroup.tsx`**

Create `src/tools/studio/components/PickerGroup.tsx`:
```tsx
import {SPACING} from '../../../app-bridge';
import {ADMIN_COLORS} from '../../../theme/adminTheme';
import {controlProps, fieldIds} from '../fieldWiring';
import {ERROR_TEXT, FIELD_LABEL} from '../studioStyles';

/** How a picker lays out its buttons: ink tiles wrap in a row, and rarities fill a grid. */
export type PickerLayout = 'tiles' | 'grid';

const LAYOUTS: Readonly<Record<PickerLayout, React.CSSProperties>> = {
  tiles: {display: 'flex', flexWrap: 'wrap', gap: SPACING.xs},
  // The handoff's rarity grid (README §7): 112px a button at the least.
  grid: {display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))', gap: SPACING.xs},
};

// The handoff spaces a picker's label 8px above its buttons.
const PICKER: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: SPACING.sm, minWidth: 0};
/** The picked name after the label, in the text colour (dc.html:214). */
const DETAIL: React.CSSProperties = {color: ADMIN_COLORS.text};

interface PickerGroupProps {
  /** The form key the group sets. Its label and error take Field's ids (fieldIds): field-{name}-label, -error. */
  name: string;
  /** The visible label, which alone names the group: "Ink", "Second ink", "Rarity". */
  label: string;
  /** Printed after the label (" · Amber / Ruby"), outside the group's name, which stays the label. */
  detail?: string;
  layout: PickerLayout;
  /** The errors to show (visibleErrors', R-72). errors[name] prints under the group and describes it. */
  errors: Readonly<Record<string, string>>;
  children: React.ReactNode;
}

/**
 * Field's counterpart for a set of aria-pressed buttons. A group isn't a
 * labelable element, so its visible label names it through aria-labelledby,
 * and its error, printed under it, describes it through aria-describedby
 * (controlProps' rule: every validator message next to its control). The
 * group takes no aria-invalid, which ARIA 1.2 doesn't allow on a group: the
 * described error and the section's red dot carry it.
 */
export function PickerGroup({name, label, detail, layout, errors, children}: PickerGroupProps) {
  const ids = fieldIds({name});
  const error = errors[name];
  return (
    <div style={PICKER}>
      <span style={FIELD_LABEL}>
        <span id={ids.label}>{label}</span>
        {detail && (
          <>
            {' · '}
            <span style={DETAIL}>{detail}</span>
          </>
        )}
      </span>
      <div
        role="group"
        aria-labelledby={ids.label}
        aria-describedby={controlProps({name, errors})['aria-describedby']}
        style={LAYOUTS[layout]}>
        {children}
      </div>
      {error && (
        <p id={ids.error} style={ERROR_TEXT}>
          {error}
        </p>
      )}
    </div>
  );
}
```
The ids are page-global, as `Field`'s are (`field-ink-label`, `field-ink-error`). R4-5b's hand-off already counts on one `StudioForm` mounting at a time.

- [ ] **Step 6: Write the ink, rarity and inkwell pickers**

Create `src/tools/studio/components/InkPicker.tsx`:
```tsx
import type {Ink} from 'inkweave-synergy-engine';
import {ALL_INKS, InkIcon} from '../../../app-bridge';
import type {SectionProps} from '../formSections';
import {inkName, primaryInkPatch, secondInks} from '../inkPicks';
import {PickerGroup} from './PickerGroup';

/** The handoff's icon sizes: 28px in a 48px ink tile, 22px in a 40px second-ink tile (data-size="sm"). */
const ICON_SIZE = {full: 28, small: 22} as const;

type InkPickerProps = Pick<SectionProps, 'form' | 'errors' | 'onChange'>;

interface InkTilesProps {
  inks: readonly Ink[];
  /** The picked ink: '' (no second ink yet) presses no tile. */
  value: Ink | '';
  size: keyof typeof ICON_SIZE;
  onPick: (ink: Ink) => void;
}

/**
 * One aria-pressed tile per ink (R-75). The InkIcon names the ink (decorative
 * false), so the tile's name is the ink's. adm-ink-tile sizes an adm-pick-btn,
 * whose pressed look is admin's one gold (adm-card-btn's), never the ink's
 * colour.
 */
function InkTiles({inks, value, size, onPick}: InkTilesProps) {
  return inks.map((ink) => (
    <button
      key={ink}
      type="button"
      className="adm-pick-btn adm-ink-tile"
      data-size={size === 'small' ? 'sm' : undefined}
      aria-pressed={ink === value}
      onClick={() => onPick(ink)}>
      <InkIcon ink={ink} size={ICON_SIZE[size]} decorative={false} />
    </button>
  ));
}

/**
 * The card's ink (R-75): six tiles under "Ink · {name}". The group's name is
 * "Ink" alone; the name after the dot follows the picks. A primary equal to
 * the second ink clears the second. The ink error (an ink-block clash)
 * describes the group.
 */
export function InkPicker({form, errors, onChange}: InkPickerProps) {
  return (
    <PickerGroup name="ink" label="Ink" detail={inkName(form)} layout="tiles" errors={errors}>
      <InkTiles inks={ALL_INKS} value={form.ink} size="full" onPick={(ink) => onChange(primaryInkPatch({form, ink}))} />
    </PickerGroup>
  );
}

/** The second ink, while the Dual-ink switch is on: smaller tiles, every ink but the primary (R-75). */
export function SecondInkPicker({form, errors, onChange}: InkPickerProps) {
  return (
    <PickerGroup name="ink2" label="Second ink" layout="tiles" errors={errors}>
      <InkTiles inks={secondInks(form)} value={form.ink2} size="small" onPick={(ink2) => onChange({ink2})} />
    </PickerGroup>
  );
}
```

Create `src/tools/studio/components/RarityPicker.tsx`:
```tsx
import {RaritySymbol} from '../../../app-bridge';
import type {SectionProps} from '../formSections';
import {rarityChoices} from '../inkPicks';
import {PickerGroup} from './PickerGroup';

/** The handoff's 18px glyph in a 34px button. */
const SYMBOL_SIZE = 18;

/**
 * The rarity: None first, which clears it (rarity stays optional), then the
 * studio's rarities (R-74), each with its glyph through RaritySymbol (R-83).
 * RaritySymbol is aria-hidden, so a button's name is its text. The validator
 * checks no rarity, so errors never holds one.
 */
export function RarityPicker({form, errors, onChange}: Pick<SectionProps, 'form' | 'errors' | 'onChange'>) {
  return (
    <PickerGroup name="rarity" label="Rarity" layout="grid" errors={errors}>
      <button type="button" className="adm-pick-btn" aria-pressed={form.rarity === ''} onClick={() => onChange({rarity: ''})}>
        None
      </button>
      {rarityChoices(form).map((rarity) => (
        <button
          key={rarity}
          type="button"
          className="adm-pick-btn"
          aria-pressed={form.rarity === rarity}
          onClick={() => onChange({rarity})}>
          <RaritySymbol rarity={rarity.toLowerCase()} size={SYMBOL_SIZE} />
          {rarity}
        </button>
      ))}
    </PickerGroup>
  );
}
```

Create `src/tools/studio/components/InkwellPicker.tsx`:
```tsx
import {InkwellIcon, SPACING} from '../../../app-bridge';
import type {SectionProps} from '../formSections';

/** Each button: the form's inkwell value, the app's icon for it, and its name. */
const OPTIONS = [
  {inkwell: true, icon: 'inkable', label: 'Inkable'},
  {inkwell: false, icon: 'uninkable', label: 'Uninkable'},
] as const;

const PAIR: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: SPACING.xs};

/**
 * Inkable or Uninkable: two aria-pressed buttons with the app's InkwellIcon,
 * a view over the form's inkwell (no new form state: the reveal-sync
 * contract). The buttons name themselves, so the group has no visible label,
 * and "Inkwell" names it for assistive tech, as SegmentedControl's ariaLabel
 * names the Type row above it.
 */
export function InkwellPicker({form, onChange}: Pick<SectionProps, 'form' | 'onChange'>) {
  return (
    <div role="group" aria-label="Inkwell" style={PAIR}>
      {OPTIONS.map((option) => (
        <button
          key={option.icon}
          type="button"
          className="adm-pick-btn"
          aria-pressed={form.inkwell === option.inkwell}
          onClick={() => onChange({inkwell: option.inkwell})}>
          <InkwellIcon value={option.icon} />
          {option.label}
        </button>
      ))}
    </div>
  );
}
```
`InkwellIcon` draws at its default 20px, the handoff's size (`dc.html:225`).

- [ ] **Step 7: Wire the pickers into R4-5b's sections and `StudioForm`**

Replace the whole of `src/tools/studio/components/InkRaritySection.tsx`. `SWITCH_ROW`, `SWITCH_LABEL` and `DualInkSwitch` are R4-5b's, word for word. Only the imports, the section's doc comment and its body change:
```tsx
import {useId} from 'react';
import {SPACING} from '../../../app-bridge';
import {ADMIN_COLORS, ADMIN_TYPE} from '../../../theme/adminTheme';
import {SINGLE_INK_HINT, type SectionProps} from '../formSections';
import {HINT} from '../studioStyles';
import {InkPicker, SecondInkPicker} from './InkPicker';
import {RarityPicker} from './RarityPicker';

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
 * The ink, the Dual-ink switch and the second ink, and the rarity: the
 * handoff's pickers (R-74, R-75, R-83). Each is a view over the form (ink,
 * ink2, rarity), and the switch's state is StudioForm's (SectionProps.dual).
 */
export function InkRaritySection({form, errors, onChange, dual}: SectionProps) {
  return (
    <>
      <InkPicker form={form} errors={errors} onChange={onChange} />
      <DualInkSwitch form={form} dual={dual} />
      {dual.on && <SecondInkPicker form={form} errors={errors} onChange={onChange} />}
      <RarityPicker form={form} errors={errors} onChange={onChange} />
    </>
  );
}
```
The `Ink` type, `ALL_INKS`, `RARITIES` and `Field` imports go with the selects. `FormSection`'s body lays the four out in a column with a 12px gap.

In `src/tools/studio/components/TypeStatsSection.tsx`, make four edits.

First, the imports (lines 5-7). Current:
```tsx
import {COST_SLIDER_MAX, costSlider, type SectionProps} from '../formSections';
import {FIELD_LABEL} from '../studioStyles';
import {Field, TextField} from './Field';
```
New:
```tsx
import {COST_SLIDER_MAX, costSlider, type SectionProps} from '../formSections';
import {Field, TextField} from './Field';
import {InkwellPicker} from './InkwellPicker';
```

Second, delete line 27, which nothing else uses:
```tsx
const CHECK_ROW: React.CSSProperties = {...FIELD_LABEL, display: 'inline-flex', alignItems: 'center', gap: SPACING.sm};
```
`SPACING` stays imported: `COST_ROW` and `STATS_ROW` use it.

Third, the section's doc comment (lines 74-78). Current:
```tsx
/**
 * The card's type, whether it is inkable, its cost and the stats its type
 * prints (STAT_FIELDS). R4-5c replaces the Inkable checkbox with the
 * handoff's Inkable and Uninkable buttons, first in the section.
 */
```
New:
```tsx
/**
 * The card's type, then Inkable or Uninkable, its cost and the stats its type
 * prints (STAT_FIELDS), in the handoff's order (dc.html:224-227).
 */
```

Fourth, the checkbox (lines 90-93). Current:
```tsx
      <label style={CHECK_ROW}>
        <input type="checkbox" checked={form.inkwell} onChange={(e) => onChange({inkwell: e.target.checked})} />
        Inkable (can go in inkwell)
      </label>
```
New:
```tsx
      <InkwellPicker form={form} onChange={onChange} />
```

In `src/tools/studio/components/StudioForm.tsx` (line 46). Current:
```tsx
  const [dualOpen, setDualOpen] = useState(false);
```
New:
```tsx
  // Open from the start for a card that has a second ink (R-75): a primary pick
  // that takes the second ink clears it, and the switch stays on for the next.
  const [dualOpen, setDualOpen] = useState(() => form.ink2 !== '');
```
The doc comment above `StudioForm` already says "Edit keys the form by card (R-46), which resets both; New keeps them." That still holds: each Edit card re-runs the start state, and New's form, which first mounts on `EMPTY_FORM`, starts closed. After a mode switch remounts it on a kept draft with a second ink (R-57), it starts open.

- [ ] **Step 8: Run them to PASS**

Run: `pnpm vitest run --project app src/tools/studio/__tests__/inkPicks.test.ts src/tools/studio/__tests__/StudioPickers.test.tsx src/tools/studio/__tests__/StudioForm.test.tsx`
Expected: PASS, `Test Files 3 passed (3)`, `Tests 49 passed (49)`:
- 15 in `inkPicks.test.ts`;
- 14 in `StudioPickers.test.tsx`, with the five glyph rows counted;
- 20 in `StudioForm.test.tsx`.

React logs no "not wrapped in act" warning.

Then run the studio folder, to see that R4-5b's other tests and the earlier studio modules hold: `pnpm vitest run --project app src/tools/studio`
Expected: every file passes. In the sandbox, with only R4-3a's, R4-5b's and this task's studio tests present, it gave `Test Files 6 passed (6)` and `Tests 72 passed (72)`. Here the earlier R4 tasks' studio tests are in the folder too, so the counts are higher.

- [ ] **Step 9: Stories**

Create `src/tools/studio/components/Pickers.stories.tsx`, titled `Admin/Publish/Card studio/Pickers`. Each story renders the Ink & rarity section's body and the Inkable buttons with real state, wired as `StudioForm` wires them, in the narrow form column. The errors are the validator's, through R-72:
```tsx
import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {SPACING} from '../../../app-bridge';
import {revealForm} from '../../../test/revealForm';
import type {RevealCardForm} from '../../reveal/buildPreviewCard';
import {EMPTY_FORM} from '../../reveal/emptyForm';
import {validateRevealCardForm} from '../../reveal/validateForm';
import {dualInk, type SectionProps} from '../formSections';
import {visibleErrors} from '../readiness';
import {STUDIO_PANEL} from '../studioStyles';
import {InkRaritySection} from './InkRaritySection';
import {InkwellPicker} from './InkwellPicker';

// The narrow form column (README §7: 300 to 400px), on a studio panel.
const FRAME: React.CSSProperties = {
  ...STUDIO_PANEL,
  display: 'flex',
  flexDirection: 'column',
  gap: SPACING.md,
  maxWidth: 400,
  padding: SPACING.lg,
};

/**
 * The Ink & rarity section's body, then the Inkable buttons, with real state
 * wired as StudioForm wires it: the shown errors are the validator's through
 * R-72, and the Dual-ink switch's state is held here.
 */
function Pickers({start}: {start: RevealCardForm}) {
  const [form, setForm] = useState(start);
  const [open, setOpen] = useState(() => start.ink2 !== '');
  const onChange = (patch: Partial<RevealCardForm>) => setForm((f) => ({...f, ...patch}));
  const section: SectionProps = {
    form,
    errors: visibleErrors(form, validateRevealCardForm(form, new Set(), 'scan.png').errors),
    onChange,
    layout: 'narrow',
    locked: new Set(),
    dual: dualInk({open, setOpen, form, onChange}),
  };
  return (
    <div style={FRAME}>
      <InkRaritySection {...section} />
      <InkwellPicker form={form} onChange={onChange} />
    </div>
  );
}

const meta: Meta<typeof Pickers> = {
  title: 'Admin/Publish/Card studio/Pickers',
  component: Pickers,
};
export default meta;
type Story = StoryObj<typeof Pickers>;

/** A fresh New reveal: Amber, no rarity, inkable. Turn Dual-ink on for the second-ink row and its hint. */
export const Fresh: Story = {args: {start: EMPTY_FORM}};

/** A dual-ink card: the switch starts on. Pick Sapphire as the primary: the second ink clears and the switch stays on (R-75). */
export const DualInk: Story = {args: {start: revealForm({ink2: 'Sapphire', rarity: 'Super Rare'})}};

/** The Amber default on a Ruby number: the ink-block clash describes the Ink group. Pick Ruby to clear it. */
export const InkBlockClash: Story = {args: {start: revealForm({ink: 'Amber'})}};

/** An Edit card holding a rarity the studio doesn't offer (R-74): it stays in view, pressed, until another is picked. */
export const UnlistedRarity: Story = {args: {start: revealForm({rarity: 'Enchanted', inkwell: false})}};
```
`revealForm` comes from `src/test/revealForm.ts`, which R4-3a made for tests and stories. R4-5b's `Admin/Publish/Card studio/Form` stories need no change: their `DualInk` story now shows the tiles.

- [ ] **Step 10: Lint the changed files and typecheck once**

Run:
```bash
pnpm exec eslint --max-warnings 0 src/tools/studio/inkPicks.ts src/tools/studio/components/PickerGroup.tsx src/tools/studio/components/InkPicker.tsx src/tools/studio/components/RarityPicker.tsx src/tools/studio/components/InkwellPicker.tsx src/tools/studio/components/InkRaritySection.tsx src/tools/studio/components/TypeStatsSection.tsx src/tools/studio/components/StudioForm.tsx src/tools/studio/components/Pickers.stories.tsx src/tools/studio/__tests__/inkPicks.test.ts src/tools/studio/__tests__/StudioPickers.test.tsx src/tools/studio/__tests__/StudioForm.test.tsx
```
Expected: no output, exit 0. jsx-a11y accepts `role="group"` with `aria-labelledby`, and `role="switch"` on `input[type=checkbox]` with no `aria-checked`. The React Compiler rule sees no memo.

Run: `pnpm typecheck`
Expected: exit 0. It covers the story's `SectionProps` literal and the tests' `Partial<RevealCardForm>` patches.

No reveal-sync run: this task touches no contract file and no bridge line. No `pnpm lint` or `pnpm test:run`: the pre-commit hook runs both.

- [ ] **Step 11: Code Health**

Run CodeScene's `code_health_review` on each of the twelve changed files, the list in Step 10.

Expected: 10.0 each, with no findings (MCP 1.5.7 gave that in the sandbox).

Check the hand counts in the re-base notes too:
- 0 primitive parameters in `inkPicks.ts` and in every component;
- 1 of 4 in `StudioPickers.test.tsx`, its `inGroup(name)`.

A helper that takes a group's name and a button's name would put the test file at 2 of 5 (40%). Keep such lookups inline, as `inGroup('Ink').getByRole('button', {name: 'Ruby'})`. The PR gate is stricter than the local tool, so R4-8 runs `analyze_change_set` before the push.

- [ ] **Step 12: Look at it in Storybook**

Run: `pnpm storybook`, then open http://localhost:6007 → `Admin/Publish/Card studio/Pickers`.

`Fresh`:
- Six 48px ink tiles, Amber in gold, under "Ink · Amber", with Amber in the text colour.
- The Dual-ink switch is off. Turn it on: its track golds, the hint shows, and five 40px tiles appear, with no Amber. Pick Ruby: the label reads "Ink · Amber / Ruby" and the hint goes.
- The rarity grid holds None (gold), then five glyph-and-name buttons, wrapping at the 400px column.
- Under them, Inkable (gold) and Uninkable split the row.

`DualInk`:
- The switch starts on, with Sapphire picked in the second row.
- Pick Sapphire as the primary: the second ink clears, the switch stays on and the hint shows.

`InkBlockClash`: the clash message sits under the tiles in red. Pick Ruby and it goes.

`UnlistedRarity`:
- Enchanted shows last, after Legendary, pressed, with its glyph.
- Pick Rare: Enchanted goes.
- Uninkable is pressed.

Every story:
- Tab through the controls. Each tile and button shows the gold ring 2px out, and the switch takes Space.
- Storybook's Accessibility panel reports no violations, contrast included: the muted button text, the pressed text on the gold tint, and the hint.

Then open `Admin/Publish/Card studio/Form` → `NewReveal` and `NewRevealNarrow`:
- The ink section sits in its panel at both widths.
- In Type & stats, the Inkable row sits between the Type row and the Cost box.
- R4-5b's `DualInk` check now reads: turn the switch on, and Second ink shows its tiles with none pressed, where it read None before.

Stop the server afterwards. If no browser is available to the implementer, record each check as pending with the owner, as R1-2's Step 11 did, and say so in the report.

- [ ] **Step 13: Commit**, with the Bash tool and only after the owner approves. Use two separate calls, so the commit command starts with `USER_APPROVED=1`:

```bash
git add src/tools/studio/inkPicks.ts src/tools/studio/components/PickerGroup.tsx src/tools/studio/components/InkPicker.tsx src/tools/studio/components/RarityPicker.tsx src/tools/studio/components/InkwellPicker.tsx src/tools/studio/components/InkRaritySection.tsx src/tools/studio/components/TypeStatsSection.tsx src/tools/studio/components/StudioForm.tsx src/tools/studio/components/Pickers.stories.tsx src/tools/studio/__tests__/inkPicks.test.ts src/tools/studio/__tests__/StudioPickers.test.tsx src/tools/studio/__tests__/StudioForm.test.tsx
```

Then run CodeScene's `pre_commit_code_health_safeguard`, and go on only when it passes.

```bash
USER_APPROVED=1 git commit -m "feat(studio): add the ink, rarity and inkwell pickers (#24)"
```

Never pipe the commit, and never pass `--no-verify`. Husky's pre-commit runs the full lint and `test:run`. If Vitest fails to start its workers under load, stop this session's preview servers, wait out other sessions' runs, and retry.

### Hand-offs from R4-5c

- **The R4 header (the controller, at the plan commit).**
  - Contract addition 12 already credits the Dual-ink switch and its lifted state to R4-5b. Its R4-5c lines say "inkPicks.ts holds the rules: InkPicker and SecondInkPicker …", which reads as if the components lived there. Reword them to name `inkPicks.ts`'s exports (`STUDIO_RARITIES`, `rarityChoices`, `secondInks`, `primaryInkPatch`, `inkName`), then the components: `PickerGroup`, `InkPicker`, `SecondInkPicker`, `RarityPicker` and `InkwellPicker`.
  - Addition 2's rarity line holds as written: `<RaritySymbol rarity={r.toLowerCase()} …/>`.
- **R4-6a (the page and New reveal).**
  - New reveal's `StudioForm` stays mounted across a publish. So after `useRevealAdmin` resets the form to `EMPTY_FORM` (its `setForm(EMPTY_FORM)`, main's `useRevealAdmin.ts:128`, which R4-3a and R4-3b move up), the switch keeps its hold (on, with the single-ink hint, if the last card was dual-ink), and the accordion keeps its open section.
  - If a publish should reset both, key New reveal's form by the last commit (for example `key={ctrl.result?.commitUrl ?? 'new'}`). R4-6a decides, alongside R-59's focus after Publish.
- **R4-6b (the Edit pane).**
  - Keying the Edit view by card id (R-46) re-runs the switch's start state per card.
  - A "Load it again" re-seed (R-68) keeps the form mounted. A fresh entry that gained a second ink still turns the switch on, through `dualInk`'s `ink2` check.
- **R4-6c (retiring `/reveal`).** With this task, every case in `RevealAdminForm.test.tsx` is ported: four once R4-3a adds its French one, as R4-5b's hand-off counts them. R4-5b ports the three originals and covers French. The outline's ink-group half lands here, in this task's edit of R4-5b's "marks a filled value that fails…". The file can go with `RevealAdminForm.tsx`.
- **R4-8 ("R4 as built").** Record these as departures from the outline and the hand-offs:
  - the Inkable buttons sit after the Type row and before Cost (the prototype's order, `dc.html:224-226`); README §7's "first in the row" names no row;
  - `StudioForm`'s switch hold starts open for a form with a second ink (R-75), a one-line change to R4-5b's file;
  - an unlisted rarity stays in view as its own pressed button;
  - the picker groups carry no `aria-invalid`: their error describes them;
  - the ink group is named "Ink" alone, with " · {name}" outside its name;
  - `PickerGroup` is `Field`'s counterpart for button groups.
