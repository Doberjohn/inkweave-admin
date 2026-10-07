> Part of [R: Admin redesign](../R-redesign.md), phase R4 ([R4-card-studio.md](R4-card-studio.md)). Read the main plan's decisions (R-57 to R-91 for R4), corrections, global constraints and shared interfaces, then the R4 header, first.

> **Re-base notes (R4-1a, 2026-10-07).** Re-based from the 2026-10-01 outline's Task R4-1 (`R4-card-studio.md:57-204`) onto main @ `e5e5029` (R1 to R3 merged, plus the app-pin bump), pin `16283a13`, decisions R-57 to R-91 (R-2, R-67 and R-79 bear on this task), and the R4 audit (`.superpowers/sdd/R-redesign/r4-audit-full.json`, entry "R4-1"; `r4-audit-synth.md`, "R4-1"). The audit read the old pin `bc877e1`; every app fact below was re-checked at `16283a13`.
> - **The split.** R4-1 is now two tasks along its pure/network seam. This one, R4-1a, is the pure module and its test. R4-1b takes `StaleCardError`, `readPreviewCards`, `commitCardEdit` and the `githubClient.test.ts` stub refactor. R4-1a creates two files and modifies none:
>   - `src/tools/reveal/index.ts` stays as it is: nothing imports the barrel, and R4-6c deletes both barrels.
>   - `githubClient.ts` waits for R4-1b.
> - **The signature binds the id to its changes:** `replaceCardInPreviewJson(fileText, {id, changes})`, typed by the new exported `PreviewCardEdit`. The outline's `(fileText: string, id: number, changes)` beside `mergeCardChanges` put 2 primitive parameters in 5 (40%), and the PR gate failed R2's modules at 33.3% and about 50%.
>   - The module now has 2 primitive parameters in 15 (13%): the entry's `fileText` and `parseFile`'s.
>   - `parseFile(fileText: string)` is the one private helper that takes a bare string. The text has to be parsed somewhere. Wrapping it in an object only to dodge the count would read worse, and 2 in 15 sits far under 30%. Every other helper takes the parsed file, the change entries or an object.
> - **One guard helper per refusal,** as `validateForm.ts:32-106` splits its checks, each at cyclomatic complexity 3 or less. `replaceCardInPreviewJson` is straight-line calls (complexity 1), as `validateRevealCardForm` is (`validateForm.ts:113-126`). The guards, in the order they run:
>   - `parseFile`: not JSON, or no `cards` array (a `null` file and a `cards` that isn't an array included);
>   - `assertRoundTrips`;
>   - `assertSomeChange` (new as its own helper; the outline listed "`changes` is empty");
>   - `assertEditableKeys`: a key outside `EDITABLE_CARD_KEYS`, or a required key set to `null`;
>   - `assertScanLanguage` (R-79);
>   - `indexOfOnly`: no entry, or more than one, has the id;
>   - `assertOnlyThisCardChanged`: a `[name, check]` table, as tuning's `REQUIRED_PARTS` is (`tuning/githubClient.ts:65-71`).
> - **R-79: the scanLanguage guard.** An edit that writes `scanLanguage` must write a two-letter code other than `en`: the app's own regex, `/^(?!en$)[a-z]{2}$/` (`reveal-set-integrity.test.ts:153-163` at `16283a13`). `null` removes the key (an English scan). The guard checks only the value the edit writes, never the entry's current one. The ink guard is skipped, as R-79 rules.
> - **R-2 and R-67: the merge goes into the entry as the given file holds it.** So `variants`, and every key Edit can't touch, come from the file passed in. R4-1b passes the file at the base commit, so a printing that landed after the editor loaded the card survives the save.
>   - `EDITABLE_CARD_KEYS` is the outline's list, unchanged. Every key exists on the engine's `LorcanaJSONCard` (`cardTransformer.ts:31-70`), and the mapped type would fail typecheck otherwise.
>   - `mergeCardChanges` stays exported. `commitCardEdit` (R4-1b) returns only a `CommitResult`, so the editor (R4-4c) computes its next entry as `mergeCardChanges(loaded, changes)`, for R4-4a's `commit(entry)` patch. Under R-67 that entry matches the committed one on every key the stale check compares.
> - **An undefined value is no change** (new; the outline didn't say). JSON drops it anyway. So an edit whose values are all `undefined` is refused as empty, and `mergeCardChanges` skips it.
> - **The post-checks are a table of what the rewrite keeps:** the number of cards, the card's place, every other card, and the file outside its cards. The last is new: it holds `metadata` and `sets` to the same rule.
>   - None of them can fail through the public API, because the rewrite is built from the parsed file. The mutation run confirms that no test reaches them.
>   - They stay as the outline's fail-closed backstop, should the rewrite ever become a textual splice. The doc comment says so.
> - **Messages.** Every refusal starts "previewCards.json", as `insertCardIntoPreviewJson`'s do (`:9`, `:11`), and says why.
>   - The parse wording follows the insert's, with "the file" for its "the input". `parseCards` stays private there, because exporting it would touch a reveal-sync contract file.
>   - The round-trip refusal mirrors reveal-sync's `addVariants` (`scripts/reveal-sync/printings.mjs:128-141`), and says where the fix goes: the app repo.
>   - "No card N" is a backstop. R4-1b's base check names a missing card first, as a `StaleCardError`.
> - **Pin facts, re-checked at `16283a13`.** `previewCards.json` has:
>   - 204 cards, all `setCode` `'14'` and numbered, with unique ids;
>   - 38 cards that carry `variants`, the first at index 0 (14021, Miguel Rivera);
>   - no card that carries `scanLanguage`. One printing does (14213, `'it'`, on 14085), and the merge never touches a printing;
>   - 63 abilities, all `keyword`.
>
>   It round-trips through `JSON.stringify(_, null, 2) + '\n'` byte for byte. Key order varies between entries (a Location's `moveCost` sits before or after `willpower` and `lore`), so "a new key goes last" means last in that entry. Every one of the 38 entries with `variants` holds it as its last key (both writers that add it, reveal-sync's `addVariants` and the app's `fold-variants.mjs`, append it), so a key an edit adds to such an entry, a `version` or a `scanLanguage`, lands after `variants`. Nothing reads the order. Graduation (`graduate-canonical-set.mjs:360-373`) writes the same layout, with `cards: []`, a fresh `metadata` and the set's `sets` entry.
> - **Tests.**
>   - **Kept from the outline:** only the entry changes, and every byte before and after it stays; `variants` are kept deep-equal; `null` removes `scanLanguage` and `rarity`; a rename keeps the id and the position; a changed key keeps its place and a new `version` goes last; the refusals, as an `it.each` table.
>   - **The pinned case runs on two files.** One is the file as pinned. The other is the file as graduation leaves it, built from the pinned file with its cards emptied. Each case walks its file for the first card with `variants`, and inserts a local card with a variant when there is none (the graduated case today).
>     - No count or id from the file is written down.
>     - It checks the byte-for-byte return of an edit that sets the card's own values, and a real edit (a rename, a cleared `version`, `scanLanguage: 'fr'`) that keeps the card's variants and every other card.
>   - **Not a walk over every entry.** Editing each of the 204 cards took 1.3 s in the sandbox. Under the pre-commit hook's load, that comes near Vitest's 5 s timeout. R4-2a's form round trip walks every pinned card, and the app's integrity test holds each entry's invariants.
>   - **Added:**
>     - refusals for a file that lacks its last newline, a `null` file, `cards` that isn't an array, an upper-case scan code, and `type: null`;
>     - two accepted codes, `fr` and `it`;
>     - a contract case that every key `buildPreviewCard` writes, apart from `id`, `setCode` and `number`, is editable. Otherwise R4-2a's `cardChanges` could build a change that Edit refuses at save.
>   - **Fixtures** are written with `JSON.stringify(…, null, 2) + '\n'`, so they round-trip.
> - **Gates once.** The steps are:
>   - the one test file, run through `--project app`;
>   - eslint on the two new files;
>   - one `pnpm typecheck`;
>   - Code Health, with the hand count;
>   - the commit, with `pre_commit_code_health_safeguard` between `git add` and the commit (CLAUDE.md).
>
>   They leave out:
>   - the reveal-sync run, because no contract file changes. The test only imports `buildPreviewCard` and `insertCardIntoPreviewJson`;
>   - `pnpm lint` and `pnpm test:run`, which the pre-commit hook runs;
>   - a story, because the module is pure data.
> - **Verified** in `scratchpad/r4-rebase/sandbox-r41a`.
>   - **Setup.** The sandbox holds a copy of `src/` from the working tree, which is main `b490fb7` plus the uncommitted bump to `16283a13`. For these files that equals main after the bump merges.
>     - `node_modules` and `upstream/` are junctioned in.
>     - Vite's cache and the tsbuildinfo stay in the sandbox.
>     - The sandbox's Vite config allows the junctioned `upstream/` (`server.fs.allow`), so the `?raw` import loads. The repo needs no such change.
>   - **Results:**
>     - Step 3's failure was observed, with the message quoted there. Then all 34 tests of that draft passed.
>     - `tsc -p tsconfig.app.json` reported no errors, and `--listFilesOnly` lists both files.
>     - Run from the repo, `pnpm exec eslint --max-warnings 0 --stdin` is clean on both files.
>     - **Mutation run: 8 of the 9 mutants were killed**, each by 1 to 4 tests:
>       - null written instead of removed;
>       - no round-trip check;
>       - `en` allowed;
>       - no duplicate check;
>       - no key check;
>       - undefined counted as a change;
>       - the input card mutated;
>       - a required key's removal allowed.
>
>       The post-check mutant survives by design (see above). A tenth mutant, which reads `parsed.cards` without the null check, survived the first draft's tests; the `null` file row kills it.
>     - CodeScene MCP 1.5.7's `code_health_review` gave both files 10.0, with no findings. It ran in a throwaway git directory in the scratchpad, because the CLI needs a repository.
>     - Counted from the TypeScript AST, the module has 2 primitive parameters in 15, and the test file 1 in 7.
>     - **Re-checked** after the review added the `null` file row, in `scratchpad/r4-rebase/sandbox-r41a-verify` (set up the same way): Step 3's failure, then 35 passing tests, with the null-check mutant failing that row; `tsc -p tsconfig.app.json` and eslint clean; CodeScene 10.0 for both files.

### Task R4-1a: Merge one card's edit into previewCards.json (`replaceCardInPreviewJson`)

**Files:**
- Create `src/tools/reveal/replaceCardInPreviewJson.ts`, beside `insertCardIntoPreviewJson.ts`. It isn't part of the reveal-sync contract: `scripts/reveal-sync/web.mjs:61-74` loads only the form, build and insert modules.
- Test (create) `src/tools/reveal/__tests__/replaceCardInPreviewJson.test.ts`.
- No other file changes. No story: the module is pure data.

**Interfaces:**
- **Consumes:**
  - `LorcanaJSONCard` from `inkweave-synergy-engine` (the engine's `cardTransformer.ts:31-70` at the pin): `scanLanguage?: string` at `:68`, `variants?: RawCardVariant[]` at `:69`. The engine must be built (`pnpm build:engine`; `pnpm typecheck` builds it too).
  - Tests only:
    - `PINNED_PREVIEW_CARDS_JSON` (`src/app-bridge.ts:85`);
    - `insertCardIntoPreviewJson(fileText, card)` (`insertCardIntoPreviewJson.ts:28`);
    - `buildPreviewCard(form)` and `RevealCardForm` (`buildPreviewCard.ts:96`, `:9-28`);
    - `CardType` from the engine.
- **Produces:**
```ts
// src/tools/reveal/replaceCardInPreviewJson.ts
/** The keys Edit may change. Everything else on an entry (id, setCode, number, variants) stays as the file has it. */
export const EDITABLE_CARD_KEYS: readonly [
  'name', 'fullName', 'version', 'cost', 'color', 'inkwell', 'type', 'rarity', 'franchise', 'subtypes',
  'abilities', 'fullText', 'fullTextSections', 'strength', 'willpower', 'lore', 'moveCost', 'scanLanguage',
]; // declared `as const`
export type EditableCardKey = (typeof EDITABLE_CARD_KEYS)[number];
/** A new value per changed key. null removes the key; an undefined value is no change. */
export type PreviewCardChanges = {[K in EditableCardKey]?: LorcanaJSONCard[K] | null};
/** One card's edit: its id in the file, which no edit changes, and the keys it changes. */
export interface PreviewCardEdit {id: number; changes: PreviewCardChanges}
/** The card with the changes applied, as a new object: a changed key keeps its place, a new key goes last, null removes. Checks nothing. */
export function mergeCardChanges(card: LorcanaJSONCard, changes: PreviewCardChanges): LorcanaJSONCard;
/** The file with that entry merged and every other byte kept; throws on every refusal below. */
export function replaceCardInPreviewJson(fileText: string, edit: PreviewCardEdit): string;
```

**How it fails closed.** Every refusal throws, and a throw inside `commitFiles`' files callback (R4-1b) commits nothing. The guards run in this order:

| Guard | Refuses | Message |
|---|---|---|
| `parseFile` | text that isn't JSON | `previewCards.json: the file is not valid JSON` |
| | no `cards` array (a `null` file, `cards` that isn't an array) | `previewCards.json: the file has no cards array` |
| `assertRoundTrips` | a file `JSON.stringify(_, null, 2) + '\n'` wouldn't write byte for byte | `previewCards.json is not laid out the way JSON.stringify(_, null, 2) writes it, so an edit would rewrite the whole file. Fix its layout in the app repo first.` |
| `assertSomeChange` | `{}`, or only `undefined` values | `previewCards.json: the edit changes nothing` |
| `assertEditableKeys` | a key outside `EDITABLE_CARD_KEYS` (`id`, `number`, `setCode`, `variants`, …) | `previewCards.json: an edit can't change {key}` |
| | `null` for `name`, `fullName`, `cost`, `color`, `inkwell` or `type` | `previewCards.json: every card needs {key}, so an edit can't remove it` |
| `assertScanLanguage` (R-79) | a `scanLanguage` that isn't a two-letter lower-case code other than `en` | `previewCards.json: scanLanguage takes a two-letter code other than en, not "{code}"; an English scan has none` |
| `indexOfOnly` | no entry with the id | `previewCards.json has no card {id}` |
| | more than one | `previewCards.json holds card {id} {n} times` |
| `assertOnlyThisCardChanged` | a rewrite that changes the card count, the card's place, another card, or the file outside its cards | `previewCards.json: the edit would change {that}` |

**Code Health.**
- **Complexity.** Every function has cyclomatic complexity 3 or less, and `replaceCardInPreviewJson` is 1. No function takes more than 2 arguments. There is no `a || b || c` chain: `assertScanLanguage`'s `scanLanguage == null || …` is the one `||` in an `if`.
- **Primitive parameters, counted by hand** (string, number, boolean):
  - `replaceCardInPreviewJson.ts`: 2 in 15 (13%). They are `replaceCardInPreviewJson`'s `fileText` and `parseFile`'s `fileText`.
    - The other 13 take objects: `serialize(file)`, `sameJson(a, b)` (both `unknown`), `changedEntries(changes)`, `mergeCardChanges(card, changes)`, `assertRoundTrips({fileText, file})`, `assertSomeChange(entries)`, `assertEditableKeys(entries)`, `assertScanLanguage({scanLanguage})`, `indexOfOnly({cards, id})`, `assertOnlyThisCardChanged(rewrite)`, and `replaceCardInPreviewJson`'s `edit`.
    - The `KEPT` table's lambdas take a `Rewrite`.
  - `replaceCardInPreviewJson.test.ts`: 1 in 7 (`cardsOf(text: string)`). `withVariants` takes `{text}`.
- **Test shape.** The test file keeps 4 or fewer consecutive `expect`s per block, and its refusals are one `it.each` table.

- [ ] **Step 1: Check what this task builds on**

R4-1a is the first R4 implementer task. It needs `feature/24-redesign-r4`, cut from main after the pin bump, with only the plan commit (R4-0) on it, and the engine built. Run, with the Bash tool, from the repo root:
```bash
git branch --show-current
git status --short -- src
git submodule status upstream/inkweave
grep -n "PINNED_PREVIEW_CARDS_JSON" src/app-bridge.ts
grep -n "export function insertCardIntoPreviewJson" src/tools/reveal/insertCardIntoPreviewJson.ts
grep -n "export function buildPreviewCard" src/tools/reveal/buildPreviewCard.ts
ls src/tools/reveal/replaceCardInPreviewJson.ts
ls upstream/inkweave/packages/synergy-engine/dist/index.js
node -e "const t=require('fs').readFileSync('upstream/inkweave/apps/web/public/data/previewCards.json','utf8');console.log(JSON.stringify(JSON.parse(t),null,2)+'\n'===t)"
```
Expected:
- **The branch** is `feature/24-redesign-r4`, and `git status` prints nothing for `src`. Anything else: stop and ask the controller.
- **The submodule line** starts with a space, then `16283a13502106205b8ed15c7bb33e89e2fe4e6f upstream/inkweave`.
  - A leading `+` means the checkout differs from main's pin. Run `git submodule update`, then `pnpm install --frozen-lockfile`.
  - A different sha means the bump hasn't merged. Stop and ask the controller.
- **The three greps** print one line each: `85:` (the `?raw` re-export), `28:` and `96:`.
- **The first `ls`** fails with `No such file or directory`.
- **The second `ls`** prints the path. If it fails, run `pnpm build:engine` once.
- **The `node` line** prints `true`: the pinned file round-trips, so the module will accept it.

- [ ] **Step 2: Write the failing test**

Create `src/tools/reveal/__tests__/replaceCardInPreviewJson.test.ts`:
```ts
import {describe, it, expect} from 'vitest';
import type {CardType, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {PINNED_PREVIEW_CARDS_JSON} from '../../../app-bridge';
import {buildPreviewCard, type RevealCardForm} from '../buildPreviewCard';
import {insertCardIntoPreviewJson} from '../insertCardIntoPreviewJson';
import {
  EDITABLE_CARD_KEYS,
  mergeCardChanges,
  replaceCardInPreviewJson,
  type PreviewCardChanges,
  type PreviewCardEdit,
} from '../replaceCardInPreviewJson';

// Three entries in the app's key order. MIDDLE has no version, so a rename can
// add one, and carries a scan language and a variant printing, as real entries can.
const FIRST: LorcanaJSONCard = {
  id: 14001,
  name: 'First',
  fullName: 'First',
  cost: 1,
  color: 'Amber',
  inkwell: true,
  type: 'Action',
  setCode: '14',
  number: 1,
  rarity: 'Common',
};
const MIDDLE: LorcanaJSONCard = {
  id: 14002,
  name: 'Middle',
  fullName: 'Middle',
  cost: 3,
  color: 'Amber-Steel',
  inkwell: false,
  type: 'Character',
  setCode: '14',
  number: 2,
  rarity: 'Rare',
  subtypes: ['Storyborn'],
  strength: 2,
  willpower: 3,
  lore: 1,
  scanLanguage: 'ja',
  variants: [{id: 14205, rarity: 'Enchanted', number: 205}],
};
const LAST: LorcanaJSONCard = {
  id: 14003,
  name: 'Last',
  fullName: 'Last',
  cost: 2,
  color: 'Steel',
  inkwell: true,
  type: 'Item',
  setCode: '14',
  number: 3,
  abilities: [{type: 'keyword', keyword: 'Evasive', fullText: 'Evasive'}],
};

// The fixtures are written as the app writes the file, so they round-trip.
const serialize = (file: unknown) => `${JSON.stringify(file, null, 2)}\n`;
const FILE = {
  metadata: {formatVersion: '2.3.2', language: 'en'},
  sets: {'14': {name: 'Hyperia City', number: 14}},
  cards: [FIRST, MIDDLE, LAST],
};
const TEXT = serialize(FILE);

const cardsOf = (text: string) => (JSON.parse(text) as {cards: LorcanaJSONCard[]}).cards;

/** MIDDLE edited in TEXT. */
const editMiddle = (changes: PreviewCardChanges) => replaceCardInPreviewJson(TEXT, {id: MIDDLE.id, changes});

/** A card's entry as the file holds it: two-space JSON, four more spaces in. */
const entryText = (card: LorcanaJSONCard) =>
  JSON.stringify(card, null, 2)
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');

/** Changes the types refuse, as a cast or a bad caller could still send them. */
const untyped = (changes: Record<string, unknown>) => changes as PreviewCardChanges;

/** An edit that sets every editable key the card has to the value it already holds. */
const ownValues = (card: LorcanaJSONCard) =>
  Object.fromEntries(EDITABLE_CARD_KEYS.filter((key) => key in card).map((key) => [key, card[key]])) as PreviewCardChanges;

describe('mergeCardChanges', () => {
  it('keeps a changed key in its place and puts a new key last', () => {
    const merged = mergeCardChanges(MIDDLE, {cost: 4, version: 'Now'});
    expect(Object.keys(merged)).toEqual([...Object.keys(MIDDLE), 'version']);
    expect(merged).toMatchObject({cost: 4, version: 'Now'});
  });

  it('removes a key set to null and ignores an undefined one', () => {
    const merged = mergeCardChanges(MIDDLE, {scanLanguage: null, rarity: null, lore: undefined});
    expect(merged).not.toHaveProperty('scanLanguage');
    expect(merged).not.toHaveProperty('rarity');
    expect(merged.lore).toBe(1);
  });

  it('keeps every key it is not given, variants among them, and leaves the card it was given alone', () => {
    const before = structuredClone(MIDDLE);
    const merged = mergeCardChanges(MIDDLE, {name: 'Renamed', fullName: 'Renamed'});
    expect(merged).toEqual({...before, name: 'Renamed', fullName: 'Renamed'});
    expect(MIDDLE).toEqual(before);
  });
});

describe('replaceCardInPreviewJson', () => {
  it('rewrites only that entry: every byte before and after it stays', () => {
    const out = editMiddle({name: 'Renamed', fullName: 'Renamed - Now', version: 'Now'});
    const at = TEXT.indexOf(entryText(MIDDLE));
    const tail = TEXT.slice(at + entryText(MIDDLE).length);
    expect(out.slice(0, at)).toBe(TEXT.slice(0, at));
    expect(out.endsWith(tail)).toBe(true);
    expect(out.slice(at, out.length - tail.length)).toBe(
      entryText({...MIDDLE, name: 'Renamed', fullName: 'Renamed - Now', version: 'Now'}),
    );
  });

  it('renames a card in place: its id and its position stay', () => {
    const cards = cardsOf(editMiddle({name: 'Renamed', fullName: 'Renamed'}));
    expect(cards.map((card) => card.id)).toEqual([14001, 14002, 14003]);
    expect(cards[1]).toMatchObject({id: 14002, name: 'Renamed', fullName: 'Renamed'});
  });

  it("keeps the card's variants, and every other card, as they were", () => {
    const cards = cardsOf(editMiddle({cost: 4, type: 'Location', strength: null, moveCost: 1}));
    expect(cards[1].variants).toEqual(MIDDLE.variants);
    expect([cards[0], cards[2]]).toEqual([FIRST, LAST]);
  });

  it.each<[keyof LorcanaJSONCard]>([['scanLanguage'], ['rarity']])('removes %s when the edit sets it to null', (key) => {
    expect(cardsOf(editMiddle({[key]: null}))[1]).not.toHaveProperty(key);
  });

  it.each([['fr'], ['it']])('writes the scan language %s, a code the app accepts', (code) => {
    expect(cardsOf(editMiddle({scanLanguage: code}))[1].scanLanguage).toBe(code);
  });

  const DUPLICATED = serialize({...FILE, cards: [FIRST, MIDDLE, {...LAST, id: MIDDLE.id}]});
  const COMPACT = `${JSON.stringify(FILE)}\n`;

  it.each<[string, string, PreviewCardEdit, RegExp]>([
    ['the file is not JSON', 'not json', {id: 14002, changes: {cost: 4}}, /not valid JSON/],
    ['the file has no cards array', serialize({metadata: {}}), {id: 14002, changes: {cost: 4}}, /no cards array/],
    ['the file is null', serialize(null), {id: 14002, changes: {cost: 4}}, /no cards array/],
    ['its cards are not an array', serialize({cards: {}}), {id: 14002, changes: {cost: 4}}, /no cards array/],
    ['the file is compact', COMPACT, {id: 14002, changes: {cost: 4}}, /not laid out/],
    ['the file lacks its last newline', TEXT.trimEnd(), {id: 14002, changes: {cost: 4}}, /not laid out/],
    ['no entry has the id', TEXT, {id: 14999, changes: {cost: 4}}, /has no card 14999/],
    ['two entries have the id', DUPLICATED, {id: 14002, changes: {cost: 4}}, /holds card 14002 2 times/],
    ['the edit is empty', TEXT, {id: 14002, changes: {}}, /changes nothing/],
    ['the edit changes nothing', TEXT, {id: 14002, changes: {version: undefined}}, /changes nothing/],
    ['it changes the id', TEXT, {id: 14002, changes: untyped({id: 14004})}, /can't change id/],
    ['it changes the number', TEXT, {id: 14002, changes: untyped({number: 4})}, /can't change number/],
    ['it changes the set', TEXT, {id: 14002, changes: untyped({setCode: '13'})}, /can't change setCode/],
    ['it changes the variants', TEXT, {id: 14002, changes: untyped({variants: []})}, /can't change variants/],
    ['it removes the name', TEXT, {id: 14002, changes: {name: null}}, /every card needs name/],
    ['it removes the type', TEXT, {id: 14002, changes: {cost: 4, type: null}}, /every card needs type/],
    ['it marks the scan English', TEXT, {id: 14002, changes: {scanLanguage: 'en'}}, /two-letter code other than en/],
    ['its scan language is not two letters', TEXT, {id: 14002, changes: {scanLanguage: 'fra'}}, /not "fra"/],
    ['its scan language is in capitals', TEXT, {id: 14002, changes: {scanLanguage: 'FR'}}, /not "FR"/],
  ])('refuses the edit when %s', (_reason, text, edit, refusal) => {
    const replace = () => replaceCardInPreviewJson(text, edit);
    expect(replace).toThrow(/^previewCards\.json/);
    expect(replace).toThrow(refusal);
  });

  // Edit writes what buildPreviewCard builds (R4-2a), so a key it adds must be
  // one Edit may change, or every save that touches it would be refused.
  const FORM: RevealCardForm = {
    collectorNumber: '2',
    name: 'Middle',
    version: 'Now',
    rarity: 'Rare',
    franchise: 'Coco',
    cost: '3',
    ink: 'Amber',
    ink2: 'Steel',
    inkwell: true,
    type: 'Character',
    strength: '2',
    willpower: '3',
    lore: '1',
    moveCost: '2',
    subtypes: 'Storyborn, Hero',
    keywords: 'Evasive',
    fullText: 'Evasive\nWhen you play this character, draw a card.',
    scanLanguage: 'ja',
  };

  it.each<[CardType]>([['Character'], ['Location']])(
    'may change every key buildPreviewCard writes for a %s, except id, setCode and number',
    (type) => {
      const keys = Object.keys(buildPreviewCard({...FORM, type}));
      expect(keys.filter((key) => !(EDITABLE_CARD_KEYS as readonly string[]).includes(key))).toEqual([
        'id',
        'setCode',
        'number',
      ]);
    },
  );
});

// The file as set 14's graduation (2026-10-23) leaves it: the app's
// graduate-canonical-set.mjs writes a metadata block and the set's sets entry,
// and empties the cards.
const GRADUATED = serialize({...(JSON.parse(PINNED_PREVIEW_CARDS_JSON) as object), cards: []});

// A card with a variant printing, inserted when a file has none, as the
// graduated file has none.
const LOCAL_CARD: LorcanaJSONCard = {
  id: 13099,
  name: 'Test',
  fullName: 'Test',
  cost: 1,
  color: 'Amber',
  inkwell: true,
  type: 'Action',
  variants: [{id: 13299, rarity: 'Enchanted', number: 299}],
};

/** The file and its first card with variants, or the file with LOCAL_CARD inserted when no card has any. */
function withVariants({text}: {text: string}): {text: string; card: LorcanaJSONCard} {
  const card = cardsOf(text).find((entry) => entry.variants?.length);
  if (card) return {text, card};
  return {text: insertCardIntoPreviewJson(text, LOCAL_CARD), card: LOCAL_CARD};
}

// No counts or ids from the file are written down here: each case finds its
// card, and the pinned case fails on a pin bump that changes the file's layout.
describe.each([
  {state: 'as pinned', text: PINNED_PREVIEW_CARDS_JSON},
  {state: 'as graduation leaves it', text: GRADUATED},
])('replaceCardInPreviewJson on previewCards.json $state', (file) => {
  it("returns the file byte for byte when an edit sets a card's own values", () => {
    const {text, card} = withVariants(file);
    expect(replaceCardInPreviewJson(text, {id: card.id, changes: ownValues(card)})).toBe(text);
  });

  it('edits a card that has variants and keeps them, with every other card as it was', () => {
    const {text, card} = withVariants(file);
    const changes: PreviewCardChanges = {name: 'Renamed', fullName: 'Renamed', version: null, scanLanguage: 'fr'};
    const [before, after] = [cardsOf(text), cardsOf(replaceCardInPreviewJson(text, {id: card.id, changes}))];
    const index = before.findIndex((entry) => entry.id === card.id);
    expect(after[index]).toEqual(mergeCardChanges(card, changes));
    expect(after[index].variants).toEqual(card.variants);
    expect(after.filter((_, i) => i !== index)).toEqual(before.filter((_, i) => i !== index));
  });
});
```

- [ ] **Step 3: Run it, and see it fail**

Run: `pnpm vitest run --project app src/tools/reveal/__tests__/replaceCardInPreviewJson.test.ts`

Expected: FAIL, with `Test Files  1 failed (1)` and `Tests  no tests`. The suite fails at import:
`Error: Failed to resolve import "../replaceCardInPreviewJson" from "src/tools/reveal/__tests__/replaceCardInPreviewJson.test.ts". Does the file exist?`

- [ ] **Step 4: Write `replaceCardInPreviewJson.ts`**

Create `src/tools/reveal/replaceCardInPreviewJson.ts`:
```ts
import type {LorcanaJSONCard} from 'inkweave-synergy-engine';

/*
 * Edit card's write to previewCards.json (R-2): one preview card's changed
 * fields, merged into its entry, with every other byte of the file kept.
 * Pure, so it is tested without the network. commitCardEdit (githubClient.ts,
 * R4-1b) runs it on the file as it is at the commit it builds on.
 *
 * It fails closed. Edit commits straight to the target branch, and the app's
 * master has no ruleset to stop a bad file, so every refusal below throws, and
 * a throw inside commitFiles' files callback commits nothing.
 *
 * reveal-sync never loads this module (scripts/reveal-sync/web.mjs loads the
 * form, build and insert modules by path), so it is not part of that contract.
 */

/** The keys Edit may change. Everything else on an entry (id, setCode, number, variants) stays as the file has it. */
export const EDITABLE_CARD_KEYS = [
  'name', 'fullName', 'version', 'cost', 'color', 'inkwell', 'type', 'rarity', 'franchise', 'subtypes',
  'abilities', 'fullText', 'fullTextSections', 'strength', 'willpower', 'lore', 'moveCost', 'scanLanguage',
] as const;

export type EditableCardKey = (typeof EDITABLE_CARD_KEYS)[number];

/**
 * A new value per changed key. null removes the key (a cleared rarity, an
 * English scan); an undefined value is no change.
 */
export type PreviewCardChanges = {[K in EditableCardKey]?: LorcanaJSONCard[K] | null};

/** One card's edit: its id in the file, which no edit changes, and the keys it changes. */
export interface PreviewCardEdit {
  id: number;
  changes: PreviewCardChanges;
}

/** previewCards.json, parsed: `metadata`, `sets` and `cards`, and any other key, kept as it is. */
interface PreviewFile {
  cards: LorcanaJSONCard[];
  [key: string]: unknown;
}

type ChangeEntry = [key: string, value: unknown];

const EDITABLE: ReadonlySet<string> = new Set(EDITABLE_CARD_KEYS);
/** The keys LorcanaJSONCard requires: an edit may change them, never remove them. */
const REQUIRED: ReadonlySet<string> = new Set(['name', 'fullName', 'cost', 'color', 'inkwell', 'type']);
/** The app's own rule (reveal-set-integrity.test.ts): a two-letter code other than en. */
const SCAN_LANGUAGE_CODE = /^(?!en$)[a-z]{2}$/;

/** The layout every writer of the file uses: the app's scripts, reveal-sync and the insert. */
const serialize = (file: PreviewFile) => `${JSON.stringify(file, null, 2)}\n`;

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** The keys an edit sets or removes: an undefined value is no change. */
function changedEntries(changes: PreviewCardChanges): ChangeEntry[] {
  return Object.entries(changes).filter(([, value]) => value !== undefined);
}

/**
 * The card with `changes` applied, as a new object. A changed key keeps its
 * place, a new key goes last, and null removes the key. Every key the edit
 * doesn't name (variants among them) stays as it is. It checks nothing:
 * replaceCardInPreviewJson does.
 */
export function mergeCardChanges(card: LorcanaJSONCard, changes: PreviewCardChanges): LorcanaJSONCard {
  const merged: Record<string, unknown> = {...card};
  for (const [key, value] of changedEntries(changes)) {
    if (value === null) delete merged[key];
    else merged[key] = value;
  }
  return merged as unknown as LorcanaJSONCard;
}

/** The file's parse, refused when it isn't JSON or holds no `cards` array. */
function parseFile(fileText: string): PreviewFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fileText);
  } catch {
    throw new Error('previewCards.json: the file is not valid JSON');
  }
  if (!Array.isArray((parsed as Partial<PreviewFile> | null)?.cards)) {
    throw new Error('previewCards.json: the file has no cards array');
  }
  return parsed as PreviewFile;
}

/**
 * Refused unless the file is laid out as serialize writes it. Then rewriting
 * it changes only the edited entry's lines; otherwise it would rewrite them all.
 */
function assertRoundTrips({fileText, file}: {fileText: string; file: PreviewFile}): void {
  if (serialize(file) === fileText) return;
  throw new Error(
    'previewCards.json is not laid out the way JSON.stringify(_, null, 2) writes it, so an edit would rewrite the whole file. Fix its layout in the app repo first.',
  );
}

function assertSomeChange(entries: readonly ChangeEntry[]): void {
  if (entries.length === 0) throw new Error('previewCards.json: the edit changes nothing');
}

/** Refused: a key outside EDITABLE_CARD_KEYS, or a required key set to null. */
function assertEditableKeys(entries: readonly ChangeEntry[]): void {
  const outside = entries.find(([key]) => !EDITABLE.has(key));
  if (outside) throw new Error(`previewCards.json: an edit can't change ${outside[0]}`);
  const removed = entries.filter(([, value]) => value === null).find(([key]) => REQUIRED.has(key));
  if (removed) throw new Error(`previewCards.json: every card needs ${removed[0]}, so an edit can't remove it`);
}

/** R-79: refused unless the scanLanguage it writes passes the app's integrity test. null (an English scan) removes it. */
function assertScanLanguage({scanLanguage}: PreviewCardChanges): void {
  if (scanLanguage == null || SCAN_LANGUAGE_CODE.test(scanLanguage)) return;
  throw new Error(
    `previewCards.json: scanLanguage takes a two-letter code other than en, not "${scanLanguage}"; an English scan has none`,
  );
}

/** Where card `id` sits in the file, refused unless exactly one entry has that id. */
function indexOfOnly({cards, id}: {cards: readonly LorcanaJSONCard[]; id: number}): number {
  const index = cards.findIndex((card) => card.id === id);
  if (index < 0) throw new Error(`previewCards.json has no card ${id}`);
  const count = cards.filter((card) => card.id === id).length;
  if (count > 1) throw new Error(`previewCards.json holds card ${id} ${count} times`);
  return index;
}

/** The file before the edit, the rewrite read back, and the edited entry's place. */
interface Rewrite {
  before: PreviewFile;
  after: PreviewFile;
  index: number;
}

/** What a rewrite keeps, each named for its refusal. */
const KEPT: [string, (rewrite: Rewrite) => boolean][] = [
  ['the number of cards', ({before, after}) => after.cards.length === before.cards.length],
  ["the card's place", ({before, after, index}) => after.cards[index].id === before.cards[index].id],
  ['another card', ({before, after, index}) => after.cards.every((card, i) => i === index || sameJson(card, before.cards[i]))],
  ['the file outside its cards', ({before, after}) => sameJson({...after, cards: []}, {...before, cards: []})],
];

/**
 * The rewrite, parsed back, against the file it came from. It can't fail
 * while the rewrite is built from the parsed file as below; it keeps the
 * outcome fail-closed if that ever changes (a textual splice, say).
 */
function assertOnlyThisCardChanged(rewrite: Rewrite): void {
  const broken = KEPT.find(([, kept]) => !kept(rewrite));
  if (broken) throw new Error(`previewCards.json: the edit would change ${broken[0]}`);
}

/**
 * previewCards.json's text with card `edit.id`'s entry merged with
 * `edit.changes` (mergeCardChanges), and every other byte as it was. The id
 * never changes, so a rename keeps the card's id and its place.
 *
 * It throws, and so commits nothing, when the file isn't JSON, has no cards
 * array, or isn't laid out as JSON.stringify(_, null, 2) writes it; when the
 * edit changes nothing, names a key outside EDITABLE_CARD_KEYS, removes a key
 * every card needs, or writes a scanLanguage the app refuses (R-79); and when
 * no entry, or more than one, has the id.
 */
export function replaceCardInPreviewJson(fileText: string, edit: PreviewCardEdit): string {
  const before = parseFile(fileText);
  assertRoundTrips({fileText, file: before});
  const entries = changedEntries(edit.changes);
  assertSomeChange(entries);
  assertEditableKeys(entries);
  assertScanLanguage(edit.changes);
  const index = indexOfOnly({cards: before.cards, id: edit.id});
  const cards = [...before.cards];
  cards[index] = mergeCardChanges(cards[index], edit.changes);
  const text = serialize({...before, cards});
  assertOnlyThisCardChanged({before, after: JSON.parse(text) as PreviewFile, index});
  return text;
}
```

- [ ] **Step 5: Run it to PASS**

Run: `pnpm vitest run --project app src/tools/reveal/__tests__/replaceCardInPreviewJson.test.ts`

Expected: PASS, with `Test Files  1 passed (1)` and `Tests  35 passed (35)`:
- 3 for `mergeCardChanges`;
- 28 for `replaceCardInPreviewJson`: 3, 2 removals, 2 accepted codes, 19 refusals and 2 contract cases;
- 4 on the two files, as pinned and as graduation leaves it.

The pinned cases take tens of milliseconds, not seconds.

If a pinned case fails after a pin bump, the app changed the file's layout or its entries. Read the message before you touch a fixture:
- **"not laid out"** means the file no longer round-trips. Edit can't save until the app's file is fixed, and that is a finding for the owner.
- **"two-letter code"** would mean an entry's code fails R-79, which the app's own test also refuses.

- [ ] **Step 6: Lint and typecheck**

Run: `pnpm exec eslint --max-warnings 0 src/tools/reveal/replaceCardInPreviewJson.ts src/tools/reveal/__tests__/replaceCardInPreviewJson.test.ts`
Expected: no output, exit 0.

Run: `pnpm typecheck`
Expected: exit 0. It builds the engine, then runs `tsc -b`, which checks the test file too. Nothing else imports the module yet: R4-1b and R4-2a are its first consumers.

Don't run `pnpm lint` or `pnpm test:run` here. The pre-commit hook runs both.

- [ ] **Step 7: Code Health**

Run CodeScene's `code_health_review` on both new files, by absolute path:
- `src/tools/reveal/replaceCardInPreviewJson.ts`
- `src/tools/reveal/__tests__/replaceCardInPreviewJson.test.ts`

Expected: 10.0 each, with no findings (MCP 1.5.7 gave that in the sandbox).

The PR gate is stricter than the local tool, so confirm the hand count in "Code Health" above against the file as written: 2 primitive parameters in 15 for the module, 1 in 7 for the test. If a review comment adds a helper, give it an object or the parsed file, not a bare string or number. R4-8 runs `analyze_change_set` before the push.

- [ ] **Step 8: Commit, after the owner approves**

Use the Bash tool. Stage with explicit paths, as its own call:
```bash
git add src/tools/reveal/replaceCardInPreviewJson.ts src/tools/reveal/__tests__/replaceCardInPreviewJson.test.ts
```
Then run CodeScene's `pre_commit_code_health_safeguard`, and go on only when it passes. Then commit, as a separate, unpiped call:
```bash
USER_APPROVED=1 git commit -m "feat(reveal): replace one preview card in previewCards.json, fail-closed (#24)"
```
Husky's pre-commit runs `pnpm lint` and `pnpm test:run`. If Vitest fails to start its workers under load, stop this session's preview servers, wait out other sessions' runs, and retry. Never use `--no-verify`.

### Hand-offs from R4-1a

- **R4-1b (the client).**
  - **The files callback.** `commitCardEdit` reads `previewCards.json` at the base commit and parses it once for `checkBaseEntry({cards, loaded})`. Under R-67 that check compares only `EDITABLE_CARD_KEYS` plus `id`, `setCode` and `number`, so build its key list from this module's export rather than a copy. The callback then calls `replaceCardInPreviewJson(currentText, {id: loaded.id, changes})`.
  - **The merge.** It goes into the base entry, so printings that landed meanwhile survive. Add R-67's test, in which the base gained `variants`.
  - **The committed entry.** `commitCardEdit` returns only a `CommitResult`, so the base entry never leaves it. The editor (R4-4c) patches R4-4a's file with `mergeCardChanges(loaded, changes)`. The check guarantees that it matches the committed entry on every compared key; only `variants` the base gained meanwhile may be missing until the next read.
  - **The errors here are plain `Error`s, never `StaleCardError`.** The layout, key, scan-language and duplicate refusals are not "load it again" cases. The missing-id refusal is a backstop, because `checkBaseEntry` names a missing card first. No message here starts "GitHub 401 on", so `isRejectedToken` (`src/github/rejectedToken.ts`) never misreads one.
  - **An image-only save stays on `commitCardImage`** (outline `:167`). `commitCardEdit` with `{}` changes would be refused here as "the edit changes nothing".
- **R4-2a (`cardEdit.ts`).**
  - `cardChanges` emits only `EDITABLE_CARD_KEYS`. The contract case here holds `buildPreviewCard` to them for a Character and a Location.
  - A scan set back to English becomes `scanLanguage: null`; the R-79 guard refuses `'en'`.
  - Never emit `null` for `name`, `fullName`, `cost`, `color`, `inkwell` or `type`. `buildPreviewCard` always writes them.
  - An `undefined` value counts as no change. `hasEdits` should agree, so a draft with only undefined changes isn't dirty.
  - **R-60's extra codes.** A two-letter code passes. The guard checks only a value the edit writes, so an entry holding another code by hand still saves when the edit leaves `scanLanguage` alone. R-65's `roundTrips` decides whether such an entry opens with fields.
- **R4-2b (`changeRows`).** A `null` in `PreviewCardChanges` is a removed key. Print it as removed, not as "null".
- **R4-4c / R4-5e (Edit's outcome).** This module's messages reach the outcome as they are, and each says why. The one that needs mapping for Edit is still `commitFiles`' race message, which ends "Publish again." (`src/github/githubCommit.ts:161`).
- **R4-8 (the shared interfaces).** "R4 as built" adds the Produces block above to `R-redesign.md`'s shared interfaces, and a file-structure row for `src/tools/reveal/replaceCardInPreviewJson.ts`.
