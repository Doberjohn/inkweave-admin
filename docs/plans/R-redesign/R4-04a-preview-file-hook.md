> Part of [R: Admin redesign](../R-redesign.md), phase R4 ([R4-card-studio.md](R4-card-studio.md)). Read the main plan's decisions (R-57 to R-91 for R4), corrections, global constraints and shared interfaces, then the R4 header, first.

> **Re-base notes (R4-4a, 2026-10-07).** Re-based from the 2026-10-01 outline's Task R4-4 (`R4-card-studio.md:414-599`, the `usePreviewCardsFile` half: `:417`, `:431-440`, `:503`, `:510`, `:528`) onto main @ `e5e5029` (R1 to R3 merged, plus the app-pin bump), pin `16283a13`, decisions R-57 to R-91 (R-59, R-66, R-67, R-71 and R-84 bear on this task), and the R4 audit (`.superpowers/sdd/R-redesign/r4-audit-full.json`, entry "R4-4"; `r4-audit-synth.md`, "R4-4"). It consumes R4-1b's `readPreviewCards` as R4-1b's draft has it (`scratchpad/r4-rebase/sandbox-r41b`, 15:32).
> - **The split.** R4-4 is now four tasks. This one, R4-4a, is the file hook alone, with its own test, as the audit asked. R4-4b takes `useCardEditor`'s loading side, R4-4c its save side, and R4-4d the branch-only cards (R-66). The outline listed the hook under `useCardEditor.test.ts` only (`:418`); it now has its own test file, mirroring `useLiveTuning.test.ts`.
> - **The read numbering is state, never a ref** (audit, significant). The outline exposed `requested` during render, and useLiveTuning numbers its reads with a ref (`useLiveTuning.ts:28-31`, `:55`): reading a ref in render fails `react-hooks/refs`, and bumping a counter in the mount effect fails `react-hooks/set-state-in-effect`. The hook now follows R3's `useCardSynergies` (`useCardSynergies.ts:49-72`), whose retry `attempt` is state:
>   - One state object, `FileState`, holds `requested` (1 for the first read, plus one per `reload()` or `commit()`), the file, and the callers waiting.
>   - An effect keyed on `[token, requested]` reads number `requested`. Its cleanup cancels an older read, as `useCardSynergies`' does.
>   - A landing goes through a functional update, `landed`, which drops any read whose number isn't the newest asked for. That covers the one window the cleanup can't: a newer request and an older read's landing reaching React in the same batch (a test pins it).
>   - A ready file's `read` is the number its cards came from.
> - **A failed reload keeps the cards** (C1, audit, significant). The ready state carries `reloadError?`, as `useLiveTuning`'s does (`useLiveTuning.ts:5-10`, `:38-40`). Only a failed first read is `{status: 'error'}`. Without it, the read after a save (`:510`) could fail and put the card just saved behind an error view.
> - **`commit(entry)` is new** (audit, significant). The outline re-read the file after a fields save (`:510`, `:528`), but until that read landed, a card reopened in the meantime seeded from the old entry, and its next save was refused as stale. `commit(entry)` puts the committed entry in place of the one with its id at once, then asks for one more read. That request also makes any read asked for before the commit, which may hold the old entry, land as out of date, so no read can land over the patch.
> - **`reload()` returns a promise** (the outline: `void`). It is the file's Retry too, and it resolves once the newest read asked for lands, with the cards then on screen, or `null` when that read failed. Two departures from `useLiveTuning`'s `reload` (`useLiveTuning.ts:12-13`), both recorded here:
>   - **A replaced caller isn't told null.** A landing answers every caller waiting, because each asked for a read no newer than it. So two quick Retries both resolve with the second read's cards, not null and cards.
>   - **It settles after the landing commits.** The callers wait in state, and an effect settles them once React has rendered the landing. So a caller's `.then()` already sees the new cards on screen, and a focus handoff it requests has a view to take it.
>
>   R-59 has the page ask for its focus handoffs from state, so the promise is for callers that want a single answer: R4-4c's `retry` and `loadAgain`, which both return it (R4-4b's `retry` returns `void`).
> - **Tests can't await a reload inside the act that asks for it.** The read starts in an effect, and React runs that effect only once the act ends (React 19's `act` flushes an async scope's work only after its callback settles). An `await act(async () => { await reload(); })` therefore never settles: the test times out after 5 s, and every later test in the file sees `result.current` as `null`. The sandbox hit exactly that. So the test's `reloaded()` helper asks inside `await act(async () => {…})` and awaits the promise after it, and the deferred cases call `act(() => { p = reload(); })` and finish the read in a later act. R4-4b and R4-4c's hook tests need the same pattern (see the hand-offs).
>   - **The same holds in the app for an async transition or a form action** (`startTransition(async () => …)`, `useActionState`, `<form action>`): React holds their updates until the action ends, so a `reload()` awaited inside one never starts its read. The verifier's sandbox confirmed it: inside `startTransition(async () => { await reload(); })` the read never started, while the same call from a plain async function settled. No R4 draft uses either. The hook's doc comment says so, and the hand-offs repeat it.
> - **The file's state is independent of any card** (audit, significant; R-71). The hook takes only the token and never sees a card id. R4-4b passes its status, `error`, `reloadError` and `reload` to the Edit search, so the search shows a loading or error state, never Released tags, until the file is ready.
> - **A 401 passes through as GitHub worded it** (R-26; the audit's missing-401 finding). `readRepoFile` words a refused token "GitHub 401 on apps/web/public/data/previewCards.json: …" (`src/github/githubCommit.ts:88`), and `isRejectedToken` (`src/github/rejectedToken.ts:6-8`) matches that prefix. The hook keeps the message unchanged in `error` or `reloadError`, and two tests pin that `isRejectedToken` still knows it. The hook classifies nothing: R4-4c sorts the failures into stale, rejected-token and other, and R4-6b offers Forget token (R-84's confirm while a draft is dirty).
> - **One token per mount.** R-84 keys the studio's workspace by token, so a new token remounts the hook and reads afresh. The effect still re-reads on a token change in place, and its cleanup drops the old token's late read (a test pins it). That read keeps the same number, so a draft following reads (R4-4b) isn't told about it. The remount makes that moot.
> - **Pure transitions, thin hook** (the hard rules; audit, Code Health). `previewCardsFile.ts` holds the types and the transitions (`askedAgain`, `landed`, `committed`, `readError`), with no React. `usePreviewCardsFile.ts` is wiring: one `useState`, the read effect, the settle effect, and two setters. It also re-exports `PreviewCardsFile`, because the sibling drafts name it from both modules: R4-4b from `usePreviewCardsFile.ts`, R4-4c and R4-4d from `previewCardsFile.ts`.
> - **The audit's "a file with no cards array is an error" case** belongs to R4-1b: its private `readCardsAt` throws "previewCards.json has no cards array", and its test pins that. To this hook it is one more rejection, whose message passes through as the 502's and the 401's do.
> - **Pin facts, re-checked at `16283a13`.** This task reads only the engine's `LorcanaJSONCard` (`packages/synergy-engine/src/utils/cardTransformer.ts:31`). Its fixtures are two hand-built set-14 entries, so no count from the pinned `previewCards.json` is written down. Graduation leaves `cards: []`, which the hook shows as ready, with no ids.
> - **Gates once.** The steps are:
>   - the one test file, run through `--project app`;
>   - eslint on the three new files;
>   - one `pnpm typecheck`;
>   - Code Health, with the hand count;
>   - the commit, with `pre_commit_code_health_safeguard` between `git add` and the commit (CLAUDE.md).
>
>   They leave out:
>   - the reveal-sync run, because no contract file changes;
>   - `pnpm lint` and `pnpm test:run`, which the pre-commit hook runs;
>   - a story, because the hook draws nothing.
> - **Verified** in `scratchpad/r4-rebase/sandbox-R4-4a`.
>   - **Setup.** The sandbox holds a copy of `src/` from the working tree, which is main `b490fb7` plus the uncommitted bump to `16283a13`, plus R4-1a's `replaceCardInPreviewJson.ts` and R4-1b's `githubClient.ts` as their drafts had them (`sandbox-r41b`, 15:32). `node_modules` and `upstream/` are junctioned in, and Vite's cache and the tsbuildinfo stay in the sandbox.
>   - **Results:**
>     - Step 3's failure was observed, with the message quoted there. Then all 17 tests passed, each in about 100 ms or less, with no `act(...)` warning.
>     - `tsc -p tsconfig.app.json` reported no errors, and `--listFilesOnly` lists all three files.
>     - Run from the repo, `pnpm exec eslint --max-warnings 0 --stdin` is clean on all three.
>     - **Mutation run: 11 of the 12 mutants were killed**, each by 1 to 11 tests:
>       - no number check in `landed`;
>       - no cancel flag in the read effect;
>       - a failed reload that drops the cards (C1);
>       - a commit that doesn't read again;
>       - a commit that doesn't patch;
>       - waiting callers never answered;
>       - a landing that keeps the old `reloadError`;
>       - a reload that asks for no read;
>       - a failed read that resolves with the old cards;
>       - a wrong `read` number;
>       - a read made without the token.
>
>       The survivor leaves `waiting` uncleared after a landing. It is equivalent: the next landing settles those callers again, and settling a settled promise does nothing. The list would only grow.
>     - CodeScene MCP 1.5.7's `code_health_review` gave all three files 10.0, with no findings. It ran in a throwaway git directory in the scratchpad, because the CLI needs a repository.
>     - Counted from the TypeScript AST: `previewCardsFile.ts` has 0 primitive parameters in 9, `usePreviewCardsFile.ts` 1 in 2, and the test 0 in 3.
>   - **Re-verified by the plan's verifier** in `scratchpad/r4-rebase/sandbox-v-R4-4a`: a fresh copy of `src/` from the working tree, with R4-1a's and R4-1b's files from their verified drafts (`sandbox-r41b-verify`, 17:04; `githubClient.ts` is unchanged from 15:32). Step 3's failure reproduced word for word, and the final code blocks (with the `PreviewCardsFile` re-export and the transition note) gave 17 of 17 with no `act(...)` warning, a clean `tsc -p tsconfig.app.json` (plus a probe importing the type from both modules), clean `eslint --stdin` on all three, and CodeScene 10.0 on all three. Six mutants were re-run and each was killed: no number check, no cancel flag, a commit that doesn't read again, a commit that doesn't patch, a failed reload that drops the cards, and waiters never answered.

