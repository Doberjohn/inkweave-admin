> Part of [R: Admin redesign](../R-redesign.md), phase R4 ([R4-card-studio.md](R4-card-studio.md)). Read the main plan's decisions (R-57 to R-91 for R4), corrections, global constraints and shared interfaces, then the R4 header, first.

> **Re-base notes** (R4-1b, 2026-10-07, against main @ `e5e5029`, pin `16283a13` and decisions R-57 to R-91)
> - **Where it comes from.** This is the network half of the outline's Task R4-1 (`R4-card-studio.md:57-204`). R4-1a holds the pure module, `replaceCardInPreviewJson.ts`; this task adds the client that reads `previewCards.json` and commits an edit through it. The split is the audit's (`r4-audit-full.json`, R4-1 `split`). The audit cited pin `bc877e1`. Every app fact below was re-checked at `16283a13`:
>   - the pinned `previewCards.json` has 204 cards, all set 14 and numbered; 38 of them carry `variants`; no card has `scanLanguage`, and one printing does (14213, `it`); the file round-trips through `JSON.stringify(data, null, 2) + '\n'` byte for byte;
>   - the engine's `LorcanaJSONCard` (`packages/synergy-engine/src/utils/cardTransformer.ts:31-70`) has `scanLanguage?: string` (:68) and `variants?: RawCardVariant[]` (:69), and `RawCardVariant.rarity` is `VariantRarity` (`'Enchanted' | 'Epic' | 'Iconic'`, `types/card.ts:11`). The built `dist` carries both.
> - **`StaleCardError` has no constructor of its own.** `tsconfig.app.json:19` sets `erasableSyntaxOnly`, which bans parameter properties. The class only sets `name = 'StaleCardError'` as a field (`useDefineForClassFields`, :5), and the message is the plain `Error` one. It carries no data: R4-4c tells it apart with `instanceof`, and "Load it again" re-reads the file (R-68).
> - **The stale check is R-67's, in one helper.** `checkBaseEntry({cards, loaded})` compares only `EDITABLE_CARD_KEYS` plus `id`, `setCode` and `number`, each as JSON. The outline compared the whole entry (`:161-162`), which would refuse every pending edit of a card whose printings land meanwhile (38 variant-bearing cards on the pin, against 24 at `bc877e1`). The edit then merges into the entry as it stands at the base commit, because `replaceCardInPreviewJson` runs on the base file, so `variants` come from there. A new test lands an edit on a base whose entry gained `variants` and checks they survive.
> - **R-78's commit messages.** `fix(reveals): update {fullName} ({setCode}{number})`, plus " and its image" when a scan goes with it; `fix(reveals): refresh {fullName} ({setCode}{number}) to its English scan` when the edit removes `scanLanguage` (admin#14), image or not. The name is the one the edit leaves (`changes.fullName ?? loaded.fullName`). The message is built before the base is read (`commitFiles` takes it up front, `githubCommit.ts:113-117`), so it reads `loaded`; a commit lands only when the base matches `loaded` on every compared key, so the two agree. An image-only save never comes here and keeps `commitCardImage`'s message.
> - **The image is `{dataUrl, ext}`**, as `useImageUpload` holds it. It goes through `stripDataUrl` to `${RAW_DIR}/${loaded.id}.${ext}` (`RAW_DIR` at `githubClient.ts:12`), as both existing writers do (`githubClient.ts:31`, `image/githubClient.ts:22`). The outline's `{base64, ext}` never said the prefix is stripped.
> - **One reader for both reads.** A private `readCardsAt({token, ref})` reads, parses and checks for a `cards` array; `readPreviewCards(token)` reads at `targetBranch()` and `commitCardEdit` at the base sha. A `parse(text: string)` helper beside `readPreviewCards(token: string)` would put the module at 2 primitive parameters in 6 (33%), over the gate's 30%.
> - **Code Health, counted from the TypeScript AST:** `githubClient.ts` has 1 primitive parameter (`readPreviewCards`' `token`) in 6, 16.7%; the test file 1 (the existing `card(id)`) in 7, 14.3%. Every new function is at cyclomatic complexity 3 or less, with no compound condition. `githubCommit.ts` is untouched (its String Heavy Arguments edge).
> - **Kept out, against the outline.**
>   - `src/tools/reveal/index.ts` stays as it is. Nothing imports the barrel (`router.tsx` imports the pages directly), and R4-6c deletes both barrels.
>   - `PREVIEW_PATH` stays private. The tests name the paths as literals, so a wrong constant fails them.
>   - No reveal-sync run: this task changes no contract file (`scripts/reveal-sync/web.mjs:61-74` loads only `validateForm.ts`, `buildPreviewCard.ts` and `insertCardIntoPreviewJson.ts`), and no script imports either client.
> - **The refusal note, reworded.** An edit is refused only when its own entry changed or left the file (`StaleCardError`), or when the branch moves between the ref read and the update (`commitFiles`' race, `githubCommit.ts:152-164`). A reveal, a variants commit or an image conversion that lands meanwhile refuses nothing. The race's message ends "Publish again." (`:161`), which Edit's "Save changes to …" doesn't match. The client leaves it as it is, because both Edit save paths (`commitCardEdit` and `commitCardImage`) can meet it, `githubCommit.ts` stays unchanged, and New reveal keeps the wording. Edit rewords it once, where it classifies a save's failure (R4-4c's `failureOf`; hand-offs).
> - **Test changes.**
>   - The stub takes an object, `stubGitHub({preview, previewStatus})`, and its table carries a status per route, so the missing-file and rejected-token reads need no second mock. `commitNewCard`'s cases call `stubGitHub()` on `PREVIEW` as before.
>   - The edit cases use files built with `JSON.stringify(…, null, 2) + '\n'` (`previewFile`), because `PREVIEW`'s one-line `"metadata"` doesn't round-trip and R4-1a refuses such a file.
>   - `commitNewCard`'s "writes nothing when previewCards.json cannot be read" (`:54-66`) becomes one `it.each` row beside `commitCardEdit`'s, so the two cases don't duplicate each other (CodeScene's duplication check reads tests too).
>   - Fetched cards compare with `toEqual` (`vite.config.ts:77-78`). A 401 read is pinned to start "GitHub 401 on", which `isRejectedToken` reads (R-26, R-71).
>   - R-78's messages are one `it.each` table of three rows: a field edit alone, a refresh with a rename and a scan, and a refresh alone. The last pins both halves of R-78's "image or not", and that the message falls back to the loaded `fullName` when the edit doesn't rename the card.
>   - Every new case reads the stub's calls through three small readers (`readsOf`, `commitOf`, `wroteNothing`), so no new block holds more than 3 expects. `commitNewCard`'s two kept cases are word for word, the first with its 4.
> - **Gates once.** The steps run the two test files, eslint on the two changed files and one `pnpm typecheck`, then Code Health. The pre-commit hook runs the full lint and `test:run`.
> - **Verified** in `scratchpad/r4-rebase/sandbox-r41b`: a copy of `src/` and the configs from the working tree (main `b490fb7` plus the uncommitted bump to `16283a13`), with `node_modules` and `upstream/` junctioned in, Vite's cache in the sandbox, and `server.fs.allow` widened for the junction. `replaceCardInPreviewJson.ts` was R4-1a's draft (`sandbox-r41a`, as of 15:31, with an in-progress mutant line put back), and the run was repeated on a stand-in written from the audit's contract.
>   - Step 3: 14 failed, 3 passed (17), on `TypeError: commitCardEdit is not a function` and `readPreviewCards is not a function`.
>   - Step 5: 17 passed, and 20 with `useRevealAdmin.test.ts`. The reveal, image and `src/github` suites pass too (16 files, 103 tests).
>   - `tsc -p tsconfig.app.json` reports nothing. Both files pass `pnpm exec eslint --max-warnings 0 --stdin` from the repo. CodeScene (local MCP 1.5.7) scores both 10.0, with no findings.
>   - Eleven mutants were all killed: a whole-entry compare (`variants` added to the compared keys), no identity keys, no " and its image", no refresh message, a refresh message only with an image, a read at the branch tip instead of the base, no stale check, no `stripDataUrl`, the old `fullName` in the message, no fallback to the loaded `fullName`, and no cards-array check. The two that the refresh-alone row kills survived without it.
>   - The adversarial check re-ran all of the above in `scratchpad/r4-rebase/sandbox-r41b-verify`, with the code extracted from this file and R4-1a's module from its file as of 16:54.

