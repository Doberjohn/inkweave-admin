> Part of [R: Admin redesign](../R-redesign.md), phase R4 ([R4-card-studio.md](R4-card-studio.md)). Read the main plan's decisions (R-57 to R-91 for R4), corrections, global constraints and shared interfaces, then the R4 header, first.

> **Re-base notes (R4-2a, 2026-10-07).** Re-based from the 2026-10-01 outline's Task R4-2 (`R4-card-studio.md:206-323`) onto main @ `e5e5029` (R1 to R3 merged, plus the app-pin bump), pin `16283a13`, decisions R-57 to R-91 (R-60, R-61 and R-65 bear on this task), the R4 audit (`r4-audit-full.json`, entry "R4-2"; `r4-audit-synth.md`, "R4-2") and the R4 header's contract addition 10 and "Test isolation and fixtures". The audit read the old pin `bc877e1`; every app fact below was re-checked at `16283a13`. What changed and why:
> 1. **The split.** R4-2 is now two tasks. This one, R4-2a, is the Edit form model (`cardEdit.ts`) plus the studio's shared fixtures (`studioFixtures.ts`, the header's "Shared fixtures"). R4-2b takes `cardTag`, `searchCards`, `changeRows`, `ChangeRow`, `SearchRow` and `scanLanguages.ts`. This task creates four files and modifies none.
> 2. **`editKindOf` fails closed (R-65).** It returns the header's `CardKind`, `{kind: 'fields'}` or `{kind: 'image', reason}`, in place of the outline's bare `'fields' | 'image'`. It takes `LorcanaJSONCard | null`, because R4-4b's draft holds `null` for a card with no entry.
>    - **Fields** only for an entry of `REVEAL_SET_CODE`, with a whole collector number, that round-trips through the form (`roundTrips`, exported).
>    - **Reasons**, checked in this order: no entry (`released`), another set (`other-set`), no number (`unnumbered`), and an entry the form can't hold (`unrepresentable`).
>    - **`IMAGE_ONLY_NOTES`** holds the line the studio shows for each: R-61's sentence and R-65's three, each ending in a period. The `other-set` note interpolates `REVEAL_SET_CODE`, so it still names the right set after a pin bump.
>    - **Why.** The outline's rule opened any numbered set-14 entry with fields. But `formFromPreviewCard` keeps only keyword abilities, and `parseKeyword` splits off only a trailing whole number (`buildPreviewCard.ts:45-49`). So a hand-edited entry (a named ability, a keyword value like "X", sections that aren't the text's lines, a stat its type doesn't print) would lose data the moment its Keywords or Text field was touched, and `replaceCardInPreviewJson` would commit the loss.
> 3. **`cardChanges` goes through a `FIELD_KEYS` table, with JSON equality.** `type` maps to `type` and all four stats, so the type case needs no branch. `name` and `version` each map to themselves and `fullName`.
>    - **JSON equality**, not `===`, compares the values. `subtypes`, `abilities` and `fullTextSections` are arrays, so with `===` "Singer  5" for "Singer 5" would emit an abilities change identical to the file.
>    - **The collector number** maps to no key. Edit locks it (R-91), so a change throws.
>    - **`FIELD_KEYS` is exported**, an addition to the header's block. A test holds it to cover `EDITABLE_CARD_KEYS` exactly, so a key R4-1a adds later can't become unreachable from the form.
> 4. **`validateCardEdit(form, imageName)`** validates against an empty id set (the audit). The number is locked, so the card's id is always its own, and the outline's `existingIds` and `loadedId` could never matter. It inherits R4-3a's R-73 refusal, which no pinned card trips: their numbers run 1 to 204, and `SET_TOTAL` is 204.
>    - **A known limit, left for the owner.** An entry whose locked number the validator refuses (0, or past `SET_TOTAL`) would open with fields and never pass `validateCardEdit`, so nothing on it could be saved, its image included. None exists at the pin, R-73 stops the publisher adding one, and reveal-sync's numbering gate skips such numbers (`gates.mjs:84-99`), so only a hand edit could make one. R-65 names three image-only cases and no fourth, so `editKindOf` doesn't add one.
> 5. **`hasEdits({changes, imageName})`** is the one edits rule (the header's "Shared rules"). It takes one object, as the header signs it, so `cardEdit.ts` has 1 primitive parameter in 9.
>    - Typing that builds the same card emits no key, so it is no edit.
>    - An `undefined` value counts as no change, as R4-1a's hand-off asks, since `replaceCardInPreviewJson` refuses such an edit as empty.
> 6. **Tests.**
>    - **The vacuous test goes.** The outline's "every pinned card yields `{}` with no edits" diffed a form against itself. In its place, every pinned card is built back from its form and compared over `EDITABLE_CARD_KEYS`, as the commit would write them. The test does its own pick and compare, so a broken `roundTrips` can't hide.
>    - **A second walk** adds spaces round every typed field of every pinned card, and expects no edits.
>    - **Both walks are guarded.** Graduation empties the file (2026-10-23), so the walks then take the fixtures that open with fields, rather than pass over no cards.
>    - **One fixture per R-65 case**, plus four more shapes the form can't hold. The tests are `it.each` tables. No count is hard-coded.
> 7. **R-60 belongs to R4-3a and R4-2b, not here.** This follows the header's contract addition 7 and its decisions table.
>    - **French in `SCAN_LANGUAGES` and the widened `ScanLanguage`** belong to R4-3a. They edit `constants.ts`, a reveal-sync contract file, and R4-3a already runs reveal-sync's tests for `validateForm.ts`. Doing it here would make a second task touch the contract.
>    - **`scanLanguages.ts`**, which names a code through `Intl.DisplayNames` and adds a hand-marked code to the select, belongs to R4-2b. Its users are `changeRows` and R4-5b's select; `cardEdit.ts` needs neither.
>    - **What this task needs** is the widened type alone: `formFromPreviewCard` carries an entry's code with no cast, so the outline's `as ScanLanguage` goes. Step 1 checks for it, and without it Step 7's typecheck fails, as quoted there.
>    - **Appendix A** holds the verified `constants.ts` block, in case R4-3a's file doesn't carry it.
> 8. **Pin facts at `16283a13`.** `previewCards.json` holds:
>    - 204 cards (ids 14001 to 14204, numbers 1 to 204, all set 14) and 63 abilities, all keywords, in `buildAbilities`' key order (`type, keyword[, keywordValue], fullText`);
>    - no dual-ink card and no card-level `scanLanguage`. The one `scanLanguage` sits on printing 14213 inside card 14085's `variants`, which the form never reads;
>    - 38 cards with `variants`, 44 with no version, one with no rarity (14009), and `fullTextSections` that are always the text's trimmed lines.
>
>    All 204 round-trip, and all pass `validateCardEdit` with no image, R4-3a's R-73 refusal included. So the pinned walk covers every real shape but dual ink, a scan mark and a bare card, and the fixtures cover those.
> 9. **`studioFixtures.ts`** follows the header's list:
>    - **Builders:** `previewEntry`, `previewFileText` and `studioCard`. It adds `cardOf(entry)`, the card list's card for an entry through the engine's `transformCard`, so R4-4b's card list and file agree.
>    - **Named entries** have distinct ids and names, on Ruby numbers taken from `inkBlock`. `RELEASED_CARD` is a set-9 card, and `CURLY_APOSTROPHE_CARD` is a name the search must fold (R4-5f's stories use both).
>    - **No season's name is written in.** `previewFileText` names the set through the bridge's `SET_NAMES[REVEAL_SET_CODE]`, so the file stays right after a season bump.
>    - **Hand count:** 1 primitive parameter in 5 (`ruby(offset)`, private).
> 10. **Imports** go straight to `../reveal/{buildPreviewCard,constants,validateForm,replaceCardInPreviewJson}`, never through the barrels, which R4-6c deletes.
> 11. **Steps follow gates-once** (the header's task loop): the two test files, eslint on the four files, one `pnpm typecheck`, a Code Health step, and the commit.
>     - No reveal-sync run: this task touches no contract file and not the bridge.
>     - The pre-commit hook runs the full lint and `test:run`.
> 12. **Dropped from the outline:**
>     - `cardTag`, `searchCards`, `changeRows`, `ChangeRow`, `SearchRow` and `CardTag` (to R4-2b);
>     - the `as ScanLanguage` cast;
>     - `existingIds` and `loadedId`;
>     - the `EditKind` string union;
>     - the vacuous `{}` test;
>     - the counts 170 and 57.
>
> **Verified (2026-10-07)** in `scratchpad/r4-rebase/sandbox-r42a`: copies of `src/`, `scripts/` and the configs at `b490fb7` plus the uncommitted pin bump (`upstream/inkweave` @ `16283a13`), with junctions to the repo's `node_modules` and `upstream/`. The sandbox's Vite config sets `cacheDir` inside it and `server.fs.allow` for the junctions. Its tree carries R4-1a's `replaceCardInPreviewJson.ts` (from `sandbox-r41a`), R4-3a's `validateForm.ts` with R-73 (from `sandbox-R4-3a`) and Appendix A's `constants.ts` block. The repo's tree and caches were not touched.
> - **Before the implementation**, Step 5 gives `Test Files  1 failed | 1 passed (2)` and `Tests  3 passed (3)`, with the resolve error quoted there.
> - **After it**, Step 7 gives `Test Files  2 passed (2)` and `Tests  59 passed (59)`: 56 in `cardEdit.test.ts` and 3 in `studioFixtures.test.ts`. The suite passes on the outline-shaped stand-in for R4-1a's module too.
> - **Typecheck.** `tsc -p tsconfig.app.json` exits 0. With `constants.ts` as main has it, it fails with exactly the error Step 7 quotes.
> - **Lint.** `pnpm exec eslint --max-warnings 0 --stdin --stdin-filename <path>`, run from the repo, is clean on all four files.
> - **CodeScene.** The local MCP (1.5.7) scores all four files 10.0, with no findings. That is not proof: the PR gate is stricter, so R4-8 runs `analyze_change_set`.
> - **Mutants.** 18 were run against `cardEdit.test.ts`, and 17 were killed:
>   - `roundTrips` always true;
>   - no `other-set` check, no `unnumbered` check, and `released` read as fields;
>   - `type` mapped to `type` alone, `version` without `fullName`, and `fullText` without its sections;
>   - `===` in place of JSON equality, and no `?? null` on the loaded side;
>   - the image error kept;
>   - `hasEdits` ignoring the image, and `hasEdits` counting an `undefined` value;
>   - no renumber throw;
>   - the scan language forced to `en`;
>   - `ink2` dropped;
>   - subtypes joined with `,`;
>   - the real id set in place of the empty one.
>
>   The survivor is equivalent: dropping the keyword filter changes nothing. A named ability has no keyword and no value, so its line is empty, and `buildPreviewCard`'s `splitList` drops it. Its entry stays unrepresentable through `abilities`.
> - **R-60's block (Appendix A).** With it, `vitest run --project scripts scripts/reveal-sync` passes (18 files, 272 tests), and so does `vitest run --project app src/tools/reveal` (8 files, 50 tests).
> - **Re-verified after review (2026-10-07)** in a fresh `scratchpad/r4-rebase/sandbox-v-r42a`, built from the working tree with R4-1a's current `replaceCardInPreviewJson.ts` (extracted from its task file), R4-3a's `validateForm.ts` and Appendix A. The four code blocks were extracted from this file as it now stands:
>   - Step 5's failure and Step 7's `Tests  59 passed (59)` repeat, and `tsc -p tsconfig.app.json` exits 0. With main's `constants.ts`, it gives Step 7's TS2322 at `cardEdit.ts(110,5)`.
>   - With the pinned list emptied, the three walks pass on the fixture fallback. Each walk takes under 30 ms.
>   - eslint is clean in the sandbox and through `--stdin` in the repo, and CodeScene scores all four files 10.0.
>   - Three mutants were re-run and killed: `===` in place of JSON equality, no `other-set` check, and `type` mapped to `type` alone.

### Task R4-2a: Edit form model (`cardEdit.ts`) and the studio fixtures

**Files:**
- Create `src/tools/studio/cardEdit.ts`: the model.
- Create `src/tools/studio/studioFixtures.ts`: the fixtures the studio's tests and stories share. Nothing in the app imports it, so the build leaves it out.
- Test `src/tools/studio/__tests__/cardEdit.test.ts`.
- Test `src/tools/studio/__tests__/studioFixtures.test.ts`.
- No other file changes. The task has no component and so no story.

**Interfaces:**
- **Consumes:**
  - From R4-1a, in `src/tools/reveal/replaceCardInPreviewJson.ts`:
    ```ts
    export const EDITABLE_CARD_KEYS = [
      'name', 'fullName', 'version', 'cost', 'color', 'inkwell', 'type', 'rarity', 'franchise', 'subtypes',
      'abilities', 'fullText', 'fullTextSections', 'strength', 'willpower', 'lore', 'moveCost', 'scanLanguage',
    ] as const;
    export type EditableCardKey = (typeof EDITABLE_CARD_KEYS)[number];
    export type PreviewCardChanges = {[K in EditableCardKey]?: LorcanaJSONCard[K] | null};   // null removes; undefined is no change
    ```
  - From R4-3a:
    - `ScanLanguage` widened to any code, with `{code: 'fr', label: 'French'}` in `SCAN_LANGUAGES` (`constants.ts`, R-60).
    - R-73's past-the-set refusal inside `validateRevealCardForm` (`validateForm.ts`).
  - Existing, at main:
    - `buildPreviewCard(form)` and `RevealCardForm` (`buildPreviewCard.ts:96-117`, `:9-28`). `keywordLine` mirrors `parseKeyword` (`:45-49`), and `buildAbilities` writes each keyword as `{type, keyword[, keywordValue], fullText}` (`:52-58`).
    - `validateRevealCardForm` and `ValidationResult` (`validateForm.ts:113-126` and `:15-18` at main; R4-3a moves the first down).
    - `REVEAL_SET_CODE` and `type StatField` (`constants.ts:51`, `:6`).
    - From the bridge: `PINNED_PREVIEW_CARDS_JSON` (`app-bridge.ts:85`), and `REVEAL_ID_BASE`, `REVEAL_SET_CODE`, `REVEAL_SET_NUMBER`, `SET_NAMES`, `SET_TOTAL` and `inkBlock` (`:26-30`, `:37`).
    - From the engine: `transformCard`, and `type LorcanaJSONCard`, `LorcanaCard`, `CardType` and `Ink`.
- **Produces:**
```ts
// src/tools/studio/cardEdit.ts
export type ImageOnlyReason = 'released' | 'unnumbered' | 'other-set' | 'unrepresentable';
export type CardKind = {kind: 'fields'} | {kind: 'image'; reason: ImageOnlyReason};
export const IMAGE_ONLY_NOTES: Readonly<Record<ImageOnlyReason, string>>;   // R-61's sentence and R-65's three
export const FIELD_KEYS: Readonly<Record<keyof RevealCardForm, readonly EditableCardKey[]>>;   // addition: the keys each field builds
export function formFromPreviewCard(entry: LorcanaJSONCard): RevealCardForm;
export function roundTrips(entry: LorcanaJSONCard): boolean;           // form → buildPreviewCard gives every editable key back
export function editKindOf(entry: LorcanaJSONCard | null): CardKind;   // fields only for a numbered REVEAL_SET_CODE entry that roundTrips
export function cardChanges(loaded: LorcanaJSONCard, before: RevealCardForm, after: RevealCardForm): PreviewCardChanges; // throws on a renumber
export function validateCardEdit(form: RevealCardForm, imageName: string | null): ValidationResult;   // empty id set; no image is fine
export function hasEdits(edit: {changes: PreviewCardChanges; imageName: string | null}): boolean;     // the edits rule

// src/tools/studio/studioFixtures.ts (tests and stories only)
export function previewEntry(overrides?: Partial<LorcanaJSONCard>): LorcanaJSONCard; // Mei: a numbered, keyword-only Ruby Character of set 14
export function previewFileText(cards: readonly LorcanaJSONCard[]): string;          // JSON.stringify({metadata, sets, cards}, null, 2) + '\n'
export function studioCard(seed: Pick<LorcanaCard, 'id' | 'name'> & Partial<LorcanaCard>): LorcanaCard;
export function cardOf(entry: LorcanaJSONCard): LorcanaCard;                          // addition: the engine's transformCard, or throw
export const PREVIEW_ENTRY: LorcanaJSONCard;        // previewEntry()
export const DUAL_INK_ENTRY: LorcanaJSONCard;       // Ruby-Sapphire (the pinned file has none)
export const VARIANTS_ENTRY: LorcanaJSONCard;       // an Epic printing past the set
export const JA_SCAN_ENTRY: LorcanaJSONCard;        // scanLanguage 'ja'
export const UNLISTED_SCAN_ENTRY: LorcanaJSONCard;  // scanLanguage 'zh' (French is listed from R-60)
export const UNNUMBERED_ENTRY: LorcanaJSONCard;     // R-65: id REVEAL_ID_BASE + 901, no number
export const OTHER_SET_ENTRY: LorcanaJSONCard;      // R-65: the set before the pin's
export const NAMED_ABILITY_ENTRY: LorcanaJSONCard;  // R-65: a triggered ability beside the keyword
export const RELEASED_CARD: LorcanaCard;            // set 9 (R-61, R-71)
export const CURLY_APOSTROPHE_CARD: LorcanaCard;    // "Peter Pan’s Shadow - Elusive Prankster" (R4-2b's search)
```

**How it works:**
- **`formFromPreviewCard`** is `buildPreviewCard`'s reverse, as `toRevealForm` fills a form (`adjudicate.mjs:471-494`, with its `blankIfNull`):
  - `color` splits on `-` into `ink` and `ink2`;
  - each keyword ability becomes a `keyword keywordValue` line, one per line;
  - `subtypes` join with `', '`;
  - numbers become text;
  - a missing `version`, `rarity`, `franchise`, `fullText` or stat is `''`;
  - `scanLanguage` is the entry's code, or `'en'`. A hand-marked code that `SCAN_LANGUAGES` doesn't list stays as it is (R-60).

  Each group is its own helper (`inksOf`, `wordsOf`, `statsOf`, `keywordLine`), each taking the entry or an ability, so no function goes past cyclomatic complexity 6.
- **`roundTrips(entry)`** builds the entry's form back through `buildPreviewCard`, and compares every `EDITABLE_CARD_KEYS` value with the entry's by JSON. A key both lack compares equal. Keys outside the list (`id`, `number`, `setCode`, `variants`) are never compared, because Edit never writes them.
- **`editKindOf(entry)`** reads a private `imageOnlyReason`, which returns the first reason that holds:
  - `null`, a card with no entry on the branch: `released`;
  - `setCode !== REVEAL_SET_CODE`: `other-set`;
  - `number` not a whole number: `unnumbered` (the +900 band);
  - not `roundTrips(entry)`: `unrepresentable`.

  The caller (R4-4b) decides which cards have entries: under R-71, a card outside set 14 is `null` without reading the file.
- **`cardChanges(loaded, before, after)`**:
  1. `changedFields` lists the fields whose values differ, and throws if `collectorNumber` is among them.
  2. Their `FIELD_KEYS` are collected into one set, so `name` and `version` changed together give `fullName` once.
  3. Each key's new value is `buildPreviewCard(after)[key]`, or `null` when the built card lacks it.
  4. A value JSON-equal to the loaded one (missing read as `null`) is dropped. So a key both sides lack never becomes a `null`.

  So Character to Action emits `{type: 'Action', strength: null, willpower: null, lore: null}` and no `moveCost`, English emits `{scanLanguage: null}`, and typing that builds the same card emits nothing.
- **`validateCardEdit(form, imageName)`** runs `validateRevealCardForm(form, new Set(), imageName)`. With no image staged, it deletes the `image` error and recomputes `ok`. Every other rule runs: glyph words, stats, cost, the ink block and R-73.
- **`hasEdits({changes, imageName})`** is true when any change value isn't `undefined`, or an image is staged.

- [ ] **Step 1: Check what this task builds on**

R4-1a and R4-3a come first. Run:
```bash
git log --oneline main..HEAD
grep -nE "export (const EDITABLE_CARD_KEYS|type EditableCardKey|type PreviewCardChanges)" src/tools/reveal/replaceCardInPreviewJson.ts
grep -nE "code: 'fr'|export type ScanLanguage" src/tools/reveal/constants.ts
grep -n "SET_TOTAL" src/tools/reveal/validateForm.ts
ls src/tools/studio
```
Expected:
- the log lists R4-1a's and R4-3a's commits, among the tasks before this one;
- the first grep prints three lines;
- the second prints `{code: 'fr', label: 'French'},` and an `export type ScanLanguage` that takes any code (Appendix A writes `= string`);
- the third prints R4-3a's `SET_TOTAL` import and its past-the-set check;
- `ls` prints `__tests__`, R4-3a's `readiness.ts`, and R4-5a's `studioLayout.ts`, `studioPaths.ts` and `studioStyles.ts`. It prints no `cardEdit.ts` and no `studioFixtures.ts`.

If the first grep finds nothing, stop: R4-1a hasn't landed. If `ScanLanguage` is still the list's union (with or without `'fr'` in it), stop and tell the controller: R-60's widening hasn't landed (Appendix A). If `cardEdit.ts` or `studioFixtures.ts` already exists, stop and report: this task creates both. The tests reach the engine through `buildPreviewCard`, so on a fresh checkout, or after a pin bump, run `pnpm build:engine` once first.

- [ ] **Step 2: Add the studio fixtures**

Create `src/tools/studio/studioFixtures.ts`:
```ts
import {transformCard, type LorcanaCard, type LorcanaJSONCard} from 'inkweave-synergy-engine';
import {REVEAL_ID_BASE, REVEAL_SET_CODE, REVEAL_SET_NUMBER, SET_NAMES, SET_TOTAL, inkBlock} from '../../app-bridge';

/*
 * Card studio fixtures, shared by the studio's tests and stories, as
 * analytics/cards/cardFixtures.ts is for /cards. They live in a plain module:
 * Storybook reads every named export of a .stories.tsx file as a story, and a
 * story can't import a test file. Nothing in the app imports this file, so the
 * build leaves it out. Every builder takes one argument: an object, or for
 * previewFileText the list of cards. R4-2a writes it; later tasks add to it.
 */

/** Ruby's first number, from the season's own ink blocks, so the fixtures stay valid every season. */
const RUBY_NUMBER = inkBlock('Ruby').first;

/**
 * A previewCards.json entry as the app writes it: Mei, a numbered Ruby
 * Character of the reveal set with one keyword ability and a line of text. It
 * round-trips through the form. `overrides` replace keys; to give an entry
 * another number, set `id` and `number` together (id = REVEAL_ID_BASE + number).
 */
export function previewEntry(overrides: Partial<LorcanaJSONCard> = {}): LorcanaJSONCard {
  return {
    id: REVEAL_ID_BASE + RUBY_NUMBER,
    name: 'Mei',
    fullName: 'Mei - Red Panda',
    cost: 4,
    color: 'Ruby',
    inkwell: true,
    type: 'Character',
    setCode: REVEAL_SET_CODE,
    number: RUBY_NUMBER,
    version: 'Red Panda',
    rarity: 'Rare',
    franchise: 'Turning Red',
    subtypes: ['Storyborn', 'Hero'],
    abilities: [{type: 'keyword', keyword: 'Singer', keywordValue: '5', fullText: 'Singer 5'}],
    fullText: 'Singer 5\nPANDA POWER When you play this character, draw a card.',
    fullTextSections: ['Singer 5', 'PANDA POWER When you play this character, draw a card.'],
    strength: 3,
    willpower: 5,
    lore: 2,
    ...overrides,
  };
}

/** A previewCards.json text holding `cards`, laid out as the app writes it, so it round-trips. */
export function previewFileText(cards: readonly LorcanaJSONCard[]): string {
  const sets = {[REVEAL_SET_CODE]: {name: SET_NAMES[REVEAL_SET_CODE], number: REVEAL_SET_NUMBER}};
  return JSON.stringify({metadata: {language: 'en'}, sets, cards}, null, 2) + '\n';
}

/** A card as the card list holds it; fullName follows name and version. */
export function studioCard(seed: Pick<LorcanaCard, 'id' | 'name'> & Partial<LorcanaCard>): LorcanaCard {
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

/** The card list's card for an entry, through the engine's transformCard (the app's loader adds only its art). */
export function cardOf(entry: LorcanaJSONCard): LorcanaCard {
  const card = transformCard(entry);
  if (!card) throw new Error(`fixture ${entry.id} has an ink or type the engine refuses`);
  return card;
}

/** One of Ruby's next numbers, with the matching id. */
function ruby(offset: number): Pick<LorcanaJSONCard, 'id' | 'number'> {
  return {id: REVEAL_ID_BASE + RUBY_NUMBER + offset, number: RUBY_NUMBER + offset};
}

/** Mei: the base entry. */
export const PREVIEW_ENTRY = previewEntry();

/** Two inks, which the pinned file has none of (R-75). */
export const DUAL_INK_ENTRY = previewEntry({...ruby(1), name: 'Priya', fullName: 'Priya - Panda Fan', version: 'Panda Fan', color: 'Ruby-Sapphire'});

/** A card with an Epic printing past the set, which Edit never touches (R-2, R-67). */
export const VARIANTS_ENTRY = previewEntry({
  ...ruby(2),
  name: 'Ming',
  fullName: 'Ming - Watchful Mother',
  version: 'Watchful Mother',
  variants: [{id: REVEAL_ID_BASE + SET_TOTAL + 1, rarity: 'Epic', number: SET_TOTAL + 1}],
});

/** A card whose only scan is Japanese. */
export const JA_SCAN_ENTRY = previewEntry({...ruby(3), name: 'Miriam', fullName: 'Miriam - Bandmate', version: 'Bandmate', scanLanguage: 'ja'});

/** A scan language SCAN_LANGUAGES doesn't list, marked by hand (R-60). */
export const UNLISTED_SCAN_ENTRY = previewEntry({...ruby(4), name: 'Abby', fullName: 'Abby - Drummer', version: 'Drummer', scanLanguage: 'zh'});

/** R-65: revealed with no collector number yet, so its id sits in the +900 band. */
export const UNNUMBERED_ENTRY = previewEntry({id: REVEAL_ID_BASE + 901, number: undefined, name: 'Tyler', fullName: 'Tyler - Party Host', version: 'Party Host'});

/** R-65: an entry of the set before the pin's. */
export const OTHER_SET_ENTRY = previewEntry({
  id: (REVEAL_SET_NUMBER - 1) * 1000 + RUBY_NUMBER,
  setCode: String(REVEAL_SET_NUMBER - 1),
  name: 'Sun Yee',
  fullName: 'Sun Yee - Ancestor',
  version: 'Ancestor',
});

/** R-65: a named ability beside the keyword, which the form has no field for. */
export const NAMED_ABILITY_ENTRY = previewEntry({
  ...ruby(5),
  name: 'Jin',
  fullName: 'Jin - Steady Father',
  version: 'Steady Father',
  abilities: [
    {type: 'keyword', keyword: 'Singer', keywordValue: '5', fullText: 'Singer 5'},
    {
      type: 'triggered',
      name: 'PANDA POWER',
      effect: 'When you play this character, draw a card.',
      fullText: 'PANDA POWER When you play this character, draw a card.',
    },
  ],
});

/** A released card (set 9), which only the card list holds (R-61, R-71). */
export const RELEASED_CARD = studioCard({id: '1001', name: 'Lantern Keeper', version: 'Night Watch', setCode: '9', setNumber: 12, rarity: 'Common'});

/** A name printed with ’, as two pinned preview names are (R4-2b's search folds it). */
export const CURLY_APOSTROPHE_CARD = studioCard({
  id: String(REVEAL_ID_BASE + RUBY_NUMBER + 6),
  name: 'Peter Pan’s Shadow',
  version: 'Elusive Prankster',
  ink: 'Ruby',
  setCode: REVEAL_SET_CODE,
  setNumber: RUBY_NUMBER + 6,
});
```

- [ ] **Step 3: Write the failing model test**

Create `src/tools/studio/__tests__/cardEdit.test.ts`:
```ts
import {describe, expect, it} from 'vitest';
import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import {PINNED_PREVIEW_CARDS_JSON, REVEAL_ID_BASE, REVEAL_SET_CODE, inkBlock} from '../../../app-bridge';
import {buildPreviewCard, type RevealCardForm} from '../../reveal/buildPreviewCard';
import {EDITABLE_CARD_KEYS, type PreviewCardChanges} from '../../reveal/replaceCardInPreviewJson';
import {validateRevealCardForm} from '../../reveal/validateForm';
import {
  FIELD_KEYS,
  IMAGE_ONLY_NOTES,
  cardChanges,
  editKindOf,
  formFromPreviewCard,
  hasEdits,
  roundTrips,
  validateCardEdit,
  type CardKind,
} from '../cardEdit';
import {
  DUAL_INK_ENTRY,
  JA_SCAN_ENTRY,
  NAMED_ABILITY_ENTRY,
  OTHER_SET_ENTRY,
  PREVIEW_ENTRY,
  UNLISTED_SCAN_ENTRY,
  UNNUMBERED_ENTRY,
  VARIANTS_ENTRY,
  previewEntry,
} from '../studioFixtures';

const AMBER_NUMBER = inkBlock('Amber').first;

/** An action with nothing optional: no version, rarity, franchise, subtypes, abilities, text or stats. */
const BARE: LorcanaJSONCard = {
  id: REVEAL_ID_BASE + AMBER_NUMBER,
  name: 'Tea Party',
  fullName: 'Tea Party',
  cost: 2,
  color: 'Amber',
  inkwell: false,
  type: 'Action',
  setCode: REVEAL_SET_CODE,
  number: AMBER_NUMBER,
};

const FORM = formFromPreviewCard(PREVIEW_ENTRY);
const FIELDS: CardKind = {kind: 'fields'};

/** The loaded card's form with `patch` typed over it, diffed against the card. */
function changesTo(patch: Partial<RevealCardForm>, loaded: LorcanaJSONCard = PREVIEW_ENTRY): PreviewCardChanges {
  const before = formFromPreviewCard(loaded);
  return cardChanges(loaded, before, {...before, ...patch});
}

/** The keys Edit writes, in EDITABLE_CARD_KEYS order, without those the card lacks: what a commit would write. */
function editable(card: LorcanaJSONCard): string {
  return JSON.stringify(EDITABLE_CARD_KEYS.flatMap((key) => (card[key] === undefined ? [] : [[key, card[key]]])));
}

/** Every field a person types, with spaces added round it: a buildPreviewCard no-op. Rarity is a picker. */
function spaced(form: RevealCardForm): RevealCardForm {
  const typed = ['name', 'version', 'franchise', 'cost', 'strength', 'willpower', 'lore', 'moveCost', 'subtypes', 'keywords', 'fullText'] as const;
  return {...form, ...Object.fromEntries(typed.map((field) => [field, ` ${form[field]}  `]))};
}

// The pinned app's previewCards.json. Graduation empties it (2026-10-23), so the
// walk then takes the fixtures that open with fields, rather than pass over no cards.
const PINNED = (JSON.parse(PINNED_PREVIEW_CARDS_JSON) as {cards: LorcanaJSONCard[]}).cards;
const WALKED: readonly LorcanaJSONCard[] =
  PINNED.length > 0 ? PINNED : [PREVIEW_ENTRY, DUAL_INK_ENTRY, VARIANTS_ENTRY, JA_SCAN_ENTRY, UNLISTED_SCAN_ENTRY, BARE];

describe('every pinned preview card', () => {
  it('builds back from its form with every editable key unchanged', () => {
    expect(WALKED.length).toBeGreaterThan(0);
    const lossy = WALKED.filter((card) => editable(buildPreviewCard(formFromPreviewCard(card))) !== editable(card));
    expect(lossy.map((card) => card.id)).toEqual([]);
  });

  it('opens with editable fields, and passes validateCardEdit with no image', () => {
    expect(WALKED.filter((card) => editKindOf(card).kind !== 'fields').map((card) => card.id)).toEqual([]);
    expect(WALKED.filter((card) => !validateCardEdit(formFromPreviewCard(card), null).ok).map((card) => card.id)).toEqual([]);
  });

  it('has no edits when every typed field only gains spaces', () => {
    const edited = WALKED.filter((card) => {
      const form = formFromPreviewCard(card);
      return hasEdits({changes: cardChanges(card, form, spaced(form)), imageName: null});
    });
    expect(edited.map((card) => card.id)).toEqual([]);
  });
});

describe('formFromPreviewCard', () => {
  it('gives the form New reveal would build the card from', () => {
    expect(FORM).toEqual({
      collectorNumber: String(PREVIEW_ENTRY.number),
      name: 'Mei',
      version: 'Red Panda',
      rarity: 'Rare',
      franchise: 'Turning Red',
      cost: '4',
      ink: 'Ruby',
      ink2: '',
      inkwell: true,
      type: 'Character',
      strength: '3',
      willpower: '5',
      lore: '2',
      moveCost: '',
      subtypes: 'Storyborn, Hero',
      keywords: 'Singer 5',
      fullText: 'Singer 5\nPANDA POWER When you play this character, draw a card.',
      scanLanguage: 'en',
    });
  });

  it('splits a dual ink into ink and ink2', () => {
    expect(formFromPreviewCard(DUAL_INK_ENTRY)).toMatchObject({ink: 'Ruby', ink2: 'Sapphire'});
  });

  it('puts each keyword ability on its own line, with its value', () => {
    const abilities = [
      {type: 'keyword', keyword: 'Evasive', fullText: 'Evasive'},
      {type: 'keyword', keyword: 'Shift', keywordValue: '3', fullText: 'Shift 3'},
    ];
    expect(formFromPreviewCard(previewEntry({abilities})).keywords).toBe('Evasive\nShift 3');
  });

  it('leaves blank what the entry lacks', () => {
    expect(formFromPreviewCard(BARE)).toMatchObject({
      version: '',
      rarity: '',
      franchise: '',
      subtypes: '',
      keywords: '',
      fullText: '',
      strength: '',
      willpower: '',
      lore: '',
      moveCost: '',
      ink2: '',
      inkwell: false,
      type: 'Action',
      scanLanguage: 'en',
    });
  });

  it.each([
    ['listed', JA_SCAN_ENTRY, 'ja'],
    ['unlisted', UNLISTED_SCAN_ENTRY, 'zh'],
  ])('keeps a %s scan language as it is, and builds it back', (_case, entry, code) => {
    expect(formFromPreviewCard(entry).scanLanguage).toBe(code);
    expect(buildPreviewCard(formFromPreviewCard(entry)).scanLanguage).toBe(code);
  });
});

describe('editKindOf and roundTrips', () => {
  it.each<[string, LorcanaJSONCard | null, CardKind]>([
    ['a numbered entry of the reveal set', PREVIEW_ENTRY, FIELDS],
    ['an entry with nothing optional', BARE, FIELDS],
    ['a dual-ink entry', DUAL_INK_ENTRY, FIELDS],
    ['an entry with a printing, which Edit never touches', VARIANTS_ENTRY, FIELDS],
    ['an unlisted scan language', UNLISTED_SCAN_ENTRY, FIELDS],
    ['a released card, which has no entry', null, {kind: 'image', reason: 'released'}],
    ['an entry with no collector number', UNNUMBERED_ENTRY, {kind: 'image', reason: 'unnumbered'}],
    ['an entry of another set', OTHER_SET_ENTRY, {kind: 'image', reason: 'other-set'}],
    ['a named ability', NAMED_ABILITY_ENTRY, {kind: 'image', reason: 'unrepresentable'}],
    [
      'a keyword value that is not a number',
      previewEntry({abilities: [{type: 'keyword', keyword: 'Shift', keywordValue: 'X', fullText: 'Shift X'}]}),
      {kind: 'image', reason: 'unrepresentable'},
    ],
    ["sections that aren't the text's lines", previewEntry({fullTextSections: ['Singer 5 PANDA POWER']}), {kind: 'image', reason: 'unrepresentable'}],
    ["a stat its type doesn't print", previewEntry({type: 'Action'}), {kind: 'image', reason: 'unrepresentable'}],
    ['an English mark', previewEntry({scanLanguage: 'en'}), {kind: 'image', reason: 'unrepresentable'}],
  ])('%s', (_case, entry, kind) => {
    expect(editKindOf(entry)).toEqual(kind);
  });

  it('round-trips an entry the form holds whole, whatever its set or number', () => {
    expect([PREVIEW_ENTRY, OTHER_SET_ENTRY, UNNUMBERED_ENTRY].map(roundTrips)).toEqual([true, true, true]);
    expect(roundTrips(NAMED_ABILITY_ENTRY)).toBe(false);
  });

  it('words each reason as the studio shows it (R-61, R-65)', () => {
    expect(IMAGE_ONLY_NOTES).toEqual({
      released: 'Card data comes from LorcanaJSON; only the image can be replaced here.',
      unnumbered: 'No collector number yet: numbering it changes its id, which goes by PR.',
      'other-set': `Admin's pin names set ${REVEAL_SET_CODE}; bump the pin to edit this card's fields.`,
      unrepresentable: "This entry holds data the form can't.",
    });
  });
});

describe('cardChanges', () => {
  it('reaches every editable key from some form field', () => {
    expect(new Set(Object.values(FIELD_KEYS).flat())).toEqual(new Set(EDITABLE_CARD_KEYS));
  });

  it.each<[string, LorcanaJSONCard, Partial<RevealCardForm>, PreviewCardChanges]>([
    ['a rename keeps the id', PREVIEW_ENTRY, {name: 'Mei Lee', version: 'Panda Form'}, {name: 'Mei Lee', version: 'Panda Form', fullName: 'Mei Lee - Panda Form'}],
    ['a first version', BARE, {version: 'Party Host'}, {version: 'Party Host', fullName: 'Tea Party - Party Host'}],
    ['English drops the mark', JA_SCAN_ENTRY, {scanLanguage: 'en'}, {scanLanguage: null}],
    [
      'English and a rename (admin#14 item 3)',
      JA_SCAN_ENTRY,
      {scanLanguage: 'en', name: 'Miriam Mendelsohn'},
      {scanLanguage: null, name: 'Miriam Mendelsohn', fullName: 'Miriam Mendelsohn - Bandmate'},
    ],
    ['a cleared rarity', PREVIEW_ENTRY, {rarity: ''}, {rarity: null}],
    ['Character to Action', PREVIEW_ENTRY, {type: 'Action'}, {type: 'Action', strength: null, willpower: null, lore: null}],
    ['Character to Location', PREVIEW_ENTRY, {type: 'Location', moveCost: '1'}, {type: 'Location', strength: null, moveCost: 1}],
    ['Action to Item, neither with stats', BARE, {type: 'Item'}, {type: 'Item'}],
    ['emptied keywords', PREVIEW_ENTRY, {keywords: ''}, {abilities: null}],
    ['a second ink', PREVIEW_ENTRY, {ink2: 'Sapphire'}, {color: 'Ruby-Sapphire'}],
    ['new card text', PREVIEW_ENTRY, {fullText: 'Singer 5'}, {fullText: 'Singer 5', fullTextSections: ['Singer 5']}],
    ['a cost and Uninkable', PREVIEW_ENTRY, {cost: '5', inkwell: false}, {cost: 5, inkwell: false}],
  ])('%s', (_case, loaded, patch, changes) => {
    expect(changesTo(patch, loaded)).toEqual(changes);
  });

  it.each<[string, LorcanaJSONCard, Partial<RevealCardForm>]>([
    ['"Singer  5"', PREVIEW_ENTRY, {keywords: 'Singer  5'}],
    ['keywords as a list with a trailing comma', PREVIEW_ENTRY, {keywords: 'Singer 5,'}],
    ['subtypes with no space', PREVIEW_ENTRY, {subtypes: 'Storyborn,Hero'}],
    ['subtypes one per line', PREVIEW_ENTRY, {subtypes: 'Storyborn\nHero'}],
    ['spaces round the name and the cost', PREVIEW_ENTRY, {name: ' Mei ', cost: ' 4 '}],
    ['doubled spaces in the text', PREVIEW_ENTRY, {fullText: 'Singer  5\nPANDA POWER  When you play this character, draw a card. '}],
    ['the type switched away and back, the hidden stats kept', PREVIEW_ENTRY, {type: 'Character'}],
    ['a stat its type hides', BARE, {strength: '3'}],
  ])('emits nothing for typing that builds the same card: %s', (_case, loaded, patch) => {
    expect(changesTo(patch, loaded)).toEqual({});
  });

  it('refuses a changed collector number: Edit never renumbers', () => {
    expect(() => changesTo({collectorNumber: String(Number(FORM.collectorNumber) + 1)})).toThrow(/renumber/);
  });
});

describe('validateCardEdit', () => {
  it("passes the card's own number, which New reveal would call taken", () => {
    expect(validateRevealCardForm(FORM, new Set([PREVIEW_ENTRY.id]), null).errors.collectorNumber).toMatch(/already exists/);
    expect(validateCardEdit(FORM, null)).toEqual({ok: true, errors: {}});
  });

  it('takes a staged image, and still checks its extension', () => {
    expect(validateCardEdit(FORM, 'mei.webp').ok).toBe(true);
    expect(validateCardEdit(FORM, 'mei.gif').errors).toEqual({image: 'Image must be jpg, jpeg, png, or webp'});
  });

  it.each<[string, Partial<RevealCardForm>, string]>([
    ['a spelled-out glyph word', {fullText: 'Your Strength wins.'}, 'fullText'],
    ['a stat its type prints, left blank', {lore: ''}, 'lore'],
    ["an ink outside the number's block", {ink: 'Amber'}, 'ink'],
  ])('still refuses %s', (_case, patch, field) => {
    const result = validateCardEdit({...FORM, ...patch}, null);
    expect(result.ok).toBe(false);
    expect(Object.keys(result.errors)).toEqual([field]);
  });
});

describe('hasEdits', () => {
  it.each<[string, PreviewCardChanges, string | null, boolean]>([
    ['nothing', {}, null, false],
    ['a staged image alone', {}, 'mei.webp', true],
    ['a removed key alone', {rarity: null}, null, true],
    ['an undefined value, which is no change', {rarity: undefined}, null, false],
  ])('%s', (_case, changes, imageName, edited) => {
    expect(hasEdits({changes, imageName})).toBe(edited);
  });

  it('counts typing that builds the same card as no edit', () => {
    expect(hasEdits({changes: cardChanges(PREVIEW_ENTRY, FORM, spaced(FORM)), imageName: null})).toBe(false);
  });
});
```

- [ ] **Step 4: Write the fixtures test**

Create `src/tools/studio/__tests__/studioFixtures.test.ts`:
```ts
import {describe, expect, it} from 'vitest';
import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import {REVEAL_ID_BASE, REVEAL_SET_CODE} from '../../../app-bridge';
import {
  CURLY_APOSTROPHE_CARD,
  DUAL_INK_ENTRY,
  JA_SCAN_ENTRY,
  NAMED_ABILITY_ENTRY,
  OTHER_SET_ENTRY,
  PREVIEW_ENTRY,
  RELEASED_CARD,
  UNLISTED_SCAN_ENTRY,
  UNNUMBERED_ENTRY,
  VARIANTS_ENTRY,
  cardOf,
  previewFileText,
} from '../studioFixtures';

const NUMBERED = [PREVIEW_ENTRY, DUAL_INK_ENTRY, VARIANTS_ENTRY, JA_SCAN_ENTRY, UNLISTED_SCAN_ENTRY, NAMED_ABILITY_ENTRY];

describe('studioFixtures', () => {
  it('lays a file out as the app writes it, so it round-trips', () => {
    const text = previewFileText(NUMBERED);
    const parsed = JSON.parse(text) as {cards: LorcanaJSONCard[]};
    expect(JSON.stringify(parsed, null, 2) + '\n').toBe(text);
    expect(parsed.cards).toEqual(NUMBERED);
  });

  it('gives each named entry its own id, a numbered one the reveal base plus its number', () => {
    expect(NUMBERED.map((entry) => entry.id - REVEAL_ID_BASE)).toEqual(NUMBERED.map((entry) => entry.number));
    expect(new Set([...NUMBERED, UNNUMBERED_ENTRY, OTHER_SET_ENTRY].map((entry) => entry.id)).size).toBe(NUMBERED.length + 2);
  });

  it("builds the card list's cards", () => {
    expect(cardOf(DUAL_INK_ENTRY)).toMatchObject({
      id: String(DUAL_INK_ENTRY.id),
      fullName: 'Priya - Panda Fan',
      ink: 'Ruby',
      ink2: 'Sapphire',
      setCode: REVEAL_SET_CODE,
    });
    expect(RELEASED_CARD).toMatchObject({fullName: 'Lantern Keeper - Night Watch', setCode: '9'});
    expect(CURLY_APOSTROPHE_CARD.fullName).toBe('Peter Pan’s Shadow - Elusive Prankster');
  });
});
```

- [ ] **Step 5: Run the tests and see them fail**

Run: `pnpm vitest run --project app src/tools/studio/__tests__/cardEdit.test.ts src/tools/studio/__tests__/studioFixtures.test.ts`

Expected: `cardEdit.test.ts` FAILS with `Error: Failed to resolve import "../cardEdit" from "src/tools/studio/__tests__/cardEdit.test.ts". Does the file exist?`. `studioFixtures.test.ts` passes, since Step 2 wrote what it tests. The summary reads `Test Files  1 failed | 1 passed (2)` and `Tests  3 passed (3)`.

- [ ] **Step 6: Write `cardEdit.ts`**

Create `src/tools/studio/cardEdit.ts`:
```ts
import type {CardType, Ink, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {buildPreviewCard, type RevealCardForm} from '../reveal/buildPreviewCard';
import {REVEAL_SET_CODE, type StatField} from '../reveal/constants';
import {
  EDITABLE_CARD_KEYS,
  type EditableCardKey,
  type PreviewCardChanges,
} from '../reveal/replaceCardInPreviewJson';
import {validateRevealCardForm, type ValidationResult} from '../reveal/validateForm';

/** Why a card opens image-only (R-61, R-65). */
export type ImageOnlyReason = 'released' | 'unnumbered' | 'other-set' | 'unrepresentable';

/** What Edit card may change: the card's fields and image, or its image only, and why. */
export type CardKind = {kind: 'fields'} | {kind: 'image'; reason: ImageOnlyReason};

/** The line the studio shows for each reason (R-61, R-65). */
export const IMAGE_ONLY_NOTES: Readonly<Record<ImageOnlyReason, string>> = {
  released: 'Card data comes from LorcanaJSON; only the image can be replaced here.',
  unnumbered: 'No collector number yet: numbering it changes its id, which goes by PR.',
  'other-set': `Admin's pin names set ${REVEAL_SET_CODE}; bump the pin to edit this card's fields.`,
  unrepresentable: "This entry holds data the form can't.",
};

/**
 * The card keys each form field builds, so a changed field is diffed on exactly
 * these. A type change rebuilds all four stats, because the type decides which
 * ones the card prints (STAT_FIELDS). The collector number builds none: Edit
 * never renumbers a card (R-91).
 */
export const FIELD_KEYS: Readonly<Record<keyof RevealCardForm, readonly EditableCardKey[]>> = {
  collectorNumber: [],
  name: ['name', 'fullName'],
  version: ['version', 'fullName'],
  rarity: ['rarity'],
  franchise: ['franchise'],
  cost: ['cost'],
  ink: ['color'],
  ink2: ['color'],
  inkwell: ['inkwell'],
  type: ['type', 'strength', 'willpower', 'lore', 'moveCost'],
  strength: ['strength'],
  willpower: ['willpower'],
  lore: ['lore'],
  moveCost: ['moveCost'],
  subtypes: ['subtypes'],
  keywords: ['abilities'],
  fullText: ['fullText', 'fullTextSections'],
  scanLanguage: ['scanLanguage'],
};

const FORM_FIELDS = Object.keys(FIELD_KEYS) as (keyof RevealCardForm)[];
const FIELDS: CardKind = {kind: 'fields'};
const NO_IDS: ReadonlySet<number> = new Set();

type Ability = NonNullable<LorcanaJSONCard['abilities']>[number];

/** JSON equality: arrays and abilities compare by value, in the file's own key order. */
function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** The entry's color as the form's two inks: "Ruby", or "Ruby-Sapphire". */
function inksOf(entry: LorcanaJSONCard): Pick<RevealCardForm, 'ink' | 'ink2'> {
  const [ink, ink2 = ''] = entry.color.split('-');
  return {ink: ink as Ink, ink2: ink2 as RevealCardForm['ink2']};
}

/** The optional words, '' where the entry has none, as toRevealForm fills them (adjudicate.mjs:471-494). */
function wordsOf(entry: LorcanaJSONCard): Pick<RevealCardForm, 'version' | 'rarity' | 'franchise' | 'subtypes' | 'fullText'> {
  return {
    version: entry.version ?? '',
    rarity: entry.rarity ?? '',
    franchise: entry.franchise ?? '',
    subtypes: (entry.subtypes ?? []).join(', '),
    fullText: entry.fullText ?? '',
  };
}

/** The stats as text, '' for one the entry lacks. */
function statsOf(entry: LorcanaJSONCard): Pick<RevealCardForm, StatField> {
  return {
    strength: String(entry.strength ?? ''),
    willpower: String(entry.willpower ?? ''),
    lore: String(entry.lore ?? ''),
    moveCost: String(entry.moveCost ?? ''),
  };
}

/** A keyword ability as its Keywords line, "Singer 5" or "Evasive": parseKeyword's reverse. */
function keywordLine({keyword, keywordValue}: Ability): string {
  return [keyword, keywordValue].filter(Boolean).join(' ');
}

/**
 * A previewCards.json entry as form values, the reverse of buildPreviewCard: the
 * color splits into the two inks, each keyword ability becomes a line, subtypes
 * join with ", ", numbers become text, and a missing optional field is ''. Any
 * other ability gets no line, so roundTrips refuses its entry. A scan language
 * SCAN_LANGUAGES doesn't list stays as it is (R-60).
 */
export function formFromPreviewCard(entry: LorcanaJSONCard): RevealCardForm {
  return {
    collectorNumber: String(entry.number ?? ''),
    name: entry.name,
    cost: String(entry.cost),
    inkwell: entry.inkwell,
    type: entry.type as CardType,
    keywords: (entry.abilities ?? []).filter((ability) => ability.type === 'keyword').map(keywordLine).join('\n'),
    scanLanguage: entry.scanLanguage ?? 'en',
    ...inksOf(entry),
    ...wordsOf(entry),
    ...statsOf(entry),
  };
}

/**
 * Whether the form holds the entry whole: building its form gives back the value
 * of every key Edit can write (R-65). One that doesn't (a named ability, a keyword
 * value that isn't a number, sections that aren't the text's lines, a stat its
 * type doesn't print) opens image-only, so a field edit can never rewrite data
 * the form dropped.
 */
export function roundTrips(entry: LorcanaJSONCard): boolean {
  const built = buildPreviewCard(formFromPreviewCard(entry));
  return EDITABLE_CARD_KEYS.every((key) => sameValue(built[key], entry[key]));
}

/** Why the entry opens image-only, or null when its fields are editable. Fails closed. */
function imageOnlyReason(entry: LorcanaJSONCard | null): ImageOnlyReason | null {
  if (entry === null) return 'released';
  if (entry.setCode !== REVEAL_SET_CODE) return 'other-set';
  if (!Number.isInteger(entry.number)) return 'unnumbered';
  return roundTrips(entry) ? null : 'unrepresentable';
}

/**
 * What Edit card may change on a card, from its previewCards.json entry on the
 * branch (null: none, a released card). Only a numbered entry of the reveal set
 * that round-trips opens with fields; any other opens image-only, with the
 * reason the studio shows (IMAGE_ONLY_NOTES).
 */
export function editKindOf(entry: LorcanaJSONCard | null): CardKind {
  const reason = imageOnlyReason(entry);
  return reason === null ? FIELDS : {kind: 'image', reason};
}

/** The form fields whose values differ. Edit locks the collector number, so a change there is a bug. */
function changedFields(before: RevealCardForm, after: RevealCardForm): (keyof RevealCardForm)[] {
  const fields = FORM_FIELDS.filter((field) => after[field] !== before[field]);
  if (fields.includes('collectorNumber')) {
    throw new Error("Edit card can't renumber a card: its id would change, which goes by PR");
  }
  return fields;
}

/**
 * What the edit changes on the card, for replaceCardInPreviewJson. Each changed
 * field's keys (FIELD_KEYS) take their values from buildPreviewCard(after), so
 * house style, keyword chips and sections come out as New reveal builds them.
 * A key the built card lacks is null (remove it). A value JSON-equal to the
 * loaded one is dropped, and so is a null for a key the loaded card lacks, so
 * typing that builds the same card ("Singer  5", spaces round the name) changes
 * nothing. Throws if the collector number changed.
 */
export function cardChanges(
  loaded: LorcanaJSONCard,
  before: RevealCardForm,
  after: RevealCardForm,
): PreviewCardChanges {
  const built = buildPreviewCard(after);
  const keys = new Set(changedFields(before, after).flatMap((field) => FIELD_KEYS[field]));
  const changed = [...keys]
    .map((key) => [key, built[key] ?? null] as const)
    .filter(([key, value]) => !sameValue(value, loaded[key] ?? null));
  return Object.fromEntries(changed) as PreviewCardChanges;
}

/**
 * New reveal's validator, for an edit. The number is locked, so the card's id is
 * its own and the id check runs against no ids. The image is optional: with none
 * staged, its error goes. Every other rule still runs.
 */
export function validateCardEdit(form: RevealCardForm, imageName: string | null): ValidationResult {
  const {errors} = validateRevealCardForm(form, NO_IDS, imageName);
  if (imageName === null) delete errors.image;
  return {ok: Object.keys(errors).length === 0, errors};
}

/**
 * The one edits rule, for Edit's dirty, its Save button, its save path and the
 * guard: a changed card key, or a staged image. Typing that builds the same card
 * changes no key, so it is no edit, and an undefined value is no change, as
 * replaceCardInPreviewJson reads it.
 */
export function hasEdits(edit: {changes: PreviewCardChanges; imageName: string | null}): boolean {
  return Object.values(edit.changes).some((value) => value !== undefined) || edit.imageName !== null;
}
```

- [ ] **Step 7: Run the tests and see them pass, then lint and typecheck**

Run: `pnpm vitest run --project app src/tools/studio/__tests__/cardEdit.test.ts src/tools/studio/__tests__/studioFixtures.test.ts`

Expected: PASS, with `Test Files  2 passed (2)` and `Tests  59 passed (59)`: 56 in `cardEdit.test.ts` and 3 in `studioFixtures.test.ts`. The first run takes about 15 seconds.

Then run:
```bash
pnpm exec eslint --max-warnings 0 src/tools/studio/cardEdit.ts src/tools/studio/studioFixtures.ts src/tools/studio/__tests__/cardEdit.test.ts src/tools/studio/__tests__/studioFixtures.test.ts
pnpm typecheck
```
Expected: both exit 0. If `ScanLanguage` were still the list's union, the typecheck would fail with `src/tools/studio/cardEdit.ts(110,5): error TS2322: Type 'string' is not assignable to type '"en" | "ja" | "de" | "it"'.` (Step 1 catches it first). Don't run `pnpm lint` or `pnpm test:run` in full: the pre-commit hook does.

- [ ] **Step 8: Code Health**

Run CodeScene's `code_health_review` on the four files. Each must score 10.0 with no findings. The hand count:
- **`cardEdit.ts`:** 1 primitive parameter in 9 exported ones (`validateCardEdit`'s `imageName`), and none in the 9 private ones (`sameValue`'s two, `inksOf`, `wordsOf`, `statsOf`, `keywordLine`, `imageOnlyReason` and `changedFields`'s two). That makes 1 in 18 (6%). Even if the gate counted `sameValue`'s two `unknown`s, it would be 3 in 18 (17%). The inline callbacks carry no type annotation.
  - Every function has cyclomatic complexity 6 or less: `wordsOf` (five `??`) is the highest, then `imageOnlyReason` and `statsOf` at 5.
  - No function takes more than 3 arguments (`cardChanges`).
  - There is no `a || b || c` chain: `hasEdits` has one `||`.
- **`studioFixtures.ts`:** 1 in 5 (20%: the private `ruby(offset)`).

If a finding appears, fix it, review again, and confirm with `code_health_score`.

- [ ] **Step 9: Stage, and check the staged change**

Use the Bash tool with explicit paths, never `git add -A`:
```bash
git add src/tools/studio/cardEdit.ts src/tools/studio/studioFixtures.ts src/tools/studio/__tests__/cardEdit.test.ts src/tools/studio/__tests__/studioFixtures.test.ts
```
Then run CodeScene's `pre_commit_code_health_safeguard`. It must pass.

- [ ] **Step 10: Commit, after the owner approves**

Run it as its own Bash call, unpiped:
```bash
USER_APPROVED=1 git commit -m "feat(studio): add the Edit card model (#24)"
```
Husky's pre-commit runs `pnpm lint` and `pnpm test:run`. If Vitest fails to start its workers under load, stop this session's preview servers, wait out other sessions' runs, and retry. Never use `--no-verify`.

### Hand-offs from R4-2a

- **R4-2b (`changeRows`, `scanLanguages.ts`).**
  - R4-2b's draft already settles the name function: it creates `scanLanguages.ts` with the header's `languageName` and no `SCAN_LANGUAGES` lookup, which is CardTranslationPanel's try and catch (`CardTranslationPanel.tsx:21-28`). `Intl.DisplayNames(['en'])` names all five listed codes as their labels, and its test pins that. The earlier stand-in in `scratchpad/r4-rebase/hold-r42a/` (`scanLanguageName`) is superseded.
  - Its tests hand-build their cards. `CURLY_APOSTROPHE_CARD` and `RELEASED_CARD` are here for R4-5f's search tests and stories.
- **R4-3a.** Its draft carries R-73 but not R-60. If its file still doesn't, take Appendix A. Its other edits don't change it.
- **R4-4b (loading).**
  - R4-4b uses this contract (the header's addition 10): `editKindOf`, the hyphenated reasons `'other-set'` and `'unrepresentable'`, and the object `hasEdits({changes, imageName})`.
  - Build the form only when `editKindOf(entry).kind === 'fields'`, and read the reason from the `{kind: 'image', reason}` branch.
  - Pass `null` for a card with no entry, and for any card outside set 14 without reading the file (R-71).
  - `hasEdits` is `dirty`, and `cardChanges` throws on a renumber, which the form's `locked` collector number (R4-5b) prevents.
  - `cardOf(entry)` builds the card list's card for a fixture entry.
- **R4-4c (saving).**
  - **The save path.** Any change goes through `commitCardEdit`, with the image when one is staged. An image alone goes through `commitCardImage`. Read "any change" as `hasEdits` does: a value that isn't `undefined`.
  - R-68's "a field still applies" compares `formFromPreviewCard(fresh)[field]` with the draft's `before[field]`, field by field. `FIELD_KEYS` is there if the rule needs the keys.
- **R4-4d (branch-only cards).** A reveal-band id that the card list holds but the branch file lacks (after graduation) is `gone` (R-66), not `released`. Decide that before calling `editKindOf`, which reads `null` as released.
- **R4-5f (banner and facts).** The reason line is `IMAGE_ONLY_NOTES[kind.reason]`. `IMAGE_ONLY_NOTES.released` is R-61's sentence, so `ReleasedCardFacts` can print it from here.
- **R4-8 (the shared interfaces).** "R4 as built" adds this task's Produces block to `R-redesign.md`'s shared interfaces, and file-structure rows for `cardEdit.ts` and `studioFixtures.ts`.

### Appendix A: R-60's `constants.ts` block (R4-3a's, verified here)

In `src/tools/reveal/constants.ts`, replace the end of `SCAN_LANGUAGES` and the `ScanLanguage` line (`:43-46` at main) with:
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
- **What changes.** `RevealCardForm` keeps its shape, and its `scanLanguage` field takes any code.
- **New reveal's select** offers French with no other change. `RevealAdminForm.tsx:167`'s `as ScanLanguage` cast still compiles, and goes with that file in R4-6c.
- **reveal-sync** never sets the field: `toRevealForm` (`adjudicate.mjs:474-494`) leaves it out.
- **Verified in the sandbox:** `vitest run --project scripts scripts/reveal-sync` (18 files, 272 tests), `vitest run --project app src/tools/reveal` (8 files, 50 tests) and `tsc -p tsconfig.app.json` (exit 0) all pass.