### Task R4-4a: Edit's read of previewCards.json (`usePreviewCardsFile`)

**Files:**
- Create:
  - `src/tools/studio/previewCardsFile.ts`: the types and the pure transitions.
  - `src/tools/studio/usePreviewCardsFile.ts`: the hook.
- Test (create): `src/tools/studio/__tests__/usePreviewCardsFile.test.ts`.
- No other file changes. No story: the hook draws nothing.

**Interfaces:**
- **Consumes:**
  - `readPreviewCards(token: string): Promise<LorcanaJSONCard[]>` from `src/tools/reveal/githubClient.ts` (R4-1b). It reads `apps/web/public/data/previewCards.json` at `targetBranch()` through `readRepoFile`, and rejects with an `Error` on a failed request ("GitHub {status} on …"), on text that isn't JSON, or on a file with no `cards` array.
  - `LorcanaJSONCard` from `inkweave-synergy-engine` (the engine's `cardTransformer.ts:31` at the pin).
  - Tests only: `isRejectedToken(message: string): boolean` (`src/github/rejectedToken.ts:6`).
  - Patterns, not imports: `useLiveTuning` (`src/tools/tuning/useLiveTuning.ts:5-62`) and its test (`src/tools/tuning/__tests__/useLiveTuning.test.ts:17-147`), and `useCardSynergies`' state-held retry and cancel flag (`src/tools/analytics/cards/useCardSynergies.ts:49-72`).
- **Produces:**
```ts
// src/tools/studio/previewCardsFile.ts
/** previewCards.json as Edit last read it from the target branch (usePreviewCardsFile). */
export type PreviewCardsFile =
  | {status: 'loading'}
  // read: the number of the read these cards came from (1 for the first).
  // reloadError: the last read failed, and these are the cards an earlier read gave (C1).
  | {status: 'ready'; cards: LorcanaJSONCard[]; ids: ReadonlySet<number>; read: number; reloadError?: string}
  // No read has landed yet.
  | {status: 'error'; error: string};
// Also exported for the hook: Waiter, Answer, FileState, Landing, FIRST_READ, readError,
// askedAgain(prev, waiter), landed(prev, landing), committed(prev, entry). Step 4 has them in full.

// src/tools/studio/usePreviewCardsFile.ts
export type {PreviewCardsFile};   // re-exported: R4-4b names it from here, R4-4c and R4-4d from previewCardsFile.ts
export type UsePreviewCardsFileResult = PreviewCardsFile & {
  /** The newest read asked for. A ready file's `read` catches up with it when that read lands. */
  requested: number;
  /** Reads again; the file's Retry too. Resolves once the newest read asked for lands: its cards, or null. */
  reload: () => Promise<LorcanaJSONCard[] | null>;
  /** A fields save landed: put the committed entry in place now, and read the file again. */
  commit: (entry: LorcanaJSONCard) => void;
};
export function usePreviewCardsFile(token: string): UsePreviewCardsFileResult;
```

**How it behaves.**

| Event | `requested` | The file | Callers waiting |
|---|---|---|---|
| Mount | 1 | `loading` | none |
| Read N lands, N = `requested` | as it was | `ready`, `read: N`, no `reloadError` | answered with the cards |
| Read N fails, N = `requested`, with no cards yet | as it was | `error` | answered with `null` |
| Read N fails, N = `requested`, over ready cards | as it was | the same cards and `read`, plus `reloadError` (C1) | answered with `null` |
| Read N lands or fails, N < `requested` | as it was | unchanged | still waiting |
| `reload()` | +1 | unchanged until that read lands; an `error` stays `error` (no `loading`), as `useLiveTuning`'s does | + this caller |
| `commit(entry)` | +1 | ready: the entry with `entry.id` replaced at once, `read` unchanged; otherwise unchanged | unchanged |

- **`requested` running ahead of `read`** means a read is in flight, or the last read failed: a failed reload leaves `read` where it was. Use `reloadError` to tell the two apart.
- **A new token** re-reads under the same number, and the old token's late read is dropped. R-84 remounts the hook on a token change anyway.
- **On unmount,** the read in flight is dropped, and a pending `reload()` never settles.

**Code Health.**
- **Complexity.** `fileAfter` and `landed` (its ternary) have cyclomatic complexity 3, `committed` 2, and every other function 1 or 2. No function takes more than 2 arguments, and there is no `||` chain.
- **Primitive parameters, counted by hand** (string, number, boolean):
  - `previewCardsFile.ts`: 0 in 9. `readError(e: unknown)`, `askedAgain(prev, waiter)`, `fileAfter(prev, landing)`, `landed(prev, landing)` and `committed(prev, entry)` take objects or `unknown`. Every number travels inside a `Landing` or the state.
  - `usePreviewCardsFile.ts`: 1 in 2, `usePreviewCardsFile(token: string)`. The other is the effect's `land(landing: Landing)`. That is `useLiveTuning.ts`' shape (2 in 4), which passed R2's PR gate, and `nav.ts` passed R3's gate with only string parameters. Don't add a string or number parameter here: pass an object.
  - The test: 0 in 3, `entry({id, name})`, `loaded(cards)` and `reloaded(result)`.
- **Test shape.** At most 4 consecutive `expect`s per block. Shared builders (`entry`, `loaded`, `deferRead`, `reloaded`) keep the 17 cases short.

- [ ] **Step 1: Check what this task builds on**

R4-4a needs R4-1b's `readPreviewCards`, on main after the pin bump with the engine built. Run, with the Bash tool:
```bash
git submodule status upstream/inkweave
ls upstream/inkweave/packages/synergy-engine/dist/index.js
grep -n "export async function readPreviewCards" src/tools/reveal/githubClient.ts
grep -n "export function isRejectedToken" src/github/rejectedToken.ts
grep -n "export function useCardSynergies\|let cancelled" src/tools/analytics/cards/useCardSynergies.ts
ls src/tools/studio/previewCardsFile.ts src/tools/studio/usePreviewCardsFile.ts
```
Expected:
- **The submodule line** starts with a space, then `16283a13502106205b8ed15c7bb33e89e2fe4e6f upstream/inkweave`.
  - A leading `+` means the checkout differs from main's pin. Run `git submodule update`, then `pnpm install --frozen-lockfile`.
  - A different sha means the bump hasn't merged. Stop and ask the controller.
- **The first `ls`** prints the path. If it fails, run `pnpm build:engine` once.
- **The `readPreviewCards` grep** prints one line ending `readPreviewCards(token: string): Promise<LorcanaJSONCard[]> {`.
  - No line means R4-1b hasn't landed. Stop: this task builds on it.
  - Another signature (an options object, say) changes Step 5's one call, `readPreviewCards(token)`. Stop and ask the controller.
- **The `isRejectedToken` grep** prints `6:export function isRejectedToken(message: string): boolean {`.
- **The `useCardSynergies` grep** prints two lines, `49:` and `56:`: the pattern Step 5 follows.
- **The last `ls`** fails with `No such file or directory` for both paths. `src/tools/studio/` itself exists from R4-3a and R4-5a, and the Write tool creates `__tests__/` if it's missing.

- [ ] **Step 2: Write the failing test**

Create `src/tools/studio/__tests__/usePreviewCardsFile.test.ts`:
```ts
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from '@testing-library/react';
import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import {isRejectedToken} from '../../../github/rejectedToken';
import {usePreviewCardsFile, type UsePreviewCardsFileResult} from '../usePreviewCardsFile';

const readPreviewCards = vi.hoisted(() => vi.fn());
vi.mock('../../reveal/githubClient', () => ({readPreviewCards}));

const BAD_GATEWAY = 'GitHub 502 on apps/web/public/data/previewCards.json: Bad gateway';
// readRepoFile's wording for a token GitHub refused (githubCommit.ts), which isRejectedToken matches.
const UNAUTHORIZED = 'GitHub 401 on apps/web/public/data/previewCards.json: {"message":"Bad credentials"}';

/** A set-14 preview entry, as previewCards.json holds one. */
const entry = ({id, name}: {id: number; name: string}): LorcanaJSONCard => ({
  id,
  name,
  fullName: name,
  cost: 1,
  color: 'Amber',
  inkwell: true,
  type: 'Action',
  setCode: '14',
  number: id - 14000,
});

const FIRST = entry({id: 14001, name: 'First'});
const SECOND = entry({id: 14002, name: 'Second'});
// SECOND as a save committed it, and as the branch holds it on the next read.
const RENAMED = {...SECOND, name: 'Renamed', fullName: 'Renamed'};
const BEFORE = [FIRST, SECOND];
const AFTER = [FIRST, RENAMED];
const IDS = new Set([14001, 14002]);

beforeEach(() => {
  // A block, not an arrow's value: mockReset() returns the mock, and Vitest calls a function a hook returns as its teardown.
  readPreviewCards.mockReset();
});

/** Renders the hook once its first read has landed with `cards`. */
async function loaded(cards: LorcanaJSONCard[]) {
  readPreviewCards.mockResolvedValueOnce(cards);
  const {result} = renderHook(() => usePreviewCardsFile('tok'));
  await waitFor(() => expect(result.current).toMatchObject({status: 'ready', read: 1}));
  return result;
}

/** The next read, finishing only when the test says so. */
function deferRead() {
  let finish: (cards: LorcanaJSONCard[]) => void = () => {};
  let fail: (e: Error) => void = () => {};
  readPreviewCards.mockReturnValueOnce(
    new Promise<LorcanaJSONCard[]>((resolve, reject) => {
      finish = resolve;
      fail = reject;
    }),
  );
  return {finish: (cards: LorcanaJSONCard[]) => finish(cards), fail: (e: Error) => fail(e)};
}

/**
 * Asks for a reload and returns what it resolves with. The read starts in an
 * effect, which runs only once the act that asked for it ends, so the promise
 * is awaited after that act, never inside it.
 */
async function reloaded(result: {current: UsePreviewCardsFileResult}): Promise<LorcanaJSONCard[] | null> {
  let settled: Promise<LorcanaJSONCard[] | null> = Promise.resolve(null);
  await act(async () => {
    settled = result.current.reload();
  });
  return settled;
}

describe('usePreviewCardsFile', () => {
  it('reads previewCards.json from the branch once, as read 1, with its ids', async () => {
    const result = await loaded(BEFORE);
    expect(result.current).toEqual({
      status: 'ready',
      cards: BEFORE,
      ids: IDS,
      read: 1,
      requested: 1,
      reload: expect.any(Function),
      commit: expect.any(Function),
    });
    expect(readPreviewCards).toHaveBeenCalledTimes(1);
    expect(readPreviewCards).toHaveBeenCalledWith('tok');
  });

  it('reloads on request, showing the cards it has until the new ones arrive', async () => {
    const result = await loaded(BEFORE);
    const next = deferRead();
    act(() => {
      void result.current.reload();
    });
    expect(result.current).toMatchObject({status: 'ready', cards: BEFORE, read: 1, requested: 2});

    await act(async () => next.finish(AFTER));
    expect(result.current).toMatchObject({status: 'ready', cards: AFTER, read: 2, requested: 2});
  });

  it('resolves a reload once its cards are on screen, with those cards', async () => {
    const result = await loaded(BEFORE);
    readPreviewCards.mockResolvedValueOnce(AFTER);
    let whenSettled: unknown = null;
    await act(async () => {
      void result.current.reload().then((cards) => {
        whenSettled = {cards, shown: result.current.status === 'ready' && result.current.read};
      });
    });
    expect(whenSettled).toEqual({cards: AFTER, shown: 2});
  });

  it('says why the first read failed, with no cards to show', async () => {
    readPreviewCards.mockRejectedValueOnce(new Error(BAD_GATEWAY));
    const {result} = renderHook(() => usePreviewCardsFile('tok'));
    await waitFor(() => expect(result.current).toMatchObject({status: 'error', error: BAD_GATEWAY}));
    expect(result.current).not.toHaveProperty('cards');
  });

  it('retries a failed first read, and resolves the retry once its cards are on screen', async () => {
    readPreviewCards.mockRejectedValueOnce(new Error(BAD_GATEWAY));
    const {result} = renderHook(() => usePreviewCardsFile('tok'));
    await waitFor(() => expect(result.current).toMatchObject({status: 'error'}));

    readPreviewCards.mockResolvedValueOnce(BEFORE);
    expect(await reloaded(result)).toEqual(BEFORE);
    expect(result.current).toMatchObject({status: 'ready', cards: BEFORE, read: 2, requested: 2});
  });

  it('resolves a failed reload with null, and keeps the last cards it read beside the reason', async () => {
    const result = await loaded(BEFORE);
    readPreviewCards.mockRejectedValueOnce(new Error(BAD_GATEWAY));
    expect(await reloaded(result)).toBeNull();
    // The card on screen, and a save's outcome, stay beside the error (C1).
    expect(result.current).toEqual({
      status: 'ready',
      cards: BEFORE,
      ids: IDS,
      read: 1,
      reloadError: BAD_GATEWAY,
      requested: 2,
      reload: expect.any(Function),
      commit: expect.any(Function),
    });
  });

  it('drops the reload error once a read lands', async () => {
    const result = await loaded(BEFORE);
    readPreviewCards.mockRejectedValueOnce(new Error(BAD_GATEWAY));
    await reloaded(result);
    readPreviewCards.mockResolvedValueOnce(AFTER);
    await reloaded(result);
    expect(result.current).not.toHaveProperty('reloadError');
    expect(result.current).toMatchObject({status: 'ready', cards: AFTER, read: 3, requested: 3});
  });

  it('stays on the failed first read when reading again fails too', async () => {
    readPreviewCards.mockRejectedValueOnce(new Error('GitHub 404 on apps/web/public/data/previewCards.json: Not Found'));
    const {result} = renderHook(() => usePreviewCardsFile('tok'));
    await waitFor(() => expect(result.current).toMatchObject({status: 'error'}));
    readPreviewCards.mockRejectedValueOnce(new Error(BAD_GATEWAY));
    await reloaded(result);
    expect(result.current).toEqual({
      status: 'error',
      error: BAD_GATEWAY,
      requested: 2,
      reload: expect.any(Function),
      commit: expect.any(Function),
    });
  });

  it('keeps a first read refused for the token as GitHub worded it, so the page can offer Forget token (R-26)', async () => {
    readPreviewCards.mockRejectedValueOnce(new Error(UNAUTHORIZED));
    const {result} = renderHook(() => usePreviewCardsFile('tok'));
    await waitFor(() => expect(result.current).toMatchObject({status: 'error', error: UNAUTHORIZED}));
    expect(result.current.status === 'error' && isRejectedToken(result.current.error)).toBe(true);
  });

  it('keeps the cards beside a reload refused for the token, worded as GitHub worded it (R-26)', async () => {
    const result = await loaded(BEFORE);
    readPreviewCards.mockRejectedValueOnce(new Error(UNAUTHORIZED));
    await reloaded(result);
    expect(result.current).toMatchObject({status: 'ready', cards: BEFORE, reloadError: UNAUTHORIZED});
    expect(result.current.status === 'ready' && isRejectedToken(result.current.reloadError ?? '')).toBe(true);
  });

  it('ignores an older read that fails after a newer one landed', async () => {
    const result = await loaded(BEFORE);
    const older = deferRead();
    readPreviewCards.mockResolvedValueOnce(AFTER);
    act(() => {
      void result.current.reload();
    });
    await reloaded(result);
    await act(async () => older.fail(new Error(BAD_GATEWAY)));

    expect(result.current).not.toHaveProperty('reloadError');
    expect(result.current).toMatchObject({status: 'ready', cards: AFTER, read: 3, requested: 3});
  });

  it('keeps the newest read when an older one lands after it, and answers both callers with its cards', async () => {
    const result = await loaded(BEFORE);
    const older = deferRead();
    readPreviewCards.mockResolvedValueOnce(AFTER);
    let first: Promise<LorcanaJSONCard[] | null> = Promise.resolve(null);
    act(() => {
      first = result.current.reload();
    });
    await reloaded(result);
    await act(async () => older.finish(BEFORE));

    expect(result.current).toMatchObject({status: 'ready', cards: AFTER, read: 3});
    await expect(first).resolves.toEqual(AFTER);
  });

  it('drops a read that lands in the tick a newer one is asked for', async () => {
    const result = await loaded(BEFORE);
    const older = deferRead();
    const newer = deferRead();
    act(() => {
      void result.current.reload();
    });
    // The newer request and the older read's landing reach React in one batch, before the older read is cancelled.
    await act(async () => {
      void result.current.reload();
      older.finish([FIRST]);
      await Promise.resolve();
    });
    expect(result.current).toMatchObject({cards: BEFORE, read: 1, requested: 3});

    await act(async () => newer.finish(AFTER));
    expect(result.current).toMatchObject({cards: AFTER, read: 3});
  });

  it('reads again for a new token, and drops the old token’s read when it lands late', async () => {
    const old = deferRead();
    readPreviewCards.mockResolvedValueOnce(AFTER);
    const {result, rerender} = renderHook(({token}) => usePreviewCardsFile(token), {initialProps: {token: 'old'}});
    rerender({token: 'new'});
    await waitFor(() => expect(result.current).toMatchObject({status: 'ready', cards: AFTER}));

    await act(async () => old.finish(BEFORE));
    expect(result.current).toMatchObject({cards: AFTER, read: 1});
    expect(readPreviewCards).toHaveBeenLastCalledWith('new');
  });

  it('puts a committed entry in place at once, then reads the file again', async () => {
    const result = await loaded(BEFORE);
    const next = deferRead();
    act(() => result.current.commit(RENAMED));
    // A card reopened now seeds from what was committed, not from the read before the save.
    expect(result.current).toMatchObject({status: 'ready', cards: AFTER, ids: IDS, read: 1, requested: 2});
    expect(readPreviewCards).toHaveBeenCalledTimes(2);

    await act(async () => next.finish(AFTER));
    expect(result.current).toMatchObject({status: 'ready', cards: AFTER, read: 2, requested: 2});
  });

  it('never lets a read asked for before a commit land over it', async () => {
    const result = await loaded(BEFORE);
    const beforeCommit = deferRead();
    const afterCommit = deferRead();
    let asked: Promise<LorcanaJSONCard[] | null> = Promise.resolve(null);
    act(() => {
      asked = result.current.reload();
    });
    act(() => result.current.commit(RENAMED));

    // The read from before the commit still holds the old entry: it is dropped, and the caller waits on.
    await act(async () => beforeCommit.finish(BEFORE));
    expect(result.current).toMatchObject({cards: AFTER, read: 1, requested: 3});

    await act(async () => afterCommit.finish(AFTER));
    expect(result.current).toMatchObject({cards: AFTER, read: 3});
    await expect(asked).resolves.toEqual(AFTER);
  });

  it('leaves the cards alone when the committed entry isn’t among them', async () => {
    const result = await loaded([FIRST]);
    deferRead();
    act(() => result.current.commit(RENAMED));
    expect(result.current).toMatchObject({status: 'ready', cards: [FIRST], read: 1, requested: 2});
  });
});
```

- [ ] **Step 3: Run it, and see it fail**

Run: `pnpm vitest run --project app src/tools/studio/__tests__/usePreviewCardsFile.test.ts`

Expected: FAIL, with `Test Files  1 failed (1)`, `Tests  no tests` and:
```
Error: Failed to resolve import "../usePreviewCardsFile" from "src/tools/studio/__tests__/usePreviewCardsFile.test.ts". Does the file exist?
```

- [ ] **Step 4: Write `previewCardsFile.ts`**

Create `src/tools/studio/previewCardsFile.ts`:
```ts
import type {LorcanaJSONCard} from 'inkweave-synergy-engine';

/** previewCards.json as Edit last read it from the target branch (usePreviewCardsFile). */
export type PreviewCardsFile =
  | {status: 'loading'}
  // read: the number of the read these cards came from (1 for the first).
  // reloadError: the last read failed, and these are the cards an earlier read gave (C1).
  | {status: 'ready'; cards: LorcanaJSONCard[]; ids: ReadonlySet<number>; read: number; reloadError?: string}
  // No read has landed yet.
  | {status: 'error'; error: string};

/** Settles one reload() caller's promise: with the cards on screen, or null when the read failed. */
export type Waiter = (cards: LorcanaJSONCard[] | null) => void;

/** The callers a read that landed answers, and what it put on screen. */
export interface Answer {
  waiters: readonly Waiter[];
  cards: LorcanaJSONCard[] | null;
}

/** usePreviewCardsFile's one state object. The read numbering lives here, not in a ref. */
export interface FileState {
  /** The newest read asked for: 1 for the first, then one more per reload() or commit(). */
  requested: number;
  file: PreviewCardsFile;
  /** reload() callers whose read hasn't landed yet. */
  waiting: readonly Waiter[];
  /** The callers the last read to land answered, for the hook's effect to settle once it is on screen. */
  answered: Answer;
}

/** A read that finished: its number, and the cards it gave or why it failed. */
export type Landing = {read: number; cards: LorcanaJSONCard[]} | {read: number; error: string};

export const FIRST_READ: FileState = {
  requested: 1,
  file: {status: 'loading'},
  waiting: [],
  answered: {waiters: [], cards: null},
};

/** A failed read's reason, as useLiveTuning words one. */
export function readError(e: unknown): string {
  return e instanceof Error ? e.message : 'Read failed';
}

/** reload(): one more read asked for, and its caller waiting for it. */
export function askedAgain(prev: FileState, waiter: Waiter): FileState {
  return {...prev, requested: prev.requested + 1, waiting: [...prev.waiting, waiter]};
}

/** What a landing puts on screen. A failed reload keeps the cards an earlier read gave, beside its reason (C1). */
function fileAfter(prev: PreviewCardsFile, landing: Landing): PreviewCardsFile {
  if ('cards' in landing) {
    const {read, cards} = landing;
    return {status: 'ready', cards, ids: new Set(cards.map((card) => card.id)), read};
  }
  if (prev.status === 'ready') return {...prev, reloadError: landing.error};
  return {status: 'error', error: landing.error};
}

/**
 * A read finished. Only the newest read asked for lands: an older one, which a
 * reload() or commit() made since has replaced, changes nothing. The landing
 * answers every caller waiting, since each asked for a read no newer than it.
 */
export function landed(prev: FileState, landing: Landing): FileState {
  if (landing.read !== prev.requested) return prev;
  const cards = 'cards' in landing ? landing.cards : null;
  return {...prev, file: fileAfter(prev.file, landing), waiting: [], answered: {waiters: prev.waiting, cards}};
}

/**
 * A save committed `entry` (R4-4c): it takes the place of the entry with its
 * id at once, so a card reopened before the next read lands seeds from what was
 * committed. One more read is asked for too, so no read asked for before the
 * commit, which may predate it, can land over the patch. An id the cards lack
 * changes nothing on screen; that read brings it.
 */
export function committed(prev: FileState, entry: LorcanaJSONCard): FileState {
  const next = {...prev, requested: prev.requested + 1};
  if (prev.file.status !== 'ready') return next;
  const cards = prev.file.cards.map((card) => (card.id === entry.id ? entry : card));
  return {...next, file: {...prev.file, cards}};
}
```

- [ ] **Step 5: Write `usePreviewCardsFile.ts`**

Create `src/tools/studio/usePreviewCardsFile.ts`:
```ts
import {useEffect, useState} from 'react';
import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import {readPreviewCards} from '../reveal/githubClient';
import {
  FIRST_READ,
  askedAgain,
  committed,
  landed,
  readError,
  type FileState,
  type Landing,
  type PreviewCardsFile,
} from './previewCardsFile';

// The file's type lives in previewCardsFile.ts; the hook's consumers may name it from either module.
export type {PreviewCardsFile};

/** What usePreviewCardsFile gives: the file's state, the read numbering, and the two ways to change it. */
export type UsePreviewCardsFileResult = PreviewCardsFile & {
  /** The newest read asked for. A ready file's `read` catches up with it when that read lands. */
  requested: number;
  /**
   * Reads previewCards.json again, and is the file's Retry after a failed
   * first read. Resolves once the newest read asked for lands, this one or a
   * later one: with the cards then on screen, or null when that read failed
   * (the state says why). Never settles if the hook unmounts first. The read
   * starts in an effect, which runs only once the update that asked for it
   * commits. So a test awaits the promise after the act that asked, never
   * inside it, and no caller awaits it inside an async transition or a form
   * action, whose updates React holds until the action ends.
   */
  reload: () => Promise<LorcanaJSONCard[] | null>;
  /** A fields save landed: put the committed entry in place now, and read the file again. */
  commit: (entry: LorcanaJSONCard) => void;
};

/**
 * Reads previewCards.json from the target branch: once on mount, and again on
 * each reload() or commit(). The numbering is state, as useCardSynergies'
 * attempt is: the effect reads number `requested`, a newer request cancels an
 * older read, and only the newest read asked for lands (`landed`). The cards
 * on screen stay until the next read lands, and after a failed reload too
 * (C1, as in useLiveTuning). The studio's workspace is keyed by token (R-84),
 * so a new token remounts the hook and reads afresh.
 */
export function usePreviewCardsFile(token: string): UsePreviewCardsFileResult {
  const [state, setState] = useState<FileState>(FIRST_READ);
  const {requested, answered} = state;

  useEffect(() => {
    let cancelled = false;
    const land = (landing: Landing) => {
      if (!cancelled) setState((prev) => landed(prev, landing));
    };
    readPreviewCards(token).then(
      (cards) => land({read: requested, cards}),
      (e: unknown) => land({read: requested, error: readError(e)}),
    );
    return () => {
      cancelled = true;
    };
  }, [token, requested]);

  // Settled after the landing commits, so a caller's .then() sees the new state on screen.
  useEffect(() => {
    for (const settle of answered.waiters) settle(answered.cards);
  }, [answered]);

  return {
    ...state.file,
    requested,
    reload: () => new Promise((resolve) => setState((prev) => askedAgain(prev, resolve))),
    commit: (entry) => setState((prev) => committed(prev, entry)),
  };
}
```

Notes for the implementer:
- **Keep the two guards.** The cancel flag drops a read the effect's cleanup replaced (a newer request, a new token, an unmount). The number check in `landed` drops a read that lands in the same batch as a newer request, before the cleanup has run. Each has a test that fails without it.
- **Keep the callers in state, and settle them in an effect.** Settling them in the read's callback would answer a caller before the cards are on screen. With the landing check inside a functional update, that callback can't know whether its read landed.
- **No `useMemo`, `useCallback` or `useRef`.** `reload` and `commit` are new functions each render; the React Compiler memoizes them.

- [ ] **Step 6: Run it to PASS**

Run: `pnpm vitest run --project app src/tools/studio/__tests__/usePreviewCardsFile.test.ts`

Expected: PASS, with `Test Files  1 passed (1)` and `Tests  17 passed (17)`, each test in well under a second, and no `act(...)` warning on stderr.

A test that hangs for 5 s, after which every later test sees `result.current` as `null`, has awaited a reload inside the act that asked for it. Await it after that act, as `reloaded()` does.

- [ ] **Step 7: Lint and typecheck**

Run: `pnpm exec eslint --max-warnings 0 src/tools/studio/previewCardsFile.ts src/tools/studio/usePreviewCardsFile.ts src/tools/studio/__tests__/usePreviewCardsFile.test.ts`
Expected: no output, exit 0. `react-hooks/set-state-in-effect` is clean, because the read effect's one `setState` runs only in the read's two callbacks, never in the effect's body. `react-hooks/refs` is clean, because there is no ref.

Run: `pnpm typecheck`
Expected: exit 0. It builds the engine, then runs `tsc -b`, which checks the test file too. Nothing imports the hook yet: R4-4b is its first consumer.

Don't run `pnpm lint` or `pnpm test:run` here. The pre-commit hook runs both.

- [ ] **Step 8: Code Health**

Run CodeScene's `code_health_review` on the three new files, by absolute path:
- `src/tools/studio/previewCardsFile.ts`
- `src/tools/studio/usePreviewCardsFile.ts`
- `src/tools/studio/__tests__/usePreviewCardsFile.test.ts`

Expected: 10.0 each, with no findings (MCP 1.5.7 gave that in the sandbox).

The PR gate is stricter than the local tool, so confirm the hand count in "Code Health" above against the files as written: 0 primitive parameters in 9 for the module, 1 in 2 for the hook, 0 in 3 for the test. If a review comment adds a helper, give it the state, a `Landing` or another object, never a bare string or number. R4-8 runs `analyze_change_set` before the push.

- [ ] **Step 9: Commit, after the owner approves**

Use the Bash tool. Stage with explicit paths, as its own call:
```bash
git add src/tools/studio/previewCardsFile.ts src/tools/studio/usePreviewCardsFile.ts src/tools/studio/__tests__/usePreviewCardsFile.test.ts
```
Then run CodeScene's `pre_commit_code_health_safeguard`, and go on only when it passes. Then commit, as a separate, unpiped call:
```bash
USER_APPROVED=1 git commit -m "feat(studio): read previewCards.json from the target branch (#24)"
```
Husky's pre-commit runs `pnpm lint` and `pnpm test:run`. If Vitest fails to start its workers under load, stop this session's preview servers, wait out other sessions' runs, and retry. Never use `--no-verify`.

### Hand-offs from R4-4a

- **R4-4b (`useCardEditor`, loading side).**
  - **Where the hook is held (settled by the sibling drafts and header contract 11).** `useCardEditor` calls `usePreviewCardsFile(token)` itself, and R4-4d exposes its `reload` to the page as `reloadFile()` (R-66: New reveal's publish reloads Edit's file, and R-57 keeps both drafts mounted). StudioWorkspace is keyed by token (R-84, R4-6a's `<StudioWorkspace key={token}>`), so there is one hook instance per token, and one read per visit (R-57's noted cost).
  - **Where `PreviewCardsFile` comes from.** It is defined in `previewCardsFile.ts`, and `usePreviewCardsFile.ts` re-exports it, so R4-4b's draft imports (`from './usePreviewCardsFile'`, and `'../usePreviewCardsFile'` in its test) compile as written. R4-4b's Step 1 grep for `read: number` and `reloadError?: string` must look in `previewCardsFile.ts`: the hook's module holds neither line.
  - **The search's file state (R-71, the audit's "file status").** Pass `file.status`, `error`, `reloadError` and `reload` to the search, independent of `cardId`. A set-14 card waits for `ready`. `ids` decides preview or released, and a card outside `REVEAL_SET_CODE` never waits.
  - **Following reads.** The outline's `newRead` holds: `draft.follow && file.status === 'ready' && (draft.read === null || file.read > draft.read)`. `loadAgain` sets `draft.read = file.requested` before calling `file.reload()`, and the read that answers it is numbered higher. `commit` leaves `read` alone, so a draft that doesn't follow isn't re-seeded by the patch, while a card reopened afterwards seeds from the patched cards.
  - **`requested > read` isn't "reading".** A failed reload leaves `read` behind. Show a failed reload from `reloadError`.
  - **A Retry from `error` stays `error`** until a read lands (no `loading`). R-59's handoff "when a failed read's error clears" fires on `error` → `ready`. A Retry that fails again keeps `error`, so no handoff waits.
  - **Tests.** Mock `readPreviewCards` through the githubClient mock with `mockReset()` in `beforeEach`, as here. Never `await` a retry or a reload inside the act that started it: copy `reloaded()`'s pattern, or start it in `act(() => { p = … })` and finish a deferred read in a later act.
  - **In the app,** call `reload()` from an event handler or an effect. Never await it inside `startTransition(async …)`, `useActionState` or a form action: React holds the request until the action ends, so the read never starts.