### Task R4-1b: The Edit client (`StaleCardError`, `readPreviewCards`, `commitCardEdit`)

**Files:**
- Modify `src/tools/reveal/githubClient.ts`: the imports (l.1-9) gain R4-1a's module, `targetBranch` and `type CommitFile`, and `StaleCardError`, `readPreviewCards` and `commitCardEdit`, with their private helpers, go after `commitNewCard` (l.24-48, unchanged).
- Modify `src/tools/reveal/__tests__/githubClient.test.ts`: the stub takes an object, and the edit, stale, missing-file and read cases join.
- No other file. Not `index.ts` (R4-6c deletes it), not `src/github/githubCommit.ts`, and no reveal-sync contract file.

**Interfaces:**
- **Consumes:**
  - From R4-1a (`src/tools/reveal/replaceCardInPreviewJson.ts`):
    ```ts
    export const EDITABLE_CARD_KEYS: readonly ['name', 'fullName', 'version', 'cost', 'color', 'inkwell', 'type', 'rarity',
      'franchise', 'subtypes', 'abilities', 'fullText', 'fullTextSections', 'strength', 'willpower', 'lore', 'moveCost', 'scanLanguage'];
    export type PreviewCardChanges = {[K in EditableCardKey]?: LorcanaJSONCard[K] | null};   // null removes the key
    export interface PreviewCardEdit {id: number; changes: PreviewCardChanges}
    export function replaceCardInPreviewJson(fileText: string, edit: PreviewCardEdit): string;
    ```
    It throws, so nothing is committed, on a file that isn't JSON, has no `cards` array or doesn't round-trip; an edit that changes nothing, names a key outside `EDITABLE_CARD_KEYS`, removes a required key or writes a `scanLanguage` the app refuses (R-79); and an id that is missing or appears twice. This task relies on none of its wording. Its tests rely on its merge: a changed key keeps its place, a new key goes last, `null` removes the key, and every other key (`variants`) stays.
  - From `src/github/githubCommit.ts`, unchanged: `targetBranch()` (:14-16), `utf8ToBase64` (:28-33), `stripDataUrl` (:36-39), `readRepoFile(token, path, ref = targetBranch())` (:83-90, raw media type, `cache: 'no-store'`, and a failure reads "GitHub {status} on {path}: …"), `CommitFile` (:92-97), `CommitResult` (:99-101) and `commitFiles({token, message, files})` (:113-167). `files` may be a function of the base commit's sha (:126), and it runs before any blob is written, so a throw there writes nothing. A non-fast-forward ref update throws "{branch} changed while publishing, so nothing was published. Publish again." (:161; `githubCommit.test.ts:157-167`).
  - `LorcanaJSONCard` from `inkweave-synergy-engine` (above).
  - In the tests: `base64ToUtf8` (`src/test/base64.ts:5-8`). `vite.config.ts:51` pins `VITE_ADMIN_TARGET_BRANCH` to `''`, so the branch is `master` in every case.
