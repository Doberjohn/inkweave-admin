> Part of [R: Admin redesign](../R-redesign.md). Read its decisions, corrections to the spec, global constraints and shared interfaces first.

## Phase R4: Card studio (outline)

> **Contract additions.** R4 builds on the R1 contract as it stands. It renames nothing and adds four things:
> 1. **Icons in the bridge.** In R4-5, `src/app-bridge.ts` re-exports the app's icons after l.55, unless R1 or R3 already added them:
>    ```ts
>    export {InkIcon} from '../upstream/inkweave/apps/web/src/shared/components/InkIcon';
>    export {InkwellIcon} from '../upstream/inkweave/apps/web/src/shared/components/InkwellIcon';
>    export {RaritySymbol} from '../upstream/inkweave/apps/web/src/features/reveals/RaritySymbol';
>    export {default as enchantedSymbol} from '../upstream/inkweave/apps/web/src/assets/enchanted.webp';
>    ```
>    - `RaritySymbol` takes lowercase keys and has no Enchanted entry, so the picker shows `enchantedSymbol` as an `<img alt="">`.
>    - No bridged module imports an asset today. The test "reads the season from the pinned app through the bridge" in `scripts/reveal-sync/web.test.mjs` proves these exports still load under reveal-sync's Vite runner.
> 2. **New `adm-*` classes.** `AdminStyles` gains:
>    - `adm-acc-head`: the accordion header button, styled on `[aria-expanded]`.
>    - `adm-ink-tile`: an ink tile, used together with `adm-card-btn`.
>    - `adm-switch`: an `input[type=checkbox][role=switch]`.
>    - `adm-file-btn`: a `<label>` around a hidden file input, with a focus ring on `[data-focused="true"]`.
>    - `adm-range`: the cost slider. `[data-unset="true"]` hides the thumb.
>
>    The studio's grid and panel classes (`stu-*`) live in its own scoped `StudioStyles`, which interpolates only `ADMIN_*` and `SPACING` values.
> 3. **Studio URL contract.** `src/tools/studio/studioPaths.ts` (created in R4-5) defines `studioHref(mode, cardId)`, which every link between pages uses. R3's "Edit in Card studio" link moves to it in R4-6. R4's "View card analytics" link assumes R3 serves `/cards/:cardId` (open question 4).
> 4. **Reveal controller fields.** `RevealAdminController` gains `imageName`, `imageDataUrl`, `uploadError` and `dirty`. They only read existing state, and the hook behaves as before. `publishError` still folds in the upload error.

**What R4 delivers.**
- **Card studio at `/studio`.** It replaces `/reveal` and `/image` (README §7, decisions R-2 and R-3, the R4 corrections).
- **New reveal.** It runs on `useRevealAdmin`, `validateRevealCardForm`, `buildPreviewCard` and `commitNewCard`, and behaves as the reveal publisher does today.
- **Edit card.** It searches every card.
  - A preview card gets field edits plus an image in one commit, through `replaceCardInPreviewJson`.
  - A released card gets an image-only commit, through the unchanged `commitCardImage`.
  - This delivers admin#14 item 3.

**The reveal-sync contract (unchanged in every task).**
- `scripts/reveal-sync/web.mjs:61-74` loads `src/tools/reveal/{validateForm,buildPreviewCard,insertCardIntoPreviewJson}.ts` by path.
- `write-chain.test.mjs` and `write.test.mjs` import those files plus `constants.ts`.
- `adjudicate.mjs` `toRevealForm` builds forms in the current `RevealCardForm` shape.
- So these files stay where they are, their signatures stay the same, and `RevealCardForm` keeps its shape.
  - The one addition: R4-3 exports `validateForm.ts`'s existing `intField`, so readiness parses the collector number exactly as the validator does.
  - The studio's "Dual-ink" switch and Inkable buttons are a view over `ink2` and `inkwell`, not new form state.
- `pnpm vitest run scripts/reveal-sync` passes after every task. `pnpm build:engine` must have run once.