- **R4-4c (`useCardEditor`, save side).**
  - **After a fields save,** call `file.commit(mergeCardChanges(loaded, changes))`. `commit` already reads again, so a `reload()` beside it isn't needed; it would cost no extra read, since both requests batch into one.
    - The patch can lack keys the base commit gained meanwhile, such as `variants` (R-67). That's harmless: R4-1b's base check compares only `EDITABLE_CARD_KEYS` plus `id`, `setCode` and `number`, and the read `commit` starts brings the branch's entry.
    - R4-1a's hand-off names `mergeCardChanges(baseEntry, changes)` as the committed entry. Only `commitCardEdit` sees the base entry, and it returns `{commitUrl}`, so the editor's own merge is the patch.
  - **`loadAgain` and `retry` can return `file.reload()`'s promise** (or map it to a boolean). It resolves once the re-read is on screen, `null` when it failed. A second click answers both clicks with the newest read.
  - **Failure kinds.** `isRejectedToken(file.error)` (first read) and `isRejectedToken(file.reloadError ?? '')` (reload) hold for a 401, as this task's tests pin. `StaleCardError` stays an `instanceof` check on the save's error.
- **R4-4d (branch-only cards, R-66).** They are `file.cards` whose ids the card list lacks. `ids` is the file's own set. After graduation, `cards` is `[]` and the file is `ready`, so the search falls back to the card list's order (R-76).
- **R4-6a / R4-6b (the page).** The page never holds this hook; it reaches the file through `useCardEditor`'s controller.
  - **R-66.** After New reveal's publish lands, call `edit.reloadFile()` (R4-4d, over this hook's `reload`), asked for from state when New's result changes, so the new card opens at once. A failed reload keeps the cards beside `reloadError` (C1).
  - **R-71.** The search shows the file's error and Retry (`edit.previewFile`'s `error` and `reload`, R4-4b), plus Forget token when `isRejectedToken` holds, beside the search rather than in place of it.
  - **R-59.** The handoff after a Retry is asked for from state (`error` → `ready`), never on the click. None of these calls awaits `reload()` inside a transition or a form action (see R4-4b's note).
- **R4-8 (the shared interfaces).** "R4 as built" adds the Produces block above to `R-redesign.md`'s shared interfaces, file-structure rows for `src/tools/studio/previewCardsFile.ts` and `usePreviewCardsFile.ts`, and two departures:
  - from the outline: `requested` is state, `reloadError` is new, `commit(entry)` is new, and `reload` returns a promise;
  - from `useLiveTuning`: a replaced caller resolves with the newest read's cards, not null, and a reload settles after the landing renders (so it must not be awaited inside a transition or a form action).

  Its hand count for `usePreviewCardsFile.ts` is 1 primitive parameter in 2 (`token`, and `land`'s `landing`), and `useLiveTuning.ts`' is 2 in 4. Header contract 11's "1 in 1, as `useLiveTuning.ts` does" undercounts both.