- **Produces** (`src/tools/reveal/githubClient.ts`; `commitNewCard`, `PREVIEW_PATH` and `RAW_DIR` unchanged):
```ts
/** The card's entry changed on the branch since the editor loaded it, or left previewCards.json. */
export class StaleCardError extends Error { name = 'StaleCardError'; }
//   "Card {id} changed on {branch} since you loaded it. Load it again."
//   "Card {id} is no longer in previewCards.json on {branch}. Load it again."

/** previewCards.json's cards on the target branch: the entries Edit loads (R4-4a). */
export function readPreviewCards(token: string): Promise<LorcanaJSONCard[]>;
//   refuses: readRepoFile's "GitHub {status} on apps/web/public/data/previewCards.json: …" (a 401 for a rejected token),
//   "previewCards.json is not valid JSON", "previewCards.json has no cards array"

/** One preview card's edit, as Edit saves it (R4-4c). */
export interface CardEditCommit {
  token: string;
  loaded: LorcanaJSONCard;                       // the entry as loaded (readPreviewCards), or as its last save left it
  changes: PreviewCardChanges;                   // at least one: a new image alone goes through commitCardImage
  image: {dataUrl: string; ext: string} | null;  // useImageUpload's data URL (or raw base64); jpg, jpeg, png or webp
}
/**
 * One commit: previewCards.json with the entry edited at the base commit (R-67), plus
 * card-images-raw/{id}.{ext} when `image` is set. Messages (R-78):
 *   fix(reveals): update {fullName} ({setCode}{number})[ and its image]
 *   fix(reveals): refresh {fullName} ({setCode}{number}) to its English scan   (changes.scanLanguage === null)
 */
export function commitCardEdit(opts: CardEditCommit): Promise<CommitResult>;
```

**How `commitCardEdit` works.** It follows `commitNewCard`'s shape: one `commitFiles` call, whose `files` callback reads `previewCards.json` at the base commit.
1. `readCardsAt({token, ref: baseCommitSha})` reads the file, parses it and checks for a `cards` array.
2. `checkBaseEntry({cards, loaded})` finds the entry with `loaded.id`. It throws `StaleCardError` when the entry is gone, or differs from `loaded` in `id`, `setCode`, `number` or any of `EDITABLE_CARD_KEYS`, each compared as JSON (R-67). Other keys, `variants` above all, may differ.
3. `replaceCardInPreviewJson(text, {id: loaded.id, changes})` merges the changes into the base entry, so `variants` come from the base.
4. The files are the new `previewCards.json`, plus the stripped scan at `card-images-raw/{id}.{ext}` when `image` is set.

A throw at any step comes before `commitFiles` writes a blob, so nothing is committed. Beyond a failed read and R4-1a's refusals, an edit is refused only by the stale check or by `commitFiles`' race. A reveal, a variants commit or a `convert-reveal-images` commit that lands meanwhile changes other entries, or keys the edit can't write, so it refuses nothing.

- [ ] **Step 1: Check what this task builds on**