**Deleted in R4-6** (each one's tests are ported first, in R4-4 and R4-5):
- `src/tools/reveal/RevealPage.tsx`
- `src/tools/reveal/components/{RevealAdminForm,CardPreviewPanel}{.tsx,.stories.tsx}`
- `src/tools/reveal/__tests__/{RevealAdminForm,RevealAdminFormCardText,CardPreviewPanel}.test.tsx`
- `src/tools/image/{ImagePage,useImageAdmin}.ts(x)`
- `src/tools/image/components/{CardImagePicker,ImageComparePanel,UploadColumn}{.tsx,.stories.tsx}`
- `src/tools/image/__tests__/{CardImagePicker.test.tsx,useImageAdmin.test.ts}`
- `src/components/ImageUploadTile{.tsx,.stories.tsx}`: only `ImageComparePanel` uses it.

**Kept:**
- `src/tools/image/{filterCards,githubClient}.ts` and their tests
- `SynergyPreviewPanel`
- `useHiddenFileInput` and `useImageUpload`

### Task R4-1: Edit write path (`replaceCardInPreviewJson`, `commitCardEdit`)

**Files:**
- Create: `src/tools/reveal/replaceCardInPreviewJson.ts`
- Test (create): `src/tools/reveal/__tests__/replaceCardInPreviewJson.test.ts`
- Modify `src/tools/reveal/githubClient.ts`:
  - l.11 `const PREVIEW_PATH = 'apps/web/public/data/previewCards.json';` becomes `export const PREVIEW_PATH = …`.
  - Add `StaleCardError`, `readPreviewCards` and `commitCardEdit` after `commitNewCard` (l.24-48, unchanged).
- Modify `src/tools/reveal/index.ts`: export the new functions and types.
- Test (modify) `src/tools/reveal/__tests__/githubClient.test.ts`:
  - The edit cases can't use `PREVIEW` (l.8). Its one-line `"metadata": {"language": "en"}` doesn't round-trip through `JSON.stringify(data, null, 2) + '\n'`, so every success case would throw at the round-trip guard.
  - Replace `ROUTES` and `stubGitHub` (l.10-30) with the block below.
  - The `commitNewCard` cases keep calling `stubGitHub()` on `PREVIEW`. The edit cases pass `EDIT_PREVIEW`.
  ```ts
  // An edit refuses a file that doesn't round-trip through JSON.stringify(…, null, 2),
  // as PREVIEW's one-line metadata doesn't, so the edit cases get a file that does.
  const EDIT_CARD: LorcanaJSONCard = {
    id: 14001,
    name: 'First',
    fullName: 'First',
    cost: 1,
    color: 'Amber',
    inkwell: true,
    type: 'Action',
    setCode: '14',
    number: 1,
  };
  const EDIT_PREVIEW = JSON.stringify({metadata: {language: 'en'}, cards: [EDIT_CARD, {...EDIT_CARD, id: 14002}]}, null, 2) + '\n';

  // Table-driven GitHub stub: [url matcher, response body]. Branch-free, for the complexity gate.
  function routes(preview: string): [(url: string) => boolean, string][] {
    return [
      [(u) => u.includes('/contents/'), preview],
      [(u) => u.endsWith('/git/ref/heads/master'), JSON.stringify({object: {sha: 'base1'}})],
      [(u) => u.includes('/git/commits/base1'), JSON.stringify({tree: {sha: 'tree1'}})],
      [(u) => u.endsWith('/git/blobs'), JSON.stringify({sha: 'blob1'})],
      [(u) => u.endsWith('/git/trees'), JSON.stringify({sha: 'tree2'})],
      [(u) => u.endsWith('/git/commits'), JSON.stringify({sha: 'commit2', html_url: 'https://github.com/x/y/commit/commit2'})],
      [(u) => u.endsWith('/git/refs/heads/master'), '{}'],
    ];
  }

  function stubGitHub(preview = PREVIEW) {
    const table = routes(preview);
    const calls: {url: string; body?: {content?: string; message?: string}}[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      calls.push({url: String(url), body: init?.body ? JSON.parse(init.body as string) : undefined});
      const route = table.find(([match]) => match(String(url)));
      if (!route) throw new Error(`unexpected url ${String(url)}`);
      return new Response(route[1]);
    });
    return calls;
  }
  ```

**Interfaces:**
- Consumes `src/github/githubCommit.ts`, unchanged: `commitFiles`, `readRepoFile`, `stripDataUrl`, `utf8ToBase64`, `targetBranch`, `CommitResult`. It gets no new parameter.
- Produces:
```ts
/** The keys Edit may change. Everything else on an entry (id, number, setCode, variants, images) stays as loaded. */
export const EDITABLE_CARD_KEYS = [
  'name', 'fullName', 'version', 'cost', 'color', 'inkwell', 'type', 'rarity', 'franchise', 'subtypes',
  'abilities', 'fullText', 'fullTextSections', 'strength', 'willpower', 'lore', 'moveCost', 'scanLanguage',
] as const;
export type EditableCardKey = (typeof EDITABLE_CARD_KEYS)[number];
/** A new value per changed key; null removes the key (a cleared rarity, an English scan). */
export type PreviewCardChanges = {[K in EditableCardKey]?: LorcanaJSONCard[K] | null};

export function mergeCardChanges(card: LorcanaJSONCard, changes: PreviewCardChanges): LorcanaJSONCard;
export function replaceCardInPreviewJson(fileText: string, id: number, changes: PreviewCardChanges): string;

// src/tools/reveal/githubClient.ts
export const PREVIEW_PATH = 'apps/web/public/data/previewCards.json';
/** The card moved on the branch since the editor loaded it, or left the file: load it again. */
export class StaleCardError extends Error {}
export function readPreviewCards(token: string): Promise<LorcanaJSONCard[]>;
export function commitCardEdit(opts: {
  token: string;
  loaded: LorcanaJSONCard;            // the entry as the form loaded it
  changes: PreviewCardChanges;
  image: {base64: string; ext: string} | null;
}): Promise<CommitResult>;
```

**How `replaceCardInPreviewJson` works.** It fails closed: whenever it throws, nothing is committed.
1. It parses the file.
2. It refuses a file that does not round-trip through `JSON.stringify(data, null, 2) + '\n'`. The pinned copy round-trips byte for byte (170 cards), and inkweave#683 edited it the same way.
3. It applies `mergeCardChanges`.
   - Changed keys keep their place, new keys go last, and `null` deletes the key.
   - The `id` is never touched, so a rename keeps the card's id.
4. It re-serializes, re-parses and checks three things:
   - the card count is the same
   - the card sits at the same index
   - every other card is unchanged

It throws when any of these holds:
- the id is missing, or appears more than once
- a key is outside `EDITABLE_CARD_KEYS`
- a key every card needs (`name`, `fullName`, `cost`, `color`, `inkwell`, `type`) is set to `null`
- `changes` is empty
- the input is not JSON, or has no `cards` array

**How `commitCardEdit` works.** It follows the shape of `commitNewCard`:
- **One commit.** One `commitFiles` call. Its `files` callback reads `PREVIEW_PATH` at the base commit.
- **Stale or missing card.** It throws `StaleCardError` in two cases (this mirrors tuning's `expected` check):
  - the card's entry there no longer JSON-equals `loaded`: "Card {id} changed on {branch} since you loaded it. Load it again."
  - the entry is gone: "Card {id} is no longer in previewCards.json on {branch}. Load it again."
- **Files written.** The new `previewCards.json`, plus `card-images-raw/{id}.{ext}` when `image` is set.
- **Message.** `fix(reveals): update {merged fullName} ({setCode}{number})`.

An image-only save never comes here. It stays on `commitCardImage` and never touches `previewCards.json`, so it can't be refused because a reveal changed `master`.

**Tests:**
- `replaceCardInPreviewJson.test.ts`. Its fixtures are built with `JSON.stringify(…, null, 2) + '\n'`, so they round-trip.
  - It replaces only that card: other cards, `metadata` and `sets` stay unchanged, and so do the bytes before and after the entry.
  - It keeps `variants`, deep-equal, on a fixture card.
  - `{scanLanguage: null}` and `{rarity: null}` remove those keys.
  - A rename (`name`, `fullName`, `version`) keeps the id and the card's position.
  - Changed keys keep their place, and a new `version` goes last.
  - **On the pinned file:** an edit that sets a card's own values returns `PINNED_PREVIEW_CARDS_JSON` byte for byte.
    - When the pinned file has no cards (after a set graduates), the test first inserts a local `NEW_CARD` (an Action, as in the insert test) with `insertCardIntoPreviewJson`. It then replaces that card with its own values and expects the inserted text back.
    - This case fails on a pin bump that changes the file's layout.
  - `it.each` refusals:
    - a missing id, and a duplicate id
    - the keys `id`, `number`, `setCode` and `variants`
    - `name: null`
    - `{}`
    - invalid JSON
    - no `cards` array
    - a compact file that does not round-trip
- `githubClient.test.ts`:
  - `commitCardEdit` on `EDIT_PREVIEW`:
    - It reads at `?ref=base1`.
    - It commits two blobs (the renamed card next to the untouched 14002, and the image) with one ref update.
    - The message is `fix(reveals): update Renamed (141)`.
  - With no image, it commits `previewCards.json` only.
  - It throws `StaleCardError`, with no blob written, when the base entry differs from `loaded` or is gone.
  - `readPreviewCards` reads `?ref=master` and refuses a file with no `cards` array.
  - The existing `commitNewCard` cases still pass on `stubGitHub()`.

- [ ] **Step 1: Write the failing tests above.** Run `pnpm vitest run src/tools/reveal/__tests__/replaceCardInPreviewJson.test.ts src/tools/reveal/__tests__/githubClient.test.ts`. Expected: FAIL, with `Failed to resolve import "../replaceCardInPreviewJson"`.
- [ ] **Step 2: Implement both modules.** Run the same command. Expected: PASS. Then run `pnpm vitest run scripts/reveal-sync`. Expected: PASS.
- [ ] **Step 3: Lint and typecheck.** `pnpm lint` and `pnpm typecheck` are clean.
- [ ] **Step 4: Commit.** Run with the Bash tool, only after the owner approves:
```bash
git add src/tools/reveal/replaceCardInPreviewJson.ts src/tools/reveal/__tests__/replaceCardInPreviewJson.test.ts src/tools/reveal/githubClient.ts src/tools/reveal/__tests__/githubClient.test.ts src/tools/reveal/index.ts
USER_APPROVED=1 git commit -m "feat(reveal): edit a preview card in place with replaceCardInPreviewJson (#24)"
```

### Task R4-2: Edit model (`cardEdit.ts`)

**Files:**
- Create: `src/tools/studio/cardEdit.ts`
- Test: `src/tools/studio/__tests__/cardEdit.test.ts`

**Interfaces:**
- Consumes:
  - `buildPreviewCard`, `RevealCardForm`, `validateRevealCardForm`, `ValidationResult`, `REVEAL_SET_CODE`, `SCAN_LANGUAGES`, `ScanLanguage`, `STAT_FIELDS`, `STAT_LABELS`
  - `PreviewCardChanges` (R4-1)
  - `filterCards(cards, query, limit = 40)` from `src/tools/image/filterCards.ts`. A blank query returns the head of the list. Otherwise it matches `fullName` (name and version) or the id, case-insensitive, ranks `fullName` prefix matches first, and caps the result.
- Produces:
```ts
export type CardTag = 'Preview' | 'Released';
export type EditKind = 'fields' | 'image';
export interface ChangeRow {label: string; from: string; to: string}
export interface SearchRow {card: LorcanaCard; tag: CardTag}

export function cardTag(card: LorcanaCard, previewIds: ReadonlySet<number>): CardTag;
/** 'fields' only for a previewCards.json entry of REVEAL_SET_CODE with a `number`; released, other-set and reserved-band cards are image-only. */
export function editKindOf(entry: LorcanaJSONCard | undefined): EditKind;
export function formFromPreviewCard(entry: LorcanaJSONCard): RevealCardForm;
export function cardChanges(loaded: LorcanaJSONCard, before: RevealCardForm, after: RevealCardForm): PreviewCardChanges;
export function validateCardEdit(form: RevealCardForm, existingIds: ReadonlySet<number>, loadedId: number, imageName: string | null): ValidationResult;
export function changeRows(loaded: LorcanaJSONCard, changes: PreviewCardChanges, imageName: string | null): ChangeRow[];
export function searchCards(cards: LorcanaCard[], query: string, previewIds: ReadonlySet<number>, limit?: number): {rows: SearchRow[]; total: number};
```

**`cardTag`.** It returns Preview when `previewIds.has(Number(card.id))`, and Released otherwise. `LorcanaCard.id` is a string; the file's ids are numbers.

**`formFromPreviewCard`.** It turns a card from `previewCards.json` back into form values, the reverse of `buildPreviewCard`:
- `color` is split on `-` into `ink` and `ink2`.
- Keyword abilities become `keyword keywordValue` lines. All 57 abilities in the pinned file are keywords.
- `subtypes` is joined with `', '`.
- A missing `version`, `rarity` or `franchise` becomes `''`.
- Numbers become strings.
- `scanLanguage: (entry.scanLanguage ?? 'en') as ScanLanguage`.
  - An unlisted code (`'fr'`) is kept as it is, and `buildPreviewCard` writes it back unchanged.
  - The select shows it as an extra option (open question 2).

**`cardChanges`.** It compares the form before and after, and turns each changed form field into card keys.
- The values come from `buildPreviewCard(after)`, so house style, keyword chips and sections are built exactly as New reveal builds them.
- A key the built card lacks becomes `null`.
- A key whose value equals the loaded card's is dropped. So is a `null` for a key the loaded card lacks.

| Changed form field | Card keys |
|---|---|
| `name`, `version` | `name`, `version`, `fullName` |
| `ink`, `ink2` | `color` |
| `type` | `type`, plus all four stat keys (the new type's `STAT_FIELDS` get values, the others `null`) |
| `keywords` | `abilities` |
| `fullText` | `fullText`, `fullTextSections` |
| `scanLanguage` | `scanLanguage` (`'en'` becomes `null`) |
| `rarity`, `franchise`, `cost`, `inkwell`, `subtypes`, the stats | the same key |
| `collectorNumber` | none: read-only in Edit, and a changed value throws |

**`validateCardEdit`.** It calls `validateRevealCardForm(form, existingIds minus loadedId, imageName)`.
- When `imageName` is null, it drops the `image` error, because the image is optional in Edit.
- Every other rule still runs: glyph words, stats, cost and ink block.

**`changeRows`.**
- Each changed key gets a label. `fullName` and `fullTextSections` are derived and get no row.
- Values are formatted for reading:
  - `—` for a missing value
  - Inkable or Uninkable
  - the keywords joined with commas
  - the language's name (English when the key is missing)
- When an image is staged, `{label: 'Image', from: 'current', to: imageName}` comes last.

**`searchCards`.**
- `rows` is `filterCards(cards, query, limit)`, each tagged with `cardTag`.
- `total` is `filterCards(cards, query, Infinity).length`. For a blank query, that is every card.

**Tests:**
- `formFromPreviewCard`:
  - It splits dual ink.
  - It turns abilities into keyword lines.
  - It fills blanks for missing fields.
  - It keeps an unlisted code. The expected form is built with the same cast: `scanLanguage: 'fr' as ScanLanguage`.
- **Every pinned preview card:**
  - It loads into the form.
  - It passes `validateCardEdit` with no image.
  - It yields `{}` with no edits.

  At the pin, all 170 pass the glyph, ink-block and stats checks.
- `cardChanges`:
  - A rename emits the name keys only, never the id.
  - English emits `{scanLanguage: null}`.
  - Clearing the rarity emits `{rarity: null}`.
  - Character to Action emits exactly `{type: 'Action', strength: null, willpower: null, lore: null}`. There is no `moveCost`, which the Character never had.
  - Emptied keywords emit `{abilities: null}`.
  - A whitespace-only text edit that builds to the same value emits nothing.
- `validateCardEdit`:
  - The card's own id is no collision.
  - A missing image is fine, but a bad extension still fails.
  - The glyph, stats and ink-block checks still fail.
- `editKindOf`:
  - Undefined (a released card) is image-only.
  - An entry with no `number` is image-only.
  - Another set is image-only.
- `searchCards`:
  - It matches ids.
  - It matches names: `'anna'` finds "Anna - Heir to Arendelle", and not "Elsa - Snow Queen".
  - It puts `fullName` prefix matches first.
  - It caps the rows at 40 but reports the full `total`.
  - It tags rows Preview or Released, with a numeric `previewIds` set and string card ids.
- `changeRows`:
  - It uses the labels and `—` for missing values.
  - The Image row comes last.

- [ ] **Step 1: Write the failing tests.** Run `pnpm vitest run src/tools/studio/__tests__/cardEdit.test.ts`. Expected: FAIL, with `Failed to resolve import "../cardEdit"`.
- [ ] **Step 2: Implement.** Keep each concern in its own helper, as `validateForm.ts` does. Run the same command. Expected: PASS.
- [ ] **Step 3: Lint and typecheck.** `pnpm lint` and `pnpm typecheck` are clean.
- [ ] **Step 4: Commit.** Run with the Bash tool, only after the owner approves:
```bash
git add src/tools/studio/cardEdit.ts src/tools/studio/__tests__/cardEdit.test.ts
USER_APPROVED=1 git commit -m "feat(studio): add the Edit card model (#24)"
```

### Task R4-3: New reveal readiness and controller additions

**Files:**
- Create: `src/tools/studio/readiness.ts`
- Create: `src/tools/reveal/livePreview.ts`. `buildPreview` (`useRevealAdmin.ts` l.36-45, with its doc comment) and `computeSynergies` (l.47-55) move here unchanged, as exports.
- Modify `src/tools/reveal/useRevealAdmin.ts`:
  - Import the two moved functions.
  - `RevealAdminController` (l.71-86) gains `imageName: string | null; imageDataUrl: string | null; uploadError: string | null; dirty: boolean`.
  - The return (l.138-154) adds them:
    - `uploadError: upload.error`
    - `dirty`: `JSON.stringify(form) !== JSON.stringify(EMPTY_FORM) || upload.file !== null`
  - `readyToPublish` (l.57-69), `publish()` and `publishError` stay as they are.
- Modify `src/tools/reveal/validateForm.ts`: l.26 `function intField(value: string): number | null {` becomes `export function intField(…)`. Its body and every other export stay the same.
- Test: `src/tools/studio/__tests__/readiness.test.ts`
- Test (modify): `src/tools/reveal/__tests__/useRevealAdmin.test.ts`

**Interfaces:**
- Consumes: `ValidationResult`, `RevealCardForm`, `STAT_FIELDS`, `intField`.
- Produces:
```ts
export type ChecklistId = 'collectorNumber' | 'name' | 'ink' | 'cost' | 'typeStats' | 'cardText' | 'image';
export interface ChecklistItem {id: ChecklistId; label: string; done: boolean; message: string | null}
/** Every item done exactly when validation.ok and the image bytes are read (readyToPublish, token aside). */
export function revealChecklist(form: RevealCardForm, validation: ValidationResult, imageReady: boolean): ChecklistItem[];
export type SectionId = 'identity' | 'ink' | 'type' | 'text';
export const SECTION_FIELDS: Readonly<Record<SectionId, readonly (keyof RevealCardForm)[]>>;
/** Whether a section's required values are in, errors aside. */
export const SECTION_REQUIRED: Readonly<Record<SectionId, (form: RevealCardForm) => boolean>>;
export type SectionState = 'error' | 'complete' | 'incomplete';
export function sectionStatus(section: SectionId, form: RevealCardForm, errors: Record<string, string>): {state: SectionState; message: string | null};
```

**"Number valid".** It means `intField(form.collectorNumber)` parses to a positive whole number, whatever the collision check says. A number that collides with an existing id is still valid for the Ink check.

The checklist reads "Ready to publish N/7". Each item takes the validator's message as its own:

| Item | Done when there is no error on |
|---|---|
| Collector number | `collectorNumber` |
| Name | `name` |
| Ink | `ink` and `ink2`, **and** the number is valid, because the block check needs it. With no valid number, the item says "Checked against the collector number: set it first", so the Amber default never ticks it. |
| Cost | `cost` |
| Type and stats | `type`, `strength`, `willpower`, `lore`, `moveCost` |
| Card text | `fullText`, `keywords` |
| Image | `image`, **and** `imageDataUrl` is read |

Rarity is not an item: it stays optional.

**`sectionStatus`.** Its sections (`SECTION_FIELDS`) follow the studio form:
- **identity:** collector number, name, version, franchise, subtypes
- **ink:** ink, second ink, rarity
- **type:** type, inkwell, cost, stats
- **text:** keywords, full text, scan language

`SECTION_REQUIRED` says when a section's values are in:
- **identity:** `collectorNumber` and `name` are not blank.
- **ink:** `ink` is set, and the number is valid.
- **type:** `cost` and every `STAT_FIELDS[form.type]` field are not blank.
- **text:** always true, so it is complete unless it has an error.

A section with any error in its fields is `error`, with the first error as its message. Otherwise it is `complete` when `SECTION_REQUIRED` holds, and `incomplete` when it does not.

**Tests:**
- Every key `validateRevealCardForm` can return lands on exactly one item. The test builds a form that produces each key.
- Invariant: across `useRevealAdmin` states, `revealChecklist(form, validation, imageDataUrl !== null).every(done)` equals `canPublish`. The states are: empty, valid with no image, a file still being read, ready, and after a publish.
- Ink item:
  - A blank number with the Amber default leaves Ink not done, with the "set it first" message.
  - A wrong-block ink shows the validator's message.
  - A number that collides (`Card id … already exists`) leaves Collector number open and Ink done.
- `sectionStatus`:
  - An error wins over complete.
  - The ink-block error lands on `ink`.
  - A glyph-word error lands on `text`.
  - A blank number leaves the ink section incomplete, even with the Amber default.
  - A Character with no lore leaves `type` incomplete. An Item with a cost is complete.
- `useRevealAdmin`:
  - It is dirty after a field change or a chosen image.
  - It is clean after a successful publish, using a mocked `commitNewCard`.
  - `uploadError` carries a bad file's error.

- [ ] **Step 1: Write the failing tests.** Run `pnpm vitest run src/tools/studio/__tests__/readiness.test.ts src/tools/reveal/__tests__/useRevealAdmin.test.ts`. Expected: FAIL, with `Failed to resolve import "../readiness"`.
- [ ] **Step 2: Implement, export `intField` and move the two helpers.** Run the same command. Expected: PASS. Then run `pnpm vitest run scripts/reveal-sync`. Expected: PASS.
- [ ] **Step 3: Lint and typecheck.** `pnpm lint` and `pnpm typecheck` are clean.
- [ ] **Step 4: Commit.** Run with the Bash tool, only after the owner approves:
```bash
git add src/tools/studio/readiness.ts src/tools/studio/__tests__/readiness.test.ts src/tools/reveal/livePreview.ts src/tools/reveal/useRevealAdmin.ts src/tools/reveal/validateForm.ts src/tools/reveal/__tests__/useRevealAdmin.test.ts
USER_APPROVED=1 git commit -m "feat(studio): derive the reveal checklist from the validator (#24)"
```

### Task R4-4: Edit controller (`usePreviewCardsFile`, `useCardEditor`)

**Files:**
- Create: `src/tools/studio/usePreviewCardsFile.ts`, `src/tools/studio/useCardEditor.ts`
- Test: `src/tools/studio/__tests__/useCardEditor.test.ts`. It ports the five `useImageAdmin.test.ts` cases and their `DeferredReader` and deferred-commit helpers.

**Interfaces:**
- Consumes:
  - `useCardDataContext`
  - `useImageUpload`
  - `commitCardEdit`, `readPreviewCards`, `mergeCardChanges`, `StaleCardError` (R4-1)
  - `commitCardImage`
  - everything in `cardEdit.ts`
  - `buildPreview`, `computeSynergies`
  - `useCardEditor` takes the token as a parameter, so it doesn't use `useGithubToken`.
- Produces:
```ts
export type PreviewCardsFile =
  | {status: 'loading'}
  | {status: 'ready'; cards: LorcanaJSONCard[]; ids: ReadonlySet<number>; read: number}
  | {status: 'error'; error: string};
/**
 * previewCards.json from the target branch, read once per token and again on each reload()
 * (useLiveTuning's pattern: the last read stays until the next lands). `read` is the reload
 * count a ready file answers; `requested` the newest one asked for.
 */
export function usePreviewCardsFile(token: string): PreviewCardsFile & {requested: number; reload: () => void};

export type CardLookup = 'none' | 'loading' | 'ready' | 'missing' | 'error';
export interface CardEditorController {
  lookup: CardLookup; lookupError: string | null; retry: () => void;
  previewIds: ReadonlySet<number>;
  card: LorcanaCard | null; tag: CardTag | null; kind: EditKind | null;
  form: RevealCardForm | null;                       // null for an image-only card
  patchForm: (patch: Partial<RevealCardForm>) => void;
  validation: ValidationResult;
  changes: ChangeRow[]; dirty: boolean; discard: () => void;
  previewCard: LorcanaCard | null; synergyGroups: SynergyGroup[];
  imageName: string | null; imageDataUrl: string | null;
  imageError: string | null;                         // upload.error, else the validator's image error
  onImageChange: (file: File | null) => void; revertImage: () => void;
  canSave: boolean; saving: boolean;
  result: CommitResult | null; saveError: string | null; save: () => void;
  stale: boolean; loadAgain: () => void;             // the last save was refused with StaleCardError
}
export function useCardEditor(token: string, cardId: string | null): CardEditorController;
```

**Behaviour:**
- **Loading a card.** The card comes from the context list, by `cardId`. Its entry comes from the file read from the branch, and its kind from `editKindOf`.
- **The draft.** The form state is one draft object. There is no ref and no reset effect:
  - The draft resets during render: when `cardId` changes, when the first read lands, and when a read asked for by "Load it again" lands.
  - A save that lands late applies its result only to the draft it was made from, through `seed`.
  ```ts
  /** One card's edit: its entry and form as loaded, and the form now. */
  interface Draft {
    cardId: string | null;
    /** Bumped on every seed, so a save that lands late can tell it is out of date. */
    seed: number;
    /** The read of previewCards.json it was seeded from; null before one is ready. */
    read: number | null;
    /** Re-seed from a newer read: true before the first read, and after "Load it again". */
    follow: boolean;
    loaded: LorcanaJSONCard | null;
    before: RevealCardForm | null;
    form: RevealCardForm | null;
  }

  function seedDraft(cardId: string | null, file: PreviewCardsFile, seed: number): Draft {
    if (file.status !== 'ready') return {cardId, seed, read: null, follow: true, loaded: null, before: null, form: null};
    const loaded = file.cards.find((c) => String(c.id) === cardId) ?? null;
    const form = loaded ? formFromPreviewCard(loaded) : null;
    return {cardId, seed, read: file.read, follow: false, loaded, before: form, form};
  }

  // Inside useCardEditor:
  const [draft, setDraft] = useState<Draft>(() => seedDraft(cardId, file, 0));
  // Another card, the first read, or a re-read asked for re-seeds during render
  // (no effect, no ref), so no frame pairs one card's form or image with another.
  const newCard = draft.cardId !== cardId;
  const newRead = draft.follow && file.status === 'ready' && (draft.read === null || file.read > draft.read);
  if (newCard || newRead) {
    setDraft(seedDraft(cardId, file, draft.seed + 1));
    if (newCard) void upload.choose(null);
  }

  /** After a stale refusal: drop this card's edits and re-seed from a read made now. */
  function loadAgain() {
    setDraft((d) => ({...d, follow: true, read: file.requested}));
    file.reload();
  }

  /** A fields save landed: the draft it was made from (if still on screen) now starts from what was committed. */
  function applySaved(saved: {seed: number; loaded: LorcanaJSONCard; form: RevealCardForm}, image: File | null) {
    setDraft((d) => (d.seed === saved.seed ? {...d, loaded: saved.loaded, before: saved.form} : d));
    if (image) upload.clearIf(image);
    file.reload();
  }
  ```
- **The preview.** It is `buildPreview(form, imageDataUrl ?? card.imageUrl ?? null)`. For an image-only card, it is the context card with the staged image swapped in.
- **Synergies.** They run against every card except this one (the same id).
- **Changes and dirty.**
  - `changes` is `changeRows(loaded, cardChanges(loaded, before, form), imageName)`.
  - `dirty` is true when the form differs from `before` or an image is staged.
  - `discard` puts `before` back and clears the image.
- **Which save runs.**

  | Card and change | Save path |
  |---|---|
  | image-only card, or a preview card with only an image staged | `commitCardImage`; on success `upload.clearIf(file)` |
  | preview card with field changes | `commitCardEdit`, with the image too when one is staged; on success `applySaved(…)` |

- **After a fields save.**
  - `loaded` becomes `mergeCardChanges(loaded, changes)`, and `before` becomes the form that was saved. Edits typed while the save ran survive as new changes.
  - `reload()` re-reads `previewCards.json`, so leaving the card and coming back seeds from the committed entry, not the cached one. The current draft doesn't follow that read.
  - The app's card list lags until the next deploy, so the editor uses its own `loaded`.
- **The stale refusal.**
  - A `StaleCardError` sets `stale`.
  - The failure offers **Load it again**, which calls `loadAgain()`: `reload()`, then re-seed this card's draft from the fresh entry.
  - Any other failure (for example `master changed while publishing`) leaves `stale` false, and saving again is the retry.
- **When Save is enabled.**
  - Nothing is saving.
  - The card is `dirty`.
  - The card is image-only, or validation passes.
  - Any staged image has its bytes read. `useImageUpload`'s byte check then guarantees jpg, jpeg, png or webp.
- **Errors.**
  - `saveError` is the commit failure only.
  - `imageError` is `upload.error ?? validation.errors.image ?? null`. It shows next to the upload, not in the outcome.

**Tests:**
- The mocks keep the rest of the bridge real, as `useRevealAdmin.test.ts` l.12-15 does. A bare `{useCardDataContext}` mock drops `ALL_INKS`, `inkBlock`, `REVEAL_SET_CODE` and `REVEAL_ID_BASE`, which `validateForm.ts` and `constants.ts` import. Vitest would then throw `No "REVEAL_SET_CODE" export is defined on the mock`.
- `vite.config.ts` has no `clearMocks`, so call counts would leak between tests:
```ts
// The context's card list; the rest of the bridge stays real (validateForm.ts and
// constants.ts read ALL_INKS, inkBlock, REVEAL_SET_CODE and REVEAL_ID_BASE from it).
const cards = vi.hoisted(() => ({list: [] as LorcanaCard[]}));
vi.mock('../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../app-bridge')>()),
  useCardDataContext: () => ({cards: cards.list}),
}));
// Each save test decides when its commit settles.
const commitCardImage = vi.hoisted(() => vi.fn());
vi.mock('../../image/githubClient', () => ({commitCardImage}));
const {commitCardEdit, readPreviewCards} = vi.hoisted(() => ({commitCardEdit: vi.fn(), readPreviewCards: vi.fn()}));
vi.mock('../../reveal/githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../reveal/githubClient')>()),
  commitCardEdit,
  readPreviewCards,
}));

import {useCardEditor} from '../useCardEditor';

// No clearMocks in vite.config.ts: call counts would carry over between tests.
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
```
- The five ported image-tool cases. The hook renders with `initialProps: {cardId}`, and a card switch is a `rerender`:
  - A different card clears the staged image.
  - One file's bytes are never paired with another file's name.
  - Saving clears the card's image once the commit lands.
  - A card picked while the save ran is kept, with its form and image.
  - A read that finishes after a card switch is dropped.
- A released card is image-only: `form` is null, and save calls `commitCardImage`, never `commitCardEdit`.
- A preview card with only a new image goes through `commitCardImage`.
- Field edits plus an image make one `commitCardEdit` call with both.
- English plus a rename sends `{scanLanguage: null, name, fullName, version}` (admin#14 item 3).
- After a fields save:
  - The change list is empty, and `readPreviewCards` is called again.
  - The next save diffs from what was committed.
- After a save, leave the card and reopen it. The second read returns the committed entry, and the next save diffs from it: `loaded` equals the committed entry, so the base check passes.
- A save rejected with `StaleCardError` sets `stale`. `loadAgain()` re-reads, and the draft re-seeds from the fresh entry once that read lands, not before.
- Lookup states:
  - An unknown id is `missing`.
  - An unreadable `previewCards.json` is `error`, and `retry` re-reads it.
- Save stays disabled while validation fails.

- [ ] **Step 1: Write the failing tests.** Run `pnpm vitest run src/tools/studio/__tests__/useCardEditor.test.ts`. Expected: FAIL, with `Failed to resolve import "../useCardEditor"`.
- [ ] **Step 2: Implement.** Keep the branching in `cardEdit.ts`, and leave the hook as wiring, as `useRevealAdmin` does. Run the same command. Expected: PASS.
- [ ] **Step 3: Lint and typecheck.** `pnpm lint` and `pnpm typecheck` are clean. The draft reset above passes `react-hooks/refs` and `react-hooks/set-state-in-effect`.
- [ ] **Step 4: Commit.** Run with the Bash tool, only after the owner approves:
```bash
git add src/tools/studio/usePreviewCardsFile.ts src/tools/studio/useCardEditor.ts src/tools/studio/__tests__/useCardEditor.test.ts
USER_APPROVED=1 git commit -m "feat(studio): add the Edit card controller (#24)"
```

### Task R4-5: Studio components, paths and layout

**Files:**
- Create: `src/tools/studio/studioPaths.ts`, `src/tools/studio/studioLayout.ts`
- Create in `src/tools/studio/components/`:
  - `StudioForm.tsx`, `FormSection.tsx`
  - `Field.tsx`: ports `errorId`, `controlProps` and `Field` from `RevealAdminForm.tsx` l.32-68
  - `IdentitySection.tsx`, `InkRaritySection.tsx`, `InkPicker.tsx`, `TypeStatsSection.tsx`, `CardTextSection.tsx`
  - `StudioCardPanel.tsx`, `ReadyChecklist.tsx`, `ChangeList.tsx`, `CommitOutcome.tsx`, `EditSearch.tsx`, `EditingBanner.tsx`, `ReleasedCardFacts.tsx`
  - a `*.stories.tsx` file for the form, the card panel, the checklist, the change list and the search
- Create: `src/tools/studio/StudioStyles.tsx`
- Modify: `src/theme/AdminStyles.tsx` (contract addition 2)
- Modify: `src/app-bridge.ts`. Append the four exports of contract addition 1 after l.55 (`export {default as PINNED_PREVIEW_CARDS_JSON} …`).
- Tests:
  - `src/tools/studio/__tests__/{studioPaths,studioLayout}.test.ts`
  - `src/tools/studio/__tests__/{StudioForm,StudioFormCardText,StudioCardPanel,StudioAside,EditSearch}.test.tsx`

**Interfaces:**
- Consumes:
  - R1: `SegmentedControl`, `MeterBar`, `Notice`, `ADMIN_*`
  - the bridged `CardTile`, `CardTranslationPanel`, `smallImageUrl`, `InkIcon`, `InkwellIcon`, `RaritySymbol`, `enchantedSymbol`, `LinkButton`
  - `useHiddenFileInput`
  - `RARITIES`, `CARD_TYPES`, `SCAN_LANGUAGES`, `FEATURED_FRANCHISE_HINT`, `STAT_FIELDS`
  - `canonicalizeCardFullText`
  - `targetBranch`, `goLiveNote`
- Produces:
```ts
// src/tools/studio/studioPaths.ts
export type StudioMode = 'new' | 'edit';
/** '/studio', '/studio?card=14023', '/studio?mode=edit', '/studio?mode=edit&card=14023'. A mode switch keeps the card. */
export function studioHref(mode: StudioMode, cardId?: string | null): string;
export function studioModeOf(params: URLSearchParams): StudioMode;
/** Leaving /studio blocks on either draft; another card (or none) blocks on the Edit draft; a mode switch never blocks. */
export function shouldBlockStudioNavigation(current: {pathname: string; search: string}, next: {pathname: string; search: string}, dirty: {reveal: boolean; edit: boolean}): boolean;

// src/tools/studio/studioLayout.ts
export const STUDIO_WIDE_MIN = 1360;
export type StudioLayout = 'wide' | 'narrow';
export function studioLayout(width: number): StudioLayout;   // 0 (unmeasured) is narrow

// src/tools/studio/components
export function StudioForm(props: {form: RevealCardForm; errors: Record<string, string>; onChange: (patch: Partial<RevealCardForm>) => void; layout: StudioLayout; locked?: ReadonlySet<keyof RevealCardForm>}): JSX.Element;
export function StudioCardPanel(props: {card: LorcanaCard | null; mode: StudioMode; currentImageUrl: string | null; stagedName: string | null; imageError: string | null; layout: StudioLayout; onImageChange: (file: File | null) => void; onRevertImage: () => void}): JSX.Element;
export function ReadyChecklist(props: {items: ChecklistItem[]}): JSX.Element;
export function ChangeList(props: {rows: ChangeRow[]; onDiscard: () => void}): JSX.Element;
export function CommitOutcome(props: {result: CommitResult | null; error: string | null; note: string; onLoadAgain?: () => void}): JSX.Element | null;
export function EditSearch(props: {cards: LorcanaCard[]; previewIds: ReadonlySet<number>; status: 'loading' | 'ready' | 'error'; error: string | null; onRetry: () => void}): JSX.Element;
export function EditingBanner(props: {card: LorcanaCard; tag: CardTag}): JSX.Element;
export function ReleasedCardFacts(props: {card: LorcanaCard}): JSX.Element;
```

**Controls.** The labels keep today's strings, so the ported label queries still work ("Name", "Version (subtitle)", "Cost", "Strength", "Move cost", "Scan language").
- **Field errors.** Every error shows next to its control, wired with `aria-invalid` and `aria-describedby` (`Field`, `controlProps`).
- **Ink.**
  - `InkPicker` renders `adm-card-btn adm-ink-tile` buttons. Each is `aria-pressed`, with the ink as its `aria-label`.
  - The buttons sit in a `role="group"` with `aria-labelledby="field-ink-label"`, pointing at its visible "Ink" label.
  - The ink error (`field-ink-error`) describes the group. The second-ink group works the same way with `ink2`.
- **Dual ink.** The switch can't be derived from `ink2` alone: turning it on leaves `ink2: ''`, so a switch computed from `ink2` would flip straight back to off. `InkRaritySection` keeps its own open state:
  ```tsx
  const [dualOpen, setDualOpen] = useState(false);
  const dual = dualOpen || form.ink2 !== '';
  // …
  <label>
    <input
      type="checkbox"
      role="switch"
      className="adm-switch"
      checked={dual}
      onChange={(e) => {
        setDualOpen(e.target.checked);
        if (!e.target.checked) onChange({ink2: ''});
      }}
    />
    Dual-ink card
  </label>
  ```
  The second-ink group shows while `dual` is true. While it is on with no second ink picked, the hint says the card publishes as single-ink.
- **Rarity.** `aria-pressed` buttons for `RARITIES` (no Epic or Iconic), with **None** first, which clears the rarity.
- **Type.** `SegmentedControl<CardType>`.
- **Inkable.** Two `aria-pressed` buttons, Inkable and Uninkable, each with an `InkwellIcon`.
- **Cost.**
  - A text input labelled "Cost", with `inputMode="numeric"`, holds the raw string, so the validator still rejects `1.5`.
  - Beside it is a 0–10 slider with its own name, so `getByLabelText('Cost')` finds one control.
  - While the cost is blank, the slider shows no thumb and reads "Not set", not "0". A press on it sets 0 first, so 0 can be reached.
  ```tsx
  const unset = form.cost === '';
  // …
  <input
    type="range"
    className="adm-range"
    min={0}
    max={10}
    step={1}
    aria-label="Cost slider"
    aria-valuetext={unset ? 'Not set' : undefined}
    data-unset={unset ? 'true' : undefined}
    value={Math.min(10, Number(form.cost) || 0)}
    onPointerDown={() => {
      if (unset) onChange({cost: '0'});
    }}
    onChange={(e) => onChange({cost: e.target.value})}
  />
  ```
- **Card text.** The full text keeps `canonicalizeOnLeave` (`RevealAdminForm.tsx` l.76-83).
- **Franchise hint.** It renders `FEATURED_FRANCHISE_HINT`.
- **Scan language.** A code outside `SCAN_LANGUAGES` shows as its own option, labelled with the code.

**Accordion.**
- **Narrow:** headers are `adm-acc-head` buttons with `aria-expanded`, and one section is open at a time.
  - A closed header shows a one-line summary and a status dot from `sectionStatus`.
  - The dot is red, green or neutral, but the state is never shown by colour alone: an error header shows the error message as its summary.
- **Wide:** every section is open and its title is a plain heading, with no toggle.

**Card panel.**
- **Preview.** It keeps `CardTile`, plus `CardTranslationPanel` when the scan isn't English. The striped placeholder shows only while there is no card to preview.
- **Upload controls.** Both are `useHiddenFileInput` labels that accept `image/jpeg,image/png,image/webp`: the preview overlay, and in Edit an `adm-file-btn` labelled "Replace card image".
- **Image error.** `imageError` renders below the controls with `id="field-image-error"`. While it is set, both file inputs carry `aria-describedby="field-image-error"` and `aria-invalid`. This is how "every validator message next to its control" reaches the image.
- **While an image is staged:**
  - In Edit, a "Current" thumbnail (`smallImageUrl`) sits beside the preview.
  - "Revert image" appears.
  - The note reads "New image staged (name). It replaces the current art when you save."

**Aside.**
- **Order.** Each mode's aside ends with `<SynergyPreviewPanel groups={ctrl.synergyGroups} />` (New) or `<SynergyPreviewPanel groups={edit.synergyGroups} />` (Edit). Publish or Save sits below it, and `CommitOutcome` below that.
- **`ReadyChecklist`:** "Ready to publish N/7" with a `MeterBar`.
- **`ChangeList`:**
  - each row is its `label` with `<code>old → new</code>`, with "Image: replaced" last
  - Discard is a `LinkButton`
  - an empty-state line shows when there are no changes
- **`CommitOutcome`:**
  - Success is `role="status"`: "Committed.", then `note`, then a "View commit" link.
  - Failure is `role="alert"`, using `Notice tone="error"`. With `onLoadAgain`, it ends with a **Load it again** `LinkButton`.
- **`ReleasedCardFacts`:** a `<dl>` of the card's fields, then the note "Card data comes from LorcanaJSON; only the image can be replaced here."

**Edit search and banner.**
- **Search rows.** Each row is a react-router `Link` to `studioHref('edit', id)`, showing:
  - a thumbnail
  - name and version
  - its `InkIcon`s, not decorative, so they carry the ink names
  - its rarity symbol
  - `#setNumber`
  - a Preview or Released tag (`searchCards`)
- **Search copy.** "N cards", or "N cards match", plus "showing the first 40" when capped. With no matches: `No cards match "q".`
- **`EditingBanner`.**
  - The card's name and version, `#num`, and its tag.
  - Links: "View card analytics" (`/cards/{id}`) and "Load a different card" (`studioHref('edit')`).

**Tests:**
- `studioPaths.test.ts`:
  - `studioHref` table:
    - `('new')` gives `'/studio'`
    - `('new', '14023')` gives `'/studio?card=14023'`
    - `('edit')` gives `'/studio?mode=edit'`
    - `('edit', '14023')` gives `'/studio?mode=edit&card=14023'`
  - `studioModeOf`: `?mode=edit` is `'edit'`, and anything else is `'new'`.
  - `shouldBlockStudioNavigation` table:
    - Leaving `/studio` for `/` blocks on either draft, and passes when both are clean.
    - `?mode=edit&card=1` to `?mode=edit&card=2` blocks on the Edit draft only.
    - `?mode=edit&card=1` to `?mode=edit` (no card) blocks on the Edit draft.
    - `?mode=edit&card=14023` to `?card=14023` (`studioHref('new', '14023')`) never blocks, even with both drafts dirty.
    - `/studio` to `?mode=edit` never blocks.
- `studioLayout.test.ts`: 0 and 1359 are narrow; 1360 is wide.
- **The form harness.** `StudioForm` is controlled, so its tests render it through a stateful `Harness`, as `RevealAdminFormCardText.test.tsx` does. Ported cases use `layout="wide"`, because in narrow layout only one section is open, so a field such as "Strength" may be absent:
  ```tsx
  /** StudioForm is controlled: the harness holds the form, as the page does. */
  function Harness({layout = 'wide', errors = {}, initial = {}}: {layout?: StudioLayout; errors?: Record<string, string>; initial?: Partial<RevealCardForm>}) {
    const [form, setForm] = useState<RevealCardForm>({...EMPTY, ...initial});
    return <StudioForm form={form} errors={errors} layout={layout} onChange={(patch) => setForm((f) => ({...f, ...patch}))} />;
  }
  ```
- `StudioForm`, ported:
  - It ties each error to its control. The ink error describes `getByRole('group', {name: 'Ink'})`.
  - It shows the stats the card's type prints, after clicking the Location button in the harness.
  - It picks the scan language, English unless changed.
- `StudioForm`, new (wide unless stated):
  - The chosen ink is pressed.
  - The second-ink group shows only while Dual-ink is on. Switching it on with no second ink keeps it on, and switching it off clears the second ink.
  - None clears the rarity.
  - The Cost box and "Cost slider" are separate controls. A blank cost's slider reads "Not set".
  - Narrow: one section is open at a time, and a closed section with an error shows the message in its header.
  - Wide: every section is open, with no toggles.
  - The collector number is read-only when `locked` holds it.
  - An unlisted scan language shows as its own option.
- `StudioFormCardText`: the two `RevealAdminFormCardText` cases, ported with that file's harness: rewrite on moving to another control; untouched when the window loses focus. Its comment on how 14192 was typed (#635) stays as history.
- `StudioCardPanel`:
  - Ported from `CardPreviewPanel`: it shows what "See translation" will show for a scan that isn't English.
  - The upload is keyboard-reachable, named, and limited to JPEG, PNG and WebP.
  - An image error describes the upload control: `toHaveAccessibleDescription(…)` on the file input.
  - In Edit with an image staged, it shows Replace card image, the current-art thumbnail and Revert image.
- `StudioAside`:
  - The checklist counts and shows the open items' messages.
  - The change list ends with the Image row, and Discard calls back.
  - Success is a status with the commit link and the note.
  - Failure is an alert. With `onLoadAgain`, it offers Load it again.
- `EditSearch`, rendered inside `createMemoryRouter`:
  - Rows link to the card and carry Preview or Released tags.
  - Typing `anna` leaves only Anna's row. This ports `CardImagePicker`'s "narrows the list as you search".
  - With no match, it shows `No cards match "q".`
  - Loading, and an error with Retry.

- [ ] **Step 1: Write the failing tests.** Run `pnpm vitest run src/tools/studio/__tests__/studioPaths.test.ts src/tools/studio/__tests__/studioLayout.test.ts src/tools/studio/__tests__/StudioForm.test.tsx src/tools/studio/__tests__/StudioFormCardText.test.tsx src/tools/studio/__tests__/StudioCardPanel.test.tsx src/tools/studio/__tests__/StudioAside.test.tsx src/tools/studio/__tests__/EditSearch.test.tsx`. Expected: FAIL, with `Failed to resolve import "../studioPaths"` and `Failed to resolve import "../components/StudioForm"`.
- [ ] **Step 2: Implement the paths, layout, bridge exports, components, styles and stories.**
  - Run the same command. Expected: PASS.
  - Then run `pnpm vitest run scripts/reveal-sync/web.test.mjs`. Expected: PASS. The bridge, which now imports SVG and WebP assets, still loads under the Vite runner.
- [ ] **Step 3: Lint and typecheck.** `pnpm lint` and `pnpm typecheck` are clean. Check the stories with `pnpm storybook`.
- [ ] **Step 4: Commit.** Run with the Bash tool, only after the owner approves:
```bash
git add src/app-bridge.ts src/tools/studio/studioPaths.ts src/tools/studio/studioLayout.ts src/tools/studio/components src/tools/studio/StudioStyles.tsx src/theme/AdminStyles.tsx src/tools/studio/__tests__
USER_APPROVED=1 git commit -m "feat(studio): add the Card studio form, card panel and aside (#24)"
```

### Task R4-6: Studio page, unsaved guard, routes

**Files:**
- Create in `src/tools/studio/`: `useUnsavedGuard.ts`, `StudioPage.tsx`
- Test (create): `src/tools/studio/__tests__/StudioPage.test.tsx`
- Modify `src/router.tsx`, as R1 left it:
  - Delete the page imports (l.7-8 today):
    ```tsx
    import {ImagePage} from './tools/image/ImagePage';
    import {RevealPage} from './tools/reveal/RevealPage';
    ```
  - Add `Navigate` to the `react-router-dom` import, unless R1 already did. Add `import {StudioPage} from './tools/studio/StudioPage';` and `import {studioHref} from './tools/studio/studioPaths';`.
  - Replace `{path: 'reveal', element: <RevealPage />},` and `{path: 'image', element: <ImagePage />},` (l.17-18 today) with the routes below.
- Modify `src/shell/nav.ts`: the publish-group items with `path: '/reveal'` and `path: '/image'` become `{id: 'studio', label: 'Card studio', mark: 'Cs', path: '/studio', group: 'publish', writes: true}`.
- Test (modify): `src/router.test.tsx` and `src/shell/nav.test.ts` (R1's nav test).
- Modify R3's "Edit in Card studio" link, in the card header R3 builds under `src/tools/analytics/cards/`. `rg -l "Edit in Card studio" src` names the file. It moves to `studioHref('edit', card.id)`.
- Modify `src/tools/reveal/index.ts` and `src/tools/image/index.ts`: drop the exports of the deleted modules.
  - reveal: `RevealAdminForm`, `CardPreviewPanel`
  - image: `useImageAdmin`, `ImageAdminController`, `CardImagePicker`, `ImageComparePanel`, `UploadColumn`
- Delete: the list in the phase intro.

**Interfaces:**
- Consumes:
  - R1: `PageLayout` (`writes`, `actions`), `SegmentedControl`, the shared `useGithubToken`
  - `GithubTokenGate` (existing, `src/github/GithubTokenGate.tsx`)
  - `useContainerWidth` (bridged)
  - `useRevealAdmin`, `useCardEditor`, `revealChecklist`, `goLiveNote`, `targetBranch`
  - the R4-5 components, `studioPaths.ts` and `studioLayout.ts`
- Produces:
```ts
export function useUnsavedGuard(shouldBlock: BlockerFunction, anyDirty: boolean, message: string): void;
export function StudioPage(): JSX.Element;
```
```tsx
{path: 'studio', element: <StudioPage />},
// Old links (bookmarks, runbooks, the app's season runbook) land in the studio (R-10).
{path: 'reveal', element: <Navigate to={studioHref('new')} replace />},
{path: 'image', element: <Navigate to={studioHref('edit')} replace />},
```

**The page.**
- **The gate.** With no token saved, `StudioPage` renders only `<GithubTokenGate title="Card studio" onSave={setToken} />`, as today's pages do. There is no `PageLayout`, so no branch notice and no second "Card studio" heading.
- **The workspace.** With a token, it renders `StudioWorkspace` inside `PageLayout title="Card studio" writes`.
- **The measured container.** It is `StudioWorkspace`'s root element. That element is present in every mode and state: search, form, released facts, loading.
  - `useContainerWidth(containerRef)` observes the element it finds on mount (its effect depends only on `[ref]`). An element swapped in later would stop updating, so nothing conditional takes the ref.
  - The hook uses a ResizeObserver, so a sidebar collapse switches the layout too.
- **Both modes stay mounted.** `StudioWorkspace` calls both `useRevealAdmin()` and `useCardEditor(token, card)`, so a mode switch keeps both drafts.
- **Mode switch.** The mode `SegmentedControl` sits in `PageLayout` `actions`. A change navigates to `studioHref(mode, card)`, which keeps `card`. Picking the current mode does nothing.
- **Wide layout** (`STUDIO_WIDE_MIN` and up): the grid `minmax(320px,400px) minmax(0,1fr) minmax(0,1fr) 280px`.
- **Narrow layout:** the flex-wrap from the spec.
- **DOM order.** Form, then card, then aside, at both widths.
- **Edit with no card.** It shows `EditSearch`.
- **Released cards.** They show `ReleasedCardFacts` in place of the form.
- **Image errors.**
  - New: `StudioCardPanel` gets `imageError={ctrl.uploadError ?? ctrl.validation.errors.image ?? null}`, and `CommitOutcome` gets `ctrl.publishError` unless it is just the upload error (`ctrl.publishError === ctrl.uploadError`).
  - Edit: the panel gets `edit.imageError`, and `CommitOutcome` gets `edit.saveError`, with `onLoadAgain={edit.stale ? edit.loadAgain : undefined}`.
- **Button labels.**
  - New reveal: `Publish to ${targetBranch()}`, then `Publishing…` while it runs.
  - Edit: `Save changes to ${targetBranch()}`, then `Saving…` while it runs.
- **Go-live notes.** They are today's strings:
  - New reveal keeps today's publish note: `goLiveNote('Vercel is deploying (~2-3 min).')`.
  - In Edit, a fields-only save uses that same note.
  - Any Edit save that includes an image uses the image note: `goLiveNote('The new image goes live after the convert workflow runs and Vercel redeploys (~a few minutes).')`.

**The unsaved guard.**
- `useUnsavedGuard` wraps `useBlocker` with a `window.confirm`.
- While anything is dirty, it also adds a `beforeunload` listener.
- The confirm message names what would be lost.
- `StudioWorkspace` passes `shouldBlockStudioNavigation` with `{reveal: ctrl.dirty, edit: edit.dirty}`.

**Tests:**
- `StudioPage`, through `createMemoryRouter`, with fetch stubbed:
  - The token mock is mutable, so one test can show the gate.
  - The bridge mock keeps `importOriginal`.
  - Every global, env stub and spy is restored after each test.
  ```tsx
  const saved = vi.hoisted(() => ({token: 'tok' as string | null}));
  vi.mock('../../../github/useGithubToken', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../github/useGithubToken')>()),
    useGithubToken: () => ({token: saved.token, setToken: () => {}, clearToken: () => {}}),
  }));
  const cards = vi.hoisted(() => ({list: [] as LorcanaCard[]}));
  vi.mock('../../../app-bridge', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../app-bridge')>()),
    useCardDataContext: () => ({cards: cards.list}),
  }));

  import {StudioPage} from '../StudioPage';

  afterEach(() => {
    saved.token = 'tok';
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  ```
  - It asks for a token first: `saved.token = null`, then the heading "Card studio".
  - The New reveal draft survives a switch to Edit and back.
  - Picking the current mode changes nothing.
  - It lays out wide at 1360 and narrow below. This uses a `ResizeObserver` stubbed with `vi.stubGlobal`, firing on the root element.
  - Leaving with a dirty draft asks, and stays put on cancel (`vi.spyOn(window, 'confirm').mockReturnValue(false)`).
  - Loading another card over unsaved edits asks. A mode switch never asks.
  - `?mode=edit&card=<id>` opens that card. An unknown id says so and links back to the search.
  - The buttons name a rehearsal branch (`vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', …)`).
  - An Edit save with an image shows the image note.
- `src/router.test.tsx`:
  - It gets a mutable token mock, null by default, so the existing gate cases still see the gate:
  ```tsx
  // No token by default, so write pages show the gate; a test that needs the page itself saves one.
  const saved = vi.hoisted(() => ({token: null as string | null}));
  vi.mock('./github/useGithubToken', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./github/useGithubToken')>()),
    useGithubToken: () => ({token: saved.token, setToken: () => {}, clearToken: () => {}}),
  }));
  ```
  `renderAt` returns its router, and `afterEach` adds `saved.token = null`.
  - `/studio` with no token asks for one under the heading "Card studio".
  - `/reveal` lands on `/studio`, and `/image` on `/studio` with search `?mode=edit`. The test asserts on `router.state.location`.
  - The sidebar links Card studio to `/studio`, with `aria-current="page"` at `/studio?mode=edit`.
  - With `saved.token = 'tok'`, `/studio` shows the branch notice naming `master`.
  - Removed: the old `/reveal` and `/image` gate cases.
- `src/shell/nav.test.ts`: `isWritePath('/studio')` is true, and no item's path is `/reveal` or `/image`.

- [ ] **Step 1: Write the failing tests.** Run `pnpm vitest run src/tools/studio/__tests__/StudioPage.test.tsx src/router.test.tsx src/shell/nav.test.ts`. Expected: FAIL, with `Failed to resolve import "../StudioPage"`.
- [ ] **Step 2: Implement, wire the routes and nav, move R3's link, and delete the old pages and components.** Run `pnpm test:run`. Expected: PASS, including `scripts/reveal-sync`.
- [ ] **Step 3: Check that no old route is left.** Both commands are expected to print exactly what is listed:
  - `rg -n "['\"\`]/(reveal|image)\b" src` finds only the redirect cases in `src/router.test.tsx`.
  - `rg -n "path: '(reveal|image)'" src` finds only the two redirects in `src/router.tsx`.
- [ ] **Step 4: Lint, typecheck, build and rehearse.**
  - `pnpm lint`, `pnpm typecheck` and `pnpm build` are clean.
  - Run `pnpm dev` with `VITE_ADMIN_TARGET_BRANCH` set to a throwaway branch made from `master`. The search list comes from inkweave.ink, so the cards to edit are ones on both:
    1. Publish a new card in New reveal.
    2. Edit an existing preview card: rename it, set Japanese, and save.
    3. Set it back to English with a new image, and save: one commit with both. The second save must not be refused as stale.
    4. Replace a released card's image.
- [ ] **Step 5: Commit.** First, `git status --short src` shows nothing unstaged after the `git add`. Run with the Bash tool, only after the owner approves:
```bash
git add -A src/tools/studio src/router.tsx src/router.test.tsx src/shell src/tools/reveal src/tools/image src/components src/tools/analytics/cards
USER_APPROVED=1 git commit -m "feat(studio): open Card studio at /studio and redirect /reveal and /image (#24)"
```

### Task R4-7: Docs, skills, reveal-sync wording and admin#14

**Files:**
- Modify `docs/REVEAL_RUNBOOK.md`:
  - l.24 heading: "One card at a time: Card studio (New reveal)"
  - l.29: the URL becomes `https://inkweave-admin.vercel.app/studio`
  - l.34: "The publisher commits to `master`" becomes "Card studio commits to `master`"
  - l.43: "the reveal publisher requires a number" becomes "Card studio's New reveal requires a number"
  - l.48: "The reveal publisher rejects an ink" becomes "Card studio rejects an ink"
  - l.52: "the reveal publisher rewrites what it can" becomes "Card studio rewrites what it can"
  - l.56: "`/fetch-reveals` and the reveal publisher do not handle variants" becomes "`/fetch-reveals` and Card studio do not handle variants (Edit card keeps a card's `variants` as they are)"
  - a new section after l.36, "Editing a card, and refreshing it to its English scan", covering:
    - Edit card's two cases: a preview card gets fields plus image; a released card gets its image only
    - one commit for both
    - English deletes `scanLanguage`
    - a rename keeps the card's id
    - the "changed since you loaded it" refusal and **Load it again**
  - l.80 "Two writers": "Card studio commits every few minutes (New reveal publishes and Edit card saves)"
  - l.90: "the first Card studio publish"
- Modify `.claude/skills/fetch-reveals/SKILL.md`:
  - l.67: "published through the reveal publisher" becomes "published or edited in Card studio"
  - l.259-260: "Add it by hand in Card studio's New reveal (https://inkweave-admin.vercel.app/studio)"
  - l.273, 317 and 319: "the reveal publisher", "admin's reveal publisher" and "The publisher's" become "Card studio's New reveal"
  - l.323-325: "refresh the card in Card studio's Edit card: load it, replace the image with the English scan, set Scan language to English, and fix the name and text; one commit drops `scanLanguage`"
- Modify `scripts/reveal-sync/write.mjs` l.46: "probably a card published through the reveal publisher" becomes "probably a card published or edited in Card studio". No test asserts the string.
- Modify `scripts/reveal-sync/publish.mjs` l.44 (the PR body): "went through the reveal publisher's validation" becomes "went through Card studio's validation".
- Modify these comments and one test name, with no behaviour change:
  - `scripts/reveal-sync/web.mjs` l.3 and l.61: "the reveal publisher" becomes "Card studio's New reveal"
  - `scripts/reveal-sync/web.test.mjs` l.19: `"loads the reveal publisher's write chain"` becomes `"loads Card studio's write chain"`
  - `scripts/reveal-sync/write-chain.test.mjs` l.3 and `scripts/reveal-sync/text.mjs` l.12: the same rename
- Modify `src/vite-env.d.ts` l.5: "App branch the reveal, image and tuning tools read from and commit to" becomes "App branch Card studio and tuning read from and commit to".
- Modify `CLAUDE.md`, "The tools":
  - The tools list adds `studio`.
  - "The reveal, image and tuning tools commit…" becomes "Card studio and tuning commit…".
  - "Reveal and tuning also read the files they edit" becomes "Card studio (Edit card, and New reveal at commit time) and tuning read the files they edit".
- Modify `docs/PLAN.md`: the D10 row (l.73) notes `/studio` and the two redirects.
- Outside the repo, not in the PR (the owner approves this edit separately): `~/.claude/skills/scan-reveal-card/SKILL.md`.
  - l.3 (description) and l.8: `/reveal` becomes `/studio`, and "reveal publisher" becomes "Card studio".
  - l.6 heading: "Scan reveal card → Card studio form fields".
  - l.24: "it mirrors Card studio's New reveal form".
  - The field table (l.26-40) follows the studio's sections: Identity, then Ink & rarity, Type & stats, Card text.
  - l.51 and l.59: "The publisher" becomes "Card studio".
  - l.57: "CANNOT go through Card studio".
  - Rule 6 (l.59) also points the English refresh at Edit card.

- [ ] **Step 1: Check for stale references.**
  - Run `rg -n "vercel\.app/(reveal|image)\b|reveal publisher|publisher's|image tool" .claude docs CLAUDE.md scripts src --glob '!docs/plans/**' --glob '!docs/redesign/**' --glob '!docs/PLAN.md'`. Only history is left:
    - `src/github/useGithubToken.ts` (why the storage key keeps its reveal-admin name)
    - the #635 comment in `src/tools/studio/__tests__/StudioFormCardText.test.tsx`
  - Then run `rg -n "publisher|/reveal\b" ~/.claude/skills/scan-reveal-card/SKILL.md`. It finds nothing.
- [ ] **Step 2: Run reveal-sync.** `pnpm vitest run scripts/reveal-sync`. Expected: PASS, with the renamed web test.
- [ ] **Step 3: Commit.** Run with the Bash tool, only after the owner approves:
```bash
git add docs/REVEAL_RUNBOOK.md .claude/skills/fetch-reveals/SKILL.md CLAUDE.md docs/PLAN.md scripts/reveal-sync/write.mjs scripts/reveal-sync/publish.mjs scripts/reveal-sync/web.mjs scripts/reveal-sync/web.test.mjs scripts/reveal-sync/write-chain.test.mjs scripts/reveal-sync/text.mjs src/vite-env.d.ts
USER_APPROVED=1 git commit -m "docs(studio): point the runbook, skills and reveal-sync wording at Card studio (#24)"
```
- [ ] **Step 4: Close admin#14 by hand.**
  - The R4 PR body says it delivers admin#14 item 3. After opening the PR, run `gh pr view <n> --json closingIssuesReferences`.
  - Closing keywords stopped linking on 2026-09-30, so after the merge run `gh issue view 14 --json state`.
  - If the issue is still open, and the owner approves, close it with `gh issue close 14 --reason completed --comment "Item 3 shipped in #<n> (<merge sha>)"`.
- [ ] **Step 5: Retire the design handoff (owner, 2026-10-01: delete it once it is no longer needed).** Do this after the R4 PR merges, when no phase still cites the prototype.
  - Move `docs/redesign/` to the Recycle Bin (PowerShell: `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory('D:\johnn\Projects\inkweave-admin\docs\redesign', 'OnlyErrorDialogs', 'SendToRecycleBin')`). Ask the owner whether the original download, `C:\Users\johnn\Downloads\design_handoff_admin_redesign`, should go the same way.
  - Remove the two `docs/redesign/` lines (the comment and the path) from `.git/info/exclude`.
  - In `eslint.config.js`, remove `docs/redesign` from the global ignores and its comment (R1-1 Step 9), then run `pnpm lint`.
  - In `docs/plans/R-redesign.md`, change the **Spec** line's last sentence to "The handoff was deleted after R4 shipped (owner, 2026-10-01)."
  - Commit on a branch with the owner's approval: `git add eslint.config.js docs/plans/R-redesign.md` then `USER_APPROVED=1 git commit -m "chore(redesign): retire the design handoff (#24)"`.

**Open questions**
1. **Mode switch.** R4 keeps both drafts across a switch, so it never prompts. If the owner prefers a confirm on switch, `StudioWorkspace` unmounts the inactive mode, and `shouldBlockStudioNavigation` also blocks on `mode`.
2. **Unlisted scan languages.**
   - The owner's notes record a hand-marked `fr` card on `master` on 2026-10-01; inkweave#683 refreshed it to English.
   - R4 shows any unlisted code as its own option and writes it back unchanged.
   - Adding French to `SCAN_LANGUAGES` would mean editing `constants.ts`, a reveal-sync contract file, and checking the app's `reveal-set-integrity` code check.
3. **Released cards.** R4 shows their fields as a read-only `<dl>` with the LorcanaJSON note, not as a disabled copy of the form. Is that acceptable?
4. **"View card analytics".** R4 links to `/cards/{id}`. Align this with the path R3 ships, and with its path helper if it has one.
5. **App-repo docs.** These need an app-repo docs PR, or can be left:
   - `START_REVEAL_SEASON.md:128` in the app links `/reveal`, and the redirect covers it.
   - The app's `CLAUDE.md` lists every module admin bridges, and the icons and `enchanted.webp` join that list in R4-5.
6. **Tab order at wide widths.** The wide grid shows the card first, but the DOM, and so the tab order, runs form, card, aside. Accept that, or put the card first in the DOM at wide widths?
7. **Image-only preview cards.** A preview card outside `REVEAL_SET_CODE`, or one in the reserved `+900..+999` band with no `number`, opens image-only. The pinned file has neither: all 170 are set 14 and numbered.
8. **Rehearsal mismatch.**
   - Edit reads `previewCards.json` from the target branch, but the search list comes from `inkweave.ink`. During a rehearsal, a card that exists only on the rehearsal branch can't be found or opened, which is why R4-6's rehearsal edits a card that is on both.
   - The alternative is to fall back to `transformCard(entry)` from the branch file when an id isn't in the context list. That would also let an operator open a card right after publishing it, before the deploy lands. Is that worth adding?

<!-- adjusted: note 16's check `rg -n "'/(reveal|image)'" src` can't find the redirects, because router.tsx writes its paths without a leading slash (`path: 'reveal'`), and router.test.tsx keeps '/reveal' and '/image' in its redirect cases. R4-6 Step 3 uses two commands instead: one for quoted route strings, one for `path:` entries. -->
<!-- adjusted: note 4's reset is kept, with a `seed` guard in place of the cardId comparison and a `read`/`follow` pair for note 6. With a cardId check, a save landing after the operator left the card and came back would apply to a draft re-seeded from the old file. -->
<!-- adjusted: note 7 takes the first option (rehearse on a card that is on both inkweave.ink and the branch). The branch-file fallback stays open question 8. -->
<!-- adjusted: note 12 needs the reveal controller's upload error on its own, so contract addition 4 adds `uploadError`. `publishError` is unchanged. -->
