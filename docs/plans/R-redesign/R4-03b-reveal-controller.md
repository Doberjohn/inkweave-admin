> Part of [R: Admin redesign](../R-redesign.md), phase R4 ([R4-card-studio.md](R4-card-studio.md)). Read the main plan's decisions (R-57 to R-91 for R4), corrections, global constraints and shared interfaces, then the R4 header, first.

> **Re-base notes (R4-3b, 2026-10-07).** Re-based from the 2026-10-01 outline ("Task R4-3: New reveal readiness and controller additions", R4-card-studio.md:325-412) onto `main @ e5e5029` with pin `upstream/inkweave` @ `16283a13`, on branch `feature/24-redesign-r4`. Decisions R-57 to R-91 apply, and so does the R4 audit (`.superpowers/sdd/R-redesign/r4-audit-synth.md`, "R4-3"; `r4-audit-full.json`, audits[2]). What changed and why:
> 1. **The split.** This is the second half of outline Task R4-3. R4-3a builds the pure readiness model: `readiness.ts`, the `intField` export, R-73's past-the-set refusal, `EMPTY_FORM` and `sameForm` (in `src/tools/reveal/emptyForm.ts`), `visibleImageError`, and `src/test/revealForm.ts`. This task does three things:
>    - It moves the live-preview code out of the hook.
>    - It adds the controller's read-only fields.
>    - It writes the invariant tests, which need both halves.
>
>    It touches no reveal-sync contract file.
> 2. **Line references, re-cited.** At `b490fb7` the outline's references have drifted, and the pin bump moves no admin source. R4-3a then moves `EMPTY_FORM` (:15-34) out to `emptyForm.ts` and imports it at :11, so this task starts from a file 20 lines shorter. In `useRevealAdmin.ts`, at `b490fb7` and then after R4-3a:
>    - `buildPreview` with its doc comment is at :36-45, then :16-25. `computeSynergies` is at :47-55, then :27-35. `readyToPublish` is at :57-69, then :37-49.
>    - `RevealAdminController` is at :71-85 (the outline said :71-86), then :51-65. The return is at :137-152 (the outline said :138-154), then :117-132. R1-7 (`196ef06`) removed `clearToken`.
>    - `publish`'s four guards are at :115-118, then :95-98. The reset after a publish is at :128-129, then :108-109.
>
>    Step 5 replaces the whole file, so only Step 1's check reads these numbers.
> 3. **Six fields, not four.** The outline's `imageName`, `imageDataUrl`, `uploadError` and `dirty` stay. Two are added:
>    - **`commitError`** is the commit failure alone. It is the state that `publishError` held before the fold. R4-6a's outcome passes it straight through. The outline's `ctrl.publishError === ctrl.uploadError` string comparison (R4-card-studio.md:866) goes (audit, cosmetic).
>    - **`imageError`** is the file controls' error under R-72. It comes from R4-3a's `visibleImageError`, as R4-3a's hand-off asks: null until a file is chosen ("Upload a card image" is the checklist's), then the file's own error, else the validator's. `imageErrorOf(image, validation)` in `livePreview.ts` adapts a controller's image, `{name, dataUrl, error}`, to that helper. R4-4b already imports it, and its `StagedImage` has that shape, so both controllers derive `imageError` the same way.
>    - **The order is R4-3a's.** R4-3a owns R-72's helper, and its test row "a refused name whose bytes failed too" pins the file's own error first. That keeps today's publisher's message, which says how to fix a misnamed file ("mei.gif holds a PNG image; rename it to end in .png."), where the validator says only "Image must be jpg, jpeg, png, or webp". `imageErrorOf` only delegates, so this task's tests follow that order. For a name the validator refuses, its message shows while the bytes are read, and the file's own replaces it once they fail.
>    - **Not the outline's `uploadError ?? validation.errors.image ?? null`** (R4-card-studio.md:866). It has the same order, but under R-72 it would put "Upload a card image" in red under a fresh form's controls. R4-5d's hand-off flagged that.
>
>    `publishError` still folds in the upload error (`commitError ?? upload.error`), because RevealPage reads it (RevealPage.tsx:44-46) until R4-6c deletes the page. Every field reads existing state. The hook adds no new state and no new effect.
> 4. **`dirty`** is `!sameForm(form, EMPTY_FORM) || upload.file !== null`, through R4-3a's key-wise `sameForm` in place of the outline's `JSON.stringify` pair.
>    - A chosen file counts while its bytes are read, and also after they fail the check: the operator picked it.
>    - A field edited back to its empty value is clean again.
>    - A publish that lands empties the form and clears the file (useRevealAdmin.ts:108-109 after R4-3a), so the controller reads clean afterwards. R2's guard then ends any navigation it holds as a stay, as it does whenever `dirty` turns false (useUnsavedChangesGuard.ts:39-42).
> 5. **Code Health: `readyToPublish` returns the publish's inputs.**
>    - **The problem.** `publish()` repeats `readyToPublish`'s four guards (:95-98 after R4-3a). The PR gate counts a function's inner lambdas toward its complexity (R3 header, "Code Health"). Counted that way, the hook is about 10 today (four guards, `catch`, a ternary and three `??`). `dirty`'s `||` would make a function that is already over 8 worse. The six new return lines would also bring the hook to 69 lines, against the 70-line Large Method threshold.
>    - **The change.** `readyToPublish` now returns `{token, imageBase64, imageExt}` or null, following useImageAdmin's `toPublishPayload` (useImageAdmin.ts:27-38). `canPublish` is `ready !== null`, and `publish` starts with `if (!ready) return;`.
>    - **The result.** The hook, publish and lambdas included, comes to 7 or less, in 62 lines. `readyToPublish` is cc 6, and the new `hasDraft` is cc 2.
>    - **Behaviour is identical.** It checks the same four conditions, read from the same render that `publish` closed over before, and applies the same extension rule, lowercased with `png` as the fallback.
>    - **The name stays,** so the main plan's correction ("derive from `validateRevealCardForm` and `readyToPublish`", R-redesign.md:111) and R4-3a's doc comment stay true.
>    - The private state is renamed `commitError`.
> 6. **Tests.**
>    - **Mocks.** They follow the house pattern: a `vi.hoisted` `commitNewCard`, a `vi.mock` that spreads `importOriginal` and keeps the rest of the client real (R4-1b's additions included), and a block-bodied `beforeEach` with `mockReset` (useLiveTuning.test.ts:17-20). Use `mockReset`, not `vi.clearAllMocks`: in Vitest 5, `mockClear` keeps implementations, including an unconsumed `mockRejectedValueOnce`. `vite.config.ts` sets no `clearMocks`. `vi.unstubAllGlobals()` stays in `afterEach`.
>    - **Clean after a publish.** The test takes the audit's steps: fill the form, choose a file, finish the `DeferredReader`, press Publish, then `waitFor` the result. `publish` is typed `() => void` and doesn't return its promise. The file is `Mei.WebP`, which pins the lowercased `imageExt` too.
>    - **The invariant.** The outline's test that `revealChecklist(…).every(done)` equals `canPublish` moves here, because it needs both halves. It is one `it.each` over seven states: empty, complete with no image, image still being read, a file that fails its byte check, the wrong ink block with the image read, ready, and just published. The token is mocked, so the checklist's "token aside" holds. The checklist's image argument is `{ready: ctrl.imageDataUrl !== null, error: ctrl.uploadError}`, R4-3a's `ImageStatus` wiring: its `error` is the upload's own, not `imageError`.
>    - **R-72 in the hook's tests.** A fresh form has no `imageError`, though the validator reports "Upload a card image". A refused name (`a.gif`) shows the validator's message while its bytes are read. Once they fail, `imageError` turns to the byte check's message, which `uploadError` and `publishError` carry too.
>    - **The existing tests.** The file's three tests stay verbatim.
>    - **New file.** `livePreview.test.ts` pins `imageErrorOf` in five rows: no file, a refused name whose bytes fail too, a refused name while its bytes are read, a taken name whose read failed, and a clean file.
> 7. **Gates, run once.** The steps run the targeted app tests, eslint on the four changed files and one `pnpm typecheck`, then Code Health. No reveal-sync run: this task touches none of `validateForm.ts`, `buildPreviewCard.ts`, `insertCardIntoPreviewJson.ts` or `constants.ts`, and R4-3a made the `intField` export. No `pnpm build` (R4-8 runs it).
> 8. **App facts, checked at 16283a13.**
>    - The engine's `transformCard` still sets neither `imageUrl` nor `scanLanguage` (packages/synergy-engine/src/utils/cardTransformer.ts:172-214).
>    - The app's private loader wrapper still copies `scanLanguage` (apps/web/src/features/cards/loader.ts:93-102), so `buildPreview`'s comment moves unchanged and stays true.
>    - `synergyEngine.findSynergies(card, allCards)` is unchanged.
>    - Nothing here goes through the bridge.
> 9. **The token stays in the hook (R-84).** `useRevealAdmin` keeps reading the shared token store, and keeps `token` and `setToken`, so RevealPage, which mounts it above its gate (RevealPage.tsx:80), works until R4-6c. Under the studio's gate (R4-6a), the token is always set. The workspace is keyed by token, so Forget token drops the draft, as R-84 rules. No signature change.
> 10. **Taken from R4-3a (Step 1 checks each one).**
>     - `EMPTY_FORM: Readonly<RevealCardForm>` and `sameForm(a, b): boolean`, exported from `src/tools/reveal/emptyForm.ts`. The R4 header sketched the module as `revealForm.ts`; R4-3a named it `emptyForm.ts`, beside the test fixture `src/test/revealForm.ts`. R4-3a already imports `EMPTY_FORM` into the hook from `./emptyForm` (:11).
>     - `visibleImageError(errors, image: ImageStatus): string | null` and `interface ImageStatus {name; ready; error}` from `src/tools/studio/readiness.ts`. `imageErrorOf` calls it.
>     - `revealChecklist(form, validation, image: Pick<ImageStatus, 'ready' | 'error'>): ChecklistItem[]` from the same module, whose items carry `done`. Only the tests use it.
>
> **Verified (2026-10-07)** in `scratchpad/r4-rebase/sandbox-v-r4-03b`: a copy of R4-3a's sandbox, which is the working tree (main `b490fb7` plus the uncommitted bump, pin `16283a13`) with R4-3a's code as its task file gives it. `readiness.ts` and `emptyForm.ts` match the task file's blocks exactly, and the hook imports `EMPTY_FORM` from `./emptyForm`. `node_modules` and `upstream/` are junctioned in, and Vite's cache and the tsbuildinfo stay in the sandbox. The image-error order was re-verified in `sandbox-x-r4-03b`, a copy with R4-3a's current `readiness.ts` and `readiness.test.ts` (upload first) taken from its task file's blocks.
> - **Tests.** With R4-3a's hook and no `livePreview.ts`, Step 3 gives `Test Files 2 failed (2)`: the hook's file fails 8 of its 17, and `livePreview.test.ts` fails with `Failed to resolve import "../livePreview"`. With this task's code, Step 6 gives 22 of 22 in the two files, with no `act(...)` warning. `writePages.test.tsx` still passes, 6 of 6, and R4-3a's `readiness.test.ts` passes beside them.
> - **The tests bite.** These mutations each fail at least one test:
>   - in `dirty`, `publish` and the guards: `dirty` without its file half, `dirty` without its form half, no form reset after a publish, no image clear after a publish, no `dataUrl` guard, no `valid` guard, and no `setCommitError(null)` at the start;
>   - in the fields: `commitError` folded, `uploadError` dropped, `imageDataUrl` faked while reading, and an extension left un-lowercased;
>   - in `imageError`: the validator first, the outline's rule (upload first with no chosen-file check), the name dropped in `imageErrorOf`, the name dropped in the hook's call, and `imageError` as `upload.error` alone.
> - **Types.** `tsc -p tsconfig.app.json` is clean, test files included.
> - **Lint.** `pnpm exec eslint --max-warnings 0 --stdin --stdin-filename <path>` against the repo's config is clean on all four files.
> - **Code Health.** CodeScene MCP 1.5.7 scores all four files 10.0, with no findings.

### Task R4-3b: Reveal controller additions

**Files:**
- Create `src/tools/reveal/livePreview.ts`. `buildPreview` (useRevealAdmin.ts:16-25 after R4-3a, with its doc comment) and `computeSynergies` (:27-35) move here unchanged, as exports, beside the new `ChosenImage` and `imageErrorOf`.
- Modify `src/tools/reveal/useRevealAdmin.ts`, replacing the whole file. It imports the moved helpers and R4-3a's `EMPTY_FORM` and `sameForm`, `readyToPublish` returns the publish's inputs, and the controller gains six fields.
- Test: create `src/tools/reveal/__tests__/livePreview.test.ts`.
- Test: modify `src/tools/reveal/__tests__/useRevealAdmin.test.ts`, replacing the whole file. Its three tests stay verbatim.
- Unchanged, and run as a check: `src/tools/__tests__/writePages.test.tsx`. RevealPage still renders the publisher from this controller. `src/tools/reveal/index.ts` exports the same names.

**Interfaces:**
- **Consumes:**
  - **From R4-3a.** These are in `src/tools/reveal/emptyForm.ts` and `src/tools/studio/readiness.ts`:
    ```ts
    // src/tools/reveal/emptyForm.ts
    export const EMPTY_FORM: Readonly<RevealCardForm>;                                            // the hook's empty form, moved out
    export function sameForm(a: Readonly<RevealCardForm>, b: Readonly<RevealCardForm>): boolean;  // key by key
    // src/tools/studio/readiness.ts
    export interface ImageStatus {name: string | null; ready: boolean; error: string | null}     // error: the upload's own
    /** R-72 for the file input: null until a file is chosen, then the file's own error, else the validator's. */
    export function visibleImageError(errors: Readonly<Record<string, string>>, image: ImageStatus): string | null;
    export function revealChecklist(
      form: RevealCardForm,
      validation: ValidationResult,
      image: Pick<ImageStatus, 'ready' | 'error'>,
    ): ChecklistItem[];                                                                           // ChecklistItem has `done`; tests only
    ```
  - **Existing.**
    - `useImageUpload(): ImageUpload` and its `ImageUpload` type, `{file, dataUrl, error, choose, clearIf}` (src/components/useImageUpload.ts:48-59, :68-99).
    - `validateRevealCardForm(form, existingIds, imageName): ValidationResult` (validateForm.ts:113-126).
    - `buildPreviewCard(form): LorcanaJSONCard`.
    - `commitNewCard(opts: {token: string; card: LorcanaJSONCard; imageBase64: string; imageExt: string}): Promise<CommitResult>` (reveal/githubClient.ts). `CommitResult` is `{commitUrl: string}` (githubCommit.ts:99-101).
    - `useGithubToken`.
    - Through the bridge: `useCardDataContext`, and in the tests `inkBlock` and `REVEAL_ID_BASE`.
    - In the tests: `DeferredReader` (src/test/DeferredReader.ts), `pngFile` and `imageDataUrl` (src/test/images.ts).
- **Produces:**
  ```ts
  // src/tools/reveal/livePreview.ts: the card being written, shared by New reveal and Edit card (R4-4b)
  export function buildPreview(form: RevealCardForm, imageDataUrl: string | null): LorcanaCard | null;      // moved unchanged
  export function computeSynergies(card: LorcanaCard | null, allCards: LorcanaCard[]): SynergyGroup[];     // moved unchanged
  /** The image a controller holds: New reveal's upload, or Edit card's staged file (R4-4b's StagedImage has this shape). */
  export interface ChosenImage {name: string | null; dataUrl: string | null; error: string | null}
  /** R-72's file-control error: visibleImageError(validation.errors, {name, ready: dataUrl !== null, error}). */
  export function imageErrorOf(image: ChosenImage, validation: ValidationResult): string | null;

  // src/tools/reveal/useRevealAdmin.ts: RevealAdminController gains, beside its existing fields:
  dirty: boolean;              // !sameForm(form, EMPTY_FORM) || a file is chosen
  imageName: string | null;    // upload.file?.name ?? null
  imageDataUrl: string | null; // upload.dataUrl
  uploadError: string | null;  // upload.error
  imageError: string | null;   // imageErrorOf({name: imageName, dataUrl, error: uploadError}, validation): null until a file is chosen
  commitError: string | null;  // the last publish's failure alone; cleared as a publish starts
  // Unchanged: token, setToken, form, patchForm, previewCard, synergyGroups, validation, canPublish,
  // publishing, result, publishError (commitError ?? uploadError), onImageChange, publish.
  ```
- **Primitive arguments, hand-counted** (the gate: under 30% a module):
  - `livePreview.ts`: `buildPreview(form, imageDataUrl: string | null)`, `computeSynergies(card, allCards)` and `imageErrorOf(image, validation)`. That is 1 primitive in 6 (17%).
  - `useRevealAdmin.ts`: `readyToPublish(p)`, `hasDraft(form, upload)`, `useRevealAdmin()`, `patchForm(patch)`, `publish()` and the lambdas `(c)` and `(f)`. That is 0 in 7.
  - `useRevealAdmin.test.ts`: only `choose(hook, name: string)` takes a primitive. Every other helper takes the hook, a patch or the controller. The `it.each` callback takes one row object. That is 1 in about 15.
  - `livePreview.test.ts`: one row object, so 0.
- **Complexity.** Inner lambdas count toward their function. `readyToPublish` is 6, with four guards and one `??`. `hasDraft` is 2 and `imageErrorOf` 1. `buildPreview` and `computeSynergies` are 3 each. `useRevealAdmin` is 7 or less with `publish` inside: `?.`/`??` on the name, `if (!ready)`, the `catch`, its ternary, and the `??` in `publishError`.

- [ ] **Step 1: Check what this task builds on**

Run with the Bash tool from the repo root:
```bash
git branch --show-current
git -C upstream/inkweave rev-parse --short HEAD
grep -rn "export const EMPTY_FORM\|export function sameForm" src
grep -n "export interface ImageStatus\|export function visibleImageError" src/tools/studio/readiness.ts
grep -n -A 4 "export function revealChecklist" src/tools/studio/readiness.ts
git log --oneline main.. -- src/tools/reveal/useRevealAdmin.ts
grep -n "^function\|^export\|EMPTY_FORM" src/tools/reveal/useRevealAdmin.ts
ls src/tools/reveal/livePreview.ts
```
Expected:
- `feature/24-redesign-r4`, then `16283a1`.
- **The `EMPTY_FORM` grep.** Two lines, both in `src/tools/reveal/emptyForm.ts` (R4-3a): `export const EMPTY_FORM: Readonly<RevealCardForm> = {` and `export function sameForm(a: Readonly<RevealCardForm>, b: Readonly<RevealCardForm>): boolean {`. If either is missing, stop: R4-3a hasn't landed.
- **The `readiness.ts` greps.** `export interface ImageStatus {` and `export function visibleImageError(errors: Errors, image: ImageStatus): string | null {`, then `revealChecklist`'s signature, whose third parameter is `image: Pick<ImageStatus, 'ready' | 'error'>,`. If R4-3a shaped either differently, stop and reconcile: `imageErrorOf` and the test's `checklistDone` are built on these two.
- **The `git log`.** R4-3a's commit, `feat(studio): derive the reveal checklist and section dots from the validator (#24)`, and nothing else. If another commit touched the hook, stop and reconcile before Step 5 replaces the file.
- **The declarations grep.** R4-3a's state of the hook: `import {EMPTY_FORM} from './emptyForm';` (:11), `function buildPreview` (:17), `function computeSynergies` (:28), `function readyToPublish(p: {` (:38), `export interface RevealAdminController {` (:51), `export function useRevealAdmin(): RevealAdminController {` (:71), and `EMPTY_FORM` in `useState` (:74) and `setForm` (:108). No `const EMPTY_FORM`.
- **The `ls`.** `No such file or directory`.

- [ ] **Step 2: Write the failing tests**

Create `src/tools/reveal/__tests__/livePreview.test.ts`:

```ts
import {describe, expect, it} from 'vitest';
import {imageErrorOf} from '../livePreview';

const NO_FILE = 'Upload a card image';
const NAMED = 'Image must be jpg, jpeg, png, or webp';
const BYTES = 'a.gif is not a JPEG, PNG or WebP image.';
const READ_FAILED = 'Could not read the image: read failed';

describe('imageErrorOf', () => {
  it.each([
    {why: "nothing before a file is chosen: the checklist's", name: null, upload: null, validator: NO_FILE, expected: null},
    {why: "the file's own error ahead of the validator's when both refuse it", name: 'a.gif', upload: BYTES, validator: NAMED, expected: BYTES},
    {why: "the validator's error while a refused name's bytes are read", name: 'a.gif', upload: null, validator: NAMED, expected: NAMED},
    {why: "the file's own error when the validator takes its name", name: 'a.png', upload: READ_FAILED, validator: undefined, expected: READ_FAILED},
    {why: 'null for a file with neither', name: 'a.png', upload: null, validator: undefined, expected: null},
  ])('$why', ({name, upload, validator, expected}) => {
    const errors: Record<string, string> = validator ? {image: validator} : {};
    expect(imageErrorOf({name, dataUrl: null, error: upload}, {ok: !validator, errors})).toBe(expected);
  });
});
```

Replace the whole of `src/tools/reveal/__tests__/useRevealAdmin.test.ts` with this. The three tests under `describe('useRevealAdmin')` that come first are today's, verbatim.

```ts
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from '@testing-library/react';
import {DeferredReader} from '../../../test/DeferredReader';
import {imageDataUrl, pngFile} from '../../../test/images';
import {inkBlock, REVEAL_ID_BASE} from '../../../app-bridge';
import {revealChecklist} from '../../studio/readiness';
import type {RevealCardForm} from '../buildPreviewCard';
import {EMPTY_FORM} from '../emptyForm';
import {useRevealAdmin, type RevealAdminController} from '../useRevealAdmin';

// A saved token and an empty card list; the rest of the bridge stays real.
vi.mock('../../../github/useGithubToken', () => ({
  useGithubToken: () => ({token: 'tok', setToken: () => {}, clearToken: () => {}}),
}));
vi.mock('../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../app-bridge')>()),
  useCardDataContext: () => ({cards: []}),
}));
// Each test decides how the commit settles; the rest of the client stays real.
const commitNewCard = vi.hoisted(() => vi.fn());
vi.mock('../githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../githubClient')>()),
  commitNewCard,
}));

const image = pngFile;

// A complete character, numbered inside Ruby's block for the current season.
const VALID_FORM = {
  collectorNumber: String(inkBlock('Ruby').first),
  name: 'Mei',
  rarity: 'Rare',
  cost: '4',
  ink: 'Ruby' as const,
  type: 'Character' as const,
  strength: '3',
  willpower: '5',
  lore: '2',
};

const COMMIT = {commitUrl: 'https://github.com/Doberjohn/inkweave/commit/abc123'};

beforeEach(() => {
  DeferredReader.reset();
  vi.stubGlobal('FileReader', DeferredReader);
  // mockReset, not clearAllMocks: it also drops the last test's implementations.
  commitNewCard.mockReset();
  commitNewCard.mockResolvedValue(COMMIT);
});

afterEach(() => vi.unstubAllGlobals());

type Hook = {current: RevealAdminController};

/** Fill in the complete Ruby character, with any fields changed. */
function fill(hook: Hook, patch: Partial<RevealCardForm> = {}) {
  act(() => hook.current.patchForm({...VALID_FORM, ...patch}));
}

/** Choose a file; its read waits for DeferredReader.finish. */
function choose(hook: Hook, name: string) {
  act(() => void hook.current.onImageChange(image(name)));
}

/** A complete card with its image read: everything Publish needs. */
async function ready(hook: Hook) {
  fill(hook);
  choose(hook, 'a.png');
  await DeferredReader.finish(0);
}

/** Press Publish, and wait for the commit to land. */
async function publish(hook: Hook) {
  act(() => void hook.current.publish());
  await waitFor(() => expect(hook.current.result).toEqual(COMMIT));
}

/** Every item of the ready checklist (R4-3a) is done, read from the controller as the studio reads it. */
function checklistDone(ctrl: RevealAdminController): boolean {
  const imageState = {ready: ctrl.imageDataUrl !== null, error: ctrl.uploadError};
  return revealChecklist(ctrl.form, ctrl.validation, imageState).every((item) => item.done);
}

describe('useRevealAdmin', () => {
  it("never offers one file's bytes under another file's name", async () => {
    const {result} = renderHook(() => useRevealAdmin());
    act(() => result.current.patchForm(VALID_FORM));
    act(() => void result.current.onImageChange(image('a.png')));
    await DeferredReader.finish(0);
    expect(result.current.canPublish).toBe(true);

    act(() => void result.current.onImageChange(image('b.webp')));
    expect(result.current.canPublish).toBe(false);
    await DeferredReader.finish(1);
    expect(result.current.canPublish).toBe(true);
  });

  it("previews a card with its scan language, which the engine's transform drops", () => {
    const {result} = renderHook(() => useRevealAdmin());
    act(() => result.current.patchForm({...VALID_FORM, scanLanguage: 'ja'}));
    expect(result.current.previewCard?.scanLanguage).toBe('ja');
  });

  it('keeps the newest image when an older read finishes last', async () => {
    const {result} = renderHook(() => useRevealAdmin());
    act(() => result.current.patchForm(VALID_FORM));
    act(() => void result.current.onImageChange(image('a.png')));
    act(() => void result.current.onImageChange(image('b.webp')));

    await DeferredReader.finish(1);
    await DeferredReader.finish(0);
    expect(result.current.previewCard?.imageUrl).toBe(imageDataUrl('b.webp'));
  });

  it.each([
    {state: 'an empty form', reach: async () => {}, publishable: false},
    {state: 'a complete card with no image', reach: async (hook: Hook) => fill(hook), publishable: false},
    {
      state: 'a complete card whose image is still being read',
      reach: async (hook: Hook) => {
        fill(hook);
        choose(hook, 'a.png');
      },
      publishable: false,
    },
    {
      state: 'a complete card whose file fails its byte check',
      reach: async (hook: Hook) => {
        fill(hook);
        choose(hook, 'a.gif');
        await DeferredReader.finish(0);
      },
      publishable: false,
    },
    {
      state: 'a card in the wrong ink block, with its image read',
      reach: async (hook: Hook) => {
        await ready(hook);
        fill(hook, {ink: 'Amber'});
      },
      publishable: false,
    },
    {state: 'a complete card with its image read', reach: ready, publishable: true},
    {
      state: 'a card just published',
      reach: async (hook: Hook) => {
        await ready(hook);
        await publish(hook);
      },
      publishable: false,
    },
  ])('ticks every checklist item exactly when Publish is on: $state', async ({reach, publishable}) => {
    const {result} = renderHook(() => useRevealAdmin());
    await reach(result);
    expect(result.current.canPublish).toBe(publishable);
    expect(checklistDone(result.current)).toBe(publishable);
  });

  describe('dirty', () => {
    it('turns dirty on a field change, and clean again once the field is back to empty', () => {
      const {result} = renderHook(() => useRevealAdmin());
      expect(result.current.dirty).toBe(false);
      act(() => result.current.patchForm({name: 'Mei'}));
      expect(result.current.dirty).toBe(true);
      act(() => result.current.patchForm({name: ''}));
      expect(result.current.dirty).toBe(false);
    });

    it('turns dirty as soon as a file is chosen, before its bytes are read, and clean once it is cleared', () => {
      const {result} = renderHook(() => useRevealAdmin());
      choose(result, 'a.png');
      expect(result.current).toMatchObject({dirty: true, imageName: 'a.png', imageDataUrl: null});
      act(() => void result.current.onImageChange(null));
      expect(result.current).toMatchObject({dirty: false, imageName: null});
    });

    it('is clean once a publish lands: the card is committed, the form emptied and the image cleared', async () => {
      const {result} = renderHook(() => useRevealAdmin());
      fill(result);
      choose(result, 'Mei.WebP');
      await DeferredReader.finish(0);
      expect(result.current).toMatchObject({dirty: true, imageDataUrl: imageDataUrl('Mei.WebP')});

      await publish(result);
      expect(commitNewCard).toHaveBeenCalledOnce();
      expect(commitNewCard).toHaveBeenCalledWith({
        token: 'tok',
        card: expect.objectContaining({id: REVEAL_ID_BASE + inkBlock('Ruby').first, name: 'Mei'}),
        imageBase64: imageDataUrl('Mei.WebP'),
        imageExt: 'webp',
      });
      expect(result.current).toMatchObject({dirty: false, form: EMPTY_FORM, imageName: null, imageDataUrl: null});
    });
  });

  describe('errors', () => {
    it("shows the validator's message for a name it refuses while its bytes are read, then the bytes' own", async () => {
      const {result} = renderHook(() => useRevealAdmin());
      const refused = 'Image must be jpg, jpeg, png, or webp';
      choose(result, 'a.gif');
      expect(result.current).toMatchObject({imageError: refused, uploadError: null});

      await DeferredReader.finish(0);
      const problem = 'a.gif is not a JPEG, PNG or WebP image.';
      expect(result.current).toMatchObject({
        imageName: 'a.gif',
        imageDataUrl: null,
        uploadError: problem,
        imageError: problem,
        publishError: problem,
        commitError: null,
      });
    });

    it('carries a failed read as uploadError', async () => {
      const {result} = renderHook(() => useRevealAdmin());
      choose(result, 'a.png');
      await act(async () => DeferredReader.reads[0].fail());
      expect(result.current).toMatchObject({
        uploadError: 'Could not read the image: read failed',
        imageError: 'Could not read the image: read failed',
        commitError: null,
      });
    });

    it('shows no image error before a file is chosen: the checklist names it (R-72)', () => {
      const {result} = renderHook(() => useRevealAdmin());
      expect(result.current.validation.errors.image).toBe('Upload a card image');
      expect(result.current).toMatchObject({uploadError: null, imageError: null});
    });

    it('reports a failed commit as commitError alone, keeps the draft, and clears it when the next publish starts', async () => {
      commitNewCard.mockRejectedValueOnce(new Error('master changed while publishing'));
      const {result} = renderHook(() => useRevealAdmin());
      await ready(result);
      act(() => void result.current.publish());
      await waitFor(() => expect(result.current.commitError).toBe('master changed while publishing'));
      expect(result.current).toMatchObject({
        publishError: 'master changed while publishing',
        uploadError: null,
        result: null,
        dirty: true,
        canPublish: true,
      });

      await publish(result);
      expect(result.current).toMatchObject({commitError: null, publishError: null});
    });
  });
});
```

Notes on the fixtures:
- **The two bad files.** `DeferredReader` hands back `imageDataUrl(name)`, whose bytes follow the name's extension. `a.gif` therefore reads as empty bytes and fails `imageProblem` ("is not a JPEG, PNG or WebP image."), and the validator refuses its name too ("Image must be jpg, jpeg, png, or webp"). `reads[0].fail()` on `a.png` takes the reader's error path, with a name the validator takes. A name the validator takes whose bytes fail the check can't be built with `DeferredReader`; `livePreview.test.ts`'s rows cover the order instead.
- **The wrong ink.** `fill(hook, {ink: 'Amber'})` keeps Ruby's first number, so the ink-block check fails while the image stays read.
- **No hand-built errors.** Every error in these tests comes from the real validator and `useImageUpload`.

- [ ] **Step 3: Run them and see them fail**

Run: `pnpm vitest run --project app src/tools/reveal/__tests__/useRevealAdmin.test.ts src/tools/reveal/__tests__/livePreview.test.ts`

Expected: FAIL, with `Test Files 2 failed (2)`.
- `livePreview.test.ts` fails to load: `Error: Failed to resolve import "../livePreview" from "src/tools/reveal/__tests__/livePreview.test.ts". Does the file exist?`
- `useRevealAdmin.test.ts` gives `Tests 8 failed | 9 passed (17)` against R4-3a's checklist. The three `dirty` tests and the four `errors` tests fail on fields today's controller lacks, for example `AssertionError: expected undefined to be false` and `expected { token: 'tok', …(12) } to match object { uploadError: null, imageError: null }`. So does the invariant's "still being read" row, with `expected true to be false`: `ctrl.imageDataUrl` is undefined there, so the checklist reads the image as ready. The three existing tests and the other six invariant rows pass.

- [ ] **Step 4: Create `livePreview.ts`**

Create `src/tools/reveal/livePreview.ts`. `buildPreview` and `computeSynergies` are cut from `useRevealAdmin.ts` with their doc comments and bodies unchanged, and gain `export`:

```ts
import {
  synergyEngine,
  transformCard,
  type LorcanaCard,
  type SynergyGroup,
} from 'inkweave-synergy-engine';
import {visibleImageError} from '../studio/readiness';
import {buildPreviewCard, type RevealCardForm} from './buildPreviewCard';
import type {ValidationResult} from './validateForm';

// The card being written, as the studio shows it while the operator types:
// New reveal's controller (useRevealAdmin) and Edit card's (R4-4) both build on these.

/** Build the live preview card from form values; null until ink/type are valid. */
export function buildPreview(form: RevealCardForm, imageDataUrl: string | null): LorcanaCard | null {
  const raw = buildPreviewCard(form);
  const transformed = transformCard(raw);
  if (!transformed) return null;
  if (imageDataUrl) transformed.imageUrl = imageDataUrl;
  // The engine's transform drops it; the app's loader copies it over the same way.
  transformed.scanLanguage = raw.scanLanguage;
  return transformed;
}

/** Run the engine against the in-progress card; empty on no card or engine error. */
export function computeSynergies(card: LorcanaCard | null, allCards: LorcanaCard[]): SynergyGroup[] {
  if (!card) return [];
  try {
    return synergyEngine.findSynergies(card, allCards);
  } catch {
    return [];
  }
}

/** The image a controller holds: New reveal's upload, or Edit card's staged file (R4-4b). */
export interface ChosenImage {
  /** The chosen file's name, or null before one is chosen. */
  name: string | null;
  /** Its bytes as a data URL, once read and checked; null otherwise. */
  dataUrl: string | null;
  /** Why the file can't be used (its byte check, or a failed read), or null. */
  error: string | null;
}

/**
 * The file controls' error (R-72), as both controllers derive it: R4-3a's
 * visibleImageError over the chosen image. Null until a file is chosen, since
 * "Upload a card image" is the checklist's; then the file's own error, else the
 * validator's.
 */
export function imageErrorOf(image: ChosenImage, validation: ValidationResult): string | null {
  return visibleImageError(validation.errors, {name: image.name, ready: image.dataUrl !== null, error: image.error});
}
```

- [ ] **Step 5: Replace `useRevealAdmin.ts`**

Replace the whole of `src/tools/reveal/useRevealAdmin.ts` with the file below. Against today's file:
- **Out.** `buildPreview` and `computeSynergies` (:16-35 after R4-3a) go, because they now live in `livePreview.ts`. R4-3a already removed the private `EMPTY_FORM`; its `./emptyForm` import now takes `sameForm` too.
- **`readyToPublish`.** It returns the publish's inputs or null (re-base note 5), and `publish` starts from them. The four checks and the extension rule are the same.
- **New fields.** The six fields are added. `dirty` reads through `hasDraft`, and `imageError` through `imageErrorOf` over the upload's name, bytes and error.
- **The rename.** The state `publishError` is renamed `commitError`. The returned `publishError` still folds in the upload error.

```ts
import {useState} from 'react';
import type {LorcanaCard, SynergyGroup} from 'inkweave-synergy-engine';
import {useCardDataContext} from '../../app-bridge';
import {useImageUpload, type ImageUpload} from '../../components/useImageUpload';
import {buildPreviewCard, type RevealCardForm} from './buildPreviewCard';
import {EMPTY_FORM, sameForm} from './emptyForm';
import {validateRevealCardForm, type ValidationResult} from './validateForm';
import {commitNewCard} from './githubClient';
import {useGithubToken} from '../../github/useGithubToken';
import {buildPreview, computeSynergies, imageErrorOf} from './livePreview';

/** What commitNewCard needs besides the card. */
interface PublishInput {
  token: string;
  imageBase64: string;
  imageExt: string;
}

/**
 * The publish's inputs once the card is valid, a token is saved and the chosen
 * image's bytes are read; null while anything is missing. Publish is on exactly
 * when this is set. Single-condition guards keep it simple and narrow the types.
 */
function readyToPublish(p: {valid: boolean; token: string | null; upload: ImageUpload}): PublishInput | null {
  const {file, dataUrl} = p.upload;
  if (!p.valid) return null;
  if (!p.token) return null;
  if (!file) return null;
  if (!dataUrl) return null;
  return {token: p.token, imageBase64: dataUrl, imageExt: (file.name.split('.').pop() ?? 'png').toLowerCase()};
}

/** The draft holds something: a field off its empty value, or a chosen file, read or not. */
function hasDraft(form: RevealCardForm, upload: ImageUpload): boolean {
  return !sameForm(form, EMPTY_FORM) || upload.file !== null;
}

export interface RevealAdminController {
  token: string | null;
  setToken: (t: string) => void;
  form: RevealCardForm;
  patchForm: (patch: Partial<RevealCardForm>) => void;
  /** The form differs from an empty one, or a file is chosen. A publish that lands clears both. */
  dirty: boolean;
  previewCard: LorcanaCard | null;
  synergyGroups: SynergyGroup[];
  validation: ValidationResult;
  /** The chosen file's name, or null. */
  imageName: string | null;
  /** The chosen file's bytes as a data URL; null while they are read, and for a file that fails its check. */
  imageDataUrl: string | null;
  /** Why the chosen file can't be used (its byte check, or a failed read), or null. */
  uploadError: string | null;
  /** The file controls' error (R-72, imageErrorOf): null until a file is chosen, then uploadError, else the validator's. */
  imageError: string | null;
  canPublish: boolean;
  publishing: boolean;
  result: {commitUrl: string} | null;
  /** The last publish's failure alone, or null; a publish clears it as it starts. */
  commitError: string | null;
  /** commitError, else uploadError: the reveal publisher's one error line. */
  publishError: string | null;
  onImageChange: (file: File | null) => void;
  publish: () => void;
}

/**
 * Owns all reveal-admin page state and side effects. Keeping it here leaves the
 * page component as mostly-presentational JSX (and well under the complexity gate).
 */
export function useRevealAdmin(): RevealAdminController {
  const {token, setToken} = useGithubToken();
  const {cards} = useCardDataContext();
  const [form, setForm] = useState<RevealCardForm>(EMPTY_FORM);
  // The chosen file and its bytes, kept in step (useImageUpload).
  const upload = useImageUpload();
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{commitUrl: string} | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);

  const imageName = upload.file?.name ?? null;
  const existingIds = new Set(cards.map((c) => Number(c.id)));
  const previewCard = buildPreview(form, upload.dataUrl);
  const synergyGroups = computeSynergies(previewCard, cards);
  const validation = validateRevealCardForm(form, existingIds, imageName);
  const ready = readyToPublish({valid: validation.ok, token, upload});

  function patchForm(patch: Partial<RevealCardForm>) {
    setForm((f) => ({...f, ...patch}));
  }

  async function publish() {
    if (!ready) return;
    setPublishing(true);
    setCommitError(null);
    // The last publish's commit notice would otherwise stand beside this attempt's outcome.
    setResult(null);
    try {
      const res = await commitNewCard({...ready, card: buildPreviewCard(form)});
      setResult(res);
      setForm(EMPTY_FORM);
      void upload.choose(null);
    } catch (e) {
      setCommitError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  }

  return {
    token,
    setToken,
    form,
    patchForm,
    dirty: hasDraft(form, upload),
    previewCard,
    synergyGroups,
    validation,
    imageName,
    imageDataUrl: upload.dataUrl,
    uploadError: upload.error,
    imageError: imageErrorOf({name: imageName, dataUrl: upload.dataUrl, error: upload.error}, validation),
    canPublish: ready !== null,
    publishing,
    result,
    commitError,
    // A file that can't be read is why Publish stays off; say so where errors show.
    publishError: commitError ?? upload.error,
    onImageChange: upload.choose,
    publish,
  };
}
```

Then check that nothing else used the moved or renamed names:
```bash
grep -rn "buildPreview\b\|computeSynergies\|readyToPublish" src --include=*.ts --include=*.tsx
```
Expected: `livePreview.ts` (the two definitions) and `useRevealAdmin.ts` (their import and use, plus `readyToPublish`'s definition and its one call), and two mentions of `readyToPublish` from R4-3a: the doc comment in `src/tools/studio/readiness.ts` and the `describe('readiness against readyToPublish')` in its test. Both still read true. Nothing else.

- [ ] **Step 6: Run them to PASS**

Run: `pnpm vitest run --project app src/tools/reveal/__tests__/useRevealAdmin.test.ts src/tools/reveal/__tests__/livePreview.test.ts`
Expected: PASS, `Test Files 2 passed (2)` and `Tests 22 passed (22)`: 17 in the hook's file, with the `it.each` counting as seven, and 5 in `livePreview.test.ts`. React logs no "not wrapped in act" warning.

Run: `pnpm vitest run --project app src/tools/__tests__/writePages.test.tsx`
Expected: PASS, `Tests 6 passed (6)`. RevealPage still renders the publisher, its gate and its branch notice from this controller.

- [ ] **Step 7: Lint the changed files and typecheck once**

Run: `pnpm exec eslint --max-warnings 0 src/tools/reveal/livePreview.ts src/tools/reveal/useRevealAdmin.ts src/tools/reveal/__tests__/livePreview.test.ts src/tools/reveal/__tests__/useRevealAdmin.test.ts`
Expected: no output, exit 0.

Run: `pnpm typecheck`
Expected: exit 0. It covers the test files, so the `it.each` rows' `reach` union and the `commitNewCard({...ready, card})` spread are checked too.

No reveal-sync run: no contract file changes in this task. No `pnpm lint` or `pnpm test:run`: the pre-commit hook runs both.

- [ ] **Step 8: Code Health**

Run CodeScene's `code_health_review` on:
- `src/tools/reveal/livePreview.ts`
- `src/tools/reveal/useRevealAdmin.ts`
- `src/tools/reveal/__tests__/livePreview.test.ts`
- `src/tools/reveal/__tests__/useRevealAdmin.test.ts`

Expected: 10.0 each, with no findings (MCP 1.5.7 gave that in the sandbox).

If the review flags the hook, keep its complexity under 8 with `publish` counted inside. Move logic into a module helper, as `readyToPublish` and `hasDraft` do, and don't add branches to the hook. The PR gate is stricter than the local tool, so R4-8 runs `analyze_change_set` before the push.

- [ ] **Step 9: Commit**, with the Bash tool and only after the owner approves. Use two separate calls, so the commit command starts with `USER_APPROVED=1`:

```bash
git add src/tools/reveal/livePreview.ts src/tools/reveal/useRevealAdmin.ts src/tools/reveal/__tests__/livePreview.test.ts src/tools/reveal/__tests__/useRevealAdmin.test.ts
```

Then run CodeScene's `pre_commit_code_health_safeguard`, and go on only when it passes.

```bash
USER_APPROVED=1 git commit -m "feat(reveal): expose the reveal draft's image, errors and dirty state (#24)"
```

Husky's pre-commit runs the full lint and `test:run`, so never pass `--no-verify`. If Vitest fails to start its workers under load, stop this session's preview servers, wait out other sessions' runs, and retry.

### Hand-offs from R4-3b

- **R4-4b (the Edit controller).**
  - **Imports.** It takes `buildPreview`, `computeSynergies` and `imageErrorOf` from `'../reveal/livePreview'`, never through the reveal barrel, which R4-6c deletes.
  - **`imageError`.** It is `imageErrorOf(staged, validation)` with the edit's own validation, so both panes derive it the same way. Its `StagedImage`, `{name, dataUrl, error}`, is a `ChosenImage` as it stands: the call needs no change, but its "Consumes" line should read `imageErrorOf(image: ChosenImage, validation)`, not `Pick<ImageUpload, 'error'>`. Before a file is staged it gives null; then the staged file's own error, else `validateCardEdit`'s. An image-only card has no form, so it passes a validation with no errors, `{ok: true, errors: {}}`, and gets the staged file's error alone.
  - **Self-exclusion.** Keep the filter in the caller (`cards.filter((c) => c.id !== card.id)`), not in a new `computeSynergies` parameter. A bare `excludeId: string` would put `livePreview.ts` at 2 primitives in 7 arguments (29%), at the gate's edge.
  - **`dirty`.** It reuses R4-3a's `sameForm`, as this task does.
- **R4-5d (the card panel).**
  - **Which message it shows.** `staged.error` is the controller's `imageError` as it is. R-72 is already applied: it is null until a file is chosen, so "Upload a card image" never shows under the controls, and the panel needs no rule of its own. This settles R4-5d's hand-off that the controller reconcile `imageErrorOf` with `visibleImageError`.
  - **What it reads.** For a name the validator refuses, the validator's message shows while the bytes are read, and the file's own error replaces it once they fail. For a name it takes, the file's own error shows once the read fails or the bytes fail the check.
- **R4-5e and R4-6a (the aside and the New reveal pane).**
  - **The checklist's image argument** is `{ready: ctrl.imageDataUrl !== null, error: ctrl.uploadError}`, exactly as the test's `checklistDone` builds it and as R4-3a's hand-off gives it. The invariant test holds for that wiring. A whole `ImageStatus` with `name: ctrl.imageName` added works too, since `revealChecklist` takes a `Pick` of it.
  - **The card panel** takes `staged={{name: ctrl.imageName, error: ctrl.imageError}}`. That equals `visibleImageError(ctrl.validation.errors, {name, ready, error: ctrl.uploadError})`, so a pane that calls it directly gets the same message. R4-6a's page test should still cover a fresh form with no image error under the controls (R4-5d's hand-off).
  - **The outcome.** `CommitOutcome` takes `ctrl.commitError`, with no comparison against `uploadError` (outline :866).
  - **The guard.** Its `dirty` takes `ctrl.dirty`, and its in-flight wording reads `ctrl.publishing` (R-58).
  - **R-66's reload of Edit's file** after a New reveal publish keys on `ctrl.result` turning non-null.
  - **The token (R-84).** `useRevealAdmin` keeps reading the token store. Mounted under the studio's gate, in the workspace keyed by token, its `token` is always set, and Forget token drops the draft.
- **R4-6c (retiring `/reveal`).** Once RevealPage is deleted, nothing reads `publishError`. Drop the field and its fold then, which is one field and its comment, or keep it. That is R4-6c's call, and it goes in "R4 as built".
- **R4-8 ("R4 as built").** Record three things:
  - `readyToPublish` returns the publish's inputs (`PublishInput | null`), and `canPublish` is `ready !== null`;
  - `livePreview.ts` holds the shared live-preview helpers, with `ChosenImage` and `imageErrorOf`;
  - both controllers' `imageError` is R4-3a's `visibleImageError` through `imageErrorOf`: null until a file is chosen, then the file's own error, else the validator's.

  If R4-3a's doc comments name `readyToPublish` as a boolean check, they still read true.

<!--
Cross-task critic, 2026-10-07: the image-error order now follows R4-3a (the file's own error, else the validator's). Items (1) to (5) are applied. One part of item (6) isn't applied as written:
- Item (6) said Step 6's expected count stays 21. It can't, because item (1) adds a fifth row to livePreview.test.ts. Step 6 now expects 22 (17 + 5), which is what sandbox-x-r4-03b gives. Step 3 is unchanged: the hook's file still fails 8 of 17, and livePreview.test.ts fails to load.
- Item (5) dropped "Correct the header's wording to match". Note that the R4 header (R4-card-studio.md, addition 8 at :250 and "Visible errors (R-72)" at :578) currently words the order validator-first ("then the validator's image error, then the upload's own"). So it now disagrees with R4-3a and this file. That fix belongs to the header, which this pass doesn't edit.
-->