R4-1a comes first, on the bumped pin. Run:
```bash
grep -nE "^export (const EDITABLE_CARD_KEYS|type PreviewCardChanges|function mergeCardChanges|function replaceCardInPreviewJson)" src/tools/reveal/replaceCardInPreviewJson.ts
grep -n "replaceCardInPreviewJson(fileText: string, edit: PreviewCardEdit)" src/tools/reveal/replaceCardInPreviewJson.ts
grep -nE "^export (function (targetBranch|utf8ToBase64|stripDataUrl)|async function (readRepoFile|commitFiles)|interface (CommitFile|CommitResult))" src/github/githubCommit.ts
grep -nE "StaleCardError|readPreviewCards|commitCardEdit" src/tools/reveal/githubClient.ts
git -C upstream/inkweave rev-parse --short=8 HEAD
```
Expected:
- **The first** prints four lines (`EDITABLE_CARD_KEYS`, `PreviewCardChanges`, `mergeCardChanges`, `replaceCardInPreviewJson`), and **the second** one. If either prints less, stop: R4-1a hasn't landed, or it changed its signature, and this task's call (`{id: loaded.id, changes}`) must follow it.
- **The third** prints seven lines, from `:14` (`targetBranch`) to `:113` (`commitFiles`).
- **The fourth** prints nothing.
- **The last** prints `16283a13`. If it prints anything else (`bc877e17` is the old pin), the pin bump hasn't merged into this branch's base, or the checkout lags it: run `git submodule update` then `pnpm install --frozen-lockfile`, and if it still differs, stop and tell the controller.

- [ ] **Step 2: Write the failing tests**

Replace `src/tools/reveal/__tests__/githubClient.test.ts` with the file below. It keeps `PREVIEW` (:8), `card` (:32) and `commitNewCard`'s first two cases word for word. Its third case, "writes nothing when previewCards.json cannot be read" (:54-66), becomes the `commitNewCard` row of the shared `it.each`.

```ts
import {describe, it, expect, vi, afterEach} from 'vitest';
import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import {base64ToUtf8} from '../../../test/base64';
import {commitCardEdit, commitNewCard, readPreviewCards, StaleCardError} from '../githubClient';

afterEach(() => vi.restoreAllMocks());

const PREVIEW = '{\n  "metadata": {"language": "en"},\n  "cards": [\n    {\n      "id": 14001,\n      "name": "First"\n    }\n  ]\n}\n';

/** What the stubbed branch holds. */
interface StubFiles {
  /** previewCards.json's text. */
  preview?: string;
  /** The status its read answers: 404 for a missing file, 401 for a rejected token. */
  previewStatus?: number;
}

/** One request the stub answered, with its JSON body. */
interface Call {
  url: string;
  body?: {content?: string; message?: string; tree?: {path: string}[]};
}

// Table-driven GitHub stub: [url matcher, response body, status]. Branch-free, for the complexity gate.
function routes({preview = PREVIEW, previewStatus = 200}: StubFiles): [(url: string) => boolean, string, number][] {
  return [
    [(u) => u.includes('/contents/'), preview, previewStatus],
    [(u) => u.endsWith('/git/ref/heads/master'), JSON.stringify({object: {sha: 'base1'}}), 200],
    [(u) => u.includes('/git/commits/base1'), JSON.stringify({tree: {sha: 'tree1'}}), 200],
    [(u) => u.endsWith('/git/blobs'), JSON.stringify({sha: 'blob1'}), 200],
    [(u) => u.endsWith('/git/trees'), JSON.stringify({sha: 'tree2'}), 200],
    [(u) => u.endsWith('/git/commits'), JSON.stringify({sha: 'commit2', html_url: 'https://github.com/x/y/commit/commit2'}), 200],
    [(u) => u.endsWith('/git/refs/heads/master'), '{}', 200],
  ];
}

function stubGitHub(files: StubFiles = {}): Call[] {
  const table = routes(files);
  const calls: Call[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    calls.push({url: String(url), body: init?.body ? JSON.parse(init.body as string) : undefined});
    const route = table.find(([match]) => match(String(url)));
    if (!route) throw new Error(`unexpected url ${String(url)}`);
    return new Response(route[1], {status: route[2]});
  });
  return calls;
}

/** The refs previewCards.json was read at. */
function readsOf(calls: Call[]): string[] {
  return calls.filter((c) => c.url.includes('/contents/')).map((c) => new URL(c.url).searchParams.get('ref') ?? '');
}

/** What the commit wrote: its tree's paths, each blob as text, its message, and how many ref updates it made. */
function commitOf(calls: Call[]) {
  return {
    paths: calls.find((c) => c.url.endsWith('/git/trees'))?.body?.tree?.map((entry) => entry.path),
    blobs: calls.filter((c) => c.url.endsWith('/git/blobs')).map((c) => base64ToUtf8(c.body?.content ?? '')),
    message: calls.find((c) => c.url.endsWith('/git/commits'))?.body?.message,
    refUpdates: calls.filter((c) => c.url.endsWith('/git/refs/heads/master')).length,
  };
}

function wroteNothing(calls: Call[]): boolean {
  return !calls.some((c) => c.url.endsWith('/git/blobs'));
}

const card = (id: number): LorcanaJSONCard => ({id, name: 'Test', fullName: 'Test', cost: 1, color: 'Amber', inkwell: true, type: 'Action'});

describe('commitNewCard', () => {
  it('adds the card to previewCards.json as it is at the commit it builds on', async () => {
    const calls = stubGitHub();
    await commitNewCard({token: 'tok', card: card(14099), imageBase64: 'data:image/png;base64,Zm9v', imageExt: 'png'});

    expect(calls.find((c) => c.url.includes('/contents/'))?.url).toContain('?ref=base1');
    const [preview, image] = calls.filter((c) => c.url.endsWith('/git/blobs'));
    const ids = (JSON.parse(base64ToUtf8(preview.body?.content ?? '')) as {cards: {id: number}[]}).cards.map((c) => c.id);
    expect(ids).toEqual([14001, 14099]);
    expect(image.body?.content).toBe('Zm9v');
  });

  it("refuses an id that is already in that commit's previewCards.json", async () => {
    const calls = stubGitHub();
    await expect(
      commitNewCard({token: 'tok', card: card(14001), imageBase64: 'Zm9v', imageExt: 'png'}),
    ).rejects.toThrow('Card id 14001 already exists in previewCards.json');
    expect(calls.some((c) => c.url.endsWith('/git/blobs'))).toBe(false);
  });
});

// An edit refuses a file that doesn't round-trip through JSON.stringify(…, null, 2) + '\n'
// (R4-1a), as PREVIEW's one-line metadata doesn't, so the edit cases get files that do.
function previewFile(cards: LorcanaJSONCard[]): string {
  return JSON.stringify({metadata: {language: 'en'}, cards}, null, 2) + '\n';
}

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
const NEIGHBOUR: LorcanaJSONCard = {...EDIT_CARD, id: 14002, name: 'Second', fullName: 'Second', number: 2};
const EDIT_PREVIEW = previewFile([EDIT_CARD, NEIGHBOUR]);
const RENAME = {name: 'Renamed', fullName: 'Renamed'};
const IMAGE = {dataUrl: 'data:image/png;base64,Zm9v', ext: 'png'};
const PREVIEW_JSON = 'apps/web/public/data/previewCards.json';
const RAW_SCAN = 'apps/web/public/card-images-raw/14001.png';

describe('commitCardEdit', () => {
  it('edits previewCards.json as it is at the commit it builds on, with the scan, in one commit', async () => {
    const calls = stubGitHub({preview: EDIT_PREVIEW});
    const result = await commitCardEdit({token: 'tok', loaded: EDIT_CARD, changes: RENAME, image: IMAGE});

    expect(readsOf(calls)).toEqual(['base1']);
    expect(commitOf(calls)).toEqual({
      paths: [PREVIEW_JSON, RAW_SCAN],
      blobs: [previewFile([{...EDIT_CARD, ...RENAME}, NEIGHBOUR]), 'foo'],
      message: 'fix(reveals): update Renamed (141) and its image',
      refUpdates: 1,
    });
    expect(result).toEqual({commitUrl: 'https://github.com/x/y/commit/commit2'});
  });

  it.each([
    {
      name: 'a field edit alone',
      loaded: EDIT_CARD,
      changes: RENAME,
      image: null,
      paths: [PREVIEW_JSON],
      message: 'fix(reveals): update Renamed (141)',
    },
    {
      // admin#14: the English scan, with the card's English name.
      name: 'a refresh to the English scan',
      loaded: {...EDIT_CARD, scanLanguage: 'ja'},
      changes: {...RENAME, scanLanguage: null},
      image: IMAGE,
      paths: [PREVIEW_JSON, RAW_SCAN],
      message: 'fix(reveals): refresh Renamed (141) to its English scan',
    },
    {
      // The mark alone, the English scan already in place: no image, and the name the card keeps.
      name: 'a refresh to the English scan alone',
      loaded: {...EDIT_CARD, scanLanguage: 'ja'},
      changes: {scanLanguage: null},
      image: null,
      paths: [PREVIEW_JSON],
      message: 'fix(reveals): refresh First (141) to its English scan',
    },
  ])('$name: its files and message (R-78)', async ({loaded, changes, image, paths, message}) => {
    const calls = stubGitHub({preview: previewFile([loaded, NEIGHBOUR])});
    await commitCardEdit({token: 'tok', loaded, changes, image});
    expect(commitOf(calls)).toMatchObject({paths, message, refUpdates: 1});
  });

  it('lands on a base whose entry gained variants since the load, and keeps them (R-67)', async () => {
    const base: LorcanaJSONCard = {...EDIT_CARD, variants: [{id: 14224, rarity: 'Enchanted', number: 224}]};
    const calls = stubGitHub({preview: previewFile([base, NEIGHBOUR])});
    await commitCardEdit({token: 'tok', loaded: EDIT_CARD, changes: {cost: 2}, image: null});
    expect(commitOf(calls).blobs).toEqual([previewFile([{...base, cost: 2}, NEIGHBOUR])]);
  });

  it.each([
    ['its cost changed', [{...EDIT_CARD, cost: 2}, NEIGHBOUR], 'Card 14001 changed on master since you loaded it. Load it again.'],
    ['its number changed', [{...EDIT_CARD, number: 3}, NEIGHBOUR], 'Card 14001 changed on master since you loaded it. Load it again.'],
    ['it left the file', [NEIGHBOUR], 'Card 14001 is no longer in previewCards.json on master. Load it again.'],
  ])('refuses with StaleCardError, writing nothing, when %s at the base (R-67)', async (_case, cards, message) => {
    const calls = stubGitHub({preview: previewFile(cards)});
    const error = await commitCardEdit({token: 'tok', loaded: EDIT_CARD, changes: RENAME, image: IMAGE}).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(StaleCardError);
    expect(error).toMatchObject({name: 'StaleCardError', message});
    expect(wroteNothing(calls)).toBe(true);
  });
});

describe('a write that cannot read previewCards.json', () => {
  it.each([
    ['commitNewCard', () => commitNewCard({token: 'tok', card: card(14099), imageBase64: 'Zm9v', imageExt: 'png'})],
    ['commitCardEdit', () => commitCardEdit({token: 'tok', loaded: EDIT_CARD, changes: RENAME, image: IMAGE})],
  ])('%s writes nothing', async (_writer, write) => {
    const calls = stubGitHub({previewStatus: 404});
    await expect(write()).rejects.toThrow(/^GitHub 404 on /);
    expect(wroteNothing(calls)).toBe(true);
  });
});

describe('readPreviewCards', () => {
  it('reads the cards on the target branch', async () => {
    const calls = stubGitHub({preview: EDIT_PREVIEW});
    // Fetched JSON: toEqual, never toStrictEqual (vite.config.ts, the app project).
    expect(await readPreviewCards('tok')).toEqual([EDIT_CARD, NEIGHBOUR]);
    expect(readsOf(calls)).toEqual(['master']);
  });

  it.each([
    ['a missing file', {previewStatus: 404}, /^GitHub 404 on /],
    // isRejectedToken reads this, so Edit can offer Forget token (R-26).
    ['a rejected token', {previewStatus: 401}, /^GitHub 401 on /],
    ['a file with no cards array', {preview: '{\n  "metadata": {}\n}\n'}, 'previewCards.json has no cards array'],
    ['a file that is not JSON', {preview: '<!doctype html>'}, 'previewCards.json is not valid JSON'],
  ])('refuses %s', async (_case, files, error) => {
    stubGitHub(files);
    await expect(readPreviewCards('tok')).rejects.toThrow(error);
  });
});
```

- [ ] **Step 3: Run it, and see it fail**

Run: `pnpm vitest run --project app src/tools/reveal/__tests__/githubClient.test.ts`

Expected: `Tests  14 failed | 3 passed (17)`. The file resolves `'../githubClient'`, so it fails on the missing exports, not at import:
```
TypeError: commitCardEdit is not a function
TypeError: readPreviewCards is not a function
```
The 3 that pass are `commitNewCard`'s two cases and its "writes nothing" row.

- [ ] **Step 4: Write the client**

In `src/tools/reveal/githubClient.ts`, replace the imports (l.1-9) with:

```ts
import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import {insertCardIntoPreviewJson} from './insertCardIntoPreviewJson';
import {EDITABLE_CARD_KEYS, replaceCardInPreviewJson, type PreviewCardChanges} from './replaceCardInPreviewJson';
import {
  commitFiles,
  readRepoFile,
  stripDataUrl,
  targetBranch,
  utf8ToBase64,
  type CommitFile,
  type CommitResult,
} from '../../github/githubCommit';
```

Then append after `commitNewCard` (after l.48), leaving `PREVIEW_PATH`, `RAW_DIR` and `commitNewCard` as they are:

```ts
/**
 * The card's entry changed on the branch since the editor loaded it, or left
 * previewCards.json. Its message ends "Load it again." Edit tells it apart with
 * instanceof, before it reduces a failure to its message (R4-4c).
 */
export class StaleCardError extends Error {
  name = 'StaleCardError';
}

/** previewCards.json's text and cards at `ref`, refusing a file with no cards array. */
async function readCardsAt({token, ref}: {token: string; ref: string}): Promise<{text: string; cards: LorcanaJSONCard[]}> {
  const text = await readRepoFile(token, PREVIEW_PATH, ref);
  let cards: unknown;
  try {
    cards = (JSON.parse(text) as {cards?: unknown} | null)?.cards;
  } catch {
    throw new Error('previewCards.json is not valid JSON');
  }
  if (!Array.isArray(cards)) throw new Error('previewCards.json has no cards array');
  return {text, cards: cards as LorcanaJSONCard[]};
}

/**
 * The cards in previewCards.json on the target branch, the entries Edit loads
 * (R4-4a). The one Edit opens is the `loaded` that commitCardEdit later checks
 * against the commit it builds on.
 */
export async function readPreviewCards(token: string): Promise<LorcanaJSONCard[]> {
  return (await readCardsAt({token, ref: targetBranch()})).cards;
}

/** What the stale check compares (R-67): every key an edit can write, and the card's identity. */
const COMPARED_KEYS: readonly (keyof LorcanaJSONCard)[] = ['id', 'setCode', 'number', ...EDITABLE_CARD_KEYS];

/**
 * Refuses the edit with StaleCardError when the card's entry at the base commit
 * is gone, or differs from `loaded` in a key the edit could write or in its
 * identity (R-67). Keys the edit can't write, such as `variants`, may differ:
 * the edit merges into the entry as it stands there, so they come from it.
 */
function checkBaseEntry({cards, loaded}: {cards: LorcanaJSONCard[]; loaded: LorcanaJSONCard}): void {
  const base = cards.find((card) => card.id === loaded.id);
  const branch = targetBranch();
  if (!base) throw new StaleCardError(`Card ${loaded.id} is no longer in previewCards.json on ${branch}. Load it again.`);
  if (!COMPARED_KEYS.every((key) => JSON.stringify(base[key]) === JSON.stringify(loaded[key]))) {
    throw new StaleCardError(`Card ${loaded.id} changed on ${branch} since you loaded it. Load it again.`);
  }
}

/** One preview card's edit, as Edit saves it (R4-4c). */
export interface CardEditCommit {
  token: string;
  /** The entry as the editor loaded it (readPreviewCards), or as its last save left it. */
  loaded: LorcanaJSONCard;
  /** At least one change (replaceCardInPreviewJson refuses none): a new image alone goes through commitCardImage. */
  changes: PreviewCardChanges;
  /** A staged scan: useImageUpload's data URL (or raw base64) and its extension (jpg, jpeg, png or webp). */
  image: {dataUrl: string; ext: string} | null;
}

/**
 * The commit's message (R-78), in the app history's words: it names the card
 * as the edit leaves it, says "and its image" when a scan goes with the edit,
 * and says "refresh … to its English scan" when the edit drops scanLanguage
 * (admin#14), whatever else it changes.
 */
function editMessage({loaded, changes, image}: CardEditCommit): string {
  const card = `${changes.fullName ?? loaded.fullName} (${loaded.setCode}${loaded.number})`;
  if (changes.scanLanguage === null) return `fix(reveals): refresh ${card} to its English scan`;
  return `fix(reveals): update ${card}${image ? ' and its image' : ''}`;
}

/**
 * One atomic commit on the target branch that edits a preview card's entry in
 * previewCards.json (replaceCardInPreviewJson) and, when `image` is set, adds
 * its raw scan to card-images-raw/{id}.{ext}, which convert-reveal-images
 * turns into the card's preview AVIFs.
 *
 * The file is read at the commit this one builds on, and the edit merges into
 * the entry as it stands there, so `variants` and any other key the edit can't
 * write come from the branch (R-67). Beyond a failed read and
 * replaceCardInPreviewJson's own refusals, it is refused only when the card's
 * entry changed or left the file (StaleCardError), or when the branch moves
 * between the ref read and the update (commitFiles' race, whose message ends
 * "Publish again."). Either way nothing is written. A reveal or a variants
 * commit that lands meanwhile adds entries, or keys the edit can't write, so
 * it refuses nothing.
 */
export async function commitCardEdit(opts: CardEditCommit): Promise<CommitResult> {
  const {token, loaded, changes, image} = opts;
  return commitFiles({
    token,
    message: editMessage(opts),
    files: async (baseCommitSha) => {
      const {text, cards} = await readCardsAt({token, ref: baseCommitSha});
      checkBaseEntry({cards, loaded});
      const edited = replaceCardInPreviewJson(text, {id: loaded.id, changes});
      const files: CommitFile[] = [{path: PREVIEW_PATH, contentBase64: utf8ToBase64(edited)}];
      if (image) files.push({path: `${RAW_DIR}/${loaded.id}.${image.ext}`, contentBase64: stripDataUrl(image.dataUrl)});
      return files;
    },
  });
}
```

- [ ] **Step 5: Run the tests to PASS**

Run: `pnpm vitest run --project app src/tools/reveal/__tests__/githubClient.test.ts src/tools/reveal/__tests__/useRevealAdmin.test.ts`

Expected: `Test Files  2 passed (2)` and `Tests  20 passed (20)`: 17 in `githubClient.test.ts`, and `useRevealAdmin.test.ts`'s 3, which load the changed module through `useRevealAdmin.ts:12`.

- [ ] **Step 6: Lint and typecheck**

```bash
pnpm exec eslint --max-warnings 0 src/tools/reveal/githubClient.ts src/tools/reveal/__tests__/githubClient.test.ts
pnpm typecheck
```
Expected: eslint prints nothing, and `pnpm typecheck` exits 0 (it builds the engine first, then `tsc -b`, which covers the test file). Run nothing more here: the pre-commit hook runs the full lint and `test:run`. No reveal-sync run either: no contract file changed.

- [ ] **Step 7: Code Health**

Run CodeScene's `code_health_review` on `src/tools/reveal/githubClient.ts` and `src/tools/reveal/__tests__/githubClient.test.ts`.

Expected: 10.0 each, with no findings (the sandbox's local MCP 1.5.7 gave that). The PR gate is stricter than the local tool, so check the count by hand too:
- `githubClient.ts`: `commitNewCard(opts)`, `readCardsAt({token, ref})`, `readPreviewCards(token: string)`, `checkBaseEntry({cards, loaded})`, `editMessage(edit)`, `commitCardEdit(opts)`: 1 primitive parameter in 6 (16.7%, against 30%). `StaleCardError` has no constructor.
- The test file: `routes(files)`, `stubGitHub(files)`, `readsOf(calls)`, `commitOf(calls)`, `wroteNothing(calls)`, `card(id: number)`, `previewFile(cards)`: 1 in 7 (14.3%).
- Cyclomatic complexity is 3 or less in every new function, and no condition chains two operators.

If a finding appears, fix it before committing: split the function it names, or pass an object in place of a bare string or number. R4-8 runs `analyze_change_set` before the push.

- [ ] **Step 8: Commit, after the owner approves**

Use the Bash tool. Stage with explicit paths, as its own call:
```bash
git add src/tools/reveal/githubClient.ts src/tools/reveal/__tests__/githubClient.test.ts
```
Run CodeScene's `pre_commit_code_health_safeguard` on the staged change, and go on only when it passes. Then commit, as a separate, unpiped call:
```bash
USER_APPROVED=1 git commit -m "feat(reveal): add commitCardEdit and readPreviewCards, refusing a stale entry (#24)"
```
Husky's pre-commit runs the full lint and `test:run`. If Vitest fails to start its workers under load, stop this session's preview servers, wait out other sessions' runs, and retry; never `--no-verify`.

### Hand-offs from R4-1b

- **R4-4a (`usePreviewCardsFile`).** It reads through `readPreviewCards(token)`. Each entry it keeps is a `loaded` that `commitCardEdit` checks later. Its failure is a plain message: "GitHub 401 on …" for a rejected token (`isRejectedToken`, so the search screen can offer Forget token, R-71), "GitHub 404 on …", "previewCards.json is not valid JSON" or "previewCards.json has no cards array". After a fields save, its `commit(entry)` patch takes R4-4c's `mergeCardChanges(loaded, changes)`. That entry can lack `variants` the base gained: the stale check ignores them, so the next save still lands.
- **R4-4c (the save side).**
  - **Which path.** A preview card with field changes calls `commitCardEdit({token, loaded, changes, image})`, with `image` set only when a scan is staged: `{dataUrl: upload.dataUrl, ext}`, where `ext` comes from the file's name as `useImageAdmin.ts:36` and `useRevealAdmin.ts:125` derive it. A preview card with only a new image, and every image-only card, stays on `commitCardImage`: `commitCardEdit` with no change throws through R4-1a ("the edit changes nothing"). R4-2a's `hasEdits` decides.
  - **Classifying a failure.** Check `error instanceof StaleCardError` first, then reduce the error to its message (`useRevealAdmin.ts:131`), then `isRejectedToken(message)`. A stale message never starts "GitHub 401 on". The mock in its test keeps the real class: `vi.mock('../../reveal/githubClient', async (importOriginal) => ({...(await importOriginal<typeof import('../../reveal/githubClient')>()), commitCardEdit, readPreviewCards}))`, as the outline has it (`R4-card-studio.md:557-562`). The type argument matters: an untyped `importOriginal()` resolves to `unknown`, which TypeScript won't spread.
  - **After a save.** `commitCardEdit` returns `CommitResult` only; the hook adds `withImage: image !== null` for the go-live note (`goLiveNote.ts:8-11`). The next `loaded` is `mergeCardChanges(loaded, changes)`. It matches the committed entry on every compared key, so a second save passes the check before the reload lands.
  - **Load it again (R-68).** `StaleCardError` carries no fresh entry. `loadAgain` re-reads the file through `readPreviewCards`, then keeps each changed field whose fresh value still equals the value the draft started from, and the staged image.
- **R4-4d (branch-only and graduated cards, R-66).** A reveal-band id the card list holds but the file lacks gets no save. If one ever reached `commitCardEdit`, it would refuse it with "Card {id} is no longer in previewCards.json on {branch}. Load it again.", so R4-4d's own message can use the same words.
- **R4-4c, R4-5e and R4-6b (the race's wording in Edit).** `commitFiles`' race message reads "{branch} changed while publishing, so nothing was published. Publish again." (`githubCommit.ts:161`). Either Edit save path can meet it, `commitCardEdit` or `commitCardImage`, so the client doesn't map it, and `githubCommit.ts` stays unchanged. The race is R4-4c's 'other' kind: stale stays false, and saving again is the retry.
  - **R4-4c rewords it once,** in the pure helper that classifies a save's failure (`failureOf` in `src/tools/studio/editSave.ts`, as R4-4c's draft has it). It rewrites exactly that sentence to "{branch} changed while saving, so nothing was saved. Save again." and leaves every other message alone. Its test builds the message from a real non-fast-forward (a stubbed 422 "Update is not a fast forward" on the ref update, as `githubCommit.test.ts:157-167` does), so a change to `githubCommit.ts`'s wording fails it. The helper takes the `Error`, not its message, so it adds no primitive parameter.
  - **R4-5e's `CommitOutcome`** shows the message it is given, so New reveal keeps "Publish again."
  - **R4-6b's Edit pane** shows the save's message as R4-4c leaves it, and needs no helper of its own.
- **R4-7 and R4-8 (docs).** The runbook's Edit section and "R4 as built" quote R-78's messages and the two stale messages from this file as built. R4-8's `analyze_change_set` covers `githubClient.ts`.
